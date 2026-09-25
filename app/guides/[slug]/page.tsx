import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GUIDES, getGuide } from "@/lib/seo/guides.ts";
import { getCollection } from "@/lib/seo/collections.ts";
import { absoluteUrl, clampDescription, fitTitle, OG_IMAGE, SITE } from "@/lib/site.ts";
import { Breadcrumbs } from "@/components/Breadcrumbs.tsx";
import { JsonLd } from "@/components/JsonLd.tsx";
import { Faq } from "@/components/Faq.tsx";
import { RichText } from "@/components/RichText.tsx";

export const dynamicParams = false;
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const g = getGuide((await params).slug);
  if (!g) return {};
  const title = fitTitle(g.title, g.title.split(":")[0]);
  const description = clampDescription(g.description);
  return {
    title,
    description,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: { title: g.title, description, url: absoluteUrl(`/guides/${g.slug}`), type: "article", modifiedTime: g.updated, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: g.title, description, images: [OG_IMAGE.url] },
  };
}

export default async function GuidePage({ params }: Params) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  const related = g.related.map(getCollection).filter((c) => c != null);
  const date = new Date(`${g.updated}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <article className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }, { name: g.title, path: `/guides/${g.slug}` }]} />
      <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{g.title}</h1>
      <p className="mt-3 text-xs text-piedra">
        By the {SITE.name} team · Updated <time dateTime={g.updated}>{date}</time>
      </p>

      <p className="mt-8 border-l-2 border-ocre/60 pl-4 text-[17px] leading-relaxed text-carbon">{g.summary}</p>

      {g.sections.map((s) => (
        <section key={s.heading} className="mt-12">
          <h2 className="font-serif text-2xl tracking-tight">{s.heading}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="mt-4 text-[15px] leading-relaxed text-carbon/85">
              <RichText text={p} />
            </p>
          ))}
          {s.bullets && (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-carbon/85">
              {s.bullets.map((b, i) => (
                <li key={i}>
                  <RichText text={b} />
                </li>
              ))}
            </ul>
          )}
          {s.table && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                {s.table.caption && <caption className="mb-2 text-left text-xs text-piedra">{s.table.caption}</caption>}
                <thead>
                  <tr className="border-b border-carbon/40">
                    {s.table.head.map((h) => (
                      <th key={h} scope="col" className="py-2 pr-4 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.table.rows.map((r, i) => (
                    <tr key={i} className="border-b border-arena-oscura">
                      {r.map((cell, j) =>
                        j === 0 ? (
                          <th key={j} scope="row" className="py-2 pr-4 font-medium">
                            {cell}
                          </th>
                        ) : (
                          <td key={j} className="py-2 pr-4 text-carbon/85">
                            {cell}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <Faq items={g.faq} />

      {related.length > 0 && (
        <nav aria-label="Shop related collections" className="mt-12">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tierra">Shop the guide</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {related.map((c) => (
              <li key={c!.slug}>
                <Link href={`/${c!.slug}`} className="inline-block rounded-full border border-arena-oscura bg-white px-3 py-1.5 text-xs text-tierra hover:border-tierra/50">
                  {c!.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: g.title,
          description: g.description,
          abstract: g.summary,
          dateModified: g.updated,
          datePublished: g.updated,
          inLanguage: "en-US",
          mainEntityOfPage: absoluteUrl(`/guides/${g.slug}`),
          author: { "@type": "Organization", name: SITE.name, url: SITE.url },
          publisher: { "@type": "Organization", name: SITE.name, url: SITE.url, logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") } },
        }}
      />
    </article>
  );
}
