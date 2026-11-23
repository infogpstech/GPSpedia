# GPSpedia — Inventario de llamadas entre servicios y SharedMutation

**Tarea:** MIG-004 — Inventario de llamadas entre servicios y SharedMutation  
**Fecha:** 2026-11-23  
**Rama auditada:** `GPSpedia2.2.5_work`  
**Alcance:** análisis estático de los diez módulos backend activos, el router frontend y las pruebas relacionadas.  
**Resultado:** mapa de dependencias, propietario funcional, reemplazo objetivo y evidencia de prueba. No se cambió código funcional ni se retiró ningún endpoint.

## 1. Criterio y límites

La fuente normativa vigente es `NORMAS_DESAROLLO.md`, especialmente §§15–17. La arquitectura objetivo exige:

- Cada petición backend se origina en el frontend y cada servicio responde al frontend.
- Ningún servicio conoce ni llama la URL de otro servicio GPSpedia.
- No se conservan COORDINATOR ni SharedMutation como intermediarios o sustitutos equivalentes.
- El frontend coordina secuencias que realmente involucren más de un servicio.
- Una mutación lógica que requiere consistencia debe permanecer dentro de un único servicio propietario; no dividir una escritura crítica entre llamadas que el navegador pueda editar o reordenar.
- Cada servicio conserva su autorización local y el acceso directo a Spreadsheet/Drive que necesite.
- Se preservan las capacidades de sesión, revocación, cachés, feed, métricas, imágenes, vídeos, administración y mantenimiento.

Este documento describe el código versionado. No acredita que las URLs, secretos, propiedades, scopes, deployments o datos remotos estén activos o coincidan. Tampoco demuestra llamadas reales a Apps Script. La verificación remota se reserva para Beta aislada.

## 2. Arquitectura de comunicación actual

### 2.1 Entrada desde el navegador

`JS/Frontend/api-config.js` es el router único de solicitudes de aplicación:

- Declara siete destinos: AUTH, CATALOG, WRITE, USERS, FEEDBACK, UTILITIES y ADMIN.
- `ACTION_TO_SERVICE_MAP` contiene 120 acciones canónicas y `routeActionInternal_` realiza POST directamente al endpoint del servicio elegido.
- `routeAction` mide tráfico local del navegador y no envía esas métricas a un servicio de telemetría.
- `getCatalogChanges` está mapeada actualmente a FEEDBACK.
- Las acciones `allocateVehicleId` y `freezeCortesIds` ya están mapeadas a WRITE; `getVehicleProjection` y `getContributionCandidates` a CATALOG.
- La salud de los servicios se consulta desde el frontend usando sus endpoints; no requiere que un servicio consulte a otro.

La matriz de 120 acciones y sus handlers permanece en `MATRIZ_MIGRACION_SERVICIOS.md` §19.2 y §19.3. Las rutas de compatibilidad no deben confundirse con nuevas acciones canónicas.

### 2.2 Grafo de dependencias backend actuales

| Origen | Destino | Operaciones observadas | Estado |
|---|---|---|---|
| ADMIN | — | Sin llamadas a WRITE ni CATALOG | MIG-010: retiradas del código ejecutable |
| AUTH, USERS, WRITE, FEEDBACK, ADMIN, UTILITIES | COORDINATOR | leases, sesiones, cachés, feed y telemetría | A través de SharedMutationClient; fuera del alcance de MIG-010 |
| COORDINATOR | USERS, WRITE, FEEDBACK, ADMIN | `__primeSessionActorCache`, `__invalidateSessionActorCache` | Fan-out POST; fuera del alcance de MIG-010 |
| CATALOG | — | Sin llamadas backend→backend | Lectura directa de Spreadsheet |
| InboxConversations.js | — | Sin transporte HTTP propio | Lógica delegada dentro de FEEDBACK |

MIG-010 elimina la coordinación backend→backend de ADMIN con WRITE y CATALOG. Las secuencias que requieren ambos servicios se coordinan desde el frontend, que realiza solicitudes independientes a los endpoints correspondientes. Las mutaciones indivisibles permanecen en su servicio propietario. No se trasladan secretos, URLs ni credenciales de un servicio al navegador.

