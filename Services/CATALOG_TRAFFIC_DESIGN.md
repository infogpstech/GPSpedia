# Cobertura de tráfico global — Coordinator y CATALOG

**Tarea:** GP-DEV-TRAFFIC-GLOBAL-02  
**Fecha de actualización:** 2026-11-17  
**Estado:** instrumentación local de CATALOG implementada; validación integral y cobertura de rutas directas restantes en curso.  
**Alcance:** fuentes de la rama de trabajo. No implica que los proyectos Apps Script desplegados tengan este código ni que sus Script Properties estén configuradas.

## Arquitectura verificada

El panel Developer combina fuentes sin enviar una llamada de red por cada acción del usuario:

1. **Coordinator:** cuenta operaciones protegidas que obtienen una lease y ciertos contextos/feeds de lectura. Mantiene buckets horarios de 24 horas y la consulta ADMIN/getServiceTraffic es de solo lectura y exclusiva de Desarrollador.
2. **CATALOG directo:** cuenta localmente las acciones POST getCatalogData, getDropdownData, getSuggestion y getNavigationData. Guarda buckets horarios en ScriptProperties. No usa Coordinator en cada lectura.
3. **ADMIN:** durante la consulta del panel, obtiene el agregado Coordinator y hace una consulta servidor-a-servidor a CATALOG. Combina ambos conteos y devuelve metadatos de fuente, precisión y posibles subcuentas.
4. **Frontend:** consulta el agregado cuando el panel Developer está visible, con intervalo mínimo de 60 segundos. No almacena un segundo contador local de navegador ni lo presenta como global.

El feed público Coordinator.doGet?catalogFeed=1 se cuenta dentro del lock ya existente del Coordinator, sin una llamada adicional ni un segundo lock. El feed conserva la identidad de servicio que lo solicita; el origen público se atribuye a CATALOG.

## Alternativas evaluadas

| Alternativa | Ventaja | Coste/riesgo | Decisión |
|---|---|---|---|
| Enviar cada lectura CATALOG al Coordinator | Agregado central | Un viaje de red por cada lectura y dependencia/latencia extra | Rechazada |
| Mantener lock global durante la lectura de Spreadsheet | Conteo central | Serializa lecturas y puede degradar el catálogo | Rechazada |
| CacheService como contador de 24 h | Escritura ligera | TTL máximo, desalojos y ausencia de garantía de ventana | Rechazada |
| ScriptProperties + tryLock(0) local por servicio | Sin viaje de red por acción; no espera por lock | Puede subcontar en contención; coste de PropertiesService en la petición que obtiene el lock | Elegida para CATALOG; medir en Beta |
| Envío agrupado desde navegador | Reduce llamadas si se agrupa | Pérdida al cerrar, retrasos, duplicados y cobertura solo de clientes cooperantes | Rechazada como fuente autoritativa |

## Implementación local de CATALOG

- JS/Services/catalog.js define buckets horarios de 24 h con prefijo GPSpedia_CATALOG_TRAFFIC_HOUR_V1_.
- El contador usa LockService.getScriptLock().tryLock(0). Si no obtiene el lock, omite solo la métrica; no espera ni altera la acción de catálogo.
- La liberación del lock está condicionada a que esta ejecución lo haya adquirido. Se corrigió un defecto detectado por la prueba de contención: antes se intentaba liberar también cuando tryLock(0) devolvía false.
- Los errores de LockService/PropertiesService son best-effort y no deben bloquear la respuesta de catálogo.
- getServiceTraffic es un endpoint interno ADMIN→CATALOG; no se cuenta a sí mismo. Valida un secreto de servidor y no devuelve identidad, sesión ni payloads.
- El secreto GPSpedia_CATALOG_TRAFFIC_SECRET debe existir con el mismo valor aleatorio (mínimo 32 caracteres) en Script Properties de los proyectos CATALOG y ADMIN del mismo entorno. Generarlo localmente (por ejemplo openssl rand -hex 32); no guardar ni compartir el valor en código, repositorio, navegador o logs.
- Sin el secreto o con el endpoint remoto no disponible, ADMIN conserva los datos de Coordinator y declara el contador directo CATALOG como parcial/no disponible. No lo transforma en cero confirmado.
- JS/Services/admin.js combina los buckets por hora, mantiene los demás servicios sin cambios y etiqueta best_effort_nonblocking / mayUndercount.
- El panel y su ayuda describen que el agregado no representa todas las solicitudes HTTP.

## Hallazgo adicional de cobertura pendiente

La auditoría de los routers confirma que todavía existen rutas POST que pueden entrar directamente al handler sin pasar por una lease/contador Coordinator:
- AUTH: validateSession y cualquier fallback no clasificado como operación compartida.
- WRITE: checkVehicle, getSuggestion y checkVinDuplicate; checkOperation sí pasa por Coordinator.
- USERS: acciones distintas de createUser, updateProfile y getUsers.
- FEEDBACK: getPysData, sendContactForm, getCatalogChanges y otras rutas públicas/no coordinadas; el feed se registra en Coordinator cuando llega al endpoint compartido.
- UTILITIES: migrateTimestamps se ejecuta en su propio doPost y no pasa actualmente por el wrapper compartido.
- ADMIN: ping se excluye intencionalmente; las demás operaciones pasan por el wrapper compartido.

Esta lista es una auditoría de rutas y no implica que todas deban instrumentarse automáticamente: antes hay que revisar llamadas reales, frecuencia, autenticación y si la ruta es un health probe o una consulta administrativa. No se deben contar dos veces las rutas que ya generan evento en Coordinator.

## Pruebas locales requeridas y evidencias

- CatalogTrafficTelemetry.mjs: lock disponible/ocupado, timeout cero, liberación correcta, buckets/retención 24 h, ventanas 1/6/24 h, secretos, errores best-effort y ausencia de datos sensibles.
- SharedMutationCoordinator.js: feed público contado bajo el lock existente y atribución FEEDBACK conservada.
- ServiceTrafficAggregation.mjs: suma por bucket, conservación de otros servicios, estado parcial si falta contador directo, entradas inválidas y no mutación de la respuesta de Coordinator.
- ServiceTrafficAdminContract.mjs: contrato ADMIN/Coordinator, autorización Developer, UI, intervalos y separación de métricas locales.
- Regresión completa, sintaxis y health remoto read-only deben ejecutarse después de las correcciones. Un fallo se investiga por su traza y se vuelve a probar; no se reducen suites ni aserciones.

## Validación Beta pendiente

1. Configurar el secreto de CATALOG/ADMIN en los proyectos Beta sin exponerlo.
2. Desplegar los proyectos Apps Script actualizados en el entorno Beta autorizado.
3. Medir p50/p95 de getCatalogData, getDropdownData, getSuggestion y getNavigationData con volúmenes comparables antes/después.
4. Medir eventos omitidos por lock, fallos de PropertiesService y discrepancia frente a una referencia temporal independiente.
5. Verificar el agregado ADMIN, sus metadatos de fuente, acceso exclusivo a Desarrollador y comportamiento cuando CATALOG no responde.
6. No declarar tráfico HTTP total mientras existan rutas directas no instrumentadas o health probes excluidos.

**Límite de exactitud:** el agregado actual combina operaciones Coordinator y cuatro acciones directas CATALOG. Es global entre fuentes instrumentadas, no una captura universal de HTTP. El contador CATALOG es best-effort y puede subcontar. No debe sacrificarse la latencia ni la disponibilidad de las lecturas para aumentar artificialmente el conteo.
