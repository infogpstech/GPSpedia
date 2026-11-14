# Checkpoint — Inbox y Developer

Fecha: 2026-11-13  
Repositorio: `infogpstech/GPSpedia`  
Rama de trabajo: `GPSpedia2.2.5_work`  
Rama base: `GPSpedia2.2.5`  
HEAD verificado antes de este checkpoint: `cf2a3d47de066b89dcc926001d264dc9e70be555`

## Estado

**COMPLETADA CON VALIDACIÓN DIFERIDA**

## Resultado implementado

- `JS/Frontend/ui.js`: la autorización de apertura de vistas privilegiadas reutiliza la validación reciente de sesión y comparte solicitudes concurrentes de la misma sesión. Solo abre la vista cuando AUTH confirma `true`; `null` o error mantienen el acceso protegido cerrado sin ejecutar logout.
- `JS/Frontend/ui.js`: `setupModal` utiliza el callback de cierre específico cuando no existe una entrada administrada. Inbox limpia sincronización, clase del documento y foco al cerrarse por navegación Atrás; Developer actualiza `aria-hidden` y restaura el foco.
- `style.css`: navegación de Developer móvil con etiquetas visibles y distribución adaptable; Inbox con encabezado, acciones, pestañas, carpetas y búsqueda mejor organizados. Se conserva el sistema visual de GPSpedia.
- `JS/Tests/OverlayMenuModalHistory.js`: cobertura adicional de validación de sesión, cierre de overlays y etiquetas móviles.
- `ChangesLogs.txt`: registro de cambios y validaciones.

## Validación local realizada

- Compilación sintáctica V8 de los bloques modificados: PASS.
- Escenarios aislados de pila de overlays: 4/4 PASS.
- Validación concurrente compartida de sesión: 1/1 PASS.
- Contratos estáticos de apertura, cierre y estilos responsive: 10/10 PASS.

## Validación diferida a Beta

- Ejecución del runner completo mediante Node CLI.
- Apertura real desde el menú en navegador Android y escritorio.
- Cierre mediante botón Atrás, botón X y backdrop en dispositivos reales.
- Revisión visual en distintos anchos y alturas de pantalla, en temas claro y oscuro.
- Comportamiento con conexión lenta/intermitente y sesión revocada confirmada.

La corrección de recuperación de sesión modificó `JS/Frontend/auth.js`, `JS/Frontend/api-config.js` y `Services/Auth.js`. No se alteró la política de expiración/revocación ni se debilitó la autorización backend. La rama base no se modificó.

## Continuidad

La siguiente acción es validar en Beta la interacción real de Inbox y Developer, especialmente el primer clic desde el menú lateral y la navegación móvil. Si aparece un defecto reproducible, corregir únicamente el bloque afectado y repetir sus pruebas.

 
## Corrección adicional — restauración de sesión al actualizar

**Estado: IMPLEMENTADA EN RAMA DE TRABAJO; DESPLIEGUE AUTH Y BETA PENDIENTES**

### Causa identificada
- `checkSession()` forzaba una consulta remota en cada recarga y, ante timeout/respuesta no concluyente, mostraba el login aunque el token siguiera almacenado.
- El handler de AUTH convertía excepciones internas en `valid:false`, confundiendo fallas de infraestructura con revocaciones reales.
- `touchSession` aplicaba la misma clasificación destructiva a errores temporales.

### Cambios
- `JS/Frontend/auth.js`: reutiliza una validación reciente; ante timeout, desconexión o resultado no concluyente restaura la sesión local y mantiene el bloqueo de términos mediante `showApp`. Solo cierra sesión por expiración local o revocación remota confirmada.
- `JS/Frontend/auth.js`: compatibilidad con respuestas antiguas `valid:false` que incluyen error de infraestructura y motivos `missing_sheet` / `role_revocation_pending`.
- `JS/Frontend/api-config.js`: `touchSession` diferencia sesión revocada de AUTH temporalmente no disponible. Las operaciones protegidas siguen bloqueadas hasta confirmar sesión.
- `Services/Auth.js`: errores internos, hojas faltantes y errores al procesar una revocación pendiente devuelven `valid:null` / `unavailable`; token ausente, sesión inexistente, expirada o revocada mantiene `valid:false`.
- `JS/Tests/SessionRestoreOnValidationFailure.mjs`: 14 pruebas de regresión.

### Validación
- Escenarios aislados ejecutados en V8: 17/17 PASS.
- Sintaxis de bloques frontend y handlers AUTH: PASS.
- Sintaxis del nuevo archivo de pruebas: PASS.
- Node CLI no ejecutado en este entorno; el archivo .mjs debe ejecutarse en el runner del repositorio.
- No se modificó `service-worker.js`: no se encontró una eliminación de `gpsepedia_session` desde el Service Worker.

