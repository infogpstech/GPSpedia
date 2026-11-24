# GPSpedia — Tareas de validación Beta

Fecha de inicio: 2026-11-22
Repositorio: `infogpstech/GPSpedia`
Rama de trabajo: `GPSpedia2.2.5_work`
Rama base: `GPSpedia2.2.5`
HEAD de referencia: `1d20ee06ac8c989deabea98a9ddd89d3928aa624`
Alcance: pruebas Beta y registro de hallazgos. No realizar correcciones de código durante esta etapa.

## 0. Sincronización segura obligatoria

Ejecutar antes de cualquier prueba Beta. Ajustar únicamente la ruta local:

```bash
cd /ruta/local/GPSpedia || exit 1
test "$(git remote get-url origin)" = "https://github.com/infogpstech/GPSpedia.git" || exit 1
test "$(git branch --show-current)" = "GPSpedia2.2.5_work" || exit 1
test -z "$(git status --porcelain)" || { echo "Árbol con cambios locales; detener"; exit 1; }
git fetch origin GPSpedia2.2.5_work &&
git pull --ff-only origin GPSpedia2.2.5_work &&
git rev-parse --abbrev-ref HEAD &&
git rev-parse HEAD
```

No usar `reset --hard`, `clean`, force push ni comandos que descarten cambios locales.

## 1. Condiciones de ejecución
- Usar exclusivamente deployments Apps Script, Spreadsheet, Drive, cuentas y datos de prueba aislados.
- No usar recursos productivos ni registrar secretos, tokens, IDs personales, mensajes, VIN, URLs privadas o contenido de archivos.
- Registrar commit exacto, servicio, operación, rol, dispositivo/navegador, resultado y evidencia anonimizada.
- No modificar código durante esta etapa. Registrar los defectos en `Hallazgos_Beta.md`.
- No ejecutar escrituras/destructivas sin recursos desechables, cuenta autorizada, previsualización y plan de recuperación.
- Si una medición no está disponible, indicar `NO MEDIDA`; no estimarla.

## 2. Matriz de validación

### BETA-01 — AUTH / USERS y aislamiento
- Login, validación/renovación de sesión con roles distintos.
- Cambio de perfil/rol, logout, revocación y eliminación de cuenta de prueba.
- Separación de aportes/mensajes entre usuarios.
- Expiración/eviction de caché y rechazo de sesiones revocadas.

### BETA-02 — CATALOG y navegación
- Carga con caché fría/caliente, snapshot local, cursor incremental y deltas.
- El feed pertenece a CATALOG: GET `catalogFeed=1`; publicación frontend mediante `publishCatalogChange`/`publishCatalogReset`. No usar COORDINATOR para el feed.
- Después de desplegar el código CATALOG en el proyecto Beta aislado, ejecutar manualmente `initializeCatalogChangeFeedSheets()` desde el editor Apps Script de CATALOG. Confirmar que devuelve `status: success` y valida `CatalogChangeState`/`CatalogChangeEvents`. La función solo crea hojas ausentes o agrega encabezados a hojas vacías; no se ejecuta durante consultas ordinarias, no reescribe hojas con datos y falla antes de modificar si detecta un esquema incompatible. No ejecutar contra producción sin autorización expresa.
- Reset y recuperación por snapshot completo.
- Búsqueda, detalle, regreso y cambios concurrentes controlados.
- Requests, bytes, render, hit/miss y consistencia.

### BETA-03 — WRITE / aportes y concurrencia
- Altas/ediciones de prueba, aportes suplementarios e imágenes.
- Reintentos con el mismo operationId y recuperación tras respuesta perdida.
- Append concurrente, read-back, journals y consistencia Spreadsheet/Drive.
- No duplicación ni pérdida tras fallos parciales.

### BETA-04 — FEEDBACK / PyS / Tutoriales / Inbox
- Reportes, sugerencias, likes, tutoriales y operaciones PyS.
- Inbox: listar, enviar, marcar leído y archivar.
- Reintentos, idempotencia, publicación de deltas y recuperación.
- FEEDBACK devuelve metadatos; el frontend los publica en CATALOG, que reconstruye el snapshot canónico de Cortes/PyS/Tutoriales. Verificar delta por registro y fallback reset, sin llamadas Apps Script→Apps Script.
- Aislamiento por rol y usuario.

### BETA-05 — ADMIN y mantenimiento
- **Precaución de ejecución del health workflow:** .github/workflows/deployed-service-health.yml existe en la rama de trabajo, pero no en la rama predeterminada main; por tanto, el workflow_dispatch no está disponible desde GitHub mientras no exista también en main. Además, el script toma el bootstrap fijo de JS/Frontend/api-config.js y no ofrece selector de entorno. No intentar ejecutarlo hasta confirmar que ese bootstrap resuelve exclusivamente la configuración Beta aislada. La sonda consulta configuración pública y luego GET ?debug=true; no realiza escrituras.
- Panel Developer: health individual de AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN; telemetría local del navegador claramente etiquetada. No existe agregado global de Coordinator.
- Confirmar identidad, versión, latencia, estados online/slow/unavailable/error/unknown/stale, timeout y aislamiento de fallos entre endpoints.
- Agregado global Coordinator: retirado en MIG-025 junto con su recopilador. No ejecutar pruebas de ventanas 1/6/24 horas, RBAC del endpoint getServiceTraffic, transición de buckets v1/v2 ni retención de ese agregado; esos contratos ya no pertenecen a los servicios activos. Los valores históricos que pudieran persistir en ScriptProperties no se borran automáticamente.
- Telemetría local del navegador: validar ventanas horarias, límites de eventos, ausencia de payloads/tokens/identidad y alcance por pestaña/navegador. Confirmar que no se transmite ni persiste y que se reinicia al cerrar/recargar la pestaña. No presentarla como sustituto ni estimación del tráfico global.
- Inventario de imágenes, escaneo Drive y operaciones sobre recursos de prueba.
- Separar consultas read-only de acciones mutables.
- Permisos, confirmaciones, read-back y rollback.

### BETA-06 — Imágenes, logos y cola multimedia
- Corpus sintético/autorizado; PNG alfa, JPEG, orientación, MIME y firma.
- Variantes 300/800/1600 y legibilidad de diagramas.
- Caché, CORS, primera pintura, cola visible/precargas, cancelación y errores.
- Inventario read-only de logos; no imponer límites durante el inventario.

### BETA-07 — Vídeos / YouTube
- Canal y OAuth de prueba autorizados.
- Carga resumable en bloques de 8 MiB, checkpoints, pausa, reanudación y cancelación.
- Respuesta perdida, sesión expirada, aprobación/rechazo e idempotencia.
- Confirmar estado remoto y permisos; los dobles locales no sustituyen esta prueba.

### BETA-08 — Interfaz y compatibilidad
- Android/PWA y escritorio.
- Modales, bandeja, formularios, Tutorial/Relay, navegación, modo oscuro y overflow.
- Caché fría/caliente, primera pintura e interacción.
- Registrar dispositivo, navegador, resolución y evidencia anonimizada.

## 3. Estado inicial
Todos los bloques están **PENDIENTES** de ejecución Beta real. La CI y las pruebas locales anteriores no sustituyen las pruebas remotas con Apps Script, Spreadsheet, Drive, OAuth o YouTube.


## 4. Validación Beta diferida — MIG-012 AUTH/USERS
- Desplegar AUTH en entorno aislado y confirmar que el endpoint real responde con el contrato esperado.
- Verificar login, sesiones, roles jerárquicos, altas, actualización de perfil y bajas usando hojas de prueba Users/ActiveSessions.
- Confirmar que las acciones getUsers/createUser/updateProfile funcionan desde el frontend y que no existen consumidores externos del deployment USERS.
- Revisar permisos Apps Script/Spreadsheet y ausencia de efectos sobre datos productivos.
- Solo tras aprobar lo anterior, deshabilitar el deployment heredado USERS y retirar su fila del registro central. La fila histórica se ignora actualmente por el lector central; no se debe borrar antes del cutover.


