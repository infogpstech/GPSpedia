# GPSpedia — Checkpoint de continuidad

Fecha de actualización: 2026-11-20  
Repositorio: `infogpstech/GPSpedia`  
Rama de trabajo autorizada: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5`  
Fuente normativa única: `NORMAS_DESAROLLO.md`

## Rotación e historial

El checkpoint acumulado anterior se conserva íntegro en:
- `Checkpoint_Archive/checkpoint_2026-11-20_parte_004.md`
- Manifiesto: `Checkpoint_Archive/manifest.md`

La copia fue releída desde GitHub y comparada carácter por carácter con el original (179600 caracteres Unicode). No se truncó ni alteró el archivo histórico.

## Estado Git verificado

- HEAD de trabajo validado tras la última actividad local: `e05be7562135e18178eb9eed8f57e6196af664a3`.
- Rama base `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; comparación con la rama de trabajo: 0 commits por delante de base, 5668 commits de trabajo por delante; la base no se modificó.
- No se desplegó Apps Script ni se modificaron Spreadsheet/Drive productivos.
- Los cambios de documentación posteriores al HEAD de código son commits separados en la misma rama de trabajo; no alteran la base.

## Actividades locales cerradas

### 1. Reemplazo de imágenes ADMIN — COMPLETADO CON VALIDACIÓN BETA DIFERIDA

- `uploadAdminImage` registra la imagen en `ImageUploadEvents` y crea un evento `vehicle_update` en `AportesVehiculo`.
- El flujo no usa `AdminImageUploads` como ledger mutable, no retiene ScriptLock en la operación ordinaria y no escribe directamente en `Cortes`.
- Captura `expectedCurrentValue` y `expectedSourceEventId`; la URL anterior se toma de la versión lógica esperada, porque la fila materializada puede ir detrás de la proyección CATALOG.
- Verifica archivo Drive y reutiliza `operationKey`; enlaza el journal después del evento de vehículo y conserva archivos/eventos ante fallos parciales para revisión.
- La recuperación consulta currentImageUrl/currentSourceEventId desde la proyección CATALOG y la UI conserva el eventId fuente para posteriores reemplazos.
- Pruebas focalizadas: AdminImageUploadDriveIsolation 7/7; AdminImageUploadLinkedRecoveryIsolation 6/6; AdminImageUploadCompensationIsolation 8/8; ADMIN compensación de reemplazos in-modal 9/9.
- CI 44828376102 SUCCESS: 237 suites, 2942 pruebas aprobadas, 0 fallos; node --check PASS. Health read-only y Pages SUCCESS.
- Auditoría.txt registra el hallazgo como CORREGIDO LOCALMENTE. Beta AUG-160/AUG-159 sigue pendiente.

### 2. Retiro de UserLock para aportes a vehículos existentes — COMPLETADO LOCALMENTE

- `getWriteContributionLock_` fue eliminado de WRITE.
- Los aportes a vehículos existentes deben incluir `opId` estable y se envían directamente al ledger append-only `AportesVehiculo`; la ruta no adquiere UserLock ni ScriptLock.
- Un payload legacy de vehículo existente sin opId falla de forma explícita con `WRITE_OP_ID_REQUIRED`, antes de adquirir un lock.
- El ScriptLock inmediato queda limitado a la asignación secuencial de ID para un vehículo nuevo.
- Se verificaron los consumidores activos: el modal de detalle y `HTML/add_cortes.html` envían/reutilizan opId.
- Pruebas focalizadas: WriteCutPreflightOutsideLock 1/1; MutationLockContention 1/1; WriteContributionAppendConcurrency 7/7; WriteIdAllocatorNonBlocking 5/5.
- CI 44829158327 SUCCESS: 237 suites, 2942 pruebas aprobadas, 0 fallos; node --check PASS. Health read-only y Pages SUCCESS.

## Estado de trabajo pendiente

### P0 — GP-CONCURRENCY-CUT-MULTI-ENTRY-01

El núcleo append-only ya cubre cortes, apertura/alimentación, idempotencia por opId, conflictos de payload, VIN concurrente, candidatos por capacidad y recuperación tardía. No cerrar el P0 hasta completar los puntos pendientes del registro operativo:

1. Auditar las rutas FEEDBACK/reporte/sugerencia y confirmar sus contratos, idempotencia, manejo de adjuntos y aislamiento respecto de las escrituras WRITE.
2. Verificar el ciclo de imágenes de corte/apertura/alimentación cuando un evento queda como candidato por colisión o capacidad llena: referencia durable en AportesVehiculo/ImageUploadEvents, estado visible para ADMIN y conservación del archivo sin clasificarlo como materializado.
3. Completar señalización UI de conflictos tardíos para todos los puntos de entrada y no solo el modal de detalle.
4. Completar la regresión focalizada que falte y revisar el asignador de ID nuevo, conservando unicidad numérica sin ampliar el bloqueo a acciones ordinarias.
5. Beta real de appendRow concurrente, fallos parciales Drive/Sheets, pérdida de respuesta y reconciliación ADMIN solo en recursos aislados.

### P1 — GP-UX-RECENT-VIEWED-CACHE-PARALLEL-01

- La corrección inicial inicia la hidratación local antes de mostrar la aplicación, pero no se ha demostrado que el carrusel se pinte con datos cacheados en el primer render.
- Pendiente: asegurar hidratación IndexedDB/cache en paralelo, evitar lecturas duplicadas y añadir pruebas de orden, IndexedDB lento/no disponible y cambio de sesión.

## Beta pendiente y restricciones

- Consultar `lista_beta.txt` y todos sus segmentos. Prioridad de esta fase: AUG-159 (aportes/candidatos ADMIN) y AUG-160 (cargas ADMIN/ImageUploadEvents), más pruebas reales de appendRow, Drive, Spreadsheet y recuperación.
- Ejecutar solo con deployments WRITE/ADMIN de prueba, Spreadsheet/Drive aislados y cuentas autorizadas. Cumplir primero las condiciones de sincronización/fast-forward y árbol limpio de la matriz Beta.
- Safe Apply: preview real, ACL y rollback siguen pendientes; no ejecutar movimientos, renombrados ni borrados reales.
- No desplegar Apps Script, no cambiar endpoints operativos y no tocar datos productivos sin autorización expresa.

## Siguiente paso exacto

Continuar P0 con la auditoría del punto de entrada FEEDBACK/reporte/sugerencia y del ciclo de archivos de aportes candidatos. Mantener los cambios exclusivamente en `GPSpedia2.2.5_work`; actualizar pruebas, Tareas_Activas.md, Auditoría.txt, ChangesLogs.txt y este checkpoint al cerrar cada subactividad.
