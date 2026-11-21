# Auditoría integral de latencia, llamadas y simplificación — 2026-11-21

Estado: **EN CURSO — hallazgos preliminares registrados como tareas pendientes.**  
Rama: `GPSpedia2.2.5_work`  
HEAD de partida: `dba61b0f6cba0a152d58d314b52eac5120576d86`  
Base protegida: `GPSpedia2.2.5` (no modificar).

## Objetivo

Acelerar la navegación y todos los aportes de usuarios, especialmente escrituras y cargas de imágenes/vídeos, eliminando viajes de red, lecturas, escrituras de telemetría, locks, leases, esperas y reintentos que no aporten una garantía necesaria. No reducir controles de integridad, idempotencia, autorización por rol ni recuperación de fallos.

Esta auditoría debe evaluar el costo completo desde el navegador hasta los servicios y sus dependencias: número de requests, llamadas entre proyectos Apps Script, lecturas/escrituras Spreadsheet/Drive, bytes transferidos, tiempo de espera, procesamiento en cliente y trabajo repetido. Una reducción de locks por sí sola no demuestra una mejora de navegación.

## Hallazgos preliminares confirmados por inspección estática

1. **AUTH mantiene un conjunto amplio de acciones bajo `withSharedMutationLease_`**, entre ellas `touchSession`, `acceptTerms`, login, recuperación, cambios de contraseña, revocación, eliminación y actualización de usuarios. La política debe contrastarse con §15 de `NORMAS_DESAROLLO.md`, identificar cada consumidor real y separar las excepciones de sesión que el usuario pidió conservar de las acciones ordinarias. No retirar aún ninguna protección de login, bloqueo temporal, cierre remoto o eliminación de cuenta.
2. **USERS conserva lease compartida para `createUser` y lock físico fail-fast para unicidad/escritura.** La lease parece relacionada con la carrera de creación/eliminación entre USERS y AUTH; debe demostrarse si puede sustituirse por una operación mínima segura o si debe permanecer. No eliminar el control de unicidad de usuario/ID.
3. **La sesión cacheada se obtiene mediante `getCachedSharedSessionActor_`** en USERS, WRITE, FEEDBACK y ADMIN. Auditar TTL, invalidación, revocación, cambios de rol/epoch, cache misses y fallback remoto. El cache hit no equivale por sí solo a revocación inmediata; comprobar si las excepciones de §15 están satisfechas sin validar cada clic.
4. **FEEDBACK, WRITE y ADMIN publican cambios del catálogo a través de Coordinator.** Verificar si un aporte genera una publicación única, si se publican resets redundantes, si un lote se divide correctamente, y si las pantallas consumen deltas o vuelven a descargar snapshots. Mantener la coherencia del catálogo; no suprimir eventos sin comprobar su efecto.
5. **ADMIN realiza llamadas a WRITE para reservas de ID y llamadas a CATALOG para datos/proyecciones.** Clasificar cada llamada como dependencia necesaria o consulta repetida; revisar si el consumidor vuelve a leer lo que ya recibió, si se pueden transportar los datos en la respuesta original y si la reserva de ID añade viajes evitables. La unicidad y la idempotencia de IDs deben mantenerse.
6. **Hay transferencias externas de archivos en FEEDBACK y WRITE/ADMIN** (incluyendo rutas de imagen y YouTube). Deben analizarse por separado: flujo navegador→Apps Script→Drive/API, codificación/base64, compresión, tamaño, duplicación de upload, conversiones, reintentos y lectura posterior. La inspección estática detecta llamadas `UrlFetchApp.fetch` para contenido de imagen y YouTube, pero no permite concluir por sí sola que sean redundantes ni que el flujo esté optimizado.
7. **La telemetría directa de AUTH/USERS** registra tráfico y usa propiedades del script. Confirmar que es best-effort, no añade una llamada remota, no serializa solicitudes y no bloquea acciones cuando PropertiesService falla.
8. **Frontend:** `api-config.js` centraliza `routeAction` y expone wrappers para catálogo, FEEDBACK, Inbox y acciones. Falta cerrar el mapa de consumidores para acciones de sesión y contrastar cada wrapper con su llamada real, para detectar doble routing, doble fetch, reintentos superpuestos, carga de snapshot duplicada y solicitudes iniciadas por varios módulos al abrir una pantalla.
9. **Catálogo, imágenes y vídeos:** revisar `catalogRequest.js`, `catalogStatus.js`, `imageObjectUrlCache.js`, `thumbnailCompressionQueue.js`, `youtubeUpload.js`, `pys-data.js`, los componentes de lightbox/miniaturas y los handlers backend. Medir caché, concurrencia, cancelación, URLs temporales, compresión, miniaturas, lecturas Drive y rehidratación de vistas. No cambiar calidad, formatos ni límites sin pruebas de compatibilidad.

