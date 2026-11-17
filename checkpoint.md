# Checkpoint de continuidad — GPSpedia

**Fecha:** 2026-11-16  
**Repositorio:** `infogpstech/GPSpedia`  
**Rama de trabajo:** `GPSpedia2.2.5_work`  
**Rama base protegida:** `GPSpedia2.2.5` (sin modificaciones)  
**HEAD de partida verificado:** `06a906855e5f4fd169f8daf2d88e273247bc8c75`

## Estado de esta iteración

### Completado localmente

- **GP-UX-PYS-ADD-MODEL-CARD-01:** corregida la altura de «Agregar Modelo» en el carrusel PyS. Se retiraron los overrides inline que anulaban el alto/min-height de 120 px de la clase compartida.
- **GP-DASH-ATTR-01:** el dashboard separa nombres de colaboradores por coma y saltos de línea; las variantes «Pablo Peña, Byron Lopez» y «Byron Lopez, Pablo Peña» se agrupan como dos técnicos, no como un único nombre.
- **GP-UX-INBOX-SEARCH-DISMISS-01:** la lupa abre/cierra la búsqueda; otras acciones y cambios de sección la cierran con estado accesible sincronizado.
- **GP-UX-INBOX-CACHE-SEARCH-01:** Inbox usa caché efímera por usuario/rol/token y clave carpeta/categoría/consulta/cursor; abre cache-first y refresca en segundo plano. La búsqueda global abarca recibidos, enviados, archivados y categorías.
- **GP-UX-VIDEO-OWN-STATUS-01:** técnicos y técnicos exteriores ven en Solicitudes únicamente sus vídeos propios, con estado y motivo de rechazo. Aprobación/rechazo y vista global siguen reservados a Desarrollador.
- **GP-UX-INBOX-RBAC-01 / GP-UX-RELAY-HEADER-01:** se conserva la matriz RBAC existente y el encabezado Relay.
- **GP-UX-CUT-MODAL-01 / GP-UX-BRAND-01:** logo y nombre de modelo mantienen el encabezado establecido en commits anteriores.
- **GP-UX-HOME-01:** los márgenes de los carruseles del inicio se mantienen compactos y uniformes según el CSS vigente.

### Validación automatizada

- GitHub Actions Node.js 22 run **43906071405: SUCCESS** — **129 suites / 1,899 pruebas / 0 fallos**.
- `PysModalNavigation.js`: 10/10 PASS.
- `InboxUi.mjs`: 41/41 PASS.
- `InboxConversations.mjs`: 61/61 PASS.
- `ActivityDashboardContributions.mjs`: 1/1 PASS.
- GitHub Pages run **43906069774: SUCCESS**.
- Las pruebas de CI no sustituyen la aceptación visual en dispositivos ni la validación de Apps Script con datos reales.

### Pendiente para Beta

- Comprobar visualmente la tarjeta Agregar Modelo y la consistencia de los carruseles en móvil/escritorio.
- Probar Inbox con cuentas reales de Técnico, Técnico Exterior, Supervisor, Jefe y Desarrollador; verificar caché, búsqueda global, lectura/no lectura y mensajes nuevos.
- Confirmar vídeos aprobados/rechazados y motivo de rechazo con cuentas reales de los técnicos que los subieron.
- Validar en entorno Beta los servicios Apps Script, permisos, Spreadsheet y datos reales. No se desplegaron servicios ni se alteraron datos externos en esta iteración.

## Siguiente trabajo

Retomar el backlog vigente desde `Tareas_Pendientes.md`. No iniciar refactorizaciones ajenas hasta completar las tareas activas. Revisar primero las validaciones Beta pendientes y luego ejecutar la verificación técnica integral indicada en `NORMAS_DESAROLLO.md`.

## Rotación sin pérdida

El checkpoint acumulativo anterior se conserva íntegro en `Checkpoint_Archive/checkpoint_legacy_parte_002.md`. Su longitud era de 194,292 caracteres Unicode. El manifiesto registra la rotación y mantiene la referencia a la parte archivada anterior.

- Ajuste final de posición del botón «Nuevo mensaje»: se elevó a 64 px sobre el borde inferior del modal y en móvil respeta el safe-area, dejando libre la navegación/paginación. App Shell actualizado a v41; CI pendiente.


### Validación final de la iteración — 2026-11-16

- GitHub Actions Node.js 22 run `43907008784`: **SUCCESS — 129 suites / 1,900 pruebas / 0 fallos**.
- `PysModalNavigation`: 10/10 PASS; `InboxUi`: 42/42 PASS; `InboxConversations`: 61/61 PASS; `ActivityDashboardContributions`: 1/1 PASS.
- GitHub Pages run `43907008756`: **SUCCESS**.
- Ajuste de botón flotante Nuevo (64 px + safe-area móvil) incluido en la ejecución aprobada.
- Inicio: `section-selector` margin-bottom de 20 px a 6 px (**reducción del 70 %**); carruseles con márgenes uniformes de 12/16 px.
- Estado de rama previo a este cierre documental: `131903bfa3966d777419983c310ab024ca33146b`. La rama base permanece intacta.


### Corrección puntual del encabezado del modal de detalle — 2026-11-16
- Rama verificada al iniciar: `GPSpedia2.2.5_work`, HEAD `33aa011d1e3832ecdbd308ae461e558de0aebcdd`.
- Se reabrió GP-UX-CUT-MODAL-01 por regresión reportada en móvil/PWA: compartir, editar e imprimir quedaban debajo del logo.
- Corrección preparada: grid de dos columnas con logo/modelo a la izquierda, acciones no envolventes a la derecha y cierre fijo en esquina superior derecha. Botones 34 px escritorio/32 px móvil. Logo +20 %: 57.6 px escritorio y 45.6 px móvil.
- App Shell actualizado de v41 a v42 para invalidar CSS previo en PWA.
- Auditoría registrada como AUD-2026-11-16-02; pruebas CutDetailModalLayout, ServiceWorkerCache y OfflineBrandAssets actualizadas.
- Estado: GitHub Actions Node.js run `43913616427` SUCCESS; aceptación visual en navegador móvil/PWA real pendiente de Beta. No se modificó Apps Script ni datos externos.



### Reanudación y segunda corrección GP-UX-CUT-MODAL-01 — 2026-11-16
- Rama de trabajo confirmada por lectura de los archivos en GPSpedia2.2.5_work; rama base GPSpedia2.2.5 no modificada.
- Se confirmó que el bloque flex agregado después del grid prevalecía en la cascada CSS y era la causa de que las acciones pudieran bajar debajo del logo. La prueba previa no detectaba esa contradicción.
- Cambios publicados: eliminación del override flex; test anti-regresión para detectar declaraciones flex/order posteriores; App Shell v43 y pruebas de caché actualizadas.
- Commits de código de esta corrección: c7ba5876742f92e0025485376431b8c98fc03d06, f4b485530d5d7cdd76901f8fc5f357381e7f1cb8, 6971db7ae35cc0141d44a885edb865786ed50080, fd09b10109c49face04a9bf98892500066ce5b0c, 2bc026cf2647174e6fb0d747e270e6f55958cbc4.
- Inspección estática: no queda regla display:flex para .detail-modal-toolbar; el bloque grid permanece; no queda order:2 para .detail-modal-header-actions.
- Pendiente: ejecutar CI Node.js y comprobar el diff completo; aceptación visual en Android/navegador móvil/PWA instalada queda pendiente de Beta. No se modificaron deployments, Apps Script ni datos externos.



### Estado de validación y HEAD — GP-UX-CUT-MODAL-01 — 2026-11-16
- HEAD de código de la corrección verificado: 2bc026cf2647174e6fb0d747e270e6f55958cbc4 (test(pwa): comprobar versión y CSS del App Shell). La documentación de continuidad se sincronizó posteriormente en e1bca4865bf915e32c8bf971ea76df5306712d6b.
- Compare GPSpedia2.2.5_work → HEAD: identical. Compare GPSpedia2.2.5 → d9acc68d889985c2e2f42fe3a02e502efc86ead1: identical; la rama base permanece intacta.
- Comprobaciones estáticas reproducibles sobre el contenido GitHub: 10/10 PASS (cascada CSS, cuadrícula, acciones, cierre, App Shell v43 y pruebas asociadas).
- Node.js y GitHub Actions: PENDIENTES DE CONFIRMACIÓN. No se recibió estado de checks; el entorno local no pudo clonar por falta de resolución de github.com. No se afirma ejecución de las suites.
- La tarea permanece EN PROGRESO hasta confirmar CI; inspección visual real en Android/PWA sigue pendiente de Beta.


### Nueva corrección visual solicitada — Inbox y modal de corte — 2026-11-16
- Causa raíz Inbox confirmada en `style.css`: las reglas móviles de `.inbox-folder-nav button` asignaban `width:100%` también al botón flotante Nuevo, anulando su tamaño fijo por cascada/especificidad.
- Corrección: el botón queda excluido de la rejilla y usa 46 × 46 px, cuadrado con esquinas redondeadas, alineado a la derecha justo encima de la paginación; respeta safe-area móvil.
- Modal de corte: logo de imagen real ampliado a 69.12 px escritorio / 54.72 px móvil. El modelo permanece siempre en la misma línea; si no cabe completo, se trunca visualmente sin pasar debajo del logo.
- Se actualizan InboxUi, CutDetailModalLayout, ServiceWorkerCache y OfflineBrandAssets; App Shell v44.
- Validación local/CI pendiente de ejecución. Aceptación visual Android/PWA pendiente de Beta. No se tocaron Apps Script, deployments ni datos externos.


