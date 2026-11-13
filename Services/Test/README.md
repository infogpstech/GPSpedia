# AUTH y USERS — entorno aislado de pruebas

Este directorio contiene copias de los servicios AUTH y USERS destinadas exclusivamente a pruebas de ADMIN 0 sobre una Spreadsheet independiente.

**Spreadsheet de pruebas:** `1TyfehJHUeyUMGM4AW12_Rkq-Y8G_6MvF-Wd9rrB87_k`

Las copias de prueba reflejan las fuentes vigentes de `Services/Auth.js` y `Services/users.js`, pero conservan su propio `SPREADSHEET_ID`. `api-config.js` no se modifica para apuntar a deployments de prueba; sus endpoints operativos permanecen separados.

## Archivos

- `Auth.js`: copia de `Services/Auth.js`; únicamente cambia `SPREADSHEET_ID` en la línea 9.
- `users.js`: copia de `Services/users.js`; únicamente cambia `SPREADSHEET_ID` en la línea 9.

Cada archivo contiene su propio router `doGet/doPost` y sus constantes globales. **Deben instalarse en proyectos de Apps Script separados. No se deben pegar ambos archivos en un mismo proyecto.**

## Preparar los deployments de prueba

1. Crear un proyecto independiente de Apps Script para AUTH de pruebas.
2. Copiar el contenido completo de `Auth.js` en ese proyecto.
3. Crear otro proyecto independiente para USERS de pruebas.
4. Copiar el contenido completo de `users.js` en ese segundo proyecto.
5. Confirmar en cada proyecto que la constante `SPREADSHEET_ID` conserva el ID de la copia de pruebas.
6. Crear un deployment nuevo para cada proyecto, sin editar ni reemplazar deployments existentes.
7. Mantener las URLs resultantes separadas de la configuración live. No agregarlas a `api-config.js`.

Los deployments de prueba deben conservar la política de acceso que corresponda a los servicios existentes, pero utilizar proyectos y URLs nuevos. Este repositorio no contiene los IDs de proyecto ni las URLs de deployment de Apps Script; se generan desde Apps Script y deben verificarse allí.

## Operaciones que afectan la copia

- AUTH: consulta `Users`; actualiza `Users.Password` al migrar una contraseña legacy y `Users.SessionToken`; es la única autoridad que agrega/elimina registros de `ActiveSessions` para login, logout, resetUserSessions y deleteUser; escribe registros en `Logs`; utiliza CacheService para el contador de intentos.
- USERS: consulta `ActiveSessions` para validar sesiones y modifica `Users` para las acciones que correspondan. El cierre remoto de sesiones se enruta a AUTH; USERS no debe escribir en `ActiveSessions`.

Antes de probar, confirmar que la copia contiene las hojas `Users`, `ActiveSessions` y `Logs`, con los encabezados y columnas esperados por los servicios. Utilizar una cuenta de prueba dedicada y no realizar las pruebas contra las URLs operativas.

## Pruebas de resetUserSessions

La acción `resetUserSessions` debe invocarse exclusivamente contra el deployment AUTH aislado; el deployment USERS ya no expone un handler de escritura para ActiveSessions. Ejecutar pruebas concurrentes de login, logout, resetUserSessions y deleteUser sobre la misma Spreadsheet de prueba. Verificar sesiones objetivo ubicadas al inicio, medio y final; sesiones de otros usuarios preservadas; token solicitante/objetivo duplicado; reintentos; fallo parcial de deleteRow y respuesta cleanupPending. No usar las URLs operativas.

## Pruebas de deleteUser

La acción `deleteUser` debe invocarse exclusivamente contra AUTH aislado. Verificar conservación de fila/ID, congelación de valores históricos, rechazo de IDs vacíos/duplicados, marca `__deleted__:`, limpieza de credenciales, revocación de sesiones, rechazo de sesiones residuales, autodeleción, RBAC, reintentos y carrera login/delete. Confirmar que las cuentas nuevas reciben ID secuencial estático `USR-0001`, `USR-0002`, etc. y que el prefijo `__deleted__:` no se admite como nombre de usuario.

## Límites

- `api-config.js` continúa apuntando a los endpoints actuales; la plataforma live no se enruta a estos servicios de prueba.
- `Services/admin.js` no tiene una copia de prueba en este directorio y no forma parte de esta validación AUTH/USERS.
- No se ha creado ni desplegado ningún proyecto Apps Script desde este repositorio.
- La creación de estos archivos no demuestra que los deployments estén activos ni que apunten a la copia. La validación funcional comienza únicamente después de crear y comprobar ambos deployments.


## Eliminación segura de cuentas (AUG-005)

- La acción `deleteUser` se enruta exclusivamente a AUTH; AUTH utiliza el mismo `LockService.getScriptLock()` que login, logout y resetUserSessions.
- La eliminación es lógica: se sustituye `Nombre_Usuario` por `__deleted__:<UUID>` y se limpian contraseña, rol, datos de contacto, nombre completo y SessionToken. No se ejecuta `deleteRow()` en Users; el ID y la posición de la fila permanecen intactos.
- AUTH desactiva la cuenta antes de revocar sus sesiones. Si la eliminación de sesiones falla parcialmente, la cuenta permanece desactivada, AUTH rechaza las sesiones residuales y la operación puede reintentarse.
- Las cuentas nuevas reciben un ID secuencial estático `USR-0001`, `USR-0002`, etc.; no conservan la fórmula de ID heredada de la fila anterior.
- USERS filtra las cuentas desactivadas y rechaza sesiones asociadas a ellas. La interfaz oculta Eliminar para la cuenta autenticada y AUTH bloquea la autodeleción.


### Conservación de identificadores históricos
Antes de desactivar una cuenta, AUTH congela como valores estáticos los IDs calculados de todas las filas existentes. La operación se detiene si detecta una fila con datos sin ID o IDs duplicados. Así se conservan las referencias históricas aunque las fórmulas originales dependieran de otros campos. Las cuentas nuevas copian únicamente formato y validaciones de datos y reciben un ID secuencial estático `USR-0001`, `USR-0002`, etc.


## Identificadores permanentes de usuarios

- `Users.ID` utiliza identificadores secuenciales `USR-0001`, `USR-0002`, etc.
- USERS calcula el siguiente número leyendo los IDs de las filas que contienen datos, bajo el `ScriptLock` del servicio USERS.
- La columna ID de la nueva cuenta se escribe como valor fijo. El servicio reutiliza la primera fila vacía de la plantilla, incluso si contiene una fórmula prellenada solo en ID, y la sustituye por el ID permanente. Al extender la hoja solo se copian formato y validaciones; nunca se copia la fórmula de la columna ID.
- Las filas desactivadas conservan su ID, por lo que los números no se reutilizan. Los IDs duplicados o las filas con datos sin ID bloquean la creación para evitar asignaciones ambiguas.
- La secuencia comienza en `USR-0001` cuando no existen cuentas registradas y admite más de cuatro dígitos sin truncar el número.

## Estado de las mutaciones de sesiones

- `Services/Auth.js` es el único escritor de `ActiveSessions` para login, logout, resetUserSessions y deleteUser.
- `Services/users.js` valida sesiones mediante lectura, pero no agrega, modifica ni elimina filas de `ActiveSessions`.
- El botón Cerrar sesiones de `users.html` invoca `resetUserSessions`, que `api-config.js` enruta a AUTH. AUTH valida el token del Desarrollador, verifica que ambas cuentas estén activas y sean únicas, y elimina las sesiones del usuario objetivo bajo el mismo `ScriptLock` que login/logout.
- No se ha desplegado ni invocado ningún endpoint operativo desde esta modificación. Las pruebas concurrentes de Apps Script deben ejecutarse únicamente después de configurar los deployments aislados.


## Política de expiración de sesiones (AUG-007)

- `ActiveSessions.date` conserva la fecha de creación y no se modifica.
- `ActiveSessions.lastActivityAt` registra la última actividad autenticada aceptada por AUTH. AUTH crea la columna F de forma idempotente si está libre; no sobrescribe encabezados o datos desconocidos.
- La expiración absoluta ocurre a los tres meses calendario desde `date`; la expiración por inactividad ocurre al cumplirse un mes calendario desde `lastActivityAt`. Los límites se calculan en UTC y el día se ajusta al último día del mes cuando corresponde.
- Las sesiones históricas sin `lastActivityAt` usan `date` como última actividad inicial; la migración no renueva su antigüedad.
- `touchSession` y `validateSession` actualizan `lastActivityAt` solo después de validar token único, usuario activo y vigencia. USERS, ADMIN, FEEDBACK y WRITE aplican los mismos límites sin escribir en ActiveSessions.
- `changePassword` y `resetUserPassword` se enrutan a AUTH. Cambiar/restablecer una contraseña invalida primero todos los tokens de la cuenta y luego limpia las filas de sesión. `resetUserPassword` requiere rol Desarrollador y no permite restablecer la propia cuenta desde el formulario administrativo.
- Probar límites absolutos/de inactividad, meses de 28/29/30/31 días, timestamps inválidos, sesiones históricas sin columna F, actividad, revocación y fallos parciales únicamente en la Spreadsheet aislada.


## AUG-009 — Validación directa del nombre de usuario

Para comprobar la creación sin depender de users.html, enviar la acción createUser directamente al doPost del proyecto USERS aislado. Usar exclusivamente la Spreadsheet y el deployment de prueba descritos arriba.

Casos requeridos:
- Nombre_Usuario ausente, null, número u objeto: rechazar por tipo no textual.
- Cadena vacía o formada solo por espacios: rechazar después de trim().
- Prefijo reservado __deleted__: con variaciones de mayúsculas y espacios externos: rechazar.
- Nombre duplicado con diferencias de mayúsculas o espacios externos: rechazar.
- Nombre textual válido con espacios externos: aceptar y almacenar el valor recortado.

En cada caso rechazado, verificar que no se haya agregado ni modificado una fila de usuario. No configurar URLs de prueba en api-config.js y no llamar endpoints operativos.


Ampliación de casos: incluir también el campo Nombre_Usuario ausente y un nombre Unicode válido. El backend no impone un conjunto cerrado de caracteres ni una longitud máxima hasta que exista una política aprobada; la prueba debe confirmar que los nombres textuales no vacíos se conservan tras trim().


## AUG-010 — Serialización de mutaciones y contraseña legacy

Las copias AUTH y USERS deben probarse en proyectos Apps Script separados que utilicen únicamente la Spreadsheet aislada. Los locks de cada proyecto son locales; no asumir que el ScriptLock de AUTH coordina escrituras de USERS.

Pruebas USERS:
- Ejecutar createUser, updateUser y updateProfile en el deployment USERS aislado; comprobar que la sección crítica comienza antes de validar sesión/rol y termina después de la escritura.
- Probar contención/timeout del lock y que se libera después de errores de autorización o escritura.
- En updateUser, enviar simultáneamente Nombre_Completo válido y un Privilegios no permitido; confirmar rechazo sin modificar ninguno de los dos campos.
- Inyectar fallo después de escribir el ID en createUser; comprobar que la fila ID-only se puede reutilizar en un reintento sin duplicar IDs.

Pruebas AUTH:
- Intercalar un login con contraseña legacy con changePassword para esa cuenta; el login con la contraseña anterior debe fallar al revalidar bajo el lock y no debe restaurar el hash antiguo ni crear sesión.
- Intercalar login legacy de un usuario con resetUserPassword ejecutado por Desarrollador; el login antiguo debe fallar, conservarse el hash nuevo y no crearse sesión adicional.
- Confirmar que una migración legacy normal se escribe bajo el lock AUTH y que un login con el hash actual sigue funcionando.

No usar api-config.js para apuntar a URLs de prueba ni invocar endpoints operativos. La prueba real de conflictos AUTH↔USERS queda diferida a AUG-034, que define el coordinador interproyectos. La recuperación de escrituras parciales de updateUser se prueba bajo AUG-154, no se considera resuelta por AUG-010.


Prueba adicional AUTH: cambiar el rol de la cuenta después de la lectura inicial de login y antes de que adquiera el ScriptLock; el límite de sesiones debe corresponder al rol revalidado dentro de la sección crítica, no al valor anterior.

## AUG-013 — Purga coordinada de Logs

- AUTH es la única autoridad para insertar y purgar filas de la hoja `Logs`. `logToSheet()` y la acción `clearSensitiveLogs` usan el mismo `LockService.getScriptLock()` del proyecto AUTH.
- `api-config.js` enruta `clearSensitiveLogs` directamente a AUTH. FEEDBACK ya no elimina filas de Logs; sus locks no se consideran compartidos con AUTH.
- Para validar la acción, ejecutar `clearSensitiveLogs` directamente contra el deployment AUTH aislado, enviando `{ userId, sessionToken }` de una cuenta Desarrollador activa de la Spreadsheet de prueba.
- Fixtures requeridos: claves JSON `password`, `sheetPassword`, `currentPassword`, `newPassword`, `fromSheet`, `fromClient`; `username` en `handleLogin started.`; `Password comparison`; y registros no sensibles que deben conservarse.
- Ejecutar inserciones AUTH durante la purga y comprobar que esperan al mismo ScriptLock o se ejecutan después; no usar endpoints ni hojas productivas.
- La coordinación general de operaciones ADMIN/WRITE/FEEDBACK sobre recursos compartidos continúa pendiente en AUG-034.


## Mutación de roles y recuperación de sesiones (AUG-016)

- `updateUser` se enruta exclusivamente a AUTH. AUTH valida al actor, actualiza Nombre_Completo/Privilegios y, cuando cambia Privilegios, revoca todas las sesiones objetivo bajo el mismo ScriptLock que serializa login y ActiveSessions.
- USERS y su copia de prueba ya no exponen el handler `updateUser`; los cambios de rol no deben escribirse desde ese proyecto.
- AUTH usa ScriptProperties para conservar el requestId de login durante reintentos. La clave permanece en sessionStorage del navegador hasta que auth.js persiste la sesión local. No reutilizar un requestId en una operación distinta.
- La revocación de rol utiliza un marcador durable por userId en AUTH y un espejo compartido en `Users.SessionToken` con prefijo `__role_revocation_pending__:`. FEEDBACK, USERS, ADMIN y WRITE consultan ese campo y rechazan la cuenta mientras exista el marcador; AUTH lo retira solo después de confirmar la revocación y el nuevo rol. Antes de desplegar la nueva versión, ejecutar `migrateLegacyRoleRevocationMarkersToSharedState_()` en AUTH para reflejar marcadores locales pendientes previos. Si una escritura no puede confirmarse, el estado compartido permanece y el proceso se reintenta en login/validación.
- La revocación de sesiones se confirma leyendo ActiveSessions después de limpiar tokens. Una fila física que no se pudo borrar pero conserva token vacío no autoriza y puede limpiarse en un reintento.
- Las pruebas deben ejecutarse solo contra los deployments AUTH/USERS aislados y la Spreadsheet indicada arriba. No cambiar api-config.js a URLs de prueba ni invocar endpoints operativos.


### Idempotencia y tombstones de solicitudes

- Los requestId de login se conservan en ScriptProperties durante 24 horas. Un reintento con el mismo requestId recupera el mismo token y no crea otra fila.
- Un logout, reset de sesiones, cambio de rol, cambio/restablecimiento de contraseña o eliminación de cuenta invalida los requestId vinculados a las sesiones/cuenta. Un reintento con un requestId revocado se rechaza y obliga a iniciar un intento nuevo.
- Los requestId pendientes que superan 24 horas se reconcilian: si dejaron una fila de sesión activa, se invalida antes de retirar el registro.
- No se asume atomicidad de SpreadsheetApp. Cada mutación relevante se verifica por lectura posterior; si no puede confirmarse, se conserva el estado pendiente y se permite reintentar.


## Coordinación compartida entre servicios (AUG-155)

Las copias AUTH/USERS de este directorio también requieren el cliente `Services/SharedMutationClient.js` cuando se prueben con la integración AUG-155. No deben conectarse al coordinador productivo.

Para pruebas aisladas:

1. Crear un proyecto Apps Script independiente para el coordinador de pruebas y copiar `Services/Coordinator.js`.
2. Desplegarlo como aplicación web en un entorno separado. El coordinador no abre Spreadsheet ni Drive.
3. Configurar en el coordinador los secretos de prueba `GPSpedia_COORDINATOR_SECRET_AUTH` y `GPSpedia_COORDINATOR_SECRET_USERS`; usar valores aleatorios de al menos 32 caracteres y no guardarlos en el repositorio.
4. Incluir `Services/SharedMutationClient.js` en los proyectos AUTH y USERS de prueba.
5. En cada proyecto de servicio, configurar `GPSpedia_COORDINATOR_URL` con la URL /exec del coordinador de prueba y `GPSpedia_COORDINATOR_SECRET` con el secreto correspondiente.
6. Mantener la Spreadsheet de pruebas y los deployments separados de producción. No modificar `api-config.js` para apuntar a los servicios de prueba.

El archivo `Services/Test/SharedMutationCoordinator.js` contiene pruebas lógicas aisladas. Para ejecutarlas, cargarlo junto con `Coordinator.js` y `SharedMutationClient.js` en un proyecto temporal de pruebas y ejecutar `runSharedMutationCoordinatorTests()`. La batería utiliza dobles en memoria y no accede a servicios externos.

La suite lógica también cubre la reserva de mantenimiento, drenaje de leases existentes, bloqueo de nuevas mutaciones durante la espera, diagnóstico de operaciones activas, expiración de reservas abandonadas y compatibilidad con leases previas sin campo `phase`. `migrateCortesOperationIds` se declara como mantenimiento exclusivo en ADMIN. La versión 1.1.1 también reserva lectura de `CORTES` para `addProblem`, `addVehicleToProblem` y `removeVehicleFromProblem`; 30 escenarios cubren conflictos con escrituras `WRITE`, dos altas simultáneas y alta/baja concurrentes.

La integración real entre proyectos, la contención de leases bajo concurrencia de Apps Script y la configuración de deployments se validan posteriormente en Beta. La falta de configuración del coordinador hace que las mutaciones fallen cerradas; por ello, el coordinador de cada entorno debe desplegarse y configurarse antes de actualizar sus servicios consumidores.


## Integridad de Idempotencia (AUG-035)

