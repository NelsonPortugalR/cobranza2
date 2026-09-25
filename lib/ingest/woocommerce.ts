import type { Product } from "../types.ts";
import { colorWordsAtEnd as colorFromName, normalizeShopifyProduct, type ShopifyProduct, type ShopifySource } from "./shopify.ts";

// Tiendas WooCommerce: API pública "Store API" (/wp-json/wc/store/v1/products).
// Convertimos cada producto al formato de Shopify y reutilizamos el mismo normalizador.

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  description: string;
  short_description: string;
  prices: { price: string; regular_price: string; sale_price: string; currency_code: string; currency_minor_unit: number };
  is_in_stock: boolean;
  attributes: { name: string; has_variations: boolean; terms: { name: string; slug: string }[] }[];
  variations: { id: number; attributes: { name: string; value: string }[] }[];
  categories: { name: string }[];
  tags?: { name: string }[];
  images: { src: string }[];
}

export function wooToShopify(w: WooProduct): ShopifyProduct {
  const unit = 10 ** (w.prices.currency_minor_unit ?? 2);
  const price = (+w.prices.price / unit).toFixed(2);
  const regular = +w.prices.regular_price / unit;
  const compare = regular > +price ? regular.toFixed(2) : null;
  const sizeAttr = w.attributes.find((a) => /talla|size/i.test(a.name));
  const colorAttr = w.attributes.find((a) => /colou?r/i.test(a.name));
  const sizes = sizeAttr?.terms.map((t) => t.name) ?? ["Única"];
  const colors = colorAttr?.terms.map((t) => t.name) ?? [colorFromName(w.name) ?? "Único"];
  const options = [
    { name: "Talla", position: 1, values: sizes },
    { name: "Color", position: 2, values: colors },
  ];
  let id = w.id * 1000;
  const variants = colors.flatMap((c) =>
    sizes.map((sz) => ({
      id: id++,
      title: `${sz} / ${c}`,
      price,
      compare_at_price: compare,
      available: w.is_in_stock,
      option1: sz,
      option2: c,
      option3: null,
    })),
  );
  return {
    id: w.id,
    title: w.name,
    handle: w.slug,
    body_html: `${w.short_description}\n${w.description}`,
    vendor: "",
    product_type: w.categories.map((c) => c.name).join(" "),
    tags: (w.tags ?? []).map((t) => t.name),
    options,
    variants,
    images: w.images.map((i) => ({ src: i.src, variant_ids: [] })),
  };
}

export function normalizeWooProduct(w: WooProduct, src: ShopifySource): Product[] {
  return normalizeShopifyProduct(wooToShopify(w), src).map((p) => ({
    ...p,
    source: { ...p.source, url: w.permalink },
    // La Store API no informa stock por talla: solo si el producto tiene stock.
    sizesAvailable: undefined,
    availability: { ...p.availability, status: w.is_in_stock ? "en_stock" : "agotado" },
  }));
}