### Ajuste de prueba posterior a CI — 2026-11-16
- CI run 43923520450: 104 suites; 1,572 pruebas aprobaron; una suite falló por una expresión de CutDetailModalLayout que no toleraba el espacio en `max-width: 560px`.
- Se corrigió el patrón de prueba para admitir espacios CSS sin alterar código visual. Reejecución de CI pendiente.


- Ajuste final de posición FAB: offset inferior de 64 px más `safe-area-inset-bottom`, conservando el botón cuadrado de 46 px y evitando superponer la fila de paginación.


### Cierre local — ajustes de Inbox y modal de corte — 2026-11-16
- Código: commit `95dd8205269849344b69b77e22898e4763096830`; botón Nuevo flotante cuadrado 46 × 46 px, anclado abajo a la derecha con offset 64 px + safe-area, excluido de la rejilla de carpetas.
- Modal de corte: imagen real del logo a 69.12 px escritorio / 54.72 px móvil; modelo siempre en la misma línea, con ellipsis si el ancho no alcanza.
- GitHub Actions Node.js 22 run `43924038989`: **SUCCESS — 129 suites / 1,903 pruebas / 0 fallos**. Incluye sintaxis de módulos modificados y regresión de servicios.
- GitHub Pages run `43924038398`: **SUCCESS — build y deploy**.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Falta únicamente comprobar visualmente en Android/PWA instalada las posiciones y proporciones finales. No se modificaron Apps Script, deployments de servicios ni datos externos.


### Nueva solicitud visual — modal de corte y tabla users.html — 2026-11-16
- Rama verificada al iniciar esta tarea: `GPSpedia2.2.5_work`, HEAD `bb5dbd1fe8327110e80faaa47555bc4f0388fa1b`; commit de incorporación de capturas únicamente, sin cambios concurrentes en código respecto al checkpoint previo. Rama base `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Capturas localizadas en `Images/tests/`: `modal_antes.png`, `Modal_despues.png`, `modal_users_antes.jpeg`. Se pudo inspeccionar la captura anterior y la captura de usuarios; el conector no expuso los bytes de `Modal_despues.png` (archivo de 2,017,189 bytes). La distribución solicitada por el usuario en texto se usa como criterio explícito.
- Alcance en implementación: encabezado de corte con logo grande a la izquierda, acciones en la fila superior derecha, modelo en la fila inferior derecha alineado a la base del logo; tabla de usuarios con encabezados cortos, distribución 100 % y rol sin cortes internos. Sin cambios de backend, RBAC ni handlers.
- App Shell previsto v45 por cambios en CSS y HTML precargados.


### Cierre local — GP-UX-CUT-MODAL-03 / GP-UX-USERS-03 — 2026-11-16
- Commit de código: `07eca822c4fd06b5ebeb605256f918069c96d798`.
- Modal de corte: logo real 120 px escritorio / 104 px móvil; imagen a la izquierda; compartir/imprimir/editar en la parte superior derecha junto al cierre; modelo en la fila inferior derecha alineado al borde inferior de la imagen. El campo de edición ocupa la misma celda que el nombre en modo edición.
- `HTML/users.html`: encabezados «Usuario», «Nombre», «Rol», «acciones»; tabla de ancho 100 %, columnas fijas y sin scroll horizontal; rol sin saltos dentro de palabras; botones de acción 28 px en viewport ≤420 px para conservar las tres acciones en una fila.
- App Shell `gpsepedia-cache-v45`; pruebas de caché y recursos offline sincronizadas.
- GitHub Actions run `43939461276`: **SUCCESS — 129 suites / 1,904 pruebas / 0 fallos**. CutDetailModalLayout 14/14; ResponsiveFormsUsers 17/17; ButtonWidthPolicy 5/5; ServiceWorkerCache 10/10; OfflineBrandAssets 4/4. Sintaxis de módulos modificados aprobada.
- GitHub Pages run `43939460856`: **SUCCESS — build y deploy**.
- Estado: **COMPLETADA CON VALIDACIÓN DIFERIDA**. Falta inspección visual en Android/PWA y escritorio; no se presenta como realizada.
- Rama base `GPSpedia2.2.5` verificada sin diferencias respecto al SHA protegido `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.

### GP-UX-INBOX-DESKTOP-02 — Corrección de escritorio y editor — 2026-11-16
- HEAD confirmado al iniciar: `6c11602600fd04039608c67da973e9b87447fa94`, rama `GPSpedia2.2.5_work`; rama base protegida `GPSpedia2.2.5`.
- Se revisaron `Images/tests/modal_inbox_bandeja.png` y `Images/tests/modal_inbox_reportes.png`.
- Diagnóstico: el formulario nuevo no tenía una región de scroll flexible; los controles Salir/Enviar podían quedar debajo del área recortada. Plantilla y Categoría se renderizaban como campos verticales independientes. La lupa mostraba su etiqueta dentro de un botón de ancho fijo. La lista vacía ocupaba todo el alto del sidebar.
- Implementación preparada: scroll propio del formulario con acciones sticky; selectores en fila; toolbar compartida en nuevo mensaje y respuesta; renderizado del contenido enriquecido después de sanitización; altura compacta de la lista vacía y lupa cuadrada sin etiqueta visible.
- App Shell v47. Pruebas InboxUi, ServiceWorkerCache y OfflineBrandAssets reforzadas.
- Estado actualizado: cambios publicados secuencialmente en GPSpedia2.2.5_work hasta HEAD be7a1a5548c7ef66712c6ceecee701fb264f82c9; CI no confirmada. No se modifican Apps Script, deployments, RBAC ni datos externos.

- Adenda: la barra del Inbox se fuerza al modo avanzado sin cambiar la preferencia global. Se conserva al refrescar toolbars y el sanitizador recibe el modo avanzado explícito solo para mensajes de Inbox. App Shell v47.

