# Continuidad — correcciones PWA, IndexedDB y diagnóstico Coordinator (2026-11-15)

**Rama:** `GPSpedia2.2.5_work`  
**HEAD de código validado:** `c982ade64442bcc35686d5a22207dd8c25153ee0`  
**Rama base:** `GPSpedia2.2.5` — `d9acc68d889985c2e2f42fe3a02e502efc86ead1` (sin cambios).

## Resultado
- `index.html`: añadido `mobile-web-app-capable=yes`; se conserva `apple-mobile-web-app-capable=yes` para Safari.
- `JS/Frontend/offline.js`: `initDB` conserva la promesa/conexión abierta hasta `versionchange` (antes la limpiaba también tras éxito, provocando aperturas repetidas); timeout de apertura ampliado de 5 a 10 s; backoff compartido de 15 s tras error/bloqueo. La purga/lectura de miniaturas es silenciosa y la caché opcional se omite durante indisponibilidad. No cambia el esquema ni bloquea imágenes remotas.
- FEEDBACK/Coordinator: diagnóstico confirmado en `Coordinator.js/authenticate_`. El secreto FEEDBACK del servicio debe coincidir con `GPSpedia_COORDINATOR_SECRET_FEEDBACK` del coordinador del mismo entorno. `coordinatorConfigured` no verifica igualdad. El frontend conserva fallback a snapshot completo; los deltas remotos requieren cotejo privado de ScriptProperties/deployment en Beta. No se debilitó la autenticación.

## Validación local/CI
- GitHub Actions Node.js 22 run `43765191870`, HEAD `c982ade64442bcc35686d5a22207dd8c25153ee0`: **SUCCESS; 103 suites / 1,604 pruebas / 0 fallos**.
- `IndexedDBTransactions`: 45/45 PASS; `SessionStartupNavigation`: 17/17 PASS; sintaxis de módulos modificados PASS.
- Durante la activación de la suite IndexedDB se encontraron y corrigieron defectos del propio harness (ruta de importación incorrecta, prueba async sin await y expectativas de nombres de error) y un defecto real: el estado de apertura se borraba también tras éxito. La repetición final aprobó.
- GitHub Pages run `43765191755`: build y reporte PASS; despliegue en progreso al registrar este checkpoint.
- Sin despliegues Apps Script, cambios en ScriptProperties/endpoints/secretos, ni modificaciones de Spreadsheet/Drive/datos productivos.

## Pendiente Beta
Cotejar en privado `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET` de FEEDBACK con el deployment y `GPSpedia_COORDINATOR_SECRET_FEEDBACK` del coordinador del mismo entorno. Después comprobar el feed incremental con una sesión Beta. No publicar los secretos.

---

# Continuidad — errores PWA, Coordinator e IndexedDB (2026-11-15)

**Rama:** `GPSpedia2.2.5_work`  
**HEAD de código:** `8d71b310a389a18fb10ec87ae2c4f71d5a033fcd`  
**Rama base:** `GPSpedia2.2.5` — `d9acc68d889985c2e2f42fe3a02e502efc86ead1` (sin cambios).

## Resultado de esta iteración
- Se añadió `mobile-web-app-capable=yes`, conservando la etiqueta Apple para Safari.
- IndexedDB: backoff compartido de 15 s tras fallo/bloqueo; limpieza de miniaturas silenciosa; compresión y lectura de miniaturas se omiten si IndexedDB no está disponible. No se modifica el esquema ni se bloquea la imagen remota.
- FEEDBACK/Coordinator: diagnóstico confirmado en `Coordinator.js/authenticate_`. Se compara el servicio y el secreto FEEDBACK del proyecto cliente contra `GPSpedia_COORDINATOR_SECRET_FEEDBACK` del coordinador. `coordinatorConfigured` no verifica igualdad. Requiere cotejo privado de ScriptProperties y deployment FEEDBACK/Coordinator en Beta; no se debilita autenticación.
- El arranque captura el fallo del cursor/feed y cae a snapshot completo; puede cargar catálogo sin deltas. La sincronización incremental remota no se considera reparada hasta validar la configuración.

## Validación
- Regresiones añadidas en `JS/Tests/IndexedDBTransactions.js` para backoff y compresión concurrente; `SessionStartupNavigation.mjs` comprueba metadatos PWA. Suite IndexedDB integrada en `RunServiceTests.mjs`.
- CI pendiente de verificar tras el commit.
- Sin despliegues Apps Script, cambios en ScriptProperties/endpoints/secretos, ni modificaciones de Spreadsheet/Drive/datos productivos.

## Siguiente acción
Verificar CI y corregir fallos locales. En Beta comparar en privado `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET` de FEEDBACK con el deployment y `GPSpedia_COORDINATOR_SECRET_FEEDBACK` del coordinador del mismo entorno. No publicar los valores.

---

# Continuidad — corrección HMAC-SHA256 de PBKDF2 (2026-11-15)

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- HEAD de código: `51a24d0a606b578520a948987cf25757839cf376`; sincronización de fixture AUTH: `4dd79e767bb0aa024e897b572e1844a640cdaf11`.
- Se corrigió la incompatibilidad de tipo en `Utilities.computeHmacSha256Signature`: PBKDF2 necesita bloques binarios, mientras que la llamada anterior entregaba arreglos JavaScript `number[]` a una firma que no los admite.
- AUTH y USERS ahora calculan SHA-256/HMAC-SHA256 sobre bytes con helpers binarios compatibles, preservando UTF-8 para la contraseña y los bytes exactos del salt, el contador y los bloques intermedios. Se conserva PBKDF2-HMAC-SHA256, 12,000 iteraciones, salt aleatorio, formato almacenado y flujo de login; no se ejecutaron migraciones.
- Sincronizadas las copias `JS/Tests/Auth.js` y `JS/Tests/users.js` con sus servicios.
- CI Node.js 22 run `43763589080`, HEAD `4dd79e767bb0aa024e897b572e1844a640cdaf11`: **SUCCESS; 102 suites / 1,558 pruebas / 0 fallos**. `PasswordHashMigration` 18/18 PASS, incluyendo vector PBKDF2 de referencia Node.js, compatibilidad cruzada AUTH/USERS y verificación de hashes correctos/incorrectos. Los pasos de verificación de rama y sintaxis del workflow también aprobaron.
- Un intento intermedio quedó registrado en el historial: el primer CI detectó que la copia de prueba AUTH no estaba sincronizada. Se corrigió la copia y se repitió la suite completa; la ejecución final aprobó.
- No se desplegaron servicios Apps Script ni se modificaron credenciales, hojas, propiedades o datos productivos.
- **Pendiente de Beta:** ejecutar creación/verificación de contraseña en el runtime real de Apps Script y medir la latencia efectiva del KDF con el deployment autorizado. No cambiar el coste ni desplegar durante esta tarea.

---

# ESTADO ACTUAL — GPSpedia (2026-11-15)

**Rama de trabajo:** `GPSpedia2.2.5_work`  
**HEAD de código validado:** `7a58da9a012cd12084f2de3bfb729994f296729b`  
**HEAD documental antes de esta actualización:** `aabf3e98978852dd4718dbb9ad541e93742f1187`  
**Rama base protegida:** `GPSpedia2.2.5` — `d9acc68d889985c2e2f42fe3a02e502efc86ead1` (sin cambios).

## Resultado actual
- CI Node.js 22 run `43753616255`: **SUCCESS; 100 suites / 1,544 pruebas / 0 fallos**. `InboxUi` 22/22.
- P1 sesión central y compatibilidad de hashes: implementación local y CI completados; Beta pendiente. Hashes AUTH/USERS PBKDF2-HMAC-SHA256, salt aleatorio, 12,000 iteraciones. Sin complejidad adicional ni incremento del coste de login.
- GP-INBOX-04B: backend de marcar no leído y ocultación individual, idempotencia, auditoría y preservación del historial del otro participante. La hoja `InboxConversationFlags` se crea de forma diferida.
- GP-INBOX-04C: `reportProblem` como ticket con categoría/asunto/descripción/respuesta/estado; `getMyProblemReports` devuelve solo tickets del actor autenticado y pagina por cursor estable `reportId`.
- GP-INBOX-04D: contratos locales RBAC, accesibilidad estructural y regresión; no se añadieron controles visibles. Historial propio en UI y selección múltiple siguen diferidos.
- GP-CAT-01, GP-PWA-02, GP-DATA, GP-IMG-DATA, GP-DEV y GP-ADMIN: implementación/preparación local completada según tareas; validaciones reales de Beta pendientes.
- Se añadió protocolo GP-INBOX-04B/04C/04D a `lista_beta_parte2.txt` con preflight seguro, cuentas Beta y casos de privacidad, tickets, RBAC y accesibilidad.

