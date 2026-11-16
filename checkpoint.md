# Cierre local — GP-UX-INBOX-RBAC-01 / GP-UX-RELAY-HEADER-01 (2026-11-16)

**Rama de trabajo:** `GPSpedia2.2.5_work`  
**HEAD de código validado:** `ed5eb2d1251cd216e18e2f8095ccd44cae0b368b`  
**Rama base protegida:** `GPSpedia2.2.5` — sin modificaciones.  
**PR #128:** permanece abierto en borrador.

## Implementación completada
- Inbox por rol: Desarrollador ve todas las secciones; Jefe ve General, Contáctanos y Reportes; Supervisor ve General y Reportes; Técnico y Técnico Exterior ven General y sus propios Reportes.
- Técnicos consumen la acción existente `getMyProblemReports`, que ya filtra por la identidad autenticada y entrega el texto de respuesta/responsable. No se cambió backend ni Apps Script. La interfaz no muestra acciones administrativas a técnicos.
- Las secciones ocultas se retiran del flujo visual. Nuevo mensaje se muestra como botón flotante; Nuevo y Buscar tienen etiquetas; Salir cancela el compositor, descarta el borrador y evita que una respuesta tardía de destinatarios reabra el formulario.
- El modal Relay alinea el título a la izquierda y ancla el botón X en la esquina superior derecha, separado del contenedor del título.
- Service Worker App Shell v37 y contratos de pruebas sincronizados.

## Validación automatizada
- GitHub Actions Node.js 22 run `43890221048`: **SUCCESS — 129 suites / 1,904 pruebas / 0 fallos**.
- InboxUi: **38/38 PASS**.
- CutDetailModalLayout: **10/10 PASS**.
- ServiceWorkerCache: **9/9 PASS**.
- OfflineBrandAssets: **4/4 PASS**.
- El chequeo de sintaxis de los módulos JavaScript modificados aprobó en el workflow.
- GitHub Pages build y deploy run `43890220482`: todos los jobs de build, deploy y reporte completados con **SUCCESS**.

## Pendiente Beta
- Confirmar visualmente la matriz con cuentas reales de cada rol y tamaños de pantalla.
- Comprobar el botón flotante, las etiquetas, el flujo Nuevo/Salir y los encabezados de Relay en dispositivos objetivo.
- Sin despliegues Apps Script ni cambios en hojas, secretos o datos productivos. La restricción de secciones es frontend, conforme al alcance solicitado; no sustituye autorización del backend.

---

# Continuidad — GP-UX-INBOX-RBAC-01 / GP-UX-RELAY-HEADER-01 (2026-11-16)

**Rama:** `GPSpedia2.2.5_work`  
**Commit de implementación:** `d8324a67efd942d36ce3f477d2a305ca38af549f`  
**Rama base protegida:** `GPSpedia2.2.5` — sin modificaciones.

## Cambios de frontend
- `JS/Frontend/ui.js`: matriz de visibilidad de secciones Inbox por rol. Desarrollador: General, Soporte, Contáctanos, Reportes y Aportaciones. Jefe: General, Contáctanos y Reportes. Supervisor: General y Reportes. Técnico y Técnico exterior: General y únicamente sus propios reportes.
- Los técnicos consultan el endpoint ya existente `getMyProblemReports` desde el frontend; no se modificó Apps Script ni el servicio. El render vuelve a comprobar el propietario mediante `reportMetadata.userId` y no ofrece acciones administrativas de respuesta/resolución/eliminación.
- `index.html` y `style.css`: Nuevo mensaje pasa a botón flotante inferior derecho; Nuevo y Buscar muestran etiquetas. Los elementos ocultos salen del flujo visual y no dejan espacios.
- `JS/Frontend/ui.js`: el formulario de mensaje nuevo incluye Salir; cancelar descarta el borrador y evita que una carga de destinatarios tardía reabra el formulario.
- `JS/Frontend/ui.js` y `style.css`: encabezado del modal Relay con título a la izquierda y botón X independiente en la esquina superior derecha.
- `service-worker.js`: App Shell v37 para invalidar recursos frontend anteriores.
- Pruebas ampliadas en `JS/Tests/InboxUi.mjs` y `JS/Tests/CutDetailModalLayout.mjs`.

## Alcance y validación
- Cambios limitados a frontend, CSS, HTML, pruebas y Service Worker. Sin modificaciones en `JS/Services`, Apps Script, hojas, secretos o datos productivos.
- CI y pruebas locales pendientes de resultado tras el commit; no se declara validación aprobada todavía.
- Pendiente de aceptación visual en dispositivos Beta: matriz por cada cuenta real, botón flotante en distintos tamaños, formularios Nuevo/Salir, y títulos/cierres de Relay.
- La autorización backend existente no se modificó. La restricción por sección de Inbox es una política de presentación/consulta del frontend según el alcance solicitado, no una nueva frontera de seguridad del servicio.

---

# Actualización de continuidad — GP-UX-INBOX-04 (2026-11-16)

**Rama de trabajo:** `GPSpedia2.2.5_work`  
**HEAD de código y pruebas validado:** `5862d79530e3c2d5753c3a6c0ab1ca05f823672b`  
**Rama base protegida:** `GPSpedia2.2.5` — `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; sin modificaciones.  
**PR #128:** se conserva abierto en borrador.

## Resultado
- `index.html`: eliminados los filtros independientes «Leídos» y «No leídos»; «Recibidos» conserva la bandeja conjunta. Se mantienen Enviados, Archivados, Nuevo mensaje y Buscar.
- `JS/Frontend/ui.js`: cada conversación muestra a la izquierda un icono accesible de sobre cerrado si tiene mensajes sin leer y sobre abierto si ya fue leída. El estado se deriva de `unreadCount`; no se modifica el servicio ni el dato persistido.
- `style.css`: barra móvil con cinco columnas iguales y gap constante para todas las acciones. Se elimina la expansión horizontal del botón activo que ocasionaba la superposición y se unifican las dimensiones del botón de búsqueda y los demás controles.
- `JS/Tests/InboxUi.mjs`: pruebas de regresión para la retirada de filtros, distribución móvil y estado de lectura.

## Validación
- GitHub Actions Node.js 22 run `43883547065`: **SUCCESS — 129 suites / 1,901 pruebas / 0 fallos**.
- `InboxUi`: **36/36 PASS**.
- GitHub Pages run `43883547321`: **SUCCESS**.
- La misma validación de regresión volvió a aprobar en el commit documental posterior `141678380127dc705dba7775d83863120f0850bf`.
- Sin cambios en Apps Script, backend, contratos, permisos ni datos de conversaciones.

## Pendiente
- Verificación visual en dispositivo móvil real durante Beta; la corrección estructural y sus regresiones locales están completadas.

---

# Continuidad vigente — GPSpedia (2026-11-16)

**Rama de trabajo:** `GPSpedia2.2.5_work`  
**Último HEAD de código y pruebas validado:** `c973bcd2ea3678a012502b8f9a4da5d059e1751e`  
**Rama base protegida:** `GPSpedia2.2.5` — `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; sin modificaciones.  
**PR #128:** abierto y en borrador; base y head corresponden a las ramas previstas.

## Validación local y CI

- GitHub Actions Node.js 22: **SUCCESS — 126 suites / 1,863 pruebas / 0 fallos** (run `43819335894`).
- GitHub Pages: **SUCCESS** (run `43819335683`).
- El bloque de acceso Developer/sesiones/PWA de la iteración anterior continúa cubierto por sus pruebas.
- Esta iteración completa el bootstrap seguro del esquema Inbox, fallback incremental ante timeout transitorio, actualización optimista de «Vistos recientemente», layout del modelo/logo, pestaña de aportes por usuario y caché PWA v31.
- La URL del servicio actualizada por el usuario en `api-config.js` se conserva y se fuerza su actualización en clientes mediante caché PWA v31; su correspondencia con el deployment Beta todavía requiere comprobación real.

## Siguiente fase

Ejecutar la validación Beta enumerada en `Tareas_Pendientes.md`, empezando por una copia aislada de Spreadsheet. No crear/migrar datos de conversaciones huérfanas, desplegar Apps Script ni alterar secretos o datos productivos. Después continuar la auditoría transversal de alineación de los demás modales, aún pendiente localmente.

---

## Historial de checkpoints
11-15)

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


### Ampliación de lecturas ADMIN
- Se identificaron tres acciones adicionales que antes caían en `ADMIN/sessionActivity`: `checkOperation`, `getAdminImageUploadStatus` y `previewCortesImageReconciliation`.
- Se añadieron políticas de lectura dedicadas; `getAdminImageUploadStatus` reserva escritura de `IMAGE_UPLOAD_LEDGER` porque `getOrCreateAdminImageUploadsSheet()` puede crear la hoja.
- Prueba contractual ampliada para verificar sus recursos y clasificación. Pendiente publicar y ejecutar validaciones locales/CI.


### Resultado de cobertura completa ADMIN — validación local
- Las 41 acciones del `switch` ADMIN están clasificadas como `ping`, mutación compartida o lectura dedicada; no quedan acciones sin clasificación.
- Contrato `AdminImageScanCoordinatorContract`: 1/1 PASS ejecutado sobre el contenido actual de la rama, incluyendo harness de rutas ADMIN/FEEDBACK y cobertura de políticas.
- Sintaxis JavaScript: `Coordinator.js`, `admin.js`, `feedback.js` e `InboxConversations.js` PASS.
- La lectura `getAdminImageUploadStatus` reserva `IMAGE_UPLOAD_LEDGER` en escritura porque su helper puede inicializar la hoja. `previewCortesImageReconciliation` y `checkOperation` reservan sus recursos de lectura para coordinarse con operaciones concurrentes.
- CI integral GitHub Actions pendiente de reporte; validación Beta/runtime Apps Script pendiente. No se ha desplegado ni modificado datos externos.


### CI de la auditoría Coordinator — resultado
- GitHub Actions `GPSpedia service regression tests`, run `43781271855`, commit `9370827c8d6ab8fb12ce8db80930c5e3b8bdbbb8`: **SUCCESS**, 106 suites, 1,653 pruebas, 0 fallos; sintaxis de módulos modificados PASS.
- `pages build and deployment`, run `43781271945`: pendiente al momento de la consulta. No equivale a despliegue de Apps Script.


## GP-BETA-06 — corrección de ruta suggestYear
- Hallazgo: `suggestYear` no tenía entrada en `FEEDBACK_ACTION_PERMISSIONS`; las solicitudes autenticadas omitían Coordinator y revalidaban sesión/rol leyendo Users y ActiveSessions en `assertFeedbackSession`.
- Corrección: `suggestYear: null` en la matriz autenticada; dispatcher coordina `FEEDBACK/sessionActivity`. Solo `userId=0` conserva ruta anónima sin lease.
- Prueba nueva `SuggestYearCoordinatorSession.mjs`: verifica actor confiable, ausencia de acceso local a Users/ActiveSessions y anonimato. Integrada en `RunServiceTests.mjs`.
- Pendiente: CI y revisión global de acciones protegidas que aún puedan omitir el Coordinator.


---

## Continuidad — GP-BETA-06: corregir despacho de suggestYear (2026-11-16)

**Código validado:** `0ba72b55c88297132035380998c6e70f8d4c1cb2`  
**HEAD documental posterior:** `d0a90454d26185d769db124166264921a69810b7`  
**CI de servicios:** run `43782403026` SUCCESS — 107 suites / 1,655 pruebas / 0 fallos; sintaxis PASS.  
**GitHub Pages:** run `43782402510` pendiente al momento del registro.

- Causa raíz: la excepción `userId=0` de `suggestYear` estaba dentro de la rama de acciones que no son mutaciones. Como `suggestYear` sí requiere una lease de mutación específica para proteger Cortes y Feedback, la ruta anónima era inalcanzable y solicitaba sesión.
- Corrección: evaluar la ruta anónima antes de clasificar la acción. La sugerencia anónima continúa sin sesión/lease; la autenticada conserva `FEEDBACK/suggestYear` y recibe actor central.
- Se corrigieron dos defectos de la prueba: expectativa incorrecta de `sessionActivity` en vez de `suggestYear`, y extracción de política FEEDBACK que asumía un orden de servicios incorrecto.
- No se eliminaron controles de sesión, epoch, revocación ni autorización. No se desplegó Apps Script ni se modificaron ScriptProperties, secretos, hojas, Drive o datos externos.
- Validación Beta pendiente para ambos caminos y para una aplicación real del umbral de sugerencias.

