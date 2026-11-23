# Inventario de configuración del backend — MIG-003

**Fecha:** 2026-11-23  
**Repositorio:** `infogpstech/GPSpedia`  
**Rama auditada:** `GPSpedia2.2.5_work`  
**Alcance:** configuración, propiedades persistentes, parámetros operativos, IDs de recursos, URLs de despliegue y secretos referenciados por el código backend vigente.  
**Normativa:** `NORMAS_DESAROLLO.md`, especialmente §§12, 15, 16 y 17.

## 1. Resultado ejecutivo

La revisión estática de los diez módulos de `JS/Services/` identifica:

- **7 módulos** que usan `PropertiesService.getScriptProperties()`: AUTH, WRITE, CATALOG, FEEDBACK, ADMIN, COORDINATOR y SharedMutationClient.
- **3 módulos** sin referencias a PropertiesService: USERS, UTILITIES e InboxConversations.
- No se encontraron usos de `UserProperties` ni `DocumentProperties` en los módulos backend activos revisados.
- **26 familias de claves** de ScriptProperties, incluidas claves dinámicas con prefijos, identificadas y clasificadas en §3.
- Un ID de Spreadsheet repetido en **7 servicios** y un ID de carpeta Cortes repetido en **3 servicios**.
- Las siete URLs de Apps Script están declaradas en el frontend (`api-config.js`); ADMIN duplica cinco de ellas como constantes para llamadas backend→backend.
- Se identificaron parámetros de comportamiento y límites que todavía están definidos como constantes en el código.
- No se modificó código, configuración de proyectos Apps Script, propiedades reales, endpoints, deployments ni datos.

Este documento es un inventario y una propuesta de destino. **No autoriza a borrar ni trasladar ninguna clave por sí sola.**

## 2. Método, cobertura y límites

Se inspeccionaron íntegramente los diez módulos backend activos: `Auth.js`, `users.js`, `write.js`, `catalog.js`, `feedback.js`, `admin.js`, `Utilities.js`, `Coordinator.js`, `SharedMutationClient.js` e `InboxConversations.js`. Se contrastaron las declaraciones, lecturas, escrituras, eliminaciones, constructores de claves y consumidores de cada familia identificada.

También se revisaron `JS/Frontend/api-config.js`, `NORMAS_DESAROLLO.md`, `README.md`, `PLAN_NUEVA_ARQUITECTURA_FRONTEND.md`, la matriz de servicios, el backlog y el checkpoint.

**Límite de la evidencia:** el repositorio no permite leer los valores actualmente guardados en los proyectos Apps Script desplegados. Por tanto, se identifican las claves que el código espera y cómo las usa, pero no se afirma que se hayan enumerado los valores reales de cada proyecto ni que no existan propiedades huérfanas creadas manualmente. Esa lectura pertenece a la validación Beta autorizada.

## 3. Inventario de ScriptProperties: 26 familias

Las claves dinámicas se documentan como familias; el sufijo se genera en tiempo de ejecución.

