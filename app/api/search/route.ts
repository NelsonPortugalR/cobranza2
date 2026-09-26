import { search } from "@/lib/search.ts";
import { EMPTY_FILTERS } from "@/lib/types.ts";
import type { Filters, SortKey } from "@/lib/types.ts";

const SORTS: SortKey[] = ["relevancia", "micras_asc", "precio_asc", "precio_desc"];

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { filters?: Partial<Filters>; sort?: SortKey; offset?: number; limit?: number } | null;
  if (!body) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  const filters = { ...EMPTY_FILTERS, ...body.filters, text: String(body.filters?.text ?? "").slice(0, 200) } as Filters;
  const sort = SORTS.includes(body.sort as SortKey) ? (body.sort as SortKey) : "relevancia";
  const offset = Math.max(0, Math.min(Number(body.offset) || 0, 10_000));
  const limit = Math.max(1, Math.min(Number(body.limit) || 24, 96));
  return Response.json(search(filters, sort, offset, limit));
}
