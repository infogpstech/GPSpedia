# Checkpoint activo — GPSpedia

Normativa única: [NORMAS_DESAROLLO.md](NORMAS_DESAROLLO.md). Leerla antes de modificar el proyecto o registrar cambios. Este archivo es únicamente un registro de continuidad y no define procedimientos adicionales.

El historial previo de `checkpoint.md` se conserva íntegro en:
`Olds/Documentacion_Legacy/checkpoint_legacy_parte_005.md`

- Blob fuente rotado: `1d1a10d689a992c4671a5865e32bf607ee93c7f7`
- Caracteres Unicode: 178396.
- Manifiesto: `Olds/Documentacion_Legacy/README.md`, sección de rotación incremental checkpoint.md 2026-11-09.
- Integridad: copia exacta; no se modificó el contenido histórico.

================================================================================
CHECKPOINT INICIAL — CORR-AUTH-ROLE-REVOCATION-GUARDS-001 — 2026-11-09
Repositorio: infogpstech/GPSpedia.
Rama autorizada: GPSpedia2.2.5_work.
HEAD confirmado: b201198410ead781281badaee02cff9804b0cbad.
Rama base: GPSpedia2.2.5. HEAD confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Tarea anterior: CORR-FEEDBACK-ROLE-REVOCATION-001, commit b201198410ead781281badaee02cff9804b0cbad verificado. Ciclo A post-commit completado parcialmente; H-AUD-042-003 registrado como nuevo bloqueo.
Nueva tarea: CORR-AUTH-ROLE-REVOCATION-GUARDS-001. Objetivo: bloquear los handlers privilegiados internos de AUTH cuando el solicitante tenga una revocación de rol pendiente.
Alcance inicial: Services/Auth.js y Services/Test/Auth.js; cuatro handlers: handleClearSensitiveLogs, handleResetUserSessions, handleDeleteUser y handleResetUserPassword. Registros append-only y pruebas aisladas.
Hallazgo: los cuatro handlers verifican token, identidad, expiración, perfil y rol, pero omiten hasPendingRoleRevocation_() del solicitante. Un token residual puede conservar el rol anterior mientras la revocación sigue pendiente. Evidencia y criterios completos en Auditoría.txt, H-AUD-042-003.
Respaldos exactos previos a editar:
- Services/Auth.js: c1c3eb58c460709eb59875cb6dd6f319dd180e91.
- Services/Test/Auth.js: 6ea98ed48c0cdaf48dd6dae00d3d5979e494e597.
- Auditoría.txt: 618582ff774c850628cb2a56b78a9174ca8cfe99.
- Tareas.txt: 07b5ece9e6733f24e6d57840727e6c562312f2b2.
- ChangesLogs.txt: b58b687886288ccbba048276d6c6612b50233154.
- checkpoint.md previo a rotación: 1d1a10d689a992c4671a5865e32bf607ee93c7f7.
- Olds/Documentacion_Legacy/README.md: 1d0f67c8b8a9d1bdb7532970f129736596ba9953.
Estado: solo auditoría y registro; no se ha modificado código funcional. No se han ejecutado handlers reales, Apps Script, endpoints, deployments ni datos productivos.
Siguiente paso: auditar los cuatro handlers, rutas, permisos y efectos colaterales; confirmar respaldos; implementar únicamente el rechazo del solicitante pendiente y pruebas; cerrar con un único commit. No reanudar AUG-042 antes de cerrar y auditar esta corrección.
================================================================================

================================================================================
CHECKPOINT FINAL — CORR-AUTH-ROLE-REVOCATION-GUARDS-001 — 2026-11-09
Repositorio: infogpstech/GPSpedia.
Rama autorizada: GPSpedia2.2.5_work.
HEAD padre antes de la tarea: 898ff2f2085f891e3de4a62dea5d3674637c0c6d.
Rama base: GPSpedia2.2.5. HEAD confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Tarea: CORR-AUTH-ROLE-REVOCATION-GUARDS-001, origen H-AUD-042-003, registrada en el commit documental 898ff2f2085f891e3de4a62dea5d3674637c0c6d.
Respaldos exactos previos a editar:
- Services/Auth.js: c1c3eb58c460709eb59875cb6dd6f319dd180e91.
- Services/Test/Auth.js: 6ea98ed48c0cdaf48dd6dae00d3d5979e494e597.
- Auditoría.txt: bc866082e3ba266acc5997bb6dabdae48b7ca2aa.
- Tareas.txt: 0ca89812d4929d34986d3a10407b104440429293.
- ChangesLogs.txt: 96e7f7ae0f45a49f593de9aab17aaed85cfcfbb2.
- checkpoint.md: eb9d0984a1a3d175e0d1337f10b459d12a2e6e50.
Cambios:
1. Se añadió assertRequesterRoleRevocationClear_(), que consulta hasPendingRoleRevocation_() para el solicitante y, si existe marcador, intenta reconcileRoleRevocationUnderLock_() bajo el lock ya adquirido por el handler.
2. La solicitud actual siempre se rechaza si había marcador: si la reconciliación sigue pendiente, el bloqueo permanece; si termina, el token solicitante ya fue revocado y debe autenticarse nuevamente.
3. El guard se invoca antes de cualquier mutación privilegiada en handleClearSensitiveLogs, handleResetUserSessions, handleDeleteUser y handleResetUserPassword.
4. Services/Test/Auth.js refleja el cambio y conserva el Spreadsheet aislado.
Verificaciones:
- Sintaxis/parsing de Auth.js y Test/Auth.js: 2/2 PASS.
- Paridad exacta de Auth/Test Auth salvo ID de Spreadsheet: PASS.
- Los cuatro handlers con solicitante pendiente rechazan antes de mutación: 4/4 PASS.
- Helper: solicitante sin marcador continúa; marcador pendiente bloquea; reconciliación completada también obliga a reautenticación: 3/3 PASS.
- Las cuatro acciones permanecen conectadas al router: 4/4 PASS.
- Code Review/Safety & Side Effects: PASS; no se alteraron roles, matriz de permisos, payloads, endpoints, destino, logout ni flujo de expiración.
No ejecutado: Apps Script real, Spreadsheet/Drive, HTTP/endpoints, deployments, navegador, concurrencia física ni datos productivos. No se afirma validación Beta.
Estado del checkpoint: implementación y pruebas aisladas completas; checkpoint final listo para el commit único. El SHA del commit resultante se verifica en el historial de GPSpedia2.2.5_work.
Siguiente paso: verificar el commit y ejecutar Ciclo A post-commit. Si no aparecen hallazgos nuevos, reanudar AUG-042 Ciclo B.
================================================================================

