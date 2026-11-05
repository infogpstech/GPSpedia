# CHECKPOINT INICIAL — PREPARAR AUTH Y USERS PARA PRUEBAS AISLADAS (ADMIN 0)

**Fecha:** 2026-11-05  
**Repositorio:** infogpstech/GPSpedia  
**Rama de trabajo:** GPSpedia2.2.5_work  
**Rama base protegida:** GPSpedia2.2.5  
**HEAD inicial confirmado:** 8a9c9811bc954785f36966997bc1564a1fb3feac  
**HEAD de rama base confirmado:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Comparación inicial:** 136 commits adelante, 0 atrás.

## Tarea y alcance
Preparar copias fuente aisladas de AUTH y USERS que utilicen la Spreadsheet de pruebas confirmada por el usuario, sin modificar los servicios actuales, los endpoints live ni los datos de ninguna hoja. Dejar documentado cómo crear deployments separados para poder ejecutar la matriz funcional de ADMIN 0.

## Estado real al inicio
- El usuario proporcionó la copia independiente de Spreadsheet con ID `1TyfehJHUeyUMGM4AW12_Rkq-Y8G_6MvF-Wd9rrB87_k`.
- `Services/Auth.js`, `Services/users.js` y `Services/admin.js` tienen configurado el ID distinto `1M6zAVch_EGKGGRXIo74Nbn_ihH1APZ7cdr2kNdWfiDs`.
- `api-config.js` contiene los endpoints actuales de AUTH y USERS, pero no configura endpoints de prueba.
- El repositorio no contiene archivos de manifiesto ni metadatos de proyectos/deployments Apps Script que permitan verificar desde GitHub a qué Spreadsheet apunta cada deployment.
- La documentación del proyecto indica que los microservicios se despliegan de forma independiente.
- El usuario autorizó continuar con la preparación del entorno de prueba; no se ha autorizado desplegar Apps Script ni modificar hojas.
- Reconocimiento preliminar: `api-config.js` se había leído durante la recuperación del contexto. Para respetar el flujo, la auditoría formal de los servicios se reinicia después de este checkpoint; no se había realizado ninguna modificación.

## Archivos y funcionalidades involucrados
- `Services/Auth.js` y `Services/users.js`: fuentes originales auditadas y copias aisladas nuevas bajo `Services/Test/`.
- `api-config.js`: verificación de enrutamiento actual; no se modificará.
- `Services/admin.js`: verificación de su ID configurado, fuera del alcance de esta preparación.
- `README.md` de pruebas, `Auditoría.txt`, `ChangesLogs.txt`, `Tareas.txt` y `checkpoint.md`.

## Riesgos y dependencias
- AUTH puede migrar contraseñas legacy, escribir tokens/sesiones y registrar eventos; USERS puede crear, modificar o eliminar usuarios y sesiones. Ambas copias deben apuntar exclusivamente a la Spreadsheet de pruebas.
- Los proyectos y deployments de prueba deben ser distintos de los operativos. No sustituir las URLs de `api-config.js`.
- Las pruebas funcionales requieren confirmar en Apps Script los dos nuevos deployments y comprobar el ID configurado en cada uno.
- No ejecutar operaciones contra los endpoints live, no desplegar, no modificar datos y no hacer merge.

## Respaldos
- Fuentes originales conservadas sin cambios como blobs Git:
  - `Services/Auth.js`: `be99654d7a41ee77dbeb8534976ca94c8c376068`
  - `Services/users.js`: `aa8960e188e71c46fa481829283d5c0c189b7ed8`
- Los archivos documentales originales se conservarán en el historial Git y se actualizarán dentro del commit único de esta tarea.

**Fase al crear el checkpoint:** inicio documentado; auditoría formal en curso.


# CHECKPOINT INICIAL — CORRECCIÓN DE AUTORIZACIÓN EN ACCIONES ADMIN

**Fecha:** 2026-11-05
**Repositorio:** infogpstech/GPSpedia
**Rama de trabajo:** GPSpedia2.2.5_work
**Rama base protegida:** GPSpedia2.2.5
**HEAD inicial confirmado:** de45e5165644af10836da3d306a7336725de7644

## Tarea y alcance
Corregir la propagación del payload de sesión en las acciones administrativas que utilizan runAction(), en su ruta individual y por lotes, además de las llamadas directas protegidas driveCommand y updateVehicleField. Mantener intacta la validación de sesión del backend.

## Estado real al inicio
- La incidencia de backupDatabase está registrada en Tareas.txt y Auditoría.txt.
- La rama de trabajo aún contiene ui.js sin la propagación de sesión en los flujos auditados.
- getDeveloperSessionPayload() existe en ui.js y obtiene ID/SessionToken de currentUser.
- Services/admin.js exige userId/sessionToken y verifica sesión activa y privilegio Desarrollador antes de ejecutar acciones, excepto ping.
- No hay copia de prueba de la Spreadsheet.
- No se ha autorizado desplegar Apps Script, alterar datos productivos ni hacer merge.

## Archivos y funcionalidades involucrados
- ui.js: runAction(), procesamiento por lotes, executeTerminalCommand() y saveFieldSilently().
- api-config.js: ACTION_TO_SERVICE_MAP y routeAction().
- Services/admin.js: assertDeveloperSession() y doPost().
- Auditoría.txt, ChangesLogs.txt, Tareas.txt y checkpoint.md.

## Riesgos y dependencias
- Mantener la sesión como dato de autorización validado por servidor; no confiar en rol del cliente ni eliminar controles backend.
- No ejecutar operaciones de backup/restore ni comandos de Drive durante la implementación.
- Agrupar código y documentación en un único commit de tarea.

**Fase al crear este checkpoint:** inicio documentado; auditoría y respaldo de los archivos involucrados en curso.

---

# CIERRE DE TAREA — CORRECCIÓN ESTÁTICA DE SESIÓN EN ACCIONES ADMIN

**Estado:** IMPLEMENTACIÓN Y REVISIÓN ESTÁTICA COMPLETADAS; VALIDACIÓN LIVE PENDIENTE.

## Resultado
- runAction() incorpora getDeveloperSessionPayload() en solicitudes individuales y por lotes.
- executeTerminalCommand() incorpora getDeveloperSessionPayload() a driveCommand.
- saveFieldSilently() incorpora getDeveloperSessionPayload() a updateVehicleField.
- Se cubren las acciones ADMIN invocadas mediante runAction(): backupDatabase, backupDrive, restoreDatabase, restoreDrive, reorganizeDatabase, normalizeImages, reorganizeImagesInDrive, restoreAllTrashedImages y addLogo.
- api-config.js y Services/admin.js no se modificaron. La validación de sesión y rol Desarrollador permanece intacta.

## Archivos modificados
- ui.js
- Auditoría.txt
- ChangesLogs.txt
- Tareas.txt
- checkpoint.md

## Verificaciones realizadas
- Se comprobó que las cuatro sustituciones de ui.js tienen una coincidencia exacta cada una.
- Se revirtieron las cuatro sustituciones en memoria y se obtuvo una coincidencia exacta con el ui.js original.
- Se revisaron las llamadas directas ADMIN restantes; las ya protegidas transmitían el contexto de sesión y ping está exento en backend.
- Se verificó que getDeveloperSessionPayload() exige usuario autenticado con ID y SessionToken.
- Se revisó assertDeveloperSession() y doPost(); no se modificó la validación backend.

## Validaciones pendientes y limitaciones
- No se ejecutó JavaScript en navegador ni se realizó una llamada HTTP.
- No se comprobó el deployment ADMIN ni se ejecutó Apps Script.
- Debe probarse backupDatabase en live con sesión válida, así como el rechazo con sesión ausente/inválida y rol no autorizado.
- Deben probarse backupDrive, terminal, updateVehicleField y procesamiento por lotes en condiciones controladas.
- No se generó respaldo ni se modificaron datos de Google Sheets/Drive.
- No se desplegó Apps Script, no se realizó merge y la rama base permanece intacta.

## Continuidad
- HEAD anterior a la tarea: de45e5165644af10836da3d306a7336725de7644.
- El commit único de esta tarea incluirá código y documentación y quedará identificado en el historial de GPSpedia2.2.5_work.
- Próxima acción: validar backupDatabase en live. Si funciona, generar y verificar copia de prueba antes de retomar la migración ADMIN 0. No iniciar migración productiva sin pruebas y autorización.

---

# CIERRE DE TAREA — INCIDENCIA backupDatabase Y PLAN DE MIGRACIÓN ADMIN 0

**Fecha:** 2026-11-04  
**Estado:** INCIDENCIA REGISTRADA; CAUSA ESTÁTICA IDENTIFICADA; CORRECCIÓN PENDIENTE.

## Resultado
- Se agregó a `Tareas.txt` la incidencia de `backupDatabase` reportada por el usuario.
- Se documentó en `Auditoría.txt` que el listener de `btn-admin-backup-db` llama `runAction('backupDatabase')` sin payload de sesión.
- `routeAction()` transmite el payload vacío; `Services/admin.js` exige `userId` y `sessionToken` en `assertDeveloperSession()` para todas las acciones salvo `ping`.
- El rechazo sucede antes de ejecutar `handleBackupDatabase()`; no se ha demostrado que el handler de copia tenga otros fallos.
- Se registró en `ChangesLogs.txt` el alcance documental.
- No se modificó código, no se ejecutó Apps Script, no se generó respaldo y no se modificaron datos de Google Sheets/Drive.

## Migración de contraseñas — decisión y dependencia
- El usuario confirmó continuar con la estrategia gradual documentada: AUTH primero con verificación dual y migración oportunista al iniciar sesión; después USERS escribirá únicamente hashes; por último se evaluará la migración por lotes de cuentas restantes.
- No hay copia de prueba disponible. La incidencia de `backupDatabase` impide obtenerla desde la herramienta de respaldo de la plataforma.
- Antes de tocar AUTH/USERS o la columna Password, se debe corregir y validar la transmisión de sesión en las acciones ADMIN; luego generar y comprobar un respaldo/copia de prueba.
- Después se seleccionará y medirá una KDF compatible con Apps Script V8, con vectores de prueba sintéticos y un entorno aislado. No migrar datos productivos hasta superar esas validaciones y contar con autorización expresa.

## Archivos documentales
- `checkpoint.md`
- `Tareas.txt`
- `Auditoría.txt`
- `ChangesLogs.txt`

## Commits generados durante el registro
- Checkpoint inicial: `753bb69d5bf4a22b53b6c2628767997342ceab31`
- Registro en Tareas.txt: `98a9308ea694b02827381af83999104261d0f948`
- Auditoría: `faa4664b5c2801d94fe4e880b2cbf648e3939dba`
- ChangesLogs.txt: `e3000429bd49e42f9938ab15ae397a71ba4a97c3`
- El presente cierre actualiza el checkpoint como último registro documental. La secuencia de commits no respetó el requisito de un único commit por tarea; se deja expresamente registrado como desviación del procedimiento para no ocultarla.

