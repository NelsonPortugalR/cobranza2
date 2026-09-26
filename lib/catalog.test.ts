import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQueryLocal } from "./parseQuery.ts";
import { applyFilters, facetCounts } from "./filter.ts";
import { PRODUCTS as MOCK } from "./products.ts";
import { officialClassFromMicron } from "./taxonomy.ts";
import { bcrpDate, parseBcrp, toUsd, type FxRate } from "./fx.ts";
import { stripNonComparable } from "./comparable.ts";

// Los productos de ejemplo se marcan como demo; los tests los incluyen explícitamente.
const PRODUCTS = MOCK.map((p) => ({ ...p, demo: true }));
const FX: FxRate = { penPerUsd: 3.5, date: "2026-09-25", source: "BCRP" };
const withDemo = <T extends { filters: object }>(parsed: T) => ({
  ...parsed,
  filters: { ...parsed.filters, includeDemo: true, shipsToUS: false },
});

test("micron ranges follow NTP 231.301:2022", () => {
  assert.equal(officialClassFromMicron(17.9), "Ultrafina");
  assert.equal(officialClassFromMicron(18), "Ultrafina");
  assert.equal(officialClassFromMicron(19.5), "Superfina");
  assert.equal(officialClassFromMicron(22.5), "Extrafina");
  assert.equal(officialClassFromMicron(25), "Fina");
  assert.equal(officialClassFromMicron(31.6), "Gruesa");
});

test("target query: brown sweater, 100% baby alpaca, size M, under $180", () => {
  const { filters, chips } = parseQueryLocal("Brown sweater, 100% baby alpaca, size M, under $180.", FX);
  assert.deepEqual(filters.types, ["chompa"]);
  assert.deepEqual(filters.colorFamilies, ["marron"]);
  assert.deepEqual(filters.alpacaRanges, ["100"]);
  assert.deepEqual(filters.qualities, ["royal", "imperial", "super_baby", "baby"]);
  assert.deepEqual(filters.sizes, ["M"]);
  assert.equal(filters.priceMax, 180);
  assert.equal(filters.shipsToUS, true, "US shipping is on by default");
  assert.equal(filters.text, "");
  assert.ok(chips.some((c) => c.label === "Under $180"));
});

test("English phrasing: sizes, price words and accessories", () => {
  const a = parseQueryLocal("gray cardigan in size small between $100 and $250", FX).filters;
  assert.deepEqual(a.types, ["cardigan"]);
  assert.deepEqual(a.colorFamilies, ["gris"]);
  assert.deepEqual(a.sizes, ["S"]);
  assert.deepEqual([a.priceMin, a.priceMax], [100, 250]);
  const b = parseQueryLocal("alpaca beanie and gloves under 60 dollars", FX).filters;
  assert.deepEqual(b.types, ["gorro", "guantes"]);
  assert.equal(b.priceMax, 60);
  assert.equal(b.text, "");
  const c = parseQueryLocal("royal alpaca wrap in camel, one size", FX).filters;
  assert.deepEqual(c.types, ["chal"]);
  assert.deepEqual(c.qualities, ["royal"]);
  assert.deepEqual(c.colorFamilies, ["camel"]);
  assert.deepEqual(c.sizes, ["Única"]);
});

test("Spanish still works, and soles are converted to USD", () => {
  const f = parseQueryLocal("chompa marrón de baby alpaca, talla M, menos de S/ 700", FX).filters;
  assert.deepEqual(f.types, ["chompa"]);
  assert.deepEqual(f.colorFamilies, ["marron"]);
  assert.deepEqual(f.sizes, ["M"]);
  assert.equal(f.priceMax, 200, "700 / 3.5");
  assert.equal(parseQueryLocal("scarf up to 350 soles", FX).filters.priceMax, 100);
});

test("unpublished criteria are ignored with a notice", () => {
  const parsed = parseQueryLocal("undyed suri sweater from Puno", FX);
  const { filters, ignored } = stripNonComparable(parsed.filters);
  assert.deepEqual([filters.origins, filters.breeds, filters.dye], [[], [], "cualquiera"]);
  assert.equal(ignored.length, 3);
});

test("soles are converted with the day's rate", () => {
  assert.equal(toUsd(700, "PEN", FX), 200);
  assert.equal(toUsd(120, "USD", FX), 120);
});

test("flagship query over sample data: exact vs to-confirm", () => {
  const parsed = withDemo(parseQueryLocal("baby alpaca sweater in beige from Puno, finest possible", FX));
  assert.equal(parsed.sort, "micras_asc");
  const { exact, partial } = applyFilters(PRODUCTS, parsed.filters, parsed.sort);
  assert.deepEqual(exact.map((m) => m.product.id), ["casa-misti-royal-beige", "etsy-handknit-beige"]);
  assert.deepEqual(partial.map((m) => m.product.id).sort(), ["ml-chompa-mujer-beige", "sol-alpaca-cuello-alto"]);
  assert.ok(partial.every((m) => m.unknownFields.includes("origin")));
});

