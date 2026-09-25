# Vellón: catálogo vertical de alpaca peruana

> Basado en la idea de Nikita Bier: los agentes personales pueden armar tiendas muy verticales que filtran de forma horizontal el inventario de muchos sitios. Aquí el vertical es la alpaca peruana.

---

## 1. Visión

El comprador de alpaca peruana no puede comparar lo que importa. "Baby alpaca" en Mercado Libre, "Royal" en una tienda de Arequipa y "100% alpaca" en Etsy son promesas distintas, y ningún buscador las distingue. Google Shopping trata "chompa baby alpaca beige de Puno" como un conjunto de palabras. No sabe que *baby* es un rango de micras (20.1–23 µm según NTP 231.301), que *oatmeal* es un beige natural sin teñir ni que "confeccionado en Arequipa" no dice de dónde viene la fibra.

**Vellón** es un catálogo, no un marketplace. Un agente lee lo que las tiendas ya publican y convierte cada descripción desordenada en una ficha técnica comparable: finura, raza, color natural o teñido, % de alpaca y origen declarado. Además indica, dato por dato, si la tienda lo declaró o si el agente lo infirió.

**Por qué no es "otro Mercado Libre":** no hay vendedores, inventario ni checkout propios. La compra ocurre en la tienda original. El valor está en *entender* el producto. El filtro "≤ 20 µm, Suri, sin teñir" no existe en ningún otro lugar, y cuando falta un dato no se inventa: esos productos se muestran aparte como "posibles coincidencias".

---

## 2. Arquitectura

```
┌──────────── Adquisición ────────────┐   ┌──────── Normalización ────────┐   ┌──── Servir ────┐
│ APIs oficiales (Mercado Libre, Etsy)│   │ 1. Limpieza HTML → texto      │   │ Postgres +     │
│ Feeds (Shopify /products.json,      │──▶│ 2. Reglas determinísticas     │──▶│ índice de      │
│   sitemaps, Google Merchant feeds)  │   │ 3. LLM (Claude) con schema    │   │ facetas        │
│ Scraping ético (robots.txt, 1 req/s)│   │ 4. Validación + evidencia     │   │ Next.js (SSR)  │
│ Carga manual (talleres sin web)     │   │ 5. Revisión humana si conf<0.6│   │ /api/parse     │
└─────────────────────────────────────┘   └───────────────────────────────┘   └────────────────┘
          cron por fuente (6–24 h)             cola de trabajos (1 por listado)
```

### 2.1 Cómo el agente obtiene datos públicos

Orden de preferencia, por fuente:

1. **API oficial**. **Mercado Libre** tiene una API pública de búsqueda e ítems (`/sites/MPE/search`, `/items/{id}`) que devuelve título, atributos, precio, stock y descripción (requiere registrar una app y token OAuth; revisar los límites vigentes antes de construir). **Etsy** tiene la Open API v3 (requiere API key y respetar sus términos sobre uso de datos). Esta es la vía más estable y con menos fricción legal.
2. **Feeds estructurados**. Muchas tiendas de marca corren sobre Shopify o WooCommerce y exponen `/products.json`, sitemaps de productos o datos estructurados `schema.org/Product` (JSON-LD) en cada página. Se leen primero porque ya vienen con precio y disponibilidad en campos.
3. **Scraping ético** (Sol Alpaca, Kuna, All Alpaca y tiendas de Cusco/Arequipa sin feed):
   - Respetar `robots.txt` y los términos de uso. Si el sitio prohíbe la extracción, **no se hace** y se pasa a la opción 4.
   - User-agent identificable (`VellonBot/1.0 (+https://vellon.pe/bot)`), máximo 1 petición/segundo por dominio, en horario de baja carga y con caché HTTP (ETag / If-Modified-Since).
   - Solo se guardan datos de producto: título, descripción, precio, stock, atributos y URL. Las fotos no se re-hospedan: se enlazan (hotlink con permiso) o se muestra un placeholder.
   - Botón de *opt-out* para tiendas y contacto visible.
4. **Fallback manual**. Para talleres sin web (p. ej. una asociación de tejedoras en Chinchero) o sitios que no permiten scraping, un operador carga la ficha desde el catálogo de WhatsApp/Instagram del taller o desde una hoja de cálculo que el taller comparte, con `method: "manual"`. Esto **no es** el trabajo de contactar cooperativas: es transcribir lo que ya es público.

Cada listado guarda `source.method` y `retrievedAt`, que se muestran en la ficha.

### 2.2 Normalización de descripciones desordenadas

Pipeline por listado (idempotente, re-ejecutable cuando cambia la versión del extractor):

