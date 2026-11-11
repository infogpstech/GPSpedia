================================================================================
AUG-051 — ITERACIÓN 10 — 2026-11-11 — CONCURRENCIA DE COMPRESIÓN
Estado: EN PROGRESO — implementación realizada; validación integrada pendiente.
Rama: GPSpedia2.2.5_work. HEAD de partida: 0433fbf32243382c1f2c13dffefc3ec18240f383.
Se añadió thumbnailCompressionQueue.js con cola FIFO y máximo de dos trabajos activos por instancia JavaScript/pestaña. offline.js ejecuta por la cola la descarga, decodificación, generación y persistencia de cada miniatura; reconsulta la caché al obtener turno para evitar trabajo duplicado si otra solicitud ya guardó la misma variante. ImageBitmap se cierra en finally y el turno se libera antes de resolver/rechazar el trabajo.
Pruebas añadidas: Services/Test/IndexedDBTransactions.js incluye cinco solicitudes simultáneas, verifica máximo dos ImageBitmap activos, persistencia de resultados y cierre de los cinco bitmaps.
Validación ejecutada: Node CLI aislado del limitador 3/3 (límite, FIFO y liberación tras rechazo); simulación de cinco trabajos/bitmaps 2/2; parsing V8 de offline.js y suite: PASS. La suite integrada IndexedDBTransactions.js no pudo completarse con el adaptador de este entorno; requiere ejecución literal en checkout local. No se afirma como aprobada.
Archivos funcionales: thumbnailCompressionQueue.js, offline.js. Pruebas: Services/Test/IndexedDBTransactions.js. Documentación: Services/Test/README.md, ChangesLogs.txt, Tareas.txt, Tareas_pendientes_parte1.txt y checkpoint.md.
Siguiente iteración: ejecutar node --experimental-default-type=module Services/Test/IndexedDBTransactions.js en checkout local, revisar la regresión y cerrar AUG-051. No iniciar AUG-052.
================================================================================

================================================================================
CHECKPOINT ACTIVO — GPSpedia — 2026-11-11
AUG-051 — ITERACIÓN 9 — PRESUPUESTO RAM DE MINIATURAS
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD de partida: f4cf944ad37515e8408057f3b3935af67d04e2c3.
Se limita a 64 MiB el total de Blob.size retenido por ObjectURL activos. Las URL compartidas se cuentan una vez; si una nueva miniatura no cabe, attach devuelve null y ui.js mantiene fallback remoto. Al salir el último consumidor, la revocación libera los bytes contabilizados.
El límite no representa RAM total: excluye superficies decodificadas/GPU y recursos remotos. Suite ampliada a 10 escenarios. Siguiente: continuar en otra interacción con la siguiente iteración de AUG-051, dedicada exclusivamente a concurrencia de compresión. No iniciar AUG-052.
================================================================================

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


================================================================================
AUG-051 — ITERACIÓN 8 — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD de partida: cec91725351ce071834e8523d3ef045b9516627d (commit documental posterior al checkpoint de iteración 7; sin cambios funcionales).
Dependencia resuelta: se implementó el ciclo de vida de ObjectURL antes del límite RAM. imageObjectUrlCache.js mantiene referencias por elemento, comparte URL solo entre consumidores activos, revoca al quedar sin consumidores y observa elementos retirados del DOM. ui.js libera la referencia anterior al iniciar una nueva carga, descarta respuestas asíncronas obsoletas y no crea URL para imágenes desconectadas ni durante compresión sin consumidor.
Pruebas: Services/Test/ImageObjectUrlLifecycle.js (7 casos sintéticos). Validación de DOM/MutationObserver real y navegación visual queda diferida a Beta.
Archivos: ui.js, imageObjectUrlCache.js, Services/Test/ImageObjectUrlLifecycle.js, Services/Test/README.md, ChangesLogs.txt, Tareas.txt, Tareas_pendientes_parte1.txt y checkpoint.md.
Siguiente iteración: implementar exclusivamente el límite RAM de miniaturas usando el ciclo de vida ahora disponible. No iniciar concurrencia de compresión ni AUG-052.
================================================================================


