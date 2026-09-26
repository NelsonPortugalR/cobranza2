// Lado del navegador del registro de búsquedas. La sesión es un ID aleatorio en sessionStorage:
// desaparece al cerrar la pestaña y no se cruza con nada. Nada de cookies, IP ni email.
import type { ClickEvent, Engine, Intent, LogEvent, OutboundEvent, SearchEvent } from "./events.ts";

const KEY_SID = "aa_sid";
const KEY_TEST = "aa_test";
const KEY_LAST = "aa_last";
const REFORMULATION_MS = 10 * 60_000;

const storage = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};
const rid = () => (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

function sessionId(): string {
  const s = storage();
  let sid = s?.getItem(KEY_SID);
  if (!sid) {
    sid = rid();
    s?.setItem(KEY_SID, sid);
  }
  return sid;
}

/** Nuestras pruebas: abrir el sitio con ?atlas_test=1 marca toda la sesión como prueba. */
function isTest(): boolean {
  const s = storage();
  if (new URLSearchParams(window.location.search).get("atlas_test") === "1") s?.setItem(KEY_TEST, "1");
  return s?.getItem(KEY_TEST) === "1";
}

function send(events: LogEvent[]) {
  try {
    const body = JSON.stringify({ events });
    if (!navigator.sendBeacon?.("/api/log", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/log", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {
    // El registro nunca debe romper la búsqueda.
  }
}

export const newQueryId = rid;

export function logSearch(e: {
  qid: string;
  query: string;
  engine: Engine;
  intent: Intent;
  filters: Record<string, unknown>;
  leftover: string;
  exact: number;
  partial: number;
  topIds: string[];
}) {
  const s = storage();
  const last = JSON.parse(s?.getItem(KEY_LAST) ?? "null") as { qid: string; at: number; clicked: boolean } | null;
  const reformulationOf = last && last.qid !== e.qid && !last.clicked && Date.now() - last.at < REFORMULATION_MS ? last.qid : undefined;
  if (!last || last.qid !== e.qid) s?.setItem(KEY_LAST, JSON.stringify({ qid: e.qid, at: Date.now(), clicked: false }));
  const event: SearchEvent = { type: "search", sid: sessionId(), test: isTest(), ...e, ...(reformulationOf ? { reformulationOf } : {}) };
  send([event]);
}

export function logClick(qid: string, productId: string, position: number) {
  const s = storage();
  const last = JSON.parse(s?.getItem(KEY_LAST) ?? "null") as { qid: string; at: number; clicked: boolean } | null;
  if (last?.qid === qid) s?.setItem(KEY_LAST, JSON.stringify({ ...last, clicked: true }));
  // La ficha abierta recuerda de qué búsqueda vino, para atribuir la salida a la tienda.
  s?.setItem(`aa_ctx_${productId}`, qid);
  const event: ClickEvent = { type: "click", sid: sessionId(), test: isTest(), qid, productId, position };
  send([event]);
}

export function logOutbound(productId: string, store: string) {
  const qid = storage()?.getItem(`aa_ctx_${productId}`) ?? undefined;
  const event: OutboundEvent = { type: "outbound", sid: sessionId(), test: isTest(), productId, store, ...(qid ? { qid } : {}) };
  send([event]);
}

/** Marca la sesión como prueba si la URL trae ?atlas_test=1 (se llama al cargar el buscador). */
export function initTestFlag() {
  try {
    isTest();
  } catch {
    // sin sessionStorage: nada que marcar
  }
}
