# Auditoría PyS: creación de problemas, imagen y serialización

Fecha: 2026-11-21  
Rama: `GPSpedia2.2.5_work`  
HEAD auditado: `d77a59bca8d92a531832219d1a6918906f401735`

## Alcance

Se revisó `handleAddProblem`, `PysOperations`, los helpers de ID/lookup, el almacenamiento Drive, el flujo de recuperación y los consumidores de PyS. También se inspeccionaron `JS/Frontend/pys-data.js`, los tests de creación/recuperación/relaciones y el orden P2.2b del backlog.

## Estado actual

- La validación de payload, esquema, referencias de vehículos y preflight de replay ocurre antes de Drive.
- La creación del archivo, metadata `UPLOAD_PENDING`, comprobación de carpeta/permisos y verificación de archivos pendientes ya ocurre fuera de ScriptLock.
- El lock global sigue cubriendo relectura de operaciones, asignación de `problemId`, escritura/actualización de `PysOperations`, append de la fila PyS, confirmación y varias rutas de recuperación. En compensación, se libera para Drive y se vuelve a adquirir para restablecer el ledger.
- `PysOperations` tiene una fila mutable por operación (ocho columnas); `writePysOperation_` escribe mediante `setValues` a una fila calculada con `getLastRow()+1` cuando es una operación nueva y modifica el estado in-place para `PENDING`, `UPLOAD_PENDING`, `LINKED` y `RECOVERY_REQUIRED`.
- `readPysOperations_` rechaza cualquier duplicado físico de `opId` o `problemId`; no distingue reintentos idénticos de colisiones de payload.
- `getPysNextId_` calcula `maxSuffix+1` leyendo PyS y PysOperations. Fuera del lock, dos operaciones distintas podrían reservar el mismo `isue-###`.
- `findPysRowsById_` devuelve todas las coincidencias; `validatePysRecords_` rechaza IDs duplicados sin comparar el contenido de las filas. `handleGetPysData` entrega todas las filas físicas.
- `handleAddSolution`, `handleAddPrevention`, `handleAddVehicleToProblem` y `handleRemoveVehicleFromProblem` usan `withPysMutationLock_`. Son mutaciones independientes de la creación con imagen y no deben quedar alteradas por esta fase.

## Riesgos si se retira el lock sin cambios

1. Dos altas simultáneas pueden calcular el mismo `problemId`.
2. Dos reintentos con el mismo `opId` pueden crear dos filas físicas de operación o sobrescribirse si ambos usan `getLastRow()+1`/setValues.
3. Dos reintentos que comparten una operación pendiente pueden anexar filas PyS duplicadas o competir por el mismo estado.
4. Los lectores actuales rechazan IDs duplicados o pueden devolver filas físicas repetidas.
5. La recuperación actual asume una única fila de operación y usa lock reacquirido para limpiar estados después de compensar Drive.

## Estrategia de implementación

- Reutilizar `IdentifierSequenceReservations` y `getNextFormulaBasedId_` para reservar `isue-###` de forma append-only, sin inventar una nueva capa de IDs. Agregar únicamente el patrón backend PyS `isue-`/padding 3 para la columna `pys.id_problem`, y permitir un sufijo mínimo que incluya reservas legacy de PysOperations.
- Convertir la creación de una operación nueva en `appendRow` de una fila completa de `PysOperations`; confirmar la fila real por `opId` reservado. Los cambios de estado continúan limitados a la fila canónica mientras se mantiene el ledger existente.
- Proyectar la primera fila por `opId` si las copias tienen el mismo `payloadHash`; rechazar un mismo `opId` con hash distinto y `problemId` repetidos entre operaciones distintas.
- Si dos operaciones idénticas compiten, conservar la fila canónica y su archivo; eliminar el archivo de la fila perdedora solo después de confirmar que no es el archivo canónico ni está referenciado por PyS.
- Permitir duplicados físicos de `problemId` únicamente cuando las diez columnas sean idénticas; lectores PyS proyectan la primera fila y los conflictos se detienen para revisión.
- Mantener el ciclo de recuperación conservador: si no puede confirmarse la referencia o la compensación, conservar y marcar el archivo. No hacer rollback destructivo por una lectura incierta.
- No cambiar los handlers de edición/asociación de vehículos en esta fase; permanecen con su lock hasta una auditoría específica de mutaciones sobre filas existentes.

## Pruebas requeridas

- Reintento idéntico, opId reutilizado con hash distinto, dos opIds concurrentes, duplicados físicos idénticos y contradictorios.
- Reserva de IDs PyS intercalada con reservas previas y PysOperations legacy.
- Confirmación por ID de la fila de operación y de la fila PyS.
- Recuperación de UPLOAD_PENDING, LINKED y RECOVERY_REQUIRED; limpieza de archivos solo con referencia comprobada.
- Lectura de PyS sin duplicados lógicos y feed incremental con el registro canónico.
- Validación Beta de concurrencia real Apps Script/Sheets/Drive pendiente; no desplegar ni tocar producción.


