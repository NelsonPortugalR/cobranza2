// Solo servidor: usa node:fs.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Product } from "./types.ts";
import type { Coverage } from "./ingest/coverage.ts";
import { FALLBACK_FX, type FxRate } from "./fx.ts";

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
export const COVERAGE: Coverage | null = readJson<Coverage | null>("coverage.json", null);
export const FX: FxRate = readJson<FxRate>("fx.json", FALLBACK_FX);

export function getProduct(id: string): Product | undefined {
  return ALL_PRODUCTS.find((p) => p.id === id);
}

export const SOURCES = [...new Set(ALL_PRODUCTS.map((p) => p.source.site))];
/** Tiendas que envían a EE. UU. según su política publicada. */
export const US_SOURCES = [...new Set(ALL_PRODUCTS.filter((p) => p.shipping?.toUS).map((p) => p.source.site))];
