# GPSpedia — Tareas activas

Fecha de actualización: 2026-11-21  
Repositorio: `infogpstech/GPSpedia`  
Rama autorizada: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5`  
Fuente normativa única: `NORMAS_DESAROLLO.md`

## Historial y continuidad

El registro acumulado previo a esta rotación se conserva íntegro en:
- `Tareas_Activas_Archive/Tareas_Activas_2026-11-20_pre-rotacion.md`
- Manifiesto y verificación: `Tareas_Activas_Archive/manifest.md`

La copia archivada fue verificada carácter por carácter contra el original. Este archivo es el registro operativo vigente; las tareas históricas y decisiones anteriores no se eliminan.

## Cierre local — reemplazo de imágenes ADMIN (2026-11-20)

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- [x] Migrar `uploadAdminImage` al journal append-only `ImageUploadEvents` y a eventos `vehicle_update` en `AportesVehiculo`.
- [x] Eliminar del handler activo el `ScriptLock`, el ledger mutable `AdminImageUploads` y la escritura directa en `Cortes`.
- [x] Capturar `expectedCurrentValue` y `expectedSourceEventId`; conservar la URL previa lógica desde la proyección versionada, sin compararla con una fila materializada potencialmente desactualizada.
- [x] Reutilizar cargas por `operationKey`, verificar MIME/hash/tamaño/carpeta/metadata Drive y anexar `linked` después del evento de vehículo.
- [x] Mantener historial idempotente de imágenes sustituidas y conservar fallos parciales/archivos no vinculados para revisión.
- [x] Recuperar el estado de imagen desde la proyección vigente de CATALOG y actualizar la versión fuente local de la UI.
- [x] Corregir contratos obsoletos de unicidad y bloqueo; no debilitar las comprobaciones funcionales.
- [x] CI HEAD `9425527a3fb93ddc9256537ff534cea3872e2d7c`: 237 suites, 2,942 pruebas aprobadas, 0 fallos; `node --check` de módulos modificados PASS.
- [x] Health read-only SUCCESS; GitHub Pages SUCCESS.
- [ ] Beta AUG-160: concurrencia real, pérdida de respuesta, file_missing, metadatos alterados, varios fileId por token y fallos parciales Drive/Sheets/journal en recursos aislados.
- [ ] Beta AUG-159: aportes concurrentes, resolución de candidatos, correcciones encadenadas y recuperación ADMIN en Spreadsheet/Drive aislados.
- No se desplegó Apps Script ni se modificaron Spreadsheet/Drive productivos.

## P0 — GP-CONCURRENCY-CUT-MULTI-ENTRY-01

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.** Todas las migraciones y regresiones locales del alcance están cerradas; permanecen únicamente pruebas reales en entornos aislados.

- [x] Retirar el `UserLock` del fallback de `handleAddOrUpdateCut`. Los vehículos existentes usan append-only y requieren opId; si falta, se devuelve `WRITE_OP_ID_REQUIRED` antes de adquirir un lock. El `ScriptLock` queda solo para asignar el ID numérico de un vehículo nuevo. CI 44829158327: 237 suites/2942 pruebas PASS.
- [x] Confirmar consumidores activos de cortes: modal de detalle y `HTML/add_cortes.html` envían/reutilizan opId estable.
- [x] Corregir el lector CATALOG de `AportesVehiculo`: aceptar `vehicle_update` con actor y opId `OP-ADMIN-`, o con opId `OP-YEAR-` exclusivamente si el actor es `SYSTEM:FEEDBACK_YEAR`; antes el proyector ya entendía el tipo, pero el lector lo rechazaba y podía invalidar la lectura completa. Prueba funcional añadida a `VehicleContributionProjection`; acepta `OP-YEAR-` solo con `SYSTEM:FEEDBACK_YEAR`. CI 44835908125 SUCCESS: 239 suites, 2968 pruebas, 0 fallos.
- [x] Auditar FEEDBACK/reporte/sugerencia: `reportProblem` y `suggestCutChange` persisten en Feedbacks y no escriben directamente Cortes/AportesVehiculo; la sugerencia actual se limita a un corte existente. Los IDs `reportId`/`suggestionOperationId` y la huella mantienen idempotencia. `reportId` ahora usa `crypto.randomUUID()`/`getRandomValues`, sin `Math.random`.
- [x] Corregir fallo de ejecución al repetir voto positivo: `handleSuggestYearLocked` usaba `voteActors` fuera de alcance; ahora comprueba el voto positivo desde `allData`. Regresión añadida a `SuggestYearVoteThreshold.mjs` (7/7 PASS); CI 44834891294 SUCCESS: 238 suites, 2963 pruebas, 0 fallos.
- [x] Migrar `handleSuggestYear`/`completeFeedbackYearApplication_` a eventos `vehicle_update` en `AportesVehiculo`: lectura del rango desde la proyección append-only, versiones esperadas y fuentes, opId estable por campo, append verificado e idempotente, recuperación mediante `FeedbackYearApplications` (extensión de columnas para conservar valores/fuentes originales) y estado `requires_review` si CATALOG no aplica el rango. Se eliminó la escritura directa en `Cortes.anoDesde/anoHasta`; el catálogo se invalida fuera del lock. Se conservan tres votos verificados, exclusión de anónimos y detección de colisión de generaciones. Pruebas `FeedbackYearApplicationAppendOnly` 5/5 y `SuggestYearVoteThreshold` 7/7; valida todo el ledger antes de reconstruir el rango y rechaza opId conflictivos. CI 44835908125 SUCCESS: 239 suites, 2968 pruebas, 0 fallos.
- [x] Retirar el lock global prolongado de `handleSendContactForm`: el asignador `getNextFormulaBasedId_` usa reservas append-only en `__IdentifierSequenceReservations__`; el formulario anexa la fila completa con `appendRow` sin sección crítica global. La secuencia se calcula por orden físico de reservas y conserva prefijo/relleno, detección de duplicados y validación de filas huérfanas. Prueba `FeedbackContactWriteNoGlobalLock` 2/2 y `FeedbackLockFastFail` PASS; CI 44835908125 SUCCESS: 239 suites, 2968 pruebas, 0 fallos.
- [x] Migrar `reportProblem` y `suggestCutChange` a proyección first-write-wins, adjuntos append-only y escritura sin ScriptLock; validado previamente en CI.
- [x] Migrar `handleAddProblem` a reserva completa append-only y first-write-wins sin ScriptLock. `PysOperations` conserva la primera reserva por `opId`; el hash contradictorio se rechaza por solicitud, los archivos perdedores se limpian solo con referencias comprobadas y los fallos ambiguos conservan el recurso para replay. CI `44875140437`: 258 suites, 3094 pruebas, 0 fallos; health y Pages SUCCESS. Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.
- [x] Migrar altas/ediciones de tutoriales con ID estable y filas históricas sin ID a escritura append-only y proyección idempotente sin ScriptLock, preservando unicidad de título, imágenes, autoría y compatibilidad de reintentos.
- [x] Migrar aprobaciones de vídeo a eventos append-only/proyección idempotente sin ScriptLock, preservando unicidad de operación/destino y transiciones pending/approved/rejected. CI 44904401718 SUCCESS: 258 suites, 3,108 pruebas, 0 fallos.
- No sustituir ScriptLock por UserLock. Auditoría separada de mutaciones PyS completada: solución, prevención y relaciones ahora usan leases compartidas FEEDBACK de Coordinator; conservan validación/read-back e idempotencia, sin ScriptLock local. Concurrencia real multi-proyecto queda diferida a Beta.
- [x] Retirar el ScriptLock interno de `getNextFormulaBasedId_`: las reservas append-only usan `appendRow` atómico y fórmula de secuencia por hoja/columna; los reintentos/operaciones concurrentes reservan sufijos distintos y los huecos por respuesta perdida no se reutilizan. `FeedbackFormulaIdAllocator` 5/5 y `FeedbackFormulaIdAllocatorBoundedRead` 6/6 PASS. CI `44847431570` SUCCESS: 253 suites, 3053 pruebas, 0 fallos. Health read-only `44847431590` SUCCESS. La fórmula/appendRow real queda diferida a Beta aislada.
- [x] Migrar `handleRecordLike` completamente a eventos append-only sin ScriptLock: likes nuevos se anexan; replays legacy `completed` se reconocen; los `pending` históricos se recuperan comparando el contador con `previous`/`target` y anexando un evento cuando falta el incremento. No se modifica `Cortes.utilCorteN`; CATALOG suma actores únicos por vehículo/corte en lecturas completas y snapshots. `recordLike` publica reset sin lock de versión. `FeedbackLikeAppendOnly` 4/4, `FeedbackLikeCompletedReplayPreflight` 6/6, `FeedbackLikeActivityOutsideLock` 5/5, `FeedbackLikePreflightOutsideLock` 5/5; `CatalogChangeFeed` 35/35.
- [x] Hacer atómico el registro de actividad: `logUserActivity` usa `appendRow` con la fórmula de ID de la fila, sin `getLastRow` seguido de escrituras separadas ni ScriptLock. `ActivityLogAppendAtomic` 6/6 PASS.
- [x] Añadir conversión explícita desde Inbox: crear un corte para el vehículo del reporte (precargando la sugerencia si existe) o abrir el alta de vehículo nuevo desde el reporte. Ambas rutas reutilizan WRITE/add_cortes, generan `OP-FEEDBACK-{itemId}` estable y marcan el reporte resuelto solo después de confirmar el aporte; si queda candidato, el reporte permanece pendiente. Pruebas InboxUi 87/87 y AddCortesDiagnostics 12/12; CI 237 suites/2943 PASS.
- [x] Auditar la necesidad del ScriptLock fast-fail restante de FEEDBACK bajo §15. `reportProblem`/`suggestCutChange` protegen deduplicación por ID y append; `recordLike` protege el contador read-modify-write y unicidad actor/corte; PyS protege first-write-wins y asociaciones; tutoriales/video protegen unicidad de título y transiciones. No hay reemplazo drop-in seguro: mantener cada lock hasta implantar journal append-only/proyección o control de versión y sus regresiones. No sustituir por UserLock, que no coordina usuarios distintos.
- [x] Mostrar en ADMIN la vista previa y enlace seguro de las imágenes adjuntas a candidatos de corte/apertura/alimentación y a campos de imagen de `vehicle_update`; validar estrictamente URL canónica Drive y abrir con `noopener noreferrer`. Prueba `AdminVehicleContributionCandidateImagePreview` 8/8.
- [x] Conservar imágenes candidatas en `Imagenes_Reemplazadas`: `tipo_registro=candidata_aporte`, `origen_registro=aporte_vehiculo`, `tipo_contenido=aporte_candidato`, `estado=requiere_revision`. El inventario sincroniza candidatos actuales desde CATALOG y resoluciones desde AportesVehiculo; al aceptar/corregir/descartar actualiza a `en_uso`/`cancelada`. No permite marcar en uso ni eliminar mientras está pendiente o referenciada; un candidato descartado solo admite descarga/papelera si el escáner confirma cero referencias. Metadatos Drive se leen fuera del lock; escritura idempotente bajo el lock de esquema. Pruebas AdminReplacedImagesIntegrity 56/56, ReplacedImagesLibraryUX 14/14; CI 237 suites/2943 PASS.
- [x] Completar señalización UI de conflictos tardíos en el finalizador común de aportes desde modal de detalle y `HTML/add_cortes.html`: prevalece `candidateReviewPending` devuelto por WRITE aunque el refresco CATALOG no muestre todavía el candidato; si falla el refresco, se conserva el estado y no se anuncia como aplicado. `VehicleExpansionDetailRefresh` amplía cobertura.
- [x] Completar regresión local de concurrencia/idempotencia: vehículos distintos intercalados, mismo vehículo y slots, mismo opId idéntico/conflictivo, capacidad llena, VIN concurrente, respuesta perdida tras flush/appendRow y recuperación. `WriteContributionAppendConcurrency` 9/9; `WriteContributionRecovery` 9/9; `VehicleContributionProjection` incluye conflictos/candidatos y actualizaciones versionadas. CI 44835908125 SUCCESS: 239 suites, 2968 pruebas, 0 fallos. [ ] Concurrencia real de `appendRow` en Beta aislada.
- [x] Revisar alcance/consumidores de la reserva de ID de vehículo nuevo: `getNextCortesVehicleIdLocked` solo se invoca en WRITE bajo ScriptLock (alta nueva y `allocateVehicleId`); ADMIN solicita el ID a WRITE y transmite opId/operationHash cuando no es legacy. `CortesIdReservations` conserva reserva persistente, reintentos devuelven el mismo ID y huellas distintas se rechazan. Pruebas `WriteVehicleIdAllocationIdempotency`, `WriteVehicleIdAllocatorBoundedRead`, `VehicleIdAllocationEndToEnd`, `AdminVehicleIdAllocationIdempotency` y `AdminVehicleIdOutsideLock` incluidas en CI 44835751507 SUCCESS (239 suites/2968). Se conserva el lock breve de unicidad; no se reemplaza por IDs aleatorios ni se permite asignación fuera de él.

**Validación Beta diferida:** AUG-159, AUG-160 y pruebas de concurrencia real de `appendRow` con proyectos Apps Script, Spreadsheet y Drive aislados. No usar producción.

## P1 — GP-UX-RECENT-VIEWED-CACHE-PARALLEL-01

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- [x] Verificado: `handleLoginSuccess` inicia `loadUserLocalActivity(user)` antes de `showApp(user)`; las lecturas IndexedDB de búsqueda y vistos se inician de forma independiente, sin `await` ni `Promise.all` que bloquee la aplicación.
- [x] `loadViewedItems` hidrata el carrusel por ownerId, no espera al historial de búsqueda, reintenta solo la lectura local no disponible y valida sesión/propietario antes de aplicar una respuesta tardía.
- [x] El cambio de `viewedItems` actualiza solo `renderRecentlyViewedCarousel()`; no reconstruye categorías ni dispara lecturas remotas. Apertura de ficha actualiza estado en memoria y persiste una sola vez en IndexedDB.
- [x] Pruebas dinámicas `RecentlyViewedHydrationParallel` 3/3: lecturas paralelas, IndexedDB temporalmente no disponible, cambio de propietario y ausencia de consultas duplicadas. `RecentlyViewedCarousel` contract 1/1.
- [x] CI 44833576889 SUCCESS: 237 suites, 2954 pruebas aprobadas, 0 fallos; `node --check` PASS.
- [ ] Beta visual en navegadores/dispositivos reales y verificación de comportamiento con IndexedDB real lento/offline.

## Validaciones Beta pendientes

La matriz íntegra y el orden obligatorio están en `lista_beta.txt` y sus segmentos. Incluye, entre otras:

- AUG-159 — aportes vehiculares y resolución ADMIN append-only.
- AUG-160 — cargas ADMIN e ImageUploadEvents.
- AUG-037 — integridad, recuperación y fallos parciales del flujo de imágenes.
- Validación de concurrencia real Apps Script/Spreadsheet/Drive, pérdida de respuesta y recuperación.
- Safe Apply: preview real, ACL, manifiesto y rollback; la aplicación de movimientos/renombrados/borrados sigue bloqueada.
- UI/PWA y aceptación visual en navegadores/dispositivos reales.

Antes de cualquier Beta, cumplir la secuencia de sincronización de ramas, árbol limpio y fast-forward indicada al inicio de `lista_beta_parte1.txt`. Usar únicamente deployments, cuentas, Spreadsheet y Drive aislados; no cambiar endpoints operativos ni tocar datos productivos.

## Reglas operativas

- Trabajar exclusivamente en `GPSpedia2.2.5_work`; no modificar `GPSpedia2.2.5`.
- Leer y cumplir `NORMAS_DESAROLLO.md`; §15 prioriza simplicidad, baja latencia y ausencia de locks/esperas en acciones ordinarias.
- No desplegar Apps Script ni modificar ScriptProperties, secretos, permisos, Spreadsheet o Drive productivos sin autorización expresa.
- Cerrar cada tarea local solo con revisión de diff, pruebas focalizadas, regresión CI y registros actualizados. La validación Beta puede quedar diferida explícitamente.


## Continuidad — corrección de voto repetido FEEDBACK (2026-11-20)

- Código: `1a4b0909d3ec881207f4cb120f668091ced056e2`.
- Prueba: `66da8f2aa102665f8a32a4039e3d63046e580c19`.
- Se corrigió `voteActors` fuera de alcance en `handleSuggestYearLocked`; `SuggestYearVoteThreshold` 7/7 PASS y CI 44835908125 SUCCESS: 239 suites, 2968 pruebas, 0 fallos.
- Siguiente: continuar migración/retirada del ScriptLock FEEDBACK y revisar asignador de IDs bajo §15.

- [x] Optimizar reintentos exactos de `WRITE/addVinToVehicle`: autenticación y preflight de solo lectura detectan únicamente un VIN ya persistido en la misma posición de una versión existente y un ID de vehículo único; responden sin ScriptLock, sin nueva versión y sin invalidar CATALOG. Las mutaciones, versiones nuevas, filas ambiguas y cualquier preflight no concluyente continúan por la ruta original protegida.
- [x] Migrar `WRITE/addVinToVehicle` a un evento compuesto `vehicle_update` (`fieldName=vin_registration`) en `AportesVehiculo`: versión de equipamiento y colección VIN comparten `expectedCurrentValue`, `value`, `operationHash`, `opId` determinista y un mismo `eventId` fuente. CATALOG valida actor/opId `OP-WRITE-VIN-`, detecta colisiones globales y conflictos de estado, y aplica ambas propiedades o ninguna. Se conserva la acción pública y su respuesta compatible; replays exactos siguen siendo de solo lectura. `VehicleContributionProjection` cubre aplicación compuesta, concurrencia del mismo vehículo y colisión entre vehículos; `WriteVinNoopPreflight` 5/5. CI `44846704840` SUCCESS: 253 suites, 3053 pruebas, 0 fallos; Health read-only `44846704778` SUCCESS; Pages `44846704653` SUCCESS. Sin deployment ni cambios en datos productivos.


## Continuidad — auditoría de locks e IDs (2026-11-20)

- Se completó el inventario de consumidores del asignador numérico de vehículos. WRITE concentra todas las reservas; ADMIN preasigna a través de `allocateVehicleId` antes de su lock local. El ledger `CortesIdReservations`, el contador y la lectura de IDs impiden colisiones y recuperan reintentos.
- Se revisó la necesidad de los locks FEEDBACK restantes. Se conservan temporalmente porque protegen invariantes concretas; retirarlos sin journal/proyección o control de versión permitiría duplicados, pérdida de incrementos o sobrescrituras. El siguiente trabajo debe migrar cada flujo, no sustituir ScriptLock por UserLock.
- Hallazgo separado: la acción WRITE heredada `addVinToVehicle` conserva un lock global y no aparece llamada desde las rutas principales revisadas; permanece expuesta por configuración y requiere auditoría de compatibilidad antes de cambiarla.


## Continuidad — preflight dirigido de likes (2026-11-20)

- `handleRecordLike` localiza y valida el vehículo antes de adquirir ScriptLock; vuelve a localizarlo y validar el corte dentro del lock para evitar usar una fila obsoleta.
- La búsqueda de likes ahora usa `TextFinder` por actor y lee únicamente las filas coincidentes, sin `getDataRange()` de `Cortes` ni `FeedbackLikes`.
- Se conserva el lock durante la comprobación actor/corte y el incremento `previousCount → targetCount`, porque eliminarlo ahora permitiría pérdida de incrementos o likes duplicados.
- `FeedbackLikePreflightOutsideLock` 5/5 PASS. CI 44836655370 SUCCESS: 240 suites, 2973 pruebas, 0 fallos. Health read-only y Pages estaban en ejecución al registrar este checkpoint.


## Continuidad — replay de sugerencias y búsquedas dirigidas (2026-11-20)

- `findReportByReportId_` busca por `reportId` en la columna de metadata y solo lee las filas coincidentes; ya no descarga toda `Feedbacks`.
- `findCutSuggestionByOperation_` y `findCutSuggestionByRequest_` buscan en la columna `Problema` por ID y parsean solo coincidencias.
- `handleSuggestCutChange` hace preflight read-only antes de cargar imagen o adquirir ScriptLock. Si existe un replay válido, responde sin Drive/lock. Si no existe, carga imagen, adquiere lock y revalida antes de crear; si otra solicitud ganó la carrera, libera lock y limpia el duplicado.
- Regresiones: `FeedbackReportLookupBoundedRead` 4/4, `FeedbackSuggestionLookupBoundedRead` 6/6, `FeedbackSuggestionPreflightOutsideLock` 6/6, `FeedbackSuggestionImageCleanupOutsideLock` 5/5, `P2FeedbackImageUploadLocks` 1/1.
- CI 44837377505 SUCCESS: 243 suites, 2989 pruebas, 0 fallos. Health read-only 44837377778 SUCCESS; Pages seguía en ejecución.
- Nota de integridad de ramas: un test se creó accidentalmente en la rama default `main` por omitir `branch`; se eliminó inmediatamente en el commit `de13b119529415b8d85e03331647cb5422cb8a1c` y se verificó que el archivo ya no existe en `main`. `GPSpedia2.2.5` no se modificó; los cambios de trabajo permanecen en `GPSpedia2.2.5_work`.


## Continuidad — replay de reportes antes de Drive (2026-11-20)

- `handleReportProblem` consulta `reportId` antes de subir imagen/adquirir lock. Si el reporte coincide y ya tiene imagen con el mismo SHA-256, devuelve el existente sin Drive/lock; si no tiene imagen, continúa, carga y revalida bajo lock antes de adjuntar. Un hash distinto se rechaza.
- `findReportByReportId_` usa búsqueda dirigida en metadata; `findCutSuggestionByOperation_` y `findCutSuggestionByRequest_` usan búsqueda dirigida en Problema.
- `handleSuggestCutChange` también resuelve replay antes de Drive/lock y revalida dentro del lock. Las rutas de escritura nueva mantienen deduplicación crítica.
- Pruebas focalizadas: report lookup 4/4, report preflight 5/5, suggestion lookup 6/6, suggestion preflight 6/6, image cleanup 5/5, P2 upload/lock 1/1.
- CI 44837729816 SUCCESS: 244 suites, 2994 pruebas, 0 fallos. Health read-only del commit anterior SUCCESS; health y Pages del último commit seguían en ejecución.


## Continuidad — replay de tutoriales antes del lock (2026-11-20)

- `handleAddTutorial` consulta el `tutorialId` determinista antes de adquirir ScriptLock; si el contenido coincide, devuelve el registro existente sin entrar al lock. Si no existe, adquiere lock y revalida para cubrir la carrera.
- `findTutorialById_` consulta la columna A y solo lee filas candidatas; `tutorialTitleExists_` lee únicamente la columna B. El lock sigue protegiendo la unicidad de título y el `appendRow` de altas nuevas.
- Se añadió fallback acotado a la columna ID para adaptadores/mocks antiguos sin `TextFinder`; no se relaja la comparación ni se descarga la hoja completa.
- `FeedbackTutorialPreflightOutsideLock` 7/7 PASS; suite P2 de IDs/idempotencia tutorial PASS. CI 44838077134 SUCCESS: 245 suites, 3001 pruebas, 0 fallos. Health read-only 44838077089 SUCCESS; Pages seguía en ejecución.


## Continuidad — búsquedas dirigidas de aprobaciones YouTube (2026-11-20)

- `findVideoApprovalByOperation_` busca `opVideoId` en la columna `Problema` con TextFinder y lee solo filas candidatas; fallback compatible lee únicamente esa columna.
- `findPendingVideoApprovalForTarget_` hace lo mismo por `referenceId`, filtrando `contentType` y `status=pending`; se conserva el rechazo si hay más de una solicitud pendiente para el destino.
- La comprobación de operación y destino continúa dentro de `withVideoApprovalMutationLock_` junto con el append; solo se redujo la lectura crítica, no se eliminó la exclusión necesaria.
- `FeedbackPendingVideoLookupBoundedRead` 6/6 PASS; `FeedbackVideoApprovalOperationLookupBoundedRead` 5/5 PASS; `YouTubeApproval` y contratos de vídeo incluidos en la suite.
- CI 44838760886 SUCCESS: 248 suites, 3018 pruebas, 0 fallos. Health read-only 44838760925 SUCCESS.


## Continuidad — búsquedas dirigidas PyS y edición de tutoriales (2026-11-20)

- `findPysRowsById_` localiza por columna A y lee solo filas coincidentes; mantiene fallback de columna para adaptadores sin TextFinder. La asignación PyS y su ledger conservan lock para evitar IDs duplicados.
- `findTutorialRow_` usa `findTutorialById_` para la columna A y busca títulos solo en la columna B. `handleUpdateTutorialItem` ahora valida duplicidad de título con `tutorialTitleExists_(sheet, title, excludedRowIndex)`, leyendo únicamente B dentro del lock.
- `findPendingVideoApprovalForTarget_` y `findVideoApprovalByOperation_` también consultan solo la columna Problema; las verificaciones de destino/opId siguen dentro del lock de creación.
- Regresiones focalizadas: Tutorial lookup 6/6; actualización de título 5/5; PyS lookup 5/5; aprobaciones YouTube 6/6 y opVideoId 5/5.
- CI 44839134803 SUCCESS: 250 suites, 3028 pruebas, 0 fallos. Health read-only 44839135309 SUCCESS; Pages seguía pendiente.


## Continuidad — actualización tutorial sin cambios antes del lock (2026-11-20)

- `handleUpdateTutorialItem` normaliza los campos y hace una lectura previa de la fila. Si todos los campos solicitados ya coinciden, devuelve `alreadyUpdated` sin adquirir ScriptLock ni escribir. Si hay diferencias, conserva el flujo protegido original: vuelve a leer dentro del lock, valida solicitudes de vídeo y unicidad de título, actualiza y verifica la fila.
- La ruta de escritura no se ha debilitado ni se ha sacado del lock; únicamente se optimizan los reintentos que no requieren mutación.
- `FeedbackTutorialUpdateNoopPreflight` 6/6 PASS; verifica no-op sin lock y relectura bajo lock que conserva cambios concurrentes en otros campos. CI 44839930123 SUCCESS: 251 suites, 3034 pruebas aprobadas, 0 fallos. `node --check` y health read-only 44839930193 SUCCESS.
- La tarea P0 sigue abierta por los restantes locks de FEEDBACK, compatibilidad de `WRITE/addVinToVehicle` y validaciones Beta AUG-159/AUG-160/concurrencia real.
\n\n## Continuidad — replay VIN sin lock (2026-11-20)\n\n- `handleAddVinToVehicle` ahora resuelve antes del ScriptLock el replay exacto de un VIN ya asociado a la misma versión de equipamiento. El preflight exige sesión autenticada, una sola fila para el ID y coincidencia exacta de la posición VIN; cualquier caso dudoso cae al flujo protegido original.\n- Los replays no reservan otra versión de catálogo ni publican una invalidación sin cambios. Las altas nuevas y cambios de versión/VIN conservan validación de duplicados y escritura bajo ScriptLock.\n- `WriteVinNoopPreflight` 5/5 PASS. CI `44843217994` SUCCESS: 252 suites, 3039 pruebas aprobadas, 0 fallos; `node --check` PASS. Health read-only `44843218037` SUCCESS.\n- P0 permanece EN PROGRESO: falta migración atómica/compatible de la mutación VIN, reducción adicional de locks FEEDBACK cuando exista reemplazo seguro y Beta AUG-159/AUG-160/concurrencia real aislada. No se desplegó Apps Script ni se modificaron datos productivos.\n\n\n## Continuidad — replay de likes completados sin lock (2026-11-20)\n\n- `findCompletedLikeReplayNoop_` comprueba de solo lectura la hoja `FeedbackLikes`: exige esquema exacto, un único registro para actor/vehículo/corte en estado `completed` y contador entero no negativo. Devuelve el resultado idempotente antes de adquirir ScriptLock.\n- Likes pendientes, filas duplicadas, contador inválido, hoja ausente o esquema incompatible continúan por la ruta protegida original; el preflight no crea hojas ni escribe datos.\n- `FeedbackLikeCompletedReplayPreflight` 6/6 PASS. CI `44843605977` SUCCESS: 253 suites, 3045 pruebas aprobadas, 0 fallos; `node --check` PASS. Health read-only `44843605917` SUCCESS.\n- La reducción global FEEDBACK sigue abierta por los locks que protegen incremento atómico, IDs secuenciales, deduplicación, unicidad y transiciones. No reemplazarlos sin journal/proyección o control de versión equivalente.\n

## Continuidad — VIN compuesto append-only (2026-11-21)

- Commits: `6ff121aa1bd5b1cf51ae96af3de02855b941f877` (WRITE/CATALOG y pruebas de proyección), `e8feb02c62175871a77e378266abaace701c6d0c` (compatibilidad del validador autoritativo), `193bea26a26095dd215e2d980ad1547addf37868` (contrato de pruebas VIN sin lock).
- `WRITE/addVinToVehicle` ya no usa ScriptLock ni escribe directamente `Cortes`; la mutación se anexa como un evento compuesto. El proyector aplica `versionesAplicables` y `vin` conjuntamente y conserva candidatos ante conflictos concurrentes.
- CI `44846704840` SUCCESS: 253 suites, 3053 pruebas, 0 fallos. Health read-only `44846704778` SUCCESS. Pages `44846704653` SUCCESS.
- P0 sigue EN PROGRESO por la migración segura de los locks FEEDBACK restantes. Las validaciones de concurrencia real, Apps Script/Spreadsheet/Drive aislados y AUG-159/AUG-160 permanecen en Beta.
- No se desplegaron servicios Apps Script ni se modificaron datos productivos.


## Continuidad — asignador de IDs FEEDBACK sin ScriptLock (2026-11-21)

- `getNextFormulaBasedId_` ya no usa `LockService` ni `ScriptProperties` como contador transaccional. Crea/valida `__IdentifierSequenceReservations__` y reserva mediante `appendRow`; cada fila calcula su sufijo contando reservas previas de la misma hoja/columna, por lo que dos llamadas concurrentes no reutilizan el mismo número.
- Se conservan prefijo, relleno, validación de fórmulas/IDs existentes, detección de duplicados y revisión de filas con datos sin ID. Si el origen ya contiene IDs mayores que las reservas, la base se reconcilia antes de reservar.
- `FeedbackFormulaIdAllocator` 5/5 PASS; `FeedbackFormulaIdAllocatorBoundedRead` 6/6 PASS. CI `44847431570` SUCCESS: 253 suites, 3053 pruebas, 0 fallos. Health read-only `44847431590` SUCCESS. Pages `44847431763` seguía en ejecución al registrar esta nota.
- P0 continúa EN PROGRESO: retirar/reemplazar locks de mutaciones FEEDBACK restantes con journals/proyecciones o control de versión. La ejecución real de fórmulas/appendRow en Sheets queda diferida a Beta; no se desplegó Apps Script ni se modificaron datos productivos.


## Continuidad — likes append-only FEEDBACK (2026-11-21)

- Los likes nuevos se anexan en `FeedbackLikes` como eventos `status=event`, sin read-modify-write del contador físico ni ScriptLock. Los eventos duplicados del mismo actor/vehículo/corte cuentan una sola vez; CATALOG suma actores únicos sobre el contador histórico. El feed de `recordLike` publica un reset para que la siguiente lectura reconstruya el contador desde el ledger sin lock de versión.
- Los replays de likes legacy `completed` suman eventos nuevos; la ruta legacy `pending` mantiene lock y recuperación protegida. `logUserActivity` ahora anexa la fila completa con fórmula de ID en una operación.
- Pruebas: `FeedbackLikeAppendOnly` 4/4, `ActivityLogAppendAtomic` 6/6, `FeedbackLikeActivityOutsideLock` 5/5, `FeedbackLikePreflightOutsideLock` 5/5, `CatalogChangeFeed` 35/35. CI `44848455795` SUCCESS: 255 suites, 3063 pruebas, 0 fallos. Health read-only `44848455802` SUCCESS. Pages `44848455600` pendiente al registrar.
- P0 sigue abierto por `reportProblem`/`suggestCutChange`, PyS, tutoriales y aprobaciones de vídeo; sus invariantes requieren journals/proyecciones o control de versión antes de retirar locks. No se desplegó Apps Script ni se modificaron datos productivos.


## Continuidad — retiro de ScriptLock en likes (2026-11-21)

- `handleRecordLike` ya no contiene ScriptLock ni operaciones `setValue` del contador. Los likes nuevos se anexan como eventos; el proyector cuenta actores únicos. Los registros legacy `pending` se recuperan sin mutación: si el contador ya alcanzó `target`, se reconoce como aplicado; si sigue en `previous`, se anexa el evento; cualquier otro valor se deriva a reconciliación manual.
- `logUserActivity` también usa appendRow atómico con fórmula por fila; `getNextFormulaBasedId_` usa el ledger de reservas append-only.
- Pruebas `FeedbackLikeAppendOnly` 4/4, `FeedbackLikeCompletedReplayPreflight` 6/6, `FeedbackLikeActivityOutsideLock` 5/5, `FeedbackLikePreflightOutsideLock` 5/5, `CatalogChangeFeed` 35/35. CI `44848965971` SUCCESS: 255 suites, 3063 pruebas, 0 fallos. Health read-only `44848965894` SUCCESS. Pages `44848965693` pendiente al registrar.
- P0 continúa abierto por `handleSuggestYear`, reportes/sugerencias, PyS, tutoriales y vídeos. No se desplegó Apps Script ni se modificaron datos productivos.


## En curso — preparación de votos append-only en handleSuggestYear (2026-11-21)

- Se modificó `countVerifiedPositiveYearSuggestionVotes_` para que, por vehículo/año, solo cuente el resultado de la primera fila física de cada actor verificado. Una respuesta posterior contradictoria del mismo actor ya no puede transformar su primer voto ni duplicar su aportación.
- `SuggestYearVoteThreshold.mjs` incorpora pruebas para ambos órdenes de conflicto (negativo→positivo y positivo→negativo).
- CI del commit `8c8a7dac2ce2743642bebfdfcfcccdb387cdbe56`: servicio de regresión SUCCESS, 255 suites, 3064 pruebas, 0 fallos; health read-only SUCCESS; build SUCCESS. Deploy/Pages seguía en ejecución al registrar.
- **No se ha retirado ScriptLock ni se considera migrado el flujo.** Pendiente: append atómico de votos, ledger de aplicaciones idempotente, recuperación sin mutar filas históricas y validación de concurrencia. Mantener lock actual hasta completar esos contratos.



## En curso — escrituras atómicas de sugerencias de año (2026-11-21)

- Los votos nuevos de `handleSuggestYearLocked` se escriben como una fila completa con `Feedbacks.appendRow`; ID reservado, usuario, vehículo, respuesta, año y `suggestionActorKey` quedan en una sola operación. La proyección conserva first-write-wins por actor/vehículo/año.
- Las aplicaciones nuevas se anexan como una fila completa mediante `FeedbackYearApplications.appendRow` y se confirma que exista exactamente una fila con el operationId generado antes de continuar la recuperación.
- Pruebas `SuggestYearVoteThreshold` 8/8 y `FeedbackYearApplicationAppendOnly` 7/7 PASS. CI commit `8d80bac41d4c29e9b90d598e89eca818e03bff79`: 255 suites, 3066 pruebas aprobadas, 0 fallos; health read-only en ejecución al registrar; build en ejecución al registrar.
- **P0 permanece abierto.** `handleSuggestYear` aún usa ScriptLock; el operationId de aplicación sigue siendo UUID no determinista; el ledger cambia status/actividad y la recuperación todavía modifica claves de votos históricos. Pendiente: identidad determinista y deduplicación segura de aplicaciones, recuperación reconstruible desde eventos sin mutar Feedbacks, revisión de conflictos de generaciones y pruebas de concurrencia. No retirar lock todavía.
- No se desplegó Apps Script ni se modificaron datos productivos.



## Continuación — identidad determinista y recuperación de duplicados (2026-11-21)

- `handleSuggestYearLocked` ahora calcula `operationId` como SHA-256 de la identidad de propuesta: vehículo, año, rango anterior/propuesto, valores crudos y eventos fuente. Reintentos de la misma propuesta y versión fuente producen el mismo ID; cambios en destino o fuente producen otro ID.
- `findPendingFeedbackYearApplication_` agrupa filas pendientes por `operationId`, acepta duplicados solo si describen la misma propuesta y devuelve todas sus filas para reconciliación. Propuestas distintas para un vehículo siguen bloqueadas para revisión manual.
- La finalización actualiza el estado y la marca de actividad en todas las filas duplicadas reconocidas y confirma el cierre de cada una.
- Pruebas `SuggestYearVoteThreshold` 8/8 y `FeedbackYearApplicationAppendOnly` 9/9 PASS. Commit `953e9347c7d34696b8a1646c516e73ba758eee7d`: 255 suites, 3068 pruebas aprobadas, 0 fallos; health read-only SUCCESS.
- **P0 sigue abierto:** el wrapper conserva ScriptLock; la recuperación todavía modifica claves de votos históricos y el ledger usa cambios de estado. No retirar el lock hasta migrar esas mutaciones y validar concurrencia real. No desplegar Apps Script ni tocar producción.



## Continuación — votos históricos inmutables (2026-11-21)

- `completeFeedbackYearApplication_` dejó de renombrar claves de aportantes en `Feedbacks` y ya no recorre ni reescribe las filas de votos al cerrar una ampliación. La aplicación se identifica mediante el `operationId` determinista y los eventos `vehicle_update`.
- Se conserva la lectura de claves `applied:user:...` únicamente para compatibilidad con registros históricos que ya fueron marcados por versiones anteriores; el flujo nuevo no genera esas claves.
- Pruebas `SuggestYearVoteThreshold` 8/8 y `FeedbackYearApplicationAppendOnly` 10/10 PASS. CI commit `99d25f8a040c54e47a0618a19751e4fcc7e815ac`: 255 suites, 3069 pruebas aprobadas, 0 fallos; health read-only SUCCESS.
- **P0 continúa abierto:** ScriptLock sigue activo; el ledger aún actualiza status/actividad in-place y la coordinación completa entre votos concurrentes y aplicaciones requiere más trabajo. No retirar lock ni desplegar Apps Script hasta cerrar esos contratos.



## Continuación — estado de aplicaciones por eventos append-only (2026-11-21)

- Se creó el ledger `FeedbackYearApplicationEvents` con eventos `activity_attempted`, `requires_review` y `completed`. La identidad del evento se deriva de la aplicación, tipo y payload; los reintentos idénticos se reconocen como duplicados y payloads contradictorios se rechazan.
- `findPendingFeedbackYearApplication_` ahora proyecta el estado desde el ledger de eventos y agrupa duplicados de la aplicación. `completeFeedbackYearApplication_` dejó de modificar las columnas `status`, `activityAttempted` y `updatedAt` de las filas de aplicación; solo anexa eventos.
- `Feedbacks` también permanece inmutable durante la finalización. La compatibilidad de lectura para claves históricas `applied:user:...` se mantiene, pero no se crean nuevas.
- Pruebas `SuggestYearVoteThreshold` 8/8 y `FeedbackYearApplicationAppendOnly` 12/12 PASS. CI commit `6bde2d4191015e43f37531e258b158a63ac8d801`: 255 suites, 3071 pruebas aprobadas, 0 fallos; build y health read-only SUCCESS. Deploy GitHub Pages estaba en ejecución al registrar; no es despliegue Apps Script.
- ScriptLock sigue activo. Falta resolver coordinación concurrente de la secuencia voto→aplicación y validar recuperación integral antes de retirar el lock.



## Cierre de migración de coordinación — handleSuggestYear (2026-11-21)

- Se retiró `LockService.getScriptLock()` de `handleSuggestYear`. El wrapper ejecuta el flujo sin lock global; las escrituras críticas quedan respaldadas por appendRow, reservas de ID, operationId determinista, eventos append-only y control de versión en `AportesVehiculo`.
- El estado de `FeedbackYearApplications` se proyecta desde `FeedbackYearApplicationEvents`; los votos históricos no se modifican al completar una ampliación. Las claves legacy `applied:user:...` solo se reconocen en lectura.
- Pruebas actualizadas: `FeedbackYearApplicationAppendOnly` 14/14, `FeedbackYearFolderSyncOutsideLock` 5/5, `SuggestYearVoteThreshold` 8/8. CI commit `86e6cbcb9fac561830b842eef2e4f4977bb46308`: 255 suites, 3073 pruebas aprobadas, 0 fallos; build y health read-only SUCCESS.
- El retiro del lock aplica únicamente a `handleSuggestYear`; otros handlers FEEDBACK todavía tienen locks y continúan pendientes de migración. La prueba beta real de Apps Script/Sheets/Drive sigue pendiente. No se desplegó Apps Script ni se tocaron datos productivos.



## En curso — escrituras completas para reportes y sugerencias de corte (2026-11-21)

- `handleReportProblem`: los reportes nuevos se construyen como una fila completa (ID reservado, usuario, vehículo, descripción y metadata opcional) y se anexan con un único `appendRow`. La confirmación verifica ID, usuario, vehículo, descripción y metadata. Si el append pudo persistir pero la confirmación falla, el adjunto se conserva para reconciliación; no se borra una posible referencia.
- `handleSuggestCutChange`: las sugerencias nuevas se construyen como fila completa (ID, usuario, vehículo, JSON de propuesta y estado inicial) y se anexan con `appendRow`; se verifica la fila completa. Si el append pudo persistir, el adjunto no se envía a papelera ante un error incierto.
- Los dos handlers conservan temporalmente ScriptLock y revalidación bajo lock para impedir duplicados mientras se diseña la proyección idempotente que permita retirar la serialización. No afirmar que estos flujos estén migrados.
- Pruebas: `FeedbackReportPreflightOutsideLock` 6/6, `FeedbackReportImageCleanupOutsideLock` 5/5, `FeedbackSuggestionPreflightOutsideLock` 7/7, `FeedbackSuggestionImageCleanupOutsideLock` 5/5, `P2FeedbackImageUploadLocks` 1/1. CI commit `55774f0716c97b6adcefd7e231d35cdaf75b478f`: 255 suites, 3075 pruebas aprobadas, 0 fallos; build, health read-only y Pages SUCCESS.
- No se desplegó Apps Script ni se modificaron datos productivos. Siguiente: diseñar identidad/proyección append-only de reportes y sugerencias para eliminar locks sin duplicar tickets ni propuestas.


## Corrección puntual — confirmación de sugerencias FEEDBACK (2026-11-20)

- [x] Corregir el índice de la columna `Problema` al verificar la fila persistida por `handleSuggestCutChange`; la escritura usa índice base cero y la lectura ahora consulta `COLS_FEEDBACKS.Problema - 1`.
- [x] Añadir una regresión estática que exige el índice correcto y rechaza la expresión desplazada.
- [x] CI `44861738724` SUCCESS en commit `f81b316b595f1675637d84f2e25fd1775083a83d`; la suite integral de regresión terminó correctamente.
- El hallazgo no sustituye la tarea P0: reportes y sugerencias todavía requieren migración segura de idempotencia/concurrencia para retirar ScriptLock.


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


## PyS — fase 2: reservas contradictorias

- readPysOperations_ ahora rechaza el mismo opId/payloadHash asociado a distintos problemId; el caso se marca para reconciliación en vez de ignorar la segunda fila.
- PysCreationIntegrity.js incorpora regresión que confirma el rechazo antes de crear archivos.
- CI 44873477741 SUCCESS: 258 suites, 3092 pruebas, 0 fallos; health read-only 44873477634 SUCCESS; Pages 44873477531 pendiente al momento de esta actualización.
- PyS no está cerrada: handleAddProblem mantiene ScriptLock hasta completar un ledger de reservas/propiedad de imagen apto para concurrencia real.
- No se desplegó Apps Script ni se tocaron datos productivos.


### PyS — fase 2b: archivos duplicados en reservas

- readPysOperations_ ahora rechaza reservas duplicadas que, aun compartiendo opId, payloadHash y problemId, apuntan a imageFileId/imageUrl diferentes.
- Prueba PysCreationIntegrity añadida. CI 44873650200 SUCCESS: 258 suites, 3093 pruebas, 0 fallos; health read-only 44873650247 SUCCESS; Pages pendiente al momento de esta actualización.
- PyS permanece EN PROGRESO; handleAddProblem conserva ScriptLock hasta resolver la propiedad de operación e imagen con un protocolo concurrente verificable.


## Cierre local — creación de problemas PyS sin ScriptLock (2026-11-21)

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- [x] Retirar ScriptLock de `handleAddProblem`; alta nueva anexa una reserva completa `UPLOAD_PENDING` con ID, hash e imagen.
- [x] Convertir `PysOperations` a append-only para el flujo nuevo; impedir mutaciones de estado in-place.
- [x] Proyectar primera reserva física por `opId`, conservar identidad/archivo canónicos y rechazar payload distinto sin invalidar otras operaciones.
- [x] Evitar borrar archivos con referencias ambiguas; preservar recursos tras reservas confirmadas y recuperar por replay.
- [x] Rechazar la reutilización de imágenes ya vinculadas a otro problema.
- [x] Pruebas focalizadas incluidas en CI: 258 suites, 3094 pruebas, 0 fallos; health read-only y Pages SUCCESS.
- [ ] Beta aislada: concurrencia real de appendRow, carrera de reservas/archivos, pérdida de respuesta, recuperación Drive/Sheets y referencias preexistentes.
- Las mutaciones de solución, prevención y relaciones no forman parte de este cierre y conservan sus locks.

## Siguiente tarea — tutoriales

**Estado: PENDIENTE.**

- Auditar `handleAddTutorial`, `handleUpdateTutorialItem`, lectores, unicidad de título, IDs, imágenes y consumidores.
- Diseñar proyección first-write-wins/append-only compatible con los registros actuales.
- Retirar ScriptLock solo después de que altas, reintentos y ediciones concurrentes tengan identidad canónica y regresiones locales.
- No cambiar el contrato frontend ni desplegar Apps Script.


## Inicio de migración de tutoriales — auditoría y diseño (2026-11-21)

- Auditoría: `AUDITORIA_TUTORIALES_APPEND_ONLY_2026-11-21.md`.
- `handleAddTutorial` mantiene ScriptLock para unicidad de título y append; `handleUpdateTutorialItem` conserva no-op preflight, pero las ediciones reales actualizan B:F in-place bajo lock.
- CATALOG lee filas físicas de Tutorial A:H; el feed y las aprobaciones de vídeo usan `findTutorialRow_` y la columna G. No retirar locks hasta tener una proyección común que preserve título, expected hash, vídeo y compatibilidad histórica.
- Próximo paso: implementar journal/proyector append-only y regresiones de altas/ediciones concurrentes. No se ha modificado código de tutoriales todavía.


## Tutoriales — estado de implementación actualizado (2026-11-21)

- [x] Alta `handleAddTutorial` sin ScriptLock con reserva append-only de título, payloadHash, replay por operationId y first-write-wins. CI: 258 suites, 3097 pruebas, 0 fallos.
- [x] Ledger `TutorialTitleEvents` coordina claims de alta y renombrados. Los renombrados continúan protegidos por ScriptLock hasta completar la migración de edición.
- [x] Lectura por ID y CATALOG deduplican reintentos físicos, conservando la primera fila canónica.
- [x] Migrar `handleUpdateTutorialItem` a eventos append-only/versionados con expected hash, sin pérdida de cambios simultáneos.
- [x] Integrar proyección de versiones con CATALOG/feed y preservar aprobaciones de vídeo (columna G) sin revertir snapshots.
- [ ] Beta aislada: concurrencia real de reservas, creación de hoja, altas simultáneas, renombrados y recuperación tras append/flush incierto.
- No desplegar Apps Script ni modificar datos productivos.


## Tutoriales — progreso fase 2

- [x] Alta `handleAddTutorial` lock-free con reservas append-only de título y replay idempotente.
- [x] Ediciones descriptivas D:F para IDs estables mediante `TutorialEditEvents`, expectedHash y snapshots append-only; sin ScriptLock.
- [x] CATALOG y `findTutorialRow_` proyectan eventos D:F sin revertir Video (G), Imagen (C) ni Colaborador (H).
- [x] Migrar renombrados de título a eventos append-only sin lock, manteniendo unicidad, liberación del título anterior y cancelación de reservas si una edición queda obsoleta.
- [x] Migrar filas históricas sin ID o definir su transición segura; mantener compatibilidad sin inventar identidades.
- [x] Auditar y adaptar aprobaciones de vídeo para la proyección completa.
- [ ] Beta aislada: altas, ediciones simultáneas, renombrados, respuestas perdidas, reservas huérfanas y aprobaciones de vídeo.
- CI `44877806419`: 258 suites, 3101 pruebas, 0 fallos; health y Pages SUCCESS.

## Tutoriales — endurecimiento del ledger de títulos

- [x] Verificar eventHash de cada fila de TutorialTitleEvents contra el contenido completo del evento.
- [x] Rechazar operationId repetido con evento contradictorio; conservar replays físicos idénticos.
- [x] Añadir regresiones en TutorialIntegrity para hash manipulado y operationId contradictorio.
- CI 44901700375: 258 suites, 3103 pruebas, 0 fallos; health read-only 44901700446 SUCCESS. Pages 44901699997 en ejecución al registrar.
- [x] Migrar renombrados a eventos append-only sin ScriptLock y proyectar el título actual en findTutorialRow_, CATALOG y feed.
- [x] Auditar aprobaciones de vídeo después de cerrar renombrados.
- La edición de filas históricas sin ID sigue bajo lock hasta diseñar transición segura.


## Tutoriales — fase 3: renombrados append-only

- [x] Registrar el título visible en `TutorialRenameEvents` y coordinar unicidad/liberación con `TutorialTitleEvents`.
- [x] Exigir propiedad del título anterior como condición de versión; dos renombrados desde el mismo estado no pueden aplicarse ambos.
- [x] Proyectar título en `findTutorialRow_`, lookup por tema, feed y CATALOG sin reescribir la fila física.
- [x] Mantener protección frente a solicitudes de vídeo pendientes y conservar Imagen, Video y Colaborador.
- [x] Ejecutar regresión `TutorialIntegrity` y suite completa de servicios en CI.
- [x] Adaptar aprobaciones de vídeo para el modelo completo de tutoriales.
- [x] Migrar filas históricas sin ID sin inventar identidades persistentes.
- [ ] Beta aislada: concurrencia real de `appendRow`, fallos entre ambos journals, flush incierto y reconciliación de reservas.

Estado: **EN PROGRESO** hasta confirmar pruebas y publicación.


## Tutoriales — fase 4: compatibilidad de renombrados históricos

- [x] Permitir renombrar filas sin ID mediante identidad determinista derivada del título normalizado, sin persistir ni inventar un ID.
- [x] Mantener el bloqueo de edición descriptiva legacy separado; el camino lock-free histórico solo acepta renombrado de título.
- [x] Ejecutar regresiones y suite completa de servicios en CI.
- [x] Auditar aprobaciones de vídeo y completar compatibilidad de la proyección.
- [ ] Beta aislada: concurrencia real, respuesta perdida y fallos parciales entre journals.

Estado: **EN PROGRESO**.


## Cierre local — renombrados append-only de tutoriales (2026-11-21)

**Estado: COMPLETADA LOCALMENTE; validación Beta diferida.**

- [x] Renombrados de tutoriales con ID estable mediante `TutorialTitleEvents` + `TutorialRenameEvents`, sin ScriptLock ni escritura física del título.
- [x] Renombrados de filas históricas sin ID mediante identidad derivada del título normalizado; no se inventa ni persiste un ID y la fila física permanece intacta.
- [x] Compare-and-swap del título anterior: solo un renombrado concurrente desde la misma versión puede ganar.
- [x] Proyección del título en `findTutorialRow_`, lookup por tema, feed FEEDBACK y CATALOG; se conservan imagen, vídeo y colaborador.
- [x] Reintentos idempotentes y verificación de hashes del journal de renombrados.
- [x] Regresión `TutorialIntegrity`: 40/40 PASS.
- [x] CI `44903445024` SUCCESS: 258 suites, 3,107 pruebas aprobadas, 0 fallos; node --check PASS.
- [x] Health read-only `44903444986` SUCCESS.
- [x] Auditoría/ajuste adicional de aprobaciones y rechazos de vídeo para asegurar que destino G y metadatos permanecen coherentes después de renombrar.
- [x] Ediciones descriptivas D:F de filas históricas sin ID: permanecen bajo lock; no forman parte del cierre del renombrado.
- [ ] Beta aislada: concurrencia real de appendRow, fallo entre ambos journals, respuesta perdida y recuperación multihoja.
- No se desplegó Apps Script ni se modificaron Spreadsheet/Drive productivos.


## Cierre local — aprobación y rechazo de vídeos append-only (2026-11-21)

Estado: COMPLETADA LOCALMENTE; validación Beta diferida.

- [x] Añadir VideoApprovalEvents como journal inmutable de decisiones terminales approved/rejected, con eventId/payloadHash, identidad de solicitud, snapshot y validación de esquema.
- [x] Proyectar eventos sobre Feedbacks al leer la solicitud; la fila materializada se reconstruye idempotentemente desde el evento.
- [x] Persistir y confirmar la decisión antes de publicar el vídeo aprobado o retirar el enlace/miniatura rechazados.
- [x] Recuperar reintentos tras pérdida de respuesta, fallo de materialización Feedbacks o fallo parcial del destino; una transición opuesta se rechaza.
- [x] Retirar ScriptLock local de submit/approve/reject; usar leases compartidas Coordinator por operación FEEDBACK.
- [x] Ajustar política Coordinator para reservar CORTES y TUTORIAL durante lectura/escritura de destino; PyS y Feedbacks quedan dentro del recurso FEEDBACK.
- [x] Verificar que aprobación de Tutorial usa la fila/título proyectado y solo modifica Video/Imagen; el título renombrado y Colaborador no se revierten.
- [x] FEEDBACK aprobación/rechazo/publicación: 30/30 PASS; VideoApprovalClientContract 10/10 PASS; VideoApprovalState 13/13 PASS.
- [x] CI 44904401718 SUCCESS: 258 suites, 3,108 pruebas, 0 fallos; node --check PASS. Health read-only 44904401717 SUCCESS.
- [ ] Beta aislada: concurrencia real entre proyectos, appendRow simultáneo, respuesta perdida, fallo parcial Coordinator/Sheets y reintentos de publicación/rechazo con destinos aislados.
- No se desplegó Apps Script ni se modificaron datos productivos.

## Cierre local — ediciones descriptivas de tutoriales históricos sin ID

- [x] Permitir edición D:F de filas históricas sin ID mediante identidad/versión derivada segura, sin escribir IDs inventados ni perder cambios concurrentes.
- [x] Mantener edición por ID como ruta preferida y preservar B/C/G/H, autoría y compatibilidad de reintentos.


## Cierre local — edición append-only de tutoriales históricos sin ID (2026-11-21)

Estado: COMPLETADA LOCALMENTE; validación Beta diferida.

- [x] Extender TutorialEditEvents para identidades legacy derivadas de SHA-256 del título normalizado, sin persistir IDs inventados.
- [x] Aplicar expectedHash sobre D:F y proyectar ediciones por identidad derivada; los reintentos exactos son idempotentes y los cambios obsoletos no pisan versiones posteriores.
- [x] Admitir ediciones combinadas de título y D:F legacy; se escriben eventos de título y edición, nunca la fila física B:F.
- [x] Resolver la fila física por identidad derivada y rechazar duplicados históricos ambiguos.
- [x] CATALOG aplica primero la proyección D:F usando el título físico base y después proyecta el título; preserva Imagen, Video y Colaborador.
- [x] TutorialIntegrity 42/42 PASS.
- [x] CI 44904942416 SUCCESS: 258 suites, 3,110 pruebas, 0 fallos; node --check PASS.
- [x] Health read-only 44904942436 SUCCESS; GitHub Pages 44904942027 SUCCESS.
- [ ] Beta aislada: ediciones/renombrados concurrentes, appendRow real, pérdida de respuesta, colisiones de identidad legacy y reconciliación entre journals.
- No se desplegó Apps Script ni se modificaron Spreadsheet/Drive productivos.

## Estado de tareas locales

Las migraciones locales de WRITE/FEEDBACK para cortes, aportes, imágenes ADMIN, tutoriales, renombrados, ediciones históricas y aprobación/rechazo de vídeo están implementadas y validadas por CI. Las tareas no marcadas quedan limitadas a integración/aceptación Beta y Safe Apply, que permanece bloqueado hasta su preview/ACL/rollback autorizados.


## Cierre local — coordinación de mutaciones PyS (2026-11-21)

Estado: COMPLETADA LOCALMENTE; validación Beta diferida.

- [x] Migrar solución y prevención a leases compartidas FEEDBACK (addSolution/addPrevention), sin ScriptLock local.
- [x] Migrar asociaciones y desvinculaciones PyS↔Cortes a leases compartidas (addVehicleToProblem/removeVehicleFromProblem), con lectura/validación/read-back dentro de la lease.
- [x] Conservar first-write-wins, idempotencia, normalización de relaciones, validación de IDs únicos y RBAC de Desarrollador para desvincular.
- [x] Confirmar que Coordinator ya define los cuatro contratos de recursos: FEEDBACK para PyS y CORTES como lectura al modificar relaciones.
- [x] Añadir PysVehicleRelationIntegrity al runner CI; suite 20/20 PASS, incluida comprobación de la política real de Coordinator.
- [x] Ampliar SharedMutationCoordinator para probar contención entre addSolution/addPrevention y sus recursos FEEDBACK; suite 86/86 PASS.
- [x] PysCreationIntegrity 56/56 PASS; PysImageStorageRecovery 22/22 PASS; P2PysImageUploadOutsideLock PASS.
- [x] Corregir el orden de prevalidación de modelos asociados en handleAddProblem: validar IDs de Cortes antes de crear/leer PysOperations, evitando efectos laterales de inicialización ante un vehículo inválido.
- [x] CI actualizado 44909269963 SUCCESS: 259 suites, 3,131 pruebas, 0 fallos; PysModalNavigation 10/10, PysCreationIntegrity 56/56, PysVehicleRelationIntegrity 20/20, SharedMutationCoordinator 86/86; node --check PASS. Health read-only 44909269950 SUCCESS; Pages 44909269739 SUCCESS.
- [ ] Beta aislada: concurrencia real entre proyectos, leases Coordinator, fallo de lease, pérdida de respuesta y read-back en Spreadsheet aislada.
- No se desplegó Apps Script ni se modificaron datos productivos.


## Condiciones de ejecución Beta pendientes

- AUG-159 requiere deployments aislados WRITE/CATALOG/ADMIN, Spreadsheet y Drive desechables, y dos cuentas de prueba con permisos distintos.
- AUG-160 requiere proyecto/deployment ADMIN de prueba y Spreadsheet/Drive aislados para inyectar fallos, pérdida de respuesta, file_missing y metadatos alterados.
- No ejecutar endpoints, cuentas, hojas ni carpetas productivas. La CI local no sustituye estas pruebas reales; Safe Apply sigue bloqueado hasta preview, ACL y rollback autorizados.


## Continuidad — cierre de regresiones PyS y preparación de verificación integral (2026-11-21)

- Se corrigió el orden de handleAddProblem: la validación de cada modelo asociado contra Cortes ocurre antes de inicializar/leer PysOperations, evitando efectos laterales de inicialización cuando el ID de vehículo no existe.
- PysVehicleRelationIntegrity se ejecuta en el runner principal y queda en 19/19 PASS; PysCreationIntegrity 56/56, PysModalNavigation 10/10 y PysImageStorageRecovery 22/22 PASS.
- CI 44907336819 SUCCESS: 259 suites, 3,129 pruebas aprobadas, 0 fallos; comprobación sintáctica PASS. Health read-only 44907336832 SUCCESS; GitHub Pages 44907336274 SUCCESS.
- P0 GP-CONCURRENCY-CUT-MULTI-ENTRY-01 y P1 GP-UX-RECENT-VIEWED-CACHE-PARALLEL-01: COMPLETADAS CON VALIDACIÓN DIFERIDA A BETA. No quedan tareas locales de implementación abiertas en el registro vigente; continúan exclusivamente validaciones Beta reales y Safe Apply, que requiere preview, ACL y rollback autorizados.
- Siguiente actividad: fase de verificación técnica integral exigida por §11 de NORMAS_DESAROLLO.md, sin incorporar funcionalidades nuevas.
- No se desplegó Apps Script ni se modificaron Spreadsheet/Drive productivos.


## Cierre local — GP-UX-SEARCH-MODEL-GROUPING-01 (2026-11-21)

Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.

- [x] Agrupación de búsqueda por categoría + marca + modelo y una tarjeta por modelo.
- [x] Resolver jerárquico de equipamiento, tipo de encendido y rango de años; omitir niveles con una sola opción y abrir el modal cuando existe un único registro elegible.
- [x] Mantener separados Relay, Tutoriales, PyS y resultados VIN ambiguos; conservar apertura directa para VIN inequívoco y semántica de rangos abiertos.
- [x] Preservar navegación Atrás/Adelante y restauración de contexto mediante la suite integrada.
- [x] SearchModelGrouping 21/21 PASS dentro del runner principal; CI 44907910014 SUCCESS: 259 suites, 3,129 pruebas, 0 fallos.
- [ ] Beta visual en navegador de escritorio, Android/PWA y validación con catálogo real aislado.
- No se desplegó Apps Script ni se modificaron datos productivos.


## Beta — adenda de actualización de contratos PyS (2026-11-21)

- [ ] AUG-161: validar en entorno aislado la creación PyS sin ScriptLock local, reserva append-only de IDs, propiedad first-write-wins de opId/archivo, recuperación Drive/Sheets y mutaciones de solución, prevención y relaciones bajo leases compartidas Coordinator 1.4.5.
- [ ] Probar concurrencia entre dos ejecuciones/proyectos FEEDBACK que comparten Coordinator; incluir contención/expiración de lease, fallo de Coordinator, pérdida de respuesta, read-back real y RBAC para desvincular.
- Esta adenda prevalece sobre las expectativas obsoletas de ScriptLock/estados LINKED o RECOVERY_REQUIRED en PysOperations de AUG-084/AUG-086/AUG-090/AUG-128. PysOperations nuevo es append-only; el éxito se proyecta desde la fila PyS verificada y los archivos ambiguos se conservan para reconciliación.
- Ejecutar solo después de los comandos de sincronización seguros al inicio de lista_beta_adenda_2026-11-21.md. No usar deployments, cuentas, hojas ni Drive productivos.


## Reconciliación de estados históricos — 2026-11-21

Las secciones antiguas tituladas «En curso», «Siguiente tarea — tutoriales» y las fases 3/4 de Tutoriales conservan el estado que tenían al registrarse. Sus pendientes locales quedaron resueltos por los cierres posteriores de handleSuggestYear, reportes/sugerencias, creación/edición/renombrado de tutoriales, aprobación de vídeos y edición de filas históricas sin ID. No son tareas locales abiertas. El estado operativo vigente está en los cierres P0/P1, PyS, Tutoriales y búsqueda agrupada; sus únicas casillas sin marcar son validaciones Beta en entornos aislados.

La Beta vigente de PyS se ejecuta con AUG-161 en lista_beta_adenda_2026-11-21.md, que sustituye las expectativas históricas de ScriptLock y estados mutables del ledger.


## Continuidad — contrato integrado FEEDBACK/Coordinator PyS (2026-11-21)

- La revisión integral detectó que PysVehicleRelationIntegrity probaba la llamada a la lease mediante un mock, pero no comprobaba que Coordinator declarara los mismos nombres de operación y recursos.
- Se amplió la suite para leer Coordinator.js y verificar addSolution/addPrevention con escritura FEEDBACK, y addVehicleToProblem/removeVehicleFromProblem con escritura FEEDBACK más lectura CORTES. También se verifica su registro en la lista de escritores FEEDBACK.
- PysVehicleRelationIntegrity 20/20 PASS. CI 44909033557 SUCCESS: 259 suites, 3,130 pruebas, 0 fallos; Health read-only 44909033573 SUCCESS; Pages 44909033191 SUCCESS.
- No se cambió el contrato productivo ni se desplegó Apps Script; se añadió cobertura de integración local para evitar divergencias entre FEEDBACK y Coordinator.


## Continuidad — serialización Coordinator de solución y prevención (2026-11-21)

- SharedMutationCoordinator ahora prueba que addSolution y addPrevention comparten el recurso FEEDBACK, no reservan CORTES y se serializan entre sí; después de liberar la lease, el reintento puede adquirirla.
- Suite SharedMutationCoordinator 86/86 PASS; PysVehicleRelationIntegrity 20/20 PASS. CI 44909269963 SUCCESS: 259 suites, 3,131 pruebas aprobadas, 0 fallos. Health 44909269950 y Pages 44909269739 SUCCESS.
- Commit de prueba: 6523413028eed4ddc2d745e272f535b58514382c. Las pruebas reales multi-proyecto/Spreadsheet siguen pendientes de AUG-161 Beta aislada.
