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
