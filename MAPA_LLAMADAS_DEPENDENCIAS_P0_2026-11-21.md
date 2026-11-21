# Mapa de llamadas y dependencias — GPSpedia
Fecha: 2026-11-21
Rama: `GPSpedia2.2.5_work`
HEAD de inspección: `37f97061001cf688b354f3bc9c05ca5d87fb922b`
Alcance: P0.1 de auditoría integral. Inspección estática de fuentes versionadas; no representa mediciones de despliegues.

## 1. Arquitectura de entrada
El navegador usa `JS/Frontend/api-config.js` como router único. `routeAction` resuelve `ACTION_TO_SERVICE_MAP`, envía un POST JSON como `text/plain` al endpoint del servicio, lee el cuerpo y analiza JSON. `routeActionWithRetry` admite hasta 3 intentos para fallos de red, timeout y HTTP 408/425/429/5xx; cada intento es un request separado. `fetchCatalogData` delega en `runCatalogRequestWithRetry`, con política propia de reintentos/cancelación. `recordBrowserServiceTraffic` registra métricas efímeras en memoria; no envía otro request ni persiste datos. La acción `getSuggestion` se enruta normalmente a WRITE; CATALOG conserva una ruta directa histórica de compatibilidad.

El frontend no llama directamente a Coordinator. Su URL se resuelve desde ScriptProperties por `SharedMutationClient.js`.

## 2. Mapa navegador → servicio → dispatcher

| Servicio | Fuente backend | Acciones principales | Dispatcher |
|---|---|---|---|
| AUTH | `JS/Services/Auth.js` | login, validateSession, touchSession, acceptTerms, recuperación/cambio/restablecimiento de contraseña, logout, updateUser, deleteUser, resetUserSessions, clearSensitiveLogs, migración y benchmark KDF | `doPost` → `doPostInternal_` → handlers AUTH |
| USERS | `JS/Services/users.js` | getUsers, createUser, updateProfile | `doPost` → `doPostInternal_` |
| WRITE | `JS/Services/write.js` | checkVehicle, getSuggestion, checkOperation, addOrUpdateCut, addSupplementaryInfo, checkVinDuplicate, addVinToVehicle, allocateVehicleId, freezeCortesIds | `doPost` → `doPostInternal_` |
| FEEDBACK | `JS/Services/feedback.js` + `JS/Services/InboxConversations.js` | likes, vistas, reportes, contacto, PyS, sugerencias, tutoriales, vídeos, Inbox, activity logs, respuestas y cambios de catálogo | `doPost` → autorización/normalización → `doPostInternal_`; Inbox delega en InboxConversations |
| ADMIN | `JS/Services/admin.js` | ping, backup/restore, mantenimiento, logos, campos/imágenes, inventario Drive, reconciliación, organizer, migraciones, auditorías y telemetría | `doPost` → control de actor/rol → `doPostInternal_` |
| CATALOG | `JS/Services/catalog.js` | getCatalogData, getDropdownData, getNavigationData, getVehicleProjection, getContributionCandidates; getSuggestion solo compatibilidad | `doPost` → switch de lecturas |
| UTILITIES | `JS/Services/Utilities.js` | migrateTimestamps | `doPost` → `migrateTimestamps` → `migrateTimestampsSafe_` |
| COORDINATOR | `JS/Services/Coordinator.js` | acquire, release, validate, publishCatalogChange(s), getCatalogChanges, register/sync/revoke sessions, validateSessionContext, invalidateSessionActorCaches, getServiceTraffic | `doPost` → `handleRequest`; feed público mediante `doGet` |

Las acciones exactas y su asignación permanecen en `ACTION_TO_SERVICE_MAP`; esta tabla es una guía de lectura, no una segunda fuente de ruteo.

## 3. Dependencias servidor → servidor confirmadas

| Origen | Destino | Operación/consumidor | Propósito y costo visible |
|---|---|---|---|
| AUTH | COORDINATOR | `withSharedMutationLease_` en mutaciones de sesión/cuenta | Adquisición y liberación de lease; normalmente 2 requests al Coordinator por acción. |
| AUTH | COORDINATOR | `getCachedSharedSessionActor_` en clearSensitiveLogs y benchmarkPasswordKdf | Cache miss requiere validateSessionContext; hit local evita viaje. |
| USERS | COORDINATOR | createUser con lease; getUsers/updateProfile con actor cacheado | Alta coordinada; lecturas/perfil consultan Coordinator solo en cache miss. |
| WRITE | COORDINATOR | `getCachedSharedSessionActor_` para mutaciones protegidas | Cache hit local; miss valida sesión/epoch remotamente. |
| WRITE | COORDINATOR | publicación de catálogo tras mutación confirmada | Publica reset/delta después del read-back; cantidad por flujo requiere medición. |
| FEEDBACK | COORDINATOR | actor cacheado, publicación de cambios y feed | Cache miss de actor; ciertas mutaciones publican reset/delta; getCatalogChanges consulta feed. |
| ADMIN | WRITE | allocateVehicleId, freezeCortesIds y otras escrituras delegadas | POST interno; WRITE conserva autoridad de asignación de IDs. |
| ADMIN | CATALOG | proyecciones/candidatos y lecturas de catálogo | POST interno para consultas dirigidas; revisar payload y lecturas por acción. |
| ADMIN | COORDINATOR | actor/leases, publicaciones y telemetría | Cache miss/operaciones coordinadas y publicación posterior. |
| UTILITIES | COORDINATOR | lease de migrateTimestamps | Operación administrativa protegida; luego usa ScriptLock local. |
| COORDINATOR | servicios | invalidación de caché y sincronización/revocación | Llamadas internas a servicios autorizados usando URLs/secretos de ScriptProperties. |

