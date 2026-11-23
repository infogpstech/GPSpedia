## Solicitudes post revisión — 2026-11-16

### GP-AUTH-LOGIN-DRIVE-LOCK-01 — Login independiente de la lectura prolongada de carpetas Drive
**Prioridad: P1 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**
- Corregir el bloqueo cruzado entre ADMIN/getCortesImageFolders y AUTH/login.
- La lectura conserva su lease sobre DRIVE y la autenticación central del actor; no reserva USERS ni SESSION_CONTEXTS durante la enumeración.
- Prueba aislada: 55/55 PASS. CI run 44016976600 SUCCESS en el commit de implementación 43d045c4fb822b72060c15e18a9232cb36c3284b. La prueba nueva se añadió en c61deecd y se ejecutó localmente.
- Beta pendiente: login tras el bloqueo temporal por intentos fallidos mientras se consulta el árbol de imágenes, con medición de duración y respuesta.

### GP-AUTH-PASSWORD-RECOVERY-01 — Recuperación de contraseña
**Prioridad: P1 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**
- Auditar el enlace «¿Olvidaste tu contraseña?» y los contratos AUTH/USERS.
- Implementar recuperación segura por correo registrado, con verificación de titularidad, código de un solo uso, expiración, límites de intentos y respuesta que no permita enumerar cuentas.
- Mantener hashes con salt, rendimiento de login, revocación de sesiones y actor central. No enviar contraseñas/códigos a logs ni permitir restablecer cuentas ajenas.
- Pruebas de expiración, reutilización, identidad, concurrencia, abuso y compatibilidad. Envío real de correo y scopes del deployment pendientes de Beta.

### GP-DEV-CUT-AUDIT-TOOLBAR-01 — Barra de herramientas del panel de auditoría de cortes
**Prioridad: P2 · Estado: COMPLETADA CON VALIDACIÓN VISUAL DIFERIDA A BETA**
- Reorganizar los controles en una barra compacta iconográfica, autodesplegable y accesible, coherente con el patrón del Inbox.
- Preservar acciones, permisos, confirmaciones, estados y navegación existentes.

#### Implementación en curso — 2026-11-17
- Se agrupan los cinco controles existentes en una barra semántica `role=toolbar` con iconos, etiquetas accesibles y un botón de expansión/contracción.
- La vista compacta muestra iconos; la expansión anima el ancho y las etiquetas. En móvil los controles se distribuyen en varias filas sin salir del viewport.
- Se conservan los IDs, handlers, condiciones `hidden`/`disabled`, confirmaciones y la lógica de `updateControls()`. El estado de expansión se reinicia al abrir el modal y el listener se enlaza una sola vez.
- Se respeta `prefers-reduced-motion`. Pruebas estáticas añadidas a CortesImageReconciliationUI; CI pendiente.

### GP-DEV-IMAGE-AUDIT-LIBRARY-UX-01 — Continuidad de auditoría y biblioteca de imágenes
**Prioridad: P1/P2 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**
- Corregir «No hay cursor de continuación disponibles» y el rechazo por presupuesto seguro excedido.
- Conservar snapshots parciales recuperables y cursores válidos; permitir reanudar sin duplicar ni perder progreso y no presentar una auditoría parcial como completa.
- Rediseñar la biblioteca de imágenes con barra de funciones iconográfica y organizada, sin alterar las protecciones de archivos ni acciones destructivas.

### GP-INBOX-LIST-NAV-01 — Simplificación de listas y navegación del Inbox
**Prioridad: P2 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**
- Revisar límite de conversaciones/mensajes y decidir con evidencia si se conserva paginación interna o se elimina navegación redundante por botones.
- Evitar descargas ilimitadas y conservar accesibilidad y rendimiento.

#### Implementación en curso — 2026-11-17
- Decisión basada en los contratos existentes: conservar paginación por cursor; retirar el paginador visual cuando no hay página anterior ni siguiente. Eliminarlo por completo haría inaccesibles conversaciones y reportes históricos o exigiría descargar listas sin límite.
- Tamaños frontend: 20 conversaciones, 40 reportes/mensajes de solicitudes y 50 mensajes por conversación. Se unifican en 50 los topes máximos de backend para `getFeedbackItems`, `getMyProblemReports` y `getInboxMessages`; `getInboxConversations` ya tenía tope 50.
- El paginador compartido comienza oculto, se muestra únicamente si existe otra página, y su nombre accesible identifica conversaciones, reportes, aportaciones o mensajes. Se conserva la navegación por cursor y el acceso a historial.
- Pruebas añadidas a InboxUi e InboxConversations para visibilidad condicional, límites por página y cursores.

#### Cierre verificado — GP-INBOX-LIST-NAV-01 — 2026-11-17
- GitHub Actions service regression run 44083370659 SUCCESS: 133 suites, 1,989 pruebas aprobadas, 0 fallos. InboxConversations 62/62; InboxUi 81/81. Syntax check de los módulos modificados aprobado.
- GitHub Pages run 44083370222 SUCCESS para el commit cadbcadef7ca09ad47a1b676262900398cd2cca6.
- Los endpoints de reportes, tickets propios y mensajes limitan a 50; conversaciones ya limitaba a 50. El cliente conserva páginas menores (40 solicitudes, 20 conversaciones, 50 mensajes).
- Se conserva la paginación cursor-based para no perder acceso al historial; se oculta cuando no existe navegación real. No se descargan listas completas.
- Pendiente Beta: comprobación visual en navegador/PWA de ocultación/visibilidad del paginador, cambio de carpetas y navegación con teclado/táctil. No se ejecutaron consultas contra hojas productivas.
- Estado local: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.


### GP-INBOX-THREAD-TOOLBAR-01 — Organización de la bandeja de conversación
**Prioridad: P2 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**
- Reorganizar botones y elementos del hilo con controles iconográficos autodesplegables.
- Preservar acciones, destinatarios, borradores, estados leído/no leído, permisos y navegación móvil/escritorio.

#### Implementación en curso — 2026-11-17
- El encabezado del hilo se reorganiza en una toolbar semántica; los botones mantienen iconos visibles y las etiquetas se expanden/contraen mediante un control accesible con `aria-expanded`.
- Volver, archivar/restaurar y cerrar caso conservan handlers, estados y reglas de rol; el cierre solo aparece para desarrollador, jefe y supervisor.
- Los nombres de participantes y categoría permanecen en el encabezado. Se agregan iconos al control de mensajes anteriores, cancelar y enviar, sin cambiar cursores, borradores ni claves de idempotencia.
- Pruebas InboxUi ampliadas para la toolbar, permisos, accesibilidad, movimiento reducido, navegación móvil y preservación del flujo de mensajes.

#### Cierre verificado — GP-INBOX-THREAD-TOOLBAR-01 — 2026-11-17
- GitHub Actions service regression run 44084350666 SUCCESS: 133 suites, 1,991 pruebas aprobadas, 0 fallos. InboxUi 83/83; comprobación sintáctica de los módulos modificados aprobada.
- GitHub Pages run 44084349391 SUCCESS para el commit bec864d7756b2b2c46f7449a75fbf9b79eaf8023.
- Toolbar semántica con iconos siempre visibles, etiquetas expandibles/contraíbles, aria-label/aria-expanded/aria-controls, y controles compactos responsive. Volver se mantiene solo en móvil.
- Archivar/restaurar y cerrar caso conservan handlers; el cierre sigue limitado a desarrollador, jefe y supervisor. Se preservan participantes/categoría, cursor de mensajes, borradores e idempotencia.
- Pendiente Beta: revisar visualmente la expansión, foco/teclado, distribución en móviles PWA y estados de acciones. No se ejecutaron acciones reales de archivo/cierre.
- Estado local: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.


### GP-INBOX-CACHE-BANDS-01 — Caché de Reportes, Mensajes y Aportaciones
**Prioridad: P1 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA**
- Evitar recargas completas al cambiar de bandeja, asunto o categoría cuando exista respuesta local válida.
- Aislar caché por identidad/rol/token y por categoría, consulta, cursor y filtros; refrescar en segundo plano conservando el contenido.
- Definir TTL, invalidación tras mutaciones, límites de memoria y descarte de respuestas tardías entre sesiones.

#### Implementación en curso — 2026-11-17
- La caché de páginas ahora admite una clave de filtro independiente del cursor y pageSize, manteniendo aislamiento por userId, rol y token de sesión.
- Reportes, aportaciones y tickets propios usan caché por sección; se elimina la excepción que impedía cachear getMyProblemReports.
- Conversaciones: el filtro de carpeta/categoría/búsqueda se almacena separado del cursor. Las páginas frescas se reutilizan al cambiar de bandeja; las vencidas se muestran mientras se refrescan en segundo plano. Sondeo, visibilidad, conexión y refresco explícito fuerzan actualización.
- Mensajes: sustituida la caché Map por la caché efímera común, con identidad/rol/token, conversación, cursor y TTL de 60 s; límite de 40 páginas. La selección reutiliza páginas frescas y valida lastMessageId frente al resumen de conversación.
- Las mutaciones invalidan las páginas afectadas; el cambio de sesión limpia todas las cachés. Se mantiene el descarte de respuestas tardías mediante generaciones y comprobación del contexto.
- Pruebas actualizadas: InboxCachePagination, InboxUi e InboxConversations. Validación local/CI pendiente.

### GP-UX-SESSION-ENDED-01 — Centrado del aviso de sesión terminada
**Prioridad: P3 · Estado: COMPLETADA**
- Centrar el texto «Sesión terminada» dentro de la burbuja/aviso, sin desplazar los errores de acceso ni alterar el diseño responsive.
- Añadir contrato DOM/visual anti-regresión.

#### Cierre verificado — 2026-11-17
- style.css centra el texto solo para la clase login-session-ended; la regla de errores de acceso permanece separada y sin cambios.
- La suite UI invalidación de sesión y rol/AUG-042 aprobó 18/18; incluye verificación de alineación exclusiva y de role/aria-live.
- GitHub Actions run 44085022792 SUCCESS: 133 suites, 1,992 pruebas aprobadas, 0 fallos.
- GitHub Pages run 44085021849 SUCCESS para c7bd8d36a0456ffa778fc57ca08b74d7a22dba28.
- No se modificaron márgenes, colores, dimensiones ni reglas responsive; validación visual de dispositivo real queda opcional para Beta.




#### Implementación en curso — GP-AUTH-PASSWORD-RECOVERY-01
- AUTH: requestPasswordRecovery usa PASSWORD_RECOVERY independiente y no reserva SESSION_CONTEXTS/ACTIVE_SESSIONS; completePasswordRecovery protege USERS, ACTIVE_SESSIONS, LOGS, SESSION_CONTEXTS y PASSWORD_RECOVERY.
- Código aleatorio de 12 caracteres hexadecimales; solo se conserva HMAC en CacheService. Vigencia 10 minutos, 5 intentos y 3 solicitudes/hora por usuario/correo/cuenta; un desafío vigente por cuenta.
- Respuesta genérica para cuentas existentes/inexistentes. La finalización vuelve a comprobar usuario, correo y estado activo, actualiza PBKDF2-SHA256 con salt y revoca sesiones anteriores.
- Frontend de dos pasos integrado al modal de acceso; App Shell v66. Pruebas añadidas; cierre local pendiente de ejecutar la suite Node.js/CI.
- MailApp/script.send_mail, propiedades y entrega real de correo, y revocación en el deployment actualizado quedan PENDIENTES DE DESPLIEGUE / VALIDACIÓN BETA.


