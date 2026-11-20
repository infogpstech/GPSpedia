# Diseño de concurrencia para aportes de vehículos

Estado: propuesta técnica para `GP-CONCURRENCY-CUT-MULTI-ENTRY-01`  
Fecha: 2026-11-20  
Rama de trabajo: `GPSpedia2.2.5_work`

## Objetivo

Permitir que dos o más usuarios registren aportes al mismo tiempo, tanto en vehículos diferentes como en el mismo vehículo, sin perder datos, asignar dos aportes al mismo espacio ni convertir una operación independiente en una espera global.

El alcance incluye cortes, apertura, alimentación, imágenes, datos básicos/modelo del vehículo y edición in-modal del desarrollador.

## Hallazgos confirmados

1. `LockService.getUserLock()` solo coordina ejecuciones del mismo usuario. No protege el mismo vehículo frente a usuarios distintos.
2. `findNextAvailableCutSlot_` consulta las columnas libres y las operaciones `pending`, pero la lectura y el registro de la reserva no forman una operación atómica entre usuarios.
3. `handleAddSupplementaryInfo` carga imágenes antes de adquirir el lock de usuario. El plan se recalcula después, por lo que una colisión puede dejar un archivo cargado sin asociación de negocio.
4. `persistSupplementaryInfoValues_` escribe/revierte en bloque las diez columnas 33–42. Una reversión basada en una instantánea antigua puede restaurar valores ajenos.
5. `Idempotencia` tiene seis columnas y es específica del flujo de cortes. No representa de forma completa apertura/alimentación ni la conservación de aportes fuera de los tres espacios visibles.
6. ADMIN ya deriva las acciones de aporte a WRITE. No debe duplicarse la lógica en los handlers ADMIN heredados.
7. La política de Coordinator declara recursos `CORTES` para algunas acciones, pero los handlers efectivos WRITE `addOrUpdateCut` y `addSupplementaryInfo` no adquieren una lease de Coordinator para toda la operación. El único uso localizado dentro de la preparación suplementaria es la lease independiente `ensureSupplementaryVehicleFolder`. Por tanto, no atribuir la carrera actual a una lease global efectivamente adquirida por esos dos handlers.

## Restricciones

- Cumplir §15 de `NORMAS_DESAROLLO.md`: no resolver escrituras ordinarias con un ScriptLock global, una lease global de larga duración o esperas que serialicen vehículos independientes.
- No depender de `UserLock` como exclusión por vehículo.
- No borrar ni reordenar registros de operaciones para liberar espacios.
- No marcar una imagen como vinculada hasta que exista una asociación durable verificable.
- Un reintento conserva el mismo `opId` y la misma huella; un mismo `opId` con otro contenido se rechaza.
- Los datos existentes en `Cortes` siguen siendo la base heredada y deben continuar visibles durante una migración gradual.

## Dirección de arquitectura que debe validarse

Adoptar un registro append-only de eventos de aportes por vehículo y una proyección de lectura:

- Cada aporte aceptado genera un evento durable con identificador de operación, vehículo, tipo de aporte, huella del contenido, actor, fecha, datos normalizados y referencias Drive ya verificadas.
- Los eventos no se actualizan ni eliminan para «reservar» o «liberar» slots. Las correcciones se representan con eventos de sustitución/revisión que referencian el evento anterior.
- La asignación de los tres espacios visibles de corte y alimentación se calcula de forma determinista al leer: datos heredados primero y después eventos válidos en orden durable de registro. Los eventos que excedan la capacidad permanecen como candidatos revisables; no se descartan ni se anuncian como aplicados.
- El mismo `opId` con la misma huella se proyecta una sola vez aunque una respuesta perdida haya producido más de un intento físico de append. El mismo `opId` con huellas distintas se pone en conflicto y no se proyecta.
- La carga Drive se prepara con clave idempotente. El archivo solo pasa a estado vinculado cuando el evento durable confirma la relación; si falla la confirmación, permanece recuperable/revisable en el ledger de cargas.
- CATALOG combina la fila heredada de `Cortes` con la proyección de eventos, de modo que la ficha actual siga usando el mismo contrato de objeto.
- La edición in-modal del desarrollador debe generar eventos de sustitución/edición para campos administrados por el registro de aportes. No debe sobrescribir silenciosamente eventos previos ni borrar evidencia.

Esta dirección evita una reserva mutable de slot compartida. Debe confirmarse el comportamiento de append concurrente de Google Sheets con pruebas aisladas y diseñar una estrategia explícita de deduplicación y recuperación antes de habilitarla en producción.

## Secuencia de implementación