## Próxima acción concreta
Corregir la propagación de `getDeveloperSessionPayload()` en `backupDatabase` y auditar las demás llamadas ADMIN a `runAction()` para detectar omisiones equivalentes. Mantener la validación backend intacta. No desplegar Apps Script sin autorización.

---

# TAREA EN CURSO — REGISTRO DEL ERROR backupDatabase Y CONTINUIDAD DE ADMIN 0

**Registro inicial — 2026-11-04**
- Repositorio: `infogpstech/GPSpedia`.
- Rama de trabajo autorizada: `GPSpedia2.2.5_work`.
- Rama base protegida: `GPSpedia2.2.5`.
- Último commit conocido al iniciar: `133a9df0ec43059520af87152c4a7bd663ac3e0c`.
- Alcance inmediato: documentar en Tareas.txt el error de autorización reportado al ejecutar `backupDatabase`; registrar evidencia y limitaciones en Auditoría.txt; mantener el checkpoint actualizado.
- Alcance aprobado para la migración: seguir el esquema gradual ya documentado (AUTH con verificación dual y migración al login; después USERS escribe hashes; luego evaluar migración por lotes de cuentas restantes).
- No se dispone de copia de prueba de la Spreadsheet. Por ello, esta tarea no modificará código de AUTH/USERS, contraseñas ni datos de Google Sheets; tampoco se desplegarán servicios.
- Incidencia reportada: HTTP 500 en `backupDatabase`, etapa «Ejecución de acción individual», función `routeAction`, mensaje «Acceso denegado: sesión no autorizada», con referencia a `api-config.js:64`, `ui.js:3166` y `ui.js:3545`.
- El mensaje recibido es evidencia del rechazo, pero todavía no determina si la causa es ausencia de sesión en el payload, sesión caducada, validación de rol o contrato de autorización del servicio.
- Archivos previstos para esta tarea documental: `checkpoint.md`, `Tareas.txt`, `Auditoría.txt`, `ChangesLogs.txt`.
- Estado inicial: documentación por actualizar; auditoría específica de la ruta backupDatabase pendiente.
- Siguiente acción: auditar el flujo de respaldo y autorización para registrar con precisión el alcance de la incidencia; mantener la migración de contraseñas como tarea separada.

---

# CHECKPOINT — GPSpedia

**Última actualización:** 2026-11-04  
**Estado:** endpoints AUTH/USERS configurados en la rama de trabajo; USERS fue actualizado nuevamente y redeplegado manualmente por el usuario tras reportarse «Failed to fetch» al cargar usuarios. La corrección está pendiente de validación funcional. ADMIN 0 continúa abierta.

## 1. Repositorio y reglas

- Repositorio: `infogpstech/GPSpedia`
- Rama de trabajo autorizada: `GPSpedia2.2.5_work`
- Rama base protegida: `GPSpedia2.2.5`
- HEAD al inicio de esta tarea: `d9430ee8b401d0c9f34e081696bb6e171b4c32e5`
- Modificar únicamente la rama de trabajo. No realizar merge ni despliegues sin autorización expresa.
- Leer `Proceso de desarollo.md` antes de cada tarea.
- Un único commit por tarea, agrupando código y documentación.
- Auditar antes de editar, respaldar, verificar, comparar, ejecutar Code Review y documentar.
- Actualizar este archivo al inicio y como último paso documental antes del commit.

## 2. Trabajo anterior

- Se reorganizó el modal de desarrollador en cinco secciones y se mejoró su presentación responsive. PR #128 permanece abierto, en borrador y sin merge.
- Se registró el plan ADMIN 0–11.
- Se implementaron previamente controles de autorización en ADMIN y FEEDBACK y transmisión de sesión desde la interfaz.
- Se actualizaron los endpoints ADMIN y FEEDBACK en `api-config.js`; la configuración no demuestra que los despliegues estén actualizados.
- El commit `ed92f3a9b383c8d92f53f0ecf0fb146a37bba868` documentó cambios de AUTH, pero su diff no incluye `Services/Auth.js`. La auditoría actual confirmó que parte de esa corrección no estaba aplicada.

## 3. ADMIN 0 — estado actual

### Hallazgos confirmados en esta iteración

- `Services/Auth.js`: `doPost()` registraba el payload completo, que incluye la contraseña durante login.
- `handleLogin()` registraba la contraseña almacenada y la recibida en el evento de comparación.
- `handleLogin()` registraba el nombre de usuario en Logs.
- El endpoint debug de AUTH exponía el ID de Spreadsheet y nombres de hojas.
- `Services/users.js` guarda contraseñas directamente en la columna Password al crear, actualizar o cambiar una contraseña. La comparación se realiza en texto claro.
- AUTH también compara directamente el valor almacenado con el recibido.

### Alcance de la corrección aplicada

- Se retiró el registro del payload completo.
- Se retiró el evento que registraba las contraseñas y el nombre de usuario.
- Se limitó debug a informar disponibilidad del servicio.
- No modificar la comparación de credenciales, tokens, sesiones ni el esquema de Users.

### Bloqueos pendientes

1. Revisar la hoja Logs desplegada para identificar registros históricos con credenciales. No hay acceso a la Spreadsheet desde esta sesión.
2. Diseñar y probar una migración segura compatible entre AUTH y USERS, incluyendo formato versionado, cuentas existentes, rendimiento de Apps Script y reversión.
3. Ejecutar pruebas reales de sesiones y privilegios.
4. Validar los despliegues independientes de Apps Script.
5. Confirmar el comportamiento posterior al despliegue.

ADMIN 0 permanece abierta. No iniciar ADMIN 1–11 hasta resolver los bloqueos de seguridad.

## 4. Validaciones y limitaciones

- Se inspeccionó estáticamente `Services/Auth.js` y `Services/users.js`, incluyendo login, creación, actualización y cambio de contraseña.
- No se accedió a Google Sheets ni a la hoja Logs.
- No se ejecutaron pruebas con cuentas reales ni endpoints desplegados.
- No se confirmó la ejecución con el runtime V8 de Apps Script.
- Los endpoints configurados se encuentran en `api-config.js`; no se deben copiar secretos o URLs operativas en este checkpoint.

## 5. Próxima acción

Definir y validar la migración de contraseñas para AUTH y USERS con una copia de prueba, incluyendo estrategia de migración de cuentas existentes, rendimiento y reversión. Obtener acceso controlado a Logs y a un entorno de prueba antes de cambiar la columna Password.

## 6. Historial y continuidad

- Commit de implementación inicial ADMIN 0: `ed92f3a9b383c8d92f53f0ecf0fb146a37bba868`.
- Commit previo a esta iteración: `e53a38847daab99d73034b527a35a5768b7e404c`.
- PR #128: abierto, en borrador, sin merge.
- No se modificó la rama base `GPSpedia2.2.5`.


## 7. Tarea actual — autorización y purga selectiva de Logs

### Registro inicial
- Repositorio: `infogpstech/GPSpedia`
- Rama de trabajo: `GPSpedia2.2.5_work`
- Rama base protegida: `GPSpedia2.2.5`
- HEAD inicial verificado: `d9430ee8b401d0c9f34e081696bb6e171b4c32e5`
- Alcance autorizado: actualizar URL AUTH; enviar userId/sessionToken para clearActivityLogs; crear una operación protegida que retire de Logs únicamente los registros confidenciales.
- Archivos auditados: api-config.js, ui.js, Services/feedback.js y el esquema de escritura de Logs en Services/Auth.js.
- No se modificó código durante la fase de auditoría.
- Los blobs originales de los siete archivos se conservaron como respaldos Git, identificados en Auditoría.txt.

### Resultado de implementación
- api-config.js: URL AUTH actualizada; clearActivityLogs transmite keepLastWeek y contexto de sesión; clearSensitiveLogs se enruta a FEEDBACK.
- ui.js: el botón obtiene userId/sessionToken desde getDeveloperSessionPayload() y ejecuta ambas operaciones.
- Services/feedback.js: clearSensitiveLogs exige sesión válida y rol Desarrollador; elimina únicamente filas de Logs cuyos detalles contienen campos de credenciales, el evento Password comparison o los registros handleLogin started con username.
- La fila de encabezados y los registros no coincidentes se conservan. La opción de última semana continúa aplicándose solo a ActividadUsuario.
- No se modificó la rama base, no se realizó merge y no se desplegaron servicios.

### Verificaciones y limitaciones
- Se verificaron estáticamente las rutas, el mapa de acciones, los helpers, la sesión enviada por UI, el permiso backend y el alcance de la operación sobre Logs.
- No se ejecutó el código en Apps Script ni se accedió a la Spreadsheet real.
- No se confirmó el número de registros históricos que cumplen los criterios.
- No se validó el nuevo endpoint AUTH en el navegador ni el despliegue FEEDBACK.
- La implementación queda pendiente de pruebas en una copia de Spreadsheet y validación de roles/sesiones en entorno controlado.

### Próxima acción concreta
Desplegar Services/feedback.js en el proyecto FEEDBACK correspondiente y validar la purga primero sobre una copia de la Spreadsheet; después comprobar el botón en live y el nuevo endpoint AUTH. No realizar merge ni otros despliegues sin autorización expresa.

### Commit
El commit que incorpora este checkpoint y todos los archivos de la tarea se identifica en el historial de `GPSpedia2.2.5_work`; no se generan commits separados para el checkpoint.


## 8. Tarea — actualización del endpoint FEEDBACK

### Registro inicial
- Repositorio: `infogpstech/GPSpedia`
- Rama de trabajo: `GPSpedia2.2.5_work`
- Rama base protegida: `GPSpedia2.2.5`
- HEAD inicial verificado: `babf5ce494fdcf6b32f519d37acbc85d25adf2c7`
- Alcance: sustituir únicamente la URL de `API_ENDPOINTS.FEEDBACK` en `api-config.js` por la dirección nueva proporcionada y documentar la tarea.
- Archivos auditados: `api-config.js`, `checkpoint.md`, `Auditoría.txt`, `ChangesLogs.txt` y `Tareas.txt`; se leyó `Proceso de desarollo.md`.
- Se confirmó que las acciones de FEEDBACK, incluidas `clearActivityLogs` y `clearSensitiveLogs`, usan el enrutamiento central.
- Los blobs originales se conservan en Git y se referencian en `Auditoría.txt` como respaldo previo a la edición.

### Resultado
- `api-config.js`: se reemplazó exclusivamente el valor de `API_ENDPOINTS.FEEDBACK`.
- Se agruparon el código y los registros documentales de esta tarea en un único commit.

