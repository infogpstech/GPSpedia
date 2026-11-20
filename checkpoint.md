# GPSpedia — Checkpoint de continuidad

Fecha de actualización: 2026-11-20  
Repositorio: `infogpstech/GPSpedia`  
Rama de trabajo autorizada: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5`  
Fuente normativa única: `NORMAS_DESAROLLO.md`

## Rotación e historial

El checkpoint acumulado anterior se conserva íntegro en:
- `Checkpoint_Archive/checkpoint_2026-11-20_parte_004.md`
- Manifiesto: `Checkpoint_Archive/manifest.md`

La copia fue releída desde GitHub y comparada carácter por carácter con el original (179600 caracteres Unicode). No se truncó ni alteró el archivo histórico.

## Estado Git verificado

- HEAD de trabajo validado tras la última actividad local: `e05be7562135e18178eb9eed8f57e6196af664a3`.
- Rama base `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; comparación con la rama de trabajo: la rama de trabajo está 5668 commits por delante de base; base 0 commits por delante de trabajo; la base no se modificó.
- No se desplegó Apps Script ni se modificaron Spreadsheet/Drive productivos.
- Los cambios de documentación posteriores al HEAD de código son commits separados en la misma rama de trabajo; no alteran la base.

## Actividades locales cerradas

### 1. Reemplazo de imágenes ADMIN — COMPLETADO CON VALIDACIÓN BETA DIFERIDA

- `uploadAdminImage` registra la imagen en `ImageUploadEvents` y crea un evento `vehicle_update` en `AportesVehiculo`.
- El flujo no usa `AdminImageUploads` como ledger mutable, no retiene ScriptLock en la operación ordinaria y no escribe directamente en `Cortes`.
- Captura `expectedCurrentValue` y `expectedSourceEventId`; la URL anterior se toma de la versión lógica esperada, porque la fila materializada puede ir detrás de la proyección CATALOG.
- Verifica archivo Drive y reutiliza `operationKey`; enlaza el journal después del evento de vehículo y conserva archivos/eventos ante fallos parciales para revisión.
- La recuperación consulta currentImageUrl/currentSourceEventId desde la proyección CATALOG y la UI conserva el eventId fuente para posteriores reemplazos.
- Pruebas focalizadas: AdminImageUploadDriveIsolation 7/7; AdminImageUploadLinkedRecoveryIsolation 6/6; AdminImageUploadCompensationIsolation 8/8; ADMIN compensación de reemplazos in-modal 9/9.
- CI 44828376102 SUCCESS: 237 suites, 2942 pruebas aprobadas, 0 fallos; node --check PASS. Health read-only y Pages SUCCESS.
- Auditoría.txt registra el hallazgo como CORREGIDO LOCALMENTE. Beta AUG-160/AUG-159 sigue pendiente.

### 2. Retiro de UserLock para aportes a vehículos existentes — COMPLETADO LOCALMENTE

- `getWriteContributionLock_` fue eliminado de WRITE.
- Los aportes a vehículos existentes deben incluir `opId` estable y se envían directamente al ledger append-only `AportesVehiculo`; la ruta no adquiere UserLock ni ScriptLock.
- Un payload legacy de vehículo existente sin opId falla de forma explícita con `WRITE_OP_ID_REQUIRED`, antes de adquirir un lock.
- El ScriptLock inmediato queda limitado a la asignación secuencial de ID para un vehículo nuevo.
- Se verificaron los consumidores activos: el modal de detalle y `HTML/add_cortes.html` envían/reutilizan opId.
- Pruebas focalizadas: WriteCutPreflightOutsideLock 1/1; MutationLockContention 1/1; WriteContributionAppendConcurrency 7/7; WriteIdAllocatorNonBlocking 5/5.
- CI 44829158327 SUCCESS: 237 suites, 2942 pruebas aprobadas, 0 fallos; node --check PASS. Health read-only y Pages SUCCESS.

## Estado de trabajo pendiente

### P0 — GP-CONCURRENCY-CUT-MULTI-ENTRY-01

El núcleo append-only ya cubre cortes, apertura/alimentación, idempotencia por opId, conflictos de payload, VIN concurrente, candidatos por capacidad y recuperación tardía. No cerrar el P0 hasta completar los puntos pendientes del registro operativo:

