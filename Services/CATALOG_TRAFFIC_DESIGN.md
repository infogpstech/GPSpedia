# Cobertura de tráfico global — Coordinator y contadores directos

**Tarea:** GP-DEV-TRAFFIC-GLOBAL-02  
**Fecha de actualización:** 2026-11-17  
**Estado:** contadores directos implementados en fuente para rutas no coordinadas; regresión y revisión de cobertura en curso.  
**Alcance:** código fuente de la rama de trabajo. No implica que los proyectos Apps Script desplegados tengan este código ni que sus Script Properties estén configuradas.

## Arquitectura

El panel Developer combina dos fuentes sin enviar una llamada de red por cada acción del usuario:

1. **Coordinator:** cuenta operaciones protegidas que obtienen una lease y lecturas del feed incremental. Mantiene buckets horarios de 24 horas.
2. **Contadores locales por servicio:** cada servicio cuenta solo las rutas POST que su router ejecuta directamente, sin lease Coordinator. Usa ScriptProperties y tryLock(0), sin esperar por lock.
3. **ADMIN:** al refrescar el panel consulta los cuatro endpoints de telemetría directa en una operación agrupada UrlFetchApp.fetchAll; si el lote falla globalmente, intenta cada endpoint por separado. Combina buckets con Coordinator y marca las fuentes parciales/no disponibles.
4. **Frontend:** consulta el agregado cuando el panel Developer está visible, con intervalo mínimo de 60 segundos. No almacena métricas locales del navegador ni las presenta como globales.

El endpoint getServiceTraffic de cada servicio es interno, protegido con un secreto servidor-a-servidor y no se contabiliza a sí mismo. La consulta ADMIN está reservada al rol Desarrollador y Coordinator excluye su propia operación de telemetría.

## Alternativas evaluadas

| Alternativa | Ventaja | Coste/riesgo | Decisión |
|---|---|---|---|
| Enviar cada acción directa al Coordinator | Agregado central | Un viaje de red por acción y dependencia/latencia extra | Rechazada |
| Mantener lock global durante lecturas de Spreadsheet | Conteo central | Serializa lecturas y puede degradar catálogo | Rechazada |
| CacheService como contador de 24 h | Escritura ligera | TTL, desalojos y ausencia de garantía de ventana | Rechazada |
| ScriptProperties + tryLock(0) local | Sin viaje de red por acción; no espera lock | Puede subcontar en contención; escritura local síncrona | Elegida como best-effort; medir en Beta |
| Envío agrupado desde navegador | Reduce llamadas si se agrupa | Pérdida al cerrar, retrasos, duplicados y solo clientes cooperantes | Rechazada como fuente autoritativa |

## Rutas instrumentadas

- **CATALOG:** getCatalogData, getDropdownData, getSuggestion y getNavigationData.
- **AUTH:** validateSession.
- **WRITE:** checkVehicle, getSuggestion y checkVinDuplicate.
- **FEEDBACK:** getPysData, getCatalogChanges y suggestYear anónimo (userId 0) son directos. sendContactForm y suggestYear autenticado se cuentan mediante Coordinator.
- **UTILITIES:** migrateTimestamps ya obtiene una lease UTILITIES dentro de su handler y se cuenta mediante Coordinator; no lleva contador local.
- **USERS:** getUsers, createUser y updateProfile pasan por Coordinator; no se añade contador local.
- **ADMIN:** operaciones pasan por Coordinator; ping se excluye como sondeo.

La auditoría de routers y ACTION_TO_SERVICE_MAP confirmó que las acciones anteriores son rutas directas conocidas; las demás operaciones protegidas usan Coordinator. No contar dos veces una operación que ya adquiere lease.

## Contrato del contador local

- Prefijo de bucket propio por servicio, retención de 24 horas y ventanas 1/6/24 h.
- tryLock(0) nunca espera. Si no se adquiere el lock, se omite el evento y no se llama releaseLock.
- Solo liberar el lock si la ejecución lo adquirió.
- Fallos de LockService/PropertiesService son best-effort y no cambian el status/cuerpo del handler.
- No guardar URL, payload, userId, token, sesión ni datos de hojas.
- Endpoint interno getServiceTraffic valida secreto aleatorio de al menos 32 caracteres con comparación de longitud constante; no expone el secreto.
- ADMIN realiza consultas directas agrupadas solo al refrescar el panel, no por cada operación de usuario.
- Una fuente que no tenga secreto o no responda se marca parcial/no disponible sin borrar ni reemplazar los conteos Coordinator.

## Configuración Beta pendiente

Generar un secreto aleatorio distinto por servicio (por ejemplo openssl rand -hex 32) y configurar el mismo valor en Script Properties del servicio correspondiente y en ADMIN:
- GPSpedia_AUTH_TRAFFIC_SECRET
- GPSpedia_CATALOG_TRAFFIC_SECRET
- GPSpedia_WRITE_TRAFFIC_SECRET
- GPSpedia_FEEDBACK_TRAFFIC_SECRET
No crear secreto para USERS, UTILITIES ni ADMIN: sus acciones conocidas ya pasan por Coordinator o usan el agregado central. Nunca guardar valores en el repositorio, navegador, logs o documentación. Desplegar los proyectos Apps Script actualizados solo en entorno Beta autorizado.

## Pruebas locales

- CatalogTrafficTelemetry: lock libre/ocupado, no espera, liberación correcta, buckets, retención, secretos y errores best-effort.
- DirectServiceTrafficTelemetry: AUTH/WRITE/FEEDBACK; acciones directas, buckets, secretos, lock ocupado y fallos de PropertiesService.
- ServiceTrafficAggregation: suma de Coordinator y contadores locales por servicio, conservación de otras métricas, entradas inválidas y fuentes parciales.
- ServiceTrafficBatch: fetchAll, fallback por endpoint, secreto faltante, error individual y fallo de PropertiesService.
- ServiceTrafficAdminContract: rol Developer, consulta de solo lectura, fuentes, rutas instrumentadas, UI y exclusión de métricas locales.
- SharedMutationCoordinator: feed público contado bajo el lock existente y atribución FEEDBACK conservada.
- Regresión completa, sintaxis y health remoto read-only; no reducir suites ni relajar aserciones.

## Medición Beta pendiente

1. Configurar los cinco secretos en los proyectos Beta.
2. Desplegar los servicios Apps Script actualizados.
3. Medir p50/p95 de las rutas directas instrumentadas antes/después.
4. Medir eventos omitidos por lock, fallos de PropertiesService y discrepancia frente a una referencia temporal independiente.
5. Verificar ADMIN, acceso exclusivo a Desarrollador, respuesta parcial por fuente y que el contador no añade esperas.
6. No declarar tráfico HTTP universal: rutas externas/legacy no instrumentadas y health probes permanecen excluidas.

**Límite de exactitud:** el agregado combina operaciones Coordinator y rutas directas conocidas instrumentadas en AUTH, CATALOG, WRITE y FEEDBACK; UTILITIES se cuenta mediante lease Coordinator. USERS y ADMIN se miden mediante Coordinator. Puede subcontar cuando tryLock(0) no está disponible y no incluye solicitudes externas o rutas no mapeadas. La disponibilidad y latencia de los servicios tienen prioridad sobre el conteo.
