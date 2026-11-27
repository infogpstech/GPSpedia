# Tareas activas — GPSpedia

## Cierre de validación Beta y plan de ejecución — 2026-11-26

**Estado de la fase Beta: CERRADA.** No se programarán nuevas rondas de pruebas Beta ni se conservarán suites automatizadas. Los resultados históricos útiles quedan resumidos en `Tareas_Beta.md`; los hallazgos que requieren trabajo se trasladan a este backlog. Las pruebas automatizadas y workflows de pruebas se eliminarán por solicitud expresa del propietario. No crear nuevas suites ni archivos de prueba.


## Prioridad P0 — GP-CORS-APPS-SCRIPT-TRANSPORT-01: transporte compatible con Apps Script sin CORS

**Estado: CORRECCIÓN DE FUENTE COMPLETADA; publicación y validación remota pendientes.**

- **Síntoma:** el panel de desarrollador no puede completar el health check ni las acciones POST de ADMIN desde `https://infogpstech.github.io`. La consola informa CORS aunque Apps Script responde HTTP 200.
- **Causa:** `api-config.js` utilizaba `fetch` directo contra `script.google.com`; las respuestas `ContentService` de Apps Script no proporcionan el encabezado CORS requerido por el navegador.
- **Frontend:** el health check utiliza JSONP con callback aleatorio y timeout; el callback del servidor solo se admite para `debug=true`. Las acciones POST usan un formulario URL-encoded dirigido a un iframe oculto y recuperan el JSON mediante `postMessage`; se correlaciona la respuesta con un request ID y se limpian listeners/elementos al terminar. Se conserva la inyección `fetchImpl` para pruebas existentes, sin usar fetch de red por defecto.
- **Servicios:** AUTH, CATALOG, WRITE, FEEDBACK, ADMIN y UTILITIES mantienen sus dispatchers, validación de actor y permisos. Sus entrypoints envuelven la petición de transporte, reconstruyen `e.postData.contents` para el handler original y devuelven el resultado mediante HtmlService solo para las peticiones iframe. Las llamadas antiguas continúan recibiendo su respuesta ContentService.
- **Seguridad y arquitectura:** JSONP expone únicamente identidad/versión/estado de `debug=true`; no habilita el feed CATALOG ni datos de usuario. No se añadieron URLs, tokens, secretos ni llamadas servicio-a-servicio. La autorización sigue residiendo en cada servicio.
- **Validación local:** parsing de `api-config.js` y seis fuentes Apps Script PASS; simulaciones efímeras de JSONP, envío del formulario, reconstrucción exacta del JSON, respuesta `postMessage`, limpieza de recursos y health ADMIN PASS. No se crearon archivos/suites de pruebas.
- **Pendiente obligatorio:** publicar la nueva versión de los seis proyectos Apps Script y el frontend; después comprobar health 6/6, ping/lectura ADMIN/Drive desde navegador. No se hizo deployment, petición remota ni modificación de Drive/Spreadsheet en esta tarea.
- **Base protegida:** no modificar `GPSpedia2.2.5`. La fase Beta permanece cerrada; la validación de integración queda diferida hasta autorización del propietario.

## GP-UTIL-BUTTON-STATE-REVERT-02 — reconciliación tardía del estado (2026-11-26)

**Estado: CORRECCIÓN FRONTEND PUBLICADA EN RAMA; BUILD DE PAGES PENDIENTE. VALIDACIÓN REAL PENDIENTE.**

- Síntoma confirmado por el propietario: el botón cambia de color y el contador aumenta inmediatamente, pero ambos regresan al estado anterior unos segundos después.
- Causa de código identificada: la hidratación inicial `getMyUsefulCuts` se ejecuta en segundo plano cuando existe caché local. Una respuesta de lectura iniciada antes de la escritura podía terminar después de la confirmación de FEEDBACK y sobrescribir `likedCortes/usefulConfirmed_` con el estado anterior. Además, `applyConfirmedUsefulState` aplicaba un delta compensatorio según el estado visual potencialmente obsoleto, aunque FEEDBACK ya entregaba `usefulCount` autoritativo.
- Corrección en `JS/Frontend/ui.js`: versionado de mutaciones por usuario/vehículo/corte; hidratación combina el estado remoto con confirmaciones posteriores al inicio de la lectura; una lectura CATALOG iniciada antes de una interacción nueva se descarta.
- Corrección en `JS/Frontend/likeState.js`: el estado visual y el contador se establecen exactamente con `isUseful` y `usefulCount` confirmados por FEEDBACK, sin sumar/restar un segundo delta. Si CATALOG devuelve una proyección anterior, prevalece el contador confirmado por FEEDBACK.
- No se modificaron FEEDBACK, CATALOG, sus deployments, endpoints ni Spreadsheet. La coordinación entre servicios continúa exclusivamente en el frontend.
- Commits de código: `29414137134370d25b57286e047ea082854c7413`, `2d0b44a3631ca02cdc886fa1ce81768b795fbed8`, `e663bffad986cc584efc4c913325d977a7a43b91`, `9348557df146daa1f4df7216acef68b5728f7606`, `000f1115202af8c5f7bd704da914d71598c4b8a3`.
- Pages build/deploy `45843872204` terminó SUCCESS sobre `7e9ff0ba209e9096aed2c90a3d5b9b90407770f9`, que ya contiene el código de la corrección (`000f111`); los commits posteriores solo actualizan registros. Se confirma build/deploy de Pages para la fuente corregida.
- No se ejecutaron escrituras ni lecturas remotas en Spreadsheet ni pruebas de navegador real. Falta validar FEEDBACK tras recarga y contador CATALOG tras recarga. La fase Beta permanece cerrada.

### Prioridad P0 — GP-UTIL-BUTTON-NO-REACTION-01: botón de útil sin reacción ni actualización del contador

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA — correcciones frontend publicadas y validación local aprobada; integración real/browser pendiente para una futura Beta autorizada. La fase Beta actual permanece cerrada.**

**Síntomas observados:**
- Al pulsar el botón de útil no se produce reacción visual.
- No se registra la reacción en FEEDBACK.
- La cantidad de útiles no se actualiza en el modal.

**Requisito de UX obligatorio — errores silenciosos:** cualquier error de carga, escritura, sincronización o sesión del botón de útil se registra exclusivamente en la consola del navegador (`console.error`/`console.warn`). Está prohibido mostrar al usuario alertas, `showGlobalError`, toast, banners, diálogos, textos de error o estados visibles que anuncien el fallo. La UI debe revertir silenciosamente al último estado confirmado y permitir reintentar sin notificar el error.

**Diagnóstico confirmado por inspección de código:**
- La hidratación inicial de `getMyUsefulCuts` podía fallar cuando no había caché local. En ese caso `ensureUsefulState_()` devolvía `false`; el manejador del clic terminaba con `if (!ready) return` y no llegaba a aplicar el estado optimista ni a enviar `setCutUseful`. La lectura fallida bloqueaba la escritura.
- El texto de los acordeones utilizaba una expresión regular con barras invertidas duplicadas, por lo que no sustituía correctamente el contador anterior.
- Un fallo de escritura podía dejar una operación optimista pendiente y no restaurar inmediatamente el último estado confirmado.

**Corrección aplicada:**
- El estado se hidrata mediante una promesa compartida por sesión. Si la lectura falla sin caché, se conserva el último estado confirmado conocido (o vacío), se permite continuar con la operación idempotente y FEEDBACK determina el estado real.
- La UI aplica el cambio optimista, confirma color y contador con la respuesta del backend y revierte silenciosamente si la escritura falla.
- La cola puede cancelar la operación fallida y retirar el pendiente más reciente.
- Se corrigió el patrón del título de acordeón para sustituir el contador en lugar de acumularlo.
- Los errores del flujo de útiles se registran exclusivamente en la consola; no se muestran mensajes, alertas, toast ni banners al usuario.
- Se conserva el contrato: frontend envía userId/sessionToken a FEEDBACK; el servicio deriva el actor autenticado, registra en `FeedbackLikes` y devuelve `isUseful`/contador. No se añadieron URLs, secretos ni coordinación backend→backend.

**Validación local ejecutada:** parsing sintáctico de `ui.js` y `usefulSyncQueue.js`; comprobaciones efímeras sin archivos de prueba para mapeo de corte físico, incremento confirmado, retirada/rollback del contador y cancelación de la cola. Todas aprobaron. No se crearon suites ni archivos de prueba.

**Reapertura de implementación por persistencia del síntoma — 2026-11-26:**
- El propietario confirmó que el botón continúa sin cambiar de color, sin registrar la reacción y sin actualizar el contador.
- Se identificó una causa concreta en `ensureUsefulState_()`: cuando no había caché local y `getMyUsefulCuts` fallaba, el `.catch()` devolvía `false`. El handler del clic ejecuta `if (!ready) return`, por lo que nunca llegaba a aplicar el estado optimista ni a programar `setCutUseful`. El fallo de lectura bloqueaba también la escritura.
- Corrección publicada en `6628fda16ad534aa2a2ccfae3807ed2c892ea717`: ante un fallo de lectura sin caché, conservar el último estado confirmado conocido (o una lista vacía), marcar la hidratación como resuelta para esa sesión y permitir el intento de escritura idempotente. FEEDBACK sigue siendo autoridad: confirma el estado real y el frontend revierte silenciosamente si la escritura falla.
- Revisión backend: `setCutUseful` está declarado en `FEEDBACK_ACTION_PERMISSIONS`, se enruta en `doPostInternal_`, valida el actor confiable, valida vehículo/corte, registra el evento en `FeedbackLikes` y devuelve `isUseful` y `usefulCount`. La respuesta del contador se aplica mediante `likeState.js`. No se detectó en el handler una omisión que impida por sí misma el append.
- Sincronización del contador: CATALOG ya proyecta los eventos de `FeedbackLikes` mediante `readFeedbackLikeEventCounts_`, pero el flujo del botón no forzaba una lectura nueva de esa proyección después de confirmar la reacción. Se añadió `refreshUsefulCatalogProjection_()`: tras una confirmación FEEDBACK, el frontend solicita `getCatalogData` con `forceRefresh: true` y actualiza el vehículo/cortes en el estado local. La coordinación FEEDBACK→CATALOG ocurre exclusivamente en el frontend; no se añadieron llamadas entre Apps Script.
- El contador se actualiza primero con el `usefulCount` confirmado por FEEDBACK y después se reconcilia con la proyección canónica CATALOG. Si falla esta segunda lectura, el error queda solo en consola y se conserva el contador confirmado de FEEDBACK.
- Límite de verificación: no se ejecutó el Apps Script desplegado ni se inspeccionó la Spreadsheet real; no se afirma que el append remoto haya quedado confirmado. Tampoco se verificó el comportamiento en un navegador real ni que el frontend esté desplegado en el sitio que utiliza el propietario. El endpoint de health FEEDBACK en la fuente declara `1.2.2`, aunque el encabezado del componente declara `2.3.0`; ese dato de health está desactualizado y no permite inferir la versión desplegada.
- No se crearon pruebas ni archivos auxiliares y no se reabrió la fase Beta.

**Validación diferida:** no se invocó FEEDBACK/CATALOG remoto, no se modificó ni desplegó Apps Script y no se ejecutó navegador real. La fase Beta permanece cerrada por instrucción del propietario; esta limitación no se presenta como integración aprobada.

**Revisión de continuidad 2026-11-26 — contraste del flujo publicado:**
- HEAD confirmado al revisar: `d0dae570935401e8147a178e73dbcb71a1b4776c`; correcciones de código: `6628fda16ad534aa2a2ccfae3807ed2c892ea717` (hidratación) y `aec0f21f0a49febd5e96303ca55b84fca2dbcae8` (proyección CATALOG). Los cuatro commits posteriores a `aec0f21` modifican únicamente `Tareas_Activas.md` y `checkpoint.md`; no alteran el código.
- DOM/UI: `.util-btn` se crea como botón `type=button`, conserva `data-useful-vehicle-id` y `data-useful-cut-index`, y recibe un handler `onclick` directo que detiene propagación, hidrata, aplica estado optimista, actualiza contador y programa la cola. La capa CSS `.feedback-overlay` se posiciona sobre la imagen; no se encontró una regla de `pointer-events` que bloquee el botón. No se detectó una omisión estática del listener.
- Sesión/ruteo: `getUiSessionContext_` consume `ID/id` y `SessionToken`, coincidentes con el formato de sesión restaurado por AUTH. `ACTION_TO_SERVICE_MAP` dirige `setCutUseful` y `getMyUsefulCuts` a FEEDBACK; el payload incluye actor de sesión y el backend deriva la identidad confiable.
- FEEDBACK: la acción está declarada, autorizada por actor confiable y despachada a `handleSetCutUseful`; la escritura usa el ledger `FeedbackLikes`, semántica idempotente `isUseful` y respuesta con `isUseful/usefulCount`. Cuando cambia el estado, FEEDBACK adjunta `catalogChange`.
- CATALOG: el frontend publica el delta mediante `publishCatalogChange` y después solicita `getCatalogData(forceRefresh:true)`; CATALOG omite la caché y vuelve a proyectar los eventos `FeedbackLikes`, conservando el índice físico del corte en `sourceCorteIndex1..3`. No se encontró una llamada servicio-a-servicio ni una dependencia de backend que impida el flujo por diseño.
- Pages: workflow `45833214660` terminó SUCCESS sobre el HEAD actual `d0dae570935401e8147a178e73dbcb71a1b4776c`, que contiene los cambios frontend de `aec0f21). El build/deploy de Pages queda confirmado por Actions; no se comprobó una solicitud HTTP al sitio publicado ni interacción real.
- No existe workflow de regresión ni directorio de suites de pruebas en el árbol actual. La última regresión histórica (`45822167347`) es anterior a `6628fda`/`aec0f21`; no se atribuye cobertura CI a estas dos correcciones. No se crearon suites, fixtures ni workflows, conforme al cierre Beta.
- No se ejecutaron navegador real, FEEDBACK/CATALOG remoto, escritura/lectura de Spreadsheet ni despliegues Apps Script. Esas comprobaciones permanecen **PENDIENTES DE VALIDACIÓN BETA**, no son fallos confirmados ni bloquean el cierre local según `NORMAS_DESAROLLO.md` §§5 y 10.

**Plan de ejecución:**
1. Inspeccionar el botón real en el DOM del modal, sus selectores, atributos, listeners y ciclo de apertura/cierre; confirmar que el evento click llega al handler y que no queda interceptado por overlay, propagación, estado disabled o listeners duplicados.
2. Seguir el flujo completo en frontend: hidratación de estado por usuario, toggle optimista, `likeState.js`, cola `usefulSyncQueue.js`, debounce/reintento y resolución de acción mediante `ACTION_TO_SERVICE_MAP`/`API_ENDPOINTS`.
3. Verificar el contrato de FEEDBACK para alta y retirada: identidad autenticada, vehicleId, corte físico, estado de transición, idempotencia, respuesta y errores. No confiar en claims del navegador.
4. Comprobar si FEEDBACK confirma el append/retirada y si la respuesta contiene el contador autoritativo; identificar si la petición no sale, se rechaza, queda pendiente o se confirma sin que la UI procese la respuesta.
5. Revisar la proyección CATALOG y la actualización del contador del título del modal. Mantener alineados el corte físico original, el estado por usuario, el evento persistido y el total mostrado; no sumar dos veces ni reemplazar el icono/contenido del botón.
6. Resolver la causa raíz y restaurar la reacción visual, el registro persistente y el contador. Los fallos deben dejar el estado coherente y permitir reintentar sin duplicar eventos.
7. Validar mediante inspección de flujo, análisis estático y comprobaciones manuales disponibles. No crear archivos de pruebas, fixtures, suites de regresión ni workflows de pruebas.

**Criterios de aceptación:**
- Un clic válido muestra inmediatamente el estado de útil correspondiente.
- La operación queda registrada/retirada en FEEDBACK con la identidad autenticada y semántica de corte vigente.
- El contador del modal cambia al valor confirmado y permanece correcto al reabrir/recargar el detalle.
- Clics repetidos no duplican eventos; los errores no dejan un estado visual falso ni un contador desincronizado.
- No se introducen URLs, secretos ni coordinación backend→backend; la coordinación entre servicios permanece en frontend.

### Prioridad P1 — GP-YOUTUBE-PLAYBACK-01: reproducción real de tutoriales

**Estado: PENDIENTE DE CONFIRMACIÓN EN USO NORMAL.** El parser y el layout tuvieron validación local; la reproducción remota no quedó acreditada porque GitHub Actions recibió el challenge de YouTube `Sign in to confirm`. No se usarán credenciales automatizadas ni bypass. Confirmar el funcionamiento desde una sesión de usuario autorizada/dispositivo habitual cuando se retome el trabajo de tutoriales.

### Prioridad P2 — GP-PWA-OFFLINE-ICONS-01: recursos visuales offline

**Estado: PENDIENTE / BAJA.** El arranque offline frío y caliente quedó aprobado; permanece el fallo de carga de la hoja CSS Font Awesome CDN en desconexión fría, que puede dejar iconos sin estilo. Evaluar fallback local compatible sin afectar el arranque ni añadir dependencias innecesarias.

### Prioridad P2 — GP-REPO-BRANCH-PROTECTION-01: protección de rama base

**Estado: PENDIENTE ADMINISTRATIVO.** La API reportó `protected=false` y no mostró rulesets para `GPSpedia2.2.5`; la conexión no permitió leer la configuración detallada (403). Un administrador debe configurar protección contra push directo, force-push y borrado. No intentar modificarla desde esta tarea.

### Hallazgos cerrados o sin defecto reproducible

- BETA-F020: precarga PWA; corrección confirmada, 49/49 recursos core y 4/4 opcionales, login visible offline frío/caliente.
- BETA-F023: resumen shell del workflow de health corregido.
- BETA-F024: pico aislado de latencia UTILITIES no reproducido; cerrado como anomalía transitoria.
- BETA-F019: corrección del contrato de diagnóstico AUTH incorporada en fuente; la evidencia posterior de health informó 6/6 servicios disponibles y versiones esperadas.
- CATALOG feed GET-only: paginación secuencial, límites, cursores y reset aprobados en las ejecuciones registradas.
- Las fronteras locales de actor FEEDBACK/Inbox/WRITE/ADMIN y los contratos locales de útil quedaron cubiertos por la CI histórica; no sustituyen el síntoma funcional nuevo reportado arriba.

### Validaciones Beta no ejecutadas — no convertir en fallos confirmados

No se realizaron mutaciones remotas de AUTH/USERS, FEEDBACK/útiles, Inbox, WRITE, ADMIN/Drive/Spreadsheet, OAuth ni YouTube API. Faltaron identidades sintéticas, recursos desechables inequívocos y limpieza verificable. Se registra esta limitación como alcance no comprobado, no como aprobación ni como defecto confirmado. La fase de pruebas Beta queda cerrada por decisión del propietario; no reabrirla automáticamente.

### Orden de ejecución

1. GP-UTIL-BUTTON-NO-REACTION-01.
2. GP-YOUTUBE-PLAYBACK-01 cuando se retome la función de tutoriales.
3. GP-PWA-OFFLINE-ICONS-01.
4. GP-REPO-BRANCH-PROTECTION-01 por administración del repositorio.
5. Mantener como no verificados los flujos mutables remotos; no afirmar su aprobación.

Repositorio: `infogpstech/GPSpedia`  
Rama autorizada: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5` — no modificar.  
Normativa: `NORMAS_DESAROLLO.md` (única fuente normativa).

## Plan de migración de URLs al frontend

El plan MIG-URL-001 a MIG-URL-008 conserva su trazabilidad histórica. MIG-URL-008 queda cerrada como fase de validación Beta por instrucción del propietario el 2026-11-26. La fase GET-only terminó con health 6/6 y CATALOG feed/boundaries/matrix/pagination PASS. Las operaciones mutables que no se ejecutaron se registran como NO VERIFICADAS; no se programarán nuevas rondas Beta sin una instrucción posterior.

- MIG-URL-001 — Alinear normativa y registrar el plan: **COMPLETADA — 2026-11-24**.
- MIG-URL-002 — Inventariar y verificar las seis URLs vigentes: **COMPLETADA — 2026-11-24**; seis valores confirmados directamente por el usuario y validados estructuralmente. Salud/identidad remota diferida a MIG-URL-008.
- MIG-URL-003 — Implementar `API_ENDPOINTS` local y resolución: **COMPLETADA — 2026-11-25**; seis URLs locales, 123 acciones y router/health locales.
- MIG-URL-004 — Retirar configuración central de endpoints: **COMPLETADA — 2026-11-25**; sin bootstrap, lector ni publicador central de URLs.
- MIG-URL-005 — Adaptar Developer y diagnóstico de salud: **COMPLETADA — 2026-11-25**; editor retirado, health local conservado.
- MIG-URL-006 — Desvincular estructuras de endpoints en Spreadsheet: **COMPLETADA — 2026-11-25**; hoja histórica preservada sin lectura/escritura.
- MIG-URL-007 — Pruebas locales, contratos y regresión: **COMPLETADA — CI 45519738860; 519 suites, 6,181 pruebas, 0 fallos; responsive-browser SUCCESS**.
- MIG-URL-008 — Validación Beta aislada y cierre: **FASE DE PRUEBAS CERRADA POR EL PROPIETARIO — 2026-11-26**. Las operaciones mutables no ejecutadas se registran como no verificadas; no se continuará con nuevas rondas Beta.

La configuración local debe reproducir el patrón de la rama protegida `GPSpedia2.2.5`: objeto único `API_ENDPOINTS` editado manualmente en `JS/Frontend/api-config.js`, con `ACTION_TO_SERVICE_MAP` para el enrutamiento. No usar `SERVICE_ENDPOINTS` como tabla paralela ni inventar otro administrador de URLs.


