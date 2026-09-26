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
  const status = p.fiber.compositionStatus;
  if (status === "inferred") return "100% alpaca (per description, no %)";
  if (p.fiber.alpacaPct == null) return p.fiber.materials?.length ? `${p.fiber.materials.join(" + ")} (no %)` : null;
  if (p.fiber.alpacaPct === 100 && status !== "inconsistent") return "100% alpaca";
  const listed = p.fiber.composition.map((c) => `${c.pct}% ${c.material.toLowerCase()}`).join(" · ");
  if (status === "partial") return `${listed} · rest not listed`;
  return listed;
}

/** Explicación corta del estado de la composición, para la ficha. */
export function compositionNote(p: Product): string | undefined {
  const total = Math.round(p.fiber.composition.reduce((a, c) => a + c.pct, 0));
  switch (p.fiber.compositionStatus) {
    case "partial":
      return `The store lists only ${total}% of the fiber content.`;
    case "inconsistent":
      return `The store's percentages add up to ${total}%. Shown exactly as published.`;
    case "stated_no_pct":
      return "The store names the fibers but not the percentages.";
    case "inferred":
      return "The store describes it as pure alpaca but doesn't give a percentage.";
    default:
      return undefined;
  }
}

/** Grado + % de alpaca, para que "Baby" en una pieza con 37% de alpaca no parezca más fina de lo que es. */
export function gradeWithShare(p: Product): string | null {
  if (!p.fiber.quality) return null;
  const grade = QUALITY_LABEL[p.fiber.quality];
  const s = p.fiber.compositionStatus;
  if (p.fiber.alpacaPct != null && p.fiber.alpacaPct < 100 && (s === "stated" || s === "partial" || s === "inconsistent"))
    return `${grade} · ${p.fiber.alpacaPct}% of fiber`;
  if (s === "stated_no_pct" || s === "not_published") return `${grade} · % not listed`;
  return grade;
}
