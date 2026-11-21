# Auditoría integral de latencia, llamadas y simplificación — 2026-11-21

Estado: **EN CURSO — hallazgos preliminares registrados como tareas pendientes.**  
Rama: `GPSpedia2.2.5_work`  
HEAD de partida: `dba61b0f6cba0a152d58d314b52eac5120576d86`  
Base protegida: `GPSpedia2.2.5` (no modificar).

## Objetivo

Acelerar la navegación y todos los aportes de usuarios, especialmente escrituras y cargas de imágenes/vídeos, eliminando viajes de red, lecturas, escrituras de telemetría, locks, leases, esperas y reintentos que no aporten una garantía necesaria. No reducir controles de integridad, idempotencia, autorización por rol ni recuperación de fallos.

Esta auditoría debe evaluar el costo completo desde el navegador hasta los servicios y sus dependencias: número de requests, llamadas entre proyectos Apps Script, lecturas/escrituras Spreadsheet/Drive, bytes transferidos, tiempo de espera, procesamiento en cliente y trabajo repetido. Una reducción de locks por sí sola no demuestra una mejora de navegación.

## Hallazgos preliminares confirmados por inspección estática

1. **AUTH mantiene un conjunto amplio de acciones bajo `withSharedMutationLease_`**, entre ellas `touchSession`, `acceptTerms`, login, recuperación, cambios de contraseña, revocación, eliminación y actualización de usuarios. La política debe contrastarse con §15 de `NORMAS_DESAROLLO.md`, identificar cada consumidor real y separar las excepciones de sesión que el usuario pidió conservar de las acciones ordinarias. No retirar aún ninguna protección de login, bloqueo temporal, cierre remoto o eliminación de cuenta.
2. **USERS conserva lease compartida para `createUser` y lock físico fail-fast para unicidad/escritura.** La lease parece relacionada con la carrera de creación/eliminación entre USERS y AUTH; debe demostrarse si puede sustituirse por una operación mínima segura o si debe permanecer. No eliminar el control de unicidad de usuario/ID.
3. **La sesión cacheada se obtiene mediante `getCachedSharedSessionActor_`** en USERS, WRITE, FEEDBACK y ADMIN. Auditar TTL, invalidación, revocación, cambios de rol/epoch, cache misses y fallback remoto. El cache hit no equivale por sí solo a revocación inmediata; comprobar si las excepciones de §15 están satisfechas sin validar cada clic.
4. **FEEDBACK, WRITE y ADMIN publican cambios del catálogo a través de Coordinator.** Verificar si un aporte genera una publicación única, si se publican resets redundantes, si un lote se divide correctamente, y si las pantallas consumen deltas o vuelven a descargar snapshots. Mantener la coherencia del catálogo; no suprimir eventos sin comprobar su efecto.
5. **ADMIN realiza llamadas a WRITE para reservas de ID y llamadas a CATALOG para datos/proyecciones.** Clasificar cada llamada como dependencia necesaria o consulta repetida; revisar si el consumidor vuelve a leer lo que ya recibió, si se pueden transportar los datos en la respuesta original y si la reserva de ID añade viajes evitables. La unicidad y la idempotencia de IDs deben mantenerse.
6. **Hay transferencias externas de archivos en FEEDBACK y WRITE/ADMIN** (incluyendo rutas de imagen y YouTube). Deben analizarse por separado: flujo navegador→Apps Script→Drive/API, codificación/base64, compresión, tamaño, duplicación de upload, conversiones, reintentos y lectura posterior. La inspección estática detecta llamadas `UrlFetchApp.fetch` para contenido de imagen y YouTube, pero no permite concluir por sí sola que sean redundantes ni que el flujo esté optimizado.
7. **La telemetría directa de AUTH/USERS** registra tráfico y usa propiedades del script. Confirmar que es best-effort, no añade una llamada remota, no serializa solicitudes y no bloquea acciones cuando PropertiesService falla.
8. **Frontend:** `api-config.js` centraliza `routeAction` y expone wrappers para catálogo, FEEDBACK, Inbox y acciones. Falta cerrar el mapa de consumidores para acciones de sesión y contrastar cada wrapper con su llamada real, para detectar doble routing, doble fetch, reintentos superpuestos, carga de snapshot duplicada y solicitudes iniciadas por varios módulos al abrir una pantalla.
9. **Catálogo, imágenes y vídeos:** revisar `catalogRequest.js`, `catalogStatus.js`, `imageObjectUrlCache.js`, `thumbnailCompressionQueue.js`, `youtubeUpload.js`, `pys-data.js`, los componentes de lightbox/miniaturas y los handlers backend. Medir caché, concurrencia, cancelación, URLs temporales, compresión, miniaturas, lecturas Drive y rehidratación de vistas. No cambiar calidad, formatos ni límites sin pruebas de compatibilidad.

## Tareas pendientes y orden de ejecución

### P0 — mapa de llamadas y línea base medible
- [ ] Construir un mapa de llamadas navegador → endpoint → handler → servicios dependientes para AUTH, USERS, WRITE, FEEDBACK, ADMIN, CATALOG, UTILITIES y COORDINATOR.
- [ ] Inventariar todos los `UrlFetchApp.fetch`, wrappers de fetch, llamadas a `routeAction`, reintentos y publicaciones de catálogo; registrar origen, destino, acción, consumidor y propósito.
- [ ] Identificar llamadas duplicadas en una misma interacción y solicitudes paralelas que descargan el mismo dato.
- [ ] Definir mediciones reproducibles por flujo: abrir aplicación, catálogo, búsqueda, detalle, crear/editar corte, PyS, tutorial, vídeo, reporte, Inbox y carga de imágenes. Medir requests, bytes, latencia p50/p95, lecturas/escrituras y tiempo de espera. Distinguir caché fría/caliente y red normal/lenta.
- [ ] Añadir o reutilizar instrumentación local no bloqueante; no introducir telemetría remota síncrona ni escrituras por cada clic.

