import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sin cabecera "X-Powered-By: Next.js".
  poweredByHeader: false,
  // El catálogo se lee con fs en el servidor: hay que incluirlo en las funciones desplegadas.
  // URLs antiguas en español → nuevas en inglés (301).
  async redirects() {
    return [
      { source: "/producto/:id", destination: "/products/:id", permanent: true },
      // Colección que quedó con menos de 8 piezas al excluir hilo de merino que no era alpaca.
      { source: "/beige-alpaca-yarn", destination: "/alpaca-yarn", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }];
  },
  outputFileTracingIncludes: {
    "/**": ["./data/catalog.json", "./data/coverage.json", "./data/fx.json"],
    // El registro de búsquedas importa @netlify/blobs de forma dinámica: hay que incluirlo a mano.
    "/api/log": ["./node_modules/@netlify/blobs/**"],
    "/api/admin/search-report": ["./node_modules/@netlify/blobs/**"],
  },
};

export default nextConfig;
