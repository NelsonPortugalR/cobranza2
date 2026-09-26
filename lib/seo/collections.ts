// Páginas de colección para SEO: cada combinación con demanda de búsqueda real
// ("baby alpaca sweaters", "women's alpaca cardigans", "alpaca scarves under $100")
// tiene su propia URL, título, texto y productos. Solo se generan las que tienen
// suficientes productos para no crear páginas pobres.

import { US_PRODUCTS } from "../catalog.ts";
import { applyFilters } from "../filter.ts";
import { DEFAULT_FILTERS } from "../types.ts";
import type { ColorFamily, Filters, Gender, Product, ProductType } from "../types.ts";
import { qualitiesAtLeast } from "../taxonomy.ts";

export const MIN_PRODUCTS = 8;

export interface Collection {
  slug: string;
  /** H1 y base del título. */
  name: string;
  /** Frase en minúsculas para usar dentro de oraciones ("baby alpaca sweaters"). */
  phrase: string;
  filters: Partial<Filters>;
  /** Colección "madre" para migas de pan y enlaces. */
  parent?: string;
  kind: "category" | "grade" | "gender" | "color" | "price" | "composition" | "sale" | "group";
  type?: ProductType;
  blurb: string;
}

interface CategoryDef {
  type: ProductType;
  slug: string;
  noun: string; // "Sweaters"
  blurb: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    type: "chompa",
    slug: "alpaca-sweaters",
    noun: "Sweaters",
    blurb:
      "Peruvian alpaca sweaters are prized for being warm yet light: alpaca fiber is naturally insulating and contains no lanolin, so it tends to feel less itchy than many wools.",
  },
  {
    type: "cardigan",
    slug: "alpaca-cardigans",
    noun: "Cardigans",
    blurb: "An alpaca cardigan is the easiest way to layer natural fiber over anything, from a tee to a button-down.",
  },
  {
    type: "bufanda",
    slug: "alpaca-scarves",
    noun: "Scarves",
    blurb: "Alpaca scarves are one of the most giftable pieces from Peru: light, warm and soft against the neck.",
  },
  {
    type: "chal",
    slug: "alpaca-shawls-and-wraps",
    noun: "Shawls & Wraps",
    blurb: "Alpaca shawls, stoles and wraps drape well and add warmth without bulk, from travel to evenings out.",
  },
  {
    type: "poncho",
    slug: "alpaca-ponchos-and-capes",
    noun: "Ponchos & Capes",
    blurb: "The poncho is an Andean classic; today's alpaca ponchos and capes are cut as modern, easy outer layers.",
  },
  {
    type: "gorro",
    slug: "alpaca-hats-and-beanies",
    noun: "Hats & Beanies",
    blurb: "Alpaca beanies and hats keep in heat without the itch many people feel with traditional wool.",
  },
  {
    type: "guantes",
    slug: "alpaca-gloves-and-mittens",
    noun: "Gloves & Mittens",
    blurb: "Alpaca gloves and mittens pair naturally with a matching scarf or beanie.",
  },
  {
    type: "abrigo",
    slug: "alpaca-coats-and-jackets",
    noun: "Coats & Jackets",
    blurb: "Alpaca coats and jackets range from knitted jackets to tailored wool-and-alpaca overcoats.",
  },
  { type: "chaleco", slug: "alpaca-vests", noun: "Vests", blurb: "Alpaca vests add a warm layer while keeping arms free." },
  {
    type: "medias",
    slug: "alpaca-socks",
    noun: "Socks",
    blurb: "Alpaca socks are usually blended with nylon for durability; check the fiber content to compare warmth and wear.",
  },
  {
    type: "home",
    slug: "alpaca-throws-and-blankets",
    noun: "Throws & Blankets",
    blurb: "An alpaca throw brings natural fiber into the home: warm, light and naturally breathable.",
  },
  { type: "fibra", slug: "alpaca-yarn", noun: "Yarn", blurb: "Alpaca yarn for knitters, straight from Peruvian mills and makers." },
];

