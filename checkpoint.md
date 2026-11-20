# Checkpoint activo — GPSpedia

Fecha: 2026-11-20

## Repositorio y ramas
- Repositorio: infogpstech/GPSpedia
- Rama autorizada: GPSpedia2.2.5_work
- HEAD de trabajo antes de esta actualización: `bf18632e464db0d2fee2b11b62ac86a76361878c` (último commit de código/pruebas de esta subactividad). Rama base protegida `d9acc68d889985c2e2f42fe3a02e502efc86ead1` sin modificar.
- Rama base protegida GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificar).
- No hay checkout local disponible. Los archivos se actualizaron secuencialmente mediante la API de contenidos de GitHub, con lectura del blob vigente antes de cada escritura; esta API no expone una condición CAS para el HEAD de la rama. No se usó force ni se modificó la rama base.

## Normativa y arquitectura
- NORMAS_DESAROLLO.md es la única fuente normativa vigente y se consultó en su totalidad para esta continuidad.
- La sección 15 prioriza baja latencia y simplicidad: no añadir leases ni verificaciones transaccionales ordinarias sin evidencia y necesidad demostrada.
- README.md y contexto_personal.md consultados para arquitectura y restricciones; no inferir deployments Apps Script ni permisos externos desde el código versionado.

## Última tarea local completada
P1 — AUTH recuperación de contraseña: logging después de liberar ScriptLock.
- La verificación/consumo del desafío, actualización del hash, revocación de sesiones y limpieza permanecen bajo ScriptLock.
- Solo el logging best-effort se ejecuta después de liberar el lock, evitando la adquisición anidada del mismo ScriptLock que usa Logs.
- PasswordRecovery.mjs 10/10 PASS; ejecución aislada V8 del handler PASS en éxito, código inválido y fallo de logging; parsing de Auth.js y fixture PASS; paridad del handler productivo/fixture PASS.
- CI 44726478008 SUCCESS: 215 suites, 2,686 pruebas aprobadas, 0 fallos; health read-only 44726478247 SUCCESS; Pages 44726477077 SUCCESS.
- Commits funcionales/correcciones: fbec2fc2da7e4fa5fc16c34cb6502d43b127e979, 456d18e33755a5269c8596e5ed45d59dafb4f2ca y 086dc89e9021b8530874205b5361baf5e962489d. Commit documental de validación: 7c4d7c5280cd7c4fc571476207bed9dd35c11bdf.
- La ejecución inicial 44726038448 detectó contaminación de eventos previos en el harness; se aisló la traza y la repetición pasó sin debilitar la aserción.

## Estado de implementación y validación
- Se abrió una nueva tarea local P1 solicitada expresamente: GP-UX-SEARCH-MODEL-GROUPING-01 (agrupación de resultados por modelo y navegación Modelo → Variante → Rango de años → Modal). La auditoría preimplementación está registrada; todavía no se modificó código. Las 17 tareas anteriores de Beta permanecen abiertas y separadas.
- Regresión más reciente sobre HEAD 38b5a02ca951270c2e93001edfa349a46a805f7a: CI 44731927622 SUCCESS (215 suites, 2,686 pruebas, 0 fallos); health read-only 44731927645 SUCCESS; Pages 44731926587 SUCCESS.
- lista_beta_parte1.txt comienza con la secuencia obligatoria: verificar repo/rama/árbol limpio, fetch y pull --ff-only; no se usará reset/clean/force. No se ejecutó sincronización local porque no hay clon local disponible.
- Beta pendiente de autorización. Comenzar únicamente con auditoría y preview Drive/Spreadsheet de solo lectura. Safe Apply, movimientos, renombrados y eliminaciones continúan bloqueados hasta revisión y autorización explícita.
- No se desplegó Apps Script ni se accedió o modificó datos productivos.

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


### Validación post-commit — conciliación de imágenes Cortes (2026-11-20)
- Commit funcional/documental: `3fd8b2d5afedbfcdec0e261cad4690d3257d962c`; padre `2a418d2f3cb634737267aea5ae078fd61cdcfec8`.
- CI regresión `44708443965` SUCCESS; health de servicios `44708443686` SUCCESS (read-only); Pages `44708443338` SUCCESS.
- Diff del commit confirmado: únicamente `JS/Services/admin.js`, `JS/Tests/CortesImageReconciliationApply.mjs`, `Tareas_Activas.md`, `checkpoint.md` y `ChangesLogs.txt`.
- Rama de trabajo verificada en el commit funcional; rama base continúa en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


## Resolución — propuesta de lease para papelera ADMIN (2026-11-20)
- La propuesta de sacar `setTrashed`, restauración y compensación del ScriptLock se evaluó y se cerró como decisión técnica, sin implementación.
- La adenda del backlog del 2026-11-17 ya había diferido el patrón claim/reserva/commit a medición Beta por falta de evidencia de contención. La sección 15 de la normativa vigente exige simplificación y no justifica añadir leases por suposición.
- No se elimina ni se debilita el lock actual de las operaciones destructivas. Reabrir solo si una medición Beta autorizada demuestra contención real y existe un diseño seguro compatible con normativa.
- Prueba local aislada `AdminImageTrashLifecycle.mjs`: 41/41 PASS. Regresión global CI `44708443965`: 215 suites, 2,686 pruebas aprobadas, 0 fallos; health read-only `44708443686` SUCCESS; Pages `44708443338` SUCCESS.
- Las tareas locales implementables del registro activo están cerradas. Lo restante requiere Beta autorizada: despliegues Apps Script, auditoría Drive/Spreadsheet real, medición de concurrencia entre deployments y revisión de Safe Apply. No se ejecutó despliegue ni se modificaron datos productivos.
- Siguiente paso autorizado: ejecutar la secuencia inicial de `lista_beta_parte1.txt` (árbol limpio, fetch y pull --ff-only) y comenzar únicamente con auditoría/preview de solo lectura cuando se autorice el deployment aislado. No aplicar movimientos, renombrados ni eliminaciones.


## P1 — AUTH recuperación de contraseña: logging post-lock (2026-11-20)
- Hallazgo concreto: `handleCompletePasswordRecovery` llamaba `logToSheet` antes de liberar el `ScriptLock` de AUTH, aunque `logToSheet` adquiere el mismo lock global para insertar en Logs.
- Cambio: el procesamiento sensible (validación/consumo del desafío, cambio de hash, revocación de sesiones y limpieza) permanece bajo lock; solo se guarda el resultado y el registro de éxito se ejecuta después del `finally`. Se conserva logging best-effort y el mismo mensaje/detalles.
- Prueba agregada a `PasswordRecovery.mjs`: verifica el orden de eventos `wait → release → log`. Copia de fixture `JS/Tests/Auth.js` sincronizada.
- No se cambia la protección de Logs ni la purga sensible. No se modifica la semántica de recuperación, revocación ni el resultado HTTP.
- Validaciones: pendientes de ejecución en esta actualización.
- Sin deployment ni acceso a datos productivos.


### Ajuste del test de orden de logging AUTH (2026-11-20)
- La primera ejecución de CI detectó que el harness conservaba los eventos de lock de la solicitud de emisión del código. Se aisló el tramo de finalización limpiando el registro de eventos después de emitir el código y antes de invocar `handleCompletePasswordRecovery`; no se cambió la aserción de orden ni el código productivo.
- Se corrigieron además los escapes de regex del handler y de su fixture para mantener la validación de espacios y el patrón de correo original.
- CI inicial `44726038448` falló únicamente en la aserción del harness; health read-only `44726038467` y Pages `44726038563` SUCCESS. La validación corregida queda pendiente de nueva ejecución.


### Validación final — AUTH logging post-lock (2026-11-20)
- Commit de implementación/prueba: `fbec2fc2da7e4fa5fc16c34cb6502d43b127e979`; corrección de regex/fixture: `456d18e33755a5269c8596e5ed45d59dafb4f2ca`; ajuste de aislamiento de eventos del test: `086dc89e9021b8530874205b5361baf5e962489d`.
- `PasswordRecovery.mjs` 10/10 PASS; prueba aislada V8 del handler PASS en éxito, código inválido y fallo de logging; parsing de AUTH/fixture PASS; paridad de handler PASS.
- CI `44726478008` SUCCESS: 215 suites, 2,686 pruebas, 0 fallos; health read-only `44726478247` SUCCESS; Pages `44726477077` SUCCESS.
- Se conserva la mutación de Users/ActiveSessions y la revocación dentro de ScriptLock; solo el logging best-effort ocurre después de liberarlo. No se cambia la protección de Logs ni la purga sensible.
- La primera CI `44726038448` detectó una contaminación del event trace del harness; se corrigió aislando el tramo de finalización. No quedó ningún fallo en la CI corregida.
- Sin despliegue Apps Script ni modificaciones de datos productivos.


