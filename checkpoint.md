# GPSpedia — Checkpoint de continuidad

Fecha de actualización: 2026-11-22
Repositorio: `infogpstech/GPSpedia`
Rama de trabajo autorizada: `GPSpedia2.2.5_work`
Rama base protegida: `GPSpedia2.2.5`
Fuente normativa única: `NORMAS_DESAROLLO.md`

## Rotación e historial

- El checkpoint acumulado anterior se conserva íntegro en `Checkpoint_Archive/checkpoint_2026-11-22_parte_005.md`.
- El archivo archivado contiene 198,145 caracteres Unicode y fue releído desde GitHub; coincidió exactamente con el checkpoint anterior (blob SHA `01737733333430a7378a46d85fefd2b2b9117132`). No se truncó ni reescribió el historial.
- Las partes anteriores del archivo y su manifiesto permanecen intactos.

## Estado Git verificado

- HEAD de la rama de trabajo al iniciar esta continuidad: `0caf0de185f481086bf9c81bac7f289c925d23c0`.
- Commit de rotación documental: `68b6329c3fce13f34781a7cdb3b3229f03a918cc`.
- HEAD de la base protegida: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Comparación posterior a la rotación: 6,944 commits ahead / 0 behind. La base no se modificó.
- No se desplegó Apps Script ni se modificaron endpoints, Spreadsheet, Drive, secretos, propiedades o datos productivos.

## Última actividad completada antes de esta continuidad

### P1 CATALOG — auditoría de callers de publicación

- Se revisaron los callers de publicación en WRITE, FEEDBACK, ADMIN, SharedMutationClient y Coordinator.
- Se verificó publicación posterior a la mutación confirmada, batching ADMIN de hasta 50 elementos, requestId idempotente y recuperación mediante reset cuando falla snapshot/publicación.
- Contratos registrados: WriteCatalogPublicationIsolation 7/7, FeedbackCatalogPublicationIsolation 5/5, AdminCatalogPublicationIsolation 6/6 y CatalogChangeFeed 36/36 PASS.
- El checkpoint anterior registra CI HEAD `49ff3a6351df6e700d8325ba630a41af67ce8f61`: 293 suites / 3,424 pruebas / 0 fallos; build, health y report-build-status SUCCESS. No se repitió esa CI en esta actividad.
- Estado: revisión local de callers completada; las pruebas reales externas permanecen sujetas a Beta aislada.

## Actividad realizada en esta continuidad

### Plan de trabajo P1 — imágenes, vídeos y archivos

Se revisaron las normas vigentes, README, contexto operativo, tareas activas, el checkpoint previo y las auditorías de ciclo de miniaturas y cargas multimedia. Se confirmó que la siguiente actividad pendiente es P1 de imágenes/vídeos/archivos, no la migración de `handleAddProblem`.

**Corrección de continuidad PyS:** la auditoría `AUDITORIA_P2_CARGAS_ARCHIVOS.md` registra P2.2b (`handleAddProblem`) como completada localmente. La auditoría `AUDITORIA_PYS_APPEND_ONLY_2026-11-21.md` también registra el cierre lock-free de creación PyS y sus validaciones. No reabrir ni repetir esa tarea salvo evidencia nueva de defecto.

#### Objetivo

Mejorar rendimiento, consumo de memoria y resiliencia del ciclo multimedia sin reducir legibilidad técnica, transparencia PNG, integridad de archivos, seguridad, idempotencia ni capacidad de recuperación. Evitar refactorizaciones preventivas si la implementación actual ya satisface el requisito y las pruebas lo demuestran.

#### Alcance y secuencia

1. **Inventario y línea base**
   - Mapear las rutas de carga, lectura, compresión, redimensionado, precarga, caché y presentación de imágenes.
   - Identificar consumidores y contratos en catálogo, tarjetas, modales, logos, aportes WRITE/FEEDBACK y ADMIN.
   - Localizar límites actuales, variantes, formatos, claves de caché, TTL, política LRU, ObjectURL, cola y mecanismos de cancelación.
   - Distinguir correcciones ya cerradas de problemas todavía pendientes; no repetir la purga global ni el fetch duplicado ya corregidos en el ciclo de miniaturas.
   - Registrar conteos/mediciones reproducibles disponibles antes de cambiar código; no atribuir ahorros sin medición.

2. **Compresión, redimensionado y calidad**
   - Revisar dimensiones de origen y variantes generadas, orientación, proporción y comportamiento con imágenes pequeñas.
   - Verificar preservación de transparencia PNG, legibilidad de diagramas/cableado, MIME declarado y firma real del archivo.
   - Revisar metadatos que deban conservarse o eliminarse, SHA-256, tamaño final y consistencia entre bytes almacenados y huella.
   - Evaluar formatos y parámetros de compresión solo con evidencia; no introducir pérdida visual en imágenes técnicas ni cambiar formatos por suposición.
   - Mantener límites de carga y contratos de almacenamiento actuales salvo que una medición y el requisito justifiquen un ajuste.

3. **Caché, cola y memoria**
   - Revisar `thumbnailCompressionQueue.js`, `imageObjectUrlCache.js` y los consumidores de la caché de miniaturas.
   - Conservar el límite de concurrencia actual mientras no haya medición que justifique otro valor; verificar FIFO y recuperación tras error.
   - Evaluar prioridad de imágenes visibles frente a precarga de los últimos 15 vehículos, deduplicación single-flight, cancelación de trabajo obsoleto y comportamiento al cambiar de vista/sesión.
   - Verificar TTL de 30 días, límite LRU de 200 variantes y presupuesto ObjectURL de 64 MiB; comprobar que la liberación de URL no rompe elementos que aún la consumen.
   - IndexedDB/caché es opcional: su indisponibilidad, cuota agotada o error no debe bloquear la visualización ni acciones independientes, ni provocar limpieza destructiva de almacenes.

4. **Logos y tamaños históricos**
   - Inspeccionar límites y validaciones actuales de logos.
   - Determinar qué tamaños históricos pueden consultarse desde fuentes locales disponibles.
   - No decidir ni cambiar un límite hasta disponer de una muestra representativa; si el inventario depende de Drive/Spreadsheet real, dejarlo para Beta aislada y documentar el método de medición.

5. **Vídeos y aprobación YouTube**
   - Auditar `JS/Frontend/youtubeUpload.js`, sus consumidores y el flujo backend de inicialización, registro, aprobación, rechazo y publicación.
   - Preservar la transferencia directa resumable navegador→YouTube y los bloques de 8 MiB; no trasladar el binario a Apps Script ni añadir una ruta proxy.
   - Revisar persistencia/recuperación IndexedDB, identificador idempotente, pausa, reanudación, cancelación, expiración de sesión, respuesta final, limpieza de registros y recuperación de vídeos ya completados.
   - Verificar que aprobación/rechazo mantiene RBAC, idempotencia y publicación correcta. Si el flujo ya está cubierto y no aparece defecto, conservarlo sin cambios.

6. **Pruebas locales y regresión**
   - Ejecutar pruebas focalizadas existentes: `ThumbnailCacheDeduplication`, `ThumbnailCompressionQueueContract`, `ImageResolutionVariants`, `ImageObjectUrlLifecycle`, pruebas de carga/ledger de imágenes, contratos de logos y pruebas YouTube de cliente, checkpoints, recuperación, cancelación y aprobación.
   - Añadir pruebas solo para huecos demostrados: PNG alfa, MIME/firma, dimensiones, SHA-256, idempotencia, concurrencia, cola/cancelación, cuota IndexedDB, CORS y fallos parciales.
   - Ejecutar `node --check` sobre cada archivo de código modificado y las suites focalizadas afectadas.
   - Ejecutar la regresión integral del proyecto disponible y revisar el diff completo para descartar cambios ajenos.
   - Separar explícitamente pruebas ejecutadas, análisis estáticos y validaciones externas no realizadas.

7. **Validación Beta diferida**
   - Medir en navegador/dispositivo real CORS, PNG alfa, cache hit/miss, primera pintura, bytes transferidos, memoria, cancelación y competencia entre imágenes visibles y precarga.
   - Medir por separado tiempo de cliente, red, Apps Script, Drive y proyección CATALOG; no mezclar latencias ni inferir causas sin trazas.
   - Validar con corpus técnico representativo y recursos/cuentas/deployments aislados. No usar producción ni modificar endpoints o datos productivos.
   - Para cualquier bloque de pruebas Beta, comenzar obligatoriamente con estos comandos de sincronización segura (ajustar únicamente la ruta local):
     ```bash
     cd /ruta/local/GPSpedia || exit 1
     test "$(git remote get-url origin)" = "https://github.com/infogpstech/GPSpedia.git" || exit 1
     test "$(git branch --show-current)" = "GPSpedia2.2.5_work" || exit 1
     test -z "$(git status --porcelain)" || { echo "Árbol con cambios locales; detener sincronización"; exit 1; }
     git fetch origin GPSpedia2.2.5_work &&
     git pull --ff-only origin GPSpedia2.2.5_work &&
     git rev-parse --abbrev-ref HEAD &&
     git rev-parse HEAD
     ```
   - Nunca usar `reset --hard`, `clean`, force push ni comandos que descarten cambios locales. La ausencia de entorno Beta no bloquea el cierre local si las pruebas locales aplicables pasan.

#### Fuera de alcance

- No reabrir P2.2a, P2.2b ni P2.3 ya cerradas, salvo evidencia nueva.
- No alterar los flujos de escritura WRITE/FEEDBACK/ADMIN que ya tienen pruebas específicas.
- No cambiar el hash de imágenes, límites, formatos, permisos, RBAC, endpoints ni contratos por iniciativa propia.
- No ejecutar Safe Apply, limpieza o movimiento de archivos reales, ni despliegues Apps Script.
- No introducir dependencias o servicios externos sin necesidad demostrada.

#### Criterios de cierre

- Cada cambio responde a un hallazgo reproducible y tiene prueba de regresión.
- Calidad visual, transparencia, MIME/firma, tamaño, hash e idempotencia permanecen correctos.
- Caché/precarga no bloquea el primer render ni acciones independientes; errores de almacenamiento degradan de forma controlada.
- Reanudación/cancelación y aprobación de vídeo mantienen sus contratos.
- Pruebas locales pertinentes y regresión integral aprobadas; diff y referencias revisados.
- Validaciones de navegador real, Drive, YouTube y Apps Script quedan identificadas como pendientes Beta, sin presentarlas como ejecutadas.
- Auditoría, tareas, changelog y checkpoint reflejan únicamente cambios comprobados; commit y HEAD de la rama de trabajo verificados.

## Control de continuidad

- **Tarea realizada:** revisión del estado real, corrección de la tarea siguiente, elaboración del plan P1 multimedia y rotación sin pérdida del checkpoint.
- **Siguiente tarea:** ejecutar el inventario técnico de P1 imágenes/vídeos/archivos, empezando por las rutas frontend de imágenes y sus consumidores; todavía no se ha modificado código.
- **Contexto breve:** CATALOG/Coordinator quedó revisado en callers. La fase siguiente busca reducir coste y mejorar resiliencia del ciclo multimedia sin degradar la calidad técnica ni duplicar mecanismos ya corregidos.
- **Estado de la siguiente tarea:** PENDIENTE de ejecución.