### Pendientes de despliegue y verificación
1. Desplegar `Services/Auth.js` en el proyecto de Google Apps Script que corresponde al endpoint AUTH configurado en `JS/Frontend/api-config.js`. El commit de GitHub no publica automáticamente el servicio.
2. Ejecutar `JS/Tests/SessionRestoreOnValidationFailure.mjs` con Node CLI.
3. Probar actualización normal y pull-to-refresh en Android y escritorio, con conexión rápida, lenta y temporalmente interrumpida.
4. Confirmar que una sesión realmente revocada o expirada sigue enviando al login y que la aceptación de términos de una versión nueva continúa bloqueando el catálogo.

La rama base `GPSpedia2.2.5` permanece intacta.


## Actualización del endpoint AUTH

**Estado: CAMBIO DE CONFIGURACIÓN PUBLICADO EN RAMA DE TRABAJO**

- `JS/Frontend/api-config.js`: `API_ENDPOINTS.AUTH` apunta ahora al deployment proporcionado: `https://script.google.com/macros/s/AKfycbw9Xr8_Pzi_rSt8YYXu8SuaYqMdj_VxzsgtUnztDcjT_aQdxFeHVYYSW9HXDjAmXl4D/exec`.
- No se modificaron los endpoints de otros servicios ni el enrutamiento de acciones.
- Commit de configuración: `471ee04321c635e62b1ac8078985d96d098be747`.
- Pendiente para Beta: verificar que el deployment responde con el contrato `GPSpedia-Auth` y probar login, validateSession, touchSession, acceptTerms y logout. El cambio de URL no publica ni altera el código del proyecto Apps Script.

 
## Corrección integral — AUTH, términos, modales, imágenes y avisos

**Estado: IMPLEMENTADA EN RAMA DE TRABAJO; DESPLIEGUE Y BETA PENDIENTES**

### Cambios

1. **Validación AUTH al actualizar**
   - `validateSession` ahora es una comprobación de solo lectura, independiente del coordinador compartido. Verifica token único, identidad, usuario activo, expiración y revocación pendiente.
   - La lectura usa `tryLock(2500)`; si el recurso está ocupado o falta una dependencia, devuelve indisponibilidad, nunca una revocación inventada.
   - `touchSession` continúa actualizando actividad bajo lease coordinada. Las operaciones protegidas no se habilitan por el fallback local.
   - El nuevo endpoint de diagnóstico `?debug=true` informa `coordinatorConfigured` sin revelar secretos. Developer muestra si faltan `GPSpedia_COORDINATOR_URL` o `GPSpedia_COORDINATOR_SECRET`.

2. **Inbox y Developer**
   - Si AUTH devuelve `valid:null` o un error transitorio, se permite abrir la interfaz usando el rol de la sesión local vigente.
   - Una respuesta `valid:false` confirmada sigue bloqueando y cerrando la sesión.
   - Las operaciones de Inbox/Developer continúan protegidas por los servicios backend y `touchSession`.

3. **Términos por sesión**
   - `ActiveSessions` incorpora la columna G `SessionTermsAcceptance`.
   - Cada token nuevo empieza pendiente y debe aceptar la versión vigente. La aceptación queda ligada al token; la columna I de Users se conserva como historial.
   - El catálogo no se descarga ni muestra antes de aceptar. Tras confirmar `acceptTerms`, se inicia la carga.
   - Si la columna G contiene otro encabezado o datos sin encabezado, AUTH falla cerrado sin sobrescribirlos.

4. **Tiempo de inicio de sesión**
   - Se eliminaron escrituras INFO/DEBUG genéricas a Spreadsheet en cada solicitud y logs de éxito innecesarios.
   - Login reutiliza la instancia de Spreadsheet abierta y evita una llamada `touchSession` redundante al aceptar términos.
   - La mejora real de latencia debe medirse contra el deployment Beta.

5. **Imágenes**
   - La URL remota se precarga antes de asignarse al elemento visible; intenta CORS y reintenta sin CORS cuando el proveedor no lo admite.
   - Se usa un SVG local como fallback, evitando el icono roto.
   - Service Worker v24 aplica cache-first a imágenes verificadas HTTP 200, actualiza en segundo plano y limita el caché a 150 imágenes.

6. **Mensajes**
   - Los avisos globales de más de 110 caracteres se reducen a un mensaje esencial; el detalle se conserva en consola y en la terminal de Developer.
   - HTML/users.html y HTML/add_cortes.html envían también los errores extensos/dinámicos al aviso central.
   - Las confirmaciones de operaciones destructivas conservan la explicación necesaria para que el usuario decida con seguridad.

