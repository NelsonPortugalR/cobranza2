"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PRODUCTS, SOURCES } from "@/lib/products.ts";
import { activeFilterCount, applyFilters } from "@/lib/filter.ts";
import { parseQueryLocal } from "@/lib/parseQuery.ts";
import { SORT_LABEL, chipsFromFilters } from "@/lib/chips.ts";
import { EMPTY_FILTERS } from "@/lib/types.ts";
import type { Filters, ParsedQuery, SortKey } from "@/lib/types.ts";
import { EXAMPLE_QUERIES, SearchBox } from "./SearchBox.tsx";
import { FilterPanel } from "./FilterPanel.tsx";
import { ProductCard } from "./ProductCard.tsx";

export function Catalog({ initialQuery }: { initialQuery: string }) {
  const initial = useMemo(() => (initialQuery ? parseQueryLocal(initialQuery) : null), [initialQuery]);
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<Filters>(initial?.filters ?? EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>(initial?.sort ?? "relevancia");
  const [engine, setEngine] = useState<ParsedQuery["engine"] | null>(initial ? "local" : null);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const runQuery = useCallback(async (q: string, scroll = true) => {
    const id = ++requestId.current;
    setQuery(q);
    // 1) Respuesta instantánea con el parser local.
    const local = parseQueryLocal(q);
    setFilters(local.filters);
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
      setFilters(parsed.filters);
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
  const reset = () => {
    requestId.current++;
    setFilters(EMPTY_FILTERS);
    setSort("relevancia");
    setQuery("");
    setEngine(null);
    setLoading(false);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const { exact, partial } = useMemo(() => applyFilters(PRODUCTS, filters, sort), [filters, sort]);
  const count = useCallback(
    (p: Partial<Filters>) => {
      const r = applyFilters(PRODUCTS, { ...filters, ...p }, sort);
      return r.exact.length + r.partial.length;
    },
    [filters, sort],
  );
  const chips = chipsFromFilters(filters);
  const nActive = activeFilterCount(filters);
  const total = exact.length + partial.length;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-arena-oscura/70 bg-arena">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-tierra">
            Alpaca peruana · {PRODUCTS.length} piezas de {SOURCES.length} tiendas
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.05] tracking-tight text-carbon sm:text-6xl">
            Describe la prenda. <span className="text-tierra">Nosotros leemos cada ficha.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-piedra">
            Un agente revisa tiendas de Arequipa, Cusco, Puno y marketplaces, y traduce descripciones desordenadas a
            micronaje, raza, color natural y origen. Tú filtras; la compra la haces en la tienda original.
          </p>
          <div className="mt-8 max-w-2xl">
            <SearchBox initial={query} loading={loading} onSubmit={(q) => void runQuery(q)} />
          </div>
          <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
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
              Filtros{nActive > 0 && ` · ${nActive}`}
            </button>
          </div>

          {(chips.length > 0 || engine) && (
            <div className="mt-3 flex items-center gap-2 lg:mt-0">
              <span className="hidden shrink-0 text-xs text-piedra sm:inline">
                {engine === "claude" ? "El agente entendió:" : "Entendimos:"}
              </span>
              <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
                {chips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => patch(c.remove)}
                    className="group flex shrink-0 items-center gap-1.5 rounded-full bg-tierra px-3 py-1 text-xs text-lana"
                    aria-label={`Quitar filtro ${c.label}`}
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
                Limpiar
              </button>
            </div>
          )}
        </div>

        <div className="lg:grid lg:grid-cols-[250px_1fr] lg:gap-10 lg:pt-6">
          <aside className="hidden lg:block">
            <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto pb-10 pr-2">
              <FilterPanel filters={filters} onChange={patch} count={count} sources={SOURCES} />
            </div>
          </aside>

          <main className="pt-4 lg:pt-0">
            <div className="mb-4 flex items-end justify-between gap-4">
              <p className="text-sm text-piedra">
                <span className="font-serif text-2xl text-carbon">{exact.length}</span>{" "}
                <span className="hidden sm:inline">{exact.length === 1 ? "coincidencia exacta" : "coincidencias exactas"}</span>
                <span className="sm:hidden">{exact.length === 1 ? "exacta" : "exactas"}</span>
                {partial.length > 0 && ` · ${partial.length} por confirmar`}
              </p>
              <label className="flex items-center gap-2 text-xs text-piedra">
                <span className="hidden sm:inline">Ordenar</span>
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
                <p className="font-serif text-xl">Nada con esos criterios… todavía.</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-piedra">
                  Prueba quitando un filtro. Cada filtro que el agente aplicó aparece arriba y se puede quitar con un toque.
                </p>
              </div>
            )}

            <Grid>
              {exact.map((m) => (
                <ProductCard key={m.product.id} product={m.product} />
              ))}
            </Grid>

            {partial.length > 0 && (
              <section className="mt-12">
                <div className="mb-4 border-t border-arena-oscura pt-6">
                  <h2 className="font-serif text-xl">Posibles coincidencias</h2>
                  <p className="mt-1 max-w-2xl text-sm text-piedra">
                    No contradicen tu búsqueda, pero la tienda no publica algún dato que pediste. Las mostramos aparte en vez
                    de adivinar.
                  </p>
                </div>
                <Grid>
                  {partial.map((m) => (
                    <ProductCard key={m.product.id} product={m.product} unknownFields={m.unknownFields} />
                  ))}
                </Grid>
              </section>
            )}
          </main>
        </div>
      </div>

      {/* Hoja de filtros (móvil) */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
          <button className="absolute inset-0 bg-carbon/40" aria-label="Cerrar filtros" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl bg-lana shadow-2xl">
            <div className="flex items-center justify-between border-b border-arena-oscura px-5 py-4">
              <span className="font-serif text-lg">Filtros</span>
              <button type="button" onClick={reset} className="text-xs text-piedra underline underline-offset-2">
                Limpiar todo
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <FilterPanel filters={filters} onChange={patch} count={count} sources={SOURCES} />
            </div>
            <div className="border-t border-arena-oscura p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="w-full rounded-full bg-carbon py-3.5 text-sm font-medium text-lana"
              >
                Ver {total} {total === 1 ? "resultado" : "resultados"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">{children}</div>;
}
