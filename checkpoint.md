# Checkpoint activo — GPSpedia

Fecha: 2026-11-19

## Repositorio y ramas
- Repositorio: infogpstech/GPSpedia
- Rama autorizada: GPSpedia2.2.5_work
- HEAD de implementación funcional: e11056bca8759256871d7e7748a083b5d2b3af2e; commit documental de cierre: d7604b4f03b09ce99e76f285a581321f72ab7f49
- Rama base protegida GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificar)
- El historial completo previo está preservado en Checkpoint_Archive/checkpoint_2026-11-19_parte_003.md; ver Checkpoint_Archive/manifest.md.

## Normativa y arquitectura
- NORMAS_DESAROLLO.md es la única fuente normativa vigente.
- README.md describe la PWA, frontend, microservicios Apps Script y persistencia Sheets/Drive.
- contexto_personal.md confirma ramas y restricciones de publicación.
- No inferir deployments Apps Script ni permisos externos desde el código versionado.

## Última tarea completada
GP-PERF-WRITE-CUT-LOCK-06 — lectura acotada de entidades existentes:
- `getExistingEntities(sheet)` lee solo las columnas contiguas marca/modelo/versiones aplicables (3–5), sin consultar el ancho total de Cortes.
- Deduplica con `Set`, conservando orden de primera aparición y la normalización previa `String(value || "").trim()`.
- Prueba `WriteEntityLookupBoundedRead` 8/8 PASS: rango solicitado, orden, duplicados, offsets y hoja vacía.
- CI 44625164726 SUCCESS: 176 suites, 2,398 pruebas aprobadas, 0 fallos; sintaxis JavaScript aprobada.
- Health read-only 44625164725 SUCCESS.
- Commit funcional: 1cb5bd0cc133b434434b8b28e5fa5f1b40dab8d5.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó WRITE ni se modificaron Sheets/Drive productivos.

## Siguiente trabajo
Continuar GP-PERF-ADMIN-CUT-LOCK-01 / aislamiento entre operaciones independientes. El backlog conserva pendiente el inventario verificable de locks/proyectos Apps Script y las pruebas de no interferencia entre auditoría lenta, Inbox, health, login y registro de cortes, además de conflicto sobre el mismo recurso. Antes de modificar locks, inspeccionar los handlers y contratos actuales; no inferir que servicios distintos comparten o no proyecto Apps Script. Priorizar cambios que retiren esperas de funciones independientes sin debilitar la integridad de Cortes/Idempotencia. No desplegar Apps Script ni modificar datos productivos.

## Restricciones
- Trabajar únicamente en GPSpedia2.2.5_work.
- No modificar ni fusionar GPSpedia2.2.5.
- No desplegar Apps Script ni modificar Sheets/Drive productivos sin autorización expresa.
- Las validaciones reales de Drive/Spreadsheet, concurrencia y deployments quedan para Beta autorizada.


2026-11-19 — Siguiente subpaso P0: separar la sincronización markImageUploadLinked (Drive + ImageUploadLedger) del ScriptLock en handleAddOrUpdateCut; regresión añadida, CI pendiente. CI inicial detectó únicamente un mock incompleto de Spreadsheet en la prueba nueva; se ajusta getSheetByName sin cambiar la implementación. El segundo fixture de conflicto también necesitaba el mismo mock getSheetByName; se completa antes de repetir CI.

2026-11-19 — Cierre post-commit de vinculación de imágenes ADMIN: HEAD 8a3d70d404098cf8763379223dfb2d65c823b85c; CI 44593963972 intento 2 SUCCESS (165 suites, 2,316 pruebas, 0 fallos; test nuevo 12/12); health 44593963988 y Pages 44594081770 SUCCESS. Siguiente: reducir/revisar sección crítica de Sheets y pruebas de no interferencia entre funciones.

2026-11-19 — Siguiente optimización P0: getExistingEntities ahora limita la lectura a marca/modelo/versiones en lugar de cargar toda la fila de Cortes; regresión añadida, CI 44594845526 SUCCESS: 166 suites, 2,323 pruebas aprobadas, 0 fallos; AdminEntityLookupBoundedRead 7/7. Health 44594846847 y Pages 44594844590 SUCCESS.

Siguiente optimización P0: reducir el ancho de lectura de findVinDuplicateForAdmin y prepararVinCollectionForAdmin sin alterar detección de duplicados ni conflictos de VIN.

2026-11-19 — Siguiente optimización P0: findVinDuplicateForAdmin lee únicamente identidad, años y VIN en tres rangos acotados; regresión añadida, CI 44595220751 SUCCESS: 167 suites, 2,331 pruebas, 0 fallos; AdminVinDuplicateBoundedRead 8/8. Health 44595220797 y Pages 44595218915 SUCCESS.

Siguiente paso P0: revisar lecturas restantes y acortar la sección crítica de handleAddOrUpdateCut; preservar exclusión de Cortes/Idempotencia y crear pruebas de no interferencia con Inbox, health, login y auditoría.

2026-11-19 — Siguiente ajuste P0: reutilizar vinColumnIndex ya calculado en detección de duplicados y edición de colecciones VIN; evitar lecturas repetidas de encabezados. Regresión ampliada, CI pendiente.

2026-11-19 — CI 44596161669 SUCCESS: 167 suites, 2,334 pruebas, 0 fallos; AdminVinDuplicateBoundedRead 11/11. Health 44596161551 y Pages 44596160331 SUCCESS.

Siguiente paso P0: auditar y reducir lecturas restantes dentro del ScriptLock de handleAddOrUpdateCut; preservar exclusión de Cortes/Idempotencia y completar pruebas de no interferencia entre Inbox, health, login, auditoría y registro de cortes.

2026-11-19 — Siguiente optimización P0: findUniqueCortesVehicleRow_ ahora escanea únicamente la columna ID y lee la fila completa solo tras confirmar una coincidencia única; regresión añadida, CI pendiente.

2026-11-19 — Revisión del diff de localización por ID encontró tres declaraciones globales de findUniqueCortesVehicleRow_; la última sobrescribía la optimización y seguía usando getDataRange. Se conserva una única implementación acotada y se amplía la prueba para detectar duplicados. CI pendiente.

2026-11-19 — Cierre ADMIN localización por ID: HEAD 38ec5ae42c2325a1c331e8fe2ea906108ad66b63; CI 44614041417 SUCCESS (168 suites, 2,347 pruebas, 0 fallos; AdminUniqueVehicleRowBoundedRead 13/13); health read-only 44614041045 SUCCESS; Pages 44613910857 SUCCESS sobre el commit funcional b9bc06d. Diff revisado: una sola declaración efectiva, sin getDataRange en el localizador. Pendiente solo validación real en Beta autorizada. Próximo paso: sección crítica restante de handleAddOrUpdateCut y aislamiento entre funciones independientes.


2026-11-19 — En progreso GP-PERF-ADMIN-CUT-LOCK-01: se confirma que addOrUpdateCut se enruta a WRITE y ADMIN rechaza la ruta heredada. Próxima optimización: mover autenticación contextual, lectura de listas y validación del payload fuera del ScriptLock WRITE; acotar columnas leídas en Cortes/Relay. CI pendiente.


2026-11-19 — Cierre preflight WRITE: HEAD 3cb7fb0e277daaf4d2aa263d7cfe4a08ba19a734; CI 44615757832 SUCCESS (169 suites, 2,348 pruebas, 0 fallos); health 44615757812 SUCCESS; Pages 44615756805 SUCCESS. El preflight de addOrUpdateCut se ejecuta antes del ScriptLock y lee solo las columnas requeridas. Próximo paso: reducir llamadas/flushes dentro de la sección crítica sin debilitar la idempotencia.


2026-11-19 — Cierre de lotes WRITE: HEAD funcional c67964b3984965910688b5a3f0448bf487cba41a; CI 44616477533 SUCCESS (170 suites, 2,349 pruebas, 0 fallos); health 44616477539 SUCCESS; Pages 44616474879 SUCCESS. La persistencia de cortes reduce llamadas setValue mediante lotes contiguos, manteniendo reservas VIN/opId previas a Drive. Próximo paso: lectura heredada de findRowByOpId.


2026-11-19 — Cierre de búsqueda heredada WRITE: HEAD 833de2d87faab2203ebc2fe213a4f9f2afb1ac74; CI 44617280202 SUCCESS (171 suites, 2,358 pruebas, 0 fallos); health 44617280343 SUCCESS; Pages 44617279984 SUCCESS. La búsqueda legacy de opId ya no transfiere toda la hoja Cortes; mantiene las comprobaciones de ambigüedad y vehículo. Próximo paso: auditar lecturas repetidas del ledger Idempotencia.


2026-11-19 — Cierre localizador WRITE: HEAD e293e4152c6feba57badfc711bf0cee95f0ef769; CI 44617773715 SUCCESS (172 suites, 2,364 pruebas, 0 fallos; WriteUniqueVehicleRowBoundedRead 6/6); health 44617773600 SUCCESS; Pages 44617772427 SUCCESS. El localizador efectivo ya no usa getDataRange y no hay declaraciones duplicadas. Próximo paso: reutilizar lecturas validadas del ledger Idempotencia.


2026-11-19 — Cierre fast path Idempotencia: HEAD 125cb7c5ec8fb3e8a05c1e04c6680fcbf50fcf54; CI 44618414190 SUCCESS (173 suites, 2,370 pruebas, 0 fallos; IdempotenciaSheetLookupFastPath 6/6); health 44618414220 SUCCESS; Pages 44618411994 SUCCESS. La hoja A:F compatible ya no se reinicializa ni valida integralmente en cada get; los callsites siguen validando el ledger explícitamente. Próximo paso: reutilizar snapshot por operación.


2026-11-19 — Cierre snapshot Idempotencia: HEAD funcional e034fbf44e8795170ebae1e3a6293db0b17b50e7; CI 44619301598 SUCCESS (174 suites, 2,379 pruebas, 0 fallos; WriteIdempotencySnapshotReuse 9/9); health 44619301575 SUCCESS; Pages 44619301580 SUCCESS. El handler realiza una validación integral del ledger por operación y usa verificaciones dirigidas en las fases de escritura. Próximo paso: auditar el asignador de IDs de Cortes.


2026-11-19 — Cierre asignador WRITE: HEAD funcional 8d72fe40c731da53066c7e9059e280b502385b07; CI 44620038256 SUCCESS (175 suites, 2,390 pruebas, 0 fallos; WriteVehicleIdAllocatorBoundedRead 11/11); health 44620038295 SUCCESS; Pages 44620037793 SUCCESS. El asignador inspecciona solo IDs y filas candidatas, manteniendo el contador central. Próximo paso: acotar lectura de entidades existentes.


2026-11-19 — En progreso GP-PERF-WRITE-CUT-LOCK-06: getExistingEntities limita lectura a columnas contiguas marca/modelo/versiones y usa Set para deduplicar preservando orden/normalización. Prueba WriteEntityLookupBoundedRead añadida al runner; CI pendiente.


2026-11-19 — Cierre GP-PERF-WRITE-CUT-LOCK-06: HEAD funcional 1cb5bd0cc133b434434b8b28e5fa5f1b40dab8d5; CI 44625164726 SUCCESS (176 suites, 2,398 pruebas, 0 fallos; WriteEntityLookupBoundedRead 8/8); health read-only 44625164725 SUCCESS. Diff revisado. Siguiente: continuar aislamiento entre operaciones independientes y reducir sección crítica restante de WRITE/ADMIN.