No se identificó una llamada frontend directa a Coordinator. La URL no forma parte de `API_ENDPOINTS`; la resuelve el cliente compartido desde ScriptProperties.

## 4. Inventario estático de transferencias externas

Conteo de ocurrencias en archivos activos, no requests por interacción:

| Archivo | `UrlFetchApp.fetch` | `fetchAll` | Uso visible |
|---|---:|---:|---|
| Auth.js | 0 | 0 | Coordinación encapsulada en SharedMutationClient |
| users.js | 0 | 0 | Sin fetch directo |
| write.js | 1 | 0 | Recuperación/validación de contenido de imagen mediante URL |
| feedback.js | 1 | 0 | YouTube API |
| admin.js | 7 | 1 | WRITE, CATALOG, imágenes por URL, Drive API, storage quota y fetch por lotes |
| catalog.js | 0 | 0 | Sin fetch directo |
| Utilities.js | 0 | 0 | Coordinación encapsulada |
| Coordinator.js | 1 | 1 | Envío a servicios y fan-out |
| SharedMutationClient.js | 10 adaptadores | 0 | Wrappers que inyectan UrlFetchApp.fetch; no se ejecutan todos por operación |

Los conteos de SharedMutationClient corresponden a adaptadores, no a diez requests por usuario. El número real depende de la ruta, cache hit/miss, lease, publicación y reintentos.

## 5. Persistencia y responsabilidades por servicio
- AUTH y USERS comparten `Users` y `ActiveSessions`; AUTH también administra `Logs`. AUTH concentra login, sesiones, contraseñas y revocación; USERS concentra listado, alta y perfil. No fusionar responsabilidades sin revisar contratos y §15 de normas.
- WRITE opera sobre `Cortes`, ledgers de idempotencia/reserva y Drive para imágenes. Las mutaciones publican cambios después de confirmar el resultado; WRITE es autoridad de IDs.
- FEEDBACK opera sobre reportes, likes, sugerencias, PyS, tutoriales, vídeo, Inbox y actividad; algunas mutaciones publican cambios de catálogo. Inbox está separado en `InboxConversations.js`, pero se enruta por FEEDBACK.
- ADMIN accede a Sheets/Drive para mantenimiento, inventario, auditorías y operaciones destructivas; delega IDs/escrituras específicas a WRITE y consultas/proyecciones a CATALOG.
- CATALOG lee proyecciones de Cortes, logos, tutoriales y Relay según acción. Las consultas dirigidas para ADMIN conservan dependencias globales necesarias para VIN/opId/conflictos.
- UTILITIES ejecuta una migración protegida sobre Cortes/Hoja 1 con staging/backup y lock local.
- COORDINATOR mantiene leases, contexto de sesión, invalidación de cachés y feed incremental/reset.

## 6. Línea base: confirmado y pendiente

**Confirmado por inspección estática**
- Cada invocación normal de routeAction realiza un POST al endpoint asignado.
- Los reintentos son requests adicionales; las políticas no son uniformes.
- La telemetría del navegador es local/efímera y no añade tráfico.
- Cache hit de actor evita validateSessionContext; cache miss la requiere.
- Una lease compartida implica adquisición y liberación remotas, salvo token anidado.
- Publicaciones de catálogo generan viajes adicionales a Coordinator tras ciertas mutaciones.
- ADMIN tiene dependencias internas WRITE/CATALOG y transferencias de Drive/Google APIs.

**No medido todavía**
- Requests reales por interacción/pantalla.
- Bytes de request/response y de imágenes/vídeos.
- Latencia p50/p95 por endpoint y etapa.
- Operaciones y duración real de Spreadsheet/Drive.
- Cache hit/miss, contención/espera de leases y reintentos reales.
- Tiempo de cliente, transferencia, Apps Script, Drive y render por separado.

No se presenta inspección estática como benchmark. P0.2 requiere medición reproducible en navegador y entorno Beta autorizado con recursos aislados. No se consultaron ni modificaron deployments, endpoints, propiedades, secretos, hojas ni archivos productivos.

## 7. Siguientes pasos
1. Completar matriz por acción y consumidor frontend, empezando por AUTH/USERS y pantallas de aportes.
2. Instrumentar medición local por interacción sin persistencia ni request adicional; medir bytes cuando el navegador lo permita.
3. Añadir correlación solo en harness local/Beta, sin tokens ni datos personales.
4. Ejecutar escenarios de línea base en Beta aislada antes de retirar leases, reintentos, publicaciones o lecturas.
5. Priorizar consumidores AUTH/USERS y refreshes de catálogo posteriores a edición.
