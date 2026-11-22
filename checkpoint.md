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


## 2026-11-20 — Corrección del lector CATALOG

- `readVehicleContributionEvents_` ahora admite `vehicle_update` únicamente con `actorId` presente y `opId` `OP-ADMIN-`, alineándose con `projectVehicleContributionEvents_` y con el contrato de actualizaciones versionadas ADMIN.
- Se añadió prueba funcional al conjunto `VehicleContributionProjection`: evento válido admitido; evento sin actor y evento con prefijo opId no permitido rechazados.
- CI `44834146336` SUCCESS: 237 suites, 2956 pruebas aprobadas, 0 fallos. Health read-only SUCCESS. No se desplegó CATALOG ni se tocaron recursos productivos.
- P0 sigue abierto: `handleSuggestYear`/`completeFeedbackYearApplication_` todavía modifican directamente `Cortes.anoDesde/anoHasta`; hay que migrar esa aplicación a `AportesVehiculo` con recuperación idempotente. El ScriptLock global de FEEDBACK sigue protegiendo deduplicación y asignación de IDs; no retirarlo hasta resolver esas dependencias.


## Continuidad — corrección FEEDBACK voto positivo repetido (2026-11-20)

- Commits de trabajo: `1a4b0909d3ec881207f4cb120f668091ced056e2` (código), `66da8f2aa102665f8a32a4039e3d63046e580c19` (prueba).
- Hallazgo corregido en código: `handleSuggestYearLocked` referenciaba `voteActors`, variable local de otra función; ahora deriva `hasVerifiedPositiveVote` desde `allData` con filtros de identidad/vehículo/año/respuesta positiva.
- Se añadió regresión a `JS/Tests/SuggestYearVoteThreshold.mjs`. La lectura remota confirma que el código y la prueba están presentes. Node/CI no se ejecutó ni se obtuvo un estado de Actions para el commit.
- Pendiente: ejecutar prueba focalizada y suite FEEDBACK; completar migración de aplicaciones de año a un flujo append-only concurrente, retirar ScriptLock global sin perder idempotencia, y revisar asignador de IDs. No desplegar ni tocar datos productivos.


## 2026-11-20 — Sugerencias de año FEEDBACK append-only

- HEAD de código validado: `66da8f2aa102665f8a32a4039e3d63046e580c19`.
- `handleSuggestYearLocked` reconstruye anoDesde/anoHasta desde la fila base y los eventos aceptados de AportesVehiculo. Conserva el eventId fuente y el valor raw de cada campo.
- `completeFeedbackYearApplication_` ya no modifica directamente Cortes. Registra `vehicle_update` por campo con `expectedCurrentValue`, `supersedesEventId`, `opId` `OP-YEAR-` estable y actor interno `SYSTEM:FEEDBACK_YEAR`.
- `FeedbackYearApplications` añade columnas para preservar valores/fuentes originales, por lo que un reintento tras append parcial reutiliza el mismo contenido y opId. El append se verifica por SHA-256 y lectura posterior.
- Si la proyección reconstruida no alcanza el rango esperado, el registro queda `requires_review`; no se marcan votos como aplicados ni se informa que el catálogo cambió. La invalidación CATALOG se ejecuta después de liberar el ScriptLock.
- CATALOG valida y proyecta `OP-YEAR-` únicamente con actor `SYSTEM:FEEDBACK_YEAR`. Umbral de tres votos verificados y exclusión de anónimos conservados.
- Pruebas: FeedbackYearApplicationAppendOnly 4/4; SuggestYearVoteThreshold 7/7; CI 44834891294 SUCCESS: 238 suites, 2963 pruebas, 0 fallos; health read-only SUCCESS. No se desplegó FEEDBACK/CATALOG ni se modificaron recursos productivos.
- P0 permanece abierto: reducir ScriptLock global de FEEDBACK para reportes, sugerencias, likes, PyS, tutoriales, contacto y asignador secuencial de IDs; después ejecutar Beta AUG-159/AUG-160.


## 2026-11-20 — FEEDBACK contacto fuera del lock global

- `handleSendContactForm` valida y limita frecuencia sin retener ScriptLock. `getNextFormulaBasedId_` reserva el ID en su sección crítica breve; la fila completa se anexa con `appendRow`, se verifica por ID y se formatea después.
- Pruebas `FeedbackContactWriteNoGlobalLock` 2/2 y `FeedbackLockFastFail` PASS. CI `44835219987` SUCCESS: 239 suites, 2965 pruebas aprobadas, 0 fallos. Health read-only SUCCESS. Sin despliegue FEEDBACK ni cambios productivos.
- P0 sigue abierto: reducir lock global en `reportProblem`, `suggestCutChange`, `recordLike`, PyS, tutoriales y otras mutaciones. Mantener el lock breve del asignador secuencial mientras siga siendo necesario.


## 2026-11-20 — Validación estricta del ledger de años

- `getFeedbackProjectedVehicleYearSnapshot_` valida todas las filas de `AportesVehiculo` antes de reconstruir el rango y detecta conflictos de `opId` incluso entre vehículos. El snapshot no acepta un ledger malformado ni proyecta operaciones ambiguas.
- Pruebas `FeedbackYearApplicationAppendOnly` 5/5 y `SuggestYearVoteThreshold` 7/7. CI `44835550127` SUCCESS: 239 suites, 2966 pruebas aprobadas, 0 fallos. Health read-only SUCCESS.
- No se desplegó Apps Script ni se modificaron datos productivos. El lock global FEEDBACK sigue abierto para el resto de las mutaciones; contacto ya reserva el ID bajo lock breve y anexa fuera.


## 2026-11-20 — Regresión local append-only completada

- `WriteContributionAppendConcurrency` 9/9 y `WriteContributionRecovery` 9/9: intercalados, slots, opId idéntico/conflictivo, capacidad, VIN y recuperación tras pérdida de respuesta en flush/appendRow.
- `VehicleContributionProjection` cubre candidatos, conflictos, cadenas ADMIN, `vehicle_update` y eventos de año `OP-YEAR`.
- CI `44835751507` SUCCESS: 239 suites, 2968 pruebas aprobadas, 0 fallos. Health read-only SUCCESS.
- La concurrencia real de `appendRow`, errores reales de Spreadsheet/Drive y reconciliación siguen pendientes de Beta AUG-159/AUG-160 en recursos aislados.


## Revalidación de continuidad — 2026-11-20

- CI `44835908125` SUCCESS: 239 suites, 2968 pruebas aprobadas, 0 fallos. Health read-only `44835908123` SUCCESS.
- P0 continúa abierto exclusivamente para la reducción del ScriptLock global en las rutas FEEDBACK restantes y las validaciones Beta reales AUG-159/AUG-160. No se desplegó Apps Script ni se modificaron recursos productivos.


## Checkpoint — auditoría de asignador numérico y locks FEEDBACK (2026-11-20)

- Se verificó que las reservas de ID numérico pasan por WRITE: alta nueva y endpoint `allocateVehicleId`; ADMIN consume este endpoint antes de su lock local. `CortesIdReservations` conserva opId, hash e ID; los reintentos idénticos recuperan la misma reserva y un hash distinto se rechaza.
- `getNextCortesVehicleIdLocked` y `handleAllocateVehicleId` mantienen `tryLock(0)`. La exclusión sigue siendo necesaria para no duplicar IDs numéricos. Regresiones existentes de asignador, E2E ADMIN→WRITE y lectura acotada quedan incluidas en CI 44835751507 SUCCESS: 239 suites, 2968 pruebas, 0 fallos.
- Se revisaron locks FEEDBACK: likes (contador read-modify-write), reportes/sugerencias (deduplicación), PyS (first-write-wins/relaciones) y tutoriales/video (unicidad/transiciones) requieren sustituto append-only/versionado antes de retirarlos. No usar UserLock como reemplazo entre usuarios.
- La ruta heredada `WRITE/addVinToVehicle` conserva lock global y no tiene consumidor encontrado en módulos frontend principales; sigue expuesta por api-config, así que no se elimina sin revisar integraciones externas.
- No se modificó código de producción en esta auditoría ni se desplegó. Próximo: migrar una ruta FEEDBACK por vez con journal/proyección y regresión; revisar compatibilidad de `addVinToVehicle`.


## Checkpoint — FEEDBACK likes con preflight dirigido (2026-11-20)

- HEAD de código validado: `3dd1c84798b3482562c9ef9d3af9085bf254d8fd`.
- `handleRecordLike` valida/localiza el vehículo y corte antes del ScriptLock; dentro revalida por ID. La búsqueda del ledger se limita al actor mediante `TextFinder`; no se descargan completas `Cortes` ni `FeedbackLikes`.
- El lock sigue protegiendo la deduplicación y el incremento read-modify-write con recuperación pending/completed. No retirarlo hasta migrar a eventos append-only y proyección CATALOG.
- `FeedbackLikePreflightOutsideLock` 5/5 PASS. CI 44836655370 SUCCESS: 240 suites, 2973 pruebas, 0 fallos. Health read-only y Pages seguían en ejecución al momento de este registro.
- No se desplegó ni se modificaron datos productivos.


## Checkpoint — búsquedas dirigidas y replay previo en sugerencias (2026-11-20)

- HEAD de código validado: `6ed838d95e454b43ad068fb7b4e2cc7e8d4282b8` (incluye actualizaciones de pruebas; el test de replay también está ya en la rama de trabajo).
- `findReportByReportId_`, `findCutSuggestionByOperation_` y `findCutSuggestionByRequest_` ya no descargan toda la hoja: buscan por `TextFinder` en metadata/Problema y leen coincidencias.
- `handleSuggestCutChange` realiza preflight de replay antes de Drive/lock; si no existe, carga imagen y revalida bajo lock antes de crear. Una carrera ganada por otra solicitud se resuelve liberando lock y limpiando el adjunto duplicado.
- Pruebas focalizadas: report lookup 4/4; suggestion lookup 6/6; suggestion preflight 6/6; image cleanup 5/5; P2 feedback upload 1/1.
- CI 44837377505 SUCCESS: 243 suites, 2989 pruebas, 0 fallos. Health read-only 44837377778 SUCCESS; Pages estaba en ejecución.
- El lock de nueva escritura sigue activo; se redujeron las búsquedas y se evitan locks/Drive en replays, sin alterar atomicidad.
- Incidente de rama: test file creado accidentalmente en `main`, eliminado en `de13b119529415b8d85e03331647cb5422cb8a1c`; `main` ya no contiene el archivo y `GPSpedia2.2.5` no se modificó.
- No se desplegó Apps Script ni se modificaron datos productivos.


## Checkpoint — replay previo de reportes (2026-11-20)

- HEAD de código validado: `3f890dc0cf24196e76f51c0170ae5aa8cbcbe2e9`.
- `handleReportProblem` ahora busca reporte existente antes de subir imagen/adquirir lock. Replays idénticos devuelven el registro existente; si falta imagen, carga y revalida bajo lock; si el SHA-256 difiere, rechaza.
- `handleSuggestCutChange` realiza replay previo y revalida dentro del lock. Búsquedas de reportId/opId se limitan a columnas metadata/Problema y filas coincidentes.
- Pruebas focalizadas: report lookup 4/4, report preflight 5/5, suggestion lookup 6/6, suggestion preflight 6/6, image cleanup 5/5, P2 upload/lock 1/1.
- CI 44837729816 SUCCESS: 244 suites, 2994 pruebas, 0 fallos. Health read-only del commit anterior SUCCESS; Health y Pages del HEAD seguían en ejecución.
- No se retiró el lock de nuevas escrituras; los replays comunes se resuelven sin lock/Drive, y las nuevas altas mantienen deduplicación y revalidación atómica.
- No se desplegó Apps Script ni se modificaron datos productivos.


## Checkpoint — preflight de tutoriales (2026-11-20)

- HEAD de código validado: `9f1619f12e7e96e985492f35d7425b11d90ca758`.
- `handleAddTutorial` preconsulta el ID determinista antes del lock y devuelve replays idénticos sin sección crítica. Si no existe, adquiere lock, revalida el ID, verifica título único y anexa.
- Búsqueda de ID limitada a columna A (TextFinder o fallback limitado); unicidad de título limitada a columna B. La sección crítica de altas nuevas permanece.
- `FeedbackTutorialPreflightOutsideLock` 7/7 PASS; regresiones P2 de tutorial PASS. CI 44838077134 SUCCESS: 245 suites, 3001 pruebas, 0 fallos. Health read-only 44838077089 SUCCESS; Pages en ejecución.
- No se desplegó ni se modificaron datos productivos.


## Checkpoint — aprobaciones YouTube con lookup dirigido (2026-11-20)

- HEAD de código validado: `6ac8cbf2ddb4e2239f3bcde5e9c2439d27633c7c`.
- `findVideoApprovalByOperation_` y `findPendingVideoApprovalForTarget_` ya no leen toda `Feedbacks`; consultan la columna Problema, parsean coincidencias y leen filas concretas. Los fallbacks también leen solo esa columna.
- `handleSubmitVideoForApproval` conserva `withVideoApprovalMutationLock_` para unicidad de opVideoId/destino y append coordinado.
- `FeedbackPendingVideoLookupBoundedRead` 6/6 PASS; `FeedbackVideoApprovalOperationLookupBoundedRead` 5/5 PASS. CI 44838760886 SUCCESS: 248 suites, 3018 pruebas, 0 fallos. Health read-only 44838760925 SUCCESS.
- No se desplegó ni se modificaron datos productivos.


## Checkpoint — búsquedas dirigidas PyS y tutoriales (2026-11-20)

- HEAD de código validado: `87ca969ad9e24a1e005d61574e2a0532ac8f034f`.
- `findPysRowsById_` consulta columna A y carga solo filas coincidentes; fallback de columna para mocks/adaptadores sin TextFinder.
- `findTutorialRow_` consulta ID en A y título en B; `handleUpdateTutorialItem` verifica título único en B excluyendo su propia fila.
- Aprobaciones de vídeo: lookups de opVideoId/destino pendiente en Problema, con lectura dirigida y detección de duplicados.
- Pruebas: PyS 5/5; tutorial lookup 6/6; tutorial title update 5/5; pending video 6/6; opVideoId 5/5.
- CI 44839134803 SUCCESS: 250 suites, 3028 pruebas, 0 fallos. Health read-only 44839135309 SUCCESS; Pages pendiente.
- Locks de creación/actualización permanecen para unicidad e integridad; se redujo lectura dentro de las secciones críticas.


## Checkpoint — actualización tutorial sin cambios (2026-11-20)

- HEAD de código: `e4eb5e52aaf0100fb6dabe1b24deadc21e1c0d3c`.
- `handleUpdateTutorialItem` hace preflight de solo lectura; si todos los campos ya coinciden, devuelve `alreadyUpdated` sin lock ni escritura. Si existe una diferencia, conserva el lock y repite lectura/validaciones antes de mutar.
- Regresión `FeedbackTutorialUpdateNoopPreflight` 6/6 PASS; cubre no-op sin lock, mutación protegida, relectura bajo lock y conservación de cambios concurrentes en otros campos. CI `44839930123` SUCCESS: 251 suites, 3034 pruebas aprobadas, 0 fallos; `node --check` PASS. Health read-only `44839930193` SUCCESS.
- No se desplegó Apps Script ni se modificaron datos productivos.
- Pendiente: reducción segura de los locks FEEDBACK restantes, revisión/migración compatible de `WRITE/addVinToVehicle`, Beta AUG-159/AUG-160 y concurrencia real en recursos aislados.
\n\n## Checkpoint — replay VIN sin lock (2026-11-20)\n\n- HEAD de código validado: `7897c7e2affac73b36bae05574c3204f8540cf82`.\n- `handleAddVinToVehicle` resuelve reintentos idénticos antes del ScriptLock solo cuando la fila del vehículo es única y el VIN ya ocupa la posición de la versión existente. Autenticación requerida; cualquier ambigüedad o cambio cae a la ruta protegida.\n- El replay no reserva versión de catálogo ni publica invalidación CATALOG. Las mutaciones reales mantienen lock, validación global de duplicados y escritura/verificación.\n- `WriteVinNoopPreflight` 5/5 PASS; CI `44843217994` SUCCESS: 252 suites, 3039 pruebas, 0 fallos; `node --check` PASS. Health read-only `44843218037` SUCCESS.\n- Pendiente: diseñar evento compuesto o transacción equivalente para migrar la actualización conjunta `versionesAplicables` + `vin`; confirmar compatibilidad externa de `addVinToVehicle`; continuar reducción de locks FEEDBACK solo con sustitución segura; Beta AUG-159/AUG-160 y concurrencia real con recursos aislados.\n- No se desplegó Apps Script ni se modificaron datos productivos.\n\n\n## Checkpoint — replay de likes completados sin lock (2026-11-20)\n\n- Código validado: `79c64f3a951c295b24e808c78b491910bc7c85a5`; test/runner actualizados hasta `ea7755954e01764d17785c7e604cf3588fa195eb`.\n- `handleRecordLike` consulta antes de ScriptLock si el usuario ya tiene un like `completed` para ese vehículo/corte. Solo responde desde preflight si el esquema coincide, hay exactamente una fila y el contador es válido. Los demás casos mantienen el flujo protegido.\n- `FeedbackLikeCompletedReplayPreflight` 6/6 PASS; `WriteVinNoopPreflight` 5/5 PASS. CI `44843605977` SUCCESS: 253 suites, 3045 pruebas, 0 fallos; `node --check` PASS. Health read-only `44843605917` SUCCESS.\n- No se retiró el lock del incremento read-modify-write ni se alteraron registros. Pendiente: reducción adicional segura de locks FEEDBACK, migración atómica/compatible de la mutación VIN y Beta AUG-159/AUG-160/concurrencia real aislada.\n

## Checkpoint — migración VIN compuesta append-only (2026-11-21)

- HEAD de código validado: `193bea26a26095dd215e2d980ad1547addf37868`.
- `WRITE/addVinToVehicle` mantiene el endpoint público, autentica una vez y resuelve replays exactos sin bloqueo. Las mutaciones crean un único evento `vehicle_update` con `fieldName=vin_registration`, estado esperado y valores siguientes de `versionesAplicables` + `vin`; no hay escritura directa a `Cortes` ni ScriptLock.
- CATALOG acepta `OP-WRITE-VIN-` solo con `actorId`, incorpora el VIN del evento al detector global de colisiones y aplica ambas propiedades bajo una sola comprobación de estado. Si otra operación ganó la carrera o el VIN colisiona entre vehículos, conserva el evento como candidato y no aplica parcialmente la versión ni el VIN.
- Se mantuvo el preflight de replay no-op; se actualizaron las pruebas de compatibilidad para mutaciones append-only sin lock. `VehicleContributionProjection` incluye aplicación compuesta, carrera por estado esperado y colisión intervehicular. `WriteVinNoopPreflight` 5/5 PASS.
- CI `44846704840` SUCCESS: 253 suites, 3053 pruebas aprobadas, 0 fallos. Health read-only `44846704778` SUCCESS. Pages `44846704653` SUCCESS.
- Commits: `6ff121aa1bd5b1cf51ae96af3de02855b941f877`, `e8feb02c62175871a77e378266abaace701c6d0c`, `193bea26a26095dd215e2d980ad1547addf37868`.
- Pendiente inmediato: continuar reducción de locks FEEDBACK solo con sustitutos seguros para sus invariantes; no sustituirlos por `UserLock`. Beta AUG-159/AUG-160, concurrencia real de appendRow y validaciones en Apps Script/Spreadsheet/Drive aislados siguen diferidas. No se desplegó Apps Script ni se tocaron datos productivos.


## Checkpoint — reservas de IDs FEEDBACK append-only (2026-11-21)

- HEAD de código validado: `0ca418c20e7b78933884339b246cf3950622c90b`.
- `getNextFormulaBasedId_` ya no toma ScriptLock ni incrementa una propiedad mutable. `__IdentifierSequenceReservations__` conserva reservas append-only; `appendRow` asigna orden físico único y una fórmula cuenta reservas previas de la misma hoja/columna para calcular el sufijo. El helper confirma la reserva por UUID antes de devolver el ID.
- Se mantienen validaciones del patrón de fórmula, prefijo/relleno, duplicados, sufijos inválidos y filas con datos sin ID. Las reservas no utilizadas generan huecos, no reutilización de IDs.
- `FeedbackFormulaIdAllocator` 5/5; `FeedbackFormulaIdAllocatorBoundedRead` 6/6. CI `44847431570` SUCCESS: 253 suites, 3053 pruebas, 0 fallos. Health read-only `44847431590` SUCCESS. Pages `44847431763` estaba en ejecución.
- Próximo: continuar con mutaciones FEEDBACK que conservan ScriptLock (likes nuevos, reportes, sugerencias, PyS, tutoriales y aprobaciones de vídeo). No sustituir locks por UserLock ni retirar exclusiones sin journal/proyección o control de versión. La fórmula y concurrencia real del ledger se validarán en Beta aislada. No se desplegó Apps Script ni se tocaron datos productivos.


## Checkpoint — likes FEEDBACK append-only (2026-11-21)

- HEAD de código validado: `6d6dde830533b404223ef63a372af501ed2193e9`.
- Likes nuevos: `handleRecordLike` consulta preflights, anexa un evento `event` en `FeedbackLikes` con `appendRow` y verifica el replay; no modifica el contador físico ni adquiere ScriptLock. Los eventos repetidos del mismo actor/vehículo/corte se deduplican por actor. CATALOG suma los actores únicos al contador histórico en el catálogo completo y en snapshots; el feed de `recordLike` publica reset directo para evitar el lock de versión.
- Los replays legacy `completed` incluyen los eventos nuevos en el contador efectivo. Los registros legacy `pending` conservan recuperación bajo lock hasta su reconciliación.
- `logUserActivity` anexa una fila completa con la fórmula de ID calculada por fila; evita la secuencia `getLastRow` + escrituras por celda.
- Pruebas `FeedbackLikeAppendOnly` 4/4, `ActivityLogAppendAtomic` 6/6, `FeedbackLikeActivityOutsideLock` 5/5, `FeedbackLikePreflightOutsideLock` 5/5, `CatalogChangeFeed` 35/35. CI `44848455795` SUCCESS: 255 suites, 3063 pruebas, 0 fallos. Health read-only `44848455802` SUCCESS. Pages `44848455600` pendiente al registrar.
- P0 continúa abierto: `reportProblem`/`suggestCutChange`, PyS, tutoriales y aprobaciones de vídeo conservan locks por deduplicación, first-write-wins, unicidad y transiciones. Próximo: migrar la ruta de reportes/sugerencias a append-only con deduplicación de lecturas y recuperación de adjuntos; no retirar locks sin cubrir esos contratos. No se desplegó Apps Script ni se modificaron datos productivos.


## Checkpoint — likes sin ScriptLock, incluida recuperación legacy (2026-11-21)

- HEAD de código validado: `adbed85e48e99c5b0cda256f713a00d66450b3d7`.
- `handleRecordLike` ya no adquiere ScriptLock ni modifica el contador físico. Los likes nuevos se anexan en `FeedbackLikes` como eventos `event`; CATALOG proyecta actores únicos sobre el contador histórico y `recordLike` publica reset. Los replays `completed` son no-op. Los registros legacy `pending` se resuelven sin lock: `currentCount===target` significa incremento histórico ya aplicado; `currentCount===previous` se completa anexando evento; otros valores requieren reconciliación manual.
- `logUserActivity` escribe fila completa con `appendRow` y fórmula por fila. `getNextFormulaBasedId_` reserva sufijos con ledger append-only.
- Pruebas `FeedbackLikeAppendOnly` 4/4, `FeedbackLikeCompletedReplayPreflight` 6/6, `FeedbackLikeActivityOutsideLock` 5/5, `FeedbackLikePreflightOutsideLock` 5/5, `CatalogChangeFeed` 35/35. CI `44848965971` SUCCESS: 255 suites, 3063 pruebas, 0 fallos. Health read-only `44848965894` SUCCESS. Pages `44848965693` pendiente.
- P0 sigue abierto: `handleSuggestYear`, `reportProblem`/`suggestCutChange`, PyS, tutoriales y aprobación de vídeos mantienen locks. Próximo objetivo: retirar lock de `handleSuggestYear` mediante su ledger de votos/aplicaciones y preservar umbral de tres votos, actor único y recuperación de generaciones. No se desplegó Apps Script ni se modificaron datos productivos.


## Checkpoint — primera respuesta determinista en sugerencias de año (2026-11-21)