### Verificación de código — GP-UX-INBOX-DESKTOP-02 — 2026-11-16
- HEAD publicado: `f5d0ace755803f3040303672fa00bf675a3e86ab`.
- Parseo sintáctico estático de `JS/Frontend/ui.js`, `JS/Frontend/rich-text.js`, `service-worker.js` y `JS/Tests/InboxUi.mjs`: **4/4 PASS** mediante compilación del código transformado a contexto de función (sin ejecutar las suites Node).
- Comprobaciones estáticas específicas de la corrección: **15/15 PASS** (barra avanzada, sanitización, persistencia de borradores, scroll, acciones sticky, fila de selectores, lista vacía, lupa y App Shell v47).
- La prueba InboxUi se reforzó para comprobar la regla desktop efectiva y evitar que un override móvil posterior oculte la regla principal.
- GitHub Actions / estado combinado del commit no devuelve checks todavía; la suite Node.js completa permanece **PENDIENTE DE CONFIRMACIÓN CI**. No se afirma ejecución integral ni inspección visual real.
- Rama base: SHA `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin commits propios en esta iteración; la rama de trabajo continúa adelantada y sin commits detrás.


---

### Nueva corrección visual — modal de corte y tutoriales — 2026-11-16
- Rama de trabajo GPSpedia2.2.5_work; HEAD de partida documentado f5d0ace755803f3040303672fa00bf675a3e86ab. Rama base protegida GPSpedia2.2.5, SHA conocido d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Causas localizadas: divisor azul limitado al contenedor de logo de 180 px; overflow hidden podía recortar la sombra; título del tutorial compartía el grid del corte y el cierre permanecía en flujo normal.
- Cambios publicados en commits secuenciales de la rama autorizada:
  - 9319435b22e9259db8a35b72a70bdfee730e0456 — ui.js.
  - 8f943abe9c85e4b8e624d9cf2f588fe92f135252 — style.css.
  - 2d09f94b2c3fa76daf83c76ed5ab12195135421b — CutDetailModalLayout.
  - 47eedb8cd1ea9bb73b9a7c41515a2ea622670dbd — App Shell v48.
  - 982979c995826006bf502f6e1a7d0d8490615535 — ServiceWorkerCache.
  - b1e169b5cd341ffea98fb563b6ddb86ee190e2bd — OfflineBrandAssets.
- Implementación: divisor en fila completa con margen lateral; logo con overflow visible y padding; modelo/Relay a 2rem; acciones 40 px escritorio / 36 px móvil y cierre 40 px; tutorial con encabezado flex propio, ajuste de palabras y cierre absoluto a la derecha.
- Estado: implementación publicada; revisión del diff y CI pendientes. Inspección visual Android/PWA y escritorio pendiente de Beta. No se modifican Apps Script, deployments ni datos externos.


### Validación de publicación — GP-UX-CUT-MODAL-04 / GP-UX-TUTORIAL-MODAL-01 — 2026-11-16
- Verificación estática dirigida: **9/9 PASS** sobre el código y los contratos publicados.
- Commits individuales y archivos confirmados mediante fetch_commit: ui.js, style.css, CutDetailModalLayout.mjs, service-worker.js, ServiceWorkerCache.js, OfflineBrandAssets.mjs y registros.
- HEAD documental confirmado al terminar la publicación: bcaac4156c52decfdcd07ec4f1f07788208aa6dc. Compare de ramas: GPSpedia2.2.5_work ahead; base GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1, behind_by 0.
- GitHub combined status no devolvió checks y el endpoint de workflow disponible solo expone runs de PR. El clon superficial para ejecutar Node.js local falló por DNS de github.com. CI Node.js completa no confirmada.
- Estado: EN PROGRESO hasta disponer de ejecución Node.js/CI verificable. Validación visual escritorio, Android y PWA instalada pendiente de Beta. No se modificaron Apps Script, deployments ni datos externos.


### Validación y corrección de contratos — GP-UX-INBOX-DESKTOP-02 / GP-UX-CUT-MODAL-05 — 2026-11-16
- HEAD de implementación: 44464456e0b1bcbcc66a1b3f0fdd970587850ef7; contratos reorganizados en e944a753ceb5a62585fa7bac3349f5f75ccec6ad.
- Run 43946240367: sintaxis de InboxUi falló por regex nueva mal escapada; corregida antes del siguiente run.
- Run 43946386787: 48/49 InboxUi PASS; el único fallo fue un contrato previo que esperaba createRichTextToolbar directo y el formulario sin wrapper. Se actualiza para comprobar createInboxRichTextToolbar, editorShell y sanitización avanzada explícita.
- Las suites específicas de nueva barra, persistencia de controles extra, búsqueda expandible y fondos por tema pasaron en ese run.
- Pendiente repetir CI Node.js completa, validar CutDetailModalLayout y Pages; inspección visual escritorio/móvil/PWA queda para Beta.

- CI run 43946591177: InboxUi 49/49 PASS; CutDetailModalLayout falló solo porque el nuevo test leía el último selector del divisor (media móvil) al buscar el ancho desktop. Se corrige el test para verificar ambos anchos por separado. No hay fallo de sintaxis en los módulos.


### Cierre — GP-UX-INBOX-DESKTOP-02 / GP-UX-CUT-MODAL-05 — 2026-11-16
- Implementación publicada en commits: 44464456e0b1bcbcc66a1b3f0fdd970587850ef7 (código y App Shell v49), e944a753ceb5a62585fa7bac3349f5f75ccec6ad (contratos Inbox), a952b3f1df0d51c07d462f712917e055b7c42e77 (registros/contrato sanitización), ba51ec1124315b0220415f40639650c628837f94 (contrato responsive divisor) y 6e430a6994ee435f209a25c1f8f88dea19eff16e (runner CutDetailModalLayout).
- GitHub Actions Node.js 22 run 43946839054: **SUCCESS — 129 suites / 1,912 pruebas / 0 fallos**. InboxUi 49/49; CutDetailModalLayout 15/15; ServiceWorkerCache 10/10; OfflineBrandAssets 4/4. Parsing de módulos modificado aprobado.
- GitHub Pages run 43946839204: **SUCCESS** (build y deploy).
- Rama de trabajo verificada: HEAD 6e430a6994ee435f209a25c1f8f88dea19eff16e. Comparación: ahead 3760, behind 0. Rama base protegida GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Pendiente solo inspección visual real en escritorio, Android y PWA; no bloquea cierre local. No se desplegaron servicios Apps Script ni se modificaron datos externos.


### Nueva revisión visual — Inbox, modal de corte y zoom — 2026-11-16
- Rama confirmada antes de los cambios: GPSpedia2.2.5_work, HEAD 06a906855e5f4fd169f8daf2d88e273247bc8c75. Rama base protegida confirmada en d9acc68d889985c2e2f42fe3a02e502efc86ead1; no se modifica.
- Inbox: Salir/Enviar fijados en una sola fila, orden preservado, dimensiones comunes 64 × 40 px.
- Toolbar móvil: opciones de categoría/plantilla movidas antes de Negrita; el orden se conserva tras reconstruir la barra y el menú se alinea al borde izquierdo con ancho máximo ligado al viewport.
- Modal de corte: divisor azul pasa de 7.5 px a 4 px de separación vertical; nombre del modelo incorpora sombra de texto.
- Zoom: viewport de navegación restringido en index.html, HTML/users.html y HTML/add_cortes.html. lightbox.js mantiene su excepción: habilita temporalmente maximum-scale 5/user-scalable yes y restaura el valor previo al cerrar.
- App Shell actualizado a v50. Pruebas InboxUi, CutDetailModalLayout y AntiDebuggingPolicy reforzadas.
- GitHub Actions Node.js 22 run 43955279344: SUCCESS — 130 suites / 1,928 pruebas / 0 fallos; InboxUi 51/51, CutDetailModalLayout 15/15, BrowserZoomAccessibility 12/12, AntiDebuggingPolicy 11/11, ServiceWorkerCache 10/10 y OfflineBrandAssets 4/4.
- GitHub Pages run 43955278378: SUCCESS (build y deploy).
- Commit de código y pruebas validado: faf64565578db58f3b494280ed76927b8a914064.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. La inspección visual en Android/escritorio/PWA queda diferida a Beta; no se desplegaron servicios Apps Script ni se modificaron datos externos.


### Revisión adicional — barra y editor visual del Inbox — 2026-11-16
- Solicitud: reducir separación y ancho entre iconos de la barra enriquecida móvil/PWA; desplegar listas y fuentes hacia la izquierda del botón; evitar mostrar etiquetas HTML mientras se escribe; ampliar familias tipográficas nativas.
- Causa del editor anterior: el compositor utilizaba textarea y las funciones de formato insertaban markup HTML como texto. Se sustituyó la superficie visible por un editor contenteditable y se conserva un textarea oculto como fuente canónica con HTML saneado para borradores y envío.
- Archivos de implementación: JS/Frontend/rich-text.js, JS/Frontend/ui.js, style.css y service-worker.js (App Shell v51). Contratos: JS/Tests/InboxUi.mjs, ServiceWorkerCache.js y OfflineBrandAssets.mjs.
- Fuentes añadidas: Times New Roman, Verdana, Tahoma, Trebuchet MS, Palatino, Garamond e Impact, además de las existentes.
- CI Node.js 22 run 43960366613: SUCCESS — 130 suites / 1,934 pruebas / 0 fallos. InboxUi 57/57; CutDetailModalLayout 15/15; ServiceWorkerCache 10/10; OfflineBrandAssets 4/4.
- GitHub Pages run 43960362556: SUCCESS (build y deploy).
- Commits: 948e615341c9b736d49cfe732dee968f258a5cd0 (implementación y pruebas), f2d2440acfcffe8e2a5437b77ea4f4756052f8c5 (contratos heredados).
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Falta inspección visual real de escritura/formato, menús y anchura en Android/PWA y escritorio. No se modificaron Apps Script, deployments ni datos externos.


### Implementación — GP-UX-RICH-FORMS-01 — 2026-11-16
- Rama autorizada: `GPSpedia2.2.5_work`. HEAD base de esta tarea: `5163bbf2e40f76e62edfb17951e3e3f73cfc36c1`.
- Alcance: editor visual reutilizable para los textarea que ya disponen de barra enriquecida. Tres perfiles: básico (negrita/color), listas (negrita/color, marcadores y listas ordenadas) y completo (Inbox).
- Se conserva el textarea original como fuente de datos oculta y sincronizada; el usuario escribe sobre una superficie `contenteditable` renderizada. Se conservan IDs/lecturas `.value`, eventos input/blur, límites, validación de requeridos y saneamiento de pegado.
- Formularios revisados: cortes y suplementos, edición de detalle/cortes/apertura/alimentación/notas, sugerencias, contacto, tutoriales (campo Detalles) y problemas/soluciones (detalle, solución y prevención). No se añaden controles a inputs de una línea ni a campos tutoriales de texto plano.
- Se agrega la barra de listas a Prevención PyS durante creación, para igualar la herramienta ya presente durante edición. Inbox permanece completo y aislado.
- Archivos modificados: `JS/Frontend/rich-text.js`, `JS/Frontend/ui.js`, `JS/Frontend/main.js`, `HTML/add_cortes.html`, `style.css`, `service-worker.js`, `JS/Tests/InboxUi.mjs`, `Auditoría.txt`, `ChangesLogs.txt` y este checkpoint.
- Estado al publicar: pruebas locales Node.js no disponibles en esta sesión; se incorporan contratos al runner CI. CI/Pages y validación visual Android/PWA quedan pendientes de resultados reales.


### Corrección de regresión de pruebas — GP-UX-RICH-FORMS-01 — 2026-11-16
- CI run `43968040912` detectó un error sintáctico en el montaje de los campos dinámicos de alimentación y una expectativa histórica en `TutorialIntegrity.js`; ambos fueron corregidos en `0b2c151`.
- CI run `43968323034` confirmó sintaxis válida y 1,650 pruebas aprobadas; quedó una única suite fallida porque `ServiceWorkerCache.js` aún esperaba App Shell v51. Se actualiza su contrato a v52 en este commit.
- El resultado de CI completo se mantiene pendiente de la siguiente ejecución.


### Actualización de contrato PWA — GP-UX-RICH-FORMS-01 — 2026-11-16
- CI run `43968512704`: sintaxis y 1,660 pruebas aprobadas; una suite restante (`OfflineBrandAssets.mjs`) mantenía una expectativa de App Shell v51. Se actualiza el contrato a v52.
- `ServiceWorkerCache.js` ya fue actualizado; se conserva la versión v52 como única versión vigente del App Shell.
- Resultado CI completo pendiente de la siguiente ejecución.


### Ajuste de compatibilidad con pruebas de recuperación — GP-UX-RICH-FORMS-01 — 2026-11-16
- CI run `43968763296` validó 1,911 pruebas y sintaxis, pero la suite de recuperación de operaciones de `add_cortes` ejecuta el script en un contexto aislado sin imports de módulos. Se protegen las sincronizaciones auxiliares con comprobación de disponibilidad para conservar compatibilidad con ese entorno y no interferir con la recuperación.
- La sincronización sigue activa en la página real, donde la función sí está importada.


### Cierre de implementación y CI — GP-UX-RICH-FORMS-01 — 2026-11-16
- <escape>CI: PASS</escape> — ejecución `43969111663`, commit `353531e167a9b5055fb503f260f79731b35ffbcc`: 130 suites, 1,941 pruebas aprobadas, 0 fallos.
- <escape>GitHub Pages: SUCCESS</escape> — ejecución `43969110185`.
- Las pruebas incluyen contratos de los tres perfiles, sanitización, sincronización de campos, límites, sintaxis de módulos y recuperación de `add_cortes`.
- Estado: `COMPLETADA CON VALIDACIÓN DIFERIDA A BETA`. Falta inspección visual en dispositivos reales Android/PWA y escritorio para confirmar dimensiones, interacción táctil, selección de texto y presentación de listas. No se afirma que esa inspección física se haya ejecutado.


### Ajuste de apertura de menús — GP-UX-RICH-FORMS-02 — 2026-11-16
- Se corrige la orientación de los desplegables de la bandeja de entrada: el menú de categorías se ancla al borde derecho del botón para abrirse hacia la izquierda; el menú de viñetas y listas se ancla al borde izquierdo para abrirse hacia la derecha.
- Ajuste CSS específico, sin cambiar el contenido ni el comportamiento de las opciones. Validación visual en dispositivo pendiente.


### Continuación Inbox y navegación global — GP-UX-INBOX-DESKTOP-03 / GP-UX-PLATFORM-SCROLLBARS-01 — 2026-11-16
- HEAD confirmado al retomar: `4f5afa281f9b98ab886271ada71626ce12a0de6b`; rama base protegida: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- La revisión del Inbox confirma: la lista lateral se oculta al abrir conversación/redacción y el detalle utiliza el ancho completo; Nuevo mensaje ocupa la zona de acciones superior, sin botón flotante + ni pestaña redundante de Solicitudes. El compositor aprovecha el área disponible, el asunto y búsqueda son compactos y el editor crece en altura. Los menús de categorías/plantillas y formato se posicionan sobre el contenido y se cierran al elegir, al abrir otra opción o al pulsar fuera.
- Se aplica estilo de scrollbar global translúcido y autoocultable. Excepción: `#modalDetalle` y todos sus descendientes, correspondientes a detalle de corte, tutorial, Relay y PyS. Se oculta únicamente el indicador; se preservan los mecanismos de desplazamiento.
- Archivos de esta extensión: `style.css`, `service-worker.js`, `JS/Tests/InboxUi.mjs`, `JS/Tests/ServiceWorkerCache.js`, `JS/Tests/OfflineBrandAssets.mjs`, `Auditoría.txt`.
- App Shell actualizado a v54 para evitar CSS obsoleto en PWA.
- `ChangesLogs.txt` no se modifica porque ya supera el umbral normativo de 180,000 caracteres; la trazabilidad queda en este checkpoint y en Auditoría.
- CI previa del HEAD retomado: run `43974270269` SUCCESS. Se ejecutará nueva CI para el alcance global.
- Validación visual real en escritorio, Android y PWA pendiente de Beta. No se afirma que se haya ejecutado en dispositivos.


