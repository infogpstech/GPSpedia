================================================================================
AUG-053 — ITERACIÓN 18 — 2026-11-11 — ROLLBACK DEL HARNESS ANTE ABORTO DE ELIMINACIÓN ADMIN
Estado: EN PROGRESO. Esta iteración quedó checkpointed; AUG-053 sigue abierta.
Rama: GPSpedia2.2.5_work. HEAD de partida: c3fb9af42cdf12e81f1cadc7c7953d0a566a7184. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Hallazgo:
- Las pruebas comprobaban abortos de escritura, pero no la eliminación de snapshots ADMIN.
- El harness aplicaba inmediatamente put/delete a sus mapas y no revertía las mutaciones cuando una transacción abortaba; no podía validar conservación del snapshot tras un request delete exitoso seguido de abort.

Cambios:
- Services/Test/IndexedDBTransactions.js: registro de acciones inversas por transacción; rollback en orden inverso ante abort; put y delete recuperan el estado previo. El aborto simulado también puede ocurrir tras un request delete exitoso.
- Nuevo escenario ADMIN: guarda un snapshot, aborta la transacción de eliminación, exige resultado incierto (null) y verifica recuperación del mismo opId y Data URL.
- Services/Test/README.md, backlog, checkpoint y ChangesLogs.txt documentan el caso y sus límites.
- No se modificó offline.js ni lógica funcional.

Validación:
- Parsing V8 de Services/Test/IndexedDBTransactions.js y offline.js: PASS.
- La ejecución del nuevo escenario, la suite completa de 30 escenarios y el comando Node CLI no se completaron en esta iteración; quedan pendientes de ejecución en runtime compatible.
- No se afirma validación de IndexedDB real, navegador real ni multi-pestaña; permanecen para Beta.

Siguiente iteración: ejecutar el escenario nuevo y la suite IndexedDBTransactions completa en un runtime compatible; corregir cualquier fallo reproducible antes de cerrar esta cobertura. No iniciar AUG-054.
================================================================================


================================================================================
AUG-053 — ITERACIÓN 19 — 2026-11-11 — VALIDACIÓN COMPLETA DE INDEXEDDBTRANSACTIONS
Estado: EN PROGRESO. La cobertura de esta suite quedó validada; AUG-053 sigue abierta por la revisión de los criterios restantes.
Rama: GPSpedia2.2.5_work. HEAD de partida: 81602819647e7a4f352ee10b6fa4efd20e043f86. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Validación ejecutada:
- Suite Services/Test/IndexedDBTransactions.js: 30/30 PASS, cero fallos.
- Incluye el escenario de aborto durante eliminación ADMIN; se verificó recuperación del snapshot con el mismo opId y Data URL.
- Ejecución en runtime V8 adaptado: se cargaron las funciones reales de offline.js y sus dependencias locales; se sustituyó únicamente la importación dinámica por una factoría y se añadieron adaptadores para IndexedDB, Blob, DOMException, structuredClone y temporizadores.
- El contador interno de la suite confirmó 30 casos ejecutados.
- No se ejecutó el comando Node CLI original. No se afirma ejecución en navegador real, IndexedDB real ni multi-pestaña; estas validaciones permanecen para Beta.

Cambios:
- Services/Test/README.md: se actualiza la evidencia de ejecución y se distingue runtime adaptado de Node CLI/IndexedDB real.
- Tareas_pendientes_parte1.txt y ChangesLogs.txt: se registra el resultado 30/30.
- No se modificó código funcional ni el harness en esta iteración.

Siguiente iteración: revisar los criterios restantes de AUG-053, en particular los escenarios locales del criterio 8 que no estén ya cubiertos por las suites existentes; seleccionar una sola brecha concreta y probarla. No iniciar AUG-054.
================================================================================


================================================================================
AUG-053 — ITERACIÓN 20 — 2026-11-11 — FALLO DE CUOTA AL PERSISTIR SNAPSHOTS ADMIN
Estado: EN PROGRESO. Se añadió cobertura local para una brecha del criterio 8; AUG-053 sigue abierta.
Rama: GPSpedia2.2.5_work. HEAD de partida: 7ca34ace6fa358382bcfe69a4376b4b4f440e4a6. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Hallazgo:
- IndexedDBTransactions cubría abortos de escritura ADMIN, pero no el caso específico de agotamiento de cuota durante la persistencia de adminImageUploadPending.

Cambio:
- Services/Test/IndexedDBTransactions.js: nuevo escenario QuotaExceededError para guardar un snapshot ADMIN. Exige respuesta {saved:false,error:true} y confirma mediante lectura posterior que no quedó un snapshot parcial.
- Services/Test/README.md, Tareas_pendientes_parte1.txt y ChangesLogs.txt: documentan el caso y el alcance de su validación.
- No se modificó offline.js ni lógica funcional.

Validación:
- Parsing V8 del archivo de suite con el escenario añadido: PASS.
- Ejecución aislada del escenario contra la función real saveAdminImageUploadPendingOperation con adaptador IndexedDB que simula QuotaExceededError: PASS; resultado {saved:false,error:true}, sin snapshot parcial.
- La suite completa ampliada a 31 escenarios no se ejecutó integralmente en esta iteración. Tampoco se ejecutó el comando Node CLI.
- No se afirma validación de IndexedDB real, navegador real ni multi-pestaña; permanecen para Beta.

Siguiente iteración: ejecutar los 31 escenarios de IndexedDBTransactions en runtime compatible y revisar una sola brecha local adicional del criterio 8. AUG-053 permanece EN PROGRESO; no iniciar AUG-054.
================================================================================


================================================================================
AUG-053 — ITERACIÓN 21 — 2026-11-11 — VALIDACIÓN INTEGRAL DE INDEXEDDBTRANSACTIONS
Estado: EN PROGRESO. La suite local quedó validada; AUG-053 continúa abierta para revisar las brechas locales restantes del criterio 8.
Rama: GPSpedia2.2.5_work. HEAD de partida: 7795679f154be0f73163c8fafb021ea82638a00a. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Validación ejecutada:
- Services/Test/IndexedDBTransactions.js: 31/31 PASS, cero fallos.
- Se ejecutó en runtime V8 adaptado cargando las funciones reales de offline.js y dependencias locales; se sustituyó la importación dinámica por una factoría y se adaptaron IndexedDB, queueMicrotask, Blob, DOMException, structuredClone y temporizadores.
- El nuevo caso QuotaExceededError de adminImageUploadPending pasó dentro de la suite completa.
- Los errores de aborto y cuota emitidos por las rutas negativas son resultados esperados y las aserciones pasaron.
- No se ejecutó el comando Node CLI original. No se afirma ejecución en navegador real, IndexedDB real ni multi-pestaña; estas validaciones permanecen para Beta.

Cambios:
- Services/Test/README.md, Tareas_pendientes_parte1.txt, checkpoint.md y ChangesLogs.txt actualizan el estado de validación de 31 escenarios.
- No se modificó código funcional ni el harness durante esta iteración.

Siguiente iteración: continuar la revisión del criterio 8 para seleccionar una sola brecha local adicional que no esté cubierta por las suites existentes. AUG-053 permanece EN PROGRESO; no iniciar AUG-054.
================================================================================


================================================================================
AUG-053 — ITERACIÓN 22 — 2026-11-11 — RECUPERACIÓN ADMIN TRAS RECREAR EL MÓDULO
Estado: EN PROGRESO. Se cubrió una brecha local del criterio 8; AUG-053 sigue abierta.
Rama: GPSpedia2.2.5_work. HEAD de partida: c36fd25cb138a643e125f7eb48200a7adebebc21. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Hallazgo:
- La suite comprobaba persistencia y recuperación ADMIN dentro de una instancia de offline.js, pero no recreaba el módulo entre ambas operaciones para representar una recarga lógica.

Cambio:
- Services/Test/IndexedDBTransactions.js: nuevo escenario que guarda un reemplazo ADMIN, crea una instancia nueva del módulo sobre el mismo almacén del harness y recupera el snapshot verificando ownerId, opId y Data URL; una cuenta distinta no puede recuperarlo.
- Services/Test/README.md, Tareas_pendientes_parte1.txt, checkpoint.md y ChangesLogs.txt: documentan el escenario y sus límites.
- No se modificó offline.js ni lógica funcional.

Validación:
- Suite completa Services/Test/IndexedDBTransactions.js: 32/32 PASS, cero fallos, en runtime V8 adaptado con funciones reales de offline.js y adaptadores locales.
- El escenario comprueba continuidad entre instancias sobre el almacén simulado; no representa recarga real del navegador ni IndexedDB real.
- No se ejecutó Node CLI original, navegador/IndexedDB real ni concurrencia multi-pestaña; permanecen para Beta.

Siguiente iteración: revisar una sola brecha local adicional del criterio 8 sin duplicar las coberturas existentes. AUG-053 permanece EN PROGRESO; no iniciar AUG-054.
================================================================================


================================================================================
AUG-053 — ITERACIÓN 23 — 2026-11-11 — CARGA ADMIN INCOMPLETA POR FALLO DE LECTURA
Estado: EN PROGRESO. Se añadió una cobertura de contrato local del criterio 8; AUG-053 sigue abierta.
Rama: GPSpedia2.2.5_work. HEAD de partida: dccb0ed7001d6d2402f82dbd01afb4f30ab6639a. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Hallazgo:
- El contrato de carga pendiente verificaba revalidación de sesión, pero no protegía explícitamente el orden de la comprobación de disponibilidad del conjunto completo de lecturas IndexedDB frente a la población del mapa y la marca de carga completada.

Cambio:
- Services/Test/AdminModalEditRestoreContract.js: nuevo contrato que exige rechazar resultados no disponibles antes de copiar operaciones a pendingAdminImageUploads y antes de agregar ownerVehicleKey a pendingAdminImageUploadsLoaded.
- Services/Test/README.md, Tareas_pendientes_parte1.txt, checkpoint.md y ChangesLogs.txt: documentan el alcance y la evidencia.
- No se modificó ui.js, offline.js ni lógica funcional.

Validación:
- AdminModalEditRestoreContract: 11/11 PASS, cero fallos, en runtime V8 adaptado con ui.js y Services/admin.js vigentes.
- Parsing V8 del archivo de contrato: PASS.
- La prueba es un contrato estático de orden/guardas; no representa una lectura fallida ejecutada contra IndexedDB real ni una recarga de navegador.
- IndexedDB/navegador reales, concurrencia multi-pestaña y servicios externos continúan reservados a Beta.

Siguiente iteración: revisar una sola brecha local adicional del criterio 8 sin duplicar las coberturas existentes. AUG-053 permanece EN PROGRESO; no iniciar AUG-054.
================================================================================


================================================================================
AUG-053 — ITERACIÓN 24 — 2026-11-11 — FALLO DE LECTURA EN RECUPERACIÓN ADMIN
Estado: EN PROGRESO. Se añadió una prueba dinámica al harness para una lectura IndexedDB fallida; AUG-053 sigue abierta.
Rama: GPSpedia2.2.5_work. HEAD de partida: 8ac7e6baf101bb51c8c6bdaf3c2a6ca28a853242. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Hallazgo:
- La iteración 23 añadía un contrato estático de UI para impedir que una lectura no disponible se trate como conjunto completo, pero la suite IndexedDB no simulaba un error de request.get durante la recuperación ADMIN.
- El harness tampoco cancelaba las solicitudes en cola cuando una transacción abortaba por error de lectura, lo que podía dejar la simulación sin finalizar.

Cambios:
- Services/Test/IndexedDBTransactions.js: el harness simula UnknownError en request.get, propaga error de request/transacción y aborta; al abortar descarta las solicitudes pendientes de la cola.
- Nuevo escenario ADMIN: guarda un snapshot, fuerza error de lectura, exige {available:false,operation:null} y verifica en una transacción posterior que el mismo opId y Data URL permanecen recuperables.
- Services/Test/README.md, Tareas_pendientes_parte1.txt y ChangesLogs.txt registran el alcance.
- No se modificó offline.js, ui.js ni lógica funcional.

Validación:
- Parsing V8 del archivo de suite actualizado: PASS.
- Prueba aislada del cuerpo real getAdminImageUploadPendingOperation de offline.js con un adaptador que dispara request.onerror, transaction.onerror y transaction.onabort: PASS; devuelve {available:false,operation:null}.
- La suite completa ampliada a 33 escenarios y el comando Node CLI no se ejecutaron en esta iteración.
- No se afirma validación con IndexedDB/navegador real ni concurrencia multi-pestaña; permanecen para Beta.

