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
- [ ] Revisar telemetría para evitar viajes de red, locks, escrituras o esperas en acciones ordinarias.
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
- [ ] Continuar optimización de lecturas/operaciones duplicadas en otros servicios tras auditar WRITE/FEEDBACK/ADMIN.

### P1 — servicios, aportes y catálogo
- [x] ADMIN — confirmar que telemetría global y consultas de inventario/Drive se ejecutan solo desde el panel de desarrollador visible; getServiceTraffic es read-only, restringido a Desarrollador y no usa lease de mutación.
- [x] ADMIN — auditoría estática de respaldos/restauración DB y Drive, escáneres, reorganización de imágenes, upload/recovery y read-backs; se conserva staging/rollback y no se modifican rutas destructivas sin pruebas de integración.
- [ ] Auditar FEEDBACK y ADMIN de extremo a extremo: operaciones, idempotencia, Drive/Spreadsheet, read-back y publicaciones.
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
- [ ] Revisar cola de compresión, cancelación/reintentos y claves de idempotencia.
- [ ] Trazar vídeos/YouTube y retirar consultas solo con medición.
- [ ] Medir por separado cliente, red, Apps Script, Drive y proyección CATALOG.

### P2 — optimización y verificación integral
- [ ] Revisar listeners, polling, timers, observers, inicialización/renderizados duplicados y consultas al navegar.
- [ ] Revisar IndexedDB y cachés sin bloquear el primer render.
- [ ] Añadir pruebas de no duplicación y fallos parciales; ejecutar regresión integral y comparación antes/después.
- [ ] Documentar llamadas retiradas/conservadas y su justificación.

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
P0 AUTH/USERS y auditoría WRITE quedan cerrados en código, auditoría estática y CI (291 suites / 3,397 pruebas / 0 fallos). Siguiente: auditoría end-to-end FEEDBACK (sugerencias de año, likes, reportes/imágenes, Inbox, vistas/actividad, PyS/tutoriales y publicación CATALOG). Después ADMIN. Luego P1 de imágenes/vídeos/archivos y mediciones Beta. Toda validación real de Drive, concurrencia interproyecto, pérdida de respuesta y métricas requiere entorno aislado; no ejecutar contra producción.


## Actualización de continuidad — 2026-11-22

- **Tarea anterior completada:** revisión de callers de publicación CATALOG/Coordinator. Se conserva la evidencia de contratos y CI en el checkpoint.
- **Siguiente tarea activa:** P1 — imágenes, vídeos y archivos. El plan detallado, alcance, secuencia, pruebas, restricciones y criterios de cierre están registrados en `checkpoint.md`.
- **Primer paso:** inventariar las rutas frontend de imágenes, compresión, caché, ObjectURL, cola y sus consumidores; después revisar logos históricos y flujo resumable/aprobación de YouTube.
- **Contexto:** las correcciones de miniaturas ya registradas se preservan. P2.2a, P2.2b (`handleAddProblem`) y P2.3 están cerradas localmente; no reabrirlas sin evidencia nueva. La validación real de navegador, Drive y YouTube se reserva a Beta aislada.
- **Estado:** PENDIENTE de ejecución. No se ha modificado código en esta actualización.


### P1 — imágenes, vídeos y archivos (actualización 2026-11-21)
- [x] Inventario técnico estático de presentación/variantes, IndexedDB, compresión PNG, cola, ObjectURL, precarga, cargas ADMIN/FEEDBACK/PyS, logos y cliente YouTube. Evidencia y decisiones en `AUDITORIA_P1_MULTIMEDIA_INVENTARIO_2026-11-21.md`. Sin cambios de código ni pruebas ejecutadas.
- [ ] Siguiente: validar compresión/redimensionado con corpus técnico; medir legibilidad, alfa PNG, dimensiones, orientación, MIME/firma, metadatos y tamaños. Medir competencia entre precarga de últimos 15 vehículos y recursos visibles antes de cambiar cola/concurrencia.
- [ ] Inventariar tamaños históricos reales de logos; no fijar límite sin muestra representativa.
- [ ] Ejecutar suites locales multimedia y reservar CORS, primera pintura, bytes, memoria y cancelación para navegador Beta aislado.


### P1 — compresión y calidad visual (actualización 2026-11-21)
- [x] Inspeccionar algoritmo de miniaturas y corpus de imágenes versionado. Conclusión: PNG conserva alfa, no se amplían imágenes pequeñas y la proporción se mantiene; el reescalado puede perder detalle fino. No existe corpus técnico representativo; no se cambian parámetros. Evidencia: `AUDITORIA_P1_CALIDAD_COMPRESION_2026-11-21.md`.
- [ ] Obtener corpus técnico aislado y autorizado para probar diagramas/cableado, texto fino, alfa PNG, orientación, MIME/firma y tamaños 300/800/1600. No incorporar imágenes de clientes al repositorio.
- [ ] Siguiente: medir competencia visible/precarga y preparar harness de rendimiento; mantener concurrencia FIFO 2 hasta tener evidencia.


### P1 — competencia visible/precarga (actualización 2026-11-21)
- [x] Trazar el encolado desde snapshot/deltas y vistos recientes. Máximo teórico 15 × 11 = 165 trabajos de precarga; la cola de dos workers es FIFO y comparte single-flight con la ruta visible. Informe: `AUDITORIA_P1_COLA_VISIBLE_PRECARGA_2026-11-21.md`.
- [ ] Implementar prioridad alta para imágenes visibles y baja para precarga; FIFO dentro de prioridad, elevar entradas pendientes compartidas por single-flight, sin duplicar trabajo ni preemptar activos. Añadir pruebas contractuales.
- [ ] Medir en Beta aislada tiempos de espera, bytes, cache hit/miss, CPU, CORS y memoria; no cambiar concurrencia 2 sin resultados.


### P1 — prioridad visible/precarga (actualización 2026-11-21)
- [x] Implementar prioridad 10 visible / 0 precarga, FIFO estable por prioridad y promoción de trabajos pendientes por clave, incluida promoción anticipada. Las tareas activas no se interrumpen; concurrencia se mantiene en 2.
- [x] Integrar prioridad en las dos rutas de compresión y promoción en single-flight visible.
- [x] Ampliar `ThumbnailCompressionQueueContract.mjs` con casos de prioridad, promoción, no-preemption y compatibilidad.
- [ ] Verificar workflow CI tras commit; no marcar pruebas como PASS hasta leer el resultado.
- [ ] Siguiente: instrumentar métricas de cola/espera por prioridad y estudiar cancelación segura por cambio de sesión/vista.


- [x] Limpiar promociones anticipadas en el `finally` de single-flight para evitar overrides obsoletos; prueba contractual añadida.
- [ ] Verificar CI de la versión final de prioridad antes de cerrar.
