# GPSpedia — Hallazgos de pruebas Beta

Fecha de apertura: 2026-11-22
Repositorio: `infogpstech/GPSpedia`
Rama: `GPSpedia2.2.5_work`
HEAD de referencia: `f8df2c91f8408c311d47ec7c67091cf482cf5cb4`

## Alcance
Registrar únicamente hallazgos observados en pruebas Beta reales. Durante esta etapa no corregir código: documentar evidencia, impacto, severidad, alcance y pasos de reproducción. No incluir secretos, tokens, IDs personales, datos productivos, mensajes, VIN, URLs privadas ni contenido de archivos.

## Estado inicial
- No hay hallazgos Beta registrados todavía.
- Esto no significa que no existan defectos: las pruebas remotas aún no se han ejecutado desde esta sesión.
- Las pruebas locales/CI anteriores no se contabilizan como pruebas Beta.
- Las mediciones sin instrumentación suficiente se registran como **NO MEDIDO**.

## Formato de hallazgo

### BETA-FXXX — Título breve
- **Fecha/hora:**
- **Servicio / módulo / flujo:**
- **Commit probado:**
- **Entorno:** deployment Beta y recursos aislados (solo etiquetas sintéticas; sin URLs/IDs privados).
- **Rol / dispositivo / navegador:**
- **Precondiciones:**
- **Pasos para reproducir:**
- **Resultado esperado:**
- **Resultado observado:**
- **Evidencia anonimizada:**
- **Frecuencia / muestras:**
- **Impacto:**
- **Severidad:** CRÍTICA / ALTA / MEDIA / BAJA / INFORMATIVA.
- **Estado:** NUEVO / CONFIRMADO / NO REPRODUCIBLE / PENDIENTE DE DATOS.
- **Tarea relacionada:**

## Registro
_Aún no hay hallazgos confirmados._


### BETA-F001 — Configuración incompleta de invalidación remota USERS
- **Fecha/hora:** 2026-11-22 (reporte del usuario; hora exacta no registrada).
- **Servicio / módulo / flujo:** AUTH → Coordinator → invalidación remota de caché de actor en USERS; flujo de inicio de sesión.
- **Commit probado:** `f3541aac4e08db8eca6c1d60b8242e475d9d7cd6` (HEAD de trabajo al registrar el hallazgo).
- **Entorno:** Beta declarado por el usuario; aislamiento de los recursos no verificado independientemente.
- **Rol / dispositivo / navegador:** NO MEDIDO.
- **Precondiciones:** El usuario informa que no puede iniciar sesión y recibe el mensaje “la configuración de invalidación remota de USERS está incompleta”.
- **Pasos para reproducir:** Intentar iniciar sesión en Beta. No se dispone de una sesión remota para reproducirlo independientemente.
- **Resultado esperado:** AUTH debe completar la invalidación remota requerida y permitir continuar con la creación/sincronización de sesión.
- **Resultado observado:** El usuario reporta que el login es rechazado con el mensaje indicado.
- **Evidencia anonimizada:** En `JS/Services/Coordinator.js`, `invalidateSessionActorCaches_` exige que `GPSpedia_SERVICE_URL_USERS` sea una URL Apps Script terminada en `/exec` y que `GPSpedia_COORDINATOR_SECRET_USERS` tenga al menos 32 caracteres. La función valida también WRITE, FEEDBACK y ADMIN antes de contactar cualquier destino. En `JS/Services/Auth.js`, la creación de sesión puede invocar invalidación remota al retirar sesiones expiradas o excedentes.
- **Frecuencia / muestras:** Un reporte del usuario; reproducción independiente NO MEDIDA.
- **Impacto:** Bloqueo del inicio de sesión cuando el flujo necesita revocar una sesión anterior/expirada y la configuración de Coordinator no supera la validación.
- **Severidad:** ALTA.
- **Estado:** NUEVO — causa probable localizada en la configuración de ScriptProperties de Coordinator; valores y coincidencia de secretos aún no verificados.
- **Tarea relacionada:** BETA-01 — AUTH / USERS y aislamiento; revisar las propiedades Beta de Coordinator para USERS, WRITE, FEEDBACK y ADMIN sin revelar sus valores.

