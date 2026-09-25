import type { Product } from "./types.ts";
import { QUALITY_LABEL, micronRangeLabel } from "./taxonomy.ts";

const pen = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 });
const usdInt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const usdDec = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "America/Lima" });

export const formatPen = (n: number) => pen.format(n);
export const formatUsd = (n: number) => `US$ ${(Number.isInteger(n) ? usdInt : usdDec).format(n)}`;
export const formatDate = (iso: string) => date.format(new Date(iso));

/** "Ultrafina · 18 µm", "Baby · 20.1–23 µm", o null si no hay dato. */
export function finenessLabel(p: Product): string | null {
  const { quality, micron } = p.fiber;
  if (!quality && micron == null) return null;
  const name = quality ? QUALITY_LABEL[quality] : "";
  const mic = micron != null ? `${micron} µm` : quality ? micronRangeLabel(quality) : "";
  return [name, mic].filter(Boolean).join(" · ");
}

export function compositionLabel(p: Product): string | null {
  if (p.fiber.alpacaPct == null) return p.fiber.materials?.length ? `${p.fiber.materials.join(" + ")} (sin %)` : null;
  if (p.fiber.alpacaPct === 100) return "100% alpaca";
  return p.fiber.composition.map((c) => `${c.pct}% ${c.material.toLowerCase()}`).join(" · ");
}
