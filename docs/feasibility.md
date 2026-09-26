# Fase 0 — Viabilidad del paquete de mejoras

Medido el 2026-09-26 sobre el catálogo en producción (actualización del mismo día): 6.772 ítems con stock de 15 tiendas; **4.489 se muestran** (tiendas que envían a EE. UU.). Salvo que se diga lo contrario, los porcentajes son sobre esos 4.489.

## 1. Cómo funciona hoy

**Stack.** Next.js 15 (App Router) + React 19 + Tailwind 4, en Netlify. Sin base de datos: el catálogo es `data/catalog.json`, generado por `scripts/ingest.ts` y leído en el servidor (`lib/catalog.ts`). Colecciones, marcas y guías son páginas estáticas; las fichas usan ISR (1 día).

**Ingesta.** Lee `/products.json` (Shopify) o la Store API (WooCommerce) de cada tienda, respetando `robots.txt`, con pausa y reintentos. Normaliza por reglas (`lib/ingest/shopify.ts`): composición, grado, color, tallas con stock y género, más un ítem por producto × color. Cada campo lleva `evidence` con su procedencia (`declarado` / `inferido` / `desconocido`) y la cita. El envío es **un texto por tienda** escrito a mano en `scripts/ingest.ts`, con `toUS: true | false | null`; no guarda URL de la política ni fecha de revisión. Todos los días a las 05:17 (hora de Lima) un workflow de GitHub vuelve a descargar los catálogos y publica los cambios.

**Filtros y contadores.** `lib/filter.ts` evalúa cada criterio en tres estados: cumple, no cumple o **no se sabe** (la tienda no publica el dato).
- **Exactas:** cumplen todo.
- **"To confirm":** no fallan en nada, pero les falta al menos un dato. Ejemplo: se pide "100% alpaca" y la tienda no publica la composición. No se esconden ni se dan por buenas.
- **"+N":** junto a cada opción de filtro es ese mismo "por confirmar" (el tooltip dice "X exact · N to confirm"). Hoy no se explica en la interfaz.
- **Cálculo:** los contadores (`facetCounts`) se calculan en una sola pasada por faceta. Las opciones con 0 exactas y 0 por confirmar quedan deshabilitadas, pero siguen visibles.

**Búsqueda.** `lib/parseQuery.ts` es un parser **por reglas**, bilingüe, que convierte la frase en filtros y chips.
- "Brown sweater, 100% baby alpaca, size M, under $180" ya se interpreta completa (hay un test).
- Existe `/api/parse` con Claude, pero **solo se activa con `ANTHROPIC_API_KEY`, que no está configurada**. En producción, todo es por reglas.

## 2. Cobertura medida

### Composición
| Estado | Productos | % |
|---|---:|---:|
| Con porcentajes (incluye parciales) | 2.235 | 49,8 % |
| · de ellos, parciales (suman menos de 100) | 107 | 2,4 % |
| Materiales nombrados sin porcentajes | 1.320 | 29,4 % |
| · de ellos, "100%" deducido del texto (hoy marcado `inferido`) | 206 | 4,6 % |
| Nada publicado sobre la fibra | 934 | 20,8 % |

- **Sintéticos en la composición ya leída** (acrílico o poliéster): **208 productos**, de Sol Alpaca, Peruvian Connection, Peruvian Link y All Alpaca. Buscar "acrylic" o "polyester" en todo el texto da falsos positivos, como "botones acrílicos" o "forro de poliéster", así que hay que detectarlos solo en la composición.
- **Nailon/poliamida** aparece en 566 productos y **elastano** en 262 (búsqueda en el texto; son sobre todo calcetines y guantes).
- **"Dralon": 0 apariciones.** "Microfiber" asociado al acrílico: casi nada. Conviene mantener los sinónimos, pero hoy no cambian resultados.
- **Vocabulario actual:** 27 materiales distintos, fáciles de llevar a la lista controlada. Hay variantes en español ("elastano", "poliamida", "acrílico") y "imperial alpaca" (11).

### Grado y micras
- **Grado leído:** baby 2.400, royal 323 (hoy se guarda como `ultrafina`), super baby 88, sin grado 1.678.
- **Micras declaradas:** 9 productos (0,2 %), de Etno Alpaca, Peruvian Connection y Qinti. **No justifica un filtro;** conviene mostrarlas en la ficha.

### Sello AIA / Alpaca Mark
- "AIA-certified": **77 productos, todos de Etno Alpaca.** Ninguno indica el tipo de sello (Origin dorado/plateado, Blend), así que el tipo queda como `unspecified`.
- "Alpaca Mark", "Alpaca Origin Mark" y "Blend Mark": **0.**

