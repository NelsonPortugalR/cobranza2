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
import { normalizeWooProduct, type WooProduct } from "../lib/ingest/woocommerce.ts";
import { FALLBACK_FX, parseBcrp, parseOpenEr, type FxRate } from "../lib/fx.ts";
import type { Product } from "../lib/types.ts";

const USER_AGENT = "VellonBot/0.1 (catalogo de alpaca; solo lectura)";

interface SourceConfig extends Omit<ShopifySource, "retrievedAt"> {
  key: string;
  kind: "shopify" | "woocommerce";
  /** WooCommerce: ruta base de la tienda si no está en la raíz (p. ej. "/peru"). */
  wooPath?: string;
}

// Para activar una fuente, su dominio debe estar permitido en la red del entorno.
// Las que no respondan se omiten y se conserva su última descarga (data/raw/).
// shipping.toUS: según la política de envío publicada por cada tienda (revisada el 25 sep 2026).
const SOURCES: SourceConfig[] = [
  {
    key: "solalpaca",
    kind: "shopify",
    site: "Sol Alpaca",
    baseUrl: "https://www.solalpaca.com",
    currency: "USD",
    shipping: { summary: "Ships worldwide from Peru via DHL, duties included", costUsd: 25, days: "3–6 business days to the US", toUS: true },
  },
  {
    key: "kuna-pe",
    kind: "shopify",
    site: "Kuna",
    baseUrl: "https://pe.kunastores.com",
    currency: "PEN",
    alpacaOnly: true,
    shipping: { summary: "Ships within Peru only (for the US, see Kuna USA)", toUS: false },
  },
  {
    key: "kuna-us",
    kind: "shopify",
    site: "Kuna USA",
    baseUrl: "https://us.kunastores.com",
    currency: "USD",
    alpacaOnly: true,
    shipping: { summary: "Ships within the US", toUS: true },
  },
  {
    key: "incalpaca",
    kind: "shopify",
    // incalpacastores.com y alpaca111.com son la misma tienda: se conecta una sola vez.
    site: "Incalpaca",
    baseUrl: "https://incalpacastores.com",
    currency: "PEN",
    alpacaOnly: true,
    shipping: { summary: "Ships internationally from Peru, including the US", toUS: true },
  },
  {
    key: "incalpaca-remate",
    kind: "shopify",
    site: "Incalpaca Remate",
    baseUrl: "https://remate.incalpacastores.com",
    currency: "PEN",
    alpacaOnly: true,
    shipping: { summary: "Outlet store; ships within Peru", toUS: false },
  },
  {
    key: "alpacacollections",
    kind: "shopify",
    site: "Alpaca Collections",
    baseUrl: "https://www.alpacacollections.com",
    currency: "USD",
    multiBrand: true,
    alpacaOnly: true,
    shipping: { summary: "Ships from the US: standard $12 (2–3 business days)", costUsd: 12, days: "2–3 business days", toUS: true },
  },
  {
    key: "paka",
    kind: "shopify",
    site: "PAKA",
    baseUrl: "https://www.pakaapparel.com",
    currency: "USD",
    alpacaOnly: true,
    shipping: { summary: "US-based brand; shipping policy not published", toUS: true },
  },
  {
    key: "peruvianconnection",
    kind: "shopify",
    site: "Peruvian Connection",
    baseUrl: "https://www.peruvianconnection.com",
    currency: "USD",
    alpacaOnly: true,
    shipping: { summary: "US shipping from $7.95, free over $350", costUsd: 7.95, days: "7–10 business days", toUS: true },
  },
  {
    key: "krimsonklover",
    kind: "shopify",
    site: "Krimson Klover",
    baseUrl: "https://krimsonklover.com",
    currency: "USD",
    alpacaOnly: true,
    shipping: { summary: "US-based brand; shipping policy not published", toUS: true },
  },
  {
    key: "peruvianlink",
    kind: "shopify",
    site: "Peruvian Link",
    baseUrl: "https://peruvianlink.com",
    currency: "USD",
    alpacaOnly: true,
    shipping: { summary: "Ships from the US via USPS, UPS or FedEx, from $20", costUsd: 20, toUS: true },
  },
  {
    key: "anntarah",
    kind: "shopify",
    site: "Anntarah",
    baseUrl: "https://anntarah.com",
    currency: "PEN",
    alpacaOnly: true,
    shipping: { summary: "Ships within Peru only", toUS: false },
  },
  {
    key: "etnoalpaca",
    kind: "shopify",
    site: "Etno Alpaca",
    baseUrl: "https://etnoalpaca.com",
    currency: "USD",
    alpacaOnly: true,
    shipping: { summary: "Ships internationally from Peru (EMS); import duties not included", toUS: true },
  },
  {
    key: "qinti",
    kind: "shopify",
    site: "Qinti",
    baseUrl: "https://www.qintiperu.com",
    currency: "USD",
    alpacaOnly: true,
    shipping: { summary: "Shipping policy not published", toUS: null },
  },
  {
    key: "allalpaca",
    kind: "shopify",
    site: "All Alpaca",
    baseUrl: "https://allalpaca.com.pe",
    currency: "USD",
    alpacaOnly: true,
    shipping: { summary: "Ships worldwide from Peru, free over $150", toUS: true },
  },
  {
    key: "purealpaca",
    kind: "woocommerce",
    site: "Pure Alpaca",
    baseUrl: "https://purealpacastores.com",
    wooPath: "/peru",
    currency: "PEN",
    alpacaOnly: true,
    shipping: { summary: "Ships within Peru only", toUS: false },
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch con hasta 3 reintentos ante cortes de red o errores 5xx (espera 2 s, 4 s, 8 s). */
async function politeFetch(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
      if (res.status < 500 || attempt >= 3) return res;
    } catch (err) {
      if (attempt >= 3) throw err;
    }
    await sleep(2000 * 2 ** attempt);
  }
}

