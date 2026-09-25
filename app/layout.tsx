import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { SITE, absoluteUrl } from "@/lib/site.ts";
import { CATEGORY_COLLECTIONS, getCollection } from "@/lib/seo/collections.ts";
import { US_BRANDS } from "@/lib/seo/brands.ts";
import { GUIDES } from "@/lib/seo/guides.ts";
import { JsonLd } from "@/components/JsonLd.tsx";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `Peruvian Alpaca Sweaters, Cardigans & Scarves — ${SITE.name}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  // Fase privada: nada se indexa hasta activar SITE_INDEXABLE=true.
  robots: SITE.indexable
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } }
    : { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE.url,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: { card: "summary_large_image", title: `${SITE.name} — ${SITE.tagline}`, description: SITE.description },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
  category: "shopping",
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
};

const NAV = ["alpaca-sweaters", "alpaca-cardigans", "alpaca-scarves", "alpaca-accessories"]
  .map(getCollection)
  .filter((c) => c != null);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap"
        />
        <link rel="alternate" type="text/plain" title="LLM summary" href="/llms.txt" />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
          Skip to content
        </a>
        <div className="bg-carbon px-4 py-1.5 text-center text-[11px] tracking-wide text-arena">
          Prices in USD · ships to the US · you buy directly from each maker
        </div>
        <header className="border-b border-arena-oscura/70">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" className="shrink-0 font-serif text-xl tracking-tight">
              {SITE.name}
            </Link>
            <nav aria-label="Main" className="no-scrollbar flex items-center gap-5 overflow-x-auto text-sm text-piedra">
              {NAV.map((c) => (
                <Link key={c!.slug} href={`/${c!.slug}`} className="hidden shrink-0 hover:text-carbon md:inline">
                  {c!.name.replace("Alpaca ", "")}
                </Link>
              ))}
              <Link href="/brands" className="shrink-0 hover:text-carbon">
                Brands
              </Link>
              <Link href="/guides" className="shrink-0 hover:text-carbon">
                Guides
              </Link>
            </nav>
          </div>
        </header>
        <div id="main">{children}</div>
        <footer className="mt-24 border-t border-arena-oscura/70">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 text-sm sm:px-6 md:grid-cols-4">
            <div>
              <p className="font-serif text-lg text-carbon">{SITE.name}</p>
              <p className="mt-2 text-xs leading-relaxed text-piedra">
                An independent comparison site for authentic Peruvian alpaca. We don&rsquo;t sell anything: every product links to
                the maker&rsquo;s own store. Prices in soles are converted to USD at the day&rsquo;s official rate.
              </p>
            </div>
            <FooterList title="Shop" links={CATEGORY_COLLECTIONS.slice(0, 8).map((c) => ({ href: `/${c.slug}`, label: c.name }))} />
            <FooterList title="Brands" links={US_BRANDS.slice(0, 8).map((b) => ({ href: `/brands/${b.slug}`, label: b.name }))} />
            <FooterList
              title="Learn"
              links={[
                ...GUIDES.map((g) => ({ href: `/guides/${g.slug}`, label: g.title.split(":")[0] })),
                { href: "/about", label: "About & how it works" },
                { href: "/terms", label: "Terms" },
                { href: "/privacy", label: "Privacy" },
              ]}
            />
          </div>
        </footer>
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": `${SITE.url}/#organization`,
              name: SITE.name,
              url: SITE.url,
              logo: absoluteUrl("/icon.svg"),
              description: SITE.description,
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${SITE.url}/#website`,
              name: SITE.name,
              url: SITE.url,
              inLanguage: "en-US",
              publisher: { "@id": `${SITE.url}/#organization` },
              potentialAction: {
                "@type": "SearchAction",
                target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/?q={search_term_string}` },
                "query-input": "required name=search_term_string",
              },
            },
          ]}
        />
      </body>
    </html>
  );
}

function FooterList({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tierra">{title}</p>
      <ul className="mt-3 space-y-2 text-xs text-piedra">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:text-carbon">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
