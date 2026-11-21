# Auditoría FEEDBACK: escrituras concurrentes, identidad y proyección

Fecha: 2026-11-21  
Rama: `GPSpedia2.2.5_work`  
HEAD auditado: `de99e6ae9110de678d1f4ebfac3517e7c53f4b42`

## Alcance

Se revisaron `handleReportProblem`, `handleSuggestCutChange`, sus localizadores, Inbox, tickets propios, respuestas y adjuntos, junto con pruebas existentes y la sección 15 de `NORMAS_DESAROLLO.md`.

## Hallazgos

1. **Confirmación por posición anticipada (alta):** ambos handlers calculaban `getLastRow()+1` antes de `appendRow` y leían esa posición. Una escritura intercalada puede desplazar la fila propia y causar falso error de confirmación.
2. **Duplicados físicos (alta):** `findReportByReportId_` y `findCutSuggestionByOperation_` rechazan más de una coincidencia sin diferenciar replay idéntico de colisión de payload.
3. **Inbox (alta):** `handleGetFeedbackItems` pagina filas físicas y `handleGetMyProblemReports` no deduplica por identidad lógica; retirar locks sin proyección expondría tickets repetidos y alteraría cursores.
4. **Respuestas (alta):** `handleReplyToFeedback` exige una fila física única por ID del Inbox; la proyección debe seleccionar un registro canónico estable.
5. **Adjunto tardío (alta):** un reporte existente sin imagen puede actualizar in-place `reportMetadata`; falta sustituir esa mutación por una estrategia compatible con append-only.
6. **Drive (alta):** las imágenes deben conservarse cuando un append pudo persistir; la reconciliación debe identificar el adjunto canónico antes de eliminar duplicados.

## Implementación aplicada

- Se agregó `findFeedbackRowById_`, que localiza la fila realmente persistida mediante el ID físico reservado, valida coincidencia exacta y rechaza IDs físicos duplicados.
- Los dos handlers confirman la fila por ID después de `appendRow`; el índice previo queda limitado a copiar formato.
- Se añadió una prueba específica para escrituras intercaladas y duplicación de IDs físicos; se actualizaron las regresiones preflight.

## Pendiente P0

Esta fase no retira ScriptLock. Faltan proyección first-write-wins con rechazo de payload contradictorio, deduplicación y cursor lógico de Inbox/tickets propios, adjuntos tardíos append-only, reconciliación de imágenes y pruebas de concurrencia/replay. No declarar migrados los handlers antes de cubrir esos contratos.

## Validación

La auditoría de código es estática. La validación CI se ejecutará al publicar. La ejecución real de `appendRow`, TextFinder, Drive y carreras Apps Script/Sheets queda diferida a Beta aislada. No se desplegó Apps Script ni se modificaron datos productivos.
