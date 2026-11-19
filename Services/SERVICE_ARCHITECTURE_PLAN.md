# Plan de simplificación de arquitectura — GPSpedia

Fecha: 2026-11-19  
Rama de trabajo: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5`  
Estado: auditoría estática completada; implementación pendiente.

## 1. Objetivo y restricciones

Reducir el acoplamiento entre proyectos Google Apps Script y la cantidad de despliegues necesarios para mantener la comunicación entre servicios. La implementación debe conservar el comportamiento, los permisos, la identidad confiable, la auditoría y la recuperación ante errores.

No se permite eliminar ni degradar ninguna de estas capacidades:

- Diagnóstico de salud y versión de todos los servicios activos.
- Restricciones de cuentas y cambios de privilegios.
- Revocación individual y global de sesiones.
- Invalidación remota de caché de contexto de sesión por usuario/token en los servicios consumidores.
- Cierre/eliminación remota de cuentas y su flujo de recuperación/compensación.
- Deny-by-default, RBAC, leases, exclusión de recursos compartidos, idempotencia y rollback.

No cambiar secretos, ScriptProperties, deployments, hojas ni datos productivos durante la implementación local.

## 2. Arquitectura observada

### Coordinator

- `JS/Services/Coordinator.js` es el servicio Apps Script independiente. Guarda leases, contexto central de sesión, revocaciones, feed y telemetría en ScriptProperties.
- Cada petición POST se autentica con un secreto propio por servicio (`GPSpedia_COORDINATOR_SECRET_<SERVICIO>`).
- La política `coordinatorPolicy_` es deny-by-default. Las operaciones no declaradas se rechazan antes del handler.
- El cliente puede cambiar de versión sin que todos los servicios consumidores tengan que cambiar si el contrato HTTP se mantiene compatible. Un cambio exclusivamente interno de Coordinator debe requerir únicamente el despliegue de Coordinator.

### SharedMutationClient

- `JS/Services/SharedMutationClient.js` se incluye como copia en AUTH, USERS, WRITE, ADMIN, FEEDBACK y UTILITIES.
- Contiene transporte HTTP, adquisición/liberación de leases, publicación del feed, consulta de telemetría, sincronización de sesión y coordinación de revocaciones.
- Además de enviar comandos a Coordinator, `invalidateSessionActorCaches()` llama directamente a WRITE y FEEDBACK, en lotes de cinco tokens, para borrar cachés locales. `revokeSession()` y `revokeUserSessions()` dependen de esa operación antes de pedir la revocación central.
- Esta responsabilidad cruzada, junto con la configuración de endpoints y secretos duplicada, hace que una modificación del cliente pueda requerir sincronizar varias copias.

### Configuración detectada

- Cada consumidor mantiene `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET`.
- Coordinator mantiene un secreto por servicio.
- ADMIN mantiene URLs de servicios y secretos directos para cinco fuentes de telemetría.
- Cada servicio instrumentado mantiene además su secreto directo de telemetría.
- ADMIN y el frontend contienen URLs de endpoints de servicios. Las URLs no son secretos, pero tenerlas duplicadas incrementa el riesgo de desincronización.
- Las claves y nombres de configuración no son uniformes para todos los usos internos.

## 3. Diseño objetivo

### A. Contrato de comunicación estable y versionado

1. Definir un contrato HTTP interno versionado, con identidad de servicio, operación, requestId, resultado y códigos de error estables.
2. Mantener compatibilidad hacia atrás para las acciones ya desplegadas. Coordinator no debe exigir simultáneamente una versión nueva de todos los consumidores.
3. Separar el protocolo estable del comportamiento interno. Los cambios de políticas, leases, almacenamiento, monitoreo y lógica de Coordinator deben poder publicarse solo en Coordinator mientras no cambie el contrato.
4. Incorporar pruebas de compatibilidad para clientes antiguos, cliente actual, acciones desconocidas y versiones no soportadas.
5. Una nueva operación de protocolo solo exige actualizar los consumidores que realmente la invoquen; no todos los servicios por defecto.

### B. Cliente de servicio pequeño y estable

1. Conservar en SharedMutationClient el transporte autenticado, serialización, validación de respuesta, requestId e idempotencia, adquisición/liberación de leases y propagación del actor confiable.
2. Mover gradualmente la orquestación de operaciones cruzadas a Coordinator, evitando que el cliente tenga que conocer URLs y credenciales de otros servicios.
3. No duplicar políticas RBAC ni permitir que el cliente decida permisos. La autoridad permanece en Coordinator y en los handlers autorizados.
4. Evitar cambios incompatibles o una migración simultánea de los seis consumidores.

### C. Revocación e invalidación remota de caché

1. Mantener la revocación central individual y por usuario, incluida la protección por epoch y los contextos segmentados.
2. Mantener la invalidación de caché en WRITE y FEEDBACK; no sustituirla por expiración pasiva ni por un borrado solo local.
3. Diseñar una operación central idempotente, con confirmación por servicio, estado recuperable y reintento seguro. Debe contemplar fallos parciales sin declarar éxito prematuramente.
4. Preservar el orden seguro entre invalidación, revocación central y actualización de AUTH/ActiveSessions. No cambiar ese orden hasta tener pruebas de fallos y recuperación.
5. La eliminación/cierre de cuenta y los cambios de privilegio deben seguir revocando sesiones y conservar los marcadores de recuperación existentes.

### D. Configuración y secretos

1. Definir un catálogo canónico de nombres de propiedades y de URLs por entorno.
2. Reducir duplicaciones de secretos cuando un mismo secreto de servicio pueda autenticar de forma segura los canales internos, manteniendo secretos independientes por servicio.
3. Mantener secretos fuera del repositorio, frontend, Spreadsheet, logs y documentación.
4. Introducir compatibilidad de lectura con nombres anteriores y migración explícita; nunca borrar una propiedad antigua hasta confirmar que todos los consumidores ya usan la nueva.
5. Centralizar la configuración que necesita Coordinator para las llamadas entre servicios; validar URL, servicio de destino y secreto en el servidor.

## 4. Secuencia de implementación

1. **Contrato y pruebas de compatibilidad — IMPLEMENTADO LOCALMENTE:** protocolo POST v1 independiente de la versión de Coordinator. SharedMutationClient declara `protocolVersion: 1`; Coordinator interpreta la ausencia del campo como v1 para clientes antiguos y rechaza versiones desconocidas antes de ejecutar operaciones. Las pruebas cubren cliente legacy, cliente v1 y rechazo de versiones no soportadas. Coordinator 1.4.2.
2. **Orquestación central de invalidación:** prototipo aislado con fetch inyectado; probar éxito, timeout, respuesta inválida, fallo parcial, repetición idempotente y recuperación.
3. **Migración de cliente:** conservar las funciones públicas actuales como adaptadores compatibles; no retirar los endpoints internos de WRITE/FEEDBACK.
4. **Configuración canónica:** definir nombres y fallback legacy; añadir diagnóstico de configuración que solo devuelva presencia/validez, nunca valores.
5. **Cobertura de capacidades críticas:** pruebas de salud, RBAC, restricciones, cambio de rol, revocación individual/global, limpieza remota de caché, cierre de cuenta y rollback.
6. **Plan de despliegue mínimo:** matriz de qué proyectos requieren nueva versión por cambio. Validación Beta posterior a todas las implementaciones locales y con autorización.


2. **Orquestación central de invalidación:** prototipo aislado con fetch inyectado; probar éxito, timeout, respuesta inválida, fallo parcial, repetición idempotente y recuperación.
3. **Migración de cliente:** conservar las funciones públicas actuales como adaptadores compatibles; no retirar los endpoints internos de WRITE/FEEDBACK.
4. **Configuración canónica:** definir nombres y fallback legacy; añadir diagnóstico de configuración que solo devuelva presencia/validez, nunca valores.
5. **Cobertura de capacidades críticas:** pruebas de salud, RBAC, restricciones, cambio de rol, revocación individual/global, limpieza remota de caché, cierre de cuenta y rollback.
6. **Plan de despliegue mínimo:** matriz de qué proyectos requieren nueva versión por cambio. Validación Beta posterior a todas las implementaciones locales y con autorización.

## 5. Matriz de aceptación obligatoria

| Capacidad | Condición de aceptación |
|---|---|
| Salud | Todos los servicios activos se diagnostican sin exponer secretos; LEGACY se excluye del inventario activo. |
| Restricción de cuenta | Los cambios de privilegio/estado siguen aplicando RBAC y no dejan permisos residuales. |
| Revocación individual | El token deja de autorizar operaciones protegidas y se confirma la invalidación de caché remota. |
| Revocación global | El epoch invalida todas las sesiones, incluso las distribuidas en varios bloques. |
| Caché remota | WRITE y FEEDBACK confirman el número exacto de tokens invalidados; los fallos quedan recuperables. |
| Cierre de cuenta | La cuenta no vuelve a autenticarse si la limpieza parcial falla; el flujo de compensación/continuación se conserva. |
| Compatibilidad | Una actualización interna de Coordinator no exige actualizar todos los clientes. |
| Configuración | No hay secretos en código ni frontend; faltantes/mismatch fallan de forma segura y diagnosticable. |
| Seguridad | Política deny-by-default, actor confiable, RBAC, leases, idempotencia y rollback permanecen activos. |

## 6. Riesgos y decisiones pendientes

- La invalidación remota hoy ocurre antes de la revocación central. Cambiarla requiere diseñar una cola/estado recuperable y evaluar la autorización de lecturas que usan actor cacheado.
- Un timeout de UrlFetch no permite saber si el destino ejecutó la operación; todos los nuevos comandos deben ser idempotentes.
- La configuración de URLs de servicios y los secretos directos de telemetría no deben migrarse hasta tener inventario de cada entorno.
- El cierre de cuenta tiene estados parciales intencionales; no se debe simplificar eliminando marcadores, auditoría ni rollback.
- Apps Script Libraries no se consideran solución automática: versionar una biblioteca también exige gestionar la versión referenciada por cada proyecto. Solo se adoptarán si una prueba demuestra una reducción real del coste de despliegue.

## 7. Límites de esta auditoría

Auditoría estática de fuentes y documentación de la rama de trabajo. No se consultaron ScriptProperties, secretos, deployments, hojas ni endpoints productivos. No se afirma que las configuraciones remotas coincidan ni que la revocación remota haya sido probada en vivo.
