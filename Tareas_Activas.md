# Tareas activas — GPSpedia

Repositorio: `infogpstech/GPSpedia`  
Rama autorizada: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5` — no modificar.  
Normativa: `NORMAS_DESAROLLO.md` (única fuente normativa).

## Plan de migración de URLs al frontend

El plan MIG-URL-001 a MIG-URL-008 conserva su orden y dependencias definidos en `Migracion_URL_Servicios_Frontend.md`. MIG-URL-008 es la única tarea restante de ese plan y requiere autorización para validar los endpoints Beta aislados. Mientras esa autorización no exista, se continúa el trabajo local ya solicitado y priorizado en la sección de continuidad, sin llamadas remotas ni despliegues.

- MIG-URL-001 — Alinear normativa y registrar el plan: **COMPLETADA — 2026-11-24**.
- MIG-URL-002 — Inventariar y verificar las seis URLs vigentes: **COMPLETADA — 2026-11-24**; seis valores confirmados directamente por el usuario y validados estructuralmente. Salud/identidad remota diferida a MIG-URL-008.
- MIG-URL-003 — Implementar `API_ENDPOINTS` local y resolución: **COMPLETADA — 2026-11-25**; seis URLs locales, 123 acciones y router/health locales.
- MIG-URL-004 — Retirar configuración central de endpoints: **COMPLETADA — 2026-11-25**; sin bootstrap, lector ni publicador central de URLs.
- MIG-URL-005 — Adaptar Developer y diagnóstico de salud: **COMPLETADA — 2026-11-25**; editor retirado, health local conservado.
- MIG-URL-006 — Desvincular estructuras de endpoints en Spreadsheet: **COMPLETADA — 2026-11-25**; hoja histórica preservada sin lectura/escritura.
- MIG-URL-007 — Pruebas locales, contratos y regresión: **COMPLETADA — CI 45519738860; 519 suites, 6,181 pruebas, 0 fallos; responsive-browser SUCCESS**.
- MIG-URL-008 — Validación Beta aislada y cierre: **PENDIENTE DE AUTORIZACIÓN — ÚNICA TAREA RESTANTE DEL PLAN MIG-URL**.

La configuración local debe reproducir el patrón de la rama protegida `GPSpedia2.2.5`: objeto único `API_ENDPOINTS` editado manualmente en `JS/Frontend/api-config.js`, con `ACTION_TO_SERVICE_MAP` para el enrutamiento. No usar `SERVICE_ENDPOINTS` como tabla paralela ni inventar otro administrador de URLs.


### Corrección GP-LIKE-VEHICLE-ID-PREFIX-01 — compatibilidad con IDs V-<n>

**Estado: IMPLEMENTADA; VALIDACIÓN CI EN CURSO Y BETA PENDIENTE.** El caso Beta reportó `vehicleId: V-105` y `corteIndex: 1`. La fila de la hoja `Cortes` contiene el ID exactamente como `V-105`. El validador de FEEDBACK solo admitía enteros decimales, por lo que rechazaba el ID antes de localizar la fila.

- Corregir exclusivamente el validador de `recordLike` para conservar IDs numéricos históricos y aceptar IDs canónicos `V-<n>` con componente numérico positivo y entero seguro.
- Mantener la comparación exacta contra la columna `id` de `Cortes`, la detección de duplicados y la identidad autenticada inyectada por FEEDBACK.
- Añadir regresión de éxito para `V-105` y rechazo para `V-0`; comprobar que el ledger conserva el ID exacto.
- No cambiar WRITE, el esquema de Spreadsheet ni IDs almacenados. No invocar el deployment ni escribir datos Beta desde esta tarea.

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

La única tarea restante del plan es **MIG-URL-008 — Validación Beta aislada y cierre**, pendiente de que el propietario confirme que las seis URLs corresponden a una Beta aislada y autorice las peticiones GET de salud. No ejecutar validaciones remotas sobre producción ni tareas ajenas al plan.


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

Esta sección consolida el estado vigente y prevalece sobre los apuntes históricos anteriores que todavía indiquen MIG-URL-002 o MIG-URL-003 como tarea activa. MIG-URL-001..007 están cerradas; MIG-URL-008 permanece pendiente de autorización para validar endpoints Beta aislados. La corrección de integridad de útiles se atiende como prioridad crítica sin realizar llamadas ni cambios en deployments Apps Script externos.

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

**Después de ambas implementaciones:** retomar las validaciones Beta diferidas de útiles FEEDBACK/CATALOG, vídeo YouTube real y MIG-URL-008. No realizar llamadas remotas ni despliegues sin autorización y entorno Beta aislado.


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