`Services/Test/IdempotenciaIntegrity.js` contiene pruebas lógicas con dobles en memoria. Cargar `Services/admin.js` y el archivo de pruebas en un proyecto temporal, y ejecutar `runIdempotenciaIntegrityTests()`. La batería valida encabezados vacíos con datos, duplicados opId incluso con asociación idéntica, opId/vehicleId/slotIndex/timestamp/status y unicidad de vehicleId en Cortes.

La reconciliación es no destructiva: ninguna ruta automática fusiona, sobrescribe ni elimina filas duplicadas. El error identifica opId y filas; se conservan los originales y se comparan asociación, fecha y estado antes de cualquier corrección manual documentada. La migración solo limpia origen tras verificar cada opId, asociación y estado completed. Fallos reales de Spreadsheet, interrupción y concurrencia se validan en una copia aislada antes de Beta.

La suite también comprueba que una hoja con menos de cinco columnas y registros se rechaza sin intentar leer fuera del rango ni repararla.

Reglas de validación aplicadas: `opId` debe cumplir `OP-` seguido de 1–100 caracteres alfanuméricos, guion o guion bajo; `vehicleId` no puede estar vacío, superar 80 caracteres ni contener controles; `slotIndex` debe ser 1, 2 o 3; `timestamp` debe ser una fecha válida (`Date`, epoch positivo o texto parseable, incluidos `dd/MM/yyyy` y `dd/MM/yyyy HH:mm:ss`); `status` solo admite `pending` o `completed`. Una hoja con menos de cinco columnas y registros también se rechaza, sin intentar leer o reparar rangos incompletos.


## Contrato VIN y columnas de testigo (AUG-036)

`Services/Test/VinTestigoIntegrity.js` contiene pruebas lógicas con dobles en memoria. Cargar `Services/admin.js` y el archivo de pruebas en un proyecto temporal, y ejecutar `runVinTestigoIntegrityTests()`. Verifica AT:AV fijas con columnas adicionales, creación desde AS, encabezados testigo/VIN duplicados o fuera de posición, datos sin encabezado, JSON canónico, posiciones vacías, delimitadores heredados, opId heredados y entradas inválidas.

Regla de esquema: `activaTestigo1..3` deben estar en AT:AV. `VIN` se resuelve por encabezado único y puede estar en otra posición; la migración controlada lo establece en AQ. El JSON array es canónico y preserva slots vacíos. Para compatibilidad histórica se admiten cadenas delimitadas por coma, `/`, `\\` y `;`; no se reinterpretan JSON mal formados ni se aceptan tokens inválidos, duplicados o más de tres posiciones. Las pruebas mock no sustituyen la validación de una copia real de Spreadsheet.


## Ledger de cargas generales (AUG-037)

`Services/Test/ImageUploadLedger.js` contiene 18 pruebas lógicas con dobles en memoria. Cargar `Services/admin.js` y el archivo de pruebas en un proyecto temporal, y ejecutar `runImageUploadLedgerTests()`. Verifica metadatos v2, extracción de fileId, hash, carpeta, MIME, tamaño, reutilización por token, duplicados, esquema/registro del ledger, límite 10 MB, clasificación de referencias y fallo cerrado cuando Spreadsheet no permite persistir el intento.

La acción ADMIN `reconcilePendingImageUploads` ejecuta simulación por defecto. Para aplicar estados se requiere confirm:true; procesa hasta 100 filas por llamada y devuelve nextStartRow cuando hay más. Los estados pending_unreferenced y orphan_candidate no autorizan borrar archivos. file_missing y requires_review se conservan para revisión. La prueba real con Drive y Spreadsheet aislados sigue siendo obligatoria antes de Beta.


## Aprobación y subida reanudable de YouTube (AUG-043)

Las pruebas del flujo de aprobación se ejecutan con Services/feedback.js y las suites aisladas siguientes:

- Services/Test/VideoApprovalState.js — valida el estado y la forma de las solicitudes.
- Services/Test/YouTubeApproval.js — creación idempotente, recuperación por opVideoId, titularidad, duplicados y URL/ID real.
- Services/Test/YouTubeApprovalInit.js — metadatos fijos, destino existente, respuesta HTTP y URL oficial de sesión.
- Services/Test/VideoApprovalPublishing.js — aprobación/rechazo en Cortes, PyS y Tutorial; unicidad del destino, miniaturas, reintentos tras fallos parciales, validación de subType/status, consistencia entre ID_vehiculo y referenceId, estado de fila pendiente/resuelta, JSON inválido y decisiones terminales.
- Services/Test/VideoApprovalContracts.js — ejecutar runVideoApprovalCreationContractTests(); valida altas sin vídeo, bloqueo de enlaces directos y protección de cambios fuera del flujo de aprobación.
- Services/Test/VideoApprovalSessions.js — sesión ausente, inválida, expirada, revocada, token cruzado, duplicidad de token/perfil y rol no permitido.
- Services/Test/YouTubeAddCortesContract.js — ejecutar `runYouTubeAddCortesContractTests(addCortesHtml)` desde el runner local; verifica que Cortes no exponga entrada manual, no copie la URL pendiente al formulario y conserve el flujo de aprobación con bloqueo de doble envío.

Cada suite expone una función run...Tests() y usa dobles en memoria. No modifica hojas ni datos productivos. Cargar primero Services/feedback.js y después el archivo de prueba en un proyecto temporal de Apps Script V8; ejecutar la función indicada en el archivo.

Services/Test/YouTubeUploadClient.js contiene pruebas del cliente resumable (IndexedDB, 308, consulta de progreso, respuesta final sin ID, pérdida de respuesta, sesión expirada y cancelación). Es una suite de entorno navegador: para ejecutarla, concatenar youtubeUpload.js y el archivo de prueba en un runner JavaScript que inyecte window, sessionStorage, XMLHttpRequest y console simulados. No se ejecuta directamente en Apps Script porque el módulo depende de APIs del navegador.

Las suites aisladas no sustituyen la validación real con YouTube OAuth/API, XHR en navegador, IndexedDB real, Apps Script desplegado ni copias aisladas de Google Sheets. Esas verificaciones permanecen diferidas a Beta; no se deben presentar como ejecutadas.


## Confirmación de validación antes de caché local (CORR-SUGGESTYEAR-CLIENT-CONFIRM-001)

- `Services/Test/ValidationCacheConfirmation.js` — ejecutar con `node --experimental-default-type=module Services/Test/ValidationCacheConfirmation.js`. Verifica orden backend→caché, estados confirmados, respuestas info no registradas, fallos de red, estados desconocidos y fallos de IndexedDB.
- La suite no necesita navegador ni accede a servicios externos.

## Sincronización del contador de likes en cliente (CORR-FEEDBACK-LIKE-COUNTER-SYNC-001)

- `Services/Test/LikeClientCounter.js` — ejecutar con `node --experimental-default-type=module Services/Test/LikeClientCounter.js`. Verifica likes nuevos, reintentos idempotentes, recuperación, deduplicación de estado local y preservación del contador ante respuestas inválidas.
- La suite no requiere navegador ni servicios externos.

## AUG-003 — Contrato y coordinación compartida del servicio UTILITIES

- `migrateTimestamps` es la única acción del router `Services/Utilities.js`; `api-config.js` la dirige a UTILITIES. No se encontraron llamadas en `ui.js`, `index.html`, `users.html` ni en el formulario de alta; no se atribuye un consumidor frontend inexistente.
- Lee Users/ActiveSessions para validar identidad, Cortes (columna I) para obtener URLs y metadatos de Drive para resolver fechas. Escribe Hoja 1 (columna A) y las hojas temporales de staging/backup.
- Ejecuta primero la lease compartida `UTILITIES/migrateTimestamps` y después el ScriptLock local. La política reserva lectura de USERS, ACTIVE_SESSIONS, CORTES y DRIVE, y escritura de UTILITIES. Los backups/restores integrales de ADMIN bloquean la migración; las escrituras de identidad, Cortes y Drive también entran en conflicto.
- Ejecutar el runner reproducible; el grupo UTILITIES carga `SharedMutationClient.js`, `Services/Utilities.js` y `Services/Test/UtilitiesSecurity.js`. El grupo INTEGRATION prueba la política en `Services/Test/SharedMutationCoordinator.js`.
- Los dobles verifican orden de locks, fallo cerrado sin coordinador/lease, liberación en éxito/error y conflictos con AUTH/WRITE/ADMIN. No se conectan Spreadsheet, Drive ni deployments reales. La configuración del proyecto UTILITIES y la concurrencia entre deployments se validan en Beta.

## Seguridad y recuperación del servicio UTILITIES (AUG-041)

- `Services/Test/UtilitiesSecurity.js` — cargar junto con `Services/Utilities.js` en un runner V8 e invocar `runUtilitiesSecurityTests()`. Usa dobles en memoria para sesión/rol, staging, verificación, promoción, rollback, lock ocupado, origen vacío, destino incompatible y recuperación de respaldo interrumpido.
- No accede a Apps Script desplegado, Spreadsheet ni Drive reales. La comparación del deployment publicado y la integración física se reservan para Beta.

## Seguridad e integridad de escrituras FEEDBACK (AUG-040)

- `Services/Test/FeedbackWriteSecurity.js` — ejecutar `runFeedbackWriteSecurityTests()` junto con `Services/feedback.js` en un proyecto temporal V8. Usa dobles en memoria para autorización, identidad de actor, política pública, deduplicación de likes, recuperación de contadores y rechazo de altas PyS sin imagen.
  También prueba peticiones POST directas: sustitución de identidad, sesión inválida, rol falsificado en `approveVideo`, coordinación FEEDBACK y rechazo de `assignCollaborator`.
- `Services/Test/SharedMutationCoordinator.js` comprueba la contención interservicios y que `recordLike`, `suggestYear` y `approveVideo` reserven `CORTES`, `FEEDBACK` y `ACTIVITY`; también confirma que `assignCollaborator` ya no esté habilitada y que `approveVideo` y `rejectVideo` no puedan adquirir leases simultáneas.
- Acciones públicas: `getPysData` (solo lectura) y `sendContactForm` (longitudes/correo validados y máximo 10 envíos por hora). `suggestYear` admite aportes anónimos limitados a 30 por hora; no cuentan para modificar automáticamente el catálogo y quedan para revisión manual.
- Las escrituras `recordLike`, `reportProblem`, `addProblem`, `addSolution`, `addPrevention` y `suggestCutChange` requieren sesión activa; el backend reemplaza userId/userName/userRole con datos de Users. Las demás acciones deben estar declaradas; las no declaradas se rechazan.
- `FeedbackLikes` se crea bajo demanda; su esquema está en `Spreadsheet/GPSpedia_DB_columnas.md`. No ejecutar contra hojas productivas.

## Mapa central de acciones y dispatchers (AUG-044)

- `Services/Test/ActionDispatchContract.js` — ejecutar `runActionDispatchContractTests(sources)` pasando el contenido de `api-config.js`, `Services/Auth.js`, `Services/users.js`, `Services/catalog.js`, `Services/write.js`, `Services/feedback.js`, `Services/admin.js`, `Services/Utilities.js` y `users.html`. Compara las acciones mapeadas, los dispatchers, endpoints y compatibilidades sin llamar servicios.
- `getHeaders` se retiró del dispatcher WRITE por no tener consumidor ni entrada en el mapa. `addCorte` se retiró del mapa porque no existe handler ni consumidor; `migrateYearRanges` ya se había retirado en AUG-041 y `assignCollaborator` en AUG-040.
- Compatibilidades directas conservadas: CATALOG/getSuggestion y ADMIN/checkOperation, ADMIN/addOrUpdateCut y ADMIN/addSupplementaryInfo. El mapa canónico dirige esas acciones a WRITE; las rutas ADMIN conservan la validación de sesión Desarrollador.
- `logFrontend` es la única acción LEGACY declarada: `users.html` la envía mediante `remoteLog` al SCRIPT_URL que coincide con API_ENDPOINTS.LEGACY. El código del deployment no está versionado aquí y debe verificarse en Beta.
- `routeAction` ya no redirige silenciosamente servicios desconocidos a LEGACY; falla con error de servicio no configurado.
- La suite usa fuentes estáticas y no invoca endpoints, deployments ni datos productivos.


La acción AUTH `acceptTerms` reserva los recursos de identidad `Users` y `ActiveSessions`; su política y serialización se comprueban en `runSharedMutationCoordinatorTests()`.


## Aceptación versionada de Términos y Condiciones (AUG-045)

- Ejecutar `node --experimental-default-type=module Services/Test/TermsAcceptance.js`.
- Comprueba parseo de evidencia, creación segura del encabezado I de Users, rechazo de encabezados/datos incompatibles y contratos AUTH/USERS/API/UI.
- No accede a Google Sheets real, Apps Script desplegado ni navegador; esas comprobaciones quedan reservadas a Beta.


## Instantánea autoritativa y sincronización del catálogo (AUG-048)

- Ejecutar `node --experimental-default-type=module Services/Test/CatalogSnapshotSync.js`.
- Comprueba el contrato completo de `getCatalogData`, IDs de Cortes ausentes/duplicados, comparación profunda de Tutoriales/Relay/Logos con cardinalidad constante y reemplazo exacto de la caché IndexedDB.
- La suite usa un IndexedDB simulado en memoria; no accede a navegador real, Apps Script, Spreadsheet ni datos operativos.


## Búsqueda global y navegación por sección (AUG-049)

- Ejecutar `node --experimental-default-type=module Services/Test/GlobalSearch.js`.
- Comprueba normalización de acentos, HTML y entidades; búsqueda en los tres slots de Cortes; prioridad exacta/parcial/descriptiva; campos de Relay, Tutoriales y PyS; años frente a modelos numéricos; clasificación y autoapertura por sección; deep links y promesas compartidas.

## Estado terminal de carga para deep links (AUG-052 — iteración 1)
- Ejecutar `node --experimental-default-type=module Services/Test/CatalogReadiness.js`.
- Comprueba resolución inmediata con catálogo disponible, espera por suscripción de estado (sin polling), propagación de error terminal y timeout acotado.
- La suite valida el contrato local de estado; no sustituye pruebas de navegador real ni de red.
- La suite usa datos sintéticos y no llama a Apps Script ni a endpoints operativos.


## Persistencia de firmas diferenciales VIN (AUG-050 — avance)
- Ejecutar `node --experimental-default-type=module Services/Test/VinSignaturePersistence.js`.
- Comprueba fingerprint determinista, invalidación por cambios, versionado, restauración compatible, rechazo de caché obsoleta/corrupta y recálculo.
- Usa localStorage simulado y datos sintéticos; no consulta catálogo operativo ni servicios externos.


### Resolución de identidad y contexto VIN

Ejecutar `node --experimental-default-type=module Services/Test/VinContextResolution.js` para probar resolución por `classKey`, marca, modelo, año dentro del rango y versión, además de contextos insuficientes o contradictorios. La suite usa firmas sintéticas y no consulta el catálogo productivo.


### Umbral de muestras y competidores aplicables VIN

Ejecutar `node --experimental-default-type=module Services/Test/VinSampleThreshold.js`.
Verifica el umbral predeterminado/configurable, el estado insuficiente con muestras por debajo del mínimo, la ausencia de competidores por rango de años y que las firmas insuficientes no participen en consultas. Usa registros sintéticos; no consulta el catálogo productivo.


### Semántica de rangos de años VIN

Ejecutar `node --experimental-default-type=module Services/Test/VinYearRangeSemantics.js`.
Define y verifica que un `anoHasta` vacío significa que la generación continúa vigente hasta el año actual; un `anoDesde` vacío o inválido deja el rango sin base verificable y no produce solapamiento. Las consultas por año usan la misma regla. La suite usa rangos y firmas sintéticos.


### Normalización de VIN completo y prefijos (AUG-050)

Ejecutar `node --experimental-default-type=module Services/Test/VinQueryNormalization.js`.
La suite verifica que un VIN estándar de 17 caracteres conserve primero la coincidencia exacta completa y, si no existe, consulte exactamente sus primeros 12 caracteres; los prefijos ya ingresados no se recortan. También verifica longitudes distintas, ausencia de coincidencias por subcadena, ambigüedad y filtrado por contexto. Usa firmas sintéticas y no consulta el catálogo productivo.


### Cierre AUG-050 — integración, ambigüedad y coste combinatorio

Ejecutar `node --experimental-default-type=module Services/Test/VinAUG050Completion.js`.
Verifica igualdad de carácter por posición en `extractSharedChars`, mapeo por `classKey` de versiones/generaciones, límite de evaluaciones combinatorias y métricas de coste, además de contratos estáticos de navegación/renderizado. El presupuesto predeterminado es 20,000 combinaciones por clase; al agotarse, la firma queda pendiente de revisión y no se valida. Usa datos sintéticos. La medición con el catálogo operativo y la validación visual real se reservan a Beta.


## Robustez de transacciones IndexedDB (AUG-051 — iteración 1)

- Ejecutar `node --experimental-default-type=module Services/Test/IndexedDBTransactions.js`.
- La suite usa IndexedDB simulado y comprueba que la escritura solo se confirma después de transaction.oncomplete, que un abort posterior a request.onsuccess no se interpreta como persistencia, que los errores de cuota fallan cerrados, que onversionchange cierra y permite reabrir la conexión y que onblocked rechaza explícitamente la apertura.
- No sustituye pruebas con IndexedDB real, dos pestañas ni navegadores móviles; esas validaciones siguen pendientes en AUG-051/Beta.


## Aislamiento de actividad local por cuenta (AUG-051 — iteración 2)

La suite `Services/Test/IndexedDBTransactions.js` verifica aislamiento de `searchHistory`, `viewedItems` y `validationCache` por `userId`, rechazo de operaciones sin propietario y exclusión de consultas potencialmente VIN. Las entradas heredadas sin propietario nunca se muestran a una cuenta; no se cambia el esquema físico ni se atribuyen registros antiguos a un usuario sin evidencia. Node CLI, IndexedDB real, dos cuentas y dos pestañas siguen pendientes de validación en el entorno local/Beta.


## Caducidad TTL de miniaturas (AUG-051 — iteración 4)

Ejecutar `node --experimental-default-type=module Services/Test/IndexedDBTransactions.js`.
La suite incluye expiración a los 30 días, eliminación de la variante vencida y regeneración posterior. Validación efectuada en runtime V8 adaptado: 10/10 escenarios PASS. El adaptador sustituyó únicamente el cargador de módulos, las aserciones Node y globals Node ausentes; no representa una ejecución literal de Node CLI. Navegador real y multi-pestaña se reservan a Beta. LRU, cuota total, límite RAM, ObjectURL y concurrencia quedan pendientes.

