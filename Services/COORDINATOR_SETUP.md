# Coordinador compartido de mutaciones — configuración

## Componentes

- `Services/Coordinator.js`: servicio Apps Script independiente. Mantiene las leases en ScriptProperties y no accede a Spreadsheet ni Drive.
- `Services/SharedMutationClient.js`: cliente servidor-a-servidor que debe incluirse en cada proyecto AUTH, USERS, WRITE, ADMIN, FEEDBACK y UTILITIES.
- Los routers de esos servicios delegan las acciones mutadoras al coordinador antes de ejecutar sus handlers. Los locks locales existentes se conservan.
- ADMIN declara `ACTIVE_SESSIONS` como `sharedWriteResources` para permitir consultas ADMIN concurrentes que únicamente actualizan `LastActivityAt`. Esta compatibilidad es cooperativa entre leases ADMIN; las escrituras normales de AUTH/USERS/WRITE/FEEDBACK/UTILITIES siguen bloqueándolas. No se debe usar esta modalidad para mutaciones adicionales de la hoja de sesiones.
- En FEEDBACK, las lecturas autenticadas `getInboxRecipients`, `getInboxConversations` y `getInboxMessages` adquieren `FEEDBACK/sessionActivity`, que reserva `ACTIVE_SESSIONS` y actualiza `LastActivityAt`. Las mutaciones `createInboxConversation`, `sendInboxMessage`, `markInboxRead` y `archiveInboxConversation` reservan `ACTIVE_SESSIONS` y `FEEDBACK` durante la validación y escritura. `recordLike` reserva `ACTIVE_SESSIONS`, `CORTES`, `FEEDBACK` y `ACTIVITY`, porque su validación autenticada también actualiza la actividad de sesión.

## Configuración de cada entorno

Crear un proyecto Apps Script independiente para el coordinador. Copiar únicamente `Services/Coordinator.js`, crear un deployment como aplicación web y conservar su URL `/exec`. No reemplazar deployments actuales de los servicios.

En ScriptProperties del proyecto coordinador, crear seis secretos independientes:

- `GPSpedia_COORDINATOR_SECRET_AUTH`
- `GPSpedia_COORDINATOR_SECRET_USERS`
- `GPSpedia_COORDINATOR_SECRET_WRITE`
- `GPSpedia_COORDINATOR_SECRET_ADMIN`
- `GPSpedia_COORDINATOR_SECRET_FEEDBACK`
- `GPSpedia_COORDINATOR_SECRET_UTILITIES`

Cada secreto debe tener al menos 32 caracteres aleatorios. Generar uno distinto por servicio. No guardar los valores en el repositorio, código fuente, navegador, hojas de cálculo ni logs.

En el proyecto Apps Script de cada servicio, incluir `Services/SharedMutationClient.js` y crear estas dos ScriptProperties:

- `GPSpedia_COORDINATOR_URL`: URL /exec del coordinador correspondiente al mismo entorno.
- `GPSpedia_COORDINATOR_SECRET`: el secreto específico de ese servicio, idéntico al valor configurado para ese servicio en el coordinador.

AUTH coordina login, touchSession, acceptTerms, cambio/restablecimiento de contraseña, revocaciones, actualización de roles y limpieza de Logs. validateSession es una lectura de solo verificación: comprueba token, identidad, estado, expiración y aceptación de términos sin modificar hojas ni adquirir una lease; por eso no depende del coordinador y puede confirmar una sesión aunque el coordinador esté temporalmente indisponible. touchSession sí modifica ActiveSessions y continúa coordinado.

UTILITIES coordina `migrateTimestamps`: reserva lectura de Users, ActiveSessions, Cortes y Drive, y escritura del recurso lógico UTILITIES (Hoja 1 y sus hojas temporales). Adquiere la lease compartida antes del ScriptLock local. Así se serializa con cambios de identidad, mutaciones de Cortes/Drive y las operaciones ADMIN de mantenimiento integral. No hay consumidor de `migrateTimestamps` en la interfaz versionada; la acción permanece en ACTION_TO_SERVICE_MAP para ejecución operativa/manual o clientes externos autorizados.

AUTH/USERS/UTILITIES de prueba deben apuntar a un coordinador de prueba independiente y utilizar secretos distintos de producción. Nunca conectar un servicio de prueba al coordinador productivo ni viceversa.

La acción FEEDBACK `initYouTubeUpload` no adquiere lease: inicia una sesión de carga en YouTube y no modifica los recursos compartidos de Spreadsheet/Drive. El registro y aprobación posteriores sí se coordinan; el contrato de YouTube permanece en AUG-043.

