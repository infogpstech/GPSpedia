# Auditoría P0 — costo de telemetría en rutas ordinarias

**Fecha:** 2026-11-22  
**Repositorio:** `infogpstech/GPSpedia`  
**Rama inspeccionada:** `GPSpedia2.2.5_work`  
**HEAD inspeccionado:** `4a1a88f17c133d6a3a23001b57013d092741d894`  
**Normativa:** `NORMAS_DESAROLLO.md`, §§ 8, 11 y 15  
**Tipo de revisión:** estática de código y trazado de llamadas; sin cambios productivos.

## Objetivo

Comprobar que la telemetría no añada viajes de red, esperas, locks ni escrituras síncronas que degraden acciones ordinarias, conforme al requisito expreso de §15.

## Resultado ejecutivo

Se confirmó un costo adicional en el camino de varias acciones: los contadores directos de USERS, WRITE y FEEDBACK realizan operaciones síncronas de `PropertiesService` durante el procesamiento de la petición. Además, Coordinator actualiza su contador dentro de la sección protegida por el ScriptLock. No se encontró que la telemetría local del navegador genere un viaje de red adicional.

**Hallazgo:** la persistencia de métricas en el camino de ejecución contradice el objetivo de §15 de evitar escrituras que degraden acciones de usuario. El impacto temporal real no se cuantificó; esta auditoría no atribuye milisegundos ni afirma una degradación medida.

## 1. Telemetría del navegador

Archivos: `JS/Frontend/serviceTelemetry.js` y `JS/Frontend/api-config.js`.

- `recordBrowserServiceTraffic` acumula métricas en memoria de la pestaña; el historial está acotado a 200 eventos.
- `routeActionInternal_` mide bytes UTF-8 del request/response y duración de la solicitud ya realizada.
- Los errores de telemetría se capturan y no alteran la respuesta de la acción.
- No se detectó persistencia local/remota ni un request adicional generado por este contador.

**Clasificación:** compatible con §15 en la ruta inspeccionada; no requiere cambio por esta evidencia.

## 2. Contadores directos de servicios

### USERS

En `JS/Services/users.js`, `doPost` llama a `recordUsersDirectTraffic_` para cada `getUsers`.

La función obtiene `PropertiesService.getScriptProperties()`, lee el bucket horario mediante `getProperty`, incrementa el contador y ejecuta `setProperty`. Cuando no existe el bucket horario, obtiene todas las propiedades y elimina claves fuera de ventana.

El bloque está envuelto en `try/catch`, no toma ScriptLock y acepta subconteo concurrente. Aun así, la lectura/escritura de propiedades es síncrona en la ruta de una lectura ordinaria.

### WRITE

En `JS/Services/write.js`, `recordDirectServiceTraffic_` se ejecuta para `checkVehicle`, `getSuggestion` y `checkVinDuplicate`.

Cada invocación hace lectura y escritura del bucket de PropertiesService. Al crear el primer bucket de la hora también inspecciona propiedades y puede eliminar claves antiguas. El contador es best-effort, no toma ScriptLock y puede subcontar por concurrencia.

### FEEDBACK

En `JS/Services/feedback.js`, el conjunto `DIRECT_SERVICE_TRAFFIC_CONFIG_.actions` incluye lecturas y mutaciones de reportes, PyS, Tutoriales, Inbox, actividad, vídeo y `getCatalogChanges`.

Cada acción incluida llama a `recordDirectServiceTraffic_` antes de continuar al dispatcher. El contador hace lectura y escritura síncrona de PropertiesService; en el primer bucket horario también recorre las propiedades y limpia claves antiguas. El error se absorbe, pero el trabajo normal sí espera a que termine la operación de telemetría.

En `getCatalogChanges`, además, Coordinator registra el evento de feed en su propio contador; por tanto, una lectura incremental puede actualizar contadores en ambos proyectos.

**Clasificación común:** no hay un viaje HTTP añadido por estos contadores ni un lock local añadido en USERS/WRITE/FEEDBACK, pero sí hay operaciones de PropertiesService en el camino de la petición. Su precisión tampoco es exacta: los read-modify-write concurrentes pueden subcontar.

## 3. Coordinator: telemetría dentro del lock global

Archivo: `JS/Services/Coordinator.js`.

- `withCoordinatorLock_` adquiere el ScriptLock con `tryLock(5000)` y lo libera en `finally`.
- En `acquire_`, después de guardar la lease, se invoca `recordServiceTrafficEvent_` antes de salir del callback protegido.
- `recordServiceTrafficEvent_` ejecuta `getProperty` y `setProperty` sobre ScriptProperties.
- `getCatalogChanges_` también registra el evento dentro de `withCoordinatorLock_`, antes de leer el snapshot de propiedades del feed.

