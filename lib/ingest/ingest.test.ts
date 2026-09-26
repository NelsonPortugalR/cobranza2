import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyColor, extractComposition, extractMaterialsFromWords, inferType, normalizeShopifyProduct, storeImageUrl, type ShopifyProduct } from "./shopify.ts";
import { isAllowed, parseRobots } from "./robots.ts";
import { englishTitle } from "./translate.ts";

// Casos tomados de descripciones reales de tiendas Shopify de alpaca.

test("composición: formatos reales", () => {
  assert.deepEqual(extractComposition("Made from 100% Baby alpaca fibers").composition, [{ material: "Baby Alpaca", pct: 100 }]);
  assert.deepEqual(extractComposition("is made of 70% baby alpaca fiber and 30% silk.").composition, [
    { material: "Baby Alpaca", pct: 70 },
    { material: "Silk", pct: 30 },
  ]);
  assert.deepEqual(extractComposition("56% Baby Alpaca 42% Nylon 2% Elastano").composition.map((c) => c.pct), [56, 42, 2]);
  assert.deepEqual(extractComposition("Made of 100% Super Baby Alpaca.").composition, [{ material: "Super Baby Alpaca", pct: 100 }]);
  assert.deepEqual(extractComposition("Soft knit mitts in a natural tone.").composition, []);
  assert.deepEqual(
    extractComposition("Crafted of plush baby alpaca (72%), wool (26%) and nylon (2%). Lining: 100% polyester.").composition,
    [
      { material: "Baby Alpaca", pct: 72 },
      { material: "Wool", pct: 26 },
      { material: "Nylon", pct: 2 },
    ],
  );
});

test("color: familia y natural vs teñido", () => {
  assert.deepEqual(classifyColor("koi orange").family, "rojo");
  assert.equal(classifyColor("koi orange").natural, false);
  assert.equal(classifyColor("Natural Beige").natural, true);
  assert.equal(classifyColor("rainy day").family, "gris");
  assert.equal(classifyColor("Oatmeal").natural, null, "beige sin decir 'natural' no se asume sin teñir");
  assert.equal(classifyColor("20753w|C003").family, null);
  assert.equal(classifyColor("Black Oyster").family, "gris");
  assert.equal(classifyColor("Sand Yellow").family, "amarillo");
  assert.equal(classifyColor("Olive Green").family, "verde");
  assert.equal(classifyColor("Blue And Turquoise").family, "azul", "dos tonos de la misma familia no es multicolor");
});

const base: ShopifyProduct = {
  id: 1,
  title: "Links Sweater",
  handle: "links-sweater",
  body_html: "<p>Turtleneck. Made from 100% Baby alpaca fibers. Proudly made in Peru</p>",
  vendor: "Tienda",
  product_type: "Outlet",
  tags: [],
  options: [
    { name: "Size", position: 1, values: ["S", "M"] },
    { name: "Color", position: 2, values: ["rainy day", "brown"] },
  ],
  variants: [
    { id: 11, title: "S / rainy day", price: "116.00", compare_at_price: "232.00", available: true, option1: "S", option2: "rainy day", option3: null },
    { id: 12, title: "M / rainy day", price: "116.00", compare_at_price: "232.00", available: false, option1: "M", option2: "rainy day", option3: null },
    { id: 13, title: "M / brown", price: "120.00", compare_at_price: null, available: true, option1: "M", option2: "brown", option3: null },
  ],
  images: [],
};