Siguiente iteración: ejecutar la suite IndexedDBTransactions completa (33 escenarios) en runtime local compatible y corregir cualquier fallo reproducible. AUG-053 permanece EN PROGRESO; no iniciar AUG-054.
================================================================================


================================================================================
AUG-053 — ITERACIÓN 25 — 2026-11-11 — VALIDACIÓN INTEGRAL DE INDEXEDDBTRANSACTIONS
Estado: EN PROGRESO. La suite durable quedó validada; AUG-053 continúa abierta para revisar las brechas locales restantes del criterio 8.
Rama: GPSpedia2.2.5_work. HEAD de partida: 3250b21b8f0a5883fe9ce75a190e169c39e805e8. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Validación ejecutada:
- Services/Test/IndexedDBTransactions.js: 33/33 PASS, cero fallos de aserción.
- Ejecución en runtime V8 adaptado con las fuentes vigentes de offline.js, thumbnailCompressionQueue.js y adminImageUploadIsolation.js; la importación dinámica se sustituyó por una factoría para crear instancias independientes sobre el harness IndexedDB compartido.
- Se adaptaron IndexedDB, Blob, DOMException, structuredClone, queueMicrotask y consola/assert. Los errores de aborto, cuota y lectura observados corresponden a rutas negativas esperadas y las aserciones pasaron.
- No se ejecutó el comando Node CLI original. No se afirma ejecución en navegador real, IndexedDB real ni concurrencia multi-pestaña; permanecen para Beta.

Cambios de registro:
- Services/Test/README.md, Tareas_pendientes_parte1.txt, checkpoint.md y ChangesLogs.txt documentan el resultado 33/33 y sus límites.
- No se modificó lógica funcional ni el harness durante esta iteración.

Siguiente iteración: revisar una sola brecha local adicional del criterio 8 que no esté cubierta por las suites existentes. AUG-053 permanece EN PROGRESO; no iniciar AUG-054.
================================================================================


================================================================================
AUG-053 — CIERRE — ITERACIÓN 26 — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD de partida: 6c48fd5c63ac1e8cf621743b21e55952db2bebb1. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Última corrección local:
- ui.js: los dos manejadores de error del reemplazo ADMIN dejaron de registrar el objeto Error completo; ahora registran únicamente error.name o la etiqueta genérica UploadError.
- Services/Test/AdminModalEditRestoreContract.js: nueva regresión que exige registros de error sanitizados y prohíbe enviar objetos Error, snapshots u operaciones completas a la consola.

Validación final:
- PendingOperationIsolation: 8/8 PASS.
- EditBackupIsolation: 12/12 PASS.
- AdminImageUploadIsolation: 10/10 PASS.
- IndexedDBTransactions: 33/33 PASS (runtime V8 adaptado, iteración 25; ni el harness ni offline.js cambiaron durante el cierre).
- AdminModalEditRestoreContract: 12/12 PASS.
- AdminModalEditSecurity: 13/13 PASS.
- ActionDispatchContract: 11/11 PASS.
- Total acumulado: 99/99 escenarios locales PASS.
- Parsing V8 de pendingOperationStore.js, editBackupStore.js, adminImageUploadIsolation.js, ui.js y Services/admin.js: PASS.

Criterios locales 1–8: cubiertos. Política de reemplazos ADMIN: privada por iniciador; snapshots asociados a owner estable y sin tokens/credenciales; legado sin owner en cuarentena; retención conservadora sin TTL para operaciones inciertas; limpieza con confirmación terminal e identidad exacta; addCutPending aislado por userId; errores de consola sanitizados.

Validaciones diferidas a Beta (no bloquean el cierre local): navegador/IndexedDB reales, recarga real, concurrencia multi-pestaña real y servicios Apps Script/Spreadsheet/Drive. El comando Node CLI original no se ejecutó.

La tarea queda cerrada. AUG-054 permanece como tarea posterior y no se inicia en este checkpoint.
================================================================================


================================================================================
AUG-054 — CIERRE — ITERACIÓN 27 — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD de partida: f67c4124d21cc1e7cd52a8f226e2e6de94c11ad9. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Resolución:
- Services/write.js: se confirma la validación de sesión activa y perfil autorizado antes de consultar opId. La respuesta queda minimizada: estado, exists/pending, operationStatus y, para completadas, vehicleId/timestamp; no expone rowData.
- Política actor-operación: colaborativa para todos los colaboradores autenticados con rol permitido. La hoja A:E no registra propietario; la recuperación por otro técnico es un flujo admitido. No se impone aislamiento por actor ni se usa opId como credencial.
- add_cortes.html: opId incorpora 128 bits de crypto.getRandomValues y conserva el prefijo OP- y timestamp. Sin crypto, falla explícitamente; no degrada a Math.random.
- Services/Test/CheckOperationSecurity.js: 12 contratos locales de autenticación previa, acceso colaborativo, estados, minimización y generación criptográfica.
- README de pruebas, backlog y ChangesLogs.txt actualizados.

Validación:
- CheckOperationSecurity: 12/12 PASS en runtime JavaScript local del adaptador, ejecutando el handler real con dobles de Spreadsheet y autenticación; sin endpoints ni servicios externos.
- El análisis del helper confirma token único, ActiveSessions, expiración, perfil único en Users y rechazo de revocación/roles no permitidos.
- Apps Script y Spreadsheet reales no ejecutados; integración reservada a Beta.
- Rama base sin modificaciones.

AUG-054 queda cerrada. La siguiente tarea no se inicia en esta iteración.
================================================================================


================================================================================
AUG-055 — CIERRE — ITERACIÓN 28 — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work.
HEAD de inicio de AUG-055: 204e0a6183c00fd53143d3a326423eb0fe098194.
Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios).

Resolución:
- add_cortes.html: el snapshot de addOrUpdateCut pasa a IndexedDB (adminLocalState), aislado por ownerId. La solicitud no se envía si no se puede leer, persistir y verificar el snapshot. El payload y las imágenes se conservan sin duplicar Data URL; el token de sesión no se guarda.
- offline.js: se agregan funciones de lectura, escritura verificada y eliminación exacta del snapshot. Se bloquean snapshots corruptos, ajenos, obsoletos o con otro opId/huella. Un snapshot completed es terminal y no puede degradarse ni reutilizarse.
- add_cortes.html: la huella SHA-256 se calcula con WebCrypto; la recuperación comprueba opId, huella y vehicleId. Solo se avanza a etapa 3 después de una respuesta success verificable y de confirmar la limpieza local. Si la limpieza falla tras el commit, se conserva el snapshot completed hasta reconciliarlo.
- Services/write.js y Services/admin.js: la hoja de idempotencia se amplía de A:E a A:F con operationHash. Ambos servicios recalculan la huella SHA-256 del payload canónico y rechazan contenido, vehículo, slot o asociación distintos. Las lecturas históricas usan únicamente las columnas existentes antes de ampliar F.
- Migración histórica: los registros antiguos sin huella permanecen no verificables y no se reutilizan automáticamente. La migración se detiene si encuentra un opId ya asociado a una huella moderna.
- Auditoría y backlog: H-AUD-003-001 queda registrado como RESUELTO EN FUENTES; AUG-055 queda COMPLETADA CON VALIDACIÓN DIFERIDA.

Validación local:
- AddCutOperationIntegrity.js: 27/27 PASS.
- AddCutOperationRecoveryFlow.js: 3/3 PASS (respuesta perdida antes del commit, respuesta perdida después del commit y limpieza fallida tras confirmación).
- IndexedDBTransactions.js: 10/10 escenarios nuevos PASS en harness con initDB real y dobles IndexedDB; la suite acumulada contiene 43 escenarios, de los cuales 33 se validaron previamente en AUG-053.
- IdempotenciaIntegrity.js: 18/18 PASS.
- CheckOperationSecurity.js: 12/12 PASS.
- Parsing local de Services/write.js, Services/admin.js, offline.js y módulo frontend: PASS.

Límites de validación:
No se ejecutaron navegador/IndexedDB reales, Apps Script/Spreadsheet/Drive desplegados ni pruebas reales multi-pestaña. Esas validaciones permanecen para Beta. Los resultados anteriores corresponden a runtime JavaScript adaptado y dobles locales; no se afirma validación en producción.

AUG-055 queda cerrada. La siguiente tarea no se inicia en esta iteración; se continuará en la siguiente.
================================================================================


================================================================================
AUG-056 — CIERRE — ITERACIÓN 1 — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD inicial: 9ef9028d9b79b9673aef37fb86100b43d2fbb8a0. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios).

Cambios:
- `add_cortes.html`: disponibilidad dinámica de slots desde el registro seleccionado; ocultación de acciones de alta cuando no hay espacio; visibilidad de vídeo basada en `videoGuiaDesarmeUrl`; refresco tras guardar/recuperar. Si no puede verificarse un vehículo existente, se falla de forma conservadora.
- `Services/write.js` y `Services/admin.js`: selección del primer slot libre bajo los bloqueos existentes; respuesta con `slotIndex`; rechazo de vehículo completo sin sobrescritura.
- Ante conflicto por el último espacio, el formulario y el snapshot durable se conservan.

Validación local: CutAvailability 20/20 PASS; AddCutOperationIntegrity 27/27 PASS; YouTubeAddCortesContract 4/4 PASS. Parsing V8 de los archivos de código modificados: PASS.

Beta pendiente: navegador real, Apps Script/Spreadsheet desplegados y concurrencia real entre usuarios/proyectos. No se ejecutaron servicios externos ni datos productivos.
Siguiente tarea: AUG-057. No se inicia en esta iteración.
================================================================================


Actualización de continuidad: la entrada original de AUG-056 en Tareas_pendientes_parte1.txt también quedó marcada COMPLETADA CON VALIDACIÓN DIFERIDA. AUG-057 permanece como siguiente tarea y no se inició.


================================================================================
AUG-057 — CIERRE — ITERACIÓN 1 — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD de partida: 0a8a1a1e4a0210ef33b70ac88f3e48f3e39f4b4d. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificaciones).

Resolución:
- `add_cortes.html`: `fileToBase64()` retorna null inmediatamente cuando no hay archivo; rechaza archivos vacíos/resultados inválidos y controla FileReader error, abort y excepciones síncronas.
- Etapa 2 detiene conversión fallida antes de snapshot/envío, conserva datos y archivos seleccionados e informa que puede reintentarse. finally restaura overlay, botón y flag.
- Etapa 3 protege contra doble envío y agrupa lecturas, payload y petición en try/catch/finally. Los errores de lectura no generan peticiones y todos los caminos restauran overlay, botón y flag.
- Vistas previas controlan error/abort. «No recomendado» elimina referencias de imagen almacenadas para evitar imágenes obsoletas.
- FileReadRecovery 13/13 PASS; CutAvailability 20/20 PASS; AddCutOperationIntegrity 27/27 PASS; parsing V8 PASS.

Nota preexistente: AddCutOperationRecoveryFlow ejecuta 0/3 tanto contra fuente inicial como modificada; no se atribuye a AUG-057 ni se declara aprobada.
Beta pendiente: navegador real, FileReader real, Apps Script/Spreadsheet desplegados y pruebas de campo. No se modificaron servicios ni datos productivos.
AUG-057 queda cerrada. No se inicia otra tarea en esta iteración.
================================================================================


================================================================================
AUG-058 — CIERRE — ITERACIÓN 1 — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD de partida: dde14f9cd54ca268fbfbb4b165cc9e62d4f3e54b. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificaciones).

Resolución:
- `add_cortes.html`: se separa la ejecución de recuperación de su wrapper single-flight; init, online y visibilitychange reutilizan una única promesa mientras la recuperación está activa.
- Las recuperaciones disparadas durante submit de etapas 1, 2 o 3 se difieren y se reanudan al terminar si hay conexión. Los submits se rechazan temporalmente mientras una recuperación activa consulta/reconcilia el snapshot.
- `toggleLoading()` mantiene un contador de operaciones activas para que el overlay no desaparezca al finalizar una operación mientras otra sigue ejecutándose; el traspaso submit→recuperación conserva el indicador.
- Los snapshots pending se restauran sin eliminarlos; los completed no confirmados permanecen terminales; las operaciones confirmadas se limpian solo después de verificar hash y vehículo.

Validación local:
- `Services/Test/AddCutOperationRecoveryConcurrency.js`: 9/9 PASS; incluye disparadores simultáneos, checkOperation lento, evento durante submit en etapas 1–3, visibilitychange durante recuperación, snapshots pending/completed y contador de loading.
- Parsing V8 del módulo frontend: PASS.

