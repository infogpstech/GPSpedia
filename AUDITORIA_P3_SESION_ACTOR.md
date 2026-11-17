# Auditoría P3.1 — contexto de sesión y rol

**Fecha:** 2026-11-17  
**Rama:** GPSpedia2.2.5_work  
**HEAD auditado:** bd002d42cbe8cf84f5482185a39848154a0668e8  
**Estado:** P3.1a aplicada y validada; P3.1b pendiente de evaluación.

## Comportamiento observado

1. En el inicio de sesión, AUTH sincroniza con Coordinator el contexto compartido de sesión: userId, rol, nombre, fecha de creación, última actividad y token.
2. La restauración de la aplicación en `checkSession()` usa el perfil local verificado en login y calcula la expiración local; no hace un viaje de red a AUTH. Las pruebas de restauración existentes confirman este comportamiento.
3. WRITE y FEEDBACK usan `getCachedSharedSessionActor_()`. Un cache hit reutiliza el actor y no consulta Coordinator. Antes de P3.1a el TTL era 15 s; al expirar, cada servicio podía volver a consultar `validateSessionContext`.
4. `validateSessionContext` consulta el contexto compartido de Coordinator (ScriptProperties), no vuelve a leer Users/ActiveSessions en cada acción de WRITE/FEEDBACK. No obstante, comprueba token, expiración y contexto al producirse un cache miss.
5. AUTH mantiene una ruta `handleValidateSession` que puede consultar Coordinator y ActiveSessions/Users. La restauración normal `checkSession()` no la usa. No se elimina esa ruta mientras no se confirme que no existe otro consumidor externo.

## Cambio P3.1a

- TTL de `getCachedSharedSessionActor_()` ampliado de 15 segundos a 21,600 segundos (6 h, máximo admitido por Apps Script CacheService).
- Se amplió el límite de TTL configurable a 21,600 s.
- En un cache hit no hay viaje de red ni validación adicional por acción.
- La identidad/rol que se almacena sigue siendo el actor sincronizado por AUTH al iniciar sesión; no se confía en un rol enviado por el navegador.
- Prueba `SessionActorCacheLifetime.mjs`: 4/4 PASS.

## Validación

- CI `44146072996`: SUCCESS — 143 suites / 2,108 pruebas / 0 fallos.
- Salud remota `44146072983`: SUCCESS — 7/7 servicios disponibles. Observación: USERS respondió en 8,489 ms en esta muestra; no se clasificó como indisponible. Vigilar en siguientes ejecuciones.
- GitHub Pages `44146072924`: SUCCESS.
- No se desplegaron servicios ni se modificaron datos externos. El monitoreo y el dashboard de actividad permanecen activos.

## Límite conocido / siguiente paso

CacheService es local a cada proyecto Apps Script y su TTL máximo es 6 h. Por tanto, el primer acceso a WRITE/FEEDBACK tras un cache miss y las solicitudes posteriores al vencimiento todavía recuperan el actor desde Coordinator. El cambio reduce las consultas de cada 15 s a una consulta por servicio por periodo de caché, pero no equivale a una propagación estrictamente en el instante del login.

P3.1b debe decidir si se requiere precargar el actor en cada servicio durante login o si la caché de 6 h satisface el requisito operativo. No introducir JWT/HMAC ni nuevos mecanismos de seguridad sin necesidad: el objetivo del proyecto es mantener el inicio y los aportes ágiles y simples.


## Adenda P3.1b — invalidación de caché tras revocación

**HEAD revisado:** bd002d42cbe8cf84f5482185a39848154a0668e8

- Se evaluó precargar el actor desde AUTH en cada proyecto Apps Script. Los proyectos mantienen `CacheService` aislados; AUTH no puede poblar directamente las cachés de WRITE/FEEDBACK. Hacerlo exigiría llamadas de red adicionales durante login y nuevos contratos/configuración entre servicios, en contra de la prioridad de simplicidad y agilidad.
- Se conserva el TTL de 21,600 s como caché local de actor: los cache hits no hacen llamadas de red ni revalidaciones por acción. El cache miss inicial o posterior al vencimiento todavía consulta Coordinator. Esta decisión reduce viajes repetidos, pero no equivale a una validación estrictamente limitada al login.
- Hallazgo confirmado: `handleLogout` y las rutas de revocación de usuario/rol llaman a Coordinator (`revokeSession` / `revokeUserSessions`), pero no se encontró una operación que retire la entrada equivalente de `CacheService` en los proyectos WRITE y FEEDBACK. Como el actor se almacena hasta 6 h por token, una entrada ya cacheada puede seguir autorizando acciones ordinarias después de logout remoto, eliminación de cuenta o cambio de rol, hasta que expire o sea desalojada.
- Severidad: **ALTA** por ventana de autorización obsoleta que contradice las excepciones de revocación exigidas. Evidencia: `SharedMutationClient.js` (`getCachedSharedSessionActor_` y clave por token), `write.js` dispatcher, `feedback.js` dispatcher y `Auth.js` (`handleLogout` y llamadas de revocación).
- Decisión P3.1b: no introducir JWT/HMAC ni precargas de red a todos los servicios. Mantener temporalmente el TTL de 6 h para operaciones ordinarias, pero **no cerrar P3.1 completo** hasta implementar invalidación dirigida de las cachés de los servicios en las tres excepciones (logout remoto, eliminación de cuenta y cambio/revocación de rol), sin volver a consultar Coordinator en cada acción.
- Siguiente: P3.1c, diseñar e implementar invalidación dirigida de caché con autenticación servicio-a-servicio ya disponible, pruebas de propagación, fallos parciales y aislamiento por token. No desplegar servicios ni tocar datos productivos en esta fase.