test("normaliza un producto Shopify en un ítem por color", () => {
  const items = normalizeShopifyProduct(base, {
    site: "Tienda",
    baseUrl: "https://tienda.example",
    currency: "USD",
    shipping: { summary: "Shipping", toUS: null },
    retrievedAt: "2026-09-25T00:00:00Z",
  });
  assert.equal(items.length, 2);
  const [gray, brown] = items;
  assert.equal(inferType(base), "chompa", "el título manda aunque product_type sea 'Outlet'");
  assert.equal(inferType({ ...base, title: "Suéter Belen De Vicuña Color Negro" }), "chompa");
  assert.equal(inferType({ ...base, title: "Cárdigan Alma De Baby Alpaca" }), "cardigan");
  assert.equal(inferType({ ...base, title: "Chalina Andes De Baby Alpaca" }), "bufanda");
  assert.equal(gray.fiber.quality, "baby");
  assert.equal(gray.fiber.alpacaPct, 100);
  assert.deepEqual(gray.sizes, ["S", "M"]);
  assert.deepEqual(gray.sizesAvailable, ["S"]);
  assert.equal(gray.price.compareAt, 232);
  assert.equal(gray.price.amountUsd, 116);
  assert.equal(brown.color.family, "marron");
  assert.deepEqual(brown.sizesAvailable, ["M"]);
  assert.equal(gray.origin.region, null, "'Made in Peru' no asigna región");
  assert.equal(gray.origin.detail, "Made in Peru");
});

test("robots.txt: gana la regla más larga", () => {
  const rules = parseRobots("User-agent: *\nAllow: /\nDisallow: /*/cart/\nDisallow: /checkout\n", "VellonBot");
  assert.equal(isAllowed(rules, "/products.json"), true);
  assert.equal(isAllowed(rules, "/checkout/123"), false);
  assert.equal(isAllowed(rules, "/es/cart/1"), false);
  assert.equal(isAllowed(parseRobots("User-agent: VellonBot\nDisallow: /\n", "VellonBot"), "/products.json"), false);
});

test("imágenes desde el dominio de la tienda", () => {
  assert.equal(
    storeImageUrl("https://cdn.shopify.com/s/files/1/0489/0142/3260/files/20123-C001_2.jpg?v=1", "https://tienda.example"),
    "https://tienda.example/cdn/shop/files/20123-C001_2.jpg?v=1",
  );
});

test("composición escrita con palabras (Kuna y otras)", () => {
  assert.deepEqual(extractMaterialsFromWords("Suéter elaborado en baby alpaca y seda, ideal para el invierno."), {
    materials: ["Baby alpaca", "Seda"],
    blend: true,
    pure: false,
    quote: "elaborado en baby alpaca y seda",
  });
  assert.equal(extractMaterialsFromWords("Chal confeccionado en baby alpaca. Suave.")?.pure, true);
  assert.equal(extractMaterialsFromWords("Hecho con una mezcla de alpaca y lana")?.blend, true);
  assert.equal(extractMaterialsFromWords("Cartera de cuero"), null);
  assert.equal(extractMaterialsFromWords("Crafted with lightweight Royal Alpaca fiber.")?.pure, false, "marketing en inglés no implica 100%");
  assert.equal(extractMaterialsFromWords("Made from pure baby alpaca.")?.pure, true);
  assert.equal(classifyColor("Guinda").family, "rojo");
  assert.equal(classifyColor("Celeste").family, "azul");
  assert.equal(classifyColor("Rosado").family, "rosa");
});

test("formatos mixtos, colores en el título y tipos en español", () => {
  assert.deepEqual(extractComposition("Made with 30% silk. Composition: baby alpaca 70%.").composition, [
    { material: "Silk", pct: 30 },
    { material: "Baby Alpaca", pct: 70 },
  ]);
  assert.equal(classifyColor("Naranja Jaspeado").family, "rojo");
  for (const [title, type] of [["Saco Lid Arena", "cardigan"], ["Sacón Largo", "abrigo"], ["Troyer Andes", "chompa"], ["CHAL LUNA", "chal"], ["Ovillo Baby Alpaca", "fibra"], ["Cuellera Tejida", "bufanda"]] as const) {
    assert.equal(inferType({ ...base, title }), type, title);
  }
});

test("Spanish store titles become English", () => {
  assert.equal(englishTitle("Suéter Clark De Baby Alpaca Color Celeste"), "Clark Baby Alpaca Sweater — Light Blue");
  assert.equal(englishTitle("CASACA BOLSENA | VERDE"), "Bolsena Jacket — Green");
  assert.equal(englishTitle("Chompa Scarlet Azul Marino"), "Scarlet Sweater — Navy");
  assert.equal(englishTitle("Bufanda Gris Claro"), "Scarf — Light Gray");
  assert.equal(englishTitle("Chalina Parbat | Camel"), "Parbat Scarf — Camel");
  assert.equal(englishTitle("Estola Jee De Royal Alpaca Color Rojo"), "Jee Royal Alpaca Wrap — Red");
  assert.equal(englishTitle("Links Sweater - Rainy Day"), null, "English titles are left alone");
});