### Envío por tienda (políticas leídas el 2026-09-26, robots.txt respetado)
| Tienda | Sale desde | Aranceles al recibir | Envío gratis | Plazo EE. UU. | Devoluciones |
|---|---|---|---|---|---|
| Sol Alpaca | Perú (DHL) | **No: DDP, se cobran en el checkout** | según tarifa | 3–6 días háb. | 30 días |
| Kuna USA | **EE. UU. o Perú por producto:** 394 de 765 tienen la etiqueta `express_shipping` (almacén en EE. UU., 2–5 días); el resto sale del almacén principal (10–15 días) | texto recortado: hay que leer la frase completa | — | 2–5 / 10–15 días háb. | 30 días |
| Incalpaca | Perú (courier) | no encontrado en la política | — | 15–20 días háb. | sí (plazo por confirmar) |
| Etno Alpaca | Perú | **Sí pueden aplicar** ("Import duties are not included") | — | — | 30 días (cambios) |
| All Alpaca | Perú (Serpost) | no encontrado | — | — | 2 días para cancelar |
| PAKA | EE. UU. (deducido) | — | desde US$150 | — | — |
| Peruvian Connection | EE. UU. | — | — | 7–10 días háb. | 30 días |
| Krimson Klover | EE. UU. | — | desde US$99 | — | 14 días |
| Peruvian Link | EE. UU. | — | desde US$199,99 | 2–8 días | 30 días |
| Qinti | EE. UU. (tiendas en Colorado) | — | desde US$200 | — | 15 días |
| Alpaca Collections | no encontrado | — | — | — | 30 días |

- **Qinti** figura hoy como "política no publicada" (`toUS: null`), pero la publica: hay que corregirlo.
- Estos textos cambian y cada tienda redacta distinto. La extracción automática sería frágil. Lo fiable es un **archivo curado** (`data/policies.json`): cada dato con su cita, URL y fecha. Un control diario avisaría cuando cambie la página de la política.

### Estilo (cambio 9)
Menciones en el texto:
| Dato | Cobertura |
|---|---:|
| Tipo de cuello | 13,3 % |
| Fit | 8,1 % |
| Capucha | 5,9 % |
| Lavable a máquina | 2,2 % |
| Tabla de medidas | 1,6 % |

Solo el cuello se acerca a algo útil. **No viable como facetas por ahora.**

### Precio atípico (cambio 5)
Simulación: mediana por categoría + grado + rango de % de alpaca, **solo con composición declarada**, sobre el precio original antes del descuento.
- **Con mínimo 8 por grupo y umbral 50 %:** 33 grupos cubren 1.499 productos y la regla **marca 48.**
- **Con umbral 40 %:** marca 30. Con mínimo 12 por grupo, los números casi no cambian.
- **Casi todos son falsos positivos:** piezas legítimamente más pequeñas o de otro tipo dentro de la misma categoría:
  - llaveros, peluches y figuras (en "otro");
  - bufandas de niño y calentadores de cuello;
  - capitas (*capelets*) frente a ponchos;
  - un adorno navideño.
- **Posibles casos reales (a revisar):** 2 suéteres de Incalpaca a US$117 frente a una mediana de US$271. Parecen rebajas publicadas sin precio "antes", no piezas dudosas.

## 3. Diferencias entre el prompt y los datos (regla 7)
1. **Etno Alpaca** escribe "Material: 100% AIA-certified Baby Alpaca" y hoy se guarda como *inferido*, sin composición. Es un **error de parseo nuestro** (el caso de tu fixture); hay 43 ítems así.
2. **PAKA "65% Royal Alpaca":** el resto de la composición **no está en los datos que leemos** (solo la etiqueta "Recycled Nylon", sin %). Es un *partial* genuino, no un error de parseo. Podría estar en la página del producto; leerla sería una fuente nueva y habría que revisar su robots.txt primero.
3. **Dos errores de parseo reales:**
   - "51% Suri baby alpaca" no se cuenta: un abrigo de 65 % alpaca figura con 14 %.
   - La errata "eslastane" no se reconoce.
   - Además, hay tiendas cuya composición suma más de 100 (Sol Alpaca: "67% Baby Alpaca, 40% Wool"). Eso es error de la tienda: se marcaría como `inconsistent` sin corregirlo.