## Tareas pendientes y orden de ejecución

### P0 — mapa de llamadas y línea base medible
- [ ] Construir un mapa de llamadas navegador → endpoint → handler → servicios dependientes para AUTH, USERS, WRITE, FEEDBACK, ADMIN, CATALOG, UTILITIES y COORDINATOR.
- [ ] Inventariar todos los `UrlFetchApp.fetch`, wrappers de fetch, llamadas a `routeAction`, reintentos y publicaciones de catálogo; registrar origen, destino, acción, consumidor y propósito.
- [ ] Identificar llamadas duplicadas en una misma interacción y solicitudes paralelas que descargan el mismo dato.
- [ ] Definir mediciones reproducibles por flujo: abrir aplicación, catálogo, búsqueda, detalle, crear/editar corte, PyS, tutorial, vídeo, reporte, Inbox y carga de imágenes. Medir requests, bytes, latencia p50/p95, lecturas/escrituras y tiempo de espera. Distinguir caché fría/caliente y red normal/lenta.
- [ ] Añadir o reutilizar instrumentación local no bloqueante; no introducir telemetría remota síncrona ni escrituras por cada clic.

### P0 — sesión, AUTH y USERS
- [ ] Completar mapa de consumidores reales de `touchSession`, `acceptTerms`, `validateSession`, `createUser`, `deleteUser`, recuperación, cambio de contraseña y logout.
- [ ] Determinar si `touchSession` y `acceptTerms` generan tráfico redundante o coordinación innecesaria; retirar solo después de probar las rutas de consumidor y el contrato de sesión.
- [ ] Revisar las políticas de lease AUTH frente a §15: mantener solo las excepciones explícitas (cierre remoto, invalidación de caché/sesiones, eliminación de cuenta e intentos fallidos temporales), y documentar cualquier dependencia estrictamente necesaria.
- [ ] Verificar que rol/capacidad se resuelven desde sesión confiable sin consultas remotas por acción; mantener RBAC y no confiar en datos del navegador.
- [ ] Resolver la coordinación USERS `createUser` ↔ AUTH `deleteUser`: probar carreras, reintentos y cuentas parcialmente creadas; proponer el mecanismo mínimo seguro antes de retirar la lease.
- [ ] Auditar llamadas de revocación/sincronización de sesiones desde handlers AUTH y detectar validaciones repetidas en la misma operación.
- [ ] Probar caché de actor: hit/miss, expiración, invalidación por logout/eliminación/cambio de rol y fallos de Coordinator. Asegurar que la caché no permita conservar permisos revocados más allá de la política admitida.

### P1 — aportes y dependencias entre servicios
- [ ] WRITE: trazar cada alta/edición de corte desde frontend hasta Spreadsheet/Drive y CATALOG; localizar lecturas previas repetidas, read-backs duplicados, reservas repetidas y publicaciones redundantes.
- [ ] FEEDBACK: auditar reportes, sugerencias, votos, PyS, tutoriales y vídeos; confirmar que cada operación escribe una sola vez, registra actor/fecha una sola vez y publica una invalidación/delta adecuada.
- [ ] ADMIN: trazar cada acción que consulta WRITE/CATALOG/FEEDBACK; evitar volver a pedir información ya disponible y separar operaciones de mantenimiento/destructivas de flujos ordinarios.
- [ ] CATALOG/Coordinator: comprobar cursores, deltas, resets, snapshots, invalidaciones y lecturas duplicadas; verificar que el cliente no descarga un snapshot completo después de recibir un delta válido.
- [ ] Inbox y actividad: comprobar que la eliminación de locks no introdujo lecturas repetidas, refrescos completos ni pérdida de datos; confirmar caché por usuario/sesión y paginación.
- [ ] Confirmar que servicios que comparten datos solo hacen la llamada interservicio necesaria; no sustituir una llamada de servidor por múltiples llamadas del navegador.

