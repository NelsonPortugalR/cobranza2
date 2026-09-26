import type { Availability, Breed, ColorFamily, ProductType, Quality, Region } from "./types.ts";

/**
 * Grados tal como los nombran las tiendas, de más fino a más grueso. sortMicron solo sirve para
 * ordenar "finest first": no se muestra ni se atribuye a ningún producto.
 * official = clase equivalente de la NTP 231.301:2022 (null si es un nombre comercial).
 */
export const QUALITY_RANGES: { id: Quality; label: string; sortMicron: number; official: string | null }[] = [
  { id: "royal", label: "Royal", sortMicron: 18.5, official: null },
  { id: "imperial", label: "Imperial", sortMicron: 18.5, official: null },
  { id: "super_baby", label: "Super baby", sortMicron: 19, official: "Superfina" },
  { id: "baby", label: "Baby", sortMicron: 21.5, official: "Extrafina" },
  { id: "fleece", label: "Fleece", sortMicron: 25, official: "Fina" },
  { id: "medium_fleece", label: "Medium fleece", sortMicron: 28, official: "Semifina" },
  { id: "huarizo", label: "Huarizo", sortMicron: 30, official: "Semigruesa" },
  { id: "gruesa", label: "Coarse", sortMicron: 33, official: "Gruesa" },
];

/**
 * Clases oficiales de fibra de alpaca clasificada, NTP 231.301:2022, con su equivalente de la
 * versión 2014. Fuente: INACAL, CTN 055 (presentación de dic. 2024), verificada el 2026-09-26.
 */
export const NTP_SOURCE = {
  name: "NTP 231.301:2022 (INACAL, CTN 055)",
  url: "https://reglamentostecnicos.mincetur.gob.pe/informacion_general/eventos/diciembre_2024/06_Requisitos_calidad_fibra_alpaca.pdf",
  checkedOn: "2026-09-26",
};
export const NTP_CLASSES: { name2022: string; microns: string; name2014: string | null }[] = [
  { name2022: "Ultrafina", microns: "≤ 18", name2014: null },
  { name2022: "Superfina", microns: "18.1–20", name2014: "Super Baby" },
  { name2022: "Extrafina", microns: "20.1–23", name2014: "Baby" },
  { name2022: "Fina", microns: "23.1–26.5", name2014: "Fleece" },
  { name2022: "Semifina", microns: "26.6–29", name2014: "Medium Fleece" },
  { name2022: "Semigruesa", microns: "29.1–31.5", name2014: "Huarizo" },
  { name2022: "Gruesa", microns: "> 31.5", name2014: "Gruesa" },
];

/** Clase oficial 2022 para un diámetro medio declarado. */
export function officialClassFromMicron(micron: number): string {
  const m = Math.round(micron * 10) / 10;
  if (m <= 18) return "Ultrafina";
  if (m <= 20) return "Superfina";
  if (m <= 23) return "Extrafina";
  if (m <= 26.5) return "Fina";
  if (m <= 29) return "Semifina";
  if (m <= 31.5) return "Semigruesa";
  return "Gruesa";
}

export const QUALITY_LABEL = Object.fromEntries(
  QUALITY_RANGES.map((q) => [q.id, q.label]),
) as Record<Quality, string>;

/** Grados iguales o más finos que el dado ("baby" ⇒ baby, super baby, imperial, royal). */
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