### Corrección GP-LIKE-VEHICLE-ID-PREFIX-01 — compatibilidad con IDs V-<n>

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA — CI run 45642190006 SUCCESS (529 suites, 6,272 pruebas, 0 fallos; AUG-146 264/264). Beta pendiente.** El caso Beta reportó `vehicleId: V-105` y `corteIndex: 1`. La fila de la hoja `Cortes` contiene el ID exactamente como `V-105`. El validador de FEEDBACK solo admitía enteros decimales, por lo que rechazaba el ID antes de localizar la fila.

- Corregir exclusivamente el validador de `recordLike` para conservar IDs numéricos históricos y aceptar IDs canónicos `V-<n>` con componente numérico positivo y entero seguro.
- Mantener la comparación exacta contra la columna `id` de `Cortes`, la detección de duplicados y la identidad autenticada inyectada por FEEDBACK.
- Añadir regresión de éxito para `V-105` y rechazo para `V-0`; comprobar que el ledger conserva el ID exacto.
- No cambiar WRITE, el esquema de Spreadsheet ni IDs almacenados. No invocar el deployment ni escribir datos Beta desde esta tarea.


## Nuevas solicitudes del propietario — 2026-11-25

### GP-ADMIN-DRIVE-AUDIT-HEADLESS-01 — Ejecutar auditoría desde Developer sin abrir modal
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA — CI run 45644997410 SUCCESS.**
- El botón **Auditar Cortes** del modal Desarrollador debe iniciar el escaneo directamente, sin mostrar ni abrir el modal independiente `audit-drive-modal`.
- Todo el avance, lotes, conteos, advertencias y errores deben enviarse a la consola global Developer con el prefijo `[AUDITORÍA DRIVE]`. No depender de que el modal de auditoría esté visible.
- Conservar el escaneo recursivo, la paginación/cursor, la persistencia local, la reanudación, los resultados y las restricciones existentes. No convertir el proceso en una operación destructiva.
- En `JS/Services/admin.js`, aplicar estrategia FindOrCreate a los esquemas internos de auditoría Drive: si faltan las hojas `DriveAuditRuns` o `DriveAuditLatest`, crearlas y nombrarlas; si faltan encabezados/columnas esperados, completar solo celdas vacías seguras y verificar la escritura. Si existe contenido incompatible, no sobrescribirlo ni desplazar columnas: fallar de forma segura y explicar el conflicto.
- La inicialización debe tolerar carreras de creación por relectura, no introducir esperas bloqueantes y no mantener locks durante trabajo de Drive. Preservar los datos/propiedades legacy y el baseline idempotente.
- Pruebas: creación de ambas hojas, inicialización de hojas vacías, reparación de encabezados faltantes sin pérdida de datos, rechazo de encabezado incompatible/datos bajo columna sin nombre, carrera de creación, logger global con modal oculto, auto-inicio y conservación de cursor/reanudación.
- Archivos previstos: `JS/Services/admin.js`, `JS/Frontend/ui.js`, `JS/Tests/AdminDriveAuditGlobalConsole.mjs`, nuevas pruebas de esquema/FindOrCreate y `JS/Tests/RunServiceTests.mjs`; registros operativos.
- No ejecutar ADMIN remoto, Apps Script, Drive ni Spreadsheet real. Validación de permisos y creación real de hojas queda pendiente de Beta autorizada.
- **Cierre local:** `JS/Frontend/ui.js` ejecuta la auditoría en modo headless desde Developer; la consola global conserva avance/resultados/errores y el escáner mantiene la reanudación por cursor. `JS/Services/admin.js` crea `DriveAuditRuns` y `DriveAuditLatest`, completa encabezados solo cuando las celdas están vacías y rechaza esquemas incompatibles o datos sin encabezado. `AdminDriveAuditSheetsFindOrCreate` 7/7 PASS. CI run `45644997410`: 530 suites, 6,279 pruebas PASS, 0 fallos; `service-tests` y `responsive-browser` SUCCESS. Validación real de ADMIN/Drive/Spreadsheet y permisos queda pendiente de Beta autorizada.

### GP-PYS-VEHICLE-ASSOCIATION-CARD-01 — Mostrar tarjeta para vincular vehículos en detalle PyS
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA — CI run 45646432576 SUCCESS.**
- En el modal de detalle de Problemas y Soluciones debe mostrarse al final del carrusel de vehículos relacionados una tarjeta para vincular otro vehículo, también cuando el detalle se abre desde un modal de vehículo.
- La tarjeta debe tener exactamente las mismas dimensiones que las tarjetas relacionadas (140 × 120 px conforme al contrato CSS actual), alineación y comportamiento horizontal del carrusel.
- Al pulsarla debe abrir el formulario existente `openSearchVehicleForPysAssociationModal`; no reconstruirlo ni duplicar su lógica. Conservar la búsqueda por marca/modelo/versión, selección múltiple, exclusión de relaciones ya existentes, confirmación y acción backend `addVehicleToProblem`.
- Reutilizar la misma fuente y estrategia de carga/búsqueda del catálogo que usa el formulario **Agregar Problema**; no crear otro buscador ni otra consulta redundante.
- Preservar el contexto de navegación entre PyS y vehículo, evitar duplicados y actualizar el carrusel tras vincular. Resolver el ID del problema con el identificador canónico disponible (`id_problem`/alias existente) sin enviar valores vacíos.
- Pruebas: tarjeta visible en detalle normal y cuando `originModal === 'vehicle'`, posición final, dimensiones exactas, llamada al formulario existente, exclusión de vehículos ya vinculados, búsqueda reutilizada y retorno/actualización de contexto.
- Archivos previstos: `JS/Frontend/ui.js`, estilos solo si hacen falta, `JS/Tests/PysModalNavigation.js` y prueba específica si procede, runner y registros.
- No modificar backend ni contratos si la ruta existente satisface el flujo. Validación visual de navegador real puede diferirse a Beta; contratos y regresión local son obligatorios.
- **Cierre local:** se retiró la condición que ocultaba el carrusel al abrir PyS desde un vehículo; la tarjeta final **Vincular vehículo** tiene dimensiones explícitas 140 × 120 px y abre `openSearchVehicleForPysAssociationModal`, con fallback de ID `id_problem`/`id`. El formulario reutiliza la búsqueda compartida `filterPysVehicleCatalog_` del formulario Agregar Problema y recibe IDs relacionados normalizados para evitar errores si llegan como texto. `PysModalNavigation` 13/13 PASS. CI run `45646432576`: 530 suites, 6,285 pruebas PASS, 0 fallos; `service-tests`, `responsive-browser` y Pages SUCCESS. La comprobación visual funcional con datos Beta queda pendiente.

## Orden de ejecución

Trabajar una tarea a la vez. Al cerrar cada tarea, ejecutar pruebas, revisar el diff y actualizar este archivo, `checkpoint.md` y `ChangesLogs.txt`. No desplegar Apps Script ni modificar recursos externos sin autorización Beta expresa.

### 1. Modal de detalle de Tutorial — formato enriquecido y vídeo YouTube

**Estado: COMPLETADA EN CÓDIGO Y CI — 2026-11-24.**

- Preservar en la vista de detalle el formato HTML seguro almacenado: alineación, colores, énfasis, listas y estilos permitidos. No convertir contenido enriquecido en texto plano por aplicar el modo global estricto.
- Mantener la sanitización: no permitir scripts, handlers, URLs peligrosas ni contenido activo. Usar el modo de sanitización avanzado permitido; no desactivar el sanitizador.
- Corregir la presentación del vídeo asociado. Resolver IDs y URLs admitidos con `getValidatedYouTubeVideoEmbedUrl`; construir el iframe mediante DOM, sin interpolar una URL no validada en `innerHTML` ni usar fallback inseguro.
- Comprobar formatos watch, youtu.be, shorts, embed y el ID de 11 caracteres; URL inválida o dominio ajeno no debe producir iframe.
- Mantener el flujo de aprobación, la identidad `referenceId` y los comportamientos de edición/guardado. BETA-F007 (inicialización de subida para Tutorial legacy) es una corrección previa ya aprobada en CI y no se debe reiniciar.
- Añadir pruebas de contrato/renderizado para contenido avanzado, sanitización XSS y vídeo válido/inválido. Validar escritorio y móvil con navegador automatizado.
- **Evidencia de cierre:** `mostrarDetalleTutorialModal()` ya usa sanitización `advanced`, crea el iframe mediante DOM y solo asigna `src` devuelto por `getValidatedYouTubeVideoEmbedUrl()`. Se reforzó `Aug146ResponsiveBrowser.mjs` para comprobar énfasis, listas, estilos, XSS, URLs YouTube válidas e inválidas (incluidos protocolo, credenciales, puerto y parámetros duplicados). CI run `45507769616`: 517 suites, 6,156 pruebas, 0 fallos; Chromium 216/216 PASS en 1366×768, 390×844, 360×800 y 320×700; Pages run `45507768695`: SUCCESS. No fue necesario modificar código productivo para esta tarea.

### 2. Dashboard de actividad — desglose de aportes por usuario

**Estado: COMPLETADA EN CÓDIGO Y CI — 2026-11-24.**

- Reutilizar `readActivityDashboardCutsSnapshot_()`, `buildActivityDashboardInsights_()` y `buildCutContributionSummary_()`; no crear una segunda fuente de métricas.
- Mantener el total de modelos/vehículos distintos, cortes registrados y suma de utilidades/votos leídos desde `utilCorte1`, `utilCorte2` y `utilCorte3`.
- Exponer explícitamente `cortesAportados` por usuario en la tabla de contribuciones, separado de `aportesRegistrados` y `vehiculosConAportes`. El total de aportes incluye apertura/alimentación y no sustituye el conteo de cortes.
- Conservar colaboradores de Cortes y el ledger aceptado de `AportesVehiculo`, identidad del actor, deduplicación de `opId`, aliases y nombres históricos.
- Añadir pruebas de renderizado/contrato para el nuevo encabezado y los valores por usuario, incluyendo usuario sin aportes y registros históricos. No alterar hojas ni datos.
- **Evidencia de cierre:** `normalizeContributionRows()` conserva `cortesAportados`, `aportesRegistrados` y `vehiculosConAportes` por separado; agrupa cortes y aportes registrados de forma independiente y evita duplicar vehículos. La tabla muestra Usuario, Cortes aportados, Aportes registrados y Vehículos con aportes. El ranking superior presenta las tres métricas; estados vacío/error abarcan las cuatro columnas. `ActivityDashboardContributions`: 3/3 PASS. CI run `45508470807`: 517 suites, 6,156 pruebas, 0 fallos; Chromium 216/216 PASS; Pages run `45508470780`: SUCCESS. No se modificó backend ni datos almacenados.

### 3. Modal Developer — disposición, consola y actualización de servicios

**Estado: COMPLETADA EN CÓDIGO Y CI — 2026-11-24.**

- Reubicar la barra de pestañas debajo de la línea de comando. Las pestañas no seleccionadas muestran únicamente icono; la seleccionada expande su etiqueta sin desplazar ni solapar el resto.
- Duplicar la altura útil actual de la consola de comandos, conservando scroll y legibilidad.
- Reducir márgenes/paddings internos y compactar botones, títulos y contenedores sin ocultar funciones ni alterar handlers.
- Toda la información funcional del bloque Endpoints de servicios (carga, validación, publicación, éxito, sin cambios y error) debe aparecer únicamente en la consola Developer. Eliminar el mensaje visible bajo el botón; conservar diagnóstico útil en consola y no declarar cambiado un endpoint cuya URL no cambió.
- Renombrar el botón de publicación a **Actualizar Servicios**. Mantener el ID/handler o actualizar ambos coherentemente, sin duplicar acciones.
- Añadir pruebas responsive de geometría, orden, expansión de pestaña activa, altura de consola, ausencia de mensajes bajo el botón y resultado individual por servicio.
- **Evidencia de cierre:** la consola y su línea de comandos preceden a la barra de pestañas. Las cuatro pestañas muestran icono; solo la seleccionada expande su etiqueta, en escritorio y móvil. La consola ocupa 48% de la altura útil (antes 24%), usa el ancho disponible y conserva scroll. Se compactaron separaciones y controles sin cambiar IDs ni handlers.
- Endpoints informa en consola la carga, errores, validación, cambios individuales, idempotencia/sin cambios y resultado final. No escribe estados debajo del botón. El botón se llama **Actualizar Servicios** y conserva su ID/handler. Los endpoints sin cambios se identifican correctamente.
- **Pruebas:** `DeveloperPanelUX` 11/11 PASS; `DeveloperOperationMessages` 8/8 PASS. CI run `45509850708`: 517 suites, 6,160 pruebas aprobadas, 0 fallos; Chromium `Aug146ResponsiveBrowser` 236/236 PASS en 1366×768, 390×844, 360×800 y 320×700. Pages run `45509849705`: SUCCESS.
- Dos iteraciones iniciales de CI detectaron expectativas de pruebas obsoletas; se ajustaron para comprobar el nuevo comportamiento. La ejecución final pasó completa.
- No se modificaron Apps Script, endpoints reales, PropertiesService, OAuth, permisos, Spreadsheet, Drive ni datos. No se desplegaron servicios backend.

## Auditoría de duplicados y estado previo

- **BETA-F007 — carga YouTube de Tutorial histórico:** COMPLETADA EN CÓDIGO Y CI; prueba real Beta pendiente. CI 45506352069: 517 suites, 6,156 pruebas, 0 fallos; inicialización FEEDBACK 10/10 PASS para Tutorial legacy y canónico. Procedimiento en `Tareas_Beta.md` §24; evidencia en `Hallazgos_Beta.md`.
- **Dashboard de actividad:** corrección frontend completada; `cortesAportados`, `aportesRegistrados` y `vehiculosConAportes` se presentan por separado. No duplicar el backend. Validación de datos reales FEEDBACK pendiente en Beta aislada (§21–22 de `Tareas_Beta.md`).
- **Developer:** AUG-146/AUG-147 y la revisión del 2026-11-24 están completadas en código y CI. La consola, orden de pestañas, etiquetas compactas y mensajería de Endpoints están cubiertos por `DeveloperPanelUX` y `DeveloperOperationMessages`. No repetir; validación visual/operativa Beta pendiente (§21 de `Tareas_Beta.md`).
- **Modal Tutorial:** BETA-F007 trata la identidad de destino para la carga/aprobación; no cubre formato enriquecido ni render del vídeo en el modal de detalle. Es una tarea distinta.

## Requisitos transversales

- Cumplir NORMAS_DESAROLLO.md §§17–19 y especialmente §18: no secretos compartidos/manuales en PropertiesService; no URLs/configuración de otros servicios dentro de Apps Script; coordinación funcional desde frontend siempre que sea viable; llamadas técnicas directas solo si son necesarias y sin secreto compartido.
- No modificar `GPSpedia2.2.5`.
- No desplegar Apps Script, cambiar endpoints, propiedades, permisos, Spreadsheet, Drive ni OAuth en esta ejecución.

## Siguiente paso operativo

La fase de validación Beta fue cerrada por instrucción del propietario el 2026-11-26. La siguiente tarea de implementación es **GP-UTIL-BUTTON-NO-REACTION-01**, registrada al inicio de este backlog.


## Plan MIG-URL — registro de tareas y exclusividad — 2026-11-24

Documento rector de ejecución: `Migracion_URL_Servicios_Frontend.md`. Las tareas MIG-URL-001..008 son las únicas autorizadas hasta cerrar el plan.

- **MIG-URL-001 COMPLETADA:** normativa §§17.1 y 18 alineada con el mecanismo de la rama protegida; plan completo creado; tareas y checkpoint actualizados.
- **MIG-URL-002 PENDIENTE:** inventario y verificación de URLs de AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN. Siguiente y única tarea autorizada.
- MIG-URL-003..008 permanecen pendientes y bloqueadas por sus dependencias.
- No continuar tareas de Beta ni otros trabajos fuera de este plan.


### MIG-URL-002 — avance de inventario — 2026-11-24

- Inventario documental creado en `Inventario_URL_Servicios.md`.
- Confirmado en código que las URLs activas proceden de `Servicios.endpoint_url` para la revisión indicada por `ConfiguracionControl.active_revision`.
- Revisados `api-config.js`, `Auth.js`, `CentralConfigurationReader.js` y la guía de despliegue. Los seis valores activos no están en Git.
- Las URLs del `api-config.js` de `GPSpedia2.2.5` se consideran históricas/no verificadas; no copiarlas a la nueva configuración.
- Bloqueo de evidencia: Google Drive/Sheets connector no está disponible (deshabilitado por administración). Falta un snapshot de solo lectura de la revisión activa y las seis filas.
- No se ejecutaron peticiones de salud remotas por falta de confirmación de entorno aislado. No se modificaron endpoints ni servicios.
- MIG-URL-002 sigue activa. MIG-URL-003 y todas las demás tareas permanecen bloqueadas. Ninguna tarea ajena al plan está autorizada.


### MIG-URL-002 — cierre del inventario y traspaso a MIG-URL-003 — 2026-11-24

- El usuario proporcionó las seis URLs exactas de AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN.
- Validación estructural: 6/6 HTTPS, dominio Google Apps Script, ruta /exec y seis IDs distintos.
- La procedencia queda registrada como confirmación directa del usuario; no se afirma que se haya leído la Spreadsheet ni su revisión activa porque el conector sigue deshabilitado.
- No se hicieron solicitudes HTTP remotas. La comprobación de identidad de salud se difiere a MIG-URL-008 en Beta aislada y autorizada.
- MIG-URL-002 COMPLETADA. La única tarea activa pasa a ser MIG-URL-003. No iniciar tareas ajenas al plan.


## Próxima tarea en cola — Dashboard de actividad: Actividad reciente

**Estado: COMPLETADA EN CÓDIGO Y PRUEBA CONTRACTUAL CI (2026-11-25).** Validación real de FEEDBACK/Spreadsheet diferida a Beta.

### Objetivo
Mejorar la legibilidad y presentación de la pestaña **Actividad reciente** del Dashboard, transformando los datos recibidos de los servicios en información clara para el usuario.

### Requisitos funcionales y visuales
- Presentar inicialmente solo las columnas **Fecha**, **Usuario** y **Acción**; eliminar la necesidad de desplazamiento horizontal para consultar la lista.
- Formatear fechas en un formato compacto y legible, por ejemplo `24/11/26`.
- Mostrar el nombre legible del usuario cuando esté disponible, por ejemplo `Pablo Peña`, en lugar de identificadores o nombres parciales.
- Traducir/normalizar los códigos de acción a expresiones comprensibles y consistentes, por ejemplo `View vehicle` → `visitó`.
- No mostrar objetos serializados vacíos ni fragmentos técnicos como `{}` o `• referencia V-105` en la descripción resumida.
- Al seleccionar una fila, desplegar un acordeón asociado a esa fila con la información contextual del evento y del vehículo, usando los datos ya recibidos. Ejemplo: `Chevrolet - Suburban 2021 - 2026`.
- Mantener como máximo un acordeón abierto: al seleccionar otra fila, cerrar el anterior y abrir el nuevo.
- Cerrar el acordeón al hacer clic fuera de él.
- El diseño debe adaptarse a escritorio y móvil, sin scroll horizontal en la vista principal.

### Límites técnicos obligatorios
- **Solo frontend/presentación. No modificar servicios Apps Script**, sus handlers, hojas, datos, contratos ni payloads.
- Consumir la información que ya proporcionan los servicios; resolver el formato, las etiquetas, la composición de la descripción y la interacción en la interfaz.
- No inventar datos ausentes. Si no existe un nombre legible o detalle de vehículo, mostrar un fallback discreto y comprensible.
- Preservar el orden, la paginación/límites, los filtros y las capacidades actuales del registro de actividad.
- No alterar la captura ni el almacenamiento de eventos.

### Validación y cierre
- Inspeccionar primero el componente frontend, los datos reales disponibles en su contrato y los estilos responsive.
- Añadir pruebas de formato de fecha, resolución de usuario, traducción de acciones, descripción de vehículo, eventos con datos incompletos y apertura/cierre del acordeón.
- Verificar que solo una fila pueda permanecer expandida y que el clic fuera cierre el detalle.
- Validar escritorio y móvil y comprobar que no exista desplazamiento horizontal en la vista principal.
- Ejecutar pruebas de regresión y sintaxis de los archivos modificados.
- Confirmar mediante revisión del diff que no se modificó ningún servicio Apps Script ni contrato backend.


---

## Solicitudes del propietario — prioridades de continuidad (25-11-2026)

Esta sección consolida el estado vigente y prevalece sobre los apuntes históricos anteriores que todavía indiquen MIG-URL-002 o MIG-URL-003 como tarea activa. MIG-URL-001..007 están cerradas y MIG-URL-008 queda cerrada como fase Beta. Las tareas derivadas de hallazgos y el nuevo reporte del botón de útil se priorizan en el plan de ejecución situado al inicio de este backlog.

### Prioridad 1 — Útiles: idempotencia por usuario/vehículo y estabilidad de CATALOG
**Estado:** COMPLETADA CON VALIDACIÓN DIFERIDA — CI 45535275807: 523 suites, 6,206 pruebas, 0 fallos. Validación funcional de los deployments Apps Script/Spreadsheet Beta pendiente.

