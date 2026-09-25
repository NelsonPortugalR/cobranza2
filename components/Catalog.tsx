"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { activeFilterCount } from "@/lib/filter.ts";
import type { SearchHit, SearchResponse } from "@/lib/search.ts";
import { parseQueryLocal } from "@/lib/parseQuery.ts";
import { SORT_LABEL, chipsFromFilters } from "@/lib/chips.ts";
import { stripNonComparable } from "@/lib/comparable.ts";
import { DEFAULT_FILTERS } from "@/lib/types.ts";
import type { FxRate } from "@/lib/fx.ts";
import type { ProductType } from "@/lib/types.ts";
import type { Filters, ParsedQuery, SortKey } from "@/lib/types.ts";
import { EXAMPLE_QUERIES, SearchBox } from "./SearchBox.tsx";
import { FilterPanel } from "./FilterPanel.tsx";
import { ProductCard } from "./ProductCard.tsx";

const PAGE = 24;

async function fetchResults(filters: Filters, sort: SortKey, offset: number, signal?: AbortSignal): Promise<SearchResponse> {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filters, sort, offset, limit: offset === 0 ? PAGE : PAGE * 2 }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function Catalog({
  initialQuery,
  initialResults,
  realCount,
  sources: SOURCES,
  usStoreCount,
  fx,
}: {
  initialQuery: string;
  /** Resultados ya calculados en el servidor para la primera pintada. */
  initialResults: SearchResponse;
  realCount: number;
  sources: string[];
  /** Tiendas que envían a EE. UU. */
  usStoreCount: number;
  fx: FxRate;
}) {
  const initial = useMemo(() => (initialQuery ? parseQueryLocal(initialQuery, fx) : null), [initialQuery, fx]);
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<Filters>(initial ? stripNonComparable(initial.filters).filters : DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>(initial?.sort ?? "relevancia");
  const [engine, setEngine] = useState<ParsedQuery["engine"] | null>(initial ? "local" : null);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [results, setResults] = useState<SearchResponse>(initialResults);
  const [hits, setHits] = useState<SearchHit[]>(initialResults.hits);
  const [fetching, setFetching] = useState(false);
  const firstRender = useRef(true);
  const [ignored, setIgnored] = useState<string[]>(() => (initial ? stripNonComparable(initial.filters).ignored : []));
  const resultsRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const runQuery = useCallback(async (q: string, scroll = true) => {
    const id = ++requestId.current;
    setQuery(q);
    // 1) Respuesta instantánea con el parser local.
    const local = parseQueryLocal(q, fx);
    const cleanLocal = stripNonComparable(local.filters);
    setIgnored(cleanLocal.ignored);
    setFilters(cleanLocal.filters);
    setSort(local.sort);
    setEngine("local");
    const url = new URL(window.location.href);
    url.searchParams.set("q", q);
    window.history.replaceState(null, "", url);
    if (scroll) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    // 2) Refinamiento con el agente (Claude) si está configurado en el servidor.
    setLoading(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) return;
      const parsed = (await res.json()) as ParsedQuery;
      if (id !== requestId.current || parsed.engine !== "claude") return;
      const clean = stripNonComparable({ ...DEFAULT_FILTERS, ...parsed.filters });
      setIgnored(clean.ignored);
      setFilters(clean.filters);
      setSort(parsed.sort);
      setEngine("claude");
    } catch {
      // Sin red: nos quedamos con la interpretación local.
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) void runQuery(initialQuery, false);
  }, [initialQuery, runQuery]);

  const patch = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));

  // Cada cambio de filtros u orden pide la primera página al servidor.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setFetching(true);
      try {
        const r = await fetchResults(filters, sort, 0, ctrl.signal);
        setResults(r);
        setHits(r.hits);
      } catch {
        // abortada o sin red: se mantienen los resultados anteriores
      } finally {
        if (!ctrl.signal.aborted) setFetching(false);
      }
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [filters, sort]);

  const loadMore = async () => {
    setFetching(true);
    try {
      const r = await fetchResults(filters, sort, hits.length);
      setHits((h) => [...h, ...r.hits]);
    } finally {
      setFetching(false);
    }
  };
  const reset = () => {
    requestId.current++;
    setFilters(DEFAULT_FILTERS);
    setSort("relevancia");
    setQuery("");
    setIgnored([]);
    setEngine(null);
    setLoading(false);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const visibleExact = hits.filter((h) => !h.partial);
  const visiblePartial = hits.filter((h) => h.partial);
  const total = results.exactTotal + results.partialTotal;
  const hasMore = hits.length < total;
  const chips = chipsFromFilters(filters);
  const nActive = activeFilterCount(filters);
  const exact = { length: results.exactTotal };
  const partial = { length: results.partialTotal };

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-arena-oscura/70 bg-arena">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-tierra">
            Peruvian alpaca · {realCount.toLocaleString("en-US")} pieces in stock · {usStoreCount} stores that ship to the US
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.05] tracking-tight text-carbon sm:text-6xl">
            Describe the piece. <span className="text-tierra">We read every listing.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-piedra">
            We read the public catalogs of Peru&rsquo;s alpaca makers and turn messy product pages into facts you can
            compare: fiber content, grade, color, sizes in stock, price in USD and shipping to the US. You buy directly
            from the original store.
          </p>
          <div className="mt-8 max-w-2xl">
            <SearchBox initial={query} loading={loading} onSubmit={(q) => void runQuery(q)} />
          </div>
          <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            <span className="shrink-0 self-center text-xs text-piedra">Try:</span>
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void runQuery(q)}
                className="shrink-0 rounded-full border border-arena-oscura bg-lana/70 px-3 py-1.5 text-xs text-tierra transition hover:border-tierra/50 hover:bg-white"
              >
                {q}
              </button>
            ))}
          </div>
          <nav aria-label="Shop by category" className="mt-10 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {CATEGORIES.map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setQuery("");
                  setIgnored([]);
                  setEngine(null);
                  setFilters({ ...DEFAULT_FILTERS, types: [type] });
                  resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="rounded-sm border border-arena-oscura bg-lana/60 px-3 py-3 text-left text-sm text-carbon transition hover:border-tierra/50 hover:bg-white"
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </section>

      {/* CATÁLOGO */}
      <div id="catalogo" ref={resultsRef} className="mx-auto max-w-7xl scroll-mt-2 px-4 sm:px-6">
        {/* Barra superior: pegajosa en móvil */}
        <div className="sticky top-0 z-20 -mx-4 border-b border-arena-oscura/70 bg-lana/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pt-8">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="min-w-0 flex-1">
              <SearchBox size="compact" initial={query} loading={loading} onSubmit={(q) => void runQuery(q)} />
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="shrink-0 rounded-full border border-carbon px-3.5 py-2 text-xs font-medium"
            >
              Filters{nActive > 0 && ` · ${nActive}`}
            </button>
          </div>

          {(chips.length > 0 || engine || ignored.length > 0) && (
            <div className="mt-3 flex items-center gap-2 lg:mt-0">
              <span className="hidden shrink-0 text-xs text-piedra sm:inline">
                {engine === "claude" ? "Our agent read:" : "We read:"}
              </span>
              <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
                {chips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => patch(c.remove)}
                    className="group flex shrink-0 items-center gap-1.5 rounded-full bg-tierra px-3 py-1 text-xs text-lana"
                    aria-label={`Remove filter ${c.label}`}
                  >
                    {c.label}
                    <span className="text-lana/60 group-hover:text-lana">×</span>
                  </button>
                ))}
                {sort !== "relevancia" && (
                  <span className="shrink-0 rounded-full border border-tierra/40 px-3 py-1 text-xs text-tierra">
                    {SORT_LABEL[sort]}
                  </span>
                )}
              </div>
              <button type="button" onClick={reset} className="shrink-0 text-xs text-piedra underline underline-offset-2">
                Clear
              </button>
            </div>
          )}
          {ignored.length > 0 && (
            <p className="mt-2 text-xs text-piedra">
              We don&rsquo;t filter by {ignored.join(", ")}: stores don&rsquo;t publish it.
            </p>
          )}
        </div>

        <div className="lg:grid lg:grid-cols-[250px_1fr] lg:gap-10 lg:pt-6">
          <aside className="hidden lg:block">
            <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto pb-10 pr-2">
              <FilterPanel filters={filters} onChange={patch} facets={results.facets} sources={SOURCES} />
            </div>
          </aside>

          <main className={`pt-4 transition-opacity lg:pt-0 ${fetching ? "opacity-60" : ""}`} aria-busy={fetching}>
            <div className="mb-4 flex items-end justify-between gap-4">
              <p className="text-sm text-piedra">
                <span className="font-serif text-2xl text-carbon">{exact.length.toLocaleString("en-US")}</span>{" "}
                {exact.length === 1 ? "exact match" : "exact matches"}
                {partial.length > 0 && ` · ${partial.length.toLocaleString("en-US")} to confirm`}
              </p>
              <label className="flex items-center gap-2 text-xs text-piedra">
                <span className="hidden sm:inline">Sort</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="rounded-full border border-arena-oscura bg-white px-3 py-1.5 text-xs text-carbon outline-none"
                >
                  {Object.entries(SORT_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {total === 0 && (
              <div className="rounded-sm border border-dashed border-arena-oscura px-6 py-16 text-center">
                <p className="font-serif text-xl">Nothing matches all of that… yet.</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-piedra">
                  Try removing a filter. Every filter we applied is listed above and can be removed with one tap.
                </p>
              </div>
            )}

            <Grid>
              {visibleExact.map((m) => (
                <ProductCard key={m.product.id} product={m.product} />
              ))}
            </Grid>

            {visiblePartial.length > 0 && (
              <section className="mt-12">
                <div className="mb-4 border-t border-arena-oscura pt-6">
                  <h2 className="font-serif text-xl">Possible matches</h2>
                  <p className="mt-1 max-w-2xl text-sm text-piedra">
                    Nothing here contradicts your search, but the store doesn&rsquo;t publish something you asked for. We list
                    them separately instead of guessing.
                  </p>
                </div>
                <Grid>
                  {visiblePartial.map((m) => (
                    <ProductCard key={m.product.id} product={m.product} unknownFields={m.unknownFields} />
                  ))}
                </Grid>
              </section>
            )}

            {hasMore && (
              <div className="mt-10 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={fetching}
                  className="rounded-full border border-carbon px-6 py-3 text-sm font-medium transition hover:bg-carbon hover:text-lana"
                >
                  Show more
                </button>
                <p className="text-xs text-piedra">
                  Showing {hits.length} of {total.toLocaleString("en-US")}
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Hoja de filtros (móvil) */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button className="absolute inset-0 bg-carbon/40" aria-label="Close filters" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl bg-lana shadow-2xl">
            <div className="flex items-center justify-between border-b border-arena-oscura px-5 py-4">
              <span className="font-serif text-lg">Filters</span>
              <button type="button" onClick={reset} className="text-xs text-piedra underline underline-offset-2">
                Clear all
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <FilterPanel filters={filters} onChange={patch} facets={results.facets} sources={SOURCES} />
            </div>
            <div className="border-t border-arena-oscura p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="w-full rounded-full bg-carbon py-3.5 text-sm font-medium text-lana"
              >
                Show {total.toLocaleString("en-US")} {total === 1 ? "result" : "results"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const CATEGORIES: [ProductType, string][] = [
  ["chompa", "Sweaters"],
  ["cardigan", "Cardigans"],
  ["bufanda", "Scarves"],
  ["chal", "Shawls & wraps"],
  ["gorro", "Hats & beanies"],
  ["guantes", "Gloves"],
];

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">{children}</div>;
}
