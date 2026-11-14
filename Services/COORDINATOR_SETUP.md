# Coordinador compartido de mutaciones — configuración

## Componentes

- `Services/Coordinator.js`: servicio Apps Script independiente. Mantiene las leases en ScriptProperties y no accede a Spreadsheet ni Drive.
- `Services/SharedMutationClient.js`: cliente servidor-a-servidor que debe incluirse en cada proyecto AUTH, USERS, WRITE, ADMIN, FEEDBACK y UTILITIES.
- Los routers de esos servicios delegan las acciones mutadoras al coordinador antes de ejecutar sus handlers. Los locks locales existentes se conservan.
- ADMIN declara `ACTIVE_SESSIONS` como `sharedWriteResources` para permitir consultas ADMIN concurrentes que únicamente actualizan `LastActivityAt`. Esta compatibilidad es cooperativa entre leases ADMIN; las escrituras normales de AUTH/USERS/WRITE/FEEDBACK/UTILITIES siguen bloqueándolas. No se debe usar esta modalidad para mutaciones adicionales de la hoja de sesiones.
- En FEEDBACK, `createInboxConversation`, `sendInboxMessage`, `markInboxRead` y `archiveInboxConversation` reservan lectura de `USERS/ACTIVE_SESSIONS` y escritura de `FEEDBACK`; las lecturas de Inbox no adquieren lease mutadora.

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

- El endpoint de diagnóstico `GET ?debug=true` devuelve `coordinatorConfigured` como booleano. No expone URL, secretos ni tokens. La tarjeta AUTH del panel Developer muestra si el coordinador está configurado.
- Si el estado es `false`, revisar en ScriptProperties del proyecto AUTH `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET`, además de la inclusión de `Services/SharedMutationClient.js`. Login, `touchSession`, `acceptTerms` y otras mutaciones siguen fallando de forma segura si falta esta configuración.
- `ActiveSessions` utiliza la columna G (`SessionTermsAcceptance`) para guardar la aceptación vinculada a cada token de sesión. Al crear una sesión nueva se inicia en estado pendiente; `acceptTerms` registra la aceptación para esa sesión. La columna I de `Users` se conserva como registro histórico de la última aceptación, pero ya no determina si una sesión nueva debe mostrar el aviso.
- `validateSession` usa una lectura local con espera de lock limitada y no actualiza `LastActivityAt`; la actividad se actualiza mediante `touchSession` cuando se ejecutan operaciones protegidas.

## Política y recuperación

La política de operaciones es deny-by-default. Si una acción mutadora no está registrada, se rechaza antes de ejecutar el handler. `migrateReplacedImagesSchema` tiene una política explícita limitada a `IMAGE_INVENTORY`; no reserva mantenimiento global. La actualización de `LastActivityAt` de ADMIN utiliza escritura cooperativa: dos leases ADMIN pueden coexistir cuando comparten únicamente esa actividad, pero cualquier lectura/escritura normal o mutación AUTH sobre `ACTIVE_SESSIONS` sigue generando conflicto. Si faltan URL/secreto, falla la llamada HTTP, la respuesta no es válida o el estado central está corrupto, la operación falla cerrada. `migrateCortesOperationIds` usa mantenimiento exclusivo tanto en simulación como en confirmación, porque ambas fases leen el mismo mapa de idempotencia. `migrateTimestamps` usa una lease de lectura/escritura por recursos; queda bloqueada por cualquier mantenimiento integral de ADMIN.

Las leases expiran a los 45 minutos, por encima del límite máximo habitual de ejecución de Apps Script, y se eliminan al adquirir/validar/liberar nuevas leases. Un cierre inesperado puede mantener recursos bloqueados hasta que venza la lease; no se libera una lease por suposición. El cliente libera en finally y registra únicamente el fallo de liberación, sin exponer tokens.

El token de lease solo se transmite entre servicios Apps Script. No debe exponerse en frontend, localStorage, sessionStorage ni respuestas al navegador. ADMIN conserva una única lease durante reorganización/alta y la llamada anidada WRITE valida el token contra la lista de acciones permitidas.

## Límites de esta entrega

No se modifica `JS/Frontend/api-config.js`, no se cambian endpoints de servicios existentes y no se realizan deployments ni pruebas contra Spreadsheet/Drive productivos. La activación requiere desplegar/configurar primero el coordinador de cada entorno y después actualizar los proyectos de servicio. Las pruebas reales de concurrencia entre proyectos y la validación de deployments quedan diferidas a Beta.