1. Auditar las rutas FEEDBACK/reporte/sugerencia y confirmar sus contratos, idempotencia, manejo de adjuntos y aislamiento respecto de las escrituras WRITE.
2. Verificar el ciclo de imágenes de corte/apertura/alimentación cuando un evento queda como candidato por colisión o capacidad llena: referencia durable en AportesVehiculo/ImageUploadEvents, estado visible para ADMIN y conservación del archivo sin clasificarlo como materializado.
3. Completar señalización UI de conflictos tardíos para todos los puntos de entrada y no solo el modal de detalle.
4. Completar la regresión focalizada que falte y revisar el asignador de ID nuevo, conservando unicidad numérica sin ampliar el bloqueo a acciones ordinarias.
5. Beta real de appendRow concurrente, fallos parciales Drive/Sheets, pérdida de respuesta y reconciliación ADMIN solo en recursos aislados.

### P1 — GP-UX-RECENT-VIEWED-CACHE-PARALLEL-01

- La corrección inicial inicia la hidratación local antes de mostrar la aplicación, pero no se ha demostrado que el carrusel se pinte con datos cacheados en el primer render.
- Pendiente: asegurar hidratación IndexedDB/cache en paralelo, evitar lecturas duplicadas y añadir pruebas de orden, IndexedDB lento/no disponible y cambio de sesión.

## Beta pendiente y restricciones

- Consultar `lista_beta.txt` y todos sus segmentos. Prioridad de esta fase: AUG-159 (aportes/candidatos ADMIN) y AUG-160 (cargas ADMIN/ImageUploadEvents), más pruebas reales de appendRow, Drive, Spreadsheet y recuperación.
- Ejecutar solo con deployments WRITE/ADMIN de prueba, Spreadsheet/Drive aislados y cuentas autorizadas. Cumplir primero las condiciones de sincronización/fast-forward y árbol limpio de la matriz Beta.
- Safe Apply: preview real, ACL y rollback siguen pendientes; no ejecutar movimientos, renombrados ni borrados reales.
- No desplegar Apps Script, no cambiar endpoints operativos y no tocar datos productivos sin autorización expresa.

## Siguiente paso exacto

Continuar P0 con la auditoría del punto de entrada FEEDBACK/reporte/sugerencia y del ciclo de archivos de aportes candidatos. Mantener los cambios exclusivamente en `GPSpedia2.2.5_work`; actualizar pruebas, Tareas_Activas.md, Auditoría.txt, ChangesLogs.txt y este checkpoint al cerrar cada subactividad.


## Checkpoint — conversión de reportes FEEDBACK a aportes (2026-11-20)

- HEAD de código: `aa68d9524e16f6b48e1e985b77bce9fd90f5885c`. CI 44830752667 SUCCESS: 237 suites, 2943 pruebas, 0 fallos; InboxUi 87/87; AddCortesDiagnostics 12/12; Health read-only SUCCESS. Pages pendiente al último chequeo.
- FEEDBACK auditado: reportProblem/suggestCutChange se guardan en Feedbacks y no mutan Cortes. La sugerencia actual describe cambios de corte existente; IDs reportId/suggestionOperationId son idempotentes. El ScriptLock fast-fail de FEEDBACK queda pendiente de revisión §15.
- Inbox permite convertir un reporte en corte del vehículo (precargando la sugerencia si existe) o abrir alta de vehículo nuevo. Usa los flujos WRITE existentes y opId estable derivado del itemId. El reporte solo se marca resuelto tras confirmar el aporte; candidateReviewPending lo deja abierto.
- Registro ChangesLogs.txt rotado: partes 005/006 conservan exactamente el contenido anterior; manifiesto actualizado. El archivo activo se reinició con la actividad FEEDBACK posterior.
- Incidente de rama: update_file sin branch explícita creó temporalmente f02bda37 en main; se restauró main a su parent 037fc1bba9f24b1e31d50b93422d6a9299149026 con force-with-lease. GPSpedia2.2.5 permaneció sin cambios en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Siguiente P0: auditar conservación de imágenes de cortes/aperturas/alimentaciones candidatos frente a capacidad/colisión y su relación con la biblioteca Imagenes_Reemplazadas; completar señalización de conflictos tardíos en todos los puntos de entrada. Después revisar ScriptLock fast-fail FEEDBACK y asignador de ID nuevo.


