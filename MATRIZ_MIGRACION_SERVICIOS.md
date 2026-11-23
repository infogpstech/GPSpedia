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
