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
