// Solo servidor: usa node:fs.
import { readFileSync } from "node:fs";
import path from "node:path";
import { PRODUCTS as DEMO_PRODUCTS } from "./products.ts";
import type { Product } from "./types.ts";
import type { Coverage } from "./ingest/coverage.ts";

// Catálogo servido por la app: datos reales de data/catalog.json (generado por
// `npm run ingest`) + productos de ejemplo de tiendas aún no conectadas.

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), "data", file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

const REAL: Product[] = readJson<Product[]>("catalog.json", []);
const REAL_SITES = new Set(REAL.map((p) => p.source.site));
const DEMO: Product[] = DEMO_PRODUCTS.filter((p) => !REAL_SITES.has(p.source.site)).map((p) => ({ ...p, demo: true }));

export const ALL_PRODUCTS: Product[] = [...REAL, ...DEMO];
export const COVERAGE: Coverage | null = readJson<Coverage | null>("coverage.json", null);

export function getProduct(id: string): Product | undefined {
  return ALL_PRODUCTS.find((p) => p.id === id);
}

export const SOURCES = [...new Set(ALL_PRODUCTS.map((p) => p.source.site))];
export const REAL_SOURCES = [...REAL_SITES];
