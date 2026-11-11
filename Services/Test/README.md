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
