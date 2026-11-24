# GPSpedia — Checkpoint de continuidad

Fecha: 2026-11-24
Repositorio: `infogpstech/GPSpedia`
Rama autorizada: `GPSpedia2.2.5_work`
Rama base protegida: `GPSpedia2.2.5` — no modificar.
HEAD de trabajo antes de este checkpoint: `085a40394501d83e0e36b83cc32652d1adc7bfc3`
HEAD de rama base verificado: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`

## Reglas de continuidad
- `NORMAS_DESAROLLO.md` es la única fuente normativa vigente; leerla antes de iniciar una sesión o cambiar código/documentación operativa.
- Confirmar rama y HEAD antes de cada escritura. No forzar actualizaciones ni modificar la rama base.
- No declarar pruebas ni efectos externos sin evidencia observada.
- Distinguir pruebas locales, fixtures y análisis estático de validaciones remotas.
- Requisito Apps Script: sin secretos compartidos/manuales ni URLs/IDs locales de otros servicios; coordinación funcional frontend cuando sea posible; llamadas backend directas solo por necesidad técnica, con autorización/RBAC del receptor; endpoints operativos desde registro central autoactualizable, sin fallback local.
- Un fallo de un servicio/operación no debe bloquear funciones independientes.

## Estado de tareas MIG
- MIG-001 a MIG-030: tareas de implementación cerradas localmente según sus criterios, con validaciones externas diferidas a Beta donde corresponde.
- MIG-014: COMPLETADA CON VALIDACIÓN DIFERIDA; la regresión global actual ya no conserva la deuda de fallos ajenos documentada históricamente.
- MIG-026: COMPLETADA CON VALIDACIÓN DIFERIDA. AUTH, CATALOG y UTILITIES ya no contienen `SPREADSHEET_ID` ni `openById(SPREADSHEET_ID)`; acceden mediante `SpreadsheetApp.getActiveSpreadsheet()` y fallan cerrado si falta contexto.
- MIG-028: COMPLETADA CON VALIDACIÓN DIFERIDA; regresión local aprobada, mediciones de latencia real pendientes de Beta.
- MIG-029 y MIG-030: COMPLETADAS CON VALIDACIÓN DIFERIDA.
- La ejecución de campo BETA-01..08, validación de deployments/Spreadsheet/Drive/OAuth/YouTube, identidad/permisos reales y limpieza física de propiedades legacy sigue pendiente en `Tareas_Beta.md`. No se ha ejecutado ni simulado.

## MIG-026 — acceso Spreadsheet sin localizadores
- AUTH centraliza el handle mediante `getAuthUsersSpreadsheet_()`; CATALOG mediante `getSpreadsheet()`; UTILITIES mediante `getUtilitiesSpreadsheet_()`, reutilizando un handle por petición entre carga del actor y operación.
- La copia aislada `JS/Tests/Auth.js` conserva paridad exacta.
- No se añadió ID, URL, propiedad, secreto, endpoint bootstrap ni fallback local.
- Si una Web App devuelve `NO_ACTIVE_SPREADSHEET` o carece de permisos, no restaurar IDs locales; mantener sin desplegar esa versión y resolver una alternativa sin configuración local antes de publicar.
- El probe MIG-006 está preparado; la prueba de Web App real debe repetirse por proyecto e identidad efectiva sobre Spreadsheet desechable y aislada.

## Evidencia de regresión integral — CI 2026-11-24
- Workflow: `GPSpedia service regression tests`.
- Run: `45399766285`; job: `138464973056`; commit: `a894a402d3dbcae2c922bc815b8efc3e8cba4a1d`.
- Resultado: SUCCESS; Node.js v22.23.5; sintaxis PASS; 513 suites; 6,051 pruebas aprobadas; 0 fallos.
- `RepositoryJavaScriptSyntax`: 1/1; 463 archivos .js/.mjs verificados.
- `RepositoryModuleReferences`: 1/1; 384 archivos inspeccionados y referencias relativas resueltas.
- `MIG027FunctionalParity`: 8/8; `MIG028SecurityPerformanceRegression`: 9/9.
- `MIG026StaticConfigSearch`: 10/10; `MIG013SessionActorLocalLookup`: 22/22; `CatalogChangeFeed`: 19/19; `UtilitiesSecurity`: 19/19.
- `NonBlockingServiceLocks`: 27/27; `WriteContributionAppendConcurrency`: 9/9; `AdminDriveLockIsolation`: 9/9.
- Otras suites dirigidas: `PasswordHashMigration` 16/16; `SensitiveLogsTrustedActor` 7/7; `SessionActivityLeaseMinimization` 6/6.
- GitHub Pages build/deploy: run `45399765421`, job de build `138465371988`, deploy `138465666891`: SUCCESS. Esto no representa despliegue de proyectos Apps Script.

## Límites de validación
- No se desplegaron proyectos Apps Script ni se invocaron endpoints de servicios.
- No se modificaron PropertiesService, permisos, Spreadsheet, Drive, OAuth/YouTube ni datos productivos.
- La prueba real de `getActiveSpreadsheet()` en Web Apps y las mediciones p50/p95 siguen pendientes de Beta; los resultados CI no se extrapolan a disponibilidad ni latencia de producción.

## Rotación documental
- El checkpoint anterior, de 187738 caracteres Unicode, se preservó íntegro en `Olds/Documentacion_Legacy/Checkpoint_Archive/checkpoint_2026-11-24_parte_006.md`.
- El blob SHA archivado coincide con el SHA del checkpoint original: `4a25fc4d0dc3ed6a71113e60b88623aa5f9b0504`.
- El manifiesto de rotación conserva las referencias a las partes anteriores.

## Próxima acción
Continuar la fase de verificación técnica integral exigida por NORMAS_DESAROLLO.md §11: revisar el diff completo contra el HEAD base de esta iteración, confirmar que solo contiene cambios MIG-026 y sus contratos/documentación, comprobar que no hubo eliminaciones ni modificaciones ajenas, verificar nuevamente la rama base protegida y registrar el cierre de esta fase. Después, mantener Beta como procedimiento pendiente; no incorporar nuevas mejoras hasta terminar esa verificación.