### Verificaciones y limitaciones
- Se comprobó que la URL anterior aparecía una sola vez antes del cambio.
- Se comprobó estáticamente que las acciones FEEDBACK se resuelven mediante `API_ENDPOINTS[service]` y que no existe un destino FEEDBACK alternativo en el archivo auditado.
- No se realizó una solicitud funcional al nuevo endpoint ni se inspeccionó el deployment Apps Script.
- Sigue pendiente confirmar que el deployment FEEDBACK contiene la operación `clearSensitiveLogs` antes de usar la purga en live.
- No se desplegó Apps Script, no se hizo merge y no se modificó la rama base.

### Estado final
- Estado: commit creado en la rama de trabajo; validación del deployment pendiente.
- Archivos modificados: `api-config.js`, `checkpoint.md`, `Auditoría.txt`, `ChangesLogs.txt`, `Tareas.txt`.
- Code Review estático: el cambio de código se limita al valor FEEDBACK; sin alteración del mapa de acciones ni del router.
- HEAD anterior: `babf5ce494fdcf6b32f519d37acbc85d25adf2c7`; el commit que incorpora esta tarea y el checkpoint queda registrado en el historial de Git.
- Siguiente acción: verificar el nuevo endpoint y confirmar la publicación de `clearSensitiveLogs` en FEEDBACK, sin desplegar ni hacer merge sin autorización.


## 9. Tarea — corrección de purga, orden de Logs y control remoto de sesiones

### Registro inicial
- HEAD inicial verificado: `58f58b0e65b0f243ae140efc0532710170fc0472`.
- Se registró el alcance antes de completar la auditoría y realizar modificaciones.
- El usuario confirmó el despliegue FEEDBACK, las pruebas manuales de login válido/no válido y que el endpoint AUTH ya fue actualizado en un commit anterior.

### Resultado de implementación
- Se separaron los botones de purga: ActividadUsuario y registros confidenciales de Logs. Ninguno ejecuta la operación del otro.
- Services/Auth.js: logToSheet() inserta cada registro nuevo en la fila 2 mediante insertRowBefore(2), escribe las cuatro columnas y conserva los encabezados. Se usa LockService dentro del proyecto AUTH.
- Services/users.js: se agregó resetUserSessions, protegida por sesión válida y rol Desarrollador; elimina todas las filas ActiveSessions del usuario objetivo y limpia Users.SessionToken. No permite cerrar la sesión del propio administrador.
- api-config.js: resetUserSessions se enruta a USERS.
- users.html: se añadió «Cerrar sesiones» para usuarios distintos del administrador y solo para el rol Desarrollador.
- index.html y ui.js: controles y handlers independientes para ambas purgas.

### Archivos modificados
- Services/Auth.js
- Services/users.js
- api-config.js
- users.html
- index.html
- ui.js
- Auditoría.txt
- ChangesLogs.txt
- Tareas.txt
- checkpoint.md

### Verificaciones
- Sintaxis estática: Services/Auth.js, Services/users.js, ui.js y módulo inline de users.html sin errores.
- Aserciones de ruta, separación de operaciones y autorización: todas superadas.
- Simulación de inserción: el registro nuevo queda en fila 2, después del encabezado.
- Simulación de eliminación de sesiones: se eliminan todas las filas del usuario objetivo y se conservan las de otros usuarios.
- FEEDBACK desplegado y pruebas de login válido/no válido: confirmados por el usuario, no reproducidos desde esta sesión.

### Limitaciones y pendientes
- No se ejecutó el código en Apps Script ni se accedió a la Spreadsheet real.
- Services/Auth.js requiere actualización del despliegue AUTH para activar la inserción en fila 2.
- Services/users.js requiere actualización del despliegue USERS para activar resetUserSessions.
- Pendiente probar purga selectiva de Logs sobre copia de Spreadsheet, confirmando que ActividadUsuario permanece intacta.
- Pendiente probar cierre de sesiones con varios tokens, token inválido, rol no Desarrollador y sesión del administrador.
- ADMIN 0 permanece abierta por la migración de contraseñas almacenadas en texto claro y la revisión de registros históricos reales.

### Restricciones conservadas
- No se modificó GPSpedia2.2.5.
- No se realizó merge ni despliegue de Apps Script.
- HEAD anterior: `58f58b0e65b0f243ae140efc0532710170fc0472`. El commit único que incorpora esta tarea y el checkpoint quedará identificado en el historial de GPSpedia2.2.5_work.

### Siguiente acción
Actualizar AUTH y USERS en sus proyectos Apps Script correspondientes y ejecutar las pruebas reales descritas antes de considerar cerrada ADMIN 0.


## 10. Tarea — actualización de endpoints AUTH y USERS

### Registro inicial
- Fecha: 2026-11-04.
- Repositorio: infogpstech/GPSpedia.
- Rama autorizada: GPSpedia2.2.5_work.
- HEAD inicial verificado: 2678ee0242a4b78be61d6c799f6a53d6ce8d0715.
- Rama base protegida: GPSpedia2.2.5; su referencia se mantuvo sin cambios.
- Alcance: sustituir únicamente las URLs AUTH y USERS en API_ENDPOINTS de api-config.js y documentar la tarea.
- Se leyó Proceso de desarollo.md. Se confirmó la regla de un único commit por tarea, incluyendo código y documentación.

### Resultado
- api-config.js: se actualizaron exclusivamente API_ENDPOINTS.AUTH y API_ENDPOINTS.USERS con las direcciones proporcionadas.
- ACTION_TO_SERVICE_MAP conserva login/validateSession hacia AUTH y las acciones de usuarios, incluido resetUserSessions, hacia USERS.
- No se modificaron otros endpoints, el router ni los helpers.
- Se agruparon los cambios de código y documentación en un único commit.

### Verificaciones y limitaciones
- Antes del cambio, cada URL anterior aparecía exactamente una vez y las nuevas no estaban presentes.
- Después del cambio, cada URL nueva aparece exactamente una vez y las anteriores ya no aparecen.
- Se comprobó que el mapa de acciones mantiene el enrutamiento AUTH/USERS y que los endpoints LEGACY, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN no se modificaron.
- No se ejecutaron pruebas funcionales contra Apps Script ni se verificó el contenido publicado de los deployments.
- La actualización de api-config.js no publica código Apps Script. La activación de los cambios de Services/Auth.js y Services/users.js continúa dependiendo de que los proyectos AUTH y USERS tengan sus versiones correspondientes desplegadas.
- No se realizó merge, no se modificó la rama base y no se efectuó ningún despliegue.

### Archivos incluidos
- api-config.js
- checkpoint.md
- Auditoría.txt
- ChangesLogs.txt
- Tareas.txt

### Estado
Configuración actualizada en la rama de trabajo; validación funcional y confirmación de los deployments AUTH/USERS pendientes. El único commit de esta tarea queda identificado en el historial de GPSpedia2.2.5_work.



## 11. Incidencia — error al cargar usuarios y nueva actualización de USERS

### Estado de Git al iniciar este checkpoint
- Repositorio: `infogpstech/GPSpedia`.
- Rama autorizada: `GPSpedia2.2.5_work`.
- Rama base protegida: `GPSpedia2.2.5`.
- HEAD verificado: `62c5b68ce5f7195f97f84851cd4c989d64e27521`.
- Commit anterior de actualización conjunta AUTH/USERS: `4e480cb751880d1a07bcc9f48218e6911cafa5d0`.
- El commit `62c5b68` es hijo directo de `4e480cb` y modifica únicamente `api-config.js`, actualizando nuevamente el endpoint USERS. Este commit ya existía antes de crear este checkpoint.
- No se modificó la rama base ni se realizó merge.

### Última tarea realizada y resultados
1. Se actualizaron los endpoints AUTH y USERS en `api-config.js` en un único commit (`4e480cb`), manteniendo el mapa de acciones y los demás endpoints.
2. Después, al intentar cargar la información de usuarios desde GPSpedia, apareció el error «Failed to fetch».
3. El usuario comprobó que la URL de Apps Script que había pegado en el chat daba error al abrirse directamente, pero que la URL generada/mostrada por Apps Script sí funcionaba al abrirla.
4. El usuario actualizó nuevamente el endpoint USERS, volvió a desplegar manualmente el proyecto Apps Script y actualizó el valor configurado en `api-config.js`.
5. El nuevo endpoint quedó registrado en el commit `62c5b68ce5f7195f97f84851cd4c989d64e27521` (`Update USERS API endpoint URL`). La URL operativa completa se consulta en `api-config.js`; no se transcribe aquí.

### Estado de la incidencia
- El usuario espera comprobar si el nuevo despliegue y endpoint resuelven el problema.
- Aún no existe confirmación de que la pantalla de usuarios cargue correctamente.
- Abrir el endpoint en el navegador no demuestra que la solicitud POST de `getUsers` funcione desde la aplicación.
- No se ejecutó desde esta sesión una prueba funcional ni se inspeccionó la respuesta real del deployment.
- No atribuir «Failed to fetch» a una causa concreta sin revisar la solicitud y su respuesta; deben considerarse red, redirecciones y CORS como hipótesis por verificar.

### Contexto técnico relacionado
- En `api-config.js`, `getUsers` se enruta mediante `ACTION_TO_SERVICE_MAP` hacia `API_ENDPOINTS.USERS`.
- `routeAction()` realiza POST con cuerpo JSON `{ action, payload }`, encabezado `Content-Type: text/plain` y `redirect: 'follow'`.
- `resetUserSessions` también está enrutada hacia USERS.
- En una tarea previa, `Services/users.js` fue modificado para permitir que un Desarrollador cierre las sesiones de otro usuario, con validación de sesión y rol.
- `Services/Auth.js` fue modificado para insertar los registros nuevos de Logs en la fila 2; esta funcionalidad depende de su propio deployment AUTH.
- Actualizar la URL en el frontend y desplegar el código de Apps Script son operaciones distintas.

### Siguiente paso concreto
1. Esperar el resultado de la prueba del usuario: volver a cargar la sección de usuarios desde GPSpedia en `GPSpedia2.2.5_work` después del redeployment manual de USERS.
2. Si funciona, registrar la validación como resultado reportado por el usuario y no cambiar más endpoints innecesariamente.
3. Si persiste «Failed to fetch», auditar la ruta `getUsers`: inspeccionar la solicitud POST real desde `routeAction()`, la URL efectiva después de redirecciones, la respuesta HTTP y los registros/errores del deployment USERS. Comparar la URL generada por Apps Script con la configurada, sin inferir ni construir una URL alternativa.
4. Confirmar que el deployment activo de USERS contiene la versión requerida de `Services/users.js` y que las acciones existentes siguen enrutándose correctamente.
5. No desplegar Apps Script, modificar otros endpoints ni hacer merge sin autorización expresa.

### Reglas para continuar
- Leer `Proceso de desarollo.md` y este checkpoint antes de iniciar la siguiente tarea.
- Trabajar únicamente en `GPSpedia2.2.5_work`; mantener protegida `GPSpedia2.2.5`.
- Un único commit por tarea. No crear commits vacíos ni commits intermedios; agrupar todos los cambios de la tarea en un solo commit tras completar verificaciones y registros.
- Este checkpoint refleja el estado observado y no declara resuelta la incidencia.


