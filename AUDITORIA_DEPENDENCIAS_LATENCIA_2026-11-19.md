# Auditoría técnica de dependencias y latencia — 2026-11-19

Repositorio: `infogpstech/GPSpedia`  
Rama auditada: `GPSpedia2.2.5_work`  
HEAD auditado: `7c4c576c0463f9bc8891b1720d6d5c058114cd6d`  
Rama base protegida: `GPSpedia2.2.5` — `d9acc68d889985c2e2f42fe3a02e502efc86ead1`

## 1. Alcance y método

Inspección estática de Coordinator, AUTH, USERS, WRITE, FEEDBACK, UTILITIES, ADMIN, CATALOG, InboxConversations y SharedMutationClient; de `handleAddOrUpdateCut`; y de la matriz de impacto de despliegue en `Services/SERVICE_ARCHITECTURE_PLAN.md` y `Services/COORDINATOR_SETUP.md`. Se contrastó Git con checkpoint y backlog.

No se ejecutaron servicios, deployments, llamadas remotas, consultas a ScriptProperties/secretos ni operaciones en Drive/Spreadsheet. Los hallazgos son inspección de código, no mediciones de latencia en producción.

## 2. Auditoría del último commit y checkpoint

- HEAD real: `7c4c576c0463f9bc8891b1720d6d5c058114cd6d`; padre: `cc7cd93e670d4d7dfd4b46ead8eb60bc830101e0`.
- El commit `7c4c576` solo añadió 26 líneas documentales a `ChangesLogs.txt`, `Tareas_Activas.md` y `checkpoint.md`; no cambió código.
- El checkpoint estaba actualizado hasta `cc7cd93`; el desfase era ese commit documental.
- `GP-PERF-ADMIN-SUPPLEMENTARY-UPLOAD-LOCK-01` está cerrada: CI 44549910139, 153 suites, 2,225 pruebas, 0 fallos. No repetir.

## 3. Hallazgo P0 — ADMIN retiene el lock global durante llamadas externas

Ubicación: `JS/Services/admin.js`, `handleAddOrUpdateCut` (línea 6609).

Evidencia:
- Adquiere `LockService.getScriptLock()` con `waitLock(30000)` y lo libera únicamente en el `finally` final.
- El flujo de vehículo nuevo invoca `requestNextVehicleIdFromWriteService(payload)`, que ejecuta `UrlFetchApp.fetch` hacia WRITE, mientras conserva el lock.
- Los flujos de vehículo nuevo y existente resuelven carpetas y ejecutan `uploadImageToDrive` antes de liberar el lock.
- La recuperación por `opId` también puede reparar imágenes mediante Drive bajo el mismo lock.
- Dentro de la misma sección crítica realiza lecturas/búsquedas de Spreadsheet, preparación de VIN, reserva/finalización de idempotencia, escrituras y flush.

Impacto:
- La duración del lock depende de WRITE y Drive, no solo de la sección crítica de Spreadsheet.
- Una carga lenta puede hacer esperar hasta 30 segundos a operaciones ADMIN independientes que comparten el ScriptLock del proyecto.
- La función mezcla reserva, transporte, escritura y recuperación; separar fases sin reservar el slot permitiría que dos solicitudes ocupen el mismo destino.

Criterio de corrección:
- Reservar atómicamente operación, ID/vehículo y slot antes de liberar el lock.
- Ejecutar WRITE y transferencias/consultas Drive fuera del lock.
- Re-adquirir el lock sin espera prolongada para revalidar reserva, fila y slot antes de persistir.
- Mantener opId + operationHash, ledger de cargas, recuperación de operaciones pendientes, verificación de escritura y compensación/estado de revisión.
- Añadir pruebas deterministas de concurrencia, pérdida de respuesta antes/después del commit, reintentos, conflictos de slot y fallos WRITE/Drive.

Severidad: alta. Estado: CONFIRMADO; implementación pendiente.

## 4. Respuestas de arquitectura

### 4.1 Servicios que esperan respuestas externas cuando podrían resolver localmente