## Actividad completada — 2026-11-21: inventario técnico multimedia

- **Tarea realizada:** inventario estático de las rutas frontend de imágenes, persistencia IndexedDB, compresión PNG, ObjectURL, cola, cargas ADMIN/FEEDBACK/PyS, logos y cliente resumable YouTube. Informe: `AUDITORIA_P1_MULTIMEDIA_INVENTARIO_2026-11-21.md`.
- **Hallazgos:** precarga de hasta 11 campos por cada uno de los últimos 15 vehículos sin prioridad visible/cancelación explícita; ruta de logos sin límite de bytes identificable; compresión PNG con variantes 300/800/1600 pendiente de validar con corpus técnico; búsqueda YouTube `getAll()` pendiente de medir por cardinalidad.
- **Preservado:** la purga global por imagen, el segundo fetch visible, single-flight, TTL 30 días, LRU 200, cola de concurrencia 2, ObjectURL 64 MiB y transferencia YouTube directa de 8 MiB no se modifican.
- **Validación:** auditoría estática únicamente. No se ejecutaron suites ni pruebas de navegador; CORS, alfa, primera pintura, bytes, memoria, logos históricos, Drive y YouTube real quedan pendientes de Beta aislada.
- **Siguiente tarea:** P1 — compresión, redimensionado y calidad visual con corpus técnico representativo; medir competencia entre precarga y recursos visibles antes de cambiar cola o parámetros.
- **Contexto breve:** el inventario confirma mecanismos de protección existentes y delimita riesgos medibles; no hay base para cambiar límites, formatos o concurrencia sin datos reales.
- **Estado:** inventario COMPLETADO; fase de calidad/medición PENDIENTE.


## Actividad completada — 2026-11-21: evaluación de compresión y corpus visual

- **Tarea realizada:** inspección de la generación de miniaturas y del corpus versionado. Informe: `AUDITORIA_P1_CALIDAD_COMPRESION_2026-11-21.md`.
- **Resultado:** el código limita el ancho sin ampliar, mantiene proporción y persiste PNG; el redimensionado puede perder detalle fino aunque PNG conserve alfa. El repositorio no contiene un corpus técnico representativo: las imágenes activas son logos, iconos, verificación y capturas de interfaz.
- **Validación:** inspección estática de funciones, suite contractual y árbol de imágenes/tamaños. No se ejecutó Node/CI ni navegador; no se midieron dimensiones/bytes finales, calidad visual, orientación o CPU.
- **Decisión:** no cambiar variantes, formato, calidad, límites ni concurrencia sin corpus técnico autorizado y medición reproducible.
- **Siguiente tarea:** P1 — medir competencia entre precarga y recursos visibles; preparar harness aislado de rendimiento para cola, bytes, tiempos y prioridad sin alterar el contrato FIFO actual.
- **Contexto breve:** no hay evidencia visual para justificar cambios de compresión. El siguiente riesgo cuantificable es si la precarga ocupa la cola antes de las imágenes visibles.
- **Estado:** evaluación estática COMPLETADA; prueba visual con corpus PENDIENTE de muestras autorizadas/Beta.


## Actividad completada — 2026-11-21: análisis de competencia visible/precarga

- **Tarea realizada:** trazado de `saveCatalog`, `saveCatalogWithCursor`, `saveViewedItem`, `cacheItemImages` y ambas rutas de compresión.
- **Hallazgo:** snapshot de 15 vehículos × 11 campos puede encolar hasta 165 trabajos teóricos. La cola actual limita a 2 activos y FIFO, pero las imágenes visibles usan la misma cola; una petición visible puede quedar detrás de precargas. Si comparte clave con una precarga pendiente, single-flight comparte la promesa y no permite elevar prioridad.
- **Decisión:** introducir prioridad alta para visible y baja para precarga, FIFO dentro de cada prioridad, con elevación de prioridad de una entrada single-flight ya encolada. No preemptar trabajos activos ni cambiar concurrencia 2.
- **Evidencia/diseño:** `AUDITORIA_P1_COLA_VISIBLE_PRECARGA_2026-11-21.md`.
- **Validación:** trazado estático y máximo teórico; no se ejecutó Node ni medición real de navegador.
- **Siguiente tarea:** implementar prioridad de cola y deduplicación elevable mediante pruebas contractuales antes de tocar producción.
- **Contexto breve:** la espera de recursos visibles es un riesgo demostrable por el orden FIFO actual; se requiere resolverlo sin duplicar la descarga/compresión de la misma variante.
- **Estado:** análisis COMPLETADO; implementación y benchmark Beta PENDIENTES.


## Actividad completada — 2026-11-21: prioridad visible en cola de miniaturas

- **Tarea realizada:** implementada prioridad explícita en `thumbnailCompressionQueue`: visible 10, precarga 0; FIFO estable dentro de cada prioridad; promoción de una tarea pendiente por clave; promoción anticipada antes de que single-flight llegue a encolar; las tareas activas no se interrumpen. Se conservan dos workers y `getStats()` compatible.
- **Integración:** `compressAndStoreThumbnailFromImage` marca solicitudes visibles con prioridad alta y promueve una precarga pendiente de la misma clave; `compressAndStoreThumbnail` usa prioridad baja.
- **Pruebas añadidas:** extensión de `ThumbnailCompressionQueueContract.mjs` para FIFO, prioridad, promoción single-flight, promoción anticipada, no-preemption, concurrencia y recuperación.
- **Validación:** pruebas añadidas pero aún no ejecutadas localmente. El push dispara el workflow `service-tests.yml`; verificar su resultado antes de considerar validada la implementación.
- **Siguiente tarea:** revisar resultados CI y añadir medición de cola/espera por prioridad; luego analizar cancelación segura por cambio de sesión/vista.
- **Contexto breve:** se evita que la precarga FIFO de catálogo retrase innecesariamente miniaturas visibles, sin duplicar una compresión single-flight ni cancelar operaciones compartidas.
- **Estado:** implementación registrada; validación CI pendiente.


### Ajuste de robustez — limpieza de promociones anticipadas
- Se añadió `clearPromotion(key)` a la cola y se invoca desde el `finally` de ambas operaciones single-flight. Evita retener una promoción si la operación termina antes de llegar a `queue.run` (por ejemplo, caché disponible o IndexedDB temporalmente no disponible).
- Se amplió el contrato con una prueba de limpieza de promoción no consumida.
- Commit de implementación inicial: `05e0225`; ajuste de limpieza en este commit.
- CI de la implementación inicial pendiente de verificación; este commit generará una nueva ejecución.


### Corrección de CI — resumen contractual de cola
- La ejecución CI del commit `05e0225` mostró que los asserts de prioridad se ejecutaron correctamente, pero el runner rechazó la suite porque su salida no incluía el resumen numérico `N/N PASS` que exige `RunServiceTests.mjs`.
- Se corrigió el resumen de `ThumbnailCompressionQueueContract.mjs` a `20/20 PASS` para conservar el contrato del runner. No fue un fallo de lógica de la cola; sí fue un fallo real de integración del runner.
- Se añadió limpieza de promociones anticipadas en el commit `e0bbc3e`.
- **Siguiente:** validar el nuevo workflow del commit actual; no cerrar prioridad hasta que CI pase.


### Corrección de dependencia de test single-flight
- CI del commit `0fac4f5`: la nueva suite de prioridad ya publicó resumen numérico, pero `ThumbnailCacheDeduplication.mjs` falló porque su wrapper aislado de `compressAndStoreThumbnail` no inyectaba la nueva dependencia `thumbnailCompressionQueue` usada en el `finally`.
- Se actualizó el harness para inyectar un doble de cola mínimo (clearPromotion/promote/run), preservando el aislamiento y el objetivo de probar single-flight.
- El fallo era de fixture de test, no de la cola productiva. Pendiente ejecutar CI nuevamente.


## P1 multimedia — métricas de cola de miniaturas (2026-11-22)

- CI del commit anterior 02788fbd4dd0fa754f091f6e8e1d351e68cd9a7e: workflow 44972971725 y job service-tests SUCCESS; comprobación de sintaxis y regresión aislada aprobadas.
- La rama base permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1; la rama de trabajo partió de HEAD 02788fbd4dd0fa754f091f6e8e1d351e68cd9a7e.
- Se añade diagnóstico efímero en thumbnailCompressionQueue.js: contadores por prioridad (encolados, iniciados, completados, fallidos y promovidos), activos/pendientes, espera y duración total/máxima.
- getStats() conserva exactamente su contrato; getPriorityStats() conserva exactamente su forma anterior; getMetrics() expone snapshot detallado sin claves, URLs ni datos de vehículos.
- El reloj puede inyectarse al crear la cola para pruebas deterministas; producción usa reloj monotónico cuando está disponible. No se persisten métricas ni se agregan requests.
- Siguiente: ejecutar contrato de métricas y CI; después revisar si una precarga obsoleta puede cancelarse de forma segura al cambiar vista/sesión sin afectar operaciones single-flight compartidas ni tareas activas.
- Estado: implementación preparada en la rama de trabajo; pendiente publicación/validación CI.


## P1 multimedia — cierre de métricas y cancelación (2026-11-22)

- Commit funcional: 3aa0d034ab8748ac603ba9958d72c238da7d35c4; correcciones de compatibilidad/contrato y tiempos: ba5745cf, dc6a12c7, c6d87ef6 y 369f66a7. HEAD final de esta actividad: 369f66a78cd3f95bbdef99a1feff027ba3e1e570.
- CI del HEAD final: workflow 44974498485 SUCCESS; job service-tests SUCCESS. Regresión: 293 suites / 3,435 pruebas / 0 fallos. `ThumbnailCompressionQueueContract`: 24/24 PASS. Health read-only 44974498458 SUCCESS.
- getStats() y getPriorityStats() conservan sus contratos originales. getMetrics() añade contadores efímeros por prioridad, espera y duración, sin claves, URLs, IDs de vehículos, persistencia ni requests adicionales.
- Revisión de cancelación: no se implementa. cacheItemImages se invoca desde snapshots de catálogo y vistos recientes; las imágenes son recursos compartidos que solo calientan la caché global. thumbnailCompressionInFlight_ deduplica por clave y puede compartir la promesa con la ruta visible. Cancelar por clave sin ownership/ref-count podría interrumpir un consumidor visible; además, fetch/bitmap/canvas/IndexedDB no comparten un mecanismo de cancelación uniforme.
- Rama base protegida verificada sin cambios: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- **Siguiente:** auditar estáticamente JS/Frontend/youtubeUpload.js y sus contratos de transferencia resumable, checkpoints IndexedDB, pausa/reanudación/cancelación, expiración e idempotencia, así como la aprobación posterior. No cambiar el flujo sin defecto reproducible.


## P1 multimedia — auditoría de YouTube (2026-11-22)