================================================================================
CHECKPOINT INICIAL — AUG-042 / CICLO B — 2026-11-09
Repositorio: infogpstech/GPSpedia.
Rama autorizada: GPSpedia2.2.5_work.
HEAD confirmado: c29dbd553abbdfa31b614e3ab55a1d34340caebf.
Rama base: GPSpedia2.2.5. HEAD confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Auditoría de corrección previa: CORR-AUTH-ROLE-REVOCATION-GUARDS-001, commit c29dbd553abbdfa31b614e3ab55a1d34340caebf verificado; Ciclo A post-commit PASS sin hallazgos nuevos. H-AUD-042-003 cerrado. También están cerradas/auditadas las correcciones de FEEDBACK SESSION (400f553...) y marcador compartido (b201198...).
Tarea reanudada: AUG-042 — Sincronizar el rol y limpiar el estado privilegiado en el cliente.
Origen: H-AUD-034-001 a H-AUD-034-004; prioridad Alta. Criterios:
1. Limpiar currentUser/SessionToken en memoria y cerrar/resetear dev-tools-modal, replaced-images-modal, inbox-modal y dashboard-modal ante logout, invalidación o cambio de cuenta; vaciar listas, consola, detalles y caches sensibles.
2. Integrar con AUG-006 para revocar la sesión invocante en ActiveSessions. window.state/window.ui no deben reutilizar el token anterior tras cierre local.
3. Actualizar rol desde servidor o invalidar sesiones al cambiar Privilegios; comportamiento aprobado: todo cambio de Privilegios revoca todas las sesiones del usuario afectado y exige nuevo login, incluido auto-cambio; otras sesiones/dispositivos deben ser rechazados al validar.
4. Guardas frontend para abrir panel, historial, Inbox y Dashboard según rol vigente, manteniendo backend como autoridad.
5. Unificar campo de rol AUTH/UI/renderInboxDetail. Matriz approve/reject: Desarrollador, Gefe y Supervisor permitidos; Jefe no permitido. Jefe puede Inbox; Dashboard/getActivityLogs fuera de Jefe.
6. Matriz: logout con modal abierto; Developer→Técnico y Supervisor→Jefe en misma instancia; ascenso de rol; sesión remota revocada; login consecutivo de dos cuentas; llamada directa a funciones globales; Jefe/Inbox.
Dependencias: AUG-006, AUG-016, AUG-017 completadas en fuentes; Beta pendiente. AUD-T-024 y AUD-T-034.
Respaldos exactos previos a auditar/modificar:
- auth.js: 49b2c5e4c3aa44d034d6ed5f43391f5661fa248f.
- ui.js: 84580f0dd47ae5db01b33c02742aae70e56ff52a.
- main.js: c15f5462d78fa907d14c71e15970ae29a3b3de77.
- index.html: 6dd0b86981e7f92b10b2f7a0a1634bb6395a479a.
- api-config.js: db150e80ba2fec87acbc4baad9014dd30816caf9.
- Services/Auth.js: 70d2334f115a5b8eeb1e42a7ec28e0d67153ce21.
- Services/Test/Auth.js: 1fb7b72689667e7fba32ac518b20bba6a7b26c63.
- Services/feedback.js: 51cc6147c580e9a72648c559982349ce8244dc12.
- Tareas_pendientes_parte1.txt: 0a35fc4f281c035e981b059bc55409b52cdc4e39.
- Tareas.txt: e54d503273e93235c6edd0638e984d494a5f6950.
- Auditoría.txt: 25d761c5f78b9f5a01ab61f6a292e42b754b803d.
- ChangesLogs.txt: 3415ea6bcf7c26197ea8b27efc2e997a41c45f3e.
- checkpoint.md: 0ea880525c52d766af0dfa4bb72a7a8e321fe078.
Estado inicial: solamente se ha confirmado el contexto y registrado el checkpoint. No se ha modificado código funcional. Siguiente acción: auditoría de frontend y contratos backend, archivo por archivo, línea por línea y función por función; registrar hallazgos antes de implementar.
================================================================================

================================================================================
ADENDA DE ALCANCE — AUG-042 / CICLO B — 2026-11-09
La auditoría inicial registró H-AUD-042-004 a H-AUD-042-009. Se incorpora users.html al alcance funcional para resolver el fallo de validación de red durante el cambio de rol propio.
Respaldo exacto adicional previo a editar:
- users.html: 45d4b8727b10112edfb560710af06534b93a28f8.
El alcance funcional queda: auth.js, ui.js, main.js y users.html. Se preservan state.js, index.html, api-config.js, Services/Auth.js y Services/feedback.js sin cambios salvo que una nueva evidencia justifique ampliar alcance y se registre antes de editar.
No se ha modificado código funcional; implementación aún pendiente.
================================================================================

================================================================================
ADENDA DE ALCANCE — PERSISTENCIA LOCAL — AUG-042 — 2026-11-09
Hallazgo adicional: H-AUD-042-010. offline.js persiste DriveAuditState en IndexedDB con clave global, sin propietario; puede filtrarse entre cuentas en el mismo navegador.
Archivo funcional adicional: offline.js.
Respaldo exacto previo a editar: c68e8698c74ef45a1c9bb534c6b2be77df817c34.
Criterio: DriveAuditState se guarda/lee por userId; se elimina la clave global heredada no aislada; el estado de la cuenta anterior se borra al logout/cambio de cuenta/rol, conservándose en una recarga normal de la misma cuenta.
No se ha modificado offline.js; implementación pendiente.
================================================================================


================================================================================
CHECKPOINT DE AVANCE — AUG-042 / CICLO B — 2026-11-10 05:10 (HONDURAS)
Rama: GPSpedia2.2.5_work
HEAD confirmado al iniciar checkpoint: c9154bdc37cf37e89551b2347ea628a7d682c92c.
Commit padre: c9154bdc37cf37e89551b2347ea628a7d682c92c.
Tarea activa: AUG-042 — sincronización del rol y limpieza del estado privilegiado en el cliente.