## Continuidad corregida — 2026-11-20
- Se detectó que el checkpoint activo seguía apuntando a `7c4d7c5280cd7c4fc571476207bed9dd35c11bdf`, un commit padre, y no al HEAD real. Se corrigió contra la API de ramas de GitHub: `e863c1f82ae3a0082a6bbf55ee21d2b51ba3c4cd`.
- Verificación cruzada: branch API, commit API y ejecución de workflows con el SHA exacto coinciden. Rama base `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Validaciones exactas del HEAD anterior al checkpoint: regresión `44730842247` SUCCESS (215 suites, 2,686 pruebas, 0 fallos); health read-only `44730842225` SUCCESS; Pages `44730841115` SUCCESS.
- Las 17 casillas abiertas siguen requiriendo acceso/acciones en Beta, Script IDs o datos reales de Drive/Spreadsheet y concurrencia desplegada. No se reinterpretan como tareas locales ni se marcan completadas sin evidencia.
- Sin despliegues Apps Script ni cambios en Drive/Spreadsheet.


## Comprobación de ejecución Beta y herramientas — 2026-11-20
- Node local disponible: v22.16.0; npm 10.9.2. `clasp` no está instalado.
- Se intentó obtener un clon limpio de `GPSpedia2.2.5_work` para ejecutar el runner local; `git clone` no pudo resolver `github.com` (DNS/salida de red no disponible). No existe checkout local de este repositorio en el contenedor, por lo que no se atribuyen pruebas locales a Node.
- GitHub Actions sí ejecutó la regresión completa sobre el HEAD anterior al checkpoint: `44731452326` SUCCESS (215 suites, 2,686 pruebas, 0 fallos); health GET read-only `44731452344` SUCCESS; Pages `44731450125` SUCCESS.
- Se buscó una vía conectada para Drive/Sheets/Apps Script: el conector Google Drive está deshabilitado por administración y no está disponible para instalación; no hay acción de Apps Script/clasp ni workflow de despliegue en el repositorio. El workflow de health solo realiza GET de lectura.
- Resultado: no se inventó una validación Beta ni se desplegó. Las tareas de deployment, auditoría Drive/Spreadsheet y concurrencia real permanecen abiertas. La ejecución podrá continuar cuando exista una vía autorizada al proyecto Apps Script de Beta (Script IDs/credenciales o conector habilitado). No se solicita ni requiere tocar datos productivos.


## Tarea local en curso — GP-UX-SEARCH-MODEL-GROUPING-01 (2026-11-20)
- Requisito registrado: agrupar resultados de búsqueda por modelo; al seleccionar un modelo, mostrar versiones/equipamiento o tipos de encendido únicamente cuando haya varias opciones; después mostrar rangos de años y abrir directamente el modal cuando exista un único rango. La navegación normal, el botón Atrás y el historial del navegador deben seguir la misma jerarquía y omitir pasos de una sola opción.
- Auditoría preimplementación documentada en AUDITORIA_BUSQUEDA_MODELOS_2026-11-20.md.
- Hallazgos centrales: búsqueda global entrega registros de Corte individuales; el render actual dibuja una tarjeta por registro y autoabre un único resultado normal; selección de equipamiento omite la selección de encendido; la pantalla de encendido se fuerza aun con una sola opción; la pantalla de años no agrupa rangos ni abre directamente un rango único.
- Se identificaron los flujos VIN exacto/ambiguo y la restauración de History API como compatibilidad obligatoria. No se modificó código productivo en esta etapa.
- Estado: EN PROGRESO — auditoría preimplementación completada y registrada; implementación y pruebas específicas pendientes.

## GP-UX-SEARCH-MODEL-GROUPING-01 — implementación local (2026-11-20)
- Rama: `GPSpedia2.2.5_work`. HEAD verificado antes de este checkpoint: `3aa444fb75e98542f454e847b9a22f71e81e09d4`.
- Implementados los helpers de agrupación por categoría/marca/modelo y resolución opcional de equipamiento, encendido y rangos. Corregido el orden para usar la mejor relevancia del grupo.
- UI de búsqueda agrupada; búsqueda textual no abre el modal sin selección del modelo; VIN inequívoco conserva autoapertura y VIN ambiguo/Relay/Tutorial/PyS permanecen separados.
- Historial existente conserva query, modelo, versión y tipo de encendido; main.js reconstruye búsqueda y niveles por popstate. Prueba de ruta History API agregada.
- `SearchModelGrouping.mjs` registrado en `RunServiceTests.mjs`. Ejecución aislada Node v22.16.0: 21/21 PASS. Los helpers y History API se ejecutaron; las comprobaciones UI/navigation/main fueron estáticas.
- Comprobación sintáctica normalizando import/export de módulo: `search-utils.js`, `ui.js`, `navigation.js`, `main.js`, `navigationHistory.js`, `SearchModelGrouping.mjs` y `RunServiceTests.mjs` parsean correctamente.
- `Tareas_Activas.md`, `ChangesLogs.txt` y `AUDITORIA_BUSQUEDA_MODELOS_2026-11-20.md` actualizados.
- Validación aún pendiente: regresión integral `RunServiceTests.mjs` y prueba visual en navegador. No se dispone de checkout local; las herramientas GitHub consultadas no devolvieron estados de CI para estos commits.
- La rama base protegida permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no se escribió en ella. Sin despliegue Apps Script ni cambios en datos productivos.
- Estado: implementación local completada; cierre de validación pendiente.

## GP-PERF-ADMIN-CUT-LOCK-01 — reserva idempotente de vehicleId ADMIN→WRITE (2026-11-20)
- **Tarea:** completar la reserva idempotente del ID central de Cortes para altas nuevas. **Parte completada:** transporte de la identidad de operación desde ADMIN y persistencia/reutilización de la reserva dentro del asignador WRITE.
- **Rama:** `GPSpedia2.2.5_work`. HEAD confirmado antes de este commit documental: `3edc0254a01014c5cf84071132a904aac24ef908`. La rama base `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- ADMIN envía `opId` y `operationHash` ya calculado para la ruta idempotente; las solicitudes legacy siguen enviando solo userId/sessionToken.
- WRITE mantiene el `tryLock(0)`, crea/verifica el ledger `CortesIdReservations` y persiste `opId`, huella SHA-256, vehicleId y fecha. Mismo opId/huella devuelve el ID reservado; una huella distinta se rechaza. Las asignaciones legacy también consideran la última reserva persistida para no reutilizar IDs si el contador no pudo actualizarse.
- Se conserva la validación de rol existente, el lock WRITE y el código `WRITE_BUSY`; no se añadió lease, autorización remota ni cambio de RBAC.
- **Validación CI:** `44746455621` SUCCESS — 219 suites, 2,723 pruebas aprobadas y 0 fallos. Pruebas focalizadas: WriteVehicleIdAllocationIdempotency 9/9; AdminVehicleIdAllocationIdempotency 3/3; VehicleIdAllocationEndToEnd 4/4; AdminCutPreflightBeforeAllocation 7/7. Health read-only `44746455562` SUCCESS y Pages `44746451810` SUCCESS.
- **Qué sigue:** continuar la siguiente parte local de `GP-PERF-ADMIN-CUT-LOCK-01`: revisar las lecturas restantes de Sheets en `handleAddOrUpdateCut` y retirar únicamente consultas redundantes demostrables, sin mover fuera del lock las reservas, las comprobaciones de conflicto, la revalidación ni escrituras que deban ser atómicas. Después ejecutar otra vez la regresión completa.
- **Validación diferida a Beta:** comprobar en el deployment aislado que WRITE crea/usa el ledger en Spreadsheet real y que el reintento tras respuesta perdida devuelve el mismo ID. No se desplegó Apps Script ni se modificaron hojas/Drive productivos.
- **Estado:** esta subactividad queda COMPLETADA LOCALMENTE CON VALIDACIÓN DIFERIDA A BETA; el bloque mayor GP-PERF-ADMIN-CUT-LOCK-01 sigue EN PROGRESO.


## GP-PERF-ADMIN-CUT-LOCK-01 — reducción de lecturas en recuperación legacy (2026-11-20)
- **Tarea realizada:** inspeccionar las lecturas de Sheets en `handleAddOrUpdateCut` y reducir únicamente una duplicación demostrable de la recuperación legacy de `opId`.
- **Hallazgo:** `findRowByOpId` descargaba `Cortes` con `getDataRange().getValues()` para localizar el `opId`; luego `findUniqueCortesVehicleRow_` repetía la consulta de la columna ID y leía de nuevo la fila completa. También se consultaba `getLastRow()` antes de la lectura integral.
- **Cambio:** se añadió `findUniqueCortesVehicleRowFromSnapshot_`, que valida los IDs y la unicidad desde el mismo array `data`, devuelve la fila ya leída y mantiene el rechazo de IDs ausentes, duplicados o malformados. La ruta legacy usa `data.length <= 1` para el caso sin registros y elimina la consulta previa de `getLastRow()`.
- **Prueba:** se añadió `JS/Tests/AdminLegacyOpIdSnapshotReuse.mjs` (registrada en `RunServiceTests.mjs`) para comprobar reutilización de snapshot, índice/fila, ausencia, duplicidad, IDs malformados y que no haya segunda lectura. El resumen de la prueba está fijado en 10/10 comprobaciones.
- **Commits de esta iteración:** `902867481b565adf6dcf709ba4d969f7e850c4b5` (helper de reutilización); `919e579e295d3debb30871eef3d30a1966be1073` (elimina lectura previa getLastRow); `a272b89b64115c9932194535ca217520deefcaee` (test); `089c7b36365b7e72c415399d7fd03959c8a3a72c` (registro en runner); `115f748541203b2e17c16b144c0619c5c655302d`, `5abcf68e26f0de916275beb91a28fb06962173df` y `629daef206f4762b2a942da4c196f0da665574d0` (correcciones del test); `d4a31ff1adb887ae4288c3a707cca783597377e8` (recuento del test); `a683cb78462807d42fb4502e82e12e3525de7f05` (corrección final del recuento a 10/10).
- **Validación pendiente:** no se ejecutó Node ni `RunServiceTests.mjs` porque no hay checkout local del repositorio y el entorno no puede clonar GitHub. `get_commit_combined_status` y la consulta de ejecuciones para el último commit no devolvieron checks/workflows; no se afirma que la prueba haya pasado. La comprobación sintáctica de la prueba también queda pendiente de ejecución.
- **Lecturas que se conservaron:** la lectura del ledger Idempotencia y su verificación dirigida; las lecturas de fila/ID que revalidan reservas después de liberar el lock; la detección de VIN duplicado; la lectura del snapshot de fila existente; y las lecturas/escrituras necesarias para crear o completar la fila nueva. No se movió ninguna de ellas fuera del ScriptLock.
- **Estado:** CAMBIO IMPLEMENTADO Y REGISTRADO; VALIDACIÓN PENDIENTE. `GP-PERF-ADMIN-CUT-LOCK-01` sigue EN PROGRESO y no se marca completada.
- **Siguiente tarea:** ejecutar `AdminLegacyOpIdSnapshotReuse.mjs` y la regresión completa `RunServiceTests.mjs` en un checkout sincronizado; corregir cualquier fallo. Después continuar el análisis del siguiente grupo de lecturas, sin tocar reservas, detección de conflictos, revalidación ni escrituras atómicas.
- Sin deployment Apps Script ni cambios en hojas/Drive productivos.