### P1 — imágenes, vídeos y otros archivos
- [ ] Trazar upload de imagen desde selección hasta persistencia y vista: compresión, tamaño, MIME, base64/data URL, llamadas HTTP, Drive, metadata y respuesta al cliente.
- [ ] Detectar si imagen original y miniatura se suben/descargan más de una vez; reutilizar URL/metadata ya devuelta cuando sea seguro.
- [ ] Revisar caché de ObjectURL, liberación de URLs, miniaturas y lightbox; evitar relecturas y recreación de blobs en cada apertura.
- [ ] Revisar colas de compresión/cargas concurrentes, cancelación al cerrar modal, reintentos y duplicación de la misma operación.
- [ ] Trazar vídeos/YouTube: carga, verificación, aprobación, miniaturas, reproducción embebida y consultas de estado; no descargar el vídeo completo si basta con metadatos/URL.
- [ ] Medir si los tiempos se consumen en cliente, transferencia, Apps Script, Drive o proyección CATALOG; no atribuir mejoras sin mediciones.

### P2 — optimización general y cierre
- [ ] Revisar inicialización de módulos, listeners duplicados, polling, observers, timers, consultas de navegación y renderizados que disparen requests.
- [ ] Revisar cachés y almacenamiento local (IndexedDB/localStorage/Cache API) por duplicación de datos, invalidación excesiva o bloqueo de render.
- [ ] Ejecutar pruebas de regresión de contratos y rendimiento; comparar línea base antes/después con el mismo escenario.
- [ ] Actualizar la matriz de llamadas y documentar qué llamadas se eliminaron, cuáles se conservaron y la razón técnica.
- [ ] Completar Beta aislada de concurrencia, Drive/Spreadsheet, uploads, PWA y navegadores. No usar recursos productivos.

## Criterios para retirar una llamada o bloqueo

Una llamada solo se elimina si se demuestra que no aporta autenticación requerida, RBAC, integridad, unicidad, idempotencia, persistencia, recuperación o invalidación necesaria. Cada cambio debe incluir:
- consumidor exacto y flujo de datos antes/después;
- número de viajes de red/servicio antes y después;
- prueba de caso normal, reintento, concurrencia y fallo parcial según el riesgo;
- verificación de que el servicio no depende de un efecto lateral eliminado;
- regresión integral y medición comparable.

## Estado de validación

Esta es una auditoría estática inicial y un plan de trabajo, no una certificación de rendimiento. No se ha medido aún la latencia real ni se han ejecutado pruebas Beta. No se han cambiado servicios Apps Script, endpoints, secretos, Spreadsheet ni Drive productivos. La base protegida no se modifica.


## Hallazgos de inspección estática — primera pasada (2026-11-21)

### Navegador, catálogo y reintentos
- `routeAction` realiza un único POST por invocación. Su telemetría de navegador (`recordBrowserServiceTraffic`) se ejecuta en memoria local y sus errores se ignoran; no añade un segundo viaje de red ni una escritura al servidor.
- `routeActionWithRetry` admite hasta tres intentos por defecto. El catálogo usa `runCatalogRequestWithRetry` para lecturas; en el cliente también hay reintentos explícitos para acciones ADMIN. Las acciones `applyCortesImageOrganizer` y `rollbackCortesImageOrganizer` permiten dos intentos y envían identificadores/manifiestos de operación; hay que verificar la idempotencia real del backend ante respuesta perdida. `backupDatabase` y `applyCortesImageReconciliation` están limitadas explícitamente a un intento. No se cambió esta política.
- La sincronización inicial distingue snapshot completo (`getCatalogData`) de feed incremental (`getCatalogChanges`). No se consideran llamadas duplicadas automáticamente: el snapshot inicial/reset y los deltas cumplen contratos distintos. Debe medirse y comprobarse que no se solicite snapshot completo después de una sincronización incremental válida.
- En `ui.js`, al cerrar la edición se vuelve a solicitar `getCatalogData` en ambos caminos de reapertura/cierre. Es una candidata a reemplazo por actualización local o delta, pero primero hay que comprobar el contrato de la edición, los cambios concurrentes y la respuesta del backend.