- Commit: `8c8a7dac2ce2743642bebfdfcfcccdb387cdbe56`.
- `countVerifiedPositiveYearSuggestionVotes_` ahora aplica first-write-wins por orden físico de filas: el primer registro de cada actor verificado para vehículo/año determina si su voto cuenta. Las filas siguientes del mismo actor no pueden convertir un voto negativo en positivo ni volver a contarlo.
- Se añadieron casos de regresión para respuestas contradictorias en ambos órdenes en `SuggestYearVoteThreshold.mjs`.
- CI: servicio de regresión SUCCESS (255 suites, 3064 pruebas, 0 fallos); health read-only SUCCESS; build SUCCESS. Deploy/Pages estaba en ejecución al registrar.
- Estado P0: `handleSuggestYear` **sigue usando ScriptLock** y aún modifica el ledger de aplicaciones y las filas históricas de Feedbacks. Este commit es preparación de proyección, no retiro del lock. Próximo: anexar votos completos de forma atómica, deduplicar por actor con primer evento físico, usar aplicación determinista append-only y reconstruir recuperación desde eventos sin mutar votos históricos. No desplegar Apps Script ni tocar datos productivos.



## Checkpoint — append atómico de votos y aplicaciones de año (2026-11-21)

- HEAD de código: `51bd127600d81de4deda9f8083b3bef708075da8`; pruebas/contratos: `8d80bac41d4c29e9b90d598e89eca818e03bff79`.
- `handleSuggestYearLocked` anexa votos nuevos con una fila completa mediante `Feedbacks.appendRow`, incluyendo ID reservado, actor y contenido. El conteo first-write-wins usa el primer registro físico por actor/vehículo/año; votos contradictorios posteriores no alteran el primero.
- El ledger `FeedbackYearApplications` ahora recibe cada aplicación mediante `appendRow` de 16 campos y verifica que el operationId se haya guardado exactamente una vez. Se mantiene UUID como ID de aplicación por ahora.
- Pruebas `SuggestYearVoteThreshold` 8/8, `FeedbackYearApplicationAppendOnly` 7/7. CI para el commit de contratos `8d80bac41d4c29e9b90d598e89eca818e03bff79`: 255 suites, 3066 pruebas, 0 fallos; health read-only y build seguían ejecutándose al registrar.
- **No se retiró ScriptLock.** Continúan pendientes la deduplicación determinista de aplicaciones concurrentes, eliminación de cambios de estado como fuente de verdad, recuperación append-only que no renombre votos históricos y control de conflictos de generaciones. Mantener bloqueo hasta completar esos contratos. No desplegar Apps Script ni modificar datos productivos.



## Checkpoint — aplicación determinista y deduplicación (2026-11-21)

- Código de identidad determinista: `a41de8b995705df1af577ab7aa81b41e279501db`; reconciliación de filas duplicadas: `437a0092e34a6a5b684bcfc7005a624166ab47ed`; corrección de regex de vehículo: `f9802e51775112410bf7ececf754e279a38564b2`; pruebas: `953e9347c7d34696b8a1646c516e73ba758eee7d`.
- El ID de aplicación se deriva de SHA-256 de vehículo/año/rango anterior/rango objetivo/valores crudos y fuentes de eventos. Reintentos idénticos generan el mismo `YSA-...`; propuestas distintas no comparten identidad.
- Las filas pendientes se agrupan por ID; duplicados con la misma propuesta se recuperan juntos y se actualizan en todas sus filas. Distintas propuestas pendientes para el mismo vehículo se envían a revisión manual.
- Validación CI: 255 suites, 3068 pruebas aprobadas, 0 fallos; `SuggestYearVoteThreshold` 8/8, `FeedbackYearApplicationAppendOnly` 9/9, health read-only SUCCESS.
- **No se retiró ScriptLock.** Queda pendiente eliminar la mutación de claves de votos históricos y convertir recuperación/estado en un flujo append-only antes de quitar bloqueo. No desplegar Apps Script ni modificar datos productivos.



## Checkpoint — votos históricos sin mutaciones (2026-11-21)

- Commit `54fb8600d0767de7c1bd7207b8f73027fff2ae64`: eliminación de la reescritura de claves de aportantes en `completeFeedbackYearApplication_`. Commit de prueba `99d25f8a040c54e47a0618a19751e4fcc7e815ac`.
- La finalización ya no muta `Feedbacks`; conserva cada fila y actor tal como fueron registrados. El estado de aplicación se consulta por el ID determinista y los eventos de actualización. Las claves históricas `applied:user:...` se reconocen solo por compatibilidad; no se crean nuevas.
- Validación: `SuggestYearVoteThreshold` 8/8, `FeedbackYearApplicationAppendOnly` 10/10; 255 suites, 3069 pruebas, 0 fallos; health read-only SUCCESS.
- ScriptLock no se ha retirado. Sigue pendiente migrar el estado de ledger a eventos append-only y resolver coordinación concurrente antes de quitar bloqueo. No desplegar Apps Script ni modificar producción.



## Checkpoint — ledger de eventos de aplicaciones de año (2026-11-21)

- Commits: `10e513ea2872eaeb2afdb2b2fb20b3772f3c5e19` (esquema y append de eventos), `a85afc9fe13d4bac1f208bdf06715aba1db48d5e` (proyección de pendientes), `97ed8ce1d528b5785b781e933065276baef956b1` (finalización por eventos), `33fa06f9673825492ed56657b4d93863361fe72c` (detección de payloads contradictorios), pruebas `6bde2d4191015e43f37531e258b158a63ac8d801`.
- Nuevo ledger `FeedbackYearApplicationEvents`: eventos append-only `activity_attempted`, `requires_review`, `completed`; eventId determinista por operación/tipo/payload; reintentos idénticos no duplican lógicamente y conflictos de payload se rechazan.
- La búsqueda de aplicaciones pendientes proyecta estado desde eventos; finalización ya no actualiza `FeedbackYearApplications.status/activityAttempted/updatedAt` ni reescribe `Feedbacks`.
- Validación: 255 suites, 3071 pruebas, 0 fallos; `SuggestYearVoteThreshold` 8/8, `FeedbackYearApplicationAppendOnly` 12/12; build SUCCESS y health read-only SUCCESS.
- ScriptLock permanece activo. Pendiente: coordinación y recuperación bajo concurrencia, revisar todos los consumidores del esquema, y retirar el lock solo después de pruebas equivalentes. No desplegar Apps Script ni tocar datos productivos.



## Checkpoint — handleSuggestYear sin ScriptLock global (2026-11-21)

- Commit de retiro de lock y pruebas: `64a054b54ea3974c98484d5ced3ee69a1c6010d9`, `b0a98ea8165dc758197dd8f538a1f49de7dd4577`, pruebas ajustadas `86e6cbcb9fac561830b842eef2e4f4977bb46308`.
- `handleSuggestYear` ya no llama a `LockService.getScriptLock`, `acquireFeedbackScriptLock_` ni `releaseLock`. La secuencia usa votos append-only, applicationId SHA-256 determinista, ledger de eventos `FeedbackYearApplicationEvents`, vehicle_update append-only con expected value/source y deduplicación de eventos por identidad.
- `FeedbackYearApplications` y `Feedbacks` dejan de mutarse durante recuperación/finalización; el estado se proyecta desde eventos. Se mantienen compatibilidades de lectura legacy.
- CI commit `86e6cbcb9fac561830b842eef2e4f4977bb46308`: 255 suites, 3073 pruebas, 0 fallos; `FeedbackYearApplicationAppendOnly` 14/14, `FeedbackYearFolderSyncOutsideLock` 5/5, `SuggestYearVoteThreshold` 8/8; build SUCCESS y health read-only SUCCESS.
- **Alcance:** lock retirado solo para `handleSuggestYear`; otros flujos P0 (reportProblem/suggestCutChange, PyS, tutoriales y aprobaciones de vídeo) siguen pendientes. Beta real Apps Script/Sheets/Drive pendiente. No desplegar Apps Script ni modificar producción.



## Checkpoint — reportProblem y suggestCutChange: append de fila completa (2026-11-21)

- `handleReportProblem` commit `a5b2332935ecd161a43b0b0c7ff821e538e33c75`, verificación completa `32ace63c0e72139fb6e51a3636b971a2bb8e6c08`; pruebas `fb9120980e717bf8ef1d949ac764db3d92d7a167`.
- `handleSuggestCutChange` commit `1f2aedbf6a8141e3167ac42fe94d7ad558b20ff1`; pruebas/contratos `55774f0716c97b6adcefd7e231d35cdaf75b478f`.
- Ambos handlers anexan cada nuevo registro como una fila completa con `appendRow`, en lugar de escribir ID, contenido y estado en varias operaciones. Confirmación lee los campos críticos; si la escritura pudo persistir, se conserva el adjunto y no se ejecuta rollback destructivo.
- Los dos handlers **mantienen ScriptLock** y revalidación interna; todavía no se han migrado a idempotencia concurrente append-only. No retirar lock hasta implementar proyección/deduplicación de operaciones y probar carreras reales.
- CI commit `55774f0716c97b6adcefd7e231d35cdaf75b478f`: 255 suites, 3075 pruebas, 0 fallos; build, health read-only y Pages SUCCESS. Pruebas reportes 6/6 + 5/5; sugerencias 7/7 + 5/5; P2 adjuntos 1/1.
- No desplegar Apps Script ni modificar producción.


## Continuidad — corrección de confirmación de sugerencias FEEDBACK (2026-11-20)

- Se detectó que `handleSuggestCutChange` escribía `Problema` en el índice base cero correcto, pero verificaba `savedRow[COLS_FEEDBACKS.Problema]` sin restar uno. Esto podía devolver error después de que `appendRow` hubiera persistido correctamente.
- Se corrigió la lectura a `savedRow[COLS_FEEDBACKS.Problema - 1]` y se añadió una aserción en `FeedbackSuggestionPreflightOutsideLock.mjs` que exige el índice correcto y rechaza el desplazado.
- La validación local no se ejecutó en este entorno; verificar el workflow CI tras publicar.
- P0 continúa EN PROGRESO: reportes/sugerencias aún usan ScriptLock y requieren proyección append-only/idempotente; después siguen PyS, tutoriales y aprobaciones de vídeo.


### Adenda de validación — corrección FEEDBACK (2026-11-20)

- El primer workflow detectó un error en la expresión de la aserción añadida, no en el código de servicio. Se simplificó la regresión a comprobaciones de texto exactas para evitar escapes ambiguos.
- Commit de ajuste de prueba: `f81b316b595f1675637d84f2e25fd1775083a83d`.
- CI `44861738724` SUCCESS; health read-only `44861738743` SUCCESS. La validación de sintaxis y la suite integral se ejecutaron en GitHub Actions sobre la rama autorizada.
- La corrección puntual queda validada localmente por CI. No equivale al cierre de la migración P0 de FEEDBACK.


## Continuidad — operationId determinista para sugerencias de corte (2026-11-21)

- `handleSuggestCutChange` ahora deriva `suggestionOperationId` como `SUG-<requestFingerprint>` cuando el cliente no proporciona un ID. La huella incluye reporte, vehículo, corte, usuario, justificación, propuesta e imagen (SHA-256).
- Los clientes que ya envían un ID válido conservan su identificador; no cambia el contrato ni se elimina `ScriptLock`.
- Esta preparación hace que reintentos idénticos de clientes legacy compartan una identidad estable, necesaria para la deduplicación append-only posterior. No resuelve por sí sola la carrera de dos escrituras simultáneas.
- Pendiente: ledger/proyección de operaciones, consumidores compatibles con duplicados físicos, pruebas de concurrencia y después evaluar retiro seguro del lock.


### Validación CI — operationId determinista de sugerencias (2026-11-21)

- Commit probado: `5ddbac743472e3df71149773b5d15c8894fd74cb`.
- Suite de regresión `44862604331` SUCCESS: 255 suites, 3076 pruebas aprobadas, 0 fallos.
- Health read-only `44862604227` SUCCESS; build/Pages `44862603548` SUCCESS.
- `node --check` de los módulos JavaScript modificados completado por el workflow. El cambio local queda validado; no se desplegó Apps Script ni se modificaron hojas o datos productivos.
- La migración completa de idempotencia/concurrencia de reportes y sugerencias sigue EN PROGRESO; este paso solo cubre identidad estable para sugerencias sin opId.


## Continuidad — auditoría FEEDBACK y confirmación de fila por ID (2026-11-21)

- Auditoría documentada en `AUDITORIA_FEEDBACK_APPEND_ONLY_2026-11-21.md`: se encontraron confirmaciones basadas en `getLastRow()+1`, localizadores que rechazan duplicados físicos, lectura del Inbox por filas físicas y adjuntos tardíos con metadata mutable.
- Se añadió `findFeedbackRowById_`; reportes y sugerencias confirman la fila persistida por su ID reservado después de `appendRow`. La posición anticipada queda solo para formato.
- Se incorporó `FeedbackAppendRowIdentity.mjs` y se actualizaron las pruebas preflight de ambos handlers. ScriptLock permanece hasta completar proyección lógica, deduplicación de Inbox y ciclo append-only de adjuntos.
- CI pendiente para este commit; no se desplegó Apps Script ni se modificaron datos productivos.


### Adenda de validación — confirmación FEEDBACK por ID (2026-11-21)

- Commit de código/pruebas: `b3ee926872b8dfbed90b584d755a09c1ceff53ca`.
- CI `44865504667` SUCCESS: 256 suites, 3079 pruebas aprobadas, 0 fallos; `FeedbackAppendRowIdentity` 3/3 PASS. Health read-only `44865504762` SUCCESS.
- El primer CI encontró una aserción de prueba sensible a espacios; se corrigió la prueba y el siguiente CI pasó. No se detectó fallo de sintaxis ni de lógica del servicio.
- La tarea P0 sigue EN PROGRESO: aún no se han migrado los locks ni la proyección de duplicados/Inbox/adjuntos.


## Cierre P0 — reportes y sugerencias de corte sin ScriptLock (2026-11-21)

- Commit validado: `d77a59bca8d92a531832219d1a6918906f401735`. `handleReportProblem` y `handleSuggestCutChange` ya no adquieren el lock global; ambos confirman filas por ID reservado y anexan registros completos.
- Proyección first-write-wins con detección de payload contradictorio para `reportId` y `suggestionOperationId`; Inbox y reportes propios ocultan duplicados lógicos y conservan el ID físico canónico.
- Nuevo ledger append-only `FeedbackReportImageEvents` para adjuntos tardíos y asociación de imágenes sin mutar reportMetadata. Los eventos con hashes distintos se envían a reconciliación.
- CI `44866461350` SUCCESS: 258 suites, 3089 pruebas, 0 fallos; health read-only `44866461297` SUCCESS; Pages `44866461264` SUCCESS.
- Implementación local completada; concurrencia real y ledger deben validarse en Beta aislada. No se desplegó Apps Script ni se modificaron datos productivos.
- **Siguiente tarea inmediata: PyS / `handleAddProblem`**, auditar y migrar su escritura ordinaria para retirar ScriptLock conservando IDs, autor/fecha, imágenes, reintentos, recuperación y consumidores.


## Inicio de migración PyS — auditoría de handleAddProblem (2026-11-21)

- Auditoría registrada en `AUDITORIA_PYS_APPEND_ONLY_2026-11-21.md`.
- Confirmado: Drive y verificación de imagen ya están fuera del lock; ScriptLock sigue cubriendo relectura de operaciones, asignación de ID, escritura/actualización de PysOperations, append/confirmación PyS y rutas de recuperación.
- Riesgos: `getPysNextId_` calcula max+1 y no es seguro para operaciones concurrentes; `writePysOperation_` usa setValues sobre `getLastRow()+1`; `readPysOperations_` y `validatePysRecords_` rechazan cualquier duplicado físico; `handleGetPysData` devuelve filas físicas sin deduplicar.
- Implementación propuesta: reutilizar `IdentifierSequenceReservations` para IDs `isue-`; appendRow de operación completa; first-write-wins por opId/payloadHash; proyección de filas PyS idénticas; preservar compensación conservadora de Drive. Las mutaciones de solución, prevención y relaciones se mantienen fuera del alcance inmediato y conservan su lock.
- No se desplegó Apps Script ni se modificaron datos productivos.


## PyS — fase 1 de implementación (2026-11-21)

- Auditoría: `AUDITORIA_PYS_APPEND_ONLY_2026-11-21.md`.
- Implementado: ID PyS `isue-###` mediante `IdentifierSequenceReservations` con sufijo mínimo legacy; nuevas reservas `PysOperations` con `appendRow`; first-write-wins por `opId`/hash; separación entre lookup físico y canónico; lectores de PyS y feed deduplican filas idénticas y rechazan contradicciones.
- CI `44867570021` SUCCESS: 258 suites, 3091 pruebas, 0 fallos; health read-only `44867570032` SUCCESS; Pages `44867569879` SUCCESS.
- Pendiente: retirar ScriptLock de `handleAddProblem` tras implementar la selección del propietario canónico en carreras, limpieza de archivos duplicados y reintentos simultáneos. Las mutaciones de solución, prevención y relaciones siguen fuera de alcance y conservan sus locks.


## PyS — fase 2: colisión de reservas fail-closed (2026-11-21)

- HEAD inicial: 974985f915daaea6df8862b0fa996e125759fbba; cambios de código/prueba: e3ec7253d74a3c7130007f0769b28fca370637d1 y 9baf0467cf11e4038c9e6312dc769f0b6af4c060.
- Se corrigió una ambigüedad en readPysOperations_: un mismo opId y payloadHash repetido con distinto problemId ya no se trata como replay idéntico. Se rechaza para reconciliación antes de crear una imagen.
- Regresión agregada a PysCreationIntegrity.js. CI 44873477741 SUCCESS: 258 suites, 3092 pruebas aprobadas, 0 fallos; health read-only 44873477634 SUCCESS. Pages 44873477531 seguía en ejecución al actualizar este checkpoint.
- handleAddProblem todavía conserva ScriptLock. La migración lock-free sigue bloqueada hasta definir y probar la propiedad canónica del opId y del archivo frente a reintentos concurrentes; no retirar el lock con la arquitectura actual de estados mutables.
- Sin despliegue Apps Script ni cambios en Spreadsheet/Drive productivos.


### PyS — fase 2b: propiedad de archivo sin ambigüedad (2026-11-21)

- Se endureció readPysOperations_: duplicados físicos del mismo opId/hash/problemId también deben apuntar al mismo imageFileId/imageUrl. Diferencias de propiedad de archivo se rechazan para reconciliación.
- Nueva regresión en PysCreationIntegrity. CI 44873650200 SUCCESS: 258 suites, 3093 pruebas, 0 fallos; health read-only 44873650247 SUCCESS; Pages 44873650240 queued al momento del registro.
- No se retiró ScriptLock de handleAddProblem. El siguiente trabajo sigue siendo diseñar/probar el ledger de reserva canónica y propiedad de imagen antes de migrar el handler.
- Sin despliegue ni cambios productivos.

## Checkpoint — PyS handleAddProblem sin ScriptLock (2026-11-21)

- HEAD de código/pruebas validado: `18ffcc6a9f7c23b54b9d3ef9fc7bc506a8fe1164`; commit de cierre documental pendiente en esta actualización.
- `handleAddProblem` ya no usa `LockService.getScriptLock`, `acquireFeedbackScriptLock_` ni reacquisición. Las nuevas operaciones anexan una reserva completa `UPLOAD_PENDING` a `PysOperations`; el helper rechaza actualizaciones in-place.
- First-write-wins por `opId`: primera fila física conserva `problemId` y archivo canónicos; hash distinto se rechaza por el handler sin invalidar el ledger. Archivos perdedores se limpian solo tras comprobar referencias; las situaciones ambiguas conservan el archivo.
- El éxito se proyecta por fila PyS verificada; replay recupera una fila ausente con la misma imagen canónica. No se hace rollback destructivo tras una reserva confirmada. Reservas legacy `PENDING` sin imagen requieren recuperación manual.
- CI `44875140437` SUCCESS: 258 suites, 3094 pruebas, 0 fallos; health read-only `44875140445` SUCCESS; Pages `44875140584` SUCCESS.
- Beta pendiente: concurrencia real appendRow, carrera de archivos Drive, respuesta perdida, referencias preexistentes y recuperación en Spreadsheet/Drive aislados. No se desplegó Apps Script ni se modificó producción.
- **PyS creación: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.** Las mutaciones de solución, prevención y relaciones permanecen fuera del alcance y conservan sus locks.
- Siguiente tarea del backlog: migración append-only/lock-free de tutoriales (`handleAddTutorial` y edición asociada); después, aprobaciones de vídeo; finalmente, regresión integral y Beta.


## Inicio de tarea — migración append-only de tutoriales (2026-11-21)

- Auditoría creada: `AUDITORIA_TUTORIALES_APPEND_ONLY_2026-11-21.md`.
- Alta actual `handleAddTutorial`: ID determinista y replay preflight, pero ScriptLock protege unicidad de título, append y confirmación.
- Edición actual `handleUpdateTutorialItem`: no-op preflight sin lock; cambios reales mutan B:F in-place bajo ScriptLock, con validación de título y protección ante aprobaciones de vídeo pendientes.
- CATALOG lee directamente filas físicas A:H; el feed incremental toma snapshot mediante `findTutorialRow_`. Aprobaciones de vídeo actualizan columna G. Una migración requiere proyección compartida para lectura completa, feed, edición y vídeo.
- Riesgos principales: alta concurrente con mismo título, ediciones simultáneas con pérdida de campos, IDs repetidos que hoy se rechazan y convivencia con aprobaciones.
- Siguiente implementación: diseñar journal de eventos con operación/hash/expected hash y proyección común antes de retirar locks. No se modificó aún el código de tutoriales ni se desplegó Apps Script.


## Checkpoint — tutoriales fase 1 (2026-11-21)

- HEAD de código/pruebas validado: `ee194847f525cc55248826fda832a9f33bc81215`.
- Alta `handleAddTutorial` sin ScriptLock. Nueva hoja append-only `TutorialTitleEvents` con claims/renames por título, eventHash y payloadHash. First-write-wins por operationId y título normalizado; dos altas simultáneas con mismo título tienen un solo propietario.
- El alta anexa la fila A:H solo después de confirmar el claim. Replay por ID devuelve la fila original; si el append queda ambiguo, el mismo operationId puede recuperar. Inicialización concurrente de hojas tolerada.
- Renombrados en `handleUpdateTutorialItem` siguen bajo lock y reservan nuevo título/liberan anterior mediante evento antes de mutar B:F. Las demás ediciones siguen in-place y bajo lock.
- `findTutorialById_` y CATALOG usan la primera fila física por ID; duplicados posteriores se proyectan fuera del catálogo.
- CI `44876830826` SUCCESS: 258 suites, 3097 pruebas, 0 fallos; health read-only `44876830897` SUCCESS; Pages `44876830484` queued al momento del checkpoint.
- No se ha migrado la edición de campos ni la proyección de versiones. Siguiente cambio: journal/versiones con expected hash para `handleUpdateTutorialItem`, CATALOG y compatibilidad con aprobación de vídeo en columna G.
- Sin despliegue Apps Script ni cambios productivos.


## Checkpoint — tutoriales fase 2 (2026-11-21)

- HEAD de código/pruebas validado: `af2adefbd20ff450449cf8fc78f6e14d1aee733b`.
- `handleAddTutorial`: lock-free mediante `TutorialTitleEvents` append-only, first-write-wins por operación y título.
- Ediciones descriptivas de tutoriales con ID estable: lock-free mediante `TutorialEditEvents`, expectedHash D:F y snapshot append-only. Las ediciones concurrentes basadas en la misma versión no se pisan; el primer evento válido gana y los eventos obsoletos no se proyectan.
- `findTutorialRow_` y CATALOG proyectan D:F desde eventos; conservan base para título, imagen, vídeo y colaborador. Aprobaciones de vídeo mantienen su escritura de columna G.
- Renombrados y filas legacy sin ID siguen bajo ScriptLock/in-place. El renombrado usa evento de reserva de título antes de escribir.
- CI `44877806419` SUCCESS: 258 suites, 3101 pruebas, 0 fallos; health `44877806406` SUCCESS; Pages `44877806381` SUCCESS.
- Siguiente cambio: migrar renombrados de título a eventos versionados sin lock, incluyendo cancelación/reconciliación de reservas si el expectedHash queda obsoleto. Después auditar aprobaciones de vídeo.
- Sin despliegue Apps Script ni cambios productivos.

## Checkpoint — integridad del ledger de títulos de tutoriales (2026-11-21)

