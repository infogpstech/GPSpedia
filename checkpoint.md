## Continuidad — GP-CAT: consumidor de deltas multi-colección (2026-11-14)

**HEAD de código validado:** `9e573f8fb3d5a15f6817405f92f3ffc6d1a98d78`.  
**Rama:** `GPSpedia2.2.5_work`. La rama base `GPSpedia2.2.5` no se modificó.

### Cambio realizado
- `JS/Frontend/offline.js`: el consumidor de feed aplica upsert/delete por ID estable a `cortes`, `tutoriales`, `relay` y `logos`.
- Claves: `id` para Cortes y Logos; `ID` para Tutoriales y Relay, conforme a los mapas de `Services/catalog.js`.
- No se generan IDs artificiales. Si la colección afectada tiene IDs ausentes/duplicados, o el evento corresponde a una colección no soportada, el consumidor solicita reset completo y conserva el snapshot válido previo.
- `JS/Tests/CatalogSnapshotSync.js`: 27/27 PASS; pruebas multi-colección y fallback seguro para filas heredadas sin ID.

### Validación
- GitHub Actions run `43652551434`: SUCCESS; Node.js 22; sintaxis PASS; 98 suites / 1,465 pruebas / 0 fallos.
- CatalogStartupIntegrity 18/18; SessionStartupNavigation 16/16; PWAStartupScenarios 15/15 PASS.
- Un primer intento falló por una aserción que esperaba el texto antiguo del error de Cortes; se corrigió la expectativa y la ejecución posterior aprobó.
- Pages run `43652551224` requiere confirmar su conclusión antes de afirmar despliegue.

### Siguiente trabajo
- Los productores de backend aún publican reset para cambios multi-entidad. Siguiente paso: inspeccionar cada mutación FEEDBACK/ADMIN y emitir snapshots exactos solo después de verificar la fila final y su ID único; comenzar por Tutoriales y Logos.
- PyS permanece separado de `getCatalogData`, usa `getPysData` y caché localStorage; no se debe tratar como una colección del snapshot IndexedDB sin diseñar una persistencia/cursor independiente.
- No se modificaron Apps Script deployments, ScriptProperties, Spreadsheet, Drive, ACL ni datos productivos.


## Continuidad — GP-CAT: upsert exacto de Tutoriales (2026-11-14)

**Commit de código validado:** `4986148291ba7d0add094ad76e90fd9f2bf6897a`.

- `Services/feedback.js`: `addTutorial` y `updateTutorialItem` publican un upsert de `tutoriales` solo después de que la operación responde éxito, se relee la fila por ID y se comprueba unicidad del ID persistente `tut-...`.
- El snapshot conserva los campos del contrato de `Services/catalog.js` y normaliza la imagen a ID de Drive. Si la fila/ID no puede verificarse o falla la publicación, se intenta emitir reset seguro.
- `approveVideo`/`rejectVideo` y mutaciones PyS siguen usando reset porque sus destinos/entidades pueden ser múltiples.
- `JS/Tests/CatalogChangeFeed.mjs`: 15/15 PASS; `CatalogSnapshotSync`: 27/27 PASS.
- GitHub Actions run `43652752655`: SUCCESS; 98 suites / 1,466 pruebas / 0 fallos.
- El primer intento falló por una expresión regular con escapes dobles en el helper de imagen; se corrigió en `4986148` y el CI posterior aprobó.
- Siguiente: upsert exacto para Logos tras alta ADMIN confirmada; después evaluar Relay y operaciones de edición/Video. PyS requiere un cursor/almacén separado y no debe mezclarse con el snapshot de IndexedDB sin una transición específica.
- No se desplegaron Apps Script ni se modificaron Spreadsheet, Drive, ACL, ScriptProperties o datos productivos.


## Continuidad — GP-CAT: upsert exacto de Logos (2026-11-14)

**Commit de código validado:** `f9816e8518ad323133efcb6ce22e3e396c13f0b1`.

- `Services/admin.js`: tras `addLogo` exitoso y finalización de auditoría, se relee la fila por ID numérico y se comprueba que sea única y coincida con marca/URL de respuesta. El productor publica upsert de `logos` usando el ID de Drive normalizado igual que `Services/catalog.js`.
- Si la verificación o publicación exacta falla, intenta reset seguro; las otras operaciones ADMIN conservan reset.
- `JS/Tests/CatalogChangeFeed.mjs`: 16/16 PASS; prueba de publicación exacta de Logo y fallback reset.
- GitHub Actions run `43652869282`: SUCCESS; 98 suites / 1,467 pruebas / 0 fallos.
- Relay: no se identificó un escritor backend para la hoja Relay; los IDs históricos pueden estar ausentes. No se inventó un productor ni se generaron IDs. PyS sigue separado de la instantánea getCatalogData.
- Siguiente: estudiar la consistencia de deltas PyS con un cursor/almacén independiente; luego revisar si Relay tiene alguna ruta real de edición backend antes de habilitar eventos por registro.
- No se desplegaron Apps Script ni se modificaron Spreadsheet, Drive, ACL, ScriptProperties o datos productivos.


## Continuidad — endurecimiento de concurrencia del feed de Tutoriales (2026-11-14)

**Commit de código validado:** `6c3b72e9574067b6fd4202e187da518221498193`.

