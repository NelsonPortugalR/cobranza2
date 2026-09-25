import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQueryLocal } from "./parseQuery.ts";
import { applyFilters } from "./filter.ts";
import { PRODUCTS as MOCK } from "./products.ts";

// Los productos de ejemplo se marcan como demo en lib/catalog.ts.
const PRODUCTS = MOCK.map((p) => ({ ...p, demo: true }));
const withDemo = <T extends { filters: object }>(parsed: T) => ({ ...parsed, filters: { ...parsed.filters, includeDemo: true } });
import { qualityFromMicron } from "./taxonomy.ts";

test("clasifica micras según los rangos NTP", () => {
  assert.equal(qualityFromMicron(17.9), "ultrafina");
  assert.equal(qualityFromMicron(18), "ultrafina");
  assert.equal(qualityFromMicron(19.5), "super_baby");
  assert.equal(qualityFromMicron(22.5), "baby");
  assert.equal(qualityFromMicron(25), "fleece");
});

test("consulta insignia: chompa baby alpaca beige de Puno, lo más fino posible", () => {
  const parsed = withDemo(parseQueryLocal("chompa baby alpaca beige de Puno, lo más fino posible"));
  assert.deepEqual(parsed.filters.types, ["chompa"]);
  assert.deepEqual(parsed.filters.qualities, ["ultrafina", "super_baby", "baby"]);
  assert.deepEqual(parsed.filters.colorFamilies, ["beige"]);
  assert.deepEqual(parsed.filters.origins, ["puno"]);
  assert.equal(parsed.sort, "micras_asc");
  assert.equal(parsed.filters.text, "");

  const { exact, partial } = applyFilters(PRODUCTS, parsed.filters, parsed.sort);
  assert.deepEqual(exact.map((m) => m.product.id), ["casa-misti-royal-beige", "etsy-handknit-beige"]);
  assert.deepEqual(
    partial.map((m) => m.product.id).sort(),
    ["ml-chompa-mujer-beige", "sol-alpaca-cuello-alto"],
  );
  assert.ok(partial.every((m) => m.unknownFields.includes("origen")));
});

test("rechaza mezclas cuando se pide 100% alpaca", () => {
  const parsed = withDemo(parseQueryLocal("manta 100% alpaca"));
  const { exact, partial } = applyFilters(PRODUCTS, parsed.filters, parsed.sort);
  assert.equal(exact.length + partial.length, 0);
});

test("precio, raza y tinte", () => {
  const parsed = withDemo(parseQueryLocal("fibra suri sin teñir hasta 200 soles"));
  assert.deepEqual(parsed.filters.breeds, ["suri"]);
  assert.equal(parsed.filters.dye, "natural");
  assert.equal(parsed.filters.priceMax, 200);
  const { exact } = applyFilters(PRODUCTS, parsed.filters, parsed.sort);
  assert.deepEqual(exact.map((m) => m.product.id), ["etsy-suri-roving"]);
});

test("límite de micras explícito", () => {
  const parsed = withDemo(parseQueryLocal("chompa de menos de 20 micras"));
  assert.deepEqual(parsed.filters.qualities, ["ultrafina", "super_baby"]);
});

test("consulta del usuario: suéter marrón, 100% baby alpaca, talla M, menos de US$180", () => {
  const parsed = parseQueryLocal("Suéter marrón, 100% baby alpaca, talla M, menos de US$180.");
  assert.deepEqual(parsed.filters.types, ["chompa"]);
  assert.deepEqual(parsed.filters.colorFamilies, ["marron"]);
  assert.equal(parsed.filters.composition, "100");
  assert.deepEqual(parsed.filters.qualities, ["ultrafina", "super_baby", "baby"]);
  assert.deepEqual(parsed.filters.sizes, ["M"]);
  assert.equal(parsed.filters.priceCurrency, "USD");
  assert.equal(parsed.filters.priceMax, 675);
  assert.equal(parsed.filters.text, "");
});

test("precio en soles y en dólares", () => {
  assert.equal(parseQueryLocal("chal hasta S/ 300").filters.priceMax, 300);
  assert.equal(parseQueryLocal("chal hasta 300 soles").filters.priceCurrency, "PEN");
  assert.equal(parseQueryLocal("chal hasta 100 dolares").filters.priceMax, 375);
  const between = parseQueryLocal("poncho entre $100 y $200").filters;
  assert.deepEqual([between.priceMin, between.priceMax, between.priceCurrency], [375, 750, "USD"]);
});

test("los ejemplos quedan ocultos salvo que se pidan", () => {
  const parsed = parseQueryLocal("chompa");
  const { exact } = applyFilters(PRODUCTS, parsed.filters, parsed.sort);
  assert.equal(exact.length, 0);
});

test("talla exige stock en esa talla", () => {
  const f = withDemo(parseQueryLocal("chompa talla XL")).filters;
  const { exact, partial } = applyFilters(PRODUCTS, f, "relevancia");
  // Las chompas de ejemplo que tienen XL no informan stock por talla: quedan "por confirmar".
  assert.equal(exact.length, 0);
  assert.ok(partial.length > 0 && partial.every((m) => m.unknownFields.includes("talla")));

  const conStock = { ...PRODUCTS[0], sizes: ["S", "M", "L"], sizesAvailable: ["S", "L"] };
  const m = applyFilters([conStock], withDemo(parseQueryLocal("talla M")).filters, "relevancia");
  assert.equal(m.exact.length + m.partial.length, 0, "M existe pero está agotada");
  const l = applyFilters([conStock], withDemo(parseQueryLocal("talla L")).filters, "relevancia");
  assert.equal(l.exact.length, 1);
});

test("envío a Perú", () => {
  const f = parseQueryLocal("chal de alpaca con envío a Lima").filters;
  assert.equal(f.shipsToPeru, true);
  assert.deepEqual(f.origins, [], "Lima aquí es destino de envío, no origen");
});

test("conteos de facetas coinciden con aplicar el filtro", async () => {
  const { facetCounts } = await import("./filter.ts");
  const base = withDemo(parseQueryLocal("chompa")).filters;
  const counts = facetCounts(PRODUCTS, base, { types: [], qualities: ["baby"], colorFamilies: ["beige"], sizes: ["M"], sources: [] });
  for (const [key, value] of [["qualities", "baby"], ["colorFamilies", "beige"], ["sizes", "M"]] as const) {
    const r = applyFilters(PRODUCTS, { ...base, [key]: [value] }, "relevancia");
    assert.deepEqual(counts[key][value], { exact: r.exact.length, total: r.exact.length + r.partial.length }, key);
  }
});
