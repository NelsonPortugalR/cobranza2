import { Catalog } from "@/components/Catalog.tsx";
import { ALL_PRODUCTS, FX, SOURCES, US_SOURCES } from "@/lib/catalog.ts";
import { stripNonComparable } from "@/lib/comparable.ts";
import { formatDate } from "@/lib/format.ts";
import { parseQueryLocal } from "@/lib/parseQuery.ts";
import { search } from "@/lib/search.ts";
import { DEFAULT_FILTERS } from "@/lib/types.ts";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.slice(0, 500) : "";
  // Primera pintada con la interpretación local; el cliente luego la refina.
  const parsed = query ? parseQueryLocal(query, FX) : null;
  const initialResults = parsed
    ? search(stripNonComparable(parsed.filters).filters, parsed.sort)
    : search(DEFAULT_FILTERS, "relevancia");
  const usCount = ALL_PRODUCTS.filter((p) => p.shipping?.toUS).length;
  return (
    <>
      <Catalog
        initialQuery={query}
        initialResults={initialResults}
        realCount={usCount}
        sources={SOURCES}
        usStoreCount={US_SOURCES.length}
        fx={FX}
      />
      <HowItWorks />
      <StoresSection />
    </>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "We read the makers’ own catalogs",
      body: "Kuna, Incalpaca, Sol Alpaca, PAKA, Peruvian Connection and more. Only public product data, following each store’s rules for automated reading.",
    },
    {
      n: "02",
      title: "We turn product pages into facts",
      body: "“70% baby alpaca, 30% silk”, “koi orange”, “XS / rainy day” become fiber content, grade, color and sizes in stock you can filter and compare.",
    },
    {
      n: "03",
      title: "You buy from the store",
      body: "Prices are shown in USD (soles converted at the day’s rate) and every product links to the original store, which handles payment and shipping.",
    },
  ];
  return (
    <section id="como-funciona" className="mx-auto mt-24 max-w-7xl scroll-mt-6 px-4 sm:px-6">
      <h2 className="font-serif text-3xl tracking-tight">How it works</h2>
      <div className="mt-8 grid gap-8 sm:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="border-t border-carbon pt-4">
            <p className="font-serif text-sm text-ocre">{s.n}</p>
            <h3 className="mt-2 text-base font-medium">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-piedra">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StoresSection() {
  const stores = US_SOURCES.map((site) => {
    const items = ALL_PRODUCTS.filter((p) => p.source.site === site);
    return { site, count: items.length, shipping: items[0]?.shipping?.summary ?? "" };
  }).sort((a, b) => b.count - a.count);
  return (
    <section id="tiendas" className="mx-auto mt-24 max-w-7xl scroll-mt-6 px-4 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tierra">The stores</p>
          <h2 className="mt-2 font-serif text-3xl tracking-tight">Makers that ship to the US</h2>
          <p className="mt-4 text-sm leading-relaxed text-piedra">
            Catalogs refreshed on {formatDate(ALL_PRODUCTS[0]?.source.retrievedAt ?? new Date().toISOString())}. Prices
            published in soles are converted at S/ {FX.penPerUsd} per US dollar
            {FX.source === "BCRP" || FX.source === "open.er-api.com"
              ? ` (${FX.source}, ${FX.date})`
              : " (reference rate; live rate pending)"}
            .
          </p>
        </div>
        <ul className="divide-y divide-arena-oscura border-y border-arena-oscura">
          {stores.map((s) => (
            <li key={s.site} className="grid grid-cols-[minmax(0,10rem)_4rem_1fr] items-baseline gap-4 py-3 text-sm">
              <span className="font-medium text-carbon">{s.site}</span>
              <span className="tabular-nums text-piedra">{s.count.toLocaleString("en-US")}</span>
              <span className="text-xs text-piedra">{s.shipping}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
