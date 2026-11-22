# GPSpedia — Tareas activas

Fecha: 2026-11-21
Repositorio: `infogpstech/GPSpedia`
Rama de trabajo: `GPSpedia2.2.5_work`
Rama base protegida: `GPSpedia2.2.5`
Fuente normativa única: `NORMAS_DESAROLLO.md`

## Historial
- Registro anterior: `Tareas_Activas_Archive/Tareas_Activas_2026-11-20_pre-rotacion.md`.
- Registro archivado en esta rotación: `Tareas_Activas_Archive/Tareas_Activas_2026-11-21_pre-rotacion.md`.
- Manifiesto: `Tareas_Activas_Archive/manifest.md`.
- Los archivos archivados son inmutables; este es el registro operativo vigente.

## Estado Git y CI confirmado
- HEAD de código validado para cierre WRITE: `4fad6a812598beb0bb04212cac4a3bc3136c9dd5`.
- CI: 291 suites, 3,397 pruebas aprobadas, 0 fallos.
- Build: SUCCESS.
- Health de servicios: SUCCESS.
- GitHub Pages deploy workflow: pendiente de confirmación; no es despliegue de Apps Script ni sustituye Beta aislada.
- Rama base: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones.

## Implementaciones locales completadas

### CATALOG / ADMIN
- [x] Navegación CATALOG con rangos mínimos.
- [x] `getContributionCandidates` omite hojas de logos, tutoriales, ledgers de tutoriales y Relay; conserva Cortes, FeedbackLikes y AportesVehiculo y la proyección global.
- [x] `getVehicleProjection` lee ID/VIN globales y solo una fila completa.
- [x] `getAdminProjectedVehicleFieldSnapshot_` usa consulta dirigida.
- [x] `getReplacedImages` reutiliza eventos mínimos de CATALOG bajo `GPSpedia_CATALOG_TRAFFIC_SECRET`, evitando la segunda lectura del ledger en ADMIN.
- [x] Detalle interno protegido por secreto; sin secreto o con CATALOG legacy, fallback anterior. El endpoint ordinario no expone eventos internos.
- [x] Se conserva el escaneo global de referencias Drive antes de acciones destructivas.
- [x] Se revisó la proyección de candidatos: casi todas las columnas de Cortes intervienen en campos, likes, orden o conflictos; fragmentar rangos no aporta ahorro material demostrado.

### Ciclo de imágenes
- [x] Cache miss visible reutiliza la imagen ya cargada para miniatura cuando CORS lo permite; fallback no-CORS conserva visualización y omite persistencia insegura.
- [x] Precargas redundantes de actualización/inserción retiradas; FIFO concurrencia 2 y sin prefetch activo de 15 vehículos.
- [x] Alta de cortes: valida 10 MiB, MIME y Data URL antes de Base64.
- [x] Imágenes suplementarias: valida tamaño, MIME y Data URL antes de Base64.
- [x] ADMIN image upload: valida tamaño/MIME en cliente; backend compara MIME Data URL/declarado y limita 10 MiB decodificados.
- [x] Logotipos: PNG/SVG/WEBP, Base64 canónico, firma binaria y extensión coherente.
- [x] Reportes, sugerencias y PyS conservan sus controles previos de MIME, tamaño y firma.
- [x] No se fijó límite nuevo para logos sin revisar los tamaños históricos.

### Interfaz
- [x] Auditoría y consolidación CSS de encabezados en un bloque contiguo, preservando Tutorial/Relay y el cierre anidado del modal de corte.
- [x] Contratos CSS de cascada y layout responsive.
- [x] P0 de aportes, P1 de caché de vistos, PyS, Tutoriales, Inbox y búsqueda agrupada constan como cerrados localmente en los registros históricos.

## Trabajo local pendiente — auditoría integral de rendimiento

### P0 — mapa de llamadas y medición
- [x] P0.1 — Mapa estático navegador → endpoint → dispatcher → dependencias de los ocho servicios documentado en `MAPA_LLAMADAS_DEPENDENCIAS_P0_2026-11-21.md`.
- [x] Inventario estático inicial de `UrlFetchApp.fetch`, `fetchAll`, wrappers, `routeAction`, reintentos, publicaciones y llamadas entre proyectos; los conteos de wrappers no se interpretan como requests por interacción.
- [x] P0.2 — Instrumentación local del router: bytes UTF-8 de request/response, duración, promedio y p50/p95 de duración/tamaños sobre hasta 200 eventos efímeros por pestaña. Sin persistencia ni requests adicionales. **COMPLETADA CON VALIDACIÓN DIFERIDA**; CI: 277 suites, 3,226 pruebas, 0 fallos.
- [ ] Línea base Beta por flujo: requests, bytes, p50/p95, lecturas/escrituras y esperas para catálogo, búsqueda, detalle, aportes, Inbox, imágenes y vídeos. Medición real requiere navegador y entorno aislado.
- [x] Auditoría estática de telemetría ampliada a AUTH/CATALOG/USERS/WRITE/FEEDBACK: contadores directos por petición; CATALOG usa ScriptLock.tryLock(0). Evidencia: `AUDITORIA_P0_TELEMETRIA_2026-11-22.md`.
- [x] TEL-02 — Coordinator: mover la persistencia de métricas de adquisición de leases, validación de contexto y lectura del feed fuera de `ScriptLock`; conservar scopes y conteo de operaciones nuevas.
- [x] Contratos Coordinator: verificar que las métricas no acceden a PropertiesService dentro del lock y que fallos de persistencia no alteran lease/feed; 95/95 PASS en ejecución aislada.
- [x] CI integral de confirmación HEAD `+"`8feaea6`"+`: 298 suites / 3,463 pruebas / 0 fallos; health read-only SUCCESS. Pages build/deployment de este HEAD aún en curso al registrar.
- [x] TEL-01/TEL-03 — retirar contadores directos de AUTH/CATALOG/USERS/WRITE/FEEDBACK, eliminar endpoints internos de telemetría y fan-out de cinco servicios desde ADMIN; `getCatalogChanges` queda contado una sola vez por Coordinator.
- [ ] Evaluar el write restante de métricas Coordinator (lease, validación y feed): piggyback en escrituras funcionales o retirar eventos sin perder un diagnóstico necesario, cumpliendo §15.
- [ ] Completar matriz del flujo de catálogo: integrar feed incremental en UI y medir refresh post-edición, caché local y sincronización PyS en Beta.