- La construcción del snapshot final y su publicación de Tutoriales ahora se serializan bajo ScriptLock. Así se evita que un evento atrasado de una edición anterior publique después de una edición concurrente más reciente y deje el cliente con contenido obsoleto.
- El fallback reset también se intenta dentro de la misma sección serializada.
- Prueba contractual ampliada: adquisición y liberación de lock, lectura de fila y publicación protegidas.
- GitHub Actions run `43653060997`: SUCCESS; 98 suites / 1,467 pruebas / 0 fallos; CatalogChangeFeed 16/16 PASS.
- Siguiente: mantener reset para PyS/Relay hasta disponer de persistencia/cursor y escritores backend identificados; no inventar rutas de escritura ni IDs históricos.


## Continuidad — GP-CAT: deltas incrementales de PyS (2026-11-14)

**HEAD de trabajo verificado:** `fa0388dfd4688044c6f7811e906a35cd6c8096ed`.

**Commits de implementación y validación:**
- `3adfaa802f136996e3951415ecdd0795a8ac5a68` — publicación y consumo incremental de PyS.
- `2053f13ad834beea4fa3af1dd8de0fba936ddc1d` — contratos de difusión entre pestañas actualizados.
- `87512cb22437cf31c05802860e788ed2a6c1a303` — suite PyS incorporada al CI.
- `fa0388dfd4688044c6f7811e906a35cd6c8096ed` — rutas del harness corregidas para ejecución desde la raíz.

### Cambio realizado
- `Services/feedback.js`: `addProblem`, `addSolution`, `addPrevention`, `addVehicleToProblem`, `removeVehicleFromProblem` y `updatePysItem` publican upsert de `pys` después de confirmar la mutación y releer una fila única por `id_problem`. La lectura y publicación se serializan bajo ScriptLock; si el snapshot no puede verificarse, se emite reset seguro.
- `JS/Frontend/offline.js`: el consumidor del snapshot principal ignora los eventos `pys` sin forzar una descarga del catálogo general. El cursor global continúa avanzando.
- `JS/Frontend/pys-data.js`: aplica upsert/delete por ID persistente `isue-N` sobre la caché separada de PyS. Si faltan datos/IDs válidos, hay duplicados, el evento no coincide o llega un reset global, solicita la instantánea completa de PyS.
- `JS/Frontend/auth.js`: aplica los deltas PyS antes de confirmar el cursor del catálogo y notifica a las demás pestañas para refrescar su caché independiente.
- No se creó una segunda infraestructura de cursor ni se mezcló PyS con IndexedDB del catálogo principal. No se añadieron controles visibles.

### Validación
- GitHub Actions run `43657720605`: SUCCESS; Node.js 22; sintaxis PASS; **99 suites / 1,484 pruebas / 0 fallos**.
- `PysDataCache`: 15/15 PASS; `CatalogChangeFeed`: 17/17 PASS; `CatalogSnapshotSync`: 28/28 PASS; `CatalogStartupIntegrity`: 18/18 PASS; `SessionStartupNavigation`: 16/16 PASS.
- Se corrigieron dos problemas de pruebas detectados por CI: una expectativa antigua del argumento de difusión y rutas relativas del harness PyS. La ejecución final completa aprobó.
- GitHub Pages run `43657719742` quedó pendiente de confirmar al momento de este checkpoint; no se declara despliegue validado hasta verificar su conclusión.
- La validación de Apps Script/Spreadsheet/Drive reales, sincronización simultánea entre usuarios/dispositivos y latencia de Beta sigue pendiente.

### Siguiente trabajo
- Auditar si existe un escritor backend real para Relay y si dispone de ID persistente verificable; no crear IDs ni productores artificiales.
- Después continuar con las tareas activas restantes y la validación Beta autorizada. No desplegar manualmente Apps Script ni modificar datos productivos.


## Continuidad — auditoría de escritores Relay (2026-11-14)

**HEAD verificado:** `231ac92ca85ec1a34def0085cb7941306635eb28`.

### Hallazgo y decisión
- `Services/catalog.js` únicamente lee la hoja Relay y transforma sus filas al contrato de catálogo mediante `COLS_RELAY`.
- `Services/write.js` lee la hoja Relay para validar las opciones de configuración al crear/editar Cortes; no escribe registros Relay.
- `Services/feedback.js` lee configuraciones Relay asociadas a Cortes; no contiene acciones de alta/edición Relay.
- `Services/admin.js` no expone una acción de alta/edición de registros Relay. El mantenimiento de identificadores permite `freeze_formula` solo cuando conserva un ID válido existente y único; rechaza `fill_missing` para Relay hasta confirmar su formato/escritor. La lectura de imágenes Relay corresponde al escaneo de referencias, no a una mutación de registros.
- No se encontró una acción de frontend/API que escriba filas Relay. Por tanto, no hay un productor legítimo de upsert por registro que se pueda conectar al feed. Se mantiene el reset de las operaciones ADMIN masivas; no se crean IDs, acciones ni botones artificiales.

### Resultado
- GP-CAT-01H: auditoría estática completada. Relay conserva su lectura de catálogo y los IDs existentes; no se habilita publicación por registro sin una ruta de escritura real.
- Siguiente tarea: GP-CAT-01I — registrar la revisión global del feed junto con la caché PyS para evitar que el TTL provoque una descarga completa cuando no hubo cambios.
- La validación de hojas reales/IDs históricos sigue pendiente de una copia Beta autorizada; no se inspeccionaron ni modificaron Spreadsheet/Drive productivos.


## Continuidad — GP-CAT-01I: cursor y frescura de caché PyS (2026-11-14)

**Commit de código:** `779be6f0bbdcc1a7b3ae5788317063ea5d275be9`.

