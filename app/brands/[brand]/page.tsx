import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BRANDS, getBrand } from "@/lib/seo/brands.ts";
import { categoryCollectionFor } from "@/lib/seo/collections.ts";
import { applyFilters } from "@/lib/filter.ts";
import { formatUsd } from "@/lib/format.ts";
import { absoluteUrl } from "@/lib/site.ts";
import { DEFAULT_FILTERS } from "@/lib/types.ts";
import { ProductCard } from "@/components/ProductCard.tsx";
import { Breadcrumbs } from "@/components/Breadcrumbs.tsx";
import { JsonLd } from "@/components/JsonLd.tsx";

export const dynamicParams = false;
export function generateStaticParams() {
  return BRANDS.map((b) => ({ brand: b.slug }));
}

type Params = { params: Promise<{ brand: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const b = getBrand((await params).brand);
  if (!b) return {};
  const title = `${b.name} Alpaca — ${b.products.length.toLocaleString("en-US")} Pieces Compared`;
  const description = `Shop ${b.name} alpaca ${b.categories
    .slice(0, 3)
    .map((c) => c.label.toLowerCase())
    .join(", ")} from ${formatUsd(b.min)}. Sizes in stock, fiber content and USD prices, compared with other Peruvian brands.`;
  return {
    title,
    description,
    alternates: { canonical: `/brands/${b.slug}` },
    ...(b.shipsToUS ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title, description, url: absoluteUrl(`/brands/${b.slug}`) },
  };
}

export default async function BrandPage({ params }: Params) {
  const b = getBrand((await params).brand);
  if (!b) notFound();
  // Orden: interleave de relevancia; dentro de la marca, mejor ficha primero.
  const products = applyFilters(b.products, { ...DEFAULT_FILTERS, shipsToUS: false }, "relevancia").exact.map((m) => m.product);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Brands", path: "/brands" }, { name: b.name, path: `/brands/${b.slug}` }]} />
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">{b.name} alpaca</h1>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-piedra">
        {b.products.length.toLocaleString("en-US")} {b.name} pieces in stock, from {formatUsd(b.min)} to {formatUsd(b.max)}
        {b.currency === "PEN" ? " (converted from soles at the day's rate)" : ""}. {b.shipsToUS === false ? "This store currently ships within Peru only. " : ""}
        Shipping: {b.shipping}.
      </p>
      <p className="mt-3 text-sm">
        <a href={b.url} target="_blank" rel="noopener noreferrer nofollow" className="text-tierra underline underline-offset-2">
          Visit the {b.name} store ↗
        </a>
      </p>

      <nav aria-label={`${b.name} categories`} className="mt-6 flex flex-wrap gap-2">
        {b.categories.map((c) => {
          const col = categoryCollectionFor(c.type);
          return col ? (
            <Link key={c.type} href={`/${col.slug}`} className="rounded-full border border-arena-oscura bg-white px-3 py-1.5 text-xs text-tierra hover:border-tierra/50">
              {c.label} ({c.count})
            </Link>
          ) : null;
        })}
      </nav>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {products.slice(0, 48).map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 4} />
        ))}
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Brand",
          name: b.name,
          url: b.url,
          sameAs: [b.url],
        }}
      />
    </div>
  );
}