La telemetría no adquiere un segundo lock ni un viaje de red, pero añade trabajo de PropertiesService a la sección crítica compartida. Como resultado, extiende el intervalo durante el cual otras solicitudes a Coordinator pueden esperar. El contador es best-effort y su fallo se absorbe.

## 4. Panel ADMIN y consultas de métricas

- `getServiceTraffic` está restringido al rol Desarrollador y se consume desde el panel ADMIN.
- El refresco del panel está condicionado a que la vista/gráfico estén activos y mantiene un intervalo mínimo de 60 segundos.
- La agregación global consulta los servicios directamente desde Coordinator mediante `fetchAll`; este trabajo pertenece a la consulta administrativa explícita, no a cada acción ordinaria del usuario.
- Se conserva la distinción entre métricas locales del navegador, contadores de servicios y eventos protegidos del Coordinator; sus scopes no son intercambiables.

**Clasificación:** la consulta agregada del panel no es el problema principal de esta auditoría. No se recomienda eliminar el panel ni su control RBAC.

## 5. Hallazgos y severidad

| ID | Evidencia | Impacto potencial | Severidad |
|---|---|---|---|
| TEL-01 | USERS/WRITE/FEEDBACK persisten buckets desde el dispatcher de acciones | Operaciones síncronas de PropertiesService por petición ordinaria | Media |
| TEL-02 | Coordinator persiste métricas dentro del ScriptLock | Amplía la sección crítica y puede aumentar espera de solicitudes concurrentes | Media |
| TEL-03 | FEEDBACK y Coordinator contabilizan por separado `getCatalogChanges` | Dos escrituras de métricas en proyectos distintos para una misma lectura lógica | Baja/Media |
| TEL-04 | Browser telemetry es local, acotada y best-effort | No se identificó viaje adicional ni escritura persistente | Sin hallazgo |

No se midió latencia ni contención real. Las severidades describen exposición arquitectónica, no un daño temporal cuantificado.

## 6. Recomendación y siguiente trabajo

1. Diseñar una política explícita para el diagnóstico de tráfico: distinguir requests de navegador, llamadas interservicio y operaciones protegidas; no presentar contadores best-effort como cifras exactas.
2. Retirar o reducir la persistencia síncrona por petición de USERS/WRITE/FEEDBACK solo después de confirmar qué datos necesita realmente el panel ADMIN y cómo conservará su scope.
3. Evaluar mover la escritura de métricas de Coordinator fuera de la sección crítica, manteniendo el resultado de lease/feed independiente del fallo de telemetría.
4. Mantener el panel ADMIN restringido a Desarrollador y su refresco condicionado a visibilidad.
5. Añadir contratos que demuestren que un fallo de telemetría no cambia el resultado funcional, que la ruta ordinaria no añade requests ni locks y que la sección crítica de Coordinator no espera por persistencia de métricas.

**Decisión de esta auditoría:** no se modificó código. El hallazgo está confirmado estáticamente, pero el rediseño requiere un contrato de observabilidad antes de retirar contadores que alimentan el panel.

## Validación y límites

- Revisión de llamadas y funciones en los archivos indicados: COMPLETADA.
- Sintaxis y regresión: no aplican; no se modificó código.
- Pruebas de rendimiento/contención: no ejecutadas; requieren harness reproducible y, para métricas reales de Apps Script/PropertiesService, Beta aislada.
- No se desplegó Apps Script ni se modificaron secretos, propiedades, Spreadsheet, Drive o datos productivos.


## 7. Implementación TEL-02 — Coordinator fuera de ScriptLock (2026-11-22)

Se aplicó la primera corrección sin cambiar el protocolo compartido:

- `acquire_` devuelve el evento de métrica como dato interno del resultado protegido y lo persiste después de salir de `withCoordinatorLock_`. Se conserva el conteo de leases nuevas y de reactivación de mantenimiento; una repetición idempotente de una lease activa no genera un conteo adicional.
- `validateSessionContext_` obtiene el actor bajo el lock y registra la métrica después de liberar el lock.
- `getCatalogChanges_` obtiene el snapshot/respuesta bajo el lock y registra el evento después. Se conserva PUBLIC→CATALOG y FEEDBACK→FEEDBACK.
- La escritura continúa siendo best-effort. Un fallo posterior no revierte una lease confirmada ni altera la respuesta del feed.
- Versión del Coordinator: 1.4.6; `SHARED_MUTATION_PROTOCOL_VERSION` permanece en v1.

**Validación contractual:** `SharedMutationCoordinator.js` ejecutado de forma aislada con dobles de PropertiesService/LockService: 95/95 PASS, 0 fallos. El harness detecta lecturas/escrituras de buckets mientras el lock está retenido y permite inyectar fallos de propiedades. Los contratos verifican cero accesos de telemetría bajo lock en acquire/feed, conservación del conteo y resultado funcional ante fallos.