2026-11-19 — Continuidad GP-PERF-ADMIN-CUT-LOCK-01: se amplió SharedMutationCoordinator.js para verificar que la lease de auditoría IMAGE_AUDIT_STATE coexiste con sendInboxMessage y getServiceTraffic, conservando exclusión entre auditorías duplicadas. AdminAuditTrail.mjs ahora comprueba que el ping de salud se enruta sin lease de auditoría ni ScriptLock. Las pruebas existentes cubren auditoría frente a login AUTH y registro WRITE, además de conflictos sobre el mismo recurso. CI 44626115506 SUCCESS: 176 suites, 2,400 pruebas aprobadas, 0 fallos; AdminAuditTrail 16/16 y Coordinador compartido/concurrencia/leases 83/83. Health read-only 44626115768 SUCCESS; GitHub Pages 44626113303 SUCCESS. Commits de pruebas: 76d5e7bcdd5ab303fc6faa36f62fd86fc6c35a36 y 05021be1f1c8466c2490cd45bc5c0f5a42f597dd.

La tarea P0 continúa EN PROGRESO. El inventario de archivos no encuentra .clasp.json ni appsscript.json; por tanto, los Script IDs/proyectos reales asociados a cada fuente no se pueden demostrar con el repositorio. No inferir aislamiento real a partir de URLs de deployment. En handleAddOrUpdateCut, runAdminDriveWorkOutsideScriptLock_ ejecuta la operación Drive bajo el ScriptLock cuando opId está vacío; antes de cambiarlo debe confirmarse el contrato de compatibilidad y diseñarse reserva/revalidación segura. Pendiente prueba real de concurrencia en Beta autorizada. HEAD actual de trabajo: cecceba9f2afd84a87be2bed440d4995adcdce59. Rama base verificada sin cambios: d9acc68d889985c2e2f42fe3a02e502efc86ead1.


El commit d3ef0ede871476e996167f33a18a17cc635d3ebd es el último cambio registrado en ChangesLogs.txt; el commit posterior de checkpoint solo actualiza este puntero documental, sin alterar código ni pruebas.


## Continuidad — implementación WRITE de 2026-11-19
Tarea local completada: reutilización de la fila localizada durante `addOrUpdateCut` para vehículo existente.
- `handleAddOrUpdateCutLocked` pasa la fila única ya localizada al handler de persistencia; se elimina la segunda lectura de la columna ID y la segunda lectura completa de fila.
- `getPreparedExistingVehicleRow_` reutiliza la instantánea si el ancho coincide; si el esquema cambia, lee únicamente la fila objetivo y comprueba que el ID siga siendo el solicitado.
- Pruebas: `WriteCutExistingVehicleSnapshotReuse` 4/4 PASS; `WriteIdempotencySnapshotReuse` 9/9 PASS.
- CI `44626945883` SUCCESS: 177 suites, 2,404 pruebas aprobadas, 0 fallos; sintaxis JS SUCCESS. Health read-only `44626945680` SUCCESS.
- Commits de implementación/pruebas: `a227e0981e058795f161eee4c6b2acc18575a4df`, `b7f835106419d73e893fee86b3920e40a287ccc0`, `28aaecd6de6a022078b1563d1bfe1229e4f28f3e`, `0f7394798a144b242ad2ad2a915344c28eb143fb`, `5a612e068950e6911e0522047728d1c5134e634d`, `a7717124cd95af40411963637ec981dfcb63f852`.
- Registros de tarea/changelog actualizados en commits `348835d53fb0de3e6e4264713f59f627728982af` y `5a1543f413d8dcb265e847eeee44f5c09dc9c3b0`.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó WRITE ni se modificaron Sheets/Drive productivos.

Siguiente implementación pendiente en el backlog WRITE: reducir el coste de la asignación de vehicleId, que actualmente escanea la columna ID completa y reconcilia IDs manuales/duplicados bajo ScriptLock. No sustituir esa protección por un contador rápido sin una estrategia que conserve la detección de IDs manuales, duplicados, filas incompletas y fórmulas. Continúa también GP-PERF-ADMIN-CUT-LOCK-01 para optimizar la sección crítica restante; las pruebas Beta reales siguen diferidas.


## Continuidad — preflight idempotente ADMIN (2026-11-19)
- En `handleAddOrUpdateCut`, el `opId` y la huella SHA-256 se resuelven/validan antes de solicitar el ID remoto a WRITE y antes de tomar el `ScriptLock` ADMIN.
- Esto evita consumir IDs en solicitudes con `operationHash` inválido y reduce trabajo dentro de la sección crítica. La recuperación y revalidación de `opId` permanecen protegidas dentro del lock.
- Se conserva la compatibilidad con `opId` legacy extraído de `payload.colaborador`.
- Prueba `AdminCutPreflightBeforeAllocation` 7/7 PASS; CI `44627981794` SUCCESS: 178 suites, 2,411 pruebas aprobadas, 0 fallos; health read-only `44627981620` SUCCESS.
- Commits: implementación `4965e8dc`, registro de prueba `1cce90ea`, prueba `316b6cf6`, corrección regex `4c5cffb5`, backlog `089f0f7b`.
- HEAD de trabajo antes de registros finales: `089f0f7baea909db0986b12c51394cda634b15d7`; rama base sin cambios: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Estado de subactividad: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. La tarea P0 `GP-PERF-ADMIN-CUT-LOCK-01` sigue EN PROGRESO; siguiente implementación: resolver la sección crítica restante del handler y el flujo legacy sin `opId` mediante reserva/revalidación segura. No desplegar ni tocar datos productivos.

- Ampliación: extracción de prefijo VIN y cálculo del timestamp administrativo trasladados también antes del lock; pruebas locales 7/7 y regresión integral confirmada.
- Commits adicionales: implementación `6bb1a6a2`, ampliación de prueba `8a2d3e23`, backlog actualizado en el siguiente commit.


## Continuidad — reserva ADMIN legacy sin opId (2026-11-19)
- `handleAddOrUpdateCut` genera `OP-LEGACY-<UUID>` y calcula una huella interna cuando el cliente no envía `opId`.
- Para vehículos existentes y nuevos registra una reserva `pending` en Idempotencia antes de ejecutar Drive fuera del ScriptLock; al readquirir el lock, revalida la fila, vehículo, slot y hash antes de persistir.
- Las respuestas exitosas devuelven `opId` y `operationHash`; los errores de reacquisición o Drive incluyen los datos necesarios para reintentar.
- `AdminLegacyCutReservation` 9/9 PASS; CI `44628738510` SUCCESS: 179 suites, 2,420 pruebas aprobadas, 0 fallos; health read-only `44628738518` SUCCESS.
- Commits: implementación `36387085`, integración y reserva `2ec4983b`, runner `a88940b3`, prueba `09ce828e`.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. La carga Drive legacy ya no mantiene ScriptLock; la reducción adicional de la sección crítica de Sheets sigue pendiente. No se desplegó ADMIN ni se modificaron datos productivos.


## Continuidad — preflight de entidades ADMIN fuera del lock (2026-11-19)
- En `handleAddOrUpdateCut`, la lectura de marcas/modelos/versiones existentes, la normalización de entidades y el parseo de `anoDesde` ahora se preparan antes de adquirir `ScriptLock` para altas nuevas.
- Se usa una copia de `vehicleData`; el payload original no se modifica. La reserva de fila/ID, las comprobaciones de VIN/opId y la persistencia permanecen en la sección protegida; la carga Drive continúa fuera del lock.
- Prueba `AdminCutEntityPreflight.mjs`: 7/7 PASS. CI `44629325732` SUCCESS: 180 suites, 2,427 pruebas aprobadas, 0 fallos; sintaxis JS aprobada.
- Commit de código `9b5bc661d6f6a76ec9cb5ecee0225e99c7de5540`; prueba `cabc7385d2138309c9416d9f3391aa130ab78d70`; runner `bab825c07db2feb7f24a280b81d37ef8b01ab577`.
- `GP-PERF-ADMIN-CUT-LOCK-01` sigue EN PROGRESO: otras lecturas/escrituras de Sheets aún permanecen bajo el ScriptLock. No se desplegó Apps Script ni se modificaron datos productivos.

- Verificación posterior: health read-only `44629325982` SUCCESS en el HEAD de código `bab825c07db2feb7f24a280b81d37ef8b01ab577`; regresión `44629451857` SUCCESS en el HEAD documental previo, 180 suites / 2,427 pruebas / 0 fallos.


## Continuidad — búsqueda de vehículo ADMIN fuera del lock (2026-11-19)
- En `handleAddOrUpdateCut`, la búsqueda de la fila por ID para vehículos existentes ahora lee la columna antes de adquirir `ScriptLock`.
- Bajo lock se revalida la celda ID de la fila candidata antes de acceder al snapshot completo o modificarla. Una posición obsoleta provoca aborto seguro; no se escribe sobre otra fila.
- Prueba `AdminExistingVehicleLookupPreflight.mjs`: 7/7 PASS. CI `44629836237` SUCCESS: 181 suites, 2,434 pruebas aprobadas, 0 fallos. Health read-only `44629836299` SUCCESS.
- Commits: código `570840a859c78521c6e6e8f066d5c77077d14ada`; prueba `fc21c17e368296620dd6321172346f3c833bcd67`; runner `22a05a7274153984d65e03806ed055f8988c0c01`.
- `GP-PERF-ADMIN-CUT-LOCK-01` sigue EN PROGRESO: la reserva, lectura de fila objetivo, selección de slot, validación de VIN y escrituras críticas siguen protegidas; quedan más operaciones de Sheets por separar sin debilitar atomicidad. No se desplegó Apps Script ni se modificaron datos productivos.


## Continuidad — acceso rápido al ledger Idempotencia ADMIN (2026-11-19)
- `findOrCreateIdempotenciaSheet` ahora devuelve directamente la hoja primaria o fallback cuando sus encabezados A:F están completos y son compatibles; solo ejecuta `initializeIdempotenciaSheet` cuando se requiere reparar/crear la estructura.
- La validación integral de las filas no se eliminó: los callsites de recuperación y registro siguen ejecutando `readIdempotenciaEntries_`. Se conserva el rechazo de encabezados inseguros y la reparación de encabezados faltantes.
- Prueba `AdminIdempotenciaSheetLookupFastPath.mjs`: 6/6 PASS; runner integrado.
- CI `44631635536` SUCCESS: 182 suites, 2,440 pruebas aprobadas, 0 fallos; `node --check JS/Services/admin.js` aprobado.
- Commits: código `b963f2d4e3c8e1242e014b624e4cd684035a7005`; prueba `4d72437e24abd9c2d1db02251c5bd35e8f768f46`; runner `11afd89eb34c84e601a81bea016c2583440cdcae`.
- Registros: tareas `c0e9a092837c9acb02aaa009314a6962b7397d7b`; changelog `6ba7b05df01a8debd992fb64449a799a28056054`.
- No se desplegó Apps Script ni se modificaron Sheets/Drive productivos. Pendiente validación real en Beta autorizada.
- Siguiente implementación: inspeccionar las lecturas de encabezados y la comprobación/reparación de columnas (`ensureTestigoColumns`, `getVinColumnIndex`) que aún se ejecutan dentro de la sección crítica. Evaluar prelectura + revalidación dirigida o evitar consultas redundantes cuando el esquema ya está completo; conservar creación/reparación segura y no trasladar mutaciones fuera del lock.