### P0 — sesión, AUTH y USERS
- [ ] Completar mapa de consumidores reales de `touchSession`, `acceptTerms`, `validateSession`, `createUser`, `deleteUser`, recuperación, cambio de contraseña y logout.
- [ ] Determinar si `touchSession` y `acceptTerms` generan tráfico redundante o coordinación innecesaria; retirar solo después de probar las rutas de consumidor y el contrato de sesión.
- [ ] Revisar las políticas de lease AUTH frente a §15: mantener solo las excepciones explícitas (cierre remoto, invalidación de caché/sesiones, eliminación de cuenta e intentos fallidos temporales), y documentar cualquier dependencia estrictamente necesaria.
- [ ] Verificar que rol/capacidad se resuelven desde sesión confiable sin consultas remotas por acción; mantener RBAC y no confiar en datos del navegador.
- [ ] Resolver la coordinación USERS `createUser` ↔ AUTH `deleteUser`: probar carreras, reintentos y cuentas parcialmente creadas; proponer el mecanismo mínimo seguro antes de retirar la lease.
- [ ] Auditar llamadas de revocación/sincronización de sesiones desde handlers AUTH y detectar validaciones repetidas en la misma operación.
- [ ] Probar caché de actor: hit/miss, expiración, invalidación por logout/eliminación/cambio de rol y fallos de Coordinator. Asegurar que la caché no permita conservar permisos revocados más allá de la política admitida.

### P1 — aportes y dependencias entre servicios
- [ ] WRITE: trazar cada alta/edición de corte desde frontend hasta Spreadsheet/Drive y CATALOG; localizar lecturas previas repetidas, read-backs duplicados, reservas repetidas y publicaciones redundantes.
- [ ] FEEDBACK: auditar reportes, sugerencias, votos, PyS, tutoriales y vídeos; confirmar que cada operación escribe una sola vez, registra actor/fecha una sola vez y publica una invalidación/delta adecuada.
- [ ] ADMIN: trazar cada acción que consulta WRITE/CATALOG/FEEDBACK; evitar volver a pedir información ya disponible y separar operaciones de mantenimiento/destructivas de flujos ordinarios.
- [ ] CATALOG/Coordinator: comprobar cursores, deltas, resets, snapshots, invalidaciones y lecturas duplicadas; verificar que el cliente no descarga un snapshot completo después de recibir un delta válido.
- [ ] Inbox y actividad: comprobar que la eliminación de locks no introdujo lecturas repetidas, refrescos completos ni pérdida de datos; confirmar caché por usuario/sesión y paginación.
- [ ] Confirmar que servicios que comparten datos solo hacen la llamada interservicio necesaria; no sustituir una llamada de servidor por múltiples llamadas del navegador.

### P1 — imágenes, vídeos y otros archivos
- [ ] Trazar upload de imagen desde selección hasta persistencia y vista: compresión, tamaño, MIME, base64/data URL, llamadas HTTP, Drive, metadata y respuesta al cliente.
- [ ] Detectar si imagen original y miniatura se suben/descargan más de una vez; reutilizar URL/metadata ya devuelta cuando sea seguro.
- [ ] Revisar caché de ObjectURL, liberación de URLs, miniaturas y lightbox; evitar relecturas y recreación de blobs en cada apertura.
- [ ] Revisar colas de compresión/cargas concurrentes, cancelación al cerrar modal, reintentos y duplicación de la misma operación.
- [ ] Trazar vídeos/YouTube: carga, verificación, aprobación, miniaturas, reproducción embebida y consultas de estado; no descargar el vídeo completo si basta con metadatos/URL.
- [ ] Medir si los tiempos se consumen en cliente, transferencia, Apps Script, Drive o proyección CATALOG; no atribuir mejoras sin mediciones.

### P2 — optimización general y cierre
- [ ] Revisar inicialización de módulos, listeners duplicados, polling, observers, timers, consultas de navegación y renderizados que disparen requests.
- [ ] Revisar cachés y almacenamiento local (IndexedDB/localStorage/Cache API) por duplicación de datos, invalidación excesiva o bloqueo de render.
- [ ] Ejecutar pruebas de regresión de contratos y rendimiento; comparar línea base antes/después con el mismo escenario.
- [ ] Actualizar la matriz de llamadas y documentar qué llamadas se eliminaron, cuáles se conservaron y la razón técnica.
- [ ] Completar Beta aislada de concurrencia, Drive/Spreadsheet, uploads, PWA y navegadores. No usar recursos productivos.

## Criterios para retirar una llamada o bloqueo

Una llamada solo se elimina si se demuestra que no aporta autenticación requerida, RBAC, integridad, unicidad, idempotencia, persistencia, recuperación o invalidación necesaria. Cada cambio debe incluir:
- consumidor exacto y flujo de datos antes/después;
- número de viajes de red/servicio antes y después;
- prueba de caso normal, reintento, concurrencia y fallo parcial según el riesgo;
- verificación de que el servicio no depende de un efecto lateral eliminado;
- regresión integral y medición comparable.

## Estado de validación

Esta es una auditoría estática inicial y un plan de trabajo, no una certificación de rendimiento. No se ha medido aún la latencia real ni se han ejecutado pruebas Beta. No se han cambiado servicios Apps Script, endpoints, secretos, Spreadsheet ni Drive productivos. La base protegida no se modifica.