### Siguiente trabajo
1. Continuar auditoría end-to-end de GP-BETA-03 (limpieza de ActividadUsuario y Logs), GP-BETA-04 (auditoría Drive) y GP-BETA-05 (historial de imágenes).
2. En GP-BETA-03, el código revisado declara rutas, permisos y políticas Coordinator para `clearActivityLogs` (solo Desarrollador) y `clearSensitiveLogs` (AUTH, solo Desarrollador); falta validar respuesta real de FEEDBACK/AUTH en Beta.
3. En GP-BETA-04/05, revisar configuración y deployment de ADMIN, esquema real de `Imagenes_Reemplazadas`, acceso Drive y resultados de las rutas. No inferir que una prueba local demuestra acceso real.
4. Completar auditoría de acciones de lectura FEEDBACK/Inbox y sus recursos coordinados. Mantener actor central y RBAC backend; no quitar revocación/expiración.
5. Confirmar el resultado de Pages para el HEAD correspondiente. No realizar despliegues Apps Script ni cambios productivos.


## Continuidad — correcciones Developer/Drive (2026-11-16)

**Código validado:** `dac1f3f0c5cf519a19eaab1d08731b861da388d5`  
**HEAD documental posterior:** `6db6d6a229b42a8bb7c29e6c40ce592822d7363a`  
**CI servicios:** run `43782723331` SUCCESS — 107 suites / 1,656 pruebas / 0 fallos.  
**GitHub Pages:** run `43782722962` en progreso al momento del registro.

### Hallazgos corregidos
1. **Payload Developer (AUD-2026-11-16-03):** `getDeveloperSessionPayload()` solo leía `currentUser.ID`, mientras el contexto de sesión acepta `ID` o `id`. Se unificó con `getUiSessionContext_()`. Esto puede bloquear localmente limpieza de logs, historial de imágenes, auditoría Drive y otras operaciones administrativas en sesiones heredadas. Prueba añadida para ambos formatos.
2. **Recursos Coordinator (AUD-2026-11-16-02):** `collectActiveDriveReferences()` recorre todas las hojas, incluida `Relay`. Se añadió `RELAY` a las políticas de `getReplacedImages`, `previewCortesImageReconciliation` y `auditDriveImagesInCortes`, y se reforzó el contrato.

### Validación y límites
- CI valida contratos y pruebas aisladas, no acceso real a Google Apps Script, Spreadsheet o Drive.
- No se desplegó Apps Script ni se modificaron ScriptProperties, secretos, hojas, Drive o datos externos.
- GP-BETA-03 (limpieza de logs), GP-BETA-04 (auditoría Drive) y GP-BETA-05 (historial de imágenes) siguen pendientes de validación Beta con las sesiones reales. La causa de payload ID/id puede explicar fallos comunes a estas acciones, pero no se afirma que sea la única causa.
- GP-BETA-06 (suggestYear) quedó corregido en código y CI; falta validación Beta de las rutas anónima y autenticada.

### Siguiente trabajo
1. Continuar auditoría end-to-end de Inbox (listar conversaciones, cargar mensajes, marcar lectura y permisos por rol).
2. Revisar y probar los despachadores FEEDBACK/AUTH de limpieza de logs con contratos de ruta y actor, sin eliminar controles centrales de revocación/expiración.
3. Revisar duración y reanudación de `auditDriveImagesInCortes`, además del estado/esquema real de `Imagenes_Reemplazadas`.
4. Investigar discrepancias de versión/deployment y caché entre assets servidos y rama; no deducir deployment a partir de GitHub Pages.
5. Mantener despliegues Apps Script y pruebas productivas fuera de esta iteración.


## Continuidad — optimización de historial y auditoría Drive (2026-11-16)

**Código validado:** `6794022176044b25958de1aa77598c4c1bf0424a`  
**CI servicios:** run `43783119482` SUCCESS — 107 suites / 1,656 pruebas / 0 fallos.  
**GitHub Pages:** ejecución asociada pendiente al momento del registro.

- `handleGetReplacedImages()` ya no materializa ubicaciones completas por cada referencia activa; usa `collectActiveDriveReferences(false)`. El consumidor solo necesita detectar si hay alguna referencia y el UI sigue bloqueando acciones destructivas cuando `active_reference_count > 0`.
- La lectura del historial usa timeout acotado de 120 s y dos intentos de lectura segura.
- El primer lote de `auditDriveImagesInCortes` dispone de 120 s para capturar referencias e historial; las continuaciones con cursor conservan 45 s y hasta tres intentos.
- La suite de regresión detectó una aserción antigua que esperaba 45 s para la primera captura; se actualizó y el CI final pasó.
- No se desplegó Apps Script ni se modificaron hojas, Drive, secretos o propiedades externas.

### Estado Beta
- GP-BETA-03 (borrado de Logs/ActividadUsuario), GP-BETA-04 (auditoría Drive), GP-BETA-05 (historial de imágenes) y GP-BETA-06 (suggestYear) siguen abiertos hasta validación Beta.
- La incompatibilidad `ID/id` puede explicar fallos locales de múltiples acciones Developer; el costo del escaneo y el timeout inicial eran riesgos adicionales corregidos. No se afirma que sean las únicas causas posibles.
- Inbox sigue sin causa raíz reproducida en el código de la rama: sus contratos de handler/rol/dispatch están cubiertos por pruebas, pero falta correlacionar el error de Beta y confirmar que FEEDBACK/InboxConversations esté desplegado con la misma versión.

### Siguiente trabajo
1. Auditar la interacción UI → API → FEEDBACK → InboxConversations para aislar el error Beta de lectura de conversaciones y mensajes.
2. Añadir/ejecutar contratos de despacho FEEDBACK para las lecturas Inbox y verificar que actor central y sesión se adjunten sin reconsultas locales a Users/ActiveSessions.
3. Seguir con el modal de detalle de corte y medir llamadas redundantes de opciones/carga; conservar la edición autorizada de Jefe/Supervisor/Desarrollador.
4. Revisar el resultado de GitHub Pages del HEAD más reciente. No confundirlo con deployment Apps Script.
5. Mantener los despliegues y pruebas productivas fuera de esta iteración.


## Continuidad — optimización de dropdowns del modal de Cortes (2026-11-16)

**Código validado:** `d828852ed2f4a223cfcbe6256dbfdce438ecf533`  
**CI servicios:** run `43783436013` SUCCESS — 108 suites / 1,657 pruebas / 0 fallos.  
**GitHub Pages:** ejecución asociada en progreso al momento del registro.

- Causa de latencia: `mostrarDetalleModal()` inicia `precargarDropdownOptions()` y el botón Editar espera esa promesa. `handleGetDropdownData()` leía los rangos completos de Cortes y Relay aunque solo necesitaba cinco columnas de Cortes y una de Relay.
- Corrección: CATALOG lee un rango contiguo acotado que cubre las columnas requeridas de Cortes y una columna de Relay; mantiene la lectura de validación de categoría. No usa `getDataRange()` para esa acción.
- Nueva suite `CatalogDropdownRead.mjs` verifica datos, unicidad, orden y rangos de lectura. CI: 108 suites / 1,657 pruebas / 0 fallos.
- Pendiente medir la latencia real en Beta y comprobar la respuesta de CATALOG desplegado. No se desplegó el servicio ni se leyeron hojas reales.

### Pendientes prioritarios
1. Inbox: continuar correlación UI/API/FEEDBACK y verificar deployment real antes de atribuir el fallo a la lógica local.
2. Logs: validar las dos rutas de borrado (ActividadUsuario y Logs) con el payload Developer normalizado y confirmar respuesta/contadores.
3. Drive: validar auditoría y biblioteca de imágenes con tiempos reales, esquema y permisos Drive.
4. Modal de Cortes: medir tiempo desde abrir detalle hasta controles editables; verificar que dropdowns se precarguen y la edición no espere IndexedDB opcional.
5. Confirmar Pages para el último HEAD documental; no confundir Pages con despliegue Apps Script.


## Continuidad — Inbox: lectura y diagnóstico de esquema (2026-11-16)

**Código validado:** `110aae3f17575f0ff06b3ef61957db51a84cbecc`  
**CI servicios:** run `43783775316` SUCCESS — 108 suites / 1,660 pruebas / 0 fallos.  
**GitHub Pages:** ejecución asociada en progreso al momento del registro.

- Causa corregida: la consulta de conversaciones devolvía lista vacía cuando faltaba una de las hojas Conversations/State, ocultando un esquema parcial como si no existieran mensajes.
- Ahora ambas hojas ausentes significan Inbox nuevo y vacío; solo una ausente produce error explícito. También se informa si una conversación registra mensajes pero falta la hoja InboxMessages.
- Se amplió `InboxConversations.mjs` con pruebas de hojas incompletas y despacho FEEDBACK: las lecturas Inbox reciben actor central mediante `sessionActivity`; las escrituras usan su lease específica. No se añadieron revalidaciones a Users/ActiveSessions.
- CI usa Spreadsheet simulado. La estructura y datos reales de Beta siguen sin inspeccionar; no se ejecutó migración ni se modificaron hojas.

### Estado Inbox
- El contrato UI/API/FEEDBACK/Inbox está cubierto por las pruebas, y el despacho central de actor está validado.
- Si Beta tiene una hoja parcial, el cliente ahora debe mostrar un error explícito en vez de un Inbox vacío. Para reparar, primero habrá que inspeccionar las hojas y preservar datos existentes; no crear/renombrar hojas automáticamente a ciegas.
- Si el esquema está completo y el error persiste, el siguiente dato necesario es la respuesta real del servicio FEEDBACK para `getInboxConversations` o `getInboxMessages`, junto con la versión desplegada. No se puede deducir desde GitHub.

### Siguiente trabajo
1. Continuar auditoría de UI/API Inbox, revisar filtros de carpeta (received/sent/unread/archived) y lectura de mensajes.
2. Seguir con limpieza de Logs, auditoría Drive e historial de imágenes; verificar los resultados en Beta cuando el despliegue autorizado esté disponible.
3. Revisar latencia real de dropdowns y modal de edición de Cortes.
4. Confirmar GitHub Pages del último HEAD documental; no confundirlo con Apps Script deployment.


## Continuidad — limpieza de Logs/ActividadUsuario (2026-11-16)

**Código validado:** `fe9749c7f57f1a70f72850543e881266e90c0b9b`  
**CI servicios:** run `43783958890` SUCCESS — 108 suites / 1,662 pruebas / 0 fallos.

- Auditoría end-to-end de dispatcher: `clearSensitiveLogs` → AUTH/lease específica, política de escritura LOGS, actor central y rol Desarrollador.
- `clearActivityLogs` → FEEDBACK/lease específica, política ACTIVITY, actor central y RBAC Desarrollador.
- UI utiliza el payload normalizado ID/id corregido anteriormente.
- `SensitiveLogsTrustedActor.mjs` prueba ambos despachadores y recursos; 6/6 PASS.
- No se reprodujo contra hojas reales. Si Beta continúa fallando después del despliegue autorizado, registrar respuesta y contadores de la operación; no quitar controles de sesión o RBAC.
- No se desplegaron AUTH/FEEDBACK ni se modificaron hojas externas.

### Estado
- GP-BETA-03: rutas y contratos de borrado verificados; causa común probable ID/id corregida; ejecución Beta pendiente.
- GP-BETA-04/05: auditoría Drive e historial optimizados; ejecución Beta pendiente.
- GP-BETA-010/Inbox: esquema parcial ahora genera error explícito; inspección Beta pendiente.
- GP-BETA-02: lectura de dropdowns reducida; medición Beta pendiente.


## Continuidad — compatibilidad de sesión en VIN y cortes pendientes (2026-11-16)

**Código validado:** `a431fd3c709954dc0b08fc2446c56caf10ff8b62`  
**CI servicios:** run `43784270101` SUCCESS — 108 suites / 1,663 pruebas / 0 fallos.

- La auditoría posterior encontró más accesos UI que dependían solo de `currentUser.ID`: registro de VIN, recuperación de operación pendiente, validación de propietario y envío/reintento de `addOrUpdateCut`.
- Todos ahora resuelven userId/token mediante `getUiSessionContext_()`, compatible con ID/id. Se conserva el control que impide reintentar una operación pendiente bajo una cuenta distinta.
- La suite UI impide reintroducir accesos ID-only.
- Beta pendiente con sesión heredada, VIN y operación pendiente real. No se desplegaron AUTH/WRITE.



## Continuidad — corrección del orden canónico del Inbox (2026-11-16)

**HEAD de código:** `fd800c270985a15afba1f3e6f283eabd17988217`  
**Commit:** `fix: preservar orden canonico de mensajes Inbox`