## 3. ADMIN: llamadas interservicio retiradas por MIG-010

### 3.1 ADMIN / WRITE

Se retiró el cliente ADMIN que invocaba `allocateVehicleId` en WRITE y el handler heredado ya no ejecuta la asignación ni la escritura. La ruta de compatibilidad devuelve `ACTION_MOVED_TO_WRITE` sin hacer llamadas HTTP ni mutaciones.

El alta de vehículos, la reserva idempotente de IDs (`opId` y `operationHash`), las escrituras de Cortes y la finalización de la operación pertenecen a WRITE. El frontend enruta `addOrUpdateCut` y `allocateVehicleId` directamente a WRITE. La reserva y la mutación se mantienen dentro de la operación propietaria para evitar que el navegador divida una escritura crítica.

La acción `freezeCortesIds` también se enruta directamente a WRITE. Cuando el flujo requiere un respaldo ADMIN previo, el frontend espera su resultado y luego envía a WRITE el identificador del respaldo; WRITE conserva la operación de congelación y su verificación.

### 3.2 ADMIN / CATALOG

Se retiró el cliente ADMIN que consultaba `getVehicleProjection` y `getContributionCandidates` en CATALOG. ADMIN ya no contiene URL, secreto compartido ni wrapper de transporte hacia CATALOG.

El frontend consulta directamente CATALOG para obtener proyecciones y candidatos. CATALOG valida su propia sesión y rol antes de responder; el frontend no recibe ni reenvía secretos interservicio. Las mutaciones posteriores se envían al servicio propietario, que vuelve a comprobar la identidad, el estado y la versión del recurso antes de escribir.

El ledger interno de eventos de inventario no se expone como respuesta genérica de candidatos. CATALOG entrega la proyección mínima autorizada necesaria para el flujo de frontend.

**Pruebas de regresión:** `AdminVehicleIdOutsideLock.mjs`, `AdminVehicleIdAllocationIdempotency.mjs`, `AdminNewVehicleBatchWrites.mjs`, `AdminCutSlotBatchWrites.mjs`, `AdminOperationReadInventory.mjs`, `AdminVehicleTargetedCatalogRead.mjs`, `CatalogTargetedResponses.mjs`, `CatalogTrafficTelemetry.mjs`, `ServiceTrafficAdminContract.mjs`, `DirectTrafficRoutingCoverage.mjs` y `ServiceCallGraphContract.mjs`.

**Límite de evidencia:** estas pruebas verifican código y contratos versionados. La comprobación de sesiones, roles, URLs desplegadas y comportamiento real de Apps Script debe ejecutarse en Beta aislada; no se afirma que haya sido validada por las pruebas estáticas.

## 4. SharedMutationClient → COORDINATOR

### 4.1 Las 13 operaciones del protocolo

`JS/Services/SharedMutationClient.js` construye POST autenticados con `protocolVersion: 1`, identidad del servicio, operación y secreto. `JS/Services/Coordinator.js` autentica al proyecto llamador y despacha estas 13 operaciones:

