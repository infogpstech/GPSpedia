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
