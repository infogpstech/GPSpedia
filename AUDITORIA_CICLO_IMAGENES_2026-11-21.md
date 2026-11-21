# Auditoría del ciclo de miniaturas — 2026-11-21

## Hallazgos confirmados
1. getThumbnail ejecutaba purgeExpiredThumbnailEntries antes de cada lectura. Esa rutina hacía getAll() del almacén y, por cada entrada expirada, abría una transacción individual de borrado.
2. compressAndStoreThumbnail repetía la misma purga global antes de comprobar la variante solicitada.
3. saveCatalog y saveCatalogWithCursor precargan las imágenes de los últimos 15 vehículos; cacheItemImages puede encolar varias imágenes por vehículo.
4. thumbnailCompressionQueue limita concurrencia a dos tareas FIFO, pero no deduplicaba llamadas concurrentes para una misma clave.
5. En un cache miss, setOptimizedImage asigna inmediatamente la URL remota al elemento visible y luego llama a compressAndStoreThumbnail, que realiza otro fetch de esa URL. La inspección confirma dos solicitudes potenciales del mismo recurso en frío. No se ha atribuido un ahorro cuantitativo sin medición de navegador/red.

## Corrección local
- Se eliminó la purga global de los caminos de lectura/compresión por imagen.
- readFreshThumbnail sigue comprobando TTL y elimina la clave solicitada si expiró.
- La evicción LRU elimina registros expirados dentro de su misma transacción y conserva el límite de 200 variantes.
- Se añadió single-flight por fileId/ancho para compartir compresión y fetch entre consumidores concurrentes.
- Se conservan TTL de 30 días, generación PNG, transparencia, dimensiones, cola con concurrencia 2, ObjectURL y recuperación de cuota.

## Validación
- ThumbnailCacheDeduplication.mjs: 3/3 PASS en harness exact-source.
- CI 9ebeecd99869cab11bd8d9501cfd0dc4b31ab89c: SUCCESS, 271 suites / 3,189 pruebas / 0 fallos; health read-only SUCCESS. ImageResolutionVariants 10/10 y ObjectURL lifecycle 10/10.
- No se ejecutaron mediciones de red en navegador ni pruebas offline de campo.

## Pendientes
- Resolver la descarga repetida del recurso visible sin retrasar su primer render y sin perder compatibilidad CORS/PNG.
- Medir el prefetch de 15 vehículos y su competencia con imágenes visibles; definir prioridad y cancelación de trabajos obsoletos.

 
## Adenda 2026-11-21 — cache miss sin segundo fetch visible
- setOptimizedImage solicita CORS antes de src y usa compressAndStoreThumbnailFromImage/createImageBitmap(imageElement) para persistir la variante desde los bytes ya cargados.
- Si CORS falla, reintenta una vez sin CORS; conserva la imagen visible y no fuerza almacenamiento inseguro.
- updateCardInPlace/insertNewVehicleFluently ya no hacen preload en un objeto Image separado.
- CI b8d425748e483fcd6535fdc83c7c982d603b6161: SUCCESS, 273 suites / 3,191 pruebas / 0 fallos.
- Pendiente navegador: CORS, PNG alfa, cache hit/miss y medición de bytes/primera pintura.
