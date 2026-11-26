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



### Actualización BETA-F007 — resolución de identidad de Tutorial en carga YouTube

- **Estado:** CORRECCIÓN EN RAMA Y VALIDADA EN CI; reproducción y carga real en YouTube Beta pendientes.
- **Brecha identificada:** CATALOG podía devolver tutoriales históricos sin ID físico con `ID: null`. El botón de carga enviaba el título visible como referencia. FEEDBACK tenía `findTutorialByIdentity_()` para resolver identidades legacy, pero `findTutorialRow_()` —usado por la inicialización y el envío de aprobación de vídeo— no aceptaba esas referencias y podía terminar en `Tutorial no encontrado`.
- **Corrección de contrato:** CATALOG añade `referenceId` a cada tutorial: utiliza el ID físico cuando existe y, para filas históricas sin ID, genera `legacy-<SHA-256>` a partir del título físico original. La identidad se calcula antes de proyectar renombres, por lo que permanece estable ante los cambios append-only de título.
- **Corrección de frontend:** el modal de detalle envía `item.ID || item.referenceId || item.Tema`; los metadatos usan la misma referencia estable. El frontend sigue coordinando CATALOG y FEEDBACK; no se añadió comunicación directa entre servicios Apps Script ni URLs de servicios en backend.
- **Corrección FEEDBACK:** `findTutorialRow_()` resuelve referencias `legacy-<SHA-256>` mediante `findTutorialByIdentity_()` y proyecta ediciones/renombres. Los IDs canónicos `tut-...` siguen siendo estrictos: si no existen, se rechazan sin buscar otro tutorial por título.
- **Pruebas:** `FeedbackTutorialLookupBoundedRead` 9/9 PASS; `TutorialIntegrity` 48/48 PASS; FEEDBACK precondiciones de subida resumable 9/9 PASS, incluida inicialización YouTube con Tutorial histórico y referencia legacy.
- **Validación completa:** CI run `45505972628`, HEAD `ff27665eb3083b5c401f13f9268e983394320214`: SUCCESS; 517 suites, 6,155 pruebas, 0 fallos. Chromium responsive 184/184 PASS en 1366×768, 390×844, 360×800 y 320×700. Pages run `45505971953`: SUCCESS.
- **Alcance no verificado:** no se reprodujo el error contra la cuenta/Spreadsheet/Drive Beta del usuario ni se realizó una subida real a YouTube. No se desplegó Apps Script ni se modificaron recursos externos. La prueba Beta debe cubrir tanto tutorial histórico sin ID físico como tutorial nuevo con ID `tut-...`.


- **Ampliación de verificación — 2026-11-24:** se añadió cobertura directa de inicialización YouTube para ambos tipos de destino: Tutorial histórico con referencia `legacy-<SHA-256>` y Tutorial nuevo con ID canónico `tut-...`. FEEDBACK precondiciones de subida resumable: 10/10 PASS. CI run `45506352069`: SUCCESS; 517 suites, 6,156 pruebas, 0 fallos. Chromium 184/184 PASS; Pages run `45506351422`: SUCCESS. La carga real en YouTube Beta sigue sin ejecutarse.


### Rectificación de trazabilidad de IDs — 2026-11-24

La adenda previa que clasificó AUG-147, AUG-148, AUG-149 y AUG-150 como etiquetas no oficiales asignadas por el asistente fue incorrecta y queda rectificada:

- **AUG-147:** confirmado en `ChangesLogs.txt` con registro de inicio y cierre (caché Service Worker v76).
- **AUG-150:** confirmado en `ChangesLogs.txt` con registro de corrección/cierre (constantes `INBOX_AUDIT_SHEET_NAME` y `INBOX_AUDIT_HEADERS`).
- **AUG-148 y AUG-149:** constan como tareas pendientes en `checkpoint.md` y relacionadas con BETA-F004/BETA-F005; no se registra su cierre funcional en `ChangesLogs.txt`.
- No se deben borrar los registros históricos ni reutilizar estos IDs para nuevas tareas. El orden actual de ejecución lo define `Tareas_Activas.md`, añadido en el commit `9442da203814be4891de82f93a1730700fb4b31d`.