| # | Clave o familia | Servicio/consumidor | Clasificación y ciclo de vida | Destino previsto |
|---:|---|---|---|---|
| 1 | `GPSpedia_COORDINATOR_URL` | AUTH, FEEDBACK, SharedMutationClient | URL del Coordinator; solo lectura en estos consumidores. Configuración heredada de comunicación interna. | **Retirar**, junto con los consumidores Coordinator/SharedMutation; no trasladar a una hoja. |
| 2 | `GPSpedia_COORDINATOR_SECRET` | AUTH, FEEDBACK, SharedMutationClient | Secreto compartido de autenticación contra Coordinator; solo lectura en estos consumidores. | **Retirar** al eliminar la comunicación backend→backend; no almacenar en Spreadsheet. |
| 3 | `GPSpedia_COORDINATOR_SECRET_<service>` | Coordinator | Secreto por servicio. El código acepta ADMIN, WRITE, FEEDBACK, AUTH, USERS y UTILITIES. | **Retirar** con Coordinator y las rutas privadas de interconexión; no trasladar a una hoja. |
| 4 | `GPSpedia_SERVICE_URL_<target>` | Coordinator | URLs de destino para invalidación/precarga de caché; los destinos usados por esas rutas son USERS, WRITE, FEEDBACK y ADMIN. | **Retirar** con las llamadas internas. Las URLs públicas de entrada de los servicios sí van al registro central de servicios, apartado §4. |
| 5 | `GPSpedia_CATALOG_TRAFFIC_SECRET` | CATALOG y ADMIN | Secreto compartido que habilita la inclusión de eventos internos del inventario de imágenes en candidatos de contribución. El código lo lee; no contiene un generador de valor. | **Retirar** la autenticación entre servicios y conservar la capacidad mediante autorización directa compatible. No copiar el secreto a Spreadsheet. |
| 6 | `GPSpedia_PASSWORD_RECOVERY_SECRET_V1` | AUTH | Secreto HMAC local. AUTH lo genera automáticamente al ejecutar por primera vez el flujo de recuperación si la clave no existe; verifica la escritura y lo reutiliza para calcular digests de códigos/correos. | **Destino de seguridad pendiente de diseño**. No ponerlo en una hoja de configuración ordinaria ni exponerlo al frontend. Definir almacenamiento protegido compatible con §17 antes de migrar. |
| 7 | `login_request_<requestId>` | AUTH | Registro JSON de idempotencia/recuperación de login: userId, token de sesión, fechas, estado pending/committed/revoked y confirmación del puntero. TTL de 24 horas; se reconcilia y limpia. | Hoja operativa dedicada `LoginRequests` o ledger equivalente; no es configuración. Debe preservar recuperación de append ambiguo y revocación. |
| 8 | `role_revocation_pending_<userId>` | AUTH | Marcador JSON de cambio de rol/perfil pendiente. Se crea durante la revocación, se consulta/reconcilia y se elimina al completar. Existe una copia compartida del marcador en `Users.SessionToken`. | Usar el marcador de la fila Users como estado canónico y retirar la copia duplicada de Properties después de probar recuperación/revocación. No duplicarlo en la hoja de configuración. |
| 9 | `GPSpedia_CORTES_LAST_ID` | WRITE | Contador/high-water mark histórico, leído al calcular el máximo y actualizado al congelar IDs. No es el ledger principal de reservas. | Reconciliar con `CortesIdReservations`, que ya registra opId, hash, vehicleId y fecha; consolidar allí el máximo y retirar el contador duplicado tras prueba de paridad. |
| 10 | `GPSpedia_RICH_TEXT_MODE_V1` | FEEDBACK | Parámetro funcional global `strict` o `advanced`; Desarrollador lo cambia y el handler lo lee. | Hoja `ConfiguracionParametros`, clave `rich_text_mode`, con enum validado y caché. |
| 11 | `LOGOS_MARCA_ID_COUNTER` | ADMIN | Contador numérico persistente del siguiente ID de LogosMarca; se compara con el máximo leído de la hoja y luego se actualiza. | Ledger de reservas de IDs en Spreadsheet (por ejemplo, `LogosMarcaIdReservations`) o mecanismo de asignación atómica equivalente. No convertirlo en una celda de contador sin resolver concurrencia. |
| 12 | `GPSpedia_ADMIN_AUDIT_V1_<eventId>` | ADMIN | Registro persistente de inicio/final de operaciones administrativas, resultado, actor, duración y resumen. Retención de 180 días; máximo 300 finalizados y 20 pendientes. | Hoja `AdminOperationAudit`, conservando evento, estado iniciado/finalizado, actor, acción, recurso, resultado y política de retención. |
| 13 | `GPSpedia_CORTES_ORGANIZER_OP_V1_<sha256(operationId)>` | ADMIN | Ledger durable Safe Apply: identidad de operación/archivo, propietario, digest, estado, rutas, marcas de tiempo y error. Retención de 180 días; límites de 200 terminales/250 totales. | Hoja `CortesOrganizerOperations` con clave única operationId, estados recuperables y paginación. No es configuración. |
| 14 | `GPSpedia_UNUSED_IMAGES_FOLDER_ID` | ADMIN | ID de la carpeta `Imagenes_Sin_Uso`; se lee, valida contra el árbol Cortes y se escribe cuando se encuentra o crea la carpeta. | Registro `ConfiguracionRecursos` (clave `unused_images_folder_id`) o metadato de recurso en Spreadsheet. Preservar validación de carpeta/parent y detección de duplicados. |
| 15 | `GPSpedia_DRIVE_AUDIT_STATE_<auditId>` | ADMIN | Estado durable de una auditoría Drive en curso/finalizada: propietario, cursor, progreso, métricas, huellas y estado. Expira a las 6 horas; límite de 8 KB por registro. | Hoja `DriveAuditRuns` con estado/cursor/versionado y expiración explícita. Los resultados voluminosos y páginas continúan en caché/almacenamiento apropiado, no en una celda gigante. |
| 16 | `GPSpedia_DRIVE_AUDIT_LATEST_<sha256(ownerId)[0:32]>` | ADMIN | Puntero por usuario a la última auditoría completa; se crea al finalizar y se consulta para operaciones posteriores. | Campo latestAuditId en `DriveAuditRuns` o registro de estado por usuario; conservar aislamiento por actor. |
| 17 | `GPSpedia_SHARED_MUTATION_LEASES` | Coordinator | Array JSON de leases de mutación, exclusión y drenaje. TTL de lease 45 min; reserva de drenaje 60 s; espera máxima 15 s; máximo 20 activas. | **Retirar**, no migrar. §15 y §17 eliminan leases y coordinación transaccional por acción. No sustituirlas por locks/leases en Spreadsheet. |
| 18 | `GPSpedia_AUTH_CONTEXT_V1_<encodedUserId>` | Coordinator | Metadatos del contexto de sesión: usuario, epoch, generación y cantidad de bloques de sesión. | **Retirar con Coordinator**. La fuente de sesión vigente ya incluye `ActiveSessions`; mantener solo la verificación/caché local que permita la arquitectura aprobada. |
| 19 | `GPSpedia_AUTH_SESSIONS_V1_<user>_<generation>_<index>` | Coordinator | Bloques JSON de sesiones (token, rol, nombre y marcas de tiempo), publicados por generación y con limpieza de generación anterior. | **Retirar con Coordinator**; no copiar tokens a una hoja de configuración. La hoja de sesiones existente es `ActiveSessions`. |
| 20 | `GPSpedia_AUTH_TOKEN_V1_<encodedToken>` | Coordinator | Índice de token de sesión → userId para localizar el contexto compartido. | **Retirar con Coordinator**; no replicar este índice como configuración. |
| 21 | `GPSpedia_CATALOG_CHANGE_REVISION` | Coordinator | Revisión global del feed incremental del catálogo. | Estado de feed en `CatalogChangeState` o encabezado de `CatalogChangeEvents`. |
| 22 | `GPSpedia_CATALOG_WRITE_SOURCE_VERSION_V1` | Coordinator | Última versión de fuente WRITE aceptada para detectar eventos obsoletos. | Campo/versionado de origen en `CatalogChangeState`. |
| 23 | `GPSpedia_CATALOG_FEEDBACK_SOURCE_VERSION_V1` | Coordinator | Última versión de fuente FEEDBACK aceptada. | Campo/versionado de origen en `CatalogChangeState`. |
| 24 | `GPSpedia_CATALOG_ADMIN_SOURCE_VERSION_V1` | Coordinator | Última versión de fuente ADMIN aceptada. | Campo/versionado de origen en `CatalogChangeState`. |
| 25 | `GPSpedia_CATALOG_CHANGE_EVENT_<revision>` | Coordinator | Evento JSON incremental por revisión, con idempotencia por requestId y recuperación mediante reset. Se conservan como máximo 100 eventos. | Hoja `CatalogChangeEvents`, con revisión, servicio origen, operación, colección, recordId, requestId, estado/reset y fecha. Mantener ventana/retención y cursor. |
| 26 | `GPSpedia_SERVICE_TRAFFIC_HOUR_<bucketStart>` | Coordinator | Contadores de operaciones protegidas por servicio en buckets horarios; ventana de 24 horas y escritura best-effort. No representa todas las peticiones directas. | Hoja/registro agregado `ServiceTraffic` o telemetría por servicio con consolidación por lotes. Preservar explícitamente el alcance parcial de la métrica y no añadir escrituras síncronas a acciones ordinarias. |

