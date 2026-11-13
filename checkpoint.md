# Checkpoint activo — GPSpedia

Normativa única: [NORMAS_DESAROLLO.md](NORMAS_DESAROLLO.md). Este archivo conserva únicamente continuidad vigente; el historial anterior permanece inmutable en el archivo legacy.

## Historial rotado
- Archivo: `Olds/Documentacion_Legacy/checkpoint_legacy_parte_007.md`
- Blob fuente: `52a0ce1c2c0d003c9f87e4b2e2715d0c1da34568`
- Caracteres Unicode: 179499.
- Manifiesto e integridad: `Olds/Documentacion_Legacy/README.md`, rotación incremental 2026-11-12.

================================================================================
CHECKPOINT DE CIERRE — AUG-107 — 2026-11-12
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
HEAD padre verificado antes de publicar: 0de1f233b3aeb47970dc6249981aa6cef063a5a6.
HEAD de la rama base: d9acc68d889985c2e2f42fe3a02e502efc86ead1; sin modificaciones.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- La revisión confirmó que AUG-107 ya estaba resuelta funcionalmente por H-AUD-040-014 y su adenda, sin necesidad de duplicar cambios de código.
- ui.js espera la respuesta de suggestYear mediante confirmValidationBeforeCache antes de guardar validationCache; el flujo «Modelo confirmado» también espera la respuesta.
- validationSubmission.js solo permite persistir la caché ante recorded=true. Fallos de red, estados desconocidos y respuestas info no confirmadas no se convierten en validaciones locales.
- La interfaz presenta estado pendiente, confirmación o error y permite reintentar; un fallo de IndexedDB se diferencia de un fallo del registro backend.
- FEEDBACK diferencia los aportes efectivamente registrados de los no-op/recuperados y mantiene deduplicación por actor, vehículo y año.

Evidencia local existente:
- ValidationCacheConfirmation.js: 7/7 PASS.
- runFeedbackWriteSecurityTests(): 44/44 PASS.
- Parsing de ui.js, Services/feedback.js, validationSubmission.js y suites asociadas: PASS.
- Evidencia recuperada de Auditoría.txt, H-AUD-040-014 y adenda de validación del 2026-11-10. No se repitieron pruebas con evidencia vigente.

Validación Beta pendiente: timeout/offline en navegador real, pérdida de respuesta tras persistencia, recarga y reintento contra FEEDBACK/Spreadsheet aislados, IndexedDB real y flujo «Modelo confirmado». No se ejecutaron deployments ni se modificaron datos productivos.

Archivos actualizados: Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt, checkpoint.md y Olds/Documentacion_Legacy/README.md; se archivó el checkpoint previo sin modificar su contenido.
Siguiente tarea: AUG-108 — Individualizar validationCache por usuario y vehículo. No iniciar hasta la siguiente interacción/sesión.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-108 — 2026-11-12
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
HEAD padre verificado antes de publicar: af26e1f0e4a1e4bf5ca0feacd86ced81995de360.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- Se confirmó que la individualización de validationCache ya estaba implementada en AUG-051; AUG-108 duplicaba el requisito en el backlog.
- offline.js guarda con clave compuesta ownerId/vehicleId y comprueba ambos valores al recuperar.
- ui.js consulta con la identidad de la cuenta activa.
- No se permite guardar ni recuperar caché sin ownerId válido. Los usuarios anónimos no comparten respuestas locales.
- No se duplicó código funcional.

Evidencia:
- Services/Test/IndexedDBTransactions.js contiene el caso «validationCache aislado por cuenta»: user-a recupera su respuesta, user-b no la ve y la escritura sin propietario se rechaza.
- La cobertura histórica de AUG-051 incluyó esta prueba en la suite IndexedDBTransactions ejecutada en runtime V8 adaptado.
- No se ejecutó Node CLI ni IndexedDB/navegador real en esta interacción.

Validación Beta pendiente:
- Dos cuentas escribiendo el mismo vehículo en el mismo perfil del navegador.
- Cambio de cuenta/logout y sesiones separadas en pestañas o ventanas.
- Confirmar que una sesión anónima no recibe caché de cuentas registradas ni guarda una entrada compartida.

Archivos actualizados: Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md.
Siguiente tarea: AUG-109 — Definir controles de confianza para aportaciones anónimas. No iniciar dentro de esta tarea.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-109 — 2026-11-12
Repositorio: infogpstech/GPSpedia.
Rama: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
HEAD previo al primer commit de la tarea: 7688414112a42ef751f45b6b7a6cb1e8ab3f197b. Publicación final verificada tras commit de corrección documental; padre inmediato del commit final: 3564732329be511afb4452eba31445643ea4cf4b.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Política y resultado:
- Las aportaciones anónimas se conservan para revisión manual; no se consideran identidad humana ni aportante independiente.
- El backend asigna anon:unverified e ignora identificadores enviados por el navegador.
- Solo las claves user:<ID> derivadas de sesiones validadas participan en el umbral de tres aportantes para cambios automáticos.
- suggestYear limita aportes anónimos a 30 solicitudes por hora mediante CacheService. Es un límite global del proyecto/ventana, no una defensa por IP/persona.
- La deduplicación actor/vehículo/año impide que el mismo aporte anónimo, incluso con un ID de navegador regenerado, genere otra fila o actividad.

