================================================================================
AUG-053 — ITERACIÓN 14 — 2026-11-11 — CONTINUIDAD DE SESIÓN ENTRE SNAPSHOT DURABLE Y ENVÍO
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. AUG-053 continúa EN PROGRESO.
Rama: GPSpedia2.2.5_work. HEAD anterior: 937757b59673c46311c89ebdf1ef8871c9476600. Rama base verificada: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Hallazgo corregido:
- convertImageToEditable comparaba solo userId después de leer el archivo y no revalidaba el contexto completo tras guardar el snapshot en IndexedDB. Una continuación tardía podía hidratar mapas y modificar la interfaz después de logout/cambio de token o rol.
- submitAdminImageUploadOperation recapturaba la sesión al ejecutarse y solo comparaba ownerId, por lo que podía enviar una operación iniciada bajo otro contexto de sesión de la misma cuenta.

Corrección:
- El contexto completo de sesión se propaga desde la selección del archivo a la lectura, persistencia, envío, reintento y reconciliación.
- Se revalida después de leer el archivo y después de persistir el snapshot, antes de actualizar memoria/UI o enviar la solicitud.
- Si la sesión cambia después de persistir, se conserva el snapshot durable para su propietario y se detiene el envío.
- Los callbacks de error obsoletos no restauran imágenes ni muestran avisos sobre una interfaz de otra sesión.
- La eliminación IndexedDB conserva la guarda posterior al await: si la sesión cambia, no se actualizan mapas en memoria. La eliminación owner/opId solo se solicita después de confirmación remota y baseline local.

Archivos: ui.js, Services/Test/AdminModalEditRestoreContract.js, Services/Test/README.md, Auditoría.txt, ChangesLogs.txt, Tareas_pendientes_parte1.txt y checkpoint.md.
Validación local: contratos AdminModalEditRestoreContract 10/10 PASS; parsing V8 de ui.js PASS.
Validación diferida a Beta: navegador real, IndexedDB real, cambio multi-pestaña y servicios Apps Script/Drive.
Siguiente iteración: continuar AUG-053 con el siguiente escenario del ciclo combinado snapshot/operación pendiente que aún no tenga cobertura local. No iniciar AUG-054.
================================================================================

================================================================================
AUG-053 — ITERACIÓN 13 — 2026-11-11 — REVALIDACIÓN DE SESIÓN EN RECONCILIACIÓN ASÍNCRONA
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. AUG-053 continúa EN PROGRESO.
Rama: GPSpedia2.2.5_work. HEAD de partida: 01591f5b8413ae3aaa80c6e123a0d9726bcc8b24. Rama base verificada: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Hallazgo corregido:
- loadPendingAdminImageUploads solo comparaba userId después de esperar IndexedDB. Una sesión nueva de la misma cuenta podía recibir el resultado de una lectura iniciada con otro token/contexto.
- resolvePendingAdminImageOperationsBeforeDiscard_ no revalidaba el contexto después de consultar getAdminImageUploadStatus ni después de reconciliar un reemplazo vinculado; podía continuar con una respuesta tardía.
- La limpieza y verificación posterior en IndexedDB podían actualizar los mapas de memoria después de cambiar la sesión.

Corrección:
- La carga captura el contexto completo y lo revalida después de Promise.all antes de hidratar mapas.
- La consulta remota y la reconciliación vinculada revalidan la sesión original antes de interpretar resultados o continuar.
- El baseline recibe el contexto esperado; la eliminación/relectura local exige el mismo contexto antes de modificar mapas.
- El flujo normal de envío revalida después de eliminar o releer IndexedDB antes de actualizar el estado en memoria.
- Se conserva el aislamiento por ownerId; no se habilita recuperación cruzada.

Archivos: ui.js, Services/Test/AdminModalEditRestoreContract.js, Services/Test/README.md, ChangesLogs.txt, Tareas_pendientes_parte1.txt y checkpoint.md.
Validación local: parsing V8 PASS; AdminModalEditRestoreContract 7/7 PASS. No se ejecutaron navegador/IndexedDB real ni pruebas multi-pestaña; quedan reservadas a Beta.
Siguiente iteración: continuar exclusivamente con el ciclo combinado de snapshot/operación pendiente, revisando orden de persistencia durable y cambio de sesión durante eliminación IndexedDB. No iniciar AUG-054.
================================================================================

================================================================================
AUG-053 — ITERACIÓN 12 — 2026-11-11 — RECONCILIACIÓN CONSERVADORA DE REEMPLAZOS DE IMAGEN
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. AUG-053 continúa EN PROGRESO.
Rama: GPSpedia2.2.5_work. HEAD de partida: c06519bdb758c7778018edd479fb9a01ce4fb695. Rama base verificada: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Hallazgo corregido:
- resolvePendingAdminImageOperationsBeforeDiscard_ trataba not_found como si el servidor hubiera cancelado el reemplazo. Sin embargo, not_found solo indica que el ledger aún no tiene registro; una solicitud previa puede seguir esperando antes de crear su registro remoto. Limpiar el Data URL/opId en ese estado podía destruir la única copia necesaria para recuperar la operación.
- Se añadió isAdminImageUploadStatusConfirmedCancelled en adminImageUploadIsolation.js. Solo el estado explícito cancelled permite actualizar baseline y limpiar directamente.
- Para not_found, el descarte ahora se detiene con un mensaje claro y conserva intactos el snapshot local, Data URL y opId. El usuario puede reintentar/reconciliar usando el mismo identificador cuando la solicitud previa ya haya terminado.
- linked continúa por la ruta idempotente de uploadAdminImage, que confirma el estado vigente/superseded y exige integridad del archivo cuando el enlace sigue activo. pending/requires_review siguen bloqueando el descarte.
- No cambia la política privada por ownerId ni se habilita recuperación cruzada.

Archivos funcionales: ui.js y adminImageUploadIsolation.js.
Pruebas: Services/Test/AdminImageUploadIsolation.js (10 escenarios); Services/Test/AdminModalEditRestoreContract.js (4 contratos). Documentación: Services/Test/README.md, ChangesLogs.txt, Tareas_pendientes_parte1.txt y checkpoint.md.

Validación local en runtime V8 adaptado:
- Parsing V8 de ui.js, adminImageUploadIsolation.js, Services/admin.js y suites relacionadas: PASS.
- AdminImageUploadIsolation: 10/10 PASS.
- AdminModalEditRestoreContract: 4/4 PASS.
- EditBackupIsolation: 12/12 PASS.
- AdminModalEditSecurity: 13/13 PASS.
- ActionDispatchContract: 10/10 PASS.
No ejecutado: IndexedDB/navegador real, solicitudes concurrentes Apps Script, Spreadsheet ni Drive reales. Se mantienen como validaciones Beta; no se simularon ni se reportan como realizadas.

Commits de esta iteración publicados secuencialmente: ddf76ac0cd9ce10072116457900a716ef7ed9e59, 9207a5a7d5f3b0bf6b10621969b377f2d0532ba1, 7a51edf33159481f341d44f693a7e1ac69b50e48, e99377688665c6526e6a74c69ba8ccd9800bd696, f4722cb36276a0505a42e227f9c613a69274ae0e, 5d850cc4493d077397071167a16c1be9c108f881, 9efd76f9cd03409e5732c9b897b95cea5ac1c9e7 y 209b42399117e5195ab6c1d5d798bfc48c03a600. Rama base sin cambios.

Siguiente iteración: continuar exclusivamente con pruebas de contrato del ciclo completo de snapshot/operación pendiente, enfocadas en cambio de sesión durante la consulta de estado y eliminación posterior; verificar que ningún resultado asíncrono de otra sesión pueda actualizar baseline o limpiar una operación. No iniciar AUG-054.
================================================================================


