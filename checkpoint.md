# GPSpedia — Checkpoint de continuidad

Fecha: 2026-11-24
Repositorio: `infogpstech/GPSpedia`
Rama autorizada: `GPSpedia2.2.5_work`
Rama base protegida: `GPSpedia2.2.5` — no modificar.
HEAD de trabajo al iniciar esta continuidad: `142b9057f57909c364a9726fd448f43d6e048cad`
HEAD de rama base verificado: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`

## Reglas de continuidad
- `NORMAS_DESAROLLO.md` es la única fuente normativa vigente; leerla antes de iniciar una sesión o cambiar código/documentación operativa.
- Confirmar rama y HEAD antes de cada escritura. No forzar actualizaciones ni modificar la rama base.
- No declarar pruebas ni efectos externos sin evidencia observada.
- No detener trabajo independiente por limitaciones de una herramienta; buscar métodos alternativos y distinguir pruebas reales, fixtures y análisis estático.
- Requisito transversal Apps Script: sin secretos compartidos/manuales ni URLs de otros servicios en propiedades; coordinación funcional entre servicios desde frontend cuando sea posible; llamadas backend directas solo si son necesarias y con autorización/RBAC del receptor; endpoints operativos desde registro central autoactualizable, sin fallback local.
- Preservar la independencia funcional: un servicio o una operación fallida no debe impedir que continúen consultas/operaciones independientes.

## Estado de trabajo
- MIG-029: COMPLETADA CON VALIDACIÓN DIFERIDA. Guía de despliegue en `Services/DEPLOYMENT_GUIDE.md`; contrato 7/7 y regresión CI verificados.
- MIG-026: EN PROGRESO. Las migraciones locales de estado están cubiertas, pero permanecen tres `SPREADSHEET_ID/openById` en AUTH, CATALOG y UTILITIES. No retirarlos hasta demostrar el contexto real de acceso Spreadsheet en cada Web App; la prueba Beta correspondiente sigue pendiente.
- MIG-030: EN PROGRESO. Preparación de Beta, contratos y regresión local aprobados. La aceptación integral de las 30 tareas depende de resolver el remanente de implementación MIG-026. Las pruebas reales BETA-01..08 y validaciones diferidas MIG-012/013/015/017/018/024/025/026 siguen pendientes en `Tareas_Beta.md`.
- No se ejecutaron deployments, llamadas a endpoints, operaciones Apps Script, cambios de propiedades/permisos ni escrituras en Spreadsheet/Drive/OAuth/YouTube durante esta continuidad.

## Evidencia CI más reciente
- Workflow: `GPSpedia service regression tests`.
- Run: `45396084519`; job: `138452115396`; commit: `142b9057f57909c364a9726fd448f43d6e048cad`.
- Resultado: SUCCESS; Node.js v22.23.5; sintaxis PASS; 513 suites, 6,051 pruebas aprobadas, 0 fallos.
- `ServiceHealthContract.mjs`: 19/19 PASS en las ejecuciones registradas del run `45395676090`.
- Contratos MIG-028/MIG-014 verifican fallos parciales, fan-out e independencia de servicios; no sustituyen pruebas de disponibilidad remota.
- La sonda remota no se ejecutó: el workflow `.github/workflows/deployed-service-health.yml` no existe en `main` y el bootstrap de `RemoteServiceHealth.mjs` no permite seleccionar/confirmar el entorno Beta.

## Rotación documental
- El checkpoint anterior, de 187738 caracteres Unicode, se preservó íntegro en `Olds/Documentacion_Legacy/Checkpoint_Archive/checkpoint_2026-11-24_parte_006.md`.
- El SHA del blob archivado coincide con el SHA del checkpoint original: `4a25fc4d0dc3ed6a71113e60b88623aa5f9b0504`.
- El manifiesto de rotación conserva las referencias a todas las partes anteriores.

## Próxima acción
Continuar MIG-026: resolver por vía autorizada la prueba de acceso Spreadsheet en el contexto real de AUTH, CATALOG y UTILITIES; solo después retirar los tres IDs locales y validar sintaxis, contratos, regresión y ausencia de bloqueo entre funciones. Mantener `Tareas_Beta.md` como procedimiento de campo. Antes de cualquier prueba remota, confirmar los seis deployments activos y el aislamiento de Spreadsheet, Drive, cuentas y datos sintéticos. Comenzar por health/read-only; no ejecutar mutaciones sin permisos, previsualización y recuperación confirmados. Registrar solo resultados observados en `Hallazgos_Beta.md`.