## 5. Validación Beta diferida — MIG-013 sesiones locales
- Desplegar AUTH y los servicios consumidores en entorno aislado, sin alterar endpoints productivos.
- Probar login correcto/incorrecto, hash actual, bloqueo después de cinco intentos y token opaco registrado en ActiveSessions.
- Verificar desde cada servicio protegido el primer acceso con caché fría y los accesos siguientes con caché caliente.
- Probar token desconocido, revocado, duplicado y expirado; userId no coincidente; usuario eliminado/desactivado; rol cambiado y revocación pendiente.
- Confirmar permisos RBAC por servicio y que un rol/userId enviado desde el navegador no altera el actor autorizado.
- Verificar logout, cambio de rol, reset de sesiones y eliminación de cuenta con invalidación entre servicios, junto con los casos de indisponibilidad y reintento definidos en MIG-014.
- Confirmar permisos efectivos Apps Script/Spreadsheet y ausencia de efectos en datos productivos. No considerar las pruebas simuladas o CI como sustituto de esta validación.


## 6.1 Validación Beta diferida — MIG-015 imágenes y recursos Drive
- Antes de cualquier prueba, ejecutar la secuencia de sincronización segura del apartado 0.
- Preparar una Spreadsheet y un Drive Beta aislados; vincular los proyectos ADMIN, WRITE y FEEDBACK a la Spreadsheet de prueba.
- Publicar una revisión central con la definición y recurso cortes_root_folder_id según ESQUEMA_CONFIGURACION_CENTRAL.md; el ID debe corresponder a la carpeta Cortes Beta y su padre esperado a la raíz Drive Beta.
- Ejecutar `createCortesImageFolder` con categoría, marca y modelo sintéticos; verificar creación bajo la raíz Cortes del registro central, rechazo de nombres duplicados y fallo cerrado ante configuración ausente/vencida o jerarquía incorrecta. No usar recursos productivos.
- Confirmar que las tres aplicaciones leen el recurso central y rechazan una referencia ausente, vencida, deshabilitada, de tipo incorrecto o con jerarquía discordante. No configurar IDs de Drive/Spreadsheet en el código ni ScriptProperties.
- Probar aportes nuevos con imagen de vehículo/corte, apertura y alimentación; verificar archivo, MIME, tamaño, SHA-256, ImageUploadEvents, ledger, vínculo a AportesVehiculo y proyección CATALOG.
- Probar reemplazo ADMIN con la misma opId tras respuesta perdida; comprobar read-back, compare-and-set de versión, no duplicación y reconciliación de estados pending/linked/requires_review.
- Probar adjuntos de reportes, sugerencias y PyS; confirmar permisos heredados privados, referencia en hoja, limpieza compensatoria y recuperación tras fallo parcial.
- Probar variantes 300/800/1600, PNG con transparencia, calidad de diagramas, IndexedDB, ObjectURL y Lightbox en Android/PWA y escritorio.
- Probar inventario, imagen reemplazada, marcar en uso, mover, papelera, restaurar y eliminación definitiva con recursos desechables; verificar propietario, padre, RBAC, read-back y rollback.
- Confirmar que Imagenes_Sin_Uso se localiza por nombre, que los duplicados se reportan sin mover archivos y que no se crea una segunda carpeta.
- No usar recursos productivos ni simular pruebas Beta con CI. Registrar commit, servicio, rol, dispositivo/navegador y evidencia anonimizada.


---

## 6.2 Validación Beta diferida — MIG-017 herramientas y operaciones Drive
- Ejecutar primero la sincronización segura y crear una unidad/carpeta Drive Beta aislada, sin archivos productivos.
- Publicar en la configuración central el recurso de la raíz Cortes Beta; no introducir IDs de carpetas, URLs ni credenciales en código o ScriptProperties.
- Probar `dir`, `cd`, `tree`, `mkdir` y navegación en raíz, subcarpetas, rutas inválidas, padres externos y carpetas compartidas.
- Probar `move` de archivos entre subcarpetas autorizadas, con espacios en nombres; comprobar read-back, ID, propietario, permisos, padre y ausencia de copias/duplicados.
- Provocar fallos controlados para verificar rollback de movimiento y que no se alteran ACL/propietario.
- Probar backup reanudable, pausa, reanudación, checksum, restauración y recuperación ante respuesta perdida con archivos desechables.
- Probar auditoría de imágenes, inventario, métricas y alertas de almacenamiento; validar límites, paginación, URLs de descarga y RBAC por rol.
- Probar papelera, restauración y eliminación definitiva únicamente con archivos creados para Beta; comprobar confirmaciones y bloqueos de acciones destructivas.
- Registrar proyecto Apps Script, rol, operación, IDs anonimizados, resultado y evidencia; no copiar datos de clientes.

## 6.3 Validación Beta diferida — MIG-018 modelos, cortes, VIN y contribuciones
- Preparar Spreadsheet Beta aislada, con copia anonimizada del esquema de Cortes/Relay y sin datos personales/productivos. Confirmar los permisos mínimos de CATALOG, WRITE y ADMIN.
- Ejecutar la migración explícita de `AportesVehiculo`; comprobar encabezados versionados, rechazo de esquemas incompatibles, idempotencia y que no se recrea ni sobrescribe una hoja existente.
- Probar creación y edición de modelos/cortes, IDs, asignación concurrente, slots, versiones y campos versionados; verificar límites de capacidad y recuperación por `opId`.
- Probar aportes de apertura, alimentación, imágenes y notas; comprobar IDs idempotentes independientes, actor/fecha de servidor, append-only, read-back y recuperación después de respuesta perdida.
- Probar candidatos de contribución: aceptación, corrección, descarte, conflicto VIN, resolución duplicada y auditoría; verificar que no se edita ni elimina el evento original.
- Probar proyección CATALOG de contribuciones y VIN con varias sesiones concurrentes, VIN duplicados entre vehículos, versiones múltiples y campos ya ocupados; ningún conflicto debe sobrescribir datos existentes.
- Probar búsqueda por marca/modelo/versión/año, rangos abiertos/cerrados, selección ambigua, navegación atrás/adelante, historial y recarga.
- Probar VIN en formularios y navegación con valores incompletos, malformados, repetidos y colecciones heredadas; confirmar privacidad, normalización, firmas y que no se expone más información de la necesaria.
- Probar operaciones suplementarias con y sin imágenes, cierre/recarga del navegador, reintentos y recuperación IndexedDB; confirmar que no se duplican eventos ni se pierden aportes.
- Ejecutar con roles reales y registrar permisos, proyecto/servicio, operación, dispositivo/navegador, IDs anonimizados y evidencia. No considerar CI simulado como sustituto de estas pruebas.


## 6.4 Validación Beta diferida — MIG-024 retirada de SharedMutation
**Estado: PENDIENTE DE EJECUCIÓN EN Beta aislada.**