================================================================================
AUG-053 — ITERACIÓN 11 — 2026-11-11 — RESTAURACIÓN ACOTADA DEL EDITOR IN-MODAL
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. AUG-053 continúa EN PROGRESO.
Rama: GPSpedia2.2.5_work. HEAD de partida: 26cc7e5d335fd76289b2fcd2cca7cf81b8ab09c0. HEAD antes de este checkpoint: ac5ac581e5a74633067ad106e852cb2eef1bb5db. Rama base verificada: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Hallazgo corregido:
- exitModalEditMode comparaba todas las propiedades del snapshot completo. Si el búfer de edición no estaba disponible, podía considerar modificados id, marca, contadores y metadatos ajenos al modal; el backend los rechazaría por whitelist y el descarte no podría terminar.
- Se añadió getEditBackupFieldsToRestore en editBackupStore.js. La selección exige snapshot, ficha actual verificable y whitelist; solo devuelve propiedades permitidas que realmente difieren.
- ui.js define ADMIN_MODAL_EDIT_FIELDS con los mismos campos base que Services/admin.js y los campos dinámicos tipoCorte/configRelay/ubicacionCorte/colorCableCorte 1–3. El descarte usa el búfer vigente del vehículo y, si falta, obtiene getCatalogData y localiza la ficha actual antes de seleccionar campos. La verificación posterior a las escrituras se conserva.
- Los reemplazos de imagen siguen reconciliándose antes del descarte y el baseline confirmado se mantiene; no se amplió el acceso de Gefe ni la privacidad por ownerId.

Archivos funcionales: ui.js y editBackupStore.js.
Pruebas/documentación: Services/Test/EditBackupIsolation.js (12 escenarios), Services/Test/AdminModalEditRestoreContract.js (3 contratos), Services/Test/README.md, ChangesLogs.txt, Tareas_pendientes_parte1.txt y checkpoint.md.

Validación local en runtime V8 adaptado:
- Parsing de ui.js, editBackupStore.js, Services/admin.js y las suites nuevas: PASS.
- EditBackupIsolation: 12/12 PASS.
- AdminModalEditRestoreContract: 3/3 PASS (whitelist UI/backend, helper de restauración y fallback a ficha actual).
- AdminModalEditSecurity: 13/13 PASS.
- ActionDispatchContract: 10/10 PASS.
No ejecutado: Node CLI literal, navegador/IndexedDB real, recarga y multi-pestaña reales, ni integración Apps Script/Spreadsheet/Drive. Se mantienen como validaciones Beta; no se simularon ni se reportan como realizadas.

Commits de esta iteración (publicados secuencialmente por archivo): 057508d3f9eca0ac9636333fc09e21b5d3b6b06f, b83f017a873bb2c1c6656031ca2e8f1be35977a4, 470e33fa6c6492f6e47a083988a0fefb05b0eb80, ebd1fe7ba0e6d49bdcd0c2941db91eb33abc0f1f, 4784f7135d370bd237c180a8594eb7fa7ec2b390, 0a3c6e11efdbd3a58a6eef7b7c11774856d7b54a, 7b38ff9571a6cc8abf027b68641233e77139ab68 y ac5ac581e5a74633067ad106e852cb2eef1bb5db. Rama base sin cambios.

Siguiente iteración: continuar exclusivamente con el siguiente bloque de validación local pendiente de AUG-053, centrado en el ciclo combinado de snapshot de edición y operaciones pendientes de imagen (recuperación, reconciliación, descarte y preservación por ownerId). No iniciar AUG-054.
================================================================================


================================================================================
AUG-053 — ITERACIÓN 4 — 2026-11-11 — POLÍTICA DE RETENCIÓN Y LIMPIEZA SEGURA
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. AUG-053 continúa EN PROGRESO.
Rama: GPSpedia2.2.5_work. HEAD de partida: 4faef14c4df300918c570b286b77c2fdd45044fa. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).
Se establece una política conservadora: no aplicar TTL automático a addCutPending ni gpsepedia_pending_operation mientras el resultado remoto pueda ser incierto, ni a gpsepedia_edit_backup mientras una edición interrumpida pueda requerir recuperación. Los snapshots de operaciones solo se limpian después de confirmación autoritativa del servidor y por owner/opId; las copias de edición solo tras cierre explícito/verificado y por owner/vehículo. Los registros legados en cuarentena se preservan. No se modifica adminImageUploadPending porque su política de privacidad ADMIN sigue pendiente de decisión.
Pruebas añadidas: PendingOperationIsolation.js (8 escenarios), EditBackupIsolation.js (8 escenarios) e IndexedDBTransactions.js (22 escenarios, incluido snapshot addCutPending antiguo y eliminación cruzada rechazada). No se introduce una purga global ni se elimina Data URL recuperable por antigüedad.
Siguiente iteración: resolver exclusivamente la decisión pendiente sobre privacidad/propiedad de adminImageUploadPending; no iniciar AUG-054.
================================================================================

================================================================================
AUG-053 — ITERACIÓN 3 — 2026-11-11 — OWNER-BOUND DE gpsepedia_edit_backup
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. AUG-053 continúa EN PROGRESO.
Rama: GPSpedia2.2.5_work. HEAD anterior: 89f21f4af5fc79684dc30032fd66805f33f604c8. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).
Se agregó editBackupStore.js: snapshots separados por ownerId y vehicleId, validación de identidad del vehículo, verificación de escritura, eliminación limitada al par cuenta/vehículo y sanitización recursiva de tokens/credenciales. Las copias legadas sin propietario se conservan en cuarentena y nunca se restauran; una copia legada con ownerId y vehicleId explícitos puede migrarse.
ui.js ahora exige sesión Desarrollador válida para iniciar/terminar edición, persiste y recupera exclusivamente la copia de la cuenta y vehículo actuales, conserva una copia previa del mismo propietario al reanudar tras una interrupción, y limpia solo el estado en memoria al cambiar de sesión sin borrar el snapshot persistido. Comprueba que la sesión siga siendo la misma tras esperas asíncronas y no restaura campos si cambia. La actualización de la base de descarte tras un reemplazo confirmado también queda limitada a la sesión y vehículo que iniciaron la edición.
Pruebas añadidas: Services/Test/EditBackupIsolation.js (7 escenarios). Se corrigió y revisó el comportamiento del baseline cuando el reemplazo de imagen ocurre fuera del modo de edición: en ese caso no existe copia que actualizar y la operación no debe marcarse como fallida. Validación local: editBackupStore.js y ui.js pasan parsing; siete escenarios ejecutados contra el módulo fuente: 7/7 PASS. Navegador real, cambio entre pestañas y flujo de reemplazo de imagen se validan en Beta. Navegador real, cambio entre pestañas y flujo de reemplazo de imagen se validan en Beta.
Fuera de alcance: adminImageUploadPending y política de privacidad de reemplazos ADMIN (requiere decisión explícita); retención/expiración y limpieza global siguen pendientes. No iniciar AUG-054.
Siguiente iteración: atender únicamente el siguiente bloque no dependiente de la decisión ADMIN dentro de AUG-053.
================================================================================