- HEAD de código/pruebas: ea04e631692b0adeb29918ffdecfe4f95b929848.
- readTutorialTitleEvents_ ahora verifica criptográficamente cada eventHash y rechaza el mismo operationId con eventos contradictorios. Los reintentos físicos idénticos continúan siendo válidos.
- Se añadieron dos regresiones a TutorialIntegrity: operationId duplicado con título distinto y eventHash alterado.
- CI 44901700375 SUCCESS: 258 suites, 3103 pruebas aprobadas, 0 fallos; health read-only 44901700446 SUCCESS. Pages 44901699997 estaba en ejecución al registrar.
- Hubo un primer fallo de prueba por invocar el lector sin pasarle la hoja; se corrigió el harness y la ejecución final aprobó. No quedó fallo de código pendiente.
- Pendiente siguiente: migrar renombrados de tutoriales a eventos append-only sin lock, con proyección de título visible y unicidad compatible con CATALOG/feed. Después auditar aprobaciones de vídeo.
- No se desplegó Apps Script ni se modificaron datos productivos.


## Checkpoint — renombrados de tutoriales append-only (2026-11-21)

- HEAD de partida: `f5bb4bdf6844d38fae3b0a30a8706b8e04692268`.
- `handleUpdateTutorialItem` registra renombrados de tutoriales con ID estable en `TutorialTitleEvents` y `TutorialRenameEvents`; no reescribe B ni adquiere ScriptLock para esta ruta.
- La proyección conserva título, D:F, Imagen, Video y Colaborador. `findTutorialRow_`, lookup por tema, feed y CATALOG utilizan la misma versión visible.
- Regresiones añadidas para renombrado lock-free, un único ganador desde el mismo título anterior y lectura CATALOG.
- Validación local/CI pendiente de ejecución; no se desplegó Apps Script ni se modificaron datos productivos.
- Pendientes: aprobación/rechazo de vídeos, edición descriptiva legacy y validación Beta aislada.


## Checkpoint — compatibilidad de renombrado histórico (2026-11-21)

- Se amplió el renombrado append-only a filas históricas sin ID cuando solo cambia el título. La identidad legacy es determinista a partir del título normalizado y solo vive en los eventos; no se escribe un ID en la fila.
- Las ediciones descriptivas legacy siguen bajo la ruta anterior; no se combinan con el renombrado lock-free hasta contar con un journal compatible.
- Regresión nueva: renombrado histórico, conservación de ID vacío y fila física, ausencia de ScriptLock.
- CI pendiente para este cambio. No se desplegó Apps Script ni se modificaron recursos productivos.


## Checkpoint — cierre local de renombrados append-only (2026-11-21)

- HEAD validado: `efb363e2dbe53e8752f4c24452f20f0a4f8c727b`.
- `handleUpdateTutorialItem` renombra IDs estables y filas históricas sin ID mediante journals append-only; los títulos no se reescriben físicamente en la hoja. Para filas legacy, la identidad derivada del título se utiliza solo en eventos y no se convierte en un ID persistente.
- El ledger de títulos exige propiedad del título anterior como condición CAS. Reintentos de operación conservan identidad y contenido; los consumidores de FEEDBACK y CATALOG leen la versión proyectada.
- Se preservan Imagen, Video y Colaborador; las solicitudes de vídeo pendientes siguen bloqueando el renombrado.
- `TutorialIntegrity`: 40/40 PASS. CI `44903445024` SUCCESS: 258 suites, 3,107 pruebas, 0 fallos; node --check PASS. Health read-only `44903444986` SUCCESS.
- Actividad local cerrada. Siguiente: auditar aprobaciones/rechazos de vídeo y su interacción con el título proyectado. Pendientes Beta: appendRow concurrente real, fallos parciales entre journals, respuesta perdida y recuperación en copias aisladas.
- Las ediciones descriptivas D:F de filas históricas sin ID siguen usando el flujo anterior; no se alteró su contrato.
- No se desplegó Apps Script ni se modificaron datos productivos.


## Checkpoint — aprobación/rechazo de vídeo append-only (2026-11-21)

- HEAD validado: 6b2e1cfbf99ffa7e5b4f9511847691de491ed3c1.
- VideoApprovalEvents es la fuente append-only de decisiones approved/rejected. Cada evento conserva itemId, decisión, snapshot completo, responder, payloadHash y eventId determinista.
- findPendingVideoApproval_ proyecta el evento terminal sobre Feedbacks. La materialización es idempotente; un retry repara la fila o completa publicación/retirada sin volver a decidir.
- Aprobación: evento → materialización verificada → publicación del destino. Rechazo: evento → retirada exacta de enlace/miniatura → materialización verificada. Las decisiones opuestas se rechazan.
- submit/approve/reject usan leases compartidas FEEDBACK (submitVideoForApproval, approveVideo, rejectVideo); se eliminó el ScriptLock local. Coordinator ahora reserva CORTES y TUTORIAL donde aplica.
- Pruebas: aprobación/rechazo/publicación 30/30; VideoApprovalClientContract 10/10; VideoApprovalState 13/13. CI 44904401718 SUCCESS: 258 suites, 3,108 pruebas, 0 fallos; Health read-only 44904401717 SUCCESS.
- Compatibilidad: al aprobar Tutorial, el destino se resuelve con título proyectado; solo se actualizan las columnas Video/Imagen necesarias, sin reescribir Tema o Colaborador.
- Siguiente tarea local: migrar ediciones descriptivas D:F de tutoriales históricos sin ID. Beta real de Coordinator/Sheets/YouTube y fallos parciales permanece pendiente.
- No se desplegó Apps Script ni se modificaron datos productivos.


## Checkpoint — cierre de edición histórica de Tutoriales (2026-11-21)

- HEAD validado: 304e5093f3fc974470e9e507487b707e6881459d.
- TutorialEditEvents acepta IDs tut-* y la identidad derivada legacy-{sha256(título normalizado)}. La identidad legacy solo se usa en journals; no se escribe ni se devuelve como ID persistente.
- handleUpdateTutorialItem permite altas/ediciones append-only de D:F para filas con ID y sin ID, además de renombrado combinado. expectedHash protege la versión D:F; el journal conserva los cambios sin modificar la fila física.
- findTutorialRow_ conserva la identidad derivada antes de proyectar el título; las filas históricas duplicadas/ambiguas se rechazan en vez de elegir una al azar.
- CATALOG proyecta primero D:F desde el título físico base y luego el título visible, preservando Imagen/Video/Colaborador.
- TutorialIntegrity 42/42 PASS. CI 44904942416 SUCCESS: 258 suites, 3,110 pruebas, 0 fallos; node --check PASS. Health 44904942436 SUCCESS; Pages 44904942027 SUCCESS.
- Migraciones locales del alcance activo completadas. Pendiente solo validación Beta (concurrencia real, fallos parciales, recuperación, navegadores/dispositivos) y Safe Apply, que sigue bloqueado.
- No se desplegó Apps Script ni se modificaron datos productivos.


## Checkpoint — coordinación de mutaciones PyS (2026-11-21)

- HEAD de código validado: d9bb6f62244b1bf2b9474ee83fa89661874b0063. Rama de trabajo 6,207 commits por delante de GPSpedia2.2.5; 0 por detrás.
- handleAddSolution, handleAddPrevention, handleAddVehicleToProblem y handleRemoveVehicleFromProblem ya no adquieren ScriptLock. Cada operación exige una lease compartida FEEDBACK con nombre explícito y falla cerrada si Coordinator no está disponible.
- Se conserva la mutación existente de primera escritura/read-back dentro de la lease: solución/prevención no sobrescriben valores ya establecidos; asociaciones validan problemId, vehicleId único y deduplicación; desvincular mantiene RBAC de Desarrollador.
- Coordinator ya autoriza recursos FEEDBACK para PyS y lectura CORTES para validar relaciones. No se sustituyó ScriptLock por UserLock.
- Se añadió PysVehicleRelationIntegrity al CI. Resultados: PysCreationIntegrity 56/56, PysImageStorageRecovery 22/22, PysVehicleRelationIntegrity 19/19, P2PysImageUploadOutsideLock PASS.
- CI 44906612421 SUCCESS: 259 suites, 3,129 pruebas, 0 fallos; Health read-only 44906612467 SUCCESS. Pages 44906611719 estaba queued al registrar.
- Siguiente: solo validaciones Beta aisladas de concurrencia real, fallos Coordinator/Spreadsheet y recuperación.
- No se desplegó Apps Script ni se modificaron datos productivos.


## Checkpoint — preparación de Beta pendiente (2026-11-21)

- HEAD de código: d9bb6f62244b1bf2b9474ee83fa89661874b0063. Rama base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1; comparación 6,207 ahead / 0 behind.
- CI en ese HEAD: 259 suites, 3,129 pruebas aprobadas, 0 fallos; Health read-only SUCCESS; GitHub Pages SUCCESS.
- El registro operativo solo conserva tareas Beta pendientes. AUG-159/AUG-160 requieren deployments de prueba WRITE/CATALOG/ADMIN, Spreadsheet/Drive desechables y cuentas de prueba separadas. No se ejecutan con endpoints ni datos productivos.
- Safe Apply permanece bloqueado hasta preview real autorizado, ACL, manifiesto y rollback verificados. No mover, renombrar, sobrescribir ni borrar recursos productivos.
- Todas las migraciones locales del alcance activo están cerradas. No se desplegó Apps Script ni se modificaron recursos productivos.


## Checkpoint — cierre local P0/P1 y arranque de verificación integral (2026-11-21)

- HEAD de código validado: 6b2721a97fc26c0f7367ffbf65c0f8ac0de2170d; rama base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1. No se modificó la base.
- Se corrigió handleAddProblem para validar todos los modelos de Cortes antes de inicializar/leer PysOperations. La prueba que cubre un vehículo inexistente confirma rechazo antes de reservar recursos.
- CI 44907336819 SUCCESS: 259 suites, 3,129 pruebas, 0 fallos; PysModalNavigation 10/10, PysCreationIntegrity 56/56, PysVehicleRelationIntegrity 19/19 y PysImageStorageRecovery 22/22. Health read-only 44907336832 SUCCESS; Pages 44907336274 SUCCESS.
- P0 GP-CONCURRENCY-CUT-MULTI-ENTRY-01 y P1 GP-UX-RECENT-VIEWED-CACHE-PARALLEL-01: COMPLETADAS CON VALIDACIÓN DIFERIDA A BETA. Solo quedan pruebas de campo/servicios reales en entornos aislados, pruebas visuales Beta y Safe Apply sujeto a preview/ACL/rollback autorizados.
- Se inicia la fase de verificación técnica integral conforme a §11 de las normas: revisar alcance de CI, sintaxis/referencias, integración entre servicios, concurrencia/idempotencia y diff de la rama de trabajo. No incorporar nuevas mejoras durante esta fase.
- No se desplegó Apps Script ni se modificaron recursos productivos.


## Checkpoint — cierre local de búsqueda agrupada por modelo (2026-11-21)

- Se recuperó la auditoría GP-UX-SEARCH-MODEL-GROUPING-01, que permanecía con implementación local terminada pero cierre pendiente de regresión integral.
- La suite SearchModelGrouping está integrada en RunServiceTests y aprobó 21/21 en CI 44907910014. La ejecución integral aprobó 259 suites, 3,129 pruebas y cero fallos.
- Se conserva pendiente únicamente la aceptación visual en navegadores/dispositivos reales y el catálogo real aislado de Beta.
- La tarea queda COMPLETADA CON VALIDACIÓN DIFERIDA A BETA; no requiere cambios adicionales de código para el cierre local.


## Checkpoint — actualización de protocolo Beta PyS (2026-11-21)

- Se revisaron los segmentos completos relevantes de la lista Beta y se detectaron expectativas históricas obsoletas en AUG-084/AUG-086/AUG-090/AUG-128: ScriptLock local para mutaciones PyS y estados LINKED/RECOVERY_REQUIRED en PysOperations.
- Se creó lista_beta_adenda_2026-11-21.md con secuencia de sincronización obligatoria al inicio y pruebas actualizadas para appendRow, reservas de ID, propiedad de imagen y leases compartidas Coordinator 1.4.5. La adenda se añadió al índice lista_beta.txt sin reescribir segmentos históricos.
- Se incorpora AUG-161 para la validación real de alta PyS y mutaciones de solución/prevención/relaciones en proyectos FEEDBACK y Spreadsheet/Drive aislados.
- Las pruebas Beta siguen pendientes por falta de deployment/recursos aislados autorizados. No se desplegó Apps Script ni se modificaron datos productivos.


## Checkpoint final — verificación integral local y Beta preparada (2026-11-21)

- HEAD de código y registros verificado antes de esta actualización documental: 689830c9ee2dd7e735aeccb0865e845d7c55df97. HEAD base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1. En ese punto, comparación GitHub: 6,213 commits ahead / 0 behind; base intacta.
- Verificación integral automatizada: CI 44908506743 SUCCESS, 259 suites, 3,129 pruebas aprobadas, 0 fallos. El paso de sintaxis comprobó los módulos frontend/backend configurados, incluidos los diez archivos de JS/Services. Health read-only 44908506686 SUCCESS; Pages 44908505824 SUCCESS.
- Suites focalizadas confirmadas: SearchModelGrouping 21/21; PysModalNavigation 10/10; PysCreationIntegrity 56/56; PysVehicleRelationIntegrity 19/19; PysImageStorageRecovery 22/22.
- Diff de código de esta continuidad revisado: únicamente el cambio de orden de validación en handleAddProblem; workflow ampliado para node --check de todos los módulos backend. Los commits documentales afectan solo a registros y lista Beta.
- GP-CONCURRENCY-CUT-MULTI-ENTRY-01, GP-UX-RECENT-VIEWED-CACHE-PARALLEL-01 y GP-UX-SEARCH-MODEL-GROUPING-01 quedan COMPLETADAS CON VALIDACIÓN DIFERIDA A BETA. Las secciones históricas EN CURSO quedan reconciliadas por esta adenda; no hay tareas locales de implementación abiertas en Tareas_Activas.md.
- Se creó AUG-161 y lista_beta_adenda_2026-11-21.md para actualizar las pruebas reales PyS al protocolo vigente: alta append-only, reservas de ID, propiedad first-write-wins, recuperación y leases compartidas Coordinator 1.4.5. La adenda comienza con comandos seguros de sincronización exigidos por las normas.
- Pendiente exclusivamente: ejecutar Beta aislada AUG-037/AUG-083/AUG-084/AUG-086/AUG-090/AUG-128/AUG-159/AUG-160/AUG-161, tutoriales/vídeos, recent-viewed/búsqueda visual, concurrencia real y Safe Apply después de preview/ACL/rollback autorizados. No hay autorización para desplegar ni tocar recursos productivos.
- No se desplegó Apps Script ni se modificaron Spreadsheet/Drive productivos.


## Adenda de verificación final — 2026-11-21

- HEAD verificado de la rama antes de esta adenda: 1fae7cceee8169e159981103a26ad8b62292c076; rama base sin cambios.
- CI 44908747376 SUCCESS: 259 suites, 3,129 pruebas, 0 fallos; las suites SearchModelGrouping 21/21, PysModalNavigation 10/10, PysCreationIntegrity 56/56, PysVehicleRelationIntegrity 19/19 y PysImageStorageRecovery 22/22 aprobaron.
- El workflow amplió node --check a los diez módulos JS/Services y el paso terminó SUCCESS. Health read-only 44908747421 SUCCESS; Pages 44908747537 SUCCESS.
- La verificación integral local queda completada. Los únicos pendientes son pruebas Beta que requieren deployments, Spreadsheet/Drive aislados, cuentas autorizadas y aceptación visual real; Safe Apply continúa sin autorización para ejecutar cambios reales.


## Checkpoint — contrato FEEDBACK/Coordinator PyS validado (2026-11-21)

- La revisión integral añadió una aserción cruzada en PysVehicleRelationIntegrity: el mock de lease ya no es la única cobertura; la suite comprueba la política real de Coordinator 1.4.5 y los recursos FEEDBACK/CORTES de las cuatro operaciones.
- PysVehicleRelationIntegrity 20/20 PASS; PysCreationIntegrity 56/56; SearchModelGrouping 21/21; PysModalNavigation 10/10. CI 44909033557 SUCCESS: 259 suites, 3,130 pruebas, 0 fallos; sintaxis backend PASS. Health read-only 44909033573 SUCCESS; Pages 44909033191 SUCCESS.
- La validación local de la integración PyS/Coordinator queda cerrada. La contención/expiración real de leases entre proyectos y el read-back de Spreadsheet siguen pendientes de AUG-161 en Beta aislada.

- Commit de cobertura cruzada: c6e458452e02ad26cf87419ba5f0c10a6ea03a72 (JS/Tests/PysVehicleRelationIntegrity.js); se verifican los contratos de recursos FEEDBACK/CORTES en Coordinator.js.


## Checkpoint — leases Coordinator de solución/prevención cubiertas (2026-11-21)

- Se amplió JS/Tests/SharedMutationCoordinator.js para probar contención entre addSolution y addPrevention: ambas escriben FEEDBACK, no reservan CORTES y la segunda espera/reintenta tras liberar la lease.
- Commit de prueba: 6523413028eed4ddc2d745e272f535b58514382c.
- SharedMutationCoordinator 86/86; PysVehicleRelationIntegrity 20/20; SearchModelGrouping 21/21; PysCreationIntegrity 56/56; PysModalNavigation 10/10. CI 44909269963 SUCCESS: 259 suites, 3,131 pruebas, 0 fallos; syntax PASS. Health read-only 44909269950 SUCCESS; Pages 44909269739 SUCCESS.
- No quedan gaps locales conocidos en la coordinación PyS; contención/expiración real entre proyectos y read-back de Spreadsheet continúan en Beta aislada.


## Checkpoint — corrección de leases PyS contra §15 (2026-11-21)

- HEAD previo a la corrección: 666ba0da5b9676f12f9501b49efef8cda3b8d27b. HEAD posterior validado: 3255f44f0f10cfbb7b5b3f6b8342c98d55008f0a.
- Hallazgo: la sección 15 de NORMAS_DESAROLLO.md prohíbe leases, esperas y coordinación por acción en operaciones ordinarias; la fase anterior había migrado addSolution, addPrevention, addVehicleToProblem y removeVehicleFromProblem a leases FEEDBACK compartidas.
- Corrección: se retiró withPysMutationLease_ y las cuatro políticas de lease de Coordinator. Las cuatro acciones leen/escriben directamente en FEEDBACK. Se preservan RBAC de Desarrollador para desvincular, validaciones funcionales, read-back y actividad post-escritura.
- CATALOG_CHANGE_ALLOWED_WRITERS_ conserva las cuatro acciones porque es una allowlist de publicación de deltas y no una reserva/lease de mutación.
- Pruebas: PysCreationIntegrity 56/56; PysVehicleRelationIntegrity 19/19; PysImageStorageRecovery 22/22; CatalogChangeFeed 35/35; SharedMutationCoordinator 86/86; FeedbackPysPendingImageVerificationOutsideLock 5/5; FeedbackPysPostCommitOutsideLock 4/4; FeedbackPysRollbackOutsideLock 6/6.
- CI de GitHub Actions para HEAD 3255f44f0f10cfbb7b5b3f6b8342c98d55008f0a: 259 suites, 3,130 pruebas aprobadas, 0 fallos; build SUCCESS; health read-only SUCCESS; Pages SUCCESS.
- La adenda Beta AUG-161 fue corregida para probar operaciones directas sin Coordinator/leases; las expectativas históricas de contención/expiración de lease ya no aplican a estas cuatro acciones.
- Comparación contra GPSpedia2.2.5: 6,235 commits ahead / 0 behind. La rama base permanece intacta.
- No se desplegó Apps Script ni se modificaron Spreadsheet/Drive productivos. Pendientes: Beta aislada de PyS/WRITE/ADMIN/tutoriales/vídeos/UX, validaciones reales de concurrencia y Safe Apply con preview/ACL/rollback autorizados.


## Checkpoint — cierre local de Inbox sin lock global (2026-11-21)

- HEAD de código validado: 15e7ab84d9a4530cb1097334a3e907f798c9d0ca. Comparación con GPSpedia2.2.5: 6,245 commits ahead / 0 behind; rama base intacta.
- Se retiró withInboxConversationLock_ de InboxConversations.js. Lecturas y mutaciones ahora ejecutan directamente sin ScriptLock, tryLock, waitLock ni liberación de locks.
- Se mantienen identidad de sesión verificada, RBAC, validación de participantes, límites, claves idempotentes y auditoría. InboxConversations 66/66 PASS.
- CI 15e7ab84d9a4530cb1097334a3e907f798c9d0ca SUCCESS: 259 suites, 3,130 pruebas, 0 fallos; build, health read-only y Pages SUCCESS.
- No se desplegó Apps Script ni se modificaron recursos productivos. Pendiente Beta: concurrencia real de Inbox en entorno aislado, además de las demás validaciones de campo ya registradas.


## Checkpoint — cierre local de vídeos e Inbox sin leases (2026-11-21)

- HEAD de código validado: 194ec14271c630c20d7997ffcba55903b98474da. La rama base GPSpedia2.2.5 permanece protegida.
- Se retiró withVideoApprovalMutationLock_: submitVideoForApproval, approveVideo y rejectVideo ejecutan directamente. Se eliminaron sus políticas de lease Coordinator, junto con las políticas obsoletas de addTutorial/updateTutorialItem y operaciones Inbox.
- Se mantienen VideoApprovalEvents append-only, validación de sesión/rol, RBAC de aprobación, idempotencia por opVideoId, materialización y publicación/retirada del destino.
- InboxConversations ya ejecuta lecturas y mutaciones sin ScriptLock global ni políticas Coordinator. Se conservan sesión, participantes, RBAC, idempotencia y auditoría.
- Pruebas focalizadas: VideoApprovalClientContract 10/10; aprobación/rechazo/publicación 30/30; YouTube idempotencia 16/16; VideoApprovalState 13/13; TutorialIntegrity 42/42; InboxConversations 66/66; SharedMutationCoordinator 86/86.
- CI 194ec14271c630c20d7997ffcba55903b98474da SUCCESS: 259 suites, 3,130 pruebas aprobadas, 0 fallos; build, health read-only y Pages SUCCESS.
- La adenda Beta ahora excluye leases para vídeos, tutoriales e Inbox y conserva pruebas de append/read-back, RBAC, idempotencia y fallos parciales.
- No se desplegó Apps Script ni se modificaron recursos productivos. Continúa la auditoría de locks ordinarios restantes contra §15.


## Checkpoint — edición legacy de Tutoriales sin ScriptLock (2026-11-21)

- HEAD de código validado: 8f310ade240a5b53cdcc0962a6f1f1da0adc482b.
- Se eliminó el ScriptLock de la ruta fallback de handleUpdateTutorialItem para IDs históricos/no canónicos. Las rutas de alta, edición descriptiva y renombrado siguen usando sus journals append-only cuando aplican; la ruta legacy restante ejecuta directamente sin lock.
- Se preservan validación de sesión/rol, campos editables, búsqueda dirigida, unicidad de título, read-back y campos no editados.
- FeedbackTutorialUpdateNoopPreflight 6/6; FeedbackTutorialUpdateTitleLookupBoundedRead 5/5; TutorialIntegrity 42/42. CI: 259 suites, 3,130 pruebas, 0 fallos; build, health read-only y Pages SUCCESS.
- La siguiente tarea local es eliminar el lock de versionado en publishFeedbackCatalogChange_ sin degradar la publicación incremental; después continúa la auditoría de locks de WRITE/ADMIN/USERS.
- No se desplegó Apps Script ni se modificaron recursos productivos.


## Checkpoint — FEEDBACK sin ScriptLock y versionado no bloqueante (2026-11-21)

- HEAD de código validado: 56a849eac4d7ad40f1cf6906402bcbb56fcf9f19.
- Se eliminó acquireFeedbackScriptLock_ y el bloqueo de publishFeedbackCatalogChange_. El snapshot se construye directamente y sourceVersion usa Date.now(); versiones repetidas/obsoletas activan reset en Coordinator para reconstrucción segura.
- FEEDBACK queda sin llamadas a LockService, tryLock, waitLock ni releaseLock en sus operaciones. Se mantienen validación de actor/rol, idempotencia, append-only journals, read-back, actividad y publicación CATALOG.
- Pruebas: FeedbackCatalogPublicationIsolation 5/5; CatalogChangeFeed 35/35; TutorialIntegrity 42/42; PysCreationIntegrity 56/56; PysImageStorageRecovery 22/22. CI 56a849eac4d7ad40f1cf6906402bcbb56fcf9f19 SUCCESS: 259 suites, 3,130 pruebas, 0 fallos; health read-only SUCCESS.
- Siguiente tarea local: WRITE ID allocator (reserva numérica secuencial) y ensureTestigoColumns; ambos aún usan ScriptLock. Preservar unicidad numérica sin espera global y después revisar ADMIN. AUTH/USERS locks se mantienen como protecciones de sesión/rol hasta completar su auditoría.
- No se desplegó Apps Script ni se modificaron recursos productivos.


