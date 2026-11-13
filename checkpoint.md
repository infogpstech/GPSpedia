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
