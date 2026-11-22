# Auditoría UI — listeners, timers, observers y carruseles
Fecha: 2026-11-22
Rama: `GPSpedia2.2.5_work`
HEAD validado: `d97f487e49b1b5deef6d5ab89d7099b9d761a217`

## Hallazgo corregido

Dos funciones que reconstruyen carruseles registraban un listener `window.resize` por instancia:
- `crearCarrusel`: cada carrusel de catálogo añadía un closure de resize.
- `renderPosiblesProblemasAccordion`: cada render del acordeón PyS añadía otro closure.

Al reemplazar el contenido o cerrar la vista, los elementos DOM se retiraban pero los listeners globales permanecían, reteniendo las referencias de cada carrusel y programando trabajo innecesario en cada resize.

Corrección:
- Se eliminan ambos listeners por instancia.
- Se registra un solo listener global de resize para carruseles.
- El listener aplica debounce de 100 ms y consulta los `.carousel-container` presentes en el documento al ejecutarse; no conserva referencias a carruseles eliminados.
- Los listeners `scroll` y `click` permanecen vinculados a los nodos que se destruyen con su contenedor.
- Prueba nueva `CarouselResizeListenerLifecycle.mjs`, integrada en `RunServiceTests.mjs`: 5/5 PASS.

## Ciclos revisados

- `main.js`: listeners de login/búsqueda y shell se registran durante inicialización; MutationObservers del shell y overlays son de larga vida intencional; IntersectionObserver controla el elemento observado. El intervalo de actualización de Service Worker se crea una vez en `load`.
- `auth.js`: canal Broadcast/storage, visibilidad y conectividad se registran al cargar el módulo; las rutas con AbortSignal eliminan su listener al resolver/rechazar. Los enlaces de sesión usan guardas de inicialización.
- `ui.js`: sincronización Inbox ejecuta stop antes de start y limpia el intervalo al cerrar; polling de telemetría ADMIN es singleton y solo consulta si el panel visible está activo; conectividad Inbox y reintento de términos usan flags de binding; el listener popstate de menú se elimina al finalizar; el focus trap de modales desconecta MutationObserver y listener keydown al cerrar.
- `navigation.js`: timeout de transición con cancelación al completar.
- `catalogRequest.js`: timeout y listener AbortSignal se limpian al resolver/rechazar/cancelar.
- `imageObjectUrlCache.js`: observer central único para retirar ObjectURLs de nodos desconectados.

## Resultado

La fuga por listeners resize de carruseles se corrigió. En la inspección estática no se encontró otra acumulación global equivalente: los timers periódicos tienen singleton/stop, los listeners de modales tienen cleanup y los listeners de conectividad tienen guardas de registro. No se modificó el intervalo de Service Worker ni el refresco ADMIN porque son singleton y su callback evita solicitudes cuando la vista no está activa.

## Validación

CI del HEAD `d97f487e49b1b5deef6d5ab89d7099b9d761a217`:
- `CarouselResizeListenerLifecycle`: 5/5 PASS.
- Regresión: 294 suites / 3,440 pruebas / 0 fallos.
- Health read-only: SUCCESS.
- Pages build/deployment: SUCCESS.

## Pendiente

- Medir en navegador real CPU/memoria y frecuencia de resize con muchas vistas/carruseles.
- Revisar consultas repetidas al navegar entre secciones y el costo de IndexedDB/cache-first frente al primer render.
- No cambiar timers globales por hipótesis sin medición.


## Adenda — listeners estáticos del panel ADMIN (2026-11-22)

Se confirmó que `openDevToolsModal_` invoca `initAdminPanelListeners()` cada vez que se abre el panel. La función añadía handlers con `addEventListener` a nodos estáticos que permanecen en el DOM entre aperturas:
- `dev-terminal-input`: acumulaba keydown handlers y podía ejecutar el mismo comando varias veces.
- `backup-resource-input`: acumulaba dos handlers input independientes (estado de reanudación Drive y reinicio de previews de migración).
- `btn-admin-refresh-contribution-candidates`: acumulaba click handlers y consultas repetidas a CATALOG.

Corrección: se usan propiedades reemplazables `onkeydown`, `oninput` (combinando ambos efectos) y `onclick`, por lo que cada apertura sustituye el handler anterior y conserva la sesión/closure actual. Los handlers sobre tarjetas/botones creados dinámicamente permanecen ligados a nodos que se destruyen al renderizar de nuevo.

Prueba `AdminPanelListenerLifecycle.mjs`: 8/8 PASS. CI HEAD `d01fb34480bf5a64cf29fca37e033e6c74083fb9`: 296 suites / 3,454 pruebas / 0 fallos; health read-only y Pages SUCCESS.
