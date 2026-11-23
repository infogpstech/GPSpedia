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
| ADMIN | WRITE | `allocateVehicleId`, `freezeCortesIds` | 2 llamadas POST directas |
| ADMIN | CATALOG | `getVehicleProjection`, `getContributionCandidates` | 2 llamadas POST directas |
| AUTH, USERS, WRITE, FEEDBACK, ADMIN, UTILITIES | COORDINATOR | leases, sesiones, cachés, feed y telemetría | A través de SharedMutationClient |
| COORDINATOR | USERS, WRITE, FEEDBACK, ADMIN | `__primeSessionActorCache`, `__invalidateSessionActorCache` | Fan-out POST; lotes |
| CATALOG | — | Sin llamadas backend→backend detectadas | Lectura directa de Spreadsheet |
| InboxConversations.js | — | Sin transporte HTTP propio | Lógica delegada dentro de FEEDBACK |

No se detectaron otras llamadas HTTP entre los diez módulos backend. Las llamadas a Drive API, YouTube y URLs de imágenes se clasifican aparte en §7.

## 3. Llamadas directas de ADMIN a servicios

### 3.1 ADMIN → WRITE

Transporte: `callWriteServiceAction()` en `JS/Services/admin.js`, que hace POST a WRITE y valida HTTP, JSON y `status: success`.

| Acción WRITE | Consumidor ADMIN | Payload relevante | Respuesta usada | Reemplazo objetivo |
|---|---|---|---|---|
| `allocateVehicleId` | `requestNextVehicleIdFromWriteService`, invocado por el handler heredado `handleAddOrUpdateCut` | `userId`, `sessionToken`, `opId`, `operationHash` | `vehicleId` validado como entero positivo | La asignación canónica ya pertenece a WRITE y la acción ya existe en el mapa frontend. El alta vigente debe ejecutar la asignación dentro de WRITE; retirar el wrapper ADMIN solo después de demostrar que el handler heredado no tiene consumidor externo. |
| `freezeCortesIds` | `requestCortesIdFreezeFromWriteService`, invocado por `handleFreezeIdentifierFormulas` | `userId`, `sessionToken`, `backupId`, `confirm: true` | Resultado confirmado de WRITE | El frontend coordina primero el backup ADMIN y, si termina correctamente, llama directamente a WRITE/freezeCortesIds con el backupId. La escritura y verificación de IDs permanece indivisible dentro de WRITE. |

**Observación de compatibilidad:** ADMIN devuelve `ACTION_MOVED_TO_WRITE` para las antiguas acciones `checkOperation`, `addOrUpdateCut` y `addSupplementaryInfo`. El helper de asignación dentro de `handleAddOrUpdateCut` es una ruta heredada que no debe tratarse como consumidor frontend activo. No se elimina en MIG-004.

**Pruebas existentes:** `AdminVehicleIdAllocationIdempotency.mjs`, `VehicleIdAllocationEndToEnd.mjs`, `WriteFreezeCortesIdsBackupOutsideLock.mjs`, `AdminCutPreflightBeforeAllocation.mjs`, `WriteVehicleIdAllocationIdempotency.mjs`. Confirmar en la tarea de implementación que el flujo frontend mantiene backup previo, opId, hash, reintento y resultado original.

### 3.2 ADMIN → CATALOG

| Acción CATALOG | Consumidor ADMIN | Payload relevante | Respuesta usada | Reemplazo objetivo |
|---|---|---|---|---|
| `getVehicleProjection` | `getAdminProjectedVehicleFieldSnapshot_`, usado antes de editar un campo/imagen de vehículo | `vehicleId` | Proyección del vehículo, valor del campo y fuente de contribución | El frontend consulta CATALOG directamente como prelectura. ADMIN debe validar en su propia ejecución la versión/valor esperado contra Spreadsheet antes de escribir; no debe confiar en una proyección enviada por el navegador. |
| `getContributionCandidates` | `handleGetVehicleContributionCandidates_`; también lo consume el flujo de inventario/reconciliación de imágenes | `limit`; opcional `includeImageInventoryEvents` | Candidatos, total, truncamiento, origen y eventos autorizados de inventario | El frontend consulta CATALOG directamente. Los metadatos restringidos deben autorizarse mediante sesión y rol verificados por CATALOG; no se debe conservar el secreto compartido ADMIN↔CATALOG ni exponerlo al navegador. ADMIN vuelve a comprobar la identidad/estado del recurso antes de aplicar una mutación. |

**Riesgo de seguridad identificado:** la lectura opcional de eventos de inventario usa `GPSpedia_CATALOG_TRAFFIC_SECRET`, compartido entre ADMIN y CATALOG. Esto contradice la arquitectura objetivo de §17. No copiar ese secreto al frontend ni trasladarlo a una hoja pública. La sustitución debe ser autorización local de CATALOG con actor/rol de sesión y respuesta mínima.

**Pruebas existentes:** `AdminVehicleTargetedCatalogRead.mjs`, `AdminVehicleFieldVersioning.mjs`, `AdminVehicleContributionCandidates.mjs`, `AdminCandidateImageInventoryCatalogSource.mjs`, `AdminVehicleContributionResolution.mjs`, `VehicleContributionProjection.mjs`.

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

La búsqueda de callsites de `withSharedMutationLease_` encontró siete usos actuales:

| Servicio | Operación | Ubicación/función |
|---|---|---|
| AUTH | `deleteUser` | Router `doPost` |
| AUTH | `migrateLegacyRoleRevocationMarkersToSharedState` | Helper de mantenimiento |
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