- `JS/Frontend/pys-data.js`: añade `gpsepedia_pys_cache_cursor`, `getPysDataCursor()` y `setPysDataCursor()`. La caché guarda la revisión del feed global que ya aplicó.
- Una caché con cursor válido no descarga `getPysData` completo solo porque venció el TTL de cinco minutos. La sincronización del feed actualiza el cursor y la marca de frescura cuando no hay eventos PyS; si hay eventos, aplica upsert/delete y avanza el cursor. La invalidación explícita (updatedAt=0), la ausencia de caché, un cursor no alineado y los resets siguen forzando reconciliación completa.
- `auth.js` alinea el cursor PyS con el cursor IndexedDB al iniciar, al procesar deltas y al recibir difusión entre pestañas. Aplica el delta antes de confirmar el cursor; ante fallo de persistencia vuelve a snapshot completo.
- `JS/Tests/PysDataCache.js`: 18/18 PASS, incluidos TTL con cursor, invalidación explícita, revisión válida e integración de upsert/delete.
- GitHub Actions run `43658124484`: SUCCESS; Node.js 22; sintaxis PASS; **99 suites / 1,487 pruebas / 0 fallos**.
- GitHub Pages run `43658124316`: SUCCESS para el commit de código.
- No se añadieron controles visibles ni se desplegaron Apps Script. La validación real de sincronización multiusuario, latencia y reconexión sigue pendiente en Beta.
- Siguiente: GP-CAT-01J — revisar productores WRITE y emitir upsert exacto solo donde la fila final pueda reproducirse fielmente con el contrato de `Services/catalog.js`; mantener reset en operaciones multi-fila/IDs.


## Continuidad — GP-CAT-01J: upsert exacto de operaciones WRITE (2026-11-14)

**Commit de código:** `83700aac9854bc625aed100090c18665f7111529`.
**Commit de ajuste de contratos de prueba:** `0e61bf7772f1a992493eb02aba781e23e32aa379`.

- `Services/write.js`: `addOrUpdateCut`, `addSupplementaryInfo` y `addVinToVehicle` publican upsert de Cortes tras confirmar éxito y releer exactamente una fila por ID. El constructor reproduce el contrato de `Services/catalog.js`: mapeo de columnas dinámicas VIN/activaTestigo, normalización de imágenes Drive, normalización YouTube y orden de los tres slots de corte por utilidad.
- La lectura del snapshot y publicación se serializan bajo ScriptLock. Si falta ID, hay duplicados, la fila no coincide o falla la publicación, se intenta reset seguro. Las llamadas WRITE anidadas bajo ADMIN no publican durante la mutación padre.
- `freezeCortesIds` conserva reset porque puede afectar varios IDs/filas.
- `JS/Frontend/offline.js`: después de aplicar deltas de Cortes recalcula `categoryCounts` y `sortedCategories`, evitando filtros desactualizados cuando se crea o cambia la categoría de un vehículo.
- `JS/Tests/CatalogChangeFeed.mjs`: 18/18 PASS; `CatalogSnapshotSync`: 29/29 PASS.
- Primer CI detectó una expectativa antigua que exigía reset para todas las mutaciones WRITE; se actualizó el contrato para exigir upsert exacto en operaciones de una fila y reset para migración masiva.
- GitHub Actions run `43658509818`: SUCCESS; Node.js 22; sintaxis PASS; **99 suites / 1,489 pruebas / 0 fallos**.
- GitHub Pages run `43658509235` pendiente de confirmar en este momento.
- No se desplegaron Apps Script ni se modificaron datos productivos. Beta multiusuario, latencia y validación de las escrituras reales siguen pendientes.
- Siguiente: GP-CAT-01K — revisar el snapshot de `recordLike` y la mutación `suggestYear` en FEEDBACK antes de habilitar más upserts.


## Continuidad — GP-CAT-01K: snapshot FEEDBACK completo para recordLike (2026-11-14)

**Commit de corrección:** `7dcf994477d6cd477df9016ee08b05936c36c393`.
**Commit de contrato de prueba:** `bf4a527f8dd7968bc1c2a001e11d6aef01c16196`.
**Commit de ajuste de expectativa heredada:** `a00a0246f5359aa038b9de3ad05576a010dd2a9a`.

- Hallazgo: el publicador de `recordLike` llamaba `mapRowToObject(row, COLS_CORTES)`, pero esa función no está definida en el servicio FEEDBACK ni en sus dependencias compartidas del repositorio. El error se capturaba y registraba, por lo que el like se confirmaba pero no se publicaba el delta.
- El snapshot anterior también omitía VIN y campos `activaTestigo` dinámicos y no reordenaba los slots después de cambiar su utilidad.
- Corrección: FEEDBACK incorpora su constructor de snapshot de Cortes alineado con `catalog.js`: ID único, encabezados dinámicos VIN/activaTestigo, imágenes Drive y YouTube normalizados, y slots ordenados por utilidad. La publicación se serializa bajo ScriptLock; ante inconsistencia se emite reset seguro.
- `Services/write.js` ajusta el mapeo de activaTestigo para incluir los campos solo si los encabezados existen, igual que el contrato de catálogo.
- `CatalogChangeFeed`: 18/18 PASS; `CatalogSnapshotSync`: 29/29 PASS; `PysDataCache`: 18/18 PASS.
- GitHub Actions run `43658821960`: SUCCESS; Node.js 22; sintaxis PASS; **99 suites / 1,489 pruebas / 0 fallos**.
- GitHub Pages run `43658822214` pendiente de confirmar al momento de este checkpoint.
- Siguiente: GP-CAT-01L — auditar `suggestYear`; conservar reset hasta confirmar si modifica una o varias filas y verificar el snapshot resultante.


