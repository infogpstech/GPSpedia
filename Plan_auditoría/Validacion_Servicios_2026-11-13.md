# Validación automatizada de servicios — 2026-11-13

## Alcance
- Rama: `GPSpedia2.2.5_work`
- Workflow: `.github/workflows/service-tests.yml`
- Runtime definido: Node.js 22
- Verificaciones: identidad del repositorio y rama, árbol de trabajo limpio, sintaxis de `ui.js`, `offline.js` y `Services/admin.js`, y ejecución de `Services/Test/RunServiceTests.mjs`.
- Suites: WRITE, ADMIN, FEEDBACK, CATALOG, UTILITIES, AUTH, USERS e INTEGRATION.

## Resultado
Pendiente de ejecución y lectura del resultado de GitHub Actions. No se considera aprobada ninguna prueba hasta disponer de la salida del workflow.

## Límites de seguridad
Las pruebas que requieran deployments de Google Apps Script o recursos externos deben ejecutarse únicamente contra los entornos aislados documentados; no se deben usar endpoints ni datos productivos.
