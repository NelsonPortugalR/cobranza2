// Dónde se guarda el registro. En Netlify: Netlify Blobs (incluido en la plataforma, sin servicio
// nuevo), producción en el almacén global y previews en el del deploy, como recomienda Netlify.
// Fuera de Netlify (desarrollo, tests): archivos en .search-log/.
// Si el paquete @netlify/blobs no está instalado, el registro se desactiva sin romper el sitio.
import { appendFile, mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import type { StoredEvent } from "./events.ts";

export interface LogStore {
  kind: "blobs" | "file" | "off";
  append(events: StoredEvent[]): Promise<void>;
  /** Eventos entre dos fechas ISO (desde incluida, hasta excluida). */
  read(from: string, to: string): Promise<StoredEvent[]>;
  /** Borra lo anterior a la fecha (retención de 12 meses). Devuelve cuántos lotes borró. */
  purgeBefore(day: string): Promise<number>;
}

export const RETENTION_DAYS = 365;
const day = (iso: string) => iso.slice(0, 10);

function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = new Date(`${day(from)}T00:00:00Z`); d.toISOString() < to; d.setUTCDate(d.getUTCDate() + 1)) out.push(day(d.toISOString()));
  return out;
}

/** Entorno de Netlify en tiempo de ejecución ("production", "deploy-preview", …) o "dev". */
export function runtimeContext(): string {
  const g = globalThis as { Netlify?: { context?: { deploy?: { context?: string } } } };
  return g.Netlify?.context?.deploy?.context ?? process.env.CONTEXT ?? (process.env.NETLIFY ? "unknown" : "dev");
}

function fileStore(dir = path.join(process.cwd(), ".search-log")): LogStore {
  return {
    kind: "file",
    async append(events) {
      await mkdir(dir, { recursive: true });
      const byDay = new Map<string, StoredEvent[]>();
      for (const e of events) byDay.set(day(e.at), [...(byDay.get(day(e.at)) ?? []), e]);
      for (const [d, list] of byDay) await appendFile(path.join(dir, `${d}.ndjson`), list.map((e) => JSON.stringify(e)).join("\n") + "\n");
    },
    async read(from, to) {
      const out: StoredEvent[] = [];
      for (const d of daysBetween(from, to)) {
        const text = await readFile(path.join(dir, `${d}.ndjson`), "utf8").catch(() => "");
        for (const line of text.split("\n")) if (line) out.push(JSON.parse(line));
      }
      return out.filter((e) => e.at >= from && e.at < to);
    },
    async purgeBefore(cutoff) {
      const files = await readdir(dir).catch(() => [] as string[]);
      const old = files.filter((f) => f.endsWith(".ndjson") && f.slice(0, 10) < cutoff);
      for (const f of old) await rm(path.join(dir, f));
      return old.length;
    },
  };
}

interface BlobsModule {
  getStore(name: string): BlobStoreApi;
  getDeployStore(name: string): BlobStoreApi;
}
interface BlobStoreApi {
  setJSON(key: string, value: unknown): Promise<void>;
  get(key: string, opts: { type: "json" }): Promise<unknown>;
  list(opts: { prefix: string }): Promise<{ blobs: { key: string }[] }>;
  delete(key: string): Promise<void>;
}

function blobStore(mod: BlobsModule, context: string): LogStore {
  // Datos de previews y ramas aparte de producción.
  const store = context === "production" ? mod.getStore("search-log") : mod.getDeployStore("search-log");
  return {
    kind: "blobs",
    async append(events) {
      if (!events.length) return;
      const key = `events/${day(events[0].at)}/${events[0].at}-${Math.random().toString(36).slice(2, 10)}`;
      await store.setJSON(key, events);
    },
    async read(from, to) {
      const out: StoredEvent[] = [];
      for (const d of daysBetween(from, to)) {
        const { blobs } = await store.list({ prefix: `events/${d}/` });
        for (const b of blobs) out.push(...(((await store.get(b.key, { type: "json" })) as StoredEvent[] | null) ?? []));
      }
      return out.filter((e) => e.at >= from && e.at < to);
    },
    async purgeBefore(cutoff) {
      const { blobs } = await store.list({ prefix: "events/" });
      const old = blobs.filter((b) => b.key.slice(7, 17) < cutoff);
      for (const b of old) await store.delete(b.key);
      return old.length;
    },
  };
}

const off: LogStore = { kind: "off", append: async () => {}, read: async () => [], purgeBefore: async () => 0 };

let cached: Promise<LogStore> | null = null;

export function getLogStore(): Promise<LogStore> {
  cached ??= (async () => {
    if (!process.env.NETLIFY && !(globalThis as { Netlify?: unknown }).Netlify) return fileStore();
    try {
      // Import dinámico con nombre variable: el sitio compila y funciona aunque el paquete no esté instalado.
      const name = "@netlify/blobs";
      const mod = (await import(/* webpackIgnore: true */ name)) as BlobsModule;
      return blobStore(mod, runtimeContext());
    } catch (err) {
      console.warn("search-log: @netlify/blobs no disponible; registro desactivado", err);
      return off;
    }
  })();
  return cached;
}

/** Para tests: un almacén en archivos en otra carpeta. */
export const testFileStore = (dir: string) => fileStore(dir);
