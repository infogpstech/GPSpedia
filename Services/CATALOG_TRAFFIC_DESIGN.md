# Métricas de tráfico, salud y monitoreo — arquitectura vigente

**Estado:** arquitectura fuente alineada con la coordinación central. Las métricas son best-effort y no certifican por sí solas la salud integral de dependencias ni el total de solicitudes HTTP.

## Fuentes de información

1. **Telemetría global de Coordinator:** registra adquisiciones de lease, validaciones de contexto y lecturas del feed incremental. Mantiene buckets horarios de 24 horas por servicio principal: AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN. La lectura global está protegida para el rol Desarrollador.
2. **Telemetría local del navegador:** `JS/Frontend/serviceTelemetry.js` mantiene en memoria del navegador actual hasta 200 eventos, buckets horarios de 24 horas, percentiles p50/p95 y tamaños de solicitud/respuesta. Incluye siete destinos de enrutamiento: los seis servicios principales y COORDINATOR. No persiste datos, no transmite eventos y no conserva payloads, tokens ni identificadores de usuario.
3. **Panel ADMIN:** presenta por separado el agregado global coordinado y las solicitudes del navegador actual. La consulta global se limita al panel Developer visible y tiene una ventana mínima de 60 segundos entre refrescos. Los datos locales nunca se suman al agregado global.
4. **Salud de endpoints:** comprueba identidad, estado y versión de los seis servicios principales y el endpoint opcional COORDINATOR. No ejecuta probes de Sheets ni Drive.

## Cobertura y límites

- El agregado global refleja únicamente operaciones que pasan por Coordinator y están instrumentadas. No representa el total de solicitudes HTTP ni incluye todas las lecturas directas no coordinadas.
- Las consultas al feed público de catálogo se atribuyen a CATALOG en el agregado global; el navegador registra el destino de red COORDINATOR en su telemetría local.
- USERS fue retirado como microservicio independiente por MIG-012. No tiene endpoint ni clave de telemetría. Sus operaciones de usuarios se enrutan a AUTH.
- LEGACY está retirado y no forma parte del inventario.
- COORDINATOR es opcional en el registro público de configuración para compatibilidad; cuando está habilitado, aparece en el diagnóstico de salud y en la telemetría local del navegador. No es una séptima categoría del agregado global de operaciones protegidas, que conserva las seis claves de servicio principal.
- Las métricas locales del navegador se reinician al cerrar/recargar la pestaña y no deben interpretarse como estadísticas poblacionales.
- Los fallos de telemetría no deben cambiar el resultado de la operación de negocio ni introducir esperas de red adicionales.

## Seguridad y arquitectura

- La coordinación entre servicios se realiza en el frontend mediante la configuración central. No se agregan URLs de otros servicios, secretos compartidos ni credenciales a Script Properties de servicios de negocio para instrumentar métricas.
- Coordinator mantiene su propio estado interno de leases y buckets de métricas. Las rutas de consulta global validan sesión y rol Desarrollador.
- Los probes de salud son GET de solo lectura y devuelven únicamente identidad estable, versión y estado. No exponen IDs de recursos, nombres de hojas, claves, tokens, secretos, excepciones ni stack traces.
- La consulta de salud no implica que Sheets, Drive, CacheService u otras dependencias estén disponibles.

## Inventario de salud

| Clave | Identidad | Fuente |
|---|---|---|
| AUTH | GPSpedia-Auth | `Auth.js` |
| CATALOG | GPSpedia-Catalog | `catalog.js` |
| WRITE | GPSpedia-Write | `write.js` |
| FEEDBACK | GPSpedia-Feedback | `feedback.js` |
| UTILITIES | GPSpedia-Utilities | `Utilities.js` |
| ADMIN | GPSpedia-Admin | `admin.js` |
| COORDINATOR | GPSpedia-SharedMutationCoordinator | `Coordinator.js` |

El workflow `deployed-service-health.yml` es manual y de solo lectura. Obtiene los siete endpoints de la configuración pública central y verifica el contrato JSON de cada uno; no utiliza URLs locales ni secretos.

## Validación

- `ServiceHealthContract.mjs`: clasificación de estados, identidad, versión, timeout, errores de red, stale y redacción.
- `RemoteServiceHealth.mjs`: prueba remota read-only de los siete endpoints usando el commit exacto y configuración central.
- `ServiceBrowserTrafficContract.mjs`: inventario de destinos, límites locales, percentiles y ausencia de datos sensibles.
- `ServiceTrafficAdminContract.mjs`, `ServiceTrafficAggregation.mjs` y `ServiceTrafficBatch.mjs`: agregado global, permisos, fuentes y respuestas parciales.
- `DirectTrafficRoutingCoverage.mjs`: verificación de ACTION_TO_SERVICE_MAP y separación de Coordinator.

## Validación Beta pendiente

El código fuente y las pruebas locales no certifican que los deployments Apps Script externos estén actualizados. Ejecutar el workflow remoto en entorno Beta autorizado y comprobar las siete identidades, versiones y estados. No cambiar deployments, Script Properties ni datos productivos desde esta tarea.
