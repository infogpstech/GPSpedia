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


## Adenda de validación CI — 2026-11-21

- El primer intento de CI sobre `660674222f450c70c5ac66690133b7cf47773c48` detectó únicamente una aserción de prueba demasiado estricta respecto a espacios en la llamada; se corrigió usando una expresión regular tolerante a formato. El código de servicio no falló en sintaxis.
- Commit validado: `b3ee926872b8dfbed90b584d755a09c1ceff53ca`.
- CI `44865504667` SUCCESS: 256 suites, 3079 pruebas aprobadas, 0 fallos; `FeedbackAppendRowIdentity` 3/3 PASS. Health read-only `44865504762` SUCCESS.
- Pages `44865504161` seguía en cola al emitir esta adenda. La ejecución real de Apps Script/Sheets/Drive y concurrencia de campo sigue pendiente de Beta.


## Cierre de migración de reportes y sugerencias de corte — 2026-11-21

- `handleReportProblem` y `handleSuggestCutChange` ya no adquieren `ScriptLock`. Ambos anexan filas completas y confirman la fila por ID reservado, sin depender de `getLastRow()+1` como ubicación física.
- Los reintentos usan identidad lógica (`reportId` y `suggestionOperationId`). Los localizadores proyectan la primera fila física si las copias son equivalentes y rechazan IDs reutilizados con payload contradictorio.
- Inbox filtra filas duplicadas por identidad lógica; los reportes propios deduplican antes de invertir el orden visual. Las respuestas siguen ligadas al ID físico canónico expuesto.
- Las imágenes de reportes se registran en `FeedbackReportImageEvents` mediante eventos append-only. La lectura proyecta el primer evento válido; hashes contradictorios generan error de reconciliación. La limpieza solo elimina un archivo cuando se confirma que su ID no quedó referenciado.
- Regresiones añadidas: `FeedbackAppendRowIdentity` 3/3, `FeedbackLogicalProjection` 4/4, `FeedbackReportImageEvents` 3/3; lookup reportes 5/5, lookup sugerencias 8/8; preflight y limpieza de ambos handlers; `P2FeedbackImageUploadLocks` 1/1 y `FeedbackLockFastFail`.
- CI `44866461350` SUCCESS sobre `d77a59bca8d92a531832219d1a6918906f401735`: 258 suites, 3089 pruebas aprobadas, 0 fallos. Health read-only `44866461297` SUCCESS y Pages `44866461264` SUCCESS.
- **Implementación local P0 de reportes/sugerencias: COMPLETADA.** La concurrencia real de Apps Script/Sheets/Drive y la inicialización/lectura del nuevo ledger deben verificarse en Beta aislada. No se desplegó Apps Script ni se modificaron hojas o datos productivos.

## Siguiente tarea — PyS

- Continuar con la migración de `handleAddProblem` para retirar el lock global de la escritura ordinaria, después de auditar el ledger actual, asociación de imágenes, IDs, deduplicación y consumidores de PyS.
- Mantener la carga Drive fuera del lock y evitar introducir una nueva capa transaccional; preservar autor/fecha, permisos, asociación de imágenes, reintentos y recuperación existentes.
