import type { Breed, ColorFamily, FieldEvidence, Product, ProductType, Quality } from "../types.ts";
import { COLOR_SWATCH, SIZE_ORDER, USD_PEN } from "../taxonomy.ts";

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
  retrievedAt: string;
  /** Tienda multimarca: el vendedor es la marca (campo vendor de Shopify). */
  multiBrand?: boolean;
  /** Tienda que también vende otras fibras: descarta productos sin alpaca. */
  alpacaOnly?: boolean;
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

const MATERIAL = String.raw`(royal\s+alpaca|imperial\s+alpaca|super\s+baby\s+alpaca|baby\s+suri(?:\s+alpaca)?|suri\s+alpaca|baby\s+alpaca|alpaca|pima\s+cotton|cotton|algod[oó]n|silk|seda|merino(?:\s+wool)?|extrafine\s+merino|wool|lana|nylon|polyamide|poliamida|polyester|poli[eé]ster|elastane|elastano|spandex|acrylic|acr[ií]lico|cashmere|linen|lino|viscose|mohair)`;
const PCT_BEFORE = new RegExp(String.raw`(\d{1,3}(?:[.,]\d+)?)\s*%\s*(?:of\s+|de\s+)?` + MATERIAL, "gi");
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
      const key = titleCase(material.replace(/algod[oó]n/i, "cotton").replace(/^seda$/i, "silk").replace(/^lana$/i, "wool"));
      if (!found.has(key)) found.set(key, pct);
      quote ??= m[0];
    }
    let composition = [...found].map(([material, pct]) => ({ material, pct }));
    // Descarta combinaciones incoherentes (p. ej. dos frases "100% …" distintas).
    if (composition.reduce((a, c) => a + c.pct, 0) > 101) composition = composition.slice(0, 1);
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
  ["Acrílico", /\b(acr[ií]lico|acrylic)\b/i],
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
  if (m.includes("royal")) return { quality: "ultrafina", provenance: "inferido" }; // término comercial, no NTP
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
  if (src.alpacaOnly && !/alpaca|suri|vicu[nñ]a/i.test(`${text} ${p.tags.join(" ")}`)) return [];
  const { composition, quote: compQuote } = extractComposition(text);
  const words = composition.length ? null : extractMaterialsFromWords(text);
  const alpacaPct = composition.length
    ? composition.filter((c) => isAlpaca(c.material)).reduce((a, c) => a + c.pct, 0)
    : words?.pure
      ? 100
      : null;
  const mainAlpaca = composition.filter((c) => isAlpaca(c.material)).sort((a, b) => b.pct - a.pct)[0];
  // Sin porcentaje, "made from baby alpaca" igual declara la calidad (no la composición).
  const mentioned = mainAlpaca ? null : text.match(/\b(royal|super\s+baby|baby)\s+(alpaca|suri)\b/i);
  const compositionQuote = compQuote ?? words?.quote;
  const qualitySource = mainAlpaca?.material ?? mentioned?.[0];
  const q = qualitySource ? qualityFromMaterial(qualitySource) : { quality: null, provenance: "desconocido" as const };
  const qualityQuote = compQuote ?? mentioned?.[0];

  const suri = text.match(/\bsuri\b/i);
  const huacaya = text.match(/\bhuacaya\b/i);
  const breed: Breed | null = suri ? "suri" : huacaya ? "huacaya" : null;
  const madeIn = text.match(/made in peru|hecho en per[uú]/i);
  const handmade = text.match(/hand[- ]?(knit|made|woven|loomed)|tejido a mano/i);

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
  if (!composition.length && !words) warnings.push("Composición no declarada");
  if (words?.pure) warnings.push("100% deducido de la frase; la tienda no da porcentaje");
  if (words?.blend) warnings.push("Mezcla sin porcentajes");
  if (!q.quality && composition.length) warnings.push("La composición no indica calidad (solo 'alpaca')");
  if (q.quality && !mainAlpaca) warnings.push("Menciona la calidad pero no el % de alpaca");


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
      title: byColor.size > 1 && !p.title.toLowerCase().includes(colorName.toLowerCase()) ? `${p.title} — ${titleCase(colorName)}` : p.title,
      source: {
        site: src.site,
        url: `${src.baseUrl}/products/${p.handle}?variant=${cheapest.id}`,
        method: "feed",
        retrievedAt: src.retrievedAt,
      },
      seller: { name: src.multiBrand && p.vendor ? p.vendor : src.site },
      productType,
      fiber: {
        alpacaPct,
        composition,
        materials: words?.materials,
        blend: composition.length ? composition.some((c) => !isAlpaca(c.material)) : words?.blend,
        quality: q.quality,
        micron: null,
        breed,
      },
      color: {
        name: titleCase(colorName),
        family: color.family,
        hex: color.family && !COLOR_SWATCH[color.family].startsWith("conic") ? COLOR_SWATCH[color.family] : "#CFC3B1",
        natural: color.natural,
      },
      origin: { region: null, detail: madeIn ? "Hecho en Perú (sin región)" : undefined },
      construction: handmade ? "tejido_a_mano" : null,
      weightGrams: null,
      sizes,
      sizesAvailable,
      price: {
        amount,
        currency: src.currency,
        amountPen: Math.round(src.currency === "USD" ? amount * USD_PEN : amount),
        compareAt,
      },
      shipping: src.shipping,
      availability: {
        status: sizesAvailable.length === 0 ? "agotado" : sizesAvailable.length === 1 && sizes.length > 2 ? "pocas_unidades" : "en_stock",
        checkedAt: src.retrievedAt,
      },
      images: [...new Set(images)].slice(0, 4),
      rawDescription: body,
      evidence: {
        quality: q.quality ? { provenance: q.provenance, confidence: mainAlpaca ? 0.85 : 0.6, quote: qualityQuote } : { provenance: "desconocido", confidence: 0 },
        micron: { provenance: "desconocido", confidence: 0 },
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