## Continuidad — GP-CAT-01L: deltas de ampliación de rango suggestYear (2026-11-14)

**Commit de código:** `e39854e9b9c201e7ae967f3601a67f5d6bbb69b9`.
**Commit de contrato de prueba:** `7fdf73189300db8f08c9b1c2f062cecb6145c473`.

- `handleSuggestYearLocked` modifica la fila Cortes únicamente cuando tres aportantes verificados confirman una ampliación válida y se completa `FeedbackYearApplications`. Los votos previos, sugerencias anónimas, rangos ya cubiertos y respuestas sin aplicación no modifican Cortes.
- FEEDBACK ahora publica upsert exacto solo cuando la respuesta contiene `recovered === false` (aplicación nueva confirmada) o `recovered === true` (recuperación de una aplicación pendiente ya aplicada). Se usa `payload.vehicleId` y el constructor completo de snapshot FEEDBACK. Los demás resultados no publican cambios de catálogo.
- Si no se puede verificar la fila o publicar el snapshot, el helper mantiene reset seguro.
- `CatalogChangeFeed`: 19/19 PASS; `CatalogSnapshotSync`: 29/29 PASS; `PysDataCache`: 18/18 PASS.
- GitHub Actions run `43658998921`: SUCCESS; Node.js 22; sintaxis PASS; **99 suites / 1,490 pruebas / 0 fallos**.
- GitHub Pages run `43658998608` pendiente de confirmar al momento de este checkpoint.
- Siguiente: GP-CAT-01M — auditar `approveVideo`/`rejectVideo`; mantener reset global si pueden modificar varias filas o no existe un identificador único verificable.


## Continuidad — GP-CAT-01M: deltas para aprobación/rechazo de vídeos (2026-11-14)

**Commit de código:** `485b444e9d71f99c29f9896e4d0835a4c7ba7099`.

- `handleApproveVideoUnlocked_` y `handleRejectVideoUnlocked_` ahora devuelven `contentType` y `referenceId` junto al `targetType` confirmado por la operación.
- El publicador FEEDBACK valida que tipo de destino y tipo de contenido coincidan y enruta a un constructor completo de snapshot: Cortes, PyS o Tutoriales. La aprobación/rechazo publica el registro final después de la escritura; si falta ID, el tipo no coincide o falla la verificación, se usa reset seguro.
- La aprobación de Tutoriales incluye la miniatura que se crea/retira junto con el vídeo; el constructor de Tutoriales relee ambos campos.
- Se retiraron approveVideo/rejectVideo del grupo genérico de resets. Las operaciones de aprobación solo actualizan el destino verificado; el estado de Feedbacks permanece fuera del catálogo.
- `CatalogChangeFeed`: 20/20 PASS; `CatalogSnapshotSync`: 29/29 PASS; `PysDataCache`: 18/18 PASS.
- GitHub Actions run `43659142503`: SUCCESS; Node.js 22; sintaxis PASS; **99 suites / 1,491 pruebas / 0 fallos**.
- GitHub Pages run `43659142194` pendiente de confirmar al momento de este checkpoint.
- Siguiente: GP-CAT-01N — auditar operaciones ADMIN de imágenes, separar mutaciones de una fila verificable de reorganizaciones/restauraciones masivas.


## Continuidad — GP-CAT-01N: deltas de edición In-Modal y reemplazo de imágenes ADMIN (2026-11-14)

**Commit de código:** `2accae55b1f34507f5b02adf19b96e023313a5ec`.

- `updateVehicleField` y `uploadAdminImage` modifican un solo vehículo por ID único. Tras respuesta `success`, ADMIN relee la fila final y publica upsert Cortes completo; el payload de la acción aporta el ID porque la respuesta de edición no lo devolvía.
- El constructor usa el mismo contrato que `catalog.js`: VIN y activaTestigo solo si existen encabezados, normalización de imágenes Drive y YouTube y orden de slots por utilidad. La lectura/publicación se serializa bajo ScriptLock; si no se puede verificar, se usa reset.
- `getAdminImageUploadStatus` sigue siendo lectura y no publica eventos. Las acciones con warning, reorganizaciones, restauraciones, reconciliaciones, backups y migraciones conservan reset.
- `CatalogChangeFeed`: 21/21 PASS; `CatalogSnapshotSync`: 29/29 PASS; `PysDataCache`: 18/18 PASS.
- GitHub Actions run `43659408356`: SUCCESS; Node.js 22; sintaxis PASS; **99 suites / 1,492 pruebas / 0 fallos**.
- GitHub Pages run `43659407831` pendiente de confirmar al momento de este checkpoint.
- Siguiente: GP-CAT-01O — auditar acciones de reemplazo/recuperación de imágenes para separar mutaciones de una fila de cambios que solo afectan Drive/ledger.


## Continuidad — GP-CAT-01O: auditoría de recuperación y movimientos de imágenes (2026-11-14)

**Commit de código:** `5cc19aced2da93599128f75fab346a4e5e79b008`.

