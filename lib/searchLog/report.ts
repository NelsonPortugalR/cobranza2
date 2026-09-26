// Reporte semanal de búsquedas: las 20 más frecuentes sin resultado y las 20 con resultados pero
// sin clics. Excluye búsquedas de prueba y las que no vienen de producción.
import type { SearchEvent, StoredEvent } from "./events.ts";

export interface QueryRow {
  query: string;
  count: number;
  /** Resultados promedio (exactos + posibles). */
  avgResults: number;
  /** Texto que no entendimos, el más frecuente para esa consulta. */
  leftover: string;
}

export interface SearchReport {
  from: string;
  to: string;
  searches: number;
  sessions: number;
  withClicks: number;
  outbound: number;
  reformulated: number;
  /** Búsquedas sin resultados o con texto que no pudimos interpretar. */
  notUnderstood: number;
  topNoResults: QueryRow[];
  topNoClicks: QueryRow[];
}

export const normalizeQuery = (q: string) => q.toLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();

function top(rows: SearchEvent[], limit: number): QueryRow[] {
  const groups = new Map<string, SearchEvent[]>();
  for (const s of rows) {
    const k = normalizeQuery(s.query);
    if (!k) continue;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  return [...groups]
    .map(([query, list]) => {
      const leftovers = new Map<string, number>();
      for (const s of list) if (s.leftover) leftovers.set(s.leftover, (leftovers.get(s.leftover) ?? 0) + 1);
      return {
        query,
        count: list.length,
        avgResults: Math.round(list.reduce((a, s) => a + s.exact + s.partial, 0) / list.length),
        leftover: [...leftovers].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
      };
    })
    .sort((a, b) => b.count - a.count || a.query.localeCompare(b.query))
    .slice(0, limit);
}

export function buildReport(events: StoredEvent[], from: string, to: string, limit = 20): SearchReport {
  const real = events.filter((e) => !e.test && e.context === "production" && e.at >= from && e.at < to);
  // Una búsqueda puede registrarse dos veces (reglas y luego IA): vale la última.
  const byQid = new Map<string, SearchEvent & { at: string }>();
  for (const e of real) if (e.type === "search") byQid.set(e.qid, e);
  const searches = [...byQid.values()];
  const clicked = new Set(real.filter((e) => e.type === "click").map((e) => (e as { qid: string }).qid));
  for (const e of real) if (e.type === "outbound" && e.qid) clicked.add(e.qid);
  const noResults = searches.filter((s) => s.exact + s.partial === 0);
  const noClicks = searches.filter((s) => s.exact + s.partial > 0 && !clicked.has(s.qid));
  return {
    from,
    to,
    searches: searches.length,
    sessions: new Set(searches.map((s) => s.sid)).size,
    withClicks: searches.filter((s) => clicked.has(s.qid)).length,
    outbound: real.filter((e) => e.type === "outbound").length,
    reformulated: new Set(searches.map((s) => s.reformulationOf).filter(Boolean)).size,
    notUnderstood: searches.filter((s) => s.exact + s.partial === 0 || s.leftover).length,
    topNoResults: top(noResults, limit),
    topNoClicks: top(noClicks, limit),
  };
}

/** Semana ISO anterior completa (lunes 00:00 UTC a lunes 00:00 UTC). */
export function lastWeek(now = new Date()): { from: string; to: string } {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  const prev = new Date(monday);
  prev.setUTCDate(monday.getUTCDate() - 7);
  return { from: prev.toISOString(), to: monday.toISOString() };
}

export function reportAsText(r: SearchReport): string {
  const pct = (n: number) => (r.searches ? `${Math.round((100 * n) / r.searches)}%` : "0%");
  const table = (rows: QueryRow[]) =>
    rows.length ? rows.map((x, i) => `${i + 1}. "${x.query}" ×${x.count} · ${x.avgResults} results${x.leftover ? ` · not understood: "${x.leftover}"` : ""}`).join("\n") : "(none)";
  return [
    `Alpaca Atlas search report ${r.from.slice(0, 10)} → ${r.to.slice(0, 10)}`,
    `${r.searches} searches · ${r.sessions} sessions · ${pct(r.withClicks)} with clicks · ${r.outbound} store visits · ${pct(r.notUnderstood)} not understood · ${r.reformulated} reformulated`,
    "",
    "Top searches with no results:",
    table(r.topNoResults),
    "",
    "Top searches with results but no clicks:",
    table(r.topNoClicks),
  ].join("\n");
}
