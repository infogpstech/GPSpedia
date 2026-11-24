# Tareas activas — GPSpedia

Repositorio: `infogpstech/GPSpedia`  
Rama autorizada: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5` — no modificar.  
Normativa: `NORMAS_DESAROLLO.md` (única fuente normativa).

## Plan de trabajo exclusivo — migración de URLs al frontend

**ÚNICO TRABAJO AUTORIZADO:** ejecutar exclusivamente MIG-URL-001 a MIG-URL-008, en el orden y con las dependencias definidos en `Migracion_URL_Servicios_Frontend.md`. No seleccionar ni ejecutar tareas Beta, auditorías pendientes u otras tareas ajenas mientras este plan permanezca abierto. Los hallazgos externos al plan se registran sin ejecutarlos, salvo riesgo crítico de seguridad/integridad que impida continuar.

- MIG-URL-001 — Alinear normativa y registrar el plan: **COMPLETADA — 2026-11-24**.
- MIG-URL-002 — Inventariar y verificar las seis URLs vigentes: **PENDIENTE — SIGUIENTE**.
- MIG-URL-003 — Implementar `API_ENDPOINTS` local y resolución: **PENDIENTE**.
- MIG-URL-004 — Retirar configuración central de endpoints: **PENDIENTE**.
- MIG-URL-005 — Adaptar Developer y diagnóstico de salud: **PENDIENTE**.
- MIG-URL-006 — Desvincular estructuras de endpoints en Spreadsheet: **PENDIENTE**.
- MIG-URL-007 — Pruebas locales, contratos y regresión: **PENDIENTE**.
- MIG-URL-008 — Validación Beta aislada y cierre: **PENDIENTE**.

La configuración local debe reproducir el patrón de la rama protegida `GPSpedia2.2.5`: objeto único `API_ENDPOINTS` editado manualmente en `JS/Frontend/api-config.js`, con `ACTION_TO_SERVICE_MAP` para el enrutamiento. No usar `SERVICE_ENDPOINTS` como tabla paralela ni inventar otro administrador de URLs.

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

Las tres tareas de esta solicitud están COMPLETADAS EN CÓDIGO Y CI. No queda una tarea de código activa en este registro. El siguiente trabajo pendiente corresponde a validaciones de integración en Beta aislada descritas en `Tareas_Beta.md` §§21–25. No ejecutar despliegues Apps Script, cambiar endpoints, propiedades, permisos, Spreadsheet, Drive, OAuth ni datos sin autorización Beta expresa y recursos aislados verificados.


## Plan MIG-URL — registro de tareas y exclusividad — 2026-11-24

Documento rector de ejecución: `Migracion_URL_Servicios_Frontend.md`. Las tareas MIG-URL-001..008 son las únicas autorizadas hasta cerrar el plan.

- **MIG-URL-001 COMPLETADA:** normativa §§17.1 y 18 alineada con el mecanismo de la rama protegida; plan completo creado; tareas y checkpoint actualizados.
- **MIG-URL-002 PENDIENTE:** inventario y verificación de URLs de AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN. Siguiente y única tarea autorizada.
- MIG-URL-003..008 permanecen pendientes y bloqueadas por sus dependencias.
- No continuar tareas de Beta ni otros trabajos fuera de este plan.