### Validación CI y cierre local — GP-UX-INBOX-DESKTOP-03 / GP-UX-PLATFORM-SCROLLBARS-01 — 2026-11-16
- GitHub Actions Node.js 22 run `43975016921`: **SUCCESS — 130 suites, 1,947 pruebas aprobadas, 0 fallos**. Incluye sintaxis de módulos, contratos de Inbox, excepciones de scroll en `#modalDetalle`, sincronización del App Shell v54 y regresiones de servicios.
- GitHub Pages run `43975016203`: **SUCCESS** (build, deploy y reporte de estado).
- HEAD de trabajo confirmado: `1df72703df343be253fc994d20ba9a60dfc52ef4`; padre del commit de implementación: `4f5afa281f9b98ab886271ada71626ce12a0de6b`. Rama base protegida continúa en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Estado: **COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**. La validación visual en escritorio, Android y PWA instalada permanece pendiente; no se ejecutó inspección física de dispositivos.



### Implementación — GP-UX-RICH-TOOLBARS-01 — 2026-11-16
- Solicitud: aplicar a todas las barras de texto enriquecido fuera del Inbox su misma presentación visual, sin agregar funciones.
- Rama autorizada: `GPSpedia2.2.5_work`; rama base `GPSpedia2.2.5` sin modificaciones. El checkpoint previo registraba HEAD `1df72703df343be253fc994d20ba9a60dfc52ef4`; Git confirmó que la rama tenía un commit documental adicional antes de esta tarea. Se trabajó mediante escrituras secuenciales sobre la rama autorizada, sin forzar referencias.
- `JS/Frontend/rich-text.js`: `createRichTextToolbar()` conserva los perfiles funcionales básico, listas y avanzado. Los botones se muestran con iconos Font Awesome, tooltip y etiqueta accesible. Los selectores nativos existentes de tamaño, fuente y marcador, sus opciones y eventos se mantienen; no se incorporan menús ni comandos nuevos. La barra independiente del Inbox no se modifica.
- `style.css`: presentación compartida compacta, bordes, fondo, iconos, selectores nativos y adaptación con salto de línea para pantallas estrechas.
- `service-worker.js`: App Shell actualizado a v55. Contratos de caché ajustados en `JS/Tests/ServiceWorkerCache.js` y `JS/Tests/OfflineBrandAssets.mjs`.
- `JS/Tests/InboxUi.mjs`: contratos de iconografía, perfiles de funciones y conservación de selectores nativos.
- Registros actualizados: `Auditoría.txt` y `ChangesLogs.txt`. No se encontró `Tareas.txt` ni `Tareas_Activas.md` en la raíz de esta rama.
- Commits de implementación/pruebas y registros publicados secuencialmente: `1ff5c59`, `d14ca5d`, `597c148`, `f2d9682`, `196e521`, `236ba83`, `37d0df9`, `721a77d`, `0baae44`, `233507c`, `3c4b4ac`, `79ff61f`.
- Estado: **EN PROGRESO** hasta completar CI y revisión final del diff. Inspección visual real en escritorio, Android y PWA queda reservada para Beta; no se declara realizada.

- Revisión final de alcance: comparación Git desde el HEAD previo muestra únicamente los nueve archivos previstos (rich-text.js, style.css, service-worker.js, tres contratos de prueba y tres registros). No hay modificaciones en la rama base; comparación actual: 3,817 commits adelantada, 0 detrás, base SHA d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Corrección final: se preservó explícitamente la variante compact: true preexistente, que continúa usando su toolbar completo original. Las barras estándar de formularios usan iconografía con controles nativos equivalentes a los anteriores. Commit de preservación: 83fe912c362a4ecce54c7179af17262159b74c81.
- Validación estática de esta sesión: parsing V8 aprobado para rich-text.js, InboxUi.mjs, OfflineBrandAssets.mjs, service-worker.js y ServiceWorkerCache.js (esta última mediante compilación async con imports retirados únicamente para parsing); comprobaciones estáticas de perfiles, iconos, etiquetas accesibles, selectores nativos, App Shell v55 y balance de llaves CSS aprobadas.
- No se pudo ejecutar el runner Node.js completo desde este entorno (sin checkout local ni acceso de red para clonarlo). El workflow .github/workflows/service-tests.yml está configurado para ejecutarse en push a la rama; la consulta de estado del commit no devolvió checks (statuses: []), por lo que no se declara CI aprobada.
- Estado actualizado: **EN PROGRESO** hasta confirmar el resultado del workflow Node.js. Validación visual real de escritorio, Android y PWA queda pendiente de Beta.

- Anti-regresión adicional: se detectó y corrigió que el indicador dataset reservado para la toolbar compacta podía hacer que el refresco dinámico reconstruyera barras básicas/de listas como avanzadas. Se retiró el indicador en barras estándar y se añadió una expectativa específica en InboxUi. Commits: 334b94f y 16002ee; registros de corrección: 0041c63 y 8c5cbb9.
- La revisión estática final debe repetirse sobre este último ajuste; CI Node.js continúa sin estado consultable desde la integración.


