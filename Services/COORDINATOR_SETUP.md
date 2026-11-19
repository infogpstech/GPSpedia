# Coordinador compartido de mutaciones — configuración

## Componentes

- `JS/Services/Coordinator.js`: servicio Apps Script independiente. Mantiene las leases en ScriptProperties y no accede a Spreadsheet ni Drive.
- `JS/Services/SharedMutationClient.js`: cliente servidor-a-servidor que debe incluirse en cada proyecto AUTH, USERS, WRITE, ADMIN, FEEDBACK y UTILITIES.
- Los routers de esos servicios delegan las acciones mutadoras al coordinador antes de ejecutar sus handlers. Los locks locales existentes se conservan.
- ADMIN declara `ACTIVE_SESSIONS` como `sharedWriteResources` para permitir consultas ADMIN concurrentes que únicamente actualizan `LastActivityAt`. Esta compatibilidad es cooperativa entre leases ADMIN; las escrituras normales de AUTH/USERS/WRITE/FEEDBACK/UTILITIES siguen bloqueándolas. No se debe usar esta modalidad para mutaciones adicionales de la hoja de sesiones.
- En FEEDBACK, las lecturas autenticadas `getInboxRecipients`, `getInboxConversations` y `getInboxMessages` adquieren `FEEDBACK/sessionActivity`, que reserva `ACTIVE_SESSIONS` y actualiza `LastActivityAt`. Las mutaciones `createInboxConversation`, `sendInboxMessage`, `markInboxRead` y `archiveInboxConversation` reservan `ACTIVE_SESSIONS` y `FEEDBACK` durante la validación y escritura. `recordLike` reserva `ACTIVE_SESSIONS`, `CORTES`, `FEEDBACK` y `ACTIVITY`, porque su validación autenticada también actualiza la actividad de sesión.

## Configuración de cada entorno

Crear un proyecto Apps Script independiente para el coordinador. Copiar únicamente `JS/Services/Coordinator.js`, crear un deployment como aplicación web y conservar su URL `/exec`. No reemplazar deployments actuales de los servicios.

En ScriptProperties del proyecto coordinador, crear seis secretos independientes:

- `GPSpedia_COORDINATOR_SECRET_AUTH`
- `GPSpedia_COORDINATOR_SECRET_USERS`
- `GPSpedia_COORDINATOR_SECRET_WRITE`
- `GPSpedia_COORDINATOR_SECRET_ADMIN`
- `GPSpedia_COORDINATOR_SECRET_FEEDBACK`
- `GPSpedia_COORDINATOR_SECRET_UTILITIES`

Cada secreto debe tener al menos 32 caracteres aleatorios. Generar uno distinto por servicio. No guardar los valores en el repositorio, código fuente, navegador, hojas de cálculo ni logs.

En el proyecto Apps Script de cada servicio, incluir `JS/Services/SharedMutationClient.js` y crear estas dos ScriptProperties:

- `GPSpedia_COORDINATOR_URL`: URL /exec del coordinador correspondiente al mismo entorno.
- `GPSpedia_COORDINATOR_SECRET`: el secreto específico de ese servicio, idéntico al valor configurado para ese servicio en el coordinador.

AUTH coordina login, touchSession, acceptTerms, cambio/restablecimiento de contraseña, revocaciones, actualización de roles y limpieza de Logs. validateSession es una lectura de solo verificación: comprueba token, identidad, estado, expiración y aceptación de términos sin modificar hojas ni adquirir una lease; por eso no depende del coordinador y puede confirmar una sesión aunque el coordinador esté temporalmente indisponible. touchSession sí modifica ActiveSessions y continúa coordinado.

UTILITIES coordina `migrateTimestamps`: reserva lectura de Users, ActiveSessions, Cortes y Drive, y escritura del recurso lógico UTILITIES (Hoja 1 y sus hojas temporales). Adquiere la lease compartida antes del ScriptLock local. Así se serializa con cambios de identidad, mutaciones de Cortes/Drive y las operaciones ADMIN de mantenimiento integral. No hay consumidor de `migrateTimestamps` en la interfaz versionada; la acción permanece en ACTION_TO_SERVICE_MAP para ejecución operativa/manual o clientes externos autorizados.

AUTH/USERS/UTILITIES de prueba deben apuntar a un coordinador de prueba independiente y utilizar secretos distintos de producción. Nunca conectar un servicio de prueba al coordinador productivo ni viceversa.

La acción FEEDBACK `initYouTubeUpload` no adquiere lease: inicia una sesión de carga en YouTube y no modifica los recursos compartidos de Spreadsheet/Drive. El registro y aprobación posteriores sí se coordinan; el contrato de YouTube permanece en AUG-043.

## Contexto central de sesión (Coordinator 1.4.2)

El coordinador mantiene la identidad activa en `ScriptProperties`, sin consultar `Users` ni `ActiveSessions` en cada operación de los demás servicios.

