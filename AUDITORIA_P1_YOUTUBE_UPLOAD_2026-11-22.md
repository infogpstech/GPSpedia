# P1 — auditoría del ciclo de carga y aprobación de YouTube
Fecha: 2026-11-22
Rama: `GPSpedia2.2.5_work`
HEAD revisado: `fd8c9040e2873c3dbf1090f52a9574df5497aa25`

## Alcance revisado

- `JS/Frontend/youtubeUpload.js`: creación de operación, almacenamiento local, inicialización, transferencia resumable, checkpoints, pausa/reanudación, recuperación, aprobación y cierre.
- `JS/Services/feedback.js`: inicialización de sesión, registro de solicitud, idempotencia por `opVideoId`, lectura de estado, ledger de decisión y publicación/rechazo.
- `JS/Tests/RunServiceTests.mjs` y suites de cliente/servidor de YouTube.

## Flujo confirmado

1. El navegador crea un `opVideoId` criptográficamente aleatorio y lo conserva en `sessionStorage` por contexto de usuario/tipo/destino/título, con TTL de 24 horas.
2. La sesión resumable se inicializa desde Apps Script usando OAuth de la cuenta de servicio. El backend exige tipo y destino válidos, evita un destino con vídeo ya asociado y rechaza solicitudes pendientes duplicadas. Solo devuelve `Location` si la respuesta es exitosa y la URL coincide con el endpoint oficial de YouTube.
3. El binario se transfiere directamente desde el navegador a YouTube mediante XHR, en bloques de 8 MiB. Apps Script no recibe ni retransmite el archivo.
4. IndexedDB conserva el registro de operación, el objeto File, la URL resumable, el tamaño/tipo, el offset confirmado, el estado y los metadatos.
5. Al reanudar, el cliente consulta primero el offset remoto. La respuesta HTTP 308/Range es la fuente de verdad; cada avance confirmado se persiste antes de continuar. Los errores consultan el estado remoto antes de repetir un bloque.
6. La pausa/cierre confirma la acción, aborta el XHR activo y conserva el último offset confirmado. La recuperación permite continuar con el archivo guardado; si YouTube ya completó la transferencia, el cliente puede reintentar la aprobación sin volver a subir.
7. El ID final se valida como ID real de YouTube. El cliente registra el estado `uploaded` antes de enviar la solicitud de aprobación.
8. El backend valida el formato del ID y la URL canónica, aplica idempotencia por `opVideoId`, rechaza un mismo ID con contenido contradictorio y evita solicitudes pendientes duplicadas por destino.
9. La aprobación/rechazo conserva el ledger append-only de eventos. La decisión se verifica antes de publicar; los reintentos completan materialización/publicación o retirada sin duplicar la transición. Las rutas de aprobación/rechazo restringen roles y verifican el destino.

## Contratos y pruebas ya integrados

El runner de regresión incluye:
- `YouTubeApproval` y `YouTubeApprovalInit`.
- Persistencia IndexedDB, recuperación de bloques, pausa durante transferencia, recuperación de vídeo completado y borradores.
- Ciclo de vida del modal/overlay, historial, XSS, cliente resumable y sesión.
- Estados, roles, publicación y solicitudes pendientes sin refrescos redundantes.

El último CI comprobado en HEAD `fd8c9040` fue SUCCESS: 293 suites / 3,435 pruebas / 0 fallos. El código YouTube no fue modificado en esa revisión; se inspeccionaron los contratos existentes.

## Hallazgo que requiere decisión técnica posterior

**Inicialización no idempotente ante respuesta perdida (riesgo bajo, pero reproducible por estructura):**

- `handleInitYouTubeUpload` recibe `opVideoId`, pero no persiste una asociación durable entre ese ID y la URL de sesión resumable devuelta por YouTube.
- Si YouTube crea la sesión y la respuesta se pierde antes de que el navegador guarde `uploadUrl` en IndexedDB, un reintento con el mismo `opVideoId` vuelve a llamar al endpoint de inicialización y puede crear otra sesión.
- Esto no publica un vídeo duplicado por sí solo: la transferencia de bytes todavía no ha comenzado en la sesión cuya URL se perdió, y el registro final de aprobación mantiene idempotencia por `opVideoId`. Sí puede dejar sesiones resumables sin uso y consumir cuota/recursos hasta su expiración.
- No se implementa una persistencia improvisada de URL de sesión. Una solución requiere definir almacenamiento seguro, concurrencia entre pestañas, expiración/renovación tras HTTP 404/410 y limpieza después de aprobación, con contratos específicos. No guardar la URL de sesión en logs ni en telemetría.

## Decisiones

- No mover la transferencia binaria a Apps Script ni cambiar el tamaño de bloque de 8 MiB.
- No cambiar la recuperación de offsets ni los checkpoints confirmados.
- No retirar la idempotencia de aprobación, los controles de destino, RBAC ni el ledger append-only.
- No ejecutar pruebas contra YouTube real ni modificar deployments; la validación de campo sigue reservada a Beta aislada.

## Estado y siguiente paso

**Auditoría estática completada; sin cambios de código.** La cobertura local existente es amplia. Se registra como pendiente de diseño la idempotencia de inicialización ante respuesta perdida, sin bloquear la revisión de los demás elementos multimedia.

Siguiente: inventariar los tamaños históricos de logos y límites actuales; no modificar límites sin una muestra representativa.