async function robotsAllows(baseUrl: string, path: string): Promise<boolean> {
  const res = await politeFetch(`${baseUrl}/robots.txt`);
  if (!res.ok) return true;
  return isAllowed(parseRobots(await res.text(), "VellonBot"), path);
}

async function fetchShopify(src: SourceConfig): Promise<ShopifyProduct[]> {
  if (!(await robotsAllows(src.baseUrl, "/products.json"))) throw new Error(`robots.txt de ${src.site} no permite /products.json`);
  const all: ShopifyProduct[] = [];
  for (let page = 1; page < 100; page++) {
    const res = await politeFetch(`${src.baseUrl}/products.json?limit=250&page=${page}`);
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

async function fetchWoo(src: SourceConfig): Promise<WooProduct[]> {
  const base = `${src.baseUrl}${src.wooPath ?? ""}`;
  const path = `${src.wooPath ?? ""}/wp-json/wc/store/v1/products`;
  if (!(await robotsAllows(src.baseUrl, path))) throw new Error(`robots.txt de ${src.site} no permite ${path}`);
  const all: WooProduct[] = [];
  for (let page = 1; page < 200; page++) {
    const res = await politeFetch(`${base}/wp-json/wc/store/v1/products?per_page=100&page=${page}`);
    if (res.status === 400) break; // página fuera de rango
    if (!res.ok) throw new Error(`${src.site}: HTTP ${res.status}`);
    const products = (await res.json()) as WooProduct[];
    all.push(...products);
    const totalPages = Number(res.headers.get("x-wp-totalpages") ?? page);
    if (page >= totalPages || !products.length) break;
    await sleep(1200);
  }
  return all;
}

/** Tipo de cambio del día: BCRP (oficial) → open.er-api.com → último conocido → respaldo fijo. */
async function getFx(useCache: boolean): Promise<FxRate> {
  let last: FxRate | null = null;
  try {
    last = JSON.parse(await readFile("data/fx.json", "utf8"));
  } catch {}
  if (!useCache) {
    const sources: [string, (j: unknown) => FxRate | null][] = [
      ["https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04640PD/json", parseBcrp],
      ["https://open.er-api.com/v6/latest/USD", parseOpenEr],
    ];
    for (const [url, parse] of sources) {
      try {
        const res = await politeFetch(url);
        const fx = res.ok ? parse(await res.json()) : null;
        if (fx) return fx;
      } catch {}
    }
  }
  if (last) return { ...last, source: last.source === "fallback" ? "fallback" : "last-known" };
  return FALLBACK_FX;
}

async function main() {
  const useCache = process.argv.includes("--cache");
  await mkdir("data/raw", { recursive: true });
  const fx = await getFx(useCache);
  await writeFile("data/fx.json", JSON.stringify(fx, null, 2));
  console.log(`Tipo de cambio: S/ ${fx.penPerUsd} por USD (${fx.source}${fx.date ? `, ${fx.date}` : ""})`);
  const catalog: Product[] = [];

  for (const src of SOURCES) {
    const rawPath = `data/raw/${src.key}.json`;
    let raw: (ShopifyProduct | WooProduct)[] = [];
    let retrievedAt = "";
    const readCache = async () => {
      const cached = JSON.parse(await readFile(rawPath, "utf8"));
      raw = Array.isArray(cached) ? cached : cached.products;
      retrievedAt = Array.isArray(cached) ? new Date().toISOString() : cached.retrievedAt;
    };
    try {
      if (useCache) await readCache();
      else {
        raw = src.kind === "woocommerce" ? await fetchWoo(src) : await fetchShopify(src);
        retrievedAt = new Date().toISOString();
        await writeFile(rawPath, JSON.stringify({ retrievedAt, products: raw }));
      }
    } catch (err) {
      const code = err instanceof Error ? (err.cause as { code?: string } | undefined)?.code : undefined;
      const reason = code ? String(code) : err instanceof Error ? err.message : String(err);
      // HTTP 403 suele ser el proxy del entorno: revisar que el dominio esté permitido.
      try {
        await readCache();
        console.warn(`${src.site}: sin acceso (${reason}); uso la descarga del ${retrievedAt!.slice(0, 10)}`);
      } catch {
        console.warn(`${src.site}: sin acceso (${reason}); se omite`);
        continue;
      }
    }
    // Solo lo que se puede comprar hoy: las fichas agotadas (archivo, temporadas pasadas) son ruido.
    const all = raw.flatMap((p) =>
      src.kind === "woocommerce"
        ? normalizeWooProduct(p as WooProduct, { ...src, retrievedAt, fx })
        : normalizeShopifyProduct(p as ShopifyProduct, { ...src, retrievedAt, fx }),
    );
    const items = all.filter((p) => p.availability.status !== "agotado");
    console.log(`${src.site}: ${raw.length} productos → ${items.length} ítems con stock (${all.length - items.length} agotados omitidos)`);
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
