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