Pruebas:
- Services/Test/FeedbackWriteSecurity.js se amplió para probar repetición y regeneración de anonymousReporterId.
- La suite fue ejecutada en un runtime V8 adaptado con stubs globales. Los casos de anonimato/umbral/repetición y derivación de actor aprobaron; la suite completa no quedó verde en ese runtime porque faltaron contratos globales de Apps Script en casos ajenos al alcance (SpreadsheetApp y dobles de PyS/sheets). No se declara PASS global.
- Beta pendiente: CacheService real, concurrencia, revisión manual y comportamiento multi-dispositivo en deployment y Spreadsheet aislados.

Archivos actualizados: Services/Test/FeedbackWriteSecurity.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md.
Siguiente tarea: AUG-110 — Desacoplar la validación comunitaria de la carga de imágenes. No iniciar dentro de esta tarea.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-110 — 2026-11-12
Repositorio: infogpstech/GPSpedia.
Rama: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- La validación comunitaria se inicia al construir el modal de vehículo, no desde img.onload del corte recomendado.
- El flujo cubre vehículos sin imagen principal, cortes sin imagen y cortes alternativos lazy; una sola solicitud se inicia por vehículo/modal.
- Los resultados se descartan si el modal se cerró o cambió de vehículo antes de completar la comprobación.
- Se conserva showValidationBanner y su anclaje visual actual: debajo de la imagen principal cuando existe; en su ausencia, usa la cabecera.

Pruebas locales:
- Services/Test/ValidationBannerLifecycle.js: 6/6 PASS (Node.js); parsing de validationBannerLifecycle.js y de la suite: PASS.
- La validación real en navegador con imágenes/IndexedDB y catálogo aislado queda para Beta; no se ejecutaron deployments ni se modificaron datos productivos.

Archivos: ui.js, validationBannerLifecycle.js, Services/Test/ValidationBannerLifecycle.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md.
Siguiente tarea: AUG-111 — Documentar suggestionActorKey en el esquema de Feedbacks. No iniciar dentro de esta tarea.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-111 — 2026-11-12
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
Estado: COMPLETADA.

Resultado:
- Se documentó suggestionActorKey como columna auxiliar dinámica de Feedbacks, distinta de las nueve columnas funcionales A:I del inventario original.
- Su ubicación se determina al crearla: columna posterior al último encabezado utilizado. No tiene letra fija; se localiza por encabezado.
- Formatos documentados: user:<ID> para cuentas autenticadas, anon:unverified para aportes anónimos y applied:<clave-original> para conservar sugerencias positivas ya aplicadas sin contarlas de nuevo.
- Se documentaron validación/idempotencia, compatibilidad con filas históricas sin clave y conservación en respaldos/restauraciones.
- Se añadió prueba de contrato documental que compara el esquema con Services/feedback.js.

Validación local:
- Contrato documental ejecutado en runtime V8 adaptado: 8/8 comprobaciones PASS (nueve encabezados y orden, ubicación dinámica, formatos user:/anon:/applied:, idempotencia, compatibilidad histórica y respaldo/restauración). Parsing sintáctico del archivo de prueba: PASS.
- No se ejecutó Node CLI ni se accedió a Spreadsheet real; la ejecución del comando en el repositorio clonado y la restauración en Spreadsheet aislada quedan para Beta.
- No se accedió a Spreadsheet ni se modificaron datos. La restauración de respaldos y la verificación con Spreadsheet aislada quedan para Beta.

Archivos actualizados: Spreadsheet/GPSpedia_DB_columnas.md, Services/Test/SuggestionActorSchemaDocumentation.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md.
Siguiente tarea: AUG-112 — Reconciliar la entrada de AUD-T-016 en Auditoría.txt. No iniciar dentro de esta tarea.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-112 — 2026-11-12
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
Estado: COMPLETADA.

Resultado:
- Se comprobó mediante el blob Git de Auditoría.txt que el registro activo no contenía AUD-T-016 ni H-AUD-016-001 a 004.
- Se reconstruyeron e incorporaron al final del registro los cuatro hallazgos a partir de Plan_Auditoria histórico, Consolidacion_Auditoria histórico y las entradas originales AUG-102 a AUG-105. Se documentaron origen AUD-20261108-S034/AUD-CP-0034, HEAD E1, evidencia, impacto, resolución y límites de validación.
- Se verificó la correspondencia H-AUD-016-001→AUG-102, 002→AUG-103, 003→AUG-104 y 004→AUG-105. Las cuatro tareas están COMPLETADAS CON VALIDACIÓN DIFERIDA.
- H-AUD-016-005 queda expresamente separado como ampliación posterior documentada en la consolidación histórica y vinculada a AUG-103; no se presenta como parte de los cuatro hallazgos originales.
- Los archivos inmutables Olds/Documentacion_Legacy no se modificaron.

Validación local:
- Comprobación documental: cuatro encabezados H-AUD-016-001 a 004, cada uno presente una sola vez; cuatro referencias AUG correctas; evidencia/origen/impacto/resolución/validación diferida presentes en cada entrada; estado y referencias del backlog coherentes.
- Tamaño final de Auditoría.txt: 109842 caracteres Unicode, inferior al umbral de rotación de 180,000.
- No se ejecutaron pruebas de aplicación, navegador ni servicios; esta tarea fue documental. No se alteraron datos productivos ni deployments.

