# Plan de simplificación de arquitectura — GPSpedia

Fecha: 2026-11-19  
Rama de trabajo: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5`  
Estado: contrato v1, invalidación remota central y agregación central de telemetría implementados localmente; migración de secretos y configuración por entorno pendientes.

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
- `invalidateSessionActorCaches()` envía los tokens a Coordinator con identidad AUTH; Coordinator contacta WRITE y FEEDBACK usando sus URLs y secretos propios. El cliente ya no conoce credenciales ni URLs ajenas.
- `revokeSession()` y `revokeUserSessions()` conservan el orden invalidación remota confirmada antes de la revocación central.

### Configuración detectada

- Cada consumidor mantiene `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET`.
- Coordinator mantiene seis secretos de autenticación por servicio y un secreto dedicado de lectura para CATALOG; además, centraliza cinco URLs de telemetría y dos URLs de invalidación remota.
- AUTH, USERS, WRITE y FEEDBACK reutilizan su secreto Coordinator local para telemetría directa. CATALOG usa `GPSpedia_COORDINATOR_SECRET` con el secreto dedicado `GPSpedia_COORDINATOR_SECRET_CATALOG`.
- Los secretos directos `GPSpedia_<SERVICIO>_TRAFFIC_SECRET` se conservan como fallback legacy. ADMIN aún conserva URLs/secretos directos para hablar con Coordinators anteriores a 1.4.4; el flujo actual no los necesita.
- El frontend conserva URLs públicas para llamadas de servicio. ADMIN conserva las URLs de otros servicios únicamente para operaciones de administración que las requieren, además del fallback antiguo de telemetría.

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
3. **Implementado localmente:** operación central idempotente, confirmación individual de WRITE/FEEDBACK, lotes limitados y reintento seguro ante fallos parciales. No se declara éxito prematuramente.
4. **Verificado en pruebas aisladas:** se conserva el orden invalidación remota confirmada antes de revocación central y actualización de AUTH/ActiveSessions.
5. La eliminación/cierre de cuenta y los cambios de privilegio deben seguir revocando sesiones y conservar los marcadores de recuperación existentes.

### D. Configuración y secretos

1. Definir un catálogo canónico de nombres de propiedades y de URLs por entorno.
2. **Implementado localmente para telemetría:** AUTH/USERS/WRITE/FEEDBACK reutilizan su secreto Coordinator; CATALOG dispone de un secreto dedicado de solo lectura. Se mantienen secretos independientes por servicio.
3. Mantener secretos fuera del repositorio, frontend, Spreadsheet, logs y documentación.
4. **Implementado con fallback:** los endpoints de telemetría leen primero `GPSpedia_COORDINATOR_SECRET`; solo si no existe, aceptan la propiedad legacy. Un secreto nuevo presente pero incorrecto falla cerrado. No borrar propiedades antiguas hasta terminar despliegues y Beta.
5. Centralizar la configuración que necesita Coordinator para las llamadas entre servicios; validar URL, servicio de destino y secreto en el servidor.

## 4. Secuencia de implementación

1. **Contrato y pruebas de compatibilidad — IMPLEMENTADO LOCALMENTE:** protocolo POST v1 independiente de la versión de Coordinator. SharedMutationClient declara `protocolVersion: 1`; Coordinator interpreta la ausencia del campo como v1 para clientes antiguos y rechaza versiones desconocidas antes de ejecutar operaciones. Coordinator 1.4.4.
2. **Orquestación central de invalidación y telemetría — IMPLEMENTADAS LOCALMENTE:** AUTH delega la invalidación de caché en Coordinator, que contacta WRITE/FEEDBACK con sus secretos y URLs individuales; además, Coordinator consulta en paralelo CATALOG/AUTH/USERS/WRITE/FEEDBACK para devolver la telemetría global final. Las fuentes parciales no descartan el agregado; buckets duplicados/corruptos se ignoran y se señalan. SharedMutationClient ya no conoce URLs/secretos de WRITE/FEEDBACK para invalidar caché. ADMIN consume el agregado global central y mantiene fallback temporal para Coordinator anterior a 1.4.4.
3. **Migración de cliente y configuración canónica — EN PROGRESO:** conservar funciones públicas/adaptadores compatibles; unificar el secreto de telemetría con `GPSpedia_COORDINATOR_SECRET`, mantener fallback legacy seguro y centralizar URLs en Coordinator. CATALOG utiliza un secreto de lectura dedicado.
4. **Cobertura de capacidades críticas:** probar salud, RBAC, restricciones, cambios de rol, revocación individual/global, limpieza remota de caché, cierre de cuenta y rollback.
5. **Plan de despliegue mínimo:** matriz de qué proyectos requieren nueva versión por cambio. Validación Beta posterior a todas las implementaciones locales y con autorización.

## Estado actualizado de configuración (2026-11-19)

- Coordinator centraliza cinco URLs de telemetría: `GPSpedia_SERVICE_URL_CATALOG/AUTH/USERS/WRITE/FEEDBACK`. Reutiliza secretos de Coordinator de AUTH/USERS/WRITE/FEEDBACK y requiere un secreto dedicado `GPSpedia_COORDINATOR_SECRET_CATALOG` solo para lectura interna.
- Las fuentes AUTH/USERS/WRITE/FEEDBACK y CATALOG aceptan primero `GPSpedia_COORDINATOR_SECRET`; si está ausente, aceptan su propiedad de tráfico anterior. Si el secreto nuevo existe pero no coincide, fallan cerradas y no usan el fallback.
- ADMIN consume el agregado global central. La consulta directa con secretos antiguos se conserva solo como compatibilidad temporal para Coordinator anterior a 1.4.4.
- Valores remotos no leídos ni modificados. Antes de Beta se deben crear URLs y secreto CATALOG en cada entorno, copiar el mismo secreto dedicado a CATALOG y verificar que cada secreto local coincide con el valor de Coordinator.


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