## Límites vigentes
- No desplegar Apps Script, no cambiar ScriptProperties, Spreadsheet, Drive, ACL ni datos productivos sin autorización expresa.
- Las pruebas que requieren deployments, Spreadsheet/Drive Beta, cuentas o dispositivos reales permanecen **PENDIENTES**, no se simulan ni se declaran PASS.
- No añadir botones, pestañas, paneles ni acciones visibles nuevas sin autorización.
- La rama base `GPSpedia2.2.5` está protegida y no se modifica.

## Siguiente paso
No quedan tareas locales independientes de Inbox dentro del alcance autorizado. Continuar únicamente con auditorías locales que no requieran controles visibles nuevos; para cerrar las tareas de campo se necesita autorización para desplegar versiones compatibles en Beta y ejecutar el protocolo `lista_beta_parte2.txt`.

---

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


## Adenda — GP-INBOX paginación del historial con timestamps iguales (2026-11-15)

- Se amplió la regresión de idempotencia para recorrer, con pageSize=1, un historial de tres mensajes que comparten timestamp. Se comprueba el orden más reciente a más antiguo, cursores consecutivos sin repetición y finalización sin cursor siguiente.
- CI Node.js 22 run `43675102668`: SUCCESS; 100 suites / 1,518 pruebas / 0 fallos; `InboxConversations` 36/36 PASS.
- GitHub Pages run `43675101929`: build, reporte y deploy SUCCESS.
- HEAD de código: `843269309f01d7c78a89b6a6fd29c7d57baa11a1`; HEAD documental previo: `bf850349b9e965e531446f76e876cfc42b622bad`. Base intacta en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


## Cierre — GP-INBOX orden canónico del historial (2026-11-15)

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Hallazgo: `handleGetInboxMessages` ordenaba por timestamp mientras el resumen, los contadores de no leídos y `handleMarkInboxRead` usaban el orden de inserción serializado bajo ScriptLock. Un ajuste/reversa del reloj podía mostrar mensajes en un orden distinto al que determina la lectura.
- Corrección en `JS/Services/InboxConversations.js`: el historial conserva el orden de inserción persistido, que es la secuencia canónica de escritura bajo el lock; los cursores por ID continúan anclados al mensaje más antiguo de cada página.
- Regresión en `JS/Tests/InboxConversations.mjs`: tres mensajes insertados en orden normal reciben timestamps deliberadamente descendentes; se verifica paginación de más reciente a más antiguo por inserción, cursores sin duplicados y coherencia con marcar como leído.
- CI Node.js 22 run `43676078785`: SUCCESS; sintaxis PASS; **100 suites / 1,519 pruebas / 0 fallos**; `InboxConversations` 37/37 PASS.
- GitHub Pages run `43676078270`: build, reporte y deploy SUCCESS.
- Commit de código: `7fbdd3a4ffb857b7db91414e9f72c68f3c97d8ec`. Rama de trabajo verificada; rama base `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Sin cambios de UI, endpoints, permisos, esquema de hojas, deployments, ScriptProperties ni datos externos. Validación con Spreadsheet/Coordinator real continúa diferida a Beta. GP-INBOX-04B..04D permanecen abiertas en el alcance funcional mayor.


## Adenda — GP-INBOX autorización de mutaciones por participante (2026-11-15)

- Se añadió cobertura explícita para que un tercero ajeno a una conversación no pueda responder ni cambiar su marcador de lectura.
- La regresión comprueba además que los intentos rechazados no agregan mensajes ni crean/modifican estados del participante.
- CI Node.js 22 run `43676278019`: SUCCESS; sintaxis PASS; **100 suites / 1,520 pruebas / 0 fallos**; `InboxConversations` 38/38 PASS.
- GitHub Pages run `43676277745`: build, reporte y deploy SUCCESS.
- Commit de pruebas: `eb1d9d1b2469801663cb8424f7bf0a246acfe4b6`. No se modificó código funcional, interfaz ni permisos; la validación de integración real sigue diferida a Beta.


## Continuidad — actor autenticado reutilizado en Inbox (2026-11-14)

**HEAD remoto de partida:** `4c6a4aadb73500351af382e28206085863dc4bf9` en `GPSpedia2.2.5_work`. La rama base `GPSpedia2.2.5` permanece sin cambios.

- `JS/Services/feedback.js`: el dispatcher valida la solicitud y adjunta el actor verificado en `__feedbackActor` después de expandir el payload no confiable.
- `JS/Services/InboxConversations.js`: el actor del dispatcher se reutiliza en los handlers, evitando una segunda llamada a `assertFeedbackSession` y una segunda lectura/touch de sesión dentro de la misma operación. El fallback de validación sigue disponible para invocaciones internas aisladas.
- `JS/Tests/InboxConversations.mjs`: nueva prueba de que el actor ya autenticado no vuelve a disparar la validación de sesión.
- `JS/Tests/InboxRoleContract.js`: contrato de que el dispatcher sobrescribe cualquier actor aportado por el cliente y el backend de Inbox reutiliza únicamente el actor adjuntado por el dispatcher.
- Validación local aislada: InboxConversations 40/40 PASS; InboxRoleContract 17/17 PASS; parsing sintáctico de InboxConversations.js y feedback.js PASS.
- El cierre de casos ya estaba implementado en esta rama: Supervisor/Jefe/Desarrollador, bloqueo de comentarios tras cierre y auditoría. La política de comentarios también restringe las respuestas al creador del caso.
- Pendiente: la solicitud de no validar sesión en cada acción requiere una solución compartida entre AUTH/FEEDBACK/WRITE/USERS/ADMIN que mantenga revocación, logout, expiración y cambios de rol. Este commit elimina solo la doble validación de Inbox; no afirma que la optimización global esté terminada.
- No se desplegaron Apps Script ni se modificaron Spreadsheet, Drive, ScriptProperties o datos productivos.

- Publicación: commit `a98d3d110acc3730143636ca26f5f36a55f19b6e` en `GPSpedia2.2.5_work`; base `GPSpedia2.2.5` verificada sin cambios en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- CI Node.js 22 run `43678752084`: SUCCESS; **100 suites / 1,523 pruebas / 0 fallos**; comprobación de sintaxis PASS.
- GitHub Pages run `43678751430`: build, reporte y deploy SUCCESS.
- La optimización global de sesión sigue abierta: el cambio actual solo evita la validación duplicada dentro de Inbox. No se modificaron deployments de Apps Script ni datos productivos.


## Continuidad — reducción de validaciones redundantes en AUTH (2026-11-14)

- Rama de trabajo: `GPSpedia2.2.5_work`.
- HEAD de partida: `86f06c3b9b9b493751631b51898d1d618415371f`; rama base protegida: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- `JS/Services/Auth.js`: el dispatcher ya no valida/toca sesión antes de despachar. Las ocho operaciones protegidas revisadas validan token e identidad dentro de sus handlers y bajo bloqueo; las acciones sensibles verifican también cuenta activa, expiración, revocación pendiente y rol real cuando corresponde.
- `handleLogout` mantiene la coincidencia token/usuario y la limpieza idempotente de sesiones expiradas o ya revocadas.
- `JS/Tests/SessionActivityCoordination.mjs`: el contrato anterior que exigía preflight se reemplazó por pruebas estáticas de validación dentro de cada handler y ausencia de preflight duplicado.
- Validación CI posterior a la publicación pendiente. No se desplegaron Apps Script ni se modificaron Spreadsheet, Drive, ScriptProperties o datos productivos.
- Siguiente: verificar CI, revisar posibles validaciones adicionales en WRITE/USERS/ADMIN y mantener pendiente el diseño de invalidación compartida antes de introducir caché de sesión.


## Checkpoint actualizado — optimización de sesión AUTH/WRITE (2026-11-14)

- Repositorio: `infogpstech/GPSpedia`; rama activa: `GPSpedia2.2.5_work`; HEAD: `79e536913ba42c4ddef10ae84e0dbc713f92ee06`.
- Rama base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; sin modificaciones.
- AUTH: eliminado el preflight duplicado en `doPostInternal_`. Las operaciones protegidas revisadas validan sesión/identidad/estado/rol en su handler bajo bloqueo. `handleLogout` puede limpiar sesiones expiradas o ya revocadas.
- WRITE: `handleAddSupplementaryInfo` autentica una vez dentro del bloqueo; `handleAllocateVehicleId` autentica una vez después de adquirirlo. `assertDeveloperForIdMaintenance` usa `getAuthenticatedCollaborator(payload, ["desarrollador"])`, que valida rol con el mismo perfil autenticado y evita el escaneo completo adicional de Users.
- Las leases WRITE de Coordinator mantienen lectura de USERS y ACTIVE_SESSIONS durante estas operaciones, impidiendo que una mutación de identidad/rol se intercale hasta liberar la lease.
- FEEDBACK Inbox y `getCatalogChanges` reutilizan el actor confiable inyectado por el dispatcher. ADMIN valida el contexto en el despacho.
- Validación CI Node.js 22: run `43684553225` — 100 suites, 1,525 pruebas aprobadas, 0 fallos. Pages run `43684552773` — SUCCESS.
- Límite actual: no se ha implementado caché global de sesión/epoch. Cada operación protegida sigue haciendo una comprobación backend efectiva; los cambios eliminan duplicaciones y lecturas completas, no eliminan la autorización por operación.
- Próximo paso: auditar Coordinator y los flujos de revocación para diseñar contexto/epoch compartido con invalidación inmediata, pruebas de concurrencia y expiración antes de sustituir las comprobaciones actuales.
- No se desplegó Apps Script ni se modificaron Spreadsheet, Drive, ScriptProperties o datos productivos.


## Continuidad P1 — USERS: evitar búsqueda repetida en actualización de perfil (2026-11-15)

- Rama de trabajo `GPSpedia2.2.5_work`; HEAD previo al ajuste `8f6bd8992cd1542c2fa4ff00f1c9d1c2efdadd3d`; rama base protegida `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- `getVerifiedSession` ya encontraba la fila única del usuario para validar cuenta, revocación y rol. `handleUpdateProfile` volvía a recorrer la columna ID para encontrar esa misma fila. Ahora el verificador devuelve `userRowIndex` y el handler lo reutiliza dentro del mismo lock, comprobando que sea un entero de fila de datos. El índice no procede del navegador.
- Se sincronizó el espejo `JS/Tests/users.js` con el servicio y se amplió `JS/Tests/UsersAtomicMutations.js` para comprobar que no exista la segunda búsqueda.
- CI Node.js 22 run `43684916807`: SUCCESS; **100 suites / 1,525 pruebas / 0 fallos**. GitHub Pages run `43684916573`: build, reporte y deploy SUCCESS. No se modificaron datos productivos ni se desplegó Apps Script.