- Revisión estática completada de youtubeUpload.js, Services/feedback.js y contratos registrados en RunServiceTests.mjs.
- Confirmado: transferencia navegador→YouTube directa y resumable en bloques de 8 MiB; checkpoints IndexedDB por offset remoto confirmado; pausa aborta XHR y conserva offset; reanudación consulta Range; ID final validado; aprobación pendiente, idempotente por opVideoId y con ledger append-only/RBAC.
- Suites YouTube de cliente, persistencia, checkpoint, pausa, recuperación, borradores, modal/XSS, aprobación y estado están integradas en RunServiceTests. Último CI comprobado en HEAD fd8c9040: 293 suites / 3,435 pruebas / 0 fallos.
- Hallazgo no crítico: handleInitYouTubeUpload no persiste opVideoId→uploadUrl. Si se pierde la respuesta de inicialización, el reintento puede crear una segunda sesión resumable sin uso; no duplica por sí solo vídeos publicados. Requiere diseño de almacenamiento, concurrencia, expiración/renovación y limpieza; no se improvisa en esta auditoría.
- No se cambió código, tamaño de bloque, transferencia directa, RBAC ni aprobación. Validación real YouTube sigue reservada a Beta aislada.
- **Siguiente:** inventario de tamaños históricos de logos y revisión de límites; no cambiar límites sin muestra representativa.


## P1 multimedia — inventario de logos (2026-11-22)

- Revisados todos los assets de Images/: Logo_TemaOscuro.png (1,346,111 bytes) y tracklink_logo.png (2,883 bytes); sus copias bajo Olds tienen el mismo SHA, no son muestras adicionales. Los demás son iconos PWA, verificación o capturas UI.
- UI readLogoFileBase64_ y backend validateLogoImagePayload_ admiten PNG/SVG/WEBP, verifican MIME/Base64/firma, pero no imponen un máximo de bytes específico para logos.
- No se cambia límite: los recursos versionados no representan el inventario real de LogosMarca. Los tamaños históricos residen en Drive/Spreadsheet y no hay conector Drive/Sheets disponible en esta sesión; medir en Beta aislada de solo lectura antes de proponer límite.
- Evidencia: AUDITORIA_P1_LOGOS_TAMANO_2026-11-22.md.
- **Siguiente:** diseñar idempotencia durable de initYouTubeUpload ante respuesta perdida, incluyendo renovación 404/410, concurrencia y limpieza; mantener transferencia directa.


## P1 multimedia — validación final de métricas y decisión de idempotencia YouTube (2026-11-22)

- Commit `79b7e5c8ee6b47e58b8bd9c875d7eb4e2c9ef035`: la promoción anticipada single-flight ahora también incrementa la métrica de promociones; contrato ampliado.
- CI `44974885873` SUCCESS: 293 suites / 3,435 pruebas / 0 fallos; `ThumbnailCompressionQueueContract` 24/24 PASS; sintaxis aprobada.
- CI `44974805324` y health read-only `44974805341` del HEAD previo también SUCCESS; Pages build de `be13e982` SUCCESS.
- Revisión del hallazgo YouTube: una asociación durable opVideoId→uploadUrl reduciría sesiones huérfanas tras respuesta perdida, pero no se añade ScriptLock, lease ni espera durante cargas. NORMAS §15 exige retirar locks/serialización no indispensables y no bloquear operaciones de archivo. Sin un mecanismo atómico lock-free disponible, se conserva como riesgo bajo documentado: puede quedar una sesión resumable sin uso, pero no se duplica por sí sola la publicación de vídeo.
- La rama base permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- **Siguiente:** cerrar la revisión local P1 con un inventario de pruebas automatizadas y preparar el protocolo Beta aislado para: corpus técnico de imágenes, medición de cola/primera pintura y tamaños reales de logos; no ejecutar contra Drive/YouTube productivos.


## Protocolo Beta P1 multimedia preparado (2026-11-22)

- Se creó `lista_beta_adenda_2026-11-22_multimedia.md` y se incorporó al índice `lista_beta.txt`.
- La adenda comienza con los comandos obligatorios de árbol limpio, rama/origen verificados y sincronización fast-forward. Incluye corpus técnico, MIME/firma/SHA, variantes, transparencia, medición de cola y primera pintura, inventario Drive de solo lectura y pruebas resumables/aprobación YouTube.
- No se ejecutó ninguna prueba Beta ni se accedió a recursos productivos. Los deployments, Spreadsheet, Drive y canal YouTube aislados siguen siendo prerrequisitos.
- Siguiente: cerrar la verificación local P1 multimedia y dejar pendientes Beta explícitas; revisar después el backlog vigente antes de incorporar mejoras nuevas.


## P1 multimedia — cierre de revisión local y Beta pendiente (2026-11-22)

- HEAD de trabajo: `dbf8a73b0a0ab972a66a9333f2d5afc07d7121f5`; CI 44975028315 SUCCESS: 293 suites / 3,435 pruebas / 0 fallos; contrato de cola 24/24 PASS; health read-only 44975028307 SUCCESS. La base protegida sigue en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- P1 local: inventario estático de multimedia, prioridad visible/precarga, métricas de cola, contratos de caché/cola, revisión de cancelación, auditoría resumable YouTube, inventario de assets de logo versionados y protocolo Beta preparados.
- No se cambiaron límites de compresión ni tamaño de logo sin corpus representativo. No se añadió cancelación a single-flight compartido. No se añadió lock/lease a initYouTubeUpload; el posible orphan session por respuesta perdida queda como riesgo bajo documentado conforme a NORMAS §15.
- Beta pendiente: corpus técnico real autorizado; legibilidad/alfa/orientación/MIME/SHA; CORS/primera pintura/bytes/memoria; tamaños históricos de Drive/LogosMarca; YouTube resumable/aprobación en canal aislado.
- Protocolo: `lista_beta_adenda_2026-11-22_multimedia.md`, indexado en `lista_beta.txt`.
- Siguiente trabajo local independiente: retomar pendientes de FEEDBACK/ADMIN y optimización de lecturas según `Tareas_Activas.md`; no esperar a la Beta para avanzar en auditorías estáticas y contratos locales.


## FEEDBACK/ADMIN — auditoría estática end-to-end (2026-11-22)

- FEEDBACK: dispatcher y matriz RBAC revisados; actor de sesión confiable se resuelve una vez; handlers ordinarios sin ScriptLock global ni lease; reportes, sugerencias, adjuntos, PyS, Tutoriales, Inbox, YouTube, read-backs e invalidación CATALOG cubiertos por contratos integrados.
- ADMIN: actor cacheado y checks locales de rol; reserva WRITE y proyección CATALOG dirigidas; inventario de imágenes hace una consulta de candidatos y un escaneo de referencias, sin segunda llamada CATALOG en la misma acción; auditoría persistente best-effort al iniciar.
- Tres leases permanecen en operaciones de mantenimiento explícitas: saveUnusedImagesInventory, createCortesImageFolder, auditDriveImagesInCortes. No se retiran sin medir y demostrar sustituto de idempotencia/consistencia; no se aplican a aportes ordinarios.
- Sin cambios de código: no se identificó una llamada redundante de alta confianza que pueda retirarse sin evidencia de medición.
- Evidencia: AUDITORIA_FEEDBACK_ADMIN_END_TO_END_2026-11-22.md.
- Siguiente: revisar optimizaciones locales pendientes y, cuando haya entorno, medir las leases administrativas y las lecturas Drive/CATALOG en Beta aislada.


## Auditoría de servicios restantes — cierre estático (2026-11-22)

- AUTH: login/revocación reutilizan snapshots; invalidación de actor una sola vez; pruebas AuthSessionReadOptimization integradas.
- USERS: alta reutiliza snapshot; getUsers lee A:G; búsquedas por ID confirman celda puntual; pruebas UsersReadMinimization integradas.
- UTILITIES: una migración destructiva con staging/backup/rollback; contrato UtilitiesSecurity integrado. Lock/lease se conservan como protección de migración excepcional, pendientes de medición real.
- CATALOG: Spreadsheet handle único, snapshot de ScriptProperties y feed incremental idempotente ya optimizados.
- No se encontró otra duplicación de alta confianza para eliminar sin medición. Evidencia: AUDITORIA_SERVICIOS_RESTANTES_2026-11-22.md.
- Siguiente: mantener las mediciones externas en Beta aislada y retomar cualquier pendiente local nuevo solo con evidencia del backlog actual.


## P2 — listeners y ciclo de vida UI (2026-11-22)

- Hallazgo: crearCarrusel y renderPosiblesProblemasAccordion añadían listeners globales window.resize por cada render, reteniendo nodos eliminados. Corregido con listener global único/debounce y consulta dinámica de carruseles activos.
- Revisados main/auth/ui/navigation/catalogRequest/imageObjectUrlCache: timers Inbox y ADMIN son start-stop/singleton; listeners de conectividad tienen guardas; popstate se elimina; focus trap desconecta observer; AbortSignal limpia listeners; observer de ObjectURL es central.
- Test CarouselResizeListenerLifecycle 5/5 PASS. CI HEAD d97f487e SUCCESS: 294 suites / 3,440 pruebas / 0 fallos; health read-only y Pages SUCCESS.
- Evidencia: AUDITORIA_UI_LISTENERS_2026-11-22.md.
- Siguiente: revisar consultas repetidas al navegar y cachés/IndexedDB sin bloquear primer render.


## P2 — navegación, catálogo e IndexedDB (2026-11-22)

- Corregido refreshTutorialCatalog: feed incremental via auth.loadInitialData primero; snapshot completo solo como fallback; guardia de sesión y descarte de respuesta tardía si otro sync actualizó estado.
- Otras llamadas getCatalogData revisadas: refresh post-edición ya era delta-first; asociación/detalle PyS solo consultan si el catálogo no está; restauración conserva snapshots antes/después para verificar campos.
- IndexedDB: auth carga IDB y CacheStorage en paralelo, timeout de 3 s, cache-first, delta por cursor; offline.initDB comparte una apertura pendiente y performOp confirma al completar transacción.
- Tests: TutorialCatalogRefreshDeltaFirst 6/6 PASS; CarouselResizeListenerLifecycle 5/5 PASS. CI HEAD 55fa1198 SUCCESS: 295 suites / 3,446 pruebas / 0 fallos; health read-only SUCCESS; Pages build en curso al cierre.
- Evidencia: AUDITORIA_NAVEGACION_CATALOGO_CACHE_2026-11-22.md.
- Pendiente: medir primer render, IndexedDB, cache hit/miss, llamadas evitadas y memoria en Beta Android/PWA y escritorio.


## P2 — estado de navegación y validación (2026-11-22)

- Revisión de consultas al navegar completada: refresh de Tutorial delta-first con fallback y protección de sesión/respuesta tardía; otras llamadas completas solo por caché ausente, reset o verificación de restauración.
- IndexedDB/cache-first revisados estáticamente: apertura compartida, carrera IDB/CacheStorage, timeout y transacción confirmada. Métricas reales de primer render y memoria quedan en Beta.
- Último CI verificado HEAD `4dd0f9f437865e179e6c671bb3927b147a516e34`: 295 suites / 3,446 pruebas / 0 fallos; TutorialCatalogRefreshDeltaFirst 6/6; CarouselResizeListenerLifecycle 5/5; health read-only SUCCESS. Pages build en curso.
- Siguiente: revisión de inicializaciones/renderizados que puedan duplicar peticiones, observers, nodos o listeners; luego contratos transversales de fallos parciales/no duplicación.