### BETA-F002 — Configuración de servicios de Coordinator excede el límite de ScriptProperties
- **Fecha/hora:** 2026-11-22 (reporte del usuario; hora exacta no registrada).
- **Servicio / módulo / flujo:** Coordinator → invalidación y preparación remota de cachés de sesión.
- **Commit probado:** Rama `GPSpedia2.2.5_work`; SHA exacto del despliegue Beta NO VERIFICADO desde esta sesión.
- **Entorno:** Coordinator Beta declarado por el usuario.
- **Precondiciones:** El proyecto Coordinator ya alcanzó el máximo de 50 propiedades de ScriptProperties. El usuario confirma que no existe `GPSpedia_SERVICE_URL_USERS` y que no puede agregarla por el límite.
- **Pasos para reproducir:** Intentar agregar la propiedad faltante en las propiedades del proyecto Coordinator cuando ya contiene 50 propiedades.
- **Resultado esperado:** Coordinator debe poder obtener las URLs y secretos requeridos para comunicarse con USERS, WRITE, FEEDBACK y ADMIN desde la fuente de configuración prevista para el entorno.
- **Resultado observado:** No es posible agregar la propiedad requerida; el login reporta configuración de invalidación remota USERS incompleta.
- **Evidencia anonimizada:** `JS/Services/Coordinator.js` crea el servicio con `PropertiesService.getScriptProperties()`. Tanto `invalidateSessionActorCaches_` como `primeSessionActorCaches_` leen individualmente `GPSpedia_SERVICE_URL_<SERVICIO>` y `GPSpedia_COORDINATOR_SECRET_<SERVICIO>` para USERS, WRITE, FEEDBACK y ADMIN. La primera función valida los cuatro pares antes de enviar solicitudes. La lectura actual no consulta directamente la hoja `api_config`. El comentario de cabecera del archivo indica que Coordinator no accede a Spreadsheet.
- **Frecuencia / muestras:** Una confirmación del usuario sobre el límite y la propiedad ausente; reproducción independiente NO MEDIDA.
- **Impacto:** Coordinator no puede completar los flujos de invalidación/preparación de caché de sesión cuando faltan propiedades y no hay capacidad para agregarlas; puede bloquear el login y otros flujos de sesión.
- **Severidad:** ALTA.
- **Estado:** NUEVO — limitación de arquitectura/configuración confirmada por inspección de código y reporte del usuario. No se modificó código.
- **Tarea relacionada:** BETA-01 — AUTH / USERS y aislamiento. Para una etapa posterior a Beta, evaluar una única fuente central de configuración (por ejemplo, `api_config`) y eliminar la dependencia de una propiedad individual por URL/secreto. Requiere revisar acceso, permisos, caché, disponibilidad y manejo seguro de secretos antes de diseñar el cambio.


## Hallazgo — fallos FEEDBACK de dashboard/aportes/Inbox y feed CATALOG — 2026-11-24

- **Evidencia reportada:** el cliente muestra `No se inyectó el proveedor de la Spreadsheet de identidad` al abrir Inbox; dashboard de actividad no carga indicadores y el panel de aportes falla. CATALOG registra `Falta la hoja requerida del feed CATALOG: CatalogChangeState` al establecer el cursor inicial.
- **Causa FEEDBACK confirmada por inspección:** `JS/Services/feedback.js` llamaba a `getCachedSharedSessionActor_()` sin el argumento obligatorio `loadSpreadsheet`, aunque el helper `SharedSessionActor.js` ya no permite fallback global. Las acciones protegidas de dashboard, aportes e Inbox comparten este dispatcher.
- **Causa CATALOG confirmada por inspección:** las hojas `CatalogChangeState` y `CatalogChangeEvents` son parte del esquema MIG-026, pero no existen en la Spreadsheet consultada. El runtime falla cerrado y no las crea automáticamente por diseño.
- **Corrección preparada en rama:** inyección de `loadSpreadsheet: getSpreadsheet` en FEEDBACK; inicializador manual e idempotente `initializeCatalogChangeFeedSheets()` para CATALOG, con validación previa y sin sobrescribir datos.
- **Estado:** corrección publicada en `GPSpedia2.2.5_work`; CI run `45471714577` SUCCESS (516 suites, 6,105 pruebas, 0 fallos) y Pages run `45471712477` SUCCESS. No se invocaron deployments ni se consultó/modificó la Spreadsheet remota desde esta tarea.
- **Validación Beta requerida:** en Spreadsheet Beta aislada, ejecutar el inicializador manual CATALOG, comprobar encabezados/read-back y consulta GET del feed; desplegar FEEDBACK con proveedor explícito y probar dashboard, aportes e Inbox con usuario sintético. No ejecutar contra producción sin autorización.