## Continuidad P1 — contexto central de sesión (2026-11-15)

- Repositorio: `infogpstech/GPSpedia`.
- Rama de trabajo: `GPSpedia2.2.5_work`; rama base protegida: `GPSpedia2.2.5`.
- HEAD verificado antes de este registro: `8de81256e886d334fd3756584c6849f115bd9674`.
- Estado: implementación del contexto central en curso de validación. No se ha desplegado Apps Script ni se han modificado hojas/Drive productivos.

### Cambios implementados en la rama

1. `Coordinator.js` 1.4.0 conserva contexto por usuario/token en ScriptProperties: rol, epoch, `revokedBefore`, creación y última actividad. `syncUserSessions` reconcilia los tokens de `ActiveSessions`; `registerSession`, `validateSessionContext`, `revokeSession` y `revokeUserSessions` gestionan registro, restauración e invalidación.
2. El epoch y `revokedBefore` impiden que una sesión anterior a una revocación global vuelva a registrarse aunque una limpieza de la hoja haya quedado incompleta. Logout revoca un token; cambios de rol, contraseña, eliminación y reset global revocan todas las sesiones.
3. AUTH registra/sincroniza sesiones en login; la primera restauración puede migrar sesiones previas solo cuando no existe un contexto revocado. AUTH sincroniza LastActivityAt en inicio/restauración y operaciones sensibles, no como preflight de cada servicio.
4. `SharedMutationClient` transmite credenciales al adquirir la lease y devuelve el actor verificado en esa respuesta. `withSharedSessionActor_` elimina `__sharedSessionActor` y `__feedbackActor` enviados por el navegador antes de adjuntar el actor confiable.
5. USERS, WRITE, ADMIN, FEEDBACK y UTILITIES consumen el actor central; se sustituyen locks de hojas de sesión por el recurso lógico `SESSION_CONTEXTS`. Los servicios ya no escriben ni reservan `ACTIVE_SESSIONS` en cada acción.
6. Se modificaron contratos y regresiones en `SharedMutationCoordinator.js` y `SessionActivityCoordination.mjs`; `JS/Tests/Auth.js` se mantiene como espejo exacto de `JS/Services/Auth.js`.
7. Se actualizó `Services/COORDINATOR_SETUP.md` y `README.md`; `Tareas_Activas.md` registra el alcance implementado y mantiene la validación pendiente.

### Validación y siguiente paso

- Pruebas agregadas: sincronización de múltiples sesiones, tokens sin `userId`, limpieza de índices, barrera `revokedBefore`, sesión anterior a revocación, actor confiable, sanitización de campos enviados por cliente, concurrencia entre servicios y revocación.
- No se ejecutaron Node.js/CLI local ni CI integral en esta sesión. Las herramientas de ejecución local no devolvieron un entorno utilizable y no se obtuvo un run de Actions asociado al HEAD actual. No declarar PASS por revisión estática.
- Siguiente tarea: ejecutar `node --check` y `JS/Tests/RunServiceTests.mjs` en entorno Node.js; corregir fallos, repetir suite y comprobar GitHub Actions. Después validar en Beta: login, restauración de sesión previa, múltiples dispositivos, logout individual, revocación global, cambio de rol, expiración e intentos con tokens obsoletos.
- Mantener `GPSpedia2.2.5` intacta. No publicar deployments ni ejecutar migraciones/datos productivos sin autorización documentada.


## Continuidad P1 — corrección de contratos de sesión central (2026-11-15)

- Rama de trabajo: `GPSpedia2.2.5_work`; rama base protegida: `GPSpedia2.2.5` (sin cambios).
- Se corrigió `Coordinator.js`: `AUTH/acceptTerms` ahora declara explícitamente `trackActivity: false`. La aceptación consulta `SESSION_CONTEXTS` y escribe únicamente en `USERS`; no hereda una reserva innecesaria de escritura sobre `ACTIVE_SESSIONS`.
- Se alinearon `TermsAcceptance.js`, `UsersAtomicMutations.js` y `AdminImageScanCoordinatorContract.mjs` con la arquitectura vigente: las lecturas autenticadas consumen contexto central y no actualizan `LastActivityAt` en cada solicitud.
- Commits secuenciales en la rama: `64f47f0` (política AUTH), `e1cf604` (contrato términos), `df17da8` (contrato USERS), `2b671a5` (contrato ADMIN). HEAD registrado: `2b671a5113eba058646e55037a72d80e98a29202`.
- Revisión estática posterior: los cuatro archivos contienen los cambios esperados; se confirmó que los contratos ADMIN ya no exigen `ACTIVE_SESSIONS` compartido. No se ejecutó Node.js local.
- La ejecución de GitHub Actions para este HEAD no se ha podido confirmar mediante los estados disponibles; el estado combinado consultado devolvió cero estados. Por tanto, la regresión continúa **pendiente de validación** y no se declara PASS.
- Siguiente: obtener una ejecución CI vinculada a este HEAD, revisar `node --check` y las 66+ suites; corregir fallos reales sin debilitar la autorización ni la barrera `revokedBefore`. Después completar pruebas Beta de login, restauración, múltiples dispositivos, logout individual, revocación global, cambio de rol, expiración y tokens obsoletos.
- No se desplegó Apps Script ni se modificaron hojas, Drive o datos productivos.