Auditoría:
- Se mantiene H-AUD-042-004 a H-AUD-042-009 abierto, conforme a los criterios previamente registrados.
- Se incorporó H-AUD-042-010: DriveAuditState usa una clave IndexedDB global sin ownerId, permitiendo recuperar datos entre cuentas del mismo navegador.
- Se amplió formalmente el alcance a offline.js. Respaldo exacto: c68e8698c74ef45a1c9bb534c6b2be77df817c34.

Avance de implementación preparado, aún no integrado en la rama:
- ui.js: borrador de guardas de sesión/rol en aperturas privilegiadas, captura y restauración de plantillas de modales, invalidación de generaciones de solicitudes y protección de respuestas asíncronas. Blob preparado: e86ce5d6c3218aa05002b0d94a87f9a425bb9a48. Verificación realizada hasta ahora: parsing/sintaxis aislada PASS; revisión funcional, pruebas y Code Review pendientes.
- offline.js: se preparó una propuesta de persistencia por userId y eliminación de la clave global heredada; aún no se incorpora ni se considera validada.
- main.js: se inició el diseño de revalidación al recuperar foco/visibilidad y conexión; no se incorpora ni se considera validado.
- auth.js y users.html: sin cambios funcionales integrados en esta etapa.

Decisión de checkpoint:
No se publican cambios funcionales incompletos. Este commit registra el estado verificable y conserva el punto de reanudación. No se declara AUG-042 completada ni se cierran hallazgos.
Pendiente al reanudar:
1. Recuperar y revisar el borrador ui.js contra el respaldo exacto y completar los guards de todas las funciones privilegiadas.
2. Implementar offline.js con ownerId y limpieza segura al cambiar de cuenta/rol/logout; cubrir fallos IndexedDB y carreras.
3. Completar main.js sin crear temporizadores duplicados ni revalidaciones simultáneas.
4. Resolver H-AUD-042-007 en todos los consumidores de rol y completar H-AUD-042-008/009 en users.html/auth.js según evidencia y alcance.
5. Ejecutar pruebas aisladas de matriz de roles, cambio de cuenta, logout, respuestas tardías, revalidación y persistencia; sintaxis, comparación con respaldos y Code Review/Safety & Side Effects.
6. Actualizar documentación y checkpoint final antes del único commit funcional de AUG-042.

No ejecutado: pruebas reales de navegador, Apps Script, Sheets/Drive, endpoints, despliegues, concurrencia física ni datos productivos.
No se modificó la rama base. No se modificaron sus referencias.
================================================================================
================================================================================
CHECKPOINT INICIAL — AUG-042 — 2026-11-10
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work.
HEAD inicial: 784b8fb2de99b996dbf73e7befea3cec03f98142.
Rama base: GPSpedia2.2.5.
HEAD de base: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Última tarea anterior: CORR-AUTH-ROLE-REVOCATION-GUARDS-001, commit c29dbd553abbdfa31b614e3ab55a1d34340caebf; revisión post-commit sin bloqueo registrado.
Tarea activa: AUG-042 — Sincronizar el rol y limpiar el estado privilegiado en el cliente.
Estado inicial: implementación parcial preparada en un blob temporal de ui.js; H-AUD-042-004 a H-AUD-042-010 abiertos. No se modificó la rama base.
Alcance: ui.js, offline.js, auth.js, main.js y users.html, con registros append-only. No se modifican Services/Auth.js ni Services/feedback.js.
Restricciones: un único commit para AUG-042; Git Database API; force=false y expected_sha del HEAD inicial; sin merge ni publicación en la rama base.
================================================================================

================================================================================
CHECKPOINT FINAL — AUG-042 — 2026-11-10
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work.
HEAD previo a la tarea: 784b8fb2de99b996dbf73e7befea3cec03f98142.
Rama base: GPSpedia2.2.5.
HEAD de base verificado: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Tarea: AUG-042 — COMPLETADA EN VALIDACIÓN LOCAL.
Última tarea anterior: CORR-AUTH-ROLE-REVOCATION-GUARDS-001, commit c29dbd553abbdfa31b614e3ab55a1d34340caebf.
Archivos funcionales: ui.js, offline.js, auth.js, main.js y users.html.
Registros incluidos en el commit: Auditoría.txt, ChangesLogs.txt, Tareas.txt, Tareas_pendientes_parte1.txt, tareas_completadas_parte1.txt y checkpoint.md.
Hallazgos cerrados localmente: H-AUD-042-004 a H-AUD-042-010.
Validación: sintaxis 5/5 PASS; matriz de roles PASS; guardas de sesión/rol PASS; AUTH 6/6 PASS con dobles; logout obsoleto PASS; aislamiento/limpieza Drive simulados PASS; revalidación single-flight PASS; generaciones Inbox/Admin PASS; Code Review y Safety & Side Effects PASS.
Limitaciones: no se ejecutaron navegador real/Playwright, IndexedDB real, endpoints, Apps Script, deployments, Drive/Spreadsheet productivos ni pruebas multi-dispositivo. Se registran como VALIDACIÓN DIFERIDA A BETA.
Riesgos abiertos de AUG-042: ninguno identificado en la revisión local final. Las validaciones integradas de Beta permanecen pendientes.
Commit de cierre: commit único de AUG-042, identificable en el historial de GPSpedia2.2.5_work por el mensaje "fix(auth): synchronize client role and privileged session state"; padre esperado 784b8fb2de99b996dbf73e7befea3cec03f98142.
Rama base: sin cambios; no se realizó merge.
Siguiente tarea: AUG-043 — Alinear contratos de acciones protegidas y ciclo de aprobación de YouTube.
================================================================================

