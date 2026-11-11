================================================================================
AUG-053 — ITERACIÓN 2 — 2026-11-11 — OWNER-BOUND Y RECUPERACIÓN DE gpsepedia_pending_operation
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. AUG-053 continúa EN PROGRESO con las áreas restantes.
Rama: GPSpedia2.2.5_work. Commit anterior: c524460523f9e4ee62d1657ecc1a10bcc9634419. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).
Se creó pendingOperationStore.js para almacenar snapshots bajo una clave por ownerId, verificar escrituras, restringir lectura/eliminación al propietario y retirar recursivamente SessionToken, tokens, contraseñas y credenciales. La clave global legada se migra solo si contiene ownerId/userId explícito; los registros sin propietario, corruptos o en conflicto se conservan en cuarentena sin restauración ni reintento.
add_cortes.html asocia ownerId al crear snapshots, comprueba que la sesión vigente corresponde al propietario antes de recuperar/consultar/reintentar y utiliza el token actual en memoria. Se eliminaron trazas que imprimían snapshots/respuestas completas y errores sin sanitizar. La sanitización excluye cualquier campo cuyo nombre contenga «token», además de contraseñas, credenciales y autorizaciones; el fallo de validación VIN registra solo el tipo de error.
Validación local: PendingOperationIsolation.js 7/7 PASS en Node v22; pendingOperationStore.js pasa node --check. Se añadió una salida segura si falla la lectura del snapshot antes de obtener el opId: se detiene el envío y se restaura la interfaz para evitar continuar con un identificador incierto. También se vuelve a comprobar el propietario después de la consulta VIN y después de la respuesta de addOrUpdateCut, evitando continuar la interfaz o limpiar el snapshot si la sesión cambió durante una espera de red. Pendiente validar sintaxis del módulo inline de add_cortes.html y ejecutar regresiones de integración con navegador real; esta última queda para Beta.
Archivos: add_cortes.html, pendingOperationStore.js, Services/Test/PendingOperationIsolation.js, Services/Test/README.md, ChangesLogs.txt, Tareas_pendientes_parte1.txt y checkpoint.md.
Fuera de alcance: adminImageUploadPending y gpsepedia_edit_backup. La política de acceso de reemplazos ADMIN sigue pendiente de decisión explícita. No iniciar AUG-054.
Siguiente iteración: abordar únicamente el siguiente bloque de AUG-053 que no dependa de la política ADMIN, sin mezclar tareas.
================================================================================

================================================================================
AUG-053 — ITERACIÓN 1 — 2026-11-11 — AISLAMIENTO DE addCutPending POR CUENTA
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. AUG-053 continúa EN PROGRESO con las demás áreas pendientes.
Rama: GPSpedia2.2.5_work. Commit de implementación: c738a810c537c69f8835519604dbcf2016951b58. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).
Las claves IndexedDB se particionan por ownerId/vehicleId; las claves legadas se migran al propietario registrado y los registros sin owner o en conflicto se conservan en cuarentena, sin recuperación automática. Lectura, escritura y eliminación validan ownerId. Antes de addOrUpdateCut se comprueba de nuevo la cuenta propietaria y se usa el SessionToken vigente en memoria; no se persisten SessionToken ni credenciales.
Validación local: parsing V8 de offline.js, ui.js y Services/Test/IndexedDBTransactions.js PASS. Cinco escenarios addCutPending ejecutados contra las funciones reales con IndexedDB simulado: 5/5 PASS (dos cuentas/vehículo, conflicto intra-cuenta, migración legado, legado de otra cuenta y eliminación por owner); se verificó además que no se guarden sessionToken/SessionToken. La suite completa Node CLI no se ejecutó literalmente; IndexedDB real, cambio de cuenta entre pestañas y navegador real quedan reservados a Beta.
Fuera de alcance: gpsepedia_pending_operation, adminImageUploadPending y gpsepedia_edit_backup. La política de acceso a reemplazos ADMIN requiere definición explícita (privados por iniciador o compartidos entre Desarrolladores); no se presume ninguna.
Siguiente iteración: abordar únicamente owner-bound y recuperación de gpsepedia_pending_operation. No iniciar AUG-054 ni otras tareas.
================================================================================

