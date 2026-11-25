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

**Estado: PENDIENTE — registrada por solicitud expresa del usuario el 2026-11-24.**  
**Orden:** ejecutar después de cerrar MIG-URL-008 y la fase actualmente prioritaria. No altera ni sustituye la tarea MIG-URL-008, que continúa siendo la única tarea activa mientras no se autorice y complete la validación Beta.

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

Esta sección consolida el estado vigente y prevalece sobre los apuntes históricos anteriores que todavía indiquen MIG-URL-002 o MIG-URL-003 como tarea activa. MIG-URL-001..007 están cerradas; MIG-URL-008 permanece pendiente de autorización para validar endpoints Beta aislados. La corrección de integridad de útiles se atiende como prioridad crítica sin realizar llamadas ni cambios en deployments externos.

### Prioridad 1 — Útiles: idempotencia por usuario/vehículo y estabilidad de CATALOG
**Estado:** IMPLEMENTACIÓN LOCAL APLICADA; CI/regresión y validación Beta pendientes.

- Un usuario puede registrar un útil una sola vez por vehículo, independientemente del corte en el que vuelva a pulsar.
- La consulta de duplicados y el append se ejecutan dentro de una sección crítica breve con `tryLock(0)`; si hay contención, el frontend reintenta silenciosamente hasta cinco veces (100–400 ms). El log de actividad queda fuera del lock.
- Se reconocen filas históricas repetidas o con identidad heredada normalizable; no se crea una nueva fila si ya existe un evento del mismo usuario y vehículo.
- CATALOG proyecta una sola contribución por usuario/vehículo, incluso si el ledger contiene filas repetidas o eventos asociados a cortes distintos; se conserva el primer corte registrado como atribución.
- Los nuevos eventos validan el ID numérico del vehículo, corte 1–3 e identidad del usuario antes de escribir. Identificadores de usuario fuera del alfabeto seguro se convierten a una clave estable SHA-256 compartida por FEEDBACK y CATALOG.
- La respuesta idempotente es exitosa, devuelve el contador confirmado y no incluye un mensaje de “ya dio útil”. La interfaz marca el vehículo como útil, no cada corte por separado.
- No se modifica el contador físico de Cortes para los eventos nuevos; CATALOG proyecta los actores únicos desde FeedbackLikes.

### Prioridad 2 — Dashboard: consolidar aportes de nombres idénticos
**Estado:** IMPLEMENTACIÓN LOCAL APLICADA; pruebas/regresión pendientes.

- Consolidar registros del mismo nombre visible normalizado aunque los servicios entreguen distintos IDs históricos.
- Sumar los cortes y aportes registrados de las filas agrupadas. No duplicar el mismo nombre en la tabla.
- Ejemplo de aceptación: `Pablo Peña — 365 cortes` y `Pablo Peña — 15 cortes` deben mostrarse como una sola fila con `380 cortes`.
- No cambiar servicios Apps Script ni el contrato de datos. Los conteos de vehículos se conservan con la regla actual de agregación porque el frontend no dispone de la identidad de cada vehículo para sumar sin riesgo de duplicarlos.

### Prioridad 3 — Modal de detalle de tutoriales: vídeo YouTube visible
**Estado:** IMPLEMENTACIÓN LOCAL APLICADA; CI y reproducción visual real pendientes.

- Usar el mismo tamaño/estrategia del iframe del vídeo guía de desarme del modal de detalle de corte: ancho 100 % y alto fijo de 315 px.
- Cargar el iframe de inmediato (sin lazy loading), mantener URL de embed validada, permisos de reproducción y pantalla completa.
- El contenedor no puede contraerse dentro del modal. No cambiar URLs ni datos guardados de tutoriales.

### Prioridad 4 — Encabezado de detalle de cortes/tutoriales
**Estado:** AJUSTE CSS LOCAL APLICADO; validación responsive pendiente.

- Mantener el título en una sola línea cuando quepa; si excede el ancho disponible, truncar de forma legible en lugar de partir palabras o generar saltos innecesarios.
- Alinear el borde inferior del logo y del nombre del modelo y conservar la misma separación visual respecto de la línea azul.
- Aumentar 2 px el tamaño del nombre del modelo en móvil.
- Confirmar en escritorio y móvil que el cierre y las acciones del modal no se desplacen ni se solapen.

### Continuidad obligatoria
- En el siguiente trabajo continuar desde estas cuatro prioridades, en el orden indicado; no volver a registrar tareas duplicadas.
- No cerrar ninguna prioridad hasta que pasen sus pruebas específicas, la regresión de servicios y la revisión responsive correspondiente.
- La reproducción real de vídeos y la comprobación funcional contra Apps Script/Spreadsheet quedan para Beta aislada y autorizada. No desplegar Apps Script ni modificar hojas, datos, permisos o endpoints durante las pruebas locales.
- La tarea previa **Actividad reciente** del Dashboard (tabla Fecha/Usuario/Acción con acordeón de detalle) sigue en cola separada; no se sustituye por la consolidación de aportes de esta solicitud.
