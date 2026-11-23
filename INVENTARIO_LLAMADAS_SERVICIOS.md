# GPSpedia — Inventario de llamadas entre servicios y SharedMutation

**Tarea:** MIG-004 — Inventario de llamadas entre servicios y SharedMutation  
**Fecha:** 2026-11-23  
**Rama auditada:** `GPSpedia2.2.5_work`  
**Alcance:** inventario estático de arquitectura y adendas de verificación MIG-010 a MIG-012.  
**Resultado actual:** seis destinos de servicio; gestión de usuarios integrada en AUTH; el deployment USERS dejó de ser necesario en el código versionado. El retiro del deployment/registro remoto permanece pendiente de Beta.

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

- Declara seis destinos: AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN. Las acciones getUsers, createUser y updateProfile pertenecen ahora a AUTH.
- `ACTION_TO_SERVICE_MAP` contiene 121 acciones canónicas y `routeActionInternal_` realiza POST directamente al endpoint del servicio elegido.
- `routeAction` mide tráfico local del navegador y no envía esas métricas a un servicio de telemetría.
- `getCatalogChanges` está mapeada actualmente a FEEDBACK.
- Las acciones `allocateVehicleId` y `freezeCortesIds` ya están mapeadas a WRITE; `getVehicleProjection` y `getContributionCandidates` a CATALOG.
- La salud de los servicios se consulta desde el frontend usando sus endpoints; no requiere que un servicio consulte a otro.

La matriz histórica de acciones y sus handlers permanece en `MATRIZ_MIGRACION_SERVICIOS.md` §19.2 y §19.3. Las rutas de compatibilidad no deben confundirse con nuevas acciones canónicas.

### 2.2 Grafo de dependencias backend actuales

| Origen | Destino | Operaciones observadas | Estado |
|---|---|---|---|
| ADMIN | — | Sin llamadas funcionales a WRITE ni CATALOG | MIG-010: llamadas retiradas; secuencias coordinadas desde frontend |
| AUTH, WRITE, FEEDBACK, ADMIN, UTILITIES | COORDINATOR | leases, sesiones, cachés, feed y telemetría | A través de SharedMutationClient |
| COORDINATOR | WRITE, FEEDBACK, ADMIN | __primeSessionActorCache, __invalidateSessionActorCache | Fan-out POST; lotes |
| CATALOG | — | Sin llamadas backend→backend detectadas | Lectura directa de Spreadsheet |
| InboxConversations.js | — | Sin transporte HTTP propio | Lógica delegada dentro de FEEDBACK |

Las llamadas funcionales ADMIN→WRITE y ADMIN→CATALOG descritas históricamente en §3 fueron sustituidas por solicitudes directas del frontend a los servicios propietarios. Las llamadas a Drive API, YouTube y URLs de imágenes se clasifican aparte en §7.

### MIG-010 — Coordinación frontend y recuperación de altas

Las operaciones multi-servicio cubiertas por MIG-010 se coordinan desde el frontend mediante solicitudes independientes a los servicios propietarios. Las URLs operativas se resuelven por el registro central; no se trasladan secretos compartidos al navegador.

- Reorganización: frontend ADMIN backupDatabase → WRITE freezeCortesIds → ADMIN reorganizeDatabase. El frontend conserva etapa, progreso, operationId y backupId para recuperación.
- Respaldo: ADMIN vincula operationId con usuario y Spreadsheet de origen en un manifiesto privado; los reintentos del mismo usuario reutilizan el respaldo completo y verificado, sin crear copias duplicadas.
- Altas: WRITE es propietario de addOrUpdateCut, allocateVehicleId, reserva idempotente y recuperación por opId/huella. ADMIN rechaza las rutas heredadas con ACTION_MOVED_TO_WRITE, sin escrituras ni llamadas internas.
- Proyección/candidatos: frontend consulta directamente CATALOG. getVehicleProjection valida sesión para Desarrollador, Jefe y Supervisor; getContributionCandidates continúa limitado a Desarrollador.
- Recuperación de imágenes: ADMIN devuelve el estado del journal; el frontend completa la reconciliación consultando directamente la proyección vigente de CATALOG. ADMIN no lee la fila materializada para sustituir esa proyección.

**Validación:** GitHub Actions Node.js 22, run 45209447602 — 306 suites, 3,558 pruebas, 0 fallos; suite MIG010 58/58 PASS. La ejecución real de endpoints Apps Script y permisos sobre recursos permanece diferida a Beta.