### Validación realizada
- SessionUiRoleInvalidation: 13/13 PASS.
- SessionProfileRefresh: 21/21 PASS.
- SharedMutationCoordinator: 34/34 PASS.
- validateSessionReadOnly_: 6/6 PASS.
- Comprobaciones AUTH dirigidas: 9/9 PASS.
- Service Worker cache-first: 1/1 PASS.
- Sintaxis de Services/Auth.js, Services/Coordinator.js, SharedMutationClient.js, ui.js, api-config.js, auth.js, main.js, service-worker.js y scripts inline de HTML: PASS.
- Espejo de pruebas JS/Tests/Auth.js sincronizado con Services/Auth.js, salvo el SPREADSHEET_ID aislado.
- No se ejecutó Node CLI completo ni se realizaron pruebas reales de interfaz en Android/escritorio. El endpoint AUTH externo no pudo consultarse desde este entorno.

### Despliegue y validación pendientes
1. Actualizar el proyecto Apps Script del nuevo endpoint AUTH con `Services/Auth.js` y `Services/SharedMutationClient.js`; publicar una nueva versión del deployment.
2. Verificar en ScriptProperties de AUTH `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET`; el coordinador debe tener el secreto correspondiente `GPSpedia_COORDINATOR_SECRET_AUTH`. En Developer, escanear servicios y confirmar AUTH con identidad `GPSpedia-Auth` y `coordinatorConfigured: true`.
3. Confirmar que la columna G de ActiveSessions está libre para `SessionTermsAcceptance`; el primer login la crea automáticamente si está vacía.
4. Publicar la rama de trabajo en Beta y probar: login/latencia, aviso en cada token nuevo, aceptación, refresh, sesión expirada/revocada, red lenta/offline, apertura de Inbox/Developer al primer clic, operaciones protegidas, imágenes en caché y errores en terminal.
5. Ejecutar con Node CLI los archivos de pruebas actualizados, incluida la suite PWA y de accesibilidad.

La rama base `GPSpedia2.2.5` no se modifica. No se realizó deployment productivo.

## Corrección — continuidad de sesión, navegación y modales (2026-11-13)

**Estado:** IMPLEMENTADA EN RAMA DE TRABAJO; CI NODE.JS PASS; validación Beta pendiente.

- Se corrigió la pérdida de TermsAcceptance cuando AUTH reutiliza una validación cacheada sin devolver ese campo.
- La validación local reciente se cachea durante 60 segundos. Se eliminaron revalidaciones forzadas al recuperar foco/visibilidad y el intervalo de cinco minutos; se conserva un disparador silencioso al recuperar conexión.
- AUTH temporalmente indisponible ya no genera un banner repetitivo al restaurar la sesión local.
- La sincronización del catálogo reutiliza la instantánea local y evita otra descarga durante 60 segundos después de una sincronización confirmada; la reconciliación continúa usando performSilentSync.
- Inbox y Developer abren con el rol local vigente sin esperar la red; las operaciones protegidas siguen sujetas a validación backend.
- El cierre del menú tiene un fallback de 500 ms si el navegador no emite popstate.
- El saludo utiliza Nombre_Completo, Nombre_Usuario o ID; el banner superior omite loading.
- La compresión de miniaturas es opcional y aplica backoff; no bloquea la imagen original.
- Se añadieron restricciones visuales contra menú contextual, copia/corte/selección y arrastre de imágenes en contenido no editable. Los campos editables conservan pegar/edición; F12, atajos de inspección y zoom permanecen nativos.

### Validación pendiente
Node CLI completo, GitHub Actions y pruebas Beta de navegación entre index.html, users.html y add_cortes.html; sesión expirada/revocada; conexión intermitente; modales Developer/Inbox; imágenes Drive y PWA instalada.

La rama base GPSpedia2.2.5 no se modifica. No se cambian deployments ni endpoints productivos.

- 2026-11-13 — Ajuste posterior de robustez: el fallback del menú retira también la entrada interna de overlay y sincroniza History.state; el timestamp de catálogo solo se confirma después de guardar la instantánea. Se actualizaron pruebas de overlays para el nuevo modelo de validación AUTH no bloqueante y se corrigieron sus aserciones de política visual.