- Un usuario puede registrar un útil una sola vez por vehículo, independientemente del corte en el que vuelva a pulsar.
- La consulta de duplicados y el append se ejecutan dentro de una sección crítica breve con `tryLock(0)`; si hay contención, el frontend reintenta silenciosamente hasta cinco veces (100–400 ms). El log de actividad queda fuera del lock.
- Se reconocen filas históricas repetidas o con identidad heredada normalizable; no se crea una nueva fila si ya existe un evento del mismo usuario y vehículo.
- CATALOG proyecta una sola contribución por usuario/vehículo, incluso si el ledger contiene filas repetidas o eventos asociados a cortes distintos; se conserva el primer corte registrado como atribución.
- Los nuevos eventos validan el ID numérico del vehículo, corte 1–3 e identidad del usuario antes de escribir. Identificadores de usuario fuera del alfabeto seguro se convierten a una clave estable SHA-256 compartida por FEEDBACK y CATALOG.
- La respuesta idempotente es exitosa, devuelve el contador confirmado y no incluye un mensaje de “ya dio útil”. La interfaz marca el vehículo como útil, no cada corte por separado.
- No se modifica el contador físico de Cortes para los eventos nuevos; CATALOG proyecta los actores únicos desde FeedbackLikes.

### Prioridad 2 — Dashboard: consolidar aportes de nombres idénticos
**Estado:** COMPLETADA — ActivityDashboardContributions 3/3 PASS y regresión CI aprobada. La consolidación Pablo Peña 365 + 15 = 380 está cubierta.

- Consolidar registros del mismo nombre visible normalizado aunque los servicios entreguen distintos IDs históricos.
- Sumar los cortes y aportes registrados de las filas agrupadas. No duplicar el mismo nombre en la tabla.
- Ejemplo de aceptación: `Pablo Peña — 365 cortes` y `Pablo Peña — 15 cortes` deben mostrarse como una sola fila con `380 cortes`.
- No cambiar servicios Apps Script ni el contrato de datos. Los conteos de vehículos se conservan con la regla actual de agregación porque el frontend no dispone de la identidad de cada vehículo para sumar sin riesgo de duplicarlos.

### Prioridad 3 — Modal de detalle de tutoriales: vídeo YouTube visible
**Estado:** COMPLETADA CON VALIDACIÓN DIFERIDA — TutorialVideoModalLayout 9/9 PASS y navegador 260/260 PASS. La reproducción real de vídeos queda pendiente de Beta.

- Usar el mismo tamaño/estrategia del iframe del vídeo guía de desarme del modal de detalle de corte: ancho 100 % y alto fijo de 315 px.
- Cargar el iframe de inmediato (sin lazy loading), mantener URL de embed validada, permisos de reproducción y pantalla completa.
- El contenedor no puede contraerse dentro del modal. No cambiar URLs ni datos guardados de tutoriales.

### Prioridad 4 — Encabezado de detalle de cortes/tutoriales
**Estado:** COMPLETADA — CutDetailModalLayout 32/32 PASS y navegador 260/260 PASS en cuatro tamaños.

- Mantener el título en una sola línea cuando quepa; si excede el ancho disponible, truncar de forma legible en lugar de partir palabras o generar saltos innecesarios.
- Alinear el borde inferior del logo y del nombre del modelo y conservar la misma separación visual respecto de la línea azul.
- Aumentar 2 px el tamaño del nombre del modelo en móvil.
- Confirmar en escritorio y móvil que el cierre y las acciones del modal no se desplacen ni se solapen.

### Continuidad obligatoria
- En los próximos trabajos continuar con las validaciones Beta diferidas, en este orden: (1) útiles FEEDBACK/CATALOG, (2) reproducción real de vídeos de tutoriales. No reabrir ni duplicar las implementaciones locales ya aprobadas.
- Beta de útiles: comprobar que dos usuarios distintos suman dos útiles; el mismo usuario, al repetir en el mismo vehículo o en otro corte, conserva un solo útil y no genera una segunda fila; CATALOG debe devolver el snapshot sin error.
- Beta de vídeo: comprobar reproducción real de al menos un tutorial con URL watch y otro con URL corta/shorts, tanto en escritorio como en móvil.
- No desplegar Apps Script ni modificar hojas, datos, permisos o endpoints durante las pruebas locales. MIG-URL-008 continúa pendiente de autorización y entorno Beta aislado.
- La tarea previa **Actividad reciente** del Dashboard (tabla Fecha/Usuario/Acción con acordeón de detalle) sigue en cola separada; no se sustituye por la consolidación de aportes de esta solicitud.


### Actualización de endpoints — 2026-11-24

- Por instrucción expresa del propietario, se sustituyeron las URLs locales de CATALOG y FEEDBACK en `JS/Frontend/api-config.js`; las otras cuatro entradas permanecen intactas.
- Se actualizó el fixture `JS/Tests/LocalApiEndpoints.mjs` para exigir los nuevos valores.
- Esta actualización no modifica deployments Apps Script. La verificación HTTP de identidad/salud de los seis servicios sigue pendiente de MIG-URL-008 y de la autorización/confirmación de Beta aislada.

---

## Prioridad de implementación solicitada — 2026-11-25

Las tareas de implementación frontend se ejecutan antes de retomar las validaciones Beta diferidas. Las validaciones de deployments, Spreadsheet/Drive reales, reproducción externa y dispositivos físicos se conservan pendientes y no bloquean la implementación local.

### GP-TUTORIAL-DETAIL-COMPACT-01 — Presentación del modal de detalle de tutoriales
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA — 2026-11-25.**
- Corregir el ancho del título: completo en una línea cuando quepa y máximo dos líneas cuando sea necesario, sin truncar palabras prematuramente.
- Reducir la imagen aproximadamente al 50 % de su tamaño actual, conservando proporción y centrado.
- Eliminar el espacio vacío entre título e imagen; reducir la separación entre imagen y vídeo.
- Compactar «Cómo identificarlo», «Dónde encontrarlo» y «Detalles», separándolos con una línea azul como en los modales de corte y Problemas y Soluciones.
- Mantener contenido enriquecido seguro, vídeo validado, permisos, edición, guardado y cierre.
- Alcance exclusivamente frontend/estilos; sin cambios en Apps Script, URLs, contratos, datos ni registros.
- **Evidencia de cierre:** TutorialVideoModalLayout 18/18 PASS; CI 45540225703 aprobada y navegador Chromium 264/264 PASS en cuatro viewports. El título cabe en una línea cuando es posible y admite hasta dos; imagen al 50 %, espacios compactos y divisores azules.
- La reproducción real del vídeo y la inspección física quedan diferidas a Beta.

### GP-DASH-ACTIVITY-RECENT-01 — Presentación de Actividad reciente
**Estado: COMPLETADA EN CÓDIGO Y CI — 2026-11-25.**
- Tabla inicial Fecha/Usuario/Acción; fecha compacta; nombre legible; acciones comprensibles.
- Sin objetos vacíos ni fragmentos técnicos en el resumen.
- Acordeón contextual por registro, máximo uno abierto y cierre al hacer clic fuera.
- Responsive sin scroll horizontal.
- Solo frontend; preservar orden, límites, filtros y datos recibidos. Sin cambios Apps Script/contratos/payloads.
- Añadir pruebas locales de normalización, datos incompletos, acordeón y responsive.

**Después de las implementaciones vigentes:** no reabrir la fase de pruebas Beta ni crear suites de prueba. Las validaciones remotas que no se ejecutaron permanecen expresamente NO VERIFICADAS.


## Incidencia GP-LIKE-FIRST-VOTE-01 — error al registrar el primer útil

**Estado: COMPLETADA EN CÓDIGO Y CI — 2026-11-25.**

- Síntoma reportado: al pulsar el botón útil aparece «No se pudo registrar tu reacción. Reintenta», incluso en modelos que no muestran votos útiles.
- Hallazgo reproducible en el código: FEEDBACK insertaba/confirmaba el evento y después volvía a leer el ledger para calcular el contador. Un evento histórico inválido del mismo vehículo podía hacer fallar ese cálculo y devolver error después de guardar el voto. CATALOG también rechazaba la proyección completa por una sola fila histórica inválida.
- Corrección: aislar filas históricas inválidas en los conteos de FEEDBACK/CATALOG, conservarlas sin modificarlas y emitir advertencia técnica sin datos personales; calcular el contador antes de la escritura y devolver el valor confirmado esperado tras el append. La deduplicación del mismo actor/vehículo permanece estricta: un evento corrupto que coincide con el actor actual no provoca una segunda inserción.
- Pruebas añadidas: primer voto con actor histórico inválido, evento con corte inválido de otro actor, rechazo seguro cuando la fila corrupta pertenece al mismo actor y proyección CATALOG con filas inválidas mezcladas con eventos válidos.
- **Evidencia CI:** workflow `45541840409` (service-tests y responsive-browser) SUCCESS; workflow Pages `45541840034` (build y deploy) SUCCESS. Las suites de regresión añadidas y las comprobaciones de navegador finalizaron sin fallos.
- La validación funcional contra los deployments FEEDBACK/CATALOG y la Spreadsheet Beta sigue diferida; no se realizaron llamadas remotas ni despliegues Apps Script.
- No se realizaron cambios en hojas, datos, deployments, PropertiesService o permisos.


### Rectificación GP-LIKE-FIRST-VOTE-01 — alcance del lock

La validación posterior al cierre identificó una causa adicional directamente relacionada con el cambio de idempotencia: `withFeedbackLikeLock_` usa `getScriptLock().tryLock(0)` y el frontend solo reintenta cinco veces con esperas breves. Si otra operación del mismo proyecto FEEDBACK mantiene el ScriptLock, el primer voto se rechaza antes de consultar el ledger o insertar una fila. La implementación anterior mantenía localización del vehículo, lecturas y conteo dentro del lock, ampliando la ventana de contención. El lock también es compartido con la reserva de inicialización de vídeos.

Se ajusta el diseño para dejar fuera del lock la localización del vehículo, preparación del ledger y cálculo del contador. La sección crítica conserva únicamente la comprobación autoritativa de idempotencia (actor+vehículo), la reconciliación mínima de un pendiente y el append/flush. La lectura del contador y telemetría pasan después de liberar el lock; un fallo de conteo no transforma un append confirmado en rechazo. La búsqueda de duplicados prioriza la columna actorKey y conserva compatibilidad con la identidad legacy.

Se agrega regresión de contención simulada: lock ocupado no escribe; lock libre registra el primer voto; mismo actor/vehículo no crea otra fila; usuarios distintos sí registran. CI final 45544697384: 523 suites, 6,226 pruebas aprobadas, 0 fallos; responsive-browser SUCCESS. Pages 45544697351: build y deploy SUCCESS.


## Hallazgo independiente — escala de lectura de útiles en CATALOG

**Estado: RESUELTO — GP-CATALOG-LIKE-PROJECTION-READ-01; CI 45612534877.**

La proyección ahora lee únicamente A:C y F de FeedbackLikes, conservando actor/vehículo/corte/status, filtrado `event`, esquema, deduplicación y tolerancia a eventos inválidos. Prueba 6/6 PASS; regresión 526 suites, 6,245 pruebas, 0 fallos. Sin caché adicional ni coordinación backend.



## Tareas recién registradas — 2026-11-25

### GP-DEV-LOG-ERRORS-01 — Copiar solo errores de consola
**Estado: COMPLETADA — CI run 45612534877 PASS; regresión 526 suites, 6,245 pruebas, 0 fallos.**
- El botón usa únicamente elementos `div.log-error`; excluye advertencias, información y falsos positivos por texto.
- Se descartan entradas vacías y se mantiene el formato de líneas con salto de línea.
- Prueba `DeveloperConsoleErrors.mjs` añadida con contrato estático y selección simulada.

### GP-ADMIN-DRIVE-AUDIT-SCHEMA-01 — Resolver esquema de AdminOperationGuards
**Estado: COMPLETADA — CI run 45612534877 PASS; regresión 526 suites, 6,245 pruebas, 0 fallos.**
- `getAdminLocalGuardSheet_` ahora crea la hoja ausente, inicializa el encabezado únicamente si está vacío, verifica la escritura y recupera la carrera de creación por relectura.
- Hoja existente con encabezado incompatible no se sobrescribe; se rechaza fail-safe.
- Pruebas de contrato y simulaciones de creación, encabezado válido, esquema incompatible y carrera de inserción PASS; `AdminLocalOperationGuard.mjs` PASS. No se activaron guardas adicionales ni se modificaron recursos reales.

### GP-ADMIN-DRIVE-SCAN-MODAL-01 — Transformar modal de auditoría de cortes a modo escaneo
**Estado: COMPLETADA EN CÓDIGO Y VALIDACIÓN CONTRACTUAL CI.**
- Modal de auditoría: se agregó una consola de progreso integrada con estados visuales, aria-live y scroll automático limitado a 250 entradas, reflejando en simultáneo los mensajes enviados a la consola Developer.
- Los resultados incrementales de imágenes existentes permanecen en la lista complementaria; se delimitó el scroll del resumen/progreso y resultados, y se ajustó el layout a móvil.
- Pruebas `AdminDriveScanModal.mjs` 7/7 PASS y `AdminDriveAuditGlobalConsole.mjs` 1/1 PASS en CI run 45611120099. La suite global tuvo cinco suites fallidas, pero ninguna correspondió al modal: contratos FEEDBACK/CATALOG con expectativas de deduplicación antiguas, DeveloperConsoleRouting con assertion de copia obsoleta y MIG021 de URLs. No se desplegaron servicios Apps Script ni se accedió a Drive/Spreadsheet. No se invocaron servicios Apps Script, Drive ni Spreadsheet.

### GP-LIKE-REBUILD-01 — Reconstruir recordLike ante fallo persistente
**Estado: COMPLETADA EN CÓDIGO Y CI — run 45612250526 (525 suites, 6,239 pruebas, 0 fallos). Validación Beta diferida.**
- El error de registro de útil continúa tras la corrección previa. Reanalizar el flujo y reconstruirlo con estrategia distinta si procede.
- Revisar frontend→FEEDBACK→append/idempotencia→respuesta→actualización CATALOG, contención, timeout, resultado ambiguo y publicación. No convertir un voto confirmado en error aparente ni permitir duplicados actor+vehículo.
- Mantener un útil por usuario y corte; el mismo usuario puede votar en cortes distintos del vehículo.
- Añadir pruebas de contrato, simulación de integración, fallos parciales, concurrencia/idempotencia, regresión y UI. Resolver causa, no añadir fallback superficial.
- No invocar servicios reales ni desplegar Apps Script sin autorización Beta explícita.


### Rectificación GP-LIKE-REBUILD-01 — regla funcional por corte (2026-11-25)

- Un usuario puede registrar un útil en cada corte individual del vehículo. Los cortes 1, 2 y 3 son aportes independientes.
- Repetir el útil en el mismo corte por el mismo usuario debe ser idempotente y silencioso: no insertar otra fila, no mostrar notificación, no emitir mensajes en consola ni advertencias/rechazos visibles.
- Repetir el útil en un corte diferente del mismo vehículo sí debe registrar el aporte.
- Solo debe mostrarse el mensaje de error al usuario cuando un útil que aún no está registrado no pueda guardarse por una falla real.
- El frontend debe mantener estado por clave vehículo+corte y el backend FEEDBACK debe validar unicidad por actor+vehículo+corte bajo concurrencia. CATALOG debe proyectar y contar por corte, preservando votos distintos de un mismo usuario en el mismo vehículo.
- Se rectifica la regla anterior actor+vehículo global: queda obsoleta y no debe utilizarse como criterio de deduplicación.
- Estado: CÓDIGO IMPLEMENTADO Y PRUEBAS AISLADAS PASS; contratos CI antiguos ajustados a corte-index. No se ejecutaron deployments ni operaciones con datos Beta.


## 4. GP-LIKE-REBUILD-01 — Idempotencia de útiles por corte

**Estado: CERRADA — validación automatizada ejecutada en runner aislado.** Se corrigió la clave de idempotencia para actor+vehículo+corte. Los votos de cortes distintos son independientes; duplicados del mismo corte retornan silenciosamente sin refrescar conteos ni telemetría. CATALOG agrega actor único por corte. Pruebas FeedbackLikeIdempotency y FeedbackLikeAppendOnly ejecutadas mediante runner aislado contra los archivos recuperados de la rama; ambas pasan. FEEDBACK y CATALOG también pasan compilación sintáctica. No se desplegaron servicios Apps Script.


### GP-LIKE-REBUILD-01 — cierre de rectificación por corte

- Se confirma la implementación existente: FEEDBACK valida unicidad actor+vehículo+corte bajo lock; la repetición del mismo corte responde silenciosamente; cortes distintos son independientes; conteo CATALOG se proyecta por actor/corte.
- Runner aislado: `FeedbackLikeIdempotency` 10/10 PASS y `FeedbackLikeAppendOnly` 4/4 PASS. FEEDBACK/CATALOG sintaxis PASS.
- CI detectó tests contractuales legacy que aún exigían deduplicación global actor+vehículo y proyección anterior. Se ajustaron `FeedbackLikePreflightOutsideLock.mjs` y `FeedbackLikeCompletedReplayPreflight.mjs` al contrato actor+vehículo+corte. La suite de copy log Developer también se alineó con el texto vigente; `DeveloperConsoleRouting` 5/5 PASS.
- Regresión run 45611423533: 427 suites/5314 tests aprobados; 4 fallos (2 contratos likes que ya se ajustan, MIG019 repetición del contrato likes, MIG021 URL endpoints). CI más reciente de las correcciones pendiente.
- Cierre local de implementación; validación real Beta diferida. Siguiente: GP-DASH-ACTIVITY-RECENT-01.


### GP-DASH-ACTIVITY-RECENT-01 — corrección de contención

- Hallazgo: el handler global de clics trataba toggles externos a la tabla como excepciones y no confinaba la detección al contenedor del dashboard.
- Corrección frontend: el listener de cierre externo ahora ignora los clics que ocurren dentro de la tabla/contenedor y solo cierra cuando el evento es externo, conservando compatibilidad del fallback.
- Prueba añadida `ActivityDashboardRecentInteraction.mjs`: apertura, clic interno, exclusividad de acordeón, cierre externo, estado aria y reemplazo del listener al renderizar nuevamente; registrada en runner.
- CI pending. Solo frontend y pruebas; no se modifican servicios Apps Script ni datos.


### GP-DASH-ACTIVITY-RECENT-01 — cierre de contención

- Listener de cierre externo confinado al contenedor de la tabla. Los clics internos no colapsan; los externos sí.
- `ActivityDashboardRecentInteraction.mjs`: 6/6 PASS en CI. Browser-responsive AUG-146 PASS en workflow; no es browser específico de esta pestaña.
- CI suite 45611875173: 439 suites/5428 tests aprobados, tres suites fallidas (contract de FEEDBACK preflight corregido en 05fc4f2b; MIG021 configuración URL sigue pendiente de reconciliación). La tarea de interacción pasa.
- Sin cambios de backend, payload, datos ni deployments.


### GP-CATALOG-LIKE-PROJECTION-READ-01 — Reducir lectura del ledger de útiles
**Estado: COMPLETADA EN CÓDIGO Y CI — run 45612534877 (526 suites, 6,245 pruebas, 0 fallos).**
- La reconstrucción de CATALOG leía siete columnas de FeedbackLikes completas. Se reemplazó por lecturas A:C y F, que contienen actor/vehículo/corte y status; se mantiene deduplicación por actor+corte y tolerancia a eventos inválidos.
- Test aislado `CatalogLikeProjectionReadScale.mjs` 6 assertions: conteo por corte y lectura compacta; registrado en runner.
- No se introduce cache/TTL ni riesgo de proyección obsoleta, ni locks globales o coordinación entre servicios.


### GP-LIKE-REBUILD-01 — confirmación de cierre CI

- CI run 45612250526: 525 suites, 6,239 pruebas, 0 fallos; responsive-browser SUCCESS. Los contratos legacy de deduplicación se reconciliaron con actor+vehículo+corte; las seis URLs contractuales local se alinearon con el conjunto vigente de la rama.
- Validación de servicios Beta real diferida; no hubo deployment.


### GP-CATALOG-LIKE-PROJECTION-READ-01 — cierre

- CI run 45612534877 SUCCESS: 526 suites, 6,245 pruebas, 0 fallos; responsive-browser SUCCESS. `CatalogLikeProjectionReadScale.mjs` 6/6 PASS.
- Proyección del ledger transferida solo con A:C + F (cuatro campos), en lugar de A:G; mantiene deduplicación actor+vehículo+corte, esquema validado y event filtering. Sin caché adicional, locks ni coordinación entre servicios.


## 2026-11-25 — Verificación técnica integral local

**Estado: COMPLETADA EN EL ALCANCE LOCAL.**

- CI final sobre el código y runner revisados: run 45613697548 SUCCESS; 528 suites, 6,263 pruebas aprobadas y 0 fallos. Jobs `service-tests` y `responsive-browser` SUCCESS.
- Chromium/AUG-146: 264/264 PASS en 1366×768, 390×844, 360×800 y 320×700; 16 capturas sintéticas.
- Parsing: `RepositoryJavaScriptSyntax` 1/1 PASS sobre 478 archivos .js/.mjs. Referencias: `RepositoryModuleReferences` 1/1 PASS sobre 398 archivos.
- Integración: `ServiceCallGraphContract` 9/9 PASS; `MIG028SecurityPerformanceRegression` 9/9 PASS; regresiones de útiles, CATALOG, ADMIN, Developer, Dashboard y tutoriales incluidas en las 528 suites.
- Hallazgo corregido durante la verificación: `AdminOperationGuardsSchema.mjs` y `DeveloperConsoleErrors.mjs` existían pero no estaban conectadas al runner general. Se registraron en `RunServiceTests.mjs` y se alinearon sus resúmenes con el contrato del runner. CI final confirma 10/10 y 8/8 PASS, respectivamente.
- No se modificaron servicios Apps Script, endpoints, PropertiesService, Spreadsheet, Drive, permisos ni datos externos. Pages build/deployment automático SUCCESS; no es un despliegue Apps Script.
- Avisos no bloqueantes del runner: dependencias/acciones de GitHub reportan deprecación de Node.js 20 y uso de `punycode`; no se alteró infraestructura por no ser necesario para esta verificación.
- La validación Beta real permanece separada. MIG-URL-008 continúa pendiente de confirmación de entorno Beta aislado y autorización expresa para GET de salud; no se hicieron peticiones remotas.