## Continuidad — validación focalizada de recuperación legacy ADMIN (2026-11-20)
- HEAD de trabajo verificado antes de esta actualización documental: `239a2919fceebf5dbc269627d3569fb11af228e1`; rama base verificada: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Se confirmó que `AdminLegacyOpIdSnapshotReuse.mjs` está registrado en `RunServiceTests.mjs` y que el código de `findRowByOpId` reutiliza `data` para validar unicidad y recuperar la fila, sin la llamada previa a `getLastRow()` ni una segunda lectura del ID/fila en la ruta legacy.
- Prueba focalizada aislada: 10/10 PASS en Node v22.16.0, usando el helper y el handler extraídos de la fuente vigente. `node --check` PASS sobre el harness aislado y el archivo de prueba.
- Limitación de entorno: no hay checkout local completo; por tanto, `RunServiceTests.mjs` integral no se pudo ejecutar localmente. El harness aislado no se presenta como ejecución del runner oficial.
- GitHub Actions no reporta todavía checks ni ejecuciones asociados al HEAD verificado. La regresión integral se solicitará mediante el commit documental de esta actualización; mantener abierta la tarea hasta comprobar el resultado real.
- Estado: EN PROGRESO — prueba focalizada aislada aprobada; regresión integral/CI pendiente. No se desplegó Apps Script ni se modificaron hojas/Drive productivos.


## Cierre — recuperación legacy ADMIN por snapshot (2026-11-20)
- La prueba focalizada oficial `AdminLegacyOpIdSnapshotReuse.mjs` aprobó 10/10 dentro de `RunServiceTests.mjs`.
- CI `44763121682` SUCCESS sobre HEAD `7c5a25ee4dcd6a568b632aa6737eb3b8436ee1db`: 220 suites, 2,733 pruebas aprobadas, 0 fallos; parsing de módulos requeridos PASS.
- Health read-only `44763121560` SUCCESS. Pages `44763122319` quedó en cola al momento de esta actualización; no es criterio para la validación lógica de esta tarea.
- Diff de implementación ya registrado en `902867481b565adf6dcf709ba4d969f7e850c4b5` y `919e579e295d3debb30871eef3d30a1966be1073`; test y runner incorporados en commits posteriores. La actualización documental de validación está en `7c5a25ee4dcd6a568b632aa6737eb3b8436ee1db`.
- Estado de la subactividad: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. La verificación de la ruta real contra Spreadsheet/ScriptLock requiere deployment y entorno Beta autorizado.
- Siguiente paso de `GP-PERF-ADMIN-CUT-LOCK-01`: inspeccionar el siguiente grupo de lecturas remotas de Sheets dentro de `handleAddOrUpdateCut`, identificar duplicaciones demostrables y probarlas sin mover reservas, revalidaciones ni escrituras atómicas fuera de sus locks.


## Cierre — acotar lectura previa de ID en ADMIN (2026-11-20)
- En `handleAddOrUpdateCut`, la búsqueda previa de un vehículo existente empieza en la fila 2 y termina en `lastRowForLookup`; la cantidad correcta es `lastRowForLookup - 1`. Se eliminó la lectura de una fila vacía posterior al último registro.
- La revalidación bajo ScriptLock permanece intacta: se vuelve a leer una única fila acotada, se confirma que el ID siga siendo el solicitado y se conserva el snapshot para las operaciones siguientes.
- `AdminExistingVehicleLookupPreflight.mjs` actualizado para exigir el rango exacto y validar el número de filas; 10/10 PASS en CI. `AdminExistingVehicleSnapshotRevalidation` y `AdminExistingVehiclePostDriveSnapshotReuse` permanecen integrados en la regresión.
- CI `44763460378` SUCCESS sobre HEAD `d645b74f9cb5a6f7baf67ee4c2da054e61898ea6`: 220 suites, 2,735 pruebas aprobadas, 0 fallos; sintaxis PASS. Health read-only `44763460429` SUCCESS.
- Diff revisado: únicamente `JS/Services/admin.js` (una línea) y `JS/Tests/AdminExistingVehicleLookupPreflight.mjs` (aserciones actualizadas). Rama base protegida sin cambios.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron datos productivos.
- Siguiente paso: continuar la inspección de las lecturas restantes de `handleAddOrUpdateCut`, sin modificar lecturas necesarias para revalidación, reservas, unicidad o read-back.


## Cierre — reutilización del snapshot Idempotencia en ADMIN (2026-11-20)
- `handleAddOrUpdateCut` ya lee `Idempotencia` bajo ScriptLock y conserva ese snapshot durante la sección crítica. La búsqueda inicial de `opId` ahora consume el mapa validado sin repetir inmediatamente la lectura dirigida de la misma entrada.
- `findRowByOpId` mantiene la revalidación dirigida por defecto. Los callbacks posteriores a liberar/readquirir el lock y la reconciliación de escrituras fallidas continúan usando el camino de revalidación; solo la llamada inicial pasa explícitamente `false`.
- Auditoría de escritores: `recordOpId` se invoca desde `handleAddOrUpdateCut` bajo el lock; la migración de Idempotencia también adquiere ScriptLock. `handleCheckOperation` es de solo lectura. No se identificó un escritor normal de ese ledger fuera de la exclusión ADMIN.
- `AdminIdempotencySnapshotReuse` 10/10 PASS; `AdminLegacyOpIdSnapshotReuse` 10/10 PASS. CI `44764022976` SUCCESS sobre HEAD `354255971a6fe7e785a1e339ed2f1da8715910a1`: 220 suites, 2,735 pruebas aprobadas, 0 fallos; sintaxis PASS. Health read-only `44764023135` SUCCESS.
- Primer intento CI `44763915168` falló porque `AdminLegacyOpIdSnapshotReuse.mjs` buscaba la firma antigua de tres parámetros; se actualizó el extractor para la firma opcional de cuatro parámetros y la repetición aprobó. No fue un fallo funcional del handler.
- Diff revisado: `JS/Services/admin.js`, `JS/Tests/AdminIdempotencySnapshotReuse.mjs` y `JS/Tests/AdminLegacyOpIdSnapshotReuse.mjs`. Sin cambios de permisos, contrato externo, reserva, idempotencia, ni revalidación post-lock.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.
- Siguiente paso: revisar las lecturas restantes de `recordOpId` y `markAdminCutImagesLinkedOutsideLock_`; retirar únicamente viajes remotos duplicados cuya redundancia pueda probarse sin eliminar read-back ni revalidación tras Drive.


## Cierre — auditoría de lecturas ADMIN y regresión de búsqueda agrupada (2026-11-20)
- HEAD de código validado: `354255971a6fe7e785a1e339ed2f1da8715910a1`; rama base `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Se completaron las subactividades locales del bloque `GP-PERF-ADMIN-CUT-LOCK-01`: reutilización de snapshot legacy, rango exacto de IDs, snapshot Idempotencia inicial sin relectura inmediata y auditoría de lecturas restantes.
- La auditoría final conserva las revalidaciones dirigidas pre-escritura y los read-back de `recordOpId`, además de la revalidación `findRowByOpId` después de liberar/readquirir ScriptLock para Drive. No se identificó otra consulta eliminable sin reducir garantías de integridad/concurrencia.
- CI final `44764022976` SUCCESS: 220 suites, 2,735 pruebas, 0 fallos; `AdminIdempotencySnapshotReuse` 10/10, `AdminExistingVehicleLookupPreflight` 10/10, `AdminExistingVehicleSnapshotRevalidation` 7/7, `AdminExistingVehiclePostDriveSnapshotReuse` 9/9, `AdminTestigoHeaderReadReuse` 8/8, `AdminLegacyOpIdSnapshotReuse` 10/10 y `SearchModelGrouping` 21/21. Health read-only `44764023135` SUCCESS.
- Se corrigió el primer CI fallido `44763915168`: un test legacy esperaba la firma anterior de `findRowByOpId`; el extractor se actualizó y la ejecución repetida aprobó.
- `GP-PERF-ADMIN-CUT-LOCK-01`: COMPLETADA LOCALMENTE CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron hojas/Drive productivos. Beta pendiente: Script IDs reales, no interferencia y concurrencia/Drive/Spreadsheet.
- `GP-UX-SEARCH-MODEL-GROUPING-01`: regresión integral completada (`SearchModelGrouping` 21/21 y runner global 220 suites/2,735 pruebas); queda pendiente la prueba visual de navegador con catálogo representativo.
- Siguiente paso: preparar/ejecutar la prueba visual de búsqueda agrupada en un navegador automatizado o entorno Beta autorizado; no modificar contratos de búsqueda ni datos productivos.


## Verificación final de continuidad (2026-11-20)
- HEAD real verificado antes de este registro: `3320cfea89a96f31911761b926c82a48d0165e1e`; rama base `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; trabajo `GPSpedia2.2.5_work` sin commits detrás de la base.
- CI del HEAD documental `44764442331` SUCCESS: 220 suites, 2,735 pruebas, 0 fallos. `AdminIdempotencySnapshotReuse` 10/10, `AdminExistingVehicleLookupPreflight` 10/10, `AdminLegacyOpIdSnapshotReuse` 10/10 y `SearchModelGrouping` 21/21 PASS. Health read-only `44764442042` SUCCESS.
- No existe `package.json` ni checkout local en este entorno y no hay herramienta de navegador interactivo disponible; la comprobación visual real de SearchModelGrouping queda diferida a Beta, sin presentarla como ejecutada.
- `GP-PERF-ADMIN-CUT-LOCK-01`: implementación/auditoría y regresión local COMPLETADAS CON VALIDACIÓN DIFERIDA A BETA. `GP-UX-SEARCH-MODEL-GROUPING-01`: implementación y regresión COMPLETADAS; solo queda prueba visual de navegador en Beta.
- No se desplegó Apps Script, no se modificó la rama base ni se escribieron datos de producción. Siguiente paso: prueba visual en navegador/Beta autorizada para búsqueda agrupada; luego continuar el backlog local vigente.