### Observaciones de clasificación

1. Las claves de Coordinator y SharedMutation no deben moverse mecánicamente a Spreadsheet: varias existen precisamente para leases, secretos de interconexión y copias de sesión que la arquitectura objetivo elimina.
2. Las claves de auditoría, operaciones Safe Apply, login y auditoría Drive son **estado operativo/datos**, no parámetros de configuración. Su destino son hojas/ledgers dedicados, no la hoja de parámetros.
3. Las claves de secreto no se deben guardar en una hoja genérica ni pasar al navegador. Los tres secretos de interconexión se retiran con sus consumidores; el secreto HMAC de recuperación requiere una decisión de almacenamiento seguro antes de cambiarlo.
4. Los valores reales de estas propiedades no se han leído de proyectos desplegados. El inventario cubre las familias referenciadas por el código de esta rama.

## 4. IDs y URLs incrustados

| Referencia | Ubicación | Repetición/uso | Clasificación | Destino |
|---|---|---|---|---|
| `SPREADSHEET_ID` | AUTH, USERS, WRITE, CATALOG, FEEDBACK, ADMIN, UTILITIES | Mismo ID fijo en 7 servicios; usado por `SpreadsheetApp.openById`. | Localizador de la Spreadsheet operativa. No es una credencial, pero sí configuración prohibida por §17. | No se puede resolver guardándolo en una hoja a la que el servicio todavía no sabe acceder. **Depende del spike MIG-006**: acceso por contenedor/contexto vinculado o consolidación técnica, sin bootstrap circular. |
| `DRIVE_FOLDER_ID` | WRITE, FEEDBACK, ADMIN | Mismo ID fijo de la carpeta raíz Cortes en 3 servicios. | Localizador de recurso Drive. | `ConfiguracionRecursos`, clave `cortes_root_folder_id`, una vez resuelto el acceso inicial a Spreadsheet. |
| `API_ENDPOINTS.AUTH/CATALOG/WRITE/USERS/FEEDBACK/UTILITIES/ADMIN` | `JS/Frontend/api-config.js`, líneas 74–81 | Siete URLs de Web Apps; configuración frontend actual para enrutar acciones y health checks. | Registro de endpoints públicos de entrada. Las URLs no son secretos. | Hoja `Servicios`: serviceKey, endpoint, enabled, version/metadata y updatedAt. El frontend leerá y cacheará este registro según el diseño de MIG-007. |
| `WRITE_SERVICE_URL`, `CATALOG_SERVICE_URL`, `AUTH_SERVICE_URL`, `USERS_SERVICE_URL`, `FEEDBACK_SERVICE_URL` | `JS/Services/admin.js`, líneas 17–21 | Cinco URLs duplicadas desde el backend ADMIN para llamadas internas. | Dependencia backend→backend, no un endpoint que deba quedar duplicado. | Eliminar esas constantes cuando MIG-004 reemplace las llamadas por secuencias coordinadas desde frontend. No crear un segundo registro. |

