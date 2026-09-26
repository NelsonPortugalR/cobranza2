import type { Filters, Product, SortKey } from "./types.ts";
import { QUALITY_RANGES } from "./taxonomy.ts";
import { alpacaRangeVerdict, noSyntheticsVerdict, type AlpacaRange } from "./fiber.ts";

type Verdict = "pass" | "fail" | "unknown";

export interface Match {
  product: Product;
  /** Filtros que no se pudieron verificar porque la tienda no declara el dato. */
  unknownFields: string[];
  score: number;
}

export interface FilterResult {
  exact: Match[];
  /** Productos que no contradicen ningún filtro, pero les falta algún dato. */
  partial: Match[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

function check<T>(selected: T[], value: T | null | undefined): Verdict {
  if (selected.length === 0) return "pass";
  if (value == null) return "unknown";
  return selected.includes(value) ? "pass" : "fail";
}

/** "unisex" sirve para ambos; sin dato = por confirmar. */
function genderCheck(p: Product, genders: Filters["genders"]): Verdict {
  if (genders.length === 0) return "pass";
  if (!p.gender) return "unknown";
  return p.gender === "unisex" || genders.includes(p.gender) ? "pass" : "fail";
}

function sizeCheck(p: Product, sizes: string[]): Verdict {
  if (sizes.length === 0) return "pass";
  if (!p.sizesAvailable) return p.sizes?.some((s) => sizes.includes(s)) ? "unknown" : p.sizes ? "fail" : "unknown";
  return p.sizesAvailable.some((s) => sizes.includes(s)) ? "pass" : "fail";
}

export function evaluate(p: Product, f: Filters): { verdict: Verdict; unknown: string[] } {
  if (p.demo && !f.includeDemo) return { verdict: "fail", unknown: [] };
  const checks: [string, Verdict][] = [
    ["size", sizeCheck(p, f.sizes)],
    ["gender", genderCheck(p, f.genders)],
    ["type", check(f.types, p.productType)],
    ["fiber grade", check(f.qualities, p.fiber.quality)],
    ["breed", check(f.breeds, p.fiber.breed)],
    ["color", check(f.colorFamilies, p.color.family)],
    ["origin", check(f.origins, p.origin.region)],
    ["store", check(f.sources, p.source.site)],
    [
      "dye",
      f.dye === "cualquiera"
        ? "pass"
        : p.color.natural == null
          ? "unknown"
          : p.color.natural === (f.dye === "natural")
            ? "pass"
            : "fail",
    ],
    ["fiber content", anyOf(f.alpacaRanges.map((r) => alpacaRangeVerdict(p, r)))],
    ["synthetics", f.noSynthetics ? noSyntheticsVerdict(p) : "pass"],
    ["price", (f.priceMax == null || p.price.amountUsd <= f.priceMax) && (f.priceMin == null || p.price.amountUsd >= f.priceMin) ? "pass" : "fail"],
    [
      "stock",
      !f.inStockOnly
        ? "pass"
        : p.availability.status === "agotado"
          ? "fail"
          : p.availability.status === "desconocido"
            ? "unknown"
            : "pass",
    ],
    ["US shipping", !f.shipsToUS ? "pass" : p.shipping?.toUS == null ? "unknown" : p.shipping.toUS ? "pass" : "fail"],
    ["text", textMatch(p, f.text)],
  ];
  if (checks.some(([, v]) => v === "fail")) return { verdict: "fail", unknown: [] };
  const unknown = checks.filter(([, v]) => v === "unknown").map(([k]) => k);
  return { verdict: unknown.length ? "unknown" : "pass", unknown };
}

/** Varias opciones de una faceta se combinan con "o": basta una que cumpla. */
function anyOf(verdicts: Verdict[]): Verdict {
  if (verdicts.length === 0) return "pass";
  if (verdicts.includes("pass")) return "pass";
  return verdicts.includes("unknown") ? "unknown" : "fail";
}

function textMatch(p: Product, text: string): Verdict {
  if (!text) return "pass";
  const hay = norm(`${p.title} ${p.rawDescription} ${p.color.name} ${p.seller.name} ${p.origin.detail ?? ""}`);
  const words = norm(text).split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return "pass";
  // Texto libre es tolerante: basta con que aparezca la mitad de las palabras.
  const hits = words.filter((w) => hay.includes(w)).length;
  return hits / words.length >= 0.5 ? "pass" : "fail";
}

/** Micras usadas solo para ordenar: la declarada o, si falta, una referencia del grado. */
export function effectiveMicron(p: Product): number {
  if (p.fiber.micron != null) return p.fiber.micron;
  return QUALITY_RANGES.find((q) => q.id === p.fiber.quality)?.sortMicron ?? 99;
}

export function applyFilters(products: Product[], f: Filters, sort: SortKey): FilterResult {
  const exact: Match[] = [];
  const partial: Match[] = [];
  for (const product of products) {
    const { verdict, unknown } = evaluate(product, f);
    if (verdict === "fail") continue;
    const score = product.extraction.confidence - unknown.length * 0.2 + (product.availability.status === "agotado" ? -0.5 : 0);
    (verdict === "pass" ? exact : partial).push({ product, unknownFields: unknown, score });
  }
  const cmp = comparator(sort);
  exact.sort(cmp);
  partial.sort(cmp);
  // En "relevancia" intercalamos tiendas: el valor está en comparar entre ellas.
  if (sort === "relevancia") return { exact: interleaveBySource(exact), partial: interleaveBySource(partial) };
  return { exact, partial };
}

function interleaveBySource(list: Match[]): Match[] {
  const queues = new Map<string, Match[]>();
  for (const m of list) {
    const k = m.product.source.site;
    if (!queues.has(k)) queues.set(k, []);
    queues.get(k)!.push(m);
  }
  const out: Match[] = [];
  while (out.length < list.length) {
    for (const q of queues.values()) {
      const next = q.shift();
      if (next) out.push(next);
    }
  }
  return out;
}

function comparator(sort: SortKey) {
  return (a: Match, b: Match) => {
    switch (sort) {
      case "micras_asc":
        return effectiveMicron(a.product) - effectiveMicron(b.product) || b.score - a.score;
      case "precio_asc":
        return a.product.price.amountUsd - b.product.price.amountUsd;
      case "precio_desc":
        return b.product.price.amountUsd - a.product.price.amountUsd;
      default:
        return b.score - a.score;
    }
  };
}

export function activeFilterCount(f: Filters): number {
  return (
    f.types.length +
    (f.qualities.length ? 1 : 0) +
    f.breeds.length +
    f.colorFamilies.length +
    f.origins.length +
    f.sources.length +
    (f.dye !== "cualquiera" ? 1 : 0) +
    (f.alpacaRanges.length ? 1 : 0) +
    (f.noSynthetics ? 1 : 0) +
    (f.priceMin != null ? 1 : 0) +
    (f.priceMax != null ? 1 : 0) +
    (f.inStockOnly ? 1 : 0) +

    f.sizes.length +
    f.genders.length
  );
}

/** Conteos para facetas, sin ordenar: exactos y total (exactos + por confirmar). */
export function countMatches(products: Product[], f: Filters): { exact: number; total: number } {
  let exact = 0;
  let total = 0;
  for (const p of products) {
    const v = evaluate(p, f).verdict;
    if (v === "fail") continue;
    total++;
    if (v === "pass") exact++;
  }
  return { exact, total };
}

export type FacetKey = "types" | "qualities" | "colorFamilies" | "sizes" | "sources" | "genders" | "alpacaRanges";
export type FacetCounts = Record<FacetKey, Record<string, { exact: number; total: number }>>;

/** Verdicto de un producto para una sola opción de una faceta. */
function optionVerdict(p: Product, key: FacetKey, option: string): Verdict {
  switch (key) {
    case "types":
      return p.productType === option ? "pass" : "fail";
    case "sources":
      return p.source.site === option ? "pass" : "fail";
    case "qualities":
      return p.fiber.quality == null ? "unknown" : p.fiber.quality === option ? "pass" : "fail";
    case "colorFamilies":
      return p.color.family == null ? "unknown" : p.color.family === option ? "pass" : "fail";
    case "sizes":
      return sizeCheck(p, [option]);
    case "genders":
      return genderCheck(p, [option as "women" | "men"]);
    case "alpacaRanges":
      return alpacaRangeVerdict(p, option as AlpacaRange);
  }
}

/**
 * Conteos por opción: cuántos resultados habría al elegir esa opción, dados los
 * demás filtros. Una pasada por faceta en vez de una por opción.
 */
export function facetCounts(products: Product[], f: Filters, options: Record<FacetKey, string[]>): FacetCounts {
  const out = {} as FacetCounts;
  for (const key of Object.keys(options) as FacetKey[]) {
    const counts: Record<string, { exact: number; total: number }> = {};
    for (const o of options[key]) counts[o] = { exact: 0, total: 0 };
    const base = { ...f, [key]: [] } as Filters;
    for (const p of products) {
      const b = evaluate(p, base).verdict;
      if (b === "fail") continue;
      for (const o of options[key]) {
        const v = optionVerdict(p, key, o);
        if (v === "fail") continue;
        counts[o].total++;
        if (v === "pass" && b === "pass") counts[o].exact++;
      }
    }
    out[key] = counts;
  }
  return out;
}
