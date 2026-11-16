# Checkpoint de continuidad — GPSpedia

**Fecha:** 2026-11-16  
**Repositorio:** `infogpstech/GPSpedia`  
**Rama de trabajo:** `GPSpedia2.2.5_work`  
**Rama base protegida:** `GPSpedia2.2.5` (sin modificaciones)  
**Commit de código verificado:** `52a05fb9aca89cabc685d9e0fba5b1b011370a89`

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
