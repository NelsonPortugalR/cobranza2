import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { parseQueryLocal } from "@/lib/parseQuery.ts";
import { BREEDS, COLOR_FAMILIES, PRODUCT_TYPES, QUALITIES, QUALITY_RANGES, REGIONS } from "@/lib/taxonomy.ts";
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
    priceMin: z.number().nullable(),
    priceMax: z.number().nullable(),
    inStockOnly: z.boolean(),
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

const SYSTEM = `Traduces búsquedas de compradores de productos de alpaca peruana a filtros estructurados para un catálogo.

Categorías de finura (NTP 231.301), de más fina a más gruesa:
${QUALITY_RANGES.map((q) => `- ${q.id}: ${q.min === 0 ? "≤" + q.max : q.min + "–" + q.max} µm`).join("\n")}

Reglas:
- "baby alpaca" significa baby o más fina: qualities = ["ultrafina","super_baby","baby"]. "royal" equivale a ultrafina.
- "lo más fino/suave posible" → sort = "micras_asc" (no restringe calidades por sí solo).
- Colores comerciales se mapean a familias: oatmeal/hueso/arena → beige; vicuña/fawn → camel; café/chocolate → marron; crudo/marfil → blanco.
- "natural" referido al color significa sin teñir (dye = "natural"). "tintes naturales" significa teñido.
- Precios en soles (PEN). Si el usuario da dólares, conviértelos a soles con 3.75.
- Solo filtra lo que el usuario pidió; no inventes restricciones. Lo que no encaje en ningún filtro va en "text".
- chips: una entrada por cada filtro aplicado, con una etiqueta corta en español y el fragmento literal del usuario en "from".`;

export async function POST(req: Request) {
  const { query } = (await req.json().catch(() => ({}))) as { query?: string };
  if (!query || typeof query !== "string" || query.length > 500) {
    return Response.json({ error: "Consulta inválida" }, { status: 400 });
  }

  const local = parseQueryLocal(query);
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
      filters: { ...parsed.filters, sources: [] },
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