## 2026-11-25 — Actualización de endpoints CATALOG y FEEDBACK

**Estado: COMPLETADA EN CÓDIGO Y CI. Validación remota de Apps Script diferida a Beta.**

- Se actualizó exclusivamente `API_ENDPOINTS.CATALOG` y `API_ENDPOINTS.FEEDBACK` en `JS/Frontend/api-config.js` con los deployment URLs proporcionados expresamente por el usuario.
- Se actualizaron las expectativas exactas de `JS/Tests/LocalApiEndpoints.mjs`; no se cambiaron AUTH, WRITE, UTILITIES ni ADMIN.
- CI sobre HEAD `5a0b26f23e4ac83c18d14779e0ef5e03df145090`: run 45619392380 SUCCESS; 528 suites, 6,263 pruebas aprobadas, 0 fallos. `LocalApiEndpoints` 10/10 PASS. AUG-146 Playwright 264/264 PASS en cuatro viewports.
- GitHub Pages build/deployment run 45619392374 SUCCESS.
- No se invocaron los endpoints, no se desplegaron proyectos Apps Script y no se modificaron PropertiesService, Spreadsheet, Drive, permisos ni datos externos. La disponibilidad y compatibilidad real de los dos deployments quedan pendientes de validación Beta.
- MIG-URL-008 (comprobación GET de salud) sigue separada y pendiente de confirmación de entorno Beta aislado y autorización expresa; esta actualización no implica autorización para consultar endpoints.


### GP-LIKE-REBUILD-01 — incidencia posterior: contención de lock (2026-11-25)

- Se identificó una ruta de rechazo reproducible en FEEDBACK: `withFeedbackLikeLock_` usaba `tryLock(0)` y el cliente agotaba cinco intentos con esperas de 100–400 ms (1 s acumulado). Cualquier contención temporal del ScriptLock compartido por las operaciones FEEDBACK podía rechazar un like nuevo antes de consultar idempotencia o escribir.
- Se conserva el requisito normativo de locks no bloqueantes en Apps Script. No se aumentó el tiempo de espera del servidor ni se amplió la sección crítica.
- `recordLike` amplió a 12 intentos, con espera incremental de 150 ms por intento (9.9 s acumulados como máximo), exclusivamente cuando el servidor devuelve `LIKE_LOCK_BUSY`. Los errores de sesión, validación, escritura y demás no se reintentan. Como el backend rechaza con ese código antes de entrar en la sección crítica, el reintento no repite una escritura.
- Se actualizaron `FeedbackLikeClientRetry.mjs`, `FeedbackLikeLockContention.mjs` y `FeedbackLikePreflightOutsideLock.mjs`.
- CI run `45624279054` SUCCESS: 528 suites, 6,264 pruebas aprobadas, 0 fallos; `service-tests` y `responsive-browser` SUCCESS. AUG-146: 264/264 PASS en cuatro viewports.
- La causa concreta del error observado en la ejecución remota no se puede confirmar sin consultar el registro de ejecución de FEEDBACK. El cambio realizado es frontend y entra en vigor con la publicación GitHub Pages; ese workflow está pendiente. No se invocó el endpoint ni se desplegó Apps Script. La FEEDBACK desplegada debe conservar el contrato que devuelve `LIKE_LOCK_BUSY`; si el deployment no contiene ese contrato, deberá actualizarse por separado con autorización.
- Estado: **COMPLETADA EN CÓDIGO Y CI; VALIDACIÓN DEL DEPLOYMENT FEEDBACK PENDIENTE DE BETA**. Se mantiene la idempotencia actor+vehículo+corte y los duplicados no se reenvían salvo rechazo explícito `LIKE_LOCK_BUSY`.


### GP-API-FEEDBACK-ENDPOINT-UPDATE-01 — Actualizar URL local de FEEDBACK
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA — CI run 45625740950 SUCCESS.**
- Actualizar exclusivamente `API_ENDPOINTS.FEEDBACK` en `JS/Frontend/api-config.js` con la URL confirmada por el propietario el 2026-11-25.
- Alinear la expectativa exacta de `JS/Tests/LocalApiEndpoints.mjs`.
- Preservar los otros cinco endpoints y el mecanismo único de configuración local establecido en NORMAS §§17–18.
- No invocar el endpoint, desplegar Apps Script ni modificar propiedades, permisos, Spreadsheet, Drive o datos externos.
- CI run `45625740950` SUCCESS: 528 suites, 6,264 pruebas aprobadas, 0 fallos; jobs `service-tests` y `responsive-browser` SUCCESS. Parsing de módulos modificados PASS. Pages run `45625739647` SUCCESS.
- La disponibilidad y compatibilidad real del deployment FEEDBACK quedan pendientes de validación Beta con autorización expresa; no se invocó el endpoint ni se desplegó Apps Script.


## GP-LIKE-REPLAY-COUNT-01 — contador confirmado en respuestas idempotentes (2026-11-25)
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA — CI run 45628974357 SUCCESS.**
- Comparación con la rama base: la versión base incrementaba directamente `Cortes.utilCorteN`. La arquitectura vigente conserva los votos nuevos en `FeedbackLikes` y CATALOG los proyecta; no modifica el contador físico de `Cortes`. Esta diferencia está documentada como decisión vigente y no debe revertirse sin migración del contrato.
- Hallazgo reproducible: cuando FEEDBACK detecta que el mismo actor ya registró el voto, el fast-path devolvía `alreadyLiked:true` sin `likeCount`. El frontend actualiza el modal solo con un contador entero confirmado, por lo que el botón podía quedar marcado como útil sin reflejar el total.
- Corrección: las respuestas idempotentes también calculan y devuelven el contador confirmado, fuera del lock; no insertan otra fila ni generan otra actividad. Se mantiene unicidad actor+vehículo+corte.
- Se corrigió y registró la prueba del módulo frontend real `JS/Frontend/likeState.js`; antes importaba una ruta raíz inexistente y no estaba conectada al runner.
- CI run `45628974357` SUCCESS: 529 suites, 6,270 pruebas aprobadas, 0 fallos; `FeedbackLikeIdempotency` 10/10, `FeedbackLikeAppendOnly` 4/4, `LikeClientCounter` 6/6; `service-tests` y `responsive-browser` SUCCESS. Pages run `45628972138` SUCCESS.
- Validación Beta pendiente: comprobar que los deployments FEEDBACK y CATALOG leen la Spreadsheet central autorizada, revisar `FeedbackLikes` y confirmar la proyección real. No se invocaron servicios ni se modificaron datos externos.


## GP-LIKE-TRUSTED-ACTOR-01 — identidad autenticada en útiles (2026-11-25)
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA — CI run 45633091113 SUCCESS. Validación remota FEEDBACK/CATALOG pendiente en Beta aislada.**
- Hallazgo: `handleRecordLike()` validaba `userId` y `userName` leyendo copias del payload, aunque FEEDBACK ya había autenticado la sesión e inyectado el actor confiable en `payload.__feedbackActor`.
- Corrección: la identidad y el nombre usados para deduplicación y actividad se obtienen exclusivamente de `__feedbackActor`; no se solicita al frontend enviar el nombre ni se confía en campos de identidad aportados por el navegador.
- Regresión añadida: el voto funciona sin `userId/userName` duplicados en el payload y rechaza la suplantación de esos campos cuando contradicen al actor verificado.
- Validación Beta pendiente: confirmar health, identidad y versión del deployment FEEDBACK antes de cualquier invocación de escritura; después ejecutar el caso sintético y verificar la fila en `FeedbackLikes`. No se desplegó Apps Script ni se modificaron hojas/datos externos.

- CI inicial `45632826674` detectó el fixture FEEDBACK desactualizado. Tras alinear `LocalApiEndpoints.mjs`, CI final `45633091113` SUCCESS: 529 suites, 6,270 pruebas PASS, 0 fallos; `FeedbackLikeIdempotency` 10/10, `LocalApiEndpoints` 10/10, `service-tests` y `responsive-browser` SUCCESS. No se invocó Apps Script ni se desplegó FEEDBACK; health/versión y prueba de escritura en `FeedbackLikes` permanecen pendientes de Beta.


## GP-LIKE-VALIDATION-16DIGIT-01 — compatibilidad con el asignador de IDs
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA — CI run 45638162735 SUCCESS.**
- El asignador de IDs de WRITE admite enteros positivos seguros de JavaScript; FEEDBACK restringía los útiles a 15 dígitos, un contrato más estrecho que `Number.isSafeInteger` y capaz de rechazar IDs válidos de 16 dígitos.
- Corrección aplicada: FEEDBACK alinea la validación del vehículo en el registro y conteo de útiles con el rango de enteros positivos seguros, sin aceptar IDs fuera de ese rango. El log del navegador no incluye el ID/corte enviado, por lo que no permite afirmar que el caso reportado correspondiera a un ID de 16 dígitos; la incompatibilidad del contrato sí quedó reproducida y corregida.
- Validación CI: `FeedbackLikeIdempotency` 10/10 PASS; `FeedbackLikePreflightOutsideLock` 8/8 PASS; suites completas 529/529, 6,272 pruebas PASS, 0 fallos. Se cubre `Number.MAX_SAFE_INTEGER`, rechazo de `Number.MAX_SAFE_INTEGER + 1`, idempotencia y conteo. La prueba remota FEEDBACK/Spreadsheet continúa sujeta a Beta autorizada.

## GP-CATALOG-REQUEST-BUDGET-01 — cancelación prematura del feed inicial
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA — CI run 45638162735 SUCCESS.**
- `requestCatalogFeedPage_` imponía un timeout externo de 8 s mientras `getCatalogChanges` ejecutaba hasta tres intentos de 5 s más backoff. El timeout exterior abortaba el ciclo antes de agotar los reintentos y producía el `AbortError` observado.
- Corrección aplicada: delegar el límite por intento y los reintentos a `catalogRequest.js`, conservando únicamente la señal de cancelación del ciclo de carga. No se elimina la cancelación explícita ni los límites internos.
- Validación CI: `CatalogFeedRetry` 11/11 PASS; `CatalogRequestRetry` 8/8 PASS; `CatalogStartupIntegrity` 25/25 PASS y `CatalogTransientFeedFallback` 2/2 PASS. La suite completa pasó con 529 suites, 6,272 pruebas y 0 fallos. La latencia/compatibilidad del deployment CATALOG queda pendiente de Beta autorizada.


## GP-UTIL-TOGGLE-01 — Estado reversible de útil por corte
- Prioridad: alta
- Estado: En ejecución
- Marcar y retirar útil por corte; hidratar el estado por usuario; actualizar el contador inmediatamente.
- Consolidar clics rápidos localmente y enviar solo el estado final tras un periodo de inactividad; transiciones idempotentes y silenciosas.
- La interfaz y los eventos nuevos usan "útil", no "like".
- Validar transiciones, deduplicación, proyección CATALOG, estado por usuario y contador.

## GP-DRIVE-AUDIT-VISUAL-01 — Auditoría visual y asociación de imágenes de cortes
- Prioridad: alta, después de GP-UTIL-TOGGLE-01
- Estado: Pendiente
- Mostrar miniaturas, estado de auditoría y relación propuesta con vehículo/modelo.
- Persistir URL, carpeta/ID/ruta, nombre, formato, MIME, origen y estado.
- Construir asociación con catálogo; mostrar ID, categoría, marca y modelo; las coincidencias ambiguas requieren revisión manual.
- Validar persistencia, miniaturas, asociación y regresiones.


## GP-UTIL-TOGGLE-01 — cierre (2026-11-25)
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.**
- Estado por usuario/vehículo/corte, toggle reversible y contador optimista; se hidrata en carga del vehículo; persistencia local y consolidación tras 1.8 s de inactividad. La cola serializa requests, evita duplicar solicitudes y conserva la intención más reciente. Reintentos acotados para lock ocupado y fallos silenciosos durante cambios repetidos.
- Backend append-only/idempotente por corte; estado activo/retirado, identidad actor autenticado. Actividad terminológica útil/retirada de útil.
- CI run 45680455995: 533 suites, 6,311 pruebas, 0 fallos; UsefulToggle 6/6, UI state 5/5, Queue 4/4, Client retry 2/2 + setCutUseful 1/1; responsive-browser SUCCESS.
- Validación real de FEEDBACK/CATALOG y Spreadsheet Beta permanece pendiente.

## GP-DRIVE-AUDIT-VISUAL-01 — cierre (2026-11-25)
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.**
- Resultados incrementales incluyen miniaturas, todas las clasificaciones y metadatos de origen/archivo/folder/format/MIME. Las referencias de Cortes conservan vehículo ID, categoría, marca, modelo, fila/campo; los resultados enlazan al archivo original.
- Preview de asociación del organizador añade miniaturas y candidatos, confianza y ambigüedad, sin aplicar asociaciones automáticamente.
- CI run 45680455995: 533 suites, 6,311 pruebas, 0 fallos; AdminDriveAuditIndexedDB 13/13, AdminDriveAuditVisualContract 6/6, AdminReplacedImagesIntegrity 64/64; AUG-146 264/264 PASS. Pages run 45680455638 SUCCESS.
- Pruebas locales no ejecutan Drive/Spreadsheet ni Apps Script; validación Beta aislada pendiente.


## MIG-URL-008 — preparación de validación Beta (2026-11-25)
**Estado: PREPARACIÓN COMPLETADA; VALIDACIÓN REMOTA PENDIENTE DE CONFIRMACIÓN/AUTORIZACIÓN.**
- Se revisó el contrato local de health, mapa API_ENDPOINTS, resolver fail-closed, seis endpoints e IDs únicos y test `LocalApiEndpoints` (10/10 PASS en CI previo). No se ejecutó GET.
- Se preparó protocolo en Tareas_Beta.md §25: seis health checks, prueba de login/catálogo/WRITE/FEEDBACK/ADMIN/UTILITIES, latencia, aislamiento, failover, identificación del deployment, controles de sesión/RBAC y no escritura en producción.
- Antes de ejecución, confirmar entorno Beta aislado, versión desplegada y autorización explícita. No copiar tokens, secrets, payloads PII ni credenciales a registros.


### GP-ADMIN-AUDIT-REFMAP-01 — Error de inicialización auditoría Drive
**Estado: CORRECCIÓN IMPLEMENTADA; VALIDACIÓN LOCAL/CI PENDIENTE.** El snapshot inicial no contiene Map de ubicaciones porque captura referencias en modo IDs-only; el escáner ya protege la lectura opcional. Test de regresión dedicado añadido.

### GP-UTIL-VISUAL-02 — Feedback visual inmediato del voto útil
**Estado: IMPLEMENTADO; VALIDACIÓN LOCAL/CI PENDIENTE.** Refuerzo del toggle visual inmediato en botón, aria-pressed, clase liked, color y estilo CSS frente a hover; se mantiene sincronización/contador optimista existente.


## GP-ADMIN-INVENTARIO-INCREMENTAL-01 — Registro automático de auditoría por lotes
**Estado: EN PROGRESO.**
- Al clasificar imágenes «Sin uso detectado», ADMIN debe registrar cada lote inmediatamente en la biblioteca de reemplazadas/sin uso, sin depender del botón manual al completar el scan.
- Preservar revalidación de referencias, ownership, Drive, historial y controles anti-duplicación; no organizar ni mover archivos durante el registro automático.
- Reanudación y reintentos idempotentes; registro de resultados/fallos recuperables; reconciliación stale solo cuando la auditoría esté completa.
- Plan y hallazgos: `GP_ADMIN_INVENTARIO_INCREMENTAL_01.md`. Tests de contrato, seguridad, resiliencia y CI pendientes.


## GP-ADMIN-INVENTARIO-INCREMENTAL-01 — cierre local (2026-11-25)
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.**
- Registro incremental automático por lote y consolidación final; el frontend mantiene el recorrido y expone estado/fallback si un lote no se confirma.
- CI run 45705928487 SUCCESS; syntax, regression runner y responsive-browser PASS. Prueba AdminIncrementalInventory integrada.
- Beta real ADMIN/Drive/Spreadsheet aislada pendiente; sin deployments ni escrituras externas.


## Incidencia #130 — discrepancia de útiles y recuperación de auditoría Drive (2026-11-25)
**Estado: EN PROGRESO.** Seguimiento: GitHub Issue #130.

### Alcance y aceptación — útiles
- Corregir el contador del título del corte para reflejar el total confirmado y cambiar inmediatamente por transición optimista (+1 al activar, -1 al retirar), sin incrementar por clics duplicados.
- Conservar el índice físico original de cada corte al ordenar la proyección CATALOG por útiles; los eventos FEEDBACK, el estado local y los contadores deben apuntar al mismo corte original.
- Hidratar el estado activo del usuario al cargar el vehículo y aplicar el estado visual del botón antes de permitir nuevas interacciones.
- Mantener persistencia local por usuario y debounce de 1.8 s; coalescer interacciones y enviar solo el último estado, serializar solicitudes por usuario/vehículo/corte, idempotencia y reintentos silenciosos ante lock ocupado o clics repetidos.
- Auditar la semántica de estados `event`/`withdrawn`/`completed` en FEEDBACK y CATALOG; preservar el indicador `completed` cuando el evento ya está materializado en el contador base para evitar doble conteo. Añadir pruebas para transiciones pendientes y completadas.
- Verificar estado, contador, títulos del recomendado y alternativos, cambios rápidos, concurrencia, reintentos y regresiones. No desplegar Apps Script ni tocar datos externos.

### Alcance y aceptación — auditoría Drive
- Reparar error reproducido ReferenceError: item is not defined en handleAuditDriveImagesInCortesCore_, preservar referenceLocations del snapshot y no perder lotes confirmados.
- Mantener escaneo recursivo de Cortes, paginación/cursor, deduplicación, reanudación y resultados incrementales.
- Consola Developer debe mostrar etapas, lotes, conteos, progreso, cursor, fallos y estado de continuación.
- Interfaz visual con miniaturas y enlace original; nombre, fileId, URL, folderId, ruta, MIME, formato, tamaño, fecha de modificación, origen, clasificación y referencias a vehículo (ID/categoría/marca/modelo/fila/campo).
- Persistir en Imagenes_Reemplazadas fileId, folderId, ruta, nombre, URL, MIME, formato, tamaño en bytes, fecha de creación/modificación/detección, origen, auditId, estado y ubicaciones de referencia verificadas.
- Relacionar candidatos por nombre/ruta/catálogo; mostrar confianza, IDs de vehículo y filas de Cortes, ambigüedad y revisión manual sin aplicar asociaciones ambiguas.
- Registrar resultados clasificados sin uso/reemplazados en Imagenes_Reemplazadas, por lote e idempotentemente, conservando revalidación, ownership, historial y no-destructividad. Reconciliar stale solo al completar el scan.

### Hallazgos y avance comprobado
- JS/Services/admin.js: el objeto de resultado contenía Array.isArray(item && item.referenceLocations) fuera de un callback y además duplicaba la propiedad. Se eliminó esa expresión; se conserva referenceLocations.map(...) desde el snapshot. Commit f740da0e98d40082d6753f6fd3670b0ad113e9f2.
- Regresión JS/Tests/AdminDriveAuditItemReference.mjs añadida e integrada en JS/Tests/RunServiceTests.mjs. Commits e1f04981ab99d770b31bdbe4cafefc782b5e173a y e4e0e0218e16cdc5ce89d641d81ad38cdbe26590.
- JS/Services/catalog.js: al reactivar después de retirar, el agregador conservaba completed=true; ahora un nuevo estado event reinicia esa marca. Commit fd629d599197d16705f418edda1f94784c5d5976.
- JS/Tests/CatalogLikeProjectionReadScale.mjs ampliada con secuencia event → withdrawn → event. Commit 22850449c06f3e7d6d620c55c48f154481aef509.
- CI de los commits nuevos aún no confirmada al registrar esta adenda. Validación Apps Script/Drive/Spreadsheet real queda pendiente de Beta aislada; no se ejecutaron llamadas ni escrituras externas.

### Siguientes pasos
1. Verificar CI y ejecutar pruebas focales AdminDriveAuditItemReference, CatalogLikeProjectionReadScale, FeedbackUsefulToggle, UsefulButtonState y UsefulSyncQueue.
2. Auditar el vínculo exacto entre contador proyectado, estado local y título DOM; corregir solo tras confirmar el contrato y añadir regresión.
3. Auditar scanner completo, respuesta incremental, metadatos, UI y guardado en Imagenes_Reemplazadas; completar pruebas de cursor, fallos parciales y reanudación.
4. Revisar diff, actualizar registros y checkpoint, verificar HEAD de rama de trabajo y que la base protegida siga intacta.


