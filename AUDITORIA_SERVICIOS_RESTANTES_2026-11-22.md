# Auditoría de servicios restantes — AUTH, USERS, UTILITIES y CATALOG
Fecha: 2026-11-22
Rama: `GPSpedia2.2.5_work`
HEAD de partida: `ead47bb4a62448034073929e3f2e2d5ed1b4baf1`

## AUTH

- Login reutiliza un snapshot de Users y ActiveSessions; la creación/recuperación de sesión agrega la fila al snapshot y relee únicamente en la recuperación de append ambiguo.
- Recuperación de contraseña y eliminación reutilizan la fila/columna necesaria; la revocación de sesiones comparte los tokens obtenidos en el mismo snapshot.
- El helper de escaneo duplicado de sesiones ya no existe; los caminos de revocación invalidan cachés remotas una sola vez antes de limpiar tokens locales.
- Los locks que permanecen protegen login, intentos fallidos, revocación, eliminación y cambios de credenciales; no se detectó una lectura duplicada segura de retirar en esta pasada.
- Contrato `AuthSessionReadOptimization.mjs` está integrado en `RunServiceTests.mjs`.

## USERS

- `handleCreateUser` reutiliza un único snapshot para username, fila libre e ID; la exclusión createUser↔deleteUser permanece como excepción documentada.
- `handleGetUsers` lee únicamente las columnas visibles A:G, no `getDataRange()`.
- `findUniqueRowsByExactValue_` busca por la columna ID y confirma solo la celda coincidente; `updateProfile` no vuelve a leer la fila completa.
- `UsersReadMinimization.mjs` está integrado en `RunServiceTests.mjs`; no se encontró una lectura adicional de alta confianza para eliminar.

## UTILITIES

- El servicio expone una única migración de mantenimiento `migrateTimestamps`, restringida a Desarrollador mediante actor confiable.
- Lee una vez la columna de URLs fuente y una vez el snapshot de destino; calcula fechas de Drive, prepara staging, verifica la copia de respaldo, promueve y verifica el destino, con rollback ante fallo.
- La lease compartida y ScriptLock cubren una migración destructiva con hojas staging/backup y recuperación de estado interrumpido. Retirarlos o moverlos sin un protocolo de snapshot/commit puede permitir dos reemplazos simultáneos o romper rollback.
- `UtilitiesSecurity.js` está integrado en `RunServiceTests.mjs`; prueba RBAC, sesión, lease, lock, staging, backup, promoción, rollback y concurrencia.
- No se detectó una lectura duplicada de alta confianza. El tiempo de Drive por fila y la duración del lock son candidatos a medición en Beta, no evidencia suficiente para refactorizar una migración excepcional.

## CATALOG y dependencias compartidas

- `handleGetCatalogData` resuelve Spreadsheet una vez y reutiliza el handle para hojas/ledgers.
- El feed incremental usa un snapshot de ScriptProperties por publicación/lectura; evita consultar cada evento con `getProperty` repetido.
- La publicación CATALOG conserva sourceVersion, requestId idempotente, reset ante huecos/corrupción y recuperación de lotes parciales.
- WRITE/FEEDBACK/ADMIN publican una vez por operación/lote después de confirmar la mutación; el cliente conserva snapshot completo para inicio/reset/recuperación y usa deltas en navegación normal.
- Contratos `CatalogSpreadsheetHandleReuse`, `CatalogChangeFeed` y aislamiento de publicación están integrados en la regresión.

## Resultado

**Auditoría estática completada; no se implementan cambios.** Las lecturas repetidas de alta confianza ya identificadas fueron optimizadas en los commits previos y los contratos están integrados. Las operaciones de mantenimiento con lock/lease permanecen porque protegen reemplazo de hojas, revocación de sesiones, unicidad de cuentas o recuperación; cualquier reducción requiere medición y prueba de concurrencia, no solo eliminar llamadas.

## Pendiente de Beta

- Medir tiempos reales de login, creación de usuario, migración Utilities, proyección CATALOG y publicaciones con red normal/lenta.
- Confirmar en entornos aislados el comportamiento real de fórmulas, TextFinder, Drive y concurrencia entre ejecuciones/proyectos.
- No desplegar Apps Script ni modificar datos productivos desde esta auditoría.