- 2026-11-14 — CI identificó rutas de dos suites heredadas que apuntaban a `JS/Services/` aunque los servicios activos están en `Services/`. Se corrigieron las rutas de `ActivityLogRetention.mjs` y `AdminReplacedImagesIntegrity.mjs`; la suite de imágenes se invoca en dos grupos y ambos fallos procedían del mismo path.
- 2026-11-14 — Se corrigieron también las referencias secundarias de `spawnSync` y la comprobación de integridad de imágenes que aún conservaban `../Services/`; ambas apuntan ahora a `../../Services/` desde `JS/Tests/`.
- 2026-11-14 — Segunda ejecución CI precisó tres referencias restantes: dos rutas relativas con un `../` adicional y un test de respaldo que aún esperaba `JS/Services/admin.js`. Se alinearon con `Services/` desde la raíz y se vuelve a ejecutar el runner completo.
- 2026-11-14 — Tercera pasada CI: se corrigieron rutas heredadas restantes en DriveTerminalScope, VideoApprovalClientContract y AdminImageTrashLifecycle para resolver `Services/` desde la raíz real del repositorio.
- 2026-11-14 — Se eliminó también la recarga completa activada por pull-to-refresh. El gesto ahora fuerza únicamente la sincronización diferencial del catálogo, con cooldown de 15 segundos y sin reiniciar el documento ni la sesión.
- 2026-11-14 — Se endureció el gesto pull-to-refresh para descartar inicios de toque fuera del borde superior y eventos touchend sin inicio válido; se actualizó su prueba de ventana de caché con el parámetro forceRefresh.
- 2026-11-14 — Cuarta pasada CI: se corrigieron rutas absolutas heredadas `JS/Services/` en AdminAuditTrail, VideoApprovalClientContract y AdminSheetActionsContract; los servicios fuente están en `Services/`.
- 2026-11-14 — Quinta pasada de rutas CI: se corrigieron las referencias de AdminAuditTrail, SupplementaryVideoContract, AdminSheetActionsContract e InboxConversations. Se revisaron las 45 suites invocadas por el runner y se identificaron las referencias heredadas adicionales.
- 2026-11-14 — La suite de integración alcanzó 1001 pruebas aprobadas; el único fallo restante era una expectativa antigua de caché v24 en TermsModalAccessibility. Se actualizó a v25, correspondiente al service worker publicado.
- 2026-11-14 — CI alcanzó 1118 pruebas aprobadas; la última suite fallida detectó un console.warn directo en el fallback de add_cortes. Se retiró la exposición de detalles en consola y se conserva el aviso genérico al usuario.
- 2026-11-14 — El cargador de imágenes ahora inicia la URL original antes de consultar IndexedDB; elimina la sonda duplicada y solo sustituye por miniatura local si esta llega antes de la imagen visible. La compresión queda en segundo plano.
- 2026-11-14 — Se afinó la aserción de carga de imágenes para comparar con la lectura real de IndexedDB (`getThumbnail`) y no con la obtención previa de la clave (`getThumbnailCacheKey`).
- 2026-11-14 — La suite AddCortesDiagnostics llegó a la recuperación conductual y reveló que el harness no inyectaba la función global `showConciseAlert_` disponible en la página real. Se añadió el stub equivalente al contexto de prueba.

## Cierre de tarea — 2026-11-14

- **GitHub Actions — GPSpedia service regression tests:** PASS.
- **Resultado Node.js CLI:** 75 suites, 1,149 pruebas aprobadas, 0 fallos.
- **Comprobaciones de sintaxis Node.js:** PASS.
- **Compilación GitHub Pages:** PASS; no se solicitó ni ejecutó publicación manual a producción.
- **Cambios funcionales:** continuidad de AUTH, apertura no bloqueante de modales, sincronización diferencial sin reload, carga inmediata de imágenes, compresión opcional con backoff y restricciones visuales de copia/contexto.
- **Pendiente externo:** validación visual en navegador/dispositivo con sesiones reales, conectividad intermitente y archivos reales de Drive. No se alteró la rama base ni se modificaron endpoints productivos.

Commit de código validado por la ejecución completa: `2566547d19ae86d70cab07a768ba336958480b62`.


## Nueva línea de trabajo — autenticación, Inbox, protección de imágenes y migraciones (2026-11-14)

**Estado general: PLAN REGISTRADO; PAQUETE P0 EN PROGRESO.**  
Rama autorizada: `GPSpedia2.2.5_work`. HEAD de inicio verificado: `c5453d6ff4b21b0dd8fede3f1b128e892e56c268`. La rama base `GPSpedia2.2.5` permanece fuera del alcance.

### Requisitos incorporados
1. Simplificar autenticación: una validación de credenciales en el inicio de sesión, sesión persistente y privilegios asociados al rol vigente. Evitar validaciones periódicas redundantes y viajes de red separados para comprobar sesión.
2. Rediseñar Inbox con organización y experiencia de bandeja similares a Outlook/Gmail, conservando la identidad visual GPSpedia y priorizando móvil.
3. Restringir descarga, menú contextual y acciones casuales de copia de imágenes. Mantener compartir integrado en el modal para todos los roles.
4. Permitir compartir, imprimir y editar detalles desde el modal solo a Supervisor, Jefe y Desarrollador. Verificar el alias histórico `Gefe` antes de normalizar roles.
5. Investigar controles frente a capturas de pantalla. No prometer ni diseñar un bloqueo absoluto en web/PWA: los navegadores no ofrecen una API web universal para impedir capturas del sistema operativo.
6. Recuperar/implementar migración de contraseñas heredadas a hash seguro.
7. Auditar y completar migración de IDs basados en fórmulas a identificadores asignados por backend para usuarios, vehículos, tutoriales y relays.