- `recoverReplacedImage` puede restaurar una imagen histórica en un campo activo de una fila Cortes. La respuesta ahora informa `vehicleId`, `fieldName` y `catalogChanged`; publica upsert exacto solo si la referencia activa cambió. Si el registro ya estaba activo o el ID/fila no se verifica, no emite un delta; si falla el snapshot, el helper usa reset.
- `deleteReplacedImage` envía a papelera una imagen histórica/sin uso y actualiza el ledger; valida que no existan referencias activas y no modifica la hoja Cortes. Se elimina del grupo de escritores del catálogo.
- `restoreReplacedImageFromTrash` restaura el archivo y el estado del historial, pero explícitamente no modifica referencias del Spreadsheet; no emite evento.
- `moveReplacedImage` mueve un archivo sin referencias activas y actualiza metadatos del ledger, no el catálogo; no emite evento.
- Las operaciones masivas (restoreAllTrashedImages, normalizeImages, organizePrimaryVehicleImages, applyCortesImageReconciliation, restoreDatabase y migraciones) conservan reset.
- `CatalogChangeFeed`: 22/22 PASS; `CatalogSnapshotSync`: 29/29 PASS; `PysDataCache`: 18/18 PASS.
- GitHub Actions run `43659554751`: SUCCESS; Node.js 22; sintaxis PASS; **99 suites / 1,493 pruebas / 0 fallos**.
- GitHub Pages run `43659554417` pendiente de confirmar al momento de este checkpoint.
- Siguiente: GP-CAT-01P — auditar las operaciones masivas y confirmar que los resets no se disparan desde acciones que solo leen o modifican metadatos fuera del catálogo.


## Continuidad — GP-CAT-01P: exclusión de acciones ADMIN Drive/ledger-only (2026-11-14)

**Commit de código:** `b19f838c7982aa13ca9097d608ffa68e863abad7`.

- `organizePrimaryVehicleImages` mueve/renombra el mismo archivo Drive y normaliza carpetas, pero no escribe referencias de Cortes ni cambia el ID del archivo. Se retira de `catalogWriters`.
- `reconcilePendingImageUploads` actualiza únicamente `ImageUploadLedger` y metadatos/nombres/descripciones Drive; no modifica filas Cortes. Se retira de `catalogWriters`.
- `restoreAllTrashedImages` ya estaba excluida del grupo de escritores de catálogo; su operación restaura disponibilidad de archivos sin cambiar las celdas de referencia.
- `normalizeImages` puede duplicar archivos compartidos y actualizar URLs de varias filas; conserva reset. `applyCortesImageReconciliation` escribe varias celdas/filas; conserva reset. Restauraciones de base, reorganización y migraciones de IDs también conservan reset.
- `CatalogChangeFeed`: 23/23 PASS; `CatalogSnapshotSync`: 29/29 PASS; `PysDataCache`: 18/18 PASS.
- GitHub Actions run `43659723527`: SUCCESS; Node.js 22; sintaxis PASS; **99 suites / 1,494 pruebas / 0 fallos**.
- GitHub Pages run `43659722781` pendiente de confirmar al momento de este checkpoint.
- Siguiente: GP-CAT-01Q — convertir la reconciliación confirmada de imágenes Cortes (máximo 10 asignaciones) en upserts agrupados por vehículo, con reset de recuperación si cualquier snapshot falla.


## Continuidad — GP-CAT-01Q: upserts agrupados para reconciliación de imágenes Cortes (2026-11-14)

**Commit de código:** `2348dae3a3785e392f9944ebbddc662c10fc96ae`.
**Commit de corrección de prueba:** `956ba22ceb12f3ae4fbd8a79e6cde8b0caf98246`.

- `handleApplyCortesImageReconciliation_` devuelve `appliedVehicleIds` únicos derivados del manifiesto que ya pasó auditoría, preview, validación de digest, verificación de celdas y read-back.
- `publishAdminCortesCatalogChanges_` adquiere ScriptLock una sola vez, deduplica IDs, construye y verifica todos los snapshots antes de publicar el primer evento y emite un upsert por vehículo. Si falla cualquier snapshot/publicación, emite reset para recuperar el estado completo, incluso si algún upsert ya se publicó.
- La operación sigue limitada a 10 propuestas aprobadas por ejecución; los cambios en varios campos del mismo vehículo generan un solo upsert.
- Primer CI detectó comillas anidadas incorrectas en una aserción estática de prueba; se corrigió el test sin cambiar el código funcional.
- `CatalogChangeFeed`: 24/24 PASS; `CatalogSnapshotSync`: 29/29 PASS; `PysDataCache`: 18/18 PASS.
- GitHub Actions run `43659982658`: SUCCESS; Node.js 22; sintaxis PASS; **99 suites / 1,495 pruebas / 0 fallos**.
- GitHub Pages run `43659982190` pendiente de confirmar al momento de este checkpoint.
- Siguiente: GP-CAT-01R — revisar `normalizeImages` y publicar deltas por cada vehículo con referencias efectivamente reescritas; conservar reset si el lote no puede enumerarse íntegramente.


## Continuidad — GP-CAT-01R: deltas para lotes de normalización de imágenes (2026-11-14)

**Commit de implementación:** `3f629c8133edcb7f09ff720a745be534cc8ea4b0`.
**Commit de salvaguarda de IDs:** `504599b096ad7029563dd96f4071b6e5b93fd000`.

- `handleNormalizeImages` solo reescribe una celda de Cortes cuando debe separar una referencia de imagen compartida creando una copia independiente. Ahora registra el ID del vehículo inmediatamente después de cada `setValue`, deduplica por fila y devuelve `changedVehicleIds`.
- Si la fila modificada no tiene ID, marca `changedRowsWithoutId` y el publicador emite reset. Si la acción devuelve warning/error, el publicador también emite reset para cubrir escrituras parciales. Si el lote solo renombra/mueve archivos conservando IDs y celdas, no publica evento.
- En lotes exitosos, se construyen todos los snapshots antes del primer evento y se publica un upsert por vehículo con el helper ADMIN agrupado.
- `CatalogChangeFeed`: 25/25 PASS; `CatalogSnapshotSync`: 29/29 PASS; `PysDataCache`: 18/18 PASS.
- GitHub Actions run `43660231720`: SUCCESS; Node.js 22; sintaxis PASS; **99 suites / 1,496 pruebas / 0 fallos**.
- GitHub Pages run `43660231534` pendiente de confirmar al momento de este checkpoint.
- Siguiente: GP-CAT-01S — auditar `freezeCortesIds`, `restoreDatabase`, `reorganizeDatabase`, `migrateIdentifiers` y `rollbackIdentifiers`; mantener reset solo donde el alcance multi-fila/IDs lo justifique.


