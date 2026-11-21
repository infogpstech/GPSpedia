# Mapa de consumidores AUTH/USERS — GPSpedia

Fecha: 2026-11-21  
Rama: GPSpedia2.2.5_work  
HEAD de inspección: 8683e157f641853fa9c5523cbd3f25a8937bdec5  
Alcance: inventario estático de consumidores del frontend, asignación de servicios, dispatchers y coordinación actual. No se invocaron deployments ni datos productivos.

## 1. Consumidores del frontend

| Acción | Consumidor / entrada | Ruta cliente | Servicio | Observación |
|---|---|---|---|---|
| login | JS/Frontend/main.js:112 formulario de acceso | auth.login → api-config.login → routeAction('login') | AUTH | El requestId de login se conserva en sessionStorage y se limpia al completar la respuesta. |
| validateSession | HTML/users.html:777 | postToAction('validateSession') | AUTH | Fallback cuando un cambio de rol propio termina con error y se necesita comprobar si la sesión sigue activa. |
| validateSession | JS/Frontend/auth.js:818-851 | validateActiveSession → validateSessionCoordinated → apiValidateSession | AUTH | Exportada, pero no se encontró consumidor en los archivos JS/HTML activos. checkSession no la llama: restaura localmente el perfil/rol recibido en login y aplica expiración local. |
| touchSession | Sin consumidor encontrado | Solo permanece en ACTION_TO_SERVICE_MAP y dispatcher AUTH | AUTH | No hay llamada routeAction('touchSession') en frontend activo. Acción huérfana desde el cliente. |
| acceptTerms | JS/Frontend/ui.js:11475-11521 | syncPendingTermsAcceptance_ → routeAction('acceptTerms') | AUTH | Se intenta desde showApp (11645) y listener online (11532). termsAcceptanceSyncInFlight_ deduplica solicitudes simultáneas por usuario/dispositivo/versión/token. No llama touchSession. |
| requestPasswordRecovery | JS/Frontend/main.js:154 | auth.requestPasswordRecovery → routeAction | AUTH | Formulario de solicitud de código. |
| completePasswordRecovery | JS/Frontend/main.js:187 | auth.completePasswordRecovery → routeAction | AUTH | Formulario de verificación de código y actualización de contraseña. |
| logout | JS/Frontend/main.js:838-839 | auth.logout → cierre local inmediato + routeAction('logout') | AUTH | La revocación remota es asíncrona y se informa si no queda confirmada. |
| logout | HTML/users.html:799-804 | Fallback de cierre local + routeAction('logout') | AUTH | Solo se ejecuta si falla la validación posterior a un cambio de rol propio. |
| getUsers | HTML/users.html:487 | postToAction('getUsers') | USERS | Obtiene listado filtrado por rol; el dispatcher usa actor cacheado. |
| createUser | HTML/users.html:758 | postToAction('createUser') | USERS | Alta de cuenta; usa lease compartida y lock local de USERS para unicidad de username. |
| updateUser | HTML/users.html:715 | postToAction('updateUser') | AUTH | Actualiza perfil/rol administrativo; si cambia rol, revoca sesiones del objetivo e invalida cachés remotas. |
| deleteUser | HTML/users.html:862 | postToAction('deleteUser') | AUTH | Desactiva cuenta y revoca sesiones/login pendientes. No permite autoeliminación ni eliminar el último Desarrollador activo. |
| resetUserSessions | HTML/users.html:883 | postToAction('resetUserSessions') | AUTH | Cierre remoto de todas las sesiones de otro usuario. |
| resetUserPassword | HTML/users.html:753 | postToAction('resetUserPassword') | AUTH | Se invoca después de updateUser cuando el administrador también cambia contraseña. |
| changePassword | HTML/users.html:927 | postToAction('changePassword') | AUTH | Cambia contraseña propia y actualmente revoca sesiones. |
| updateProfile | HTML/users.html:958 | postToAction('updateProfile') | USERS | Actualiza el nombre propio usando actor cacheado y lectura de la fila propia. |

## 2. Acciones registradas sin consumidor frontend directo

- touchSession: no hay llamada en frontend activo. La prueba TermsAcceptance.js ya confirma que aceptar términos no dispara un touchSession adicional.
- validateActiveSession: exportada por auth.js, pero no se encontró uso desde main.js, ui.js, index.html o HTML/. La restauración normal se hace mediante checkSession y expiración local.
- migrateLegacyPasswords: acción AUTH administrativa/de migración; no aparece conectada a un control ordinario de la interfaz.
- clearSensitiveLogs y benchmarkPasswordKdf: rutas administrativas; no forman parte de las acciones comunes de sesión.
- La ausencia de un consumidor se refiere a los archivos cliente activos inspeccionados, no a invocaciones manuales externas ni a scripts de prueba.