Archivos actualizados: Auditoría.txt, Tareas_pendientes_parte2.txt, ChangesLogs.txt y checkpoint.md.
Siguiente tarea: AUG-113 — Corregir XSS almacenado en el dashboard de actividad. No iniciar dentro de esta tarea.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-113 — 2026-11-13
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- El dashboard ya no interpola valores del historial en innerHTML. ui.js delega el renderizado a activityDashboard.js, que crea filas/celdas con createElement y utiliza textContent para fecha, nombre, tipo y detalle.
- Los registros históricos se consideran no confiables; valores nulos/no escalares y fechas inválidas tienen fallback textual vacío.
- La revisión de backend confirmó que recordLike ya exigía sesión mediante assertFeedbackSession y reemplazaba userId/userName/userRole con el actor derivado de Users. No se abrió una ruta anónima ni se debilitó la autorización.
- La regresión de POST directo en FeedbackWriteSecurity.js ahora usa un nombre HTML malicioso falsificado y verifica rechazo adicional cuando falta la sesión.

Validación local:
- Runtime V8 adaptado: 6/6 escenarios PASS (payloads HTML/SVG literales, valores mixtos/ausentes, limpieza, integración del dashboard, contrato backend y payload de identidad falsificada).
- Parsing sintáctico adaptado: activityDashboard.js, ui.js, Services/feedback.js, Services/Test/FeedbackWriteSecurity.js y Services/Test/ActivityDashboardStoredXss.js, 5/5 PASS.
- No se ejecutó Node CLI desde un checkout local; las suites reproducibles quedan documentadas en Services/Test/README.md.

Validación Beta pendiente:
- DOM/navegador real con historial malicioso sembrado en Spreadsheet aislada.
- POST contra FEEDBACK/Spreadsheet aislados con sesión válida falsificada, ausente, inválida, expirada, revocada y cruzada. Confirmar no ejecución, no escritura indebida y conservación de likes normales.
- No se ejecutaron endpoints, deployments ni datos productivos.

Archivos: ui.js, activityDashboard.js, Services/Test/ActivityDashboardStoredXss.js, Services/Test/FeedbackWriteSecurity.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt, Auditoría.txt y checkpoint.md.
Siguiente tarea: AUG-114 — Corregir XSS y validación de URL en Inbox. No iniciar dentro de esta tarea.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-114 — 2026-11-12
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
HEAD padre verificado antes de publicar: 6876dae471e3d3e3169ba8e3fd3ac96d2e6b3c61.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- Services/feedback.js normaliza título, descripción y nombre del colaborador antes de persistir solicitudes de vídeo. Los metadatos se filtran mediante esquemas permitidos por tipo de contenido; se conservan solo campos esperados y se limita cada valor/lista.
- Las URL nuevas se canonicalizan a HTTPS YouTube después de validar host/ruta/ID y coincidencia con videoId. Los registros históricos del Inbox se normalizan en lectura; una URL no permitida se devuelve vacía y no genera enlace.
- La lectura del Inbox limita campos de texto y metadatos históricos. ui.js representa el cuerpo del mensaje mediante textContent; las respuestas enriquecidas conservan el sanitizador específico.
- Se amplió Services/Test/InboxStoredXss.js con pruebas de helper, esquema, URL y contratos de lectura/escritura, preservando la cobertura AUG-076.

Validación local:
- runInboxStoredXssTests({ui, feedback}): 30/30 PASS.
- Parsing completo de Services/feedback.js: PASS; parsing de renderizadores Inbox afectados: PASS.
- No se ejecutaron endpoints, deployments ni datos productivos.

Validación Beta pendiente: filas históricas maliciosas/URL manipuladas en Spreadsheet aislada; inspección DOM en navegador real; envíos nuevos mediante FEEDBACK aislado y regresión del flujo de aprobación para corte, PyS y tutorial.

Archivos actualizados: Services/feedback.js, ui.js, Services/Test/InboxStoredXss.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, Auditoría.txt, lista_beta.txt y checkpoint.md.
Siguiente tarea: AUG-115 — Unificar el campo de rol utilizado por el Inbox. No iniciar dentro de esta tarea.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-115 — 2026-11-12
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- `Services/Auth.js` confirma que el login entrega `user.Privilegios` desde la columna canónica `Users.Privilegios`.
- `getUiSessionContext_()` normaliza `currentUser.Privilegios` y produce `context.role`; `renderInboxDetail()` ahora utiliza ese rol normalizado para decidir la visibilidad de los controles de aprobación, sin volver a leer propiedades de rol del objeto `currentUser`.
- Se centralizó la allowlist visual en `canApproveInboxVideo_()`: Desarrollador, Gefe y Supervisor. Jefe, Técnico, Técnico exterior, Anónimo y valores vacíos no reciben controles de aprobación.
- No se modificó el backend: `authorizeFeedbackAction_()` ya valida la sesión con `assertFeedbackSession()`, deriva `userRole` del actor autenticado y conserva RBAC para aprobación/rechazo. El rol enviado por el navegador es sustituido.

Validación local:
- `Services/Test/InboxRoleContract.js`: 7/7 PASS en harness aislado con las fuentes vigentes.
- Casos: `Privilegios` canónico frente a `Rol` no canónico; normalización; lista permitida/no permitida; uso de `context.role` en renderer; política RBAC y rol falsificado.
- No se ejecutaron endpoints, deployments, Apps Script ni hojas productivas.