Validación Beta pendiente: eventos reales del navegador, IndexedDB real, Apps Script/Spreadsheet y pruebas de campo. No se modificaron servicios ni datos productivos.
AUG-058 queda cerrada. No se inicia otra tarea en esta iteración.
================================================================================


================================================================================
AUG-059 — CIERRE — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD inicial de esta iteración: 0cccf68663a68c2dd6eaba2d92b6a293ac79ec33. Rama base `GPSpedia2.2.5` sin cambios.

Cambios:
- Validadores equivalentes WRITE/ADMIN: entrada textual, normalización alfanumérica en mayúsculas, longitud normalizada de 6 a 18 y extracción de prefijo sin descartar entradas cortas.
- `handleCheckVinDuplicate`, `handleAddVinToVehicleLocked` y las rutas addOrUpdate WRITE/ADMIN rechazan entradas inválidas antes de modificar registros. Se mantienen flujos de vehículo nuevo/existente y la lógica de slots.
- Edición ADMIN VIN separada de mapa fijo de columnas: encabezado dinámico, colección JSON canónica, duplicados intervehículo, límite por versiones, no reemplazo/eliminación/desplazamiento de VIN existentes, bloqueo y verificación post-escritura con reversión.
- UI de Agregar VIN valida longitud. El editor restaura el valor anterior si falla el guardado. add_cortes valida longitud y no continúa cuando falla la verificación de duplicados.

Pruebas:
- VinAuthoritativeValidation 12/12 PASS.
- AdminModalEditSecurity 13/13 PASS.
- VinTestigoIntegrity 14/14 PASS.
- Parsing V8 WRITE/ADMIN/ui/add_cortes PASS.
- AddCutOperationIntegrity: 24/27 en fuente base y modificada; tres escenarios de respuesta perdida fallan en ambas versiones y se consideran preexistentes. No se marcan como aprobados.

Validación Beta pendiente: navegador real, Apps Script/Spreadsheet desplegados y concurrencia real. No se modificaron datos productivos. AUG-059 cerrada; no se inicia AUG-060 en esta iteración.
================================================================================

================================================================================
AUG-060 — CIERRE — ITERACIÓN 1 — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD inicial confirmado: 307913be639ea31b6c07ede9e75cfa2dfcbb1ac1. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios).

Resolución:
- ui.js: parseVinCollection conserva los slots vacíos en delimitadores heredados, incluidos los intermedios y finales.
- ui.js: mapVersionsWithVins ya no vuelve a recortar los cinco caracteres seriales de prefijos normalizados; el recorte se aplica únicamente a VIN completos heredados de más de 13 caracteres.
- Se conserva el índice de cada slot; una versión sin VIN recibe null y las posteriores mantienen su asociación.

Validación local:
- Services/Test/VinVersionPresentation.js: 10/10 PASS. La suite extrae y ejecuta los helpers reales de ui.js.
- Se cubren colecciones JSON y heredadas, slots inicial/intermedio/final, límite de tres posiciones, asociación por versión, prefijos almacenados, VIN completos heredados y una sola versión.

Pendiente para Beta: validación visual en navegador real y comprobación con datos reales representativos. No se modificaron servicios, endpoints ni datos productivos.
Los archivos se publicaron secuencialmente mediante commits independientes, conforme al mecanismo disponible.
AUG-060 queda cerrada. No se inicia AUG-061 en esta iteración.
================================================================================


================================================================================
AUG-061 — CIERRE — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD inicial: 4f858f89124f6576d76a09109011093a2add9820. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios).
- WRITE y ADMIN validan payload y registro vigente bajo coordinación compartida para CORTES, DRIVE e IMAGE_UPLOAD_LEDGER, conservando ScriptLock local.
- Apertura rechaza texto o imagen existentes. Alimentación asigna en servidor el primer par libre, considerando texto e imagen; ignora el slot enviado por navegador y rechaza slots completos o pares ambiguos.
- Escritura suplementaria agrupada, verificada por lectura posterior y con intento de rollback. Respuesta incluye vehicleId, slotIndex y errores diferenciados.
- ui.js envía un par genérico; no calcula el slot desde datos potencialmente obsoletos.
Validación local: AddSupplementaryInfoIntegrity 34/34 PASS; parsing de helpers y handlers WRITE/ADMIN aprobado. No se ejecutaron navegador real, Apps Script, Spreadsheet, Drive ni concurrencia real; quedan diferidos a Beta.
Siguiente tarea: AUG-062. No se inicia en esta iteración.
================================================================================


================================================================================
AUG-062 — CIERRE — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD inicial: 348e37294b59fb7a62f78a66ccafe43266eed2b0. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios).
- Las altas de corte, apertura y alimentación comparten un finalizador que valida status/vehicleId y separa el guardado del refresco.
- La sincronización solicita getCatalogData con forceRefresh; Services/catalog.js omite la caché heredada solo cuando ese indicador es true. Las consultas normales conservan su comportamiento.
- El catálogo debe contener exactamente un vehículo con el ID solicitado. Se actualiza el estado y se reconstruye el detalle con mostrarDetalleModal(updatedItem, true), evitando una entrada History API adicional.
- modalDetalle.dataset.vehicleId identifica el contexto activo. Tras aprobar vídeo de tipo corte, se actualiza el catálogo y solo se reconstruye si el mismo vehículo sigue abierto; tutoriales y PyS no alteran el detalle vehicular.
Validación local: VehicleExpansionDetailRefresh 30/30 PASS. Parsing V8 de helpers y bloques de corte, apertura/alimentación, inbox/aprobación y detalle de vehículo: PASS. Handler de catálogo ejecutado con dobles para probar forceRefresh y compatibilidad de caché.
Beta pendiente: navegador real, Apps Script/Spreadsheet desplegados y aprobación integrada de YouTube. No se modificaron datos productivos.
Siguiente tarea: AUG-063. No se inicia en esta iteración.
================================================================================


================================================================================
AUG-063 — CIERRE — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD inicial confirmado: e3fdf2c74c2bec34acaf155c1c9b851325a713e2. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios).
- Services/catalog.js: tipos de corte extraídos de tipoCorte1, tipoCorte2 y tipoCorte3 de la hoja Cortes; configuraciones relay tomadas de Relay.configuracion. Valores vacíos excluidos, duplicados eliminados y listas ordenadas.
- ui.js: el modal elimina las opciones hardcodeadas/fallback. Carga getDropdownData, valida la estructura y requiere listas no vacías; ante error bloquea el envío y ofrece reintentar.
- La selección de tipo y relay se valida antes de crear el snapshot durable. No recomendado solo se acepta si forma parte de la lista oficial y no exige relay.
- La restauración de operaciones pendientes no agrega valores obsoletos a los selectores; el payload durable original se conserva para el reintento. El envío permanece bloqueado hasta completar también la consulta de operaciones pendientes.
Validación local: CutDropdownAuthority 30/30 PASS; parsing V8 de helpers, modal y handler de catálogo PASS.
Beta pendiente: navegador real, hoja Google Sheets real, Apps Script desplegado y cambios concurrentes de listas. No se modificaron datos productivos.
Siguiente tarea: AUG-064. No se inicia en esta iteración.
================================================================================


================================================================================
AUG-064 — CIERRE — 2026-11-11 — SANITIZACIÓN DE APERTURA Y ALIMENTACIÓN
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD de partida: 78eb4dd6c665041cfef38f3c01ac3a3a93125c14. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios).
- WRITE y ADMIN comparten sanitizador de servidor con allow-list de etiquetas, atributos, estilos y esquemas URL; se aplica al plan de addSupplementaryInfo para apertura y los tres campos cableAlimen.
- ADMIN updateVehicleField sanitiza esos mismos campos antes de setValue y rechaza valores no textuales.
- rich-text.js elimina elementos activos y desenvuelve etiquetas no permitidas. ui.js sanitiza cada diapositiva del carrusel y la presentación individual de Apertura/alimentación. Impresión/exportación sanitizan apertura y los tres cables.
- Los datos históricos/importados quedan protegidos al renderizar; no se realizó migración masiva.
Validación local: RichTextContentSecurity 39/39 PASS; AddSupplementaryInfoIntegrity 34/34 PASS; parsing V8 de WRITE, ADMIN, rich-text.js y bloque createAccordionSection PASS.
Beta pendiente: navegador real, Apps Script/Spreadsheet desplegados, datos históricos reales y revisión visual del formato. No se modificaron deployments ni datos productivos.
Siguiente tarea: AUG-065. No se inicia en esta iteración.
================================================================================


================================================================================
AUG-065 — CHECKPOINT — 2026-11-11
Estado: EN PROGRESO; implementación y cobertura añadidas, validación integral pendiente.
Rama GPSpedia2.2.5_work. HEAD inicial: 509cc0d1f531b48de10213f6e54301bb0034a07f. Rama base: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios).
- ui.js: variantes 300/800/1600; clave ObjectURL canónica; Blob/Data URL directos; Blob PNG adjunto solo si el token sigue vigente.
- offline.js: clave por ID normalizado/ancho; lectura estricta valida key/fileId/width/Blob; elimina registros históricos sin tamaño declarado o metadatos incompatibles.
- URL Drive original sin sufijos CDN para preservar alfa; Canvas PNG conserva proporción y no amplía. Lightbox conserva fuente original.
- Suites: ImageResolutionVariants.js; IndexedDBTransactions.js ampliada para orden inverso y registros ambiguos/incompatibles.
Siguiente acción: ejecutar suites locales, corregir fallos y actualizar checkpoint con evidencia real. No iniciar AUG-066.
================================================================================


================================================================================
AUG-065 — CHECKPOINT DE IMPLEMENTACIÓN — 2026-11-11
Commit de implementación: 763110b53c974770c12e81bce764957e432b8566 (padre 509cc0d1f531b48de10213f6e54301bb0034a07f).
Validación realizada en runtime V8: parsing de ui.js (bloques setOptimizedImage/getImageUrl), offline.js, IndexedDBTransactions.js e ImageResolutionVariants.js PASS. Helpers ejecutados: URL fuente original idéntica para 300/800/1600; claves normalizadas distintas por ancho PASS. readFreshThumbnail devuelve Blob válido y rechaza/elimina un registro con ancho discordante PASS.
Pendiente: ejecutar las suites Node completas. No fue posible resolver DNS de GitHub desde el entorno de contenedor; no afirmar ejecución de Node CLI. La suite IndexedDBTransactions debe ejecutarse/adaptarse localmente antes de cerrar AUG-065. No iniciar AUG-066.
================================================================================


================================================================================
AUG-065 — CIERRE LOCAL — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. HEAD confirmado antes del registro: ae2abe19ea1f67fe5aab3cf5b12c411f78b5df8b. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios).
- Suites ejecutadas en runtime V8 adaptado con fuentes actuales: ImageResolutionVariants.js PASS; IndexedDBTransactions.js 44/44 PASS.
- La validación detectó fixtures inconsistentes con la identidad estricta de caché: las semillas LRU usaban fileId sin el relleno de ceros presente en la clave; se corrigieron LRU y eliminación diferida. El escenario de aborto configuraba tres transacciones aunque el flujo actual utiliza dos; se ajustó a ['complete','abort'].
- Commits de corrección: a2d07d78be59435ff037bba2bc9041eadc3fff6d y ae2abe19ea1f67fe5aab3cf5b12c411f78b5df8b.
- Node CLI literal no ejecutado; el entorno no tenía checkout local y el contenedor no resolvió DNS de GitHub. La validación V8 adaptada ejecutó el código real de offline.js y el contenido íntegro de ambas suites con adaptadores de imports/IndexedDB/Blob.
Pendiente para Beta: IndexedDB/Canvas/navegador reales, validación de alfa PNG por píxeles, visualización y calidad con imágenes representativas online/offline. No se modificaron servicios, endpoints ni datos productivos.
AUG-065 cerrada localmente. AUG-066 queda como siguiente tarea; no se inicia en esta iteración.
================================================================================


