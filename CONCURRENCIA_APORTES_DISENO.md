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