## Continuidad — snapshot idempotente ADMIN compartido (2026-11-19)
- La rama ya contiene la reutilización de un snapshot integral del ledger Idempotencia por cada operación `handleAddOrUpdateCut`. `findRowByOpId`, `recordOpId` y revalidaciones tras Drive comparten la misma referencia; las comprobaciones dirigidas verifican la entrada actual y detectan cambios de asociación/estado.
- Se mantiene la lectura integral única para detectar filas inválidas y `opId` duplicados; después de cada escritura el snapshot se actualiza con la entrada verificada. No se debilita la transición pending → completed.
- Prueba `AdminIdempotencySnapshotReuse.mjs`: 10/10 PASS. CI `44632610105` SUCCESS: 183 suites, 2,450 pruebas aprobadas, 0 fallos; health read-only `44632610206` SUCCESS.
- HEAD de código y prueba antes de registros: `063d9ae079c5db56b87f08cac99c92ead1ac8a9a`. Commits de implementación: `748d9f5c868571607d90a3fe805283112f74e276` y refinamientos relacionados. Registros actualizados después.
- Próximo objetivo dentro de `GP-PERF-ADMIN-CUT-LOCK-01`: evaluar las lecturas de `findVinDuplicateForAdmin` y `findUniqueCortesVehicleRow_` para reducir datos transferidos o consultas repetidas, considerando TextFinder/lecturas dirigidas solo si conservan detección de duplicados, filas ambiguas y validación de concurrencia. No eliminar la comprobación de unicidad ni moverla fuera de la exclusión sin revalidación segura.
- No se desplegó Apps Script ni se modificaron Sheets/Drive productivos. La concurrencia real y la validación de datos permanecen pendientes de Beta autorizada.


## Continuidad — encabezados ADMIN compartidos en registro y recuperación (2026-11-19)
- `ensureTestigoColumns` ahora realiza una sola lectura de encabezados para validar duplicados VIN y nombres testigo; ya no llama a `getVinColumnIndex` ni vuelve a leer AT:AV por separado.
- Devuelve `vinColumnIndex` y el snapshot de encabezados, actualizando AT:AV en memoria tras la reparación. `handleAddOrUpdateCut` reutiliza ambos resultados y evita otra lectura completa de encabezados al resolver la columna de operación durante la recuperación idempotente.
- Las mutaciones/reparaciones AT:AV permanecen bajo ScriptLock. Se conservan los rechazos de VIN/testigo duplicados y de columnas con datos sin encabezado.
- Prueba `AdminTestigoHeaderReadReuse.mjs`: 7/7 PASS. CI `44633178723` SUCCESS: 184 suites, 2,457 pruebas aprobadas, 0 fallos; health read-only `44633178689` SUCCESS.
- Commits de implementación/prueba: `2c2c1bfc9bae29feba3d21b2c3b9c1d45d599c72`, `f9bc11298245c9d462eae8f264baa61442bad23d`, `aac6700e4abbd5d6a63787999f0abb0c543a0f92`, `d481c18112b5e43c11f4aadad865a2ee9d20b91d`, `3736fb988c6889051c589e23380ac802012c3d1b`. Runner `3731b9149eaa46fd4af222fa966dff80533ef5f9`.
- No se desplegó Apps Script ni se modificaron Sheets/Drive productivos. Validación real y concurrencia siguen pendientes de Beta autorizada.


