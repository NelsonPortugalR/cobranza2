import type { AlpacaRange, CompositionStatus, FiberFamily } from "./fiber.ts";
import type { FeesOnDelivery, ShipsFrom } from "./policies.ts";
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

/**
 * Grado de fibra tal como lo nombra la tienda. "royal" e "imperial" son nombres comerciales
 * (no son clases de la NTP); super baby y baby coinciden con las clases de la NTP 231.301:2014.
 */
export type Quality =
  | "royal"
  | "imperial"
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

export type Gender = "women" | "men" | "unisex";

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
  /** Título tal como lo publica la tienda, si se tradujo al inglés. */
  titleOriginal?: string;
  /** Slug en inglés para la URL pública (/products/<slug>); se asigna al cargar el catálogo. */
  slug?: string;
  /** Para quién es la prenda, según etiquetas, título u opciones de la tienda. null = no lo indica. */
  gender?: Gender | null;
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
    /** Composición con porcentajes tal como la publica la tienda; family = vocabulario controlado. */
    composition: { material: string; pct: number; family?: FiberFamily }[];
    /** Cómo publica la tienda la composición (ver lib/fiber.ts). */
    compositionStatus?: CompositionStatus;
    /** true = lleva acrílico o poliéster; false = composición completa sin ellos; null = no se sabe. */
    hasSynthetics?: boolean | null;
    /** Familias de fibra mencionadas (con o sin porcentaje). */
    families?: FiberFamily[];
    /** Materiales nombrados sin porcentaje ("baby alpaca y seda"). */
    materials?: string[];
    /** true = la tienda dice que es mezcla aunque no dé porcentajes. */
    blend?: boolean;
    quality: Quality | null;
    /** Diámetro de fibra en micras, solo si la tienda lo declara (cita en evidence.micron). */
    micron: number | null;
    /** "max" = la tienda da un tope ("under 19 microns"); "exact" = un valor. */
    micronKind?: "max" | "exact";
    /** Nombre del grado tal como lo escribe la tienda ("Royal Alpaca", "Imperial Alpaca"). */
    gradeName?: string;
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
  /** amount/compareAt en la moneda de la tienda; amountUsd convertido con el tipo de cambio del día de la descarga. */
  price: { amount: number; currency: "PEN" | "USD"; amountUsd: number; compareAt?: number | null };
  shipping?: {
    summary: string;
    costUsd?: number | null;
    days?: string;
    /** true = la tienda envía a EE. UU.; null = no lo publica. */
    toUS: boolean | null;
    /** Desde dónde sale el paquete, según la política de la tienda (data/policies.json). */
    shipsFrom?: ShipsFrom;
    /** Si el comprador en EE. UU. puede pagar aranceles al recibir. */
    feesOnDelivery?: FeesOnDelivery;
    freeShippingOverUsd?: number | null;
    deliveryDays?: { min: number; max: number } | null;
    returnsDays?: number | null;
    policyUrl?: string;
    returnsUrl?: string;
    /** Fecha en que se revisó la política. */
    checkedOn?: string;
    evidence?: Partial<Record<"shipsFrom" | "feesOnDelivery" | "freeShipping" | "deliveryDays" | "returns", { provenance: "stated" | "inferred"; quote: string }>>;
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
  /** Rangos de % de alpaca (vacío = cualquiera). */
  alpacaRanges: AlpacaRange[];
  /** Sin acrílico ni poliéster. */
  noSynthetics: boolean;
  /** Tallas pedidas (S, M, L…). Se exige stock en esa talla. */
  sizes: string[];
  /** Mujer / hombre. "unisex" cumple ambos. */
  genders: Gender[];
  /** Límites de precio en USD. */
  priceMin: number | null;
  priceMax: number | null;
  inStockOnly: boolean;
  /** Solo tiendas que envían a EE. UU. (activo por defecto: público objetivo). */
  shipsToUS: boolean;
  /** Desde dónde sale el paquete (vacío = cualquiera). */
  shipsFrom: ("US" | "Peru")[];
  /** Sin aranceles al recibir en EE. UU. */
  noFeesOnDelivery: boolean;
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
  alpacaRanges: [],
  noSynthetics: false,
  sizes: [],
  genders: [],
  priceMin: null,
  priceMax: null,
  inStockOnly: false,
  shipsToUS: false,
  shipsFrom: [],
  noFeesOnDelivery: false,
  sources: [],
  includeDemo: false,
};

/** Filtros iniciales del portal: el público es de EE. UU., así que solo tiendas que envían allá. */
export const DEFAULT_FILTERS: Filters = { ...EMPTY_FILTERS, shipsToUS: true };