## Continuidad — GP-CAT-01S: reset de mantenimiento WRITE y operaciones multi-fila (2026-11-14)

**Commit de código:** `bb28f106d9e1d98bb83c67689ccb8da6b57bda85`.
**Commit de contrato de prueba:** `8ee4bfee516298f62ab3c03c7a643b2e2195a373`.

- Auditoría de `handleFreezeCortesIds`: construye un plan para todas las filas, convierte fórmulas heredadas a valores estáticos y verifica después que cada valor de ID sea idéntico al valor previsto y que no queden fórmulas. No cambia IDs ni otros campos del snapshot; por tanto, se elimina de `catalogWriters` y no publica reset.
- `allocateVehicleId` tampoco publica evento porque solo reserva/actualiza el contador central, sin insertar ni modificar un registro Cortes.
- `restoreDatabase`, `reorganizeDatabase`, `migrateIdentifiers` y `rollbackIdentifiers` conservan reset: pueden restaurar/reordenar varias colecciones o modificar múltiples IDs; no se puede representar con un único upsert por registro.
- Primer CI detectó una expectativa de prueba antigua que aún incluía freezeCortesIds en catalogWriters; se actualizó el contrato. La prueba específica confirma que el plan compara valores antes/después y no altera el snapshot.
- `CatalogChangeFeed`: 26/26 PASS; `CatalogSnapshotSync`: 29/29 PASS; `PysDataCache`: 18/18 PASS.
- GitHub Actions run `43660486963`: SUCCESS; Node.js 22; sintaxis PASS; **99 suites / 1,497 pruebas / 0 fallos**.
- GitHub Pages run `43660485941`: SUCCESS.
- Siguiente: GP-CAT-01T — validación Beta externa de concurrencia multiusuario, propagación entre pestañas/dispositivos, latencia y reconexión. No se simula ni se declara aprobada sin el entorno desplegado.


## Verificación integral y continuidad GP-CAT-01T — 2026-11-14/15

**Rama verificada:** `GPSpedia2.2.5_work`.
**HEAD verificado antes del registro:** `cb2ecf29c91af7b5dec5074851ce6c022401ed91`.
**Rama base protegida:** `GPSpedia2.2.5` en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; sin modificaciones realizadas.

- Se volvió a leer íntegramente `NORMAS_DESAROLLO.md`; se consultaron README, contexto operativo, checkpoint, tareas y registros activos pertinentes.
- GitHub Actions en el HEAD actual: run `43660678226` SUCCESS. Node.js 22; comprobación `node --check` de módulos configurados PASS; **99 suites / 1,497 pruebas aprobadas / 0 fallos**.
- Suites destacadas: `IdentifierMigration` 10/10, `PysDataCache` 18/18, `CatalogChangeFeed` 26/26, `CatalogSnapshotSync` 29/29, `InboxConversations` 30/30 y coordinación compartida/concurrencia/leases ejecutada por el runner integral.
- GitHub Pages run `43660677054`: SUCCESS para el mismo HEAD.
- La verificación local/integral está aprobada. No se ejecutaron pruebas contra Apps Script, Spreadsheet, Drive, OAuth, YouTube ni dispositivos/navegadores Beta; tampoco se modificaron deployments, ScriptProperties ni datos productivos.
- GP-CAT-01T: se añadió `AUG-157` a `lista_beta_parte2.txt`. Incluye preparación obligatoria de repositorio/rama/árbol limpio y pruebas de arranque cache-first, feed sin novedades, propagación entre usuarios/pestañas/dispositivos, productores, deltas/reset, paginación, cursor, offline/reconexión, estados abiertos y autorización.
- Estado GP-CAT-01T: **COMPLETADA CON VALIDACIÓN DIFERIDA A BETA** en cuanto a implementación y preparación local. La ejecución real de AUG-157 queda pendiente de proyectos/deployments Beta compatibles, Spreadsheet/Drive aislados y cuentas/dispositivos de prueba. No se simula ni se atribuye aprobación a CI.
- Restricción vigente: GP-INBOX-04B..04D requieren controles/acciones visibles nuevos en parte de su alcance; la instrucción del usuario de no añadir controles visibles sin autorización sigue vigente. No se implementaron ni se alteró su alcance.
- Siguiente paso permitido: ejecutar AUG-157 en Beta aislada cuando exista el entorno compatible; registrar PASS/FAIL/NO EJECUTADA por caso. No desplegar a producción.


## Continuidad — centralización de fuentes Apps Script en JS/Services (2026-11-15)

**Estado al registrar:** reubicación y referencias incluidas en el commit de esta iteración; CI pendiente.

- HEAD de partida verificado: `05f4674067b36be995599f4b9b15ae2dad1decaa` (`docs(beta): prepare incremental catalog field validation`).
- Se corrigió la discrepancia entre el registro del plan y el árbol real: los diez archivos fuente Apps Script se trasladan de `Services/` a `JS/Services/` sin alterar su contenido.
- Se actualizaron las referencias del runner, suites Node.js, workflow, README y guía de coordinación.
- `service-worker.js` permanece en raíz por alcance PWA. `Services/` conserva documentación/auxiliares no-JS. No se cambian lógica, contratos, endpoints, deployments ni datos.
- El cierre depende de GitHub Actions y de comprobar que no queden referencias activas a rutas anteriores.
- Rama base protegida: `GPSpedia2.2.5`; no se realizaron cambios en ella.