================================================================================
CHECKPOINT INICIAL — CORR-AUG042-001 — 2026-11-10
Repositorio: infogpstech/GPSpedia.
Rama de trabajo autorizada: GPSpedia2.2.5_work.
HEAD confirmado al inicio: ef7bdc926ade691e22fa397a3b68267435d191cf.
Rama base: GPSpedia2.2.5.
HEAD confirmado de la base: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Última tarea: AUG-042 — COMPLETADA EN VALIDACIÓN LOCAL; commit ef7bdc926ade691e22fa397a3b68267435d191cf.
Tarea correctiva: CORR-AUG042-001 — Bloquear la continuación de operaciones administrativas tras un cambio de sesión.
Origen: H-AUD-042-011, detectado en la auditoría post-commit de AUG-042.
Estado inicial: hallazgo identificado; corrección aún no integrada; no se han modificado archivos ni referencias.
Alcance funcional: ui.js, exclusivamente initAdminPanelListeners()/btn-admin-clear-selected-logs y openAuditDriveModal()/saveUnusedInventory.
Archivos documentales: Auditoría.txt, ChangesLogs.txt, Tareas.txt, Tareas_pendientes_parte1.txt, tareas_completadas_parte1.txt y checkpoint.md.
Riesgo: los catch de persistencia y de limpieza de registros pueden continuar operaciones privilegiadas después de invalidarse la sesión de origen. Las llamadas posteriores obtienen credenciales desde el estado actual y podrían ejecutarse bajo otra cuenta; también puede mostrarse una notificación obsoleta.
Respaldo exacto previo a editar:
- ui.js: blob c6d89feaa2c9cff8706b63c4655a9973238f8e59.
Dependencias: ninguna modificación backend; se preservan contratos y autorización server-side.
Fase: checkpoint inicial; auditoría pre-implementación y verificación del alcance de la corrección.
Siguiente acción: reexaminar los bloques afectados, registrar el hallazgo antes de corregir, implementar guardas de contexto y ejecutar parsing, pruebas aisladas, comparación y Code Review.
================================================================================

================================================================================
CHECKPOINT FINAL — CORR-AUG042-001 — 2026-11-10
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work.
HEAD previo a la tarea: ef7bdc926ade691e22fa397a3b68267435d191cf.
Rama base: GPSpedia2.2.5; HEAD confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Tarea: CORR-AUG042-001 — COMPLETADA EN VALIDACIÓN LOCAL.
Origen: H-AUD-042-011, derivado de la auditoría post-commit de AUG-042.
Archivo funcional modificado: ui.js.
Respaldos exactos:
- ui.js previo: c6d89feaa2c9cff8706b63c4655a9973238f8e59.
Cambios:
1. saveUnusedInventory retorna cuando el catch de persistencia detecta que isCurrentRequest() ya no es vigente; no continúa hacia saveUnusedImagesInventory.
2. clearSelectedLogs retorna desde cada catch cuando isAdminPanelCurrent_() es falso.
3. clearSelectedLogs comprueba nuevamente la vigencia antes de actualizar el resumen y emitir la notificación global.
Verificaciones:
- Parsing V8 del archivo completo después de retirar declaraciones ES module para análisis parse-only: PASS. Runtime/herramienta: V8 de Code Mode; versión exacta no expuesta.
- Cuatro reemplazos exactos: 4/4 encontrados una sola vez.
- Pruebas aisladas con dobles: sesión obsoleta aborta la segunda mutación, suprime notificación y detiene saveUnusedImagesInventory; sesión vigente conserva la secuencia normal.
- Comparación post-edición contra el blob de respaldo: únicamente cuatro guardas añadidas en ui.js.
- Code Review y Safety & Side Effects: PASS; no se alteraron contratos, roles, endpoints ni backend.
Limitaciones: no se ejecutaron navegador real/Playwright, Apps Script, endpoints, deployments, Drive/Spreadsheet productivos ni datos productivos.
Archivos documentales incluidos: Auditoría.txt, ChangesLogs.txt, Tareas.txt, Tareas_pendientes_parte1.txt, tareas_completadas_parte1.txt y checkpoint.md.
Estado final: COMPLETADA EN VALIDACIÓN LOCAL; no quedan validaciones locales obligatorias pendientes.
Último commit antes de la tarea: ef7bdc926ade691e22fa397a3b68267435d191cf.
Commit que incorpora este checkpoint: único commit de CORR-AUG042-001, mensaje "fix(auth): abort stale admin operations on session change", SHA verificable en el historial de GPSpedia2.2.5_work.
Rama base: sin cambios; no se realizó merge.
Siguiente tarea: AUG-043 — Alinear contratos de acciones protegidas y ciclo de aprobación de YouTube. No iniciada.
================================================================================

================================================================================
CHECKPOINT INICIAL — DOC-TRACE-042-001 — 2026-11-10
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work.
HEAD inicial: 03a3c20cf4b418149b4b6e7b90a5cb26e8fc0412.
Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Tarea: DOC-TRACE-042-001 — Corregir referencia de línea en ChangesLogs de CORR-AUG042-001.
Origen: revisión de trazabilidad posterior al commit CORR-AUG042-001.
Hallazgo documental: ChangesLogs.txt registró ui.js:5032 para el catch de persistState/saveUnusedInventory; la ubicación real verificada en el archivo publicado es ui.js:5561. Se conserva el registro original append-only y se agregará una adenda correctiva.
Alcance: únicamente documentación de trazabilidad; no se modifica código.
Respaldo exacto: ChangesLogs.txt blob 6cb0ec3fbf629bc2fd0b943fe3532ad99d5eb0ba.
Estado inicial: sin modificaciones ni referencias actualizadas.
Siguiente acción: añadir adenda correctiva, registrar la tarea y generar un único commit documental.
================================================================================

================================================================================
CHECKPOINT FINAL — DOC-TRACE-042-001 — 2026-11-10
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work.
HEAD inicial: 03a3c20cf4b418149b4b6e7b90a5cb26e8fc0412.
Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1; sin cambios.
Tarea: DOC-TRACE-042-001 — COMPLETADA EN VALIDACIÓN DOCUMENTAL.
Cambios: adenda append-only en ChangesLogs.txt que corrige ui.js:5032 a ui.js:5561; adenda en Auditoría.txt; registros de tarea y checkpoint.
Respaldo: ChangesLogs.txt previo 6cb0ec3fbf629bc2fd0b943fe3532ad99d5eb0ba.
Verificación: ui.js publicado confirma saveUnusedInventory en línea 5561 y clearSelectedLogs en 4841, 4858 y 4864. No se modificó código ni comportamiento.
Commit único: mensaje "docs: correct CORR-AUG042 source line reference"; SHA verificable en historial.
Siguiente tarea: AUG-043, no iniciada.
================================================================================