El repositorio contiene siete URLs distintas de Apps Script para los siete servicios. ADMIN repite cinco de ellas. No se incluyen aquí los valores completos de los identificadores de despliegue: las rutas y los nombres de constantes permiten localizar cada referencia sin duplicar identificadores en otro documento.

### URLs que no son configuración de servicios GPSpedia

Las URLs de Drive (`drive.google.com`, `lh3.googleusercontent.com`), YouTube (`youtube.com`, `img.youtube.com`) y APIs oficiales de Google (`googleapis.com`) que construyen enlaces, reproducen vídeos, transfieren archivos o consultan metadatos son formatos/protocolos externos. No son endpoints de microservicios GPSpedia y no deben trasladarse automáticamente a la hoja `Servicios`.

## 5. Parámetros y constantes operativas

Estos valores no se guardan actualmente en PropertiesService, pero forman parte de la configuración local que §17 pide centralizar cuando sean parámetros funcionales u operativos. Se documentan por grupo; no se deben convertir todos en celdas editables sin validación de tipo, rango, versión y caché.

| Grupo | Constantes/valores encontrados | Uso | Destino propuesto |
|---|---|---|---|
| Diagnóstico CATALOG | `LOG_INVALID_IDS = false` (`catalog.js:10`) | Activa/desactiva logging de IDs de imagen inválidos. | `ConfiguracionParametros`, clave `catalog.log_invalid_image_ids`, default false. |
| Sesión AUTH | `SESSION_LIMITS`: desarrollador sin límite, jefe 5, supervisor 3, técnico 1 y técnico exterior 1; `LOGIN_REQUEST_TTL_MS = 24h`; `LOGIN_MAX_ATTEMPTS = 5`; `LOGIN_LOCKOUT_SECONDS = 15 min`; `SESSION_ABSOLUTE_MONTHS = 3`; `SESSION_IDLE_MONTHS = 1` | Límites de sesiones y expiración/bloqueo. | `ConfiguracionParametros`, con roles permitidos fijos y límites validados. No modificar la matriz de capacidades ni los límites de roles sin autorización. |
| Versión de términos | `TERMS_CURRENT_VERSION = 2026-07` | Versión vigente de aceptación de términos. | `ConfiguracionParametros`, clave `terms.current_version`; mantener historial/versionado de aceptación. |
| Carga de imágenes | `IMAGE_UPLOAD_MAX_BYTES = 10 MiB` en WRITE y ADMIN; `REPORT_IMAGE_MAX_BYTES = 3 MiB`; `PYS_IMAGE_MAX_BYTES = 3 MiB` en FEEDBACK. | Límites de carga y validación de bytes/MIME. | `ConfiguracionParametros`, con límites máximos de seguridad aplicados también por el backend. Mantener los valores iguales donde el contrato lo exige. |
| Textos y vídeos | `FEEDBACK_REPORT_TEXT_MAX_LENGTH = 2000`; `SUGGESTION_FIELD_MAX_LENGTHS` (tipo 80, ubicación 300, colorCable 120, configRelay 120); límites Inbox vídeo (título 160, descripción 5000, usuario 100, referencia 120); PyS (título 15, descripción 200, solución 700). | Validación de entradas y compatibilidad de payloads. | `ConfiguracionParametros`, agrupados por capacidad, con límites máximos seguros y paridad frontend/backend. |
| Auditoría ADMIN | Retención 180 días; 300 eventos finalizados; 20 pendientes; registro máximo 900 caracteres. | Ciclo de vida del ledger administrativo. | `ConfiguracionParametros` para política de retención/capacidad; los eventos en `AdminOperationAudit`. |
| Safe Apply ADMIN | Retención 180 días; 200 terminales; 250 totales; límite de registro 8 KB. | Capacidad y limpieza del ledger de reorganización de imágenes. | `ConfiguracionParametros`; registros en `CortesOrganizerOperations`. |
| Auditoría Drive ADMIN | Estado 6 horas; registro ScriptProperties máximo 8 KB; snapshot de referencias 750,000 caracteres en bloques de 75,000; caché 21,600 s. | Reanudación y recuperación de auditorías Drive. | Política en `ConfiguracionParametros`; estado mínimo en `DriveAuditRuns`; páginas/resultados grandes en caché/almacenamiento adecuado. |
| Backup ADMIN | `ADMIN_RESTORE_DRIVE_BACKUP_BATCH_SIZE_ = 40`. | Tamaño de lote de copia/restauración Drive. | `ConfiguracionParametros` solo si se necesita ajustar operativamente; conservar límites técnicos y pruebas de recuperación. |
| Coordinator/SharedMutation | Lease 45 min, drenaje 60 s, espera 15 s, máximo 20 leases; catálogo 100 eventos/4 KB; contexto 8 KB/bloques de 7 KB; sesión inactiva 1 mes/absoluta 3 meses/touch 5 min; tráfico buckets 1 h/ventana 24 h; caché actor 21,600 s. | Parámetros de mecanismos de coordinación/caché heredados. | Los parámetros exclusivos de Coordinator/SharedMutation se retiran con esos componentes. Solo se trasladan a hojas las políticas que sigan teniendo un consumidor funcional en la arquitectura nueva. |

