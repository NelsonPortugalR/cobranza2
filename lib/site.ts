// Configuración pública del sitio. El dominio y el nombre se cambian con variables de entorno
// en Netlify, sin tocar código:
//   NEXT_PUBLIC_SITE_URL=https://alpacaatlas.com
//   NEXT_PUBLIC_SITE_NAME="Alpaca Atlas"
//   SITE_INDEXABLE=true         ← solo cuando el sitio sea público (antes, todo va con noindex)
//   GOOGLE_SITE_VERIFICATION=…  BING_SITE_VERIFICATION=…

export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Alpaca Atlas",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vellon-alpaca.netlify.app").replace(/\/$/, ""),
  tagline: "Peruvian alpaca, compared",
  description:
    "Peruvian alpaca sweaters, cardigans, scarves and accessories compared straight from the makers' stores: fiber content, sizes, shipping and USD prices, all sourced.",
  /** Hasta que no se active explícitamente, ningún buscador indexa el sitio (fase privada). */
  indexable: process.env.SITE_INDEXABLE === "true",
  locale: "en_US",
};

export const absoluteUrl = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;

/** Imagen para compartir por defecto (app/opengraph-image.tsx), 1200×630. */
export const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE.name}: ${SITE.tagline}` };

const TITLE_MAX = 60;
/**
 * Elige el primer título que, con " | Alpaca Atlas", quepa en lo que muestra Google (~60
 * caracteres); si ninguno cabe, el primero que quepa sin la marca, y si no, el más corto.
 */
export function fitTitle(...candidates: string[]): { absolute: string } {
  const suffix = ` | ${SITE.name}`;
  const withBrand = candidates.find((c) => c.length + suffix.length <= TITLE_MAX);
  if (withBrand) return { absolute: withBrand + suffix };
  const bare = candidates.find((c) => c.length <= TITLE_MAX);
  return { absolute: bare ?? [...candidates].sort((a, b) => a.length - b.length)[0] };
}

/** Recorta una meta descripción a ~160 caracteres sin cortar palabras. */
export function clampDescription(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:·—–-]+$/, "") + "…";
}