================================================================================
CHECKPOINT FINAL — AUG-155 — 2026-11-10
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work.
HEAD inicial confirmado: f48be93725392623d98d53cb20c51164b5102077.
Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1; no modificada.
Tarea: AUG-155 — COMPLETADA EN VALIDACIÓN LOCAL.
Archivos funcionales: Services/Coordinator.js (nuevo), Services/SharedMutationClient.js (nuevo), Services/Auth.js, Services/Test/Auth.js, Services/users.js, Services/Test/users.js, Services/write.js, Services/admin.js y Services/feedback.js.
Documentación/pruebas: Services/COORDINATOR_SETUP.md, Services/Test/SharedMutationCoordinator.js, Services/Test/README.md, Auditoría.txt, ChangesLogs.txt, Tareas.txt, Tareas_pendientes_parte1.txt, Tareas_pendientes_parte4.txt, tareas_completadas_parte1.txt, lista_beta.txt y Plan_auditoría/Aug_Tareas.md.
Cambios: leases interproyectos con secretos por servicio, deny-by-default, recursos de lectura/escritura, mantenimiento exclusivo, expiración de 45 minutos, liberación/recuperación y nested actions ADMIN→WRITE. No se modificó api-config.js, endpoints, Services/Utilities.js ni deployments.
Verificaciones: parsing 10/10 PASS; suite lógica 17/17 PASS; pruebas de wrappers con dobles 7/7 PASS; cobertura 61/61 acciones mutadoras; paridad AUTH/USERS producción-prueba PASS; comparación contra respaldos PASS; Code Review/Safety & Side Effects PASS.
Limitaciones: sin ejecución real de Apps Script, HTTP, deployments, navegador, Spreadsheet/Drive ni concurrencia real. Configuración de ScriptProperties y pruebas integradas quedan diferidas a Beta. El coordinador debe desplegarse/configurarse antes de actualizar los servicios consumidores.
Commit único: mensaje "feat(services): add shared mutation coordinator"; SHA y padre verificables en el historial de GPSpedia2.2.5_work.
Siguiente tarea bloqueante: AUG-034 — ventana segura de migración VIN/Idempotencia. No iniciar AUG-040/AUG-043 antes de resolver las dependencias previas.
================================================================================


================================================================================
CHECKPOINT FINAL — AUG-034 — 2026-11-10
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work.
HEAD inicial de la tarea: c3143270a965d61bee30a1d52022d2205f02b2dc.
Rama base: GPSpedia2.2.5; HEAD confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Tarea: AUG-034 — COMPLETADA EN VALIDACIÓN LOCAL.
Objetivo: ventana segura de migración VIN/Idempotencia entre ADMIN y WRITE.
Cambios:
1. Services/Coordinator.js declara migrateCortesOperationIds como mantenimiento exclusivo, tanto para dry-run como para confirmación.
2. El coordinador crea una reserva phase=draining que bloquea nuevas mutaciones mientras se liberan las leases previas. El handler solo recibe autorización cuando el drenaje termina.
3. Si vence el tiempo de espera, la reserva se retira, la migración no comienza y se informa la lista mínima de servicios/acciones activas.
4. La reserva abandonada durante el drenaje expira en 60 segundos; el mantenimiento ya activo expira en 45 minutos. Se conserva compatibilidad con leases previas sin phase.
5. Se documentó la recuperación de la migración: persistir destino, flush, verificar por lectura y solo después limpiar origen; un reintento reutiliza las entradas ya registradas.

Archivos modificados: Services/Coordinator.js, Services/Test/SharedMutationCoordinator.js, Services/COORDINATOR_SETUP.md, Services/admin.js, Services/Test/README.md, Tareas_pendientes_parte1.txt, Auditoría.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md.
Validación: sintaxis/parsing de archivos JS modificados PASS; suite aislada 24/24 PASS; revisión estática de wrapper ADMIN/WRITE y secuencia de recuperación PASS.
Limitaciones: no se ejecutaron Apps Script real, UrlFetch entre proyectos, deployments, Sheets reales ni concurrencia física. La prueba integrada entre proyectos y la ejecución de migración en Spreadsheet aislada quedan diferidas a Beta. No se realizó migración ni se modificaron datos productivos.
Hallazgo nuevo H-AUD-155-001 resuelto; AUG-034 cerrada localmente.
Siguiente tarea de integridad: AUG-035 — integridad estricta y reconciliación de la hoja Idempotencia.
No se modificó la rama base.
================================================================================


================================================================================
CHECKPOINT — AUG-035 — 2026-11-10
Rama: GPSpedia2.2.5_work. HEAD inicial de la tarea: 4f859f62dc561799722f749f723acb4b9c22be50.
Tarea: AUG-035 — completada en validación lógica local; pruebas de Spreadsheet aislada diferidas a Beta.
Cambios: ADMIN/WRITE validan encabezados y filas; rechazan duplicados incluso con asociación igual; validan opId, vehicleId, slotIndex, timestamp y status; verifican escrituras y preservan completed; recuperación exige una fila Cortes única por vehicleId; migración verifica asociación y estado completed antes de limpiar origen, y completa registros pending existentes antes de la verificación. Dry-run informa cuántos registros requieren completarse.
Pruebas: suite Services/Test/IdempotenciaIntegrity.js 13/13 PASS; parsing V8 de admin.js, write.js y harness PASS.
Límites: no se ejecutó Spreadsheet real, deployment, endpoint ni datos productivos. Fallos parciales, interrupción y concurrencia real se prueban en Beta.
No se modificó la rama base.
================================================================================

Revisión final: suite lógica 13/13 PASS; parsing V8 de ADMIN, WRITE y harness PASS. HEAD anterior a este checkpoint: 83aaf46b8e8f859434cf4ba541af74b7cdc4a146.