## Checkpoint final — cierre local y continuidad (2026-11-20)
- HEAD remoto verificado antes de este checkpoint: `6f3a00c1e248ac88efda1bcc7976afddc8db3f16`. Este HEAD contiene los cambios de código validados y los registros anteriores; el commit actual de checkpoint será documental.
- CI `44764662255` SUCCESS: 220 suites, 2,735 pruebas aprobadas, 0 fallos; `SearchModelGrouping` 21/21, `AdminIdempotencySnapshotReuse` 10/10, `AdminExistingVehicleLookupPreflight` 10/10 y `AdminLegacyOpIdSnapshotReuse` 10/10. Health read-only `44764661958` SUCCESS; Pages `44764661992` SUCCESS.
- Rama base protegida sigue en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; comparación trabajo/base: 5,339 commits adelante, 0 detrás. No se modificó la base.
- `GP-PERF-ADMIN-CUT-LOCK-01` queda COMPLETADA CON VALIDACIÓN DIFERIDA A BETA para la implementación/auditoría local. Las comprobaciones de Script IDs, proyectos desplegados, concurrencia real y Drive/Spreadsheet quedan abiertas para Beta autorizada.
- `GP-UX-SEARCH-MODEL-GROUPING-01` queda COMPLETADA CON VALIDACIÓN DIFERIDA A BETA para la implementación y regresión local. Falta únicamente la prueba visual real en navegador con catálogo representativo; no existe checkout local ni herramienta de navegador interactivo en esta sesión. No se presenta como ejecutada.
- `NORMAS_DESAROLLO.md`, `README.md`, `contexto_personal.md`, `checkpoint.md`, `Tareas_Activas.md`, la auditoría de búsqueda y la lista Beta fueron consultados. No se realizó despliegue Apps Script ni acceso/escritura en Sheets/Drive productivos.
- Siguiente paso: preparar la prueba visual de BETA-04 en navegador/Beta autorizado siguiendo primero la secuencia segura de `lista_beta_parte1.txt`; no realizar Safe Apply ni cambios productivos.


## Continuidad — reconciliación del backlog y preparación de Safe Apply (2026-11-20)
- HEAD confirmado antes de la actualización documental: `6a6b7441cd41b189e1b894bc0101f95ff83dc5e8`; rama base protegida `d9acc68d889985c2e2f42fe3a02e502efc86ead1` sin cambios. Se actualizaron únicamente registros en `GPSpedia2.2.5_work`.
- Regresión más reciente del HEAD anterior: CI `44764926538` SUCCESS (220 suites, 2,735 pruebas, 0 fallos); health read-only `44764926532` SUCCESS; Pages `44764925637` SUCCESS.
- `Tareas_Activas.md` ahora incluye una consolidación vigente sin borrar ni reescribir las entradas históricas: fases 1, 3 y 7 tienen regresión integral aprobada; fase 2 conserva solo configuración/deployments Beta; fase 4 conserva inspección visual Beta; fase 5 tiene constructor/auditoría/preview/UI de solo lectura implementados, pero su auditoría y preview con Drive/Spreadsheet reales siguen pendientes de Beta; fase 6 está completada.
- Búsqueda agrupada `GP-UX-SEARCH-MODEL-GROUPING-01`: 21/21 focalizada y regresión integral aprobada; solo prueba visual de navegador pendiente. Optimización ADMIN/WRITE y reserva idempotente de vehicleId: código y regresión local completados; pruebas reales de Script IDs, concurrencia y Spreadsheet aislado pendientes.
- Hallazgo de alcance: el código actual contiene `handlePreviewCortesImageOrganizer_` (solo lectura, `writePerformed:false`, `canApply:false`). Existe `handleApplyCortesImageReconciliation_`, pero es una función distinta para reconciliar referencias vacías y no implementa movimientos/renombrados del organizador. No debe reutilizarse ni confundirse con Safe Apply.
- Safe Apply permanece SIN IMPLEMENTAR. La tarea depende explícitamente de auditar ADMIN en Beta, generar una auditoría Drive nueva y revisar el preview completo (rutas, nombres, extensiones, referencias, ACL, duplicados y conflictos). No se realizaron movimientos, renombrados, borrados, restauraciones, despliegues ni cambios en Drive/Spreadsheet.
- Preparación Beta documentada: verificar repo/rama/árbol limpio y sincronizar solo mediante `fetch` + `pull --ff-only` al inicio de `lista_beta_parte1.txt`; Coordinator primero y FEEDBACK después, según `Services/COORDINATOR_SETUP.md`. No se dispone en esta sesión de checkout local, clasp, Script IDs ni mecanismo autorizado de despliegue; por tanto no se inventaron IDs ni se ejecutaron operaciones remotas.
- Siguiente tarea: habilitar/acceder al entorno Beta autorizado y verificar Script IDs/deployments; ejecutar auditoría y preview de solo lectura. Solo tras aprobar el manifiesto real, diseñar e implementar Safe Apply por lotes idempotentes con verificación, manifiesto y rollback.


## Checkpoint — cobertura del constructor del organizador (2026-11-20)
- HEAD de código verificado: `4f5a85065816d2277341cf1f7827c29d9dc2519b`; rama base protegida `d9acc68d889985c2e2f42fe3a02e502efc86ead1` intacta.
- Se añadió `JS/Tests/CortesImageOrganizerTargets.mjs` y se registró en `RunServiceTests.mjs`; cubre 8 escenarios del constructor puro de destinos de Cortes/LogosMarca. CI `44768089834` SUCCESS: 221 suites, 2,743 pruebas, 0 fallos; suite nueva 8/8 PASS. Health read-only `44768090013` SUCCESS; Pages `44768089955` estaba en ejecución al registrar.
- Primer intento falló por fixture que el clasificador bloqueó; se corrigió únicamente el dato de prueba y la repetición pasó. Sin cambios productivos.
- La consolidación del backlog está en `Tareas_Activas.md`; no se reescribió historial. No se desplegó Apps Script ni se accedió/escribió Drive/Spreadsheet.
- Siguiente: verificar resultado final de Pages; luego preparar Beta de solo lectura para auditar ADMIN, generar auditoría Drive nueva y revisar preview completo. Safe Apply no se implementará hasta aprobar ese preview real.


## Checkpoint — cierre de pruebas locales y preparación Beta (2026-11-20)
- HEAD de código/documentación verificado antes de este checkpoint: `d2797d02b35b9acade57d392eff2cefc9b277698`; rama base protegida `d9acc68d889985c2e2f42fe3a02e502efc86ead1` intacta.
- Regresión del HEAD: CI `44768324636` SUCCESS, 221 suites, 2,743 pruebas, 0 fallos; `CortesImageOrganizerTargets` 8/8. Health read-only `44768324683` SUCCESS. Pages `44768323927` seguía ejecutándose.
- `Tareas_Activas.md` conserva la consolidación vigente y el historial anterior; la tarea local de reconciliación documental y la cobertura del constructor del organizador están completadas.
- Se confirmó mediante búsqueda de integraciones que Google Drive está `DISABLED_BY_ADMIN` y no se encontró una integración de Google Apps Script disponible. El repositorio no versiona `.clasp.json`/`appsscript.json`; no hay acceso de deployment/ScriptProperties en las herramientas actuales. No se solicitaron ni expusieron secretos.
- La siguiente actividad exige entorno Beta autorizado y acceso real: verificar Script IDs/deployments, desplegar Coordinator primero según el runbook, desplegar consumidores compatibles, generar auditoría Drive nueva y ejecutar preview solo lectura. Sin eso no se puede aprobar el manifiesto ni implementar Safe Apply responsablemente.
- No se desplegó Apps Script ni se realizaron operaciones Drive/Spreadsheet. No se movieron, renombraron, borraron ni restauraron imágenes.


