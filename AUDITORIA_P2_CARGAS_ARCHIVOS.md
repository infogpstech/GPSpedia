# Auditoría P2.1 — cargas de imágenes y videos

**Fecha:** 2026-11-17  
**Rama:** GPSpedia2.2.5_work  
**Base protegida:** GPSpedia2.2.5  
**HEAD de auditoría:** 1e6fa8f6f57b6569ff1bf6315db8003ca66d0038  
**Estado:** auditoría estática completada; implementación P2 pendiente.

## Alcance

Se revisaron los flujos de aportes de WRITE y FEEDBACK, los handlers de aprobación de video y la carga resumable del cliente. Se distinguieron las operaciones ordinarias de aportes de las herramientas administrativas de conciliación/organización de imágenes.

## Hallazgos

### 1. WRITE — imágenes de cortes e información suplementaria

Las cargas de imágenes de `addOrUpdateCut` y `addSupplementaryInfo` ya ejecutan la transferencia Drive fuera del lock global desde P1.2a/P1.2b. Reutilizan el ledger de imágenes y la readquisición fail-fast para asociar la referencia a la fila. No se vuelve a implementar este flujo en P2; se debe conservar su regresión `WriteDriveOutsideLock.mjs` y pruebas de ledger.

Persisten esperas de 30 s en `handleAddVinToVehicle`, `handleAllocateVehicleId` y `handleFreezeCortesIds`; no son transferencias de imágenes y se clasifican para P3/P4, no deben modificarse incidentalmente en la tarea de archivos.

### 2. FEEDBACK — adjuntos de reportes y sugerencias

- `handleReportProblem` adquiere ScriptLock y conserva el bloqueo durante `saveReportImageAttachment_`, que crea la subcarpeta/archivo en Drive. El bloqueo también abarca la escritura y confirmación de la fila.
- `handleSuggestCutChange` mantiene ScriptLock durante `saveSuggestionImageAttachment_`, incluida la creación del archivo y la comprobación de acceso de Drive, además de la persistencia de la sugerencia.
- Ambos flujos tienen puntos de limpieza/recuperación del archivo si falla la escritura. Cualquier separación debe mantener el archivo asociado al registro correcto y no borrar una imagen que ya haya quedado referenciada.
- El siguiente cambio debe limitar el lock al tramo mínimo de escritura de hoja. La preparación y transferencia de la imagen se harán fuera del lock; no se introducirán leases, nuevas llamadas de autenticación, validaciones transaccionales ni nuevas capas de seguridad.

### 3. FEEDBACK — Problemas y Soluciones (PyS)

`handleAddProblem` mantiene el ScriptLock durante resolución de carpeta, creación de archivo en Drive, descripción/metadatos, comprobación de acceso, escritura del ledger PyS, append de la fila y confirmaciones. Es el caso más amplio detectado.

La ruta ya utiliza `opId` y ledger de recuperación. No se debe ampliar ese mecanismo ni crear otra capa transaccional. Se revisará si puede reducirse a: preparar/cargar imagen fuera del lock; guardar el registro y sus referencias en el tramo corto; conservar recuperación básica solo cuando una transferencia haya quedado sin referencia. Evitar alterar datos históricos o IDs.

### 4. Videos de YouTube

- `JS/Frontend/youtubeUpload.js` realiza transferencia resumable directa desde el navegador a YouTube en bloques de 8 MiB.
- El cliente conserva checkpoints en IndexedDB y puede reanudar/cancelar la transferencia. No se encontró un ScriptLock de Apps Script que cubra el envío de bloques.
- `handleInitYouTubeUpload` inicializa la sesión resumable; `submitVideoForApproval` registra la solicitud después de la carga. Los locks de aprobación/rechazo protegen cambios de estado/publicación, no la transferencia del video.
- Mantener el flujo resumable, sus checkpoints y la aprobación existente. No sustituir la transferencia directa por una carga de video a través de Apps Script.