## Checkpoint — corregir fixture residual de recuperación PyS (2026-11-21)

- Rama de trabajo: GPSpedia2.2.5_work. Último commit de código sometido a CI: efa35b4fc0ca3203cfeee4e7e426b6f05c766f4d.
- Se retiró el helper acquireFeedbackScriptLock_ de feedback.js para eliminar el mecanismo ScriptLock legacy de FEEDBACK. TutorialIntegrity y PysCreationIntegrity se actualizaron y pasan.
- CI: CatalogChangeFeed 35/35; FeedbackCatalogPublicationIsolation 5/5; TutorialIntegrity 42/42; PysCreationIntegrity 56/56. Health SUCCESS. Service tests FAIL únicamente en P2.2b PyS imagen: PysImageStorageRecovery 2/22; 20 casos informan que un fixture intenta extraer el helper retirado.
- Siguiente paso inmediato: localizar la extracción residual del helper en el harness de PysImageStorageRecovery / dependencias y actualizarla para ejecutar las funciones sin lock; repetir CI hasta verde. Después continuar el inventario de locks ordinarios WRITE/ADMIN/USERS.
- Sin despliegue Apps Script ni cambios en datos productivos. La rama base protegida GPSpedia2.2.5 no se modifica.


## Checkpoint — WRITE ID allocator append-only y columnas Testigo (2026-11-21)

- Rama: GPSpedia2.2.5_work. Código validado en HEAD d2167e2180925463202a4dbac0e302751ecb33ca.
- Comparación contra GPSpedia2.2.5: 6,319 commits ahead / 0 behind. La rama base no se modifica.
- ensureTestigoColumns ya no adquiere un lock interno; conserva el contrato AT:AV.
- La reserva central de IDs usa CortesIdReservations append-only. La fórmula de cada fila calcula el siguiente ID a partir del high-water mark y las reservas anteriores; se hace flush, congelación del valor y read-back por opId/operationHash. handleAllocateVehicleId no usa ScriptLock y valida sesión/rol Desarrollador antes de acceder al Spreadsheet.
- La ruta de alta nueva WRITE también reserva mediante el ledger antes de crear la fila. El contador histórico GPSpedia_CORTES_LAST_ID solo se lee como límite de compatibilidad; no se actualiza ni revierte.
- Las carreras con opId idéntico convergen a la primera reserva física; reservas adicionales quedan consumidas, únicas y no reutilizables. Huellas distintas para el mismo opId se rechazan sin bloquear operaciones posteriores. El ledger valida IDs crecientes y únicos y falla cerrado ante corrupción.
- La sección crítica fail-fast de la escritura física de vehículos nuevos permanece por ahora para VIN, fila, Idempotencia y compensación; Drive se ejecuta fuera del lock. No se ha declarado todo WRITE libre de locks.
- CI: 259 suites, 3,139 pruebas, 0 fallos; build SUCCESS; health read-only SUCCESS; Pages/deploy SUCCESS. Pruebas focalizadas: asignador 7/7, bounded read 11/11, idempotencia/concurrencia 12/12, ADMIN→WRITE 4/4, RBAC 15/15 y MutationLockContention 1/1.
- AUG-162 queda pendiente de ejecución en Spreadsheet/Apps Script aislados para validar la fórmula real y concurrencia entre deployments. No se desplegó Apps Script ni se tocaron recursos productivos.
- Siguiente tarea: auditoría de ADMIN y USERS; después revisar la transacción de alta nueva WRITE sin quitar el lock hasta demostrar una alternativa segura.


## Checkpoint — USERS: perfil sin lock y alta fail-fast (2026-11-21)

- Rama de trabajo GPSpedia2.2.5_work. Código validado en HEAD bb91b08bc16070d44e9155e5014c4110894ec546.
- recordUsersDirectTraffic_ ya no usa ScriptLock; es telemetría best-effort y puede subcontar ante carreras. No participa en rate limiting, autorización ni control de acceso.
- handleUpdateProfile realiza escritura de una sola celda con flush/read-back, sin ScriptLock local y sin rollback que pueda sobrescribir una edición concurrente. La lease compartida USERS/AUTH se conserva.
- handleCreateUser valida sesión/rol antes de la sección crítica y calcula PBKDF2 fuera del lock. El lock local se conserva solo para unicidad de username/ID y escritura, ahora fail-fast con tryLock(0).
- Copia aislada JS/Tests/users.js sincronizada con el servicio, salvo el ID de Spreadsheet aislado.
- CI: 259 suites, 3,141 pruebas, 0 fallos; build SUCCESS, health read-only SUCCESS, Pages/deploy SUCCESS. UsersDirectTrafficTelemetry 7/7, USERS mutaciones/RBAC 16/16, fixture/paridad 1/1.
- AUG-163 pendiente de Beta aislada. No se desplegó Apps Script ni se tocaron recursos productivos.
- Próximo trabajo: auditar locks restantes de ADMIN; clasificar por operación ordinaria, unicidad, mantenimiento y acción destructiva. No retirar locks de integridad sin sustituir la garantía.


## Checkpoint — ADMIN: publicación de catálogo sin ScriptLock (2026-11-21)

- HEAD de partida confirmado: e0d224b74708e0d6dada6556fe6d7f3b9e5741f9. Rama autorizada: GPSpedia2.2.5_work; la comparación con GPSpedia2.2.5 continúa en 6,341 commits ahead / 0 behind. La base protegida no se modificó.
- Se retiró ScriptLock y PropertiesService de publishAdminCatalogChange_ y publishAdminCatalogChanges_. Los snapshots se construyen sin exclusión global; sourceVersion usa Date.now() y los elementos de cada lote reciben versiones temporales consecutivas. Coordinator ya convierte versiones repetidas/obsoletas en reset y reconstrucción del snapshot.
- Se mantuvieron la publicación fuera de cualquier sección crítica, los lotes de máximo 50 y el reset de recuperación ante fallo de snapshot o publicación parcial. No se alteró la transacción física de WRITE ni las operaciones destructivas de ADMIN.
- AdminCatalogPublicationIsolation se actualizó a 6 escenarios: publicación individual sin lock/PropertiesService, batch de 60 en chunks 50/10, error de snapshot, reset explícito, batch inválido y fallo de chunk con reset de recuperación. Los 6 escenarios se ejecutaron con Node.js v22.16.0 sobre un harness aislado que contiene el bloque de funciones modificado: 6/6 PASS; node --check del bloque aislado PASS. El archivo de prueba comprometido aún requiere ejecución en el checkout completo/CI para confirmar integración con el servicio real.
- Commits publicados en la rama de trabajo: aa113db8d50f8e5f452d20041d93eb70ff1d289e (admin.js) y f68ff5cd93ffff3c76141d7476a1b090e0e7a6ea (prueba). Cada operación de GitHub generó un commit por archivo. HEAD verificado: f68ff5cd93ffff3c76141d7476a1b090e0e7a6ea.
- Estado: COMPLETADA CON VALIDACIÓN LOCAL AISLADA; CI/checkout integral pendiente. No se desplegó Apps Script ni se tocaron hojas/Drive productivos.
- Siguiente paso inmediato: continuar auditoría ADMIN, comenzando por las escrituras ordinarias suplementarias y el registro de actividad de imágenes; clasificar locks/leases de inventario y carpeta. Mantener locks de integridad en migraciones, reconciliaciones y acciones destructivas hasta demostrar sustitución segura.


## Checkpoint — ADMIN: información suplementaria sin lock global (2026-11-21)

- HEAD de partida de esta fase: f68ff5cd93ffff3c76141d7476a1b090e0e7a6ea. La comparación real de ese HEAD contra GPSpedia2.2.5 era 6,341 commits ahead / 0 behind. Corrección del checkpoint anterior: al HEAD e0d224b74708e0d6dada6556fe6d7f3b9e5741f9 le correspondían 6,339 ahead / 0 behind, no 6,341.
- handleAddSupplementaryInfo ya no adquiere ScriptLock ni realiza revalidación transaccional/lease tras la carga Drive. La carga continúa antes de la escritura; después se vuelve a localizar la fila por ID, se lee el rango actual, se superponen solo los campos solicitados y se persiste el rango de 10 celdas con flush/read-back.
- persistSupplementaryInfoValues_ ya no revierte un snapshot anterior cuando falla la confirmación, evitando sobrescribir una edición concurrente posterior con datos antiguos. La respuesta de error indica revisar el registro antes de reintentar. Se conserva el registro de vínculo de imágenes después de la escritura.
- AdminSupplementaryUploadOutsideLock: 5/5 escenarios aprobados en harness Node.js v22.16.0 aislado: ausencia de lock/lease, relocalización por ID y merge con valores actuales, escritura/read-back, ausencia de rollback y orden de confirmación del vínculo. La primera ejecución detectó un assertion incorrecto del propio test; se corrigió para comprobar la llamada real al helper y se repitió con 5/5 PASS.
- Commits de esta fase: ec717df709a1c65aedfdd31bdcd43a10e71a6a71 (servicio), 9e24c49c02d3e4efbc3133570bb6fd53c8d5ec73 (prueba), 5c647bf9d7734bce2418444be30c5720027f3b01 (corrección del test). HEAD verificado: 5c647bf9d7734bce2418444be30c5720027f3b01.
- Estado: COMPLETADA CON VALIDACIÓN LOCAL AISLADA; pendiente ejecutar prueba en checkout completo/CI y revisar concurrencia real en Apps Script Beta. No se desplegó ni se modificaron datos productivos.
- Siguiente paso: retirar lease del registro de actividad de imágenes si se confirma que es un registro ordinario append-only, y revisar el alcance de leases de inventario y creación de carpetas. Mantener intactos locks de unicidad, migración, reconciliación y acciones destructivas hasta concluir su análisis.


## Checkpoint — ADMIN: helper Testigo sin lock interno redundante (2026-11-21)

- ensureTestigoColumns ahora es un helper sin adquisición/liberación de ScriptLock. Se confirmó que su único llamador es handleAddOrUpdateCut y que ese llamador ya adquiere el lock fail-fast antes de invocarlo; por tanto, el lock interno opcional era redundante y podía esperar 30 segundos si se usaba por error sin el parámetro heredado.
- Se retiró el parámetro lockAlreadyHeld y se actualizó el único callsite. Se preservaron las comprobaciones de esquema, VIN y datos existentes, así como el contrato AT:AV. El alta física WRITE/ADMIN conserva su sección crítica y no se modificó.
- Se agregó AdminTestigoColumnsNoInternalLock: 1/1 PASS en harness Node.js aislado, verificando que el helper no contiene APIs de lock y que el único caller lo invoca después de adquirir el lock principal. Se inspeccionó además el código remoto actualizado para confirmar que no quedaron referencias residuales a lock/lockAcquired dentro del helper.
- Commits: 8b880d33b4298323d201074766517f9e58b7f96b (eliminación inicial), d00b6c569c1e3d88d3ccc6280fea44254b0df140 (prueba), 7b8e4b90baabbb52f9fdda42a89e2eebd19d45ad (retirada de referencias residuales detectadas al revisar el diff) y d118ac8e15751461939afcd405be07617d7af3ec (precisión del comentario). HEAD: d118ac8e15751461939afcd405be07617d7af3ec.
- Estado: COMPLETADA CON VALIDACIÓN LOCAL AISLADA; pendiente ejecución en checkout completo/CI. No se desplegó Apps Script ni se tocaron datos productivos.
- Siguiente paso de auditoría: revisar el registro de actividad de imágenes y las leases de inventario/carpeta. No retirar la coordinación del ledger Safe Apply, de migraciones, de reconciliación ni de acciones destructivas sin una sustitución de integridad.


## Checkpoint — ADMIN: alta de logotipos fail-fast (2026-11-21)

- handleAddLogo mantenía ScriptLock.waitLock(30000) después de completar la carga Drive. La sección crítica protege la secuencia única de LogosMarca, la fila y la verificación/compensación del vínculo; esa garantía se conserva.
- Se sustituyó la espera de hasta 30 segundos por tryLock(0). Si hay contención, el archivo aún no vinculado se intenta retirar; si la limpieza falla se marca RECOVERY_REQUIRED. La operación devuelve ADMIN_BUSY para reintento y el finally libera únicamente si el lock fue adquirido.
- Se agregó AdminLogoWriteLockNonBlocking: 4/4 PASS en harness Node.js v22.16.0 aislado, verificando orden de carga/lock, adquisición fail-fast, compensación al estar ocupado y liberación condicional. El test comprometido requiere ejecución en checkout completo/CI.
- Commits: 877b4c3df196da42bf6fd723752aea3c210de47d (servicio), 1b8edc62646a0aa82eee06f01978400d347de850 (prueba). La rama base no se modificó.
- Estado: COMPLETADA CON VALIDACIÓN LOCAL AISLADA; pendiente CI/checkout completo. Sin deployment Apps Script ni cambios productivos.
- Siguiente paso: completar matriz de locks/leases ADMIN y comenzar la revisión de la transacción física de alta nueva en WRITE, conservando el lock hasta demostrar una sustitución segura para fila física, Idempotencia, compensación y reintentos.


## Checkpoint — WRITE: reserva de ID moderna fuera del lock físico (2026-11-21)

- Inicio de revisión física WRITE en HEAD 1acb132b19f0a2877e55447246301a0900a7feb7; la rama de trabajo estaba 6,362 commits ahead / 0 behind respecto a GPSpedia2.2.5. La rama base no se modifica.
- Hallazgo: las altas nuevas con opId estable ya usaban el ledger append-only CortesIdReservations, pero reserveCortesVehicleIdForOperation_ y su lectura/verificación del ledger se ejecutaban dentro del ScriptLock físico de WRITE.
- Corrección: para solicitudes modernas con opId se reserva el ID antes de adquirir el lock. El ID se transporta en preparedRequest.preallocatedVehicleId hasta handleAddOrUpdateCutLockedUnsafe_. La ruta física consume el ID ya reservado y no vuelve a consultar el ledger bajo lock. Las solicitudes legacy sin opId estable conservan el fallback de reserva dentro del lock para no alterar su compatibilidad.
- Se conserva ScriptLock.tryLock(0) para asignación de fila física, Idempotencia y compensación. El lock sigue liberándose durante Drive y se readquiere fail-fast; si no se readquiere, el estado pending se conserva para retry con el mismo opId. No se debilitó la transacción física.
- Se agregó WriteVehicleIdReservationOutsidePhysicalLock: 5/5 PASS en harness Node.js v22.16.0 aislado. Incluye orden reserva→lock, transporte del ID, fallback legacy, conservación del lock físico y escenario dinámico WRITE_BUSY seguido de retry con el mismo opId/ID.
- Commits: 9b86c3ef893044af665ce96f21a50dd17e429760 (write.js), 8cb742bacef2d527c7acdf42bdd8990cec85ffcd (prueba inicial), 3e27d61a0e5efdc761c6f1568e8eb072099f41c3 (prueba dinámica de retry). HEAD de código/prueba: 3e27d61a0e5efdc761c6f1568e8eb072099f41c3.
- Estado: subactividad validada en harness local; pendiente ejecución en checkout completo/CI. No se desplegó Apps Script ni se modificaron hojas productivas.
- Revisión física aún abierta: confirmar límites de concurrencia de Idempotencia, append de fila física, compensación pre/post Drive y recuperación por opId. No retirar el lock hasta que esos contratos tengan alternativa probada.


## Checkpoint — WRITE: lectura focalizada de Idempotencia bajo lock (2026-11-21)

- En la transacción física, handleAddOrUpdateCutLocked recorría todas las filas de Idempotencia mediante readIdempotenciaEntries_ para obtener el estado de un solo opId. Esto hacía crecer el tiempo de la sección crítica con el historial completo.
- Se sustituyó por un snapshot focalizado: readIdempotenciaEntryByOpId_ busca únicamente el opId activo, valida encabezados, detecta duplicados de ese opId y conserva la fila exacta para recuperación/rollback. recordOpId mantiene su relectura focalizada y compara existencia, fila, vehículo, slot y huella antes de mutar. El snapshot conserva sheet, entries y byOpId para compatibilidad de helpers.
- No se debilita la unicidad del opId consultado. Los duplicados de otros opIds ya existentes no se recorren en cada alta; quedan fuera de esta ruta y deben detectarse por auditoría global de integridad, no por cada mutación ordinaria.
- Se agregó WriteIdempotencyTargetedRead: 4/4 PASS en harness Node.js v22.16.0 aislado, verificando lectura focalizada, detección de duplicados del opId, validación de esquema y revalidación antes de escritura. Una ejecución inicial encontró diferencias de formato en el harness sintético; el test se ajustó a whitespace flexible y se repitió 4/4 PASS.
- Commits: 7a211e681bef315f2c4ef118ffa13e8fb1715ca7 (write.js), 252098b2682d5a6a6517b6d062060bfbabcf9d37 (prueba inicial), 52e6ce664207af275153899ccb2935803274b92d y 235936b21de1736eb0f38d0bf0c89815825ce3f6 (ajustes del test). HEAD de esta fase: 235936b21de1736eb0f38d0bf0c89815825ce3f6.
- Estado: subactividad validada en harness local; pendiente checkout completo/CI. El ScriptLock de fila física/Idempotencia permanece porque lastRow+1, append de Idempotencia y compensación todavía requieren exclusión.
- Siguiente paso: revisar si el snapshot completo de Idempotencia puede salir de la sección crítica sin perder la revalidación del opId activo, y completar el análisis de la escritura/rollback física antes de considerar cualquier reducción adicional del lock.


## Checkpoint — WRITE: versionado de catálogo fuera del lock físico (2026-11-21)

- Se eliminó el contador PropertiesService WRITE_CATALOG_VERSION_PROPERTY_ y nextWriteCatalogVersionLocked_. El helper nextWriteCatalogSourceVersion_ valida vehicleId y usa Math.max(1, Date.now()), en línea con FEEDBACK y ADMIN. Coordinator conserva la protección: sourceVersion repetida u obsoleta (<= currentSourceVersion) se transforma en reset y reconstrucción.
- En handleAddOrUpdateCut, catalogVersion se asigna después del finally que libera ScriptLock, no dentro de la transacción física. El flujo legacy de handleAddSupplementaryInfo usa el nuevo helper temporal. La publicación de catálogo sigue fuera de locks locales.
- WriteCatalogPublicationIsolation se actualizó y ejecutó 7/7 PASS en harness Node.js v22.16.0 aislado: timestamp, validación de ID, ausencia de PropertiesService, asignación posterior a liberar lock y publicación de Coordinator sin lock local.
- Commits: 93290af58dd4b665c452be85320f43dde7a1ccf3 (write.js), 3112d22449ddd7792df110f4be1c75bd5c3a6bd8 (prueba), c05a26460f439d9c25850c2a32044f211d03e813 (acotar extracción del test). HEAD de esta fase: c05a26460f439d9c25850c2a32044f211d03e813.
- Estado: subactividad validada en harness local; pendiente checkout completo/CI. El lock físico sigue siendo necesario para fila e Idempotencia.
- Siguiente paso: completar revisión de rollback/recuperación física y documentar el límite de la sección crítica; después avanzar a la siguiente tarea local sin esperar a Beta.


## Checkpoint — ADMIN: actividad de imágenes append-only sin lease (2026-11-21)

- recordImageAdministrationActivity dejó de adquirir withSharedMutationLease_("ADMIN","recordAdminImageActivity"). La policy ACTIVITY independiente se retiró de Coordinator.
- Se reemplazó getNextAdminFormulaBasedId_ (lectura completa + PropertiesService counter) y la secuencia lastRow+setValue por getAdminFormulaBasedIdPattern_ + appendRow de una fila completa con fórmula ID configurada. Se conserva actor, timestamp, tipo, associatedId y detalles; el registro sigue siendo best-effort y se ejecuta después de liberar los locks físicos de eliminación/restauración.
- Se preservaron las leases de auditDriveImagesInCortes (IMAGE_AUDIT_STATE), saveUnusedImagesInventory (IMAGE_INVENTORY) y createCortesImageFolder (CORTES_IMAGE_FOLDER), porque coordinan cursor/inventario y unicidad de carpeta. No se retiraron locks de acciones destructivas, migraciones, reconciliación ni Safe Apply.
- Pruebas exact-source: AdminImageActivityAppendAtomic 5/5 PASS; AdminImageScanCoordinatorContract 1/1 PASS; contratos de actividad posterior a ScriptLock para permanent delete/restore PASS. Se comprobó que Coordinator ya no habilita recordAdminImageActivity.
- Commits: bffe801eea4c6603ccd0e8c5dc86a3a93ef3e50d (admin.js), d9bca497b1564ae1468c3f93ed7a99527ac6f7bd (Coordinator), c51dd0ad1b0c6c3568f838b51a2ddb90fe00d4a3 (scan contract), 5d3ffcc12a988fc1649d864dd01359cb0b26884c (prueba), ad242863f07acb6791a0b07d304f647f7aa0aae6 y d0ba7b0a4560a8281f0d672821d563063bf295fd (ajustes de tests). HEAD de esta fase: d0ba7b0a4560a8281f0d672821d563063bf295fd.
- Estado: validación exact-source aislada completada; pendiente CI integral/checkout completo. No se desplegó Apps Script ni se modificó Spreadsheet/Drive productivo.
- Siguiente paso: completar matriz de ADMIN y revisión física WRITE; después continuar con tareas locales restantes hasta que solo queden las pruebas Beta autorizadas.


## Checkpoint — cierre de revisión ADMIN/WRITE (2026-11-21)

- Auditoría ADMIN completada en alcance local: publicación de catálogo y escritura suplementaria ya no usan ScriptLock; ensureTestigoColumns no tiene lock interno; alta de logos usa tryLock(0) con compensación; actividad de imágenes usa appendRow y no adquiere lease ACTIVITY.
- Leases ADMIN que permanecen: auditDriveImagesInCortes (cursor IMAGE_AUDIT_STATE), saveUnusedImagesInventory (estado IMAGE_INVENTORY) y createCortesImageFolder (unicidad CORTES_IMAGE_FOLDER). Locks ADMIN que permanecen: alta física de cortes, alta de logos (secuencia/row), Safe Apply ledger/reconciliación, operaciones destructivas/recovery/Drive, migraciones y schema maintenance. Se conserva handleUploadAdminImageLegacy_ como código legacy sin consumidores internos comprobados; no se eliminó sin búsqueda completa de fixtures/otros archivos.
- Revisión física WRITE completada: vehículos existentes siguen por AportesVehiculo append-only sin lock. Altas nuevas conservan ScriptLock.tryLock(0) solo para fila física de Cortes, Idempotencia y compensación. IDs modernos se reservan antes del lock; Idempotencia lee solo el opId activo y revalida antes de mutar; sourceVersion se asigna después de liberar lock; Drive opera fuera del lock y la readquisición fail-fast preserva pending para retry. El rollback solo elimina la fila si sigue siendo la última y está vacía, y solo restaura snapshots mientras se conserva el lock.
- WritePhysicalTransactionContract: 7/7 PASS exact-source. Otros contratos exact-source aprobados en esta tanda: AdminCatalogPublicationIsolation 6/6; AdminSupplementaryUploadOutsideLock 5/5; AdminTestigoColumnsNoInternalLock 1/1; AdminLogoWriteLockNonBlocking 4/4; AdminImageActivityAppendAtomic 5/5; AdminImageScanCoordinatorContract 1/1; WriteVehicleIdReservationOutsidePhysicalLock 5/5; WriteIdempotencyTargetedRead 4/4; WriteCatalogPublicationIsolation 7/7. También pasaron comprobaciones de orden post-lock para permanent delete/restore.
- No se pudo confirmar CI integrado: get_commit_combined_status y fetch_commit_workflow_runs no devolvieron checks/workflow runs para el HEAD consultado. No se afirma CI verde. No se desplegó Apps Script ni se modificó Spreadsheet/Drive productivo.
- Beta restante en Tareas_Activas: AUG-159 (aportes/resolución ADMIN concurrente) y AUG-160 (cargas ADMIN/ImageUploadEvents y recuperación). Requieren deployments y Spreadsheet/Drive desechables. El conector Google Drive aparece DISABLED_BY_ADMIN y no hay conexión Apps Script; no ejecutar contra producción ni simular que la Beta fue aprobada.
- Estado del trabajo local: revisión ADMIN/WRITE cerrada con validación exact-source; pendiente CI integrado. Siguiente paso permitido: completar otras tareas locales que aparezcan en el registro activo; no iniciar AUG-159/AUG-160 hasta disponer de entorno Beta aislado y autorización/dependencias necesarias.


