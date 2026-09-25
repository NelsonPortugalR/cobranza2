import { ALL_PRODUCTS, SOURCES } from "./catalog.ts";
import { applyFilters, facetCounts, type FacetCounts } from "./filter.ts";
import { COLOR_FAMILIES, PRODUCT_TYPES, QUALITIES, SIZE_ORDER } from "./taxonomy.ts";
import type { Filters, Product, SortKey } from "./types.ts";

export interface SearchHit {
  product: Product;
  unknownFields: string[];
  partial: boolean;
}

export interface SearchResponse {
  hits: SearchHit[];
  exactTotal: number;
  partialTotal: number;
  facets: FacetCounts;
}

const FACET_OPTIONS = {
  types: PRODUCT_TYPES,
  qualities: QUALITIES.slice(0, 4),
  colorFamilies: COLOR_FAMILIES,
  sizes: [...SIZE_ORDER.slice(1, 7), "Única"],
  sources: SOURCES,
};

/** Lo mínimo que necesita una tarjeta: el catálogo completo nunca viaja al celular. */
function toCard(p: Product): Product {
  return {
    ...p,
    source: { ...p.source, url: "" },
    rawDescription: "",
    evidence: {},
    extraction: { ...p.extraction, warnings: [] },
    shipping: undefined,
    images: p.images.slice(0, 1),
  };
}

export function search(filters: Filters, sort: SortKey, offset = 0, limit = 24): SearchResponse {
  const { exact, partial } = applyFilters(ALL_PRODUCTS, filters, sort);
  const all = [...exact.map((m) => ({ m, partial: false })), ...partial.map((m) => ({ m, partial: true }))];
  return {
    hits: all.slice(offset, offset + limit).map(({ m, partial }) => ({
      product: toCard(m.product),
      unknownFields: m.unknownFields,
      partial,
    })),
    exactTotal: exact.length,
    partialTotal: partial.length,
    facets: facetCounts(ALL_PRODUCTS, filters, FACET_OPTIONS),
  };
}