### AUTH y sesiones
- En los módulos frontend principales inspeccionados (`api-config.js`, `auth.js`, `main.js`, `ui.js`, `navigation.js`) no se encontró una invocación de `touchSession`; solo aparece en el mapa de acciones y en el dispatcher AUTH. La acción sigue habilitada y su handler `validateAndTouchSession_` adquiere ScriptLock con espera de 10 s, lee las hojas completas ActiveSessions y Users y vuelve a validar identidad/estado. Es un candidato a ruta legacy costosa, no se elimina hasta terminar búsqueda de consumidores externos, pruebas y confirmar su reemplazo funcional.
- El Coordinator ya actualiza `SESSION_CONTEXTS.lastActivityAt` cuando autoriza una sesión y han transcurrido cinco minutos desde el último toque. Esto puede solapar parte del propósito de `touchSession`, pero no demuestra que también cubra el espejo histórico de ActiveSessions.
- `acceptTerms` sí tiene un consumidor frontend concreto (`syncPendingTermsAcceptance_` en `ui.js)); deduplica solicitudes concurrentes por clave de usuario/dispositivo/versión/token. Su lease AUTH y escritura en USERS deben evaluarse aparte, no tratarse como acción huérfana.
- `validateSession` está expuesta en el mapa y llamada desde `validateSessionCoordinated`; la restauración ordinaria de sesión en `checkSession` no fuerza una revalidación remota. Falta completar el mapa de invocadores de `validateActiveSession` y medir su frecuencia.

### Imágenes y aportes
- Reportes y sugerencias de cambio leen el archivo con FileReader y envían un data URL Base64 a FEEDBACK. El cliente permite hasta 3 MB, y FEEDBACK vuelve a decodificar, validar firma/MIME/tamaño, calcular SHA-256 y crear el archivo en Drive. No se encontró compresión/redimensionado previo en esos dos formularios. El Base64 aumenta el tamaño transferido aproximadamente un tercio respecto de los bytes originales; el coste debe medirse.
- El alta de corte y los formularios de información suplementaria también convierten imágenes a data URL y las envían en el payload WRITE. En el alta de corte inspeccionada no aparece un límite de tamaño ni compresión previa en cliente; el backend WRITE aplica un máximo de 10 MB. Esto puede producir payloads grandes y consumo de memoria; registrar tarea para validación de UX, calidad visual y límite consistente antes de cambiarlo.
- Las imágenes de reemplazo ADMIN se envían como `fileData` con `opId`; el backend conserva ledger/journal, verificación y read-back. No se retirarán esas garantías para reducir viajes.
- `thumbnailCompressionQueue` limita a dos las compresiones concurrentes de miniaturas; `imageObjectUrlCache` administra URLs de objetos. La cola es de miniaturas, no evidencia de compresión de los originales antes de subirlos.
- La carga YouTube es directa del navegador a YouTube en bloques reanudables de 8 MB, con progreso persistido en IndexedDB, consulta de offset y envío final de metadatos a FEEDBACK. No se observa transferencia del archivo de vídeo completo a través de Apps Script. Mantener el flujo y medir llamadas de estado/reanudación por separado.

### Llamadas interservicio y proyección ADMIN
- El cliente compartido hace llamadas a Coordinator para leases, validación/invalidez de sesión y publicación de cambios de catálogo. Su wrapper puede reintentar una solicitud interna una vez reutilizando el mismo requestId; debe conservarse solo donde la idempotencia del protocolo lo garantice.
- ADMIN llama a WRITE para reservar/congelar IDs; son dependencias explícitas de autoridad de IDs, no llamadas redundantes demostradas.
- ADMIN solicita a CATALOG `getCatalogData(forceRefresh:true)` para obtener la proyección completa en `getAdminProjectedVehicleFieldSnapshot_` y para construir candidatos de aportes. Además, `getReplacedImages` invoca internamente `handleGetVehicleContributionCandidates_`, que vuelve a solicitar la proyección completa de CATALOG en cada carga del inventario. Es una dependencia funcional pero potencialmente costosa; evaluar endpoint de consulta dirigida por vehículo/campo y/o candidatos sin cargar todo el catálogo.
- La telemetría ADMIN agrega fuentes con `UrlFetchApp.fetchAll` y fallback individual. Es una consulta administrativa explícita, no forma parte del flujo normal de aportes; medir su coste y mantenerla fuera de navegación común.

### Estado y límites de esta pasada
- Se completó una primera inspección estática de rutas clave; no equivale a un mapa exhaustivo de todos los consumidores ni a un benchmark.
- No se modificó código productivo, no se retiraron locks/leases/llamadas, no se ejecutaron pruebas de rendimiento ni Beta y no se desplegaron proyectos Apps Script.
- Las tareas de confirmación, pruebas de idempotencia, compresión y reducción de consultas completas quedan pendientes en `Tareas_Activas.md`.


### Hallazgos adicionales — imágenes y refrescos después de aportes
- `offline.saveCatalog` y `offline.saveCatalogWithCursor` llaman a `cacheItemImages` para los últimos 15 vehículos después de persistir el catálogo. Cada vehículo puede aportar hasta 11 campos de imagen. El trabajo se ejecuta en segundo plano y la cola limita la compresión a dos tareas simultáneas, pero no está priorizado por visibilidad ni por interacción actual; puede encolar muchas descargas/compresiones que compitan con imágenes visibles y aportes.
- `offline.saveViewedItem` también llama a `cacheItemImages` para el vehículo consultado. Se debe determinar si el prefetch amplio es útil para uso offline o si descarga imágenes no visibles sin beneficio inmediato.
- `setOptimizedImage` asigna de inmediato la URL remota al elemento `img`; en paralelo consulta IndexedDB y, si no hay miniatura, llama a `compressAndStoreThumbnail`, que ejecuta un `fetch` independiente a la misma URL normalizada. Son dos iniciadores de solicitud para el mismo recurso en el primer miss; el caché HTTP del navegador podría evitar una segunda transferencia física, pero eso depende de las cabeceras/estado de caché y no está demostrado. Debe medirse en Network con caché fría/caliente.
- `refreshVehicleDetailAfterExpansion_` ejecuta `getCatalogData(forceRefresh:true)` después de confirmar aportes de corte e información suplementaria, aunque la sincronización principal dispone de feed incremental. Es un viaje adicional de snapshot completo por aporte para refrescar un solo vehículo; no retirarlo hasta diseñar una lectura dirigida o una actualización local/delta que preserve candidatos, fuentes y conflictos.
- La restauración de edición usa lecturas completas antes y después de escrituras para comparar y verificar el rollback de campos; estas lecturas tienen una finalidad de integridad y no deben clasificarse como redundantes sin rediseñar el contrato de verificación.



### Confirmación estática de reintentos Safe Apply
- Se revisaron las rutas de `applyCortesImageOrganizer` y `rollbackCortesImageOrganizer`. Ambas reciben identificadores estables de operación; el backend conserva un ledger por operación y distingue estados ya aplicados/revertidos de operaciones nuevas o incompletas.
- El replay de aplicación devuelve `already_applied` solo si Drive sigue coincidiendo exactamente con el destino confirmado por ledger; el replay de rollback devuelve `already_rolled_back` solo si Drive coincide con el origen. Los cambios de estado se verifican y los fallos parciales pasan a `retry`/ `needs_review` según el caso.
- `JS/Tests/CortesImageOrganizerExecutor.mjs` contiene pruebas explícitas de reintento idempotente de aplicación y rollback, además de contención/fallo parcial. Por ello, los dos intentos configurados en frontend tienen soporte de diseño y contrato; no se recomienda quitarlos por defecto. La ejecución de estas pruebas no se realizó en esta sesión.
- `backupDatabase` y `applyCortesImageReconciliation` se invocan con `maxAttempts: 1`, evitando replay automático de esas operaciones.



### Catálogo incremental y snapshot completo
- El cliente obtiene `getCatalogChanges` mediante GET a FEEDBACK. El `doGet` de FEEDBACK llama a `getSharedCatalogChanges_`, que realiza un segundo GET servidor-a-servidor al Coordinator. El Coordinator ya expone `doGet?catalogFeed=1` como feed público, con solo eventos publicados de catálogo y sin credenciales; existe por tanto un salto de red FEEDBACK que puede ser prescindible.
- El feed público del Coordinator toma el lock interno para leer revisiones y registra el tráfico como CATALOG. La ruta FEEDBACK registra el tráfico como FEEDBACK. Si se evalúa la consulta directa desde navegador, hay que conservar la semántica de telemetría, confirmar CORS/redirect de Apps Script, validar que el feed solo expone snapshots públicos y comprobar despliegue/compatibilidad antes de cambiar el endpoint.
- `handleGetCatalogData` consulta CacheService, pero la escritura del snapshot está deshabilitada porque `allData` excede el límite de 100 KB. En una caché fría o sin entrada heredada, cada solicitud reconstruye el snapshot leyendo Cortes, Likes, AportesVehiculo, Logos, Tutoriales/eventos y Relay. `forceRefresh:true` omite la lectura de caché heredada y fuerza esa reconstrucción; no es una caché efectiva para los snapshots actuales.
- El snapshot completo es necesario para inicio, recuperación/reset y ciertos procesos de verificación; para refrescar un solo vehículo tras un aporte conviene estudiar un endpoint CATALOG dirigido o aplicar el delta confirmado al estado local, sin debilitar la verificación de fuente/candidato.



### Hallazgo confirmado — refresco CATALOG después de solicitar vídeo
- `openYouTubeUploadModal` invoca `onSuccess` tras guardar la solicitud de aprobación con estado `pending`. El mensaje al usuario confirma que el vídeo solo aparecerá en GPSpedia después de aprobarse.
- `handleSubmitVideoForApproval` registra la solicitud pendiente en FEEDBACK; no modifica las hojas/proyección de catálogo ni publica un cambio. `submitVideoForApproval` tampoco figura entre los publicadores autorizados de cambios CATALOG en Coordinator.
- A pesar de ello, los formularios de vídeo de corte y tutorial ejecutan `routeAction("getCatalogData")` en `onSuccess`. Son dos puntos de refresco completo que no pueden reflejar el vídeo pendiente y constituyen llamadas redundantes confirmadas por el contrato actual.
- La retirada debe conservar la confirmación visual del envío y el control de duplicados por `opVideoId`; no debe eliminar la consulta de estado de aprobación ni el refresco que corresponda a la aprobación final.



### Corrección local aplicada — snapshots redundantes después de vídeo pending
- Se retiraron los callbacks `onSuccess → getCatalogData` de las dos rutas de subida de vídeo de tutorial y corte existentes. La operación de envío crea únicamente la solicitud pending en FEEDBACK; no hay cambio de catálogo que el snapshot pueda mostrar.
- Se conserva la confirmación visual y la operación de aprobación; el cambio no altera el modal ni el envío resumable.
- Se conserva el refresco de PyS (`invalidatePysDataCache` + `loadPysData`), porque su publicación/actualización de datos tiene un contrato distinto.
- Se añadió `JS/Tests/YouTubePendingRefreshContract.js` y se integró en `RunServiceTests.mjs`.
- Validación ejecutada en entorno aislado V8: contrato frontend 3/3 PASS; suite backend `YouTubeApproval.js` 16/16 PASS. La evaluación del contrato también verificó parsing del test; no se ejecutó el runner Node completo ni GitHub Actions en esta sesión.
- La tarea se considera completada localmente para estos dos refrescos. No implica que el resto de la auditoría de latencia esté terminada ni que exista un benchmark global.



### Prevalidación de tamaño para imágenes del formulario de cortes
- `HTML/add_cortes.html` ahora rechaza archivos superiores a 10 MiB en dos puntos: antes de leerlos para la previsualización y antes de convertirlos a Base64 al enviar. El límite coincide con `validateAddCutImage_` / `IMAGE_UPLOAD_MAX_BYTES` del backend WRITE (10 MiB por imagen).
- Se conserva el límite exacto de 10 MiB, el rechazo de archivos vacíos y la lectura normal de archivos permitidos. El error de tamaño se muestra de forma específica y no se envía la solicitud; los datos del formulario permanecen.
- Se añadió `JS/Tests/AddCutImageSizePreflight.mjs` al runner de servicios. Validación aislada del helper: 3/3 PASS (rechazo antes de FileReader, aceptación del límite exacto y rechazo de archivo vacío).
- Esto evita transferir un archivo que el backend rechazaría, pero no comprime archivos válidos ni reduce el tamaño de sus cargas. Compresión/redimensionado y MIME estricto siguen pendientes.



### Prevalidación de imágenes suplementarias en modales de vehículo
- Se incorporó `readSupplementaryImageDataUrl_` para las imágenes de apertura y cable de alimentación. Rechaza archivos vacíos y superiores a 10 MiB antes de FileReader; maneja `onerror`, `onabort`, resultado no válido y excepciones al iniciar lectura.
- Los dos formularios ahora incluyen la lectura dentro de su bloque `try/catch`; un fallo ya no deja la promesa sin manejar ni mantiene el botón deshabilitado indefinidamente. Los errores de tamaño y lectura muestran mensajes específicos.
- El límite coincide con WRITE (`IMAGE_UPLOAD_MAX_BYTES = 10 MiB)); no se modificó validación del servidor, formato MIME ni tamaño permitido.
- Se añadió `JS/Tests/AddSupplementaryImagePreflight.mjs` al runner. Validación aislada del helper: 4/4 PASS (rechazo previo, límite exacto, archivo vacío y error FileReader).
- Esto evita leer y transmitir imágenes que el backend rechazará y corrige el manejo de fallos de lectura; no comprime archivos válidos ni demuestra menor tiempo de subida.



