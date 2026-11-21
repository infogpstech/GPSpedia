# GPSpedia — Tareas activas

Fecha: 2026-11-21
Repositorio: `infogpstech/GPSpedia`
Rama de trabajo: `GPSpedia2.2.5_work`
Rama base protegida: `GPSpedia2.2.5`
Fuente normativa única: `NORMAS_DESAROLLO.md`

## Historial
- Registro anterior: `Tareas_Activas_Archive/Tareas_Activas_2026-11-20_pre-rotacion.md`.
- Registro archivado en esta rotación: `Tareas_Activas_Archive/Tareas_Activas_2026-11-21_pre-rotacion.md`.
- Manifiesto: `Tareas_Activas_Archive/manifest.md`.
- Los archivos archivados son inmutables; este es el registro operativo vigente.

## Estado Git y CI confirmado
- HEAD de código: `67315cd4d2d049b7363dccd865e884c978a82dad`.
- CI: 277 suites, 3,225 pruebas aprobadas, 0 fallos.
- Health de servicios read-only: SUCCESS.
- GitHub Pages build/deployment: SUCCESS.
- Rama base: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones.

## Implementaciones locales completadas

### CATALOG / ADMIN
- [x] Navegación CATALOG con rangos mínimos.
- [x] `getContributionCandidates` omite hojas de logos, tutoriales, ledgers de tutoriales y Relay; conserva Cortes, FeedbackLikes y AportesVehiculo y la proyección global.
- [x] `getVehicleProjection` lee ID/VIN globales y solo una fila completa.
- [x] `getAdminProjectedVehicleFieldSnapshot_` usa consulta dirigida.
- [x] `getReplacedImages` reutiliza eventos mínimos de CATALOG bajo `GPSpedia_CATALOG_TRAFFIC_SECRET`, evitando la segunda lectura del ledger en ADMIN.
- [x] Detalle interno protegido por secreto; sin secreto o con CATALOG legacy, fallback anterior. El endpoint ordinario no expone eventos internos.
- [x] Se conserva el escaneo global de referencias Drive antes de acciones destructivas.
- [x] Se revisó la proyección de candidatos: casi todas las columnas de Cortes intervienen en campos, likes, orden o conflictos; fragmentar rangos no aporta ahorro material demostrado.

### Ciclo de imágenes
- [x] Cache miss visible reutiliza la imagen ya cargada para miniatura cuando CORS lo permite; fallback no-CORS conserva visualización y omite persistencia insegura.
- [x] Precargas redundantes de actualización/inserción retiradas; FIFO concurrencia 2 y sin prefetch activo de 15 vehículos.
- [x] Alta de cortes: valida 10 MiB, MIME y Data URL antes de Base64.
- [x] Imágenes suplementarias: valida tamaño, MIME y Data URL antes de Base64.
- [x] ADMIN image upload: valida tamaño/MIME en cliente; backend compara MIME Data URL/declarado y limita 10 MiB decodificados.
- [x] Logotipos: PNG/SVG/WEBP, Base64 canónico, firma binaria y extensión coherente.
- [x] Reportes, sugerencias y PyS conservan sus controles previos de MIME, tamaño y firma.
- [x] No se fijó límite nuevo para logos sin revisar los tamaños históricos.

### Interfaz
- [x] Auditoría y consolidación CSS de encabezados en un bloque contiguo, preservando Tutorial/Relay y el cierre anidado del modal de corte.
- [x] Contratos CSS de cascada y layout responsive.
- [x] P0 de aportes, P1 de caché de vistos, PyS, Tutoriales, Inbox y búsqueda agrupada constan como cerrados localmente en los registros históricos.

## Trabajo local pendiente — auditoría integral de rendimiento

### P0 — mapa de llamadas y medición
- [ ] Mapear navegador → endpoint → handler → dependencias para AUTH, USERS, WRITE, FEEDBACK, ADMIN, CATALOG, UTILITIES y COORDINATOR.
- [ ] Inventariar `UrlFetchApp.fetch`, wrappers, `routeAction`, reintentos, publicaciones y llamadas entre proyectos.
- [ ] Establecer línea base de requests, bytes, p50/p95, lecturas/escrituras y esperas para catálogo, búsqueda, detalle, aportes, Inbox, imágenes y vídeos.
- [ ] Revisar telemetría para evitar viajes de red, locks, escrituras o esperas en acciones ordinarias.
- [ ] Completar matriz del flujo de catálogo: snapshot/reset, feed incremental, refresh post-edición, caché local y sincronización PyS.

