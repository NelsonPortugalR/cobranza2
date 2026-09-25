import type { Filters, SortKey } from "./types.ts";
import { BREED_LABEL, COLOR_LABEL, QUALITY_LABEL, QUALITY_RANGES, REGION_LABEL, TYPE_LABEL, USD_PEN, qualitiesAtLeast } from "./taxonomy.ts";

export interface ActiveChip {
  key: string;
  label: string;
  /** Parche que quita este filtro. */
  remove: Partial<Filters>;
}

/** Chips visibles derivados de los filtros actuales (vengan del parser o del panel). */
export function chipsFromFilters(f: Filters): ActiveChip[] {
  const chips: ActiveChip[] = [];
  for (const t of f.types) chips.push({ key: `t-${t}`, label: TYPE_LABEL[t], remove: { types: f.types.filter((x) => x !== t) } });

  if (f.qualities.length) {
    const coarsest = QUALITY_RANGES.filter((q) => f.qualities.includes(q.id)).at(-1)!.id;
    const isAtLeast =
      f.qualities.length > 1 && qualitiesAtLeast(coarsest).every((q) => f.qualities.includes(q)) && f.qualities.length === qualitiesAtLeast(coarsest).length;
    const max = QUALITY_RANGES.find((q) => q.id === coarsest)!.max;
    chips.push({
      key: "q",
      label: isAtLeast ? `${QUALITY_LABEL[coarsest]} o superior` : f.qualities.map((q) => QUALITY_LABEL[q]).join(" / "),
      remove: { qualities: [] },
    });
  }
  for (const b of f.breeds) chips.push({ key: `b-${b}`, label: BREED_LABEL[b], remove: { breeds: f.breeds.filter((x) => x !== b) } });
  for (const c of f.colorFamilies)
    chips.push({ key: `c-${c}`, label: COLOR_LABEL[c], remove: { colorFamilies: f.colorFamilies.filter((x) => x !== c) } });
  if (f.dye !== "cualquiera") chips.push({ key: "dye", label: f.dye === "natural" ? "Color natural" : "Teñido", remove: { dye: "cualquiera" } });
  for (const r of f.origins)
    chips.push({ key: `o-${r}`, label: `Origen: ${REGION_LABEL[r]}`, remove: { origins: f.origins.filter((x) => x !== r) } });
  if (f.composition !== "cualquiera")
    chips.push({ key: "comp", label: f.composition === "100" ? "100% alpaca" : "Mezcla", remove: { composition: "cualquiera" } });
  const money = (pen: number) => (f.priceCurrency === "USD" ? `US$ ${Math.round(pen / USD_PEN)}` : `S/ ${pen}`);
  if (f.sizes.length) chips.push({ key: "sizes", label: `Talla ${f.sizes.join(", ")}`, remove: { sizes: [] } });
  if (f.priceMin != null) chips.push({ key: "pmin", label: `Desde ${money(f.priceMin)}`, remove: { priceMin: null } });
  if (f.priceMax != null) chips.push({ key: "pmax", label: `Hasta ${money(f.priceMax)}`, remove: { priceMax: null } });
  if (f.inStockOnly) chips.push({ key: "stock", label: "En stock", remove: { inStockOnly: false } });
  for (const s of f.sources) chips.push({ key: `s-${s}`, label: s, remove: { sources: f.sources.filter((x) => x !== s) } });
  if (f.text) chips.push({ key: "text", label: `“${f.text}”`, remove: { text: "" } });
  return chips;
}

export const SORT_LABEL: Record<SortKey, string> = {
  relevancia: "Relevancia",
  micras_asc: "Mejor calidad primero",
  precio_asc: "Precio: menor a mayor",
  precio_desc: "Precio: mayor a menor",
};