- Preparar deployments compatibles de AUTH, WRITE, FEEDBACK, CATALOG, ADMIN y UTILITIES en proyectos Apps Script de prueba, vinculados a una Spreadsheet y un Drive desechables. No modificar endpoints productivos.
- Confirmar que las acciones ordinarias y la invalidación de sesión no realizan llamadas backend→Coordinator ni requieren `GPSpedia_COORDINATOR_URL`, secretos compartidos o propiedades manuales.
- Revocar una sesión y eliminar una cuenta desde el flujo frontend; verificar que la invalidación alcanza los servicios afectados y que un actor revocado no puede continuar operando.
- En ADMIN, ejecutar auditoría Drive, creación de carpeta e inventario en dos recursos distintos simultáneamente; confirmar que no se bloquean entre sí.
- Repetir dos operaciones sobre el mismo recurso; confirmar que la segunda recibe conflicto recuperable mientras la primera sigue activa, sin duplicar archivos ni registros.
- Simular fallo durante el callback y fallo al limpiar el marcador; comprobar liberación/expiración por TTL y recuperación sin mantener ScriptLock durante el trabajo Drive.
- Confirmar que no hay endpoints, despliegues ni consumidores activos de Coordinator. La retirada del servicio se valida en MIG-025; cualquier limpieza de proyectos, triggers o propiedades externas se gestiona por separado y con autorización.
- Registrar HEAD, versiones de deployments, rol, navegador/dispositivo, recurso sintético y evidencia anonimizada. No copiar secretos, tokens ni datos personales.
- No desplegar ni ejecutar contra producción. CI local no sustituye esta validación Beta.


## 6.5 Validación Beta diferida — MIG-025 retirada de COORDINATOR
**Estado: PENDIENTE DE EJECUCIÓN EN Beta aislada.**

- Confirmar que el registro central entrega únicamente AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN y que sus seis endpoints health responden de forma independiente.
- Simular caída, lentitud, respuesta inválida y recuperación de cada servicio; verificar que el panel identifica el servicio afectado sin bloquear el resto.
- Confirmar que el panel Developer conserva una nota visible sobre el agregado global retirado: el antiguo contador solo reflejaba eventos legacy de Coordinator y no todas las solicitudes HTTP. Verificar que las métricas locales se identifican como datos del navegador actual y no se presentan como sustituto del agregado global.
- Verificar que no se invocan endpoints de COORDINATOR, no existe fallback a su URL y las acciones ordinarias, sesión, invalidación y feed siguen funcionando sin ese servicio.
- Revisar deployments, triggers y propiedades Apps Script existentes solo en proyectos Beta desechables; documentar recursos externos huérfanos para limpieza autorizada. No borrar proyectos, propiedades ni datos automáticamente.
- Registrar HEAD, versiones de deployments, servicio, rol, navegador/dispositivo, resultado y evidencia anonimizada. No copiar secretos ni datos personales.
- No desplegar ni ejecutar contra producción. CI local no sustituye esta validación Beta.


## 6.6 Validación Beta diferida — MIG-026 configuración central y acceso a Spreadsheet
**Estado: PENDIENTE DE EJECUCIÓN EN Beta aislada.**

Antes de ejecutar cualquier prueba, sincronizar únicamente la rama autorizada desde una terminal abierta dentro del repositorio clonado:

```bash
ROOT="$(git rev-parse --show-toplevel)" || exit 1
cd "$ROOT" || exit 1
test "$(basename "$ROOT")" = "GPSpedia" || { echo "Repositorio incorrecto"; exit 1; }
test "$(git remote get-url origin)" = "https://github.com/infogpstech/GPSpedia.git" || { echo "Remoto incorrecto"; exit 1; }
test "$(git branch --show-current)" = "GPSpedia2.2.5_work" || { echo "Rama incorrecta"; exit 1; }
if [ -n "$(git status --porcelain)" ]; then echo "Hay cambios locales sin guardar; detener sincronización"; exit 1; fi
git fetch origin GPSpedia2.2.5_work || exit 1
git pull --ff-only origin GPSpedia2.2.5_work || exit 1
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
```

Ejecutar únicamente con cuentas, deployments, Spreadsheet y recursos desechables de Beta:

1. **Acceso a Spreadsheet y Drive (MIG-026):** probar los seis deployments bajo su identidad real de ejecución mediante `SpreadsheetApp.openById(GPSpediaSpreadsheetId_)`. AUTH, WRITE, FEEDBACK y ADMIN reciben el ID desde `CentralConfigurationReader.js`; CATALOG y UTILITIES usan el ID declarado en su módulo. Confirmar que la Spreadsheet devuelta tiene el ID esperado y que la identidad puede leer/escribir `Users`, `ActiveSessions` y las hojas que consume cada servicio. Para CATALOG, ejecutar manualmente `initializeCatalogChangeFeedSheets()` desde el editor del proyecto Beta. Confirmar los encabezados exactos de `CatalogChangeState` (A:D: schemaVersion, revision, minRevision, updatedAt) y `CatalogChangeEvents` (A:J: revision, collection, recordId, operation, snapshotJson, createdAt, sourceService, sourceOperation, sourceRequestId, resetRequired). Verificar read-back, idempotencia y preservación de cualquier fila válida preexistente; la inicialización no publica el reset inicial ni modifica el ledger de eventos. En WRITE, FEEDBACK y ADMIN probar `DriveApp.getFolderById(GPSpediaCortesRootFolderId_)`; verificar ID, nombre `Cortes`, ausencia de papelera, relación directa con la raíz de Drive y permisos de lectura/escritura necesarios. No usar `getActiveSpreadsheet()` como mecanismo de acceso para estos proyectos independientes.
2. **SharedSessionActor:** validar cache miss, cache hit, expiración, token revocado, cambio de rol y usuario desactivado. Confirmar que AUTH usa getAuthUsersSpreadsheet_, WRITE/ADMIN/FEEDBACK usan getSpreadsheet y UTILITIES su proveedor explícito; todos deben resolver la misma Spreadsheet por ID; verificar que una llamada sin proveedor falla cerrado. Confirmar que el actor procede de Users/ActiveSessions y nunca del rol enviado por el navegador.
3. **Feed incremental CATALOG:** antes de habilitar clientes, publicar un reset inicial como Desarrollador y confirmar revisión 1; un ledger vacío debe devolver resetRequired. Después publicar reset y deltas desde WRITE/FEEDBACK/ADMIN; repetir el mismo requestId; probar dos publicaciones concurrentes, lock ocupado, read-back, paginación, retención de 100 eventos, cursor obsoleto, fila ausente y snapshotJson corrupto. Confirmar que la lectura solicita reset cuando detecta huecos y que el ledger no contiene userId ni sessionToken. Inspeccionar las antiguas claves GPSpedia_CATALOG_CHANGE_REVISION y GPSpedia_CATALOG_CHANGE_EVENT_*; no borrarlas sin autorización específica.
4. **Publicación global rich_text_mode:** con una sesión Desarrollador, publicar strict y advanced desde ADMIN; verificar incremento de revisión, historial, idempotencia, read-back y lectura pública desde FEEDBACK. Repetir como Técnico y confirmar rechazo de publicación.
5. **Caché frontend:** abrir dos navegadores/sesiones aisladas; cambiar el modo desde Developer y comprobar que ambos leen el mismo valor central. Verificar TTL máximo de 5 minutos, invalidación tras publicar, revisión válida y fallback estricto cuando la caché o la respuesta central sea inválida/vencida.
6. **Seguridad de contenido:** en ambos modos probar HTML/SVG/eventos/scripts/iframes/URLs peligrosas y confirmar que el backend continúa sanitizando sin depender de la preferencia visual.
7. **Propiedad legacy:** inspeccionar si GPSpedia_RICH_TEXT_MODE_V1 existe en cada proyecto desplegado y registrar su presencia/ausencia. No borrar ni modificar propiedades instaladas como parte de esta prueba sin autorización específica y sin confirmar paridad del deployment.
8. **Arquitectura:** confirmar que las operaciones funcionales se coordinan desde el frontend, que no se han añadido URLs de otros servicios ni secretos compartidos en Apps Script y que cualquier llamada técnica directa tiene justificación y RBAC receptor.
9. Registrar HEAD, deployment/versiones, identidad de ejecución, rol, navegador/dispositivo, resultado y evidencia anonimizada. No registrar tokens, secretos, datos personales ni contenido real.
10. No desplegar ni ejecutar contra producción. CI local no sustituye esta validación Beta.


