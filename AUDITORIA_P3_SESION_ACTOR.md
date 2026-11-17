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
