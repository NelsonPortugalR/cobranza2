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
    "Compare authentic Peruvian alpaca sweaters, cardigans, scarves and accessories from Peru's top makers: fiber content, sizes in stock and USD prices.",
  /** Hasta que no se active explícitamente, ningún buscador indexa el sitio (fase privada). */
  indexable: process.env.SITE_INDEXABLE === "true",
  locale: "en_US",
};

export const absoluteUrl = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
