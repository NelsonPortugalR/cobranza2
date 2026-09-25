// Modelo de datos normalizado. Ver schema/product.schema.json para la versión JSON Schema.

export type ProductType =
  | "chompa"
  | "cardigan"
  | "chal"
  | "poncho"
  | "gorro"
  | "bufanda"
  | "guantes"
  | "abrigo"
  | "chaleco"
  | "medias"
  | "fibra"
  | "home"
  | "otro";

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
  | "rosa"
  | "amarillo"
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
  /** true = producto inventado para la demo (no es un listado real). */
  demo?: boolean;
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
    /** Materiales nombrados sin porcentaje ("baby alpaca y seda"). */
    materials?: string[];
    /** true = la tienda dice que es mezcla aunque no dé porcentajes. */
    blend?: boolean;
    quality: Quality | null;
    /** Diámetro medio de fibra en micras, si se declara o puede inferirse. */
    micron: number | null;
    breed: Breed | null;
  };
  color: {
    name: string;
    /** null = el nombre comercial no permite clasificarlo (p. ej. "rainy day"). */
    family: ColorFamily | null;
    hex: string;
    /** true = color natural de la fibra (sin teñir); null = no se sabe. */
    natural: boolean | null;
  };
  origin: { region: Region | null; detail?: string };
  construction?: "tejido_a_mano" | "tejido_a_maquina" | "telar" | null;
  weightGrams?: number | null;
  sizes?: string[];
  /** Tallas con stock según la tienda. Si falta, no se sabe. */
  sizesAvailable?: string[];
  price: { amount: number; currency: "PEN" | "USD"; amountPen: number; compareAt?: number | null };
  shipping?: {
    summary: string;
    costUsd?: number | null;
    days?: string;
    /** true = la política de la tienda incluye envíos a Perú; null = no lo publica. */
    toPeru: boolean | null;
  };
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
  /** Tallas pedidas (S, M, L…). Se exige stock en esa talla. */
  sizes: string[];
  /** Límites de precio siempre en soles; la moneda indica cómo lo pidió el usuario. */
  priceMin: number | null;
  priceMax: number | null;
  priceCurrency: "PEN" | "USD";
  inStockOnly: boolean;
  /** Solo tiendas cuya política de envío incluye Perú. */
  shipsToPeru: boolean;
  sources: string[];
  /** Mostrar también productos de ejemplo de tiendas aún no conectadas. */
  includeDemo: boolean;
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
  sizes: [],
  priceMin: null,
  priceMax: null,
  priceCurrency: "PEN",
  inStockOnly: false,
  shipsToPeru: false,
  sources: [],
  includeDemo: false,
};