## P2 — segunda fuga de listeners UI corregida (2026-11-22)

- Además de los carruseles, initAdminPanelListeners se ejecuta cada vez que se abre el panel ADMIN y acumulaba handlers en nodos estáticos: terminal keydown, campo de respaldo input (dos listeners) y botón de refresco de candidatos.
- Se reemplazaron por onkeydown/oninput/onclick; el handler input combina habilitación de reanudación Drive y reinicio de previews. Los handlers dinámicos permanecen con sus nodos.
- AdminPanelListenerLifecycle 8/8 PASS. CI HEAD `d01fb34480bf5a64cf29fca37e033e6c74083fb9`: 296 suites / 3,454 pruebas / 0 fallos; health read-only y Pages SUCCESS.
- La revisión global UI queda cerrada para listeners/timers/observers principales. Siguiente: revisar inicializaciones/renderizados duplicados y cobertura transversal de fallos parciales/no duplicación.


## P2 — cierre de revisión estática de inicialización/render UI (2026-11-22)

- Revisión estática completada de inicializadores ADMIN/Inbox, detalle, modales, carruseles, observers y helpers globales. No se encontró otra duplicación global de alta confianza después de corregir los handlers del panel ADMIN y listeners resize de carruseles.
- Los handlers persistentes se guardan con guardas o propiedades reemplazables; los handlers dinámicos se destruyen con los nodos; el ResizeObserver de detalle se desconecta antes de cada re-render; observers de modal se desconectan al cerrar.
- Contratos: CarouselResizeListenerLifecycle 5/5; TutorialCatalogRefreshDeltaFirst 6/6; AdminPanelListenerLifecycle 8/8; cola y requests mantienen tests de promoción, recuperación, abort y fallos.
- CI HEAD `ef50dd98896a0310f86fedc27930369850dc9def`: 296 suites / 3,454 pruebas / 0 fallos; health read-only SUCCESS; Pages build pendiente.
- Siguiente: validación DOM real, CPU/memoria, red y re-render en Beta Android/PWA/escritorio; después ampliar solo los casos de fallo parcial que la Beta reproduzca.


## Protocolo Beta — línea base por flujo (2026-11-22)

- Preparada `lista_beta_adenda_2026-11-22_linea_base.md` e indexada en `lista_beta.txt`.
- Incluye sincronización segura, entorno aislado, telemetría browser-local (máx. 200 eventos por pestaña; p50/p95 solo con n≥30), límites de lo que no mide, escenarios AUTH/USERS/CATALOG/WRITE/FEEDBACK/Inbox/ADMIN y enlace al protocolo multimedia.
- No se ejecutaron pruebas ni se accedió a datos productivos.
- CI HEAD 96431af2 SUCCESS: 296 suites / 3,454 pruebas / 0 fallos; health y Pages SUCCESS.
- Siguiente: revisión de contratos transversales de fallos parciales/no duplicación y después Beta cuando existan entornos aislados autorizados.


## P2 — reintentos y cancelación de solicitudes (2026-11-22)

- Corregida carrera en runCatalogRequestWithRetry: si la señal se aborta entre comprobación y ejecución del microtask, request ya no se invoca; backoff también revalida señal tras registrar listener.
- CatalogRequestRetry 8/8 PASS; AdminDriveAuditClientRetry 7/7 PASS. Clasificados consumidores: GET/preview idempotentes; auditDriveImages reintenta mismo cursor/payload; organizer/rollback usan operationId; backupDatabase y applyCortesImageReconciliation tienen maxAttempts 1.
- CI HEAD `1ac0d9b88cd31f5d8d0a95f8d69ef8bb4f10c0bd`: 296 suites / 3,455 pruebas / 0 fallos; health read-only y Pages SUCCESS.
- Evidencia: AUDITORIA_RETRY_ABORT_2026-11-22.md.
- No se ejecutaron pruebas Beta ni solicitudes contra producción.


## P2 — no duplicación y fallo parcial en publicación CATALOG (2026-11-21)

- Se amplió `JS/Tests/SharedMutationCoordinator.js` con dos escenarios del cliente compartido: (1) Coordinator persiste publicación y la primera respuesta HTTP 200 contiene JSON inválido; el retry reutiliza el cuerpo exacto/requestId y obtiene replay `duplicate` sin duplicar eventos/revisiones; (2) un rechazo explícito de aplicación se propaga sin reintento.
- El contrato ya se ejecuta desde `RunServiceTests.mjs` en el grupo INTEGRATION. La validación CI del nuevo HEAD está pendiente; no marcar aún como completada.
- Siguiente: verificar regresión y workflows; si pasan, cerrar esta tarea y continuar con el siguiente pendiente local de P1/P2 según el backlog.


## P2 — cierre de pruebas transversales de no duplicación/fallos parciales (2026-11-21)

- `SharedMutationCoordinator.js` ampliado con dos casos: publicación confirmada con respuesta JSON inválida (retry exacto por requestId/cuerpo sin duplicar) y rechazo de aplicación sin reintento. El contrato existente también cubre respuesta perdida tras commit y recuperación de lote parcial mediante reset.
- Revisión del diff del commit `9cde983eb6e95595519d74806d2ade03d385e126`: solo `JS/Tests/SharedMutationCoordinator.js`, +48 líneas, 0 eliminaciones; commit padre `9e909c6a4146cf19f8d4a0f1504fb00fef7fac4b`.
- CI: 296 suites / 3,457 pruebas / 0 fallos; health read-only SUCCESS. Pages build del mismo HEAD seguía en curso; no es requisito para la suite de servicios ni implica deployment Apps Script.
- Siguiente: cerrar trazado estático de YouTube/consultas ya auditado, mantener sin cambios la inicialización no idempotente que no puede resolverse lock-free bajo NORMAS §15; después revisar pendientes locales multimedia y preparar verificación integral cuando el backlog local esté resuelto.


## P1 — cierre del trazado estático de YouTube (2026-11-21)

- Se completó el trazado del flujo de carga/aprobación: `opVideoId`, inicialización resumable, transferencia directa navegador→YouTube en bloques de 8 MiB, offset/checkpoints IndexedDB, pausa/reanudación, recuperación y ledger de aprobación/rechazo.
- No se retiran consultas sin medición. No se añade persistencia/lock para `opVideoId → uploadUrl`: no hay primitiva atómica lock-free verificada y §15 prohíbe serializar cargas; riesgo bajo de sesión resumable huérfana, no de vídeo publicado duplicado.
- Evidencia: `AUDITORIA_P1_YOUTUBE_UPLOAD_2026-11-22.md`. Pendiente Beta: medir solicitudes por capa y probar canal aislado.
- Las tareas locales de P1/P2 quedan cerradas; las mediciones/corpus/Drive/YouTube/browser reales permanecen como validaciones diferidas a Beta. Siguiente fase normativa: verificación técnica integral local (§11), sin incorporar nuevas mejoras.


## Fase de verificación técnica integral — inicio (2026-11-21)

- Se inicia la fase exigida por NORMAS §11 después de cerrar tareas locales P1/P2; validaciones de navegador real, corpus, Drive/Spreadsheet, OAuth y YouTube siguen diferidas a Beta aislada.
- Se añade `JS/Tests/RepositoryJavaScriptSyntax.mjs` e integración en `RunServiceTests.mjs`: recorre el repositorio y ejecuta `node --check` sobre todos los `.js` y `.mjs`, excluyendo solo `.git` y `node_modules`. Árbol actual: 183 `.js` + 244 `.mjs` = 427 archivos.
- La prueba integral de sintaxis aún está pendiente de CI. Regresión previa HEAD `9cde983e`: 296 suites / 3,457 pruebas / 0 fallos; health SUCCESS.
- Siguiente: comprobar el resultado de la sintaxis completa; corregir solo fallos reproducibles y continuar con compatibilidad/referencias y revisión de diff.


## Verificación integral — ajuste del parser (2026-11-21)

- Primera ejecución CI del test `RepositoryJavaScriptSyntax.mjs` falló únicamente en `JS/Tests/AdminModalEditSecurity.js`: es un fixture clásico (sin import/export) que elimina globales de prueba mediante `delete DriveApp`/`delete SpreadsheetApp`; al forzarlo como ES module, Node lo rechaza por strict mode. No es un defecto del código Apps Script ni del fixture en su contexto original.
- Se ajustó el harness para usar `node --check` sin forzar el tipo de módulo; `.mjs` conserva modo módulo por extensión y `.js` usa detección normal de sintaxis, preservando scripts clásicos y módulos ESM.
- La primera regresión terminó en FAIL por el harness nuevo: 288 suites / 3,314 pruebas aprobadas / 1 fallo de suite; las suites previas al chequeo no reportaron fallo. Pendiente repetir CI tras el ajuste.


## Verificación integral — sintaxis y regresión (2026-11-21)

- Se corrigió el harness para no forzar modo ES module en scripts clásicos; Node detecta módulos `.mjs` y sintaxis ESM `.js` sin cambiar su modo de ejecución. La primera falla fue exclusivamente el modo forzado del validador, no el código del repositorio.
- CI HEAD `2955bb16ce27bb019f6f0a86f9d902b8ecea8c4d`: `RepositoryJavaScriptSyntax` 1/1 PASS, 428 archivos `.js/.mjs` comprobados; regresión 297 suites / 3,458 pruebas / 0 fallos; health read-only SUCCESS.
- Pages build/deployment del mismo HEAD estaba in_progress al cierre. No se ha desplegado Apps Script ni modificado servicios/recursos productivos.
- Siguiente: completar revisión de referencias/dependencias y diff acumulado, luego anti-regresión. Beta de navegador/Drive/Spreadsheet/YouTube sigue diferida a entornos aislados.


## Verificación integral — referencias y dependencias (2026-11-21)

- Añadido `RepositoryModuleReferences.mjs`, que recorre los archivos `.js/.mjs` y verifica resolución en disco de imports, re-exports, imports dinámicos estáticos, `new URL(..., import.meta.url)` y `require()` relativos. Se integra en `RunServiceTests.mjs` después de la verificación de sintaxis.
- CI pendiente; no se han cambiado módulos productivos ni rutas. Siguiente: revisar cualquier referencia rota que el contrato reproduzca y continuar con compatibilidad/diff.


## Verificación integral — acotar referencias al código activo (2026-11-21)

- Primera ejecución de `RepositoryModuleReferences` detectó numerosas rutas antiguas en tests históricos no invocados por `RunServiceTests` (p. ej. referencias a `../../ui.js` desde `JS/Tests`). No son imports de producción ni pruebas ejecutadas por el runner; no se modifican archivos legacy por esta observación.
- Se ajustó el escaneo para revisar `JS/Frontend`, `JS/Services`, `service-worker.js`, el runner y únicamente los tests referenciados por `RunServiceTests.mjs`. Se mantiene validación de imports, re-exports, imports dinámicos literales, `new URL` y `require` relativos.
- El primer CI de referencias falló por alcance excesivo del validador; la sintaxis integral ya había pasado 428 archivos. Nueva ejecución pendiente.


## Verificación integral — referencias activas (2026-11-21)

