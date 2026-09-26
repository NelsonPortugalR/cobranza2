# Registro de búsquedas, reporte semanal e IA fuera de línea

## Qué se registra (anónimo)

| Evento | Datos |
|---|---|
| `search` | Consulta (con emails y teléfonos enmascarados), filtros interpretados, reglas o IA, intención, texto no entendido, resultados exactos y posibles, IDs de los 10 primeros, `reformulationOf` si reemplaza a una búsqueda sin clics de hace menos de 10 minutos |
| `click` | Búsqueda, producto y posición (desde 1) |
| `outbound` | Producto, tienda y búsqueda de origen (si la hubo) |

- **Sesión:** ID aleatorio en `sessionStorage`; se borra al cerrar la pestaña. Sin cookies.
- **Datos que no se guardan:** IP y cabeceras (el servidor no las lee).
- **Contexto:** cada evento lleva la hora y el entorno (`production`, `deploy-preview`…), que pone el servidor.
- **Pruebas:** abrir el sitio con `?atlas_test=1` marca la sesión como prueba. El reporte excluye las pruebas y todo lo que no sea de producción.
- **Retención:** 12 meses. La ruta `/api/log` purga lo anterior una vez al día.

## Dónde se guarda

- **Producción:** Netlify Blobs, almacén global `search-log`, claves `events/AAAA-MM-DD/…`. Viene incluido en Netlify; no es un servicio nuevo.
- **Deploy previews:** almacén del deploy, separado de producción.
- **Desarrollo:** `.search-log/*.ndjson` (ignorado por git).

**Pendiente:** el paquete `@netlify/blobs` no se pudo instalar desde el entorno de trabajo porque la política de npm devuelve 403. El código lo carga de forma dinámica: sin el paquete, el sitio funciona igual pero no guarda nada, y el reporte indica `storage: off`. Para activarlo, en cualquier máquina con npm:

```
npm install @netlify/blobs
git commit -am "Add @netlify/blobs for the search log" && git push
```

## Reporte semanal

`https://alpacaatlas.com/api/admin/search-report?token=<SEARCH_REPORT_TOKEN>`

- **Rango por defecto:** la semana anterior, de lunes a lunes (UTC). Otro rango: `&from=2026-10-05&to=2026-10-12`. Formato JSON: `&format=json`.
- **Contenido:** búsquedas, sesiones, % con clics, visitas a tiendas, % no entendidas, reformulaciones, **las 20 búsquedas más frecuentes sin resultado** y **las 20 con resultados pero sin clics**, con el texto que no se entendió.
- **Sin `SEARCH_REPORT_TOKEN` en Netlify,** la ruta responde 404.

## IA fuera de línea (semanal)

```
SEARCH_REPORT_TOKEN=… ANTHROPIC_API_KEY=… \
  node --experimental-strip-types --no-warnings scripts/search-suggestions.ts --url https://alpacaatlas.com
```

- **Qué hace:** manda a Haiku (`claude-haiku-4-5`, cambiable con `SUGGESTIONS_MODEL`) solo las consultas fallidas y los valores permitidos de cada filtro.
- **Qué escribe:** `reports/search-suggestions-AAAA-MM-DD.md` (ignorado por git, porque contiene búsquedas de usuarios).
- **Validación:** cada propuesta se comprueba contra los valores permitidos y se marca si la consulta ya se entiende hoy.
- **Nada se aplica solo.** Para aceptar una propuesta: agregar el sinónimo en `lib/parseQuery.ts` y un caso en `tests/search-eval.json`.
- **Sin clave, o con `--dry-run`,** muestra lo que enviaría.

## Criterio para encender el parser de IA en vivo (solo como respaldo)

- **Cómo funciona hoy:** apagado. Con `LLM_PARSER=on` + `ANTHROPIC_API_KEY`, el modelo se consulta **solo** si las reglas dejaron texto sin entender. Tiene tiempo máximo de 1,5 s, caché por consulta y tope diario (`LLM_PARSER_DAILY_LIMIT`, 1000). El modelo está en `PARSER_MODEL` (por defecto `claude-haiku-4-5`).
- **Propuesta para encenderlo:** que se cumplan las dos condiciones:
  1. Al menos 3 semanas completas de datos de producción y al menos 300 búsquedas reales por semana.
  2. "No entendidas" (sin resultados, o con texto no interpretado) por encima del **10 %** dos semanas seguidas, **después** de aplicar las propuestas semanales de sinónimos.
- **Para apagarlo de nuevo:** si el tiempo de respuesta p95 supera 1,5 s, si el costo pasa el tope, o si el eval (`npm test`) baja del 90 % con las reglas nuevas.