- `GPSpedia_AUTH_CONTEXT_V1_<userId>` conserva el epoch, la marca `revokedBefore` y hasta cinco sesiones activas.
- `GPSpedia_AUTH_TOKEN_V1_<token>` permite resolver el usuario cuando una petición protegida solo incluye `sessionToken`.
- Cada sesión conserva token, rol normalizado, nombre, fecha de creación y última actividad.
- La vigencia absoluta es de tres meses; la inactividad máxima es de un mes.
- La actividad central se actualiza como máximo una vez cada cinco minutos.

Acciones internas de contexto de sesión:

- Exclusivas de `AUTH`: `syncUserSessions`, `registerSession`, `revokeSession` y `revokeUserSessions`. Solo AUTH puede registrar, sincronizar o revocar sesiones.
- `validateSessionContext`: cualquier servicio activo autenticado (AUTH, USERS, WRITE, ADMIN, FEEDBACK o UTILITIES) puede validar un token usando su propio secreto de servicio. La respuesta devuelve únicamente el actor validado para que ese servicio construya su caché local; la operación se atribuye al servicio solicitante. No se acepta CATALOG ni una identidad de servicio desconocida.
- La validación por servicio evita que FEEDBACK/USERS/WRITE/ADMIN intenten autenticarse como AUTH con un secreto distinto. No se comparte el secreto de AUTH con otros proyectos y no se amplían las acciones de registro o revocación.

`AUTH` sincroniza las sesiones al iniciar sesión. La primera validación de una sesión creada antes de esta versión puede migrarla desde `ActiveSessions`, siempre que no exista una revocación previa. Un token revocado, expirado o anterior a `revokedBefore` nunca se vuelve a registrar por esa vía.

Al cerrar sesión se revoca únicamente el token correspondiente. Los cambios de rol, eliminación de cuenta, cambios/restablecimientos de contraseña y restablecimientos globales de sesiones revocan el contexto antes de modificar los registros de la hoja.

Los servicios `USERS`, `WRITE`, `ADMIN`, `FEEDBACK` y `UTILITIES` envían `userId` y `sessionToken` al adquirir la lease. El coordinador devuelve el actor verificado en esa misma respuesta; `SharedMutationClient` elimina cualquier actor enviado por el navegador y adjunta únicamente el actor recibido del coordinador. Los helpers de autorización consumen ese contexto sin repetir búsquedas de sesión en hojas. `USERS/updateProfile` conserva una búsqueda exacta de la fila del usuario porque necesita localizar la fila que modificará.

### Protocolo HTTP interno (versión 1)

Coordinator 1.4.2 y SharedMutationClient declaran `protocolVersion: 1` en cada petición POST interna. La versión del protocolo es independiente de la versión de implementación del Coordinator.

- Los clientes anteriores que no envían `protocolVersion` se interpretan como protocolo 1 para mantener compatibilidad durante la actualización gradual.
- Las versiones desconocidas o mal formadas se rechazan antes de autenticar o ejecutar una operación.
- Los cambios internos compatibles de Coordinator solo requieren actualizar el proyecto Coordinator. No se debe exigir que todos los consumidores se desplieguen simultáneamente.
- Un cambio que requiera una capacidad nueva del cliente solo exige actualizar los consumidores que invoquen esa capacidad; las acciones anteriores permanecen disponibles durante la transición.
- Las peticiones GET del feed público mantienen su contrato de lectura separado.

## Validación de sesión por identidad de servicio (contrato 1.4.2)

Cada consumidor que necesite poblar su caché local de actor llama `validateSessionContext` indicando su propio nombre de servicio. Coordinator autentica el secreto correspondiente y valida el mismo contexto central de sesión. AUTH conserva en exclusiva registro, sincronización y revocación. La telemetría atribuye la validación al servicio que la solicita.

El cambio es compatible con clientes anteriores que omiten el parámetro opcional: la llamada conserva el comportamiento AUTH. Los consumidores actualizados deben pasar explícitamente AUTH, ADMIN, FEEDBACK, USERS o WRITE según su proyecto. No se debe copiar el secreto de AUTH a otros servicios.

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

Coordinator acumula conteos por servicio en buckets horarios de 24 horas dentro de ScriptProperties (GPSpedia_SERVICE_TRAFFIC_HOUR_). Registra operaciones protegidas que obtuvieron una lease y lecturas del feed incremental dentro del lock ya existente. Un reintento que reutiliza la misma lease no vuelve a incrementar el contador. El registro es best-effort: si falla, la operación protegida continúa.

Para completar rutas POST que no pasan por Coordinator, cada servicio con rutas directas instrumentadas mantiene un contador local de ScriptProperties con buckets horarios de 24 horas y LockService.getScriptLock().tryLock(0). No espera por el lock: si hay contención o falla PropertiesService, omite únicamente el evento y continúa el handler. No se envía una llamada de red desde el navegador por cada acción.