// --- Composición normalizada (fixtures reales del catálogo) ---------------------------
import { compositionFacts } from "./shopify.ts";
import { alpacaRangeVerdict, fiberFamily, noSyntheticsVerdict } from "../fiber.ts";

function facts(text: string) {
  const { composition } = extractComposition(text);
  const words = composition.length ? null : extractMaterialsFromWords(text);
  const alpacaPct = composition.length
    ? composition.filter((c) => /alpaca|suri/i.test(c.material)).reduce((a, c) => a + c.pct, 0)
    : words?.pure
      ? 100
      : null;
  return { composition, alpacaPct, ...compositionFacts(composition, words) };
}

test("composición: 37% baby alpaca con acrílico y nylon", () => {
  const f = facts("37% baby alpaca, 28% acrylic, 35% nylon");
  assert.equal(f.alpacaPct, 37);
  assert.equal(f.hasSynthetics, true);
  assert.equal(f.compositionStatus, "stated");
});

test("composición: materiales sin porcentajes (Krimson Klover)", () => {
  const f = facts("Crafted from an alpaca-merino blend that's relaxed. A luxurious blend of alpaca, merino wool, and more.");
  assert.equal(f.compositionStatus, "stated_no_pct");
  assert.equal(f.alpacaPct, null);
  assert.equal(f.hasSynthetics, null);
});

test("composición: solo 65% royal alpaca publicado (PAKA) = partial", () => {
  const f = facts("Our best-selling crewneck sweater is powered by 65% Royal Alpaca - a natural fiber known for warmth.");
  assert.equal(f.compositionStatus, "partial");
  assert.equal(f.alpacaPct, 65);
  assert.equal(f.hasSynthetics, null, "no sabemos qué es el 35% restante");
});

test("composición: 100% AIA-certified Baby Alpaca (Etno Alpaca) es declarado", () => {
  const f = facts("Material: 100% AIA-certified Baby Alpaca\nFineness: does not exceed 23 microns");
  assert.deepEqual(f.composition, [{ material: "Baby Alpaca", pct: 100 }]);
  assert.equal(f.compositionStatus, "stated");
  assert.equal(f.hasSynthetics, false);
});

test("composición: dralon (microfibra acrílica) sin porcentajes", () => {
  const f = facts("Made with alpaca fiber and dralon yarn (acrylic microfiber).");
  assert.equal(f.compositionStatus, "stated_no_pct");
  assert.equal(f.hasSynthetics, true);
  assert.equal(fiberFamily("Dralon"), "acrylic");
  assert.equal(fiberFamily("Polyamide"), "nylon");
  assert.equal(fiberFamily("Elastano"), "elastane");
});

test("composición: suri baby alpaca y errata 'eslastane'", () => {
  const coat = facts("an exquisite blend of materials including 51% Suri baby alpaca, 26% merino wool, 14% baby alpaca, 6% mohair, 2% nylon, and 1% spandex");
  assert.equal(coat.alpacaPct, 65);
  assert.equal(coat.compositionStatus, "stated");
  const socks = facts("Made from 58% baby alpaca, 40% nylon, and 2% eslastane.");
  assert.equal(socks.compositionStatus, "stated");
  assert.deepEqual(socks.composition.at(-1), { material: "Elastane", pct: 2 });
});

test("composición: porcentajes que suman más de 100 se conservan como 'inconsistent'", () => {
  const f = facts("Composition: 67% Baby Alpaca, 40% Wool");
  assert.equal(f.compositionStatus, "inconsistent");
  assert.equal(f.alpacaPct, 67);
});