## Checkpoint — inventario de imágenes candidatas (2026-11-20)

- HEAD de código: `becf384645557b17523f89c0708c10dd4c69cae8`. CI 44832283278 SUCCESS: 237 suites, 2943 pruebas, 0 fallos; AdminReplacedImagesIntegrity 56/56; ReplacedImagesLibraryUX 14/14; AdminVehicleContributionCandidates 6/6; Health read-only SUCCESS. Pages en cola al último chequeo.
- `Imagenes_Reemplazadas` registra candidatos de AportesVehiculo con tipo `candidata_aporte`. Sincroniza candidatos vigentes y resoluciones; estados en_uso/cancelada se derivan del evento de resolución. Acciones destructivas bloqueadas mientras esté pendiente o referenciada; descartados requieren escáner global sin referencias.
- Drive metadata se consulta fuera del lock; la escritura idempotente de inventario usa el lock de esquema; la sincronización posterior a resolución ocurre después de liberar el lock del ledger.
- P0 restantes: señalización de conflictos tardíos en todos los puntos de entrada; revisión del ScriptLock fast-fail FEEDBACK bajo §15; revisión del asignador de IDs de vehículos nuevos. Después regresión focalizada y solo entonces Beta.


## Continuidad — FEEDBACK y revisión de candidatos (2026-11-20)

- HEAD validado para regresión local: `8d1b217dbe094e8c08efef3029d24af993d81d22`.
- `reportId` de `openReportCutModal` ahora usa `crypto.randomUUID()` o `crypto.getRandomValues(24 bytes)`; se elimina `Math.random` y se conserva el mismo ID al reintentar el modal.
- ADMIN ahora muestra preview y enlace seguro para imágenes que viajan en `contributionCandidates`, incluidos campos `vehicle_update` de imagen. La URL se limita a `https://drive.google.com/file/d/{id}/view`.
- `completeVehicleExpansionSave_` conserva el estado `candidateReviewPending` de WRITE aunque el refresh CATALOG no muestre todavía el evento; ante fallo de refresh tampoco anuncia el aporte como aplicado.
- CI 44833154077 SUCCESS: 237 suites, 2951 pruebas, 0 fallos; node --check PASS. Health read-only y Pages se verifican por separado. No se desplegó Apps Script ni se modificaron datos productivos.
- FEEDBACK auditado: `reportProblem` y `suggestCutChange` conservan contratos separados en Feedbacks; no mutan Cortes/AportesVehiculo. El `ScriptLock` global fast-fail no se retiró porque aún protege IDs secuenciales, deduplicación y recuperación de aplicaciones de año. Es una tarea abierta contra §15: sustituirlo por un journal append-only, con pruebas de reintentos y concurrencia, antes de eliminarlo.
- P0 sigue abierto por la migración del lock FEEDBACK, revisión de asignador de ID nuevo y validación Beta real AUG-159/AUG-160. P1 recent-viewed sigue pendiente.


## Cierre local — GP-UX-RECENT-VIEWED-CACHE-PARALLEL-01 (2026-11-20)

- HEAD de código validado: `8bbff8e52d6cf5a0e57beadd9e3b7bcd5d33f788`.
- `handleLoginSuccess` inicia la hidratación local antes de `showApp`; IndexedDB de búsqueda y vistos se consulta en paralelo, sin bloquear el render inicial.
- El carrusel se hidrata de forma independiente por ownerId. Reintenta solo la lectura local no disponible, descarta respuestas tardías si cambia sesión/propietario y no consulta servicios remotos para reconstruirlo.
- La suscripción de `viewedItems` actualiza solo `renderRecentlyViewedCarousel`; la apertura de ficha actualiza memoria inmediatamente y persiste una sola vez.
- `RecentlyViewedHydrationParallel` 3/3; `RecentlyViewedCarousel` contract 1/1. CI 44833576889 SUCCESS: 237 suites, 2954 pruebas, 0 fallos; node --check PASS. Health read-only SUCCESS; Beta visual pendiente.
- P1 local cerrado. P0 permanece abierto por migración del ScriptLock FEEDBACK, revisión del asignador de IDs nuevos y Beta AUG-159/AUG-160.