### BETA-F003 — Modal Developer conserva estilos anteriores y distribución visual incorrecta
- **Fecha/hora:** 2026-11-24 (reporte del usuario; hora exacta no registrada).
- **Servicio / módulo / flujo:** Frontend / modal Developer / navegación y consola.
- **Commit de referencia:** `1d9a2fb80a2abddf9221b6ff5c7065eadcb2e4dd`; SHA realmente servido por Beta: NO VERIFICADO.
- **Entorno:** versión Beta reportada por el usuario; navegador/dispositivo no especificados.
- **Rol / dispositivo / navegador:** Desarrollador; dispositivo y navegador NO MEDIDOS.
- **Precondiciones:** abrir el modal Developer después de los últimos cambios.
- **Pasos para reproducir:** abrir el modal; observar las cuatro pestañas, el ancho de la consola y los controles del encabezado.
- **Resultado esperado:** Diagnóstico, Base de datos, Imágenes y Sistema en una fila horizontal; consola al 50% en escritorio y 100% en móvil; información, limpiar y copiar agrupados a la izquierda.
- **Resultado observado:** el usuario reporta pestañas apiladas verticalmente, consola demasiado estrecha y botones de limpiar/copiar separados.
- **Evidencia técnica de revisión:** el CSS de la rama contiene reglas para la distribución solicitada, pero el Service Worker continúa en `gpsepedia-cache-v75` aunque `style.css` cambió en `113ed1d5`. La caché prioriza la respuesta almacenada y refresca en segundo plano; el origen probable es CSS obsoleto en la PWA. La prueba Chromium del HEAD actual ya contiene aserciones de alineación/ancho, pero no demuestra qué CSS recibió el dispositivo del reporte.
- **Frecuencia / muestras:** reporte del usuario; reproducción independiente NO EJECUTADA.
- **Impacto:** navegación y uso del panel Developer degradados.
- **Severidad:** MEDIA.
- **Estado:** REPORTADO; causa probable de caché localizada, pendiente de corrección y comprobación Beta.
- **Tarea relacionada:** AUG-147.

### BETA-F004 — Dashboard de actividad continúa sin mostrar datos
- **Fecha/hora:** 2026-11-24 (reporte del usuario; hora exacta no registrada).
- **Servicio / módulo / flujo:** Frontend Dashboard → acción `getActivityLogs` → FEEDBACK.
- **Commit de referencia:** `1d9a2fb80a2abddf9221b6ff5c7065eadcb2e4dd`; SHA realmente servido por Beta: NO VERIFICADO.
- **Entorno:** Beta reportado por el usuario; identidad de Spreadsheet y deployment no verificados.
- **Rol / dispositivo / navegador:** Desarrollador; dispositivo y navegador NO MEDIDOS.
- **Precondiciones:** abrir Dashboard de actividad.
- **Pasos para reproducir:** abrir Dashboard y revisar Actividad reciente, Aportes e Indicadores.
- **Resultado esperado:** presentar actividad y agregados disponibles, o estados vacíos/diagnóstico cuando no existan registros.
- **Resultado observado:** el usuario informa que no se muestra ningún dato.
- **Evidencia técnica de revisión:** `handleGetActivityLogs()` consulta `INBOX_AUDIT_SHEET_NAME` antes de devolver el objeto con `data`, `contributions`, `insights` y `diagnostics`; esa constante no está declarada en `feedback.js`. Este error puede abortar la respuesta completa. Falta comprobar si hay causas adicionales tras corregirlo.
- **Frecuencia / muestras:** reporte del usuario; reproducción independiente NO EJECUTADA.
- **Impacto:** el Dashboard no puede mostrar historial ni indicadores aunque las hojas fuente tengan registros.
- **Severidad:** ALTA.
- **Estado:** REPORTADO; causa de código probable identificada, pendiente de corrección y pruebas.
- **Tarea relacionada:** AUG-148; dependencia directa AUG-150.