| Operación Coordinator | Consumidor/callsite actual | Función que cubre | Reemplazo objetivo |
|---|---|---|---|
| `acquire` | AUTH, USERS, ADMIN, UTILITIES mediante `withSharedMutationLease_` | Reserva de lease y lectura de actor | Retirar lease global. Usar exclusión local solo dentro del servicio propietario cuando sea indispensable; para secuencias entre servicios, coordina el frontend. |
| `release` | Los mismos callsites; se ejecuta en `finally` | Liberar lease | Desaparece junto con acquire; conservar limpieza local de recursos/bloqueos. |
| `validate` | Solo ruta condicional `nestedToken` de `withLease` | Validar lease anidada | No se encontró productor versionado de `__sharedMutationToken`; mantener compatibilidad hasta cerrar la búsqueda de consumidores externos y retirar conjuntamente cliente/servidor. |
| `publishCatalogChange` | WRITE, FEEDBACK y ADMIN | Publicación individual de delta/reset | El servicio que confirma la mutación escribe el evento idempotente en la hoja de feed de Spreadsheet dentro de su propio flujo. CATALOG queda como lector. |
| `publishCatalogChanges` | ADMIN, lotes de hasta 50 eventos | Publicación batch | Escritura de lote en Spreadsheet desde el mismo propietario ADMIN, con requestId, deduplicación y recuperación de lote parcial. |
| `getCatalogChanges` | FEEDBACK: GET `catalogFeed=1` y acción `getCatalogChanges` | Lectura de cursor/deltas/reset | CATALOG será propietario del feed de lectura; el frontend consulta CATALOG directamente. Mantener compatibilidad de FEEDBACK/GET solo hasta verificar consumidores externos. |
| `registerSession` | Wrapper `registerSharedSessionContext_` sin callsite encontrado | Alta individual de contexto de sesión | No hay consumidor activo localizado. La autoridad de sesión debe quedar en AUTH/Spreadsheet; retirar el wrapper solo tras confirmar que no existen clientes externos. |
| `syncUserSessions` | AUTH, durante login/sincronización de sesiones | Sincronizar sesiones activas y disparar precarga de cachés | AUTH administra sesiones en Spreadsheet. Tras login, el frontend coordina la precarga directa en cada servicio; cada servicio valida localmente la sesión antes de cachear actor. |
| `revokeSession` | AUTH mediante `revokeSharedSessionContext_` | Revocación de token individual | AUTH actualiza la sesión en Spreadsheet; el frontend solicita invalidación directa a los servicios afectados antes de confirmar el cierre/revocación. |
| `revokeUserSessions` | AUTH mediante `revokeSharedUserSessionContexts_` | Revocación global y epoch | AUTH conserva la revocación autoritativa/epoch en Spreadsheet; frontend fan-out directo de invalidación y reintento idempotente. |
| `validateSessionContext` | AUTH, en `handleValidateSession` | Validar token/contexto compartido y actor | AUTH valida directamente contra Users/ActiveSessions. No hacer validación remota por cada acción ordinaria. |
| `invalidateSessionActorCaches` | AUTH antes de revocar uno o varios tokens | Invalidación de cachés remotas | Frontend invoca endpoints directos autenticados de USERS, WRITE, FEEDBACK y ADMIN. Los servicios no deben aceptar un secreto compartido ni confiar en rol/userId editable. |
| `getServiceTraffic` | ADMIN, en `handleGetServiceTraffic_` | Lectura de buckets globales del Coordinator | Conservar telemetría local de navegador ya implementada. Si se requiere agregado persistente global, diseñar envío por lotes/asíncrono sin una petición ni escritura síncrona por acción; no presentar los datos locales como métricas globales. |

### 4.2 Callers reales de leases

La búsqueda de callsites de `withSharedMutationLease_` encontró seis usos activos y un helper de mantenimiento sin consumidor versionado:

| Servicio | Operación | Ubicación/función |
|---|---|---|
| AUTH | `deleteUser` | Router `doPost` |
| AUTH | `migrateLegacyRoleRevocationMarkersToSharedState` | Helper definido, sin callsite externo/versionado localizado; no se cuenta como lease activa |
| USERS | `createUser` | Router `doPost` |
| ADMIN | `saveUnusedImagesInventory` | Dispatcher de ADMIN |
| ADMIN | `createCortesImageFolder` | Dispatcher de ADMIN |
| ADMIN | `auditDriveImagesInCortes` | `handleAuditDriveImagesInCortes` |
| UTILITIES | `migrateTimestamps` | `migrateTimestamps` |

WRITE y FEEDBACK no adquieren leases en sus routers actuales. No se debe interpretar cada entrada histórica de `coordinatorPolicy_` como una lease activa: la política contiene operaciones antiguas o de compatibilidad que no tienen un callsite actual de `withSharedMutationLease_`.