================================================================================
CHECKPOINT — AUG-036 — 2026-11-10
Rama: GPSpedia2.2.5_work.
Tarea: AUG-036 — completada en validación lógica local; prueba con Spreadsheet aislada pendiente de Beta.
Decisión de esquema: activaTestigo1..3 ocupan obligatoriamente AT:AV (46–48). AR:AS permanecen reservadas. Las columnas posteriores a AV se conservan; no se agregan testigos al final de la última columna usada.
VIN: resolución por encabezado único; la migración conserva AQ como posición objetivo. JSON array es canónico y preserva posiciones vacías; compatibilidad heredada con coma, /, barra inversa y punto y coma. UI/ADMIN/WRITE usan reglas equivalentes y serialización JSON común. JSON mal formado, tokens inválidos, duplicados y más de tres valores se rechazan.
Cambios: Services/admin.js, Services/write.js, ui.js; Services/Test/VinTestigoIntegrity.js; README.md; Spreadsheet/GPSpedia_DB_columnas.md; Services/Test/README.md; Tareas_pendientes_parte1.txt; Auditoría.txt; ChangesLogs.txt; lista_beta.txt.
Pruebas: suite lógica 14/14 PASS; parsing V8 ADMIN/WRITE/UI/test PASS; helpers VIN y testigo ADMIN/WRITE idénticos; paridad de parser/serializer UI/backend PASS.
Límites: no se ejecutó Spreadsheet real, Apps Script, navegador ni deployments. La integración real y pruebas de escritura/lectura quedan en Beta.
No se modificó la rama base.
================================================================================

Verificación final AUG-036: Services/Test/VinTestigoIntegrity.js 14/14 PASS; parsing V8 ADMIN/WRITE/UI/test PASS; helpers de columna VIN, AT:AV y parser ADMIN/WRITE idénticos; paridad frontend/backend y rechazo de entradas inválidas confirmados. HEAD anterior a este checkpoint: c31a0ed60907a51149225947364a45f218da6002.


================================================================================
CHECKPOINT — AUG-037 — 2026-11-10
Rama: GPSpedia2.2.5_work.
Tarea: AUG-037 — completada en validación lógica local; integración real Drive/Spreadsheet pendiente de Beta.
Mecanismo durable: hoja ImageUploadLedger creada bajo demanda, con token único, operationKey, folderId, MIME, tamaño, SHA-256, fileId/URL, estado y referencias de Cortes. Se registra y verifica pending antes de crear archivo Drive; luego se verifican metadatos Drive y fila ledger.
Integridad: al reutilizar, se recalculan bytes y hash; se valida operación, carpeta, MIME, tamaño, contenido y token. Límite 10 MB por imagen. Si no se puede persistir ledger, no se crea el archivo.
Enlace: markImageUploadLinked actualiza ledger y verifica read-back; la descripción Drive es complementaria. Si el marcado falla, el guardado no se bloquea y el registro pending puede reconciliarse.
Reconciliación: ADMIN reconcilePendingImageUploads, dry-run por defecto, confirm:true, paginación máxima 100; clasifica linked, pending_unreferenced, orphan_candidate, file_missing y requires_review. No elimina archivos.
Cambios: Services/admin.js, Services/write.js, Services/Coordinator.js, api-config.js, Services/Test/ImageUploadLedger.js, Services/Test/SharedMutationCoordinator.js, README.md, Spreadsheet/GPSpedia_DB_columnas.md, Services/Test/README.md, Tareas_pendientes_parte1.txt, Auditoría.txt, ChangesLogs.txt y lista_beta.txt.
Pruebas: ImageUploadLedger 18/18 PASS; SharedMutationCoordinator 25/25 PASS; parsing V8 ADMIN/WRITE/Coordinator/API/tests PASS; helpers de carga ADMIN/WRITE idénticos.
Límites: no se ejecutó Drive real, Spreadsheet real, Apps Script desplegado ni concurrencia física. La prueba integral en copias aisladas queda pendiente de Beta. No se modificaron datos productivos.
No se modificó la rama base GPSpedia2.2.5.
================================================================================

Cierre final AUG-037: HEAD previo a este checkpoint 17c52c09e20701f76fdd39c48cdf50c6ad0439da. Pruebas finales: ImageUploadLedger 18/18 PASS; SharedMutationCoordinator 25/25 PASS; VinTestigoIntegrity 14/14 PASS; parsing V8 ADMIN/WRITE/Coordinator/API/UI/tests PASS; helpers compartidos ADMIN/WRITE idénticos; paridad parser VIN frontend/backend PASS. Acción reconcilePendingImageUploads verificada en router ADMIN, api-config y política maintenance. ImageUploadLedger se persiste antes de folder.createFile; dry-run no crea hoja ni modifica archivos; no existe ninguna ruta de borrado en la reconciliación. Rama base GPSpedia2.2.5 HEAD d9acc68d889985c2e2f42fe3a02e502efc86ead1 sin cambios.


================================================================================
CHECKPOINT DE AVANCE — AUG-043 — 2026-11-10
Repositorio: infogpstech/GPSpedia.
Rama de trabajo autorizada: GPSpedia2.2.5_work.
HEAD confirmado al iniciar esta continuación: 0e37540a567de1f977631268fcff56a1267070f6.
Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1; sin modificaciones.
Tarea: AUG-043 — EN PROGRESO.
Fuente normativa: NORMAS_DESAROLLO.md.

IMPLEMENTACIÓN
1. FEEDBACK: se agregaron consultas seguras por opVideoId/propietario, idempotencia de submitVideoForApproval, validación de destino/ID/URL, prevención de solicitudes pendientes duplicadas y revalidación del destino antes de crear la solicitud.
2. Destinos: Corte usa id/videoGuiaDesarmeUrl; PyS usa id_problem/Video; Tutoriales usa Tema único y columnas A:E verificadas. La aprobación publica el enlace en el destino correcto; el rechazo retira únicamente el enlace pendiente. La miniatura propia del tutorial se conserva y la URL se escribe después de preparar la miniatura.
3. Seguridad: addTutorial requiere Desarrollador; addProblem y acciones de contribución requieren sesión válida; se mantiene la matriz backend para aprobación/rechazo y edición. Las altas/ediciones PyS/Tutorial rechazan URLs directas; no se permite renombrar un tutorial con solicitud pendiente.
4. Cliente: youtubeUpload.js usa currentUser.ID/SessionToken, valida la sesión, persiste opVideoId y archivo en IndexedDB, transfiere bloques reanudables y consulta el estado remoto después de interrupciones. Una respuesta final sin ID real detiene el flujo y conserva el registro para recuperación.
5. UI: se corrigieron callsites de asociación/desvinculación y edición; se retiró la entrada manual de URL de openAddVideoModal; Corte, PyS y Tutorial usan el flujo de aprobación. api-config.js mapea getVideoApprovalByOperation a FEEDBACK.

