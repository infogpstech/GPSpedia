# Inventario inicial de dependencias para la migración

**Rama:** `GPSpedia2.2.5_work`  
**Base:** `GPSpedia2.2.5`  
**Estado:** INVENTARIO ESTÁTICO COMPLETADO — MIG-001 COMPLETADA CON VALIDACIÓN DIFERIDA (2026-11-23). La evidencia y los límites pendientes de Beta están consolidados en §19.

## 1. Alcance funcional medido

El mapa `ACTION_TO_SERVICE_MAP` de `JS/Frontend/api-config.js` contiene **120 acciones**, distribuidas así:

- **AUTH:** 15
- **CATALOG:** 5
- **WRITE:** 9
- **USERS:** 3
- **FEEDBACK:** 41
- **UTILITIES:** 1
- **ADMIN:** 46

El inventario completo de acciones canónicas es:

### AUTH (15)
- `login`
- `requestPasswordRecovery`
- `completePasswordRecovery`
- `validateSession`
- `touchSession`
- `acceptTerms`
- `changePassword`
- `resetUserPassword`
- `logout`
- `migrateLegacyPasswords`
- `benchmarkPasswordKdf`
- `updateUser`
- `deleteUser`
- `resetUserSessions`
- `clearSensitiveLogs`

### CATALOG (5)
- `getNavigationData`
- `getCatalogData`
- `getDropdownData`
- `getVehicleProjection`
- `getContributionCandidates`

### WRITE (9)
- `getSuggestion`
- `checkVehicle`
- `checkOperation`
- `addOrUpdateCut`
- `addSupplementaryInfo`
- `checkVinDuplicate`
- `addVinToVehicle`
- `allocateVehicleId`
- `freezeCortesIds`

### USERS (3)
- `getUsers`
- `createUser`
- `updateProfile`

### FEEDBACK (41)
- `getCatalogChanges`
- `recordLike`
- `recordVehicleView`
- `reportProblem`
- `sendContactForm`
- `addTutorial`
- `suggestYear`
- `suggestCutChange`
- `getPysData`
- `addProblem`
- `addSolution`
- `addPrevention`
- `addVehicleToProblem`
- `getFeedbackItems`
- `getMyProblemReports`
- `replyToFeedback`
- `markAsResolved`
- `getActivityLogs`
- `deleteFeedbackItem`
- `clearActivityLogs`
- `getInboxRecipients`
- `notifyDevelopersDriveCritical`
- `getInboxConversations`
- `getInboxMessages`
- `createInboxConversation`
- `sendInboxMessage`
- `markInboxRead`
- `markInboxUnread`
- `deleteInboxConversation`
- `archiveInboxConversation`
- `closeInboxConversation`
- `initYouTubeUpload`
- `getVideoApprovalByOperation`
- `submitVideoForApproval`
- `approveVideo`
- `rejectVideo`
- `removeVehicleFromProblem`
- `updatePysItem`
- `updateTutorialItem`
- `getRichTextMode`
- `setRichTextMode`

### UTILITIES (1)
- `migrateTimestamps`

### ADMIN (46)
- `ping`
- `migrateCortesOperationIds`
- `migrateVehicleContributionsSchema`
- `getVehicleContributionCandidates`
- `resolveVehicleContributionCandidate`
- `migrateIdentifiers`
- `rollbackIdentifiers`
- `reconcilePendingImageUploads`
- `backupDatabase`
- `backupDrive`
- `restoreDatabase`
- `restoreDrive`
- `reorganizeDatabase`
- `normalizeImages`
- `organizePrimaryVehicleImages`
- `restoreAllTrashedImages`
- `addLogo`
- `auditIdentifiers`
- `freezeIdentifierFormulas`
- `createSheet`
- `addColumn`
- `driveCommand`
- `updateVehicleField`
- `uploadAdminImage`
- `getAdminImageUploadStatus`
- `getReplacedImages`
- `previewCortesImageReconciliation`
- `previewCortesImageOrganizer`
- `getCortesImageOrganizerOperations`
- `applyCortesImageOrganizer`
- `rollbackCortesImageOrganizer`
- `applyCortesImageReconciliation`
- `migrateReplacedImagesSchema`
- `getDriveStorage`
- `recoverReplacedImage`
- `deleteReplacedImage`
- `restoreReplacedImageFromTrash`
- `permanentlyDeleteReplacedImage`
- `markReplacedImageInUse`
- `auditDriveImagesInCortes`
- `saveUnusedImagesInventory`
- `getServiceTraffic`
- `getCortesImageFolders`
- `createCortesImageFolder`
- `moveReplacedImage`
- `getReplacedImageDownloadUrl`

Este listado es el contrato funcional que debe conservarse. Las acciones manuales/operativas sin consumidor UI, rutas de compatibilidad y acciones internas también deben identificarse antes de retirar endpoints.

## 2. Dependencias entre proyectos observadas

### 2.1 Coordinación central

`JS/Services/Coordinator.js` implementa, entre otras, estas capacidades:

- Adquisición, validación y liberación de leases por servicio/operación.
- Políticas de recursos compartidos y exclusión de operaciones concurrentes.
- Registro/sincronización de sesiones y contexto de autenticación por usuario.
- Índice de token → usuario y epoch/revocación de sesiones.
- Validación del contexto compartido.
- Invalidación de cachés locales de actores en USERS, WRITE, FEEDBACK y ADMIN.
- Precarga de cachés de actores en esos servicios después del login.
- Publicación/lectura del feed incremental de cambios del catálogo.
- Telemetría agregada best-effort.

No se puede eliminar Coordinator hasta asignar sustituto verificable a cada capacidad que siga siendo necesaria.

### 2.2 SharedMutationClient

`JS/Services/SharedMutationClient.js` usa `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET` en ScriptProperties y encapsula llamadas remotas para:

- leases (acquire/release/validate);
- publicación/lectura de cambios de catálogo;
- registro, sincronización, revocación y validación de sesiones;
- invalidación/precarga de cachés de actores.

La migración debe retirar las copias de los servicios consumidores, no solo borrar el archivo común del repositorio.

### 2.3 Llamadas backend → backend

En `JS/Services/admin.js` se observaron llamadas directas:

- ADMIN → WRITE mediante `callWriteServiceAction`, usado por funciones de administración que delegan operaciones de cortes/IDs.
- ADMIN → CATALOG mediante `getVehicleProjection`, para recuperar una proyección antes de completar una operación de imagen.
- ADMIN → CATALOG mediante `getContributionCandidates`, incluyendo un modo privilegiado de inventario de imágenes.

ADMIN declara además constantes URL para AUTH, USERS y FEEDBACK; el inventario de referencias debe confirmar si están obsoletas antes de retirarlas.

En `JS/Services/Coordinator.js` se observó fan-out remoto a USERS, WRITE, FEEDBACK y ADMIN para precalentar e invalidar cachés de sesión. Ese fan-out es parte del flujo actual de login/revocación.

No contar como dependencias entre servicios las llamadas a Google Drive API, YouTube API ni a recursos externos.

### 2.4 Configuración y secretos encontrados

- `JS/Frontend/api-config.js`: contiene las URLs de AUTH, CATALOG, WRITE, USERS, FEEDBACK, UTILITIES y ADMIN, además del mapa de acciones.
- AUTH: `GPSpedia_COORDINATOR_URL`, `GPSpedia_COORDINATOR_SECRET`; también inicializa automáticamente `GPSpedia_PASSWORD_RECOVERY_SECRET_V1` para recuperación de contraseñas.
- USERS, WRITE, FEEDBACK, UTILITIES y ADMIN: configuración local de Coordinator mediante propiedades de script.
- ADMIN y CATALOG comparten `GPSpedia_CATALOG_TRAFFIC_SECRET` para una consulta interna de metadatos de inventario de imágenes.
- COORDINATOR: URLs de servicios y secretos individuales en propiedades de script, además de contextos/índices/leases/telemetría persistidos en propiedades.

El nuevo diseño debe eliminar la configuración manual de interconexión. Los secretos de autenticación y recuperación no deben trasladarse al navegador ni publicarse en la hoja de endpoints.

## 3. Operaciones con concurrencia o consistencia compartida

La revisión estática inicial encontró estas rutas que requieren análisis específico:

| Servicio | Operación/recurso | Dependencia actual |
|---|---|---|
| AUTH | `deleteUser` | Lease sobre identidad/sesiones y revocación remota antes de desactivar cuenta |
| USERS | `createUser` | Lease para excluir creación frente a eliminación/cambios de identidad |
| UTILITIES | `migrateTimestamps` | Lease de mantenimiento sobre Users, ActiveSessions, Cortes, Drive y hojas temporales |
| ADMIN | `saveUnusedImagesInventory` | Lease de inventario de imágenes |
| ADMIN | `createCortesImageFolder` | Lease para evitar colisiones/duplicados en creación de carpetas |
| ADMIN | `auditDriveImagesInCortes` | Lease de auditoría/operación sobre recursos compartidos |
| AUTH | logout, cambio/restablecimiento de contraseña, reset de sesiones y cambio de rol | Invalidación de actor/cachés remotas y revocación central |
| AUTH | login | Sincronización de sesiones y precarga de cachés de actores |
| CATALOG/FEEDBACK | feed incremental de cambios | Publicación/lectura de eventos coordinada para refresco del catálogo |

La tabla es una lista de riesgos prioritarios, no una declaración de que todas las acciones deban conservar una lease. La Fase 0 debe inspeccionar las políticas exactas, consumidores y pruebas antes de proponer sustitutos.

## 4. Riesgos de migración que deben probarse

1. Una sesión revocada no puede seguir ejecutando acciones protegidas en ningún servicio.
2. Un cambio de rol debe impedir que un actor cacheado conserve permisos anteriores.
3. La eliminación de cuenta no puede dejar una cuenta activa con sesiones utilizables ni perder datos por un fallo intermedio.
4. Dos altas concurrentes no pueden crear usuarios duplicados.
5. Las operaciones de mantenimiento no pueden solaparse de forma que corrompan hojas o Drive.
6. Las mutaciones de ADMIN que hoy consultan WRITE/CATALOG deben conservar precondiciones, snapshots, idempotencia y compensación.
7. La publicación de cambios del catálogo debe seguir llegando a los clientes sin forzar recargas ni invalidar la caché local indebidamente.
8. La configuración debe tolerar endpoints incompletos o temporalmente inaccesibles sin enrutar acciones a un servicio equivocado.
9. El frontend no debe convertirse en autoridad de roles, secretos, sesiones ni permisos.
10. Los flujos de subida/aprobación de YouTube, Inbox, feedback, PyS, tutoriales, imágenes, backups, restauración, Drive y migraciones deben permanecer disponibles.

## 5. Siguiente trabajo de inventario

- Extraer los routers completos y contrastar cada acción con su handler y consumidores.
- Revisar referencias a las funciones internas de SharedMutation en cada servicio.
- Clasificar todas las operaciones de Coordinator por recurso protegido y por necesidad real.
- Identificar pruebas que ya cubren cada capacidad y señalar brechas.
- Elaborar el orden de migración que permita probar cada servicio antes de retirar dependencias.


---

## 6. Inventario de capacidades que deben conservarse

**Importante:** las 120 acciones anteriores son únicamente el mapa explícito del frontend. No son el inventario completo de la plataforma. La siguiente matriz amplía el alcance para que las funciones visuales, administrativas, manuales e internas también tengan pruebas de paridad.

| ID | Área funcional | Capacidades que deben mantenerse | Evidencia/prueba de paridad requerida |
|---|---|---|---|
| CAP-01 | Catálogo y navegación | Navegación, búsqueda, fichas, versiones, años, cortes, proyecciones, sugerencias y relaciones | Snapshot/delta, búsqueda, apertura de detalle, navegación y resultados |
| CAP-02 | Modelos y contribuciones | Crear/editar modelos, cortes, identificadores, contribuciones, revisión y resolución de candidatos | Crear, actualizar, consultar, resolver, duplicados y permisos |
| CAP-03 | VIN | Registrar, buscar, validar duplicados, colecciones por equipamiento y privacidad | Alta, duplicado, búsqueda, reglas de longitud y persistencia |
| CAP-04 | Imágenes | Subir, previsualizar, transformar, resolver, reemplazar, recuperar, borrar, inventariar, reconciliar y organizar | Carga real, ledger, SHA-256, MIME, límite, variantes, transparencia y recuperación |
| CAP-05 | Vídeos | YouTube resumable upload, pausa, reanudación, metadatos, aprobación/rechazo, asociación y reproducción | Transferencia real, estado, reanudar, aprobar, rechazar y reproducir |
| CAP-06 | PyS | Problemas, soluciones, prevención, asociación/desasociación de vehículos, edición y reproducción | CRUD, relaciones bidireccionales, límites y navegación |
| CAP-07 | Tutoriales | Alta, edición, consulta, imagen/vídeo y aprobación | CRUD, asociaciones, permisos y reproducción |
| CAP-08 | Feedback | Reportes, sugerencias, contacto, likes, vistas, comentarios, estados y logs | Envíos, lecturas, estados, límites y permisos |
| CAP-09 | Inbox | Destinatarios, conversaciones, mensajes, respuestas, plantillas, categorías, borradores, filtros, paginación, archivado, cierre y eliminación | Flujo completo por rol, contador, no leídos, búsqueda y persistencia |
| CAP-10 | Usuarios e identidad | Login/logout, perfiles, altas, cambios, roles, recuperación, términos, sesiones y bloqueo por intentos | Flujos de identidad, permisos, expiración y revocación |
| CAP-11 | Drive | Navegar, crear carpetas, mover archivos, restaurar, borrar, descargar, auditar e inventariar | Comandos, permisos, integridad y operaciones destructivas |
| CAP-12 | Backups y restauración | Backup/restauración de Spreadsheet y Drive, previsualización y recuperación | Backup real, restauración en recurso aislado, consistencia y rollback |
| CAP-13 | Administración de datos | Crear hojas/columnas, fórmulas, migraciones, identificadores, reorganización y normalización | Simulación, confirmación, rollback y esquemas |
| CAP-14 | Estado de servicios | Ping, conectividad, disponibilidad, errores y latencia en ms | Escaneo real de todos los endpoints y visualización correcta |
| CAP-15 | Métricas | Tráfico por servicio, almacenamiento, métricas de usuarios, actividad, auditoría y logs | Valores, rangos, permisos, filtros y actualización |
| CAP-16 | Herramientas de desarrollador | Terminal, consola, comandos Drive, caché local, purgado y utilidades de diagnóstico | Comandos, navegación, permisos y resultados |
| CAP-17 | Experiencia de usuario | PWA, modo oscuro, caché local, IndexedDB, arranque cache-first, estados y errores localizados | Caché fría/caliente, offline parcial y no bloqueo entre módulos |
| CAP-18 | Impresión y utilidades | Ficha imprimible, paginación, QR local y exportaciones | Impresión carta, QR y enlaces permitidos |
| CAP-19 | Procesos auxiliares | Funciones internas, acciones manuales, compatibilidad, trabajos programados y migraciones históricas | Inventario de invocadores, pruebas específicas y ejecución controlada |

### 6.1 Capacidades técnicas especiales que no deben desaparecer

- **Imágenes:** el ledger `ImageUploadLedger`, verificación posterior, SHA-256, límite de 10 MB, variantes 300/800/1600, conservación de PNG/transparencia, ObjectURL/IndexedDB, Lightbox y reconciliación.
- **Vídeos:** YouTube Resumable Upload directo, persistencia de sesión reanudable en IndexedDB, pausa al cerrar modal, aprobación en Inbox y asociación posterior al aprobar.
- **Catálogo:** snapshot inicial, cursor/deltas, caché IndexedDB, actualización silenciosa y continuidad cuando un módulo no responde.
- **VIN:** almacenamiento de colección JSON en columna VIN, prefijo procesado, detección de duplicados y no alterar timestamp al agregar VIN.
- **Drive:** comandos de terminal, auditorías, organización de carpetas, inventario de imágenes, archivos reemplazados, restauración y límites de borrado.
- **Inbox:** borradores recuperables, estados separados, mensajes múltiples, plantillas y paginación.
- **Métricas:** diagnóstico de salud de microservicios, latencia, tráfico, almacenamiento, usuarios y actividad.
- **Administración:** backup/restauración, migraciones de esquema, IDs, hojas, columnas, logs y purgado autorizado.

### 6.2 Requisito de trazabilidad

Cada capacidad CAP debe vincularse con:
1. uno o varios controles frontend;
2. las acciones del mapa (si existen);
3. el handler real de Apps Script;
4. hojas, carpetas, APIs y formatos de datos que utiliza;
5. matriz RBAC;
6. pruebas existentes y pruebas nuevas;
7. tarea MIG responsable;
8. prueba de paridad anterior/nueva.

No marcar una capacidad como cubierta por el simple hecho de que su acción aparezca en `ACTION_TO_SERVICE_MAP`.

## 7. Reglas de configuración objetivo

La búsqueda global debe demostrar que no quedan:
- propiedades de Script/User/Document usadas para configuración de GPSpedia;
- URLs de otros servicios Apps Script en archivos backend;
- IDs de Spreadsheet/Drive almacenados en servicios;
- secretos compartidos de Coordinator/SharedMutation o secretos manuales entre proyectos;
- llamadas backend→backend a endpoints GPSpedia.

La Spreadsheet será la fuente de configuración y el frontend el único coordinador. La forma de bootstrap/acceso a la Spreadsheet se considera un spike técnico obligatorio; no se permite resolverlo escondiendo un ID o una URL en otro archivo backend.

Los tokens OAuth administrados por Google para integraciones externas no se consideran claves secretas compartidas de interconexión y nunca se exponen al navegador. La transferencia directa desde frontend a Drive/YouTube debe demostrar equivalencia de identidad, permisos y propiedad antes de sustituir los flujos actuales.

## 8. Estado de inventario

- Las 120 acciones del mapa frontend están enumeradas y reconciliadas con sus routers y handlers en §§1 y 9.
- Las 19 capacidades CAP están vinculadas a consumidores, servicios, datos y pruebas representativas en §19.6.
- Las rutas internas, acciones manuales, compatibilidades, RBAC, datos, integraciones y pruebas están inventariados en §§9–19.
- MIG-001 está **COMPLETADA CON VALIDACIÓN DIFERIDA**. MIG-002 a MIG-005 siguen siendo tareas independientes del backlog.
- Ninguna función se ha retirado ni se autoriza retirarla por aparecer duplicada, sin consumidor aparente o fuera del mapa frontend.


## 9. Trazabilidad inicial de acciones → handlers → consumidores (2026-11-23)

La siguiente tabla se extrajo de `ACTION_TO_SERVICE_MAP`, los dispatchers reales y los módulos consumidores de la rama `GPSpedia2.2.5_work`. El consumidor se identifica por llamada directa, wrapper o llamada backend-a-backend. La ausencia de consumidor localizado **no autoriza eliminar una acción**: debe determinarse si es mantenimiento manual, llamada indirecta, integración externa o compatibilidad histórica.