1. Crear pruebas puras de normalización, deduplicación por `opId`, orden estable, proyección de tres slots y desbordamiento a candidatos.
2. Definir y probar el esquema versionado del ledger; la creación/migración de la hoja será una acción explícita de mantenimiento, nunca una inicialización improvisada dentro de cada solicitud.
3. Implementar append/recovery idempotente para cortes de vehículos existentes; conservar el flujo de alta de vehículo nuevo y asignación global de ID.
4. Integrar la proyección en CATALOG y validar que búsqueda, modal de detalle, compartir e impresión reciban los mismos campos.
5. Migrar apertura/alimentación al mismo registro, eliminando escrituras y rollbacks de rangos completos.
6. Adaptar la edición in-modal de desarrollador a eventos de sustitución con control de versión/conflicto.
7. Probar intercalados reales simulados: vehículos distintos, mismo vehículo, slots distintos, mismo slot lógico, capacidad llena, mismo `opId`, huella distinta, fallo parcial Drive/Spreadsheet y recuperación tras respuesta perdida.
8. Ejecutar regresión completa; solo entonces cerrar P0 y continuar con P1.

## Matriz mínima de aceptación

| Escenario | Resultado obligatorio |
|---|---|
| Dos usuarios, vehículos distintos | Ambos aportes se registran sin esperar ni bloquearse entre sí |
| Dos usuarios, mismo vehículo, espacios disponibles | Ambos aportes aparecen una sola vez en espacios distintos |
| Dos usuarios, mismo vehículo y misma capacidad agotándose | Ningún aporte se sobrescribe; el excedente queda como candidato |
| Mismo `opId`, misma huella, reintento simultáneo | Una sola contribución lógica |
| Mismo `opId`, huella diferente | Conflicto explícito; no se proyecta |
| Imagen subida, evento no confirmado | Archivo recuperable/revisable; no se marca vinculado |
| Error al guardar un campo suplementario | No se restauran columnas modificadas por otro usuario |
| Edición de desarrollador sobre aporte existente | Evento de sustitución auditable; conflicto explícito si cambió la versión |

## Estado

Este documento fija la dirección de diseño, no declara implementada la solución. P0 permanece abierta hasta completar integración y pruebas.


## Hallazgo adicional de idempotencia suplementaria

- La UI de apertura y alimentación genera un `opId` local con `createSuggestionOperationId_` y lo envía a `addSupplementaryInfo`.
- WRITE permite la clave `opId` en el payload, pero `buildSupplementaryInfoPlan_` no calcula ni valida una huella de operación y `handleAddSupplementaryInfoLocked` no consulta ni registra un ledger de idempotencia.
- Por ello, un reintento después de perder la respuesta no recupera el resultado original: puede devolver conflicto porque el primer intento ya ocupó el espacio, aunque la escritura haya sido exitosa. La clave de carga Drive evita duplicar el archivo, pero no vuelve idempotente la mutación de texto/catálogo.
- La implementación del ledger de aportes debe unificar idempotencia para corte, apertura y alimentación. El cliente debe conservar el mismo `opId` y contenido tras un timeout; el servidor debe devolver el resultado ya confirmado para el mismo hash y rechazar el mismo `opId` con contenido distinto.


## Compatibilidad de catálogo y edición in-modal

- El modal de detalle consume objetos de `getCatalogData` con campos fijos `tipoCorte1..3`, `apertura`, `cableAlimen..3` e imágenes. Por tanto, la proyección debe producir ese mismo contrato; no se debe obligar al frontend a conocer la estructura interna del ledger.
- `handleGetCatalogData` usa la caché `catalog_data_v2`, pero la actualización posterior al aporte ya fuerza `getCatalogData({forceRefresh:true})`. La proyección se debe aplicar antes de guardar la nueva instantánea de catálogo, y las lecturas normales deben invalidarse/versión-controlarse para que no sobreviva una proyección antigua.
- La edición in-modal de ADMIN usa `updateVehicleField` para campos de texto/modelo y `uploadAdminImage` para imágenes. Actualmente escribe directamente en `Cortes`; el texto usa `expectedCurrentValue` y el reemplazo de imagen mantiene su propio ledger compensatorio.
- Cuando un campo visible provenga de un evento, la edición de desarrollador debe identificar el evento/version que está reemplazando. Debe crear un evento de sustitución o materializar de forma verificable el valor y marcar el evento previo como sustituido; no basta con escribir la columna heredada porque la proyección podría volver a mostrar el aporte anterior o duplicarlo.
- La proyección debe incluir metadatos de origen (eventId y versión/huella por campo) para que el modal de desarrollador pueda enviar la precondición correcta. Los usuarios que agregan aportes no deben poder sobrescribir esos campos ni modificar eventos ajenos.


## Estado de implementación — 2026-11-20 (parcial)

La dirección de arquitectura anterior ya tiene implementación parcial en GPSpedia2.2.5_work; no debe seguir leerse como una propuesta todavía no iniciada.

### Implementado en la rama de trabajo

