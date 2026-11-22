# P1 — validación de compresión y calidad visual: evaluación de corpus
Fecha: 2026-11-21
Rama: `GPSpedia2.2.5_work`
HEAD de origen: `57c79c007247e2755d3ed77d134cd6eb4516b646`

## Resultado

Se completó la inspección estática de la estrategia de miniaturas y del corpus versionado. **No existe un corpus de imágenes técnicas representativo para validar pérdida de detalle en diagramas, cableado, etiquetas pequeñas o transparencias.** Por ello, no se cambian dimensiones, codificación, concurrencia ni límites.

## Evidencia del repositorio

Los únicos recursos rasterizados activos en `Images/` son logos, iconos PWA, una imagen de verificación y capturas de interfaz ubicadas en `Images/tests/`. Las capturas de interfaz no representan diagramas técnicos ni sirven para concluir legibilidad de texto/cableado a 300/800/1600 px. No se encontró en el árbol activo una colección de fotos/diagramas técnicos con fuente y dimensiones conocidas. Los duplicados bajo `Olds/` son copias históricas de logos/iconos, no muestras independientes.

Tamaños almacenados en Git (bytes):
- `Images/Logo_TemaOscuro.png`: 1,346,111
- `Images/tests/Modal_despues.png`: 2,017,189
- `Images/tests/modal_antes.png`: 797,783
- `Images/tests/modal_inbox_bandeja.png`: 78,837
- `Images/tests/modal_inbox_reportes.png`: 188,661
- `Images/tests/modal_users_antes.jpeg`: 99,095
- Iconos PWA/versionados: 18,007–115,908
- `Images/tracklink_logo.png`: 2,883
- `Images/verification.png`: 36,437

Los tamaños anteriores son tamaños de archivo, no dimensiones en píxeles ni mediciones de calidad. No se infiere de ellos calidad, canal alfa ni idoneidad como corpus.

## Comportamiento de compresión observado

En `JS/Frontend/offline.js`, tanto `compressAndStoreThumbnailFromImage` como `compressAndStoreThumbnailOnce_`:
1. Decodifican la imagen a `ImageBitmap`.
2. Calculan `scale = Math.min(1, width / bitmap.width)`, por lo que no amplían imágenes menores que la variante solicitada.
3. Mantienen proporción mediante el mismo factor para ancho y alto.
4. Dibujan en Canvas y guardan con `canvas.toBlob(..., "image/png")`.
5. Cierran el `ImageBitmap` en `finally`.

Las variantes 300/800/1600 son límites de ancho solicitados; no garantizan detalle legible si el original contiene texto o líneas pequeñas. PNG evita introducir compresión JPEG con pérdida y conserva alfa al codificar, pero el redimensionado sí elimina detalle espacial. No se aporta parámetro de calidad a `toBlob` (no aplica al formato PNG de la misma manera que a JPEG/WebP). La ruta visible usa la imagen ya descargada; la ruta de precarga descarga con `fetch` CORS.

No se encontró una prueba visual/pixel-diff ni una suite que procese un corpus real y mida legibilidad, alfa, orientación EXIF, bytes originales/finales o tiempo de CPU. `ImageResolutionVariants.js` verifica contratos de fuente, tamaños, PNG, no ampliación y orden de primera visualización mediante inspección de código; no renderiza imágenes reales ni demuestra calidad visual.

## Riesgos / decisiones

| ID | Observación | Decisión |
|---|---|---|
| P1-CAL-01 | No existe corpus técnico de diagramas/cableado. | Solicitar/obtener corpus aislado con permiso, fuente, dimensiones y ejemplos de texto fino; no usar capturas de UI como sustituto. |
| P1-CAL-02 | Variantes por ancho pueden hacer ilegible el detalle fino en miniaturas pequeñas. | Mantener Lightbox grande y probar muestras antes de cambiar variantes o generar una estrategia especial para diagramas. |
| P1-CAL-03 | PNG mantiene alfa y evita artefactos JPEG, pero el reescalado sigue siendo destructivo. | Conservar PNG; no migrar formato ni reducir calidad sin evidencia visual y comparativa de bytes. |
| P1-CAL-04 | No se han medido orientación, metadatos, bytes, CPU ni memoria en navegador. | Añadir matriz de medición en Beta con imágenes originales y resultados reproducibles. |