## Requisitos de continuidad — contraseñas y servicios Apps Script (2026-11-15)

- Rama: `GPSpedia2.2.5_work`; rama base protegida: `GPSpedia2.2.5`.
- El usuario aclaró el alcance: las contraseñas deben almacenarse mediante hash y el inicio de sesión debe seguir siendo ágil. No aumentar por iniciativa propia el coste computacional del hash ni añadir pasos, factores o verificaciones extra que ralenticen el login. Revisar en la próxima iteración la diferencia entre AUTH (PBKDF2-HMAC-SHA256, 12,000 iteraciones) y USERS (SHA-256 con salt) y unificar el formato con un criterio de protección razonable y baja latencia. No almacenar texto plano ni ejecutar migraciones reales sin autorización.
- El usuario confirmó que sí se pueden modificar ahora los archivos fuente de Apps Script en la rama. Se pueden corregir servicios, contratos y pruebas locales. Solo las pruebas que dependan de desplegar/publicar los servicios, invocar deployments actualizados o utilizar credenciales/propiedades/hojas del entorno Beta quedan pendientes hasta después del despliegue. No se debe bloquear el trabajo local independiente por esas pruebas diferidas.
- Se registraron estos requisitos en `NORMAS_DESAROLLO.md` (commit `be3dada8f50ced2fcb12559c132be4ab72efa0e1`) y `Tareas_Activas.md` (commit `a684dc7cdfe0b2c606ad11a7eb8b4817694971c4`).
- CI observado para HEAD previo `3765bee922c68044d81c9ed55178b19752182737`: regresión de servicios con 72 suites, 1,116 pruebas aprobadas y 3 suites fallidas. Fallos: `revokeSharedUserSessionContexts_` no definido en los entornos aislados de AUTH/USERS; espejo `JS/Tests/users.js` desincronizado respecto a `JS/Services/users.js`; integración AUG-156 falla como consecuencia. No se marca como aprobado.
- Próximo trabajo local: corregir los contratos/fixtures y la disponibilidad de la función compartida en los entornos de prueba; volver a ejecutar `node --check` y la regresión integral Node.js 22. Después, dejar explícitamente pendientes las pruebas de despliegue Beta que correspondan.
- Esta actualización es documental; no modifica lógica de autenticación ni despliega servicios Apps Script. No se modificaron hojas, Drive, propiedades ni datos productivos.



## Continuidad — P1 sesión central y compatibilidad de contraseñas (2026-11-15)

- Repositorio `infogpstech/GPSpedia`; rama `GPSpedia2.2.5_work`; HEAD validado: `b5cca78a65b5a9be39b999306abd3365da99c269`. Rama base `GPSpedia2.2.5` verificada sin cambios en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Corregidos los fallos locales del CI inicial: dependencia de revocación central en el harness AUTH; sincronización del espejo USERS; wrapper de actor en el harness de ADMIN; expectativas de contratos Inbox/acceptTerms/Coordinator alineadas con `SESSION_CONTEXTS` y la política `trackActivity: false`.
- AUTH y USERS generan ahora el mismo formato `pbkdf2-sha256$12000$salt$digest`, con salt UUID aleatorio. Se conserva lectura compatible de `sha256$` y plaintext heredado; AUTH rehashea oportunistamente tras verificar correctamente credenciales antiguas. No se aumentaron iteraciones, no se añadieron pasos al login y no se ejecutó migración masiva.
- Prueba cruzada AUTH/USERS añadida a `PasswordHashMigration.mjs`. CI Node.js 22 run `43752042270`: SUCCESS; **100 suites / 1,535 pruebas / 0 fallos**; `node --check` PASS. GitHub Pages run `43752040706`: build/reporte/deploy SUCCESS.
- No se desplegó Apps Script ni se modificaron datos productivos. Validación Beta pendiente: deployments compatibles, credenciales, properties, Spreadsheet, login, restauración, varios dispositivos, logout individual, revocación global, cambio de rol/contraseña, expiración y tokens obsoletos. Benchmark de KDF real pendiente; no aumentar el coste configurado sin evidencia y autorización.
- Siguiente trabajo local: GP-INBOX-04B, limitado a correcciones internas y pruebas. No añadir botones, paneles, pestañas, secciones ni acciones visibles nuevas sin autorización. Operaciones masivas/controles visibles 04B..04D siguen diferidos.


## Continuidad GP-INBOX-04B/04C (2026-11-15)

- HEAD de código validado: `9e3a2c0c9dffc04a42c775e709f7bf1c14b02fd7`; rama base protegida `GPSpedia2.2.5` sin cambios, SHA `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- GP-INBOX-04B backend: `markInboxUnread` y `deleteInboxConversation` autenticadas/coordinadas. Hoja `InboxConversationFlags` lazy-created; no altera hojas existentes. Marcar no leído es reversible/idempotente/auditado; ocultar el acceso solo para el participante y conserva el historial del otro. No se agregaron controles visibles.
- GP-INBOX-04C backend: `reportProblem` guarda categoría/asunto con valores por defecto cuando la UI no los envía; el detalle del Inbox de soporte muestra categoría y estado. `getMyProblemReports` devuelve tickets propios paginados y filtra por el actor de sesión, no por userId cliente. Respuestas/resolución siguen usando `replyToFeedback` y `markAsResolved`. Sin nuevas pestañas/botones/paneles para usuarios.
- CI Node.js 22 run `43753335306`: SUCCESS, **100 suites / 1,542 pruebas / 0 fallos**; InboxConversations 46/46; node --check PASS.
- Pendiente: UI de tickets propios y selector visual categoría/asunto, barra/selección múltiple 04B, revisión RBAC/accesibilidad/móvil 04D y Beta con servicios desplegados. No se desplegó Apps Script ni se tocaron Sheets/Drive/ScriptProperties productivos. La hoja InboxConversationFlags no se ha creado en remoto.
- Próximo trabajo local: GP-INBOX-04D, revisión de contratos RBAC/accesibilidad/regresión sin controles nuevos. Mantener toda validación remota en pendiente de Beta.


## Continuidad GP-INBOX-04D (2026-11-15)

- HEAD de código validado: `849e4aa0ddd23c41d635fffee4bba31b006a14b0`; rama base `GPSpedia2.2.5` sin cambios, SHA `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- GP-INBOX-04D local: contratos RBAC, jerarquía, auditoría, foco/teclado, ARIA, reduced-motion, responsive y regresión cubiertos. `InboxUi` 22/22 PASS. Se añadieron comprobaciones para los metadatos de ticket y para no conectar acciones diferidas a controles visibles.
- CI Node.js 22 run `43753485398`: SUCCESS, **100 suites / 1,544 pruebas / 0 fallos**.
- Pendiente Beta: lector de pantalla y navegación real, temas, Atrás, tamaños/dispositivos Android/iOS/desktop, conectividad y pestañas. Acciones masivas/selección múltiple siguen sin UI hasta autorización.
- Sin despliegues Apps Script ni modificaciones de hojas/datos productivos.


## Continuidad final GP-INBOX-04B/04C/04D (2026-11-15)