| Acción | Servicio canónico | Handler / ejecución | Consumidor localizado |
|---|---|---|---|
| `login` | AUTH | `handleLogin` | api-config.js |
| `requestPasswordRecovery` | AUTH | `handleRequestPasswordRecovery` | auth.js |
| `completePasswordRecovery` | AUTH | `handleCompletePasswordRecovery` | auth.js |
| `validateSession` | AUTH | `handleValidateSession` | api-config.js, users.html |
| `touchSession` | AUTH | `handleTouchSession` | No localizado en consumidores inspeccionados; clasificar como manual/interno/legado sin retirarlo |
| `acceptTerms` | AUTH | `handleAcceptTerms` | ui.js |
| `changePassword` | AUTH | `handleChangePassword` | users.html |
| `resetUserPassword` | AUTH | `handleResetUserPassword` | users.html |
| `logout` | AUTH | `handleLogout` | auth.js, users.html |
| `migrateLegacyPasswords` | AUTH | `handleMigrateLegacyPasswords` | ui.js |
| `benchmarkPasswordKdf` | AUTH | `handleBenchmarkPasswordKdf_` | No localizado en consumidores inspeccionados; clasificar como manual/interno/legado sin retirarlo |
| `getNavigationData` | CATALOG | `handleGetNavigationData` | No localizado en consumidores inspeccionados; clasificar como manual/interno/legado sin retirarlo |
| `getCatalogData` | CATALOG | `handleGetCatalogData` | api-config.js, ui.js |
| `getDropdownData` | CATALOG | `handleGetDropdownData` | add_cortes.html, ui.js |
| `getVehicleProjection` | CATALOG | `handleGetVehicleProjection_` | add_cortes.html, admin.js → CATALOG (servidor a servidor) |
| `getContributionCandidates` | CATALOG | `handleGetContributionCandidates_` | admin.js → CATALOG (servidor a servidor; candidatos/proyección de aportes) |
| `getSuggestion` | WRITE | `handleGetSuggestion` | add_cortes.html |
| `checkVehicle` | WRITE | `handleCheckVehicle` | add_cortes.html |
| `checkOperation` | WRITE | `handleCheckOperation` | add_cortes.html |
| `addOrUpdateCut` | WRITE | `handleAddOrUpdateCut` | add_cortes.html, ui.js |
| `addSupplementaryInfo` | WRITE | `handleAddSupplementaryInfo` | add_cortes.html, ui.js |
| `checkVinDuplicate` | WRITE | `handleCheckVinDuplicate` | add_cortes.html, ui.js |
| `addVinToVehicle` | WRITE | `handleAddVinToVehicle` | ui.js |
| `allocateVehicleId` | WRITE | `handleAllocateVehicleId` | admin.js → WRITE (servidor a servidor) |
| `freezeCortesIds` | WRITE | `handleFreezeCortesIds` | admin.js → WRITE (servidor a servidor) |
| `getUsers` | USERS | `handleGetUsers` | users.html |
| `createUser` | USERS | `handleCreateUser` | users.html |
| `updateUser` | AUTH | `handleUpdateUser` | users.html |
| `deleteUser` | AUTH | `handleDeleteUser` | users.html |
| `updateProfile` | USERS | `handleUpdateProfile` | users.html |
| `resetUserSessions` | AUTH | `handleResetUserSessions` | users.html |
| `getCatalogChanges` | FEEDBACK | `handleGetCatalogChanges` | auth.js → api-config.js (GET catalogFeed=1 → FEEDBACK/Coordinator) |
| `recordLike` | FEEDBACK | `handleRecordLike` | api-config.js |
| `recordVehicleView` | FEEDBACK | `handleRecordVehicleView` | api-config.js |
| `reportProblem` | FEEDBACK | `handleReportProblem` | api-config.js |
| `sendContactForm` | FEEDBACK | `handleSendContactForm` | api-config.js, main.js |
| `addTutorial` | FEEDBACK | `handleAddTutorial` | api-config.js |
| `suggestYear` | FEEDBACK | `handleSuggestYear` | api-config.js |
| `suggestCutChange` | FEEDBACK | `handleSuggestCutChange` | api-config.js |
| `getPysData` | FEEDBACK | `handleGetPysData` | pys-data.js |
| `addProblem` | FEEDBACK | `handleAddProblem` | ui.js |
| `addSolution` | FEEDBACK | `handleAddSolution` | ui.js |
| `addPrevention` | FEEDBACK | `handleAddPrevention` | ui.js |
| `addVehicleToProblem` | FEEDBACK | `handleAddVehicleToProblem` | ui.js |
| `getFeedbackItems` | FEEDBACK | `handleGetFeedbackItems` | api-config.js |
| `getMyProblemReports` | FEEDBACK | `handleGetMyProblemReports` | ui.js |
| `replyToFeedback` | FEEDBACK | `handleReplyToFeedback` | api-config.js |
| `markAsResolved` | FEEDBACK | `handleMarkAsResolved` | api-config.js, add_cortes.html |
| `getActivityLogs` | FEEDBACK | `handleGetActivityLogs` | api-config.js |
| `deleteFeedbackItem` | FEEDBACK | `handleDeleteFeedbackItem` | api-config.js |
| `clearActivityLogs` | FEEDBACK | `handleClearActivityLogs` | api-config.js |
| `clearSensitiveLogs` | AUTH | `handleClearSensitiveLogs` | api-config.js |
| `getInboxRecipients` | FEEDBACK | `handleGetInboxRecipients` | api-config.js |
| `notifyDevelopersDriveCritical` | FEEDBACK | `handleNotifyDevelopersDriveCritical` | ui.js |
| `getInboxConversations` | FEEDBACK | `handleGetInboxConversations` | api-config.js |
| `getInboxMessages` | FEEDBACK | `handleGetInboxMessages` | api-config.js |
| `createInboxConversation` | FEEDBACK | `handleCreateInboxConversation` | api-config.js |
| `sendInboxMessage` | FEEDBACK | `handleSendInboxMessage` | api-config.js |
| `markInboxRead` | FEEDBACK | `handleMarkInboxRead` | api-config.js |
| `markInboxUnread` | FEEDBACK | `handleMarkInboxUnread` | No localizado en consumidores inspeccionados; clasificar como manual/interno/legado sin retirarlo |
| `deleteInboxConversation` | FEEDBACK | `handleDeleteInboxConversation` | No localizado en consumidores inspeccionados; clasificar como manual/interno/legado sin retirarlo |
| `archiveInboxConversation` | FEEDBACK | `handleArchiveInboxConversation` | api-config.js |
| `closeInboxConversation` | FEEDBACK | `handleCloseInboxConversation` | api-config.js |
| `initYouTubeUpload` | FEEDBACK | `handleInitYouTubeUpload` | youtubeUpload.js |
| `getVideoApprovalByOperation` | FEEDBACK | `handleGetVideoApprovalByOperation` | youtubeUpload.js |
| `submitVideoForApproval` | FEEDBACK | `handleSubmitVideoForApproval` | ui.js, youtubeUpload.js |
| `approveVideo` | FEEDBACK | `handleApproveVideo` | api-config.js |
| `rejectVideo` | FEEDBACK | `handleRejectVideo` | api-config.js |
| `removeVehicleFromProblem` | FEEDBACK | `handleRemoveVehicleFromProblem` | ui.js |
| `updatePysItem` | FEEDBACK | `handleUpdatePysItem` | ui.js |
| `updateTutorialItem` | FEEDBACK | `handleUpdateTutorialItem` | ui.js |
| `migrateTimestamps` | UTILITIES | `migrateTimestamps` | No localizado en consumidores inspeccionados; clasificar como manual/interno/legado sin retirarlo |
| `getRichTextMode` | FEEDBACK | `handleGetRichTextMode` | api-config.js |
| `setRichTextMode` | FEEDBACK | `handleSetRichTextMode` | api-config.js |
| `ping` | ADMIN | `respuesta inline` | ui.js |
| `migrateCortesOperationIds` | ADMIN | `handleMigrateCortesOperationIds` | ui.js |
| `migrateVehicleContributionsSchema` | ADMIN | `handleMigrateVehicleContributionsSchema` | No localizado en consumidores inspeccionados; clasificar como manual/interno/legado sin retirarlo |
| `getVehicleContributionCandidates` | ADMIN | `handleGetVehicleContributionCandidates_` | ui.js |
| `resolveVehicleContributionCandidate` | ADMIN | `handleResolveVehicleContributionCandidate_` | ui.js |
| `migrateIdentifiers` | ADMIN | `handleMigrateIdentifiers_` | No localizado en consumidores inspeccionados; clasificar como manual/interno/legado sin retirarlo |
| `rollbackIdentifiers` | ADMIN | `handleRollbackIdentifiers_` | No localizado en consumidores inspeccionados; clasificar como manual/interno/legado sin retirarlo |
| `reconcilePendingImageUploads` | ADMIN | `handleReconcilePendingImageUploads` | No localizado en consumidores inspeccionados; clasificar como manual/interno/legado sin retirarlo |
| `backupDatabase` | ADMIN | `handleBackupDatabase` | ui.js |
| `backupDrive` | ADMIN | `handleBackupDrive` | ui.js (createBackup) |
| `restoreDatabase` | ADMIN | `handleRestoreDatabase` | ui.js (restoreBackup) |
| `restoreDrive` | ADMIN | `handleRestoreDrive` | ui.js (restoreBackup) |
| `reorganizeDatabase` | ADMIN | `handleReorganizeDatabase` | ui.js |
| `normalizeImages` | ADMIN | `handleNormalizeImages` | ui.js |
| `organizePrimaryVehicleImages` | ADMIN | `handleOrganizePrimaryVehicleImages` | ui.js |
| `restoreAllTrashedImages` | ADMIN | `validateAndRestoreAllTrashedImagesInSpreadsheet` | ui.js |
| `addLogo` | ADMIN | `handleAddLogo` | ui.js |
| `auditIdentifiers` | ADMIN | `handleAuditIdentifiers` | ui.js |
| `freezeIdentifierFormulas` | ADMIN | `handleFreezeIdentifierFormulas_` | ui.js |
| `createSheet` | ADMIN | `handleCreateSheet` | No localizado en consumidores inspeccionados; clasificar como manual/interno/legado sin retirarlo |
| `addColumn` | ADMIN | `handleAddColumn` | No localizado en consumidores inspeccionados; clasificar como manual/interno/legado sin retirarlo |
| `driveCommand` | ADMIN | `handleDriveCommand` | ui.js |
| `updateVehicleField` | ADMIN | `handleUpdateVehicleField` | ui.js |
| `uploadAdminImage` | ADMIN | `handleUploadAdminImage` | ui.js |
| `getAdminImageUploadStatus` | ADMIN | `handleGetAdminImageUploadStatus` | ui.js |
| `getReplacedImages` | ADMIN | `handleGetReplacedImages` | ui.js |
| `previewCortesImageReconciliation` | ADMIN | `handlePreviewCortesImageReconciliation_` | ui.js |
| `previewCortesImageOrganizer` | ADMIN | `handlePreviewCortesImageOrganizer_` | ui.js |
| `getCortesImageOrganizerOperations` | ADMIN | `handleGetCortesImageOrganizerOperations_` | ui.js |
| `applyCortesImageOrganizer` | ADMIN | `handleApplyCortesImageOrganizer_` | ui.js |
| `rollbackCortesImageOrganizer` | ADMIN | `handleRollbackCortesImageOrganizer_` | ui.js |
| `applyCortesImageReconciliation` | ADMIN | `handleApplyCortesImageReconciliation_` | ui.js |
| `migrateReplacedImagesSchema` | ADMIN | `handleMigrateReplacedImagesSchema` | ui.js |
| `getDriveStorage` | ADMIN | `handleGetDriveStorage` | ui.js |
| `recoverReplacedImage` | ADMIN | `handleRecoverReplacedImage` | ui.js |
| `deleteReplacedImage` | ADMIN | `handleDeleteReplacedImage` | ui.js |
| `restoreReplacedImageFromTrash` | ADMIN | `handleRestoreReplacedImageFromTrash` | ui.js |
| `permanentlyDeleteReplacedImage` | ADMIN | `handlePermanentlyDeleteReplacedImage` | ui.js |
| `markReplacedImageInUse` | ADMIN | `handleMarkReplacedImageInUse` | ui.js |
| `auditDriveImagesInCortes` | ADMIN | `handleAuditDriveImagesInCortes` | ui.js |
| `saveUnusedImagesInventory` | ADMIN | `handleOrganizeUnusedImagesBatch + handleSaveUnusedImagesInventory` | ui.js |
| `getServiceTraffic` | ADMIN | `handleGetServiceTraffic_` | ui.js |
| `getCortesImageFolders` | ADMIN | `handleGetCortesImageFolders` | ui.js |
| `createCortesImageFolder` | ADMIN | `handleCreateCortesImageFolder` | ui.js |
| `moveReplacedImage` | ADMIN | `handleMoveReplacedImage` | ui.js |
| `getReplacedImageDownloadUrl` | ADMIN | `handleGetReplacedImageDownloadUrl` | ui.js |

### 9.1 Acciones sin consumidor directo localizado

En los consumidores inspeccionados no se encontró llamada directa para: `touchSession`, `benchmarkPasswordKdf`, `getNavigationData`, `markInboxUnread`, `deleteInboxConversation`, `migrateTimestamps`, `migrateVehicleContributionsSchema`, `migrateIdentifiers`, `rollbackIdentifiers`, `reconcilePendingImageUploads`, `createSheet`, `addColumn`. Algunas pueden ser operaciones internas o manuales; deben revisarse con sus invocadores backend, documentación operativa y registros antes de decidir su destino. En particular, `touchSession`, `benchmarkPasswordKdf`, `getNavigationData`, `markInboxUnread`, `deleteInboxConversation`, `migrateTimestamps`, las migraciones administrativas y `createSheet/addColumn` no se deben retirar por falta de botón visible.

### 9.2 Coordinación interna no incluida en las 120 acciones frontend

Coordinator expone 13 operaciones internas: `acquire`, `release`, `validate`, `publishCatalogChange`, `publishCatalogChanges`, `getCatalogChanges`, `registerSession`, `syncUserSessions`, `revokeSession`, `revokeUserSessions`, `validateSessionContext`, `invalidateSessionActorCaches` y `getServiceTraffic`. Se invocan desde `SharedMutationClient.js` y los servicios, no desde controles frontend.

También existen rutas internas `__invalidateSessionActorCache` y `__primeSessionActorCache` en USERS, WRITE, FEEDBACK y ADMIN. La acción pública `getCatalogChanges` conserva handler POST en FEEDBACK, pero el flujo incremental observado en frontend usa GET `catalogFeed=1` en FEEDBACK, que entrega el feed mediante Coordinator. Esta diferencia de transporte debe preservarse y documentarse durante la migración.

### 9.3 Alcance y límites de esta trazabilidad

La tabla confirma la relación inicial acción → servicio → handler y localiza consumidores en `api-config.js`, `ui.js`, `auth.js`, `main.js`, `pys-data.js`, `youtubeUpload.js`, `add_cortes.html` y `users.html`. No sustituye el inventario de payloads/respuestas, permisos por acción, hojas/columnas, archivos Drive, llamadas externas, triggers, operaciones programadas ni pruebas. MIG-001 permanece **EN PROGRESO** hasta completar esos vínculos y revisar todas las capacidades CAP-01 a CAP-19.


**Corrección de invocadores backend — 2026-11-23:** la primera extracción se centró en módulos frontend y había clasificado `getVehicleProjection` y `getContributionCandidates` como si solo tuvieran consumidor UI o ninguno. La revisión de `admin.js` confirmó llamadas directas ADMIN→CATALOG para ambas acciones; además, ADMIN→WRITE invoca `allocateVehicleId` y `freezeCortesIds`. La tabla se corrigió. Quedan **12**, no 13, acciones sin consumidor directo localizado en las fuentes frontend/backend inspeccionadas; siguen pendientes de clasificar como manuales, indirectas o históricas.


## 10. Primera matriz de autorización y RBAC por servicio (2026-11-23)

Esta matriz resume las reglas efectivas observadas en los handlers. Las decisiones de autorización se mantienen en backend; los roles visibles en frontend no sustituyen la comprobación del actor confiable.

| Servicio | Acciones / capacidades | Regla observada |
|---|---|---|
| AUTH | `login`, `requestPasswordRecovery`, `completePasswordRecovery` | Rutas públicas sujetas a validación de credenciales o código de recuperación. |
| AUTH | `validateSession`, `touchSession`, `logout` | Requieren token de sesión válido para consultar/tocar/cerrar la sesión; no equivalen a autorización por rol. |
| AUTH | `acceptTerms`, `changePassword` | Todos los roles activos: Desarrollador, Jefe, Supervisor, Técnico y Técnico exterior. Cambio de contraseña valida la identidad de la sesión. |
| AUTH | `updateUser`, `deleteUser` | Desarrollador, Jefe y Supervisor; las operaciones aplican jerarquía sobre los usuarios destino y protegen al último Desarrollador. |
| AUTH | `resetUserPassword`, `resetUserSessions`, `clearSensitiveLogs`, `migrateLegacyPasswords`, `benchmarkPasswordKdf` | Exclusivas de Desarrollador. |
| USERS | `getUsers` | Desarrollador/Jefe/Supervisor; el conjunto visible se filtra por jerarquía: Jefe ve Supervisor/Técnico y Supervisor ve Técnico. |
| USERS | `createUser` | Desarrollador puede crear todos los roles; Jefe puede crear Supervisor/Técnico; Supervisor puede crear Técnico. |
| USERS | `updateProfile` | Actualización del perfil propio, basada en el actor compartido y la fila única del usuario autenticado. |
| CATALOG | `getCatalogData`, `getDropdownData`, `getSuggestion`, `getNavigationData`, `getVehicleProjection` | Lecturas de catálogo/proyección sin regla de rol explícita en los handlers inspeccionados. |
| CATALOG | `getContributionCandidates` | Lectura de proyección; el acceso a metadatos adicionales del inventario de imágenes exige el secreto interno de CATALOG. Ese secreto es configuración y debe migrarse según MIG-003, no exponerse al frontend. |
| WRITE | `checkVehicle`, `getSuggestion`, `checkOperation`, `checkVinDuplicate` | Lecturas sin actor en el handler. `checkOperation` está expresamente diseñado sin revalidación de sesión/lease: usa `opId` aleatorio de 128 bits y devuelve solo estado/metadatos mínimos, sin la fila completa. El contrato `CheckOperationSecurity.js` confirma esa decisión; preservarla salvo cambio autorizado. |
| WRITE | `addOrUpdateCut`, `addSupplementaryInfo`, `addVinToVehicle` | Requieren actor compartido de cualquiera de los cinco roles activos. El registro silencioso de corte se limita a Desarrollador. |
| WRITE | `allocateVehicleId`, `freezeCortesIds` | Exclusivas de Desarrollador. ADMIN las invoca actualmente mediante llamadas backend→WRITE. |
| FEEDBACK | `getPysData`, `sendContactForm`, `getCatalogChanges` | Rutas públicas; el feed incremental observado usa GET `catalogFeed=1` en FEEDBACK/Coordinator. |
| FEEDBACK | `recordLike`, `reportProblem`, `addProblem`, `addSolution`, `addPrevention`, `addVehicleToProblem`, `suggestCutChange`, `getMyProblemReports`, `recordVehicleView`, operaciones ordinarias de Inbox, carga/envío de vídeo y `getRichTextMode` | Requieren sesión válida de cualquier rol, salvo la ruta anónima expresamente permitida para `suggestYear`. Inbox añade comprobaciones de participante por conversación. |
| FEEDBACK | `getFeedbackItems`, `replyToFeedback`, `markAsResolved`, `deleteFeedbackItem`, `closeInboxConversation`, `getActivityLogs` | Desarrollador/Jefe/Supervisor. |
| FEEDBACK | `removeVehicleFromProblem`, `updatePysItem`, `updateTutorialItem`, `addTutorial`, `notifyDevelopersDriveCritical`, `setRichTextMode`, `clearActivityLogs`, `approveVideo`, `rejectVideo` | Exclusivas de Desarrollador según `FEEDBACK_ACTION_PERMISSIONS`. |
| ADMIN | `ping` | Endpoint de salud sin actor de sesión. |
| ADMIN | `updateVehicleField`, `uploadAdminImage`, `getAdminImageUploadStatus` | Desarrollador/Jefe/Supervisor; la edición de campos está limitada por lista permitida y validaciones del servidor. |
| ADMIN | Resto de acciones administrativas | Exclusivas de Desarrollador antes de ejecutar el dispatcher. |
| UTILITIES | `migrateTimestamps` | Exclusiva de Desarrollador; además adquiere lease de Coordinator y ScriptLock local. |
| COORDINATOR | leases, sesión, revocación, cachés, feed y telemetría | Autentica la identidad del servicio mediante configuración compartida y aplica políticas por servicio/operación; no es una autorización directa del navegador. |

