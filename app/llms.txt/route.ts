import { US_PRODUCTS, FX } from "@/lib/catalog.ts";
import { COLLECTIONS, collectionProducts, collectionStats } from "@/lib/seo/collections.ts";
import { US_BRANDS } from "@/lib/seo/brands.ts";
import { GUIDES } from "@/lib/seo/guides.ts";
import { SITE, absoluteUrl } from "@/lib/site.ts";

// /llms.txt (llmstxt.org): resumen del sitio en Markdown para asistentes de IA.
export const dynamic = "force-static";

export function GET() {
  const main = COLLECTIONS.filter((c) => c.kind === "category" || (c.kind === "grade" && !c.parent) || (c.kind === "gender" && !c.parent));
  const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;
  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.name} is an independent comparison site for authentic Peruvian alpaca clothing and accessories. It tracks ${US_PRODUCTS.length.toLocaleString("en-US")} in-stock pieces from ${US_BRANDS.length} stores that ship to the United States (${US_BRANDS.map((b) => b.name).join(", ")}), with fiber content, fiber grade, color, sizes in stock and prices in US dollars. It does not sell anything; every product links to the maker's own store.`,
    "",
    "Key facts:",
    "- Data comes from each store's public product catalog and is refreshed regularly; only in-stock items are listed.",
    `- Prices published in Peruvian soles are converted to USD at the official BCRP exchange rate (latest: S/ ${FX.penPerUsd} per USD${FX.date ? `, ${FX.date}` : ""}).`,
    "- Fiber content and grade are shown as stated by each store; inferred values are labeled as inferred.",
    "- “Baby alpaca” is a fiber grade (about 23 microns or finer under Peru's NTP 231.301 standard), not fiber from baby animals. “Royal alpaca” is a commercial name for the finest grade, typically around 19 microns or less.",
    "",
    "## Collections",
    ...main.map((c) => {
      const s = collectionStats(collectionProducts(c));
      return `- [${c.name}](${absoluteUrl(`/${c.slug}`)}): ${s.count} pieces from ${s.brands.length} brands, ${fmt(s.min)}–${fmt(s.max)} (median ${fmt(s.median)}).`;
    }),
    "",
    "## Guides",
    ...GUIDES.map((g) => `- [${g.title}](${absoluteUrl(`/guides/${g.slug}`)}): ${g.summary}`),
    "",
    "## Brands",
    `- [Peruvian alpaca brands that ship to the US](${absoluteUrl("/brands")})`,
    ...US_BRANDS.map((b) => `- [${b.name}](${absoluteUrl(`/brands/${b.slug}`)}): ${b.products.length} pieces, ${fmt(b.min)}–${fmt(b.max)}. ${b.shipping}.`),
    "",
    "## Optional",
    `- [About and methodology](${absoluteUrl("/about")})`,
    `- [Sitemap](${absoluteUrl("/sitemap.xml")})`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