## Matriz mínima requerida para corpus Beta

Para cada muestra: ID no sensible, procedencia/autorización, MIME declarado, firma detectada, ancho/alto original, orientación, presencia de alfa, tamaño original, texto/lineas de referencia, resultado a 300/800/1600, dimensiones finales, MIME/firma de Blob, bytes finales, legibilidad visual y tiempo de procesamiento. Incluir al menos:
- Diagrama de conexión con etiquetas pequeñas y líneas delgadas.
- Imagen fotográfica con detalle fino.
- PNG transparente con bordes semitransparentes.
- Imagen pequeña que no debe ampliarse.
- Imagen con orientación EXIF no trivial.
- JPEG/PNG/WebP válidos y casos con MIME discordante para comprobar validación en sus respectivos flujos.

Las muestras deben estar anonimizadas y alojadas en un entorno de prueba; no copiar datos de clientes a Git ni a producción.

## Validación realizada

- Inspección estática de funciones y suite `ImageResolutionVariants.js`.
- Inspección del árbol completo de imágenes activas e históricas y tamaños Git.
- No se ejecutó Node/CI desde esta sesión.
- No se ejecutó navegador real, no se inspeccionó visualmente el contenido binario de las imágenes y no se probaron Drive/YouTube/Apps Script.
- No se modificó código ni se cambió ningún parámetro.

## Siguiente tarea

**P1 — medición de competencia visible/precarga y preparación de harness de rendimiento.** Revisar el disparo y las rutas de `cacheItemImages`, definir instrumentación aislada para tiempos/bytes/cola y comparar la precarga de los últimos 15 vehículos con una imagen que se vuelve visible. No alterar concurrencia 2 ni añadir cancelación hasta tener una prueba reproducible y definir la semántica de cancelación.



## 6. Harness local para corpus técnico — 2026-11-22

Se creó JS/Tests/ThumbnailQualityBenchmark.html para comparar las variantes 300/800/1600 px con archivos elegidos localmente. La herramienta usa la regla de escalado no ampliador y codificación PNG de la implementación, importa la cola real thumbnailCompressionQueue.js, encola tareas de precarga con prioridad 0 y promueve a prioridad 10 una variante 800 pendiente.

Por muestra presenta dimensiones decodificadas, tamaño original, MIME declarado, firma binaria, SHA-256, orientación EXIF JPEG, alfa muestreado y previews. Por variante registra dimensiones, bytes, MIME/firma, SHA-256, alfa muestreado, espera de cola, tiempo de proceso, codificación y buffer Canvas estimado. No hace fetch/XHR, no usa IndexedDB/localStorage y no sube ni persiste los archivos. Para abrirlo desde la raíz del repositorio: python -m http.server 8000 y navegar a /JS/Tests/ThumbnailQualityBenchmark.html.

**Validación:** ThumbnailQualityBenchmarkContract 30/30 PASS; ThumbnailPriorityIntegration 15/15 PASS. CI HEAD 03b58abb6aa3d83b5a09b5fd4bb00bb19cf5aa7a: 301 suites / 3,498 pruebas / 0 fallos; sintaxis 432 archivos JS/MJS; referencias 343 archivos; health 7/7; Pages build/deployment SUCCESS.

**Límites:** el alfa se inspecciona mediante una muestra 128×128; la memoria es una estimación del buffer Canvas. El harness no mide CORS, red, IndexedDB, GPU ni primera pintura de la aplicación real. No hay corpus técnico representativo en el repositorio. Siguiente: ejecutar con muestras sintéticas/autorizadas en Beta aislada y revisar visualmente diagramas, cableado, texto fino, transparencia y orientación antes de modificar compresión.