## Revisión de automatización Beta desde GitHub Actions — 2026-11-25

> Estos hallazgos proceden de inspección estática del repositorio y del workflow. No son defectos confirmados de los deployments remotos: aún no se ha ejecutado una prueba de salud contra las seis URLs. La revisión se realizó sobre la rama `GPSpedia2.2.5_work`; no se modificó la rama base.

### BETA-PLAN-F001 — Workflow de salud no activable manualmente desde la rama de trabajo
- **Fecha:** 2026-11-25.
- **Servicio / módulo:** GitHub Actions, `.github/workflows/deployed-service-health.yml`.
- **Evidencia:** workflow presente en la rama de trabajo, ausente en la rama predeterminada `main`; solo declara `workflow_dispatch`. No se identificaron ejecuciones del workflow.
- **Impacto:** no se dispone de un mecanismo de activación manual utilizable desde la rama de trabajo mientras el workflow no esté disponible en la default branch.
- **Severidad:** ALTA (infraestructura de prueba).
- **Estado:** CONFIRMADO por inspección del repositorio.
- **Corrección prevista:** habilitar un trigger restringido a push en la rama de trabajo, sin modificar main/base.

### BETA-PLAN-F002 — Gate de aislamiento Beta no configurado en el workflow
- **Fecha:** 2026-11-25.
- **Módulo:** workflow de health / `RemoteServiceHealth.mjs`.
- **Evidencia:** el script exige `GPSPEDIA_HEALTH_ENV=BETA_ISOLATED` y `GPSPEDIA_CONFIRM_BETA_ENDPOINTS=I_HAVE_VERIFIED_THE_SIX_ENDPOINTS_ARE_BETA`; el workflow no proporciona dichos valores.
- **Impacto:** el runner aborta antes de consultar los endpoints.
- **Severidad:** ALTA (control de ejecución).
- **Estado:** CONFIRMADO por inspección.
- **Corrección prevista:** declarar los valores de gate en el job y mantener el alcance limitado a los endpoints Beta confirmados; credenciales de pruebas futuras se gestionarán mediante GitHub Actions Secrets/Environment, no en código ni propiedades Apps Script.

### BETA-PLAN-F003 — Health checker no verifica una versión de deployment esperada
- **Fecha:** 2026-11-25.
- **Módulo:** `JS/Tests/RemoteServiceHealth.mjs`.
- **Evidencia:** se valida que la versión sea una cadena no vacía, sin comparación con una matriz esperada.
- **Impacto:** deployment desactualizado podría pasar el probe de salud.
- **Severidad:** MEDIA.
- **Estado:** CONFIRMADO por inspección.
- **Corrección prevista:** contrato de versión esperado explícito y registro de versión remota observada, sin asumir que la versión fuente implica versión desplegada.

### BETA-PLAN-F004 — Umbrales del probe difieren del contrato de salud
- **Fecha:** 2026-11-25.
- **Módulo:** `RemoteServiceHealth.mjs` y `Services/SERVICE_HEALTH.md`.
- **Evidencia:** contrato documenta timeout 8 s y umbral lento 2 s; probe usa timeout 12 s y clasifica toda respuesta válida como PASS.
- **Impacto:** reporte no alineado con los estados/umbrales documentados.
- **Severidad:** MEDIA.
- **Estado:** CONFIRMADO por inspección.
- **Corrección prevista:** timeout y clasificación de latencia alineados, con PASS/SLOW/FAIL.

### BETA-PLAN-F005 — Número de intentos de fallo no refleja intentos reales
- **Fecha:** 2026-11-25.
- **Módulo:** `RemoteServiceHealth.mjs`.
- **Evidencia:** el resultado de error indica tres intentos aunque algunos errores no transitorios abortan antes.
- **Impacto:** reporte de diagnóstico inexacto.
- **Severidad:** BAJA.
- **Estado:** CONFIRMADO por inspección.
- **Corrección prevista:** contador real de intentos y reintentos.

