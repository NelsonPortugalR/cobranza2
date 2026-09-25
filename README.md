# Vellón: catálogo vertical de alpaca peruana

Un agente lee listados públicos de tiendas peruanas y marketplaces (Sol Alpaca, Kuna, All Alpaca, Mercado Libre Perú, Etsy, tiendas de Cusco y Arequipa) y los convierte en un **catálogo filtrable** por micronaje (NTP 231.301), raza, color natural o teñido, % de alpaca, origen, precio y stock. No es un chatbot ni un marketplace: la compra se hace en la tienda original.

📄 **Documento de producto** (visión, arquitectura, schema, pantallas, flujo del agente y limitaciones): [`docs/PRODUCTO.md`](docs/PRODUCTO.md)
🧩 **JSON Schema del producto**: [`schema/product.schema.json`](schema/product.schema.json)

> **Datos reales:** 6.631 prendas con stock de 14 tiendas (Sol Alpaca, Kuna Perú y USA, Alpaca Collections, Anntarah, Peruvian Link, PAKA, Pure Alpaca, Peruvian Connection, Incalpaca Remate, Qinti, All Alpaca, Etno Alpaca, Krimson Klover), leídas de sus catálogos públicos con `npm run ingest`. Comparamos solo lo que publican: tipo, composición, calidad, color, tallas con stock, precio y envío. Detalle en [`docs/PRODUCTO.md` §8](docs/PRODUCTO.md#8-primera-validación-con-datos-reales-25-sep-2026).

## Correr en local

```bash
npm install
npm run ingest       # descarga y normaliza las fuentes → data/catalog.json
npm run ingest -- --cache   # re-normaliza desde data/raw/ sin descargar
npm run dev          # http://localhost:3000
npm test             # tests del parser y del motor de filtros
npm run build
```

La consulta en lenguaje natural funciona sin configuración, con el parser determinístico (`lib/parseQuery.ts`). Para que Claude refine la interpretación, copia `.env.example` a `.env.local` y define `ANTHROPIC_API_KEY`.

## Estructura

```
app/
  page.tsx                 Home: hero + buscador + catálogo + "cómo leemos las fichas"
  producto/[id]/page.tsx   Ficha técnica con evidencia (declarado / inferido) por campo
  api/parse/route.ts       Consulta → filtros (Claude + structured outputs, respaldo local)
  api/search/route.ts      Búsqueda y conteos de facetas en el servidor (página de 24–48 resultados)
components/
  Catalog.tsx              Estado de búsqueda, chips editables, grid, bottom sheet móvil
  SearchBox.tsx            Consulta en lenguaje natural
  FilterPanel.tsx          Facetas con conteos
  ProductCard.tsx          Tarjeta con specs visibles
  Swatch.tsx               Imagen placeholder (textura de punto en el color real)
scripts/
  ingest.ts                Ingesta: robots.txt, 1 req/s, feed Shopify → catálogo + cobertura
data/
  catalog.json             Catálogo normalizado (generado)
  coverage.json            % de ítems con cada dato técnico (generado)
lib/
  ingest/shopify.ts        Normalizador de fichas Shopify (composición, calidad, color, tallas con stock)
  ingest/woocommerce.ts    Conector WooCommerce (Store API) que reutiliza el normalizador de Shopify
  ingest/robots.ts         Evaluación de robots.txt (RFC 9309)
  catalog.ts               Carga el catálogo en el servidor y arma la versión liviana para el cliente
  types.ts                 Modelo de datos
  taxonomy.ts              Rangos NTP, etiquetas, colores, regiones
  parseQuery.ts            Parser local de lenguaje natural
  filter.ts                Filtrado de 3 resultados posibles (exacto / por confirmar / descartado)
  products.ts              Datos de ejemplo
```