ARCHIVOS FUNCIONALES
Services/feedback.js, youtubeUpload.js, ui.js, api-config.js.

PRUEBAS AÑADIDAS
Services/Test/VideoApprovalState.js, YouTubeApproval.js, YouTubeApprovalInit.js, VideoApprovalPublishing.js, VideoApprovalContracts.js, VideoApprovalSessions.js y YouTubeUploadClient.js; Services/Test/README.md actualizado.

VALIDACIÓN LOCAL
- Estado: 13/13 PASS.
- Submit/idempotencia/propiedad: 16/16 PASS.
- Inicialización YouTube: 8/8 PASS.
- Aprobación/rechazo Corte/PyS/Tutorial: 16/16 PASS.
- Contratos de altas/ediciones: 8/8 PASS.
- Sesión/autorización: 10/10 PASS.
- Cliente resumable: 12/12 PASS.
- Total: 82/82 pruebas PASS.
- Sintaxis/parsing de Services/feedback.js, youtubeUpload.js, ui.js y api-config.js: 4/4 PASS.
- Revisión estática de callsites protegidos: addVehicleToProblem 2/2, removeVehicleFromProblem 2/2, updatePysItem 1/1 y updateTutorialItem 1/1 con getSessionPayload_().

LÍMITES Y PENDIENTES
- No se ejecutó YouTube OAuth/API real, XHR/IndexedDB de navegador real, Apps Script desplegado, HTTP, Drive/Spreadsheet productivos ni concurrencia física.
- Pendiente: revisar el diff completo, publicar en GPSpedia2.2.5_work con SHA esperado y verificar el commit/HEAD remoto; después ejecutar prueba de integración en navegador y proyecto Apps Script/Spreadsheet aislado.
- La tarea permanece EN PROGRESO. No se modificó la rama base ni datos productivos.
================================================================================

Nota documental: Tareas_pendientes_parte1.txt (181,717 caracteres) y Auditoría.txt (185,934 caracteres) ya superan el umbral de rotación de 180,000. No se añadieron entradas a esos archivos; el estado de AUG-043 se registra en Tareas.txt y este checkpoint. Programar rotación documental independiente antes de nuevas adendas en esos registros.


================================================================================
CHECKPOINT — AUG-043 — 2026-11-10
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work.
HEAD confirmado antes de este checkpoint: 655a6ffc20c5b956c9d96d233a1a1cdd7c0fb2fc (docs(video): record AUG-043 progress and validation).
Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1; no modificada.
Tarea: AUG-043 — alinear contratos de acciones protegidas y ciclo de aprobación de YouTube.
Estado: EN PROGRESO; la implementación y la cobertura automatizada se encuentran publicadas en commits previos de la rama de trabajo. Este checkpoint no declara la tarea completada.
Alcance visible: workflow backend de aprobación/publicación para Cortes, PyS y Tutoriales; inicialización de sesión resumable con validación de destino y URL oficial; idempotencia mediante opVideoId y consulta de solicitud previa; cliente de transferencia reanudable por bloques con persistencia local; suites de aprobación y cliente documentadas en Services/Test/README.md.
Validación: en esta iteración se verificaron rama, HEAD, árbol remoto, archivos de continuidad y separación de la rama base. No se ejecutaron las suites, navegador real, IndexedDB real, OAuth/YouTube API, Apps Script desplegado ni Google Sheets aislado. No se afirma que esas validaciones hayan pasado.
Pendiente: ejecutar parsing y suites aisladas disponibles; integración real con YouTube OAuth/API, XHR/IndexedDB de navegador, Apps Script y copias aisladas de Sheets en Beta.
Siguiente acción: continuar validación reproducible de AUG-043, corregir solo hallazgos demostrados y actualizar el estado después de ejecutar las suites.
Nota: blobs preparados en iteraciones anteriores no constituyen cambios publicados por sí solos. Solo el contenido presente en el árbol de esta rama es fuente válida; no aplicar blobs antiguos sin reconciliar el diff.
================================================================================


PUBLICACIÓN VERIFICADA — AUG-043 — 2026-11-10
- La implementación, las siete suites de prueba y los registros de avance quedaron publicados en GPSpedia2.2.5_work mediante 15 commits secuenciales de un archivo, cada uno verificado como hijo directo del HEAD previo.
- HEAD de trabajo verificado tras la publicación: abe3b642f4e41c55c9660c91af5d4c71d820947b.
- El merge-base con GPSpedia2.2.5 permanece d9acc68d889985c2e2f42fe3a02e502efc86ead1; no se modificó la rama base.
- Relectura desde la rama remota: 82/82 pruebas aisladas PASS; sintaxis de los cuatro módulos principales PASS; contenido de módulos, suites y registros verificado.
- AUG-043 continúa EN PROGRESO: falta la prueba de integración en navegador real y la validación con OAuth/YouTube API y proyecto Apps Script/Spreadsheet aislado. No se desplegó ni se modificaron datos productivos.


CORRECCIÓN DE CONTINUIDAD — 2026-11-10
La nota de checkpoint inmediatamente anterior que indicaba que aún no se habían ejecutado las suites corresponde al estado previo a esta continuación y queda superada por la validación registrada arriba: 82/82 pruebas aisladas PASS y sintaxis de los cuatro módulos principales PASS. Las validaciones que siguen pendientes son exclusivamente la integración en navegador real (DOM/IndexedDB/XHR), OAuth/YouTube API real y proyecto Apps Script/Spreadsheet aislado. HEAD verificado antes de esta corrección: 8701038e33dbd29acb7918c58f81e9fa1991577e. La tarea AUG-043 permanece EN PROGRESO; no se ha desplegado ni se han tocado datos productivos.


