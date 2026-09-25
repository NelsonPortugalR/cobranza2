import { EMPTY_FILTERS } from "./types.ts";
import type { ColorFamily, Filters, InterpretationChip, ParsedQuery, ProductType, Quality, Region, SortKey } from "./types.ts";
import { COLOR_LABEL, QUALITY_LABEL, REGION_LABEL, TYPE_LABEL, qualitiesAtLeast } from "./taxonomy.ts";

// Parser determinístico (sin LLM). Sirve como respuesta instantánea en el cliente
// y como respaldo si la API de Claude no está configurada o falla.

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const TYPE_SYNONYMS: [ProductType, RegExp][] = [
  ["cardigan", /\b(cardigan|cardigans|saco|sacos|chaqueta tejida)\b/],
  ["chompa", /\b(chompas?|sueter|sueteres|sweaters?|jerseys?|pull ?overs?|jumpers?)\b/],
  ["chal", /\b(chal|chales|pashminas?|estolas?|shawls?|wraps?)\b/],
  ["poncho", /\b(ponchos?|ruanas?|capas?)\b/],
  ["gorro", /\b(gorros?|chullos?|beanies?|hats?)\b/],
  ["bufanda", /\b(bufandas?|scarf|scarves)\b/],
  ["guantes", /\b(guantes|mitones|gloves|mittens)\b/],
  ["fibra", /\b(fibra|hilos?|ovillos?|madejas?|vellon|roving|yarn|tops? peinados?)\b/],
  ["home", /\b(mantas?|frazadas?|cobijas?|throws?|blankets?|cojines?|home|mantitas?)\b/],
];

const COLOR_SYNONYMS: [ColorFamily, RegExp][] = [
  ["beige", /\b(beige|arena|oatmeal|avena|hueso|crema claro|tostado claro)\b/],
  ["camel", /\b(camel|camello|vicuna|fawn|miel|caramelo)\b/],
  ["marron", /\b(marron|cafe|chocolate|brown|tabaco)\b/],
  ["blanco", /\b(blanco|blanca|crudo|cruda|marfil|crema|ivory|white)\b/],
  ["gris", /\b(gris|plomo|grey|gray|perla)\b/],
  ["negro", /\b(negro|negra|black|carbon)\b/],
  ["azul", /\b(azul|navy|indigo|celeste)\b/],
  ["verde", /\b(verde|oliva|musgo|green)\b/],
  ["rojo", /\b(rojo|roja|terracota|grana|burdeos|vino|red)\b/],
  ["multicolor", /\b(multicolor|colores|rayas|jacquard)\b/],
];

const REGION_SYNONYMS: [Region, RegExp][] = [
  ["puno", /\b(puno|juliaca|titicaca|macusani)\b/],
  ["cusco", /\b(cusco|cuzco|chinchero|pitumarca)\b/],
  ["arequipa", /\b(arequipa|caylloma|colca)\b/],
  ["huancavelica", /\bhuancavelica\b/],
  ["junin", /\b(junin|huancayo)\b/],
  ["ayacucho", /\bayacucho\b/],
  ["apurimac", /\bapurimac\b/],
];