## Estado remoto verificado — 2026-11-19
- HEAD de `GPSpedia2.2.5_work`: `7e1296fb7871358267658e4836bbb6a0cdc66ed7`.
- Rama base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1` (sin modificaciones).
- Regresión sobre el código, pruebas, runner y registros de tarea/changelog: CI `44633296363` SUCCESS, 184 suites / 2,457 pruebas / 0 fallos; health read-only `44633296340` SUCCESS. El último commit posterior corresponde únicamente a este checkpoint.
- `GP-PERF-ADMIN-CUT-LOCK-01` continúa EN PROGRESO; siguiente revisión: lecturas de VIN e identificación de vehículo en `findVinDuplicateForAdmin` y `findUniqueCortesVehicleRow_`, con prioridad en preservar detección de duplicados y concurrencia.


## Continuidad — ADMIN escrituras por lote (2026-11-19)
- Se completó una optimización localizada en la rama de vehículo existente de `handleAddOrUpdateCut`: los cinco campos consecutivos del slot se escriben con una llamada `setValues()`.
- Testigo y colaborador siguen separados debido a sus posiciones no contiguas; se preservan las reservas pending/completed, VIN, timestamp, flush y la sincronización de imágenes fuera del lock.
- Prueba integrada: `AdminCutSlotBatchWrites.mjs`; CI `44633759321` SUCCESS y health read-only `44633759352` SUCCESS sobre HEAD `e11056bca8759256871d7e7748a083b5d2b3af2e`.
- Commits: `31fe4a4577d9212ec39ee25a665995e836a7a0fb` (código, prueba y runner); `e11056bca8759256871d7e7748a083b5d2b3af2e` (ajuste de aserción de prueba).
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó ADMIN ni se modificaron datos productivos.
- Siguiente paso: revisar las restantes lecturas/escrituras de Sheets bajo el ScriptLock en `handleAddOrUpdateCut` y seleccionar la siguiente reducción segura de llamadas, manteniendo la atomicidad de Cortes/Idempotencia.


## Continuidad — ADMIN recuperación con escrituras por lote (2026-11-19)
- Se agruparon las reparaciones de campos faltantes de vehículo (columnas 2–8) en un único `setValues()` y los cuatro campos contiguos del slot de corte en otro.
- La lógica solo sustituye campos vacíos; conserva marca/tipo/años existentes, normalización de rangos, testigo y colaborador separados, VIN, timestamp y transición idempotente.
- Prueba nueva `AdminRecoveryRepairBatchWrites.mjs` integrada en `RunServiceTests.mjs`; incluye simulación de escrituras y caso sin cambios.
- CI `44634550285` SUCCESS: sintaxis y suite completa de regresión aprobadas; health read-only `44634550314` SUCCESS sobre el mismo HEAD.
- Diff revisado: seis archivos, sin cambios ajenos al objetivo.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.
- Commit funcional: `65a4aa5f873e7f88c7230c837206c56743bb40b8`.
- Próximo paso: continuar con la siguiente reducción segura de llamadas a Sheets en la recuperación ADMIN, conservando el lock para las reservas y escrituras atómicas.


## Continuidad — fast path de imágenes en recuperación ADMIN (2026-11-19)
- `getAdminRecoveryImageRepairNeeds_` detecta si la recuperación necesita reparar la imagen del vehículo, la imagen del slot o ambas.
- Si ninguna requiere reparación, `handleAddOrUpdateCut` ya no entra en `runAdminDriveWorkOutsideScriptLock_`: conserva el ScriptLock adquirido y evita la reacquisición y la consulta posterior de `findRowByOpId`.
- Si alguna imagen falta, se mantiene el flujo Drive fuera del lock y la revalidación de opId, vehículo, slot y operationHash.
- Prueba `AdminRecoveryImageRepairFastPath.mjs` integrada en `RunServiceTests.mjs`; resultado de CI pendiente.
- No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.


### Nota de corrección de prueba — fast path de imágenes ADMIN
- La primera CI del commit `c7ac5e081a7ce63a064ce1a5919375ad976fd159` aprobó sintaxis y health read-only, pero la suite falló en una aserción de la prueba nueva que inspeccionaba todo el handler y contaba otra ruta Drive no relacionada.
- La prueba se limita ahora al bloque de recuperación idempotente; se ajustó también la indentación del bloque condicional. No se modificó el comportamiento funcional adicional.
- Repetición de regresión pendiente.


## Cierre — fast path de imágenes en recuperación ADMIN (2026-11-19)
- Commit funcional y de prueba: c7ac5e081a7ce63a064ce1a5919375ad976fd159; corrección de aserción y formato: 24a5b061ca258a53003e2fe2d889f178cb2dde03.
- La detección previa de imágenes evita el ciclo runAdminDriveWorkOutsideScriptLock_ cuando no falta ninguna imagen, conservando el lock y evitando una reconsulta de la fila/ledger. Si falta una imagen, se conserva Drive fuera del lock y la revalidación idempotente.
- Prueba AdminRecoveryImageRepairFastPath: 6/6 PASS.
- CI 44635382990 SUCCESS: 187 suites, 2476 pruebas aprobadas, 0 fallos; sintaxis JavaScript aprobada.
- Health read-only 44635382893 SUCCESS.
- Pages 44635380904 estaba QUEUED al momento del registro; no se declara como aprobado.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.
- Siguiente actividad: continuar la reducción de lecturas individuales/costos de revalidación restantes en recuperación ADMIN, sin sacar del lock las escrituras o reservas que requieran atomicidad.


## Continuidad — snapshot de imágenes en recuperación ADMIN (2026-11-19)
- En el callback de revalidación de imágenes, al escribir una URL faltante en Cortes también se actualiza el índice correspondiente de `verified.rowValues`.
- Tras recuperar el registro, `rowValues` refleja tanto las URL existentes como las reparadas. La llamada a `markAdminCutImagesLinkedOutsideLock_` reutiliza esas posiciones y elimina dos llamadas individuales `getValue()`.
- Se conserva la escritura condicional (no reemplaza URL válida), la vinculación del ledger y el trabajo Drive fuera del lock.
- Prueba `AdminRecoveryImageSnapshotReuse.mjs` integrada en el runner; CI pendiente.
- No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.


## Cierre — reutilización del snapshot de imágenes en recuperación ADMIN (2026-11-19)
- Commit de implementación/prueba: `501fd3529a4dfeeb5f341cb192c86e152f2fb6e7`; corrección de mocks: `4303ee585ead1654e94e3fb0c21f7c8f24cbe95d`; ajuste de delimitación de prueba: `95ede1391a80ad2efa73c2a4dd3d888312f02c38`.
- Se eliminan dos llamadas individuales `getValue()` de la fila Cortes al pasar las URL a `markAdminCutImagesLinkedOutsideLock_`; se reutiliza `rowValues`.
- Cuando la revalidación escribe una URL faltante, actualiza también `verified.rowValues` en memoria. La ruta de URL válida existente no se sobrescribe.
- Prueba `AdminRecoveryImageSnapshotReuse`: 7/7 PASS.
- CI `44636292022` SUCCESS: 188 suites, 2,483 pruebas aprobadas, 0 fallos; sintaxis JavaScript aprobada.
- Health read-only `44636291825` SUCCESS.
- Pages `44636291778` estaba QUEUED al cierre; no se declara como aprobado.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.
- Siguiente tarea: inspeccionar la recuperación ADMIN para reducir otra lectura individual de Sheets o costo de revalidación que pueda evitarse usando el snapshot existente, sin debilitar la reserva idempotente ni la atomicidad de las escrituras.


## Continuidad — revalidación de vehicleId desde snapshot en ADMIN (2026-11-19)
- En la rama de vehículo existente de `handleAddOrUpdateCut`, la fila se lee una vez bajo ScriptLock y el ID se valida desde `rowValues[COLS_CORTES.id - 1]`.
- Se elimina la llamada individual `getRange(rowIndex, COLS_CORTES.id).getValue()`, sin retirar la revalidación ni moverla fuera del lock.
- La búsqueda de fila candidata sigue fuera del lock; el snapshot bajo lock es la fuente de identidad antes de mapear y escribir.
- Pruebas actualizadas: `AdminExistingVehicleLookupPreflight.mjs`; nueva `AdminExistingVehicleSnapshotRevalidation.mjs`.
- CI pendiente. No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.


### Nota de CI — snapshot de vehicleId en ADMIN
- La primera ejecución detectó una aserción excesiva: contaba también la lectura posterior a Drive usada para preparar VIN.
- Se acotó la prueba al tramo anterior a Drive. La lectura posterior se conserva porque cumple una función distinta.
- Repetición de regresión pendiente.


## Cierre — revalidación de vehicleId desde snapshot en ADMIN (2026-11-19)
- Commit funcional/pruebas: `c018efb4591d1fa53e8b2b31d9b90aa99062966f`; corrección de alcance de prueba y registro de CI: `e253a187a970cca1d9e54595a445826d9ce90778`.
- La rama de vehículo existente de `handleAddOrUpdateCut` ya no ejecuta `getRange(rowIndex, COLS_CORTES.id).getValue()`; lee la fila completa una vez antes de Drive y valida el ID desde `rowValues[COLS_CORTES.id - 1]`.
- La búsqueda previa de la fila sigue fuera del ScriptLock y la validación final sigue dentro del lock. Se conserva la segunda lectura posterior a Drive porque prepara la colección VIN después de la espera externa.
- `AdminExistingVehicleLookupPreflight`: 8/8 PASS. `AdminExistingVehicleSnapshotRevalidation`: 7/7 PASS.
- CI `44636938042` SUCCESS: 189 suites, 2,491 pruebas aprobadas, 0 fallos; sintaxis aprobada.
- Health read-only `44636938094` SUCCESS.
- Pages `44636937345` estaba IN_PROGRESS al registrar el cierre; no se declara como aprobado.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron datos productivos.
- Siguiente tarea: continuar inspeccionando la recuperación/alta ADMIN para eliminar lecturas individuales que sean duplicadas por un snapshot posterior, sin reducir las revalidaciones que protegen concurrencia e integridad.


## Continuidad — alta de vehículos nuevos ADMIN con escrituras por lote (2026-11-19)
- El alta nueva agrupa los campos de vehículo (categoría a imagen, columnas 2–9) en un setValues() y los campos del primer corte (12–16) en otro.
- Timestamp (37), testigo (46) y colaborador (18) permanecen como escrituras separadas por no ser contiguas.
- Se conserva lectura de confirmación del ID centralizado, reserva idempotente pending antes de Drive y completed después de flush, con las cargas Drive fuera del ScriptLock.
- Nueva prueba `AdminNewVehicleBatchWrites.mjs` verifica el mapa de columnas, valores escritos, cinco llamadas finales, y orden de ID/reserva/Drive/completado.
- Validación local/CI pendiente. No se desplegó Apps Script ni se modificaron datos productivos.


## Cierre — alta de vehículos nuevos ADMIN con escrituras por lote (2026-11-19)
- Commit de código/prueba: `c8b3591fa78624721b355e6f1ba1e2360c06f456`.
- El alta nueva escribe categoría, marca, modelo, versiones, años, encendido e imagen en un lote contiguo de columnas 2–9; el primer corte (tipo, ubicación, color, relay e imagen) en otro lote de columnas 12–16.
- Timestamp, testigo y colaborador se mantienen separados. Se conserva la lectura de confirmación del ID WRITE, la reserva pending antes de Drive, la carga de imágenes fuera del lock y el completed posterior al flush.
- `AdminNewVehicleBatchWrites`: 13/13 PASS.
- CI `44637971280` SUCCESS: 190 suites, 2,504 pruebas aprobadas, 0 fallos; sintaxis JavaScript aprobada.
- Health read-only `44637971232` SUCCESS.
- Pages `44637970083` pendiente al registrar este cierre; no se declara aprobado.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron datos productivos.
- Siguiente paso: continuar `GP-PERF-ADMIN-CUT-LOCK-01` inspeccionando el alta de vehículo nuevo para reducir llamadas de Sheets que no comprometan la lectura de confirmación del ID, las reservas idempotentes ni la integridad de la fila.


## Cierre — alta de vehículos nuevos ADMIN con escrituras por lote (2026-11-19)
- Commit de implementación/prueba: `c8b3591fa78624721b355e6f1ba1e2360c06f456`.
- Se sustituyeron 13 escrituras individuales de campos contiguos por dos lotes `setValues()`: vehículo (columnas 2–9) y primer corte (12–16). Timestamp, testigo y colaborador siguen como escrituras separadas.
- Prueba `AdminNewVehicleBatchWrites.mjs`: 13/13 PASS; verifica valores, rangos, cinco escrituras finales y preservación del orden ID → reserva pending → Drive → escritura/flush → completed.
- CI regresión `44637971280` SUCCESS: 190 suites, 2,504 pruebas aprobadas, 0 fallos; sintaxis aprobada.
- Health read-only `44637971232` SUCCESS; Pages `44637970083` SUCCESS.
- No se desplegó Apps Script ni se modificaron datos productivos.
- Siguiente tarea: inspeccionar lecturas de fila y revalidaciones del alta nueva después de Drive para identificar una consulta redundante demostrable sin alterar concurrencia ni recuperación idempotente.


## Continuidad — snapshot post-Drive para alta de corte en vehículo existente (2026-11-19)
- En el callback post-Drive de la rama de vehículo existente, `findRowByOpId` ya valida la entrada de idempotencia y llama a `findUniqueCortesVehicleRow_`, que verifica la unicidad del ID y lee la fila completa actual.
- Se reutiliza `verified.rowValues` para preparar VIN, eliminando la lectura integral duplicada inmediatamente posterior.
- Se mantienen las validaciones de fila, vehículo, slot, hash y slot aún vacío. El fallback de lectura sigue disponible cuando no hay opId.
- Nueva prueba `AdminExistingVehiclePostDriveSnapshotReuse.mjs` integrada en el runner.
- CI pendiente. No se desplegó Apps Script ni se modificaron datos productivos.


### Nota de CI — snapshot post-Drive de vehículo existente
- La primera regresión falló por una aserción demasiado estricta: también rechazaba el fallback de lectura para ausencia de snapshot.
- Se ajustó el test para comprobar que la lectura queda protegida por `verifiedRowValues ||`, de modo que solo se ejecuta si no existe snapshot verificado.
- Implementación funcional sin cambios; repetición de CI pendiente.


### Segunda nota de CI — snapshot post-Drive de vehículo existente
- La segunda ejecución falló por el escape duplicado del operador `||` en el patrón regex de la prueba, no por la lógica funcional.
- El patrón se reescribe para reconocer el fallback condicionado correctamente. Nueva regresión pendiente.


## Cierre — reutilización de snapshot post-Drive en ADMIN (2026-11-19)
- Implementación: `12f1c9d92f5f3eddd8a255ead0db5dc7af71284d`; correcciones de prueba: `f27092ddc40d4ba3e3f13aba0cf5c6e02f4fe8f3`, `c9101a81a8574e9133bb8d4335d837eed3f3e4d9`.
- En la rama de vehículo existente, `findRowByOpId` obtiene y devuelve la fila completa después de Drive tras comprobar unicidad. Se reutiliza `verified.rowValues` para preparar VIN; la lectura integral adicional queda como fallback únicamente si no hay snapshot/opId.
- Se preservan las comprobaciones de rowIndex, vehicleId, slotIndex, operationHash y slot vacío. No se reutiliza el snapshot anterior a Drive.
- Prueba `AdminExistingVehiclePostDriveSnapshotReuse`: 9/9 PASS.
- CI regresión `44639307547` SUCCESS: 191 suites, 2,513 pruebas aprobadas, 0 fallos.
- Health read-only `44639307367` SUCCESS; Pages `44639306388` SUCCESS.
- Las dos primeras CI fallaron por aserciones demasiado estrictas/escapadas en el test; la tercera aprobó. No se cambió la lógica funcional por esos fallos.
- No se desplegó Apps Script ni se modificaron datos productivos.
- Siguiente tarea: revisar si el preflight de VIN y la revalidación post-Drive hacen consultas duplicadas a la columna VIN que puedan combinarse sin omitir detección de duplicados concurrentes.


## Continuidad — ID del vehículo nuevo desde snapshot post-Drive (2026-11-19)
- La revalidación posterior a Drive en la rama de vehículo nuevo ya no vuelve a consultar `getRange(rowIndex, COLS_CORTES.id).getValue()`.
- Usa `verified.rowValues[COLS_CORTES.id - 1]`, parte de la fila completa que `findRowByOpId` obtiene después de validar la unicidad del vehículo.
- Se mantienen las comprobaciones de rowIndex, vehicleId, slotIndex y operationHash; no se debilita la reserva idempotente.
- Nueva prueba `AdminNewVehiclePostDriveIdSnapshotReuse.mjs` integrada al runner.
- CI pendiente. No se desplegó Apps Script ni se modificaron datos productivos.


### Cierre de validación — snapshot post-Drive en vehículo existente (2026-11-19)
- Commit de implementación y prueba: `12f1c9d92f5f3eddd8a255ead0db5dc7af71284d`; correcciones de test: `f27092ddc40d4ba3e3f13aba0cf5c6e02f4fe8f3`, `c9101a81a8574e9133bb8d4335d837eed3f3e4d9`; commit actual de seguimiento: `5e40c515e0274d039bff543187c7c1df916d386e`.
- CI regresión `44639776262` SUCCESS: 192 suites, 2,520 pruebas aprobadas, 0 fallos.
- Health read-only `44639776244` SUCCESS; Pages `44639775855` SUCCESS.
- No se desplegó Apps Script ni se modificaron datos productivos.


## Continuidad — limpieza de fila única en alta de vehículo nuevo ADMIN (2026-11-19)
- Se reemplazaron dos llamadas clearContent() consecutivas por una llamada sobre el rango completo de la fila nueva, desde la columna 1 hasta lastColumn.
- La copia de formato/validación permanece antes de la limpieza; el ID heredado se limpia igualmente.
- Se mantienen flush, asignación y lectura de confirmación del ID central, reserva pending antes de Drive y completed tras las escrituras.
- Prueba nueva `AdminNewVehicleSingleRowClear.mjs` integrada en `RunServiceTests.mjs`.
- CI pendiente. No se desplegó Apps Script ni se modificaron datos productivos.


## Cierre — limpieza de fila única en alta de vehículo nuevo ADMIN (2026-11-19)
- La rama de vehículo nuevo ahora limpia la fila completa, desde la columna 1 hasta `lastColumn`, con una sola llamada `clearContent()`; la copia de formato/validación sigue ocurriendo antes de limpiar.
- Se conserva el orden de `flush()`, asignación y lectura de confirmación del ID central, reserva idempotente `pending` antes de Drive y estado `completed` después de las escrituras/flush.
- Prueba `AdminNewVehicleSingleRowClear.mjs`: integrada en `RunServiceTests.mjs`; sus siete aserciones cubren limpieza única, orden de operaciones y preservación de la reserva idempotente.
- CI regresión `44640068663` SUCCESS sobre HEAD `4f99a114e00d178181e30a093dd40f4c50453a07`; pasos de verificación de rama, sintaxis de módulos modificados y suites aisladas completados. Health read-only `44640068448` SUCCESS.
- No se desplegó Apps Script ni se modificaron Sheets/Drive productivos. La validación de integración y concurrencia queda diferida a Beta autorizada.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
- Siguiente tarea: continuar `GP-PERF-ADMIN-CUT-LOCK-01` con el análisis de las lecturas restantes de Sheets dentro de `handleAddOrUpdateCut`, priorizando una reducción demostrable sin mover reservas ni escrituras atómicas fuera del ScriptLock.


## Cierre — reducir lecturas remotas en búsqueda de VIN ADMIN (2026-11-19)
- `findVinDuplicateForAdmin` ahora combina ID, marca, modelo y años en una lectura contigua calculada desde `COLS_CORTES` (columnas 1–7 en el esquema actual); la colección VIN se sigue leyendo en una columna independiente y dirigida.
- Se reducen las llamadas de lectura de tres a dos por búsqueda, sin ampliar a `getLastColumn()`, sin cambiar la exclusión del vehículo actual y conservando la detección del primer duplicado y el nombre/años del vehículo coincidente.
- La prueba `AdminVinDuplicateBoundedRead.mjs` verifica ambas rutas (índice VIN proporcionado y resolución de encabezado), los rangos exactos y el comportamiento de duplicados: 11/11 PASS. Contrato integral WRITE/ADMIN VIN: 12/12 PASS.
- Una ejecución inicial falló porque el extractor de funciones de `VinAuthoritativeValidation.js` no termina de reconocer comentarios `//` añadidos dentro de la función; se convirtió la nota en comentario de bloque, sin cambiar la lógica. La regresión final aprobó.
- CI `44640492213` SUCCESS sobre HEAD `ec0ce297b42e093dcb12f211fce1cc90845e8c5b`: 193 suites, 2,527 pruebas aprobadas, 0 fallos; sintaxis JavaScript aprobada. Health read-only `44640492202` SUCCESS.
- No se desplegó Apps Script ni se modificaron Sheets/Drive productivos; la integración/concurrencia real queda para Beta autorizada.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
- Siguiente tarea: continuar `GP-PERF-ADMIN-CUT-LOCK-01` revisando las lecturas restantes dentro de `handleAddOrUpdateCut`, priorizando llamadas remotas repetidas y manteniendo las reservas, revalidaciones y escrituras atómicas bajo el ScriptLock.