## Checkpoint de entrega — continuidad y acceso Beta (2026-11-20)
- HEAD de la rama verificado antes de este commit documental: `f66108109a43acc304e4749c056ca81eb0764423`; rama base protegida `d9acc68d889985c2e2f42fe3a02e502efc86ead1` intacta.
- CI `44768516802` SUCCESS: 221 suites, 2,743 pruebas aprobadas, 0 fallos; `CortesImageOrganizerTargets` 8/8 PASS. Health read-only `44768516938` SUCCESS; Pages `44768516088` SUCCESS.
- Commit de código/pruebas focalizadas: `83f77db8e7904dcaa70c60e0703705cd6c763236` (suite nueva); corrección del fixture `4f5a85065816d2277341cf1f7827c29d9dc2519b`. Los commits posteriores son documentales.
- Se completó la reconciliación del backlog sin borrar entradas históricas. Safe Apply sigue sin implementar y correctamente condicionado al preview real aprobado.
- Acceso Beta: Google Drive connector aparece `DISABLED_BY_ADMIN`/`NOT_AVAILABLE`; la búsqueda de integraciones no encontró Google Apps Script. No hay acceso a ScriptProperties/deployments ni browser interactivo en este entorno. No se han compartido secretos ni ejecutado despliegues.
- Próximo paso operativo: habilitar un canal de acceso autorizado a Apps Script/Drive Beta y confirmar Script IDs de Coordinator, ADMIN y consumidores. Después seguir el runbook (Coordinator primero), generar auditoría Drive nueva y validar preview solo lectura. No ejecutar movimientos/renombrados antes de revisar el manifiesto.
- Sin cambios en la rama base, deployments, Drive ni Spreadsheet productivos.


## Continuidad — preparación local de Safe Apply del organizador (2026-11-20)
- Se confirmó que `handleApplyCortesImageReconciliation_` concilia URLs/referencias en la hoja Cortes y no es el ejecutor de movimientos del organizador; no se reutilizó para esa finalidad.
- En `JS/Services/admin.js` se añadieron primitivas puras para validar el manifiesto aprobado, exigir confirmación explícita, comprobar digest/auditoría/referencias, rechazar selección fuera de la página, IDs/destinos duplicados y nombres con separadores; clasificar estado original/ya aplicado/conflicto; y construir un plan de rollback inverso condicionado al estado exacto del destino.
- Se añadió `JS/Tests/CortesImageOrganizerApplyPlan.mjs` y se registró en `JS/Tests/RunServiceTests.mjs`.
- Parsing del archivo ADMIN completo mediante compilación V8 aislada: PASS. Ejecución aislada de las 14 comprobaciones equivalentes de la suite focalizada: 14/14 PASS.
- La herramienta GitHub no devolvió statuses ni ejecuciones de workflow asociadas al último commit de pruebas; por tanto, no se afirma que el runner oficial ni la regresión global hayan pasado. No hay checkout Node local disponible para ejecutar `RunServiceTests.mjs` directamente.
- Estado: preparación de manifiesto/idempotencia/rollback COMPLETADA; Safe Apply EN PROGRESO. Aún falta el ejecutor Drive, el registro durable por operación y validar permisos heredados de las carpetas destino. Estos puntos pueden desarrollarse y probarse en GitHub con mocks; no requieren acceso de lectura a Drive para escribir el código.
- No se ejecutaron operaciones Drive/Spreadsheet, no se movieron ni renombraron imágenes y no se desplegó Apps Script. La ejecución real permanece deshabilitada hasta revisar un preview real y verificar ACL/destinos.


## Checkpoint — Safe Apply: ejecutor durable y rollback local (2026-11-20)
- HEAD de código/pruebas antes de esta actualización documental: 331f072ef749e0c591dd62ae864797ef9324e058. HEAD actual al registrar este checkpoint: se actualizará con el commit documental. Rama base protegida GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin cambios.
- Implementado en JS/Services/admin.js: endpoint applyCortesImageOrganizer, regeneración del preview en servidor y comparación del digest aprobado, confirmación explícita, selección limitada a la página, ejecutor por lotes de hasta 10, creación/resolución de carpetas, comprobación ACL, colisiones, movimiento/renombrado y read-back.
- Ledger por operación en ScriptProperties: identidad de owner, operationId/digest/auditId, estados processing/complete/rolled_back/needs_review, persistencia verificada y transiciones protegidas con ScriptLock tryLock(0). No se ejecutan movimientos sin guardar antes el estado processing.
- Implementado rollbackCortesImageOrganizer: solo revierte operaciones completas cuando Drive coincide exactamente con destino/nombre registrados; valida ACL y colisiones en origen, confirma read-back y reconoce reintentos de rollback.
- Corrección de integridad: el estado de Drive que coincide con destino no se acepta como Safe Apply completado si no existe ledger durable previo; operaciones de otro owner quedan bloqueadas sin sobrescribir su ledger. Se corrigió también el manejo de resultados por lote.
- Pruebas: CortesImageOrganizerApplyPlan 14/14 PASS; CortesImageOrganizerExecutor 9/9 PASS. CI 44784511516 SUCCESS: 223 suites, 2,766 pruebas, 0 fallos. Health read-only 44784509991 SUCCESS; Pages 44784509701 SUCCESS. Mapa de acciones/routers 12/12 PASS.
- Incidencias intermedias de CI: faltaba mapear las dos acciones nuevas en ACTION_TO_SERVICE_MAP y el harness del ejecutor no incluía la función clasificador; ambas corregidas. La repetición final aprobó.
- Commits funcionales/pruebas: d05c9372fc6911c72d57aa7f60b05c9a33e0e750, fdf727064947440b620fa0b8a56f9b72213654e8, fa8ab89c8609242ce5345aad60c645ddebea0be5, c21ecfdc5feea2270af4afbbacef6738ddfde16c, 3aa90530a34c42cdcddc77d08d5233a1f43d8584, 5f8f92c2ff359f24080c6f7eb506f9a4debfc2b1, 0605ea0084951febd9e4b26165e7a8881b918266, 93b8c35fadcfc182f715b1f20c82ac3ba67bb31a, 74023475a0f46bdc5cd9778035f1c8d4c12829ce, d6fbe22980c5c10c3ff4d0e148e25b7569467c51 y 331f072ef749e0c591dd62ae864797ef9324e058. Commits documentales posteriores registrados aparte.
- Estado: ejecutor y rollback locales implementados y con regresión aprobada; validación diferida a Beta. No se desplegó Apps Script ni se ejecutaron operaciones Drive/Spreadsheet. No se movieron, renombraron, borraron ni restauraron imágenes.
- Pendiente local: revisar integración de UI/confirmación explícita y política de retención/consulta del ledger. Pendiente Beta: auditar Drive real, aprobar preview completo y verificar ACL heredadas/rollback en entorno aislado autorizado. Mantener Safe Apply real sin uso hasta completar esas verificaciones.
- No hay checkout local ni clasp en esta sesión; la edición/publicación se realizó mediante GitHub Contents API secuencialmente, verificando el blob previo por archivo. No se usó force ni se modificó la rama base.


## Checkpoint — integración UI de Safe Apply y rollback (2026-11-20)
- HEAD de código/UI/pruebas antes de este registro: 3f33b80e780ec493e108567a5c1bcd8cd363cbcc. Rama base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin cambios.
- index.html incorpora los botones Aplicar selección aprobada y Revertir último lote. JS/Frontend/ui.js muestra casillas solo para destinos ready, limita lotes a 1–10 elementos de la misma página y solicita confirmación interactiva independiente para aplicar y revertir.
- El frontend envía auditId, offset, digest, approvedFileIds y confirm:true. El servidor vuelve a generar el preview y compara digest antes de ejecutar. Después de cada lote se invalida la aprobación UI y se exige una nueva auditoría/preview.
- La UI conserva en memoria los operationId del último lote para ofrecer rollback durante esa sesión. No se ha implementado todavía un listado durable para recuperar lotes anteriores después de cerrar/reabrir el modal; queda como pendiente local.
- Pruebas focalizadas: CortesImageOrganizerApplyPlan 14/14, CortesImageOrganizerExecutor 9/9 y CortesImageOrganizerUiContract 10/10 PASS. CI 44785453638 SUCCESS: 224 suites, 2,776 pruebas, 0 fallos. Health read-only 44785453971 SUCCESS. Pages run 44785452029 estaba en ejecución al registrar.
- Se corrigieron dos fallos de aserciones del nuevo test UI; no eran defectos del código funcional. La ejecución final del runner aprobó.
- No se desplegó Apps Script ni se ejecutaron movimientos/renombrados reales. No se modificaron Drive/Spreadsheet. La prueba del ejecutor usa adaptadores simulados.
- Siguiente trabajo local: consulta/retención del ledger y recuperación de operationId de lotes previos a la sesión UI. Después, revisión visual responsive. Beta sigue pendiente para comprobar ACL heredadas reales y aplicación/rollback en Drive aislado con preview aprobado.


## Checkpoint — historial durable y retención de Safe Apply (2026-11-20)
- HEAD de código/UI/pruebas antes de esta actualización documental: 9a3f9fcb586034f677af7847720397a1a6441672. Rama base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1, intacta.
- Backend: getCortesImageOrganizerOperations devuelve historial paginado y filtrado por owner autenticado; no expone campos de sesión ni credenciales. UI: botón de historial muestra hasta 50 operaciones recientes y permite seleccionar hasta 10 con estado complete para rollback, incluso después de cerrar/reabrir el modal.
- Retención del ledger: máximo 200 registros terminales recientes, expiración de 180 días y máximo 250 registros totales. processing/needs_review nunca se eliminan automáticamente. Si la capacidad está ocupada por estados no terminales, se rechazan nuevas operaciones antes de modificar Drive.
- Pruebas: CortesImageOrganizerLedger 6/6; CortesImageOrganizerUiContract 13/13; CortesImageOrganizerExecutor 9/9; CortesImageOrganizerApplyPlan 14/14. CI 44786209320 SUCCESS: 225 suites, 2,785 pruebas, 0 fallos. Health read-only 44786209315 SUCCESS. Pages 44786207568 estaba en ejecución al registrar.
- Se corrigió el límite exacto de capacidad: al alcanzar 250 registros, el pruning elimina una operación terminal antigua para abrir espacio; si no existe una terminal segura para eliminar, bloquea la nueva operación.
- No se desplegó Apps Script ni se ejecutaron operaciones Drive/Spreadsheet reales. Las pruebas de ledger utilizan un almacén de propiedades simulado; no se alteraron ScriptProperties de un deployment real.
- Siguiente paso local: revisión final de diff y contratos de la ruta completa Safe Apply/rollback, incluyendo UI responsive. Beta pendiente: medir ScriptProperties real, revisar ACL heredadas efectivas y probar movimientos/reversiones en Drive aislado con preview aprobado.