#### Cierre de validación — GP-AUTH-PASSWORD-RECOVERY-01
- GitHub Actions service-tests: SUCCESS, run 44073987141, HEAD 06c9e1f0ea3e0468ea5a6d66c6e57bdd157a79df.
- PasswordRecovery: 10/10 PASS; Coordinador/concurrencia: 57/57 PASS; SessionRestoreOnValidationFailure: 15/15 PASS; suite completa sin fallos.
- GitHub Pages: SUCCESS, run 44073810188 para b965db4241bdc2325b72e618c418a95995d35208 (commit de corrección de límites de extracción AUTH).
- Pendiente externo: implementar el código en el deployment AUTH, autorizar MailApp/script.send_mail, verificar envío/recepción real, configuración del secreto y revocación de sesiones en entorno Beta. No se afirma que el correo ya funcione en producción.


#### Auditoría inicial — GP-DEV-IMAGE-AUDIT-LIBRARY-UX-01
- Causa 1: collectCortesImageReferences agrupa solo columnas contiguas; las ocho columnas reales pueden producir hasta ocho grupos y multiplicar las llamadas getRange/getDisplayValues/getValues/getFormulas/getRichTextValues. El presupuesto fijo de 12 segundos lanza excepción antes de crear y guardar el snapshot completo.
- Causa 2: ADMIN_SERVICE_VERSION es 2.7.1, pero ui.js exige literalmente 2.6.1. La interfaz rechaza una respuesta válida antes de conservar su cursor; esto explica el mensaje engañoso «No hay cursor de continuación disponible» incluso cuando el servidor puede haberlo devuelto.
- La captura falla de forma cerrada y no debe guardar snapshots parciales como si fueran completos; se optimizará el número de lecturas y se ampliará el presupuesto seguro, conservando la validación íntegra del snapshot.
- La biblioteca separa búsqueda/vistas, selección y carpetas en filas poco cohesionadas. Se agruparán acciones con iconografía, nombres accesibles y un panel de carpetas desplegable.
- No se ejecutaron movimientos, eliminaciones ni escrituras de inventario durante esta auditoría.


#### Cierre local — GP-DEV-IMAGE-AUDIT-LIBRARY-UX-01
- collectCortesImageReferences agrupa columnas de imagen cercanas en ventanas con gaps máximos de 8 columnas, reduciendo llamadas de lectura sin procesar los campos intermedios como referencias.
- Presupuesto de captura ampliado de 12s a 30s; se mantiene fail-closed: si la captura completa supera el límite, no se almacena ni se clasifica un snapshot parcial.
- ui.js acepta versiones semánticas del servicio ADMIN y no fija 2.6.1. El error de presupuesto distingue auditoría no iniciada y ausencia de cursor; no sugiere reanudar una captura que nunca creó snapshot.
- Biblioteca rediseñada con barra accesible, búsqueda, refresco, vistas, botón desplegable de carpetas y acciones masivas compactas con iconos.
- GitHub Actions run 44076449777 SUCCESS: 133 suites, 1,981 pruebas aprobadas, 0 fallos; AdminReplacedImagesIntegrity 55/55 y ReplacedImagesLibraryUX 14/14.
- GitHub Pages run 44076449201 SUCCESS para HEAD 003500bb5e0649b1149c850f7dfa126cd068f8aa.
- Beta pendiente: ejecutar auditoría completa con el volumen real de Cortes/Drive, confirmar que la captura termina dentro del nuevo presupuesto, revisar cursor y clasificación. No se realizaron movimientos ni eliminaciones reales.


#### Cierre local — GP-INBOX-CACHE-BANDS-01 — 2026-11-17
- Commits: b3749410b0cf2876bcc1cbd7450f77dfc637835c (implementación) y 1c50922170308843581f9ba55c72bdee7a6e73a9 (ajuste del contrato UI).
- GitHub Actions run 44079875552 SUCCESS: 133 suites, 1,986 pruebas, 0 fallos. Sintaxis de los módulos modificados aprobada; InboxUi 80/80; InboxConversations 61/61; caché 5/5; paginación 4/4; contratos UI 10/10.
- GitHub Pages run 44079874261 SUCCESS para 1c50922170308843581f9ba55c72bdee7a6e73a9.
- Caché en memoria únicamente: TTL 60 s, LRU 80 páginas para bandejas y 40 para mensajes; identidad completa userId/rol/token, filtro y cursor. Respuestas tardías descartadas por generación/contexto.
- Validación Beta pendiente: desplegar FEEDBACK actualizado (incluye lastMessageId), probar cuentas/roles distintos, cache-hit dentro de TTL, refresh al vencer, invalidación de mutaciones, nuevos mensajes, cambio de cuenta y offline. No se ejecutó deployment ni se consultaron datos productivos.

#### Pruebas Beta pendientes — sincronización segura (ejecutar antes de probar)
```bash
set -euo pipefail
test "$(basename "$(git rev-parse --show-toplevel)")" = "GPSpedia"
case "$(git remote get-url origin)" in https://github.com/infogpstech/GPSpedia|https://github.com/infogpstech/GPSpedia.git|git@github.com:infogpstech/GPSpedia|git@github.com:infogpstech/GPSpedia.git) ;; *) echo 'Repositorio remoto incorrecto'; exit 1 ;; esac
test "$(git branch --show-current)" = "GPSpedia2.2.5_work"
if [ -n "$(git status --porcelain)" ]; then echo 'Hay cambios locales sin guardar; no se sincroniza.'; exit 1; fi
git fetch origin GPSpedia2.2.5_work
git pull --ff-only origin GPSpedia2.2.5_work
git rev-parse HEAD
```
Después de la sincronización: desplegar FEEDBACK en el proyecto Beta autorizado; comprobar Reportes/Aportaciones/tickets propios por rol; cambiar entre filtros con caché fresca y confirmar que no se repite la lectura; esperar más de 60 s y confirmar refresh sin vaciar el contenido; reabrir conversaciones y comprobar que los mensajes frescos se reutilizan; enviar/archivar/cerrar/marcar leído y comprobar invalidación; recibir un mensaje nuevo y comprobar que lastMessageId obliga a actualizar; cambiar de cuenta y comprobar aislamiento; repetir offline con contenido cacheado. Registrar cuenta/rol, navegador, tiempos, solicitudes de red y versión desplegada.


#### Cierre local — GP-DEV-CUT-AUDIT-TOOLBAR-01 — 2026-11-17
- Commits: 5c4024f57e491c841092cb5cd2dd325df5c97c89 (toolbar), 699ac6d7ae4112128eb339b9f76b8050dc6ae679 (contratos CSS), fe1ee909fad6adc47bbdca3293e45dad73a5fabb (tests).
- CI run 44081112777 SUCCESS: 133 suites, 1,987 pruebas, 0 fallos. CortesImageReconciliationUI 14/14; DeveloperPanelUX 7/7; InboxUi 80/80; AdminReplacedImagesIntegrity 55/55.
- GitHub Pages run 44081111776 SUCCESS para fe1ee909fad6adc47bbdca3293e45dad73a5fabb.
- Se conservaron los cinco IDs, handlers, permisos, confirmaciones, hidden/disabled y updateControls. La barra compacta/expandible solo modifica presentación; reduced-motion y scroll global validados por CI.

#### Pruebas Beta pendientes — sincronización segura (ejecutar antes de probar)
```bash
set -euo pipefail
test "$(basename "$(git rev-parse --show-toplevel)")" = "GPSpedia"
case "$(git remote get-url origin)" in https://github.com/infogpstech/GPSpedia|https://github.com/infogpstech/GPSpedia.git|git@github.com:infogpstech/GPSpedia|git@github.com:infogpstech/GPSpedia.git) ;; *) echo 'Repositorio remoto incorrecto'; exit 1 ;; esac
test "$(git branch --show-current)" = "GPSpedia2.2.5_work"
if [ -n "$(git status --porcelain)" ]; then echo 'Hay cambios locales sin guardar; no se sincroniza.'; exit 1; fi
git fetch origin GPSpedia2.2.5_work
git pull --ff-only origin GPSpedia2.2.5_work
git rev-parse HEAD
```
Después: abrir Developer → Auditoría de Cortes en escritorio y PWA móvil; comprobar barra compacta, expansión/contracción por clic y teclado, nombres accesibles, ausencia de desbordamiento, y visibilidad/disabled de continuar, registrar, organizar y conciliar en estados parcial/completo; verificar confirmaciones sin ejecutar operaciones destructivas; repetir con prefers-reduced-motion activo.


### Adenda — Verificación remota de los siete servicios — 2026-11-17
**Estado: DISPONIBILIDAD REMOTA VERIFICADA; PRUEBAS FUNCIONALES DIFERIDAS A BETA.**
- Corte funcional solicitado: `301c7b3a5840549819b2b6126d548df44af07da2`. Se excluyó `a8c4a087e10cadf9264ce92cf328ac2032d5321b` y sus cambios posteriores, incluida recuperación de contraseña.
- Regresión automatizada del corte: Actions run `44017363224` SUCCESS — 132 suites, 1,965 pruebas aprobadas, 0 fallos; sintaxis aprobada; Coordinador compartido 55/55.
- Diagnóstico remoto: Actions run `44090225564` SUCCESS — 7/7 endpoints disponibles usando exclusivamente GET `?debug=true`, con configuración y contratos leídos desde el SHA de corte. Se comprobó HTTP correcto, JSON objeto, identidad exacta, estado available/online, versión no vacía y ausencia de campos sensibles.
- Versiones/latencias: AUTH 2.2.5 (1596 ms), CATALOG 2.4.0 (1097 ms), WRITE 2.3.1 (1477 ms), USERS 2.4.2 (1046 ms), FEEDBACK 1.2.2 (1683 ms), UTILITIES 1.5.0 (1092 ms), ADMIN 2.7.1 (2442 ms). ADMIN superó el umbral de 2,000 ms y requiere seguimiento; la disponibilidad no se considera fallida por ello.
- Alcance de la prueba: no se enviaron POST, credenciales ni escrituras. No valida operaciones autenticadas, permisos efectivos de usuario, hojas/Drive ni integridad funcional de dependencias.
- Discrepancia documental pendiente: `Services/SERVICE_HEALTH.md` indica FEEDBACK 1.2.1 y ADMIN 2.6.0; los endpoints reportaron 1.2.2 y 2.7.1 respectivamente. Debe reconciliarse la semántica de versión de FEEDBACK (componente 2.3.0 frente a versión del endpoint 1.2.2) antes de actualizar el contrato.
- Efecto colateral del push del harness: regression run `44090225648` sobre HEAD posterior registró 107 suites, 1,601 PASS y 2 suites fallidas (AUTH recuperación de contraseña e INTEGRATION CDN woff2); no corresponde al corte solicitado. Pages run `44090225354` SUCCESS. No se modificaron deployments Apps Script.
- Procedimiento reproducible: workflow `.github/workflows/deployed-service-health.yml` fija TARGET_COMMIT; `JS/Tests/RemoteServiceHealth.mjs` obtiene el inventario desde ese SHA y consulta los siete endpoints en paralelo con timeout de 8 s, sin efectos de escritura.

### GP-DEV-TRAFFIC-GLOBAL-02 — Agregado global de tráfico por servicio
**Prioridad: P1 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA (2026-11-17).**

**Objetivo**
- Sustituir las métricas locales del navegador por un agregado global coherente y etiquetado por fuente, sin una llamada de red por acción ni bloqueos que degraden lecturas.
- Mantener autenticación Developer, no exponer datos personales, no contar la propia consulta de telemetría y no presentar un cero parcial como ausencia de tráfico.