### GP-UX-RICH-EDITOR-SELECTION-02 — 2026-11-16
- Solicitud: corregir el cambio de color/formato al perder foco, impedir que el menú contextual tape la barra y ofrecer copiar/pegar con iconos.
- HEAD al iniciar: `35dc89e815dd676b412619134e4373b46107e05c`; comparación Git confirmó la rama `GPSpedia2.2.5_work` idéntica a ese SHA y 0 commits detrás/adelante. Rama base protegida sin cambios.
- Causa localizada: el selector de color podía provocar blur y la función aplicaba formato usando la selección actual, que ya podía haberse perdido. Los selectores de fuente/tamaño tampoco preservaban rangos; el editor básico colocaba un marcador de caret sin comprobar adecuadamente el caso de editor vacío.
- Cambios: `JS/Frontend/rich-text.js` almacena/restaura el rango/cursor, captura interacción antes de color/fuente/tamaño, aplica el color al evento `change` (una vez confirmado), preserva caret en editor vacío y libera la referencia activa al perder foco. Las dos variantes de barra (formularios e Inbox) incorporan copiar/pegar mediante iconos `fa-copy` / `fa-paste` y Clipboard API con fallback. `JS/Frontend/ui.js` enlaza el mismo seguimiento al editor Inbox.
- Menú contextual: se previene `contextmenu` dentro de los editores y se desactiva el callout táctil nativo, sin deshabilitar selección de texto; se mantiene `user-select:text`.
- Caché PWA: App Shell `gpsepedia-cache-v56`; contratos de ServiceWorkerCache y OfflineBrandAssets sincronizados.
- Pruebas ampliadas: `JS/Tests/InboxUi.mjs` comprueba persistencia de selección, botones de portapapeles, bloqueo contextual y selección táctil.
- Archivos: `JS/Frontend/rich-text.js`, `JS/Frontend/ui.js`, `style.css`, `service-worker.js`, `JS/Tests/InboxUi.mjs`, `JS/Tests/ServiceWorkerCache.js`, `JS/Tests/OfflineBrandAssets.mjs`, `Auditoría.txt` y este checkpoint. `ChangesLogs.txt` no se modifica porque supera el umbral de rotación indicado en las normas.
- Commits secuenciales: `75f175e`, `b89c1aa`, `6b83300`, `47fe3f0`, `a9c6b32`, `e668cfc`, `010e516`, `17d94a7`, `b9f938f` (el commit final de registros se añadirá al cerrar).
- Validación estática: parsing V8 aprobado para `rich-text.js`, `ui.js`, `InboxUi.mjs`, `ServiceWorkerCache.js` y `OfflineBrandAssets.mjs` tras retirar imports/export e `import.meta` únicamente para el chequeo; balance de llaves CSS aprobado; comprobaciones de handlers, persistencia de rango, iconos y versión v56 aprobadas.
- Pendiente: ejecutar suites Node.js completas/CI y validación visual real de selección, menú contextual y clipboard en Android PWA y escritorio. La causa y el código compartido indican que el defecto también era posible en escritorio; no se afirma que se haya probado físicamente en ambos.
- Estado: EN PROGRESO hasta completar revisión final, pruebas disponibles y verificar HEAD remoto.


### Verificación posterior — GP-UX-RICH-EDITOR-SELECTION-02 — 2026-11-16
- Revisión de implementación: los controles de ambas barras capturan la selección antes de recibir el foco; el editor restaura el rango antes de aplicar color, fuente o tamaño. El marcador de color conserva el caret incluso cuando el rango tiene como contenedor común al propio editor vacío.
- El seguimiento de selectionchange usa una única suscripción global con referencia débil al editor activo; al perder foco se conserva el último rango y se libera la referencia activa, evitando una suscripción global por cada formulario dinámico.
- Parsing V8 aprobado para rich-text.js, ui.js, InboxUi.mjs, ServiceWorkerCache.js y OfflineBrandAssets.mjs (imports/exports e import.meta retirados solo en las copias usadas para parsing). Balance de llaves CSS y contratos estáticos dirigidos aprobados.
- No se ejecutó la suite Node.js completa desde este entorno. La consulta de estado combinada del commit 18e9926d46bb6befe5dfb3d195847e07d6d29b3d devolvió statuses: []; la integración disponible solo expone ejecuciones de workflows asociadas a PR y no devolvió ninguna. No se declara CI aprobada.
- Git confirma HEAD 18e9926d46bb6befe5dfb3d195847e07d6d29b3d en GPSpedia2.2.5_work; comparación contra GPSpedia2.2.5: 3,834 commits adelantada, 0 detrás; SHA de base d9acc68d889985c2e2f42fe3a02e502efc86ead1 sin cambios.
- Aún pendiente: suite integral Node.js/CI cuando el workflow esté disponible y validación visual real en escritorio y Android/PWA (cambio sucesivo de colores con texto previo, formato de selección, menús contextuales y portapapeles).
- Estado: EN PROGRESO hasta disponer de las pruebas completas; el código está publicado únicamente en la rama de trabajo.


### GP-UX-RICH-EDITOR-FOCUS-03 — 2026-11-16
- Reporte: el teclado virtual se oculta al tocar opciones de la barra y solo vuelve al tocar el área de escritura.
- Causa: el código anterior solo prevenía el foco en mousedown; Android entrega pointerdown/touch antes, permitiendo que los botones tomen foco y cierren el teclado.
- Cambio: ambas barras capturan pointerdown, conservan el rango y previenen el comportamiento de foco táctil en botones y opciones; se conserva click para ejecutar las acciones. Selectores nativos de fuente/tamaño y diálogo de color restauran foco/rango al editor tras confirmar/cerrar. CSS touch-action y tap highlight añadidos.
- Cache PWA v57 y pruebas de contrato sincronizadas. Archivos: rich-text.js, style.css, service-worker.js, JS/Tests/InboxUi.mjs, JS/Tests/ServiceWorkerCache.js, JS/Tests/OfflineBrandAssets.mjs, Auditoría.txt y checkpoint.md.
- Pendiente validación real Android/PWA y escritorio. No se declara resuelto visualmente hasta probar en dispositivo.


### Cierre de revisión estática — GP-UX-RICH-EDITOR-FOCUS-03
- Se detectó y corrigió una omisión durante la primera pasada: la barra estándar no había recibido el listener táctil de captura; ahora tanto la variante compacta (Inbox) como la estándar previenen el foco táctil de botones/opciones y conservan el click.
- Contrato de regresión ajustado para verificar ambos bloques y el retorno de foco de selectores. Parsing V8 aprobado para rich-text.js, InboxUi.mjs, ServiceWorkerCache.js y OfflineBrandAssets.mjs; balance CSS y caché v57 sincronizada.
- HEAD de la rama de trabajo confirmado después de los cambios: comparar el SHA remoto actual al cerrar esta nota. Suite integral Node y prueba física en Android/desktop continúan pendientes; no se declara que el teclado ya esté confirmado como persistente en hardware real.
- La rama base GPSpedia2.2.5 permanece sin cambios.


### Revisión de implementación — GP-UX-RICH-EDITOR-FORMAT-04 — 2026-11-16
- Publicación parcial verificada en GPSpedia2.2.5_work: módulo rich-text.js, contrato InboxUi.mjs, contratos de caché y Service Worker v58, más Auditoría.txt.
- Se mantiene estado independiente de formato por editor para negrita, cursiva, subrayado, tachado, color, fuente y tamaño. El cursor no requiere que los controles devuelvan el foco al editor; el siguiente texto se inserta con los nodos de formato correspondientes. La composición IME tiene tratamiento de rango de respaldo.
- Validación estática local: parsing ECMAScript aprobado para rich-text.js, InboxUi.mjs, ServiceWorkerCache.js (modo async), OfflineBrandAssets.mjs y service-worker.js; contratos estáticos dirigidos y sincronización de caché v58 aprobados.
- No se ejecutó la suite Node.js completa ni pruebas de interacción con navegador/dispositivo desde esta sesión. No se declara CI aprobada. La validación real con Gboard/IME, autocorrección, cambio de estilos y escritorio queda pendiente de Beta.
- La publicación de checkpoint y ChangesLogs se completa en esta continuación. Estado: EN PROGRESO hasta ejecutar la suite Node disponible; no bloqueado por la validación física Beta.

- Adenda de revisión: beforeinput solo intercepta eventos cancelables para evitar duplicar inserciones IME. Los formatos booleanos sobre una selección conservan alternancia; el estado pendiente gobierna únicamente la escritura posterior. Parsing de rich-text.js aprobado tras este ajuste; no se ejecutó la suite Node completa.


