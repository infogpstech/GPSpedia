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