### P0 — AUTH/USERS y excepciones de sesión
- [x] Completar mapa de consumidores de `touchSession`, `acceptTerms`, `validateSession`, login, recuperación, logout, `createUser` y `deleteUser` en `MAPA_CONSUMIDORES_AUTH_USERS_P0_2026-11-21.md`.
- [x] Determinar y corregir redundancias de `touchSession`/`acceptTerms`: `touchSession` no tiene consumidor frontend y deja de adquirir lease; `acceptTerms` reutiliza actor cacheado y deja de adquirir lease.
- [x] Clasificar y reducir leases AUTH conforme a §15: el dispatcher conserva lease únicamente para deleteUser; login mantiene bloqueo temporal y registro inicial de sesión; logout/cambios de contraseña/reset de sesiones conservan revocación remota sin lease; updateUser y acciones ordinarias usan actor cacheado y lock local solo donde la escritura lo requiere. USERS/createUser conserva exclusión únicamente frente a AUTH/deleteUser.
- [x] Resolver y probar localmente la carrera USERS `createUser` ↔ AUTH `deleteUser`: lease de `createUser` solo lee/escribe USERS; `deleteUser` comparte el recurso y el test de Coordinator confirma que no se solapan.
- [x] Verificar localmente caché de actor e invalidación por revocación/cambio de rol/logout/eliminación: login precarga USERS/WRITE/FEEDBACK/ADMIN; cache miss no llama Coordinator; invalidación incluye los cuatro servicios.
- [x] P0.3 — Precarga de actor en login fuera del lock global, por lotes de 25 tokens y `fetchAll`; acciones protegidas usan solo caché local con TTL renovable y fallan cerrado si falta.
- [x] Detectar y reducir lecturas de Users/ActiveSessions y revocaciones duplicadas dentro de una operación AUTH. Login reutiliza un snapshot de ActiveSessions; recuperación/rol reutilizan la fila objetivo; reset/cambio de contraseña invalidan usando los tokens del mismo snapshot; deleteUser lee solo ID/token de sesiones y verifica residuos por columna ID. La invalidación remota se ejecuta una sola vez antes de limpiar tokens. `AuthSessionReadOptimization.mjs`: 9/9 PASS; regresión: 284 suites / 3,309 pruebas / 0 fallos.
- [x] USERS — alta de cuenta reutiliza un único snapshot para username, fila libre e ID; getUsers lee A:G y updateProfile verifica solo las celdas ID necesarias. Tests específicos 10/10 y 8/8; mutaciones/RBAC/rollback 16/16; CI 287 suites / 3,359 pruebas / 0 fallos.
- [x] Completar revisión estática de AUTH/USERS/UTILITIES/CATALOG después de WRITE/FEEDBACK/ADMIN: snapshots y lecturas dirigidas ya reutilizados; no se encontró duplicación de alta confianza. Las operaciones de mantenimiento con lock/lease quedan para medición Beta.