### GP-UX-RICH-EDITOR-FORMAT-05 — ancla nativa de escritura — 2026-11-16
- Reporte de Beta: el color sí se aplicaba al texto seleccionado, pero no al texto nuevo después de elegir color. Esto confirma que el estado temporal no estaba alcanzando de forma fiable las inserciones del navegador.
- Causa técnica revisada: el enfoque anterior interceptaba `beforeinput` cancelable e intentaba reconstruir texto manualmente; Gboard/IME, autocorrección y reemplazos pueden usar secuencias de composición no cancelables o rangos distintos. Además, `getRichTextSavedRange_` podía preferir un rango transitorio aunque el editor ya no tuviera el foco.
- Cambio: se retiró la inserción manual basada en `beforeinput` y el formateo posterior a `compositionend`. El formato pendiente ahora se materializa como un ancla DOM interna e invisible en el punto de inserción (nodos semánticos y span saneable); el navegador inserta texto/composición/autocorrección de forma nativa dentro de esa estructura. El centinela de ancho cero se limpia tras la entrada, al reiniciar y al cambiar de posición; el serializador lo excluye del HTML enviado incluso durante composición. Se eliminan anclas vacías abandonadas. La última selección guardada tiene prioridad mientras el foco está en la barra/selector.
- Aplicación común a formularios e Inbox mediante `JS/Frontend/rich-text.js`. Contrato `JS/Tests/InboxUi.mjs` actualizado para exigir anclas nativas y ausencia de interceptación manual. App Shell PWA actualizado a v61 y contratos de caché sincronizados.
- Parsing V8 de rich-text.js, InboxUi.mjs, ServiceWorkerCache.js, OfflineBrandAssets.mjs y service-worker.js aprobado; verificaciones estáticas dirigidas aprobadas. No se ejecutó la suite Node.js completa ni CI. Android PWA/Gboard, autocorrección, composición y escritorio siguen pendientes de Beta real.
- 
- Refuerzo adicional tras revisión de foco: al recuperar el cursor mediante toque/clic dentro del editor, se vuelve a materializar el formato pendiente en la nueva posición colapsada. Esto evita depender de que el navegador mantenga el caret anterior tras cerrar el selector. Contrato InboxUi actualizado y App Shell v61.
Estado: **EN PROGRESO** hasta ejecutar la suite Node.js completa disponible; la validación física de interacción queda diferida a Beta. No se modificó backend ni rama base.

### GP-UX-PYS-TUTORIAL-ASSOCIATION-06 — mejoras de UI — 2026-11-16
- Alcance: sustituir el selector de marcadores por un icono/menú en las barras estándar; incorporar enlace YouTube y acceso a subida directa en el formulario de tutoriales; mantener visibles los resultados de asociación con teclado virtual; separar detalle y acción del botón +.
- rich-text.js: la barra estándar reemplaza el selector nativo de marcador por el icono fa-list-ul con menú accesible de viñetas, guiones, flechas, verificación y lista numerada. El menú se posiciona hacia la izquierda. Se conservan selectores de tamaño y fuente.
- ui.js: el formulario de tutorial incorpora enlace YouTube validado y botón «Subir archivo de vídeo». addTutorial sigue enviando videoUrl vacío porque Apps Script rechaza enlaces directos en esa acción. Los enlaces pegados se envían mediante submitVideoForApproval, con ID de operación persistido en sessionStorage para reintentos; los archivos continúan por openYouTubeUploadModal y el flujo de aprobación existente.
- Asociación PyS: el modal adapta su alto al visualViewport, desplaza el panel de resultados a la zona visible y vuelve a ejecutar la búsqueda cuando termina de cargarse el catálogo. El área de información abre el modal de detalle; el botón + agrega directamente al conjunto provisional.
- Pruebas de regresión ampliadas en JS/Tests/InboxUi.mjs. App Shell y contratos de caché actualizados a v62.
- Validación local: parsing V8 de rich-text.js, ui.js, InboxUi.mjs, service-worker.js, ServiceWorkerCache.js, OfflineBrandAssets.mjs y feedback.js aprobado; 15 comprobaciones estáticas dirigidas aprobadas. JS/Services/feedback.js solo se inspeccionó para confirmar el contrato; su SHA permaneció intacto y no fue modificado.
- Suite Node.js InboxUi.mjs no ejecutada: el entorno no pudo clonar el repositorio por fallo de resolución DNS de github.com. CI sin estados reportados. Pruebas visuales Android/PWA y escritorio pendientes de Beta.
- Estado: EN PROGRESO hasta ejecutar la suite Node disponible y verificar los cambios en navegador real. No se modificaron servicios Apps Script, deployments, datos productivos ni la rama base.

- Adenda de comportamiento: toda la fila del resultado, salvo el botón +, abre el modal de información del vehículo; el botón + detiene la propagación y agrega directamente. Contrato actualizado. Validación estática final: 16/16 comprobaciones aprobadas; la suite Node y Beta continúan pendientes.