| Paso | Qué hace | Ejemplo |
|---|---|---|
| 1. Limpieza | HTML → texto; junta título, descripción, atributos y tabla de specs | `"CHOMPA DE ALPACA… 70% alpaca 30% acrílico"` |
| 2. Reglas | Regex de alta precisión para lo inequívoco: `\d+(\.\d)?\s*(micras\|mic\|µ)`, `\d+%\s*alpaca`, *huacaya/suri*, regiones y distritos (Juliaca → Puno) | `22.5 mic` → `micron: 22.5` |
| 3. LLM | Claude con **structured outputs** (JSON Schema estricto) extrae lo ambiguo: color comercial → familia + natural/teñido, "royal" → ultrafina, origen de la fibra vs lugar de confección, calidad cuando solo hay pistas. Debe devolver `quote` literal para cada campo. | `"Oatmeal, tono natural"` → `beige`, `natural: true` |
| 4. Validación | Coherencia: si `micron` existe, `quality` = `qualityFromMicron(micron)`; `alpacaPct` suma 100 con la composición; la `quote` debe existir en el texto fuente (anti-alucinación) | "Baby, 19 µm" → corrige a Super Baby y deja warning |
| 5. Confianza | `provenance` por campo (`declarado` / `inferido` / `desconocido`) y `confidence` global. < 0.6 → cola de revisión humana | ML sin composición → 0.45 |

Reglas de dominio clave:
- **Finura (NTP 231.301):** Ultrafina ≤ 18 µm · Super Baby 18.1–20 · Baby 20.1–23 · Fleece 23.1–26.5 · Medium Fleece 26.6–29 · Huarizo 29.1–31.5 · Gruesa > 31.5. *Royal* es un término comercial, no de la norma: se mapea a Ultrafina solo si no hay micras declaradas, y se marca como inferido.
- **"Baby alpaca" en una búsqueda** significa "baby o más fina".
- **Color natural:** alpaca tiene ~22 colores naturales (blanco, beige, vicuña/fawn, café, gris, negro). Terracota, azul o verde implican teñido. Si no se dice nada, `natural: null`.
- **Origen:** se distingue *origen de la fibra* ("fibra de Puno") de *lugar de confección* ("hecho en Arequipa"). "Hecho en Perú" no asigna región.

### 2.3 Stack recomendado

| Capa | Elección | Por qué |
|---|---|---|
| Web | **Next.js 15 (App Router) + Tailwind CSS 4** | SSR/SSG para SEO de fichas, rutas API para el parser |
| Parsing de consultas | Claude (`claude-opus-5`, esfuerzo bajo) con structured outputs + parser local de respaldo | Respuesta instantánea local; el LLM refina |
| Extracción de fichas | Claude en **Batch API** (50 % más barato, asíncrono) | Miles de listados por noche no necesitan latencia baja |
| Adquisición | Workers en Node (Playwright solo cuando la página requiere JS) + cron | Una cola por dominio para respetar el rate limit |
| Datos | Postgres (Supabase/Neon), índices GIN sobre facetas; Meilisearch/Typesense cuando haya > 50k ítems | Filtros facetados con conteos |
| Imágenes | Enlace a la original o placeholder; nunca re-hospedar sin permiso | Legal y liviano |

---

## 3. Estructura de datos

El JSON Schema completo está en [`schema/product.schema.json`](../schema/product.schema.json) y el tipo TypeScript en [`lib/types.ts`](../lib/types.ts). Un producto normalizado se ve así:

```json
{
  "id": "casa-misti-royal-beige",
  "title": "Chompa Royal Alpaca 18 micras — cuello redondo, color hueso natural",
  "source": { "site": "Casa Misti (Arequipa)", "url": "https://…", "method": "scrape", "retrievedAt": "2026-09-24T08:10:00Z" },
  "seller": { "name": "Casa Misti Alpaca", "city": "Arequipa" },
  "productType": "chompa",
  "fiber": {
    "alpacaPct": 100,
    "composition": [{ "material": "Royal alpaca", "pct": 100 }],
    "quality": "ultrafina",
    "micron": 18,
    "breed": "huacaya"
  },
  "color": { "name": "Hueso / beige natural", "family": "beige", "hex": "#DCCBAE", "natural": true },
  "origin": { "region": "puno", "detail": "Fibra de Puno, hilado y confección en Arequipa" },
  "construction": "tejido_a_maquina",
  "weightGrams": 290,
  "sizes": ["S", "M", "L"],
  "price": { "amount": 1190, "currency": "PEN", "amountPen": 1190 },
  "availability": { "status": "pocas_unidades", "checkedAt": "2026-09-24T08:10:00Z" },
  "images": [],
  "rawDescription": "ROYAL ALPACA 100% - 18 micras. Color natural sin teñir (hueso)…",
  "evidence": {
    "micron":  { "provenance": "declarado", "confidence": 0.95, "quote": "18 micras" },
    "origin":  { "provenance": "declarado", "confidence": 0.85, "quote": "Fibra seleccionada ... de Puno" },
    "natural": { "provenance": "declarado", "confidence": 0.95, "quote": "Color natural sin teñir" }
  },
  "extraction": { "engine": "claude-opus-5", "version": "extract-v0.3", "confidence": 0.92, "warnings": [] }
}
```