## Verificación de HEAD — 2026-11-21
- HEAD confirmado de GPSpedia2.2.5_work: 61587ca4017e51ddb803a6a5a4f619fd1b9585dd.
- Comparación con GPSpedia2.2.5: 6,399 commits ahead / 0 behind; merge-base d9acc68d889985c2e2f42fe3a02e502efc86ead1. La rama base protegida no recibió cambios.
- Estado GitHub del HEAD: combined status vacío y workflow runs vacíos; por tanto CI integrado queda pendiente y no se afirma aprobación.
- Últimos commits de registro: a02011d9f6228e4ae23b2dea14b06fae95b2edb3 (checkpoint), 922f1b659c6c2f35928b17a48eda1f08f21b3dcc (Auditoría.txt), 61587ca4017e51ddb803a6a5a4f619fd1b9585dd (ChangesLogs.txt).


## Adenda de cierre local — ADMIN/WRITE (2026-11-21)
- Conforme a NORMAS_DESAROLLO.md §§5 y 10, la auditoría ADMIN y revisión física WRITE se cierran como COMPLETADA CON VALIDACIÓN DIFERIDA A BETA: los contratos locales exact-source pertinentes se ejecutaron y aprobaron. La falta de checks/workflow runs de GitHub no se presenta como CI aprobado ni mantiene abierta la tarea local; se deja explícita como evidencia no disponible.
- En Tareas_Activas.md ya no quedan subtareas locales abiertas de esta continuidad. Permanecen AUG-159 y AUG-160 como validaciones Beta aisladas; no se han ejecutado ni marcado como aprobadas.
- Google Drive connector: DISABLED_BY_ADMIN / NOT_AVAILABLE; no hay conexión Apps Script en las herramientas actuales. No se accedió ni modificó Spreadsheet/Drive productivo.
- HEAD antes de este checkpoint: e81e59267e323c01b0f1b8b8dac090370a37f906.


## Adenda — inventario completo de validaciones Beta pendientes (2026-11-21)
- Corrección de alcance: no quedan únicamente AUG-159/AUG-160. Tareas_Activas.md conserva 16 marcadores abiertos, todos correspondientes a validaciones Beta (incluye concurrencia real de appendRow/journals, navegador/PWA, coordinación interproyecto, Drive/Spreadsheet aislados y AUG-159, AUG-160, AUG-161, AUG-162 y AUG-163).
- Se revisaron los encabezados y preparación de lista_beta_parte1.txt, lista_beta_parte2_parte_001.txt, lista_beta_parte2_parte_002.txt y lista_beta_adenda_2026-11-21.md. Las listas/adenda comienzan con comandos copiables de verificación de repo/rama/árbol limpio y sincronización fetch + pull --ff-only; se preservan sin cambios.
- No se ejecutó Beta: el conector Google Drive está DISABLED_BY_ADMIN/NOT_AVAILABLE y no existe conexión Apps Script. Las pruebas requieren deployments y recursos desechables reales; no se simulan ni se ejecutan sobre producción.
- Estado final del alcance local: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Solo quedan las validaciones Beta documentadas en los registros activos.


## Verificación final de rama — 2026-11-21
- HEAD confirmado antes de este registro: 77969c86ca4c817753a1fe581184f498f1ea399b.
- GPSpedia2.2.5_work está 6,404 commits ahead y 0 behind de GPSpedia2.2.5; merge-base d9acc68d889985c2e2f42fe3a02e502efc86ead1. La base protegida permanece intacta.
- Combined status y workflow runs no devolvieron checks para este HEAD. No se declara CI aprobado.


## Checkpoint — regresión integral y sincronización de contratos (2026-11-21)

- HEAD de código validado: 4969e4cfa08479927d4284e98312f114e98c3d28, rama GPSpedia2.2.5_work. CI GitHub Actions `GPSpedia service regression tests`: SUCCESS, 259 suites, 3,137 pruebas aprobadas, 0 fallos. Sintaxis de módulos modificados: SUCCESS. `GPSpedia deployed service health (read-only)`: SUCCESS.
- Se corrigieron 12 harnesses/contratos de prueba que conservaban expectativas anteriores a la reducción de locks: WRITE reserva append-only antes del lock, lectura dirigida de Idempotencia y versionado posterior al lock; ADMIN actividad de imágenes appendRow sin lease, Testigo sin lock interno, alta de logos tryLock(0), y persistencia suplementaria sin rollback de snapshot obsoleto. No se debilitó ni eliminó ningún control del código de producción.
- La ejecución de CI pasó de detectar cuatro suites con expectativas antiguas a 259 suites / 3,137 pruebas aprobadas. Los errores sucesivos fueron de fixtures/harnesses (ventana de búsqueda del lock, stub de Utilities/reserva, snapshot dirigido, lease retirada, lock no bloqueante y helpers retirados); se corrigieron contra el contrato vigente y se volvió a ejecutar la suite completa.
- GitHub Pages: el push de la rama activó automáticamente el workflow externo `pages build and deployment`; el despliegue terminó SUCCESS para el commit 4969e4cfa08479927d4284e98312f114e98c3d28 y publicó `https://infogpstech.github.io/GPSpedia/`. No se ejecutó un deployment de Apps Script ni se modificaron Spreadsheet/Drive productivos. Registrar este comportamiento: los pushes a la rama activan Pages automáticamente.
- PR #128 permanece OPEN y DRAFT, sin merge. GPSpedia2.2.5_work está 6,425 commits ahead / 0 behind de GPSpedia2.2.5; merge-base d9acc68d889985c2e2f42fe3a02e502efc86ead1. La rama base protegida permanece intacta.
- Tareas locales de esta continuidad: cerradas. Tareas_Activas.md mantiene 16 marcadores abiertos correspondientes a validaciones Beta reales, no a trabajo local pendiente. Siguen pendientes AUG-159, AUG-160, AUG-161, AUG-162, AUG-163 y pruebas Beta de concurrencia, navegador/PWA, journals, Drive/Spreadsheet y coordinación entre proyectos.
- No ejecutar esas validaciones contra producción ni simular su aprobación. Se requiere Apps Script desplegado en entorno Beta, Spreadsheet/Drive desechables y cuentas de prueba. El conector Google Drive continúa registrado como DISABLED_BY_ADMIN / NOT_AVAILABLE; no se dispone de conexión Apps Script.
- Siguiente paso: preparar y ejecutar la primera validación Beta (AUG-159/AUG-160 según disponibilidad del entorno aislado); antes de eso, solo queda trabajo documental/local adicional si aparece una tarea activa nueva.


## Checkpoint — auditoría visual y guía de despliegue (2026-11-21)

- Rama autorizada: `GPSpedia2.2.5_work`; base protegida: `GPSpedia2.2.5`.
- HEAD de partida confirmado por Git ref: `48511de8ccfb6af56ccf4be97d73a1fc75c3b0ab`. La rama base consultada permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Comparación histórica: `GPSpedia-2.1.7` usa cabecera flex, logo CSS genérico 48 px escritorio / 38 px móvil, botones en fila y cierre absoluto. La rama actual 2.2.5 usa toolbar grid con logo, modelo y acciones separados; el cierre se inserta dentro de `.detail-modal-header-actions`.
- Se ajustó el logo scoped del modal de corte de 120 px/60 px a 64 px/48 px; se conservan los botones y cierre de 40 px, título en columna derecha y alternativa de título debajo del logo. Se mantuvo la base compartida para otros modales y se documentó la cascada en `AUDITORIA_MODAL_CSS_2026-11-21.md`.
- Commits de esta tanda: `44470dea13b9ed18588be78182d59f78ade18fa4` (CSS), `2d112b38ff41e92b6b667ac7a06b38aaea70a015` y `68cfd6e877a4ac808d722f4ef82e5f5dad574873` (contrato de prueba), `5109d313b6c9791e15397aa4b14af34ab949f00e` (guía de despliegue), `cf6762ece052035a6bf90c6ce16afc505b16ecbd` (auditoría visual).
- `Services/DEPLOYMENT_GUIDE.md` documenta los proyectos COORDINATOR, CATALOG, AUTH, USERS, WRITE, FEEDBACK, UTILITIES y ADMIN; identifica `SharedMutationClient.js` y `InboxConversations.js`, propiedades URL/secretos y secuencia de despliegue. Se añadió referencia desde README y corrección a COORDINATOR_SETUP para la URL ADMIN.
- Validación pendiente: ejecutar `CutDetailModalLayout.mjs`, revisar los cambios de CSS/test, CI y comprobación visual Beta. No se afirma que la prueba haya pasado todavía.
- Pendiente local: completar la auditoría y consolidación de estilos repetidos de modales (incluidos Inbox, Developer Tools e informativos); revisar guía contra código completo y corregir cualquier discrepancia.
- Validaciones Beta preexistentes siguen abiertas (15 checks no marcados en Tareas_Activas.md): concurrencia real, Drive/Spreadsheet aislados, journals, recuperación y navegador/PWA. No se ejecutaron deployments ni se modificaron ScriptProperties, Spreadsheet o Drive remotos.


## Checkpoint — cierre de auditoría CSS de encabezados y familias de modales (2026-11-21)

- HEAD de validación: `9c4b1556c28d83ef7c2320b99aa55557d2c0e901`, rama `GPSpedia2.2.5_work`. Base protegida consultada: `GPSpedia2.2.5` sin modificaciones.
- Consolidación CSS completada: encabezados de detalle en un único bloque final, con orden original de cascada y media queries; base de `.info-modal-content` en una sola regla; encabezado Inbox agrupado; declaraciones base de `.dev-tools-title` fusionadas en una regla, conservando media queries y `prefers-reduced-motion`. La base global `.info-close-btn` permanece única y el corte/Relay conserva overrides scoped.
- Se actualizaron/añadieron contratos: `CutDetailModalLayout.mjs` 29/29 PASS; `InfoModalStyleCascade.mjs` 3/3 PASS; `ModalHeaderCascade.mjs` 2/2 PASS.
- GitHub Actions `GPSpedia service regression tests`: SUCCESS, 261 suites, 3,143 pruebas aprobadas, 0 fallos. `GPSpedia deployed service health (read-only)`: SUCCESS. No se ejecutó deployment Apps Script.
- Primera refactorización experimental de reglas de Developer Tools movidas al final alteró expectativas de media queries (reduced-motion y responsive); se revisó el fallo, se restauró el orden de esas media queries y se fusionó solo la base común del título en su ubicación original. La regresión final pasó sin debilitar pruebas.
- Documentación: `AUDITORIA_MODAL_CSS_2026-11-21.md`, `Services/DEPLOYMENT_GUIDE.md`, README y COORDINATOR_SETUP actualizados. La guía fue contrastada con los archivos fuente de los ocho proyectos Apps Script y las propiedades URL/secretos.
- Pendiente local: ninguno dentro del alcance de esta tanda. Pendiente visual: aceptación Beta en escritorio/Android/PWA y viewports reales; se mantiene sin ejecutar hasta disponer de deployments y recursos aislados.
- Las 15 validaciones Beta originales permanecen pendientes; no se ejecutaron contra producción ni se marcaron como aprobadas.


## Verificación final de continuidad — 2026-11-21

- HEAD verificado antes de este registro: `230cda216bb83be158dbe70b343036de951eb044`; rama `GPSpedia2.2.5_work`.
- Comparación con base `GPSpedia2.2.5`: 6,460 commits ahead / 0 behind; merge-base `d9acc68d889985c2e2f42fe3a02e502efc86ead1`. La referencia de la rama base no se modificó.
- Tareas_Activas.md: 15 casillas abiertas; todas son validaciones Beta con recursos reales aislados (AUG-159/160/161, concurrencia, journals, Drive/Spreadsheet, PWA/navegadores). No quedan tareas locales de la auditoría visual ni de la guía de despliegue.
- CI en el HEAD `230cda216bb83be158dbe70b343036de951eb044`: SUCCESS; 261 suites, 3,143 pruebas aprobadas, 0 fallos. CutDetailModalLayout 29/29; InfoModalStyleCascade 3/3; ModalHeaderCascade 2/2. Health read-only SUCCESS.
- Pages workflow para ese HEAD se encontraba PENDING al registrar este checkpoint; no se afirma despliegue completado mientras no cambie a SUCCESS.
- La aceptación visual de los modales en navegador de escritorio, Android/PWA y viewports reales permanece en Beta. No se desplegaron proyectos Apps Script ni se modificaron propiedades, Spreadsheet o Drive remotos.


## Checkpoint — inicio de auditoría integral de latencia, llamadas y aportes (2026-11-21)

- Rama de trabajo confirmada: `GPSpedia2.2.5_work`. HEAD inicial de esta auditoría: `dba61b0f6cba0a152d58d314b52eac5120576d86`. La rama base protegida `GPSpedia2.2.5` no se modificó.
- Por solicitud del usuario, toda condición que deba resolverse antes de retirar locks/leases o llamadas se registra como tarea pendiente, con prioridad, dependencias y pruebas requeridas.
- Se creó `AUDITORIA_INTEGRAL_LATENCIA_LLAMADAS_APORTES_2026-11-21.md` y se amplió `Tareas_Activas.md` con un nuevo bloque P0/P1/P2. Ambos cambios quedaron en commits separados de documentación.
- Hallazgos preliminares, aún no conclusiones: AUTH incluye `touchSession` y otras acciones en `withSharedMutationLease_`; USERS conserva lease para `createUser`; varios servicios publican cambios de catálogo por Coordinator; ADMIN realiza llamadas a WRITE/CATALOG; FEEDBACK/WRITE/ADMIN incluyen rutas de transferencia de imágenes/vídeos. Se exige mapa de consumidores y dependencias antes de modificar.
- Prioridad inmediata: (1) mapa de llamadas navegador→servicios y línea base de latencia/bytes/lecturas/escrituras; (2) AUTH/USERS y excepciones de sesión conforme a §15; (3) flujos de aportes y dependencias WRITE/FEEDBACK/ADMIN/CATALOG; (4) cargas de imágenes/vídeos; (5) navegación, cachés y regresión.
- No se retiró ningún lock, lease, endpoint ni llamada de producción en esta fase. No se desplegó Apps Script ni se modificaron secretos, ScriptProperties, Spreadsheet o Drive productivos. La auditoría actual es estática; aún no certifica una mejora de rendimiento medida.
- Siguiente paso: continuar el inventario de consumidores frontend y backend, revisar las rutas de carga/catálogo y completar el mapa antes de proponer cambios. Toda dependencia que impida simplificar permanece como tarea pendiente explícita.


## Continuidad — auditoría estática de rutas y aportes (2026-11-21)

- HEAD de partida verificado: `5845088b044d07e6f83cac60e81f9f65727f26d6`; rama `GPSpedia2.2.5_work`. Base protegida verificada: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no se modificó.
- Primera pasada inspeccionó `api-config.js`, `auth.js`, `main.js`, `ui.js`, `navigation.js`, `catalogRequest.js`, `catalogStatus.js`, `pys-data.js`, `youtubeUpload.js`, `imageObjectUrlCache.js`, `thumbnailCompressionQueue.js`, y servicios AUTH/USERS/WRITE/FEEDBACK/ADMIN/CATALOG/Coordinator/SharedMutationClient.
- Hallazgos: `touchSession` no aparece invocado en los módulos frontend principales revisados y mantiene handler costoso con ScriptLock/lecturas completas; Coordinator ya actualiza actividad compartida cada cinco minutos. `acceptTerms` sí tiene consumidor y deduplicación local. Reportes/sugerencias y otros aportes de imagen transfieren Base64 sin compresión previa observada; YouTube usa carga directa reanudable de 8 MB con IndexedDB.
- ADMIN llama a CATALOG con `getCatalogData(forceRefresh:true)` para consultas de proyección completa y candidatos; `getReplacedImages` activa una consulta de candidatos a CATALOG. El refresh de catálogo al cerrar edición y los reintentos de mutaciones ADMIN quedan como candidatos a medir/verificar, no como errores confirmados.
- Se ampliaron tareas P0/P1 para confirmar consumidores, probar idempotencia de reintentos, optimizar imágenes y estudiar consultas CATALOG dirigidas. Ninguna llamada/lease/lock fue retirada.
- No se ejecutaron benchmarks, pruebas Beta ni despliegues Apps Script; no se tocaron secretos, ScriptProperties, Spreadsheet o Drive productivos.
- Siguiente paso: completar mapa exhaustivo de llamadas y consumidores; medir o construir harness local reproducible para tamaños/latencias de aportes; luego priorizar cambios seguros con pruebas. No certificar mejora hasta comparar antes/después.


## Continuidad — auditoría de miniaturas y refrescos post-aporte (2026-11-21)

- HEAD previo a esta ampliación: `8fadc025a34744bb09278f583005ae52de2f909d`; base protegida sin cambios: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Se identificó prefetch en segundo plano de miniaturas para los últimos 15 vehículos en cada persistencia de snapshot/cursor y al guardar un vehículo visto. La cola limita compresiones simultáneas a dos, pero puede encolar imágenes fuera del viewport.
- Se detectó posible doble solicitud fría de imagen: `setOptimizedImage` asigna `img.src` y luego `compressAndStoreThumbnail` realiza un `fetch` de la misma URL cuando IndexedDB no tiene miniatura. La caché HTTP puede amortiguar la duplicación; requiere medición real.
- Se confirmó snapshot completo CATALOG después de aportes de corte/información suplementaria para actualizar un solo vehículo. Se registró tarea para evaluar endpoint dirigido/delta seguro.
- Se añadieron tareas P1 y registro factual. No se modificó código, no se ejecutaron pruebas ni benchmarks y no se desplegó Apps Script.
- Próximo paso: completar el mapa de requests del catálogo y de uploads, instrumentar una medición reproducible con caché fría/caliente y revisar idempotencia de reintentos antes de optimizar.


## Continuidad — verificación de reintentos Safe Apply (2026-11-21)

- HEAD previo: `c66e1bbd53b81c6d4f0131c0c65d947ddbe01811`; base `GPSpedia2.2.5` intacta en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Se verificó estáticamente que `applyCortesImageOrganizer` y `rollbackCortesImageOrganizer` usan IDs estables, ledger y estados terminales verificables para replay; `CortesImageOrganizerExecutor.mjs` cubre `already_applied` y `already_rolled_back` y fallos parciales.
- La prueba no se ejecutó en esta sesión; la tarea de diseño/idempotencia se marca completada por inspección de código y contrato, sin afirmar resultado de ejecución. Confirmar CI cuando se realice un cambio de código.
- `backupDatabase` y `applyCortesImageReconciliation` permanecen limitadas a un intento automático.


## Continuidad — auditoría de feed incremental y CATALOG (2026-11-21)

- HEAD previo: `6f6b1b457058921ce21ff08c48cbaf112537bcca`; rama base protegida intacta en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Se confirmó el doble salto navegador → FEEDBACK → Coordinator para `getCatalogChanges`. Coordinator ya tiene GET público para el feed; queda pendiente evaluar la conexión directa y preservar CORS, redirecciones, telemetría y contrato público.
- Se confirmó que el snapshot completo de CATALOG no se guarda en CacheService por exceder 100 KB. Las lecturas sin caché vuelven a consultar varias hojas y eventos; por ello los snapshots completos post-aporte son candidatos de alto coste.
- Se registraron tareas P1 de feed directo, caché granular y consulta dirigida. No se modificaron endpoints ni servicios.
- Próximo paso: completar inventario de llamadas y dependencias, priorizar reducción del salto FEEDBACK y de snapshots post-aporte, y preparar medición comparativa. No se afirma mejora hasta medirla.


## Continuidad — refresco redundante después de vídeo pendiente (2026-11-21)

- HEAD previo: `24570bb4a449fd645b1610183a06bc97dd94b567`; rama base intacta `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Se confirmó que `submitVideoForApproval` crea una fila pending en FEEDBACK y no publica CATALOG; el Coordinator no incluye esta acción en los escritores autorizados del feed.
- Los formularios de corte y tutorial ejecutan, pese a ello, un snapshot completo `getCatalogData` desde `onSuccess`. La retirada de esos dos refrescos queda como tarea P1 con prueba de contrato; conservar opVideoId, estado pending y prevención de duplicados.
- No se modificó código ni se ejecutaron pruebas en este paso.


## Continuidad — retirada verificada de snapshots tras vídeo pending (2026-11-21)

- HEAD previo a la documentación: `88ab1a920a95a68c5561ffd017ebe40e01ec00c9`; base protegida intacta: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Cambio: `JS/Frontend/ui.js` ya no solicita `getCatalogData` desde `onSuccess` al enviar vídeos pendientes de aprobación en los formularios de corte y tutorial. No se modifica el flujo YouTube ni el registro FEEDBACK.
- Se conserva explícitamente el refresco del flujo PyS (`invalidatePysDataCache` y `loadPysData`).
- Pruebas ejecutadas: `YouTubePendingRefreshContract` 3/3 PASS en V8 aislado; `YouTubeApproval.js` 16/16 PASS con mocks aislados. No se ejecutaron Node runner completo ni GitHub Actions en esta sesión; no se desplegó Apps Script.
- Archivos de prueba: nuevo `JS/Tests/YouTubePendingRefreshContract.js`; integrado en `JS/Tests/RunServiceTests.mjs`.
- Siguiente trabajo: revisar otros refresh post-aporte, compresión de imágenes y cache/prefetch de miniaturas; luego mapa completo de llamadas/latencias. No afirmar mejora global sin benchmark.



## Continuidad — prevalidación de tamaño de imágenes de corte (2026-11-21)

- HEAD previo a los registros: `a38b9a97cc6cdc62eafe90d80990d3004491bd84`; base protegida intacta `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- `HTML/add_cortes.html` valida ahora el límite backend de 10 MiB antes de generar preview y Base64; evita transferir archivos que WRITE rechazará. Conserva archivo de exactamente 10 MiB y rechazo de archivo vacío.
- `AddCutImageSizePreflight.mjs` integrado en `RunServiceTests.mjs`; validación aislada 3/3 PASS.
- No hay compresión/redimensionado todavía; MIME explícito y coherencia en formularios de FEEDBACK/PyS siguen pendientes. No se ejecutó runner Node completo ni CI; no hubo despliegue Apps Script.
- Siguiente: extender mapa de validación de imagen a FEEDBACK/PyS e información suplementaria, después diseñar compresión preservando MIME, transparencia/orientación, hashes e idempotencia; no cambiar el contrato backend sin pruebas.



## Continuidad — preflight de imágenes suplementarias (2026-11-21)

- HEAD previo a documentación: `687b7ac9a8d6a2e9d2e842e3b74e619e6ffba2f3`; base protegida sin cambios `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- `ui.js`: `readSupplementaryImageDataUrl_` valida archivo vacío y límite WRITE de 10 MiB antes de FileReader; gestiona onload/error/abort/resultado inválido. Los formularios de apertura/alimentación capturan fallos de lectura dentro del try/catch y restauran el botón.
- `AddSupplementaryImagePreflight.mjs` integrado en runner; 4/4 PASS en V8 aislado.
- No se cambió MIME permitido, hash, idempotencia, endpoint, ni contrato backend. No se implementó compresión; no se ejecutó Node runner completo ni CI.
- Siguiente: seguir trazando uploads FEEDBACK/PyS y flujo completo a Drive; definir compresión solo después de validar formato, orientación, transparencia, dimensiones y hashes.



## Continuidad — retirada ampliada de refreshes tras vídeo pending (2026-11-21)

- HEAD previo a los registros: `b90c2d5a45cbf2846feed0f8de1e9e2c0a01b43f`; base protegida intacta `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Se retiraron cinco refreshes post-pending: snapshot CATALOG tras vídeo de corte; snapshot CATALOG tras vídeo de tutorial existente; callback de refresh tras subida del tutorial recién creado (el catálogo ya se había refrescado tras el alta); callback de recarga PyS tras alta (la lista ya se había cargado inmediatamente); callback de recarga PyS en edición de problema existente (el envío pending no modifica la hoja PyS).
- Se conservan los refreshes inmediatos que muestran nuevas altas de tutorial/problema y la sincronización de catálogo después de una aprobación efectiva.
- `YouTubePendingRefreshContract.js` 5/5 PASS; `YouTubeApproval.js` 16/16 PASS. No se cambió backend, opVideoId, deduplicación ni permisos.
- La suite Node completa y CI de estos commits aún requieren confirmar checks del nuevo HEAD. El despliegue de Apps Script no se realizó.
- Próximo: continuar el mapa de cargas de imagen y consultas completas CATALOG; medir ahorro de red/tiempo en caché fría/caliente antes de atribuir mejora cuantitativa.