## Continuidad — agrupar validación de columnas testigo ADMIN (2026-11-19)
- En `ensureTestigoColumns`, la comprobación de datos existentes bajo los encabezados faltantes de AT:AV ahora reúne los índices faltantes y lee una sola vez el rango contiguo mínimo que los cubre. Antes podía ejecutar hasta tres lecturas individuales dentro del ScriptLock.
- Se mantienen la detección de encabezados VIN duplicados, la validación de encabezados testigo incompatibles, los mensajes de error, la ampliación de columnas y las escrituras de encabezado. Si no faltan encabezados o no hay filas de datos, no se realiza la lectura adicional.
- Se actualizó `AdminTestigoHeaderReadReuse.mjs` para comprobar el rango compartido y la ausencia del patrón de lecturas individuales; la prueba continúa integrada en `RunServiceTests.mjs`.
- Commits: implementación `0a9d42469774380357a0fa525a4f032e532349b2`; prueba `3412d525e335993919844c211f8bb4c5d5f84ce5`.
- Validación estática directa de siete condiciones del cambio: PASS. La suite Node/CI no se ejecutó sobre el HEAD nuevo: los workflows visibles corresponden al HEAD anterior `d24e1a74`; no se reporta CI como aprobada.
- No se desplegó Apps Script ni se modificaron hojas productivas.
- Estado: IMPLEMENTACIÓN Y PRUEBA ACTUALIZADA; CI PENDIENTE.
- Siguiente paso: ejecutar la regresión completa sobre este HEAD y revisar el resultado antes de cerrar la tarea GP-PERF-ADMIN-CUT-LOCK-01.


## Continuidad — lecturas acotadas y snapshot post-Drive ADMIN (2026-11-19)
- En la rama de vehículo existente, el snapshot previo a Drive ahora lee `Math.max(48, vinColumnIndex || 0)` columnas: cubre el esquema ADMIN AT:AV y VIN cuando está fuera de ese rango, sin transferir columnas auxiliares no utilizadas.
- La prueba `AdminExistingVehicleLookupPreflight` se actualizó para exigir el ancho acotado; `AdminExistingVehicleSnapshotRevalidation` cubre esquema base y VIN dentro/fuera del rango.
- Se eliminó el fallback post-Drive que volvía a leer toda la fila con `getLastColumn()`. Todas las solicitudes, incluidas las legacy, reciben un opId interno; el callback ahora exige el snapshot actual de `findRowByOpId` y falla cerrado si no lo obtiene. No se reutiliza el snapshot previo a Drive.
- Pruebas: `AdminExistingVehicleLookupPreflight` 8/8; `AdminExistingVehicleSnapshotRevalidation` 7/7; `AdminExistingVehiclePostDriveSnapshotReuse` 9/9.
- CI final `44642229762` SUCCESS: 193 suites, 2,528 pruebas aprobadas, 0 fallos; sintaxis aprobada. CI `44642135034` también confirmó la actualización de contratos de snapshot: 193 suites, 2,528 pruebas, 0 fallos.
- Commits funcionales/pruebas: `065b2a78c25e2ccf4a0f9540252bf24ea7aac810`, `99a618b1857160c5570479b4294443da5a40a581`, correcciones de contrato `0a67f09a63ae8b19d5115fe9f8322d4bea6e3aed`, `224545805b455a4d0f81a01e9085990e6c95c050`, `8795be1ffe34051899dd7e2a7ba289c9b4959be7`; fallback eliminado en `cfaf39610235afab428e6d87e011de7a54d5bb7d`, prueba `8fee515d4a3547c4648333ef03abf1e64d29d5a5`.
- No se desplegó Apps Script ni se modificaron Sheets/Drive productivos. Concurrencia real e integración siguen diferidas a Beta autorizada.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. La tarea paraguas `GP-PERF-ADMIN-CUT-LOCK-01` continúa EN PROGRESO.
- Siguiente paso: seguir reduciendo llamadas remotas redundantes en el handler y helpers de recuperación ADMIN, manteniendo reservas y revalidaciones atómicas.


## Continuidad — escritura por lote de encabezados testigo ADMIN (2026-11-20)
- En `ensureTestigoColumns`, las cabeceras contiguas AT:AV ahora se escriben con un único `setValues([headerNames])` cuando al menos una requiere creación o normalización; antes se ejecutaban hasta tres `setValue()` separados.
- La validación previa sigue rechazando encabezados duplicados, desplazados o incompatibles y datos bajo encabezados vacíos antes de escribir. Si los tres encabezados ya están correctos, no se hace escritura.
- `AdminTestigoHeaderReadReuse.mjs` actualizado: 8/8 PASS; verifica orden de validación, única escritura contigua y ausencia de escrituras individuales.
- CI `44642434395` SUCCESS: 193 suites, 2,528 pruebas aprobadas, 0 fallos; health read-only `44642434153` SUCCESS.
- Implementación `fbf1e96f67f436859f6959c3f03e0a0fd0cf9d5b`; prueba `35d4ef385c143cf25d8110a05b49836facc65681`.
- Sin despliegue Apps Script ni cambios en hojas productivas. La tarea paraguas `GP-PERF-ADMIN-CUT-LOCK-01` sigue EN PROGRESO.


## Continuidad — combinar lectura de encabezado e IDs en WRITE (2026-11-20)
- `getNextCortesVehicleIdLocked` ahora obtiene el encabezado `id` y todos los valores de la columna ID en una sola lectura contigua desde la fila 1. Antes hacía una lectura puntual del encabezado y otra para los valores.
- La lectura de fórmulas permanece separada porque es necesaria para distinguir fórmulas heredadas; la lectura de datos de otras columnas sigue limitada a filas candidatas sin ID o con fórmula. `getLastColumn()` se consulta solo si hay filas de datos.
- Se mantienen detección de IDs duplicados, valores inválidos, filas con datos sin ID, fórmulas y contador monotónico en ScriptProperties; no se mueve la asignación fuera del lock.
- `WriteVehicleIdAllocatorBoundedRead`: 11/11 PASS. CI `44642666700` SUCCESS: 193 suites, 2,528 pruebas aprobadas, 0 fallos; sintaxis aprobada.
- Implementación `10f0f6c5a56c12fce940c7d866e9e4276392f56c`; prueba `10204b8e37c2a71e775b52327b2693c93b55c775`.
- Sin despliegue Apps Script ni cambios en datos productivos. La sección crítica conserva el escaneo necesario para reconciliar IDs manuales y detectar corrupción.


## Decisión de concurrencia — reserva de slots ADMIN (2026-11-20)
- Se evaluó pasar `idempotencyEntriesSnapshot` a `findNextAvailableCutSlot_` para evitar una segunda lectura del ledger. Se descartó: ADMIN y WRITE pueden operar desde proyectos Apps Script separados y sus `ScriptLock` no se comparten; un snapshot leído antes podría omitir una reserva pending creada concurrentemente por el otro proyecto.
- Se restauró la lectura fresca del ledger en `findNextAvailableCutSlot_` y se conservó `AdminCutSlotReservation` en su contrato original (5/5 PASS). No se acepta reducir llamadas si debilita la detección de reservas cruzadas.
- CI final del HEAD restaurado `1967e9911d9f3cfe85fb29b614352543f257eb5e`: `44643030246` SUCCESS, 193 suites, 2,528 pruebas, 0 fallos; health read-only `44643030192` SUCCESS; Pages `44643030815` SUCCESS.
- Mapa lógico disponible en `Services/SERVICE_ARCHITECTURE_PLAN.md`: Coordinator independiente y SharedMutationClient copiado en AUTH, USERS, WRITE, ADMIN, FEEDBACK y UTILITIES. No hay manifiestos ni Script IDs versionados para verificar el mapeo real de deployments; la concurrencia entre proyectos queda pendiente de Beta autorizada.


## P1 — telemetría directa sin contención del ScriptLock (2026-11-20)
- Se eliminó `LockService.getScriptLock()` de `recordDirectServiceTraffic_` en AUTH, WRITE y FEEDBACK. La telemetría ahora actualiza ScriptProperties en modo best-effort sin adquirir el lock global que comparten handlers de cada proyecto.
- La precisión sigue declarada como `best_effort_nonblocking` / `mayUndercount: true`: las actualizaciones simultáneas pueden perder incrementos, lo cual es preferible a que una consulta de telemetría provoque `WRITE_BUSY` o bloquee Inbox/login/registro.
- Se actualizó el fixture de paridad `JS/Tests/Auth.js` y los contratos `DirectServiceTrafficTelemetry.mjs` (21/21 PASS) y `P2FeedbackImageUploadLocks.mjs` (1/1 PASS) para exigir ausencia de ScriptLock.
- CI final `44643946013` SUCCESS: 193 suites, 2,528 pruebas aprobadas, 0 fallos; health read-only `44643945928` SUCCESS.
- Commits de código/fixtures/pruebas: `732e39c7cf43d3caf69f6980318490950d8c8615`, `8252679db5c808880df6305ea36c5ffc0cff57c1`, `ecd68028b87065e6701c5e11b1b7a9038f5b35c1`, `07900e46bf1a0c17a2dab91532d80702176ec834`, `eb227d843153ccc248ab6eb9c6f51faf7c1536e3`, `082611b936865486c3f28edfe650877c9c86d3e0`.
- Siguiente inspección P1: publicaciones de catálogo FEEDBACK (Cortes/PyS/Tutorial) que actualmente construyen snapshots y hacen UrlFetch al Coordinator mientras mantienen el ScriptLock. No retirar ese lock sin sustituir la protección contra snapshots fuera de orden.
- Sin despliegues Apps Script ni modificaciones de ScriptProperties/hojas/Drive productivos.