Validación Beta pendiente: inspección visual del Inbox con cuentas de prueba Desarrollador, Gefe, Supervisor y Técnico; confirmar que botones aprobar/rechazar aparecen solo para los tres roles autorizados y que el backend rechaza llamadas directas de roles no autorizados.

Archivos: ui.js, Services/Test/InboxRoleContract.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt y checkpoint.md.
Siguiente tarea: AUG-116 — Integrar la caché real de Inbox con identidad e invalidación. No iniciar dentro de esta tarea.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-116 — 2026-11-12
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- Se conectó el flujo habitual openInboxModal_ al loader loadAndRenderInbox; desapareció el caché global sin identidad.
- inboxPageCache.js mantiene páginas únicamente en memoria y limita por TTL (60 s) y cantidad (80 entradas). Cada clave incluye userId, rol normalizado, token de sesión, cursor y pageSize. No usa IndexedDB, localStorage ni sessionStorage.
- Las entradas vencidas no se reutilizan como frescas, pero pueden presentarse como fallback offline únicamente para la misma identidad completa; se intenta revalidación en red y se muestra advertencia si falla.
- Un cambio de usuario/rol/token, incluido logout, limpia el caché, reinicia cursores y eleva generaciones para invalidar respuestas tardías.
- Reply, resolve, delete, approve y reject invalidan todas las páginas de la sesión actual y reinician la lectura desde la primera página.
- El backend limita pageSize a 1–100 (40 predeterminado), valida cursor numérico y lee solo las filas necesarias de Feedbacks y Contactanos. La paginación conserva el orden histórico: Feedbacks primero, Contactanos después. Devuelve nextCursor, hasMore y total.
- La UI ofrece controles Anterior/Siguiente y mantiene cursores en memoria.

Validación local:
- InboxCachePagination: caché 5/5 y paginación backend 4/4.
- InboxRoleContract: 7/7 PASS.
- InboxStoredXss: 30/30 PASS tras actualizar la aserción de lectura histórica al helper mapInboxFeedbackRow_.
- Parsing completo de ui.js, api-config.js y Services/feedback.js: PASS.
- Contratos de integración UI/API: 6/6 PASS.
- No se ejecutaron Apps Script, endpoints, deployments ni hojas productivas.

Validación Beta pendiente: navegador real; más de 40 registros de prueba repartidos entre Feedbacks y Contactanos; navegación entre páginas; mutaciones reply/resolve/delete/approve/reject; verificar que la página se refresca después de cada mutación; fallback offline de la misma sesión; cambio de usuario/rol/token y logout sin reutilización de mensajes anteriores.

Archivos: inboxPageCache.js, ui.js, api-config.js, Services/feedback.js, Services/Test/InboxCachePagination.js, Services/Test/InboxStoredXss.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md.
Siguiente tarea: AUG-117 — Proteger la última cuenta Desarrollador y limpiar sesiones al eliminar usuarios. No iniciar dentro de esta tarea.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-117 — 2026-11-12
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- La política de último Desarrollador se aplica en AUTH operativo y en el espejo AUTH de pruebas, dentro del mismo ScriptLock que serializa updateUser/deleteUser. El Spreadsheet ID de Services/Test/Auth.js se conserva sin cambios.
- countActiveDevelopers_ considera solo filas que cumplen isActiveAuthUserRecord y tienen Privilegios normalizado a desarrollador.
- handleUpdateUser impide que una cuenta Desarrollador pierda ese rol si el conteo activo es uno. El guard se ejecuta antes de actualizar Nombre_Completo o escribir el marcador de revocación.
- handleDeleteUser rechaza desactivar la última cuenta Desarrollador. El auto-borrado ya estaba prohibido y se conserva.
- El actor se deriva de la sesión verificada y el objetivo se resuelve por ID único. La UI añade confirmación con el nombre del actor y de la cuenta objetivo antes de eliminar o degradar una cuenta Desarrollador.
- La eliminación lógica ya revocaba y borraba filas ActiveSessions bajo lock; ahora verifica después de la escritura que no quede ninguna fila para el userId. Si la limpieza falla o quedan filas, la cuenta permanece desactivada, se registra error y el flujo puede reintentarse por un Desarrollador.

Validación local:
- LastDeveloperProtection: 24/24 PASS: 12 escenarios contra Services/Auth.js y los mismos 12 contra Services/Test/Auth.js, con dobles de Spreadsheet/Lock/Properties.
- Casos: conteo de activos, rechazo de autodegradación última antes de escribir, degradación permitida cuando queda otro Desarrollador, borrado de usuario y sesiones múltiples, borrado de uno de dos Desarrolladores, auto-borrado rechazado, fallo parcial y reintento de limpieza.
- Parsing de Services/Auth.js y handlers UI afectados: PASS.
- No se ejecutaron Apps Script, endpoints, deployments ni hojas productivas.

Validación Beta pendiente: probar con cuentas sintéticas en Spreadsheet/AUTH aislados; verificar bloqueo de la última cuenta y transición permitida con dos Desarrolladores; comprobar la ausencia de filas ActiveSessions tras eliminación; repetir con varias sesiones, reintentos y operaciones concurrentes. No usar cuentas productivas.

