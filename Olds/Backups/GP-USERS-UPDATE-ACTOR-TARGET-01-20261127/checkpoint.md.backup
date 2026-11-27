# GPSpedia — checkpoint de continuidad
Fecha: 2026-11-26
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5 (no modificar)

## Rotación documental
El checkpoint previo completo se archivó, sin alteración, en `Olds/Documentacion_Legacy/Checkpoint_Archive/checkpoint_2026-11-26_parte_007.md`. Verificación Git: blob archivado `5be5e08597d2a354bcde6f5699cbf48387196804`, contenido recuperado igual al original. Las partes previas de archivo permanecen intactas.

## Estado de Git
- HEAD CI verificado: `2796cdee78ee95c151a9525a44133cdcf6d9a721`; commits documentales posteriores registran la evidencia y no alteran código.
- Base: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificar.
- Commit posterior de mantenimiento de prueba: `dd85ed5705f9d29fc3a3a94d4074124cbc08e35a`, alinear contrato LocalApiEndpoints con endpoints actualizados.

## Beta — progreso verificado
- Regression actual run `45809570650`, SHA `2796cdee78ee95c151a9525a44133cdcf6d9a721`: 542 suites, 6,453 pruebas, 0 fallos; jobs `service-tests` y `responsive-browser` SUCCESS.
- Job `responsive-browser`: AUG-146 real-browser checks, login surface smoke GET-only y manifest/offline navigation validaciones completadas; screenshots sintéticas cargadas. El job terminó SUCCESS.
- Pages build/deploy run `45809571054`, SHA `2796cdee78ee95c151a9525a44133cdcf6d9a721`: build y deploy SUCCESS.
- El usuario confirmó deployment actualizado de AUTH y ADMIN y URLs nuevas en `JS/Frontend/api-config.js`.
- Run health `45808869604`, SHA `fb96cc841a60cd2852e4578c300332cf4557d26b`: health 6/6 PASS. AUTH v2.2.5 1463 ms; ADMIN v2.7.2 2698 ms (SLOW); CATALOG v2.4.0 993 ms; FEEDBACK v1.2.2 1892 ms; UTILITIES v1.5.0 1323 ms; WRITE v2.3.1 1617 ms.
- CATALOG feed, cursor boundaries, matrix y pagination read-only PASS.
- ADMIN latency 5 muestras: 2410,1756,1861,1036,1953 ms; mediana 1861 ms, 1/5 SLOW.
- UTILITIES 5 muestras: 907,610,915,629,943 ms; mediana 907 ms, 0/5 SLOW.
- La corrección de fixture quedó validada por regresión posterior: run `45809570650` SUCCESS (542 suites / 6,453 pruebas / 0 fallos) y responsive-browser SUCCESS.
- Se corrigió `JS/Tests/LocalApiEndpoints.mjs` para que sus valores esperados coincidan con los endpoints actuales. Commit `dd85ed5705f9d29fc3a3a94d4074124cbc08e35a`; CI nueva pendiente.

## Tareas Beta pendientes
Las pruebas funcionales mutables de AUTH/login real, WRITE, FEEDBACK/Inbox, ADMIN/Drive, imágenes y YouTube siguen diferidas hasta disponer de identidad sintética, recursos aislados y limpieza verificable. Android físico pendiente. F022 es deuda visual offline no bloqueante. BETA-F021 (protección de rama) pendiente administrativa.

## Siguiente acción
- Regression CI de run 45809263608 aprobada en SHA cbe5e8a6adecb1359475d711810677650fbe4fba: 542 suites, 6453 pruebas, 0 fallos.
- Responsive-browser, login surface smoke GET-only, manifest PWA y offline navigation PASS.
- Continuar validaciones Beta no mutables y preparar pendientes diferidos; no ejecutar operaciones mutables sin preflight de recursos sintéticos y cleanup.


## Validación CI/browser 2026-11-26 — run 45810553448
- SHA de ejecución: `adb69eeb2edb5cd28b370194eac49956298115a` (commit documental previo); jobs `service-tests` y `responsive-browser` SUCCESS.
- 542 suites, 6,453 tests, 0 fallos. AUG-146, login GET-only, PWA manifest/offline y browser checks PASS; screenshots sintéticas artifact 15113495824 (16 imágenes).
- PWA: core 49/49 y optional 4/4 HTTP 200, warm offline login visible, cero módulos precache faltantes, pageErrors 0, no GETs Apps Script ni non-GET, credenciales no enviadas y backend writes deshabilitadas.
- Cold scenario mantiene fallo residual de Font Awesome CDN sin impacto funcional; deprecaciones de Actions/runtime registradas.
- Mutaciones remotas de servicios siguen sin ejecutar por falta de entorno sintético aislado/cleanup comprobado.


## Rectificación de estado Git — 2026-11-26
- HEAD de la rama de trabajo verificado por API GitHub: `bf03985d5e078e62a90d78058ff076d939545522` (último commit documental); base `GPSpedia2.2.5` se mantiene en SHA previamente verificado `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Los resultados CI/browser de run `45810553448` fueron ejecutados en el SHA `adb69eeb2edb5cd28b370194eac49956298115a`, antes de las dos actualizaciones documentales que registran resultados.
- Confirmado branch ref apuntando al HEAD documental, sin cambios de código en estas ediciones.


## Continuidad CI/browser — 2026-11-26 (último run verificado)
- HEAD previo a este registro: `85ffaace4e73b2b0b74f25591f834f85d44dc6a6`; base protegida `d9acc68d889985c2e2f42fe3a02e502efc86ead1` sin cambios.
- Run `45811468299`: `service-tests` + `responsive-browser` SUCCESS; 542 suites, 6,453 pruebas, 0 fallos. Pages `45811467538` SUCCESS en el mismo SHA.
- Browser: AUG-146 264/264 en cuatro viewports; Pages login/recuperación UI PASS; PWA cold/warm 49/49 CORE + 4/4 OPTIONAL, login visible, 0 módulos faltantes, 0 pageErrors, 0 Apps Script GET, 0 non-GET, sin credenciales ni escrituras.
- Focales verificadas: útiles FEEDBACK/CATALOG (idempotencia 10/10, append-only 4/4, preflight 8/8, activity 7/7, lock 3/3, retry 2/2, aislamiento CATALOG 2/2, estado botón 10/10, cola 4/4, proyección 9/9); ADMIN/Drive (snapshot 14/14, cursor 23/23, asociación 16/16, metadata 11/11, item reference 3/3, FindOrCreate 7/7, inventario 35/35, IndexedDB 13/13, visual 6/6, retry 7/7, consola 1/1, locations 6/6); tutorial vídeo modal 18/18.
- Capturas sintéticas artifact `15112547683`. Único residual offline frío: CSS Font Awesome CDN; no pageErrors.
- Siguiente Beta: (1) útiles FEEDBACK/CATALOG con dos identidades sintéticas y cleanup verificable; (2) reproducción real tutorial watch y short/shorts en desktop/móvil. Ninguna mutación FEEDBACK/Spreadsheet se ejecutó: faltan identidad/dataset sintético y cleanup verificable en el flujo. Playback remoto no se declara por el test contractual local.
- Incidencia #130: cierre local con validación Beta diferida; no se han ejecutado mutaciones ni despliegues Apps Script.


## Revalidación Beta tras deployments — 2026-11-26
- HEAD previo a esta actualización: `18bfd3c04fdd0016c531a24c9a070705725fbc49`; workflow health `45812643014` SUCCESS: contrato 21/21; seis servicios disponibles y versiones esperadas. ADMIN 2288 ms (SLOW); AUTH 1923, CATALOG 1197, WRITE 1365, FEEDBACK 1380 y UTILITIES 1045 ms.
- CATALOG feed/boundaries/matrix/pagination PASS, GET-only. Sin POST ni cambios de datos remotos.
- Regresión `45812642942`: 542 suites, 6,453 pruebas, 0 fallos; responsive-browser SUCCESS, AUG-146 264/264. Pages `45812641695` SUCCESS.
- PWA cold/warm PASS: 49 core + 4 opcionales, login offline visible, 0 módulos faltantes, 0 pageErrors; Font Awesome CDN falla solo en cold offline. Sin llamadas Apps Script, non-GET, credenciales ni escrituras.
- Siguiente: útiles FEEDBACK/CATALOG con dos identidades sintéticas y cleanup verificable; luego playback real YouTube watch/short/shorts en escritorio/móvil. Mutaciones siguen NO EJECUTADAS.
- Rama base verificada sin cambios: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


## 14. Continuidad Beta — validación posterior a actualización de deployments (2026-11-26)
- HEAD de trabajo al iniciar: `0861215251ab5cba5bfae5eb97361c8ee1b24615`; rama base verificada: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificación.
- Run regression/browser `45813003467` sobre el HEAD actual: ambos jobs SUCCESS. Regresión: 542 suites, 6,453 pruebas aprobadas, 0 fallos; contrato health local 21/21. AUG-146 264/264 en cuatro viewports.
- Pages deployment `45813002541`: SUCCESS. Smoke Pages login/recuperación: HTTP 200 en 1366×768, 390×844, 360×800 y 320×700; 0 errores JS, 0 solicitudes no-GET, 0 GET a Apps Script, sin envío de credenciales ni escrituras.
- PWA cold/warm: Service Worker controlando; 49/49 recursos core y 4/4 opcionales HTTP 200; 0 módulos precache faltantes; login visible offline frío y caliente; 0 pageErrors. Residual visual offline frío: CSS Font Awesome CDN (no bloquea login).
- Health remoto GET-only run `45812643014` (commit fuente `18bfd3c04fdd0016c531a24c9a070705725fbc49`): 6/6 servicios disponibles y versiones esperadas; AUTH 2.2.5, CATALOG 2.4.0, FEEDBACK 1.2.2, UTILITIES 1.5.0, WRITE 2.3.1, ADMIN 2.7.2. ADMIN probe individual 2288 ms (SLOW); cinco muestras 2756/1959/1469/1634/1593 ms, mediana 1634, 1/5 >=2 s. UTILITIES cinco muestras 1199/1333/932/1063/597 ms, mediana 1063, 0/5 lentas.
- CATALOG feed GET-only: revisión 5, cursor inicial 0 y final 5, 5 eventos recuperados (3 reset), paginación de 5 páginas sin cambio concurrente. Límites de cursor negativo/malformado y límites 0/51 rechazados; cursor futuro requiere reset. Sin POST ni mutaciones.
- Próximas validaciones funcionales conservadas: útiles FEEDBACK/CATALOG con dos identidades sintéticas, dataset aislado y cleanup verificable; después reproducción real de tutoriales watch/short/shorts en escritorio y móvil. No se ejecutaron por requerir identidades/recursos de prueba y control de limpieza; no simular resultados.
- No se modificaron Apps Script, deployments, Spreadsheet, Drive, OAuth, permisos ni datos remotos. BETA-F022 permanece como residual visual no bloqueante; Android físico y pruebas mutables siguen pendientes.


## 15. Continuidad Beta — frontera de útiles y parser de tutoriales (2026-11-26)
- HEAD de trabajo antes del registro: `401d1923b5bbffe3dbf3399d35203ae0ac28344c`; rama base `GPSpedia2.2.5` confirmada en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, intacta.
- Se agregó `JS/Tests/FeedbackLikeAuthorizationBoundary.mjs` al runner MIG019. Valida el límite real `doPost → getCachedSharedSessionActor_ → withSharedSessionActor_ → authorizeFeedbackAction_`: eliminación de claims internos del navegador, identidad/nombre/rol del actor confiable, separación de dos sesiones sintéticas, rechazo de userId falsificado, rechazo de escalamiento a Desarrollador y fail-closed sin actor. Resultado final 7/7 PASS.
- Se agregó `JS/Tests/TutorialYouTubeUrlFormats.mjs` al runner INTEGRATION. Valida watch, youtu.be, shorts, embed, live, móvil, youtube-nocookie, ID puro, URL no segura, dominio falso, ruta inválida y normalización a embed canónico. Resultado final 8/8 PASS. Es validación local de parser, no reproducción real.
- CI final `45815829936` SUCCESS sobre HEAD `401d1923b5bbffe3dbf3399d35203ae0ac28344c`: 544 suites, 6,468 pruebas aprobadas, 0 fallos; `ServiceHealthContract` 21/21.
- Browser CI del mismo SHA: AUG-146 264/264 en 4 viewports; Pages login/recuperación HTTP 200 en 1366×768, 390×844, 360×800 y 320×700; 0 pageErrors, 0 solicitudes no-GET, 0 GET a Apps Script; sin credenciales ni escrituras. PWA 49/49 CORE + 4/4 OPTIONAL, offline frío/caliente, 0 módulos faltantes. Único residual: CSS Font Awesome CDN falla en cold offline.
- Pages build/deployment `45815828996` SUCCESS.
- Health remoto de seis servicios y CATALOG GET-only sigue siendo el último resultado confirmado en `45812643014`; no se modificaron endpoints ni código de servicios desde esa prueba.
- Siguen PENDIENTES de Beta real: útiles FEEDBACK/CATALOG con dos cuentas sintéticas, dataset aislado y cleanup verificable; playback real de tutoriales watch/short/shorts en escritorio/móvil. No se encontraron credenciales, dataset aislado ni URLs de tutorial de prueba en los registros/fixtures consultados; no se sustituyó playback por video arbitrario.
- Después: Inbox, WRITE y ADMIN/Drive con identidades y recursos desechables. No se ejecutaron login real, POST, OAuth, escrituras Spreadsheet/Drive, YouTube API ni cambios de deployments.


## 16. Continuidad Beta — Inbox, playback YouTube y revalidación integral (2026-11-26)
- HEAD de trabajo antes del registro: `45af8c652c25264ec425a58946f20e37965bfeab`; rama base `GPSpedia2.2.5` verificada en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, intacta.
- CI final `45821020795` SUCCESS sobre HEAD `45af8c652c25264ec425a58946f20e37965bfeab`: 545 suites, 6,475 pruebas aprobadas, 0 fallos. Pages `45821019359` SUCCESS.
- Browser: AUG-146 264/264 en 4 viewports; login y recuperación HTTP 200 en 1366×768, 390×844, 360×800 y 320×700; 0 pageErrors, 0 solicitudes no-GET, 0 GET a Apps Script, sin credenciales ni escrituras. PWA: 49/49 CORE + 4/4 OPTIONAL, 0 módulos faltantes, login visible offline frío/caliente. Residual visual no bloqueante: CSS Font Awesome CDN falla solo en cold offline.
- FEEDBACK: `FeedbackLikeAuthorizationBoundary.mjs` 7/7 PASS; elimina claims del navegador, inyecta actor confiable, separa sesiones sintéticas y rechaza userId/rol falsificados y ausencia de actor.
- INBOX: nuevo `InboxTrustedActorBoundary.mjs` 7/7 PASS; verifica identidad de dos sesiones a través de dispatcher FEEDBACK y `inboxConversationActor_`, rechazo de escalamiento, rol no activo, userId discordante y fail-closed. Suites existentes InboxConversations 70/70 e InboxUi 89/89 PASS.
- YouTube: `TutorialYouTubeUrlFormats.mjs` 8/8 PASS para watch, youtu.be, shorts, embed, live, móvil, youtube-nocookie, IDs, rechazos y canonicalización. `TutorialVideoModalLayout` 18/18 PASS.
- Playback Beta: se agregó job `tutorial-playback-beta` a `.github/workflows/deployed-service-health.yml`. Consulta CATALOG con POST `getCatalogData` de solo lectura (`forceRefresh:true`); el handler se inspecciona antes de llamar y se cancela si detecta operaciones de escritura. Snapshot: 10 tutoriales, 7 URLs YouTube válidas, 3 IDs únicos inspeccionados; formatos fuente `other` y `short`. El reproductor embebido en el origen real de Pages y la página directa de YouTube responden `Sign in to confirm`; sin fallos de red a youtube/googlevideo. Estado del player -1, videoReadyState 0. No se usaron credenciales ni se intentó eludir el challenge. Job de playback `139908980457` FAILURE por bloqueo anti-bot de YouTube; job GET-only de health del mismo workflow SUCCESS. Playback real queda pendiente de navegador autenticado autorizado o dispositivo físico.
- Health remoto run `45819572315`, job health SUCCESS: 6/6 servicios disponibles, versiones AUTH 2.2.5, CATALOG 2.4.0, FEEDBACK 1.2.2, UTILITIES 1.5.0, WRITE 2.3.1, ADMIN 2.7.2. ADMIN probe inicial SLOW 2746 ms; 5 muestras mediana 1887 ms, 1/5 >=2 s, 0 fallidas. UTILITIES mediana 826 ms, 0/5 lentas.
- CATALOG GET-only: revisión 5, cursor 0→5, 5 páginas/5 eventos/3 reset, sin cambio concurrente; cursor negativo/malformado y límites 0/51 rechazados; cursor futuro solicita reset. Matriz de retención y paginación PASS.
- WRITE/ADMIN suites locales: WritePhysicalTransactionContract 7/7, WriteContributionAppendConcurrency 9/9, WriteContributionRecovery 9/9, AdminDriveScanIntegrity 18/18, AdminDriveAuditCursorRecovery 23/23, AdminDriveAuditAssociation 16/16, AdminDriveAuditMetadataPersistence 11/11, AdminAuditTrail 27/27, AdminLocalOperationGuard 12/12.
- No se modificó código de servicios Apps Script, deployments, PropertiesService, Spreadsheet, Drive, OAuth ni datos remotos. La única operación POST remota fue lectura de catálogo CATALOG, sin escrituras.
- Pendiente siguiente: ejecutar útiles FEEDBACK/CATALOG e Inbox con dos cuentas sintéticas, dataset aislado y cleanup verificable; luego WRITE y ADMIN/Drive con recursos desechables. Requiere identidad de prueba y dataset/recursos autorizados, no disponibles en los registros actuales. Playback YouTube requiere sesión de navegador autorizada o prueba física.


## 17. Continuidad Beta — fronteras de actor WRITE/ADMIN y cierre de iteración (2026-11-26)
- HEAD de trabajo antes de este registro: `2a0ff4d9dc046700d3d63a8c5f34752e92234234`; rama base `GPSpedia2.2.5` verificada en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones.
- CI `45821888314` SUCCESS: 546 suites, 6,485 pruebas aprobadas, 0 fallos. Nuevos contratos: `InboxTrustedActorBoundary` 7/7 y `WriteAdminTrustedActorBoundary` 10/10. Pages `45821887626` SUCCESS.
- WRITE/ADMIN: pruebas sintéticas en memoria verifican que el actor se obtiene del contexto de sesión compartido, que `userName`/`userRole` y claims `__sharedSessionActor`/`__feedbackActor` enviados por navegador no prevalecen, que userId discordante y sesión ausente fallan cerrados, que Técnico no escala a Desarrollador, que Supervisor solo conserva capacidades de edición modal permitidas y que cada router usa su servicio local (WRITE/ADMIN) sin URLs de otros Apps Script ni coordinación de servicios. No se ejecutaron mutaciones remotas.
- Inbox: `InboxTrustedActorBoundary` 7/7; `InboxConversations` 70/70; `InboxUi` 89/89. FEEDBACK actor boundary 7/7. WRITE/ADMIN suite funcional y contratos anteriores siguen aprobados.
- Browser y Pages: AUG-146 264/264; login/recuperación 200 en 4 viewports; 0 pageErrors, 0 solicitudes no-GET y 0 GET a Apps Script. PWA 49/49 CORE + 4/4 OPTIONAL, 0 módulos faltantes y login visible offline frío/caliente. Residual Font Awesome CDN solo en cold offline.
- No se modificaron servicios Apps Script ni deployments, PropertiesService, Spreadsheet, Drive, OAuth o datos remotos. Solo cambios en tests, workflow de validación y documentación.
- Estado Beta: health GET-only 6/6 servicios; CATALOG feed y límites PASS. Playback YouTube sigue bloqueado por challenge `Sign in to confirm` del entorno GitHub Actions. Mutaciones reales FEEDBACK/CATALOG/Inbox/WRITE/ADMIN permanecen pendientes de identidades sintéticas y recursos aislados con cleanup verificable.
- Próxima actividad al habilitar recursos: FEEDBACK/CATALOG e Inbox con dos identidades sintéticas, validar aislamiento, idempotencia y cleanup; luego WRITE/ADMIN con registros y archivos desechables. Playback se valida en navegador autorizado o Android físico, sin eludir la protección de YouTube.


## 18. Cierre de fase Beta y limpieza solicitada — 2026-11-26
- El propietario ordenó cerrar la fase de pruebas Beta, consolidar hallazgos y eliminar todos los archivos de pruebas, incluidas suites de regresión y anti-regresión.
- HEAD verificado antes de esta operación: `7904a45f4f19907a3436948de49f0e767311b519` en `GPSpedia2.2.5_work`. Rama base de referencia: `GPSpedia2.2.5`; no se escribirá en ella.
- Evidencia histórica final consultada: CI `45821888314` SUCCESS (546 suites, 6,485 pruebas, 0 fallos); AUG-146 264/264; PWA 49/49 CORE + 4/4 OPTIONAL; health GET-only 6/6 en run `45819572315`; CATALOG feed read-only 5 páginas/5 eventos/3 reset. No hubo mutaciones remotas de Spreadsheet/Drive/FEEDBACK/WRITE/Inbox/OAuth/YouTube API.
- La reproducción real YouTube no quedó acreditada: Actions recibió `Sign in to confirm`. El residual visual offline Font Awesome CDN no bloquea el login. La protección de la rama base no quedó confirmada por la API (`protected=false`, sin rulesets visibles).
- Se consolida el resultado en `Tareas_Beta.md` y las acciones pendientes en `Tareas_Activas.md`. Nueva prioridad P0: GP-UTIL-BUTTON-NO-REACTION-01 por reporte del propietario: botón sin reacción visual, sin evento FEEDBACK y sin actualización del contador del modal.
- Se eliminan las suites y harnesses de `JS/Tests`, los cuatro segmentos/índices históricos `lista_beta*.txt` y los workflows que los ejecutaban. No crear nuevos archivos de prueba. Los resultados CI anteriores quedan como evidencia histórica en los backlogs; no son reproducibles tras la purga.
- Limpieza Markdown solicitada: conservar solo los backlogs vigentes (`Tareas_Activas.md`, `Tareas_Beta.md`, `TAREAS_MIGRACION_ARQUITECTURA.md`) y este `checkpoint.md`; eliminar los demás .md, incluidos checkpoints archivados. Esta purga documental fue solicitada expresamente por el propietario.
- Siguiente paso de desarrollo: investigar y corregir GP-UTIL-BUTTON-NO-REACTION-01 siguiendo el plan de `Tareas_Activas.md`; no reanudar pruebas Beta.


## 19. Corrección local del botón de útil — 2026-11-26
- Continuidad verificada en `GPSpedia2.2.5_work`, HEAD previo `ce03f41878b88e1bce5b28b3b3dc575e9445d04c`; base `GPSpedia2.2.5` `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, intacta.
- Se recuperó la normativa histórica completa desde el commit previo a la purga `7904a45f4f19907a3436948de49f0e767311b519`; `NORMAS_DESAROLLO.md` y `contexto_personal.md` siguen eliminados en la rama actual por la limpieza solicitada y no se restauraron. README se consultó en la rama base.
- Diagnóstico: la carga de `getMyUsefulCuts` dejaba los botones deshabilitados si fallaba sin caché local; el handler tenía retornos silenciosos por contexto/estado no listo. El regex del título de acordeón estaba doblemente escapado, y un fallo de envío no revertía el estado optimista ni limpiaba el pendiente.
- Cambios: `JS/Frontend/ui.js` ahora comparte/espera la hidratación antes de alternar, comunica errores, conserva el control disponible durante la carga y revierte al estado confirmado ante fallo; `JS/Frontend/usefulSyncQueue.js` expone `cancel` para retirar el pendiente fallido. Se corrigió el regex de contador del acordeón. Revisión posterior: `aria-busy` solo permanece activo durante una petición real y el título ofrece reintento cuando la hidratación falló.
- Contrato backend no modificado: `setCutUseful` sigue en FEEDBACK; el backend deriva el actor desde sesión, persiste en `FeedbackLikes` y devuelve `usefulCount`. No se añadieron endpoints, secretos ni llamadas entre servicios.
- Validación local: parse sintáctico de los cuerpos de módulo UI y cola PASS; comprobaciones efímeras sin archivos: corte físico remapeado, contador optimista/confirmado/retirada PASS y cancelación de cola PASS. Cero archivos de prueba creados.
- No se invocaron servicios remotos ni se desplegaron proyectos Apps Script; no se ejecutó navegador real. La fase Beta sigue cerrada. Estado: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- Siguiente paso: conservar la corrección en frontend; la confirmación en deployment real queda fuera de la fase Beta cerrada y requiere una instrucción futura para reabrirla.


