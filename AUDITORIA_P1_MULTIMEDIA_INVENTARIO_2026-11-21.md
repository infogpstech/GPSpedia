# Auditoría P1 — inventario técnico de imágenes, vídeos y archivos
Fecha: 2026-11-21
Repositorio: `infogpstech/GPSpedia`
Rama inspeccionada: `GPSpedia2.2.5_work`
HEAD inspeccionado: `4b20498b1175ed3729eb6e8442730f8b13e4c008`

## Alcance y método

Se inspeccionó el árbol completo de la rama (591 archivos), el flujo frontend de imágenes en `JS/Frontend/ui.js` y `JS/Frontend/offline.js`, la cola y el registro ObjectURL, los servicios ADMIN/FEEDBACK y el cliente resumable de YouTube. Se contrastaron los contratos con las suites existentes. Esta actividad fue una auditoría estática: no se modificó código y no se ejecutaron pruebas automatizadas ni validaciones de navegador/servicios externos.

## 1. Flujo de imágenes en frontend

### Presentación y variantes
- `ui.js:setOptimizedImage` es el punto común de presentación; se identificaron 26 llamadas consumidoras en ese archivo, además de la definición.
- Variantes locales: 300, 800 y 1600 px. `getImageUrl` conserva la URL original de Drive y no solicita transformaciones CDN, porque se documenta riesgo de pérdida del alfa PNG.
- La URL remota se asigna inmediatamente; la lectura de IndexedDB se ejecuta en paralelo con un límite de espera de 800 ms. Si hay Blob compatible, se adjunta mediante `thumbnailObjectUrls`.
- Se solicita CORS antes de cargar. Si falla, se reintenta como imagen normal y se conserva la visualización, omitiendo la persistencia cuando los bytes no son CORS-clean.
- La miniatura se genera desde la imagen ya descargada mediante `createImageBitmap(imageElement)`, no mediante un segundo fetch del consumidor visible. La salida se codifica como PNG, sin ampliar imágenes pequeñas.

### Persistencia, cola y memoria
- IndexedDB usa clave `fileId::w{width}`, valida identidad/resolución y TTL de 30 días; máximo 200 variantes con evicción LRU. Los errores de miniaturas se tratan como fallo de caché opcional.
- La cola `thumbnailCompressionQueue.js` es FIFO y limita a dos compresiones simultáneas. El contrato existente contempla orden, límite y recuperación tras error.
- `imageObjectUrlCache.js` comparte ObjectURL entre consumidores y las revoca al quedar sin consumidores o al salir del DOM; el presupuesto contabiliza 64 MiB de Blob retenido, no memoria decodificada/GPU.
- Single-flight por clave y backoff de cinco minutos evitan trabajo duplicado simultáneo y repetición inmediata tras fallo. La purga global por imagen y el segundo fetch del consumidor visible ya están corregidos; no reabrirlos.

### Precarga: riesgo a medir
- `cacheItemImages` recorre hasta 11 campos de imagen por vehículo y lanza compresiones sin esperar cada una.
- Se invoca al guardar snapshot/deltas para los últimos 15 vehículos y al registrar vehículos vistos recientemente.
- La cola limita compresiones activas y actualmente sí define prioridad: la precarga entra con prioridad 0 y la compresión desde el elemento visible ya cargado entra con prioridad 10. La solicitud visible puede promover una precarga pendiente de la misma variante; las tareas activas no se interrumpen. La ruta visible reutiliza `imgElement` mediante `createImageBitmap(imageElement)` y no hace un segundo fetch; la precarga conserva su fetch CORS propio. No existe cancelación por cambio de vista/sesión, por lo que una tarea ya iniciada puede continuar en segundo plano. Esta prioridad se verificará con un contrato de integración estático; no hay mediciones reales de CPU, red o primera pintura.
- No hay medición de red, CPU, primera pintura o memoria en navegador para cuantificar el impacto. No cambiar concurrencia ni introducir cancelación hasta medir y definir un contrato que preserve la caché offline.

## 2. Cargas y validación de imágenes

- La lectura de imágenes ADMIN en frontend rechaza archivos vacíos y limita el tamaño declarado a 10 MiB antes de convertirlos a Data URL.
- Reportes FEEDBACK: máximo 3 MiB; JPEG/PNG/WebP, Base64 canónico, MIME coincidente con firma binaria y SHA-256 registrado en metadatos/evento.
- PyS: máximo 3 MiB; JPEG/PNG/WebP, Base64 canónico y validación de firma binaria.
- Logos: frontend acepta PNG/SVG/WebP. Backend valida Base64 canónico, firma PNG/WebP o estructura inicial SVG y extensión concordante. En la ruta inspeccionada no aparece un límite explícito de bytes para logos. La lectura usa Data URL y mantiene Base64 en memoria.
- No se dispone en el repositorio de un corpus representativo de tamaños históricos de logos ni de una lectura real de Drive/Spreadsheet. No fijar un límite nuevo ni alterar formatos sin ese corpus y la validación Beta correspondiente.

## 3. Vídeos y YouTube

