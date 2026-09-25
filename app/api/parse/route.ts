import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { parseQueryLocal } from "@/lib/parseQuery.ts";
import { BREEDS, COLOR_FAMILIES, PRODUCT_TYPES, QUALITIES, QUALITY_RANGES, REGIONS, TYPE_LABEL } from "@/lib/taxonomy.ts";
import { FX } from "@/lib/catalog.ts";
import type { ParsedQuery } from "@/lib/types.ts";

// Convierte una consulta en lenguaje natural en filtros estructurados.
// Con ANTHROPIC_API_KEY usa Claude; sin clave (o si falla) usa el parser local.

const ParsedSchema = z.object({
  filters: z.object({
    text: z.string(),
    types: z.array(z.enum(PRODUCT_TYPES)),
    qualities: z.array(z.enum(QUALITIES)),
    breeds: z.array(z.enum(BREEDS)),
    colorFamilies: z.array(z.enum(COLOR_FAMILIES)),
    dye: z.enum(["cualquiera", "natural", "tenido"]),
    origins: z.array(z.enum(REGIONS)),
    composition: z.enum(["cualquiera", "100", "mezcla"]),
    sizes: z.array(z.enum(["XXS", "XS", "S", "M", "L", "XL", "XXL", "Única"])),
    priceMin: z.number().nullable(),
    priceMax: z.number().nullable(),
    inStockOnly: z.boolean(),
    shipsToUS: z.boolean(),
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
${QUALITY_RANGES.map((q) => `- ${q.id} (${q.label}): ${q.min === 0 ? "≤" + q.max : q.min + "–" + q.max} µm`).join("\n")}

Rules:
- "baby alpaca" means baby or finer: qualities = ["ultrafina","super_baby","baby"]. "royal alpaca" = ["ultrafina"].
- "finest/softest possible" → sort = "micras_asc" (does not restrict grades by itself).
- Map fashion color names to families: oatmeal/sand/ecru → beige; fawn/tan/cognac → camel; mocha/chocolate → marron; ivory → blanco; charcoal/heather → gris; navy/indigo → azul; burgundy/rust/orange → rojo; lilac/plum → rosa; mustard → amarillo.
- Prices are always in USD. If the shopper gives soles ("S/", "soles", "PEN"), divide by ${FX.penPerUsd}.
- shipsToUS is true unless the shopper explicitly says shipping does not matter.
- sizes: requested sizes ("size M", "medium" → ["M"]; "one size" → ["Única"]). Sweater/jumper/pullover = chompa.
- Only apply what the shopper asked for; do not invent constraints. Anything that fits no filter goes in "text".
- chips: one entry per applied filter, with a short English label and the shopper's literal words in "from".`;

export async function POST(req: Request) {
  const { query } = (await req.json().catch(() => ({}))) as { query?: string };
  if (!query || typeof query !== "string" || query.length > 500) {
    return Response.json({ error: "Consulta inválida" }, { status: 400 });
  }

  const local = parseQueryLocal(query, FX);
  if (!process.env.ANTHROPIC_API_KEY) return Response.json(local);

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2048,
      output_config: { effort: "low", format: zodOutputFormat(ParsedSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: query }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return Response.json(local);

    const parsed = response.parsed_output;
    const result: ParsedQuery = {
      filters: { ...parsed.filters, sources: [], includeDemo: false },
      sort: parsed.sort,
      chips: parsed.chips as ParsedQuery["chips"],
      engine: "claude",
    };
    return Response.json(result);
  } catch (err) {
    console.error("parse: Claude no disponible, uso parser local", err);
    return Response.json(local);
  }
}