- HEAD documental: `e311fb6895e035f57277d01e180f29241c9d414e`; HEAD de código validado: `7a58da9a012cd12084f2de3bfb729994f296729b`. Rama base `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- GP-INBOX-04B backend: acciones privadas marcar no leído y ocultar, hoja de flags diferida, idempotencia, auditoría y conservación de historial. GP-INBOX-04C: categoría/asunto de tickets, canal reportProblem, respuestas/resolución y consulta privada de tickets propios con cursor estable por reportId. GP-INBOX-04D: contratos RBAC, accesibilidad y regresión; InboxUi 22/22.
- CI Node.js 22 run `43753616255`: SUCCESS; **100 suites / 1,544 pruebas / 0 fallos**.
- `lista_beta_parte2.txt` ahora contiene protocolo detallado GP-INBOX-04B/04C/04D, con preflight seguro y prohibición explícita de producción/despliegues no autorizados.
- Pendiente: pruebas Beta con deployments/Spreadsheet/Drive aislados y dispositivos reales; historial propio de tickets y selector categoría/asunto en UI; barra/selección múltiple. No añadir controles visibles hasta autorización. No desplegar Apps Script ni modificar datos productivos.

## Continuidad P2 — IDs por fórmula y generación backend (2026-11-15)

**Rama:** `GPSpedia2.2.5_work`. La base protegida no se modificó.

- Se implementó en el modal Desarrollador la auditoría global de columnas ID y la migración por lotes de fórmulas a valores estáticos, conservando el valor exacto, prefijo y relleno del ID.
- La simulación y el manifiesto diferencian fórmulas compatibles de patrones no reconocidos. Solo se congelan secuencias compatibles con el generador backend; no se renumeran IDs ni se migran valores vacíos/duplicados.
- Los lotes requieren digest vigente, respaldo de Spreadsheet verificado en servidor y confirmación; snapshots y manifiesto permiten verificar/reanudar.
- FEEDBACK reemplaza copia de fórmulas por asignación backend secuencial y bloqueada en los escritores de actividad, sugerencias, reportes y contacto. La copia de formato/validación permanece permitida. Users/Cortes ya generan ID desde backend.
- `IdentifierFormulaMigration`: 4/4 PASS en el CI validado anterior; se añadió una prueba adicional para excluir fórmulas no reconocidas. `FeedbackFormulaIdAllocator`: 5/5 PASS en CI.
- Último CI completo validado antes del último ajuste de exclusión: run `43758115537`, HEAD `b9642cc66d250a29f450b53f6a4e7154d4927f2e`, SUCCESS; 102 suites / 1,553 pruebas / 0 fallos. El ajuste de exclusión y su prueba deben quedar validados por el siguiente CI antes de cerrar.
- No se ejecutó migración real ni despliegue Apps Script. Próximo paso: CI, revisión final de todos los escritores/columnas formula-ID, y luego preparar dry-run en copia Beta. Relay no tiene escritor backend de registros ni formato confirmado: mantener bloqueado.

## Estado de continuidad — cierre local P2 (2026-11-15)

**Este estado actualiza la adenda P2 anterior; prevalecen estos resultados.**

- Repositorio: `infogpstech/GPSpedia`.
- Rama autorizada: `GPSpedia2.2.5_work`. HEAD de código/documentación validado: `e92ed13473ac2a39a5f20b630590f1f42eee7de4`.
- Rama base protegida `GPSpedia2.2.5`: HEAD `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones.
- CI Node.js 22 run `43759543652`: SUCCESS; **102 suites / 1,558 pruebas / 0 fallos**. También aprobó la comprobación sintáctica de los módulos modificados.
- Suites específicas: `IdentifierFormulaMigration` 7/7; `FeedbackFormulaIdAllocator` 5/5; `UserIdGenerator` 6/6; `PasswordHashMigration` 18/18; `LogoIdIntegrity` 11/11; `UsersAtomicMutations` 15/15.
- El modal Desarrollador permite auditar columnas ID de todas las hojas visibles, simular la conversión y migrar por lotes las fórmulas con generador backend compatible. Conserva los valores y el formato histórico; no renumera.
- Generadores integrados: Users lee la configuración de prefijo/relleno; FEEDBACK y ADMIN usan el mismo contrato de configuración para sus columnas secuenciales; Cortes y LogosMarca conservan sus asignadores numéricos existentes. Los escritores de FEEDBACK, ADMIN y WRITE ya no copian fórmulas al crear filas.
- Fórmulas con patrón o escritor no compatible, incluyendo Relay mientras no exista un escritor/backend contract confirmado, quedan excluidas y visibles para revisión. No se generan IDs supuestos.
- La migración de contraseñas queda accesible desde el modal y conserva autenticación ágil; las contraseñas heredadas se convierten a hash por lotes. No se cambió el flujo de login.
- No se ejecutó migración en Spreadsheet real ni se desplegaron servicios Apps Script. Las validaciones de deployment, referencias reales y ejecución de lotes quedan **PENDIENTES DE BETA** en copia aislada. El protocolo P2 en `lista_beta_parte2.txt` ya inicia con preflight obligatorio de árbol limpio y sincronización fast-forward.
- Siguiente acción: al autorizar entorno Beta, sincronizar la rama mediante el preflight, verificar backup de la copia, ejecutar auditoría y dry-run; revisar cada patrón excluido y referencias antes de confirmar lotes. No tocar producción.


---

# Continuidad — resiliencia del catálogo ante fallo de persistencia IndexedDB (2026-11-15)

**Rama:** `GPSpedia2.2.5_work`  
**Commit de implementación:** `498fef7717fe13b405cdfdffd018c2d0fa8ff988`

## Hallazgo nuevo a partir de consola Beta
- El arranque vuelve a mostrar `IndexedDB initialization timed out` al abrir `GPSpedia_DB`; por eso fallan lecturas de catálogo, historial y elementos vistos. El timeout local de 3 segundos en `auth.js` ocurre antes del timeout de apertura de IndexedDB y no constituye por sí solo otro fallo.
- Se confirma un defecto adicional del cliente: si la descarga remota devuelve una instantánea válida pero falla `saveCatalog`/`saveCatalogWithCursor`, el error se propagaba al bloque general y podía limpiar `catalogData` aunque ya se hubiera procesado correctamente en memoria.
- Corrección local: la persistencia del snapshot/cursor pasa a ser best-effort. Un error de IndexedDB se registra, pero no invalida ni borra el catálogo remoto que ya está en memoria. La disponibilidad de la caché se recuperará en siguientes intentos; no se borra ni recrea la base.

## Validación
- Añadida regresión a `CatalogStartupIntegrity.mjs` para simular timeout al persistir y comprobar que el catálogo remoto sigue visible, el estado de carga no pasa a error y no se muestra error global.
- GitHub Actions Node.js 22 run `43766371233`, commit `498fef7717fe13b405cdfdffd018c2d0fa8ff988`: **SUCCESS; 103 suites / 1,606 pruebas / 0 fallos**. `CatalogStartupIntegrity`: 19/19 PASS; `IndexedDBTransactions`: 45/45 PASS; sintaxis de módulos modificados PASS.
- GitHub Pages run `43766370693` para este commit estaba en cola al actualizar el checkpoint; despliegue todavía no confirmado.
- La causa ambiental exacta de la apertura IndexedDB que queda pendiente requiere inspección del navegador Beta (almacenamiento del sitio, pestañas/conexiones antiguas, eventos de apertura y disponibilidad de IndexedDB). No ejecutar `deleteDatabase`, limpiar almacenamiento ni borrar `adminLocalState`.
- El rechazo `Servicio no autorizado para el coordinador compartido` permanece separado: cotejar en privado deployment y ScriptProperties de FEEDBACK/Coordinator en Beta. No se debilita la autenticación ni se publican secretos.
- No se desplegaron Apps Script ni se modificaron ScriptProperties, endpoints, Spreadsheet, Drive o datos productivos.

**HEAD de trabajo tras validar CI:** `498fef7717fe13b405cdfdffd018c2d0fa8ff988`.


---

# Continuidad — correcciones de disponibilidad y rendimiento reportadas en Beta (2026-11-15)

- Repositorio: `infogpstech/GPSpedia`; rama autorizada: `GPSpedia2.2.5_work`; HEAD de partida verificado: `931beeadca7477f8e0115223f6b8eb112a553eb1`.
- Rama base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.
- Se leyeron las normas completas antes de modificar. Se registró en la sección 13 de `NORMAS_DESAROLLO.md` el comportamiento cache-first, la sincronización silenciosa, la disponibilidad de Inbox, el rendimiento del modal y la política de sesión/RBAC.
- `Tareas_Activas.md` registra GP-BETA-01..09 como prioridad P0. `Auditoría.txt` incorpora síntomas y hallazgos iniciales; `ChangesLogs.txt` describe el cambio documental.
- Evidencia inicial: `auth.js` establece `catalogLoadStatus=loading` antes de leer IndexedDB, por lo que puede mostrar parpadeo aun cuando exista snapshot. `loadInboxConversations_` reemplaza la lista por un placeholder de carga y `loadInboxMessages_` muestra estado loading al abrir detalle. La lectura de Inbox depende de FEEDBACK/Coordinator.
- El rechazo FEEDBACK/Coordinator ya aparece en consola Beta. No se puede corregir en código local si la URL/secreto de ScriptProperties del deployment están desalineados; no se modifica configuración remota ni se debilita la autenticación.
- Siguiente acción inmediata: corregir el estado visual del catálogo para no marcar loading hasta confirmar caché ausente; mantener Inbox visible durante refresh y añadir pruebas de regresión. Después optimizar el detalle/modal y separar permisos de lectura de acciones destructivas.
- No se desplegaron Apps Script, no se modificaron ScriptProperties, Spreadsheet, Drive ni datos productivos.


