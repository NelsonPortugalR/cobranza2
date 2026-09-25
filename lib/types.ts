// Modelo de datos normalizado. Ver schema/product.schema.json para la versión JSON Schema.

export type ProductType =
  | "chompa"
  | "cardigan"
  | "chal"
  | "poncho"
  | "gorro"
  | "bufanda"
  | "guantes"
  | "fibra"
  | "home";

/** Categorías de finura según NTP 231.301 (rangos en micras). */
export type Quality =
  | "ultrafina"
  | "super_baby"
  | "baby"
  | "fleece"
  | "medium_fleece"
  | "huarizo"
  | "gruesa";

export type Breed = "huacaya" | "suri";

export type ColorFamily =
  | "blanco"
  | "beige"
  | "camel"
  | "marron"
  | "gris"
  | "negro"
  | "azul"
  | "verde"
  | "rojo"
  | "multicolor";

export type Region =
  | "puno"
  | "cusco"
  | "arequipa"
  | "huancavelica"
  | "junin"
  | "ayacucho"
  | "apurimac";

export type Availability = "en_stock" | "pocas_unidades" | "agotado" | "desconocido";

export type AcquisitionMethod = "api" | "feed" | "scrape" | "manual";

/** Cómo se obtuvo un dato normalizado: declarado literalmente por la tienda o inferido por el agente. */
export type Provenance = "declarado" | "inferido" | "desconocido";

export interface FieldEvidence {
  provenance: Provenance;
  /** 0–1. Confianza del extractor en el valor normalizado. */
  confidence: number;
  /** Fragmento literal de la descripción original que justifica el valor. */
  quote?: string;
}

export interface Product {
  id: string;
  title: string;
  source: {
    site: string;
    url: string;
    method: AcquisitionMethod;
    retrievedAt: string; // ISO 8601
  };
  seller: { name: string; city?: string };
  productType: ProductType;
  fiber: {
    /** % de alpaca en la composición total (0–100). */
    alpacaPct: number | null;
    composition: { material: string; pct: number }[];
    quality: Quality | null;
    /** Diámetro medio de fibra en micras, si se declara o puede inferirse. */
    micron: number | null;
    breed: Breed | null;
  };
  color: {
    name: string;
    family: ColorFamily;
    hex: string;
    /** true = color natural de la fibra (sin teñir); null = no se sabe. */
    natural: boolean | null;
  };
  origin: { region: Region | null; detail?: string };
  construction?: "tejido_a_mano" | "tejido_a_maquina" | "telar" | null;
  weightGrams?: number | null;
  sizes?: string[];
  price: { amount: number; currency: "PEN" | "USD"; amountPen: number };
  availability: { status: Availability; checkedAt: string };
  images: string[];
  rawDescription: string;
  evidence: Partial<
    Record<"quality" | "micron" | "breed" | "natural" | "origin" | "alpacaPct", FieldEvidence>
  >;
  extraction: {
    engine: string;
    version: string;
    confidence: number;
    warnings: string[];
  };
}

export type SortKey = "relevancia" | "micras_asc" | "precio_asc" | "precio_desc";

export interface Filters {
  text: string;
  types: ProductType[];
  qualities: Quality[];
  breeds: Breed[];
  colorFamilies: ColorFamily[];
  dye: "cualquiera" | "natural" | "tenido";
  origins: Region[];
  composition: "cualquiera" | "100" | "mezcla";
  priceMin: number | null;
  priceMax: number | null;
  inStockOnly: boolean;
  sources: string[];
}

export interface InterpretationChip {
  field: keyof Filters | "sort";
  label: string;
  /** Texto del usuario que originó este filtro. */
  from: string;
}

export interface ParsedQuery {
  filters: Filters;
  sort: SortKey;
  chips: InterpretationChip[];
  engine: "local" | "claude";
}

export const EMPTY_FILTERS: Filters = {
  text: "",
  types: [],
  qualities: [],
  breeds: [],
  colorFamilies: [],
  dye: "cualquiera",
  origins: [],
  composition: "cualquiera",
  priceMin: null,
  priceMax: null,
  inStockOnly: false,
  sources: [],
};
