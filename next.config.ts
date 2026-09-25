import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // El catálogo se lee con fs en el servidor: hay que incluirlo en las funciones desplegadas.
  outputFileTracingIncludes: {
    "/**": ["./data/catalog.json", "./data/coverage.json", "./data/fx.json"],
  },
};

export default nextConfig;