## 7. Validación Beta diferida — MIG-026 WRITE: baseline del contador de IDs
**Estado: PENDIENTE.** Implementación y contratos locales aprobados; no se ha ejecutado sobre Apps Script/Spreadsheet reales.

- Antes de probar, ejecutar íntegramente la sincronización segura del apartado 0 y confirmar el commit 60223d2943ec6d7f2ed4e3dd4b24830e32fcb08c en la rama GPSpedia2.2.5_work. Usar exclusivamente proyectos, Spreadsheet y datos desechables.
- Preparar Cortes con IDs históricos y CortesIdReservations vacío. Configurar el contador heredado con un valor superior al máximo físico; ejecutar la primera asignación y comprobar que el baseline OP-BASELINE-CORTES-LAST-ID-V1 conserva ese máximo y que el siguiente ID es máximo + 1, sin saltos.
- Repetir con el máximo del ledger superior al de la hoja y con el máximo de la hoja superior al de la propiedad heredada. Confirmar que el high-water final nunca retrocede.
- Probar hoja sin IDs y propiedad ausente: el baseline debe registrar cero y la primera reserva debe ser ID 1, sin consumir el cero.
- Probar reintento, respuesta perdida y dos asignaciones concurrentes con opId distintos; comprobar IDs únicos, orden creciente, read-back y ausencia de duplicados. Repetir con el mismo opId/huella y con el mismo opId/huella distinta; confirmar idempotencia y rechazo de conflicto.
- Forzar propiedad heredada inválida, baseline duplicado/corrupto/incompleto, lock de inicialización ocupado y fallo de append/read-back. Confirmar fail-closed, no asignación con estado corrupto y liberación del lock.
- Confirmar que después de crear el baseline las asignaciones ordinarias no vuelven a consultar GPSpedia_CORTES_LAST_ID/ScriptProperties. Confirmar que freezeCortesIds conserva dry-run, requiere backup válido, convierte fórmulas con read-back y no escribe la propiedad legacy.
- No borrar la propiedad instalada durante esta prueba. Su limpieza solo podrá realizarse después de comprobar paridad y obtener autorización Beta explícita. Registrar evidencia anonimizada y resultado por caso en Hallazgos_Beta.md.


## 8. Validación Beta diferida — MIG-026 AUTH: recuperación sin secreto HMAC persistente
**Estado: PENDIENTE.** Contratos locales aprobados; no se ha ejecutado en un deployment AUTH real.

- Ejecutar primero la sincronización segura del apartado 0. Usar AUTH, Spreadsheet, cuenta y correo de prueba aislados.
- Solicitar recuperación y comprobar que el correo contiene un código de exactamente 24 caracteres hexadecimales (96 bits), que el formulario acepta el formato y que el endpoint rechaza longitudes/caracteres inválidos.
- Confirmar que CacheService solo conserva digests SHA-256 y estado temporal; no debe conservar el código en claro ni requerir una clave HMAC persistente. Verificar que los logs y respuestas no exponen código, correo, contraseña ni digest.
- Verificar el límite de tres solicitudes por hora por usuario/correo/cuenta, expiración a los diez minutos, cinco intentos incorrectos, consumo único, invalidación del código anterior al emitir otro y respuesta genérica para cuentas existentes/inexistentes.
- Forzar fallo de MailApp y confirmar que el desafío se invalida. Confirmar que una recuperación correcta actualiza la contraseña, revoca todas las sesiones y cierra el acceso anterior.
- Verificar que la versión desplegada no consulta ni crea GPSpedia_PASSWORD_RECOVERY_SECRET_V1. Solo después de comprobar que no quedan deployments/versiones activas que dependan de ella, eliminar esa propiedad legacy del proyecto AUTH de prueba y confirmar que el flujo sigue funcionando. No modificar propiedades de producción sin autorización explícita.
- Registrar commit, deployment, navegador, resultado y evidencia anonimizada en Hallazgos_Beta.md. La suite local PasswordRecovery 10/10 no sustituye esta validación.


## 9. Validación Beta diferida — MIG-026 AUTH: LoginRequests y operaciones fail-fast
**Estado: PENDIENTE.** Implementación y pruebas automatizadas locales aprobadas; no se ha ejecutado en un deployment AUTH real.