- CI HEAD `26db47e5`: `RepositoryJavaScriptSyntax` 1/1 PASS, 429 archivos; `RepositoryModuleReferences` 1/1 PASS; regresión 298 suites / 3,459 pruebas / 0 fallos; health read-only SUCCESS.
- El validador de referencias se limitó correctamente a frontend, servicios, service-worker, runner y pruebas realmente integradas. Los tests históricos no invocados con rutas antiguas no se alteraron.
- Observación no funcional: el texto final del test usó `files.length` sobre un Set, por lo que imprimió `undefined` aunque el test pasó. Corregido a `files.size`; CI de confirmación pendiente.


## Verificación integral — sintaxis, referencias y regresión aprobadas (2026-11-21)

- HEAD verificado: `377edf170e04c2dd696608ae63d56e7752e672df`; base protegida `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.
- `RepositoryJavaScriptSyntax`: 429 archivos `.js/.mjs`, 1/1 PASS.
- `RepositoryModuleReferences`: 340 archivos activos (frontend, servicios, runner y suites integradas), 1/1 PASS; imports/re-exports/dynamic imports literales/new URL/require relativos resueltos.
- Regresión de servicios: 298 suites / 3,459 pruebas / 0 fallos. Health read-only SUCCESS. Pages build del mismo HEAD seguía in_progress al cierre.
- El chequeo de referencias excluye intencionalmente tests legacy no invocados que conservan rutas históricas; no se alteraron.
- Siguiente: revisión del diff acumulado de implementaciones y anti-regresión dirigida. Las validaciones reales de navegador, Apps Script, Drive/Spreadsheet, OAuth y YouTube siguen diferidas a Beta aislada.


## Verificación técnica integral — cierre local (2026-11-21)

- HEAD validado: `60c67a6fc7dbd99e456ae10f02b2287b9810e963` en `GPSpedia2.2.5_work`.
- Base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.
- Sintaxis Node 22: 429 archivos `.js/.mjs`, 1/1 PASS.
- Referencias relativas: 340 archivos activos, 1/1 PASS.
- Regresión integral: 298 suites / 3,459 pruebas / 0 fallos.
- Health read-only SUCCESS; Pages build/deployment SUCCESS.
- Diff desde HEAD inicial `214b39a86b7dc5a3bf7d831865e3e6aa0bd270cb`: 11 commits / 7 archivos; solo tests y registros (incluye los dos nuevos contratos de verificación y dos escenarios Coordinator). No hubo cambios productivos en esta fase.
- **Estado: verificación local COMPLETADA CON VALIDACIÓN DIFERIDA.** No se desplegó Apps Script ni se modificaron Spreadsheet, Drive, secretos, propiedades o datos productivos.
- Pendiente Beta: pruebas reales en Android/PWA/escritorio, corpus técnico, CORS/primera pintura/memoria, tamaños históricos Drive, Spreadsheet/Drive aislados, concurrencia interproyecto y YouTube en canal de prueba autorizado.
- Siguiente: ejecutar el protocolo Beta solo cuando estén disponibles deployments, credenciales y recursos aislados autorizados; no incorporar nuevas mejoras hasta cerrar las validaciones actuales o recibir evidencia nueva.


## Actividad completada — 2026-11-22: auditoría de telemetría en rutas ordinarias

- **Tarea realizada:** revisión estática de `serviceTelemetry.js`, `api-config.js`, USERS, WRITE, FEEDBACK, Coordinator y agregado de métricas ADMIN.
- **Hallazgos:** TEL-01: contadores de USERS/getUsers, tres consultas WRITE y numerosas acciones FEEDBACK ejecutan lecturas/escrituras de PropertiesService dentro de la petición. TEL-02: Coordinator registra contadores dentro del ScriptLock en acquire/feed. TEL-03: getCatalogChanges contabiliza en FEEDBACK y Coordinator. TEL-04: telemetría de navegador permanece local y acotada, sin request adicional.
- **Panel ADMIN:** consulta agregada restringida a Desarrollador y refresco condicionado a visibilidad; se conserva.
- **Decisión:** auditoría estática completada; no se modificó código ni se midió latencia real. No retirar contadores sin definir qué diagnóstico debe conservar el panel.
- **Evidencia:** `AUDITORIA_P0_TELEMETRIA_2026-11-22.md`; hallazgos resumidos en `Auditoría.txt`.
- **Siguiente tarea:** diseñar el rediseño de telemetría de bajo costo, empezando por sacar la escritura del Coordinator de la sección crítica cuando el contrato lo permita y definir cómo reducir contadores directos sin perder scopes necesarios. Añadir contratos antes de cambiar el comportamiento.
- **Contexto breve:** esta es una tarea local de auditoría aún pendiente en el plan integral; no depende de Beta para diseñar ni probar contratos con dobles. Las mediciones reales quedan para Beta aislada.
- **Estado:** auditoría estática COMPLETADA; implementación local PENDIENTE.


## Actividad completada — 2026-11-22: telemetría de Coordinator fuera de ScriptLock

- **Tarea realizada:** `JS/Services/Coordinator.js` mueve la escritura de métricas de `acquire_`, `validateSessionContext_` y `getCatalogChanges_` fuera de `withCoordinatorLock_`. La lease/feed se resuelve y devuelve primero; la persistencia posterior sigue siendo best-effort y no revierte el resultado funcional.
- **Compatibilidad:** se conserva el conteo de adquisiciones nuevas y reactivaciones de mantenimiento; los reintentos idempotentes de una lease ya activa no se cuentan de nuevo. Se conserva la atribución PUBLIC→CATALOG y FEEDBACK→FEEDBACK en el feed.
- **Versión Coordinator:** 1.4.6; no cambia el protocolo compartido.
- **Pruebas:** `SharedMutationCoordinator.js` ejecutado de forma aislada con Coordinator y SharedMutationClient: 95/95 PASS, 0 fallos. Cuatro contratos nuevos comprueban acceso a PropertiesService fuera del lock y que fallos de métricas no afectan lease/feed. El contrato existente del feed público también comprueba que no haya acceso de telemetría bajo lock.
- **Alcance:** cambio local validado con dobles; no se desplegó Apps Script ni se midió contención/latencia real.
- **Siguiente tarea:** resolver TEL-01/TEL-03: definir la semántica que necesita ADMIN y reducir la persistencia síncrona por petición de USERS/WRITE/FEEDBACK sin perder scopes ni presentar best-effort como exacto.
- **Contexto breve:** se eliminó la espera de PropertiesService de la sección crítica global del Coordinator; ahora el trabajo restante es evitar que los contadores de cada servicio sigan añadiendo escrituras a las rutas ordinarias.
- **Estado:** TEL-02 COMPLETADO localmente con contrato aprobado; rediseño de contadores directos PENDIENTE.


### Ajuste de validación CI — contrato estático Coordinator (2026-11-22)
- El primer CI del commit `0ec002f` ejecutó sintaxis correctamente y falló una única suite estática: `ServiceTrafficAdminContract.mjs` aún exigía la llamada antigua a telemetría dentro de `acquire_` y la versión 1.4.5.
- La suite se actualiza para verificar el evento diferido de `acquire_`, las llamadas post-lock de feed/validación de sesión y la versión 1.4.6. No es un fallo funcional del cambio; la suite aislada de Coordinator había aprobado 95/95.
- **Siguiente:** publicar el contrato corregido y repetir CI completo antes de continuar con el rediseño TEL-01/TEL-03.
- **Estado:** corrección de test preparada; CI de confirmación PENDIENTE.


## Ampliación de auditoría — telemetría directa de cinco servicios (2026-11-22)

- **Tarea realizada:** se completó el mapa de los cinco contadores que alimentan ADMIN: AUTH/validateSession (1), CATALOG (6 lecturas), USERS/getUsers (1), WRITE (3 consultas) y FEEDBACK (40 acciones).
- **Hallazgo adicional:** CATALOG intenta `ScriptLock.tryLock(0)` y realiza PropertiesService dentro del lock cuando lo obtiene; no espera si está ocupado, pero puede competir con operaciones del mismo proyecto. AUTH/USERS/WRITE/FEEDBACK hacen lecturas/escrituras síncronas de PropertiesService por petición y limpian buckets al abrir hora nueva.
- **Doble conteo:** FEEDBACK/getCatalogChanges está en el contador directo FEEDBACK y Coordinator también lo registra; ADMIN suma ambas fuentes.
- **Consumidor:** `Coordinator.readServiceTraffic_` hace `fetchAll` a cinco servicios para fusionar sus métricas; esto ocurre solo al consultar el panel ADMIN, no en cada acción ordinaria. La UI ya distingue tráfico global de solicitudes locales del navegador.
- **Decisión de diseño:** retirar escrituras/lock de contadores directos de las rutas ordinarias; conservar un agregado global de eventos que Coordinator ya registra, claramente etiquetado como best-effort y no equivalente al total HTTP. Conservar métricas locales del navegador y RBAC/refresh del panel.
- **Siguiente tarea:** implementar el contrato de telemetría global sin fuentes directas, retirar sus escrituras en AUTH/CATALOG/USERS/WRITE/FEEDBACK, eliminar el fan-out de cinco endpoints en la ruta nueva de ADMIN y actualizar UI/contratos para no presentar ausencia como cero.
- **Estado:** auditoría de alcance/consumidores COMPLETADA; implementación TEL-01/TEL-03 PENDIENTE.

## Implementación TEL-01/TEL-03 — retiro de contadores directos (2026-11-22)

- **Tarea realizada:** se retiraron los contadores síncronos y endpoints internos getServiceTraffic de AUTH, CATALOG, USERS, WRITE y FEEDBACK. CATALOG ya no adquiere ScriptLock.tryLock(0) ni escribe PropertiesService por lecturas ordinarias.
- **ADMIN:** Coordinator entrega su agregado de eventos registrados sin consultar cinco endpoints adicionales; se elimina fetchAll exclusivo de telemetría. Se conserva fetchAll para la precarga funcional de cachés de actor.
- **Semántica:** el agregado global incluye adquisiciones nuevas de lease, validaciones de contexto y lecturas del feed registradas por Coordinator. No representa todas las solicitudes HTTP. Las fuentes directas se marcan directRequestsAvailable:false con razón direct_requests_not_collected, nunca como un cero de requests.
- **FEEDBACK/getCatalogChanges:** queda contado una sola vez por Coordinator; desaparece la suma duplicada del contador directo.
- **UI:** se mantiene el panel Developer, su RBAC y refresco condicionado a visibilidad; el gráfico local del navegador conserva su alcance de pestaña/dispositivo y no se envía ni persiste.
- **CATALOG:** se conserva GPSpedia_CATALOG_TRAFFIC_SECRET solo para proteger los metadatos internos del inventario de imágenes compartidos con ADMIN. Ya no es secreto de telemetría ni requiere GPSpedia_COORDINATOR_SECRET_CATALOG o GPSpedia_SERVICE_URL_CATALOG.
- **Versión Coordinator:** 1.4.7; protocolo v1 sin cambios.
- **Siguiente tarea:** ejecutar contratos nuevos y CI integral; después revisar el write best-effort que Coordinator aún realiza por cada evento registrado fuera del lock y decidir si puede integrarse en escrituras funcionales existentes o retirarse.
- **Contexto breve:** se elimina el costo por petición de los cinco contadores directos y el fan-out administrativo. El único costo de persistencia de métricas que permanece es el del propio Coordinator para los eventos que registra.
- **Estado:** implementación preparada en rama; validación CI PENDIENTE.
## Ajuste P0 — consulta ADMIN de telemetría sin ScriptLock (2026-11-22)
- `readServiceTraffic_` se ejecuta sin `withCoordinatorLock_`; el contador ya se escribe fuera del lock, por lo que el lock de lectura no aportaba consistencia y podía retrasar adquisiciones de lease.
- La limpieza solo elimina buckets fuera de la ventana de 24 horas o con esquema inválido; los eventos actuales se leen best-effort. No hay fan-out a otros servicios.
- **Siguiente:** validar CI de Coordinator 1.4.9 y después medir en Beta aislada la escritura residual de eventos. Solo retirarla si la medición confirma impacto o si se decide que el diagnóstico global no justifica ese costo.
- **Estado:** cambio local preparado; CI PENDIENTE.
## Ajuste Coordinator 1.4.9 — snapshot de telemetría concurrente
- `readServiceTraffic_` sigue fuera de ScriptLock. Si un bucket con timestamp vigente tiene JSON/esquema inválido, se omite sin borrarlo: el writer podría estar reemplazándolo concurrentemente.
- La limpieza conserva solo eliminación de claves con timestamp inválido o fuera de ventana.
- **Siguiente:** validar CI completo y mantener la medición del costo residual de `recordServiceTrafficEvent_` para Beta aislada.
- **Estado:** cambio local preparado; CI PENDIENTE.
## P2 — auditoría de inicialización/renderizado UI (2026-11-22)
- **Tarea realizada:** se revisó el ciclo de arranque de `main.js` y los listeners, timers y observers globales/temporales en `ui.js`.
- **Resultado:** `initializeApp` tiene un único punto de entrada; banner de estado, Inbox, ADMIN, ayuda contextual y retry de términos tienen guards; timers Inbox se reemplazan; modales y menús temporales liberan listeners/observers; carruseles comparten un resize global.
- **Evidencia:** `AUDITORIA_P2_UI_INIT_2026-11-22.md` y contrato `JS/Tests/UIInitializationLifecycle.mjs`.
- **Límite:** no se ejecutó DOM real ni se midieron memoria, CPU o red; esas validaciones siguen reservadas a Beta Android/PWA/escritorio.
- **Siguiente:** completar diff final/anti-regresión local y preparar el despliegue aislado Beta.
- **Estado:** auditoría estática COMPLETADA; contrato añadido; CI del HEAD actual PENDIENTE.

## Actualización de continuidad vigente — 2026-11-22

- **Tarea realizada:** cierre local TEL-01/TEL-03. Se retiraron contadores directos y endpoints de telemetría de AUTH, CATALOG, USERS, WRITE y FEEDBACK; se eliminó el fan-out de ADMIN. La lectura ADMIN del agregado Coordinator no usa ScriptLock y no borra buckets vigentes potencialmente concurrentes.
- **Validación del HEAD anterior:** 29cc8d142d08611a0226ecd3c2bee09ad4517125: 299 suites / 3,453 pruebas / 0 fallos; sintaxis Node 22 en 430 archivos JS/MJS; referencias relativas en 341 archivos; health read-only 7/7 servicios disponibles; GitHub Pages build/deployment SUCCESS. Esta evidencia corresponde exactamente a ese SHA, no al siguiente commit.
- **Rama base:** GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- **Decisión sobre costo residual:** Coordinator conserva escritura best-effort posterior al lock para adquisiciones nuevas/reactivaciones, validaciones de contexto y feed. Es el único write de telemetría persistente que queda. No se elimina sin más porque es la fuente del agregado global actual; su costo real debe medirse en Beta aislada. La interfaz lo etiqueta como cobertura parcial, no como total HTTP. La telemetría local de navegador no se transmite ni persiste.
- **Tarea adicional realizada:** revisión del ciclo de miniaturas detectó que el inventario P1 inicial estaba desactualizado: la cola ya prioriza imágenes visibles (10) sobre precarga (0), mantiene FIFO por prioridad y promueve una precarga pendiente de la misma variante. La ruta visible reutiliza el elemento cargado sin segundo fetch. Se actualizó el informe y se añadió el contrato estático ThumbnailPriorityIntegration.mjs.
- **Siguiente tarea:** ejecutar CI del commit que añade ThumbnailPriorityIntegration.mjs; si pasa, continuar P1 con corpus técnico representativo y plan de medición de cola/primera pintura. No cambiar parámetros de compresión hasta disponer de corpus y mediciones.
- **Contexto breve:** se cerró el rediseño local de contadores directos sin perder la distinción entre eventos Coordinator y solicitudes locales del navegador; la siguiente fase evita reabrir mecanismos multimedia ya corregidos y centra el trabajo en calidad visual medible.
- **Estado:** TEL-01/TEL-03 COMPLETADOS localmente; CI del contrato de prioridad PENDIENTE; validación visual/latencia real PENDIENTE de Beta aislada.


## Actualización de continuidad vigente — 2026-11-22 (confirmación P1)

- **Tarea realizada:** se añadió el contrato de integración ThumbnailPriorityIntegration.mjs para verificar prioridad de imagen visible (10) sobre precarga (0), promoción de la misma variante pendiente, reutilización de la imagen visible y ausencia de segundo fetch.
- **Validación exacta del HEAD:** 1aa93ed686753f2d855bb774635da436ca4d9b63. Contrato nuevo 15/15 PASS; regresión 300 suites / 3,468 pruebas / 0 fallos; sintaxis 431 archivos JS/MJS; referencias relativas 342 archivos; health read-only 7/7; Pages build/deployment SUCCESS.
- **Rama base:** GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- **Siguiente tarea:** P1 — preparar/seleccionar corpus técnico representativo y definir mediciones reproducibles de espera de cola, primera pintura, CPU, bytes y memoria; ejecutar solo en Beta aislada. No modificar tamaños, formato PNG, concurrencia 2, TTL o LRU sin evidencia.
- **Pendientes relacionados:** medir el costo residual del get/set best-effort de Coordinator en Beta; no confundir Pages deployment con despliegue Apps Script.
- **Contexto breve:** el inventario inicial de multimedia se corrigió porque la prioridad visible ya estaba implementada; ahora el contrato evita regresiones y la fase siguiente debe centrarse en calidad visual y mediciones reales.
- **Estado:** prioridad visible/precarga VALIDADA localmente; calidad visual y rendimiento real PENDIENTES de corpus/Beta.


## Actualización de continuidad vigente — 2026-11-22 (harness P1)

- **Tarea realizada:** se creó JS/Tests/ThumbnailQualityBenchmark.html, una herramienta local para comparar variantes PNG 300/800/1600 sobre archivos seleccionados, sin subirlos ni persistirlos. Usa la cola real de miniaturas, simula precarga 0 y promoción visible 10, muestra dimensiones, bytes, MIME/firma, SHA-256, EXIF JPEG, alfa muestreado y tiempos.
- **Contrato:** ThumbnailQualityBenchmarkContract 30/30 PASS; ThumbnailPriorityIntegration 15/15 PASS.
- **Validación exacta del HEAD:** 03b58abb6aa3d83b5a09b5fd4bb00bb19cf5aa7a. Regresión 301 suites / 3,498 pruebas / 0 fallos; sintaxis 432 archivos JS/MJS; referencias relativas 343 archivos; health read-only 7/7; Pages build/deployment SUCCESS.
- **Rama base:** GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- **Siguiente tarea:** usar el harness con corpus técnico sintético/autorizado en Beta aislada; revisar visualmente diagramas, texto fino, colores de cable, alfa y orientación. Después medir en la aplicación real CORS, cache hit/miss, primera pintura, bytes, CPU y memoria. No cambiar parámetros sin evidencia.
- **Límite:** el harness mide el algoritmo local de escalado/codificación y la cola; no mide CORS, red, IndexedDB, memoria GPU ni primera pintura del producto en condiciones reales.
- **Contexto breve:** el inventario no encontró corpus técnico en Git. La herramienta prepara una medición reproducible sin copiar imágenes de clientes al repositorio ni transmitir archivos.
- **Estado:** herramienta y contratos COMPLETADOS localmente; corpus y mediciones Beta PENDIENTES.


## Actualización de continuidad vigente — 2026-11-22 (YouTube cross-tab)

- **Tarea realizada:** segunda revisión del ciclo YouTube encontró una carrera distinta a la respuesta perdida: recoveryLookupPromise lee IndexedDB una sola vez al abrir modal; sessionStorage es por pestaña; no hay BroadcastChannel/Web Locks ni reserva única por destino; backend comprueba aprobaciones pendientes, no inicializaciones en curso. Dos pestañas/dispositivos pueden iniciar sesiones resumables separadas antes de que exista un registro de operación o aprobación.
- **Impacto acotado:** la inicialización doble puede dejar sesiones o vídeos no listados huérfanos; la idempotencia de aprobación evita que ambos creen dos solicitudes pendientes para el mismo destino, pero no elimina el recurso remoto ya creado.
- **Decisión:** no agregar ScriptLock/lease/espera ni una persistencia no atómica; no se encontró CAS servidor compatible con §15. Una reserva IndexedDB local solo protege el mismo navegador y no resuelve el caso de dispositivos distintos ni la pérdida de Location.
- **Siguiente tarea:** incorporar escenario controlado de dos inicios simultáneos al protocolo Beta usando destino/canal desechable autorizado; no ejecutar contra producción. Mantener el flujo resumable y aprobación actual hasta disponer de diseño atómico seguro.
- **Estado:** auditoría estática completada; corrección diferida por ausencia de primitiva atómica segura; Beta de concurrencia PENDIENTE.


## Actualización de continuidad vigente — 2026-11-22 (YouTube characterization)

- **Tarea realizada:** se añadió YouTubeInitIdempotencyBoundary.mjs a la regresión. El test usa dobles de sessionStorage y UrlFetchApp; confirma que el mismo tab reutiliza opVideoId, otro tab puede generar uno distinto y el handler init no deduplica por opVideoId ni por destino cuando no hay aprobación pendiente. No se llamó a YouTube real.
- **Resultado focalizado:** 7/7 PASS como caracterización del riesgo. No significa que la inicialización sea idempotente; deja evidencia automatizada del límite actual.
- **Validación exacta del HEAD:** 7c916e31c311cec0da1086d378e7d287a550ca15. Regresión 302 suites / 3,505 pruebas / 0 fallos; sintaxis 433 archivos JS/MJS; referencias relativas 344 archivos; health read-only 7/7; Pages build/deployment SUCCESS.
- **Rama base:** GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- **Siguiente tarea:** mantener la mitigación diferida hasta definir reserva atómica compatible con §15. Ejecutar prueba de dos pestañas/dispositivos solo en Beta aislada con destino/canal desechable. Continuar corpus de imágenes y mediciones en el mismo entorno.
- **Estado:** auditoría y caracterización local COMPLETADAS; riesgo de sesiones huérfanas documentado; corrección y prueba real PENDIENTES de diseño seguro/Beta.


## Continuidad vigente — P1 corpus sintético de miniaturas (2026-11-22)

- **Tarea realizada:** el banco local `JS/Tests/ThumbnailQualityBenchmark.html` ahora puede generar cinco PNG sintéticos en el navegador sin seleccionar archivos externos: diagrama eléctrico apaisado con etiquetas/cableado de color, guía vertical de panel, textura oscura de alto detalle, transparencia parcial e imagen pequeña. Las muestras se procesan con la cola real y variantes 300/800/1600.
- **Privacidad y alcance:** los archivos existen solo en memoria del navegador; no se suben, no se guardan en IndexedDB ni en el repositorio. La textura es ilustrativa, no una fotografía; no se genera EXIF real.
- **Contrato añadido:** el test ejecuta el generador con dobles locales y valida cinco archivos PNG, nombres únicos, MIME, contenido y timestamp determinista. La validación integral queda pendiente de CI del commit.
- **Siguiente tarea:** ejecutar el corpus sintético en navegador real y revisar visualmente nitidez de etiquetas/cables, proporción, transparencia y no-ampliación; después incorporar muestras reales autorizadas/anónimas y ejecutar mediciones Beta de CORS, primera pintura, bytes, CPU y memoria. No cambiar parámetros de compresión sin esa evidencia.
- **Contexto:** se elimina la dependencia de conseguir un corpus antes de probar el harness local, pero no se confunde el corpus sintético con evidencia de calidad sobre fotografías o diagramas reales.
- **Rama base:** `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