## Checkpoint — nuevos requisitos de concurrencia y carrusel local (2026-11-20)
- HEAD confirmado al registrar los requisitos: dd064b912f823292de2b1a0656e425296899f497 (adenda de Tareas_Activas.md). HEAD base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1; sin modificaciones.
- Requisitos añadidos en Tareas_Activas.md: GP-CONCURRENCY-CUT-MULTI-ENTRY-01 (P0) y GP-UX-RECENT-VIEWED-CACHE-PARALLEL-01 (P1).
- Criterio funcional: idempotencia solo deduplica el mismo intento lógico; vehículos diferentes deben procesarse independientemente; para el mismo vehículo se permiten aportes paralelos y se detectan conflictos a nivel de registro/slot, preservando aportes como candidatos en Imágenes reemplazadas cuando no puedan asociarse por capacidad o disputa. Deben seguir operativos botón +, edición in-modal, HTML/add_cortes.html y Feedback/reporte.
- Auditoría inicial: handleAddOrUpdateCut usa ScriptLock global con tryLock(0), lo que puede devolver ADMIN_BUSY inmediatamente a otra escritura aunque sea de otro vehículo. Drive se ejecuta parcialmente fuera del lock, pero las reservas y escrituras de Sheets aún pasan por la sección crítica global. El slot allocator considera reservas pending y falla si los tres slots están ocupados; no se identificó fallback automático a candidata en Imágenes reemplazadas en esa rama.
- Auditoría carrusel: loadUserLocalActivity inicia por separado la lectura de búsqueda y vistos; renderRecentlyViewedCarousel se ejecuta en el primer render, pero no dibuja nada si viewedItems aún no llegó desde IndexedDB. El test existente RecentlyViewedCarousel.mjs exige que no se use Promise.all; revisar el diseño y actualizar la prueba para demostrar hidratación temprana real sin lecturas duplicadas.
- No se modificó código funcional todavía. Siguiente paso: mapear handlers y payloads ADMIN/WRITE/FEEDBACK para los cuatro puntos de entrada, rastrear el flujo de candidatos/reemplazos para corte/apertura/alimentación y revisar IndexedDB open/read + suscripción de estado. Después diseñar reserva breve/conflicto por recurso, evitando bloquear cargas Drive y llamadas redundantes.
- Normativa NORMAS_DESAROLLO.md consultada completa en esta sesión. Se aplica especialmente sección 15: prioridad de rendimiento, retirar serialización/locks globales prolongados y conservar solo controles mínimos de integridad; la corrección de concurrencia debe ser ligera y no añadir viajes de red ni autenticaciones.
- No se desplegó Apps Script ni se accedió o modificó Drive/Spreadsheet productivos. No se modificó la rama base.

## Requisitos nuevos registrados — concurrencia de aportes y Vistos recientemente (2026-11-20)
- El usuario aclara que la idempotencia no puede bloquear aportes simultáneos de distintos vehículos. Debe deduplicar el mismo intento, pero permitir altas/actualizaciones concurrentes independientes desde modal (+), edición in-modal Desarrollador, HTML/add_cortes.html y FEEDBACK.
- Para el mismo vehículo, los conflictos deben ser localizados y visibles; si el límite de cortes impide incorporar una imagen en disputa, preservarla en Imágenes reemplazadas como candidata, con comportamiento equivalente para apertura y alimentación. No se permiten pérdidas silenciosas ni regresiones en formularios, reportes o reacciones.
- Revisar el render tardío de Vistos recientemente y hacer que consuma caché local en paralelo con los demás carruseles, sin red ni duplicación de lecturas.
- Estos requisitos se agregan al backlog; no se han implementado aún. La tarea activa previa Safe Apply sigue siendo la continuidad inmediata. La política de concurrencia se ajustará a la sección 15 de NORMAS_DESAROLLO.md (baja latencia, sin locks globales/leases/verificaciones transaccionales ordinarias).


## Checkpoint — reserva atómica Safe Apply (2026-11-20)
- HEAD de código/pruebas de esta subactividad: `d33113f333d0c6f847cbf1cdfe54239ecdc4eaa7`. Rama base protegida: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; sin modificaciones.
- En `JS/Services/admin.js`, se añadió `decideCortesOrganizerLedgerReservation_` y `reserveLedger` para reservar atómicamente (bajo un lock corto) las transiciones ausente → processing y complete → rollback_processing. Solo una ejecución por operationId obtiene la reserva.
- Lecturas de ledger individuales sin lock; el lock se usa solo para leer-modificar-escribir las propiedades y expira por contención tras 250 ms. Drive/ACL/carpeta/movimiento permanecen fuera del lock.
- Si la reserva inicial no se obtiene, se devuelve retry sin cambiar el estado ni tocar Drive. Si falla el guardado final después de que Drive ya cambió, se inspecciona el archivo y se reconcilia el estado durable; se evita repetir el movimiento.
- Pruebas focalizadas: ApplyPlan 14/14; Executor 17/17; UI contract 13/13; Ledger 6/6. Health read-only 44791334834 SUCCESS.
- Regresión integral 44791334640 FAILURE por dos contratos de los flujos de aportes (no del organizador): AdminVehicleIdOutsideLock espera tryLock(0), pero el handler actual usa waitLock(2000); AdminSupplementaryUploadOutsideLock exige que no exista espera, pero el handler actual usa waitLock(2000). Estos hallazgos coinciden con la nueva tarea registrada sobre concurrencia entre vehículos; no se modificaron esos flujos en esta subactividad ni se ocultaron las fallas actualizando las pruebas.
- No se ejecutó Drive real, no se desplegó Apps Script y no se modificó Spreadsheet. Pendiente: continuar con la auditoría/implementación de concurrencia por vehículo y luego Vistos recientemente; validar visualmente los controles Safe Apply y verificar ACL/cuotas en Beta aislado.


## Continuidad — auditoría de concurrencia por vehículo (2026-11-20)
- HEAD verificado al iniciar esta subactividad: `0192528f52de781e070592fd63289a2d0ae82db3`. Rama base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, intacta.
- Se completó el mapeo inicial de los puntos de entrada: ADMIN `handleAddOrUpdateCut` mantiene `ScriptLock.waitLock(2000)` para reserva/escritura; WRITE `handleAddOrUpdateCut` usa `waitLock(2000)` y la asignación central de IDs también espera el lock; WRITE `handleAddSupplementaryInfo` usa `waitLock(5000)`; ADMIN `handleAddSupplementaryInfo` carga Drive antes de la sección crítica, pero todavía espera `waitLock(2000)`. FEEDBACK `handleSuggestCutChange` y `handleReportProblem` suben adjuntos antes de adquirir el lock y usan `tryLock(0)`.
- La idempotencia de cortes se basa en `opId + operationHash` y el ledger compartido `Idempotencia`; la huella de ADMIN/WRITE cubre el payload de corte. La asignación de slot consulta reservas pending, pero dos solicitudes que leen el mismo snapshot aún pueden competir por el mismo slot. El camino de ADMIN para vehículo existente falla con «No hay espacios disponibles» cuando los tres slots aparecen ocupados; no se identificó fallback de candidato en ese flujo.
- Se confirmó el estado CI del HEAD: regresión `44791562824` FAILURE; Pages `44791561146` SUCCESS; Health read-only `44791562900` SUCCESS. Los contratos ya identificados como fallidos son `AdminVehicleIdOutsideLock` y `AdminSupplementaryUploadOutsideLock`; sus expectativas no se satisfacen con los `waitLock` actuales. No se cambió el código ni se alteraron las pruebas para ocultar la falla.
- Criterio de diseño para continuar: no sustituir mecánicamente `waitLock` por `tryLock(0)`, porque eso convertiría contención breve en rechazo de aportes legítimos de vehículos distintos. La siguiente subactividad debe implementar y probar reserva/confirmación de slots y escrituras localizadas sin serialización global prolongada, con conservación de archivos en conflicto/capacidad llena. Mantener compatibles los flujos modal (+), edición in-modal, `HTML/add_cortes.html`, información suplementaria y FEEDBACK/reporte.
- No se desplegó Apps Script ni se modificaron Drive/Spreadsheet. No se realizaron cambios en la rama base.