**Implementación comprobada en la rama**
- Frontend: dashboard Developer consulta Coordinator y elimina el panel de métricas locales del navegador. Los detalles muestran ventanas 1 h, 6 h y 24 h; refresco remoto condicionado a visibilidad y con intervalo mínimo de 60 s.
- Coordinator: registra operaciones protegidas con lease y el feed público dentro del lock ya existente; sin llamada de red ni lock adicional.
- CATALOG: cuatro POST directos (getCatalogData, getDropdownData, getSuggestion y getNavigationData) se cuentan localmente en buckets horarios de 24 h mediante ScriptProperties y tryLock(0).
- AUTH: validateSession se cuenta localmente; login, benchmark PBKDF2 y operaciones protegidas permanecen en Coordinator.
- WRITE: checkVehicle, getSuggestion y checkVinDuplicate se cuentan localmente; las mutaciones protegidas permanecen en Coordinator.
- FEEDBACK: getPysData, getCatalogChanges y suggestYear anónimo (userId 0) se cuentan localmente; sendContactForm y suggestYear autenticado se cuentan por Coordinator.
- USERS: getUsers, createUser y updateProfile pasan por Coordinator; no requiere contador local.
- UTILITIES: migrateTimestamps obtiene una lease UTILITIES dentro del handler y ya se cuenta en Coordinator; se retiró el contador directo para evitar doble conteo.
- ADMIN: operaciones protegidas se cuentan en Coordinator; ping se excluye intencionalmente como sondeo.
- Los contadores directos usan ScriptProperties, buckets horarios 24 h y tryLock(0). Si hay contención o falla PropertiesService, se omite solo la métrica y continúa el handler. El endpoint interno getServiceTraffic se excluye del conteo.
- ADMIN consulta los cuatro endpoints directos (CATALOG, AUTH, WRITE y FEEDBACK) en una sola operación UrlFetchApp.fetchAll; si el lote falla, reintenta endpoints individualmente. Un fallo o secreto faltante en una fuente no invalida las demás ni el agregado Coordinator.
- Los secretos son distintos por servicio: GPSpedia_CATALOG_TRAFFIC_SECRET, GPSpedia_AUTH_TRAFFIC_SECRET, GPSpedia_WRITE_TRAFFIC_SECRET y GPSpedia_FEEDBACK_TRAFFIC_SECRET. Cada valor debe configurarse en Script Properties del servicio correspondiente y en ADMIN. No crear secreto para USERS, UTILITIES ni ADMIN.
- Se corrigió el lock de CATALOG: releaseLock solo ocurre si tryLock(0) adquirió el lock. La misma regla se aplica a los contadores directos AUTH/WRITE/FEEDBACK.
- Se sincronizó JS/Tests/Auth.js con el dispatcher y helper de AUTH, preservando su Spreadsheet ID aislado.

**Pruebas y resultados esperados**
- CatalogTrafficTelemetry: lock libre/ocupado, no espera, liberación correcta, buckets, retención, secretos y errores best-effort.
- DirectServiceTrafficTelemetry: AUTH/WRITE/FEEDBACK; seis casos por servicio (18/18): acciones directas auditadas, buckets, secretos, lock ocupado sin release, y fallos PropertiesService.
- ServiceTrafficAggregation: 6/6 casos: suma Coordinator+CATALOG y fuentes directas, preservación de otros servicios, fuentes parciales, entradas inválidas y no mutación de datos.
- ServiceTrafficBatch: 5 casos: fetchAll agrupado, secreto faltante, fallback individual, error de una fuente y fallo de PropertiesService.
- ServiceTrafficAdminContract: 33/33; rol Developer, consulta de solo lectura, exclusión de auto-conteo, fuentes directas y rutas, UI y ausencia de métricas locales.
- SensitiveLogsTrustedActor y PasswordKdfBenchmark: los harnesses de AUTH deben inyectar dependencias de telemetría como stubs; las operaciones protegidas no se cuentan como rutas directas.
- Regresión completa: ejecutar todas las suites y corregir cada fallo reproducible; no reducir suites, desactivar casos ni alterar aserciones para lograr verde.
- Health remoto: GET ?debug=true a los siete servicios; validar HTTP, JSON, identidad, estado, versión y ausencia de campos sensibles. Esperado: 7/7 con latencias registradas; no POST ni escrituras.
**Preparación y ejecución Beta (pendiente; no simular ni marcar como aprobada)**

Antes de iniciar cualquier prueba Beta, desde la raíz del clon autorizado:

```bash
set -e
test "$(basename "$(git rev-parse --show-toplevel)")" = "GPSpedia"
test "$(git branch --show-current)" = "GPSpedia2.2.5_work"
test -z "$(git status --porcelain)" || { echo "Hay cambios locales; detener sin descartarlos."; exit 1; }
git remote get-url origin | grep -q 'infogpstech/GPSpedia'
git fetch origin GPSpedia2.2.5_work
git pull --ff-only origin GPSpedia2.2.5_work
git rev-parse HEAD
```

1. Usar únicamente los proyectos Apps Script y datos aislados del entorno Beta; nunca producción.
2. Medir latencia p50/p95 de las rutas directas antes del despliegue con el mismo volumen y patrón de solicitudes que se usará después.
3. Generar cuatro secretos aleatorios distintos, de al menos 32 caracteres, fuera del repositorio. Guardar cada valor únicamente en Script Properties del servicio correspondiente y de ADMIN: `GPSpedia_AUTH_TRAFFIC_SECRET`, `GPSpedia_CATALOG_TRAFFIC_SECRET`, `GPSpedia_WRITE_TRAFFIC_SECRET` y `GPSpedia_FEEDBACK_TRAFFIC_SECRET`. No imprimirlos ni registrarlos.
4. Desplegar a Beta los proyectos Apps Script actualizados de AUTH, CATALOG, WRITE, FEEDBACK y ADMIN. Confirmar que Coordinator esté en la versión Beta compatible con los servicios; no modificar deployments productivos.
5. Ejecutar GET `?debug=true` a los siete servicios y confirmar identidad/versión antes de probar acciones.
6. Ejecutar acciones Beta representativas: AUTH/validateSession; CATALOG/getCatalogData, getDropdownData, getNavigationData; WRITE/checkVehicle, getSuggestion, checkVinDuplicate; FEEDBACK/getPysData y getCatalogChanges, además de suggestYear anónimo. Verificar que sendContactForm y suggestYear autenticado sigan atribuyéndose a Coordinator.
7. En modo silentRegister, validar checkOperation/addOrUpdateCut/addSupplementaryInfo a través de ADMIN y comprobar que Coordinator los contabiliza una sola vez.
8. Consultar el dashboard Developer y verificar fuentes disponibles, ventanas 1/6/24 h, conteos por servicio, ausencia de doble conteo y estado parcial si una fuente falla.
9. Medir p50/p95 después del despliegue, tasa de eventos omitidos por tryLock(0), errores de PropertiesService y consistencia aproximada frente al volumen de pruebas. Confirmar que la contención no añade esperas ni altera las respuestas.
10. Si una fuente falla, conservar el agregado Coordinator y marcar esa fuente como parcial; corregir y repetir la prueba completa afectada.

No se han desplegado proyectos Apps Script ni configurado secretos remotos. La falta de acceso de despliegue no impide el cierre local; las pruebas anteriores permanecen PENDIENTES DE DESPLIEGUE / VALIDACIÓN BETA.

**Auditoría de rutas y decisiones contra doble conteo**
- AUTH validateSession: directa; las acciones protegidas y benchmark obtienen lease.
- WRITE checkVehicle/getSuggestion/checkVinDuplicate: directas; las mutaciones protegidas obtienen lease.
- FEEDBACK getPysData/getCatalogChanges/suggestYear anónimo: directas; sendContactForm, suggestYear autenticado y otras acciones protegidas obtienen lease.
- UTILITIES migrateTimestamps: ya obtiene lease en su handler, por lo que no se instrumenta localmente.
- USERS: las acciones conocidas pasan por Coordinator.
- ADMIN: ping es health; las demás acciones pasan por Coordinator.
- CATALOG: cuatro acciones directas; feed incremental contado por Coordinator.
- El agregado no representa solicitudes HTTP externas/legacy no mapeadas ni health probes; contadores locales pueden subcontar por contención. No sacrificar latencia o disponibilidad para aumentar artificialmente el conteo.

**Evidencia más reciente**
- CI 44108376469 SUCCESS: 138 suites, 2,043 pruebas aprobadas, 0 fallos. CatalogTrafficTelemetry 8/8; ServiceTrafficAdminContract 33/33; ServiceTrafficAggregation 6/6; DirectServiceTrafficTelemetry 18/18; ServiceTrafficBatch 5/5; DirectTrafficRoutingCoverage 6/6.
- Health remoto 44108375920 SUCCESS: 7/7. Latencias: ADMIN 2,066 ms y FEEDBACK 2,336 ms (vigilar); AUTH 1,533 ms; CATALOG 1,238 ms; USERS 1,165 ms (segundo intento; 13,919 ms total); UTILITIES 1,142 ms; WRITE 1,268 ms. Solo GET diagnóstico.
- GitHub Pages 44108370609 SUCCESS para el HEAD documental validado en esa ejecución. No se desplegaron Apps Script ni configuraron secretos remotos.
- Auditoría de rutas encontró y corrigió la omisión FEEDBACK/getCatalogChanges: es pública y no obtiene lease Coordinator, por lo que ahora se incluye en el contador directo junto con getPysData. El contrato de routing verifica también el modo silentRegister→ADMIN y sus leases coordinadas.

**Evidencia anterior**
- CI 44099217828 SUCCESS: 135 suites, 1,998 pruebas aprobadas, 0 fallos (antes de ampliar los contadores directos a AUTH/WRITE/FEEDBACK).
- Health remoto 44098664894 SUCCESS: 7/7, con latencias ADMIN 1,741 ms, AUTH 1,660 ms, CATALOG 1,204 ms, FEEDBACK 1,598 ms, USERS 1,048 ms, UTILITIES 1,155 ms y WRITE 1,404 ms.
- CI 44101392771: 93 suites, 1,378 aprobadas; fallos detectados: paridad de copia AUTH y una aserción de endpoint Utilities en el test nuevo. Se corrigió el fixture AUTH y se retiró el contador Utilities al comprobar que ya obtiene lease Coordinator.
- Última regresión para el HEAD anterior a las correcciones: 44101675660 estaba en progreso al momento de la actualización. Se debe verificar su resultado y volver a ejecutar en el HEAD actual.


### Reapertura puntual — GP-UX-INBOX-DESKTOP-02 — 2026-11-17
**Estado: IMPLEMENTACIÓN LOCAL Y CI COMPLETADAS; VALIDACIÓN VISUAL BETA PENDIENTE.**

- La revisión del código confirmó que el desplazamiento vertical del formulario y las acciones Salir/Enviar fijas ya estaban implementados; se conserva esa solución.
- La bandeja vacía ya limitaba la altura de la lista a 48 px y el panel lateral se ajustaba al contenido; se conserva esa compactación.
- Se reforzó el botón de búsqueda con ancho/flex base de 40 px y el botón de envío de búsqueda con ancho mínimo de 40 px, evitando que el icono se comprima o recorte.
- Se detectó que Plantilla y Categoría seguían apiladas en el menú de opciones, en contra de la solicitud más reciente. Ahora comparten una cuadrícula de dos columnas con el mismo ancho; para roles sin permiso de plantilla, Categoría ocupa una sola columna completa.
- En pantallas estrechas se reduce el espacio entre columnas y el padding de los selectores. Se eliminó CSS obsoleto de `.inbox-template-category-row` que ya no correspondía al DOM actual.
- App Shell actualizado a `gpsepedia-cache-v69`; se sincronizaron los contratos ServiceWorkerCache, PasswordRecovery y OfflineBrandAssets.
- GitHub Actions `44115093952`: SUCCESS — 138 suites, 2,031 pruebas aprobadas, 0 fallos. InboxUi: 83/83 PASS. Health remoto: workflow automático de solo lectura SUCCESS. GitHub Pages: build/deploy automático en curso al registrar esta adenda.
- No se desplegaron servicios Apps Script ni se ejecutaron pruebas funcionales Beta. La inspección visual real en escritorio, móvil y PWA queda pendiente de Beta.