## Continuidad — ubicación de cargas Drive frente a locks (2026-11-21)

- HEAD previo a documentación: `d635cd031f84fea8523c47ddea78ef6c956a3d44`; base protegida sin cambios `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- WRITE corte: Drive se ejecuta dentro de `runWriteDriveWorkOutsideScriptLock_`, que libera el lock y lo reacquire con `tryLock(0)`; fallo de reacquisición conserva operación recuperable con el mismo opId.
- WRITE suplementarios, FEEDBACK reportes/sugerencias y PyS: cargas Drive no se realizan bajo ScriptLock global en las rutas inspeccionadas; se conservan opId, payloadHash, estados y limpieza/reconciliación.
- ADMIN y benchmark real de latencia/Drive no están auditados todavía. No se quitó ningún lock.


## Continuidad — ADMIN reemplazo de imágenes fuera de lock (2026-11-21)

- HEAD previo: `9fd4be2802dec45eaabd22c838b1cd515ec692ad`; base protegida sin cambios `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- ADMIN ruta actual de reemplazo: `handleUploadAdminImage` usa upload Drive + evento compare-and-set sin ScriptLock global.
- Ruta legacy y reparación de imágenes usan `runAdminContributionDriveWorkOutsideScriptLock_` / `runWriteDriveWorkOutsideScriptLock_`: liberan lock durante Drive y reacquire no bloqueante con ID estable para revalidar.
- Se mantienen locks de operaciones destructivas e inventario; no se retiró ningún lock.
- Falta revisar logo upload y completar benchmarks de Drive/transferencia. La auditoría de inventario/admin sigue separada del upload normal.


## Continuidad — hallazgo pendiente de logotipos ADMIN (2026-11-21)

- HEAD previo: `57e251c8490286e2aab52cff44e19a88181b6f03`; base protegida intacta `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- `ui.js` conserva el Base64 anterior mientras FileReader lee el nuevo logotipo; no tiene onerror/onabort ni control de generaciones. Puede haber desajuste entre bytes y nombre/MIME si se envía antes de completar la lectura.
- `handleAddLogo` sube a Drive antes de tryLock(0), sin retener el lock durante transferencia, pero no se encontró límite de bytes ni firma binaria validada en el handler.
- Se añadió tarea pendiente para carrera, errores, límite y MIME/firma. No se cambió el upload de logotipos; no se impuso límite arbitrario.
- Próximo: corregir este flujo administrativo con contrato/test aislado; después continuar snapshots dirigidos y mediciones de red.



## Continuidad — carrera de selección de logotipos corregida (2026-11-21)

- HEAD previo a documentación: `7131a50682bc97b6a730051f206fda2a9abb6eed`; base protegida intacta `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- `ui.js`: helper `readLogoFileBase64_` maneja éxito/error/abort/Data URL inválida. La selección invalida Base64/nombre anteriores, usa generación para descartar lecturas antiguas y deshabilita Registrar hasta lectura válida.
- `AdminLogoFileRead.mjs` integrado en `RunServiceTests.mjs`; pruebas aisladas 4/4 PASS.
- Pendiente definir máximo de bytes y validar MIME/firma en backend antes de crear Drive; no se fijó límite arbitrario.


## Verificación CI — correcciones de aportes e imágenes (2026-11-21)

- Código probado en commit `865fb969285ee0e7e55a01a546175c1bc49d1882`.
- GitHub Actions `GPSpedia service regression tests`: SUCCESS. Pasos de sintaxis de módulos JavaScript modificados y suites de regresión aisladas: SUCCESS.
- Build: SUCCESS. Deployed-service-health: SUCCESS (solo lectura). GitHub Pages build/deployment: SUCCESS.
- El deployment ejecutado fue GitHub Pages; no se publicó ningún proyecto Apps Script ni se modificaron datos/secretos productivos.
- Rama de trabajo verificada: `GPSpedia2.2.5_work`. Rama base protegida: `GPSpedia2.2.5` en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.
- Próximo trabajo pendiente: definir límite y validación MIME/firma para logos ADMIN; completar benchmark de imágenes/Drive y caché fría/caliente; consultas CATALOG dirigidas; confirmar consumidores externos de touchSession. No afirmar mejora global de tiempos hasta medirla.



## Continuidad — CATALOG: lectura mínima de navegación (2026-11-21)

- HEAD confirmado antes del cambio: 869f4bb3c2df8f3e2195ba6b0bd71e7cf2d1a45a; rama GPSpedia2.2.5_work. Base protegida GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- handleGetNavigationData ahora lee únicamente ID/categoría/marca en Cortes y las tres columnas de LogosMarca; evita getDataRange en ambas hojas y evita rangos vacíos.
- Se conserva el contrato de respuesta. No hay consumidor frontend activo confirmado para esta acción, por lo que no se afirma ahorro actual de arranque.
- CatalogNavigationRead.mjs: 2/2 PASS en harness aislado de la función exacta.
- Pendiente de ejecución: runner Node completo y CI. No se desplegó Apps Script ni se accedió a Spreadsheet/Drive productivos.
- Siguiente: diseñar consulta CATALOG dirigida para ADMIN/detalle; la proyección de AportesVehiculo calcula conflictos globales de VIN, por lo que no se puede limitar ingenuamente el ledger a un vehículo.


## Continuidad — miniaturas: eliminar purgas globales repetidas (2026-11-21)

- HEAD previo: f538d35e5bab76ab9e1950fd6db48a27d74f7a2e. Base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- getThumbnail y compressAndStoreThumbnail ya no ejecutan getAll() + borrados individuales antes de cada imagen. readFreshThumbnail conserva la validación TTL por clave.
- La limpieza de entradas expiradas se integra en la transacción LRU al almacenar nuevas miniaturas; no se cambian TTL (30 días), límite de 200 entradas, PNG, ObjectURL ni recuperación de cuota.
- Se añade single-flight por fileId/ancho para compartir solicitudes simultáneas de compresión.
- ThumbnailCacheDeduplication.mjs: 3/3 PASS en harness exact-source.
- Pendiente: CI del commit. No se ha resuelto aún la segunda descarga de setOptimizedImage + fetch de compresión; requiere conservar primera visualización inmediata y compatibilidad CORS.
- Siguiente: revisar estrategia de prefetch de 15 vehículos, prioridad de imágenes visibles y descarga duplicada visible/fetch.


## Continuidad — CATALOG respuestas dirigidas ADMIN (2026-11-21)

- HEAD previo: d4ca43b1180db5149d24d3195d21622e12d28d62; base protegida d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Se añaden las acciones CATALOG getVehicleProjection y getContributionCandidates. ADMIN deja de descargar el catálogo completo para verificar un vehículo/campo y para recuperar candidatos del inventario de imágenes.
- La respuesta de vehículo conserva contributionSources y contributionCandidates; candidatos conserva payload, orden, total y límite.
- El proyector global y sus controles de VIN/opId no se alteran. Los handlers dirigidos todavía construyen el snapshot completo dentro de CATALOG; el ahorro demostrado por diseño es de bytes de respuesta y parseo/transferencia hacia ADMIN, no de lecturas Spreadsheet.
- Pruebas nuevas: CatalogTargetedResponses.mjs 3/3; AdminVehicleTargetedCatalogRead.mjs 2/2. CI pendiente.


## Continuidad — pruebas de imagen reactivadas (2026-11-21)

- Se corrigieron rutas que apuntaban a módulos inexistentes en raíz; las pruebas ahora inspeccionan JS/Frontend, el grafo activo desde index.html.
- Se retiraron expectativas obsoletas sobre probe/startRemoteProbe que no existen en el módulo desplegado.
- ImageResolutionVariants.js e ImageObjectUrlLifecycle.js se integran al runner de regresión.
- El doble acceso en cache miss sigue confirmado: img.src remoto inmediato + fetch remoto para compresión. No se considera corregido.
- CI pendiente.


## Tarea registrada — auditoría visual de encabezados de modales (2026-11-21)

- P1 pendiente: auditar reglas CSS repetidas/dispersas y contradicciones de cascada de los modales; consolidar bloques sin alterar el resultado visual vigente por inferencia.
- Foco inicial: encabezado del modal de detalles de corte reportado desproporcionado. Comparar versión 2.2.5 con referencia 2.1.7.
- Validar logo, botones de edición, cierre, proporciones, espaciado y breakpoints; revisar otros modales afectados.
- No se modificó CSS en esta etapa. Se ejecutará tras cerrar/aislar la optimización CATALOG y el ciclo de imágenes en curso.


## Checkpoint de continuidad — CATALOG e imágenes (2026-11-21)

- HEAD actual verificado: 9ebeecd99869cab11bd8d9501cfd0dc4b31ab89c en GPSpedia2.2.5_work.
- Base protegida verificada: d9acc68d889985c2e2f42fe3a02e502efc86ead1; no modificada.
- GitHub Actions: GPSpedia service regression tests SUCCESS, 271 suites / 3,189 pruebas / 0 fallos. Deployed-service-health read-only SUCCESS. Pages build/deployment aún en ejecución al registrar este checkpoint.
- CATALOG: navegación lee rangos mínimos; nuevas acciones getVehicleProjection/getContributionCandidates reducen el payload transferido a ADMIN. Aún no reducen lecturas Spreadsheet internas porque usan handleGetCatalogData completo.
- Imágenes: purga global IndexedDB por imagen retirada; expiración se limpia dentro de LRU; single-flight por archivo/resolución. IndexedDB opcional conserva initDB silent. Variantes y ObjectURL lifecycle integrados al runner (10/10 + 10/10).
- Hallazgos pendientes: doble solicitud de red en cache miss visible; prefetch de 15 vehículos y cola FIFO sin prioridad visible; falta medir bytes/latencia fría/caliente.
- Modal CSS: nueva tarea P1 registrada para auditoría de cascada, encabezado de detalle de corte y comparación 2.2.5 vs 2.1.7. No se modificó CSS.
- No se desplegaron proyectos Apps Script ni se modificaron Spreadsheet, Drive, secretos o propiedades productivas.


## Continuidad — eliminar descarga duplicada de imágenes (2026-11-21)

- HEAD anterior: d68d07d7a5bfbd5282c23fc04bc7a13f94da3553.
- setOptimizedImage solicita CORS antes de asignar src; en cache miss, la miniatura se deriva del HTMLImageElement ya cargado usando compressAndStoreThumbnailFromImage/createImageBitmap. Se elimina el segundo fetch desde el flujo visible.
- Si CORS falla, el elemento reintenta una vez sin crossorigin para mantener la imagen visible; en ese modo se omite persistencia local por seguridad.
- Se mantienen TTL/LRU/single-flight y protecciones ObjectURL. CI y pruebas de navegador pendientes.


## Continuidad — retirar precargas duplicadas de tarjetas (2026-11-21)

- updateCardInPlace e insertNewVehicleFluently descargaban previamente la imagen en un objeto Image y después volvían a cargar la misma imagen en el elemento final mediante setOptimizedImage.
- Se retiraron ambas precargas y el helper preloadImageSilently, eliminando ese duplicado comprobado en actualización e inserción de vehículos.
- Se añadió contrato de regresión para impedir que vuelva a aparecer el helper de precarga en este módulo.
- CI pendiente.

 
## Continuidad — CATALOG candidatos ADMIN con lectura aislada (2026-11-21)

- HEAD anterior: e7c02f70910ae4a987402b7c4cb5e8339985d6ce.
- Se factoriza la transformación exacta de filas Cortes para evitar divergencia entre catálogo completo y consulta dirigida.
- getContributionCandidates construye la proyección usando Cortes + FeedbackLikes + AportesVehiculo; omite LogosMarca, Tutoriales y sus ledgers de edición/renombre, y Relay.
- Se conserva lectura global de Cortes y AportesVehiculo, conteo de likes, orden de cortes y proyección completa de conflictos VIN/opId/resoluciones.
- No se modifican datos productivos. CI pendiente.

 
- La consulta getContributionCandidates ya se aisló de hojas de Logos/Tutoriales/Relay; prueba dedicada de aislamiento añadida al runner, pendiente CI.

 
- getVehicleProjection también migró a readCatalogContributionProjectionVehicles_: ambas consultas dirigidas ADMIN comparten el mismo pipeline de proyección y omiten hojas de logos/tutoriales/relay. La consulta sigue leyendo el universo completo de VIN y ledger para preservar conflictos globales.

 
## Continuidad — CATALOG proyección física dirigida (2026-11-21)

- getVehicleProjection ahora escanea la columna ID y la columna VIN de Cortes, lee completa únicamente la fila del vehículo solicitado y proyecta sobre el universo de IDs/VIN + ledger global.
- Mantiene la proyección global de conflictos VIN/opId/resoluciones y el mismo mapper para preservar likes, normalización, orden de cortes, fuentes y candidatos.
- La lectura dirigida reduce datos de Cortes desde todas las columnas de todas las filas a dos columnas globales + una fila completa.
- Prueba dedicada verifica rangos, fuentes leídas, preservación de VIN global y rechazo de IDs duplicados. CI pendiente.

 
## Checkpoint — CATALOG dirigido e imágenes (2026-11-21)

- HEAD verificado: b8d425748e483fcd6535fdc83c7c982d603b6161 en GPSpedia2.2.5_work.
- CI: 273 suites / 3,191 pruebas / 0 fallos; health read-only SUCCESS. GitHub Pages build/deployment se verificará por separado al terminar.
- CATALOG getContributionCandidates usa la proyección de filas compartida y omite hojas no relacionadas (logos, tutoriales, ledgers de tutoriales, relay), conservando Cortes + FeedbackLikes + AportesVehiculo y el proyector global.
- CATALOG getVehicleProjection lee IDs y VIN de todas las filas, más una fila completa; alimenta al proyector con la base global mínima para conservar detección de VIN/opId y devuelve solo la ficha solicitada.
- Tests: CatalogTargetedResponses 3/3; CatalogVehicleProjectionRead 1/1; CatalogContributionReadIsolation 1/1; SupplementaryVideoContract 55/55.
- Imágenes: setOptimizedImage reutiliza bytes del elemento cargado para persistencia cuando CORS permite; fallback no-CORS conserva display y omite caché si no se puede leer el canvas. Precargas redundantes de actualización/inserción retiradas. Variantes 10/10, ObjectURL 10/10.
- La cola de compresión es FIFO, concurrencia 2; no existe prefetch activo de 15 vehículos. El carrusel actual muestra 6 últimos agregados.
- Pendiente: validar comportamiento en navegador real (CORS, PNG alfa, cache hit/miss, bytes transferidos y primera pintura). El cache hit todavía inicia el src remoto antes de que IndexedDB responda; medir antes de cambiar.
- Pendiente: optimizar getContributionCandidates para leer columnas mínimas solo después de documentar todas las dependencias del proyector y demostrar paridad.
- No se desplegó Apps Script ni se modificaron datos productivos.

 
## Checkpoint — auditoría CSS de modales (2026-11-21)

- Auditoría estática completada sobre style.css, button-system.css, contextual-help.css y JS/Frontend/ui.js.
- Branch histórico consultado: GPSpedia-2.1.7 (39f87b6205f8086daec69589e4193d457568dc0a). Su index.html dice GPSpedia v2.1.6; la diferencia queda documentada.
- Hallazgos clave: título móvil 2rem sobreescribe clamp 1.35rem; input móvil 1.5rem sobreescribe .9rem; logo móvil max-width:none dentro de columna max-content; acciones 36px y cierre 40px.
- El cierre de corte está anidado dentro de .detail-modal-header-actions, por lo que .detail-modal-toolbar > .info-close-btn no lo posiciona.
- .detail-modal-toolbar es compartido con Tutorial/Relay; consolidar manteniendo la base compartida y aislando la variante corte.
- Pendiente: consolidación CSS, prueba de cascada y visual Beta. No se modificó CSS en la fase de auditoría.

 
## Checkpoint — consolidación del encabezado CSS (2026-11-21)

- Se reemplazó el bloque duplicado del encabezado por una sección contigua única: base compartida + variante scoped de corte + responsive.
- Se preservaron estilos base de Tutorial/Relay y el selector de cierre directo para Relay.
- Se corrigieron los valores móviles que eran sobrescritos (título e input), se limitó el logo móvil a min(30vw,120px), y se mantuvo el cierre de corte anidado y 40×40.
- El estado below-logo declara cinco filas.
- Se agregó JS/Tests/ModalHeaderCssCascade.mjs al runner; CI pendiente.


## Checkpoint — cierre CSS y continuidad CATALOG/imágenes (2026-11-21)

- HEAD previo a este checkpoint: b4c794dd582981dd3e3bda7cb2bd583bd080e12b en GPSpedia2.2.5_work.
- CI: 274 suites / 3,205 pruebas / 0 fallos. ModalHeaderCssCascade 14/14; CutDetailModalLayout 29/29. Health read-only SUCCESS; Pages build/deployment SUCCESS.
- Auditoría y consolidación CSS de encabezados cerradas localmente. Un bloque contiguo agrupa base compartida, variante corte y responsive. Tutorial/Relay conservan base y cierre directo; el cierre de corte sigue anidado en acciones.
- La corrección posterior a la primera CI solo ajustó contratos regex sensibles a espacios/formato; no modificó reglas CSS.
- Pendiente Beta visual: desktop, Android/PWA, tutorial, Relay, foco/cierre, modo oscuro y overflow.
- CATALOG: getContributionCandidates omite hojas no relacionadas; getVehicleProjection lee IDs/VIN globales y una fila completa. Pruebas incluidas en CI.
- Imágenes: miniatura desde elemento ya cargado con CORS, fallback sin persistencia no segura, precargas duplicadas retiradas. FIFO concurrencia 2, sin prefetch de 15 elementos.
- Siguiente trabajo local: analizar dependencias del proyector de candidatos para una proyección de columnas mínima; auditar getReplacedImages e inventario sin reducir comprobación global de referencias Drive. Medir antes de retirar protecciones.
- No se desplegó Apps Script ni se modificaron Spreadsheet/Drive productivos.


## Continuidad — P0.1 mapa de llamadas y dependencias (2026-11-21)