- Se revisó el flujo completo de Inbox: wrapper UI/API, dispatcher FEEDBACK, actor central, handlers de lista y mensajes y contratos de paginación.
- El backend conserva el orden de inserción porque los timestamps pueden coincidir o retroceder. El frontend reordenaba por `createdAt` al combinar la caché con la respuesta más reciente, contradiciendo el contrato del backend.
- Se agregó `mergeInboxMessagePages`: conserva el orden de inserción, actualiza mensajes repetidos en su posición y agrega los nuevos en el orden recibido. Se mantiene la caché por sesión, la paginación y la lectura hasta el último mensaje.
- Regresión añadida en `JS/Tests/InboxUi.mjs`: fechas retrocedidas, actualización de un ID existente e idempotencia de la combinación.
- CI run `43786801781`: SUCCESS — 108 suites / 1,664 pruebas / 0 fallos; `InboxConversations` 50/50, `InboxUi` 25/25 y comprobaciones `node --check` PASS.
- GitHub Pages run `43786801161`: build y deploy SUCCESS.
- No se desplegaron Apps Script ni se modificaron Spreadsheet, Drive, secretos o datos productivos. La comprobación real de lectura de mensajes sigue pendiente en Beta.

**Siguiente trabajo:** completar la auditoría local de BETA-010 a BETA-014 y continuar con BETA-020 a BETA-026. La validación externa requiere deployments y cuentas Beta; no se marcará como aprobada sin evidencia.


## Auditoría local de permisos y coordinación ADMIN/FEEDBACK (2026-11-16)

- Se revisaron las rutas de borrado de logs, auditoría Drive, historial de imágenes, leases de lectura/escritura y matriz de acciones protegidas.
- BETA-010: FEEDBACK/clearActivityLogs y AUTH/clearSensitiveLogs requieren actor Desarrollador.
- BETA-011/012: auditoría Drive e historial usan rutas ADMIN protegidas y políticas explícitas; la lectura del historial no habilita mutaciones.
- BETA-013: las lecturas ADMIN tienen leases dedicadas; el escáner conserva lease propia para IMAGE_AUDIT_STATE. La latencia/concurrencia real sigue sin medirse en Beta.
- BETA-014: mapa, dispatcher y handlers están cubiertos por ActionDispatchContract; matriz de roles por VehicleModalRolePolicy y contratos ADMIN.
- BETA-050/051: los routers protegidos pasan el actor central a los handlers; se evita repetir búsquedas Users/ActiveSessions, conservando expiración, epoch, revocación y RBAC.
- CI run `43786801781`: 108 suites / 1,664 pruebas / 0 fallos. Pages run `43786801161`: SUCCESS.
- No se ejecutaron llamadas HTTP contra deployments Beta ni se modificaron servicios, hojas, Drive o datos productivos. Mantener estas tareas abiertas hasta obtener evidencia de campo.


## Continuidad — BETA-020 botones de cierre uniformes (2026-11-16)

- Commit de implementación: `af0f5653ab63dcac15b40b3bc45a3df1f58f74cf`.
- Se convirtieron los controles `.info-close-btn` y `.close-btn` en botones reales con `type=button` y `aria-label`, incluidos modales dinámicos, panel de usuarios, Inbox y lightbox.
- Estilo común: 40×40 px, icono ×, posición superior derecha (salvo ubicación propia del lightbox), contraste por tema, hover, foco visible y movimiento reducido.
- La primera prueba independiente no se ejecutó por el runner; se integró en `InboxUi.mjs`. El intento inicial falló por doble escape de regex (`43787293937`); corregido en commit `2d00b684c755329bb9443f1956658aaacfd0df70`.
- CI final run `43787361351`: SUCCESS — 108 suites / 1,670 pruebas / 0 fallos; InboxUi 31/31.
- GitHub Pages run `43787360402`: build/deploy SUCCESS.
- BETA-020 queda implementada localmente, pendiente de validación visual y accesible en Beta real. BETA-021–026 siguen pendientes de implementación.

**Siguiente paquete:** BETA-021 (sistema global de botones, campos y selectores), seguido de BETA-022–026. No desplegar Apps Script ni modificar datos productivos.


## Aclaración de alcance UX — continuidad (2026-11-16)

El usuario confirmó que el backlog pendiente también comprende la organización integral del modal Desarrollador, nuevos requerimientos visuales/estructurales, política para nombres largos, reducción de textos demasiado detallados y ayudas funcionales mediante ⓘ. Se incorporaron los criterios de aceptación a `Tareas_Activas.md` y `Tareas_beta.md`, dentro de BETA-021–026 y BETA-030–035. La política conserva los datos originales, evita desbordamientos y exige que ⓘ explique función, efecto y restricciones de forma breve. Sigue vigente la exclusión de ayudas ⓘ en el modal de detalles de vehículos. GP-DEV-UX-01 no se reabre: su alcance original permanece completado.


## Consolidación del backlog operativo — 2026-11-16

- Se creó `Tareas_Pendientes.md` como documento único de trabajo, agrupado por sectores y orden de ejecución.
- Se integraron los pendientes de implementación local, auditoría, seguridad, UX/Developer, Inbox, ADMIN/Drive, catálogo/PWA, migraciones y validaciones Beta; se separaron explícitamente los estados locales y externos y se eliminaron duplicaciones evidentes.
- `Tareas_Activas.md` y `Tareas_beta.md` dejan de ser documentos operativos y se retiran después de comprobar la consolidación. El historial de avances y evidencia permanece en este checkpoint y en los archivos archivados.
- La primera tarea de implementación será BETA-021: sistema visual común de botones, campos y selectores, integrando los criterios de nombres largos, textos concisos, ayudas contextuales y organización Developer ya confirmados.
- Rama de trabajo: `GPSpedia2.2.5_work`. Rama base `GPSpedia2.2.5` sin modificaciones.
- No se realizaron despliegues Apps Script ni cambios en datos, propiedades, secretos o recursos productivos.


## Continuidad — BETA-021 sistema global de controles (2026-11-16)

- **Commit:** `b4112e798abe831059f6c6d929d3cf82743a2689` — `feat: estandarizar controles globales de formulario`.
- Se amplió `button-system.css` para centralizar botones y controles de formulario: inputs de texto, selects y textareas; tokens semánticos por tema; tamaños, bordes, tipografía, foco visible, disabled, error, placeholders y reglas responsive.
- Se excluyeron checkbox, radio, file, range, color y controles de acción. Se preservaron excepciones compactas del editor enriquecido, consola Developer e Inbox.
- Se agregó `JS/Tests/GlobalControlSystem.mjs` y se integró al runner real de CI.
- **Prueba específica:** GlobalControlSystem 7/7 PASS.
- **CI:** run `43788784398` SUCCESS — 109 suites / 1,677 pruebas / 0 fallos; comprobaciones de sintaxis PASS.
- **GitHub Pages:** run `43788783931` SUCCESS.
- BETA-021 queda completada localmente con validación visual Beta pendiente. No se ejecutaron pruebas en navegador real ni se desplegaron Apps Script.
- **Siguiente tarea local:** BETA-022, ajustar dimensiones de botones para evitar anchos completos o excesivos sin afectar etiquetas accesibles ni formularios que requieren ancho completo.
- Rama base `GPSpedia2.2.5` permanece intacta.


## Continuidad — BETA-022 dimensiones de botones (2026-11-16)

- **Commit:** `8ac4f361a5c4ac798a20e50850448587c319b204` — `fix: ajustar ancho de botones por contexto`.
- Las acciones Developer y las acciones de biblioteca de imágenes usan ancho automático en escritorio; en móvil las acciones Developer se apilan y ocupan el ancho disponible.
- Se ajustaron botones de selección de imágenes y acciones Inbox para evitar expansión innecesaria; se preservó el ancho completo donde es funcional (formularios, navegación y `.btn-block`).
- `DeveloperPanelUX`: 6/6 PASS; `ButtonWidthPolicy`: 5/5 PASS.
- **CI:** run `43789193097` SUCCESS — 110 suites / 1,682 pruebas / 0 fallos.
- **GitHub Pages:** run `43789192638` SUCCESS.
- BETA-022 queda completada localmente; validación visual Beta pendiente.
- **Siguiente tarea local:** BETA-023, unificar el formato de presentación del contenido descriptivo y su preferencia de configuración en todas las vistas.
- No se modificó la rama base ni se desplegaron servicios Apps Script.


## Continuidad — BETA-023 preferencia global de formato descriptivo (2026-11-16)

- **Último commit de implementación/pruebas:** `4928ceb1ab89eeda6e1879279448164d1c1996fe` — `test: usar normalizador real en preferencia global`. La implementación quedó en la secuencia iniciada por `f1c35fb`, con correcciones de referencia y validación antes del cierre.
- Se retiró la preferencia local como fuente de verdad. `getRichTextMode` consulta FEEDBACK; el servidor conserva el valor en `GPSpedia_RICH_TEXT_MODE_V1` de ScriptProperties, con `strict` como valor inicial.
- Todos los roles autenticados pueden leer la preferencia. La escritura está restringida a Desarrollador mediante `FEEDBACK_ACTION_PERMISSIONS` y se coordina con el recurso `RICH_TEXT_CONFIG`.
- La interfaz carga el modo global al iniciar/restaurar sesión; la caché del navegador solo conserva el último valor recibido. El selector Developer espera confirmación backend antes de actualizar la caché.
- **Prueba específica:** `RichTextGlobalPreference` 9/9 PASS.
- **CI final:** run `43789831187` SUCCESS — 111 suites / 1,691 pruebas / 0 fallos.
- **GitHub Pages:** run `43789830673` SUCCESS.
- CI intermedio detectó una referencia de constante y una expectativa incorrecta del mock; ambas se corrigieron y la ejecución final quedó verde.
- BETA-023 queda completada localmente; la activación y validación del servicio FEEDBACK/Coordinator en Beta siguen pendientes. No se escribieron ScriptProperties reales ni se desplegaron servicios.
- **Siguiente tarea local:** BETA-024, completar la política de textos breves y ayudas contextuales `ⓘ` bajo demanda, sin perder advertencias ni información necesaria.
- Rama base `GPSpedia2.2.5` permanece intacta.


## Continuidad — BETA-024 ayudas contextuales y textos concisos (2026-11-16)

- **Último commit de implementación/pruebas:** `480893141157a45b7a7e1368a45d57d65c67881e` — `test: ajustar contraste contextual con fallback semántico`.
- Se creó `contextual-help.css` y se unificó el patrón visual y semántico de ayudas `ⓘ` entre `index.html`, formularios dinámicos de `ui.js` y `HTML/add_cortes.html`.
- Los disparadores comparten las clases `.gp-help-trigger` / `.gp-help-popover`; tienen nombre accesible, estado expandido, relación con el panel, descripción asociada al abrir, foco visible y cierre por pulsación fuera/Escape con restauración de foco.
- Los botones de ayuda se separaron de las etiquetas `label`; se evitó anidar controles interactivos. La hoja compartida se incluyó en `CORE_ASSETS` del Service Worker.
- Se preservó la exclusión explícita del modal de detalles de vehículos.
- **Prueba específica:** `ContextualHelpForms` 16/16 PASS.
- **CI final:** run `43790442965` SUCCESS — 111 suites / 1,695 pruebas / 0 fallos.
- **GitHub Pages:** run `43790443032` SUCCESS (build y deploy).
- Las primeras ejecuciones detectaron errores en el contrato de prueba (declaración duplicada y expectativa de fallback CSS); se corrigieron antes de la ejecución final.
- BETA-024 queda completada localmente; la comprobación visual y accesible en dispositivos reales sigue pendiente de Beta. No se desplegaron servicios Apps Script.
- **Siguiente tarea local:** BETA-025, política de nombres largos, títulos y etiquetas sin modificar el valor original almacenado.
- Rama base `GPSpedia2.2.5` permanece intacta.


## Continuidad — BETA-025 nombres largos y desbordamientos (2026-11-16)

- **Último commit de implementación/pruebas:** `472f998cdb50057396bcbcc4c02f3918fb449358` — `test: permitir propiedades flexibles en Inbox`.
- Se eliminó la elipsis del título de Inbox y de las tarjetas/listas de problemas e imágenes; los textos se ajustan a varias líneas y los contenedores permiten crecer sin desbordar.
- Se unificó el ajuste de títulos, etiquetas, botones y celdas; las pestañas compactas de Developer conservan su nombre completo accesible mediante texto y atributo `title`.
- Los nombres de archivos y problemas siguen usando el valor íntegro. En la lista de asociación PYS se sustituyó interpolación HTML por nodos y `textContent`, evitando interpretar el nombre como marcado.
- **Prueba específica:** `LongNameLayout` 7/7 PASS.
- **CI final:** run `43790916325` SUCCESS — 112 suites / 1,702 pruebas / 0 fallos.
- **GitHub Pages:** run `43790916506` SUCCESS.
- Las ejecuciones intermedias detectaron contratos de prueba demasiado estrictos frente a reglas CSS ya existentes; se corrigieron y la ejecución final quedó verde.
- BETA-025 queda completada localmente; validación con nombres reales en dispositivos Beta pendiente. No se alteraron nombres almacenados ni se desplegaron servicios Apps Script.
- **Siguiente tarea local:** BETA-026, reorganizar el modal de detalle/corte sin agregar ayudas `ⓘ` al modal de detalles de vehículos, preservando sus acciones y permisos.
- Rama base `GPSpedia2.2.5` permanece intacta.