### P1 — servicios, aportes y catálogo
- [x] ADMIN — confirmar que telemetría global y consultas de inventario/Drive se ejecutan solo desde el panel de desarrollador visible; getServiceTraffic es read-only, restringido a Desarrollador y no usa lease de mutación.
- [x] ADMIN — auditoría estática de respaldos/restauración DB y Drive, escáneres, reorganización de imágenes, upload/recovery y read-backs; se conserva staging/rollback y no se modifican rutas destructivas sin pruebas de integración.
- [x] Auditar FEEDBACK y ADMIN de extremo a extremo: dispatcher/RBAC, actor cacheado, escrituras, idempotencia, Drive/Spreadsheet, read-back y publicaciones. Sin duplicación de alta confianza; tres leases administrativas de mantenimiento quedan para medición Beta y revisión de sustituto idempotente.
- [x] FEEDBACK — aplicación de sugerencia de año: el read-back del append en FeedbackYearApplications localiza operationId exacto en columna A con TextFinder y lee solo las filas coincidentes (16 columnas); conserva detección de IDs duplicados y estado pending. Test FeedbackYearApplicationReadbackBounded; CI 292 suites / 3,405 pruebas / 0 fallos.
- [x] FEEDBACK — eventos vehicle_update de ampliación de año: preflight de idempotencia busca opId exacto en columna B de AportesVehiculo y lee únicamente filas coincidentes; read-back del append busca eventId exacto en columna A y confirma una única fila de 11 columnas. Se conservan comparación del contenido canónico, detección de opId contradictorio y read-back completo de los datos coincidentes. FeedbackYearApplicationAppendOnly actualizado; CI 292 suites / 3,406 pruebas / 0 fallos.
- [x] FEEDBACK — likes: cuando el preflight ya validó el esquema y obtuvo el ledger FeedbackLikes, el handler reutiliza esa misma referencia; solo crea/valida el ledger si el preflight no pudo obtener un snapshot. Evita la segunda lectura de encabezados en el camino ordinario, sin cambiar replay ni fallback. FeedbackLikeCompletedReplayPreflight 7/7; CI 292 suites / 3,406 pruebas / 0 fallos.
- [x] Inbox — deduplicación de auditoría: `inboxAppendAudit_` busca messageId exacto en columna G y lee solo filas coincidentes; si messageId está vacío, no recorre el historial. Se mantienen actor/acción/messageId como clave de deduplicación y read-back de la escritura. InboxConversations 67/67; regresión 292 suites / 3,407 pruebas / 0 fallos.
- [x] Inbox — estado y preferencias por participante: `inboxFindState_` y `inboxFindFlag_` localizan conversationId exacto en columna A y leen solo filas candidatas; conservan detección de duplicados por usuario. InboxConversations 69/69; CI 292 suites / 3,409 pruebas / 0 fallos.
- [x] FEEDBACK — panel de actividad: `handleGetActivityLogs` crea un único snapshot de Cortes (A:D y tres rangos tipo→colaborador) y lo comparte entre contribuciones e indicadores. Se reducen las lecturas de Cortes de 11 a 4 por petición, sin descargar columnas no necesarias. ActivityDashboardContributions y GP-DASH-INSIGHTS-01 PASS; AUG-120 7/7; CI 292 suites / 3,409 pruebas / 0 fallos; build, health y deploy SUCCESS.
- [x] PyS — read-back de PysOperations: después del append, busca opId exacto en columna A y lee únicamente filas coincidentes (8 columnas); conserva validación de hash, problemId, imageFileId y duplicados. PysCreationIntegrity 57/57; CI 292 suites / 3,410 pruebas / 0 fallos; build y health SUCCESS.
- [x] PyS — catálogo de lectura: `getPysSheet_` devuelve opcionalmente el snapshot de filas ya validado; `handleGetPysData` reutiliza esas filas en lugar de leer los mismos 10 campos dos veces. PysCreationIntegrity 58/58; CI 292 suites / 3,411 pruebas / 0 fallos; build y health SUCCESS.
- [x] Tutoriales — proyección de títulos: `tutorialTitleExists_` y búsqueda por título de `findTutorialRow_` cargan TutorialRenameEvents una sola vez y reutilizan la proyección para todas las filas. Evita una lectura completa del ledger por cada tutorial. FeedbackTutorialLookupBoundedRead 7/7; FeedbackTutorialUpdateTitleLookupBoundedRead 6/6; CI 292 suites / 3,413 pruebas / 0 fallos; build y health SUCCESS.
- [x] Tutoriales — reserva de título: `ensureTutorialTitleClaim_` comparte la proyección de propiedad con `appendTutorialTitleEvent_`; reduce de tres a dos lecturas completas al reclamar un título nuevo, manteniendo read-back posterior al append. TutorialIntegrity 43/43; CI 292 suites / 3,414 pruebas / 0 fallos; build y health SUCCESS.
- [x] CATALOG — lectura del catálogo: `handleGetCatalogData` resuelve Spreadsheet una sola vez y reutiliza el mismo handle para Cortes, Likes, aportes, Logos, Tutoriales, ledgers y Relay. CatalogSpreadsheetHandleReuse 9/9; CI 293 suites / 3,423 pruebas / 0 fallos; build y health SUCCESS.
- [x] CATALOG — feed incremental Coordinator: publicación y lectura reutilizan un único snapshot de ScriptProperties para obtener revisiones/eventos; se elimina getProperty por evento y los rescaneos de propiedades al podar. CatalogChangeFeed 36/36; CI 293 suites / 3,424 pruebas / 0 fallos; build y health SUCCESS.
- [x] FEEDBACK — eventos de imagen de reportes: tras append, la consulta por reportId confirma persistencia y detecta eventos concurrentes/conflictos de hash; se eliminó un escaneo adicional de la columna eventId que no aportaba validación independiente. FeedbackReportImageEvents 3/3; CI 292 suites / 3,407 pruebas / 0 fallos.
- [x] WRITE — auditoría end-to-end cerrada en revisión estática y contratos: alta nueva, idempotencia moderna/legacy, VIN, aportes suplementarios, journal de imágenes y publicación CATALOG. Se optimizó catálogo condicional, reutilización de ledger validado y snapshot VIN. Contratos específicos aprobados; CI 291 suites / 3,397 pruebas / 0 fallos. Beta real de Drive/concurrencia queda diferida a entorno aislado.
- [x] WRITE — aportes de corte: combinar la lectura posterior al append del ledger para calcular slot y detectar colisión VIN; checkOperation limita esa lectura a eventos existentes de tipo cut. Se conservan TextFinder, read-back, comprobación de opId y detección de conflictos concurrentes.
- [x] FEEDBACK — sugerencias de año: en reintentos ya reportados se reutiliza el snapshot existente de Feedbacks; solo se relee después de un append nuevo para incluir votos concurrentes.
- [x] FEEDBACK — likes: un único snapshot de filas del actor alimenta replay completed, replay event y ruta de recuperación; se mantiene lectura fresca después de append para confirmar el evento.
- [x] FEEDBACK — reportes propios: índice de eventos de imagen por reportId en una sola lectura por página; mantiene first-event-wins y limita errores de hash contradictorio al reporte consultado.
- [x] FEEDBACK — bandeja administrativa: reutilizar el índice de eventos de imagen en canonicalización de reportId y mapeo de página.
- [x] FEEDBACK — bandeja administrativa: cachear por página la canonicalización de suggestionOperationId, clave de solicitud y reportId; una búsqueda repetida para el mismo identificador se ejecuta una sola vez.
- [x] Auditar CATALOG/Coordinator: deltas, cursores, snapshots, resets e invalidaciones; se mantienen snapshots completos para inicio/reset/recuperación y se conserva el feed incremental con reset seguro.
- [x] Auditoría de callers de publicación CATALOG: WRITE publica tras liberar lock; FEEDBACK publica solo después de confirmar mutación (likes nuevos, aplicación de año, vídeo aprobado/rechazado, PyS/Tutorial); ADMIN agrupa lotes de hasta 50 con requestId. Los fallos de snapshot/publicación usan reset sin revertir una mutación confirmada. Contratos WriteCatalogPublicationIsolation 7/7, FeedbackCatalogPublicationIsolation 5/5, AdminCatalogPublicationIsolation 6/6, CatalogChangeFeed 36/36.
- [x] Revisar refresh completo `getCatalogData` al cerrar edición: la edición normal ahora llama a `auth.loadInitialData(true)`, que consume deltas desde el cursor local y usa snapshot completo ante reset/cursor inválido; el descarte conserva dos snapshots completos para comparar y verificar restauración.
- [x] Integrar el flujo incremental en el cierre normal de edición sin duplicar lógica: reutiliza el consumidor existente de `auth.js`, conserva fallback completo y evita que una respuesta tardía sobrescriba una sincronización concurrente.
- [ ] Completar pruebas Beta de concurrencia entre pestañas, cambios simultáneos y fallback por reset/cursor vencido.
- [x] Medir telemetría ADMIN y confirmar que no se ejecuta en navegación/aportes ordinarios; llamada restringida al panel visible de Desarrollador, con refresco mínimo de 60 s.

