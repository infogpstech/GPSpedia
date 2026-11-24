# Métricas de tráfico, salud y monitoreo — estado vigente

**Actualización:** 2026-11-24  
**Alcance:** código activo de GPSpedia 2.2.5. Este documento reemplaza el diseño histórico de telemetría coordinada por Coordinator.

## Fuentes de información vigentes

1. **Telemetría local del navegador:** `JS/Frontend/serviceTelemetry.js` registra en memoria de la pestaña actual los seis servicios `AUTH`, `CATALOG`, `WRITE`, `FEEDBACK`, `UTILITIES` y `ADMIN`. Conserva hasta 200 eventos, buckets horarios de 24 horas, percentiles p50/p95 y tamaños de solicitud/respuesta.
2. **Salud de endpoints:** el workflow manual `.github/workflows/deployed-service-health.yml` consulta los seis servicios mediante el resolver de configuración central. Es una comprobación read-only de identidad, versión y estado; no prueba por sí sola la disponibilidad de Sheets, Drive o permisos.
3. **Panel de diagnóstico:** utiliza el snapshot local del navegador. No agrega datos de distintas sesiones ni mantiene un agregado global persistente.

## Límites y aislamiento

- La telemetría del navegador es efímera, local a la pestaña y no se transmite. No conserva payloads, tokens ni identificadores de usuario.
- Los fallos de telemetría no cambian el resultado de una operación de negocio ni introducen esperas de red.
- Los endpoints de salud se resuelven desde la configuración central; no se mantienen URLs de servicios en paralelo ni fallback local vencido.
- Los servicios no publican ni consultan métricas de negocio entre sí.
- No existe un agregado global de Coordinator ni una lease compartida para instrumentar las operaciones.
- USERS y COORDINATOR son claves retiradas; `CentralConfigurationReader.js` las rechaza explícitamente. El registro operativo admite únicamente los seis servicios principales.
- Las integraciones externas de Google Drive API y YouTube Data API no son endpoints de servicios GPSpedia y no forman parte de la telemetría de interconexión.

## Arquitectura retirada

MIG-024 retiró SharedMutation y MIG-025 retiró Coordinator, su lease, su endpoint de salud y el agregado global. Cualquier mención a buckets v1/v2 coordinados, leases globales, endpoint COORDINATOR o telemetría de siete destinos pertenece al diseño histórico y no describe el código activo.

## Validación

- `ServiceBrowserTrafficContract.mjs`: límites locales, percentiles y ausencia de datos sensibles.
- `ServiceHealthContract.mjs` y `RemoteServiceHealth.mjs`: contrato de diagnóstico y consulta remota read-only con configuración central.
- `DirectTrafficRoutingCoverage.mjs`: cobertura de rutas y separación de servicios.
- Las pruebas locales no certifican que los deployments externos estén actualizados. La identidad, versión y permisos reales siguen pendientes de Beta aislada.