### Ampliación — refreshes redundantes en creación y edición PyS/tutorial
- La inspección de todos los consumidores de `openYouTubeUploadModal` encontró tres callbacks adicionales que refrescaban datos al terminar una solicitud de vídeo pending:
  1. Alta de tutorial: `refreshTutorialCatalog` ya se ejecuta inmediatamente después de crear el tutorial, antes de terminar la subida; el callback posterior al vídeo no agrega datos.
  2. Alta PyS: tras crear el problema, el flujo invalida caché y ejecuta `loadPysData` antes de retornar; el callback posterior al vídeo repetía la misma carga, aunque FEEDBACK solo guarda la solicitud pending.
  3. Edición de problema PyS existente: el callback volvía a invalidar y cargar la colección, pero `handleSubmitVideoForApproval` no modifica la hoja PyS.
- Se retiraron esos tres callbacks y el helper `refreshPysAfterVideo_`, además de los dos snapshots completos de tutorial/corte registrados previamente.
- Se conservaron los refreshes inmediatos que sí corresponden a la creación real de un tutorial o problema PyS, y el refresco posterior cuando la aprobación cambia efectivamente el vídeo del catálogo.
- `YouTubePendingRefreshContract.js` amplió su cobertura a cinco escenarios; resultado aislado 5/5 PASS. La suite backend `YouTubeApproval.js` permanece 16/16 PASS.
- Resultado: cinco viajes de red posteriores a solicitudes pending eliminados de estos flujos (tres recargas PyS/tutorial y dos snapshots completos). Es una reducción de llamadas confirmada por código/contrato; el ahorro temporal real aún requiere medición de navegador/red.