================================================================================
ADENDA DE CONTINUIDAD — AUG-051 ITERACIÓN 10 — 2026-11-11
Estado: EN PROGRESO — revisión y validación parcial realizadas; suite integrada aún sin ejecución.
HEAD confirmado al reanudar: 3c0147f9558735ab041fb6f848a3c7be93652ddb. Rama de trabajo: GPSpedia2.2.5_work. Comparación con GPSpedia2.2.5: idéntica al HEAD confirmado; sin cambios concurrentes.
Se revisó NORMAS_DESAROLLO.md, el checkpoint y los archivos de cola, integración y pruebas. La rama permanece en el commit de la iteración 10.
Validación adicional reproducible en el runtime disponible: limitador probado con 5 trabajos/límite 2, 4 trabajos/límite 1 incluyendo rechazo, y 9 trabajos/límite 3. FIFO, máximo simultáneo, liberación de turno y estado final active=0/queued=0: PASS. Parsing de helper, offline.js y suite: PASS.
No se pudo ejecutar literalmente la suite IndexedDBTransactions.js: este entorno no contiene checkout local ni Node CLI asociado al repositorio. Los intentos de adaptar el harness IndexedDB en V8 no se consideran una ejecución válida y no se reportan como PASS. No se modificó el código funcional durante esta reanudación.
Acción para continuar: disponer de un checkout local de GPSpedia2.2.5_work y ejecutar node --experimental-default-type=module Services/Test/IndexedDBTransactions.js; revisar cualquier fallo y cerrar iteración 10. No iniciar AUG-052.
================================================================================


================================================================================
ADENDA DE CONTINUIDAD — AUG-051 ITERACIÓN 10 — 2026-11-11
Estado: EN PROGRESO — suite integrada pendiente por falta de checkout local accesible.
HEAD confirmado: 77877a10b6d5b547e8c0f315465bc0e78c5e23cd. Rama de trabajo: GPSpedia2.2.5_work. HEAD de rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1. La rama base permanece sin modificaciones.
Corrección de precisión respecto a la adenda anterior: Node.js sí está instalado en el entorno (v22.16.0). El impedimento no es la ausencia de Node CLI, sino la falta de un checkout local del repositorio. Se intentó clonar GPSpedia2.2.5_work mediante Git, pero la conexión falló porque el entorno no pudo resolver github.com (Could not resolve host). Por tanto, no se ejecutó la suite original mediante Node.
Se intentó adaptar el harness de Services/Test/IndexedDBTransactions.js al runtime V8 disponible. La adaptación falló en el primer escenario por diferencias del entorno/adaptador en la simulación de IndexedDB; este resultado no es una ejecución válida de la suite y no se atribuye como fallo del código de producción ni como PASS.
No se modificó código funcional. Acción para reanudar: proporcionar un checkout local accesible de GPSpedia2.2.5_work o habilitar conectividad de red para clonarlo; después ejecutar node --experimental-default-type=module Services/Test/IndexedDBTransactions.js, revisar el resultado y cerrar únicamente la iteración 10. No iniciar AUG-052.
================================================================================


================================================================================
AUG-051 — CIERRE LOCAL — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD previo al cierre: a6433903d0cec16fa93d2af2718173b2a5486c26. Rama base: GPSpedia2.2.5; sin modificaciones.
Validación de iteración 10: Services/Test/IndexedDBTransactions.js ejecutada con el código de la rama en runtime V8 y adaptadores mínimos para módulos, aserciones y globals Node: 16/16 PASS. Incluye transacciones/abortos/cuota, aislamiento por cuenta, TTL/LRU, recuperación de cuota, solicitudes delete diferidas y concurrencia de cinco miniaturas con máximo de dos trabajos/bitmaps activos y cierre de los cinco ImageBitmap.
Validaciones adicionales: limitador aislado 3/3; simulación de cinco trabajos/recursos 2/2; parsing V8 de offline.js, thumbnailCompressionQueue.js y la suite aprobado.
Limitación explícita: Node CLI literal no ejecutado. Node 22.16.0 está disponible, pero no hay checkout local y git clone falla por DNS de github.com. La ejecución V8 adaptada sí completó los 16 escenarios; no se atribuye como ejecución Node.
Validaciones Beta pendientes: IndexedDB real, navegador real, operación offline y multi-pestaña. No se modificaron endpoints, deployments ni datos productivos.
AUG-051 cerrada localmente. No iniciar AUG-052 en esta iteración.
================================================================================

