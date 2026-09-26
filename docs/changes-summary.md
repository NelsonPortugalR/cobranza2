# Resumen del paquete de mejoras (2026-09-26)

Rama: `claude/alpaca-atlas-data-quality`. Hay un commit por cambio, y tests y build pasan en cada uno. **No está desplegado:** producción sigue en `claude/alpaca-catalog-agent-rhyuwz` hasta que lo apruebes.

Las cifras son sobre los **4.738 productos visibles**: tiendas que envían a EE. UU. Qinti se suma porque su política sí lo publica.

## Qué se hizo

| # | Cambio | Estado | Commit |
|---|---|---|---|
| 0 | Viabilidad (`docs/feasibility.md`) | Hecho | `f40dfda` |
| 2 | Composición: vocabulario controlado, estado, sintéticos y filtros por % de alpaca | Hecho | `92116c7` |
| 3 | Grado tal como lo declara la tienda, tabla NTP 231.301:2022 y micras declaradas | Hecho | `0045a7c` |
| 1 | Envío: políticas curadas con cita, y filtros "Ships from" y "No fees on delivery" | Hecho | `62b8138` |
| 6 | Guías y textos (NTP 2022, mezclas, aranceles, sellos, autodescripción verificable) | Hecho | `01aaa5c` |
| 7 | UI: opciones sin resultados ocultas, "+N" explicado, chips grandes en móvil | Hecho | `9bd8105` |
| 8 | Búsqueda: eval, sinónimos, tiendas, envío, "no pica", preguntas con fuente | Hecho | `1c341d5`, `581a282` |
| 4 | Sello AIA por producto y membresía por tienda (versión mínima) | Hecho | `2c8d775` |
| 5 | Alerta de precio atípico | **No se activó** (ver abajo) | — |
| 9 | Facetas de estilo | **Aplazado** por cobertura baja | — |

## Decisiones tomadas por el camino

- **"Ships to the US":** sigue como filtro fijo por defecto, pero ya no aparece en el panel, porque todas las tiendas visibles envían a EE. UU. El panel muestra "Ships from" y "No fees on delivery".
- **"100% alpaca":** solo cuenta como coincidencia exacta si la tienda lo publica con porcentaje. Si lo dice solo con palabras ("pure baby alpaca"), la pieza queda como coincidencia posible y se rotula "per description".
- **Porcentajes que suman más de 100** (error de la tienda): se conservan tal cual con el estado `inconsistent`, un sexto estado que el prompt no preveía. Hay 3 casos.
- **Royal e Imperial:** son grados comerciales separados; no se fusionan con "Ultrafina". "Imperial" es el nombre que usa Kuna (20 productos). Buscar "imperial" encuentra ambos grados, como pedía el sinónimo.
- **Micras de referencia:** solo se usan para ordenar ("finest first"). Ya no se muestra un rango de micras deducido del nombre comercial.
- **Parser con modelo de lenguaje:** no hizo falta, porque las reglas llegan a 25/25. El que ya existía queda apagado detrás de `LLM_PARSER=on`, con estas protecciones:
  - modelo configurable en `PARSER_MODEL` (por defecto `claude-haiku-4-5`);
  - tiempo máximo de 1,5 s, sin reintentos;
  - caché por consulta y tope diario;
  - nunca recibe texto de productos.
- **Respuestas a preguntas:** salen solo de las guías y de `data/policies.json`, con enlace y fecha. Cuando no hay fuente, se dice.
- **Robot de lectura:** ahora se identifica como `AlpacaAtlasBot/1.0 (+https://alpacaatlas.com/about)`.

## Cobertura por campo (4.738 productos visibles)

| Campo | Con dato | Detalle |
|---|---:|---|
| Composición con % completa | 2.528 (53,4 %) | + 3 que suman más de 100 |
| Composición parcial | 75 (1,6 %) | p. ej. PAKA publica solo "65% Royal Alpaca" |
| Materiales sin % | 1.097 (23,2 %) | |
| "100%" solo por descripción | 157 (3,3 %) | se muestra "per description" |
| Composición no publicada | 878 (18,5 %) | se muestra "not listed" |
| Sintéticos | sí 211 · no 2.338 · no se sabe 2.189 | "no" exige composición completa |
| Grado | baby 2.596 · royal 324 · super baby 88 · imperial 20 · sin grado 1.710 | |
| Micras declaradas | 8 | por eso no hay filtro de micras |
| Sello AIA en la ficha | 77 (todos de Etno Alpaca, tipo no especificado) | |
| Desde dónde sale | EE. UU. 2.484 · Perú 1.455 · no publicado 799 | |
| Aranceles al recibir | ninguno 3.614 · pueden aplicar 89 · no publicado 1.035 | |
| Plazo de entrega | 2.964 | |
| Envío gratis desde | 1.885 | |
| Devoluciones (días) | 4.296 | |

## Conteos por filtro (exactos + posibles)