### Hallazgos preliminares de P0
- `JS/Frontend/auth.js` conserva sesión en almacenamiento local, tiene caché de validación de 60 s y comprueba sesión al restaurar la app; el estado local no debe convertirse por sí solo en autorización backend.
- `JS/Frontend/api-config.js` ejecuta `touchSession` antes de acciones protegidas, con una ventana local de 5 minutos. Esta ruta añade una llamada separada que debe evaluarse para eliminarla sin debilitar la autorización de cada operación.
- `Services/Auth.js` valida token, usuario, vigencia y revocación; aplica expiración absoluta de 3 meses e inactividad de 1 mes. La autorización por rol debe permanecer en backend para cada operación sensible, sin exigir una reautenticación del usuario.
- `Services/Auth.js` ya convierte automáticamente una contraseña heredada a hash al iniciar sesión correctamente. El formato existente es SHA-256 con salt aleatorio; es una migración oportunista, no una herramienta administrativa por lotes, y el algoritmo requiere evaluación de coste antes de definir el formato objetivo.
- `Services/users.js` ya genera IDs nuevos de usuario como `USR-0001` y almacena nuevas contraseñas con hash.
- `Services/write.js` ya dispone de asignador backend de IDs numéricos para vehículos, contador central y acciones de asignación/congelación de fórmulas. Falta auditar la cobertura real de registros antiguos y el flujo de migración.
- `Services/feedback.js` ya genera IDs de tutorial con prefijo `tut-` basados en identificadores de operación, y IDs de Problemas con prefijo `isue-`. La cobertura de IDs para Relay y el estado de las fórmulas restantes debe verificarse.
- `JS/Frontend/clientInteractionPolicy.js` ya bloquea contextmenu, copy, cut, selectstart y dragstart en contenido no editable. Es fricción visual, no protección contra extracción de recursos ni capturas del sistema operativo.
- Inbox ya cuenta con lista, detalle, paginación, caché, toolbar y acciones. El rediseño debe preservar contratos y capacidades existentes, no reemplazar el servicio de mensajería.

### Paquetes y dependencias
- **P0 — Auditoría y diseño técnico (EN PROGRESO):** inventario de rutas de autenticación/autorización, estados de sesión, roles reales, funciones del Inbox, políticas de imágenes, esquema de IDs y migraciones existentes. Definir contratos y plan de reversión.
- **P1 — Autenticación simplificada (PENDIENTE; depende de P0):** eliminar llamadas redundantes de validación/touch de navegación y separar claramente autenticación inicial, persistencia de sesión y autorización backend por operación. Mantener revocación, expiración, bloqueo de cuenta y actualización inmediata de privilegios.
- **P2 — Migraciones de credenciales e IDs (PENDIENTE; depende de P0):** migración verificable e idempotente de contraseñas a un formato de hash versionado; completar asignación de IDs backend para usuarios, vehículos, tutoriales y relays; detectar duplicados, referencias huérfanas y fórmulas no convertidas. Preparar ejecución por lotes, conteos antes/después y reversión.
- **P3 — Inbox (PENDIENTE):** rediseño de navegación, carpetas/estados, lista de mensajes, panel de lectura, búsqueda, acciones y responsive móvil; preservar paginación, caché, lectura/no leído, archivado y permisos.
- **P4 — Modal de imágenes y RBAC (PENDIENTE):** definir política de visualización/compartir y controles UI; imponer permisos en backend para compartir/ imprimir/editar cuando corresponda; todos los usuarios conservan solo el compartir integrado. Bloquear acciones casuales de descarga/contexto/copia en imágenes sin romper accesibilidad ni campos editables.
- **P5 — Capturas de pantalla (PENDIENTE):** evaluar capacidades reales de navegador/PWA/Android. Implementar únicamente controles compatibles (por ejemplo, marca de agua contextual y ocultación de contenido sensible al perder visibilidad, si se justifica); documentar límites.
- **P6 — Regresión e integración (PENDIENTE):** pruebas por rol, sesiones persistentes, revocación/expiración, migraciones, referencias, Inbox, modal, móvil, offline y rendimiento.

### Criterios de aceptación transversales
- No solicitar usuario/contraseña al navegar entre páginas o abrir modales mientras la sesión siga válida.
- No hacer llamadas independientes periódicas de validación por rutina. Las operaciones protegidas siguen verificando token y rol en el backend dentro de su propia solicitud; el cliente nunca concede privilegios por confiar solo en localStorage.
- Cambios de rol, desactivación, cierre de sesión o revocación deben reflejarse en operaciones posteriores; la persistencia no equivale a sesión eterna.
- Migraciones repetibles sin duplicar IDs, perder referencias ni alterar registros ambiguos; simulación/plan antes de escritura y evidencia de reconciliación.
- Los permisos de interfaz deben coincidir con controles backend. No confiar en ocultar botones.
- La web/PWA no puede garantizar impedir capturas de pantalla, fotografías externas o acceso a recursos descargados por el navegador.
- Cada paquete cierra con pruebas locales reproducibles, diff revisado, registro y commit en esta rama. Integración real con Apps Script/Spreadsheet, navegador y dispositivos se registra como validación Beta diferida.