## Variantes de miniaturas por tamaño (AUG-051 — iteración 3)

La suite `Services/Test/IndexedDBTransactions.js` incluye un escenario que genera y recupera variantes independientes de 300 y 800 px, verifica que no se confundan con una variante de 1600 px y comprueba la liberación de `ImageBitmap.close()`. El escenario usa IndexedDB y Canvas simulados; no sustituye pruebas de navegador real ni de imágenes transparentes.


## AUG-051 — caché local de miniaturas

- Las variantes persistidas usan una política LRU con un máximo de 200 entradas. Cada lectura válida actualiza `lastAccessedAt`; al superar el límite se eliminan primero las variantes con menor recencia.
- La lectura y actualización de recencia se realizan dentro de una transacción IndexedDB `readwrite`, y la evicción vuelve a evaluar el conjunto dentro de otra transacción `readwrite`.
- El límite controla el número de variantes, no el tamaño en bytes ni la cuota global del navegador. La política de cuota total permanece pendiente en AUG-051.
- La suite `Services/Test/IndexedDBTransactions.js` incluye una regresión que comprueba actualización de recencia, expulsión de la variante menos reciente y conservación de la recién creada.


La regresión LRU también difiere deliberadamente una solicitud `delete` y comprueba que la operación no se resuelva antes de que esa solicitud termine. El harness contabiliza solicitudes pendientes de cada transacción, incluidas las encoladas durante `onsuccess`. Ejecutar junto con el resto de escenarios mediante `node --experimental-default-type=module Services/Test/IndexedDBTransactions.js`.


## Recuperación ante cuota de IndexedDB (AUG-051)

Ejecutar `node --experimental-default-type=module Services/Test/IndexedDBTransactions.js`.
Cuando una escritura de miniatura falla con `QuotaExceededError`, la aplicación elimina progresivamente el 25 % más antiguo de las miniaturas persistidas (orden LRU); si solo quedan registros heredados sin metadatos de recencia, libera sus claves por lotes y reintenta la escritura. La recuperación solo afecta al almacén desechable `thumbnails`; si no quedan miniaturas para liberar o la escritura vuelve a fallar sin poder recuperar espacio, se omite el almacenamiento en caché y se conserva el resultado nulo, sin afectar los demás almacenes. La suite incluye una simulación de fallo de cuota y comprueba que la escritura se recupere y que el catálogo permanezca intacto.


### Image ObjectURL lifecycle

Ejecutar `node --experimental-default-type=module Services/Test/ImageObjectUrlLifecycle.js`. La suite verifica referencias compartidas, liberación al reemplazar una imagen, descarte de respuestas asíncronas obsoletas, limpieza al retirar elementos del DOM y rechazo de URL para elementos todavía desconectados. La prueba usa URL y MutationObserver simulados; la observación de DOM real queda reservada a Beta.


### Presupuesto de memoria RAM para miniaturas (AUG-051)

El registro de ObjectURL limita a **64 MiB** la suma de Blob.size de las miniaturas retenidas por URL activas. Si una nueva miniatura supera el presupuesto disponible, no se crea ObjectURL y la interfaz conserva la ruta remota como alternativa. Las referencias compartidas contabilizan el Blob una sola vez y el presupuesto se libera al revocar la URL cuando sale el último consumidor. Este límite cubre bytes de Blob retenidos por el registro; no mide memoria de imágenes decodificadas, superficies GPU ni imágenes cargadas directamente desde red. Ejecutar `node --experimental-default-type=module Services/Test/ImageObjectUrlLifecycle.js`.


## Concurrencia de compresión de miniaturas (AUG-051 — iteración 10)

`thumbnailCompressionQueue.js` limita a **dos compresiones simultáneas por instancia JavaScript/pestaña** y procesa las solicitudes pendientes en orden FIFO. La compresión, incluida la descarga, decodificación, generación del Blob y persistencia, ocupa un turno hasta finalizar. Si una variante ya fue guardada mientras otra solicitud esperaba, se vuelve a consultar la caché antes de descargarla y comprimirla. Cada `ImageBitmap` se cierra en `finally`; los errores liberan el turno y mantienen el comportamiento de caché opcional.

La regresión añadida a `Services/Test/IndexedDBTransactions.js` solicita cinco miniaturas concurrentes y verifica el máximo de dos `ImageBitmap` activos, la persistencia de los cinco resultados y el cierre de cada bitmap. Ejecutar con `node --experimental-default-type=module Services/Test/IndexedDBTransactions.js`. La suite integrada queda pendiente de ejecución en un checkout local; las pruebas aisladas del limitador sí se ejecutaron en Node.

## Timeout, cancelación y reintentos del catálogo (AUG-052 — iteración 2)
- Ejecutar `node --experimental-default-type=module Services/Test/CatalogRequestRetry.js`.
- Comprueba éxito inmediato, reintento de fallo transitorio, HTTP 503, timeout con aborto de la solicitud, no reintento de HTTP permanente, cancelación externa y cancelación durante la espera de reintento.
- Política cliente: timeout de 8 s por intento, máximo 2 reintentos con espera exponencial de 400/800 ms; no reintenta errores HTTP 4xx (excepto 408/429), respuestas inválidas ni errores de aplicación.
- El ciclo de sesión cancela la carga anterior al cambiar de cuenta o cerrar sesión. No se modifican endpoints ni contratos del backend.


## Estado recuperable del catálogo (AUG-052 — iteración 3)

- Ejecutar `node --experimental-default-type=module Services/Test/CatalogStatus.js`.
- Comprueba el estado informativo durante la carga, el aviso persistente de datos guardados posiblemente desactualizados, el reintento ofrecido cuando no hay catálogo disponible y la ocultación del aviso al recuperar el estado ready.
- La suite valida la clasificación de estados sin DOM ni servicios externos. La interacción real del botón, la red y la recuperación offline quedan pendientes de Beta.


## Service Worker: precache del grafo y cuota (AUG-052 — iteración 4)

Ejecutar `node --experimental-default-type=module Services/Test/ServiceWorkerCache.js`.

La suite verifica el precache del grafo estático transitivo (incluido VinDifferentialEngine.js), tratamiento de cuota en recursos opcionales y esenciales, asociación de cache.put a event.waitUntil, fallback de navegación offline y exclusión de peticiones no GET. Utiliza Cache Storage y fetch simulados; instalación/actualización y arranque offline en navegador real quedan para Beta.


## Escenarios de inicio y PWA (AUG-052 — criterio 5)

Ejecutar `node --experimental-default-type=module Services/Test/PWAStartupScenarios.js`.

La suite cubre primera instalación y precarga del App Shell/grafo de módulos; actualización v14→v15 y conservación de cachés ajenas; fallo de precarga esencial sin activar una instalación incompleta; arranque offline desde un deep link con fallback a `index.html`; deep link sin sesión ni catálogo; estados terminales error/stale; timeout y caída de API con máximo de tres intentos; y snapshots sintéticos de 0, 250, 2,500 y 10,000 Cortes con rechazo de IDs duplicados. Usa Service Worker, estado, solicitudes y datos simulados; no invoca endpoints ni modifica datos.

La ejecución en runtime V8 adaptado obtuvo 10/10 escenarios PASS. La ejecución literal de Node CLI y las pruebas en navegador/dispositivo real, Cache Storage real, red y Apps Script/Spreadsheet se reservan a Beta.


## Aislamiento de operaciones addCutPending por cuenta (AUG-053 — iteración 1)

La suite `IndexedDBTransactions.js` añade cinco escenarios para el modal «Agregar Corte»: dos cuentas con el mismo vehículo mantienen operaciones separadas; una misma cuenta conserva el conflicto de opId; los registros legados se migran al owner original; los tokens de sesión no se persisten; y la eliminación solo afecta la operación de la cuenta propietaria. Ejecutar con `node --experimental-default-type=module Services/Test/IndexedDBTransactions.js`.


## Aislamiento de operaciones pendientes (AUG-053)

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/PendingOperationIsolation.js
```

La prueba verifica partición por propietario, exclusión de credenciales, rechazo de owner distinto, migración de registros legados con propietario explícito, cuarentena de registros sin propietario, eliminación por opId y conservación del legado ante fallos de almacenamiento.


## Aislamiento de copias de edición (AUG-053)

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/EditBackupIsolation.js
```

Verifica separación por cuenta y vehículo, rechazo de identidades incongruentes, cuarentena/migración de registros legados, eliminación limitada y exclusión de tokens/credenciales.


## Retención segura de snapshots locales (AUG-053 — iteración 4)

Política conservadora: no se aplica TTL automático a operaciones pendientes (`addCutPending` y `gpsepedia_pending_operation`) ni a copias de edición (`gpsepedia_edit_backup`). Una operación en estado processing/failed puede tener un resultado remoto incierto; una copia de edición puede ser necesaria para recuperar una sesión interrumpida. Por ello, se conservan hasta una confirmación autoritativa del servidor o el cierre explícito y verificado de la edición. La limpieza se limita al propietario, vehículo y opId correspondientes. Los registros legados en cuarentena no se purgan automáticamente. No se aplica esta política a `adminImageUploadPending`, cuya privacidad sigue pendiente de decisión.

- `PendingOperationIsolation.js`: permanencia de snapshots antiguos y eliminación únicamente mediante opId del propietario (8 escenarios).
- `EditBackupIsolation.js`: permanencia de copias antiguas hasta su eliminación explícita por propietario/vehículo (8 escenarios).
- `IndexedDBTransactions.js`: permanencia de addCutPending antiguo y rechazo de eliminación desde otra cuenta (25 escenarios en total).