### Confirmación de ubicación de cargas Drive respecto a bloqueos
- WRITE alta de corte: `handleAddOrUpdateCutLockedUnsafe_` delega las cargas Drive a `runWriteDriveWorkOutsideScriptLock_`; el helper libera el ScriptLock principal durante la operación externa y reintenta adquirirlo sin espera (`tryLock(0)`). Si otra mutación ocupa WRITE, devuelve estado recuperable y exige conservar el mismo `opId`; no mantiene el lock mientras transfiere la imagen.
- WRITE información suplementaria append-only: `prepareSupplementaryImageUploads_` ejecuta la carga antes de anexar el evento de contribución, sin adquirir un ScriptLock global en esa ruta.
- FEEDBACK reportes y sugerencias: `saveReportImageAttachment_` / `saveSuggestionImageAttachment_` crean el archivo en Drive fuera de ScriptLock; los replays de sugerencias se resuelven antes de Drive y las fallas tienen limpieza/reconciliación del archivo.
- FEEDBACK PyS: `handleAddProblem` crea/verifica el archivo y reserva la operación con estados `UPLOAD_PENDING`/`LINKED`; no se observó ScriptLock en ese flujo. La integridad depende del opId, payloadHash, ledger de operaciones y verificación del archivo, por lo que no se simplifica.
- Resultado: en los flujos de imagen inspeccionados no se encontró una transferencia Drive mantenida bajo un lock global. La carga WRITE sí hace una pausa/reacquisición no bloqueante para proteger el tramo de escritura posterior. Queda pendiente completar ADMIN y medir duración de Drive/transferencia.