================================================================================
AUG-053 — ITERACIÓN 2 — 2026-11-11 — OWNER-BOUND Y RECUPERACIÓN DE gpsepedia_pending_operation
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. AUG-053 continúa EN PROGRESO con las áreas restantes.
Rama: GPSpedia2.2.5_work. Commit anterior: c524460523f9e4ee62d1657ecc1a10bcc9634419. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).
Se creó pendingOperationStore.js para almacenar snapshots bajo una clave por ownerId, verificar escrituras, restringir lectura/eliminación al propietario y retirar recursivamente SessionToken, tokens, contraseñas y credenciales. La clave global legada se migra solo si contiene ownerId/userId explícito; los registros sin propietario, corruptos o en conflicto se conservan en cuarentena sin restauración ni reintento.
add_cortes.html asocia ownerId al crear snapshots, comprueba que la sesión vigente corresponde al propietario antes de recuperar/consultar/reintentar y utiliza el token actual en memoria. Se eliminaron trazas que imprimían snapshots/respuestas completas y errores sin sanitizar. La sanitización excluye cualquier campo cuyo nombre contenga «token», además de contraseñas, credenciales y autorizaciones; los fallos de validación VIN y de sugerencias registran solo el tipo de error, y la respuesta de escritura registra únicamente vehicleId.
Validación local: PendingOperationIsolation.js 7/7 PASS en Node v22; pendingOperationStore.js pasa node --check. Se añadió una salida segura si falla la lectura del snapshot antes de obtener el opId: se detiene el envío y se restaura la interfaz para evitar continuar con un identificador incierto. También se vuelve a comprobar el propietario después de la consulta VIN y después de la respuesta de addOrUpdateCut, evitando continuar la interfaz o limpiar el snapshot si la sesión cambió durante una espera de red. Pendiente validar sintaxis del módulo inline de add_cortes.html y ejecutar regresiones de integración con navegador real; esta última queda para Beta.
Archivos: add_cortes.html, pendingOperationStore.js, Services/Test/PendingOperationIsolation.js, Services/Test/README.md, ChangesLogs.txt, Tareas_pendientes_parte1.txt y checkpoint.md.
Fuera de alcance: adminImageUploadPending y gpsepedia_edit_backup. La política de acceso de reemplazos ADMIN sigue pendiente de decisión explícita. No iniciar AUG-054.
Siguiente iteración: abordar únicamente el siguiente bloque de AUG-053 que no dependa de la política ADMIN, sin mezclar tareas.
================================================================================

================================================================================
AUG-053 — ITERACIÓN 1 — 2026-11-11 — AISLAMIENTO DE addCutPending POR CUENTA
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. AUG-053 continúa EN PROGRESO con las demás áreas pendientes.
Rama: GPSpedia2.2.5_work. Commit de implementación: c738a810c537c69f8835519604dbcf2016951b58. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).
Las claves IndexedDB se particionan por ownerId/vehicleId; las claves legadas se migran al propietario registrado y los registros sin owner o en conflicto se conservan en cuarentena, sin recuperación automática. Lectura, escritura y eliminación validan ownerId. Antes de addOrUpdateCut se comprueba de nuevo la cuenta propietaria y se usa el SessionToken vigente en memoria; no se persisten SessionToken ni credenciales.
Validación local: parsing V8 de offline.js, ui.js y Services/Test/IndexedDBTransactions.js PASS. Cinco escenarios addCutPending ejecutados contra las funciones reales con IndexedDB simulado: 5/5 PASS (dos cuentas/vehículo, conflicto intra-cuenta, migración legado, legado de otra cuenta y eliminación por owner); se verificó además que no se guarden sessionToken/SessionToken. La suite completa Node CLI no se ejecutó literalmente; IndexedDB real, cambio de cuenta entre pestañas y navegador real quedan reservados a Beta.
Fuera de alcance: gpsepedia_pending_operation, adminImageUploadPending y gpsepedia_edit_backup. La política de acceso a reemplazos ADMIN requiere definición explícita (privados por iniciador o compartidos entre Desarrolladores); no se presume ninguna.
Siguiente iteración: abordar únicamente owner-bound y recuperación de gpsepedia_pending_operation. No iniciar AUG-054 ni otras tareas.
================================================================================

================================================================================
AUG-053 — ITERACIÓN 1 — 2026-11-11 — AISLAMIENTO DE addCutPending POR CUENTA
Estado: EN PROGRESO. Implementación y cinco regresiones añadidas; validación local y revisión final pendientes.
Rama: GPSpedia2.2.5_work. HEAD de partida: 51cb25ca6a7dde1715960b9616b34110325e09ad. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).
Alcance: operaciones pendientes del modal «Agregar Corte». Las claves IndexedDB se particionan por ownerId/vehicleId; las claves legadas se migran al propietario registrado y los registros sin owner o en conflicto se conservan en cuarentena, sin recuperación automática. Lectura, escritura y eliminación validan ownerId. Antes de addOrUpdateCut se vuelve a comprobar la cuenta propietaria y se utiliza el SessionToken vigente en memoria; el token no se persiste.
Pruebas añadidas en Services/Test/IndexedDBTransactions.js: coexistencia de dos cuentas para un vehículo, conflicto dentro de la misma cuenta, migración de registro legado, aislamiento de legado ajeno y eliminación restringida al propietario. Validación pendiente de ejecutar antes del cierre.
Fuera de alcance: gpsepedia_pending_operation, adminImageUploadPending y gpsepedia_edit_backup. La política de acceso a reemplazos ADMIN requiere definición explícita (privados por iniciador o compartidos entre Desarrolladores); no se presume ninguna.
Siguiente iteración: abordar únicamente owner-bound y recuperación de gpsepedia_pending_operation. No iniciar AUG-054 ni otras tareas.
================================================================================

================================================================================
AUG-052 — ITERACIÓN 6 — 2026-11-11 — ESCENARIOS LOCALES DE INICIO Y PWA
Estado: CRITERIO 5 COMPLETADO CON VALIDACIÓN DIFERIDA; AUG-052 queda pendiente únicamente de validaciones Beta reales.
Rama: GPSpedia2.2.5_work. HEAD de partida: 4572195365ffb02c3fedaf0548489f5ecb9d00af. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).
Se agregó Services/Test/PWAStartupScenarios.js con diez escenarios: primera instalación y grafo de módulos; actualización v14→v15; preservación del caché anterior ante fallo esencial; limpieza de cachés anteriores sin borrar los de otras aplicaciones; navegación offline desde deep link con fallback a index.html; guardia de deep link sin sesión y catálogo idle; error terminal sin catálogo; uso de snapshot stale; API lenta/caída con máximo de tres intentos; y snapshots sintéticos de 0, 250, 2,500 y 10,000 Cortes con rechazo de IDs duplicados.
Validación: runtime V8 adaptado 10/10 escenarios PASS. Se usaron fuentes vigentes de service-worker.js, main.js, state.js y catalogRequest.js y dobles de Cache Storage/fetch/AbortController; la validación de snapshots se contrastó con el contrato de offline.js. No se ejecutó Node CLI literal por no disponer de checkout local. No se ejecutaron navegador/dispositivo real, Cache Storage real, red, Apps Script ni Spreadsheet; quedan reservados a Beta y no bloquean el cierre local.
Archivos: Services/Test/PWAStartupScenarios.js (nuevo), Services/Test/README.md, ChangesLogs.txt, Tareas_pendientes_parte1.txt y checkpoint.md. Sin cambios funcionales, endpoints, contratos, despliegues ni datos productivos.
Siguiente: no iniciar AUG-053. AUG-052 queda COMPLETADA CON VALIDACIÓN DIFERIDA; las pruebas de integración real se ejecutarán en Beta.
================================================================================