### 10.1 Jerarquía de destinatarios Inbox

La política de creación de conversaciones observada es:
- Desarrollador → todos los roles.
- Jefe → Supervisor, Técnico y Técnico exterior.
- Supervisor → Jefe.
- Técnico y Técnico exterior → Supervisor.

Las operaciones posteriores verifican que el actor sea participante; marcar como no leído y ocultar/eliminar una conversación afectan únicamente al participante correspondiente. `markInboxUnread` y `deleteInboxConversation` tienen handlers, aunque no se localizó consumidor frontend directo.

### 10.2 Límites de esta matriz

La matriz resume políticas visibles en los handlers y no sustituye pruebas por acción, comprobación de permisos en cada ruta interna ni verificación Beta. La migración debe conservar los casos públicos, la ruta anónima de sugerencia, el contrato mínimo de `checkOperation`, la jerarquía Inbox y todas las restricciones de Desarrollador/Jefe/Supervisor. MIG-001 continúa **EN PROGRESO** hasta enlazar estos permisos con payloads, respuestas, datos y pruebas de cada acción.


## 11. Recursos Spreadsheet por servicio — primera pasada (2026-11-23)

Inventario extraído de `getSheetByName`, constantes `SHEET_NAMES` y hojas creadas por los módulos. Los nombres listados son los observados en el código; pueden existir accesos dinámicos adicionales que deben verificarse antes de cerrar MIG-001.

| Servicio/módulo | Hojas identificadas | Uso/observación |
|---|---|---|
| AUTH | `Users`, `ActiveSessions`, `Logs` | Identidad, roles, sesiones, revocación y auditoría de autenticación. |
| USERS | `Users`, `ActiveSessions`, `__IdentifierSequenceConfig__` | Altas, perfiles, sesiones y secuencia/configuración de IDs de usuario. |
| WRITE | `Cortes`, `Idempotencia`, `Idempotencia_Cortes`, `Users`, `ActiveSessions`, `Relay`, `AportesVehiculo` | Escritura de cortes, asignación de IDs, operaciones idempotentes, VIN y ledger append-only de aportes. |
| CATALOG | `Cortes`, `LogosMarca`, `Tutorial`, `Relay`, `FeedbackLikes`, `TutorialEditEvents`, `TutorialRenameEvents` | Catálogo/proyección, navegación, logos, tutoriales y eventos que afectan la proyección. |
| FEEDBACK | `Cortes`, `Feedbacks`, `Contactanos`, `ActividadUsuario`, `FeedbackLikes`, `FeedbackYearApplications`, `FeedbackYearApplicationEvents`, `AportesVehiculo`, `Users`, `Tutorial`, `TutorialTitleEvents`, `TutorialEditEvents`, `TutorialRenameEvents`, `VideoApprovalEvents` | Feedback, contacto, actividad, sugerencias de año, eventos de contribución, tutoriales y aprobación de vídeo. |
| InboxConversations | `InboxConversations`, `InboxMessages`, `InboxConversationState`, `InboxConversationFlags`, `InboxConversationAudit`, además de lectura de `Users` | Cinco hojas propias; contienen conversaciones, mensajes, estado por participante, flags y auditoría. El módulo crea/valida encabezados al inicializar el esquema. |
| ADMIN | `Cortes`, `AdminState`, `LogosMarca`, `Imagenes_Reemplazadas`, `Relay`, `Idempotencia`, `Idempotencia_Cortes`, `Users`, `Feedbacks`, `pys`, `ActividadUsuario`, `PysOperations`, `Tutorial` | Administración, inventario y reemplazo de imágenes, operaciones de PyS, logs y estado de procesos. |
| UTILITIES | `Cortes`, `Hoja 1`, `__utilities_timestamps_staging__`, `__utilities_timestamps_backup__` | Migración de timestamps con staging y backup para recuperación. |
| COORDINATOR | Sin hoja Spreadsheet directa identificada en este módulo | Mantiene estado de coordinación/telemetría mediante almacenamiento del proyecto; revisar por separado en MIG-003/MIG-004. |

### 11.1 Dependencias de acceso compartidas

Los servicios AUTH, USERS, WRITE, CATALOG, FEEDBACK, ADMIN y UTILITIES resuelven la Spreadsheet mediante un símbolo local `SPREADSHEET_ID` y `SpreadsheetApp.openById`. ADMIN y FEEDBACK también contienen `DRIVE_FOLDER_ID`. ADMIN conserva URLs locales para WRITE/CATALOG y otros servicios. No se copiaron valores de IDs ni URLs en esta matriz: las claves y referencias se rastrearán en MIG-003/MIG-004 para migrarlas de forma segura.

### 11.2 Esquema Inbox que debe conservarse

- `InboxConversations`: `conversationId`, creación/actualización, asunto, categoría, tipo, estado, creador, participantes, clave/hash de creación, último mensaje y contador.
- `InboxMessages`: `messageId`, conversación, fecha, autor, rol, cuerpo, clave idempotente y hash del payload.
- `InboxConversationState`: estado individual de lectura, archivo, envío/recepción y cursores de mensajes.
- `InboxConversationFlags`: override de no leído, eliminación lógica por participante y fecha de actualización.
- `InboxConversationAudit`: evento, fecha, actor, acción, conversación, mensaje y detalles.

La migración debe preservar encabezados, orden de columnas, claves, idempotencia, flags por participante, auditoría y la creación/validación segura del esquema. No consolidar estas hojas en `Feedbacks` ni eliminar el historial.

**Estado:** inventario de hojas en primera pasada; MIG-001 sigue **EN PROGRESO** hasta contrastar cada acción con columnas/rangos, lecturas/escrituras, fórmulas, archivos Drive, triggers y pruebas.


## 12. Rutas internas y acciones fuera del mapa frontend — 2026-11-23

La extracción se hizo comparando `ACTION_TO_SERVICE_MAP` con los `switch(request.action)` y las ramas de preprocesamiento de cada `doPost`, además de las rutas GET especiales. Resultado: las 120 acciones del mapa están presentes en los routers correspondientes o en un handler directo; no hay una acción mapeada sin ruta backend identificada. Las rutas siguientes son adicionales y no deben confundirse con acciones de interfaz.

### 12.1 Endpoints internos de caché de actor

Cuatro servicios aceptan dos acciones internas antes de entrar al dispatcher ordinario:

| Servicio destino | Acción | Función | Uso |
|---|---|---|---|
| USERS | `__invalidateSessionActorCache` | `handleSharedSessionActorCacheInvalidation_` | Eliminar entradas locales de caché para sesiones revocadas/cambiadas. |
| USERS | `__primeSessionActorCache` | `handleSharedSessionActorCachePriming_` | Precargar actor confiable (userId, rol, nombre y epoch) después de sincronizar sesión. |
| WRITE | Las mismas dos acciones | Las mismas funciones | Invalidar/precargar caché local usada por operaciones WRITE. |
| FEEDBACK | Las mismas dos acciones | Las mismas funciones | Invalidar/precargar caché local usada por FEEDBACK e Inbox. |
| ADMIN | Las mismas dos acciones | Las mismas funciones | Invalidar/precargar caché local usada por ADMIN. |

Son **8 rutas de servicio** (2 acciones × 4 servicios). No están en `ACTION_TO_SERVICE_MAP` y no son llamadas del navegador. Coordinator las invoca en fan-out durante la preparación o invalidación de sesiones. Cada destino compara en tiempo constante el secreto recibido con `GPSpedia_COORDINATOR_SECRET` local (mínimo 32 caracteres), valida forma/cantidad de tokens y, para priming, rol permitido y epoch positivo. Esta dependencia de secreto/propiedad es parte del diseño actual y se elimina únicamente al migrar de forma segura la sesión; nunca se expone al frontend.

### 12.2 Acciones internas de COORDINATOR

El dispatcher interno acepta **13 acciones**, autenticadas mediante `authenticate_` y versión de protocolo:

| Acción | Consumidor/flujo actual |
|---|---|
| `acquire`, `release`, `validate` | Leases de operaciones coordinadas en AUTH, USERS, WRITE, ADMIN, FEEDBACK y UTILITIES. |
| `publishCatalogChange`, `publishCatalogChanges` | Publicación de cambios/deltas desde WRITE, FEEDBACK y ADMIN. |
| `getCatalogChanges` | Lectura del feed incremental; FEEDBACK lo consume mediante el cliente interno y también expone GET `catalogFeed=1`. |
| `registerSession`, `syncUserSessions` | Registro y sincronización del contexto de sesión desde AUTH. |
| `revokeSession`, `revokeUserSessions` | Revocación de sesión/sesiones desde AUTH, precedida por invalidación de cachés de actor. |
| `validateSessionContext` | Validación de contexto desde AUTH para operaciones de sesión que requieren esa consulta explícita. |
| `invalidateSessionActorCaches` | Fan-out de invalidación hacia USERS, WRITE, FEEDBACK y ADMIN. |
| `getServiceTraffic` | Lectura de telemetría solicitada por ADMIN. |

Estas acciones no son funciones UI independientes: son el protocolo privado que actualmente implementa SharedMutation/Coordinator. Deben migrarse por capacidad y conservar sus garantías de concurrencia, revocación, feed y telemetría antes de retirar cualquiera de esos componentes.

### 12.3 Rutas GET y compatibilidad que también forman parte del contrato

- Todos los servicios con `doGet` exponen una respuesta de disponibilidad; varios aceptan `debug=true` con metadatos de estado/versión. No equivale a ejecutar un health check profundo.
- Coordinator acepta GET `catalogFeed=1` para el feed público incremental; FEEDBACK acepta el mismo parámetro y delega la lectura al cliente de Coordinator. Conservar cursor, límite y formato de respuesta.
- CATALOG admite `diagnostics=true` en POST para envolver la respuesta con datos de diagnóstico. Es un modificador de transporte, no una acción adicional.
- CATALOG conserva `getSuggestion` como ruta de compatibilidad histórica aunque el mapa actual enruta esa acción a WRITE.
- ADMIN conserva rechazo explícito `ACTION_MOVED_TO_WRITE` para `checkOperation`, `addOrUpdateCut` y `addSupplementaryInfo`; son acciones del mapa atendidas por WRITE, pero la respuesta histórica de ADMIN evita que una llamada antigua ejecute una escritura duplicada.
- ADMIN intercepta `getServiceTraffic` para preparar el actor cacheado y luego entra al handler de telemetría; `ping` es una ruta de salud sin actor. Ambas acciones están en el mapa.
- UTILITIES atiende `migrateTimestamps` mediante un `doPost` directo (no un switch); sí aparece en el mapa y exige actor Desarrollador más lease/ScriptLock.

### 12.4 Diferencia entre acciones no mapeadas y funciones sin consumidor

Las dos acciones de caché y las 13 acciones de Coordinator son rutas internas fuera del mapa. No se suman a las 120 acciones de interfaz ni se cuentan entre las 12 acciones mapeadas sin consumidor directo localizado. Estas últimas siguen pendientes de clasificación individual (manuales, mantenimiento, indirectas o históricas); la ausencia de botón no autoriza su eliminación.

**Límite de esta pasada:** se identificaron dispatchers, preprocesamiento, autenticación interna y consumidores de alto nivel. Falta profundizar por operación en payload/respuesta/errores, columnas y rangos, efectos de datos, pruebas, jobs programados y procedimientos manuales.


## 13. Clasificación preliminar de acciones sin consumidor directo — 2026-11-23

Las 12 acciones siguientes están mapeadas y tienen handler, pero no se encontró llamada directa en los módulos frontend/backend examinados. La clasificación se basa en el propósito observable del handler; no equivale a una decisión de retirada ni confirma que sean obsoletas.

| Acción | Servicio / handler | Función observada | Clasificación provisional y conservación |
|---|---|---|---|
| `touchSession` | AUTH / `handleTouchSession` | Valida y actualiza actividad de una sesión a partir del token; ante indisponibilidad devuelve estado explícito de validación no disponible. | Compatibilidad/actividad de sesión. Revisar consumidores históricos y ciclo de sesión; conservar hasta resolverlo. |
| `benchmarkPasswordKdf` | AUTH / `handleBenchmarkPasswordKdf_` | Diagnóstico PBKDF2 exclusivo de Desarrollador; usa cadena fija, es read-only y no lee ni modifica contraseñas reales. | Herramienta de diagnóstico manual. Preservar su restricción RBAC y naturaleza no destructiva. |
| `getNavigationData` | CATALOG / `handleGetNavigationData` | Calcula conteos por categoría, marcas ordenadas y logos leyendo columnas limitadas de Cortes/LogosMarca. | Lectura optimizada de navegación. Consumidor actual no localizado; contrastar con el modelo de navegación antes de decidir si está reemplazada. |
| `markInboxUnread` | FEEDBACK / `handleMarkInboxUnread` | Marca una conversación como no leída para el participante, puede retirarla de Archivados y registra auditoría; revierte cambios si falla la auditoría. | Capacidad de Inbox sin consumidor directo localizado. No retirar; verificar UI/flujo de recuperación. |
| `deleteInboxConversation` | FEEDBACK / `handleDeleteInboxConversation` | Oculta la conversación solo para el participante mediante flags; conserva mensajes e historial y audita la acción. | No es borrado físico. Conservar semántica por participante e historial. |
| `migrateTimestamps` | UTILITIES / `migrateTimestamps` | Migración de timestamps desde Cortes a Hoja 1 con staging, backup, lectura posterior y rollback; requiere Desarrollador, lease y ScriptLock. | Mantenimiento manual/desarrollador. Conservar recuperación y guardas de seguridad. |
| `migrateVehicleContributionsSchema` | ADMIN / `handleMigrateVehicleContributionsSchema` | Crea o valida encabezados versionados de AportesVehiculo y verifica persistencia sin alterar registros de Cortes. | Mantenimiento de esquema; además se invoca internamente desde el flujo de candidatos cuando falta la hoja. No es exclusivamente manual. |
| `migrateIdentifiers` | ADMIN / `handleMigrateIdentifiers_` | Dry-run por defecto; exige confirmación, migrationId y digest SHA-256; persiste manifiesto/snapshots y procesa lotes verificando huellas. | Migración administrativa destructiva controlada. Mantener simulación, manifiesto, snapshots, lotes y verificación. |
| `rollbackIdentifiers` | ADMIN / `handleRollbackIdentifiers_` | Requiere confirmación y digest; restaura en orden inverso solo filas VERIFIED cuya huella posterior y snapshot coinciden. | Recuperación manual de migración. No simplificar ni eliminar. |
| `reconcilePendingImageUploads` | ADMIN / `handleReconcilePendingImageUploads` | Contrasta ledger/eventos, archivos Drive y referencias; dry-run por defecto y aplicación explícita con confirmación. | Mantenimiento/reconciliación de multimedia. Preservar lectura previa, clasificación y modo seguro. |
| `createSheet` | ADMIN / `handleCreateSheet` | Crea hoja con encabezados y fórmula ID opcional, tras validar nombres, encabezados y fórmula. | Herramienta manual de estructura Spreadsheet; no se encontró consumidor directo. |
| `addColumn` | ADMIN / `handleAddColumn` | Agrega encabezado a la siguiente columna libre de una hoja validada. | Herramienta manual de estructura Spreadsheet; no se encontró consumidor directo. |

### 13.1 Decisiones pendientes

- No declarar ninguna de estas acciones obsoleta solo por falta de llamada localizada.
- Verificar comandos de terminal, panel de desarrollador, documentación histórica, jobs y procedimientos operativos antes de cerrar su clasificación.
- Para Inbox, comprobar si la interfaz implementa la acción con otro nombre o si realmente falta el control; la semántica backend ya está identificada.
- Para `getNavigationData`, comparar la respuesta con la navegación que actualmente se construye desde `getCatalogData` u otros datos cacheados.
- La migración de identificadores, reconciliación de imágenes y timestamps deben conservar sus modos dry-run, manifiestos, snapshots, locks y rollback.

**Resultado de esta fase:** clasificación funcional preliminar de las 12 acciones sin consumidor directo. El inventario de comandos manuales y jobs no queda cerrado todavía.


### 13.2 Terminal de desarrollador y procesos programados — revisión parcial

La acción ADMIN `driveCommand` es una herramienta manual invocada desde la consola de desarrollador. Los comandos observados en `handleDriveCommand` son:

| Comando | Comportamiento |
|---|---|
| `dir` / `ls` | Lista carpetas y archivos de la carpeta activa. |
| `cd <carpeta>` | Navega a una subcarpeta única dentro del árbol Cortes. |
| `cd ..` | Sube al padre único validado; en raíz permanece en raíz. |
| `cd \\ ` o `cd /` | Regresa a la raíz Cortes. |
| `mkdir <nombre>` | Crea una subcarpeta y verifica su pertenencia/parentesco. |
| `move` | Mueve un archivo a una carpeta destino dentro del árbol Cortes, con validación previa y posterior. |
| `tree` | Muestra el árbol hasta la profundidad implementada (máximo 2 niveles adicionales). |

La terminal no es un explorador genérico de Drive: restringe navegación, origen y destino al árbol Cortes. No se observó un comando de borrado en el dispatcher revisado. La migración debe conservar estos límites de seguridad y no añadir operaciones destructivas por equivalencia superficial.

Se hizo una búsqueda estática de `ScriptApp.newTrigger`, `newTrigger(`, `timeBased(`, `onOpen` y `onEdit` en estos módulos: AUTH, USERS, WRITE, CATALOG, FEEDBACK, InboxConversations, ADMIN, UTILITIES, Coordinator, SharedMutationClient y los módulos frontend ui.js/main.js. No se encontraron declaraciones de triggers en ese conjunto. **Esto no demuestra que el repositorio completo ni los proyectos Apps Script desplegados carezcan de triggers**; falta inspeccionar archivos de raíz/manifiestos y configuración de cada proyecto antes de cerrar el inventario programado.