### P1 — imágenes, vídeos y archivos
- [ ] Diseñar y medir compresión/redimensionado con corpus técnico real; preservar legibilidad, transparencia, MIME/firma, metadatos, SHA-256 e idempotencia.
- [ ] Revisar tamaños históricos de logos antes de decidir límite.
- [ ] Medir CORS, PNG alfa, cache hit/miss, primera pintura, bytes, memoria y cancelación en navegador real.
- [x] Revisar prioridad visible/precarga, métricas y cancelación segura: la cola prioriza visibles y expone métricas; no se cancela trabajo compartido por falta de ownership/ref-count y porque la precarga alimenta caché global. CI 293 suites / 3,435 pruebas / 0 fallos.
- [x] Auditoría estática del flujo YouTube completada; evidencia en AUDITORIA_P1_YOUTUBE_UPLOAD_2026-11-22.md.
- [x] Trazar estáticamente el flujo de vídeo/YouTube: sesión resumable, bloques, checkpoints, recuperación, aprobación/rechazo y consultas del cliente/backend revisadas en `AUDITORIA_P1_YOUTUBE_UPLOAD_2026-11-22.md`. No se retiran consultas sin medición; la idempotencia de init se difiere por riesgo de concurrencia y NORMAS §15.
- [ ] Medir por separado cliente, red, Apps Script, Drive y proyección CATALOG.

### P2 — optimización y verificación integral
- [x] Revisar listeners, polling, timers y observers principales: corregida acumulación resize por carrusel y handlers estáticos del panel ADMIN; Inbox/ADMIN timers tienen start-stop/singleton; listeners de modal y AbortSignal tienen cleanup.
- [x] Revisar cache-first/IndexedDB: IDB y CacheStorage en paralelo, carrera 3 s, una apertura IDB compartida, transacción confirmada y PyS single-flight; medir primer render y memoria real queda para Beta.
- [ ] Ampliar pruebas transversales de no duplicación/fallos parciales: añadidos dos casos al contrato SharedMutationCoordinator para respuesta JSON inválida tras commit (mismo requestId/cuerpo, sin duplicar) y rechazo de aplicación sin reintento. CI pendiente.
- [x] Documentar llamadas retiradas/conservadas y su justificación en AUDITORIA_NAVEGACION_CATALOGO_CACHE_2026-11-22.md.

## Validaciones diferidas a Beta
- [ ] AUG-159: aportes concurrentes, candidatos, correcciones y recuperación ADMIN en Spreadsheet/Drive aislados.
- [ ] AUG-160: cargas ADMIN/ImageUploadEvents, pérdida de respuesta, file_missing, metadatos alterados y fallos parciales.
- [ ] AUG-161 y pruebas relacionadas de PyS, tutoriales, vídeos, Inbox y mutaciones en proyectos aislados.
- [ ] Concurrencia real appendRow, entre proyectos, pérdida de respuesta y recuperación multihoja.
- [ ] Validación visual de modales, Tutorial/Relay, escritorio, Android/PWA, modo oscuro y desbordamiento.
- [ ] Validación del ciclo de imágenes: CORS, PNG alfa, cache hit/miss, calidad, bytes, memoria, primera pintura y cancelación.
- [ ] Safe Apply no se ejecuta hasta disponer de preview, ACL y rollback autorizados.

## Restricciones
- No modificar `GPSpedia2.2.5`.
- No desplegar Apps Script ni modificar endpoints, Spreadsheet, Drive, secretos o propiedades productivas sin autorización.
- Beta solo con deployments, cuentas, Spreadsheet y Drive aislados; comenzar por los comandos seguros de sincronización de la matriz Beta.
- No retirar escaneo global Drive ni controles de idempotencia/recuperación sin equivalencia demostrada.

## Siguiente paso exacto
P0 AUTH/USERS, WRITE, FEEDBACK y ADMIN quedan cerrados en código/auditoría estática y CI. P1 multimedia local está cerrado con validación Beta pendiente. Siguiente trabajo local: revisar inicializaciones y renderizados duplicados de UI y pruebas transversales de fallos parciales/no duplicación. Toda validación real de Drive, concurrencia interproyecto, pérdida de respuesta y métricas requiere entorno aislado; no ejecutar contra producción.


## Actualización de continuidad — 2026-11-22

- **Tarea anterior completada:** revisión de callers de publicación CATALOG/Coordinator. Se conserva la evidencia de contratos y CI en el checkpoint.
- **Siguiente tarea activa:** P1 — imágenes, vídeos y archivos. El plan detallado, alcance, secuencia, pruebas, restricciones y criterios de cierre están registrados en `checkpoint.md`.
- **Primer paso:** inventariar las rutas frontend de imágenes, compresión, caché, ObjectURL, cola y sus consumidores; después revisar logos históricos y flujo resumable/aprobación de YouTube.
- **Contexto:** las correcciones de miniaturas ya registradas se preservan. P2.2a, P2.2b (`handleAddProblem`) y P2.3 están cerradas localmente; no reabrirlas sin evidencia nueva. La validación real de navegador, Drive y YouTube se reserva a Beta aislada.
- **Estado:** PENDIENTE de ejecución. No se ha modificado código en esta actualización.