Archivos: Services/Auth.js, Services/Test/Auth.js, users.html, Services/Test/LastDeveloperProtection.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md.
Siguiente tarea: AUG-118 — Refrescar perfil y rol cacheados desde sesión autenticada. No iniciar dentro de esta tarea.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-118 — 2026-11-12
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- AUTH operativo y AUTH de pruebas amplían validateSession. Solo después de verificar token único, coincidencia del userId, cuenta activa y ausencia de revocación de rol, devuelven el perfil mínimo de la fila Users enlazada a esa sesión.
- Campos devueltos: ID, Nombre_Usuario, Nombre_Completo, Privilegios, Telefono y Correo_Electronico. No se devuelve contraseña ni SessionToken.
- auth.js fusiona únicamente los campos permitidos tras verificar que el perfil corresponde al ID local y que la sesión/token siguen vigentes. Conserva el SessionToken local y actualiza localStorage y currentUser en memoria.
- Las respuestas tardías o asociadas a otra cuenta/token se descartan. El TTL de validación permanece en 10 segundos y ligado a la misma identidad de sesión.
- Los cambios de rol que generan revocación pendiente siguen rechazando validateSession; el cliente cierra sesión y exige reautenticación, evitando conservar privilegios anteriores.

Validación local:
- SessionProfileRefresh: 19/19 PASS (ambos servicios AUTH, perfil actual, campos no sensibles, identidad equivocada/duplicada, revocación, actualización persistida y en memoria, respuesta tardía/cambio de cuenta, allowlist de campos, comprobación de identidad del perfil y TTL).
- LastDeveloperProtection: 24/24 PASS (12 escenarios contra AUTH operativo y 12 contra AUTH aislado). InboxRoleContract: 7/7 PASS.
- Parsing de Services/Auth.js, Services/Test/Auth.js y auth.js como módulo: PASS.
- No se ejecutaron Apps Script, deployments, endpoints ni hojas productivas.

Validación Beta pendiente: verificar en proyecto AUTH y Spreadsheet aislados los cambios remotos de nombre, teléfono y correo; comprobar que el navegador actualiza localStorage y currentUser tras revalidación; probar cambio de rol con revocación y re-login; cambiar de cuenta mientras una validación está en vuelo y confirmar que la respuesta anterior no modifica la nueva sesión; revisar que la respuesta no expone contraseña ni token.

Archivos: Services/Auth.js, Services/Test/Auth.js, auth.js, Services/Test/SessionProfileRefresh.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md.
Siguiente tarea: AUG-119 — Registrar reply, resolve y delete del Inbox en historial inmutable. No iniciar dentro de esta tarea.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-119 — 2026-11-12
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
HEAD padre verificado antes de publicar: aaad6537418af8eed6465ae9feefc773d16ca36a.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- FEEDBACK crea y valida InboxAuditLog con ocho columnas: eventId, timestamp, actorId, actorName, action, itemType, itemId y details.
- reply, resolve y delete registran el evento y confirman su persistencia antes de modificar Feedbacks o Contactanos. La identidad se deriva de la sesión validada por authorizeFeedbackAction_/assertFeedbackSession.
- Los IDs inexistentes o duplicados no generan eventos. Si falla la escritura o verificación del ledger, la mutación se aborta.
- handleGetActivityLogs combina la actividad ordinaria con los eventos InboxAuditLog y consulta como máximo las 100 filas más recientes del ledger. La limpieza de actividad ordinaria no borra el ledger; los eventos sobreviven a la eliminación de la fila operativa.
- No se almacena el texto de la respuesta en el registro de auditoría.

Validación local:
- Services/Test/InboxAuditTrail.js: 11/11 PASS en harness aislado con dobles.
- Se cubrieron reply de Feedbacks/Contactanos, resolve, delete de ambas fuentes, orden de escritura, identidad, esquema, IDs ausentes/duplicados, fallo del ledger, lectura posterior y conservación ante limpieza ordinaria.
- Parsing sintáctico de Services/feedback.js y Services/Test/InboxAuditTrail.js: PASS.
- No se ejecutaron Apps Script, endpoints, deployments ni hojas productivas.

Validación Beta pendiente: creación y esquema real de InboxAuditLog; operaciones reply/resolve/delete en FEEDBACK/Spreadsheet aislados; lectura tras recarga; retención ante limpieza ordinaria; fallo parcial de escritura; permisos por rol. No desplegar a producción.

Archivos: Services/feedback.js, Services/Test/InboxAuditTrail.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md.
Siguiente tarea: AUG-120 — Optimizar la lectura del dashboard de actividad. No iniciar dentro de esta tarea.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-120 — 2026-11-12
Repositorio: infogpstech/GPSpedia. Rama: GPSpedia2.2.5_work. Base: GPSpedia2.2.5.
HEAD padre: e533702c6853f4089a79e5d79c7a638580b54563.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

- handleGetActivityLogs lee como máximo 100 filas finales por fuente mediante getRange; no utiliza getDataRange para ActividadUsuario ni InboxAuditLog.
- Combina ambas fuentes, ordena timestamp descendente con desempate estable y conserva {status,data}, máximo 100 elementos.
- ActivityLogsBoundedRead.js: 7/7 PASS, incluye 10,000 registros de actividad y 500 eventos Inbox.
- InboxAuditTrail.js: 11/11 PASS con handler actualizado.
- Parsing Services/feedback.js: PASS.
- No se ejecutaron Apps Script, Spreadsheet, endpoints, deployments ni datos productivos.