---

# Continuidad — primera corrección funcional de GP-BETA-01/02/07 (2026-11-15)

- Rama: `GPSpedia2.2.5_work`; HEAD de implementación: `664f9f745f5d2a742ee88e368347f125c3f8db9d`. Rama base `GPSpedia2.2.5` verificada intacta en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Normativa: sección 13 añadida a `NORMAS_DESAROLLO.md` para cache-first, sincronización silenciosa, Inbox sin parpadeos, edición ágil y sesión/rol sin revalidaciones redundantes.
- Requisitos y tareas GP-BETA-01..09 registrados en `Tareas_Activas.md`; evidencia en `Auditoría.txt` y cambios en `ChangesLogs.txt`.
- Catálogo: el estado loading se difiere hasta comprobar ausencia de snapshot válido; caché válida pasa a ready antes del delta. Si la lectura local vence por Timeout local, no se repite inmediatamente la misma apertura IndexedDB.
- Inbox: lista/mensajes no se reemplazan por placeholders durante refresh. Se añade caché temporal de mensajes por conversación, aislada por la sesión completa, TTL 60 s y máximo 40 conversaciones.
- Modal: consulta de operaciones de imagen IndexedDB en segundo plano; los campos de texto pueden editarse sin esperar al almacén opcional. Los reemplazos de imagen siguen cerrados hasta confirmar estado. Dropdowns se precargan al abrir el detalle y usan promesa compartida.
- RBAC modal: `getDropdownData` ahora admite Desarrollador/Jefe/Supervisor como lectura necesaria para la edición; no se alteran permisos destructivos.
- CI Node.js 22 run `43768407672`: **SUCCESS; 103 suites / 1,610 pruebas / 0 fallos**. GitHub Pages run `43768406704` estaba en ejecución al redactar esta actualización.
- Aún no corregido: configuración FEEDBACK/Coordinator en deployment Beta; raíz del timeout IndexedDB; permisos de borrado de logs/auditoría Drive/lectura histórica según el rol concreto. No se debilitó autorización ni se modificaron deployments/ScriptProperties/datos productivos.
- Siguiente: confirmar el rol usado en Beta para ajustar únicamente las capacidades que deban estar disponibles; continuar con traza de modal/Drive, errores FEEDBACK y diagnóstico de IndexedDB. No habilitar acciones destructivas a roles no autorizados por inferencia.


---

# Continuidad — fallback CacheStorage y disponibilidad inmediata del catálogo (2026-11-15)