### P1 — imágenes, vídeos y archivos (actualización 2026-11-21)
- [x] Inventario técnico estático de presentación/variantes, IndexedDB, compresión PNG, cola, ObjectURL, precarga, cargas ADMIN/FEEDBACK/PyS, logos y cliente YouTube. Evidencia y decisiones en `AUDITORIA_P1_MULTIMEDIA_INVENTARIO_2026-11-21.md`.
- [x] Trazar y corregir prioridad visible/precarga; implementar métricas y contratos. Corpus técnico real, calidad visual y medición de navegador quedan pendientes de Beta aislada.
- [ ] Inventariar tamaños históricos reales de logos; no fijar límite sin muestra representativa.
- [x] Suites multimedia ejecutadas en CI; CORS, primera pintura, bytes, memoria y cancelación en navegador real quedan reservados a Beta aislada.


### P1 — compresión y calidad visual (actualización 2026-11-21)
- [x] Inspeccionar algoritmo de miniaturas y corpus de imágenes versionado. Conclusión: PNG conserva alfa, no se amplían imágenes pequeñas y la proporción se mantiene; el reescalado puede perder detalle fino. No existe corpus técnico representativo; no se cambian parámetros. Evidencia: `AUDITORIA_P1_CALIDAD_COMPRESION_2026-11-21.md`.
- [ ] Obtener corpus técnico aislado y autorizado para probar diagramas/cableado, texto fino, alfa PNG, orientación, MIME/firma y tamaños 300/800/1600. No incorporar imágenes de clientes al repositorio.
- [x] Prioridad visible/precarga y métricas implementadas; concurrencia FIFO 2 se mantiene. Medición real y decisión de concurrencia quedan para Beta.


### P1 — competencia visible/precarga (actualización 2026-11-21)
- [x] Trazar el encolado desde snapshot/deltas y vistos recientes. Máximo teórico 15 × 11 = 165 trabajos de precarga; la cola de dos workers es FIFO y comparte single-flight con la ruta visible. Informe: `AUDITORIA_P1_COLA_VISIBLE_PRECARGA_2026-11-21.md`.
- [x] Prioridad visible 10/precarga 0, FIFO estable, promoción single-flight (incluida anticipada), sin duplicar trabajo ni preemptar activos; contratos aprobados.
- [ ] Medir en Beta aislada tiempos de espera, bytes, cache hit/miss, CPU, CORS y memoria; no cambiar concurrencia 2 sin resultados.


### P1 — prioridad visible/precarga (actualización 2026-11-21)
- [x] Implementar prioridad 10 visible / 0 precarga, FIFO estable por prioridad y promoción de trabajos pendientes por clave, incluida promoción anticipada. Las tareas activas no se interrumpen; concurrencia se mantiene en 2.
- [x] Integrar prioridad en las dos rutas de compresión y promoción en single-flight visible.
- [x] Ampliar `ThumbnailCompressionQueueContract.mjs` con casos de prioridad, promoción, no-preemption y compatibilidad.
- [x] Workflow CI verificado: 293 suites / 3,435 pruebas / 0 fallos.
- [x] Instrumentar métricas efímeras por prioridad: encolados, inicios, finalizados, errores, promociones, activos/pendientes, espera y duración total/máxima. Se conserva getStats(); reloj inyectable para pruebas deterministas.
- [x] Revisar cancelación segura: no se implementa porque la caché es global y single-flight puede compartir con imagen visible; documentado en auditoría.


- [x] Limpiar promociones anticipadas en el `finally` de single-flight para evitar overrides obsoletos; prueba contractual añadida.
- [x] CI de la versión final de prioridad SUCCESS; contrato 24/24 PASS.


- [x] Corregir el resumen de salida requerido por `RunServiceTests.mjs` (`N/N PASS`). El primer CI había ejecutado los asserts correctamente pero falló al no detectar resumen numérico.
- [x] Revalidación CI SUCCESS en HEAD 79b7e5c8 y commits documentales posteriores.


- [x] Adaptar el harness aislado de `ThumbnailCacheDeduplication.mjs` a la nueva dependencia de cola, sin sustituir la prueba de single-flight.
- [x] CI del commit 02788fbd: workflow 44972971725 SUCCESS; job service-tests SUCCESS, sintaxis y regresión aislada aprobadas.


### P1 — métricas de cola de miniaturas (2026-11-22)
- [x] Añadir métricas efímeras por prioridad: encolados/iniciados/completados/fallidos/promovidos, activos/pendientes, espera y duración total/máxima.
- [x] Mantener getStats() y getPriorityStats() con sus contratos anteriores; añadir getMetrics() como snapshot de diagnóstico.
- [x] Inyectar reloj para pruebas deterministas; no registrar URLs, claves ni datos de vehículos.
- [x] CI `44974498485` SUCCESS: 293 suites / 3,435 pruebas / 0 fallos; `ThumbnailCompressionQueueContract` 24/24 PASS; sintaxis aprobada.
- [x] Revisar cancelación por cambio de vista/sesión: no implementar cancelación. Las miniaturas se guardan en caché compartida y no contienen estado de sesión; single-flight comparte la misma promesa con consumidores visibles. Sin ownership/ref-count, cancelar por clave podría interrumpir una imagen visible; el trabajo activo además no es cancelable de forma uniforme.


### P1 — cierre de métricas y revisión de cancelación (2026-11-22)
- [x] Métricas de cola aprobadas en CI `44974498485`: 293 suites / 3,435 pruebas / 0 fallos; contrato focalizado 24/24 PASS; sintaxis aprobada.
- [x] Compatibilidad: getStats() y getPriorityStats() conservan sus contratos; getMetrics() agrega diagnóstico efímero por prioridad.
- [x] Cancelación revisada: no se añade. Las precargas de catálogo/vistos solo calientan caché global; las claves no son de sesión y la promesa single-flight puede compartirse con una imagen visible. Cancelar por clave sin ownership/ref-count pondría en riesgo al consumidor visible.
- [x] Auditoría YouTube resumable/recuperación/aprobación completada; riesgo de sesión init huérfana documentado.