## Aislamiento de reemplazos de imágenes ADMIN (AUG-053 — iteración 5)

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/AdminImageUploadIsolation.js
```

La suite comprueba claves por propietario/vehículo/campo, rechazo de identidades incompletas, separación de claves legadas, cuarentena sin adjudicación de propietario, whitelist del snapshot sin credenciales y rechazo de recuperación/eliminación cruzada. Los registros legados sin owner se ponen en cuarentena al consultar el estado; no se purgan automáticamente para preservar operaciones de resultado remoto incierto.


## Autorización y contrato de edición in-modal ADMIN (AUG-053)

Cargar `Services/admin.js` y `Services/Test/AdminModalEditSecurity.js` en un runtime V8 de pruebas y ejecutar `runAdminModalEditSecurityTests()`. La suite ejecuta 13 escenarios: Desarrollador y Gefe comparten el permiso únicamente para las tres acciones del modal; jefe y otros roles siguen excluidos; se conservan las validaciones de sesión/revocación; la whitelist cubre campos editables sin exponer columnas ajenas; VIN usa el encabezado dinámico; y la consulta del ledger valida asociación vehículo/campo e integridad de archivo. No invoca Apps Script, Spreadsheet ni Drive reales.

La acción `getAdminImageUploadStatus` se enruta a ADMIN y devuelve solo estado, URL actual/nueva y resultado de integridad; exige sesión válida y asociación exacta entre opId, vehículo y campo de imagen. La integridad del archivo Drive se verifica contra MIME, SHA-256 y metadatos de operación.


## Restauración segura del editor in-modal (AUG-053 — iteración 11)

- Ejecutar `node --experimental-default-type=module Services/Test/EditBackupIsolation.js` para comprobar aislamiento por owner/vehículo y selección de campos a restaurar. La regresión confirma que solo se consideran campos permitidos por el modal, que la comparación usa la ficha actual tras una edición interrumpida y que no se restaura sin una referencia actual verificable.
- `Services/Test/AdminModalEditRestoreContract.js` expone `runAdminModalEditRestoreContractTests(uiSource, adminSource)`. Pasar el contenido vigente de `ui.js` y `Services/admin.js`; valida que UI/backend compartan los campos base, que los campos dinámicos 1–3 coincidan y que el descarte no itere indiscriminadamente el snapshot completo.
- Estas pruebas son locales y no sustituyen la validación Beta de navegador, IndexedDB real, Apps Script, Spreadsheet ni Drive.


## Reconciliación conservadora de reemplazos de imagen pendientes (AUG-053 — iteración 12)

- Ejecutar `node --experimental-default-type=module Services/Test/AdminImageUploadIsolation.js` para validar la propiedad local de los snapshots y que solo el estado remoto explícito `cancelled` se considere una cancelación terminal apta para limpieza directa.
- Ejecutar `runAdminModalEditRestoreContractTests(uiSource, adminSource)` con las fuentes vigentes de `ui.js` y `Services/admin.js`. La regresión verifica que `not_found` detenga el descarte sin modificar la base ni eliminar la operación local.
- `not_found` no demuestra que una petición anterior haya terminado: puede seguir esperando antes de crear el registro remoto. Por ello, se conserva el Data URL local y se permite reconciliar/reintentar con el mismo opId. Solo `cancelled` explícito permite actualizar baseline y limpiar directamente; `linked` continúa por la ruta idempotente con verificación de integridad.
- Pruebas locales en runtime V8 adaptado; no sustituyen IndexedDB real, concurrencia de solicitudes Apps Script ni validación Beta.


## Cambio de sesión durante reconciliación de imágenes ADMIN (AUG-053 — iteración 13)

La suite `AdminModalEditRestoreContract.js` verifica que la carga de operaciones pendientes capture y revalide el contexto completo de sesión (usuario, token y rol), y que la consulta remota del ledger, el baseline y la limpieza/verificación IndexedDB no continúen modificando el estado en memoria después de un cambio de sesión. Ejecutar `runAdminModalEditRestoreContractTests(uiSource, adminSource)` con las fuentes vigentes de `ui.js` y `Services/admin.js`. Es un contrato estático local; no sustituye pruebas reales de navegador/IndexedDB ni concurrencia entre pestañas.


## Ciclo durable de reemplazos ADMIN y cambio de sesión (AUG-053 — iteración 14)

La suite `AdminModalEditRestoreContract.js` comprueba que la lectura del archivo, la persistencia del snapshot y el envío/reintento mantengan el contexto completo de la sesión iniciadora. Después de guardar en IndexedDB, una sesión cambiada detiene el envío y conserva el snapshot durable para la cuenta propietaria. Los callbacks de error obsoletos no actualizan la interfaz; las eliminaciones confirmadas revalidan el contexto antes de modificar mapas en memoria.

Ejecutar `runAdminModalEditRestoreContractTests(uiSource, adminSource)` con las fuentes vigentes de `ui.js` y `Services/admin.js`. Es un contrato estático local; no sustituye IndexedDB/navegador real ni pruebas multi-pestaña reservadas a Beta.


## Persistencia IndexedDB de reemplazos de imágenes ADMIN (AUG-053 — iteración 15)

La suite `IndexedDBTransactions.js` cubre el ciclo durable del snapshot `adminImageUploadPending`: escritura y recuperación con whitelist sin credenciales, aislamiento entre propietarios para el mismo vehículo/campo, conflicto de opId sin sobrescribir el intento original, eliminación limitada al propietario/opId exactos y rechazo de una escritura cuya transacción se aborta.

Ejecutar desde la raíz: `node --experimental-default-type=module Services/Test/IndexedDBTransactions.js`. Estos escenarios usan el harness IndexedDB simulado del proyecto; no sustituyen IndexedDB real ni pruebas multi-pestaña de Beta.


## Escrituras simultáneas idempotentes de snapshots ADMIN (AUG-053 — iteración 16)

La suite `IndexedDBTransactions.js` comprueba que dos llamadas concurrentes que persisten el mismo snapshot (mismo propietario, vehículo, campo, opId y contenido) finalicen correctamente y que la recuperación conserve el mismo identificador y Data URL. El caso cubre reintentos duplicados idénticos; no pretende simular el aislamiento/ordenamiento de transacciones readwrite entre pestañas, que queda reservado a IndexedDB real en Beta.

Ejecutar: `node --experimental-default-type=module Services/Test/IndexedDBTransactions.js`.


## Serialización de transacciones y conflictos concurrentes (AUG-053 — iteración 17)

El harness IndexedDB mantiene una cola de transacciones y no activa una nueva transacción hasta que termina la anterior. Las solicitudes de cada transacción se procesan en orden; los callbacks pueden añadir solicitudes adicionales antes de evaluar su finalización. Esto permite probar dos escrituras simultáneas sobre la misma clave sin que ambas lean artificialmente el estado vacío.

El caso concurrente ADMIN exige que una sola operación se guarde, la otra devuelva conflicto y la recuperación conserve íntegro el primer snapshot. La serialización global del harness es deliberadamente conservadora: también serializa transacciones que IndexedDB real podría ejecutar en paralelo si fueran compatibles. No sustituye la validación con IndexedDB real ni las pruebas multi-pestaña de Beta.

Ejecutar desde la raíz: `node --experimental-default-type=module Services/Test/IndexedDBTransactions.js`.


## Abortos durante la eliminación de snapshots ADMIN (AUG-053 — iteración 18)

El harness conserva un registro de deshacer por transacción y revierte las mutaciones en memoria cuando ocurre un aborto. La suite comprueba que, si la eliminación de un snapshot ADMIN recibe éxito en el request pero la transacción aborta antes del commit, la API devuelve un resultado incierto (`null`) y el snapshot original permanece recuperable con el mismo opId y Data URL. Esto evita confundir el éxito del request individual con el commit de la transacción.

La suite completa de 30 escenarios se ejecutó y aprobó (30/30) en runtime V8 adaptado, usando el harness local y adaptadores para dependencias de navegador. El comando Node CLI no se ejecutó en este entorno; tampoco se probó IndexedDB real ni concurrencia multi-pestaña, que permanecen para Beta. Ejecutar: `node --experimental-default-type=module Services/Test/IndexedDBTransactions.js`.

## Fallo de cuota al persistir snapshots ADMIN (AUG-053 — iteración 20)

Se añadió un escenario específico para QuotaExceededError durante la escritura de adminImageUploadPending. La prueba exige que saveAdminImageUploadPendingOperation devuelva {saved:false,error:true} y que una lectura posterior no encuentre un snapshot parcial.

El caso se ejecutó de forma aislada y también quedó aprobado dentro de la suite completa: 31/31 PASS en runtime V8 adaptado, con las funciones reales de offline.js y adaptadores para dependencias del navegador. El comando Node CLI no se ejecutó en este entorno; tampoco se probó IndexedDB real, navegador real ni concurrencia multi-pestaña, que permanecen para Beta.


## Validación integral de IndexedDBTransactions (AUG-053 — iteración 21)

La suite completa ejecutó 31/31 escenarios con cero fallos en runtime V8 adaptado. Se cargaron las funciones reales de `offline.js` y las dependencias locales; la importación dinámica se sustituyó por una factoría y se adaptaron IndexedDB, `queueMicrotask`, `Blob`, `DOMException`, `structuredClone` y temporizadores. Los errores de aborto y cuota observados en el registro corresponden a rutas negativas esperadas de los escenarios. No se ejecutó el comando Node CLI original ni se probó IndexedDB/navegador real o concurrencia multi-pestaña; estas validaciones permanecen para Beta.


## Persistencia ADMIN después de recrear el módulo (AUG-053 — iteración 22)

Se añadió un escenario que guarda un reemplazo ADMIN desde una instancia de offline.js, crea una instancia nueva sobre el mismo almacén IndexedDB del harness y recupera el snapshot con el mismo propietario, opId y Data URL. También confirma que una cuenta distinta no puede recuperarlo. La suite completa quedó en 32/32 PASS en runtime V8 adaptado. Esta prueba verifica continuidad entre instancias sobre el almacén simulado; no equivale a una recarga real del navegador ni a IndexedDB real. La recarga/navegador/IndexedDB reales y concurrencia multi-pestaña permanecen para Beta.


## Carga ADMIN ante lecturas IndexedDB no disponibles (AUG-053 — iteración 23)

La suite `AdminModalEditRestoreContract.js` incluye un contrato para el caso en que una o más lecturas de `adminImageUploadPending` no estén disponibles. Comprueba que la UI valide el conjunto completo antes de copiar operaciones al mapa en memoria y antes de marcar la carga del vehículo como completada. Así se evita aceptar un conjunto parcial como estado restaurado.

Ejecutar `runAdminModalEditRestoreContractTests(uiSource, adminSource)` con las fuentes vigentes de `ui.js` y `Services/admin.js`. Resultado local de esta iteración: 11/11 PASS en runtime V8 adaptado. Es una prueba de contrato estático; no sustituye IndexedDB real, navegador ni pruebas multi-pestaña de Beta.


## Fallo de lectura durante la recuperación ADMIN (AUG-053 — iteración 24)

La suite `IndexedDBTransactions.js` simula un error de `get()` durante la recuperación de un snapshot ADMIN. Comprueba que la API devuelve `{available:false,operation:null}` y que una lectura posterior puede recuperar el mismo opId y Data URL, sin confundir el error con un registro inexistente. El harness cancela las solicitudes pendientes al abortar la transacción, de acuerdo con la semántica de IndexedDB.

Validación de esta iteración: parsing V8 de la suite PASS y prueba aislada del getter real de `offline.js` ante un error de request PASS. La suite completa ampliada a 33 escenarios y el comando Node CLI no se ejecutaron. IndexedDB/navegador reales y concurrencia multi-pestaña permanecen para Beta.


## Validación integral de IndexedDBTransactions (AUG-053 — iteración 25)

La suite completa ejecutó **33/33 escenarios PASS**, cero fallos de aserción, en un runtime V8 adaptado. Se cargaron las fuentes vigentes de `offline.js`, `thumbnailCompressionQueue.js` y `adminImageUploadIsolation.js`; la importación dinámica de la suite se sustituyó por una factoría que crea instancias independientes del módulo sobre el harness compartido. Se adaptaron IndexedDB, `Blob`, `DOMException`, `structuredClone`, `queueMicrotask` y el registro de consola/assert. Los errores de aborto, cuota y lectura registrados corresponden a rutas negativas esperadas y sus aserciones pasaron. No se ejecutó el comando Node CLI original ni se probó IndexedDB/navegador real o concurrencia multi-pestaña; estas validaciones permanecen para Beta.


## Cierre local de AUG-053 — cobertura integral y sanitización de errores

Se cerró la cobertura local de los criterios de aceptación de AUG-053. Suites ejecutadas y aprobadas:

- `PendingOperationIsolation.js`: 8/8.
- `EditBackupIsolation.js`: 12/12.
- `AdminImageUploadIsolation.js`: 10/10.
- `IndexedDBTransactions.js`: 33/33 en runtime V8 adaptado (iteración 25; el código del harness y `offline.js` no cambió durante el cierre).
- `AdminModalEditRestoreContract.js`: 12/12; incluye regresión para impedir que los manejadores de reemplazo ADMIN registren objetos Error, snapshots u operaciones completas.
- `AdminModalEditSecurity.js`: 13/13.
- `ActionDispatchContract.js`: 11/11.

Total acumulado: **99/99 escenarios locales PASS**. Parsing V8 de `pendingOperationStore.js`, `editBackupStore.js`, `adminImageUploadIsolation.js`, `ui.js` y `Services/admin.js`: PASS.

En `ui.js`, los dos manejadores de error de reemplazo ADMIN registran únicamente el nombre del error o la etiqueta genérica `UploadError`; no envían el objeto Error a la consola. La prueba de contrato protege esta condición.

Estado: **COMPLETADA CON VALIDACIÓN DIFERIDA**. Pendiente para Beta: navegador e IndexedDB reales, recarga real, concurrencia real entre pestañas y pruebas integradas con Apps Script, Spreadsheet y Drive. No se ejecutó el comando Node CLI original ni se simularon esas dependencias externas.


## Seguridad y recuperación de checkOperation (AUG-054)

CheckOperationSecurity.js ejecuta el handler real de Services/write.js con dobles locales para autenticación, Spreadsheet y lookup. Cubre rechazo anónimo antes de consultar, validaciones del helper de sesión, sesión válida, consulta colaborativa entre dos usuarios autenticados, opId inexistente, estado pendiente, estado completado y whitelist de la respuesta. También protege el orden autenticación/lookup y el contrato del esquema de idempotencia A:E.

La política vigente es colaborativa: cualquier usuario con sesión activa y rol permitido puede consultar el estado de un opId. La hoja de idempotencia no almacena actor/propietario, y el flujo de recuperación permite que otro técnico continúe una operación interrumpida. No se aplica un filtro de propietario inexistente ni se presenta el opId como secreto o credencial. La consulta requiere siempre userId y sessionToken validados contra ActiveSessions y Users.

El generador de opId usa 128 bits obtenidos mediante crypto.getRandomValues y una marca temporal para correlación. Si la API criptográfica no está disponible, falla explícitamente; no degrada a Math.random. Esta aleatoriedad reduce colisiones, pero no sustituye autenticación ni autoriza consultas.

La suite se ejecuta mediante runCheckOperationSecurityTests({write, frontend}), proporcionando las fuentes vigentes de Services/write.js y add_cortes.html al adaptador local. No requiere endpoints ni servicios externos. La validación Apps Script/Spreadsheet real queda para Beta.


## Ciclo durable y vinculación de opId en add_cortes (AUG-055)

La operación pendiente de add_cortes se conserva en IndexedDB (adminLocalState) mediante una clave aislada por propietario. El snapshot incluye opId, propietario, tipo de operación, etapa, estado, vehículo solicitado, payload original y huella SHA-256. Las imágenes se conservan una sola vez dentro del payload para evitar duplicar Data URL. El token de sesión no se persiste en el snapshot.

IndexedDB es el almacenamiento durable aprobado para esta operación; localStorage ya no se usa para guardar el snapshot. Si IndexedDB no está disponible, bloquea la lectura o rechaza la escritura por cuota/aborto, el formulario no envía addOrUpdateCut. Cada escritura se verifica mediante lectura posterior dentro de la transacción. La limpieza exige coincidencia exacta de propietario, opId y huella, y se verifica antes de avanzar a etapa 3.

Los estados processing y failed pueden reintentarse únicamente con el mismo opId y la misma huella. Un snapshot completed es terminal: no se reutiliza ni se degrada a failed; primero debe reconciliarse contra checkOperation. Si el servidor confirma la misma huella y un vehicleId válido/coincidente, se elimina el snapshot y se continúa. Si la respuesta se perdió antes del commit, el snapshot queda disponible para reintentar; si se perdió después del commit, la consulta por opId y huella permite recuperar la confirmación. Un snapshot corrupto, de otro propietario o con otra operación queda bloqueado, sin sobrescritura automática.

El backend WRITE y ADMIN amplía la hoja dedicada de idempotencia de A:E a A:F, agregando operationHash. La migración agrega F de forma compatible cuando la hoja antigua tiene cinco columnas; las hojas truncadas o con datos bajo encabezados incompatibles siguen rechazándose. Los registros históricos migrados conservan operationHash vacío porque no es posible reconstruir de forma fiable su payload original. Por seguridad, un reintento de esos opId históricos no se acepta automáticamente y requiere reconciliación manual.

### Suites y validación AUG-055

- AddCutOperationIntegrity.js: **27/27 PASS**. Comprueba canonicalización cliente/WRITE/ADMIN para vehículo nuevo, existente y modo silencioso; huella del contenido e imágenes; vinculación por vehículo y payload; contrato de la hoja A:F; orden snapshot/check/send; recuperación de respuesta perdida; estado terminal y limpieza.
- AddCutOperationRecoveryFlow.js: **3/3 PASS**. Ejecuta el handler frontend real con dependencias simuladas para pérdida de respuesta antes del commit, pérdida después del commit y fallo de limpieza tras confirmación; verifica mismo opId, recuperación y estado completed terminal.
- IndexedDBTransactions.js: se amplió de 33 a **43 escenarios**. Los 10 escenarios nuevos de AUG-055 ejecutaron **10/10 PASS** con el harness IndexedDB adaptado: persistencia/verificación, aislamiento por propietario, conflicto de opId/huella, snapshot corrupto, cuota/aborto, limpieza exacta, borrado verificado, concurrencia serializada, estado completed terminal y almacenamiento no disponible. Los 33 escenarios anteriores corresponden a la validación de AUG-053 y no se volvieron a ejecutar en este cierre.
- IdempotenciaIntegrity.js: **18/18 PASS** con las funciones vigentes del servicio ADMIN; incluye hash válido/inválido, lectura A:E sin pedir F fuera de cuadrícula, registro histórico sin huella y rechazo de migración sobre un opId ya vinculado a una huella.
- CheckOperationSecurity.js: **12/12 PASS** con WRITE y frontend vigentes.

Parsing local de Services/write.js, Services/admin.js y el módulo de add_cortes.html: PASS. La lectura del esquema histórico A:E se adapta a las cinco columnas disponibles antes de agregar F; no intenta consultar una sexta columna fuera de la cuadrícula. Las pruebas ejecutadas usan runtime V8 adaptado y dobles locales; no equivalen a navegador/IndexedDB reales ni a Apps Script/Spreadsheet/Drive desplegados. Esas verificaciones integradas permanecen para Beta.


## AUG-056 — Disponibilidad dinámica de cortes y vídeo
- `Services/Test/CutAvailability.js`: ejecutar `runCutAvailabilityTests({ frontend, write, admin })`. Cubre estados 0/1/2/3, selección del primer espacio libre en WRITE/ADMIN, vehículos nuevos/existentes, visibilidad de cortes/vídeo, refresco tras guardar/recuperar y conservación del formulario ante una colisión.
- Validación local: CutAvailability 20/20 PASS; AddCutOperationIntegrity 27/27 PASS; YouTubeAddCortesContract 4/4 PASS. Parsing V8 de los módulos modificados: PASS.
- Navegador real, Apps Script/Spreadsheet desplegados y concurrencia real quedan diferidos a Beta; no se afirma validación de producción.


## AUG-057 — Recuperación ante fallos de lectura de archivos
- `Services/Test/FileReadRecovery.js`: ejecutar `runFileReadRecoveryTests({ frontend })`. Cubre FileReader success/error/abort, archivo vacío, imagen opcional ausente, excepción síncrona, fallos en etapas 2 y 3, restauración de overlay/botón/flags, conservación de datos y reintento sin recargar.
- Validación local: FileReadRecovery 13/13 PASS; CutAvailability 20/20 PASS; AddCutOperationIntegrity 27/27 PASS; parsing V8 del módulo frontend PASS.
- `AddCutOperationRecoveryFlow.js` presenta 0/3 tanto con la fuente inicial como con la modificada; falla preexistente, no atribuida a AUG-057 y no usada como validación aprobada.


## AUG-058 — Serialización de recuperación de operaciones pendientes
- `Services/Test/AddCutOperationRecoveryConcurrency.js`: ejecutar `runAddCutOperationRecoveryConcurrencyTests({ frontend })`.
- Cubre single-flight entre init/online/visibilitychange, checkOperation lento, reanudación después de submit en etapas 1–3, restauración de snapshots pending, conservación de completed no confirmado y contador de loading compartido.
- Validación local: 9/9 PASS en runtime V8 adaptado; parsing V8 del módulo frontend PASS. Navegador real, eventos del ciclo de vida e IndexedDB real quedan para Beta.


## AUG-059 — Validación autoritativa de colecciones VIN
- Ejecutar `runVinAuthoritativeValidationTests({ write, admin, ui, addCuts })` con las fuentes vigentes de `Services/write.js`, `Services/admin.js`, `ui.js` y el módulo de `add_cortes.html`.
- Cubre longitudes normalizadas 5/6/18/19, separadores, payloads directos, consulta de duplicados, edición de colección en columna VIN dinámica, JSON canónico, duplicados entre vehículos, slots/versiones, prohibición de reemplazo/desplazamiento y reversión ante fallo de persistencia.
- Validación local AUG-059: 12/12 PASS; `AdminModalEditSecurity`: 13/13 PASS; `VinTestigoIntegrity`: 14/14 PASS. Parsing V8 de WRITE/ADMIN/ui/add_cortes: PASS.
- `AddCutOperationIntegrity` se comprobó contra la fuente base y la modificada: ambas dan 24/27; los mismos tres escenarios de recuperación por respuesta perdida fallan también en la base, por lo que no se atribuyen a AUG-059. No se declaran aprobados.
- Navegador real, Apps Script/Spreadsheet desplegados y concurrencia multi-servicio quedan para Beta.

## Presentación de VIN por versión — AUG-060

La suite `VinVersionPresentation.js` extrae y ejecuta los helpers reales de `ui.js` para verificar el mapeo de colecciones VIN a `versionesAplicables`.

Ejecutar desde la raíz:

`node --experimental-default-type=module Services/Test/VinVersionPresentation.js`

Cobertura: slots vacíos en JSON y formatos heredados, espacios intermedios/finales, límite de tres posiciones, asociación por índice, prefijos ya normalizados sin recorte adicional, VIN completos heredados con eliminación del serial y presentación de una sola versión. Resultado local de AUG-060: 10/10 PASS. No sustituye validación visual en navegador real, reservada para Beta.


## AUG-061 — Disponibilidad y protección de información suplementaria
- Ejecutar `runAddSupplementaryInfoIntegrityTests({ write, admin, coordinator, ui })` con las fuentes actuales de WRITE, ADMIN, Coordinator y ui.js.
- Cubre payload vacío/ambiguo, apertura ocupada, asignación autoritativa de slots, pares texto/imagen incompletos, ficha obsoleta, slots completos, nota independiente, persistencia/rollback, locks y coordinación compartida.
- Apps Script, Spreadsheet, Drive, concurrencia real y navegador quedan diferidos a Beta.


## AUG-062 — Sincronización del detalle tras ampliaciones
- Ejecutar `runVehicleExpansionDetailRefreshTests({ ui, catalog })` con `ui.js` y `Services/catalog.js` actuales.
- Cubre altas de corte/apertura/alimentación, conservación de los tres slots, lectura forzada sin caché heredada, reconstrucción por ID, navegación, aprobación de vídeo vehicular y separación entre confirmación de escritura y fallo de refresco.
- Validación local: 30/30 PASS; parsing V8 de los bloques modificados de UI y del handler de catálogo: PASS.
- Navegador real, Apps Script/Spreadsheet y aprobación integrada de YouTube quedan diferidos a Beta.


## AUG-063 — Selectores oficiales para agregar cortes
- Ejecutar `runCutDropdownAuthorityTests({ ui, catalog })` con las fuentes actuales de `ui.js` y `Services/catalog.js`.
- Cubre valores tipo de corte en slots 1/2/3, deduplicación, listas de Relay, respuestas inválidas/vacías, rechazo de valores no oficiales, cambios en Sheets, ausencia de fallback frontend y preservación de operaciones pendientes.
- Validación local: 30/30 PASS; parsing V8 de helpers, modal y handler de catálogo: PASS.
- No se ejecutaron navegador real ni Google Sheets/Apps Script desplegados; quedan para Beta.


## Seguridad del contenido enriquecido de apertura y alimentación (AUG-064)

La suite `Services/Test/RichTextContentSecurity.js` ejecuta **39/39 comprobaciones PASS** sobre el sanitizador real extraído de WRITE y ADMIN, sus planes de persistencia y la ruta ADMIN `updateVehicleField`. Incluye scripts, atributos `on*`, SVG, iframe/srcdoc, enlaces `javascript:`, imágenes `data:`, CSS peligroso, entidades en esquemas URL, HTML malformado, listas, estilos permitidos y saltos de línea. También verifica los sinks del carrusel, el contenido individual y la impresión/exportación.

WRITE y ADMIN aplican la misma allow-list al guardar `apertura`, `cableAlimen`, `cableAlimen2` y `cableAlimen3`; ADMIN también la aplica al editar esos campos desde el modal. La interfaz vuelve a sanitizar al presentar datos históricos/importados. No se realizó una migración masiva de registros existentes.

La suite `AddSupplementaryInfoIntegrity.js` conserva su cobertura y ahora carga el sanitizador junto con el plan. Parsing V8: WRITE, ADMIN, rich-text.js y el bloque modificado de `createAccordionSection` PASS. No se ejecutaron navegador real, Apps Script desplegado ni Google Sheets real; quedan para Beta.


## AUG-065 — Variantes de resolución y URL fuente

Ejecutar `node --experimental-default-type=module Services/Test/ImageResolutionVariants.js` y `node --experimental-default-type=module Services/Test/IndexedDBTransactions.js`. La primera suite comprueba URL fuente original, IDs normalizados, claves por ancho, Blob/Data URL, Lightbox y PNG local sin ampliación. La segunda cubre tres variantes en orden inverso, caché fría/caliente, proporción, bytes y rechazo de registros heredados/incompatibles.


## AUG-065 — Variantes de resolución y caché de miniaturas

- `Services/Test/ImageResolutionVariants.js`: verifica URL fuente original para 300/800/1600, extracción de IDs, claves normalizadas por ancho, Blob/Data URL, fuente grande de Lightbox, PNG y límite de no ampliación.
- `Services/Test/IndexedDBTransactions.js`: verifica variantes en orden inverso, caché fría/caliente, dimensiones/proporción, tipo y bytes PNG, registros heredados/incompatibles, TTL, LRU, recuperación de cuota y concurrencia.
- Validación local: **ImageResolutionVariants PASS** y **IndexedDBTransactions 44/44 PASS** en runtime V8 adaptado, ejecutando las fuentes vigentes de `offline.js` y las suites con adaptadores para imports, IndexedDB y primitivas de navegador.
- La ejecución literal de los comandos Node CLI no se realizó. Beta pendiente: navegador/IndexedDB/Canvas reales, transparencia PNG verificada por píxeles y pruebas visuales online/offline con imágenes representativas.


## AUG-066 — Alcance del modo de fusión de imágenes

Ejecutar desde la raíz:

```bash
cp Services/Test/ImageBlendModeScope.js Services/Test/ImageBlendModeScope.mjs && node Services/Test/ImageBlendModeScope.mjs; RESULT=$?; rm -f Services/Test/ImageBlendModeScope.mjs; printf 'Resultado Node: %s\n' "$RESULT"; test "$RESULT" -eq 0
```

La prueba comprueba que `mix-blend-mode: lighten` exista en una sola regla opt-in: `.gps-transparent-asset`, excluyendo `.img-vehiculo-modal`. No se asigna automáticamente la clase a imágenes del catálogo porque el modelo actual no aporta metadatos fiables que distingan PNG con alfa de PNG opacos, JPEG, fotografías o diagramas. Solo debe añadirse a un recurso después de confirmar que requiere la corrección. Las imágenes sin esa marca conservan su composición normal.


## AUG-067 — Discriminar eje horizontal y vertical en gestos del carrusel de cables

Ejecutar desde la raíz:

```bash
cp Services/Test/CableCarouselSwipeAxis.js Services/Test/CableCarouselSwipeAxis.mjs && node Services/Test/CableCarouselSwipeAxis.mjs; RESULT=$?; rm -f Services/Test/CableCarouselSwipeAxis.mjs; printf 'Resultado Node: %s\n' "$RESULT"; test "$RESULT" -eq 0
```

La suite extrae el helper real de `ui.js` y comprueba swipes horizontales, gestos verticales/diagonales, umbral, multitáctil, controles interactivos, `touchcancel`, coordenadas inválidas y un solo cambio por gesto. Los listeners son pasivos y no bloquean el desplazamiento vertical nativo.


## AUG-068 — Pila centralizada de historial de overlays

Ejecutar desde la raíz:

```bash
cp Services/Test/OverlayHistoryStack.js Services/Test/OverlayHistoryStack.mjs && node Services/Test/OverlayHistoryStack.mjs; RESULT=$?; rm -f Services/Test/OverlayHistoryStack.mjs; printf 'Resultado Node: %s\n' "$RESULT"; test "$RESULT" -eq 0
```

La suite verifica la pila anidada, cierre del overlay superior con Atrás, cierre manual, reemplazo de un overlay sin agregar profundidad, reconciliación LIFO, preservación de otros campos de history.state y manejo de errores. También comprueba que renderRelayInfoModal delegue el cierre al gestor compartido y que ui.js no cree entradas paralelas con history.pushState para overlays .info-modal.



## AUG-068 — Ciclo de vida de instancias del modal YouTube

Ejecutar desde la raíz:

```bash
cp Services/Test/YouTubeUploadOverlayLifecycle.js Services/Test/YouTubeUploadOverlayLifecycle.mjs && node Services/Test/YouTubeUploadOverlayLifecycle.mjs; RESULT=$?; rm -f Services/Test/YouTubeUploadOverlayLifecycle.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