## P1 — publicaciones incrementales FEEDBACK fuera del ScriptLock (2026-11-20)
- Se unificaron los publicadores de catálogo FEEDBACK para Cortes, PyS y Tutorial en `publishFeedbackCatalogChange_`. Bajo ScriptLock se lee el snapshot y se reserva una versión de origen monotónica en `GPSpedia_FEEDBACK_CATALOG_SOURCE_VERSION_V1`; el lock se libera antes de llamar a Coordinator por HTTP.
- Si no se adquiere el lock o falla la lectura/versión, se publica un evento `reset` fuera del lock. No se publica un snapshot sin verificar.
- Coordinator acepta `sourceVersion` para FEEDBACK en colecciones Cortes/PyS/Tutorial, guarda la última versión y convierte versiones atrasadas en reset. Las publicaciones legacy FEEDBACK sin versión también se convierten en reset para impedir que un deployment antiguo sobrescriba snapshots nuevos. WRITE conserva su propiedad y contrato de versión existentes.
- Pruebas: `CatalogChangeFeed` 33/33 PASS (incluye llegada fuera de orden, legacy sin versión y colecciones permitidas); `FeedbackCatalogPublicationIsolation` 5/5 PASS (builder bajo lock, publicación fuera, versiones, lock ocupado y fallos); regresión CI `44644542379` SUCCESS: 194 suites, 2,536 pruebas aprobadas, 0 fallos; health read-only `44644541751` SUCCESS.
- Commits: FEEDBACK `177e3f74649867cf8c19eda589a3442b7f08e7ae`; Coordinator `f110811b62a9dd6ff2c2843412ea6e3ed1d97dc3`; contratos `e4d62b4ad29bde7ea763f1e9eb914fd87d470c90`; prueba `9772d133ef650bc3ebe936cf77f47c258c5f0e99`; runner `b7b9114af82e403482bae7315b9ee9b734ca3f67`; aislamiento final `440dd5db41a34378d021a69277e1299ac9e0a776`.
- El cambio de protocolo es aditivo; Coordinator debe desplegarse antes que FEEDBACK en Beta. No se desplegó Apps Script ni se modificaron propiedades remotas, hojas, Drive o datos productivos.
- Siguiente paso P1: continuar inventario de operaciones WRITE/FEEDBACK que conservan ScriptLock durante Drive/HTTP; mantener fuera del lock cualquier publicación/consulta que pueda aislarse con versión y revalidación segura.


## P1 — freeze de IDs WRITE valida respaldo fuera del ScriptLock (2026-11-20)
- En `handleFreezeCortesIds`, la autorización y `verifyCortesIdsBackup` (Drive/SpreadsheetApp.openById) ahora se ejecutan antes de adquirir el ScriptLock. El lock solo cubre lectura/plan de Cortes, dry-run o commit de valores estáticos y verificación de la conversión.
- La adquisición cambió a `tryLock(0)`; si WRITE está ocupado, retorna `WRITE_BUSY` sin esperar ni retener el lock. El plan y la escritura de IDs siguen protegidos por el mismo lock.
- `WriteFreezeCortesIdsBackupOutsideLock` 5/5 PASS; `WriteAuthorizationMinimization` 13/13 PASS. CI `44645165057` SUCCESS: 195 suites, 2,541 pruebas aprobadas, 0 fallos; health read-only `44645165055` SUCCESS.
- Commits: implementación `5762d4919843d17e5d0f599b123ea38c2289c43a`, prueba `81704601d46ee3862718eb956d0eb69202e97f41`, runner `024e86775c5e72fe532462e96c7dd556d1dcc5cd`, compatibilidad extractor `54663b60478ba21ddc59c57662b9d6ee425af918`.
- No se desplegó Apps Script ni se consultaron/modificaron datos productivos.


## P1 — verificación Drive de imagen PyS pending fuera del lock (2026-11-20)
- `handleAddProblem` ahora valida con Drive el archivo de una operación `UPLOAD_PENDING` antes de adquirir el ScriptLock. Bajo lock vuelve a leer la reserva y compara opId, payloadHash, problemId, imageFileId, imageUrl y status antes de reutilizar el objeto verificado.
- Si la reserva cambió entre preflight y lock, falla con instrucción de reintento en lugar de verificar otro archivo bajo lock. Si la verificación previa falla y la reserva sigue igual, marca `RECOVERY_REQUIRED` bajo lock. Se conservan MIME, tamaño, URL, descripción, carpeta autorizada y permisos.
- Pruebas `FeedbackPysPendingImageVerificationOutsideLock` 5/5; `P2PysImageUploadOutsideLock` PASS; CI `44645449059` SUCCESS: 196 suites, 2,546 pruebas aprobadas, 0 fallos; health read-only `44645449007` SUCCESS.
- Commits: implementación `35c24ab08cbf7bec03520dc2143f3862c0ee75e9`, prueba `b93a83f6ceba28679486269850c4eda462a0918a`, runner `5bad0df5b2696f1a9ebcc353f41f1b71ad4cce9f`.
- El cleanup Drive de archivos duplicados/rollback y la actualización de descripción LINKED siguen pendientes de revisión independiente; no se asume que estén fuera del lock.


## P1 — PyS metadata LINKED y actividad post-commit fuera del lock (2026-11-20)
- En `handleAddProblem`, después de confirmar la fila PyS y el estado LINKED del ledger, se libera el ScriptLock antes de actualizar la descripción Drive de la imagen y antes de escribir `ActividadUsuario`. Ambas acciones son auxiliares y no deben retener el mutex de mutación.
- En rutas de recuperación con fila/ledger ya persistidos, primero se escribe el estado de recuperación/vinculación bajo lock, luego se libera y se actualiza metadata Drive. Las limpiezas de archivo no vinculado y su compensación siguen pendientes: requieren un estado intermedio y revalidación tras reacquirir lock.
- Pruebas `FeedbackPysPostCommitOutsideLock` 4/4, `FeedbackPysPendingImageVerificationOutsideLock` 5/5, `P2PysImageUploadOutsideLock` PASS. CI `44645868436` SUCCESS: 197 suites, 2,550 pruebas aprobadas, 0 fallos; health read-only `44645868341` SUCCESS.
- Commits: `f6ec254464d7f1b345eb6266a6a4d3ef0bd48e4d`, `91289955b91f0a0c24e2e70b80b627638bfc3b68`, `70348f51073b780b7344824971d53d2645ff112a`, `2c756fea5eac507c0e431debef6352a32ae0fe68`.


## P1 — compensación Drive PyS fuera del lock con revalidación (2026-11-20)
- En la ruta de rollback de `handleAddProblem`, cuando se comprueba bajo lock que la imagen no aparece referenciada, primero se escribe `RECOVERY_REQUIRED` en el ledger y se libera el ScriptLock. Solo entonces se envía el archivo a papelera y se comprueba `isTrashed()`.
- Tras la operación Drive se readquiere el lock, se relee el ledger y se verifica opId/problemId/fileId/URL/status antes de limpiar a `PENDING`. Si falla el trash o la readquisición/revalidación, el ledger queda `RECOVERY_REQUIRED` y la metadata de recuperación se actualiza fuera del lock. Esto evita que otra solicitud use la reserva mientras se compensa y evita borrar archivos que el sistema haya referenciado.
- Pruebas `FeedbackPysRollbackOutsideLock` 6/6, `PysImageStorageRecovery` 22/22, `P2PysImageUploadOutsideLock` PASS. CI `44646143035` SUCCESS: 198 suites, 2,556 pruebas aprobadas, 0 fallos; health read-only `44646143256` SUCCESS.
- Commits: implementación `c7e622d2f844b9908d86aaf0a210ba8c3e64532c`, prueba `2f723e686b450052dc9669361089a077a103ea52`, runner `f89810e583d1b82d71fcad4bf4575d80e138a93e`.
- Sin despliegue Apps Script ni modificaciones productivas.


## P1 — adjuntos duplicados/rollback de reportes fuera del lock (2026-11-20)
- En `handleReportProblem`, cuando un reporte idempotente ya existe y la imagen subida es duplicada, se libera ScriptLock antes de enviar el duplicado a papelera.
- En fallos de escritura, la fila/metadata se revierte y verifica bajo lock; solo si la reversión queda confirmada se libera el lock y se elimina el adjunto. Si la reversión no puede confirmarse, la imagen se conserva para evitar romper una referencia persistida.
- `FeedbackReportImageCleanupOutsideLock` 5/5 PASS. CI `44646463925` SUCCESS: 199 suites, 2,561 pruebas aprobadas, 0 fallos; health read-only `44646464055` SUCCESS.
- Commits: implementación `b076250a1d21f200b4824ea13f7c34a270b634e2`, prueba `90e53b23b015c3a9b8084e8e2391b84db4c04583`, runner `5cf1646ce6791825a4c8033dedd722eac21d41c9`.


## P1 — adjuntos duplicados/rollback de sugerencias de corte fuera del lock (2026-11-20)
- En `handleSuggestCutChange`, las imágenes duplicadas de una operación/reporte idempotente se envían a papelera después de liberar ScriptLock.
- En rollback, solo se elimina el adjunto cuando la fila se limpió y el estado se verificó; si no puede confirmarse la reversión, se conserva la imagen para reconciliación. La actividad de usuario continúa después del lock.
- `FeedbackSuggestionImageCleanupOutsideLock` 5/5 PASS. CI `44646768057` SUCCESS: 200 suites, 2,566 pruebas aprobadas, 0 fallos; health read-only `44646767980` SUCCESS.
- Commits: implementación `44e296d523adf38604649b21b218c160bb560262`, prueba `88dd7f4ad8cdea155b72c2e45916ac8b72d31f0a`, runner `c0fad833828847d68c5d027bc99dcfa9d9fa6dfc`, ajuste de contrato `d5c7968aa7dd32877fb0fef243dd0814229af0bc`.
- Sin despliegue Apps Script ni modificaciones productivas.


## P1 — adjuntos duplicados/rollback de sugerencias de corte fuera del lock (2026-11-20)
- En `handleSuggestCutChange`, las imágenes duplicadas de una operación/reporte idempotente se envían a papelera después de liberar ScriptLock.
- En rollback, solo se elimina el adjunto cuando la fila se limpió y el estado se verificó; si no puede confirmarse la reversión, se conserva la imagen para reconciliación.
- `FeedbackSuggestionImageCleanupOutsideLock` 5/5 PASS. CI `44646768057` SUCCESS: 200 suites, 2,566 pruebas aprobadas, 0 fallos; health read-only `44646767980` SUCCESS.
- Commits: implementación `44e296d523adf38604649b21b218c160bb560262`, prueba `88dd7f4ad8cdea155b72c2e45916ac8b72d31f0a`, runner `c0fad833828847d68c5d027bc99dcfa9d9fa6dfc`, ajuste `d5c7968aa7dd32877fb0fef243dd0814229af0bc`.


## P1 — sincronización de carpeta/actividad de sugerencia de año fuera del lock (2026-11-20)
- `completeFeedbackYearApplication_` ahora se limita a aplicar/verificar el rango, cerrar el ledger y devolver solicitudes internas para sincronización Drive y actividad. No ejecuta Drive ni `logUserActivity` bajo ScriptLock.
- `handleSuggestYear` libera ScriptLock y luego registra actividad y sincroniza la carpeta. Antes de mover la imagen relee la fila y compara ID de vehículo y URL de imagen con el snapshot confirmado; si cualquiera cambió, omite el movimiento y devuelve advertencia en lugar de mover un archivo posiblemente ajeno/obsoleto.
- Pruebas `FeedbackYearFolderSyncOutsideLock` 5/5; `SuggestYearVoteThreshold` 6/6. CI `44647298901` SUCCESS: 201 suites, 2,571 pruebas aprobadas, 0 fallos. Health read-only `44647298819` SUCCESS.
- Commits: implementación `88b8725a7671a1c4a5a72429aba94197e5c01969`, prueba `20d9fad52c7585c58c2b8dee56aabeb4909b3f41`, runner `64229b03e53557c8826ce529cb3fd2cd583f97b6`.
- Sin despliegue Apps Script ni cambios productivos.


