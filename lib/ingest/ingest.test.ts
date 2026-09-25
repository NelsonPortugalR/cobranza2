import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyColor, extractComposition, inferType, normalizeShopifyProduct, storeImageUrl, type ShopifyProduct } from "./shopify.ts";
import { isAllowed, parseRobots } from "./robots.ts";

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
});

test("color: familia y natural vs teñido", () => {
  assert.deepEqual(classifyColor("koi orange").family, "rojo");
  assert.equal(classifyColor("koi orange").natural, false);
  assert.equal(classifyColor("Natural Beige").natural, true);
  assert.equal(classifyColor("rainy day").family, "gris");
  assert.equal(classifyColor("Oatmeal").natural, null, "beige sin decir 'natural' no se asume sin teñir");
  assert.equal(classifyColor("20753w|C003").family, null);
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
    shipping: { summary: "Envío" },
    retrievedAt: "2026-09-25T00:00:00Z",
  });
  assert.equal(items.length, 2);
  const [gray, brown] = items;
  assert.equal(inferType(base), "chompa", "el título manda aunque product_type sea 'Outlet'");
  assert.equal(gray.fiber.quality, "baby");
  assert.equal(gray.fiber.alpacaPct, 100);
  assert.deepEqual(gray.sizes, ["S", "M"]);
  assert.deepEqual(gray.sizesAvailable, ["S"]);
  assert.equal(gray.price.compareAt, 232);
  assert.equal(gray.price.amountPen, 435);
  assert.equal(brown.color.family, "marron");
  assert.deepEqual(brown.sizesAvailable, ["M"]);
  assert.equal(gray.origin.region, null, "'Made in Peru' no asigna región");
  assert.equal(gray.evidence.origin?.quote, "made in Peru");
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
