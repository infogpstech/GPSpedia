# Auditoría de navegación, catálogo e IndexedDB
Fecha: 2026-11-22
Rama: `GPSpedia2.2.5_work`
HEAD validado: `55fa1198900b472a2f945a8f3b6c598db9f79bb9`

## Hallazgo corregido: refresco posterior al alta de Tutorial

`openAddTutorialModal` usaba `routeAction("getCatalogData")` directamente después de registrar un tutorial, forzando una instantánea completa aunque el sistema ya dispone de feed incremental.

Corrección:
- Primero invoca `window.auth.loadInitialData(true, { silent: true })`, que hidrata desde caché y aplica deltas del feed.
- Solo solicita `getCatalogData` completo si el delta falla o no deja una instantánea completa.
- Comprueba que la sesión sigue siendo la misma antes/después de cada operación.
- Antes de aplicar el fallback completo compara la referencia de `catalogData`; si otra sincronización actualizó el estado mientras llegaba la respuesta, conserva el estado más reciente y descarta la respuesta tardía.
- Contrato `TutorialCatalogRefreshDeltaFirst.mjs`: 6/6 PASS.

## Revisión de las demás llamadas de catálogo

- `refreshCatalogAfterEdit_` ya aplica delta primero y usa snapshot completo solo como fallback.
- La restauración de un modal de edición obtiene un snapshot antes de calcular campos pendientes y otro después de escribir para verificar cada campo. Son lecturas de verificación con propósito distinto; no se sustituyen por un delta parcial.
- El modal de asociación de modelos consulta `getCatalogData` solo si `catalogData.cortes` no está disponible.
- El detalle PyS consulta catálogo solo si la colección de cortes está vacía; el estado local es la primera fuente.
- `loadPysData` centraliza cache, promesa compartida y refresh; las mutaciones invalidan explícitamente la caché antes de volver a leer.
- Las lecturas de inventario ADMIN y proyecciones CATALOG se documentaron en la auditoría FEEDBACK/ADMIN; son operaciones explícitas y no se disparan en navegación ordinaria.

## IndexedDB y primer render

- `auth.loadInitialData` inicia en paralelo la lectura de estado IndexedDB y CacheStorage; una carrera con timeout de 3 s permite continuar con una caché utilizable sin esperar indefinidamente una apertura bloqueada.
- Una instantánea completa local se procesa en memoria antes de sincronizar red. El feed incremental se consulta con el cursor persistido; se solicita snapshot completo solo si falta cursor, se pide reset o la caché es inválida.
- La sincronización PyS se inicia en paralelo cuando corresponde y comparte promesa/cache.
- `offline.initDB` mantiene una sola promesa de apertura; agotar el timeout de un consumidor no inicia otra apertura IndexedDB en paralelo. El reintento respeta una ventana de recuperación de 15 s tras error definitivo.
- `performOp` confirma solo al completar la transacción IndexedDB, no al resolver una solicitud aislada.
- Persistencia IDB/CacheStorage es secundaria al catálogo ya procesado en memoria; los errores de persistencia se registran sin descartar la respuesta remota.

## Resultado

**Revisión estática completada; se retiró una lectura completa de catálogo del camino habitual de alta de Tutorial y se conserva fallback completo para recuperación.** No se eliminaron snapshots que protegen restauraciones, integridad o primer arranque.

## Validación

CI HEAD `55fa1198900b472a2f945a8f3b6c598db9f79bb9`:
- `TutorialCatalogRefreshDeltaFirst`: 6/6 PASS.
- `CarouselResizeListenerLifecycle`: 5/5 PASS.
- Regresión: 295 suites / 3,446 pruebas / 0 fallos.
- Health read-only: SUCCESS.
- Pages build/deployment: en curso al momento de cerrar esta auditoría.

## Pendiente de Beta

- Medir en Android/PWA y escritorio el tiempo de primer render, latencia de IndexedDB, hit/miss y uso de CacheStorage.
- Medir cuántas llamadas completas se evitan al crear Tutoriales y al navegar.
- No retirar snapshots de restauración ni lecturas de verificación sin un reemplazo que conserve el mismo criterio de integridad.
