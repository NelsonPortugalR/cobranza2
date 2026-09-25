import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // El catálogo se lee con fs en el servidor: hay que incluirlo en las funciones desplegadas.
  // URLs antiguas en español → nuevas en inglés (301).
  async redirects() {
    return [{ source: "/producto/:id", destination: "/products/:id", permanent: true }];
  },
  async headers() {
    return [{ source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }];
  },
  outputFileTracingIncludes: {
    "/**": ["./data/catalog.json", "./data/coverage.json", "./data/fx.json"],
  },
};

export default nextConfig;
