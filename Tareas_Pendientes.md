# GPSpedia — Tareas pendientes

**Documento operativo único del backlog.**  
Fecha de consolidación: 2026-11-16  
Repositorio: `infogpstech/GPSpedia`  
Rama autorizada: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5`  
HEAD de código validado al consolidar: `e4850ea35e5d84b0b2c07c60cb0a63f0f24c7982`

Este documento sustituye los registros operativos `Tareas_Activas.md` y `Tareas_beta.md`, integrando sus pendientes por sector y orden de ejecución. El historial y la evidencia de trabajo anterior permanecen en `checkpoint.md` y en `Olds/Documentacion_Legacy/`. La única fuente normativa continúa siendo `NORMAS_DESAROLLO.md`.

## Criterios de lectura

- **PENDIENTE LOCAL:** requiere análisis, implementación o pruebas reproducibles en la rama.
- **PENDIENTE BETA:** requiere navegador/dispositivo real, deployment actualizado, servicios externos o datos de una copia Beta.
- **EN PROGRESO:** tarea actualmente atendida.
- Una tarea puede tener implementación local terminada y conservar validación Beta pendiente. No confundir ambas etapas.
- No desplegar Apps Script, modificar ScriptProperties, secretos, hojas, permisos, Drive ni datos productivos sin autorización expresa.
- Las pruebas Beta deben iniciar con los comandos seguros de sincronización exigidos por `NORMAS_DESAROLLO.md`.

## Orden general de ejecución

1. Corregir y completar las tareas locales de experiencia de usuario y Developer, comenzando por BETA-021.
2. Completar la auditoría funcional local de Inbox y de las operaciones administrativas que aún presenten fallos o carezcan de cobertura.
3. Cerrar las revisiones locales pendientes de servicios, sesión, identificadores y telemetría.
4. Ejecutar la regresión integral local una vez completadas las implementaciones vigentes.
5. Realizar las validaciones Beta en el orden de dependencias indicado, sin simularlas ni bloquear el cierre local por falta de deployment.

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
**Estado: PENDIENTE LOCAL.**

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
**Estado: PENDIENTE BETA.**

- Comparar recursos servidos con la versión de la rama.
- Verificar actualización y caché de Service Worker sin borrar datos locales ni usar `deleteDatabase` como solución.

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
**Estado: ACTOR CENTRAL Y CONTRATOS LOCALES COMPLETADOS; PENDIENTE BETA.**

- Confirmar que los handlers reutilizan el actor confiable y no consultan Users/ActiveSessions en cada acción.
- No retirar la barrera central de token, expiración, epoch, revocación ni autorización por rol.

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
- La UI separa el agregado global de la actividad local del navegador (15 minutos, máximo 600 eventos). La ayuda aclara que el agregado global no representa todas las solicitudes HTTP.
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