## Progreso de implementación — fase 1 (2026-11-21)

- `getPysNextId_` ahora delega en `getNextFormulaBasedId_`, reutilizando `IdentifierSequenceReservations` y el patrón histórico `isue-###`. Se añadió soporte de sufijo mínimo para considerar reservas legacy de `PysOperations`.
- Las nuevas filas de `PysOperations` se escriben con `appendRow`; la lectura proyecta la primera fila por `opId` cuando el `payloadHash` coincide y rechaza el mismo `opId` con hash distinto o un `problemId` reservado por operaciones diferentes.
- Se separó la búsqueda física (`findPysRowsById_`) de la proyección canónica (`findCanonicalPysRowsById_`). La validación PyS permite filas físicas idénticas y rechaza contenido contradictorio; `handleGetPysData` y el feed de catálogo proyectan la primera fila. Las rutas de aprobación de vídeo y mutación siguen usando lookup físico para rechazar destinos ambiguos.
- Se actualizaron regresiones de allocator, integridad, recuperación y lookup. CI `44867570021` SUCCESS sobre `ce1d7a11b0f011046fb43878bb6c3a391f776002`: 258 suites, 3091 pruebas aprobadas, 0 fallos. Health read-only `44867570032` SUCCESS y Pages `44867569879` SUCCESS.
- **Pendiente en esta tarea:** `handleAddProblem` todavía adquiere ScriptLock para reservar/vincular operación y ejecutar recuperación. No declarar PyS migrado ni retirar el lock hasta resolver el propietario canónico tras reservas concurrentes, el archivo perdedor y los reintentos simultáneos. No se desplegó Apps Script ni se modificaron datos productivos.




## Progreso de implementación — fase 2: conflicto de reservas (2026-11-21)

- Se detectó un caso no cubierto por la proyección first-write-wins: dos filas físicas con el mismo opId y payloadHash, pero con problemId distintos. La lectura anterior ignoraba la segunda fila como duplicado idéntico, aunque ambas reservas podían representar problemas distintos.
- readPysOperations_ ahora rechaza explícitamente ese estado con error de reconciliación. No se elige silenciosamente una reserva ni se continúa con una identidad ambigua.
- Se añadió regresión en JS/Tests/PysCreationIntegrity.js que construye dos reservas con el mismo opId/hash y distintos problemId; confirma que el alta se detiene antes de crear archivos Drive.
- CI del HEAD 9baf0467cf11e4038c9e6312dc769f0b6af4c060: regresión SUCCESS, 258 suites, 3092 pruebas aprobadas, 0 fallos; health read-only SUCCESS. Pages estaba en ejecución al registrar esta nota.
- PyS continúa EN PROGRESO. handleAddProblem conserva ScriptLock. La retirada segura requiere separar la reserva canónica de opId, el propietario del archivo y las transiciones de estado en un ledger/eventos cuya selección first-write-wins sea inequívoca; no se considera suficiente cambiar solo el lock o el append. No se desplegó Apps Script ni se modificaron datos productivos.


### Adenda fase 2 — propiedad de imagen en reservas duplicadas (2026-11-21)

- Se amplió el fail-closed: además de exigir el mismo problemId, las filas físicas repetidas de un opId deben conservar el mismo imageFileId/imageUrl. Si una misma operación apunta a archivos distintos (incluido un archivo ausente frente a uno presente), readPysOperations_ detiene la lectura para reconciliación.
- Regresión añadida: PysCreationIntegrity comprueba que dos reservas del mismo opId/hash/problemId con fileId diferentes se rechazan antes de crear otro archivo.
- CI 44873650200 SUCCESS: 258 suites, 3093 pruebas aprobadas, 0 fallos. Health read-only 44873650247 SUCCESS. Pages 44873650240 estaba queued al registrar.
- La protección no retira el lock: handleAddProblem sigue EN PROGRESO y ScriptLock permanece hasta sustituir el estado mutable de propiedad por un protocolo concurrente probado.

## Cierre de migración lock-free — fase 3 (2026-11-21)