## 20. Requisito de errores silenciosos para útiles — 2026-11-26
- El propietario aclara que todos los errores de la reacción útil se registran únicamente en la consola del navegador; no deben aparecer mensajes, alertas, toasts, banners ni textos de error para el usuario.
- Se retiraron las llamadas a `showGlobalError` del flujo de útil, incluyendo errores de sesión, hidratación y escritura. Se eliminó el texto visible de error/reintento del botón; queda una etiqueta neutral y el botón puede volver a intentarse.
- Los errores continúan en `console.error`/`console.warn`; el fallo de escritura revierte silenciosamente el estado y contador al último valor confirmado.
- Sintaxis validada. No se realizaron llamadas remotas ni despliegues Apps Script.


## 21. Diagnóstico y corrección adicional de reacción útil — 2026-11-26
- Rama de trabajo: `GPSpedia2.2.5_work`. Corrección frontend publicada en commit `6628fda16ad534aa2a2ccfae3807ed2c892ea717`; registro actualizado en `Tareas_Activas.md`. La rama base `GPSpedia2.2.5` no se modificó.
- Causa concreta: `ensureUsefulState_()` devolvía `false` cuando `getMyUsefulCuts` fallaba sin caché local. El manejador del clic salía con `if (!ready) return`, por lo que no aplicaba el estado optimista ni enviaba `setCutUseful`. Una lectura fallida impedía incluso intentar la escritura.
- Corrección: ante fallo de hidratación sin caché, el frontend conserva el último estado confirmado conocido (o vacío), marca la sesión como lista para permitir la acción idempotente y continúa. FEEDBACK determina el estado real; el callback de éxito confirma color/contador y el callback de fallo revierte silenciosamente. Los errores siguen limitados a consola.
- Revisión de ruta backend: `ACTION_TO_SERVICE_MAP` asigna `setCutUseful` a FEEDBACK; `FEEDBACK_ACTION_PERMISSIONS` declara la acción; `doPost` valida y adjunta el actor compartido; `doPostInternal_` la enruta a `handleSetCutUseful`. El handler valida identidad, ID de vehículo y corte, usa lock, crea/actualiza el registro en `FeedbackLikes` y devuelve `isUseful`/ `usefulCount`. La lectura `getMyUsefulCuts` recupera el último estado por usuario, vehículo y corte.
- `likeState.js` aplica el contador autoritativo recibido de FEEDBACK y conserva el mapeo entre corte físico y corte visible. La corrección nueva no cambia el contrato de FEEDBACK ni introduce llamadas entre servicios.
- No se ejecutó una sesión real de navegador ni el Apps Script desplegado; no se leyó ni escribió la Spreadsheet real. La confirmación de persistencia remota sigue pendiente. Se observó que el agregado retornado por FEEDBACK se aplica al estado local; su persistencia al recargar depende del dato proyectado por CATALOG y no se declara confirmada.
- No se crearon archivos de prueba, suites, fixtures ni workflows. La fase Beta permanece cerrada. No se modificó código Apps Script ni deployment.


## 22. Sincronización del contador de útiles con CATALOG — 2026-11-26
- Nueva revisión del flujo confirmó que CATALOG ya calcula el agregado de útiles leyendo `FeedbackLikes` mediante `readFeedbackLikeEventCounts_` y lo aplica en `mapCatalogVehicleRowForProjection_`. La proyección `getCatalogData` admite `forceRefresh:true` para evitar datos de caché.
- Hallazgo: el flujo `setCutUseful` actualizaba el contador visible con `usefulCount` de FEEDBACK, pero no coordinaba una lectura nueva de CATALOG. Por ello, el catálogo local podía conservar una proyección anterior a la última reacción.
- Corrección publicada en `aec0f21f0a49febd5e96303ca55b84fca2dbcae8`: tras la confirmación de escritura, el frontend llama `routeAction("getCatalogData",{forceRefresh:true})`, reemplaza la proyección del vehículo afectado y sincroniza los títulos/controles. El error de esta actualización secundaria se registra únicamente en consola; el contador confirmado por FEEDBACK se conserva.
- La coordinación FEEDBACK→CATALOG se realiza exclusivamente en el frontend. No se modificó el servicio FEEDBACK, el servicio CATALOG, sus deployments, endpoints ni la Spreadsheet.
- Parsing con `node --check` aprobado para los fragmentos modificados de hidratación y sincronización de proyección, extraídos de `ui.js` y ejecutados como archivos temporales fuera del repositorio. No se crearon suites ni archivos de prueba en el repositorio.
- La fuente FEEDBACK declara `COMPONENT VERSION: 2.3.0`, pero su endpoint `doGet?debug=true` sigue devolviendo `version: 1.2.2`. Ese valor de health está desactualizado en el código y no sirve para inferir qué versión exacta está desplegada.
- La escritura remota, lectura real de Spreadsheet, interacción en navegador y despliegue del frontend siguen sin verificarse. La tarea permanece EN PROGRESO hasta confirmar el flujo desplegado; la fase Beta continúa cerrada.


## Continuidad GP-UTIL-BUTTON-NO-REACTION-01 — revisión del estado publicado (2026-11-26)