- ADMIN: `handleAddOrUpdateCut` llama a WRITE para obtener el ID centralizado y a Drive para carpetas/subidas mientras sostiene su lock global. La asignación centralizada no debe duplicarse localmente; la espera de red sí debe salir de la sección crítica.
- ADMIN: el router ordinario usa actor cacheado; no se encontró consulta a Coordinator por cada acción ordinaria.
- AUTH/USERS/WRITE/FEEDBACK: los dispatchers inspeccionados usan `getCachedSharedSessionActor_`; Coordinator participa al poblar/validar contexto cacheado o en operaciones de ciclo de vida, no debe reintroducirse en cada clic.
- USERS: `createUser` y `updateProfile` mantienen coordinación por conflictos con eliminación, restablecimiento de sesiones y cambios de cuenta en AUTH. No retirar esa garantía sin trasladar la propiedad de escritura.
- UTILITIES: `migrateTimestamps` es mantenimiento manual con staging/backup/rollback, no dependencia ordinaria de interfaz.
- WRITE y FEEDBACK conservan locks locales de escritura. Esta auditoría no demuestra que todos sean innecesarios; revisar I/O externo bajo lock por operación antes de refactorizar.

### 4.2 Consultas repetidas a Coordinator, AUTH u otros servicios

- No se encontró evidencia de que ADMIN consulte Coordinator para autorizar cada acción ordinaria; usa actor cacheado y conserva RBAC/auditoría.
- Coordinator centraliza invalidación remota cuando AUTH revoca sesiones/cuentas; es una garantía funcional, no una consulta redundante.
- ADMIN solicita a WRITE el ID central solo al registrar un vehículo nuevo. La llamada es necesaria por autoridad de asignación, pero está dentro del lock global.
- La telemetría global se solicita desde el panel ADMIN y Coordinator agrega fuentes en paralelo; no debe ejecutarse por acción de usuario.
- Los contadores directos de AUTH/USERS/WRITE/FEEDBACK evitan añadir viajes síncronos por cada acción. No añadir instrumentación de red a rutas ordinarias.

### 4.3 Cambios que requieren desplegar más de un servicio

La matriz existente en `Services/SERVICE_ARCHITECTURE_PLAN.md` y `Services/COORDINATOR_SETUP.md` establece:
- Cambio interno compatible de Coordinator, políticas, locks o almacenamiento: solo Coordinator.
- Cambio de URLs/secretos centrales: solo ScriptProperties de Coordinator del entorno.
- Nueva acción soportada por el cliente estable: Coordinator; consumidores solo si la invocan.
- Cambio local de SharedMutationClient: solo consumidores cuyo flujo requiere la corrección.
- Cambio de lógica propia: solo ese servicio y sus pruebas/deployment.
- Cambio incompatible de protocolo: no permitido como actualización simultánea; requiere versión paralela y migración gradual.

No se detectó necesidad de desplegar todos los servicios por cada cambio interno. El acoplamiento residual de SharedMutationClient se limita a cambios excepcionales de su copia en los consumidores afectados.

## 5. Priorización

1. **P0 — GP-PERF-ADMIN-CUT-LOCK-01:** sacar WRITE y Drive de la sección crítica de `handleAddOrUpdateCut` mediante reserva/revalidación segura.
2. **P1 — Auditoría de I/O bajo locks en WRITE y FEEDBACK:** localizar funciones que mantengan locks durante Drive, UrlFetch o servicios externos; medir antes de refactorizar.
3. **P1 — Auditoría de rutas de sesión cacheada:** verificar que Coordinator solo intervenga en misses y operaciones excepcionales de sesión.
4. **P2 — Matriz de despliegue:** mantener la matriz existente como criterio; no crear despliegues coordinados sin dependencia demostrada.

## 6. Limitaciones

Inspección estática. No se midieron tiempos reales, concurrencia Apps Script, latencia WRITE/Drive ni deployments activos. Esas mediciones quedan para Beta autorizada. No se modificó código, deployments, ScriptProperties, secretos, Drive ni Spreadsheet.


## Principio arquitectónico obligatorio — aislamiento entre operaciones (2026-11-19)

