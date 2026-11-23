# Línea base de migración — GPSpedia
Fecha de corte: 2026-11-23
Repositorio: infogpstech/GPSpedia
Rama: GPSpedia2.2.5_work
Commit probado: f20bc9934031adb63947e82e1e26b7a24ef4b0f1
Rama base de referencia: GPSpedia2.2.5 — d9acc68d889985c2e2f42fe3a02e502efc86ead1

## 1. Línea base automatizada (ejecutada)

| Indicador | Resultado observado | Alcance |
|---|---:|---|
| Suites de regresión | 306 | Runner Node.js de servicios |
| Pruebas aprobadas | 3,581 | 0 fallos de suite |
| Sintaxis JavaScript | 438 archivos JS/MJS | RepositoryJavaScriptSyntax |
| Referencias/imports relativos | 348 archivos inspeccionados | RepositoryModuleReferences |
| Contrato de grafo de llamadas MIG-004 | 9/9 PASS | Incluido en la suite |
| Benchmark contractual de calidad de miniaturas | 49/49 PASS | Corpus sintético local; no mide transferencia de red |
| Sincronización de snapshot/deltas CATALOG | 29/29 PASS | Contratos y escenarios simulados; no mide tamaño/latencia real |
| Health de servicios desplegados | 7/7 GET correctos | Disponibilidad/contrato HTTP; no equivale a prueba funcional completa |

**Ejecución de regresión:** GitHub Actions GPSpedia service regression tests, run 45172298195, estado SUCCESS, commit exacto f20bc9934031adb63947e82e1e26b7a24ef4b0f1. El log final informa: 306 suites; 3,581 pruebas aprobadas; 0 fallos de suite.

**Duración de CI:** el workflow comenzó a las 12:13:45Z y terminó a las 12:14:15Z (aprox. 30 segundos, incluyendo checkout/preparación y limpieza). Es una referencia del entorno GitHub Actions, no una medición de latencia de arranque, login ni de operaciones de la aplicación.

**Health read-only:** workflow GPSpedia deployed service health (read-only), run 45172298206, estado SUCCESS. Los siete endpoints se consultaron mediante GET. No se realizaron escrituras ni se modificaron deployments.

## 2. Contratos y controles de rendimiento cubiertos localmente

La suite existente verifica comportamientos que deben preservarse y que servirán para comparar la migración, entre ellos:

- Arranque cache-first, reutilización de caché fresca y sincronización incremental por deltas con fallback a snapshot completo.
- Integridad del snapshot/cursor, orden/versiones de eventos, recuperación ante reset y persistencia local degradada.
- Priorización de miniaturas visibles, single-flight, deduplicación y recuperación de fallos.
- Lecturas acotadas, reutilización de snapshots de Spreadsheet simulados y eliminación de lecturas redundantes en rutas WRITE/ADMIN/CATALOG/FEEDBACK/USERS.
- Operaciones Drive fuera de locks cuando corresponde, re-adquisición fail-fast, lotes de escritura y recuperación idempotente.
- Vida útil e invalidación de caché de actor; ausencia de revalidaciones por acción en los flujos cubiertos.
- Contrato de benchmark PBKDF2 protegido y sin acceso a contraseñas/datos reales.

Estas pruebas son evidencia de contratos, lógica y simulaciones locales. No deben interpretarse como mediciones de tiempos reales de Apps Script, Spreadsheet, Drive, YouTube o navegador.

## 3. Métricas de aplicación no disponibles en este corte

| Métrica requerida | Estado | Motivo / evidencia necesaria |
|---|---|---|
| Arranque y login (p50/p95) | PENDIENTE BETA | Requiere navegador/dispositivo, sesión de prueba y medición repetida de extremo a extremo |
| Catálogo: snapshot (bytes/tiempo) y delta (bytes/tiempo) | PENDIENTE BETA | Requiere respuestas reales de servicios y datos de Spreadsheet aislados |
| Inbox: carga, paginación y mutaciones | PENDIENTE BETA | Requiere sesión/roles de prueba y conversaciones desechables |
| Carga de imágenes y vídeos | PENDIENTE BETA | Requiere archivos de prueba, navegador, OAuth y YouTube/Drive autorizados |
| Operaciones Drive (lectura/escritura) | PENDIENTE BETA | Requiere carpeta aislada y permisos reales |
| Estado/impacto de cachés | PENDIENTE BETA | Requiere telemetría de servicio y navegador en escenario controlado |
| Número de llamadas por flujo | PENDIENTE BETA | Requiere captura de red/telemetría correlacionada |
| Lecturas/escrituras Spreadsheet por operación | PENDIENTE BETA | Requiere instrumentación/medición dentro de Apps Script y hoja desechable |

No se asignan valores estimados ni se extrapolan los tiempos del runner a la aplicación. Las validaciones diferidas deben ejecutarse antes de aceptar la paridad de rendimiento de la arquitectura migrada.

## 4. Uso como referencia de comparación

- Repetir la misma suite de regresión después de cada cambio arquitectónico relevante y comparar número de suites/pruebas, fallos, sintaxis y referencias.
- Para métricas de aplicación, usar los mismos dispositivos/navegadores, roles, datos, red y operaciones; registrar cantidad de muestras, p50, p95, bytes y llamadas.
- Medir snapshot y delta por separado; no comparar un snapshot completo con una respuesta incremental.
- Separar tiempos de frontend, red, Apps Script, Spreadsheet y Drive cuando la instrumentación lo permita.
- Registrar caché fría/caliente y estado de sesión por separado.
- No ejecutar escrituras sobre datos reales. Usar recursos desechables aislados y autorización Beta.
- Mantener como invariantes la paridad funcional, RBAC, idempotencia, consistencia y recuperación; una mejora de tiempo no justifica regresiones.

## 5. Limitaciones

- El runner CI ejecuta pruebas Node.js aisladas sobre fuentes versionadas; no despliega código ni modifica proyectos Apps Script.
- El health check solo prueba disponibilidad HTTP mediante GET y no demuestra que los deployments contengan el HEAD probado.
- No se dispone en esta ejecución de navegador automatizado, credenciales de prueba, acceso a propiedades instaladas, Spreadsheet/Drive desechables ni OAuth/YouTube para obtener métricas reales.
- Los datos de rendimiento de aplicación quedan como validación diferida a Beta, no como defectos ni como resultados aprobados.
