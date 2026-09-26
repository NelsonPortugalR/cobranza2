import { DEFAULT_FILTERS } from "./types.ts";
import type { ColorFamily, Filters, InterpretationChip, ParsedQuery, ProductType, Quality, Region, SortKey } from "./types.ts";
import { COLOR_LABEL, QUALITY_LABEL, REGION_LABEL, TYPE_LABEL, qualitiesAtLeast } from "./taxonomy.ts";
import { FALLBACK_FX, type FxRate } from "./fx.ts";

// Parser determinístico (sin LLM): respuesta instantánea y respaldo si Claude no está
// configurado. Inglés primero (público de EE. UU.), también entiende español.

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const TYPE_SYNONYMS: [ProductType, RegExp][] = [
  ["cardigan", /\b(cardigans?|saco|sacos|chaqueta tejida)\b/],
  ["chompa", /\b(sweaters?|jumpers?|pull ?overs?|crew ?necks?|turtlenecks?|jerseys?|chompas?|sueter|sueteres)\b/],
  ["abrigo", /\b(coats?|jackets?|overcoats?|abrigos?|casacas?|chaquetas?)\b/],
  ["chaleco", /\b(vests?|gilets?|chalecos?)\b/],
  ["medias", /\b(socks?|medias|calcetines)\b/],
  ["chal", /\b(shawls?|wraps?|stoles?|pashminas?|chal|chales|estolas?)\b/],
  ["poncho", /\b(ponchos?|capes?|ruanas?|capas?)\b/],
  ["gorro", /\b(hats?|beanies?|toques?|berets?|gorros?|chullos?)\b/],
  ["bufanda", /\b(scarf|scarves|scarfs|neck ?warmers?|snoods?|bufandas?|chalinas?)\b/],
  ["guantes", /\b(gloves?|mittens?|mitts|guantes|mitones)\b/],
  ["fibra", /\b(yarn|skeins?|roving|fiber|fibre|hilos?|ovillos?|madejas?)\b/],
  ["home", /\b(throws?|blankets?|pillows?|cushions?|mantas?|frazadas?|cojines?)\b/],
];