### Siguiente acción
Completar P0 inspeccionando contratos de login, `touchSession`, middleware/handlers de cada servicio, Inbox, modal de compartir/imprimir/editar y esquemas de ID/formulas. No modificar datos productivos ni desplegar Apps Script durante la auditoría.


### Evidencia adicional de auditoría P0 — 2026-11-14
- `Services/Auth.js` confirma que `Jefe` es alias de compatibilidad de `Gefe`; conservar compatibilidad de ambos valores al aplicar la matriz RBAC.
- `Services/feedback.js` valida sesión en acciones Inbox, pero no restringe la bandeja a roles administrativos.
- En `ui.js`, compartir e imprimir aparecen actualmente para todos; edición in-modal solo para Desarrollador. Esto no satisface el permiso solicitado para imprimir/editar de Supervisor y Jefe.
- Vehículos, usuarios, tutoriales y Problemas ya tienen mecanismos backend parciales de IDs; queda verificar fórmulas y referencias históricas, especialmente Relay.
- La conversión de contraseña legacy ocurre al login correcto; falta determinar e implementar la utilidad explícita por lotes que el usuario reporta como ausente.
- P0 continúa EN PROGRESO. No se modificó código funcional, hojas ni deployments durante esta auditoría.


### Corrección confirmada de matriz de permisos — 2026-11-14
- El botón integrado de compartir del modal está disponible para todos los usuarios, incluidos Técnico y Técnico Exterior.
- Las acciones restantes solicitadas (imprimir y editar detalles) requieren un rol superior a Técnico/Técnico Exterior: Supervisor, Jefe (alias histórico `Gefe`) o Desarrollador.
- No restringir compartir general al grupo administrativo. Aplicar la distinción en UI y backend donde corresponda.


## Nueva solicitud incorporada al plan — Developer, imágenes y ayudas contextuales (2026-11-14)

**Estado: REGISTRADA; PENDIENTE.** Se añadió el bloque GP-DEV-UX-01, GP-IMG-UX-01, GP-IMG-DATA-01 y GP-UX-INFO-01 a `Tareas_Activas.md`. Se conserva el orden P0–P6; esta ampliación se atenderá después de las tareas vigentes, según `NORMAS_DESAROLLO.md`.

- Developer: agrupar Respaldo y Base de datos en una pestaña; corregir proporciones de Migrar esquema y del selector de limpieza de logs/actividad.
- Biblioteca de imágenes reemplazadas: modal tipo carpeta Drive, espacio despejado, cuadrícula/lista mediante iconos, miniaturas de tamaño adecuado por vista, selección simple/múltiple y menú de tres puntos con borrar/mover/restaurar/descargar.
- Conflicto que debe resolverse antes de implementar: la descarga solicitada en esta biblioteca contradice la política previa de no permitir descargas generales de imágenes. El plan exige decidir si existe una excepción limitada al panel Developer y fijar sus roles; no se habilita por inferencia.
- Drive–Spreadsheet: recorrer carpeta de cortes, comparar imágenes con registros, identificar faltantes y preparar la migración de URL pública al campo correspondiente. Requiere dry-run, detección de duplicados/ambiguos, idempotencia y autorización expresa antes de escribir datos productivos.
- Ayudas: reducir textos extensos y utilizar icono ⓘ con burbuja contextual en Developer, campos versión/Trim Level, tipo de corte, configuración Relay y rango de años de `HTML/add_cortes.html`, además de formularios de tutoriales PYS. No colocar ⓘ en el modal de detalles.
- No se implementó código ni se modificaron Drive/Spreadsheet; este cambio es únicamente de planificación y continuidad.


================================================================================
CONTINUIDAD — 2026-11-14 — CIERRE DE AUDITORÍA P0
Rama de trabajo: GPSpedia2.2.5_work
HEAD verificado antes de este checkpoint: 894815976e74187b9fcd25987751798e30b2acad
Rama base protegida: GPSpedia2.2.5 (sin modificaciones)

ESTADO
- P0 — Auditoría y diseño técnico: COMPLETADA CON VALIDACIÓN DIFERIDA.
- P1 — Autenticación simplificada: SIGUIENTE TAREA; aún no implementada.
- P2 — Migración de contraseñas e identificadores: pendiente de P1/diseño de migración.
- P4 — Matriz de permisos UI/backend: pendiente; discrepancias confirmadas.
- GP-DEV-UX-01, GP-IMG-UX-01, GP-IMG-DATA-01 y GP-UX-INFO-01: permanecen pendientes y fuera del orden P0–P6.

