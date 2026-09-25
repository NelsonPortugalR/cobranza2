// Ingesta de fuentes públicas → data/catalog.json + data/coverage.json
//
//   npm run ingest            descarga de nuevo y normaliza
//   npm run ingest -- --cache normaliza desde data/raw/ sin volver a descargar
//
// Reglas de cortesía: respeta robots.txt, 1 petición cada ~1.2 s por dominio,
// user-agent identificable y solo lectura de datos de producto públicos.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { normalizeShopifyProduct, type ShopifyProduct, type ShopifySource } from "../lib/ingest/shopify.ts";
import { coverageReport } from "../lib/ingest/coverage.ts";
import { isAllowed, parseRobots } from "../lib/ingest/robots.ts";
import type { Product } from "../lib/types.ts";

const USER_AGENT = "VellonBot/0.1 (catalogo de alpaca; solo lectura)";

interface SourceConfig extends Omit<ShopifySource, "retrievedAt"> {
  key: string;
  kind: "shopify";
}

// Para activar una fuente, su dominio debe estar permitido en la red del entorno.
// Las que no respondan se omiten y se conserva su última descarga (data/raw/).
const SOURCES: SourceConfig[] = [
  {
    key: "solalpaca",
    kind: "shopify",
    site: "Sol Alpaca",
    baseUrl: "https://www.solalpaca.com",
    currency: "USD",
    shipping: {
      summary: "Envío mundial desde Perú (DHL), aranceles incluidos",
      costUsd: 25,
      days: "3–10 días hábiles",
    },
  },
  // Kuna (Grupo Inca) migró de kuna.com.pe a kunastores.com; la tienda de Perú vende en soles.
  { key: "kuna-pe", kind: "shopify", site: "Kuna", baseUrl: "https://pe.kunastores.com", currency: "PEN" },
  // Multimarca con varias marcas peruanas (incluida Kuna): el vendedor es la marca.
  { key: "alpacacollections", kind: "shopify", site: "Alpaca Collections", baseUrl: "https://www.alpacacollections.com", currency: "USD", multiBrand: true, alpacaOnly: true },
  { key: "paka", kind: "shopify", site: "PAKA", baseUrl: "https://www.pakaapparel.com", currency: "USD", alpacaOnly: true },
  { key: "peruvianconnection", kind: "shopify", site: "Peruvian Connection", baseUrl: "https://www.peruvianconnection.com", currency: "USD", alpacaOnly: true },
  { key: "krimsonklover", kind: "shopify", site: "Krimson Klover", baseUrl: "https://krimsonklover.com", currency: "USD", alpacaOnly: true },
  { key: "peruvianlink", kind: "shopify", site: "Peruvian Link", baseUrl: "https://peruvianlink.com", currency: "USD", alpacaOnly: true },
];


const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function robotsAllows(baseUrl: string, path: string): Promise<boolean> {
  const res = await fetch(`${baseUrl}/robots.txt`, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) return true;
  return isAllowed(parseRobots(await res.text(), "VellonBot"), path);
}

async function fetchShopify(src: SourceConfig): Promise<ShopifyProduct[]> {
  if (!(await robotsAllows(src.baseUrl, "/products.json"))) throw new Error(`robots.txt de ${src.site} no permite /products.json`);
  const all: ShopifyProduct[] = [];
  for (let page = 1; page < 100; page++) {
    const res = await fetch(`${src.baseUrl}/products.json?limit=250&page=${page}`, { headers: { "user-agent": USER_AGENT } });
    if (res.status === 429) {
      await sleep(10_000);
      page--;
      continue;
    }
    if (!res.ok) throw new Error(`${src.site}: HTTP ${res.status}`);
    const { products } = (await res.json()) as { products: ShopifyProduct[] };
    if (!products.length) break;
    all.push(...products);
    await sleep(1200);
  }
  return all;
}

async function main() {
  const useCache = process.argv.includes("--cache");
  await mkdir("data/raw", { recursive: true });
  const catalog: Product[] = [];

  for (const src of SOURCES) {
    const rawPath = `data/raw/${src.key}.json`;
    let raw: ShopifyProduct[] = [];
    let retrievedAt = "";
    const readCache = async () => {
      const cached = JSON.parse(await readFile(rawPath, "utf8"));
      raw = Array.isArray(cached) ? cached : cached.products;
      retrievedAt = Array.isArray(cached) ? new Date().toISOString() : cached.retrievedAt;
    };
    try {
      if (useCache) await readCache();
      else {
        raw = await fetchShopify(src);
        retrievedAt = new Date().toISOString();
        await writeFile(rawPath, JSON.stringify({ retrievedAt, products: raw }));
      }
    } catch (err) {
      const reason = err instanceof Error ? (err.cause as { code?: string })?.code ?? err.message : String(err);
      try {
        await readCache();
        console.warn(`${src.site}: sin acceso (${reason}); uso la descarga del ${retrievedAt!.slice(0, 10)}`);
      } catch {
        console.warn(`${src.site}: sin acceso (${reason}); se omite`);
        continue;
      }
    }
    const items = raw.flatMap((p) => normalizeShopifyProduct(p, { ...src, retrievedAt }));
    console.log(`${src.site}: ${raw.length} productos → ${items.length} ítems (producto × color)`);
    catalog.push(...items);
  }

  await writeFile("data/catalog.json", JSON.stringify(catalog));
  const coverage = coverageReport(catalog);
  await writeFile("data/coverage.json", JSON.stringify(coverage, null, 2));
  console.table(coverage.fields.map((f) => ({ campo: f.label, "con dato": `${f.pct}%` })));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