## Continuidad — BETA-026 modal de detalle y apertura rápida de edición (2026-11-16)

- **Último commit de implementación/pruebas:** `d2cbb2da7048ad697fec0b3cddaf88dbf549e152` — `test: ajustar comprobación de carga asíncrona de opciones`.
- El modal de detalle se organiza con barra de acciones flexible, título/metadatos separados, edición en cuadrícula de dos columnas y una columna en móvil, nota de ancho completo, imagen limitada y secciones visuales para corte recomendado y acordeones.
- Se añadieron asociaciones label/id a los campos y nombres accesibles a los botones de compartir, imprimir, editar, guardar, descartar y ampliar. Se preservan permisos y operaciones existentes.
- **Corrección de latencia:** se eliminó el `await precargarDropdownOptions()` antes de abrir el editor. La vista de edición aparece de inmediato; los cuatro tipos de selector se hidratan al resolverse la promesa compartida, manteniendo el valor actual y evitando solicitudes duplicadas.
- Se corrigió el contenedor de metadatos para que el formulario de edición no inserte un `div` dentro de un `p`.
- No se agregaron botones `ⓘ` al modal de detalles de vehículos.
- **Prueba específica:** `CutDetailModalLayout` 8/8 PASS.
- **CI final:** run `43791647009` SUCCESS — 113 suites / 1,710 pruebas / 0 fallos.
- **GitHub Pages:** run `43791646615` SUCCESS.
- BETA-026 queda completada localmente; la validación con latencia real, servicios desplegados y dispositivos Beta sigue pendiente. No se desplegaron servicios Apps Script.
- **Siguiente tarea local:** BETA-033 — implementar confirmaciones desde la consola Developer con respuestas normalizadas y rechazo de respuestas ambiguas. BETA-030 y BETA-031 permanecen reportadas como implementadas localmente, pendientes de revisión y validación Beta; el backlog no contiene BETA-027–029.
- Rama base `GPSpedia2.2.5` permanece intacta.


## Continuidad — BETA-032 consola central Developer (2026-11-16)

- **Último commit de implementación/pruebas:** `5fad7d6bd63bf4255b8113ca1bfe942e2b27597f` — `feat: centralizar mensajes del panel Developer`.
- La consola se mantiene en la parte superior del modal con la altura objetivo del 50% (contrato visual ya cubierto por `DeveloperPanelUX`).
- Se agregó detección del estado abierto del modal Developer. Mientras está activo, `showGlobalError` y `showGlobalNotification` envían errores, éxitos y advertencias al registro central y retornan antes de crear toast/alertas paralelas.
- Los diagnósticos extensos se conservan en cola si el registro aún no está inicializado y se vacían al abrir el panel.
- La acción de copiar errores/advertencias ya no usa `alert()`; sus resultados se registran en la consola.
- **Prueba específica:** `DeveloperConsoleRouting` 5/5 PASS.
- **CI final:** run `43792062783` SUCCESS — 114 suites / 1,715 pruebas / 0 fallos.
- **GitHub Pages:** run `43792061714` SUCCESS.
- BETA-032 queda completada localmente; falta comprobar el flujo completo de operaciones en Beta y que no se dupliquen mensajes. No se desplegaron servicios Apps Script.
- **Siguiente tarea local:** BETA-033 — implementar confirmaciones desde la consola, con respuestas normalizadas y rechazo de respuestas ambiguas.
- Rama base `GPSpedia2.2.5` permanece intacta.


## Continuidad — BETA-033 confirmaciones desde consola Developer (2026-11-16)

- Se añadió `JS/Frontend/developerConsoleConfirmation.js` para normalizar respuestas afirmativas/negativas con un contrato explícito: `y`, `si/sí`, `s`, `ok`; `n`, `no`. Las entradas desconocidas o ambiguas se rechazan.
- `JS/Frontend/ui.js`: las operaciones administrativas esperan una confirmación desde el campo de terminal de Developer; la entrada se intercepta antes de procesar comandos. Respuesta negativa, Escape o timeout de 120 s cancela la operación.
- Las confirmaciones inválidas mantienen la solicitud pendiente y no autorizan acciones. Se reemplazaron las llamadas nativas `confirm()` de las operaciones administrativas, auditorías, conciliación e historial de imágenes del panel Developer.
- Prueba específica integrada en CI: `DeveloperConsoleConfirmation` (8 casos).
- Pendiente: ejecutar prueba visual/teclado en navegador Beta y comprobar acciones con permisos y servicios del entorno. No se desplegaron Apps Script ni se modificaron datos externos.
- **Siguiente tarea local:** BETA-034 — unificar los mensajes de resultados de operaciones Developer y retirar notificaciones externas duplicadas.


### Ajuste de contratos de pruebas — BETA-033
- CI del primer cambio BETA-033 detectó dos pruebas de regresión que exigían explícitamente `window.confirm()` en las acciones del historial de imágenes. La implementación nueva las trasladó a la confirmación central de consola, por lo que esas expectativas quedaron obsoletas.
- Se actualizaron los contratos `AdminReplacedImagesIntegrity` y `ReplacedImagesLibraryUX` para exigir la confirmación central y rechazar la reintroducción del cuadro nativo.
- La ejecución de regresión posterior debe confirmar que las dos suites y `DeveloperConsoleConfirmation` aprueban juntas.


- CI posterior detectó una tercera expectativa heredada de `window.confirm()` en `DevToolsModalAccessibility.mjs`; se actualizó para verificar la confirmación de consola en la limpieza destructiva. El código JavaScript modificado ya pasó `node --check`; se repite la regresión completa tras alinear el contrato.


## Continuidad — cierre BETA-033 y BETA-034 (2026-11-16)

### BETA-033 — Confirmaciones desde consola
- Commits: `0f22266195433511b30b57d071d420e90340f0d0`, `1cf9ba3cf74d806d215796448abe362bacd35ea8`, `5f6d47d41cb1f30ca44fe678e93512e7187cc156`, `ac1250c93bbb4839824994facd5c3155b7ab913c`.
- Se extendieron las confirmaciones centralizadas a acciones masivas e individuales del historial, auditoría e inventario Drive.
- Se actualizaron contratos que exigían el cuadro nativo: `AdminReplacedImagesIntegrity`, `ReplacedImagesLibraryUX` y `DevToolsModalAccessibility`.
- CI run `43793034169`: SUCCESS — 115 suites / 1,723 pruebas / 0 fallos. `DeveloperConsoleConfirmation`: 8/8 PASS. GitHub Pages run `43793033743`: pendiente de confirmar en este checkpoint.
- La sintaxis de los módulos JavaScript modificados aprobó en CI.

### BETA-034 — Mensajes centralizados de operaciones
- Se añadió `logDeveloperOperation_`, que dirige mensajes al registro central Developer y usa consola del navegador como fallback sin generar alertas o toasts paralelos.
- Gestor de imágenes: errores, resultados individuales/masivos, movimiento, restauración, borrado, descarga y creación de carpetas.
- Auditoría Drive: inicio, progreso por lote, finalización/error; inventario y organización: confirmaciones, resultados y fallos parciales; conciliación: simulación, progreso, aplicación y rollback.
- Se mantienen los estados detallados en cada vista y se evita duplicar avisos externos.
- Prueba específica integrada en CI: `DeveloperOperationMessages` (5 casos). Pendiente ejecución de regresión y validación visual/operativa Beta.
- **Siguiente tarea local:** BETA-035 — compactar textos y etiquetas del panel Developer y trasladar explicación secundaria a ayudas contextuales.


### Ajuste de contrato de prueba — BETA-034
- CI detectó una expectativa literal antigua en `CortesImageReconciliationUI.mjs`: el test exigía construir el texto directamente en `textContent`. BETA-034 extrae el mismo texto a `reconciliationMessage` para reutilizarlo en la consola central y el estado de vista.
- Se actualizó el contrato para exigir tanto la variable compartida como su registro en la consola; el resultado funcional del mensaje se conserva.


- La primera actualización del contrato de conciliación tenía escapes de regex dobles y no coincidía con el código fuente; se simplificó a comprobaciones literales del mensaje compartido y del registro central.


## Continuidad — BETA-034 y BETA-035 (2026-11-16)

### BETA-034 — Mensajes centralizados
- Commit de implementación: `08155faddd3c0e47e68d82c38c3cac3e4d03ed01`; ajustes de contrato: `eb2685f8471f58d811c501d25f9a3a8f3d654353`, `1f38b73c34247d9dc56fb88111d442678bc8e64f`.
- CI run `43793590851`: SUCCESS — 116 suites / 1,728 pruebas / 0 fallos. `DeveloperOperationMessages`: 5/5 PASS. GitHub Pages run `43793590112`: SUCCESS.
- Se mantiene pendiente la validación visual/operativa en navegador Beta.

### BETA-035 — Textos compactos y ayudas contextuales
- `index.html`: títulos y acciones breves; explicaciones secundarias trasladadas a botones `ⓘ` accesibles en panel Developer, biblioteca y auditoría.
- `style.css`: filas de encabezado con ayuda y ajuste responsive.
- Se preservan IDs y acciones; se mantiene sin cambios el modal de detalle de vehículos.
- Suite `DeveloperPanelCopy` (6 casos) agregada al runner; pendiente CI y validación visual.


- Ajuste preventivo de BETA-035: la prueba de ayudas contextuales consulta `contextual-help.css` para validar el foco visible (la regla compartida no está en `style.css`); las reglas de distribución propias del panel se verifican en `style.css`.


### Contratos de UX actualizados — BETA-035
- CI detectó expectativas textuales previas en `DeveloperPanelUX.mjs` y `AdminReplacedImagesIntegrity.mjs`. Se alinearon con los nombres compactos y la descripción resumida de categorías; la explicación completa sigue disponible en la ayuda contextual accesible.


- BETA-035 conserva el nombre accesible completo en los botones con etiqueta visual compacta. Se actualizaron las pruebas de UX para reflejar los títulos abreviados; el nombre del botón de cierre se mantiene sin cambios por accesibilidad.


- CI de BETA-035 detectó expectativas heredadas en `DriveStorageAlerts.mjs` (título «Monitor de GDrive») y `DevToolsModalAccessibility.mjs` (leyenda larga de secciones). Se alinearon con «Uso de Drive» y «Secciones», sin alterar IDs ni comportamiento.


- Último contrato heredado detectado por CI en `DevToolsModalAccessibility.mjs`: se actualizó el título de pestaña «Base de datos y respaldos» a «Datos y respaldos». No cambia la región accesible ni el contenido funcional.


- CI detectó la etiqueta anterior «Formato descriptivo global» en `RichTextGlobalPreference.mjs`; se actualizó a «Formato de texto». La preferencia y su alcance global permanecen sin cambios.


## Continuidad — BETA-035 cerrada localmente (2026-11-16)

- Commits de implementación y ajuste de contratos: `b671aee706d4c3046d79af17f71b18c71cd45fe8`, `5cdae19234a81c4b1fdb5306807524ac3d226ecc`, `89eaadd3c3d20416b36c7066569c32f0cb31a772`, `9a86bb58447fd76c114091c27bbe3b71829c77df`, `c13743a640e9df8461610be5251f3da5d2896acd`, `0024fea857cb1355e21bdf63a4fefe15ab8af350`, `4595508fe7cc670312afcb07f4289503896b3884`.
- CI run `43794520964`: SUCCESS — 117 suites / 1,734 pruebas / 0 fallos. `DeveloperPanelCopy`: 6/6 PASS. GitHub Pages run `43794520532`: SUCCESS.
- Se actualizaron contratos de regresión para títulos compactos en Developer, monitor Drive, formato global, leyenda de pestañas y accesibilidad del cierre; se conservaron nombres accesibles completos en acciones de imágenes.
- Pendiente: inspección visual real en navegador Beta (móvil/escritorio, teclado, lector de pantalla, tema claro/oscuro). No se desplegaron servicios Apps Script.
- **Siguiente tarea local del backlog:** GP-INBOX — auditoría funcional end-to-end del flujo UI → API → FEEDBACK → Coordinator → InboxConversations → Spreadsheet.

 
## Continuidad — GP-INBOX: auditoría y endurecimiento local (2026-11-16)

