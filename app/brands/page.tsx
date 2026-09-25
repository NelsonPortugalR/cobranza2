import Link from "next/link";
import type { Metadata } from "next";
import { BRANDS, US_BRANDS } from "@/lib/seo/brands.ts";
import { formatUsd } from "@/lib/format.ts";
import { Breadcrumbs } from "@/components/Breadcrumbs.tsx";
import { Faq } from "@/components/Faq.tsx";

export const metadata: Metadata = {
  title: "Peruvian Alpaca Brands That Ship to the US",
  description:
    "Kuna, Incalpaca, Sol Alpaca, PAKA, Peruvian Connection and more: compare Peru's leading alpaca brands by category, price range and shipping to the US.",
  alternates: { canonical: "/brands" },
};

export default function BrandsPage() {
  const peruOnly = BRANDS.filter((b) => !b.shipsToUS);
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Brands", path: "/brands" }]} />
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Peruvian alpaca brands that ship to the US</h1>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-piedra">
        We compare {US_BRANDS.length} stores selling authentic Peruvian alpaca to US shoppers, from large Arequipa-based makers to
        US-based brands knitting in Peru. Counts and prices update with every catalog refresh; shipping details come from each
        store&rsquo;s published policy.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {US_BRANDS.map((b) => (
          <li key={b.slug} className="rounded-sm border border-arena-oscura bg-white p-5">
            <h2 className="font-serif text-xl">
              <Link href={`/brands/${b.slug}`} className="hover:text-tierra">
                {b.name}
              </Link>
            </h2>
            <p className="mt-1 text-sm text-piedra">
              {b.products.length.toLocaleString("en-US")} pieces · {formatUsd(b.min)}–{formatUsd(b.max)}
            </p>
            <p className="mt-2 text-xs text-piedra">{b.categories.slice(0, 4).map((c) => c.label).join(" · ")}</p>
            <p className="mt-3 text-xs text-tierra">{b.shipping}</p>
          </li>
        ))}
      </ul>

      {peruOnly.length > 0 && (
        <p className="mt-10 max-w-3xl text-sm text-piedra">
          We also track {peruOnly.map((b) => b.name).join(", ")}, which currently ship within Peru only.
        </p>
      )}

      <Faq
        items={[
          {
            q: "What are the best Peruvian alpaca brands?",
            a: `It depends on what you want. Large makers like Kuna and Incalpaca offer wide ranges of baby alpaca; Sol Alpaca focuses on modern knitwear; PAKA and Krimson Klover are US-based brands knitting in Peru. Compare them side by side in our [alpaca sweaters](/alpaca-sweaters) collection.`,
          },
          {
            q: "Which alpaca brands ship from Peru to the US?",
            a: `${US_BRANDS.map((b) => b.name).join(", ")} ship to the US according to their published policies. Some ship from Peru (sometimes with duties included), others from US warehouses.`,
          },
        ]}
      />
    </div>
  );
}