- HEAD de partida confirmado: `37f97061001cf688b354f3bc9c05ca5d87fb922b` en `GPSpedia2.2.5_work`; base protegida `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.
- Se completó inspección estática del router `JS/Frontend/api-config.js`, dispatchers AUTH/USERS/WRITE/FEEDBACK/ADMIN/CATALOG/UTILITIES, Coordinator, SharedMutationClient e Inbox.
- Nuevo documento: `MAPA_LLAMADAS_DEPENDENCIAS_P0_2026-11-21.md`. Incluye rutas por servicio, dependencias servidor-servidor, inventario estático UrlFetch/fetchAll y separación entre evidencia estática y métricas no disponibles.
- Confirmado: routeAction realiza un POST por invocación; los reintentos añaden requests; telemetría browser es local; actor cache hit evita validateSessionContext; lease compartida normalmente implica acquire/release; ciertas mutaciones agregan publicación a Coordinator. ADMIN tiene llamadas internas WRITE/CATALOG y operaciones Drive/API.
- P0.1 y el inventario estático inicial se marcan completos. No se afirma benchmark: requests reales, bytes, p50/p95, lecturas/escrituras Sheets/Drive, cache hit/miss y esperas siguen sin medir.
- No se modificó código de servicios ni se invocaron deployments. No se accedió a datos productivos.
- Siguiente paso: P0.2, instrumentación y pruebas locales reproducibles por flujo; luego completar consumidores AUTH/USERS y mapear cada acción frontend.


## Continuidad — P0.2 instrumentación local de bytes (2026-11-21)

- Tras el mapa P0.1, se amplió `routeActionInternal_` para serializar el request body una vez y medir bytes UTF-8 del cuerpo enviado y del cuerpo de respuesta leído. No añade viajes de red ni modifica contratos/payloads.
- `serviceTelemetry.js` agrega totales y promedios request/response por servicio y mantiene eventos locales efímeros (máximo 200), sin guardar payloads, tokens o datos personales.
- `ServiceBrowserTrafficContract.mjs` cubre agregación y propagación de tamaños. GitHub Actions del HEAD `b41627adb0766cf59dca8bfa5739b6e4f061fa02` estaba en ejecución al registrar; no declarar PASS hasta consultar resultados para el HEAD final.
- La medición representa cuerpos HTTP UTF-8, no overhead de transporte, recursos multimedia directos ni lecturas/escrituras internas Sheets/Drive. La latencia registrada sigue siendo total navegador-request.
- P0.2 sigue pendiente para ejecutar escenarios reproducibles y calcular p50/p95 por flujo en Beta autorizada.


## Seguimiento — regresión de contrato del router tras instrumentación (2026-11-21)

- Primera ejecución de CI sobre la instrumentación: 261 suites, 3,030 pruebas aprobadas y una suite fallida. El fallo no fue funcional: `TermsAcceptance.js` esperaba encontrar la serialización inline `JSON.stringify({ action, payload })`; P0.2 ahora serializa el mismo objeto una sola vez en `requestBody` para medir bytes y reutilizarlo en fetch.
- Se actualizó la expectativa estática de `TermsAcceptance.js` para validar `const requestBody = JSON.stringify(...)` y `body: requestBody`, sin cambiar la lógica de aceptación de términos.
- Corrección publicada en commit `521120e98a89d829e8e464ba635426a6da0a4198`. La nueva ejecución de service-tests/build/health se encontraba en curso al registrar. No marcar aún como aprobada.
- El resto de la regresión observada antes de la única suite fallida había aprobado; el resumen fue 3,030 pruebas aprobadas, 1 suite pendiente/fallida por contrato obsoleto.


## Cierre — P0.2 instrumentación local de métricas (2026-11-21)

- HEAD de código validado antes del registro: `d7c209f85d3b790626ff56e7813c942ca46ca5aa` en `GPSpedia2.2.5_work`; rama base `GPSpedia2.2.5` sin cambios.
- `JS/Frontend/api-config.js` mide el tamaño UTF-8 del cuerpo JSON enviado y del cuerpo de respuesta leído; no añade requests ni altera el payload. Cada intento de retry queda registrado como request individual.
- `JS/Frontend/serviceTelemetry.js` mantiene métricas efímeras en memoria: requests, éxitos/errores, duración media, bytes totales/promedio y p50/p95 de duración/tamaños sobre un máximo de 200 eventos recientes por pestaña. Los percentiles no se presentan como muestra poblacional de 24 horas; no se guardan payloads, tokens ni identidad.
- `JS/Tests/ServiceBrowserTrafficContract.mjs` amplía las pruebas de percentiles, valores sin muestra y agregación de bytes.
- Validación GitHub Actions sobre el commit de código `d7c209f85d3b790626ff56e7813c942ca46ca5aa`: sintaxis de módulos modificados SUCCESS; regresión de servicios SUCCESS, **277 suites / 3,226 pruebas / 0 fallos**; health de servicios read-only SUCCESS. Pages build/deployment seguía en ejecución al momento del cierre documental; no se marca aquí como aprobado.
- Estado P0.2: **COMPLETADA CON VALIDACIÓN DIFERIDA**. La ejecución de línea base real por flujo requiere navegador y entorno Beta aislado; operaciones Sheets/Drive, latencia interna Apps Script, CORS y recursos multimedia no se miden con este contador de cuerpos HTTP.
- Siguiente tarea inmediata: completar matriz de consumidores AUTH/USERS y revisar acciones/leases conforme a §15, sin cambiar permisos ni el hash actual.


## Cierre — mapa de consumidores AUTH/USERS (2026-11-21)

- HEAD de inspección: `8683e157f641853fa9c5523cbd3f25a8937bdec5`; rama base `GPSpedia2.2.5` permanece intacta.
- Nuevo documento: `MAPA_CONSUMIDORES_AUTH_USERS_P0_2026-11-21.md`. Registra rutas frontend, servicios, dispatchers, acciones sin consumidor y dependencias de Coordinator/locks.
- Consumidores confirmados: login desde main.js; validateSession desde fallback de cambio de rol (y función exportada validateActiveSession sin consumidor encontrado); acceptTerms desde showApp y evento online con single-flight; logout desde menú principal y fallback de users.html; recuperación desde formularios; alta/listado/perfil de usuario desde users.html; actualización, eliminación, cambio/reset de contraseña y cierre remoto desde users.html.
- touchSession no tiene consumidor frontend activo. La prueba TermsAcceptance ya impide que acceptTerms dispare un touchSession adicional.
- AUTH aplica lease acquire/release a login, touchSession, acceptTerms, recuperación, cambios/reset de contraseña, reset de sesiones, deleteUser, updateUser, logout y migración. USERS solo aplica lease a createUser; getUsers/updateProfile usan actor cacheado (cache miss consulta Coordinator).
- Dependencia crítica: USERS createUser y AUTH deleteUser comparten recurso lógico USERS en Coordinator; el lock local de USERS no protege frente a AUTH. No retirar esta exclusión hasta diseñar una autoridad común equivalente.
- updateUser cambia roles y usa marcador, revocación e invalidación de cachés; no reducirlo como si fuera un cambio de nombre. logout/resetUserSessions/deleteUser conservan efectos de revocación.
- Mapa estático completado. Siguiente tarea: clasificar y simplificar leases conforme a §15, comenzando por touchSession sin consumidor y acceptTerms; luego recuperación/actualizaciones ordinarias. Conservar excepciones expresas y validar RBAC, revocación y carrera alta/eliminación.


## Cierre — reducción de leases AUTH para touchSession/acceptTerms (2026-11-21)

- Código validado en commit `e412c32466f8aca5f67dc94707e9720588df3cb0`; rama de trabajo `GPSpedia2.2.5_work`. La base protegida continúa sin cambios.
- `touchSession` no tiene consumidor frontend activo. Se conserva su dispatcher/handler por compatibilidad, pero se retira de `isSharedMutationAction_`; una invocación histórica ya no adquiere lease de Coordinator.
- `acceptTerms` se retira de `isSharedMutationAction_` y su dispatcher obtiene actor con `getCachedSharedSessionActor_`; la escritura mantiene RBAC, validación de identidad y lock local necesario para la lectura-modificación-escritura del registro JSON por dispositivo.
- Después de registrar las sesiones en Coordinator al iniciar sesión, AUTH precalienta su caché local de actor con userId/rol/epoch confiables. Las revocaciones individuales y por usuario limpian también esa caché local antes de coordinar la invalidación remota, evitando reutilizar actor obsoleto.
- No se elimina la validación de respaldo: si la caché local falta/expira, `getCachedSharedSessionActor_` valida una vez con Coordinator y vuelve a guardar el actor.
- Pruebas ampliadas: `TermsAcceptance.js`, `SessionActorCacheLifetime.mjs`, `SessionActorCacheInvalidation.mjs`, `SessionActivityLeaseMinimization.mjs`; se registró esta última en `RunServiceTests.mjs`. Se corrigieron dos expectativas obsoletas de la suite de minimización ADMIN (router cacheado y delegación WRITE con argumentos actuales).
- GitHub Actions sobre `e412c32466f8aca5f67dc94707e9720588df3cb0`: sintaxis/build SUCCESS; health read-only SUCCESS; regresión **278 suites / 3,232 pruebas / 0 fallos**. Pages deploy estaba ejecutándose al momento de registrar y no afecta a la validación de servicios.
- Siguiente tarea: clasificar las leases restantes AUTH. Candidatas: request/complete password recovery, change/reset password, updateUser sin cambio de rol, resetUserSessions, logout y migración; preservar revocaciones remotas y RBAC. Mantener coordinación createUser ↔ deleteUser hasta resolver su exclusión mutua entre proyectos.


## Cierre — reducción integral de leases AUTH (2026-11-21)

- Código validado en `3c2223cb137950c23e1acd80d26d9e7087f7de78`; rama de trabajo `GPSpedia2.2.5_work`. La base protegida permanece intacta.
- `isSharedMutationAction_` de AUTH queda limitado a `deleteUser`. Login usa el lock local de intentos fallidos/creación de sesión y sincroniza contexto inicial; no adquiere lease. request/complete password recovery, change/reset password, resetUserSessions, updateUser, logout y migrateLegacyPasswords no adquieren leases.
- Las acciones autenticadas ordinarias usan actor cacheado preparado en login; se conservan las revocaciones remotas de logout, recuperación/cambio de contraseña, reset de sesiones, cambio de rol y eliminación. La invalidación local de caché se ejecuta antes de la revocación remota.
- `deleteUser` conserva lease por su efecto sobre Users/ActiveSessions/SESSION_CONTEXTS y por la carrera cross-project con USERS/createUser. `USERS/createUser` ahora declara únicamente lectura/escritura del recurso USERS; se eliminan políticas Coordinator para AUTH/updateUser y AUTH/resetUserSessions. La exclusión createUser ↔ deleteUser queda demostrada en pruebas.
- Pruebas actualizadas: `PasswordRecovery.mjs`, `UsersAtomicMutations.js`, `SharedMutationCoordinator.js`, `CoordinatorCapabilityPreservation.mjs`, `SessionActivityLeaseMinimization.mjs`, `TermsAcceptance.js`. Las políticas Coordinator antiguas de acciones que ya no se invocan se conservan solo cuando las pruebas/compatibilidad histórica aún las requieren; no son llamadas desde el dispatcher AUTH.
- GitHub Actions sobre el commit de código `3c2223cb137950c23e1acd80d26d9e7087f7de78`: regresión **278 suites / 3,232 pruebas / 0 fallos**; build SUCCESS; health read-only SUCCESS. El deploy de GitHub Pages estaba en curso al registrar.
- Siguiente tarea: P0.3 — eliminar revalidación de identidad en cache miss por acción y preparar actor de sesión en USERS/WRITE/FEEDBACK/ADMIN al iniciar sesión. Mantener cierre remoto, invalidación de caché y revocación de cuenta. Después ejecutar línea base Beta aislada.


## Cierre — P0.3 actor cache-only y coordinación de invalidación (2026-11-21)

- Código validado en `ac02da63cebb6ef9a99e389794f4246bfc3ed34b`; rama `GPSpedia2.2.5_work`. La rama base protegida sigue intacta.
- `getCachedSharedSessionActor_` ya no invoca `validateSessionContext` en cache miss. Solo lee actor local, renueva TTL en hit (máximo 6 h) y falla cerrado con `SESSION_ACTOR_CACHE_MISS` si falta/está corrupto. No se hace revalidación por acción.
- Login AUTH llama a `syncUserSessions`; Coordinator registra el contexto bajo lock y, después de liberar ese lock, precarga actores en USERS/WRITE/FEEDBACK/ADMIN mediante `__primeSessionActorCache`, usando `fetchAll` y lotes de máximo 25 tokens. La precarga parcial no revierte el login; AUTH registra los servicios fallidos en log. AUTH precalienta su propia caché local.
- USERS/WRITE/FEEDBACK/ADMIN exponen endpoints internos autenticados `__primeSessionActorCache` y `__invalidateSessionActorCache`. USERS fue añadido a la invalidación remota; la invalidación confirma USERS, WRITE, FEEDBACK y ADMIN antes de completar revocación.
- `Services/COORDINATOR_SETUP.md` actualizado: requiere que Coordinator tenga `GPSpedia_SERVICE_URL_USERS` y `GPSpedia_COORDINATOR_SECRET_USERS`, además de URLs/secretos ya usados; cada servicio debe tener su `GPSpedia_COORDINATOR_SECRET` coincidente. Las propiedades reales/deployments no se inspeccionaron ni modificaron; deben verificarse en Beta.
- Se amplió prueba de Coordinator: 60 sesiones se precargan en 12 requests (3 lotes × 4 servicios), fuera del lock global; fallo de un servicio queda reportado sin revertir login. La invalidación remota ahora cubre los cuatro servicios.
- Se añadió prueba de concurrencia de Coordinator: AUTH/deleteUser bloquea USERS/createUser mientras mantiene el recurso USERS; tras liberar, createUser puede continuar. La política de USERS/createUser se reduce a lectura/escritura de USERS; AUTH/updateUser y AUTH/resetUserSessions ya no tienen políticas de lease.
- Espejo `JS/Tests/users.js` sincronizado con los nuevos endpoints internos.
- Regresión sobre `3a1faf032f5a38ac7c1d7118628d0e856701fdd8`: **278 suites / 3,236 pruebas / 0 fallos**; build SUCCESS y health read-only SUCCESS. Los últimos cambios posteriores fueron de etiqueta/documentación y continuidad.
- Limitación operativa documentada: CacheService TTL máximo 6 h, renovado en cada hit. Si se evapora por inactividad/evicción, la acción falla cerrado y el usuario debe iniciar sesión para volver a precargar. La precarga real depende de las propiedades/URLs desplegadas, no verificadas desde este entorno.
- Siguiente tarea: revisar lecturas duplicadas de Users/ActiveSessions y revocaciones dentro de una operación AUTH/USERS; después continuar con WRITE/FEEDBACK/ADMIN y CATALOG. La medición real p50/p95 y lecturas Sheets/Drive queda pendiente de Beta aislada.


## Cierre — P0.4 reducción de lecturas y revocaciones duplicadas AUTH (2026-11-21)

- Rama de trabajo: `GPSpedia2.2.5_work`; rama base protegida `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Login reutiliza un único snapshot de `ActiveSessions` para localizar el token, validar el puntero y calcular el límite de sesiones. Solo vuelve a escanear la hoja para reconciliar errores ambiguos de append/limpieza; la confirmación normal lee la fila objetivo.
- Recuperación de contraseña hace la búsqueda preliminar fuera del lock y verifica bajo lock únicamente la fila candidata. Reconciliación de cambio de rol recibe el índice de fila ya validado y evita repetir la lectura completa de Users.
- Cambio/reset de contraseña y reset de sesiones ya no leen ActiveSessions para extraer tokens y luego vuelven a leerla para revocar: `revokeAllUserSessionsUnderLock_` captura los tokens una vez e invoca la invalidación remota antes de limpiar los valores locales.
- Eliminación de cuenta reutiliza un snapshot de ActiveSessions limitado a ID/token, valida duplicados en memoria, invalida contextos con los tokens del snapshot y comprueba residuos leyendo solo la columna ID_Usuario.
- Se añadieron `JS/Tests/AuthSessionReadOptimization.mjs` (9/9) y ajustes de `PasswordRecovery.mjs`, `LastDeveloperProtection.js` y `CoordinatorCapabilityPreservation.mjs` para reflejar los contratos reales y los rangos dirigidos.
- CI sobre HEAD documental `14eeb59ae4e3a3a534dae9f87824656d235bb17f`: **279 suites / 3,245 pruebas aprobadas / 0 fallos**; build SUCCESS; health de servicios read-only SUCCESS. Pages deploy seguía en curso y no es condición de aprobación de servicios.
- No se modificaron deployments Apps Script, endpoints, propiedades, secretos, Spreadsheet ni Drive productivos.
- Siguiente tarea: auditar WRITE/FEEDBACK/ADMIN de extremo a extremo; iniciar por aportes WRITE, donde se observan lecturas de Cortes y del ledger en fases distintas. No combinar lecturas si afecta idempotencia, detección de conflictos, append verification o recuperación concurrente.


## Cierre — WRITE comparte snapshot del ledger tras append (2026-11-21)

- En `handleAppendExistingVehicleCut_`, el cálculo de slot y la detección de colisión VIN posterior al append reutilizan una sola lectura de `AportesVehiculo`; antes cada helper leía el ledger por separado.
- En `handleCheckOperation`, la lectura compartida se ejecuta solo cuando se encontró un evento existente, su huella coincide y el evento es de tipo `cut`. Los casos sin evento y las recuperaciones de `opening/feed` no pagan esa lectura adicional.
- `getVehicleContributionCutSlotIndex_` y `findVehicleContributionVinConflict_` aceptan un snapshot opcional; sin snapshot conservan su comportamiento y usan el helper común de lectura. Se eliminaron comprobaciones duplicadas de getLastRow al reutilizarlo.
- Se mantienen la detección de opId duplicado/conflictivo, el TextFinder, la verificación del append y la lectura de recuperación; no se relajó idempotencia ni concurrencia.
- Prueba nueva `WriteContributionPostAppendSnapshot.mjs`: 12/12 PASS. GitHub Actions en HEAD `d0feac30cf3d22547b05a07b675fd7717050e51a`: **280 suites / 3,257 pruebas / 0 fallos**; build SUCCESS; health read-only SUCCESS.
- Siguiente: continuar con FEEDBACK y ADMIN, empezando por lecturas repetidas en sugerencias de año y likes.


## Cierre — FEEDBACK reutiliza snapshot en reintentos de sugerencia de año (2026-11-21)

- `handleSuggestYearLocked` ya conserva `existingData` para evaluar actor/año, duplicados y estado aplicado. Antes volvía a leer toda la hoja Feedbacks incluso cuando `alreadyReported` era true y no había append.
- Ahora `allData` comienza con `existingData`; únicamente cuando se agrega una nueva fila se vuelve a leer Feedbacks, para incluir los aportes concurrentes antes de contar votos y aplicar el umbral de tres usuarios verificados.
- Se mantienen el preflight de aplicación pendiente, first-write-wins, control de actores, exclusión de anónimos, conteo de votos y read-back posterior al append. No se sustituye el snapshot después de una escritura concurrente.
- `SuggestYearVoteThreshold.mjs` amplía el contrato para comprobar reutilización del snapshot y relectura solo tras append. CI en HEAD `6f5b0d8ea7ea5db33411142aff0040282bb27de5`: **280 suites / 3,258 pruebas / 0 fallos**; build SUCCESS; health read-only SUCCESS; GitHub Pages deploy SUCCESS. No se desplegaron proyectos Apps Script.
- Siguiente: revisar el flujo FEEDBACK de likes, reportes e Inbox; luego ADMIN.


## Cierre — FEEDBACK sugerencias de año, reutilización de snapshot (2026-11-21)

- HEAD de código validado: `6f5b0d8ea7ea5db33411142aff0040282bb27de5`; rama base `GPSpedia2.2.5` permanece intacta.
- `handleSuggestYearLocked` reutiliza `existingData` como `allData` cuando el actor ya había reportado y no se agrega una fila. Solo vuelve a leer Feedbacks después de un append nuevo, para incluir votos concurrentes y mantener correcto el umbral de tres aportantes verificados.
- `SuggestYearVoteThreshold.mjs` amplía la cobertura de snapshot reuse; CI: **280 suites / 3,258 pruebas / 0 fallos**; build SUCCESS; health read-only SUCCESS; GitHub Pages deploy SUCCESS. No se desplegó Apps Script.
- Siguiente: FEEDBACK likes — unificar preflight completado/evento y reutilizar filas ya consultadas, manteniendo append-only y proyección CATALOG.


## Cierre — FEEDBACK likes, snapshot único de replay por actor (2026-11-21)

- `readLikeActorReplaySnapshot_` consulta una sola vez el esquema de FeedbackLikes y las filas del actor/vehículo/corte. El resultado alimenta el replay legacy `completed`, el replay append-only `event` y la comprobación posterior de filas existentes.
- Se eliminó la secuencia de consultas repetidas al mismo actor desde `findCompletedLikeReplayNoop_`, `findLikeEventReplayNoop_` y `handleRecordLike`. El preflight continúa siendo de solo lectura y no crea la hoja si no existe.
- Después de un append nuevo o recuperación de pending, se conserva una consulta fresca para confirmar el evento durable y calcular el contador efectivo. No se modificó el contrato append-only, la deduplicación de actores en CATALOG, el contador físico ni la publicación incremental.
- `FeedbackLikeCompletedReplayPreflight.mjs`: 7/7 PASS. CI HEAD `51f260338abf6faa307cb646a13554fb8cf5f7dd`: **280 suites / 3,259 pruebas / 0 fallos**; service-tests SUCCESS; health read-only SUCCESS. No se modificaron deployments Apps Script ni datos productivos.
- Siguiente: revisar reportes e Inbox FEEDBACK; después continuar con ADMIN.


## Cierre — FEEDBACK reportes propios, índice de eventos de imagen (2026-11-21)

- `handleGetMyProblemReports` ahora agrupa las filas propias antes de mapearlas y, si alguna metadata no contiene imagen legacy, carga `FeedbackReportImageEvents` una sola vez en un índice por `reportId`. `mapInboxFeedbackRow_` consume el índice y no realiza una búsqueda individual por cada reporte.
- Se conserva prioridad de metadata legacy. Para eventos duplicados con el mismo SHA se conserva el primer evento; si un reporte tiene hashes contradictorios se marca el conflicto y solo falla cuando ese reportId se consulta, sin bloquear reportes no relacionados.
- La lectura del índice se omite si no hay reportes propios que necesiten metadata de evento; los videos de aprobación no provocan esa lectura.
- Prueba `FeedbackInboxImageEventBatchRead.mjs`: 5/5 PASS. CI HEAD `7c1e15d837148b2588cd7cef1bb40e39c3d4a841`: **281 suites / 3,264 pruebas / 0 fallos**; build SUCCESS; health read-only SUCCESS. Pages deploy quedó en cola; no se desplegó Apps Script.
- Siguiente: revisar búsquedas repetidas por fila en `handleGetFeedbackItems`, manteniendo canonicalización first-write-wins y detección de duplicados contradictorios.


## Cierre — FEEDBACK Inbox administrativo comparte índice de eventos de imagen (2026-11-21)

- `handleGetFeedbackItems` detecta si la página contiene reportes cuya metadata requiere fallback de imagen y carga `FeedbackReportImageEvents` una sola vez. El mismo índice se pasa a `isCanonicalFeedbackInboxRow_`, `findReportByReportId_` y `mapInboxFeedbackRow_`.
- Se elimina la búsqueda individual del evento de imagen durante la canonicalización y el mapeo de cada reporte. Si la metadata legacy ya contiene imagen, el índice no se carga.
- Los conflictos de hash se almacenan por reportId y solo provocan error cuando se consulta el reporte afectado; no bloquean otros reportes de la página. First-event-wins y comparación de duplicados se conservan.
- Prueba `FeedbackInboxImageEventBatchRead.mjs`: 6/6 PASS. CI HEAD `d0a79b3e2bf92ff4d7d7571b758332dddecce2e4`: **281 suites / 3,265 pruebas / 0 fallos**; build SUCCESS; health read-only SUCCESS. Pages deploy quedó en espera; no se desplegó Apps Script.
- Siguiente: reducir búsquedas repetidas de canonicalización de sugerencias/reportes en `handleGetFeedbackItems` sin alterar first-write-wins ni errores de conflicto.


## Cierre — FEEDBACK Inbox memoiza canonicalización por página (2026-11-21)

- `isCanonicalFeedbackInboxRow_` acepta un `Map` local a la página. Cachea el resultado de `findCutSuggestionByOperation_`, `findCutSuggestionByRequest_` y `findReportByReportId_` por sus claves lógicas; las filas duplicadas de la misma operación/reporte reutilizan el mismo resultado y conservan el primer rowNumber.
- La caché no persiste entre requests. Los conflictos siguen siendo errores en la primera búsqueda; los resultados null también se cachean para evitar repetir búsquedas sin match.
- Se conserva el índice de eventos de imagen compartido en canonicalización y mapeo; first-write-wins, comparación de duplicados y alcance de conflictos permanecen intactos.
- Prueba `FeedbackInboxImageEventBatchRead.mjs`: 7/7 PASS. CI HEAD `fbf112ba83dfa4a737ff12101a15d1119874a794`: **281 suites / 3,266 pruebas / 0 fallos**; build SUCCESS; health read-only SUCCESS. GitHub Pages deploy seguía en ejecución; no se desplegó Apps Script.
- Siguiente: auditoría integral de ADMIN (Drive/Spreadsheet, respaldos/restauración, imágenes, idempotencia y read-back).


## Cierre — ADMIN: superficie de telemetría global (2026-11-21)

- `getServiceTraffic` se invoca desde `loadGlobalServiceTraffic_` dentro del panel de desarrollador; la consulta tiene guard de `isAdminPanelCurrent_`, refresco manual y actualización automática solo si el panel y el gráfico siguen visibles. El intervalo verifica cada 15 s, pero la consulta real respeta mínimo de 60 s.
- `runServicesHealthScan` carga el agregado tras un escaneo iniciado desde el botón de salud del panel. El backend exige contexto Desarrollador, lee el agregado de Coordinator y la acción no se clasifica como mutación; la política declara solo lectura de `SERVICE_TRAFFIC`.
- No hay referencias a `getServiceTraffic`, `getReplacedImages`, `getDriveStorage`, `getCortesImageFolders` ni `auditDriveImagesInCortes` en `JS/Frontend/main.js`; las llamadas revisadas viven en `JS/Frontend/ui.js` dentro del panel ADMIN.
- `AdminTrafficSurfaceContract.mjs`: 12/12 PASS. CI HEAD `b5d71059b3007bb3a89667fc0d8ff73dd11e0258`: **282 suites / 3,278 pruebas / 0 fallos**; build SUCCESS; health read-only SUCCESS. Pages deploy en cola; no se desplegó Apps Script.
- El código ADMIN también se revisó estáticamente para backup/restore: DB usa manifiesto/fingerprint y staging/rollback; Drive usa manifiesto por lotes, staging, verificación antes del intercambio y carpeta de rollback. No se modificó ese flujo por su carácter destructivo.
- Siguiente: completar auditoría ADMIN de respaldos/restauración, escáneres, upload/recovery e imágenes; optimizar solo donde pruebas de idempotencia y rollback puedan conservarse.


## Cierre — ADMIN respaldos, restauración, escáneres y uploads (2026-11-21)

- Revisión de backup DB: valida manifiesto/fingerprint del origen y de la copia, confirma estado complete, privacidad y read-back del manifiesto; las copias incompletas se marcan y retiran.
- Revisión de backup Drive: manifiesto verificable, estado copying reanudable, índices de lotes y verificación final antes de marcar complete.
- Revisión de restore DB: valida manifiesto del backup, crea rollback recuperable, copia hojas a staging, compara fingerprints y hace swap; los fallos limpian staging o preservan el backup de recuperación.
- Revisión de restore Drive: copia a staging, compara manifiestos, mueve estado original a carpeta rollback y verifica el contenido restaurado; conserva rutas de recuperación ante fallos.
- Escáneres/normalización: una lectura completa de Cortes por operación; las escrituras por fila y operaciones Drive son parte del procesamiento, no lecturas duplicadas demostradas. `getReplacedImages` conserva una sola lectura del inventario y proyección interna CATALOG.
- Upload ADMIN: compare-and-set con expectedCurrentValue/sourceEventId, append de evento linked o requires_review y read-back de metadata Drive; status consulta CATALOG solo si encuentra eventos de la operación.
- No se encontró una lectura redundante segura que justificara modificar operaciones destructivas. Se conserva el contrato de rollback y no se tocó Drive/Spreadsheet productivo.
- `AdminOperationReadInventory.mjs`: 8/8 PASS. CI HEAD `9ef42ae5b69a35ec25a659290c961a53127f27b1`: **283 suites / 3,286 pruebas / 0 fallos**; build SUCCESS; health read-only SUCCESS. GitHub Pages deploy en ejecución; no se desplegó Apps Script.
- Siguiente: auditoría CATALOG/Coordinator de deltas, cursores, snapshots, resets e invalidaciones.


## Cierre — CATALOG/Coordinator: feed, cursores y refresh post-edición (2026-11-21)

- Coordinator publica revisiones monotónicas, eventos upsert/delete/reset, batches de hasta 50, idempotencia por requestId, recuperación de lotes parciales mediante reset, límite de 100 eventos y control de sourceVersion para WRITE/Cortes, FEEDBACK/Cortes-PyS-Tutorial y ADMIN/Cortes. Publicadores legacy sin versión fuerzan reset; snapshots grandes también fuerzan reset.
- El feed valida cursor y límite, detecta cursor futuro/vencido, huecos, eventos ausentes/corruptos y devuelve resetRequired. El cliente público usa GET con retry y abort; el módulo offline valida snapshots completos, aplica deltas por ID estable, recalcula categoryCounts, ignora PyS para el snapshot principal y persiste snapshot+cursor en una sola transacción IndexedDB.
- No hay consumidor de getCatalogChanges integrado en ui.js ni en main.js; los helpers de API/IndexedDB están disponibles pero no conectados al ciclo de carga principal. exitModalEditMode todavía usa getCatalogData completo después de guardar y antes/después de descartar para comparar y verificar restauración.
- Decisión: **mantener el refresh completo**. Sustituirlo por un delta ahora no puede demostrar un cursor consistente con el snapshot ni cubrir cambios concurrentes, resets legacy, eventos vencidos y colecciones sin ID estable. El descarte verificado necesita además una lectura posterior del estado restaurado.
- Tests existentes: CatalogChangeFeed 35/35, CatalogFeedRetry 9/9 y CatalogSnapshotSync 29/29 PASS. CI HEAD 9ef42ae5b69a35ec25a659290c961a53127f27b1: **283 suites / 3,286 pruebas / 0 fallos**; build SUCCESS; health read-only SUCCESS.
- Siguiente: integrar el feed incremental en UI con cursor-before-snapshot, deltas ordenados, persistencia atómica snapshot+cursor y fallback completo en cualquier reset/hueco; validar concurrencia antes de sustituir refreshes completos.


