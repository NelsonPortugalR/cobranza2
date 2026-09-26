import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { parseQueryLocal } from "@/lib/parseQuery.ts";
import { answerFor } from "@/lib/answers.ts";
import { BREEDS, COLOR_FAMILIES, PRODUCT_TYPES, QUALITIES, QUALITY_RANGES, REGIONS, TYPE_LABEL } from "@/lib/taxonomy.ts";
import { FX } from "@/lib/catalog.ts";
import type { ParsedQuery } from "@/lib/types.ts";

// Convierte una consulta en lenguaje natural en filtros estructurados.
// Por defecto usa el parser determinístico (25/25 en tests/search-eval.json). El parser con
// Claude queda detrás de un flag (LLM_PARSER=on + ANTHROPIC_API_KEY): solo ve la consulta y los
// valores permitidos de cada filtro, nunca descripciones de producto. Las respuestas a
// preguntas salen siempre de las guías y políticas indexadas (lib/answers.ts), nunca del modelo.

const ParsedSchema = z.object({
  filters: z.object({
    text: z.string(),
    types: z.array(z.enum(PRODUCT_TYPES)),
    qualities: z.array(z.enum(QUALITIES)),
    breeds: z.array(z.enum(BREEDS)),
    colorFamilies: z.array(z.enum(COLOR_FAMILIES)),
    dye: z.enum(["cualquiera", "natural", "tenido"]),
    origins: z.array(z.enum(REGIONS)),
    alpacaRanges: z.array(z.enum(["100", "70-99", "50-69", "lt50", "unpublished"])),
    noSynthetics: z.boolean(),
    sizes: z.array(z.enum(["XXS", "XS", "S", "M", "L", "XL", "XXL", "Única"])),
    genders: z.array(z.enum(["women", "men"])),
    priceMin: z.number().nullable(),
    priceMax: z.number().nullable(),
    inStockOnly: z.boolean(),
    shipsToUS: z.boolean(),
    shipsFrom: z.array(z.enum(["US", "Peru"])),
    noFeesOnDelivery: z.boolean(),
  }),
  sort: z.enum(["relevancia", "micras_asc", "precio_asc", "precio_desc"]),
  chips: z.array(
    z.object({
      field: z.string(),
      label: z.string(),
      from: z.string(),
    }),
  ),
});

const SYSTEM = `You turn shopping queries for Peruvian alpaca products into structured catalog filters.
Shoppers are mostly in the United States and write in English (sometimes Spanish).

Product types (use these ids): ${PRODUCT_TYPES.map((t) => `${t} = ${TYPE_LABEL[t]}`).join("; ")}.

Fiber grades, finest first (use these ids):
${QUALITY_RANGES.map((q) => `- ${q.id} (${q.label})${q.official ? `: official class ${q.official}` : ": commercial name"}`).join("\n")}

Rules:
- "baby alpaca" means baby or finer: qualities = ["royal","imperial","super_baby","baby"]. "royal alpaca" = ["royal"]; "imperial" = ["royal","imperial"].
- "finest/softest possible" → sort = "micras_asc" (does not restrict grades by itself).
- Map fashion color names to families: oatmeal/sand/ecru → beige; fawn/tan/cognac → camel; mocha/chocolate → marron; ivory → blanco; charcoal/heather → gris; navy/indigo → azul; burgundy/rust/orange → rojo; lilac/plum → rosa; mustard → amarillo.
- Prices are always in USD. If the shopper gives soles ("S/", "soles", "PEN"), divide by ${FX.penPerUsd}.
- shipsToUS is true unless the shopper explicitly says shipping does not matter.
- genders: ["women"] for women's/ladies/for her, ["men"] for men's/for him; empty if not stated.
- sizes: requested sizes ("size M", "medium" → ["M"]; "one size" → ["Única"]). Sweater/jumper/pullover = chompa.
- Only apply what the shopper asked for; do not invent constraints. Anything that fits no filter goes in "text".
- chips: one entry per applied filter, with a short English label and the shopper's literal words in "from".`;

// Modelo configurable; por defecto uno rápido. Haiku no admite `effort`.
const MODEL = process.env.PARSER_MODEL ?? "claude-haiku-4-5";
const TIMEOUT_MS = 1500;
const DAILY_LIMIT = Number(process.env.LLM_PARSER_DAILY_LIMIT ?? 1000);
const cache = new Map<string, ParsedQuery>();
let budget = { day: "", used: 0 };

function llmAllowed(): boolean {
  if (process.env.LLM_PARSER !== "on" || !process.env.ANTHROPIC_API_KEY) return false;
  const day = new Date().toISOString().slice(0, 10);
  if (budget.day !== day) budget = { day, used: 0 };
  return budget.used < DAILY_LIMIT;
}

export async function POST(req: Request) {
  const { query } = (await req.json().catch(() => ({}))) as { query?: string };
  if (!query || typeof query !== "string" || query.length > 500) {
    return Response.json({ error: "Consulta inválida" }, { status: 400 });
  }

  const local = parseQueryLocal(query, FX);
  const answer = answerFor(query, local);
  // Solo como respaldo: el modelo se consulta únicamente si las reglas dejaron texto sin entender.
  if (!llmAllowed() || local.intent === "question" || local.intent === "store" || !local.filters.text) return Response.json({ ...local, answer });

  const key = query.trim().toLowerCase().replace(/\s+/g, " ");
  const hit = cache.get(key);
  if (hit) return Response.json({ ...hit, answer });

  try {
    budget.used++;
    const client = new Anthropic();
    const response = await client.messages.parse(
      {
        model: MODEL,
        max_tokens: 1024,
        output_config: { ...(MODEL.includes("haiku") ? {} : { effort: "low" as const }), format: zodOutputFormat(ParsedSchema) },
        system: SYSTEM,
        messages: [{ role: "user", content: query }],
      },
      { timeout: TIMEOUT_MS, maxRetries: 0 },
    );
    if (response.stop_reason === "refusal" || !response.parsed_output) return Response.json({ ...local, answer });

    const parsed = response.parsed_output;
    const result: ParsedQuery = {
      // Tiendas y notas vienen del parser local: el modelo no ve la lista de tiendas.
      filters: { ...parsed.filters, sources: local.filters.sources, includeDemo: false },
      sort: parsed.sort,
      chips: (parsed.chips as ParsedQuery["chips"]).map((c) => ({ ...c, interpreted: true })),
      engine: "claude",
      intent: local.intent,
      ...(local.note ? { note: local.note } : {}),
    };
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    cache.set(key, result);
    return Response.json({ ...result, answer });
  } catch (err) {
    console.error("parse: Claude no disponible o lento, uso parser local", err);
    return Response.json({ ...local, answer });
  }
}
