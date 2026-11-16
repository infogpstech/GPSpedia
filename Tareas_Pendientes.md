# GPSpedia — Tareas pendientes

**Documento operativo único del backlog.**  
Fecha de consolidación: 2026-11-16  
Repositorio: `infogpstech/GPSpedia`  
Rama autorizada: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5`  
HEAD verificado al consolidar: `9a49b4da18ab96c823aa51046d86132cd0d16595`

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
**Estado: PENDIENTE LOCAL.**

- Hacer que la preferencia de formato descriptivo sea uniforme en toda la plataforma.
- Solo Desarrollador puede modificar la configuración; los demás roles consumen el formato vigente.
- Evitar estilos o comportamientos exclusivos de una sola vista.

### BETA-024 — Ayuda contextual y textos concisos
**Estado: PENDIENTE LOCAL.**

- Retirar explicaciones repetitivas, obvias o innecesariamente extensas.
- Mantener visibles etiquetas breves, instrucciones indispensables y advertencias de riesgo.
- Mover el contexto secundario a controles de información `ⓘ` bajo demanda.
- Cada ayuda debe explicar qué hace la función, qué cambia, cuándo usarla y sus restricciones relevantes.
- Las ayudas deben ser breves, específicas, accesibles por pulsación/teclado/lector de pantalla, con foco visible y cierre accesible.
- No añadir `ⓘ` indiscriminadamente. **No añadirlo al modal de detalles de vehículos.**

### BETA-025 — Títulos y nombres largos
**Estado: PENDIENTE LOCAL.**

- Simplificar títulos, secciones, botones y etiquetas sin perder identificación.
- Preservar íntegramente los nombres reales de registros, archivos, vehículos y otros datos.
- Evitar desbordamientos mediante ajuste de línea, ancho flexible o detalle contextual; no modificar ni truncar el dato almacenado.
- Toda abreviatura debe ser inequívoca y mantener disponible el nombre completo mediante accesibilidad o detalle.

### BETA-026 — Modal de detalle de corte
**Estado: PENDIENTE LOCAL.**

- Reorganizar jerarquía, distribución y densidad para reducir saturación.
- Agrupar campos y acciones relacionados; usar pestañas solo si mejoran la navegación.
- Mantener las operaciones existentes y sus permisos.
- Revisar tamaños móviles y escritorio.

### BETA-020 — Cierres uniformes
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- La implementación local usa botones accesibles uniformes, foco visible y `prefers-reduced-motion`.
- Validar todos los modales en tema claro/oscuro, móvil/escritorio, teclado, foco, lector de pantalla y navegación Atrás.

### BETA-030 — Navegación del panel Desarrollador
**Estado: IMPLEMENTACIÓN LOCAL REPORTADA; PENDIENTE DE REVISIÓN Y BETA.**

- Confirmar barra horizontal de herramientas, iconos y expansión de la pestaña activa.
- Revisar jerarquía, agrupación y navegación del modal completo.
- Evitar secciones duplicadas y controles dispersos; agrupar herramientas por finalidad.
- Conservar permisos, confirmaciones destructivas y trazabilidad.

### BETA-031 — Animación del título
**Estado: IMPLEMENTACIÓN LOCAL REPORTADA; PENDIENTE BETA.**

- Verificar expansión del título al seleccionar pestaña.
- Respetar `prefers-reduced-motion` y validar en dispositivos reales.

### BETA-032 — Consola central
**Estado: PARCIAL; PENDIENTE LOCAL.**

- Mantener la consola en la parte superior y con la altura objetivo registrada del 50% del modal.
- Centralizar mensajes de éxito, error, progreso y confirmación de las funciones Developer.
- Evitar mensajes paralelos o duplicados en toast/banners para esas mismas operaciones.
- No ocultar errores ni eliminar estados accesibles.

### BETA-033 — Confirmaciones desde consola
**Estado: PENDIENTE LOCAL.**

- Implementar solicitudes de confirmación en la consola con respuestas afirmativas/negativas.
- Admitir equivalentes definidos (`y/n`, `si/no`, `s/n`, `ok`) y normalizar entradas.
- Rechazar respuestas ambiguas y no ejecutar operaciones destructivas sin confirmación válida.

### BETA-034 — Mensajes de operaciones
**Estado: PENDIENTE LOCAL.**

- Retirar mensajes externos duplicados al borrar, auditar u organizar imágenes.
- Dirigir resultados a la consola y mantener errores y estados comprensibles.

### BETA-035 — Textos del panel Desarrollador
**Estado: PENDIENTE LOCAL.**

- Aplicar títulos y etiquetas compactos.
- Llevar explicaciones secundarias a ayudas `ⓘ` específicas y accesibles.
- Aplicar la política común de nombres largos y textos breves.

**Alcance UX confirmado:** la organización integral del modal Desarrollador, la política de nombres largos, los textos concisos y las ayudas `ⓘ` se implementan dentro de BETA-021–026 y BETA-030–035. No abrir tareas paralelas ni reabrir GP-DEV-UX-01, cuyo alcance original está completado.

---

## 2. Inbox, comunicaciones y modales de operación

### GP-INBOX-ORDER-01 — Orden del historial
**Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA.**

- Validar lectura, orden, refresco y marcador de lectura en el deployment y navegador Beta.
- Probar fechas iguales o no monotónicas, paginación y recuperación de caché en escritorio y móvil.

### GP-INBOX — Diagnóstico funcional end-to-end
**Estado: PENDIENTE LOCAL DE AUDITORÍA; PENDIENTE BETA DE INTEGRACIÓN.**

- Revisar el flujo UI → wrapper API → dispatcher FEEDBACK → Coordinator → InboxConversations → Spreadsheet.
- Confirmar filtros de carpeta (recibidos, enviados, no leídos y archivados), listado, carga de mensajes, lectura y paginación.
- Mantener el orden de inserción del backend y la combinación estable de páginas en frontend.
- Verificar el manejo explícito de hojas ausentes o esquema parcial; no convertir un esquema incompleto en Inbox vacío ni crear/renombrar hojas reales automáticamente.
- Correlacionar cualquier error Beta con la respuesta real de FEEDBACK y la versión desplegada. No atribuirlo a código local sin evidencia.

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
**Estado: DISEÑO/IMPLEMENTACIÓN LOCAL PARCIAL; PENDIENTE BETA.**

- Verificar ACL reales de carpetas/archivos Drive y clasificar qué imágenes deben ser públicas por diseño.
- Comparar referencias de Cortes con Drive: coincidencias, faltantes, duplicados y ambiguos.
- Cualquier escritura de conciliación requiere copia, dry-run, respaldo y autorización expresa.

### GP-BETA-06 — suggestYear y cobertura de acciones protegidas
**Estado: CORRECCIÓN LOCAL DE suggestYear COMPLETADA; PENDIENTE DE AUDITORÍA Y BETA.**

- Probar ruta anónima y autenticada, y el umbral efectivo de sugerencias.
- Revisar acciones protegidas fuera de los routers compartidos para detectar omisiones de Coordinator o contratos inconsistentes.

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
**Estado: AUDITORÍA LOCAL AVANZADA; PENDIENTE DE REVISIÓN GLOBAL Y BETA.**

- Identificar viajes de red y verificaciones redundantes restantes.
- Mantener autorización backend dentro de la propia operación protegida; no sustituirla por confianza en frontend.

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
**Estado: RETIRADA PARCIAL REPORTADA; PENDIENTE DE AUDITORÍA LOCAL.**

- Auditar inventario completo de servicios, UI, registros, contratos y referencias residuales.
- No borrar datos históricos sin autorización.

### BETA-043 — Tráfico global por servicio
**Estado: PENDIENTE DE DISEÑO E IMPLEMENTACIÓN LOCAL.**

- Diseñar telemetría centralizada por servicio y plataforma con ventanas temporales, deduplicación y agregación backend.
- Distinguir tráfico global de actividad del navegador local.
- No presentar la suma de contadores locales como tráfico global.

---

## 8. Regresión integral y validación de campo

**Estado: PENDIENTE DE EJECUCIÓN FINAL TRAS COMPLETAR LAS IMPLEMENTACIONES LOCALES.**

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
