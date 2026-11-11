================================================================================
AUG-051 — ITERACIÓN 7 — 2026-11-11
Estado: BLOQUEADA POR DEPENDENCIA TÉCNICA; sin cambios funcionales.
Rama: GPSpedia2.2.5_work. HEAD de análisis: 51fae20e1e90d224ee4d833978a7802a9434e07b. Rama base verificada: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Hallazgo: ui.js mantiene memoryUrlCache como Map ilimitado de claves a URLs blob. Limitar únicamente el número de entradas del Map no libera la memoria binaria: los Blob asociados a URL.createObjectURL permanecen registrados hasta revocar sus URLs. Por tanto, un límite de entradas sin un ciclo seguro de revocación no satisface el objetivo de limitar la memoria RAM.
Dependencia: el ciclo de vida/revocación de ObjectURL, inicialmente planificado para una iteración posterior, es requisito técnico previo para implementar y probar un límite RAM real. No se modificó código ni se simuló una liberación de memoria inexistente.
Siguiente iteración propuesta: abordar exclusivamente el ciclo de vida seguro de ObjectURL como prerrequisito; después retomar el límite RAM. No iniciar concurrencia de compresión ni AUG-052.
================================================================================

================================================================================
AUG-051 — ITERACIÓN 6 — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD de partida: c6de15be2196332cf1e5a959de6fa040395b6cbf.
Resultado: al recibir QuotaExceededError al persistir miniaturas, se elimina progresivamente el 25 % más antiguo del almacén thumbnails según LRU y se reintenta la escritura. Si solo quedan registros heredados, se liberan sus claves por lotes. Si se agotan las miniaturas y la cuota sigue agotada, no se guarda el caché; los demás almacenes permanecen intactos.
Validación local: parsing V8 de offline.js y Services/Test/IndexedDBTransactions.js aprobado. Suite completa ejecutada desde el código recuperado del repositorio en V8 adaptado (cargador de módulos, assert y globals Node ausentes): 15/15 PASS. Node CLI literal no ejecutado por ausencia de checkout local y fallo de resolución DNS. IndexedDB real y multi-pestaña quedan reservados a Beta.
Archivos: offline.js, Services/Test/IndexedDBTransactions.js, Services/Test/README.md, Tareas.txt, ChangesLogs.txt y checkpoint.md.
Siguiente iteración AUG-051: abordar únicamente el límite de memoria RAM de miniaturas. No iniciar revocación de ObjectURL, concurrencia de compresión ni AUG-052.
================================================================================

# Checkpoint activo — GPSpedia

================================================================================
AUG-051 — ITERACIÓN 1 — 2026-11-11
Estado: EN PROGRESO.
Rama: GPSpedia2.2.5_work. Base funcional de la tarea: 2746d5d7bf7799c6f0a9c248befbac9de032be3c (AUG-050).
Problema resuelto en esta iteración: la capa genérica performOp podía resolver al completarse request.onsuccess, antes de que IndexedDB confirmara transaction.oncomplete. Ahora espera el commit y rechaza ante onerror/onabort; initDB cierra conexiones en onversionchange y falla explícitamente ante onblocked/timeout. Se añadió una suite sintética para commit, abort, cuota, versionchange y bloqueo de upgrade.
Archivos funcionales: offline.js. Pruebas: Services/Test/IndexedDBTransactions.js.
Validación: pendiente de ejecutar Node CLI y navegador real. No se declara validación funcional hasta ejecutar la suite. Sin cambios de versión de DB, stores, datos locales, endpoints ni servicios productivos.
Pendiente AUG-051: aislamiento/retención por cuenta de searchHistory y viewedItems; clasificación explícita de validationCache; cuotas/LRU/TTL de thumbnails; claves por tamaño, imgApertura y campos de imagen; límite RAM, ciclo de ObjectURL, concurrencia de compresión y cierre de ImageBitmap; pruebas multi-cuenta/offline/imagen y upgrade multi-pestaña.
Siguiente iteración: continuar AUG-051 desde el aislamiento de historial/vistos y la política de validationCache, sin iniciar AUG-052.
================================================================================


Normativa única: [NORMAS_DESAROLLO.md](NORMAS_DESAROLLO.md). El historial previo permanece en `Olds/Documentacion_Legacy/`.

================================================================================
AUG-050 — CIERRE — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. Padre de este commit: 080600cbb81ac4f638433a53ed7a5377679d7e61. Rama base protegida: GPSpedia2.2.5.
Resultado:
- Firmas persistidas/restauradas solo con versión y fingerprint compatibles; navegación y detalle integrados con ensureVinSignatures.
- Resolución por classKey e identidad completa; contexto contradictorio rechazado y ambigüedad conservada.
- Todas las alternativas ambiguas se mapean por classKey a filas/versiones; UI las presenta como opciones, muestra aviso y no autoabre la primera.
- La versión identificada se conserva en el resultado y tarjeta; el detalle renderiza la firma diferencial de cada versión aplicable.
- extractSharedChars devuelve únicamente pares posición/valor idénticos en todas las firmas.
- Umbral de muestras, competidores por rango, semántica de rangos y VIN completo/prefijos ya implementados.
- Búsqueda combinatoria perezosa, con máximo predeterminado 20,000 evaluaciones por clase; registra evaluaciones/comparaciones y deja la firma pendiente de revisión si agota el presupuesto.
Pruebas locales: suites VIN de persistencia, contexto, umbral, rangos, normalización y cierre AUG-050.
Validación Beta pendiente: medición de tiempo/coste sobre catálogo operativo, navegador real y navegación visual multi-versión/generación. No se accedió a catálogo, Apps Script, Spreadsheet ni endpoints productivos.
Archivos funcionales: VinDifferentialEngine.js, navigation.js, ui.js. Suite: Services/Test/VinAUG050Completion.js.
Documentación: Services/Test/README.md, ChangesLogs.txt, Tareas_pendientes_parte1.txt y Tareas.txt.
AUG-051 no iniciada.
================================================================================