### Constantes que no deben transformarse en configuración editable

- `PASSWORD_HASH_PREFIX`, `LEGACY_PASSWORD_HASH_PREFIX`, `PASSWORD_KDF_ITERATIONS`, `PASSWORD_KDF_MIN_ITERATIONS` y `PASSWORD_KDF_MAX_ITERATIONS`: forman parte del formato/protocolo criptográfico. La norma §12.1 prohíbe cambiar algoritmo/parámetros por iniciativa propia. No convertirlos en parámetros de hoja.
- Nombres de hojas, encabezados, índices de columnas, esquemas de ledger, nombres de acciones, contratos de payload y versiones de protocolo: son contratos de código/datos, no preferencias de ejecución. Cambiarlos requiere migración de esquema y pruebas de compatibilidad.
- Rutas de API oficiales de Drive/YouTube, formatos de URL, MIME permitidos y firmas binarias: son detalles de protocolo/validación. No deben convertirse en URLs configurables de microservicios.
- `ScriptApp.getOAuthToken()` genera el token de ejecución de Google en el servidor; no es una propiedad ni un secreto manual que deba almacenarse. Los tokens OAuth no deben persistirse ni enviarse al navegador.

## 6. Caché y datos temporales fuera de PropertiesService

Se revisaron por separado para evitar confundirlos con configuración persistente:

- AUTH usa `CacheService` para digests/estado temporal del código de recuperación y límites de solicitudes. Las familias `GPSpedia_PASSWORD_RECOVERY_V1_` y `GPSpedia_PASSWORD_RECOVERY_RATE_V1_` son claves de caché, no ScriptProperties.
- SharedMutationClient usa caché de actor de sesión (`GPSpedia_SHARED_SESSION_ACTOR_V1_`) con TTL de 21,600 s; no es una propiedad persistente.
- ADMIN guarda páginas, respuestas y fragmentos grandes de auditoría Drive en CacheService (`gp_audit_*`), con TTL de seis horas. ScriptProperties solo guarda el estado pequeño y el puntero de última auditoría descritos en §3.
- Variables globales como `spreadsheet` mantienen un objeto abierto durante la ejecución; no son persistencia ni configuración.
- No se encontró `UserProperties` ni `DocumentProperties` en los módulos backend activos revisados.