================================================================================
AUG-051 — ITERACIÓN 10 — 2026-11-11 — CONCURRENCIA DE COMPRESIÓN
Estado: EN PROGRESO — implementación realizada; validación integrada pendiente.
Rama: GPSpedia2.2.5_work. HEAD de partida: 0433fbf32243382c1f2c13dffefc3ec18240f383.
Se añadió thumbnailCompressionQueue.js con cola FIFO y máximo de dos trabajos activos por instancia JavaScript/pestaña. offline.js ejecuta por la cola la descarga, decodificación, generación y persistencia de cada miniatura; reconsulta la caché al obtener turno para evitar trabajo duplicado si otra solicitud ya guardó la misma variante. ImageBitmap se cierra en finally y el turno se libera antes de resolver/rechazar el trabajo.
Pruebas añadidas: Services/Test/IndexedDBTransactions.js incluye cinco solicitudes simultáneas, verifica máximo dos ImageBitmap activos, persistencia de resultados y cierre de los cinco bitmaps.
Validación ejecutada: Node CLI aislado del limitador 3/3 (límite, FIFO y liberación tras rechazo); simulación de cinco trabajos/bitmaps 2/2; parsing V8 de offline.js y suite: PASS. La suite integrada IndexedDBTransactions.js no pudo completarse con el adaptador de este entorno; requiere ejecución literal en checkout local. No se afirma como aprobada.
Archivos funcionales: thumbnailCompressionQueue.js, offline.js. Pruebas: Services/Test/IndexedDBTransactions.js. Documentación: Services/Test/README.md, ChangesLogs.txt, Tareas.txt, Tareas_pendientes_parte1.txt y checkpoint.md.
Siguiente iteración: ejecutar node --experimental-default-type=module Services/Test/IndexedDBTransactions.js en checkout local, revisar la regresión y cerrar AUG-051. No iniciar AUG-052.
================================================================================

================================================================================
CHECKPOINT ACTIVO — GPSpedia — 2026-11-11
AUG-051 — ITERACIÓN 9 — PRESUPUESTO RAM DE MINIATURAS
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD de partida: f4cf944ad37515e8408057f3b3935af67d04e2c3.
Se limita a 64 MiB el total de Blob.size retenido por ObjectURL activos. Las URL compartidas se cuentan una vez; si una nueva miniatura no cabe, attach devuelve null y ui.js mantiene fallback remoto. Al salir el último consumidor, la revocación libera los bytes contabilizados.
El límite no representa RAM total: excluye superficies decodificadas/GPU y recursos remotos. Suite ampliada a 10 escenarios. Siguiente: continuar en otra interacción con la siguiente iteración de AUG-051, dedicada exclusivamente a concurrencia de compresión. No iniciar AUG-052.
================================================================================

================================================================================
AUG-051 — ITERACIÓN 7 — 2026-11-11
Estado: BLOQUEADA POR DEPENDENCIA TÉCNICA; sin cambios funcionales.
Rama: GPSpedia2.2.5_work. HEAD de análisis: 51fae20e1e90d224ee4d833978a7802a9434e07b. Rama base verificada: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Hallazgo: ui.js mantiene memoryUrlCache como Map ilimitado de claves a URLs blob. Limitar únicamente el número de entradas del Map no libera la memoria binaria: los Blob asociados a URL.createObjectURL permanecen registrados hasta revocar sus URLs. Por tanto, un límite de entradas sin un ciclo seguro de revocación no satisface el objetivo de limitar la memoria RAM.
Dependencia: el ciclo de vida/revocación de ObjectURL, inicialmente planificado para una iteración posterior, es requisito técnico previo para implementar y probar un límite RAM real. No se modificó código ni se simuló una liberación de memoria inexistente.
Siguiente iteración propuesta: abordar exclusivamente el ciclo de vida seguro de ObjectURL como prerrequisito; después retomar el límite RAM. No iniciar concurrencia de compresión ni AUG-052.
================================================================================

================================================================================
AUG-051 — ITERACIÓN 6 — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD de partida: c6de15be2196332cf1e5a959de6fa040395b6cbf.
Resultado: al recibir QuotaExceededError al persistir miniaturas, se elimina progresivamente el 25 % más antiguo del almacén thumbnails según LRU y se reintenta la escritura. Si solo quedan registros heredados, se liberan sus claves por lotes. Si se agotan las miniaturas y la cuota sigue agotada, no se guarda el caché; los demás almacenes permanecen intactos.
Validación local: parsing V8 de offline.js y Services/Test/IndexedDBTransactions.js aprobado. Suite completa ejecutada desde el código recuperado del repositorio en V8 adaptado (cargador de módulos, assert y globals Node ausentes): 15/15 PASS. Node CLI literal no ejecutado por ausencia de checkout local y fallo de resolución DNS. IndexedDB real y multi-pestaña quedan reservados a Beta.
Archivos: offline.js, Services/Test/IndexedDBTransactions.js, Services/Test/README.md, Tareas.txt, ChangesLogs.txt y checkpoint.md.
Siguiente iteración AUG-051: abordar únicamente el límite de memoria RAM de miniaturas. No iniciar revocación de ObjectURL, concurrencia de compresión ni AUG-052.
================================================================================

# Checkpoint activo — GPSpedia

================================================================================
AUG-051 — ITERACIÓN 1 — 2026-11-11
Estado: EN PROGRESO.
Rama: GPSpedia2.2.5_work. Base funcional de la tarea: 2746d5d7bf7799c6f0a9c248befbac9de032be3c (AUG-050).
Problema resuelto en esta iteración: la capa genérica performOp podía resolver al completarse request.onsuccess, antes de que IndexedDB confirmara transaction.oncomplete. Ahora espera el commit y rechaza ante onerror/onabort; initDB cierra conexiones en onversionchange y falla explícitamente ante onblocked/timeout. Se añadió una suite sintética para commit, abort, cuota, versionchange y bloqueo de upgrade.
Archivos funcionales: offline.js. Pruebas: Services/Test/IndexedDBTransactions.js.
Validación: pendiente de ejecutar Node CLI y navegador real. No se declara validación funcional hasta ejecutar la suite. Sin cambios de versión de DB, stores, datos locales, endpoints ni servicios productivos.
Pendiente AUG-051: aislamiento/retención por cuenta de searchHistory y viewedItems; clasificación explícita de validationCache; cuotas/LRU/TTL de thumbnails; claves por tamaño, imgApertura y campos de imagen; límite RAM, ciclo de ObjectURL, concurrencia de compresión y cierre de ImageBitmap; pruebas multi-cuenta/offline/imagen y upgrade multi-pestaña.
Siguiente iteración: continuar AUG-051 desde el aislamiento de historial/vistos y la política de validationCache, sin iniciar AUG-052.
================================================================================


Normativa única: [NORMAS_DESAROLLO.md](NORMAS_DESAROLLO.md). El historial previo permanece en `Olds/Documentacion_Legacy/`.

================================================================================
AUG-050 — CIERRE — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. Padre de este commit: 080600cbb81ac4f638433a53ed7a5377679d7e61. Rama base protegida: GPSpedia2.2.5.
Resultado:
- Firmas persistidas/restauradas solo con versión y fingerprint compatibles; navegación y detalle integrados con ensureVinSignatures.
- Resolución por classKey e identidad completa; contexto contradictorio rechazado y ambigüedad conservada.
- Todas las alternativas ambiguas se mapean por classKey a filas/versiones; UI las presenta como opciones, muestra aviso y no autoabre la primera.
- La versión identificada se conserva en el resultado y tarjeta; el detalle renderiza la firma diferencial de cada versión aplicable.
- extractSharedChars devuelve únicamente pares posición/valor idénticos en todas las firmas.
- Umbral de muestras, competidores por rango, semántica de rangos y VIN completo/prefijos ya implementados.
- Búsqueda combinatoria perezosa, con máximo predeterminado 20,000 evaluaciones por clase; registra evaluaciones/comparaciones y deja la firma pendiente de revisión si agota el presupuesto.
Pruebas locales: suites VIN de persistencia, contexto, umbral, rangos, normalización y cierre AUG-050.
Validación Beta pendiente: medición de tiempo/coste sobre catálogo operativo, navegador real y navegación visual multi-versión/generación. No se accedió a catálogo, Apps Script, Spreadsheet ni endpoints productivos.
Archivos funcionales: VinDifferentialEngine.js, navigation.js, ui.js. Suite: Services/Test/VinAUG050Completion.js.
Documentación: Services/Test/README.md, ChangesLogs.txt, Tareas_pendientes_parte1.txt y Tareas.txt.
AUG-051 no iniciada.
================================================================================