- HEAD al iniciar esta revisión: `d0dae570935401e8147a178e73dbcb71a1b4776c`; tras actualizar el registro de tareas, commit documental `8fc9f462cf4b440366da342d00bf5cdc27cf3ff6`. Rama base `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificar.
- Las correcciones de código permanecen en `6628fda16ad534aa2a2ccfae3807ed2c892ea717` y `aec0f21f0a49febd5e96303ca55b84fca2dbcae8`. Compare confirma que los cuatro commits posteriores a `aec0f21` hasta el HEAD anterior eran únicamente cambios documentales; no hubo modificación adicional de frontend/backend.
- Revisión estática ampliada: DOM y handler directo del botón, sesión AUTH (`ID/id`, `SessionToken`), mapa de acciones y endpoint local FEEDBACK, cola de sincronización, autorización trusted actor, append/idempotencia de `FeedbackLikes`, `catalogChange`, publicación frontend del delta y proyección CATALOG con `forceRefresh:true`. No se encontró otro defecto reproducible en el código inspeccionado.
- Pages workflow `45833214660`: SUCCESS sobre `d0dae570935401e8147a178e73dbcb71a1b4776c`, que ya contenía las correcciones frontend de `aec0f21`. Se confirma build/deploy de Pages por Actions, no una interacción HTTP/browser real.
- No existe directorio de pruebas ni workflow de regresión en el árbol actual. La última CI de regresión disponible (`45822167347`) precede a los commits de corrección `6628fda` y `aec0f21`; no se atribuye a ellos. No se crearon nuevas pruebas ni se reabrió Beta.
- **Estado local: COMPLETADA CON VALIDACIÓN DIFERIDA.** La sintaxis y las comprobaciones aisladas previas constan aprobadas en las secciones 21–22 y en `Tareas_Activas.md`. La revisión actual confirma coherencia estática de la ruta completa. Pendiente para una futura Beta autorizada: clic real en navegador, escritura FEEDBACK, read-back de `FeedbackLikes`, actualización persistida del contador CATALOG y recarga del detalle. No se ejecutaron servicios remotos ni se modificaron deployments/Spreadsheet.
- Documentación de continuidad recuperada: `NORMAS_DESAROLLO.md` y `contexto_personal.md` ya no existen en la rama de trabajo por la purga documental registrada; se leyeron íntegros desde el commit histórico `7904a45f4f19907a3436948de49f0e767311b519`. `README.md` no existe en la rama de trabajo y se leyó desde la rama base protegida, solo en lectura. `Tareas_Beta.md` es el resumen vigente; la lista histórica de pruebas Beta fue eliminada según el registro de cambios.
- Siguiente acción: no modificar más el flujo sin evidencia nueva. Mantener la fase Beta cerrada; cuando el propietario autorice la validación de campo y existan identidad/dataset aislados con limpieza verificable, comprobar el botón y registrar evidencia real.



## Adenda de sincronización documental Beta — 2026-11-26

- Se añadió una adenda a `Tareas_Beta.md` para que el resumen de cierre refleje la corrección local de GP-UTIL-BUTTON-NO-REACTION-01 y mantenga explícita la validación remota diferida.
- Commit documental: `22f4b8108aff9a2ca4aad97ffdea6cf83a006855`. No se modificó código ni se reabrió Beta.



## 23. GP-UTIL-BUTTON-STATE-REVERT-02 — corrección de reconciliación tardía (2026-11-26)

- El propietario confirmó que el botón cambia de color y el contador aumenta al pulsar, pero ambos regresan al valor anterior unos segundos después.
- Causa identificada en frontend: `ensureUsefulState_` inicia una lectura `getMyUsefulCuts` asíncrona aunque haya copia local. Si la respuesta de esa lectura, iniciada antes de la escritura, termina después de FEEDBACK, podía reemplazar el estado confirmado con el estado remoto anterior. `applyConfirmedUsefulState` además calculaba un ajuste del contador a partir de `likedCortes` (posiblemente sobrescrito), aunque la respuesta ya contenía el contador autoritativo `usefulCount`.
- Se añadió versionado por clave usuario/vehículo/corte. La hidratación conserva las mutaciones confirmadas después del inicio de su solicitud; las escrituras confirmadas incrementan la revisión y se mantienen por encima de lecturas antiguas.
- `applyConfirmedUsefulState` ahora sincroniza el estado visual exactamente con `isUseful` y el contador exactamente con `usefulCount`; no vuelve a sumar/restar un delta sobre un valor ya confirmado.
- Las respuestas de CATALOG que se iniciaron antes de una interacción más reciente se descartan. Si CATALOG devuelve una proyección anterior, el contador confirmado por FEEDBACK prevalece al fusionar el vehículo.
- Cambios frontend: `ui.js` y `likeState.js`. No se modificó FEEDBACK, CATALOG, sus deployments, endpoints ni Spreadsheet. No hay llamadas servicio-a-servicio.
- Commits: `29414137134370d25b57286e047ea082854c7413`, `2d0b44a3631ca02cdc886fa1ce81768b795fbed8`, `e663bffad986cc584efc4c913325d977a7a43b91`, `9348557df146daa1f4df7216acef68b5728f7606`, `000f1115202af8c5f7bd704da914d71598c4b8a3`; registro de tareas `0cd3b94139c655e7a519f7eff730e4d208aa425b`.
- Actions Pages build/deploy del SHA `9348557` estaba pendiente al documentar; el último SHA `000f111` tiene una ejecución Pages pendiente independiente. Se debe verificar que el deployment más reciente termine SUCCESS antes de afirmar que la corrección está publicada en el sitio.
- Pruebas remotas y persistencia real: NO EJECUTADAS. No se escribió Spreadsheet ni se desplegaron Apps Script. Validación pendiente: navegador desplegado, estado FEEDBACK tras recarga, contador CATALOG tras recarga y repetición de doble clic/cambios rápidos.
- La fase Beta permanece cerrada. Próximo paso: confirmar Pages SUCCESS del HEAD documental/código; después prueba funcional real con usuario y vehículo/corte autorizados, verificando antes/después en FEEDBACK y CATALOG.



- Registro de tareas sincronizado: `Tareas_Activas.md` incluye la incidencia `GP-UTIL-BUTTON-STATE-REVERT-02` y su causa/corrección. Commit documental: `db4afdf06967b7f69fe5242305711cf101cb5b02`. Se mantiene la validación de navegador/FEEDBACK/CATALOG como pendiente; no se abrió Beta.



- Validación local posterior: compilación sintáctica de `ui.js` (imports/exports retirados solo para el parser) y `likeState.js`: PASS. Prueba aislada de `applyConfirmedUsefulState`: 4/4 casos PASS (marcar, retirar y conservar contador autoritativo sin delta duplicado).
- Pages build/deploy `45843872204`: SUCCESS sobre `7e9ff0ba209e9096aed2c90a3d5b9b90407770f9`, que contiene el código de la corrección `000f111`. Los commits posteriores `db4afdf`, `37082ea` y `be8f894` son documentales. La publicación de Pages está confirmada; la interacción real y persistencia remota aún no.
- `Tareas_Activas.md` actualizado para reflejar Pages SUCCESS; commit `be8f894fa5d459863e832e7aac1912b4923ceede`.



## 24. Reapertura de útil — sospecha de entrega de código obsoleto (2026-11-26)
- Se añadió cambio de estrategia Service Worker: caché v78, network-first para documentos/scripts/estilos/fuentes del mismo origen, fallback offline a caché. Commit de código: d715e1693b8d340cd829608fabc628c79c223dbf.
- La hipótesis es que cache-first estaba entregando código frontend obsoleto mientras actualizaba caché en segundo plano. Este cambio no demuestra todavía la causa del comportamiento del botón.
- Validación Pages/browser/FEEDBACK/CATALOG real pendiente; estado del incidente abierto. No declarar resolución.


## 25. Útiles FEEDBACK — policy fuente vs endpoint (2026-11-26)
- Consola real aportada por usuario: el endpoint FEEDBACK rechaza `getMyUsefulCuts` y `setCutUseful` como acciones no declaradas.
- Inspección de fuente en branch: ambas acciones están declaradas en `FEEDBACK_ACTION_PERMISSIONS`, tienen handlers y dispatcher, y están mapeadas desde frontend al servicio FEEDBACK.
- Conclusión: probable deployment FEEDBACK obsoleto o discrepante del source configurado; es necesario confirmar el deployment activo y publicar/actualizar FEEDBACK. No hay evidencia de error en la policy del source actual.
- No se desplegó Apps Script ni se mutó la Spreadsheet. Limitación: no dispongo aquí de autorización/tool de deployment Apps Script. Incidencia abierta.
## 26. GP-UTIL-FEEDBACK-STATE-AND-COUNTER-03 — estado y contador por corte (2026-11-26)

- El propietario confirma que FEEDBACK ya acepta las acciones de útiles y guarda registros en Spreadsheet; la antigua incidencia de rechazo de policy ya no es el síntoma actual. No se verificó la versión ni el deployment exacto.
- Nuevo diagnóstico: el ledger antiguo era append-only y no sincronizaba las columnas físicas Cortes.utilCorte1/2/3. Se sustituye por una fila por actorKey + vehicleId + corteId, con corteId e isUseful; activar/desactivar actualiza la misma fila.
- FEEDBACK cuenta los usuarios activos para el vehículo/corte y escribe/verifica el contador físico. Si la escritura no puede confirmarse, intenta revertir el cambio en ledger y celda. El lock breve protege la unicidad de la fila y la consistencia del contador compartido.
- En el primer acceso tras desplegar el nuevo FEEDBACK, ensureFeedbackLikesSheet_() migra el ledger antiguo de siete columnas, consolida el último estado por usuario/corte, crea una copia FeedbackLikes_Legacy_<timestamp> y actualiza los contadores físicos sumando los útiles activos al valor base. Si detecta estado pending o un esquema no reconocido, no migra ni sobrescribe datos y requiere reconciliación.
- CATALOG lee ambos contratos para permitir una transición segura y evita sumar dos veces los estados del nuevo ledger sobre el contador físico.
- **Orden de publicación requerido:** 1) publicar CATALOG actualizado (acepta tanto el formato antiguo como el nuevo); 2) publicar FEEDBACK actualizado (ejecuta la migración al primer acceso); 3) validar con dos cuentas distintas, los tres cortes, FeedbackLikes, columnas físicas de Cortes, dashboard y recarga. No publicar FEEDBACK antes de CATALOG, pues el CATALOG antiguo no reconoce el nuevo esquema.
- Validación local: sintaxis FEEDBACK/CATALOG/ADMIN PASS; UI parser PASS con imports/exports retirados; simulación de dos cuentas/toggle idempotente/retiro/reactivación PASS (dos filas, contador 2); simulación de migración PASS con backup y sumatoria sobre base previa.
- Validación remota/Spreadsheet: NO EJECUTADA. No se ha desplegado Apps Script ni se ha leído/modificado la Spreadsheet real. Fase Beta cerrada; las comprobaciones de integración quedan diferidas al deployment autorizado.
- Commits de código: 4463324416ee1d3c35b5c26c45ceb3f4785034f3, 223cf468a3a0abe2284a2b20ea93a9a7c9043686, 35641402b8f31b4659050a45688b6ae5937f6671, 9099f4fb4f88c4630d5a5825e6567e52da1c30d0, a0dbfa587d0efa1241d1787a640926f4d9b4b38c; correcciones adicionales FEEDBACK a30ad5d952f272f75cf62d17e1ac22a77bfd14e1, da331a14683c828791be3046fdce4bb2a481fbcd, e265b09c8658625c22fbc5e9e6c99ccf0cb4f3, 24c29376d74c2c0cf32a77d1d8fc6ee7dbb7490c.

## 27. GP-ADMIN-DRIVE-LIBRARY-AUDIT-02 — biblioteca y bloques UTF-8 (2026-11-26)

- openReplacedImagesModal(options = {}) establece showModal de forma definida y abre por defecto; se conserva el caller sin argumentos.
- Snapshot ADMIN cambia a schema 3 y corta el JSON según bytes UTF-8, evitando bloques mayores a 75,000 bytes por caracteres multibyte. No separa pares sustitutos.
- Load y refresh mantienen compatibilidad con schema 2 y manifests legados sin versión; la renovación conserva su encoding/formato para no inutilizar snapshots antiguos.
- Validaciones aisladas: snapshot Unicode de 189,078 bytes guardado/recuperado en tres bloques (74,999/74,999/39,080 bytes); round-trip exacto; refresh/load PASS para schema 3, schema 2 y legado. Parsing ADMIN/UI PASS.
- No se ejecutó Drive, servicio ADMIN desplegado ni navegador. Pendiente Beta: abrir Biblioteca, iniciar auditoría, conservar resultados, continuar con cursor y comprobar resultados completos.
- Commits ADMIN/UI: 9099f4fb4f88c4630d5a5825e6567e52da1c30d0, a0dbfa587d0efa1241d1787a640926f4d9b4b38c, 35641402b8f31b4659050a45688b6ae5937f6671.

## Estado Git después de las correcciones fuente (antes de actualizar este checkpoint)

- HEAD de trabajo: a0dbfa587d0efa1241d1787a640926f4d9b4b38c; luego se actualizaron los registros Tareas_Activas.md (3a76328ccb5f876dfae0311d3b05f7eff857e6e3), Auditoria.txt (6cd4b01a1c9332f50aeb4f800f4c47d9bda4a29d) y ChangesLogs.txt (4fc259853a05d47a0666f0cc5797a13e8ab2f116).
- HEAD verificado antes de este checkpoint: 4fc259853a05d47a0666f0cc5797a13e8ab2f116.
- Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin modificar.
- No se crearon pruebas persistentes, suites, fixtures ni workflows. Las simulaciones se ejecutaron en memoria con fuentes leídas de la rama.

## Continuidad 2026-11-26 — GP-CORS-APPS-SCRIPT-TRANSPORT-01

- HEAD previo verificado por GitHub: `be01820a935a36f8f256fc7fb2e8366dfe541a16` en `GPSpedia2.2.5_work`. La rama base `GPSpedia2.2.5` estaba en `d9acc68d889985c2e2f42fe3a02e502efc86ead1` y no se modificó.
- Causa: las llamadas GET health y POST de `api-config.js` usaban fetch directo contra Apps Script, cuyos `ContentService` no entregaban CORS al navegador.
- Código actualizado en `JS/Frontend/api-config.js` y los seis entrypoints `JS/Services/{Auth,catalog,write,feedback,admin,Utilities}.js`. GET health usa JSONP restringido a `debug=true`; POST usa formulario URL-encoded, iframe oculto y `postMessage`. Cada servicio reconstruye `postData.contents` y delega en su handler anterior.
- No se cambiaron las seis URLs, `ACTION_TO_SERVICE_MAP`, lógica de negocio, autenticación, RBAC ni coordinación frontend/backend. La respuesta JSONP no permite consultar el feed CATALOG.
- Validación local: sintaxis del módulo frontend y seis fuentes Apps Script PASS; pruebas efímeras simuladas de JSONP, POST iframe, preservación del JSON, respuesta, limpieza y health ADMIN PASS. No se escribieron archivos de pruebas.
- **Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.** No se publicó Apps Script ni frontend, no se hizo llamada real a servicios, navegador, Drive o Spreadsheet. La fase Beta permanece cerrada.
- Siguiente paso autorizado: publicar las seis fuentes Apps Script en sus deployments correspondientes y el frontend; después verificar health 6/6, ping y refreshDriveStorage ADMIN desde el navegador. No desplegar sin autorización expresa del propietario.


## Continuidad 2026-11-26 — GP-ADMIN-DRIVE-UNUSED-IMAGES-02: corrección de lote incremental
- Revisión de fuente confirmó un defecto de contrato de caché: `storeDriveAuditPageResults_` y `storeDriveAuditSeenPage_` comparten la clave. La primera escribe temporalmente un array; la segunda conserva los IDs sin uso y reemplaza el valor por un objeto `{unused, files, folders, metadata}`.
- `validateDriveAuditInventoryBatch_` no seguía ese contrato y pasaba el objeto completo al normalizador de arrays. Se reprodujo el fallo con una página combinada representativa: «La lista de imágenes de auditoría no es válida». El fallo bloqueaba el guardado incremental y los reintentos individuales.
- Corrección en `JS/Services/admin.js`: leer `pageData.unused` cuando la página tiene el formato combinado completo; validar que existan arrays `unused/files/folders/metadata`; mantener compatibilidad con arrays legados. No se cambió el esquema ni la clave de caché.
- Validación aislada post-fix: objeto combinado aceptado; ID ajeno al conjunto unused rechazado; objeto sin campos estructurales rechazado; array legado aceptado.
- Commit de código: `e61e82f4258e96f81c1b2e23693d27f2b96fb536`.
- Registros actualizados: `Tareas_Activas.md` commit `25f66cdb8246370cf47b245a3195e56801f75b4b`; `Auditoria.txt` commit `dd22fb64310797c154ca9a19a942e3423971b954`; `ChangesLogs.txt` commit `e2353869158fe7fd8819b0f4a007812128a18f68`.
- HEAD de trabajo después de los registros: `e2353869158fe7fd8819b0f4a007812128a18f68`. Rama base protegida `GPSpedia2.2.5` sin modificar.
- No se ejecutaron servicios Apps Script desplegados, navegador, Drive ni Spreadsheet reales; no se movieron archivos ni se mutaron datos externos. No se hizo deployment.
- **Estado:** corrección puntual implementada y probada de forma aislada; GP-ADMIN-DRIVE-UNUSED-IMAGES-02 sigue abierta. Siguiente paso: revisar los contratos de biblioteca y organización y completar pruebas de integración del flujo completo; la validación Beta remota requiere deployment autorizado.


## Continuidad 2026-11-26 — registro incremental inicial por lotes
- Rama de trabajo: `GPSpedia2.2.5_work`. La rama base protegida `GPSpedia2.2.5` no se modifica.
- Se verificó que el HEAD anterior era `34eb2f8840d2db4e4ab2b22bce2b0f14a2cf6e04`.
- Hallazgo: el guardado inicial del inventario enviaba todos los archivos en una sola solicitud no incremental, aunque ADMIN ya soportaba validación y escritura incremental; solo el botón de reintento individual usaba esa modalidad.
- Implementación en `JS/Frontend/ui.js`: lotes de máximo 20; confirmación individual por ID; actualización progresiva de tarjetas; persistencia local tras cada lote; continuación de los lotes posteriores aunque uno falle; consolidación final solo si todos los archivos fueron confirmados; verificación de resultados y conteos finales; IDs inválidos se reportan y no se omiten silenciosamente.
- Pruebas aisladas con harness: 21 imágenes => dos solicitudes incrementales (20 + 1), luego una consolidación no incremental; 21 tarjetas confirmadas. Caso parcial => 20 confirmadas, una con error y ninguna consolidación. El bloque editado pasa compilación sintáctica.
- Commits: implementación inicial `7bb822207e7217b019cc638589f221aabdb0f118`; validación de IDs `dad3fe7c2c886ef9fb65dbf56f58abbaccdd1954`; registros en backlog `151885d0667b101b4546012675ea1eafcf1a9b41`, auditoría `4dc125f1cc7b1b26ff6544b8d3eb1018d7de47c1`, changelog `9d4f34039d3ee9fdc2e50ce6aff1e9b325b5acc8`.
- La tarea `GP-ADMIN-DRIVE-UNUSED-IMAGES-02` continúa abierta. Siguiente trabajo: revisar el flujo de reintento individual tras fallos parciales/consolidación; terminar la auditoría de recuperar, mover, papelera, restaurar y eliminación definitiva; revisar asociaciones y comportamiento visual del espacio consola/explorador. Continuar después con `GP-ADMIN-TAB-ACTIONS-UX-01` si queda trabajo real.
- No se ejecutó el Apps Script desplegado, no se consultó ni modificó Drive/Spreadsheet y no se hizo deployment. Las pruebas reales de servicios y Beta se reservan para esa fase; no bloquean la implementación local.


## Continuidad 2026-11-26 — consolidación tras reintento individual
- Se reforzó la verificación de la respuesta final ADMIN en `retrySingleInventory`: identidad/duplicidad de resultados, tratamiento explícito de filas históricas adicionales `no_confirmada`, confirmación de cada archivo solicitado, rechazo de `partial` y comparación de los conteos del servidor.
- Pruebas aisladas: respuesta correcta => estado `saved`; conteo de servidor inconsistente => permanece `partial` y no habilita organización.
- Commit de código: `52a3d7143f9810e68f9be5e9c495270c0c35068a`; registros: tareas `f2c10badcaca2997136f3e322452616a60961b9a`, auditoría `0f19a32f4341fb55ca11ac411ada1c904af9a264`, changelog `972a8ff256fff8d6209253e2da59794eba9838c7`.
- Próximo paso: continuar la auditoría de los contratos frontend/backend para recuperar, mover, enviar a papelera, restaurar y eliminar definitivamente; después verificar la asociación y la experiencia visual/responsive. No declarar cerrada la tarea principal.
- No se ejecutaron operaciones remotas ni deployment; la verificación Beta sigue diferida.


## Continuidad 2026-11-26 — biblioteca: restauración masiva y acciones Developer
- Se corrigió la confirmación de restauración masiva mixta: ahora distingue archivos en papelera (restauración solo en Drive, sin reasociación automática) e imágenes históricas (restauración a campo). Las rutas por elemento ya eran distintas y se conservaron. Harness aislado verificó texto y endpoints.
- Commits de UI: `616d6bb5f5662d0a6e79a5ce5f122758301b109b`, `271276a077f2ad81adf00a66b4a8ffa28dd05d99`.
- `GP-ADMIN-TAB-ACTIONS-UX-01`: revisión estática de las cuatro pestañas confirma iconos, etiquetas compactas/expandibles y CSS responsive; se cierra implementación local. La revisión visual real queda para Beta.
- Registros: tareas `1a50d39fc2e4a7d1371b9ca4312f05479ce82c14`, auditoría `ebbf4a4d6931363db3103ae9211525d52076bff0`, changelog `58b3d43b7c535a5caf9389fc9f8f9990717b3e68`.
- Continuar con auditoría de las acciones de biblioteca y su integridad. No declarar completa `GP-ADMIN-DRIVE-UNUSED-IMAGES-02` hasta cerrar las revisiones pendientes y las pruebas locales pertinentes. Validación remota/Beta diferida.


## Continuidad 2026-11-26 — restauración masiva mixta
- La toolbar de biblioteca ahora permite restaurar selecciones mixtas solo cuando cada elemento puede restaurarse desde papelera o recuperar su campo histórico. La confirmación muestra ambos grupos y el handler utiliza el endpoint correcto por registro.
- Harness aislado: mezcla de un registro en papelera y uno histórico => restaurar visible; mover/papelera ocultos. PASS.
- Commit UI: `78d91c41e45f6fe673395849e947a5572ff1f8b4`; registros: tareas `4d566d4bae0a22116828dd3dfbdcd95eacd50075`, auditoría `35500b936d8ded0c7023e23670845c51e43ec7b6`, changelog `38649f03cacdeb838eae09729a8d605ce61bc51b`.
- Siguiente: completar auditoría de los estados de recuperación, papelera y eliminación definitiva; revisar persistencia y concurrencia del inventario y luego la UI del explorador. La tarea principal sigue abierta.


## Continuidad 2026-11-26 — guarda compartida del inventario
- Hallazgo: la guarda local del endpoint `saveUnusedImagesInventory` usaba auditId como alcance. Distintas auditorías podían escribir en paralelo en `Imagenes_Reemplazadas` y competir por la misma fila de inserción.
- Corrección en router ADMIN: alcance global `drive-inventory:shared-inventory-sheet` para registro, consolidación y organización. Se corrigió el comentario que atribuía la protección a ScriptLock.
- Harness aislado: misma clave bloquea segundo callback; scope distinto permitido; el endpoint usa la clave global. PASS.
- Commit: `f64cb5346c5fb28886db0e19485f893ceb755961`; registros: tareas `6fd92defedf5ed3d0a9348fd5d79a4ec6020edd5`, auditoría `f0880bdc8c258926bc6e28bdc4f906cc2e22b97c`, changelog `9dd215da7fd6140a522b4778a75c11a5e6167e00`.
- Límite: falta probar concurrencia entre el endpoint de inventario y los demás endpoints de mutación de biblioteca. La tarea principal permanece abierta.


## Continuidad 2026-11-26 — alcance de scanner, asociación y salvaguardas biblioteca
- Scanner allowlist verificado por harness: `Cortes`, `Tutorial`, `Relay`, `pys`; columnas opcionales físicas: Tutorial col. 3 `Imagen`, Relay col. 10 `imagen`, pys col. 7 `Imagen`; Cortes valida ocho columnas de imagen. También considera imágenes sobre cuadrícula en esas hojas.
- Asociación con fixtures: coincidencia única por modelo+versión+encendido+año; conflicto contextual y varios vehículos sin contexto quedan ambiguos; referencias activas se omiten. PASS.
- Revisión estática de cinco operaciones backend de biblioteca y siete casos de capacidades frontend: PASS para controles de estado, MIME, árbol Cortes, referencias, unicidad y compensaciones. Sin Drive/Sheets reales ni navegador.
- Commits de registros: tareas `0ca65cf70eef57a7480ba9f911fa17e2468bb7f2`, auditoría `c2883ec12ada91449a8b822893dc525aa9bc50c2`, changelog `7988e04edf42aa483c1c315c80a7c7dc2a236ea5`.
- Pendiente: verificar si los nombres físicos de hojas coinciden con los nombres funcionales descritos en el plan mediante validación Beta; pruebas integradas de operaciones y concurrencia entre endpoints distintos; inspección visual de consola/explorador. No cerrar la tarea principal.


## Nota de alcance — detección vs. operaciones destructivas
- Se confirmó que `collectCatalogImageReferences()` clasifica imágenes sin uso solo contra las hojas de catálogo allowlist.
- `collectActiveDriveReferences()` mantiene alcance amplio para proteger acciones destructivas: recorre referencias de otras hojas (incluyendo Feedback/eventos/reacciones y demás datos) e imágenes sobre cuadrícula, salvo hojas internas/logs/usuarios/sesión/idempotencia e historial de imágenes. Las referencias operativas no cambian la clasificación de auditoría, pero sí bloquean mover/papelera/eliminar. Preservar esta distinción.
- Registro de auditoría actualizado en commit `99924646d24e3438de89fe9322dd20b29b8b8b96`.


## Continuidad 2026-11-26 — asociación de vehículo durante el escaneo
- Hallazgo: las sugerencias de vehículo solo se calculaban al guardar inventario, no durante los lotes de auditoría.
- ADMIN ahora adjunta asociación a cada imagen `Sin uso detectado` en el resultado del lote, leyendo las primeras ocho columnas de Cortes y reutilizando el algoritmo/alias, snapshot de referencias activas e histórico. Estados: suggested, ambiguous, sin_coincidencia, no_verificada. Error de lectura no se presenta como falta de coincidencia.
- UI muestra la sugerencia y criterios desde la primera tarjeta; diferencia no verificada/sin coincidencia y reporta conteos de asociación en consola.
- Harness con algoritmo real + mock de hoja: Toyota Hilux 2.8/Botón/2021 => VH-02 high; sin coincidencia y fallo de lectura diferenciados; resumen consola y texto de tarjeta PASS.
- Commits: backend `75170cd6db7b4bcc00ab98689f04837b9efa5945`, mapa `091a939902132e11383cb9f9b16ec1c93d197c3a`, UI `bdd9273caee75cea60b65b081a6a0e0302ed9b9b`, consola `eec4cd899179b7dc2ba24d97817e42a9a78e9635`; registros: tareas `0cfe2f2737bc1c44792715b1bad01242fb58c2ed`, auditoría `b0312a1c21bb31190bdc946543fec1b65ba07f28`, changelog `d25d31344066136a56c50c0e13c7fe4f78962f93`.
- La tarea sigue abierta: verificar el rendimiento con volúmenes reales, integración de hoja y revisión visual. No deployment ni Beta.


## Continuidad 2026-11-26 — confianza y criterios visibles de asociación
- Las tarjetas ahora presentan confianza alta/media/baja y criterios legibles derivados de señales de asociación (modelo en carpeta/nombre, alias, marca, categoría, versión, encendido, años), además de vehículo y contexto. Aplica tanto al primer render como tras persistencia.
- Harness de render: Toyota Hilux muestra confianza alta, criterios y vehículo VH-02; sintaxis UI PASS.
- Commit UI: `8d63c5943f18fa2e6b36003ef8b829846d9a3bf2`; registros: tareas `e55636df2614aeabf5a843e7d19934cffeb5d68d`, auditoría `cc1b2030de78092b12332423a68806a3005f3841`, changelog `b4557f866b55af044b2cff02ad1c20e9aee7063f`.


## Continuidad 2026-11-26 — guarda compartida para mutaciones de biblioteca
- Se creó `withSharedReplacedImagesInventoryGuard_` con alcance `drive-inventory:shared-inventory-sheet` y se aplicó a todas las rutas de mutación de biblioteca/organización/conciliación, migración de esquema y resolución de candidatos. La sincronización de candidatos invocada en GET biblioteca también se protege.
- Rutas verificadas: 12 mutaciones + candidate sync. `admin.js` compila; el harness del helper verifica exclusión para la misma clave.
- Commit: `d778cc086e603307a1567bf3a933983e258cae89`; registros: tareas `58c2eb1fe6e46a3b9dd5c470baa4757b9e05423c`, auditoría `ecbe145db1901d60d58880ec3d39bc7f87beb8f1`, changelog `33805dde939ca807d82e925a6939f3697500ef01`.
- Pendiente: concurrencia real entre solicitudes en Apps Script (no ejecutada); el guard local está verificado con harness. Seguir con UI/explorador y auditoría integral.


## Continuidad — GP-FORM-DROPDOWNS-01 (2026-11-26)
- Problema investigado: opciones de los selectores de alta de corte no cargaban.
- Diagnóstico de código: el handler de work dependía de la validación de la columna Categoría y de la hoja Relay. Comparado con la rama base, que extraía valores de Cortes, se debilitó la dependencia de fuente para categorías y el handler completo podía fallar si Relay faltaba.
- Corrección: `JS/Services/catalog.js` extrae categoría desde valores de la columna de Cortes, marcas, tipos de corte de las tres columnas y tipo de encendido. Relay se consulta si tiene contenido; si no, usa configuraciones Relay desde Cortes. `HTML/add_cortes.html` elimina cache de sesión, valida status y estructura y muestra un error conciso/diagnóstico ante fallos.
- Auditoría estática: formularios activos revisados: `HTML/add_cortes.html`, `HTML/users.html`, `index.html`; los dos últimos no usan `getDropdownData` para este formulario y no se detectó fallo adicional relacionado.
- Commits en `GPSpedia2.2.5_work`: `71c7ba9f2c0022eee91772f1e450b5b3d0c8f250` backend, `c16f4f24ff01d6513e5814d723dadee3cdf1f413` frontend.
- Verificación: estática, sin deployment runtime de Apps Script ni acceso real a Spreadsheet en esta sesión. Pendiente de prueba Beta: valores reales, despliegue y carga de todos los formularios.
- Siguiente paso: validar en deployment CATALOG activo y probar selectores de Categoría, tipo de encendido, tipos de corte y configuración de relay; si falla, revisar configuración endpoint/hoja y logs diagnósticos del navegador.


## Continuidad 2026-11-26 — GP-FORM-DROPDOWNS-02: corrección integral y bloqueo de deployment

- HEAD verificado antes de este checkpoint: `5e4bfec7bb4b753e45be8d4ac3f8816048c5de59` en `GPSpedia2.2.5_work`. Rama base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificar.
- La auditoría profunda amplió el alcance que GP-FORM-DROPDOWNS-01 había omitido. Consumidores confirmados: formulario independiente `HTML/add_cortes.html`; precarga/editor in-modal; modal de sugerencia de cambio; modal `+` para agregar un corte, todos en `JS/Frontend/ui.js`. Tutoriales y Problemas/Soluciones no usan estos cuatro catálogos de corte en la acción `getDropdownData`.
- CATALOG fuente actualizado a versión `2.4.1`: los catálogos categoría/encendido/tipo de corte/configuración relay se extraen todos de `Cortes` (cols. 2, 8, 12/19/26 y 15/22/29). No se usa la hoja Relay como origen de configuración en esta acción. La respuesta declara `source: "Cortes"` y `serviceVersion: "2.4.1"`.
- Frontend: precarga con validación estricta de estado, fuente, versión y los cuatro arrays; cache TTL cinco minutos únicamente tras respuesta válida. El editor, el modal de sugerencias y el modal + ahora comparten el mismo contrato. Se retiró el fallback manual del modal de sugerencias. Valores históricos ausentes del catálogo se muestran deshabilitados, no como opciones oficiales. Alta independiente valida catálogo completo y representa valores con `textContent`.
- Commits de código: CATALOG `3525c772c8bd51db235aba89b72a85a3ce17c0db`; frontend principal `d45580124aa1834851665f235e14f4ea5a000f57`; standalone `e500d6f670dc57d58607f73c56f4dd6a679af530`; manejo de error in-modal `631d7e66eec4802220c2debd048016a35c1247b7`; solo opciones oficiales editables `4bc6e6d4a1b9bb3d55fd4e1cfb3eeeb7cf460abf`.
- Pruebas aisladas PASS: handler con mock solicita únicamente `Cortes`, combina las nueve columnas esperadas y normaliza duplicados/espacios; normalizadores de ambos formularios; respuesta obsoleta 2.4.0 y lista obligatoria vacía rechazadas; caché temporal; valor legado solo visible/deshabilitado; caso `No recomendado`; render DOM con `textContent`. Code Review de diffs contra respaldos PASS; los cambios no modifican persistencia/recuperación de operaciones, adjuntos, payloads de sugerencia ni otros campos.
- Límite operativo importante: la revisión del checkpoint `GP-CORS-APPS-SCRIPT-TRANSPORT-01` indica que los seis entrypoints Apps Script no se publicaron tras introducir POST con iframe/`postMessage`. El health GET histórico CATALOG 2.4.0 no prueba el POST actual. No se dispone de herramienta de deployment Apps Script ni de ejecución directa de Spreadsheet en esta sesión; no se publicaron Apps Script, no se consultó la hoja real ni se validó la página en navegador. El frontend rechaza explícitamente un servicio 2.4.0/contrato antiguo, por lo que el deployment activo debe actualizarse a CATALOG 2.4.1 y luego ejecutarse una llamada POST de solo lectura `getDropdownData` para terminar la validación.
- Registros actualizados: `Tareas_Activas.md`, `Auditoria.txt`, `ChangesLogs.txt`. Los tres respaldos exactos fueron comparados con los diffs de commits y retirados tras Code Review (commits de limpieza `9e573ad542ebdb4c1ec47f20d9257d1184ad2632`, `3f5d95123f7e1dc06921a9fa4cf7d4ebc7523a36`, `3f3f967d785d7406fcac92a51fe9101d6a1ef55b`).
- Estado: corrección fuente y pruebas aisladas completadas; incidencia del sitio publicado abierta hasta deployment y confirmación POST/Beta.


## Cierre de Code Review — GP-FORM-DROPDOWNS-02
- Revisión de sintaxis completa: `JS/Services/catalog.js`, `JS/Frontend/ui.js` y el módulo de `HTML/add_cortes.html` compilan en harness V8. PASS.
- Revisión de comportamiento con mocks: handler CATALOG, normalizadores, TTL, estado No recomendado, preservación de valores históricos deshabilitados y render DOM seguro. PASS.
- Comparación de los commits de implementación contra los respaldos pre-edición: cambios limitados a las zonas autorizadas. Respaldos retirados después de la revisión.
- No se ejecutaron llamadas a Apps Script ni Spreadsheet reales; no se desplegó servicio. La incidencia de entorno publicado permanece abierta hasta CATALOG 2.4.1 desplegado y prueba POST read-only satisfactoria.


## Aclaración y regresión protegida — diagramas de configuración Relay (2026-11-26)
- Se comprobó expresamente que la hoja `Relay` mantiene su función independiente como fuente de detalles e imágenes/diagramas. `handleGetCatalogData()` sigue leyendo la hoja, mapeando la columna 10 `imagen` y retornando `allData.relay`.
- En el frontend no se alteraron `renderCutContent()` ni `renderRelayInfoModal()`: el botón sigue resolviendo `datosRelay` por `configuracion`, el modal muestra `relayInfo.imagen` y el clic en la imagen abre `window.abrirLightbox()`.
- Nueve verificaciones estáticas de esta cadena: PASS. El cambio a Cortes como fuente de selectores no elimina ni sustituye Relay en la visualización del diagrama.


## Continuidad 2026-11-26 — GP-FORM-DROPDOWNS-03

- Rama de trabajo: GPSpedia2.2.5_work. HEAD antes de esta actualización documental: 387182736fb787c2a771ac11cb01d0273df5fc90. Rama base protegida GPSpedia2.2.5 verificada en d9acc68d889985c2e2f42fe3a02e502efc86ead1; no modificada.
- Causa encontrada para el fallo exclusivo del formulario standalone: HTML/add_cortes.html declaraba dos veces los mismos tres bindings importados desde JS/Frontend/offline.js. El error de módulo impedía ejecutar cualquier inicialización y, por tanto, nunca se alcanzaba la lectura getDropdownData. El formulario + de ui.js tiene un flujo independiente y no depende de ese módulo.
- Revisión de ubicación: HTML/add_cortes.html está en HTML/. index.html enlaza HTML/add_cortes.html; service-worker.js precarga ./HTML/add_cortes.html; enlaces, manifest, hojas de estilo e imports usan ../ para resolver desde la subcarpeta. No se encontró una ruta relativa rota en las dependencias examinadas.
- Corrección: se retiró una única línea de import duplicado. Se agregó JS/Frontend/diagnosticLogger.js a CORE_ASSETS y se incrementó CACHE_NAME a gpsepedia-cache-v79.
- Code Review estático PASS: el diff de HTML coincide exactamente con el respaldo menos la segunda línea de import repetida; el diff del Service Worker contiene únicamente la versión de caché y la dependencia añadida. No quedan nombres importados duplicados; todos los módulos importados existen.
- No regresión PASS: la navegación al formulario, el listener DOMContentLoaded, init(), populateAllDropdowns(), routeAction('getDropdownData'), normalización/render/error, el flujo del modal + y el ruteo CATALOG permanecen presentes. No se modificaron los flujos de persistencia, recuperación, adjuntos ni Relay.
- Commits de código: 61fa107909fa0f7b511550771c79bafe6e56cae3 y 98decb8834feb272d93cf8f5370c7e278806cae3. El respaldo previo se retiró después del Code Review (commit 387182736fb787c2a771ac11cb01d0273df5fc90).
- Estado: corrección implementada en la rama de trabajo y revisión estática completada. No se ejecutó navegador real, deployment ni POST real a Apps Script; quedan pendientes la comprobación del sitio tras publicar, la respuesta real de CATALOG y la prueba offline con caché v79 instalada.

## Continuidad 2026-11-26 — GP-ADD-CORTES-UX-01

- Rama de trabajo: `GPSpedia2.2.5_work`. HEAD al cierre de la implementación antes de los registros: `076035a6cfd46ed26af6e133508b04ad22899f4d`. Rama base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; permanece sin modificaciones.
- Causa de imágenes: `checkVehicle` usa WRITE y `handleCheckVehicle()` devuelve las celdas de imagen sin normalización. El helper local de add_cortes extraía solo `id=` y no convertía `/file/d/ID/view`, que es un enlace de página y no una fuente de imagen. El helper ahora normaliza IDs y variantes Drive, y conserva URLs externas/blob/data, con fallback SVG local. Se aplica a imagen vehículo y fotos de cortes existentes.
- Causa de campos enriquecidos: el formulario independiente no carga `style.css`, aunque convierte sus textarea en `div[contenteditable]` con `rich-text-visual-editor` y toolbars compactas. Las reglas CSS globales no aplicaban en esa página. Se agregaron estilos locales para el toolbar y editor, ancho completo, relleno, borde, fondo, foco y altura mínima 128/140 px.
- La apertura de acordeones de etapa 3 ahora usa display Grid, conserva la distribución y su separación. El campo `colorCableCorte1` de etapa 2 tiene ancho completo y min-width 0. No se modificó el contrato de servicios ni lógica de escritura.
- Código: commits `6671241ebd2c75044280cf8a41d847377fdcac7f` y `aca1182f734d282f224d5e8a989e8979ececd773`. Archivo afectado: `HTML/add_cortes.html`. La copia exacta pre-edición se retiró tras comparación/Code Review (commit `076035a6cfd46ed26af6e133508b04ad22899f4d`).
- Validaciones estáticas PASS: 10 variantes del conversor de imágenes; ruta y mapeador de `checkVehicle`; presentación de imágenes en vehículo/cortes; toolbars y montaje de los cuatro editores; sincronización del contenido visual a los textarea; lectura de campos en el guardado; layout Grid y responsive; ancho del color; preservación de catálogos, `No recomendado`, operaciones pendientes, adjuntos, persistencia y flujo modal +. El diff coincide exactamente con el respaldo más los cambios autorizados.
- No se ejecutó navegador real ni verificación Beta de fotos de Drive/permisos. Pendiente confirmar visualmente los cuatro editores y el campo de color en móvil y comprobar imágenes reales tras publicar la rama.

## Continuidad — GP-WRITE-CUT-CATALOG-01 (2026-11-26)

- Rama de trabajo: `GPSpedia2.2.5_work`. HEAD documental previo a este checkpoint: `7729449d8c9c983a85396de2a2af5007d384a001`. Rama base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, verificada sin cambios.
- Síntoma: el usuario confirmó que el campo de detalles y los cuatro catálogos del formulario `HTML/add_cortes.html` ya funcionan, pero el submit de etapa 2 falla con `cut-operation.submit-failed`.
- Causa de código encontrada: CATALOG 2.4.1 obtiene categoría/encendido/tipo de corte/configuración Relay de la hoja `Cortes`; WRITE mantenía una validación anterior que exigía la hoja `Relay`, obtenía Configuración Relay de su columna B y Categoría de su regla de validación. La lista ofrecida por el frontend podía no coincidir con la lista aceptada por WRITE.
- Corrección en `JS/Services/write.js`: WRITE valida las cuatro listas desde las mismas columnas de `Cortes` que CATALOG (2, 8, 12/19/26 y 15/22/29), con `getDisplayValues()`, deduplicación y ordenamiento. La validación ya no exige la hoja Relay; su uso para diagramas/detalles permanece intacto.
- Diagnóstico: `HTML/add_cortes.html` ahora reporta `error.code` o un identificador técnico estático del error, nunca mensajes libres. `JS/Frontend/diagnosticLogger.js` amplía la allowlist de códigos API/servicio/transporte/WRITE y de errores internos de submit/recuperación; no registra payloads, tokens, VIN, imágenes ni mensajes libres.
- Verificación estática y fixture: comparación exacta contra respaldos de los tres archivos; solo los bloques auditados difieren. Harness de contrato cubrió categorías, encendido, tipos de corte distribuidos en tres slots y configuraciones Relay distribuidas en tres slots. Se confirmó paridad de columnas y `getDisplayValues()` con CATALOG, ausencia de lectura Relay en WRITE, propagación de `error.code` y allowlist-only del logger. Todas las aserciones del harness: PASS.
- Code Review estático: los cambios no alteran validación del payload, autenticación/actor, VIN, fingerprint SHA-256, asignación de IDs, ledger append-only, ScriptLock, rollback, Drive, idempotencia, recuperación, etapa 3 ni resolución de Inbox.
- Respaldos exactos previos a edición: `Olds/Backups/GP-CUT-SUBMIT-20261126/` para WRITE, `HTML/add_cortes.html`, `diagnosticLogger.js` y archivos de registro. Se conservarán hasta terminar Code Review y luego se retirarán.
- Commits de código: WRITE `ad84cb3e95ba48528c9c9ba729aecfafc3f46b69`; formulario `2b6924142eef4a38b713b3321fcd813740df506f`, `997c57170202a63aa24c74658bf648ac751256a3`; logger `eeecec8ad5a3f28d0ffdff2dc4b798da13c41b31`, `035041b445c5f6a785d19705aec3b254c9359bde`, `bc5a9313d09726b9926dc844f8dd42d81cab982f`, `f05eb994ce55c5872c85cd223dd4842183ce72bb`.
- Registros: `Auditoria.txt`, `ChangesLogs.txt`, `Tareas_Activas.md` actualizados.
- Limitaciones: no fue posible clonar GitHub desde el entorno para ejecutar `node --check`; no se ejecutó Apps Script, Spreadsheet, Drive, navegador ni una alta real. No se desplegaron servicios ni se modificaron datos remotos. La prueba Beta de alta nueva y aporte a vehículo existente sigue pendiente.
- Próximo paso: cerrar revisión final de diffs/respaldos, retirar los respaldos temporales, comprobar CI disponible y dejar la validación de escritura real para entorno controlado autorizado.


### Cierre de revisión y respaldos — GP-WRITE-CUT-CATALOG-01
- Code Review estático final: diffs de WRITE, formulario y logger coinciden exactamente con los bloques auditados; los fixtures de catálogo de tres slots y las aserciones de paridad con CATALOG pasan.
- Los seis respaldos temporales se eliminaron después de la comparación y revisión. Commits de limpieza: `42cc0262d68bfba702cf2f9606423fbb21ededda`, `14d7a84128bf917b15db73e3b870ca4cb199a8c5`, `0b9e24da3bd54b0246b61e1eed3308146d9abebe`, `4130fd046a0a1716af455b9d66098e59d24b69f0`, `5ee31a04025ebb59bf687daaf28c429dcc89a19a`, `8d7110ce85f87684889afd7d8defdae682d11321`.
- Pages build asociado al último commit de limpieza: run `45907521640`, estado pendiente al momento de este registro. Las ejecuciones Pages de commits intermedios fueron canceladas por pushes posteriores; no se interpreta como fallo de código.
- No existe evidencia de ejecución del workflow completo de regresión para esta modificación. La sintaxis Node no pudo verificarse localmente porque el entorno no resolvió github.com durante el intento de clonado.
- Rama base protegida sigue en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`. No se modificó.


