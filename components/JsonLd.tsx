/** Datos estructurados schema.org (JSON-LD) para Google y asistentes de IA. */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // El contenido es nuestro (no del usuario); se escapa "<" para no cerrar el script.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