================================================================================
AUG-051 — ITERACIÓN 8 — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD de partida: cec91725351ce071834e8523d3ef045b9516627d (commit documental posterior al checkpoint de iteración 7; sin cambios funcionales).
Dependencia resuelta: se implementó el ciclo de vida de ObjectURL antes del límite RAM. imageObjectUrlCache.js mantiene referencias por elemento, comparte URL solo entre consumidores activos, revoca al quedar sin consumidores y observa elementos retirados del DOM. ui.js libera la referencia anterior al iniciar una nueva carga, descarta respuestas asíncronas obsoletas y no crea URL para imágenes desconectadas ni durante compresión sin consumidor.
Pruebas: Services/Test/ImageObjectUrlLifecycle.js (7 casos sintéticos). Validación de DOM/MutationObserver real y navegación visual queda diferida a Beta.
Archivos: ui.js, imageObjectUrlCache.js, Services/Test/ImageObjectUrlLifecycle.js, Services/Test/README.md, ChangesLogs.txt, Tareas.txt, Tareas_pendientes_parte1.txt y checkpoint.md.
Siguiente iteración: implementar exclusivamente el límite RAM de miniaturas usando el ciclo de vida ahora disponible. No iniciar concurrencia de compresión ni AUG-052.
================================================================================


================================================================================
ADENDA DE CONTINUIDAD — AUG-051 ITERACIÓN 10 — 2026-11-11
Estado: EN PROGRESO — revisión y validación parcial realizadas; suite integrada aún sin ejecución.
HEAD confirmado al reanudar: 3c0147f9558735ab041fb6f848a3c7be93652ddb. Rama de trabajo: GPSpedia2.2.5_work. Comparación con GPSpedia2.2.5: idéntica al HEAD confirmado; sin cambios concurrentes.
Se revisó NORMAS_DESAROLLO.md, el checkpoint y los archivos de cola, integración y pruebas. La rama permanece en el commit de la iteración 10.
Validación adicional reproducible en el runtime disponible: limitador probado con 5 trabajos/límite 2, 4 trabajos/límite 1 incluyendo rechazo, y 9 trabajos/límite 3. FIFO, máximo simultáneo, liberación de turno y estado final active=0/queued=0: PASS. Parsing de helper, offline.js y suite: PASS.
No se pudo ejecutar literalmente la suite IndexedDBTransactions.js: este entorno no contiene checkout local ni Node CLI asociado al repositorio. Los intentos de adaptar el harness IndexedDB en V8 no se consideran una ejecución válida y no se reportan como PASS. No se modificó el código funcional durante esta reanudación.
Acción para continuar: disponer de un checkout local de GPSpedia2.2.5_work y ejecutar node --experimental-default-type=module Services/Test/IndexedDBTransactions.js; revisar cualquier fallo y cerrar iteración 10. No iniciar AUG-052.
================================================================================


================================================================================
ADENDA DE CONTINUIDAD — AUG-051 ITERACIÓN 10 — 2026-11-11
Estado: EN PROGRESO — suite integrada pendiente por falta de checkout local accesible.
HEAD confirmado: 77877a10b6d5b547e8c0f315465bc0e78c5e23cd. Rama de trabajo: GPSpedia2.2.5_work. HEAD de rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1. La rama base permanece sin modificaciones.
Corrección de precisión respecto a la adenda anterior: Node.js sí está instalado en el entorno (v22.16.0). El impedimento no es la ausencia de Node CLI, sino la falta de un checkout local del repositorio. Se intentó clonar GPSpedia2.2.5_work mediante Git, pero la conexión falló porque el entorno no pudo resolver github.com (Could not resolve host). Por tanto, no se ejecutó la suite original mediante Node.
Se intentó adaptar el harness de Services/Test/IndexedDBTransactions.js al runtime V8 disponible. La adaptación falló en el primer escenario por diferencias del entorno/adaptador en la simulación de IndexedDB; este resultado no es una ejecución válida de la suite y no se atribuye como fallo del código de producción ni como PASS.
No se modificó código funcional. Acción para reanudar: proporcionar un checkout local accesible de GPSpedia2.2.5_work o habilitar conectividad de red para clonarlo; después ejecutar node --experimental-default-type=module Services/Test/IndexedDBTransactions.js, revisar el resultado y cerrar únicamente la iteración 10. No iniciar AUG-052.
================================================================================


================================================================================
AUG-051 — CIERRE LOCAL — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD previo al cierre: a6433903d0cec16fa93d2af2718173b2a5486c26. Rama base: GPSpedia2.2.5; sin modificaciones.
Validación de iteración 10: Services/Test/IndexedDBTransactions.js ejecutada con el código de la rama en runtime V8 y adaptadores mínimos para módulos, aserciones y globals Node: 16/16 PASS. Incluye transacciones/abortos/cuota, aislamiento por cuenta, TTL/LRU, recuperación de cuota, solicitudes delete diferidas y concurrencia de cinco miniaturas con máximo de dos trabajos/bitmaps activos y cierre de los cinco ImageBitmap.
Validaciones adicionales: limitador aislado 3/3; simulación de cinco trabajos/recursos 2/2; parsing V8 de offline.js, thumbnailCompressionQueue.js y la suite aprobado.
Limitación explícita: Node CLI literal no ejecutado. Node 22.16.0 está disponible, pero no hay checkout local y git clone falla por DNS de github.com. La ejecución V8 adaptada sí completó los 16 escenarios; no se atribuye como ejecución Node.
Validaciones Beta pendientes: IndexedDB real, navegador real, operación offline y multi-pestaña. No se modificaron endpoints, deployments ni datos productivos.
AUG-051 cerrada localmente. No iniciar AUG-052 en esta iteración.
================================================================================

================================================================================
AUG-052 — ITERACIÓN 1 — 2026-11-11 — ESPERA TERMINAL DE DEEP LINKS
Estado: EN PROGRESO.
Rama: GPSpedia2.2.5_work. HEAD de partida: 8bc20a6eab1a0de252142ca7f2b35480b5f81f0d.
Se reemplaza el polling recursivo de 100 ms en main.js por waitForCatalogReadiness() en state.js. La espera se resuelve por suscripción ante catálogo ready/stale o error terminal, con timeout de 15 s. Si no hay sesión, el deep link queda pendiente hasta que el usuario inicie sesión; si vence el tiempo, se informa y se conserva una suscripción para aplicar la búsqueda si el catálogo llega después.
auth.js publica catalogLoadStatus/catalogLoadError al iniciar, cargar desde caché, completar red o fallar; si hay caché y falla la actualización, el estado es stale.
Prueba añadida: Services/Test/CatalogReadiness.js (4 escenarios: disponibilidad inmediata, cambio de estado, error y timeout). Validaciones de red, reintentos y PWA no forman parte de esta iteración.
Siguiente iteración: incorporar timeout/cancelación/reintento controlado al fetch de catálogo. No modificar el Service Worker ni iniciar otros criterios de AUG-052 en esta iteración.
================================================================================