## Confirmación de continuidad — corpus sintético P1 y regresión (2026-11-22)

- **Corrección intermedia:** el primer CI del commit `1b4d60dd93dd92fb1a46b6e05601ad87c8006a71` falló únicamente en el nuevo contrato por una secuencia de escape incorrecta al compilar el helper con `new Function`. La prueba aislada detectó el error antes de cerrar la tarea; se corrigió en el commit siguiente.
- **HEAD validado:** `0d301bc3e6a04e06077fc9c39f8d7d6097671ac3`. `ThumbnailQualityBenchmarkContract: 46/46 PASS`; regresión 302 suites / 3,521 pruebas / 0 fallos; sintaxis 433 archivos JS/MJS; referencias relativas 344 archivos; health read-only 7/7; Pages build/deployment SUCCESS.
- **Rama base:** `GPSpedia2.2.5` intacta en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- **Tarea realizada:** el harness genera cinco PNG sintéticos locales, ejecuta las variantes 300/800/1600 y utiliza la cola real. El contrato ejecuta el generador con dobles y comprueba nombres, unicidad, MIME, bytes y timestamp.
- **Siguiente tarea:** abrir el harness en navegador real, revisar visualmente nitidez de texto/cables, alfa y no-ampliación; después usar muestras reales autorizadas y medir CORS, primera pintura, bytes, CPU y memoria en Beta aislada. No cambiar parámetros sin evidencia.
- **Contexto:** la validación Node comprueba la generación/contrato, no la calidad visual real del navegador ni el rendimiento de campo. La textura sintética no equivale a una fotografía y el generador no crea EXIF real.
- **Estado:** corpus sintético local y contrato COMPLETADOS; validación visual, corpus representativo real y métricas de aplicación PENDIENTES DE BETA.


