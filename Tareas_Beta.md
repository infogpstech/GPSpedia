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

## 20. Validación Beta diferida — AUG-146: encabezado y panel Developer
**Estado: VALIDACIÓN AUTOMATIZADA DE NAVEGADOR COMPLETADA; PENDIENTE DE VALIDACIÓN MANUAL EN DISPOSITIVOS FÍSICOS.** La suite Playwright ejecuta el frontend real del repositorio en Chromium con sesión y datos sintéticos; las solicitudes externas se aíslan y no se invocan deployments Apps Script ni recursos productivos.

**Evidencia automatizada:** CI run [45494991186](https://github.com/infogpstech/GPSpedia/actions/runs/45494991186), commit `de833ce9d2575c276789542bdc45f2dbadcaa59f`: SUCCESS; 148/148 aserciones, cuatro viewports (1366×768, 390×844, 360×800 y 320×700), modo de edición incluido y 12 capturas sintéticas. Artefacto: [aug-146-responsive-browser-evidence](https://github.com/infogpstech/GPSpedia/actions/runs/45494991186/artifacts/14966794425). Regresión general en el mismo run: 516 suites, 6,115 pruebas aprobadas y 0 fallos.

La comprobación manual en dispositivos físicos/navegadores de campo permanece pendiente. Ejecutar primero la sincronización segura del apartado 0 y usar únicamente frontend Beta autorizado, cuentas sintéticas y recursos aislados.

1. Registrar navegador, dispositivo, resolución y rol. Viewports mínimos: escritorio 1366×768; móvil 390×844, 360×800 y 320×700.
2. Modal de detalle: probar logos apaisados, cuadrados y verticales; nombres cortos y largos; edición, guardado, deshacer y aceptar. Confirmar márgenes iguales del logo, cuadrícula estable, campo de edición sin solapamiento, estado «Guardando…» sobre el nombre y metadatos bajo la línea azul. Repetir la comparación de botones y límites descrita en el apartado 18; no aceptar desplazamientos de los controles.
3. Panel Developer: confirmar consola compacta y navegación en escritorio; en móvil, título «Consola» a la izquierda, limpiar/copiar en la misma línea, prompt dentro del campo y botón >_ al extremo derecho. Cambiar entre las cuatro pestañas y verificar que la etiqueta solo se expande en la pestaña seleccionada.
4. Ayuda contextual: abrir el modal y comprobar que las explicaciones extensas permanecen ocultas. Activar cada botón de información y verificar que el contenido aparece, que aria-controls/aria-expanded se actualizan y que teclado/foco funcionan. Probar prefers-reduced-motion.
5. Operación: limpiar consola, copiar registro, ejecutar comandos y navegar entre pestañas; confirmar que los efectos existentes se conservan. Comprobar que no se muestra el apartado de tráfico global retirado ni títulos duplicados.
6. Mensajes: ejecutar operaciones sintéticas exitosas y fallidas de cortes, modelos e imágenes. Confirmar que la interfaz muestra mensajes breves y que los detalles técnicos quedan únicamente en el logger interno autorizado. No incluir tokens, VIN, datos personales ni trazas en capturas.
7. Endpoints: realizar las pruebas reales de publicación, revisión activa, RBAC, reintentos e idempotencia únicamente conforme al apartado 19, con Spreadsheet y deployments Beta aislados. No modificar revisiones históricas.
8. La evidencia automatizada de Chromium ya está archivada en el artefacto indicado arriba. Para la validación manual, registrar dispositivo físico, navegador, viewport, rol, capturas anonimizadas y resultado por criterio en Hallazgos_Beta.md. Si no se dispone de dispositivo, navegador, viewport o rol, marcar NO EJECUTADO; no inferir una prueba física a partir de CI.
9. No desplegar Apps Script ni modificar endpoints, propiedades, Spreadsheet, Drive, permisos o datos productivos.


## 21. Validación Beta diferida — REV-2026-11-24: panel Developer, dashboard de actividad y feed CATALOG

**Estado: IMPLEMENTACIÓN Y CI COMPLETADOS; PENDIENTE DE VERIFICACIÓN OPERATIVA EN BETA AISLADA.** No se considera validada la lectura real de FEEDBACK ni la inicialización real de CATALOG hasta ejecutar los pasos siguientes en el entorno Beta autorizado.

**Evidencia automatizada actualizada:**
- HEAD probado: `711ce5f5733dd0c48804c810af97ba6913cc1b0e`.
- CI run [45509850708](https://github.com/infogpstech/GPSpedia/actions/runs/45509850708): SUCCESS; 517 suites, 6,160 pruebas aprobadas, 0 fallos.
- Playwright/Chromium: 236/236 aserciones PASS en 1366×768, 390×844, 360×800 y 320×700.
- GitHub Pages run [45509849705](https://github.com/infogpstech/GPSpedia/actions/runs/45509849705): SUCCESS.
- `DeveloperPanelUX` 11/11 PASS; `DeveloperOperationMessages` 8/8 PASS.
- El Dashboard y los endpoints usan respuestas sintéticas/contratos locales en CI. No se consulta una Spreadsheet Beta real ni se demuestra que los deployments remotos estén actualizados.

**1. Panel Developer**
1. Confirmar que la consola y su línea de comandos aparecen antes de la barra de pestañas, tanto en escritorio como en móvil.
2. Verificar que la consola ocupa aproximadamente 48% de la altura útil y todo el ancho disponible; comprobar que la salida conserva scroll.
3. Cambiar entre Diagnóstico, Base de datos, Imágenes y Sistema. La pestaña seleccionada debe mostrar icono y etiqueta; las no seleccionadas, únicamente icono. Confirmar que no hay solapamientos ni desplazamientos inesperados.
4. Verificar que título, ayuda, limpiar consola y copiar registro permanecen agrupados y alineados.
5. En Endpoints de servicios, confirmar que carga, validación, publicación, resultado individual de cada servicio, idempotencia/sin cambios y errores aparecen únicamente en la consola Developer. No debe aparecer mensaje bajo el botón.
6. Confirmar que el botón se llama **Actualizar Servicios**. En una configuración idéntica, verificar que cada endpoint se informa como sin cambios y que no se declara actualización donde la URL permanece igual.
7. Ejecutar únicamente consultas/acciones read-only o cambios autorizados sobre endpoints Beta aislados. No actualizar endpoints productivos.

**2. Dashboard de actividad / FEEDBACK**
1. Publicar en el deployment FEEDBACK Beta el código fuente aprobado que incluye diagnósticos de disponibilidad, persistencia de actividad y contribuciones. No publicar en producción.
2. Confirmar que la Spreadsheet FEEDBACK Beta corresponde al ID autorizado y revisar las hojas `ActividadUsuario`, `InboxAuditLog`, `Cortes`, `Users`, `AportesVehiculo`, `Feedbacks` y `FeedbackYearApplications` según las funciones habilitadas.
3. Abrir Dashboard de actividad con una cuenta autorizada y registrar la respuesta de `getActivityLogs`: `diagnostics.activitySheetAvailable`, `activityRowsAvailable`, `inboxAuditSheetAvailable`, `inboxAuditRowsAvailable`, `cortesSheetAvailable` y `cortesRowsAvailable`.
4. Si `activitySheetAvailable` o `cortesSheetAvailable` es `false`, detener la prueba y corregir el esquema en la Spreadsheet Beta aislada. No crear hojas ni alterar encabezados de forma improvisada.
5. Generar únicamente actividad y aportes sintéticos autorizados si las hojas están vacías. Comprobar por separado el historial, total de modelos/vehículos distintos, cortes, suma de utilidades/votos y contribuciones por usuario.
6. En la tabla por usuario, comprobar que **Cortes aportados**, **Aportes registrados** y **Vehículos con aportes** son valores independientes; los aportes registrados pueden incluir apertura/alimentación y no deben presentarse como si fueran cortes.
7. Verificar estado vacío cuando no hay registros y diagnóstico explícito cuando FEEDBACK falla o falta una hoja. Registrar respuesta y evidencia anonimizada en `Hallazgos_Beta.md`.

**3. Feed incremental / CATALOG**
1. Confirmar que el proyecto CATALOG Beta apunta a la Spreadsheet Beta autorizada; no asumir que el ID de otra implementación es el correcto.
2. Publicar en CATALOG Beta el código aprobado y ejecutar manualmente `initializeCatalogChangeFeedSheets()` una sola vez desde el editor Apps Script autorizado.
3. Verificar que se crean/validan `CatalogChangeState` y `CatalogChangeEvents` con sus encabezados esperados; confirmar revisión inicial, cursor y lectura de `getCatalogChanges`.
4. Reiniciar la aplicación y comprobar que el cursor inicial se establece sin error y que las actualizaciones incrementales funcionan. Confirmar también el fallback a snapshot completo ante un fallo transitorio.
5. La aplicación no crea estas hojas durante una lectura normal. El aviso informativo de inicialización pendiente no sustituye la ejecución manual ni declara disponible el feed.

**Límites:** las pruebas CI no ejecutan Apps Script, no escriben en Spreadsheet/Drive y no validan deployments remotos. No desplegar servicios Apps Script ni modificar propiedades, permisos, hojas, archivos Drive o datos productivos. Registrar cualquier paso no disponible como NO EJECUTADO; no inferir aprobación a partir de la simulación.

## 22. Validación Beta diferida — FEEDBACK: inicialización y persistencia de actividad

**Estado: CORRECCIÓN LOCAL COMPLETADA; PENDIENTE DE VERIFICACIÓN EN BETA AISLADA.** La implementación permite registrar actividad aunque `ActividadUsuario` todavía no tenga una fórmula de ID ni una configuración de secuencia. La fórmula histórica se conserva cuando existe; en una hoja sin patrón se usa un ID estático único `ACT-<UUID>`. Los patrones incompatibles siguen fallando cerrados.

### Sincronización segura obligatoria

Ejecutar desde el clon local del repositorio `infogpstech/GPSpedia`. Estos comandos no descartan cambios locales y detienen la secuencia si el repositorio, rama o árbol no coinciden:

```bash
test "$(basename "$(git rev-parse --show-toplevel)")" = "GPSpedia" || { echo "Repositorio incorrecto"; exit 1; }
case "$(git remote get-url origin)" in *github.com/infogpstech/GPSpedia*) ;; *) echo "Origin no corresponde a infogpstech/GPSpedia"; exit 1 ;; esac
test "$(git branch --show-current)" = "GPSpedia2.2.5_work" || { echo "Rama incorrecta"; exit 1; }
test -z "$(git status --porcelain)" || { echo "Hay cambios locales; guardar o resolverlos antes de sincronizar"; exit 1; }
git fetch origin GPSpedia2.2.5_work || exit 1
git pull --ff-only origin GPSpedia2.2.5_work || exit 1
git rev-parse HEAD
```

### Evidencia local ya aprobada

- HEAD: `a13dd84379e575d06f0a4e73bc1909cdad346f1d`.
- CI run [45502874404](https://github.com/infogpstech/GPSpedia/actions/runs/45502874404): SUCCESS; 517 suites, 6,139 pruebas aprobadas, 0 fallos.
- `ActivityLogAppendAtomic`: 10/10 PASS; `ActivityLogsBoundedRead`: 8/8 PASS; pruebas de contribuciones e indicadores PASS.
- GitHub Pages run [45502874103](https://github.com/infogpstech/GPSpedia/actions/runs/45502874103): SUCCESS.
- Las pruebas locales no consultan ni modifican la Spreadsheet Beta o productiva.

### Pasos en Beta aislada

1. Confirmar que el deployment FEEDBACK y la Spreadsheet utilizados pertenecen al entorno Beta autorizado. Registrar sus identificadores/versiones sin exponer tokens ni datos personales.
2. Publicar únicamente en el deployment FEEDBACK Beta el código aprobado en la rama de trabajo. No modificar el deployment de producción.
3. Revisar en la Spreadsheet Beta la hoja `ActividadUsuario` y confirmar que sus siete encabezados corresponden a `id,timestamp,idUsuario,nombreUsuario,tipoActividad,idElementoAsociado,detalle`. No crear ni renombrar hojas de forma improvisada.
4. Si la hoja no tiene filas de datos y no existe patrón de fórmula/configuración, generar un evento sintético autorizado desde la aplicación (por ejemplo, vista de un vehículo de prueba). Confirmar que se agrega una fila con ID `ACT-<UUID>`, fecha, actor, tipo, referencia y detalle.
5. Generar un segundo evento y confirmar que se agrega otra fila con un ID diferente. Si la hoja ya tenía fórmula válida, confirmar que la fórmula histórica continúa generando los IDs.
6. Abrir Dashboard de actividad y comprobar que `getActivityLogs` devuelve el evento reciente y que la tabla lo presenta. Revisar `activitySheetAvailable`, `activityRowsAvailable`, `inboxAuditSheetAvailable`, `inboxAuditRowsAvailable`, `cortesSheetAvailable` y `cortesRowsAvailable`.
7. Comprobar por separado los aportes e indicadores con datos sintéticos autorizados. Si las hojas existen pero están vacías, registrar estado vacío; no declarar un fallo de carga únicamente por ausencia de registros.
8. Si el evento no aparece, conservar respuesta FEEDBACK, diagnóstico, nombre de la hoja y conteo de filas para aislar si la falla está en escritura, lectura, autorización o deployment. No alterar datos para forzar el resultado.
9. Registrar evidencia anonimizada y resultado en `Hallazgos_Beta.md`. Si no se dispone de deployment/Spreadsheet Beta aislados, marcar cada paso como NO EJECUTADO.

**Límites:** no utilizar Spreadsheet, Drive, propiedades, permisos, cuentas, datos ni deployments productivos. No ejecutar cargas reales ni modificar recursos externos fuera del alcance autorizado.


## 23. Validación Beta diferida — imagen de tarjeta en alta de Tutorial

**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE DE VALIDACIÓN CON DRIVE Y SPREADSHEET BETA AISLADOS.** El formulario acepta imagen opcional JPEG/PNG/WebP de hasta 3 MB. FEEDBACK valida el contenido y guarda el archivo en `Cortes/Tutoriales`; la hoja Tutorial conserva únicamente la referencia en la columna C `Imagen`.

### Sincronización segura obligatoria

Ejecutar desde el clon local del repositorio `infogpstech/GPSpedia`. Los comandos no descartan cambios y detienen la secuencia si el repositorio, rama o árbol no coinciden:

```bash
test "$(basename "$(git rev-parse --show-toplevel)")" = "GPSpedia" || { echo "Repositorio incorrecto"; exit 1; }
case "$(git remote get-url origin)" in *github.com/infogpstech/GPSpedia*) ;; *) echo "Origin no corresponde a infogpstech/GPSpedia"; exit 1 ;; esac
test "$(git branch --show-current)" = "GPSpedia2.2.5_work" || { echo "Rama incorrecta"; exit 1; }
test -z "$(git status --porcelain)" || { echo "Hay cambios locales; guardar o resolverlos antes de sincronizar"; exit 1; }
git fetch origin GPSpedia2.2.5_work || exit 1
git pull --ff-only origin GPSpedia2.2.5_work || exit 1
git rev-parse HEAD
```

### Evidencia local aprobada

- Commit de implementación: `58e6ca989bc39d2fbc13a3ba5ae7c65f780370be`.
- CI run [45504362878](https://github.com/infogpstech/GPSpedia/actions/runs/45504362878): SUCCESS; 517 suites, 6,147 pruebas, 0 fallos.
- `TutorialIntegrity`: 47/47 PASS; cubre alta, validación binaria, asociación de referencia, reintento idempotente, rechazo de contenido distinto, recuperación y proyección CATALOG.
- Chromium responsive: 184/184 PASS en 1366×768, 390×844, 360×800 y 320×700.
- GitHub Pages run [45504362787](https://github.com/infogpstech/GPSpedia/actions/runs/45504362787): SUCCESS.
- CI no utiliza ni modifica Drive o Spreadsheet Beta/productivo.

### Pasos en Beta aislada

1. Confirmar que el deployment FEEDBACK y la Spreadsheet/Drive pertenecen al entorno Beta autorizado. No utilizar identificadores ni cuentas productivas.
2. Publicar únicamente el código FEEDBACK aprobado en el deployment Beta existente. No modificar producción ni ejecutar despliegues globales.
3. Iniciar sesión como Desarrollador y abrir Agregar Tutorial.
4. Completar los campos obligatorios y seleccionar una imagen sintética JPEG, PNG o WebP de menos de 3 MB. Confirmar que el formulario rechaza archivos de otro formato y archivos superiores al límite antes de enviar.
5. Guardar el tutorial. Confirmar que FEEDBACK devuelve éxito y que la fila se registra en la hoja canónica `Tutorial`.
6. Revisar la columna C `Imagen`: debe contener una referencia `https://drive.google.com/file/d/.../view`, no Base64 ni datos binarios. Las demás columnas y encabezados deben conservar su orden.
7. Revisar Drive Beta: debe existir un único archivo determinista dentro de la carpeta hija directa `Cortes/Tutoriales`. Confirmar MIME, tamaño, descripción de operación y estado `linked`.
8. Confirmar que el archivo conserva los permisos heredados de la carpeta. No cambiar acceso, compartir públicamente ni ajustar permisos para forzar la visualización.
9. Actualizar/abrir el catálogo y confirmar que la tarjeta del tutorial muestra la imagen correcta. Verificar que CATALOG normaliza la referencia a ID y que el frontend usa la imagen optimizada.
10. Si la respuesta de alta es incierta, reintentar desde el mismo modal conservando la selección y la operación; no abrir otro tutorial ni cambiar la imagen para el mismo intento. Confirmar que no aparece una segunda fila ni un segundo archivo.
11. Repetir con un tutorial sintético sin imagen y confirmar que el alta histórica sigue funcionando con la columna C vacía.
12. Registrar evidencia anonimizada, nombre de carpeta, conteos y resultado en `Hallazgos_Beta.md`. Si no se dispone de Beta aislada, marcar los pasos como NO EJECUTADOS.

**Límites:** no cargar imágenes reales de clientes, no almacenar Base64 en Spreadsheet, no alterar permisos, no usar cuentas/Drive/Spreadsheet productivos y no coordinar servicios Apps Script mediante URLs. La operación FEEDBACK escribe en su propia hoja y Drive; CATALOG solo lee la referencia existente.


## 24. Validación Beta diferida — resolución de Tutorial en carga de vídeo YouTube

**Estado: CORRECCIÓN LOCAL COMPLETADA; PENDIENTE DE REPRODUCCIÓN Y SUBIDA CONTROLADA EN YOUTUBE BETA.** CATALOG expone `referenceId` estable para tutoriales con ID físico y para tutoriales históricos sin ID. FEEDBACK acepta la identidad legacy y mantiene la resolución estricta para IDs canónicos.

### Sincronización segura obligatoria

Ejecutar desde el clon local del repositorio `infogpstech/GPSpedia`. No descarta cambios locales y detiene la secuencia si el repositorio, rama o árbol no coinciden:

```bash
test "$(basename "$(git rev-parse --show-toplevel)")" = "GPSpedia" || { echo "Repositorio incorrecto"; exit 1; }
case "$(git remote get-url origin)" in *github.com/infogpstech/GPSpedia*) ;; *) echo "Origin no corresponde a infogpstech/GPSpedia"; exit 1 ;; esac
test "$(git branch --show-current)" = "GPSpedia2.2.5_work" || { echo "Rama incorrecta"; exit 1; }
test -z "$(git status --porcelain)" || { echo "Hay cambios locales; guardar o resolverlos antes de sincronizar"; exit 1; }
git fetch origin GPSpedia2.2.5_work || exit 1
git pull --ff-only origin GPSpedia2.2.5_work || exit 1
git rev-parse HEAD
```

### Evidencia local aprobada

- Commit de implementación: `4f300742fbf5c965f9a05722825a02b29ce7ccb5` (FEEDBACK), `2db86ad34a6c45307f9a5c8ee356bc52c5bd7ea6` (CATALOG), `e376ce69062969974a862f379a3038cdc051163e` (frontend).
- CI run [45506352069](https://github.com/infogpstech/GPSpedia/actions/runs/45506352069): SUCCESS; 517 suites, 6,156 pruebas aprobadas, 0 fallos.
- `FeedbackTutorialLookupBoundedRead`: 9/9 PASS; `TutorialIntegrity`: 48/48 PASS; FEEDBACK precondiciones de subida resumable: 10/10 PASS, incluida inicialización con Tutorial histórico (referencia legacy) y Tutorial nuevo (ID canónico).
- Chromium responsive: 184/184 PASS en 1366×768, 390×844, 360×800 y 320×700.
- GitHub Pages run [45506351422](https://github.com/infogpstech/GPSpedia/actions/runs/45506351422): SUCCESS.
- No se usó OAuth real ni se subió vídeo a YouTube durante CI.

### Pasos en Beta aislada

1. Confirmar que CATALOG y FEEDBACK apuntan a la misma Spreadsheet Beta autorizada. Publicar únicamente las versiones aprobadas de CATALOG y FEEDBACK en sus deployments Beta existentes; no modificar producción.
2. Preparar un tutorial histórico sintético en la Spreadsheet Beta con ID físico vacío y título conocido. No usar un registro real de cliente.
3. Abrir/actualizar el catálogo desde la plataforma y confirmar que el objeto de ese tutorial incluye `referenceId` con formato `legacy-<64 caracteres hexadecimales>`, mientras `ID` permanece vacío.
4. Abrir el detalle del tutorial y seleccionar la carga de vídeo. Confirmar en la solicitud frontend→FEEDBACK que se envía `referenceId` legacy; no copiar URLs de servicios ni introducir secretos en Apps Script.
5. Solo con una cuenta YouTube Beta autorizada y un archivo sintético de prueba, iniciar una subida breve. Confirmar que `initYouTubeUpload` devuelve sesión válida y no `Tutorial no encontrado`.
6. Completar la carga de prueba. Confirmar que se crea una solicitud de aprobación pendiente en FEEDBACK y que la columna `Tutorial.Video` permanece vacía antes de aprobar.
7. Aprobar la solicitud como Desarrollador en Beta y confirmar que el vídeo se asocia a la fila correcta. Verificar que no se modifica otro tutorial con título parecido.
8. Repetir el flujo con un tutorial nuevo cuyo ID físico sea `tut-...`; confirmar que `referenceId` coincide con `ID` y que la ruta canónica continúa funcionando.
9. Renombrar un tutorial histórico mediante el flujo autorizado y confirmar que su `referenceId` legacy no cambia y que la carga sigue resolviendo la fila física original.
10. Confirmar que una referencia `tut-...` inexistente falla de forma segura y no cae a una búsqueda por título.
11. Si reaparece el error, registrar sin PII: `contentType`, formato de `referenceId` (no el token OAuth), si `ID` físico existe, existencia de la fila en Tutorial, versión de deployments CATALOG/FEEDBACK y etapa exacta (init o submit). No repetir la subida real sin revisar el estado de YouTube para evitar vídeos duplicados.
12. Registrar resultado y evidencia anonimizada en `Hallazgos_Beta.md`. Si no existe entorno/cuenta YouTube Beta autorizados, marcar los pasos de subida como NO EJECUTADOS.

**Límites:** no subir vídeos reales de clientes, no utilizar OAuth/cuentas productivas, no aprobar solicitudes en producción, no cambiar permisos ni datos productivos. No añadir llamadas entre servicios Apps Script: el frontend envía la referencia estable de CATALOG a FEEDBACK.


## 25. MIG-URL-008 — Validación de salud y funciones en Beta aislada
**Estado: EN PROGRESO — FASE READ-ONLY EJECUTADA; PRUEBAS FUNCIONALES PENDIENTES.**

### Sincronización obligatoria
Ejecutar desde un clon local de GPSpedia. No descarta cambios y detiene la secuencia si repositorio/rama/árbol no coinciden:

```bash
test "$(basename "$(git rev-parse --show-toplevel)")" = "GPSpedia" || { echo "Repositorio incorrecto"; exit 1; }
case "$(git remote get-url origin)" in *github.com/infogpstech/GPSpedia*) ;; *) echo "Origin incorrecto"; exit 1 ;; esac
test "$(git branch --show-current)" = "GPSpedia2.2.5_work" || { echo "Rama incorrecta"; exit 1; }
test -z "$(git status --porcelain)" || { echo "Hay cambios locales; guardar antes de sincronizar"; exit 1; }
git fetch origin GPSpedia2.2.5_work || exit 1
git pull --ff-only origin GPSpedia2.2.5_work || exit 1
git rev-parse HEAD
```

### Precondiciones de seguridad
1. Confirmar explícitamente con el propietario que los seis deployments y Spreadsheet son un entorno Beta aislado, no producción, y recibir autorización para GET y pruebas funcionales.
2. Registrar únicamente alias de entorno, versión/identidad esperada y evidencia anonimizada; no copiar tokens, secretos, PII ni URLs sensibles a Logs.
3. Verificar que API_ENDPOINTS local corresponde al conjunto autorizado. No editar endpoints, PropertiesService, permisos ni configuración remota durante las pruebas.
4. Ejecutar el escaneo health desde Developer y confirmar seis respuestas `GPSpedia-*`, status, versión, tiempo de respuesta y errores, sin interpretar un 200 genérico como identidad validada.
5. Ejecutar casos sintéticos aislados por servicio: AUTH login/session/RBAC; CATALOG snapshot/feed y fallback; WRITE asignación/idempotencia con IDs sintéticos; FEEDBACK útiles/retiro, Inbox y append-only; UTILITIES RBAC y staging; ADMIN guardas/auditoría/preview de solo lectura.
6. Ejecutar failover desconectando o simulando una única dependencia de Beta (sin afectar recursos productivos): confirmar estado parcial, timeout/reintento acotado y recuperación. No cambiar endpoints remotos ni configurar proxy.
7. Confirmar que el frontend coordina los flujos multi-servicio, que no existen llamadas backend→backend y que no se exponen secretos.
8. Registrar cada caso como PASS/FAIL/NO EJECUTADO, servicio, deployment/version, timestamp aproximado, evidencia anonimizada y acción correctiva. No incluir credenciales ni payloads personales.
9. Si no se dispone de Beta aislada/autorizada, dejar todas las pruebas remotas como NO EJECUTADAS y conservar esta checklist.

**Límites:** No ejecutar sobre producción. No desplegar Apps Script ni alterar Spreadsheet, Drive, PropertiesService, permisos, datos o OAuth sin autorización explícita adicional. El estado del plan no se cerrará como validación remota hasta contar con evidencia real.


### Evidencia de ejecución — primera fase GET-only (2026-11-26)
- El propietario confirmó que la ejecución corresponde a entorno Beta aislado y autorizó pruebas avanzadas sobre recursos de prueba. Se mantuvieron fuera del alcance producción, deployments Apps Script, permisos, PropertiesService, OAuth y escrituras Drive/Spreadsheet.
- Run `45745832696`, commit `41673965804ef6e272d56e864aa0f7a51e5a9d80`: contrato health 21/21 PASS; cinco servicios coinciden con versión esperada; ADMIN reporta 2.7.1 frente a 2.7.2.
- CATALOG feed cursor 0/1 y cursor 5/1: PASS. Boundaries de cursor futuro, negativo, malformado y límites 0/51: PASS. Matriz de retención/cursor intermedio/repetibilidad: PASS.
- ADMIN latency: cinco muestras, mediana 1761 ms, máximo 2359 ms, dos muestras >=2 s.
- El job global conserva FAIL por discrepancia ADMIN; las pruebas independientes se ejecutaron y sus resultados se conservaron.
- Sin POST funcional, despliegue, escritura ni modificación de recursos remotos. Los flujos AUTH autenticados, WRITE, FEEDBACK, UTILITIES y ADMIN mutables continúan PENDIENTES de fixtures sintéticos, credenciales de prueba y ownership/cleanup comprobables.


### Evidencia adicional — paginación secuencial CATALOG (2026-11-26)
- Probe `RemoteCatalogFeedPagination.mjs` integrado al workflow y ejecutado en run `45746282852`: PASS, 5 páginas, 5 eventos, 3 eventos reset, cursor final 5, currentRevision 5, minRevision 1, sin cambios concurrentes observados.
- El test valida orden/continuidad de revisiones, ausencia de duplicados entre páginas, cursor de continuación, semántica de reset y límite máximo de páginas. Solo GET; no registra snapshots ni datos de registros.
- CI de commit `46ad3a211e2e2d6c0b48a390ec62e8ab7a6399ca`: 542 suites/6,452 pruebas PASS; Playwright 264/264; Pages SUCCESS.
- Se considera completada la fase pública GET-only de CATALOG. AUTH autenticado, WRITE, FEEDBACK, UTILITIES funcional y ADMIN mutable siguen pendientes de fixtures/cuentas de prueba y cleanup verificable. ADMIN health sigue FAIL por v2.7.1 vs 2.7.2.


### Evidencia — diagnóstico AUTH y límites de seguridad de pruebas (2026-11-26)
- Hallazgo BETA-F019: AUTH `doGet(debug=true)` devuelve `sessionAuthority`, prohibido por `Services/SERVICE_HEALTH.md`. El test local y el probe remoto lo detectan. No se modificó servicio/deployment.
- Run `45746770426`: AUTH FAIL por metadato interno; ADMIN FAIL por v2.7.1 vs v2.7.2; FEEDBACK SLOW 2128 ms; CATALOG/WRITE/UTILITIES PASS. Feed, boundaries, matriz y paginación CATALOG PASS.
- ADMIN repeated latency: mediana 2031 ms, máximo 5570 ms, 4/5 muestras >=2 s.
- Run `45747008507`: 542 suites, 6,410 pruebas aprobadas, 2 fallos de suite (la misma aserción AUTH duplicada); Playwright 264/264 PASS. El runner ahora continúa todas las suites y conserva fallo agregado.
- **AUTH login negativo no ejecutado remotamente:** `handleLogin` escribe un registro en Logs incluso cuando rechaza credenciales; sin acceso a lectura/limpieza no se puede garantizar la integridad del Spreadsheet tras el caso. El conector Google Drive figura deshabilitado por administrador; no hay acceso directo a Drive/Sheets desde esta sesión.
- No se ejecutaron POST, escrituras, despliegues ni cambios remotos. Las pruebas funcionales mutables quedan NO EJECUTADAS hasta que la identidad sintética y el cleanup sean verificables.


### Repetición de health y cierre de cobertura pública GET-only (2026-11-26)
- Run `45747463436`: `ServiceHealthContract` 20/21 PASS; AUTH FAIL por `sessionAuthority`, ADMIN FAIL por v2.7.1 vs v2.7.2. FEEDBACK/CATALOG/WRITE/UTILITIES PASS.
- CATALOG feed, boundaries, matriz y paginación secuencial PASS; 5 páginas, 5 eventos, 3 reset, cursor 0→5, revisión 5, sin cambios concurrentes.
- ADMIN latency: mediana 1779 ms, máximo 2301 ms, 1/5 muestras >=2 s.
- Run `45747463460`: 542 suites, 6,450 pruebas aprobadas, 2 fallos de suite (la misma aserción AUTH en AUG-024 y MIG021); Playwright 264/264; Pages SUCCESS.
- El runner ahora ejecuta todas las suites y reporta todos los checks de contrato antes de devolver FAIL. La cobertura GET pública disponible quedó agotada; los casos restantes son autenticados o mutables.
- No se ejecutó login ni POST: `handleLogin` registra fallos en Logs y no existe acceso a Drive/Sheets para verificar y limpiar esa escritura. Google Drive está deshabilitado por el administrador en el entorno de conectores.


### Evidencia adicional BETA-08 — Pages desplegado, sin acceso al backend (2026-11-26)
- Pages URL `https://infogpstech.github.io/GPSpedia/`, deployment run `45747843657` SUCCESS.
- Browser run `45747844794`: HTTP 200; login visible y sin overflow en 1366x768, 390x844 y 320x800; cero errores JS.
- El script bloqueó solicitudes no-GET y llamadas a Apps Script: 0 no-GET, 0 llamadas backend, 0 credenciales y 0 escrituras.
- AUG-146 264/264 PASS; 16 capturas sintéticas.
- Esta prueba valida la superficie estática/login desplegada; no sustituye autenticación real ni prueba manual en dispositivo físico.


### BETA-01 / BETA-08 — UI de recuperación de contraseña (2026-11-26)
- En Pages Beta se abrió el panel de recuperación, se validaron los campos usuario/correo y el formulario de solicitud, y se regresó al login.
- El formulario de finalización permanece oculto; no se envió la solicitud ni se generó código. 0 POST/no-GET, 0 llamadas Apps Script, 0 credenciales y 0 escrituras.
- Run `45748061081`: AUG-146 264/264 PASS y smoke UI PASS. Pages run `45748060216` SUCCESS.
- Entrega de correo, códigos de recuperación, expiración y cambio de contraseña permanecen NO EJECUTADOS hasta disponer de identidad sintética y cleanup verificable.


## Mapa de cobertura CI local por área Beta (run 45748061081; 2026-11-26)
**Importante:** todos los resultados siguientes son pruebas locales con fixtures/mocks sintéticos. No equivalen a ejecución remota en Apps Script, Drive, Spreadsheet, OAuth o YouTube.

| Área | Evidencia local CI | Estado remoto Beta |
|---|---|---|
| BETA-01 AUTH/USERS | `AuthSessionReadOptimization` 9/9; `AuthErrorPrivacy` 13/13; pruebas de actor, RBAC y revocación PASS | Health AUTH FAIL por `sessionAuthority`; login/sesiones reales NO EJECUTADOS |
| BETA-02 CATALOG | `CatalogChangeFeed` 19/19; `CatalogBrowserReset` 11/11; `CatalogStartupIntegrity` 25/25; `CatalogTransientFeedFallback` 2/2 | Feed GET, boundaries, matriz y paginación PASS; snapshot/cache real y UI autenticada pendientes |
| BETA-03 WRITE | `WritePhysicalTransactionContract` 7/7; `WriteOpIdLegacyLookup` 9/9; `WriteIdempotencySnapshotReuse` 9/9; `WriteVehicleIdAllocationIdempotency` 12/12 | Escrituras, concurrencia y recuperación remotas NO EJECUTADAS |
| BETA-04 FEEDBACK/Inbox | `InboxUi` 89/89; `FeedbackInboxImageEventBatchRead` 7/7; `InboxAuditTrail` 16/16; `InboxRoleContract` 22/22; `InboxStoredXss` 30/30 | Health FEEDBACK PASS/SLOW según muestra; reportes, likes, mensajes y tutoriales remotos NO EJECUTADOS |
| BETA-05 ADMIN | `AdminDriveScanIntegrity` 18/18; `AdminDriveAuditReferenceSnapshot` 14/14; `AdminDriveAuditCursorRecovery` 23/23; `AdminDriveAuditAssociation` 16/16; `AdminDriveAuditMetadataPersistence` 11/11; `AdminAuditTrail` 27/27 | Health ADMIN FAIL por deployment 2.7.1 vs 2.7.2; Drive remoto NO EJECUTADO |
| BETA-06 imágenes/Drive | `AdminImageUploadPreflight` 6/6; `AdminImageUploadLedgerReadOnly` 5/5; `AdminImageUploadDriveIsolation` 7/7; `AdminImageUploadLinkedRecoveryIsolation` 6/6; `AdminImageUploadCompensationIsolation` 8/8 | Inventario, alta, permisos y cleanup Drive remotos NO EJECUTADOS |
| BETA-07 YouTube | `YouTubeUploadClient` 12/12; `YouTubeInitIdempotencyBoundary` 14/14; `YouTubeUploadXssIntegrity` 5/5; `VideoApprovalCatalogRefreshFrontend` 6/6 | OAuth, carga, pausa/reanudación y aprobación real NO EJECUTADOS |
| BETA-08 UI | AUG-146 264/264; Pages login y recuperación UI PASS en 1366x768, 390x844 y 320x800 | Dispositivo físico Android/PWA y roles reales NO EJECUTADOS |

**Regresión global:** run `45748061081`, 542 suites, 6,450 pruebas aprobadas y 2 fallos de suite; ambos corresponden a la misma aserción AUTH `sessionAuthority` ejecutada en AUG-024 y MIG021.


### Consolidado de latencia ADMIN
Quince muestras de tres runs Beta GET-only: mediana 1898 ms, media 2108.8 ms, máximo 5570 ms y 7/15 muestras en SLOW (>=2 s). La variación no permite atribuir causa. ADMIN sigue en deployment 2.7.1 frente a fuente 2.7.2; no desplegar desde esta fase.


### BETA-08 — recuperación UI, cuatro viewports
Run `45748620437`: PASS en 1366x768, 390x844, 360x800 y 320x700; usuario/correo/botón visibles, formulario de finalización oculto, sin overflow. No se envió solicitud ni código; 0 llamadas Apps Script y 0 escrituras. AUG-146 264/264; Pages `45748620501` SUCCESS.


### BETA-08 — PWA offline: FAIL confirmado (2026-11-26)
- Manifest, scope, start_url, iconos 192/512 y registro/activación del Service Worker: PASS.
- Recarga offline: FAIL; HTML disponible desde cache, login no visible.
- 12 módulos importados por el grafo de `main.js` no están en `CORE_ASSETS`; el runtime confirma que no están cacheados. También fallan recursos externos Font Awesome y `/thumbnail`.
- No-GET 0, Apps Script 0, escrituras 0. Hallazgo BETA-F020.
- Corrección de `service-worker.js` queda fuera de la fase de validación; requiere completar precache y repetir el smoke offline.


### Verificación de recursos precache PWA — ejecución pendiente
El harness `cc80ed49` amplió el smoke para consultar todos los recursos de `CORE_ASSETS` y `OPTIONAL_ASSETS`. Run `45749473444`: responsive-browser aún en Install Chromium al último checkpoint; no se registra resultado hasta que termine. El hallazgo BETA-F020 sigue confirmado por el run anterior.


### Inventario PWA en Git
El árbol recursivo contiene 673 archivos; los 36 recursos CORE y los 4 OPTIONAL declarados existen. Los 12 módulos faltantes de la precarga también existen en el repositorio: la causa es que no están listados en `CORE_ASSETS`, no que falten físicamente.
