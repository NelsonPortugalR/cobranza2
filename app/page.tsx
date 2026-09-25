import { Catalog } from "@/components/Catalog.tsx";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <>
      <Catalog initialQuery={typeof q === "string" ? q.slice(0, 500) : ""} />
      <HowItWorks />
    </>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Leemos lo público",
      body: "APIs y feeds cuando existen (Mercado Libre, Etsy); lectura respetuosa de robots.txt en tiendas de marca; carga manual para talleres sin web.",
    },
    {
      n: "02",
      title: "Normalizamos con evidencia",
      body: "Un modelo de lenguaje convierte “royal 18 mic, sin teñir, de Puno” en campos: Ultrafina · 18 µm · natural · Puno. Cada dato guarda la frase que lo justifica.",
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