RESULTADO DE LA REVISIÓN P0
1. Se trazó login idempotente, validación de sesión, touch, revocación, expiración, logout y persistencia local.
2. Se verificaron contratos de autorización en AUTH, FEEDBACK, WRITE, USERS y ADMIN; CATALOG conserva endpoints de lectura pública.
3. Se confirmó que routeAction añade una llamada independiente touchSession antes de operaciones protegidas. No debe retirarse hasta que cada servicio actualice LastActivityAt dentro de la misma operación protegida y con coordinación segura entre proyectos.
4. Se confirmó que imprimir aparece para todos y que la edición está restringida de forma inconsistente: UI solo Desarrollador; ADMIN Desarrollador/Gefe. La matriz requerida es Supervisor, Jefe/Gefe y Desarrollador para imprimir/editar, manteniendo compartir público.
5. Jefe/Gefe se deben tratar como equivalentes funcionales según la decisión del usuario, preservando valores históricos. El código actual no los normaliza uniformemente.
6. IDs revisados: USR-####; vehículos numéricos con contador central; tutoriales tut- + operationId; PyS isue-### con PysOperations; Relay solo se encontró como catálogo de configuración, sin escritor versionado.
7. AUTH migra contraseña heredada a sha256$<salt>$<digest> después de login correcto; USERS genera el mismo formato. No existe batch de migración ni factor de trabajo configurable.
8. Las acciones ADMIN generales, incluida la generación del enlace de descarga de imágenes reemplazadas, requieren Desarrollador. La excepción de descarga se limita a Developer; no se habilita descarga general.

SIGUIENTE EJECUCIÓN — P1
- Diseñar y probar actualización de LastActivityAt en la misma operación backend protegida, evitando carrera con logout/revocación/eliminación de filas mediante la coordinación compartida.
- Retirar el preflight touchSession del cliente únicamente cuando todos los servicios protegidos estén cubiertos.
- Mantener validación de restauración, expiración absoluta/inactividad, invalidación por cambio de rol y conservación de sesión local ante indisponibilidad temporal de AUTH.
- Añadir regresiones de AUTH/FEEDBACK/WRITE/USERS/ADMIN, multi-pestaña, red lenta, token revocado y fallo de persistencia antes de publicar.

VALIDACIÓN Y LÍMITES
- Cambios de esta iteración: únicamente Tareas_Activas.md, ChangesLogs.txt y checkpoint.md; no se alteró código funcional.
- No se ejecutaron pruebas Node/CLI para cambios documentales. El workflow service-tests.yml está configurado para push a GPSpedia2.2.5_work, pero la consulta de runs disponible solo devuelve ejecuciones asociadas a pull requests; no se afirma un run de Actions para estos commits.
- La inspección de fórmulas y valores reales de Spreadsheet/Drive requiere dry-run de solo lectura en Beta; no se efectuaron operaciones productivas.
- Últimos commits de documentación: cierre P0 en Tareas_Activas.md y registro en ChangesLogs.txt. Este checkpoint deja constancia del estado previo a su propio commit.
================================================================================


================================================================================
CONTINUIDAD — 2026-11-14 — NORMALIZACIÓN DEL ROL JEFE
Rama de trabajo: GPSpedia2.2.5_work

DECISIÓN CANÓNICA
- El único nombre válido y visible del rol es **Jefe** (código normalizado: jefe). No se deben volver a ofrecer, crear ni asignar valores Gefe/gefe.
- Para evitar bloquear usuarios mientras se actualiza la fuente de datos, los servicios y el frontend convierten temporalmente cualquier registro heredado Gefe/gefe a Jefe/jefe al leerlo. Esta conversión no constituye un segundo rol permitido.

CAMBIOS EN CÓDIGO
- AUTH: un único límite de sesión para jefe; reglas de actualización y validación de marcadores usan el rol canónico.
- USERS: creación y selección de roles ofrece únicamente Jefe; las comprobaciones de usuarios existentes normalizan el valor heredado.
- ADMIN: autorización de edición y rol devuelto por contexto usan jefe/Jefe.
- FEEDBACK y WRITE: matrices de roles permitidos usan únicamente jefe.
- Frontend JS/Frontend/ui.js: las condiciones de visibilidad/autorización de interfaz usan únicamente jefe; el normalizador transforma registros heredados antes de evaluar permisos.
- Se actualizaron Tareas_Activas.md y ChangesLogs.txt.

PENDIENTE DE SPREADSHEET (REQUIERE ACTUALIZACIÓN EXTERNA)
1. En la hoja Users, columna Privilegios, reemplazar el valor de cada fila Gefe por Jefe.
2. Editar la validación de datos/lista desplegable de esa columna: eliminar Gefe e incluir Jefe como única opción para ese nivel.
3. Revisar otras listas desplegables o rangos auxiliares que ofrezcan Gefe y sustituirlo por Jefe.
4. Tras verificar que no quedan filas ni listas con el valor antiguo, se podrá retirar la conversión temporal de compatibilidad del código.

No se consultó ni modificó la Spreadsheet, ni se desplegaron Apps Script. No se ejecutaron pruebas Node/CLI o integración; la revisión de esta tarea fue estática. La siguiente validación debe comprobar sintaxis, suites de servicios y datos reales de Beta antes de publicar.
================================================================================


