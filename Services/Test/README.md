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

La suite lógica también cubre la reserva de mantenimiento, drenaje de leases existentes, bloqueo de nuevas mutaciones durante la espera, diagnóstico de operaciones activas, expiración de reservas abandonadas y compatibilidad con leases previas sin campo `phase`. `migrateCortesOperationIds` se declara como mantenimiento exclusivo en ADMIN.

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
- Services/Test/VideoApprovalPublishing.js — aprobación/rechazo en Cortes, PyS y Tutoriales; unicidad del destino, miniaturas, reintentos y preservación de enlaces previos.
- Services/Test/VideoApprovalContracts.js — altas sin vídeo, bloqueo de enlaces directos y protección de cambios fuera del flujo de aprobación.
- Services/Test/VideoApprovalSessions.js — sesión ausente, inválida, expirada, revocada, token cruzado, duplicidad de token/perfil y rol no permitido.

Cada suite expone una función run...Tests() y usa dobles en memoria. No modifica hojas ni datos productivos. Cargar primero Services/feedback.js y después el archivo de prueba en un proyecto temporal de Apps Script V8; ejecutar la función indicada en el archivo.

Services/Test/YouTubeUploadClient.js contiene pruebas del cliente resumable (IndexedDB, 308, consulta de progreso, respuesta final sin ID, pérdida de respuesta, sesión expirada y cancelación). Es una suite de entorno navegador: para ejecutarla, concatenar youtubeUpload.js y el archivo de prueba en un runner JavaScript que inyecte window, sessionStorage, XMLHttpRequest y console simulados. No se ejecuta directamente en Apps Script porque el módulo depende de APIs del navegador.

Las suites aisladas no sustituyen la validación real con YouTube OAuth/API, XHR en navegador, IndexedDB real, Apps Script desplegado ni copias aisladas de Google Sheets. Esas verificaciones permanecen diferidas a Beta; no se deben presentar como ejecutadas.


## Confirmación de validación antes de caché local (CORR-SUGGESTYEAR-CLIENT-CONFIRM-001)

- `Services/Test/ValidationCacheConfirmation.js` — ejecutar con `node --experimental-default-type=module Services/Test/ValidationCacheConfirmation.js`. Verifica orden backend→caché, estados confirmados, respuestas info no registradas, fallos de red, estados desconocidos y fallos de IndexedDB.
- La suite no necesita navegador ni accede a servicios externos.

## Sincronización del contador de likes en cliente (CORR-FEEDBACK-LIKE-COUNTER-SYNC-001)

- `Services/Test/LikeClientCounter.js` — ejecutar con `node --experimental-default-type=module Services/Test/LikeClientCounter.js`. Verifica likes nuevos, reintentos idempotentes, recuperación, deduplicación de estado local y preservación del contador ante respuestas inválidas.
- La suite no requiere navegador ni servicios externos.

## Seguridad e integridad de escrituras FEEDBACK (AUG-040)

- `Services/Test/FeedbackWriteSecurity.js` — ejecutar `runFeedbackWriteSecurityTests()` junto con `Services/feedback.js` en un proyecto temporal V8. Usa dobles en memoria para autorización, identidad de actor, política pública, deduplicación de likes, recuperación de contadores y rechazo de altas PyS sin imagen.
- `Services/Test/SharedMutationCoordinator.js` comprueba que `recordLike` reserve `CORTES`, `FEEDBACK` y `ACTIVITY`, y que `assignCollaborator` ya no esté habilitada.
- Acciones públicas: `getPysData` (solo lectura) y `sendContactForm` (longitudes/correo validados y máximo 10 envíos por hora). `suggestYear` admite aportes anónimos limitados a 30 por hora; no cuentan para modificar automáticamente el catálogo y quedan para revisión manual.
- Las escrituras `recordLike`, `reportProblem`, `addProblem`, `addSolution`, `addPrevention` y `suggestCutChange` requieren sesión activa; el backend reemplaza userId/userName/userRole con datos de Users. Las demás acciones deben estar declaradas; las no declaradas se rechazan.
- `FeedbackLikes` se crea bajo demanda; su esquema está en `Spreadsheet/GPSpedia_DB_columnas.md`. No ejecutar contra hojas productivas.