Beta pendiente: medir rendimiento en hojas aisladas de gran volumen y verificar dashboard real, orden, empates y recarga. No desplegar a producción.
Archivos: Services/feedback.js, Services/Test/ActivityLogsBoundedRead.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt, checkpoint.md.
Siguiente tarea: AUG-121 — Rechazar itemType no soportados al responder Inbox. No iniciar en esta tarea.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-121 — 2026-11-12
Repositorio: infogpstech/GPSpedia. Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
HEAD padre verificado antes de publicar: 39dd37df00d57addcfffd81f678f1529e4752d70.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- handleReplyToFeedback admite exclusivamente los itemType exactos problem_report y contact_form.
- video_approval y cualquier valor arbitrario/case-variant generan error explícito; no se consulta hoja, no se escribe InboxAuditLog ni se modifica respuesta.
- El flujo video_approval de aprobación/rechazo permanece separado y sin cambios.
Validación local:
- Services/Test/InboxAuditTrail.js: 15/15 PASS; incluye regresión de ledger, ambos tipos admitidos, video_approval, tipo arbitrario, variante con mayúsculas y ausencia de mutaciones.
- Parsing sintáctico de Services/feedback.js: PASS.
- Regresiones adicionales: ActivityLogsBoundedRead.js 7/7 PASS; InboxStoredXss.js 30/30 PASS.
- No se ejecutaron Apps Script, Spreadsheet, endpoints, deployments ni datos productivos.

Beta pendiente: FEEDBACK/Spreadsheet aislados para probar respuestas válidas y rechazos manipulados; comprobar que video_approval solo usa aprobar/rechazar y que los rechazos no generan escrituras. No desplegar a producción.
Archivos: Services/feedback.js, Services/Test/InboxAuditTrail.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md.
Siguiente tarea: continuar con la siguiente entrada pendiente del backlog después de AUG-121; no iniciar otra tarea dentro de esta sesión.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-122 — 2026-11-12
Repositorio: infogpstech/GPSpedia. Rama: GPSpedia2.2.5_work. Base: GPSpedia2.2.5.
HEAD padre verificado: dc2e13112b8da6a436ae0edefa9585ffc4b41e1b.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

- WRITE.addSupplementaryInfo comprueba sesión activa/única, vínculo token-userId, expiración, perfil Users único/activo y revocación de rol.
- Política explícita de roles: Desarrollador, Gefe/Jefe, Supervisor, Técnico y Técnico_exterior. La allowlist es exclusiva de esta operación; no cambia permisos de otros handlers.
- Actor tomado del nombre completo de Users en servidor y registrado en Logger; no se confía en identidad cliente.
- La autenticación se comprueba antes de adquirir ScriptLock y vuelve a validarse dentro del lock, antes de cualquier lectura/escritura operativa.
- Pruebas locales: AddSupplementaryInfoIntegrity.js ampliada con nueve casos nuevos; parsing de WRITE y suite PASS. No se ejecutaron Apps Script, Spreadsheet ni Drive reales.

Beta pendiente: probar roles y sesiones con hojas aisladas; comprobar respuestas válidas y rechazos sin cambios en Cortes/Drive. No desplegar a producción.
Archivos: Services/write.js, Services/Test/AddSupplementaryInfoIntegrity.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, checkpoint.md y lista_beta.txt.
Siguiente tarea: AUG-123 — Proteger y serializar la migración UTILITIES. No iniciar dentro de esta tarea.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-123 — 2026-11-13
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
HEAD padre verificado antes de publicar: 7950efe46cbc6411e747077d649e3c69761b0682.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

- Services/Utilities.js: captura snapshots de Cortes y Hoja 1 bajo ScriptLock antes de resolver fechas con Drive; valida el respaldo contra el snapshot antes de promover staging y aborta ante discrepancias.
- Services/Test/UtilitiesSecurity.js: 15/15 PASS; cubre autorización, concurrencia simulada, fallos de snapshot, staging, respaldo, promoción, rollback y recuperación.
- Parsing sintáctico de Services/Utilities.js y Services/Test/UtilitiesSecurity.js: 2/2 PASS.
- README de pruebas, backlog, ChangesLogs y lista_beta actualizados.
- No se ejecutaron Apps Script, Spreadsheet, Drive, endpoints ni datos productivos.

Validación Beta pendiente: comparar el código del deployment UTILITIES y probar concurrencia real, persistencia de snapshots, promoción/rollback e interrupción/reintento en una copia aislada. No desplegar a producción.
Siguiente tarea: AUG-124 — Unificar esquema e identidad de Tutoriales entre FEEDBACK y CATALOG. No iniciar en esta interacción.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-124 — 2026-11-13
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
HEAD padre verificado antes de publicar: e5a34f4e0308b637b383981b0da6a0af2d4962e4.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