### GP-UX-PYS-VIDEO-CREATE-01 — alta de problema con enlace o subida de vídeo — 2026-11-16
- Se verificó la rama `GPSpedia2.2.5_work`; HEAD al iniciar esta corrección: `ecd4122f39ec7d5c589c7aeea69485d0d272fae0`. Rama base `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones.
- `JS/Frontend/ui.js`: el formulario PyS ahora incluye URL opcional de YouTube validada y botón «Subir archivo a YouTube». El alta inicial sigue llamando `addProblem` con `videoUrl: ""`; el enlace se tramita por `submitVideoForApproval` (`contentType: "pys"`) y el archivo por `openYouTubeUploadModal`. Se conserva la clave de idempotencia de aprobación, se evita el doble envío y los reintentos no vuelven a crear el problema.
- Restricción cumplida: no se modificaron `JS/Services/*`, servicios Apps Script, deployments, endpoints ni datos externos.
- Archivos de soporte: `service-worker.js` actualizado a App Shell v63; contratos `JS/Tests/InboxUi.mjs`, `JS/Tests/ServiceWorkerCache.js` y `JS/Tests/OfflineBrandAssets.mjs` sincronizados; esta auditoría y `ChangesLogs.txt` registran la tarea.
- Commits secuenciales: consultar los SHA publicados al cierre de esta sección. Validación Node.js/CI y navegador real todavía no ejecutadas en esta sesión; la validación real de OAuth, subida a YouTube y aprobación remota queda reservada a Beta.
- Estado: **EN PROGRESO** hasta ejecutar las pruebas locales disponibles y verificar los commits y el diff remoto. No se afirma que el flujo externo haya sido probado.


- Adenda de revisión: se confirmó en el contrato existente que `addProblem` permite el alta colaborativa; se retiró una guarda de Desarrollador que habría restringido indebidamente el formulario. La prueba de regresión comprueba la preservación de los permisos y la compatibilidad de `contentType: "pys"`.
- Revisión de `JS/Services/feedback.js` únicamente de lectura: `handleAddProblem` rechaza enlaces directos y `getVideoApprovalTarget_` ya reconoce PyS. Se reutilizan esas funciones sin editar backend.
- `Auditoría.txt` queda sin esta adenda porque ya está en 179,631 caracteres y añadirla superaría el umbral de rotación de 180,000; el hallazgo inicial ya está registrado y esta corrección de alcance queda documentada aquí y en `ChangesLogs.txt`.


### Validación y publicación — GP-UX-PYS-VIDEO-CREATE-01 — 2026-11-16
- Cambios publicados secuencialmente mediante la API de contenidos de GitHub (un commit por archivo): `32c679ad` (UI), `4409c5f4` (App Shell), `23c7b2f3` (contrato Service Worker), `bcfdd616` (contrato offline), `2a363a99` y `daafbc9b` (contrato PyS), `45171ef3` (auditoría), `bf517f1b` y `2f54ce30` (checkpoint), `7bcfdf6f` y `155bcfba` (changelog), `33dab14f` (preservación de permisos). El HEAD verificado antes de esta actualización documental era `155bcfba6228a3e372973d0ef5e0dd0759374cc9`.
- Parsing V8 aprobado para `ui.js`, `service-worker.js`, `InboxUi.mjs`, `ServiceWorkerCache.js` y `OfflineBrandAssets.mjs`. Para módulos se retiraron imports/exports e `import.meta` únicamente en la copia de análisis; `ServiceWorkerCache.js` se analizó dentro de un wrapper async por su uso de top-level await.
- 17/17 comprobaciones estáticas dirigidas aprobadas: campo URL, botón de subida, validación de enlace, contrato de `addProblem`, acción de aprobación PyS, cargador genérico, idempotencia/reintentos, doble envío, permisos existentes, compatibilidad de backend, App Shell v63 y contratos offline.
- Intento de checkout para ejecutar `node --experimental-default-type=module JS/Tests/RunServiceTests.mjs` falló antes de descargar archivos porque el entorno no pudo resolver `github.com` (DNS). No se declara ejecutada la suite Node.js. El estado combinado de GitHub para el último commit consultado devolvió `statuses: []`; la integración de workflows disponible no expone ejecuciones de push, por lo que CI no queda confirmada.
- Comparación desde el HEAD inicial de la tarea: solo 8 archivos modificados (`ui.js`, `service-worker.js`, tres contratos de prueba y tres registros); cero cambios en `JS/Services/`. SHA de `JS/Services/feedback.js` permanece en `8f1ddd547a3616e77230d7e607e493ed10136884`. Rama base sigue en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, 0 commits detrás de la rama de trabajo.
- Estado: **EN PROGRESO** hasta ejecutar la suite Node.js completa en un checkout local disponible. La prueba real de navegador, OAuth, carga binaria y aprobación/publicación de YouTube queda diferida a Beta; no se ejecutó ni se simuló.


- Ajuste de robustez posterior: si el alta del problema ya fue confirmada pero falla la confirmación de la solicitud de vídeo, el formulario informa que el problema ya existe y permite reintentar con el mismo enlace; no vuelve a ejecutar `addProblem`. Se retiró un atributo DOM temporal que no tenía consumidor. Commit UI: `47653fe97571d283e62e44ac86cdfe83663996e0`.
- Revalidación estática tras el ajuste: parsing V8 aprobado en los cinco archivos de código/prueba; 17/17 comprobaciones dirigidas aprobadas. El HEAD verificado antes de este apunte documental era `47653fe97571d283e62e44ac86cdfe83663996e0`.


### Registro de nuevas solicitudes — 2026-11-16
- Rama verificada: GPSpedia2.2.5_work; HEAD antes de registrar: db0c529a279e8b657557163c255d8dfe79143af3. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1; comparación: 3,918 commits ahead, 0 behind.
- Se registran en Tareas_Pendientes.md tres bloques: GP-DASH-INSIGHTS-01 (dashboard de contribuciones/indicadores), GP-TERMS-ASYNC-01 (aceptación local inmediata y sincronización remota asíncrona) y GP-PWA-SPLASH-PRELOAD-01 (iniciar carga del catálogo antes del desvanecimiento existente del Splash).
- Diagnóstico inicial: el dashboard actual solo muestra tablas de actividad y aportaciones; renderActivityLogs imprime valores crudos en cuatro celdas y no hay gráficas. FEEDBACK getActivityLogs devuelve los últimos 100 eventos y el resumen existente de colaboradores. Cortes contiene contadores de utilidad/búsqueda; FeedbackLikes, Feedbacks y FeedbackYearApplications son fuentes existentes para investigar agregaciones. No se encontró todavía un escritor activo de contadorBusqueda; no se presentará el ranking de búsquedas como fiable hasta confirmarlo.
- renderTermsGate_ espera actualmente a acceptTerms antes de guardar la caché local y cerrar el modal. AUTH handleAcceptTerms ya es idempotente para la misma versión/dispositivo y devuelve alreadyAccepted; se evaluará reutilizarlo sin cambiar el servicio.
- showApp inicia el desvanecimiento del Splash antes de que el flujo de AUTH invoque loadInitialData; se debe invertir el orden de inicio sin cambiar CSS, diseño ni duración, y sin cargar catálogo antes de aceptar términos.
- No se modificó código de aplicación, servicios, deployments ni datos externos durante este análisis. La auditoría Auditoría.txt no se amplió porque ya supera 180,000 caracteres; la evidencia de esta solicitud queda en backlog, ChangesLogs y checkpoint.
- Orden normativo: resolver primero los pendientes locales previos que siguen en el backlog; las tres solicitudes nuevas quedan registradas como PENDIENTE LOCAL. La rama base permanece intacta.


## Continuidad — GP-TERMS-ASYNC-01 / GP-PWA-SPLASH-PRELOAD-01 — 2026-11-16

- Repositorio: `infogpstech/GPSpedia`; rama autorizada: `GPSpedia2.2.5_work`; rama base protegida: `GPSpedia2.2.5`.
- HEAD verificado antes de esta actualización del checkpoint: `71e496732c4d9b57c59270d74a9f0ab6dfb606c1`. La base se mantiene sin modificaciones.
- Auditoría normativa realizada antes de editar: `NORMAS_DESAROLLO.md` leído; checkpoint, backlog y fuentes relevantes consultados. Hallazgos registrados en el nuevo `Auditoría.txt` activo.
- **GP-TERMS-ASYNC-01:** `termsDeviceAcceptance.js` almacena aceptación local con estado `pending/synced`; `ui.js` cierra el aviso inmediatamente después de persistirla y sincroniza AUTH en segundo plano. El reintento ocurre al reconectar o al volver a abrir la aplicación. Las respuestas tardías solo se aplican si usuario y token siguen siendo los mismos. AUTH/Apps Script no se modificó.
- **GP-PWA-SPLASH-PRELOAD-01:** `showApp()` verifica primero la aceptación local y, si es válida, inicia `loadInitialData()` antes del fade existente. La promesa no se espera y el fade conserva sus 500 ms. Se retiraron llamadas redundantes desde AUTH para evitar doble carga. No se cambiaron HTML/CSS ni el Service Worker.
- Archivos de código: `JS/Frontend/termsDeviceAcceptance.js`, `JS/Frontend/ui.js`, `JS/Frontend/auth.js`.
- Pruebas añadidas/actualizadas: `JS/Tests/TermsAsyncSync.mjs` (integrada en `RunServiceTests.mjs`), `TermsAcceptance.js`, `TermsModalAccessibility.mjs`, `PWAStartupScenarios.js`. Parsing V8 de los módulos/contratos modificados aprobado. El harness aislado ejecutó 5/5 escenarios de sincronización y 19/19 pruebas del contrato TermsAcceptance. La suite Node.js completa y CI aún no están confirmadas; no declarar cierre local hasta ejecutarlas. Se intentó clonar superficialmente la rama para ejecutar el runner, pero el entorno no resolvió `github.com` por DNS.
- Beta pendiente: navegador real y Android/PWA, offline/red lenta, sesión cambiada durante la petición, aceptación y sincronización remota en deployment autorizado, caché caliente/fría e IndexedDB lento/no disponible.
- **GP-DASH-INSIGHTS-01:** permanece PENDIENTE LOCAL; comenzar tras completar regresión local/CI de términos y Splash y auditar fuentes/contrato FEEDBACK.
- Reconciliación de backlog: auditoría transversal P2 de alineación de modales confirmada por el usuario como verificada en Beta; se marca COMPLETADA. GP-UX-INBOX-02 tiene regresión local/CI aprobada (run 43906071405: 129 suites/1,899; run 43907008784: 129 suites/1,900); solo conserva aceptación visual Beta pendiente.
- Rotación normativa: `Auditoría.txt` original (179,631 caracteres Unicode, blob `307ad6db2907c36ddbd949c64ea1d624dea86164`) archivado sin pérdida en dos partes; manifiesto `Auditoría_Archive/manifest.md` contiene blobs y longitudes y verifica reconstrucción exacta. `Auditoría.txt` activo contiene los hallazgos de esta implementación.
- No se modificaron servicios, deployments, endpoints, secretos ni datos externos. No se alteró la rama base.
- **Siguiente acción:** ejecutar `node --experimental-default-type=module JS/Tests/RunServiceTests.mjs` en un checkout disponible de la rama autorizada y revisar el diff completo; corregir fallos locales antes de continuar con GP-DASH-INSIGHTS-01.


## Continuidad — cierre local GP-DASH-INSIGHTS-01 / GP-TERMS-ASYNC-01 / GP-PWA-SPLASH-PRELOAD-01 — 2026-11-17

- Repositorio infogpstech/GPSpedia; rama autorizada GPSpedia2.2.5_work. HEAD de código verificado: ff848cf620fcf582e8d6b1821c270147fb73ba9d. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin modificaciones.
- GP-DASH-INSIGHTS-01 implementada: nueva vista Resumen con tarjetas KPI, rankings útiles/no útiles, resumen de años, principales colaboradores y pestañas de aportes/actividad reciente. FEEDBACK getActivityLogs agrega indicadores con lecturas acotadas: columnas mínimas de Cortes, últimos 500 Feedbacks y últimas 500 FeedbackYearApplications; actividad reciente mantiene límite 100. Se conserva RBAC Desarrollador/Jefe/Supervisor.
- El ranking de búsquedas no se muestra porque no existe evidencia de un escritor activo fiable de contadorBusqueda. No se incorporó instrumentación adicional ni escrituras por búsqueda.
- Renderizado seguro con DOM APIs/textContent; se mejoró la legibilidad de acciones y tablas. CSS responsive para tarjetas y rankings; no se añadieron librerías externas.
- Prueba nueva JS/Tests/ActivityDashboardInsights.mjs cubre agregación, desempate estable, ranking, respuestas negativas, confirmaciones/sugerencias, clasificación de actores, aplicaciones completadas, lectura acotada y XSS. CI final run 44006857813: 132 suites / 1,964 pruebas / 0 fallos; test específico GP-DASH-INSIGHTS-01 1/1 PASS. La sintaxis V8 de módulos JS del workflow también aprobó.
- GP-TERMS-ASYNC-01: 19/19 TermsAcceptance y 5/5 TermsAsyncSync PASS; regresión integral aprobada.
- GP-PWA-SPLASH-PRELOAD-01: 16/16 PWAStartupScenarios PASS; regresión integral aprobada.
- Los tres requerimientos quedan COMPLETADOS CON VALIDACIÓN DIFERIDA A BETA. Beta pendiente: visual real en Android/PWA y escritorio; tema claro/oscuro, teclado/accesibilidad y viewports; aceptación/sincronización remota AUTH; primer arranque/cache caliente/fría/IndexedDB real.
- Despliegue GitHub Pages es parte del flujo Beta autorizado por el usuario; no se requiere solicitar autorización adicional por cada ejecución. No se modificó configuración productiva de Pages.
- Auditoría.txt actualizado con hallazgos de dashboard y fuentes métricas. ChangesLogs.txt y Tareas_Pendientes.md sincronizados con evidencia y límites.
- Siguiente acción: verificar resultado final de Pages run 44006857769, HEAD remoto, commit documental y rama base; después continuar con el siguiente pendiente del backlog conforme a dependencias. No reconstruir historial anterior.


## Reconciliación adicional de backlog — 2026-11-17
- GP-UX-CUT-MODAL-01: la segunda corrección queda COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. CI run 44006857813 incluye CutDetailModalLayout 15/15 PASS; la suite total fue 132/1,964/0. La aceptación visual en Android/PWA y escritorio sigue pendiente.
- GP-PWA-SPLASH-PRELOAD-01: se corrige el estado activo del backlog que aún decía EN PROGRESO pese a contar con PWAStartupScenarios 16/16 PASS y CI integral aprobado. Queda COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.


## Publicación PWA y validación de feed — 2026-11-17
- Se añadió al feed reciente la referencia asociada del evento (ID de vehículo/elemento), sin interpolación HTML; la prueba específica confirma el texto de referencia.
- Se incrementó App Shell de v64 a v65 porque el CSS, HTML y módulo del dashboard se sirven desde caché PWA. Se actualizaron contratos ServiceWorkerCache y OfflineBrandAssets.
- Commit de código: 21b584638223a23f4dd61da601795d009c76d91e.
- CI: run 44007454034 SUCCESS, 132 suites / 1,964 pruebas / 0 fallos; GP-DASH-INSIGHTS-01 1/1, ServiceWorkerCache 10/10, OfflineBrandAssets 4/4; sintaxis V8 PASS.
- GitHub Pages run 44007452731: build, upload y deploy SUCCESS.
- Las pruebas reales de interfaz Android/PWA, escritorio, tema y accesibilidad continúan reservadas a Beta.


## Verificación integral y cierre de iteración — 2026-11-17
- HEAD de rama verificado antes de esta adenda: 0484a2470070a303256ecbf6c6205ad396c81dcd. Rama base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1; comparación de rama de trabajo: ahead, 0 behind.
- Última ejecución de regresión para el código y los registros: GitHub Actions run 44007607666 SUCCESS — 132 suites / 1,964 pruebas / 0 fallos; prueba de dashboard 1/1, ServiceWorkerCache 10/10 y OfflineBrandAssets 4/4; parsing V8 aprobado.
- GitHub Pages run 44007607153: build SUCCESS, report-build-status SUCCESS y deploy SUCCESS.
- App Shell en v65; los recursos del dashboard y estilos se invalidan correctamente en la caché PWA.
- Revisión del diff desde el HEAD inicial de esta iteración: cambios acotados a dashboard, agregación FEEDBACK, estilos/HTML, prueba de regresión, contratos de Service Worker y registros. Sin cambios en AUTH, roles, permisos, datos históricos, endpoints externos ni deployments Apps Script.
- GP-DASH-INSIGHTS-01, GP-TERMS-ASYNC-01 y GP-PWA-SPLASH-PRELOAD-01: COMPLETADAS CON VALIDACIÓN DIFERIDA A BETA. GP-UX-CUT-MODAL-01: regresión local aprobada; aceptación visual Beta pendiente.
- No quedan tareas locales abiertas identificadas en el backlog activo; permanecen pruebas de campo/Beta (navegador real, Android/PWA, temas, viewports, aceptación remota AUTH, IndexedDB y datos Spreadsheet reales).
- La autorización del usuario confirma que GitHub Pages puede desplegarse como parte del flujo Beta sin solicitar autorización por cada commit. La rama base no fue modificada.
- Continuidad: continuar con la siguiente fase de verificación Beta de las tareas cerradas, no abrir nuevas mejoras hasta completar la verificación integral prevista por NORMAS_DESAROLLO.md.


### Adenda — GP-AUTH-LOGIN-DRIVE-LOCK-01
- La primera regresión identificó dos recursos que bloqueaban AUTH/login: USERS (lectura explícita) y SESSION_CONTEXTS (lectura implícita). La corrección final elimina ambos de la lease específica de getCortesImageFolders, conserva DRIVE y utiliza el actor central autenticado.
- La prueba aislada del coordinador se ejecutó nuevamente después de corregir ambos recursos. La verificación de Google Drive/Apps Script desplegado y la prueba Beta tras el vencimiento del bloqueo de intentos continúan pendientes.


### Publicación complementaria de prueba — GP-AUTH-LOGIN-DRIVE-LOCK-01
- La verificación de árbol detectó que el primer commit no incluía el nuevo contrato de regresión. Se añade en un commit complementario sin reescribir el historial.
- La prueba versionada se ejecutó en harness aislado: 55/55 PASS, 0 fallos. CI del primer commit estaba en ejecución; se verificará también el nuevo HEAD.


---

## Continuidad — auditoría de solicitudes post revisión — 2026-11-16

- HEAD al inicio de esta actualización documental: c61deecd11239cc2f36760d05d409c9ed12863d9. Rama base: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin cambios.
- Se registran formalmente las ocho solicitudes en Tareas_Pendientes.md. GP-AUTH-LOGIN-DRIVE-LOCK-01 queda COMPLETADA CON VALIDACIÓN DIFERIDA A BETA; las otras siete permanecen PENDIENTES.
- GP-AUTH-PASSWORD-RECOVERY-01 auditada: el enlace olvidé contraseña no tiene listener; AUTH carece de acción de recuperación sin sesión; solo existen cambio con contraseña actual y restablecimiento administrativo. No se encontró servicio de correo en las fuentes inspeccionadas.
- Siguiente tarea: diseñar e implementar recuperación mediante correo registrado con código temporal de un solo uso, digest protegido, límites de intentos, respuesta no enumerable y revocación de sesiones; revisar API routing, Coordinator y scopes del deployment AUTH.


---

## Continuidad — GP-AUTH-PASSWORD-RECOVERY-01 — 2026-11-17
- HEAD de partida verificado: 301c7b3a5840549819b2b6126d548df44af07da2. Rama autorizada GPSpedia2.2.5_work; base GPSpedia2.2.5 verificada en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Normas vigentes, README, contexto operativo, checkpoint, backlog y registros activos consultados.
- Implementación preparada: recuperación por usuario+correo registrado, código temporal de un solo uso, HMAC en CacheService, 10 minutos, 5 intentos, 3 solicitudes/hora y respuesta no enumerable.
- La solicitud usa una lease PASSWORD_RECOVERY independiente y no bloquea login. La finalización coordina USERS, ACTIVE_SESSIONS, LOGS, SESSION_CONTEXTS y PASSWORD_RECOVERY; cambia PBKDF2-SHA256 y revoca sesiones anteriores.
- Frontend de dos pasos en el modal de login; App Shell v66. JS/Tests/Auth.js mantiene paridad con Auth.js salvo ID de Spreadsheet aislado.
- Estado EN PROGRESO hasta ejecutar PasswordRecovery.mjs, suite Node.js/CI y revisar el diff final. Beta pendiente: deployment AUTH, scope MailApp, recepción de correo, propiedades y revocación real.


### Adenda de CI — reubicación de exports AUTH — 2026-11-17
- El primer run del commit a8c4a087e10cadf9264ce92cf328ac2032d5321b aprobó sintaxis y 1,829 pruebas, pero falló SessionRestoreOnValidationFailure por una extracción de fuente que usa el export login como delimitador.
- Se identificó que los nuevos exports de recuperación estaban insertados antes de login y quedaban dentro del bloque de checkSession extraído por el harness. Se reubican al final de auth.js; no era un fallo de lógica de sesión.
- La suite completa debe repetirse después del commit correctivo. GP-AUTH-PASSWORD-RECOVERY-01 permanece EN PROGRESO hasta CI verde.


### Validación posterior al ajuste de exports
- Los exports de recuperación se movieron al final de JS/Frontend/auth.js para que el extractor de checkSession mantenga su límite. Se añade una aserción explícita en PasswordRecovery.mjs.
- Se requiere una nueva ejecución de GitHub Actions sobre este commit, ya que el workflow de servicios no se activó automáticamente con el commit anterior que solo tocó frontend y documentación.


### Cierre verificado — GP-AUTH-PASSWORD-RECOVERY-01 — 2026-11-17
- HEAD de implementación/pruebas: 06c9e1f0ea3e0468ea5a6d66c6e57bdd157a79df. Commits: a8c4a087e10cadf9264ce92cf328ac2032d5321b (flujo), b965db4241bdc2325b72e618c418a95995d35208 (límites de extracción AUTH), 06c9e1f0ea3e0468ea5a6d66c6e57bdd157a79df (contrato de regresión).
- GitHub Actions service-tests run 44073987141 SUCCESS; PasswordRecovery 10/10, coordinador 57/57 y SessionRestoreOnValidationFailure 15/15. Suite completa sin fallos.
- GitHub Pages run 44073810188 SUCCESS en el commit b965db4241bdc2325b72e618c418a95995d35208.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Pendiente despliegue autorizado del servicio AUTH, scope MailApp/script.send_mail, correo real y revocación de sesiones en entorno Beta.
- Rama base sin modificaciones: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Siguiente auditoría: GP-DEV-IMAGE-AUDIT-LIBRARY-UX-01 (continuidad de captura de referencias, snapshot y diseño de biblioteca). Después seguir con caché del Inbox.


### Continuidad — GP-DEV-IMAGE-AUDIT-LIBRARY-UX-01 — auditoría 2026-11-17
- Siguiente tarea iniciada tras cerrar GP-AUTH-PASSWORD-RECOVERY-01.
- Hallazgos: lectura de Cortes en múltiples grupos de columnas con presupuesto de 12s; el snapshot se guarda solo después de completar la captura. UI exige ADMIN 2.6.1 aunque el servicio publica 2.7.1, por lo que descarta respuestas/cursor válidos.
- Plan: agrupar ventanas de columnas con separación acotada, ampliar el presupuesto sin permitir snapshots parciales, validar versiones semánticas en UI, aclarar error de captura sin cursor y rediseñar la barra de biblioteca.