## Continuidad de implementación — aislamiento de escrituras por usuario (2026-11-20)
- HEAD de código/pruebas antes de esta adenda: `86191cab4beb89f048ff4f154d94a66441d44f06` (rama `GPSpedia2.2.5_work`). La rama base protegida `GPSpedia2.2.5` no se modificó.
- Cambios funcionales en `JS/Services/admin.js`: adquisición inmediata de lock para aporte ADMIN y para información suplementaria; la reanudación del trabajo Drive de aportes usa ventana cero para no esperar por ScriptLock.
- Cambios funcionales en `JS/Services/write.js`: asignación global de IDs usa `tryLock(0)`; se añadió `getWriteContributionLock_(vehicleId)`: vehículos existentes usan `LockService.getUserLock()` si está disponible, mientras que altas nuevas conservan `getScriptLock()` por la secuencia numérica global. Cortes y datos suplementarios utilizan el selector; el trabajo Drive continúa fuera del lock y la autenticación/validación sigue en preflight.
- Contratos de prueba actualizados para el comportamiento no bloqueante y para el selector de lock: `MutationLockContention.mjs`, `WriteAuthorizationMinimization.js`, `WriteAuthorizationContracts.js`, `WriteIdAllocatorNonBlocking.mjs` y `WriteCutPreflightOutsideLock.mjs`.
- CI previo: Health read-only SUCCESS. Regresión en el commit `cf325705...` falló por un harness que no inyectaba el nuevo selector; se corrigió el harness en `86191cab...`. El resultado de CI para ese último HEAD aún debe verificarse.
- Límite importante: el aislamiento por UserLock evita que escrituras de vehículos existentes de usuarios distintos compartan el mismo lock, pero todavía NO resuelve el conflicto de negocio cuando dos usuarios modifican simultáneamente el mismo vehículo/slot. Tampoco se ha implementado el fallback de imagen como candidata en «Imágenes reemplazadas» cuando se llenan los tres slots. No declarar P0 completada.
- Pendiente inmediato: comprobar CI de `86191cab...`; corregir cualquier regresión sin debilitar las pruebas; implementar conflicto localizado para el mismo vehículo/slot y preservación de archivos candidatos para corte/apertura/alimentación; ampliar pruebas de dos usuarios/dos vehículos, dos usuarios/mismo vehículo, slot distinto/igual, capacidad llena y reintentos idempotentes. Después revisar FEEDBACK y los demás puntos de entrada. P1 Vistos recientemente sigue pendiente.
- No se desplegó Apps Script ni se modificaron Drive/Spreadsheet productivos.


## Checkpoint — carrusel Vistos recientemente y auditoría de concurrencia (2026-11-20)
- Rama de trabajo: `GPSpedia2.2.5_work`; HEAD verificado al registrar: `b47a4e5b975bf2fba4d81f96ba87494db95acb7a`. Rama base protegida `GPSpedia2.2.5` no modificada.
- En `JS/Frontend/auth.js`, `handleLoginSuccess` inicia `loadUserLocalActivity(user)` antes de `showApp(user)`. El historial de vistos se lee desde IndexedDB/cache local en paralelo con el arranque del catálogo; no se agregaron llamadas remotas.
- En `JS/Frontend/ui.js`, `openAddAperturaModal` y `openAddFeedModal` generan un opId por instancia de modal y lo transmiten al backend. En `HTML/add_cortes.html`, stage 3 reutiliza `state.opId`.
- Pruebas: RecentlyViewedCarousel 1/1 PASS; SupplementaryImageOperationIdContract 8/8 PASS. Regresión CI 44793849152 SUCCESS: 227 suites, 2,802 pruebas, 0 fallos. Health 44793849459 SUCCESS. Pages 44793848811 pendiente al último chequeo.
- Concurrencia: las claves de imagen son por opId/vehicleId/field y las reservas de cortes pendientes se filtran por vehículo. La idempotencia no bloquea globalmente vehículos distintos. Sin embargo, UserLock es por usuario, no por vehículo; dos usuarios pueden competir sobre el mismo modelo porque la reserva del ledger debe protegerse de forma compartida.
- Pendiente: cuando los tres slots de corte están ocupados, WRITE lanza conflicto sin guardar imagen candidata; apertura y alimentación hacen lo mismo cuando no hay espacio. La hoja «Imagenes_Reemplazadas» acepta registros con origen propio, pero todavía falta el flujo explícito de candidato, la UI de revisión y la protección backend para conservarlos. FEEDBACK requiere una vía controlada para registrar un corte/vehículo a partir de un reporte.
- Safe Apply: subactividad de reserva atómica sigue con pruebas focalizadas PASS (ApplyPlan 14/14, Executor 17/17, UI 13/13, Ledger 6/6); Drive real y Beta/ACL siguen pendientes.
- No se ejecutaron operaciones reales en Drive/Spreadsheet ni se desplegó Apps Script.


## 2026-11-20 — Continuidad P0: auditoría real de concurrencia WRITE

