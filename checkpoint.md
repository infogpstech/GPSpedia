# Checkpoint activo — GPSpedia

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
