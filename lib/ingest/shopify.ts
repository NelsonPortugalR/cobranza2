import { fiberFamily, SYNTHETIC, type CompositionStatus, type FiberFamily } from "../fiber.ts";
import { shippingFromPolicy, type StorePolicy } from "../policies.ts";
import type { Breed, ColorFamily, FieldEvidence, Gender, Product, ProductType, Quality } from "../types.ts";
import { COLOR_SWATCH, SIZE_ORDER } from "../taxonomy.ts";
import { FALLBACK_FX, toUsd, type FxRate } from "../fx.ts";
import { englishTitle, translateColor } from "./translate.ts";

// Normaliza productos de tiendas Shopify (endpoint público /products.json) al modelo
// Product. Extracción por reglas: cada valor guarda la frase literal que lo respalda.
// Un producto de Shopify con varios colores se divide en un ítem por color, porque
// el color es un filtro y la disponibilidad de tallas cambia por color.

export interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  available: boolean;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  featured_image?: { src: string } | null;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string | null;
  vendor: string;
  product_type: string;
  tags: string[];
  options: { name: string; position: number; values: string[] }[];
  variants: ShopifyVariant[];
  images: { src: string; variant_ids: number[] }[];
}

export interface ShopifySource {
  site: string;
  baseUrl: string;
  currency: "USD" | "PEN";
  shipping?: Product["shipping"];
  /** Política curada (data/policies.json); si existe, manda sobre `shipping`. */
  policy?: StorePolicy;
  retrievedAt: string;
  /** Tipo de cambio del día de la descarga (para convertir soles a USD). */
  fx?: FxRate;
  /** Tienda multimarca: el vendedor es la marca (campo vendor de Shopify). */
  multiBrand?: boolean;
  /** Tienda que también vende otras fibras: descarta productos sin alpaca. */
  alpacaOnly?: boolean;
  /** Para tiendas que solo venden a un público (p. ej. solo mujer). */
  defaultGender?: Gender;
}

