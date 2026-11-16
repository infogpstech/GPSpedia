# Checkpoint de continuidad — GPSpedia

**Fecha:** 2026-11-16  
**Repositorio:** `infogpstech/GPSpedia`  
**Rama de trabajo:** `GPSpedia2.2.5_work`  
**Rama base protegida:** `GPSpedia2.2.5` (sin modificaciones)  
**Commit de código verificado:** `95dd8205269849344b69b77e22898e4763096830`

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