================================================================================
AUG-066 — CHECKPOINT DE IMPLEMENTACIÓN — 2026-11-11
Estado: EN PROGRESO; alcance CSS restringido y prueba de contrato añadida; validación Node CLI pendiente.
Rama: GPSpedia2.2.5_work. HEAD de partida: d1755ce61fbc8eef30d2a792f3384422fc9fae8c. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).
- style.css: se elimina el modo de fusión global de tarjetas, resultados y vista previa; se limita a la clase explícita .gps-transparent-asset en modo oscuro y se excluye .img-vehiculo-modal.
- No se asigna automáticamente la clase a imágenes existentes: el modelo actual no expone una señal confiable de transparencia y no permite distinguir PNG con alfa de PNG opacos, JPEG, fotografías o diagramas.
- Nueva prueba Services/Test/ImageBlendModeScope.js: contrato estático para verificar el selector opt-in y la ausencia de reglas globales. La misma lógica se ejecutó sobre el CSS vigente en runtime V8: 7/7 PASS. Node CLI literal pendiente.
Siguiente acción: ejecutar la prueba con Node en Codespace, revisar el diff y corregir cualquier fallo reproducible. No iniciar AUG-067.
================================================================================



================================================================================
AUG-066 — CHECKPOINT — 2026-11-11 — COMANDO NODE CLI NO COMPATIBLE CON EL ENTORNO
Estado: EN PROGRESO. La prueba Node CLI no llegó a ejecutarse; el rechazo corresponde a una opción de Node no reconocida.
Rama: GPSpedia2.2.5_work. HEAD de referencia: 3ee5d75fbd49f765a7a93d07e1102fdb9fe353e1. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).
Evidencia recibida desde Codespaces:
- Se sincronizó correctamente la rama GPSpedia2.2.5_work mediante `git pull --ff-only origin GPSpedia2.2.5_work`.
- Al ejecutar `node --experimental-default-type=module Services/Test/ImageBlendModeScope.js`, Node respondió: `node: bad option: --experimental-default-type=module`.
- El proceso rechazó el argumento antes de cargar el archivo; por tanto, ImageBlendModeScope.js no se ejecutó y no existe resultado PASS/FAIL de la prueba CLI.
- La validación V8 adaptada 7/7 PASS registrada en el checkpoint anterior se conserva como evidencia independiente; no sustituye la ejecución Node CLI solicitada.
Siguiente acción:
1. Consultar `node --version` y revisar el campo `type` de package.json para identificar el modo de módulos disponible.
2. Determinar un comando compatible con la versión instalada y ejecutar la prueba sin modificar su contrato.
3. Si el entorno no admite el modo requerido, usar una versión compatible de Node en Codespaces y repetir la prueba.
AUG-066 permanece EN PROGRESO. No iniciar AUG-067.
================================================================================


================================================================================
AUG-066 — CHECKPOINT DE SINCRONIZACIÓN — 2026-11-11
Estado: EN PROGRESO. La prueba Node CLI ya se ejecutó correctamente; la revisión de sincronización del Codespace detectó que el checkout local está un commit detrás del remoto.
Evidencia recibida desde Codespaces (captura del usuario):
- Rama local: GPSpedia2.2.5_work.
- HEAD local: 3ee5d75 — fix(images): scope dark blend mode to transparent assets.
- Seguimiento remoto: origin/GPSpedia2.2.5_work.
- Estado de sincronización: [behind 1], sin commits locales por delante.
- La salida de `git status -sb` no muestra indicadores de cambios locales modificados; el comando previo `git status --short && git diff --check && git diff` no produjo salida.
- El HEAD remoto verificado es 7abfab9, hijo directo de 3ee5d75; contiene el checkpoint que documenta el argumento Node no compatible.
- Después de ese checkpoint, el usuario ejecutó la prueba con el archivo temporal .mjs: resultado confirmado 7/7 PASS y código de salida 0. El archivo temporal fue eliminado por el comando.
Interpretación: el checkout local conserva la implementación de AUG-066, pero aún no incorpora el commit remoto 7abfab9. No hay evidencia de cambios locales pendientes ni de divergencia; falta sincronizar con fast-forward antes de editar o publicar nuevos cambios.
Siguiente acción: ejecutar `git pull --ff-only origin GPSpedia2.2.5_work`, comprobar que el HEAD local alcance 7abfab9 y continuar la revisión del comando documentado en Services/Test/README.md. No iniciar AUG-067.
================================================================================


AUG-066 — ADENDA DE EVIDENCIA — 2026-11-11
La captura posterior a la sincronización muestra la salida de `grep -n -A5 -B2 "AUG-066" Services/Test/README.md`: la línea 682 todavía documenta el comando incompatible `node --experimental-default-type=module Services/Test/ImageBlendModeScope.js`. La rama visible en Codespaces es `GPSpedia2.2.5_work` y el directorio de trabajo es `/workspaces/GPSpedia`. La captura no permite confirmar de forma legible el resultado de `git status -sb` ni el SHA de `git log -1`; deben comprobarse antes de editar. Siguiente acción: corregir únicamente la instrucción de ejecución de AUG-066 para usar la copia temporal `.mjs` (sin dejar archivo temporal en el repositorio), validar el diff y la prueba; no iniciar AUG-067.


================================================================================
AUG-066 — CIERRE LOCAL — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. La tarea se cerró únicamente en la rama de trabajo; no se modificó la rama base.
Resolución:
- style.css: el modo de fusión lighten queda limitado a `.dark-mode img.gps-transparent-asset:not(.img-vehiculo-modal)`; se eliminó de los selectores generales de tarjetas, resultados y vista previa.
- Services/Test/ImageBlendModeScope.js: contrato estático que verifica la única regla opt-in y bloquea la reintroducción de selectores globales.
- Services/Test/README.md: se documenta el comando compatible con Node v24.22.2 mediante copia temporal .mjs, limpieza del temporal y propagación del código de salida.
- Tareas_pendientes_parte5.txt: estado actualizado a COMPLETADA CON VALIDACIÓN DIFERIDA.
Validación local confirmada por el usuario: `ImageBlendModeScope.js` 7/7 PASS; código de salida 0. La ejecución se hizo mediante `ImageBlendModeScope.mjs` temporal, posteriormente eliminado.
Límites y Beta: no se ejecutó navegador real ni una matriz visual de imágenes con alfa/opacas, bordes semitransparentes, colores oscuros y modos claro/oscuro. Esa comprobación queda pendiente para Beta y no bloquea el cierre local según NORMAS_DESAROLLO.md. No se asigna automáticamente la clase a recursos sin metadatos fiables.
Publicación: los registros y documentación se actualizaron mediante commits secuenciales en la rama de trabajo, debido a que la integración de publicación actualiza un archivo por operación. Verificar HEAD, diffs, padre y rama base tras las publicaciones.
Siguiente tarea autorizada por secuencia: AUG-067 — discriminar eje horizontal y vertical en gestos del carrusel de cables. No se inició en esta iteración.
================================================================================


================================================================================
AUG-067 — CIERRE LOCAL — 2026-11-11
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
Rama: GPSpedia2.2.5_work. No se modificó la rama base.
Resolución:
- ui.js: el carrusel de cables registra X/Y y acepta únicamente desplazamientos horizontales superiores a 50 px cuyo eje X domina al eje Y. Los inicios multitáctiles y los gestos sobre controles interactivos se ignoran; touchcancel y secuencias incompletas restablecen el estado. Los listeners pasivos preservan el scroll vertical nativo.
- Services/Test/CableCarouselSwipeAxis.js: suite que extrae el helper real de ui.js y verifica 15 escenarios.
- Services/Test/README.md: se añadió el comando compatible para ejecutar la suite con copia temporal .mjs.
- Tareas_pendientes_parte5.txt y ChangesLogs.txt: cierre y evidencia registrados.
Validación local: runtime V8 adaptado sobre el helper extraído de la fuente vigente de ui.js: 15/15 PASS; se verificó la presencia de los tres listeners táctiles. La ejecución Node CLI de la suite nueva no se realizó en esta sesión.
Pendiente para Beta: probar gestos reales en navegador móvil y PWA standalone, incluidos scroll vertical, controles táctiles y ajuste de altura del acordeón.
Siguiente tarea en la secuencia: AUG-068 — unificar el registro y el cierre por historial de overlays dinámicos. No se inició en esta iteración.
================================================================================


================================================================================
AUG-068 — ITERACIÓN 1 — 2026-11-11 — BASE DE PILA CENTRALIZADA DE OVERLAYS
Estado: EN PROGRESO. Se resolvió la primera brecha arquitectónica; integración de los constructores y del controlador global pendiente.
Rama: GPSpedia2.2.5_work. HEAD confirmado antes de esta actualización documental: 718983287a8b61ac8c712862adcae857e00082ae. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).
Análisis:
- main.js detecta los .info-modal únicamente por style.display === 'flex' y cierra todos los visibles en una sola pulsación; esto no discrimina el overlay superior.
- ui.js mezcla classList 'visible', display inline y estados modalOpen. Los overlays del botón (+), formularios de corte/VIN, reportes, asociación PyS y relay-info no comparten un registro uniforme.
- youtubeUpload.js crea y elimina su overlay dinámico de forma independiente; debe integrarse sin perder su confirmación de pausa ni el aborto de XHR.
Cambio de esta iteración:
- overlayHistory.js: nuevo gestor independiente con registro, reemplazo de overlay superior, cierre manual coordinado con history.back()/go(), reconciliación LIFO en popstate, conservación de otros campos de history.state y manejo de errores de callbacks.
- Services/Test/OverlayHistoryStack.js: suite de 10 escenarios reproducibles.
- Services/Test/README.md: comando Node compatible mediante copia temporal .mjs.
- Tareas_pendientes_parte5.txt: AUG-068 pasa a EN PROGRESO.
Validación local: el código fuente real de overlayHistory.js se ejecutó en runtime V8 adaptado con historial simulado: 10/10 PASS. No se ejecutó Node CLI en esta iteración.
Pendiente de la siguiente iteración: integrar el gestor con main.js popstate y con los constructores dinámicos de ui.js/youtubeUpload.js; preservar padre modalDetalle al cerrar submodal; revisar cierre por backdrop, X, submit/cancelación y carga YouTube activa. Después añadir pruebas de integración local para esos callsites.
Registro: ChangesLogs.txt está en 183,671 bytes, por encima del umbral normativo de 180,000; no se añadió una entrada que aumente el archivo sin preparar primero su rotación. La implementación y evidencia quedan trazadas en este checkpoint y en el backlog. La rotación del registro acumulativo debe resolverse antes de la siguiente adición a ChangesLogs.txt.
No se inició AUG-069. No se modificó la rama base.
================================================================================


================================================================================
AUG-068 — ITERACIÓN 2 — INTEGRACIÓN INICIAL CON main.js — 2026-11-11
Estado: EN PROGRESO. Se integró la pila centralizada con los overlays .info-modal observables; el flujo especial de youtubeUpload.js y la validación del observador DOM quedan para la siguiente iteración.
Rama: GPSpedia2.2.5_work. HEAD de partida: d51b69b674cee21c78acc27be0290b551a6994d0. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).
Cambios:
- main.js importa createOverlayHistoryManager y overlayHistoryStateKey desde overlayHistory.js.
- Se instaló un MutationObserver que detecta apertura, ocultamiento y retirada de .info-modal; crea entradas para overlays visibles y sincroniza los cierres manuales con el historial.
- Cuando un overlay nuevo sustituye al overlay superior retirado en el mismo ciclo de mutaciones, replaceTop reutiliza la entrada para evitar agregar un nivel adicional de Atrás. Se limita el reemplazo al elemento que realmente está en la cima de la pila.
- El listener popstate procesa primero los estados que contienen __gpOverlayStack y retorna antes de cerrar #modalDetalle o restaurar el catálogo; así se conserva el modal padre cuando el overlay hijo es el objetivo del retroceso.
- youtube-upload-modal se excluyó deliberadamente de este observador genérico. Su cierre exige conservar la confirmación de pausa y el aborto de XHR; se integrará mediante su propio callback en la siguiente iteración.
Correcciones durante la integración:
- Se corrigió la detección de elementos ya registrados: la colección se compara contra los valores del Map, evitando registrar el mismo modal más de una vez por mutaciones posteriores.
- Se restringió replaceTop a cuando el overlay retirado era realmente el último elemento de la pila.
Validación local:
- Parsing/sintaxis de main.js mediante compilación V8 tras retirar únicamente las declaraciones import: PASS.
- Gestor overlayHistory.js extraído de la fuente vigente y ejecutado con historial simulado: 10/10 PASS (preservación de estado, cierre superior, LIFO, cierre manual, replaceTop, cierre de padre, errores, duplicados, ID inexistente y clear).
- No se ejecutó Node CLI ni una integración real con DOM/navegador en esta iteración.
Riesgos y pendientes:
- El MutationObserver y el reemplazo de overlays deben recibir pruebas de integración DOM simulada; no se debe declarar validada su ejecución real por el mero parsing de main.js.
- Integrar youtubeUpload.js con el gestor sin duplicar confirmaciones, conservar pausa/aborto de XHR y manejar las rutas de éxito que eliminan el modal.
- Revisar el ciclo de vida de overlays creados desde modalDetalle y los botones de cerrar, backdrop, submit/cancelación.
- No añadir ChangesLogs.txt todavía: continúa por encima del umbral normativo de 180,000 caracteres y requiere rotación sin pérdida con manifiesto antes de una nueva entrada.
No se inició AUG-069. La rama base permanece intacta.
================================================================================