const WOMEN = /\b(women'?s?|woman|womens|ladies|lady|mujer(es)?|damas?|femenin[oa]s?|for her)\b/i;
const MEN = /\b(men'?s?|man|mens|hombres?|caballeros?|masculin[oa]s?|for him)\b/i;
const UNISEX = /\bunisex\b/i;

/** Para quién es la prenda, según título, tipo, etiquetas y opciones (p. ej. "MUJER" en Kuna). */
export function inferGender(p: ShopifyProduct, fallback?: Gender): Gender | null {
  const text = [p.title, p.product_type, p.tags.join(" "), p.options.flatMap((o) => o.values).join(" ")].join(" ");
  const w = WOMEN.test(text);
  const m = MEN.test(text);
  if (UNISEX.test(text) || (w && m)) return "unisex";
  if (w) return "women";
  if (m) return "men";
  return fallback ?? null;
}

export const ENGINE = { engine: "reglas", version: "shopify-rules-v1" };

export function htmlToText(html: string | null): string {
  return (html ?? "")
    .replace(/<(br|\/p|\/li|\/div)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

// --- Tipo de producto -------------------------------------------------------

const TYPE_RULES: [ProductType, RegExp][] = [
  ["cardigan", /\b(c[aá]rdigans?|sacos?)\b/i],
  ["abrigo", /\b(coats?|jackets?|abrigos?|casacas?|chaquetas?|sac[oó]n(es)?|blazers?|kimono|trench|overcoat)\b/i],
  ["chaleco", /\b(vests?|chalecos?|gilet)\b/i],
  ["poncho", /\b(ponchos?|capes?|capas?|ruanas?|capelets?)\b/i],
  ["chal", /\b(shawls?|wraps?|stoles?|chal(es)?|estolas?|ruana)\b/i],
  ["bufanda", /\b(scarf|scarves|scarfs|bufandas?|chalinas?|pa[nñ]uelos?|cuelleras?|neck ?warmer|snood|cowl|tubo)\b/i],
  ["gorro", /\b(beanies?|hats?|chullos?|bucket|berets?|headbands?|gorros?|sombreros?|balaclava|vinchas?)\b/i],
  ["guantes", /\b(gloves?|mittens?|mitts|glittens?|guantes|mitones)\b/i],
  ["medias", /\b(socks?|medias?|calcetines|legwarmers?|leg warmers?|calentadores)\b/i],
  ["fibra", /\b(ovillos?|hilos?|madejas?|yarns?|skeins?|roving)\b/i],
  ["home", /\b(throws?|blankets?|cushions?|pillows?|mantas?|plaids?|coj[ií]n(es)?|frazadas?)\b/i],
  ["chompa", /\b(sweaters?|pullovers?|jumpers?|turtlenecks?|crew ?necks?|chompas?|su[eé]ter(es)?|jerseys?|troyer|tops?|polos?|hoodies?)\b/i],
  ["otro", /\b(skirts?|dress(es)?|drese?s|pants|trousers|faldas?|vestidos?|bags?)\b/i],
];

export function inferType(p: ShopifyProduct): ProductType | null {
  if (/gift ?card/i.test(p.product_type + " " + p.title)) return null;
  // El título describe mejor la prenda que product_type ("Outlet", "Gift Cards"…).
  for (const text of [p.title, p.product_type, p.tags.join(" ")]) {
    for (const [type, re] of TYPE_RULES) if (re.test(text)) return type;
  }
  return "otro";
}

// --- Composición y calidad --------------------------------------------------

const MATERIAL = String.raw`(royal\s+alpaca|imperial\s+alpaca|super\s+baby\s+alpaca|suri\s+baby\s+alpaca|baby\s+suri(?:\s+alpaca)?|suri\s+alpaca|baby\s+alpaca|alpaca|pima\s+cotton|cotton|algod[oó]n|silk|seda|merino(?:\s+wool)?|extrafine\s+merino|wool|lana|nylon|polyamide|poliamida|polyester|poli[eé]ster|e?s?lastane|elastano|spandex|polyacrylic|poliacr[ií]lico|acrylic|acr[ií]lico|dralon|cashmere|linen|lino|viscose|mohair)`;
// Calificativos entre el % y la fibra: "100% AIA-certified Baby Alpaca", "70% premium alpaca".
const QUALIFIERS = String.raw`(?:(?:aia[- ]certified|certified|pure|premium|fine|finest|peruvian|natural|genuine|organic|soft|super\s*soft|recycled|traceable)\s+){0,3}`;
const PCT_BEFORE = new RegExp(String.raw`(\d{1,3}(?:[.,]\d+)?)\s*%\s*(?:of\s+|de\s+)?` + QUALIFIERS + MATERIAL, "gi");
const PCT_AFTER = new RegExp(MATERIAL + String.raw`\s*[:(]?\s*(\d{1,3}(?:[.,]\d+)?)\s*%`, "gi");
// El forro no es la prenda: "Lining: 100% polyester" / "Forro: 100% poliéster".
const LINING = /\b(lining|lined with|forro|forrad[oa])\b[^.\n]*/gi;

const isAlpaca = (m: string) => /alpaca|suri/i.test(m);

function titleCase(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").replace(/(^|[\s(/-])(\S)/g, (_, sep: string, c: string) => sep + c.toUpperCase());
}

export function extractComposition(fullText: string): { composition: { material: string; pct: number }[]; quote?: string } {
  const text = fullText.replace(LINING, " ");
  // Prueba ambos formatos ("70% alpaca" y "alpaca (70%)") y se queda con el que describe alpaca.
  const candidates = [PCT_BEFORE, PCT_AFTER].map((re) => {
    const found = new Map<string, number>();
    let quote: string | undefined;
    for (const m of text.matchAll(new RegExp(re.source, "gi"))) {
      const [pctStr, material] = re === PCT_BEFORE ? [m[1], m[2]] : [m[2], m[1]];
      const pct = parseFloat(pctStr.replace(",", "."));
      if (pct <= 0 || pct > 100) continue;
      const key = titleCase(
        material.replace(/algod[oó]n/i, "cotton").replace(/^seda$/i, "silk").replace(/^lana$/i, "wool").replace(/^e?s?lastane$/i, "elastane"),
      );
      if (!found.has(key)) found.set(key, pct);
      quote ??= m[0];
    }
    let composition = [...found].map(([material, pct]) => ({ material, pct }));
    // Dos frases "100% …" distintas (la prenda y un accesorio): vale la primera. Si la suma pasa
    // de 100 por otra razón, es un error de la tienda y se conserva tal cual (estado "inconsistent").
    if (composition.reduce((a, c) => a + c.pct, 0) > 101 && composition.filter((c) => c.pct === 100).length > 0) composition = composition.slice(0, 1);
    return { composition, quote };
  });
  // Fichas que mezclan formatos ("30% silk" y "baby alpaca 70%"): se unen si suman ≤ 100.
  const [a, b] = candidates;
  const names = new Set(a.composition.map((x) => x.material));
  const merged = [...a.composition, ...b.composition.filter((x) => !names.has(x.material))];
  const mergedTotal = merged.reduce((t, x) => t + x.pct, 0);
  if (a.composition.length && b.composition.length && mergedTotal <= 101 && merged.some((x) => isAlpaca(x.material))) {
    return { composition: merged, quote: a.quote };
  }
  const withAlpaca = candidates.find((c) => c.composition.some((x) => isAlpaca(x.material)));
  return withAlpaca ?? candidates.find((c) => c.composition.length) ?? { composition: [] };
}

const WORD_MATERIALS: [string, RegExp][] = [
  ["Royal alpaca", /royal\s+alpaca/i],
  ["Imperial alpaca", /imperial\s+alpaca/i],
  ["Super baby alpaca", /super\s+baby\s+alpaca/i],
  ["Baby suri", /baby\s+suri/i],
  ["Suri alpaca", /suri(\s+alpaca)?/i],
  ["Baby alpaca", /baby\s+alpaca/i],
  ["Alpaca", /\balpaca\b/i],
  ["Vicuña", /vicu[nñ]a/i],
  ["Seda", /\b(seda|silk)\b/i],
  ["Lana", /\b(lana|wool|merino)\b/i],
  ["Algodón", /\b(algod[oó]n|cotton|pima)\b/i],
  ["Lino", /\b(lino|linen)\b/i],
  ["Nylon", /\b(nylon|poliamida|polyamide)\b/i],
  ["Acrílico", /\b(acr[ií]lico|acrylic|polyacrylic|dralon|microfib(?:er|re|ra))\b/i],
  ["Polyester", /\b(poli[eé]ster|polyester)\b/i],
  ["Cashmere", /\bcashmere\b/i],
];

/**
 * Composición escrita con palabras: "elaborado en baby alpaca y seda",
 * "una mezcla de alpaca y lana", "crafted from pure baby alpaca".
 */
export function extractMaterialsFromWords(text: string): { materials: string[]; blend: boolean; pure: boolean; quote?: string } | null {
  const m = text.match(
    /\b(?:elaborad[oa]s?|confeccionad[oa]s?|tejid[oa]s?|hech[oa]s?|fabricad[oa]s?|made|crafted|knit(?:ted)?|woven)\s+(?:en|con|de|from|of|with|in)\s+([^.;\n]{3,90})/i,
  ) ?? text.match(/\b(mezcla de [^.;\n]{3,80}|blend of [^.;\n]{3,80})/i);
  if (!m) return null;
  const phrase = m[1];
  // Cortamos en la primera coma o en "que"/"which" para no leer el resto de la frase.
  const head = phrase.split(/,|\bque\b|\bwhich\b|\bpara\b|\bfor\b/i)[0];
  const materials: string[] = [];
  let rest = head;
  for (const [name, re] of WORD_MATERIALS) {
    if (re.test(rest)) {
      materials.push(name);
      rest = rest.replace(new RegExp(re.source, "gi"), " ");
    }
  }
  if (!materials.some((x) => /alpaca|suri|vicu/i.test(x))) return null;
  const blend = materials.length > 1 || /mezcla|blend|mix/i.test(m[0]);
  // "Pure/100%" es explícito; en español "elaborado en baby alpaca" describe la prenda entera.
  // "Crafted with alpaca fiber" (marketing en inglés) no basta para decir 100%.
  const spanishWhole = /^(elaborad|confeccionad|tejid|hech|fabricad)/i.test(m[0]);
  const pure = !blend && (/\b(pur[ao]|pure|100\s*%)/i.test(m[0]) || (spanishWhole && materials.length === 1));
  const quote = m[0].slice(0, m[0].length - phrase.length + head.length).trim();
  return { materials, blend, pure, quote };
}

export function qualityFromMaterial(material: string): { quality: Quality | null; provenance: FieldEvidence["provenance"] } {
  const m = material.toLowerCase();
  // Royal e Imperial son nombres comerciales que la tienda declara; no son clases de la NTP.
  if (m.includes("royal")) return { quality: "royal", provenance: "declarado" };
  if (m.includes("imperial")) return { quality: "imperial", provenance: "declarado" };
  if (m.includes("super baby")) return { quality: "super_baby", provenance: "declarado" };
  if (m.includes("baby")) return { quality: "baby", provenance: "declarado" };
  return { quality: null, provenance: "desconocido" };
}

// --- Color -----------------------------------------------------------------

const COLOR_RULES: [ColorFamily, RegExp][] = [
  ["multicolor", /\b(multi|multicolou?r|rainbow|stripes?|patchwork|mix)\b/i],
  ["beige", /\b(beige|oatmeal|oat|sand|camel light|ecru|nude|taupe|khaki|stone|linen|latte|cream|crema|off ?white|bone|hueso|vanilla|birch|elm|champagne|avena|arena|coconut|toasted|hummus|biscotti|almond)\b/i],
  ["camel", /\b(camel|vicu[nñ]a|fawn|caramel|cognac|honey|tan|toffee|biscuit|cinnamon|canela)\b/i],
  ["marron", /\b(brown|chocolate|coffee|mocha|espresso|chestnut|walnut|marr[oó]n|caf[eé]|brick brown|russet|russed|tobacco|mahogany|umber|cacao|cocoa|pecan|rooibos|earth|bronze|twig|autumnal|timber|truffle|tabacco|walnut|acorn)\b/i],
  ["blanco", /\b(white|ivory|snow|blanco|natural white|pearl white|chalk|pearl|ghost)\b/i],
  ["negro", /\b(black|negro|onyx|jet|ebony|eclipse|outer space)\b/i],
  ["gris", /\b(gr[ae]y|charcoal|silver|slate|smoke|ash|plomo|gris|graphite|heather|melange|anthracite|fog|mist|rainy|wet weather|oyster|shark|gargoyle|magnet|iron|tornado|char|pebble|granite|fossil|pewter|cloud|marble|smokey|smoky|humo|acero|carb[oó]n)\b/i],
  ["azul", /\b(blue|navy|indigo|denim|azul|turquoise|teal|aqua|cobalt|sky|petrol|ocean|marine|celeste|turquesa|marino|ink|midnight|bluette|azulino)\b/i],
  ["verde", /\b(green|olive|sage|moss|forest|emerald|mint|verde|pistachio|khaki green|bottle|pine|jade|lime|oasis|spruce|cactus|willow|eucalyptus|balsam|forage|oliva|musgo)\b/i],
  ["rojo", /\b(red|rojo|burgundy|wine|bordeaux|maroon|cherry|scarlet|ruby|orange|naranja|rust|terracotta|coral|ketchup|koi|brick|copper|pumpkin|tomato|paprika|henna|pepper|chili|mandarin|tango|apple|guinda|burdeos?|cabernet|cranberry|burg|clay|melon|ladrillo|granate)\b/i],
  ["rosa", /\b(pink|rosa|rose|blush|fuchsia|magenta|lilac|lavender|purple|violet|morado|plum|mauve|orchid|berry|raspberry|rosado|rosada|lila|fucsia|raisin|eggplant|woodrose|palo rosa)\b/i],
  ["amarillo", /\b(yellow|amarillo|mustard|mostaza|gold|ochre|ocre|lemon|saffron|curry|sun|amber|dorado)\b/i],
];

const NATURAL_FAMILIES: ColorFamily[] = ["blanco", "beige", "camel", "marron", "gris", "negro"];

export function classifyColor(name: string): { family: ColorFamily | null; natural: boolean | null; evidence: FieldEvidence } {
  // En nombres compuestos manda la última palabra de color ("Sand Yellow" → amarillo).
  const hits = COLOR_RULES.flatMap(([f, re]) => {
    const g = new RegExp(re.source, "gi");
    return [...name.matchAll(g)].map((m) => ({ f, at: m.index ?? 0 }));
  }).sort((a, b) => a.at - b.at);
  const families = [...new Set(hits.map((h) => h.f))];
  const family =
    families.length === 0
      ? null
      : families.includes("multicolor") || (families.length > 1 && /\band\b|&|\//i.test(name))
        ? "multicolor"
        : hits[hits.length - 1].f;
  if (/\bnatural\b/i.test(name) && family && NATURAL_FAMILIES.includes(family)) {
    return { family, natural: true, evidence: { provenance: "declarado", confidence: 0.7, quote: name } };
  }
  if (family && !NATURAL_FAMILIES.includes(family)) {
    // Azul, verde, rojo… no existen como colores naturales de la alpaca.
    return { family, natural: false, evidence: { provenance: "inferido", confidence: 0.9, quote: `"${name}" no es un color natural de alpaca` } };
  }
  return { family, natural: null, evidence: { provenance: "desconocido", confidence: 0 } };
}

// --- Tallas ----------------------------------------------------------------

export function normalizeSize(raw: string): string {
  const s = raw.trim().toUpperCase();
  if (["UNI", "OS", "ONE SIZE", "TALLA UNICA", "TALLA ÚNICA", "U", "UNICA", "ÚNICA", "DEFAULT TITLE"].includes(s)) return "Única";
  return s.replace(/^X{2}L$/, "XXL");
}

export function sortSizes(sizes: string[]): string[] {
  const rank = (s: string) => {
    const i = SIZE_ORDER.indexOf(s);
    return i === -1 ? 100 + (parseFloat(s) || 0) : i;
  };
  return [...new Set(sizes)].sort((a, b) => rank(a) - rank(b));
}

// --- Normalización completa --------------------------------------------------

export function normalizeShopifyProduct(p: ShopifyProduct, src: ShopifySource): Product[] {
  const productType = inferType(p);
  if (!productType) return [];

  const body = htmlToText(p.body_html);
  const text = `${p.title}\n${body}`;
  // Solo alpaca: la vicuña es otra fibra (y otro rango de precio), no entra al catálogo.
  if (src.alpacaOnly && !/alpaca|suri/i.test(`${text} ${p.tags.join(" ")}`)) return [];
  if (/vicu[nñ]a/i.test(p.title) && !/alpaca/i.test(p.title)) return [];
  const { composition, quote: compQuote } = extractComposition(text);
  const words = composition.length ? null : extractMaterialsFromWords(text);
  const alpacaPct = composition.length
    ? composition.filter((c) => isAlpaca(c.material)).reduce((a, c) => a + c.pct, 0)
    : words?.pure
      ? 100
      : null;
  const mainAlpaca = composition.filter((c) => isAlpaca(c.material)).sort((a, b) => b.pct - a.pct)[0];
  const fiberFacts = compositionFacts(composition, words);
  const micron = extractMicron(body);
  const seal = extractSeal(body);
  // Sin porcentaje, "made from baby alpaca" igual declara la calidad (no la composición).
  const mentioned = mainAlpaca ? null : text.match(/\b(royal|imperial|super\s+baby|baby)\s+(alpaca|suri)\b/i);
  const compositionQuote = compQuote ?? words?.quote;
  const qualitySource = mainAlpaca?.material ?? mentioned?.[0];
  const q = qualitySource ? qualityFromMaterial(qualitySource) : { quality: null, provenance: "desconocido" as const };
  const qualityQuote = compQuote ?? mentioned?.[0];

  const suri = text.match(/\bsuri\b/i);
  const huacaya = text.match(/\bhuacaya\b/i);
  const breed: Breed | null = suri ? "suri" : huacaya ? "huacaya" : null;
  const madeIn = text.match(/made in peru|hecho en per[uú]/i);
  const handmade = text.match(/hand[- ]?(knit|made|woven|loomed)|tejido a mano/i);
  const gender = inferGender(p, src.defaultGender);

  const colorOpt = p.options.find((o) => /^colou?r$/i.test(o.name));
  const sizeOpt = p.options.find((o) => /^(size|talla)$/i.test(o.name));
  const optKey = (o?: { position: number }) => (o ? (`option${o.position}` as "option1" | "option2" | "option3") : null);
  const colorKey = optKey(colorOpt);
  const sizeKey = optKey(sizeOpt);

  const byColor = new Map<string, ShopifyVariant[]>();
  for (const v of p.variants) {
    const opt = colorKey ? v[colorKey] : null;
    const placeholder = !opt || /^(u?nico|única|unica|default title|one color|as shown)$/i.test(opt.trim());
    const c = (!placeholder && opt) || titleColor(p.title) || "Único";
    byColor.set(c, [...(byColor.get(c) ?? []), v]);
  }

  const warnings: string[] = [];
  if (!composition.length && !words) warnings.push("The store does not list the fiber content");
  if (words?.pure) warnings.push("100% inferred from the description; the store gives no percentage");
  if (words?.blend) warnings.push("Blend without percentages");
  if (!q.quality && composition.length) warnings.push("Fiber grade not stated (just \"alpaca\")");
  if (q.quality && !mainAlpaca) warnings.push("Grade is stated but not the alpaca percentage");


  return [...byColor].map(([colorName, variants]) => {
    const color = classifyColor(colorName);
    const sizes = sortSizes(variants.map((v) => normalizeSize((sizeKey && v[sizeKey]) || "Única")));
    const sizesAvailable = sortSizes(variants.filter((v) => v.available).map((v) => normalizeSize((sizeKey && v[sizeKey]) || "Única")));
    const cheapest = [...variants].sort((a, b) => +a.price - +b.price)[0];
    const amount = +cheapest.price;
    const compareAt = cheapest.compare_at_price && +cheapest.compare_at_price > amount ? +cheapest.compare_at_price : null;
    const variantIds = new Set(variants.map((v) => v.id));
    const images = [
      ...p.images.filter((i) => i.variant_ids.some((id) => variantIds.has(id))),
      ...p.images.filter((i) => i.variant_ids.length === 0),
      ...p.images,
    ].map((i) => storeImageUrl(i.src, src.baseUrl));

    const confidence =
      0.35 + (composition.length ? 0.3 : words ? 0.2 : 0) + (q.quality ? 0.15 : 0) + (color.family ? 0.1 : 0) + (sizes.length ? 0.05 : 0);

    return {
      id: `${slug(src.site)}-${p.handle}${byColor.size > 1 ? `-${slug(colorName)}` : ""}`,
      ...displayTitle(p.title, colorName, byColor.size > 1),
      source: {
        site: src.site,
        url: `${src.baseUrl}/products/${p.handle}?variant=${cheapest.id}`,
        method: "feed",
        retrievedAt: src.retrievedAt,
      },
      seller: { name: src.multiBrand && p.vendor ? p.vendor : src.site },
      productType,
      gender,
      fiber: {
        alpacaPct,
        composition: composition.map((c) => ({ ...c, family: fiberFamily(c.material) })),
        materials: words?.materials,
        ...fiberFacts,
        blend: composition.length ? composition.some((c) => !isAlpaca(c.material)) : words?.blend,
        quality: q.quality,
        micron: micron?.micron ?? null,
        ...(micron ? { micronKind: micron.kind } : {}),
        ...(qualitySource ? { gradeName: titleCase(qualitySource) } : {}),
        breed,
      },
      color: {
        name: translateColor(titleCase(colorName)),
        family: color.family,
        hex: color.family && !COLOR_SWATCH[color.family].startsWith("conic") ? COLOR_SWATCH[color.family] : "#CFC3B1",
        natural: color.natural,
      },
      origin: { region: null, detail: madeIn ? "Made in Peru" : undefined },
      construction: handmade ? "tejido_a_mano" : null,
      weightGrams: null,
      sizes,
      sizesAvailable,
      price: {
        amount,
        currency: src.currency,
        amountUsd: toUsd(amount, src.currency, src.fx ?? FALLBACK_FX),
        compareAt,
      },
      shipping: src.policy ? shippingFromPolicy(src.policy, p.tags) : src.shipping,
      availability: {
        status: sizesAvailable.length === 0 ? "agotado" : sizesAvailable.length === 1 && sizes.length > 2 ? "pocas_unidades" : "en_stock",
        checkedAt: src.retrievedAt,
      },
      ...(seal ? { seal: { issuer: "AIA" as const, ...seal, readOn: src.retrievedAt } } : {}),
      images: [...new Set(images)].slice(0, 4),
      rawDescription: body,
      evidence: {
        quality: q.quality ? { provenance: q.provenance, confidence: mainAlpaca ? 0.85 : 0.6, quote: qualityQuote } : { provenance: "desconocido", confidence: 0 },
        micron: micron ? { provenance: "declarado", confidence: 0.9, quote: micron.quote } : { provenance: "desconocido", confidence: 0 },
        breed: breed ? { provenance: "declarado", confidence: 0.9, quote: (suri ?? huacaya)![0] } : { provenance: "desconocido", confidence: 0 },
        natural: color.evidence,
        origin: { provenance: "desconocido", confidence: 0, quote: madeIn?.[0] },
        alpacaPct: composition.length
          ? { provenance: "declarado", confidence: 0.9, quote: compQuote }
          : words
            ? { provenance: words.pure ? "inferido" : "declarado", confidence: 0.7, quote: compositionQuote }
            : { provenance: "desconocido", confidence: 0 },
      },
      extraction: { ...ENGINE, confidence: Math.round(confidence * 100) / 100, warnings },
    } satisfies Product;
  });
}

/**
 * Micras, solo cuando la tienda las afirma de la pieza: "Fineness: Under 19 microns",
 * "does not exceed 23 microns", "measuring … 17 microns". Las explicaciones generales del
 * grado ("up to 23 microns according to the AIA") no cuentan.
 */
export function extractMicron(text: string): { micron: number; kind: "max" | "exact"; quote: string } | null {
  const UNIT = String.raw`\s*(?:µm|μm|microns?|micras?|micrones)`;
  const NUM = String.raw`(\d{2}(?:[.,]\d)?)`;
  const patterns: [RegExp, "max" | "exact" | "auto"][] = [
    [new RegExp(String.raw`\b(?:fineness|finura|micronaje|micron(?:s|aje)?|fiber diameter|fibre diameter|di[aá]metro)\s*[:\-]\s*(under|less than|below|up to|max(?:imum)?\.?|menos de|hasta|<|≤)?\s*` + NUM + UNIT, "i"), "auto"],
    [new RegExp(String.raw`\b(?:does not exceed|doesn't exceed|not exceeding|no thicker than|no supera|no excede)\s+` + NUM + UNIT, "i"), "max"],
    [new RegExp(String.raw`\bmeasuring\s+(?:an?\s+)?(?:\w+\s+){0,2}?(less than|under|below)?\s*` + NUM + UNIT, "i"), "auto"],
  ];
  for (const [re, kind] of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const num = m[m.length - 1];
    const qualifier = m.length > 2 ? m[1] : undefined;
    const micron = parseFloat(num.replace(",", "."));
    if (micron < 12 || micron > 40) continue;
    return { micron, kind: kind === "auto" ? (qualifier ? "max" : "exact") : kind, quote: m[0].trim() };
  }
  return null;
}

/** Sello AIA / Alpaca Mark, solo si la tienda lo menciona en la ficha. */
export function extractSeal(text: string): { type: "origin_gold" | "origin_silver" | "blend" | "unspecified"; quote: string } | null {
  const m = text.match(/[^.\n]{0,60}\b(alpaca\s+(?:origin\s+|blend\s+)?mark|aia[- ]certified|certified by the international alpaca association|sello\s+(?:de\s+(?:la\s+)?)?aia|certificad[oa]\s+por\s+la\s+aia)\b[^.\n]{0,60}/i);
  if (!m) return null;
  const q = m[0];
  const type = /blend\s+mark/i.test(q)
    ? "blend"
    : /origin\s+mark/i.test(q) && /gold|dorad/i.test(q)
      ? "origin_gold"
      : /origin\s+mark/i.test(q) && /silver|platead/i.test(q)
        ? "origin_silver"
        : "unspecified";
  return { type, quote: q.trim() };
}

/** Estado de la composición, familias de fibra y si lleva sintéticos (acrílico o poliéster). */
export function compositionFacts(
  composition: { material: string; pct: number }[],
  words: { materials: string[]; pure: boolean } | null,
): { compositionStatus: CompositionStatus; hasSynthetics: boolean | null; families: FiberFamily[] } {
  const families = [...new Set([...composition.map((c) => c.material), ...(words?.materials ?? [])].map(fiberFamily))];
  const synthetic = families.some((f) => SYNTHETIC.includes(f));
  if (composition.length) {
    const total = composition.reduce((a, c) => a + c.pct, 0);
    const status: CompositionStatus = total > 101 ? "inconsistent" : total < 99.5 ? "partial" : "stated";
    return { compositionStatus: status, hasSynthetics: synthetic ? true : status === "partial" ? null : false, families };
  }
  if (words) return { compositionStatus: words.pure ? "inferred" : "stated_no_pct", hasSynthetics: synthetic ? true : null, families };
  return { compositionStatus: "not_published", hasSynthetics: null, families };
}

/** Título para el portal (en inglés si la tienda lo publica en español) y el original como referencia. */
function displayTitle(title: string, colorName: string, manyColors: boolean): { title: string; titleOriginal?: string } {
  const withColor = manyColors && !title.toLowerCase().includes(colorName.toLowerCase());
  const en = englishTitle(title);
  if (en) {
    const hasColor = en.includes(" — ");
    return { title: withColor && !hasColor ? `${en} — ${translateColor(titleCase(colorName))}` : en, titleOriginal: title };
  }
  return { title: withColor ? `${title} — ${titleCase(colorName)}` : title };
}

/** Misma imagen servida desde el dominio de la tienda (/cdn/shop/…) en vez de cdn.shopify.com. */
export function storeImageUrl(url: string, baseUrl: string): string {
  const m = url.match(/^https:\/\/cdn\.shopify\.com\/s\/files\/\d+\/\d+\/\d+\/\d+\/(files|products)\/(.+)$/);
  return m ? `${baseUrl}/cdn/shop/${m[1]}/${m[2]}` : url;
}

/** "Links Sweater - Rainy Day" → "Rainy Day" */
function titleColor(title: string): string | null {
  const es = title.match(/\bcolor\s+([^|,–-]+)$/i);
  if (es) return es[1].trim();
  const m = title.match(/\s[-–|]\s*([^-–|]+)$/);
  if (m) return m[1].trim();
  return colorWordsAtEnd(title);
}

/** "Capa Daniela Larga Beige" → "Beige": palabras de color al final del título. */
export function colorWordsAtEnd(name: string): string | null {
  const words = name.trim().split(/\s+/);
  for (let i = words.length - 1; i >= 1; i--) {
    if (classifyColor(words[i]).family) {
      let start = i;
      while (start - 1 >= 1 && classifyColor(words[start - 1]).family) start--;
      return words.slice(start).join(" ");
    }
  }
  return null;
}

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