Decisiones de diseño:
- **`null` significa "no se sabe"**, nunca "no aplica". Así un filtro puede distinguir entre *no cumple* y *no se puede verificar*.
- **`evidence` por campo** con cita literal: alimenta los badges *Declarado / Inferido* de la ficha y permite auditar el extractor.
- **`amountPen`** normaliza USD → PEN para filtrar y ordenar; se muestra también el precio original.
- **`title` y `rawDescription` se guardan sin tocar** para que el usuario vea qué dijo la tienda.

---

## 4. Diseño de la interfaz

Principios: **catálogo antes que chat**, **especificaciones a la vista**, **honestidad sobre los datos**. Paleta tierra (lana `#FAF7F2`, arena `#EFE7DA`, tierra `#6B4F3A`, carbón `#2A2622`, ocre `#A8683A`, musgo `#5B6B4E`), serif editorial (Fraunces) para titulares y precios, e Inter para datos. Aire amplio, fotos grandes en 4:5 y ningún elemento de "souvenir" (sin llamas de caricatura ni tipografías "incas").

### 4.1 Home con buscador en lenguaje natural
- **Franja superior** fina en carbón: aviso de demo (en producción: "No vendemos, te llevamos a la tienda").
- **Hero** sobre fondo arena: sobretítulo en versalitas ("ALPACA PERUANA · 12 PIEZAS DE 7 TIENDAS"), titular serif grande ("Describe la prenda. *Nosotros leemos cada ficha.*") y una línea de propuesta de valor.
- **Buscador** tipo píldora, ancho (máx. 2xl), con placeholder "Describe la prenda: fibra, color, origen, finura…" y botón carbón "Buscar" que pasa a "Leyendo…" mientras el agente refina.
- **Consultas de ejemplo** como chips debajo del buscador ("chal suri color natural sin teñir", "cárdigan de menos de 20 micras"…). Enseñan qué se puede preguntar y en móvil se desplazan horizontalmente.
- **Debajo, el catálogo completo**: el usuario ve productos desde el primer scroll, no una página vacía.
- **"Cómo leemos las fichas"**: tres columnas numeradas (Leemos lo público · Normalizamos con evidencia · No adivinamos).

### 4.2 Resultados tipo catálogo (no chat)
- **Barra de interpretación**: "El agente entendió:" seguido de chips color tierra, uno por filtro (`Chompa ×`, `Baby o más fina (≤ 23 µm) ×`, `Beige ×`, `Origen: Puno ×`) y un chip con borde para el orden (`Más fino primero`). Cada chip se quita con un toque. Así la consulta en lenguaje natural queda editable y visible. Es el puente entre el agente y el catálogo.
- **Contador**: "**2** coincidencias exactas · 2 por confirmar" y selector de orden (Relevancia, Más fino primero, Precio ↑/↓).
- **Grid** de 3 columnas en escritorio y 2 en móvil. Cada tarjeta tiene:
  - Imagen 4:5 grande. Arriba a la izquierda, badge oscuro con la finura (`Ultrafina · 18 µm`, o el rango `Baby · 20.1–23 µm` si no hay micras). Abajo, estado de stock si no hay stock normal.
  - Sobretítulo "CHOMPA · SOL ALPACA", título en 2 líneas.
  - **Mini ficha de 4 datos siempre visibles**: Fibra, Raza, Color (natural/teñido), Origen. Lo que falta aparece en cursiva gris como "no declarado", sin esconderse.
  - Precio en soles (serif) y precio original en USD si aplica.
- **Sección "Posibles coincidencias"** separada por un filete: productos que no contradicen la búsqueda pero a los que les falta un dato pedido. La tarjeta lo dice: "Sin dato de origen — no podemos confirmar que cumpla tu filtro". Es la diferencia principal frente a un buscador de palabras clave.
- **Estado vacío**: mensaje serif y sugerencia de quitar chips.

### 4.3 Ficha de producto
- **Dos columnas** en escritorio: imagen grande fija (sticky) a la izquierda. A la derecha: tienda · vendedor · ciudad, título serif grande, chips resumen (finura, raza, composición, color natural), precio grande (y USD con "conversión aprox."), punto de disponibilidad con fecha de verificación y CTA "Ver en {tienda} ↗".
- **Ficha técnica normalizada** como tabla de definición: Calidad NTP (con rango), Micronaje, Raza, Color, Origen, Composición, Construcción, Peso y Tallas. Cada valor lleva un badge **Declarado** (musgo) o **Inferido** (ocre) y debajo la **cita literal** de la tienda que lo respalda. Si falta, se lee "No declarado por la tienda".
- **Descripción original** en blockquote con filete ocre.
- **"Lo que el agente no pudo confirmar"**: lista de advertencias (p. ej. "Origen = lugar de confección, no de la fibra").
- **Procedencia del dato**: método (API / página pública / carga manual), fecha de lectura, versión del extractor y barra de confianza.
- **"Más chompas en otras tiendas"**: comparación horizontal, la razón de ser de un catálogo multi-tienda.