## AUTH: sesión y aceptación de términos

- Los endpoints de diagnóstico `GET ?debug=true` de AUTH y FEEDBACK devuelven `coordinatorConfigured` como booleano. No exponen URL, secretos ni tokens. El panel Developer muestra el estado local de configuración para ambos servicios. En FEEDBACK, `true` solo confirma que hay URL con formato esperado y secreto de longitud suficiente, no que el secreto coincida con el coordinador remoto; el mensaje de servicio no autorizado todavía requiere cotejar ambos valores dentro del mismo entorno.
- Si el estado es `false`, revisar en ScriptProperties del proyecto AUTH `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET`, además de la inclusión de `Services/SharedMutationClient.js`. Login, `touchSession`, `acceptTerms` y otras mutaciones siguen fallando de forma segura si falta esta configuración.
- La columna G de `ActiveSessions` (`SessionTermsAcceptance`) se conserva por compatibilidad con el esquema de sesión, pero no decide actualmente si debe mostrarse el aviso obligatorio. El flujo vigente identifica el perfil/dispositivo mediante un ID aleatorio persistido en `localStorage` y guarda la aceptación por usuario, dispositivo y versión en `Users.TermsAcceptance` (columna I). `acceptTerms` valida la sesión en modo de solo lectura y escribe el mapa de aceptación en `Users`; no actualiza `ActiveSessions`. Por eso, cerrar sesión y volver a entrar en el mismo perfil no vuelve a mostrar el aviso, mientras que otro navegador/perfil genera una identidad local independiente.
- `validateSession` usa una lectura local con espera de lock limitada y no actualiza `LastActivityAt`; la actividad se actualiza mediante `touchSession` cuando se ejecutan operaciones protegidas.

## Diagnóstico de autorización del coordinador FEEDBACK

El error `Servicio no autorizado para el coordinador compartido` se produce en la autenticación del servicio, antes de evaluar el rol del usuario. Para FEEDBACK, comprobar en el proyecto Apps Script del servicio que `GPSpedia_COORDINATOR_URL` apunta al coordinador del mismo entorno y que `GPSpedia_COORDINATOR_SECRET` coincide exactamente con `GPSpedia_COORDINATOR_SECRET_FEEDBACK` del coordinador. Confirmar también que FEEDBACK incluye la versión vigente de `Services/SharedMutationClient.js` y que el coordinador desplegado contiene la política de `FEEDBACK/sessionActivity` y las acciones utilizadas. No corregir este error ampliando roles ni relajando las listas RBAC: una credencial de servicio inválida debe seguir fallando cerrada.

## Política y recuperación

La política de operaciones es deny-by-default. Si una acción mutadora no está registrada, se rechaza antes de ejecutar el handler. `migrateReplacedImagesSchema` tiene una política explícita limitada a `IMAGE_INVENTORY`; no reserva mantenimiento global. La actualización de `LastActivityAt` de ADMIN utiliza escritura cooperativa: dos leases ADMIN pueden coexistir cuando comparten únicamente esa actividad, pero cualquier lectura/escritura normal o mutación AUTH sobre `ACTIVE_SESSIONS` sigue generando conflicto. Si faltan URL/secreto, falla la llamada HTTP, la respuesta no es válida o el estado central está corrupto, la operación falla cerrada. `migrateCortesOperationIds` usa mantenimiento exclusivo tanto en simulación como en confirmación, porque ambas fases leen el mismo mapa de idempotencia. `migrateTimestamps` usa una lease de lectura/escritura por recursos; queda bloqueada por cualquier mantenimiento integral de ADMIN.

Las leases expiran a los 45 minutos, por encima del límite máximo habitual de ejecución de Apps Script, y se eliminan al adquirir/validar/liberar nuevas leases. Un cierre inesperado puede mantener recursos bloqueados hasta que venza la lease; no se libera una lease por suposición. El cliente libera en finally y registra únicamente el fallo de liberación, sin exponer tokens.

El token de lease solo se transmite entre servicios Apps Script. No debe exponerse en frontend, localStorage, sessionStorage ni respuestas al navegador. ADMIN conserva una única lease durante reorganización/alta y la llamada anidada WRITE valida el token contra la lista de acciones permitidas.

## Límites de esta entrega

No se modifica `JS/Frontend/api-config.js`, no se cambian endpoints de servicios existentes y no se realizan deployments ni pruebas contra Spreadsheet/Drive productivos. La activación requiere desplegar/configurar primero el coordinador de cada entorno y después actualizar los proyectos de servicio. Las pruebas reales de concurrencia entre proyectos y la validación de deployments quedan diferidas a Beta.