## 3. Dependencias ADMIN retiradas por MIG-010

### 3.1 ADMIN → WRITE

Las antiguas llamadas allocateVehicleId y freezeCortesIds desde ADMIN fueron retiradas. El alta vigente se enruta directamente desde frontend a WRITE; el flujo de reorganización ejecuta el respaldo ADMIN y luego invoca WRITE para congelar IDs. ADMIN conserva únicamente una ruta de compatibilidad que rechaza las acciones de alta heredadas con ACTION_MOVED_TO_WRITE.

No existe en JS/Services/admin.js un cliente funcional, URL operativa ni wrapper para coordinar WRITE. WRITE valida su propia sesión y rol y conserva la operación indivisible de alta/reserva idempotente.

### 3.2 ADMIN → CATALOG

Las antiguas consultas getVehicleProjection y getContributionCandidates desde ADMIN fueron retiradas. El frontend consulta CATALOG directamente y envía el contexto de sesión; CATALOG aplica sus propias validaciones de sesión y rol.

En la reconciliación de reemplazos de imágenes, ADMIN informa el estado del journal y el frontend añade la proyección vigente de CATALOG. ADMIN no sustituye esa proyección leyendo la fila materializada de Cortes.

No se conserva secreto compartido ADMIN↔CATALOG ni se copia al frontend. La autorización de las respuestas se realiza localmente en CATALOG.

**Pruebas de regresión relevantes:** MIG010FrontendServiceOrchestration.mjs, AdminVehicleIdAllocationIdempotency.mjs, VehicleIdAllocationEndToEnd.mjs, AdminTestigoHeaderReadReuse.mjs, AdminImageUploadLinkedRecoveryIsolation.mjs, AdminCutImageLinkOutsideLock.mjs, AdminVinDuplicateBoundedRead.mjs, CatalogTargetedResponses.mjs, CatalogTrafficTelemetry.mjs, DirectTrafficRoutingCoverage.mjs y SessionActivityLeaseMinimization.mjs.

### 3.3 Verificación de aceptación MIG-011 — 2026-11-23

La revisión de la rama GPSpedia2.2.5_work confirma que las aristas ADMIN→WRITE y ADMIN→CATALOG están retiradas:
- Las consultas de proyección y candidatos se originan en el frontend y llegan directamente a CATALOG.
- La asignación y congelación de IDs se enrutan desde el frontend a WRITE; el respaldo y la reorganización permanecen en ADMIN.
- ADMIN no conserva URLs, endpoints ni wrappers para AUTH, WRITE o CATALOG. Las llamadas UrlFetchApp restantes son integraciones externas de Drive/imagen descritas en §7.
- Se mantienen las validaciones locales de sesión/RBAC en CATALOG y las precondiciones de escritura en ADMIN/WRITE.

La paridad local queda sustentada por las suites existentes MIG010FrontendServiceOrchestration.mjs, ServiceCallGraphContract.mjs, AdminVehicleTargetedCatalogRead.mjs, AdminVehicleContributionCandidates.mjs, AdminCandidateImageInventoryCatalogSource.mjs, AdminVehicleIdAllocationIdempotency.mjs, VehicleIdAllocationEndToEnd.mjs y WriteFreezeCortesIdsBackupOutsideLock.mjs. No se elimina ninguna capacidad ADMIN ni integración externa.

GitHub Actions Node.js 22 aprobó la regresión completa (run 45212028964): 306 suites, 3,558 pruebas y cero fallos; MIG010FrontendServiceOrchestration 58/58 y ServiceCallGraphContract 9/9. El workflow de GitHub Pages también terminó SUCCESS (run 45212025471). Las invocaciones reales de Apps Script, permisos y recursos aislados continúan pendientes de Beta.

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


### 3.4 MIG-012 — Unificación funcional AUTH/USERS — 2026-11-23