### 4.4 Panel de filtros
Columna izquierda fija de 250 px en escritorio y *bottom sheet* en móvil. Secciones en versalitas tierra:
1. **Tipo de producto**: píldoras con conteo (Chompa 4, Chal 0…). Las opciones con 0 se atenúan y se desactivan.
2. **Finura (NTP 231.301)**: checkboxes con el rango en µm al lado ("Super Baby 18.1–20 µm") y la ayuda "Menos µm, más suave".
3. **Raza**: Huacaya / Suri.
4. **Color**: segmentado Todos / Natural / Teñido y paleta de 10 círculos de color (beige, camel/vicuña, marrón…) en vez de una lista de nombres.
5. **Composición**: Todas / 100% alpaca / Mezcla.
6. **Origen declarado**: Puno, Cusco, Arequipa, Huancavelica… con la nota "Solo cuando la tienda lo indica".
7. **Precio (S/)**: mínimo y máximo con teclado numérico.
8. **Disponibilidad**: "Solo en stock".
9. **Tienda**: checkboxes por fuente.

Los conteos son facetados: cada número dice cuántos resultados habría al elegir esa opción, dados los demás filtros.

### 4.5 Móvil (prioritario en Perú)
La mayoría del tráfico peruano es móvil, con gama media y a veces datos limitados:
- **Barra pegajosa** arriba con buscador compacto y botón "Filtros · 4". Debajo, los chips de interpretación en un carrusel horizontal sin scrollbar y "Limpiar".
- **Grid de 2 columnas** con la mini ficha en formato etiqueta/valor alineado a la derecha, para que "100% alpaca" no se trunque.
- **Filtros en bottom sheet** (88 % de alto, esquinas redondeadas) con botón fijo "Ver N resultados" que respeta el *safe area* del iPhone.
- **Ficha** con CTA fija abajo (precio + "Ver en Etsy ↗") para no tener que volver arriba.
- **Liviano**: placeholders SVG de < 1 KB en vez de fotos cuando no hay permiso, fichas SSG y ~120 KB de JS inicial.
- Sin scroll horizontal accidental (verificado a 390 px).

---

## 5. Flujo del agente

Consulta: **"chompa baby alpaca beige de Puno, lo más fino posible"**

1. **Respuesta instantánea (cliente, < 5 ms).** `parseQueryLocal` normaliza el texto (minúsculas, sin tildes) y aplica sinónimos:
   - `chompa` → `types: ["chompa"]`
   - `baby` → `qualities: ["ultrafina","super_baby","baby"]` (baby *o más fina*)
   - `beige` → `colorFamilies: ["beige"]`
   - `puno` → `origins: ["puno"]`
   - `lo más fino posible` → `sort: "micras_asc"` (ordena; no restringe)
   - Resto (`de`, `alpaca`) → palabras vacías, `text: ""`.

   El catálogo se filtra en el acto y aparecen los chips.
2. **Refinamiento con LLM (servidor, `POST /api/parse`).** Si hay `ANTHROPIC_API_KEY`, Claude recibe la consulta, la tabla NTP y las reglas del dominio, y devuelve JSON validado por el schema Zod (structured outputs). Puede resolver lo que las reglas no cubren: "algo para regalar a mi mamá que no pique" → finura ≤ baby; "color camello" → camel; "menos de 50 dólares" → `priceMax: 187`. Si la respuesta llega y la consulta sigue vigente, reemplaza los filtros. Si falla o no hay clave, se queda la interpretación local.
3. **Filtrado con tres resultados posibles** (`lib/filter.ts`). Cada producto se evalúa campo por campo: *pass*, *fail* o *unknown* (dato `null`).
   - Cualquier *fail* → fuera. Ej.: la chompa de Mercado Libre de Juliaca es de Puno, pero es 70 % alpaca / Fleece y marrón.
   - Todo *pass* → **coincidencia exacta**: Casa Misti (Royal 18 µm, beige natural, fibra de Puno) y Etsy (baby, beige sin teñir, cooperativa de Puno).
   - Algún *unknown* → **posible coincidencia**: Sol Alpaca "Oatmeal" y la chompa beige de Mercado Libre, porque ninguna declara región.