La migración de cachés debe mantener aislamiento por usuario/sesión, expiración y recuperación; no se deben convertir en configuración permanente ni borrar como parte de una limpieza de PropertiesService.

## 7. OAuth, manifiesto y valores técnicos de Apps Script

- El árbol versionado no contiene `appsscript.json`, `.clasp.json` ni archivos `.gs`. El archivo `manifest.json` del repositorio corresponde a la PWA, no al manifiesto de Apps Script.
- FEEDBACK obtiene OAuth de ejecución mediante `ScriptApp.getOAuthToken()` para iniciar YouTube Resumable Upload (`feedback.js:5100–5115`).
- ADMIN obtiene OAuth de ejecución para consultar cuota Drive y operar con Drive API (`admin.js:11503–11504`, `12389–12390`).
- AUTH usa MailApp para recuperación de contraseña; no se encontró un token manual almacenado para ese envío.
- Los scopes OAuth efectivos, propietarios, identidad de ejecución, acceso a Spreadsheet/Drive, versión del runtime, modo de ejecución y acceso público/privado de cada Web App viven en los proyectos Apps Script desplegados y no se pueden verificar desde este repositorio.
- Los scopes, permisos y parámetros técnicos propios de Apps Script no deben confundirse con configuración funcional de GPSpedia ni copiarse a una hoja. Su inventario real se valida en Beta.

## 8. Esquema central de configuración — diseño MIG-007

El esquema definitivo, las columnas, validadores, separación de visibilidad, versionado, historial, rollback, caché y trazabilidad de las 26 familias se especifican en [ESQUEMA_CONFIGURACION_CENTRAL.md](./ESQUEMA_CONFIGURACION_CENTRAL.md).

Las seis tablas lógicas son Servicios, ConfiguracionParametros, ConfiguracionRecursos, ConfiguracionControl, ConfiguracionHistorial y ConfiguracionEsquema. La hoja Servicios contiene los siete endpoints de entrada; las cinco URLs internas duplicadas de ADMIN no se trasladan. Los IDs de Spreadsheet permanecen fuera del esquema por el problema de bootstrap.

**Estado:** diseño completado en MIG-007. No se han creado hojas ni migrado valores. La implementación del lector, proyección pública, escritura/versionado y caché corresponde a MIG-008 y depende de validar el acceso a Spreadsheet sin bootstrap local.

**Seguridad:** visibility es una regla de filtrado de la aplicación, no un ACL de lectura de pestañas. La Spreadsheet debe permanecer privada; el frontend solo recibe una proyección pública filtrada por un lector servidor. No se incluyen secretos ni tokens OAuth.

## 9. Dependencias, decisiones y riesgos que pasan a las tareas siguientes

1. **MIG-004:** retirar llamadas backend→backend de ADMIN y Coordinator/SharedMutation. Las URLs y secretos de interconexión identificados aquí se retiran solo después de mover cada consumidor y probar paridad.
2. **MIG-006:** demostrar acceso a Spreadsheet desde proyectos Apps Script independientes sin ID ni propiedad local. Esta decisión condiciona cualquier configuración central.
3. **MIG-007:** diseño completado en ESQUEMA_CONFIGURACION_CENTRAL.md; implementar lector, publicación y caché en MIG-008 después de validar el bootstrap.
4. **MIG-008/MIG-011:** diseñar sesión y revocación sin secretos de interconexión ni validaciones redundantes; conservar cierre remoto, bloqueo temporal y eliminación de cuenta.
5. **MIG-012 y siguientes:** migrar parámetros de aportes/cargas, auditorías, Safe Apply, catálogo incremental y métricas a sus hojas/servicios de destino sin perder funciones.
6. **Secreto HMAC de recuperación:** decidir almacenamiento protegido antes de migrar. No degradar la seguridad ni guardar el secreto en una hoja de configuración pública/general.
7. **Beta:** leer inventario real de ScriptProperties en cada proyecto y contrastarlo con las 26 familias de código; detectar claves huérfanas, valores malformados, propiedades antiguas y configuraciones efectivamente desplegadas. No borrar nada durante esa inspección.

## 10. Referencias de código auditadas