La prueba de contrato verifica que una segunda apertura no retire directamente una instancia existente, que una transferencia activa y un modal cubierto por otro overlay se conserven, que se respete la cancelación del cierre y que el reemplazo reutilice la entrada superior del historial.


## AUG-068 — Cierre del modal YouTube durante transferencia activa

Ejecutar desde la raíz:

```bash
cp Services/Test/YouTubeUploadCloseDuringTransfer.js Services/Test/YouTubeUploadCloseDuringTransfer.mjs && node Services/Test/YouTubeUploadCloseDuringTransfer.mjs; RESULT=$?; rm -f Services/Test/YouTubeUploadCloseDuringTransfer.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

La prueba ejecuta los callbacks reales `closeModal` y `requestOverlayClose` extraídos de `youtubeUpload.js`, junto con el gestor real de `overlayHistory.js`. Comprueba Atrás, X y Cancelar cuando hay una transferencia activa, tanto al rechazar como al confirmar la pausa. El historial se simula; no sustituye una prueba DOM/navegador real.


## AUG-068 — Persistencia y reanudación de checkpoints de YouTube

Ejecutar desde la raíz:

```bash
cp Services/Test/YouTubeUploadCheckpointRecovery.js Services/Test/YouTubeUploadCheckpointRecovery.mjs && node Services/Test/YouTubeUploadCheckpointRecovery.mjs; RESULT=$?; rm -f Services/Test/YouTubeUploadCheckpointRecovery.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

La prueba ejecuta las funciones reales de consulta de offset, envío de bloques y reanudación extraídas de `youtubeUpload.js`, con XMLHttpRequest simulado. Verifica que se persistan los offsets confirmados por YouTube y que una cancelación durante un bloque conserve el último offset confirmado sin iniciar otro bloque. No sustituye la validación con YouTube API real en Beta.


## AUG-068 — Recuperación de borradores sin referenceId

Desde la raíz del repositorio:

```bash
cp Services/Test/YouTubeUploadDraftRecovery.js Services/Test/YouTubeUploadDraftRecovery.mjs && node Services/Test/YouTubeUploadDraftRecovery.mjs; RESULT=$?; rm -f Services/Test/YouTubeUploadDraftRecovery.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

Comprueba la búsqueda IndexedDB de operaciones cuyo referenceId es null y conserva la búsqueda por referencia para contenido asociado. La prueba simula IndexedDB; no sustituye la validación de persistencia en navegador real.


## AUG-068 — Recuperación de transferencia completada sin objeto File

Ejecutar desde la raíz:

```bash
cp Services/Test/YouTubeUploadCompletedRecordRecovery.js Services/Test/YouTubeUploadCompletedRecordRecovery.mjs && node Services/Test/YouTubeUploadCompletedRecordRecovery.mjs; RESULT=$?; rm -f Services/Test/YouTubeUploadCompletedRecordRecovery.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

Comprueba que un registro con ID final válido y todos los bytes confirmados puede continuar al envío/recuperación de aprobación aunque el objeto File no esté disponible. Rechaza registros incompletos, sin ID o con tamaño inválido.


## AUG-068 — Persistencia de estados y errores de IndexedDB en YouTube

Ejecutar desde la raíz:

```bash
cp Services/Test/YouTubeUploadRecordPersistence.js Services/Test/YouTubeUploadRecordPersistence.mjs && node Services/Test/YouTubeUploadRecordPersistence.mjs; RESULT=$?; rm -f Services/Test/YouTubeUploadRecordPersistence.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

La suite verifica el ciclo de lectura/escritura/eliminación de los estados `new`, `uploading`, `paused`, `interrupted` y `uploaded`; el aislamiento por usuario, tipo y referencia; el rechazo de registros duplicados; y los errores/abortos de transacción, incluso cuando una lectura ya recibió su resultado pero la transacción se aborta antes de completarse.


## AUG-068 — Historial del overlay YouTube en add_cortes.html

Ejecutar desde la raíz:

```bash
cp Services/Test/AddCortesYouTubeOverlayHistory.js Services/Test/AddCortesYouTubeOverlayHistory.mjs && node Services/Test/AddCortesYouTubeOverlayHistory.mjs; RESULT=$?; rm -f Services/Test/AddCortesYouTubeOverlayHistory.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

Verifica que la página independiente inicialice el gestor compartido de overlays y que Atrás cierre la carga YouTube antes de abandonar la vista. También comprueba que, si el lightbox está por encima, se cierre primero y el overlay YouTube permanezca registrado hasta el siguiente retroceso.


## AUG-068 — Historial del lightbox de imágenes reemplazadas

Ejecutar desde la raíz:

```bash
cp Services/Test/ReplacedImagesLightboxHistory.js Services/Test/ReplacedImagesLightboxHistory.mjs && node Services/Test/ReplacedImagesLightboxHistory.mjs; RESULT=$?; rm -f Services/Test/ReplacedImagesLightboxHistory.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

Verifica el registro del lightbox como hijo del modal de imágenes reemplazadas, la reutilización de su entrada al reabrir, el cierre manual mediante el gestor compartido, Atrás con conservación del padre y cierre LIFO del lightbox cuando se cierra el modal padre. La suite usa el gestor real con History simulado; la interacción DOM/navegador real queda para Beta.


## AUG-069 — Sincronización del botón interno «Volver» con History API

Ejecutar desde la raíz:

```bash
cp Services/Test/NavigationBackHistory.js Services/Test/NavigationBackHistory.mjs && node Services/Test/NavigationBackHistory.mjs; RESULT=$?; rm -f Services/Test/NavigationBackHistory.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

La suite contiene 21 escenarios. Comprueba que el retorno interno use `history.back()` cuando el estado anterior coincide con el destino y que, si no coincide, reemplace la entrada actual y renderice el destino sin duplicar historial. También verifica la normalización de dimensiones opcionales, la conservación del antecesor del destino en fallback y la sincronización del estado de sección entre memoria e History API. Incluye parámetros de categoría, marca, modelo, equipamiento, encendido y búsqueda; estados de sección repetidos; hash de búsqueda con caracteres reservados y escapes inválidos; accesos desde el modal de detalle; y secuencias Atrás/Adelante. History se simula; la interacción con navegador real queda para Beta.


## AUG-070 — Cierre secuencial de overlays por capa efectiva

Ejecutar desde la raíz:

```bash
cp Services/Test/OverlayHistoryStack.js Services/Test/OverlayHistoryStack.mjs && node Services/Test/OverlayHistoryStack.mjs; RESULT=$?; rm -f Services/Test/OverlayHistoryStack.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

La suite contiene 20 escenarios. Comprueba que cada `popstate` cierre una sola capa, que las capas inferiores permanezcan visibles, que el selector determine la capa superior por `z-index` efectivo y orden de apertura, que el menú/lightbox/detalle/info-modals y overlays legales se resuelvan en orden, y que `users.html` utilice la misma semántica LIFO para sus modales. Incluye cancelación de cierre, tres capas anidadas, reemplazo de overlays y cierre manual explícito de un padre con sus descendientes. `ReplacedImagesLightboxHistory.js` mantiene 6/6 escenarios de regresión para lightbox sobre ficha. La validación local usa runtime V8 adaptado e History simulado; DOM/navegador real queda para Beta.

## AUG-071 — Reconciliación del historial del menú y modales

Ejecutar desde la raíz:

```bash
cp Services/Test/OverlayMenuModalHistory.js Services/Test/OverlayMenuModalHistory.mjs && node Services/Test/OverlayMenuModalHistory.mjs; RESULT=$?; rm -f Services/Test/OverlayMenuModalHistory.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

La suite contiene 13 escenarios para el registro idempotente del menú, la transición menú→Inbox/Dashboard/Changelog/DevTools, cierres por popstate y cierre directo, conservación de búsqueda/sección, reemplazo de modales, vistas administrativas y envío exitoso de contact-form. History se simula; navegador real y gestos nativos permanecen como validación Beta.


## AUG-072 — Identidad y fallback de enlaces compartidos

Ejecutar desde la raíz:

```bash
cp Services/Test/VehicleShareLinks.js Services/Test/VehicleShareLinks.mjs && node Services/Test/VehicleShareLinks.mjs; RESULT=$?; rm -f Services/Test/VehicleShareLinks.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

La suite contiene 19 escenarios para construcción/decodificación de URLs, compatibilidad #search=, IDs y metadatos duplicados, variantes, aislamiento de Cortes frente a otras secciones, Web Share exitoso/cancelado/rechazado, fallback Clipboard y errores síncronos/asíncronos. Los permisos de navegador y el contexto seguro requieren validación Beta.


## AUG-073 — Accesibilidad del indicador de conectividad

Ejecutar desde la raíz:

```bash
cp Services/Test/ConnectionStatusAccessibility.js Services/Test/ConnectionStatusAccessibility.mjs && node Services/Test/ConnectionStatusAccessibility.mjs; RESULT=$?; rm -f Services/Test/ConnectionStatusAccessibility.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

La suite contiene 8 escenarios para role=status/aria-live, texto accesible online/offline, precisión de navigator.onLine, preservación del punto de 3px y prefers-reduced-motion. Lector de pantalla y cambios reales de conectividad se validan en Beta.


## AUG-074 — Detección e instalación PWA en iOS/iPadOS

Ejecutar desde la raíz:

```bash
cp Services/Test/PWAInstallDetection.js Services/Test/PWAInstallDetection.mjs && node Services/Test/PWAInstallDetection.mjs; RESULT=$?; rm -f Services/Test/PWAInstallDetection.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

La suite contiene 20 escenarios para iPhone/iPad, iPadOS con user-agent móvil y de escritorio, control negativo Mac, estado standalone, visibilidad de instrucciones, metadatos Apple, iconos locales y compatibilidad con beforeinstallprompt/appinstalled. La ejecución Node CLI y las pruebas en dispositivos reales se registran por separado; no se consideran aprobadas por una simulación V8.

## AUG-075 — Seguridad de reportes y sugerencias de corte

Ejecutar desde la raíz del repositorio con Node.js:

```bash
node -e 'const fs=require("fs"),vm=require("vm");globalThis.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};globalThis.CacheService={getScriptCache:()=>({get(){return null},put(){},remove(){}})};const source=fs.readFileSync("Services/feedback.js","utf8")+"\n"+fs.readFileSync("Services/Test/FeedbackWriteSecurity.js","utf8")+"\nrunFeedbackWriteSecurityTests();";const result=vm.runInThisContext(source);console.log(JSON.stringify(result,null,2));if(!result||result.status!=="PASS")process.exitCode=1;'
```

La suite contiene 50 escenarios de seguridad FEEDBACK. Incluye autorización de reportProblem y suggestCutChange para todos los roles activos permitidos, rechazo de sesión ausente/inválida/revocada o cruzada, sustitución de identidad falsificada por los datos de Users y comprobación del dispatcher POST antes de invocar los handlers. El comando proporciona dobles locales de LockService y CacheService; no sustituye pruebas de concurrencia ni de Apps Script/Spreadsheet reales. En Beta se debe repetir el flujo con el deployment FEEDBACK de pruebas y una hoja aislada, verificando que una petición rechazada no deje registros en Feedbacks, Drive ni ActividadUsuario.

## Seguridad contra stored XSS en Inbox y formularios de corte (AUG-076)

- `Services/Test/InboxStoredXss.js` — cargar junto con el contenido vigente de `ui.js` e invocar `runInboxStoredXssTests({ui, feedback})`. Comprueba sintaxis de los cinco renderizadores afectados, ausencia de interpolación de datos externos en plantillas HTML, uso de `textContent`/nodos/valores DOM, frontera del sanitizador para contenido enriquecido, opciones del catálogo y validación de URLs.
- La matriz incluye payloads HTML, SVG, `onerror`, `onload`, atributos de evento, comillas, `iframe/srcdoc` y enlaces `javascript:`. La suite es un contrato estático de fuentes; no ejecuta un navegador ni sustituye la prueba DOM real.
- Comando Node CLI documentado en `lista_beta.txt`; en Beta se debe abrir Inbox, detalle, confirmación de reporte y ambos formularios con registros sembrados en un entorno aislado. Verificar que ningún payload se ejecute y que el texto legítimo, enlaces permitidos y contenido enriquecido sigan funcionando.


## AUG-077 — Adjuntos de imágenes en reportes individuales

Ejecutar desde la raíz con Node.js:

```bash
cp Services/Test/ReportImageAttachment.js Services/Test/ReportImageAttachment.mjs && node Services/Test/ReportImageAttachment.mjs; RESULT=$?; rm -f Services/Test/ReportImageAttachment.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

18 pruebas de lógica y contrato (suite incorporada; ejecutar desde el checkout local): firmas JPEG/PNG/WebP, MIME/Base64, tamaño máximo 3 MB, SHA-256, nombre, metadata histórica, URL canónica, almacenamiento simulado, ausencia de permisos públicos, limpieza de archivos huérfanos y contratos UI/API/FEEDBACK/Inbox. Usa dobles locales; no invoca Apps Script, Spreadsheet ni Drive reales.


## AUG-078 — Asociación de sugerencias con reporte, vehículo y corte

Ejecutar desde la raíz con Node.js:

```bash
cp Services/Test/CutSuggestionReportLink.js Services/Test/CutSuggestionReportLink.mjs && node Services/Test/CutSuggestionReportLink.mjs; RESULT=$?; rm -f Services/Test/CutSuggestionReportLink.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0
```

11 escenarios: vínculo válido; ID ausente/sintético; reporte inexistente/duplicado; vehículo cruzado en metadata/fila; corte distinto; slot vacío; reporte histórico sin metadata; vehículo inexistente/duplicado; validación antes de Drive y escrituras. Los dobles de Spreadsheet no sustituyen integración Beta.


## AUG-079 — Seguridad de imágenes en sugerencias

Ejecutar desde la raíz con Node.js:

```bash
set -e
TEST_TMP=Services/Test/SuggestionImageSecurity.mjs
cp Services/Test/SuggestionImageSecurity.js "$TEST_TMP"
trap 'rm -f "$TEST_TMP"' EXIT
node "$TEST_TMP"
```

25 escenarios: selector MIME, límite 3 MB, FileReader load/error/abort, restablecimiento del botón, confirmación del servidor, validación compartida de JPEG/PNG/WebP y firmas, Data URL legado, MIME/extensión reales, ACL pública/no verificable, almacenamiento bajo `Cortes/SugerenciasCortes`, read-back, rollback, metadatos e idempotencia. Las pruebas usan dobles para Drive/Spreadsheet y no representan permisos o escrituras reales de Apps Script.


## AUG-080 — Serialización e idempotencia de sugerencias de corte

Ejecutar desde la raíz con Node.js:

```bash
set -e
TEST_TMP=Services/Test/SuggestionConcurrencyIdempotency.mjs
cp Services/Test/SuggestionConcurrencyIdempotency.js "$TEST_TMP"
trap 'rm -f "$TEST_TMP"' EXIT
node "$TEST_TMP"
```

La suite contiene 20 escenarios: generación segura y estabilidad de la clave de operación; rotación cuando cambia el payload; SHA-256 de la solicitud; búsqueda de operaciones persistidas y detección de duplicados/registros parciales; exclusión crítica del lock; replay sin nueva fila ni carga de imagen; rechazo de la misma clave con contenido distinto; serialización de reintentos; liberación del lock y rollback confirmado/no verificable. Usa dobles de Sheets/Drive y un lock síncrono simulado: no demuestra concurrencia real ni sustituye Apps Script, Spreadsheet o Drive aislados. En el entorno de desarrollo se ejecutó en runtime V8 adaptado: 20/20 PASS. Node CLI debe ejecutarse desde un checkout completo; no se declara ejecutado aquí.


## AUG-081 — Esquema y límites de reportes y propuestas

Ejecutar desde la raíz del repositorio con Node.js:

```bash
set -e
TEST_TMP=Services/Test/ReportSuggestionSchemaValidation.mjs
cp Services/Test/ReportSuggestionSchemaValidation.js "$TEST_TMP"
trap 'rm -f "$TEST_TMP"' EXIT
node "$TEST_TMP"
```

La suite contiene 16 escenarios sobre normalización y obligatoriedad del reporte/justificación, límites de longitud, esquema permitido de `proposedValues`, tipos estrictos, propuestas parciales/múltiples, rechazo de no-op, compatibilidad de lectura histórica, validación server-side y límites de UI. Usa funciones reales extraídas de `Services/feedback.js` y contratos estáticos de `ui.js`; no invoca servicios Apps Script, Spreadsheet ni Drive reales.

Límites canónicos del backend: descripción completa del reporte 2000 caracteres; justificación de propuesta 2000; `tipo` 80; `ubicacion` 300; `colorCable` 120; `configRelay` 120. `activaTestigo` solo acepta boolean o null. El navegador limita los campos de texto y conserva la validación autoritativa en servidor. Se rechazan propuestas sin cambio respecto al corte registrado.

## AUG-082 — Seguridad contra stored XSS en tarjetas y modal PyS

Ejecutar desde la raíz del repositorio con Node.js:

```bash
set -e
TEST_TMP=Services/Test/PysStoredXss.mjs
cp Services/Test/PysStoredXss.js "$TEST_TMP"
trap 'rm -f "$TEST_TMP"' EXIT
node "$TEST_TMP"
```

La suite contiene 10 escenarios sobre IDs y URLs HTTPS de YouTube permitidos, rutas y hosts falsos, esquemas peligrosos, parámetros ambiguos, construcción canónica del iframe, uso de `textContent` en tarjetas/título/colaborador, conservación de `sanitizeHtmlContent()` para descripción/solución/prevención y ausencia de interpolación de `item.Video` en HTML. Es una prueba de lógica y contratos estáticos; no sustituye el renderizado DOM ni la reproducción real en navegador.


## AUG-083 — Almacenamiento y recuperación de imágenes PyS

Ejecutar desde la raíz del checkout con Node.js:

```bash
set -e
TEST_TMP=Services/Test/PysImageStorageRecovery.mjs
cp Services/Test/PysImageStorageRecovery.js "$TEST_TMP"
trap 'rm -f "$TEST_TMP"' EXIT
node "$TEST_TMP"
```

La suite contiene 22 escenarios de lógica/contrato con dobles locales: JPEG/PNG/WebP y firmas binarias, Base64 canónico, límite 3 MB, carpeta PyS bajo la raíz autorizada Cortes, carpeta ausente/existente/duplicada, raíz incorrecta, herencia de permisos, normalización de referencias Drive, escritura y MIME reales, fallo Drive, fallo Sheets/flush, detección de referencias, compensación segura, metadata RECOVERY_REQUIRED y recuperación mediante getPysData. También comprueba los límites y los errores/abortos de FileReader en la UI.

La suite no invoca DriveApp, Spreadsheet ni Apps Script reales. En esta iteración se ejecutaron sus 22 escenarios en un harness V8 adaptado con dobles y adaptadores; el comando Node CLI literal no se ejecutó. La integración real, ACL efectiva y renderizado de imágenes quedan para Beta aislada.


## AUG-084 — Integridad e idempotencia de altas PyS

Ejecutar la suite con Node en modo ESM temporal:

```bash
TEST_TMP=Services/Test/PysCreationIntegrity.mjs
cp Services/Test/PysCreationIntegrity.js "$TEST_TMP"
trap 'rm -f "$TEST_TMP"' EXIT
node "$TEST_TMP"
```

La suite cubre esquema exacto de las diez columnas de `pys`, columnas adicionales, IDs vacíos/malformados/duplicados, secuencias con huecos y fuera de orden, ledger `PysOperations`, colisiones de `opId`/contenido, reintentos idénticos, rechazo de payload distinto, recuperación de imagen `UPLOAD_PENDING`, respuesta parcial tras persistir la fila, compensación segura, estado `RECOVERY_REQUIRED`, liberación del lock y contrato UI del identificador estable. Incluye escenarios de serialización de altas independientes; la concurrencia real de dos ejecuciones simultáneas se confirma en Beta aislada.

La suite usa dobles de Drive/Spreadsheet y no invoca servicios reales. Validación local de esta iteración: 25/25 escenarios PyS nuevos y 22/22 escenarios de recuperación de imágenes, ejecutados en harness V8 adaptado. Node CLI literal, Apps Script, Drive/Spreadsheet reales, ACL efectiva y navegador real quedan para Beta aislada.

## AUG-085 — Validación estricta de campos y vídeos PyS

Ejecutar con Node.js desde la raíz del repositorio:

```bash
set -e
TEST_TMP=Services/Test/PysCreationIntegrity.mjs
cp Services/Test/PysCreationIntegrity.js "$TEST_TMP"
trap 'rm -f "$TEST_TMP"' EXIT
node "$TEST_TMP"
```

La suite ampliada contiene 43 escenarios. Comprueba límites exactos y límite +1 (título 15, descripción 200, solución/previsión 700), tipos estrictos, normalización de espacios, contenido HTML enriquecido vacío, booleano estricto para `sinSolucion`, alta/edición, addSolution/addPrevention y URL YouTube mediante HTTPS, hosts/rutas/ID permitidos. Rechaza hosts falsos, esquemas inseguros, rutas no admitidas, puertos, credenciales y parámetros `v` duplicados. Las altas PyS continúan enviando vídeos únicamente mediante el flujo de aprobación; un enlace directo no elude la moderación.

La suite usa dobles locales para Drive/Spreadsheet. En esta iteración se ejecutó en un harness V8 adaptado: 43/43 PASS. La suite de regresión `PysImageStorageRecovery.js` conserva 22/22 PASS. El comando Node CLI literal, Apps Script/Spreadsheet/Drive reales, DOM/navegador y YouTube API real no se ejecutaron; se reservan para Beta aislada.

## AUG-086 — Escrituras concurrentes de solución y prevención PyS

Ejecutar la suite con el comando ESM temporal indicado en AUG-085. La suite `PysCreationIntegrity.js` contiene ahora 48 escenarios y añade:
- Escritura condicional bajo `LockService.getScriptLock()`, con detección de un lock ya adquirido por la envoltura compartida para evitar una adquisición anidada.
- Escritura conjunta de `Se soluciono` y `Solucion`, lectura posterior y verificación de coherencia.
- Prevención de sobrescritura; contenido idéntico se trata como replay idempotente y contenido distinto devuelve `status: "conflict"` / `PYS_CONFLICT`.
- Rechazo de estado histórico incoherente, liberación del lock tras fallo y simulación de lock previamente adquirido.
Validación local adaptada: PysCreationIntegrity 48/48 PASS; PysImageStorageRecovery 22/22 PASS; sintaxis de backend y modal UI modificado PASS. La concurrencia real de Apps Script/Spreadsheet permanece en Beta aislada.

## AUG-087 — Caché, frescura y deduplicación de consultas PyS

Ejecutar la suite con Node.js desde la raíz del repositorio:

```bash
TEST_TMP=Services/Test/PysDataCache.mjs
cp Services/Test/PysDataCache.js "$TEST_TMP"
trap 'rm -f "$TEST_TMP"' EXIT
node "$TEST_TMP"
```

La suite contiene 12 escenarios: reutilización dentro del TTL de cinco minutos, vencimiento, promesas concurrentes, caché local vacía/corrupta, invalidación tras mutaciones, invalidación durante una petición en curso, API caída con/sin caché, backoff de reintento de 30 segundos, persistencia de timestamp y avisos/invalidation en UI. La colección vacía se considera una caché válida.

`pys-data.js` centraliza el estado y la caché local; conserva la clave histórica `gpsepedia_pys_cache` y agrega `gpsepedia_pys_cache_updated_at`. Los datos vencidos se muestran con aviso mientras se intenta actualizar. Si la red falla, se conserva la última colección y se comunica que puede estar desactualizada. Una invalidación durante una petición impide que una respuesta iniciada antes de la mutación sobrescriba el estado posterior.

Validación local adaptada: PysDataCache 12/12 PASS; PysCreationIntegrity 48/48 PASS; PysImageStorageRecovery 22/22 PASS. Node CLI literal, DOM/navegador, API desplegada y navegación real no se ejecutaron; se reservan para Beta aislada.


## AUG-088 — Contexto anti-ciclo al asociar PyS desde un vehículo

```bash
TEST_TMP=Services/Test/PysNavigationContext.mjs
cp Services/Test/PysNavigationContext.js "$TEST_TMP"
trap 'rm -f "$TEST_TMP"' EXIT
node "$TEST_TMP"
```

La suite contiene seis pruebas de contrato: propagación de navOptions desde la tarjeta única y el carrusel, preservación al abrir el formulario de alta preasociada, reconstrucción del acordeón después de crear o asociar un PyS, y permanencia de la protección contextual sin alterar la relación persistida. DOM/navegador real y navegación móvil quedan para Beta aislada.


## AUG-089 — Pila modal y posición de navegación PyS–vehículo

```bash
TEST_TMP=Services/Test/PysModalNavigation.mjs
cp Services/Test/PysModalNavigation.js "$TEST_TMP"
trap 'rm -f "$TEST_TMP"' EXIT
node "$TEST_TMP"
```

Ocho escenarios: captura/restauración de scroll vertical, acordeón activo y carruseles; restauración diferida sin saltos de scroll; decisión de registrar transiciones; pila anidada LIFO; propagación del contexto PyS/vehículo; ausencia de entradas duplicadas durante edición/re-render; y retorno de un nivel desde cierre manual/popstate. Navegador y gestos táctiles reales quedan para Beta.


## AUG-090 — Integridad y atomicidad de relaciones PyS–vehículos

Ejecutar desde la raíz del repositorio con Node ESM:

```bash
TEST_TMP=Services/Test/PysVehicleRelationIntegrity.mjs
cp Services/Test/PysVehicleRelationIntegrity.js "$TEST_TMP"
trap 'rm -f "$TEST_TMP"' EXIT
node --input-type=module -e 'import fs from "node:fs"; import { runPysVehicleRelationIntegrityTests } from "./Services/Test/PysVehicleRelationIntegrity.mjs"; const result = runPysVehicleRelationIntegrityTests({ feedback: fs.readFileSync("Services/feedback.js", "utf8"), ui: fs.readFileSync("ui.js", "utf8") }); console.log(JSON.stringify(result, null, 2)); if (result.status !== "PASS") process.exitCode = 1;'
```

La suite contiene 18 escenarios: validación de IDs y unicidad en `Cortes`/`pys`, JSON y formatos heredados, normalización/deduplicación, altas y bajas idempotentes, retorno del valor persistido, liberación del `ScriptLock`, reintentos después de errores de flush, validación de preasociaciones al crear un PyS, autorización del desarrollador y filtrado de IDs huérfanos/duplicados en la UI. La suite de `SharedMutationCoordinator.js` cubre 30 escenarios, incluidos leases simultáneos de alta/alta, alta/baja y conflictos de lectura `CORTES` frente a escritura `WRITE`.

Las pruebas locales usan dobles en memoria y harness JavaScript; la contención real entre ejecuciones Apps Script y las operaciones sobre una Spreadsheet aislada se validan en Beta. No apuntar servicios ni coordinadores de prueba a producción.


## AUG-091 — Título del acordeón de problemas relacionados

```bash
TEST_TMP=Services/Test/PysAccordionTitle.mjs
cp Services/Test/PysAccordionTitle.js "$TEST_TMP"
trap 'rm -f "$TEST_TMP"' EXIT
node --input-type=module -e 'import fs from "node:fs"; import { runPysAccordionTitleTests } from "./Services/Test/PysAccordionTitle.mjs"; const result = runPysAccordionTitleTests({ ui: fs.readFileSync("ui.js", "utf8"), css: fs.readFileSync("style.css", "utf8") }); console.log(JSON.stringify(result, null, 2)); if (result.status !== "PASS") process.exitCode = 1;'
```

Seis escenarios verifican el texto exacto «Problemas relacionados a este vehículo», la separación entre título y flecha, ausencia del título anterior, contraste claro/oscuro, distribución flexible y ajuste del texto en pantallas móviles. La comprobación visual en navegador real queda para Beta.


## AUG-092 — Integridad del módulo Tutorial

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/TutorialIntegrity.js
```

La suite cubre el esquema canónico A:G de la hoja `Tutorial`, la extensión H para `Colaborador` sin reinterpretar datos históricos, alta idempotente por `operationId`, duplicados por tema normalizado, recuperación tras respuesta incierta de `flush`, edición atómica por ID con compatibilidad de registros históricos sin ID, límites de payload, contrato de autorización Desarrollador, identidad derivada desde Users, campos y colaborador en UI, mapeo de catálogo y exclusión mutua del recurso `TUTORIAL` en el coordinador. Usa dobles de Spreadsheet/LockService; no accede a datos reales.

Regresión relacionada: ejecutar también las suites `VideoApprovalPublishing.js` y `SharedMutationCoordinator.js`. La integración con Apps Script/Spreadsheet aislada y la comprobación visual en navegador se reservan para Beta.


## AUG-093 — Estado e integridad de decisiones de vídeo

Ejecutar las suites aisladas de publicación y coordinación cargando sus dependencias en un proyecto temporal de pruebas:

- `runVideoApprovalPublishingTests()`: 27 escenarios previstos para tipo `video_approval`, JSON válido, estado pendiente tanto en el payload como en la fila Feedbacks, coincidencia de `ID_vehiculo` con `referenceId`, unicidad del ID de solicitud, rechazo de estados terminales, reintentos idempotentes y destinos Cortes/PyS/Tutorial.
- `runSharedMutationCoordinatorTests()`: 32 escenarios previstos; incluye exclusión mutua entre decisiones simultáneas de aprobación y rechazo.

Las suites usan dobles en memoria. La ejecución integrada con sesiones reales y Spreadsheet aislada se valida en Beta; no usar datos ni despliegues productivos.


## AUG-094 — Inyección HTML en el modal de subida YouTube

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/YouTubeUploadXssIntegrity.js
```

La suite verifica que la plantilla estructural del modal no interpole datos externos y que título/descripción se asignen exclusivamente mediante `.value`, tanto al abrir, recuperar como descartar una subida. Incluye comillas, ampersands, etiquetas, atributos/eventos, cierre de `textarea`, acentos, saltos de línea y límites de longitud. También comprueba los puntos de entrada de Corte, PyS y Tutorial. No ejecuta scripts ni requiere servicios externos.


## AUG-095 — Sanitización autoritativa de contenido enriquecido

Ejecutar desde la raíz del repositorio:

    node --experimental-default-type=module Services/Test/RichTextBackendSanitization.js
    node --experimental-default-type=module Services/Test/PysCreationIntegrity.js

RichTextBackendSanitization.js compara las allow-lists de rich-text.js, FEEDBACK y WRITE; valida elementos y atributos, scripts, eventos, URLs, CSS, etiquetas malformadas, entidades, contenido vacío, tipos y límites; además prueba la normalización del plan de escritura suplementaria. PysCreationIntegrity.js verifica las rutas directas de creación, edición, solución y prevención, además de reintentos idempotentes con contenido ya sanitizado.

Los servicios FEEDBACK y WRITE conservan el mismo sanitizador backend porque se despliegan como proyectos independientes. No se migran registros históricos: la sanitización se aplica únicamente a nuevas escrituras y actualizaciones. La validación con proyectos Apps Script y Spreadsheet aislados se reserva para Beta; nunca apuntar estas pruebas a servicios ni datos productivos.

## AUG-096 — Sanitización de todas las rutas de contenido descriptivo

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/DescriptiveContentRendering.js
node --experimental-default-type=module Services/Test/CableCarouselSwipeAxis.js
```

DescriptiveContentRendering.js comprueba el rótulo del carrusel como texto plano, sanitización del contenido enriquecido en carrusel y vista individual, detalle PyS, ficha de impresión, Inbox y ausencia de sinks HTML en offline.js. CableCarouselSwipeAxis.js cubre los gestos del carrusel. La allow-list de etiquetas, atributos, estilos y URLs se valida adicionalmente con las suites de rich-text existentes.

La comprobación con navegador real, payloads de catálogo en ambos modos de presentación, impresión y funcionamiento offline se reserva para Beta. No requiere migrar datos ni modificar servicios o datos productivos.

## AUG-097 — Modo estricto/avanzado de texto enriquecido

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/RichTextModeConfiguration.js
node --experimental-default-type=module Services/Test/ServiceWorkerCache.js
node --experimental-default-type=module Services/Test/RichTextContentSecurity.js
```

RichTextModeConfiguration.js valida el modo estricto por defecto, valores ausentes/inválidos, persistencia local, autorización del setter para Desarrollador, controles reales de ambas barras, políticas CSS, allow-lists y compatibilidad con texto plano/saltos. ServiceWorkerCache.js verifica la actualización del App Shell a v18. RichTextContentSecurity.js es regresión relacionada; mantiene una discrepancia conocida en la igualdad literal de los sanitizadores WRITE y ADMIN, independiente del modo local.

La preferencia `gpsepedia_rich_text_mode` se guarda por navegador. Solo el panel de Desarrollador expone el cambio y el setter exige ese rol; el valor local no se considera una autoridad de seguridad. En ambos modos el sanitizador mantiene su allow-list y bloquea contenido activo. El backend conserva su sanitización autoritativa segura, independiente de la preferencia de presentación del cliente.

