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
HEAD padre verificado: 7688414112a42ef751f45b6b7a6cb1e8ab3f197b.
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
