import type { Availability, Breed, ColorFamily, ProductType, Quality, Region } from "./types.ts";

/** Rangos de finura (µm) usados para clasificar. Orden: de más fino a más grueso. */
export const QUALITY_RANGES: { id: Quality; label: string; min: number; max: number }[] = [
  { id: "ultrafina", label: "Ultrafina", min: 0, max: 18 },
  { id: "super_baby", label: "Super Baby", min: 18.1, max: 20 },
  { id: "baby", label: "Baby", min: 20.1, max: 23 },
  { id: "fleece", label: "Fleece", min: 23.1, max: 26.5 },
  { id: "medium_fleece", label: "Medium Fleece", min: 26.6, max: 29 },
  { id: "huarizo", label: "Huarizo", min: 29.1, max: 31.5 },
  { id: "gruesa", label: "Gruesa", min: 31.6, max: 99 },
];

export const QUALITY_LABEL = Object.fromEntries(
  QUALITY_RANGES.map((q) => [q.id, q.label]),
) as Record<Quality, string>;

export function qualityFromMicron(micron: number): Quality {
  const rounded = Math.round(micron * 10) / 10;
  return (QUALITY_RANGES.find((q) => rounded <= q.max) ?? QUALITY_RANGES.at(-1)!).id;
}

export function micronRangeLabel(q: Quality): string {
  const r = QUALITY_RANGES.find((x) => x.id === q)!;
  if (r.min === 0) return `≤ ${r.max} µm`;
  if (r.max === 99) return `> ${r.min - 0.1} µm`;
  return `${r.min}–${r.max} µm`;
}

/** Calidades iguales o más finas que la dada ("baby" ⇒ baby, super baby, ultrafina). */
export function qualitiesAtLeast(q: Quality): Quality[] {
  const idx = QUALITY_RANGES.findIndex((x) => x.id === q);
  return QUALITY_RANGES.slice(0, idx + 1).map((x) => x.id);
}

export const TYPE_LABEL: Record<ProductType, string> = {
  chompa: "Chompa",
  cardigan: "Cárdigan",
  chal: "Chal",
  poncho: "Poncho",
  gorro: "Gorro / chullo",
  bufanda: "Bufanda",
  guantes: "Guantes",
  abrigo: "Abrigo / casaca",
  chaleco: "Chaleco",
  medias: "Medias",
  fibra: "Fibra e hilo",
  home: "Home / mantas",
  otro: "Otros",
};

export const BREED_LABEL: Record<Breed, string> = { huacaya: "Huacaya", suri: "Suri" };

export const COLOR_LABEL: Record<ColorFamily, string> = {
  blanco: "Blanco / crudo",
  beige: "Beige",
  camel: "Camel / vicuña",
  marron: "Marrón",
  gris: "Gris",
  negro: "Negro",
  azul: "Azul",
  verde: "Verde",
  rojo: "Rojo / naranja",
  rosa: "Rosa / morado",
  amarillo: "Amarillo / mostaza",
  multicolor: "Multicolor",
};

export const COLOR_SWATCH: Record<ColorFamily, string> = {
  blanco: "#F3EEE3",
  beige: "#D9C7A7",
  camel: "#B8895A",
  marron: "#6E4B32",
  gris: "#9A958D",
  negro: "#2B2825",
  azul: "#3E5570",
  verde: "#5B6B4E",
  rojo: "#9C4A35",
  rosa: "#B77A8C",
  amarillo: "#C9A23F",
  multicolor: "conic-gradient(#9C4A35, #D9C7A7, #3E5570, #5B6B4E, #9C4A35)",
};

export const REGION_LABEL: Record<Region, string> = {
  puno: "Puno",
  cusco: "Cusco",
  arequipa: "Arequipa",
  huancavelica: "Huancavelica",
  junin: "Junín",
  ayacucho: "Ayacucho",
  apurimac: "Apurímac",
};

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  en_stock: "En stock",
  pocas_unidades: "Pocas unidades",
  agotado: "Agotado",
  desconocido: "Stock sin confirmar",
};

export const PRODUCT_TYPES = Object.keys(TYPE_LABEL) as ProductType[];
export const BREEDS = Object.keys(BREED_LABEL) as Breed[];
export const COLOR_FAMILIES = Object.keys(COLOR_LABEL) as ColorFamily[];
export const REGIONS = Object.keys(REGION_LABEL) as Region[];
export const QUALITIES = QUALITY_RANGES.map((q) => q.id);

/** Tipo de cambio referencial PEN por USD. En producción: tipo de cambio diario del BCRP. */
export const USD_PEN = 3.75;

export const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