================================================================================
TAREA — CORREGIR TRANSMISIÓN DE SESIÓN EN INBOX Y DASHBOARD
Fecha: 2026-11-04 | Rama: GPSpedia2.2.5_work

REGISTRO INICIAL
- HEAD inicial verificado: 15809d8f7d4dcf6839f83fb6422b3e62ec8a08f6.
- Alcance: corregir la transmisión de userId/sessionToken desde ui.js y api-config.js para operaciones protegidas de FEEDBACK.
- Archivos previstos: ui.js, api-config.js, checkpoint.md, Auditoría.txt, ChangesLogs.txt y Tareas.txt. Services/feedback.js se auditó y no se modificó.
- Hallazgo: las cargas de Inbox/Dashboard y las acciones del Inbox omitían el payload de sesión; el backend ya exige sesión válida y permisos por rol.
- Estado inicial: código funcional sin modificar; no se desplegó Apps Script ni se realizó commit.

RESULTADO FINAL
- Estado: IMPLEMENTACIÓN ESTÁTICA COMPLETADA; VALIDACIÓN FUNCIONAL LIVE PENDIENTE.
- HEAD anterior a la tarea: 15809d8f7d4dcf6839f83fb6422b3e62ec8a08f6.
- Archivos modificados: ui.js, api-config.js, checkpoint.md, Auditoría.txt, ChangesLogs.txt y Tareas.txt.
- ui.js transmite getDeveloperSessionPayload() en la consulta del Dashboard, las dos rutas de carga de Inbox y las acciones de aprobar/rechazar vídeo, responder, resolver y eliminar.
- api-config.js propaga sessionPayload en getFeedbackItems, getActivityLogs, replyToFeedback, markAsResolved, deleteFeedbackItem, approveVideo y rejectVideo.
- Services/feedback.js permanece sin cambios; se conservan assertFeedbackSession y actionPermissions.
- Verificación estática: se comprobaron una llamada Dashboard, dos llamadas de carga Inbox, cinco acciones de Inbox y los siete wrappers; todas las aserciones fueron satisfactorias.
- Comparación: las sustituciones se limitaron a las llamadas y wrappers relacionados con la transmisión de sesión; la documentación registra el alcance.
- No se ejecutaron pruebas HTTP reales, no se inspeccionó Network/Console y no se verificó el deployment Apps Script. La validación live queda pendiente.
- No se modificó la rama base, no se hizo merge y no se desplegó Apps Script.
- El commit de esta tarea se identificará en el historial de Git una vez creado.

SIGUIENTE ACCIÓN
- Probar Inbox y Dashboard en GPSpedia live con sesión válida. Si falla, capturar la respuesta HTTP y los registros del deployment FEEDBACK para distinguir sesión, permisos, CORS o acceso a Spreadsheet.
================================================================================


================================================================================
TAREA — AUDITORÍA Y DISEÑO DE MIGRACIÓN DE CONTRASEÑAS (ADMIN 0)
Fecha: 2026-11-05 | Rama: GPSpedia2.2.5_work

REGISTRO INICIAL
- Repositorio: infogpstech/GPSpedia.
- Rama de trabajo: GPSpedia2.2.5_work; rama base protegida: GPSpedia2.2.5.
- HEAD inicial: 27760cf7542028773a0b87e3a48139dc8bda9ff7.
- El usuario confirmó que Inbox y Dashboard funcionan tras el commit anterior.
- Alcance: auditar flujos de login, creación, actualización y cambio de contraseña; diseñar migración compatible entre AUTH y USERS. No modificar datos reales ni desplegar Apps Script.
- Archivos auditados: Services/Auth.js, Services/users.js, auth.js, api-config.js y users.html. Documentación: checkpoint.md, Auditoría.txt, ChangesLogs.txt y Tareas.txt.
- Bloqueos conocidos: sin acceso confirmado a Spreadsheet productiva, Logs reales o entorno de prueba; AUTH y USERS tienen deployments independientes.
- Estado inicial: auditoría estática pendiente; código funcional sin modificar.

RESULTADO FINAL
- Estado: AUDITORÍA COMPLETADA; DISEÑO DOCUMENTADO; IMPLEMENTACIÓN BLOQUEADA POR VALIDACIONES Y DECISIONES PENDIENTES.
- Se confirmó texto claro en AUTH (comparación de login) y en tres escrituras de USERS: crear usuario, actualización administrativa y cambio de contraseña.
- Se detectó diferencia de normalización: login aplica trim() a ambos valores; changePassword compara exactamente.
- Se identificó que el frontend exige ocho caracteres al cambiar contraseña, pero el backend no aplica esa misma validación.
- Se documentó una estrategia propuesta: formato versionado en Password; KDF resistente con salt y parámetros almacenados; verificación dual temporal en AUTH; actualización de todos los escritores en USERS; migración por lotes de cuentas restantes sobre copia de Spreadsheet; despliegue coordinado AUTH antes que USERS.
- No se seleccionó ni implementó KDF porque falta validar biblioteca/compatibilidad Apps Script V8 y rendimiento. No se migraron cuentas ni se modificó la hoja.
- Se registró fuera de alcance la discrepancia SESSION_LIMITS para el rol Gefe; requiere confirmar el límite esperado.
- Archivos modificados: únicamente documentación (checkpoint.md, Auditoría.txt, ChangesLogs.txt y Tareas.txt). No se modificaron Services/Auth.js, Services/users.js, auth.js, api-config.js ni users.html.
- No se ejecutó Apps Script, no se inspeccionó Logs real, no se accedió a la Spreadsheet y no se desplegó ningún servicio.
- ADMIN 0 permanece abierta.
- HEAD anterior a la tarea: 27760cf7542028773a0b87e3a48139dc8bda9ff7. El commit único que incorpora esta auditoría documental quedará identificado en el historial de la rama.

SIGUIENTE ACCIÓN
- Confirmar política de espacios en contraseñas y habilitar una copia de prueba de la Spreadsheet. Después validar una implementación KDF compatible con Apps Script V8, con vectores de prueba y medición de rendimiento antes de modificar AUTH/USERS.
================================================================================


================================================================================
CHECKPOINT INICIAL — VIABILIDAD KDF Y NORMALIZACIÓN (ADMIN 0)
Fecha: 2026-11-05
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5
HEAD inicial confirmado: 971bd34447157a73c152f73710997a9e5fcf69ea

TAREA Y ALCANCE
- Confirmar política de normalización de contraseñas y validar compatibilidad/rendimiento de una KDF en Apps Script V8 antes de modificar AUTH/USERS.
- Política confirmada: trim() en ambos extremos; espacios internos preservados; comparación sensible a mayúsculas/minúsculas; mínimo de ocho caracteres validado en backend después de normalizar.
- No modificar datos reales, no desplegar Apps Script y no hacer merge.

ESTADO Y DEPENDENCIAS CONOCIDAS
- El usuario confirmó que backupDatabase generó un respaldo accesible.
- AUTH y USERS son proyectos Apps Script separados que comparten Users.Password.
- AUTH compara actualmente contraseñas legacy con trim(); USERS tiene tres rutas de escritura que almacenan texto sin hash y changePassword compara sin trim().
- La compatibilidad de Web Crypto/crypto.subtle y el rendimiento de PBKDF2 no están verificados en el runtime Apps Script V8.
- No se confirmó todavía una Spreadsheet independiente restaurada/duplicada para pruebas.

ARCHIVOS Y FUNCIONALIDADES AUDITADOS
- Services/Auth.js: handleLogin() y lectura/escritura de sesión.
- Services/users.js: handleCreateUser(), handleUpdateUser() y handleChangePassword().
- auth.js: envío de credenciales y persistencia de sesión local.
- users.html: formularios y validación frontend de cambio de contraseña.
- api-config.js: enrutamiento AUTH/USERS.
- Auditoría.txt, ChangesLogs.txt, Tareas.txt y checkpoint.md.

FASE AL CREAR EL CHECKPOINT
- Política de normalización confirmada; auditoría técnica en curso.
- Los blobs originales de los archivos documentales se conservan como referencias de respaldo en Git antes de su actualización.
================================================================================

================================================================================
CIERRE DE FASE — VIABILIDAD KDF Y NORMALIZACIÓN (ADMIN 0)
Estado: AUDITORÍA COMPLEMENTARIA COMPLETADA; IMPLEMENTACIÓN BLOQUEADA POR PRUEBA DE RUNTIME.

RESULTADO
- Se documentó la política de normalización acordada y los cuatro flujos afectados.
- Se confirmó que la verificación actual de AUTH es compatible con trim() y que USERS tiene una comparación distinta en cambio de contraseña.
- Se confirmó que los tres escritores de USERS guardan actualmente texto sin hash.
- No se eligió una KDF porque no se ha probado Web Crypto ni el rendimiento de una alternativa PBKDF2 en Apps Script V8.
- No se modificó código fuente ni datos de Google Sheets; no se ejecutó Apps Script ni se desplegó.

ARCHIVOS MODIFICADOS
- Auditoría.txt
- ChangesLogs.txt
- Tareas.txt
- checkpoint.md

VERIFICACIONES Y LIMITACIONES
- Revisión estática de Services/Auth.js, Services/users.js, auth.js, users.html y api-config.js.
- No se ejecutaron vectores criptográficos ni benchmark en Apps Script V8.
- No se comprobó una copia de Spreadsheet restaurada/duplicada; el respaldo generado y accesible no se considera automáticamente un entorno de prueba.
- No se modificó GPSpedia2.2.5, no se hizo merge y no se desplegó Apps Script.

CONTINUIDAD
- HEAD anterior a esta fase: 971bd34447157a73c152f73710997a9e5fcf69ea.
- Siguiente acción: ejecutar el diagnóstico KDF en AUTH y USERS y confirmar una Spreadsheet independiente de prueba. Después seleccionar la KDF, implementar la verificación dual y los escritores hash, probar la migración sobre la copia y coordinar despliegues con AUTH primero.
- El commit único que incorpora esta documentación quedará identificado en el historial de GPSpedia2.2.5_work.
================================================================================


================================================================================
CHECKPOINT INICIAL — HASH SHA-256 Y LÍMITE DE INTENTOS (ADMIN 0)
Fecha: 2026-11-05
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5
HEAD inicial confirmado: b70c9c95e9f751d6ef6261f800d778b2a4e356ac
HEAD de rama base: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Diferencia inicial: 130 commits ahead, 0 behind.

TAREA Y ALCANCE
- Sustituir la evaluación PBKDF2/KDF de ADMIN 0 por SHA-256 con salt individual y control de cinco intentos fallidos con bloqueo de 15 minutos.
- Actualizar AUTH y los tres escritores de contraseña en USERS.
- Mantener compatibilidad con registros legacy mediante conversión gradual después de un login correcto.
- No desplegar Apps Script, modificar datos productivos ni hacer merge.