AUG-068 — ADENDA ITERACIÓN 2 — 2026-11-11
Corrección detectada en revisión del flujo: al volver desde un overlay hijo, el estado histórico anterior puede ser el del modal padre y no contener __gpOverlayStack. Por ello, el listener popstate ahora también consulta si la pila administrada aún tiene elementos; si los hay, reconcilia la pila con el estado de destino y retorna antes de ejecutar el cierre de #modalDetalle. Esto evita que una pulsación cierre simultáneamente el overlay hijo y el padre.
Validación: la sintaxis de main.js y los 10 escenarios lógicos del gestor se volvieron a comprobar tras la corrección; ambos PASS en V8 adaptado. Sigue pendiente una prueba de integración DOM que verifique el ciclo MutationObserver + popstate y los flujos de youtubeUpload.js.


================================================================================
AUG-068 — ITERACIÓN 3A — CIERRE CANCELABLE DE OVERLAYS — 2026-11-11
Estado: EN PROGRESO. Se resolvió una dependencia necesaria antes de integrar youtubeUpload.js.
Rama: GPSpedia2.2.5_work. HEAD de partida: 3d8541ba3bcf92ef22cac4ae07a3f92a9bd959e6. Rama base: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Hallazgo: el gestor eliminaba la entrada al recibir popstate antes de ejecutar el callback de cierre. Un callback que solicitara confirmación y devolviera cancelación podía dejar el modal visible pero fuera de la pila y con el historial desincronizado.
Cambio:
- overlayHistory.js: invokeClose ahora propaga la cancelación explícita (retorno false). handlePopState restaura la entrada y crea un estado de historial equivalente cuando el usuario cancela el cierre.
- Services/Test/OverlayHistoryStack.js: se añade regresión para cancelar el primer retroceso y aceptar el segundo; la suite pasa de 10 a 11 escenarios.
Validación prevista: ejecutar la suite Node CLI completa y revisar diff/sintaxis antes de publicar. No se ha integrado todavía youtubeUpload.js.
Continuidad: siguiente iteración, conectar el callback de cierre de youtubeUpload.js con el gestor y devolver false cuando el usuario rechace pausar una transferencia activa. Preservar el aborto XHR y las rutas de cierre por éxito.
No se modifica la rama base. ChangesLogs.txt no se modifica en esta iteración porque supera el umbral de rotación de 180,000 caracteres; su rotación debe completarse antes de la próxima entrada.
================================================================================


AUG-068 — ADENDA DE VALIDACIÓN — CIERRE CANCELABLE — 2026-11-11
La regresión nueva de cancelación de cierre y los diez escenarios previos de la pila se ejecutaron en Node v22.16.0 mediante un harness local adaptado a partir de la implementación y la suite vigentes: **11/11 PASS**, código de salida 0. Se verificaron conservación del estado, cierre superior, orden LIFO, reemplazo, cierre manual, errores, IDs inválidos/inexistentes, clear y restauración de la entrada al cancelar popstate. La ejecución se realizó con una reproducción local del módulo y de los escenarios; no fue una ejecución CLI sobre un checkout de Codespaces. La integración de youtubeUpload.js continúa pendiente y no se declara validada.


================================================================================
AUG-068 — ITERACIÓN 3B — INTEGRACIÓN DEL MODAL YOUTUBE — 2026-11-11
Estado: EN PROGRESO. Integración inicial publicada; pendiente validación de comportamiento en navegador y pruebas de regresión de ciclo de vida.
Rama: GPSpedia2.2.5_work. HEAD de partida: e9f48e1e6aabe440db2107860d5e727e35e111c4. Rama base verificada antes del cambio: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Cambios en youtubeUpload.js:
- El modal registra una entrada propia en window.overlayHistory, dado que main.js lo excluye del MutationObserver genérico.
- El botón X, Cancelar y el botón Atrás utilizan la ruta centralizada de cierre.
- El callback devuelve false si el usuario rechaza pausar la transferencia; el gestor conserva/restaura la entrada del historial.
- Si el usuario confirma, se marca uploadCancelled, se aborta activeXhr y se cierra el modal; el flujo de error conserva el registro de recuperación como estado paused.
- Las tres rutas de cierre automático tras detectar una solicitud pendiente/aprobada o completar la subida usan closeAfterUpload para sincronizar el historial sin pedir confirmación de pausa.
Validación realizada: revisión estática del archivo recuperado de GitHub. Se comprobaron registro explícito, cancelación con retorno false, aborto XHR, conexión de ambos botones, tres cierres automáticos centralizados y una sola llamada directa a modal.remove() dentro del callback. No se ejecutó Node CLI, suite de integración DOM ni navegador real; no declarar esas validaciones aprobadas.
Archivos modificados en esta iteración: youtubeUpload.js. No se modificó ChangesLogs.txt por superar 180,000 caracteres y requerir rotación normativa sin pérdida.
Continuidad: en la siguiente iteración ejecutar validaciones reproducibles (sintaxis y suite), revisar sincronización del historial al reemplazar una instancia existente del modal y probar cancelación/confirmación con transferencia activa. No iniciar AUG-069.
================================================================================



================================================================================
AUG-068 — ITERACIÓN 3C — SINCRONIZACIÓN AL REABRIR EL MODAL YOUTUBE — 2026-11-11
Estado: EN PROGRESO. Se corrigió el reemplazo de instancias para evitar entradas huérfanas; pendiente ejecutar la prueba Node CLI en Codespaces y continuar con validaciones de cierre durante transferencia activa.
Rama: GPSpedia2.2.5_work. HEAD de partida confirmado: f7348e46f71e70af4f868c65943632afcf5a6118. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Hallazgo:
- openYouTubeUploadModal retiraba con existing.remove() el modal anterior sin notificar a overlayHistory. La entrada anterior permanecía en la pila; la nueva apertura agregaba otra entrada y el siguiente Atrás podía operar sobre un overlay inexistente.
- La sustitución directa también podía retirar una transferencia activa y abortar su continuidad sin pasar por la confirmación prevista.

Cambio:
- youtubeUpload.js: la instancia expone su ID, callback de cierre y estado de transferencia.
- Si ya existe una transferencia activa, la nueva apertura reutiliza la instancia existente y no altera su XHR ni su progreso.
- Si el modal está cubierto por otro overlay, no se retira desde debajo.
- Si está inactivo y es el overlay superior, se ejecuta su callback de cierre; si el cierre se cancela, no se crea otra instancia.
- El reemplazo de una instancia registrada usa overlayHistory.replaceTop para reutilizar la entrada existente; se evita el registro huérfano.
- Services/Test/YouTubeUploadOverlayLifecycle.js: nueva prueba de contrato estático con ocho comprobaciones.
- Services/Test/README.md: comando Node CLI con copia temporal .mjs.

Validación de esta iteración:
- Revisión de fuente y consistencia de las rutas de reemplazo: realizada.
- No se ejecutó Node CLI ni un runtime DOM/browser en esta iteración; la suite nueva queda pendiente de ejecución en Codespaces.
- No se modificó ChangesLogs.txt porque supera el umbral de 180,000 caracteres y requiere rotación normativa sin pérdida antes de añadir entradas.
- No se modificó la rama base.

Siguiente acción: ejecutar YouTubeUploadOverlayLifecycle (8 comprobaciones) en Codespaces, corregir cualquier fallo reproducible y luego continuar con las pruebas de cancelación/confirmación de cierre durante transferencia activa. No iniciar AUG-069.
================================================================================



================================================================================
AUG-068 — ITERACIÓN 3D — CIERRE DURANTE TRANSFERENCIA YOUTUBE — 2026-11-12
Estado: EN PROGRESO. Se añadió una prueba de integración aislada que ejecuta los callbacks reales extraídos de youtubeUpload.js junto con el gestor real overlayHistory.js y un historial simulado.
Rama: GPSpedia2.2.5_work. HEAD de partida: 027e295b5faa1532923f80828ba415cd59566665. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1).

Cobertura añadida:
- Atrás mientras hay transferencia: rechazar confirmación mantiene el modal visible, el XHR sin abortar, uploadCancelled=false y la entrada del historial.
- Atrás mientras hay transferencia: confirmar pausa marca uploadCancelled, aborta el XHR una vez, elimina el modal y vacía la pila.
- Solicitud de cierre desde X: rechazar mantiene modal e historial.
- Solicitud de cierre desde Cancelar: confirmar pausa aborta XHR y cierra modal.
- La prueba lee youtubeUpload.js y evalúa los callbacks closeModal/requestOverlayClose reales, no copias manuales de su lógica; utiliza createOverlayHistoryManager real con History simulado.
- Archivo: Services/Test/YouTubeUploadCloseDuringTransfer.js.

Validación local adaptada:
- Los cuatro escenarios anteriores se ejecutaron en runtime V8 con los callbacks extraídos de youtubeUpload.js y la implementación real de overlayHistory.js: 4/4 PASS.
- No fue ejecución Node CLI en Codespaces ni prueba con DOM/navegador real.
- No se modificó ChangesLogs.txt porque supera 180,000 caracteres y requiere rotación normativa sin pérdida.
- No se modificó la rama base.

Comando de ejecución desde la raíz:
cp Services/Test/YouTubeUploadCloseDuringTransfer.js Services/Test/YouTubeUploadCloseDuringTransfer.mjs && node Services/Test/YouTubeUploadCloseDuringTransfer.mjs; RESULT=$?; rm -f Services/Test/YouTubeUploadCloseDuringTransfer.mjs; printf 'Resultado Node: %s\\n' "$RESULT"; test "$RESULT" -eq 0

Siguiente acción: ejecutar la prueba 4/4 y la suite OverlayHistoryStack en Codespaces; resolver cualquier fallo reproducible. Después revisar el flujo de cancelación/recuperación y las rutas de cierre automático. No iniciar AUG-069.
================================================================================


================================================================================
AUG-068 — ADENDA ITERACIÓN 3D — REGISTRO Y CONTADOR DE PRUEBAS — 2026-11-12
Durante la preparación de la ejecución reproducible se detectó que OverlayHistoryStack contiene 11 escenarios, pero su mensaje final indicaba 11/10. Se corrigió el denominador a 11. También se añadió a Services/Test/README.md el comando Node CLI y el alcance de YouTubeUploadCloseDuringTransfer.js, que faltaban en la documentación.
Validación de esta corrección: revisión de los 11 casos y comprobación estática de la documentación y el contador. No se declara ejecución Node CLI ni navegador real. La rama base permanece intacta.
Siguiente acción: ejecutar en Codespaces las suites OverlayHistoryStack (11/11), YouTubeUploadOverlayLifecycle (8/8) y YouTubeUploadCloseDuringTransfer (4/4); revisar cualquier fallo antes de ampliar la cobertura de las rutas de recuperación y cierre automático. No iniciar AUG-069.
================================================================================


================================================================================
AUG-068 — ITERACIÓN 3E — DISPONIBILIDAD DEL CIERRE X DURANTE TRANSFERENCIA — 2026-11-12
Hallazgo: el callback closeModal sí solicitaba confirmación, marcaba uploadCancelled y abortaba activeXhr; sin embargo, el botón X se ocultaba al comenzar la transferencia. Por tanto, el cierre X probado por la suite no estaba disponible realmente en la interfaz mientras se subía el archivo.
Corrección:
- youtubeUpload.js: se elimina la instrucción que ocultaba closeBtn durante la transferencia. La X permanece visible y utiliza requestOverlayClose, por lo que la confirmación de pausa y conservación del progreso se mantiene como protección.
- Services/Test/YouTubeUploadCloseDuringTransfer.js: se añade una aserción para impedir que la X vuelva a ocultarse.
Validación adaptada pendiente tras el cambio: ejecutar nuevamente la prueba de cierre durante transferencia y comprobar el contador actualizado. No se ejecutó Node CLI ni navegador real.
La rama base no se modifica. ChangesLogs.txt permanece sin cambios por superar el umbral de rotación normativa.
Siguiente acción: validar la nueva aserción y continuar la revisión de cierres automáticos/recuperación dentro de AUG-068. No iniciar AUG-069.
================================================================================