## Ajuste de medición del harness P1 (2026-11-22)

- Se detectó que el tiempo total de proceso no separaba decodificación y dibujo Canvas. El banco ahora registra `decodeMs` (createImageBitmap), `canvasMs` (preparación/dibujo) y `encodeMs` (toBlob), además de espera y duración total.
- Se amplió el contrato estático para comprobar los tres intervalos. CI de confirmación pendiente.
- **Siguiente:** validar el nuevo contrato en CI y conservar la lectura visual/Beta como pendiente; no usar los tiempos simulados de dobles como rendimiento real.


## Confirmación CI — mediciones separadas del harness P1 (2026-11-22)

- **HEAD validado:** `2e4fea9b143a1df9223d9ef69b1e4ed398fc3181`. `ThumbnailQualityBenchmarkContract: 49/49 PASS`; regresión 302 suites / 3,524 pruebas / 0 fallos; sintaxis 433 archivos JS/MJS; referencias relativas 344 archivos; health read-only 7/7; Pages build/deployment SUCCESS.
- **Cambio:** el harness separa espera de cola, decodificación `createImageBitmap`, preparación/dibujo Canvas y codificación `toBlob`, además del tiempo total.
- **Siguiente:** validación visual en navegador real y ejecución con corpus autorizado/anónimo en Beta aislada. El contrato Node verifica instrumentación y generación, no la calidad visual ni el rendimiento real.
- **Estado:** implementación local COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.


## Confirmación de continuidad — estado Git y P0/P1 (2026-11-22)

- **HEAD vigente con CI completo:** `a2ad72d8d898c57bacb7ea228038ca400f3ba4a6`. Regresión 302 suites / 3,524 pruebas / 0 fallos; sintaxis 433 archivos JS/MJS; referencias relativas 344 archivos; health read-only 7/7; Pages build/deployment SUCCESS.
- **Rama base:** `GPSpedia2.2.5` permanece intacta en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- **P0 telemetría:** rediseño local validado; el único costo persistente restante es el get/set best-effort del Coordinator fuera de ScriptLock. Medición y decisión final pendientes de Beta aislada.
- **P1 miniaturas:** generador de cinco muestras sintéticas y harness de medición local validados; tiempos separados de cola, decodificación, Canvas y codificación. La inspección visual real, fotos/diagramas autorizados y métricas CORS/primera pintura/bytes/CPU/memoria siguen pendientes de Beta.
- **P1 YouTube:** caracterización local del límite de init completada; la prueba real de dos pestañas/dispositivos requiere canal/destino desechable autorizado. No se introdujo lock/lease contrario a §15.
- **Siguiente tarea:** preparar y ejecutar el primer bloque de validaciones multimedia en Beta aislada cuando estén disponibles deployments, corpus autorizado y canal de prueba. No ejecutar contra producción.
- **Contexto:** el código y contratos locales están validados; las pruebas que dependen de navegador real, Drive/Spreadsheet, OAuth y YouTube permanecen diferidas explícitamente, no simuladas.


## Nueva auditoría integral — continuidad 2026-11-22

- **Tarea realizada:** se registró el requisito integral del usuario y el plan de auditoría A01–A12 en `AUDITORIA_INTEGRAL_APORTES_PANEL_DESPLIEGUE_2026-11-22.md`; se actualizó `Tareas_Activas.md`.
- **Criterio de seguridad aclarado:** login establece actor/rol; acciones ordinarias usan actor cacheado y verificación local de capacidad, sin revalidación remota por clic. Revocación dirigida solo para logout remoto, eliminación de cuenta o revocación/cambio de rol. Nombre/ID de colaborador se obtienen del actor servidor, no del navegador. No se modifican hashes ni se despliega producción.
- **A01 — hallazgos preliminares:** cache hit en `getCachedSharedSessionActor_()` solo usa CacheService y no consulta Coordinator; login sincroniza/precarga el actor; revocación invalida cachés de servicios. Hallazgo A01-01: CacheService eviction puede provocar `SESSION_ACTOR_CACHE_MISS` y pedir nuevo login aunque no exista revocación (riesgo UX pendiente de Beta, no defecto confirmado). A01-02: falta ejecutar matriz completa de roles, aislamiento de mensajes/aportes y dashboard entre dos cuentas.
- **Pruebas ejecutadas en esta tarea:** inspección estática de SharedMutationClient/Auth/USERS/WRITE/ADMIN, SessionActivityLeaseMinimization y ActivityDashboardContributions; no se ejecutaron aún los runners Node ni llamadas remotas. No atribuir aprobación a pruebas no ejecutadas.
- **HEAD de partida:** `79c01e34ac7502805cf4b4b32fdb44ffa10258ef` en `GPSpedia2.2.5_work`. Rama base no modificada.
- **Siguiente tarea:** completar A01 con ejecución de pruebas locales de actor/invalidación/atribución y construir matriz de roles; después iniciar A02, latencia y llamadas redundantes de las rutas de aportes.
- **Contexto:** se prioriza fluidez sin renunciar a la separación de usuarios ni al control de roles. No se considera válida una revalidación remota en cada acción ordinaria.


## A01 cerrada localmente y A02 iniciada — 2026-11-22

- **Tarea realizada:** se completó la revisión estática A01 y se validaron los contratos de sesión, invalidación, permisos por rol, Inbox, atribución y dashboard mediante CI.
- **Evidencia exacta:** commit `3ee1747d077a972442c1c2a7dde277ef0dddcdcf`; 302 suites / 3,524 pruebas / 0 fallos; sintaxis 433 archivos y referencias relativas 344. SessionActivityLeaseMinimization 5/5, SessionActorCacheLifetime 6/6, SessionActorCacheInvalidation 1/1, SessionInvalidationFlow 15/15, DeveloperPrivilegeRouting 20/20, CoordinatorCapabilityPreservation 6/6, ActivityDashboardContributions 1/1, ActivityDashboardInsights 1/1, RecentlyViewedActivityTelemetry 12/12, InboxUi 87/87 y AuthSessionReadOptimization 9/9.
- **Hallazgo A01:** el cache hit no consulta Coordinator ni Users/ActiveSessions; la invalidación remota se propaga por revocación. Riesgo abierto: eviction espontánea de CacheService causa SESSION_ACTOR_CACHE_MISS y rechazo, pendiente de comprobar en Beta. No se observó revalidación remota por cada acción.
- **Límite:** no se probaron deployments ni dos cuentas reales; A01 está completa en código/CI, no en Beta.
- **Siguiente tarea iniciada:** A02, trazar latencia y llamadas redundantes en aportes: alta de corte/vehículo, información suplementaria, imágenes desde edición in-modal y videos. Contar requests, preflight, lecturas, Drive, confirmaciones y reintentos.
- **Contexto:** se mantiene autorización local basada en actor confiable y rol; no añadir viajes de red por acción. Se distinguen confirmaciones funcionales de revalidaciones de sesión.


## A02 — primera optimización de latencia implementada — 2026-11-22

- **Tarea realizada:** se identificó y corrigió en `HTML/add_cortes.html` una petición `checkOperation` innecesaria antes de un alta nueva con opId aleatorio. El preflight se conserva cuando el opId es determinista de Inbox o procede de una operación local recuperada.
- **Pruebas añadidas:** `AddCutOperationRecoveryFlow.js` cubre ID nuevo sin preflight, ID determinista con preflight y mantiene escenarios de respuesta perdida antes/después del commit, limpieza fallida y recuperación offline.
- **Estado:** código y pruebas preparados; CI pendiente.
- **Otros hallazgos A02 abiertos:** verificación suplementaria fuerza `getCatalogData` completo tras WRITE; VIN consulta en blur y submit además de la validación autoritativa en WRITE; refresco `checkVehicle` tras alta; lecturas de ledger/Drive por imagen requieren caracterización antes de optimizar.
- **Siguiente tarea:** ejecutar CI y corregir cualquier regresión; después continuar A02 con el análisis de lectura completa CATALOG y flujo VIN.
- **Contexto:** se elimina solo una consulta cuyo resultado es conocido para un ID aleatorio recién creado. No se debilita la idempotencia ni la recuperación de operaciones previas.


