import type { Filters, SortKey } from "./types.ts";
import { BREED_LABEL, COLOR_LABEL, QUALITY_LABEL, QUALITY_RANGES, REGION_LABEL, TYPE_LABEL, qualitiesAtLeast } from "./taxonomy.ts";

export interface ActiveChip {
  key: string;
  label: string;
  /** Parche que quita este filtro. */
  remove: Partial<Filters>;
}

/** Chips visibles derivados de los filtros actuales (vengan del parser o del panel). */
export function chipsFromFilters(f: Filters): ActiveChip[] {
  const chips: ActiveChip[] = [];
  for (const g of f.genders)
    chips.push({ key: `g-${g}`, label: g === "women" ? "Women" : "Men", remove: { genders: f.genders.filter((x) => x !== g) } });
  for (const t of f.types) chips.push({ key: `t-${t}`, label: TYPE_LABEL[t], remove: { types: f.types.filter((x) => x !== t) } });

  if (f.qualities.length) {
    const coarsest = QUALITY_RANGES.filter((q) => f.qualities.includes(q.id)).at(-1)!.id;
    const isAtLeast =
      f.qualities.length > 1 && qualitiesAtLeast(coarsest).every((q) => f.qualities.includes(q)) && f.qualities.length === qualitiesAtLeast(coarsest).length;
    chips.push({
      key: "q",
      label: isAtLeast ? `${QUALITY_LABEL[coarsest]} or finer` : f.qualities.map((q) => QUALITY_LABEL[q]).join(" / "),
      remove: { qualities: [] },
    });
  }
  for (const b of f.breeds) chips.push({ key: `b-${b}`, label: BREED_LABEL[b], remove: { breeds: f.breeds.filter((x) => x !== b) } });
  for (const c of f.colorFamilies)
    chips.push({ key: `c-${c}`, label: COLOR_LABEL[c], remove: { colorFamilies: f.colorFamilies.filter((x) => x !== c) } });
  if (f.dye !== "cualquiera") chips.push({ key: "dye", label: f.dye === "natural" ? "Natural, undyed" : "Dyed", remove: { dye: "cualquiera" } });
  for (const r of f.origins)
    chips.push({ key: `o-${r}`, label: `Origin: ${REGION_LABEL[r]}`, remove: { origins: f.origins.filter((x) => x !== r) } });
  if (f.composition !== "cualquiera")
    chips.push({ key: "comp", label: f.composition === "100" ? "100% alpaca" : "Alpaca blend", remove: { composition: "cualquiera" } });
  if (f.sizes.length) chips.push({ key: "sizes", label: `Size ${f.sizes.map((x) => (x === "Única" ? "one size" : x)).join(", ")}`, remove: { sizes: [] } });
  if (f.priceMin != null) chips.push({ key: "pmin", label: `Over $${f.priceMin}`, remove: { priceMin: null } });
  if (f.priceMax != null) chips.push({ key: "pmax", label: `Under $${f.priceMax}`, remove: { priceMax: null } });
  if (f.inStockOnly) chips.push({ key: "stock", label: "In stock", remove: { inStockOnly: false } });
  for (const s of f.sources) chips.push({ key: `s-${s}`, label: s, remove: { sources: f.sources.filter((x) => x !== s) } });
  if (f.text) chips.push({ key: "text", label: `“${f.text}”`, remove: { text: "" } });
  return chips;
}

export const SORT_LABEL: Record<SortKey, string> = {
  relevancia: "Best match",
  micras_asc: "Finest fiber first",
  precio_asc: "Price: low to high",
  precio_desc: "Price: high to low",
};
