# P1 — competencia entre precarga y recursos visibles
Fecha: 2026-11-21
Rama: `GPSpedia2.2.5_work`
HEAD de origen: `304547fd9fee31ce2001d71accb2b20e38b616bf`

## Flujo confirmado

1. `saveCatalog` y `saveCatalogWithCursor` disparan `cacheItemImages` para los últimos 15 vehículos después de guardar el snapshot/delta.
2. `saveViewedItem` también dispara `cacheItemImages` para el vehículo consultado.
3. `cacheItemImages` recorre 11 propiedades de imagen: `imagenVehiculo`, `imgCorte1`, `imgCorte2`, `imgCorte3`, `imgApertura`, `imgCableAlimen`, `imgCableAlimen2`, `imgCableAlimen3`, `imagenRelay`, `imagen` e `Imagen`.
4. El bucle llama a `compressAndStoreThumbnail` para cada campo válido sin esperar las promesas. El trabajo se encola de inmediato y el método retorna antes de que termine la precarga.
5. La cola global `thumbnailCompressionQueue` admite dos tareas activas y procesa el resto FIFO. `compressAndStoreThumbnailFromImage` (ruta de imagen visible) también utiliza esta misma cola.
6. Las dos rutas comparten `thumbnailCompressionInFlight_` por clave. Si una precarga ya inició o encoló la misma variante, la solicitud visible recibe esa misma promesa; no existe mecanismo para elevar la prioridad del trabajo pendiente.

## Consecuencia deducible

Con 15 vehículos y 11 campos válidos y distintos por vehículo, el snapshot puede generar hasta 165 solicitudes de precarga en una sola tanda. No significa 165 descargas simultáneas: la cola limita a dos compresiones activas, pero el resto queda pendiente FIFO. Si una solicitud visible distinta llega detrás de esa tanda, puede esperar a que avancen trabajos anteriores. Si coincide con una variante ya encolada, comparte su promesa y tampoco la adelanta.

Es un máximo teórico de solicitudes por tanda, no una medición de carga real: el número de campos existentes, URLs únicas, aciertos de caché, errores CORS y single-flight puede reducirlo considerablemente. No se midió tiempo de espera, ancho de banda ni CPU en navegador.

## Contratos que deben preservarse

- FIFO y concurrencia 2 para trabajos con la misma prioridad (el contrato actual).
- Deduplicación single-flight por clave, incluso cuando la solicitud visible coincide con una precarga pendiente.
- La precarga es opcional y nunca debe bloquear la primera visualización ni acciones del usuario.
- Los errores de miniaturas no deben bloquear la sincronización del catálogo.
- No cancelar una compresión que ya puede ser compartida por otro consumidor sin un modelo de propiedad/referencias.
- No permitir que las precargas de un snapshot antiguo contaminen una sesión o estado nuevo.
- Mantener la recuperación de IndexedDB y el presupuesto de memoria.

## Diseño recomendado para la siguiente implementación

Introducir prioridad explícita y estable en la cola:
- Prioridad alta: miniatura solicitada por una imagen visible.
- Prioridad baja: precarga de catálogo / vistos recientes.
- FIFO dentro de cada prioridad.
- Cuando llega una solicitud visible para una clave que ya tiene precarga encolada, elevar esa entrada pendiente sin crear una segunda compresión ni romper la promesa compartida.
- Las tareas activas no se interrumpen; la prioridad solo reordena trabajos aún pendientes.
- Exponer estadísticas por prioridad (activos, pendientes y espera) para diagnóstico, sin registrar URLs ni datos del usuario.

Antes de implementar, escribir contratos que prueben: orden FIFO dentro de prioridad, visible supera a precarga pendiente, visible/precarga de misma clave ejecuta una sola compresión, no preempción de activos, recuperación tras rechazo y concurrencia máxima 2. El API debe mantener compatibilidad con llamadas actuales.

## Validación pendiente

No se ejecutó una prueba de rendimiento real. La medición Beta debe usar corpus sintético/anónimo y registrar: número de precargas programadas, pendientes por prioridad, tiempo desde solicitud visible hasta inicio de compresión, cache hit/miss, descargas y bytes, duración de decodificación/canvas/Blob, errores CORS, cambio de sesión/vista y memoria aproximada. Comparar sin precarga, FIFO actual y prioridad propuesta en navegador/dispositivo objetivo.

## Estado y siguiente actividad

**Actividad completada:** trazado estático de llamadas y demostración del máximo teórico de cola.

**Siguiente tarea:** implementar prioridad visible/precarga en cola y single-flight, empezando por pruebas contractuales; mantener la prioridad alta para imágenes visibles y baja para precarga. No cambiar la concurrencia 2 ni cancelar trabajos activos.

No se modificó código y no se ejecutaron pruebas automatizadas ni navegador en esta actividad.
