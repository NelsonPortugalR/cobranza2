import type { Product } from "../types.ts";

export interface Coverage {
  generatedAt: string;
  items: number;
  sources: { site: string; items: number }[];
  fields: { key: string; label: string; count: number; pct: number }[];
}

/** Qué porcentaje de los ítems trae cada dato técnico. Es la métrica que valida el producto. */
export function coverageReport(items: Product[]): Coverage {
  const real = items.filter((p) => !p.demo);
  const has: [string, string, (p: Product) => boolean][] = [
    ["composition", "Composición (% de alpaca)", (p) => p.fiber.alpacaPct != null],
    ["quality", "Calidad (baby, super baby…)", (p) => p.fiber.quality != null],
    ["micron", "Micronaje (µm)", (p) => p.fiber.micron != null],
    ["breed", "Raza (Huacaya / Suri)", (p) => p.fiber.breed != null],
    ["color", "Color clasificable", (p) => p.color.family != null],
    ["natural", "Natural vs. teñido", (p) => p.color.natural != null],
    ["origin", "Región de origen", (p) => p.origin.region != null],
    ["sizes", "Tallas con stock", (p) => (p.sizesAvailable?.length ?? 0) > 0],
    ["shipping", "Envío", (p) => p.shipping != null],
  ];
  const n = real.length || 1;
  const bySite = new Map<string, number>();
  for (const p of real) bySite.set(p.source.site, (bySite.get(p.source.site) ?? 0) + 1);
  return {
    generatedAt: new Date().toISOString(),
    items: real.length,
    sources: [...bySite].map(([site, count]) => ({ site, items: count })),
    fields: has.map(([key, label, fn]) => {
      const count = real.filter(fn).length;
      return { key, label, count, pct: Math.round((count / n) * 100) };
    }),
  };
}
