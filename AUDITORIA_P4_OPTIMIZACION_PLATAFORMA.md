# Auditoría P4 — optimización transversal de la plataforma

**Fecha:** 2026-11-17  
**Rama:** GPSpedia2.2.5_work  
**Alcance:** llamadas duplicadas/en cascada, cargas secuenciales independientes, locks y consultas repetidas que puedan retrasar módulos no relacionados.  
**Estado:** auditoría inicial completada; P4.1 en preparación.

## Criterios de preservación

- Mantener RBAC, identidad/autor, fecha del servidor, idempotencia y consistencia de datos.
- No añadir verificaciones de sesión por acción ni nuevas llamadas de Coordinator a operaciones ordinarias.
- Mantener monitoreo de salud, telemetría best-effort y dashboard de actividad.
- No retirar cachés válidas ni sustituir cursores incrementales por descargas completas.
- No desplegar Apps Script, modificar ScriptProperties ni alterar hojas/Drive productivos.

## Hallazgos

### P4.1 — Arranque: catálogo y PyS se solicitan en cascada

Evidencia en JS/Frontend/auth.js:

- loadInitialData obtiene primero el cursor inicial mediante getCatalogFeedHead_ (GET a FEEDBACK).
- Después solicita la instantánea completa mediante fetchCatalogData (POST a CATALOG).
- Tras procesar el catálogo, solicita PyS mediante loadPysData({refresh:true}) (POST a FEEDBACK).
- En un primer arranque sin caché, las tres lecturas son independientes en cuanto a servicio/datos, pero el código actual las encadena. PyS mantiene su propia caché, estado, cursor y listeners en JS/Frontend/pys-data.js; no necesita esperar a que la instantánea del catálogo esté procesada.
- El fallo de PyS sin caché puede propagarse al catch general de loadInitialData y marcar como stale un catálogo que ya fue descargado y procesado correctamente. Además, setPysDataCursor se ejecuta después de la carga incluso cuando loadPysData puede devolver una caché obsoleta tras un error de red; se debe comprobar freshness antes de alinear el cursor.

**Corrección propuesta:** iniciar la lectura de PyS en paralelo con el cursor y la instantánea cuando se requiere un snapshot completo; aislar su error en el estado propio de PyS; solo alinear su cursor si la carga terminó con datos frescos. Conservar la ruta incremental y la aplicación de eventos PyS.

### P4.2 — Inbox: el compositor espera una lista que no necesita

Evidencia en JS/Frontend/ui.js:

- openInboxNewConversationForm_ cambia a la sección General cuando el usuario viene de la vista de solicitudes mediante await setInboxSection_("general").
- setInboxSection_ llama a setInboxView_, que espera loadInboxConversations_ y su solicitud remota cuando la caché no está fresca.
- Solo después de esa lectura se solicita getInboxRecipients, que es el único dato remoto indispensable para construir el formulario de nuevo mensaje.
- La lista de conversaciones y los destinatarios son independientes. El compositor no debe esperar la lectura de conversaciones.

**Corrección propuesta:** permitir cambiar el estado visual a General/Conversaciones y renderizar una página cacheada sin esperar una lectura remota; cargar destinatarios de inmediato y dejar la actualización de la lista en segundo plano. Mantener filtros, cursores, permisos y borradores.

### P4.3 — ADMIN: auditoría y organización Drive mantienen locks globales durante operaciones externas

Evidencia en JS/Services/admin.js:

- handleAuditDriveImagesInCortes espera hasta 30 s por ScriptLock y mantiene el lock durante la captura/lectura de referencias, navegación Drive y persistencia de resultados. Cada lote tiene presupuesto de recorrido de 18 s, además del trabajo previo/posterior.
- handleOrganizeUnusedImagesBatch espera hasta 30 s y mantiene el ScriptLock durante el procesamiento de hasta 20 archivos, lecturas/verificaciones Spreadsheet, comprobaciones de referencias, movimientos Drive, verificación de ubicación y posibles reversiones.
- handleSaveUnusedImagesInventory también adquiere el lock global para validar y persistir el inventario; se debe revisar el tramo exacto antes de modificarlo.
- Estas herramientas son operaciones de mantenimiento del Desarrollador y quedaron expresamente fuera de P2. No se deben mezclar con los aportes ordinarios ya optimizados.

**Corrección propuesta:** analizar una reserva breve/claim por lote y secciones críticas pequeñas para estado/ledger, sin mantener el lock global durante Drive. Preservar verificación final de referencias activas, confirmación de movimiento y rollback; no debilitar barreras de integridad para ganar velocidad.

### Rutas que ya conservan el comportamiento eficiente