export function parseQueryLocal(query: string): ParsedQuery {
  const q = norm(query);
  const f: Filters = structuredClone(EMPTY_FILTERS);
  const chips: InterpretationChip[] = [];
  let sort: SortKey = "relevancia";
  let rest = q;
  const consume = (m: RegExpMatchArray | null) => {
    if (m) rest = rest.replace(m[0], " ");
    return m?.[0] ?? "";
  };

  for (const [type, re] of TYPE_SYNONYMS) {
    const m = rest.match(re);
    if (m && !f.types.includes(type)) {
      f.types.push(type);
      chips.push({ field: "types", label: TYPE_LABEL[type], from: consume(m) });
    }
  }

  // Calidad: de la más específica a la más general.
  const qualityRules: [Quality, RegExp, boolean][] = [
    ["ultrafina", /\b(royal|ultra ?fin[ao]s?)\b/, true],
    ["super_baby", /\bsuper ?baby\b/, true],
    ["baby", /\bbaby\b/, true],
    ["fleece", /\bfleece\b/, true],
    ["huarizo", /\bhuarizo\b/, false],
  ];
  for (const [quality, re, andFiner] of qualityRules) {
    const m = rest.match(re);
    if (m) {
      f.qualities = andFiner ? qualitiesAtLeast(quality) : [quality];
      chips.push({
        field: "qualities",
        label: andFiner && quality !== "ultrafina" ? `${QUALITY_LABEL[quality]} o más fina` : QUALITY_LABEL[quality],
        from: consume(m),
      });
      break;
    }
  }

  const micronMax = rest.match(/(?:menos de|hasta|max(?:imo)?|<=?|bajo)\s*(\d{2}(?:[.,]\d)?)\s*(?:micras|micrones|mic|µm|um|µ)\b/);
  if (micronMax) {
    const max = parseFloat(micronMax[1].replace(",", "."));
    f.qualities = qualitiesUpTo(max);
    chips.push({ field: "qualities", label: `≤ ${max} µm`, from: consume(micronMax) });
  }

  const finest = rest.match(/\b(lo )?mas fin[ao]s?( posible)?\b|\bfinisim[ao]s?\b|\bmas suave\b/);
  if (finest) {
    sort = "micras_asc";
    chips.push({ field: "sort", label: "Ordenado por finura (µm ↑)", from: consume(finest) });
  }

  const breed = rest.match(/\b(huacaya|suri)\b/);
  if (breed) {
    const b = breed[1] as "huacaya" | "suri";
    f.breeds = [b];
    chips.push({ field: "breeds", label: b === "suri" ? "Suri" : "Huacaya", from: consume(breed) });
  }

  const undyed = rest.match(/\b(sin tenir|sin tinte|color(es)? natural(es)?|natural undyed|undyed|natural)\b/);
  const dyed = rest.match(/\b(tenid[ao]s?|dyed|tintes? naturales)\b/);
  if (dyed) {
    f.dye = "tenido";
    chips.push({ field: "dye", label: "Teñido", from: consume(dyed) });
  } else if (undyed) {
    f.dye = "natural";
    chips.push({ field: "dye", label: "Color natural (sin teñir)", from: consume(undyed) });
  }

  for (const [family, re] of COLOR_SYNONYMS) {
    const m = rest.match(re);
    if (m && !f.colorFamilies.includes(family)) {
      f.colorFamilies.push(family);
      chips.push({ field: "colorFamilies", label: COLOR_LABEL[family], from: consume(m) });
    }
  }

  for (const [region, re] of REGION_SYNONYMS) {
    const m = rest.match(re);
    if (m) {
      f.origins.push(region);
      chips.push({ field: "origins", label: `Origen: ${REGION_LABEL[region]}`, from: consume(m) });
    }
  }

  const pure = rest.match(/\b(100 ?%|100 por ciento|pura|puro)\s*(alpaca)?\b/);
  const blend = rest.match(/\b(mezcla|blend|mixto)\b/);
  if (pure) {
    f.composition = "100";
    chips.push({ field: "composition", label: "100% alpaca", from: consume(pure) });
  } else if (blend) {
    f.composition = "mezcla";
    chips.push({ field: "composition", label: "Mezcla", from: consume(blend) });
  }

  const between = rest.match(/\bentre (?:s\/\.? ?)?(\d+) y (?:s\/\.? ?)?(\d+)( soles)?\b/);
  const max = rest.match(/\b(?:menos de|hasta|maximo|max|bajo|<)\s*(?:s\/\.? ?)?(\d{2,5})( soles)?\b/);
  const min = rest.match(/\b(?:mas de|desde|minimo|>)\s*(?:s\/\.? ?)?(\d{2,5})( soles)?\b/);
  if (between) {
    f.priceMin = +between[1];
    f.priceMax = +between[2];
    chips.push({ field: "priceMax", label: `S/ ${f.priceMin}–${f.priceMax}`, from: consume(between) });
  } else {
    if (max) {
      f.priceMax = +max[1];
      chips.push({ field: "priceMax", label: `Hasta S/ ${f.priceMax}`, from: consume(max) });
    }
    if (min) {
      f.priceMin = +min[1];
      chips.push({ field: "priceMin", label: `Desde S/ ${f.priceMin}`, from: consume(min) });
    }
  }
  if (/\bbarat[ao]s?\b|\beconomic[ao]s?\b/.test(rest)) sort = "precio_asc";

  const stock = rest.match(/\b(en stock|disponibles?|con stock|entrega inmediata)\b/);
  if (stock) {
    f.inStockOnly = true;
    chips.push({ field: "inStockOnly", label: "Solo en stock", from: consume(stock) });
  }

  // Lo que queda (sin palabras vacías) se usa como búsqueda de texto libre.
  f.text = rest
    .replace(/\b(de|del|la|el|los|las|en|con|y|para|un|una|que|lo|posible|alpaca|alpacas|color|muy|quiero|busco|algo)\b/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { filters: f, sort, chips, engine: "local" };
}

function qualitiesUpTo(maxMicron: number): Quality[] {
  const ranges: [Quality, number][] = [
    ["ultrafina", 0],
    ["super_baby", 18.1],
    ["baby", 20.1],
    ["fleece", 23.1],
    ["medium_fleece", 26.6],
    ["huarizo", 29.1],
    ["gruesa", 31.6],
  ];
  return ranges.filter(([, min]) => min <= maxMicron).map(([q]) => q);
}