## Cierre — centralización de servicios JavaScript (2026-11-15)

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Commit de reubicación: `a878415f2ea0f1d0c3116e09e9a872292d0bb57e`; commit de corrección de rutas residuales en `TutorialIntegrity.js` y `TermsAcceptance.js`: `34ae0fb64e28ec88da7da406b81e732842207158`.
- GitHub Actions run `43664165206`: SUCCESS; Node.js 22; sintaxis PASS; **99 suites / 1,497 pruebas / 0 fallos**.
- GitHub Pages run `43664164792`: SUCCESS para el mismo HEAD.
- Árbol verificado: diez fuentes en `JS/Services/`, cero fuentes JavaScript en `Services/`; todos los JS/MJS activos bajo `JS/`, excepto `service-worker.js` en raíz. `Services/` conserva documentos/auxiliares no-JS; HTML e imágenes activas están centralizados en `HTML/` e `Images/`.
- La rotación del checkpoint conserva el historial previo en `Checkpoint_Archive/checkpoint_legacy_parte_001.md`, con manifiesto y reconstrucción exacta comprobada.
- No se cambiaron lógica de negocio, contratos, endpoints, deployments, ScriptProperties, Spreadsheet, Drive ni datos productivos.
- Pendiente de Beta: copiar/verificar manualmente las fuentes en proyectos Apps Script aislados y validar ciclo PWA/Service Worker en navegadores/dispositivos reales. Estas pruebas no se simularon.


## Continuidad — GP-INBOX paginación estable (2026-11-15)

**Estado:** corrección local preparada para publicar y validar CI.

- HEAD de partida: `35d9b4c160191989b7d6a4b1137d90c961ba1f57` en `GPSpedia2.2.5_work`; rama base `GPSpedia2.2.5` sin cambios.
- Hallazgo: los cursores numéricos por offset en conversaciones e historial no eran estables ante mensajes nuevos/reordenamiento; podían repetir u omitir registros entre páginas.
- Cambio preparado: conversaciones usan cursor compuesto por fecha de orden + conversationId; mensajes usan cursor por messageId. UI conserva el cursor opaco. No se añadieron controles visibles ni se modificaron contratos de escritura, roles o datos.
- Pruebas nuevas: concurrencia de conversaciones con nueva actividad/archivo del elemento anterior; mensaje nuevo entre páginas históricas; contrato UI que impide convertir el cursor a número.
- Siguiente validación: CI completo Node.js, revisión del diff y prueba de regresión Inbox. Beta de servicios reales continúa diferida; no se ejecutaron despliegues ni accesos a Spreadsheet/Drive.


## Cierre — GP-INBOX paginación estable (2026-11-15)

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Commit de implementación y pruebas: `27239def189f8eee818b359f2c95fcfbfe313db5`.
- GitHub Actions Node.js 22 run `43665177415`: SUCCESS; sintaxis PASS; 99 suites / 1,500 pruebas / 0 fallos. InboxConversations 32/32 y InboxUi 20/20 PASS.
- GitHub Pages run `43665176707`: SUCCESS.
- La paginación de conversaciones usa clave de orden timestamp + ID; el historial usa ID de mensaje ancla. UI conserva cursores opacos. Pruebas reproducen mensajes nuevos entre páginas, actividad nueva y archivo del elemento previo.
- No se añadieron controles visibles, no se cambiaron permisos ni se ejecutaron despliegues o accesos a datos productivos.
- Pendiente Beta: validar lecturas concurrentes, orden temporal y paginación con Spreadsheet/Coordinator aislados y cuentas de prueba. GP-INBOX-04B..04D permanecen abiertas en sus funcionalidades restantes.


## Continuidad — GP-INBOX consistencia de reintentos idempotentes (2026-11-15)

**HEAD de partida:** `faba35ad96df57496be14718f844ffc7969a3aef` en `GPSpedia2.2.5_work`.
**Estado:** corrección preparada; publicación y CI pendientes.

- Hallazgo: dos mensajes pueden compartir timestamp de milisegundo. El helper del resumen comparaba solo la fecha y admitía igualdad, de modo que un replay de un mensaje anterior podía sustituir al último mensaje y volver a incrementar el contador.
- Cambio preparado: `inboxUpdateConversationForMessage_` compara índices en el orden de inserción persistido bajo ScriptLock, reconstruye el contador desde los mensajes de la conversación y repara el resumen desde el último mensaje guardado cuando el ID previo ya no existe.
- Prueba añadida: tres mensajes con timestamp igual y reintentos de la creación inicial y de una respuesta intermedia; verifica que el último ID, preview y contador permanezcan estables.
- No se modifican roles, endpoints, controles visibles, deployments ni datos externos.
- Próximo paso: revisar el diff, ejecutar CI Node.js 22 y Pages, corregir fallos locales y verificar el HEAD remoto y la rama base.


## Corrección de llamada en GP-INBOX idempotencia (2026-11-15)

- Commit inicial de implementación: `4f5a4dfe73333027d157fdd7505514ffc6ae7b11`.
- CI Node.js 22 run `43672294645`: sintaxis PASS; la suite integral detectó `ReferenceError: messageRows is not defined` en `handleSendInboxMessage`, porque ese flujo denomina `messages` al arreglo de filas. El resto de suites ejecutadas antes del fallo pasó; la regresión nueva aún no llegó a ejecutarse.
- Corrección preparada: la llamada de `handleSendInboxMessage` pasa su arreglo `messages`; la llamada de creación conserva `messageRows`. Se repetirá CI y se actualizará este registro con el resultado real.


