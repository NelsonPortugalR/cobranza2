import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ALL_PRODUCTS, getProduct } from "@/lib/catalog.ts";
import type { FieldEvidence, Product } from "@/lib/types.ts";
import { AVAILABILITY_LABEL, BREED_LABEL, QUALITY_LABEL, REGION_LABEL, TYPE_LABEL, micronRangeLabel } from "@/lib/taxonomy.ts";
import { compositionLabel, finenessLabel, formatDate, formatPen, formatUsd } from "@/lib/format.ts";
import { ProductImage } from "@/components/ProductImage.tsx";
import { ProductCard } from "@/components/ProductCard.tsx";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = getProduct((await params).id);
  return { title: p ? `${p.title} — Vellón` : "Producto — Vellón" };
}

const METHOD_LABEL: Record<Product["source"]["method"], string> = {
  api: "API oficial del sitio",
  feed: "Feed de productos",
  scrape: "Lectura de la página pública",
  manual: "Carga manual verificada",
};

const CONSTRUCTION_LABEL = { tejido_a_mano: "Tejido a mano", tejido_a_maquina: "Tejido a máquina", telar: "Telar" } as const;

export default async function ProductPage({ params }: Params) {
  const p = getProduct((await params).id);
  if (!p) notFound();

  // Similares: mismo tipo, priorizando otras tiendas y datos reales.
  const similar = ALL_PRODUCTS.filter((x) => x.id !== p.id && x.productType === p.productType && x.demo === p.demo)
    .sort((a, b) => Number(a.source.site === p.source.site) - Number(b.source.site === p.source.site))
    .slice(0, 3);
  const rows: { label: string; value: string | null; ev?: FieldEvidence; hint?: string }[] = [
    {
      label: "Calidad (NTP 231.301)",
      value: p.fiber.quality ? QUALITY_LABEL[p.fiber.quality] : null,
      ev: p.evidence.quality,
      hint:
        p.fiber.quality && p.fiber.micron == null
          ? `Rango de la norma: ${micronRangeLabel(p.fiber.quality)}. La tienda no informa una medición.`
          : undefined,
    },
    { label: "Micronaje", value: p.fiber.micron != null ? `${p.fiber.micron} µm` : null, ev: p.evidence.micron },
    { label: "Raza", value: p.fiber.breed ? BREED_LABEL[p.fiber.breed] : null, ev: p.evidence.breed },
    {
      label: "Color",
      value: `${p.color.name}${p.color.natural === true ? " — natural, sin teñir" : p.color.natural === false ? " — teñido" : ""}`,
      ev: p.evidence.natural,
      hint: p.color.natural == null ? "No se sabe si es color natural o teñido." : undefined,
    },
    {
      label: "Origen",
      value: p.origin.region ? REGION_LABEL[p.origin.region] : null,
      ev: p.evidence.origin,
      hint: p.origin.detail,
    },
    { label: "Composición", value: compositionLabel(p), ev: p.evidence.alpacaPct },
    { label: "Construcción", value: p.construction ? CONSTRUCTION_LABEL[p.construction] : null },
    { label: "Peso", value: p.weightGrams ? `${p.weightGrams} g` : null },
    {
      label: "Tallas / medidas",
      value: p.sizes?.length ? p.sizes.join(" · ") : null,
      hint: p.sizesAvailable
        ? p.sizesAvailable.length
          ? `Con stock: ${p.sizesAvailable.join(", ")}`
          : "Sin stock en ninguna talla"
        : undefined,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:pb-0">
      <nav className="py-4 text-xs text-piedra">
        <Link href="/" className="hover:text-carbon">
          Catálogo
        </Link>{" "}
        / <span>{TYPE_LABEL[p.productType]}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="-mx-4 overflow-hidden bg-arena sm:mx-0 sm:rounded-sm">
            <ProductImage product={p} className="aspect-[4/5] w-full" sizes="(max-width: 1024px) 100vw, 55vw" />
          </div>
          <p className="mt-2 text-[11px] text-piedra">
            {p.images.length ? `Foto: ${p.source.site}.` : "Imagen ilustrativa en el color del producto."}
            {p.demo && " Producto de ejemplo: no es un listado real."}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tierra">
            {p.source.site}
            {p.seller.name !== p.source.site && ` · ${p.seller.name}`}
            {p.seller.city && ` · ${p.seller.city}`}
          </p>
          <h1 className="mt-3 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">{p.title}</h1>

          <div className="mt-5 flex flex-wrap gap-2">
            {[finenessLabel(p), p.fiber.breed && BREED_LABEL[p.fiber.breed], compositionLabel(p), p.color.natural && "Color natural"]
              .filter(Boolean)
              .map((t) => (
                <span key={t as string} className="rounded-full bg-arena px-3 py-1 text-xs text-tierra">
                  {t}
                </span>
              ))}
          </div>

          <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-serif text-3xl">
              {p.price.currency === "USD" ? formatUsd(p.price.amount) : formatPen(p.price.amount)}
            </span>
            {p.price.compareAt && (
              <span className="text-sm text-piedra line-through">
                {p.price.currency === "USD" ? formatUsd(p.price.compareAt) : formatPen(p.price.compareAt)}
              </span>
            )}
            {p.price.currency === "USD" && <span className="text-sm text-piedra">≈ {formatPen(p.price.amountPen)} (referencial)</span>}
          </div>
          <p className="mt-1 text-sm text-piedra">
            <AvailabilityDot status={p.availability.status} /> {AVAILABILITY_LABEL[p.availability.status]} · verificado el{" "}
            {formatDate(p.availability.checkedAt)}
          </p>
          {p.shipping && (
            <p className="mt-1 text-sm text-piedra">
              {p.shipping.summary}
              {p.shipping.costUsd != null && ` · desde ${formatUsd(p.shipping.costUsd)}`}
              {p.shipping.days && ` · ${p.shipping.days}`}
            </p>
          )}

          <a
            href={p.source.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-6 hidden w-full items-center justify-center gap-2 rounded-full bg-carbon py-3.5 text-sm font-medium text-lana transition hover:bg-tierra lg:flex"
          >
            Ver en {p.source.site} ↗
          </a>

          <section className="mt-10">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tierra">Ficha técnica normalizada</h2>
            <dl className="mt-3 divide-y divide-arena-oscura border-y border-arena-oscura">
              {rows.map((r) => (
                <div key={r.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3 text-sm">
                  <dt className="text-piedra">{r.label}</dt>
                  <dd>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={r.value ? "" : "italic text-piedra"}>{r.value ?? "No declarado por la tienda"}</span>
                      {r.ev && r.value && r.ev.provenance !== "desconocido" && <ProvenanceBadge ev={r.ev} />}
                    </div>
                    {r.hint && <p className="mt-0.5 text-xs text-piedra">{r.hint}</p>}
                    {r.ev?.quote && <p className="mt-1 text-xs italic text-piedra">“{r.ev.quote}”</p>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-10">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tierra">Descripción original</h2>
            <blockquote className="mt-3 border-l-2 border-ocre/60 pl-4 text-sm leading-relaxed text-carbon/90">
              {p.rawDescription}
            </blockquote>
          </section>

          {p.extraction.warnings.length > 0 && (
            <section className="mt-8 rounded-sm bg-arena p-4">
              <h2 className="text-sm font-medium">Lo que el agente no pudo confirmar</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-tierra">
                {p.extraction.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8 text-xs leading-relaxed text-piedra">
            <p>
              Fuente: {METHOD_LABEL[p.source.method]} · leído el {formatDate(p.source.retrievedAt)} · extracción{" "}
              {p.extraction.version}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span>Confianza de la extracción</span>
              <span className="h-1.5 w-28 overflow-hidden rounded-full bg-arena-oscura">
                <span className="block h-full bg-musgo" style={{ width: `${Math.round(p.extraction.confidence * 100)}%` }} />
              </span>
              <span className="tabular-nums">{Math.round(p.extraction.confidence * 100)}%</span>
            </div>
          </section>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-20">
          <h2 className="font-serif text-2xl">Más en {TYPE_LABEL[p.productType].toLowerCase()}</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
            {similar.map((s) => (
              <ProductCard key={s.id} product={s} />
            ))}
          </div>
        </section>
      )}

      {/* CTA fija en móvil */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-arena-oscura bg-lana/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="font-serif text-xl leading-none">{formatPen(p.price.amountPen)}</p>
            <p className="mt-1 truncate text-[11px] text-piedra">{AVAILABILITY_LABEL[p.availability.status]}</p>
          </div>
          <a
            href={p.source.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="ml-auto shrink-0 rounded-full bg-carbon px-5 py-3 text-sm font-medium text-lana"
          >
            Ver en {p.source.site} ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function ProvenanceBadge({ ev }: { ev: FieldEvidence }) {
  const styles = {
    declarado: "bg-musgo/15 text-musgo",
    inferido: "bg-ocre/15 text-ocre",
    desconocido: "bg-arena text-piedra",
  } as const;
  const label = { declarado: "Declarado", inferido: "Inferido", desconocido: "Sin dato" } as const;
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