## Continuidad 2026-11-26 — GP-CUT-PENDING-SNAPSHOT-01

- Rama de trabajo: `GPSpedia2.2.5_work`; rama base protegida `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1` sin modificaciones.
- Nuevo síntoma: `cut-operation.submit-failed`, etapa `submit`, estado `processing`, código `PENDING_SNAPSHOT_NOT_VERIFIED`. La línea se ejecuta inmediatamente después de `saveAddCutOperationPendingOperation`; no se llega a `checkOperation` ni al POST de `addOrUpdateCut`.
- Auditoría de `offline.js`: el guardado en `adminLocalState` valida el snapshot, comprueba conflictos de identidad/hash/estado, escribe, vuelve a leer dentro de la transacción y compara el objeto recuperado. El llamador anterior convertía todos los rechazos en un solo código genérico.
- Cambios implementados: comparación de snapshot mediante serialización estructural determinista (claves de objetos ordenadas, arrays conservados); motivos de error diferenciados para snapshot inválido/conflictivo, discrepancia, ausencia de resultado, cuota, DataCloneError y fallos de IndexedDB; propagación del código desde `offline.js` hasta el logger de `add_cortes.html`; allowlist segura ampliada; caché PWA v80.
- Respaldos exactos previos: `Olds/Backups/GP-CUT-PENDING-SNAPSHOT-20261126/offline.js`, `HTML__add_cortes.html`, `JS__Frontend__diagnosticLogger.js`, `service-worker.js`. Se conservarán hasta cerrar Code Review y luego se retirarán.
- Commits de implementación: `f4b2590cd73ae3198f9ac14e8c669379352dd967` (offline), `a9f6cef04314a87c3799bb7557ac0e069fe5916f` (formulario), `2bf8d785ae6d27bb83e0ec86347d3fc85f89354c` (logger), `6370c9e5586305529c1772fa097e65327476c5b5` (Service Worker/cache).
- Validación: diffs individuales frente a respaldos confirmaron cambios limitados a las zonas auditadas; fixture de serialización estable 2/2 PASS. No se ejecutó navegador/IndexedDB real ni servicios Apps Script/Spreadsheet/Drive.
- Estado: corrección de comparación y diagnóstico implementada; el registro real sigue bloqueado hasta observar el nuevo código de motivo en Beta y validar una operación controlada con recuperación/idempotencia.