## 14. Contratos AUTH — payload, respuesta, RBAC y datos (primera pasada 2026-11-23)

Fuente: handlers de `JS/Services/Auth.js`, router `doPost` y política RBAC documentada en §10. Los campos `userId`/`sessionToken` indicados como contexto son consumidos por el preprocesamiento de sesión cuando corresponde; no todos forman parte del payload de negocio del handler. Las respuestas descritas son contratos observados, no una sustitución de los tests de integración.

| Acción | Payload de negocio observado | Respuesta / errores relevantes | RBAC / datos |
|---|---|---|---|
| `login` | `username`, `password`, `requestId` opcional | Éxito: `status`, `user`, `sessionCleanupPending`; error: `status`, `message`. Credenciales inválidas, cuenta desactivada/no única, hoja de sesiones ausente o revocación anterior pendiente. | Pública; lee Users y crea/gestiona ActiveSessions; bloqueo de intentos y hash de contraseña. |
| `validateSession` | `userId`, `sessionToken` | `valid:false`, perfil validado o estado no disponible `valid:null/unavailable/reason`. Puede recuperar sesiones heredadas y sincronizarlas con contexto compartido. | Token válido; consulta contexto y sincroniza actividad en ActiveSessions. |
| `acceptTerms` | `version`, `deviceId`; `userId` opcional para confirmar identidad | `status`, `accepted`, `alreadyAccepted`, `termsAcceptance`. Rechaza versión distinta, dispositivo inválido, identidad no coincidente o fila no única. | Cualquier rol activo; actualiza Users.TermsAcceptance bajo ScriptLock y verifica read-back. |
| `touchSession` | `sessionToken` | Devuelve `valid`; ante fallo puede devolver `valid:null`, `unavailable:true`, `reason`. | Token de sesión; valida y toca actividad. Sin consumidor directo localizado. |
| `requestPasswordRecovery` | `username`, `email` | Respuesta genérica `status:success` para evitar enumeración de cuentas, incluso si los datos no coinciden; envía código por correo cuando procede. | Pública; lee Users, reserva/expide desafío de un solo uso con vencimiento de 10 minutos; no revela existencia de cuenta. |
| `completePasswordRecovery` | `username`, `email`, `code`, `newPassword` | Éxito `status/message/cleanupPending`; error genérico de código inválido/expirado/no coincidente o contraseña fuera de longitud. | Pública con código válido; lee/escribe Users y ActiveSessions, hashea nueva contraseña y revoca sesiones. |
| `changePassword` | `currentPassword`, `newPassword`; `userId` opcional debe coincidir con actor | `status/message`, con información de sesiones revocadas/limpieza pendiente según resultado. Errores de contraseña actual, identidad, revocación o esquema. | Cualquier rol activo; actor cacheado, Users y ActiveSessions; invalida sesiones. |
| `resetUserPassword` | `targetUserId`, `newPassword` | `status/message`; rechaza auto-restablecimiento, destino inexistente/no único y revocación incompleta. | Solo Desarrollador; Users y ActiveSessions; hash y revocación antes de confirmar. |
| `resetUserSessions` | `targetUserId` | `status`, `cleanupPending`, `message`; no permite cerrar remotamente la sesión propia. | Solo Desarrollador; Users y ActiveSessions; revoca tokens y elimina filas cuando es seguro. |
| `clearSensitiveLogs` | Contexto `userId/sessionToken`; actor confiable interno | `status/message` y posible `cleanupPending`; error si no hay actor Desarrollador, hoja Logs o encabezado válido. | Solo Desarrollador; hoja Logs; elimina únicamente registros clasificados como sensibles bajo ScriptLock. |
| `deleteUser` | `userId` destino | `status`, `disabled/deleted`, `message`; puede informar cuenta ya desactivada o limpieza pendiente. | Desarrollador/Jefe/Supervisor con jerarquía; Users y ActiveSessions; protege último Desarrollador y revoca sesiones. |
| `updateUser` | `userId` destino, objeto `updates` | `status/message`; rechaza cambios de contraseña por esta ruta, rol no permitido, destino ambiguo y degradación del último Desarrollador. | Desarrollador/Jefe/Supervisor con jerarquía; Users y ActiveSessions; cambio de rol implica revocación y limpieza. |
| `logout` | `userId`, `sessionToken` | Respuesta con `status`; rechaza token ambiguo, identidad que no coincide o revocación no confirmada. | Sesión propia; ActiveSessions y Users; invalida token y referencias de sesión. |
| `migrateLegacyPasswords` | `dryRun` (por defecto true), `confirm`, `batchSize` (1–10, por defecto 5); contexto de sesión | Dry-run informa cuentas elegibles, hashes pendientes, omitidas, ambiguas y modo de reanudación; escritura devuelve estado de lote/progreso. | Solo Desarrollador; Users y ActiveSessions; requiere confirmación para escribir, procesa por lotes y verifica hashes. |
| `benchmarkPasswordKdf` | Sin campos de negocio; solo contexto de sesión | `status`, `benchmarkOnly:true`, `readOnly:true`, nota y resultados. | Solo Desarrollador; diagnóstico fijo PBKDF2, sin leer ni modificar contraseñas de usuarios. |

### 14.1 Datos y dependencias AUTH

- Hojas directas identificadas: `Users`, `ActiveSessions`, `Logs`.
- Sesiones: registro de tokens, expiración/actividad, revocación, limpieza y contexto confiable de usuario/rol.
- Recuperación: desafío de un solo uso, vinculado a usuario/correo y expiración; envío mediante MailApp. El código no debe filtrarse en logs ni respuestas.
- Contraseñas: almacenamiento como hash y compatibilidad de hashes heredados; `migrateLegacyPasswords` es una operación de mantenimiento con dry-run/confirmación.
- Aceptación de términos: almacenamiento por dispositivo en `Users.TermsAcceptance`, versión vigente `2026-07`, con verificación de escritura.
- Coordinator/SharedMutation actual: AUTH registra/sincroniza/revoca sesiones y solicita invalidación de cachés remotas. Esas dependencias deben convertirse en llamadas directas del frontend o en mecanismos locales equivalentes antes de retirar el protocolo actual.

### 14.2 Límites y pendientes de precisión

Esta primera tabla identifica campos de entrada y familias de respuesta/errores a partir del handler. Para cerrar el contrato AUTH falta capturar los objetos completos de perfil/sesión, los campos exactos de cada error, las columnas físicas de Users/ActiveSessions/Logs por operación y la secuencia exacta de llamadas a Coordinator. Las pruebas de integración con MailApp, Spreadsheet y deployments permanecen reservadas a Beta; no se simularon.


## 15. Contratos USERS — payload, respuesta, RBAC y datos (primera pasada 2026-11-23)

| Acción | Payload observado | Respuesta / errores | RBAC / datos |
|---|---|---|---|
| `getUsers` | Contexto `sessionToken` (más `userId` para validar actor/cache) | `status:success`, `users[]` con `ID`, `Nombre_Usuario`, `Privilegios`, `Telefono`, `Correo_Electronico`, `Nombre_Completo`; error de permisos insuficientes. | Desarrollador ve todos los roles activos; Jefe ve Supervisor/Técnico; Supervisor ve Técnico. Lee Users y valida sesión. |
| `createUser` | `newUser` con solo `Nombre_Usuario`, `Password`, `Privilegios`, `Telefono`, `Correo_Electronico`, `Nombre_Completo`; `sessionToken` | `status/message`; nombre duplicado devuelve error de disponibilidad. Valida formato, longitudes, rol, correo/teléfono, ID y fila vacía; hash antes de escribir. | Desarrollador crea todos los roles; Jefe crea Supervisor/Técnico; Supervisor crea Técnico. Escribe Users bajo ScriptLock fail-fast y verifica/recupera escritura. |
| `updateProfile` | `userId`, `updates.Nombre_Completo`, `sessionToken` | `status/message`; solo admite Nombre_Completo, exige identidad propia y verifica read-back. | Cualquier rol activo; actualiza exclusivamente el perfil propio en Users. |

### 15.1 Dependencias y datos USERS

- Hoja principal: `Users`; la validación de sesión usa el contexto de `ActiveSessions`/actor compartido.
- Secuencia de ID: lee `__IdentifierSequenceConfig__` cuando existe; valida encabezados, prefijo, padding y fórmula contra Users.ID. El fallback histórico detecta el patrón de fórmula existente o usa `USR-` con padding 4 si no hay fórmula heredada.
- La creación escribe ID permanente como valor, no copia fórmulas; valida IDs únicos, username único, roles permitidos y formato de campos.
- `updateProfile` solo permite `Nombre_Completo`; no ampliar la lista de campos durante la unificación AUTH/USERS sin una decisión expresa y pruebas.
- La unificación con AUTH debe conservar el filtrado jerárquico, validación de actor, generación de IDs, exclusión mutua y escritura atómica/rollback.


## 16. Contratos WRITE — payload, respuesta, RBAC y datos (primera pasada 2026-11-23)

| Acción | Payload observado | Respuesta / errores relevantes | RBAC / datos |
|---|---|---|---|
| `checkVehicle` | `marca`, `modelo`, `anoDesde`, `tipoEncendido` | `status:success`, `matches[]` de vehículos; error si falta algún criterio. | Lectura sin actor en handler; consulta Cortes y compara marca/modelo normalizados, año en rango y tipo de encendido exacto. |
| `getSuggestion` | `term`, `field` (marca/modelo), `brand` opcional | `status:success`, `suggestion` o null; error por campo/criterio inválido. | Lectura sin actor; consulta Cortes, normaliza y busca coincidencia exacta/aproximada. CATALOG mantiene ruta histórica de compatibilidad. |
| `checkOperation` | `opId`, `operationHash` opcional | `status:success` con `exists`, `pending`, estado, vehicleId/hash y origen; detecta conflictos de huella. | Sin actor/lease por diseño; opId aleatorio de 128 bits y respuesta mínima. Lee Cortes/Idempotencia y, si corresponde, AportesVehiculo. Mantener el contrato de seguridad existente. |
| `addOrUpdateCut` | `vehicleId` opcional, `vehicleData`, `cutData`, `opId`, `operationHash`, `silent`; contexto de sesión. `cutData`: `tipoCorte1`, `configRelay1`, `ubicacionCorte1`, `colorCableCorte1`, `activaTestigo1`, `imgCorte1`, `vin`. `vehicleData`: `categoria`, `marca`, `modelo`, `versionesAplicables`, `anoDesde`, `anoHasta`, `tipoEncendido`, `imagenVehiculo`. | Respuesta de alta/aporte con `status`, `vehicleId`, `opId`, `timestamp`, slot/evento/hash, duplicado y flags de revisión/feed; errores tipados como WRITE_BUSY/WRITE_OP_ID_REQUIRED y validaciones de catálogo/VIN. | Cualquier rol activo; `silent:true` solo Desarrollador. Lee Cortes/Relay; usa Idempotencia/Idempotencia_Cortes y AportesVehiculo según flujo; imágenes mediante Drive/ledger. Alta nueva y aporte a vehículo existente siguen rutas transaccionales distintas. |
| `addSupplementaryInfo` | `vehicleId`, `userId`, `sessionToken`, `timestamp`, `opId`, `contributionOpIds`; campos `apertura`, `cableAlimen`, `cableAlimen2`, `cableAlimen3`, `notaImportante`, `imgApertura`, `imgCableAlimen`, `imgCableAlimen2`, `imgCableAlimen3`. No acepta campos de vídeo. | Respuesta moderna incluye evento(s), IDs/hash, slot, apertura/nota, duplicado, reset de catálogo y revisión pendiente; ruta legacy devuelve resultado de escritura. Errores SUPPLEMENTARY_* para payload, conflicto, esquema, vehículo o persistencia. | Cualquier rol activo; Cortes, AportesVehiculo y ledger de cargas/Drive cuando hay imágenes. Una sola entrada de cable por operación; no sobrescribe apertura existente; append-only para eventos modernos. |
| `checkVinDuplicate` | `vin`, `currentVehicleId` opcional | `status:success, duplicate:false` o `status:duplicate, duplicate:true` con vehículo/modelo/prefijo. | Lectura sin actor; consulta Cortes y compara prefijo VIN procesado. |
| `addVinToVehicle` | `vehicleId`, `vin`, `trimLevel`, `isNewTrim`; contexto de sesión | `status/message`, `alreadyPresent`, `duplicate`, `vinPrefix`, colección VIN, versiones, opId/evento y reset de catálogo; errores con código cuando corresponde. | Cualquier rol activo; Cortes y AportesVehiculo. Máximo 3 versiones; VIN conserva prefijo procesado y colección JSON; append-only para actualización. |
| `allocateVehicleId` | `opId` y `operationHash` opcionales para asignación idempotente; legacy puede generar reserva | `status:success`, `vehicleId`; errores por opId/hash inválido o conflicto. | Solo Desarrollador; Cortes e Idempotencia_Cortes, reserva append-only. |
| `freezeCortesIds` | `backupId`, `confirm` | Dry-run: `status`, `dryRun:true`, resumen de filas/fórmulas/IDs. Confirmado: `dryRun:false` y resumen; errores de respaldo, lock, IDs o verificación. | Solo Desarrollador; requiere respaldo de Spreadsheet válido y distinto del recurso principal; Cortes, ScriptLock y contador técnico actual. Convierte fórmulas en valores solo con confirmación. |

### 16.1 Invariantes WRITE para la migración

- Las lecturas públicas `checkVehicle`, `getSuggestion`, `checkOperation` y `checkVinDuplicate` no deben recibir viajes de red/validaciones adicionales que alteren sus contratos actuales.
- `checkOperation` permanece sin sesión/lease por decisión de seguridad documentada; el opId impredecible y la respuesta mínima son parte del contrato.
- Las escrituras protegidas requieren actor confiable cacheado; el frontend no puede enviar un rol como autoridad.
- Las altas y aportes mantienen idempotencia, hashes de operación, ledger append-only, lectura posterior, reserva de IDs y recuperación ante respuesta perdida.
- Las imágenes suplementarias mantienen transferencia/ledger/Drive; los vídeos se rechazan expresamente en este endpoint y deben continuar por el flujo YouTube de aprobación.
- `freezeCortesIds` conserva el requisito de respaldo, dry-run por defecto, confirmación explícita, lock y verificación de valores/formulas.

### 16.2 Límite de esta primera pasada

Los campos anidados de `addOrUpdateCut` y `addSupplementaryInfo` se han extraído de sus validadores; las respuestas se resumen por variante de alta/aporte. Falta asociar columnas/rangos exactos y pruebas por acción, y revisar efectos de Drive/ledger en cada variante. No se ejecutaron escrituras reales.



## 17. Mapa físico de hojas y rangos — AUTH, USERS y WRITE (primera pasada 2026-11-23)

Fuente: constantes de columnas, nombres de hojas y operaciones de lectura/escritura de `JS/Services/Auth.js`, `JS/Services/users.js` y `JS/Services/write.js`. Los índices siguientes son los contratos que el código espera; **no representan una inspección en vivo de la Spreadsheet**. La validación de encabezados y datos reales queda pendiente de un entorno de prueba aislado.

### 17.1 AUTH / USERS — `Users`

| Columna | Campo | Uso observado |
|---|---|---|
| A (1) | `ID` | Identificador de usuario y búsqueda de registros |
| B (2) | `Nombre_Usuario` | Nombre de inicio de sesión y búsqueda de cuenta |
| C (3) | `Password` | Hash de contraseña; actualización y verificación |
| D (4) | `Privilegios` | Rol; lectura y cambios protegidos |
| E (5) | `Telefono` | Datos de perfil y administración |
| F (6) | `Correo_Electronico` | Recuperación y administración |
| G (7) | `Nombre_Completo` | Perfil y nombre visible |
| H (8) | `SessionToken` | Puntero heredado de sesión y marcador temporal de revocación de rol |
| I (9) | `TermsAcceptance` | Aceptación de términos por dispositivo |

AUTH y USERS declaran el mismo mapa A:I. USERS lee normalmente A:G para listar usuarios; las operaciones de perfil/creación usan los índices definidos. No se debe tratar H como un campo libre: AUTH/USERS lo utilizan para compatibilidad y coordinación de revocaciones pendientes.

### 17.2 AUTH / USERS — `ActiveSessions`

| Columna | Campo | Uso observado |
|---|---|---|
| A (1) | `ID_Usuario` | Relación con Users.ID |
| B (2) | `Usuario` | Nombre de usuario asociado |
| C (3) | `ActiveSessions` | Token opaco de sesión; búsqueda, revocación y eliminación |
| D (4) | `date` | Fecha de creación de sesión y fallback histórico de actividad |
| E (5) | `Logs` | Campo heredado conservado en el esquema |
| F (6) | `LastActivityAt` | Actividad reciente; AUTH comprueba/crea el encabezado `lastActivityAt` |
| G (7) | `SessionTermsAcceptance` | Aceptación de términos asociada a la sesión/dispositivo |

AUTH declara A:G. USERS declara A:F y no define el campo G en su mapa local. La unificación debe adoptar un único contrato compartido sin desplazar columnas ni borrar G. El código de AUTH también valida que F esté vacía o tenga el encabezado esperado antes de inicializarlo; no se debe asumir que basta con ampliar rangos.

### 17.3 AUTH — `Logs`

AUTH inserta cada registro nuevo en la fila 2 y escribe el rango A:D en este orden:

1. `timestamp` (ISO),
2. `level`,
3. `message`,
4. `details` (JSON o vacío).

La fila 1 se conserva como encabezado. La purga de registros sensibles opera sobre esta hoja bajo permiso Desarrollador; no equivale a una limpieza indiscriminada.

### 17.4 WRITE — `Cortes`

Mapa de columnas declarado por `COLS_CORTES`:

| Rango | Campos |
|---|---|
| A:H (1–8) | `id`, `categoria`, `marca`, `modelo`, `versionesAplicables`, `anoDesde`, `anoHasta`, `tipoEncendido` |
| I:K (9–11) | `imagenVehiculo`, `videoGuiaDesarmeUrl`, `contadorBusqueda` |
| L:R (12–18) | `tipoCorte1`, `ubicacionCorte1`, `colorCableCorte1`, `configRelay1`, `imgCorte1`, `utilCorte1`, `colaboradorCorte1` |
| S:Y (19–25) | Campos equivalentes del corte 2 |
| Z:AF (26–32) | Campos equivalentes del corte 3 |
| AG:AP (33–42) | `apertura`, `imgApertura`, `cableAlimen`, `imgCableAlimen`, `timestamp`, `notaImportante`, `cableAlimen2`, `imgCableAlimen2`, `cableAlimen3`, `imgCableAlimen3` |
| AQ:AS (43–45) | Sin campo declarado en `COLS_CORTES`; conservar sin desplazar ni reutilizar por inferencia |
| AT:AV (46–48) | `activaTestigo1`, `activaTestigo2`, `activaTestigo3`; el código exige estas posiciones físicas |

La columna `VIN` no tiene índice fijo en `COLS_CORTES`: `getVinColumnIndex` la localiza por encabezado, rechaza duplicados y devuelve ausencia cuando no existe. La migración debe mantener esa resolución dinámica y no asignarle AQ:AS sin inspección real.

