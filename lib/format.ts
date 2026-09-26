import type { Product } from "./types.ts";
import { QUALITY_LABEL } from "./taxonomy.ts";

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


export function compositionLabel(p: Product): string | null {
  const status = p.fiber.compositionStatus;
  if (status === "inferred") return "100% alpaca (per description, no %)";
  if (p.fiber.alpacaPct == null) return p.fiber.materials?.length ? `${p.fiber.materials.join(" + ")} (no %)` : null;
  if (p.fiber.alpacaPct === 100 && status !== "inconsistent") return "100% alpaca";
  const listed = p.fiber.composition.map((c) => `${c.pct}% ${c.material.toLowerCase()}`).join(" · ");
  if (status === "partial") return `${listed} · rest not listed`;
  return listed;
}

/** Línea corta de envío para tarjetas: desde dónde sale y si hay aranceles al recibir. */
export function shippingLine(p: Product): string {
  const s = p.shipping;
  const from = s?.shipsFrom === "US" ? "Ships from the US" : s?.shipsFrom === "Peru" ? "Ships from Peru" : "Ships from: not stated";
  const fees =
    s?.shipsFrom === "US"
      ? null
      : s?.feesOnDelivery === "none"
        ? "duties included"
        : s?.feesOnDelivery === "may_apply"
          ? "duties may apply"
          : s?.shipsFrom === "Peru"
            ? "duties not stated"
            : null;
  return [from, fees].filter(Boolean).join(" · ");
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
  // "Super baby alpaca · 50%": el porcentaje es claramente la parte de alpaca.
  const grade = `${QUALITY_LABEL[p.fiber.quality]} alpaca`;
  const s = p.fiber.compositionStatus;
  if (p.fiber.alpacaPct != null && p.fiber.alpacaPct < 100 && (s === "stated" || s === "partial" || s === "inconsistent"))
    return `${grade} · ${p.fiber.alpacaPct}%`;
  if (s === "stated_no_pct" || s === "not_published") return `${grade} · % not listed`;
  return grade;
}
