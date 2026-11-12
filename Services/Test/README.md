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
- Services/Test/VideoApprovalPublishing.js — aprobación/rechazo en Cortes, PyS y Tutoriales; unicidad del destino, miniaturas, reintentos tras fallos parciales, reintento después de perder la respuesta de una aprobación completada y verificación de que no se sobrescriba un destino alterado.
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

## Seguridad y recuperación del servicio UTILITIES (AUG-041)

- `Services/Test/UtilitiesSecurity.js` — cargar junto con `Services/Utilities.js` en un runner V8 e invocar `runUtilitiesSecurityTests()`. Usa dobles en memoria para sesión/rol, staging, verificación, promoción, rollback, lock ocupado, origen vacío, destino incompatible y recuperación de respaldo interrumpido.
- No accede a Apps Script desplegado, Spreadsheet ni Drive reales. La comparación del deployment publicado y la integración física se reservan para Beta.

## Seguridad e integridad de escrituras FEEDBACK (AUG-040)

- `Services/Test/FeedbackWriteSecurity.js` — ejecutar `runFeedbackWriteSecurityTests()` junto con `Services/feedback.js` en un proyecto temporal V8. Usa dobles en memoria para autorización, identidad de actor, política pública, deduplicación de likes, recuperación de contadores y rechazo de altas PyS sin imagen.
  También prueba peticiones POST directas: sustitución de identidad, sesión inválida, rol falsificado en `approveVideo`, coordinación FEEDBACK y rechazo de `assignCollaborator`.
- `Services/Test/SharedMutationCoordinator.js` comprueba la contención interservicios y que `recordLike`, `suggestYear` y `approveVideo` reserven `CORTES`, `FEEDBACK` y `ACTIVITY`; también confirma que `assignCollaborator` ya no esté habilitada.
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
- `IndexedDBTransactions.js`: permanencia de addCutPending antiguo y rechazo de eliminación desde otra cuenta (22 escenarios en total).


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