### P1 — auditoría del flujo YouTube (2026-11-22)
- [x] Revisar transferencia directa resumable navegador→YouTube, bloques 8 MiB, checkpoints IndexedDB, consulta de offset, pausa/reanudación, cancelación, expiración y recuperación.
- [x] Revisar idempotencia de aprobación, duplicados por destino, RBAC, ledger append-only y publicación/rechazo recuperables.
- [x] Confirmar suites de cliente/servidor incluidas en RunServiceTests; CI HEAD fd8c9040 SUCCESS: 293 suites / 3,435 pruebas / 0 fallos.
- [x] Evaluar idempotencia de initYouTubeUpload frente a NORMAS §15: no añadir lock/lease/espera ni serializar cargas; riesgo bajo de sesión huérfana documentado, sin duplicación de vídeo publicado.
- [x] Inventario de assets versionados y límites actuales completado; tamaños históricos de Drive quedan como Beta pendiente.


### P1 — inventario de logos (2026-11-22)
- [x] Inventariar assets versionados y revisar validación cliente/backend: PNG/SVG/WEBP, MIME, Base64 canónico y firma real; no hay límite de bytes específico.
- [x] Confirmar que los assets versionados no son una muestra representativa de LogosMarca. No cambiar límites por falta de datos.
- [ ] Medir en Beta aislada y de solo lectura los tamaños históricos reales de Drive/Spreadsheet, MIME/firma, dimensiones y anomalías antes de definir un límite.
- [x] Decisión de idempotencia de init documentada conforme a NORMAS §15; no se añade mecanismo transaccional.


### P1 — métricas adicionales y decisión de init YouTube (2026-11-22)
- [x] Medir también las promociones anticipadas single-flight que ocurren antes de queue.run(); contrato de métricas actualizado.
- [x] CI HEAD 79b7e5c8 SUCCESS: 293 suites / 3,435 pruebas / 0 fallos; ThumbnailCompressionQueueContract 24/24 PASS.
- [x] Evaluar idempotencia de initYouTubeUpload ante respuesta perdida frente a NORMAS §15: no introducir ScriptLock/lease/espera ni serializar cargas. Sin primitivas atómicas lock-free verificadas, se documenta el riesgo bajo de sesión resumable huérfana; no implica duplicación de vídeo publicado.
- [x] Protocolo Beta aislado preparado e indexado en lista_beta.txt; ejecución externa sigue pendiente.


### P1 — protocolo Beta multimedia (2026-11-22)
- [x] Preparar adenda con sincronización segura obligatoria y escenarios de corpus/calidad, MIME/firma/SHA, cola/precarga/primera pintura, logos históricos y YouTube resumable/aprobación.
- [ ] Ejecutar solo en entorno Beta aislado con deployments, Spreadsheet, Drive, OAuth y canal de prueba autorizados. No ejecutar contra producción.


### Resumen de cierre local P1 multimedia (2026-11-22)
- [x] Inventario estático, prioridad de miniaturas, métricas, compatibilidad de contratos, auditoría de cancelación, revisión YouTube, inventario de assets versionados y protocolo Beta.
- [x] HEAD `dbf8a73b0a0ab972a66a9333f2d5afc07d7121f5`: CI 44975028315 SUCCESS; 293 suites / 3,435 pruebas / 0 fallos; health read-only 44975028307 SUCCESS.
- [ ] PENDIENTE BETA: corpus técnico autorizado, CORS/primera pintura/bytes/memoria, tamaños históricos de LogosMarca y ejecución YouTube real en canal aislado.


### FEEDBACK/ADMIN — cierre de auditoría estática (2026-11-22)
- [x] FEEDBACK: dispatcher/RBAC/actor, aportes, adjuntos, PyS, Tutoriales, Inbox, vídeos, read-back y publicaciones CATALOG revisados; sin ScriptLock global ni lease en handlers ordinarios.
- [x] ADMIN: actor cacheado validado localmente, matriz de roles, WRITE/CATALOG, inventario Drive, read-backs y auditoría persistente revisados.
- [x] No se identificó llamada duplicada de alta confianza para retirar sin medición.
- [ ] Medir en Beta aislada las tres leases administrativas (saveUnusedImagesInventory, createCortesImageFolder, auditDriveImagesInCortes), su contención/duración y alternativas idempotentes. No retirarlas sin pruebas de duplicados/cursor.


### Servicios restantes — cierre de auditoría de lecturas (2026-11-22)
- [x] AUTH: reutilización de snapshots Users/ActiveSessions, revocación única e invalidación de caché verificadas.
- [x] USERS: alta con snapshot único, lectura A:G y búsquedas por ID con confirmación de celda; contrato integrado.
- [x] UTILITIES: migración con snapshot, staging/backup/rollback; contrato de seguridad/concurrencia integrado.
- [x] CATALOG: handle Spreadsheet reutilizado, snapshot de ScriptProperties y feed incremental idempotente.
- [x] No se detectó otra lectura redundante de alta confianza para retirar sin medición.
- [ ] Medir tiempos reales y concurrencia en Beta aislada; no modificar recursos productivos.


### P2 — listeners y ciclo de vida de UI (2026-11-22)
- [x] Corregir listeners globales resize por carrusel: un único listener global con debounce, actualización de nodos presentes y sin retener DOM retirado.
- [x] Revisar timers Inbox/ADMIN, listeners de conectividad, popstate, observers de modal, AbortSignal, navegación, Service Worker e ImageObjectURL; restantes tienen guardas/cleanup o son singleton de app.
- [x] Contrato CarouselResizeListenerLifecycle 5/5 PASS; CI HEAD d97f487e SUCCESS: 294 suites / 3,440 pruebas / 0 fallos; health y Pages SUCCESS.
- [ ] Revisar consultas repetidas al navegar y el impacto IndexedDB/cache-first sobre primer render.