AUTH y USERS aceptan opcionalmente `__sharedMutationToken`; WRITE permite ese campo en un payload heredado para evitar doble publicación. No se encontró en los consumidores versionados un emisor activo de ese token. La ruta `validate` debe considerarse compatibilidad sin productor demostrado, no una dependencia vigente confirmada.

### 4.3 Operaciones de sesión y secuencia actual

- AUTH obtiene la sesión y lee `ActiveSessions`; `syncSharedSessionContextsForUser_` envía la lista al Coordinator.
- Coordinator guarda contextos/epochs e índice token→usuario en ScriptProperties.
- Coordinator llama a `__primeSessionActorCache` en USERS, WRITE, FEEDBACK y ADMIN.
- En logout, rotación de sesión, cambio de rol/contraseña, reset y eliminación de cuenta, AUTH solicita invalidación remota y luego revoca el contexto.
- Coordinator llama a `__invalidateSessionActorCache` en los cuatro servicios; los servicios comparan un secreto local y eliminan claves de CacheService.
- AUTH usa `validateSessionContext` durante `handleValidateSession`; la ruta ordinaria de los demás servicios usa el actor cacheado localmente.

La conservación de las capacidades de cierre remoto, revocación individual/global, cambio de rol, eliminación de cuenta y bloqueo de login es obligatoria. La sustitución no puede limitarse a borrar cachés locales de AUTH ni a esperar pasivamente el TTL.

## 5. COORDINATOR → servicios: endpoints privados de caché

Los cuatro servicios USERS, WRITE, FEEDBACK y ADMIN exponen dos acciones privadas cada uno:

- `__primeSessionActorCache`: recibe userId, rol/nombre/epoch y tokens para preparar el actor local.
- `__invalidateSessionActorCache`: recibe userId y tokens para eliminar entradas de caché.

Coordinator las invoca con URL y secreto individual de cada servicio. La precarga admite lotes de hasta 25 tokens por servicio; la invalidación remota procesa grupos de hasta cinco tokens por destino. Las respuestas deben confirmar el número exacto; la operación no se considera completa si falta un servicio.

**Reemplazo:** endpoints de servicio invocados directamente desde el frontend, autenticados con una sesión verificable por el propio servicio y permisos locales. En precarga, el servicio debe derivar el rol desde Spreadsheet, no confiar en el rol enviado por navegador. En invalidación, la operación debe ser idempotente y validar que el actor puede cerrar/revocar la sesión objetivo. No usar tokens/secretos de servicio en el navegador.

**Pruebas existentes:** `SessionActorCacheInvalidation.mjs`, `CoordinatorCapabilityPreservation.mjs`, `SessionActivityCoordination.mjs`, `AuthSessionReadOptimization.mjs`, `SessionActorCacheLifetime.mjs`.

## 6. Operaciones coordinables desde frontend y escrituras que deben permanecer en un propietario

