# Auditoría FEEDBACK y ADMIN — flujo extremo a extremo
Fecha: 2026-11-22
Rama: `GPSpedia2.2.5_work`
HEAD de partida: `09fec4a5bdf15ca82353f8d18223682d2bb9d6eb`

## FEEDBACK

### Autorización y despacho
- `doPost` deriva la acción y el payload; `authorizeFeedbackAction_` resuelve el actor de sesión y reemplaza `userId/userName/userRole` con datos del actor confiable.
- `FEEDBACK_ACTION_PERMISSIONS` distingue acciones autenticadas, roles administrativos y endpoints públicos declarados. `approveVideo` y `rejectVideo` quedan restringidas a Desarrollador; la ruta anónima de sugerencias conserva sus límites.
- Las operaciones ordinarias no adquieren `ScriptLock` global ni ejecutan `withSharedMutationLease_`. La única referencia a `withSharedMutationLease_` está dentro de `isFeedbackCoordinatorConfigured_`, usado para informar la configuración del endpoint debug; no envuelve handlers de aportes.
- Los handlers reciben el actor validado por el dispatcher; no vuelven a consultar Users/ActiveSessions ni Coordinator por cada acción.

### Escrituras, archivos y read-back
- Reportes/sugerencias: identidad lógica, append/read-back por ID reservado, proyección first-write-wins y detección de payload contradictorio.
- Adjuntos: ledger append-only por reportId; la limpieza de Drive solo se realiza cuando se confirma que el archivo no quedó referenciado.
- PyS: preflight/reintentos, imagen pending, read-back dirigido por opId, recuperación y catálogo usan el ledger existente.
- Tutoriales: título/renombrado proyectado desde eventos; búsquedas reutilizan un snapshot del ledger y conservan read-back después del append.
- Likes/sugerencias de año: replay/idempotencia, read-backs dirigidos y publicación CATALOG solo después de confirmar una mutación nueva.
- Inbox: proyección lógica, deduplicación, cursores, estado/preferencias por participante y auditoría por messageId.
- YouTube: transferencia resumable cliente→YouTube, registro de vídeo completado, aprobación idempotente, RBAC y ledger append-only; el hallazgo de init resumable sin asociación durable opVideoId→uploadUrl está documentado por separado como riesgo bajo.

### Cobertura automatizada
El runner `RunServiceTests.mjs` integra contratos para FEEDBACK, Inbox, PyS, Tutoriales, aprobación YouTube, publicación CATALOG, read-backs dirigidos, adjuntos y recuperación. La regresión más reciente del repositorio al inicio de esta auditoría fue 293 suites / 3,435 pruebas / 0 fallos.

## ADMIN

### Autorización y despacho
- `doPost` obtiene una sola vez el actor desde la caché de sesión del servicio ADMIN.
- `doPostInternal_` aplica `assertDeveloperSession` o `assertModalEditSession`; ambas usan `getAdminSessionContext_` sobre `__sharedSessionActor` y verifican localmente userId/rol/epoch. No hacen una segunda llamada a Coordinator ni leen Users/ActiveSessions.
- Las operaciones de edición de modal conservan la matriz Desarrollador/Jefe/Supervisor; mantenimiento, inventario y operaciones destructivas siguen restringidas a Desarrollador.
- El registro de auditoría persistente se inicia/finaliza en el propio servicio; los errores al iniciar son best-effort y no bloquean el handler.

### Dependencias y operaciones de datos
- Reserva de IDs: ADMIN llama a WRITE cuando necesita asignación; se conserva porque WRITE es la autoridad del ledger de IDs. Hay contratos de idempotencia, recuperación de respuesta perdida y preflight.
- Proyección de vehículo: `getAdminProjectedVehicleFieldSnapshot_` realiza una llamada dirigida a CATALOG para obtener valor fuente/eventId/candidatos. El read-back es necesario para distinguir aplicado, candidato, supersedido o no disponible.
- Inventario de imágenes reemplazadas: `handleGetReplacedImages` solicita una vez candidatos a CATALOG para sincronizar imágenes de aportes, luego lee el historial local y construye una instantánea de referencias activas Drive/Spreadsheet. La segunda fase no repite la consulta CATALOG; protege contra borrar archivos que siguen referenciados.
- `getVehicleContributionCandidates` es otra acción UI explícita desde el panel de revisión; no se dispara automáticamente dentro de la misma carga del inventario de imágenes.
- `getServiceTraffic` es una consulta read-only del panel Developer, con refresco limitado y actor cacheado; no forma parte de navegación/aportes ordinarios.

### Excepciones de coordinación que siguen presentes
Se encontraron tres llamadas a `withSharedMutationLease_`:
1. `saveUnusedImagesInventory`: protege una operación idempotente de inventario y su estado por auditoría.
2. `createCortesImageFolder`: protege la comprobación/creación de carpetas para evitar duplicados.
3. `auditDriveImagesInCortes`: protege el estado/cursor de una auditoría Drive reanudable.

Estas leases están limitadas a acciones administrativas explícitas, no a aportes ordinarios. Cada una añade adquisición/liberación remota y puede esperar hasta 12 s; el recurso se identifica por servicio/operación, no por todo ADMIN. No se retiran en esta auditoría: eliminar una sin un sustituto de idempotencia/concurrencia probado podría duplicar carpetas, filas de inventario o corromper el cursor de auditoría. Se registra una tarea específica para medir duración/contención y demostrar si el alcance puede reducirse sin serializar cargas ni acciones independientes.

## Resultado y siguientes pasos

**Auditoría estática FEEDBACK/ADMIN completada; no se encontró una llamada duplicada de alta confianza que deba eliminarse sin medición. No se modificó código.**

Pendientes concretos:
- Medir en Beta aislada el costo de las tres leases administrativas y el tiempo de inventario/escaneo Drive.
- Evaluar idempotencia de creación de carpetas y reservas por operación antes de cambiar su coordinación.
- Medir las llamadas CATALOG dirigidas y el escaneo de referencias Drive en el inventario; no sustituirlos por snapshots incompletos.
- Mantener los read-backs y ledger append-only que garantizan integridad, recuperación y seguridad.
