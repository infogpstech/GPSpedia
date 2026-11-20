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
- [x] Corregir el lector CATALOG de `AportesVehiculo`: aceptar `vehicle_update` con actor y opId `OP-ADMIN-`, o con opId `OP-YEAR-` exclusivamente si el actor es `SYSTEM:FEEDBACK_YEAR`; antes el proyector ya entendía el tipo, pero el lector lo rechazaba y podía invalidar la lectura completa. Prueba funcional añadida a `VehicleContributionProjection`; CI 44834146336 SUCCESS: 237 suites, 2956 pruebas, 0 fallos.
- [x] Auditar FEEDBACK/reporte/sugerencia: `reportProblem` y `suggestCutChange` persisten en Feedbacks y no escriben directamente Cortes/AportesVehiculo; la sugerencia actual se limita a un corte existente. Los IDs `reportId`/`suggestionOperationId` y la huella mantienen idempotencia. `reportId` ahora usa `crypto.randomUUID()`/`getRandomValues`, sin `Math.random`.
- [x] Corregir fallo de ejecución al repetir voto positivo: `handleSuggestYearLocked` usaba `voteActors` fuera de alcance; ahora comprueba el voto positivo desde `allData`. Regresión añadida a `SuggestYearVoteThreshold.mjs` (7/7 PASS); CI 44834891294 SUCCESS: 238 suites, 2963 pruebas, 0 fallos.
- [x] Migrar `handleSuggestYear`/`completeFeedbackYearApplication_` a eventos `vehicle_update` en `AportesVehiculo`: lectura del rango desde la proyección append-only, versiones esperadas y fuentes, opId estable por campo, append verificado e idempotente, recuperación mediante `FeedbackYearApplications` (extensión de columnas para conservar valores/fuentes originales) y estado `requires_review` si CATALOG no aplica el rango. Se eliminó la escritura directa en `Cortes.anoDesde/anoHasta`; el catálogo se invalida fuera del lock. Se conservan tres votos verificados, exclusión de anónimos y detección de colisión de generaciones. Pruebas `FeedbackYearApplicationAppendOnly` 4/4 y `SuggestYearVoteThreshold` 7/7; CI 44834891294 SUCCESS: 238 suites, 2963 pruebas, 0 fallos.
- [x] Retirar el lock global prolongado de `handleSendContactForm`: el asignador `getNextFormulaBasedId_` reserva el ID dentro de su sección crítica breve y el formulario anexa una fila completa con `appendRow` fuera del lock; el formato se aplica después de verificar el ID. Prueba `FeedbackContactWriteNoGlobalLock` 2/2 y `FeedbackLockFastFail` PASS; CI 44835219987 SUCCESS: 239 suites, 2965 pruebas, 0 fallos.
- [ ] Reducir el ScriptLock global fast-fail de FEEDBACK. La ampliación de años ya es append-only y el formulario de contacto ya no mantiene el lock global durante su escritura; todavía queda retirar la serialización global de `reportProblem`, `suggestCutChange`, `recordLike`, PyS, tutoriales y otras mutaciones, conservando deduplicación por operación y el lock breve estrictamente necesario para IDs secuenciales. No retirar el lock hasta migrar cada ruta y probar respuestas perdidas/concurrencia.
- [x] Añadir conversión explícita desde Inbox: crear un corte para el vehículo del reporte (precargando la sugerencia si existe) o abrir el alta de vehículo nuevo desde el reporte. Ambas rutas reutilizan WRITE/add_cortes, generan `OP-FEEDBACK-{itemId}` estable y marcan el reporte resuelto solo después de confirmar el aporte; si queda candidato, el reporte permanece pendiente. Pruebas InboxUi 87/87 y AddCortesDiagnostics 12/12; CI 237 suites/2943 PASS.
- [ ] Revisar si el ScriptLock fast-fail de FEEDBACK es indispensable para IDs secuenciales/deduplicación bajo §15; conservarlo solo si no existe alternativa append-only segura.
- [x] Mostrar en ADMIN la vista previa y enlace seguro de las imágenes adjuntas a candidatos de corte/apertura/alimentación y a campos de imagen de `vehicle_update`; validar estrictamente URL canónica Drive y abrir con `noopener noreferrer`. Prueba `AdminVehicleContributionCandidateImagePreview` 8/8.
- [x] Conservar imágenes candidatas en `Imagenes_Reemplazadas`: `tipo_registro=candidata_aporte`, `origen_registro=aporte_vehiculo`, `tipo_contenido=aporte_candidato`, `estado=requiere_revision`. El inventario sincroniza candidatos actuales desde CATALOG y resoluciones desde AportesVehiculo; al aceptar/corregir/descartar actualiza a `en_uso`/`cancelada`. No permite marcar en uso ni eliminar mientras está pendiente o referenciada; un candidato descartado solo admite descarga/papelera si el escáner confirma cero referencias. Metadatos Drive se leen fuera del lock; escritura idempotente bajo el lock de esquema. Pruebas AdminReplacedImagesIntegrity 56/56, ReplacedImagesLibraryUX 14/14; CI 237 suites/2943 PASS.
- [x] Completar señalización UI de conflictos tardíos en el finalizador común de aportes desde modal de detalle y `HTML/add_cortes.html`: prevalece `candidateReviewPending` devuelto por WRITE aunque el refresco CATALOG no muestre todavía el candidato; si falla el refresco, se conserva el estado y no se anuncia como aplicado. `VehicleExpansionDetailRefresh` amplía cobertura.
- [ ] Ejecutar regresión focalizada de los escenarios que falten: vehículos diferentes simultáneos, mismo vehículo/campos distintos, mismo slot, mismo opId/payload idéntico y distinto, capacidad llena, VIN duplicado, errores parciales y respuesta perdida.
- [ ] Revisar el alcance y los consumidores legacy de la reserva de ID de vehículo nuevo; no sustituir la unicidad por un mecanismo no probado.