================================================================================
CONTINUIDAD — 2026-11-14 — JEFE CANÓNICO VALIDADO
HEAD verificado antes de este registro: 449e15187090bf34dd7b75d355ab6a774e2e072d

ESTADO DEL CAMBIO
- Jefe es el único rol canónico. Se unificaron AUTH, USERS, ADMIN, FEEDBACK, WRITE, InboxConversations, JS/Frontend/ui.js, JS/Frontend/auth.js y HTML/users.html.
- Las opciones de creación/edición de usuarios solo ofrecen Jefe. La etiqueta del perfil y los datos recibidos por el frontend convierten valores heredados Gefe a Jefe.
- Las matrices backend/UI usan jefe; la lista de roles de Inbox y el actor de auditoría ADMIN también quedaron normalizados.
- La compatibilidad con registros heredados Gefe se conserva solo como conversión de lectura. No se crean ni asignan valores nuevos Gefe.
- Fixtures de prueba AUTH/USERS sincronizados con los servicios y con el ID de Spreadsheet aislada. Pruebas de contrato de roles ampliadas para frontend, Inbox, ADMIN y perfil.

VALIDACIÓN
- GitHub Actions service-tests.yml: run 43594248150, commit bc028a83577f0ba966f0f81f496eb25567bcd6b7, SUCCESS.
- Sintaxis JavaScript: PASS.
- Regresión de servicios: 75 suites, 1,152 pruebas aprobadas, 0 fallos de suite.
- Las ejecuciones anteriores con fallos fueron corregidas; la última ejecución completa indicada arriba es exitosa.

PENDIENTE EXTERNO — SPREADSHEET
- Actualizar Users.Privilegios (columna D): cambiar los valores existentes Gefe a Jefe.
- Sustituir Gefe por Jefe en la validación de datos/lista desplegable de esa columna y revisar rangos auxiliares equivalentes.
- No se pudo hacer desde esta sesión: Google Drive/Sheets está deshabilitado para la conexión disponible. No se modificó la hoja ni se desplegaron servicios.
- Tras confirmar que no quedan valores antiguos en la Spreadsheet, retirar los conversores temporales de compatibilidad del código.

SIGUIENTE TRABAJO
- La tarea de normalización de rol en código está completada. P4 permanece abierto por la matriz de capacidades de imprimir/editar/compartir y restricciones de imágenes.
- Continuidad general: P1 autenticación simplificada, luego P2 migración de contraseñas/identificadores según dependencias del backlog.
- La rama base GPSpedia2.2.5 no se modificó.
================================================================================


## Adenda — Spreadsheet Jefe confirmada y compatibilidad retirada (2026-11-14)

- El usuario confirmó que actualizó `Users.Privilegios` en la Spreadsheet y sustituyó `Gefe` por `Jefe` en la lista desplegable.
- Se retiraron los conversores de compatibilidad `Gefe` → `Jefe` de backend y frontend. El único rol válido en código para ese nivel es ahora `jefe`/`Jefe`.
- Las pruebas de contrato se actualizaron para rechazar `Gefe` y aceptar `Jefe`.
- No se accedió ni modificó la Spreadsheet desde esta sesión; la actualización se registra como confirmación del usuario. No se desplegaron servicios Apps Script.
- P4 sigue pendiente por completar y aplicar la matriz de capacidades del modal/imágenes. La siguiente tarea de ejecución general es P1 — autenticación simplificada.


## P1 — Fase 1: revalidación redundante al recuperar conexión (2026-11-14)

**Estado: IMPLEMENTADA EN RAMA; VALIDACIÓN AUTOMATIZADA PENDIENTE.**

- Se eliminó de `JS/Frontend/main.js` el listener `online` que llamaba `auth.validateActiveSession(false)` al recuperar conectividad.
- Se conserva `auth.checkSession()` al inicializar la aplicación: es la comprobación de restauración necesaria para detectar revocación/expiración confirmadas.
- Se conserva `touchSession` previo a operaciones protegidas. Retirarlo antes de integrar una actualización de actividad segura dentro de cada operación backend rompería el mantenimiento de la expiración por inactividad o debilitaría la sesión.
- Se actualizó `JS/Tests/SessionStartupNavigation.mjs` para exigir ausencia del listener/revalidación adicional y presencia de la validación inicial.
- Próxima fase: integrar actualización de actividad dentro de las peticiones protegidas mediante coordinación compartida entre servicios; mapear también acciones de solo lectura antes de eliminar el preflight `touchSession`.
- No se modificó la rama base ni se desplegaron Apps Script.


### Corrección detectada por regresión — rol Gefe

La primera ejecución de `service-tests` sobre P1 detectó un fixture de prueba obsoleto en `JS/Tests/AddSupplementaryInfoIntegrity.js`: la lista permitida aún incluía `gefe`. Se retiró ese alias y se añadió una prueba negativa para confirmar que `Gefe` es rechazado. La suite completa debe repetirse; no se atribuye este fallo al cambio de revalidación.