test("100% alpaca excludes blends", () => {
  const parsed = withDemo(parseQueryLocal("100% alpaca throw", FX));
  const { exact, partial } = applyFilters(PRODUCTS, parsed.filters, parsed.sort);
  assert.equal(exact.length + partial.length, 0);
});

test("sample products stay hidden unless requested", () => {
  const parsed = parseQueryLocal("sweater", FX);
  const { exact } = applyFilters(PRODUCTS, { ...parsed.filters, shipsToUS: false }, parsed.sort);
  assert.equal(exact.length, 0);
});

test("size requires stock in that size", () => {
  const conStock = { ...PRODUCTS[0], sizes: ["S", "M", "L"], sizesAvailable: ["S", "L"] };
  const m = applyFilters([conStock], withDemo(parseQueryLocal("size M", FX)).filters, "relevancia");
  assert.equal(m.exact.length + m.partial.length, 0, "M exists but is sold out");
  const l = applyFilters([conStock], withDemo(parseQueryLocal("size L", FX)).filters, "relevancia");
  assert.equal(l.exact.length, 1);
});

test("US shipping filter", () => {
  const base = withDemo(parseQueryLocal("sweater", FX)).filters;
  const ships = { ...PRODUCTS[0], shipping: { summary: "", toUS: true } };
  const noShip = { ...PRODUCTS[1], id: "x", shipping: { summary: "", toUS: false } };
  const unknown = { ...PRODUCTS[2], id: "y", shipping: { summary: "", toUS: null } };
  const r = applyFilters([ships, noShip, unknown], { ...base, shipsToUS: true }, "relevancia");
  assert.deepEqual(r.exact.map((m) => m.product.id), [ships.id]);
  assert.deepEqual(r.partial.map((m) => m.product.id), ["y"]);
  assert.deepEqual(r.partial[0].unknownFields, ["US shipping"]);
});

test("facet counts match applying the filter", () => {
  const base = withDemo(parseQueryLocal("sweater", FX)).filters;
  const counts = facetCounts(PRODUCTS, base, { types: [], qualities: ["baby"], colorFamilies: ["beige"], sizes: ["M"], sources: [], genders: [], alpacaRanges: [], shipsFrom: [] });
  for (const [key, value] of [["qualities", "baby"], ["colorFamilies", "beige"], ["sizes", "M"]] as const) {
    const r = applyFilters(PRODUCTS, { ...base, [key]: [value] }, "relevancia");
    assert.deepEqual(counts[key][value], { exact: r.exact.length, total: r.exact.length + r.partial.length }, key);
  }
});

test("BCRP exchange-rate response", () => {
  assert.equal(bcrpDate("23.Set.26"), "2026-09-23");
  const fx = parseBcrp({ periods: [{ name: "22.Set.26", values: ["3.39"] }, { name: "23.Set.26", values: ["3.385"] }, { name: "24.Set.26", values: ["n.d."] }] });
  assert.deepEqual(fx, { penPerUsd: 3.385, date: "2026-09-23", source: "BCRP" });
});

test("women's / men's", () => {
  const f = parseQueryLocal("women's cardigan in size S", FX).filters;
  assert.deepEqual(f.genders, ["women"]);
  assert.deepEqual(f.types, ["cardigan"]);
  assert.deepEqual(parseQueryLocal("alpaca sweater for my husband", FX).filters.genders, ["men"]);
  const base = withDemo(parseQueryLocal("sweater", FX)).filters;
  const w = { ...PRODUCTS[0], gender: "women" as const };
  const u = { ...PRODUCTS[1], id: "u", gender: "unisex" as const };
  const m = { ...PRODUCTS[2], id: "m", gender: "men" as const };
  const r = applyFilters([w, u, m], { ...base, types: [], genders: ["women"] }, "precio_asc");
  assert.deepEqual(r.exact.map((x) => x.product.id).sort(), [w.id, "u"].sort());
});

test("slugs are URL-safe and English", async () => {
  const { slugify } = await import("./slug.ts");
  assert.equal(slugify("Langui Sweater — Gray Incalpaca"), "langui-sweater-gray-incalpaca");
  assert.equal(slugify("100% Alpaca Shawls & Wraps"), "100-percent-alpaca-shawls-and-wraps");
  assert.equal(slugify("Suéter Niño"), "sueter-nino");
});