**Límite:** no se ha desplegado Apps Script ni medido latencia/contención real. La corrección TEL-02 queda COMPLETADA localmente con validación contractual; TEL-01/TEL-03 (persistencia directa por petición y doble conteo entre FEEDBACK/Coordinator) siguen pendientes.


## 8. Ampliación de alcance — fuentes directas AUTH y CATALOG (2026-11-22)

La primera revisión documentó USERS, WRITE y FEEDBACK, pero el agregado ADMIN consulta cinco fuentes directas. La inspección de sus routers y contratos amplía el hallazgo TEL-01:

| Servicio | Acciones instrumentadas | Costo en la ruta |
|---|---:|---|
| AUTH | 1: `validateSession` | `getProperty` + `setProperty`; al abrir bucket nuevo, también `getProperties` y limpieza |
| CATALOG | 6 lecturas: `getCatalogData`, `getDropdownData`, `getSuggestion`, `getNavigationData`, `getVehicleProjection`, `getContributionCandidates` | Adquiere `ScriptLock.tryLock(0)`; si lo obtiene, lee/escribe PropertiesService bajo ese lock. Si está ocupado, omite el contador sin esperar |
| USERS | 1: `getUsers` | `getProperty` + `setProperty`; al abrir bucket nuevo, escaneo/limpieza |
| WRITE | 3: `checkVehicle`, `getSuggestion`, `checkVinDuplicate` | `getProperty` + `setProperty`; al abrir bucket nuevo, escaneo/limpieza |
| FEEDBACK | 40 acciones de lectura y mutación | `getProperty` + `setProperty`; al abrir bucket nuevo, escaneo/limpieza |

Los contadores AUTH/USERS/WRITE/FEEDBACK no adquieren ScriptLock, pero sí realizan operaciones síncronas de PropertiesService antes de despachar la acción. CATALOG usa un lock no bloqueante: no espera si está ocupado, pero cuando lo obtiene mantiene el lock compartido durante su lectura/escritura de métrica. Ninguno de estos contadores es un control de seguridad ni un rate limit; son best-effort y pueden subcontar por carreras.

### 8.1 Consumidores y semántica de ADMIN

- `Coordinator.readServiceTraffic_` agrega los siete servicios y después consulta por `fetchAll` las cinco fuentes directas AUTH/CATALOG/USERS/WRITE/FEEDBACK.
- ADMIN suma los contadores directos a las operaciones registradas por Coordinator y marca cobertura parcial cuando una fuente no está disponible.
- La UI separa las solicitudes locales del navegador de las operaciones globales; el gráfico global no pretende representar todas las solicitudes HTTP.
- AUTH/`validateSession` sí tiene consumidor en la validación/restauración de sesión del cliente.
- FEEDBACK/`getCatalogChanges` está incluido en sus 40 acciones y también se registra en Coordinator como FEEDBACK; el agregado suma ambos contadores, por lo que una lectura puede aparecer dos veces.
- CATALOG mide seis lecturas directas; el feed público se contabiliza en Coordinator como CATALOG. Son scopes diferentes y actualmente se suman.

### 8.2 Decisión de rediseño

Para cumplir NORMAS §15, la siguiente implementación debe retirar las escrituras y el lock de telemetría de las rutas ordinarias de las cinco fuentes directas. El diagnóstico ADMIN conservará el agregado de Coordinator, con alcance explícito de operaciones que obtuvieron lease, validaciones de contexto y feed que Coordinator registra; no se interpretará como total de requests. La telemetría local del navegador conservará su alcance de pestaña/dispositivo.

El colector ADMIN no necesita consultar cinco servicios adicionales si el nuevo contrato declara que las lecturas directas no se recopilan. Se debe eliminar ese fan-out en el flujo nuevo y actualizar la descripción visual para distinguir:
- operaciones registradas por Coordinator (global, best-effort);
- solicitudes/bytes/latencia observados en el navegador actual (local);
- health checks (diagnóstico independiente, no tráfico de usuario).

No se deben mostrar contadores directos ausentes como ceros reales. El endpoint global seguirá restringido a Desarrollador y el refresco condicionado a visibilidad.

**Estado de esta ampliación:** auditoría de los cinco scopes y consumidores COMPLETADA; cambios de los contadores directos y actualización del contrato ADMIN PENDIENTES.

## 9. Implementación TEL-01/TEL-03 — contadores directos retirados (2026-11-22)

Se aplicó el rediseño acordado después de mapear los consumidores del panel ADMIN:

- AUTH, CATALOG, USERS, WRITE y FEEDBACK ya no ejecutan contadores directos ni exponen endpoint interno getServiceTraffic. Se eliminaron las llamadas a PropertiesService por petición y el lock no bloqueante que usaba CATALOG.
- Coordinator ya no consulta cinco endpoints de servicios con fetchAll para construir el agregado global. El fetchAll de precarga de actores se conserva porque es una operación funcional independiente.
- El agregado global contiene solo adquisiciones nuevas de lease, validaciones de contexto y lecturas del feed que Coordinator registra. Se etiqueta como best-effort y no equivale al total HTTP.
- Las fuentes directas se declaran con directRequestsAvailable:false y reason:direct_requests_not_collected; no se convierten en ceros confirmados.
- FEEDBACK/getCatalogChanges se cuenta una sola vez por Coordinator; ya no se suma el contador FEEDBACK duplicado.
- La UI mantiene el panel Developer, RBAC, refresco condicionado a visibilidad y métricas efímeras locales del navegador. El gráfico local no se transmite ni persiste.
- GPSpedia_CATALOG_TRAFFIC_SECRET se conserva solo para autenticar los metadatos internos del inventario de imágenes entre ADMIN y CATALOG; no es secreto de telemetría.
- Coordinator 1.4.7; protocolo compartido v1 sin cambios.

**Validación local:** HEAD 29cc8d142d08611a0226ecd3c2bee09ad4517125 aprobó CI integral: 299 suites / 3,453 pruebas / 0 fallos; sintaxis 430 archivos JS/MJS; referencias relativas 341 archivos; health read-only 7/7; Pages build/deployment SUCCESS. Esta evidencia no equivale a despliegue Apps Script ni pruebas Beta.

**Costo residual:** Coordinator aún persiste sus propios eventos best-effort después de liberar el lock. Son lecturas/escrituras de PropertiesService adicionales en operaciones coordinadas; no se ha medido si degradan la latencia. Mantenerlos provisionalmente conserva el agregado parcial ADMIN; medirlos en Beta aislada antes de decidir su retirada o sustitución. La UI no los presenta como total HTTP.
## 10. Consulta ADMIN de telemetría fuera de ScriptLock (2026-11-22)

El lector `readServiceTraffic_` también adquiría el ScriptLock global para leer buckets y limpiar métricas expiradas. Como los eventos se escriben fuera del lock y cada bucket se reemplaza mediante una escritura atómica de propiedad, ese lock no protegía la lectura frente al escritor; solo podía retrasar operaciones que sí necesitan Coordinator.

En Coordinator 1.4.8 se elimina `withCoordinatorLock_` del lector ADMIN. Se mantiene la validación del servicio/acción, el agregado de siete servicios, la limpieza de buckets expirados/esquema inválido y la lectura best-effort. No se añaden requests ni fan-out. Los buckets actuales pueden leerse mientras otro evento se registra; la métrica es diagnóstica y no transaccional.

**Límite restante:** `recordServiceTrafficEvent_` todavía ejecuta un get/set de PropertiesService fuera del lock para los eventos Coordinator. No afecta a rutas directas ordinarias, pero añade persistencia a adquisiciones de lease, validaciones de contexto y lecturas del feed. Su costo debe medirse en Beta aislada; si degrada acciones, retirar o rediseñar. No declarar costo cero antes de esa medición.
## 11. Lectura concurrente de buckets — Coordinator 1.4.9 (2026-11-22)

Se ajustó la limpieza del lector ADMIN: los buckets con timestamp válido dentro de la ventana, pero JSON/esquema inválido, se omiten sin borrarlos. Como el escritor best-effort actualiza la propiedad sin ScriptLock, una lectura concurrente podría observar el valor anterior y eliminar una escritura nueva si ejecutara `deleteProperty` sobre la misma clave.

Solo se eliminan claves con timestamp inválido o fuera de la ventana de 24 horas. La lectura continúa fuera de ScriptLock y el agregado se mantiene diagnóstico/no transaccional.

## 12. Confirmación CI del rediseño TEL-01/TEL-03 (2026-11-22)

El commit 29cc8d142d08611a0226ecd3c2bee09ad4517125 superó la regresión integral: 299 suites, 3,453 pruebas aprobadas y cero fallos. El análisis estático comprobó sintaxis en 430 archivos .js/.mjs y referencias relativas en 341 módulos/runner/tests activos. El diagnóstico remoto de salud realizó únicamente GET y confirmó 7/7 servicios. GitHub Pages build/deployment finalizó correctamente.

Este CI confirma el código y los contratos locales de esa revisión. No despliega los proyectos Apps Script ni sustituye las pruebas Beta. El costo residual de escritura de Coordinator permanece pendiente de medición real.
