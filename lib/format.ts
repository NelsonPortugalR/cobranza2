import type { Product } from "./types.ts";
import { QUALITY_LABEL, micronRangeLabel } from "./taxonomy.ts";

const usdInt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const usdDec = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "America/New_York" });

export const formatPen = (n: number) => `S/ ${(Number.isInteger(n) ? usdInt : usdDec).format(n)}`;
export const formatUsd = (n: number) => `$${(Number.isInteger(n) ? usdInt : usdDec).format(n)}`;

/** Precio en USD (convertido si la tienda publica en soles) y precio de lista en USD si hay oferta. */
export function usdPrice(p: Product): { now: number; was: number | null } {
  const ratio = p.price.amount ? p.price.amountUsd / p.price.amount : 1;
  const round = (n: number) => (p.price.currency === "USD" ? n : Math.round(n));
  return {
    now: round(p.price.amountUsd),
    was: p.price.compareAt ? round(p.price.compareAt * ratio) : null,
  };
}
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
  if (p.fiber.alpacaPct == null) return p.fiber.materials?.length ? `${p.fiber.materials.join(" + ")} (no %)` : null;
  if (p.fiber.alpacaPct === 100) return "100% alpaca";
  return p.fiber.composition.map((c) => `${c.pct}% ${c.material.toLowerCase()}`).join(" · ");
}