ADENDA DE VALIDACIÓN — ITERACIÓN 3E
La prueba de cierre durante transferencia se ejecutó nuevamente en runtime V8 adaptado con los callbacks reales de youtubeUpload.js y el gestor real overlayHistory.js: 5/5 PASS. Incluye rechazo/confirmación mediante Atrás, X y Cancelar, aborto único del XHR al confirmar y verificación de que la X permanece visible/enlazada a la ruta protegida.
No equivale a ejecución Node CLI en Codespaces ni a prueba visual DOM/navegador real. La prueba CLI queda pendiente para la siguiente iteración.


================================================================================
AUG-068 — ITERACIÓN 3F — COBERTURA DE CIERRES AUTOMÁTICOS — 2026-11-12
Revisión del flujo de recuperación y cierre automático de YouTube:
- Se verificó que las tres rutas automáticas (operación ya pendiente, operación ya aprobada y subida enviada a aprobación) convergen en closeAfterUpload.
- closeAfterUpload activa closeWithoutPrompt y delega en requestOverlayClose; no retira directamente el modal ni deja desincronizada la pila de overlayHistory.
- La recuperación local incluye estados new, uploading, paused, interrupted y uploaded. Si hay más de un registro para el mismo usuario/contenido, se detiene con error para evitar elegir una sesión arbitraria.
- Se amplió Services/Test/YouTubeUploadCloseDuringTransfer.js con dos casos: cierre automático elimina la entrada histórica sin pedir confirmación y las tres rutas automáticas utilizan el cierre centralizado.
- No se detectó un defecto de implementación que justificara modificar youtubeUpload.js en esta revisión.

Validación de esta iteración: pendiente ejecutar la prueba ampliada en Codespaces. La lógica de cierres manuales y el gestor ya se habían ejecutado en V8 adaptado; no se declara ejecución Node CLI ni navegador real para esta nueva cobertura.
Rama base intacta. ChangesLogs.txt sin modificar por superar el límite y requerir rotación normativa.
Siguiente acción: ejecutar la prueba ampliada (6/6) y revisar cualquier fallo; después revisar el guardado/reconciliación de checkpoints durante cancelación y reanudación. No iniciar AUG-069.
================================================================================


ADENDA DE VALIDACIÓN — ITERACIÓN 3F
Validación adaptada ejecutada en runtime V8:
- YouTubeUploadCloseDuringTransfer: 6/6 PASS.
- OverlayHistoryStack: 11/11 PASS.
- YouTubeUploadOverlayLifecycle: 8/8 PASS.
- youtubeUpload.js: parsing sintáctico en V8 después de retirar import/export para adaptar el módulo a la evaluación aislada.
La prueba nueva ejecutó closeAfterUpload real con overlayHistory real y History simulado; verificó que la entrada se elimina y no se solicita confirmación cuando el cierre automático se produce tras finalizar la operación. También confirmó estáticamente que hay exactamente tres llamadas a closeAfterUpload.
Limitación: no es ejecución Node CLI en Codespaces ni prueba DOM/navegador real. Esas verificaciones siguen pendientes para Beta/entorno de Codespaces según corresponda.


================================================================================
AUG-068 — ITERACIÓN 3G — PRUEBAS DE CHECKPOINT Y REANUDACIÓN — 2026-11-12
Revisión del flujo de transferencia:
- La reanudación consulta primero el offset remoto cuando el registro no está en estado new o ya tiene bytes confirmados.
- El progreso persistido se actualiza con el Range confirmado por YouTube, no con el progreso visual intermedio del evento upload.onprogress.
- Una cancelación durante un bloque hace que la promesa del bloque rechace; la rutina de transferencia comprueba uploadCancelled y no ejecuta una consulta de reconciliación ni inicia otro bloque.
- El catch exterior de form.onsubmit guarda el registro como paused cuando uploadCancelled está activo, conservando file, uploadUrl, videoId y bytesUploaded para la siguiente apertura.
No se encontró en esta inspección un defecto reproducible que requiera modificar youtubeUpload.js. Se añade una prueba local enfocada que ejecuta las funciones reales de transferencia con XMLHttpRequest simulado, cubriendo reanudación desde offset confirmado y cancelación durante un bloque.
Archivos: Services/Test/YouTubeUploadCheckpointRecovery.js y Services/Test/README.md.
Validación prevista: ejecución de la nueva prueba y parsing sintáctico adaptado. No declarar ejecución Node CLI/Codespaces ni YouTube API real si no se han ejecutado.
ChangesLogs.txt no se modifica por requerir rotación normativa. Rama base intacta.
Siguiente acción: validar ambos escenarios; después revisar persistencia de registros IndexedDB y transiciones de estado uploaded/interrupted/paused. No iniciar AUG-069.
================================================================================


ADENDA DE AJUSTE DE PRUEBA — ITERACIÓN 3G
En la primera ejecución adaptada de YouTubeUploadCheckpointRecovery se detectó un defecto en el extractor de funciones de la propia prueba: omitía el prefijo async de uploadYouTubeFileResumable_, por lo que el evaluador dinámico no podía analizar await. Se corrigió el extractor para conservar la declaración async. No es un defecto de youtubeUpload.js. Se repite la validación tras esta corrección.


ADENDA DE VALIDACIÓN — ITERACIÓN 3G
YouTubeUploadCheckpointRecovery: 2/2 PASS en runtime V8 adaptado:
- Reanudación desde un registro pausado: consulta el offset confirmado en el servidor, persiste el offset reconciliado, transfiere el bloque restante, persiste el nuevo offset y obtiene el ID final.
- Cancelación durante un bloque: aborta la solicitud activa, rechaza la transferencia, conserva el último offset confirmado y no inicia un bloque adicional.
Se ejecutó además parsing sintáctico de youtubeUpload.js en V8 adaptado, retirando import/export para la evaluación aislada.
El primer intento de ejecutar el nuevo test reveló un error en el extractor de la prueba (no conservaba async); se corrigió y la ejecución posterior pasó 2/2.
No equivale a Node CLI en Codespaces ni a YouTube API real. La validación de API externa queda diferida a Beta; las pruebas locales reproducibles de esta iteración aprobaron.


================================================================================
AUG-068 — ITERACIÓN 3H — RECUPERACIÓN DE BORRADORES SIN REFERENCIA — 2026-11-12
Hallazgo: openYouTubeUploadModal solo iniciaba findPendingYouTubeUploadRecord_ cuando initialUserId y referenceId eran truthy. Sin embargo, el módulo admite referenceId opcional, y los registros nuevos guardan String(referenceId), que para un borrador sin referencia es "null". Por tanto, las transferencias pausadas de borradores no podían localizarse al reabrir el modal.
Corrección: la búsqueda se inicia cuando existe usuario autenticado, aunque referenceId sea null. La comparación existente usa String(referenceId), por lo que null coincide con el valor persistido "null"; no se altera la separación por usuario ni tipo de contenido.
Prueba nueva: Services/Test/YouTubeUploadDraftRecovery.js, con IndexedDB simulado; cubre borrador sin referencia, contenido con referencia y condición de invocación desde el modal.
Archivos modificados: youtubeUpload.js, Services/Test/YouTubeUploadDraftRecovery.js, Services/Test/README.md.
Estado de validación: pendiente ejecutar prueba local adaptada y parsing. No declarar Node CLI/Codespaces ni navegador real si no se ejecutaron.
ChangesLogs.txt no se modifica por rotación normativa. Rama base intacta.
Siguiente acción: validar los tres escenarios; si pasan, registrar checkpoint y commit. Luego revisar la transición de registros uploaded sin depender del File persistido. No iniciar AUG-069.
================================================================================


ADENDA DE AJUSTE DE PRUEBA — ITERACIÓN 3H
La primera ejecución adaptada reveló que el extractor de la nueva prueba omitía el prefijo async de findPendingYouTubeUploadRecord_. Se corrigió el extractor para conservar la declaración async, siguiendo el mismo criterio aplicado en la prueba de reanudación. El error estaba en el harness de prueba, no en la implementación de IndexedDB ni en youtubeUpload.js. Se repetirá la validación.


ADENDA DE VALIDACIÓN — ITERACIÓN 3H
YouTubeUploadDraftRecovery: 3/3 PASS en runtime V8 adaptado:
- Encuentra y devuelve una transferencia pausada cuyo referenceId persistido es "null".
- Conserva la búsqueda de registros asociados a una referencia concreta.
- Confirma que openYouTubeUploadModal inicia la búsqueda cuando hay usuario aunque referenceId sea null.
Parsing sintáctico de youtubeUpload.js: PASS en V8 adaptado, retirando import/export para evaluación aislada.
El extractor de la prueba se corrigió para conservar async. El runner V8 recibió un adaptador queueMicrotask basado en Promise.resolve().then(), ya que ese global no está expuesto en el runtime aislado de esta ejecución.
No es ejecución Node CLI en Codespaces ni IndexedDB real del navegador. La simulación local de la lógica y los contratos aprobó; persistencia real y comportamiento de navegador quedan para Beta.


================================================================================
AUG-068 — ITERACIÓN 3I — RECUPERACIÓN DE TRANSFERENCIA COMPLETADA SIN FILE — 2026-11-12
Hallazgo: form.onsubmit exigía siempre que el registro recuperado conservara uploadRecord.file, incluso cuando videoId era válido y bytesUploaded alcanzaba fileSize. Esto impedía recuperar/enviar la aprobación si el objeto File no podía restaurarse desde IndexedDB, aunque no fuera necesario repetir la transferencia.
Corrección: helper hasCompletedYouTubeUpload_ valida ID final de 11 caracteres, tamaño positivo finito y bytesUploaded >= fileSize. La validación inicial del formulario y la comprobación de identidad permiten ausencia de File solo cuando se cumplen esas condiciones. El flujo existente reconoce el videoId y omite uploadYouTubeFileResumable_, continuando con submitVideoForApproval.
Prueba nueva: Services/Test/YouTubeUploadCompletedRecordRecovery.js, cubre registro uploaded sin File, estado interrupted posterior a transferencia completa, ausencia de ID, offset incompleto y tamaños inválidos, además del contrato del formulario.
Archivos modificados: youtubeUpload.js, Services/Test/YouTubeUploadCompletedRecordRecovery.js, Services/Test/README.md.
Estado: pendiente ejecutar pruebas locales adaptadas, parsing y revisión de diff.
ChangesLogs.txt no se modifica por rotación normativa. Rama base intacta.
Siguiente acción: validar seis escenarios; después continuar con estados de persistencia IndexedDB. No iniciar AUG-069.
================================================================================


ADENDA DE VALIDACIÓN — ITERACIÓN 3I
YouTubeUploadCompletedRecordRecovery: 6/6 PASS en runtime V8 adaptado:
- Permite continuar un registro con ID final válido y bytes confirmados completos aunque file no esté disponible.
- Permite recuperación del envío de aprobación si el catch marcó interrupted después de completar la transferencia.
- Rechaza ausencia de ID final, bytes incompletos y tamaños no válidos.
- Verifica las guardas del formulario y la comprobación de identidad.
Regresiones relacionadas: YouTubeUploadCheckpointRecovery 2/2 PASS; YouTubeUploadDraftRecovery 3/3 PASS.
Parsing sintáctico de youtubeUpload.js: PASS en V8 adaptado, retirando import/export para evaluación aislada.
Revisión del diff entre 96cae67 y f75a409: únicamente youtubeUpload.js, la prueba nueva, Services/Test/README.md y checkpoint.md.
Limitaciones: no se ejecutó Node CLI en Codespaces ni IndexedDB/navegador real. La prueba usa funciones reales extraídas y lógica simulada; persistencia real queda para Beta.


================================================================================
AUG-068 — ITERACIÓN 3J — ERRORES Y FINALIZACIÓN DE TRANSACCIONES INDEXEDDB
Estado: EN PROGRESO. Se resolvió un defecto reproducible en el ciclo de persistencia local de las subidas de YouTube.