### 17.5 WRITE — hojas auxiliares con esquema explícito

| Hoja | Columnas / encabezados | Función |
|---|---|---|
| `Idempotencia` / `Idempotencia_Cortes` | A:F: `opId`, `vehicleId`, `slotIndex`, `timestamp`, `status`, `operationHash` | Registro de idempotencia; se prefiere la hoja principal compatible y se usa fallback solo bajo reglas de compatibilidad |
| `CortesIdReservations` | A:D: `opId`, `operationHash`, `vehicleId`, `createdAt` | Reservas append-only de IDs de vehículo |
| `AportesVehiculo` | A:K: `eventId`, `opId`, `vehicleId`, `operationHash`, `kind`, `payloadJson`, `actorId`, `actorName`, `createdAt`, `status`, `supersedesEventId` | Ledger append-only versionado de aportes |
| `ImageUploadEvents` | A:N: `eventId`, `token`, `operationKey`, `folderId`, `mimeType`, `sizeBytes`, `contentHash`, `fileId`, `fileUrl`, `state`, `referencesJson`, `fileName`, `createdAt`, `lastError` | Diario append-only de transiciones de cargas; no sustituye por sí solo el ledger heredado |

### 17.6 Configuración de secuencia de IDs de USERS

`__IdentifierSequenceConfig__` declara encabezados exactos A:G: `sheet`, `column`, `header`, `prefix`, `padding`, `formula`, `updatedAt`. USERS busca la fila de `Users` y la columna ID (1), rechaza encabezados incompatibles o registros duplicados y contrasta prefijo, padding y fórmula con la hoja destino. Si no hay configuración aplicable, existe un fallback histórico basado en la fórmula/patrón existente o `USR-` con padding 4. No migrar ni eliminar esta hoja antes de trasladar su contrato y probar la asignación.

### 17.7 Diferencias y riesgos de esquema identificados

- AUTH y USERS comparten el mapa Users A:I, pero sus mapas ActiveSessions difieren: AUTH incluye G (`SessionTermsAcceptance`) y USERS termina en F. La consolidación debe centralizar el esquema más completo.
- AUTH y USERS mantienen referencias locales a Spreadsheet y AUTH accede también a Logs; WRITE declara además una carpeta Drive y utiliza hojas auxiliares. Estas referencias se inventarían en MIG-003/MIG-004; este apartado no las migra.
- Los índices de `Cortes` no prueban que los encabezados reales de Beta/productivo coincidan. Los encabezados de Idempotencia, AportesVehiculo, ImageUploadEvents, reservas y secuencia se validan por código, pero aquí no se inspeccionó una Spreadsheet real.
- No se deben compactar columnas vacías, mover campos, renombrar encabezados ni normalizar hojas durante la migración sin una prueba de compatibilidad y recuperación.



### 17.8 Diferencia documental sobre la posición física de VIN

El README vigente describe el esquema objetivo de VIN en la columna AQ (43), con AR:AS (44–45) disponibles, después de migrar los identificadores de operación. En cambio, `JS/Services/write.js` no fija VIN en `COLS_CORTES`: lo busca por el encabezado exacto `VIN` mediante `getVinColumnIndex`, y falla ante encabezados duplicados. La matriz debe conservar ambas evidencias hasta verificar la hoja real y el flujo administrativo `renameVinColumnHeader`; no se debe mover ni renombrar la columna por inferencia. La regla fija AT:AV (46–48) para `activaTestigo1..3` sí está impuesta expresamente por WRITE.



### 17.9 CATALOG — ledger del feed incremental (actualización MIG-026, 2026-11-24)

El feed incremental de CATALOG dejó de persistirse en ScriptProperties y utiliza dos hojas privadas de la Spreadsheet operativa de CATALOG. El servicio valida los encabezados exactos y falla cerrado si falta una hoja o su esquema no coincide; no crea hojas automáticamente. Un ledger vacío solicita resetRequired; antes de habilitar clientes debe publicarse el reset inicial como Desarrollador (revisión 1).

| Hoja | Rango/columnas | Contrato |
|---|---|---|
| CatalogChangeState | A:D: schemaVersion, revision, minRevision, updatedAt | Una única fila de estado bajo encabezados; schemaVersion=1; revisión monotónica y primera revisión retenida. |
| CatalogChangeEvents | A:J: revision, collection, recordId, operation, snapshotJson, createdAt, sourceService, sourceOperation, sourceRequestId, resetRequired | Ledger de eventos del feed; ventana activa de 100 eventos, append bajo ScriptLock, idempotencia por service+operation+requestId y reset para cursores obsoletos/huecos/corrupción. |

El evento no guarda userId ni sessionToken. El snapshot se reconstruye en CATALOG desde la fuente canónica; el navegador solo envía la referencia del cambio. Tras cada append se confirma la revisión y el evento mediante lectura. Las hojas deben prepararse en Beta aislada antes de desplegar esta versión. Las claves históricas GPSpedia_CATALOG_CHANGE_REVISION y GPSpedia_CATALOG_CHANGE_EVENT_* pueden permanecer en ScriptProperties instaladas; no se eliminan automáticamente y su limpieza requiere autorización.

## 18. Mapa de datos FEEDBACK, CATALOG, ADMIN, UTILITIES e Inbox — primera pasada 2026-11-23

Fuente: definiciones de hojas, mapas de columnas, encabezados versionados y accesos observados en los módulos de servicio de la rama. Como en §17, esto describe contratos del código; no es una lectura de datos reales de Spreadsheet.

### 18.1 CATALOG

Hojas declaradas: `Cortes`, `LogosMarca`, `Tutorial` y `Relay`.

| Hoja | Mapa físico declarado |
|---|---|
| `Cortes` | A:AP (1–42), mismo mapa base descrito en §17.4. VIN se resuelve por encabezado; indicadores de testigo se agregan al mapa si existen. |
| `LogosMarca` | A:C: `id`, `nombreMarca`, `urlLogo` |
| `Tutorial` | A:H: `ID`, `Tema`, `Imagen`, `comoIdentificarlo`, `dondeEncontrarlo`, `Detalles`, `Video`, `Colaborador` |
| `Relay` | A:K: `ID`, `configuracion`, `funcion`, `vehiculoDondeSeUtiliza`, `pin30Entrada`, `pin85BobinaPositivo`, `pin86bobinaNegativo`, `pin87aComunCerrado`, `pin87ComunmenteAbierto`, `imagen`, `observacion` |
| `AportesVehiculo` | A:K, encabezados versionados idénticos a los documentados en §17.5; CATALOG lee el ledger para proyectar contribuciones. |

### 18.2 FEEDBACK — hojas principales

Hojas declaradas: `Cortes`, `Feedbacks`, `Contactanos` y `ActividadUsuario`. `SUGERENCIAS_ANO` es un alias de `Feedbacks`, no una hoja distinta.

| Hoja | Columnas |
|---|---|
| `Feedbacks` | A:I: `ID`, `Usuario`, `ID_vehiculo`, `Problema`, `Respuesta`, `Se resolvio`, `Responde`, `Reporte de util`, `anoSugerido` |
| `Contactanos` | A:F: `Contacto_ID`, `User_ID`, `Asunto`, `Mensaje`, `Respuesta_mensaje`, `ID_usuario_responde` |
| `ActividadUsuario` | A:G: `id`, `timestamp`, `idUsuario`, `nombreUsuario`, `tipoActividad`, `idElementoAsociado`, `detalle` |
| `Cortes` | Mapa base A:AP descrito en §17.4; el código de FEEDBACK también consulta datos del catálogo. |

### 18.3 FEEDBACK — PyS, tutoriales, vídeo y eventos

| Hoja | Columnas / encabezados |
|---|---|
| `pys` | A:J: `id_problem`, `Problema`, `Descripción`, `Se soluciono`, `Solucion`, `Prevenir`, `Imagen`, `Video`, `Colaborador`, `modelos_asociados` |
| `PysOperations` | A:H: `opId`, `payloadHash`, `problemId`, `status`, `imageFileId`, `imageUrl`, `createdAt`, `updatedAt` |
| `Tutorial` | A:H, encabezados descritos en §18.1 |
| `TutorialTitleEvents` | A:H: `operationId`, `eventHash`, `tutorialId`, `action`, `titleKey`, `previousTitleKey`, `payloadHash`, `createdAt` |
| `TutorialEditEvents` | A:F: `operationId`, `payloadHash`, `tutorialId`, `expectedHash`, `snapshotJson`, `createdAt` |
| `TutorialRenameEvents` | A:F: `operationId`, `payloadHash`, `tutorialId`, `expectedTitleKey`, `title`, `createdAt` |
| `VideoApprovalEvents` | A:F: `eventId`, `payloadHash`, `itemId`, `decision`, `snapshotJson`, `createdAt` |
| `FeedbackReportImageEvents` | A:J: `eventId`, `reportId`, `userId`, `imageFileId`, `imageUrl`, `imageName`, `imageMimeType`, `imageSize`, `imageSha256`, `createdAt` |
| `FeedbackLikes`, `FeedbackYearApplications`, `FeedbackYearApplicationEvents` | Hojas localizadas en el código; sus encabezados/columnas exactos aún deben extraerse y contrastarse. |

FEEDBACK también utiliza `__IdentifierSequenceConfig__` (A:G, contrato descrito en §17.6) y `__IdentifierSequenceReservations__` (A:F: `reservationId`, `sheet`, `column`, `reservedSuffix`, `baseSuffix`, `createdAt`).

### 18.4 Inbox — tablas de conversaciones directas

El módulo `JS/Services/InboxConversations.js` define cinco hojas separadas de Feedback/Contactanos:

| Hoja | Columnas |
|---|---|
| `InboxConversations` | A:Q (17): `conversationId`, `createdAt`, `updatedAt`, `subject`, `category`, `type`, `status`, `createdById`, `createdByName`, `createdByRole`, `participantsJson`, `createKey`, `createHash`, `lastMessageId`, `lastMessageAt`, `lastMessagePreview`, `messageCount` |
| `InboxMessages` | A:I (9): `messageId`, `conversationId`, `createdAt`, `authorId`, `authorName`, `authorRole`, `body`, `idempotencyKey`, `payloadHash` |
| `InboxConversationState` | A:J (10): `conversationId`, `userId`, `lastReadAt`, `lastReadMessageId`, `archived`, `hasSent`, `hasReceived`, `updatedAt`, `lastReceivedMessageId`, `lastSentMessageId` |
| `InboxConversationFlags` | A:E (5): `conversationId`, `userId`, `unreadOverride`, `deleted`, `updatedAt` |
| `InboxConversationAudit` | A:H (8): `eventId`, `timestamp`, `actorId`, `actorName`, `action`, `conversationId`, `messageId`, `details` |

La separación de tablas, las marcas de archivo/lectura/borrado por usuario y la auditoría son parte del contrato; no reemplazar las tablas por una columna de estado única ni convertir el borrado lógico por participante en borrado físico.

### 18.5 ADMIN — hojas y diarios versionados identificados

Hojas directas/localizadas: `Cortes`, `LogosMarca`, `Tutorial`, `Relay`, `AdminState`, `Idempotencia`, `Idempotencia_Cortes`, `Imagenes_Reemplazadas`, `Users`, `Feedbacks`, `pys` y `ActividadUsuario`. También consume `AportesVehiculo` e `ImageUploadEvents`.

| Hoja | Encabezados |
|---|---|
| `AdminImageUploads` | A:L: `opId`, `vehicleId`, `fieldName`, `urlAnterior`, `urlNueva`, `archivoDriveId`, `contentHash`, `tipoMime`, `nombreArchivo`, `estado`, `fechaCreacion`, `fechaActualizacion` |
| `ImageUploadLedger` | A:Q: `token`, `operationKey`, `folderId`, `mimeType`, `sizeBytes`, `contentHash`, `fileId`, `fileUrl`, `state`, `referenceSheet`, `referenceRow`, `referenceColumns`, `referencesJson`, `fileName`, `createdAt`, `updatedAt`, `lastError` |
| `ImageUploadEvents` | A:N, encabezados descritos en §17.5 |
| `AportesVehiculo` | A:K, encabezados descritos en §17.5 |
| `Idempotencia` / `Idempotencia_Cortes` | A:F, encabezados descritos en §17.5 |
| `__IdentifierFormulaFreezeManifest__` | A:H: `migrationId`, `digest`, `entryIndex`, `entryJson`, `status`, `batch`, `updatedAt`, `lastError` |
| `__IdentifierMigrationManifest__` | A:I: `migrationId`, `manifestDigest`, `entryIndex`, `entryJson`, `status`, `batch`, `createdAt`, `updatedAt`, `lastError` |
| `__IdentifierSequenceConfig__` | A:G, contrato descrito en §17.6 |

`AdminState` e `Imagenes_Reemplazadas` están identificadas como hojas, pero sus esquemas completos no se han extraído todavía. Tampoco se considera cerrado el inventario de hojas auxiliares que se crean dinámicamente dentro de ADMIN.

### 18.6 UTILITIES

UTILITIES expone únicamente `migrateTimestamps` por su `doPost` directo. Usa `Cortes` como origen, `Hoja 1` como destino y hojas técnicas `__utilities_timestamps_staging__` / `__utilities_timestamps_backup__` para staging y recuperación. El campo de imagen consultado en origen está en la columna I (9). El contrato completo de rangos, columnas de destino, backup y rollback aún debe detallarse desde el handler; no se asume que Hoja 1 sea una tabla equivalente a Cortes.

### 18.7 Dependencias entre servicios detectadas durante el inventario

- ADMIN declara URLs de AUTH, USERS, WRITE, CATALOG y FEEDBACK y contiene wrappers que invocan `UrlFetchApp.fetch`; por tanto, mantiene llamadas backend→backend y dependencias de endpoints hardcodeados que deben migrarse en MIG-004/MIG-011. No se copian los valores de URL a esta matriz.
- ADMIN también lee una propiedad de ScriptProperties para el secreto de telemetría CATALOG; CATALOG declara la propiedad correspondiente para validación de tráfico. El inventario de propiedades/lectores/escritores corresponde a MIG-003.
- Coordinator conserva propiedades de leases, contexto/sesiones, revisiones y eventos de catálogo, y contadores de tráfico. Sus funciones son capacidades existentes que deben inventariarse y trasladarse antes de retirarlo.
- UTILITIES declara que recibe actor confiable de Coordinator y requiere contexto de sesión compartido. Su endpoint directo no elimina esa dependencia funcional.
- No se modificó ninguno de estos módulos ni sus endpoints; son hallazgos de inventario, no correcciones.

### 18.8 Límites pendientes de esta pasada

- Extraer columnas/encabezados de `FeedbackLikes`, `FeedbackYearApplications`, `FeedbackYearApplicationEvents`, `AdminState` e `Imagenes_Reemplazadas`, además de las hojas creadas por acciones ADMIN.
- Terminar los esquemas y rangos de `Hoja 1`, staging/backup de UTILITIES y las hojas de CATALOG/FEEDBACK que se crean por flujo.
- Trazar cada hoja a las acciones concretas, columnas leídas/escritas, permisos, efectos Drive/YouTube/Mail y pruebas de paridad.
- Revisar manifiestos y configuración de los proyectos Apps Script para detectar triggers instalados. El escaneo estático previo de módulos principales no demuestra ausencia global de triggers.



### 18.9 Esquemas pendientes completados y discrepancias del contrato de restauración

- `FeedbackLikes` A:G: `actorKey`, `vehicleId`, `corteIndex`, `previousCount`, `targetCount`, `status`, `createdAt`.
- `FeedbackYearApplications` A:P: `operationId`, `vehicleId`, `year`, `previousFrom`, `previousTo`, `targetFrom`, `targetTo`, `voteCount`, `status`, `activityAttempted`, `createdAt`, `updatedAt`, `previousRawFrom`, `previousSourceFromEventId`, `previousRawTo`, `previousSourceToEventId`. Las primeras 12 columnas son el esquema heredado y M:P son una extensión versionada que el código inicializa/verifica.
- `FeedbackYearApplicationEvents` A:E: `eventId`, `operationId`, `eventType`, `createdAt`, `payloadJson`.
- `AdminState` A:F: `Action`, `LastIndex`, `Total`, `Percentage`, `Date`, `ProcessId`.
- `Imagenes_Reemplazadas` conserva A:K histórico: `id_reemplazo`, `fecha_reemplazo`, `tipo_contenido`, `registro_id`, `campo`, `archivo_drive_id`, `nombre_archivo`, `url_anterior`, `sustituida_por_url`, `referencia_texto`, `estado`. ADMIN añade hasta 16 encabezados de inventario/organización por nombre, sin desplazar la base: `origen_registro`, `tipo_mime`, `ubicacion_original`, `fecha_creacion_drive`, `fecha_deteccion`, `url_visualizacion`, `ubicacion_actual`, `ultima_auditoria_id`, `tipo_registro`, `estado_organizacion`, `error_organizacion`, `fecha_organizacion`, `estado_previo_papelera`, `ultima_operacion_inventario_id`, `resultado_inventario`, `detalle_resultado_inventario`. El orden/posición de estas columnas añadidas depende de las columnas existentes y se resuelve por encabezado.

La función de respaldo/restauración de ADMIN declara un esquema requerido propio. La comparación estática detecta diferencias que deben resolverse antes de migrar o confiar en una restauración:

1. `ADMIN_RESTORE_REQUIRED_SCHEMA_.ActiveSessions` exige A:F, mientras AUTH define también G (`SessionTermsAcceptance`). El proceso de restauración puede no validar esa columna adicional.
2. `ADMIN_RESTORE_REQUIRED_SCHEMA_.Cortes` enumera A:AP (42 columnas) y no incluye la posición dinámica de VIN ni AT:AV (`activaTestigo1..3`) que WRITE utiliza. Debe comprobarse que backup/restauración preserve esos datos aunque no estén en el esquema requerido actual.
3. El esquema de restauración llama `Data` a la columna D de `Logs`; AUTH escribe allí el JSON de detalles. El nombre semántico no coincide (`Data` frente a `details`), aunque ambos ocupen la cuarta columna.

Estas diferencias son hallazgos de inventario, no defectos confirmados de restauración: falta ejecutar pruebas con copias aisladas que contengan esos campos y revisar el algoritmo completo de backup/restore. No modificar encabezados ni datos reales para resolverlas durante MIG-001.


---

## 19. Cierre de inventario MIG-001 — cobertura total de código, operaciones y validación (2026-11-23)

Este apartado consolida el inventario estático de la rama y cierra los pendientes de MIG-001. La fuente es el árbol Git completo de la rama, los routers y funciones de los diez archivos backend, los módulos frontend/HTML, las pruebas y los manifiestos/workflows versionados. No equivale a inspeccionar deployments, proyectos Apps Script externos ni datos reales de Spreadsheet/Drive.

### 19.1 Universo de archivos y funciones inspeccionado

El árbol Git consultado no está truncado: **615 rutas** en total. Se identificaron:

