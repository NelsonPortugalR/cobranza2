// Registro de búsquedas anónimo: qué se buscó, cómo lo entendimos, cuántos resultados hubo y qué
// se abrió. Sin datos personales: ni IP ni email; la sesión es un ID aleatorio que vive solo en la
// pestaña del navegador (sessionStorage). Se guarda 12 meses.

export type Engine = "rules" | "ai";
export type Intent = "product_search" | "question" | "store" | "mixed";

interface Base {
  /** ID aleatorio de la sesión de la pestaña. */
  sid: string;
  /** true = búsqueda de prueba (nuestra): el reporte la excluye. */
  test: boolean;
}

export interface SearchEvent extends Base {
  type: "search";
  /** ID de esta búsqueda, para enlazar clics y salidas. */
  qid: string;
  query: string;
  engine: Engine;
  intent: Intent;
  /** Solo los filtros activos (distintos del valor por defecto). */
  filters: Record<string, unknown>;
  /** Texto que la búsqueda no supo convertir en filtros. */
  leftover: string;
  exact: number;
  partial: number;
  /** IDs de los primeros resultados, en orden. */
  topIds: string[];
  /** Búsqueda anterior de la misma sesión, reformulada sin clics en menos de 10 minutos. */
  reformulationOf?: string;
}

export interface ClickEvent extends Base {
  type: "click";
  qid: string;
  productId: string;
  /** Posición en los resultados, desde 1. */
  position: number;
}

export interface OutboundEvent extends Base {
  type: "outbound";
  qid?: string;
  productId: string;
  store: string;
}

export type LogEvent = SearchEvent | ClickEvent | OutboundEvent;

/** Evento tal como se guarda: con hora y entorno puestos por el servidor. */
export type StoredEvent = LogEvent & { at: string; context: string };

const ID = /^[a-z0-9-]{6,64}$/i;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const int = (v: unknown) => (Number.isFinite(v) ? Math.max(0, Math.min(1_000_000, Math.trunc(v as number))) : 0);

/** Quita lo que pudiera identificar a alguien si lo escribió en el buscador: emails y números largos. */
export function maskPersonalData(text: string): string {
  return text
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
    .replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, (m) => (m.replace(/\D/g, "").length >= 7 ? "[number]" : m));
}

const FILTER_KEYS = new Set([
  "types", "qualities", "colorFamilies", "sizes", "genders", "sources", "alpacaRanges", "noSynthetics",
  "shipsFrom", "noFeesOnDelivery", "priceMin", "priceMax", "inStockOnly", "dye", "breeds", "origins",
]);

/** Valida y recorta un evento que llega del navegador. Devuelve null si no es válido. */
export function sanitize(raw: unknown): LogEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const sid = str(e.sid, 64);
  if (!ID.test(sid)) return null;
  const test = e.test === true;
  switch (e.type) {
    case "search": {
      const qid = str(e.qid, 64);
      if (!ID.test(qid)) return null;
      const filters: Record<string, unknown> = {};
      if (e.filters && typeof e.filters === "object") {
        for (const [k, v] of Object.entries(e.filters as Record<string, unknown>)) {
          if (!FILTER_KEYS.has(k)) continue;
          filters[k] = Array.isArray(v) ? v.slice(0, 20).map((x) => str(x, 40)) : typeof v === "number" || typeof v === "boolean" ? v : str(v, 40);
        }
      }
      return {
        type: "search",
        sid,
        test,
        qid,
        query: maskPersonalData(str(e.query, 200).trim()),
        engine: e.engine === "ai" ? "ai" : "rules",
        intent: (["product_search", "question", "store", "mixed"] as const).find((i) => i === e.intent) ?? "product_search",
        filters,
        leftover: maskPersonalData(str(e.leftover, 120)),
        exact: int(e.exact),
        partial: int(e.partial),
        topIds: Array.isArray(e.topIds) ? e.topIds.slice(0, 10).map((x) => str(x, 160)).filter(Boolean) : [],
        ...(ID.test(str(e.reformulationOf, 64)) ? { reformulationOf: str(e.reformulationOf, 64) } : {}),
      };
    }
    case "click": {
      const qid = str(e.qid, 64);
      const productId = str(e.productId, 160);
      if (!ID.test(qid) || !productId) return null;
      return { type: "click", sid, test, qid, productId, position: Math.max(1, int(e.position)) };
    }
    case "outbound": {
      const productId = str(e.productId, 160);
      if (!productId) return null;
      const qid = str(e.qid, 64);
      return { type: "outbound", sid, test, productId, store: str(e.store, 60), ...(ID.test(qid) ? { qid } : {}) };
    }
    default:
      return null;
  }
}