- Cierre de Code Review y respaldos: se reconstruyó el archivo original de `offline.js` aplicando inversamente los cambios previstos y coincidió exactamente con el respaldo; HTML, logger y Service Worker también coincidieron exactamente al revertir sus cambios autorizados. Respaldos temporales eliminados después de esta revisión (commits `12eb7a82109a4a1dfdf5eeaf959f16430d7f61bd`, `93b760c7ed9aed051591874d6c75de40edd5fbea`, `608db06ca73665186578225d1cce61640f43655a`, `8e4b9e0d47a4a6d9c02ac1f3c8b95e6ff79e484d`).


## Continuidad 2026-11-26 — GP-CUT-FORM-SNAPSHOT-02

- Rama de trabajo: `GPSpedia2.2.5_work`; base protegida: `GPSpedia2.2.5`. No se editó la base.
- Se completó auditoría comparativa entre el modal de detalle (`ui.js` + API local antigua `saveAddCutPendingOperation`) y `HTML/add_cortes.html` (snapshot durable por cuenta + fingerprint SHA-256 + recuperación). Los contratos no son iguales y no deben considerarse intercambiables.
- Hallazgo reproducible por fixture: el constructor de etapa 2 distinguía vehículo nuevo solo con `== null`, mientras el validador trata también `""` como null. Si el estado llegaba vacío, el payload llevaba `vehicleId: ""` y `vehicleData: null`; tras normalización del validador se exigía un objeto de vehículo nuevo y el snapshot era rechazado. Se corrigió normalizando una vez antes de construir ambos campos.
- Hallazgo adicional documentado: existe un único snapshot durable por usuario compartido por altas y aportes suplementarios. Los conflictos con una operación anterior son una protección intencional contra duplicación; no borrar ni reemplazar registros sin consultar estado remoto mediante el mismo opId/hash.
- Cambios: `HTML/add_cortes.html` normaliza el identificador y presenta mensajes de usuario diferenciados para errores locales; `service-worker.js` pasa de caché v80 a v81.
- Respaldos exactos: `Olds/Backups/GP-CUT-FORM-SNAPSHOT-02-20261126/` (Auditoria.txt, HTML/add_cortes.html, offline.js, diagnosticLogger.js, service-worker.js, Tareas_Activas.md, ChangesLogs.txt y checkpoint.md). Se conservan hasta completar Code Review y la comparación final.
- Commits: auditoría `45cc06ad5546a8daa5e632961356d52cf270fece`; formulario `694510237016bbbe1464311ba7221760f0fe48e7`; Service Worker `12b24c09a4be6b2f3da631cd345d34b2af1e6075`.
- Validación: fixture de normalización y contrato 7/7 PASS; diff contra respaldos limitado a los cambios descritos; logger contiene los códigos específicos existentes. No se ejecutó navegador/IndexedDB, Apps Script, Spreadsheet, Drive ni alta real. GitHub no devolvió status checks ni workflow runs asociados al último commit consultado.
- Pendiente: confirmar que la versión v81 se publica/activa en el sitio, probar en navegador móvil la persistencia y completar altas reales para vehículo nuevo y existente. No se afirma resuelto el registro Beta sin esas pruebas.


### Cierre de Code Review — GP-CUT-FORM-SNAPSHOT-02
- Reconstrucción inversa de los dos bloques modificados de `HTML/add_cortes.html` y de la versión de caché en `service-worker.js`: coincidencia exacta con los respaldos originales. `offline.js`, `diagnosticLogger.js` y el modal `ui.js` no fueron modificados.
- Safety & Side Effects: la persistencia verificada sigue siendo obligatoria; las operaciones previas con otro ID/hash siguen bloqueando el reemplazo; no se eliminan datos pendientes ni se omite el preflight.
- Fixture de contrato: 7/7 PASS. No hay prueba de navegador móvil/IndexedDB ni escritura real en Apps Script/Spreadsheet/Drive; la validación Beta permanece abierta.
- Respaldos temporales eliminados después de Code Review. Commits de código: `694510237016bbbe1464311ba7221760f0fe48e7` y `12b24c09a4be6b2f3da631cd345d34b2af1e6075`.


## Continuidad 2026-11-26 — GP-CUT-DEEP-AUDIT-03

- Rama de trabajo: `GPSpedia2.2.5_work`. HEAD de código `02eb7fa35159416ed4451b75b810b1a98c0184ba`. Rama base protegida `GPSpedia2.2.5` se mantiene en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no se modificó.
- Auditoría ampliada: el árbol contiene `HTML/add_cortes.html`, no existe el archivo en la raíz. `index.html`, Service Worker e imports del formulario ya usaban la ruta correcta. Se encontraron dos referencias obsoletas en `JS/Frontend/ui.js` (aviso «No funciona» y botón de registro silencioso); ambas se corrigieron a `HTML/add_cortes.html`.
- Persistencia: no se relajó el contrato de snapshot ni la barrera previa a WRITE. Una operación previa inválida o pendiente puede bloquear una nueva alta; no se borra ni sustituye automáticamente. Se requiere identificar el código concreto y recuperar con el mismo opId/hash cuando sea posible.
- Contrato remoto revisado estáticamente: `routeAction` mapea `checkOperation` y `addOrUpdateCut` a WRITE; WRITE enruta ambas acciones. ADMIN rechaza esas acciones como `ACTION_MOVED_TO_WRITE`. No se modificó Apps Script.
- Service Worker: caché v82.
- Respaldos exactos previos: `Olds/Backups/GP-CUT-DEEP-AUDIT-03-20261126/` (ui.js y service-worker.js), pendientes de eliminación tras la revisión final registrada.
- Code Review: diff ui.js limitado a dos sustituciones; diff service-worker.js limitado a v81→v82. Imports del formulario y recursos locales revisados resuelven contra el árbol Git.
- Pages build/deploy run `45913010737` SUCCESS sobre HEAD `02eb7fa35159416ed4451b75b810b1a98c0184ba`.
- Pendiente: confirmar que el dominio usado desde el móvil sirve el mismo HEAD; prueba real de navegador/IndexedDB y alta controlada; resolver cualquier snapshot previo inválido sin pérdida de idempotencia. El build/deploy no demuestra por sí solo que la escritura remota funcione.

- Documentación: `README.md` actualizado para reflejar `HTML/add_cortes.html` y `HTML/users.html`; sin cambios adicionales en la descripción de arquitectura.

- Cierre GP-CUT-DEEP-AUDIT-03: Code Review estático aprobado; respaldos temporales retirados después de la comparación exacta (commits `dcbaab71e7bf09392ca9ecb3cd3c738569ae0912`, `dea98bc95a7cffa161df48badc415bd22f165608`, `4e9141413067e05b157b4b76d3997d16b8cca36e`). Pendiente únicamente validación móvil/IndexedDB y confirmación de qué deployment usa el dispositivo.


## Continuidad 2026-11-26 — GP-CUT-FUNCTIONAL-AUDIT-04

- Rama: `GPSpedia2.2.5_work`; cambios de código: formulario `7483a76f912ac27cd1c6133df7a67aa0b7f55f30`, logger `1d8b0a30f2c4f45a937def2342307f86d65ca113`, Service Worker v83 `8e8994d573d4ba6caa1421f1e3308e583b6837d1`.
- Auditoría F-11 a F-20 registrada en `Auditoria.txt`. Correcciones: el formulario muestra el mensaje concreto que antes descartaba; recuperación de operaciones silenciosas dirige `checkOperation` a WRITE; logger admite códigos internos adicionales sin registrar datos sensibles; caché PWA v83.
- WRITE fue revisado estáticamente y no modificado. La persistencia mantiene su barrera: no se envía WRITE si el snapshot no está confirmado y no se eliminan/sobrescriben operaciones pendientes automáticamente.
- Fixtures estáticos PASS: formato/unicidad de endpoints, mapa de acciones, fingerprint cliente/servidor para vehículo nuevo y existente, diff contra respaldos, ausencia del override ADMIN en recuperación.
- Endpoints actuales: los IDs de `API_ENDPOINTS` son distintos de los consultados en el último health remoto disponible. Ese health histórico no valida los endpoints actuales. No se dispone en esta sesión de cliente HTTP/browser para consultar directamente Apps Script.
- Pages build previo al cierre de esta tarea: run `45913324055` SUCCESS en HEAD previo; PR #128 sigue abierto. El nuevo build de v83 y los commits documentales deben confirmarse.
- Pendiente: health GET-only a endpoints actuales; verificar despliegue en el dominio/móvil; IndexedDB real, alta controlada y recuperación de operación silenciosa. No se ejecutaron POST, escrituras Sheets/Drive ni cambios de deployments.


## Checkpoint GP-CUT-FUNCTIONAL-AUDIT-04 — cierre de código (2026-11-26)

- Rama de trabajo `GPSpedia2.2.5_work`; HEAD de código `dd93b63977d059d7d27cd44006a3a5265d3c69fe`. Rama base `GPSpedia2.2.5` se mantiene en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, intacta. PR #128 sigue OPEN, no mergeado.
- Cambios: formulario ahora muestra errores específicos; recuperación de `checkOperation` silenciosa usa WRITE; logger cubre los códigos explícitos de WRITE; «No recomendado» puede omitir ubicación; cortes normales requieren ubicación; frontend/WRITE/cargador Drive alineados en 16 MIME; caché PWA v85.
- Code Review contra respaldos: PASS; diffs limitados a los bloques autorizados. Fixtures de validación: 7/7 PASS; MIME 16/16; códigos WRITE 11/11.
- Pages build/deploy run `45914970548` SUCCESS en HEAD de trabajo.
- Límite: el éxito de Pages no despliega el código Apps Script. `JS/Services/write.js` actualizado solo en el repositorio; no se ejecutó health GET-only sobre los IDs actuales de `API_ENDPOINTS` ni se verificó la versión del endpoint remoto. El último health disponible consultó endpoints anteriores. No se ejecutaron POST de alta, IndexedDB real, Sheets ni Drive.
- Pendiente: despliegue/health del WRITE actual; confirmar el HEAD servido por el dominio/móvil; prueba controlada de vehículo nuevo y existente y recuperación/idempotencia con datos sintéticos y cleanup verificable.

- Code Review finalizado; los 12 respaldos temporales de las iteraciones 04B/04C/04D fueron retirados después de comparar los diffs. Commit de limpieza `df36935c16bf86f7b61c383b4a8af5c71d9e31a9`; no quedan respaldos de esta auditoría.


## Checkpoint GP-CUT-ID-FORMAT-REBUILD-05 — IDs V-### (2026-11-26)

- Rama de trabajo: `GPSpedia2.2.5_work`. HEAD de código validado por Pages: `7ee15c2f428c9d903dac8269c8430a0f0ad0ef8e`. Rama base `GPSpedia2.2.5` se conserva intacta en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; PR #128 sigue abierto.
- Causa confirmada en código: varias funciones trataban el ID público `V-001` como entero numérico. Esto rompía el high-water mark, el plan de congelación de fórmulas, la validación de corte para vehículo existente, el ledger append-only, el versionado de catálogo y la proyección dirigida CATALOG.
- Corrección: WRITE mantiene la secuencia interna numérica en `CortesIdReservations`, pero convierte las reservas a IDs persistentes `V-###` (mínimo 3 dígitos, extensión natural a `V-1000`, máximo 16 dígitos sujeto a entero seguro). La lectura de celdas con fórmula usa el valor calculado y el freeze-plan conserva ese valor al retirar la fórmula. Alta nueva escribe el ID estático, sin copiar la fórmula de la fila anterior.
- Rutas existentes: `addOrUpdateCut` normaliza IDs; `AportesVehiculo` guarda el ID canónico y mantiene idempotencia por `opId`; CATALOG acepta V-### en proyección dirigida; offline acepta V-### en snapshots suplementarios. Modal de detalle `openAddCutForModelModal()` se mantuvo sin cambios y fue revisado contra respaldo; envía `item.id`, conserva el mismo `opId` y verifica la respuesta del backend. `HTML/add_cortes.html` tampoco requirió cambios.
- Archivos modificados: `JS/Services/write.js`, `JS/Services/catalog.js`, `JS/Frontend/offline.js`, `service-worker.js` (caché v86). Archivos respaldados antes de edición: WRITE, CATALOG, offline.js, ui.js y Service Worker en `Olds/Backups/GP-CUT-ID-FORMAT-REBUILD-05-20261126/`.
- Code Review contra respaldos: PASS; `ui.js` idéntico al respaldo. Sintaxis V8 de WRITE/CATALOG/offline/Service Worker: PASS. Fixtures de parser/formatter, fórmula/high-water, freeze-plan, validación, append/replay/conflicto, proyección CATALOG y snapshots offline: PASS.
- GitHub Pages build/deploy run `45917661822` SUCCESS en HEAD `7ee15c2f428c9d903dac8269c8430a0f0ad0ef8e`.
- **Pendiente crítico:** el código Apps Script aún no está desplegado/verificado en los endpoints activos. No se consultó el Spreadsheet productivo ni se ejecutaron escrituras en Sheets/Drive; no se probó IndexedDB real. Antes de cerrar la incidencia: health GET-only a endpoints actuales, desplegar WRITE y CATALOG, probar alta nueva y aporte existente desde formulario y modal con datos aislados, verificar proyección y reintento del mismo `opId`, y confirmar limpieza local. No afirmar resuelto hasta pasar estas pruebas.
- Próximo paso: continuar con despliegue/health y validación controlada; conservar respaldos hasta finalizar revisión remota y Code Review.

- Actualización de CI: Pages build/deploy run `45918026216` SUCCESS en HEAD `8017e1109092901e21101c18b80b37173901fe49`; build final `45918204547` SUCCESS en HEAD `038be9e98b91a4f85decf8b559eb641bf527171a`. El código probado corresponde al HEAD `7ee15c2f428c9d903dac8269c8430a0f0ad0ef8e`; commits posteriores solo actualizaron documentación.


## Continuidad — GP-CUT-ID-SEQUENCE-06 (2026-11-26)

- Rama de trabajo: `GPSpedia2.2.5_work`; base protegida `GPSpedia2.2.5` sin modificaciones.
- Código WRITE: commits `994a4aeff118b7827962219f7c67a872940be866` y `21a2d1c5724111fca3550b3bf7b60d0459c0da49`.
- ID público nuevo: texto estático `V-` con mínimo cinco dígitos. Ejemplos verificados: 1→`V-00001`, 2→`V-00002`, 99999→`V-99999`, 100000→`V-100000`, 100001→`V-100001`. Se mantiene lectura de IDs históricos.
- WRITE calcula el siguiente número a partir del máximo de la hoja `Cortes` y del ledger de reservas; las reservas nuevas se guardan como valores estáticos bajo ScriptLock, no como fórmulas. Se conserva append-only y replay idempotente por `opId`/hash.
- Alta nueva: inserta fila física, copia formato y validaciones de la fila anterior, limpia valores/fórmulas heredados y escribe ID, datos base, primer corte, VIN, colaborador, fecha y testigo. El rollback identifica la fila insertada.
- Respaldo exacto: `Olds/Backups/GP-CUT-ID-SEQUENCE-06-20261126/JS__Services__write.js.backup`.
- Validación local: sintaxis V8 PASS; parser/formatter PASS; reserva simulada 99999→100000, replay, conflicto y lock PASS; 13 invariantes estáticas PASS; Code Review del diff limitado al alcance PASS.
- Pendiente: publicar WRITE Apps Script, verificar endpoint activo y ejecutar una prueba controlada de alta nueva en Spreadsheet aislada para confirmar fila, validaciones desplegables y contenido completo. No se ha ejecutado escritura remota ni se afirma resuelto en producción.
- El checkpoint previo GP-CUT-ID-FORMAT-REBUILD-05 permanece vigente para los pendientes de despliegue CATALOG/offline y validación del modal/formulario.

- Ajuste final: la celda ID de la fila nueva se configura como texto plano (`@`) antes de escribir `V-00000`; commit `f50ed98c2b890ed0b91aff46af3a90ab99c37bc5`. La sintaxis y las invariantes estáticas se revalidaron después del ajuste.

- Robustez adicional: la primera alta también funciona si `Cortes` solo contiene encabezados; la fila 2 se conserva como plantilla al desplazarla y copiar sus validaciones a la nueva fila 2. Commit `5fd150497861893f7762c6616cd61b2e8781451c`.

- Prueba efímera del bloque de inserción completada: con datos existentes crea la fila siguiente; con solo encabezados crea la fila 2 copiando la plantilla desplazada; con grilla de una fila la amplía y conserva la plantilla. Los tres escenarios PASS. Compilación V8 final PASS.


## Continuidad — GP-CUT-ID-CROSS-SERVICE-07 (2026-11-26)

- Rama de trabajo: `GPSpedia2.2.5_work`; rama base `GPSpedia2.2.5` permanece sin modificaciones.
- Hallazgos: CATALOG devolvía `V-00001` como `V-001` y rechazaba ceros iniciales en FeedbackLikes; FEEDBACK bloqueaba IDs prefijados en sugerencias de año/útiles y comparaba IDs históricos literalmente; ADMIN auditaba IDs como números.
- Implementación: CATALOG y FEEDBACK canonicalizan a `V-` + mínimo cinco dígitos, extienden a seis o más y reconocen aliases históricos; ADMIN normaliza el diagnóstico de referencias; otros servicios revisados no requerían cambios.
- Servicios backend revisados: WRITE, CATALOG, FEEDBACK, ADMIN, Auth, Utilities, CentralConfigurationReader, InboxConversations y SharedSessionActor. Frontend: offline, ui/modal, formulario y api-config.
- Commits CATALOG `7945e406075461d9af3a2bf209a4493eecb09027`; FEEDBACK `20e5e09313d99858eb11e9fa1b01a9f51f7d7201`, `fb1ff8608b84a49f7b4d137e82cc25bded1224b8`, `4e60ce927a48b44907ff4bb4b93ea091689021aa`, `f3e283157e5746ab8cb5db3da4ca854e2d9f4237`, `412d21236d817fd2586c48519fe80d35465ad80c`; ADMIN `adad4b9313092774f3aa90a1ce4da4f708aff84e`.
- Backups en `Olds/Backups/GP-CUT-ID-CROSS-SERVICE-07-20261126/` (incluye respaldo adicional de FEEDBACK previo a corregir hallazgo de revisión).
- Validación local: sintaxis V8 5/5; canonicalización CATALOG/FEEDBACK/ADMIN; contador de útiles con IDs alias; detección de duplicados lógicos; sugerencias/años y eventos AportesVehiculo; Inbox/reportes; PyS; auditoría ADMIN 9 referencias coincidentes, cero huérfanas/malformadas/mismatches. Code Review final PASS.
- **Pendiente crítico:** no se desplegaron los servicios Apps Script ni se ejecutaron pruebas reales contra Sheets/Drive. Desplegar WRITE/CATALOG/FEEDBACK/ADMIN y ejecutar health y prueba integrada aislada antes de declarar validado en producción. Mantener respaldos hasta cerrar la validación remota.


