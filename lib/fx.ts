// Tipo de cambio soles → dólares. Se obtiene al descargar el catálogo y se guarda
// en data/fx.json junto con la fecha y la fuente, para mostrarlo en el portal.

import { FALLBACK_PEN_PER_USD } from "./taxonomy.ts";

export interface FxRate {
  /** Soles por 1 USD. */
  penPerUsd: number;
  /** Fecha del dato (YYYY-MM-DD). */
  date: string;
  source: "BCRP" | "open.er-api.com" | "last-known" | "fallback";
}

export const FALLBACK_FX: FxRate = { penPerUsd: FALLBACK_PEN_PER_USD, date: "", source: "fallback" };

export function toUsd(amount: number, currency: "PEN" | "USD", fx: FxRate): number {
  return currency === "USD" ? amount : Math.round((amount / fx.penPerUsd) * 100) / 100;
}

/** BCRP: tipo de cambio interbancario venta (serie PD04640PD), fuente oficial en Perú. */
export function parseBcrp(json: unknown): FxRate | null {
  const periods = (json as { periods?: { name: string; values: string[] }[] })?.periods ?? [];
  for (let i = periods.length - 1; i >= 0; i--) {
    const v = parseFloat(periods[i].values?.[0]);
    if (Number.isFinite(v) && v > 2 && v < 6) return { penPerUsd: v, date: periods[i].name, source: "BCRP" };
  }
  return null;
}

export function parseOpenEr(json: unknown): FxRate | null {
  const j = json as { rates?: { PEN?: number }; time_last_update_utc?: string };
  const v = j?.rates?.PEN;
  if (!v || v < 2 || v > 6) return null;
  const date = j.time_last_update_utc ? new Date(j.time_last_update_utc).toISOString().slice(0, 10) : "";
  return { penPerUsd: v, date, source: "open.er-api.com" };
}