## Corrección de auditoría P1.9 y cierre — feed incremental en edición (2026-11-21)

- Corrección: la anotación previa que afirmaba que no existía consumidor de `getCatalogChanges` era incorrecta. El consumidor sí está integrado en `JS/Frontend/auth.js`, dentro de `loadInitialData`: lee snapshot+cursor de IndexedDB, consulta `fetchCatalogDelta_`, aplica `applyCatalogChangesToSnapshot`, trata reset/huecos como snapshot completo y persiste snapshot+cursor con `saveCatalogWithCursor`. El polling y la sincronización entre pestañas también están conectados.
- La ausencia de llamadas en `ui.js`/ `main.js` se debía a que el consumidor vive en `auth.js`; `main.js` expone ese módulo mediante `window.auth`.
- Se modificó `exitModalEditMode`: al guardar/cerrar, usa `window.auth.loadInitialData(true, {silent:true})`; si el delta no confirma una actualización, obtiene snapshot completo de respaldo. Se agregaron guardas para no aplicar una respuesta tardía si otra sincronización actualizó el estado mientras el fallback estaba en curso.
- El descarte verificado conserva sus dos lecturas completas: una para calcular los campos que deben restaurarse y otra para confirmar por read-back que quedaron restaurados. No se reemplazó esa ruta con un delta dirigido.
- Fallback completo no adelanta ni empareja un cursor distinto; actualiza estado en memoria y deja que el siguiente poll reprocese desde el cursor persistido o active reset si venció.
- Prueba nueva `CatalogEditDeltaRefresh.mjs`: 23/23 PASS. CI HEAD `ea1c3ca196105b20115f9c56c27bdf6e4e6df2e5`: **284 suites / 3,309 pruebas / 0 fallos**; build SUCCESS; health read-only SUCCESS.
- Siguiente: Beta aislada para concurrencia entre pestañas, pérdida de feed y reset; continuar P1 de imágenes/vídeos/archivos.


## Checkpoint P0 AUTH — lecturas de sesión y revocaciones cerradas (2026-11-21)

- Código: `JS/Services/Auth.js`; test: `JS/Tests/AuthSessionReadOptimization.mjs`, registrado en `JS/Tests/RunServiceTests.mjs`.
- Login ahora reutiliza un snapshot de ActiveSessions para resolver token, puntero y límite; la lectura integral extra queda solo para reconciliar append ambiguo o errores parciales. Confirmación normal por fila dirigida.
- Recuperación de contraseña conserva preflight fuera de ScriptLock y verifica bajo lock la fila objetivo. Reconciliación de rol recibe el índice ya conocido y valida ID/estado sin volver a escanear Users.
- DeleteUser reutiliza el snapshot para tokenCounts y revocación; verifica residuos por columna ID. Reset/cambio de contraseña y otras revocaciones invalidan contextos remotos una vez, antes de limpiar tokens.
- CI confirmado en HEAD `3ae0786b0158d7e45f2599bc1a6ab28550b84ac8`: **284 suites / 3,309 pruebas / 0 fallos**; build SUCCESS; health SUCCESS; deploy workflow SUCCESS. Test específico `AuthSessionReadOptimization`: 9/9 PASS.
- Este checkpoint es de código y CI; no acredita validación Beta real. No se modificó la rama base ni se realizaron operaciones manuales sobre Spreadsheet/Drive/ScriptProperties productivos.
- Siguiente tarea inmediata: optimizar lecturas/operaciones duplicadas en `JS/Services/users.js`, empezando por getUsers/createUser/updateUser y comprobando la relación con Auth/deleteUser. Luego actualizar pruebas, ejecutar regresión, y crear checkpoint+commit antes de pasar a WRITE/FEEDBACK/ADMIN.


## Checkpoint P0 USERS — lecturas de cuenta optimizadas (2026-11-21)

- Código: `JS/Services/users.js`; espejo de pruebas aislado: `JS/Tests/users.js` (ID de Spreadsheet sustituido por placeholder).
- Alta de usuario usa `readUsersMutationSnapshot_` una vez por operación. El mismo snapshot alimenta detección de username duplicado, primera fila libre y generación/validación de ID. Se conserva lectura dirigida de la fila destino, copia de formato/validaciones y escritura atómica ID:H con read-back/rollback.
- `getUsers` limita lectura a A:G. Verificación para updateProfile utiliza TextFinder/columna ID y confirma solo celdas ID, ya que requiere rowIndex, no el resto de la fila.
- Pruebas: `UsersMutationSnapshot` 10/10; `UsersReadMinimization` 8/8; `USERS mutaciones/RBAC/rollback/coordinación` 16/16. CI HEAD `fb80ebfa4a296d23faec032be46650d85ec51ba9`: **287 suites / 3,359 pruebas / 0 fallos**; build SUCCESS; deployed-service-health SUCCESS.
- Se detectó y corrigió durante la regresión una referencia a `lastRow` retirada al introducir el snapshot; la corrección conserva la extensión/copia de formato al agregar una fila nueva. El segundo CI quedó verde.
- Rama base comprobada: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones. No se modificaron Spreadsheet, Drive, ScriptProperties ni deployments Apps Script productivos.
- Siguiente tarea: auditoría de extremo a extremo WRITE/FEEDBACK/ADMIN; comenzar con WRITE (aportes, idempotencia, ledger, VIN, Drive, read-back y publicación CATALOG). Crear checkpoint y commit al cerrar esa auditoría/implementación antes de avanzar a FEEDBACK y ADMIN.


## Checkpoint P1 WRITE — catálogo condicional y ledger reutilizado (2026-11-21)

- Código: `JS/Services/write.js`; pruebas: `JS/Tests/WriteEntityCatalogDemand.mjs`, `WriteContributionLedgerReuse.mjs`, y actualización compatible de `WriteContributionPostAppendSnapshot.mjs`.
- Aportes a vehículos existentes consultan `getExistingEntities` solo si el payload contiene marca/modelo/versiones para normalizar. Payloads con imagen/categoría/año no leen el catálogo completo sin necesidad.
- Aportes cut/opening/feed validan AportesVehiculo antes de preflight y vuelven a validar el esquema después de Drive, inmediatamente antes del append. La hoja validada se pasa al append y se reutiliza para snapshot post-append y cálculo de slot/candidato; no se repiten lecturas de encabezados en helpers.
- Se preservan idempotencia, comprobación de conflicto concurrente por opId, read-back append-only, snapshot post-append para slot/VIN y recuperación de eventos. Otros consumidores siguen validando su propia hoja.
- Tests: WriteEntityCatalogDemand 8/8; WriteContributionLedgerReuse 15/15; WriteContributionPostAppendSnapshot 12/12 PASS. CI HEAD `698bd0518c4223ba6db36e1ce0fbd68492289b5a`: **289 suites / 3,382 pruebas / 0 fallos**; build SUCCESS; deployed-service-health SUCCESS.
- La primera ejecución falló por aserciones estáticas antiguas que no contemplaban el nuevo parámetro opcional; se actualizaron los contratos para verificar el ledger compartido y la revalidación post-Drive. La siguiente regresión pasó completa.
- Siguiente tarea: continuar auditoría WRITE sobre alta nueva, recuperación opId legacy, VIN update, suplementaria legacy y journal de imágenes; después checkpoint/commit y avanzar a FEEDBACK. Validación real de Drive/concurrencia sigue siendo Beta aislada.


## Checkpoint P1 WRITE — validación VIN reutiliza snapshot (2026-11-21)

- `handleAddVinToVehicleLocked` reutiliza la matriz de Cortes que ya leyó para localizar el vehículo y validar su colección VIN; la búsqueda de duplicados globales recibe ese snapshot y no vuelve a transferir la hoja.
- `checkVinDuplicateInSheet` conserva su comportamiento normal cuando no se entrega snapshot; los demás flujos WRITE que no disponen de una matriz completa siguen haciendo su lectura propia.
- Test `WriteVinSnapshotReuse`: 8/8 PASS. CI HEAD `ad0db3ea9676e4aa56caf3e8a157f633087dcb8f`: **290 suites / 3,390 pruebas / 0 fallos**; build SUCCESS; deployed-service-health SUCCESS.
- Siguiente: completar WRITE restante (alta nueva, recuperación legacy, suplementaria legacy, journal de imágenes y publicación CATALOG); al cerrar, checkpoint/commit y continuar FEEDBACK.


## Checkpoint P1 WRITE — auditoría estática y contratos cerrados (2026-11-21)

- Se completó el recorrido de alta nueva, recuperación opId moderno/legacy, VIN, suplementaria moderna/legacy, journal de imágenes y publicación CATALOG.
- Alta nueva mantiene reserva append-only, pending antes de Drive, trabajo Drive fuera del lock, readquiere fail-fast, escritura por lotes, read-back y completed tras confirmar. Recuperación moderna verifica opId/vehicleId/slot/hash; legacy usa TextFinder y rechaza ambigüedad.
- VIN dedicado reutiliza snapshot para duplicados globales. Aportes suplementarios modernos usan opId/operationKey y ledger append-only; legacy revalida la fila tras Drive y persiste solo columnas cambiadas con read-back. ImageUploadEvents mantiene hash/token/estados/reconciliación. CATALOG publica sourceVersion fuera del lock físico.
- Se mantiene intacto el rollback, read-back, verificación de identidad, idempotencia, recuperación de fallos y estados requires_review; no se eliminan escaneos Drive ni eventos históricos.
- Contratos revisados y ejecutados: WritePhysicalTransactionContract 7/7; WriteOpIdLegacyLookup 9/9; WriteCatalogPublicationIsolation 7/7; ImageUploadEventJournal 9/9; SupplementaryImageOperationIdContract 8/8; WriteContributionAppendConcurrency 9/9; WriteContributionRecovery 9/9; WriteIdempotencySnapshotReuse 9/9; además optimizaciones P1 anteriores.
- CI HEAD `4fad6a812598beb0bb04212cac4a3bc3136c9dd5`: **291 suites / 3,397 pruebas / 0 fallos**; build SUCCESS; deployed-service-health SUCCESS.
- WRITE queda cerrado en código/auditoría estática/contratos. La prueba real de Drive, concurrencia interproyecto y pérdida de respuesta queda para Beta aislada, nunca producción.
- Siguiente: auditoría end-to-end FEEDBACK: sugerencias año, likes, reportes e imágenes, Inbox, vistas/actividad, PyS/tutoriales y publicaciones CATALOG.


## Checkpoint P1 FEEDBACK — read-back dirigido de aplicación de año (2026-11-22)

- Código: `JS/Services/feedback.js`; prueba: `JS/Tests/FeedbackYearApplicationReadbackBounded.mjs`; registro: `JS/Tests/RunServiceTests.mjs`.
- Tras anexar `applicationValues` en `FeedbackYearApplications`, el flujo ya no descarga el ledger completo para confirmar la fila. Busca el `operationId` exacto en columna A con TextFinder y lee solo las filas coincidentes (16 columnas).
- Se conservan las garantías de integridad: coincidencia única, estado `pending`, error ante duplicados/falta de read-back y no continuar la aplicación si la confirmación falla.
- Test nuevo incluido en regresión. CI HEAD `c96210f3bd2f77ff3e6e9ea1486719894ba13383`: **292 suites / 3,405 pruebas aprobadas / 0 fallos**; build SUCCESS; deployed-service-health SUCCESS; job deploy SUCCESS.
- El job deploy corresponde al workflow automático de GitHub; no se ejecutó un despliegue manual de Apps Script ni se modificaron endpoints, Spreadsheet, Drive, secretos o propiedades productivas.
- Rama base `GPSpedia2.2.5` sigue en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no se modificó.
- Alcance: subtask de FEEDBACK cerrada en código y CI. La auditoría integral FEEDBACK sigue abierta.
- Siguiente: continuar FEEDBACK revisando `appendFeedbackYearVehicleUpdateEvent_` y la recuperación/publicación de aplicaciones de año; después cerrar likes, reportes/imágenes, Inbox, vistas/actividad, PyS/tutoriales y publicaciones CATALOG antes de pasar a ADMIN. Validación de Drive/concurrencia real queda reservada a Beta aislada.


## Checkpoint P1 FEEDBACK — eventos de ampliación con lecturas dirigidas (2026-11-22)

- Código: `JS/Services/feedback.js`; test actualizado: `JS/Tests/FeedbackYearApplicationAppendOnly.mjs` (ya registrado en `RunServiceTests.mjs`).
- `appendFeedbackYearVehicleUpdateEvent_`: preflight de idempotencia localiza el `opId` exacto en columna B de `AportesVehiculo` con TextFinder y lee únicamente filas coincidentes de 11 columnas. Mantiene validación canónica de hash, vehicleId, kind, payload, actor y supersedesEventId.
- Después de append, localiza el `eventId` exacto en columna A y lee únicamente filas coincidentes; exige exactamente una fila y valida sus campos antes de confirmar. El mock de hoja prueba inserción, replay idempotente, no duplicación y lectura dirigida.
- CI HEAD `7be696dbc0903b9019034850c66d6e910246435a`: **292 suites / 3,406 pruebas aprobadas / 0 fallos**; build SUCCESS; deployed-service-health SUCCESS. El job deploy automático estaba in_progress al momento de esta captura.
- No se modificó Spreadsheet/Drive productivo, secretos, propiedades ni deployments Apps Script. Concurrencia real y recuperación de respuesta perdida quedan para Beta aislada.
- Rama base `GPSpedia2.2.5` no modificada.
- Siguiente: continuar auditoría FEEDBACK con likes, reportes/imágenes e Inbox; después vistas/actividad, PyS/tutoriales y publicaciones CATALOG. Cerrar cada subtask con pruebas, actualización de tareas/auditoría y checkpoint antes de continuar.


## Checkpoint P1 FEEDBACK — reutilización de snapshot en likes (2026-11-22)

- Código: `JS/Services/feedback.js`; test de regresión actualizado: `JS/Tests/FeedbackLikeCompletedReplayPreflight.mjs`.
- `handleRecordLike` ahora reutiliza `replaySnapshot.ledger` cuando el preflight ya verificó encabezados y consultó las filas del actor. `ensureFeedbackLikesSheet_` queda como fallback para preflight sin snapshot, preservando creación/validación del ledger cuando hace falta.
- Se conserva la secuencia de replay completado/evento/pendiente, consulta de respaldo de filas, append-only y ausencia de lock global.
- Test específico: FeedbackLikeCompletedReplayPreflight **7/7 PASS**. CI HEAD `8f448e1bb651bfcd0e3577954bdf94d6ad6dc456`: **292 suites / 3,406 pruebas / 0 fallos**; build SUCCESS; deployed-service-health SUCCESS. Job deploy automático en curso al momento de checkpoint.
- No se modificaron datos productivos, endpoints, secretos, propiedades ni deployments Apps Script. La rama base `GPSpedia2.2.5` permanece intacta.
- Siguiente: revisar rutas FEEDBACK de reportes/imágenes e Inbox; luego vistas/actividad, PyS/tutoriales y publicación CATALOG. Cada subtask debe cerrar con pruebas y checkpoint antes de avanzar.


## Checkpoint P1 FEEDBACK/Inbox — deduplicación dirigida de auditoría (2026-11-22)

- Código: `JS/Services/InboxConversations.js`; prueba: `JS/Tests/InboxConversations.mjs`.
- `inboxAppendAudit_` busca `messageId` exacto en columna G con TextFinder y lee solo filas coincidentes; comprueba actor, acción y messageId. Si messageId no existe, no consulta el historial. La escritura de auditoría conserva append + read-back.
- Se amplió FakeSheet con TextFinder y se añadió prueba de reintento deduplicado, ubicación en columna G y ausencia de búsqueda para eventos sin messageId.
- InboxConversations: **67/67 PASS**. CI HEAD `75bf48cb4efd89d81e126e6d518aa82f712c7512`: **292 suites / 3,407 pruebas aprobadas / 0 fallos**; build SUCCESS; deployed-service-health SUCCESS. Job deploy automático estaba waiting/in_progress al momento del checkpoint.
- Rama base `GPSpedia2.2.5` sin cambios; no se tocaron hojas productivas ni deployments Apps Script.
- Siguiente: continuar auditoría FEEDBACK de reportes/imágenes; luego vistas/actividad, PyS/tutoriales y publicación CATALOG. Cada subtask se valida y registra antes de pasar a la siguiente.


## Checkpoint P1 FEEDBACK — confirmación de evento de imagen por reportId (2026-11-22)

- Código: `JS/Services/feedback.js`; prueba: `JS/Tests/FeedbackReportImageEvents.mjs`.
- `appendFeedbackReportImageEvent_` ya no busca primero el eventId en columna A y luego vuelve a buscar reportId en columna B. Después del append, la búsqueda por reportId sirve como read-back único y confirma evento/metadata, detecta duplicados equivalentes y rechaza hashes contradictorios.
- Se conservan la idempotencia por hash, first-write-wins, la asociación de archivos y la limpieza/reconciliación de adjuntos.
- FeedbackReportImageEvents: **3/3 PASS**. CI HEAD `2f850442c3e31685b045938924a749cf08915798`: **292 suites / 3,407 pruebas aprobadas / 0 fallos**; build SUCCESS; deployed-service-health SUCCESS. Job deploy automático in_progress al momento del checkpoint.
- No se modificaron registros ni archivos productivos; rama base intacta.
- Siguiente: continuar auditoría de reportes/Inbox y actividad; luego PyS/tutoriales y publicación CATALOG. Validación real de Drive queda reservada a Beta aislada.


## Checkpoint P1 FEEDBACK/Inbox — estado y preferencias con lectura dirigida (2026-11-22)

- Código: `JS/Services/InboxConversations.js`; prueba: `JS/Tests/InboxConversations.mjs`.
- `inboxFindState_` y `inboxFindFlag_` usan TextFinder exacto sobre conversationId en columna A y leen únicamente filas candidatas para verificar userId; mantienen error por duplicados.
- Pruebas añadidas: lectura dirigida de estado/preferencias y rechazo de duplicados. Se aisló la fixture con limpieza `finally` después de que la primera ejecución revelara que los datos sintéticos afectaban pruebas posteriores.
- Suite InboxConversations **69/69 PASS**. CI HEAD `893b29c48926e16997cfaff03a6617cd475ddb35`: **292 suites / 3,409 pruebas aprobadas / 0 fallos**; build SUCCESS; deployed-service-health SUCCESS. Job deploy automático en curso al momento del checkpoint.
- No se tocaron datos productivos, endpoints, secretos, propiedades ni deployments Apps Script; rama base intacta.
- Siguiente: continuar FEEDBACK con actividad/vistas y PyS/tutoriales; revisar después publicación CATALOG y cerrar la auditoría integral antes de ADMIN.


## Checkpoint P1 FEEDBACK — snapshot compartido del panel de actividad (2026-11-22)

- Código: `JS/Services/feedback.js`; pruebas actualizadas: `ActivityDashboardContributions.mjs`, `ActivityDashboardInsights.mjs`, `ActivityLogsBoundedRead.js`, `InboxAuditTrail.js`.
- Se añadió `readActivityDashboardCutsSnapshot_`: obtiene una sola vez A:D de Cortes y tres rangos contiguos tipo→colaborador. Estos rangos incluyen también `utilCorteN`.
- `handleGetActivityLogs` pasa la misma instantánea a `buildCutContributionSummary_` y `buildActivityDashboardInsights_`. Elimina las lecturas repetidas de IDs y tipos/contadores entre ambos agregados.
- Conteo estático anterior: 11 rangos de Cortes (4 contribuciones + 7 insights). Nuevo: 4 rangos compartidos. Reducción: **7 lecturas de rango por petición**; no se leen filas completas ni columnas ajenas al dashboard.
- Pruebas: ActivityDashboardContributions PASS; GP-DASH-INSIGHTS-01 PASS; ActivityLogsBoundedRead/AUG-120 **7/7 PASS**. CI HEAD `eba4b299572fd7cc4afae8b15d009498e04feb5e`: **292 suites / 3,409 pruebas aprobadas / 0 fallos**; build SUCCESS; deployed-service-health SUCCESS; report-build-status SUCCESS; deploy SUCCESS.
- Durante la integración se actualizaron los harnesses que extraen `handleGetActivityLogs` para incluir el snapshot compartido y sus constantes; la regresión final quedó verde.
- Rama base `GPSpedia2.2.5` comprobada en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones. No se tocaron datos productivos ni deployments Apps Script.
- Siguiente: auditar lecturas y eventos de PyS, tutoriales y publicación CATALOG; luego cerrar FEEDBACK integral antes de iniciar ADMIN.


## Checkpoint P1 PyS — confirmación dirigida de PysOperations (2026-11-22)

- Código: `JS/Services/feedback.js`; prueba: `JS/Tests/PysCreationIntegrity.js`.
- `writePysOperation_` reemplaza el read-back integral del ledger por TextFinder exacto en columna A (`opId`) y lectura de filas candidatas de 8 columnas. Mantiene fallback a búsqueda en la columna ID cuando TextFinder no existe.
- Se mantienen validaciones de hash, problemId, imageFileId, unicidad de reserva y error cuando el append no puede confirmarse.
- PysCreationIntegrity: **57/57 PASS**. CI HEAD `b1f04432b394c6cbe3b02578b2bbc2c75b38dcb9`: **292 suites / 3,410 pruebas aprobadas / 0 fallos**; build SUCCESS; deployed-service-health SUCCESS. Job deploy automático waiting/in_progress al checkpoint.
- Rama base `GPSpedia2.2.5` no modificada. No se escribieron hojas productivas ni Drive.
- Siguiente: revisar el doble read de `getPysSheet_` + `handleGetPysData` y luego los ledgers append-only de tutoriales; después cerrar la publicación CATALOG.


## Checkpoint P1 PyS — lectura de catálogo desde snapshot validado (2026-11-22)

- Código: `JS/Services/feedback.js`; prueba: `JS/Tests/PysCreationIntegrity.js`.
- `validatePysRecords_` devuelve las mismas filas que leyó para validar esquema lógico, formato de ID y duplicados.
- `getPysSheet_` admite `includeSnapshot=true` sin cambiar el retorno predeterminado de hoja para los demás consumidores. `handleGetPysData` reutiliza `snapshot.rows` y elimina la lectura repetida de los 10 campos.
- PysCreationIntegrity: **58/58 PASS**. CI HEAD `b7dcd3bf3c80f128b09777254682c6bddd6fba46`: **292 suites / 3,411 pruebas aprobadas / 0 fallos**; build SUCCESS; deployed-service-health SUCCESS; deploy automático waiting al checkpoint.
- No se modificaron datos productivos ni Drive; rama base sin cambios.
- Siguiente: auditar los ledgers de TutorialTitleEvents, TutorialEditEvents y TutorialRenameEvents para evitar lecturas repetidas, y después completar CATALOG.


## Checkpoint P1 Tutoriales — proyección compartida de eventos de renombrado (2026-11-22)

- Código: `JS/Services/feedback.js`; pruebas: `FeedbackTutorialLookupBoundedRead.mjs`, `FeedbackTutorialUpdateTitleLookupBoundedRead.mjs`, `FeedbackTutorialPreflightOutsideLock.mjs`.
- `projectTutorialTitle_(id, title, renameEventsSnapshot)` reutiliza un snapshot opcional. `tutorialTitleExists_` y la búsqueda por título de `findTutorialRow_` leen TutorialRenameEvents una vez y comparten el arreglo con todas las filas candidatas.
- El camino sin ledger utiliza `[]` para no repetir getSheetByName por fila; los consumidores que llaman a projectTutorialTitle_ sin snapshot mantienen su fallback.
- Se conservan reglas de proyección, orden de eventos, first-title ownership y errores por títulos duplicados.
- Pruebas: FeedbackTutorialPreflightOutsideLock **7/7**; FeedbackTutorialLookupBoundedRead **7/7**; FeedbackTutorialUpdateTitleLookupBoundedRead **6/6**. CI HEAD `4a8d2487a4076e67d45f586edd06cd74305add43`: **292 suites / 3,413 pruebas aprobadas / 0 fallos**; build SUCCESS; deployed-service-health SUCCESS; report-build-status SUCCESS; deploy automático in_progress al checkpoint.
- No se modificaron datos productivos ni despliegues manuales Apps Script; rama base sin cambios.
- Siguiente: revisar si `TutorialEditEvents` y `TutorialTitleEvents` se vuelven a leer después de append para validar y proyectar; después terminar publicación CATALOG.
