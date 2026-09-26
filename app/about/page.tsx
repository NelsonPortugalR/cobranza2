import Link from "next/link";
import type { Metadata } from "next";
import { US_BRANDS } from "@/lib/seo/brands.ts";
import { US_PRODUCTS, FX } from "@/lib/catalog.ts";
import { SITE } from "@/lib/site.ts";
import { Breadcrumbs } from "@/components/Breadcrumbs.tsx";
import { JsonLd } from "@/components/JsonLd.tsx";

export const metadata: Metadata = {
  title: "About & How It Works",
  description: `${SITE.name} compares Peruvian alpaca straight from the makers' stores, and every fact is sourced. How we read product data, shipping policies and prices.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "About", path: "/about" }]} />
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">About {SITE.name}</h1>
      <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-carbon/85">
        <p>
          {SITE.name} compares Peruvian alpaca straight from the makers&rsquo; stores, and every fact is sourced. We bring together{" "}
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
          We don&rsquo;t test the garments. We report what each store publishes, quote it, and say when a detail is missing instead
          of guessing. Anything we infer is labeled as inferred.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-carbon">Fiber content.</strong> The percentages as the store lists them. We mark
            when the store gives only part of the composition, names the fibers without percentages, or only says &ldquo;pure
            alpaca&rdquo; (shown as &ldquo;per description&rdquo;). &ldquo;No synthetics&rdquo; means no acrylic or polyester in a
            complete published composition.
          </li>
          <li>
            <strong className="font-medium text-carbon">Grade.</strong> The name the store uses, such as baby, super baby or royal.
            Baby and super baby match Peru&rsquo;s official classes (NTP 231.301:2022); royal and imperial are brand names. We show a
            micron count only when the store states it.
          </li>
          <li>
            <strong className="font-medium text-carbon">Shipping and returns.</strong> Where the package ships from, whether duties
            may be due on delivery, free-shipping thresholds, delivery times and return windows come from each store&rsquo;s
            published policy. We quote it, link it and show the date we checked it.
          </li>
          <li>
            <strong className="font-medium text-carbon">Seals.</strong> If a store calls a piece &ldquo;AIA-certified&rdquo;, we
            quote it. We can&rsquo;t verify what a certification covers.
          </li>
        </ul>
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
