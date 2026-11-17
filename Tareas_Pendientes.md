# GPSpedia — Tareas pendientes

**Documento operativo único del backlog.**  
Fecha de consolidación: 2026-11-17  
Repositorio: `infogpstech/GPSpedia`  
Rama autorizada: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5`  
HEAD de código validado: `f6375b86e6908e9e9152e9c63b216b3d274ce1fe`; documentación y registros actualizados en la rama autorizada.

Este documento sustituye los registros operativos `Tareas_Activas.md` y `Tareas_beta.md`, integrando sus pendientes por sector y orden de ejecución. El historial y la evidencia de trabajo anterior permanecen en `checkpoint.md` y en `Olds/Documentacion_Legacy/`. La única fuente normativa continúa siendo `NORMAS_DESAROLLO.md`.

## Criterios de lectura

- **PENDIENTE LOCAL:** requiere análisis, implementación o pruebas reproducibles en la rama.
- **PENDIENTE BETA:** requiere navegador/dispositivo real, deployment actualizado, servicios externos o datos de una copia Beta.
- **EN PROGRESO:** tarea actualmente atendida.
- Una tarea puede tener implementación local terminada y conservar validación Beta pendiente. No confundir ambas etapas.
- No desplegar Apps Script, modificar ScriptProperties, secretos, hojas, permisos, Drive ni datos productivos sin autorización expresa.
- Las pruebas Beta deben iniciar con los comandos seguros de sincronización exigidos por `NORMAS_DESAROLLO.md`.

## Nuevo bloque prioritario — Inbox, caché de navegación y controles visuales (2026-11-16)

**Estado general: IMPLEMENTACIÓN LOCAL COMPLETADA; validaciones visuales y operativas diferidas a Beta.** Los requisitos de este bloque tienen implementación y regresión local registradas en sus respectivas adendas.

### GP-UX-INBOX-01 — Rediseño de la bandeja de entrada
**Prioridad: P1 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**
- Reorganizar el Inbox con una experiencia consistente en escritorio y móvil, tomando como referencia de interacción la bandeja de Outlook, sin copiar su identidad visual.
- Menú lateral hamburguesa, colapsable/autoocultable en escritorio y adaptado a móvil, con secciones: General (mensajes directos), Soporte (tickets), Contáctanos (formularios de contacto), Reportes (reportes de problemas de los modales de detalle) y Aportaciones (aprobaciones de YouTube, exclusivamente Desarrollador).
- Separar correctamente las fuentes/tipos de datos existentes; no mezclar tickets, mensajes directos, formularios, reportes ni aprobaciones.
- Barra superior: título, botón hamburguesa y acciones de creación con iconografía accesible. Incorporar icono de papelera para eliminar mensajes donde la acción y los permisos existentes lo permitan.
- Mantener paginación, búsqueda, estados leído/no leído, archivado, auditoría, roles y autorización backend actuales.
- Validar navegación, responsive, accesibilidad, tema claro/oscuro, teclado y separación de permisos.

### GP-PERF-PAGES-01 — Caché de usuarios y continuidad entre páginas
**Prioridad: P1 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**
- Cachear la lista de usuarios en users.html, aislada por identidad/rol/token de sesión, mostrar caché válida inmediatamente y revalidar en segundo plano.
- Actualizar/inutilizar la caché tras crear, editar, eliminar usuarios o cerrar sesiones; no conservar datos entre sesiones distintas ni reemplazar datos frescos por respuestas antiguas.
- En add_cortes.html, conservar en caché los datos de catálogo/usuarios que realmente consuma el formulario, sin persistir secretos ni datos de formulario sensibles.
- Al regresar a index.html desde users.html o add_cortes.html, restaurar el App Shell y el estado visible sin parpadeo ni recarga completa cuando el navegador/PWA lo permita; mantener navegación Atrás/Adelante, sesión y sincronización silenciosa.
- No vaciar catálogo válido ni disparar snapshots completos por defecto; respetar la política cache-first del catálogo y el Service Worker.

### GP-UX-USERS-01 — Acciones compactas en la tabla de usuarios
**Prioridad: P2 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**
- Sustituir texto de Editar/Eliminar por iconos profesionales (lápiz y papelera), con etiquetas accesibles y tooltips.
- Mantener editar y eliminar en una misma fila horizontal, con botones compactos de proporción cuadrada en escritorio y móvil.
- Mantener separado el control privilegiado de cierre de sesiones y sus permisos actuales.

### GP-UX-CUT-MODAL-01 — Posición de acciones del modal de detalle
**Prioridad: P2 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA (2026-11-16)**
- Ubicar compartir, editar e imprimir en la esquina superior derecha del encabezado, inmediatamente a la izquierda del botón cerrar.
- Evitar centrado vertical/horizontal en la cabecera y conservar tamaños táctiles, orden, accesibilidad y reglas RBAC.

### Dependencias y aceptación
1. Auditar estructura HTML/CSS y handlers actuales antes de cambiar cada flujo.
2. Completar primero GP-UX-INBOX-01, después GP-PERF-PAGES-01 y finalmente los dos ajustes compactos de controles.
3. Agregar pruebas de contrato/UI para filtros por sección, permisos de Aportaciones, invalidación de caché, restauración de página y disposición responsive.
4. Mantener validaciones visuales en dispositivos reales, servicios/deployments externos y pruebas Beta como PENDIENTES; no desplegar Apps Script ni alterar datos externos.

**Cierre local (2026-11-16):** Los cuatro bloques se implementaron y pasaron la suite GitHub Actions (126 suites, 1,864 pruebas, 0 fallos). La publicación GitHub Pages también terminó correctamente. Se difiere a Beta la revisión visual real en escritorio/móvil, la experiencia de retorno BFCache en navegadores/dispositivos objetivo y la verificación operativa de formularios/tickets con datos reales.

### GP-UX-INBOX-02 — Lista, búsqueda y navegación uniforme del Inbox
**Prioridad: P1 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Ampliar el área útil vertical del modal: el espacio de trabajo debe ocupar la altura disponible y la lista de mensajes no debe quedar limitada a la mitad superior del panel.
- Incorporar una lupa en la cabecera del Inbox; al activarla despliega/oculta la búsqueda con transición fluida. La consulta busca asunto, participantes, autor y contenido de mensajes.
- Retirar el selector visual de categoría en General y Soporte. La sección continúa aplicando internamente su ámbito de datos y la búsqueda devuelve resultados dentro de esa sección.
- Sustituir los paginadores separados por una única barra persistente y reutilizable en todas las secciones/vistas: flecha izquierda, indicador contextual «1/2», «2/2», «1/3», etc., y flecha derecha. Mantener cursores opacos y límites de permisos existentes.
- Carpetas de conversaciones: Recibidos, Leídos, No leídos, Enviados y Archivados. Mostrar iconos compactos y expandir el nombre de la carpeta activa mediante animación; respetar movimiento reducido.
- «Leídos» filtra conversaciones recibidas cuyo contador de mensajes no leídos sea cero. No cambia el contrato de lectura ni modifica datos al consultar.
- Validar que el paginador compartido funcione tanto para conversaciones directas como para solicitudes históricas, en todas las secciones, sin duplicar controles ni mezclar cursores.
- Invalidar el App Shell anterior mediante `gpsepedia-cache-v34` y comprobar que Service Worker sirve los archivos actualizados.

- Cierre local reconciliado: CI run 43906071405 aprobó 129 suites / 1,899 pruebas / 0 fallos; la corrección posterior del botón flotante quedó cubierta por CI run 43907008784 (129 suites / 1,900 pruebas / 0 fallos) y Pages SUCCESS. Solo permanece la aceptación visual en dispositivos Beta.

### GP-UX-INBOX-03 — Altura completa de listas y barra de acciones en PWA
**Prioridad: P1 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**
- En la vista móvil/PWA de solicitudes y reportes, la lista debe ocupar todo el espacio vertical disponible entre la navegación y la paginación.
- El detalle se oculta mientras no exista una solicitud seleccionada; al abrir un detalle, la navegación de regreso mantiene el comportamiento actual.
- Mover «Nuevo mensaje» y «Buscar» desde la cabecera a la misma barra de iconos de Recibidos, Leídos, No leídos, Enviados y Archivados.
- Mantener los IDs, handlers, accesibilidad, visibilidad por vista y permisos existentes.
- Validación local: InboxUi 35/35; regresión global 127 suites / 1,876 pruebas / 0 fallos. Aceptación visual PWA en dispositivo real pendiente de Beta.

### GP-DASH-ATTR-01 — Normalización visual de aportadores compartidos
**Prioridad: P1 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**
- Separar colaboradores dentro de un mismo campo mediante etiquetas HTML `<br>` (incluidas variantes con espacios y barra).
- Sanitizar etiquetas, scripts, identificadores auxiliares, puntuación final y espacios; no interpretar los nombres como HTML.
- Agrupar alias ignorando mayúsculas, acentos y puntuación; presentar nombres con inicial mayúscula en cada palabra.
- Repartir las aportaciones de una fila compartida a cada colaborador y consolidar variantes del mismo nombre en una sola fila del dashboard.
- Mantener el cambio en frontend; no alterar Apps Script, hojas ni datos almacenados si la información agregada existente es suficiente.
- Como el backend solo entrega conteos agregados y no IDs de vehículos por aportador, al consolidar alias se conserva el mayor conteo de vehículos observado para evitar sumar duplicados; validar esta limitación frente a los datos de Beta.
- Validación local: ActivityDashboardContributions 9/9; regresión global 127 suites / 1,876 pruebas / 0 fallos. Revisar conteo de vehículos compartidos y muestras históricas en Beta.
- Extensión solicitada: retirar cualquier contenido entre paréntesis de los nombres (p. ej. `(apert)`, `(corte)`) y consolidar el mismo técnico en una única aportación.
- Normalizar variantes de `Comunidad de técnicos`, incluyendo `Comunidad Internacional de técnicos`, a un solo nombre canónico.
- Los espacios de técnico vacíos en slots con tipo de corte registrado se contabilizan como `Comunidad de técnicos`; ajuste mínimo del agregador `buildCutContributionSummary_` en `JS/Services/feedback.js`, sin cambiar el contrato de respuesta ni persistir modificaciones.
- Validación local ampliada: ActivityDashboardContributions 14/14; ServiceWorkerCache 9/9; OfflineBrandAssets 4/4; regresión global 127 suites / 1,881 pruebas / 0 fallos. Validación de datos históricos y conteos en Beta pendiente.

## Orden general de ejecución

1. **Implementación local:** las tareas de experiencia de usuario, Inbox, Developer, servicios, sesión, identificadores y telemetría registradas en este backlog tienen cierres locales o estados de validación diferida a Beta documentados. No quedan tareas locales abiertas en el bloque consolidado.
2. **Regresión integral local:** completada en el HEAD de código f6375b86e6908e9e9152e9c63b216b3d274ce1fe: 145 suites / 2,123 pruebas / 0 fallos (Actions 44166031280). Pages y health read-only también aprobados.
3. **Siguiente etapa:** validaciones Beta reales en el orden de dependencias de cada bloque: navegador/PWA y responsive; servicios Apps Script y ScriptProperties; OAuth/Drive/YouTube/Spreadsheet; roles, sesiones/revocación, concurrencia y mediciones. Cada bloque conserva sus comandos seguros de sincronización antes de probar.
4. No desplegar Apps Script, cambiar ScriptProperties ni modificar hojas/Drive productivos sin autorización expresa. No simular validaciones externas ni marcar como aprobadas pruebas sin evidencia.
5. Después de completar la validación Beta y resolver defectos reproducibles, se podrá abrir una nueva etapa de planificación basada en resultados.

## Bloque prioritario — Inbox, feed de catálogo, vistos recientes y aportes de usuarios (2026-11-16)

**Estado:** IMPLEMENTACIÓN LOCAL COMPLETADA Y VALIDADA EN CI; VALIDACIÓN EN SPREADSHEET/BETA PENDIENTE.  
**HEAD probado:** `c973bcd2ea3678a012502b8f9a4da5d059e1751e`.

### P1 — Autocreación segura del esquema Inbox
**Estado local: COMPLETADO.**

- `findOrCreateInboxSheet_` reutiliza la hoja con el nombre contractual y solo crea la hoja cuando no existe.
- `ensureInboxConversationSheets_` inicializa las cinco hojas requeridas: `InboxConversations`, `InboxMessages`, `InboxConversationState`, `InboxConversationFlags` e `InboxConversationAudit`.
- Esquema canónico:
  - `InboxConversations`: `conversationId, createdAt, updatedAt, subject, category, type, status, createdById, createdByName, createdByRole, participantsJson, createKey, createHash, lastMessageId, lastMessageAt, lastMessagePreview, messageCount`.
  - `InboxMessages`: `messageId, conversationId, createdAt, authorId, authorName, authorRole, body, idempotencyKey, payloadHash`.
  - `InboxConversationState`: `conversationId, userId, lastReadAt, lastReadMessageId, archived, hasSent, hasReceived, updatedAt, lastReceivedMessageId, lastSentMessageId`.
  - `InboxConversationFlags`: `conversationId, userId, unreadOverride, deleted, updatedAt`.
  - `InboxConversationAudit`: `eventId, timestamp, actorId, actorName, action, conversationId, messageId, details`.
- Si faltan encabezados/columnas, se insertan en su posición contractual y se desplazan las columnas existentes para preservar sus valores. Los encabezados duplicados provocan error seguro; no se renombra ninguna hoja ni se eliminan columnas extra.
- La creación de una hoja vacía no inventa estados o mensajes de conversaciones preexistentes. Si quedan mensajes huérfanos o estados de participantes incompletos, la lectura conserva el error de integridad en lugar de presentar una bandeja vacía o fabricar datos.

### P1 — Feed incremental del catálogo
**Estado local: COMPLETADO.**

- El timeout por intento se eleva de 2,000 a 5,000 ms, conservando los reintentos acotados existentes. El Service Worker se actualiza a caché v31 para invalidar recursos anteriores y entregar el `api-config.js` con la URL de servicio vigente.
- Si falla transitoriamente el feed y hay un snapshot completo y cursor válido, se conserva el catálogo mostrado y se evita descargar/reconciliar todo el snapshot. El siguiente ciclo vuelve a intentar solo el delta.
- La reconciliación completa queda reservada para caché/cursor inválido, reset o inconsistencias reales.

### P2 — Carrusel «Vistos recientemente»
**Estado local: COMPLETADO.**

- La tarjeta se actualiza optimistamente en memoria al abrir el detalle; la escritura en IndexedDB continúa en segundo plano y ya no se encadena con una lectura completa del almacén.
- La carga de historial y vistos se desacopla para que una apertura lenta de IndexedDB no retrase ambos.
- El render detecta cambios de IDs/orden/timestamps, no solo cambios en la cantidad de elementos; se actualiza incluso cuando el carrusel ya tiene 20 elementos.

### GP-UX-BRAND-01 — Encabezado del detalle de cortes
**Prioridad: P2 · Estado: IMPLEMENTADA Y VALIDADA AUTOMÁTICAMENTE; aceptación visual Beta pendiente.**

- Mantener el nombre del modelo a la derecha del logo mientras su ancho natural quepa en el espacio disponible del modal.
- Mover el nombre debajo del logo únicamente cuando su ancho natural, sumado al logo y al espacio entre ambos, exceda el ancho interno del modal; al apilarlo debe poder envolver texto sin desbordarse.
- Restaurar el tamaño de logo de marca de la rama base protegida `GPSpedia2.2.5`: altura de 48 px en escritorio y 38 px hasta 600 px; no limitar adicionalmente su ancho con máximos que reduzcan logos panorámicos.
- Validar con marcas/logos panorámicos y cuadrados, modelos cortos y largos, resize del modal y viewport móvil/escritorio.

**Cierre técnico 2026-11-16:** comparación directa con `GPSpedia2.2.5` confirmó las dimensiones originales del logo: 48 px en escritorio y 38 px hasta 600 px. Se eliminó el límite adicional de 140 px que comprimía logos panorámicos en la rama de trabajo. El nombre del modelo se mantiene a la derecha y solo se apila cuando la suma del ancho natural del modelo, logo y separación supera el ancho interno del contenedor; `ResizeObserver` recalcula el ajuste al cambiar el modal o su contenido.

**Validación:** CutDetailModalLayout 9/9; regresión global 127 suites, 1,869 pruebas aprobadas, 0 fallos. La comparación de CSS se hizo contra la rama base protegida, sin modificarla.


### GP-PWA-BRAND-01 — Logo local, Splash y favicon transparente
**Prioridad: P1 · Estado: IMPLEMENTADA Y VALIDADA AUTOMÁTICAMENTE; aceptación offline en dispositivos Beta pendiente.**

- Sustituir las referencias remotas del logo principal del encabezado por el recurso oficial local para que se muestre sin conexión.
- Mantener el logo de tema oscuro en el Splash cuando el tema oscuro esté activo; el recurso debe estar incluido en el App Shell offline.
- Usar el logo oficial local en el Splash de tema claro para evitar dependencias externas durante el arranque.
- Cambiar el favicon remoto por el PNG oficial transparente, sin fondo blanco; verificar el canal alfa real del archivo.
- Incluir los recursos de marca necesarios en la precarga esencial del Service Worker y aumentar la versión del caché para invalidar el App Shell anterior.
- No alterar los iconos PWA/manifest ni el diseño del login fuera del alcance solicitado.

**Cierre técnico 2026-11-16:** encabezado y Splash de tema claro usan el recurso oficial local `Images/icon-v3-512x512.png`; Splash y encabezado conservan el logo oscuro cuando el tema oscuro está activo. El favicon apunta al mismo PNG local y la prueba inspecciona su IHDR para exigir canal alfa (PNG RGBA/grayscale-alpha), sin fondo opaco. El Service Worker pasó a `gpsepedia-cache-v33` y precarga ambos logos.

**Validación:** OfflineBrandAssets 4/4; ServiceWorkerCache 9/9; regresión global 127 suites, 1,869 pruebas aprobadas, 0 fallos. La comprobación en navegador real sin conexión y la visualización del favicon quedan para Beta.


### P2 — Pestaña de aportes en Panel de Actividad
**Estado local: COMPLETADO.**

- Se añade la pestaña «Aportes por usuario», separada de «Actividad de usuarios».
- El backend cuenta cada slot de corte con tipo y colaborador asignado en `Cortes` (`colaboradorCorte1..3` y `tipoCorte1..3`), agrupa por nombre normalizado y muestra cortes aportados y vehículos distintos.
- El ID de usuario solo se asocia cuando el nombre coincide de forma única con el registro `Users`; se deduplican las coincidencias de nombre/usuario que pertenecen al mismo ID. La agregación lee únicamente las columnas ID, tipo y colaborador necesarias, no el bloque completo de 32 columnas. Los registros sin colaborador no se asignan arbitrariamente.

### Validación Beta pendiente

Antes de cualquier prueba Beta, sincronizar y verificar el árbol limpio siguiendo el procedimiento obligatorio de `NORMAS_DESAROLLO.md`; no usar comandos destructivos:

```bash
git status --short --branch
git branch --show-current
git rev-parse HEAD
git fetch origin GPSpedia2.2.5_work
git pull --ff-only origin GPSpedia2.2.5_work
git status --short
```

1. En una copia Beta de la Spreadsheet, eliminar solo una hoja/columna de prueba para verificar que Inbox crea la estructura contractual y conserva los datos de las columnas que permanecen; no ejecutar esta prueba sobre producción.
2. Probar Inbox con usuarios reales de los roles autorizados y comprobar creación, envío, lectura, archivado, borrado, auditoría y ausencia de hojas duplicadas.
3. Revisar que las filas antiguas con mensajes/estados huérfanos se reporten explícitamente; decidir cualquier migración de datos por separado, nunca generar estados ficticios.
4. Medir `getCatalogChanges` con red lenta y confirmar que un timeout conserva el snapshot/cursor y no dispara una descarga completa innecesaria.
5. Medir «Vistos recientemente» en frío/caliente, con 20 elementos, varias pestañas y IndexedDB bloqueado; verificar actualización inmediata y persistencia posterior.
6. Revisar en móvil/escritorio modelos cortos y largos con logos de distintos anchos.
7. Confirmar que «Aportes por usuario» coincide con la asignación de colaboradores en la hoja `Cortes`; revisar nombres repetidos/ambiguos y cortes históricos sin colaborador.
8. Verificar la URL de servicio que el usuario actualizó en `api-config.js` contra el deployment Beta y comprobar que las acciones apuntan al servicio esperado. La URL se conserva sin alterarla en esta iteración.

No desplegar Apps Script ni modificar secretos, ScriptProperties, permisos, hojas, Drive o datos productivos desde esta fase local.

---

## Bloque prioritario — autorización Developer, sesiones, FEEDBACK y PWA (2026-11-16)

**Estado general: IMPLEMENTACIÓN LOCAL COMPLETADA; VALIDACIÓN DE DEPLOYMENTS Y DISPOSITIVOS PENDIENTE DE BETA.**  
**HEAD probado:** `e4850ea35e5d84b0b2c07c60cb0a63f0f24c7982`.

### P1 — Acceso del rol Desarrollador y coordinador compartido
**Estado: CORREGIDO LOCALMENTE; PENDIENTE BETA.**

- Se confirmó que la matriz FEEDBACK ya admite las consultas de Inbox y la preferencia global, y que `getActivityLogs` incluye al rol Desarrollador. Coordinator ya declara las políticas de lectura requeridas. No se ampliaron permisos ni se retiraron verificaciones centrales.
- El usuario confirmó que el secreto privado de FEEDBACK no coincidía con el esperado por Coordinator y que ya corrigió el valor en el deployment. No se leyeron, modificaron ni registraron secretos desde el repositorio.
- Se corrigió una omisión independiente en la UI de tráfico global: `getServiceTraffic` se enviaba sin el contexto de sesión; ahora utiliza el `userId/sessionToken` de la sesión activa. ADMIN y Coordinator continúan validando al actor y el rol Desarrollador.
- Se verificó que `SESSION_LIMITS.desarrollador = Infinity` ya estaba implementado y aplicado por el control de límites finitos. No fue necesario alterar la política; se incorporó cobertura de regresión.
- Cobertura: `DeveloperPrivilegeRouting` 20/20; `ServiceTrafficAdminContract` 20/20; `VehicleModalRolePolicy` 12/12.

### P1 — Recuperación de sesiones revocadas o heredadas
**Estado: CORREGIDO LOCALMENTE; PENDIENTE BETA.**

- Cuando un servicio protegido confirma que la sesión está revocada, no existe o dejó de ser única, el cliente identifica esa respuesta y notifica al módulo AUTH.
- AUTH solo limpia el token local si coincide con el token rechazado. Una respuesta tardía de una sesión antigua no puede cerrar una sesión nueva. No se añade una consulta previa de sesión por botón ni se debilitan las barreras de token, expiración, epoch, revocación o RBAC de Coordinator.
- El usuario regresa directamente al modal de inicio de sesión con el aviso informativo amarillo suave **«Sesión terminada»**. Se liberan también los modales legales de la sesión anterior para evitar que los términos oculten el inicio de sesión.
- Cobertura: `SessionInvalidationFlow` 15/15; `SessionStartupNavigation` 17/17.

### P2 — Caché PWA y navegación entre páginas
**Estado: CORREGIDO LOCALMENTE; PENDIENTE BETA.**

- `service-worker.js` subió a caché v30. La copia de la respuesta se crea antes de entregarla al consumidor, evitando reutilizar el cuerpo de `Response`.
- El App Shell, `index.html`, `HTML/add_cortes.html`, `HTML/users.html` y recursos estáticos locales utilizan caché cache-first con actualización en segundo plano. Las páginas cacheadas se muestran sin esperar la red; los servicios externos no se interceptan como documentos o API.
- El fallback de navegación sin conexión recupera `index.html`. No se eliminan bases de datos ni datos locales para forzar una actualización.
- Cobertura: `ServiceWorkerCache` 9/9; `PWAStartupScenarios` 15/15.

### P2 — FEEDBACK, preferencia global e incremental del catálogo
**Estado: CORREGIDO LOCALMENTE; PENDIENTE BETA.**

- `getRichTextMode` ahora tiene timeout por intento y un único reintento transitorio. Los rechazos de autorización y errores funcionales no se reintentan. La preferencia local previa sigue siendo el fallback visual.
- `getCatalogChanges` ahora reutiliza el mecanismo común de reintentos con timeout, backoff corto, cancelación y clasificación de errores HTTP/red.
- Cobertura: `RichTextGlobalPreference` 9/9; `CatalogFeedRetry` 9/9.

### P2 — Auditoría transversal de alineación de modales
**Estado: COMPLETADA.**

- Confirmación del usuario en esta sesión: la tarea fue verificada en Beta. No queda pendiente de implementación ni de validación Beta.

- Revisar cabeceras, grupos de acciones y botones de cierre en todos los modales de `index.html` y en las subpáginas administrativas.
- Detectar alineaciones centradas que contradigan la jerarquía del contenido; estandarizar grupos de acciones a izquierda/derecha según función, mantener el cierre en la esquina superior derecha y evitar reglas globales que rompan modales con formularios o contenido centrado deliberadamente.
- Criterios de aceptación: inventario de modales revisados, CSS compartido en lugar de parches duplicados, disposición correcta en móvil/escritorio, foco visible/teclado y contratos Node.js. La inspección visual final requiere Beta.

### P2 — Caché opcional de validación y modales concretos
**Estado: CORREGIDO LOCALMENTE; REVISIÓN VISUAL GENERAL PENDIENTE.**

- Las lecturas/escrituras opcionales de `validationCache` son silenciosas y tienen espera máxima de 2.5 segundos; no deben mantener abierto el modal mientras IndexedDB continúa bloqueado.
- En el modal de detalle de cortes, compartir/editar/imprimir quedan agrupados a la derecha antes del botón de cierre. Tutorial y relay usan el botón estándar de cierre. La ayuda de la consola Developer queda junto al título y el control de copiar permanece al extremo derecho.
- La revisión integral de alineación de todos los demás modales se conserva como tarea local separada; no se da por completada con estos tres ajustes.
- Cobertura: `OptionalValidationCache` 4/4; `CutDetailModalLayout` 8/8.

### Validaciones pendientes en Beta

1. Confirmar, sin mostrar valores, que FEEDBACK y Coordinator del mismo entorno usan el secreto correspondiente y probar Inbox, actividad y `getRichTextMode` con una cuenta Desarrollador real. El usuario informó que ya corrigió el secreto; esta sesión no verificó el deployment.
2. Probar `getServiceTraffic` desde el panel Developer con el actor de sesión real y comprobar que el gráfico devuelve el agregado global.
3. En navegador con caché antigua 2.2.0, reproducir la sesión revocada y confirmar que solo aparece el login con «Sesión terminada», sin quedarse en el modal de términos.
4. Probar navegación repetida `index.html` ↔ `add_cortes.html` ↔ `users.html`, pestañas simultáneas, caché caliente/fría, offline/reconexión y actualización del Service Worker en Android/PWA y escritorio.
5. Medir el tiempo real de FEEDBACK después de corregir la configuración y revisar IndexedDB bloqueado en el dispositivo que reportó el timeout.

No desplegar Apps Script ni modificar ScriptProperties, permisos, hojas, Drive o datos productivos como parte de estas tareas.

---

## 1. Interfaz global, accesibilidad y experiencia de uso

**Prioridad inmediata.** Las mejoras deben formar un sistema común, no una colección de correcciones aisladas.

### BETA-021 — Sistema visual común
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- Commit: `b4112e798abe831059f6c6d929d3cf82743a2689`.
- `button-system.css` ahora centraliza tokens y estados para campos de texto, selectores y áreas de texto, además del sistema existente de botones.
- Se unificaron colores por tema, dimensiones base, borde, tipografía, foco visible, estados deshabilitado/error y comportamiento móvil. Se excluyeron checkboxes, radios, archivos, rangos, selectores de color y controles de acción; se conservaron excepciones compactas justificadas.
- La suite `GlobalControlSystem.mjs` quedó integrada en el runner: 7/7 PASS.
- CI run `43788784398`: SUCCESS — 109 suites, 1,677 pruebas aprobadas, 0 fallos; sintaxis PASS.
- GitHub Pages run `43788783931`: SUCCESS.
- Pendiente Beta: comprobar visualmente formularios y modales en tema claro/oscuro, móvil/escritorio, foco/teclado y lectores de pantalla.

- Definir tokens y patrones compartidos para botones, campos, selectores, iconos, espaciado, tipografía y estados.
- Aplicar estados coherentes: normal, hover, focus, disabled, error y loading.
- Revisar estilos existentes y reutilizar componentes antes de crear otros.
- Mantener compatibilidad con temas claro/oscuro, móvil/escritorio, teclado y lectores de pantalla.
- Incorporar el patrón común en las vistas alcanzadas por BETA-022–026 y BETA-030–035.

### BETA-022 — Dimensiones de botones
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- Commit: `8ac4f361a5c4ac798a20e50850448587c319b204`.
- Las acciones del panel Developer ahora usan ancho automático y se ajustan en filas; en móvil se apilan a ancho completo.
- Los botones de la biblioteca de imágenes y la barra de acciones Inbox ya no se expanden innecesariamente; los campos siguen usando el espacio disponible y las pestañas mantienen distribución uniforme.
- Se conservaron los anchos completos de acciones de formulario, navegación y botones explícitamente `.btn-block`.
- `DeveloperPanelUX`: 6/6 PASS. `ButtonWidthPolicy`: 5/5 PASS.
- CI run `43789193097`: SUCCESS — 110 suites, 1,682 pruebas aprobadas, 0 fallos.
- GitHub Pages run `43789192638`: SUCCESS.
- Pendiente Beta: revisión visual de escritorio/móvil y pruebas de teclado/lectores de pantalla.

- Evitar botones excesivamente anchos o de fila completa cuando no sea necesario.
- Usar ancho automático y dimensiones consistentes según la función.
- Permitir ancho completo solo cuando la composición del formulario lo justifique.
- Mantener etiquetas accesibles cuando se utilicen iconos.

### BETA-023 — Formato global de campos descriptivos
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- El modo estricto/avanzado se almacena como configuración global en ScriptProperties del servicio FEEDBACK; el valor predeterminado es estricto.
- Todos los roles autenticados pueden consultar el modo; solo Desarrollador puede modificarlo. FEEDBACK valida el rol y Coordinator coordina la escritura del recurso de configuración.
- El cliente obtiene el modo al iniciar sesión y mantiene solo una caché local; las barras de edición se actualizan tras recibir la configuración.
- La preferencia dejó de presentarse como exclusiva del navegador. No se aplica ningún cambio local como si fuera una configuración global confirmada.
- `RichTextGlobalPreference`: 9/9 PASS. CI run `43789831187`: SUCCESS — 111 suites, 1,691 pruebas, 0 fallos. GitHub Pages run `43789830673`: SUCCESS.
- Pendiente Beta: desplegar FEEDBACK/Coordinator compatibles y validar lectura para todos los roles, rechazo de escritura no Developer, persistencia entre sesiones y actualización de barras.

- Hacer que la preferencia de formato descriptivo sea uniforme en toda la plataforma.
- Solo Desarrollador puede modificar la configuración; los demás roles consumen el formato vigente.
- Evitar estilos o comportamientos exclusivos de una sola vista.

### BETA-024 — Ayuda contextual y textos concisos
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- Se creó `contextual-help.css` como hoja común para los controles `ⓘ` de la vista principal y formularios auxiliares.
- `attachContextualHelp_` y el formulario `add_cortes` usan ahora los mismos selectores, estilos, `role=tooltip`, `aria-controls`, `aria-expanded` y `aria-describedby`.
- Los botones de ayuda quedaron fuera de las etiquetas de campos para evitar contenido interactivo anidado; se conserva apertura por pulsación, cierre fuera/Escape y restauración de foco.
- La hoja se agregó al shell offline del Service Worker. El modal de detalles de vehículos continúa expresamente sin ayudas contextuales.
- Se compactaron etiquetas de campos técnicos sin alterar sus datos ni reglas de validación.
- `ContextualHelpForms`: 16/16 PASS. CI run `43790442965`: SUCCESS — 111 suites, 1,695 pruebas aprobadas, 0 fallos. GitHub Pages run `43790443032`: SUCCESS.
- Pendiente Beta: comprobar visualmente los popovers en tema claro/oscuro, móvil/escritorio, teclado y lectores de pantalla.

- Retirar explicaciones repetitivas, obvias o innecesariamente extensas.
- Mantener visibles etiquetas breves, instrucciones indispensables y advertencias de riesgo.
- Mover el contexto secundario a controles de información `ⓘ` bajo demanda.
- Cada ayuda debe explicar qué hace la función, qué cambia, cuándo usarla y sus restricciones relevantes.
- Las ayudas deben ser breves, específicas, accesibles por pulsación/teclado/lector de pantalla, con foco visible y cierre accesible.
- No añadir `ⓘ` indiscriminadamente. **No añadirlo al modal de detalles de vehículos.**

### BETA-025 — Títulos y nombres largos
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- Títulos, etiquetas, botones y celdas admiten ajuste de línea y ancho flexible; se eliminó el truncado visual de títulos del Inbox y nombres de archivos de imágenes.
- Los nombres de problemas y archivos conservan el valor completo mediante `textContent`; no se recortan ni se modifican los datos almacenados. Se añadió el nombre completo como `title` contextual en el listado de archivos.
- Se conservaron las etiquetas compactas de navegación Developer, con el nombre completo disponible en el atributo `title` y en el contenido accesible.
- `LongNameLayout`: 7/7 PASS. CI run `43790916325`: SUCCESS — 112 suites, 1,702 pruebas aprobadas, 0 fallos. GitHub Pages run `43790916506`: SUCCESS.
- Pendiente Beta: validar nombres extensos reales en móvil/escritorio, tablas, Inbox y biblioteca de imágenes.

- Simplificar títulos, secciones, botones y etiquetas sin perder identificación.
- Preservar íntegramente los nombres reales de registros, archivos, vehículos y otros datos.
- Evitar desbordamientos mediante ajuste de línea, ancho flexible o detalle contextual; no modificar ni truncar el dato almacenado.
- Toda abreviatura debe ser inequívoca y mantener disponible el nombre completo mediante accesibilidad o detalle.

### BETA-026 — Modal de detalle de corte
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- Se reorganizó la cabecera y barra de acciones; título y metadatos quedan separados del área de edición.
- Los campos de versión, encendido, rango de años, categoría y VIN se agrupan en una cuadrícula de dos columnas, con una columna en móvil. Nota y VIN ocupan el ancho disponible cuando corresponde.
- Se añadieron asociaciones `label`/`id` y nombres accesibles a las acciones. Se mantienen permisos, guardado, edición, impresión y cierre.
- La edición ya no espera la respuesta remota de las opciones: abre inmediatamente y completa los selectores al resolverse la promesa compartida, preservando el valor actual.
- Se ajustaron imagen, aviso, corte recomendado y acordeones. No se añadieron ayudas `ⓘ` al modal de detalles de vehículos.
- `CutDetailModalLayout`: 8/8 PASS. CI run `43791647009`: SUCCESS — 113 suites, 1,710 pruebas aprobadas, 0 fallos. GitHub Pages run `43791646615`: SUCCESS.
- Pendiente Beta: validar interacción real, velocidad con latencia de red, carga de opciones, guardado, permisos y distribución en móvil/escritorio.

- Reorganizar jerarquía, distribución y densidad para reducir saturación.
- Agrupar campos y acciones relacionados; usar pestañas solo si mejoran la navegación.
- Mantener las operaciones existentes y sus permisos.
- Revisar tamaños móviles y escritorio.

### BETA-020 — Cierres uniformes
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- La implementación local usa botones accesibles uniformes, foco visible y `prefers-reduced-motion`.
- Validar todos los modales en tema claro/oscuro, móvil/escritorio, teclado, foco, lector de pantalla y navegación Atrás.

### BETA-030 — Navegación del panel Desarrollador
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; VALIDACIÓN VISUAL BETA PENDIENTE.**

- La navegación usa una barra horizontal de cuatro opciones con iconos compactos; la pestaña activa expande su etiqueta.
- Las cuatro opciones son radios nativos asociados a sus labels y a cuatro paneles únicos. La inspección estática no encontró IDs duplicados dentro del modal.
- Respaldos y Base de datos comparten una sola sección; se conserva la agrupación de Diagnóstico, Imágenes y Drive y Sistema.
- Se revisaron jerarquía, nombres accesibles, foco, teclado, navegación History API, confirmaciones destructivas y ayudas contextuales.
- Pruebas locales aisladas: DeveloperPanelUX 7/7, DevToolsModalAccessibility 19/19 y DeveloperPanelCopy 6/6.
- Pendiente Beta: inspección visual real en navegador móvil/escritorio, teclado y lector de pantalla. No se alteraron permisos ni acciones destructivas.

### BETA-031 — Animación del título
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; VALIDACIÓN VISUAL BETA PENDIENTE.**

- El título del modal usa la expansión dev-tools-title-expand; la preferencia prefers-reduced-motion desactiva la animación.
- La etiqueta de la pestaña activa se expande mediante ancho y opacidad; ahora sus transiciones también se desactivan cuando el usuario solicita movimiento reducido.
- Se añadió una regresión específica en DeveloperPanelUX; resultado actualizado: 7/7 PASS.
- Pendiente Beta: comprobar apertura, cambio de pestaña y preferencia de movimiento reducido en navegadores y dispositivos reales.
### BETA-032 — Consola central
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- La consola se mantiene en la parte superior y ocupa la franja objetivo del 50% del modal; el contrato visual existente se conserva.
- Mientras el modal Developer está abierto, `showGlobalError` y `showGlobalNotification` enrutan errores, éxitos y advertencias al registro central, sin mostrar un toast/alerta paralelo.
- Los diagnósticos extensos pendientes se incorporan al abrir la consola; las acciones de copiar registro informan sus resultados en la propia consola y ya no usan alertas nativas.
- Se mantiene el registro accesible `role=log` con `aria-live`; los niveles se distinguen como información, advertencia y error.
- `DeveloperConsoleRouting`: 5/5 PASS. CI run `43792062783`: SUCCESS — 114 suites, 1,715 pruebas aprobadas, 0 fallos. GitHub Pages run `43792061714`: SUCCESS.
- Pendiente Beta: ejecutar operaciones Developer de éxito, error y progreso y comprobar que no aparezcan notificaciones duplicadas.

- Mantener la consola en la parte superior y con la altura objetivo registrada del 50% del modal.
- Centralizar mensajes de éxito, error, progreso y confirmación de las funciones Developer.
- Evitar mensajes paralelos o duplicados en toast/banners para esas mismas operaciones.
- No ocultar errores ni eliminar estados accesibles.

### BETA-033 — Confirmaciones desde consola
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.**

- Las operaciones administrativas solicitan confirmación en la consola Developer y esperan la respuesta en el campo de terminal.
- Se aceptan `y`, `si/sí`, `s` y `ok` como afirmativas; `n` y `no` como negativas, sin distinguir mayúsculas/minúsculas ni acentos.
- Las respuestas vacías o ambiguas no resuelven la solicitud; la operación permanece suspendida. Escape, respuesta negativa o vencimiento de 120 segundos cancelan sin ejecutar.
- Se eliminaron los cuadros nativos `confirm()` de las operaciones administrativas, auditorías, conciliación e historial de imágenes del panel Developer.
- Pruebas locales: `DeveloperConsoleConfirmation` 8/8 PASS. Pendiente comprobar interacción en navegador y operaciones reales en Beta.

### BETA-034 — Mensajes de operaciones
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.**

- Los resultados del gestor de imágenes, acciones individuales/masivas, inventario, organización, auditoría y conciliación se dirigen al registro central Developer.
- Se retiraron `alert()` y `mostrarNotificacion()` de los flujos del gestor y auditoría para evitar avisos paralelos. Se conservan los estados contextuales en la vista.
- Se registran inicio, lotes/progreso, resultado, errores y fallos parciales; cada archivo fallido conserva nombre y motivo.
- La conciliación informa cantidades, referencias, escritura verificada y resultado de rollback. No se presenta una simulación como escritura.
- Prueba específica: `DeveloperOperationMessages` 5/5 PASS. Pendiente comprobar operaciones y ausencia de duplicados en navegador Beta.

### BETA-035 — Textos del panel Desarrollador
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE VALIDACIÓN VISUAL BETA.**

- Se compactaron títulos, secciones, etiquetas y acciones sin cambiar sus IDs ni funciones.
- Las explicaciones secundarias se movieron a ayudas contextuales `ⓘ` con botones accesibles, estado expandido, panel asociado, cierre por Escape y estilos responsive.
- Se conservaron visibles estados operativos y advertencias esenciales; el modal de detalle de vehículos no recibió ayudas nuevas.
- Se incluyeron los modales auxiliares de biblioteca y auditoría de imágenes.
- CI run `43794520964`: SUCCESS — 117 suites / 1,734 pruebas / 0 fallos. `DeveloperPanelCopy`: 6/6 PASS. GitHub Pages run `43794520532`: SUCCESS.
- Pendiente: validar visualmente en Beta los textos, ayudas y distribución responsive con teclado y lector de pantalla.

**Alcance UX confirmado:** la organización integral del modal Desarrollador, la política de nombres largos, los textos concisos y las ayudas `ⓘ` se implementan dentro de BETA-021–026 y BETA-030–035. No abrir tareas paralelas ni reabrir GP-DEV-UX-01, cuyo alcance original está completado.

---

## 2. Inbox, comunicaciones y modales de operación

### GP-INBOX-ORDER-01 — Orden del historial
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- Validar lectura, orden, refresco y marcador de lectura en el deployment y navegador Beta.
- Probar fechas iguales o no monotónicas, paginación y recuperación de caché en escritorio y móvil.

### GP-INBOX — Diagnóstico funcional end-to-end
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.**

- Auditoría del recorrido UI → wrapper API → dispatcher FEEDBACK → Coordinator → InboxConversations → Spreadsheet.
- Se revisaron carpetas, filtros, destinatarios, carga de mensajes, lectura, paginación, orden canónico, caché por sesión, roles, actor central e idempotencia.
- Ningún handler crea o inicializa hojas automáticamente. Las cuatro hojas principales deben existir y coincidir con el contrato; las preferencias son opcionales para lectura y obligatorias para acciones que las modifican.
- Se agregaron validaciones de integridad para IDs, referencias huérfanas, estados de participantes, contador y último mensaje. Los datos de participantes dañados ya no se ocultan silenciosamente.
- Pruebas locales aisladas: InboxConversations 59/59, InboxUi 31/31, InboxRoleContract 20/20, InboxAuditTrail 15/15, InboxCachePagination 5/5 y paginación 4/4. Total: 134 comprobaciones PASS.
- Se ejecutaron en runtime JavaScript con dependencias simuladas; Node.js CLI no se ejecutó y GitHub Actions no pudo confirmarse desde el conector.
- Pendiente Beta: contrastar versiones y respuestas reales de FEEDBACK/Coordinator, esquema y datos Spreadsheet, roles de cuentas Beta y comportamiento en dispositivos. No se modificaron servicios desplegados ni datos externos.

### GP-RBAC-02 — Inbox para usuarios técnicos
**Estado: CONTRATOS LOCALES COMPLETADOS; PENDIENTE BETA.**

- Validar Técnico y Técnico exterior, destinatarios permitidos y consulta al Desarrollador.
- Comprobar configuración y coincidencia de secretos FEEDBACK/Coordinator del mismo entorno.
- Confirmar rechazo backend de acciones privilegiadas.

### Modal de detalle de Cortes — rendimiento
**Estado: OPTIMIZACIÓN LOCAL DE DROPDOWNS COMPLETADA; PENDIENTE BETA.**

- Medir tiempo desde apertura del detalle hasta que los controles de edición estén disponibles.
- Confirmar que la precarga de dropdowns y la lectura acotada de CATALOG están desplegadas.
- Verificar que la edición no espere persistencia IndexedDB opcional ni solicitudes redundantes.

---

## 3. Developer, ADMIN, Google Drive e imágenes

### BETA-010 — Borrado de logs
**Estado: CONTRATOS LOCALES COMPLETADOS; PENDIENTE BETA.**

- Validar `clearActivityLogs` y `clearSensitiveLogs` con rol Desarrollador.
- Confirmar respuesta, conteos y alcance exacto de los registros eliminados.
- Comprobar rechazo para otros roles y conservar confirmación de operación.

### BETA-011 — Auditoría de carpeta/Drive
**Estado: IMPLEMENTACIÓN Y CONTRATOS LOCALES COMPLETADOS; PENDIENTE BETA.**

- Ejecutar auditoría en una copia aislada con Coordinator y ADMIN compatibles.
- Verificar permisos de lectura, cursor, reanudación, tiempos y resultados.
- No ejecutar sobre Drive productivo.

### BETA-012 — Imágenes históricas/reemplazadas
**Estado: IMPLEMENTACIÓN LOCAL Y OPTIMIZACIÓN COMPLETADAS; PENDIENTE BETA.**

- Validar consulta del historial, permisos, esquema real de `Imagenes_Reemplazadas` y referencias activas.
- Confirmar que la lectura histórica no concede permisos de recuperación, movimiento o eliminación.
- Medir tiempos con Drive/Spreadsheet de prueba.

### BETA-013 — Concurrencia ADMIN
**Estado: CONTRATOS LOCALES COMPLETADOS; PENDIENTE BETA.**

- Medir lecturas simultáneas de historial, almacenamiento y carpetas mientras se ejecuta el escáner.
- Confirmar que lecturas compatibles no se bloqueen innecesariamente y que escrituras compartidas permanezcan coordinadas.

### BETA-014 — Auditoría de acciones Developer
**Estado: AUDITORÍA ESTÁTICA Y CONTRATOS LOCALES COMPLETADOS; PENDIENTE BETA.**

- Validar acciones positivas y negativas por rol mediante HTTP en el deployment Beta.
- Confirmar matriz, frontend, router, Coordinator y handler; no depender solo de ocultar botones.

### GP-DEV-01 — Acceso al panel Developer
**Estado: CORRECCIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- Probar apertura con login nuevo y sesión restaurada, usando el contexto ID/id.
- Confirmar que no se agrega una petición AUTH redundante y que las acciones ADMIN siguen autorizándose en backend.

### GP-ADMIN-01/02 — Escáner e inicialización de historial
**Estado: CORRECCIONES LOCALES COMPLETADAS; PENDIENTE BETA.**

- Validar inventario e historial durante la ejecución concurrente del escáner.
- Actualizar solo deployments Beta autorizados de Coordinator y ADMIN.
- Ejecutar inicialización idempotente en una Spreadsheet Beta desechable.
- No inicializar ni reparar estructuras reales a ciegas ni tocar producción.

### GP-IMG-DATA-01 — Conciliación Drive ↔ Spreadsheet y ACL
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Se completó el flujo local de auditoría ACL por archivo y cadena de carpetas: solo `anyone/reader` con `allowFileDiscovery=false` cumple la política de acceso por enlace; acceso indexable, escritura pública y ACL no verificable se bloquean.
- La comparación cubre coincidencias exactas, referencias activas en otras celdas/hojas, historial, duplicados, destinos ocupados, archivos faltantes, papelera, ubicaciones externas y ambiguas.
- El detalle de referencias faltantes se limita a 200 elementos sin perder el conteo total; la aplicación comprueba el conteo completo y no depende del detalle truncado.
- La aplicación exige respaldo de Spreadsheet completo, privado y asociado a la sesión Developer; verifica manifiesto, fingerprint del respaldo y del origen, auditoría vigente, digest y aprobación explícita. Conserva read-back, auditoría de cambios y rollback condicionado.
- La UI persiste y reanuda simulaciones por cuenta/auditoría/digest; no escribe durante el dry-run ni cambia ACL o archivos.
- Pruebas locales CI Node.js 22: `CortesImageReconciliation` 28/28, `CortesImageReconciliationApply` 15/15, `CortesImageReconciliationUI` 13/13 y `AdminImageScanCoordinatorContract` 1/1 PASS. CI run `43798680601`: SUCCESS — 117 suites / 1,760 pruebas / 0 fallos.
- Pendiente Beta: validar ACL y herencia reales con Drive API habilitada, inventario/Spreadsheet de copia autorizada y flujo de respaldo/aplicación en entorno aislado. No se desplegó Apps Script ni se modificaron Drive, ACL, Spreadsheet o datos externos.
- Cualquier escritura de conciliación continúa requiriendo respaldo, dry-run y aprobación explícita del Desarrollador.

### GP-BETA-06 — suggestYear y cobertura de acciones protegidas
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Se verificó la ruta autenticada de `suggestYear`: la identidad y el rol proceden del actor central de FEEDBACK; la ruta anónima conserva el identificador no verificado, aplica límite de 30 solicitudes por hora y no puede modificar automáticamente el catálogo.
- Se aisló el conteo de votos positivos verificados. El umbral de ampliación automática es 3 usuarios verificados distintos; duplicados del mismo actor, aportes anónimos, respuestas negativas y votos de otro vehículo/año no cuentan.
- La auditoría de routers identificó `benchmarkPasswordKdf` como acción de solo lectura que aún consultaba localmente `Users/ActiveSessions`. Se incorporó a la ruta de lectura compartida AUTH y a la política Coordinator con lectura de `SESSION_CONTEXTS`, sin escritura adicional de actividad. El handler consume `requireSharedAuthActor_` y ya no revalida localmente la sesión.
- Se revisaron AUTH, USERS, FEEDBACK, WRITE, ADMIN, UTILITIES y CATALOG. Las operaciones protegidas quedan cubiertas por lease/actor central; las excepciones son endpoints de validación de sesión, salud y lecturas públicas documentadas, además de la ruta anónima limitada de suggestYear. No se detectó otro handler protegido fuera del coordinador.
- Pruebas: `SuggestYearCoordinatorSession` 2/2, `SuggestYearVoteThreshold` 6/6, `PasswordKdfBenchmark` 5/5, `ActionDispatchContract` 12/12 PASS. GitHub Actions Node.js 22 run `43799503142`: SUCCESS — 118 suites / 1,765 pruebas / 0 fallos.
- Pendiente Beta: validar las rutas con despliegues AUTH/FEEDBACK/Coordinator actualizados y hojas aisladas, confirmar el límite de sugerencias en ejecución real y medir el flujo de aprobación de tres aportantes. No se invocaron deployments ni se modificaron datos externos.

---

## 4. Disponibilidad, catálogo, IndexedDB y PWA

### BETA-001 — Apertura y persistencia IndexedDB
**Estado: CORRECCIÓN LOCAL APLICADA; PENDIENTE BETA.**

- Probar Android/PWA con almacenamiento existente y varias pestañas.
- Confirmar recuperación de apertura bloqueada, timeout acotado y persistencia de catálogo, búsquedas e historial.
- No borrar bases de datos para ocultar errores.

### BETA-002 — Feed incremental y Coordinator
**Estado: RUTA LOCAL REVISADA; PENDIENTE DE VERIFICAR DEPLOYMENT.**

- Confirmar URL y versiones desplegadas de FEEDBACK/Coordinator, cliente y Service Worker.
- Verificar GET de feed con cursor válido sin canal de mutación; las escrituras deben seguir autenticadas.

### BETA-003 — Recursos obsoletos/Service Worker
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- Comparar recursos servidos con la versión de la rama.
- Verificar actualización y caché de Service Worker sin borrar datos locales ni usar `deleteDatabase` como solución.
- Auditoría local 2026-11-17: el patrón de extensiones tenía un escape incorrecto en `service-worker.js`, por lo que no reconocía recursos estáticos atendidos por solicitudes `fetch` sin `destination` ni recursos estáticos del CDN permitido. Se corrigió y se incrementó `gpsepedia-cache-v67` a `gpsepedia-cache-v68`.
- `JS/Tests/ServiceWorkerCache.js` incorpora regresión para JSON local y fuentes CDN. `node --check` de los fragmentos modificados y harness Node.js aislado de política/caché: 4/4 escenarios PASS (JSON local, fuente CDN, endpoint Apps Script excluido y POST excluido). El conector no expone las ejecuciones push de Actions (el estado combinado no devolvió checks), por lo que no se afirma CI aprobada. Comparación de recursos servidos y actualización en navegador/PWA siguen pendientes de Beta.

### BETA-004 — Catálogo remoto ante fallo local
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- Confirmar que el catálogo remoto permanece visible cuando IndexedDB no está disponible.
- Verificar reintentos de persistencia sin bloquear login ni duplicar aperturas.

### GP-CAT-01 — Catálogo cache-first y feed incremental
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- Validar primer arranque, caché válida, deltas, reconexión, múltiples usuarios/dispositivos y recuperación de cursor.
- Confirmar que el contenido cacheado permanece visible mientras la sincronización ocurre en segundo plano.

### GP-PWA-01/02 — Actualización y continuidad PWA
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- Probar PWA instalada, varias pestañas, actualización, recarga manual, offline/reconexión y recuperación tras interrupción.
- Mantener el flujo nativo de actualización; no reintroducir un control manual que contradiga el requisito vigente.

---

## 5. Autenticación, sesión y autorización

### GP-SEC-01 / P1 — Sesión central
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- Validar login, restauración, múltiples pestañas/dispositivos, offline, reconexión, logout individual, revocación global, cambio de rol, expiración y tokens obsoletos.
- Mantener una sola autorización central por operación protegida y evitar prevalidaciones de red redundantes.
- Conservar token, expiración, epoch, revocación y RBAC backend. El estado local nunca autoriza una operación.

### BETA-050 — Revalidación de usuario/rol
**Estado: IMPLEMENTACIÓN LOCAL Y REGRESIÓN COMPLETADAS; VALIDACIÓN BETA PENDIENTE.**

- Confirmar que los handlers reutilizan el actor confiable y no consultan Users/ActiveSessions en cada acción.
- No retirar la barrera central de token, expiración, epoch, revocación ni autorización por rol.

**Adenda de auditoría y corrección raíz — 2026-11-17**

- La auditoría detectó rutas de compatibilidad que, si faltaba el actor adjunto por Coordinator, volvían a consultar localmente las hojas `Users` y/o `ActiveSessions` para autorizar una acción. Estaban en `admin.js`, `feedback.js`, `write.js`, `users.js` y `Utilities.js`.
- Se eliminaron esos fallbacks y sus auxiliares de búsqueda/expiración/actividad. Los helpers protegidos ahora exigen `payload.__sharedSessionActor` con identidad, rol y epoch válidos; si falta, rechazan la acción sin realizar otra autenticación local.
- WRITE retiró los esquemas de columnas de Users/ActiveSessions que solo existían para esa verificación duplicada.
- USERS conserva una lectura puntual de la fila de Users únicamente cuando `updateProfile` necesita localizar el registro que modificará; no se usa para revalidar la sesión o el rol. Las lecturas de Users para construir la respuesta de `getUsers` son acceso funcional a datos, no autenticación.
- Se mantiene intacta la autorización central de Coordinator: token, epoch, expiración, revocación y RBAC por operación. AUTH conserva la validación explícita para login/restauración de sesión; no se convierte en una prevalidación de cada acción.
- Pruebas CI `44113573112`: SUCCESS — 138 suites, 2,031 pruebas aprobadas, 0 fallos. Se actualizaron los contratos de WRITE, ADMIN, FEEDBACK, USERS y UTILITIES para simular el actor emitido por Coordinator.
- No se desplegaron proyectos Apps Script ni se ejecutaron pruebas funcionales Beta. La validación remota Beta continúa pendiente.

### BETA-051 — Validaciones duplicadas
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Auditoría de los módulos Frontend, HTML y servicios: no hay llamadas periódicas a `touchSession`; las operaciones protegidas usan el actor central de Coordinator y no hacen una llamada previa a `validateSession`.
- Se detectó y retiró en `JS/Frontend/youtubeUpload.js` una validación de sesión de red antes de consultar/crear la operación de vídeo. `getVideoApprovalByOperation`, `initYouTubeUpload` y `submitVideoForApproval` ya exigen sesión mediante FEEDBACK/Coordinator; la validación previa duplicaba un viaje de red sin cerrar una condición de carrera adicional.
- Se conserva la comprobación local de identidad/token durante el flujo de subida para detectar cambios de sesión mientras se prepara la operación.
- Se conserva `validateSession` en `HTML/users.html` únicamente como recuperación cuando falla un cambio del propio rol; no es una prevalidación de cada acción.
- La validación de sesión al iniciar/restaurar la aplicación se mantiene separada y con caché local; la ruta `validateSession` sigue siendo el mecanismo específico de restauración, no un paso previo de cada botón.
- Se confirmó que las demás acciones protegidas no invocan AUTH/validateSession por separado: Coordinator valida token, epoch, expiración y revocación, y los handlers consumen el actor confiable.
- Prueba `VideoApprovalClientContract`: 10/10 PASS. GitHub Actions Node.js 22 run `43799943070`: SUCCESS — 118 suites / 1,765 pruebas / 0 fallos.
- Pendiente Beta: medir tiempos reales de inicio de subida y confirmar con deployments FEEDBACK/Coordinator que no se requiere prevalidación adicional. No se modificaron deployments ni datos externos.

### BETA-052 — Persistencia y recuperación de sesión
**Estado: IMPLEMENTACIÓN LOCAL REPORTADA; PENDIENTE BETA.**

- Probar navegación, modales, recarga, reconexión, varias pestañas, logout y revocación.
- Confirmar restauración sin pedir credenciales de nuevo mientras la sesión siga vigente.

### Aviso obligatorio por dispositivo
**Estado: IMPLEMENTACIÓN LOCAL REPORTADA; PENDIENTE BETA.**

- Aceptar, cerrar sesión y volver a entrar en el mismo navegador; el aviso no debe repetirse.
- En un perfil nuevo debe aparecer una vez y no reaparecer al abrir nuevamente la plataforma.
- Confirmar que sesión inválida, expirada o revocada no puede aceptar ni acceder al catálogo.
- La comprobación real requiere deployments Beta compatibles de AUTH, Coordinator y ADMIN.

---

## 6. Contraseñas, identificadores y migraciones de datos

### GP-DATA-01 — Hash y migración de contraseñas
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- Medir `benchmarkPasswordKdf` en Apps Script Beta y fijar el coste definitivo; 12,000 iteraciones es provisional hasta obtener mediciones.
- Ejecutar dry-run de migración de contraseñas heredadas y verificar conteos.
- No ejecutar migración de escritura productiva sin autorización, respaldo y procedimiento aprobado.
- Mantener login ágil, hashes con salt y compatibilidad; no añadir pasos interactivos ni aumentar el coste por iniciativa propia.

### GP-DATA-02 — IDs backend y migración de fórmulas
**Estado: MOTOR Y PRUEBAS LOCALES COMPLETADOS; PENDIENTE BETA.**

- Ejecutar auditoría de solo lectura en copia Beta y revisar fórmulas, patrones, valores calculados, duplicados, ausentes y referencias.
- Mostrar por hoja/columna encabezado, letra/índice, fórmula y valor resultante.
- Preservar exactamente prefijos, padding, mayúsculas/minúsculas, valores y referencias existentes.
- No inferir formatos no reconocidos ni asignar IDs Relay sin definir su patrón y escritor.
- Resolver conflictos por registro sin renumerar ni alterar datos no afectados.
- Ejecutar dry-run, snapshot/manifiesto, migración por lotes, read-back y rollback condicionado a huellas en copia Beta.
- Migrar usuarios, vehículos, tutoriales, problemas y Relay solo tras aprobar el reporte real. No modificar datos productivos.

---

## 7. Google Drive, almacenamiento y telemetría

### BETA-040/041 — Umbral crítico de almacenamiento
**Estado: IMPLEMENTACIÓN LOCAL REPORTADA; PENDIENTE BETA.**

- Validar umbral del 80%, porcentaje/estado visual y alerta a Inbox/Consola.
- Probar valores bajo, igual y sobre el umbral; evitar alertas repetidas o duplicadas.

### BETA-042 — Servicio Legacy
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Auditoría de los servicios versionados, Frontend, HTML, API/action map, contratos, pruebas, documentación operativa y workflows.
- No existen servicio, endpoint, acción, ruta de frontend ni consumidor activo para LEGACY. Se retiraron `logFrontend`, `SCRIPT_URL` y `remoteLog`; los errores del navegador permanecen en consola local.
- `ACTION_TO_SERVICE_MAP` y `SERVICE_HEALTH_CONTRACTS` contienen únicamente los siete servicios vigentes. `ActionDispatchContract` confirma que no hay rutas LEGACY.
- `SERVICE_HEALTH.md` ya no incluye LEGACY como servicio verificable; conserva una nota explícita de retirada sin endpoint ni solicitudes de red.
- Las referencias históricas de Auditoría/checkpoint se preservan como evidencia; no se borraron registros ni datos históricos.
- `ServiceHealthContract`: 17/17 PASS; `ActionDispatchContract`: 12/12 PASS. GitHub Actions Node.js 22 run `43800322470`: SUCCESS — 118 suites / 1,765 pruebas / 0 fallos.
- Pendiente Beta: confirmar que no existe deployment Legacy activo en la plataforma externa y que los navegadores no emiten solicitudes residuales. Esta verificación externa no bloquea el cierre local.

### BETA-043 — Tráfico global por servicio
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Coordinator agrega en ScriptProperties buckets horarios de 24 horas por servicio. Solo cuenta operaciones protegidas que obtuvieron lease; los reintentos con el mismo `requestId` no duplican el conteo.
- El registro se realiza dentro de la solicitud existente a Coordinator, bajo lock y como best-effort; no añade una llamada de red independiente por acción ni bloquea la operación si falla la telemetría.
- `ADMIN/getServiceTraffic` es de solo lectura y queda reservado al rol Desarrollador. Devuelve agregados sin identidad ni datos de sesión; excluye la propia consulta, lecturas públicas no coordinadas, feed público y sondeos de salud.
- Estado histórico de BETA-043: la UI separaba el agregado global de la actividad local del navegador (15 minutos, máximo 600 eventos). La ayuda aclaraba que el agregado global no representa todas las solicitudes HTTP.
- Adenda 2026-11-17 / GP-DEV-TRAFFIC-GLOBAL-02: se retiró el panel local y el dashboard usa solo Coordinator; el detalle muestra conteos globales de 1 h, 6 h y 24 h. La cobertura sigue limitada a operaciones protegidas con lease; CATALOG y otras rutas públicas/no coordinadas no se cuentan. Ver la tarea de seguimiento al final del registro.
- Pruebas: `ServiceTrafficAdminContract` 20/20; `ServiceMetricsTelemetry` 10/10; Coordinador compartido 54/54. GitHub Actions Node.js 22 run `43807777744`: SUCCESS — 119 suites / 1,790 pruebas / 0 fallos.
- GitHub Pages run `43807776532`: SUCCESS.
- Pendiente Beta: validar la agregación entre deployments reales, permisos de Desarrollador y evolución de los buckets con tráfico de la plataforma. No se desplegaron Apps Script ni se modificaron ScriptProperties o datos externos.

---

## 8. Regresión integral y validación de campo

**Estado: REGRESIÓN INTEGRAL LOCAL COMPLETADA; VALIDACIONES DE CAMPO PENDIENTES DE BETA.**

- GitHub Actions Node.js 22 en el HEAD validado: 119 suites / 1,790 pruebas / 0 fallos; comprobación de sintaxis aprobada.
- GitHub Pages build/deployment: SUCCESS. La rama base permanece intacta.
- La integración con deployments Apps Script, datos/ACL reales, navegador y dispositivos se conserva como validación Beta; no se simula ni se contabiliza como trabajo local pendiente.

- Ejecutar sintaxis y pruebas integrales Node.js en el HEAD final.
- Confirmar GitHub Actions asociado al commit y corregir regresiones reproducibles.
- Revisar el diff completo, referencias, contratos, permisos, concurrencia, idempotencia y compatibilidad.
- Probar Inbox en escritorio/móvil, tema claro/oscuro, accesibilidad, navegación Atrás y sesiones.
- Probar PWA, rendimiento, offline/reconexión, varias pestañas y actualización en dispositivos reales.
- Validar HTTP positivo/negativo por rol para ADMIN, FEEDBACK, WRITE, AUTH y USERS.
- Validar ACL de Drive, historial, auditoría, almacenamiento y migraciones en una copia Beta autorizada.
- No presentar pruebas locales o simulaciones como evidencia de deployment, Apps Script, Drive, Spreadsheet o dispositivos reales.

## Preparación y límites para Beta

Antes de cada bloque de pruebas Beta, desde la raíz del clon autorizado:

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

No usar `reset --hard`, `clean`, force push ni comandos que descarten cambios. No ejecutar pruebas destructivas o migraciones en producción. La rama base `GPSpedia2.2.5` permanece protegida e intacta.


### GP-UX-USERS-02 — Acciones de usuarios en una sola fila móvil
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**
- Alcance exclusivo: `HTML/users.html` y pruebas frontend relacionadas. No modificar Apps Script, servicios, autenticación ni comportamiento backend.
- Criterios: icono de cierre de sesiones con nombre accesible; los tres botones del usuario se mantienen en una sola fila; compactar botones, separación y anchos de columna para evitar scroll horizontal; conservar condiciones de visibilidad y manejadores actuales.
- Validación local: contrato responsive, sintaxis del módulo y revisión del diff. La inspección visual en dispositivos reales queda para Beta.
- Implementación: icono de salida accesible, tres acciones en un mismo contenedor flex horizontal y compactación responsive (botones 34 × 36 px en móvil; columna Acciones 46–48 % según ancho).
- Validación local: ResponsiveFormsUsers **16/16 PASS**; ButtonWidthPolicy **5/5 PASS**; GitHub Actions Node.js 22 **SUCCESS — 128 suites / 1,897 pruebas / 0 fallos** (run `43879864027`). GitHub Pages build/deployment **SUCCESS** (run `43879862392`).
- Se preservaron permisos, IDs, manejadores y comportamiento de resetUserSessions. No se modificaron servicios Apps Script, backend, datos ni deployments.
- Pendiente Beta: inspección visual en dispositivos reales, especialmente anchuras pequeñas, nombres largos y rol Desarrollador; no bloquea el cierre local.


### GP-UX-INBOX-RBAC-01 / GP-UX-RELAY-HEADER-01 — Control visual por rol y encabezados
**Prioridad: P1 · Estado: IMPLEMENTACIÓN FRONTEND Y VALIDACIÓN AUTOMÁTICA COMPLETADAS; ACEPTACIÓN VISUAL BETA PENDIENTE.**
- Aplicar la matriz de secciones Inbox indicada por el usuario para Desarrollador, Jefe, Supervisor, Técnico y Técnico Exterior.
- Técnicos: mostrar General y sus reportes propios; consumir la acción existente getMyProblemReports, sin cambiar backend.
- Jefe: General, Contáctanos y Reportes. Supervisor: General y Reportes. Desarrollador: todas las secciones.
- Mantener ocultos y fuera del flujo los botones no autorizados, sin huecos.
- Nuevo mensaje flotante inferior derecho, etiquetas Nuevo/Buscar y control Salir en el compositor.
- Alinear título Relay a la izquierda y X arriba a la derecha fuera del flujo del título.
- Validación pendiente: ejecutar InboxUi, CutDetailModalLayout, regresión Node y revisar CI; después inspección visual Beta.

- Cierre local 2026-11-16: GitHub Actions Node.js 22 **129 suites / 1,904 pruebas / 0 fallos** (run `43890221048`); InboxUi 38/38; CutDetailModalLayout 10/10; ServiceWorkerCache 9/9; OfflineBrandAssets 4/4. GitHub Pages build/deploy SUCCESS (run `43890220482`).


---

## Cierre local de solicitudes GP-UX — 2026-11-16

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- **GP-UX-PYS-ADD-MODEL-CARD-01:** altura de tarjeta «Agregar Modelo» igualada a 140 × 120 px; CI PysModalNavigation 10/10.
- **GP-DASH-ATTR-01:** se confirma separación por coma y saltos de línea; la prueba de aportes publica 1/1 PASS.
- **GP-UX-INBOX-02 / GP-UX-INBOX-SEARCH-DISMISS-01:** búsqueda activable/desactivable por lupa y cierre al usar otra acción o cambiar de sección; búsqueda global sobre todas las bandejas/categorías.
- **GP-UX-INBOX-CACHE-SEARCH-01:** caché de páginas por identidad de sesión, carpeta, categoría, consulta y cursor; apertura cache-first, refresco silencioso y preservación de la bandeja si falla la red.
- **GP-UX-VIDEO-OWN-STATUS-01:** técnicos y técnicos exteriores consultan únicamente sus propios vídeos con estado y razón de rechazo en Solicitudes; acciones administrativas continúan reservadas a Desarrollador.
- **Validación CI:** run 43906071405 SUCCESS — 129 suites / 1,899 pruebas / 0 fallos. Pages run 43906069774 SUCCESS.
- **Beta pendiente:** revisión visual en dispositivos, usuarios reales y servicios Apps Script/Spreadsheet en entorno autorizado. Sin despliegues ni alteración de datos productivos.

- Adenda 2026-11-16: posición final del botón flotante Nuevo ajustada a 64 px sobre el pie/paginación y safe-area móvil; contrato InboxUi y App Shell v41 incorporados. CI pendiente de esta adenda.

- Validación final posterior al ajuste del botón flotante: CI run 43907008784 SUCCESS — 129 suites / 1,900 pruebas / 0 fallos; GitHub Pages run 43907008756 SUCCESS. El espacio inferior del selector de secciones se redujo de 20 px a 6 px (70 %) y los carruseles mantienen separación uniforme.


---

## Adenda correctiva — GP-UX-CUT-MODAL-01 — 2026-11-16

**Estado local:** CORRECCIÓN IMPLEMENTADA Y VALIDADA EN CI. **Beta visual:** PENDIENTE.

- Corregir la regresión en móvil/PWA que desplazaba los botones compartir, editar e imprimir debajo del logo.
- Mantener las tres acciones agrupadas en la parte superior derecha, inmediatamente a la izquierda del botón cerrar; el logo/modelo permanece en el área izquierda sin empujar ni envolver las acciones.
- Ampliar el logo de marca un 20 % respecto a las dimensiones anteriores: escritorio 48 → 57.6 px; móvil 38 → 45.6 px.
- Reducir moderadamente los botones: 34 × 34 px en escritorio y 32 × 32 px en móvil.
- Invalidar el App Shell previo para que PWA reciba el CSS corregido.
- GitHub Actions Node.js run `43913616427`: SUCCESS; incluye la suite de regresión del repositorio. En Beta comprobar viewport móvil estrecho, PWA instalada, orientación vertical/horizontal, roles con y sin permisos de editar/imprimir, y modelos cortos/largos.



### Reapertura — GP-UX-CUT-MODAL-01 — 2026-11-16
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

La corrección anterior no resolvió el defecto en todos los estilos efectivos: una declaración flex posterior anulaba la cuadrícula y las pruebas no detectaban la cascada conflictiva. Se retiró el bloque legado, se fortaleció CutDetailModalLayout.mjs para rechazar overrides flex/order y se incrementó el App Shell a v43 con pruebas de caché actualizadas. Mantener el criterio: compartir, editar e imprimir en una sola fila, inmediatamente a la izquierda del cierre; logo +20 %; botones compactos sin ocultar acciones. Cerrar localmente solo después de CI aprobado. Aceptación visual en móvil/PWA real queda diferida a Beta.


## ADENDA DE REQUISITOS VISUALES — 2026-11-16

### GP-UX-INBOX-FAB-01 — Botón Nuevo independiente de la navegación
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**
- En móvil/PWA, «Nuevo mensaje» debe ser un botón flotante cuadrado, no una acción de ancho completo.
- Debe quedar anclado abajo a la derecha, inmediatamente encima de la flecha de página siguiente, sin cubrir botones, paginación ni área segura del dispositivo.
- La regla responsive de la rejilla de carpetas debe excluir explícitamente el botón flotante.
- Prueba anti-regresión: comprobar dimensiones cuadradas, selector excluido de width:100%, posición y safe-area.

### GP-UX-CUT-MODAL-02 — Imagen de marca ampliada y título en una sola línea
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**
- Aumentar un 20 % la imagen real del logo (no un contenedor): 69.12 px en escritorio y 54.72 px en móvil.
- Mantener el nombre del modelo a la derecha del logo en la misma línea; si el ancho disponible no basta, truncar visualmente el texto sin colocarlo debajo.
- Conservar el grid de acciones compartir/editar/imprimir y el botón de cierre sin alterar sus posiciones.


### Validación de cierre local — GP-UX-INBOX-FAB-01 / GP-UX-CUT-MODAL-02
- GitHub Actions Node.js 22 run **43924038989: SUCCESS — 129 suites / 1,903 pruebas / 0 fallos**.
- GitHub Pages run **43924038398: SUCCESS** (build, upload y deploy).
- Código probado en el commit `95dd8205269849344b69b77e22898e4763096830`.
- Se consideran completadas localmente con validación visual diferida a Beta: probar en Android/PWA instalada la posición del botón Nuevo, la no superposición con la paginación, el tamaño del logo y la permanencia del modelo en una sola línea.


## ADENDA — GP-UX-CUT-MODAL-03 / GP-UX-USERS-03 — 2026-11-16
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.**
- Modal de corte: separar el logotipo (columna izquierda, más grande) del nombre del modelo. El nombre queda a la derecha, debajo de la fila superior de acciones y alineado al borde inferior del logo. Compartir, imprimir, editar/guardar y cerrar permanecen en la parte superior derecha, sin cambiar RBAC ni handlers.
- users.html: encabezados exactos «Usuario», «Nombre», «Rol» y «acciones». La tabla usa el 100 % del ancho de su contenedor, con columnas fijas y sin scroll horizontal. La columna Rol reserva ancho suficiente y no divide nombres de rol a mitad de palabra; los botones de acciones se compactan en pantallas muy estrechas.
- Pruebas anti-regresión: CutDetailModalLayout, ResponsiveFormsUsers y ButtonWidthPolicy. App Shell actualizado a v45 porque style.css y HTML/users.html forman parte de la caché.


### Validación local y cierre — GP-UX-CUT-MODAL-03 / GP-UX-USERS-03
- GitHub Actions Node.js 22, run `43939461276`: **SUCCESS — 129 suites / 1,904 pruebas / 0 fallos**.
- Pruebas específicas: CutDetailModalLayout **14/14**, ResponsiveFormsUsers **17/17**, ButtonWidthPolicy **5/5**, ServiceWorkerCache **10/10**, OfflineBrandAssets **4/4**.
- Comprobación sintáctica de los módulos JavaScript modificados: **SUCCESS**.
- GitHub Pages run `43939460856`: **SUCCESS** (build y deploy).
- Código validado en commit `07eca822c4fd06b5ebeb605256f918069c96d798`.
- Pendiente diferido a Beta: inspección visual en Android/PWA instalada, viewport estrecho y escritorio; verificar que el logo se muestra completo, que las acciones quedan en la parte superior derecha, que el modelo alinea su base con la imagen y que las cuatro columnas de usuarios usan todo el ancho sin scroll horizontal. No se afirma haber realizado esa inspección real.

### GP-UX-INBOX-DESKTOP-02 — Scroll, compositor y barra enriquecida
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA (2026-11-16).**
- En escritorio, el formulario de nuevo mensaje debe permitir desplazamiento vertical real y mantener Salir/Enviar accesibles.
- Reducir la altura de la bandeja vacía para que no reserve un panel central innecesariamente grande.
- Evitar que la lupa se recorte dentro del botón de búsqueda.
- En Nuevo mensaje, Plantilla y Categoría comparten una fila de dos columnas inmediatamente encima del editor; si el rol no dispone de plantillas, Categoría ocupa el ancho completo.
- Integrar la barra de texto enriquecido compartida tanto en nuevo mensaje como en respuestas, respetando el modo configurado y sanitizando el HTML al mostrar mensajes.
- Mantener contratos, borradores, idempotencia, destinatarios, permisos y acciones actuales. No modificar backend ni servicios Apps Script.
- Evidencia: Images/tests/modal_inbox_bandeja.png e Images/tests/modal_inbox_reportes.png.
- App Shell v47; toolbar avanzada forzada solo en Inbox, sanitización avanzada específica y pruebas InboxUi, ServiceWorkerCache y OfflineBrandAssets actualizadas. CI y aceptación visual Beta pendientes.

- Adenda: el Inbox usa la barra avanzada completa independientemente de la preferencia simplificada global; el resto de los editores conserva la configuración del usuario. La sanitización avanzada se aplica solo al contenido de Inbox. App Shell v47.

- Adenda de validación: sintaxis estática 4/4 y verificaciones específicas 15/15 PASS. La suite Node.js integral no se marca aprobada porque GitHub no ha devuelto un estado de CI para el HEAD actual.


---

## GP-UX-CUT-MODAL-04 / GP-UX-TUTORIAL-MODAL-01 — 2026-11-16
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA (2026-11-16).**

- Modal de corte: divisor azul independiente debajo del conjunto logo/modelo, extendido por el ancho útil del modal con margen lateral y separación superior.
- Permitir que el drop-shadow del logotipo se renderice sin recorte y conservar una separación mínima entre logo y modelo.
- Aumentar el tamaño del nombre del modelo y de los botones cerrar, compartir, editar e imprimir, alineándolos con el estándar reforzado del encabezado Relay.
- Modal de tutoriales: título con salto únicamente entre palabras y botón de cierre anclado a la esquina superior derecha.
- Preservar handlers, permisos, navegación y datos. No modificar servicios Apps Script ni deployments.
- App Shell v48; pruebas CutDetailModalLayout, ServiceWorkerCache y OfflineBrandAssets actualizadas.
- CI automatizada y aceptación visual Beta pendientes de evidencia.


### Adenda de validación — GP-UX-CUT-MODAL-04 / GP-UX-TUTORIAL-MODAL-01
- Inspección estática dirigida sobre los archivos publicados: **9/9 comprobaciones PASS** (divisor, márgenes, overflow de logo, tipografía, dimensiones de acciones, cierre tutorial, ajuste entre palabras y App Shell v48).
- El estado combinado consultado para el HEAD no expone checks; el endpoint de workflow disponible solo devuelve ejecuciones asociadas a pull requests. No se afirma CI aprobada.
- El intento de clonar la rama para ejecutar Node.js localmente no pudo resolver github.com. Las suites Node.js completas quedan pendientes de un entorno con acceso al repositorio o de evidencia de GitHub Actions.
- Aceptación visual escritorio/Android/PWA pendiente de Beta.


### Adenda de implementación — GP-UX-INBOX-DESKTOP-02 / GP-UX-CUT-MODAL-05 — 2026-11-16
- Publicados cambios de toolbar compacta iconográfica, menús desplegables, menú apilado de categoría/plantilla, editor integrado, búsqueda expandible y divisor simétrico.
- App Shell actualizado a v49.
- CI run 43946240367 detectó una expresión regular inválida en una prueba nueva; corregida en e944a753ceb5a62585fa7bac3349f5f75ccec6ad.
- CI run 43946386787 avanzó hasta InboxUi y detectó un contrato heredado que esperaba la estructura anterior de toolbar/sanitización; actualizar a la estructura compacta actual y mantener la comprobación de sanitización explícita en modo avanzado.
- Estado EN PROGRESO hasta CI integral aprobada. Beta visual pendiente.

- CI run 43946591177: InboxUi 49/49 PASS; el único fallo de CutDetailModalLayout era una prueba que seleccionaba por lastIndexOf la regla móvil y por ello no encontraba el ancho desktop. Corregir el contrato para comprobar las declaraciones desktop y móvil de forma independiente; la implementación CSS no presentó fallo de sintaxis.


### Cierre local — GP-UX-INBOX-DESKTOP-02 / GP-UX-CUT-MODAL-05 — 2026-11-16
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**
- Barra enriquecida Inbox: una fila compacta con controles iconográficos de igual distribución; tamaño, fuente y listas mediante menús desplegables; categorías y plantillas apiladas en un menú adicional, sin selectores ocupando el ancho de la barra.
- El menú de opciones extra sobrevive a la reconstrucción del toolbar al cambiar la preferencia global. La plantilla sigue oculta para roles sin permiso.
- Buscar expande su etiqueta y resalta el botón mientras la búsqueda está abierta; se contrae al cerrar o cambiar de sección.
- El editor integra visualmente la barra en el borde superior del campo y usa superficie gris suave en tema claro / gris oscuro aclarado en tema oscuro.
- Divisor del modal de corte: margen simétrico de 12 px respecto a ambos bordes útiles, compensando el padding derecho reservado del encabezado (42 px escritorio / 46 px móvil); separación vertical de 7.5 px arriba y abajo.
- GitHub Actions Node.js 22 run 43946839054: **SUCCESS — 129 suites / 1,912 pruebas / 0 fallos**. Específicas: InboxUi 49/49; CutDetailModalLayout 15/15; ServiceWorkerCache 10/10; OfflineBrandAssets 4/4. Sintaxis de módulos modificados aprobada.
- GitHub Pages run 43946839204: **SUCCESS** (build y deploy).
- Pendiente Beta: inspección visual en escritorio, Android y PWA instalada; comprobar anchuras reducidas, desplegables, selector de categorías/plantillas por rol, modo claro/oscuro, búsqueda y divisor en modelos cortos/largos. No se desplegaron servicios Apps Script ni se modificaron datos externos.


---

## Revisión visual adicional — GP-UX-INBOX-DESKTOP-03 / GP-UX-CUT-MODAL-06 / GP-PWA-ZOOM-01 — 2026-11-16

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Inbox: «Salir» y «Enviar mensaje» se muestran en una sola fila, con 64 × 40 px cada uno; «Enviar mensaje» queda a la derecha y conserva su color primario.
- Editor móvil: el botón de opciones de categoría/plantilla queda antes de Negrita; los demás controles conservan su secuencia. El menú se ancla a la izquierda y limita su ancho al viewport para evitar recortes.
- Modal de corte: divisor azul con separación vertical reducida a 4 px arriba y abajo; el nombre del modelo recibe sombra de texto compatible con la del logotipo.
- Zoom: index.html, HTML/users.html y HTML/add_cortes.html restringen el zoom nativo de navegación. El módulo lightbox.js habilita temporalmente el zoom hasta escala 5 y restaura el contenido original del viewport al cerrar. Las imágenes que ya usan lightbox conservan su flujo.
- App Shell actualizado a gpsepedia-cache-v50.
- Pruebas anti-regresión añadidas/actualizadas: InboxUi, CutDetailModalLayout y AntiDebuggingPolicy. No se modifican servicios Apps Script, permisos, datos ni deployments.
- Aceptación visual en Android, escritorio y PWA instalada queda diferida a Beta.

- Validación final: GitHub Actions Node.js 22 run 43955279344 SUCCESS — 130 suites / 1,928 pruebas / 0 fallos; GitHub Pages run 43955278378 SUCCESS. Queda únicamente aceptación visual en escritorio, Android y PWA instalada.

- Se añadió BrowserZoomAccessibility.js al runner integral para verificar las tres páginas con zoom de navegación restringido y la restauración exacta del viewport al cerrar el lightbox.


---

## GP-UX-INBOX-RICH-EDITOR-01 — Barra compacta y edición visual — 2026-11-16
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**
- Reducir la separación entre iconos y el ancho de los controles para que la barra completa quepa en el viewport de móvil/PWA.
- Abrir hacia la izquierda los menús desplegables de listas, marcadores, tamaño y familias de fuentes; limitar el ancho al viewport.
- Reemplazar el área de texto literal por un editor visual contenteditable: negrita, cursiva, subrayado, tachado, color, tamaño, fuentes y listas deben verse aplicados mientras se escribe. Mantener el HTML saneado como contenido persistido/enviado; sanitizar también el contenido pegado.
- Añadir Times New Roman, Verdana, Tahoma, Trebuchet MS, Palatino, Garamond e Impact a la lista permitida de familias nativas.
- App Shell v51; contratos InboxUi, ServiceWorkerCache y OfflineBrandAssets actualizados.
- CI Node.js 22 run 43960366613: **SUCCESS — 130 suites / 1,934 pruebas / 0 fallos**. InboxUi 57/57; CutDetailModalLayout 15/15; ServiceWorkerCache 10/10; OfflineBrandAssets 4/4.
- GitHub Pages run 43960362556: **SUCCESS**.
- Pendiente de Beta: probar en Android/PWA instalada y escritorio la edición real, conservación del cursor al aplicar formato, pegado, listas, menús hacia la izquierda, tema claro/oscuro y viewport estrecho.


---

## Nuevas solicitudes — Panel de actividad, aceptación de términos y precarga del catálogo (2026-11-16)

**Estado global: IMPLEMENTACIONES LOCALES COMPLETADAS CON VALIDACIÓN DIFERIDA A BETA.** GP-DASH-INSIGHTS-01, GP-TERMS-ASYNC-01 y GP-PWA-SPLASH-PRELOAD-01 tienen implementación y regresión local/CI aprobadas. La auditoría transversal P2 de modales fue verificada en Beta y está cerrada. No se modifica la rama base ni se despliegan servicios.

### GP-DASH-INSIGHTS-01 — Dashboard de aportaciones e indicadores de actividad
**Prioridad: P1 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Rediseñar el Panel de Actividad para que sea un tablero de contribuciones y calidad de la información vehicular, no una tabla de texto sin jerarquía.
- Incorporar indicadores resumidos y gráficas legibles: aportaciones por usuario, cortes aportados, vehículos cubiertos, valoraciones de utilidad, confirmaciones/sugerencias de años y actividad reciente.
- Presentar un feed reciente con etiquetas comprensibles para cada tipo de evento, usuario, fecha y vehículo/corte relacionado; no exponer textos técnicos crudos como única descripción.
- Incorporar ranking de cortes/modelos con más valoraciones «útil» y un apartado separado para los casos «no útil» o «no funciona», sin confundir reportes de problemas con votos de utilidad.
- Desglosar confirmaciones de años, sugerencias de ampliación/reducción y aplicaciones de cambios de rango, diferenciando aportes verificados y anónimos cuando el esquema lo permita.
- Mostrar modelos más consultados únicamente si existe una fuente histórica fiable. El campo Cortes.contadorBusqueda está definido en el esquema, pero en la revisión inicial no se encontró un escritor activo que lo incremente; verificar si hay datos históricos utilizables antes de presentarlo como métrica. Si no existe registro fiable, proponer instrumentación de selección/apertura de modelo (nunca cada pulsación de búsqueda) y explicar su coste antes de incorporarla.
- Corregir tablas/columnas que parten palabras: encabezados sin ruptura interna, anchos y layout controlados, texto largo con ajuste entre palabras y presentación móvil adaptativa.
- Reutilizar el resumen existente buildCutContributionSummary_, el endpoint FEEDBACK getActivityLogs y las fuentes actuales Cortes, FeedbackLikes, Feedbacks, FeedbackYearApplications y ActividadUsuario. Validar el significado real de cada columna antes de agregarla.
- Preferir cálculo frontend para los indicadores que ya están completos en el snapshot del catálogo. Para datos que solo existen en Spreadsheet, evaluar extender la respuesta de lectura getActivityLogs en FEEDBACK, con agregaciones acotadas y sin datos personales innecesarios. No crear otro servicio si la acción existente basta.
- Mantener la autorización actual de getActivityLogs (Desarrollador, Jefe y Supervisor). No ampliar roles ni modificar datos históricos.
- Gráficas sin dependencias externas nuevas; incluir estados vacíos, error, carga, accesibilidad y tema claro/oscuro.
- Pruebas: agregación con datos simulados, deduplicación, casos positivos/negativos, años, ranking, límites de lectura, permisos, XSS, responsive y regresión del dashboard.

**Impacto backend preliminar:** las contribuciones y algunos contadores ya están disponibles. Para un desglose histórico fiable de likes, respuestas de utilidad y años, probablemente se requiera ampliar el servicio fuente JS/Services/feedback.js (FEEDBACK), reutilizando getActivityLogs; no implica crear otro servicio ni modificar datos productivos. El ranking de búsquedas no puede darse por válido hasta confirmar quién escribe contadorBusqueda; si no hay escritor, instrumentarlo requeriría una escritura adicional por selección de modelo, con impacto medible en latencia/Spreadsheet y protección contra duplicados.

### GP-TERMS-ASYNC-01 — Aceptación local inmediata y registro remoto en segundo plano
**Prioridad: P1 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Al pulsar «Aceptar», guardar inmediatamente una aceptación local vinculada a usuario, dispositivo y versión de términos; cerrar el aviso sin esperar la red y continuar con el catálogo.
- Enviar acceptTerms en segundo plano, conservar el registro remoto y reintentar silenciosamente cuando corresponda si hay un fallo transitorio.
- Reutilizar la idempotencia ya existente en JS/Services/Auth.js (alreadyAccepted); evitar duplicar escrituras o generar registros de otro usuario/dispositivo.
- Aislar reintentos por identidad y token de sesión; una respuesta tardía de una sesión anterior no puede modificar la sesión actual. No aceptar términos para otra identidad ni debilitar validación central/RBAC.
- No bloquear la interfaz por fallo de red al registrar una aceptación ya realizada por el usuario. Conservar un estado local pendiente y no mostrar un falso mensaje de confirmación remota.
- Preferir no modificar AUTH; cualquier cambio de servicio se justificará solo si las pruebas demuestran que el contrato actual no admite el registro idempotente en segundo plano.
- Pruebas: cierre inmediato, caché por usuario/dispositivo/versión, red lenta/offline, reintento, respuesta tardía, cambio/logout de sesión, versión nueva de términos y ausencia de solicitudes duplicadas.

**Adenda de implementación local — 2026-11-16:** `termsDeviceAcceptance.js` persiste el consentimiento local con estado `pending/synced`; `ui.js` cierra el aviso y continúa sin esperar AUTH, sincroniza en segundo plano y reintenta al recuperar conexión o al abrir la app. Se conserva aislamiento usuario/dispositivo/versión y se descartan respuestas tardías de otra sesión. AUTH no fue modificado. La suite específica `TermsAsyncSync.mjs` cubre 5 escenarios y se integró al runner general; `TermsAcceptance.js` ejecutó 19/19 en harness V8 aislado. Parsing aprobado; falta ejecutar la suite Node.js completa/CI.

### GP-PWA-SPLASH-PRELOAD-01 — Iniciar la carga del catálogo detrás del Splash existente
**Prioridad: P1 · Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Iniciar la preparación/carga del catálogo antes de comenzar el desvanecimiento actual del Splash, de modo que la carga aproveche el tiempo que la pantalla ya permanece visible.
- No modificar diseño, HTML, CSS, animación ni duración del Splash; no esperar a que termine el catálogo para ocultarlo ni añadir tiempo artificial.
- Respetar el bloqueo de términos: no iniciar lectura del catálogo protegido para una sesión que todavía no aceptó la versión vigente. Después de aceptar, iniciar inmediatamente la carga sin esperar la confirmación remota de acceptTerms.
- Conservar cache-first: snapshot completo local inmediato, deltas cuando cursor válido, snapshot completo solo cuando sea necesario; evitar solicitudes duplicadas y no bloquear por IndexedDB lento.
- Mantener la pantalla de carga del catálogo únicamente cuando realmente no haya datos disponibles después del Splash; si la caché es válida, mostrarla al terminar el desvanecimiento.
- No modificar la pantalla Splash ni el Service Worker salvo que la revisión de dependencias demuestre que un recurso nuevo debe incorporarse al App Shell.
- Pruebas: sesión restaurada con caché caliente, primer arranque sin caché, IndexedDB lento/no disponible, términos pendientes/aceptados, aceptación local inmediata, navegación y concurrencia de cargas; comprobar que la duración del Splash no aumente.

**Adenda de implementación local — 2026-11-16:** `showApp()` inicia `loadInitialData()` después de comprobar la aceptación local y antes del fade existente. Se retiraron las llamadas redundantes de AUTH para evitar doble carga. No se modificaron HTML/CSS ni la duración del Splash (500 ms). El test de arranque PWA se amplió a 16 escenarios; parsing aprobado, suite Node.js completa/CI pendiente.

### Orden de ejecución y dependencias
1. Completar la suite Node.js/CI de GP-TERMS-ASYNC-01 y GP-PWA-SPLASH-PRELOAD-01; corregir cualquier fallo local antes de cerrar esas implementaciones. La validación con servicios desplegados y dispositivos reales queda diferida a Beta.
2. Implementar GP-DASH-INSIGHTS-01 después de confirmar el contrato y las fuentes de datos; decidir y documentar qué agregados se pueden obtener sin backend y cuáles requieren extender FEEDBACK.
3. Mantener como validaciones Beta pendientes únicamente las pruebas reales aún no ejecutadas. GP-UX-INBOX-02 ya tiene regresión local/CI aprobada y conserva solo su aceptación visual Beta; la auditoría transversal P2 de modales está verificada en Beta y cerrada.


### Cierre local y preparación Beta — 2026-11-17

**GP-DASH-INSIGHTS-01 — COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**
- Se sustituyó la vista inicial de dos tablas por un resumen con indicadores de vehículos, cortes, valoraciones útiles, respuestas «no útil» y «no funciona»; ranking de cortes con valoraciones útiles y vehículos con respuestas negativas; resumen de confirmaciones/sugerencias/aplicaciones de años y aportes verificados/anónimos; y principales colaboradores.
- El historial de actividad conserva su pestaña, con etiquetas de acción más legibles. Las tablas fijan el layout, evitan romper encabezados internamente y permiten ajustar textos largos en pantallas estrechas.
- FEEDBACK reutiliza getActivityLogs y su autorización existente. La agregación lee de Cortes solo las columnas necesarias, limita Feedbacks y FeedbackYearApplications a sus últimos 500 registros y conserva el feed de actividad limitado a 100 eventos. No se modifican datos históricos ni se crea un endpoint nuevo.
- Los contadores de utilidad proceden de Cortes.utilCorte1/2/3; los casos no útiles/no funcionales se clasifican a partir de las respuestas registradas en Feedbacks y se muestran separados. Las confirmaciones, sugerencias y aplicaciones se distinguen según los campos y estados existentes.
- No se presenta ranking de modelos consultados: no se identificó un escritor activo fiable para contadorBusqueda. La instrumentación por apertura/selección se mantiene fuera de este alcance para no añadir escrituras de Spreadsheet sin medir su coste.
- Renderizado con textContent y DOM APIs; sin interpolación de datos históricos en HTML ni dependencias de gráficas externas.
- Prueba específica GP-DASH-INSIGHTS-01: agregación, ranking, clasificación de años, ventana de lectura y XSS aprobados. CI final run 44006857813: 132 suites, 1,964 pruebas aprobadas, 0 fallos. Sintaxis V8 aprobada.
- Beta pendiente: contraste visual en escritorio y Android/PWA, tema claro/oscuro, tamaños estrechos, accesibilidad/teclado, datos reales de Feedbacks y Apps Script desplegado. Estas validaciones no bloquean el cierre local.

**GP-TERMS-ASYNC-01 — COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**
- Implementación local ya descrita en la adenda anterior; suite CI final aprobada. Pruebas específicas TermsAcceptance 19/19 y TermsAsyncSync 5/5 PASS. Se conserva pendiente la prueba real de sincronización remota y escenarios de dispositivo/navegador en Beta.

**GP-PWA-SPLASH-PRELOAD-01 — COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**
- Implementación local ya descrita en la adenda anterior; PWAStartupScenarios 16/16 PASS y suite CI final aprobada. Pruebas de primer arranque, caché caliente, sincronización e IndexedDB real quedan para Beta.

**Evidencia común**
- Rama de trabajo: GPSpedia2.2.5_work. HEAD de código verificado: ff848cf620fcf582e8d6b1821c270147fb73ba9d.
- Commits de implementación dashboard: b26948fd5eee717ea965baafc9c320033a3658dc; ajuste de contrato CSS: 334ffd80d905958f16e61058404c669d644d8369; corrección de desempate de prueba: b4612e2c5cbf0af36c5857dce52f0c2515020be7; optimización de lecturas Spreadsheet: ff848cf620fcf582e8d6b1821c270147fb73ba9d.
- La rama base GPSpedia2.2.5 conserva HEAD d9acc68d889985c2e2f42fe3a02e502efc86ead1. No se modificaron servicios desplegados ni datos externos.


### Reconciliación de tareas anteriores — 2026-11-17
- GP-UX-CUT-MODAL-01: segunda corrección local cerrada. CI run 44006857813 ejecutó CutDetailModalLayout 15/15 PASS dentro de 132 suites / 1,964 pruebas / 0 fallos. Se conserva únicamente validación visual Android/PWA/escritorio pendiente de Beta.
- GP-PWA-SPLASH-PRELOAD-01: se actualiza su estado operativo, antes EN PROGRESO por una nota histórica, a COMPLETADA CON VALIDACIÓN DIFERIDA A BETA; evidencia PWAStartupScenarios 16/16 PASS y suite CI integral aprobada.


### Adenda final de publicación PWA y feed de actividad — 2026-11-17
- El feed de Actividad reciente muestra también la referencia asociada (ID de vehículo/elemento) junto con fecha, usuario, acción y descripción; el valor se inserta como texto plano.
- App Shell actualizado a v65 para invalidar el CSS/HTML del dashboard y el módulo de actividad en PWA instalada. Contratos ServiceWorkerCache y OfflineBrandAssets actualizados.
- CI del commit 21b584638223a23f4dd61da601795d009c76d91e: 132 suites / 1,964 pruebas / 0 fallos; GP-DASH-INSIGHTS-01 1/1, ServiceWorkerCache 10/10, OfflineBrandAssets 4/4 PASS.
- GitHub Pages run 44007452731: build, upload y deploy SUCCESS.

### Adenda de implementación — GP-AUTH-LOGIN-DRIVE-LOCK-01
- La política ADMIN/getCortesImageFolders declara únicamente DRIVE; el actor y su rol continúan validándose mediante el contexto central al adquirir la lease.
- Se evita reservar SESSION_CONTEXTS para esta operación de lectura prolongada. Las demás políticas AUTH/ADMIN no cambian.
- Regresión aislada: PASS; validación remota y CI pendientes.

---

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