## 3. Coordinación y llamadas adicionales actuales

### AUTH

isSharedMutationAction_ en JS/Services/Auth.js incluye actualmente: login, touchSession, acceptTerms, requestPasswordRecovery, completePasswordRecovery, changePassword, resetUserPassword, resetUserSessions, deleteUser, updateUser, logout y migrateLegacyPasswords.

El dispatcher llama withSharedMutationLease_('AUTH', action, ...) para todas esas acciones. Una lease normal ejecuta acquire y release contra Coordinator (dos requests servidor-servidor); con token anidado se hace una validación. Además, varios handlers usan su propio LockService.getScriptLock() para modificar Sheets.

Excepciones actuales:
- clearSensitiveLogs y benchmarkPasswordKdf usan getCachedSharedSessionActor_ sin lease.
- validateSession no pasa por isSharedMutationAction_, pero handleValidateSession consulta Coordinator mediante validateSharedSessionContext_, sincroniza actividad en ActiveSessions y ejecuta lectura de sesión/perfil.
- touchSession entra en la lease aunque no tenga consumidor cliente.

### USERS

- createUser es la única acción de USERS incluida en isSharedMutationAction_; adquiere lease de Coordinator y después un ScriptLock local no bloqueante (tryLock(0)) para verificar unicidad y escribir.
- getUsers y updateProfile usan getCachedSharedSessionActor_. En cache hit no consultan Coordinator; en miss llaman validateSessionContext y guardan el actor hasta seis horas.
- getVerifiedSession consume el actor confiable inyectado por el dispatcher; no vuelve a recorrer Users/ActiveSessions para validar identidad. updateProfile sí busca la fila única propia que debe escribir.

## 4. Hallazgos y dependencias para la simplificación §15

1. touchSession huérfana: no hay consumidor cliente; conservarla en el router/dispatcher y pagar una lease por una llamada inexistente no aporta actividad funcional. Antes de retirar el handler, revisar referencias de pruebas y compatibilidad histórica.
2. acceptTerms con lease y lock: es una sincronización puntual del consentimiento del dispositivo, no un cambio de sesión. La ruta actual adquiere/libera lease remota y luego usa ScriptLock durante la lectura-modificación-escritura de la celda JSON. La lease es candidata a retiro; el lock local requiere evaluar la carrera de dos dispositivos escribiendo el mismo almacén antes de retirarlo.
3. Validación de sesión en cliente: checkSession no llama a validateActiveSession; la validación activa parece limitada al fallback de cambio de rol y a la función exportada sin consumidor encontrado. No introducir una validación de red en el arranque ordinario.
4. AUTH actions ordinarias con lease: recuperación de contraseña, aceptación de términos, cambios administrativos de perfil y otras rutas hoy pasan por acquire/release. Clasificar individualmente contra §15 y conservar únicamente la coordinación indispensable para las excepciones expresas.
5. Eliminación y creación concurrentes: USERS createUser y AUTH deleteUser comparten el recurso lógico USERS en la política de Coordinator. La lease compartida es hoy la única exclusión mutua entre proyectos Apps Script; el ScriptLock local de USERS no coordina con AUTH. No retirar la lease de createUser hasta diseñar una autoridad común o un mecanismo de unicidad equivalente que evite recrear una cuenta mientras se desactiva.
6. Cambio de rol: AUTH updateUser mantiene marcador de revocación, revoca contexto compartido, invalida cachés remotas y solo después confirma rol/perfil. Esta ruta cambia capacidades efectivas; no tratarla como una actualización de nombre simple ni retirar su invalidación.
7. Cierre remoto / eliminación: logout, resetUserSessions y deleteUser tienen efectos explícitos de revocación. deleteUser debe seguir impidiendo login posterior; no debilitar estas rutas.

## 5. Siguiente paso técnico

Clasificar y reducir las leases AUTH conforme a §15 empezando por acciones huérfanas o puntuales (touchSession, acceptTerms, recuperación y actualizaciones sin cambio de rol). Diseñar por separado la autoridad compartida de alta/eliminación de cuentas. Añadir pruebas de contrato para demostrar que las rutas simplificadas no llaman Coordinator, mantienen RBAC y no invalidan los mecanismos expresamente conservados.