## Cierre local — GP-INBOX consistencia del resumen en reintentos idempotentes (2026-11-15)

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Commits de implementación/corrección: `4f5a4dfe73333027d157fdd7505514ffc6ae7b11` y `826725f9bf93aba171357950849ec4ed6d73fc81`.
- El primer CI detectó y permitió corregir una referencia de variable errónea en el handler de envío. El CI posterior aprobó: run `43672378358`, Node.js 22, sintaxis PASS, **99 suites / 1,501 pruebas / 0 fallos**. `InboxConversations` 33/33 PASS; la regresión de timestamps iguales y replay se ejecutó correctamente.
- GitHub Pages build run `43672377873`: build PASS; deployment se encontraba en curso al momento de este registro, por lo que no se declara completado todavía.
- Se corrigió la comparación por timestamp para que el resumen siga el orden de inserción serializado por ScriptLock y el contador se derive de las filas persistidas.
- No se añadieron controles visibles, endpoints, permisos ni cambios externos. La validación con Spreadsheet/Coordinator reales permanece diferida a Beta.
- La tarea mayor GP-INBOX-04B sigue EN PROGRESO por las operaciones masivas y controles de interfaz diferidos; esta subcorrección interna sí queda cerrada localmente.


## Verificación final de publicación — GP-INBOX reintentos idempotentes (2026-11-15)

- HEAD de implementación y registros: `7fb110c6979ac0d0d16fd526734872eb41414da8` en `GPSpedia2.2.5_work`.
- CI Node.js 22 run `43672479275`: SUCCESS; sintaxis PASS; **99 suites / 1,501 pruebas / 0 fallos**. `InboxConversations` 33/33 PASS, incluida la regresión de timestamps iguales y replay.
- GitHub Pages run `43672478619`: build, reporte y deploy SUCCESS.
- Rama base `GPSpedia2.2.5` verificada en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no se modificó.
- No se ejecutaron pruebas contra Apps Script/Spreadsheet reales ni se modificaron deployments, ScriptProperties o datos externos. La prueba Beta permanece diferida.


## Continuidad — restauración de cobertura Inbox AUG-116 (2026-11-15)

**Commit de pruebas:** c15c1235b4686783ba4a152410ff859274b532f5 (test(inbox): restore cache pagination suite in CI).

- Se detectó que JS/Tests/InboxCachePagination.js no estaba conectado al runner integral y conservaba rutas anteriores a la centralización de JS/Frontend/ y JS/Services/.
- Se corrigieron las rutas de inboxPageCache.js, ui.js y feedback.js; la raíz del repositorio ahora se resuelve desde import.meta.url, sin depender del directorio desde el que se ejecute Node.
- Se incorporó la suite al grupo INTEGRATION de JS/Tests/RunServiceTests.mjs.
- La suite añadida aprobó: caché 5/5, paginación 4/4 y contratos UI 5/5. CI Node.js 22 run 43673118833: SUCCESS; sintaxis PASS; **100 suites / 1,515 pruebas / 0 fallos**.
- GitHub Pages run 43673118102: build, reporte y deploy SUCCESS para este HEAD.
- No se modificó código funcional, interfaz, permisos, endpoints ni datos externos. No se ejecutaron pruebas Apps Script/Spreadsheet reales; continúan diferidas a Beta.
- Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin modificaciones.
- Continuidad: la cobertura local de caché/paginación queda integrada. GP-INBOX-04B..04D siguen abiertas para funciones masivas y controles visibles sujetos a autorización; continuar solo con mejoras internas que no amplíen la interfaz.


## Cierre — GP-INBOX validación de cursores y desempate estable (2026-11-15)

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Commit de pruebas inicial: `c5751afdc3ffcd764fdfdf0b67fef1ecc6e3a070`; ajuste del aislamiento de fixture: `d634ec453b0e92ae5dfe4f700c676e78e3370205`; corrección final de fixture: `26eb353d3e908ad9e6d77ccecbd9248fc0ffb982`.
- `JS/Tests/InboxConversations.mjs`: se agregaron pruebas para rechazar cursores inválidos en bandeja e historial, rechazar un cursor ancla cuyo mensaje expiró y mantener paginación sin duplicados cuando dos conversaciones comparten timestamp, usando ID como desempate.
- La primera ejecución CI falló porque el caso nuevo superó el límite de creación de mensajes del fixture. El primer aislamiento tocó también la fila de encabezados y produjo un error de esquema; se corrigió limitando la antigüedad a filas de datos y preservando encabezados.
- CI Node.js 22 run `43674775675`: SUCCESS; sintaxis PASS; **100 suites / 1,518 pruebas / 0 fallos**. `InboxConversations` 36/36 PASS, incluidas las tres pruebas nuevas.
- GitHub Pages run `43674775262`: build, reporte y deploy SUCCESS para el mismo HEAD.
- No se modificó código de producción, UI, permisos, endpoints, deployments ni datos externos. La validación con Spreadsheet/Coordinator real y usuarios/dispositivos permanece diferida a Beta.
- HEAD de trabajo: `26eb353d3e908ad9e6d77ccecbd9248fc0ffb982`; rama base `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones.
- GP-INBOX-04B..04D permanecen abiertas para sus funcionalidades mayores; continuar únicamente con mejoras internas que no agreguen controles visibles sin autorización.