- `JS/Services/Auth.js`: constantes y claves de sesión/login (líneas 9, 39–60, 536–538, 720–1000, 1483–1503, 1628–1672, 1753–1775, 1818–1827, 2183–2238).
- `JS/Services/users.js`: ID Spreadsheet y marcador compartido de revocación; sin PropertiesService (líneas 9, 35).
- `JS/Services/write.js`: Spreadsheet/Drive IDs y contador de Cortes (líneas 9–10, 641, 711–712, 1005–1009).
- `JS/Services/catalog.js`: Spreadsheet ID, flag de diagnóstico y secreto de tráfico (líneas 9–10, 86, 1026–1028).
- `JS/Services/feedback.js`: Spreadsheet/Drive IDs, configuración Coordinator, modo rich text y OAuth YouTube (líneas 9–10, 427–430, 659–682, 5100–5115).
- `JS/Services/admin.js`: IDs, cinco URLs internas, secretos/contadores, auditoría ADMIN, Safe Apply, carpeta sin uso y estado de auditoría Drive (líneas 12–23, 985–1220, 3906–4002, 6451–6457, 12197–12236, 12828–12914, 13104–13105, 14220–14222).
- `JS/Services/Utilities.js`: Spreadsheet ID; sin PropertiesService (línea 5).
- `JS/Services/Coordinator.js`: todas las familias de estado/configuración Coordinator (líneas 12–38, 217–265, 350–456, 590–646, 790–819, 895–904, 1170–1396).
- `JS/Services/SharedMutationClient.js`: URL/secreto Coordinator y caché actor (líneas 15–17, 117–118, 325–360, 398).
- `JS/Services/InboxConversations.js`: sin referencias a PropertiesService.
- `JS/Frontend/api-config.js`: siete endpoints y mapa acción→servicio (líneas 74–81).
- `PLAN_NUEVA_ARQUITECTURA_FRONTEND.md`: objetivo, bootstrap, registro central, sesión y conservación funcional (§§2.1–2.4).

## 11. Cierre del inventario

MIG-003 cubre el inventario estático de propiedades y configuración referenciada por el código backend de la rama. Las 26 familias de ScriptProperties, IDs, URLs, parámetros relevantes, cachés separadas, mecanismos OAuth y límites del manifiesto externo están clasificados con destino o criterio explícito de retiro/diseño.

**No se migró ni eliminó ninguna propiedad.** La lectura de los valores reales instalados, scopes y deployments queda pendiente de Beta; el bootstrap de Spreadsheet queda asignado a MIG-006. Estos límites no impiden cerrar el inventario local.


### Adenda MIG-015 — centralización de recursos de imagen — 2026-11-23
- DRIVE_FOLDER_ID de ADMIN, WRITE y FEEDBACK se sustituye por la referencia central cortes_root_folder_id en ConfiguracionRecursos; el ID de cada entorno no se guarda en el código.
- Los tres servicios obtienen el recurso mediante getCentralConfigurationForService_ y verifican tipo, estado, nombre y jerarquía de la carpeta Drive.
- Los proyectos ADMIN, WRITE y FEEDBACK usan SpreadsheetApp.getActiveSpreadsheet() para acceder a la Spreadsheet vinculada, conforme al spike MIG-006; no conservan SPREADSHEET_ID local ni openById para abrir la base operativa.
- ADMIN deja de persistir Imagenes_Sin_Uso en ScriptProperties; la carpeta se localiza por nombre bajo la raíz validada, detecta duplicados y crea bajo exclusión breve.
- La validación Beta debe confirmar que los tres proyectos están vinculados al Spreadsheet aislado y que la revisión central contiene cortes_root_folder_id con el ID de la carpeta Cortes Beta.


---

## Adenda MIG-026 — reconciliación estática posterior a MIG-024/MIG-025 — 2026-11-23

Esta adenda prevalece sobre las ubicaciones y consumidores históricos descritos en las secciones anteriores cuando exista una diferencia con el código vigente. La revisión se realizó sobre `GPSpedia2.2.5_work`, HEAD `4a3c93b007902db3cb90c21c9bdf9d732b0830c8`; no se inspeccionaron propiedades instaladas ni deployments.

### Estado vigente comprobado en fuentes

