# Checkpoint activo — GPSpedia

Fecha: 2026-11-19

## Repositorio y ramas
- Repositorio: infogpstech/GPSpedia
- Rama autorizada: GPSpedia2.2.5_work
- HEAD: cab6da36207b2768b77de7cc52ea5c6554424c58
- Rama base protegida GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificar)
- El historial completo previo está preservado en Checkpoint_Archive/checkpoint_2026-11-19_parte_003.md; ver Checkpoint_Archive/manifest.md.

## Normativa y arquitectura
- NORMAS_DESAROLLO.md es la única fuente normativa vigente.
- README.md describe la PWA, frontend, microservicios Apps Script y persistencia Sheets/Drive.
- contexto_personal.md confirma ramas y restricciones de publicación.
- No inferir deployments Apps Script ni permisos externos desde el código versionado.

## Última tarea completada
GP-PERF-ADMIN-CUT-LOCK-01 — aislamiento de compensación del reemplazo de imágenes ADMIN:
- La recuperación linked y la compensación del catch ejecutan I/O Drive fuera del ScriptLock.
- Antes de compensar se reserva el opId en requires_review; al readquirir se revalidan vehículo, campo, URL, huella y estado del ledger.
- Se conserva el orden de compensación del historial antes del ledger.
- El fallback Drive tras fallo de escritura del ledger también se ejecuta fuera del lock.
- AdminImageUploadCompensationIsolation: 10/10 PASS.
- CI 44592625381 SUCCESS: 164 suites, 2,304 pruebas aprobadas, 0 fallos; sintaxis JS aprobada.
- Health read-only 44592625568 SUCCESS; GitHub Pages 44592624258 SUCCESS.
- Commits: 237692ff0548d2a0735c33f05c3f3f66c87ad5a9, 71a9ae642ebf7c918befbcbceb5ddde9797f8acc, cab6da36207b2768b77de7cc52ea5c6554424c58.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron datos productivos.

## Siguiente trabajo
Continuar GP-PERF-ADMIN-CUT-LOCK-01. Prioridad restante: pruebas de no interferencia entre Inbox, health, login, auditoría y registro de cortes; documentar límites reales de proyectos/deployments Apps Script; revisar la sección crítica restante de handleAddOrUpdateCut. Consultar Tareas_Activas.md para dependencias y orden. No iniciar funcionalidades nuevas mientras permanezca abierto este backlog.

## Restricciones
- Trabajar únicamente en GPSpedia2.2.5_work.
- No modificar ni fusionar GPSpedia2.2.5.
- No desplegar Apps Script ni modificar Sheets/Drive productivos sin autorización expresa.
- Las validaciones reales de Drive/Spreadsheet, concurrencia y deployments quedan para Beta autorizada.


2026-11-19 — Siguiente subpaso P0: separar la sincronización markImageUploadLinked (Drive + ImageUploadLedger) del ScriptLock en handleAddOrUpdateCut; regresión añadida, CI pendiente. CI inicial detectó únicamente un mock incompleto de Spreadsheet en la prueba nueva; se ajusta getSheetByName sin cambiar la implementación. El segundo fixture de conflicto también necesitaba el mismo mock getSheetByName; se completa antes de repetir CI.

2026-11-19 — Cierre post-commit de vinculación de imágenes ADMIN: HEAD 8a3d70d404098cf8763379223dfb2d65c823b85c; CI 44593963972 intento 2 SUCCESS (165 suites, 2,316 pruebas, 0 fallos; test nuevo 12/12); health 44593963988 y Pages 44594081770 SUCCESS. Siguiente: reducir/revisar sección crítica de Sheets y pruebas de no interferencia entre funciones.