- loadInitialData lee IndexedDB y CacheStorage en paralelo y muestra primero una instantánea local completa.
- Las escrituras de caché IndexedDB y CacheStorage ya se ejecutan en paralelo y tienen errores localizados.
- El dashboard obtiene logs, aportes e indicadores desde una sola respuesta getActivityLogs.
- El diagnóstico de salud consulta los siete servicios en paralelo; el monitoreo permanece de solo lectura.
- El escaneo de servicios y el ping de Coordinator del panel Developer ya se esperan con Promise.allSettled.
- El feed incremental mantiene cursores, páginas acotadas y reintentos limitados. No reemplazarlo por snapshot completo sin reset/inconsistencia.

## Orden de trabajo P4

1. P4.1: paralelizar la lectura independiente de PyS durante el snapshot inicial y aislar fallos de PyS; probar orden, deduplicación de solicitudes, freshness/cursor y preservación del catálogo.
2. P4.2: evitar que el compositor de Inbox espere la lista de conversaciones al abrirse desde Solicitudes; probar caché, destinatarios, borradores y permisos.
3. P4.3: auditoría detallada de locks/consultas Drive en ADMIN y diseño de lotes con secciones críticas breves; implementar solo después de demostrar idempotencia y seguridad frente a cambios concurrentes.
4. Ejecutar regresión integral y pruebas de telemetría/actividad tras cada cambio relevante.

## Límites

- Auditoría estática de fuentes y contratos. No se ejecutaron servicios Apps Script, Spreadsheet ni Drive.
- No se midieron latencias reales ni se atribuyen ahorros numéricos.
- Las validaciones de OAuth, concurrencia multiusuario y deployments quedan para Beta.
## Estado de ejecución — 2026-11-17

### P4.1 completada
- Se inició loadPysData una sola vez y en paralelo antes de solicitar el cursor inicial y la instantánea CATALOG. La fábrica de promesa comparte la petición y evita duplicados.
- Los errores de PyS quedan localizados: no marcan como error/stale un catálogo que ya se procesó. El cursor PyS solo avanza cuando la carga confirma datos frescos y existe una revisión válida.
- La ruta delta conserva sus cursores. Una caché PyS con error no se considera alineada aunque el cursor coincida.
- Pruebas: CatalogStartupParallelism 5/5; CatalogStartupIntegrity 25/25; PysDataCache 18/18.

### P4.2 completada
- Al abrir el compositor desde Solicitudes, setInboxView inicia loadInboxConversations en segundo plano, renderiza caché si existe y devuelve sin esperar la red. El formulario solicita getInboxRecipients de inmediato.
- El sondeo periódico se inicia cuando termina la carga de conversaciones y solo si el mismo contexto de sesión sigue activo, el modal continúa abierto y la vista sigue siendo Conversaciones.
- Si el usuario cierra el modal o cambia de vista mientras la lectura sigue pendiente, el callback no inicia un sondeo fuera de contexto.
- InboxUi 84/84 PASS.

### P4.3 — auditoría detallada; implementación no autorizada aún por falta de diseño seguro
- handleAuditDriveImagesInCortes usa lastRequestFingerprint, expectedCursorFingerprint y lastResponseCacheKey para reanudar/reproducir de forma idempotente un lote. El ScriptLock evita que dos solicitudes con el mismo cursor procesen y sobrescriban la misma página simultáneamente.
- handleSaveUnusedImagesInventory crea inventoryOperationId y inventorySubmissionDigest, marca processing, revalida referencias, lee el inventario completo y registra resultados de todos los archivos antes de guardar el resumen. El lock evita que reintentos simultáneos dupliquen filas o resultados.
- handleOrganizeUnusedImagesBatch procesa hasta 20 archivos y combina revalidación, movimientos Drive, read-back, persistencia y rollback. Retirar el lock sin una reserva por archivo puede permitir movimientos dobles o estados divergentes.
- Cambiar waitLock(30000) por tryLock(0) solo convertiría esperas en errores rápidos; no permite que operaciones ADMIN independientes progresen. Cambiar a UserLock tampoco es seguro sin confirmar la identidad de ejecución del deployment.
- Diseño requerido: claim/reserva atómica breve bajo ScriptLock por auditId/operationId + fingerprint; trabajo externo fuera del lock; commit/release breve bajo lock; expiración/recuperación de reservas; pruebas de duplicados concurrentes, reintento tras fallo entre Drive y Spreadsheet, rollback y ausencia de filas dobles.
- No se modificó admin.js en P4.3. Se preserva integridad hasta contar con ese contrato y pruebas.