## Continuidad — GP-CUT-SAME-ROW-08 (2026-11-26)

- Estado: implementación terminada en `GPSpedia2.2.5_work`; validaciones estáticas y simulaciones efímeras PASS. No desplegado ni validado contra Sheets/Drive reales.
- Rama base protegida `GPSpedia2.2.5`: HEAD comprobado `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones. Último commit de implementación: `773312621da5bceb6ad5bad7cdd94ea06286bb49`. PR #128 abierto, mergeable.
- Commits de implementación: `8809015aa41e2d55064eedeb056a21588a90fe10`; refinamiento `773312621da5bceb6ad5bad7cdd94ea06286bb49`. Respaldo previo: `d8b3e58005263d6f1e71e3b37449abcf893272c9` en `Olds/Backups/GP-CUT-SAME-ROW-08-20261126/`.
- WRITE localiza una única fila física por vehicleId mediante `readSupplementaryVehicleSnapshot_()`/`findUniqueCortesVehicleRow_()`. Los aportes existentes no insertan filas en `Cortes`: corte, apertura, alimentación y VIN se materializan en columnas libres de esa fila; las escrituras verifican contenido y no sobrescriben celdas ocupadas. `AportesVehiculo` permanece como historial append-only e idempotente.
- Corte materializa tipo, ubicación/detalle, color, configuración Relay, testigo, imagen y nombre del colaborador autenticado. VIN se escribe en la columna localizada por encabezado, con validación de duplicados/capacidad y replay. La reconciliación procesa eventos aceptados anteriores antes de asignar nuevos slots.
- CATALOG reconoce los slots ya materializados y evita proyectar duplicados; los eventos con conflicto/capacidad continúan como candidatos. Los modales de apertura/alimentación usan snapshots durables, IDs OP- independientes y recuperación con el mismo identificador.
- Alta/recuperación: una confirmación WRITE ya no queda bloqueada por la limpieza IndexedDB. Si permanece un snapshot de corte `completed`, puede retirarse o reemplazarse de forma segura por la siguiente operación suplementaria; no se reutiliza el opId anterior.
- Vídeo guía: sin cambios; la aprobación ya localiza una fila única existente y rechaza sobrescribir otra URL.
- Validación: balance estático de delimitadores en los seis archivos modificados; sin nombres de funciones duplicados; 11 invariantes de integración comprobadas; simulaciones efímeras de slots de corte 1/2/3, replay, slot de alimentación y no sobrescritura PASS. No se agregaron suites/workflows; Tareas_Beta.md sigue cerrada.
- Próximo paso: despliegue explícitamente autorizado de WRITE/CATALOG y prueba integrada controlada en Spreadsheet/Drive aislado, más verificación de navegador/IndexedDB. No se ejecutaron POST remotos, escrituras productivas ni despliegues; no afirmar validación de producción.


## 20. GP-WRITE-SUPPLEMENTARY-SESSION-KEY-01 — corrección de validación de actor (2026-11-26)
- Hallazgo auditado: `assertSupplementaryInfoPayloadKeys_` rechazaba las claves del actor compartido interno, provocando error previo al guardado de apertura/alimentación desde el botón `+`.
- Corrección de código: `JS/Services/write.js` allow-list admite `__sharedSessionActor` y `_sharedSessionActor` como claves de contexto interno. El handler de autenticación sigue usando exclusivamente `payload.__sharedSessionActor`, insertado por `withSharedSessionActor_` después de validar sesión; el alias de un underscore no es fuente de identidad.
- Code review/diff: backup exacto confirma que el único cambio de código es la expansión de la allow-list. Handler, ledger, idempotencia, persistencia y materialización de fila existente permanecen intactos.
- Registros añadidos en Auditoria.txt, ChangesLogs.txt y Tareas_Activas.md.
- Validación realizada: revisión estática de dispatcher, helper actor, handler, validator y frontend; comparación exacta con respaldo PASS. No se agregaron suites, archivos de prueba ni workflows (Beta cerrada).
- Límite: no se ejecutó Apps Script remoto, Sheets/Drive, browser real ni deployment; integración queda no verificada.
- Commit de implementación: `54c18271945fcb68342eba213285d9628c2e845b`; commits documentales posteriores: `7063b3f7ff49bbb4303c9f6e77e19dffb1879e1b` y `d07ceee653eba01ecd1f1901f0fa8cbdda4066c3`.
- Backup temporal exacto conservado en Olds/Backups durante revisión; será retirado tras la revisión final.
- Siguiente paso: revisar y limpiar backup temporal, verificar HEAD/base y registrar cierre.


### Cierre de revisión — GP-WRITE-SUPPLEMENTARY-SESSION-KEY-01
- Code review: cambio único de código verificado contra respaldo exacto; allow-list con 17 claves total (incluye las dos formas de actor). Actor confiable se consume exclusivamente mediante `__sharedSessionActor`; el alias de un guion bajo no se usa para identidad. Validación de rol, userId y epoch preservada; flujo de aprobación de vídeo sigue rechazando campos de vídeo.
- Backup temporal comparado y eliminado conforme a normativa.
- Estado: corrección local en rama de trabajo, sin deployment; no hay prueba remota ni de navegador. No se reabrió Beta ni se crearon suites.
- Commit de eliminación de backup: `c3da623f41023fdd8d1755b4bb37bec457b69c27`.


### Verificación final de continuidad
- Último HEAD de trabajo verificado antes del cierre documental: `30ca3cabfc059d0eea0f8c2b746e5f3417157cfd`; los commits de cierre posteriores actualizan únicamente registros.
- Rama base `GPSpedia2.2.5`: SHA `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, no modificada.
- Incidencia GP-WRITE-SUPPLEMENTARY-SESSION-KEY-01: fuente corregida y revisión local cerrada; pendiente deployment/integración autorizada.


## Continuidad — GP-ADD-CUT-WIZARD-UX-NAV-01 (implementación parcial, 2026-11-26)
- HEAD documental/funcional posterior: rama `GPSpedia2.2.5_work`; la base GPSpedia2.2.5 no se modifica.
- En `HTML/add_cortes.html`: alertas de éxito de corte normalizadas y etapa 3 se muestra tras commit WRITE; limpieza local y verificaciones postcommit no deben bloquear transición. Fallos de submit de corte con mensaje genérico solicitado y detalles a consola. Se eliminaron alertas suplementarias tras verificación de catálogo y recovery redundante.
- Etapa 3→2 reinicia campos e imágenes localmente; etapa 2→1/1.5 y coincidencias mantiene la lógica previa de preservación.
- `JS/Frontend/ui.js`: pushState modalOpen cuando ficha de vehículo abre desde vista no-modal; popstate existente cierra ficha. Falta prueba en navegador Android/browser real.
- Icono explícito PNG existente agregado en `HTML/add_cortes.html` para evitar fallback favicon.ico; falta confirmar Pages en vivo.
- `document.write`: advertencia de runtime Google Apps Script, sin evidencia de callsite propio; no modificar runtime externo.
- Auditoría, ChangesLogs y tareas registran alcance y hallazgos. Backup de HTML/ui/main en Olds/Backups aún pendiente de Code Review y eliminación.
- Validación real de navegador, despliegue, POST y mutaciones remotas no realizadas. No se agregaron tests/workflows; Beta permanece cerrada.
- Siguiente: revisión estática comparativa contra respaldos; confirmar handler de navegación/back y flujo add-corte→suplementarios→catálogo; cleanup backups tras revisión; documentar y commit.

- Revisión adicional en etapa 3: si WRITE confirma aporte suplementario con vehicleId concordante, fallos de confirmación secundaria de eventos o cleanup local se registran en consola y no bloquean el redirect al catálogo.
- Aportes desde modal de detalle: se eliminó la concatenación de alerta de cleanup pendiente al mensaje de éxito; postcommit refresh falla en consola sin alerta global extra. Notificaciones legítimas de éxito/candidato conservadas.

- Code Review estático concluido: `HTML/add_cortes.html` comparado bloque por bloque contra backup exacto (12 bloques de delta revisados); cambios en `JS/Frontend/ui.js` aislados a historial de detalle y mensajes de suplementarios; `JS/Frontend/main.js` sin cambios byte a byte.
- Backups temporales HTML/ui/main eliminados tras revisión. Logs de auditoría/ChangesLog/task register actualizados.
- Validación no incluye parsing, browser real, Android, despliegue ni operaciones remotas; quedan pruebas integradas pendientes.


## GP-CUT-DETAIL-DUPLICATE-PROJECTION-01 — continuidad (2026-11-26)
- Auditoría focal documentada en `Auditoria.txt`; tarea registrada en `Tareas_Activas.md`.
- `JS/Services/catalog.js`: proyección de cortes ajustada para considerar únicamente tipos registrados, compactar slots, ordenar por útiles positivos (descendente; empate por posición física) y conservar orden físico si no hay útiles positivos; limpia campos de slots vacíos proyectados.
- Revisión de `JS/Frontend/ui.js` preliminar: modal filtra por tipo registrado, consume slots proyectados y conserva índice físico para acciones. No se modificó UI porque no se ha aislado evidencia suficiente de un defecto adicional de contenido repetido. La asociación testigo requiere validar el contrato de proyección.
- Pruebas simuladas conceptuales/estáticas; no se ejecutó runtime browser, Apps Script, POST, escrituras remotas ni deployment. Causa única del contenido duplicado aún no confirmada; tarea abierta.


## Continuidad — GP-CUT-DETAIL-DUPLICATE-PROJECTION-01 (auditoría ampliada 2026-11-26)
- HEAD previo a cambios: respaldo commit 5b2ae02070d3c75d94ea20d8235785621cb42213 en rama GPSpedia2.2.5_work; rama base GPSpedia2.2.5 no se modifica.
- Se revisó proyección CATALOG (mapRowToObject, getCortesColumnMap, mapCatalogVehicleRowForProjection_, projectVehicleContributionEvents_) y modal mostrarDetalleModal/renderCutContent.
- Plan: validar sourceCorteIndex repetidos en slots consumidos por modal, evitar render doble del mismo slot fuente, desempatar utilidad por índice físico, simular y revisar diff.
- No se dispone de lectura del registro real en Spreadsheet; el borrado manual puede no retirar eventos append-only accepted de AportesVehiculo. Caso de último registro queda sin confirmación de datos.
- Backup exacto de ui.js y registros creado en Olds/Backups/GP-CUT-DETAIL-DUPLICATE-PROJECTION-01-20261126/; sin POST, writes remotos ni deployment.


## GP-CUT-DETAIL-DUPLICATE-PROJECTION-01 — implementación (2026-11-26)
- JS/Frontend/ui.js ajustado: la lista modal evita consumir dos veces la misma referencia sourceCorteIndex física; slots vacíos omitidos; empate de utilidad se ordena por slot físico. No deduplica cortes distintos por similitud de contenido.
- Simulaciones efímeras PASS: sourceIndex duplicado, cortes distintos pero idénticos, empate y slot vacío. Diff contra respaldo exacto revisado; cambio localizado al bloque de lista/orden del modal.
- Backups temporales retirados después de Code Review.
- El caso de la última ficha aún no se puede confirmar contra Sheets: un event accepted append-only en AportesVehiculo podría materializarse nuevamente tras borrado manual, pero no se ha consultado la hoja real. No afirmar causa raíz confirmada.
- Sin browser, Apps Script, POST, writes remotos ni deployment; Beta cerrada.
- Siguiente paso: consulta de datos en Spreadsheet aislada/autorizada para determinar si persiste un evento de corte duplicado/replay; si es confirmado, auditar y corregir ledger/materialización por ciclo completo.

## 2026-11-27 — GP-CUT-DETAIL-PYS-STALE-NOTICE-01
- `JS/Frontend/ui.js`: se retiró el aviso de datos PyS potencialmente desactualizados dentro de `renderPosiblesProblemasAccordion`, en el modal de detalle de corte.
- Code review: comparación exacta contra respaldo confirmó únicamente la eliminación del bloque del aviso (7 líneas); no se alteró la lógica cache/refresh, filtrado, asociación ni avisos en otras vistas. Backup retirado tras revisión.
- Sin prueba navegador/runtime. Commit de código `b58d1435d88fba0a1ba630a698720cd06754432f`.


## Continuidad — GP-ADMIN-DRIVE-UNUSED-IMAGES-02 (2026-11-27)
- Corrección parcial fuente en ADMIN: buildCortesImageModelAssociationSuggestions_ usa jerarquía carpeta Brand/Model como señal principal; nombre/alias de archivo corroborados por marca y modelo como fallback; contextos de versión, encendido y año condicionan registros y ambigüedad.
- Exclusiones por referencias activas e histórico preservadas; la asociación sigue aplicándose al conjunto clasificado como Sin uso detectado.
- Diff revisado frente a backup temporal: prefijo y sufijo sin cambio, función delimitada. Pruebas runtime, navegador y Drive/Sheets real pendientes. Sin deployment ni mutaciones remotas.
- Tarea no cerrada; falta ejecutar pruebas aisladas reproducibles y review final de UI/consumidores.


## Continuidad — GP-ADMIN-DRIVE-UNUSED-IMAGES-02 (verificación 2026-11-27)
- 12 invariantes estáticos PASS; allowlist positiva y collector de referencias flotantes inspeccionados. Asociación e inventario siguen limitados a clasificación Sin uso detectado.
- Integración revisada parcialmente: resultados asociación adjuntos por ID; revalidación individual incluye controles de referencias, protección, historial y estado de auditabilidad.
- No ejecutar Apps Script real, fixture runtime, UI/browser o Drive/Sheets en esta sesión. Tarea abierta.


## 2026-11-27 — GP-ADMIN-DRIVE-UNUSED-IMAGES-02 / correcciones UI y contención ADMIN
- Frontend: el explorador renderiza tarjetas exclusivamente para archivos clasificados «Sin uso detectado», evitando que archivos «En uso», históricos o no verificables se muestren en la galería de imágenes sin uso.
- ADMIN: reserva de ScriptLock espera hasta 3 segundos; limpieza hasta 1.5 segundos, conservando el mecanismo de guarda y TTL.
- CSS móvil: workspace vertical; consola ~25%, contenido de pestañas ~75%, ambas áreas a ancho completo; línea de comando sin contenedor visual independiente. Pestañas mantienen estilo/transiciones base, botones en cuadrícula compacta.
- Revisión estática y simulaciones pendientes; sin runtime Apps Script/Drive/Sheets, navegador ni deployment.


## Verificación estática posterior — 2026-11-27
- PASS: filtro de tarjetas excluye estados distintos de «Sin uso detectado».
- PASS: la clasificación de tarjeta en la galería se restringe a estado no usado.
- PASS: reserva/limpieza guard usan espera acotada.
- PASS: overrides responsive declaran consola 25% y panel de pestañas 75%, ancho completo y shell de comando sin estilos de contenedor.
- Pruebas funcionales y navegador siguen pendientes; no declarar cierre de tarea ni desplegar.


## 2026-11-27 — GP-ADMIN-DRIVE-UNUSED-IMAGES-02 / corrección incremental UI y baseline
- HEAD previo: 84f0e3dbe586104a24ce286ba53c9d453136a47f.
- appendFiles() ya restringía tarjetas a clasificación exacta «Sin uso detectado»; se preserva el procesamiento de lotes completos para no alterar métricas, cursor, persistencia ni reanudación.
- El contenedor de resultados ya está dentro de #dev-panel-images; openAuditDriveModal() muestra #audit-drive-workspace y oculta #dev-images-overview.
- ADMIN: ensureAdminLocalGuardBaseline_() ahora espera hasta 3000 ms por ScriptLock en vez de fallar inmediatamente con tryLock(0); finally mantiene liberación del bloqueo.
- CSS: en móvil solo la pestaña seleccionada expande su botón y muestra su etiqueta; las demás quedan compactas. Se mantienen estilos de selección y transiciones existentes, con soporte de movimiento reducido.
- Respaldos previos almacenados como Git blobs: admin.js 8cc9ecf6c42c4a1eff20dde3e97bf8390402717e; style.css 44e785cb9710d88401fb816caf7e17f5486f0a13.
- Pendiente: validar estáticamente diff exacto, ejecutar pruebas aisladas, revisar interacciones y Code Review. No browser, Apps Script, Drive/Sheets real ni deployment.


## 2026-11-27 — GP-ADMIN-DRIVE-UNUSED-IMAGES-02 / ajuste de selectores activos
- Revisión del commit c1c992dfb3f527fa428d827ecac10f5895bb7949 detectó que el selector inicial asumía incorrectamente que los inputs radio eran hermanos del layout.
- Se actualiza el bloque CSS para consultar el radio seleccionado dentro de .dev-tools-tab-options mediante :has(), sin modificar HTML.
- Backup exacto style.css previo: 7855e1dd950ccdcdbfe7b27963f11ddf92964fdf.
- Pendiente: comparación, sintaxis y verificación visual.


## 2026-11-27 — GP-ADMIN-DRIVE-UNUSED-IMAGES-02 / verificación estática

- Verificación estática posterior al commit 83b911c1bd90a7f9e3fe3af556ec9cd4bcdb708e: balance de llaves CSS PASS; selectores activos y reglas de etiqueta para las cuatro pestañas PASS; prefers-reduced-motion PASS; baseline ADMIN contiene tryLock(3000) y liberación en finally PASS.
- Comparación Git desde 84f0e3dbe586104a24ce286ba53c9d453136a47f hasta 83b911c1bd90a7f9e3fe3af556ec9cd4bcdb708e: únicamente Auditoria.txt, ChangesLogs.txt, Tareas_Activas.md, checkpoint.md, JS/Services/admin.js y style.css.
- Sin pruebas navegador, runtime Apps Script, concurrencia real, Drive/Sheets ni deployment. Los resultados PASS anteriores son estáticos y no equivalen a validación funcional.
- HEAD verificado: 83b911c1bd90a7f9e3fe3af556ec9cd4bcdb708e.
- Siguiente paso: pruebas aisladas de pestañas y guarda; después navegador y Apps Script/Drive/Sheets autorizado, Code Review y cierre.


## 2026-11-27 — GP-PWA-OFFLINE-ICONS-01 / revisión estática del detector
- Se corrigió el escape de los caracteres consultados por document.fonts.load: el código fuente usa ahora las secuencias Unicode PUA correspondientes, no texto literal con doble barra.
- La hoja CDN permanece prioritaria; el CSS local se activa mediante la clase gp-icons-fallback cuando falta la hoja o alguna fuente.
- La comprobación es estática. No se ha ejecutado navegador, Service Worker en dispositivo ni sesión offline fría/caliente.