- El contrato funcional ya existía por AUG-092: FEEDBACK y CATALOG usan la hoja Tutorial, conservan A:G y extienden H como Colaborador; la migración no reinterpreta datos históricos.
- Alta/edición: ID estable, validación de esquema, deduplicación de tema, ScriptLock, escritura verificada y actor derivado de sesión/perfil Users.
- TutorialIntegrity.js: 25/25 PASS, incluidos alta con hoja vacía y esquema A:H, migración compatible A:G, duplicados, reintento idempotente, edición por ID, identidad, y lectura real de handleGetCatalogData para A:H y A:G.
- VideoApprovalPublishing.js: 27/27 PASS. SharedMutationCoordinator.js: 32/32 PASS.
- Parsing sintáctico de feedback.js, catalog.js, Coordinator.js, SharedMutationClient.js y suites modificadas: PASS.
- No se ejecutaron Apps Script, Spreadsheet, Drive, endpoints ni datos productivos.

Validación Beta pendiente: comprobar en copias aisladas la persistencia, lectura tras recarga CATALOG, migración de A:G a H, identidad real de Users, permisos y referencias de aprobación de vídeo. No desplegar a producción.
Siguiente tarea: AUG-125 — Hacer recuperables las restauraciones de DB y Drive. No iniciar en esta interacción.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-125 — 2026-11-12
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
HEAD padre verificado antes de publicar: 2f1ec72e65c02016cbd8752f1397c8e7cb66df42.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- Los respaldos DB registran un manifiesto SHA-256 de todas las hojas, celdas con contenido y fórmulas. La copia solo se marca como válida después de comparar el Spreadsheet completo y validar identidad, MIME y ubicación; una copia parcial se envía a papelera.
- Los respaldos Drive inventarían rutas, carpetas, nombres, MIME y tamaños; la copia se registra solo después de comparar conteos, bytes y huella. Una copia parcial se retira.
- La restauración DB valida el esquema obligatorio (incluida compatibilidad histórica de Tutorial A:G y el esquema actual A:H) y el manifiesto del respaldo. Crea y verifica una copia recuperable del estado actual; copia todas las hojas a staging, verifica sus huellas y realiza un intercambio de hojas completas. Las hojas extra no presentes en el respaldo se conservan. Si la promoción falla, restaura los nombres originales; si la reversión no se puede verificar, conserva los artefactos __GP_RESTORE_* y comunica el ID del respaldo recuperable.
- La restauración Drive copia el respaldo a staging y lo compara antes de mover el contenido actual. El contenido original se conserva en una carpeta de rollback; la promoción se verifica y, ante fallos parciales, se intenta restaurar el contenido anterior. Si el rollback no puede verificarse, se preservan staging y recuperación y se informan sus IDs.
- Los backups históricos sin manifiesto se aceptan con advertencia después de validar el esquema/contenido disponible; los manifiestos presentes deben coincidir exactamente.

Validación local:
- Services/Test/AdminRestoreRecovery.js: 18/18 PASS.
- Se probaron dinámicamente intercambio DB exitoso, preservación de hojas adicionales, fallo de promoción, fallo de verificación y fallo de reversión.
- Parsing V8 de Services/admin.js y Services/Test/AdminRestoreRecovery.js: PASS.
- No se ejecutaron Apps Script, Spreadsheet, Drive, endpoints, deployments ni datos productivos.

Validación Beta pendiente: verificar copias reales en proyecto ADMIN y Spreadsheet/Drive aislados; creación de backups y comparación de manifiestos; restauración DB/Drive; interrupciones y fallos parciales controlados en cada fase; persistencia posterior y recuperación manual desde los IDs devueltos. No desplegar a producción.

Archivos: Services/admin.js, Services/Test/AdminRestoreRecovery.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md.
Siguiente tarea: AUG-126 — Validar payload completo antes de reservar fila/ID en WRITE. No iniciar dentro de esta tarea.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-126 — 2026-11-13
Repositorio: infogpstech/GPSpedia. Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- addOrUpdateCut valida el payload antes de cualquier mutación: estructura/allowlist, requeridos, enums de categoría/encendido/tipo de corte/Relay, rango de años, tipos, longitudes, VIN, opId/hash e imágenes Base64/MIME/tamaño.
- La validación ocurre antes de ensureTestigoColumns, reserva de fila/ID, registro de Idempotencia y operaciones Drive.
- Ante fallos, el coordinador conserva y restaura el snapshot de la fila existente o elimina la fila nueva, restaura/elimina el registro de Idempotencia y revierte el contador central de IDs si cambió. Los archivos Drive no enlazados permanecen registrados en ImageUploadLedger para reconciliación; no se eliminan a ciegas.

Validación local: CutPayloadValidation 35/35 PASS en runtime V8 aislado; parsing V8 de Services/write.js y Services/Test/CutPayloadValidation.js PASS. La suite incluye validaciones de payload, límite de imágenes, orden previo a mutación y presencia de rutas de compensación.
Validación Beta pendiente: ejecución en WRITE/Spreadsheet/Drive aislados, inyección de fallos físicos en cada fase, restauración de filas y ledger, contador de IDs y conciliación de ImageUploadLedger. No se ejecutaron Apps Script, endpoints ni recursos productivos.
Archivos: Services/write.js, Services/Test/CutPayloadValidation.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md.
Siguiente tarea: AUG-127 — Corregir el contrato de vídeo suplementario. No iniciar hasta la siguiente interacción.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-127 — 2026-11-12
Repositorio: infogpstech/GPSpedia. Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- Contrato de vídeo alineado: Cortes almacena videoGuiaDesarmeUrl; CATALOG publica Video normalizado; FEEDBACK transporta videoUrl canónica dentro de la solicitud. UI reconoce ambos nombres.
- addSupplementaryInfo en WRITE/ADMIN ahora rechaza cualquier campo/alias de vídeo directo y campos inesperados, incluso mezclados con apertura/cables/notas. El vídeo continúa exclusivamente por el flujo de aprobación YouTube.
- CATALOG valida HTTPS, host/ruta YouTube allowlisted, ausencia de credenciales/puertos y un único parámetro v con ID de 11 caracteres. FEEDBACK mantiene allowlist de destino, canonicalización y verificación de persistencia; la publicación aprobada verifica la lectura posterior de la columna de destino.
- add_cortes valida la respuesta WRITE y el vehicleId; consulta CATALOG con forceRefresh y verifica los campos suplementarios antes de confirmar. Si el backend confirmó pero la lectura CATALOG falla, avisa que no debe repetirse el envío.
- El modal de corte conserva dataset.vehicleId para que la aprobación de vídeo pueda refrescar el detalle abierto.