---

## GP-PERF-SIMPLIFY-01 — Simplificación de seguridad operativa y optimización global
**Prioridad: P0/P1 — REQUISITO REGISTRADO (2026-11-17).**
**Estado: P0–P5 COMPLETADAS LOCALMENTE; validaciones de integración diferidas a Beta.**

**Objetivo:** retirar validaciones transaccionales, llamadas entre servicios y revalidaciones por acción que añaden latencia sin aportar valor funcional. La plataforma debe ejecutar las funciones en el menor tiempo posible.

**Requisito:** login con contraseña hasheada usando el esquema actual; el rol asignado determina las capacidades. Para cada acción solo se comprueba el permiso sencillo del rol, sin viajes de red ni validaciones transaccionales. Los aportes (cortes, tutoriales, videos, imágenes y demás) deben registrar directamente el contenido, fecha del servidor y colaborador autenticado. No se requiere que un servicio pida permiso a otro ni que Coordinator valide la legitimidad de cada transacción.

**Excepciones obligatorias:** (1) cierre remoto de sesión y limpieza/invalidez de caché del usuario; (2) al eliminar una cuenta, invalidar sesiones y evitar nuevos accesos; (3) bloqueo temporal después de varios intentos fallidos de login. Mantener la matriz de roles. No cambiar el hash actual.

**Plan y orden:**
1. **P0 — Inventario:** mapear Coordinator, SharedMutationClient, leases, locks, consultas de identidad, reintentos y llamadas de red por acción; trazar WRITE/FEEDBACK/ADMIN y flujos de carga.
2. **P1 — Aportes:** retirar Coordinator/leases/revalidaciones de las escrituras ordinarias; guardar datos, fecha y colaborador en el servicio dueño del registro.
3. **P2 — Archivos:** simplificar cargas de imágenes, tutoriales y videos a recepción, almacenamiento y registro; evitar bloqueos durante la carga.
4. **P3 — Sesión:** conservar logout remoto, invalidación al borrar cuenta y bloqueo temporal de login; eliminar comprobaciones por acción y actividad redundante.
5. **P4 — Plataforma:** reducir llamadas duplicadas, cascadas, escrituras auxiliares, esperas y sincronizaciones que bloqueen módulos independientes.
6. **P5 — Validación:** pruebas locales de permisos por rol, aportes, archivos, revocación, cuenta eliminada y bloqueo de login; medir llamadas/latencias cuando sea posible. No desplegar Apps Script ni ejecutar Beta sin autorización.

**Criterios de aceptación:** rutas ordinarias sin lease ni llamada de autenticación a Coordinator; permisos por rol preservados; aportes y cargas con el mínimo de pasos; excepciones de sesión funcionando; regresión local aprobada. No afirmar mejoras de latencia sin mediciones.

**P0 completada (2026-11-17):** auditoría estática de Coordinator, SharedMutationClient, WRITE, ADMIN y FEEDBACK. Informe: `AUDITORIA_P0_LATENCIA_VALIDACIONES.md`. Se confirmaron dos viajes HTTP por lease (acquire/release), revalidación central de sesión por adquisición, rutas ADMIN→WRITE con validación anidada y locks de hasta 30 s que pueden cubrir cargas Drive. No se midieron latencias reales ni se ejecutaron servicios.

**Estado de fases:** P1, P2, P3 y P4 completadas localmente; P5 cerrada con regresión integral aprobada. Las pruebas externas y de campo permanecen en Beta.

**Documento de ejecución:** `PLAN_SIMPLIFICACION_SEGURIDAD_RENDIMIENTO.md`.


### Seguimiento GP-PERF-SIMPLIFY-01 / P1.1a — 2026-11-17
- CI `44120994810`: FAIL — sintaxis aprobada; 133 suites, 1,925 pruebas aprobadas, 1 suite fallida. La falla está en el extractor de `doPost` del contrato `WriteAuthorizationMinimization`, no en una aserción de comportamiento del servicio.
- Se ajusta la prueba para inspeccionar directamente el bloque del router que despacha acciones no compartidas; se conservan las aserciones de no lease/no Coordinator para `checkOperation`.
- Estado P1.1a: IMPLEMENTADA; VALIDACIÓN PENDIENTE.
- Siguiente: nueva regresión CI. Luego P1.1b: origen de actor/rol y simplificación de mutaciones WRITE/ADMIN.


### GP-PERF-SIMPLIFY-01 — estado actualizado 2026-11-17
- P0: COMPLETADA (auditoría estática).
- P1.1a: COMPLETADA. CI `44123644616`: 138 suites / 2,021 pruebas / 0 fallos.
- P1.1b: implementación realizada, validación pendiente. Cortes y aportes suplementarios se enrutan a WRITE; ADMIN rechaza las rutas heredadas. Registro silencioso conserva permiso Desarrollador. WRITE utiliza actor confiable cacheado localmente por 15 s; la revocación remota puede tardar hasta ese TTL en una solicitud directa.
- CI `44125814255`: FAIL por 3 suites de contratos desactualizados (expectativas de ruta/actor, `sessionOptions` ya retirado de WRITE y orden de claves del mapa). Sintaxis aprobada; 1,028 pruebas aprobadas, 3 suites fallidas.
- Siguiente: corregir contratos y ejecutar regresión. Luego P1.2: retirar cargas Drive de locks prolongados y evitar serializar operaciones independientes.


### GP-PERF-SIMPLIFY-01 — cierre P1.1 / avance P1.2 (2026-11-17)
- P1.1a: COMPLETADA — CI 44123644616, 138 suites / 2,021 pruebas / 0 fallos.
- P1.1b: COMPLETADA — CI 44126830985, 138 suites / 2,024 pruebas / 0 fallos. WRITE atiende cortes y aportes suplementarios; ADMIN rechaza las rutas antiguas; registro silencioso solo Desarrollador; actor local en caché por 15 s.
- P1.2: EN PROGRESO.
  - P1.2a: pendiente — carga Drive de información suplementaria fuera del ScriptLock de 30 s.
  - P1.2b: pendiente — carga Drive del registro principal de cortes fuera del ScriptLock, conservando ID e idempotencia.
- Siguiente inmediata: P1.2a. No Beta ni despliegue manual de Apps Script.


### GP-PERF-SIMPLIFY-01 — P1.2a — 2026-11-17
- Implementación realizada; validación pendiente: WRITE/addSupplementaryInfo prepara y carga imágenes a Drive antes del lock final. Bajo el lock (5 s de espera máxima) vuelve a leer el vehículo, recalcula el plan y persiste únicamente la información suplementaria.
- El ledger de imágenes usa locks breves para reservar/finalizar cada token; la creación/verificación de archivos y actualización de metadatos Drive ocurren fuera de esos locks. Una marca upload_in_progress impide que dos solicitudes simultáneas con el mismo token creen archivos duplicados. Las cargas de operaciones distintas pueden avanzar en paralelo.
- Se actualizan pruebas de integridad y autorización para el nuevo flujo. CI pendiente; no cerrar P1.2a hasta aprobación.
- Siguiente: CI de regresión. Luego P1.2b: sacar cargas Drive de addOrUpdateCut y conservar asignación de ID/idempotencia.


### Seguimiento P1.2a — CI inicial y corrección de contrato — 2026-11-17
- CI `44130490277`: FAIL — sintaxis aprobada; 131 suites, 1,868 pruebas aprobadas y 1 suite fallida. Único fallo: aserción de texto del test AddSupplementaryInfoIntegrity, que asumía espacios exactos en el log del actor. No se detectó otro fallo de lógica en las suites ejecutadas.
- Corrección localizada de la prueba: verificar el log y el uso de actorName sin depender del formato exacto de concatenación. Nueva regresión pendiente.
- P1.2a sigue EN PROGRESO hasta que CI apruebe.


### Adenda GP-PERF-SIMPLIFY-01 / P1.2a — 2026-11-17
- Estado: **EN PROGRESO — validación pendiente**.
- CI `44130802404`: sintaxis aprobada; 136 suites, 2,003 pruebas aprobadas y una suite fallida. El fallo es una expectativa obsoleta de `WriteAuthorizationContracts.js` que requería autenticación dentro del lock, en contradicción con el flujo vigente.
- Corrección aplicada al contrato: exige una única autenticación del actor compartido antes de preflight/carga de imágenes y antes del lock final; el handler bajo lock no vuelve a autenticar.
- No se cambia la lógica del servicio ni se debilita la autorización. Nueva CI pendiente.
- Siguiente: validar P1.2a; después ejecutar P1.2b para sacar las cargas Drive de `addOrUpdateCut` del lock prolongado, preservando asignación de ID e idempotencia.


### GP-PERF-SIMPLIFY-01 / P1.2a — cierre — 2026-11-17
- Estado: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- CI `44131693251`: SUCCESS — sintaxis aprobada, 138 suites, 2,026 pruebas aprobadas, 0 fallos.
- `addSupplementaryInfo` autentica una vez el actor compartido antes de preparar/cargar imágenes; Drive y las operaciones de metadatos se ejecutan fuera del lock final. El lock de persistencia espera como máximo 5 s y relee/recalcula el estado antes de escribir. El ledger usa reservas y finalizaciones breves para impedir duplicados del mismo token sin serializar cargas independientes.
- Se corrigió el contrato AUG-039 para reflejar este flujo, sin modificar la autorización ni el servicio.
- Pendiente Beta: validar Drive/OAuth y concurrencia real en deployment. No impide el cierre local.
- Siguiente: **P1.2b**, separar cargas Drive de `addOrUpdateCut` del bloqueo prolongado, conservando ID e idempotencia.


### GP-PERF-SIMPLIFY-01 / P1.2b — auditoría inicial — 2026-11-17
- Estado: **EN PROGRESO — análisis de dependencias completado; implementación pendiente**.
- `handleAddOrUpdateCut` mantiene un lock de hasta 30 s mientras ejecuta cinco posibles cargas Drive dentro de `handleAddOrUpdateCutLockedUnsafe_` (reparación de imágenes existentes, imagen del corte en vehículo existente y dos imágenes en vehículo nuevo).
- Dependencias: ID nuevo, slot de corte, `opId`/huella, rollback de fila y contador, y recuperación de operaciones pendientes. Se debe evitar que dos aportes simultáneos reserven el mismo slot o que una carga fallida deje el registro sin recuperación.
- Reutilizar el cargador con ledger lock breve de P1.2a. Separar transferencia Drive de la persistencia sin introducir autenticación entre servicios, leases o verificaciones ceremoniales.
- Siguiente: implementar y probar fases de preparación/carga, reserva breve de ID/slot e integración final; pruebas locales de concurrencia, reintento idempotente, rollback y recuperación. No desplegar Apps Script ni ejecutar Beta.