### Validación CI y de servicios
- CI 44154032505 SUCCESS: 145 suites, 2,117 pruebas aprobadas, 0 fallos. P4.1: 5/5; CatalogStartupIntegrity: 25/25; InboxUi: 84/84.
- Health read-only 44154032506 SUCCESS: 7/7 servicios disponibles.
- Pages build 44154032544 SUCCESS. Esto no implica despliegue de Apps Script ni prueba de cambios en Drive/Spreadsheet.
### P4.3a — lectura del inventario reutilizada por lote — COMPLETADA
- En handleOrganizeUnusedImagesBatch, currentRows y duplicateIds se calculan una sola vez antes del bucle fileIds. El lote ya llega deduplicado y el ScriptLock mantiene estable el inventario ADMIN durante la operación.
- Se conserva latestRowsBeforeMove como lectura completa por archivo inmediatamente antes del movimiento, además de la revalidación de referencias activas, ubicación Drive, read-back y rollback. No se debilitó la protección frente a cambios externos/manuales.
- Para un lote máximo de 20 imágenes, se eliminan hasta 19 lecturas completas iniciales del inventario y 19 recalculaciones de IDs duplicados; se conserva la lectura final de seguridad por archivo.
- AdminReplacedImagesIntegrity 55/55 PASS; CI 44154558840 SUCCESS: 145 suites, 2,117 pruebas, 0 fallos. Health read-only 44154558782 SUCCESS: 7/7 servicios.
- P4.3b sigue pendiente: diseñar y probar reserva atómica breve por auditId/operationId antes de reducir el alcance del ScriptLock global. No se cambió el lock.
### P4.3b — deduplicación de auditoría Drive por lotes CacheService — COMPLETADA
- loadDriveAuditSeenIds_ ahora utiliza CacheService.getAll/putAll en grupos de hasta 100 páginas, y verifica la renovación con getAll.
- Se conserva la validación de cada página, normalización de IDs, unión global de archivos/carpetas y error explícito si falta o se corrompe una página.
- Para 205 páginas, el test confirma 3 lotes y 9 llamadas CacheService (6 getAll + 3 putAll), frente a 615 llamadas individuales que requería el ciclo get/put/get por página.
- AdminReplacedImagesIntegrity 56/56 PASS.

### P4.3c — publicación de cambios CATALOG en lotes — COMPLETADA
- ADMIN agrupa los cambios de catálogo en lotes de hasta 50; el Coordinator valida el lote completo y asigna revisiones consecutivas dentro de una sola sección crítica.
- SharedMutationClient genera un requestId y lo reutiliza durante los reintentos. Coordinator reconoce lotes completos ya publicados; si detecta persistencia parcial, agrega un evento reset para que el consumidor reconstruya el snapshot actual y no aplique snapshots antiguos fuera de orden.
- publishCatalogChange conserva el contrato individual; internamente usa la misma ruta de publicación por lotes.
- Para 20 registros modificados, ADMIN pasa de 20 viajes de red al Coordinator a 1 (95% menos); lotes mayores se dividen en grupos de 50.
- CatalogChangeFeed 30/30 PASS; SharedMutationCoordinator 65/65 PASS; AdminImageScanCoordinatorContract 1/1 PASS.

### P4.3d — alcance de ScriptLock — revisado; sin cambio de código
- El ScriptLock de ADMIN es local al proyecto Apps Script. Las operaciones de auditoría/inventario ya mantienen leases de Coordinator con recursos explícitos: auditoría lee CORTES/DRIVE/IMAGE_INVENTORY y escribe IMAGE_AUDIT_STATE; inventario/organización lee CORTES y escribe DRIVE/IMAGE_INVENTORY/ACTIVITY. Los conflictos entre operaciones que comparten recursos ya se coordinan transversalmente; los módulos independientes (AUTH/Inbox/FEEDBACK) no comparten ese ScriptLock.
- Retirar el lock local sin auditar todas las rutas internas/directas podría dejar sin protección el estado en ScriptProperties o el inventario. Sustituirlo por tryLock(0) solo cambia espera por error; UserLock depende de la identidad de ejecución del deployment, aún no verificada.
- Decisión: mantener el lock mientras no exista evidencia de contención entre acciones ADMIN que no comparten recursos. Las mejoras P4.3a-c reducen lecturas y viajes de red sin debilitar exclusión, idempotencia ni rollback. Reabrir solo con métricas de contención y una matriz completa de acciones/políticas.

## Resultado P4
P4.1, P4.2 y P4.3a-c completadas y probadas. La única línea diferida (P4.3d) se mantiene deliberadamente sin cambio por falta de evidencia de bloqueo independiente y por el riesgo de retirar protección redundante sin demostrarlo.