Validación local: SupplementaryVideoContract 55/55; AddSupplementaryInfoIntegrity 53/53; YouTubeAddCortesContract 4/4; VehicleExpansionDetailRefresh 30/30; YouTubeApproval 15/15; YouTubeApprovalInit 8/8; VideoApprovalPublishing 27/27. Parsing V8 de servicios y suites: PASS.
Validación Beta pendiente: OAuth/YouTube API reales, escritura/aprobación en FEEDBACK desplegado, Spreadsheet/CATALOG aislados, lectura tras recargar navegador y actualización del modal abierto. No se ejecutaron Apps Script desplegados, endpoints ni datos productivos.
Archivos: Services/write.js, Services/admin.js, Services/catalog.js, ui.js, add_cortes.html, Services/Test/SupplementaryVideoContract.js, Services/Test/YouTubeApproval.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md.
Siguiente tarea: AUG-128 — Validar referencias PyS–vehículos y serializar cambios. No iniciar hasta la siguiente interacción.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-128 — 2026-11-12
Repositorio: infogpstech/GPSpedia. Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
HEAD verificado al iniciar la tarea: a7e122ca626eac198e5cefd770bbd6d7ef834d7d.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- La revisión del backend confirmó que vehicleId se normaliza y debe corresponder a exactamente una fila de Cortes con encabezado ID válido; problemId debe ser válido y corresponder a una única fila PyS.
- Las listas JSON y formatos heredados se normalizan y deduplican; los elementos malformados se rechazan.
- handleAddVehicleToProblem y handleRemoveVehicleFromProblem comparten withPysMutationLock_; todas las lecturas y escrituras de cada mutación ocurren bajo ScriptLock, la escritura se verifica tras flush y el lock se libera en finally. El alta preasociada de handleAddProblem valida referencias bajo su ScriptLock.
- La baja conserva autorización exclusiva de Desarrollador.
- No se modificó código funcional porque la implementación y la cobertura ya existían. Services/Test/PysVehicleRelationIntegrity.js cuenta con evidencia local histórica de 18/18 PASS registrada en AUG-090; no se afirma una nueva ejecución en esta sesión.

Validación Beta pendiente: concurrencia real entre ejecuciones independientes, persistencia y recuperación ante timeout/fallo de flush en FEEDBACK/Spreadsheet aislados. Se añadió la secuencia de pruebas a lista_beta.txt. No se ejecutaron Apps Script desplegados, endpoints ni datos productivos.
Archivos actualizados: Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md. Código funcional sin cambios.
Siguiente tarea: AUG-129 — Restringir campos editables por ADMIN y proteger ID. No iniciar hasta la siguiente interacción.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — AUG-129 — 2026-11-12
Repositorio: infogpstech/GPSpedia. Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
HEAD previo a la implementación: e6800ee72ee2fd631f3bda6927d597aade6830ac.
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- ADMIN conserva una allowlist cerrada de campos editables. ID, timestamp, contadorBusqueda, vídeo y campos desconocidos no son editables por updateVehicleField.
- Se incorporó validación backend de tipo, longitud y dominio para categoría, encendido, tipo de corte y Relay; años enteros y coherencia anoDesde/anoHasta; sanitización de contenido enriquecido y validación de referencias de Drive.
- La edición ordinaria obtiene ScriptLock, resuelve una única fila por ID, valida antes de escribir, verifica persistencia y restaura el valor anterior si falla la escritura/verificación.
- La colección VIN usa la misma resolución de ID único y rechaza filas ambiguas.
- Se añadió Services/Test/AdminModalEditIntegrity.js. Resultado del harness V8 aislado: 9/9 PASS. Parsing de Services/admin.js y de los handlers modificados: PASS.
- No se ejecutaron Apps Script desplegados, Spreadsheet/Drive reales, endpoints ni datos productivos.

Validación Beta pendiente: roles y sesiones reales, Spreadsheet ADMIN aislada, IDs duplicados, dominios/valores inválidos, fallos físicos de escritura/flush, preservación de ID/campos calculados y regresión de carga de imágenes. Secuencia registrada en lista_beta.txt.
Archivos: Services/admin.js, Services/Test/AdminModalEditIntegrity.js, Services/Test/README.md, Tareas_pendientes_parte2.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md.
Siguiente tarea: AUG-130 — Hacer atómicas las mutaciones de USERS. No iniciar hasta la siguiente interacción.
================================================================================