| Flujo | ¿Frontend coordina? | Límite que debe permanecer en un único backend |
|---|---|---|
| Backup ADMIN → congelar IDs WRITE | Sí: backup confirmado primero, después llamada WRITE | WRITE valida backupId/confirmación y ejecuta/verifica la modificación de IDs como una sola operación lógica. |
| Leer proyección CATALOG → editar campo ADMIN | Sí: prelectura directa CATALOG y después ADMIN | ADMIN revalida versión/valor actual en Spreadsheet antes de escribir; no confía en el snapshot del cliente. |
| Leer candidatos CATALOG → inventario/reconciliación ADMIN | Sí: lectura directa y luego acción ADMIN | ADMIN valida otra vez IDs, referencias, permisos y estado antes de mover/escribir; el cliente no autoriza operaciones destructivas. |
| Login AUTH → precargar cachés | Sí: AUTH devuelve sesión confirmada y frontend invoca cada servicio | Cada servicio valida la sesión contra la fuente compartida y crea su propia caché; no acepta rol arbitrario. |
| Logout/revocación/cambio de rol/eliminación | Sí: fan-out directo a servicios afectados y después/según protocolo AUTH | AUTH conserva la escritura autoritativa de sesión/epoch. La operación debe ser reintentable y no informar éxito parcial. |
| Mutación de catálogo y publicación de delta | No separar en dos peticiones de navegador | El servicio que confirma el cambio registra el evento idempotente con la mutación/reconciliación local. CATALOG solo lee el feed. |
| Alta/edición de cortes, VIN y aportes | No dividir validación, ID, idempotencia y escritura entre servicios | WRITE mantiene el flujo de escritura, ledger, verificación y recuperación. |
| Inbox, PyS, tutoriales y aprobación de vídeo | No dividir una mutación lógica entre servicios | FEEDBACK conserva los handlers y la persistencia de cada operación; la transferencia binaria de YouTube sigue directa navegador→YouTube. |
| Auditorías, organizador Drive, backups y restauraciones | El frontend puede encadenar pasos visibles y confirmaciones | ADMIN mantiene cada operación, su ledger, read-back, rollback y autorización en el servidor. |
| Migración de timestamps | No requiere secuencia de servicios | UTILITIES conserva la migración completa, staging, backup y rollback local. |
| Consulta de tráfico | El frontend presenta métricas locales existentes | No se añade un viaje de red por acción ni escrituras síncronas de telemetría. Un agregado persistente necesita diseño separado y batch asíncrono. |

### 6.1 Colisiones de propiedad detectadas

Coordinator actualmente describe recursos compartidos mediante políticas de lectura/escritura. La eliminación de leases exige resolver estos solapamientos; ScriptLock de un proyecto Apps Script no constituye un lock global entre proyectos independientes.

| Recurso | Servicios que escriben o coordinan hoy | Riesgo/decisión requerida antes de migrar |
|---|---|---|
| Users / ActiveSessions | AUTH y USERS; AUTH mantiene identidad/sesión, USERS incluye createUser/updateProfile | Definir un solo propietario de escrituras de identidad o unificar AUTH/USERS. No dejar createUser concurrente con deleteUser sin protección equivalente. |
| Cortes | WRITE, ADMIN y FEEDBACK tienen operaciones que escriben distintos campos/registros | Definir propietario por agregado/campo o consolidar las escrituras que comparten filas. No asumir que locks locales de proyectos distintos se excluyen. |
| Drive y referencias de archivos | WRITE, FEEDBACK y ADMIN | Mantener propietarios por flujo y ledgers idempotentes; cualquier secuencia Drive→Spreadsheet debe conservar compensación/read-back. |
| Catálogo incremental | WRITE, FEEDBACK y ADMIN publican eventos; CATALOG/FEEDBACK leen feed vía Coordinator | Mover el registro de eventos a Spreadsheet con escritor por servicio, requestId y recuperación; CATALOG será el lector canónico. |
| Sesiones/cachés | AUTH es autoridad; cuatro servicios mantienen caché local | AUTH es dueño de la sesión; cada servicio es dueño solo de su caché y responde a la coordinación del frontend. |

Estas colisiones son requisitos de diseño para las tareas de implementación siguientes. MIG-004 no altera propietarios, hojas, acciones ni contratos.

## 7. Llamadas HTTP que NO son dependencias entre microservicios

| Origen | Destino externo | Uso | Condición de conservación |
|---|---|---|---|
| FEEDBACK | YouTube Data API | Crear sesión Resumable mediante OAuth del servidor | Token OAuth permanece en Apps Script; transferencia binaria sigue navegador→YouTube; conservar pausa, reanudación, aprobación y rechazo. |
| ADMIN | Google Drive API v3 | Cuota, metadata y operaciones Drive autenticadas con OAuth | Mantener OAuth de ejecución, scopes, permisos y verificación posterior. |
| ADMIN, WRITE | URL/recurso de imagen recibido | Obtener bytes/validar imagen antes de persistirla | No confundirlo con llamada a otro servicio GPSpedia; conservar validación de MIME/tamaño e integridad. |
| Frontend | YouTube Resumable URL | Transferencia binaria directa | URL temporal sensible en IndexedDB; no trasladar el token OAuth al navegador. |

