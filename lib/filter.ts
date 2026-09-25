import type { Filters, Product, SortKey } from "./types.ts";
import { QUALITY_RANGES } from "./taxonomy.ts";

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

function sizeCheck(p: Product, sizes: string[]): Verdict {
  if (sizes.length === 0) return "pass";
  if (!p.sizesAvailable) return p.sizes?.some((s) => sizes.includes(s)) ? "unknown" : p.sizes ? "fail" : "unknown";
  return p.sizesAvailable.some((s) => sizes.includes(s)) ? "pass" : "fail";
}

export function evaluate(p: Product, f: Filters): { verdict: Verdict; unknown: string[] } {
  if (p.demo && !f.includeDemo) return { verdict: "fail", unknown: [] };
  const checks: [string, Verdict][] = [
    ["talla", sizeCheck(p, f.sizes)],
    ["tipo", check(f.types, p.productType)],
    ["calidad", check(f.qualities, p.fiber.quality)],
    ["raza", check(f.breeds, p.fiber.breed)],
    ["color", check(f.colorFamilies, p.color.family)],
    ["origen", check(f.origins, p.origin.region)],
    ["fuente", check(f.sources, p.source.site)],
    [
      "tinte",
      f.dye === "cualquiera"
        ? "pass"
        : p.color.natural == null
          ? "unknown"
          : p.color.natural === (f.dye === "natural")
            ? "pass"
            : "fail",
    ],
    [
      "composición",
      f.composition === "cualquiera"
        ? "pass"
        : p.fiber.alpacaPct == null
          ? "unknown"
          : (p.fiber.alpacaPct === 100) === (f.composition === "100")
            ? "pass"
            : "fail",
    ],
    ["precio", (f.priceMax == null || p.price.amountPen <= f.priceMax) && (f.priceMin == null || p.price.amountPen >= f.priceMin) ? "pass" : "fail"],
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
    ["texto", textMatch(p, f.text)],
  ];
  if (checks.some(([, v]) => v === "fail")) return { verdict: "fail", unknown: [] };
  const unknown = checks.filter(([, v]) => v === "unknown").map(([k]) => k);
  return { verdict: unknown.length ? "unknown" : "pass", unknown };
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

/** Micras usadas para ordenar: la declarada o, si falta, el punto medio de la categoría. */
export function effectiveMicron(p: Product): number {
  if (p.fiber.micron != null) return p.fiber.micron;
  const r = QUALITY_RANGES.find((q) => q.id === p.fiber.quality);
  return r ? (Math.max(r.min, 16) + Math.min(r.max, 34)) / 2 : 99;
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
  return { exact, partial };
}

function comparator(sort: SortKey) {
  return (a: Match, b: Match) => {
    switch (sort) {
      case "micras_asc":
        return effectiveMicron(a.product) - effectiveMicron(b.product) || b.score - a.score;
      case "precio_asc":
        return a.product.price.amountPen - b.product.price.amountPen;
      case "precio_desc":
        return b.product.price.amountPen - a.product.price.amountPen;
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
    (f.composition !== "cualquiera" ? 1 : 0) +
    (f.priceMin != null ? 1 : 0) +
    (f.priceMax != null ? 1 : 0) +
    (f.inStockOnly ? 1 : 0) +
    f.sizes.length
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