ESTADO REAL AL INICIO
- No se habían realizado cambios de código para esta tarea.
- AUTH comparaba Users.Password en texto claro.
- USERS guardaba texto claro al crear usuarios, actualizar administrativamente la contraseña y cambiar la contraseña propia.
- AUTH y USERS son proyectos Apps Script independientes que comparten Users.Password.
- El usuario ya confirmó la política trim() en ambos extremos, espacios internos conservados, comparación case-sensitive y mínimo de ocho caracteres para contraseñas nuevas.
- La prueba PBKDF2 anterior fue descartada por decisión del usuario; sus resultados permanecen como antecedente histórico, no como requisito vigente.
- No se confirmó una copia independiente de Spreadsheet para pruebas.

ARCHIVOS Y FUNCIONALIDADES
- Services/Auth.js: login, formato hash, migración legacy y contador de intentos.
- Services/users.js: alta, actualización administrativa y cambio propio de contraseña.
- Auditoría.txt, ChangesLogs.txt, Tareas.txt y checkpoint.md.

RESPALDOS Y RIESGOS
- Services/Auth.js original: blob f47dcf75f01320eb3ce759ff5d57adeeaae122ad.
- Services/users.js original: blob 8a1148704175d114389d082d80f675a9718f13e8.
- No se modificarán otras funciones de sesión, RBAC, endpoints ni estructura de Spreadsheet.
- CacheService ofrece bloqueo temporal de mejor esfuerzo y puede desalojar entradas; el bloqueo por cuenta también puede ser provocado por intentos de terceros.
- El despliegue deberá ser coordinado: AUTH primero y USERS después.

FASE AL CREAR EL CHECKPOINT
- Inicio documentado; auditoría y respaldo de los archivos involucrados registrados antes de implementar.

================================================================================
CIERRE DE TAREA — HASH SHA-256 Y LÍMITE DE INTENTOS (ADMIN 0)
Estado: IMPLEMENTACIÓN EN CÓDIGO Y REVISIÓN ESTÁTICA COMPLETADAS; VALIDACIÓN FUNCIONAL EN APPS SCRIPT PENDIENTE.

RESULTADO
- Services/Auth.js verifica contraseñas legacy y hashes SHA-256 con salt individual en formato sha256$<salt>$<digest>.
- Las contraseñas legacy se convierten a hash después de un login correcto, sin exigir retroactivamente ocho caracteres.
- AUTH limita a cinco intentos consecutivos por nombre de usuario y establece bloqueo de 15 minutos; el login correcto restablece el contador.
- Los errores internos revierten el intento reservado para no contar una falla del servicio como contraseña incorrecta.
- Services/users.js almacena hash al crear usuario, actualizar administrativamente la contraseña y cambiar la contraseña propia; la verificación de contraseña actual acepta legacy y hash.
- Se mantiene trim() en ambos extremos, espacios internos y comparación sensible a mayúsculas/minúsculas. Las contraseñas nuevas requieren ocho caracteres después de normalizar.

ARCHIVOS MODIFICADOS
- Services/Auth.js
- Services/users.js
- Auditoría.txt
- ChangesLogs.txt
- Tareas.txt
- checkpoint.md

VERIFICACIONES
- Compilación estática JavaScript: AUTH PASS; USERS PASS.
- Pruebas de lógica aislada con dobles de Apps Script: formato hash, verificación positiva/negativa, sensibilidad a mayúsculas, salts distintos, compatibilidad legacy, bloqueo en el sexto intento, reinicio y reversión de intento: PASS.
- Verificación SHA-256 UTF-8 y formato hexadecimal de 64 caracteres: PASS.
- Comparación de archivos contra los respaldos Git: cambios limitados a las funciones y registros descritos.
- No se ejecutó Apps Script real ni se validó el acceso a Spreadsheet; pruebas de integración y live pendientes.

LIMITACIONES Y PENDIENTES
- CacheService puede desalojar entradas antes de los 15 minutos; el límite no es persistente garantizado.
- SHA-256 con salt es rápido y no ofrece la resistencia offline de una KDF especializada; se implementa por decisión expresa del usuario.
- Probar en AUTH y USERS: login legacy, login hash, contraseña incorrecta, bloqueo tras cinco fallos, expiración, reinicio al login correcto, alta, actualización administrativa, cambio propio y rechazo de contraseñas nuevas menores de ocho caracteres.
- Desplegar AUTH primero y USERS después, únicamente con autorización expresa.
- No se realizó migración masiva, no se accedió ni modificó la Spreadsheet productiva, no se desplegó Apps Script y no se hizo merge.

CONTINUIDAD
- HEAD anterior a la tarea: b70c9c95e9f751d6ef6261f800d778b2a4e356ac.
- El único commit de la tarea incluirá código y documentación; su SHA será el HEAD resultante de GPSpedia2.2.5_work en el historial de Git.
- Siguiente acción: ejecutar pruebas controladas en ambos proyectos Apps Script antes de autorizar los despliegues.
================================================================================


================================================================================
CHECKPOINT INICIAL — ACTUALIZACIÓN DE URL AUTH Y USERS
Fecha: 2026-11-05
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5
HEAD inicial confirmado: 2e0bbcf78db6b7d775f59a0eef396084a690059c

TAREA Y ALCANCE
- Sustituir exclusivamente los valores API_ENDPOINTS.AUTH y API_ENDPOINTS.USERS en api-config.js por los dos URL proporcionados por el usuario.
- Mantener intactos los demás endpoints, el mapa de acciones, las funciones y el resto del código.
- Actualizar los registros obligatorios y generar un único commit que incluya todos los cambios y este checkpoint.

ESTADO REAL AL INICIO
- api-config.js declara API_ENDPOINTS como fuente central de los endpoints.
- AUTH se encontraba en la línea 9 y USERS en la línea 12.
- ACTION_TO_SERVICE_MAP enruta login/validateSession a AUTH y las operaciones de usuarios a USERS.
- La función routeAction() consume API_ENDPOINTS según el servicio asignado.
- No se identificaron motivos para modificar auth.js, users.html ni otros archivos de código.

ARCHIVOS Y FUNCIONALIDADES INVOLUCRADOS
- api-config.js: dos valores URL de API_ENDPOINTS.
- Auditoría.txt, ChangesLogs.txt, Tareas.txt y checkpoint.md: registros del procedimiento.

RESPALDO Y RIESGOS
- Respaldo exacto previo de api-config.js: blob Git b74270ffad51665db67d00befa4a517f810d33d0.
- No se modificará la rama base, no se hará merge ni se desplegarán proyectos Apps Script.
- La actualización de URL no valida por sí sola la disponibilidad, permisos ni compatibilidad de los deployments de destino.

FASE AL CREAR EL CHECKPOINT
- Inicio documentado antes de la auditoría y de la implementación.
================================================================================


================================================================================
CIERRE DE TAREA — ACTUALIZACIÓN DE URL AUTH Y USERS
Fecha: 2026-11-05
Estado: CAMBIO ESTÁTICO COMPLETADO; VALIDACIÓN FUNCIONAL DE DEPLOYMENTS PENDIENTE.

RESULTADO
- api-config.js: API_ENDPOINTS.AUTH ahora contiene el URL nuevo proporcionado por el usuario.
- api-config.js: API_ENDPOINTS.USERS ahora contiene el URL nuevo proporcionado por el usuario.
- No se modificaron los demás endpoints, ACTION_TO_SERVICE_MAP, routeAction() ni funciones auxiliares.

ARCHIVOS MODIFICADOS
- api-config.js
- Auditoría.txt
- ChangesLogs.txt
- Tareas.txt
- checkpoint.md

VERIFICACIONES REALIZADAS
- Se confirmó una coincidencia exacta para cada URL anterior antes de sustituirlo.
- La comparación del archivo antes/después detectó exactamente dos líneas diferentes: línea 9 (AUTH) y línea 12 (USERS).
- Se verificó que no hubo cambios estructurales ni alteraciones en otras líneas de api-config.js.
- Se revisó que los registros de auditoría, cambios, tareas y checkpoint describan únicamente esta tarea.

VALIDACIONES PENDIENTES Y LIMITACIONES
- No se realizaron solicitudes HTTP a los nuevos endpoints.
- No se comprobó el login, validación de sesión, carga de usuarios ni operaciones CRUD contra los deployments.
- No se ejecutó ni desplegó Apps Script.
- No se modificaron hojas de cálculo ni datos productivos.
- No se realizó merge.

CONTINUIDAD
- HEAD anterior a la tarea: 2e0bbcf78db6b7d775f59a0eef396084a690059c.
- El commit único de esta tarea incluye el cambio y los registros documentales, incluido este checkpoint.
- Siguiente acción: validar los servicios AUTH y USERS en la plataforma live. Si alguno falla, diagnosticar el endpoint correspondiente sin modificar otros servicios fuera del alcance.
================================================================================


================================================================================
CHECKPOINT INICIAL — NORMALIZAR ENLACE DE RESPALDO EN restoreDatabase
Fecha: 2026-11-05
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5
HEAD inicial confirmado: 975440c23d10fcb292c5e5266bc5c1ec9b1ec65a
Diferencia con rama base: 132 commits adelante, 0 atrás.

TAREA Y ALCANCE
- Aceptar ID limpio o enlace completo de Google Sheets como origen de restoreDatabase.
- Limpiar el enlace en ui.js y normalizarlo nuevamente en Services/admin.js.
- Mantener SPREADSHEET_ID como destino fijo. No cambiar restauración de Drive ni otros flujos.

ESTADO REAL AL INICIO
- El usuario confirmó que backupDatabase crea el respaldo y restoreDatabase restaura correctamente usando ID limpio.
- Con enlace completo, el HTTP 500 confirma que handleRestoreDatabase() pasa la URL sin normalizar a DriveApp.getFileById().
- Services/admin.js ya contiene extractDriveFileId(), que reconoce ID limpio y enlaces /d/ o ?id=; handleRestoreDatabase() no lo invoca.
- ui.js aplica trim() y envía directamente el valor como backupId.
- No se confirmó una Spreadsheet independiente para pruebas.

ARCHIVOS Y FUNCIONES
- ui.js: evento btn-admin-restore-db.
- Services/admin.js: extractDriveFileId() y handleRestoreDatabase().
- Auditoría.txt, ChangesLogs.txt, Tareas.txt y checkpoint.md.

RIESGOS Y RESPALDOS
- La restauración sobrescribe la Spreadsheet fija SPREADSHEET_ID; no alterar el destino.
- No ejecutar restauración ni desplegar Apps Script durante esta corrección estática.
- Blobs originales: ui.js d4a4a248a505cc549136f21f0b9211d1476c88e5; Services/admin.js f0b3f6f3ef28b52d8c2f9d5dccd3597b852dd3d9.

