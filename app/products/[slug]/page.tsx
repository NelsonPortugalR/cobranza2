import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { FX, US_PRODUCTS, canonicalPath, getProduct, productPath } from "@/lib/catalog.ts";
import { categoryCollectionFor, collectionsForProduct } from "@/lib/seo/collections.ts";
import { brandPath } from "@/lib/seo/brands.ts";
import { absoluteUrl, clampDescription, fitTitle, OG_IMAGE, SITE } from "@/lib/site.ts";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs.tsx";
import { JsonLd } from "@/components/JsonLd.tsx";
import type { FieldEvidence, Product } from "@/lib/types.ts";
import { AVAILABILITY_LABEL, BREED_LABEL, NTP_CLASSES, QUALITY_LABEL, QUALITY_RANGES, TYPE_LABEL, TYPE_SINGULAR, officialClassFromMicron } from "@/lib/taxonomy.ts";
import { compositionLabel, compositionNote, formatDate, formatPen, formatUsd, gradeWithShare, usdPrice } from "@/lib/format.ts";
import { ProductImage } from "@/components/ProductImage.tsx";
import { ProductCard } from "@/components/ProductCard.tsx";
import aiaMembers from "@/data/aia-members.json";

type Params = { params: Promise<{ slug: string }> };

// Las fichas se generan al primer pedido y se guardan en caché un día (ISR); cada
// despliegue con catálogo nuevo las regenera.
export const revalidate = 86400;
export function generateStaticParams() {
  return [];
}

const fiberWords = (p: Product) =>
  p.fiber.quality === "royal" ? "royal alpaca" : p.fiber.quality === "imperial" ? "imperial alpaca" : p.fiber.quality === "super_baby" ? "super baby alpaca" : p.fiber.quality === "baby" ? "baby alpaca" : "alpaca";

