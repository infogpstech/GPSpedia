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
