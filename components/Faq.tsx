import { JsonLd } from "./JsonLd.tsx";
import { RichText, plainText } from "./RichText.tsx";

/** Preguntas frecuentes visibles + FAQPage (útil para Google y para respuestas de IA). */
export function Faq({ items, title = "Frequently asked questions" }: { items: { q: string; a: string }[]; title?: string }) {
  if (!items.length) return null;
  return (
    <section className="mt-16">
      <h2 className="font-serif text-2xl tracking-tight">{title}</h2>
      <dl className="mt-6 divide-y divide-arena-oscura border-y border-arena-oscura">
        {items.map((f) => (
          <div key={f.q} className="py-5">
            <dt className="font-medium text-carbon">{f.q}</dt>
            <dd className="mt-2 max-w-3xl text-sm leading-relaxed text-piedra">
              <RichText text={f.a} />
            </dd>
          </div>
        ))}
      </dl>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: plainText(f.a) },
          })),
        }}
      />
    </section>
  );
}
