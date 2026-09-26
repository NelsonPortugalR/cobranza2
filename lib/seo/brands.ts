// Páginas por tienda/marca (/brands/<slug>): resumen con datos del catálogo, sin afirmaciones
// que no podamos verificar.

import { ALL_PRODUCTS } from "../catalog.ts";
import { slugify } from "../slug.ts";
import { TYPE_LABEL } from "../taxonomy.ts";
import type { Product, ProductType } from "../types.ts";

export interface Brand {
  slug: string;
  name: string;
  shipsToUS: boolean | null;
  shipping: string;
  products: Product[];
  categories: { type: ProductType; label: string; count: number }[];
  min: number;
  max: number;
  currency: "USD" | "PEN";
  url: string;
}

function build(): Brand[] {
  const bySite = new Map<string, Product[]>();
  for (const p of ALL_PRODUCTS) bySite.set(p.source.site, [...(bySite.get(p.source.site) ?? []), p]);
  return [...bySite].map(([name, products]) => {
    const counts = new Map<ProductType, number>();
    for (const p of products) counts.set(p.productType, (counts.get(p.productType) ?? 0) + 1);
    const prices = products.map((p) => p.price.amountUsd).sort((a, b) => a - b);
    const home = new URL(products[0].source.url);
    return {
      slug: slugify(name),
      name,
      shipsToUS: products[0].shipping?.toUS ?? null,
      shipping: products[0].shipping?.summary ?? "",
      products,
      categories: [...counts]
        .filter(([t]) => t !== "otro")
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, label: TYPE_LABEL[type], count })),
      min: Math.floor(prices[0] ?? 0),
      max: Math.ceil(prices.at(-1) ?? 0),
      currency: products[0].price.currency,
      url: `${home.protocol}//${home.host}`,
    };
  }).sort((a, b) => b.products.length - a.products.length);
}

export const BRANDS = build();
export const US_BRANDS = BRANDS.filter((b) => b.shipsToUS);
export const getBrand = (slug: string) => BRANDS.find((b) => b.slug === slug);
export const brandPath = (siteName: string) => `/brands/${slugify(siteName)}`;