================================================================================
AUG-053 — ITERACIÓN 1 — 2026-11-11 — AISLAMIENTO DE addCutPending POR CUENTA
Estado: EN PROGRESO. Implementación y cinco regresiones añadidas; validación local y revisión final pendientes.
Rama: GPSpedia2.2.5_work. HEAD de partida: 51cb25ca6a7dde1715960b9616b34110325e09ad. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).
Alcance: operaciones pendientes del modal «Agregar Corte». Las claves IndexedDB se particionan por ownerId/vehicleId; las claves legadas se migran al propietario registrado y los registros sin owner o en conflicto se conservan en cuarentena, sin recuperación automática. Lectura, escritura y eliminación validan ownerId. Antes de addOrUpdateCut se vuelve a comprobar la cuenta propietaria y se utiliza el SessionToken vigente en memoria; el token no se persiste.
Pruebas añadidas en Services/Test/IndexedDBTransactions.js: coexistencia de dos cuentas para un vehículo, conflicto dentro de la misma cuenta, migración de registro legado, aislamiento de legado ajeno y eliminación restringida al propietario. Validación pendiente de ejecutar antes del cierre.
Fuera de alcance: gpsepedia_pending_operation, adminImageUploadPending y gpsepedia_edit_backup. La política de acceso a reemplazos ADMIN requiere definición explícita (privados por iniciador o compartidos entre Desarrolladores); no se presume ninguna.
Siguiente iteración: abordar únicamente owner-bound y recuperación de gpsepedia_pending_operation. No iniciar AUG-054 ni otras tareas.
================================================================================

================================================================================
AUG-052 — ITERACIÓN 6 — 2026-11-11 — ESCENARIOS LOCALES DE INICIO Y PWA
Estado: CRITERIO 5 COMPLETADO CON VALIDACIÓN DIFERIDA; AUG-052 queda pendiente únicamente de validaciones Beta reales.
Rama: GPSpedia2.2.5_work. HEAD de partida: 4572195365ffb02c3fedaf0548489f5ecb9d00af. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).
Se agregó Services/Test/PWAStartupScenarios.js con diez escenarios: primera instalación y grafo de módulos; actualización v14→v15; preservación del caché anterior ante fallo esencial; limpieza de cachés anteriores sin borrar los de otras aplicaciones; navegación offline desde deep link con fallback a index.html; guardia de deep link sin sesión y catálogo idle; error terminal sin catálogo; uso de snapshot stale; API lenta/caída con máximo de tres intentos; y snapshots sintéticos de 0, 250, 2,500 y 10,000 Cortes con rechazo de IDs duplicados.
Validación: runtime V8 adaptado 10/10 escenarios PASS. Se usaron fuentes vigentes de service-worker.js, main.js, state.js y catalogRequest.js y dobles de Cache Storage/fetch/AbortController; la validación de snapshots se contrastó con el contrato de offline.js. No se ejecutó Node CLI literal por no disponer de checkout local. No se ejecutaron navegador/dispositivo real, Cache Storage real, red, Apps Script ni Spreadsheet; quedan reservados a Beta y no bloquean el cierre local.
Archivos: Services/Test/PWAStartupScenarios.js (nuevo), Services/Test/README.md, ChangesLogs.txt, Tareas_pendientes_parte1.txt y checkpoint.md. Sin cambios funcionales, endpoints, contratos, despliegues ni datos productivos.
Siguiente: no iniciar AUG-053. AUG-052 queda COMPLETADA CON VALIDACIÓN DIFERIDA; las pruebas de integración real se ejecutarán en Beta.
================================================================================

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
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD de partida: e60fbbb3cc080ebd9de61cce94ef8d49851685b8. Rama base verificada: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Se incorpora un aviso persistente para estados loading/stale/error. Cuando falla la actualización con caché, la interfaz informa que se muestran datos guardados posiblemente desactualizados. Cuando no hay catálogo, presenta un error recuperable y permite reintentar la carga desde la sesión vigente. Los deep links permanecen pendientes después de error/timeout y se aplican cuando una carga posterior alcanza ready/stale.
Archivos funcionales: catalogStatus.js, style.css, auth.js y main.js. Pruebas: Services/Test/CatalogStatus.js. Documentación: Services/Test/README.md, Tareas_pendientes_parte1.txt, ChangesLogs.txt y checkpoint.md.
Validaciones Beta pendientes: DOM/navegador real, interacción visual del reintento, recuperación offline y red real. No se modifican endpoints, backend ni Service Worker.
Siguiente iteración: continuar AUG-052 con el criterio 3 (precache del grafo de módulos, event.waitUntil y manejo de cuota). No iniciar AUG-053 ni otras tareas.
================================================================================