4. **Orden.** `micras_asc` usa las micras declaradas y, si faltan, el punto medio del rango de su calidad, así que Casa Misti (18 µm) va antes que Etsy (Baby ≈ 21.5 µm estimado). Los empates se deciden por la confianza de la ficha.
5. **Render.** Chips editables, contador "2 exactas · 2 por confirmar", grid y sección aparte. El usuario puede seguir afinando con el panel. Los chips y el panel son la misma fuente de verdad (`Filters`).
6. **Clic en una ficha** → evidencia por campo → "Ver en Etsy ↗" (sale a la tienda; en v2 con parámetro de afiliado donde exista).

Por detrás, de forma asíncrona y fuera del camino de la consulta: los crawlers refrescan cada fuente (stock cada 6–12 h en marketplaces y 24 h en tiendas) y el extractor re-procesa solo los listados cuyo texto cambió (hash del contenido).

---

## 6. Código

Ver el [README](../README.md). Piezas principales:
- `app/page.tsx`: home con hero, buscador, catálogo y "Cómo leemos las fichas".
- `components/Catalog.tsx`: estado de la búsqueda, chips, panel de filtros, grid y bottom sheet móvil.
- `components/SearchBox.tsx`: componente de **consulta en lenguaje natural**.
- `components/FilterPanel.tsx`: facetas con conteos.
- `app/producto/[id]/page.tsx`: ficha con evidencia por campo.
- `app/api/parse/route.ts`: consulta → filtros con Claude (structured outputs) y respaldo local.
- `lib/parseQuery.ts`, `lib/filter.ts`, `lib/taxonomy.ts`: dominio y lógica, cubiertos por tests.
- `lib/products.ts`: 12 productos de ejemplo realistas (no son listados reales).

---

## 7. Limitaciones honestas y mitigación en v1

| Limitación | Riesgo | Mitigación en v1 |
|---|---|---|
| **Legalidad del scraping.** Los términos de algunas tiendas prohíben la extracción automatizada. En Perú no hay jurisprudencia clara, pero sí riesgo contractual y reputacional. Las fotos tienen derechos de autor. | Bloqueos, reclamos, cartas notariales | Priorizar APIs oficiales (Mercado Libre, Etsy) y feeds. Scraping solo donde `robots.txt` y los términos lo permiten, con rate limit y bot identificado. No re-hospedar fotos: enlace o placeholder. *Opt-out* en 48 h. Ofrecer a las marcas un feed gratuito: tráfico calificado a cambio de datos. Validar con un abogado antes de lanzar. |
| **Micronaje casi nunca se declara.** La mayoría dice "baby alpaca" sin cifra, y "baby" en marketplaces a veces es mezcla. | Filtros por finura con falsos positivos | Distinguir *declarado* de *inferido* en la UI. Mostrar rango en vez de cifra. Separar "posibles coincidencias". No inferir micras desde el precio salvo como *inferido* con confianza baja. v2: sello "verificado" para tiendas que compartan certificado de laboratorio (OFDA/IWTO). |
| **Origen ambiguo o ausente.** "Hecho en Perú" y "confeccionado en Arequipa" no dicen de dónde es la fibra. | Filtro de origen engañoso | `origin.detail` guarda el matiz. El prompt separa fibra de confección. Si no hay región, `null` y el producto va a "posibles coincidencias". |
| **Stock y precio desactualizados.** Un scrape de hace 24 h puede estar agotado. | Frustración al hacer clic | Mostrar "verificado el {fecha}". Refresco más frecuente en marketplaces por API. Verificación *just-in-time* del stock al abrir la ficha (1 request a la fuente). Estado `desconocido` explícito para cargas manuales. |
| **Errores del LLM** (alucinar "Suri", malinterpretar colores). | Datos falsos con apariencia técnica | Structured outputs, cita literal obligatoria y verificada contra el texto fuente, validaciones de coherencia (micras ↔ calidad), revisión humana si la confianza es < 0.6, y un set de evaluación de ~200 fichas etiquetadas a mano antes de cada cambio de prompt. |
| **Cobertura pequeña al inicio.** 5–10 fuentes no son "todo el mercado". | Percepción de catálogo vacío | Decir en el hero cuántas tiendas se cubren. Priorizar por volumen (Mercado Libre, Etsy, 3 marcas grandes y 5 tiendas locales). Lista pública de "próximas tiendas". |
| **Conversión de moneda.** | Precios USD aproximados | Tasa diaria del BCRP y rótulo "conversión aprox.". |
| **Sesgo hacia quien tiene web.** Los talleres pequeños son justamente el producto más auténtico. | Catálogo dominado por marcas | Carga manual asistida desde catálogos públicos de WhatsApp/Instagram. En v2, formulario de auto-registro para talleres. |
| **Monetización no validada.** | Sostenibilidad | v1 sin monetizar. Medir clics salientes por tienda. v2: afiliados (Etsy y Mercado Libre tienen programas) y fichas destacadas marcadas como tales. |