- Las acciones `getUsers`, `createUser` y `updateProfile` se enrutan ahora a AUTH desde `JS/Frontend/api-config.js` y se resuelven en el dispatcher de `JS/Services/Auth.js`.
- AUTH usa el actor cacheado de su propio proyecto. El login ya precalienta la caché local AUTH; el fan-out de Coordinator se reduce a WRITE, FEEDBACK y ADMIN.
- `createUser` conserva validación de username, rol, correo/teléfono, hash PBKDF2, ID secuencial desde `__IdentifierSequenceConfig__`, snapshot, escritura atómica y rollback. Su lock fail-fast es local al proyecto AUTH y se comparte con la ruta de eliminación de cuentas.
- `updateProfile` conserva la edición exclusiva de `Nombre_Completo`, exige identidad propia y una fila ID única; no amplía campos ni adquiere un lock global para la escritura de celda.
- `getUsers` conserva el filtrado jerárquico: Desarrollador ve todos; Jefe ve Supervisor/Técnico; Supervisor ve Técnico. No expone hash ni token.
- El router, el mapa de servicios, el contrato de salud, el tráfico global, las allowlists Coordinator y las listas de caché ya no declaran USERS como servicio independiente. Se eliminaron `JS/Services/users.js` y `JS/Tests/users.js` después de migrar sus pruebas al grupo AUTH.
- Harness local de migración: 15/15 PASS. GitHub Actions Node.js 22: SUCCESS — run 45222509966 (305 suites, 3,554 pruebas, 0 fallos). Sintaxis: 445 archivos PASS; referencias: 347 archivos PASS. El lector central exige seis servicios e ignora la fila histórica USERS hasta completar el cutover Beta. Las invocaciones reales de Apps Script y la desactivación del deployment heredado siguen pendientes de Beta.


### 3.5 MIG-013 — Sesiones y actor local sin Coordinator — 2026-11-23

- AUTH es la autoridad de login y del registro `Users/ActiveSessions`. El token de sesión es opaco, se genera en servidor y se registra en ActiveSessions; el hash PBKDF2 y el bloqueo temporal de login permanecen sin cambios.
- AUTH, WRITE, FEEDBACK, ADMIN y UTILITIES obtienen el actor mediante `getCachedSharedSessionActor_`; CATALOG utiliza `getCatalogSessionActor_`/`loadCatalogSessionActor_`. Cada implementación usa CacheService local del proyecto y consulta la Spreadsheet únicamente en cache miss o tras invalidación.
- La clave de caché deriva de SHA-256(userId + token); TTL máximo 21,600 segundos. La caché caliente evita lecturas de Users/ActiveSessions en cada acción.
- En cache miss se valida token único, correspondencia de userId, sesión vigente, fechas, usuario único/activo, rol permitido y ausencia de revocación pendiente. El rol se toma de Users, nunca del payload del navegador.
- Las rutas de sesión y autorización ordinaria no llaman a Coordinator ni adquieren leases SharedMutation. Las comprobaciones de capacidad son locales y mantienen la matriz RBAC existente.
- Los endpoints `__invalidateSessionActorCache` limpian la caché del proyecto receptor sin secreto compartido. La orquestación frontend de invalidación remota y el manejo de servicios no disponibles corresponden a MIG-014.
- La suite `MIG013SessionActorLocalLookup.mjs` cubre ambos loaders, cache miss/hit, TTL, cambio de rol, cuenta eliminada, token revocado/desconocido, expiración, identidad y ausencia de llamadas de sesión a Coordinator.
- No se alteraron endpoints, deployments, propiedades, hojas ni datos externos. Las pruebas con Apps Script/Spreadsheet reales quedan diferidas a Beta.


### 3.6 MIG-014 — invalidación de caché por coordinación frontend — 2026-11-23
- AUTH incluye en la respuesta de las operaciones de revocación las referencias SHA-256 de las claves afectadas, separadas por el espacio de claves compartido y CATALOG. No se devuelve el token de sesión a otros servicios.
- sessionCacheInvalidation.js ejecuta llamadas directas desde el navegador a los seis proyectos; cada servicio elimina exclusivamente las claves locales que coinciden con su prefijo y formato.
- La invalidación no usa Coordinator, SharedMutation, propiedades de Script ni secretos compartidos. Los servicios no contienen URLs operativas de otros servicios ni coordinan entre sí.
- Se admiten hasta dos intentos por destino; el resultado parcial identifica servicios sin confirmación y el frontend informa al usuario. El TTL de actor local fija el vencimiento máximo en 21,600 segundos.
- Suites MIG-014 en GitHub Actions Node.js 22: 15/15 flujo de sesión, fan-out/reintento/fallo parcial PASS, contrato backend/cache 10/10 y contrato de invalidación local 6/6.
- Validación Beta de deployments y Spreadsheet aislados pendiente; no se afirma que los endpoints reales hayan sido invocados.
