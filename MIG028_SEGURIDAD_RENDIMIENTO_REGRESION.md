# MIG-028 — Seguridad, rendimiento y regresión

**Repositorio:** infogpstech/GPSpedia  
**Rama:** GPSpedia2.2.5_work  
**Fecha:** 2026-11-24  
**Estado:** COMPLETADA EN VALIDACIÓN LOCAL — métricas de aplicación pendientes de Beta

## Evidencia CI

[GitHub Actions — run 45390513381](https://github.com/infogpstech/GPSpedia/actions/runs/45390513381)

- Resultado: SUCCESS
- Suites: 512
- Pruebas aprobadas: 6,044
- Fallos: 0
- MIG028SecurityPerformanceRegression: 9/9 PASS
- Verificación sintáctica: PASS
- Runtime: Node.js 22

## Seguridad y sesiones

Se verificó mediante contratos existentes y regresión:

- Inicio/restauración de sesión sin revalidaciones redundantes.
- Revocación de sesiones, cambios de rol e invalidación de cachés de actor.
- La invalidación se coordina desde el frontend para AUTH, CATALOG, WRITE, FEEDBACK, ADMIN y UTILITIES; el payload no transmite tokens de sesión.
- Los servicios consumen el actor confiable del backend y mantienen las comprobaciones locales de capacidad/RBAC.
- Se conserva la matriz de cinco roles: Desarrollador, Jefe, Supervisor, Tecnico y Tecnico_exterior.
- La ruta ordinaria del router no realiza una llamada previa a AUTH, touchSession ni validación interactiva por acción.
- El registro central es la fuente de endpoints; una configuración stale/invalidada no expone endpoints para enrutar ni utiliza fallback local.

## Concurrencia e idempotencia

Se ejecutaron contratos de locks no bloqueantes, contención, reserva de slots, operaciones append-only concurrentes, idempotencia y aislamiento de trabajo Drive. Los servicios no introducen esperas bloqueantes ni sleeps artificiales; los locks de backend usan adquisición fail-fast donde corresponde.

## Tolerancia a fallos

Los contratos y fixtures cubren:

- Fallo de lectura Spreadsheet en validación de sesión AUTH: se clasifica como indisponibilidad y no como revocación confirmada.
- Caché central: single-flight, TTL fresco, stale limitado, invalidación y fallo cerrado sin endpoints locales.
- IndexedDB: transacciones abortadas, cuotas y persistencia degradada sin bloquear módulos independientes.
- Endpoint HTTP: 4xx/5xx, timeout, abort, error de red, JSON inválido y respuesta incompleta.
- Salud de servicios: clasificación individual para disponibilidad parcial; el fallo de un servicio no se declara como éxito de los demás.
- Reintentos acotados para solicitudes de catálogo y feed incremental.

La prueba dedicada `JS/Tests/MIG028SecurityPerformanceRegression.mjs` reúne nueve verificaciones de estos invariantes. Las suites de detalle siguen conectadas al runner general.

## Comparación con MIG-005

| Indicador | MIG-005 | MIG-028 |
|---|---:|---:|
| Suites de regresión | 306 | 512 |
| Pruebas aprobadas | 3,581 | 6,044 |
| Fallos | 0 | 0 |
| Duración workflow CI | ~30 s | ~41 s |

La regresión actual incorpora 206 suites y 2,463 pruebas aprobadas adicionales respecto a la línea base. La duración de CI mide checkout, preparación y ejecución del runner; no representa latencia de GPSpedia y no debe compararse con tiempos de aplicación.

### Mediciones de aplicación pendientes de Beta

No existen muestras comparables de navegador/servicios para p50/p95 de arranque, login, catálogo, Inbox, Drive o YouTube; tampoco bytes/tiempos reales de snapshot y deltas, llamadas por flujo ni lecturas/escrituras Spreadsheet. MIG-005 ya documenta esas métricas como pendientes por requerir navegador, credenciales y recursos desechables. Se mantienen diferidas sin inventar resultados.

## Límites de ejecución

Las pruebas de esta tarea son locales, estáticas, de contrato y con fixtures aislados. No se desplegaron proyectos Apps Script, no se modificaron propiedades, permisos ni configuraciones instaladas, y no se escribieron datos en Spreadsheet o Drive productivos.

## Cierre

MIG-028 queda completada en su alcance local automatizado. La medición de rendimiento extremo a extremo y las pruebas con deployments/recursos Beta reales continúan pendientes de la fase Beta.

**Siguiente tarea:** MIG-029.