### BETA-PLAN-F006 — AUTH health añade metadata no contemplada en contrato
- **Fecha:** 2026-11-25.
- **Módulo:** `JS/Services/Auth.js`, contrato `Services/SERVICE_HEALTH.md`.
- **Evidencia:** respuesta incluye `sessionAuthority` además de service/version/status, contrario al contrato público mínimo documentado.
- **Impacto:** desviación de contrato; no se considera exposición de secreto por esta inspección.
- **Severidad:** BAJA.
- **Estado:** CONFIRMADO por inspección estática.
- **Corrección prevista:** revisar y armonizar contrato público de los seis servicios, evitando metadata adicional.

### BETA-PLAN-F007 — Versión ADMIN documentada desactualizada
- **Fecha:** 2026-11-25.
- **Módulo:** `Services/SERVICE_HEALTH.md`.
- **Evidencia:** documento señala ADMIN 2.7.1; fuente `JS/Services/admin.js` declara 2.7.2.
- **Impacto:** referencia documental inconsistente; la versión del deployment no está verificada.
- **Severidad:** BAJA.
- **Estado:** CONFIRMADO por inspección fuente/documentación.
- **Corrección prevista:** actualizar documentación a la versión fuente vigente y distinguirla de la versión remota.

### BETA-PLAN-F008 — Browser tests no validan el frontend Beta desplegado
- **Fecha:** 2026-11-25.
- **Módulo:** `JS/Tests/Aug146ResponsiveBrowser.mjs` y estrategia E2E.
- **Evidencia:** tests existentes utilizan servidor local y respuestas interceptadas/sintéticas de servicios; no verifican la interacción contra el frontend Beta real.
- **Impacto:** la cobertura local no acredita funcionamiento integral con deployments Beta.
- **Severidad:** MEDIA (brecha de cobertura).
- **Estado:** CONFIRMADO por inspección.
- **Corrección prevista:** suite Playwright separada para frontend Beta real, con preflight de aislamiento y sin mezclar pruebas sintéticas con evidencia remota.

## Plan de solución y ejecución
1. Habilitar y endurecer el runner de salud GET en GitHub Actions, restringido a la rama de trabajo y con gates explícitos de entorno Beta.
2. Corregir el contrato del checker: timeout, latencia lenta, reintentos, versiones esperadas, identidad y campos permitidos.
3. Ejecutar el primer probe remoto de los seis servicios; registrar identidades/versiones/latencias de manera anonimizada. El resultado no certificará dependencias Sheets/Drive.
4. Diseñar e implementar probes funcionales read-only y de contrato, incluyendo CATALOG feed/cursor.
5. Preparar pruebas mutables con fixtures sintéticos, read-back, idempotencia, concurrencia, rollback y cleanup restringido a recursos creados por el runner.
6. Separar pruebas ADMIN/Drive, multimedia y YouTube (OAuth/API real) de los probes simples.
7. Preparar Playwright E2E contra frontend Beta, con registro de viewport/navegador y sin sustituir la suite local.
8. Al finalizar cada fase, documentar evidencia, resultado, regresiones, recursos eliminados y pruebas pendientes.