## 2026-11-27 — GP-PWA-OFFLINE-ICONS-01 / corrección de literal PUA
- Se verificó el contenido literal de icon-fallback.js y se sustituyó el doble escape restante por un único escape JavaScript para los glifos PUA consultados.
- La verificación confirma presencia del literal de una barra inversa y ausencia del literal doble; no equivale a prueba de navegador.


## 2026-11-27 — GP-PWA-OFFLINE-ICONS-01 / ajuste del glifo Brands
- El punto de prueba de Font Awesome Brands se actualizó a U+F167 (YouTube), en lugar de un código perteneciente a la familia Free.
- Solo se comprobó el código fuente; el comportamiento real de FontFaceSet y navegador sigue pendiente.


## 2026-11-27 — GP-ADD-CUT-WIZARD-UX-NAV-01 / favicon y document.write
- HTML/users.html ahora declara Images/icon-v3-512x512.png como favicon, igual que las otras páginas principales.
- La única llamada document.write localizada en ui.js genera el documento estático de impresión y no contiene script tags ni URLs externas. La advertencia parser-blocking de HtmlService no se atribuye a esta llamada; se deja sin modificar el runtime externo.
- Respaldo exacto de HTML/users.html antes del cambio: 45e8bcda8fae52dffa027c4f0b21a83f8dd3a70c.
- Sin navegador/Network; la desaparición del 404 y la fuente exacta de la advertencia siguen pendientes de confirmación.


## Continuidad — GP-ADMIN-DRIVE-UNUSED-IMAGES-03 (2026-11-27)

### Estado Git y normativa
- Repositorio: infogpstech/GPSpedia.
- Rama de trabajo: GPSpedia2.2.5_work. Rama protegida GPSpedia2.2.5 no modificada; todas las escrituras se dirigieron explícitamente a la rama de trabajo.
- Comparación GitHub base GPSpedia2.2.5 → GPSpedia2.2.5_work: status ahead, behind_by 0. No se hizo checkout ni escritura sobre la rama base.
- NORMAS_DESAROLLO.md, README.md, checkpoint.md, Tareas_Activas.md, Tareas_Beta.md, Auditoria.txt y PLAN_AUDITORIA_BIBLIOTECA_IMAGENES_SIN_USO.md consultados. contexto_personal.md no existe en esta rama (404).
- Beta continúa cerrada. Sin POST, Apps Script remoto, Drive/Spreadsheet real, operaciones mutables ni deployment.

### Hallazgos y correcciones aplicadas
1. **LogosMarca:** collectCatalogImageReferences() incorpora SHEET_NAMES.LOGOS_MARCA como fuente obligatoria. collectLogoSheetImageReferences_() lee la columna 3 (URL según handleAddLogo), reconoce URL/fórmula/rich text/CellImage, valida encabezado ID y registra hoja/fila/columna/marca. Las ubicaciones de LogosMarca se conservan en el snapshot y metadatos. Si falta la hoja o su encabezado ID es inválido, la auditoría falla de forma cerrada y no clasifica archivos.
2. **Registro incremental automático:** validateDriveAuditInventoryBatch_() ya no bloquea todos los candidatos por state.errorCount global. Un error aislado al leer otro archivo no impide registrar una imagen cuya referencia, ID y metadatos fueron verificados. unverifiableReferenceCount > 0 sigue bloqueando registro. validateCompletedDriveAudit_(), reconciliación y organización mantienen el requisito de auditoría íntegra sin errores.
3. **UI parcial/reintentos:** las tarjetas y controles permiten reintentar cuando la auditoría terminó con errores aislados pero no hay referencias no interpretables. El estado final se marca partial cuando hay candidatos; se conservan confirmaciones individuales. Organización y consolidación global siguen bloqueadas si la auditoría no es íntegra.
4. **Reinicio:** nuevo botón «Reiniciar escaneo». Requiere confirmación Developer, limpia IndexedDB de la cuenta actual y ejecuta runAudit(false) para crear auditId nuevo. No borra filas de Imagenes_Reemplazadas ni archivos Drive. Advierte que una solicitud activa en otra pestaña no se cancela automáticamente.
5. **Diagnóstico:** errores de ID/metadatos y fechas opcionales se envían a logs; errores de asociación, inventario individual y handlers generales incluyen fase/código/detalle. Resultados individuales incluyen errorCode/errorStage.
6. **FindOrCreate:** se verificaron getOrCreateReplacedImagesSheet() y ensureReplacedImagesInventoryColumns(). La primera crea Imagenes_Reemplazadas y sus encabezados base; la segunda agrega columnas requeridas y valida duplicados/esquema/persistencia. No se duplicó el helper; los esquemas incompatibles se rechazan sin sobrescribir.
7. **Compatibilidad:** DRIVE_AUDIT_SCAN_VERSION_ = drive-audit-logosmarca-v1 reemplaza la versión en curso de scanner, cursor, latest, validadores, organizer y reconciliation; invalida cursores/snapshots anteriores que omitían LogosMarca. ADMIN_SERVICE_VERSION permanece 2.7.2.

### Archivos y respaldos
- Modificados: JS/Services/admin.js, JS/Frontend/ui.js, index.html.
- Respaldos exactos previos: Olds/Backups/GP-ADMIN-DRIVE-UNUSED-IMAGES-03-20261127/admin.js.backup (blob SHA original 00d57dbe17544048a4d8acb37da150dcdbb8746e), ui.js.backup (396bba54602fc23cbde41122dbc50691af342e7b), index.html.backup (e9fa0e046a29c2870ff140813ef845743a6020f5). Los SHA de backup se comprobaron idénticos a los archivos fuente previos.
- Registros actualizados: Auditoria.txt, ChangesLogs.txt, Tareas_Activas.md, PLAN_AUDITORIA_BIBLIOTECA_IMAGENES_SIN_USO.md y este checkpoint.

### Commits principales
- Auditoría previa: b59bcdd123f10dd4ac82062120dd99fcfe373971.
- Tarea/backlog: 08e25daaf638fd5af2bc7b305ea62aad8d43af32; cierre de estado: dfd582726a42e7cb2e25a8f6c08a1c859c924bde.
- Respaldos exactos: 581eb709d27a045ef7ee89577a9ac14a067b9189, 2040d28eb13d4695f4ad1bcd0ce8de23a6c8990b, 1027edaa6aa5f1b002992d530d7fd15083733dec.
- Código: 69cded25f80dead70bd1c6da9a336debf50a8289, 6ef82da34832cb097d05d183ed1babfbba50709c, 3d620a59c54ea1c6ceb9d6baa504440d71e4204d, 653b473c37965f704fd9392435db295373d2a16b, d2f0a799c98bd789b9917a64fd713b2e05d34a79, 448f08fd05c6be48a553ed3314f02536ff97689a, 77566aa0d3c1c60671955fb45bed782a0124f511, 3f5e23ea2b2a48ff8e42d85c508da71d1a386a7b, 2b5b275813306efe8980578089e04d995c47078a.
- Documentación: 9829732f5748daa19ac5d51b597c33b65bcf68af, 7370365e44379ae99dff4fe712875dc41a81f6f2, b1b8c0e965c86fdfe1d18aa4c71737facda79c5d.
- HEAD antes de este checkpoint: b1b8c0e965c86fdfe1d18aa4c71737facda79c5d.

### Verificación realizada
- PASS estático: allowlist y collector LogosMarca; columna URL; hoja obligatoria; ubicaciones; versión nueva de scan; validador incremental no bloquea por errorCount aislado; referencias no interpretables siguen bloqueando; validación final conserva barreras; errorCode/errorStage; FindOrCreate; reinicio local y botón HTML único.
- PASS: balance de delimitadores en JS/Services/admin.js y JS/Frontend/ui.js; ID HTML de reinicio único; diff de commits inspeccionado; respaldos exactos verificados.
- No se ejecutó parser JavaScript completo ni harness runtime. No hay evidencia todavía de la estructura real de LogosMarca ni de su contenido real.

### Siguiente paso obligatorio
1. Crear/ejecutar harnesses aislados con mocks/fixtures para URL directa, fórmula, rich text y CellImage en LogosMarca; hoja ausente/ID inválido; archivo A con error y archivo B verificable; referencias no interpretables; reintento/idempotencia y lectura posterior de la fila; reinicio de IndexedDB/auditId.
2. Revisar diff completo contra respaldos y probar UI en navegador escritorio/móvil, manteniendo el diseño actual de las pestañas.
3. Solo en Beta autorizada, validar que la hoja real LogosMarca tiene ID en A y URL de logo en C, probar registro real controlado y comprobar filas/estados. No desplegar Apps Script hasta autorización explícita.
4. Mantener GP-ADMIN-DRIVE-UNUSED-IMAGES-03 abierta hasta terminar los puntos anteriores.


## 2026-11-27 — GP-ADMIN-DRIVE-UNUSED-IMAGES-03 / última revisión de errores
- Se añadieron trazas de función a los errores generales e individuales mediante getDriveAuditErrorTrace_(); doPostInternal_ expone stage, code, details y logs. La UI conserva el mensaje completo del error contextualizado.
- Verificación estática final: 17/17 invariantes PASS; balance de delimitadores JS en admin.js/ui.js PASS; botón reset HTML único PASS; respaldos exactos PASS. Simulación lógica de formatos URL de Drive y de barreras de registro individual/consolidación: 19/19 PASS.
- No existe package.json ni los paths esperados JS/Tests/LocalApiEndpoints.mjs, JS/Tests/DriveAuditHarness.mjs o tests/admin-drive-audit.test.js en esta rama. GitHub commit status no reporta checks asociados. El intento de clonar para ejecutar Node falló porque el entorno no resolvió github.com; no se declara ejecución de parser ni runtime.
- Nuevos commits de código: 4b8f0582a5a6c03870cb7f8ee71152d7cedf3d2a y e3eaa6e6d11e05f3a5bf4b81e1fe97863515c2e6.
- Nuevos commits de documentación: 9e69a8fd7aade8813e5ad00f412d40f92a976199, d4bafbb28cfa63ca87a6af16b7ba2b961ff858d7, c08c82236cc9543dc9cb1a990860663ea79bfc01.
- HEAD antes de esta actualización del checkpoint: c08c82236cc9543dc9cb1a990860663ea79bfc01.
- Pendiente: harnesses de mocks/fixtures descritos en el plan, revisión visual escritorio/móvil y Beta autorizada para comprobar la hoja LogosMarca real, registro por archivo e idempotencia. No deployment ni mutaciones remotas.


## Continuidad — GP-ADMIN-DRIVE-UNUSED-IMAGES-03 / harnesses aislados (2026-11-27)

### Recuperación y estado Git
- Repositorio: infogpstech/GPSpedia. Rama de trabajo: GPSpedia2.2.5_work. Rama protegida: GPSpedia2.2.5.
- Comparación base→trabajo: status ahead, behind_by 0; base_commit y merge_base_commit siguen en d9acc68d889985c2e2f42fe3a02e502efc86ead1. No se escribieron cambios en la rama base.
- README.md y NORMAS_DESAROLLO.md leídos completos. Tareas_Activas.md, Tareas_Beta.md, Auditoria.txt, ChangesLogs.txt y PLAN_AUDITORIA_BIBLIOTECA_IMAGENES_SIN_USO.md consultados. contexto_personal.md y Contexto de trabajo.md no existen en esta rama (404); no se creó un sustituto.
- El checkpoint previo señalaba como siguiente paso los harnesses aislados de GP-ADMIN-DRIVE-UNUSED-IMAGES-03. Beta permanece cerrada; no crear suites/workflows permanentes.

### Pruebas aisladas ejecutadas en memoria
- Collector real collectLogoSheetImageReferences_: 5/5 PASS para URL directa, fórmula IMAGE(), Rich Text, CellImage y enlace Drive no interpretable.
- Esquema LogosMarca sin encabezado ID: 1/1 PASS, bloqueo fail-closed.
- validateDriveAuditInventoryBatch_: 3/3 PASS para error aislado con candidato emitido, bloqueo por referencia no interpretable y rechazo de ID ajeno.
- Bloque real uniqueFiles.forEach de handleSaveUnusedImagesInventory: 1/1 PASS con archivo A fallido y archivo B confirmado; el error individual no interrumpió el lote. Resultado A=error, B=confirmado, confirmedCount=1, errorCount=1, insertedCount=1.
- writeDriveInventoryRowVerified_: 2/2 PASS con hoja simulada para escritura/lectura normal y persistencia seguida de excepción; la lectura posterior reconoció la fila sin repetir escritura.
- clearDriveAuditState real de offline.js: 1/1 PASS con transacción IndexedDB simulada; eliminó state/latest/meta/page/confirmed de userA, conservó estado de userB e inventario persistente, retiró el marcador pendiente e incrementó generación 7→8.
- UI/CSS: 6/6 comprobaciones estáticas PASS para filtro exacto «Sin uso detectado», ocultamiento de reintentos en otras clasificaciones, selectores de las cuatro pestañas, expansión móvil, movimiento reducido y limpieza antes de runAudit(false).
- No son pruebas de navegador ni Apps Script productivo. No se ejecutó UI visual, IndexedDB real, Apps Script, Drive/Spreadsheet, POST ni deployment.

### Cambios y respaldos documentales
- No se modificó código funcional ni se crearon suites/archivos de prueba. Se actualizaron Auditoria.txt, ChangesLogs.txt, Tareas_Activas.md y PLAN_AUDITORIA_BIBLIOTECA_IMAGENES_SIN_USO.md para registrar evidencia y límites.
- Respaldos exactos de la primera actualización: Auditoria.txt blob 52f7297183939de1a9bd3f24b2be3b5630186069; ChangesLogs.txt a5377e3bf2ad8285eb25720085628489fe706998; Tareas_Activas.md dc33e8cbf2153fbaced7d8173f470227e11b1e04; checkpoint.md dced09f52acae082f29dc851d9d1c3ecbd0e6cb9; PLAN eade510037a3189fc94762c0a58b25c9690ec72f. Ubicación: Olds/Backups/GP-ADMIN-DRIVE-UNUSED-IMAGES-03-20261127/REVIEW-MOCKS-20261127/.
- Respaldos exactos de la segunda actualización: Auditoria.txt 6b2f3a578ea7d17d5cfa809b7e659b85fa7282e7; ChangesLogs.txt df0870bb3671be6292132bc2bd3b60bc4e45f3b8; Tareas_Activas.md c0438b5d33489d6b68d3672f07c5ee83a4c8a0b9; PLAN 6fe1db48e8f09ece1a4fae55b869cb424db18a98. Ubicación: Olds/Backups/GP-ADMIN-DRIVE-UNUSED-IMAGES-03-20261127/REVIEW-MOCKS-20261127-02/.
- Commits de documentación más recientes antes de este checkpoint: Auditoria.txt 4bf515d90b6040c8b9bae067686834cc8872aa8f; ChangesLogs.txt 3611e1a4824ae596a70c6df2ca43d034c3f78cb1; Tareas_Activas.md 29c15e83f684998d50437096feddbdc62d1aa328; PLAN 7edd6e7dda930498eb956015f9d34ae4bb61675c.

### Estado y siguiente paso
- GP-ADMIN-DRIVE-UNUSED-IMAGES-03 sigue ABIERTA. La simulación A/B, el writer y la limpieza por usuario se cubrieron en memoria; queda revisión visual escritorio/móvil y prueba IndexedDB real en navegador.
- La validación remota y cualquier deployment permanecen excluidos mientras Beta esté cerrada y sin autorización expresa. No se hicieron POST ni mutaciones de Drive/Spreadsheet.
- Próximo paso: revisión visual del workspace/pestañas/galería en navegador sin alterar estilos existentes; después revisión final del diff funcional contra respaldos. Si no hay navegador disponible, registrar la limitación y no declarar validación visual.


### Revisión estática final de diff — GP-ADMIN-DRIVE-UNUSED-IMAGES-03 (2026-11-27)
- Comparación GitHub desde auditoría inicial b59bcdd123f10dd4ac82062120dd99fcfe373971 hasta HEAD funcional c08c82236cc9543dc9cb1a990860663ea79bfc01: los cambios funcionales de la tarea están limitados a JS/Services/admin.js (+171/-32), JS/Frontend/ui.js (+45/-6) e index.html (+1). Los demás archivos son registros y respaldos.
- Parches de implementación inspeccionados; respaldos exactos admin.js/ui.js/index.html verificados por SHA contra el baseline. No se identificaron cambios funcionales ajenos al alcance.
- Commits de registro de revisión: Auditoria.txt 195f2186b4d285455f3092a3ecd9e627ec3f6274; ChangesLogs.txt 19d38cfac2e453cae9944d7a242d6572085ed119; Tareas_Activas.md 8fada08623a4c81c9fa83c2de0eab56dd0101ee3; PLAN 3519c8e7e711384aa7f7a266ce905e09cca49dfb.
- Revisión visual escritorio/móvil sigue pendiente por falta de navegador interactivo en este entorno. No se ejecutaron Apps Script, Drive/Spreadsheet real, POST ni deployment; Beta permanece cerrada.
- Siguiente paso: validación visual en navegador sin cambiar el diseño ni las transiciones de pestañas; después cierre de la tarea con los límites de validación claramente registrados.


## Continuidad — GP-ADMIN-DRIVE-UNUSED-IMAGES-03 / reconciliación histórica (2026-11-27)

### Requisito actualizado
- Reiniciar auditoría no elimina filas de Imagenes_Reemplazadas ni archivos de Drive. Antes de limpiar IndexedDB y empezar un auditId nuevo, se reconcilian por páginas los registros de auditoría existentes contra referencias activas del catálogo, incluida LogosMarca.
- Una referencia activa convierte el registro automático a en_uso; sin referencia activa queda pendiente de revalidación hasta que el nuevo recorrido Drive confirme que sigue en el árbol y sin uso. El estado en_uso manual se preserva.
- Se verifica/completa asociación con el modelo por jerarquía de carpetas, nombre y metadatos. La consolidación final corre incluso con cero imágenes nuevas sin uso. El guardado automático por lote se mantiene.

### Implementación
- JS/Services/admin.js: nueva handleReconcileExistingDriveInventory_() y modo reconcile_existing bajo la guarda compartida del inventario; captura de referencias con ubicaciones, asociación de filas existentes, distinción del marcador automático referencia_activa_catalogo y conciliación final de filas activas/obsoletas.
- JS/Frontend/ui.js: preflight paginado en el botón reset antes de clearDriveAuditState; el nuevo recorrido solo comienza tras confirmar el preflight. Consolidación final al completar una auditoría sin errores aunque la lista de candidatos sea vacía.
- LogosMarca ya estaba en la allowlist de la rama y se verificó con harness integrado; no se duplicó la entrada.
- No se modificó CSS, HTML, animaciones ni apariencia de pestañas.

