import Link from "next/link";
import type { Metadata } from "next";
import { GUIDES } from "@/lib/seo/guides.ts";
import { Breadcrumbs } from "@/components/Breadcrumbs.tsx";

export const metadata: Metadata = {
  title: "Alpaca Buying Guides: Grades, Care and Comparisons",
  description: "Plain-English guides to Peruvian alpaca: what baby and royal alpaca mean, alpaca vs. cashmere, how to wash alpaca and how to read a label.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }]} />
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Alpaca guides</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-piedra">
        Everything you need to know before buying Peruvian alpaca, without the marketing.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <li key={g.slug} className="rounded-sm border border-arena-oscura bg-white p-6">
            <h2 className="font-serif text-xl leading-snug">
              <Link href={`/guides/${g.slug}`} className="hover:text-tierra">
                {g.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-piedra">{g.description}</p>
          </li>
        ))}
        <li className="rounded-sm border border-arena-oscura bg-white p-6">
          <h2 className="font-serif text-xl leading-snug">
            <Link href="/brands" className="hover:text-tierra">
              Peruvian Alpaca Brands That Ship to the US
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-piedra">Every store we compare, with price ranges and shipping policies.</p>
        </li>
      </ul>
    </div>
  );
}