## P1 — actividad de likes FEEDBACK fuera del lock (2026-11-20)
- `handleRecordLike` conserva bajo ScriptLock la lectura del contador, ledger pending/completed y confirmación del incremento; difiere `logUserActivity` hasta después de liberar el lock. Los replays completed no generan actividad duplicada.
- Prueba `FeedbackLikeActivityOutsideLock` 5/5; `FeedbackYearFolderSyncOutsideLock` 5/5. CI `44647675553` SUCCESS: 202 suites, 2,576 pruebas aprobadas, 0 fallos; health read-only `44647675689` SUCCESS.
- Commits: implementación `a134f93fec22248299b6fe3d1fa6bb508289fcef`, prueba `77c587e3c3e498d3a13b2ff7fa90db21565048b1`, runner `19d25a79ba2eec315b68a7bc7afd0ebaa5b36252`.


## P1 — asignador de IDs formula-based FEEDBACK con lectura acotada (2026-11-20)
- `getNextFormulaBasedId_` ahora lee primero solo la columna ID. Solo si detecta IDs vacíos consulta datos de filas en grupos contiguos mínimos para preservar la detección de filas con datos sin ID; no transfiere el resto de la hoja cuando todos los IDs están presentes.
- Se mantienen validación de prefijo/sufijo, duplicados, enteros seguros, reconciliación con contador ScriptProperties y compatibilidad cuando el caller ya posee ScriptLock.
- `FeedbackFormulaIdAllocatorBoundedRead` 6/6 PASS; regresión CI `44647995645` SUCCESS: 203 suites, 2,582 pruebas aprobadas, 0 fallos; health read-only `44647995469` SUCCESS.
- Commits: implementación `4fd6cfcca93dd6efd7cdaf75775e38ff6a667778`, prueba `9323067a99d609d8a9cd73dc5ea59a3f378f97ad`, runner `b193c17ad867d4b3f53e4274bb8dfc3526eccd84`.


## P1 — publicaciones de catálogo ADMIN/Cortes fuera del ScriptLock (2026-11-20)
- Los publicadores ADMIN individuales y batch ahora construyen snapshots y reservan versiones de origen monotónicas bajo lock, liberan el lock y luego llaman a Coordinator. El batch reserva un rango completo de versiones con una sola escritura de ScriptProperties y publica en chunks de 50 fuera del lock.
- Coordinator acepta `sourceVersion` ADMIN solo para Cortes, detecta versiones fuera de orden y convierte snapshots legacy ADMIN/Cortes sin versión en reset. Si ADMIN está ocupado, falla el snapshot o falla una publicación batch, se envía reset fuera del lock para reconstrucción.
- Pruebas `AdminCatalogPublicationIsolation` 6/6; `CatalogChangeFeed` cubre ADMIN versionado, legacy y stale; `SharedMutationCoordinator` cubre batch y reintentos idempotentes versionados. CI `44649098649` SUCCESS; health read-only `44649098541` SUCCESS.
- Commits principales: ADMIN `59ba42e5648024eb751fc0b3157fc8d0f17d36bc`; Coordinator `5e519d1a6d934b311e54c3a62f91597fed5557dd`; prueba `88183785777a8d0d6f14ac7febbbdcb222cc7d05`; runner `6fcb310f9f317fa42dcf6e13b0e4cd743107e605`; contratos de feed/reintentos `135fba1959be6e25cb6aaf58a421e6bb87e1305a` y `6cc528a8914641051737024bf022cc46706b5304`.
- No se desplegó Apps Script ni se modificaron datos productivos.


## P1 — ADMIN movimiento de imagen: actividad post-commit fuera del ScriptLock (2026-11-20)
- En `handleMoveReplacedImage`, tras confirmar el movimiento Drive y persistir/verificar metadata del inventario, ahora se prepara el evento de actividad y el mensaje de logging. Ambos se ejecutan después del `finally` que libera ScriptLock; la escritura/rollback de Drive y metadata mantienen el comportamiento transaccional anterior.
- El camino donde la imagen ya está en la carpeta destino conserva su respuesta y no registra un movimiento inexistente. Los errores de la operación principal siguen propagándose; el helper de actividad conserva su contrato best-effort.
- `AdminMoveImageActivityOutsideLock` 7/7 PASS. CI `44652254166` SUCCESS: 206 suites, 2,603 pruebas aprobadas, 0 fallos; health read-only `44652254131` SUCCESS. Sintaxis de módulos modificados aprobada por CI.
- Commits: implementación `4c9a92583d10f4fba04bf49affe548c166500dd9`, prueba `ad57bf26b6c9da5625c2732aacf2dd9ccc556242`, runner `05acd964a2b3ca112ee241f8820bc8cb2565fbab`.
- No se desplegó Apps Script ni se modificaron datos productivos. La llamada Drive move/rollback continúa dentro de la sección crítica porque su seguridad depende de la referencia y metadata del inventario; requiere un diseño de reserva y revalidación antes de sacarla.


## Mapa local de locks y siguiente bloque (2026-11-20)
- Se documentó en `Tareas_Activas.md` el ámbito de estado protegido por los ScriptLock de AUTH, ADMIN, WRITE, FEEDBACK, USERS, Coordinator e InboxConversations. En AUTH/ADMIN/WRITE/FEEDBACK se observan varios recursos lógicos distintos dentro de cada proyecto, por lo que el ScriptLock global puede serializar operaciones independientes si comparten el mismo proyecto desplegado.
- Telemetría directa CATALOG/USERS usa `tryLock(0)` best-effort; no espera por contención, aunque la breve sección que adquiere el lock sigue compartiendo ámbito local.
- No se han consultado Script IDs, deployments ni hojas/Drive productivos. README y contexto advierten que las fuentes del repositorio no prueban topología ni despliegue. La identificación de proyectos y la prueba de concurrencia real siguen pendientes de Beta autorizada.
- Siguiente revisión local P1: `handleApplyCortesImageReconciliation_` en ADMIN mantiene bajo ScriptLock validación del respaldo Drive, lectura de páginas de auditoría/cache, preview de referencias Drive y llamadas Coordinator para registrar actividad. Delimitar preflight inmutable vs. revalidación crítica antes de modificar; no sacar escrituras/rollback de Cortes del lock sin un mecanismo seguro de reserva.


## P1 — ADMIN restauración de imagen histórica: preflight Drive fuera del lock (2026-11-20)
- En `handleRecoverReplacedImage`, la consulta de archivo Drive (existencia, MIME, estado papelera y pertenencia al árbol Cortes) se ejecuta mediante `runAdminDriveWorkOutsideScriptLock_`, liberando ScriptLock y readquiriéndolo sin espera. Antes de continuar, se relee el inventario y se comparan tipo/estado/Drive ID/URL/vehículo/campo; si el registro cambió o no se puede readquirir el lock, no se modifica Cortes.
- La lectura de referencias activas, validación de conflicto, escritura de la celda y actualización/rollback del historial permanecen bajo lock. El finally libera solo si el lock quedó readquirido.
- `AdminRecoverImageDrivePreflightOutsideLock` 11/11 PASS; `AdminReplacedImagesIntegrity` 56/56 PASS. CI `44652896571` SUCCESS: 207 suites, 2,614 pruebas aprobadas, 0 fallos; health read-only `44652896675` SUCCESS. Una primera regresión detectó que el harness `AdminReplacedImagesIntegrity` no inyectaba el helper nuevo; se corrigió el harness y se repitió la regresión completa.
- Commits: implementación `1c1098d27b1f8c93ca2686cc4d393c130ba340b3`, control de lock en finally `1ea4526ea934b935b1bd255a40ba88318860c2f4`, prueba `c1d074b682a6934f2b20c7c8c32a4a1d310eaf82`, runner `595202304afa87d20e318aee1c96c5eb4964ec0b`, harness `8cecff4d741cbcf43b36919c3b63f8352833794a` y verificación unlocked `36687847d6370ce8d5d2c787b57b8bb26a299f1b`.
- No se desplegó Apps Script ni se modificaron datos productivos.


## P1 — ADMIN envío de imagen a papelera: actividad post-commit fuera del lock (2026-11-20)
- En `handleDeleteReplacedImage`, la confirmación de estado `en_papelera` y el estado final de la imagen se persisten bajo ScriptLock; el evento de actividad vía Coordinator y el mensaje de logging se ejecutan después de liberar el lock. Se conserva el comportamiento idempotente cuando el archivo ya está en papelera y el rollback Drive/historial actual.
- `AdminDeleteImageActivityOutsideLock` 6/6 PASS; `AdminImageTrashLifecycle` 40/40 PASS. CI `44653097187` SUCCESS: 208 suites, 2,620 pruebas aprobadas, 0 fallos; health read-only `44653097327` SUCCESS.
- Commits: implementación `e642a3a3216a67cb87b117077401681a8069e197`, prueba `2b35917b20ef63d24e232de7f0257b19858cd94e`, runner `771c9fd295197f22ce57470e8a93d5ea7476ff27`.
- No se desplegó Apps Script ni se modificaron datos productivos. La llamada `DriveApp.setTrashed` sigue dentro del lock porque la operación todavía no cuenta con estado intermedio y revalidación segura para la compensación.


## P1 — ADMIN restauración desde papelera: actividad post-commit fuera del lock (2026-11-20)
- En `handleRestoreReplacedImageFromTrash`, la restauración Drive y la actualización/verificación del historial conservan su flujo actual bajo ScriptLock; la actividad Coordinator y el mensaje de logging se difieren hasta después de liberar. El replay idempotente de archivo ya restaurado conserva su respuesta sin registrar una restauración nueva.
- `AdminRestoreImageActivityOutsideLock` 6/6 PASS; `AdminImageTrashLifecycle` 40/40 PASS. CI `44653303076` SUCCESS: 209 suites, 2,626 pruebas aprobadas, 0 fallos; health read-only `44653303269` SUCCESS.
- Commits: implementación `38794da5e9f2c515a764ff815cf30d30ed46c349`, prueba `284e9ea9869cda4ed144016d4e025e96d065e628`, runner `cf703114955b3ef78e9c82990d8cf162268049af`.
- No se desplegó Apps Script ni se modificaron datos productivos. La llamada Drive de restauración/rollback sigue bajo lock hasta diseñar estado intermedio y revalidación.


## P1 — ADMIN eliminación definitiva de imagen: actividad post-commit fuera del lock (2026-11-20)
- En `handlePermanentlyDeleteReplacedImage`, tanto la reconciliación de un archivo ya ausente (HTTP 404) como la eliminación confirmada persisten el estado `eliminada` bajo ScriptLock y liberan el lock antes de registrar actividad vía Coordinator. El log de resultado también se ejecuta después de liberar.
- Se añadió un cierre idempotente del lock para evitar doble liberación en las ramas de reconciliación y eliminación normal. La operación destructiva de Drive y su estado `eliminacion_pendiente` siguen bajo lock por ahora; moverla requiere una reserva exclusiva para evitar dos eliminaciones concurrentes.
- `AdminPermanentDeleteActivityOutsideLock` 6/6 PASS; `AdminImageTrashLifecycle` 40/40 PASS. CI `44653582395` SUCCESS: 210 suites, 2,632 pruebas aprobadas, 0 fallos; health read-only `44653582292` SUCCESS. La primera ejecución encontró una aserción de orden incorrecta en el test (comparaba con el finally posterior); se corrigió y se repitió la regresión completa.
- Commits: implementación `b63d72960fa367a697e756e5629691029278184e`, prueba `b42179292170db7e90eaa27619537a597b6a7a1f`, runner `546535f6678b70a9e39261bdcbe2496d70ddc9d6`, ajuste de test `905ac0794a8ac3ed11137f916ca697152c33a1c6`.
- No se desplegó Apps Script ni se modificaron datos productivos.