### BETA-F005 — Formulario de Tutorial no permite subir imagen de tarjeta
- **Fecha/hora:** 2026-11-24 (reporte del usuario; hora exacta no registrada).
- **Servicio / módulo / flujo:** Frontend Tutoriales → `openAddTutorialModal()` → FEEDBACK/CATALOG.
- **Commit de referencia:** `1d9a2fb80a2abddf9221b6ff5c7065eadcb2e4dd`; SHA realmente servido por Beta: NO VERIFICADO.
- **Entorno:** Beta reportado por el usuario; navegador no especificado.
- **Rol / dispositivo / navegador:** Desarrollador; dispositivo y navegador NO MEDIDOS.
- **Precondiciones:** abrir Agregar Tutorial.
- **Pasos para reproducir:** abrir el formulario y buscar un control para seleccionar/subir la imagen de portada.
- **Resultado esperado:** poder seleccionar y cargar una imagen de tarjeta, con persistencia de su referencia en el campo `Imagen` del esquema Tutorial.
- **Resultado observado:** el formulario no ofrece forma de subir una imagen.
- **Evidencia técnica de revisión:** el formulario solo incluye campos de texto y carga de vídeo; `handleAddTutorial()` construye la fila con la columna `Imagen` vacía. No se encontró un flujo de carga de imagen conectado al alta de tutorial.
- **Frecuencia / muestras:** reporte del usuario; reproducción independiente NO EJECUTADA.
- **Impacto:** las tarjetas de tutorial no pueden recibir una imagen de portada desde el flujo de alta.
- **Severidad:** MEDIA.
- **Estado:** REPORTADO; brecha de interfaz/contrato confirmada por inspección estática.
- **Tarea relacionada:** AUG-149.

### BETA-F006 — FEEDBACK falla por constante INBOX_AUDIT_SHEET_NAME no definida
- **Fecha/hora:** 2026-11-24 (reporte del usuario; hora exacta no registrada).
- **Servicio / módulo / flujo:** FEEDBACK / auditoría Inbox / Dashboard de actividad.
- **Commit de referencia:** `1d9a2fb80a2abddf9221b6ff5c7065eadcb2e4dd`; SHA realmente servido por Beta: NO VERIFICADO.
- **Entorno:** Beta reportado por el usuario; deployment no verificado.
- **Rol / dispositivo / navegador:** NO MEDIDO.
- **Precondiciones:** ejecutar una acción que consulte el registro de auditoría Inbox o abrir Dashboard.
- **Pasos para reproducir:** abrir Panel de actividad y consultar el error del servicio FEEDBACK.
- **Resultado esperado:** FEEDBACK debe resolver el nombre de hoja y sus encabezados contractuales antes de consultar o escribir auditoría.
- **Resultado observado:** el usuario reporta `INBOX_AUDIT_SHEET_NAME is not defined`.
- **Evidencia técnica de revisión:** `JS/Services/feedback.js` referencia `INBOX_AUDIT_SHEET_NAME` en `ensureInboxAuditSheet_()` y `handleGetActivityLogs()`, e `INBOX_AUDIT_HEADERS` en creación/lectura de auditoría; ninguna está declarada en el archivo. El test `JS/Tests/InboxAuditTrail.js` define ambas dentro del harness y las inyecta en `new Function`, ocultando la omisión del runtime real. El contrato del test define `InboxAuditLog` con ocho encabezados: `eventId,timestamp,actorId,actorName,action,itemType,itemId,details`.
- **Frecuencia / muestras:** error reportado por el usuario; revisión estática independiente confirmada; ejecución remota NO REALIZADA.
- **Impacto:** falla la lectura del Dashboard y las operaciones del Inbox que intentan registrar eventos de auditoría.
- **Severidad:** ALTA.
- **Estado:** CORREGIDO EN RAMA Y VALIDADO EN CI; verificación del deployment Beta pendiente.
- **Validación de corrección:** `JS/Services/feedback.js` declara las constantes contractuales; `JS/Tests/InboxAuditTrail.js` ya no las inyecta y evalúa el esquema del módulo. CI run `45501003318`: SUCCESS, 517 suites / 6,125 pruebas, 0 fallos; pruebas Inbox 15/15 en FEEDBACK y 15/15 en MIG020.
- **Tarea relacionada:** AUG-150; desbloquea la validación completa de AUG-148.



## Adenda de rectificación y evidencia — 2026-11-24