ADENDA DE VALIDACIÓN — AUG-052 ITERACIÓN 3 — 2026-11-11
- Suite Services/Test/CatalogStatus.js ejecutada en runtime V8 adaptado: 4/4 PASS (loading, stale, error recuperable y ocultación en ready/idle).
- Parsing V8 de main.js, auth.js y Services/Test/CatalogStatus.js: PASS.
- La ejecución literal mediante Node CLI no se realizó en esta sesión. No se ejecutaron navegador real, red real ni recuperación offline; quedan diferidos a Beta.
- La comparación del commit bf5e9370f5f2e34bb32f684e83a1945beb11c274 confirma nueve archivos, todos dentro del alcance de la iteración 3. La rama base GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Siguiente: AUG-052, criterio 3 (precache, event.waitUntil y manejo de cuota), en una iteración independiente.
================================================================================


================================================================================
AUG-052 — ITERACIÓN 4 — 2026-11-11 — PRECACHE, EVENT.WAITUNTIL Y CUOTA
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD de partida: 02f083b8dab0fb4838727a70dedf22346319c2b8. Rama base verificada: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
service-worker.js incrementa el cache a v15. CORE_ASSETS incluye las tres entradas HTML y el grafo estático transitivo de módulos de main.js, add_cortes.html y users.html, incluido VinDifferentialEngine.js. La precarga esencial usa addAll atómico; si falla por cuota/recurso esencial, la instalación falla para preservar el SW anterior. Los iconos son opcionales y se omiten al agotar cuota. Las escrituras runtime cache.put están asociadas a event.waitUntil y sus errores no invalidan respuestas de red. La activación solo elimina caches anteriores gpsepedia-cache-* y no toca caches de otras aplicaciones.
Suite Services/Test/ServiceWorkerCache.js: 6/6 PASS en runtime V8 adaptado (grafo, cuota opcional, cuota esencial, waitUntil/cache.put, navegación offline y POST). Node CLI literal no ejecutado. Instalación/actualización y arranque offline en navegador real quedan para Beta. No se modifican endpoints ni backend.
Siguiente iteración: AUG-052, criterio 4 (evaluar caché/paginación o getNavigationData). No iniciar AUG-053 ni otra tarea.
================================================================================


================================================================================
AUG-052 — ITERACIÓN 5 — 2026-11-11 — EVALUACIÓN DE ESTRATEGIA DE LECTURA
Estado: CRITERIO 4 COMPLETADO; AUG-052 continúa EN PROGRESO por criterio 5 y validaciones Beta.
Rama: GPSpedia2.2.5_work. HEAD de partida: c736fd6fa0232e6b7b664ff1276f530446d5d117. Rama base verificada: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Se creó Catalog_Read_Strategy.md y se enlazó desde README.md. Hallazgos: getCatalogData es el contrato canónico de snapshot completo y se usa a través de fetchCatalogData; IndexedDB permite rehidratación local, pero el flujo siempre solicita reconciliación remota. CacheService conserva una lectura de catalog_data_v2, pero la escritura del snapshot está deshabilitada por superar 100 KB por entrada. getNavigationData devuelve resumen pequeño, pero hoy recorre getDataRange() en Cortes y LogosMarca, y no tiene consumidor frontend encontrado. getDropdownData es consumido por add_cortes.html y también recorre getDataRange() de Cortes. No existe paginación; introducirla rompería el contrato de snapshot completo/offline si no se coordina con cursor estable, versión de snapshot, eliminaciones y ensamblado atómico de páginas.
Decisión: conservar getCatalogData para el catálogo principal; reservar getNavigationData para una futura carga inicial ligera solo después de reducir rangos leídos y definir consumidor; mantener getDropdownData para formularios; no adoptar paginación en esta tarea. No se modificaron código backend, endpoints, contratos ni despliegues. No se hicieron mediciones productivas de Spreadsheet.
Siguiente: AUG-052, criterio 5 (pruebas de primera instalación, actualización de Service Worker, arranque offline, deep links sin sesión/sin catálogo, API lenta/caída y catálogos representativos). Las pruebas que requieren navegador real/Apps Script/Spreadsheet productivo se registrarán para Beta; ejecutar localmente las simulaciones reproducibles disponibles.
================================================================================