### P0 — AUTH/USERS y excepciones de sesión
- [ ] Completar mapa de consumidores de `touchSession`, `acceptTerms`, `validateSession`, login, recuperación, logout, `createUser` y `deleteUser`.
- [ ] Determinar si `touchSession`/`acceptTerms` generan llamadas o leases redundantes, contrastando con §15.
- [ ] Clasificar leases AUTH y conservar solo excepciones justificadas por §15: cierre remoto, invalidación/limpieza de sesión/caché, eliminación de cuenta y bloqueo temporal por intentos fallidos.
- [ ] Resolver y probar la carrera USERS `createUser` ↔ AUTH `deleteUser`.
- [ ] Verificar caché de actor e invalidación por revocación/cambio de rol/logout/eliminación.
- [ ] Detectar lecturas de Users/ActiveSessions y revocaciones duplicadas dentro de una operación.

### P1 — servicios, aportes y catálogo
- [ ] Auditar WRITE, FEEDBACK y ADMIN de extremo a extremo: operaciones, idempotencia, Drive/Spreadsheet, read-back y publicaciones.
- [ ] Auditar CATALOG/Coordinator: deltas, cursores, snapshots, resets e invalidaciones; conservar snapshots completos para inicio/reset/recuperación.
- [ ] Revisar refresh completo `getCatalogData` al cerrar edición y sustituirlo solo si un delta preserva fuentes, cursores y concurrencia.
- [ ] Medir telemetría ADMIN y confirmar que no se ejecuta en navegación/aportes ordinarios.

### P1 — imágenes, vídeos y archivos
- [ ] Diseñar y medir compresión/redimensionado con corpus técnico real; preservar legibilidad, transparencia, MIME/firma, metadatos, SHA-256 e idempotencia.
- [ ] Revisar tamaños históricos de logos antes de decidir límite.
- [ ] Medir CORS, PNG alfa, cache hit/miss, primera pintura, bytes, memoria y cancelación en navegador real.
- [ ] Revisar cola de compresión, cancelación/reintentos y claves de idempotencia.
- [ ] Trazar vídeos/YouTube y retirar consultas solo con medición.
- [ ] Medir por separado cliente, red, Apps Script, Drive y proyección CATALOG.

### P2 — optimización y verificación integral
- [ ] Revisar listeners, polling, timers, observers, inicialización/renderizados duplicados y consultas al navegar.
- [ ] Revisar IndexedDB y cachés sin bloquear el primer render.
- [ ] Añadir pruebas de no duplicación y fallos parciales; ejecutar regresión integral y comparación antes/después.
- [ ] Documentar llamadas retiradas/conservadas y su justificación.

## Validaciones diferidas a Beta
- [ ] AUG-159: aportes concurrentes, candidatos, correcciones y recuperación ADMIN en Spreadsheet/Drive aislados.
- [ ] AUG-160: cargas ADMIN/ImageUploadEvents, pérdida de respuesta, file_missing, metadatos alterados y fallos parciales.
- [ ] AUG-161 y pruebas relacionadas de PyS, tutoriales, vídeos, Inbox y mutaciones en proyectos aislados.
- [ ] Concurrencia real appendRow, entre proyectos, pérdida de respuesta y recuperación multihoja.
- [ ] Validación visual de modales, Tutorial/Relay, escritorio, Android/PWA, modo oscuro y desbordamiento.
- [ ] Validación del ciclo de imágenes: CORS, PNG alfa, cache hit/miss, calidad, bytes, memoria, primera pintura y cancelación.
- [ ] Safe Apply no se ejecuta hasta disponer de preview, ACL y rollback autorizados.

## Restricciones
- No modificar `GPSpedia2.2.5`.
- No desplegar Apps Script ni modificar endpoints, Spreadsheet, Drive, secretos o propiedades productivas sin autorización.
- Beta solo con deployments, cuentas, Spreadsheet y Drive aislados; comenzar por los comandos seguros de sincronización de la matriz Beta.
- No retirar escaneo global Drive ni controles de idempotencia/recuperación sin equivalencia demostrada.

## Siguiente paso exacto
Continuar el P0 de auditoría integral: mapear navegador → endpoint → handler y establecer línea base de llamadas, bytes, lecturas y latencia.