### Avance de metadatos y asociación — Incidencia #130 (2026-11-25)
- ADMIN amplió el esquema de Imagenes_Reemplazadas de 27 a 35 columnas, preservando las 11 históricas y las 16 columnas dinámicas previas; se añadieron `drive_folder_id`, `formato_archivo`, `tamano_bytes`, `fecha_modificacion_drive`, `referencias_catalogo_json`, `asociacion_estado`, `asociacion_confianza` y `asociacion_candidatos_json`.
- `handleSaveUnusedImagesInventory` ahora recupera metadatos del snapshot persistido de auditoría, exige que nombre/MIME/carpeta ID/ruta sigan coincidiendo con Drive y registra los campos adicionales por fila con read-back verificado.
- `handleGetReplacedImages` devuelve los nuevos campos; UI de biblioteca muestra formato, tamaño, ID de carpeta y fecha de modificación. La consola y resultados de auditoría muestran fileId y folderId.
- La asociación por nombre/ruta ahora devuelve IDs de vehículo y números de fila; cuando un modelo coincide con más de un vehículo, la sugerencia queda marcada ambigua y requiere revisión manual.
- Pruebas ampliadas: `AdminIncrementalInventory.mjs`, `AdminReplacedImagesIntegrity.mjs`, `AdminDriveScanModal.mjs` y nueva `AdminDriveAuditAssociation.mjs`.
- Commits: `7c89c7dff029747e60795daedace2f490b2daaad`, `be61d6af5d83c6162f982d842ab4946f3e47c590`, `26cdf9e505e554b247cb391b18f016551ff09786`, `79cf8ae1410b3d9c9cd00f925638e8a744c18721`, `2791a686ec76cb7910c7c2d904e936ceab44e4de`, `22d9ca3dff752d231a7dc3739e34c8ae7ddbec23`, `38267ac3a04e4a0639e750eca5e7b8c4acc38eed`, `252eb3e859849c4e703060fa47c005f4ec3f388b`, `fb46dc831921e9b62032f2eae03e8eba54d304db`, `c169b5a3804301fd252cfad28799e304781ffe7e`, `5936b0199987e0fd9ccde0a63a0c596f61bdc44d`, `9faffb29a10d3df93fa18a48585b8f521edf29f5`, `4e9ee24309841ca9a27f612de1369c4ada942c72`, `7e68789231ee320b96a6a164de670f04bee0d1bf`, `28e2ee915e0a1709b8d4d841987ea3f2f940d925`.
- Validaciones aisladas: migración simulada del esquema 35/35 columnas y lectura lista; read-back de los ocho campos nuevos de metadata/asociación; motor de asociación produce sugerencia única y marca como ambigua una coincidencia de dos vehículos; parser JavaScript PASS. Node/CI y Beta externa pendientes.

- `UsefulButtonState.mjs` ampliada para comprobar que el botón permanece deshabilitado hasta hidratar el estado FEEDBACK y que las acciones conservan el índice físico original. Runner aislado: 8/8 PASS. Commits `4f71aad685dc36cc5d956a02e63f0a5ed2f0c16b` y `5fa71b0a59821e684988ffd2e09ec240a0f6cc7a`.


## Incidencia #130 — validación y fixtures (2026-11-25)
- **Validación local/CI de útiles y regresiones focales: COMPLETADA.** CI `45718949366` SUCCESS: 539 suites, 6,385 pruebas, 0 fallos; responsive-browser SUCCESS.
- Se corrigieron tres fixtures, sin alterar código productivo: `AdminDriveAuditItemReference.mjs` ahora inyecta `fileName` y `classification`; `CortesImageModelAssociationSuggestions.mjs` proporciona ID de vehículo válido para que la sugerencia única sea realmente inequívoca; `LocalApiEndpoints.mjs` refleja los IDs CATALOG y ADMIN presentes en `API_ENDPOINTS` vigente.
- Pruebas focales aisladas con fuentes exactas de la rama: AdminDriveAuditItemReference 3/3, CatalogLikeProjectionReadScale 9/9, FeedbackUsefulToggle 6/6, UsefulButtonState 8/8, UsefulSyncQueue 4/4, CortesImageModelAssociationSuggestions 8/8 y LocalApiEndpoints PASS.
- Commits: `d1822ac9c9e52b2e8c292a061e2bbf681840588f`, `7f8e18814ad4cdc9f7696472a2b3c8b27b5eae2d`, `b7a8fbbf8615be14e3166f9119291a2db08ac856`.
- **Siguientes pasos vigentes:** (1) auditoría de contador proyectado/estado local/título DOM; (2) pruebas integrales de scanner, cursor, fallos parciales, reanudación y persistencia; (3) revisión del diff y cierre de #130. Apps Script/Drive/Spreadsheet real permanece diferido a Beta aislada y autorizada.


## Incidencia #130 — integridad del escaneo y sincronización del contador (2026-11-25)
**Estado: EN PROGRESO.**

- **Completado:** CI de regresiones de útiles y correcciones previas: 540 suites / 6,401 pruebas / 0 fallos, run `45719961761`, commit `6824868691bf901109f8e62e6517d0f50101fa22`.
- **Completado:** guardas backend para impedir inventario incremental/final, latest, preview, reconciliación y organización cuando el escaneo termina con errores de lectura o referencias no interpretables. El frontend conserva resultados parciales, bloquea acciones finales y solicita un nuevo escaneo.
- **Completado:** corrección de `syncUsefulCount_` para actualizar únicamente títulos de cortes y no reemplazar el icono/ contenido del botón útil.
- **Regresiones:** `AdminDriveScanIntegrity.mjs` 15/15; `AdminIncrementalInventory.mjs` 35/35; `UsefulButtonState.mjs` 9/9. Todas integradas en `RunServiceTests.mjs`.
- **Recuperación de CI:** la ejecución `45719860942` detectó una expectativa obsoleta en `AdminIncrementalInventory.mjs`; se actualizó el test para el contrato nuevo. La ejecución posterior `45719961761` terminó SUCCESS.
- **Siguientes pasos vigentes:** (1) ampliar pruebas deterministas del cursor/replay y de la persistencia de páginas; (2) cubrir fallos parciales y reanudación del scanner; (3) revisar contador/DOM y diff completo; (4) cerrar #130 y registros. La validación real Apps Script/Drive/Spreadsheet permanece diferida a Beta aislada y autorizada.


## Incidencia #130 — referencias de Drive, cursor y versión de auditoría (2026-11-25)
**Estado: EN PROGRESO.**

- **Completado:** captura y persistencia de ubicaciones de referencia por vehículo desde snapshot hasta metadatos del inventario. Se conserva hoja, fila, columna, campo, ID, categoría, marca y modelo. Se serializa solo el mapa de ubicaciones de `Cortes`.
- **Completado:** versión de servicio ADMIN fuente `2.7.2`. Los estados/cursor de versión anterior quedan rechazados para reanudación y operaciones finales; deben iniciar auditoría nueva.
- **Completado:** regresiones de snapshot, metadatos, cursor y páginas: ReferenceSnapshot 14/14; ReferenceLocations 6/6; CursorRecovery 23/23; MetadataPersistence 11/11.
- **Completado:** protecciones por errores del escaneo (ScanIntegrity 18/18), inventario incremental 35/35, historial de imágenes 64/64 y útiles 9/9.
- **CI confirmada:** run `45721749765`, commit `bdb201ab0c6c2c76264a7c083bd5625cc6a1172b`: 542 suites, 6,447 pruebas, 0 fallos; `service-tests` y `responsive-browser` SUCCESS.
- **Siguientes pasos:** (1) terminar revisión del diff completo; (2) verificar de forma integrada contador CATALOG, estado local, título recomendado/alternativo y botón DOM; (3) documentar y cerrar #130 tras revisión. Pruebas que requieran deployment Apps Script/Drive/Spreadsheet real siguen PENDIENTES DE DESPLIEGUE / VALIDACIÓN BETA. No desplegar sin autorización.


## Incidencia #130 — revisión final local (2026-11-25)
**Estado: IMPLEMENTACIÓN LOCAL Y CI COMPLETADAS; VALIDACIÓN BETA PENDIENTE.**