## Adenda P3.1c — implementación de invalidación dirigida

**Commit de implementación/pruebas:** fb52a48685889b30744761f13782eca9c4ae0a1f (rama GPSpedia2.2.5_work).

- SharedMutationClient.js conserva la función de clave de caché anterior (userId + "\\n" + sessionToken) y añade la operación de invalidación interna. No cambia el TTL de 21,600 s ni el camino ordinario de cache hit.
- AUTH solicita la eliminación de la clave exacta en WRITE y FEEDBACK antes de llamar a revokeSession o revokeUserSessions. Para revocaciones por usuario, obtiene los tokens activos de ActiveSessions; rechaza tokens duplicados y más de cinco sesiones.
- WRITE y FEEDBACK interceptan __invalidateSessionActorCache antes del dispatcher de acciones de usuario. El handler exige el secreto compartido GPSpedia_SESSION_CACHE_INVALIDATION_SECRET, compara el secreto en tiempo constante y elimina solo las claves del usuario/token recibidos. La acción no está registrada en api-config.js.
- La propagación falla cerrada: si falta configuración, un endpoint no responde o no confirma el número de tokens, AUTH no ejecuta después la revocación de Coordinator. Si un servicio ya limpió su caché y el segundo falla, el reintento vuelve a limpiar de forma idempotente antes de revocar.
- Se extendieron las pruebas focalizadas y los harnesses de AUTH (PasswordRecovery, LastDeveloperProtection y copia aislada JS/Tests/Auth.js).
- Validación: SessionActorCacheInvalidation 23/23 PASS; SessionActorCacheLifetime 4/4 PASS; GitHub Actions 44149804570 SUCCESS — 144 suites, 2,131 pruebas, 0 fallos. Workflow de salud 44149804587 SUCCESS, solo GET sobre deployments existentes.
- Configuración Beta pendiente: en AUTH, definir GPSpedia_SESSION_CACHE_INVALIDATION_SECRET (valor aleatorio compartido de al menos 32 caracteres), GPSpedia_WRITE_URL y GPSpedia_FEEDBACK_URL; en WRITE y FEEDBACK, definir el mismo GPSpedia_SESSION_CACHE_INVALIDATION_SECRET. Usar los endpoints /exec vigentes. No se guardan valores secretos en Git.
- Validación Beta pendiente: desplegar las tres fuentes y comprobar logout individual, cierre remoto de todas las sesiones, eliminación/cambio de rol, cambio/restablecimiento de contraseña, fallo parcial y reintento. También verificar que los cache hits ordinarios no llaman a Coordinator.
- Estado: P3.1c COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. P3.1 no requiere más cambios locales para invalidación; la configuración y comprobación remotas quedan para Beta.
## Adenda correctiva P3.1c — sesiones ilimitadas y secreto existente — 2026-11-17

- La revisión de la política SESSION_LIMITS encontró que Desarrollador tiene sesiones ilimitadas (Infinity). El primer contrato de invalidación limitaba a cinco tokens y habría impedido revocar una cuenta Desarrollador con más de cinco sesiones. Se retiró el límite artificial de enumeración en AUTH.
- AUTH ahora divide los tokens únicos en lotes de hasta cinco; para cada lote exige confirmación de WRITE y FEEDBACK antes de pasar al siguiente. Coordinator se invoca una sola vez después de limpiar todos los lotes. Si falla cualquier servicio/lote, no se solicita la revocación central y el reintento vuelve a ejecutar la limpieza idempotente.
- Se eliminó la necesidad de una credencial nueva. La acción interna reutiliza GPSpedia_COORDINATOR_SECRET, el secreto servicio-a-servicio ya empleado por los tres proyectos. AUTH solo necesita las propiedades GPSpedia_WRITE_URL y GPSpedia_FEEDBACK_URL con endpoints /exec vigentes. WRITE/FEEDBACK verifican el mismo secreto de Coordinator que ya usan para comunicarse con él.
- La regresión ahora cubre 13 sesiones de una cuenta Developer, lotes de servicio, orden de operaciones y revocación central única después de completar todos los lotes.
- No se desplegaron proyectos Apps Script ni se modificaron ScriptProperties o datos externos. La configuración/despliegue y validación de campo siguen pendientes de Beta.
### Validación posterior a la corrección de lotes — 2026-11-17
- CI 44151856103: SUCCESS — sintaxis aprobada; 144 suites, 2,109 pruebas aprobadas y 0 fallos. SessionActorCacheLifetime 4/4; SessionActorCacheInvalidation 1/1, incluyendo 13 tokens Developer y reutilización de GPSpedia_COORDINATOR_SECRET.
- Health read-only 44151856097: SUCCESS — 7/7 servicios disponibles mediante GET. Esta comprobación consulta deployments actuales y no valida la implementación Apps Script nueva, que sigue sin desplegar.
- El diff desde el HEAD anterior contiene únicamente los archivos de P3.1c y sus pruebas/registros. La comparación de Auth.js con JS/Tests/Auth.js, normalizando solo SPREADSHEET_ID de prueba, no presenta diferencias.
- P3.1c queda COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. La prueba de Pages del mismo HEAD aún estaba en curso al registrar esta adenda.