- Rama `GPSpedia2.2.5_work`; HEAD de implementación y pruebas: `79bf376d6489068ee95314aec6bf9f02b20895ac`. Rama base `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- `offline.js`: respaldo independiente del snapshot público del catálogo y cursor en CacheStorage; no incluye sesión, tokens, historial, datos administrativos ni operaciones pendientes.
- `auth.js`: lectura en paralelo de IndexedDB/CacheStorage; elige una instantánea completa válida y conserva cursor para deltas. Si IndexedDB no abre, la copia alternativa permite evitar snapshot completo del servidor cuando hay cursor válido.
- La instantánea de red se procesa y presenta en memoria antes de persistir. El estado ready no espera IndexedDB; las dos persistencias se intentan en paralelo y fallan de forma independiente.
- Regresión añadida para snapshot disponible antes de completar persistencia local. CI Node.js 22 run `43768956946`: **SUCCESS; 103 suites / 1,616 pruebas / 0 fallos**; CatalogStartupIntegrity 23/23, InboxUi 24/24, VehicleModalRolePolicy 12/12, IndexedDBTransactions 45/45.
- El CI anterior para commit `cecc4d9` detectó un harness con await no resuelto y un test que evaluaba `import.meta` mediante `new Function`; ambos se corrigieron antes del CI aprobado. No se ocultan fallos intermedios.
- GitHub Pages para este HEAD todavía estaba en cola al redactar esta adenda.
- Pendientes Beta: causa raíz de IndexedDB; FEEDBACK/Coordinator (Inbox y feed); roles concretos para borrado de logs, auditoría Drive e imágenes históricas. No se modificó ningún deployment, ScriptProperties, Spreadsheet ni Drive.
---

# Continuidad — commit de disponibilidad, autorización y alertas de desarrollador (2026-11-15)

## Estado verificado

- Repositorio infogpstech/GPSpedia.
- Rama de trabajo GPSpedia2.2.5_work.
- HEAD comprobado: e7958f57af9d1a92f85ba8bdd164c65157059561.
- Padre: d953beef6e06ce71519d7199a49675d9a4dfa4e5.
- Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1, intacta.
- CI Node.js 22 run 43775146844: **SUCCESS; 105 suites, 1,645 pruebas, 0 fallos de suite**.
- GitHub Pages run 43775145793: build y deploy **SUCCESS**.

## Cambios ya publicados en la rama de trabajo

- JS/Services/Coordinator.js, SharedMutationClient.js y feedback.js: feed incremental del catálogo expuesto por GET público y de solo lectura. POST de Coordinator, mutaciones, leases y funciones privadas continúan autenticadas.
- JS/Frontend/auth.js: restauración del perfil de sesión sin segunda consulta AUTH al arrancar. Coordinator conserva la validación del actor central, token, expiración y revocación; el cliente no es fuente de permisos.
- JS/Frontend/offline.js: fallback CacheStorage, manejo no bloqueante de caché IndexedDB opcional, historial y vistos. Una apertura IndexedDB no disponible no debe impedir el catálogo; errores genuinos de transacción/cuota siguen visibles.
- JS/Tests/: regresiones de feed, restauración de sesión, Inbox, IndexedDB, panel y monitor de cuota. CI aprobado en el HEAD indicado.
- JS/Frontend/api-config.js y HTML/users.html: retirada de la llamada externa LEGACY para logging remoto. Errores de users.html se conservan en consola local.
- index.html, style.css y JS/Frontend/ui.js: consola encima de pestañas, navegación horizontal compacta y monitor de cuota Drive.
- JS/Services/InboxConversations.js y feedback.js: acción restringida a Desarrollador para registrar alertas de Drive como mensajes del sistema dirigidos a cuentas activas con ese rol; idempotencia por fecha y destinatario.

## Hallazgos y pendientes reales

1. GP-BETA-03 — borrado de logs: pendiente de revisión end-to-end de RBAC, dispatcher e interfaz.
2. GP-BETA-04 — ejecutar auditoría Drive: pendiente de revisar rol requerido, lectura y límites de árbol Cortes; mantener las acciones destructivas separadas.
3. GP-BETA-05 — imágenes históricas: pendiente de separar consulta/inventario de mover, restaurar y eliminar.
4. GP-BETA-06 — revisión backend global pendiente: eliminar consultas redundantes a Users/ActiveSessions por acción. No eliminar autorización central ni confiar en roles del navegador. Actor de sesión, epoch, expiración y revocación permanecen protegidos en Coordinator.
5. GP-BETA-01/09 — el feed público ya no utiliza el secreto privado FEEDBACK; la lectura de Inbox y las mutaciones privadas requieren validación del deployment Beta y trazado separado.
6. GP-BETA-08 — la app puede degradarse sin IndexedDB; la causa ambiental de indexedDB.open bloqueado/expirado solo puede determinarse con eventos y estado real del navegador Beta. No borrar bases ni almacenamiento del sitio.
7. Métricas de tráfico: el gráfico actual representa solicitudes vistas desde esta sesión/navegador, no el tráfico global. Para global se requiere agregación desde servidor.

## Siguiente acción inmediata

Continuar sin esperar al despliegue Beta con la auditoría del borrado de logs, la auditoría Drive y el inventario de imágenes históricas. Inspeccionar consumidores, contratos y matriz de roles en los servicios y sus tests; corregir el origen y ampliar regresiones. Mantener las pruebas de campo y configuración remota como validación diferida.

No se desplegaron Apps Script, no se cambiaron ScriptProperties y no se alteraron Spreadsheet, Drive ni datos productivos.



## GP-BETA-08/09 — causa raíz IndexedDB y feed de catálogo (2026-11-15)

**Estado: EN PROGRESO — corrección local publicada; ejecución CI y validación Beta pendientes.**

- IndexedDB: una apertura podía agotar el timeout del consumidor y, aun así, el `IDBOpenDBRequest` original seguir pendiente. Limpiar el estado en ese momento permitía abrir solicitudes adicionales en paralelo. Ahora timeout y `onblocked` no descartan la apertura subyacente: se conserva una única solicitud, se reutiliza y puede completar cuando se libere la conexión anterior. Los errores definitivos de apertura mantienen backoff.
- Feed: el frontend usaba POST FEEDBACK para leer cambios públicos, aunque el Coordinator ya expone `GET ?catalogFeed=1` sin secreto de servicio. FEEDBACK ahora expone el feed por GET y el frontend usa esa ruta directamente; el endpoint valida cursor/límite y conserva el contrato de respuesta. Se mantiene la autenticación para escrituras y operaciones protegidas.
- PWA: se incrementó Service Worker `gpsepedia-cache-v28` a `v29` para instalar una caché nueva y retirar la anterior al activar el worker actualizado. La consola reporta `Timeout local`, literal que no aparece en el `auth.js` actual recuperado; se sospecha una versión cliente antigua y se debe verificar el worker desplegado en Beta.
- Sesiones: no se eliminan los secretos servicio-a-servicio ni la revocación central. El actor/rol se obtiene del contexto de sesión registrado en login; la autorización central sigue comprobando vigencia y revocación sin volver a consultar Users/ActiveSessions por cada operación.
- Código publicado: `82e2ffe101f96e0ec0e43f801470f36accde8def`. Pruebas añadidas/actualizadas en `22920fdacec0b226c2898787d4bc9b7534120b3b`. No se desplegó Apps Script ni se modificaron ScriptProperties, secretos, hojas, Drive o datos productivos.

**Pendiente:** ejecutar `IndexedDBTransactions.js`, `CatalogChangeFeed.mjs`, `ServiceWorkerCache.js`, sintaxis Node.js y suite integral en GitHub Actions. En Beta comprobar FEEDBACK `GET ?catalogFeed=1`, instalación del Service Worker v29 y comportamiento de IndexedDB en el navegador real.


## Continuidad GPSpedia — iteración 2026-11-15 (HEAD 6a534617431d94f06f4a37c972bd3fcf12173de5)

### GP-BETA-08/09 — IndexedDB, catálogo y recursos PWA

**Estado de código: CORREGIDO Y VALIDADO EN CI. Validación Beta/despliegue Apps Script pendiente.**

- Se corrigió la apertura de IndexedDB: timeout y evento `onblocked` ya no descartan el `IDBOpenDBRequest` activo ni permiten abrir solicitudes paralelas. Se conserva una única promesa de apertura, que puede resolverse después de liberar el bloqueo; solo un error definitivo activa backoff.
- Se eliminó la ruta POST autenticada para el feed público. FEEDBACK expone `GET ?catalogFeed=1&cursor=&limit=` y el frontend consume esa ruta GET; FEEDBACK consulta el endpoint público de lectura del Coordinator. La ruta no requiere secreto de servicio ni identidad de usuario porque no ejecuta escrituras.
- Service Worker actualizado de caché v28 a v29 para invalidar recursos antiguos. La consola reportada incluía `Timeout local`, texto que no existe en el `auth.js` de la rama recuperada; se registró como indicio de recursos PWA anteriores al código actual.
- Pruebas añadidas: timeout con apertura tardía, recuperación tras `onblocked` sin segunda solicitud y contrato GET del feed. IndexedDB: 49/49; catálogo: 29/29.

### GP-BETA-10 — autorización central y revalidaciones redundantes

**Estado de código: CORREGIDO Y VALIDADO EN CI.**

- Los routers AUTH, USERS, WRITE, ADMIN y FEEDBACK entregan al Coordinator el token de sesión sin confiar en `payload.userId` como identidad del solicitante. El Coordinator resuelve el usuario desde el índice privado token→usuario y entrega el actor confiable.
- Los handlers protegidos de AUTH (aceptación de términos, cambio/restablecimiento de contraseña, gestión de usuarios/sesiones, purga de Logs y migración legacy de hashes) consumen el actor central y ya no vuelven a buscar la sesión ni a leer el rol del solicitante desde Users/ActiveSessions.
- Se conserva la comprobación central de token, expiración, epoch y revocación. No se retiró la autenticación entre servicios ni el control RBAC de cada acción basado en el rol del actor confiable. Logout conserva la identificación del token únicamente para revocarlo/limpiarlo.
- Se eliminó la revalidación de estado/rol del actor al localizar su fila para actualizar perfil o registrar aceptación de términos; la búsqueda de fila única se conserva como requisito de escritura, no como autenticación.
- Se actualizaron los fixtures AUTH/USERS y las pruebas para comprobar actor central, protección de la última cuenta Desarrollador y ausencia de consultas duplicadas.

### Validación automatizada

- GitHub Actions `GPSpedia service regression tests`: **106 suites, 1,652 pruebas aprobadas, 0 fallos**; sintaxis JavaScript aprobada.
- La rama base `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1` y no fue modificada.
- La construcción/despliegue de GitHub Pages correspondiente al HEAD `6a534617431d94f06f4a37c972bd3fcf12173de5` todavía estaba en curso al registrar este checkpoint.
- No se desplegó Apps Script ni se cambiaron ScriptProperties, secretos, permisos, hojas, Drive o datos productivos. La ruta GET FEEDBACK y la instalación efectiva del Service Worker v29 requieren validación en Beta.

### Pendiente inmediato

1. Validar en Beta la consulta FEEDBACK `GET ?catalogFeed=1` y la lectura pública del Coordinator con los deployments actuales.
2. Confirmar en navegador Android/PWA que se instala el Service Worker v29 y desaparece el código antiguo que emitía `Timeout local`.
3. Continuar con las tareas de interfaz pendientes: estandarización global de controles, modal Desarrollador compacto con navegación horizontal, consola única de 50% de altura y confirmaciones por comandos, ayudas informativas, monitor Drive/alerta al 80%, retiro de Legacy y telemetría de tráfico global.

**Commits de implementación y pruebas de esta iteración:** `82e2ffe101f96e0ec0e43f801470f36accde8def`, `22920fdacec0b226c2898787d4bc9b7534120b3b`, `e58f9c1c2e11d9b3f914cef2926a2b34d4171ba0`, `83f8c64831d75465fbe69bc2ec71cad807b53ee6`, `74c384863412bdfc76a7bfd040bf9d2600986424`, `6455230d2533065c069938b4f5f37c55557a6a5c`, `392784aba8821cfaacffe3c16f4bfd1428f22121`, `451edefeb38cd5fd785b405e091e84eb40909101`, `99d9ca8dee54b8a7ab00a209d5adae2270c27a56`, `d12c3364f50c381dfe095d3c7d2298789b387bc0`, `6a534617431d94f06f4a37c972bd3fcf12173de5`.


## Avance de interfaz del panel Desarrollador — 2026-11-15

**HEAD de código:** `79b128968961cf701f99db08302e2e8f3f91e797`. **Estado:** validado por GitHub Actions y GitHub Pages.

- Consola superior ampliada del 44% al 50% de la altura disponible del modal; se conserva el scroll interno y la navegación horizontal.
- Se agregó expansión animada del título con respeto a `prefers-reduced-motion`.
- Se acortó la etiqueta del campo de respaldo a «Ingresa el enlace del respaldo».
- Se verificó que las pestañas ya estaban en una barra horizontal de iconos, expandiendo el nombre de la pestaña activa. Los botones `dev-action-full` ya tienen ancho automático y no ocupan toda la fila.
- Se verificó que el Monitor de GDrive ya pinta en rojo el porcentaje crítico, calcula el umbral del 80% y genera alerta en consola e Inbox para cuentas Desarrollador. No fue necesario duplicar esa función.
- Se verificó que LEGACY ya no figura en `SERVICE_HEALTH_CONTRACTS` ni en las consultas de salud; la prueba `ServiceHealthContract` lo confirma.
- GitHub Actions: **106 suites, 1,653 pruebas aprobadas, 0 fallos**. GitHub Pages: construcción/despliegue completado con éxito para este HEAD.

**Pendiente de esta solicitud:** tráfico global agregado entre todas las plataformas (el gráfico actual sigue siendo local al navegador); centralización absoluta de todos los mensajes de acciones en la consola; confirmaciones interactivas y/n en la terminal; ayudas informativas para todas las descripciones; estandarización global de botones/campos/selectores y formato descriptivo sincronizado entre todos los usuarios. Estas tareas quedan abiertas y no se marcan como terminadas.


---

## Corrección de apertura bloqueada de IndexedDB — 2026-11-15

**Rama comprobada:** `GPSpedia2.2.5_work`  
**HEAD anterior:** `c53d651de651074a8356fa5c51b15d8543c7a861`

### Hallazgo y corrección
La auditoría confirmó que `IDBOpenDBRequest.onblocked` no significa que la apertura haya fallado: el navegador conserva la solicitud pendiente y puede completar `onsuccess` cuando otra pestaña cierre su conexión. La implementación anterior rechazaba una promesa auxiliar al recibir `onblocked`; como esa promesa participaba en cada `Promise.race`, los consumidores posteriores fallaban inmediatamente aunque la solicitud original siguiera viva.

Se retiró ese rechazo anticipado. Ahora cada consumidor tiene un timeout acotado, pero todos reutilizan la misma solicitud de apertura. Un timeout no cancela ni duplica la apertura; si la pestaña bloqueadora libera la base, la solicitud original se resuelve y las siguientes operaciones pueden continuar.

### Archivos
- `JS/Frontend/offline.js`: eliminación del rechazo artificial por `onblocked`; conservación del timeout y de la apertura única.
- `JS/Tests/IndexedDBTransactions.js`: pruebas para timeout repetido sin abrir solicitudes paralelas y recuperación de la misma solicitud después de liberar la pestaña bloqueadora.

### Validación
Las pruebas automatizadas se actualizaron, pero su ejecución en GitHub Actions queda pendiente de la ejecución asociada a este commit. No se realizó despliegue de Apps Script ni se modificaron datos productivos.

### Diagnóstico adicional de los errores Beta
En el código de esta rama, el historial local ya usa operaciones silenciosas ante fallos de IndexedDB y `getCatalogChanges` realiza un GET directo. El FEEDBACK actual consulta el feed público del Coordinator mediante GET; el `doGet` actual del Coordinator atiende ese feed sin autenticación de servicio y solo expone eventos de catálogo ya publicados. Por tanto, la traza Beta que muestra `routeAction` para `getCatalogChanges` y el mensaje de autorización del Coordinator no coincide con el flujo de esta revisión. Es evidencia de un cliente o despliegue Apps Script desactualizado/mal apuntado; debe verificarse contra las versiones publicadas antes de atribuirlo al código de esta rama. No se modificaron secretos ni se retiraron controles del Coordinator.



---

## Continuidad posterior a corrección IndexedDB — 2026-11-15

**HEAD:** `cd38ad3e68414b9fc21e481eee9b4b7f36ac0192`  
**Commit:** `fix(offline): conservar aperturas IndexedDB bloqueadas`

- `JS/Frontend/offline.js` ya no trata `IDBOpenDBRequest.onblocked` como rechazo terminal. Los consumidores esperan con timeout acotado y reutilizan la solicitud original.
- `JS/Tests/IndexedDBTransactions.js` cubre timeout repetido, ausencia de apertura paralela y recuperación tras liberar el bloqueo.
- GitHub Actions en este HEAD: `GPSpedia service regression tests` **success** (run 43779358356); `pages build and deployment` **success** (run 43779357228). Esta verificación confirma workflows completados, no una prueba en navegador Beta.
- La rama base sigue protegida y sin cambios.
- Se creó `Tareas_beta.md` con hallazgos BETA-001…BETA-052, criterios y prioridades.
- El feed Beta sigue requiriendo comprobación de deployment: la traza de `routeAction/getCatalogChanges` no corresponde a la ruta GET pública identificada en el código actual.
- La auditoría de ADMIN confirmó las restricciones de Desarrollador para funciones sensibles; las pruebas de campo para borrar logs, auditoría Drive e imágenes históricas siguen pendientes.
- Próxima tarea: cerrar la auditoría de dispatcher/Coordinator y contratos de BETA-010…BETA-014; después iniciar la estandarización global de componentes de UI.
- No se desplegó Apps Script ni se alteraron secretos, ScriptProperties, hojas, Drive o datos productivos.


---

## Auditoría de políticas ADMIN — 2026-11-15

Se comparó automáticamente la lista de acciones que `admin.js` envía como mutaciones compartidas contra las entradas explícitas de `coordinatorPolicy_('ADMIN', ...)`. Se detectaron tres operaciones despachadas sin política: `markReplacedImageInUse`, `applyCortesImageReconciliation` y `freezeIdentifierFormulas`. El Coordinator rechazaba estas acciones aunque el handler y el control Desarrollador existieran.

Se añadieron políticas de mínimo privilegio:
- `markReplacedImageInUse`: lectura de identidad/Drive/inventario y escritura de IMAGE_INVENTORY/ACTIVITY.
- `applyCortesImageReconciliation`: lectura de identidad/Cortes/Drive/estado de auditoría y escritura de Cortes/Actividad.
- `freezeIdentifierFormulas`: mantenimiento exclusivo, por recorrer y modificar fórmulas de varias hojas.

Se amplió `AdminImageScanCoordinatorContract.mjs` para exigir que cada mutación ADMIN declarada tenga política explícita y verificar los recursos de estas tres acciones. Pendiente CI posterior al commit y validación funcional Beta.


## Continuidad — cobertura adicional de políticas Coordinator (2026-11-15)
- HEAD de partida verificado: `88ed80779162911dde16a77a808e0f2deae2c1e5` en `GPSpedia2.2.5_work`; la comparación GitHub confirmó que la rama estaba idéntica a ese commit.
- Auditoría adicional encontró dos operaciones declaradas en routers pero sin política Coordinator: `ADMIN/auditIdentifiers` (lectura dedicada) y `FEEDBACK/notifyDevelopersDriveCritical` (mutación de Inbox).
- `handleAuditIdentifiers` es lectura; examina Users, Cortes, Tutorial, Feedbacks/PyS, LogosMarca y Relay. La alerta Drive consulta Users y crea conversaciones/mensajes idempotentes en FEEDBACK.
- Corrección preparada en `Coordinator.js` y prueba contractual ampliada para exigir cobertura de todas las lecturas ADMIN dedicadas y mutaciones FEEDBACK.
- Pendiente: publicar los cambios, ejecutar CI y verificar rama/commit. No se ejecutaron pruebas remotas Apps Script ni se modificaron deployments o datos productivos.


### Actualización de validación local — cobertura Coordinator
- Publicación en `GPSpedia2.2.5_work`: políticas Coordinator, contrato y registros actualizados. Último commit de prueba: `30c8b20420995895823551fa1946c95b36001517`.
- Cobertura comprobada: 33 mutaciones ADMIN, 4 lecturas ADMIN dedicadas y 28 mutaciones FEEDBACK; sin políticas faltantes.
- `AdminImageScanCoordinatorContract`: 1/1 PASS ejecutado sobre los archivos recuperados de la rama. Sintaxis de `Coordinator.js`, `admin.js`, `feedback.js` e `InboxConversations.js`: PASS.
- Pendiente: suite integral CI de GitHub Actions y validación remota Beta. La comprobación local no equivale a ejecución en runtime Apps Script.