### Requisito transversal — monitoreo de servicios y dashboard de actividad — 2026-11-17
- Estado: **OBLIGATORIO — PRESERVAR EN TODAS LAS TAREAS**.
- Mantener el workflow de salud de servicios, documentación de monitoreo, dashboard de actividad, recolección de tráfico/operaciones y métricas existentes.
- No eliminar la telemetría ni sus fuentes para simplificar servicios. Optimizar su costo para que sea best-effort, no bloquee operaciones y no agregue viajes de red ni esperas a cada acción.
- Criterios de regresión: RemoteServiceHealth, ServiceHealthContract, DirectServiceTrafficTelemetry, DirectTrafficRoutingCoverage, ServiceTrafficBatch, ServiceTrafficAggregation, CatalogTrafficTelemetry, ServiceMetricsTelemetry, ActivityDashboardContributions, ActivityDashboardInsights, ActivityLogsBoundedRead y ActivityLogRetention.
- El monitoreo remoto debe permanecer de solo lectura; no desplegar servicios ni modificar datos externos como parte de estas pruebas.


### GP-PERF-SIMPLIFY-01 / P1.2b — cierre — 2026-11-17
- Estado: **COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**.
- WRITE libera el ScriptLock durante las cinco rutas de trabajo Drive de `addOrUpdateCut`; creación de carpetas, transferencia y vínculo del ledger ocurren fuera del lock global. La adquisición inicial usa `tryLock(0)` para evitar esperas de hasta 30 s.
- El actor/rol se resuelve una sola vez. Los slots con operaciones `pending` se reservan al seleccionar nuevos cortes. El ID de vehículo nuevo y el `opId` quedan asignados antes de cargar; ante fallo de readquisición o fase posterior, se conserva el `opId` pendiente para recuperación y no se revierte una fila con datos concurrentes.
- La compatibilidad heredada sin `opId` mantiene el flujo serializado. No se modificó la matriz RBAC.
- CI `44135220800`: SUCCESS — 139 suites / 2,027 pruebas / 0 fallos. Prueba focalizada WRITE Drive: 1/1 PASS. Health remoto read-only `44135220571`: SUCCESS; Pages `44135219018`: SUCCESS.
- Beta pendiente: Drive/OAuth real, concurrencia de usuarios y recuperación con deployment. No se desplegó Apps Script ni se alteraron datos externos.
- Siguiente: **P1.3 — simplificación de FEEDBACK**.


### Cierre P1.3 — simplificación de FEEDBACK e Inbox — 2026-11-17
- **Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**
- FEEDBACK ya no adquiere leases ni realiza viajes a Coordinator por acción. El dispatcher usa el actor confiable de la caché local para las acciones protegidas; las rutas públicas/anónimas siguen sin exigir sesión. Se conserva la matriz de permisos FEEDBACK.
- Inbox y los locks de escritura de FEEDBACK ya no usan esperas prolongadas. Los locks locales imprescindibles intentan adquisición inmediata (tryLock(0)); ante contención se devuelve error recuperable o se invalida el feed incremental para que el cliente recargue, sin bloquear solicitudes independientes.
- Se conserva el registro directo de tráfico FEEDBACK con contador best-effort y tryLock(0). Los fallos de PropertiesService/contención no impiden ejecutar el handler. No se retiraron el workflow de salud, los endpoints de monitoreo ni los contadores del dashboard.
- Pruebas: GitHub Actions 44140231970 SUCCESS — sintaxis aprobada, **140 suites / 2,028 pruebas / 0 fallos**. DirectServiceTrafficTelemetry 18/18; DirectTrafficRoutingCoverage 6/6; ServiceTrafficAdminContract 33/33; ActivityDashboardContributions 1/1.
- Salud remota 44140232048 SUCCESS — **7/7 servicios disponibles**, solo GET de diagnóstico. Versiones/latencias: ADMIN 2.7.1 (1,972 ms), AUTH 2.2.5 (1,400 ms), CATALOG 2.4.0 (1,234 ms), FEEDBACK 1.2.2 (1,325 ms), USERS 2.4.2 (1,149 ms), UTILITIES 1.5.0 (1,203 ms), WRITE 2.3.1 (2,463 ms). WRITE superó el umbral de 2,000 ms; se registra como observación, no como indisponibilidad.
- GitHub Pages 44140229137 SUCCESS.
- Commits de implementación/pruebas: 8f25c60f028b8472265f347e16f04318826b0618, 6d6649f49cd73149015f00a9f8e1eca9a71fd07e, 6507d42e270be07605fab058f23169c4594f46cf, 698868a9d1fae0ea0e104a37140249e3c3baa590, 25fbadfead33d4b530073647bf01a923d8452bfd.
- La base GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1; no se modificó.
- Pendiente Beta: concurrencia real en Inbox/FEEDBACK, comportamiento de actualización de catálogo bajo contención y comprobación de permisos con sesiones reales. No se desplegaron Apps Script ni se modificaron hojas/Drive.
- **Siguiente: P2.1 — auditar cargas de imágenes y videos (Cortes, PyS, Tutoriales, Inbox/adjuntos y aprobación YouTube), identificar llamadas/validaciones duplicadas y separar Drive de cualquier lock restante. Mantener permisos por rol, ID/autor/fecha y telemetría de salud/dashboard.**


### Inicio P2.1 — auditoría de imágenes y videos — 2026-11-17
- Auditoría estática registrada en `AUDITORIA_P2_CARGAS_ARCHIVOS.md`; no se modificó código productivo en esta sub-tarea.
- WRITE: transferencias de imágenes de cortes y aportes suplementarios ya están fuera del lock desde P1.2. FEEDBACK: `handleReportProblem`, `handleSuggestCutChange` y `handleAddProblem` aún mantienen bloqueos durante operaciones Drive.
- YouTube: transferencia resumable directa del navegador en bloques de 8 MiB con checkpoints IndexedDB; no mantiene ScriptLock durante la transferencia. Se conserva.
- ADMIN: herramientas de auditoría/conciliación/organización de imágenes son mantenimiento de desarrollador y quedan fuera del aporte ordinario; revisar separadamente en P4.
- **P2.1 AUDITORÍA COMPLETADA. P2.2a siguiente:** separar adjuntos de reportes y sugerencias de sus locks; después P2.2b simplificar el lock de PyS sin añadir nuevas capas transaccionales. Mantener monitoreo y dashboard.


### Cierre P2.2a — adjuntos de reportes y sugerencias fuera del lock — 2026-11-17
- `handleReportProblem` y `handleSuggestCutChange` preparan/cargan sus imágenes a Drive antes de adquirir el ScriptLock de la hoja. El lock queda limitado a revisar duplicados, asignar ID y persistir el registro/metadata.
- Se conserva la asociación por reportId/suggestionOperationId, la metadata de imagen y la limpieza de archivos. En reportes, si la reversión de la referencia no puede confirmarse, la imagen se conserva para evitar borrar un archivo posiblemente vinculado.
- Nueva prueba `P2FeedbackImageUploadLocks.mjs`: 1/1 PASS; verifica el orden de carga/lock, limpieza prudente, telemetría best-effort y presencia del workflow de salud/dashboard.
- CI `44141910133` SUCCESS: **141 suites / 2,029 pruebas / 0 fallos**. Health remoto `44141910250` SUCCESS: 7/7 servicios disponibles, solo GET. Pages `44141907494` SUCCESS.
- Telemetría FEEDBACK y fuentes del dashboard permanecen intactas; no se desplegaron Apps Script ni se modificaron hojas/Drive productivos. Validación real Drive/OAuth y concurrencia queda diferida a Beta.
- **P2.2a COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Siguiente P2.2b:** separar la creación de imagen PyS de su lock y simplificar el flujo; evitar ampliar el ledger transaccional, conservando solo la asociación básica de imagen/registro y el comportamiento de reintento ya requerido por el cliente.


### Cierre P2.2b — PyS carga imagen fuera del lock — 2026-11-17
- `handleAddProblem` valida hojas y operación antes de transferir. La creación del archivo Drive, descripción inicial y comprobación de permisos ocurren antes de adquirir el ScriptLock. Bajo el lock quedan la relectura de la operación, asignación del ID, escritura de fila/ledger y confirmación.
- Los reintentos ya vinculados no vuelven a subir la imagen. Los reintentos `UPLOAD_PENDING` reutilizan el archivo existente; los envíos simultáneos con el mismo `opId` revalidan bajo lock y descartan el archivo redundante si otro envío ganó la carrera.
- Se conserva el ledger existente, sin añadir estados/capas transaccionales. El archivo se conserva si no se puede confirmar la referencia/rollback. La transferencia YouTube resumable no se modificó.
- Pruebas PyS: `PysCreationIntegrity` 53/53; `PysImageStorageRecovery` 22/22; contrato `P2PysImageUploadOutsideLock` PASS.
- CI `44144972128` SUCCESS: **142 suites / 2,104 pruebas / 0 fallos**. Health remoto `44144972115` SUCCESS: **7/7 servicios disponibles**, solo GET. Pages `44144970560` SUCCESS.
- El monitoreo y la telemetría del dashboard permanecen activos. No se desplegaron Apps Script ni se modificaron hojas/Drive productivos. Validación Drive/OAuth real y concurrencia multiusuario diferida a Beta.
- **P2.2b COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Siguiente P2.3:** cerrar contrato del flujo de video resumable directo (bloques, checkpoints IndexedDB, cancelación/reanudación y aprobación), sin trasladar la transferencia a Apps Script.


### Cierre P2.3 — contrato de video YouTube resumable — 2026-11-17
- Auditoría confirmó que la transferencia continúa directa desde el navegador hacia YouTube mediante sesiones resumables, bloques de 8 MiB y checkpoints IndexedDB. Apps Script solo inicializa la sesión y registra/gestiona la aprobación posterior; no recibe ni retransmite los bloques de video.
- Pruebas focalizadas aprobadas: YouTubeUploadRecordPersistence 14/14; YouTubeUploadCheckpointRecovery 2/2; YouTubeUploadCloseDuringTransfer 6/6; YouTubeUploadCompletedRecordRecovery 6/6; YouTubeUploadDraftRecovery 3/3; YouTubeUploadOverlayLifecycle 8/8; YouTubeUploadXssIntegrity 5/5; YouTubeUploadClient 12/12; precondiciones server-side 8/8.
- No se modificó el flujo de video. Se mantiene la aprobación interna antes de publicar o vincular videos a Tutoriales/PyS.
- P2.3 COMPLETADA. **P2 (imágenes/videos) completada localmente**, pendiente solo validación Beta real de OAuth/Drive/YouTube.
- **Siguiente P3.1 — auditoría de sesión y rol al iniciar sesión:** el actor cacheado FEEDBACK tiene TTL de 15 s y vuelve a consultar Coordinator al vencer. Esto no coincide completamente con el requisito de verificar usuario/rol solo al iniciar sesión. Auditar cómo propagar un contexto confiable de login a los servicios sin revalidar cada acción ni introducir complejidad innecesaria.


### P3.1a — contexto de sesión cacheado — 2026-11-17
- `checkSession()` restaura la identidad/rol local verificados en login sin consultar AUTH otra vez. WRITE/FEEDBACK consumen el actor compartido desde caché; antes el TTL era 15 s.
- TTL ampliado a 21,600 s (6 h, máximo de CacheService) para evitar viajes a Coordinator por acción y reducir revalidaciones periódicas. En cache hit no hay red.
- Prueba SessionActorCacheLifetime 4/4 PASS. CI 44146072996: 143 suites / 2,108 pruebas / 0 fallos. Health read-only 44146072983: 7/7. Pages 44146072924: SUCCESS.
- Observación de salud: USERS alcanzó 8,489 ms en esta muestra; disponible, pero debe vigilarse.
- Límite: la caché es por proyecto Apps Script; un primer acceso/cache miss o vencimiento aún consulta Coordinator. No se afirma que la validación sea estrictamente solo en login.
- **P3.1a COMPLETADA. P3.1b pendiente:** evaluar precarga del actor desde login en los servicios o aceptar el contexto cacheado 6 h, sin añadir complejidad de seguridad innecesaria. Mantener monitoreo y dashboard.


