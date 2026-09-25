import type { Availability, Breed, ColorFamily, ProductType, Quality, Region } from "./types.ts";

/** Rangos de finura (µm) usados para clasificar. Orden: de más fino a más grueso. */
export const QUALITY_RANGES: { id: Quality; label: string; min: number; max: number }[] = [
  { id: "ultrafina", label: "Royal / ultrafine", min: 0, max: 18 },
  { id: "super_baby", label: "Super baby", min: 18.1, max: 20 },
  { id: "baby", label: "Baby", min: 20.1, max: 23 },
  { id: "fleece", label: "Fleece", min: 23.1, max: 26.5 },
  { id: "medium_fleece", label: "Medium fleece", min: 26.6, max: 29 },
  { id: "huarizo", label: "Huarizo", min: 29.1, max: 31.5 },
  { id: "gruesa", label: "Coarse", min: 31.6, max: 99 },
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
  chompa: "Sweaters",
  cardigan: "Cardigans",
  chal: "Shawls & wraps",
  poncho: "Ponchos & capes",
  gorro: "Hats & beanies",
  bufanda: "Scarves",
  guantes: "Gloves & mittens",
  abrigo: "Coats & jackets",
  chaleco: "Vests",
  medias: "Socks",
  fibra: "Yarn & fiber",
  home: "Home & throws",
  otro: "Other",
};

/** Singular para fichas y migas de pan. */
export const TYPE_SINGULAR: Record<ProductType, string> = {
  chompa: "Sweater",
  cardigan: "Cardigan",
  chal: "Shawl",
  poncho: "Poncho",
  gorro: "Hat",
  bufanda: "Scarf",
  guantes: "Gloves",
  abrigo: "Coat",
  chaleco: "Vest",
  medias: "Socks",
  fibra: "Yarn",
  home: "Home",
  otro: "Other",
};

export const BREED_LABEL: Record<Breed, string> = { huacaya: "Huacaya", suri: "Suri" };

export const COLOR_LABEL: Record<ColorFamily, string> = {
  blanco: "White & ivory",
  beige: "Beige & oatmeal",
  camel: "Camel",
  marron: "Brown",
  gris: "Gray",
  negro: "Black",
  azul: "Blue",
  verde: "Green",
  rojo: "Red & orange",
  rosa: "Pink & purple",
  amarillo: "Yellow & mustard",
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
  en_stock: "In stock",
  pocas_unidades: "Low stock",
  agotado: "Sold out",
  desconocido: "Stock not confirmed",
};

export const PRODUCT_TYPES = Object.keys(TYPE_LABEL) as ProductType[];
export const BREEDS = Object.keys(BREED_LABEL) as Breed[];
export const COLOR_FAMILIES = Object.keys(COLOR_LABEL) as ColorFamily[];
export const REGIONS = Object.keys(REGION_LABEL) as Region[];
export const QUALITIES = QUALITY_RANGES.map((q) => q.id);

/** Soles por dólar de respaldo, solo si nunca se pudo obtener el tipo de cambio del día. */
export const FALLBACK_PEN_PER_USD = 3.75;

export const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