================================================================================
CHECKPOINT FINAL — AUG-043 — 2026-11-10
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work.
HEAD confirmado antes de este cierre documental: 45c9a057addc06f25d7e2c7a7012b9a210798d11.
Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1; sin modificaciones.
Tarea: AUG-043 — COMPLETADA CON VALIDACIÓN DIFERIDA.
Implementación: workflow FEEDBACK de aprobación/publicación para Cortes, PyS y Tutoriales; validación de sesión/rol en backend; idempotencia y recuperación por opVideoId/propietario; validación de destinos y URL/ID real; publicación/rechazo con verificación; cliente de subida resumable con IndexedDB, consulta de progreso y recuperación.
Validación local: 82/82 pruebas aisladas PASS según evidencia de ejecución registrada en el checkpoint previo; parsing revalidado en esta sesión 11/11 archivos PASS (cuatro módulos principales y siete suites). Revisión estática del diff funcional de AUG-043 y de los callsites protegidos: sin defectos reproducibles identificados.
Validación diferida a Beta: navegador real/DOM, IndexedDB y XHR reales, cancelación/recarga, OAuth/YouTube API, Apps Script desplegado y Spreadsheet aislado. Casos concretos agregados a lista_beta.txt. No se simularon ni se declararon como ejecutados.
Sin despliegues, cambios de endpoints, datos productivos ni modificaciones a la rama base.
Siguiente acción: continuar con la siguiente tarea autorizada del plan, respetando sus dependencias; AUG-043 no requiere más trabajo local.
================================================================================


================================================================================
CHECKPOINT DE AVANCE — HARDENING DE ACCIONES FEEDBACK — 2026-11-10
Repositorio: infogpstech/GPSpedia.
Rama autorizada: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5 (sin modificaciones; comparación remota: rama de trabajo ahead 586, behind 0).
Contexto: continuación de trabajo sobre contratos de escritura FEEDBACK y validación de identidad. No se declara cerrada una tarea funcional ni se modifica el estado histórico de AUG-043.

CAMBIOS FUNCIONALES PUBLICADOS EN LA RAMA DE TRABAJO
1. Services/feedback.js: política explícita de acciones permitidas; autenticación y sustitución de identidad del cliente por identidad derivada de sesión; rechazo de acciones no declaradas; retiro del dispatcher assignCollaborator; limitación de frecuencia del formulario público; separación entre sugerencias anónimas y votos verificados; ledger de likes con bloqueo, idempotencia y recuperación; validaciones y manejo compensatorio de persistencia de imagen PyS; validación de unicidad de problema y longitud de solución/prevención.
2. api-config.js: wrappers recordLike y reportProblem transmiten el payload de sesión y normalizan los argumentos.
3. ui.js: los callsites de likes, reportes y contribuciones PyS envían getSessionPayload_(); se retiró la identidad autorreportada de la carga de alta PyS.
4. Services/Coordinator.js: recordLike reserva también el recurso FEEDBACK; se retiró la política del dispatcher assignCollaborator.

VALIDACIÓN LOCAL EJECUTADA EN ESTA ITERACIÓN
- Parsing/sintaxis JavaScript con new Function: Services/feedback.js, api-config.js, ui.js y Services/Coordinator.js — 4/4 PASS.
- Comprobación estática: la acción assignCollaborator ya no aparece en los cuatro archivos inspeccionados; el autorizador explícito está presente; recordLike incluye FEEDBACK en recursos coordinados; los callsites principales transmiten payload de sesión.
- No se ejecutó todavía la suite Services/Test/FeedbackWriteSecurity.js ni pruebas de comportamiento específicas de los cambios de esta iteración. No declarar cobertura funcional completa.

PENDIENTES / SIGUIENTE ACCIÓN
1. Leer y ejecutar/ajustar Services/Test/FeedbackWriteSecurity.js con dobles aislados para las nuevas rutas, verificando autorización, identidad falsificada, roles, anonimato, rate limit, ledger idempotente/recuperación, IDs duplicados y compensación ante fallos de imagen.
2. Revisar contratos y llamadores de todas las acciones FEEDBACK afectadas, incluidos reportProblem, recordLike, addProblem, addSolution, addPrevention, suggestCutChange y suggestYear; confirmar que no se retiró una acción todavía consumida fuera de los archivos inspeccionados.
3. Revisar diff funcional completo y efectos colaterales, corregir hallazgos reproducibles y repetir pruebas afectadas.
4. Mantener como validaciones Beta las dependencias reales de Apps Script/Spreadsheet/Drive, navegador y servicios externos; no desplegar ni tocar datos productivos.

Estado: EN PROGRESO. La evidencia actual confirma parsing y verificaciones estáticas limitadas; aún no permite cerrar el hardening. Rama base y datos productivos sin cambios.
================================================================================


================================================================================
CHECKPOINT DE AVANCE — HARDENING FEEDBACK: IDENTIDAD EN ALTA DE TUTORIAL — 2026-11-10
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
HEAD funcional previo al checkpoint: f7bc64d362f531b4813cf696a7152d946c130a46.
Problema resuelto en esta iteración: el handler handleAddTutorial utilizaba el campo colaborador enviado por el navegador, aunque la acción ya exigía una sesión de Desarrollador. Esto permitía que un cliente autenticado registrara un nombre de colaborador falsificado.
Corrección: Services/feedback.js ahora requiere userName derivado por authorizeFeedbackAction_ desde la sesión validada y lo utiliza como colaborador persistido; ignora el campo colaborador suministrado por el cliente.
Prueba añadida: Services/Test/FeedbackWriteSecurity.js verifica que, aun enviando nombres falsificados en userName/colaborador, la fila guarda exclusivamente el nombre derivado de la sesión verificada.
Validación local ejecutada tras la corrección:
- Parsing/sintaxis de Services/feedback.js y Services/Test/FeedbackWriteSecurity.js: 2/2 PASS.
- Suite aislada runFeedbackWriteSecurityTests(): 17/17 PASS.
- El primer intento de la nueva prueba falló por una referencia al mock SpreadsheetApp no inicializado; se corrigió el fixture y se repitió la suite completa, que aprobó 17/17.
Estado global del hardening FEEDBACK: EN PROGRESO. Este checkpoint cierra únicamente el defecto de identidad de colaborador en alta de tutorial; no declara terminada la revisión de los demás contratos, llamadores, autorización, ledger, ni compensaciones.
No ejecutado: navegador real, Apps Script desplegado, Spreadsheet/Drive reales, OAuth/YouTube API, concurrencia física ni datos productivos. No se desplegó ni se modificó la rama base.
Siguiente iteración: continuar la revisión de contratos y llamadores de las acciones FEEDBACK afectadas, sin abrir una tarea distinta. El siguiente hallazgo se tratará de forma independiente y tendrá su propio checkpoint/commit cuando quede resuelto.
================================================================================