/** Resumen propio en prosa (contenido único por ficha, útil para Google y para respuestas de IA). */
function summary(p: Product): string {
  const price = usdPrice(p);
  const type = TYPE_SINGULAR[p.productType].toLowerCase();
  const parts = [
    `The ${p.title} is a ${fiberWords(p)} ${type} by ${p.seller.name}${p.seller.name !== p.source.site ? `, sold by ${p.source.site}` : ""}.`,
  ];
  const comp = compositionLabel(p);
  if (comp) parts.push(`Fiber content: ${comp}${p.evidence.alpacaPct?.provenance === "inferido" ? " (inferred from the description)" : ""}.`);
  if (p.sizesAvailable?.length && !(p.sizesAvailable.length === 1 && p.sizesAvailable[0] === "Única"))
    parts.push(`In stock in size${p.sizesAvailable.length > 1 ? "s" : ""} ${p.sizesAvailable.map(sizeLabel).join(", ")}.`);
  parts.push(
    `It sells for ${formatUsd(price.now)}${price.was ? `, down from ${formatUsd(price.was)}` : ""}${
      p.price.currency !== "USD" ? ` (${formatPen(p.price.amount)} at the store)` : ""
    }.`,
  );
  if (p.shipping?.toUS) parts.push(`${p.source.site}: ${p.shipping.summary.charAt(0).toLowerCase()}${p.shipping.summary.slice(1)}.`);
  return parts.join(" ");
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = getProduct((await params).slug);
  if (!p) return {};
  const price = usdPrice(p);
  const grade = fiberWords(p).replace(/\b\w/g, (c) => c.toUpperCase());
  // "Langui Sweater — Gray · Baby Alpaca by Incalpaca", acortado si Google lo cortaría.
  const title = fitTitle(`${p.title} · ${grade} by ${p.seller.name}`, `${p.title} by ${p.seller.name}`, `${p.title} · ${p.seller.name}`, p.title);
  const description = clampDescription(`${p.title} by ${p.seller.name}: ${formatUsd(price.now)} · ${[compositionLabel(p), p.sizesAvailable?.length ? `sizes ${p.sizesAvailable.map(sizeLabel).join(", ")} in stock` : null]
    .filter(Boolean)
    .join(" · ")}. Compare this ${fiberWords(p)} ${TYPE_SINGULAR[p.productType].toLowerCase()} with similar pieces from other Peruvian brands that ship to the US.`);
  return {
    title,
    description,
    alternates: { canonical: canonicalPath(p) },
    // Solo se indexan las fichas de tiendas que envían a EE. UU. (público objetivo).
    ...(p.shipping?.toUS ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title: title.absolute,
      description,
      url: absoluteUrl(productPath(p)),
      type: "website",
      images: p.images[0] ? [{ url: p.images[0], alt: p.title }] : [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: title.absolute, description, images: [p.images[0] ?? OG_IMAGE.url] },
  };
}

/** Qué significa el grado declarado según la norma peruana (o que es un nombre comercial). */
function gradeHint(p: Product): string | undefined {
  const g = QUALITY_RANGES.find((q) => q.id === p.fiber.quality);
  if (!g) return undefined;
  const named = p.fiber.gradeName ? `Named by the store as “${p.fiber.gradeName}”. ` : "";
  if (!g.official) return `${named}A brand name for the store's finest fiber, not an official class; its fineness depends on the store.`;
  const c = NTP_CLASSES.find((x) => x.name2022 === g.official);
  return `${named}Equivalent official class: ${g.official}, ${c?.microns} µm (NTP 231.301:2022).`;
}

const AIA = aiaMembers as { checkedOn: string; stores: Record<string, { list: string; url: string }> };

const METHOD_LABEL: Record<Product["source"]["method"], string> = {
  api: "the store's official API",
  feed: "the store's public product feed",
  scrape: "the store's public product page",
  manual: "a manually verified listing",
};

const CONSTRUCTION_LABEL = { tejido_a_mano: "Hand knit", tejido_a_maquina: "Machine knit", telar: "Loom woven" } as const;

const sizeLabel = (s: string) => (s === "Única" ? "One size" : s);

export default async function ProductPage({ params }: Params) {
  const key = (await params).slug;
  const p = getProduct(key);
  if (!p) notFound();
  // URLs antiguas por id → slug definitivo (301).
  if (p.slug && key !== p.slug) permanentRedirect(productPath(p));

  const price = usdPrice(p);
  // Similares: misma categoría y calidad parecida, que envíen a EE. UU., priorizando otras tiendas.
  const similar = US_PRODUCTS.filter((x) => x.id !== p.id && x.productType === p.productType)
    .sort(
      (a, b) =>
        Number(a.source.site === p.source.site) - Number(b.source.site === p.source.site) ||
        Number(a.fiber.quality !== p.fiber.quality) - Number(b.fiber.quality !== p.fiber.quality) ||
        Math.abs(a.price.amountUsd - p.price.amountUsd) - Math.abs(b.price.amountUsd - p.price.amountUsd),
    )
    .slice(0, 4);
  const category = categoryCollectionFor(p.productType);
  const collections = collectionsForProduct(p).filter((c) => c.slug !== category?.slug);
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    ...(category ? [{ name: category.name, path: `/${category.slug}` }] : []),
    { name: p.title, path: productPath(p) },
  ];
  const text = summary(p);

  const rows: { label: string; value: string | null; ev?: FieldEvidence; hint?: string; optional?: boolean }[] = [
    { label: "Fiber content", value: compositionLabel(p), ev: p.evidence.alpacaPct, hint: compositionNote(p) },
    {
      label: "Synthetics",
      value:
        p.fiber.hasSynthetics === true
          ? `Contains ${(p.fiber.families ?? []).filter((f) => f === "acrylic" || f === "polyester").join(" and ")}`
          : p.fiber.hasSynthetics === false
            ? "No acrylic or polyester in the published fiber content"
            : null,
      optional: true,
    },
    {
      label: "Fiber grade",
      value: gradeWithShare(p),
      ev: p.evidence.quality,
      hint: gradeHint(p),
    },
    {
      label: "Fiber diameter",
      value: p.fiber.micron != null ? `${p.fiber.micronKind === "max" ? "≤ " : ""}${p.fiber.micron} µm` : null,
      ev: p.evidence.micron,
      hint:
        p.fiber.micron != null && p.fiber.micronKind === "exact"
          ? `Official class for this diameter: ${officialClassFromMicron(p.fiber.micron)} (NTP 231.301:2022).`
          : undefined,
      optional: true,
    },
    {
      label: "Seal",
      value: p.seal ? `${p.seal.type === "blend" ? "AIA Alpaca Blend Mark" : p.seal.type.startsWith("origin") ? "AIA Alpaca Origin Mark" : "AIA-certified"} (as stated by the store)` : null,
      ev: p.seal ? { provenance: "declarado", confidence: 1, quote: p.seal.quote } : undefined,
      hint: p.seal
        ? "The AIA (International Alpaca Association) is Peru's alpaca industry association. We can't verify what each certification covers."
        : undefined,
      optional: true,
    },
    {
      label: "Store and the AIA",
      // Si la ficha dice "AIA-certified" y la tienda no figura en la lista, lo decimos sin sugerir
      // que la afirmación sea falsa: el sello puede ser del fabricante de la prenda.
      value: AIA.stores[p.source.site]
        ? `${p.source.site} is listed as an AIA member (${AIA.stores[p.source.site].list})`
        : p.seal
          ? `${p.source.site}: not found on AIA's public list as of ${AIA.checkedOn}`
          : null,
      hint: AIA.stores[p.source.site]
        ? `Checked ${AIA.checkedOn} on the AIA's public list. Membership doesn't mean every piece carries a seal.`
        : p.seal
          ? "The seal may belong to the maker of the garment rather than the store."
          : undefined,
      optional: true,
    },
    { label: "Breed", value: p.fiber.breed ? BREED_LABEL[p.fiber.breed] : null, ev: p.evidence.breed, optional: true },
    { label: "Color", value: p.color.name },
    { label: "Construction", value: p.construction ? CONSTRUCTION_LABEL[p.construction] : null, optional: true },
    {
      label: "Sizes",
      value: p.sizes?.length ? p.sizes.map(sizeLabel).join(" · ") : null,
      hint: p.sizesAvailable
        ? p.sizesAvailable.length
          ? `In stock: ${p.sizesAvailable.map(sizeLabel).join(", ")}`
          : "Sold out in every size"
        : "The store doesn't publish stock per size",
    },
  ];
  // Solo mostramos lo que la tienda publica: los campos opcionales sin dato no se listan.
  const visibleRows = rows.filter((r) => r.value != null || !r.optional);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:pb-0">
      <Breadcrumbs items={crumbs} />

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="-mx-4 overflow-hidden bg-arena sm:mx-0 sm:rounded-sm">
            <ProductImage product={p} priority className="aspect-[4/5] w-full" sizes="(max-width: 1024px) 100vw, 55vw" />
          </div>
          <p className="mt-2 text-[11px] text-piedra">
            {p.images.length ? `Photo: ${p.source.site}.` : "Illustration in the product's color."}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tierra">
            <Link href={brandPath(p.source.site)} className="hover:text-carbon">
              {p.source.site}
            </Link>
            {p.seller.name !== p.source.site && ` · ${p.seller.name}`}
          </p>
          <h1 className="mt-3 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">{p.title}</h1>
          {p.titleOriginal && <p className="mt-1 text-xs text-piedra">Listed by the store as &ldquo;{p.titleOriginal}&rdquo;</p>}

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              p.fiber.quality && `${QUALITY_LABEL[p.fiber.quality]} alpaca`,
              compositionLabel(p),
              p.sizesAvailable?.length ? `Sizes: ${p.sizesAvailable.map(sizeLabel).join(" · ")}` : null,
            ]
              .filter(Boolean)
              .map((t) => (
                <span key={t as string} className="rounded-full bg-arena px-3 py-1 text-xs text-tierra">
                  {t}
                </span>
              ))}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-carbon/80">{text}</p>

          <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-serif text-3xl">{formatUsd(price.now)}</span>
            {price.was && <span className="text-sm text-piedra line-through">{formatUsd(price.was)}</span>}
          </div>
          {p.price.currency !== "USD" && (
            <p className="mt-1 text-xs text-piedra">
              Listed at {formatPen(p.price.amount)} by the store, converted at S/ {FX.penPerUsd} per USD. Your card issuer
              may use a slightly different rate.
            </p>
          )}
          <p className="mt-2 text-sm text-piedra">
            <AvailabilityDot status={p.availability.status} /> {AVAILABILITY_LABEL[p.availability.status]} · checked{" "}
            {formatDate(p.availability.checkedAt)}
          </p>
          {p.shipping && (
            <p className="mt-1 text-sm text-piedra">
              {p.shipping.toUS === false ? "Does not ship to the US: " : ""}
              {p.shipping.summary}
              {p.shipping.days && ` · ${p.shipping.days}`}
            </p>
          )}

          <a
            href={p.source.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-6 hidden w-full items-center justify-center gap-2 rounded-full bg-carbon py-3.5 text-sm font-medium text-lana transition hover:bg-tierra lg:flex"
          >
            Shop at {p.source.site} ↗
          </a>

          <section className="mt-10">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tierra">At a glance</h2>
            <dl className="mt-3 divide-y divide-arena-oscura border-y border-arena-oscura">
              {visibleRows.map((r) => (
                <div key={r.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3 text-sm">
                  <dt className="text-piedra">{r.label}</dt>
                  <dd>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={r.value ? "" : "italic text-piedra"}>{r.value ?? "Not listed by the store"}</span>
                      {r.ev && r.value && r.ev.provenance !== "desconocido" && <ProvenanceBadge ev={r.ev} />}
                    </div>
                    {r.hint && <p className="mt-0.5 text-xs text-piedra">{r.hint}</p>}
                    {r.ev?.quote && <p className="mt-1 text-xs italic text-piedra">“{r.ev.quote}”</p>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {p.shipping?.checkedOn && <ShippingSection s={p.shipping} site={p.source.site} />}

          <section className="mt-10">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tierra">
              From the store{p.titleOriginal ? " (in Spanish)" : ""}
            </h2>
            <blockquote className="mt-3 border-l-2 border-ocre/60 pl-4 text-sm leading-relaxed text-carbon/90">
              {p.rawDescription}
            </blockquote>
          </section>

          {p.extraction.warnings.length > 0 && (
            <section className="mt-8 rounded-sm bg-arena p-4">
              <h2 className="text-sm font-medium">Good to know</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-tierra">
                {p.extraction.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-8 text-xs leading-relaxed text-piedra">
            Read from {METHOD_LABEL[p.source.method]} on {formatDate(p.source.retrievedAt)}. Always confirm details on the
            store&rsquo;s page before buying.
          </p>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-20">
          <h2 className="font-serif text-2xl">Compare similar {TYPE_LABEL[p.productType].toLowerCase()}</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {similar.map((s) => (
              <ProductCard key={s.id} product={s} />
            ))}
          </div>
        </section>
      )}

      {(category || collections.length > 0) && (
        <nav aria-label="Browse related collections" className="mt-12">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tierra">Keep browsing</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {[...(category ? [category] : []), ...collections].map((c) => (
              <li key={c.slug}>
                <Link href={`/${c.slug}`} className="inline-block rounded-full border border-arena-oscura bg-white px-3 py-1.5 text-xs text-tierra hover:border-tierra/50">
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href={brandPath(p.source.site)} className="inline-block rounded-full border border-arena-oscura bg-white px-3 py-1.5 text-xs text-tierra hover:border-tierra/50">
                All {p.source.site}
              </Link>
            </li>
          </ul>
        </nav>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.title,
          description: text,
          sku: p.id,
          url: absoluteUrl(productPath(p)),
          image: p.images.slice(0, 3),
          brand: { "@type": "Brand", name: p.seller.name },
          category: `Apparel & Accessories > ${TYPE_LABEL[p.productType]}`,
          color: p.color.name,
          material: compositionLabel(p) ?? "Alpaca",
          ...(p.gender ? { audience: { "@type": "PeopleAudience", suggestedGender: p.gender === "unisex" ? "unisex" : p.gender === "women" ? "female" : "male" } } : {}),
          ...(p.sizesAvailable?.length ? { size: p.sizesAvailable.map(sizeLabel) } : {}),
          countryOfOrigin: p.origin.detail === "Made in Peru" ? { "@type": "Country", name: "Peru" } : undefined,
          offers: {
            "@type": "Offer",
            url: p.source.url,
            price: price.now.toFixed(2),
            priceCurrency: "USD",
            availability:
              p.availability.status === "agotado"
                ? "https://schema.org/OutOfStock"
                : p.availability.status === "pocas_unidades"
                  ? "https://schema.org/LimitedAvailability"
                  : "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@type": "Organization", name: p.source.site },
          },
          isRelatedTo: similar.slice(0, 3).map((x) => ({ "@type": "Product", name: x.title, url: absoluteUrl(productPath(x)) })),
          mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(productPath(p)), isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url } },
        }}
      />

      {/* CTA fija en móvil */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-arena-oscura bg-lana/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="font-serif text-xl leading-none">{formatUsd(price.now)}</p>
            <p className="mt-1 truncate text-[11px] text-piedra">
              {TYPE_SINGULAR[p.productType]} · {AVAILABILITY_LABEL[p.availability.status]}
            </p>
          </div>
          <a
            href={p.source.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="ml-auto shrink-0 rounded-full bg-carbon px-5 py-3 text-sm font-medium text-lana"
          >
            Shop at {p.source.site} ↗
          </a>
        </div>
      </div>
    </div>
  );
}

const FEES_TEXT = {
  none: "No: duties are paid at checkout, or it ships within the US",
  may_apply: "May apply: the store says import duties are not included",
  not_published: "Not published by the store",
} as const;

/** Envío y devoluciones de la política de la tienda, con cita, fuente y fecha. */
function ShippingSection({ s, site }: { s: NonNullable<Product["shipping"]>; site: string }) {
  const ev = s.evidence ?? {};
  const rows: { label: string; value: string | null; hint?: string; e?: { provenance: "stated" | "inferred"; quote: string } }[] = [
    {
      label: "Ships from",
      value: s.shipsFrom === "US" ? "United States" : s.shipsFrom === "Peru" ? "Peru" : null,
      e: ev.shipsFrom,
    },
    {
      label: "Fees on delivery",
      value: FEES_TEXT[s.feesOnDelivery ?? "not_published"],
      hint: "Customs duties or fees a carrier can collect when an international package arrives.",
      e: ev.feesOnDelivery,
    },
    { label: "Free shipping", value: s.freeShippingOverUsd ? `On orders over $${s.freeShippingOverUsd}` : null, e: ev.freeShipping },
    { label: "Delivery to the US", value: s.deliveryDays ? `${s.deliveryDays.min}–${s.deliveryDays.max} business days` : null, e: ev.deliveryDays },
    { label: "Returns", value: s.returnsDays ? `${s.returnsDays} days` : null, e: ev.returns },
  ];
  return (
    <section className="mt-10">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tierra">Shipping &amp; returns</h2>
      <dl className="mt-3 divide-y divide-arena-oscura border-y border-arena-oscura">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3 text-sm">
            <dt className="text-piedra">{r.label}</dt>
            <dd>
              <div className="flex flex-wrap items-center gap-2">
                <span className={r.value ? "" : "italic text-piedra"}>{r.value ?? "Not published by the store"}</span>
                {r.value && r.e && <ProvenanceBadge ev={{ provenance: r.e.provenance === "stated" ? "declarado" : "inferido", confidence: 1 }} />}
              </div>
              {r.hint && <p className="mt-0.5 text-xs text-piedra">{r.hint}</p>}
              {r.value && r.e && <p className="mt-1 text-xs italic text-piedra">“{r.e.quote}”</p>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-piedra">
        From {site}&rsquo;s{" "}
        <a href={s.policyUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">
          shipping policy
        </a>
        {s.returnsUrl && (
          <>
            {" "}and{" "}
            <a href={s.returnsUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">
              returns policy
            </a>
          </>
        )}
        , checked {formatDate(`${s.checkedOn}T12:00:00Z`)}. Policies change: confirm at checkout.
      </p>
    </section>
  );
}

function ProvenanceBadge({ ev }: { ev: FieldEvidence }) {
  const styles = {
    declarado: "bg-musgo/15 text-musgo",
    inferido: "bg-ocre/15 text-ocre",
    desconocido: "bg-arena text-piedra",
  } as const;
  const label = { declarado: "Stated", inferido: "Inferred", desconocido: "Unknown" } as const;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${styles[ev.provenance]}`}>
      {label[ev.provenance]}
    </span>
  );
}

function AvailabilityDot({ status }: { status: Product["availability"]["status"] }) {
  const color = { en_stock: "bg-musgo", pocas_unidades: "bg-ocre", agotado: "bg-red-700", desconocido: "bg-piedra" }[status];
  return <span className={`mr-1 inline-block h-2 w-2 rounded-full ${color}`} />;
}