4. **Royal vs. clases oficiales:** hoy el código **fusiona "Royal" con la clase oficial `ultrafina`**, justo lo que el prompt pide no hacer. Hay que separar el nombre comercial declarado de la clase oficial.
5. **El fixture "37% baby alpaca, 28% acrylic, 35% nylon"** no existe en el catálogo. Sirve como test sintético; el caso real parecido es "61% Baby Alpaca 37% Nylon 2% Elastano".
6. **"Ships to the US" sigue sirviendo:** el catálogo incluye 4 tiendas que no envían a EE. UU. (Kuna Perú, Incalpaca Remate, Anntarah, Pure Alpaca) y que quedan ocultas por defecto. Propuesta: dejarlo como filtro implícito, fijo y no visible, y usar en la interfaz "Ships from" y "No fees on delivery".
7. **Fuentes que no pude leer:** aia.org.pe, reglamentostecnicos.mincetur.gob.pe (la presentación de la NTP 2022) y esan.edu.pe están bloqueadas por la red de mi entorno. No pude revisar el robots.txt ni los términos de la AIA, ni confirmar la tabla 2022. Opciones: (a) permitir esos dominios en la configuración de red del entorno, o (b) usar tu tabla y las listas de la AIA en un archivo curado, con "verificado por Alpaca Atlas el <fecha>".
8. **Búsqueda:** la línea base es **10/25 (40 %)**. Las fallas son:
   - sinónimos: hoodie, blanket, llama;
   - nombres de tienda: Kuna, "Alpaca 111", Sol Alpaca;
   - filtros que aún no existen: sin aranceles, "ships from";
   - "won't itch", que debería llevar a un grado más fino;
   - las 6 preguntas.

   Todo eso se resuelve con reglas deterministas. Estimo **23–25/25 sin modelo de lenguaje**, así que el paso 3 (parser con modelo) probablemente no haga falta.

## 4. Dictamen por cambio

| # | Cambio | Viabilidad | Esfuerzo | Riesgos / condiciones | Orden |
|---|---|---|---|---|---|
| 2 | Composición normalizada, `alpaca_pct`, `has_synthetics`, `composition_status`, filtros por rango y "No synthetics", % junto al grado en la tarjeta | **Viable ya** | M | Corregir los 3 errores de parseo; test con los fixtures reales; "100%" declarado vs. inferido como dos estados distintos | **1** |
| 3 | Grado tal como lo declara la tienda + tooltip NTP 2022; micras en la ficha | **Viable ya** (tabla con condición) | S–M | Separar "Royal" de la clase oficial (cambia la faceta de grado y sus URLs de colección `royal-alpaca-*`: se mantienen); tabla 2022 sin verificar (ver 3.7) | **2** |
| 1 | Envío heredado por tienda: ships from, aranceles, envío gratis, plazos, devoluciones, con URL y fecha; filtros "Ships from" y "No fees on delivery" | **Viable con condiciones** | M | Archivo curado a mano (11 tiendas), no extracción automática; Kuna USA por producto según la etiqueta; revisión periódica de las políticas | **3** |
| 6 | Guías y textos (NTP 2022, acrílico/nailon, Alpaca Mark, autodescripción verificable) | **Viable ya** | S | Las citas dependen de 3.7; conservar los títulos y URLs de las guías | **4** (con 2 y 3) |
| 7 | UI: ocultar opciones en 0, explicar "+N"/"to confirm", chips removibles en móvil | **Viable ya** | S | Los chips removibles ya existen en escritorio; revisar el móvil | **5** |
| 8 | Búsqueda: eval + sinónimos + intención de pregunta con respuesta desde guías y políticas | **Viable ya (sin modelo)** | M | Las respuestas salen solo de guías y del archivo de políticas; el modelo queda como paso opcional si el eval no llega al 90 % | **6** |
| 4 | Sello AIA por producto + membresía de la tienda | **Viable con condiciones** | S | Solo Etno Alpaca lo menciona (77 productos, tipo sin especificar). La membresía necesita acceso a aia.org.pe o un archivo curado. Poco impacto hoy | **7** |
| 5 | Alerta de precio atípico | **No viable todavía** | M | 48 marcados, casi todos falsos positivos. Requiere antes una subcategoría (niño, souvenir, capita/poncho, calentador/bufanda). Propongo no activarlo y revisarlo cuando exista esa subcategoría | aplazar |
| 9 | Facetas de estilo | **No viable** con la cobertura actual (cuello 13 %, el resto por debajo del 8 %) | — | Solo el cuello podría mostrarse en la ficha, sin filtro | aplazar |

**Propuesta:** hacer 2 → 3 → 1 → 6 → 7 → 8 en una rama aparte, con un commit por cambio. Dejar 4 en su versión mínima (cita por producto) y aplazar 5 y 9, con los números de arriba como justificación.