const COLOR_SYNONYMS: [ColorFamily, RegExp][] = [
  ["beige", /\b(beige|oatmeal|oat|sand|ecru|taupe|cream|nude|arena|avena|hueso)\b/],
  ["camel", /\b(camel|fawn|tan|caramel|cognac|vicuna|camello|caramelo)\b/],
  ["marron", /\b(brown|chocolate|mocha|coffee|espresso|chestnut|marron|cafe)\b/],
  ["blanco", /\b(white|ivory|off ?white|snow|blanco|blanca|crudo|marfil|crema)\b/],
  ["gris", /\b(gr[ae]y|charcoal|heather|silver|slate|gris|plomo)\b/],
  ["negro", /\b(black|onyx|negro|negra)\b/],
  ["azul", /\b(blue|navy|indigo|denim|teal|turquoise|azul|celeste)\b/],
  ["verde", /\b(green|olive|sage|forest|emerald|verde|oliva)\b/],
  ["rojo", /\b(red|burgundy|wine|rust|terracotta|orange|coral|rojo|roja|naranja|guinda|terracota)\b/],
  ["rosa", /\b(pink|blush|rose|purple|lilac|lavender|plum|mauve|rosado|rosada|rosa|morado|lila|fucsia)\b/],
  ["amarillo", /\b(yellow|mustard|gold|ochre|amarillo|mostaza)\b/],
  ["multicolor", /\b(multicolou?r|multi|striped?|stripes|colorful|rayas)\b/],
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

const SIZE_WORDS: Record<string, string> = {
  xxs: "XXS",
  xs: "XS",
  "extra small": "XS",
  s: "S",
  small: "S",
  m: "M",
  medium: "M",
  l: "L",
  large: "L",
  xl: "XL",
  "extra large": "XL",
  xxl: "XXL",
  "one size": "Única",
  unica: "Única",
};

const STOPWORDS =
  /\b(a|an|the|of|for|in|with|and|or|made|from|pure|alpaca|alpacas|wool|knit|knitted|peruvian|peru|possible|please|i|want|looking|need|some|something|de|del|la|el|los|las|en|con|y|para|un|una|que|lo|posible|color|colour|muy|quiero|busco|algo)\b/g;

/** @param fx tipo de cambio para convertir montos en soles ("S/ 600") a USD. */
export function parseQueryLocal(query: string, fx: FxRate = FALLBACK_FX): ParsedQuery {
  const q = norm(query);
  const f: Filters = structuredClone(DEFAULT_FILTERS);
  const chips: InterpretationChip[] = [];
  let sort: SortKey = "relevancia";
  let rest = q;
  const consume = (m: RegExpMatchArray | null) => {
    if (m) rest = rest.replace(m[0], " ");
    return m?.[0] ?? "";
  };

  // Tallas y precios primero: "size M" o "S/ 300" no deben leerse como otra cosa.
  const size = rest.match(
    /\b(?:size|sizes|talla|tallas|talle|in size)\s+((?:xxs|xs|s|m|l|xl|xxl|small|medium|large|extra small|extra large|one size|unica)(?:\s*(?:,|and|or|y|o|\/)\s*(?:xxs|xs|s|m|l|xl|xxl|small|medium|large))*)\b|\b(one size|talla unica)\b/,
  );
  if (size) {
    const list = size[1] ?? size[2];
    f.sizes = list
      .split(/\s*(?:,|\band\b|\bor\b|\by\b|\bo\b|\/)\s*/)
      .map((t) => SIZE_WORDS[t.replace(/^talla /, "")] ?? t.toUpperCase())
      .filter(Boolean);
    chips.push({ field: "sizes", label: `Size ${f.sizes.join(", ")}`, from: consume(size) });
  }

  // Precio: dólares por defecto; "S/", "soles" o "PEN" se convierten a USD.
  const CUR = String.raw`(us\$|usd|\$|s\/\.?|pen)?\s*`;
  const CUR_AFTER = String.raw`\s*(usd|dollars?|dolares|bucks|soles|pen|s\/)?`;
  const isPen = (...t: (string | undefined)[]) => t.some((x) => x && /s\/|sol|pen/.test(x));
  const toUsd = (n: number, pen: boolean) => (pen ? Math.round(n / fx.penPerUsd) : n);
  const money = (n: number, pen: boolean) => (pen ? `S/ ${n} (≈ $${toUsd(n, true)})` : `$${n}`);
  const between = rest.match(new RegExp(String.raw`\b(?:between|entre) ${CUR}(\d+)${CUR_AFTER} (?:and|y|-|to) ${CUR}(\d+)${CUR_AFTER}`));
  const max = rest.match(
    new RegExp(String.raw`(?:\bunder|\bbelow|\bless than|\bup to|\bmax(?:imum)?|\bat most|\bmenos de|\bhasta|\bmaximo|\bbajo|<)\s*${CUR}(\d{2,5})${CUR_AFTER}`),
  );
  const min = rest.match(new RegExp(String.raw`(?:\bover|\babove|\bmore than|\bat least|\bmas de|\bdesde|\bminimo|>)\s*${CUR}(\d{2,5})${CUR_AFTER}`));
  if (between) {
    const pen = isPen(between[1], between[3], between[4], between[6]);
    f.priceMin = toUsd(+between[2], pen);
    f.priceMax = toUsd(+between[5], pen);
    chips.push({ field: "priceMax", label: `${money(+between[2], pen)}–${money(+between[5], pen)}`, from: consume(between) });
  } else {
    if (max) {
      const pen = isPen(max[1], max[3]);
      f.priceMax = toUsd(+max[2], pen);
      chips.push({ field: "priceMax", label: `Under ${money(+max[2], pen)}`, from: consume(max) });
    }
    if (min) {
      const pen = isPen(min[1], min[3]);
      f.priceMin = toUsd(+min[2], pen);
      chips.push({ field: "priceMin", label: `Over ${money(+min[2], pen)}`, from: consume(min) });
    }
  }
  if (/\b(cheap|cheapest|affordable|budget|barat[ao]s?|economic[ao]s?)\b/.test(rest)) sort = "precio_asc";

  const micronMax = rest.match(/(?:under|below|less than|menos de|hasta|max(?:imo)?|<=?|bajo)\s*(\d{2}(?:[.,]\d)?)\s*(?:microns?|micras|micrones|mic|µm|um|µ)\b/);
  if (micronMax) {
    const m = parseFloat(micronMax[1].replace(",", "."));
    f.qualities = qualitiesUpTo(m);
    chips.push({ field: "qualities", label: `≤ ${m} µm`, from: consume(micronMax) });
  }

  const women = rest.match(/\b(women'?s|womens|woman'?s|women|ladies|for her|for women|for my (wife|mom|mother|girlfriend|sister)|de mujer|para mujer|mujer|dama)\b/);
  const men = rest.match(/\b(men'?s|mens|man'?s|men|for him|for men|for my (husband|dad|father|boyfriend|brother)|de hombre|para hombre|hombre|caballero)\b/);
  if (women) {
    f.genders.push("women");
    chips.push({ field: "genders", label: "Women", from: consume(women) });
  }
  if (men) {
    f.genders.push("men");
    chips.push({ field: "genders", label: "Men", from: consume(men) });
  }

  for (const [type, re] of TYPE_SYNONYMS) {
    const m = rest.match(re);
    if (m && !f.types.includes(type)) {
      f.types.push(type);
      chips.push({ field: "types", label: TYPE_LABEL[type], from: consume(m) });
    }
  }

  // Calidad: de la más específica a la más general. "Baby alpaca" = baby o superior.
  const qualityRules: [Quality, RegExp, boolean][] = [
    ["ultrafina", /\b(royal|ultra ?fin[aoe]s?)\b/, true],
    ["super_baby", /\bsuper ?baby\b/, true],
    ["baby", /\bbaby\b/, true],
    ["fleece", /\bfleece\b/, true],
  ];
  for (const [quality, re, andFiner] of qualityRules) {
    const m = rest.match(re);
    if (m) {
      f.qualities = andFiner ? qualitiesAtLeast(quality) : [quality];
      chips.push({
        field: "qualities",
        label: andFiner && quality !== "ultrafina" ? `${QUALITY_LABEL[quality]} or finer` : QUALITY_LABEL[quality],
        from: consume(m),
      });
      break;
    }
  }

  const finest = rest.match(/\b(finest|softest|most luxurious|highest quality|lo )?(mas fin[ao]s?|mas suave)( posible)?\b|\b(finest|softest|most luxurious|highest quality)( possible| available)?\b/);
  if (finest) {
    sort = "micras_asc";
    chips.push({ field: "sort", label: "Finest first", from: consume(finest) });
  }

  const breed = rest.match(/\b(huacaya|suri)\b/);
  if (breed) {
    f.breeds = [breed[1] as "huacaya" | "suri"];
    chips.push({ field: "breeds", label: breed[1] === "suri" ? "Suri" : "Huacaya", from: consume(breed) });
  }

  const dyed = rest.match(/\b(dyed|hand[- ]?dyed|tenid[ao]s?|tintes? naturales)\b/);
  const undyed = rest.match(/\b(undyed|natural colou?rs?|natural tones?|sin tenir|sin tinte|colou?r(es)? natural(es)?)\b/);
  if (dyed) {
    f.dye = "tenido";
    chips.push({ field: "dye", label: "Dyed", from: consume(dyed) });
  } else if (undyed) {
    f.dye = "natural";
    chips.push({ field: "dye", label: "Natural, undyed", from: consume(undyed) });
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
      chips.push({ field: "origins", label: `Origin: ${REGION_LABEL[region]}`, from: consume(m) });
    }
  }

  const pure = rest.match(/\b(100 ?%|100 percent|100 por ciento|pure|pura|puro)\s*(baby\s+)?(alpaca)?\b/);
  const blend = rest.match(/\b(blend|blended|mix|mixed|mezcla|mixto)\b/);
  if (pure) {
    f.alpacaRanges = ["100"];
    chips.push({ field: "alpacaRanges", label: "100% alpaca", from: consume(pure) });
  } else if (blend) {
    f.alpacaRanges = ["70-99", "50-69", "lt50"];
    chips.push({ field: "alpacaRanges", label: "Alpaca blend", from: consume(blend) });
  }

  const stock = rest.match(/\b(in stock|available|ready to ship|en stock|disponibles?)\b/);
  if (stock) {
    f.inStockOnly = true;
    chips.push({ field: "inStockOnly", label: "In stock", from: consume(stock) });
  }

  // "ships to the US" ya es el filtro por defecto; lo consumimos para que no quede como texto.
  consume(rest.match(/\b(ships?|shipping|delivery|delivered)( to| within)?( the)? (us|usa|united states|america)\b|\bfree shipping\b/));

  // Lo que queda (sin palabras vacías) se usa como búsqueda de texto libre.
  f.text = rest
    .replace(STOPWORDS, " ")
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