### Evidencia aislada
- LogosMarca URL columna 3 -> referencia activa/En uso: 1/1 PASS.
- Preflight A activo en LogosMarca, B sin referencia, C en_uso manual: 3/3 PASS; asociaciones Toyota/RAV4 completadas; manual preservado.
- URL visual faltante reparada: 1/1 PASS. Repetición del preflight: 0 escrituras adicionales.
- Paginación 3 lotes; fail-closed para referencias no interpretables y hoja Cortes ausente: 5/5 PASS.
- Asociación por directorio sin nombre: 1/1 PASS.
- Consolidación con files=[]: registro activo a en_uso y sin referencia a no_confirmada: 2/2 PASS.
- Parse completo ADMIN/UI PASS; bloques runAudit/reset PASS; invariantes UI/reset/consolidación/guardado automático 11/11 PASS.
- Respaldos exactos funcionales verificados: admin.js blob 715ba0c13d09cbd406668cbb4ba164ff2540a255; ui.js blob 3983abadbb901f483b4cc577b1daf25b7ed3e988. Ubicación: Olds/Backups/GP-ADMIN-DRIVE-UNUSED-IMAGES-03-20261127/REVISION-RECONCILIACION-20261127/.
- Commits funcionales admin.js: a39492fb82db400c82a02f11fd20e286a6c13570, 8adbbbdfd1ff557d8bbb4be1d71acb59cbf48d24, 2689849e3c6e5c779e4f7a87cf4b5f6aad7e0a2b, 2bdfe641d8a46cb2eba1e9c3a8012a3c487a7468, cca57416ba7c089fd07f8d1b85a6639ca7e61bc3, a12a14e9d36c3afa96a22c280a78c279c6573b80, c471f875b8d8706fa2ed4f304555eee016b42c9c, 6ce5a3ebb725ea349eb1028ae38e4d25b7d01f94. UI: 64539fa8614fa2bfc727895f5b935e56797f573b, 8eaa0d2c29de198c7d9e81316a13a3b543418514.

### Límites y siguiente paso
- No se ejecutaron Apps Script, Drive/Sheets reales, POST, navegador, IndexedDB real ni deployment. Beta sigue cerrada.
- Pendiente: prueba visual y flujo de reinicio en navegador; después, Beta autorizada para comprobar filas y asociaciones reales. No cerrar la tarea hasta validar esos escenarios.


### Ajuste final — captura de referencias por modo (2026-11-27)
- En handleSaveUnusedImagesInventory, la captura usa includeLocations=false en lotes incrementales y true en consolidación final. La verificación detallada de ubicaciones se conserva donde se actualizan filas históricas y se evita materializar datos de ubicación innecesarios durante cada guardado incremental.
- Commit admin.js: 72b5ed0dc49b7f947c39fa727bf49ce9cc291692.
- Respaldo exacto previo a este apunte: ChangesLogs.txt blob 60ea3785005c5aa043018fae9528ac78f9e10002; checkpoint.md blob a9c74b98d00bbaf1d287e6131be03d61615e32f5. Respaldos en REVISION-RECONCILIACION-20261127-02/.


### Verificación final y commits posteriores — 2026-11-27
- Se verificó que la asociación histórica se marca sin_coincidencia cuando hay metadatos suficientes sin candidato, y no_verificada cuando faltan datos; en este último caso se conservan candidatos previos.
- La URL visual derivada solo se repara cuando está vacía; las URLs válidas no se sobrescriben.
- Captura de ubicaciones: includeLocations=false durante lotes incrementales y true en consolidación final.
- PASS adicional: lista vacía validada por validateCompletedDriveAudit_ con expectedUnusedCount=0 y digest coincidente (1/1); asociación sin coincidencia/no verificada y URL visual preservada (3/3).
- Commits admin.js más recientes: 72b5ed0dc49b7f947c39fa727bf49ce9cc291692; 44dd569822dd1d384916d2ae8c172b3830f5c9b8; 3e16f1150ae42c5289112db93d47cc24c6f9473f. UI: 8eaa0d2c29de198c7d9e81316a13a3b543418514.
- Respaldos documentales exactos antes de este cierre: ubicados en Olds/Backups/GP-ADMIN-DRIVE-UNUSED-IMAGES-03-20261127/REVISION-RECONCILIACION-20261127-03/.
- Pendiente sin cambio: navegador real, IndexedDB real, Apps Script/Drive/Sheets Beta autorizada, revisión visual escritorio/móvil. No deployment ni POST; Beta sigue cerrada.


### Code Review estático final — 2026-11-27
- Se revisaron los parches de implementación y los commits finales admin.js 72b5ed0dc49b7f947c39fa727bf49ce9cc291692, 44dd569822dd1d384916d2ae8c172b3830f5c9b8 y 3e16f1150ae42c5289112db93d47cc24c6f9473f, además de los cambios UI 64539fa8614fa2bfc727895f5b935e56797f573b y 8eaa0d2c29de198c7d9e81316a13a3b543418514.
- No se identificaron cambios funcionales fuera del alcance. Desde el HEAD previo c08c822, los únicos archivos funcionales modificados son JS/Services/admin.js y JS/Frontend/ui.js; no hay cambios en HTML/CSS.
- Tareas_Activas.md marca Code Review estático como completado. Solo queda la revisión visual y el flujo de navegador/servicios Beta autorizados.


2026-11-27 | GP-ADMIN-DRIVE-AUDIT-REVIEW-04 — Confirmación de registro incremental ya integrado
- Revisión de JS/Frontend/ui.js: cada respuesta de página de auditoría desencadena saveUnusedImagesInventory con incremental:true para sus imágenes clasificadas Sin uso detectado, valida resultados por ID/estado y persiste el estado local antes de continuar.
- JS/Services/admin.js: página y metadatos se guardan en Cache y pageCount se actualiza en estado ADMIN antes de responder; el validador incremental verifica que los IDs hayan sido emitidos como candidatos.
- La consolidación final conserva su propósito de reconciliación histórica; el registro incremental por página no está pendiente de implementación. Se documentó el ajuste de estado y el pendiente real: navegador y Apps Script/Drive/Sheets autorizados.
- No runtime, browser, Drive/Sheets remoto ni deployment en esta revisión.


2026-11-27 | GP-ADMIN-DRIVE-AUDIT-REVIEW-05 — revisión estática rich-text/add_cortes
- rich-text: fallback de retirada extrae fragmento y desenvuelve etiquetas del formato seleccionado en nodos descendientes; preserva otros wrappers. Riesgo de selección mixta/cruzada si execCommand falla, porque active se determina por ancestro del punto inicial; queda validación en navegador.
- add_cortes: finishConfirmedCutTransition_ protege la transición y alerta por opId durante la sesión de página; isSubmittingStage2 y recuperación de operación complementan la guarda. Reintentos y retorno recovery real siguen sin validación de navegador.
- No se aplicó parche funcional ni runtime en este checkpoint.


### GP-ADMIN-ADD-CORTES-ETAPA3-01 — corrección enfocada en avance de etapa (2026-11-27)
- El fallo reportado es que tras WRITE exitoso se mostraba «Corte agregado con éxito», pero el formulario permanecía en Etapa 2 en vez de mostrar Etapa 3 (información suplementaria: alimentación, apertura, nota y video).
- En `HTML/add_cortes.html`, `proceedToStage3()` ahora activa `showPhase(3)` al inicio, antes de actualizar controles y advertencias; los controles y contenedor de advertencias faltantes se manejan con guardas null.
- `finishConfirmedCutTransition_()` intenta completar la transición antes de mostrar el alert y no marca el opId como transicionado si la rutina falla. La alerta de éxito queda posterior al avance, evitando que un fallo de configuración auxiliar deje la Etapa 2 como destino.
- Se conserva el opId y el guardado/idempotencia de WRITE. Se registran errores de transición.
- Revisión estática del bloque: PASS (transición prioritaria y referencias opcionales protegidas). Prueba real de navegador/formulario pendiente; no se ejecutó Apps Script ni deployment.


### GP-ADMIN-DRIVE-REGISTRO-ERROR-01 — diagnóstico del registro incremental (2026-11-27)
- En el frontend, el catch de registro incremental ahora emite `console.error` con contexto estructurado: subsistema/acción/etapa, auditId, lote/offset, IDs, nombre/mensaje/código y stack del error.
- El diagnóstico también se agrega al registro técnico de auditoría para que el fallo de lote no se reduzca a la alerta amarilla genérica.
- Commit `261b7c4`. Revisión estática; aún falta reproducir el error real en navegador conectado a Apps Script/Drive/Sheets para determinar la causa raíz.


## Continuidad — GP-ADMIN-DRIVE-REGISTRO-ERROR-02 (2026-11-27)

- Repositorio: infogpstech/GPSpedia. Rama autorizada: GPSpedia2.2.5_work. Rama base protegida GPSpedia2.2.5 sin cambios.
- Incidencia: ADMIN.saveUnusedImagesInventory fallaba en escritura/lectura de confirmación de Imagenes_Reemplazadas con IMAGE_INVENTORY_WRITE_FAILED y discrepancia genérica.
- Hallazgo: writeDriveInventoryRowVerified_ comparaba fecha_modificacion_drive como texto aunque Sheets puede devolver un Date. La coerción real sigue sin comprobarse en la hoja remota.
- Cambio: normalización específica Date→yyyy-MM-dd HH:mm:ss en GMT-6 y diagnóstico por nombre de columna; todas las verificaciones restantes y el bloqueo ante discrepancias se conservan.
- Backup exacto admin.js: Olds/Backups/GP-ADMIN-DRIVE-REGISTRO-ERROR-02-20261127/admin.js.backup, SHA 163e167b6544a59966c40b3b825e6e5a3ffb72b5.
- Commit auditoría: f097dd2fe635f7a8c543d929ed8b4f41fe14099f. Commit backup: bf8effa07c3e620bfa75e8757986b77f44c102f8. Commit código: 6d6adf87b8b620c6ba03e520ec46a4b7ab750ec1.
- Pruebas efímeras en memoria: Date equivalente aceptada; Date no equivalente rechazada y diagnosticada; tamano_bytes no equivalente rechazada y diagnosticada (3/3 PASS). Parse completo admin.js PASS (15,539 líneas). Diff exacto contra backup: prefijo/sufijo idénticos, único bloque editado writeDriveInventoryRowVerified_.
- No se ejecutó Apps Script, Google Drive/Sheets real, navegador, POST ni deployment. Beta permanece cerrada. No se crearon suites ni archivos de prueba.
- Siguiente paso: reproducción remota autorizada para confirmar el tipo devuelto por fecha_modificacion_drive y verificar el registro real. Code Review y limpieza del backup ya completados. No organizar imágenes que no tengan confirmación de inventario.


### Code Review y limpieza — GP-ADMIN-DRIVE-REGISTRO-ERROR-02
- Code Review estático PASS: delta funcional exclusivo de writeDriveInventoryRowVerified_ en JS/Services/admin.js; no hay cambios fuera de alcance.
- Verificada la rama base GPSpedia2.2.5 en SHA d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Backup exacto admin.js (blob SHA 163e167b6544a59966c40b3b825e6e5a3ffb72b5) eliminado después de la revisión, conforme a normativa.
- Commit de limpieza: 9dcd0a3cf458a72309e7e574ff4fc1b169aa1eca.
- Pendiente real: ejecución autorizada en Apps Script/Google Sheets para observar la lectura y confirmar registro. No hubo POST, Drive/Sheets remoto ni deployment.


## Continuidad — GP-CUT-TESTIGO-NOTA-01 (2026-11-27)

### Estado Git y alcance
- Repositorio: infogpstech/GPSpedia. Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5, sin modificaciones; SHA comprobado d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- HEAD antes de la tarea: 87da4ae4fa359b60940d2929cfe823162d7aafc8. Commits de respaldo: e8fb812, cabad91, 6a459f9, e19ad51, 1236582 y 0368b66. Registro de auditoría: edaf8cbb58a57ef8ee2030b7015df53961c419ee. Cambios funcionales: 31a852e (HTML/add_cortes.html) y 912a4f7 (JS/Frontend/ui.js).
- `contexto_personal.md` no existe en la rama (404); no se creó un sustituto. README, NORMAS_DESAROLLO, checkpoint, Tareas_Activas, Tareas_Beta y Auditoria.txt fueron consultados. Beta continúa cerrada.

### GP-CUT-TESTIGO-NOTA-01 — implementación
- En `HTML/add_cortes.html`, `handleStage2Submit()`, se retiró la inserción del HTML de testigo en los textareas. El checkbox `testigoMotor` permanece y `cutData.activaTestigo1` sigue siendo booleano para fingerprint, snapshot, recuperación y WRITE.
- En `JS/Frontend/ui.js`, `renderCutContent()`, se reemplazó el aviso genérico por el bloque DOM equivalente al fragmento solicitado: imagen Drive con URL/estilo exactos, «NOTA:» rojo y texto «Este corte activa el testigo del motor». Se inserta únicamente con `cutData.activaTestigo` verdadero, tras el color y antes de la imagen del corte.
- Respaldos exactos: `Olds/Backups/GP-CUT-TESTIGO-NOTA-01-20261127/` para HTML/add_cortes.html, JS/Frontend/ui.js, Auditoria.txt, ChangesLogs.txt, Tareas_Activas.md y checkpoint.md.

### Verificación y límites
- Comparación byte a byte contra respaldos: PASS para ambos archivos funcionales; solo se aplicaron los dos reemplazos auditados.
- Comprobaciones estáticas: ausencia de inyección HTML en textarea; conservación de checkbox/payload/fingerprint; conservación del booleano en modal +, operación pendiente y recuperación; condición de renderizado, URL, estilos, texto y orden DOM verificados (11/11 PASS).
- Code Review estático PASS. No se modificaron CSS, contratos de servicios, persistencia, imagen del corte ni rama base.
- No se ejecutó navegador, Apps Script, Google Sheets/Drive, POST ni deployment. Pendiente validación visual autorizada de ambos formularios, carga real de miniatura y estado marcado/desmarcado. No reabrir Beta ni crear suites.
- Siguiente paso: validar visualmente en navegador los flujos de alta de `HTML/add_cortes.html` y del botón + del modal de detalle; si no hay entorno/autorización, mantenerlo explícitamente como pendiente.


## Continuidad — GP-USERS-SESSION-CONTEXT-01 (2026-11-27)

- Repositorio: infogpstech/GPSpedia. Rama: GPSpedia2.2.5_work. HEAD inicial de esta tarea: 9da89e08559ddc38b7a0306fa01a0ea6f71ac75f. Rama base protegida GPSpedia2.2.5 sin cambios.
- Incidencia: HTML/users.html no carga la lista; getUsers responde «La sesión requiere userId y sessionToken».
- Causa localizada: fetchUsers() construía sessionSnapshot.id y token, pero enviaba solo sessionToken. postToAction/routeAction no agregan automáticamente userId; getUsers se enruta a AUTH.
- Cambio aplicado: el payload de getUsers ahora contiene userId: sessionSnapshot.id y sessionToken: sessionSnapshot.token. No se tocaron acciones de edición, creación, eliminación, restablecimiento, perfil, roles, caché ni UI.
- Auditoría F-50 registrada antes del cambio. Backups exactos creados para HTML/users.html, Auditoria.txt, ChangesLogs.txt, Tareas_Activas.md y checkpoint.md en Olds/Backups/GP-USERS-SESSION-CONTEXT-01-20261127/.
- Pruebas locales: parse del módulo inline PASS; harness aislado ejecutó fetchUsers y comprobó action=getUsers con userId y sessionToken del mismo snapshot. Comparación exacta contra backup y Code Review pendientes de cierre.
- No se ejecutó navegador ni AUTH remoto. Beta permanece cerrada. context_personal.md no existe en la rama; Tareas.txt tampoco, se usa Tareas_Activas.md como registro operativo existente.
- Siguiente paso: completar diff/Code Review, eliminar backups tras revisión y dejar pendiente la prueba integrada con usuario Desarrollador en navegador conectado.


### Code Review y limpieza — GP-USERS-SESSION-CONTEXT-01
- Code Review estático PASS; diff exacto contra respaldo: única modificación es el payload de getUsers en HTML/users.html.
- Módulo inline parseado sin errores; harness aislado confirmó userId y sessionToken tomados del mismo snapshot.
- Commit de código: a3fbb3943e09adc5df07a192484cf76acd990663. Commits de limpieza de backups: 9eedfdd, 159e01e, 00ed9b2, f701659, c7c7422.
- Respaldos exactos eliminados tras Code Review. Rama base GPSpedia2.2.5 sin cambios (SHA d9acc68d889985c2e2f42fe3a02e502efc86ead1).
- Siguiente paso: probar en navegador conectado con sesión Desarrollador y respuesta real AUTH. Revisar contratos de acciones mutables de gestión por separado antes de cambiar sus payloads. Beta permanece cerrada.

## Continuidad — GP-CUT-TESTIGO-NOTA-02 (2026-11-27)
- Incidencia: no se veían ni la imagen del testigo ni la nota después de registrar el corte.
- Causa confirmada: el flujo openAddCutForModelModal() guarda el booleano; WRITE lo persiste; CATALOG lo proyecta y UI lo recupera. Después del guardado, completeVehicleExpansionSave_() llama refreshVehicleDetailAfterExpansion_(), cuyo renderizador predeterminado ejecuta mostrarDetalleModal(vehicle, true). Esto activa inEditMode. renderCutContent() condicionaba el bloque a activaTestigo && !inEditMode, ocultando imagen y nota juntas.
- Corrección aplicada: en JS/Frontend/ui.js, renderCutContent(), condición ahora cutData.activaTestigo === true. El bloque DOM existente, con URL, estilos y texto exactos, se muestra también en modo edición. No se modificó la posición ni otros elementos.
- Commit funcional: fd4d0f0b48b8a96471dada4eaa7d063d38a43576. SHA de ui.js: f32a08a40039bafae8be45cab6df792b11b3c307. Auditoría F-51 registrada antes del cambio.
- Verificación: diff exacto contra respaldo confirma solo una línea modificada; 12 comprobaciones estáticas PASS y tabla de condición 4/4 PASS; Code Review estático PASS. Se verificó que checkbox, WRITE, CATALOG y reordenamiento conservan el indicador.
- No se ejecutó navegador, Apps Script, Google Sheets ni acceso real a Drive; no se puede afirmar todavía que el recurso externo se haya cargado en una sesión publicada. service-worker.js permanece sin cambios (cache v91, scripts same-origin network-first).
- Siguiente paso: actualizar la aplicación y probar ambos flujos en navegador, marcando/desmarcando el checkbox. Si la nota aparece pero la imagen no carga, investigar por separado el acceso público/validez del archivo Drive sin cambiar la URL exacta solicitada sin autorización.

## Continuidad — GP-USERS-CREATE-SESSION-CONTEXT-01 (2026-11-27)

- Rama de trabajo: GPSpedia2.2.5_work. Rama base protegida GPSpedia2.2.5 sin modificar.
- Hallazgo: handleUserFormSubmit() enviaba createUser con newUser y sessionToken, omitiendo userId requerido por el middleware AUTH para recuperar el actor autenticado.
- Corrección en `HTML/users.html`: se agregó userId: submittingSession.userId al payload createUser; newUser y sessionToken permanecen intactos.
- Commit funcional: 02537a06538851b4f011c9b764775cf750a8f880.
- Code Review: PASS; diff único en payload createUser. Parsing inline PASS; verificaciones estáticas de snapshot PASS.
- Backups exactos creados en Olds/Backups/GP-USERS-CREATE-SESSION-CONTEXT-01-20261127/ para HTML/users.html y registros; se eliminarán tras esta revisión.
- No se ejecutó navegador, POST AUTH real ni deployment. Validación integrada pendiente. Si updateUser sigue fallando, inspeccionar el error/action específico sin alterar aún su contrato.