No se identificó uso de UrlFetchApp para que CATALOG llame a otro microservicio. InboxConversations.js no contiene transporte HTTP propio.

## 8. Pruebas y trazabilidad de paridad

Las siguientes suites ya existen y están registradas en `JS/Tests/RunServiceTests.mjs`. Se asignan a las aristas/capacidades para que la implementación posterior no retire un flujo sin prueba de equivalencia:

| Dependencia/capacidad | Pruebas representativas |
|---|---|
| ADMIN→WRITE: asignación y freeze | `AdminVehicleIdAllocationIdempotency.mjs`, `VehicleIdAllocationEndToEnd.mjs`, `AdminCutPreflightBeforeAllocation.mjs`, `WriteVehicleIdAllocationIdempotency.mjs`, `WriteFreezeCortesIdsBackupOutsideLock.mjs` |
| ADMIN→CATALOG: proyección/candidatos | `AdminVehicleTargetedCatalogRead.mjs`, `AdminVehicleFieldVersioning.mjs`, `AdminVehicleContributionCandidates.mjs`, `AdminCandidateImageInventoryCatalogSource.mjs`, `AdminVehicleContributionResolution.mjs` |
| Sesiones, actor y revocación | `CoordinatorCapabilityPreservation.mjs`, `SessionActorCacheInvalidation.mjs`, `SessionActivityCoordination.mjs`, `SessionActivityLeaseMinimization.mjs`, `AuthSessionReadOptimization.mjs`, `SessionActorCacheLifetime.mjs` |
| Lease, mantenimiento y contención | `SharedMutationCoordinator.js`, `MutationLockContention.mjs`, `AdminInventoryLockIsolation.mjs`, `AdminDriveLockIsolation.mjs`, `UtilitiesSecurity.js` |
| Feed incremental | `WriteCatalogPublicationIsolation.mjs`, `CatalogFeedRetry.mjs`, `CatalogEditDeltaRefresh.mjs`, `TutorialCatalogRefreshDeltaFirst.mjs`, `PysDataCache.js` |
| Telemetría | `ServiceBrowserTrafficContract.mjs`, `DirectServiceTrafficTelemetry.mjs`, `ServiceTrafficAdminContract.mjs`, `ServiceTrafficAggregation.mjs`, `ServiceTrafficBatch.mjs`, `ServiceTrafficAggregatorContract.mjs` |
| Integraciones externas | `YouTubeUploadCheckpointRecovery.js`, pruebas de YouTube resumable, `AdminDriveAuditClientRetry.mjs`, `AdminDriveAuditIndexedDB.mjs` |
| Contratos de ruteo/acciones | `ActionDispatchContract.js`, `ServiceHealthContract.mjs`, `RemoteServiceHealth.mjs` |

La cobertura existente es mayoritariamente de contratos, dobles y lógica local. No equivale a una prueba de los deployments reales, Apps Script, Spreadsheet, Drive, OAuth o YouTube. Esas validaciones siguen siendo Beta.

## 9. Decisiones para implementación posterior

1. Retirar primero los destinos y secretos de servicio a servicio, no las capacidades que hoy dependen de ellos.
2. Convertir la precarga/invalidez de actor en endpoints directos, autenticados y autorizados localmente; coordinar lotes desde frontend.
3. Hacer que AUTH sea la autoridad de sesiones en Spreadsheet y resolver el propietario único de escrituras de Users antes de retirar la lease AUTH↔USERS.
4. Eliminar la publicación/lectura de catálogo vía Coordinator sustituyéndola por una hoja de eventos y CATALOG como lector canónico.
5. Resolver solapamientos de escritura en Cortes antes de retirar leases de mantenimiento; no confiar en ScriptLock local entre proyectos.
6. Mantener intactos los flujos Drive, YouTube, backups, restauración, inventario, auditoría, terminal, Inbox, PyS, tutoriales, métricas y herramientas manuales.
7. Retirar `registerSession`, `validate` anidado, wrappers sin callsite y rutas GET de compatibilidad solo después de comprobar que no hay consumidores externos no versionados.