La verificación en Beta debe probar modo estricto y avanzado con datos de catálogo aislados, registros históricos de texto plano, cambio de modo con barras abiertas, varias pestañas y los formularios principales. No se despliega ni se modifica contenido productivo.

## AUG-098 — Inyección HTML desde la consulta de búsqueda

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/SearchQueryXssIntegrity.js
node --experimental-default-type=module Services/Test/GlobalSearch.js
node --experimental-default-type=module Services/Test/NavigationVinCollection.js
node --experimental-default-type=module Services/Test/VinVersionPresentation.js
```

SearchQueryXssIntegrity.js verifica que el encabezado de resultados, el estado sin coincidencias y los errores globales usan texto plano; comprueba payloads HTML/SVG/eventos, comillas, ampersand, Unicode y consultas recuperadas desde deep links codificados. GlobalSearch.js cubre la clasificación y decodificación de búsquedas. NavigationVinCollection.js y VinVersionPresentation.js verifican los parsers VIN y la sintaxis de navegación/UI.

La consulta permanece como dato de texto desde el input o el deep link hasta el renderizador. Los resultados dinámicos siguen construyéndose con nodos DOM; no se concatenan consultas en HTML. Validar adicionalmente con teclado, búsqueda normal, historial, estados vacíos, enlaces compartidos y navegación atrás en Beta.

## AUG-099 — Retirar referencias residuales a filtros rápidos

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/SearchFilterCleanup.js
```

SearchFilterCleanup.js comprueba que main.js no conserve referencias a toggleFiltersBtn/filtersBar ni IDs cancelados, que index.html/style.css/ui.js no contengan controles o selectores de filtros rápidos, y que el flujo de búsqueda directa permanezca activo. También ejecuta el handler blur con consulta vacía, consulta activa y modal visible para detectar ReferenceError y confirmar la animación del encabezado.

La eliminación es deliberada: no se reintroducen filtros rápidos ni se sustituyen por controles equivalentes. Validar en Beta el input, botón de limpieza, blur, navegación, modal y viewports móviles.


## AUG-100 — Sistema universal de botones

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/ButtonSystemIntegrity.js
```

La suite comprueba la carga única de button-system.css en index.html, users.html y add_cortes.html; variantes semánticas, icono/compactas, tema oscuro, foco visible, hover, active, disabled, loading/aria-busy, target táctil y aislamiento respecto de inputs/selects. También verifica que los botones estáticos de users.html y add_cortes.html usan .btn y mantiene un inventario cerrado de excepciones en index.html.

Los controles especializados creados en ui.js conservan estilos propios porque representan navegación, carruseles, divulgación/acordeones, cierre de overlays, validación, compartir o accesos compactos con geometría/semántica particular: carousel-btn, cable-carousel-btn, validation-btn, share-modal-btn, info-close-btn, btn-expand-plus, accordion-btn, feedback-btn-overlay, btn-link y backBtn. No se reemplazan por variantes genéricas para evitar alterar su interacción o dimensiones. Los botones de acción ordinarios usan .btn y sus variantes.

## AUG-102 — Tema del banner de validación

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/ValidationBannerTheme.js
```

ValidationBannerTheme.js verifica los tokens semánticos del banner en tema claro/oscuro, la correspondencia con el selector `body.dark-mode`, los estilos del mensaje, botones y campo de entrada, el foco visible y los contrastes WCAG AA (4.5:1) de texto, placeholder y botones. Comprueba además que no queden referencias al token inexistente `--text-primary` ni al selector `[data-theme="dark"]` dentro del componente.

El banner hereda el tema global mediante los tokens definidos en `:root` y redefinidos en `body.dark-mode`; no requiere un atributo de tema adicional ni cambios en el flujo de validación de `ui.js`. La comprobación visual de mensajes, botones, campo y contraste en navegador real queda para Beta.


## AUG-103 — Tokens compartidos de color y tema

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/ThemeTokenConsistency.js
```

ThemeTokenConsistency.js compara los 21 tokens semánticos de index.html (style.css), users.html y add_cortes.html en `:root` y `body.dark-mode`; valida igualdad de valores, alias heredados y uso de tokens en componentes comunes. Comprueba contraste WCAG AA para texto principal/secundario e información (4.5:1) y foco (3:1).

Se conservan como excepciones los colores contextuales/operativos, marcas y logotipos, imágenes, sombras, overlays y elementos gráficos específicos. El banner de validación mantiene tokens especializados compatibles con la paleta común. La inspección visual en navegador real queda para Beta.


## AUG-104 — Zoom del navegador en el formulario colaborativo

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/BrowserZoomAccessibility.js
```

BrowserZoomAccessibility.js comprueba que add_cortes.html no imponga límites de escala ni cancele zoom por rueda, teclado o gestos multitáctiles; verifica el reflujo a una columna y la reorganización de acciones en viewports estrechos. También ejecuta abrir/cerrar Lightbox con un DOM mínimo simulado para confirmar que se restaura el contenido original del viewport: así add_cortes conserva el zoom y las páginas que ya lo restringen mantienen su política original.

La prueba no sustituye la validación visual en navegadores reales. En Beta comprobar 200 % y 400 %, orientación vertical/horizontal, foco, campos, botones, carga de imágenes, Lightbox y ausencia de scroll horizontal global.


## AUG-105 — Layout responsive de formularios y gestión de usuarios

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/ResponsiveFormsUsers.js
```

ResponsiveFormsUsers.js comprueba el reflujo de la cuadrícula de add_cortes.html, sus tarjetas de coincidencias, grupos de imágenes, mensajes, acordeones, acciones y controles. Para users.html verifica el ajuste de las cuatro columnas de la tabla sin scroll horizontal, el texto envolvente, los botones de acción, los límites y scroll interno de modales, los tamaños táctiles y la adaptación en orientación horizontal de poca altura. También valida el balance estructural CSS y la sintaxis de los módulos JavaScript.

La suite es una comprobación estática/estructural y no sustituye la inspección visual en navegador real. En Beta comprobar 320, 375, 420, 600, 760, 768, 1024 y 1440 px, orientación vertical/horizontal, zoom, teclado virtual, foco y ausencia de overflow horizontal global.


## AUG-106 — Colisión inclusiva entre rangos de generaciones

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/YearRangeCollision.js
```

YearRangeCollision.js prueba la comparación inclusiva de rangos en el backend: superposición parcial, contención, contacto en ambos extremos, huecos, rangos anteriores/posteriores e intervalos inválidos. También comprueba que el handler autoritativo compara los dos extremos de ambos rangos y que la validación puntual de la UI conserva sus límites. Los casos son sintéticos; no consultan ni modifican Spreadsheet, endpoints ni datos productivos.


## AUG-109 — Confianza de aportaciones anónimas
La suite `Services/Test/FeedbackWriteSecurity.js` cubre que los reportes anónimos reciban `anon:unverified` independientemente del identificador del navegador, no cuenten para el umbral automático de tres usuarios autenticados, permanezcan para revisión manual y no generen filas/actividad duplicadas al repetir el envío incluso si el cliente regenera su identificador. El límite de 30 solicitudes por hora se aplica en backend mediante CacheService. La suite usa dobles locales; el límite y el flujo de revisión deben comprobarse además en FEEDBACK de pruebas con CacheService y Spreadsheet aislados.


## AUG-110 — Ciclo de vida del banner de validación

- ValidationBannerLifecycle.js valida el inicio de elegibilidad desde el ciclo del modal, sin depender de img.onload ni de la carga inmediata/diferida de cortes.
- Casos: imagen ausente/rota/lazy/cargada, múltiples cortes, duplicación de solicitudes, navegación a otro vehículo, cierre del modal y vehículo no elegible.
- Ejecución local: node Services/Test/ValidationBannerLifecycle.js.
- La validación visual y el comportamiento con imágenes/IndexedDB reales quedan para Beta en navegador aislado.


## AUG-111 — Esquema auxiliar de aportantes de Feedbacks

Ejecutar desde la raíz del repositorio:

    node --experimental-default-type=module Services/Test/SuggestionActorSchemaDocumentation.js

La prueba comprueba que el inventario de Feedbacks conserva las nueve columnas base y documenta suggestionActorKey con ubicación dinámica, formatos de actor, marca applied:, creación idempotente, compatibilidad histórica y reglas de respaldo/restauración. Contrasta estos puntos con la implementación real de Services/feedback.js; no accede a Spreadsheet ni modifica datos.


## AUG-113 — Stored XSS en el dashboard de actividad

Ejecutar desde la raíz del repositorio con Node.js:

```bash
node --experimental-default-type=module Services/Test/ActivityDashboardStoredXss.js
```

La suite comprueba renderizado DOM con \`textContent\` para nombre, tipo y detalle, payloads HTML/SVG almacenados, valores ausentes/mixtos, limpieza de resultados previos, integración del renderer en el dashboard y el contrato de sesión/identidad de \`recordLike\`. La regresión de POST directo con identidad falsificada se mantiene en \`Services/Test/FeedbackWriteSecurity.js\` y usa el harness FEEDBACK aislado. Las pruebas DOM usan un documento simulado; no sustituyen inspección en navegador real ni integración con Spreadsheet.


## AUG-114 — Seguridad de datos y URL en Inbox

La suite Services/Test/InboxStoredXss.js se ejecuta con las fuentes vigentes de ui.js y Services/feedback.js, invocando runInboxStoredXssTests({ui, feedback}). Además de los contratos DOM existentes, verifica normalización de título/descripción/nombre, límites y tipos, allowlist de metadatos por tipo de contenido, lista de modelos PyS, canonicalización de URL YouTube y rechazo de esquemas/hosts ajenos.

El backend normaliza los datos nuevos antes de persistirlos y, al leer registros históricos, limita los campos devueltos, descarta metadatos no permitidos y convierte URL inválidas en enlace vacío. El Inbox presenta el contenido del mensaje como texto; las respuestas enriquecidas mantienen su sanitizador dedicado. La suite usa fuentes y helpers aislados; no ejecuta navegador real ni Apps Script/Spreadsheet.


## AUG-115 — Campo de rol canónico del Inbox

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/InboxRoleContract.js
```

La suite valida que `getUiSessionContext_()` derive el rol exclusivamente de `currentUser.Privilegios`, que `renderInboxDetail()` utilice el rol normalizado del contexto, que la UI permita aprobación solo a Desarrollador/Gefe/Supervisor y que el backend conserve RBAC basado en `assertFeedbackSession()`, ignorando un rol falsificado en el payload. Pruebas aisladas: no acceden a Apps Script, Spreadsheet ni deployments. La inspección visual real de los botones queda para Beta.


## AUG-116 — Caché e Inbox paginado

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/InboxCachePagination.js
```

La suite prueba el caché en memoria por identidad completa de sesión (usuario, rol y token), TTL, fallback stale explícito, invalidación por sesión, límite de páginas y paginación del backend entre Feedbacks y Contactanos. Verifica cursor inválido y pageSize máximo. También ejecuta contratos estáticos de integración de UI/API. No accede a Apps Script, Spreadsheet ni deployments. La regresión XSS de lectura histórica permanece en Services/Test/InboxStoredXss.js y el contrato de roles en Services/Test/InboxRoleContract.js.


## AUG-117 — Protección de la última cuenta Desarrollador y sesiones

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/LastDeveloperProtection.js
```

La suite ejecuta los mismos 12 escenarios contra `Services/Auth.js` y `Services/Test/Auth.js` (24 ejecuciones), con dobles aislados:
- Conteo de cuentas activas con rol Desarrollador, excluyendo tombstones.
- Rechazo de la degradación del último Desarrollador antes de cualquier escritura y permiso cuando queda otra cuenta activa.
- Eliminación de usuarios, retiro de varias filas ActiveSessions, verificación de cero residuos y registro de auditoría.
- Eliminación de uno de dos Desarrolladores, protección del auto-borrado y reintento después de una limpieza parcial.
- Contratos de confirmación UI, actor/objetivo únicos, ScriptLock y sintaxis de los handlers.
No accede a Apps Script, Spreadsheet, endpoints ni deployments reales. El espejo `Services/Test/Auth.js` conserva el Spreadsheet ID reservado a pruebas. La validación de concurrencia y la integración con AUTH/Spreadsheet se reservan para Beta aislado.


## AUG-118 — Refresco de perfil y rol desde sesión autenticada

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/SessionProfileRefresh.js
```

La suite ejecuta 19 escenarios:
- 5 contra Services/Auth.js y los mismos 5 contra Services/Test/Auth.js: perfil actual desde Users, ausencia de contraseña/token, rechazo de ID distinto, ID duplicado y revocación de rol pendiente.
- 9 contratos del cliente: persistencia en localStorage y currentUser, coincidencia de ID/token, cambio de cuenta durante una respuesta tardía, allowlist de campos, rechazo de perfil sin ID, validación inválida, reautenticación ante cambio de rol y TTL ligado a la sesión.
No accede a Apps Script, Spreadsheet, endpoints ni deployments. La integración real se reserva para Beta aislado.


## AUG-119 — Historial inmutable de operaciones del Inbox

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/InboxAuditTrail.js
```

La suite valida el registro previo a la mutación para reply, resolve y delete en Feedbacks y Contactanos; identidad derivada de la sesión; esquema estricto; rechazo de mutaciones cuando falla la escritura del evento; persistencia después de eliminar la fila fuente y lectura posterior desde el dashboard. El ledger \`InboxAuditLog\` es append-only desde FEEDBACK y no se elimina al limpiar la actividad ordinaria. La prueba usa dobles aislados y no accede a Apps Script, Spreadsheet, endpoints ni deployments reales.


## AUG-120 — Lectura acotada del dashboard de actividad

```bash
node --experimental-default-type=module Services/Test/ActivityLogsBoundedRead.js
node --experimental-default-type=module Services/Test/InboxAuditTrail.js
node --experimental-default-type=module Services/Test/ActivityDashboardStoredXss.js
```

ActivityLogsBoundedRead.js prueba con 10,000 registros de actividad y 500 eventos Inbox que cada fuente lee como máximo sus 100 filas finales, combina ambas fuentes en orden cronológico descendente estable, devuelve como máximo 100 elementos y no utiliza getDataRange. También cubre hojas vacías y el contrato de campos del dashboard. InboxAuditTrail y ActivityDashboardStoredXss cubren regresión del ledger y renderizado seguro. Pruebas aisladas sin Apps Script, Spreadsheet, endpoints ni deployments.


## AUG-121 — Allowlist de tipos al responder Inbox

Ejecutar la regresión aislada:

```bash
node --experimental-default-type=module Services/Test/InboxAuditTrail.js
```

La suite verifica que problem_report y contact_form conservan la respuesta y el registro de auditoría; video_approval, tipos arbitrarios y variantes no exactas se rechazan con error explícito antes de cualquier escritura. También comprueba que el rechazo no modifica respuestas ni crea eventos y mantiene las pruebas del ledger de AUG-119. No accede a Apps Script, Spreadsheet, endpoints ni deployments reales.


## AUG-122 — Autorización de addSupplementaryInfo en WRITE

Ejecutar la suite aislada:

\`\`\`bash
node --experimental-default-type=module Services/Test/AddSupplementaryInfoIntegrity.js
\`\`\`

La suite valida la allowlist de roles y el helper de autenticación del servidor con hojas simuladas: token ausente, inválido/cruzado/duplicado, expirado, revocado, perfil eliminado, rol no autorizado, todos los roles permitidos e identidad derivada de Users en lugar del payload. También conserva las pruebas de planificación, sanitización, bloqueo, persistencia y rollback. No accede a Apps Script, Spreadsheet ni Drive reales.


## Serialización y recuperación de migración UTILITIES (AUG-123)

- Ejecutar `runUtilitiesSecurityTests()` cargando `Services/SharedMutationClient.js`, `Services/Utilities.js` y `Services/Test/UtilitiesSecurity.js` en el mismo runtime V8 aislado.
- Comprueba sesión Desarrollador bajo ScriptLock, snapshots de Cortes y Hoja 1 previos a la conversión, verificación del respaldo antes de promover y rechazo de POST concurrente.
- Incluye fallos de lectura, staging, validación del respaldo, promoción, rollback, recuperación de respaldo interrumpido y liberación del lock.
- Usa dobles en memoria; no accede a Apps Script desplegado, Spreadsheet ni Drive reales.


## AUG-124 — Contrato único FEEDBACK/CATALOG para Tutoriales

Ejecutar desde la raíz del repositorio:

```bash
node --experimental-default-type=module Services/Test/TutorialIntegrity.js
```

La suite incluye regresiones del contrato compartido: CATALOG lee la hoja canónica `Tutorial` y mapea en orden ID, Tema, Imagen, comoIdentificarlo, dondeEncontrarlo, Detalles, Video y Colaborador; también mantiene la lectura de filas históricas A:G sin inventar un colaborador. Verifica que FEEDBACK no cree ni consulte una hoja plural alternativa. La implementación de alta, edición, identidad y migración compatible se conserva de AUG-092; no se duplica.


## AUG-125 — Recuperación de respaldos y restauraciones ADMIN

```js
runAdminRestoreRecoveryTests(adminSource)
```

La suite `Services/Test/AdminRestoreRecovery.js` valida los contratos de respaldo DB/Drive, manifiestos, esquema, staging, intercambio de hojas completas, preservación de hojas adicionales y rutas de rollback. Incluye simulación dinámica de intercambio DB exitoso, fallo de promoción, fallo de verificación y fallo al recuperar nombres originales.

La suite usa dobles locales; no ejecuta `DriveApp`, `SpreadsheetApp`, Apps Script ni endpoints. La creación y restauración reales deben probarse en un proyecto ADMIN y recursos aislados, según `lista_beta.txt`.


### Extensión AUG-018 — respaldo Drive por lotes y reanudación

La misma suite cubre los manifiestos v2 y el rechazo de contenedores incompletos. La suite adicional `Services/Test/AdminBackupResumeUI.mjs` valida el contrato de respuestas `in_progress`/reanudables, el control de continuación, el límite de lotes automáticos y ejecuta comprobaciones de sintaxis Node.js sobre los archivos afectados. El caso de colisión del nombre del manifiesto se prueba en el traslado de recursos Drive.

Ejecución integrada: `node --experimental-default-type=module Services/Test/RunServiceTests.mjs`. La integración real con DriveApp/SpreadsheetApp, interrupciones de Apps Script y restauración de recursos se reserva a Beta aislada.


## AUG-126 — Validación previa de payload en WRITE

```js
```js
runCutPayloadValidationTests(writeSource)
```