test("filtro de % de alpaca: declarado vs inferido", () => {
  const base = { fiber: { alpacaPct: 100, composition: [], compositionStatus: "inferred", hasSynthetics: null } } as never;
  assert.equal(alpacaRangeVerdict(base, "100"), "unknown", "100% deducido de una frase queda por confirmar");
  assert.equal(alpacaRangeVerdict(base, "unpublished"), "pass");
  const stated = { fiber: { alpacaPct: 100, composition: [{ material: "Baby Alpaca", pct: 100 }], compositionStatus: "stated", hasSynthetics: false } } as never;
  assert.equal(alpacaRangeVerdict(stated, "100"), "pass");
  assert.equal(noSyntheticsVerdict(stated), "pass");
});

test("micras: solo cuando la tienda las afirma de la pieza", async () => {
  const { extractMicron } = await import("./shopify.ts");
  assert.deepEqual(extractMicron("Material: 100% Royal Alpaca\nFineness: Under 19 microns"), { micron: 19, kind: "max", quote: "Fineness: Under 19 microns" });
  assert.equal(extractMicron("the fiber does not exceed 23 microns. That translates")?.micron, 23);
  assert.equal(extractMicron("meticulously dehaired, and measuring an extraordinarily fine 17 microns in diameter")?.kind, "exact");
  assert.equal(extractMicron("a grade separated by fineness when the fleece is sorted, up to 23 microns according to the AIA"), null);
  assert.equal(extractMicron("ordinary wool usually runs from 27 to 45 microns"), null);
});

test("envío: la política de la tienda se hereda y Kuna USA cambia con la etiqueta express", async () => {
  const { shippingFromPolicy } = await import("../policies.ts");
  const { readFileSync } = await import("node:fs");
  const policies = JSON.parse(readFileSync(new URL("../../data/policies.json", import.meta.url), "utf8")).stores;
  const express = shippingFromPolicy(policies["Kuna USA"], ["express_shipping", "BLUSAS"]);
  assert.equal(express.shipsFrom, "US");
  assert.deepEqual(express.deliveryDays, { min: 2, max: 5 });
  assert.equal(express.feesOnDelivery, "none");
  const standard = shippingFromPolicy(policies["Kuna USA"], []);
  assert.equal(standard.shipsFrom, "not_published", "el almacén principal no dice dónde está");
  assert.equal(shippingFromPolicy(policies["Etno Alpaca"]).feesOnDelivery, "may_apply");
  assert.equal(shippingFromPolicy(policies["Sol Alpaca"]).feesOnDelivery, "none");
  assert.equal(shippingFromPolicy(policies["Qinti"]).shipsFrom, "not_published");
});

test("sello AIA: solo lo que la ficha declara, con su tipo si lo dice", async () => {
  const { extractSeal } = await import("./shopify.ts");
  assert.equal(extractSeal("Material: 100% AIA-certified Baby Alpaca")?.type, "unspecified");
  assert.equal(extractSeal("This piece carries the Alpaca Blend Mark.")?.type, "blend");
  assert.equal(extractSeal("Awarded the gold Alpaca Origin Mark")?.type, "origin_gold");
  assert.equal(extractSeal("Soft baby alpaca, made in Peru."), null);
});

test("devoluciones: cada tienda tiene todos los campos, con cita, 'conflicting' o 'not_published'", async () => {
  const { readFileSync } = await import("node:fs");
  const stores = JSON.parse(readFileSync(new URL("../../data/policies.json", import.meta.url), "utf8")).stores;
  const fields = ["window", "refundType", "returnShippingPaidBy", "returnTo", "saleFinal", "refundsOriginalShipping", "refundsDuties"];
  for (const [name, s] of Object.entries(stores) as [string, { returnsDetail?: Record<string, unknown> }][]) {
    const r = s.returnsDetail;
    assert.ok(r, `${name}: sin returnsDetail`);
    assert.match(String(r.policyUrl), /^https:\/\//, name);
    assert.match(String(r.checkedOn), /^\d{4}-\d{2}-\d{2}$/, name);
    for (const k of fields) {
      const v = r[k] as unknown;
      if (v === "not_published") continue;
      const o = v as { value: unknown; quote?: string; quotes?: string[] };
      if (o.value === "conflicting") assert.ok((o.quotes?.length ?? 0) >= 2, `${name}.${k}`);
      else assert.ok(o.quote && o.quote.length > 10, `${name}.${k} sin cita`);
    }
  }
});