Hallazgo:
- deleteYouTubeUploadRecord_ no atendía tx.onabort ni tx.onerror; una transacción abortada podía dejar pendiente indefinidamente la promesa de limpieza.
- getYouTubeUploadRecord_ y findPendingYouTubeUploadRecord_ resolvían al completarse la solicitud individual, sin esperar tx.oncomplete ni manejar el aborto/error de la transacción. Una lectura podía anunciar éxito antes de que la transacción terminara correctamente.
- saveYouTubeUploadRecord_ ya manejaba los eventos de error/aborto, pero su lógica de cierre/settlement era independiente.

Corrección:
- Se añadió watchYouTubeUploadTransaction_ para resolver/rechazar una sola vez, cerrar la conexión y esperar la finalización de la transacción.
- save/get/find/delete utilizan el mismo control; las lecturas solo entregan resultados después de tx.oncomplete.
- Se conserva el rechazo de múltiples registros pendientes para la misma combinación usuario/tipo/referencia y el filtro de los cinco estados recuperables.
- Nueva suite Services/Test/YouTubeUploadRecordPersistence.js: round-trip de cinco estados, aislamiento, duplicados, eliminación, error/aborto de las cuatro operaciones y aborto posterior a la solicitud en lecturas.

Validación local:
- 12/12 PASS en runtime V8 adaptado, ejecutando las funciones reales extraídas de youtubeUpload.js con IndexedDB simulado.
- Parsing de la fuente modificada y del harness Node: PASS.
- No se ejecutó Node CLI en Codespaces ni IndexedDB real de navegador; esas comprobaciones quedan para Beta.
- ChangesLogs.txt no se modificó: contiene 180,542 caracteres y requiere rotación documental sin pérdida antes de nuevas adiciones.

Rama base intacta. No iniciar AUG-069.
Siguiente acción: ejecutar la suite reproducible en Node CLI de Codespaces y continuar la revisión final del ciclo de vida YouTube dentro de AUG-068.
================================================================================


ADENDA DE VALIDACIÓN — ITERACIÓN 3J
La suite Services/Test/YouTubeUploadRecordPersistence.js se ejecutó completa con las funciones reales extraídas de youtubeUpload.js y el IndexedDB simulado: 14/14 PASS. Se incluyen los 12 escenarios iniciales y dos regresiones adicionales que fuerzan el aborto después de que get/getAll entregan su resultado; ambas confirman que la lectura no se resuelve antes de tx.oncomplete.
Se corrigió el mensaje final del harness de 12/12 a 14/14. La ejecución fue en runtime V8 adaptado; no equivale a Node CLI/Codespaces ni IndexedDB real de navegador.


================================================================================
AUG-068 — ITERACIÓN 3K — INTEGRACIÓN DE HISTORIAL EN add_cortes.html
Hallazgo:
- add_cortes.html es una página independiente: importa youtubeUpload.js, pero no carga main.js ni inicializaba window.overlayHistory.
- Su listener popstate solo atendía al lightbox. Por ello, durante una carga YouTube abierta desde esta página, Atrás no llegaba al callback de cierre/confirmación del modal; el overlay podía permanecer abierto fuera de la navegación.
Corrección:
- Se importó createOverlayHistoryManager y overlayHistoryStateKey desde overlayHistory.js.
- Se inicializa window.overlayHistory con window.history al cargar el módulo de add_cortes.
- El listener popstate conserva prioridad del lightbox (si está sobre la carga) y después delega el cierre del overlay administrado al gestor compartido.
- No se modificó la lógica de XHR, confirmación, pausa ni persistencia de youtubeUpload.js.
Prueba nueva: Services/Test/AddCortesYouTubeOverlayHistory.js. Cubre Atrás durante carga YouTube y secuencia lightbox -> YouTube, comprobando que cada retroceso cierra únicamente la capa superior.
Validación local:
- AddCortesYouTubeOverlayHistory: 2/2 PASS en runtime V8 adaptado, con el gestor real overlayHistory.js y el listener extraído de add_cortes.html.
- YouTubeUploadCloseDuringTransfer: 6/6 PASS con callbacks reales del módulo y gestor real.
- Parsing del módulo inline de add_cortes.html: PASS después de retirar imports para evaluación aislada.
- No se ejecutó Node CLI en Codespaces ni navegador real; la validación DOM/navegador queda diferida a Beta.
ChangesLogs.txt no se modificó por la rotación documental ya identificada. Rama base intacta.
Estado de AUG-068: EN PROGRESO. No iniciar AUG-069.
Siguiente acción: continuar el inventario de constructores dinámicos restantes y comprobar la reconciliación del observador DOM con la pila compartida.
================================================================================


================================================================================
AUG-068 — ITERACIÓN 3L — RECONCILIACIÓN DE OVERLAYS .info-modal CON HISTORIAL COMPARTIDO
Estado: EN PROGRESO. Se corrigió una inconsistencia local de historial; AUG-068 continúa abierta.
Rama: GPSpedia2.2.5_work. HEAD de partida: 218d0141b9a28503d1aff77a378861a86a686877. Rama base: GPSpedia2.2.5.

Inventario y hallazgo:
- index.html contiene overlays .info-modal estáticos; ui.js crea además 15 instancias dinámicas con esa clase. main.js observa inserciones, visibilidad y retirada de estos elementos y los registra en overlayHistory.js.
- youtube-upload-modal está excluido del observador y usa registro explícito; add_cortes.html inicializa su propio gestor porque no carga main.js. lightbox.js conserva su historial independiente y su prioridad de cierre.
- ui.js todavía añadía estados paralelos history.pushState({modalOpen:true}) en cinco rutas de overlays .info-modal; renderRelayInfoModal tenía además su propio cierre ligado a ese estado. El observador y la pila compartida podían quedar con entradas antiguas al reemplazar overlays.

Corrección:
- ui.js: se eliminaron los cinco pushState paralelos restantes; el modal relay dinámico delega el cierre en window.overlayHistory.close usando el ID asignado por el observador.
- Los demás cierres manuales conservan sus cambios de visibilidad; el MutationObserver detecta la retirada/ocultamiento y reconcilia la entrada con el gestor compartido.
- No se modificaron overlayHistory.js ni el algoritmo del observador en main.js.
- Services/Test/OverlayHistoryStack.js: se añadieron dos regresiones para reemplazo de modal relay y ausencia de estados de historial paralelos. Total: 13 escenarios.
- Services/Test/README.md actualizado.

Validación:
- OverlayHistoryStack: 13/13 PASS en runtime V8 adaptado, usando overlayHistory.js real y el código fuente actual de ui.js para el contrato.
- Parsing aislado de renderRelayInfoModal: PASS.
- ui.js no contiene ya history.pushState({modalOpen:true}) (conteo verificado: 0).
- El intento de parsing completo de ui.js en este runtime falla con “Invalid regular expression: missing /” también sobre la versión previa de ui.js en HEAD 218d014; no se atribuye a esta modificación. No se ejecutó Node CLI en Codespaces ni prueba DOM/navegador real.
- La validación DOM/navegador real y Node CLI permanecen pendientes para Beta/entorno local correspondiente.

Siguiente acción: revisar si quedan constructores dinámicos de overlays fuera de .info-modal que requieran integración explícita o exclusión del observador. AUG-068 permanece EN PROGRESO; no iniciar AUG-069.
================================================================================


================================================================================
AUG-068 — ITERACIÓN 3N — 2026-11-12 — CIERRE DEL LIGHTBOX DE IMÁGENES REEMPLAZADAS
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. Se completó el inventario de overlays dinámicos y se corrigió el último ciclo de vida de lightbox detectado.
Rama: GPSpedia2.2.5_work. HEAD previo al checkpoint: 65e07d8091f066293ecf01c6c50196bd974943f3. Rama base: GPSpedia2.2.5 (sin modificaciones; behindBy 0).

Hallazgo y corrección:
- `replaced-image-lightbox` era un diálogo hijo de `replaced-images-modal`, pero no registraba apertura/cierre en `overlayHistory`. Atrás podía abandonar el contexto sin cerrar primero la imagen ampliada.
- `ui.js`: el lightbox ahora se registra explícitamente como hijo en la pila compartida. Reabrirlo reutiliza la entrada existente; Atrás, Escape, backdrop y X delegan el cierre al gestor. Cerrar el modal padre permite que el gestor cierre las capas descendientes en orden LIFO.
- El cierre del modal padre deja de retirar el lightbox por una ruta paralela; la pila compartida realiza la reconciliación. El reset de sesión limpia el contenido visual y el cierre del padre termina de reconciliar el registro.
- Nueva suite `Services/Test/ReplacedImagesLightboxHistory.js` con seis escenarios de contrato y pila anidada. `Services/Test/README.md` documenta su comando.
- `Tareas_pendientes_parte5.txt` actualiza AUG-068 a COMPLETADA CON VALIDACIÓN DIFERIDA.
- No se modificaron `overlayHistory.js`, `main.js` ni la rama base. `ChangesLogs.txt` no se modificó porque supera el umbral normativo de rotación; no se agregó contenido sin completar antes una rotación sin pérdida.

Validación local:
- Bloques modificados de apertura/cierre: parsing V8 PASS.
- Contratos de registro, reapertura sin duplicación y cierre manual: PASS.
- Pila real `overlayHistory.js` con History simulado: Atrás cierra el hijo y conserva el padre; cierre del padre reconcilia descendientes LIFO.
- Suite adaptada equivalente de `ReplacedImagesLightboxHistory`: 6/6 PASS en runtime V8.
- Cobertura ya validada en iteraciones previas: `OverlayHistoryStack` 13/13; `AddCortesYouTubeOverlayHistory` 2/2; `YouTubeUploadCloseDuringTransfer` 6/6; `YouTubeUploadOverlayLifecycle` 8/8.
- No se ejecutó el comando Node CLI en Codespaces ni prueba DOM/navegador real. Estas validaciones quedan diferidas a Beta; no bloquean el cierre local conforme a NORMAS_DESAROLLO.md.

Commits de esta iteración:
- b4dbf9a — registro de replaced-image-lightbox en el historial compartido.
- 6872e26 — nueva suite de regresión.
- efadc56 — ajuste de aserción del harness.
- abf398d — documentación de la suite.
- 65e07d8 — estado de AUG-068 en backlog.

Siguiente acción: AUG-068 cerrada. No iniciar AUG-069 hasta una nueva instrucción.
================================================================================


================================================================================
AUG-069 — ITERACIÓN 1 — 2026-11-12 — OPERACIÓN CENTRAL DE RETROCESO CON HISTORY API
Estado: EN PROGRESO. Se resolvió la primera brecha de sincronización; la tarea permanece abierta para completar la matriz de rutas y regresiones.
Rama: GPSpedia2.2.5_work. HEAD antes de este checkpoint: a112e49f5c947cdcbd911a1105873a9da7b152db. Rama base: GPSpedia2.2.5 (aheadBy 1050, behindBy 0; sin cambios en la base).

Problema y cambios:
- Los botones «Volver» de los niveles de categoría, marca, modelo, equipamiento, tipo de encendido y años llamaban directamente a renderizadores. Al volver, esos renderizadores podían agregar otra entrada y conservar la vista profunda en el historial.
- Nuevo `navigationHistory.js`: registra el estado anterior de navegación, compara destino completo, usa `history.back()` cuando el destino coincide y, si no coincide, reemplaza la entrada actual y renderiza el destino sin agregar profundidad. Conserva query, origin, categoría, marca, modelo, equipamiento, encendido y sección.
- `ui.js`: los seis botones de catálogo usan `volverAEstado`; las rutas de búsqueda y los accesos desde el modal de detalle conservan el estado anterior. Las secciones usan el mismo helper para no duplicar entradas al seleccionar repetidamente la sección activa.
- `main.js`: los estados de búsqueda enfocada/desenfocada ya no crean dos entradas duplicadas. Al pulsar Atrás con el buscador enfocado se conserva la consulta en una sola entrada desenfocada; el listener restaura el antecesor guardado y conserva Forward.
- `navigation.js`: la sincronización del historial de búsqueda se realiza antes de la salida por cero resultados; los estados vacíos también conservan el antecesor.
- Nueva suite `Services/Test/NavigationBackHistory.js` con 17 escenarios. `Services/Test/README.md` documenta su ejecución.

Validación local:
- `NavigationBackHistory`: 17/17 PASS en runtime V8 adaptado, usando `navigationHistory.js` real y comprobaciones de contrato sobre `ui.js`, `main.js` y `navigation.js`.
- Parsing V8 aislado de los 18 bloques modificados (renderizadores, helpers, callbacks de búsqueda, popstate y accesos del modal) más el módulo `navigationHistory.js`: 19/19 PASS.
- Incluye secuencia multinivel Atrás/Adelante, búsqueda enfocada, consulta sin resultados, hash deep-link, secciones repetidas, accesos desde detalle y ausencia de bucles en la pila simulada.
- No se ejecutó Node CLI en Codespaces ni navegador/DOM real. Botón físico, gestos del dispositivo, deep links en navegador real y Forward real quedan diferidos a Beta; no se presentan como ejecutados.

