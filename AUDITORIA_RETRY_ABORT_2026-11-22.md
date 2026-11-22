# Auditoría de reintentos y cancelación de solicitudes
Fecha: 2026-11-22
Rama: `GPSpedia2.2.5_work`
HEAD validado: `1ac0d9b88cd31f5d8d0a95f8d69ef8bb4f10c0bd`

## Hallazgo corregido

`runCatalogRequestWithRetry` podía invocar el callback de request si la señal externa se cancelaba en la pequeña ventana entre la comprobación inicial y la ejecución del microtask `Promise.resolve().then(request)`. El controlador ya estaba abortado, pero el callback aún podía ejecutarse y comenzar trabajo innecesario.

Corrección:
- Revalidar `externalSignal.aborted` después de registrar el listener.
- Revalidar otra vez dentro del microtask, justo antes de invocar `request(controller.signal)`.
- En la espera de backoff, comprobar la señal inmediatamente después de registrar el listener para no esperar el timer cuando la cancelación ocurrió durante la ventana de registro.
- Test nuevo: señal pre-abortada rechaza con AbortError y el callback de request no se ejecuta.
- `CatalogRequestRetry`: 8/8 PASS.

## Clasificación de reintentos

### Lecturas idempotentes
- `fetchCatalogData`: GET de `getCatalogData`.
- `getCatalogChanges`: GET del feed incremental.
- `getRichTextMode`: lectura de preferencia.
- `getServiceTraffic`, `getReplacedImages`, previews de reconciliación/organizador y lectura de historial: consultas; la sincronización de candidatos de `getReplacedImages` es idempotente por IDs.

### Operaciones con estado/cursor
- `auditDriveImagesInCortes`: el cliente reintenta el mismo cursor y payload; el test `AdminDriveAuditClientRetry` valida que el cursor no cambie, que HTTP 503/red se reintenten, que 400/error de aplicación no se reintenten y que `shouldContinue` detenga reintentos pendientes. 7/7 PASS.
- `applyCortesImageOrganizer` y `rollbackCortesImageOrganizer`: tienen estado durable por operationId y respuestas `already_applied`/`already_rolled_back`; los reintentos están limitados a dos intentos y los tests cubren recuperación.

### Mutaciones sin reintento automático
- `backupDatabase` y `applyCortesImageReconciliation` usan `maxAttempts: 1`; se evita crear respaldos duplicados o repetir escrituras cuando la respuesta es ambigua.
- Las mutaciones ordinarias de FEEDBACK/WRITE/Inbox usan sus propios operationId/read-back; no pasan por `routeActionWithRetry`.

## Resultado

No se encontró reintento automático inseguro en los consumidores actuales de `routeActionWithRetry`. Las mutaciones que podrían crear efectos no idempotentes están configuradas con un solo intento; las que admiten reintento tienen operación durable/estado y pruebas. Se corrigió la carrera de abort en las lecturas de catálogo/feed.

## Validación

CI HEAD `1ac0d9b88cd31f5d8d0a95f8d69ef8bb4f10c0bd`:
- `CatalogRequestRetry`: 8/8 PASS.
- `AdminDriveAuditClientRetry`: 7/7 PASS.
- Regresión: 296 suites / 3,455 pruebas / 0 fallos.
- Health read-only: SUCCESS.
- Pages build/deployment: SUCCESS.

No se ejecutaron pruebas Beta ni solicitudes contra producción.
