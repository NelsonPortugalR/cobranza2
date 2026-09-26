import { buildReport, lastWeek, reportAsText } from "@/lib/searchLog/report.ts";
import { getLogStore } from "@/lib/searchLog/store.ts";

// Reporte semanal de búsquedas. Protegido con SEARCH_REPORT_TOKEN (variable de entorno en Netlify);
// sin esa variable, la ruta no existe.
//   /api/admin/search-report?token=…               → semana anterior, texto
//   /api/admin/search-report?token=…&format=json   → JSON (lo usa scripts/search-suggestions.ts)
//   &from=2026-10-05&to=2026-10-12                 → otro rango
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const expected = process.env.SEARCH_REPORT_TOKEN;
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || token !== expected) return new Response("Not found", { status: 404 });

  const range = lastWeek();
  const from = url.searchParams.get("from") ? `${url.searchParams.get("from")}T00:00:00.000Z` : range.from;
  const to = url.searchParams.get("to") ? `${url.searchParams.get("to")}T00:00:00.000Z` : range.to;
  const store = await getLogStore();
  const report = buildReport(await store.read(from, to), from, to);
  const headers = { "cache-control": "no-store", "x-robots-tag": "noindex" };
  if (url.searchParams.get("format") === "json") return Response.json({ ...report, storage: store.kind }, { headers });
  return new Response(`${reportAsText(report)}\n\nstorage: ${store.kind}\n`, { headers: { ...headers, "content-type": "text/plain; charset=utf-8" } });
}