| Área | Inventario verificado |
|---|---|
| Backend Apps Script versionado | 10 archivos: Auth, Coordinator, InboxConversations, SharedMutationClient, Utilities, admin, catalog, feedback, users y write |
| Funciones backend | 1,041 declaraciones de función con nombre en los diez archivos |
| Frontend | 37 módulos JS/MJS bajo `JS/Frontend/` |
| Superficies HTML | `index.html`, `HTML/add_cortes.html` y `HTML/users.html` |
| Pruebas | 373 entradas bajo `JS/Tests/` |
| Workflows | 3 workflows de GitHub Actions |
| Documentación de despliegue | `Services/` contiene guías/diseños/health; no contiene proyectos Apps Script ni código de servicio desplegable |

Recuento por archivo backend (funciones con nombre; los handlers son un subconjunto):

| Archivo | Funciones | Funciones con prefijo `handle` | Rutas/acciones observadas |
|---|---:|---:|---:|
| Auth.js | 91 | 15 | 15 |
| users.js | 36 | 3 | 3 |
| write.js | 148 | 14 | 9 |
| catalog.js | 28 | 6 | 6 (5 canónicas + compatibilidad `getSuggestion`) |
| feedback.js | 213 | 33 | 41, incluyendo el dispatcher delegado de Inbox |
| InboxConversations.js | 44 | 11 | 11 handlers llamados desde FEEDBACK |
| admin.js | 398 | 51 | 46 |
| Utilities.js | 12 | 0 | 1 acción directa `migrateTimestamps` |
| Coordinator.js | 41 | 1 (`handleRequest`) | 13 operaciones internas |
| SharedMutationClient.js | 30 | 2 endpoints internos de caché | cliente y adaptadores de coordinación |
| **Total** | **1,041** | — | — |

Los conteos de funciones incluyen helpers privados, validadores, normalizadores, proyecciones, adaptadores de Drive, lógica de recuperación y wrappers; no deben interpretarse como número de endpoints. WRITE tiene helpers `handle*` internos que no son acciones públicas adicionales. FEEDBACK delega las operaciones Inbox a `InboxConversations.js`. ADMIN contiene helpers internos de respaldo/restauración, migraciones, Drive, auditoría, imágenes y proyección que no deben retirarse al consolidar acciones.

Los 37 módulos frontend se revisaron en el árbol: VinDifferentialEngine, activityDashboard, adminImageUploadIsolation, api-config, auth, catalogRequest, catalogStatus, clientInteractionPolicy, developerConsoleConfirmation, diagnosticLogger, driveStorageAlerts, editBackupStore, imageObjectUrlCache, inboxPageCache, lightbox, likeState, main, modalNavigation, navigation, navigationHistory, offline, overlayHistory, pendingOperationStore, printQr, pys-data, qrcode-generator, rich-text, search-utils, serviceTelemetry, share-utils, state, termsDeviceAcceptance, thumbnailCompressionQueue, ui, validationBannerLifecycle, validationSubmission y youtubeUpload.

Los consumidores de acciones se concentran en `api-config.js`, `ui.js`, `auth.js`, `main.js`, `pys-data.js`, `youtubeUpload.js`, `add_cortes.html` y `users.html`. Los demás módulos sostienen navegación, caché, PWA, multimedia, impresión, historial, telemetría, controles y estados de interfaz; son dependencias de capacidad aunque no invoquen un endpoint por nombre.

### 19.2 Acciones, handlers, compatibilidad y rutas no públicas

Se reconcilió el mapa efectivo con los routers reales:

| Servicio | Acciones canónicas en el mapa | Dispatcher backend | Observación |
|---|---:|---:|---|
| AUTH | 15 | 15 | Coincidencia exacta |
| CATALOG | 5 | 6 | Incluye compatibilidad histórica `getSuggestion`, canónica en WRITE |
| WRITE | 9 | 9 | Coincidencia exacta |
| USERS | 3 | 3 | Coincidencia exacta |
| FEEDBACK | 41 | 41 | Incluye las operaciones de Inbox delegadas |
| UTILITIES | 1 | 1 | Router directo; no usa switch de acciones |
| ADMIN | 46 | 46 | Incluye ping inline y handlers administrativos |
| **Mapa frontend** | **120** | — | 120 claves únicas; ninguna clave duplicada |

Resultado de la reconciliación: **120/120 acciones del mapa tienen ruta backend y handler/ejecución identificada; cero acciones mapeadas sin handler**. La compatibilidad adicional CATALOG `getSuggestion` no se cuenta como una acción canónica adicional del mapa.

Se conservan además, fuera de las 120 acciones:

- **13 operaciones privadas de Coordinator:** `acquire`, `release`, `validate`, `publishCatalogChange`, `publishCatalogChanges`, `getCatalogChanges`, `registerSession`, `syncUserSessions`, `revokeSession`, `revokeUserSessions`, `validateSessionContext`, `invalidateSessionActorCaches` y `getServiceTraffic`.
- **8 rutas privadas de caché de actor:** `__invalidateSessionActorCache` y `__primeSessionActorCache` en USERS, WRITE, FEEDBACK y ADMIN.
- **GET de salud** en los servicios, GET `catalogFeed=1` para el feed incremental y parámetros de diagnóstico `debug=true` donde están implementados.
- **Rutas de rechazo/compatibilidad:** CATALOG acepta `getSuggestion` como ruta histórica; ADMIN conserva respuestas explícitas `ACTION_MOVED_TO_WRITE` para operaciones que ahora pertenecen a WRITE; UTILITIES recibe `migrateTimestamps` por su dispatcher directo.
- **Acciones de Inbox:** FEEDBACK resuelve las once acciones de conversación/participantes por medio de `runInboxConversationAction_` y `InboxConversations.js`; no son un servicio o endpoint independiente.

La matriz §9 mantiene la relación individual de las 120 acciones con servicio, handler y consumidor. Las §§10 y 14–18 documentan RBAC, contratos, hojas y dependencias. No se encontró consumidor directo para doce acciones; su clasificación y pruebas se detallan en §19.5.

### 19.3 Contratos de entrada/salida restantes por servicio

Los contratos AUTH, USERS y WRITE permanecen en §§14–16. Esta tabla complementa esos contratos con los servicios restantes. Los campos listados son los que el handler lee directamente del payload o los campos de negocio que delega a validadores específicos; el contexto confiable de sesión se adjunta en backend y no convierte `userId` o el rol enviado por navegador en autoridad.

**CATALOG**

| Acción | Entrada/selector observado | Resultado principal |
|---|---|---|
| `getCatalogData` | opciones de refresco/paginación y selección de campos (`forceRefresh`, `shift`, `map`, `slice`) | `data`, `source`, estado |
| `getDropdownData` | sin campos de negocio obligatorios | listas de categoría, marca, tipo de corte/encendido y configuración de relay |
| `getVehicleProjection` | `vehicleId` | `vehicle`, `source`, `readOnly` |
| `getContributionCandidates` | `limit`; opción de inventario `includeImageInventoryEvents`; el acceso a metadatos internos requiere secreto CATALOG validado en servidor | candidatos, total, límite/truncamiento, origen, estado de solo lectura y eventos de inventario cuando se autoriza |
| `getNavigationData` | sin campos de negocio obligatorios | `data`, `source` |
| `getSuggestion` (compatibilidad) | `term`, `field`, `brand` según el contrato histórico | `suggestion`; la ruta canónica permanece en WRITE |

**FEEDBACK y operaciones de negocio no Inbox**

| Acción | Entrada/selector directo identificado | Resultado principal / dependencia |
|---|---|---|
| `getRichTextMode` | contexto de sesión | estado y modo global |
| `setRichTextMode` | `mode` y sesión | estado y modo confirmado |
| `suggestYear` | propuesta de año, vehículo e identidad de actor; permite ruta anónima expresamente definida | estado de registro/aplicación, recuperación y resultado de umbral |
| `recordLike` | `vehicleId`, `corteIndex`, identidad/nombre de usuario asociados | `alreadyLiked`, `likeCount`, recuperación; hojas FeedbackLikes/Cortes/ActividadUsuario |
| `reportProblem` | `reportId`, `corteIndex`, `activaTestigoMotor`, `category`, `subject`, `imageAttachment` | estado, ID, categoría/asunto, duplicado y metadatos de adjunto |
| `sendContactForm` | `name`, `email`, `message` | estado y mensaje |
| `getFeedbackItems` | actor autenticado y paginación/cursor | items y `nextCursor` |
| `getMyProblemReports` | paginación (`length`/cursor) | data, cursor, `hasMore`, total |
| `replyToFeedback`, `markAsResolved` | ID del reporte y contenido/estado validados por sus handlers | estado y mensaje; Feedbacks |
| `recordVehicleView` | `vehicleId` | estado; telemetría/actividad |
| `getActivityLogs` | filtros/paginación según handler | data; ActividadUsuario |
| `suggestCutChange` | payload de propuesta validado por normalizadores de campos, imágenes y contexto de corte | registro/replay de sugerencia; Feedbacks y adjuntos Drive cuando se aportan |
| `getCatalogChanges` | `cursor`, `limit` | eventos/deltas; además existe la ruta GET incremental `catalogFeed=1` |
| `getPysData` | sin selector obligatorio | data de PyS |
| `addProblem` | problema, descripción, solución/previsión inicial, imagen y alcance/modelos según validador | ID/estado/replay; pys y PysOperations, Drive si hay imagen |
| `addSolution`, `addPrevention` | ID de problema y texto de solución/previsión validados | estado/replay; pys |
| `addTutorial` | tema, imagen, contenido y colaborador según validador | `referenceId`, estado/replay; Tutorial y eventos de título/edición |
| `deleteFeedbackItem` | ID/tipo del elemento y control de rol | estado; eliminación lógica/física según tipo autorizado |
| `addVehicleToProblem`, `removeVehicleFromProblem` | ID de problema y vehículo | estado y lista `modelosAsociados`; pys/Cortes |
| `clearActivityLogs` | `keepLastWeek` | conteo eliminado y registros no clasificados retenidos |
| `initYouTubeUpload` | metadatos iniciales del destino/contenido | `opVideoId`, `uploadUrl`; sesión resumable de YouTube |
| `getVideoApprovalByOperation` | `createdByUserId`, estado, tipo y referencia de contenido, URL de vídeo | encontrado, ID de operación, estado de aprobación y destino |
| `submitVideoForApproval` | `createdByUserId`, `contentType`, `referenceId`, `videoId`, `videoUrl`, título, descripción y estado | ID, `opVideoId`, URL y estado de aprobación; Feedbacks/eventos |
| `approveVideo`, `rejectVideo` | ID de aprobación/operación y decisión validada | resultado idempotente; VideoApprovalEvents y publicación/compensación del destino |
| `updatePysItem` | payload de edición de PyS validado, incluido control de rol y vídeo | estado, cambio y URL confirmada; pys |
| `updateTutorialItem` | ID/identidad de tutorial, campos editables, hash esperado y vídeo sujeto a aprobación | estado, contenido y recuperación; Tutorial y eventos |

**Inbox (FEEDBACK + InboxConversations.js)**

| Acción | Entrada principal | Resultado / efecto |
|---|---|---|
| `getInboxRecipients` | sesión | destinatarios filtrados por jerarquía |
| `notifyDevelopersDriveCritical` | `usagePercent`, `alertDate` | notificación y número de desarrolladores; evita duplicar avisos según su control de estado |
| `getInboxConversations` | `folder`, `category`, `query`, `cursor`, `pageSize` | lista paginada/proyección por participante |
| `getInboxMessages` | `conversationId`, `cursor`, `pageSize` | mensajes y total |
| `createInboxConversation` | `subject`, `body`, `category`, `idempotencyKey`, `recipientId` | conversación/mensaje y replay idempotente |
| `sendInboxMessage` | `conversationId`, `body`, `idempotencyKey` | mensaje y replay idempotente |
| `markInboxRead` | `conversationId`, `throughMessageId` | estado y contador no leído |
| `markInboxUnread` | `conversationId` | estado, ya marcado y desarchivado si corresponde |
| `deleteInboxConversation` | `conversationId` | ocultación lógica solo para el participante; conserva mensajes e historial |
| `archiveInboxConversation` | `conversationId`, `archived` | estado de archivado por participante |
| `closeInboxConversation` | `conversationId` | cierre idempotente de conversación |

**ADMIN y UTILITIES**

La tabla §9 conserva la correspondencia de las 46 acciones ADMIN con sus handlers. Para evitar que los contratos se reduzcan a una lista de nombres, se agrupan aquí por tipo de operación y se enumeran los campos de control que gobiernan su ejecución:

| Grupo / acciones | Campos de entrada/control identificados | Respuesta / efectos principales |
|---|---|---|
| Salud y telemetría: `ping`, `getServiceTraffic` | ping sin payload de negocio; consulta de métricas con filtros/ventana del panel | identidad/estado/versión de ADMIN; tráfico agregado Coordinator, no conteo completo de solicitudes directas |
| Backups/restauración: `backupDatabase`, `backupDrive`, `restoreDatabase`, `restoreDrive`, `reorganizeDatabase` | `backupId` cuando se restaura; IDs de carpeta/operación y estado reanudable para Drive | manifiestos, conteos, rollback y errores de limpieza; Spreadsheet y Drive |
| Migraciones/IDs: `migrateCortesOperationIds`, `migrateIdentifiers`, `rollbackIdentifiers`, `auditIdentifiers`, `freezeIdentifierFormulas`, `migrateVehicleContributionsSchema`, `migrateReplacedImagesSchema` | `confirm`, `migrationId`, digest, lote/offset, respaldo, encabezados/hoja destino según acción | dry-run, manifiestos, snapshots, estado por lote, rollback y verificación de lectura posterior |
| Catálogo y contribuciones: `getVehicleContributionCandidates`, `resolveVehicleContributionCandidate`, `addLogo` | `limit`, `eventId`, `requestId`, `decision`, `correctedPayload`; datos/logo de marca | candidatos de ledger, decisión append-only/supersedes, ID de logo y publicación de delta |
| Modelos/cortes: `updateVehicleField`, `uploadAdminImage`, `getAdminImageUploadStatus`, `restoreAllTrashedImages` | `vehicleId`, `fieldName`, `value`, valor/hash esperado, ID de operación y datos de imagen | proyección, versión, compensación, integridad de archivo y estado de carga |
| Cortes/imágenes y reconciliación: `previewCortesImageReconciliation`, `applyCortesImageReconciliation`, `previewCortesImageOrganizer`, `getCortesImageOrganizerOperations`, `applyCortesImageOrganizer`, `rollbackCortesImageOrganizer` | `auditId`, `manifestDigest`, `approvedFileIds`, `operationIds`, `confirm/confirmed`, `backupId`, paginación | plan read-only, aplicación explícita, ledger durable, rollback y resultados parciales |
| Inventario y archivos reemplazados: `getReplacedImages`, `recoverReplacedImage`, `deleteReplacedImage`, `restoreReplacedImageFromTrash`, `permanentlyDeleteReplacedImage`, `markReplacedImageInUse`, `getReplacedImageDownloadUrl`, `moveReplacedImage` | `id_reemplazo`, `targetFolderId`, tipo/estado/confirmación según acción | historial, ACL, papelera, restauración, borrado definitivo protegido, URL de descarga y ruta final |
| Drive/terminal: `driveCommand`, `getDriveStorage`, `getCortesImageFolders`, `createCortesImageFolder` | comando y argumentos; `category`, `brand`, `model` al crear carpeta | árbol/carpeta/almacenamiento; navegación restringida al árbol Cortes |
| Procesos de archivos: `normalizeImages`, `organizePrimaryVehicleImages`, `reconcilePendingImageUploads`, `auditDriveImagesInCortes`, `saveUnusedImagesInventory` | `processId`, `startRow`, `limit`, `cursor`, `mode`, `files`, `auditId`, `confirmed`, `inventoryOperationId` | progreso por lotes, dry-run, conteos, conflictos, ledger, reanudación y estado de error |
| Herramientas de esquema: `createSheet`, `addColumn` | nombre de hoja, encabezados, fórmula ID opcional; nombre de columna | resultado de creación/añadido tras validar nombre, encabezados y fórmula |
| Acciones de WRITE delegadas históricamente | `addOrUpdateCut`, `addSupplementaryInfo`, `checkOperation` en wrapper/compatibilidad | los handlers canónicos están en WRITE; ADMIN ya no debe duplicar su autoridad |

ADMIN aplica `assertDeveloperSession` a las acciones generales; solo las acciones incluidas en `ADMIN_MODAL_EDIT_ACTIONS` (`getDropdownData`, `updateVehicleField`, `uploadAdminImage`, `getAdminImageUploadStatus`) aceptan también Jefe/Supervisor. `ping` es la excepción de salud sin sesión. La autorización se ejecuta en servidor mediante actor confiable. La matriz exacta y sus excepciones permanecen en §10 y en `ActionDispatchContract.js`.

UTILITIES recibe únicamente `migrateTimestamps`: exige actor Desarrollador confiable, lee `Cortes`, consulta la columna I (`imagenVehiculo`), calcula timestamps y sustituye `Hoja 1` mediante staging/backup, verificación y recuperación. Las hojas temporales son `__utilities_timestamps_staging__` y `__utilities_timestamps_backup__`. No hay un consumidor frontend directo; se conserva como mantenimiento manual.

### 19.4 Configuración, estado operativo e integraciones externas — inventario completo de fuentes versionadas

**Referencias de recursos fijadas en código**

- AUTH, USERS, WRITE, CATALOG, FEEDBACK, ADMIN y UTILITIES declaran `SPREADSHEET_ID` local con el mismo identificador de la base.
- WRITE, FEEDBACK y ADMIN declaran también `DRIVE_FOLDER_ID` para la carpeta raíz Cortes.
- ADMIN declara URLs directas de AUTH, USERS, WRITE, CATALOG y FEEDBACK para sus wrappers actuales.
- `JS/Frontend/api-config.js` declara siete endpoints: AUTH, CATALOG, WRITE, USERS, FEEDBACK, UTILITIES y ADMIN.
- Coordinator construye destinos mediante propiedades `GPSpedia_SERVICE_URL_<servicio>`; no tiene un mapa de Spreadsheet propio.
- El árbol no contiene `appsscript.json`, `.clasp.json`, archivos `.gs` ni configuración de proyecto Apps Script. El archivo raíz `manifest.json` es el manifiesto PWA/web app, no el manifiesto Apps Script.

**PropertiesService: claves de configuración y estado observadas**