- `youtubeUpload.js` transfiere directamente navegador→YouTube mediante XHR resumable; los bloques son de 8 MiB y se envían con `Content-Range`. No se encontró una ruta de proxy de binario por Apps Script en el cliente inspeccionado.
- Respuestas 308 actualizan el offset confirmado; el cliente consulta el estado remoto para recuperar respuestas perdidas, reintenta errores recuperables y renueva sesiones expiradas (404/410).
- El cliente persiste el archivo y el checkpoint en IndexedDB separada (`gpsepedia-youtube-upload/operations`); el opId se mantiene en sessionStorage con TTL de 24 horas. La operación se marca `uploaded` antes de solicitar aprobación para poder reintentar la aprobación sin volver a transferir el archivo.
- La búsqueda de recuperación usa `getAll()` y filtra por usuario, tipo, referencia y estado. El almacén no declara índices secundarios; su coste potencial depende del número de registros locales, que no se ha medido. No cambiarlo sin medir cardinalidad y revisar migración/esquema.
- La apertura del flujo espera la búsqueda de recuperación; si falla, bloquea el envío para evitar duplicados. La indisponibilidad de IndexedDB impide iniciar una carga nueva porque no puede garantizarse el checkpoint recuperable. Es un contrato deliberado de resiliencia que debe mantenerse salvo diseño alternativo que no debilite idempotencia.
- Se inspeccionaron pruebas de cliente para IndexedDB, filtrado por usuario/destino, duplicados, rangos 308, bloques, reanudación, expiración, respuesta final y cancelación. No se ejecutaron en esta auditoría.

## 4. Suites existentes identificadas

- `ThumbnailCacheDeduplication.mjs`
- `ThumbnailCompressionQueueContract.mjs`
- `ImageResolutionVariants.js`
- `ImageObjectUrlLifecycle.js`
- `LogoIdIntegrity.mjs`
- `YouTubeUploadClientNode.mjs` y `YouTubeUploadClient.js`
- Contratos adicionales presentes para carga/ledger de imágenes, logos, YouTube, aprobación, recuperación y cancelación.

La presencia y lectura de las pruebas no equivale a ejecución. No se declara ningún PASS nuevo en esta actividad.

## Hallazgos y decisiones

| ID | Hallazgo estático | Decisión |
|---|---|---|
| P1-MED-01 | Precarga de hasta 11 campos por cada uno de los últimos 15 vehículos. La cola ya prioriza lo visible sobre la precarga, pero no cancela tareas obsoletas. | Verificar el contrato de prioridad y medir competencia visible/precarga, cache hit/miss y trabajo que continúa tras cambiar de vista; no añadir cancelación sin trazas. |
| P1-MED-02 | No se observa límite de tamaño explícito para logos en la ruta frontend/backend inspeccionada. | Inventariar tamaños históricos reales antes de proponer límite; no cambiar ahora. |
| P1-MED-03 | La compresión PNG local puede reducir diagramas técnicos a 300/800/1600 px. No hay corpus visual ni prueba de legibilidad técnica en navegador. | Validar dimensiones, nitidez y alfa con corpus representativo antes de cambiar escala/compresión. |
| P1-MED-04 | La recuperación YouTube recorre el almacén IndexedDB completo. | Medir cantidad y antigüedad de registros locales antes de añadir índices o limpieza; conservar recuperación actual. |
| P1-MED-05 | CORS, primera pintura, bytes reales, memoria decodificada/GPU y competencia de red requieren navegador/dispositivo real. | Reservar mediciones para Beta aislada; no atribuir mejoras sin datos. |

## Siguiente actividad

**P1 — compresión, redimensionado y calidad visual:** definir un corpus técnico representativo; contrastar dimensiones de origen y variantes, alfa PNG, diagramas/cableado, orientación, MIME/firma, metadatos y tamaños resultantes. En paralelo, preparar medición aislada de la cola visible/precarga. No modificar parámetros de compresión ni límites hasta obtener evidencia.

## Estado
Inventario estático completado. Implementación y mediciones pendientes. No se ejecutaron pruebas ni se desplegó Apps Script; no se accedió ni modificó Drive/Spreadsheet productivos.


## 5. Revisión complementaria — prioridad de miniaturas (2026-11-22)

La revisión del HEAD actual corrigió un dato desactualizado del inventario inicial: la cola no es FIFO simple. `thumbnailCompressionQueue.js` ordena prioridad descendente y FIFO dentro de cada nivel; `offline.js` usa prioridad 0 para precarga y 10 para imágenes ya visibles. Si una imagen visible coincide con una precarga pendiente de la misma variante, promueve esa tarea. No interrumpe trabajos activos.

La ruta visible de `ui.js` establece CORS antes de cargar, muestra la imagen original y solo después intenta persistir una miniatura usando el mismo elemento `imgElement`; no dispara un segundo fetch. La precarga sí descarga con fetch CORS independiente. Se añade `ThumbnailPriorityIntegration.mjs` al runner para fijar este contrato de integración.

**Pendiente:** medición real de espera de cola, primera pintura, CPU, bytes, memoria y tareas que continúan tras cambiar de vista/sesión. No modificar concurrencia (2), tamaños (300/800/1600), PNG ni límites de caché sin corpus técnico y mediciones Beta.