## P1 — ADMIN marcar imagen en uso: Drive y actividad fuera del lock (2026-11-20)
- `handleMarkReplacedImageInUse` ahora valida existencia, papelera, MIME y carpeta Cortes mediante `runAdminDriveWorkOutsideScriptLock_`; tras readquirir sin espera revalida estado `requiere_revision`, tipo y Drive ID del registro antes de cambiarlo a `en_uso`.
- La actividad Coordinator y logging se ejecutan después de liberar ScriptLock. Si el registro cambió o no se readquirió el lock, no se cambia el historial.
- `AdminMarkImageInUseDrivePreflightOutsideLock` 10/10 PASS; `AdminReplacedImagesIntegrity` 56/56 PASS. CI `44653864364` SUCCESS: 211 suites, 2,642 pruebas aprobadas, 0 fallos; health read-only `44653864334` SUCCESS.
- Commits: implementación `5434ac862b8839d5c1d7ef8efa35d6dc87d0d18a`, prueba `0faf804e67175b0db1f486ec76482cf92d18c783`, runner `29dbfd3761d9673867c15b45dfac855615635c98`, ajuste de contrato `5504d165c20e85090ccc4903a1e30f76db1a0548`.
- No se desplegó Apps Script ni se modificaron datos productivos.


## P1 — ADMIN eliminación definitiva: preflight Drive fuera del lock (2026-11-20)
- `handlePermanentlyDeleteReplacedImage` mueve la consulta inicial de Drive API (`get`), comprobación MIME/trashed, verificación DriveApp y validación de carpeta Cortes fuera del ScriptLock. Después readquiere con `tryLock(0)` y revalida tipo/estado/Drive ID del historial; solo entonces vuelve a comprobar referencias activas y puede continuar.
- Si el archivo ya no existe (404), reconcilia `eliminada` bajo lock y registra actividad después de liberarlo. Para archivos existentes, la reserva `eliminacion_pendiente`, DELETE y GET final de confirmación permanecen bajo lock para impedir operaciones simultáneas durante la eliminación destructiva.
- `AdminPermanentDeleteDrivePreflightOutsideLock` 9/9 PASS; `AdminPermanentDeleteActivityOutsideLock` 6/6 PASS; `AdminImageTrashLifecycle` 40/40 PASS. CI `44654436417` SUCCESS: 212 suites, 2,651 pruebas aprobadas, 0 fallos; health read-only `44654436415` SUCCESS.
- Commits: preflight `d47afd59ea80cf7031a715334634e2f308eecf44`, preservación del resultado `051aff78c1135d5af814b0b865978f1dc729bff2`, test `47fe0d697fd44ad557b5fe8a089c659edd1ce9dc`, runner `fef9dbd76bd158fae32c2a23ce7526cb755952da`, guardia de liberación `7dc50208d9951f353d763c896dcc4ddd2d393688`, ajustes de contratos/harness `feba75cca2a4c8c659eaefe279f026bdfc13011e`, `82f3721ee4a9a0b2f8b8cf92c206520a1714ef4d`, `43f2efbaa1399d8e36286d99066250074f524302`, `e01d5eb20b0436d38f814fedc0dac41a6af4068c`.
- Sin despliegue Apps Script ni cambios productivos.


## P1 — ADMIN restauración desde papelera: preflight Drive fuera del lock (2026-11-20)
- `handleRestoreReplacedImageFromTrash` mueve la lectura Drive del archivo (papelera, MIME, carpeta y ruta) fuera del ScriptLock. Tras readquirir con `tryLock(0)`, compara en el historial tipo/estado/estado previo/Drive ID antes de continuar. El objeto Drive verificado se reutiliza para la restauración; `setTrashed(false)`, lectura posterior y rollback permanecen bajo lock.
- El camino idempotente de imagen ya restaurada conserva su respuesta. Actividad Coordinator/logging se mantiene post-lock.
- `AdminRestoreImageDrivePreflightOutsideLock` 10/10 PASS; `AdminRestoreImageActivityOutsideLock` 6/6 PASS; `AdminImageTrashLifecycle` 40/40 PASS. CI `44654753039` SUCCESS: 213 suites, 2,661 pruebas aprobadas, 0 fallos; health read-only `44654752914` SUCCESS.
- Commits: implementación `c3e167c8b83ba54be8f6221f2286ca3577d5a064`, harness `a0445da7e8f24d5c82d6a26ac62aba968a67a69c`, prueba `33d28902882750dfd552133d86743d39e42612cf`, runner `30dee3ac792dff3694166bdaa3777832a633d1ba`, ajuste de contrato `a3ebeaa58cc96519f827282b60f286170f7dc328`.
- Sin despliegue Apps Script ni cambios productivos.


## P1 — ADMIN envío de imagen a papelera: preflight Drive fuera del lock (2026-11-20)
- `handleDeleteReplacedImage` ahora consulta DriveApp, valida MIME/estado de papelera y obtiene carpeta/ruta fuera del ScriptLock. Tras readquirir sin espera, revalida tipo/estado/Drive ID del registro antes de continuar. Luego vuelve a comprobar referencias activas bajo lock y conserva bajo lock el cambio a papelera, su read-back y rollback.
- El estado idempotente `en_papelera` mantiene su respuesta cuando Drive confirma papelera. Actividad Coordinator/logging sigue post-lock.
- `AdminDeleteImageDrivePreflightOutsideLock` 10/10 PASS; `AdminImageTrashLifecycle` 40/40 PASS; `AdminReplacedImagesIntegrity` 56/56 PASS. CI `44655257521` SUCCESS: 214 suites, 2,671 pruebas aprobadas, 0 fallos; health read-only `44655257749` SUCCESS.
- Commits: implementación `435fa770957eab211d79ff49846087fdd5e7d076`, preservación de resultado `b7909beb2540efa16421d1b1897650b7fee86414`, harness `0ebc9692f01387d0f20c0964f56fdd7bf9359c32`, test `fe994b4a4816917e08d1b41767f00755cf7f498a`, runner `d1513ee31e1cdafd7c19ae7b630b5fdcdfc2536f`, harness de integridad `9f8feca5e40b33f869d7f354940a1152ec0c15bd`, ajuste de formato `8e6d808646f764fa4e030914427d2703328688af`.
- Sin despliegue Apps Script ni cambios productivos.


## P1 — ADMIN movimiento de imagen: preflight Drive fuera del lock (2026-11-20)
- `handleMoveReplacedImage` ahora consulta DriveApp, MIME, papelera, carpetas, rutas y clasificación de destino fuera del ScriptLock mediante `runAdminDriveWorkOutsideScriptLock_`. Al readquirir con `tryLock(0)`, revalida tipo/estado/Drive ID y todos los campos de metadata de ubicación/organización; vuelve a comprobar referencias activas y referencias no interpretables antes de continuar.
- Se reutilizan los objetos Drive y la metadata verificada; se elimina la lectura redundante del MIME dentro de `writeMetadata`. El movimiento efectivo (`moveTo`), read-back de ubicación, escritura de metadata y compensación siguen bajo lock.
- La actividad Coordinator/logging ya se ejecutaba post-lock y se conserva. El caso de carpeta idéntica conserva su respuesta y no registra movimiento falso.
- `AdminMoveImageDrivePreflightOutsideLock` 11/11 PASS; `AdminMoveImageActivityOutsideLock` 7/7 PASS. CI `44655643108` SUCCESS: 215 suites, 2,682 pruebas aprobadas, 0 fallos; health read-only `44655643102` SUCCESS.
- Commits: implementación `98b6850573c78ef9bf3581b33b53a665eb48628e`, guardia lock `aaedd16062188794f73133f5767d3dfa34ae87c1`, test `c2c4fbad3f526a9d85181a5134e974b65834030b`, runner `460564364b28c9484a40d114fb9640b5888fbbfe`, corrección de variable duplicada `ed532bfaf12da0b0f01da23292393d07f9fdfc56`.
- Sin despliegue Apps Script ni cambios productivos.


## P1 — ADMIN ciclo de papelera: adquisición no bloqueante de ScriptLock (2026-11-20)
- `handleDeleteReplacedImage` y `handleRestoreReplacedImageFromTrash` sustituyen `waitLock(30000)` por `tryLock(0)`. Cuando ADMIN está ocupado responden con `ADMIN_BUSY` sin esperar 30 segundos ni tocar Drive/historial.
- Se añade guardia `lockAcquired` para liberar únicamente cuando la operación obtuvo el lock. La liberación temporal/re-adquisición de preflight Drive sigue funcionando con `tryLock(0)`.
- `AdminImageTrashLifecycle` 41/41 PASS; `AdminDeleteImageActivityOutsideLock` 6/6 PASS; `AdminRestoreImageActivityOutsideLock` 6/6 PASS. CI `44661420739` SUCCESS: 215 suites, 2,684 pruebas aprobadas, 0 fallos; health read-only `44661420823` SUCCESS.
- Commits: implementación `51e297b8749e8f2284371a42161b28e9001acf83`, guardias de liberación `1133f2082ab4bd61d3cb4303b99b6e2564b8bc25`, pruebas `a84ce23ca38829d3aac5395cf754a5b58809fc01`, corrección de conteo `a660bdbed73c297e60877bfc4a40679d176dad69`, contratos de actividad `61751603ff8f81958389227a07e558b290581744` y `34d04710fc91ee0fd0eddb9e753df1b15a85c126`, correcciones de formato `2d46980eca39127973127b1b62919c14c4df7e0f` y `da1d41be8bf727898d9b5586cc42496c54324674`.
- No se desplegó Apps Script ni se modificaron datos productivos. Las operaciones destructivas/movimientos de Drive siguen bajo lock; esta tarea solo elimina la espera inicial de hasta 30 segundos.
- Siguiente: evaluar una reserva/lease idempotente para separar la mutación Drive de papelera/restauración del lock global, sin perder la protección de referencias, la compensación ni la reconciliación.


## P1 — ADMIN conciliación de imágenes Cortes: verificación del respaldo fuera del lock (2026-11-20)
- HEAD de partida: `2a418d2f3cb634737267aea5ae078fd61cdcfec8`.
- En `verifyImageReconciliationBackup_`, la validación del archivo de respaldo (Drive, papelera, MIME, ACL privada, manifiesto, Spreadsheet de respaldo y fingerprint de la copia) puede ejecutarse fuera del ScriptLock.
- Se agregó `verifyImageReconciliationBackupSource_`: tras readquirir el lock sin espera, compara fingerprint, número de hojas, filas, celdas y fórmulas de la Spreadsheet operativa con los valores verificados del respaldo. La verificación existente por defecto sigue comprobando la fuente, preservando compatibilidad.
- `handleApplyCortesImageReconciliation_` utiliza `runAdminDriveWorkOutsideScriptLock_` para el preflight del respaldo. Si la readquisición falla, retorna el error recuperable `ADMIN_LOCK_REACQUIRE_PENDING` y no inicia preview ni escrituras; si la fuente cambió, aborta bajo lock.
- Pruebas locales aisladas ejecutadas contra el código fuente recuperado: `CortesImageReconciliationApply.mjs` 18/18 PASS; `CortesImageReconciliation.mjs` 34/34 PASS. Parsing del módulo completo `admin.js` con runtime V8 PASS. No se ejecutó `RunServiceTests.mjs` completo ni Node sobre un checkout local: el clon HTTPS no pudo resolver `github.com`; se usó ejecución dinámica aislada de los tests y CI remoto posterior al commit para completar la regresión.
- El preview integral permanece bajo ScriptLock porque combina snapshot de destinos, referencias y ACL; moverlo requiere una revalidación equivalente. No se introduce lease ni se debilita la verificación. La medición de contención real queda para Beta autorizada.
- Sin despliegue Apps Script ni cambios de Spreadsheet/Drive productivos. CI global posterior al commit pendiente.