**Validación Beta diferida:** AUG-159, AUG-160 y pruebas de concurrencia real de `appendRow` con proyectos Apps Script, Spreadsheet y Drive aislados. No usar producción.

## P1 — GP-UX-RECENT-VIEWED-CACHE-PARALLEL-01

**Estado: COMPLETADA LOCALMENTE; aceptación visual Beta diferida.**

- [x] Verificado: `handleLoginSuccess` inicia `loadUserLocalActivity(user)` antes de `showApp(user)`; las lecturas IndexedDB de búsqueda y vistos se inician de forma independiente, sin `await` ni `Promise.all` que bloquee la aplicación.
- [x] `loadViewedItems` hidrata el carrusel por ownerId, no espera al historial de búsqueda, reintenta solo la lectura local no disponible y valida sesión/propietario antes de aplicar una respuesta tardía.
- [x] El cambio de `viewedItems` actualiza solo `renderRecentlyViewedCarousel()`; no reconstruye categorías ni dispara lecturas remotas. Apertura de ficha actualiza estado en memoria y persiste una sola vez en IndexedDB.
- [x] Pruebas dinámicas `RecentlyViewedHydrationParallel` 3/3: lecturas paralelas, IndexedDB temporalmente no disponible, cambio de propietario y ausencia de consultas duplicadas. `RecentlyViewedCarousel` contract 1/1.
- [x] CI 44833576889 SUCCESS: 237 suites, 2954 pruebas aprobadas, 0 fallos; `node --check` PASS.
- [ ] Beta visual en navegadores/dispositivos reales y verificación de comportamiento con IndexedDB real lento/offline.

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


## Continuidad — corrección de voto repetido FEEDBACK (2026-11-20)

- Código: `1a4b0909d3ec881207f4cb120f668091ced056e2`.
- Prueba: `66da8f2aa102665f8a32a4039e3d63046e580c19`.
- Se corrigió `voteActors` fuera de alcance en `handleSuggestYearLocked`; la prueba focalizada cubre el predicado nuevo. Pendiente ejecutar la prueba y la suite completa antes de cerrar.
- Siguiente: continuar migración/retirada del ScriptLock FEEDBACK y revisar asignador de IDs bajo §15.