- HEAD verificado de la rama de trabajo: `0448f80f0d515be3517dffdb7f25b070591fba8e`. Rama base `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no modificada.
- GitHub Actions `44794586367` — GPSpedia service regression tests: **SUCCESS**. Job `service-tests` completado; sintaxis y runner integral aprobados: **227 suites, 2,802 pruebas, 0 fallos**.
- Se confirmó que ADMIN ya no procesa `addOrUpdateCut`, `addSupplementaryInfo` ni `checkOperation`: devuelve `ACTION_MOVED_TO_WRITE`. Los handlers efectivos de aportes están en `JS/Services/write.js`; no duplicar correcciones en ADMIN legacy.
- Hallazgo crítico confirmado en WRITE: `getWriteContributionLock_(vehicleId)` devuelve `LockService.getUserLock()` para vehículos existentes. Ese lock separa usuarios, pero **no coordina a dos usuarios distintos sobre el mismo vehículo**. Dos operaciones distintas pueden leer la misma fila y elegir el mismo slot antes de escribir.
- Cortes: `findNextAvailableCutSlot_` consulta slots vacíos y reservas `pending`, pero la selección y `recordOpId(..., "pending")` no constituyen una reserva atómica entre usuarios. La escritura del slot ocurre después. Si los tres slots están ocupados, el handler lanza error; no se encontró conservación automática de la imagen como candidata en «Imágenes reemplazadas».
- Apertura/alimentación: `buildSupplementaryInfoPlan_` detecta espacios ocupados, pero el plan de imagen y la carga a Drive se preparan antes del lock de usuario. Después, `handleAddSupplementaryInfoLocked` vuelve a calcular el plan. En colisión, el archivo previamente subido no se incorpora como candidato. Además, `persistSupplementaryInfoValues_` escribe y, ante error, revierte el rango completo de 10 columnas (33–42); dos usuarios pueden sobrescribir aportes ajenos en ese rango, incluido el timestamp compartido.
- Se confirma que el requisito §15 de `NORMAS_DESAROLLO.md` prohíbe locks globales, esperas y serialización de acciones independientes. No se debe «resolver» la carrera reintroduciendo un ScriptLock global ordinario ni mantener cargas Drive dentro de una sección crítica.
- Estado: **GP-CONCURRENCY-CUT-MULTI-ENTRY-01 sigue EN PROGRESO / P0**. La regresión actual pasa, pero no prueba concurrencia real entre identidades de usuario ni colisiones del mismo vehículo. No marcar completada.
- Siguiente subpaso: diseñar y probar una reserva append-only de aportes/slots que conserve cada `opId` y el contenido entrante antes de intentar materializarlo en las columnas actuales; resolver idempotencia del mismo `opId`, asignación determinista de slots y candidatos para corte/apertura/alimentación. Añadir pruebas de intercalado entre usuarios, colisión y recuperación parcial antes de tocar la persistencia productiva.
- No se desplegó Apps Script ni se accedió/modificó Spreadsheet o Drive productivos.


- Actualización de continuidad documental: `Tareas_Activas.md` quedó actualizado en el commit `92c2b466c3898f83a3f4a6d716021bb3581ce0f9`; el checkpoint previo se actualizó en `62cef5f63e8390c5d23b87afafaeb2b648874fc2`. HEAD confirmado después de ambos commits: `92c2b466c3898f83a3f4a6d716021bb3581ce0f9`. La rama base continúa en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


## 2026-11-20 — Diseño de la siguiente implementación P0

- Se añadió `CONCURRENCIA_APORTES_DISENO.md` en el commit `32db0be9996a20cf8b86f81ecf789fd9d9baed24`. Define un registro append-only de eventos de aportes, proyección de catálogo, deduplicación lógica por `opId`, candidatos por capacidad llena, eventos de sustitución para edición in-modal y matriz de pruebas. Es una decisión de diseño pendiente de implementación y validación, no un cierre de P0.
- Se corrigió una interpretación durante la inspección: Coordinator declara `CORTES` como recurso de escritura para las acciones WRITE, pero los handlers actuales `addOrUpdateCut` y `addSupplementaryInfo` no adquieren una lease global para toda la operación. La única lease WRITE localizada en este flujo es `ensureSupplementaryVehicleFolder`, para la carpeta Drive. La carrera de slots proviene de la reserva/lectura en WRITE, no de una lease global efectivamente tomada por esos handlers.
- Dirección propuesta: mantener las filas heredadas de `Cortes` como base; guardar nuevos aportes en un ledger append-only versionado; calcular los slots visibles de forma determinista desde catálogo; conservar el excedente como candidato. No usar `UserLock` como lock por vehículo ni reintroducir un ScriptLock global.
- Próximo paso técnico: verificar límites y garantías de append concurrente en Google Sheets con un harness aislado; diseñar manejo de duplicados físicos por el mismo `opId` y huellas conflictivas; implementar primero el proyector puro y sus pruebas antes de tocar handlers productivos.
- HEAD verificado antes de esta actualización: `6b0bb3717119fb576ee94c071ea8f3892d8fdce5`; rama base sin cambios: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


- Hallazgo adicional confirmado en UI/WRITE: apertura y alimentación generan/envían `opId`, pero el backend no calcula huella ni registra el resultado en un ledger idempotente. Un timeout tras guardar no permite recuperar el éxito original; el reintento puede recibir conflicto aunque el primer intento sí se haya aplicado. La clave de carga Drive solo protege el archivo, no la escritura de catálogo. Documentado en `CONCURRENCIA_APORTES_DISENO.md`, commit `34b17b80e8a3660d659231ff88fa67d70e810cf6`.
- El nuevo ledger append-only debe cubrir en un solo contrato cortes, apertura y alimentación; conservar `opId`/hash en el cliente; recuperar éxito para mismo ID/hash; rechazar ID/hash diferente.
- HEAD tras actualizaciones de diseño/tareas: `28cb5bd69581849b7a1bdded9d9a39d09a6f2bad` (checkpoint aún pendiente de este último commit).


- Inspección adicional de UI/ADMIN/CATALOG: la ficha consume el contrato fijo de tres cortes, apertura y tres alimentaciones; `completeVehicleExpansionSave_` fuerza una lectura de catálogo después del aporte. ADMIN edita texto/modelo mediante `updateVehicleField` (valor esperado) e imágenes mediante `uploadAdminImage` (ledger compensatorio). La futura proyección debe devolver los campos actuales y metadatos de origen por campo; editar un valor proyectado exige evento de sustitución/versionado para no duplicarlo ni resucitar el evento anterior.
- Documentado en `CONCURRENCIA_APORTES_DISENO.md`, commit `20b78390c9a056299319e0a29866d2ec12abd143`. P0 sigue abierta.
- HEAD tras actualizaciones: `b83d99dcb8647afd2350415962741dfb50d33d2a`; el checkpoint se actualizará en el commit siguiente.


## 2026-11-20 — Corrección de alcance del Coordinator y persistencia suplementaria

- Se corrigió el diagnóstico previo sobre la política WRITE del Coordinator: aunque `coordinatorPolicy_("WRITE", ...)` declara recursos globales CORTES/DRIVE/IDEMPOTENCIA, el `doPost` efectivo de `JS/Services/write.js` no llama `withSharedMutationLease_` para `addOrUpdateCut` ni `addSupplementaryInfo`. Por tanto, no hay una lease Coordinator de CORTES que actualmente serialice esos aportes WRITE. El router ADMIN traslada las acciones al servicio WRITE; no se deben atribuir a la ruta efectiva las políticas declaradas pero no invocadas.
- La sección §15 de `NORMAS_DESAROLLO.md` prohíbe expresamente añadir leases, revalidaciones, locks globales, esperas o serialización ordinaria, y exige no mantener una operación bloqueada durante cargas. No introducir una lease por vehículo como sustituto: el diseño debe cumplir §15 y preservar operaciones independientes.
- Commit `0336f6c1ffce62b92ae0f3ce00f0610f56fc8f5e`: `persistSupplementaryInfoValues_` en WRITE cambió de escribir/revertir diez columnas a escribir y verificar solo las celdas que cambiaron. Ya no restaura una instantánea obsoleta que pudiera borrar aportes simultáneos en campos distintos. El fallo parcial se informa sin rollback destructivo.
- Commit `3e10e9bbd742e3bc5a815f113f464b799f5034e4`: pruebas de persistencia suplementaria actualizadas para WRITE; incluyen dos operaciones intercaladas en columnas distintas y comprueban que ambos aportes sobreviven, además de fallo parcial sin rollback. ADMIN conserva sus pruebas legacy porque esas acciones están trasladadas a WRITE.
- La ejecución CI del commit `0336f6c` falló en pruebas antiguas que aún exigían rollback global; ese fallo motivó la actualización del contrato de pruebas. El run del commit `3e10e9b` está pendiente de confirmación en Actions.
- Pendiente crítico: resolver colisión en el mismo campo/slot y la idempotencia real de `addSupplementaryInfo` con `opId`; el cambio actual solo elimina sobrescrituras entre campos distintos. Cortes siguen expuestos a carrera de selección de slot y ledger de opId no es una reserva atómica. No marcar P0 completa.


- Actualización posterior: WRITE suplementario dejó de adquirir `UserLock`; la carga de imágenes y la persistencia no retienen locks ordinarios. Se actualizaron contratos de `AddSupplementaryInfoIntegrity.js`, `MutationLockContention.mjs`, `WriteAuthorizationMinimization.js` y `WriteAuthorizationContracts.js` para reflejar §15. Commit de código inicial `9d95dc4`; ajustes de pruebas `48629ec`, `11a88ce`, `f1a286b` y `2132a2d`; HEAD verificado `65abc19939d2f55b00edc8b9fb4735f62f6a65ab`.
- CI para HEAD `65abc199`: `GPSpedia service regression tests` **SUCCESS** (228 suites, 2,817 pruebas, 0 fallos); `deployed service health (read-only)` **SUCCESS**. El workflow Pages quedó pendiente/cancelado en la cola, sin afectar regresión ni health.
- Límite explícito de este cambio: evita pisar campos suplementarios distintos y elimina el bloqueo por usuario, pero NO resuelve colisiones sobre el mismo slot/campo ni crea todavía un registro candidato para las imágenes subidas que no se materialicen. Tampoco añade idempotencia de negocio para el mismo `opId`; el opId actual protege la clave de carga Drive, no toda la mutación suplementaria.


- HEAD documental actual confirmado: `814f93154ef797d1caceb6483eab406ca6ab7f1b`. Los últimos cambios posteriores a la regresión aprobada `65abc199` son únicamente actualizaciones de `checkpoint.md` y `Tareas_Activas.md`; el código probado no cambió después de ese SHA.
- Revisión de UI: `JS/Frontend/ui.js` contiene `openAddCutForModelModal`, `openAddAperturaModal` y `openAddFeedModal`; los dos últimos generan `opId` antes del submit y envían `addSupplementaryInfo` con `vehicleId`. El formulario de corte también trabaja desde el modal de modelo ya registrado. La edición del Desarrollador utiliza `updateVehicleField` y `uploadAdminImage` en el flujo de edición.
- Esta revisión confirma que las entradas UI requeridas existen; no demuestra todavía que los conflictos simultáneos de mismo campo/slot ni la idempotencia de texto suplementario estén resueltos.


## 2026-11-20 — Integración de cortes existentes al ledger append-only

- Se verificó que el catálogo ya proyecta los eventos `cut`, `opening`, `feed` y `vehicle` desde `AportesVehiculo`, conservando el contrato heredado de tres slots de corte, apertura y alimentaciones. Los eventos aceptados que no caben se exponen como `contributionCandidates`; no se descartan.
- WRITE ya tenía un handler `handleAppendExistingVehicleCut_` y una rama previa al lock para cortes de vehículo existente con `opId`, sin VIN ni `vehicleData`. Se mantuvo esa ruta y se reforzó el contrato de idempotencia: un reintento con mismo `opId` debe coincidir también en el JSON del payload, no solo en vehículo/tipo/hash; las respuestas de evento incluyen `createdAt` para recuperación.
- El modal `openAddCutForModelModal` enviaba `opId` pero no `operationHash`; la validación WRITE ahora deriva una huella SHA-256 del payload normalizado cuando falta. Si el cliente sí envía huella, se sigue validando y comparando; no se acepta una huella mal formada.
- La ruta append-only calcula el slot proyectado a partir de la fila base y el orden del ledger; si los tres slots están ocupados devuelve `candidateReviewPending` y el evento permanece en el ledger para que CATALOG lo muestre como candidato. El resultado incluye `slotIndex` y `timestamp` para el flujo UI.
- Se corrigió la expresión regular de validación de `vehicleId` en el ledger de aportes (barra invertida duplicada). Se añadieron pruebas de IDs válidos e inválidos.
- Se retiró la lease Coordinator `ensureSupplementaryVehicleFolder` de la preparación de carpetas suplementarias y se sustituyó su prueba por un contrato que confirma que no hay lease/espera para esta acción. La política declarada se eliminó porque el handler ya no la invoca y §15 no permite leases ordinarias.
- Commits de esta secuencia: `1d395c2` (validación ID), `5fea3d4` (carpeta sin lease), `133cdca` (política Coordinator), `d94246c` (pruebas ID), `3ca31b0`/`372d551`/`5e86cf0` (prueba y runner no-lease), `1655b19`/`0869845`/`9dd8bb1`/`e15b9f5`/`dcdfe44` (contratos de pruebas), `59c642e` (regresión), `6877256` (hash servidor), `2783379` (payload exacto en idempotencia y timestamp).
- CI del HEAD `2783379c114fdb6ef658ea4e4d7c1cbeb890ab28`: `GPSpedia service regression tests` SUCCESS, **228 suites / 2,830 pruebas / 0 fallos**; `deployed service health (read-only)` SUCCESS. No se desplegó el código de servicio ni se modificó Spreadsheet/Drive productivos.
- Límite pendiente: esta ruta append-only solo cubre corte existente cuando hay `opId`, no hay VIN y `vehicleData` es nulo. Casos legacy con VIN, altas nuevas y solicitudes sin opId conservan el handler anterior y sus locks. El upload/reconciliación de imágenes todavía utiliza el lock breve de `ImageUploadLedger`; debe revisarse frente a §15 sin perder idempotencia. El append concurrente físico y conflictos del mismo `opId` requieren harness de intercalado adicional; las pruebas actuales de ledger/proyección no equivalen a una prueba real concurrente de Sheets.
- HEAD de trabajo verificado: `2783379c114fdb6ef658ea4e4d7c1cbeb890ab28`. Rama base `GPSpedia2.2.5` intacta en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Próximo paso: ampliar el contrato append-only a casos existentes con VIN sin romper la unicidad del VIN; añadir harness de append concurrente (vehículos distintos, mismo vehículo/slots distintos, mismo opId igual/distinto payload); y resolver ImageUploadLedger sin locks globales/esperas. P0 sigue EN PROGRESO.