FASE
- Checkpoint inicial documentado; auditoría de los puntos involucrados completada antes de implementación.
================================================================================


================================================================================
CIERRE DE TAREA — NORMALIZAR ENLACE DE RESPALDO EN restoreDatabase
Fecha: 2026-11-05
Estado: IMPLEMENTACIÓN ESTÁTICA COMPLETADA; VALIDACIÓN LIVE DEL ENLACE COMPLETO PENDIENTE.

RESULTADO
- ui.js extrae el ID desde enlaces de Google Sheets con /d/ o ?id= y conserva los IDs limpios.
- Services/admin.js vuelve a normalizar backupId mediante extractDriveFileId() antes de utilizar DriveApp y SpreadsheetApp.
- SPREADSHEET_ID sigue determinando el destino; el ID extraído es únicamente el respaldo de origen.
- No se modificó restoreDrive, api-config.js ni otros flujos.

ARCHIVOS MODIFICADOS
- ui.js
- Services/admin.js
- Auditoría.txt
- ChangesLogs.txt
- Tareas.txt
- checkpoint.md

VERIFICACIONES
- Las sustituciones se aplicaron sobre bloques únicos y exactos.
- Pruebas aisladas: ID limpio, URL /spreadsheets/d/ y URL con ?id= producen el mismo ID esperado; URL inválida rechazada por ambos normalizadores: PASS.
- Revisión estática confirmó que DriveApp.getFileById() y SpreadsheetApp.openById() reciben backupId normalizado.
- Comparación con blobs originales: cambios limitados al evento btn-admin-restore-db, handleRestoreDatabase() y documentación.
- La restauración live con ID limpio fue confirmada por el usuario antes de esta tarea.

VALIDACIONES PENDIENTES
- No se ejecutó ni desplegó Apps Script.
- La aceptación del enlace completo en live requiere despliegue autorizado y prueba controlada.
- No se ejecutó restauración ni se modificaron datos de Sheets/Drive durante esta tarea.
- No se confirmó una Spreadsheet independiente de pruebas.
- No se realizó merge; la rama base permanece intacta.

CONTINUIDAD
- HEAD anterior: 975440c23d10fcb292c5e5266bc5c1ec9b1ec65a.
- El commit único de esta tarea incluye código y documentación.
- Siguiente acción: desplegar Services/admin.js según el flujo habitual, con autorización del usuario, y probar el enlace completo en restoreDatabase.
================================================================================


================================================================================
CHECKPOINT INICIAL — ACTUALIZACIÓN DE URL ADMIN
Fecha: 2026-11-05
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5
HEAD inicial confirmado: e5c49b1d320c84545f516cc82484fdb2da9c99e8
HEAD de rama base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1

TAREA Y ALCANCE
- Sustituir exclusivamente API_ENDPOINTS.ADMIN en api-config.js por el URL nuevo proporcionado por el usuario.
- Mantener intactos los demás endpoints, ACTION_TO_SERVICE_MAP, routeAction() y funciones auxiliares.
- Actualizar Auditoría.txt, ChangesLogs.txt, Tareas.txt y este checkpoint.
- Agrupar todos los cambios en un único commit sobre GPSpedia2.2.5_work; no modificar la rama base ni hacer merge.

ESTADO REAL AL INICIO
- api-config.js centraliza los endpoints en API_ENDPOINTS.
- ADMIN está declarado una sola vez y sus acciones administrativas se enrutan mediante ACTION_TO_SERVICE_MAP.
- La corrección reciente de restoreDatabase en Services/admin.js está en la rama de trabajo, pero su validación live requiere el deployment ADMIN actualizado.
- No se confirmó una copia independiente de la Spreadsheet para pruebas.
- No se ha desplegado Apps Script ni se han modificado datos productivos en esta tarea.

ARCHIVOS Y FUNCIONALIDADES INVOLUCRADOS
- api-config.js: valor API_ENDPOINTS.ADMIN.
- Auditoría.txt, ChangesLogs.txt, Tareas.txt y checkpoint.md: registros obligatorios.

RESPALDO Y RIESGOS
- Respaldo exacto previo de api-config.js: blob Git b5f0d5eaf2353dd9c593b0864e9416efbcb996d5.
- La actualización de URL no despliega el proyecto Apps Script ni valida por sí sola su disponibilidad.
- No se ejecutarán operaciones administrativas, no se alterarán hojas de cálculo y no se realizará merge.

FASE AL CREAR EL CHECKPOINT
- Estado inicial documentado antes de la auditoría y de la edición.
================================================================================


================================================================================
CIERRE DE TAREA — ACTUALIZACIÓN DE URL ADMIN
Fecha: 2026-11-05
Estado: CAMBIO ESTÁTICO COMPLETADO; VALIDACIÓN LIVE Y DESPLIEGUE ADMIN PENDIENTES.

RESULTADO
- api-config.js: API_ENDPOINTS.ADMIN contiene ahora el URL completo proporcionado por el usuario.
- Las acciones administrativas continúan asignadas al servicio ADMIN mediante ACTION_TO_SERVICE_MAP.
- No se modificaron otros endpoints, el mapa de acciones, routeAction() ni funciones auxiliares.

ARCHIVOS MODIFICADOS
- api-config.js
- Auditoría.txt
- ChangesLogs.txt
- Tareas.txt
- checkpoint.md

VERIFICACIONES REALIZADAS
- Auditoría completa estática de api-config.js, incluyendo configuración, mapa de acciones, router y helpers.
- Se confirmó una coincidencia única para el valor anterior y se sustituyó por el URL nuevo.
- Comparación post-edición: exactamente una línea modificada en api-config.js (línea 15).
- Se comprobó que las acciones ADMIN siguen mapeadas al servicio ADMIN.
- Revisión de documentación: entradas de auditoría, cambios, tareas y checkpoint limitadas al alcance solicitado.

VALIDACIONES PENDIENTES Y LIMITACIONES
- No se ejecutaron solicitudes HTTP ni pruebas funcionales contra el endpoint.
- No se desplegó Services/admin.js ni se confirmó que el deployment ADMIN activo contenga la corrección de restoreDatabase.
- No se ejecutaron acciones administrativas, respaldos ni restauraciones.
- No se modificaron datos de Google Sheets/Drive.
- No se confirmó una copia independiente de Spreadsheet para pruebas.
- No se realizó merge; la rama base protegida permanece intacta.

CONTINUIDAD
- HEAD anterior a esta tarea: e5c49b1d320c84545f516cc82484fdb2da9c99e8.
- El commit único que incorpora código y documentación quedará identificado en el historial de GPSpedia2.2.5_work.
- Siguiente acción: comprobar la disponibilidad del endpoint ADMIN y desplegar Services/admin.js por el flujo autorizado; después validar una acción no destructiva y preparar una prueba de restoreDatabase sin sobrescribir producción.
================================================================================


================================================================================
CHECKPOINT INICIAL — VALIDACIÓN LIVE DE restoreDatabase CON ENLACE COMPLETO
Fecha: 2026-11-05
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5
HEAD inicial confirmado: 800275ccb45c3de66439b098d3ce2567d52fa11a
HEAD de rama base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1

TAREA Y ALCANCE
- Registrar la confirmación del usuario de que restoreDatabase funciona al proporcionar el enlace completo de Google Sheets.
- Cerrar la validación pendiente de aceptación del enlace completo, manteniendo diferenciada la evidencia reportada por el usuario de las verificaciones ejecutadas directamente.
- Actualizar Auditoría.txt, ChangesLogs.txt, Tareas.txt y checkpoint.md; un único commit documental en la rama de trabajo.
- No modificar código, endpoints, deployments ni datos.

ESTADO REAL AL INICIO
- La rama de trabajo ya contiene la normalización del enlace en ui.js y Services/admin.js, y el URL ADMIN actualizado en api-config.js.
- El checkpoint anterior dejaba pendiente el despliegue/validación live de restoreDatabase con enlace completo.
- El usuario acaba de confirmar: «Restaura desde enlace completo funciona».
- La confirmación funcional procede del usuario; no se dispone de acceso directo al runtime Apps Script para reproducirla independientemente.
- No se confirmó una copia independiente de Spreadsheet para pruebas.

ARCHIVOS Y FUNCIONALIDADES INVOLUCRADOS
- Auditoría.txt: registrar la evidencia y alcance de la validación reportada.
- ChangesLogs.txt: registrar el cambio de estado documental.
- Tareas.txt: cerrar la tarea de aceptar enlace completo.
- checkpoint.md: conservar historial y actualizar continuidad.

RESPALDOS Y RIESGOS
- Blobs originales previos a esta actualización: checkpoint.md f7e8da3e5d2d9a03962f155ff00b26b6122f5f68; Auditoría.txt d07dfc89d5e7172acd97a4193c0124a7eea46385; ChangesLogs.txt 4194607ff67d5e5c37795ba7a72a76ef083edcd4; Tareas.txt 7306c5564d160e80cc23ab6e493246a81b297efc.
- No ejecutar otra restauración; no modificar datos de Sheets/Drive.
- No desplegar Apps Script, no alterar código y no hacer merge.

FASE AL CREAR ESTE CHECKPOINT
- Inicio documentado antes de auditar y actualizar los registros de validación.
================================================================================


================================================================================
CIERRE DE TAREA — VALIDACIÓN LIVE DE restoreDatabase CON ENLACE COMPLETO
Fecha: 2026-11-05
Estado: IMPLEMENTACIÓN Y VALIDACIÓN LIVE CONFIRMADAS POR EL USUARIO; REGISTROS ACTUALIZADOS.

RESULTADO
- El usuario confirmó que restoreDatabase funciona al ingresar el enlace completo de Google Sheets.
- Se cierra el pendiente de validación live tras la normalización de ui.js y Services/admin.js.
- SPREADSHEET_ID continúa siendo el destino fijo; el enlace completo corresponde al respaldo de origen.
- La confirmación se atribuye al usuario. No se reprodujo la restauración independientemente desde este entorno.

ARCHIVOS MODIFICADOS
- Auditoría.txt
- ChangesLogs.txt
- Tareas.txt
- checkpoint.md

VERIFICACIONES Y REVISIÓN
- Se revisó la entrada pendiente de Tareas.txt y se sustituyó por el estado confirmado.
- Code Review documental: causa, solución, destino, fuente de validación y límites se mantienen coherentes.
- No se modificó código ni configuración.
- No se ejecutó otra restauración ni se alteraron datos de Sheets/Drive.

VALIDACIONES Y LIMITACIONES
- El funcionamiento live del enlace completo fue confirmado expresamente por el usuario.
- No se obtuvo registro técnico independiente de la ejecución desde este entorno.
- No se confirmó una copia independiente de Spreadsheet para pruebas; no se debe asumir que existe.
- No se realizó despliegue adicional en esta actualización documental.
- No se realizó merge; la rama base protegida permanece intacta.

