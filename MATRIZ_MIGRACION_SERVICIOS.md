# Inventario inicial de dependencias para la migración

**Rama:** `GPSpedia2.2.5_work`  
**Base:** `GPSpedia2.2.5`  
**Estado:** Inventario estático inicial; requiere ampliar con trazado de consumidores y pruebas.

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

- Las 120 acciones del mapa frontend están enumeradas en la sección 1.
- La cobertura de capacidades CAP-01 a CAP-19 está definida; el trazado de cada control, handler, permiso y prueba sigue pendiente.
- La configuración/llamadas internas conocidas están descritas en secciones 2 y 3.
- El inventario se considera **PARCIAL** hasta cerrar MIG-001 a MIG-005.
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
