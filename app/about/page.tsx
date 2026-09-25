import Link from "next/link";
import type { Metadata } from "next";
import { US_BRANDS } from "@/lib/seo/brands.ts";
import { US_PRODUCTS, FX } from "@/lib/catalog.ts";
import { SITE } from "@/lib/site.ts";
import { Breadcrumbs } from "@/components/Breadcrumbs.tsx";
import { JsonLd } from "@/components/JsonLd.tsx";

export const metadata: Metadata = {
  title: "About & How It Works",
  description: `${SITE.name} compares authentic Peruvian alpaca from the makers' own stores. How we collect product data, convert prices and choose what to show.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "About", path: "/about" }]} />
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">About {SITE.name}</h1>
      <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-carbon/85">
        <p>
          {SITE.name} is an independent comparison site for authentic Peruvian alpaca. We bring together{" "}
          {US_PRODUCTS.length.toLocaleString("en-US")} sweaters, cardigans, scarves and accessories from {US_BRANDS.length} stores
          that ship to the US, so you can compare fiber content, sizes in stock and prices in one place, then buy directly from the
          maker.
        </p>
        <h2 className="pt-4 font-serif text-2xl text-carbon">How we collect product data</h2>
        <p>
          We read each store&rsquo;s public product catalog, following the rules each site publishes for automated access
          (robots.txt), and keep only pieces that are in stock. We never copy checkout or customer data, and we link every product
          to the original store page.
        </p>
        <h2 className="pt-4 font-serif text-2xl text-carbon">What we show, and what we don&rsquo;t</h2>
        <p>
          We show fiber content, grade, color and sizes exactly as each store publishes them. When a store doesn&rsquo;t publish a
          detail, we say so instead of guessing. Where we infer something (for example, “100%” from a description that names a single
          fiber), we label it as inferred.
        </p>
        <h2 className="pt-4 font-serif text-2xl text-carbon">Prices and currency</h2>
        <p>
          Stores that sell in Peruvian soles are converted to US dollars using the official exchange rate published by Peru&rsquo;s
          central bank (BCRP); the latest rate is S/ {FX.penPerUsd} per dollar{FX.date ? ` (${FX.date})` : ""}. The original price is
          always shown for reference, and your card issuer may use a slightly different rate.
        </p>
        <h2 className="pt-4 font-serif text-2xl text-carbon">How we make money</h2>
        <p>
          Right now we don&rsquo;t earn anything from the stores we list and rankings are not paid. If we ever add affiliate links,
          we will disclose it clearly on every page where they appear.
        </p>
        <h2 className="pt-4 font-serif text-2xl text-carbon">For stores</h2>
        <p>
          If you run one of the stores we list and want a correction or to be removed, contact us and we&rsquo;ll act within 48
          hours. See also our <Link href="/terms" className="text-tierra underline underline-offset-2">terms</Link> and{" "}
          <Link href="/privacy" className="text-tierra underline underline-offset-2">privacy policy</Link>.
        </p>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: `About ${SITE.name}`,
          mainEntity: { "@type": "Organization", name: SITE.name, url: SITE.url },
        }}
      />
    </article>
  );
}