### P2 — navegación, catálogo e IndexedDB (2026-11-22)
- [x] Tutoriales: refresco posterior al alta usa feed incremental primero; snapshot completo solo como fallback; guardias de sesión y respuesta tardía.
- [x] Navegación: otras llamadas completas se justifican por falta de catálogo, reset/caché inválida o verificación de restauración; PyS comparte cache/in-flight.
- [x] IndexedDB: cache-first, IDB/CacheStorage en paralelo, timeout de 3 s, apertura única y transacción confirmada; persistencia secundaria a render en memoria.
- [x] TutorialCatalogRefreshDeltaFirst 6/6 PASS; CarouselResizeListenerLifecycle 5/5 PASS; CI 295 suites / 3,446 pruebas / 0 fallos.
- [ ] Medir primer render, IDB, cache hit/miss, llamadas completas evitadas y memoria en Android/PWA y escritorio Beta.


### P2 — inicializaciones y renderizados (2026-11-22)
- [x] Revisar inicializadores/render principales (ADMIN, Inbox, detalle, carruseles, modales, observers y helpers globales): no se encontró otra duplicación global de alta confianza; los nodos dinámicos se recrean y los listeners persistentes usan guardas/handlers reemplazables.
- [x] Añadir contratos de no duplicación/recuperación para cola, requests, refresco delta, carruseles y reabrir ADMIN; contratos nuevos integrados en CI. La prueba DOM real y fallos de navegador quedan para Beta.
- [x] CI HEAD 4dd0f9f4 SUCCESS: 295 suites / 3,446 pruebas / 0 fallos; TutorialCatalogRefreshDeltaFirst 6/6; CarouselResizeListenerLifecycle 5/5; health read-only SUCCESS.


### P2 — cierre de listeners y handlers UI (2026-11-22)
- [x] Carruseles: un listener global resize con debounce; sin closures reteniendo carruseles retirados. Contrato 5/5.
- [x] Panel ADMIN: initAdminPanelListeners se ejecuta al abrir; termInput, backupResourceInput y contributionRefreshBtn ahora reemplazan handlers en lugar de acumular addEventListener. El input de respaldo combina la habilitación de reanudación y reinicio de previews. Contrato 8/8.
- [x] CI HEAD d01fb344 SUCCESS: 296 suites / 3,454 pruebas / 0 fallos; health read-only y Pages SUCCESS.
- [ ] Revisar inicializaciones/renderizados duplicados más allá de listeners; luego cobertura transversal de fallos parciales/no duplicación.


### P2 — cierre de revisión estática UI (2026-11-22)
- [x] Inicialización/render: ADMIN reabre con handlers reemplazables; Inbox tiene binding singleton; detalle desconecta ResizeObserver previo al re-render; modales eliminan observers/listeners al cerrar; carruseles y elementos dinámicos se destruyen con su DOM.
- [x] Contratos agregados: CarouselResizeListenerLifecycle 5/5, TutorialCatalogRefreshDeltaFirst 6/6, AdminPanelListenerLifecycle 8/8; cola y requests mantienen pruebas de prioridad, recuperación y abort.
- [x] CI HEAD ef50dd98 SUCCESS: 296 suites / 3,454 pruebas / 0 fallos; health read-only SUCCESS; Pages build pendiente al momento del registro.
- [ ] Validar comportamiento real de DOM, memoria, CPU, red y re-render en Beta Android/PWA/escritorio.


### P0 — protocolo Beta de línea base por flujo (2026-11-22)
- [x] Preparar adenda con sincronización segura, escenarios por AUTH/USERS/CATALOG/WRITE/FEEDBACK/Inbox/ADMIN y métricas por servicio/acción/dispositivo.
- [x] Documentar que serviceTelemetry es local a la pestaña, acotada a 200 eventos; p50/p95 no son poblacionales y requieren n≥30.
- [ ] Ejecutar en Beta aislada, incluyendo contadores internos Spreadsheet/Drive/Coordinator con instrumentación temporal agregada. No ejecutar en producción.


### P2 — reintentos, abort y efectos duplicados (2026-11-22)
- [x] Corregir carrera pre-abort en CatalogRequest: callback de request no se ejecuta si la señal ya fue cancelada; backoff revalida cancelación.
- [x] Clasificar consumidores de routeActionWithRetry: lecturas, cursor resumable, mutaciones idempotentes por operationId y mutaciones maxAttempts=1.
- [x] CatalogRequestRetry 8/8; AdminDriveAuditClientRetry 7/7; CI 296 suites / 3,455 pruebas / 0 fallos.
- [ ] Ejecutar pruebas Beta de respuesta perdida/abort de red y comprobar métricas internas Spreadsheet/Drive/Coordinator en entorno aislado.


### P2 — publicación CATALOG ante respuesta parcial (2026-11-21)
- [x] Añadir prueba de recuperación cuando Coordinator confirma la publicación, pero la primera respuesta llega como JSON inválido: el segundo intento conserva exactamente el cuerpo/requestId y devuelve replay `duplicate` sin crear revisiones adicionales.
- [x] Añadir prueba de que un rechazo de aplicación explícito no genera un segundo viaje de red.
- [x] Ejecutar contrato SharedMutationCoordinator y regresión completa en CI; 296 suites / 3,457 pruebas / 0 fallos. Health read-only SUCCESS. Pages build del mismo HEAD seguía en curso al registrar.


### P2 — pruebas transversales de no duplicación/fallos parciales (2026-11-21)
- [x] SharedMutationCoordinator: respuesta perdida después de commit y JSON inválido tras commit reutilizan requestId/cuerpo y no duplican publicaciones.
- [x] Rechazo explícito de aplicación no se reintenta; lote parcial ya persistido se recupera con reset.
- [x] Regresión CI HEAD `9cde983eb6e95595519d74806d2ade03d385e126`: 296 suites / 3,457 pruebas / 0 fallos; health read-only SUCCESS.
- [ ] Pages build/deployment del mismo HEAD: pendiente de finalización; no es deployment Apps Script.