- `handleAddProblem` ya no solicita, espera ni libera `ScriptLock`. La creación ordinaria usa reserva secuencial de `isue-###` mediante `IdentifierSequenceReservations`, y anexa una fila completa de `PysOperations` con `opId`, hash, `problemId`, estado `UPLOAD_PENDING`, `imageFileId` y URL.
- `PysOperations` queda append-only para el flujo nuevo: `writePysOperation_` rechaza escrituras sobre una fila existente. No se actualiza el estado a `LINKED` ni a `RECOVERY_REQUIRED`; el estado lógico de éxito se proyecta desde la existencia y verificación de la fila PyS.
- `readPysOperations_` conserva la primera fila física por `opId`. Duplicados con el mismo hash se proyectan desde la primera reserva aunque difieran en `problemId` o archivo; un hash contradictorio queda contado en la proyección y el handler rechaza el intento que no coincide con el propietario canónico, sin invalidar las operaciones ajenas.
- Si dos reintentos idénticos crean archivos distintos, solo el archivo de la primera reserva es canónico. El perdedor se envía a papelera únicamente después de comprobar que no es la imagen de la reserva canónica ni está referenciado por PyS; ante una lectura incierta se conserva y marca para reconciliación.
- Antes de anexar PyS se comprueba que la imagen no esté ya vinculada a otro problema. Si el append o su confirmación falla después de reservar la imagen, el recurso se conserva; un reintento verifica la reserva y recupera la fila sin crear otra imagen. Las referencias históricas `PENDING` sin imagen no se mutan automáticamente y requieren recuperación manual.
- Las rutas de mutación de solución, prevención y relaciones de vehículos siguen fuera de este alcance y conservan su mecanismo actual. No se modificó la aprobación de vídeos.
- Pruebas focalizadas: `PysCreationIntegrity` 56/56 y `PysImageStorageRecovery` 22/22 PASS dentro de la suite; `FeedbackPysPendingImageVerificationOutsideLock`, `FeedbackPysPostCommitOutsideLock`, `FeedbackPysRollbackOutsideLock`, `P2PysImageUploadOutsideLock` y `FeedbackLockFastFail` aprobadas.
- CI `44875140437` SUCCESS: 258 suites, 3094 pruebas aprobadas, 0 fallos; health read-only `44875140445` SUCCESS; Pages `44875140584` SUCCESS. HEAD de validación: `18ffcc6a9f7c23b54b9d3ef9fc7bc506a8fe1164`.
- **Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.** La concurrencia real de `appendRow`, la recuperación Drive/Sheets y el orden de llegada de reservas deben comprobarse en un proyecto Apps Script/Spreadsheet/Drive aislado. No se desplegó Apps Script ni se modificaron datos productivos.


## Auditoría separada — mutaciones PyS de solución, prevención y relaciones (2026-11-21)

- Se confirmó que las cuatro operaciones estaban protegidas por ScriptLock global. El lock serializaba correctamente sus lecturas y escrituras, pero ampliaba la sección crítica a operaciones FEEDBACK no relacionadas.
- Coordinator ya tenía contratos explícitos addSolution, addPrevention, addVehicleToProblem y removeVehicleFromProblem. Se sustituyó el ScriptLock local por leases compartidas FEEDBACK con esos nombres; no se usa UserLock ni fallback local.
- Las mutaciones siguen siendo materializaciones in-place protegidas por lease (no se reclasifican como append-only). Se conserva el contrato de first-write-wins, reintento idempotente, validación de IDs, lectura de valor persistido y RBAC de desvinculación.
- La suite PysVehicleRelationIntegrity, antes fuera del runner principal, ahora forma parte de CI: 19/19 PASS. PysCreationIntegrity 56/56; PysImageStorageRecovery 22/22; CI 44906612421 SUCCESS: 259 suites, 3,129 pruebas, 0 fallos.
- Concurrencia real entre proyectos, expiración/contención de leases y fallos de Spreadsheet quedan diferidos a Beta aislada. No se desplegó ni se modificaron datos productivos.


## Adenda — corrección de prevalidación y regresión de relaciones (2026-11-21)

- La ejecución CI 44906149739 expuso problemas de cobertura: el test de navegación comprobaba el estilo de tarjeta existente y el harness de relaciones no aislaba correctamente el helper de rol; además, el caso de alta preasociada evidenció que handleAddProblem inicializaba PysOperations antes de rechazar un vehículo inexistente.
- Se corrigió la extracción del helper en la prueba y se ordenó handleAddProblem para validar primero los IDs de Cortes y después inicializar/leer PysOperations. No se alteró el contrato de escritura ni el flujo de archivos.
- CI final 44907336819 SUCCESS: 259 suites, 3,129 pruebas aprobadas, 0 fallos. PysModalNavigation 10/10; PysCreationIntegrity 56/56; PysVehicleRelationIntegrity 19/19; PysImageStorageRecovery 22/22. Health read-only 44907336832 y Pages 44907336274 SUCCESS.
- La corrección es local y no sustituye la Beta aislada de Spreadsheet/Drive/Coordinator. No hubo deployment ni cambios en datos productivos.
