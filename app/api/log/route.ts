import { sanitize, type StoredEvent } from "@/lib/searchLog/events.ts";
import { getLogStore, RETENTION_DAYS, runtimeContext } from "@/lib/searchLog/store.ts";

// Recibe eventos del buscador (sendBeacon). No lee ni guarda la IP ni ninguna cabecera.
let lastPurge = "";

export async function POST(req: Request) {
  const text = await req.text().catch(() => "");
  if (!text || text.length > 16_000) return new Response(null, { status: 400 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const raw = Array.isArray((body as { events?: unknown }).events) ? ((body as { events: unknown[] }).events) : [];
  const at = new Date().toISOString();
  const context = runtimeContext();
  const events = raw
    .slice(0, 20)
    .map(sanitize)
    .filter((e) => e != null)
    .map((e) => ({ ...e, at, context }) as StoredEvent);
  if (!events.length) return new Response(null, { status: 204 });
  try {
    const store = await getLogStore();
    await store.append(events);
    // Retención de 12 meses: una purga al día como mucho, sin tareas programadas.
    const today = at.slice(0, 10);
    if (lastPurge !== today) {
      lastPurge = today;
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
      await store.purgeBefore(cutoff);
    }
  } catch (err) {
    console.error("search-log: no se pudo guardar", err);
  }
  return new Response(null, { status: 204 });
}