## A02-01 cerrada y A02-02 iniciada — 2026-11-22

- **Tarea realizada:** optimización de `add_cortes.html`: las altas con opId aleatorio nuevo ya no realizan la consulta HTTP previa `checkOperation`; IDs deterministas de Inbox y operaciones recuperadas mantienen el preflight.
- **CI exacto:** SHA `736224a541c218b934bc0d6710a27f0f35b96aaa`; 302 suites / 3,526 pruebas / 0 fallos. AddCortes diagnostics 14/14 PASS, incluyendo nuevo ID sin consulta, ID Inbox con consulta, pérdida de respuesta antes/después del commit, recuperación y cuota. Health read-only SUCCESS y Pages build/deployment SUCCESS.
- **Siguiente tarea iniciada:** A02-02, reducir el costo de verificación de información suplementaria: la página add_cortes solicita el catálogo completo con forceRefresh para comprobar un solo vehículo. Evaluar y probar endpoint getVehicleProjection dirigido.
- **Contexto:** se mantiene la confirmación de WRITE y la idempotencia; el objetivo es evitar reconstruir datos ajenos al vehículo que se acaba de modificar.


## A02-02 implementada — verificación dirigida de aporte suplementario — 2026-11-22

- **Tarea realizada:** add_cortes.html deja de solicitar el catálogo completo con getCatalogData(forceRefresh) para verificar una única alta suplementaria. Ahora utiliza getVehicleProjection({vehicleId}) y conserva la comprobación de ID y campos enviados.
- **Pruebas añadidas:** AddCortesDiagnostics valida una sola consulta dirigida, contenido de la proyección y rechazo de un ID diferente.
- **Estado:** implementación y prueba preparadas; CI pendiente.
- **Siguiente tarea:** ejecutar CI. Si pasa, seguir A02 con el preflight duplicado de VIN (blur/submit) y el refresco checkVehicle posterior al alta.
- **Contexto:** el endpoint dirigido lee la proyección de un vehículo y el ledger de aportes; evita reconstruir logos, tutoriales y Relay para validar una operación suplementaria.


## Corrección de pruebas A02-02 — 2026-11-22

- **Hallazgo CI:** el primer commit de verificación dirigida falló por dos pruebas desactualizadas: AddCortesDiagnostics no definía su extractor de función y SupplementaryVideoContract esperaba data.cortes/getCatalogData.
- **Corrección:** se agregó el extractor al test y se actualizó SupplementaryVideoContract al contrato getVehicleProjection que devuelve {status, vehicle, source}; se mantiene validación de vehículo y campos.
- **Estado:** pruebas corregidas, CI pendiente. No se marca A02-02 como completada hasta que la regresión vuelva a 0 fallos.
- **Siguiente:** CI completo del commit correctivo.


## Ajuste final del contrato A02-02 — 2026-11-22

- **Tarea realizada:** el test SupplementaryVideoContract ahora suministra una proyección válida al probar ausencia de slot, para que falle por la condición correcta y no por respuesta sin vehículo.
- **Siguiente:** repetir CI de A02-02 y revisar los resultados focalizados.


## A02-02 — ajuste de doble de prueba — 2026-11-22

- **Hallazgo CI:** el segundo CI pasó los contratos de vídeo actualizados, pero AddCortesDiagnostics falló porque el test enviaba campos de cable sin simular slotIndex. El helper de producción rechazó correctamente la respuesta incompleta.
- **Corrección:** el doble WRITE ahora devuelve slotIndex=1 en la prueba que envía cable; se mantiene el test que verifica que un slot ausente es rechazado.
- **Siguiente:** repetir CI completo.


## A02-02 cerrada en CI y observación A05 registrada — 2026-11-22

- **Tarea realizada:** verificación suplementaria de add_cortes migrada a getVehicleProjection por vehicleId.
- **CI exacto:** SHA `425a2db327635efe0c6794467ed421ed1d4ed322`; 302 suites / 3,528 pruebas / 0 fallos; AddCortesDiagnostics 16/16; SupplementaryVideoContract 55/55; CatalogVehicleProjectionRead 1/1; CatalogTargetedResponses 3/3; health read-only SUCCESS y Pages SUCCESS.
- **A05 — defecto confirmado en código:** add_cortes limpia opId después del corte; etapa 3 envía opId null y WRITE usa ruta heredada que no escribe evento de contribución con actorId/actorName/createdAt. La ficha puede quedar actualizada sin historial individual de apertura/alimentación/nota en AportesVehiculo. Se registró corrección pendiente A05; no se cambió en esta tarea.
- **Siguiente tarea:** A02-03, eliminar la segunda petición checkVinDuplicate cuando el mismo VIN ya fue consultado al perder foco, manteniendo la validación autoritativa de WRITE.
- **Contexto:** se separan las optimizaciones de latencia de los defectos de trazabilidad; las comprobaciones de persistencia/autoría no se eliminan.


## A02-03 implementada — deduplicación del preflight VIN — 2026-11-22

- **Tarea realizada:** blur y submit de add_cortes ahora comparten checkVinDuplicateOnce_, con clave VIN normalizado + vehicleId. Si el blur ya consultó, el submit reutiliza el resultado; si la petición sigue pendiente, comparte la promesa; al editar el VIN o cambiar vehículo se invalida. Los errores no se cachean.
- **Seguridad de datos:** WRITE conserva la validación final de duplicados dentro de addOrUpdateCut, por lo que una carrera posterior al preflight sigue siendo rechazada por el servidor.
- **Pruebas añadidas:** single-flight, cache hit, cambio VIN/vehicleId, retry tras fallo y verificación de ambos callsites.
- **Estado:** código y pruebas preparados; CI pendiente.
- **Siguiente:** CI completo. Después continuar el trazado de refresh checkVehicle, uploads y video.


## A02-03 — corrección del mock de pruebas — 2026-11-22

- **Hallazgo CI:** la prueba de invalidación por cambio de vehículo falló porque el doble esperaba siempre vehicleId 204, aunque el escenario cambia intencionalmente a 205.
- **Corrección:** el assert ahora compara el payload con state.selectedVehicleId actual; la implementación transmitió el nuevo ID correctamente.
- **Estado:** prueba corregida; CI pendiente.
- **Siguiente:** repetir CI completo.


## A02-03 cerrada y A02-04 iniciada — 2026-11-22

- **Tarea realizada:** deduplicación del preflight VIN entre blur y submit en add_cortes. Se comparte una sola promesa/resultado por VIN normalizado + vehicleId; se invalida al editar/cambiar vehículo y no se cachean errores.
- **CI exacto:** SHA `f68691cffc630cdb0c1aef2eb316b6732bb3024a`; 302 suites / 3,531 pruebas / 0 fallos; AddCortesDiagnostics 19/19; health read-only y Pages SUCCESS.
- **Siguiente tarea:** A02-04, sustituir el refresco amplio checkVehicle posterior a guardar corte por proyección dirigida getVehicleProjection para el vehículo guardado, manteniendo datos frescos de slots y video.
- **Contexto:** WRITE sigue comprobando VIN en servidor dentro de la mutación; el caché solo elimina la consulta duplicada de interfaz.


## A02-04 implementada — refresco dirigido tras alta/recuperación — 2026-11-22

- **Tarea realizada:** los tres caminos que actualizan el vehículo tras WRITE o recuperación ya no repiten checkVehicle con criterios amplios. refreshSelectedVehicleMatch consulta getVehicleProjection({vehicleId}) y reemplaza solo el elemento correspondiente en state.matches.
- **Datos conservados:** tipo de corte, disponibilidad y videoGuiaDesarmeUrl provienen de la proyección del vehículo. Si falla la proyección, el fallback mantiene disponibilidad desconocida para un vehículo existente.
- **Pruebas añadidas:** petición dirigida única, ID exacto, actualización puntual, disponibilidad/vídeo y fallback.
- **Estado:** implementación preparada; CI pendiente.
- **Siguiente:** ejecutar regresión completa. Después continuar con el inventario de llamadas/revalidaciones de imágenes y vídeo, y corregir la trazabilidad A05 de aportes suplementarios.


## A02-04 — corrección del harness — 2026-11-22

- **Hallazgo CI:** 3,478 pruebas aprobaron y falló el escenario de fallback de AddCortesDiagnostics porque el helper aislado no recibió el objeto diagnostics usado para emitir warn.
- **Corrección:** se inyecta un logger no-op en ambas instancias del helper de prueba; la lógica de producción no cambia.
- **Estado:** CI pendiente.
- **Siguiente:** repetir CI completo.


## A02-04 cerrada; comienza auditoría de imágenes — 2026-11-22

- **Tarea realizada:** refresco post-WRITE y recuperación migrado de checkVehicle (coincidencias amplias) a getVehicleProjection por vehicleId.
- **CI exacto:** SHA `825b048db860a0928205a4f288f5d4b3b8fd3c13`; 302 suites / 3,533 pruebas / 0 fallos; health read-only y Pages SUCCESS.
- **Siguiente tarea:** A02-05, trazado de imágenes en add_cortes y modales +: lectura de archivos, validaciones, carga a Drive, ledger, reintentos y verificación posterior.
- **Contexto:** se busca eliminar trabajo duplicado sin quitar comprobaciones necesarias para evitar pérdida/duplicación de aportes. La prueba CI no sustituye la prueba de navegador/Apps Script Beta.


## A02-05 implementada — evitar doble validación del ledger — 2026-11-22

- **Tarea realizada:** handleAddSupplementaryInfo ahora reutiliza contributionLedgerSheet después de la carga de imagen, en vez de volver a ejecutar getVehicleContributionLedgerSheet_.
- **Motivo:** se mantiene la validación del esquema antes de iniciar efectos externos (Drive), pero se evita repetir la consulta de hoja y la lectura de encabezados dentro de la misma petición.
- **Prueba añadida:** el contrato verifica una sola obtención/validación del ledger y que precede a la carga de imágenes.
- **Estado:** CI pendiente.
- **Siguiente:** CI completo; después medir lecturas de ImageUploadEvents y búsquedas de archivos en Drive, preservando recuperación e idempotencia.


## A02-06 implementada — reserva de imagen sin relectura inmediata — 2026-11-22

- **Tarea realizada:** el evento reserved devuelto por appendImageUploadEventRequired_ se reutiliza como snapshot inicial. Se elimina la lectura completa del ledger que inmediatamente repetía la búsqueda del evento recién confirmado.
- **Seguridad/idempotencia:** la reserva y su read-back TextFinder permanecen antes de crear el archivo. Se conservan las lecturas posteriores a Drive y la confirmación final, necesarias para detectar concurrencia, más de un fileId o requires_review.
- **Prueba añadida:** verifica el uso del evento devuelto y ausencia de relectura entre append reserved y la selección/creación del archivo.
- **Estado:** CI pendiente.
- **Siguiente:** ejecutar regresión; continuar auditoría de las lecturas repetidas en markImageUploadLinked y de búsquedas de archivos Drive.