Una operación de una función o subsistema no debe bloquear operaciones independientes de otra función o subsistema. La auditoría/telemetría no debe impedir consultas del Inbox, escáneres de salud, inicios de sesión, validaciones de sesión ni registro de cortes; tampoco al contrario.

Reglas de implementación:
1. No usar un `ScriptLock` global como mutex genérico para todo el servicio. Cada lock debe proteger exclusivamente el estado compartido que requiere atomicidad.
2. Preferir locks de recurso/registro/operación o reservas idempotentes breves. Operaciones sobre recursos distintos deben poder progresar en paralelo.
3. Lecturas, auditorías, escáneres de salud, llamadas HTTP, Drive y trabajo de cálculo no deben ejecutarse dentro de una sección crítica si no son parte indispensable de la mutación atómica.
4. Para escrituras sobre el mismo recurso, conservar exclusión/conflict detection, versionado y revalidación; el aislamiento no significa permitir corrupción por concurrencia.
5. Telemetría y auditoría deben ser best-effort, con timeout corto, límites de concurrencia y aislamiento de fallos; nunca ser una dependencia síncrona del camino de login, Inbox o registro.
6. Definir pruebas de no interferencia: mantener una operación lenta/esperando y comprobar que Inbox, health, login y registro de cortes independientes terminan dentro de su propio presupuesto; además probar conflicto cuando dos operaciones modifican el mismo recurso.
7. Documentar el ámbito real de cada lock: Apps Script `ScriptLock` es global dentro de un proyecto/script, no un lock por función. Antes de afirmar aislamiento entre servicios, verificar que cada servicio corre en proyecto independiente; si comparten proyecto, el lock puede cruzar funciones aunque estén en archivos distintos.

Criterio de aceptación: concurrencia entre operaciones independientes sin espera causada por locks compartidos, conservando consistencia para mutaciones del mismo recurso. No cerrar la tarea con pruebas unitarias solamente: incluir pruebas de no interferencia y, en Beta autorizada, concurrencia real.


## Observación de alcance de locks

El inventario estático localiza ScriptLocks en ADMIN, AUTH, USERS, WRITE, FEEDBACK, InboxConversations y otros módulos. Un `ScriptLock` no se limita a la función que lo adquiere: dentro de un mismo proyecto Apps Script es compartido por las ejecuciones de ese proyecto. Por tanto, separar funciones en archivos no aísla operaciones. La auditoría siguiente debe mapear cada despliegue/proyecto y asociar cada lock al recurso que protege; las llamadas remotas y trabajo no crítico deben salir del lock. No asumir que Inbox/health/login están aislados entre sí hasta confirmar si viven en proyectos de Apps Script distintos.

## Adenda — reserva de slots pending
La implementación inicial de ADMIN seleccionaba el primer slot vacío leyendo únicamente la fila de Cortes. Si se libera el lock durante una carga, esa lectura no detectaría una reserva `pending` de otra solicitud. El primer paso de corrección hace que `findNextAvailableCutSlot_` consulte Idempotencia y excluya slots pending asociados al mismo vehículo. La protección solo sirve como reserva si el registro pending se escribe antes de liberar el lock; el handler actual aún no libera el lock, por lo que el cambio es preparatorio y no reduce todavía la latencia.

## Hallazgo WRITE — asignación central de IDs y publicación de catálogo
`handleAllocateVehicleId` esperaba hasta 30 s por el ScriptLock global de WRITE. Como ese lock es compartido por los handlers del mismo proyecto, una solicitud de asignación podía permanecer esperando mientras otras acciones debían competir por el mismo lock. Se cambia a adquisición inmediata (`tryLock(0)`) y respuesta reintentable `WRITE_BUSY`, sin mantener una ejecución esperando. La sección crítica sigue siendo necesaria para reservar el contador de IDs y comprobar unicidad; su duración se abordará por separado.
`publishCortesCatalogChange_` también adquiere el ScriptLock y lo conserva mientras construye un snapshot y llama al Coordinator por HTTP. No se elimina todavía porque la publicación de snapshots puede quedar fuera de orden si se libera el lock ingenuamente; requiere diseñar una versión por registro o un mecanismo de reconciliación que evite aplicar snapshots antiguos.