- Ejecutar primero la sincronización segura del apartado 0. Utilizar proyecto Apps Script, Spreadsheet, cuentas y sesiones desechables, nunca producción.
- En el primer login, confirmar creación de LoginRequests con los 10 encabezados exactos y marcador LOGIN_REQUEST_BASELINE_MARKER_. Probar baseline vacío y baseline con varias propiedades legacy login_request_; comprobar importación íntegra, read-back y marcador baseline_v1.
- Interrumpir la siembra antes de confirmar el marcador y reintentar. Debe completar solo las filas faltantes, no duplicar requestId y no aceptar registros distintos para la misma clave.
- Inyectar propiedad legacy JSON corrupta, requestId inválido, token/userId vacío, fecha inválida, fila duplicada, encabezados alterados y marcador desconocido. Debe fallar cerrado sin confirmar baseline.
- Repetir login con el mismo requestId y comprobar que devuelve el mismo token y no crea una segunda fila en ActiveSessions. Usar el mismo requestId con otro userId y confirmar rechazo. Simular append con respuesta perdida y confirmar recuperación por read-back.
- Verificar estados pending/committed/revoked, confirmación del puntero Users.SessionToken, revocación por token al cerrar sesión/expirar, revocación por userId al cambiar contraseña/eliminar usuario y rechazo de replays después de revocar.
- Avanzar el reloj más de 24 h. Confirmar limpieza rotatoria de máximo 25 registros por login, cursor persistente, invalidación de tokens pending vencidos y conservación de sesiones committed aunque expire su registro de idempotencia. Reutilizar un requestId vencido y comprobar nueva reserva segura.
- Ejecutar concurrencia controlada con requestId iguales y distintos, límites de sesión 1/3/5/ilimitado, respuesta perdida y operaciones de perfil/revocación simultáneas. Comprobar unicidad de tokens, puntero coherente, ausencia de sesiones duplicadas y recuperación con el mismo requestId.
- Mantener una ejecución AUTH ocupando el ScriptLock y lanzar login, cierre, cambio de perfil, recuperación y validación. Confirmar que ninguna función espera 10 s ni queda en cola: las operaciones que requieren lock usan tryLock(0) y responden de inmediato con contención reintentable; las lecturas que no requieren mutación continúan según su contrato.
- Confirmar por búsqueda estática que AUTH no contiene .waitLock(. Confirmar que las propiedades legacy login_request_ no se escriben ni eliminan y que solo se leen durante baseline si el marcador no existe.
- No borrar propiedades login_request_ instaladas durante esta prueba. La limpieza requiere baseline verificado, despliegue controlado y autorización Beta explícita. Registrar deployment, evidencia anonimizada y resultados por caso en Hallazgos_Beta.md.


## 10. Validación Beta diferida — MIG-026 AUTH: baseline role_revocation_pending_
**Estado: PENDIENTE.** El estado canónico compartido y el baseline local están implementados; falta la verificación en Spreadsheet/Apps Script real.

- Ejecutar primero la sincronización segura del apartado 0. Usar proyecto AUTH, Spreadsheet y usuarios desechables; nunca producción.
- Preparar propiedades legacy role_revocation_pending_<userId> con marcadores válidos: solo oldRole, con newRole y con newFullName. Ejecutar el baseline y comprobar que LoginRequests, fila 2 columna H, pasa de role_revocation_baseline_pending a role_revocation_baseline_v1.
- Confirmar que cada marcador se copia a Users.SessionToken con el prefijo compartido, que se verifica por read-back y que los campos userId/oldRole/newRole/markedAt/newFullName se preservan exactamente.
- Repetir tras interrupciones simuladas: después de escribir el estado pending, después de migrar una de varias cuentas y después de escribir el último marcador pero antes de confirmar el baseline. El reintento debe completar sin duplicar ni alterar marcadores.
- Inyectar JSON inválido, userId de clave y cuerpo distintos, ID duplicado, usuario inexistente/inactivo, rol actual no coincidente, marcador compartido corrupto y divergencia entre marcador legacy y compartido. Confirmar fail-closed y que el baseline no se marque completo.
- Confirmar que, una vez marcado role_revocation_baseline_v1, las rutas protegidas no vuelven a consultar PropertiesService para role_revocation_pending_. Verificar que hasPendingRoleRevocation_ y reconcileRoleRevocationUnderLock_ leen/escriben solo Users.SessionToken.
- Probar cambio de rol y nombre, degradación del último Desarrollador, cierre de sesión, recuperación de contraseña, eliminación de usuario y reintentos tras fallo de flush. Confirmar revocación de todas las sesiones y del ledger LoginRequests antes de limpiar el marcador compartido.
- Ejecutar dos operaciones de AUTH simultáneas. La adquisición de ScriptLock debe usar tryLock(0); la operación que encuentre contención debe responder inmediatamente, sin espera ni cola, y poder reintentarse. No debe quedar un marcador parcialmente aplicado que permita acceso con el rol anterior.
- No borrar las propiedades role_revocation_pending_ durante la prueba. La limpieza física requiere baseline verificado, despliegue controlado y autorización Beta explícita. Registrar deployment, evidencia anonimizada y resultados en Hallazgos_Beta.md.


## 11. Validación Beta diferida — MIG-026 ADMIN: ledger AdminOperationAudit
**Estado: PENDIENTE.** La implementación y los contratos locales están aprobados; no se ha ejecutado en Apps Script ni en una Spreadsheet real.

- Ejecutar primero la sincronización segura del apartado 0. Usar proyecto ADMIN, Spreadsheet, usuarios y operaciones desechables; nunca producción.
- Crear manualmente la hoja `AdminOperationAudit` en la Spreadsheet ADMIN. La fila 1 debe contener exactamente, en este orden, los 16 encabezados: `recordType`, `eventId`, `actorId`, `actorRole`, `action`, `resourceType`, `sourceResourceId`, `targetResourceId`, `startedAt`, `finishedAt`, `outcome`, `stage`, `durationMs`, `resultCode`, `partialResultJson`, `schemaVersion`. Dejar la fila 2 completamente vacía: el código escribe allí el marcador META/BASELINE y los eventos comienzan en la fila 3. No crear encabezados ni marcadores alternativos.
- Confirmar que la hoja/encabezados ausentes o alterados producen advertencia de auditoría y que la operación ADMIN funcional continúa; no debe detenerse ni esperar por el registro.
- Preparar propiedades legacy `GPSpedia_ADMIN_AUDIT_V1_<eventId>` con eventos iniciados y finalizados. Ejecutar baseline y verificar importación por lote, identidad eventId, campos permitidos, read-back y marcador `admin_audit_baseline_v1`. Repetir baseline y confirmar idempotencia sin filas duplicadas.
- Interrumpir antes del append por lote, después del append y antes de confirmar el marcador. El reintento debe completar filas faltantes, aceptar respuesta perdida cuando el lote quedó persistido y rechazar filas huérfanas, duplicados, JSON corrupto, eventId divergente, encabezados inválidos y estados desconocidos.
- Confirmar que el baseline nunca escribe ni elimina propiedades legacy. Después de `admin_audit_baseline_v1`, inicio, cierre y limpieza no deben volver a leer ScriptProperties para auditoría ADMIN. No borrar la propiedad legacy durante la prueba.
- Verificar que la hoja no almacena sessionToken, token, password, imageData, base64, mensajes ni payloads completos. Solo deben persistir actorId/rol, acción, tipo e IDs de recurso saneados, marcas de tiempo, outcome, stage, duración, resultCode y contadores/booleanos parciales permitidos.
- Probar retención de 180 días, máximo de 300 finalizados y 20 pendientes. Confirmar que STARTED no se purga automáticamente; al alcanzar 20 pendientes, un nuevo registro se rechaza y la operación funcional continúa con advertencia.
- Ejecutar operaciones ADMIN simultáneas. Mantener ScriptLock ocupado y lanzar inicio/cierre de auditoría junto con otra operación: todos los intentos deben usar `tryLock(0)`, responder inmediatamente y nunca esperar en `waitLock` ni en una cola. Si la auditoría no puede iniciar/finalizar, la respuesta funcional no debe perderse y debe informar la advertencia de auditoría.
- Confirmar que la limpieza de finalizados se realiza por lotes, que los locks se liberan tras errores y que una fila corrupta no se interpreta como evento válido. Registrar deployment, Spreadsheet de prueba, actor/rol, evidencia anonimizada y resultado por caso en `Hallazgos_Beta.md`.
- AdminAuditTrail 27/27 PASS y regresión CI 495 suites/5,799 pruebas/0 fallos son validaciones locales; no sustituyen esta prueba real. No desplegar ni ejecutar contra producción. La eliminación física de propiedades legacy requiere paridad confirmada y autorización Beta explícita.


## 12. Validación Beta diferida — MIG-026 ADMIN: ledger Safe Apply del organizador Cortes
**Estado: PENDIENTE DE BETA.** La migración local y sus contratos aprobaron CI (run 45324879054: 496 suites, 5,820 pruebas, 0 fallos); falta validar Apps Script, Spreadsheet y Drive reales en entorno aislado.

- Ejecutar primero la sincronización segura del apartado 0. Usar exclusivamente proyecto ADMIN, Spreadsheet y Drive Beta desechables.
- Crear manualmente \`CortesOrganizerOperations\` en la Spreadsheet vinculada a ADMIN. La fila 1 debe contener exactamente estos 20 encabezados, en este orden: \`operationId\`, \`ownerId\`, \`fileId\`, \`manifestDigest\`, \`auditId\`, \`status\`, \`attempts\`, \`sourceFolderPath\`, \`sourceName\`, \`targetFolderPath\`, \`targetName\`, \`currentFolderPath\`, \`currentName\`, \`createdAt\`, \`updatedAt\`, \`completedAt\`, \`rolledBackAt\`, \`error\`, \`recoveryError\`, \`schemaVersion\`. Dejar la fila 2 vacía; el código la reserva para \`META/BASELINE\`. Los eventos comienzan en fila 3. No crear el esquema automáticamente ni cambiar el orden.
- Preparar propiedades legacy \`GPSpedia_CORTES_ORGANIZER_OP_V1_<sha256(operationId)>\` con operaciones \`processing\`, \`complete\`, \`rolled_back\` y \`needs_review\`. Ejecutar baseline y verificar identidad operationId/propiedad, propietario, fileId, digest, estado, importación, read-back y marcador \`cortes_organizer_ledger_v1\`. Repetir y confirmar idempotencia.
- Interrumpir después de escribir \`pending\`, después de importar parte del lote y después de importar todas las filas pero antes del marcador final. Reintentar y confirmar que solo se agregan filas faltantes, no se duplican operationId y no se borran ni modifican propiedades legacy.
- Inyectar JSON corrupto, clave cuyo digest no coincide con operationId, filas duplicadas/huérfanas, schemaVersion desconocida, encabezados alterados y estado desconocido. Confirmar fallo cerrado, preservación de datos y ausencia de marcador final.
- Probar historial paginado por ownerId, orden por updatedAt, límites 1/25/50 y ausencia de token, password, payload, identidad de otro desarrollador o campos internos no permitidos.
- Verificar retención de 180 días, máximo 200 estados terminales y 250 registros totales. \`processing\`, \`rollback_processing\` y \`needs_review\` no deben purgarse automáticamente; si no hay capacidad segura, rechazar el nuevo registro sin modificar operaciones activas.
- Con dos archivos sintéticos diferentes, iniciar Safe Apply de forma solapada y comprobar que el trabajo Drive de una operación no mantiene el ScriptLock del ledger ni impide que la otra reserve/complete su propia operación. La adquisición de lock debe ser \`tryLock(0)\`; ninguna función espera en \`waitLock\` ni queda en cola. La contención del ledger devuelve estado retryable y no debe iniciar ni revertir el archivo.
- Para el mismo operationId, iniciar dos solicitudes controladas: solo una puede reservar la transición; la segunda debe detectar \`processing\` y no repetir el movimiento. Repetir para rollback.
- Simular respuesta perdida después del movimiento Drive y antes de guardar \`complete\`; el reintento debe inspeccionar el estado real y reconciliar el ledger sin repetir el movimiento. Repetir para rollback interrumpido después de devolver el archivo al origen.
- Probar ACL privada, conflicto de nombre, carpeta fuera de Cortes, archivo en papelera, metadata cambiada, error de Drive, error de Spreadsheet y rollback. Ninguna operación debe sobrescribir cambios manuales posteriores ni afectar archivos ajenos.
- Confirmar que, después de \`cortes_organizer_ledger_v1\`, Safe Apply e historial no vuelven a leer ScriptProperties para esta familia. No borrar propiedades legacy durante esta prueba; la limpieza física requiere autorización Beta explícita tras verificar el baseline.
- Registrar deployment, Spreadsheet/Drive aislados, rol, archivo sintético, operación, evidencia anonimizada y resultado en \`Hallazgos_Beta.md\`. Las suites locales no sustituyen esta validación real.


## 13. Validación Beta diferida — MIG-026 ADMIN: guardas temporales por recurso
**Estado: PENDIENTE DE BETA.** CI run 45325854986 aprobó 496 suites y 5,832 pruebas con 0 fallos; AdminLocalOperationGuard 12/12. Falta validar Apps Script/Spreadsheet aislados.

- Ejecutar primero la sincronización segura del apartado 0. Usar proyecto ADMIN, Spreadsheet y recursos Drive desechables.
- Crear manualmente la hoja AdminOperationGuards con estos 5 encabezados exactos en fila 1: scopeHash, requestId, expiresAt, updatedAt, schemaVersion. Dejar fila 2 vacía para META/BASELINE; las reservas empiezan en fila 3. No crear el esquema automáticamente.
- Preparar propiedades legacy GPSpedia_ADMIN_LOCAL_OPERATION_GUARD_V1_<sha256(scope)> con marcadores válidos activos y vencidos. Ejecutar baseline, confirmar que solo importa reservas no vencidas, que el marcador final es admin_local_guard_baseline_v1, que se verifica read-back y que no se escriben/eliminan propiedades.
- Interrumpir después de escribir pending y después de importar parte de las reservas; reintentar y comprobar idempotencia, ausencia de duplicados y preservación de los marcadores legacy.
- Inyectar JSON corrupto, hash inválido, requestId vacío, expiresAt no numérico/negativo, filas huérfanas/duplicadas, encabezados alterados y marcador desconocido. Debe fallar cerrado sin marcar baseline completo.
- Ejecutar dos funciones con el mismo scope: solo una obtiene reserva; la segunda responde de inmediato como operación equivalente en curso. Ejecutar funciones con scopes distintos de forma anidada/solapada y confirmar que no se bloquean entre sí.
- Mantener una operación Drive activa mientras se inicia otra función ADMIN independiente. Confirmar que el callback Drive corre sin ScriptLock, que la sección crítica solo cubre baseline/reserva/liberación y que todas las adquisiciones usan tryLock(0); no debe existir waitLock.
- Forzar que la limpieza no consiga lock. El marcador debe permanecer solo hasta expiresAt; una nueva reserva debe purgarlo y continuar. Probar callback con error y cleanup con respuesta perdida.
- Confirmar TTL mínimo 30 s y máximo 420 s, limpieza de vencidos y capacidad máxima segura de 500 reservas activas. Ninguna función debe esperar por otra ni mantener lock durante Drive/Spreadsheet prolongado.
- Después de admin_local_guard_baseline_v1, confirmar que el flujo ordinario no vuelve a consultar ScriptProperties para esta familia. No borrar propiedades legacy durante Beta; limpieza física requiere autorización explícita.
- Registrar deployment, Spreadsheet, actor, scopes sintéticos, resultados y evidencia anonimizada en Hallazgos_Beta.md.


## 14. Validación Beta diferida — MIG-026 ADMIN: DriveAuditRuns
**Estado: PENDIENTE DE BETA.** CI run 45327051980 aprobó 496 suites y 5,841 pruebas, 0 fallos. Falta validar Apps Script, Spreadsheet y Drive reales en entorno aislado.

- Ejecutar primero la sincronización segura del apartado 0. Usar proyecto ADMIN, Spreadsheet y Drive desechables.
- Crear manualmente DriveAuditRuns con estos 8 encabezados exactos en fila 1: auditId, ownerId, status, createdAt, updatedAt, expiresAt, stateJson, schemaVersion. Fila 2 vacía para META/BASELINE; estados desde fila 3. No crear la hoja automáticamente.
- Preparar propiedades legacy GPSpedia_DRIVE_AUDIT_STATE_<auditId> con estados running y complete. Verificar importación de auditId, ownerId, status, timestamps y JSON completo; marcador drive_audit_state_baseline_v1; read-back; idempotencia; reanudación tras pending; y preservación de propiedades legacy.
- Preparar un estado legacy vencido (>6 h) y uno con timestamp futuro fuera de tolerancia. El vencido se omite del baseline y se limpian sus caches/último puntero asociado; el futuro inválido falla cerrado. JSON corrupto, clave/auditId discordante, owner vacío, status vacío, filas duplicadas/huérfanas, schemaVersion desconocida y encabezados alterados deben fallar sin borrar propiedades.
- Confirmar stateJson máximo 8,000 caracteres y máximo 500 estados; el estado reanudable debe conservar progreso, cursor, fingerprints, contadores, métricas, digest de archivos y resumen de inventario. No guardar páginas, respuestas ni snapshots grandes en celdas: deben permanecer en CacheService con TTL de 6 horas.
- Interrumpir el baseline en pending, durante importación parcial y antes del marcador final. Reintentar y confirmar que solo se importan filas faltantes.
- Simular save con error de Spreadsheet y respuesta perdida. Read-back debe decidir si la escritura quedó confirmada; no aceptar persistencia ambigua.
- Iniciar auditorías de dos propietarios distintos de forma solapada. La reserva/actualización del ledger debe usar tryLock(0), no waitLock; la sección crítica solo cubre la hoja, nunca Drive. Contención responde retryable y no bloquea ni deja en cola otra función.
- Confirmar que load y validación de estado son lecturas y no retienen ScriptLock; save y cleanup liberan el lock al terminar. Cleanup elimina filas expiradas por lotes, y la eliminación de caches/último puntero ocurre fuera del lock.
- Confirmar que cleanup no elimina ni modifica las propiedades legacy GPSpedia_DRIVE_AUDIT_STATE_. El puntero GPSpedia_DRIVE_AUDIT_LATEST_ sigue siendo una familia separada y debe probarse por su tarea propia.
- Después del baseline, confirmar que load/save/cleanup de estado no vuelven a obtener ScriptProperties. Las únicas lecturas restantes en este flujo corresponden al puntero latest, aún no migrado.
- Registrar deployment, Spreadsheet, owners, auditIds sintéticos, cursores, resultados y evidencia anonimizada en Hallazgos_Beta.md.


## 15. Validación Beta diferida — MIG-026 ADMIN: DriveAuditLatest
**Estado: PENDIENTE DE BETA.** CI run 45327887713 aprobó 496 suites, 5,856 pruebas y 0 fallos; AdminReplacedImagesIntegrity 64/64. Falta validar Apps Script/Spreadsheet reales en entorno aislado.

- Ejecutar primero la sincronización segura del apartado 0. Usar proyecto ADMIN y Spreadsheet Beta desechables.
- Crear manualmente DriveAuditLatest con 5 encabezados exactos en fila 1: ownerHash, ownerId, latestAuditId, updatedAt, schemaVersion. Fila 2 META/BASELINE; registros desde fila 3. No crear la hoja automáticamente.
- Preparar propiedades legacy GPSpedia_DRIVE_AUDIT_LATEST_<sha256(ownerId)[0:32]> cuyo auditId corresponda a un estado completo vigente en DriveAuditRuns. Verificar que el baseline resuelve el owner a partir de estados por auditId, confirma read-back y marca drive_audit_latest_baseline_v1.
- Preparar punteros huérfanos cuyo estado no exista o esté vencido. Deben omitirse sin borrar ni modificar propiedades legacy. Un hash truncado que coincida con más de un owner debe fallar cerrado. Un auditId de otro owner o estado no completo debe fallar cerrado.
- Interrumpir baseline en pending y después de importar parte de los punteros; reintentar y confirmar idempotencia y ausencia de filas duplicadas por ownerHash.
- Probar getLatest por dos owners, rechazo de acceso cruzado, estado running no entregable como última auditoría completa y estado complete entregable.
- Probar save/upsert con read-back, respuesta perdida, ownerHash duplicado, auditId inválido, fila huérfana y schemaVersion desconocida.
- Expirar un estado DriveAuditRuns y confirmar que cleanup elimina el puntero correspondiente en DriveAuditLatest solo después de que su baseline esté completo. Antes del baseline, las propiedades latest legacy deben permanecer intactas.
- Ejecutar finalización de auditorías distintas de forma solapada. El lock debe ser tryLock(0), solo durante baseline/upsert/cleanup; nunca durante Drive. Contención retryable, sin waitLock ni cola.
- Después de drive_audit_latest_baseline_v1, confirmar que getLatest, save y cleanup no vuelven a obtener ScriptProperties para esta familia. No borrar propiedades legacy durante Beta; limpieza física requiere autorización explícita.
- Registrar owners, auditIds sintéticos, Spreadsheet, resultado y evidencia anonimizada en Hallazgos_Beta.md.


## 16. Validación Beta diferida — MIG-026 ADMIN: contador de IDs LogosMarca
**Estado: PENDIENTE DE BETA.** CI run 45366702261 aprobó 499 suites y 5,886 pruebas con 0 fallos; LogoIdIntegrity 18/18, AdminLogoWriteLockNonBlocking 6/6 y LogoIdReservationLedger 10/10. La migración local utiliza LogoIdReservations y mantiene la propiedad legacy como solo lectura durante el baseline; falta validar el proyecto ADMIN y la Spreadsheet aislada.

- Ejecutar primero la sincronización segura del apartado 0. Usar exclusivamente proyecto ADMIN y Spreadsheet Beta desechables; no usar producción.
- Crear manualmente la hoja `LogoIdReservations` con estos cinco encabezados exactos en fila 1: `recordType`, `reservationId`, `logoId`, `createdAt`, `schemaVersion`. Dejar la fila 2 vacía para META/BASELINE; las reservas comienzan en fila 3. No crear el esquema automáticamente ni cambiar el orden.
- Preparar `LOGOS_MARCA_ID_COUNTER` con valores ausente, igual al máximo de LogosMarca y superior al máximo visible. Ejecutar el baseline y confirmar que el high-water inicial es el máximo entre la propiedad legacy y los IDs numéricos válidos de LogosMarca; el marcador final debe ser `logo_id_counter_baseline_v1` y cada escritura debe confirmarse por read-back.
- Interrumpir después de escribir `pending` y antes de confirmar el marcador final. Repetir el baseline y verificar reanudación, idempotencia y ausencia de reservas duplicadas. El baseline nunca debe ejecutar `setProperty` ni `deleteProperty` sobre la propiedad legacy.
- Después del baseline, crear varios logotipos y confirmar que cada ID queda reservado una sola vez, es estrictamente mayor que el high-water previo y se conserva aunque falle posteriormente la escritura de la fila LogosMarca. Los huecos por reservas fallidas son válidos; nunca se debe reutilizar un ID.
- Inyectar contador legacy negativo/no numérico, encabezados incorrectos, hoja ausente, IDs de LogosMarca duplicados, no enteros, filas con datos sin ID, reservas duplicadas, reservationId vacío, schemaVersion desconocida y filas parcialmente escritas. Confirmar fallo cerrado sin sobrescribir ni eliminar datos.
- Ejecutar dos altas simultáneas y comprobar IDs distintos, filas no duplicadas y recuperación ante respuesta perdida. La sección crítica usa exclusivamente `tryLock(0)`; la contención debe responder inmediatamente con `ADMIN_BUSY`, sin espera ni cola. Reintentar una solicitud que no obtuvo lock debe producir un nuevo intento seguro.
- Mantener una carga/operación Drive activa y ejecutar otras acciones ADMIN independientes. Confirmar que Drive se ejecuta fuera del ScriptLock, que el escaneo inicial de LogosMarca ocurre antes del lock y que la sección crítica se limita a baseline/reserva y escritura breve en Spreadsheet. Ninguna función debe esperar por otra.
- Tras `logo_id_counter_baseline_v1`, confirmar que las altas ordinarias no consultan `PropertiesService` para esta familia. No borrar `LOGOS_MARCA_ID_COUNTER` durante la prueba; su limpieza física requiere despliegue verificado y autorización Beta explícita.
- Registrar deployment, Spreadsheet aislada, contador inicial, máximo visible, IDs reservados, concurrencia, evidencia anonimizada y resultados por caso en `Hallazgos_Beta.md`.


## 17. Validación Beta diferida — MIG-026 búsqueda estática global de configuración
**Estado: PENDIENTE DE BETA.** La auditoría local está registrada en `MIG026_BUSQUEDA_ESTATICA_FINAL.md`. No se modificaron deployments ni propiedades instaladas.

- Ejecutar la sincronización segura del apartado 0 y utilizar únicamente deployments y Spreadsheet Beta aislados.
- Verificar en el archivo principal de cada proyecto desplegado que el propio servicio declare su ID de Spreadsheet y lo abra mediante openById; no depender de que CentralConfigurationReader.js haya sido copiado para resolver el recurso. En WRITE, FEEDBACK y ADMIN verificar además la declaración local del ID de la carpeta Cortes. La prueba debe usar IDs de recursos Beta aislados; nunca sustituirlos por IDs productivos durante la validación.
- En AUTH, ejecutar un login con usuario sintético y confirmar el read-back de las filas pending/committed en LoginRequests. Repetir la misma solicitud con el mismo requestId: debe recuperar el mismo resultado sin crear filas ni sesiones duplicadas. Verificar que los campos de fecha y committedAt se leen correctamente después de la conversión de tipos de Sheets; no registrar tokens ni datos personales en la evidencia.
- En WRITE, FEEDBACK y ADMIN, comprobar lectura de la carpeta Cortes con el ID local del proyecto y la identidad efectiva de ejecución. La comprobación inicial debe ser de solo lectura; no mover, crear ni borrar archivos.
- Para AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN, inspeccionar ScriptProperties en modo solo lectura. Registrar únicamente nombres de propiedades y clasificación; nunca copiar ni revelar valores. Confirmar que no existan claves, tokens manuales, secretos compartidos, URLs de otros servicios, IDs de recursos ajenos ni configuración de Coordinator/SharedMutation. No borrar propiedades legacy durante la inspección.
- Verificar que las propiedades legacy de los baselines migrados no se consultan después de confirmar sus marcadores versionados. La prueba debe cubrir AUTH, WRITE y ADMIN con los ledgers/hojas indicados en los apartados anteriores.
- Confirmar que el único localizador estático de deployment es `CENTRAL_CONFIGURATION_BOOTSTRAP_URL` en el frontend, limitado a `getPublicConfiguration` de AUTH. Confirmar que el resto de endpoints procede del registro central, sin fallback local.
- Ejecutar MIG-006 por cada identidad/deployment de AUTH, CATALOG y UTILITIES: comprobar si `SpreadsheetApp.getActiveSpreadsheet()` devuelve un contenedor activo en Web App real, lectura/escritura limitada a la hoja desechable, permisos y concurrencia. No sustituir `openById()` ni retirar los tres `SPREADSHEET_ID` hasta tener evidencia real para cada proyecto.
- Confirmar que no existen llamadas HTTP Apps Script→Apps Script hacia servicios GPSpedia. Las llamadas a Drive API v3, YouTube Data API y descargas de imágenes externas se clasifican como integraciones externas, no como coordinación entre servicios.
- Confirmar que Coordinator y SharedMutation no tienen deployments activos ni propiedades requeridas por versiones vigentes. Registrar el estado de versiones sin exponer URLs privadas, tokens o secretos.
- Registrar HEAD, deployment, identidad efectiva, nombre de propiedad (sin valor), resultado y evidencia anonimizada. No desplegar a producción ni modificar propiedades/hojas productivas.


## 18. Validación Beta diferida — AUG-144: encabezado del modal de detalle
**Estado: PENDIENTE DE VALIDACIÓN VISUAL.** La implementación y los contratos locales/CI están aprobados en el commit `1d20ee06ac8c989deabea98a9ddd89d3928aa624`; no se ejecutó comparación de navegador ni se desplegó el frontend en Beta.

- Ejecutar primero la sincronización segura del apartado 0. Usar un entorno frontend Beta autorizado y registros sintéticos de dispositivos; no usar datos personales ni vehículos productivos.
- Antes de aplicar la versión nueva, registrar los límites x, y, width, height de cada botón de edición, impresión, compartir y cerrar mediante getBoundingClientRect(), en los mismos viewports que se usarán después. Identificar cada control por su etiqueta accesible, no por el orden visual únicamente.
- Publicar únicamente la versión frontend autorizada que contiene el commit indicado. No desplegar ni modificar servicios Apps Script para esta prueba. Repetir la captura en exactamente los mismos tamaños de viewport y comparar los cuatro botones; la diferencia aceptada en cada coordenada y dimensión es 0 px (tolerancia máxima de medición: 0.5 px). Si algún botón cambia de posición o tamaño, registrar el fallo y no aceptar AUG-144.
- Viewports mínimos: escritorio 1366×768; móvil 390×844, 360×800 y 320×700. Probar roles que muestren dos y cuatro botones cuando estén disponibles en Beta.
- Verificar con el rectángulo del modal como referencia: logo de 66 px de alto, ancho automático y proporción natural; borde superior e izquierdo a 6 px; modelo a la derecha con gap horizontal de 6 px; bordes inferiores de los contenedores de logo/modelo alineados; borde superior de la línea azul a 6 px del borde inferior del conjunto.
- Probar logotipos apaisados, cuadrados y verticales, nombres cortos y largos, y el modo de edición del modelo. Confirmar que los nombres largos pasan al fallback debajo del logo sin solaparse con los botones, que la línea azul mantiene el espacio requerido y que no aparece desplazamiento horizontal.
- Registrar capturas antes/después, viewport, rol, dimensiones de cada botón, dimensiones del logo/modelo/línea y resultado por criterio en Hallazgos_Beta.md. Anonimizar las capturas y retirar cualquier dato del dispositivo.
- Si no se dispone de un navegador/viewport o rol, marcar ese caso como NO EJECUTADO; no inferir aprobación a partir de CI ni de la revisión estática del CSS.

## 19. Validación Beta diferida — configuración central y actualización de endpoints AUTH
**Estado: PENDIENTE DE EJECUCIÓN OPERATIVA.** La inicialización, publicación versionada, modal Developer y flujo manual están implementados y aprobados en CI. No se ejecutaron contra la Spreadsheet real ni se desplegó Apps Script.

1. Preparar una copia aislada de la Spreadsheet central y los seis proyectos/deployments Beta. Confirmar que el único localizador CENTRAL_CONFIGURATION_BOOTSTRAP_URL apunta al deployment AUTH Beta.
2. Desplegar en AUTH Beta la versión que contiene initializeCentralConfigurationSheets(), prepareCentralConfigurationServiceUrlInput() y publishCentralConfigurationFromServiceUrlDraft(). Autorizar el acceso Google normal a la Spreadsheet aislada.
3. Ejecutar prepareCentralConfigurationServiceUrlInput() desde el editor Apps Script AUTH. En las seis filas de borrador de Servicios, completar únicamente endpoint_url con las URL de los deployments Beta correspondientes. No editar otras columnas ni las filas de revisiones publicadas.
4. Ejecutar publishCentralConfigurationFromServiceUrlDraft() y verificar que AUTH genere los metadatos restantes, seis filas de servicio para la revisión, esquema y valor inicial rich_text_mode=strict, recurso Cortes respaldado por el ID autorizado, historial append-only y publication_state=READY solo después de validar el snapshot.
5. Comprobar getPublicConfiguration desde el frontend Beta y confirmar que el router resuelve los seis endpoints desde la configuración central. Verificar health GET ?debug=true de cada deployment, sin llamadas Apps Script→Apps Script.
6. Iniciar sesión en GPSpedia Beta con rol Desarrollador. Abrir Herramientas de desarrollador → Sistema → Endpoints de servicios, confirmar que carga las cinco URL editables (CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN). AUTH no aparece en el modal: su URL se actualiza directamente en el frontend. Actualizar una de las cinco URL Beta y comprobar que se publica una nueva revisión completa, conservando sin cambios la URL AUTH administrada por el frontend, conserva parámetros/recursos, registra historial y refresca la caché.
7. Repetir con una cuenta sin rol Desarrollador y con sesión inválida: lectura y escritura deben fallar cerradas. Probar URL HTTP, URL malformada, deployments duplicados, revisión sin cambios, request repetido y lock ocupado; ninguna prueba inválida debe cambiar active_revision.
8. Verificar el flujo manual sin sesión GPSpedia: el editor Apps Script no solicita usuario/contraseña/token de GPSpedia; solo la autorización Google necesaria para acceder a la Spreadsheet.
9. Para probar cambio de URL AUTH, mantener disponible el bootstrap anterior durante la transición. Cambiar el único localizador fijo del frontend únicamente en Beta, publicar el frontend Beta y verificar lectura antes de retirar el deployment anterior. No crear un segundo bootstrap ni fallback local.
10. Registrar HEAD, revisiones, deployments, identidad Google efectiva, resultados, historial y evidencias anonimizadas en Hallazgos_Beta.md. No usar datos productivos ni desplegar a producción sin autorización expresa.
