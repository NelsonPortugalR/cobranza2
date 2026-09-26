// Vocabulario controlado de fibras y rangos de % de alpaca. Lo usan la ingesta
// (para normalizar) y los filtros (para decidir cumple / no cumple / por confirmar).
import type { Product } from "./types.ts";

export type FiberFamily = "alpaca" | "wool" | "silk" | "cotton" | "nylon" | "acrylic" | "polyester" | "elastane" | "other";

/**
 * Cómo publica la tienda la composición:
 * - stated: porcentajes que suman 100.
 * - partial: porcentajes que suman menos de 100 (falta parte de la composición).
 * - inconsistent: porcentajes que suman más de 100 (error de la tienda; se muestra tal cual).
 * - stated_no_pct: nombra los materiales sin porcentajes.
 * - inferred: "100%" deducido de una frase ("made of pure baby alpaca"), sin porcentaje.
 * - not_published: no dice de qué está hecha.
 */
export type CompositionStatus = "stated" | "partial" | "inconsistent" | "stated_no_pct" | "inferred" | "not_published";

/** Rangos del filtro de % de alpaca. "unpublished" = la tienda no publica porcentajes. */
export type AlpacaRange = "100" | "70-99" | "50-69" | "lt50" | "unpublished";
export const ALPACA_RANGES: AlpacaRange[] = ["100", "70-99", "50-69", "lt50", "unpublished"];
export const ALPACA_RANGE_LABEL: Record<AlpacaRange, string> = {
  "100": "100% alpaca",
  "70-99": "70–99% alpaca",
  "50-69": "50–69% alpaca",
  lt50: "Under 50% alpaca",
  unpublished: "Percentages not published",
};

const FAMILY_RULES: [FiberFamily, RegExp][] = [
  ["alpaca", /alpaca|suri|huacaya/i],
  ["wool", /\b(wool|lana|merino)\b/i],
  ["silk", /\b(silk|seda)\b/i],
  ["cotton", /\b(cotton|algod[oó]n|pima)\b/i],
  ["nylon", /\b(nylon|polyamide|poliamida)\b/i],
  // "Microfiber" y "dralon" suelen ser acrílico en tejido de punto.
  ["acrylic", /\b(acrylic|acr[ií]lico|polyacryl\w*|poliacr[ií]l\w*|dralon|microfib(?:er|re)|microfibra)\b/i],
  ["polyester", /\b(polyester|poli[eé]ster)\b/i],
  ["elastane", /\b(e?s?lastane|elastano|spandex|lycra)\b/i],
];

export function fiberFamily(material: string): FiberFamily {
  return FAMILY_RULES.find(([, re]) => re.test(material))?.[0] ?? "other";
}

/** Sintéticos que cambian el tacto y el abrigo. Nylon y elastano van aparte: son funcionales en calcetines y guantes. */
export const SYNTHETIC: FiberFamily[] = ["acrylic", "polyester"];

/** Rango de % de alpaca publicado; null = sin porcentaje. */
export function alpacaRange(pct: number | null): Exclude<AlpacaRange, "unpublished"> | null {
  if (pct == null) return null;
  if (pct >= 100) return "100";
  if (pct >= 70) return "70-99";
  if (pct >= 50) return "50-69";
  return "lt50";
}

type Verdict = "pass" | "fail" | "unknown";

/**
 * ¿Cumple el producto una opción del filtro de % de alpaca?
 * Solo cuenta como exacto lo que la tienda publica con porcentajes; el "100%" deducido de
 * una frase queda "por confirmar".
 */
export function alpacaRangeVerdict(p: Product, option: AlpacaRange): Verdict {
  const status = p.fiber.compositionStatus ?? (p.fiber.composition.length ? "stated" : p.fiber.alpacaPct != null ? "inferred" : "not_published");
  const range = alpacaRange(p.fiber.alpacaPct);
  switch (status) {
    case "stated":
    case "inconsistent":
      return option === range ? "pass" : "fail";
    case "partial":
      // Sabemos cuánta alpaca declara, no el resto: coincide, pero hay que confirmarlo.
      return option === range ? "unknown" : "fail";
    case "inferred":
      if (option === "unpublished") return "pass";
      return option === "100" ? "unknown" : "fail";
    case "stated_no_pct":
      if (option === "unpublished") return "pass";
      // Una mezcla declarada no puede ser 100% alpaca.
      return option === "100" && p.fiber.blend ? "fail" : "unknown";
    case "not_published":
      return option === "unpublished" ? "pass" : "unknown";
  }
}

/** "No synthetics": exacto solo con composición completa publicada. */
export function noSyntheticsVerdict(p: Product): Verdict {
  if (p.fiber.hasSynthetics === true) return "fail";
  const status = p.fiber.compositionStatus;
  if (p.fiber.hasSynthetics === false && (status === "stated" || status === "inconsistent")) return "pass";
  return "unknown";
}

/** Texto corto para tarjetas: "37% alpaca", "100% alpaca", "Alpaca blend (no %)". */
export function alpacaShortLabel(p: Product): string | null {
  const status = p.fiber.compositionStatus;
  if (p.fiber.alpacaPct != null && (status === "stated" || status === "inconsistent" || status === "partial")) return `${p.fiber.alpacaPct}% alpaca`;
  if (status === "inferred") return "100% alpaca (per description)";
  if (status === "stated_no_pct") return p.fiber.blend ? "Alpaca blend, % not published" : "Alpaca, % not published";
  if (p.fiber.alpacaPct != null) return `${p.fiber.alpacaPct}% alpaca`;
  return null;
}