- Revisión del diff desde checkpoint anterior: solo se ampliaron dos archivos de pruebas (`AdminReplacedImagesIntegrity.mjs`, `UsefulButtonState.mjs)); sin cambios de producción adicionales en esa última revisión.
- `UsefulButtonState` 10/10: estado optimista, confirmación, índice físico/visual y DOM; el icono del botón útil permanece intacto.
- `AdminReplacedImagesIntegrity` 64/64: round-trip de snapshot que incluye ubicaciones de referencia serializadas.
- CI final `45722568761`: 542 suites, 6,448 pruebas, 0 fallos; `service-tests` y `responsive-browser` SUCCESS. Pages `45722568303` SUCCESS.
- No se despliegan servicios ni se ejecutan escrituras/lecturas reales en Drive o Spreadsheet sin autorización. Para cerrar #130 falta la validación Beta aislada de FEEDBACK/CATALOG y ADMIN/Drive/Spreadsheet, registrar evidencia y actualizar el issue. MIG-URL-008 sigue independiente y pendiente de autorización.


## Preparación runner de health Beta — 2026-11-25
- Hallazgos BETA-PLAN-F001..008 documentados en Hallazgos_Beta.md.
- Workflow de health limitado a push en GPSpedia2.2.5_work; gates Beta configurados; checker GET-only alineado a timeout 8 s y umbral SLOW 2 s.
- Pendiente confirmar Actions y ejecutar probe remoto antes de ampliar funcionalidad.


## Beta Health real — 2026-11-26
- Runs 45729426765 y 45729430374 SUCCESS; 6/6 endpoints disponibles por GET.
- ADMIN v2.7.1 deployment vs 2.7.2 fuente, SLOW 2.431/2.701s: seguimiento F009/F010.
- Próximo: contratos/feed read-only, revisión de rendimiento ADMIN, antes de pruebas mutables.


## Beta — Feed CATALOG read-only (2026-11-26)
- Run 45729926589 SUCCESS. Cursor 0/1 y cursor 5/1, contrato validado; sin escrituras. Latencias 2.374/2.381s; F011 seguimiento.
- Próximo: cursors/reset/retención/paginación y continuar matriz Beta.


### Validación Beta — seguimiento (2026-11-26)
- **ADMIN repeated latency probe:** implementado, integrado y probado SUCCESS. Mediana de 5 muestras 1622 ms; deployment v2.7.1 vs fuente 2.7.2, pendiente decisión de despliegue y comprobaciones funcionales antes de despliegue.
- **CATALOG feed read-only boundaries:** PASS (cursor tail/futuro/invalid/malformed y límites invalid).
- **Pendiente:** AUTH lectura/contrato y pruebas de sesión sintética con fixture aislado y cleanup verificable; ampliar WRITE/FEEDBACK según contrato.


## MIG-URL-008 — primera fase Beta GET-only (2026-11-26)
**Estado: EN PROGRESO.** La fase de health, feed CATALOG, boundaries, matriz y latencia ADMIN ya tiene evidencia real de Actions. El contrato health pasó 21/21; cinco servicios coinciden con la versión esperada y ADMIN permanece en 2.7.1 frente a 2.7.2. El job global mantiene FAIL sin ocultar la discrepancia. Las pruebas de feed, límites y matriz CATALOG pasaron; no hubo escrituras ni despliegues. Próximo: continuar pruebas independientes y preparar los flujos autenticados/mutables con datos sintéticos y limpieza verificable.


## MIG-URL-008 — CATALOG paginación secuencial Beta (2026-11-26)
**Estado: FASE GET-ONLY COMPLETADA; VALIDACIÓN BETA GLOBAL EN PROGRESO.** Run 45746282852: feed, boundaries, matriz y paginación secuencial PASS (5 páginas/5 eventos; cursor 0→5; sin cambios concurrentes). Health sigue FAIL por versión ADMIN 2.7.1 vs 2.7.2. CI 542 suites/6,452 pruebas y Playwright 264/264 PASS. Próximo: ampliar cobertura contractual local y preparar flujos autenticados/mutables con identidad sintética y limpieza verificable.


## MIG-URL-008 — contrato de diagnóstico AUTH (2026-11-26)
**Estado: HALLAZGO CONFIRMADO; CORRECCIÓN PENDIENTE.** El endpoint público AUTH incluye `sessionAuthority`, contrario al contrato de salud; test local y probe remoto lo reproducen. No se modificó servicio ni deployment. ADMIN mantiene v2.7.1 frente a 2.7.2. CATALOG feed/boundaries/matriz/paginación siguen PASS. Próximo: mantener pruebas no destructivas, registrar corrección de AUTH para una fase de implementación separada y continuar la cobertura local de los demás servicios.


## MIG-URL-008 — repetición de contrato y estado Beta (2026-11-26)
**Estado: VALIDACIÓN GET-ONLY COMPLETADA; DOS FALLOS PENDIENTES.** AUTH expone `sessionAuthority` (20/21 contrato local; confirmado por probe remoto) y ADMIN sigue en v2.7.1 frente a v2.7.2. CATALOG feed/boundaries/matriz/paginación PASS; FEEDBACK/CATALOG/WRITE/UTILITIES PASS. CI 542 suites, 6,450 pruebas PASS y 2 fallos de suite por la misma aserción AUTH; Playwright 264/264. Próximo: corrección AUTH y actualización ADMIN en fase autorizada separada; no ejecutar operaciones mutables sin identidad sintética y cleanup verificable.


## BETA-08 — Pages desplegado, smoke read-only (2026-11-26)
**Estado: SMOKE DE PÁGINA DESPLEGADA COMPLETADO.** Pages respondió HTTP 200; formulario login visible sin overflow en 1366x768, 390x844 y 320x800; 0 errores JS, 0 solicitudes no-GET, 0 llamadas Apps Script y ninguna credencial. AUG-146 264/264 PASS. No sustituye validación manual en dispositivo físico ni login real.


## BETA-01 — panel de recuperación, UI solamente (2026-11-26)
**Estado: INTERFAZ VALIDADA; FLUJO REAL PENDIENTE.** Pages smoke abre el panel, valida usuario/correo, confirma que el formulario de finalización permanece oculto y regresa al login. No envía solicitud, no crea código ni cambia contraseña. 0 llamadas Apps Script y 0 escrituras.


## MIG-URL-008 — mapa de cobertura BETA-01..08 (2026-11-26)
**Estado: COBERTURA LOCAL DOCUMENTADA; BETA REMOTA GET-ONLY COMPLETADA.** Se mapearon suites sintéticas por área en Tareas_Beta.md. Remote GET cubre health, CATALOG feed/boundaries/matriz/paginación y Pages login/recuperación UI sin backend. AUTH y ADMIN conservan hallazgos; mutaciones y pruebas OAuth/Drive permanecen NO EJECUTADAS por falta de mecanismo verificable de identidad y cleanup.


## BETA-08 — recuperación UI cuatro viewports (2026-11-26)
**Estado: INTERFAZ VALIDADA.** Login y recuperación UI PASS en 1366x768, 390x844, 360x800 y 320x700. No se envió solicitud ni se generó código; 0 llamadas Apps Script y 0 escrituras. El flujo real de recuperación sigue pendiente.


## BETA-08 — PWA offline (2026-11-26)
**Estado: FAIL CONFIRMADO; CORRECCIÓN PENDIENTE.** Service Worker activo, manifest/iconos válidos, pero 12 módulos estáticos importados no están en CORE_ASSETS; la recarga offline recupera HTML sin inicializar login. Sin escrituras ni llamadas Apps Script. Corregir precarga esencial en fase de implementación separada y repetir.


## BETA-F020 — precache PWA incompleto (2026-11-26)
**Estado: CAUSA CONFIRMADA; CORRECCIÓN PENDIENTE.** Todos los recursos listados existen y responden HTTP 200, pero 12 imports JS no están en CORE_ASSETS. El offline runtime falla al cargar 5 módulos (4 críticos de arranque/login). Añadir dependencias esenciales al precache y revisar CSS/CDN y thumbnail en tarea de implementación separada; luego repetir PWA offline.


## BETA-F020 — alcance cold/warm PWA (2026-11-26)
**Estado: FALLA DE PREPARACIÓN OFFLINE INICIAL; OFFLINE TEMPLADO PASS.** Una recarga online después de activar el SW cachea los 12 módulos; la siguiente navegación offline funciona. Pendiente precargar dependencias esenciales para que la primera sesión offline funcione sin recarga adicional. No se modificó código de aplicación.


## BETA-F020 — precarga PWA (2026-11-26)
**Estado: CORRECCIÓN LOCAL PUBLICADA; VALIDACIÓN BETA PENDIENTE.** Se agregaron 12 imports JS y `qrcode-generator.mjs` a CORE_ASSETS, con caché v77; el scanner recorre también .mjs. Cerrar únicamente cuando Actions valide instalación, inventario HTTP, login offline frío y regresión responsive. Recursos externos CDN/Drive no forman parte del precache core.


### BETA-F020 — corrección de harness (2026-11-26)
**Estado: AJUSTE LOCAL PUBLICADO; NUEVA CI PENDIENTE.** Run 45755284614 confirmó dos referencias de test obsoletas a v76, no defectos funcionales: PasswordRecovery y ServiceWorkerCache. Se actualizaron a una aserción de versión genérica y se añadieron checks de las 13 rutas. El run mantiene dos fallos AUTH independientes por sessionAuthority.


## BETA-F019 — privacidad del diagnóstico AUTH (2026-11-26)
**Estado: CORRECCIÓN DE FUENTE PUBLICADA; VALIDACIÓN LOCAL Y BETA PENDIENTES.** Retirado `sessionAuthority` de `JS/Services/Auth.js` y sincronizado fixture. No se desplegó Apps Script. Cerrar localmente tras ServiceHealthContract 21/21 y regresión; el endpoint remoto requiere deployment autorizado y repetición GET.


## Resultado local BETA-F019 / BETA-F020 (2026-11-26)
- **BETA-F019:** corrección fuente AUTH validada localmente; `ServiceHealthContract` 21/21. Estado **COMPLETADA CON VALIDACIÓN DIFERIDA**; endpoint remoto aún requiere deployment autorizado y GET de confirmación.
- **BETA-F020:** corrección de precarga validada por regresiones locales (`ServiceWorkerCache` 12/12; `PWAStartupScenarios` 16/16) y sintaxis; Pages build/deploy SUCCESS. Estado **COMPLETADA CON VALIDACIÓN DIFERIDA** para código local; offline frío en navegador real sigue pendiente.
- Run `45755702144`: 542 suites, 6,452 pruebas, 0 fallos. Responsive-browser sigue en `Install Chromium`; no se afirma resultado de navegador.
- **BETA-F021:** protección de `GPSpedia2.2.5` no confirmada: `protected=false`, sin rulesets visibles; requiere acción administrativa. La rama base no fue modificada.


## Cierre de BETA-F020 y validación local BETA-F019 (2026-11-26)
- **BETA-F020: COMPLETADA.** Run `45755902520`: 49/49 core + 4/4 opcionales HTTP 200, grafo .js/.mjs completo, login visible en offline frío y caliente, 0 pageErrors. AUG-146 264/264 y Pages smoke PASS.
- **BETA-F019: COMPLETADA CON VALIDACIÓN DIFERIDA.** Fuente AUTH y fixture corregidos; ServiceHealthContract 21/21 y regresión global PASS. El deployment remoto sigue pendiente de actualización/autorización y GET de confirmación.
- **BETA-F022: PENDIENTE / BAJA.** Font Awesome CDN y thumbnail Drive fallan offline; no impiden el arranque. Mantener separado de F020.
- **BETA-F021: PENDIENTE ADMINISTRATIVO.** Rama base `protected=false`, rulesets vacíos; necesita intervención del administrador del repositorio.


## MIG-URL-008 — disparo de health ante cambios de fuentes Apps Script (2026-11-26)
**Estado: IMPLEMENTACIÓN PUBLICADA; EJECUCIÓN REMOTA PENDIENTE.** `deployed-service-health.yml` ahora vigila los seis archivos fuente activos de Apps Script. El push dispara probes GET-only de los seis deployments y pruebas CATALOG independientes; no publica Apps Script ni escribe datos.


## MIG-URL-008 — diagnóstico y corrección del runner health (2026-11-26)
- **BETA-F023:** corregido el `if` duplicado del resumen shell; nueva ejecución pendiente.
- **BETA-F024:** UTILITIES respondió SLOW a 7,916 ms en una muestra; el runner ahora mide cinco muestras GET-only en ADMIN y UTILITIES, con timeout de 8 s por muestra.


## MIG-URL-008 — repetición health y latencia (2026-11-26)
- **BETA-F023: CERRADA.** El resumen shell ya ejecuta correctamente y devuelve FAIL por AUTH/ADMIN remotos, no por sintaxis.
- **BETA-F024: CERRADA COMO ANOMALÍA TRANSITORIA.** UTILITIES 5/5 GET entre 639 y 1,090 ms; mediana 778 ms. No se reprodujo el pico aislado de 7,916 ms.
- **ADMIN: SLOW CONFIRMADO.** 5 muestras; mediana 2,241 ms, máximo 5,022 ms, 3/5 >=2 s. Deployment 2.7.1 frente a fuente 2.7.2.
- Health remoto: AUTH FAIL por sessionAuthority; ADMIN FAIL por versión; CATALOG/FEEDBACK/UTILITIES/WRITE PASS. CATALOG feed, boundaries, matrix y pagination PASS.


## BETA-F022 — recurso iOS Drive sustituido por asset local (2026-11-26)
**Estado: CORRECCIÓN LOCAL PUBLICADA; VALIDACIÓN BROWSER PENDIENTE.** `index.html` ahora usa `Images/icon-v3-512x512.png` en el modal de instalación iOS. `OfflineBrandAssets.mjs` comprueba que no exista dependencia de Drive. La dependencia Font Awesome CDN sigue pendiente.


## Revisión normativa de Tareas_Beta §19 (2026-11-26)
**Estado: SUPERSEDIDA — NO EJECUTAR.** La tarea de configuración centralizada de endpoints contradice `NORMAS_DESAROLLO.md` §§17.1/18: las seis URLs deben residir únicamente en `API_ENDPOINTS` del frontend; no Spreadsheet, bootstrap remoto ni controles Developer para modificarlas. La validación de health y endpoints se mantiene por §25.

## BETA-F022 — resultado del fallback iOS (2026-11-26)
- `index.html` usa logo local; `OfflineBrandAssets` 5/5 PASS.
- Run `45757156335`: PWA offline frío/caliente PASS; login visible, 49 core + 4 opcionales HTTP 200, 0 módulos faltantes y 0 pageErrors. El recurso `/thumbnail` sigue fallando por referencia residual en `HTML/add_cortes.html`; Font Awesome CDN también falla offline. F022 sigue no bloqueante.


## 2026-11-26 — continuidad tras CI/browser actualizado
- Incidencia #130: implementación local y validaciones CI completas; estado **COMPLETADA CON VALIDACIÓN DIFERIDA**. Evidencia adicional en run `45811468299`: 542 suites/6,453 pruebas, 0 fallos; pruebas focales de útiles y auditoría ADMIN/Drive PASS. La validación real Beta FEEDBACK/CATALOG y ADMIN/Drive/Spreadsheet permanece separada y no se simula.
- Próxima prioridad Beta según orden del propietario: útiles FEEDBACK/CATALOG con identidad sintética y recursos aislados; después reproducción real de tutoriales. El primer caso no se ejecuta hasta tener identidad sintética, dataset aislado y cleanup comprobable; no se crean eventos de prueba sobre datos sin esos controles.
- TutorialVideoModalLayout 18/18 PASS en CI; reproducción real sigue pendiente.


## GP-UTIL-BUTTON-STATE-REVERT-03 — revisión de entrega de código mediante Service Worker (2026-11-26)

**Estado: CAMBIO EN RAMA; publicación/validación pendiente.**

- Nueva hipótesis/causa potencial: el Service Worker anterior usaba cache-first para documentos y recursos ejecutables. Una respuesta obsoleta podía ser entregada al navegador mientras la versión nueva se actualizaba en segundo plano, impidiendo que el usuario ejecutara de inmediato el código publicado.
- Cambio: `service-worker.js` actualizado a caché `gpsepedia-cache-v78` y estrategia network-first para documentos, scripts, estilos y fuentes del mismo origen; fallback a caché para continuidad offline. Recursos no ejecutables conservan cache-first.
- Commit: `d715e1693b8d340cd829608fabc628c79c223dbf`.
- Aún no se verificó Pages, ni la respuesta real FEEDBACK/CATALOG, ni un navegador físico. No se considera resuelta la incidencia.


## GP-UTIL-BUTTON-FEEDBACK-POLICY-DEPLOY-01 — rechazo de acciones en FEEDBACK (2026-11-26)

**Estado: CAUSA PROBABLE CONFIRMADA POR EVIDENCIA; DEPLOYMENT FEEDBACK PENDIENTE.**

- Consola del usuario: FEEDBACK rechaza tanto `getMyUsefulCuts` como `setCutUseful` con `Acción no declarada en la política de FEEDBACK`.
- Revisión del código en `GPSpedia2.2.5_work`: ambas acciones existen en `FEEDBACK_ACTION_PERMISSIONS`, con permiso de sesión `null`; están implementadas en el dispatcher `doPostInternal_` y en handlers; el frontend `ACTION_TO_SERVICE_MAP` las enruta a FEEDBACK.
- Diferencia entre source y endpoint desplegado: el error de producción indica que FEEDBACK está ejecutando una versión que no contiene esta política/dispatcher actualizados (o no es el deployment configurado). No reañadir entradas en frontend ni duplicar handlers.
- Solución necesaria: verificar el deployment Apps Script FEEDBACK realmente configurado y publicar la versión del archivo `JS/Services/feedback.js` de esta rama en ese deployment; después comprobar debug/version y llamadas reales de ambas acciones. No desplegar otros servicios ni alterar Spreadsheet.
- Restricción: no se efectuó deployment de Apps Script ni escritura de datos; esta interfaz no dispone de control autorizado de deployment Apps Script. La base protegida permanece intacta.

## GP-UTIL-FEEDBACK-STATE-AND-COUNTER-03 — estado por usuario/corte y contador físico (2026-11-26)

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.** El propietario confirmó que FEEDBACK ya registra útiles y persiste en Spreadsheet; el problema pendiente era la discrepancia del contador y la ausencia de un estado explícito por corte.

- **Causa:** \`FeedbackLikes\` utilizaba un ledger de eventos que generaba filas por interacción. La escritura no actualizaba las columnas físicas \`Cortes.utilCorte1\`, \`utilCorte2\` y \`utilCorte3\`; por ello CATALOG/dashboard podía mostrar cero aunque las reacciones estuvieran registradas.
- **Nuevo contrato:** una fila por \`actorKey + vehicleId + corteId\`, con \`corteId\` (\`corte1\`, \`corte2\` o \`corte3\`) y \`isUseful\`. El toggle actualiza la fila existente; una activación inicial crea la fila y retirar/repetir el útil modifica su estado, no agrega eventos duplicados.
- **Contador:** FEEDBACK cuenta los estados activos de los usuarios para el vehículo/corte y sincroniza el valor físico en la columna \`utilCorteN\` correspondiente. La escritura usa una sección crítica breve para conservar unicidad y evitar perder incrementos concurrentes; verifica el resultado y revierte la fila/celda si la sincronización falla.
- **Migración:** al encontrar el esquema anterior de siete columnas, FEEDBACK consolida los últimos estados por usuario/vehículo/corte, conserva una copia \`FeedbackLikes_Legacy_<timestamp>\` y actualiza las columnas físicas con los útiles activos. La migración se serializa; si detecta una operación antigua \`pending\`, se niega a migrar para no asumir su resultado. Un esquema desconocido también se rechaza sin sobrescribirlo.
- **CATALOG:** \`readFeedbackLikeEventCounts_\` ahora reconoce ambos formatos. Para el ledger nuevo usa el total de usuarios activos sin sumar dos veces el contador ya persistido en \`Cortes\`; mantiene la proyección compatible con los eventos anteriores mientras FEEDBACK no migra la hoja.
- **Actividad:** el registro secundario de actividad no convierte una escritura de útil ya confirmada en una respuesta API fallida si el log de actividad no puede escribirse.
- **Validación local ejecutada:** parsing de \`feedback.js\`, \`catalog.js\` y \`admin.js\` PASS; parsing de \`ui.js\` PASS retirando únicamente imports/exports para el parser aislado. Simulación de toggles con dos usuarios: 2 filas activas, repetir el clic no duplica ni suma, retirar y volver a marcar actualiza la misma fila y el contador físico termina en 2. Simulación de migración antigua: consolida por usuario/corte, mantiene la copia histórica y añade los útiles activos al valor base físico.
- **Pendiente Beta:** publicar la fuente FEEDBACK y CATALOG en los deployments autorizados y validar la migración sobre la hoja real, dos cuentas distintas, contador \`Cortes\` y dashboard después de recargar. No se ejecutó deployment ni se modificó Spreadsheet real en esta iteración.

## GP-ADMIN-DRIVE-LIBRARY-AUDIT-02 — biblioteca y persistencia de auditoría (2026-11-26)

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.**

- **Biblioteca:** \`openReplacedImagesModal()\` referenciaba \`showModal\` sin declararlo. Se añadió \`options = {}\` y la visibilidad predeterminada es abierta; el botón existente sigue llamando sin argumentos.
- **Auditoría Drive:** el almacenamiento cortaba el JSON por caracteres, pero verificaba tamaño en bytes UTF-8. Los caracteres multibyte podían superar el límite de 75,000 bytes por bloque y detener la auditoría antes de conservar resultados.
- **Corrección:** nueva segmentación por bytes UTF-8 (sin cortar pares sustitutos), manifiesto schema 3 y validación de tamaño por bloque. La lectura y renovación siguen aceptando manifests schema 2 y el formato legado sin versión; la renovación conserva el formato antiguo para no invalidar snapshots activos.
- **Validación local ejecutada:** parsing de \`admin.js\` y \`ui.js\` PASS. Simulación UTF-8 con acentos y emoji: round-trip exacto, sin pares sustitutos partidos y máximo 31 bytes en la prueba reducida. Simulación de snapshot de 189,078 bytes: tres bloques de 74,999 / 74,999 / 39,080 bytes y reconstrucción exacta. Renovación y lectura PASS para schema 3, schema 2 y manifiesto legado.
- **Pendiente Beta:** validar desde el navegador la apertura de la biblioteca y ejecutar una auditoría Drive completa/continuada en el deployment ADMIN autorizado. No se llamó Drive/Apps Script remoto ni se modificaron archivos externos.

**Commits de código:** \`4463324416ee1d3c35b5c26c45ceb3f4785034f3\`, \`223cf468a3a0abe2284a2b20ea93a9a7c9043686\`, \`35641402b8f31b4659050a45688b6ae5937f6671\`, \`9099f4fb4f88c4630d5a5825e6567e52da1c30d0\`, \`a0dbfa587d0efa1241d1787a640926f4d9b4b38c\` (más correcciones locales de validación de identidad y actividad en FEEDBACK).


## GP-ADMIN-DRIVE-UNUSED-IMAGES-02 — Auditoría e inventario individual/biblioteca unificada

**Estado: requisitos registrados; auditoría de fuente en curso.**

- Detectar imágenes sin uso en carpeta Cortes, individualmente; capturar ID, nombre, tamaño, MIME/formato, ruta/directorio, URL pública y asociación de vehículo.
- Relacionar por nombre y árbol de carpetas estructurado (marca/modelo/versión/tipo de encendido/rango de años); mostrar grado de confianza o ausencia de coincidencia.
- Referencias de uso limitadas a hojas de catálogo (Cortes, Tutoriales, Diagramas de Relay, Problemas y soluciones); excluir hojas de eventos, registro, reacciones/Feedback y demás hojas operativas.
- Persistir automáticamente cada imagen en su fila independiente en el inventario compartido de imágenes reemplazadas, con idempotencia, escritura verificada, reintentos y estados por imagen; no usar caché local como autoridad.
- Mostrar miniaturas, metadatos, relación y estado de registro durante la auditoría.
- Unificar en biblioteca imágenes reemplazadas e imágenes sin uso: grid/lista y acciones recupera, mueve y elimina con confirmación y validación backend.
- Plan y requisitos registrados en PLAN_AUDITORIA_BIBLIOTECA_IMAGENES_SIN_USO.md; hallazgos iniciales registrados en Auditoria.txt. Revisión de código y normativa aún incompleta; no se realizan mutaciones de Drive/Sheets ni despliegues.


## GP-ADMIN-DRIVE-UNUSED-IMAGES-02 — auditoría incremental y biblioteca de imágenes
**Estado: requisitos ampliados; auditoría normativa y técnica en curso.**
- Auditoría individual e incremental de imágenes sin uso en Cortes; registro idempotente y verificado por archivo en el inventario compartido con imágenes reemplazadas.
- UI de auditoría integrada en la sección actual: «Auditar cortes» transforma el contenido en explorador tipo Google Drive, sin abrir otro modal.
- Consola siempre accesible y no bloqueada; todos los mensajes de avance/alerta/diagnóstico se muestran allí. Distribución objetivo: consola ~50 % del ancho del modal y explorador ~50 %, adaptable a escritorio y móvil.
- Resultados progresivos con miniatura, metadatos, estado individual y vehículo relacionado; biblioteca unificada en grid/lista.
- Mantener exclusión de hojas operativas/eventos/reacciones y alcance de hojas de catálogo por verificar contra normativa y código. Sin cambios de permisos/RBAC/auth ni operaciones remotas mutables/deployment sin autorización.

## GP-ADMIN-TAB-ACTIONS-UX-01 — organización de botones internos de pestañas
**Estado: requisitos registrados; implementación pendiente.**
- Alcance: botones de acción dentro del contenido de las pestañas del panel desarrollador; excluir expresamente la barra de botones de navegación entre pestañas.
- Reorganizar con iconografía consistente, diseño elegante y responsive para escritorio/móvil.
- Botones compactos inicialmente con icono; al seleccionar uno, expandirlo para mostrar su etiqueta. Conservar handlers, accesibilidad y estados de acción.
- Validar que la consola y la vista de biblioteca/auditoría conserven espacio y usabilidad.


### Hallazgo funcional confirmado — validación del inventario incremental
- El backend guarda inicialmente los IDs sin uso como array, pero después `storeDriveAuditSeenPage_` sustituye esa misma clave de caché por un objeto combinado `{unused, files, folders, metadata}`.
- `validateDriveAuditInventoryBatch_` seguía interpretando la página como array. Por tanto, el registro incremental y los reintentos individuales rechazaban el objeto combinado con «La lista de imágenes de auditoría no es válida», aunque el escaneo hubiera guardado correctamente la página.
- Corrección aplicada en `JS/Services/admin.js` (commit `e61e82f4258e96f81c1b2e23693d27f2b96fb536`): el validador extrae `unused` del objeto combinado, comprueba la estructura de la página y conserva compatibilidad con arrays legados.
- Pruebas aisladas del validador: página combinada aceptada; ID no emitido rechazado; objeto sin estructura completa rechazado; array legado aceptado.
- **Estado de la tarea:** corrección puntual implementada; auditoría integral del flujo y pruebas de integración ADMIN/Drive/Spreadsheet aún pendientes. No se declara completada la tarea.


### Avance de implementación — registro incremental por lotes (2026-11-26)
- Se comprobó que el guardado inicial todavía enviaba todas las imágenes sin uso en una única llamada no incremental, pese a que ADMIN ya admitía `incremental: true` y la UI solo utilizaba esa modalidad para reintentos individuales.
- Se modificó `JS/Frontend/ui.js`: el registro inicial ahora procesa lotes de hasta 20 imágenes, exige una respuesta única y válida por cada ID del lote, actualiza cada tarjeta al recibir confirmación, persiste el avance local tras cada lote y continúa con los lotes restantes cuando uno falla.
- Solo cuando todos los archivos tienen estado `confirmado` se ejecuta la consolidación final no incremental. Si queda algún error/bloqueo, no se habilita la organización y se conservan las tarjetas para reintento individual. La consolidación también valida IDs, estados y conteos del servidor.
- Se endureció la validación del frontend: un archivo sin ID Drive válido ya no se descarta silenciosamente; detiene el registro y muestra error en su tarjeta.
- Pruebas aisladas del flujo frontend con mocks: 21 imágenes => dos lotes incrementales (20 + 1) y una consolidación final, 21 tarjetas confirmadas; escenario parcial => 20 confirmadas y una con error, sin consolidación; sintaxis del bloque modificada PASS.
- Commit de implementación: `dad3fe7c2c886ef9fb65dbf56f58abbaccdd1954` (el primer commit de la modificación fue `7bb822207e7217b019cc638589f221aabdb0f118`; luego se endureció la validación de IDs).
- **Estado:** registro incremental inicial implementado y probado con harness aislado. La tarea global sigue abierta para auditoría de acciones de biblioteca, asociaciones, persistencia integrada y revisión visual/responsive. No se ejecutaron Apps Script desplegados, Drive ni Spreadsheet reales; esa validación queda para Beta.


### Avance de implementación — validación del reintento y consolidación (2026-11-26)
- Se detectó que la consolidación posterior a un reintento individual validaba que existieran resultados para los IDs solicitados, pero ignoraba resultados extra distintos de `no_confirmada` y no contrastaba los conteos del resumen ADMIN.
- Se reforzó `retrySingleInventory`: rechaza IDs/resultados duplicados o inválidos, permite resultados adicionales únicamente cuando representan registros históricos `no_confirmada`, exige confirmación de todos los archivos solicitados, comprueba `partial` y compara los conteos del servidor con los resultados individuales.
- Harness aislado: reintento que devuelve todas las confirmaciones y conteos coherentes => inventario `saved`; respuesta con conteo de servidor inconsistente => no habilita organización y conserva estado parcial. Ambos casos se probaron con mocks.
- Commit: `52a3d7143f9810e68f9be5e9c495270c0c35068a`.
- La tarea principal sigue abierta; la validación de acciones de biblioteca y pruebas integradas continúan pendientes.


### GP-ADMIN-TAB-ACTIONS-UX-01 — cierre de implementación
**Estado: implementación completada; revisión visual final reservada para Beta.**
- La revisión del HTML confirmó que los botones de acción normales de las cuatro pestañas Developer usan `dev-panel-action`, con icono, etiqueta accesible y texto expandible al recibir foco/selección. Los controles especializados del explorador de auditoría y selectores de vista conservan sus estilos/funciones propios y no se convierten en botones genéricos.
- El CSS existente establece formato compacto de 42 px, expande la etiqueta al enfocar y adapta tamaño/espaciado en móvil. No se alteró la barra de navegación entre pestañas.
- No se requiere otra implementación local para esta tarea. La comprobación visual real en navegador se realizará en Beta.

### Avance de biblioteca — confirmación de restauración masiva mixta (2026-11-26)
- Se encontró que una selección masiva mixta (archivos en papelera y reemplazos históricos) ejecutaba correctamente la acción correspondiente a cada registro, pero mostraba una confirmación incorrecta que describía todos los elementos como restauraciones históricas.
- Se corrigió el mensaje: ahora separa cantidades de archivos que regresan desde papelera (sin reasociación automática) y de imágenes históricas que se restauran a sus campos; se ajustó singular/plural.
- Harness aislado: selección mixta de un archivo en papelera y una imagen histórica => se muestran ambas cantidades y se envían las acciones `restoreReplacedImageFromTrash` y `recoverReplacedImage` respectivamente.
- Commits: handler `616d6bb5f5662d0a6e79a5ce5f122758301b109b`; corrección singular/plural `271276a077f2ad81adf00a66b4a8ffa28dd05d99`.
- La auditoría integral de la biblioteca continúa abierta.


### Biblioteca — restauración masiva mixta habilitada y probada (2026-11-26)
- La barra de selección solo mostraba «Restaurar» cuando todos los elementos eran de papelera o todos eran imágenes históricas. Se amplió la condición para permitir una selección mixta siempre que cada elemento tenga una de esas dos capacidades seguras.
- La confirmación ya diferencia los dos grupos y el handler despacha cada registro a su acción correspondiente. No se habilita para registros que no puedan restaurarse por ninguna de las dos vías.
- Harness aislado de capacidades + toolbar: mezcla de un archivo en papelera y una imagen histórica => acción masiva visible; mover y enviar a papelera permanecen ocultos para la mezcla. PASS.
- Commit: `78d91c41e45f6fe673395849e947a5572ff1f8b4`.


### Biblioteca — serialización de escrituras compartidas (2026-11-26)
- Se confirmó que el endpoint `saveUnusedImagesInventory` usaba `withAdminLocalOperationGuard_` con clave `drive-inventory:<auditId>`. La guarda protege solicitudes de una misma auditoría, pero dos auditorías distintas podían reservarse en paralelo aunque escriben en la misma hoja `Imagenes_Reemplazadas`.
- Se cambió la clave a `drive-inventory:shared-inventory-sheet`, compartida por registro incremental, consolidación y organización. Así las operaciones de inventario/organización no pueden ejecutar callbacks simultáneos sobre la misma hoja, incluso si sus auditId difieren. Se corrigió el comentario que atribuía esa protección a ScriptLock.
- Harness aislado de `withAdminLocalOperationGuard_`: una segunda ejecución con la misma clave se bloquea; un alcance distinto se permite. La ruta del endpoint usa la clave compartida. PASS.
- Commit: `f64cb5346c5fb28886db0e19485f893ceb755961`.
- Nota: esta guarda serializa operaciones que pasan por `saveUnusedImagesInventory`; no reemplaza los ScriptLock propios de las demás acciones de administración. La auditoría de concurrencia entre endpoints distintos queda pendiente de una prueba integral.


### Auditoría de alcance y asociación — pruebas aisladas completadas (2026-11-26)
- Se comprobó el allowlist de `collectCatalogImageReferences()`: solo recorre `Cortes`, `Tutorial`, `Relay` y `pys`; los nombres físicos proceden de `SHEET_NAMES`. Las tres hojas opcionales usan contratos de columna: `Tutorial` columna 3 encabezado `Imagen`; `Relay` columna 10 encabezado `imagen`; `pys` columna 7 encabezado `Imagen`. En `Cortes` se validan las ocho columnas de imagen configuradas. Las imágenes sobre la cuadrícula de esas hojas también se consideran referencias de catálogo. Harness con mocks confirmó que el escáner solo solicita esas cuatro hojas.
- Se probaron fixtures de asociación: coincidencia única con versión/encendido/año => vehículo correcto; conflicto contextual => ambiguo; dos vehículos del mismo modelo sin contexto suficiente => ambiguo; archivo ya referenciado => omitido. PASS.
- Se revisaron estáticamente las salvaguardas backend de recuperar, enviar a papelera, mover, restaurar desde papelera y eliminación definitiva; se verificaron controles de tipo/estado, MIME, árbol Cortes, referencias, unicidad y compensaciones. Matriz de capacidades frontend: siete casos PASS.
- La tarea continúa abierta para pruebas integradas, validación de hojas reales, auditoría de concurrencia entre endpoints distintos y revisión visual del explorador.


### Auditoría visual — asociación de vehículo durante el escaneo (2026-11-26)
- Se comprobó que el algoritmo de asociación solo se ejecutaba al guardar el inventario. Las tarjetas aparecían durante el escaneo sin sugerencia de vehículo, incumpliendo el requisito de mostrar la relación mientras avanza la auditoría.
- ADMIN ahora calcula sugerencias para las imágenes clasificadas `Sin uso detectado` en cada lote, leyendo solo las primeras ocho columnas de `Cortes` (ID, categoría, marca, modelo, versiones, años y encendido). Usa el mismo algoritmo y alias del inventario; respeta IDs activos e históricos y devuelve estado `suggested`, `ambiguous`, `sin_coincidencia` o `no_verificada` con candidatos/criterios.
- La UI muestra la sugerencia desde la primera aparición de la tarjeta y distingue explícitamente asociación no verificada de ausencia de coincidencia. La consola informa conteos de sugeridas, ambiguas, sin coincidencia y no verificadas por lote.
- Pruebas aisladas: fixture Toyota Hilux 2.8/Botón/2021 => VH-02, confianza alta y señales de modelo/marca/versión/encendido/año; sin coincidencia => estado sin_coincidencia; error de lectura => no_verificada con mensaje; resumen de consola reporta conteos y alerta; bloques frontend/backend compilan. PASS.
- Commits: backend `75170cd6db7b4bcc00ab98689f04837b9efa5945`, corrección de mapa `091a939902132e11383cb9f9b16ec1c93d197c3a`, UI `bdd9273caee75cea60b65b081a6a0e0302ed9b9b`, resumen consola `eec4cd899179b7dc2ba24d97817e42a9a78e9635`.
- Tarea sigue abierta para pruebas integradas y verificación visual; no se ejecutaron hojas reales ni Apps Script desplegado.


### Asociación visual — confianza y criterios de coincidencia (2026-11-26)
- Se amplió el texto de asociación en las tarjetas para mostrar nivel de confianza (alta/media/baja) y criterios que sustentan la coincidencia (modelo en carpeta/nombre, alias, marca, categoría, versión, encendido y rango de años), además de vehículo, versión, encendido y años aplicables.
- La misma presentación se conserva al recibir la respuesta de persistencia y al cargar la tarjeta desde el resultado inicial.
- Prueba aislada de render: sugerencia Toyota Hilux => muestra confianza alta, señales de carpeta/marca/versión/encendido/años y vehículo VH-02; bloques de UI compilan. PASS.
- Commit: `8d63c5943f18fa2e6b36003ef8b829846d9a3bf2`.


### Biblioteca — guarda compartida aplicada a todas las mutaciones (2026-11-26)
- Se amplió la serialización global más allá del registro de inventario. Las rutas de aplicar/revertir organizador, aplicar conciliación, migrar esquema, resolver aportes, recuperar, papelera, restaurar, eliminar definitivamente, marcar en uso y mover ahora usan `withSharedReplacedImagesInventoryGuard_` con el mismo alcance compartido.
- La sincronización de candidatos que ocurre al consultar la biblioteca también se ejecuta dentro de esa guarda; si está ocupada, el GET conserva la lectura y devuelve el error de sincronización como advertencia, sin escribir en paralelo.
- Verificación estática: 12 rutas mutables comparten la guarda; sincronización de candidatos también protegida; `admin.js` compila. PASS.
- Commit: `d778cc086e603307a1567bf3a933983e258cae89`.
- La coordinación concurrente real entre solicitudes sigue sin probarse en Apps Script; la implementación local y el harness de exclusión están verificados.


## GP-FORM-DROPDOWNS-01 — Reparar y auditar catálogos de formularios (2026-11-26)
- [x] Auditar `HTML/add_cortes.html` frente al flujo de `add_cortes.html` en la rama base.
- [x] Auditar lectura de catálogos en CATALOG: categoría, marca, tipo de corte, encendido y configuración de relay.
- [x] Corregir `handleGetDropdownData` para leer categorías directamente desde la columna Categoría de `Cortes` y mantener lectura de los demás valores de la hoja; permitir fallback a las configuraciones de relay almacenadas en `Cortes` si Relay está ausente/vacía.
- [x] Eliminar caché local de catálogos del formulario de alta, validar el contrato de respuesta y limpiar selectores/avisar en error.
- [ ] Validar el servicio desplegado y la carga de valores en Beta (requiere acceso al deployment/entorno real).
- [ ] Confirmar lectura de la Spreadsheet en ejecución y verificar todos los demás formularios tras la validación Beta.
- Alcance de auditoría: `HTML/add_cortes.html`, `HTML/users.html`, `index.html`, `JS/Frontend/api-config.js`, `JS/Services/catalog.js`. No se encontraron otros formularios HTML activos que soliciten catálogos mediante `getDropdownData`; users.html e index.html usan otros flujos, revisados estáticamente sin evidencia de fallo de listas en este incidente.
- Cambios: commits `71c7ba9f2c0022eee91772f1e450b5b3d0c8f250` y `c16f4f24ff01d6513e5814d723dadee3cdf1f413`.
- Pendiente de deployment real: no se declara éxito funcional en producción/Beta sin respuesta comprobada del servicio Apps Script.


## GP-FORM-DROPDOWNS-02 — Corrección integral de catálogos y formularios (2026-11-26)

- [x] Reabrir la incidencia tras confirmarse que el formulario sigue sin cargar opciones.
- [x] Ampliar la auditoría a `JS/Frontend/ui.js`: editor in-modal, sugerencia de cambio y modal `+`; conservar `HTML/add_cortes.html` como formulario de alta independiente.
- [x] Registrar hallazgos en `Auditoria.txt` antes de la implementación y crear respaldos exactos de los tres archivos de código modificados.
- [x] Unificar en CATALOG los cuatro catálogos requeridos exclusivamente desde la hoja `Cortes`: Categoría, Tipo de encendido, Tipo de corte (columnas 1/2/3) y Configuración de relay (columnas 1/2/3). La hoja `Relay` ya no es la fuente de las listas de configuración del formulario.
- [x] Invalidar respuestas incompletas/antiguas; validar los cuatro arrays, metadatos de fuente `Cortes` y versión CATALOG `2.4.1`; usar caché temporal de cinco minutos solo después de validar completamente la respuesta.
- [x] Eliminar las listas manuales de respaldo del modal de sugerencias; cargar sus tipos de corte y configuraciones relay desde el mismo catálogo oficial y bloquear el envío si no están disponibles.
- [x] Corregir el editor in-modal: las opciones editables proceden únicamente del catálogo oficial; un valor histórico no presente en Cortes se conserva visible como opción deshabilitada, sin convertirse en una opción de catálogo.
- [x] Endurecer `HTML/add_cortes.html`: validar los cuatro catálogos, vaciar/bloquear selectores cuando la respuesta falle y crear opciones con nodos DOM/`textContent`.
- [x] Harness de CATALOG con Spreadsheet simulada: confirma lectura exclusiva de `Cortes`, mapeo de las nueve columnas relevantes, deduplicación, recorte de espacios, orden y metadatos. PASS.
- [x] Harness de frontend: caché válida y TTL, rechazo de versión antigua, rechazo de listas vacías, normalizadores de modal + y alta independiente, preservación de valor anterior y bloqueo del valor legado, render seguro con `textContent`, caso `No recomendado`. PASS.
- [x] Revisión de diferencias de código contra los respaldos y commits: los cambios quedan limitados a la carga/validación/render de catálogos y al manejo de error del editor; no se modificaron la persistencia de cortes, restauración de operaciones pendientes, rutas de sugerencias ni lógica de adjuntos.
- [ ] Publicar CATALOG Apps Script con versión `2.4.1` y asegurar que el deployment activo incorpore el adaptador POST iframe/`postMessage`. El checkpoint documenta que no se publicó Apps Script tras esa migración; el health GET histórico no valida POST. No se ejecutó deployment en esta sesión.
- [ ] Ejecutar una lectura POST real `getDropdownData` y comprobar los valores reales de la Spreadsheet, seguido de verificación en navegador/Beta de los cuatro flujos. Sin acceso de deployment ni ejecución de Apps Script/Spreadsheet desde esta sesión no se declara resuelto el entorno publicado.
- Alcance no aplicable: Tutoriales y Problemas/Soluciones no consumen los cuatro catálogos de corte mediante `getDropdownData`; mantienen sus campos/catálogos propios y no se cambiaron en esta tarea.
- Archivos de código: `JS/Services/catalog.js`, `JS/Frontend/ui.js`, `HTML/add_cortes.html`.
- Commits de código: `3525c772c8bd51db235aba89b72a85a3ce17c0db`, `d45580124aa1834851665f235e14f4ea5a000f57`, `e500d6f670dc57d58607f73c56f4dd6a679af530`, `631d7e66eec4802220c2debd048016a35c1247b7`, `4bc6e6d4a1b9bb3d55fd4e1cfb3eeeb7cf460abf`.
- Respaldos exactos comparados contra los cambios y retirados después del Code Review: commits de limpieza `9e573ad542ebdb4c1ec47f20d9257d1184ad2632`, `3f5d95123f7e1dc06921a9fa4cf7d4ebc7523a36`, `3f3f967d785d7406fcac92a51fe9101d6a1ef55b`.


### GP-FORM-DROPDOWNS-02 — verificación de no regresión del diagrama Relay
- [x] Confirmar que `Relay` sigue leyéndose en `handleGetCatalogData()` y que se devuelve `allData.relay` con su campo `imagen`.
- [x] Confirmar que el enlace de configuración en el detalle resuelve `datosRelay` por nombre y abre `renderRelayInfoModal()`.
- [x] Confirmar que el modal conserva `relayInfo.imagen` y el lightbox `window.abrirLightbox()`. Harness estático 9/9 PASS.
- [x] No se eliminó ni cambió el flujo del diagrama Relay; se cambió únicamente la fuente de opciones del dropdown a la hoja Cortes.


## GP-FORM-DROPDOWNS-03 — Corregir bloqueo del formulario independiente (2026-11-26)

- [x] Auditar HTML/add_cortes.html, los imports, el inicializador, la carga de catálogos, index.html, api-config.js, ui.js y service-worker.js.
- [x] Confirmar si el traslado a HTML/ rompió rutas: el menú, el Service Worker y las rutas relativas actuales están adaptados a la ubicación y los módulos importados existen.
- [x] Registrar el hallazgo en Auditoria.txt y crear respaldo exacto previo a la edición.
- [x] Eliminar el import duplicado de los tres bindings de offline.js que bloqueaba el análisis del módulo ES antes de init().
- [x] Añadir diagnosticLogger.js a CORE_ASSETS y subir la caché PWA a v79.
- [x] Comparar ambos archivos modificados contra los respaldos: únicamente se retiró una línea duplicada y se aplicaron los dos cambios planificados del Service Worker.
- [x] Validación estática: imports únicos; rutas resueltas; navegación al formulario; listener, init(), populateAllDropdowns(), getDropdownData, renderizado y ruta de error preservados; modal + y ruteo CATALOG sin cambios.
- [ ] Validar el formulario en navegador después de actualizar/publicar la rama y confirmar los cuatro selectores con respuesta real de CATALOG.
- [ ] Validar primera apertura offline de add_cortes.html con la caché PWA v79 instalada.
- Commits de código: 61fa107909fa0f7b511550771c79bafe6e56cae3 (HTML/add_cortes.html), 98decb8834feb272d93cf8f5370c7e278806cae3 (service-worker.js).
- Limitación: no se realizó deployment, prueba Beta, ejecución de navegador ni POST real de Apps Script en esta sesión. La publicación CATALOG 2.4.1 y su comprobación POST read-only permanecen abiertas en GP-FORM-DROPDOWNS-02.
- La rama base protegida GPSpedia2.2.5 permanece sin cambios.

## GP-ADD-CORTES-UX-01 — Imágenes de coincidencias y distribución móvil (2026-11-26)

- [x] Auditar `HTML/add_cortes.html`, `JS/Services/write.js`, `JS/Frontend/ui.js`, `JS/Frontend/rich-text.js`, CSS local/global, navegación y envío de etapas 2/3.
- [x] Registrar los hallazgos antes de editar y crear respaldo exacto de `HTML/add_cortes.html`.
- [x] Corregir la conversión local de imágenes para IDs y enlaces Drive `?id=`, `/file/d/ID/view`, `/d/ID`; conservar URL externa y fuentes blob/data válidas; mostrar fallback SVG local para valores inválidos.
- [x] Aplicar la conversión a imágenes del vehículo y de los cortes existentes en coincidencias, con carga diferida y fallback al fallar.
- [x] Añadir estilos locales para toolbar y editor visual, ya que la página independiente no carga `style.css`; ancho completo, borde, relleno y espacio editable suficiente en escritorio/móvil.
- [x] Corregir la apertura de acordeones de etapa 3 para preservar CSS Grid; asegurar ancho de controles y campo de color del cable en etapa 2.
- [x] Ejecutar 10 casos estáticos de conversión de imágenes; revisar sincronización editor/textarea y lecturas del guardado; comprobar campos de color, acordeones, catálogos, `No recomendado` y operaciones pendientes.
- [x] Comparar el archivo final contra el respaldo exacto; Code Review estático PASS. Retirar respaldo temporal.
- [ ] Verificar visualmente en navegador móvil/escritorio tras publicar la rama y comprobar que imágenes reales de Drive se abren con los permisos de usuario previstos.
- Archivos de código: `HTML/add_cortes.html` únicamente.
- Commits: `6671241ebd2c75044280cf8a41d847377fdcac7f`, `aca1182f734d282f224d5e8a989e8979ececd773`.
- Límite: no se realizó una sesión Beta/navegador en esta ejecución; la validación visual real permanece pendiente.

## GP-WRITE-CUT-CATALOG-01 — Alinear validación de alta de cortes con CATALOG (2026-11-26)

- [x] Auditar el envío de etapa 2 en `HTML/add_cortes.html`, ruteo de `JS/Frontend/api-config.js`, validación de `JS/Services/write.js` y allowlist de `JS/Frontend/diagnosticLogger.js`.
- [x] Registrar los hallazgos en `Auditoria.txt` antes de editar y crear respaldos exactos de los archivos afectados.
- [x] Alinear las cuatro listas de validación de WRITE con CATALOG: Cortes col. 2 (categoría), col. 8 (encendido), cols. 12/19/26 (tipo de corte) y cols. 15/22/29 (configuración Relay).
- [x] Retirar la dependencia obligatoria de la hoja Relay de la validación de alta, sin alterar su uso como fuente de diagramas/detalles en CATALOG.
- [x] Mejorar el diagnóstico de submit para registrar el código normalizado de error del servicio/ruteador, conservando la política allowlist-only y sin registrar payloads, mensajes libres, tokens, VIN ni imágenes.
- [x] Harness estático/fixture: unión de los tres slots, categorías, encendido, tipos de corte y configuraciones Relay; comparación de contrato con CATALOG. PASS.
- [x] Comparación de los tres archivos contra respaldos exactos: únicamente los bloques auditados fueron modificados. PASS.
- [x] Code Review estático: cambios limitados a listas oficiales de WRITE y observabilidad segura; persistencia, actor, VIN, fingerprint, ID, ledger, lock/rollback, Drive, idempotencia y recuperación permanecen sin cambios.
- [ ] Validar en entorno desplegado con una identidad y datos de prueba autorizados: alta de vehículo nuevo y aporte a vehículo existente; comprobar resultado en Cortes/AportesVehiculo, Idempotencia y Drive según corresponda.
- [ ] Confirmar en consola que `cut-operation.submit-failed` muestra códigos de WRITE/API permitidos si se produce un rechazo.
- Límite: no se ejecutó Apps Script, Spreadsheet, Drive, navegador ni una alta real desde esta sesión; deployment y Beta siguen pendientes.
- Archivos: `JS/Services/write.js`, `JS/Frontend/diagnosticLogger.js`, `HTML/add_cortes.html`.
- Commits: `ad84cb3e95ba48528c9c9ba729aecfafc3f46b69`, `2b6924142eef4a38b713b3321fcd813740df506f`, `eeecec8ad5a3f28d0ffdff2dc4b798da13c41b31`, `035041b445c5f6a785d19705aec3b254c9359bde`, `bc5a9313d09726b9926dc844f8dd42d81cab982f`.

- [x] Refinar diagnóstico: registrar `error.code` o, en su ausencia, solo identificadores técnicos estáticos del mensaje; el logger filtra contra allowlist. Los mensajes libres y payloads siguen excluidos.


## GP-CUT-PENDING-SNAPSHOT-01 — Diagnóstico de snapshot local antes del alta (2026-11-26)

- [x] Auditar `HTML/add_cortes.html`, `JS/Frontend/offline.js`, `JS/Frontend/diagnosticLogger.js` y la caché PWA antes de modificar.
- [x] Registrar el hallazgo en `Auditoria.txt` y crear respaldos exactos de los archivos afectados antes de editar.
- [x] Reemplazar la comparación JSON dependiente del orden de propiedades por una serialización estructural determinista en la verificación del snapshot IndexedDB.
- [x] Propagar motivos de fallo locales como códigos estáticos seguros: snapshot inválido/conflictivo, verificación discrepante, cuota, DataCloneError y disponibilidad/escritura IndexedDB.
- [x] Mantener la barrera de seguridad: no llamar a `checkOperation` ni a `addOrUpdateCut` si el snapshot durable no se confirma; no sobrescribir operaciones pendientes con otro ID/hash.
- [x] Ampliar allowlist de diagnóstico sin registrar mensajes libres, payloads, tokens, VIN ni imágenes.
- [x] Incrementar caché PWA a v80 para actualizar el módulo de persistencia.
- [x] Code Review estático: diffs comparados con respaldos; fixture de serialización estable 2/2 PASS.
- [ ] Confirmar en navegador el código específico devuelto por IndexedDB y completar una alta controlada; verificar Cortes/AportesVehiculo, Idempotencia y Drive cuando corresponda.
- [ ] Ejecutar pruebas de recuperación/reintento y confirmar ausencia de duplicados tras interrupción.
- Archivos: `JS/Frontend/offline.js`, `HTML/add_cortes.html`, `JS/Frontend/diagnosticLogger.js`, `service-worker.js`.
- Commits de código: `f4b2590cd73ae3198f9ac14e8c669379352dd967`, `a9f6cef04314a87c3799bb7557ac0e069fe5916f`, `2bf8d785ae6d27bb83e0ec86347d3fc85f89354c`, `6370c9e5586305529c1772fa097e65327476c5b5`.
- Límite: no se ejecutó navegador/IndexedDB real ni Apps Script, Spreadsheet o Drive. La causa runtime concreta y el registro real siguen pendientes de Beta.

- Cierre de Code Review y respaldos: se reconstruyó el archivo original de `offline.js` aplicando inversamente los cambios previstos y coincidió exactamente con el respaldo; HTML, logger y Service Worker también coincidieron exactamente al revertir sus cambios autorizados. Respaldos temporales eliminados después de esta revisión (commits `12eb7a82109a4a1dfdf5eeaf959f16430d7f61bd`, `93b760c7ed9aed051591874d6c75de40edd5fbea`, `608db06ca73665186578225d1cce61640f43655a`, `8e4b9e0d47a4a6d9c02ac1f3c8b95e6ff79e484d`).


## GP-CUT-FORM-SNAPSHOT-02 — Normalización y diagnóstico de alta desde add_cortes.html (2026-11-26)

- [x] Auditar el flujo de etapa 2, la persistencia durable, el modal de detalle y sus diferencias de contrato antes de editar.
- [x] Registrar hallazgos en `Auditoria.txt` antes de modificar código.
- [x] Crear respaldos exactos previos en `Olds/Backups/GP-CUT-FORM-SNAPSHOT-02-20261126/` para los archivos de código y registros afectados.
- [x] Normalizar `selectedVehicleId` una sola vez para que null, undefined y cadena vacía produzcan un payload coherente de vehículo nuevo, evitando el rechazo local por discrepancia entre `vehicleId` y `vehicleData`.
- [x] Mostrar mensajes útiles en el formulario cuando falle la persistencia, sin eliminar ni sobrescribir operaciones pendientes.
- [x] Incrementar la caché PWA a v81.
- [x] Fixture estático de normalización/validador: 7/7 PASS.
- [x] Comparación post-edición con respaldos: cambios limitados a los bloques auditados.
- [ ] Ejecutar el formulario actualizado en navegador móvil y confirmar que IndexedDB persiste y verifica el snapshot.
- [ ] Ejecutar alta controlada para vehículo nuevo y para vehículo existente; verificar resultado en catálogo/Sheets, ledger de idempotencia y Drive cuando corresponda.
- [ ] Probar recuperación después de interrupción y confirmar ausencia de duplicados.
- Archivos: `HTML/add_cortes.html`, `service-worker.js`; no se modificó el modal ni el backend.
- Commits: auditoría `45cc06ad5546a8daa5e632961356d52cf270fece`; formulario `694510237016bbbe1464311ba7221760f0fe48e7`; caché `12b24c09a4be6b2f3da631cd345d34b2af1e6075`.
- Límite: no se declara resuelta la alta Beta hasta ejecutar IndexedDB real y comprobar escritura remota; no hubo status checks ni workflow runs asociados al último commit consultado.


- [x] Code Review estático: reconstrucción inversa de los dos bloques de formulario y del cambio de caché coincide exactamente con los respaldos; persistencia, logger y modal permanecen sin cambios.
- [x] Safety & Side Effects: no se relajó la persistencia ni se sobrescriben/borran operaciones pendientes.
- [x] Retirar respaldos temporales después de Code Review.


## GP-CUT-DEEP-AUDIT-03 — Auditoría ampliada y rutas de alta (2026-11-26)

- [x] Revisar la ubicación real de `HTML/add_cortes.html`, navegación desde `index.html`, Service Worker e imports del formulario.
- [x] Auditar funciones de etapa 2, fingerprint, snapshot, persistencia IndexedDB, recuperación, ruteo frontend y contrato estático de WRITE.
- [x] Registrar hallazgos F-05 a F-09 en `Auditoria.txt` antes de editar.
- [x] Crear respaldos exactos de `JS/Frontend/ui.js` y `service-worker.js`.
- [x] Corregir los dos accesos antiguos a la raíz en `ui.js`.
- [x] Incrementar Service Worker a caché v82.
- [x] Comparar los archivos modificados contra sus respaldos; únicamente dos destinos y la versión de caché cambiaron.
- [x] Verificar que los seis imports del formulario y los recursos locales revisados existen en el árbol del repositorio.
- [x] Pages build/deploy run `45913010737` SUCCESS en commit `02eb7fa35159416ed4451b75b810b1a98c0184ba`.
- [ ] Confirmar desde el móvil que el sitio servido está usando esta rama/versión y que se abre el formulario por las rutas corregidas.
- [ ] Confirmar el código de error específico si la persistencia sigue fallando; ejecutar IndexedDB real y alta controlada con identidad/datos autorizados.
- [ ] Recuperar de forma segura cualquier operación previa inválida/pendiente; no borrar ni sobrescribir registros locales sin verificar su estado remoto.
- Commits de código: ui.js `431a3a5d5b0099cc0f37af31e87a89cb319d485a`; Service Worker `02eb7fa35159416ed4451b75b810b1a98c0184ba`.
- Límite: Pages build/deploy no equivale a una prueba de alta; no se ejecutó Apps Script, Spreadsheet, Drive, ni navegador/IndexedDB real.

- [x] Actualizar `README.md` para reflejar las rutas reales `HTML/add_cortes.html` y `HTML/users.html`; comparación contra respaldo confirma solo esas dos rutas.

- [x] Code Review completado y respaldos temporales retirados tras comparar cada archivo. Commits de limpieza: `dcbaab71e7bf09392ca9ecb3cd3c738569ae0912`, `dea98bc95a7cffa161df48badc415bd22f165608`, `4e9141413067e05b157b4b76d3997d16b8cca36e`.


## GP-CUT-FUNCTIONAL-AUDIT-04 — Auditoría integral y correcciones del formulario (2026-11-26)

- [x] Releer las normas y revisar el formulario completo, disparadores, avisos, validaciones, estado, persistencia y recuperación.
- [x] Revisar `api-config.js`: endpoint map, validación de URLs, transporte iframe, parsing de respuestas, errores y telemetría.
- [x] Revisar `write.js`: router POST, actor compartido, checkOperation, validación, fingerprint, reserva de ID, ScriptLock, rollback y ledger append-only.
- [x] Registrar F-11 a F-20 en `Auditoria.txt` antes de editar.
- [x] Respaldar los archivos antes de editar en `Olds/Backups/GP-CUT-FUNCTIONAL-AUDIT-04-20261126/`.
- [x] Corregir `showConciseAlert_()` para mostrar el mensaje real en lugar de descartarlo.
- [x] Corregir recuperación silenciosa para que `checkOperation` use WRITE.
- [x] Ampliar allowlist de códigos internos en `diagnosticLogger.js` sin añadir payloads ni secretos.
- [x] Incrementar caché PWA a v83.
- [x] Pruebas de contrato: endpoints locales formato/unicidad PASS; mapa checkOperation/addOrUpdateCut a WRITE PASS; canonicalización cliente/servidor en fixtures nuevo/existente PASS; comparación de archivos contra respaldos PASS.
- [ ] Ejecutar health GET-only sobre los IDs actuales de `API_ENDPOINTS`; el último health disponible probó IDs anteriores.
- [ ] Confirmar que el dominio/móvil sirve el HEAD de trabajo y ejecutar IndexedDB real y alta controlada para vehículo nuevo y existente.
- [ ] Probar recuperación de operación silenciosa y reintento sin duplicados con dataset/identidad aislados.
- Limitación: no se ejecutaron POST de Apps Script, escrituras en Sheets/Drive ni pruebas reales de navegador/IndexedDB. No se recrearon suites eliminadas por solicitud anterior.
- Commits: `7483a76f912ac27cd1c6133df7a67aa0b7f55f30`, `1d8b0a30f2c4f45a937def2342307f86d65ca113`, `8e8994d573d4ba6caa1421f1e3308e583b6837d1`.


### Cierre de implementación GP-CUT-FUNCTIONAL-AUDIT-04 (2026-11-26)

- [x] Mostrar el motivo específico de error del formulario; no sustituirlo por el aviso genérico.
- [x] Dirigir recuperación de operaciones silenciosas a WRITE.
- [x] Ampliar allowlist para todos los códigos explícitos de WRITE (11/11).
- [x] Alinear ubicación requerida: opcional para «No recomendado», obligatoria para corte normal.
- [x] Alinear MIME de frontend, validador WRITE y cargador Drive (16/16 tipos compatibles; máximo 10 MB).
- [x] Corregir regex SVG/ICO tras hallazgo de Code Review (F-24) y verificar la expresión extraída del fuente.
- [x] Verificar diffs contra respaldos: solo cambios autorizados en HTML, WRITE, logger y Service Worker.
- [x] Pages build/deploy `45914970548` SUCCESS en HEAD `dd93b63977d059d7d27cd44006a3a5265d3c69fe`.
- [ ] Desplegar/confirmar `JS/Services/write.js` en el endpoint actual y ejecutar health GET-only sobre los IDs vigentes de `api-config.js`.
- [ ] Confirmar dominio/instalación móvil en HEAD publicado; probar IndexedDB real y altas controladas de vehículo nuevo/existente, además de recuperación silenciosa.
- [ ] Verificar Sheets/Drive solo con identidad y recursos de prueba aislados y limpieza autorizada.
- No se ejecutaron escrituras remotas ni se recrearon suites eliminadas por solicitud previa.

- [x] Code Review aprobado y 12 respaldos temporales retirados después de la comparación exacta; commit `df36935c16bf86f7b61c383b4a8af5c71d9e31a9`.


### GP-CUT-ID-FORMAT-REBUILD-05 — reconstrucción del contrato de ID y registro de cortes (2026-11-26)

- [x] Auditar la lectura del último ID, las fórmulas de Cortes, el ledger de reservas, alta nueva y append de corte existente.
- [x] Separar el contador interno numérico del ID persistente `V-###`; mantener tres dígitos mínimos y permitir extensión a 4+ dígitos (hasta el entero seguro de 16 dígitos).
- [x] Corregir high-water mark, estabilización de fórmulas, alta estática, validación de vehículo existente, ledger append-only, recuperación idempotente, comparación VIN y versionado de catálogo.
- [x] Corregir proyección dirigida CATALOG para IDs `V-###` y snapshots offline suplementarios.
- [x] Preservar el modal de detalle: se revisó contra respaldo y no requirió cambios; mantiene persistencia local, mismo `opId`, validación de respuesta y actualización de ficha.
- [x] Respaldar WRITE, CATALOG, offline.js, ui.js y Service Worker antes de editar; revisar diferencias exactas contra los respaldos.
- [x] Fixtures de ID, fórmula/high-water, freeze-plan, payload existente, ledger append/replay/conflicto, proyección CATALOG y snapshots offline: PASS.
- [x] Compilación sintáctica V8 de WRITE, CATALOG, offline.js y Service Worker: PASS.
- [x] GitHub Pages build/deploy de código `45917661822` SUCCESS en HEAD `7ee15c2f428c9d903dac8269c8430a0f0ad0ef8e`; builds posteriores `45918026216` y `45918204547` SUCCESS, este último en HEAD `038be9e98b91a4f85decf8b559eb641bf527171a`.
- [ ] Desplegar y verificar el código actual de WRITE y CATALOG en los endpoints Apps Script configurados; ejecutar health GET-only y confirmar versión activa.
- [ ] Prueba real controlada en Spreadsheet/Drive con ID `V-###`: registrar vehículo nuevo, agregar corte a vehículo existente desde formulario y modal de detalle, confirmar proyección CATALOG y actualización de UI.
- [ ] Probar replay del mismo `opId` tras respuesta perdida y confirmar que no crea fila/evento duplicado; comprobar limpieza local real en IndexedDB.
- [ ] Tras validación remota satisfactoria y Code Review final, retirar respaldos temporales de `Olds/Backups/GP-CUT-ID-FORMAT-REBUILD-05-20261126/` según NORMAS_DESAROLLO.md.
- Estado: corrección de código y pruebas estáticas completadas; incidencia operativa pendiente de despliegue y validación real. No se han ejecutado escrituras remotas ni cambios de deployments Apps Script.


## GP-CUT-ID-SEQUENCE-06 — IDs V-00000 e inserción de registros (2026-11-26)

**Estado: CÓDIGO IMPLEMENTADO Y REVISIÓN ESTÁTICA COMPLETADA; VALIDACIÓN REMOTA PENDIENTE.**

- [x] Auditar WRITE y registrar hallazgos antes de editar.
- [x] Crear respaldo exacto de `JS/Services/write.js`.
- [x] Cambiar el formato canónico a cinco dígitos mínimos: `V-00001`, `V-00002`, …, `V-99999`, `V-100000` y siguientes.
- [x] Mantener compatibilidad de lectura con IDs históricos `V-###` y números heredados.
- [x] Eliminar la generación de nuevas fórmulas en el ledger de reservas; calcular el siguiente número desde el máximo de `Cortes` y reservas existentes, guardar valor estático y proteger lectura/incremento/append con ScriptLock.
- [x] Mantener idempotencia: el mismo `opId` y hash recuperan el mismo ID; contenido diferente se rechaza.
- [x] Insertar una fila física al final de `Cortes`, copiar formato y validaciones/listas desplegables, limpiar contenidos heredados y escribir toda la información del vehículo y primer corte.
- [x] Registrar el índice de fila insertada para rollback seguro.
- [x] Validar sintaxis, parser/formatter, secuencia 99999→100000, reserva/replay/conflicto y 13 invariantes estáticas.
- [x] Revisar diff contra respaldo; cambios limitados al alcance solicitado.
- [ ] Desplegar la versión actual de WRITE en el endpoint Apps Script configurado y verificar health/version.
- [ ] Ejecutar alta controlada en una Spreadsheet aislada y confirmar ID consecutivo, nueva fila, listas desplegables intactas y todos los campos guardados.
- [ ] Probar reintento con el mismo `opId` y confirmar que no se duplica la fila.
- [ ] Retirar respaldo temporal después de la validación remota y revisión final.
- Commits de código: `994a4aeff118b7827962219f7c67a872940be866`, `21a2d1c5724111fca3550b3bf7b60d0459c0da49`.
- No se ejecutaron escrituras remotas ni despliegues Apps Script; no declarar la operación resuelta en producción.

- [x] Forzar formato de celda texto plano en la columna ID antes de escribir el valor estático. Commit adicional: `f50ed98c2b890ed0b91aff46af3a90ab99c37bc5`.

- [x] Cubrir la primera alta cuando `Cortes` solo contiene encabezados: crear fila 2 y copiar validaciones/formato de la plantilla desplazada. Commit: `5fd150497861893f7762c6616cd61b2e8781451c`.

- [x] Simular las rutas de inserción con registros existentes, solo encabezados y hoja con una fila inicial; copia de formato/validaciones PASS en los tres escenarios.


## GP-CUT-ID-CROSS-SERVICE-07 — compatibilidad de todos los servicios con V-00000 (2026-11-26)

**Estado: CÓDIGO ADAPTADO Y CODE REVIEW COMPLETADO; DESPLIEGUE/VALIDACIÓN REMOTA PENDIENTE.**

- [x] Auditar todos los servicios backend: WRITE, CATALOG, FEEDBACK, ADMIN, Auth, Utilities, CentralConfigurationReader, InboxConversations y SharedSessionActor.
- [x] Revisar consumidores frontend relevantes: offline, UI/modal, formulario de alta y api-config.
- [x] Registrar incompatibilidades y respaldar CATALOG, FEEDBACK y ADMIN antes de editar.
- [x] CATALOG: canonicalizar IDs a cinco dígitos, conservar extensión y normalizar FeedbackLikes.
- [x] FEEDBACK: adaptar validadores de útiles y años; búsqueda/conteo/migración de FeedbackLikes; aplicaciones y eventos de año; reportes, Inbox, sugerencias de corte y asociaciones PyS.
- [x] ADMIN: adaptar auditoría de referencias de vehículos para IDs prefijados y legacy.
- [x] Mantener WRITE: su secuencia interna de reservas permanece numérica; el ID público se genera y guarda como texto por WRITE.
- [x] Mantener sin cambios los servicios que no consumen ni convierten vehicleId; el frontend ya acepta IDs con prefijo y los trata como texto.
- [x] Pruebas sintácticas V8: 5/5 servicios PASS.
- [x] Fixtures: V-00001, V-99999, V-100000, V-001, números históricos, inválidos, útiles/contadores, reintentos/aliases, sugerencias de año, proyección AportesVehiculo, Inbox, PyS y auditoría ADMIN: PASS.
- [x] Code Review frente a respaldos; corregir el hallazgo de orden de declaración en parseReportMetadata y repetir pruebas.
- [ ] Desplegar CATALOG, FEEDBACK y ADMIN actualizados en los endpoints Apps Script activos; confirmar health/version.
- [ ] Completar despliegue/health de WRITE y CATALOG de GP-CUT-ID-SEQUENCE-06.
- [ ] Prueba integrada controlada: lectura de vehículo V-00001 y V-100000, útiles desde dos cuentas, consulta de útiles propios, sugerencia de año, reportes/Inbox, asociación PyS y auditoría de referencias.
- [ ] Confirmar que no se crean filas duplicadas en FeedbackLikes al alternar representaciones legacy/canónicas.
- [ ] Retirar respaldos temporales tras validación remota y Code Review final.
- Respaldos: `Olds/Backups/GP-CUT-ID-CROSS-SERVICE-07-20261126/`.
- Commits de código: CATALOG `7945e406075461d9af3a2bf209a4493eecb09027`; FEEDBACK `20e5e09313d99858eb11e9fa1b01a9f51f7d7201`, `fb1ff8608b84a49f7b4d137e82cc25bded1224b8`, `4e60ce927a48b44907ff4bb4b93ea091689021aa`, `f3e283157e5746ab8cb5db3da4ca854e2d9f4237`, `412d21236d817fd2586c48519fe80d35465ad80c`; ADMIN `adad4b9313092774f3aa90a1ce4da4f708aff84e`.
- No se realizaron escrituras ni despliegues remotos de Apps Script.


## GP-CUT-SAME-ROW-08 — aportes sobre la fila existente del vehículo (2026-11-26)

**Estado: IMPLEMENTACIÓN COMPLETADA EN RAMA; VALIDACIÓN ESTÁTICA PASS; DESPLIEGUE PENDIENTE.**

- [x] Confirmar rama GPSpedia2.2.5_work y HEAD; verificar que GPSpedia2.2.5 permanece intacta.
- [x] Leer NORMAS_DESAROLLO.md, README.md, checkpoint.md, Tareas_Activas.md, Tareas_Beta.md y Auditoria.txt. contexto_personal.md no existe en la rama.
- [x] Auditar flujos de corte, apertura, alimentación, VIN y vídeo; revisar persistencia física en Cortes, ledger AportesVehiculo, proyección CATALOG y recuperación local.
- [x] Registrar hallazgos F-29 a F-35 en Auditoria.txt.
- [x] Crear respaldos exactos en Olds/Backups/GP-CUT-SAME-ROW-08-20261126/ (WRITE, CATALOG, ui.js, offline.js, add_cortes.html, Service Worker y registros). Commit: d8b3e58005263d6f1e71e3b37449abcf893272c9.
- [x] Materializar corte, apertura, VIN y alimentación en las columnas libres de la fila única del vehículo en Cortes; AportesVehiculo conserva el historial append-only e idempotente.
- [x] Para corte, guardar tipo, configuración Relay, detalle/ubicación, color, testigo, imagen y colaborador autenticado en el slot asignado; no sobrescribir datos existentes ni insertar una nueva fila de vehículo.
- [x] Adaptar CATALOG para reconocer eventos ya materializados y evitar duplicarlos en la proyección; WRITE reconcilia eventos históricos aceptados antes de asignar nuevos slots.
- [x] Unificar el modal de apertura/alimentación con la operación durable por cuenta, opId estable y contributionOpIds; mantener la misma fila del vehículo.
- [x] Corregir alta/recuperación para que una escritura WRITE confirmada permita avanzar a etapa 3 aunque la limpieza IndexedDB quede pendiente; un snapshot de corte completed puede reemplazarse por la siguiente operación suplementaria sin reutilizar su opId.
- [x] Verificar el flujo de VIN sobre la columna VIN existente; el vídeo guía ya actualizaba únicamente la fila destino existente y no requirió cambios.
- [x] Validación estática/local y fixtures efímeros fuera del repositorio; comparación contra respaldos; revisión del diff y actualización de ChangesLogs.txt/checkpoint.md.
- [x] No ejecutar POST de Apps Script, escrituras reales en Sheets/Drive ni despliegues. Tareas_Beta.md mantiene cerrada la fase Beta; no se crearon nuevas suites ni workflows.


### Cierre de implementación — GP-CUT-SAME-ROW-08
- Commits: `8809015aa41e2d55064eedeb056a21588a90fe10` (materialización de aportes y recuperación) y `773312621da5bceb6ad5bad7cdd94ea06286bb49` (reconciliación VIN, reemplazo seguro de snapshot completado y caché v89).
- Último commit de implementación: `773312621da5bceb6ad5bad7cdd94ea06286bb49`; el cierre documental se registró en commits posteriores. PR #128 continúa abierto y mergeable hacia `GPSpedia2.2.5`.
- Pendiente exclusivamente: despliegue autorizado de WRITE/CATALOG y validación integrada en Spreadsheet/Drive aislado; comprobar también el navegador/IndexedDB. No declarar producción validada antes de esas pruebas.


## GP-WRITE-SUPPLEMENTARY-SESSION-KEY-01 — validación de actor compartido en aportes

**Estado: CORRECCIÓN IMPLEMENTADA; validación local de diff y autorización estática aprobada; integración remota no ejecutada.**

- Causa: allow-list de `assertSupplementaryInfoPayloadKeys_` no aceptaba las claves internas del contexto compartido que el dispatcher de WRITE incorpora tras autenticar la sesión.
- Corrección: admitir `__sharedSessionActor` y `_sharedSessionActor` únicamente como estructura interna en la allow-list. La autenticación y autorización siguen consumiendo exclusivamente `payload.__sharedSessionActor`, generado por `withSharedSessionActor_(e, actor)` después de validar userId/sessionToken contra Users/ActiveSessions; el alias simple no se utiliza para identificar al colaborador.
- Persistencia: se conserva intacto el handler, el ledger de aportes, la idempotencia, la asignación de slots y la materialización de la fila existente.
- Code review: comparación contra backup confirmó que el único delta de código es la allow-list de la validación. Sin cambios en frontend, AUTH, ADMIN, ledger o persistencia.
- Validación: inspección estática del flujo actor confiable/handler y comparación exacta; no se añadieron suites ni pruebas al repositorio (fase Beta cerrada). Apps Script remoto, Sheets/Drive y navegador real no ejecutados.
- No se realizó deployment.


### Cierre — GP-WRITE-SUPPLEMENTARY-SESSION-KEY-01
- **Estado:** COMPLETADA EN FUENTE; validación de integración diferida.
- Code review: el diff de `JS/Services/write.js` contiene únicamente los dos nombres de clave agregados a la allow-list. Actor autenticado continúa derivándose de la sesión y consumiéndose únicamente desde `__sharedSessionActor`; identidad, epoch, rol y concordancia userId permanecen comprobados.
- Validación estática: 17 claves de allow-list verificadas; ambas variantes de actor admitidas como campos, alias simple no utilizado como identidad; protección de vídeo y checks de actor preservados.
- Backup exacto comparado y eliminado tras revisión. No se crearon tests ni workflows, no hubo POST remoto ni deployment.
- Rama base no modificada.


## GP-ADD-CUT-WIZARD-UX-NAV-01 — mensajes, etapas y retroceso de detalle

**Estado: EN IMPLEMENTACIÓN.**

- [x] Suprimir notificaciones redundantes de confirmación/limpieza local tras WRITE; permitir exclusivamente «Corte agregado con éxito» o «No se pudo agregar el corte, intenta más tarde» en el flujo de alta y mantener errores técnicos en consola (implementado, pendiente prueba integrada).
- [x] Transición etapa 2→3 tras confirmación WRITE sin depender de limpieza IndexedDB; conservar recuperación e idempotencia (implementado, pendiente prueba integrada).
- [x] Suprimir mensaje extra de verificación tras WRITE suplementario y usar consola para error de proyección; redirect catálogo sigue activo (implementado, pendiente prueba integrada).
- [x] Retroceso etapa 3→2 reinicia campos/imágenes locales del corte; otras rutas de retroceso preservan datos (implementado, pendiente prueba integrada).
- [x] Desde etapa 2 regresar a etapa 1.5 si hay coincidencias, o etapa 1 sin coincidencias; la lógica existente preserva datos/resultados.
- [x] Entrada modalOpen añadida al historial al abrir detalle desde estado no-modal, para retroceso/gesto (implementado, pendiente browser real).
- [ ] Diagnosticar /favicon.ico 404; corregir ruta o asset si el defecto está confirmado en el alcance.
- [ ] Clasificar la advertencia document.write de runtime HtmlService de Google: corregir solo si existe callsite propio GPSpedia comprobado, sin modificar runtime externo.
- [ ] Validar estáticamente y por simulación efímera sin crear suites ni workflows (Beta cerrada); comparar diff y realizar Code Review.
- [ ] Actualizar ChangesLogs.txt, Auditoria.txt y checkpoint.md; conservar GPSpedia2.2.5 intacta.