CONTINUIDAD
- HEAD anterior a esta tarea: 800275ccb45c3de66439b098d3ce2567d52fa11a.
- El commit único de esta actualización documental queda identificado en el historial de GPSpedia2.2.5_work.
- Siguiente acción: continuar con la siguiente tarea pendiente de GPSpedia, sin repetir la corrección ni la prueba del enlace completo salvo que aparezca una nueva incidencia.
================================================================================


================================================================================
CHECKPOINT INICIAL — AUDITORÍA DE HASH DE CONTRASEÑAS Y CONTROL DE INTENTOS (ADMIN 0)
Fecha: 2026-11-05
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5
HEAD inicial confirmado: 6119ab8600ce96aff08570e8118be55e0d88aebd
HEAD de rama base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1

TAREA Y ALCANCE
- Auditar Services/Auth.js y Services/users.js para verificar la implementación de hash SHA-256 con salt, compatibilidad temporal con contraseñas legacy, migración progresiva y límite de intentos.
- Revisar sus dependencias de enrutamiento y formulario en api-config.js y users.html, sin ampliar la implementación.
- Documentar hallazgos y dejar definido el protocolo de validación funcional sobre la copia independiente de Spreadsheet.
- No repetir las pruebas live ya confirmadas por el usuario: login, carga de usuarios, Dashboard, Inbox y backup/restore.
- La copia independiente de Spreadsheet para pruebas está disponible según confirmación del usuario.

ESTADO REAL AL INICIO
- ADMIN 0 permanece abierta; la implementación de hash y bloqueo está en la rama de trabajo, pero Tareas.txt mantiene pendiente la validación funcional en Apps Script.
- AUTH y USERS ya incluyen funciones de creación/verificación de hash; AUTH conserva verificación legacy y migración al iniciar sesión.
- Las tres rutas de escritura de USERS están previstas para guardar hashes.
- No se ha autorizado desplegar Apps Script ni ejecutar pruebas que escriban en hojas.
- No se modificará la rama base ni se hará merge.

ARCHIVOS Y FUNCIONALIDADES INVOLUCRADOS
- Services/Auth.js: normalización, hash/verificación, login, migración legacy y control de intentos.
- Services/users.js: creación de usuario, actualización administrativa y cambio de contraseña propia.
- api-config.js y users.html: enrutamiento y envío de las operaciones de credenciales.
- Auditoría.txt, ChangesLogs.txt, Tareas.txt y checkpoint.md: trazabilidad del trabajo.

RIESGOS Y DEPENDENCIAS
- SHA-256 con salt no es una KDF especializada.
- CacheService puede desalojar entradas antes del tiempo de expiración; el bloqueo es de mejor esfuerzo.
- Los servicios contienen un SPREADSHEET_ID fijo. Antes de cualquier prueba de escritura debe verificarse que los deployments de prueba apunten a la copia independiente y no a la hoja productiva.
- No registrar ni mostrar contraseñas, hashes ni tokens. No ejecutar migración masiva.

RESPALDOS
- Auditoría.txt: blob original 24b3110f921c759c910197923212453be52401d0.
- ChangesLogs.txt: blob original f59a647142bb3796b5fbb95b527b43ff2b81cbe9.
- Tareas.txt: blob original 83495af9bbf6287e36948c4c494cfc76f6d8fa67.
- checkpoint.md: blob original b417d13cc19ec557a1479e300bbd7a0b49fed716.
- Los archivos funcionales se auditan sin modificarlos; no requieren respaldo de edición.

FASE AL CREAR EL CHECKPOINT
- Estado inicial documentado antes de concluir la auditoría y registrar hallazgos.
================================================================================


================================================================================
CIERRE DE TAREA — AUDITORÍA ESTÁTICA DE HASH Y CONTROL DE INTENTOS (ADMIN 0)
Fecha: 2026-11-05
Estado: AUDITORÍA Y REVISIÓN ESTÁTICA COMPLETADAS; VALIDACIÓN FUNCIONAL PENDIENTE.

RESULTADO
- AUTH y USERS comparten el formato y la fórmula de hash SHA-256 con salt.
- Las tres rutas de escritura de USERS generan hashes; AUTH admite contraseñas legacy y las migra al autenticar correctamente.
- Se documentaron el mínimo de ocho caracteres, el contador de cinco intentos, el bloqueo nominal de quince minutos y sus limitaciones.
- No se identificaron discrepancias estáticas entre las implementaciones de hash de AUTH y USERS.

ARCHIVOS MODIFICADOS
- Auditoría.txt
- ChangesLogs.txt
- Tareas.txt
- checkpoint.md

ARCHIVOS FUNCIONALES AUDITADOS, SIN MODIFICAR
- Services/Auth.js
- Services/users.js
- api-config.js
- users.html

VERIFICACIONES Y REVISIÓN
- Lectura completa de los dos servicios y revisión de los formularios y rutas de enrutamiento relacionados.
- Se comprobó por inspección que los escritores de contraseñas usan createPasswordHash() y que la verificación dual se encuentra en AUTH y USERS.
- Code Review estático: el quinto intento puede autenticarse y limpiar el contador; un quinto fallo deja el bloqueo para solicitudes siguientes.
- Se verificó que los registros revisados no incluyen valores de contraseña, hashes ni tokens.
- Se mantuvo fuera de alcance la incidencia previamente registrada del límite de sesiones del rol Gefe.

VALIDACIONES PENDIENTES Y LIMITACIONES
- No se ejecutó Apps Script ni se desplegaron AUTH o USERS.
- No se verificó desde este entorno el ID de la copia independiente ni el destino de los deployments de prueba.
- Pendiente validar las operaciones de credenciales y el bloqueo en la copia independiente. No ejecutar pruebas de escritura hasta confirmar que AUTH y USERS apuntan a esa copia.
- SHA-256 con salt no es una KDF especializada.
- CacheService puede desalojar entradas antes del TTL; el bloqueo es de mejor esfuerzo.
- No se modificaron datos productivos, no se realizó migración masiva ni se hizo merge.

CONTINUIDAD
- HEAD anterior a la tarea: 6119ab8600ce96aff08570e8118be55e0d88aebd.
- El commit único de esta auditoría y sus registros quedará identificado en el historial de GPSpedia2.2.5_work.
- Siguiente acción concreta: identificar el Spreadsheet ID de la copia independiente y confirmar que los deployments de prueba AUTH y USERS apuntan a ella; después ejecutar la matriz de pruebas documentada, sin tocar la hoja productiva.
================================================================================


================================================================================
CIERRE DE TAREA — PREPARAR FUENTES AISLADAS AUTH Y USERS PARA ADMIN 0
Fecha: 2026-11-05
Estado: PREPARACIÓN DE CÓDIGO COMPLETADA; VALIDACIÓN FUNCIONAL BLOQUEADA HASTA CREAR DEPLOYMENTS DE PRUEBA.

## Resultado
- Se crearon copias independientes de AUTH y USERS en Services/Test.
- Ambas copias apuntan al ID de Spreadsheet de pruebas 1TyfehJHUeyUMGM4AW12_Rkq-Y8G_6MvF-Wd9rrB87_k.
- Se añadió README con pasos para instalar cada servicio en un proyecto Apps Script distinto y desplegarlo sin reemplazar los servicios actuales.
- No se cambió la configuración live ni la lógica funcional de autenticación/usuarios.

## Archivos nuevos
- Services/Test/Auth.js
- Services/Test/users.js
- Services/Test/README.md

## Archivos documentales modificados
- Auditoría.txt
- ChangesLogs.txt
- Tareas.txt
- checkpoint.md

## Verificaciones realizadas
- Se auditó la totalidad de Services/Auth.js (375 líneas) y Services/users.js (495 líneas), además de las rutas relevantes de api-config.js, Services/admin.js y README.md.
- Se comprobó que el ID de la copia suministrada por el usuario difiere del ID fijo en AUTH, USERS y ADMIN.
- Cada copia de prueba conserva el número de líneas del original y solo cambia la línea 9 de SPREADSHEET_ID.
- La comparación inversa, al restaurar el ID original, reprodujo exactamente ambos archivos fuente.
- Code Review: las copias conservan los handlers y dependencias de los originales; la única variación funcional es el destino de Spreadsheet. AUTH y USERS deben instalarse en proyectos distintos por sus routers y constantes globales.
- api-config.js conserva sus URLs actuales; no se ha conectado la plataforma live a los servicios de prueba.

## Validaciones no realizadas
- No se creó ni desplegó ningún proyecto Apps Script.
- No se confirmó desde Apps Script el destino efectivo de los deployments existentes ni la estructura interna de la copia.
- No se ejecutaron llamadas HTTP ni pruebas de login/usuarios.
- No se escribieron datos en la copia ni en otra Spreadsheet.
- No se realizó despliegue, no se hizo merge y la rama base permaneció intacta.

## Continuidad
- ID de Spreadsheet de pruebas: 1TyfehJHUeyUMGM4AW12_Rkq-Y8G_6MvF-Wd9rrB87_k.
- Los proyectos/deployments AUTH-TEST y USERS-TEST deben crearse de forma independiente. Después se deben proporcionar sus URLs para verificar los endpoints y ejecutar la matriz de ADMIN 0.
- La matriz pendiente incluye login legacy/hash, migración de contraseña legacy, alta/actualización/cambio de contraseña, cinco fallos y bloqueo, expiración y restablecimiento por login correcto.
- HEAD anterior a la tarea: 8a9c9811bc954785f36966997bc1564a1fb3feac.
- El commit único que incorpora las fuentes y la documentación queda identificado en el historial de GPSpedia2.2.5_work.
================================================================================


---

# CHECKPOINT DE CIERRE — INTEGRAR RECHAZO DE NOMBRES DUPLICADOS EN USERS

**Fecha:** 2026-11-05
**Repositorio:** infogpstech/GPSpedia
**Rama:** GPSpedia2.2.5_work
**Rama base protegida:** GPSpedia2.2.5
**HEAD inicial de la tarea:** da0affc4e52b533644a94f1876e08ca0e137533f

## Resultado de implementación
- Services/users.js: sustituido handleCreateUser() por la versión funcionalmente probada en Services/Test/users.js.
- Eliminada generateUniqueUsername(), que quedó sin referencias.
- No se modificó SPREADSHEET_ID ni ningún otro handler.
- No se modificaron users.html, api-config.js, AUTH ni otros servicios.

## Verificaciones estáticas
- La función integrada handleCreateUser() coincide exactamente con la versión probada.
- Las otras 15 funciones compartidas de USERS permanecen idénticas.
- Los segmentos del archivo original anteriores, intermedios y posteriores a las dos modificaciones se conservaron exactamente.
- La respuesta de duplicado se emite antes de generar hash o escribir datos.
- LockService permanece activo durante la validación y la escritura.
- Se conserva el ID original de Spreadsheet.
- api-config.js maneja status:'error' del backend convirtiéndolo en error de aplicación; no requiere cambios.
- No se ejecutó Apps Script, no se desplegó y no se modificaron datos de Sheets.