### 5. Tutoriales y herramientas ADMIN

La creación/edición de Tutoriales guarda texto y metadatos; el video se incorpora por el flujo de aprobación separado. No se encontró carga directa de imagen en el alta normal de Tutorial.

Las funciones ADMIN de auditoría, conciliación, movimiento, restauración y organización de imágenes mantienen locks prolongados alrededor de operaciones Drive. Son tareas de mantenimiento de desarrollador, no el flujo ordinario de aporte del usuario. Quedan fuera de P2.2 para evitar mezclar cambios y requieren una tarea P4 separada.

## Orden de implementación

1. P2.2a: separar las cargas de adjuntos de `handleReportProblem` y `handleSuggestCutChange` del ScriptLock, con pruebas de éxito, fallo de escritura, duplicado y limpieza.
2. P2.2b: reducir el lock de `handleAddProblem` y sacar la creación de imagen PyS de la sección crítica sin añadir nuevas capas de transacción.
3. Mantener sin cambios la carga resumable de YouTube y la aprobación posterior; ejecutar sus pruebas de recuperación/cancelación.
4. Ejecutar regresión de salud de servicios, telemetría y dashboard junto con las pruebas de imágenes/videos. No desplegar Apps Script ni ejecutar Beta.

## Criterios de aceptación

- Ninguna transferencia Drive de los aportes FEEDBACK anteriores mantiene el ScriptLock global.
- Autor, fecha del servidor, ID del registro y asociación de imagen se conservan.
- Un fallo de escritura no deja una imagen huérfana cuando su eliminación es segura; si la referencia es incierta, no borrar archivos que puedan estar asociados.
- La transferencia YouTube sigue siendo directa/resumable y sus checkpoints funcionan.
- No se eliminan ni degradan el monitoreo de servicios ni las fuentes de actividad del dashboard.
- CI completa aprobada. Validación real Drive/OAuth y sesiones permanece diferida a Beta.


## Seguimiento P2.2a — cierre
- `handleReportProblem` y `handleSuggestCutChange` ahora cargan imágenes antes del lock. El lock protege únicamente la consulta/confirmación de duplicados y la persistencia de filas/metadata.
- Regresión `P2FeedbackImageUploadLocks.mjs` 1/1 PASS; CI 141 suites / 2,029 pruebas / 0 fallos; health remoto 7/7; Pages SUCCESS.
- P2.2b pendiente: `handleAddProblem` (PyS) aún crea el archivo Drive dentro del ScriptLock y mantiene un ledger de operaciones. La siguiente refactorización debe evitar agregar capas de transacción y reducir ese lock al mínimo, preservando reintento básico e IDs.


## Seguimiento P2.2b — cierre
- `handleAddProblem` ahora realiza preflight, prepara y carga la imagen fuera del ScriptLock. La persistencia y la asociación usan el ledger existente bajo un tramo breve.
- Los reintentos vinculados no suben otra imagen; `UPLOAD_PENDING` reutiliza el archivo. No se añadieron estados nuevos ni capas transaccionales.
- PyS tests 53/53 + 22/22; CI 142 suites / 2,104 pruebas / 0 fallos; health 7/7; Pages SUCCESS.
- P2.2b completada localmente; Beta Drive/OAuth y concurrencia real pendientes.


## Cierre P2.3 — YouTube resumable
- Flujo directo navegador→YouTube conservado; 8 MiB por bloque y checkpoints IndexedDB. Apps Script solo inicializa la sesión y registra/aprueba el video.
- Las pruebas focalizadas de persistencia, recuperación, cancelación, borradores, overlay, XSS y cliente aprobaron: 14/14, 2/2, 6/6, 6/6, 3/3, 8/8, 5/5 y 12/12; precondiciones server-side 8/8.
- No fue necesario modificar el flujo. P2 cerrada localmente; validación externa Beta pendiente.