### P3.1b — decisión sobre propagación del actor — 2026-11-17
- Se evaluó precargar el actor desde AUTH a cada proyecto Apps Script. Las cachés son aisladas por proyecto; hacerlo durante login requiere nuevas llamadas y contratos entre servicios. Se descarta esa ampliación por coste y complejidad.
- Se conserva TTL local de 21,600 s: cache hit sin red ni validación por acción; cache miss inicial/expiración todavía consulta Coordinator. No se presenta como verificación estrictamente limitada al login.
- La revisión detectó que logout, eliminación de cuenta y cambio de rol revocan en Coordinator, pero no limpian las cachés de actor de WRITE/FEEDBACK. La ventana obsoleta puede alcanzar 6 h; hallazgo ALTO registrado en `AUDITORIA_P3_SESION_ACTOR.md`.
- **P3.1b COMPLETADA como evaluación/decisión. P3.1 global permanece EN PROGRESO. Siguiente P3.1c:** implementar invalidación dirigida de las cachés de actor en WRITE/FEEDBACK para las excepciones de sesión, sin Coordinator por acción. Pruebas locales de logout remoto, eliminación, cambio de rol, fallos parciales y aislamiento por token. No desplegar Apps Script ni modificar datos productivos.


### Cierre P3.1c — invalidación dirigida de caché de actor — 2026-11-17
- **Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**
- AUTH envía una acción interna autenticada a WRITE y FEEDBACK para eliminar las claves de caché correspondientes a los tokens revocados. Se conserva exactamente el formato anterior de la clave y el TTL de 6 h para las acciones ordinarias.
- Logout invalida un token. Las revocaciones por usuario (cambio de rol, reset de sesiones, eliminación de cuenta y cambio/restablecimiento de contraseña) recogen los tokens activos de ActiveSessions y limpian ambos servicios antes de revocar Coordinator.
- Si WRITE o FEEDBACK no confirma la limpieza, AUTH detiene la revocación central y devuelve error recuperable; no continúa dejando una sesión central revocada con una caché antigua todavía autorizando.
- La acción interna requiere GPSpedia_SESSION_CACHE_INVALIDATION_SECRET en AUTH, WRITE y FEEDBACK (mismo valor, mínimo 32 caracteres). AUTH requiere además GPSpedia_WRITE_URL y GPSpedia_FEEDBACK_URL con los endpoints /exec actuales. No guardar secretos en el repositorio.
- Pruebas: SessionActorCacheInvalidation 23/23; SessionActorCacheLifetime 4/4. CI 44149804570 SUCCESS: 144 suites / 2,131 pruebas / 0 fallos. Health remoto 44149804587 SUCCESS (solo diagnóstico GET; no valida el código nuevo).
- No se desplegaron Apps Script ni se tocaron propiedades, hojas, Drive o datos productivos. Pendiente Beta: configurar propiedades, desplegar AUTH/WRITE/FEEDBACK y probar revocación real, fallo parcial, reintento y que los cache hits ordinarios sigan sin viajes a Coordinator.
### Adenda correctiva P3.1c — lotes de sesiones ilimitadas — 2026-11-17
- Revisión adicional detectó que SESSION_LIMITS.desarrollador = Infinity, por lo que el límite inicial de cinco tokens habría bloqueado la revocación de cuentas Developer con más de cinco sesiones.
- Corregido: AUTH procesa cualquier cantidad de tokens únicos en lotes de cinco; cada lote debe confirmarse en WRITE y FEEDBACK antes de continuar. Coordinator solo recibe una revocación al final. Un fallo parcial detiene el flujo y permite reintentar idempotentemente.
- La invalidación reutiliza GPSpedia_COORDINATOR_SECRET; no requiere una credencial adicional. Solo deben configurarse en AUTH GPSpedia_WRITE_URL y GPSpedia_FEEDBACK_URL con los endpoints /exec vigentes. Se mantiene pendiente de Beta configurar URLs si aún no existen, desplegar los tres servicios y probar revocaciones reales.
- Prueba focalizada actualizada para 13 sesiones Developer; CI posterior a esta corrección pendiente de confirmación.
### Validación final de la corrección P3.1c — 2026-11-17
- CI 44151856103 SUCCESS: sintaxis aprobada, 144 suites / 2,109 pruebas / 0 fallos. SessionActorCacheLifetime 4/4; SessionActorCacheInvalidation 1/1 con loteo de 13 sesiones Developer y uso del secreto Coordinator existente.
- Health read-only 44151856097 SUCCESS: 7/7 servicios disponibles. No valida el código Apps Script nuevo porque no se desplegó.
- P3.1c: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Pendiente Beta: configurar GPSpedia_WRITE_URL y GPSpedia_FEEDBACK_URL en AUTH, desplegar AUTH/WRITE/FEEDBACK y probar logout, revocaciones multi-sesión, cambios de rol, eliminación, recuperación de contraseña y fallo parcial/reintento.
## GP-PERF-SIMPLIFY-01 — P4 Optimización general — 2026-11-17
**Estado: AUDITORÍA INICIAL COMPLETADA; P4.1 EN PROGRESO.**

- Informe: AUDITORIA_P4_OPTIMIZACION_PLATAFORMA.md.
- P4.1: iniciar la lectura PyS en paralelo con cursor/snapshot inicial del catálogo; aislar fallos PyS y no marcar como fresco un cursor cuando la lectura devuelve datos obsoletos. Mantener el feed incremental.
- P4.2: al abrir el compositor Inbox desde Solicitudes, no esperar la carga remota de conversaciones; cargar destinatarios de inmediato y refrescar la lista aparte.
- P4.3: revisar locks globales de ADMIN para auditoría/organización Drive; no modificar hasta diseñar reservas breves y preservar referencias, idempotencia y rollback.
- No modificar telemetría, dashboard ni health checks. No desplegar servicios ni tocar datos externos.
### P4 — estado actualizado — 2026-11-17
- P4.1 COMPLETADA: arranque PyS en paralelo, error aislado y cursor solo con datos frescos. Pruebas 5/5, CatalogStartupIntegrity 25/25, PysDataCache 18/18.
- P4.2 COMPLETADA: nuevo mensaje desde Solicitudes carga destinatarios sin esperar conversaciones; la lista queda en segundo plano y el sondeo solo inicia si la vista/contexto siguen vigentes. InboxUi 84/84.
- P4.3 PENDIENTE DE DISEÑO: desacoplar ScriptLock de recorridos/movimientos Drive de ADMIN mediante reserva atómica por auditoría/operación, commit breve, expiración y recuperación. No cambiar locks hasta cubrir duplicados concurrentes, retry, rollback y consistencia del inventario.
- CI 44154032505 SUCCESS: 145 suites / 2,117 pruebas / 0 fallos. Health read-only 7/7; Pages build SUCCESS. No deployment Apps Script.
### P4.3a completada; P4.3b pendiente — ADMIN Drive — 2026-11-17
- P4.3a: currentRows y duplicateIds se calculan una vez por lote en handleOrganizeUnusedImagesBatch. Se conserva latestRowsBeforeMove por archivo y todas las revalidaciones/rollback. En 20 archivos se evitan hasta 19 lecturas completas iniciales y 19 scans de duplicados.
- Pruebas AdminReplacedImagesIntegrity 55/55; CI 44154558840 SUCCESS: 145 suites / 2,117 pruebas / 0 fallos; health read-only 7/7.
- P4.3b sigue pendiente: claim/reserva atómica breve y commit por auditId/operationId; recuperación de expiración y pruebas de duplicados concurrentes, fallo entre Drive/Spreadsheet y rollback. No retirar ScriptLock ni cambiarlo por tryLock/UserLock hasta cerrar ese diseño.
### P4 — optimizaciones seguras completadas — 2026-11-17
- P4.1: PyS en paralelo con cursor/snapshot; errores aislados; cursor solo con datos frescos.
- P4.2: compositor Inbox no espera conversaciones; carga remota en segundo plano.
- P4.3a: inventario y duplicados una vez por lote; relectura final de seguridad conservada.
- P4.3b: CacheService getAll/putAll en lotes de 100; 205 páginas: 9 llamadas frente a 615.
- P4.3c: publicación CATALOG por lotes de 50 con requestId idempotente y reset ante persistencia parcial; 20 cambios: 1 viaje de red frente a 20.
- P4.3d: alcance ScriptLock revisado y conservado por ahora. Los leases Coordinator ya protegen conflictos de recursos; no se justificó retirar la protección local sin medición.
- CI 44156469990 SUCCESS: 145 suites / 2,123 pruebas / 0 fallos; health 7/7; Pages build SUCCESS.


### GP-PERF-SIMPLIFY-01 — cierre P5 local — 2026-11-17
- **Estado: COMPLETADA LOCALMENTE.** GitHub Actions run 44166031280: 145 suites, 2,123 pruebas aprobadas, 0 fallos.
- Health read-only 44166031201: 7/7 servicios disponibles. No valida el código Apps Script no desplegado.
- Pages build run 44166030514: SUCCESS.
- La cobertura integral incluye RBAC, rutas ordinarias, escrituras/aportes, cargas, logout y revocación/cachés, cuenta eliminada, bloqueo temporal de login, concurrencia/idempotencia y regresión de UI.
- P5 detectó y corrigió fixtures AUTH/USERS desactualizados y expectativas de tests que todavía exigían leases redundantes para consultas que ya consumen actor cacheado. No se redujeron permisos ni se cambió el algoritmo/los parámetros del hash.
- Sin mediciones de latencia real. Se conservan únicamente cifras de reducción de llamadas ya documentadas en P4.

### Validación Beta — pendiente de despliegue y autorización
```bash
# Ejecutar desde el repositorio local antes de cualquier prueba Beta.
test "$(basename "$(git rev-parse --show-toplevel)")" = "GPSpedia" || { echo "Repositorio incorrecto" >&2; exit 1; }
test "$(git branch --show-current)" = "GPSpedia2.2.5_work" || { echo "Rama incorrecta" >&2; exit 1; }
test -z "$(git status --porcelain)" || { echo "Hay cambios locales sin guardar; no se sincroniza" >&2; exit 1; }
git fetch origin
git pull --ff-only origin GPSpedia2.2.5_work
test "$(git branch --show-current)" = "GPSpedia2.2.5_work" || { echo "La rama cambió" >&2; exit 1; }
git rev-parse HEAD
```
- Desplegar únicamente en el entorno Beta autorizado los proyectos Apps Script modificados; no usar producción.
- Configurar en AUTH las propiedades GPSpedia_WRITE_URL y GPSpedia_FEEDBACK_URL con endpoints /exec de Beta; mantener GPSpedia_COORDINATOR_SECRET coherente entre AUTH, WRITE, FEEDBACK y Coordinator. No guardar secretos en Git.
- Validar con usuarios de prueba por rol: lectura, creación/edición de cortes, aportes suplementarios, imágenes, adjuntos FEEDBACK, PyS y aprobación de videos; comprobar autor y fecha del servidor.
- Probar logout individual, reset remoto de sesiones, cambio de rol, eliminación de cuenta, cambio/restablecimiento de contraseña, fallo parcial de invalidación y reintento. Verificar que no se restaure acceso desde caché.
- Probar bloqueo temporal tras cinco intentos fallidos y expiración del bloqueo.
- Probar dos aportes/cargas independientes simultáneos; comprobar que no se bloqueen entre sí y que los reintentos no dupliquen registros/archivos.
- Validar en navegador/PWA escritorio y móvil el catálogo cache-first, Inbox, modales y controles responsive. Registrar navegador/dispositivo, rol, estado de caché, tiempos medidos y respuestas.
- No modificar hojas, Drive, ScriptProperties ni datos productivos. Las pruebas Beta quedan pendientes hasta disponer de deployment/credenciales y autorización del entorno.


