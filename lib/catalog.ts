// Solo servidor: usa node:fs.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Product } from "./types.ts";
import type { Coverage } from "./ingest/coverage.ts";
import { FALLBACK_FX, type FxRate } from "./fx.ts";
import { slugify } from "./slug.ts";

// Catálogo servido por la app: datos reales de data/catalog.json, generado por
// `npm run ingest`. Los productos de ejemplo (lib/products.ts) solo se usan en tests.

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), "data", file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export const ALL_PRODUCTS: Product[] = readJson<Product[]>("catalog.json", []);

// Slugs en inglés, estables mientras no cambie el título: "<título>-<tienda>".
// Los choques se resuelven en orden de id para que el resultado sea determinista.
const BY_SLUG = new Map<string, Product>();
const BY_ID = new Map<string, Product>();
for (const p of [...ALL_PRODUCTS].sort((a, b) => a.id.localeCompare(b.id))) {
  const base = slugify(`${p.title} ${p.source.site}`) || slugify(p.id);
  let slug = base;
  for (let n = 2; BY_SLUG.has(slug); n++) slug = `${base}-${n}`;
  p.slug = slug;
  BY_SLUG.set(slug, p);
  BY_ID.set(p.id, p);
}

/** Productos que se muestran e indexan: los que envían a EE. UU. (público objetivo). */
export const US_PRODUCTS = ALL_PRODUCTS.filter((p) => p.shipping?.toUS);
export const COVERAGE: Coverage | null = readJson<Coverage | null>("coverage.json", null);
export const FX: FxRate = readJson<FxRate>("fx.json", FALLBACK_FX);

/** Acepta el slug público o el id interno (URLs antiguas /producto/<id>). */
export function getProduct(slugOrId: string): Product | undefined {
  return BY_SLUG.get(slugOrId) ?? BY_ID.get(slugOrId);
}

export const productPath = (p: Product) => `/products/${p.slug ?? p.id}`;

export const SOURCES = [...new Set(ALL_PRODUCTS.map((p) => p.source.site))];
/** Tiendas que envían a EE. UU. según su política publicada. */
export const US_SOURCES = [...new Set(ALL_PRODUCTS.filter((p) => p.shipping?.toUS).map((p) => p.source.site))];