================================================================================
AUG-052 — ITERACIÓN 2 — 2026-11-11 — TIMEOUT, CANCELACIÓN Y REINTENTOS
Estado: EN PROGRESO.
Rama: GPSpedia2.2.5_work. HEAD de partida: 4be9f57f3468110e3450a5547b88708901fced71.
Se añade catalogRequest.js con timeout de 8 s por intento, máximo de dos reintentos con backoff 400/800 ms, cancelación mediante AbortSignal y cancelación durante el backoff. Solo se reintentan timeouts, fallos de red TypeError y HTTP 408/429/5xx; errores HTTP permanentes, errores de aplicación y respuestas inválidas no se reintentan.
api-config.js integra el helper en fetchCatalogData y expone status en errores HTTP sin cambiar endpoint ni payload. auth.js cancela una carga previa al iniciar otra sesión y al cerrar sesión; ignora la respuesta de una carga cancelada/obsoleta. main.js amplía a 27 s la espera del deep link para cubrir el tiempo máximo configurado de los tres intentos.
Prueba añadida: Services/Test/CatalogRequestRetry.js (7 escenarios). Validación de red real, navegador, backend y Service Worker queda pendiente de Beta.
Siguiente iteración: resolver explícitamente la experiencia de error recuperable sin caché y la indicación de datos desactualizados cuando se conserva caché. No modificar todavía el Service Worker ni los endpoints.
================================================================================


================================================================================
AUG-052 — ITERACIÓN 3 — 2026-11-11 — ESTADO RECUPERABLE DEL CATÁLOGO
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD de partida: e60fbbb3cc080ebd9de61cce94ef8d49851685b8. Rama base verificada: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Se incorpora un aviso persistente para estados loading/stale/error. Cuando falla la actualización con caché, la interfaz informa que se muestran datos guardados posiblemente desactualizados. Cuando no hay catálogo, presenta un error recuperable y permite reintentar la carga desde la sesión vigente. Los deep links permanecen pendientes después de error/timeout y se aplican cuando una carga posterior alcanza ready/stale.
Archivos funcionales: catalogStatus.js, style.css, auth.js y main.js. Pruebas: Services/Test/CatalogStatus.js. Documentación: Services/Test/README.md, Tareas_pendientes_parte1.txt, ChangesLogs.txt y checkpoint.md.
Validaciones Beta pendientes: DOM/navegador real, interacción visual del reintento, recuperación offline y red real. No se modifican endpoints, backend ni Service Worker.
Siguiente iteración: continuar AUG-052 con el criterio 3 (precache del grafo de módulos, event.waitUntil y manejo de cuota). No iniciar AUG-053 ni otras tareas.
================================================================================


ADENDA DE VALIDACIÓN — AUG-052 ITERACIÓN 3 — 2026-11-11
- Suite Services/Test/CatalogStatus.js ejecutada en runtime V8 adaptado: 4/4 PASS (loading, stale, error recuperable y ocultación en ready/idle).
- Parsing V8 de main.js, auth.js y Services/Test/CatalogStatus.js: PASS.
- La ejecución literal mediante Node CLI no se realizó en esta sesión. No se ejecutaron navegador real, red real ni recuperación offline; quedan diferidos a Beta.
- La comparación del commit bf5e9370f5f2e34bb32f684e83a1945beb11c274 confirma nueve archivos, todos dentro del alcance de la iteración 3. La rama base GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Siguiente: AUG-052, criterio 3 (precache, event.waitUntil y manejo de cuota), en una iteración independiente.
================================================================================


================================================================================
AUG-052 — ITERACIÓN 4 — 2026-11-11 — PRECACHE, EVENT.WAITUNTIL Y CUOTA
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD de partida: 02f083b8dab0fb4838727a70dedf22346319c2b8. Rama base verificada: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
service-worker.js incrementa el cache a v15. CORE_ASSETS incluye las tres entradas HTML y el grafo estático transitivo de módulos de main.js, add_cortes.html y users.html, incluido VinDifferentialEngine.js. La precarga esencial usa addAll atómico; si falla por cuota/recurso esencial, la instalación falla para preservar el SW anterior. Los iconos son opcionales y se omiten al agotar cuota. Las escrituras runtime cache.put están asociadas a event.waitUntil y sus errores no invalidan respuestas de red. La activación solo elimina caches anteriores gpsepedia-cache-* y no toca caches de otras aplicaciones.
Suite Services/Test/ServiceWorkerCache.js: 6/6 PASS en runtime V8 adaptado (grafo, cuota opcional, cuota esencial, waitUntil/cache.put, navegación offline y POST). Node CLI literal no ejecutado. Instalación/actualización y arranque offline en navegador real quedan para Beta. No se modifican endpoints ni backend.
Siguiente iteración: AUG-052, criterio 4 (evaluar caché/paginación o getNavigationData). No iniciar AUG-053 ni otra tarea.
================================================================================


================================================================================
AUG-052 — ITERACIÓN 5 — 2026-11-11 — EVALUACIÓN DE ESTRATEGIA DE LECTURA
Estado: CRITERIO 4 COMPLETADO; AUG-052 continúa EN PROGRESO por criterio 5 y validaciones Beta.
Rama: GPSpedia2.2.5_work. HEAD de partida: c736fd6fa0232e6b7b664ff1276f530446d5d117. Rama base verificada: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Se creó Catalog_Read_Strategy.md y se enlazó desde README.md. Hallazgos: getCatalogData es el contrato canónico de snapshot completo y se usa a través de fetchCatalogData; IndexedDB permite rehidratación local, pero el flujo siempre solicita reconciliación remota. CacheService conserva una lectura de catalog_data_v2, pero la escritura del snapshot está deshabilitada por superar 100 KB por entrada. getNavigationData devuelve resumen pequeño, pero hoy recorre getDataRange() en Cortes y LogosMarca, y no tiene consumidor frontend encontrado. getDropdownData es consumido por add_cortes.html y también recorre getDataRange() de Cortes. No existe paginación; introducirla rompería el contrato de snapshot completo/offline si no se coordina con cursor estable, versión de snapshot, eliminaciones y ensamblado atómico de páginas.
Decisión: conservar getCatalogData para el catálogo principal; reservar getNavigationData para una futura carga inicial ligera solo después de reducir rangos leídos y definir consumidor; mantener getDropdownData para formularios; no adoptar paginación en esta tarea. No se modificaron código backend, endpoints, contratos ni despliegues. No se hicieron mediciones productivas de Spreadsheet.
Siguiente: AUG-052, criterio 5 (pruebas de primera instalación, actualización de Service Worker, arranque offline, deep links sin sesión/sin catálogo, API lenta/caída y catálogos representativos). Las pruebas que requieren navegador real/Apps Script/Spreadsheet productivo se registrarán para Beta; ejecutar localmente las simulaciones reproducibles disponibles.
================================================================================


================================================================================
AUG-053 — ITERACIÓN 5 — 2026-11-11 — AISLAMIENTO ADMINIMAGEUPLOADPENDING
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA; AUG-053 continúa EN PROGRESO.
Rama: GPSpedia2.2.5_work. HEAD de partida: 230b7b7e8d9294781cf3ec33e29e12823d7475d0. Rama base: GPSpedia2.2.5; sin modificaciones.
Política aplicada: los reemplazos ADMIN son privados por iniciador. Cada snapshot se particiona por ownerId/vehicleId/fieldName; ownerId es identidad estable y no se guardan SessionToken ni credenciales. UI y capa IndexedDB exigen coincidencia exacta del propietario para recuperar, reintentar o eliminar. Los registros legados sin owner y los registros con owner incongruente se mueven a cuarentena; nunca se adjudican a la cuenta que consulta primero. No se aplica TTL automático a operaciones con resultado remoto incierto.
Prueba añadida: Services/Test/AdminImageUploadIsolation.js (9 escenarios de identidad, claves, whitelist y privacidad); instrucciones en Services/Test/README.md. Validación de navegador/IndexedDB real, recarga, cambio de cuenta y dos pestañas queda pendiente de Beta. No se modificaron backend, endpoints ni datos productivos.
Siguiente iteración: continuar AUG-053 con las pruebas locales pendientes del criterio 8 y revisar integración de las identidades/roles habilitados para edición del modal. No iniciar AUG-054 ni otra tarea.
================================================================================


