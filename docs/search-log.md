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

El almacenamiento está detrás de una interfaz mínima, `LogStore` en `lib/searchLog/store.ts`, con tres métodos: `append`, `read` y `purgeBefore`. Para migrar a una base de datos basta con una implementación nueva de esa interfaz; nada más cambia.

- **Producción:** Netlify Blobs, almacén global `search-log`, claves `events/AAAA-MM-DD/…`. Viene incluido en Netlify; no es un servicio nuevo.
- **Deploy previews:** almacén del deploy, separado de producción.
- **Desarrollo:** `.search-log/*.ndjson` (ignorado por git).

### Estado: esperando el paquete `@netlify/blobs`

- **Por qué no está:** la política de paquetes del entorno de trabajo lo bloquea (npm devuelve 403 "forbidden by your security policy"). No es un bloqueo de red: el registro de npm responde, pero el paquete está prohibido.
- **Opción A (acordada):** alguien del equipo, en una máquina con npm y en la rama del PR:
  ```
  npm install @netlify/blobs
  git commit -am "Add @netlify/blobs for the search log" && git push
  ```
- **Opción B, si A no ocurre:** cambiar la configuración de red del entorno no alcanza. Hace falta que un administrador de la organización permita `@netlify/blobs` en la política de paquetes de Claude Code, o que otro entorno con npm sin esa política ejecute la opción A (por ejemplo, un workflow de GitHub Actions que tú lances).
- **Mientras falte (verificado):** el sitio publica y funciona igual. `/api/log` responde 204, la búsqueda responde normal y el servidor solo registra un aviso ("@netlify/blobs no disponible; registro desactivado"). El reporte indica `storage: off`. Apenas llegue el paquete, el registro se activa en el siguiente deploy, sin cambios de código.

## Reporte semanal

- **Ruta:** `https://alpacaatlas.com/api/admin/search-report`
- **Token:** lo lee de la variable `SEARCH_REPORT_TOKEN` en Netlify (Project configuration → Environment variables). Solo la conoces tú. Hay dos maneras de enviarlo:
  - En el navegador del celular: `https://alpacaatlas.com/api/admin/search-report?token=TU_TOKEN`. Queda en el historial del navegador y en los registros de acceso de Netlify.
  - Desde un script o terminal (preferible): cabecera `Authorization: Bearer TU_TOKEN`, por ejemplo `curl -H "Authorization: Bearer TU_TOKEN" https://alpacaatlas.com/api/admin/search-report`.
- **Rango por defecto:** la semana anterior, de lunes a lunes (UTC). Otro rango: `&from=2026-10-05&to=2026-10-12`. Formato JSON: `&format=json`.
- **Contenido:** búsquedas, sesiones, % con clics, visitas a tiendas, % no entendidas, reformulaciones, **las 20 búsquedas más frecuentes sin resultado** y **las 20 con resultados pero sin clics**, con el texto que no se entendió.
- **Sin la variable, o con un token incorrecto,** la ruta responde 404.
- **Después de cambiar la variable,** hay que volver a desplegar para que la función la tome.

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
