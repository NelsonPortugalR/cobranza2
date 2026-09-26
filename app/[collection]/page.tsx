import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { COLLECTIONS, collectionProducts, collectionStats, getCollection, relatedCollections } from "@/lib/seo/collections.ts";
import { brandPath } from "@/lib/seo/brands.ts";
import { absoluteUrl, clampDescription, fitTitle, OG_IMAGE, SITE } from "@/lib/site.ts";
import { formatUsd } from "@/lib/format.ts";
import { ProductCard } from "@/components/ProductCard.tsx";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs.tsx";
import { JsonLd } from "@/components/JsonLd.tsx";
import { Faq } from "@/components/Faq.tsx";

// Una página estática por colección, generada en cada despliegue con los datos del catálogo.
export const dynamicParams = false;
export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ collection: c.slug }));
}

type Params = { params: Promise<{ collection: string }> };
const SHOWN = 48;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = getCollection((await params).collection);
  if (!c) return {};
  const s = collectionStats(collectionProducts(c));
  const n = s.count.toLocaleString("en-US");
  // El título más completo que Google muestre entero (~60 caracteres).
  const title = fitTitle(`${c.name}: ${n} Styles from ${s.brands.length} Brands`, `${c.name}: ${n} Styles`, `${c.name} Compared`, c.name);
  const description = clampDescription(
    `Shop ${n} ${c.phrase} from ${s.brands.slice(0, 2).join(", ")}${s.brands.length > 2 ? " and more" : ""}, ${formatUsd(s.min)}–${formatUsd(
      s.max,
    )}. Sizes in stock, fiber content and US shipping compared.`,
  );
  return {
    title,
    description,
    alternates: { canonical: `/${c.slug}` },
    openGraph: { title: title.absolute, description, url: absoluteUrl(`/${c.slug}`), type: "website", images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: title.absolute, description, images: [OG_IMAGE.url] },
  };
}

export default async function CollectionPage({ params }: Params) {
  const c = getCollection((await params).collection);
  if (!c) notFound();

  const products = collectionProducts(c);
  const s = collectionStats(products);
  const parent = c.parent ? getCollection(c.parent) : undefined;
  const crumbs: Crumb[] = [{ name: "Home", path: "/" }, ...(parent ? [{ name: parent.name, path: `/${parent.slug}` }] : []), { name: c.name, path: `/${c.slug}` }];
  const related = relatedCollections(c);
  const stores = [...new Set(products.map((p) => p.source.site))];
  const brandList = s.brands.slice(0, 6).join(", ") + (s.brands.length > 6 ? ` and ${s.brands.length - 6} more` : "");

  const faq = [
    {
      q: `How much do ${c.phrase} cost?`,
      a: `Across the ${s.count.toLocaleString("en-US")} ${c.phrase} we track that ship to the US, prices range from ${formatUsd(s.min)} to ${formatUsd(
        s.max,
      )}, with a median of ${formatUsd(s.median)}. Prices in soles are converted to US dollars at the day's official exchange rate.`,
    },
    {
      q: `Which brands sell ${c.phrase} that ship to the US?`,
      a: `${brandList}. Every product links to the maker's own store, where you complete the purchase.`,
    },
    {
      q: `How do you choose which ${c.phrase} to show?`,
      a: `We read each store's public catalog, keep only pieces that are in stock and ship to the US, and list the fiber content, grade, color and sizes exactly as the store publishes them. We don't sell anything ourselves. See [how it works](/about).`,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <Breadcrumbs items={crumbs} />

      <header className="max-w-3xl">
        <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{c.name}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-piedra">
          Compare {s.count.toLocaleString("en-US")} {c.phrase} from {s.brands.length} Peruvian{" "}
          {s.brands.length === 1 ? "brand" : "brands"} that ship to the US, from {formatUsd(s.min)} to {formatUsd(s.max)}. {c.blurb}
        </p>
      </header>

      <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 border-y border-arena-oscura py-4 text-sm sm:grid-cols-4">
        <Stat label="Pieces in stock" value={s.count.toLocaleString("en-US")} />
        <Stat label="Brands" value={String(s.brands.length)} />
        <Stat label="Price range" value={`${formatUsd(s.min)}–${formatUsd(s.max)}`} />
        <Stat label="Median price" value={formatUsd(s.median)} />
      </dl>

      {related.length > 0 && (
        <nav aria-label="Related collections" className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {related.map((r) => (
            <Link
              key={r.slug}
              href={`/${r.slug}`}
              className="shrink-0 rounded-full border border-arena-oscura bg-white px-3 py-1.5 text-xs text-tierra transition hover:border-tierra/50"
            >
              {r.name}
            </Link>
          ))}
        </nav>
      )}

      <section aria-label={c.name} className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {products.slice(0, SHOWN).map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 4} />
        ))}
      </section>

      {products.length > SHOWN && (
        <div className="mt-10 text-center">
          <Link
            href={`/?q=${encodeURIComponent(c.phrase)}`}
            className="inline-block rounded-full border border-carbon px-6 py-3 text-sm font-medium transition hover:bg-carbon hover:text-lana"
          >
            Filter all {s.count.toLocaleString("en-US")} by size, color and price
          </Link>
        </div>
      )}

      <section className="mt-16">
        <h2 className="font-serif text-2xl tracking-tight">Stores in this collection</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {stores.map((b) => (
            <li key={b}>
              <Link href={brandPath(b)} className="inline-block rounded-sm border border-arena-oscura px-3 py-2 text-sm hover:border-tierra/50">
                {b}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Faq items={faq} />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: c.name,
          url: absoluteUrl(`/${c.slug}`),
          isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: s.count,
            itemListElement: products.slice(0, 24).map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: absoluteUrl(`/products/${p.slug}`),
              name: p.title,
            })),
          },
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-piedra">{label}</dt>
      <dd className="mt-1 font-serif text-xl text-carbon">{value}</dd>
    </div>
  );
}