- HEAD de código y pruebas revisadas: `cfb49335d24fef3f2fe7396a32d82ef5b443af62`.
- Commits relevantes: `e068dc6e57a734bb70478f2b94d624f2627f967b`, `f1d63de7945f03e622b9942e0b34ba5e11b578f6`, `484cafc45905253101dfed88bf91112eb8bca274`, `936313b7048a565ff51871efc752f3825c8a5499`, `cfb49335d24fef3f2fe7396a32d82ef5b443af62`.
- El esquema Inbox dejó de crearse o inicializarse automáticamente. Se validan hojas requeridas, datos huérfanos, IDs, estados, contador y referencia al último mensaje; los participantes dañados generan error explícito.
- Se añadieron pruebas para ausencia/vacío de hojas, esquema parcial, preferencias ausentes, participantes dañados, contador inconsistente y estados incompletos.
- Validación aislada: InboxConversations 59/59; InboxUi 31/31; InboxRoleContract 20/20; InboxAuditTrail 15/15; InboxCachePagination 5/5; paginación 4/4. Total: 134 comprobaciones PASS.
- Node.js CLI no se ejecutó; el contenedor no pudo clonar GitHub. La sintaxis del módulo UI se comprobó con compilación JavaScript tras retirar la sintaxis de módulo. GitHub Actions no pudo confirmarse (estado combinado vacío y sin listado de ejecuciones push).
- No se desplegaron servicios Apps Script ni se modificaron hojas, secretos o datos externos. La integración real queda para Beta y no bloquea el cierre local.
- GP-INBOX pasa a **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- **Siguiente tarea local:** revisar la implementación y los contratos pendientes de BETA-030 y BETA-031; después continuar con GP-IMG-DATA-01, GP-BETA-06, BETA-042, BETA-043 y BETA-051.

 
## Continuidad — revisión BETA-030/031 (2026-11-16)

- Se verificó la barra horizontal Developer de cuatro opciones, los iconos compactos, la expansión de la etiqueta activa, la agrupación del modal y la relación de radios/labels/paneles.
- No se detectaron IDs duplicados dentro del modal. Respaldos y Base de datos permanecen agrupados; las confirmaciones destructivas y restricciones de rol no se modificaron.
- Hallazgo BETA-031: la expansión de la pestaña activa no respetaba prefers-reduced-motion. Se corrigió en style.css y se añadió regresión en JS/Tests/DeveloperPanelUX.mjs.
- Commits: CSS 49ff02ed8d350e31b270029cc6d7893c1707e922; prueba 344b0f5eb65826e283e36df5b19dc0814849c4de.
- Pruebas aisladas: DeveloperPanelUX 7/7, DevToolsModalAccessibility 19/19 y DeveloperPanelCopy 6/6 PASS.
- BETA-030 y BETA-031: IMPLEMENTACIÓN LOCAL COMPLETADA; VALIDACIÓN VISUAL BETA PENDIENTE.
- Node.js CLI/GitHub Actions no se confirmaron en esta sesión. No se hizo inspección visual real ni despliegue.
- Siguiente tarea local: GP-IMG-DATA-01 — completar la auditoría y los contratos del inventario/historial de imágenes; después GP-BETA-06, BETA-042, BETA-043 y BETA-051.


## Continuidad — GP-IMG-DATA-01 conciliación Drive ↔ Cortes y ACL (2026-11-16)

**Rama:** `GPSpedia2.2.5_work`  
**HEAD de código probado:** `209fdefa9af1e35e0a5adf5bed3498ecb3a8d3a0`  
**HEAD base protegida:** `GPSpedia2.2.5` — `d9acc68d889985c2e2f42fe3a02e502efc86ead1` (sin modificaciones).

### Resultado
- Se completó la clasificación ACL de cada imagen y su cadena de carpetas dentro de Cortes usando Drive API. Solo `anyone/reader` con `allowFileDiscovery=false` se acepta como acceso público por diseño; permisos indexables, públicos de escritura/comentario y estados no verificables no habilitan asignaciones.
- Se completó el diagnóstico de referencias Cortes ausentes del inventario: archivo en papelera, fuera del árbol, ubicación ambigua, no disponible/no accesible y archivo dentro de Cortes que no apareció en la auditoría.
- El reporte conserva un máximo de 200 detalles, pero transporta el total real y marca truncamiento. Se corrigió el resumen del dry-run y la validación de aplicación para que el total, no solo el arreglo visible, determine el bloqueo.
- La aplicación exige respaldo de Spreadsheet de esta sesión Developer, privado, completo y con manifiesto/fingerprint coincidentes. Se verifica que la copia y el origen mantengan el mismo fingerprint antes de escribir. Se conserva auditoría de cada asignación, read-back, conteo posterior y rollback condicionado.
- La UI mantiene el dry-run sin escrituras, guarda/reanuda el progreso por cuenta/auditoría/firma y muestra el total de referencias faltantes aunque el detalle esté truncado.
- Se actualizó el contrato heredado de `DeveloperOperationMessages.mjs`: esperaba el texto anterior del resumen de conciliación, aunque la UI ya mostraba el mensaje equivalente «Sin cambios en Spreadsheet, Drive ni permisos». No se cambió el comportamiento para satisfacer una expectativa obsoleta.

### Commits de esta continuación
- `7dd48cd6406993175657430a97fc0190db1cdf0d` — resumen del dry-run con conteo íntegro.
- `23bbfef36204134fbeb7c3453c64817d516fb41e` — prueba del límite de 200 y conteo total.
- `4db3fa5ff02776c0c4de32d267a1c23a3af1dbc3` — bloqueo de aplicación con detalle truncado.
- `3b7bceb5ed924571bc27bd09d9a41c6b82919cd8` — contrato UI para conteo/truncamiento.
- `62095de3f994f55610a6979705e18725ff1d4224` — corrección de extracción del helper de pruebas.
- `209fdefa9af1e35e0a5adf5bed3498ecb3a8d3a0` — actualización del contrato de mensajes Developer.
- `3ff30adcacaa91fb7e6cf1d1fe844d9fc25546e8` — actualización del backlog operativo.

### Validación local
- GitHub Actions Node.js 22 run `43798680601`: **SUCCESS — 117 suites / 1,760 pruebas / 0 fallos**.
- `CortesImageReconciliation`: 28/28 PASS.
- `CortesImageReconciliationApply`: 15/15 PASS.
- `CortesImageReconciliationUI`: 13/13 PASS.
- `AdminImageScanCoordinatorContract`: 1/1 PASS.
- `DeveloperOperationMessages`: 5/5 PASS.
- Parsing/sintaxis de `JS/Services/admin.js` y `JS/Frontend/ui.js`: PASS en runtime de validación; el workflow también completó la comprobación de sintaxis.
- No se ejecutó Node CLI manual desde esta sesión; el CI sí ejecutó las suites con Node.js 22.
- Sin despliegues Apps Script ni cambios en Drive, ACL, Spreadsheet, ScriptProperties, secretos o datos externos.

### Estado y siguiente tarea
- GP-IMG-DATA-01: **COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**.
- Pendiente Beta: probar ACL heredadas y reales, Drive API habilitada, Spreadsheet/Drive de copia autorizada y el ciclo de respaldo/aprobación/aplicación/read-back/rollback en entorno aislado.
- Siguiente tarea local: GP-BETA-06 — completar auditoría de acciones protegidas fuera de los routers compartidos. Después BETA-042, BETA-043 y BETA-051.
- Las tareas de UX Developer BETA-021–026 y BETA-030–035 permanecen cerradas localmente; no reabrir GP-DEV-UX-01.


## Continuidad — GP-BETA-06 suggestYear y autorización central (2026-11-16)

**Rama:** `GPSpedia2.2.5_work`  
**HEAD documental actual:** `9cf70613fea47267027956c4a969cd63005d4916`  
**HEAD de código validado:** `394d6bac3cb8ce353bb566a7380bdc88d1577504`  
**Rama base protegida:** `GPSpedia2.2.5` — `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, intacta.

### Resultado
- `suggestYear` conserva dos rutas diferenciadas: actor central para usuarios autenticados; ruta anónima `anon:unverified` con límite 30/hora y sin aplicación automática al catálogo.
- El conteo positivo se aisló en `countVerifiedPositiveYearSuggestionVotes_`; el umbral explícito es tres actores verificados distintos. No se cuentan duplicados del mismo actor, anónimos, claves de aplicación, respuestas negativas ni otros vehículos/años.
- Auditoría de servicios AUTH, USERS, FEEDBACK, WRITE, ADMIN, UTILITIES y CATALOG: se detectó `benchmarkPasswordKdf` como acción protegida de solo lectura que hacía validación local de sesión/rol. Se integró a la ruta de lectura compartida AUTH; Coordinator lee `SESSION_CONTEXTS` sin añadir escritura de actividad; el handler consume `requireSharedAuthActor_`.
- Las excepciones restantes son la validación inicial/restauración de sesión, ping/health, lecturas públicas y la ruta anónima de suggestYear. No se identificaron otros handlers protegidos fuera de la coordinación compartida.
- Se sincronizó `JS/Tests/Auth.js` con `JS/Services/Auth.js`, conservando un ID de Spreadsheet aislado para el fixture.

### Commits relevantes
- `8352375902fcdcb0d46f57f959eb5320d6229d26` — AUTH benchmark con actor central.
- `4a7f7dc7ebbd5cdead8fef4a87813d0e2ac5d85d` — política Coordinator para lectura del benchmark.
- `353e0f3d551f567b059520dd1243162edc6d6f7c` y `e9e1a7b07ac4b63de77dcdd2b794ab67fae4998b` — contrato de pruebas del benchmark.
- `531ddefdd3fc7a3ba35b81dcd5038cbc69a9689f` — fixture AUTH sincronizado.
- `3fecec660a0f328e3857526bf585151d01993d04` — helper de conteo de votos suggestYear.
- `c6db5197bd7d65d3c9c08903d145437187bbd67e`, `855e7e7313c07bb6b2077527fd749ed7d42c2443`, `394d6bac3cb8ce353bb566a7380bdc88d1577504` — prueba de umbral, runner y corrección del extractor de prueba.
- `acae703cace0ab152725c80adf0c2e2dccbe0424` — backlog actualizado.
- `660b5834aafc82d7905f5c672a71f0b9d8c1ea70` — changelog actualizado.
- `9cf70613fea47267027956c4a969cd63005d4916` — adenda de auditoría.

### Validación
- `SuggestYearCoordinatorSession`: 2/2 PASS.
- `SuggestYearVoteThreshold`: 6/6 PASS.
- `PasswordKdfBenchmark`: 5/5 PASS.
- `ActionDispatchContract`: 12/12 PASS.
- Fixture AUTH: 32/32 y paridad 1/1 PASS.
- GitHub Actions Node.js 22 run `43799503142`: **SUCCESS — 118 suites / 1,765 pruebas / 0 fallos**.
- Validación con deployments AUTH/FEEDBACK/Coordinator y hojas aisladas diferida a Beta; no se ejecutaron llamadas remotas ni se modificaron datos externos.

### Siguiente tarea local
**BETA-051 — Validaciones duplicadas.** Completar la revisión global de viajes de red y verificaciones repetidas, sin retirar autorización backend, actor central, RBAC, expiración, epoch ni revocación. Después continuar BETA-042 (auditoría de retirada Legacy) y BETA-043 (telemetría global). Las pruebas que dependan exclusivamente de despliegue quedan excluidas del recuento de tareas locales.


## Continuidad — BETA-051 auditoría de validaciones duplicadas (2026-11-16)

**Rama:** `GPSpedia2.2.5_work`  
**HEAD de código validado:** `3ae8b0872e51ea264fa558b4332ae156bbf5f2b7`  
**HEAD documental previo:** `6140c89babd14218f986737c3b45d076080084b4`  
**Rama base protegida:** `GPSpedia2.2.5` — `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, intacta.