### ADMIN — cargas de reemplazo de imagen y locks
- `handleUploadAdminImage` (ruta actual) valida el compare-and-set de la versión esperada, sube a Drive mediante `uploadImageToDrive` y publica el evento de campo; no adquiere ScriptLock global en esa ruta append-only.
- `handleUploadAdminImageLegacy_` conserva ScriptLock breve para reserva/revalidación, pero ejecuta la creación/verificación de Drive dentro de `runAdminContributionDriveWorkOutsideScriptLock_`, que libera el lock, trabaja con el mismo operationId y reacquire con `tryLock(0)` antes de revalidar.
- La reparación de imágenes de `handleAddOrUpdateCutLockedUnsafe_` también usa `runWriteDriveWorkOutsideScriptLock_`. No se detectó una transferencia Drive sostenida dentro de la sección crítica.
- Los locks de eliminación, restauración e inventario ADMIN son operaciones destructivas o de consistencia y no se retiran en esta auditoría sin revisar el ledger, referencias activas, rollback y recuperación.
- La telemetría/inventario y consulta de estado de reemplazo siguen siendo llamadas administrativas separadas; no se ejecutan en cada aporte normal. La consulta de estado puede pedir snapshot CATALOG completo y queda como optimización de recuperación, no del upload principal.



### ADMIN — hallazgo pendiente en carga de logotipos
- `ui.js` lee el logotipo con FileReader sin `onerror` ni `onabort`. Al seleccionar un archivo nuevo, no limpia `selectedLogoBase64` antes de iniciar la nueva lectura; si se envía antes de terminar, el Base64 anterior puede combinarse con el nombre/MIME del archivo nuevo. Tampoco existe un control de secuencia para ignorar resultados tardíos de una lectura anterior.
- `handleAddLogo` decodifica Base64 y crea el archivo Drive antes de intentar el lock no bloqueante para vincular la fila. La transferencia está fuera del lock, pero en el handler inspeccionado no se observó límite de bytes ni verificación de firma binaria; el MIME/extension se deriva de valores declarados.
- Se registra tarea para resolver la carrera de selección, manejo de errores y límite/MIME coherentes en cliente y servidor. No se fija un máximo arbitrario sin decidir el contrato y revisar los tamaños de logos existentes.
- Es una ruta administrativa, no el flujo ordinario de aportes. No se modificó en esta iteración.



