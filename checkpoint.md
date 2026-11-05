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