---

## 8. Primera validación con datos reales (25 sep 2026)

Leímos el catálogo público de **Sol Alpaca** (tienda Shopify, `/products.json`, permitido por su `robots.txt`): **608 productos → 1.038 ítems** (un ítem por producto × color, porque color y stock por talla cambian por color). La extracción usa reglas; la capa con Claude se agrega cuando haya `ANTHROPIC_API_KEY` en el entorno.

| Dato | Ítems con el dato | Lectura |
|---|---|---|
| Composición (% de alpaca) | **89 %** | Casi siempre dicen "100% Baby Alpaca" o "70% baby alpaca 30% silk". |
| Calidad (baby, super baby…) | **94 %** | Se declara como *nombre* comercial, no como medición. |
| Micronaje (µm) | **0 %** | Ninguna ficha publica micras. |
| Raza (Huacaya / Suri) | **1 %** | Solo 6 ítems mencionan Suri. |
| Color clasificable | **88 %** | Nombres de fantasía ("koi orange", "rainy day"); el resto va a "por confirmar". |
| Natural vs. teñido | **58 %** | Se deduce sobre todo porque azul, verde o rojo no son colores naturales de alpaca. |
| Región de origen | **0 %** | Solo "Made in Peru". |
| Tallas con stock | **89 %** | Stock por talla y color, directo del feed. |
| Envío | **100 %** | Política pública: mundial desde Perú (DHL), US$ 25 en América/UE, aranceles incluidos. |

**Qué significa para el producto:**
1. La consulta del usuario ("suéter marrón, 100% baby alpaca, talla M, menos de US$180") **sí se puede responder bien** con datos públicos: composición, calidad declarada, color, talla con stock, precio y envío están casi siempre. Resultado real: 3 coincidencias exactas y 3 por confirmar.
2. **Micronaje, raza y región de origen no existen en los datos públicos** de esta tienda. Los filtros siguen, pero su valor está en decir la verdad ("no declarado") y no en filtrar. Para que esos filtros sean útiles hará falta, en v2, un sello "verificado" para tiendas que compartan certificados de laboratorio o de origen.
3. El valor diferencial frente a un buscador está confirmado en lo que sí hay: stock **por talla y color**, composición real, precio de oferta y envío, todo en un mismo filtro.

**Decisión de producto (25 sep):** comparamos solo lo que las tiendas publican de forma consistente: tipo de prenda, composición, calidad declarada (baby, super baby, royal), color, tallas con stock, precio (soles o dólares), oferta y envío. Micronaje, raza, región de origen y natural/teñido no se muestran como filtros. Si el usuario los pide, el catálogo avisa: "No filtramos por origen (Puno): las tiendas no lo publican".

**Estado de las fuentes (25 sep, cuarta descarga):** 15 tiendas, **6.956 ítems con stock** (se omiten los agotados). 14 usan el conector Shopify y 1 el conector WooCommerce (Store API pública).

| Fuente | Plataforma | Moneda | Ítems | Composición | Calidad | Envía a Perú |
|---|---|---|---|---|---|---|
| Sol Alpaca | Shopify | USD | 924 | 92 % | 94 % | Sí |
| Kuna Perú (`pe.kunastores.com`) | Shopify | PEN | 749 | 87 % | 81 % | Sí (gratis desde S/ 399) |
| Kuna USA (`us.kunastores.com`) | Shopify | USD | 641 | 57 % | 83 % | No (solo EE. UU.) |
| Alpaca Collections (multimarca) | Shopify | USD | 987 | 53 % | 51 % | Sí (desde US$ 39) |
| Anntarah | Shopify | PEN | 829 | 99 % | 80 % | Sí (gratis desde S/ 399) |
| Peruvian Link | Shopify | USD | 863 | 82 % | 28 % | No publica |
| PAKA | Shopify | USD | 326 | 16 % | 17 % | No publica |
| Pure Alpaca | WooCommerce | PEN | 290 | 97 % | 78 % | Sí |
| Peruvian Connection | Shopify | USD | 269 | 99 % | 71 % | No publica |
| Incalpaca Remate (outlet) | Shopify | PEN | 255 | 50 % | 56 % | Sí |
| Qinti | Shopify | USD | 250 | 81 % | 79 % | No publica |
| All Alpaca | Shopify | USD | 118 | 100 % | 75 % | Sí (gratis desde S/ 150) |
| Etno Alpaca | Shopify | USD | 89 | 57 % | 100 % | Sí |
| Krimson Klover | Shopify | USD | 41 | 85 % | 51 % | No publica |
| Incalpaca (`incalpacastores.com` = `alpaca111.com`, misma tienda) | Shopify | PEN | 325 | 87 % | 71 % | Sí |
| Baby Alpaca Boutique | — | | — | | | No responde por HTTPS |
| Mercado Libre Perú / Etsy | API | | — | | | Requieren credenciales de desarrollador |

