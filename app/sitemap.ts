import type { MetadataRoute } from "next";
import { US_PRODUCTS, productPath } from "@/lib/catalog.ts";
import { COLLECTIONS } from "@/lib/seo/collections.ts";
import { US_BRANDS } from "@/lib/seo/brands.ts";
import { GUIDES } from "@/lib/seo/guides.ts";
import { absoluteUrl } from "@/lib/site.ts";

// Solo URLs indexables: colecciones, marcas que envían a EE. UU., guías y fichas de esas tiendas.
export default function sitemap(): MetadataRoute.Sitemap {
  const catalogDate = new Date(US_PRODUCTS[0]?.source.retrievedAt ?? Date.now());
  return [
    { url: absoluteUrl("/"), lastModified: catalogDate, changeFrequency: "daily", priority: 1 },
    ...COLLECTIONS.map((c) => ({
      url: absoluteUrl(`/${c.slug}`),
      lastModified: catalogDate,
      changeFrequency: "daily" as const,
      priority: c.kind === "category" ? 0.9 : c.kind === "grade" || c.kind === "gender" ? 0.8 : 0.7,
    })),
    { url: absoluteUrl("/brands"), lastModified: catalogDate, changeFrequency: "weekly", priority: 0.7 },
    ...US_BRANDS.map((b) => ({ url: absoluteUrl(`/brands/${b.slug}`), lastModified: catalogDate, changeFrequency: "daily" as const, priority: 0.7 })),
    { url: absoluteUrl("/guides"), changeFrequency: "monthly", priority: 0.6 },
    ...GUIDES.map((g) => ({ url: absoluteUrl(`/guides/${g.slug}`), lastModified: new Date(g.updated), changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.4 },
    ...US_PRODUCTS.map((p) => ({
      url: absoluteUrl(productPath(p)),
      lastModified: new Date(p.source.retrievedAt),
      changeFrequency: "daily" as const,
      priority: 0.5,
      images: p.images.slice(0, 1),
    })),
  ];
}