const COLORS: [ColorFamily, string][] = [
  ["negro", "Black"],
  ["gris", "Gray"],
  ["marron", "Brown"],
  ["camel", "Camel"],
  ["beige", "Beige"],
  ["blanco", "White"],
  ["azul", "Blue"],
  ["verde", "Green"],
  ["rojo", "Red"],
  ["rosa", "Pink"],
];

const PRICE_CAPS = [50, 100, 150, 200, 300];

const lower = (s: string) => s.toLowerCase();

function count(filters: Partial<Filters>): number {
  return applyFilters(US_PRODUCTS, { ...DEFAULT_FILTERS, ...filters }, "relevancia").exact.length;
}

function build(): Collection[] {
  const out: Collection[] = [];
  const add = (c: Collection) => {
    if (count(c.filters) >= MIN_PRODUCTS) out.push(c);
  };

  // Grupos transversales.
  add({
    slug: "baby-alpaca",
    name: "Baby Alpaca",
    phrase: "baby alpaca pieces",
    filters: { qualities: qualitiesAtLeast("baby") },
    kind: "grade",
    blurb:
      "“Baby alpaca” refers to the fineness of the fiber, not the age of the animal. It is one of the softest grades sold by Peruvian makers.",
  });
  add({
    slug: "royal-alpaca",
    name: "Royal Alpaca",
    phrase: "royal alpaca pieces",
    filters: { qualities: ["royal"] },
    kind: "grade",
    blurb: "Royal alpaca is the name brands use for their finest, rarest alpaca fiber, with a hand often compared to cashmere.",
  });
  add({
    slug: "alpaca-accessories",
    name: "Alpaca Accessories",
    phrase: "alpaca accessories",
    filters: { types: ["bufanda", "gorro", "guantes", "chal"] },
    kind: "group",
    blurb: "Scarves, wraps, beanies and gloves: the easiest way to try alpaca, and the most popular gifts from Peru.",
  });
  add({
    slug: "alpaca-on-sale",
    name: "Alpaca on Sale",
    phrase: "discounted alpaca pieces",
    filters: {},
    kind: "sale",
    blurb: "Peruvian alpaca currently marked down by the makers themselves. Prices are refreshed with every catalog update.",
  });
  for (const [g, label] of [
    ["women", "Women's"],
    ["men", "Men's"],
  ] as [Gender, string][]) {
    add({
      slug: `${g === "women" ? "womens" : "mens"}-alpaca-clothing`,
      name: `${label} Alpaca Clothing`,
      phrase: `${lower(label)} alpaca clothing`,
      filters: { genders: [g] },
      kind: "gender",
      blurb: `${label} sweaters, cardigans, coats and accessories in Peruvian alpaca, compared across makers.`,
    });
  }

  for (const c of CATEGORIES) {
    const base: Partial<Filters> = { types: [c.type] };
    const phrase = `alpaca ${lower(c.noun)}`;
    add({ slug: c.slug, name: `Alpaca ${c.noun}`, phrase, filters: base, kind: "category", type: c.type, blurb: c.blurb });

    add({
      slug: `baby-${c.slug}`,
      name: `Baby Alpaca ${c.noun}`,
      phrase: `baby ${phrase}`,
      filters: { ...base, qualities: qualitiesAtLeast("baby") },
      parent: c.slug,
      kind: "grade",
      type: c.type,
      blurb: `Baby alpaca ${lower(c.noun)} use one of the finest grades of alpaca fiber; “baby” describes the fiber, not the animal's age.`,
    });
    add({
      slug: `royal-${c.slug}`,
      name: `Royal Alpaca ${c.noun}`,
      phrase: `royal ${phrase}`,
      filters: { ...base, qualities: ["royal"] },
      parent: c.slug,
      kind: "grade",
      type: c.type,
      blurb: `Royal alpaca is the finest grade most brands offer, used for their most luxurious ${lower(c.noun)}.`,
    });
    add({
      slug: c.slug.replace("alpaca-", "100-percent-alpaca-"),
      name: `100% Alpaca ${c.noun}`,
      phrase: `100% ${phrase}`,
      filters: { ...base, alpacaRanges: ["100"] },
      parent: c.slug,
      kind: "composition",
      type: c.type,
      blurb: `These ${lower(c.noun)} are made entirely of alpaca, with no wool, silk or synthetic blend, as stated by each store.`,
    });
    for (const [g, label] of [
      ["women", "Women's"],
      ["men", "Men's"],
    ] as [Gender, string][]) {
      add({
        slug: `${g === "women" ? "womens" : "mens"}-${c.slug}`,
        name: `${label} Alpaca ${c.noun}`,
        phrase: `${lower(label)} ${phrase}`,
        filters: { ...base, genders: [g] },
        parent: c.slug,
        kind: "gender",
        type: c.type,
        blurb: `${label} alpaca ${lower(c.noun)} from Peru's leading makers, including unisex styles.`,
      });
    }
    for (const [family, color] of COLORS) {
      add({
        slug: `${lower(color)}-${c.slug}`,
        name: `${color} Alpaca ${c.noun}`,
        phrase: `${lower(color)} ${phrase}`,
        filters: { ...base, colorFamilies: [family] },
        parent: c.slug,
        kind: "color",
        type: c.type,
        blurb: `${color} alpaca ${lower(c.noun)}, grouped by color family across each brand's own color names.`,
      });
    }
    const total = count(base);
    for (const cap of PRICE_CAPS) {
      const n = count({ ...base, priceMax: cap });
      if (n >= MIN_PRODUCTS && n <= total * 0.85) {
        add({
          slug: `${c.slug}-under-${cap}`,
          name: `Alpaca ${c.noun} Under $${cap}`,
          phrase: `${phrase} under $${cap}`,
          filters: { ...base, priceMax: cap },
          parent: c.slug,
          kind: "price",
          type: c.type,
          blurb: `Authentic Peruvian alpaca ${lower(c.noun)} priced under $${cap}, converted to USD at the day's exchange rate when a store sells in soles.`,
        });
      }
    }
  }
  return out;
}