Notas: Pure Alpaca (WooCommerce) no informa stock por talla, solo si el producto tiene stock; por eso sus prendas aparecen "por confirmar" cuando se filtra por talla. La descarga reintenta hasta 3 veces ante cortes de red.

Aprendizajes de la segunda descarga:
- **Kuna escribe la composición con palabras** ("elaborado en baby alpaca y seda", "una mezcla de alpaca y lana"). El lector lo entiende: si la frase describe un solo material en español ("elaborado en baby alpaca"), deduce 100 % y lo marca como deducido; si hay dos materiales o dice "mezcla", la marca como mezcla sin porcentaje. En inglés, "crafted with alpaca fiber" no basta para decir 100 %.
- **Peruvian Connection** escribe "baby alpaca (72%), wool (26%)" y menciona el forro ("Lining: 100% polyester"); el forro se ignora.
- **Colores en español** (celeste, guinda, rosado, turquesa…) y nombres de fantasía en inglés (willow, pebble, cabernet…) se mapean a familias.
- **Relevancia intercala tiendas** para que la comparación sea horizontal.
- La búsqueda corre en el servidor (`/api/search`, ~20 ms). El celular recibe solo la página visible: la portada pesa ~14 KB comprimida.

---

## 9. Público objetivo y versión en inglés (25 sep 2026)

**Decisión:** el portal apunta primero a **compradores de EE. UU.** de poder adquisitivo medio-alto, interesados en moda premium, fibras naturales, sostenibilidad y alpaca peruana auténtica. Buscan sobre todo suéteres, cárdigans, bufandas y accesorios **con envío a EE. UU.**

| Aspecto | Cómo quedó |
|---|---|
| Idioma | Portal en **inglés** (interfaz, filtros, fichas, avisos). El intérprete de búsquedas entiende inglés primero y sigue entendiendo español. Una versión en español puede venir después. |
| Moneda | Todo en **USD**. Si la tienda publica en soles, se convierte con el tipo de cambio del día de la descarga y se muestra el precio original como referencia ("Listed at S/ 324.50 by the store"). |
| Tipo de cambio | `npm run ingest` lo obtiene del **BCRP** (serie PD04640PD, oficial) y, si falla, de open.er-api.com; guarda fecha y fuente en `data/fx.json`. Si ninguna responde usa el último conocido y el portal lo indica. **Activo:** la última descarga usó S/ 3.385 por USD (BCRP, 23 sep 2026). |
| Envío | Filtro **"Ships to the US" activo por defecto**, según la política publicada por cada tienda. Las tiendas que solo envían dentro de Perú (Kuna Perú, Anntarah, Pure Alpaca, Incalpaca Remate) no aparecen salvo que el usuario desactive el filtro. |
| Títulos en español | Se traducen prenda, material y color ("SUÉTER LANGUI \| GRIS" → "Langui Sweater — Gray"); el título original queda en la ficha. |
| Portada | Accesos directos a Sweaters, Cardigans, Scarves, Shawls & wraps, Hats & beanies y Gloves; ejemplos de búsqueda en inglés; sección "Makers that ship to the US". |

Tiendas que envían a EE. UU. (4.584 prendas con stock): Sol Alpaca, Kuna USA, Incalpaca, Alpaca Collections, Peruvian Link, PAKA, Peruvian Connection, All Alpaca, Etno Alpaca y Krimson Klover. PAKA y Krimson Klover no publican política de envío, pero son marcas con sede en EE. UU. Qinti no publica política: sus prendas aparecen como "to confirm".

---

## 10. SEO, dominio y descubrimiento por IA (25 sep 2026)

### Nombre y dominio

**Nombre recomendado: Alpaca Atlas.** Es fácil de leer y escribir para un comprador de EE. UU., contiene la palabra clave "alpaca" y transmite la idea de un mapa de tiendas. En una búsqueda no apareció ninguna marca de moda con ese nombre, solo un hilo llamado "Atlas" y una granja. Descartado: "The Alpaca Edit", que choca con un sello musical (*Alpaca Edits*) y con una campaña de la marca Trenery.

**Dominio, por orden de preferencia:** `alpacaatlas.com` → `thealpacaatlas.com` → `alpacaatlas.co`. Desde el entorno de trabajo no se pudo consultar la disponibilidad: hay que verificarla y comprarlo (Netlify Domains o Cloudflare Registrar, unos US$10–12 al año). El nombre y el dominio se cambian con variables de entorno, sin tocar código.

### Qué quedó implementado en el sitio

