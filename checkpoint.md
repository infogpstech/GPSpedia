# Checkpoint activo — GPSpedia

Fecha: 2026-11-19

## Repositorio y ramas
- Repositorio: infogpstech/GPSpedia
- Rama autorizada: GPSpedia2.2.5_work
- HEAD: 3cb7fb0e277daaf4d2aa263d7cfe4a08ba19a734
- Rama base protegida GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificar)
- El historial completo previo está preservado en Checkpoint_Archive/checkpoint_2026-11-19_parte_003.md; ver Checkpoint_Archive/manifest.md.

## Normativa y arquitectura
- NORMAS_DESAROLLO.md es la única fuente normativa vigente.
- README.md describe la PWA, frontend, microservicios Apps Script y persistencia Sheets/Drive.
- contexto_personal.md confirma ramas y restricciones de publicación.
- No inferir deployments Apps Script ni permisos externos desde el código versionado.

## Última tarea completada
WRITE — búsqueda heredada de opId sin descarga completa de Cortes:
- Se reemplazó el recorrido de `getDataRange().getValues()` por `TextFinder` server-side; solo se leen los encabezados y las celdas coincidentes.
- Se conservan coincidencias directas en columnas `idOperacion`/`id_operacion`, VIN legacy OP, etiquetas `[opId]`, detección de duplicados y validación final de `vehicleId`/fila.
- La ruta normal de Idempotencia sigue teniendo prioridad y evita TextFinder cuando ya existe una entrada.
- Prueba `WriteOpIdLegacyLookup` 9/9 PASS.
- CI 44617280202 SUCCESS: 171 suites, 2,358 pruebas aprobadas, 0 fallos; sintaxis JS aprobada.
- Health read-only 44617280343 SUCCESS; GitHub Pages 44617279984 SUCCESS.
- Commits: da2554903bb559cf06ee7e1abd2504333af248af (TextFinder y prueba), 833de2d87faab2203ebc2fe213a4f9f2afb1ac74 (comentario aclaratorio).
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó WRITE ni se modificaron datos productivos.

## Siguiente trabajo
Continuar GP-PERF-WRITE-CUT-LOCK-04. Auditar `readIdempotenciaEntries_` y su uso repetido dentro de `handleAddOrUpdateCutLocked`: determinar si puede evitarse descargar el ledger completo en cada intento y reutilizar una lectura bajo el mismo lock sin debilitar detección de opId duplicado, asociaciones vehículo/slot, operationHash ni compatibilidad histórica A:E. Medir primero los usos y contratos; no cambiar la política de idempotencia ni introducir leases/locks adicionales. Después revisar los flushes restantes. No desplegar Apps Script ni tocar datos productivos sin autorización.

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