### Resultado
- Se revisaron módulos Frontend, HTML y servicios en busca de llamadas a `validateSession`, `touchSession`, validación de token/rol y actores centrales.
- Hallazgo corregido: `youtubeUpload.js` hacía una llamada previa `validateSession` antes de operaciones FEEDBACK que ya validan la sesión con Coordinator. Se retiró ese viaje de red redundante.
- Se mantienen los checks locales de que el snapshot de usuario/token no cambie durante la preparación de la subida. El servidor sigue autorizando `getVideoApprovalByOperation`, `initYouTubeUpload` y `submitVideoForApproval` mediante FEEDBACK/Coordinator.
- Se conserva la validación `HTML/users.html` únicamente como recuperación cuando falla un cambio del rol propio; se conserva `validateSession` para restauración inicial. No se encontraron llamadas del cliente a `touchSession`.
- AUTH valida sesión mediante el endpoint de restauración; el benchmark PBKDF2 ya utiliza el actor central desde GP-BETA-06. Las acciones protegidas restantes consumen actor de Coordinator; no se detectaron revalidaciones locales por handler.
- No se modificó el flujo de autorización, RBAC, expiración, epoch ni revocación.

### Commits relevantes
- `7507c74333917bb26788a8fdb9e065d190c1df98` — retirada de prevalidación YouTube.
- `3ae8b0872e51ea264fa558b4332ae156bbf5f2b7` — contrato de prueba actualizado.
- `2bc12d088ecb93fcf35e4a00c5f006734e818d06` — backlog actualizado.
- `f20df0618e6b100aadba9ac7c7b386d5190f6a9a` — changelog actualizado.
- `6140c89babd14218f986737c3b45d076080084b4` — adenda de auditoría.

### Validación
- `VideoApprovalClientContract`: 10/10 PASS.
- GitHub Actions Node.js 22 run `43799943070`: **SUCCESS — 118 suites / 1,765 pruebas / 0 fallos**.
- No se ejecutaron deployments ni llamadas a YouTube/FEEDBACK reales. La medición de latencia y la validación de flujo remoto quedan para Beta.

### Siguiente tarea local
**BETA-042 — Auditoría de retirada del servicio Legacy.** Inventariar referencias residuales en código, UI, registros, contratos y workflows; no borrar datos históricos ni elementos de compatibilidad sin confirmar sus consumidores.


## Continuidad — BETA-042 auditoría de retirada Legacy (2026-11-16)

**Rama:** `GPSpedia2.2.5_work`  
**HEAD de código validado:** `dd3edab7a6a950242b26b038dfb07734a6cd42c3`  
**HEAD documental previo:** `161e15dfff9a3d3c6d69560f0c7b007b7a4ee207`  
**Rama base protegida:** `GPSpedia2.2.5` — `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, intacta.

### Resultado
- Se auditó el inventario de siete servicios, módulos Frontend, HTML, mapa de acciones, contratos, pruebas, documentación activa y workflow.
- No existen endpoint, acción, ruta UI ni consumidor activo para LEGACY. No quedan referencias ejecutables a `logFrontend`, `SCRIPT_URL` ni `remoteLog`.
- API/action map y `SERVICE_HEALTH_CONTRACTS` contienen solo los siete servicios vigentes. `ActionDispatchContract` verifica que no se haya reintroducido LEGACY.
- `Services/SERVICE_HEALTH.md` ya no incluye LEGACY en la tabla de servicios; mantiene una nota separada de retirada sin endpoint ni solicitudes de red.
- Se preservaron menciones históricas de auditoría/checkpoint. No se borraron logs, registros históricos ni datos externos.

### Commits relevantes
- `31a24ef75a6f57fa56fc57ef3e0a4575716d0de0` — retirar LEGACY del inventario de salud.
- `41e60777ea38bddc122847b9a516f5b7681380a7` — ampliar contrato documental de retirada.
- `dd3edab7a6a950242b26b038dfb07734a6cd42c3` — corregir patrón de prueba.
- `839556395210395d55bb5342ecc8fa9ad3f6d72a` — backlog actualizado.
- `951d1c9243ed377d42a8e9c592f6a86636de7f40` — changelog actualizado.
- `161e15dfff9a3d3c6d69560f0c7b007b7a4ee207` — adenda de auditoría.

### Validación
- `ServiceHealthContract`: 17/17 PASS.
- `ActionDispatchContract`: 12/12 PASS.
- GitHub Actions Node.js 22 run `43800322470`: **SUCCESS — 118 suites / 1,765 pruebas / 0 fallos**.
- La inexistencia de deployments Legacy externos y de tráfico residual en navegador real queda pendiente de Beta; no bloquea el cierre local.

### Siguiente tarea local
**BETA-043 — Tráfico global por servicio.** Diseñar e implementar agregación backend central con ventanas temporales, deduplicación y separación explícita del contador local del navegador. Evitar que la telemetría añada un viaje síncrono por petición o bloquee las operaciones.


## Continuidad — BETA-043 y regresión integral local (2026-11-16)

**Rama:** `GPSpedia2.2.5_work`  
**HEAD con CI aprobado:** `37b4df1eb4e9c39dd0c6e25e6ecfe140aeea1a5d`  
**Rama base protegida:** `GPSpedia2.2.5` — `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, intacta.

### BETA-043 — resultado
- Coordinator consolida conteos por servicio en buckets horarios de 24 horas, almacenados en ScriptProperties. Cuenta operaciones protegidas que obtuvieron lease; el mismo `requestId` reutiliza la lease y no duplica el evento.
- El registro se ejecuta dentro de la llamada existente a Coordinator, bajo lock y como best-effort. No agrega una llamada de red independiente por operación; un fallo de telemetría no bloquea la operación protegida.
- `ADMIN/getServiceTraffic` expone solo agregados y está restringido al rol Desarrollador. Se excluyen la propia consulta, lecturas públicas no coordinadas, feed público y sondeos de salud.
- La UI presenta por separado el tráfico global coordinado y la actividad local del navegador (15 minutos, máximo 600 eventos); el texto de ayuda aclara que el agregado no representa todas las solicitudes HTTP.
- `Services/COORDINATOR_SETUP.md` documenta almacenamiento, alcance, deduplicación, límites y separación de fuentes.

### Correcciones de validación
- Se alineó `DeveloperPanelCopy.mjs` con el texto visible vigente.
- Se incorporó `ServiceTrafficAdminContract.mjs` al runner integral.
- Se corrigieron los `requestId` de los fixtures para respetar el mínimo de 20 caracteres.
- Se alineó el contrato documental con el lugar donde se explica el alcance de la métrica y se añadió la sección de telemetría al documento de Coordinator.

### Validación local
- `ServiceTrafficAdminContract`: 20/20 PASS.
- `ServiceMetricsTelemetry`: 10/10 PASS.
- Coordinador compartido, concurrencia y leases: 54/54 PASS.
- GitHub Actions Node.js 22 run `43807777744`: **SUCCESS — 119 suites / 1,790 pruebas / 0 fallos**; sintaxis de módulos modificados aprobada.
- GitHub Pages run `43807776532`: **SUCCESS**.
- Commits principales: `4ba394daabad6787d0fc6f94edd5012b4bb6b1f7` (separación global/local), `081a36cd3f626ad37423b605a50a87254b84f080` (gráfico global), `30815659eaf994737e2a2f45789b421c67e7544e` (excluir auto-consultas), `d132676c3368ddc8563f4651f4acb8e79e0bc0a2` (contrato), `52615e0f12e23e3926af3c08aa2bb0b80f50b7e8`, `ad6b906d76a12bda71725aa149edc2fe33f18676`, `a0072c8676ae1ab906b33d8c471944c49e3a651e`, `6bc9b7e14dd74532bbbf52094fc3a304a52e6e9b` y `37b4df1eb4e9c39dd0c6e25e6ecfe140aeea1a5d` (ajustes de pruebas, runner y documentación).
- No se ejecutó Node CLI manual en este entorno. GitHub Actions ejecutó el runner completo con Node.js 22.
- No se desplegaron Apps Script ni se modificaron ScriptProperties, Spreadsheet, Drive, ACL, secretos o datos productivos.

### Estado y continuidad
- BETA-043: **COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**.
- Regresión integral local: **COMPLETADA** en el HEAD indicado.
- Las validaciones reales de deployments, roles, métricas entre instancias, navegador y dispositivos quedan para Beta; no bloquean el cierre local.
- La rama base protegida no fue modificada.
- Siguiente fase: ejecutar únicamente las validaciones Beta previstas en `Tareas_Pendientes.md`; no se identificó otra implementación local pendiente dentro del conjunto actual de tareas.


---

# Continuidad — cierre local de autorización Developer, sesiones y PWA (2026-11-16)

