import { EMPTY_FILTERS } from "./types.ts";
import type { ColorFamily, Filters, InterpretationChip, ParsedQuery, ProductType, Quality, Region, SortKey } from "./types.ts";
import { COLOR_LABEL, QUALITY_LABEL, REGION_LABEL, TYPE_LABEL, USD_PEN, qualitiesAtLeast } from "./taxonomy.ts";

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
  ["abrigo", /\b(abrigos?|casacas?|chaquetas?|coats?|jackets?|sacos? largos?)\b/],
  ["chaleco", /\b(chalecos?|vests?)\b/],
  ["medias", /\b(medias|calcetines|socks?)\b/],
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
  ["rojo", /\b(rojo|roja|terracota|grana|burdeos|vino|red|naranja|anaranjado)\b/],
  ["rosa", /\b(rosado|rosada|rosa|fucsia|lila|morado|morada|purpura|pink|purple)\b/],
  ["amarillo", /\b(amarillo|amarilla|mostaza|dorado|yellow)\b/],
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
        label: andFiner && quality !== "ultrafina" ? `${QUALITY_LABEL[quality]} o superior` : QUALITY_LABEL[quality],
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
    chips.push({ field: "sort", label: "Mejor calidad primero", from: consume(finest) });
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

  // Precio: soles por defecto; "US$", "$", "usd" o "dólares" lo pasan a dólares.
  const CUR = String.raw`(us\$|usd|u\$s|\$|s\/\.?)?\s*`;
  const CUR_AFTER = String.raw`\s*(usd|dolares|soles|s\/)?`;
  const isUsd = (...tokens: (string | undefined)[]) => tokens.some((t) => t && /us|\$|dolar/.test(t) && !/s\//.test(t));
  const toPen = (n: number, usd: boolean) => (usd ? Math.round(n * USD_PEN) : n);
  const between = rest.match(new RegExp(String.raw`\bentre ${CUR}(\d+)${CUR_AFTER} y ${CUR}(\d+)${CUR_AFTER}`));
  const max = rest.match(new RegExp(String.raw`(?:\bmenos de|\bhasta|\bmaximo|\bmax|\bbajo|\bunder|<)\s*${CUR}(\d{2,5})${CUR_AFTER}`));
  const min = rest.match(new RegExp(String.raw`(?:\bmas de|\bdesde|\bminimo|>)\s*${CUR}(\d{2,5})${CUR_AFTER}`));
  const fmt = (n: number, usd: boolean) => (usd ? `US$ ${n}` : `S/ ${n}`);
  if (between) {
    const usd = isUsd(between[1], between[3], between[4], between[6]);
    f.priceCurrency = usd ? "USD" : "PEN";
    f.priceMin = toPen(+between[2], usd);
    f.priceMax = toPen(+between[5], usd);
    chips.push({ field: "priceMax", label: `${fmt(+between[2], usd)}–${+between[5]}`, from: consume(between) });
  } else {
    if (max) {
      const usd = isUsd(max[1], max[3]);
      f.priceCurrency = usd ? "USD" : "PEN";
      f.priceMax = toPen(+max[2], usd);
      chips.push({ field: "priceMax", label: `Hasta ${fmt(+max[2], usd)}`, from: consume(max) });
    }
    if (min) {
      const usd = isUsd(min[1], min[3]);
      f.priceCurrency = usd ? "USD" : "PEN";
      f.priceMin = toPen(+min[2], usd);
      chips.push({ field: "priceMin", label: `Desde ${fmt(+min[2], usd)}`, from: consume(min) });
    }
  }

  const size = rest.match(/\b(?:talla|size|talle)s?\s+((?:xxs|xs|s|m|l|xl|xxl|unica)(?:\s*(?:,|y|o|\/)\s*(?:xxs|xs|s|m|l|xl|xxl))*)\b/);
  if (size) {
    f.sizes = size[1]
      .split(/\s*(?:,|\by\b|\bo\b|\/)\s*/)
      .filter(Boolean)
      .map((t) => (t === "unica" ? "Única" : t.toUpperCase()));
    chips.push({ field: "sizes", label: `Talla ${f.sizes.join(", ")}`, from: consume(size) });
  }
  if (/\bbarat[ao]s?\b|\beconomic[ao]s?\b/.test(rest)) sort = "precio_asc";

  const peru = rest.match(/\b(envio|envie|envian|envien|envios|llegue|delivery|despacho)s?( a| hasta| en)? (peru|lima|arequipa|cusco|trujillo|piura)\b|\bque (envie|llegue|despache)n? a (peru|lima)\b/);
  if (peru) {
    f.shipsToPeru = true;
    chips.push({ field: "shipsToPeru", label: "Envía a Perú", from: consume(peru) });
  }

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
