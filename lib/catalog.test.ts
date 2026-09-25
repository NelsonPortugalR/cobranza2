import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQueryLocal } from "./parseQuery.ts";
import { applyFilters } from "./filter.ts";
import { PRODUCTS } from "./products.ts";
import { qualityFromMicron } from "./taxonomy.ts";

test("clasifica micras según los rangos NTP", () => {
  assert.equal(qualityFromMicron(17.9), "ultrafina");
  assert.equal(qualityFromMicron(18), "ultrafina");
  assert.equal(qualityFromMicron(19.5), "super_baby");
  assert.equal(qualityFromMicron(22.5), "baby");
  assert.equal(qualityFromMicron(25), "fleece");
});

test("consulta insignia: chompa baby alpaca beige de Puno, lo más fino posible", () => {
  const parsed = parseQueryLocal("chompa baby alpaca beige de Puno, lo más fino posible");
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
  const parsed = parseQueryLocal("manta 100% alpaca");
  const { exact, partial } = applyFilters(PRODUCTS, parsed.filters, parsed.sort);
  assert.equal(exact.length + partial.length, 0);
});

test("precio, raza y tinte", () => {
  const parsed = parseQueryLocal("fibra suri sin teñir hasta 200 soles");
  assert.deepEqual(parsed.filters.breeds, ["suri"]);
  assert.equal(parsed.filters.dye, "natural");
  assert.equal(parsed.filters.priceMax, 200);
  const { exact } = applyFilters(PRODUCTS, parsed.filters, parsed.sort);
  assert.deepEqual(exact.map((m) => m.product.id), ["etsy-suri-roving"]);
});

test("límite de micras explícito", () => {
  const parsed = parseQueryLocal("chompa de menos de 20 micras");
  assert.deepEqual(parsed.filters.qualities, ["ultrafina", "super_baby"]);
});