---

## Adenda — Auditoría de encabezados de modales — 2026-11-17

**Estado: AUDITORÍA ESTÁTICA COMPLETADA; CORRECCIÓN LOCAL PENDIENTE.**

Se revisaron los modales de `index.html`, `HTML/users.html`, los generados por `JS/Frontend/ui.js` y `JS/Frontend/youtubeUpload.js`, además de las reglas generales de `style.css`. La auditoría encontró:

- No existe una estructura compartida de encabezado. La mayoría de los cierres se posicionan de forma absoluta sin una reserva común para títulos largos; Inbox y Developer tienen excepciones específicas. Se identifica riesgo de colisión en pantallas estrechas, pendiente de confirmar visualmente.
- La semántica accesible de diálogo y el vínculo entre título y diálogo faltan en varias ventanas estáticas y dinámicas.
- El modal de carga YouTube utiliza un `span` como cierre en lugar de un botón accesible por teclado.
- Los títulos principales usan niveles distintos (h1/h2/h3) y algunos modales reutilizan clases visuales de otros componentes sin compartir su estructura.
- El detalle de cortes tiene una cabecera propia y pruebas de layout existentes; debe preservarse su disposición y no forzarse dentro de una plantilla genérica sin adaptar sus acciones.

Evidencia y ubicaciones: adenda del 2026-11-17 en `Auditoría.txt`. La revisión fue estática; no se afirma inspección en navegador ni aceptación visual.

**Siguiente tarea local:** implementar un contrato reutilizable de encabezado por familias de modales, preservar las excepciones justificadas, corregir el cierre YouTube, normalizar roles/nombres accesibles y jerarquía de títulos, y agregar pruebas de contrato para ventanas estáticas y dinámicas. La tarea de alineación integral no debe considerarse cerrada por los ajustes anteriores.

**Orden de ejecución:** completar todas las tareas de implementación del plan antes de iniciar cualquier prueba Beta. Se permiten y requieren pruebas locales; no desplegar servicios ni iniciar validaciones Beta durante esta fase.


## GP-UX-MODAL-HEADERS-02 — Implementación de encabezados (2026-11-17)
**Estado:** IMPLEMENTACIÓN REALIZADA; VALIDACIÓN LOCAL/CI PENDIENTE.
- Usar el encabezado del detalle de tutorial como referencia: título a la izquierda y cierre a la derecha.
- Mantener la excepción del detalle de corte: logotipo de marca en esquina superior izquierda con sus dimensiones actuales y sombras; modelo con tipografía/sombra actuales, ligeramente elevado; línea azul más próxima al conjunto.
- Orden de acciones del corte: Imprimir → Editar → Compartir.
- Atrás del navegador/gesto cierra el detalle de corte y limpia la pila de fichas, sin restaurar otra ficha.
- Cierre YouTube como botón accesible; roles y nombres ARIA en los diálogos afectados.
- Pruebas de contrato añadidas/actualizadas: CutDetailModalLayout y YouTubeUploadOverlayLifecycle.
- No ejecutar despliegues ni Beta en esta fase. Validar mediante CI y pruebas locales disponibles; la comprobación visual real queda para Beta.


---

## Adenda de continuidad y reconciliación — 2026-11-17

