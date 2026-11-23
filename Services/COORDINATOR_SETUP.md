> **AVISO DE VIGENCIA (2026-11-23):** documento histórico de la arquitectura anterior. No ejecutar sus instrucciones de crear/configurar secretos compartidos, claves de interconexión ni propiedades locales. La fuente normativa vigente es NORMAS_DESAROLLO.md §17: la coordinación funcional multi-servicio corresponde al frontend; las llamadas técnicas directas entre servicios pueden existir sin secretos manuales; la autorización la valida cada servicio receptor. Se conserva como evidencia histórica hasta retirar los componentes heredados.

> **Adenda de vigencia MIG-023 (2026-11-23):** el feed incremental del catálogo fue trasladado a \`JS/Services/catalog.js\`. El frontend consulta \`getCatalogChanges\` directamente en CATALOG y publica \`publishCatalogChange\`/\`publishCatalogReset\` allí. FEEDBACK solo devuelve metadatos; CATALOG reconstruye los snapshots canónicos desde Spreadsheet. Las rutas \`catalogFeed\`, \`getCatalogChanges\` y \`publishCatalogReset\` de este Coordinator se consideran compatibilidad histórica hasta MIG-025: no configurarlas ni usarlas en consumidores nuevos. El resto de Coordinator sigue siendo transitorio para las dependencias pendientes de MIG-024/MIG-025. Esta adenda prevalece sobre las instrucciones históricas de publicación del feed que aparecen más abajo.

# Coordinador compartido de mutaciones — configuración

Guía operativa paso a paso y matriz de despliegue por archivo: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).


## Estado actual — GPSpedia2.2.5_work (2026-11-22)

Esta sección describe el contrato vigente de la rama de trabajo y prevalece sobre las notas históricas más abajo cuando exista diferencia:

- AUTH conserva lease compartida únicamente para deleteUser. El login usa lock local para intentos fallidos/sesión y sincroniza el contexto inicial; no adquiere lease. Logout, cambios/restablecimientos de contraseña, reset de sesiones, cambios de rol y recuperación conservan la revocación/invalidación remota necesaria, pero no adquieren leases por acción.
- USERS conserva lease en createUser únicamente para excluir la creación frente a AUTH/deleteUser sobre el recurso lógico USERS. getUsers y updateProfile usan actor precargado localmente, sin lease.
- touchSession permanece como acción heredada sin consumidor frontend activo y sin lease. acceptTerms usa actor precargado y lock local para proteger su escritura JSON; no hace touchSession adicional.
- Después de syncUserSessions, Coordinator precarga el actor en USERS, WRITE, FEEDBACK y ADMIN mediante el endpoint interno autenticado __primeSessionActorCache. La precarga se ejecuta después de liberar el lock de Coordinator y en lotes de hasta 25 tokens por servicio. AUTH precalienta también su caché local.
- getCachedSharedSessionActor_ solo lee la caché local y renueva su TTL (máximo seis horas). Un cache miss no llama a validateSessionContext ni revalida identidad: falla cerrado y solicita iniciar sesión nuevamente. El login debe precargar los servicios antes de que el usuario ejecute acciones protegidas. Si la precarga de un servicio falla, AUTH registra el servicio pendiente y ese servicio no acepta acciones protegidas hasta que una nueva sesión precargue su actor.
- La invalidación remota incluye USERS, WRITE, FEEDBACK y ADMIN. El proyecto Coordinator debe tener GPSpedia_SERVICE_URL_USERS y GPSpedia_COORDINATOR_SECRET_USERS configurados, además de las URLs/secretos de los otros tres servicios. Cada proyecto de servicio debe tener SharedMutationClient.js actualizado, su GPSpedia_COORDINATOR_SECRET correspondiente y los endpoints internos de precarga e invalidación.
- CacheService renueva el TTL en cada hit local; una caché expirada/evictada requiere un nuevo login. No se guardan tokens en logs ni en los valores de actor: las claves se derivan mediante hash.

## Componentes

- `JS/Services/Coordinator.js`: servicio Apps Script independiente (v1.4.7). Mantiene las leases y el agregado de eventos Coordinator en ScriptProperties; no accede a Spreadsheet ni Drive.
- `JS/Services/SharedMutationClient.js`: cliente servidor-a-servidor que debe incluirse en cada proyecto AUTH, USERS, WRITE, ADMIN, FEEDBACK y UTILITIES.
- AUTH conserva lease solo para deleteUser; USERS/createUser conserva lease para exclusión frente a esa eliminación; UTILITIES/migrateTimestamps conserva lease para su migración operativa. WRITE, FEEDBACK, ADMIN y las acciones AUTH/USERS ordinarias usan actor cacheado sin leases por acción.
- ADMIN ya no declara `ACTIVE_SESSIONS` como `sharedWriteResources` ni adquiere leases para acciones ordinarias. Usa el actor de sesión cacheado y conserva la matriz RBAC/auditoría; logout y eliminación de cuenta invalidan su caché mediante el endpoint interno autenticado.
- FEEDBACK usa el actor cacheado para lecturas y mutaciones autenticadas; no adquiere `FEEDBACK/sessionActivity` ni leases por acción. `recordLike` conserva sus escrituras funcionales en Cortes, Feedback y Activity sin bloquear una operación con viajes a Coordinator.

## Configuración de cada entorno

Crear un proyecto Apps Script independiente para el coordinador. Copiar únicamente `JS/Services/Coordinator.js`, crear un deployment como aplicación web y conservar su URL `/exec`. No reemplazar deployments actuales de los servicios.

En ScriptProperties del proyecto coordinador, crear seis secretos de autenticación independientes:

- `GPSpedia_COORDINATOR_SECRET_AUTH`
- `GPSpedia_COORDINATOR_SECRET_USERS`
- `GPSpedia_COORDINATOR_SECRET_WRITE`
- `GPSpedia_COORDINATOR_SECRET_ADMIN`
- `GPSpedia_COORDINATOR_SECRET_FEEDBACK`
- `GPSpedia_COORDINATOR_SECRET_UTILITIES`

Cada secreto debe tener al menos 32 caracteres aleatorios. Generar uno distinto por servicio. No guardar los valores en el repositorio, código fuente, navegador, hojas de cálculo ni logs.

CATALOG no usa secreto de Coordinator ni endpoint de telemetría. `GPSpedia_CATALOG_TRAFFIC_SECRET` se conserva como secreto compartido entre CATALOG y ADMIN para autorizar metadatos internos del inventario de imágenes; no es un contador de tráfico.

Configurar en el proyecto Coordinator las URLs de los servicios consultados del mismo entorno:
- `GPSpedia_SERVICE_URL_AUTH`
- `GPSpedia_SERVICE_URL_USERS`
- `GPSpedia_SERVICE_URL_WRITE`
- `GPSpedia_SERVICE_URL_FEEDBACK`
- `GPSpedia_SERVICE_URL_ADMIN` (también necesaria para invalidación remota de caché de actor desde AUTH; no se usa como fuente de telemetría).

Coordinator no consulta endpoints directos de telemetría en AUTH, CATALOG, USERS, WRITE ni FEEDBACK. Las URLs y secretos configurados en Coordinator se usan para autenticación de servicios, precarga e invalidación de cachés de sesión; no para agregar contadores directos. No configurar URL ni secreto de CATALOG en Coordinator por analogía.

En AUTH, USERS, WRITE y FEEDBACK, `GPSpedia_COORDINATOR_SECRET` se usa exclusivamente para las operaciones internas de coordinación, sesión, precarga e invalidación. Estos servicios ya no exponen endpoints de telemetría directa. CATALOG no configura `GPSpedia_COORDINATOR_SECRET` ni una identidad de Coordinator; `GPSpedia_CATALOG_TRAFFIC_SECRET` se comparte con ADMIN solo para autorizar metadatos internos del inventario de imágenes. Las antiguas propiedades de contadores pueden permanecer sin uso durante la ventana de rollback.

ADMIN recibe el agregado global directamente desde Coordinator. No consulta endpoints de telemetría directos de los cinco servicios ni requiere secretos de tráfico. Conserva sus URLs de servicio para operaciones funcionales e inventario, no para métricas.

En cada consumidor AUTH, USERS, WRITE, FEEDBACK, UTILITIES y ADMIN, incluir `JS/Services/SharedMutationClient.js` y crear estas dos ScriptProperties:

- `GPSpedia_COORDINATOR_URL`: URL /exec del coordinador correspondiente al mismo entorno.
- `GPSpedia_COORDINATOR_SECRET`: el secreto específico de ese servicio, idéntico al valor configurado para ese servicio en el coordinador.

AUTH sincroniza el contexto al iniciar sesión. Solo deleteUser adquiere lease; login conserva bloqueo local de intentos fallidos y sincronización de sesión sin lease. acceptTerms, cambios/restablecimientos de contraseña, resetUserSessions, updateUser, logout y migrateLegacyPasswords usan actor cacheado o ruta directa, conservando las revocaciones remotas donde corresponden. touchSession queda como acción heredada sin consumidor frontend y sin lease. validateSession es una lectura de verificación local y no forma parte del flujo ordinario de arranque.

UTILITIES coordina `migrateTimestamps`: reserva lectura de Users, ActiveSessions, Cortes y Drive, y escritura del recurso lógico UTILITIES (Hoja 1 y sus hojas temporales). Adquiere la lease compartida antes del ScriptLock local. Así se serializa con cambios de identidad y la migración operativa de Cortes/Drive; ADMIN ya no participa en leases de mantenimiento por acción. No hay consumidor de `migrateTimestamps` en la interfaz versionada; la acción permanece en ACTION_TO_SERVICE_MAP para ejecución operativa/manual o clientes externos autorizados.

AUTH/USERS/UTILITIES de prueba deben apuntar a un coordinador de prueba independiente y utilizar secretos distintos de producción. Nunca conectar un servicio de prueba al coordinador productivo ni viceversa.

La acción FEEDBACK `initYouTubeUpload` no adquiere lease: inicia una sesión de carga en YouTube y no modifica los recursos compartidos de Spreadsheet/Drive. El registro y aprobación posteriores sí se coordinan; el contrato de YouTube permanece en AUG-043.

## Contexto central de sesión (Coordinator 1.4.9)

El coordinador mantiene la identidad activa en `ScriptProperties`, sin consultar `Users` ni `ActiveSessions` en cada operación de los demás servicios.

- `GPSpedia_AUTH_CONTEXT_V1_<userId>` conserva el epoch, la marca `revokedBefore` y las sesiones activas segmentadas en bloques para respetar el límite de ScriptProperties; las cuentas Developer no tienen un tope artificial de cinco sesiones.
- `GPSpedia_AUTH_TOKEN_V1_<token>` permite resolver el usuario cuando una petición protegida solo incluye `sessionToken`.
- Cada sesión conserva token, rol normalizado, nombre, fecha de creación y última actividad.
- La vigencia absoluta es de tres meses; la inactividad máxima es de un mes.
- La actividad central se actualiza como máximo una vez cada cinco minutos.

Acciones internas de contexto de sesión:

- Exclusivas de `AUTH`: `syncUserSessions`, `registerSession`, `revokeSession`, `revokeUserSessions` e `invalidateSessionActorCaches`. Solo AUTH puede registrar, sincronizar, revocar sesiones o solicitar la limpieza remota de caché de actores.
- `validateSessionContext`: se conserva como operación interna de compatibilidad/diagnóstico autenticada por servicio. Las acciones ordinarias ya no la invocan en cache miss; cada servicio debe recibir su actor durante la sincronización de login y rechazar la acción si no tiene actor local.
- La validación por servicio evita que FEEDBACK/USERS/WRITE/ADMIN intenten autenticarse como AUTH con un secreto distinto. No se comparte el secreto de AUTH con otros proyectos y no se amplían las acciones de registro o revocación.

`AUTH` sincroniza las sesiones al iniciar sesión. La primera validación de una sesión creada antes de esta versión puede migrarla desde `ActiveSessions`, siempre que no exista una revocación previa. Un token revocado, expirado o anterior a `revokedBefore` nunca se vuelve a registrar por esa vía.

Al cerrar sesión se revoca únicamente el token correspondiente. Los cambios de rol, eliminación de cuenta, cambios/restablecimientos de contraseña y restablecimientos globales de sesiones revocan el contexto antes de modificar los registros de la hoja.

USERS conserva lease únicamente en createUser para serializar username frente a AUTH/deleteUser; getUsers/updateProfile usan actor cacheado sin lease. UTILITIES conserva lease para migrateTimestamps, migración manual con staging/backup/rollback. AUTH conserva lease únicamente para deleteUser; las demás acciones usan caché local o ruta directa y mantienen las revocaciones remotas expresamente necesarias. WRITE, FEEDBACK y ADMIN reciben el actor al iniciar sesión y no revalidan identidad por acción. ADMIN→WRITE transmite userId/sessionToken y WRITE consulta su caché local; no hay token de lease anidada.

### Protocolo HTTP interno (versión 1)

Coordinator 1.4.3 y SharedMutationClient declaran `protocolVersion: 1` en cada petición POST interna. La versión del protocolo es independiente de la versión de implementación del Coordinator.

- Los clientes anteriores que no envían `protocolVersion` se interpretan como protocolo 1 para mantener compatibilidad durante la actualización gradual.
- Las versiones desconocidas o mal formadas se rechazan antes de autenticar o ejecutar una operación.
- Los cambios internos compatibles de Coordinator solo requieren actualizar el proyecto Coordinator. No se debe exigir que todos los consumidores se desplieguen simultáneamente.
- Un cambio que requiera una capacidad nueva del cliente solo exige actualizar los consumidores que invoquen esa capacidad; las acciones anteriores permanecen disponibles durante la transición.
- Las peticiones GET del feed público mantienen su contrato de lectura separado.

## Agregación central de telemetría (Coordinator 1.4.9)

La consulta ADMIN `getServiceTraffic` devuelve el agregado de siete servicios activos, pero su alcance es deliberadamente Coordinator-only. Incluye adquisiciones nuevas de lease, validaciones de contexto y lecturas del feed registradas por Coordinator. No representa todas las solicitudes HTTP ni cuenta las rutas directas ordinarias.

- AUTH, CATALOG, USERS, WRITE y FEEDBACK ya no escriben contadores por petición ni exponen endpoints internos `getServiceTraffic`; CATALOG tampoco adquiere `ScriptLock.tryLock(0)` para telemetría.
- Coordinator no hace `fetchAll` a cinco servicios para construir el gráfico global. Conserva `fetchAll` para la precarga funcional de cachés de actor después de sincronizar sesiones. `readServiceTraffic_` tampoco adquiere ScriptLock para leer buckets.
- FEEDBACK/`getCatalogChanges` se registra una sola vez en Coordinator; se elimina la suma duplicada del contador directo.
- La respuesta marca las fuentes directas con `directRequestsAvailable:false` y `reason:"direct_requests_not_collected"`. La UI no presenta esa ausencia como cero confirmado.
- El panel Developer mantiene RBAC y refresco condicionado a visibilidad (mínimo 60 s). La gráfica local del navegador sigue siendo efímera, por pestaña/dispositivo, y no se transmite ni persiste.
- El endpoint global no devuelve secretos, tokens ni identidades.
- Coordinator todavía persiste sus propios eventos best-effort en PropertiesService después de liberar el lock; puede subcontar si falla. La consulta ADMIN de esos buckets ya no adquiere ScriptLock ni retrasa leases. Los buckets vigentes inválidos se omiten sin borrarlos para no competir con escrituras concurrentes; solo se limpian claves expiradas o timestamps inválidos. El costo de escritura residual se medirá en Beta aislada; si degrada acciones, retirar o rediseñar frente a §15.

## Validación de sesión por identidad de servicio (contrato 1.4.2)

Cada consumidor que necesite poblar su caché local de actor llama `validateSessionContext` indicando su propio nombre de servicio. Coordinator autentica el secreto correspondiente y valida el mismo contexto central de sesión. AUTH conserva en exclusiva registro, sincronización y revocación. La telemetría atribuye la validación al servicio que la solicita.

El cambio es compatible con clientes anteriores que omiten el parámetro opcional: la llamada conserva el comportamiento AUTH. Los consumidores actualizados deben pasar explícitamente AUTH, ADMIN, FEEDBACK, USERS o WRITE según su proyecto. No se debe copiar el secreto de AUTH a otros servicios.

## Invalidación remota de caché (Coordinator 1.4.3)

AUTH solicita a Coordinator la invalidación de tokens en USERS, WRITE, FEEDBACK y ADMIN. Coordinator usa las URLs `GPSpedia_SERVICE_URL_USERS/WRITE/FEEDBACK/ADMIN` y los secretos individuales de cada servicio; los endpoints internos conservan `__invalidateSessionActorCache` y su verificación de secreto. El mismo conjunto de servicios expone `__primeSessionActorCache` para precargar actores después del login.

- AUTH envía lotes de hasta 25 tokens al Coordinator; este los subdivide en grupos de cinco, según el límite de los endpoints remotos.
- Coordinator valida previamente ambas URLs y ambos secretos antes de contactar cualquiera de los destinos.
- La operación solo devuelve éxito cuando WRITE y FEEDBACK confirman el número exacto de tokens recibidos.
- Si una respuesta se pierde o un destino falla después de que el otro ya invalidó, se puede repetir el mismo lote: `CacheService.remove` es idempotente y la operación no expone tokens en la respuesta.
- La revocación central continúa después de confirmar la invalidación remota, conservando el orden actual. Si la invalidación falla, AUTH no avanza a revocar el contexto central y puede reintentar.
- No se retiran los endpoints internos ni las comprobaciones de secreto de WRITE/FEEDBACK/ADMIN.

AUTH ya no necesita conocer ni almacenar las URLs de WRITE/FEEDBACK para esta operación. Las propiedades antiguas pueden permanecer durante la transición; no se requiere borrarlas.

## Recursos de coordinación

`SESSION_CONTEXTS` es un recurso lógico, no una hoja de cálculo:

- Las operaciones protegidas lo reservan en lectura.
- Las operaciones de `AUTH` que crean o revocan sesiones lo reservan en escritura.
- Así, una revocación espera a que terminen las operaciones protegidas en curso y ninguna operación nueva puede usar el contexto anterior.
- Las operaciones ordinarias ya no escriben `LastActivityAt` ni reservan `ACTIVE_SESSIONS` en cada solicitud. `AUTH` sincroniza esa columna durante el inicio de sesión, la restauración y las operaciones sensibles de autenticación.

`UTILITIES/migrateTimestamps` reserva `SESSION_CONTEXTS`, `CORTES` y `DRIVE` en lectura, y `UTILITIES` en escritura. No necesita leer `Users` ni `ActiveSessions` para autorizar al desarrollador.
## AUTH: sesión y aceptación de términos

- Los endpoints de diagnóstico `GET ?debug=true` de AUTH y FEEDBACK devuelven `coordinatorConfigured` como booleano. No exponen URL, secretos ni tokens. El panel Developer muestra el estado local de configuración para ambos servicios. En FEEDBACK, `true` solo confirma que hay URL con formato esperado y secreto de longitud suficiente, no que el secreto coincida con el coordinador remoto; el mensaje de servicio no autorizado todavía requiere cotejar ambos valores dentro del mismo entorno.
- Si el estado es `false`, revisar en ScriptProperties del proyecto AUTH `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET`, además de la inclusión de `JS/Services/SharedMutationClient.js`. Login, `touchSession`, `acceptTerms` y otras mutaciones siguen fallando de forma segura si falta esta configuración.
- La columna G de `ActiveSessions` (`SessionTermsAcceptance`) se conserva por compatibilidad con el esquema de sesión, pero no decide actualmente si debe mostrarse el aviso obligatorio. El flujo vigente identifica el perfil/dispositivo mediante un ID aleatorio persistido en `localStorage` y guarda la aceptación por usuario, dispositivo y versión en `Users.TermsAcceptance` (columna I). `acceptTerms` valida la sesión en modo de solo lectura y escribe el mapa de aceptación en `Users`; no actualiza `ActiveSessions`. Por eso, cerrar sesión y volver a entrar en el mismo perfil no vuelve a mostrar el aviso, mientras que otro navegador/perfil genera una identidad local independiente.
- `validateSession` usa una lectura local con espera de lock limitada y no actualiza `LastActivityAt`; la actividad se actualiza mediante `touchSession` cuando se ejecutan operaciones protegidas.

## Diagnóstico de autorización del coordinador FEEDBACK

El feed incremental del catálogo es una lectura pública y de solo lectura. La versión actual del coordinador expone el endpoint GET de consulta con los parámetros catalogFeed=1, cursor y limit; devuelve exclusivamente eventos del journal del catálogo público (Cortes, Tutoriales, Relay y Logos), cuyo contenido también se entrega mediante el servicio público CATALOG.

- La lectura del feed no adquiere una lease de usuario ni utiliza GPSpedia_COORDINATOR_SECRET_FEEDBACK. No se debe configurar un secreto en el navegador ni exponer credenciales para consultar el catálogo.
- El POST interno de Coordinator sigue autenticando por secreto de servicio y conserva deny-by-default para leases, publicaciones, sesiones y mutaciones.
- Las rutas privadas de FEEDBACK (Inbox, actividad, tickets y mutaciones) siguen requiriendo el secreto de servicio correcto y el actor de sesión confiable. La excepción del feed no se extiende a esas acciones.
- Si el error de servicio no autorizado aparece todavía al consultar getCatalogChanges, comprobar que el deployment Beta de Coordinator y el de FEEDBACK incluyen esta versión compatible. Un deployment antiguo puede seguir ejecutando el cliente POST/FEEDBACK anterior.
- Para fallos de otras acciones FEEDBACK, cotejar de forma privada GPSpedia_COORDINATOR_URL y GPSpedia_COORDINATOR_SECRET del proyecto FEEDBACK con el deployment y GPSpedia_COORDINATOR_SECRET_FEEDBACK del coordinador del mismo entorno. No imprimir ni registrar valores.

## Telemetría global de servicios

Coordinator acumula eventos registrados en buckets horarios de 24 horas dentro de ScriptProperties (`GPSpedia_SERVICE_TRAFFIC_HOUR_`). Cuenta adquisiciones nuevas de lease, validaciones de contexto y lecturas del feed incremental. Un reintento que reutiliza la misma lease no vuelve a incrementar el contador. La persistencia es best-effort y se ejecuta después de liberar `ScriptLock`; si falla, la operación funcional continúa. Esta escritura restante aún se debe evaluar frente a §15.

No hay contadores directos en AUTH, CATALOG, USERS, WRITE ni FEEDBACK. Sus rutas ordinarias no realizan escrituras/locks de telemetría y esos proyectos no exponen endpoint interno `getServiceTraffic`. La ausencia de eventos directos no equivale a cero solicitudes HTTP.

ADMIN no hace fan-out a cinco servicios para recopilar métricas. El agregado global se basa solo en eventos de Coordinator y marca las fuentes directas como `direct_requests_not_collected`. FEEDBACK/`getCatalogChanges` se cuenta una sola vez por Coordinator. UTILITIES/`migrateTimestamps` ya obtiene lease y queda incluido en el registro de Coordinator; ADMIN mantiene su consulta global de solo lectura, reservada a Desarrollador.

**Secretos:** no se necesitan secretos de telemetría directa ni `GPSpedia_COORDINATOR_SECRET_CATALOG`. `GPSpedia_CATALOG_TRAFFIC_SECRET` sigue siendo necesario y compartido entre CATALOG y ADMIN exclusivamente para autorizar los metadatos internos del inventario de imágenes. No borrar propiedades antiguas de contadores hasta completar Beta y la ventana de rollback, pero los deployments actualizados ya no las leen ni escriben.

La interfaz Developer mantiene el agregado global y la gráfica local del navegador actual. Esta última se alimenta de las llamadas `routeAction` observadas en la pestaña, identifica móvil/tableta/escritorio y conserva métricas efímeras en memoria; no transmite ni persiste payloads, tokens o datos personales. El gráfico global no representa todas las solicitudes HTTP. Un cero de eventos Coordinator no demuestra ausencia de solicitudes.

## Política y recuperación

La política de operaciones es deny-by-default. Los metadatos de recursos ADMIN se conservan para contratos de integridad, pero el router no adquiere leases ni llama a Coordinator por acción. `migrateReplacedImagesSchema`, inventario y organizador mantienen las comprobaciones funcionales y bloqueos locales estrictamente necesarios; no se serializan acciones independientes ni se mantiene un lock durante cargas. `migrateTimestamps` de UTILITIES conserva su lease actual y queda pendiente de auditoría frente a la sección 15. Si faltan credenciales de sesión o la caché fue invalidada, ADMIN falla cerrado.

Las leases expiran a los 45 minutos, por encima del límite máximo habitual de ejecución de Apps Script, y se eliminan al adquirir/validar/liberar nuevas leases. Un cierre inesperado puede mantener recursos bloqueados hasta que venza la lease; no se libera una lease por suposición. El cliente libera en finally y registra únicamente el fallo de liberación, sin exponer tokens.

Los tokens de lease, cuando aún se usan en los servicios que conservan coordinación, solo se transmiten entre proyectos Apps Script y nunca al navegador. ADMIN no genera ni transmite tokens de lease; sus llamadas internas ADMIN→WRITE usan userId/sessionToken y validación de actor cacheado.

## Límites de esta entrega

La instrumentación del navegador vive en `JS/Frontend/serviceTelemetry.js`, se conecta al router central `JS/Frontend/api-config.js` y forma parte del App Shell del Service Worker. No se cambian endpoints públicos de servicios existentes ni se realizan deployments o pruebas contra Spreadsheet/Drive productivos. La activación requiere desplegar/configurar primero el coordinador de cada entorno y después actualizar los proyectos de servicio. Las pruebas reales de concurrencia entre proyectos y la validación de deployments quedan diferidas a Beta.


## Matriz de impacto de cambios y despliegues

- **Solo Coordinator:** cambios internos compatibles de autorización, leases, almacenamiento, monitoreo, agregación, orquestación y correcciones que mantengan las acciones y payloads existentes.
- **Solo configuración de Coordinator:** cambios de URLs/secretos centrales por entorno que no alteren el contrato HTTP.
- **Coordinator + consumidor(es) concretos:** una operación nueva requiere modificar únicamente los servicios que la invocarán. Los demás clientes siguen en protocolo v1.
- **Consumidores afectados:** una corrección de código local en SharedMutationClient requiere actualizar los proyectos que contienen esa copia y dependen de la función corregida. No se deben actualizar los seis servicios por rutina si no utilizan el cambio.
- **Cambios incompatibles:** no se publican retirando v1. Debe existir convivencia de versiones, migración gradual y pruebas de compatibilidad antes de retirar una versión antigua.

La versión de software Coordinator es independiente del protocolo. La versión omitida por clientes legacy se interpreta como v1; los cambios internos no deben incrementar la versión de protocolo. La compatibilidad actual se valida en JS/Tests/SharedMutationCoordinator.js.

Esta matriz reduce despliegues innecesarios, pero no elimina la necesidad de publicar un consumidor cuando su propio código local cambia. Tampoco se utiliza Apps Script Libraries como atajo: sus referencias versionadas también deben actualizarse en cada proyecto.


## Catálogo canónico de secretos por servicio

Cada servicio que se comunica con Coordinator conserva una identidad criptográfica distinta. Los contadores directos de telemetría ya no usan secretos ni endpoints. CATALOG conserva un secreto independiente con ADMIN solo para metadatos internos del inventario de imágenes.

| Proyecto consumidor | Propiedad local | Propiedad correspondiente en Coordinator | Uso |
|---|---|---|---|
| AUTH | GPSpedia_COORDINATOR_SECRET | GPSpedia_COORDINATOR_SECRET_AUTH | Protocolo interno, leases, sesión y telemetría AUTH |
| USERS | GPSpedia_COORDINATOR_SECRET | GPSpedia_COORDINATOR_SECRET_USERS | Protocolo interno, leases, sesión y telemetría USERS |
| WRITE | GPSpedia_COORDINATOR_SECRET | GPSpedia_COORDINATOR_SECRET_WRITE | Protocolo interno, leases, sesión y telemetría WRITE |
| ADMIN | GPSpedia_COORDINATOR_SECRET | GPSpedia_COORDINATOR_SECRET_ADMIN | Validación de actor, invalidación interna de caché y consulta global; no leases ordinarias |
| FEEDBACK | GPSpedia_COORDINATOR_SECRET | GPSpedia_COORDINATOR_SECRET_FEEDBACK | Protocolo interno, leases, sesión y telemetría FEEDBACK |
| UTILITIES | GPSpedia_COORDINATOR_SECRET | GPSpedia_COORDINATOR_SECRET_UTILITIES | Protocolo interno, leases y sesión |

Los valores de la columna Coordinator son todos diferentes. No copiar el secreto de AUTH a otro proyecto. Cada consumidor configura además GPSpedia_COORDINATOR_URL con la URL del Coordinator del mismo entorno. Las URLs centralizadas en Coordinator se usan para precarga e invalidación de cachés de sesión. `+"`GPSpedia_CATALOG_TRAFFIC_SECRET`"+` debe coincidir entre CATALOG y ADMIN para metadatos de inventario. Las propiedades antiguas de contadores pueden permanecer sin uso durante la ventana de rollback; no son leídas por la versión actual.


## Actualización 2026-11-19 — ADMIN sin leases ordinarias
- ADMIN obtiene el actor mediante getCachedSharedSessionActor_ y ejecuta las comprobaciones de capacidad localmente. No solicita leases ni consulta Coordinator por acción.
- AUTH→Coordinator invalida también la caché ADMIN en logout/revocación/eliminación; el endpoint interno ADMIN valida el secreto propio.
- La telemetría por leases ya no representa las acciones ADMIN ordinarias. No se añade un contador con escritura o viaje de red por acción.
- Pendiente de esta iniciativa: auditar las leases restantes de AUTH/USERS/UTILITIES frente a la sección 15 de NORMAS_DESAROLLO.md.
