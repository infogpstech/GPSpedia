# GPSpedia — Tareas activas

Fecha de actualización: 2026-11-20  
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

**Estado: EN PROGRESO.** Las rutas append-only y la regresión local cubren parte importante del alcance; no declarar cerrada la tarea hasta completar los puntos locales restantes y después ejecutar Beta.

- [x] Retirar el `UserLock` del fallback de `handleAddOrUpdateCut`. Los vehículos existentes usan append-only y requieren opId; si falta, se devuelve `WRITE_OP_ID_REQUIRED` antes de adquirir un lock. El `ScriptLock` queda solo para asignar el ID numérico de un vehículo nuevo. CI 44829158327: 237 suites/2942 pruebas PASS.
- [x] Confirmar consumidores activos de cortes: modal de detalle y `HTML/add_cortes.html` envían/reutilizan opId estable.
- [x] Corregir el lector CATALOG de `AportesVehiculo`: aceptar `vehicle_update` con actor y opId `OP-ADMIN-`, o con opId `OP-YEAR-` exclusivamente si el actor es `SYSTEM:FEEDBACK_YEAR`; antes el proyector ya entendía el tipo, pero el lector lo rechazaba y podía invalidar la lectura completa. Prueba funcional añadida a `VehicleContributionProjection`; acepta `OP-YEAR-` solo con `SYSTEM:FEEDBACK_YEAR`. CI 44835908125 SUCCESS: 239 suites, 2968 pruebas, 0 fallos.
- [x] Auditar FEEDBACK/reporte/sugerencia: `reportProblem` y `suggestCutChange` persisten en Feedbacks y no escriben directamente Cortes/AportesVehiculo; la sugerencia actual se limita a un corte existente. Los IDs `reportId`/`suggestionOperationId` y la huella mantienen idempotencia. `reportId` ahora usa `crypto.randomUUID()`/`getRandomValues`, sin `Math.random`.
- [x] Corregir fallo de ejecución al repetir voto positivo: `handleSuggestYearLocked` usaba `voteActors` fuera de alcance; ahora comprueba el voto positivo desde `allData`. Regresión añadida a `SuggestYearVoteThreshold.mjs` (7/7 PASS); CI 44834891294 SUCCESS: 238 suites, 2963 pruebas, 0 fallos.
- [x] Migrar `handleSuggestYear`/`completeFeedbackYearApplication_` a eventos `vehicle_update` en `AportesVehiculo`: lectura del rango desde la proyección append-only, versiones esperadas y fuentes, opId estable por campo, append verificado e idempotente, recuperación mediante `FeedbackYearApplications` (extensión de columnas para conservar valores/fuentes originales) y estado `requires_review` si CATALOG no aplica el rango. Se eliminó la escritura directa en `Cortes.anoDesde/anoHasta`; el catálogo se invalida fuera del lock. Se conservan tres votos verificados, exclusión de anónimos y detección de colisión de generaciones. Pruebas `FeedbackYearApplicationAppendOnly` 5/5 y `SuggestYearVoteThreshold` 7/7; valida todo el ledger antes de reconstruir el rango y rechaza opId conflictivos. CI 44835908125 SUCCESS: 239 suites, 2968 pruebas, 0 fallos.
- [x] Retirar el lock global prolongado de `handleSendContactForm`: el asignador `getNextFormulaBasedId_` reserva el ID dentro de su sección crítica breve y el formulario anexa una fila completa con `appendRow` fuera del lock; el formato se aplica después de verificar el ID. Prueba `FeedbackContactWriteNoGlobalLock` 2/2 y `FeedbackLockFastFail` PASS; CI 44835908125 SUCCESS: 239 suites, 2968 pruebas, 0 fallos.
- [ ] Reducir el ScriptLock global fast-fail de FEEDBACK. `handleSendContactForm` ya no mantiene un lock exterior; `handleRecordLike` usa preflight y lecturas dirigidas; ahora también devuelve likes `completed` ya existentes mediante lectura previa sin lock, verificando esquema, unicidad y contador. Los registros `pending`, duplicados o dudosos siguen al flujo protegido. `reportProblem` y `suggestCutChange` consultan sus IDs mediante `TextFinder` y resuelven replays antes de Drive/lock; ambas rutas revalidan dentro del lock antes de crear o adjuntar. `handleAddTutorial` también resuelve replays por operationId antes del lock; la búsqueda de ID/título lee columnas dirigidas. Las consultas de aprobaciones YouTube (`opVideoId` y destino pendiente) leen solo `Problema`; las búsquedas PyS leen solo ID; las consultas de tutoriales/edición leen ID y título en columnas específicas. Las altas/actualizaciones nuevas conservan lock para unicidad, first-write-wins y append; `handleUpdateTutorialItem` ahora devuelve reintentos sin cambios desde un preflight de solo lectura antes del lock (sin saltarse la revalidación para mutaciones reales). `FeedbackTutorialUpdateNoopPreflight` 6/6 PASS; incluye relectura bajo lock y preservación de un cambio concurrente en otro campo. CI 44839930123 SUCCESS: 251 suites, 3034 pruebas, 0 fallos. Falta migrar las mutaciones restantes a journals/proyecciones o control de versión antes de retirar sus locks.
- [x] Añadir conversión explícita desde Inbox: crear un corte para el vehículo del reporte (precargando la sugerencia si existe) o abrir el alta de vehículo nuevo desde el reporte. Ambas rutas reutilizan WRITE/add_cortes, generan `OP-FEEDBACK-{itemId}` estable y marcan el reporte resuelto solo después de confirmar el aporte; si queda candidato, el reporte permanece pendiente. Pruebas InboxUi 87/87 y AddCortesDiagnostics 12/12; CI 237 suites/2943 PASS.
- [x] Auditar la necesidad del ScriptLock fast-fail restante de FEEDBACK bajo §15. `reportProblem`/`suggestCutChange` protegen deduplicación por ID y append; `recordLike` protege el contador read-modify-write y unicidad actor/corte; PyS protege first-write-wins y asociaciones; tutoriales/video protegen unicidad de título y transiciones. No hay reemplazo drop-in seguro: mantener cada lock hasta implantar journal append-only/proyección o control de versión y sus regresiones. No sustituir por UserLock, que no coordina usuarios distintos.
- [x] Mostrar en ADMIN la vista previa y enlace seguro de las imágenes adjuntas a candidatos de corte/apertura/alimentación y a campos de imagen de `vehicle_update`; validar estrictamente URL canónica Drive y abrir con `noopener noreferrer`. Prueba `AdminVehicleContributionCandidateImagePreview` 8/8.
- [x] Conservar imágenes candidatas en `Imagenes_Reemplazadas`: `tipo_registro=candidata_aporte`, `origen_registro=aporte_vehiculo`, `tipo_contenido=aporte_candidato`, `estado=requiere_revision`. El inventario sincroniza candidatos actuales desde CATALOG y resoluciones desde AportesVehiculo; al aceptar/corregir/descartar actualiza a `en_uso`/`cancelada`. No permite marcar en uso ni eliminar mientras está pendiente o referenciada; un candidato descartado solo admite descarga/papelera si el escáner confirma cero referencias. Metadatos Drive se leen fuera del lock; escritura idempotente bajo el lock de esquema. Pruebas AdminReplacedImagesIntegrity 56/56, ReplacedImagesLibraryUX 14/14; CI 237 suites/2943 PASS.
- [x] Completar señalización UI de conflictos tardíos en el finalizador común de aportes desde modal de detalle y `HTML/add_cortes.html`: prevalece `candidateReviewPending` devuelto por WRITE aunque el refresco CATALOG no muestre todavía el candidato; si falla el refresco, se conserva el estado y no se anuncia como aplicado. `VehicleExpansionDetailRefresh` amplía cobertura.
- [x] Completar regresión local de concurrencia/idempotencia: vehículos distintos intercalados, mismo vehículo y slots, mismo opId idéntico/conflictivo, capacidad llena, VIN concurrente, respuesta perdida tras flush/appendRow y recuperación. `WriteContributionAppendConcurrency` 9/9; `WriteContributionRecovery` 9/9; `VehicleContributionProjection` incluye conflictos/candidatos y actualizaciones versionadas. CI 44835908125 SUCCESS: 239 suites, 2968 pruebas, 0 fallos. [ ] Concurrencia real de `appendRow` en Beta aislada.
- [x] Revisar alcance/consumidores de la reserva de ID de vehículo nuevo: `getNextCortesVehicleIdLocked` solo se invoca en WRITE bajo ScriptLock (alta nueva y `allocateVehicleId`); ADMIN solicita el ID a WRITE y transmite opId/operationHash cuando no es legacy. `CortesIdReservations` conserva reserva persistente, reintentos devuelven el mismo ID y huellas distintas se rechazan. Pruebas `WriteVehicleIdAllocationIdempotency`, `WriteVehicleIdAllocatorBoundedRead`, `VehicleIdAllocationEndToEnd`, `AdminVehicleIdAllocationIdempotency` y `AdminVehicleIdOutsideLock` incluidas en CI 44835751507 SUCCESS (239 suites/2968). Se conserva el lock breve de unicidad; no se reemplaza por IDs aleatorios ni se permite asignación fuera de él.

**Validación Beta diferida:** AUG-159, AUG-160 y pruebas de concurrencia real de `appendRow` con proyectos Apps Script, Spreadsheet y Drive aislados. No usar producción.

## P1 — GP-UX-RECENT-VIEWED-CACHE-PARALLEL-01

**Estado: COMPLETADA LOCALMENTE; aceptación visual Beta diferida.**

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