| Servicio / módulo | Acceso a Spreadsheet | Estado persistente en ScriptProperties | Clasificación y tratamiento |
|---|---|---|---|
| AUTH | Conserva `SPREADSHEET_ID` y llamadas `SpreadsheetApp.openById`. | Prefijo `login_request_`; marcadores `role_revocation_pending_`; secreto HMAC `GPSpedia_PASSWORD_RECOVERY_SECRET_V1`. | El ID depende de resolver MIG-006. Login y revocación son estado operativo con migración de paridad; el secreto HMAC requiere decisión de almacenamiento protegido y no se mueve a configuración genérica ni al frontend. |
| CATALOG | Conserva `SPREADSHEET_ID` y `openById`. | `GPSpedia_CATALOG_CHANGE_REVISION` y `GPSpedia_CATALOG_CHANGE_EVENT_*`. | El feed incremental es un diario operativo con cursor/revisión/idempotencia y retención; no es un parámetro editable. Requiere migración específica y pruebas de recuperación/concurrencia. |
| WRITE | Usa `getActiveSpreadsheet()`; no declara ID local. | `GPSpedia_CORTES_LAST_ID`. | El contador heredado participa en el high-water mark; no eliminarlo hasta demostrar paridad con `CortesIdReservations` y la recuperación de IDs. Las reservas en hoja son estado/ledger separado. |
| FEEDBACK | Usa `getActiveSpreadsheet()`; no declara ID local. | `GPSpedia_RICH_TEXT_MODE_V1`. | Es el único parámetro de tipo preferencia funcional que esta pasada localizó persistido en ScriptProperties; existen además constantes operativas locales descritas en §5 que deben reconciliarse individualmente. Los handlers Developer siguen leyendo/escribiendo la propiedad. El lector central reconoce `rich_text_mode`, pero no se encontró un publicador/escritor central versionado que permita retirar la propiedad conservando el cambio desde UI. No cambiar todavía el flujo. |
| ADMIN | Usa `getActiveSpreadsheet()`; el acceso a la raíz Cortes ya pasa por `getCortesRootFolder()` y configuración central. | `GPSpedia_ADMIN_AUDIT_V1_*`, `GPSpedia_CORTES_ORGANIZER_OP_V1_*`, `LOGOS_MARCA_ID_COUNTER`, `GPSpedia_ADMIN_LOCAL_OPERATION_GUARD_V1_*`, `GPSpedia_DRIVE_AUDIT_STATE_*`, `GPSpedia_DRIVE_AUDIT_LATEST_*`. | Son auditoría, ledger Safe Apply, contador, guardas por recurso y estado reanudable. No convertirlos en parámetros ni retirarlos sin migraciones dedicadas, matriz de paridad y pruebas de recuperación. |
| UTILITIES | Conserva `SPREADSHEET_ID` y `openById`. | No se encontraron operaciones de `PropertiesService` en la fuente vigente. | El acceso depende de la resolución de MIG-006; no sustituirlo por una suposición. |
| SharedSessionActor | No declara un ID propio, pero su fallback usa `SPREADSHEET_ID` global y `openById` cuando no se inyecta proveedor. | Usa `CacheService` para actor temporal; no es ScriptProperties. | Retirar el fallback solo después de adaptar y probar todos los consumidores con proveedor explícito. |
| CentralConfigurationReader | Usa `getActiveSpreadsheet()` y falla cerrado si no existe contenedor activo. | Caché de lectura en `CacheService`; no ScriptProperties. | Lector únicamente; expone proyecciones pública/backend, no contiene un mecanismo de publicación o escritura de revisiones. |
| InboxConversations | Sin referencias encontradas a `PropertiesService`, IDs locales o URLs interservicio. | Sin estado persistente local identificado en esta inspección. | Sin cambio requerido en este corte. |

### Correcciones de inventario y límites

- La adenda MIG-015 sigue vigente: ADMIN, WRITE y FEEDBACK usan Spreadsheet activa; ADMIN/WRITE/FEEDBACK no deben volver a recibir IDs locales.
- La auditoría vigente confirma que AUTH, CATALOG y UTILITIES aún conservan el ID local; no se ha demostrado que sus Web Apps reciban un contenedor activo.
- El probe `MIG006SpreadsheetAccessProbe.mjs` (5/5 en su entorno simulado) valida guardas, lectura/escritura aisladas y comportamiento del código. No demuestra el comportamiento de un deployment Web App real. La validación Beta MIG-006/MIG-008 sigue pendiente.
- La propiedad FEEDBACK `rich_text_mode` no puede retirarse solo porque exista un lector: se necesita una ruta de publicación central autorizada, versionada, con read-back, RBAC Developer, invalidación/caché y comportamiento fail-closed.
- Las claves de AUTH, CATALOG y ADMIN descritas arriba son estado operativo o secretos protegidos, no configuración genérica. Sus migraciones deben preservar idempotencia, concurrencia, expiración, aislamiento, trazabilidad y recuperación.
- No se accedió a Apps Script, PropertiesService instalado, Spreadsheet, Drive ni deployments. No se borró ni modificó ningún valor externo.

**Resultado de esta reconciliación:** inventario estático actualizado. MIG-026 continúa EN PROGRESO; los siguientes tramos seguros son diseñar y probar el mecanismo de publicación central de parámetros sin desplegar, y resolver las dependencias de acceso real a Spreadsheet. No se autoriza iniciar MIG-027.