**Rama:** `GPSpedia2.2.5_work`  
**HEAD de código validado:** `e4850ea35e5d84b0b2c07c60cb0a63f0f24c7982`  
**Rama base protegida:** `GPSpedia2.2.5` — `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, intacta.  
**PR:** #128, permanece abierto y en borrador.

## Causas y correcciones

- FEEDBACK/Coordinator: se confirmó que el secreto privado de FEEDBACK estaba desalineado respecto a lo esperado por Coordinator. El usuario informó que ya lo corrigió en el deployment. No se consultó ni modificó el valor desde el repositorio.
- Tráfico global: la UI invocaba ADMIN `getServiceTraffic` con payload vacío. Ahora envía el contexto de la sesión activa; ADMIN/Coordinator mantienen la autorización Developer.
- Sesiones: `SESSION_LIMITS.desarrollador = Infinity` ya existía y se comprobó mediante contrato; se conserva sin cambios. El flujo de respuesta confirmada de sesión revocada ahora elimina únicamente el token local coincidente y muestra login con «Sesión terminada» en amarillo suave. No se reintrodujeron prevalidaciones por acción.
- Service Worker: caché v30, clonación segura de Response y caché cache-first/actualización en segundo plano para App Shell y subpáginas.
- FEEDBACK/Performance: `getRichTextMode` tiene timeout acotado y un reintento transitorio; `getCatalogChanges` utiliza reintentos con cancelación; la caché opcional de validación de IndexedDB no bloquea el modal más de 2.5 s.
- UI: alineación de acciones del modal de cortes; cierres estándar de tutorial y relay; ayuda junto al título de consola Developer.

## Commits de la iteración

- `2e7a58717b86acd6a47b2bb65c0c4d493dde457a` — caché PWA segura, reintentos de catálogo y caché opcional IndexedDB.
- `d8e72a7f7c25999679b4f33d7a4504bba57800c5` — recuperación de sesión antigua y ajustes de modales.
- `966f73dcc1270c8cd7fd783646b32e993fb5667e` — actor de sesión en tráfico global y contratos RBAC.
- `10d45799f4059c505b31451dc2583b3e2470388a` — reintentos acotados de preferencia global y fixtures de pruebas.
- `e4850ea35e5d84b0b2c07c60cb0a63f0f24c7982` — entorno de prueba PWA alineado con el scope de GitHub Pages.

## Validación final

- GitHub Actions Node.js 22 run `43815317885`: **SUCCESS — 124 suites / 1,847 pruebas / 0 fallos**.
- GitHub Pages run `43815317615`: **SUCCESS**.
- Suites relevantes: `DeveloperPrivilegeRouting` 20/20; `SessionInvalidationFlow` 15/15; `ServiceTrafficAdminContract` 20/20; `SessionStartupNavigation` 17/17; `RichTextGlobalPreference` 9/9; `CatalogFeedRetry` 9/9; `ServiceWorkerCache` 9/9; `PWAStartupScenarios` 15/15; `OptionalValidationCache` 4/4; `CutDetailModalLayout` 8/8; `VehicleModalRolePolicy` 12/12.
- No se desplegaron Apps Script ni se modificaron secretos, ScriptProperties, Spreadsheet, Drive, ACL o datos productivos. La confirmación del secreto actualizado procede del usuario; la lectura/ejecución real de los servicios queda diferida a Beta.
- La revisión visual general de todos los modales permanece pendiente; se completaron los componentes concretos especificados.
 
## Siguiente fase

Ejecutar las comprobaciones Beta enumeradas en `Tareas_Pendientes.md`. No se debe considerar probada la autorización real entre deployments ni el comportamiento en dispositivos solo por los tests Node.js.

---

## Continuidad — nueva fase de UX Inbox y navegación (2026-11-16)

Rama: GPSpedia2.2.5_work
HEAD de inicio verificado: c4a6d1f2d5f5208aa8c4290c7b23c851ea1cc101
Rama base protegida: GPSpedia2.2.5 (sin modificaciones).

Requisitos registrados: GP-UX-INBOX-01 (secciones General, Soporte, Contáctanos, Reportes y Aportaciones solo Desarrollador); GP-PERF-PAGES-01 (caché de usuarios y continuidad index/users/add_cortes); GP-UX-USERS-01 (acciones compactas con iconos horizontales); GP-UX-CUT-MODAL-01 (acciones en esquina superior derecha junto a cerrar).

Inspección inicial: Inbox actual combina conversaciones y solicitudes históricas en pestañas; users.html consulta getUsers sin caché propia y apila acciones verticalmente en móvil; Service Worker está en v31 y cache-first no garantiza restauración del DOM al volver de páginas independientes. Las aprobaciones de vídeo conservan restricciones por rol. Tareas_Activas.md no existe; Tareas_Pendientes.md es el backlog operativo vigente.

Estado: requisitos registrados, implementación pendiente. Próxima acción: mapear las fuentes de solicitudes y permisos antes de cambiar el Inbox; luego implementar caché e interfaz con pruebas de regresión. No se ejecutaron pruebas nuevas ni despliegues.


## Cierre local — fase Inbox y navegación (2026-11-16)

**Estado:** IMPLEMENTACIÓN LOCAL COMPLETADA; validación Beta de interfaz y entorno externo pendiente.  
**Commit de código validado:** 2c64a5dcd329790316cfc672c9a630856ee63537  
**Documentación de cierre:** Tareas_Pendientes.md actualizada en 260df6c0d147d41622a714ff75c3d54c94ee0b84.

### Implementación
- index.html: estructura de bandeja con menú lateral hamburguesa, secciones General, Soporte, Contáctanos, Reportes y Aportaciones; acciones superiores con iconos de composición y actualización.
- JS/Frontend/ui.js: cambio de sección, filtros por fuente/tipo, navegación y control de visibilidad de Aportaciones solo Desarrollador; eliminación de solicitudes con icono de papelera; controles de aprobación restringidos en UI al rol Desarrollador.
- JS/Services/feedback.js: FEEDBACK solo permite approveVideo/rejectVideo al rol Desarrollador y omite los registros video_approval en las lecturas de getFeedbackItems para actores que no sean Desarrollador.
- HTML/users.html: caché sessionStorage por identidad/rol/huella de sesión, TTL de cinco minutos, render inmediato de caché vigente y actualización remota; acciones Editar/Eliminar iconográficas en un grupo horizontal y cierre de sesiones separado.
- HTML/add_cortes.html: caché sessionStorage de listas desplegables por usuario/sesión, render inmediato de datos vigentes y revalidación remota sin depender de la caché.
- style.css: panel lateral plegable, distribución responsive de bandejas y acciones del modal de detalle alineadas en esquina superior derecha, antes del cierre.
- service-worker.js: caché App Shell actualizada a v32.

### Validación ejecutada
- GitHub Actions, workflow de regresión: SUCCESS.
- Resultado: 126 suites, 1,864 pruebas aprobadas, 0 fallos de suite.
- GitHub Pages build/deployment workflow: SUCCESS.
- Contratos relevantes: InboxUi 31/31; InboxRoleContract 21/21; paginación Inbox 4/4; ButtonWidthPolicy 5/5; CutDetailModalLayout 8/8; ServiceWorkerCache 9/9.
- Las primeras ejecuciones revelaron expectativas antiguas de rol, disposición de botones, versión de caché y política de logging; se corrigieron y la ejecución final quedó verde.

### Pendientes Beta / entorno externo
- Verificar visualmente en navegador de escritorio y móvil los tamaños, navegación lateral, accesibilidad táctil y contraste en temas claro/oscuro.
- Confirmar el retorno real a index.html mediante BFCache en navegadores/dispositivos objetivo; las pruebas automatizadas validan la caché del App Shell, pero no simulan el ciclo completo del navegador móvil.
- Probar con registros reales las cinco secciones, paginación cuando una página contenga solo tipos de otra sección, operaciones de responder/resolver/eliminar y permisos de cada rol.
- Verificar la revalidación remota de listas desplegables y usuarios con cambios concurrentes; no se ejecutó despliegue de Apps Script ni se alteraron datos productivos.

### Continuidad
Los cuatro requerimientos GP-UX-INBOX-01, GP-PERF-PAGES-01, GP-UX-USERS-01 y GP-UX-CUT-MODAL-01 quedan cerrados a nivel de código y pruebas automatizadas, con aceptación Beta pendiente. Rama base GPSpedia2.2.5 sin modificaciones.


## Continuidad — identidad visual, modal y recursos offline (2026-11-16)

**Estado:** implementación y regresión automatizada completadas; comprobación visual/offline real pendiente de Beta.  
**HEAD de código validado:** `bc8997b60fadb5715777b202d78d16a7e631306f`  
**Rama base protegida:** `GPSpedia2.2.5` (`d9acc68d889985c2e2f42fe3a02e502efc86ead1`), sin modificaciones.

### Modal de detalle de corte
- Comparación directa de `style.css` con la rama base: tamaño original del logo `height/max-height: 48px` en escritorio y `38px` hasta 600 px. La altura no había sido reducida; sí existía un límite adicional de ancho de 140 px en la rama de trabajo que comprimía logos panorámicos. Se eliminó ese límite y se conserva el tamaño base.
- El modelo se mantiene junto al logo a la derecha mientras quepa. El cálculo usa ancho natural del texto + ancho real del logo + gap frente al ancho interno del contenedor. Solo se apila si excede ese espacio.
- `ResizeObserver` actualiza la disposición ante cambios de tamaño; se desconecta al cerrar el modal.

### Logo local, Splash y favicon
- El encabezado y Splash claro usan `Images/icon-v3-512x512.png` local, sin dependencia de Drive.
- La lógica de tema conserva `Images/Logo_TemaOscuro.png` en encabezado/Splash cuando está activo el modo oscuro.
- El favicon utiliza el PNG oficial local. La prueba inspecciona la cabecera PNG y exige tipo con canal alfa; no se acepta un fondo blanco opaco.
- Service Worker actualizado a `gpsepedia-cache-v33` e incluye logo claro y oscuro en recursos precargados.

### Validación
- GitHub Actions regresión: SUCCESS.
- 127 suites; 1,869 pruebas aprobadas; 0 fallos.
- `CutDetailModalLayout`: 9/9.
- `OfflineBrandAssets`: 4/4.
- `ServiceWorkerCache`: 9/9.
- GitHub Pages build/deployment: SUCCESS.
- Pendiente Beta: revisar el ajuste con marcas/logos panorámicos y cuadrados en varios tamaños de pantalla, Splash en modo oscuro, favicon y carga/arranque sin conexión real. No se realizó despliegue de servicios ni se alteraron datos productivos.

### Documentos
Backlog y registro de cambios sincronizados con este estado. La rama base permanece intacta.


---

## Continuidad — ajustes de lista y navegación Inbox (2026-11-16)

**Rama:** `GPSpedia2.2.5_work`  
**Rama base protegida:** `GPSpedia2.2.5` (sin modificaciones).

### Cambios aplicados
- `index.html`: lupa en la cabecera; búsqueda inicialmente plegada; selector de categoría retirado; carpetas con iconos (Recibidos, Leídos, No leídos, Enviados y Archivados); una sola barra de paginación persistente fuera de las vistas, con flechas ← / → y etiqueta contextual.
- `style.css`: el espacio de trabajo ocupa la altura flexible del modal; la lista y el detalle disponen de scroll independiente; animación de apertura de búsqueda y expansión de la carpeta activa, con respeto a `prefers-reduced-motion`; ajuste móvil.
- `JS/Frontend/ui.js`: búsqueda activada desde la lupa; resultados por texto mediante el parámetro de consulta existente; eliminación del listener del filtro visual de categorías; paginador único que cambia de manejador según la vista actual y conserva los cursores opacos; indicador de páginas con total real.
- `JS/Services/InboxConversations.js`: se añadió la carpeta `read`, definida como conversaciones recibidas con `unreadCount === 0`; no realiza escrituras ni altera el estado de lectura.
- Pruebas actualizadas en `JS/Tests/InboxUi.mjs` y `JS/Tests/InboxConversations.mjs`.
- `service-worker.js`: caché App Shell actualizada de `gpsepedia-cache-v33` a `gpsepedia-cache-v34`; `JS/Tests/ServiceWorkerCache.js` actualizado para exigir la nueva versión.

### Validación y estado
- Inspección remota de los seis archivos afectados: los controles antiguos de categoría y paginación por conversación ya no aparecen en HTML/UI/estilos/servicio.
- Se añadieron regresiones de contrato para carpeta Leídos, búsqueda desplegable, barra única, flechas, etiqueta contextual y aprovechamiento vertical.
- La ejecución de Node.js y GitHub Actions aún no se ha confirmado para este conjunto de commits; no se declara como aprobada.
- Pendiente: ejecutar la suite Inbox/regresión global, revisar el diff completo y comprobar visualmente el alto útil, el comportamiento de la lupa y la expansión de carpetas en escritorio/móvil.
- No se desplegaron Apps Script ni se modificaron hojas, secretos, servicios externos o datos productivos.


---

## Continuidad — PWA Inbox y normalización de aportaciones (2026-11-16)

**Rama autorizada:** `GPSpedia2.2.5_work`  
**Rama base protegida:** `GPSpedia2.2.5` — no modificar.

### GP-UX-INBOX-03
- `index.html`: los botones «Nuevo mensaje» y «Buscar» se trasladaron a `#inbox-folder-nav`, junto a las carpetas de conversaciones; se mantienen sus IDs y manejadores.
- `JS/Frontend/ui.js`: las acciones se ocultan cuando la vista cambia a solicitudes y vuelven a mostrarse en conversaciones.
- `style.css`: en PWA/móvil la lista `#inbox-list` de solicitudes/reportes usa `flex:1 1 0`, scroll vertical propio y el detalle permanece oculto hasta seleccionar un elemento. Se elimina el límite de 38% introducido por una regla responsive posterior.
- `JS/Tests/InboxUi.mjs`: se añadieron comprobaciones de altura de lista y ubicación de los botones.

### GP-DASH-ATTR-01
- `JS/Frontend/activityDashboard.js`: el frontend separa nombres con `<br>`, elimina markup/script y marcadores auxiliares, normaliza acentos, mayúsculas, puntuación y espacios, y presenta una única fila por nombre canónico con capitalización de palabras.
- Las aportaciones compartidas se atribuyen a cada nombre detectado. Al consolidar alias se suman cortes y se conserva el máximo de vehículos observado, porque la respuesta agregada no contiene IDs de vehículos por aportador para calcular una unión exacta.
- `JS/Tests/ActivityDashboardContributions.mjs`: regresiones de alias, acentos, separadores, HTML y renderizado como texto seguro.
- No se modificó `JS/Services/feedback.js`, Apps Script, hojas ni datos persistentes.

### PWA
- `service-worker.js`: caché App Shell v35 e inclusión de `activityDashboard.js` en recursos esenciales.
- `JS/Tests/ServiceWorkerCache.js`: expectativa v35 y cobertura del nuevo recurso.

### Validación
- Cambios aplicados en los archivos de frontend y pruebas.
- Pendiente ejecutar en Node.js las suites InboxUi, ActivityDashboardContributions y ServiceWorkerCache, además de revisar el diff y comprobar el resultado visual PWA en un dispositivo.
- No se ha realizado despliegue de Apps Script ni modificación de servicios/hojas externas.