| Servicio | Claves/uso observado | Clasificación para MIG-003 |
|---|---|---|
| AUTH | `GPSpedia_COORDINATOR_URL`, `GPSpedia_COORDINATOR_SECRET` | configuración de interconexión que debe desaparecer |
| AUTH | `GPSpedia_PASSWORD_RECOVERY_SECRET_V1` | secreto criptográfico de recuperación; no mover al navegador ni a una hoja pública; requiere decisión de diseño segura |
| AUTH | `login_request_<requestId>`, `role_revocation_pending_<userId>` | estado temporal/idempotencia y marcador de revocación; no confundir con configuración |
| USERS | no se detectó PropertiesService; conserva `SPREADSHEET_ID` constante | configuración fija incrustada |
| WRITE | `GPSpedia_CORTES_LAST_ID` | contador operativo de IDs; debe migrarse como estado, no tratarse como endpoint |
| CATALOG | `GPSpedia_CATALOG_TRAFFIC_SECRET` | secreto de autorización interna de inventario; no exponer al frontend |
| FEEDBACK | `GPSpedia_COORDINATOR_URL`, `GPSpedia_COORDINATOR_SECRET` | configuración de interconexión |
| FEEDBACK | propiedad de modo de texto enriquecido (`RICH_TEXT_MODE_PROPERTY_`) | preferencia global de producto; debe residir en configuración central |
| ADMIN | `GPSpedia_CATALOG_TRAFFIC_SECRET`, `LOGOS_MARCA_ID_COUNTER` | secreto de consulta interna y contador de IDs |
| ADMIN | claves dinámicas de auditoría Drive, selección de carpeta, estado/ledger de organizador y estado de operación | estado de ejecución/reanudación, no configuración de endpoints |
| Coordinator | `GPSpedia_COORDINATOR_SECRET_<service>`, `GPSpedia_SERVICE_URL_<target>` | secretos y URLs de interconexión |
| Coordinator | leases, contextos de autenticación por usuario, índice token→usuario, epochs, eventos/revisiones del catálogo y buckets de tráfico | estado operativo central hoy persistido en ScriptProperties |
| SharedMutationClient | `GPSpedia_COORDINATOR_URL`, `GPSpedia_COORDINATOR_SECRET` | configuración de interconexión duplicada en consumidores |
| UTILITIES | sin uso directo de PropertiesService en el archivo actual | mantiene ID fijo y estado de migración en hojas temporales |

AUTH usa además CacheService para intentos fallidos/reservas de login y estado de recuperación; ADMIN usa CacheService para verificar respaldos por sesión y mantener referencias temporales de auditoría; Coordinator y servicios usan cachés locales de actor. Estos estados efímeros no son equivalentes a configuración central. La migración deberá decidir explícitamente cuáles se reconstruyen desde Spreadsheet, cuáles pueden permanecer en caché de ejecución y cuáles requieren caducidad/recuperación.

**Integraciones Google y externas**

| API/servicio | Consumidores | Función |
|---|---|---|
| SpreadsheetApp | todos los servicios excepto Coordinator/SharedMutationClient | lectura/escritura de datos, configuración, sesiones, ledgers, backups y hojas temporales |
| DriveApp | WRITE, FEEDBACK, ADMIN, UTILITIES | archivos/carpetas, imágenes, backups, ACL, papelera, auditoría y staging |
| Drive REST API v3 vía UrlFetchApp + OAuth de Apps Script | ADMIN | cuota/almacenamiento y operaciones de metadatos/archivos cuando DriveApp no cubre el caso |
| YouTube Data API resumable | FEEDBACK y cliente `youtubeUpload.js` | iniciar sesión de carga, transferir vídeo, consultar/aprobar/rechazar y publicar destino |
| MailApp | AUTH | envío de códigos/enlaces de recuperación de contraseña |
| UrlFetchApp entre servicios GPSpedia | ADMIN→WRITE/CATALOG; SharedMutationClient→Coordinator; Coordinator→servicios para precarga/invalidez; AUTH/FEEDBACK/UTILITIES→Coordinator | llamadas backend→backend que MIG-004/MIG-011 deberán sustituir por orquestación frontend, sin perder resultados/compensación |
| UrlFetchApp a recursos externos | WRITE/ADMIN/FEEDBACK | descarga/validación de imágenes y llamadas API externas; no confundirlas con llamadas a otro servicio GPSpedia |
| OAuth administrado por Apps Script | ADMIN/FEEDBACK | autorización de Google Drive/YouTube; los tokens no se trasladan al navegador |

El navegador mantiene capacidades adicionales que forman parte del inventario: IndexedDB para catálogo, operaciones pendientes, borradores, vídeos y auditorías; localStorage para preferencias/sesión donde corresponda; Cache API/service worker para PWA/offline; FileReader, Blob/ObjectURL, canvas y cola de miniaturas para multimedia; impresión y QR locales; telemetría de navegador. No se debe sustituir la capa backend sin mantener esos contratos de persistencia y recuperación.

### 19.5 Acciones sin consumidor directo: clasificación y prueba asociada

Las doce acciones identificadas en §9.1 quedan clasificadas y conservadas:

| Acción | Clasificación final de inventario | Evidencia/prueba existente localizada |
|---|---|---|
| `touchSession` | compatibilidad de actividad de sesión; sin consumidor frontend directo | `SessionActivityCoordination.mjs`, `SessionActivityLeaseMinimization.mjs`, contrato de sesión AUTH |
| `benchmarkPasswordKdf` | diagnóstico manual exclusivo de Desarrollador, read-only | `PasswordKdfBenchmark.mjs` |
| `getNavigationData` | lectura optimizada/compatibilidad de navegación; consumidor actual no localizado, contrastar con snapshot de catálogo | `CatalogNavigationRead.mjs` |
| `markInboxUnread` | capacidad de Inbox con handler, pendiente de conexión directa a control UI | `InboxConversations.mjs`, `InboxUi.mjs`, `InboxRoleContract.js` |
| `deleteInboxConversation` | ocultación lógica por participante; no borra mensajes físicamente | `InboxConversations.mjs`, `InboxUi.mjs`, `InboxAuditTrail.js` |
| `migrateTimestamps` | mantenimiento manual Desarrollador con staging/backup/rollback | `UtilitiesSecurity.js` |
| `migrateVehicleContributionsSchema` | mantenimiento de esquema invocado también por el flujo de candidatos cuando falta el ledger | `VehicleContributionProjection.mjs`, pruebas de ledger/proyección de aportes |
| `migrateIdentifiers` | migración administrativa por lotes, dry-run, digest y snapshot | `IdentifierMigration.mjs`, `IdentifierFormulaMigration.mjs` |
| `rollbackIdentifiers` | recuperación manual ligada a manifiesto/digest y huella verificada | `IdentifierMigration.mjs`, `IdentifierFormulaMigration.mjs` |
| `reconcilePendingImageUploads` | mantenimiento/reconciliación de cargas Drive, dry-run y confirmación | `AdminImageUploadEventReconciliation.mjs`, `ImageUploadEventJournal.mjs` |
| `createSheet` | herramienta manual de esquema Spreadsheet | `AdminSheetActionsContract.mjs` |
| `addColumn` | herramienta manual de esquema Spreadsheet | `AdminSheetActionsContract.mjs` |

No se autoriza retirar ninguna acción por falta de botón/consumidor. Para `markInboxUnread` y `deleteInboxConversation`, el inventario detecta una brecha de consumidor UI, no una ausencia de handler. Debe decidirse en la tarea de UI correspondiente si se conecta el control existente o se conserva el endpoint manual; no se amplía ni reduce su RBAC aquí.

La terminal `driveCommand` tiene comandos `dir/ls`, `cd`, `cd ..`, retorno a raíz, `mkdir`, `move` y `tree`; restringe las operaciones al árbol Cortes y no ofrece comando de borrado. Las migraciones de IDs, reconciliación de cargas, backups/restauración, auditorías e inventarios son operaciones manuales/desarrollador que requieren dry-run/confirmación, manifiesto, respaldo, ledger o rollback según la acción.

### 19.6 Trazabilidad de capacidades CAP-01 a CAP-19

| Capacidad | UI/consumidores principales | Backend/datos principales | Pruebas existentes representativas |
|---|---|---|---|
| CAP-01 Catálogo/navegación | index, main, navigation, search-utils, api-config | CATALOG; Cortes, LogosMarca, Tutorial, Relay; feed Coordinator | CatalogNavigationRead, CatalogDropdownRead, CatalogSnapshotSync, CatalogChangeFeed, CatalogStartupIntegrity |
| CAP-02 Modelos/cortes/contribuciones | add_cortes, ui, VinDifferentialEngine | WRITE/ADMIN/CATALOG; Cortes, Relay, AportesVehiculo, idempotencia | CutPayloadValidation, AddCutOperationIntegrity, AddSupplementaryInfoIntegrity, VehicleContributionProjection |
| CAP-03 VIN | add_cortes, ui, VinDifferentialEngine | WRITE/ADMIN; Cortes.VIN dinámico, AT:AV | VinAuthoritativeValidation, VinContextResolution, VinTestigoIntegrity, NavigationVinCollection |
| CAP-04 Imágenes | ui, add_cortes, youtubeUpload auxiliar, lightbox, imageObjectUrlCache, thumbnailCompressionQueue | WRITE/FEEDBACK/ADMIN; Drive, ImageUploadLedger, ImageUploadEvents, reportes/PyS | ImageUploadLedger, ImageUploadEventJournal, AdminImageUploadIsolation, ImageResolutionVariants, CortesImageReconciliation* |
| CAP-05 Vídeos | youtubeUpload, ui, Inbox | FEEDBACK; YouTube resumable, VideoApprovalEvents, Feedbacks/pys/Tutorial | YouTubeUploadClient, YouTubeUploadCheckpointRecovery, VideoApprovalContracts, VideoApprovalPublishing, SupplementaryVideoContract |
| CAP-06 PyS | pys-data, ui, activityDashboard | FEEDBACK; pys, PysOperations, Cortes, Drive | PysDataCache, PysVehicleRelationIntegrity, PysCreationIntegrity, FeedbackPys* |
| CAP-07 Tutoriales | ui, main | FEEDBACK/CATALOG; Tutorial y eventos versionados | TutorialIntegrity, FeedbackTutorialLookupBoundedRead, FeedbackTutorialPreflightOutsideLock |
| CAP-08 Feedback | main, ui, api-config | FEEDBACK; Feedbacks, Contactanos, FeedbackLikes, FeedbackYearApplications, ActivityUsuario, eventos de imagen | FeedbackWriteSecurity, FeedbackYearApplicationAppendOnly, FeedbackLikeAppendOnly, FeedbackReportImageEvents |
| CAP-09 Inbox | ui, inboxPageCache | FEEDBACK/InboxConversations; cinco hojas Inbox | InboxConversations, InboxRoleContract, InboxAuditTrail, InboxCachePagination, InboxUi, InboxStoredXss |
| CAP-10 Usuarios/identidad | auth, users.html, api-config | AUTH/USERS; Users, ActiveSessions, Logs, CacheService y contexto Coordinator | Auth, UsersAtomicMutations, PasswordRecovery, PasswordHashMigration, TermsAcceptance, SessionInvalidationFlow |
| CAP-11 Drive | ui, developer console, driveStorageAlerts | ADMIN/WRITE/FEEDBACK/UTILITIES; Drive y hojas de historial | DriveTerminalScope, DriveStorageAlerts, AdminImageTrashLifecycle, AdminDriveAudit* |
| CAP-12 Backup/restauración | ui, editBackupStore | ADMIN; Spreadsheet/Drive, manifiestos y rollback | AdminRestoreRecovery, EditBackupIsolation, AdminBackupResumeUI |
| CAP-13 Administración de datos | ui, consola Developer | ADMIN/UTILITIES/WRITE; hojas, columnas, IDs, manifiestos | AdminSheetActionsContract, IdentifierAudit, IdentifierMigration, IdentifierFormulaMigration, UtilitiesSecurity |
| CAP-14 Estado de servicios | api-config, catalogStatus, ui | GET salud de los siete servicios; ping ADMIN | ServiceHealthContract, RemoteServiceHealth, DirectTrafficRoutingCoverage |
| CAP-15 Métricas/actividad | activityDashboard, serviceTelemetry, ui | FEEDBACK/ADMIN/Coordinator; ActividadUsuario, tráfico, almacenamiento | ActivityDashboardContributions, ActivityDashboardInsights, ServiceTrafficAggregatorContract, ServiceTrafficAggregation |
| CAP-16 Herramientas Developer | ui, developerConsoleConfirmation, diagnosticLogger | ADMIN/AUTH/UTILITIES/Coordinator | DeveloperConsoleRouting, DeveloperConsoleConfirmation, DeveloperPrivilegeRouting, DeveloperOperationMessages |
| CAP-17 PWA/experiencia/cache | main, offline, state, service-worker, navigation, catalogRequest | navegador, IndexedDB, Cache API, service worker y CATALOG | PWAStartupScenarios, ServiceWorkerCache, IndexedDBTransactions, CatalogRequestRetry, CatalogStartupParallelism |
| CAP-18 Impresión/QR | printQr, ui, index | navegador; sin backend obligatorio para QR local/impresión | PrintQrPrivacy, PrintSheetLayoutModes, PrintSheetPaginationIntegrity, PrintSheetPageContract |
| CAP-19 Procesos auxiliares | consola Developer y procedimientos manuales | Coordinator, SharedMutationClient, UTILITIES y handlers de mantenimiento | SharedMutationCoordinator, CoordinatorCapabilityPreservation, UtilitiesSecurity, ActionDispatchContract |

Las pruebas representativas son evidencia de cobertura por capacidad, no una afirmación de que cada acción tenga una prueba individual exclusiva. La matriz de 120 acciones, la clasificación de acciones sin consumidor y los contratos por servicio completan la trazabilidad funcional; las brechas de prueba específica se mantienen visibles para MIG-027/MIG-028.

### 19.7 Pruebas, workflows y límites de ejecución

- `JS/Tests/` contiene 373 entradas. `RunServiceTests.mjs` organiza ocho grupos: WRITE, ADMIN, FEEDBACK, CATALOG, UTILITIES, AUTH, USERS e INTEGRATION.
- El runner declara 274 llamadas `runCli`, que corresponden a 270 archivos CLI únicos (cuatro referencias duplicadas), y 31 ejecuciones/assertions mediante `recordResult`. No se debe inferir que las 373 entradas se ejecutan todas automáticamente.
- `.github/workflows/service-tests.yml` corre en push/PR/manual sobre la rama de trabajo, usa Node.js 22, comprueba repositorio/rama/árbol limpio, ejecuta `node --check` en módulos backend/frontend principales y lanza `RunServiceTests.mjs`.
- `.github/workflows/deployed-service-health.yml` consulta por GET los siete endpoints desplegados; no realiza escrituras y no valida Spreadsheet/Drive de forma directa.
- `.github/workflows/file-reader-browser.yml` ejecuta Playwright/Chromium para el helper FileReader del formulario.
- Las suites locales previamente registradas en checkpoint incluyen 247 aserciones aprobadas en nueve grupos de contratos y 12/12 PASS en `ActionDispatchContract.js`; no se vuelven a contabilizar como ejecutadas en esta iteración. Esta actualización fue una inspección estática/documental, no una ejecución de Node.js ni un workflow.
- No hay un manifiesto Apps Script ni configuración `clasp` en el árbol; tampoco se encontraron archivos `.gs`. La búsqueda estática en los diez archivos backend y los módulos frontend principales no identificó `ScriptApp.newTrigger`, `newTrigger`, `timeBased`, `onOpen` ni `onEdit`. Esto permite afirmar que no hay declaraciones de triggers en esos archivos versionados, pero **no permite afirmar que los proyectos Apps Script desplegados carezcan de triggers instalados**.
- Los proyectos Apps Script externos, sus triggers instalados, scopes/owners, propiedades reales, deployments, hojas/columnas reales y permisos de Drive/YouTube no están representados íntegramente en el repositorio. Su verificación se difiere a Beta con proyectos y recursos aislados; no bloquea el cierre del inventario estático MIG-001.

### 19.8 Hallazgos nuevos que se entregan a las tareas dependientes

1. Las siete URLs de servicio en `api-config.js`, los IDs de Spreadsheet repetidos en siete servicios y los IDs de carpeta Cortes en WRITE/FEEDBACK/ADMIN son referencias fijas que MIG-003/MIG-006 debe migrar sin bootstrap oculto.
2. ADMIN contiene llamadas backend→backend a WRITE y CATALOG y constantes URL de AUTH/USERS/WRITE/CATALOG/FEEDBACK. Coordinator y SharedMutationClient contienen el plano de coordinación, URLs/secretos y estado que debe ser inventariado en MIG-004 antes de retirarlo.
3. AUTH mantiene un secreto de recuperación autogenerado en ScriptProperties; no debe copiarse a una hoja pública ni al navegador. Su sustitución requiere un diseño de secreto seguro y compatible.
4. Coordinator persiste leases, contextos de sesión, índices de token, revisiones/eventos del catálogo y buckets de tráfico en ScriptProperties. Son estados de negocio/operación que deben migrarse o sustituirse con recuperación explícita, no borrarse junto con las URLs.
5. FEEDBACK persiste el modo de texto enriquecido en ScriptProperties; WRITE mantiene contador de IDs; ADMIN conserva contadores, auditorías y estado de operaciones. Estas claves no son todas de la misma clase.
6. El estado de telemetría Coordinator-only declara que no cuenta todas las peticiones directas. La interfaz debe conservar la distinción `directRequestsAvailable:false`; no presentar el agregado como métricas completas de cada servicio.
7. La prueba de salud GET verifica el contrato del endpoint, no la integridad de Spreadsheet/Drive ni la operación de escritura.
8. Las diferencias de esquema de respaldo/restore y VIN descritas en §§17.8 y 18.9 requieren pruebas aisladas de paridad en MIG-027/Beta antes de alterar columnas o restauración.

### 19.9 Resultado y criterio de cierre de MIG-001

- 120/120 acciones del mapa: handler y servicio reconciliados.
- 12/12 acciones sin consumidor directo: clasificadas como compatibilidad, diagnóstico, mantenimiento o brecha de consumidor; todas conservadas.
- 13 operaciones internas de Coordinator y 8 rutas privadas de caché de actor: inventariadas.
- Rutas GET, compatibilidades, rechazos de endpoint, comandos de terminal y operaciones manuales: inventariados.
- Consumidores frontend, superficies HTML, módulos de soporte, 19 capacidades CAP, hojas/columnas, integraciones externas y dependencias backend→backend: trazados en §§9–19.
- RBAC por servicio/acción y contratos AUTH/USERS/WRITE más payloads/efectos de CATALOG/FEEDBACK/Inbox/ADMIN/UTILITIES: documentados.
- Pruebas existentes y brechas de cobertura por capacidad: vinculadas; validaciones de deployment/Spreadsheet/Drive/YouTube real quedan para Beta.
- No se modificó código funcional, endpoints, propiedades, deployments, Spreadsheet ni Drive durante MIG-001.

**Estado MIG-001: COMPLETADA CON VALIDACIÓN DIFERIDA.** El inventario estático y la matriz de trazabilidad cumplen el alcance local. Permanecen diferidas exclusivamente las verificaciones que requieren proyectos Apps Script desplegados, triggers instalados, credenciales/OAuth, Spreadsheet/Drive aislados y APIs externas; estas no autorizan retirar funciones y deben ejecutarse en Beta o en las tareas de paridad MIG-027/MIG-028.


---

## 20. Inventario de configuración backend — MIG-003

El inventario detallado de configuración y persistencia está en [INVENTARIO_CONFIGURACION_BACKEND.md](./INVENTARIO_CONFIGURACION_BACKEND.md).

### 20.1 Alcance estático

- Diez módulos backend activos inspeccionados.
- Siete módulos usan `PropertiesService.getScriptProperties()`; USERS, UTILITIES e InboxConversations no presentan uso.
- No se encontraron usos de UserProperties ni DocumentProperties en los módulos activos revisados.
- Se identificaron 26 familias de claves persistentes, incluidas claves dinámicas.
- Se localizaron siete endpoints de entrada en `api-config.js`, cinco URLs duplicadas en ADMIN, el ID de Spreadsheet repetido en siete servicios y el ID de la carpeta Cortes repetido en tres.