**Rutas directas instrumentadas:**
- CATALOG: getCatalogData, getDropdownData, getSuggestion y getNavigationData.
- AUTH: validateSession.
- WRITE: checkVehicle, getSuggestion y checkVinDuplicate.
- FEEDBACK: getPysData, getCatalogChanges y suggestYear anónimo (userId 0). sendContactForm y suggestYear autenticado mantienen el conteo Coordinator.
- UTILITIES: migrateTimestamps obtiene una lease de Coordinator dentro de su handler; no tiene contador local para evitar doble conteo.
- USERS: createUser y updateProfile pasan por Coordinator; getUsers reutiliza el actor cacheado y mantiene un contador directo local no bloqueante para no añadir un viaje de red por cada lectura.
- ADMIN: las operaciones pasan por Coordinator; ping se excluye intencionalmente como sondeo.

ADMIN consulta los cinco contadores directos (CATALOG, AUTH, WRITE, FEEDBACK y USERS) en una sola operación agrupada con UrlFetchApp.fetchAll al refrescar el panel Developer. Si fetchAll falla globalmente, intenta los endpoints por separado; el fallo de una fuente no invalida las demás ni el agregado Coordinator. La consulta se ejecuta según el intervalo del panel (60 s), no por cada acción del usuario. El endpoint interno getServiceTraffic no se cuenta a sí mismo.

**Configuración de secretos en Beta:** generar un secreto aleatorio distinto por servicio (mínimo 32 caracteres; por ejemplo, localmente con openssl rand -hex 32). Guardar el mismo valor para cada servicio en dos lugares: la Script Property con nombre GPSpedia_<SERVICIO>_TRAFFIC_SECRET dentro del proyecto Apps Script de ese servicio y en el proyecto ADMIN. Servicios instrumentados: AUTH, CATALOG, WRITE, FEEDBACK y USERS. Para USERS la propiedad exacta es `GPSpedia_USERS_TRAFFIC_SECRET`; se configura en el proyecto USERS y en ADMIN con el mismo valor aleatorio. UTILITIES no necesita secreto porque migrateTimestamps ya se cuenta en Coordinator. ADMIN no necesita secreto directo porque sus operaciones protegidas se cuentan mediante Coordinator. No guardar valores en el repositorio, navegador, logs ni documentación.

Si falta un secreto, un endpoint falla o la respuesta no cumple el contrato, el dashboard conserva Coordinator y marca únicamente esa fuente directa como parcial/no disponible; nunca interpreta ausencia como cero confirmado. La consulta ADMIN/getServiceTraffic es de solo lectura, está reservada a Desarrollador y no devuelve usuarios, tokens ni identificadores de sesión. La propia consulta y los health probes no se cuentan.

La interfaz Developer muestra el agregado global y, al seleccionar un servicio, una segunda gráfica local del navegador actual. Esta última se alimenta de las llamadas routeAction y de la lectura directa getCatalogChanges observadas en la sesión, identifica móvil/tableta/escritorio, conserva solo métricas efímeras en memoria y no transmite ni persiste payloads, tokens o datos personales. Los detalles muestran conteos globales y locales de 1, 6 y 24 horas. El agregado cubre las rutas instrumentadas descritas; no representa todas las solicitudes HTTP externas o rutas antiguas/no instrumentadas. Un cero no demuestra ausencia de solicitudes.

## Política y recuperación

La política de operaciones es deny-by-default. Si una acción mutadora no está registrada, se rechaza antes de ejecutar el handler. `migrateReplacedImagesSchema` tiene una política explícita limitada a `IMAGE_INVENTORY`; no reserva mantenimiento global. La actualización de `LastActivityAt` de ADMIN utiliza escritura cooperativa: dos leases ADMIN pueden coexistir cuando comparten únicamente esa actividad, pero cualquier lectura/escritura normal o mutación AUTH sobre `ACTIVE_SESSIONS` sigue generando conflicto. Si faltan URL/secreto, falla la llamada HTTP, la respuesta no es válida o el estado central está corrupto, la operación falla cerrada. `migrateCortesOperationIds` usa mantenimiento exclusivo tanto en simulación como en confirmación, porque ambas fases leen el mismo mapa de idempotencia. `migrateTimestamps` usa una lease de lectura/escritura por recursos; queda bloqueada por cualquier mantenimiento integral de ADMIN.

Las leases expiran a los 45 minutos, por encima del límite máximo habitual de ejecución de Apps Script, y se eliminan al adquirir/validar/liberar nuevas leases. Un cierre inesperado puede mantener recursos bloqueados hasta que venza la lease; no se libera una lease por suposición. El cliente libera en finally y registra únicamente el fallo de liberación, sin exponer tokens.

El token de lease solo se transmite entre servicios Apps Script. No debe exponerse en frontend, localStorage, sessionStorage ni respuestas al navegador. ADMIN conserva una única lease durante reorganización/alta y la llamada anidada WRITE valida el token contra la lista de acciones permitidas.

## Límites de esta entrega

La instrumentación del navegador vive en `JS/Frontend/serviceTelemetry.js`, se conecta al router central `JS/Frontend/api-config.js` y forma parte del App Shell del Service Worker. No se cambian endpoints públicos de servicios existentes ni se realizan deployments o pruebas contra Spreadsheet/Drive productivos. La activación requiere desplegar/configurar primero el coordinador de cada entorno y después actualizar los proyectos de servicio. Las pruebas reales de concurrencia entre proyectos y la validación de deployments quedan diferidas a Beta.
