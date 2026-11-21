# Auditoría de concurrencia e idempotencia — Tutoriales

Fecha: 2026-11-21  
Repositorio: `infogpstech/GPSpedia`  
Rama de trabajo: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5`  
Fuente normativa: `NORMAS_DESAROLLO.md`

## Alcance

Migrar el alta y la edición de tutoriales para reducir y retirar el ScriptLock global sin perder identidad estable, unicidad de tema, autoría, compatibilidad con filas históricas A:G/A:H, solicitudes de vídeo pendientes, publicación incremental del catálogo ni recuperación ante respuestas inciertas.

## Estado actual observado

### Esquema y compatibilidad

- Hoja canónica: `Tutorial`.
- Columnas A:H: `ID`, `Tema`, `Imagen`, `comoIdentificarlo`, `dondeEncontrarlo`, `Detalles`, `Video`, `Colaborador`.
- `getTutorialSheet_` admite extensión histórica A:G a H solo cuando H no contiene datos sin encabezado. Rechaza esquemas A:E y datos H sin encabezado; no debe relajarse.
- IDs nuevos: `tut-{operationId}`, con `operationId` normalizado a minúsculas. El cliente conserva el ID para reintentos y solicitudes de aprobación.

### Alta — `handleAddTutorial`

- Normaliza tema (máximo 30), campos descriptivos (máximo 700), colaborador verificado y URL de vídeo vacía.
- Hace preflight de solo lectura por ID; un replay idéntico devuelve la fila original y un payload diferente con el mismo ID se rechaza.
- Si no existe el ID, adquiere ScriptLock, vuelve a leer, verifica unicidad del tema normalizado y anexa una fila completa con `appendRow`.
- Confirma la fila por ID y verifica sus ocho columnas. Si falla `flush`, busca la fila persistida y devuelve éxito solo si coincide.
- El lock sigue protegiendo la unicidad de título frente a altas concurrentes. No se puede retirar solo por el hecho de tener un ID determinista.

### Edición — `handleUpdateTutorialItem`

- Hace preflight de no-op: si los campos solicitados ya coinciden, devuelve éxito sin lock ni escritura.
- Para cambios reales adquiere ScriptLock, vuelve a leer la fila, valida título único y bloquea renombrados cuando hay solicitudes de vídeo pendientes para el ID o el título histórico.
- Escribe B:F con `setValues` sobre la fila existente y verifica después de `flush`. Es una mutación in-place que puede perder actualizaciones si se elimina el lock sin control de versión/expected hash.
- La edición por ID es preferente; la edición histórica por tema se permite solo si el tema identifica una fila única.

### Lectura y consumidores

- `findTutorialById_` usa TextFinder/fallback acotado a columna A y actualmente rechaza cualquier ID físico duplicado.
- `findTutorialRow_` resuelve por ID o por título único. `tutorialTitleExists_` normaliza acentos/espacios y lee solo columna B.
- `buildTutorialCatalogChange_` proyecta la fila localizada a un upsert `tutoriales`; `publishTutorialCatalogChange_` publica después de aprobar/rechazar.
- CATALOG (`JS/Services/catalog.js`) lee directamente todas las filas de `Tutorial` y las mapea con el contrato A:H; no existe proyección de versiones ni deduplicación por ID.
- Las aprobaciones de vídeo localizan el tutorial con `findTutorialRow_` y actualizan la columna G. Cualquier nuevo journal debe preservar esa transición y el bloqueo de renombrado con solicitudes pendientes.
- El coordinador declara `addTutorial`, `updateTutorialItem`, `submitVideoForApproval`, `approveVideo` y `rejectVideo` bajo el dominio `TUTORIAL`.

## Riesgos

1. Dos altas con operationId diferentes pueden pasar el preflight simultáneamente y reclamar el mismo título antes de que cualquiera anexe la fila.
2. Dos ediciones reales pueden leer la misma versión y sobrescribirse; retirar el lock sin expected hash/version permite pérdida de campos.
3. Los IDs repetidos actualmente se tratan como corrupción; una migración append-only debe distinguir replays de versiones/eventos válidos.
4. La lectura directa de CATALOG y los cambios incrementales deben compartir exactamente la misma proyección para no mostrar versiones distintas.
5. Las aprobaciones de vídeo escriben G y deben convivir con la proyección de ediciones sin revertir o perder el vídeo aprobado.
6. Una reserva de título sin fila/evento recuperable puede bloquear un tema; el protocolo debe tener replay/reconciliación determinista y no borrar reservas por una lectura incierta.
7. Las filas históricas sin ID y el lookup por tema único deben seguir editables sin inventar IDs ni reinterpretar columnas.

## Estrategia requerida

- Introducir una fuente append-only/versionada para crear y editar tutoriales con identidad de operación, payload hash, tutorialId, expected source hash y snapshot de campos editables.
- La proyección debe empezar desde filas históricas de `Tutorial`, aplicar eventos en orden físico, conservar la primera creación por ID y aceptar una actualización solo si su expected hash coincide con la versión previa.
- La unicidad del título debe resolverse en la misma secuencia append-only, incluyendo renombrados; las solicitudes simultáneas deben producir un único ganador y el perdedor debe recibir conflicto sin materializar cambios.
- Mantener una proyección común para `findTutorialRow_`, `buildTutorialCatalogChange_` y CATALOG. Las aprobaciones de vídeo deben actualizar únicamente el campo Video sin retroceder los campos versionados.
- Preservar el no-op preflight, las validaciones de aprobación pendiente, autorización de Desarrollador, esquema A:H, IDs históricos y mensajes/contratos de UI.
- No sustituir ScriptLock por UserLock. Retirar el lock solo cuando las escrituras activas estén respaldadas por el journal/proyección y las regresiones de concurrencia estén aprobadas.

## Pruebas requeridas

- Dos altas concurrentes: mismo operationId/igual hash; mismo operationId/hash distinto; distinto operationId/mismo título normalizado; títulos con acentos/espacios.
- Dos ediciones concurrentes sobre la misma versión: mismo payload y payloads distintos; expected hash obsoleto; cambios simultáneos en campos diferentes.
- Recuperación tras append/flush con respuesta perdida; reserva sin materialización; reintento idempotente.
- Compatibilidad A:G/A:H, registros sin ID, autoría, aprobación de vídeo pendiente, aprobación/rechazo y edición de Video.
- Lectura CATALOG completa, feed incremental, snapshots y cachés deben coincidir en el mismo tutorial proyectado.
- Validación real de concurrencia en Beta aislada. No desplegar ni modificar producción.

## Secuencia de trabajo

1. Implementar y probar el journal/proyector y compatibilidad de lectura.
2. Migrar `handleAddTutorial` y sus reintentos.
3. Migrar `handleUpdateTutorialItem` con expected hash y eventos append-only.
4. Integrar CATALOG, feed incremental y aprobaciones de vídeo.
5. Ejecutar regresión integral y preparar Beta aislada.


## Implementación fase 1 — alta lock-free y reservas de título (2026-11-21)

- Se añadió la hoja append-only `TutorialTitleEvents` (A:H: operationId, eventHash, tutorialId, action, titleKey, previousTitleKey, payloadHash, createdAt). Su inicialización tolera que dos solicitudes intenten crear la hoja simultáneamente.
- `handleAddTutorial` ya no solicita ScriptLock. Conserva preflight por ID, normalización de contenido, comprobación de títulos históricos y agrega una reserva `CLAIM` antes de anexar la fila A:H.
- El ledger usa first-write-wins por operationId y por título normalizado. El mismo operationId con payload distinto se rechaza; dos operationIds distintos que reclaman el mismo título dejan un único propietario. El perdedor no materializa la fila.
- `handleUpdateTutorialItem` sigue bajo ScriptLock para las mutaciones B:F in-place. Cuando renombra un tema, anexa un evento `RENAME` que reclama el nuevo título y libera el anterior antes de escribir; esto coordina altas lock-free y renombrados concurrentes.
- `findTutorialById_` conserva la primera fila física como canónica ante reintentos duplicados. CATALOG proyecta una sola fila por ID y descarta copias físicas posteriores, preservando la primera escritura.
- Se preservan esquema A:H, compatibilidad A:G, filas históricas sin ID, IDs `tut-{operationId}`, autoría verificada, aprobación pendiente de vídeo y publicación del feed.
- Regresión CI `44876830826` SUCCESS: 258 suites, 3097 pruebas aprobadas, 0 fallos; health read-only `44876830897` SUCCESS. Pages `44876830484` estaba queued al registrar.
- **Estado parcial:** alta lock-free implementada; edición de campos sigue in-place bajo lock. No retirar el lock de edición hasta introducir expected hash/version y proyección de versiones que no revierta la columna G escrita por aprobaciones de vídeo. Concurrencia real de Sheets/Drive queda diferida a Beta aislada. No se desplegó Apps Script ni se modificó producción.


## Implementación fase 2 — ediciones descriptivas append-only (2026-11-21)

- Se añadió `TutorialEditEvents` (A:F: operationId, payloadHash, tutorialId, expectedHash, snapshotJson, createdAt). Cada evento contiene snapshot D:F (`comoIdentificarlo`, `dondeEncontrarlo`, `Detalles`) y el hash de la versión sobre la que se construyó.
- Para tutoriales con ID persistente (`tut-...`), las ediciones sin cambio de título ya no adquieren ScriptLock ni actualizan B:F in-place: anexan evento con operationId determinista derivado de tutorialId, expectedHash y payload. La proyección acepta solo eventos cuyo expectedHash coincide con la versión vigente; solicitudes concurrentes basadas en la misma versión tienen un único ganador.
- Los reintentos idénticos reutilizan el mismo operationId. Eventos obsoletos quedan en el ledger pero no sobrescriben la versión vigente. La proyección reconoce cadenas materializadas para que un replay previo siga siendo idempotente.
- `findTutorialRow_` aplica la proyección D:F. CATALOG aplica el mismo orden de eventos al leer la hoja, sin modificar título, imagen, vídeo ni colaborador. Las aprobaciones de vídeo continúan escribiendo G en la fila base y no se revierten al proyectar eventos D:F.
- Las ediciones que cambian el título y las filas históricas sin ID todavía usan ScriptLock y escritura in-place. Los renombrados reservan el título en `TutorialTitleEvents` antes de modificar la fila, coordinándose con altas lock-free.
- Pruebas focalizadas: `TutorialIntegrity` 34/34 PASS; `FeedbackTutorialPreflightOutsideLock` 7/7; `FeedbackTutorialLookupBoundedRead` 6/6; `FeedbackTutorialUpdateTitleLookupBoundedRead` 5/5; `FeedbackTutorialUpdateNoopPreflight` 6/6. PyS se mantiene en 56/56 y 22/22.
- CI `44877806419` SUCCESS: 258 suites, 3101 pruebas aprobadas, 0 fallos; health read-only `44877806406` SUCCESS; Pages `44877806381` SUCCESS. HEAD: `af2adefbd20ff450449cf8fc78f6e14d1aee733b`.
- **Estado parcial:** alta y ediciones descriptivas lock-free; renombrados y edición de filas legacy siguen bajo lock. La concurrencia real queda diferida a Beta aislada. No se desplegó Apps Script ni se modificó producción.

## Endurecimiento del ledger de títulos — 2026-11-21

- Hallazgo: readTutorialTitleEvents_ aceptaba filas cuyo eventHash no se correspondía con sus campos y toleraba el mismo operationId repetido con un eventHash diferente, registrando el conflicto sin detener la proyección.
- Impacto: una reserva de título contradictoria podía quedar oculta por first-write-wins y el mapa de propietarios podía proyectarse desde un ledger alterado o ambiguo.
- Corrección: cada fila ahora recalcula y verifica eventHash contra operationId, tutorialId, acción, título normalizado, título anterior y payloadHash. Un hash inválido o un operationId con eventos contradictorios detiene la lectura y exige reconciliación. Duplicados físicos del mismo evento íntegro siguen aceptándose.
- Regresión: TutorialIntegrity cubre conflicto de operationId y hash manipulado.
- CI HEAD ea04e631692b0adeb29918ffdecfe4f95b929848: 258 suites, 3103 pruebas aprobadas, 0 fallos; health read-only SUCCESS. Pages estaba en ejecución al cerrar esta adenda.
- Esto endurece la fase actual, pero no migra renombrados: handleUpdateTutorialItem todavía mantiene ScriptLock para cambios de título y filas legacy sin ID.