- **HEAD comprobado:** `f5d2391aa7e271d487d0d730284f56f0fb3064e7` en `GPSpedia2.2.5_work`. La rama base `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- **P1.2:** las notas antiguas que la muestran EN PROGRESO quedan supersedidas por los cierres posteriores de P1.2a y P1.2b. P1.3 también consta cerrada. No son tareas locales abiertas.
- **P4.3 — nomenclatura reconciliada:** P4.3a corresponde a la lectura del inventario una vez por lote; P4.3b corresponde a la optimización CacheService.getAll/putAll; P4.3c corresponde a la publicación CATALOG por lotes; P4.3d corresponde a la revisión del alcance del ScriptLock.
- La propuesta inicial de claim/reserva/commit para liberar el ScriptLock durante operaciones Drive no se implementó. La revisión posterior decidió conservar el lock porque no había mediciones que demostraran contención perjudicial entre acciones ADMIN independientes y porque retirar protección sin cubrir el estado interno podía afectar la idempotencia y el rollback. Esa propuesta queda **DIFERIDA A MEDICIÓN**, no como tarea local activa. Solo reabrirla si métricas Beta demuestran contención real y una nueva auditoría acredita un diseño seguro; no sustituir el lock por tryLock/UserLock por suposición.
- **BETA-003:** la corrección local de la política de caché del Service Worker queda cubierta por la regresión integral del HEAD actual. La activación/actualización real de la caché y la navegación online/offline siguen siendo validaciones Beta.
- **GP-UX-MODAL-HEADERS-02:** implementación y contratos locales validados en el CI del HEAD actual; la comprobación visual en navegador/dispositivo real permanece en Beta.
- **Regresión actual:** Actions `44170476002` SUCCESS — 145 suites, 2,127 pruebas aprobadas, 0 fallos. GitHub Pages `44170474862` SUCCESS. Health remoto `44170475959` SUCCESS, únicamente diagnóstico GET de solo lectura.
- **Estado de continuidad:** no quedan tareas de implementación local abiertas en el plan consolidado. Permanecen las validaciones Beta enumeradas en este backlog. No se desplegaron Apps Script ni se modificaron ScriptProperties, secretos, hojas, Drive o datos externos.


---

## GP-UX-INBOX-PRIVATE-MULTI-RECIPIENT-01 / GP-UX-MODAL-HEADER-TIGHTEN-03 — 2026-11-17

**Alcance implementado localmente en `GPSpedia2.2.5_work`:**
- Inbox permite marcar varios destinatarios en un selector desplegable táctil. La aplicación realiza una alta de conversación por cada destinatario, cada hilo contiene solo al remitente y a ese destinatario. No se usa CC visible ni una conversación grupal que revele a los demás receptores.
- El envío secuencial conserva el bloqueo de escritura compartido, con clave idempotente individual por usuario, seguimiento del progreso en el borrador y reintento seguro. Tras una entrega parcial se bloquean los campos para impedir cambiar el contenido antes de completar.
- Los menús de la barra enriquecida (completa/básica y menús de listas) se cierran al pulsar fuera de la lista/opción abierta.
- Encabezado del detalle de corte: controles en una sola fila, al extremo derecho y junto al botón de cierre; padding interno del contenedor del logo eliminado; separaciones verticales alrededor del divisor reducidas aproximadamente a la mitad; modelo ligeramente elevado sin alterar tamaño, sombra ni dimensiones declaradas del logo.
- Modal PyS usa título azul y jerarquía/cierre accesible alineados con los demás modales.

**Verificación:** se agregaron pruebas para la privacidad de participantes, selector múltiple, envío secuencial idempotente, cierre exterior de menús y encabezados Corte/PyS. Esperar los workflows del commit para registrar los resultados exactos. No se desplegarán Apps Script ni se modificará datos externos.


### Nota de regresión — privacidad Inbox (2026-11-17)
La primera ejecución detectó interferencia de fixture: la prueba de privacidad añadida antes de una aserción heredada incrementó dos filas el contador común. Se movió la prueba al final de `InboxConversations.mjs` y se hizo independiente de los totales históricos; no se modificó lógica de servicio.


### Aislamiento de prueba Inbox — 2026-11-17
La consulta global de bandeja en el nuevo test de privacidad recorría conversaciones de la fixture heredada y encontraba un contador histórico no relacionado. La prueba ahora valida el contrato de privacidad directamente con dos intentos de lectura cruzada, sin cambiar handlers ni ignorar errores funcionales.


### Ajuste final del fixture de sesión de privacidad Inbox — 2026-11-17
La segunda ejecución de regresión detectó que U5 no tenía token simulado; la prueba verificaba autenticación, no el aislamiento entre participantes. Se reemplazó por actores válidos U2/token-b y U3/token-c que siguen siendo ajenos a cada conversación. No se cambió la lógica de Inbox.


### Alcance de prueba scrollbars — 2026-11-17
La comprobación de los modales tomaba todo el CSS posterior al bloque de scrollbars e incluía el nuevo menú de destinatarios con `overflow:auto`. Se acotó al bloque de política global; no se cambió la regla funcional de scroll de ningún modal ni menú.


### Cierre de implementación UX Inbox/Modales — 2026-11-17
<badge>CI aprobado</badge>

- Commit de implementación: `5e9cdd732d12cc4ff29076a0a597323702af02ac`; commits siguientes corrigen exclusivamente pruebas y alcance de regresión.
- HEAD validado: `33700c6b15f0b77feebc706e8ac4e298bb62155f`.
- CI 44196032087 SUCCESS — 145 suites, 2,131 pruebas aprobadas, 0 fallos. InboxConversations 63/63; InboxUi 86/86.
- GitHub Pages 44196029692 SUCCESS y health GET-only 44196031955 SUCCESS.
- El envío múltiple se hace mediante hilos privados por destinatario, no con CC ni conversación grupal. Los tests verifican separación y rechazo de lectura cruzada.
- Encabezado de cortes, PyS, espaciado del logo/divisor y cierre de menús quedan cubiertos por contratos locales. Falta únicamente validación visual en dispositivo/navegador durante Beta.
- No se desplegó Apps Script ni se tocaron datos externos.


## GP-AUTH-ROLE-SESSION-LIMITS-01 — Límites de sesiones activas por rol
**Prioridad: P1 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA · Cierre de implementación local: 2026-11-18**

### Requisitos confirmados
- Desarrollador: sin límite de sesiones activas.
- Jefe: máximo 5 sesiones activas.
- Supervisor: máximo 3 sesiones activas.
- Técnico y Técnico externo: máximo 1 sesión activa cada uno.
- Cada inicio de sesión válido registra una sesión individual asociada a la cuenta y su token/dispositivo.
- Superar el máximo nunca bloquea el login: se crea la nueva sesión y se revoca la sesión activa más antigua hasta quedar dentro del límite.
- La antigüedad se determina por la fecha/hora de creación registrada, no por la posición accidental de la fila.
- La revocación debe propagarse al contexto central y a las cachés de sesión sin debilitar token, epoch, expiración, RBAC ni recuperación idempotente.
- No introducir consultas adicionales por acción ni viajes de red innecesarios en el flujo de login.
- No desplegar Apps Script ni modificar ScriptProperties, hojas o datos productivos. Las validaciones de deployments y multi-dispositivo real se reservan a Beta.

### Auditoría inicial
- AUTH tenía valores divergentes: Jefe 3 en lugar de 5 y Técnico 2 en lugar de 1; Supervisor 3 y Técnico externo 1 ya coincidían.
- Desarrollador ya usaba Infinity, pero la sincronización compartida de AUTH imponía un tope fijo de cinco y podía bloquear el login al superarlo.
- La selección de la sesión a cerrar se basaba en el número de fila, no en el timestamp de creación.
- Coordinator no aplica un tope de cantidad al recibir la lista de sesiones; mantiene validaciones de tokens, expiración y revocación.

### Implementación iniciada
- Se actualizan los límites por rol en AUTH y su espejo de pruebas.
- Se elimina el tope fijo de cinco sesiones en la sincronización compartida.
- La selección de sesiones excedentes pasa a ordenar por fecha real de creación y usa la fila solo como desempate.
- Se añade contrato automatizado para los límites, la selección de la más antigua y la ausencia de bloqueo por exceso.
- Pendiente: revisar el almacenamiento del contexto compartido para garantizar que Desarrollador no encuentre límites indirectos de capacidad; ampliar pruebas de recuperación/concurrencia y ejecutar regresión completa.


### Ampliación de GP-AUTH-ROLE-SESSION-LIMITS-01 — capacidad del contexto compartido
- Coordinator mantenía tres topes fijos de cinco sesiones: lectura de contexto, registro individual y sincronización masiva. También guardaba la lista completa en una sola propiedad con máximo de 8,000 caracteres.
- Se elimina el límite artificial de cinco y se segmenta la lista en bloques versionados de hasta 7,000 bytes UTF-8. El índice se publica al final para conservar el contexto anterior si falla la escritura de un bloque; generaciones anteriores se limpian después de publicar.
- Se añade prueba aislada con 100 sesiones Desarrollador, lectura/autorización desde el último bloque y limpieza al revocar todas las sesiones.
- La capacidad física global de ScriptProperties sigue sujeta a las cuotas de Apps Script; GPSpedia no establece un máximo funcional de sesiones.


### Seguridad de la expulsión automática
- Antes de eliminar los tokens excedentes de ActiveSessions, AUTH invalida sus cachés en WRITE/FEEDBACK y revoca cada token en Coordinator. Después limpia las filas y sincroniza el conjunto restante.
- Si falla una invalidación, la operación se conserva recuperable mediante el mismo requestId y no se retira la sesión anterior dejando cachés antiguas con acceso.

- El tamaño de cada bloque se calcula en bytes UTF-8 para mantenerse por debajo del límite de tamaño de propiedad de Apps Script, incluso con nombres Unicode.

### Verificación y alcance de cierre
- `SessionActivityCoordination.mjs`: 11/11 PASS, incluidos límites por rol, conservación del nuevo login, expulsión por timestamp e invalidación previa de cachés.
- La regresión de Coordinator incorpora escenario de 100 sesiones Desarrollador, lectura de una sesión en el último bloque y limpieza de bloques al revocar todas las sesiones; la suite no reportó fallos en este escenario.
- Workflow de sintaxis: PASS. Health de servicios desplegados (solo lectura): PASS.
- Regresión global: 119 suites, 1,769 pruebas aprobadas y 1 suite fallida ajena a esta tarea: `BETA-026` (aserción del CSS del encabezado móvil de detalle de corte). La tarea de sesiones no produjo fallos en sus pruebas específicas.
- No se desplegó Apps Script ni se modificaron propiedades, hojas o datos productivos. La prueba real de varios dispositivos queda para Beta, conforme al alcance acordado.

### GP-UX-CUT-MODAL-HEADER-POSITION-01 — Logo, modelo y divisor en el encabezado
**Prioridad: P2 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.**
- El conjunto logo de marca, nombre del modelo y línea azul debe comenzar en la esquina superior izquierda del área de contenido del modal.
- La cabecera usa una cuadrícula 2x2: logo en la primera columna ocupando ambas filas; acciones en la primera fila de la segunda columna; modelo en la segunda fila de la segunda columna. La primera columna usa max-content y la imagen width:auto para seguir el ancho natural del logo.
- El modal de detalle no debe permitir desplazamiento horizontal en móvil; limitar overflow-x sin cambiar tamaños ni orden de botones.
- Conservar tamaño, propiedades de imagen y alineación horizontal actuales del logo; no modificar tamaños tipográficos ni dimensiones de botones.
- Logo alineado arriba; modelo debajo de las acciones, alineado a la izquierda y al extremo inferior de la misma altura visual del logo. Acciones imprimir, editar, compartir y cerrar conservan su orden, alineación derecha y posición.
- Eliminar únicamente las filas/alturas vacías del encabezado. La línea azul debe conservar sus márgenes actuales y la información posterior su separación actual. No modificar el padding exterior compartido si eso desplaza las acciones.
- Validar contrato CSS, regresión de CutDetailModalLayout y revisión del diff. Aceptación visual en navegador móvil/escritorio queda pendiente de Beta.


### Adenda — GP-UX-CUT-MODAL-HEADER-GRID-02 — ajuste visual solicitado
- La revisión posterior detectó que el modelo quedaba demasiado próximo a las acciones, los botones conservaban relleno horizontal excesivo y el divisor azul desbordaba hacia la derecha.
- Requisitos adicionales: separar acciones y modelo 6 px; conservar el contenedor del logo exactamente a la altura de la imagen, sin padding vertical y con imagen width:auto; reducir ligeramente el padding horizontal de editar/imprimir/compartir; divisor con márgenes laterales simétricos de 6 px y sin ancho superior al área disponible.
- Implementación publicada en style.css y contrato actualizado en JS/Tests/CutDetailModalLayout.mjs. Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. La regresión local automatizada aprobó; solo resta inspección visual real en móvil y escritorio.
- Se mantienen las dimensiones existentes del logo (120 px escritorio / 60 px móvil), la cuadrícula 2x2, el orden de acciones y el overflow-x limitado al modal de corte.

- Cierre local: CutDetailModalLayout 27/27 PASS; regresión global 145 suites, 2,143 pruebas, 0 fallos; sintaxis de módulos modificados PASS. Actions run 44229400787 SUCCESS. Health read-only run 44229400782 SUCCESS.


### Adenda GP-PWA-RECENT-VIEWS-03 — telemetría mínima y limpieza aislada (2026-11-18)
- El carrusel se alimenta exclusivamente del historial IndexedDB del usuario y dispositivo actuales. No consulta ni reconstruye datos desde el servidor.
- El servidor recibe únicamente el evento de visualización y el ID del vehículo; actor y fecha proceden de la sesión autenticada y del backend. No se envía el objeto del vehículo, imágenes, campos de utilidad ni el historial completo. La escritura es silenciosa y no bloquea el modal ni el carrusel.
- La limpieza de caché desde la aplicación elimina solo los registros de la cuenta activa mediante el índice ownerId y conserva historiales de otras cuentas del mismo navegador. Sin usuario activo, no elimina historiales de vistos.
- El carrusel continúa cargando desde IndexedDB y miniaturas locales. La acción de telemetría no devuelve datos de historial ni se consulta durante la carga.
- CI en SHA 9a3e139f0a0763894f804a44447f0d21f07c832c: 146 suites, 2,174 pruebas, 0 fallos; RecentlyViewedCarousel 21/21, RecentlyViewedActivityTelemetry 12/12 y AdminClientCacheDeletion 9/9. Sintaxis de módulos modificados PASS.
- GitHub Pages build/deploy 44296179354 SUCCESS; health de servicios 44296180705 SUCCESS (solo lectura). La nueva acción FEEDBACK no se invocó contra el deployment: queda pendiente de despliegue/validación Beta.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.


### Adenda GP-PWA-RECENT-VIEWS-03 — contadores y limpieza local (2026-11-18)
- El evento remoto de visualización registra el ID del vehículo y los valores numéricos válidos de `utilCorte1`, `utilCorte2` y `utilCorte3`; actor y fecha siguen siendo determinados por backend.
- IndexedDB mantiene claves compuestas por propietario/vehículo y las lecturas del carrusel filtran por `ownerId`; el historial remoto no reconstruye el carrusel.
- La limpieza local incluye `viewedItems` entre los almacenes reconstruibles y ejecuta `clear()` en la transacción IndexedDB. Elimina el historial local del dispositivo, sin llamar a FEEDBACK ni borrar actividad estadística remota.
- Regresión local pendiente de ejecución; despliegue/validación del servicio FEEDBACK reservado a Beta.


### Adenda de aislamiento de sesión local — 2026-11-18
- Al iniciar/cambiar de sesión, `loadUserLocalActivity` vacía inmediatamente el carrusel en memoria y lo reconstruye exclusivamente con `getViewedItemsResult(ownerId)`. Se elimina la fusión con el estado en memoria de una sesión anterior, evitando que una cuenta herede vistos de otra.
- IndexedDB guarda cada entrada con propietario y clave compuesta usuario/vehículo; las consultas y la poda están limitadas al `ownerId` autenticado.


### GP-PWA-RECENT-VIEWS-03 — corrección de contrato de limpieza (2026-11-18)
**Estado: CORRECCIÓN DE PRUEBA APLICADA; EJECUCIÓN NODE/CI PENDIENTE.**
- Se alineó `JS/Tests/RecentlyViewedCarousel.mjs` con el requisito vigente: borrar caché local elimina `viewedItems` de IndexedDB junto con los demás almacenes reconstruibles del dispositivo.
- El aislamiento entre cuentas se mantiene en la escritura/lectura mediante `ownerId` y clave compuesta. La limpieza local no llama a FEEDBACK ni elimina actividad histórica ACTIVITY del servidor.
- Se verifica que el estado del carrusel en memoria se vacíe tras una limpieza IndexedDB confirmada.
- Commit: `dae20bf50f8a40a669ce02ed7668ac8e0e19a086`. Nueve comprobaciones estáticas de contrato PASS; falta ejecutar la suite Node/CI y conservar evidencia.
- La validación de FEEDBACK desplegado y PWA instalada continúa reservada a Beta.

---

## Cierre local — GP-PWA-RECENT-VIEWS-03 / GP-UX-CUT-BRAND-LOGO-BOTTOM-01 — 2026-11-18

- **GP-PWA-RECENT-VIEWS-03 — Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.** Se corrigió el contrato heredado de `RecentlyViewedCarousel.mjs`: ahora comprueba la firma vigente de `recordVehicleView`, incluidos los tres contadores de utilidad y el payload de sesión. El resumen del test publica un resultado numérico que el runner puede verificar.
- CI GitHub Actions `44310667618` SUCCESS en HEAD `37d3cfb9f1681ab69623959fa5897a9dd89ae498`: 146 suites, 2,154 pruebas aprobadas, 0 fallos. `RecentlyViewedActivityTelemetry` 12/12; `AdminClientCacheDeletion` 9/9; contrato `RecentlyViewedCarousel` 1/1; `CutDetailModalLayout` 27/27; sintaxis de módulos modificados PASS.
- Se confirma el contrato local: carrusel aislado por ownerId; cambio de cuenta limpia la memoria anterior; limpieza manual vacía los almacenes reconstruibles locales y el carrusel en memoria, sin invocar rutas de actividad ni borrar ACTIVITY remoto. La validación de FEEDBACK desplegado, IndexedDB real en navegador y PWA instalada queda diferida a Beta.
- **Tarea adicional GP-UX-CUT-BRAND-LOGO-BOTTOM-01 — Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.** El logo de marca del modal de detalle de corte se alinea al borde inferior mediante `object-position:left bottom`, manteniendo width:auto, max-content, alturas actuales (120 px escritorio / 60 px móvil), cuadrícula, acciones y comportamiento de overflow horizontal.
- Contrato visual ampliado para comprobar alineación inferior de escritorio y móvil. CI `44310667618` aprobó `CutDetailModalLayout` 27/27. La aceptación visual real en navegador/dispositivos queda pendiente de Beta.
- No se desplegaron Apps Script ni se modificaron hojas, ScriptProperties, Drive o datos externos.
