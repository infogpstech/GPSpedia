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
