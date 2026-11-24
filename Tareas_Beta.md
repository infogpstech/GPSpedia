# GPSpedia — Tareas de validación Beta

Fecha de inicio: 2026-11-22
Repositorio: `infogpstech/GPSpedia`
Rama de trabajo: `GPSpedia2.2.5_work`
Rama base: `GPSpedia2.2.5`
HEAD de referencia: `f8df2c91f8408c311d47ec7c67091cf482cf5cb4`
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

1. **Acceso inicial a Spreadsheet (MIG-006/MIG-008):** probar cada deployment de AUTH, CATALOG y UTILITIES bajo su identidad real de ejecución. Para CATALOG, crear previamente en la Spreadsheet aislada las hojas CatalogChangeState (A:D: schemaVersion, revision, minRevision, updatedAt) y CatalogChangeEvents (A:J: revision, collection, recordId, operation, snapshotJson, createdAt, sourceService, sourceOperation, sourceRequestId, resetRequired); verificar encabezados exactos y permisos. Registrar si getActiveSpreadsheet() devuelve el contenedor esperado, null o un contenedor distinto. Confirmar permisos de lectura/escritura sobre Users, ActiveSessions y las hojas que consume cada servicio. No sustituir SPREADSHEET_ID/openById hasta documentar el resultado y aprobar una alternativa sin bootstrap circular.
2. **SharedSessionActor:** validar cache miss, cache hit, expiración, token revocado, cambio de rol y usuario desactivado. Confirmar que AUTH inyecta getAuthUsersSpreadsheet_, ADMIN/WRITE inyectan su Spreadsheet activa y UTILITIES su proveedor explícito; verificar que una llamada sin proveedor falla cerrado. Confirmar que el actor procede de Users/ActiveSessions y nunca del rol enviado por el navegador.
3. **Feed incremental CATALOG:** publicar reset y deltas desde WRITE/FEEDBACK/ADMIN; repetir el mismo requestId; probar dos publicaciones concurrentes, lock ocupado, read-back, paginación, retención de 100 eventos, cursor obsoleto, fila ausente y snapshotJson corrupto. Confirmar que la lectura solicita reset cuando detecta huecos y que el ledger no contiene userId ni sessionToken. Inspeccionar las antiguas claves GPSpedia_CATALOG_CHANGE_REVISION y GPSpedia_CATALOG_CHANGE_EVENT_*; no borrarlas sin autorización específica.
4. **Publicación global rich_text_mode:** con una sesión Desarrollador, publicar strict y advanced desde ADMIN; verificar incremento de revisión, historial, idempotencia, read-back y lectura pública desde FEEDBACK. Repetir como Técnico y confirmar rechazo de publicación.
5. **Caché frontend:** abrir dos navegadores/sesiones aisladas; cambiar el modo desde Developer y comprobar que ambos leen el mismo valor central. Verificar TTL máximo de 5 minutos, invalidación tras publicar, revisión válida y fallback estricto cuando la caché o la respuesta central sea inválida/vencida.
6. **Seguridad de contenido:** en ambos modos probar HTML/SVG/eventos/scripts/iframes/URLs peligrosas y confirmar que el backend continúa sanitizando sin depender de la preferencia visual.
7. **Propiedad legacy:** inspeccionar si GPSpedia_RICH_TEXT_MODE_V1 existe en cada proyecto desplegado y registrar su presencia/ausencia. No borrar ni modificar propiedades instaladas como parte de esta prueba sin autorización específica y sin confirmar paridad del deployment.
8. **Arquitectura:** confirmar que las operaciones funcionales se coordinan desde el frontend, que no se han añadido URLs de otros servicios ni secretos compartidos en Apps Script y que cualquier llamada técnica directa tiene justificación y RBAC receptor.
9. Registrar HEAD, deployment/versiones, identidad de ejecución, rol, navegador/dispositivo, resultado y evidencia anonimizada. No registrar tokens, secretos, datos personales ni contenido real.
10. No desplegar ni ejecutar contra producción. CI local no sustituye esta validación Beta.