================================================================================
AUG-052 — ITERACIÓN 1 — 2026-11-11 — ESPERA TERMINAL DE DEEP LINKS
Estado: EN PROGRESO.
Rama: GPSpedia2.2.5_work. HEAD de partida: 8bc20a6eab1a0de252142ca7f2b35480b5f81f0d.
Se reemplaza el polling recursivo de 100 ms en main.js por waitForCatalogReadiness() en state.js. La espera se resuelve por suscripción ante catálogo ready/stale o error terminal, con timeout de 15 s. Si no hay sesión, el deep link queda pendiente hasta que el usuario inicie sesión; si vence el tiempo, se informa y se conserva una suscripción para aplicar la búsqueda si el catálogo llega después.
auth.js publica catalogLoadStatus/catalogLoadError al iniciar, cargar desde caché, completar red o fallar; si hay caché y falla la actualización, el estado es stale.
Prueba añadida: Services/Test/CatalogReadiness.js (4 escenarios: disponibilidad inmediata, cambio de estado, error y timeout). Validaciones de red, reintentos y PWA no forman parte de esta iteración.
Siguiente iteración: incorporar timeout/cancelación/reintento controlado al fetch de catálogo. No modificar el Service Worker ni iniciar otros criterios de AUG-052 en esta iteración.
================================================================================

================================================================================
AUG-052 — ITERACIÓN 2 — 2026-11-11 — TIMEOUT, CANCELACIÓN Y REINTENTOS
Estado: EN PROGRESO.
Rama: GPSpedia2.2.5_work. HEAD de partida: 4be9f57f3468110e3450a5547b88708901fced71.
Se añade catalogRequest.js con timeout de 8 s por intento, máximo de dos reintentos con backoff 400/800 ms, cancelación mediante AbortSignal y cancelación durante el backoff. Solo se reintentan timeouts, fallos de red TypeError y HTTP 408/429/5xx; errores HTTP permanentes, errores de aplicación y respuestas inválidas no se reintentan.
api-config.js integra el helper en fetchCatalogData y expone status en errores HTTP sin cambiar endpoint ni payload. auth.js cancela una carga previa al iniciar otra sesión y al cerrar sesión; ignora la respuesta de una carga cancelada/obsoleta. main.js amplía a 27 s la espera del deep link para cubrir el tiempo máximo configurado de los tres intentos.
Prueba añadida: Services/Test/CatalogRequestRetry.js (7 escenarios). Validación de red real, navegador, backend y Service Worker queda pendiente de Beta.
Siguiente iteración: resolver explícitamente la experiencia de error recuperable sin caché y la indicación de datos desactualizados cuando se conserva caché. No modificar todavía el Service Worker ni los endpoints.
================================================================================


================================================================================
AUG-052 — ITERACIÓN 3 — 2026-11-11 — ESTADO RECUPERABLE DEL CATÁLOGO
Estado: IMPLEMENTACIÓN Y PRUEBAS SINTÉTICAS PREPARADAS; validación de ejecución pendiente.
Rama: GPSpedia2.2.5_work. HEAD de partida: e60fbbb3cc080ebd9de61cce94ef8d49851685b8. Rama base verificada: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Se incorpora un aviso persistente para estados loading/stale/error. Cuando falla la actualización con caché, la interfaz informa que se muestran datos guardados posiblemente desactualizados. Cuando no hay catálogo, presenta un error recuperable y permite reintentar la carga desde la sesión vigente. Los deep links permanecen pendientes después de error/timeout y se aplican cuando una carga posterior alcanza ready/stale.
Archivos funcionales: catalogStatus.js, style.css, auth.js y main.js. Pruebas: Services/Test/CatalogStatus.js. Documentación: Services/Test/README.md, Tareas_pendientes_parte1.txt, ChangesLogs.txt y checkpoint.md.
Validaciones Beta pendientes: DOM/navegador real, interacción visual del reintento, recuperación offline y red real. No se modifican endpoints, backend ni Service Worker.
Siguiente iteración: continuar AUG-052 con el criterio 3 (precache del grafo de módulos, event.waitUntil y manejo de cuota). No iniciar AUG-053 ni otras tareas.
================================================================================