La suite ejecuta 35 escenarios de estructura/allowlist, requeridos, enums, años, tipos, longitudes, VIN, opId/SHA-256, imágenes y contratos de compensación. La validación se realiza antes de cualquier mutación; los fallos revierten fila, registro de Idempotencia y contador de IDs cuando corresponde. Las cargas no enlazadas se conservan trazadas en ImageUploadLedger para reconciliación.



## AUG-127 — Contrato de vídeo suplementario
- `SupplementaryVideoContract.js`: ejecutar `runSupplementaryVideoContractTests({ write, admin, catalog, feedback, ui, addCortes })`. Verifica allowlist, rechazo de URLs/campos directos, hosts/rutas/IDs YouTube, destino físico, confirmación de escritura, refresco de CATALOG y alias de presentación. Resultado local: 55/55 PASS.
- Regresión: `runAddSupplementaryInfoIntegrityTests({ write, admin, coordinator, ui })` 53/53; `runYouTubeAddCortesContractTests(addCortes)` 4/4; `runVehicleExpansionDetailRefreshTests({ ui, catalog })` 30/30.
- YouTube: `runYouTubeApprovalTests()` 15/15; `runYouTubeApprovalInitTests()` 8/8; `runVideoApprovalPublishingTests()` 27/27.
- OAuth/API reales, aprobación en FEEDBACK desplegado, Spreadsheet real y lectura después de recargar navegador permanecen para Beta aislada.


## AUG-129 — Validación de edición del modal ADMIN

Ejecutar desde la raíz del repositorio:

```bash
node --input-type=module -e 'import {readFileSync} from "node:fs"; const admin=readFileSync("Services/admin.js","utf8"); const tests=readFileSync("Services/Test/AdminModalEditIntegrity.js","utf8"); const run=new Function("adminSource",tests+"; return runAdminModalEditIntegrityTests(adminSource);"); const result=run(admin); console.log(JSON.stringify(result,null,2)); if(result.failed) process.exitCode=1;'
```

La suite comprueba la allowlist y exclusión de ID/campos calculados, tipos, longitudes, dominios de categoría/encendido/corte/Relay, coherencia del rango de años, sanitización de texto enriquecido, referencias de Drive, IDs inexistentes/duplicados, sintaxis V8 de los handlers y contratos de lock/reversión. Resultado local de esta tarea: 9/9 PASS en harness V8. Regresión adicional: runAdminModalEditSecurityTests() 13/13 PASS con LockService simulado y runAdminModalEditRestoreContractTests(uiSource, adminSource) 12/12 PASS. La suite utiliza fixtures y dobles; no llama Apps Script, Spreadsheet, Drive ni endpoints reales.


## AUG-130 — Mutaciones atómicas de USERS

Ejecutar desde la raíz del repositorio:

~~~bash
node --input-type=module -e 'import {readFileSync} from "node:fs"; const users=readFileSync("Services/users.js","utf8"); const auth=readFileSync("Services/Auth.js","utf8"); const coordinator=readFileSync("Services/Coordinator.js","utf8"); const tests=readFileSync("Services/Test/UsersAtomicMutations.js","utf8"); const run=new Function("usersSource","authSource","coordinatorSource",tests+"; return runUsersAtomicMutationTests(usersSource,authSource,coordinatorSource);"); const result=run(users,auth,coordinator); console.log(JSON.stringify(result,null,2)); if(result.failed) process.exitCode=1;'
~~~

La suite ejecuta 14 escenarios locales: validación de campos de creación, rechazo de propiedades/roles/tipos/formato inválidos, escritura agrupada ID:H, duplicidad de username, rollback con restauración de fórmulas, actualización de perfil, allowlist, IDs inexistentes/duplicados, rollback por fallo de flush, sesión ajena y contratos de lease compartida entre USERS/AUTH. Usa hojas, locks y flush simulados; no llama Apps Script ni datos reales. La copia Services/Test/users.js conserva el ID de la Spreadsheet aislada y se sincroniza con el servicio fuente.


## AUG-131 — Validación de destino y transición de aprobación de vídeos

Ejecutar desde la raíz del repositorio:

~~~bash
node --input-type=module -e 'import {readFileSync} from "node:fs"; const feedback=readFileSync("Services/feedback.js","utf8"); const tests=readFileSync("Services/Test/VideoApprovalPublishing.js","utf8"); const run=new Function("LockService","SpreadsheetApp","Utilities","Session",feedback+tests+"; return runVideoApprovalPublishingTests();"); const lock={getScriptLock:()=>({waitLock(){},releaseLock(){}})}; const result=run(lock,{flush(){}},{getUuid:()=>"test-uuid",formatDate:()=>"2026-11-12"},{getScriptTimeZone:()=>"GMT-6"}); console.log(JSON.stringify(result,null,2)); if(result.failed) process.exitCode=1;'
~~~

La suite cubre allowlist de tipo de contenido, destino único por ID, coherencia entre referenceId e ID de la fila FEEDBACK, esquemas de Cortes/PyS/Tutorial, estados pendientes/terminales, publicación sin sobrescritura, miniatura de tutorial, rechazo que solo retira el enlace exacto, reintentos ante respuesta/escritura fallida y serialización local de aprobación/rechazo con el mismo ScriptLock. Resultado local: 28/28 PASS. Usa hojas simuladas; no llama Apps Script desplegado, Spreadsheet, Drive, YouTube ni endpoints reales.


## AUG-132 — Validación estricta del VIN

Ejecutar la suite `runVinAuthoritativeValidationTests({ write, admin, ui, addCuts })` cargando las fuentes vigentes de `Services/write.js`, `Services/admin.js`, `ui.js` y `add_cortes.html`. La suite verifica longitudes normalizadas de 5/6/18/19, rechazo de caracteres ajenos al formato, normalización exclusiva de espacios y guiones, rechazo antes de consultar/escribir datos, duplicados y contratos de altas/edición. Resultado local: 12/12 PASS. Parsing V8 de WRITE, ADMIN y la suite: PASS. No requiere Apps Script ni Spreadsheet real.

## AUG-133 — Runner reproducible de regresión (pruebas 31–38)

Desde la raíz del repositorio, con Node.js 22:

```bash
node --experimental-default-type=module Services/Test/RunServiceTests.mjs
```

Se puede ejecutar un grupo por servicio con `--only=WRITE`, `--only=ADMIN`, `--only=FEEDBACK`, `--only=CATALOG`, `--only=UTILITIES`, `--only=AUTH`, `--only=USERS` o `--only=INTEGRATION`. También se admiten los identificadores 31–38.

El runner coordina suites existentes sin duplicar fixtures: payload/VIN de WRITE, edición y recuperación de ADMIN, Inbox y aprobación de FEEDBACK, readiness/snapshots/estados de CATALOG, migración segura de UTILITIES, protección de AUTH, mutaciones de USERS y contratos transversales. Verifica además que las copias AUTH/USERS coincidan con sus fuentes salvo el ID dedicado de Spreadsheet de pruebas.

Las pruebas locales usan fixtures, hojas simuladas e IndexedDB simulado. No invocan endpoints operativos, deployments, hojas productivas ni servicios externos. La integración real de Apps Script/Spreadsheet permanece en Beta. GitHub Actions ejecuta el mismo runner en cada push a `GPSpedia2.2.5_work`.

### Adenda AUG-133 — ejecución CI verificada

El workflow `GPSpedia service regression tests` ejecutó el runner con Node.js 22. La suite terminó correctamente: **16 suites, 238/238 pruebas PASS, 0 fallos**. La suite `CatalogSnapshotSync` espera explícitamente su ejecución asíncrona; su IndexedDB simulado confirma cada transacción mediante `oncomplete`, además de completar la solicitud individual.


## AUG-134 — Contrato de acciones, routers y consumidores

La suite Services/Test/ActionDispatchContract.js, ejecutada en el grupo INTEGRATION, comprueba el contrato completo entre ACTION_TO_SERVICE_MAP, API_ENDPOINTS, los routers AUTH/USERS/CATALOG/WRITE/FEEDBACK/ADMIN/UTILITIES y los consumidores de interfaz versionados.

Cobertura automática:
- Cada acción del mapa debe existir en el dispatcher de su servicio y enlazar con una función handler declarada. La respuesta inline de ADMIN/ping es la única excepción explícita.
- Cada acción pública de los routers debe estar en el mapa canónico o en SERVICE_COMPATIBILITY_ACTIONS.
- Las acciones literales consumidas por api-config.js, add_cortes.html, auth.js, main.js, pys-data.js, ui.js, users.html y youtubeUpload.js deben estar mapeadas.
- Las acciones externas requieren servicio, consumidor y origen documentados en EXTERNAL_ACTIONS; logFrontend conserva su ruta LEGACY.
- Se preservan las rutas de compatibilidad CATALOG/ADMIN y el rechazo cerrado de servicios no configurados.

Ejecutar:
~~~bash
node Services/Test/RunServiceTests.mjs --only=INTEGRATION
~~~

La validación es estática y reproducible con las fuentes del repositorio; no llama endpoints, deployments ni datos reales. La matriz de acciones vigente no necesitó cambios funcionales: las 81 acciones del mapa ya coincidían con sus routers; el cambio añade detección automática de handlers ausentes y consumidores desincronizados.


### Resultado AUG-134 (2026-11-13)

GitHub Actions run 43366270381, sobre commit a9ecfd6c6180b5037261b1d26f224527f7b9e7e5, Node.js 22.23.4: 16 suites, 239/239 pruebas aprobadas, 0 fallos. La suite ActionDispatchContract aporta 12 verificaciones nuevas y se ejecuta dentro de INTEGRATION.


## Contratos UI y retirada de markup obsoleto

La suite `UiOrphanCleanup.js` se ejecuta dentro del grupo INTEGRATION del runner. Comprueba que el markup y las referencias de la antigua `debug-console` no reaparezcan, que `dev-console-log` siga activo y que los contratos públicos de `clearModalNavStack` y `loadAndRenderInbox` permanezcan conectados.


## AUG-138 — Diagnóstico seguro de add_cortes

`Services/Test/AddCortesDiagnostics.mjs` valida el logger por lista permitida, niveles de producción y activación explícita con `?gpDebug=1`; además ejecuta el flujo de recuperación para respuesta perdida antes/después del commit, reintentos, operación offline y fallo `QuotaExceededError`. Ejecutar con el runner general o directamente mediante `node --experimental-default-type=module Services/Test/AddCortesDiagnostics.mjs`.


## AUG-140 — Contrato de página Carta y márgenes de impresión

La ficha imprimible utiliza tamaño Carta vertical (215.9 × 279.4 mm), con margen CSS de 10 mm por lado. El área de contenido resultante es 195.9 × 259.4 mm. Los wrappers de página usan esa altura útil como mínimo tanto en vista previa como en impresión. Una ficha ocupa una página cuando la distribución cabe de forma legible; cuando la cantidad/orientación de imágenes requiere más grupos, se crean páginas adicionales. El encabezado y pie se repiten y los metadatos del vehículo aparecen solo en la primera página. El cuadro de impresión debe conservar tamaño Carta y márgenes predeterminados para respetar `@page`.

Ejecutar directamente:

```bash
node --experimental-default-type=module Services/Test/PrintSheetPageContract.mjs
```

La suite está integrada en `--only=INTEGRATION` y comprueba tamaño/márgenes, altura útil, reglas de salto, agrupación conservada, repetición de encabezado/pie y coherencia documental. La medición física con impresora real, la vista previa del navegador y el PDF final quedan para Beta; el margen efectivo puede variar por el área no imprimible del equipo.


## AUG-141 — Indicador Check Engine en la ficha imprimible

El documento de impresión utiliza un SVG vectorial local (viewBox 64 × 48) para representar el testigo de motor. No depende de Font Awesome ni introduce un campo de imagen nuevo en la hoja de datos. El aviso se muestra únicamente cuando el campo normalizado `activaTestigoN` es exactamente `true`; aparece después de la imagen técnica, si existe, y se conserva aunque el corte no tenga fotografía. El SVG usa `object-fit: contain` y una relación de aspecto 4:3.

Ejecutar: `node --experimental-default-type=module Services/Test/PrintSheetWarningIndicator.mjs`.

La suite valida el origen del estado, independencia del recurso, proporción, posición, ausencia de dependencias externas y casos activos/inactivos/no especificados. La inspección visual en navegador y PDF queda para Beta.


## AUG-142 — Disponibilidad de recursos antes de imprimir

La vista previa marca foto principal, QR, logotipos e imágenes técnicas como recursos opcionales cuando existen en el registro. La preparación espera los eventos load/error con timeout de 8 segundos y la decodificación con límite de 2 segundos. Los recursos fallidos se ocultan y muestran un marcador textual; no se presentan como imágenes cargadas ni se usan para calcular proporciones. El botón de impresión permanece deshabilitado hasta completar la preparación y la paginación de recursos clonados. El evento `beforeprint` no vuelve a calcular dimensiones mientras la preparación no haya terminado.

Ejecutar: `node --experimental-default-type=module Services/Test/PrintSheetResourceReadiness.mjs`.


## AUG-143 — Paginación por altura real y orden técnico

Las tarjetas técnicas se procesan en orden original, con el corte prioritario al inicio cuando corresponde. Se agregan secuencialmente a la página activa y se mide el overflow real del área de contenido; la tarjeta que excede una página con contenido previo se traslada completa a la siguiente. Las tarjetas sin imagen ya no se agrupan artificialmente al final. Las imágenes se ajustan al espacio vertical medido sin imponer el mínimo anterior de 80 px. Si una tarjeta individual excede por sí sola el espacio, la página queda identificada mediante `data-content-overflow` sin ocultar contenido.

Ejecutar: `node --experimental-default-type=module Services/Test/PrintSheetPaginationIntegrity.mjs`.


## AUG-144 — QR local y privacidad de vídeos no listados

El QR se genera dentro del navegador con el módulo local `qrcode-generator.mjs` (MIT, Kazuhiko Arase), sin enviar el enlace a servicios externos. `printQr.js` valida HTTPS y hosts oficiales de YouTube, extrae un ID de 11 caracteres y genera un `data:image/gif` local con URL canónica. No se incluyen parámetros de seguimiento/listas ni se muestra la URL en la ficha. Los enlaces inválidos omiten el QR y muestran un aviso neutro. La licencia completa está en `ThirdPartyLicenses/qrcode-generator-MIT.txt`.

Ejecutar: `node --experimental-default-type=module Services/Test/PrintQrPrivacy.mjs`.


## AUG-145 — Modos de distribución de la ficha

Los cuatro modos del selector son distintos: Automática conserva la agrupación adaptativa por clases; Horizontal fuerza texto/imagen en columnas; Vertical fuerza una sola columna con imagen después del texto; Imagen ampliada usa una columna y permite hasta 620 px de alto para la imagen. Las reglas específicas se declaran después de los límites generales del wrapper para evitar que la cascada las anule. Prueba: `node --experimental-default-type=module Services/Test/PrintSheetLayoutModes.mjs`.


## AUG-039 — Autorización y minimización de datos en WRITE

Ejecutar las regresiones con:

```bash
node --experimental-default-type=module Services/Test/RunServiceTests.mjs --only=WRITE
```

Cobertura integrada:
- `AddSupplementaryInfoIntegrity.js`: validación de ActiveSessions/Users, expiración, revocación, roles permitidos, atribución servidor, persistencia/rollback y coordinación.
- `CheckOperationSecurity.js`: sesión obligatoria, respuesta sin rowData, opId aleatorio de 128 bits y contrato mínimo de recuperación.
- `WriteAuthorizationContracts.js`: rol Desarrollador para allocateVehicleId, revalidación antes/después del lock, revocación/cambio de rol, consumidores UI, flujo silentRegister y ruta ADMIN.
- `WriteAuthorizationMinimization.js`: columnas físicas locales Users/ActiveSessions, callsites, router canónico y preservación de addOrUpdateCut/addVinToVehicle/freezeCortesIds.

Decisión de privacidad: Idempotencia conserva esquema A:F sin ownerUserId. opId es un identificador de correlación de 128 bits, no un mecanismo de autorización; checkOperation exige una sesión vigente y devuelve solo estado, vehículo, timestamp y hash de integridad. Un colaborador autenticado que conozca un opId puede consultar esos metadatos mínimos. Si se requiere aislamiento por actor, debe diseñarse una migración versionada del esquema.

La ejecución local simulada no sustituye la prueba Beta. En Apps Script/Spreadsheet aislados se deben comprobar sesiones válidas/ausentes/cruzadas/expiradas/revocadas, cambio de rol entre validaciones, ausencia de escrituras y cargas Drive ante rechazo, contador de IDs para rol ordinario/Desarrollador, respuesta mínima de checkOperation y registro silencioso por ADMIN. No utilizar endpoints ni datos productivos.


## AUG-042 — Invalidación de sesión y estado privilegiado del cliente

Ejecución integrada:
```bash
node --experimental-default-type=module Services/Test/RunServiceTests.mjs --only=AUTH
node --experimental-default-type=module Services/Test/RunServiceTests.mjs --only=FEEDBACK
```

Suites:
- `SessionUiRoleInvalidation.js` — 13 contratos: logout token-aware, limpieza de estado/modales/cachés, reset al cambiar cuenta/rol, guardas de apertura, revalidación remota, aislamiento de `window.state/window.ui`, auto-cambio de rol y política Jefe/Inbox.
- `InboxRoleContract.js` — 8 contratos: matriz de roles, autoridad FEEDBACK y uso del mismo `Privilegios` normalizado para visibilidad y acciones approve/reject.
- `SessionProfileRefresh.js` — 19 contratos: sincronización de perfil y revocación/invalidación de sesiones.

El cierre previo H-AUD-042-001 a 011 se conserva como evidencia histórica en Auditoria_Archive/Auditoria_2026-11-10_parte_002.txt. La regresión H-AUD-042-012 (variable `userRole` no declarada en renderInboxDetail) se corrige declarando el rol desde `context.role`.

Validación CI: run 43429506713 SUCCESS, 37 suites y 557 pruebas PASS; `node --check` de `ui.js` PASS. La suite usa contratos/dobles y no sustituye la validación Beta con DOM, IndexedDB, cuentas y sesiones reales.