### P1 — trazado estático de consultas YouTube (2026-11-21)
- [x] Revisar flujo cliente/backend, requests de inicialización, transferencia resumable, checkpoints, recuperación y aprobación/rechazo.
- [x] No retirar consultas ni introducir persistencia/lease adicional sin medición o primitiva atómica lock-free; riesgo de sesión huérfana documentado sin duplicación de vídeo publicado.
- [ ] Medir en Beta aislada las solicitudes cliente, red, Apps Script, Drive y proyección CATALOG; usar canal YouTube de prueba autorizado.


## Fase de verificación técnica integral (§11 NORMAS) — inicio 2026-11-21
- [x] Ejecutar parsing/sintaxis sobre todos los archivos `.js` y `.mjs` mediante `RepositoryJavaScriptSyntax.mjs`: 428 archivos verificados, 1/1 PASS.
- [x] Regresión integral HEAD `2955bb16`: 297 suites / 3,458 pruebas / 0 fallos; health read-only SUCCESS.
- [x] Verificar imports/referencias relativas en frontend, servicios, service-worker y tests integrados: RepositoryModuleReferences 1/1 PASS; 298 suites / 3,459 pruebas / 0 fallos. Se corrige el contador del mensaje de resumen (`files.length` → `files.size`) y se repetirá CI.
- [ ] Revisar diff de cambios vigentes y regresión/anti-regresión; registrar solo defectos reproducibles.


### Verificación integral — sintaxis y regresión (2026-11-21)
- [x] Sintaxis: `RepositoryJavaScriptSyntax` 1/1 PASS, 428 archivos `.js/.mjs` comprobados con Node 22.23.5.
- [x] Regresión: CI HEAD `2955bb16ce27bb019f6f0a86f9d902b8ecea8c4d`, 297 suites / 3,458 pruebas / 0 fallos.
- [x] Health read-only SUCCESS. Pages build del mismo HEAD seguía in_progress al cierre.
- [ ] Revisar referencias/imports y compatibilidad de rutas/módulos restantes; diff acumulado y regresión anti-regresión.


### Verificación integral — referencias y módulos (2026-11-21)
- [ ] Comprobar imports/re-exports/dynamic imports, `new URL(..., import.meta.url)` y `require()` relativos en los 428 archivos JS/MJS; contrato añadido, CI pendiente.


### Verificación integral — cierre de sintaxis, referencias y regresión (2026-11-21)
- [x] `RepositoryJavaScriptSyntax`: 429 archivos `.js/.mjs`, 1/1 PASS.
- [x] `RepositoryModuleReferences`: 340 módulos/runner/tests activos, 1/1 PASS; referencias relativas resueltas.
- [x] CI HEAD `377edf17`: 298 suites / 3,459 pruebas / 0 fallos; health read-only SUCCESS.
- [ ] Pages build/deployment del mismo HEAD seguía in_progress al cierre.
- [ ] Revisión final del diff acumulado de implementaciones y anti-regresión dirigida.


### Verificación técnica integral — cierre local (2026-11-21)
- [x] Sintaxis Node 22: 429 archivos `.js/.mjs`, 1/1 PASS.
- [x] Referencias relativas: 340 archivos activos inspeccionados, 1/1 PASS.
- [x] Regresión: 298 suites / 3,459 pruebas / 0 fallos.
- [x] Health read-only SUCCESS y Pages build/deployment SUCCESS.
- [x] Diff acumulado revisado: 11 commits desde `214b39a8`, 7 archivos, solo tests y registros; ningún archivo productivo modificado durante esta fase de verificación.
- [ ] Validaciones diferidas a Beta: navegador Android/PWA/escritorio, corpus técnico, CORS/memoria/primera pintura, tamaños históricos Drive, Spreadsheet/Drive aislados, concurrencia interproyecto y YouTube real.


### P0 — auditoría de telemetría y costo en rutas ordinarias (2026-11-22)
- [x] Revisar telemetría del navegador y contadores backend de USERS, WRITE, FEEDBACK y Coordinator.
- [x] Confirmar scopes y frecuencia del agregado ADMIN; el panel está restringido a Desarrollador y el refresco se condiciona a visibilidad.
- [x] Registrar hallazgos TEL-01 a TEL-04 en `AUDITORIA_P0_TELEMETRIA_2026-11-22.md`.
- [ ] Diseñar e implementar reducción del costo síncrono de métricas; no retirar el diagnóstico sin contrato alternativo.
- [x] Añadir contratos de Coordinator: ausencia de acceso a PropertiesService de telemetría bajo ScriptLock y preservación del resultado ante fallos; 95/95 PASS.
- [ ] Completar corrección de contadores directos USERS/WRITE/FEEDBACK y su contrato alternativo.
- **Estado:** TEL-01/TEL-02/TEL-03 implementación local COMPLETADA en esta rama; pruebas aisladas nuevas preparadas; CI integral de confirmación PENDIENTE. La persistencia best-effort de Coordinator sigue siendo un write adicional fuera del lock y requiere evaluación final.

### P0 — validación del contrato de telemetría sin contadores directos (2026-11-22)
- [x] El agregado ADMIN conserva siete servicios y solo muestra eventos que Coordinator registra (adquisiciones nuevas de lease, validaciones de contexto y feed); declara las rutas directas como no recopiladas, no como cero HTTP.
- [x] AUTH/CATALOG/USERS/WRITE/FEEDBACK dejan de persistir contadores por petición y dejan de exponer endpoints internos getServiceTraffic. CATALOG conserva GPSpedia_CATALOG_TRAFFIC_SECRET únicamente para metadatos internos del inventario de imágenes.
- [x] Coordinator deja de consultar cinco servicios con fetchAll para construir telemetría; mantiene fetchAll para la precarga de actores, que es una operación funcional distinta.
- [x] UI Developer separa eventos globales Coordinator de solicitudes locales del navegador y aclara la cobertura.
- [ ] Ejecutar CI integral actualizado y revisar Pages deployment del HEAD.