- AportesVehiculo usa un esquema versionado que se prepara mediante mantenimiento explícito (migrateVehicleContributionsSchema); las solicitudes ordinarias fallan de forma cerrada si el ledger no está listo.
- WRITE registra eventos append-only de corte, apertura y alimentación. CATALOG combina la fila heredada con la proyección del ledger y conserva el contrato de ficha existente.
- Cortes de vehículos existentes con opId, sin VIN y sin vehicleData, entran al ledger antes del lock de compatibilidad. Apertura/alimentación con opId también entran al ledger.
- Los eventos excedentes se conservan como candidatos. La asignación visible se calcula en orden durable de fila; no se reserva ni se sobrescribe un slot mediante lock.
- Mismo opId y mismo contenido se deduplica lógicamente hacia un evento canónico, incluso si existen filas físicas repetidas. Mismo opId con vehículo/tipo/hash/payload incompatible genera conflicto; la proyección no aplica arbitrariamente ninguno.
- checkOperation reconoce eventos de AportesVehiculo, verifica la huella cuando se proporciona y devuelve el resultado recuperado. La UI informa cuando un corte, apertura o alimentación queda como candidato y no como campo aplicado.
- El harness WriteContributionAppendConcurrency.mjs simula intercalados en el punto de append para vehículos diferentes, slots distintos, reintento idéntico, conflicto de opId y capacidad de apertura/alimentación.

### Límites que mantienen P0 abierta

- El harness simula que cada appendRow es una operación de append indivisible. No es una prueba de concurrencia contra el servicio real de Google Sheets ni sustituye la verificación de sus garantías de append bajo dos ejecuciones Apps Script simultáneas.
- En una carrera con mismo opId y contenido diferente, una solicitud puede haber recibido éxito antes de que la otra anexe el conflicto. La proyección posterior suprime ambos eventos y conserva candidatos; falta mejorar la señal de reconciliación de esa primera respuesta.
- El corte append-only solo cubre actualmente vehículo existente con opId, sin VIN y con vehicleData nulo. Casos con VIN, metadatos de vehículo, alta nueva o solicitud sin opId aún conservan parte del handler heredado.
- ImageUploadLedger sigue siendo una tabla mutable de una fila por token. La ruta WRITE uploadImageToDriveWithShortLedgerLocks_ todavía usa LockService.getScriptLock().waitLock(5000) para leer/escribirla. No quitar ese lock sin reemplazar primero el mecanismo de idempotencia y reconciliación: podría crear colisiones de fila o asociar archivos distintos al mismo token.
- ADMIN mantiene su lector/reconciliador del ImageUploadLedger legado. Cualquier migración de cargas debe conservar compatibilidad y hacer visibles los archivos pendientes/no referenciados como candidatos.
- La edición in-modal del Desarrollador (updateVehicleField / uploadAdminImage) todavía escribe por la ruta heredada; faltan metadatos de origen/versionado y eventos de sustitución para que una edición no sea revertida por la proyección.

### Regresión verificada

HEAD 4f54e1ca71a21857a3e23e5d7d1a98ff3a77fe51: 230 suites, 2,843 pruebas aprobadas, 0 fallos; health de servicio read-only SUCCESS. La rama base GPSpedia2.2.5 permanece intacta en d9acc68d889985c2e2f42fe3a02e502efc86ead1. No se desplegó el código de servicio ni se modificaron datos productivos.

### Próximas fases

1. Verificar las garantías reales de append de Sheets o elegir una primitiva durable que no requiera lock global.
2. Migrar ImageUploadLedger a un journal append-only con proyección/reconciliación compatible con ADMIN; retirar waitLock(5000) solo después de probar reintentos, duplicados y archivos huérfanos.
3. Ampliar cortes existentes a VIN y vehicleData, manteniendo validación global de VIN sin serializar vehículos independientes.
4. Hacer que checkOperation y la UI reconcilien conflictos que aparezcan después de la primera respuesta.
5. Migrar edición in-modal de Desarrollador a sustituciones versionadas/auditables.
6. Completar intercalados y fallos parciales Drive/Sheets; mantener P0 abierta hasta cubrir toda la matriz.

## Avance de migración — 2026-11-20

WRITE ahora anexa transiciones reserved, pending y linked a ImageUploadEvents durante la carga. El adaptador valida y proyecta el mismo contrato del journal y registra errores secundarios sin revertir una carga que ya se completó.

**Límite deliberado de esta fase:** ImageUploadLedger sigue siendo la fuente compatible con ADMIN y WRITE todavía conserva ScriptLock.waitLock(5000) para sus reservas/actualizaciones. El diario es todavía secundario; no debe describirse como fuente de verdad ni considerarse una migración terminada.

Prueba ImageUploadEventJournal: 7/7 PASS. CI 44810419884 SUCCESS: 231 suites, 2,850 pruebas, 0 fallos. Health read-only del mismo HEAD SUCCESS.

Siguiente paso: adaptar ADMIN para reconciliar tanto los eventos append-only como los registros heredados, definir precedencia/compatibilidad de proyección y probar recuperación antes de retirar el ledger mutable o sus locks.