### ADMIN — corrección de carrera al leer logotipos
- Se añadió `readLogoFileBase64_` con validación de Data URL, manejo de `onerror`, `onabort`, resultado inválido y excepciones de inicio.
- Al cambiar el archivo, el cliente invalida inmediatamente el Base64/nombre anterior, deshabilita Registrar, y solo habilita el botón cuando la lectura actual termina correctamente. Un contador de generación ignora resultados tardíos de lecturas anteriores.
- Se mantiene el contrato de formatos del selector y el payload enviado a `addLogo`; no se fijó límite de bytes ni se añadió validación de firma/MIME en servidor. Esas dos decisiones siguen pendientes.
- `AdminLogoFileRead.mjs` se integró al runner. Prueba aislada del helper: 4/4 PASS (lectura válida, error, abort y resultado inválido); el contrato estático verifica invalidación/generación/botón.
- No se modificó el handler Drive, ni el lock no bloqueante de vinculación.



### P0.1 — mapa estático de llamadas y dependencias (2026-11-21)

- Se inspeccionaron los dispatchers activos y el router central del frontend. El detalle se conserva en `MAPA_LLAMADAS_DEPENDENCIAS_P0_2026-11-21.md`.
- Se confirmó que `routeAction` realiza un POST por invocación; `routeActionWithRetry` puede generar hasta tres intentos retryables. La telemetría del navegador es local y no transmite métricas.
- AUTH/USERS/WRITE/FEEDBACK/ADMIN usan `SharedMutationClient` en las operaciones aplicables; una lease normal requiere acquire/release y las publicaciones de catálogo generan llamadas adicionales. WRITE/FEEDBACK usan caché de actor; cache miss valida contexto con Coordinator. ADMIN delega operaciones de ID a WRITE y consultas dirigidas a CATALOG.
- Inventario estático: WRITE 1 UrlFetch; FEEDBACK 1; ADMIN 7 + 1 fetchAll; Coordinator 1 + 1 fetchAll. SharedMutationClient contiene adaptadores de fetch, no requests ejecutados por cada interacción. AUTH, USERS, CATALOG y Utilities no tienen fetch externo directo en sus fuentes principales.
- Estado: P0.1 COMPLETADA localmente por inspección/documentación. P0.2 sigue pendiente: no hay evidencia de requests reales, bytes, p50/p95 ni operaciones Spreadsheet/Drive. Requiere harness de medición y Beta autorizada.


### P0.2 — instrumentación local de transferencia (2026-11-21)

- `routeActionInternal_` serializa el cuerpo una sola vez y mide su tamaño UTF-8; después de leer una respuesta HTTP válida mide los bytes del cuerpo recibido. La medición no cambia el payload ni añade requests.
- `serviceTelemetry.js` conserva totales y promedios de bytes request/response por servicio, además de duración/resultado. Los eventos siguen limitados a 200 y en memoria; no almacenan payload, token ni identidad.
- `ServiceBrowserTrafficContract.mjs` amplía cobertura de agregación de bytes y propagación de métricas. El commit actual disparó GitHub Actions; al momento del registro los checks build, service-tests y deployed-service-health siguen en ejecución, por lo que no se declaran aprobados.
- Esta instrumentación mide el cuerpo HTTP observado por el navegador, no el overhead TLS/HTTP, bytes de recursos multimedia servidos directamente ni operaciones internas Spreadsheet/Drive. Los valores de latencia siguen siendo duración total del request desde el navegador.
- P0.2 continúa abierto para la ejecución de escenarios reproducibles y la obtención de p50/p95/requests por interacción en Beta autorizada.