================================================================================
AUG-053 — ADENDA ITERACIÓN 5 — 2026-11-11
Corrección de revisión: resetSessionUi_ limpia pendingAdminImageUploads y pendingAdminImageUploadsLoaded para liberar Data URLs en memoria al cambiar/cerrar sesión, sin borrar el snapshot persistido. Se añaden comprobaciones de sesión después de FileReader, de la lectura IndexedDB y de la respuesta remota para impedir que una continuación obsoleta modifique el estado de otra cuenta. El snapshot original permanece disponible para recuperación del propietario.
Validación pendiente: pruebas locales específicas del ciclo logout/cambio de cuenta y ejecución completa de la suite en el checkout del repositorio; pruebas IndexedDB real/multi-pestaña diferidas a Beta.
================================================================================


================================================================================
AUG-053 — VALIDACIÓN Y PUBLICACIÓN ITERACIÓN 5 — 2026-11-11
Implementación publicada en dos commits de trabajo: a98a87d8da2d06f92a3479902f31e95c9b532a4e (aislamiento por owner) y 7c5d40a61be2766e6b85e548670c898f72d14219 (limpieza de memoria y guardas de sesión). El HEAD final verificado de la rama GPSpedia2.2.5_work es 7c5d40a61be2766e6b85e548670c898f72d14219; padre: a98a87d8da2d06f92a3479902f31e95c9b532a4e. La rama base permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Validación local: Services/Test/AdminImageUploadIsolation.js ejecutada con Node v22.16.0: 9/9 PASS. node --check de adminImageUploadIsolation.js y la suite: PASS. Parsing de ui.js, offline.js, adminImageUploadIsolation.js y la suite mediante V8, retirando únicamente declaraciones import/export para parseo sin ejecución: PASS. Comparación Git desde HEAD inicial confirma ocho archivos dentro del alcance de AUG-053, sin cambios en la rama base.
Pendiente Beta: IndexedDB real, recarga, cambio de cuenta y dos pestañas. No se ejecutaron navegador real ni servicios externos. AUG-053 sigue EN PROGRESO; la siguiente iteración debe atender las validaciones locales restantes del criterio 8 y el alcance de roles del modal.
================================================================================

================================================================================
AUG-053 — ADENDA DE CONTINUIDAD — ITERACIÓN 6 — 2026-11-11
Estado: EN PROGRESO — análisis de autorización de roles completado; implementación aún no iniciada.
HEAD confirmado al iniciar: 1483522d8bc8453aec2114d280ba0c467b6c0b95. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).
Hallazgo: el modal de detalle y getCurrentEditOwnerContext_ restringen la edición in-modal a Desarrollador. No basta con ampliar la condición visual: Services/admin.js ejecuta assertDeveloperSession para todas las acciones ADMIN. updateVehicleField y uploadAdminImage están en el mismo servicio que operaciones administrativas sensibles.
Roles existentes verificados: normalización UI reconoce 'desarrollador', 'gefe' y 'jefe'; Auth.js define 'gefe' y 'jefe' como roles distintos, y 'jefe' es alias de compatibilidad con USERS. El requisito solicitado como «Desarrollador o Gefe» se debe implementar para los valores existentes 'desarrollador' y 'gefe'; mantener 'jefe' como compatibilidad solo si la política del proyecto lo confirma, no asumir equivalencia.
Criterio de seguridad para la siguiente fase: separar autorización de edición de imágenes del guardia ADMIN global. Permitir a Desarrollador/Gefe únicamente las acciones y campos de imagen del modal; updateVehicleField debe restringirse en servidor a la lista blanca de campos de imagen para roles no Desarrollador. Todas las demás acciones ADMIN deben seguir exigiendo Desarrollador. La identidad/rol deben verificarse desde sesión y Users en servidor, nunca confiar en el rol del payload.
Pendiente inmediato: rastrear y cubrir las acciones de consulta/reconciliación de estado de reemplazo usadas por el modal, definir su autorización mínima y añadir pruebas de contrato/roles antes de modificar el guardia del servicio. No iniciar AUG-054.
================================================================================

================================================================================
AUG-053 — ADENDA DE CONTINUIDAD — ITERACIÓN 7 — 2026-11-11
Estado: EN PROGRESO — matriz de acciones del modal identificada; no se modificaron permisos todavía.
HEAD de inicio: cc330bbdd0c7b30b9121f8e1f08c2160a32dd215. Rama base sin cambios: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Hallazgos de integración:
- El modo edición del modal no se limita a imágenes: permite modificar modelo y otros campos de Cortes mediante updateVehicleField, además de reemplazar imágenes mediante uploadAdminImage.
- El contexto local getCurrentEditOwnerContext_ y el botón de lápiz siguen limitados a 'desarrollador'. saveFieldSilently y submitAdminImageUploadOperation también dependen de ese contexto.
- El payload getDeveloperSessionPayload_ solo transporta userId y sessionToken; el servidor no debe aceptar un rol declarado por el cliente.
- El guardia de doPostInternal_ invoca assertDeveloperSession para prácticamente todas las acciones ADMIN antes del switch. La ampliación debe ser por lista explícita de acciones: updateVehicleField y uploadAdminImage para Desarrollador/Gefe; todas las demás acciones ADMIN conservan exigencia Desarrollador.
- updateVehicleField valida fieldName contra COLS_CORTES. Para Gefe se debe conservar la semántica de edición in-modal y comprobar el alcance de campos permitido por el modal; uploadAdminImage ya limita fieldName a ocho campos de imagen.
- getReplacedImages, recoverReplacedImage, getReplacedImageDownloadUrl y demás acciones del gestor de inventario no son llamadas del modal de detalle para editar/reemplazar; no deben incluirse en el permiso Gefe sin necesidad funcional. reconcilePendingImageUploads corresponde a otro ledger y tampoco es el flujo pendiente AdminImageUploads del modal.
- No se implementaron cambios de código en esta iteración porque ampliar solo la UI sería inseguro y conceder todas las acciones ADMIN sería excesivo. Próximo paso: definir y probar helper de autorización por acción que revalide ActiveSessions y Users y devuelva contexto para Desarrollador/Gefe solo en las dos acciones in-modal; después integrar el mismo conjunto de roles en UI y validar campos/roles.
No iniciar AUG-054.
================================================================================

================================================================================
AUG-053 — ADENDA ITERACIÓN 8 — ACLARACIÓN FUNCIONAL DEL USUARIO — 2026-11-11
Requisito confirmado por el usuario: cualquier cuenta cuyo rol real sea 'gefe' debe tener exactamente el mismo acceso que 'desarrollador' al modo edición in-modal del modal de detalle de corte. El alcance incluye TODA la información editable presentada por ese modal, no solo imágenes: campos generales del corte, metadatos, configuraciones, ubicaciones, textos descriptivos y los campos de imagen/reemplazo que el modal expone. Debe poder iniciar edición, guardar, descartar/restaurar y completar/reconciliar reemplazos de imagen igual que Desarrollador.
Límite de autorización: no conceder por ello acceso general al panel/acciones ADMIN, gestor global de imágenes, operaciones de Drive, gestión de usuarios ni herramientas exclusivas de Desarrollador. La autorización Gefe se limita a las acciones y campos que realmente utiliza el modo edición del modal de detalle. Mantener 'jefe' como rol distinto; el requerimiento confirmado menciona literalmente 'gefe'.
Hallazgos de revisión:
- El modal tiene editores distribuidos en varias secciones de ui.js; el flujo guarda campos individuales con updateVehicleField y reemplaza imágenes con uploadAdminImage.
- El descarte usa el mismo updateVehicleField para restaurar los valores del snapshot. Por tanto, el permiso debe contemplar todos los campos editables del modal y el flujo de restauración, no únicamente los cambios nuevos.
- El flujo de resolución de reemplazos consulta getAdminImageUploadStatus; se debe rastrear y asegurar que exista y tenga autorización compatible, junto con uploadAdminImage. No ampliar a gestor global de imágenes.
- Actualmente doPostInternal_ ejecuta assertDeveloperSession global antes del switch, y getCurrentEditOwnerContext_ y el botón de edición del modal solo aceptan desarrollador. La modificación debe introducir una autorización de sesión/rol validada en servidor para el conjunto explícito de acciones del modal y reflejar Gefe en el contexto UI.
- No se cambiaron permisos ni lógica de aplicación en esta iteración; se actualizó el alcance funcional para evitar una implementación parcial o más restrictiva que lo solicitado.
Siguiente paso: construir el inventario exhaustivo de campos editables del modal y acciones de guardado/descarte/estado de imagen, crear pruebas de autorización por rol y contrato de campos, y después implementar la autorización equivalente para Desarrollador/Gefe en cliente y servidor.
HEAD previo de trabajo: 59593677c5444f20a3746d3b45ea24a6148ed53f. Rama base intacta: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
No iniciar AUG-054.
================================================================================