export const COLLECTIONS: Collection[] = build();
const BY_SLUG = new Map(COLLECTIONS.map((c) => [c.slug, c]));

export const getCollection = (slug: string) => BY_SLUG.get(slug);
export const CATEGORY_COLLECTIONS = COLLECTIONS.filter((c) => c.kind === "category");
export const categoryCollectionFor = (type: ProductType) => CATEGORY_COLLECTIONS.find((c) => c.type === type);

export function collectionProducts(c: Collection): Product[] {
  const r = applyFilters(US_PRODUCTS, { ...DEFAULT_FILTERS, ...c.filters }, "relevancia").exact.map((m) => m.product);
  return c.kind === "sale" ? r.filter((p) => p.price.compareAt) : r;
}

export interface CollectionStats {
  count: number;
  brands: string[];
  min: number;
  max: number;
  median: number;
}

export function collectionStats(products: Product[]): CollectionStats {
  const prices = products.map((p) => p.price.amountUsd).sort((a, b) => a - b);
  const brands = [...new Set(products.map((p) => p.seller.name))];
  return {
    count: products.length,
    brands,
    min: Math.floor(prices[0] ?? 0),
    max: Math.ceil(prices.at(-1) ?? 0),
    median: Math.round(prices[Math.floor(prices.length / 2)] ?? 0),
  };
}

/** Colecciones hermanas para enlazado interno (misma categoría, otros atributos). */
export function relatedCollections(c: Collection, limit = 12): Collection[] {
  const root = c.parent ?? (c.kind === "category" ? c.slug : undefined);
  const siblings = COLLECTIONS.filter((x) => x.slug !== c.slug && (x.parent === root || x.slug === root));
  const others = CATEGORY_COLLECTIONS.filter((x) => x.slug !== c.slug && x.slug !== root);
  return [...siblings, ...others].slice(0, limit);
}

/** Colecciones en las que aparece un producto (para enlazar desde la ficha). */
export function collectionsForProduct(p: Product, limit = 6): Collection[] {
  return COLLECTIONS.filter((c) => c.type === p.productType && c.kind !== "price")
    .filter((c) => applyFilters([p], { ...DEFAULT_FILTERS, ...c.filters }, "relevancia").exact.length === 1)
    .slice(0, limit);
}
