import { Catalog } from "@/components/Catalog.tsx";
import { COVERAGE, REAL_SOURCES, SOURCES, compactProducts } from "@/lib/catalog.ts";
import { formatDate } from "@/lib/format.ts";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <>
      <Catalog
        initialQuery={typeof q === "string" ? q.slice(0, 500) : ""}
        products={compactProducts()}
        sources={SOURCES}
        realSources={REAL_SOURCES}
      />
      <HowItWorks />
      <CoverageSection />
    </>
  );
}

function CoverageSection() {
  if (!COVERAGE) return null;
  return (
    <section id="cobertura" className="mx-auto mt-24 max-w-7xl scroll-mt-6 px-4 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tierra">Datos reales</p>
          <h2 className="mt-2 font-serif text-3xl tracking-tight">Lo que las tiendas publican de verdad</h2>
          <p className="mt-4 text-sm leading-relaxed text-piedra">
            Leímos {COVERAGE.items.toLocaleString("es-PE")} piezas ({COVERAGE.sources.map((s) => s.site).join(", ")}) el{" "}
            {formatDate(COVERAGE.generatedAt)}. La composición casi siempre está; el micronaje y la región de origen, casi
            nunca. Por eso mostramos &ldquo;no declarado&rdquo; en vez de inventarlo, y separamos las coincidencias por
            confirmar.
          </p>
        </div>
        <ul className="space-y-3">
          {COVERAGE.fields.map((f) => (
            <li key={f.key} className="grid grid-cols-[minmax(0,11rem)_1fr_3rem] items-center gap-3 text-sm">
              <span className="truncate text-carbon">{f.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-arena-oscura/60">
                <span
                  className={`block h-full rounded-full ${f.pct >= 70 ? "bg-musgo" : f.pct >= 30 ? "bg-ocre" : "bg-tierra/60"}`}
                  style={{ width: `${Math.max(f.pct, 1)}%` }}
                />
              </span>
              <span className="text-right tabular-nums text-piedra">{f.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Leemos lo público",
      body: "Feeds públicos de las tiendas (como el catálogo Shopify de Sol Alpaca), APIs oficiales de marketplaces cuando hay credenciales, siempre respetando robots.txt. Enlazamos a la tienda; no vendemos.",
    },
    {
      n: "02",
      title: "Normalizamos con evidencia",
      body: "Convertimos “70% baby alpaca and 30% silk”, “koi orange” o “XS / rainy day” en campos comparables: composición, calidad, color, tallas con stock. Cada dato guarda la frase que lo justifica.",
    },
    {
      n: "03",
      title: "No adivinamos",
      body: "Si una tienda no declara origen o micronaje, lo decimos. Esos productos aparecen como “posibles coincidencias”, separados de los exactos.",
    },
  ];
  return (
    <section id="como-funciona" className="mx-auto mt-24 max-w-7xl scroll-mt-6 px-4 sm:px-6">
      <h2 className="font-serif text-3xl tracking-tight">Cómo leemos las fichas</h2>
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