| Área | Detalle |
|---|---|
| Arquitectura de URLs | URLs en inglés: `/products/<slug>` (redirección 301 desde `/producto/<id>`), `/<colección>`, `/brands/<tienda>`, `/guides/<guía>`. |
| Páginas de colección (SEO programático) | **188 páginas** generadas con los datos: por categoría (`/alpaca-sweaters`), calidad (`/baby-alpaca-sweaters`, `/royal-alpaca`), género (`/womens-alpaca-cardigans`), color (`/gray-alpaca-scarves`), 100 % alpaca, rango de precio (`/alpaca-scarves-under-100`) y ofertas. Solo se crean si hay al menos 8 productos (sin páginas vacías). Cada una tiene H1 propio, texto con datos reales (cantidad, marcas, rango y mediana de precio), enlaces a colecciones relacionadas, 48 productos, tiendas y preguntas frecuentes con datos. |
| Fichas de producto | Título y descripción únicos, resumen propio en prosa, migas de pan, enlaces a colecciones y a la marca, imagen principal priorizada (LCP). Solo se indexan las de tiendas que envían a EE. UU. |
| Datos estructurados (schema.org) | `Organization`, `WebSite` (con buscador), `Product` + `Offer` (precio en USD, stock, vendedor, material, color, tallas, público), `CollectionPage` + `ItemList`, `BreadcrumbList`, `FAQPage`, `Article`, `Brand`, `AboutPage`. |
| Contenido editorial (E-E-A-T) | 4 guías: grados de fibra (tabla NTP 231.301), alpaca vs. cashmere vs. merino, cuidado y lavado, cómo leer la etiqueta. Cada una abre con una respuesta corta (pensada para fragmentos destacados y respuestas de IA) y tiene preguntas frecuentes. Páginas About (metodología, cómo se gana dinero), Terms y Privacy. |
| Rastreo | `sitemap.xml` (unas 4.700 URLs con imágenes), `robots.txt` que permite explícitamente a los rastreadores de IA (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended…), `/api/` bloqueado, búsquedas `?q=` con `noindex` para no generar duplicados, URLs canónicas en todas las páginas, página 404 útil. |
| IA / LLMs | `/llms.txt` (estándar llmstxt.org) con resumen del sitio, datos clave, colecciones con precios, guías y marcas, más un enlace `<link rel="alternate">` desde todas las páginas. |
| Compartir | Imagen Open Graph generada, etiquetas Twitter/X, manifest e ícono. |
| Rendimiento y accesibilidad | Páginas estáticas (colecciones, marcas, guías) y fichas en caché de un día (ISR). Imágenes con `srcset`, carga diferida salvo las primeras (prioridad alta para LCP), texto alternativo descriptivo, enlace "Skip to content", una sola H1 por página, `lang="en-US"`. |
| Fase privada | **Todo el sitio va con `noindex` y `robots.txt` bloqueando todo** hasta activar `SITE_INDEXABLE=true`, para que Google no indexe la versión `netlify.app` antes del lanzamiento. |

### Lista para el lanzamiento público

1. Comprar el dominio y conectarlo en Netlify como **dominio principal** (`alpacaatlas.com`; `www` redirige al dominio sin www). El HTTPS es automático y `vellon-alpaca.netlify.app` redirige solo.
2. Variables de entorno en Netlify (Site configuration → Environment variables), y volver a desplegar:
   - `NEXT_PUBLIC_SITE_URL=https://alpacaatlas.com`
   - `SITE_INDEXABLE=true`
   - `GOOGLE_SITE_VERIFICATION=<código de Search Console>`
   - `BING_SITE_VERIFICATION=<código de Bing Webmaster Tools>`
3. Quitar la protección con contraseña del sitio.
4. **Google Search Console:** verificar el dominio y enviar `https://alpacaatlas.com/sitemap.xml`.
5. **Bing Webmaster Tools:** importar desde Search Console y enviar el sitemap. Bing alimenta a Copilot y es una de las fuentes de búsqueda de ChatGPT.
6. **Actualización diaria del catálogo** (descarga y nuevo despliegue): el stock y los precios frescos son una señal de calidad, y los datos `Product` deben coincidir con lo que muestra la tienda.

### Qué no depende del código (SEO externo)

- **Enlaces entrantes:** avisar a las marcas (varias podrían enlazar al comparador), guías de regalo en blogs de moda sostenible, respuestas útiles en foros (r/BuyItForLife, r/Sustainable_Fashion) y prensa de nicho.
- **Contenido continuo:** 1–2 guías al mes (guía de regalos, alpaca para viajar, tallas por marca, entrevistas a talleres).
- **Expectativa realista:** un dominio nuevo tarda normalmente de 3 a 6 meses en posicionarse para términos competitivos. Nadie puede garantizar el primer puesto; lo que sí está hecho es que el sitio cumpla técnicamente todo lo que Google y los asistentes de IA necesitan para entenderlo y citarlo.
