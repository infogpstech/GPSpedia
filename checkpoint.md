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