## Validación remota GET — primera ejecución (2026-11-26)
- Workflow: `deployed-service-health.yml`; runs `45729426765` y `45729430374`, ambos SUCCESS. La segunda ejecución probó commit `762308d7cf80e840177d9ed5cc15714de87d3414` y fue posterior a la actualización de documentación.
- Probe real GET `?debug=true`, seis endpoints Beta configurados localmente, sin escrituras. Resultado 6/6 disponibles.
- Versiones reportadas por los deployments: AUTH 2.2.5; CATALOG 2.4.0; WRITE 2.3.1; FEEDBACK 1.2.2; UTILITIES 1.5.0; ADMIN 2.7.1.
- Latencias del run 45729430374: AUTH 1575 ms; CATALOG 1117 ms; WRITE 1460 ms; FEEDBACK 1612 ms; UTILITIES 1105 ms; ADMIN 2701 ms. ADMIN se clasifica SLOW (>=2,000 ms); los otros cinco PASS.
- **Hallazgo confirmado BETA-PLAN-F009 (media):** deployment ADMIN Beta informa versión 2.7.1, mientras la fuente de trabajo declara 2.7.2. El deployment está atrasado respecto a la fuente revisada; no se ha desplegado ni alterado el servicio. El probe confirma disponibilidad e identidad, no equivalencia del código desplegado.
- **Hallazgo confirmado BETA-PLAN-F010 (media, rendimiento):** ADMIN supera el umbral de 2 s en ambas ejecuciones (2431 y 2701 ms). Debe investigarse antes de atribuirlo a una causa; el probe GET no identifica origen.
- La primera ejecución (run 45729426765) también reportó ADMIN SLOW 2431 ms y los otros cinco PASS; confirma persistencia de latencia alta en dos observaciones breves, no medición estadística.
- Evidencia: https://github.com/infogpstech/GPSpedia/actions/runs/45729430374
- Alcance: únicamente GET; no se verificaron Sheets/Drive, acciones autenticadas, operaciones funcionales ni UI.


## Validación Beta — CATALOG feed read-only (2026-11-26)
- Run Actions `45729926589`, job SUCCESS, commit `a8a46da383caa1b70bbc95d18faf909a03d94a4c`. URL de evidencia: https://github.com/infogpstech/GPSpedia/actions/runs/45729926589
- GET `catalogFeed=1` sin mutaciones, cursor 0/limit 1: status success, resetRequired=false, currentRevision=5, minRevision=1, hasMore=true, changeCount=1, nextCursor=1. Solo se registraron metadatos de prueba; no se reprodujo ni almacenó contenido de eventos.
- GET en cursor 5/limit 1: success, changeCount=0, hasMore=false, nextCursor=5. Estructura de respuesta y cursor final válidos.
- Latencia feed: 2.374 s (cursor inicial) y 2.381 s (cursor final). **BETA-PLAN-F011 (media, rendimiento):** el feed CATALOG supera 2 s en ambas lecturas; requiere investigación/medición adicional, no atribuir aún causa.
- La revisión del cursor 0 mostró un evento disponible en el feed; se evitó registrar IDs, snapshots o contenido del evento.
- Esta prueba no cubrió paginación con múltiples eventos, cursor fuera de rango/antiguo, reset requerido, retención ni reconstrucción snapshot.


### BETA — CATALOG feed boundaries (2026-11-26)
- Run 45730637687 SUCCESS; commit probado d529d8ee0dd6e5d31589450471b5733ec7647930.
- GET-only: cursor futuro 999999 solicitó reset (currentRevision=5, nextCursor=5, sin eventos); cursor negativo y malformado rechazados; límites 0 y 51 rechazados. Cursor tail sin cambios y válido.
- Feed cursor probe: cursor 0 devuelve 1 evento metadata, revision 5, nextCursor 1, hasMore true; cursor tail 5 devuelve vacío. No se registraron payloads/event IDs.
- Latencias de boundary: tail 3285 ms, futuro 2890 ms, límite 0 1134 ms, límite 51 1443 ms; inicial 3254 ms, tail anterior 1902 ms. Variabilidad visible, no atribuible aún a causa específica.
- Health en mismo run: 6/6 disponibles; ADMIN SLOW 2628 ms; AUTH 2003 ms; CATALOG 1267 ms; FEEDBACK 1723 ms; UTILITIES 1221 ms; WRITE 1541 ms.
- Sin escrituras remotas, deploys ni cambios Spreadsheet.