| Filtro | Exactos | Posibles |
|---|---:|---:|
| 100% alpaca | 1.548 | 1.361 |
| 70–99% | 417 | 1.984 |
| 50–69% | 424 | 2.015 |
| < 50% | 142 | 2.001 |
| Percentages not published | 2.132 | 0 |
| No synthetics | 2.338 | 2.189 |
| Ships from the US | 2.484 | 799 |
| Ships from Peru | 1.455 | 799 |
| No fees on delivery | 3.614 | 1.035 |
| Grado royal / imperial / super baby / baby | 324 / 20 / 88 / 2.596 | 1.710 cada uno |

"Posibles" son piezas que no contradicen el filtro, pero cuya tienda no publica ese dato.

## Búsqueda: precisión del eval

| | Casos correctos |
|---|---:|
| Antes (parser actual) | **10/25 (40 %)** |
| Después (reglas, sin modelo) | **25/25 (100 %)** |

- **Cómo se mide:** `tests/search-eval.json`; `npm test` falla si baja del 90 %.
- **Otras consultas:** probé 15 consultas que no están en el eval (tallas, colores, tiendas, devoluciones, "cheap", "without acrylic"). Salieron bien, salvo "on sale", que queda como texto porque no existe un filtro de rebajas.
- **Cambio en el caso 11:** tu prompt asignaba "Alpaca 111" a Kuna. Hoy incalpacastores.com redirige (301) a alpaca111.com, que es la tienda de Incalpaca. Seguí los datos y el caso espera Incalpaca.

## Precio atípico: no activado

- **Simulación** (mismo grupo de categoría + grado + rango de %, solo composición declarada, precio original antes del descuento): con **mínimo 8 por grupo y umbral 50 %** marca **48 productos**; con umbral 40 %, 30.
- **Casi todos son falsos positivos,** porque la categoría mezcla piezas de otro tamaño o uso:
  - llaveros, peluches y figuras (Incalpaca, Peruvian Link);
  - bufandas de niño y calentadores de cuello (Alpaca Collections, All Alpaca);
  - capitas frente a ponchos (Peruvian Link, Incalpaca);
  - un adorno navideño.
- **Posibles casos reales:** 2 suéteres de Incalpaca a US$117 frente a una mediana de US$271. Parecen rebajas sin precio "antes" publicado.
- **Propuesta:** crear primero una subcategoría (niño, souvenir, capita/poncho, calentador/bufanda) y repetir la simulación. La lista completa está en `docs/feasibility.md`.

## Fuentes verificadas

- **NTP 231.301:2022:** presentación del CTN 055 de INACAL (MINCETUR). La tabla coincide con la de tu prompt. Además muestra que "Super Baby" **sí** era clase oficial en 2014 (≤ 20 µm, luego 18,1–20). La guía decía lo contrario y ya está corregida.
- **AIA:**
  - Su robots.txt permite leer las páginas públicas.
  - Sus términos prohíben "copiar, distribuir o modificar la información sin autorización". Por eso no se lee de forma automática ni se copian sus listas: `data/aia-members.json` guarda a mano solo qué tiendas nuestras aparecen (Incalpaca, Etno Alpaca, Peruvian Link), con enlace y fecha.
  - Las URLs del prompt (`/licenciados/`, `/en/members/`) dan 404. Las listas reales están en `/miembros-asociados-*` y `/miembros-extraordinarios-*`.
- **ESAN:** sigue bloqueado desde mi entorno (quizá falta permitir `www.esan.edu.pe`). Por eso **no publiqué las definiciones de los sellos** Origin dorado/plateado y Blend, que no pude verificar. Ningún producto menciona un tipo de sello, así que hoy no afecta a nada.
- **Políticas de envío:** leídas el 2026-09-26 en las páginas `/policies/*` de cada tienda, respetando su robots.txt.

## Riesgos abiertos

1. **Las políticas cambian.** `data/policies.json` es manual. Propongo un workflow mensual que compare el texto de cada página de política y abra un aviso si cambió.
2. **Kuna USA:** no publica dónde está su "main warehouse"; 206 productos quedan con origen "not published".
3. **PAKA y Qinti:** no publican origen ni aranceles, así que sus productos aparecen como coincidencias posibles en esos filtros.
4. **"Inferred" en envío:** que Alpaca Collections, Peruvian Connection, Krimson Klover y Peruvian Link envían desde EE. UU. sale de su texto ("domestic", impuesto de ventas por estado, USPS), pero no lo dicen literalmente. Se rotula como "Inferred".
5. **Actualización diaria:** el workflow usa el código de la rama de producción. Estas mejoras solo se aplicarán en la actualización diaria después de fusionarlas allí.
6. **Email de contacto:** sigue pendiente. La página About promete responder "en 48 horas", pero no hay dirección.

## Próximos pasos sugeridos

1. Revisar y aprobar el despliegue (fusionar esta rama en la de producción y en `main`).
2. Subcategorías para rehabilitar la alerta de precio atípico.
3. Permitir `www.esan.edu.pe` para completar las definiciones del sello.
4. Workflow de vigilancia de políticas.
5. Filtro de rebajas ("on sale"), que ya existe como colección.
