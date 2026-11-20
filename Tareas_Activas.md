# GPSpedia — Tareas activas

Fecha de actualización: 2026-11-20  
Repositorio: `infogpstech/GPSpedia`  
Rama autorizada: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5`  
Fuente normativa única: `NORMAS_DESAROLLO.md`

## Historial y continuidad

El registro acumulado previo a esta rotación se conserva íntegro en:
- `Tareas_Activas_Archive/Tareas_Activas_2026-11-20_pre-rotacion.md`
- Manifiesto y verificación: `Tareas_Activas_Archive/manifest.md`

La copia archivada fue verificada carácter por carácter contra el original. Este archivo es el registro operativo vigente; las tareas históricas y decisiones anteriores no se eliminan.

## Cierre local — reemplazo de imágenes ADMIN (2026-11-20)

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- [x] Migrar `uploadAdminImage` al journal append-only `ImageUploadEvents` y a eventos `vehicle_update` en `AportesVehiculo`.
- [x] Eliminar del handler activo el `ScriptLock`, el ledger mutable `AdminImageUploads` y la escritura directa en `Cortes`.
- [x] Capturar `expectedCurrentValue` y `expectedSourceEventId`; conservar la URL previa lógica desde la proyección versionada, sin compararla con una fila materializada potencialmente desactualizada.
- [x] Reutilizar cargas por `operationKey`, verificar MIME/hash/tamaño/carpeta/metadata Drive y anexar `linked` después del evento de vehículo.
- [x] Mantener historial idempotente de imágenes sustituidas y conservar fallos parciales/archivos no vinculados para revisión.
- [x] Recuperar el estado de imagen desde la proyección vigente de CATALOG y actualizar la versión fuente local de la UI.
- [x] Corregir contratos obsoletos de unicidad y bloqueo; no debilitar las comprobaciones funcionales.
- [x] CI HEAD `9425527a3fb93ddc9256537ff534cea3872e2d7c`: 237 suites, 2,942 pruebas aprobadas, 0 fallos; `node --check` de módulos modificados PASS.
- [x] Health read-only SUCCESS; GitHub Pages SUCCESS.
- [ ] Beta AUG-160: concurrencia real, pérdida de respuesta, file_missing, metadatos alterados, varios fileId por token y fallos parciales Drive/Sheets/journal en recursos aislados.
- [ ] Beta AUG-159: aportes concurrentes, resolución de candidatos, correcciones encadenadas y recuperación ADMIN en Spreadsheet/Drive aislados.
- No se desplegó Apps Script ni se modificaron Spreadsheet/Drive productivos.

## P0 — GP-CONCURRENCY-CUT-MULTI-ENTRY-01

**Estado: EN PROGRESO.** Las rutas append-only y la regresión local cubren parte importante del alcance; no declarar cerrada la tarea hasta completar los puntos locales restantes y después ejecutar Beta.

- [x] Retirar el `UserLock` del fallback de `handleAddOrUpdateCut`. Los vehículos existentes usan append-only y requieren opId; si falta, se devuelve `WRITE_OP_ID_REQUIRED` antes de adquirir un lock. El `ScriptLock` queda solo para asignar el ID numérico de un vehículo nuevo. CI 44829158327: 237 suites/2942 pruebas PASS.
- [x] Confirmar consumidores activos de cortes: modal de detalle y `HTML/add_cortes.html` envían/reutilizan opId estable.
- [x] Auditar FEEDBACK/reporte/sugerencia: `reportProblem` y `suggestCutChange` persisten en Feedbacks y no escriben directamente Cortes/AportesVehiculo; la sugerencia actual se limita a un corte existente. Los IDs `reportId`/`suggestionOperationId` y la huella mantienen idempotencia; el ScriptLock FEEDBACK sigue siendo fast-fail y queda sujeto a revisión §15.
- [x] Añadir conversión explícita desde Inbox: crear un corte para el vehículo del reporte (precargando la sugerencia si existe) o abrir el alta de vehículo nuevo desde el reporte. Ambas rutas reutilizan WRITE/add_cortes, generan `OP-FEEDBACK-{itemId}` estable y marcan el reporte resuelto solo después de confirmar el aporte; si queda candidato, el reporte permanece pendiente. Pruebas InboxUi 87/87 y AddCortesDiagnostics 12/12; CI 237 suites/2943 PASS.
- [ ] Revisar si el ScriptLock fast-fail de FEEDBACK es indispensable para IDs secuenciales/deduplicación bajo §15; conservarlo solo si no existe alternativa append-only segura.
- [x] Conservar imágenes candidatas en `Imagenes_Reemplazadas`: `tipo_registro=candidata_aporte`, `origen_registro=aporte_vehiculo`, `tipo_contenido=aporte_candidato`, `estado=requiere_revision`. El inventario sincroniza candidatos actuales desde CATALOG y resoluciones desde AportesVehiculo; al aceptar/corregir/descartar actualiza a `en_uso`/`cancelada`. No permite marcar en uso ni eliminar mientras está pendiente o referenciada; un candidato descartado solo admite descarga/papelera si el escáner confirma cero referencias. Metadatos Drive se leen fuera del lock; escritura idempotente bajo el lock de esquema. Pruebas AdminReplacedImagesIntegrity 56/56, ReplacedImagesLibraryUX 14/14; CI 237 suites/2943 PASS.
- [ ] Completar la señalización UI de conflictos tardíos en todos los puntos de entrada, no solo en el modal de detalle; no presentar como aplicado un evento que CATALOG mantiene como candidato.
- [ ] Ejecutar regresión focalizada de los escenarios que falten: vehículos diferentes simultáneos, mismo vehículo/campos distintos, mismo slot, mismo opId/payload idéntico y distinto, capacidad llena, VIN duplicado, errores parciales y respuesta perdida.
- [ ] Revisar el alcance y los consumidores legacy de la reserva de ID de vehículo nuevo; no sustituir la unicidad por un mecanismo no probado.

**Validación Beta diferida:** AUG-159, AUG-160 y pruebas de concurrencia real de `appendRow` con proyectos Apps Script, Spreadsheet y Drive aislados. No usar producción.

## P1 — GP-UX-RECENT-VIEWED-CACHE-PARALLEL-01

**Estado: PENDIENTE DE IMPLEMENTACIÓN LOCAL.**

- [ ] Verificar si la hidratación local de `viewedItems` termina antes o después del render inicial de los carruseles; no asumir que iniciar una promesa antes de `showApp` garantiza que el carrusel se pinte con datos.
- [ ] Hidratar vistos desde IndexedDB/cache en paralelo con el resto de la hidratación local y renderizar el carrusel sin esperar historial remoto, búsquedas ni otros carruseles.
- [ ] Evitar lecturas duplicadas y renderizados completos; conservar aislamiento por ownerId/sesión, orden, estados vacíos/offline y protección ante cambio de cuenta.
- [ ] Añadir pruebas de orden de hidratación, IndexedDB lento/no disponible, sesión cambiada y ausencia de consultas duplicadas.

## Validaciones Beta pendientes

La matriz íntegra y el orden obligatorio están en `lista_beta.txt` y sus segmentos. Incluye, entre otras:

- AUG-159 — aportes vehiculares y resolución ADMIN append-only.
- AUG-160 — cargas ADMIN e ImageUploadEvents.
- AUG-037 — integridad, recuperación y fallos parciales del flujo de imágenes.
- Validación de concurrencia real Apps Script/Spreadsheet/Drive, pérdida de respuesta y recuperación.
- Safe Apply: preview real, ACL, manifiesto y rollback; la aplicación de movimientos/renombrados/borrados sigue bloqueada.
- UI/PWA y aceptación visual en navegadores/dispositivos reales.

Antes de cualquier Beta, cumplir la secuencia de sincronización de ramas, árbol limpio y fast-forward indicada al inicio de `lista_beta_parte1.txt`. Usar únicamente deployments, cuentas, Spreadsheet y Drive aislados; no cambiar endpoints operativos ni tocar datos productivos.

## Reglas operativas

- Trabajar exclusivamente en `GPSpedia2.2.5_work`; no modificar `GPSpedia2.2.5`.
- Leer y cumplir `NORMAS_DESAROLLO.md`; §15 prioriza simplicidad, baja latencia y ausencia de locks/esperas en acciones ordinarias.
- No desplegar Apps Script ni modificar ScriptProperties, secretos, permisos, Spreadsheet o Drive productivos sin autorización expresa.
- Cerrar cada tarea local solo con revisión de diff, pruebas focalizadas, regresión CI y registros actualizados. La validación Beta puede quedar diferida explícitamente.