### BETA — ADMIN repeated latency probe (2026-11-26)
- Run 45731465785 SUCCESS sobre commit 0401d81d8964a967aa95da00003d1e4275cbdb9b.
- Probe GET-only ejecutó 5 lecturas consecutivas del health ADMIN; deployment respondió versión 2.7.1. Tiempos: 2556, 2206, 1390, 1480, 1622 ms; mediana 1622 ms, mínimo 1390, máximo 2556; 2/5 >= 2000 ms.
- Mismo run: health global 6/6. ADMIN 3050 ms en probe general; AUTH 1418; CATALOG 1075; FEEDBACK 1712; UTILITIES 1023; WRITE 1168.
- El fuente de trabajo declara ADMIN 2.7.2 (const ADMIN_SERVICE_VERSION), deployment aún devuelve 2.7.1. Confirmada discrepancia, no se desplegó.
- Latencia variable, la mediana del probe enfocado queda bajo 2s; no evidencia causal sobre Spreadsheet/Drive ni atribución de bottleneck.
- Sin mutaciones ni despliegues.


## 2026-11-25 — Ampliación de matriz de lectura CATALOG
- Se añadió `JS/Tests/RemoteCatalogFeedMatrix.mjs`, probe GET-only que toma revision/minRevision de la respuesta inicial y examina cursor actual, borde de retención, cursor intermedio, límite pequeño y repetición del cursor actual.
- El runner compara estabilidad de campos estructurales entre dos lecturas del cursor actual y valida contrato, límites de respuesta y tiempos; no guarda payloads de eventos ni efectúa escrituras.
- Integración en `.github/workflows/deployed-service-health.yml`; el push de ambos archivos activa el workflow restringido a la rama de trabajo. Commit de integración: `52386ae0b6fdf0e593c9b9e53e8ec45d7af877a5`; commit previo que añadió el probe: `4fef0a34000b0e830bbf2ac383f29b3305f0073e`.
- La referencia de la rama fue verificada en ese SHA. La consulta de status inmediatamente posterior devolvió `pending` sin checks asociados; el resultado de Actions aún no está disponible mediante las consultas GET permitidas. No se afirma que el probe haya ejecutado.
- Alcance: ampliar evidencia de cursor/retención/repetibilidad sin mutar datos Beta. Los escenarios que exigen crear/limpiar registros o Drive siguen fuera de esta prueba read-only.


## 2026-11-25 — Validación estática del runner matrix y obstáculo de ejecución
- Se recuperó la fuente publicada de `RemoteCatalogFeedMatrix.mjs` y se verificó su sintaxis con Node.js 22 local (`node --check`): PASS. Esto no ejecuta el probe ni representa una lectura remota.
- Se intentó consultar el status/checks del commit de integración; el status devolvió `pending`, sin checks asociados. El conector GitHub disponible no expone la consulta de workflow runs para pushes y sus fetches están restringidos a endpoints autorizados. El entorno shell local tampoco resuelve `api.github.com` (error DNS), por lo que no puede consultar Actions ni invocar Apps Script directamente desde aquí.
- La nueva prueba sigue integrada en el workflow por push y `workflow_dispatch`; el resultado remoto permanece sin verificar. No se manipularon datos ni se intentó un deployment.
- Continuar ampliando tests read-only sin inventar resultados; evitar workflows que requieran endpoint externo hasta que se obtenga evidencia verificable.


## BETA-PLAN-F009 — matriz CATALOG: comprobaciones insuficientes de coherencia (2026-11-25)
- La matriz GET-only anterior comparaba repetición de cursor actual, pero no verificaba coherencia de revisiones/minRevision entre muestras, nextCursor acotado por currentRevision, reset en cursor bajo retención ni semántica de cola vacía.
- Se amplió `RemoteCatalogFeedMatrix.mjs` con esas aserciones y un requisito de reset para cursor previo a minRevision cuando esta sea positiva. Los probes permanecen GET-only, sin payloads de eventos ni mutaciones.
- Validación: `node --check` PASS sobre la fuente reconstruida exacta. Ejecución remota y prueba funcional de las aserciones en deployment Beta no verificadas; pendiente Actions.