## Estado
**IMPLEMENTACIÓN Y REVISIÓN ESTÁTICA COMPLETADAS; COMMIT ÚNICO PENDIENTE DE PUBLICACIÓN.**

## Archivos previstos en el único commit
- Services/users.js
- Auditoría.txt
- ChangesLogs.txt
- Tareas.txt
- checkpoint.md

## Siguiente acción
Crear un único commit con los cinco archivos, cuyo padre debe ser da0affc4e52b533644a94f1876e08ca0e137533f. Verificar el nuevo HEAD y la lista de archivos del commit. No crear commits individuales por archivo.


---

# CHECKPOINT INICIAL — ACTUALIZAR ENDPOINT USERS

**Fecha:** 2026-11-05
**Repositorio:** infogpstech/GPSpedia
**Rama de trabajo:** GPSpedia2.2.5_work
**Rama base protegida:** GPSpedia2.2.5
**HEAD inicial confirmado:** b441a5be9a04770b2d535490eb73bc9478375e9b
**HEAD de rama base confirmado:** d9acc68d889985c2e2f42fe3a02e502efc86ead1

## Tarea y alcance
Sustituir exclusivamente el endpoint USERS en API_ENDPOINTS.USERS de api-config.js por la URL de deployment proporcionada por el usuario. Mantener intactos AUTH, los demás endpoints, ACTION_TO_SERVICE_MAP, routeAction(), los consumidores, los servicios Apps Script y la rama protegida.

## Estado real al inicio
- La rama de trabajo coincide con b441a5be9a04770b2d535490eb73bc9478375e9b.
- La rama protegida coincide con d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- api-config.js tiene 170 líneas y contiene el endpoint USERS anterior una vez, en la propiedad API_ENDPOINTS.USERS.
- El usuario proporcionó una URL nueva de deployment USERS, distinta de la configurada.
- No se ha probado HTTP el nuevo deployment desde este entorno.
- La tarea anterior de rechazo de nombres duplicados ya está incorporada en el commit b441a5be9a04770b2d535490eb73bc9478375e9b.

## Archivos y funcionalidades involucrados
- api-config.js: configuración API_ENDPOINTS.USERS, mapa de acciones y routeAction().
- Consumidores revisados: main.js, auth.js, ui.js, navigation.js, users.html y youtubeUpload.js.
- Registros: Auditoría.txt, ChangesLogs.txt, Tareas.txt y checkpoint.md.

## Riesgos, dependencias y restricciones
- Las acciones getUsers, createUser, updateUser, deleteUser, changePassword, updateProfile y resetUserSessions dependen del endpoint USERS a través de routeAction().
- No modificar AUTH ni las demás propiedades de API_ENDPOINTS.
- No desplegar Apps Script, modificar hojas ni ejecutar operaciones de escritura.
- El commit debe incluir todos los archivos de la tarea en un único commit; actualizar únicamente GPSpedia2.2.5_work mediante expected_sha. No hacer merge.

## Fase al crear este checkpoint
Estado inicial documentado antes de completar la auditoría formal. No se ha modificado ningún archivo del repositorio ni se ha movido ninguna referencia Git.


---

# CHECKPOINT DE CIERRE — ACTUALIZAR ENDPOINT USERS

**Fecha:** 2026-11-05
**Repositorio:** infogpstech/GPSpedia
**Rama de trabajo:** GPSpedia2.2.5_work
**Rama base protegida:** GPSpedia2.2.5
**HEAD anterior a la tarea:** b441a5be9a04770b2d535490eb73bc9478375e9b

## Resultado
- api-config.js: sustituido únicamente el valor de API_ENDPOINTS.USERS por la URL proporcionada por el usuario.
- Se mantienen sin cambios AUTH, los demás endpoints, ACTION_TO_SERVICE_MAP, routeAction(), helpers y consumidores.
- Auditoría, ChangesLogs y Tareas actualizados dentro del mismo cambio.

## Verificaciones estáticas
- api-config.js conserva 170 líneas.
- La comparación del contenido anterior y posterior identifica exclusivamente la sustitución del endpoint en la línea 12.
- URL anterior: 0 coincidencias; URL nueva: 1 coincidencia.
- Las acciones USERS continúan asignadas a USERS y los consumidores utilizan el enrutador central.
- No se desplegó Apps Script ni se modificaron hojas o datos.

## Validaciones pendientes
- No se ejecutó una solicitud HTTP al nuevo deployment.
- No se probaron login, sesión ni operaciones funcionales de USERS desde la plataforma.
- La disponibilidad y configuración interna del deployment no se verificaron independientemente.

## Estado
**CAMBIO ESTÁTICO Y DOCUMENTACIÓN PREPARADOS; PENDIENTE DE PUBLICAR Y VERIFICAR EL COMMIT ÚNICO.**

## Archivos incluidos en el único commit
- api-config.js
- Auditoría.txt
- ChangesLogs.txt
- Tareas.txt
- checkpoint.md

## Continuidad
- El commit de esta tarea deberá tener como padre b441a5be9a04770b2d535490eb73bc9478375e9b y quedar identificado en el historial de GPSpedia2.2.5_work.
- Siguiente acción: crear un único árbol con los cinco archivos, crear un único commit y actualizar la referencia de la rama con expected_sha. Después, verificar el commit y realizar pruebas HTTP/funcionales autorizadas del deployment USERS.


---

# CHECKPOINT INICIAL — ESTANDARIZAR EL PROCEDIMIENTO ÚNICO DE COMMITS

**Fecha:** 2026-11-05
**Repositorio:** infogpstech/GPSpedia
**Rama de trabajo:** GPSpedia2.2.5_work
**Rama base protegida:** GPSpedia2.2.5
**HEAD inicial confirmado:** 11a22438735d689bbb45f7e0775fa95adf3b1c12
**HEAD de rama base confirmado:** d9acc68d889985c2e2f42fe3a02e502efc86ead1

## Tarea y alcance
Incorporar como único procedimiento autorizado para commits el flujo Git Database API utilizado y verificado en la tarea anterior: crear blobs de los archivos, construir un único árbol, crear un único commit con el HEAD anterior como padre y actualizar exclusivamente la rama de trabajo mediante expected_sha. Añadir la regla a Proceso de desarollo.md y a contexto_personal.md. No eliminar ni modificar ninguna regla existente.

## Estado real al inicio
- GPSpedia2.2.5_work apunta a 11a22438735d689bbb45f7e0775fa95adf3b1c12.
- GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Proceso de desarollo.md existe en la raíz de GPSpedia2.2.5_work, con 517 líneas. Su sección final CONTROL DE COMMITS POR TAREA ya exige un único commit, pero no especifica el método Git autorizado.
- contexto_personal.md no existe en la raíz de GPSpedia2.2.5_work ni en las ramas GPSpedia2.2.5 y GPSpedia2.2.5_auth-users-test; tampoco se localizó en la biblioteca de archivos consultada. Se preparará como archivo nuevo en la raíz, sin sobrescribir contenido previo.
- La búsqueda del repositorio identificó Proceso de desarollo.md como el documento formal de procedimiento; Tareas.txt y checkpoint.md son registros de tareas/continuidad, no documentos adicionales de procedimiento general.
- La documentación de checkpoint, Auditoría.txt, ChangesLogs.txt y Tareas.txt fue revisada para preservar su historial.

## Archivos previstos
- Proceso de desarollo.md: añadir una sección que establezca el único método autorizado de commit.
- contexto_personal.md: crear un documento nuevo que contenga la misma regla operativa.
- Auditoría.txt, ChangesLogs.txt, Tareas.txt y checkpoint.md: registrar esta tarea según el procedimiento existente.

## Restricciones
- No borrar, reemplazar, reordenar ni debilitar reglas existentes.
- No modificar código funcional ni otras ramas.
- Agrupar todos los archivos de esta tarea en un único commit.
- No hacer merge ni modificar GPSpedia2.2.5.

**Fase al crear el checkpoint:** estado inicial documentado; revisión de documentos y alcance en curso.


---

# CHECKPOINT DE CIERRE — PROCEDIMIENTO ÚNICO AUTORIZADO PARA COMMITS

**Fecha:** 2026-11-05
**Repositorio:** infogpstech/GPSpedia
**Rama de trabajo:** GPSpedia2.2.5_work
**Rama base protegida:** GPSpedia2.2.5
**HEAD anterior a la tarea:** 11a22438735d689bbb45f7e0775fa95adf3b1c12

## Resultado documental
- Proceso de desarollo.md: se añadió al final el procedimiento técnico exclusivo de commits, sin reemplazar ni borrar el contenido previo.
- contexto_personal.md: se creó como archivo nuevo en la raíz porque no existía en las ramas revisadas ni en la biblioteca consultada. Contiene la misma secuencia operativa y restricciones.
- Auditoría.txt, ChangesLogs.txt y Tareas.txt: se añadieron registros de esta tarea sin sobrescribir entradas anteriores.

## Procedimiento que queda establecido
- Verificar el HEAD de la rama de trabajo y el HEAD de la rama protegida.
- Crear un blob por cada archivo mediante create_blob.
- Crear un único árbol mediante create_tree, basado en el árbol del HEAD confirmado.
- Crear exactamente un commit mediante create_commit, con parent_sha igual al HEAD confirmado.
- Actualizar únicamente la rama de trabajo mediante update_ref, con force:false y expected_sha igual al HEAD confirmado.
- Verificar commit, padre, archivos, HEAD final y rama protegida.
- No utilizar métodos alternativos ni generar commits parciales/intermedios. Ante fallos o discrepancias, detenerse e informar.

## Preservación y alcance
- No se eliminó ni modificó ninguna regla anterior de Proceso de desarollo.md.
- contexto_personal.md se incorpora como archivo nuevo; no se sobrescribió ningún archivo previo.
- No se modificaron código funcional, configuraciones, servicios Apps Script, deployments, datos ni la rama protegida.

## Estado
**DOCUMENTACIÓN PREPARADA; PENDIENTE DE PUBLICAR Y VERIFICAR EL ÚNICO COMMIT.**

## Archivos que se incluirán en el único commit
- Proceso de desarollo.md
- contexto_personal.md (nuevo)
- Auditoría.txt
- ChangesLogs.txt
- Tareas.txt
- checkpoint.md

## Continuidad
El commit deberá tener como único padre 11a22438735d689bbb45f7e0775fa95adf3b1c12 y actualizar exclusivamente GPSpedia2.2.5_work mediante update_ref con expected_sha igual a ese HEAD. Si cualquier operación falla o el HEAD cambia, detenerse sin crear un commit alternativo ni utilizar otro método.