### Cierre de validación local — GP-UX-INBOX-03 / GP-DASH-ATTR-01
- GitHub Actions Node.js 22: **SUCCESS — 127 suites / 1,876 pruebas / 0 fallos** (run `43874427811`, commit `780b67be3c22efc86c245f770cb29724282cfae7`).
- Pruebas focalizadas: `InboxUi.mjs` **35/35 PASS**; `ActivityDashboardContributions.mjs` **9/9 PASS**; `ServiceWorkerCache.js` **9/9 PASS**.
- GitHub Pages: **SUCCESS** (run `43874428208`, commit `f92ec77eac701aa172b7846e70ec1fa40f249cf4`).
- Durante la regresión se corrigieron una expectativa obsoleta del nombre de cursor en Inbox, la deduplicación de dos variantes del mismo colaborador dentro de una sola celda compartida y la expectativa de versión del Service Worker. La repetición posterior aprobó todas las suites.
- Las dos tareas quedan **COMPLETADAS CON VALIDACIÓN DIFERIDA A BETA**. Pendiente visual PWA en móvil y verificación de conteos de aportadores/vehículos con registros reales; no se desplegó Apps Script ni se alteraron datos externos.
- HEAD de rama de trabajo al registrar: `2b78d8337e01629a30c17f968238edbd971baa8d`. Rama base `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones.


---

## Adenda — Aportadores por rol y comunidad técnica (2026-11-16)

- En `JS/Frontend/activityDashboard.js`, el normalizador elimina el texto entre paréntesis antes de agrupar nombres; por ejemplo, `Byron Lopez (apert)` y `Byron López (corte)` se muestran como un único técnico: **Byron Lopez**.
- Las variantes `Comunidad Internacional de técnicos` y `Comunidad de técnicos` se agrupan bajo el nombre canónico **Comunidad de técnicos**, insensible a mayúsculas, acentos y puntuación.
- Hallazgo de contrato: `buildCutContributionSummary_` descartaba slots con tipo de corte registrado y colaborador vacío; el frontend no podía recuperar esos conteos. En `JS/Services/feedback.js` se aplica el fallback `Comunidad de técnicos` para esos slots. No se cambia el formato de respuesta, los datos persistidos ni la estructura de hojas.
- `JS/Tests/ActivityDashboardContributions.mjs`: casos para roles entre paréntesis, alias de comunidad y técnico ausente.
- Service Worker actualizado a `gpsepedia-cache-v36` para refrescar el módulo frontend.
- Validación GitHub Actions Node.js 22: **127 suites / 1,881 pruebas / 0 fallos**; ActivityDashboardContributions 14/14, ServiceWorkerCache 9/9, OfflineBrandAssets 4/4. Run `43876854218`.
- No se ha ejecutado deployment de Apps Script ni validación con hojas reales; comprobar los registros históricos y el total de vehículos en Beta.


## Continuidad — GP-UX-USERS-02 (2026-11-16)

- Requerimiento: en la tabla de `HTML/users.html`, mostrar Editar, Eliminar y Cerrar sesiones en una sola fila móvil; icono de salida accesible y columnas/espacios compactos.
- Alcance: frontend y pruebas de contrato únicamente. No modificar servicios Apps Script ni backend.
- Causa localizada: `.actions-cell` se configuraba como columna y el botón «Cerrar sesiones» se añadía fuera del grupo principal; además, Acciones recibía solo 29–32 % del ancho móvil.
- Estado de inicio: rama `GPSpedia2.2.5_work`, HEAD `034a95347f7c55de2dce3655afa1bbd37839b398`; base `GPSpedia2.2.5` en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Implementación y pruebas en curso; validar contrato responsive, sintaxis, CI y diff antes del cierre. No realizar despliegues.

- CI inicial del commit `5c89746c6911086336fe58b5af777ad4aa6b99dc`: detectó dos expectativas de pruebas obsoletas (el contrato responsive consultaba iconos en el bloque CSS en vez del HTML y ButtonWidthPolicy fijaba 38 px). Se actualizan las pruebas para validar los selectores/medidas nuevos; no se identificó fallo de sintaxis ni de lógica de la acción.


## Cierre local — GP-UX-USERS-02 (2026-11-16)

- Estado: **COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**.
- `HTML/users.html`: las acciones Editar, Eliminar y Cerrar sesiones se presentan en un único grupo horizontal. Cerrar sesiones usa `fa-arrow-right-from-bracket`, título y `aria-label`; conserva la condición de rol Desarrollador y el manejador original `resetUserSessions`.
- Responsive: botones de 34 × 36 px en móvil, separación de 3 px, tabla fija al ancho disponible y columna Acciones de 46 % (hasta 760 px) / 48 % (hasta 420 px). Texto de roles reducido.
- Regresión: `ResponsiveFormsUsers` **16/16 PASS**; `ButtonWidthPolicy` **5/5 PASS**. GitHub Actions Node.js 22 run `43879864027`: **SUCCESS — 128 suites / 1,897 pruebas / 0 fallos**. GitHub Pages run `43879862392`: **SUCCESS**.
- No se modificaron Apps Script, servicios, backend, autenticación, datos ni deployments. La revisión visual en móviles reales queda pendiente de Beta.
- HEAD de código: `81a0852c7a549dc21c5d341dbad1767c535fafee`; rama base protegida `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


---

## Continuidad — cierre automático de búsqueda Inbox (2026-11-16)

- **Requerimiento:** al activar la lupa se muestra la búsqueda; se cierra al volver a pulsarla, cambiar de sección/pestaña o utilizar otra acción del modal.
- **Causa:** el manejador original solo retiraba la clase visual al cerrar y no ocultaba el formulario ni restablecía el estado accesible; los demás controles no cerraban de forma centralizada la búsqueda.
- **Corrección:** `JS/Frontend/ui.js` incorpora `closeInboxSearch_` y delegación de clics en el modal. Se excluyen la propia lupa y el submit de búsqueda; las demás acciones cierran el formulario y sincronizan `hidden`, `aria-expanded` y `aria-label`. El cambio de sección/vista también lo cierra.
- **Pruebas añadidas:** `JS/Tests/InboxUi.mjs` cubre cierre por acción, pestaña, toggle y estado accesible.
- **PWA:** Service Worker actualizado a `gpsepedia-cache-v38`; contrato `ServiceWorkerCache.js` sincronizado.
- **Estado al iniciar:** rama `GPSpedia2.2.5_work`, HEAD `c1b15ba879f287d77a609f5ffc0d2d3f918a5f89`. No se modificó la rama base ni servicios Apps Script/datos externos.
- **Validación:** pendiente de ejecutar CI Node.js 22 sobre el commit resultante; inspección visual de navegador real queda para Beta. No se declara aprobación anticipada.


### Adenda de validación — GP-UX-INBOX-SEARCH-DISMISS-01
- CI inicial run `43900747098` detectó una expresión regular mal escapada en el nuevo contrato de InboxUi; el fallo estaba en la prueba, no en la sintaxis de `ui.js` ni en la lógica funcional. La suite se detuvo antes de completar la validación de esta tarea.
- Se corrigieron los escapes de las expresiones de prueba. Se vuelve a ejecutar CI sobre el nuevo commit; hasta obtener resultado se mantiene la validación local/CI sin aprobar.

- Segundo CI run `43900956260`: la nueva comprobación del nombre del helper tenía un escape adicional; la implementación y las otras comprobaciones se cargaron, pero InboxUi quedó en 38/39. Se corrige el patrón del contrato y se repite CI.

- Hallazgo adicional de CI anterior run `43897233001`: `ActivityDashboardContributions.mjs` completaba sus aserciones, pero su salida no contenía el resumen numérico `N/N PASS` requerido por `RunServiceTests.mjs`; por ello el runner la clasificaba como «no publicó resumen verificable». Se normaliza la salida de la suite a `1/1 PASS` sin cambiar su cobertura ni la lógica de aportaciones.


---

## Continuidad — tarjeta Agregar Modelo del carrusel PyS (2026-11-16)

- **Causa confirmada:** en el carrusel de vehículos relacionados, la tarjeta «Agregar Modelo» recibía estilos inline `height:auto`, `min-height:0` y `align-self:stretch`, que anulaban las dimensiones uniformes declaradas por `.card-create-vehicle-assoc` (140 × 120 px).
- **Corrección:** se retiran esos overrides inline; la tarjeta conserva el ancho de 140 px y hereda altura/min-height de 120 px, igual que el patrón compartido de creación.
- **Prueba:** `PysModalNavigation.js` verifica que no vuelvan los overrides y que CSS mantenga las dimensiones 140 × 120 px.
- **PWA:** App Shell actualizado a `gpsepedia-cache-v39`.
- **Estado:** implementación publicada en la rama de trabajo; pendiente CI sobre el commit y aceptación visual en navegador/Beta.

- Tercer ajuste de contrato: se sustituyeron expresiones regulares innecesariamente complejas por verificaciones de fragmentos literales; la prueba anterior se parseaba, pero la expresión escapada se compilaba incorrectamente en Node 22. Se vuelve a ejecutar la suite.

- CI run `43901604085` confirmó el cambio funcional de tarjeta, pero la nueva prueba Pys tenía expresiones regulares sobreescapadas. Se sustituyen por comprobaciones literales explícitas y se repite la suite.


---

## Continuidad — correcciones Inbox, aportes y tarjeta PyS (2026-11-16)

- Inbox: el cierre centralizado de búsqueda está en `JS/Frontend/ui.js`; el contrato se expresa mediante comprobaciones literales para evitar fallos de parsing por escapes en regex.
- Aportes: `normalizeContributionRows` separa colaboradores por coma y saltos de línea; se conserva la prueba de los dos órdenes «Pablo Peña, Byron Lopez» y «Byron Lopez, Pablo Peña». El test emite ahora resumen `1/1 PASS` reconocido por el runner integral.
- Tarjeta PyS: se elimina el estilo inline que anulaba el alto fijo de `card-create-vehicle-assoc`; CSS define 140 × 120 px. Se agrega prueba explícita de ausencia de overrides.
- Service Worker actualizado a `gpsepedia-cache-v39` para invalidar el App Shell anterior.
- Validación CI: se ejecuta sobre el commit resultante. Las pruebas visuales en navegador/dispositivo y los servicios Apps Script reales permanecen diferidos a Beta.

- Ajuste de robustez del contrato CSS: se comprueban por separado los selectores y las declaraciones de altura/mínima altura, sin depender de espacios o saltos de línea exactos.

- El incremento de App Shell a v39 también requiere actualizar `OfflineBrandAssets.mjs`, que mantenía una expectativa fija v37. Se sincroniza el contrato para que la validación offline corresponda al recurso actual.

- PysModalNavigation pasó la nueva comprobación funcional de altura, pero el resumen final permanecía fijo en 9 pruebas; se actualiza a 10 para que el runner no rechace el resultado correcto.


---

## Continuidad — caché de conversaciones y búsqueda global Inbox (2026-11-16)

- **Caché:** se incorpora una caché efímera de páginas de conversaciones, aislada por usuario/rol/token, con clave compuesta por carpeta, categoría, consulta y cursor. Al reabrir Inbox se muestra inmediatamente la página reciente y se omite la llamada remota si sigue fresca; el sondeo periódico mantiene la actualización silenciosa. Las páginas stale se muestran mientras se refrescan.
- **Integridad:** los cambios de sesión limpian la caché de conversaciones y mensajes. Las invalidaciones existentes también invalidan las páginas de conversaciones. Si falla un refresco y hay caché, se conserva la bandeja visible.
- **Búsqueda global:** cuando hay consulta se solicita carpeta `all` y categoría `all`; el servicio incluye resultados recibidos, enviados, archivados y de distintas categorías, buscando asunto, participantes y contenido de mensajes. Sin consulta se conservan los filtros seleccionados.
- **Pruebas:** se amplían `InboxUi.mjs` y `InboxConversations.mjs` para caché por contexto y búsqueda global en varias bandejas/categorías.
- **PWA:** Service Worker actualizado a `gpsepedia-cache-v40` y contratos de caché/offline sincronizados.
- **Validación:** CI Node.js 22 pendiente sobre el commit; integración real con usuarios/Spreadsheet y revisión visual quedan para Beta. No se desplegaron servicios Apps Script ni se alteraron datos externos.

- CI run `43903840172` detectó que la prueba de búsqueda global añadía tres conversaciones y alcanzaba el límite de frecuencia simulado del fixture. Se reemplaza la creación adicional por cambios temporales/restaurados en tres filas ya existentes, sin debilitar la prueba de filtrado ni los límites del servicio.

- CI run `43904276401`: InboxUi detectó dos contratos antiguos que aún esperaban la firma previa de setInboxSection_ y el filtro fijo de categoría. Se sincronizan con la firma opcional de preferCache y la búsqueda global; la suite de servicio InboxConversations ya pasó.

- CI run `43904491110`: las nuevas pruebas de caché/búsqueda pasaron, pero dos contratos anteriores aún esperaban el filtro fijo por carpeta y el render inicial sin caché. Se actualizan para reflejar la búsqueda global y el fallback de carga cuando no hay caché.

- CI run `43904988914`: la suite detectó dos aserciones heredadas que aún describían el loader anterior. Se ajustan a la solicitud global de carpeta durante búsqueda y al bloque condicional de carga solo cuando no hay caché.


---

## Continuidad — estado de vídeos propios en Solicitudes (2026-11-16)

- Técnicos y técnicos exteriores reciben, dentro de «Solicitudes», únicamente sus propios registros `video_approval`, identificados por `createdByUserId` del registro y comparado con el actor autenticado.
- El estado aprobado/rechazado/pendiente se conserva; si está rechazado se muestra explícitamente `rejectionReason` como «Motivo del rechazo». Se evita mostrar el texto de rechazo duplicado como una respuesta genérica.
- Los reportes de problemas propios mantienen su filtro y cursor; los vídeos usan un cursor interno `video:<id>` para no romper la paginación combinada.
- El listado general de solicitudes de vídeo continúa reservado a Desarrollador; las acciones approve/reject mantienen RBAC exclusivo.
- Validación CI pendiente sobre el commit; no se modificaron deployments ni datos externos.

- CI run `43905873559`: el contrato de Inbox aún esperaba que técnicos recibieran cualquier elemento del endpoint propio. Se actualiza para exigir explícitamente solo reportes propios y vídeos propios; la prueba RBAC de propiedad/razón se ejecutó sin reportar fallos.
