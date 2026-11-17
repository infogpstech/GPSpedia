# Cobertura de tráfico CATALOG — evaluación técnica

**Tarea:** GP-DEV-TRAFFIC-GLOBAL-02  
**Fecha:** 2026-11-17  
**Estado:** evaluación de alternativas; implementación incremental en curso.  
**Alcance:** código fuente de la rama de trabajo. No representa configuración ni despliegue de Apps Script.

## Situación verificada

- Coordinator agrega operaciones protegidas cuando se concede o renueva una lease y en la restauración de contexto de sesión.
- Las acciones directas `CATALOG/getCatalogData`, `getDropdownData`, `getSuggestion` y `getNavigationData` llegan al `doPost` del proyecto CATALOG y no adquieren una lease del Coordinator.
- El feed público `getCatalogChanges` se sirve desde `Coordinator.doGet?catalogFeed=1`; su handler ya ejecuta la lectura dentro del lock existente.
- El endpoint `getServiceTraffic` de ADMIN ya exige contexto de Desarrollador y consulta el agregado de Coordinator. El frontend lo refresca como máximo cada 60 segundos mientras el panel global está visible.

## Alternativas evaluadas

| Alternativa | Ventaja | Coste/riesgo | Decisión |
|---|---|---|---|
| Enviar cada lectura CATALOG al Coordinator | Agregado central y conteo uniforme | Un viaje de red adicional por cada lectura; aumenta latencia y dependencia de Coordinator | Rechazada |
| Mantener un lock durante la lectura de Spreadsheet | Conteo central sencillo | Serializa lecturas públicas y puede degradar el catálogo | Rechazada |
| Contador de CacheService sin lock | Sin espera de lock ni red adicional | CacheService tiene TTL máximo de seis horas, puede desalojar entradas y no garantiza ventana fiable de 24 h | No satisface la ventana actual |
| Contador local de ScriptProperties con `tryLock(0)` | Sin llamada de red por petición; no espera el lock; almacenamiento pequeño por buckets horarios | La petición que obtiene el lock paga el coste de lectura/escritura de propiedades; si hay contención, se omite el evento | Candidato para prototipo y medición Beta |
| Contadores en el navegador y envío agrupado | Evita un viaje por cada acción si se agrupa | Solo mide clientes cooperantes; retrasos, pérdida al cerrar sesión, duplicados y exclusión de tráfico externo | No es fuente autoritativa |

## Cambio de bajo riesgo ya implementado

La consulta del feed público se contabiliza ahora como CATALOG dentro del mismo `withCoordinatorLock_` que ya protegía su lectura. No añade llamada de red ni adquiere un segundo lock. Las consultas internas atribuidas a FEEDBACK mantienen esa identidad. La escritura de telemetría es best-effort y no debe cambiar el resultado del feed.

## Propuesta para las acciones directas de CATALOG

1. Añadir un contador horario local en el proyecto Apps Script CATALOG usando ScriptProperties.
2. Ejecutar la actualización con `LockService.getScriptLock().tryLock(0)`: nunca esperar por el lock. Si no se obtiene inmediatamente o falla PropertiesService, omitir solo la métrica y continuar la respuesta normal.
3. Guardar únicamente conteos por hora durante 24 horas; eliminar buckets vencidos en el primer evento de una nueva hora. No guardar URLs, payloads, IDs, usuario, sesión ni datos de hoja.
4. Contar las cuatro acciones públicas reconocidas en el router CATALOG; excluir el propio endpoint de lectura de telemetría.
5. Exponer un endpoint de solo lectura protegido por un secreto de servicio independiente. ADMIN lo consulta solo cuando el panel Developer refresca el agregado (máximo una vez por minuto), no por cada acción de usuario.
6. Configurar el mismo secreto aleatorio `GPSpedia_CATALOG_TRAFFIC_SECRET` en ScriptProperties de CATALOG y ADMIN durante la preparación del entorno Beta. Nunca incluir el valor en código, navegador, logs ni repositorio.
7. ADMIN combina los buckets CATALOG con Coordinator y devuelve metadatos de fuente y precisión. La UI debe distinguir el conteo CATALOG best-effort de las operaciones protegidas registradas por Coordinator. Si falta la configuración, CATALOG aparece como no disponible, nunca como cero confirmado.

## Validaciones locales requeridas antes de cerrar

- El contador usa `tryLock(0)`; no llama a `waitLock` y la lectura continúa si el lock no está disponible.
- Las excepciones de LockService/PropertiesService no cambian el status ni el cuerpo de las acciones CATALOG.
- Buckets horarios, límites de 1/6/24 h y eliminación de datos vencidos.
- El endpoint de métricas rechaza secreto ausente/incorrecto y no devuelve datos personales.
- ADMIN solo consulta CATALOG después de validar al Desarrollador; un fallo CATALOG no invalida los datos de Coordinator.
- La combinación de buckets no duplica ni desplaza conteos y marca explícitamente la fuente/precisión.
- Pruebas de concurrencia simulada y reintentos; no reducir suites ni relajar aserciones existentes.

## Medición Beta pendiente

Comparar p50/p95 de `getCatalogData`, `getDropdownData` y `getNavigationData` antes/después con volúmenes comparables. Medir porcentaje de eventos omitidos por lock, errores de PropertiesService y discrepancia frente a un conteo de referencia temporal. Si el coste de PropertiesService resulta significativo, retirar la instrumentación CATALOG y conservar la exclusión explícita en la UI; no degradar la lectura pública para obtener un contador aparentemente completo.

**Límite de exactitud:** el agregado combinado no representa solicitudes HTTP externas arbitrarias ni health probes. El origen CATALOG es best-effort; Coordinator continúa midiendo operaciones protegidas. La interfaz debe mostrar esta diferencia en todo momento.