## Adenda BETA-F009 — ajuste de estabilidad ante concurrencia (2026-11-25)
- La versión endurecida de la matriz asumía que currentRevision/minRevision permanecían idénticas durante todas las lecturas y que una consulta a la revisión inicial siempre devolvía cola vacía. Esto podía producir falsos fallos si el catálogo recibía cambios legítimos durante la prueba.
- Se eliminó esa suposición: ahora se valida el cursor de continuación acotado por la revisión de cada respuesta, la solicitud de reset cuando cursor queda por debajo de minRevision, y respuesta sin eventos cuando resetRequired está activo. La repetición se compara como contradictoria solo cuando las revisiones y condiciones observadas permanecen estables. Se informa indicador de concurrencia.
- Simulación offline de la lógica de aserciones: 5/5 escenarios PASS (caso normal, cambio concurrente, nextCursor fuera de rango, reset omitido bajo retención y reset con eventos). No es ejecución contra Apps Script Beta.
- Commit de corrección: `49fce769cc0844cca3b518482411ebca4babed16`.


## BETA-F010 — medición de latencia parcial en probe de salud (2026-11-25)
- `RemoteServiceHealth.mjs` capturaba la latencia inmediatamente después de recibir headers HTTP y antes de consumir/parsing el body JSON. La métrica podía subestimar el tiempo total de respuesta y compararse incorrectamente con el umbral SLOW.
- Se movió la medición a después de leer y parsear la respuesta JSON; el tiempo ahora incluye lectura del body. Sigue excluyendo validaciones posteriores del contrato y no es medición de render/frontend.
- Validación de fragmento con Node 22 y body simulado con demora de 25 ms: PASS; latencia medida incluyó lectura del body (25 ms observados). No fue prueba remota de servicio.
- Cambio publicado en commit `c77c4d09db185883851635a6b4f7c0a69c7fb755`.


## BETA-F012 — política de reintentos y conteo reportado (2026-11-25)
- El probe de salud reintentaba 429 y 5xx, pero no HTTP 408 (Request Timeout) ni 425 (Too Early), que son respuestas transitorias aptas para reintento acotado en este GET idempotente.
- La salida FAIL indicaba siempre “3 intentos” aunque el bucle podía terminar antes; ahora informa el valor real de `attempts`.
- Corregido en `JS/Tests/RemoteServiceHealth.mjs`: reintenta 408, 425, 429 y 5xx dentro del máximo de tres intentos; los demás 4xx no se reintentan.
- Prueba aislada Node 22 de clasificación HTTP y formato de reporte: 8/8 PASS. No es una prueba de red ni de Apps Script.
- Commit de implementación: `71ebb84c8011e4a1e04a5e2050ac061145205de6`.


## BETA-F013 — el probe no detectaba deployments con versión obsoleta (2026-11-25)
- El health probe solo exigía que `body.version` fuera una cadena no vacía; un deployment antiguo podía aprobar identidad/estado y aparecer como PASS/SLOW.
- Se añadió comparación exacta contra las seis versiones de la tabla `Servicios/SERVICE_HEALTH.md` del mismo `TARGET_COMMIT`. Este documento es la fuente del contrato versionado; no se duplican números en el runner ni se modifica la configuración de endpoints del frontend.
- Una versión diferente produce FAIL con versión del deployment y versión esperada. La versión documentada describe fuente esperada y no certifica deployment hasta ejecutar el probe remoto.
- Integración publicada en `JS/Tests/RemoteServiceHealth.mjs`, commit `a74d35cc13ddc44b9820dc426012b8d07998497b`. El workflow ya vigila `Services/SERVICE_HEALTH.md` como ruta de activación.
- Pendiente: validar parser de tabla con Node 22 y ejecutar el workflow sobre Beta; no se ha afirmado ejecución remota.