## 10. Cierre del inventario

- Se identificaron todas las llamadas HTTP entre los diez módulos backend versionados.
- Cada arista actual tiene servicio propietario, función/acción, payload o resultado relevante, reemplazo objetivo y pruebas representativas.
- Se identificaron rutas privadas de caché, operaciones Coordinator y wrappers sin consumidor versionado.
- Se separaron integraciones externas para evitar eliminarlas como si fueran dependencias internas.
- Se documentaron los solapamientos de escritura que deben resolverse antes de retirar leases.
- No se modificó código funcional, URLs, endpoints, propiedades, RBAC, Spreadsheet, Drive ni deployments.

**Criterio de aceptación MIG-004:** cumplido para el inventario estático y la trazabilidad. Las pruebas locales de equivalencia para la sustitución de cada arista pertenecen a las tareas de implementación; las pruebas reales de deployments y recursos externos se reservan para Beta.

## 11. Implementación de reemplazos MIG-010 — 2026-11-23

La implementación frontend de las secuencias identificadas en el inventario queda registrada así:

| Flujo | Coordinación vigente | Protección / recuperación |
|---|---|---|
| Reorganización de Spreadsheet | Frontend → ADMIN `backupDatabase` → WRITE `freezeCortesIds` → ADMIN `reorganizeDatabase` | Etapas y backupId persistidos por usuario; operationId estable; ADMIN revalida manifiesto, propiedad del respaldo, fórmulas y precondiciones antes de ordenar. |
| Confirmación de edición de campos | Frontend → ADMIN `updateVehicleField` → CATALOG `getVehicleProjection` | ADMIN registra el evento; frontend consulta la proyección vigente y presenta aplicado, candidato, reemplazado o no disponible. CATALOG valida sesión local con roles Desarrollador, Jefe o Supervisor. |
| Reconciliación de imágenes editadas | Frontend → ADMIN `uploadAdminImage` → CATALOG `getVehicleProjection` | La lectura de proyección se ejecuta desde el navegador con la sesión activa; no requiere wrapper ni URL de CATALOG en ADMIN. |
| Inventario de candidatos de imágenes | Frontend → CATALOG `getContributionCandidates` → ADMIN `getReplacedImages` | CATALOG limita la consulta de candidatos al rol Desarrollador; ADMIN conserva su autorización y validación propias. |

### Salvaguardas implementadas

- ADMIN no contiene destinos de servicios Apps Script ni wrappers de coordinación funcional hacia WRITE/CATALOG.
- El router frontend resuelve los servicios por el mapa de acciones y el registro central de endpoints; no se añadieron URLs locales.
- La reorganización persiste un operationId antes de pedir el respaldo. ADMIN asocia el identificador al usuario y al origen en el manifiesto privado; un reintento del mismo usuario verifica y reutiliza la copia existente. Un identificador de otro usuario, una copia incompleta, ambigua o movida fuera de la raíz se rechaza.
- `getVehicleProjection` exige sesión activa y conserva la matriz de edición del modal: Desarrollador, Jefe y Supervisor. `getContributionCandidates` mantiene el requisito de Desarrollador.
- El navegador transmite el contexto de sesión, pero no decide permisos ni recibe secretos de servicio. Cada backend valida la sesión y el rol que le corresponde.

### Cobertura y límites

- Prueba de contrato: `JS/Tests/MIG010FrontendServiceOrchestration.mjs`, integrada en `JS/Tests/RunServiceTests.mjs`.
- La suite se ejecutó de forma aislada en V8 con 58 aserciones aprobadas y simulación de replay del respaldo. La ejecución Node.js 22 del workflow completo queda pendiente de confirmar.
- Las pruebas locales no equivalen a llamadas contra deployments reales. La validación Beta de permisos Apps Script, Spreadsheet, Drive y operación entre servicios sigue pendiente.