Archivos funcionales: `navigationHistory.js` (nuevo), `ui.js`, `main.js`, `navigation.js`.
Pruebas/documentación: `Services/Test/NavigationBackHistory.js` (nuevo), `Services/Test/README.md`, `Tareas_pendientes_parte5.txt`.
`ChangesLogs.txt` no se modificó por el estado de rotación documental ya identificado; no se agregó contenido al registro acumulativo sin preparar su rotación sin pérdida.

Publicación:
- Se publicaron commits secuenciales por archivo mediante la API de contenidos; no se reescribió historial ni se modificó la rama base.
- HEAD verificado antes de checkpoint: `a112e49f5c947cdcbd911a1105873a9da7b152db`.
- AUG-069 sigue EN PROGRESO. No iniciar AUG-070.

Siguiente iteración: completar la revisión de las rutas de ida/vuelta restantes y la matriz de deep link/búsqueda/origin, y corregir cualquier inconsistencia local reproducible. Mantener una sola tarea activa.
================================================================================


================================================================================
AUG-069 — ITERACIÓN 2 — 2026-11-11 — NORMALIZACIÓN DE DIMENSIONES OPCIONALES EN FALLBACK
Estado: EN PROGRESO. Se corrigió una duplicación reproducible de historial durante la reconstrucción de una vista de destino.
Rama: GPSpedia2.2.5_work. HEAD de partida: 333462fdb6eaa51bc62d7f73db8a890a0e8cfc76. Rama base: GPSpedia2.2.5 (sin modificaciones; aheadBy 1051, behindBy 0).

Hallazgo:
- navigateBackToState() reemplaza la entrada actual cuando el destino no coincide con el estado anterior y después invoca renderNavigationTarget_().
- Algunos renderizadores completan dimensiones opcionales omitidas en el destino con null (por ejemplo, versionEquipamiento).
- sameNavigationState() distinguía propiedad ausente de propiedad presente con valor null. La reconstrucción podía interpretarse como una navegación nueva y ejecutar pushState después del replaceState, dejando una entrada redundante.

Corrección:
- navigationHistory.js: sameNavigationState() considera equivalentes ausencia y null para campos opcionales; los valores seleccionados diferentes siguen distinguiéndose.
- Services/Test/NavigationBackHistory.js: se añade una regresión que reproduce el fallback y la normalización de versionEquipamiento; la suite pasa de 17 a 18 escenarios.
- Services/Test/README.md y Tareas_pendientes_parte5.txt actualizados.
- Auditoría.txt registra H-AUD-069-001 con evidencia, impacto y criterio de corrección.
- ChangesLogs.txt no se modifica por la rotación documental pendiente; no se agrega contenido al registro acumulativo.

Validación:
- Regresión aislada de comparación y reconstrucción: 3/3 PASS con Node v22.16.0.
- No se ejecutó la suite completa 18/18 ni el comando Node CLI en Codespaces. No se ejecutaron pruebas DOM/navegador real; estas últimas permanecen diferidas a Beta.
- La rama base no se modificó.

Siguiente acción: continuar la matriz de rutas de ida/vuelta y deep links, manteniendo AUG-069 como única tarea activa. No iniciar AUG-070.
================================================================================


================================================================================
AUG-069 — ITERACIÓN 3 — 2026-11-11 — CIERRE DE ANCESTRY Y ESTADO DE SECCIONES
Estado: EN PROGRESO. Se detectaron y corrigieron dos inconsistencias adicionales al recorrer las rutas de ida/vuelta.
Rama: GPSpedia2.2.5_work. HEAD de partida: 557b684ee42872fbad7bc61b0ced7291d597272c.

Correcciones:
- navigationHistory.js: navigateBackToState() prioriza targetState.previousState como metadata antecesora al reemplazar por fallback. La metadata del estado actual se usa solo si el destino no trae antecesor propio.
- ui.js: mostrarSeccion() sincroniza state.navigationState con la sección activa y conserva el antecesor tomado de History API. Evita que los renderizadores posteriores de catálogo capturen una vista profunda obsoleta como destino de retorno.
- Services/Test/NavigationBackHistory.js: suite ampliada de 18 a 21 escenarios; incluye ancestry de fallback, contrato de sincronización de secciones y deep links con caracteres reservados/escapes inválidos.
- Services/Test/README.md, Tareas_pendientes_parte5.txt y Auditoría.txt actualizados.

Validación:
- Pruebas nuevas agregadas; ejecución completa pendiente. No se afirma 21/21 PASS.
- No se ejecutó navegador real, botón físico ni gestos nativos; quedan para Beta.
- Sin cambios en rama base ni datos productivos.

Siguiente acción: ejecutar la suite completa en entorno Node, revisar todos los estados de ida/vuelta, corregir cualquier fallo local y cerrar AUG-069 como COMPLETADA CON VALIDACIÓN DIFERIDA únicamente cuando las pruebas locales estén aprobadas.
================================================================================


================================================================================
AUG-069 — CIERRE — 2026-11-11 — COMPLETADA CON VALIDACIÓN DIFERIDA
HEAD de partida de esta fase: 1b82c1274e257601eec93848d585d3d7691ce5e0.
Resultado:
- La operación central de retroceso se mantiene para niveles de catálogo y búsqueda.
- El fallback conserva el antecesor explícito del destino, no metadata de una vista profunda obsoleta.
- mostrarSeccion() sincroniza state.navigationState con History API y conserva el antecesor al entrar o restaurar una sección.
- Se amplió NavigationBackHistory a 21 escenarios; Services/Test/README.md refleja el alcance.

Validación local:
- NavigationBackHistory: 21/21 PASS en runtime V8 adaptado, ejecutando las funciones reales de navigationHistory.js y search-utils.js y las verificaciones de contrato de ui.js, main.js y navigation.js.
- mostrarSeccion(): compilación y ejecución aislada PASS con History simulado; se verificaron el estado en memoria, el estado de History y el antecesor.
- Parsing V8: navigationHistory.js, main.js, navigation.js y search-utils.js PASS; el bloque modificado de mostrarSeccion() compiló y ejecutó correctamente.
- Revisión del diff: siete archivos de AUG-069 más los registros de la rotación de ChangesLogs; sin cambios funcionales ajenos a la tarea.
- No se ejecutó Node CLI del Codespace ni navegador real.

Validación diferida a Beta:
- Botón físico Atrás, gestos nativos, Forward real y deep links en navegador/dispositivo.
- No bloquean el cierre local según NORMAS_DESAROLLO.md.

Documentación:
- Tareas_pendientes_parte5.txt: AUG-069 pasa a COMPLETADA CON VALIDACIÓN DIFERIDA.
- Auditoría.txt: adenda de cierre para H-AUD-069-001 y H-AUD-069-002.
- ChangesLogs.txt: rotación exacta de 180542 caracteres en dos partes; reconstrucción verificada sin pérdida; manifiesto en ChangesLogs_Archive/manifest.md.
- Rama base GPSpedia2.2.5 intacta. No se inicia AUG-070 dentro de esta tarea; queda como siguiente tarea del backlog.
================================================================================


================================================================================
AUG-070 — ITERACIÓN 1 — 2026-11-12 — CIERRE SECUENCIAL POR CAPA EFECTIVA
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. Rama: GPSpedia2.2.5_work. HEAD antes de este checkpoint: fe8543da8f78c9962c4f0b29700c8ae5d90eeb89. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.

Cambios:
- overlayHistory.js: handlePopState() retira una sola entrada superior por evento. Si el estado destino omitió varias capas, conserva las inferiores y publica un estado de continuación. Los cierres manuales explícitos sobre un padre mantienen su comportamiento de cascada LIFO. Se añade selectTopmostOverlay(), que compara z-index efectivo, orden de apertura y orden DOM.
- main.js: el App Shell selecciona la capa visible superior entre menú, lightbox, info-modals, aviso legal y modal de detalle. Solo ejecuta la limpieza del reproductor/iframe cuando el modal de detalle es la capa que se cierra. Se elimina el recorrido que ocultaba todos los info-modals en el mismo evento.
- ui.js: el acuerdo legal abierto desde el aviso obligatorio recibe una capa visual superior al aviso, para que Atrás cierre primero el acuerdo y conserve el aviso.
- users.html: modales de perfil y administración se registran en la pila compartida; Atrás cierra una sola capa y conserva las restantes. Se retira el forEach que cerraba todos los modales.
- Services/Test/OverlayHistoryStack.js: 19 escenarios; Services/Test/README.md documenta ejecución y alcance. Backlog, auditoría y ChangesLogs actualizados.

Validación local:
- OverlayHistoryStack: 19/19 PASS en runtime V8 adaptado, ejecutando overlayHistory.js real, History simulado y comprobaciones de contrato de main.js, ui.js y users.html.
- ReplacedImagesLightboxHistory: 6/6 PASS con overlayHistory.js y ui.js reales; el lightbox se cierra primero y conserva visible la ficha padre.
- Parsing V8: main.js completo PASS; módulo de users.html PASS; bloque legal modificado de ui.js PASS.
- Revisión de cambios desde el HEAD previo: nueve archivos y solo el alcance AUG-070; ChangesLogs.txt quedó en 2616 caracteres, lejos del umbral de rotación.
- No se ejecutó Node CLI, DOM/navegador real, botón físico ni gestos nativos.

Validación diferida a Beta:
- Confirmar interacción visual real y stacking contexts en navegador/dispositivo, retroceso físico y gestos nativos. No bloquean el cierre local según NORMAS_DESAROLLO.md.

Siguiente acción: AUG-070 cerrada. AUG-071 permanece pendiente; no se inicia en esta iteración.
================================================================================


================================================================================
AUG-070 — ADENDA DE VALIDACIÓN FINAL — 2026-11-12
HEAD previo a esta adenda: 96fd13027d5a455c4a32e2d9d5436603ae633fb5.

Se amplió la suite Services/Test/OverlayHistoryStack.js con una comprobación explícita de que el lightbox (z-index 2200) prevalece sobre el modal de detalle (z-index 1600), y otra que verifica que el reproductor/iframe solo se detiene o elimina cuando el detalle es la capa superior que se cierra. Resultado final: **19/19 PASS** en runtime V8 adaptado. ReplacedImagesLightboxHistory.js: **6/6 PASS**. Parsing V8: main.js completo, módulo de users.html y bloque legal modificado de ui.js: PASS. README, backlog, auditoría y ChangesLogs reflejan 19/19. Esta adenda no modifica código funcional; las pruebas DOM/navegador real, botón físico y gestos nativos siguen reservadas para Beta.
================================================================================


================================================================================
AUG-071 — ITERACIÓN 1 — 2026-11-12 — UNIFICACIÓN DEL MENÚ Y CICLO DE VIDA DE MODALES
Estado: EN PROGRESO. HEAD de partida: fbbbfbb76926222b68551e65380f21371c90aa94. Rama: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1; sin divergencia).
Alcance implementado:
- overlayHistory.js expone has(id) para consultar identidad sin mutar la pila.
- main.js registra el menú y los modales visibles en la pila compartida; el popstate del menú delega el cierre al gestor. Los registros personalizados se reconocen sin duplicarlos y conservan su callback al reemplazar un modal.
- ui.js registra el menú de forma idempotente y agrega closeSideMenuAndRun(), que espera el popstate de cierre antes de abrir la vista destino. setupModal y los cierres de Inbox/administración/contact-form usan la entrada identificada.
- Las vistas audit-drive y replaced-images asignan callbacks que invalidan generaciones; el cierre de imágenes reemplazadas también cierra el lightbox hijo.
- main.js serializa navegación desde el menú hacia Inbox, Dashboard, Changelog, DevTools y secciones.
- Nueva suite Services/Test/OverlayMenuModalHistory.js (12 escenarios) y README actualizado.
Validación en esta iteración: revisión estática y pruebas de contrato preparadas; la ejecución literal Node CLI y navegador real aún no se han ejecutado. No se modificó la rama base ni endpoints/deployments/datos productivos.
Siguiente acción: revisar transiciones asíncronas y cierres directos, ejecutar el harness disponible, corregir hallazgos locales y completar evidencia de AUG-071 antes de cerrar.
================================================================================
