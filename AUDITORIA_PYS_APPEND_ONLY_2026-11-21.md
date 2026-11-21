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