================================================================================
AUG-053 — ITERACIÓN 9 — 2026-11-11 — INVENTARIO DEL MODAL Y HALLAZGO DE ESTADO DE IMAGEN
Estado: ANÁLISIS DE INTEGRACIÓN COMPLETADO; implementación de autorización Gefe aún pendiente.
Rama: GPSpedia2.2.5_work. HEAD verificado antes del checkpoint: cfde5c8eba57f554dd8d7604bf6f47d42dc272de. Rama base verificada: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Inventario de campos que el editor in-modal guarda mediante updateVehicleField:
- Campos generales: modelo, versionesAplicables, tipoEncendido, anoDesde, anoHasta, categoria, vin y notaImportante.
- Campos de cortes dinámicos: tipoCorte{idx}, configRelay{idx}, ubicacionCorte{idx} y colorCableCorte{idx}; el índice proviene del corte renderizado.
- Descripciones: apertura, cableAlimen, cableAlimen2 y cableAlimen3.
- Imágenes reemplazables: imagenVehiculo, imgCorte1, imgCorte2, imgCorte3, imgApertura, imgCableAlimen, imgCableAlimen2 e imgCableAlimen3.
El descarte restaura los campos modificados del snapshot mediante la misma acción updateVehicleField y verifica después la lectura de getCatalogData. Los reemplazos se envían mediante uploadAdminImage y se conservan en IndexedDB por propietario mientras no se confirme su resultado.
Hallazgo de integración confirmado: ui.js invoca routeAction("getAdminImageUploadStatus", ...) antes de descartar para resolver operaciones pendientes, pero la acción no está declarada en ACTION_TO_SERVICE_MAP de api-config.js, no tiene caso en el dispatcher Services/admin.js y no aparece implementada en Services/write.js, catalog.js, feedback.js ni users.js. La búsqueda por los archivos de servicio del repositorio no encontró implementación. Por tanto, routeAction falla en cliente por acción no definida y el flujo de descarte no puede completar la reconciliación de reemplazos pendientes, independientemente del rol. Este endpoint debe implementarse y probarse antes de declarar completo el acceso Gefe al flujo de edición.
Autorización actual confirmada: doPostInternal_ valida assertDeveloperSession para toda acción ADMIN excepto ping; el helper revalida ActiveSessions y Users y exige rol desarrollador. El permiso Gefe deberá ser explícito únicamente para updateVehicleField, uploadAdminImage y la nueva consulta de estado; las demás acciones ADMIN conservarán el requisito Desarrollador. El rol jefe sigue excluido.
No se modificó código funcional ni se cambiaron permisos en esta iteración. No se modificó la rama base. La lista de campos anterior es el inventario observado en los editores actuales; antes de implementar la whitelist del servidor se contrastará contra COLS_CORTES y el esquema del registro para evitar omisiones o permitir columnas ajenas al modal.
Siguiente iteración: definir la whitelist de campos in-modal a partir de COLS_CORTES, implementar helper de sesión para Desarrollador/Gefe solo en las acciones explícitas, implementar getAdminImageUploadStatus con verificación del ledger/archivo, añadir pruebas de contrato por rol/campo/estado y actualizar el contexto UI para Gefe. No iniciar AUG-054.
================================================================================


================================================================================
AUG-053 — ITERACIÓN 10 — 2026-11-11 — AUTORIZACIÓN GEFE PARA EDICIÓN IN-MODAL
Estado: ITERACIÓN COMPLETADA CON VALIDACIÓN DIFERIDA; AUG-053 permanece EN PROGRESO por las validaciones Beta de aislamiento de operaciones locales.
HEAD previo al checkpoint: 70582bd711966d3e168c7adc37bb92b7e25039f0. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Implementación:
- Services/admin.js centraliza la revalidación de sesión en getAdminSessionContext_: token único asociado al userId, expiración, perfil único, cuenta activa y ausencia de revocación pendiente. assertDeveloperSession conserva únicamente desarrollador; assertModalEditSession admite desarrollador y gefe, sin confiar en roles enviados por el cliente.
- ADMIN_MODAL_EDIT_ACTIONS contiene exactamente updateVehicleField, uploadAdminImage y getAdminImageUploadStatus. doPostInternal_ usa el guardia ampliado solo para esas acciones; el resto de acciones ADMIN sigue requiriendo Desarrollador.
- updateVehicleField aplica whitelist de los campos expuestos por el editor in-modal: categoria, modelo, versionesAplicables, tipoEncendido, anoDesde, anoHasta, vin, notaImportante, apertura, cableAlimen/2/3, tipoCorte/configRelay/ubicacionCorte/colorCableCorte para índices 1–3 y los ocho campos de imagen. Se rechazan columnas ajenas. El campo vin resuelve su columna por encabezado único mediante getVinColumnIndex.
- Se implementó handleGetAdminImageUploadStatus y se registró en api-config.js y dispatcher ADMIN. La consulta valida opId, vehículo y campo de imagen, rechaza asociaciones cruzadas y devuelve estado, URL actual/nueva e integridad. Cuando hay archivo Drive asociado, verifica ID, metadatos opId/hash, estado de papelera, MIME y SHA-256.
- ui.js permite que desarrollador y gefe accedan al modo edición del modal. Los helpers de gestión global y otras vistas privilegiadas siguen usando sus controles de rol específicos; jefe no se incluyó.

Archivos: Services/admin.js, api-config.js, ui.js, Services/Test/AdminModalEditSecurity.js (nuevo), Services/Test/ActionDispatchContract.js, Services/Test/README.md, Tareas_pendientes_parte1.txt y ChangesLogs.txt.

Validación local ejecutada en runtime V8 adaptado:
- Parsing de Services/admin.js, ui.js, api-config.js y ambas suites: PASS.
- runAdminModalEditSecurityTests(): 13/13 PASS.
- runActionDispatchContractTests(): 10/10 PASS.
- Revisión del diff de ocho archivos: solo cambios de AUG-053.
No ejecutado: Node CLI literal, navegador/IndexedDB real, ni integración real con Apps Script, Spreadsheet y Drive. Esas validaciones quedan para Beta; no se simularon ni se reportan como realizadas.

Política conservada: las operaciones locales de reemplazo siguen privadas por ownerId; no se cambió el ledger para compartir operaciones entre cuentas. El permiso Gefe solo habilita su propio flujo de edición modal y su propia cola local.
Siguiente iteración: revisar la interacción entre el descarte/restauración del snapshot completo y la whitelist, completar pruebas de contrato de restauración y operaciones pendientes, y continuar la validación local de AUG-053. Después registrar cualquier ajuste con checkpoint y commit. No iniciar AUG-054.
================================================================================
