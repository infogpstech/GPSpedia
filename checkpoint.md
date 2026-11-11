================================================================================
AUG-051 — ITERACIÓN 5 — 2026-11-11
Estado: EN PROGRESO — corrección del simulador incorporada; suite completa y revisión final pendientes.
Rama: GPSpedia2.2.5_work. HEAD confirmado antes de esta actualización: b3cc129949c98c2a597fc42c7418d5f89de51a1f.
Alcance único: política LRU para variantes de miniaturas, máximo de 200 entradas, actualización de lastAccessedAt y evicción de las menos recientes.
Corrección de esta iteración: el harness de IndexedDB ahora contabiliza solicitudes pendientes por transacción y solo dispara oncomplete cuando todas han finalizado. Se añadió una regresión que retiene deliberadamente una solicitud delete y comprueba que la operación LRU no resuelva antes de liberarla.
Validación ejecutada: prueba aislada del harness con delete diferido PASS. No se ejecutó la suite completa ni Node CLI: el entorno de trabajo no tiene checkout local del repositorio y la resolución DNS hacia GitHub no está disponible. No declarar validación integral todavía.
Compatibilidad: sin cambio de DB_VERSION ni de stores.
Pendiente: ejecutar parsing y las 12 pruebas de IndexedDBTransactions.js en un checkout local, revisar el diff completo y cerrar la iteración. No iniciar cuota global, límite RAM, ObjectURL, concurrencia ni AUG-052.
================================================================================
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