- **IDs de tareas:** las referencias AUG-147, AUG-148, AUG-149 y AUG-150 que aparecen en el registro anterior fueron etiquetas asignadas por el asistente y no IDs confirmados del backlog oficial. Se preservan como texto histórico, pero no deben utilizarse para crear dependencias ni identificar tareas oficiales. La numeración BETA-F003 a BETA-F006 sí corresponde a hallazgos de este registro.
- **BETA-F003 / Developer:** la corrección de caché se aplicó en rama; el Service Worker usa `gpsepedia-cache-v76`. CI run `45501003318` y el responsive-browser del run correspondiente finalizaron correctamente. Sigue pendiente verificar el SHA servido por Beta/PWA.
- **BETA-F004 / Dashboard:** además del defecto de constantes registrado en BETA-F006, se identificó una causa independiente en `logUserActivity()`: una hoja `ActividadUsuario` vacía o con IDs estáticos no podía recibir nuevos eventos si no existía fórmula/configuración de secuencia. La función fallaba y solo registraba el error en Logger. Se corrigió con fallback `ACT-<UUID>` exclusivamente cuando no existe patrón previo; se conserva la fórmula válida y se rechazan patrones incompatibles. CI run `45502874404`: SUCCESS; 517 suites, 6,139 pruebas, 0 fallos. `ActivityLogAppendAtomic` 10/10 y `ActivityLogsBoundedRead` 8/8 PASS. La validación con Spreadsheet/deployment Beta aislados sigue pendiente; CI no demuestra que existan registros reales.
- **BETA-F005 / imagen Tutorial:** el reporte repetido de que no existe forma de subir imagen de tarjeta corresponde al mismo defecto. Se mantiene como un único hallazgo pendiente, sin duplicar tarea.
- **BETA-F006 / constante Inbox:** corregida en rama y validada por CI según la evidencia de cierre registrada en checkpoint y ChangesLogs. La comprobación en deployment Beta sigue pendiente.

### BETA-F007 — Error al subir vídeo de Tutorial a YouTube: «Tutorial no encontrado»

- **Fecha/hora:** 2026-11-24 (reporte del usuario; hora exacta no registrada).
- **Servicio / módulo / flujo:** frontend Tutoriales → carga de vídeo a YouTube → FEEDBACK / aprobación de vídeo.
- **Commit de referencia:** `a13dd84379e575d06f0a4e73bc1909cdad346f1d`; SHA servido por Beta: NO VERIFICADO.
- **Entorno:** Beta reportado por el usuario; deployment, cuenta OAuth y tutorial objetivo no verificados.
- **Precondiciones:** seleccionar un tutorial y ejecutar la subida del vídeo a YouTube desde la plataforma.
- **Resultado esperado:** FEEDBACK debe localizar el tutorial seleccionado, reservar/registrar la operación y completar el flujo de carga y aprobación según el contrato vigente.
- **Resultado observado:** el usuario reporta `Error durante la subida del vídeo: Tutorial no encontrado`.
- **Evidencia técnica disponible:** mensaje comunicado por el usuario. Aún no se ha localizado la rama exacta que produce el error ni se ha reproducido con un tutorial sintético; no se presume que el tutorial realmente falte.
- **Impacto:** no se puede completar la carga de vídeo asociada al tutorial desde la plataforma.
- **Severidad:** ALTA para el flujo de publicación; pendiente confirmar alcance.
- **Estado:** REPORTADO; investigación pendiente después de la corrección local del Dashboard y de la tarea de imagen de tarjeta.
- **Validación:** no se ejecutó subida real ni se utilizó OAuth/YouTube API. La prueba externa queda reservada a Beta aislada.


### Actualización BETA-F005 — implementación de imagen de tarjeta

- **Estado:** CORREGIDO EN RAMA Y VALIDADO EN CI; validación Beta aislada pendiente.
- **Implementación:** el modal `openAddTutorialModal()` incorpora selector opcional de archivo JPEG/PNG/WebP, máximo 3 MB. El frontend lee el archivo y envía `imagenDataUrl` con el alta existente; no se agrega otra acción ni otro servicio.
- **FEEDBACK:** valida formato, Base64, límite y firma binaria; almacena en Drive bajo `Cortes/Tutoriales`, confirma que la carpeta sea hija directa de la raíz autorizada y verifica permisos heredados. La columna C `Imagen` de `Tutorial` conserva solo la URL de referencia.
- **Idempotencia y recuperación:** hash de imagen incluido en el payload de creación; mismo `operationId`/contenido reutiliza archivo; contenido diferente se rechaza. Los archivos existentes se verifican por contenido/hash, MIME, tamaño, nombre, metadata y ubicación antes de reutilizarse.
- **CATALOG:** la URL Drive se normaliza al ID de archivo usado por el render de tarjetas.
- **Pruebas:** `TutorialIntegrity` 47/47 PASS; CI run `45504362878`: 517 suites, 6,147 pruebas, 0 fallos; Chromium 184/184 PASS; Pages run `45504362787`: SUCCESS.
- **Restricción:** no se ejecutó carga real ni se modificó Drive/Spreadsheet Beta o productivo. Comprobar el flujo con archivo sintético en Beta aislada según Tareas_Beta §23.