### 20.2 Criterios de clasificación y destino

- URLs/IDs: `API_ENDPOINTS` local en frontend. Parámetros funcionales y recursos: `ConfiguracionParametros` y `ConfiguracionRecursos`; no dependen de un registro central de endpoints.
- Login idempotente, auditoría ADMIN, Safe Apply, auditoría Drive, feed incremental y telemetría: hojas/ledgers operativos específicos, no la hoja de parámetros.
- Contadores de IDs: reconciliar con los ledgers de reservas existentes; no mantener contadores duplicados.
- Secretos de interconexión Coordinator/Catalog: retirar con sus consumidores; no copiar a Spreadsheet.
- Secreto HMAC de recuperación: requiere diseño de almacenamiento protegido antes de migrar.
- Leases/contextos/índices Coordinator: retirar conforme a §§15 y 17; no replicar el mecanismo antiguo en hojas.

### 20.3 Límites

No se leyeron valores de propiedades reales instaladas, scopes ni configuración de Web Apps desplegadas. No se modificó ningún consumidor, propiedad, hoja ni deployment. La inspección Beta de valores reales queda pendiente; el acceso a Spreadsheet sin ID/bootstrap local queda en MIG-006.


---

## 20. Grafo de llamadas entre servicios y SharedMutation — MIG-004

Inventario completo de comunicación HTTP backend→backend, reemplazos y pruebas: `INVENTARIO_LLAMADAS_SERVICIOS.md`.

### 20.1 Aristas backend actuales

| Origen | Destino | Acciones/operaciones | Reemplazo objetivo |
|---|---|---|---|
| ADMIN | WRITE | `allocateVehicleId`, `freezeCortesIds` | Frontend llama WRITE directamente; backup ADMIN → freeze WRITE conserva orden y confirmación |
| ADMIN | CATALOG | `getVehicleProjection`, `getContributionCandidates` | Frontend consulta CATALOG; ADMIN revalida datos/versión antes de escribir |
| AUTH/USERS/WRITE/FEEDBACK/ADMIN/UTILITIES | Coordinator | 13 operaciones privadas vía SharedMutationClient | Eliminar intermediario; AUTH/Spreadsheet para sesión, Spreadsheet para feed, frontend para secuencias |
| Coordinator | USERS/WRITE/FEEDBACK/ADMIN | `__primeSessionActorCache`, `__invalidateSessionActorCache` | Frontend invoca directamente endpoints locales, autenticados por sesión y RBAC |
| CATALOG, InboxConversations | — | Sin llamadas backend→backend detectadas | Sin sustitución requerida |

Las llamadas a Google Drive API, YouTube Data API y URLs de imágenes son integraciones externas, no aristas entre microservicios.

### 20.2 Operaciones SharedMutation

Se reconciliaron las 13 operaciones del dispatcher Coordinator: acquire, release, validate, publishCatalogChange, publishCatalogChanges, getCatalogChanges, registerSession, syncUserSessions, revokeSession, revokeUserSessions, validateSessionContext, invalidateSessionActorCaches y getServiceTraffic.

Seis callsites activos de `withSharedMutationLease_` están en AUTH/deleteUser, USERS/createUser, ADMIN/saveUnusedImagesInventory, ADMIN/createCortesImageFolder, ADMIN/auditDriveImagesInCortes y UTILITIES/migrateTimestamps. El helper AUTH/migrateLegacyRoleRevocationMarkersToSharedState existe, pero no se localizó consumidor versionado. El wrapper `registerSharedSessionContext_` tampoco tiene callsite versionado. La ruta nested `validate` acepta `__sharedMutationToken`, pero no se localizó un productor versionado activo.

Las ocho rutas privadas de caché (dos acciones en USERS, WRITE, FEEDBACK y ADMIN) siguen vigentes en el código; no se retiran en MIG-004.

### 20.3 Integridad, escritura y compatibilidad

- AUTH debe conservar autoridad de sesión y revocación; la invalidación/precarga local se coordinará desde frontend.
- CATALOG será lector canónico del feed; los servicios escritores publicarán eventos idempotentes en Spreadsheet dentro de su propia operación.
- Backup→freeze, prelectura de proyección→edición, candidatos→inventario y fan-out de sesión son secuencias que el frontend puede coordinar.
- Alta/edición de cortes, mutaciones PyS/Inbox, aprobación de vídeo, auditoría, backup/restauración y migraciones conservan su escritura lógica en el servicio propietario.
- Se identificaron solapamientos de escritura en Users/ActiveSessions, Cortes y Drive. Deben resolverse antes de retirar leases; ScriptLock de proyectos Apps Script distintos no es un lock compartido.
- El secreto CATALOG compartido con ADMIN para metadatos de inventario debe sustituirse por autorización local de CATALOG; no trasladarlo al navegador ni a Spreadsheet pública.
- No se cambió ningún endpoint, secreto, propiedad, permiso, dato o deployment.

### 20.4 Pruebas de trazabilidad

Se agregó `JS/Tests/ServiceCallGraphContract.mjs` al runner. La matriz de pruebas representativas por arista se conserva en `INVENTARIO_LLAMADAS_SERVICIOS.md` §8. Las pruebas locales de equivalencia de las futuras sustituciones y las validaciones reales de Apps Script/Spreadsheet/Drive/OAuth/YouTube permanecen asignadas a sus tareas de implementación y Beta, respectivamente.

**Estado MIG-004:** COMPLETADA CON VALIDACIÓN DIFERIDA.

---

## 21. Esquema central de configuración — MIG-007

El diseño versionado de las seis tablas lógicas, columnas, validación, defaults, publicación atómica por revisión, historial append-only, rollback, separación de visibilidad y política de caché está en [ESQUEMA_CONFIGURACION_CENTRAL.md](./ESQUEMA_CONFIGURACION_CENTRAL.md). La trazabilidad de las 26 familias MIG-003 y de los siete endpoints se incluye en §6 del documento.

- Servicios: hoja histórica de endpoints, retirada como fuente operativa; no se lee ni se escribe y no se elimina durante esta migración.
- ConfiguracionParametros: parámetros funcionales/operativos validados; sin contratos criptográficos ni RBAC editable.
- ConfiguracionRecursos: IDs no secretos de Drive, con validación del recurso y jerarquía.
- ConfiguracionControl: schema_version, active_revision y estado de publicación.
- ConfiguracionHistorial: historial append-only y rollback como nueva revisión.
- ConfiguracionEsquema: catálogo de claves/tipos/reglas admitidas, versionado en código.

La visibilidad public/backend/admin es filtrado de aplicación, no ACL de lectura por pestaña: Google Sheets no separa permisos de lectura por hoja. La Spreadsheet debe ser privada y el frontend solo recibe la proyección pública del lector servidor. Los secretos de interconexión y el secreto HMAC de recuperación quedan fuera del esquema.

**Estado MIG-007:** COMPLETADA (diseño/documentación/contrato estático). No se crearon hojas ni se migraron valores. MIG-008 implementará el lector y la caché solo después de resolver el acceso inicial sin bootstrap local; MIG-006 Web App real permanece pendiente de Beta.


## 22. Adenda de estado actual — MIG-012 AUTH/USERS (2026-11-23)

El inventario inicial de §§1–19 describe la arquitectura antes de la unificación y se conserva como evidencia histórica. El estado vigente de la rama `GPSpedia2.2.5_work` es:

- En el corte inicial de este inventario, el mapa contenía 121 acciones y seis destinos. Esta cifra es histórica; la distribución vigente se actualiza en la adenda §22.
- AUTH es el propietario único de las funciones de identidad/usuarios y mantiene las hojas `Users` y `ActiveSessions` sin migrar datos ni cambiar índices. Se conserva la columna G de ActiveSessions definida por AUTH.
- `getUsers` conserva el filtrado jerárquico Desarrollador/Jefe/Supervisor; `createUser` conserva campos, validadores, hash PBKDF2, generación secuencial, snapshot, escritura atómica y rollback; `updateProfile` solo modifica `Nombre_Completo` del usuario autenticado.
- La creación de usuarios usa ScriptLock local de AUTH. La eliminación de cuenta también usa ese mismo lock de proyecto, sustituyendo la lease cruzada AUTH↔USERS sin abrir una ventana de concurrencia entre altas y bajas.
- La caché del actor AUTH se precalienta durante login en el propio proyecto. Coordinator ya no dirige precarga ni invalidación a USERS; los destinos remotos restantes son WRITE, FEEDBACK y ADMIN.
- `JS/Services/users.js`, `JS/Tests/users.js` y la clave de health USERS fueron retiradas del código versionado. No quedan acciones frontend ni políticas de servicio que requieran un endpoint USERS.
- No se ha borrado ni alterado ningún deployment remoto ni las filas históricas de Servicios. El código no consume esas filas; cualquier purga física requerirá autorización específica.

**Pruebas:** `UsersAtomicMutations.js` — 15/15 PASS. GitHub Actions Node.js 22 SUCCESS — run `45222509966`: 305 suites, 3,554 pruebas aprobadas, 0 fallos. Sintaxis 445 archivos PASS; referencias de módulos 347 archivos PASS. La verificación real de sesiones, roles y permisos sobre recursos aislados permanece pendiente de Beta.


### 22.1 Cierre de validación MIG-012 — 2026-11-23
- El mapa canónico vigente contiene 123 acciones y seis servicios: AUTH 19, CATALOG 9, WRITE 9, FEEDBACK 40, UTILITIES 1 y ADMIN 45.
- Las acciones de usuarios `getUsers`, `createUser` y `updateProfile` son propiedad de AUTH. El servicio independiente USERS fue retirado del código versionado.
- La caché pública conserva parámetros funcionales; no contiene endpoints. La hoja histórica Servicios se conserva sin consumidores.
- Regresión CI Node.js 22: run 45222509966 — 305 suites, 3,554 pruebas, 0 fallos. GitHub Pages build/deploy: run 45222508791 — SUCCESS.
- MIG-012: código completado. Despliegue AUTH, verificación de recursos/permisos y retiro del deployment USERS siguen como validación Beta.


### 22.2 Cierre MIG-013 — sesiones con actor local — 2026-11-23

- AUTH mantiene la autoridad de login y Users/ActiveSessions, el hash PBKDF2 actual, bloqueo temporal de cinco intentos fallidos y tokens opacos generados en servidor.
- AUTH, WRITE, FEEDBACK, ADMIN y UTILITIES resuelven actor desde Users/ActiveSessions mediante caché local del proyecto; CATALOG mantiene loader y caché locales equivalentes.
- Cache miss valida sesión/token, identidad, expiración, usuario activo y rol autoritativo. Cache hit reutiliza el actor sin llamadas de red ni lecturas de Spreadsheet por acción.
- TTL de actor: máximo 21,600 segundos; clave basada en SHA-256(userId/token). No se guardan tokens legibles como clave de caché.
- No hay llamada a Coordinator ni lease SharedMutation para login, carga de actor, validación de sesión o comprobación ordinaria de capacidad. Las operaciones Coordinator ajenas al flujo de sesión se conservan.
- Las cachés exponen invalidación local sin secreto compartido. La orquestación frontend de revocación/invalidación entre servicios queda en MIG-014.
- Pruebas dirigidas en harness V8 aislado: MIG013SessionActorLocalLookup 21/21; SessionActivityCoordination 9/9; SessionActivityLeaseMinimization 6/6; AuthSessionReadOptimization 9/9. Total 45/45 aserciones aprobadas. No sustituyen la validación Beta real.
- MIG-013: COMPLETADA EN CÓDIGO; login, sesiones y permisos reales en deployments aislados permanecen pendientes de Beta.


### 22.3 Cierre de código MIG-014 — revocación y caché frontend — 2026-11-23
- El ciclo de revocación AUTH captura referencias SHA-256 de las claves de caché afectadas; el frontend coordina la invalidación directa en los seis servicios.
- WRITE, FEEDBACK, ADMIN y UTILITIES reciben claves de caché del espacio compartido; CATALOG recibe únicamente claves CATALOG. Cada receptor borra su propia caché local.
- No se envían tokens de sesión entre servicios, no se agregan secretos/URLs a propiedades Apps Script y no hay coordinación funcional backend entre servicios.
- El frontend reintenta dos veces, registra los destinos no confirmados y comunica el estado parcial. TTL máximo del actor: 21,600 segundos.
- Pruebas dirigidas en CI: SessionInvalidationFlow 15/15; fan-out (seis servicios, retry, fallo parcial y TTL) PASS; contrato backend/cache 10/10; SessionActorCacheInvalidation 6/6.
- CI global run 45231811060: 1,200 aprobadas, cuatro suites fallidas en ADMIN/UTILITIES/AUTH/INTEGRATION. Se mantienen como deuda de regresión general.
- Validación Beta de endpoints y permisos reales diferida. MIG-014: COMPLETADA CON VALIDACIÓN DIFERIDA.


### 22.4 Cierre MIG-015 — imágenes y recursos Drive — 2026-11-23
- ADMIN, WRITE y FEEDBACK usan Spreadsheet vinculada y el lector central para resolver el recurso `cortes_root_folder_id`.
- La validación del recurso verifica frescura de configuración, tipo Drive, ID, nombre y padre; no existe fallback local. Los IDs locales SPREADSHEET_ID/DRIVE_FOLDER_ID fueron retirados de los tres servicios.
- ADMIN ya no persiste el ID de Imagenes_Sin_Uso en ScriptProperties; la carpeta se localiza bajo Cortes y se rechazan duplicados.
- Se preservan límites por flujo (10 MB ADMIN/WRITE; 3 MB FEEDBACK/PyS), validación MIME/firma, SHA-256, ledger/journal, idempotencia, compensación, recuperación y reconciliación.
- CI Node.js 22 run 45236342364: MIG-015 605/605 comprobaciones aprobadas. Regresión global: 157 suites, 1,909 aprobadas, cuatro fallidas en familias P4 política de roles, UTILITIES, AUTH e INTEGRATION; los mismos grupos ya fallaban antes de esta tarea.
- La validación Beta real de proyectos vinculados, permisos heredados y operaciones Drive permanece pendiente. MIG-015: COMPLETADA CON VALIDACIÓN DIFERIDA.


### 22.5 Cierre MIG-016 — YouTube resumable y aprobación — 2026-11-23
- FEEDBACK reserva init con opVideoId, SHA-256 de solicitud y destino único; LockService local protege la reserva. YouTubeUploadReservations solo guarda identidad, destino, hash, estado y timestamps.
- URL de sesión temporal en CacheService (6 h) y IndexedDB de navegador para reanudación; OAuth token solo runtime mediante ScriptApp.getOAuthToken(). Ninguno se escribe en Spreadsheet, ScriptProperties ni logs.
- Renovación requiere URL oficial de sesión expirada y reserva previa; HTTP 404/410 dispara renovación desde frontend. Pérdida de CacheService en reserva inicializada falla cerrada para evitar duplicados.
- Transferencia en bloques de 8 MB, Content-Range, 308/Range, checkpoints, pausa, cierre y reanudación. Publicación unlisted hasta aprobación, con ID/URL verificados.
- Inbox FEEDBACK, propietario/actor autenticado, RBAC de aprobación/rechazo, eventos append-only y publicación recuperable a Corte/PyS/Tutorial. Reproductores suplementarios preservados.
- CI run 45238221817: **223/223 pruebas específicas de vídeo PASS**. Regresión global: 167 suites, 1,912 aprobadas y cuatro fallidas fuera de vídeo (P4, UTILITIES, AUTH, INTEGRATION). Pages run 45238220816 SUCCESS para el commit funcional.
- Sin llamadas reales a YouTube ni deployments Apps Script. Validación Beta de OAuth, canal, sesiones, permisos y publicación pendiente.
- MIG-016: COMPLETADA CON VALIDACIÓN DIFERIDA.


---

## Adenda MIG-025 — retirada de COORDINATOR (2026-11-23)

- La fuente activa `JS/Services/Coordinator.js` y su dispatcher `doGet`/`doPost` fueron retirados. La guía operativa antigua quedó archivada bajo `Olds/Documentacion_Legacy/Services/`; su contenido se conserva como evidencia histórica, no como procedimiento vigente.
- No quedan acciones `getServiceTraffic`, rutas de salud, clientes, leases ni coordinación de sesión que dependan de COORDINATOR en los servicios activos. La configuración central ignora temporalmente la fila histórica `COORDINATOR`; no se modifican Spreadsheet, ScriptProperties, deployments ni triggers externos.
- La comprobación de salud mantiene los seis endpoints independientes: AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN. El contrato y la prueba remota usan ese inventario de seis; los fallos individuales no cancelan las demás comprobaciones.
- Paridad de telemetría: el agregado antiguo no era un contador global HTTP. Registraba eventos legacy instrumentados por Coordinator (principalmente adquisiciones de leases) y excluía validaciones de sesión, lecturas del feed, sondeos de salud y rutas no instrumentadas. Se retiró junto con su único recopilador; no se declara reemplazado por telemetría local.
- El panel Developer conserva una sección explícita de retirada y explica el alcance del agregado histórico. La telemetría local por navegador continúa disponible, temporal y no transmitida; solo representa solicitudes observadas por esa pestaña/dispositivo.
- La limpieza de filas/configuración y propiedades históricas, deployments, proyectos y triggers instalados queda pendiente de inspección y autorización en Beta aislada. No borrar recursos externos automáticamente.
- Pruebas locales/CI: ver cierre MIG-025 en `checkpoint.md` y `ChangesLogs.txt`; las pruebas Beta siguen diferidas conforme a `Tareas_Beta.md` §6.5.


### 22.3 Reconciliación actual del mapa frontend — 2026-11-24

La revisión del objeto completo `ACTION_TO_SERVICE_MAP` en el HEAD vigente identifica **123 acciones** en seis servicios. La distribución actual es: AUTH 19, CATALOG 9, WRITE 9, FEEDBACK 40, UTILITIES 1 y ADMIN 45. El conteo se obtiene de las entradas del objeto completo, no de las rutas auxiliares ni de las operaciones internas que no están en el mapa.

Cinco acciones vigentes no aparecían en la tabla histórica de §9 y se agregan aquí como adenda, sin reescribir la extracción original:

| Acción | Servicio | Handler / ejecución | Consumidor / finalidad |
|---|---|---|---|
| `getPublicConfiguration` | AUTH | Ruta pública de configuración en `doPost` | `api-config.js`; bootstrap de lectura de configuración central, sin credenciales de usuario. |
| `publishCatalogReset` | CATALOG | `publishCatalogResetForActor_` | Coordinación desde `api-config.js` después de mutaciones que requieren reconciliación completa del catálogo. |
| `invalidateRichTextModeCache` | FEEDBACK | Ruta de invalidación protegida para Desarrollador | `api-config.js`; invalidación de caché local después de publicar la preferencia global desde ADMIN. |

Las tres acciones tienen ruta backend identificada y consumidor explícito. No representan controles de UI adicionales ni habilitan coordinación backend→backend: las secuencias de publicación e invalidación se ejecutan desde el frontend. La matriz de §§9–19 conserva su valor histórico; esta adenda es la referencia para el mapa vigente.
