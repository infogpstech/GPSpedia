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


### Validación final — P1, fase 1 (2026-11-14)

- Commit validado: `988e35ffdd30d139d6ea5593a6d7f2343af69a00`.
- GitHub Actions `service-tests`: PASS; 75 suites, 1,154 pruebas aprobadas y 0 fallos.
- Sintaxis JavaScript del workflow: PASS.
- `SessionStartupNavigation`: 12/12 PASS.
- P1 sigue EN PROGRESO. La fase siguiente debe trasladar la actualización de actividad a las operaciones backend protegidas, cubriendo también lecturas, con coordinación compatible con logout, revocación de rol y borrado de usuario. No retirar `touchSession` hasta cerrar esa integración y sus pruebas de concurrencia.

## P1 — Fase 2 parcial: actividad integrada en FEEDBACK (2026-11-14)

**Estado: IMPLEMENTADA Y VALIDADA LOCALMENTE; P1 GLOBAL EN PROGRESO.**

- `Services/Coordinator.js`: la política FEEDBACK reserva `ACTIVE_SESSIONS` para las operaciones autenticadas que actualizan actividad; se añadió `sessionActivity` para las lecturas protegidas.
- `Services/feedback.js`: `assertFeedbackSession` actualiza `LastActivityAt` solo después de validar token único, correspondencia de usuario, expiración, cuenta activa, revocación pendiente y rol permitido. Las lecturas autenticadas adquieren lease; las acciones públicas quedan fuera.
- La lease serializa la escritura de actividad con logout, revocación y otras operaciones que leen/modifican identidad. Las pruebas de concurrencia se actualizaron para reflejar este conflicto de recursos.
- Fixtures de FEEDBACK actualizados para modelar `getRange().setValue()`; se añadieron pruebas de renovación válida y rechazo sin renovación.
- Validación GitHub Actions `service-tests` sobre `04b32ab9f5db6414855b43e0940107faa51de557`: **PASS**, 75 suites, 1,159 pruebas aprobadas, 0 fallos.
- Sintaxis Node.js configurada por el workflow: PASS.
- No se desplegó Apps Script ni se modificaron Spreadsheet/Drive productivos.
- Pendiente: aplicar el mismo patrón, con coordinación compatible con leases anidadas y operaciones de ADMIN, a WRITE, USERS y ADMIN; después eliminar el preflight `ensureSessionTouched_` del frontend y ejecutar regresión completa.

## P1 — Fase 2 completada: actividad integrada y preflight retirado (2026-11-14)

**Estado: IMPLEMENTADA EN RAMA DE TRABAJO; VALIDACIÓN BETA EXTERNA PENDIENTE.**

- FEEDBACK: validación central de sesión actualiza `LastActivityAt`; las lecturas protegidas usan lease `sessionActivity`; acciones públicas no renuevan sesión.
- WRITE: `getAuthenticatedCollaborator` actualiza actividad; `checkOperation` usa lease de actividad. Las mutaciones reservan `ACTIVE_SESSIONS`; ADMIN→WRITE conserva autorización anidada y reserva el mismo recurso.
- USERS: `getVerifiedSession` actualiza actividad; `getUsers` usa lease; las mutaciones protegen `ACTIVE_SESSIONS` y Users.
- ADMIN: `getAdminSessionContext_` actualiza actividad para operaciones protegidas; las lecturas usan lease; el coordinador añade exclusión sobre `ACTIVE_SESSIONS` para todas las acciones ADMIN.
- UTILITIES: la migración protegida actualiza actividad y reserva `ACTIVE_SESSIONS`.
- AUTH: las mutaciones autenticadas actualizan actividad dentro de `doPostInternal_`; login y touchSession conservan su flujo propio; validateSession permanece de solo lectura. Las leases AUTH reservan `ACTIVE_SESSIONS`.
- Frontend: se retiró `ensureSessionTouched_` y el viaje separado `touchSession` previo a cada operación. `touchSession` permanece disponible como acción explícita/compatibilidad; no es un preflight de `routeAction`.
- Se añadieron/ajustaron pruebas de actividad válida, rechazo sin renovación, leases y conflictos con logout/revocación, fixtures de Sheets y contrato de una sola petición.
- GitHub Actions `service-tests` sobre `55ad0ffeac8f39f397a34cdac3ed70e64953cb7f`: **PASS**, 75 suites, 1,170 pruebas aprobadas, 0 fallos. Sintaxis Node.js: PASS.
- No se desplegaron Apps Script ni se escribieron datos en Spreadsheet/Drive productivos. La rama base `GPSpedia2.2.5` permanece intacta.
- Validación externa pendiente: múltiples pestañas, offline/reconexión y uso real en navegador/dispositivo. La implementación no se declara validada en Beta.

**Siguiente tarea de desarrollo:** P2 — migración de contraseñas e identificadores, comenzando por inventario técnico y diseño seguro de la migración reanudable.

## P2 — Subfase de contraseñas: PBKDF2 y migración batch (2026-11-14)

**Estado: IMPLEMENTADA EN RAMA DE TRABAJO; CALIBRACIÓN APPS SCRIPT Y EJECUCIÓN BETA PENDIENTES.**

- AUTH adopta formato versionado `pbkdf2-sha256$iteraciones$salt$digest`, con salt aleatorio de 128 bits, PBKDF2-HMAC-SHA256, comparación en tiempo constante y límites de coste al verificar hashes almacenados.
- Coste inicial provisional: 12,000 iteraciones. Se añadió `benchmarkPasswordKdf_()` para medir 1,000, 2,500, 5,000, 10,000 y 12,000 iteraciones directamente en el runtime de Apps Script. La medición real no se ejecutó desde esta sesión; no se declara calibrado el coste definitivo.
- `verifyStoredPassword` mantiene compatibilidad con hashes `sha256$` y contraseñas plaintext históricas. El login rehashea credenciales legacy exitosas al formato PBKDF2. Los SHA-256 históricos no se convierten por lote sin conocer la contraseña; se migran al iniciar sesión.
- Se añadió acción AUTH `migrateLegacyPasswords`, protegida por rol Desarrollador y lease de Users/ActiveSessions. El modo predeterminado es dry-run; la escritura exige `dryRun:false` y `confirm:true`; procesa lotes de hasta 50, omite hashes ya migrados y permite reanudar repitiendo la acción.
- La migración solo procesa cuentas activas con contraseña plaintext legacy; reporta conteos de hashes actuales, SHA-256 pendientes de login, filas inactivas/vacías y formatos no compatibles. No devuelve ni registra contraseñas.
- Se añadió ruta de acción en `JS/Frontend/api-config.js`, pruebas de vectores PBKDF2, compatibilidad legacy, integridad del formato, dry-run, confirmación, reanudación e idempotencia.
- GitHub Actions `service-tests` sobre `537839f6c74198d241a2b074cf38f1a4426dc1ae`: **PASS**, 76 suites, 1,185 pruebas aprobadas, 0 fallos.
- No se ejecutó `migrateLegacyPasswords` contra la Spreadsheet productiva ni se desplegó AUTH. El benchmark debe ejecutarse en un deployment de prueba antes de fijar el coste final.
- Siguiente subfase P2: inventario de generadores, fórmulas y referencias de IDs de Users, Vehicles/Cortes, Tutoriales, Problemas y Relay; después diseñar la reconciliación sin romper relaciones.

## P2 — Auditoría de identificadores y asignación backend (2026-11-14)

**Estado: CÓDIGO DE AUDITORÍA IMPLEMENTADO; MIGRACIÓN REAL DE DATOS PENDIENTE DE EJECUCIÓN BETA.**

### Inventario confirmado en el código
- Users: `generateNextUserId_` asigna `USR-0001` secuencial tras escanear la hoja; detecta duplicados y filas con datos sin ID. Los IDs históricos con otro formato se deben identificar con auditoría antes de normalizar.
- Cortes/Vehicles: WRITE es la autoridad de IDs numéricos; combina el máximo de la hoja con `CORTES_ID_COUNTER`, bajo ScriptLock, y rechaza IDs malformados/duplicados.
- Tutorial: FEEDBACK asigna `tut-<operationId>`, estable e idempotente; conserva compatibilidad con registros históricos sin ID mediante resolución por tema único.
- Problemas PyS: FEEDBACK asigna `isue-###` a partir de la hoja y `PysOperations`; rechaza IDs vacíos, malformados y duplicados.
- Relay: CATALOG solo lee la hoja; no existe en el repositorio un endpoint de alta/asignación y el formato del ID no está definido en código.
- LogosMarca: se eliminó el uso de `=ROW()-1` para nuevos registros. ADMIN asigna un entero positivo desde el backend con contador `LOGOS_MARCA_ID_COUNTER`, ScriptLock, detección de duplicados/malformados y verificación de que la celda final no conserve fórmula.
- ADMIN conserva `createSheet.idFormula` para hojas genéricas; no se usa como asignador de IDs de las entidades canónicas.

### Herramienta de auditoría
- Se añadió acción ADMIN `auditIdentifiers`, de solo lectura y restringida a Desarrollador.
- Inspecciona Users, Cortes, Tutorial, Relay, pys y LogosMarca; devuelve conteos y filas de IDs ausentes, malformados, duplicados, fórmulas y fórmulas sin valor. Para Relay devuelve hasta 20 muestras para confirmar el formato real.
- No modifica hojas, fórmulas, valores ni contadores. Se añadió prueba explícita de ausencia de escrituras.
- GitHub Actions `service-tests` sobre `955e09b428204c9e24ccd12f92a1e208135f4189`: **PASS**, 78 suites, 1,198 pruebas aprobadas, 0 fallos.
- No se pudo ejecutar `auditIdentifiers` contra la Spreadsheet real desde esta sesión: el acceso al contenido de Google Sheets/Drive no está disponible en las herramientas conectadas. No se inventaron datos ni se ejecutó migración.
- Próximo paso P2 de datos: ejecutar el reporte en Beta, revisar el formato de Relay y las referencias cruzadas; después construir/aplicar una migración con dry-run, respaldo, mapa de IDs, checkpoints y reversión. No escribir IDs reales hasta revisar ese reporte.

## P2 — IDs LogosMarca: asignación backend (2026-11-14)

**Estado: IMPLEMENTADA EN RAMA DE TRABAJO; AUDITORÍA Y VALIDACIÓN DE DATOS REALES EN BETA PENDIENTES.**

- Se sustituyó la fórmula de fila de `LogosMarca` por un ID numérico permanente asignado por `getNextLogoIdLocked_()`.
- El asignador usa `LockService.getScriptLock()`, un contador persistente en Script Properties y el máximo ID histórico leído de la hoja; evita reutilizar IDs si el contador quedó atrasado.
- Antes de asignar, valida el encabezado `ID`, IDs numéricos positivos, duplicados (incluidos equivalentes como `1` y `001`) y filas con datos sin ID. Si encuentra ambigüedad, se detiene sin crear un nuevo ID.
- La fila nueva recibe el ID con `setValue`, no fórmula; se comprueba el valor persistido y la ausencia de fórmula.
- Se añadieron pruebas aisladas para continuidad del contador, contador adelantado, duplicados, IDs malformados, filas sin ID y plantillas con fórmulas históricas.
- GitHub Actions `service-tests` sobre HEAD `2b096463488a8fa24d70b3d5ad49060eede0d3e3`: **PASS**, 78 suites, 1,198 pruebas aprobadas, 0 fallos.
- No se desplegó ADMIN ni se modificó la Spreadsheet productiva. La validación de encabezado, fórmulas y datos debe completarse en Beta.
- Relay permanece en auditoría solamente: no se encontró un endpoint versionado que cree filas Relay ni se pudo establecer su formato de ID con seguridad. No se inventó un generador ni se migraron datos.
- Siguiente paquete de trabajo en código: P3 — rediseño Inbox, preservando contratos de mensajería, paginación, caché, permisos y navegación. La migración de datos P2 continúa condicionada a la auditoría real de Beta y a su plan de reversión.

## P3 — Inbox: filtro de categorías y consolidación funcional (2026-11-14)

**Estado: IMPLEMENTACIÓN CONSOLIDADA EN RAMA DE TRABAJO; PRUEBAS MANUALES REALES PENDIENTES.**

- La revisión del frontend encontró que el selector de categorías estaba presente en `index.html` y el backend ya aceptaba/validaba `category`, pero el evento del selector no estaba conectado y el cliente no enviaba el filtro.
- Se añadió estado de categoría en `ui.js`, listener `change` con lista permitida, reinicio de paginación/selección y envío de `category` en cada consulta. El wrapper `getInboxConversations` ya transmitía el campo al backend.
- Se añadieron pruebas UI para comprobar el enlace del selector con la consulta y pruebas de servicio para filtrar resultados antes de paginar y rechazar categorías inválidas.
- Revisión estática confirma bandejas Recibidos/No leídos/Enviados/Archivados, búsqueda en contenido de mensajes, paginación, panel de conversación, lectura/archivo por participante, sincronización periódica, solicitudes históricas separadas, navegación lista-detalle móvil y estilos accesibles.
- GitHub Actions `service-tests` sobre HEAD `136fb78068d2f64a982189f6f0e614aef93b0643`: **PASS**, 78 suites, 1,200 pruebas aprobadas, 0 fallos. `InboxConversations: 29/29 PASS`; `InboxUi: 16/16 PASS`.
- No se declara completada la validación visual/manual: faltan pruebas reales de tema claro/oscuro, lector de pantalla, teclado, navegación Atrás y tamaños/dispositivos. Las conversaciones nuevas son solo texto; no se habilitaron adjuntos no soportados por el backend.
- Siguiente paquete: P4 — matriz de capacidades por rol y coherencia frontend/backend para compartir, imprimir, editar y descargar imágenes.

## P4 — RBAC de ficha técnica: compartir, imprimir y editar (2026-11-14)

**Estado: PRIMERA FASE IMPLEMENTADA Y VALIDADA; MATRIZ GLOBAL Y POLÍTICA DE IMÁGENES PENDIENTES.**

- El botón Compartir permanece disponible en el modal para todos los roles con acceso a la aplicación.
- Imprimir y editar detalles ahora se muestran únicamente a `Supervisor`, `Jefe` y `Desarrollador`; Técnico y Técnico_exterior no reciben esos controles.
- La función de respaldo de edición local acepta esos tres roles; el frontend normaliza el rol antes de decidir la visibilidad.
- ADMIN valida la sesión/rol desde Users y ActiveSessions. `assertModalEditSession` permite solo Desarrollador/Jefe/Supervisor; el contexto devuelto conserva el nombre canónico del rol. Las acciones administrativas ajenas al modal siguen usando `assertDeveloperSession` exclusivamente.
- Se actualizaron las pruebas del contrato de dispatch y se añadió `VehicleModalRolePolicy.mjs`, que valida visibilidad y ejecuta la autorización backend con sesiones simuladas para los roles permitidos/no permitidos.
- GitHub Actions `service-tests` sobre HEAD `9524f2f1789df4551c4d6a9c37f7a13822d43e66`: **PASS**, 79 suites, 1,205 pruebas aprobadas, 0 fallos; `VehicleModalRolePolicy: 5/5 PASS`.
- No se desplegó ADMIN ni se modificaron datos productivos. La comprobación corresponde a código/CI; la validación visual por rol en Beta sigue pendiente.
- Siguiente subfase P4: revisar y restringir descarga de imágenes, exposición de URL y acciones de contexto/copia/arrastre sin afectar controles editables ni accesibilidad.

## P4 — Protección de imágenes y controles de descarga (2026-11-14)

**Estado: FRICCIÓN CLIENTE Y CONTROL DE DESCARGA ADMINISTRATIVA IMPLEMENTADOS; URL PÚBLICAS Y AUDITORÍA GLOBAL PENDIENTES.**

- `clientInteractionPolicy.js` ahora bloquea menú contextual, copy/cut, selección y dragstart solo cuando el objetivo es un medio (`img`, `picture`, `video`, `canvas` o `data-protect-media`). El texto normal conserva selección/copia y los campos editables conservan sus controles.
- La política se instala en la aplicación principal y en las páginas HTML auxiliares ya inventariadas.
- El botón de descarga de imágenes reemplazadas solo se renderiza para Desarrollador; `getReplacedImageDownloadUrl` sigue fuera de `ADMIN_MODAL_EDIT_ACTIONS` y requiere `assertDeveloperSession` en backend.
- Se añadieron pruebas aisladas `ClientInteractionPolicy.mjs` para verificar bloqueo selectivo, texto normal, campos editables e instalación idempotente.
- GitHub Actions `service-tests` sobre HEAD `e96cc8bb3bbaac6e7f9644c160b898fb81a8cc4c`: **PASS**, 80 suites, 1,210 pruebas aprobadas, 0 fallos. `ClientInteractionPolicy: 5/5 PASS`; `VehicleModalRolePolicy: 5/5 PASS`.
- Límite de seguridad: los guardas son fricción contra acciones casuales, no protección criptográfica. Si una imagen usa una URL pública, puede extraerse desde red, DOM, caché o herramientas del navegador; no se afirma que la web pueda impedirlo.
- No se desplegaron cambios ni se alteraron permisos de Drive. La verificación de acceso real a recursos estáticos requiere revisión del hosting/Drive y entorno Beta.

## P5 — Capturas de pantalla: evaluación de capacidades web/PWA (2026-11-14)

**Estado: EVALUACIÓN TÉCNICA COMPLETADA; NO SE AÑADIÓ UNA FALSA PROMESA DE BLOQUEO.**

- Los navegadores no exponen una API web interoperable y fiable para detectar capturas nativas del sistema operativo.
- `visibilitychange`, `blur` y `pagehide` indican cambios de visibilidad, foco o ciclo de vida; no son eventos de captura y no justifican ocultar o invalidar contenido como si una captura hubiera ocurrido.
- `getDisplayMedia()` es una API para iniciar, con selección/permiso del usuario, la compartición de pantalla/ventana/pestaña; no detecta ni bloquea capturas de pantalla del sistema.
- Una PWA en navegador no puede aplicar Android `FLAG_SECURE`, que pertenece al entorno nativo Android.
- Se evaluó una marca de agua contextual. No se implementa por defecto: puede tapar información crítica en diagramas de cableado/fotografías y no impide la captura; solo podría aportar trazabilidad si se define una política explícita de uso.
- Se actualizó README con estos límites y la recomendación de no servir como públicas las imágenes que realmente requieran confidencialidad; deben usarse permisos privados y entrega autenticada/temporal desde backend.
- No se cambió código de captura, no se bloquearon atajos/zoom ni se añadió una falsa detección de screenshots.
- La evaluación no sustituye una revisión de permisos de hosting/Drive y no certifica que los recursos actuales sean privados.
- Siguiente: P6 — integración/regresión global y pruebas negativas por rol; quedan pendientes validaciones Beta reales de P1/P2/P3/P4 y auditoría de URLs.

## P6 — Integración y regresión automatizada (2026-11-14)

**Estado: SUITE AUTOMATIZADA APROBADA; VALIDACIÓN EXTERNA PENDIENTE.**

- GitHub Actions `service-tests` sobre HEAD `6d67fc4b8fd0e60eb626a223bf2274e34e49f1b7`: **PASS**, 80 suites, 1,211 pruebas aprobadas, 0 fallos.
- `VehicleModalRolePolicy: 6/6 PASS`: visibilidad compartir/imprimir/editar, autorización backend por rol y descarga de imágenes restringida a Desarrollador.
- `ClientInteractionPolicy: 5/5 PASS`: controles de medios, texto seleccionable/copiar y campos editables.
- `InboxConversations: 29/29 PASS`; `InboxUi: 16/16 PASS`; `IdentifierAudit: 7/7 PASS`; `LogoIdIntegrity: 6/6 PASS`.
- Las pruebas de P1/P2 y RBAC validan lógica, contratos, dry-run, lotes, idempotencia, sesiones simuladas y referencias sintéticas. No ejecutan una migración contra Spreadsheet/Drive real.
- Pendiente de entorno externo: dry-run de contraseñas e IDs en Beta, llamadas HTTP negativas por rol contra deployments, navegación/Inbox en navegador y dispositivos reales, mediciones de KDF, pruebas de rendimiento y conectividad en campo, verificación de permisos reales de URLs/Drive.
- No se desplegaron servicios ni se modificaron datos productivos. La rama base protegida no se modificó.

## Sincronización documental de continuidad (2026-11-14)

- Se corrigieron referencias históricas que seguían describiendo `Gefe` como conversor temporal pendiente. El usuario ya confirmó la actualización de `Users.Privilegios` y su lista desplegable; el código operativo ya no admite `Gefe`.
- Se actualizó la sección `Continuidad inmediata` de `Tareas_Activas.md` para reflejar P1–P6 y las validaciones Beta/externas pendientes, evitando que la próxima sesión retome P3 como si siguiera sin implementar.
- No hubo cambios de código ni datos productivos en esta sincronización.

## P2 — Generador de IDs de usuarios: duplicados sin distinción de mayúsculas (2026-11-14)

- `generateNextUserId_` ahora normaliza a mayúsculas la clave usada para detectar duplicados; evita que `USR-0001` y `usr-0001` se consideren identificadores diferentes.
- Se conservan el formato secuencial `USR-####`, el cálculo por máximo existente y el rechazo de filas con datos de cuenta sin ID. El generador se ejecuta dentro de `withUsersMutationLock_` en la creación de usuarios.
- Se sincronizó `JS/Tests/users.js` con `Services/users.js` para mantener el fixture espejo.
- Se añadió `UserIdGenerator.mjs`: secuencia, duplicados case-insensitive, filas sin ID y filas plantilla vacías.
- GitHub Actions `service-tests` sobre HEAD `217ad05818255cf4692bfd28e335a5b44130da3e`: **PASS**, 81 suites, 1,215 pruebas aprobadas, 0 fallos; `UserIdGenerator: 4/4 PASS`.
- No se generaron IDs ni se modificó la Spreadsheet. La migración de registros existentes sigue condicionada a auditoría/dry-run Beta.

## P2 — IDs de tutorial: canonicalización e idempotencia case-insensitive (2026-11-14)

- `handleAddTutorial` normaliza el `operationId` a minúsculas antes de construir `tut-<operationId>`; los IDs nuevos tienen una representación canónica.
- La detección de una fila existente y `findTutorialRow_` comparan el ID sin distinguir mayúsculas. Un reintento que use otra capitalización devuelve la fila original, conserva el ID histórico y no crea un duplicado.
- Se añadieron pruebas para operationId uppercase y para reutilizar un ID histórico uppercase sin duplicar el tutorial.
- Se incorporó `TutorialIntegrity.js` al runner CI; se corrigió la comparación entre objetos/arrays de realms distintos y ahora reporta fallos individuales.
- Se sincronizó el fixture AUTH después de incorporar el endpoint de benchmark PBKDF2 y se ajustó su prueba para verificar duplicados activos sin invalidar al solicitante.
- GitHub Actions `service-tests` sobre HEAD `2f85ef76d148487413904a71959acf36ddc74c22`: **PASS**, 83 suites, 1,250 pruebas aprobadas, 0 fallos. `TutorialIntegrity: 27/27 PASS`; `PasswordKdfBenchmark: 6/6 PASS`.
- No se ejecutaron altas ni migraciones sobre Tutorial/Spreadsheet productiva.

## P2 — Endpoint seguro de calibración PBKDF2 (2026-11-14)

**Estado: COMPLETADO CON VALIDACIÓN DIFERIDA A BETA.**

- Se añadió `benchmarkPasswordKdf` al router AUTH y al mapa `ACTION_TO_SERVICE_MAP`.
- El endpoint exige `userId` y `sessionToken`, valida la sesión mediante `validateSessionReadOnly_` y permite únicamente el rol Desarrollador. La comprobación de sesión no actualiza actividad.
- El benchmark usa una cadena fija de prueba y un salt fijo, mide 1,000 / 2,500 / 5,000 / 10,000 / 12,000 iteraciones y no lee ni escribe contraseñas, Users ni ActiveSessions. La respuesta identifica expresamente la operación como `readOnly` y `benchmarkOnly`.
- Se añadió `PasswordKdfBenchmark.mjs` y se integró en CI: 6/6 PASS para autorización, rechazo de sesiones/roles inválidos, contrato de ruta y aislamiento de datos.
- Se corrigieron dos aserciones de `TutorialIntegrity.js` que comparaban objetos/arrays entre contextos VM por identidad en lugar de comparar su estructura serializada; TutorialIntegrity quedó en 27/27 PASS.
- GitHub Actions `service-tests` sobre HEAD `163a589865e5cfda85e1a09bad2674e500aa5d19`: **PASS**, 83 suites, 1,250 pruebas aprobadas, 0 fallos.
- Se documentó en `Tareas_Activas.md` el procedimiento Beta, precedido por los comandos obligatorios de comprobación de árbol limpio, fetch y fast-forward.
- Pendiente de Beta: invocar el endpoint desde el deployment actualizado al menos tres veces, registrar las medianas por coste y revisar el margen de ejecución antes de fijar `PASSWORD_KDF_ITERATIONS`. El valor 12,000 sigue provisional. No se modificó el deployment ni se migraron contraseñas.
- Siguiente subfase P2: definir el plan de migración de IDs por entidad, con snapshot/manifiesto verificable, checkpoint reanudable y reversión probada antes de cualquier escritura; mantener Relay en diagnóstico hasta conocer su formato y referencias reales.

## P4 — Revisión estática de exposición de imágenes y URLs (2026-11-14)

- Se revisaron referencias de imágenes en `Services/write.js`, `Services/feedback.js`, `Services/admin.js`, `JS/Frontend/ui.js` y `JS/Frontend/offline.js`.
- Las referencias Drive de Cortes, Tutorial, PyS y LogosMarca se guardan en hojas y llegan al cliente como URLs/IDs. `ui.js` transforma IDs Drive a `lh3.googleusercontent.com`; `offline.js` puede descargar imágenes a IndexedDB. Cualquier recurso entregado al navegador debe tratarse como recuperable por el usuario que lo visualiza.
- El endpoint de descarga explícita de imágenes reemplazadas requiere Desarrollador; eso no vuelve privadas las URLs que ya se entregan para renderizado.
- FEEDBACK verifica que las imágenes de sugerencias no hereden acceso público y que las imágenes PyS conserven los permisos de su carpeta. No se encontró una comprobación general equivalente en todos los flujos de carga de WRITE/ADMIN.
- No se verificaron ACL reales de Drive ni se alteraron permisos. Sin deployment/copia Beta no es posible determinar si las carpetas son públicas, de dominio o privadas.
- Resultado: revisión estática completada; siguiente acción externa es auditar permisos reales por carpeta/archivo y clasificar imágenes que deben seguir siendo públicas para GPSpedia.

## P2 — Plan de migración de IDs y reversión (2026-11-14)

- Se creó `PLAN_MIGRACION_IDS.md` con política de conservar IDs válidos, inventario por entidad (Users, Cortes, Tutorial, PyS, Relay y LogosMarca), snapshot, manifiesto inmutable, dry-run, lotes reanudables, verificación posterior y reversión por huellas.
- Se especificaron referencias consumidoras que deben inventariarse antes de modificar IDs, condiciones de detención por ambigüedad y la prohibición de asignar IDs por posición de fila o coincidencia parcial.
- Relay queda bloqueado hasta confirmar su esquema y localizar el escritor de filas. No se inventó un formato.
- Se actualizó `Tareas_Activas.md`: el diseño de snapshot/manifiesto/rollback está completado; falta implementar el motor y probarlo en copia Beta.
- No se realizó ninguna migración ni escritura en hojas/Drive. El plan no autoriza ejecución productiva.

## P2 — Auditoría de referencias de IDs de Tutorial (2026-11-14)

**Estado: COMPLETADO CON VALIDACIÓN DIFERIDA A BETA.**

- Se amplió `auditIdentifiers` con `tutorialReferences`, un inventario de solo lectura que contrasta IDs de `Tutorial` con solicitudes `video_approval` de tipo `tutorial` en `Feedbacks`.
- Detecta referencias válidas, IDs huérfanos, destinos ambiguos por IDs duplicados, referencias ausentes, discrepancias entre `Feedbacks.ID_vehiculo` y `referenceId`, discrepancias de `metadata.tutorialId` y JSON de aprobación truncado/malformado.
- El reporte limita los detalles a 100 entradas y no escribe en Spreadsheet.
- Se añadió `TutorialIdReferenceAudit.mjs`: 6/6 PASS. Se actualizó `IdentifierAudit.mjs` para incluir el helper en su harness: 7/7 PASS.
- GitHub Actions `service-tests` sobre HEAD `26f0b2450249f18f5c82f4ea087130ca0ae9b856`: **PASS**, 84 suites, 1,256 pruebas aprobadas, 0 fallos.
- No se ejecutó contra Spreadsheet real; el reporte real queda para Beta después de sincronizar la rama. La auditoría cubre referencias de vídeo de Tutorial, no constituye todavía un inventario completo de referencias de Users/Cortes/PyS/LogosMarca.
- Siguiente subfase P2: ampliar el inventario de referencias consumidoras de las demás entidades antes de proponer cualquier ID sustituto. No iniciar escrituras hasta disponer de reporte Beta, snapshot y manifiesto aprobados.

## P2 — LogosMarca: compensación de fallos y recuperación de altas (2026-11-14)

- Se corrigió `handleAddLogo` para retirar a papelera el archivo subido si no se pudo adquirir el bloqueo o no llegó a vincularse a una fila.
- Si falla una escritura parcial, se limpia la fila recién preparada y se verifica que quede vacía antes de considerar completada la compensación.
- Si la respuesta de `SpreadsheetApp.flush()` falla pero la fila única quedó persistida con ID, marca y URL correctos, el handler recupera la operación y devuelve éxito sin crear un duplicado al reintentar.
- Si no puede comprobar el vínculo o encuentra una asociación ambigua, conserva el archivo y marca su descripción como `RECOVERY_REQUIRED`; no elimina un archivo que podría estar referenciado.
- `LogoIdIntegrity.mjs` cubre bloqueo fallido, escritura URL fallida, fila parcial, flush incierto y recuperación de estado.
- GitHub Actions `service-tests` sobre HEAD `6405f282c29416143e8d9eec41d4ccb75c0a6942`: **PASS**, 84 suites, 1,260 pruebas aprobadas, 0 fallos. `LogoIdIntegrity: 10/10 PASS`.
- No se modificaron hojas/Drive productivos ni se desplegó ADMIN.

## P2 — LogosMarca: compensación de copia parcial de plantilla (2026-11-14)

- Se adelantó el estado `rowPrepared` antes de copiar la plantilla para que un fallo parcial de `copyTo` también active la limpieza de la nueva fila.
- Se añadió un escenario de fallo durante la copia que verifica que la fila parcial quede vacía y el archivo sin vínculo vaya a papelera.
- GitHub Actions `service-tests` sobre HEAD `7330388a6772c7e04ebd10e1d22b72053aab4ef2`: **PASS**, 84 suites, 1,261 pruebas aprobadas, 0 fallos; `LogoIdIntegrity: 11/11 PASS`.

## Sincronización P4/P2 de tareas activas (2026-11-14)

- Se actualizó el estado P4 a EN PROGRESO para reflejar la política de ficha técnica, descarga administrativa y fricción selectiva de medios ya implementadas.
- Se consolidó la revisión estática de URLs como completada; quedan pendientes los ACL reales de Drive y la matriz global de capacidades en Beta.
- Se corrigieron secuencias literales `\\n` en la lista P2 para recuperar saltos de línea reales y legibilidad del backlog.
- No hubo cambios de código ni de datos productivos.

## Estado de continuidad verificado (2026-11-14, cierre de esta iteración)

- Último HEAD de código validado: `48dca361cd547a6301f04c23af80eb772f13b6fe`; después se añadieron únicamente commits de checkpoint/changelog `5dedb8137a4c4083e8acdfbc3c5d2e02c02d5828` y `cd90aca0529f9880d74a343d63d6aa4e5c06c3bb`.
- Rama base protegida `GPSpedia2.2.5`: HEAD `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no se realizaron escrituras en esa rama.
- Comparación GitHub: work está `ahead` 2,556 commits y `behind` 0 respecto de la base. No se intentó merge ni publicación.
- Último workflow `service-tests` sobre código y commits documentales: **PASS**, 85 suites, 1,267 pruebas aprobadas, 0 fallos; CI sobre `cd90aca0529f9880d74a343d63d6aa4e5c06c3bb` completó correctamente. Incluye `LogoIdIntegrity: 11/11`, `TutorialIntegrity: 27/27` y `PasswordKdfBenchmark: 6/6`.
- Implementaciones adicionales de esta iteración: IDs USERS case-insensitive, IDs Tutorial canónicos/idempotentes, compensación de altas LogosMarca, filtro de categorías Inbox conectado, primera fase RBAC de ficha, protección selectiva de medios y documentación de límites de captura.
- Pendientes que requieren entorno externo: deployment AUTH/ADMIN actualizado en Beta, benchmark PBKDF2 en Apps Script, dry-run de migración de contraseñas/IDs sobre copia Beta, ACL reales de Drive, pruebas manuales de Inbox/roles y rendimiento/offline en dispositivos.
- No se desplegó Apps Script, no se modificó Spreadsheet/Drive productivo y no se publicaron cambios en la rama base.


## P2 — Auditoría ampliada de referencias consumidoras (2026-11-14)

**Estado: IMPLEMENTADA EN CÓDIGO; VALIDACIÓN DE DATOS REALES DIFERIDA A BETA.**

- ADMIN `auditIdentifiers` incorpora `vehicleReferences`, `problemReferences` y `logoReferences`, además de las auditorías existentes de Users y Tutorial.
- Cortes: referencias de Feedbacks, FeedbackLikes, ledgers Idempotencia, asociaciones PyS, actividad e historial de imágenes de vehículos.
- PyS: referencias desde PysOperations, aprobaciones de vídeo `video_approval/pys` y actividad `add_problem`.
- LogosMarca: la unión funcional es `Cortes.marca` ↔ `LogosMarca.nombreMarca`; no se encontró un consumidor activo del ID numérico como clave foránea.
- Relay permanece en diagnóstico por ausencia de escritor/formato verificable.
- Las auditorías son de solo lectura, limitan detalles a 100 y detectan referencias huérfanas, ambiguas, malformadas y discrepancias relevantes.
- `IdentifierAudit.mjs` amplía las pruebas aisladas de Cortes, PyS y LogosMarca. No se consultaron ni modificaron hojas reales.
- Siguiente subfase P2: implementar y probar localmente el motor de migración reanudable con snapshot/manifiesto, dry-run, huellas, verificación por lote y rollback condicionado. La ejecución real requiere copia Beta; no se autoriza escritura productiva.



## P4 — Matriz consolidada de capacidades por rol (2026-11-14)

- Se creó `MATRIZ_CAPACIDADES_ROLES.md` con capacidades por rol y contratos de AUTH, USERS, WRITE, FEEDBACK/PyS, ADMIN/imágenes e Inbox.
- Se amplió `VehicleModalRolePolicy.mjs` para verificar los cinco roles activos, jerarquía de cuentas, permisos FEEDBACK/WRITE/Inbox, restricciones de benchmark y lista exacta de excepciones ADMIN.
- Las acciones restantes del gestor de imágenes se comprueban como exclusivas de Desarrollador mediante el gate común del router ADMIN.
- Las pruebas describen contratos locales; las llamadas HTTP negativas y ACL reales permanecen pendientes de Beta.
- P2: GitHub Actions `service-tests` PASS, 85 suites, 1,270 pruebas aprobadas, 0 fallos (run 838, commit `2ce891d8ba1b0827fef00f1f0e8457b68f582973`).


## P2 — Motor local de migración de identificadores (2026-11-14)

- ADMIN incorpora `migrateIdentifiers` y `rollbackIdentifiers`, ambas reservadas a Desarrollador y protegidas por la lease compartida de mutaciones.
- El motor admite solo completar IDs vacíos con clave estable única (`fill_missing`) y congelar el valor de IDs de fórmula válidos/únicos (`freeze_formula`). Admite Users, Cortes, Tutorial, pys y LogosMarca; Relay se rechaza.
- Se prohíbe renumerar IDs válidos, resolver duplicados/malformados por inferencia o aceptar referencias cruzadas parciales. Los remapeos de IDs existentes requieren un inventario completo de referencias por fila.
- Dry-run predeterminado, digest SHA-256, snapshot oculto por hoja, manifiesto persistente, lotes 1–10, read-back, reanudación idempotente y rollback condicionado a huellas.
- Pruebas `IdentifierMigration.mjs`: 9/9 PASS. CI run 847: 86 suites, 1,285 pruebas aprobadas, 0 fallos. Sintaxis Node.js PASS.
- GitHub Pages ejecutó su workflow sobre la rama de trabajo; la publicación de Pages está autorizada por el usuario para pruebas en modo producción.
- No se ejecutó el motor contra Spreadsheet/Drive ni se modificaron datos reales. Antes de Beta: respaldo independiente, reporte de auditoría real, revisión de cada propuesta y prueba de rollback en copia Beta.
- Commit de implementación/validación: `920ab3e1bd78467bda310e876bfdb6fd72103ab8`.


## P1 — Coordinación de actividad y sesiones protegidas (2026-11-14)

- Se verificó y cubrió la actualización de `LastActivityAt` dentro de las operaciones protegidas de WRITE, USERS y ADMIN; FEEDBACK y AUTH conservan su touch integrado previo.
- WRITE: `getAuthenticatedCollaborator` actualiza actividad después de validar identidad, sesión, expiración, cuenta y rol. `checkOperation` usa lease `sessionActivity`; las mutaciones protegidas usan su lease de acción.
- USERS: `getVerifiedSession` actualiza actividad; `getUsers` usa lease `sessionActivity` y `createUser`/`updateProfile` usan leases de mutación.
- ADMIN: cada acción no pública exige sesión Desarrollador (salvo las tres excepciones del modal); las lecturas usan lease `sessionActivity` y las mutaciones su lease específica.
- FEEDBACK y AUTH mantienen la actualización integrada; la interfaz no ejecuta el preflight separado `ensureSessionTouched_`.
- Se comprobó el aislamiento de leases anidadas ADMIN→WRITE para asignación de IDs y congelación de IDs; las acciones no declaradas siguen rechazadas.
- Se añadió política de mantenimiento exclusivo en Coordinator para `migrateIdentifiers` y `rollbackIdentifiers`, evitando escrituras concurrentes durante snapshots/manifiestos/lotes.
- `SessionActivityCoordination.mjs`: 6/6 PASS. GitHub Actions run 850: 87 suites, 1,292 pruebas aprobadas, 0 fallos.
- Validación Beta diferida: actualizar los proyectos Apps Script correspondientes (incluido Coordinator) y probar sesiones reales, pestañas simultáneas, revocación, expiración, offline/reconexión y navegación en dispositivos. No se desplegó Apps Script ni se modificaron datos reales.
- Commit de código: `3531df5e16f0d401c3fba3702422db3e9016a979`.


## P2 — Extensión conservadora para Relay (2026-11-14)

- Se confirmó en `Services/catalog.js` y en el esquema ADMIN que la hoja se llama `Relay` y su ID está en la columna 1 con encabezado `ID`; el repositorio no contiene un escritor de filas Relay ni un formato confirmado para IDs faltantes.
- El motor ahora permite únicamente `freeze_formula` en Relay: conserva el valor y tipo exactos del ID, verifica unicidad y permite rollback de la fórmula original. `fill_missing` continúa rechazado hasta conocer el formato y el proceso de creación.
- Prueba específica añadida: congelar fórmula Relay, verificar valor/tipo y restaurar fórmula. `IdentifierMigration.mjs`: 10/10 PASS.
- CI run 855: 87 suites, 1,296 pruebas aprobadas, 0 fallos. Pages build/deployment PASS.
- No se consultó ni modificó la hoja real Relay; no se inventó un generador.

## Verificación integral local P0–P6 y GP-DEV-UX-01 (2026-11-14)

- Las implementaciones locales P0–P6 quedan completadas con validaciones externas diferidas a Beta donde corresponde; no se desplegó Apps Script ni se escribieron datos reales.
- CI run 855: 87 suites, 1,296 pruebas aprobadas, 0 fallos; `IdentifierMigration` 10/10 y `DevToolsModalAccessibility` 19/19 PASS. Comprobación de sintaxis Node.js PASS.
- GitHub Pages build/deployment PASS en la rama de trabajo, autorizado por el usuario para pruebas en modo producción.
- GP-DEV-UX-01: se retiró la pestaña Respaldos redundante; respaldos y mantenimiento quedan juntos en Base de datos. Botón Migrar esquema y selector de retención quedan a 38 px; textos se simplificaron y confirmaciones destructivas permanecen.
- No se dispuso de navegador real ni acceso a Google Drive/Sheets para pruebas visuales/ACL; estas validaciones se conservan para Beta.
- Siguiente tarea independiente registrada: GP-IMG-UX-01 — rediseño de la biblioteca de imágenes reemplazadas.


## GP-IMG-UX-01 — Biblioteca de imágenes reemplazadas (2026-11-14)

- La biblioteca cuenta con vista de cuadrícula y lista; miniaturas medianas 4:3 en cuadrícula y miniaturas compactas de 60 px (52 px móvil) en lista.
- Selección individual y múltiple, selección de visibles, acciones por lote para mover, restaurar y enviar a papelera; se informan fallos parciales.
- Menú contextual de tres puntos por archivo, con acciones determinadas por estado y permisos; confirmación antes de acciones destructivas y revalidación backend de referencias.
- La descarga es excepción exclusiva de la biblioteca de Desarrollador: el frontend solo la ofrece al rol Desarrollador y el backend mantiene su gate ADMIN normal; no se habilita descarga general.
- La biblioteca presenta controles compactos, estados de carga/error/vacío, selección visible, lightbox y estilos responsive. El test `ReplacedImagesLibraryUX.mjs` cubre política de descarga, selección, menús, operaciones por lote, vistas, accesibilidad y responsive: 12/12 PASS.
- GitHub Actions run 43610793648: 88 suites, 1,308 pruebas aprobadas, 0 fallos. GitHub Pages build/deployment PASS para el mismo HEAD.
- Validación visual en navegador/dispositivo y operaciones con Drive real permanecen para Beta; no se ejecutaron movimientos ni borrados reales durante esta iteración.
- Siguiente tarea: GP-IMG-DATA-01 — conciliación Drive de Cortes ↔ Spreadsheet, empezando por inventario/dry-run de solo lectura.


## GP-IMG-DATA-01 — Planner de conciliación Drive ↔ Cortes (2026-11-14)

- Se implementó `buildCortesImageReconciliationTargets_()`: genera destinos solo para filas con ID de vehículo único y para las ocho columnas de imagen configuradas; filas sin ID/duplicadas se separan como incidencias.
- Se implementó `buildCortesImageReconciliationPlan_()`: coincidencia por nombre canónico exacto (sin similitud aproximada), clasificación de ya vinculados, huérfanos, referencias externas, duplicados, destinos ambiguos/ocupados y archivos inválidos. Nunca sobrescribe celdas no vacías y devuelve URL propuesta sin escribir.
- `CortesImageReconciliation.mjs`: 10/10 PASS. CI run 43611979071: 90 suites, 1,322 pruebas aprobadas, 0 fallos.
- Pendiente: endpoint/flujo reanudable para recorrer el árbol Drive, UI diferenciada, digest/estado persistente y prueba de idempotencia/rollback. No se ejecutó Drive/Spreadsheet real ni se escribieron datos.

## GP-UX-INFO-01 — Ayudas contextuales parciales (2026-11-14)

- `HTML/add_cortes.html`: ayudas accesibles para año/rango, versión de equipamiento, tipo de corte y configuración de relay.
- `JS/Frontend/ui.js`: helper reutilizable aplicado a los campos de sugerencia de cambio y alta de tutorial; cierra ayudas al pulsar fuera o Escape y restaura foco. No se añadió ayuda al modal de detalles de vehículos.
- `ContextualHelpForms.mjs`: 4/4 PASS. CI run 43611979071: 90 suites, 1,322 pruebas aprobadas, 0 fallos. Pages build/deployment en la rama work.
- Pendiente: ayudas de otros formularios PYS, panel Developer, revisión de textos redundantes y validación visual/teclado en navegador real.


## GP-IMG-DATA-01 — Consolidación global de simulación (2026-11-14)

- La UI ejecuta el preview en lotes de 25, valida el digest del snapshot de Cortes/referencias y conserva la clasificación del historial de imágenes.
- Corrección adicional: los nombres canónicos duplicados se consolidan entre todos los lotes; cada archivo del grupo pasa a ambiguo, se elimina su URL propuesta y se recalculan los conteos globales.
- Se incorpora cobertura de regresión UI para la consolidación de duplicados y el conteo de registros históricos.
- La auditoría recursiva y el preview no escriben Spreadsheet, Drive ni permisos. El proceso de escritura de URLs, persistencia/reanudación del preview y pruebas Beta siguen pendientes.
- HEAD de partida: `a4fdd48ec60ce56ed6ea333c355b23cf9a5f5c2c`. Validación CI de este cambio pendiente.


## GP-IMG-DATA-01 — Concurrencia y recuperación de la simulación (2026-11-14)

- La llamada al preview ahora utiliza `routeActionWithRetry` con timeout de 45 s, hasta tres intentos y cancelación de reintentos cuando la vista/sesión deja de ser vigente.
- El bloque `finally` libera siempre el indicador global de auditoría/conciliación, incluso si se cierra el modal o cambia la sesión durante una petición; solo actualiza controles si la vista sigue vigente.
- Pruebas CI del HEAD previo `92184d7ac75e9c55465c7da46ad1e8365582b401`: 91 suites, 1,333 pruebas aprobadas, 0 fallos (run 43612960257). CortesImageReconciliation 15/15 y UI 6/6.
- La validación CI del cambio actual queda pendiente. Pages build/deployment del HEAD previo estaba pendiente al registrar esta actualización.


## GP-IMG-DATA-01 — Separación de dry-run y escritura del inventario (2026-11-14)

- El escaneo recursivo de Drive ya no registra automáticamente las imágenes sin uso en `Imagenes_Reemplazadas` al completar o recuperar una auditoría.
- El registro del inventario ahora requiere botón explícito y confirmación que informa que escribe en Spreadsheet; no mueve archivos ni modifica URLs/permisos. La organización/movimiento permanece en una acción distinta con confirmación.
- La simulación de conciliación continúa siendo de solo lectura. No se invocó ninguna acción de escritura contra servicios productivos.
- Pruebas CI para este cambio pendientes.


## GP-IMG-DATA-01 — Liberación de bloqueos en auditoría y organización (2026-11-14)

- Auditoría y organización ahora liberan el indicador global en `finally` aunque el modal se cierre o la sesión deje de ser actual. La persistencia final y la actualización de UI permanecen condicionadas a la vista vigente.
- CI del HEAD previo `78fdb6a3d9d72e70ad412a5d0146d8a1333678e0`: servicio regresión PASS (ver run 43613411742). CI de esta corrección pendiente.


## GP-IMG-DATA-01 — Conciliación Drive ↔ Cortes: simulación endurecida (2026-11-14)

- ADMIN expone `previewCortesImageReconciliation`, conectado a la auditoría recursiva de Drive. El frontend envía lotes de hasta 25 imágenes, revalida IDs y compara un digest estable de destinos/referencias/historial entre lotes.
- Cada archivo se valida contra el árbol «Cortes», tipo MIME imagen, estado no eliminado y acceso público ya existente. No se modifican permisos.
- Destinos derivados de las ocho columnas de imagen, solo para IDs de vehículo únicos. Coincidencia exacta por nombre canónico; fórmulas y valores existentes quedan protegidos. No se usa similitud aproximada.
- Se excluyen todas las referencias registradas en `Imagenes_Reemplazadas`, incluyendo archivo original, URL anterior y URL de reemplazo. Los nombres canónicos duplicados entre lotes se consolidan como ambiguos y pierden cualquier URL propuesta.
- La UI utiliza timeout de 45 s, hasta tres reintentos y cancelación si cambia sesión/vista; los bloques `finally` liberan los indicadores globales aunque se cierre el modal. Guardar el inventario de imágenes sin uso requiere confirmación explícita.
- Pruebas: `CortesImageReconciliation.mjs` 15/15 PASS; `CortesImageReconciliationUI.mjs` 9/9 PASS. GitHub Actions run 43613537658: 91 suites, 1,336 pruebas aprobadas, 0 fallos.
- El reporte propone URL `https://drive.google.com/uc?export=view&id=...` solo si el acceso público ya está verificado. No escribe en Spreadsheet/Drive ni modifica permisos.
- Pendiente: persistir cursor/progreso del preview, manifiesto de escritura con aprobación por fila, aplicar URLs con read-back, validar catálogo/formulario, conteos antes/después, auditoría y rollback; probar en copia Beta. No se ejecutó contra Drive/Spreadsheet reales.


## GP-IMG-DATA-01 — Persistencia y reanudación del preview (2026-11-14)

- Se agregó almacenamiento IndexedDB separado del cursor/inventario de auditoría, con clave por usuario y validación de `auditId`, firma de la lista de archivos, digest de fuentes, lote confirmado y revisión CAS.
- Cada lote de preview se persiste solo después de validar la respuesta del backend; una interrupción permite continuar desde el siguiente lote confirmado sin repetir los anteriores. Si cambia la lista de archivos se descarta el progreso de ese auditId y se reinicia el preview.
- El guardado local valida integridad estructural, límite de tamaño y revisión concurrente; no escribe en Drive ni Spreadsheet.
- Añadida regresión estática UI para contrato de persistencia/reanudación. Validación CI pendiente.


## GP-IMG-DATA-01 — Corrección de aserción de concurrencia (2026-11-14)

- CI run 43613854019 detectó un fallo exclusivo de la aserción estática: el test esperaba `current.revision !== expectedRevision`, mientras el código convierte la revisión almacenada con `Number(current.revision)` antes de compararla.
- La condición CAS de IndexedDB no se modificó; se corrigió el test para verificar la expresión implementada. Repetir CI completo antes de cerrar.


## GP-IMG-DATA-01 — Fallo seguro al calcular firma de archivos (2026-11-14)

- El cálculo SHA-256 del conjunto de imágenes se movió dentro del `try/finally` de la simulación. Si Web Crypto no está disponible, la UI informa que se requiere un contexto seguro/HTTPS y libera los indicadores globales.
- No se intenta persistir un progreso parcial si la firma del conjunto no pudo calcularse; se evita enviar un estado inválido a IndexedDB y se conserva el error original.
- Añadida regresión estática para verificar el alcance del cálculo dentro del bloque protegido y la liberación en `finally`. CI pendiente.


## GP-IMG-DATA-01 — Estabilizar aserción de manejo de error (2026-11-14)

- CI run 43614081536 falló en la nueva prueba estática por una expectativa de salto de línea demasiado literal, no por ejecución de lógica; las pruebas anteriores del archivo pasaron.
- Se reemplazó la comparación textual sensible a espacios por una expresión regular que verifica el bloque de persistencia parcial sin depender del formato.


## GP-IMG-DATA-01 — Ajuste final de patrón de regresión (2026-11-14)

- CI run 43614168781 volvió a fallar únicamente por el patrón regex de la prueba, que contenía escapes duplicados y buscaba barras invertidas literales. Se corrigió el regex y se hizo tolerante a espacios/saltos de línea también en la comprobación de `finally`.


## GP-IMG-DATA-01 — Validación local completada (2026-11-14)

- Persistencia/reanudación IndexedDB y recuperación segura ante ausencia de Web Crypto implementadas.
- Pruebas unitarias del planner: `CortesImageReconciliation.mjs` 15/15 PASS.
- Pruebas de UI/contratos: `CortesImageReconciliationUI.mjs` 11/11 PASS.
- GitHub Actions run 43614230424: 91 suites, 1,338 pruebas aprobadas, 0 fallos.
- GitHub Pages run 43614229665: build y deployment PASS.
- Los fallos previos (runs 43613854019, 43614081536 y 43614168781) fueron de aserciones estáticas de test; se corrigieron y la ejecución posterior aprobó. No hubo fallos de lógica reproducibles en la suite final.
- No se ejecutaron operaciones contra Drive/Spreadsheet ni se modificaron permisos. Quedan diferidas a Beta las comprobaciones de navegador real/IndexedDB entre pestañas y el flujo externo con Apps Script/Drive/Sheets.
- Siguiente dependencia de GP-IMG-DATA-01: diseñar manifiesto de escritura con aprobación explícita por fila, precondiciones y verificación read-back; no ejecutar escrituras reales sin autorización expresa.


## GP-IMG-DATA-01 — Recuperación visible del reporte y firma completa del inventario (2026-11-14)

- Al reabrir el panel con una auditoría completa, la UI calcula la firma del inventario y recupera automáticamente el reporte/progreso IndexedDB si pertenece a la misma cuenta, auditoría y conjunto de archivos. La UI distingue reporte completo guardado (copia no revalidada) de progreso parcial reanudable.
- La firma ahora incluye ID, nombre y MIME de cada imagen, ordenados por ID; cambios de nombre o tipo invalidan el estado anterior en lugar de reutilizar resultados incompatibles.
- Un estado marcado `complete` ya no se reutiliza como si fuera vigente al pulsar Conciliar: se inicia una simulación nueva. Los lotes intermedios permanecen `running`; solo el reporte agregado y normalizado se marca `complete` al final. Así, una interrupción después del último lote no confunde un lote recibido con un reporte final consolidado.
- Añadida regresión UI para restauración automática, invalidación de firma y distinción entre reporte completo y reanudación parcial. CI pendiente.


## GP-IMG-DATA-01 — Corregir referencia de estado en prueba de recuperación (2026-11-14)

- CI run 43614444869 falló en una aserción estática que nombraba `saved.status` donde la implementación consulta `previous.status`. El flujo de recuperación no llegó a fallar en ejecución; planner 15/15 PASS.
- Se corrigió la referencia del test para verificar la condición real de reanudación parcial. CI completo pendiente.


## GP-IMG-DATA-01 — Ajuste de texto en prueba de restauración (2026-11-14)

- CI run 43614515817 falló por diferencia de capitalización en el literal del test: la UI presenta «pulsa Conciliar» en minúscula después de un punto y coma. Se alineó la aserción con el texto real; no se modificó la UI.


## GP-IMG-DATA-01 — Actualizar prueba tras extraer helper de firma (2026-11-14)

- CI run 43614576309 encontró que la regresión de firma seguía inspeccionando el cuerpo de `runCortesReconciliation`, aunque el cálculo SHA-256 se extrajo correctamente a `createCortesImageFileSignature_` para reutilizarlo al restaurar el reporte.
- La prueba ahora verifica la disponibilidad de Web Crypto en el helper y que su llamada ocurra dentro del `try/finally` de la simulación; se mantienen las comprobaciones de guardado parcial y liberación de bloqueos.


## GP-IMG-DATA-01 — Restauración del reporte local validada (2026-11-14)

- La reapertura del panel recupera el reporte local correspondiente a la cuenta, auditoría y firma completa de archivos (ID, nombre y MIME). El mensaje distingue una copia completa no revalidada del progreso parcial reanudable.
- Los lotes quedan en estado `running` hasta consolidar y normalizar todos los resultados; solo entonces se marca `complete`. Al actualizar un reporte completo se ejecuta una simulación nueva.
- Planner: `CortesImageReconciliation.mjs` 15/15 PASS. UI: `CortesImageReconciliationUI.mjs` 12/12 PASS.
- GitHub Actions run 43614652559: 91 suites, 1,339 pruebas aprobadas, 0 fallos. GitHub Pages run 43614652263: build y deployment PASS.
- No se ejecutaron escrituras en Drive/Spreadsheet ni cambios de permisos. Las pruebas de navegador real/IndexedDB entre pestañas y las llamadas a Apps Script/Drive/Sheets quedan para Beta.
- Siguiente tarea local de GP-IMG-DATA-01: diseñar y probar el manifiesto de aplicación con aprobación por fila, precondiciones, conteos antes/después, auditoría por asignación, read-back y rollback condicionado a huellas. La aplicación real sigue sin ejecutarse y requiere autorización expresa.


## GP-IMG-DATA-01 — Aplicación controlada de propuestas aprobadas (2026-11-14)

- Se agregó un validador puro de manifiesto que solo admite resultados `matched` del preview vigente, digest idéntico, archivo/celda únicos y coincidencia exacta de fila, columna, vehículo, campo y URL.
- El handler ADMIN exige confirmación explícita, sesión Desarrollador, lease de mutación y bloqueo de script; vuelve a generar el preview, precondiciona todas las celdas antes de escribir, verifica cada URL por read-back y registra cada asignación.
- Ante fallo, el rollback solo limpia una celda si todavía contiene exactamente la URL escrita y no tiene fórmula; cualquier cambio externo se conserva y se reporta para revisión manual. Incluye conteos antes/después y resumen en auditoría ADMIN.
- Pruebas puras del manifiesto añadidas. UI y CI pendientes; no se ejecutó la acción contra Spreadsheet/Drive.


## GP-IMG-DATA-01 — Aprobación individual en UI y conexión al handler (2026-11-14)

- El reporte final ofrece casillas únicamente para coincidencias exactas `matched`; cada casilla identifica archivo, vehículo, fila y campo. La acción limita la selección a diez propuestas y exige confirmación explícita antes de llamar a ADMIN.
- Tras una aplicación confirmada, se elimina el preview local y se ejecuta una simulación nueva para leer de vuelta el estado resultante. Si la respuesta es parcial o incierta, no se intenta repetir automáticamente la escritura y se solicita actualizar el preview.
- La llamada de mutación usa un único intento para evitar reintentos ciegos ante timeout. No se ha ejecutado el botón ni se han escrito datos productivos.
- Pruebas UI añadidas; CI pendiente.


## GP-IMG-DATA-01 — Aplicación aprobada y paquete validado (2026-11-14)

- UI: casillas de aprobación por coincidencia exacta, límite de 10 asignaciones y confirmación explícita. El reporte completo recuperado se identifica como copia local; la acción ADMIN vuelve a validar el preview y el digest antes de escribir.
- ADMIN: endpoint de mutación protegido por sesión Desarrollador, lease compartida y bloqueo de script. Prevalida todas las celdas/IDs, exige destino vacío sin fórmula, escribe individualmente, verifica read-back, registra cada asignación y compara conteos antes/después. Ante error, rollback solo si la celda conserva la URL escrita; no sobrescribe cambios externos.
- Planner: `CortesImageReconciliation.mjs` 19/19 PASS. UI: `CortesImageReconciliationUI.mjs` 13/13 PASS. GitHub Actions run 43615392436: 92 suites, 1,346 pruebas aprobadas, 0 fallos. GitHub Pages run 43615391867: build y deployment PASS.
- La acción de aplicación no fue invocada; no se escribieron celdas, no se movieron archivos ni se modificaron permisos. La validación con Apps Script/Drive/Spreadsheet reales y navegador/IndexedDB queda diferida a Beta. La escritura productiva permanece sujeta a autorización expresa.
- HEAD al cierre de esta actualización: `cefbc86158b6f19611e6ec726a00cfb6a768e9a1` (rama `GPSpedia2.2.5_work`).


## GP-UX-INFO-01 — Cierre local (2026-11-14)

- Se revisaron etiquetas de Developer y formularios, se redujeron textos de botones y se trasladaron explicaciones operativas a ayudas contextuales.
- La ayuda dinámica se controla con listeners delegados únicos en `document`, admite clic/foco por botón, cierre fuera/Escape, `aria-describedby` y restauración de foco. La burbuja queda fuera de etiquetas checkbox y funciona con plantillas de modal restauradas.
- Ayudas en alta de tutorial, PYS y controles de mantenimiento Developer. El modal de detalles de vehículos permanece excluido y cubierto por prueba.
- CI run 43616097773: 93 suites / 1,361 pruebas aprobadas / 0 fallos. `ContextualHelpForms` 12/12 y `DeveloperPanelUX` 3/3. Pages run 43616505909: build y deployment PASS.
- El nuevo flujo de aplicación de imágenes queda oculto hasta que el backend ADMIN desplegado anuncie `capabilities.applyApprovedReconciliation`; Pages y Apps Script se despliegan por separado. No se ejecutaron escrituras productivas.
- HEAD de código validado: `49bd0d1bacf00a22ea63d37a16d6e23a7e675b09`. Rama base verificada sin cambios en esta sesión: `GPSpedia2.2.5` en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


## Continuidad verificada — GP-IMG-DATA-01 (2026-11-14)

**Estado de código:** implementación de conciliación y aplicación controlada presente en la rama de trabajo; las validaciones de Drive/Spreadsheet real permanecen diferidas a Beta.

- Rama verificada: `GPSpedia2.2.5_work`.
- HEAD remoto verificado al iniciar esta revisión: `e8bd98343197be6ff1fd63e87a57a74b6ccf169c` — `test(images): assert audit-backed capability gate`.
- Desde el HEAD anterior documentado `49bd0d1bacf00a22ea63d37a16d6e23a7e675b09` hay 7 commits adicionales. El diff agregado afecta únicamente `ChangesLogs.txt`, `JS/Frontend/ui.js`, las dos pruebas de conciliación, `Services/admin.js`, `Tareas_Activas.md` y este checkpoint.
- Rama base verificada: `GPSpedia2.2.5` en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; comparación base/trabajo: 2,638 commits adelantada, 0 detrás. No se escribió en la rama base.

### Refuerzo de integridad revisado

- ADMIN conserva por página del inventario de auditoría los IDs, nombres y MIME de los archivos junto con los IDs procesados.
- La auditoría solo marca `imageMetadataVersion: 1` al completarse. La capacidad `applyApprovedReconciliation` se anuncia únicamente para una auditoría completa, vigente (máximo 6 horas), de la sesión actual, de la versión actual del servicio y con metadatos disponibles.
- Antes de escribir, ADMIN vuelve a cargar y cotejar el inventario completo, comprueba correspondencia de IDs/conteos, bloquea nombres canónicos duplicados, verifica que los archivos no hayan cambiado y reconstruye el preview/digest. La UI no habilita propuestas desde un reporte local restaurado sin un handshake nuevo.
- La aplicación conserva precondiciones de celda vacía/sin fórmula, bloqueo, read-back, auditoría y rollback condicionado al valor que escribió.

### Validaciones ejecutadas en esta revisión

- `CortesImageReconciliation.mjs`: 19/19 PASS.
- `CortesImageReconciliationApply.mjs`: 8/8 PASS.
- `CortesImageReconciliationUI.mjs`: 13/13 PASS.
- Pruebas adicionales aisladas de persistencia/lectura de metadatos, detección de duplicados, rechazo de páginas/metadatos incompletos y conservación de inventario: 5/5 PASS.
- Parsing V8 de `Services/admin.js`: PASS. Parsing del cuerpo de `JS/Frontend/ui.js` tras retirar únicamente los envoltorios estáticos `import/export`: PASS.
- **Alcance de ejecución:** las tres suites y las pruebas adicionales se ejecutaron en un harness V8 con los contenidos recuperados de GitHub y adaptadores para las dependencias Node.js; no equivalen a ejecutar Node CLI. El runner completo `JS/Tests/RunServiceTests.mjs` y `node --check` no se ejecutaron porque no hay un clon local del repositorio disponible en este entorno y la conexión Git remota no resuelve DNS.
- El API de GitHub no devolvió status checks para el HEAD `e8bd983`. La última CI registrada en el checkpoint anterior corresponde al HEAD `49bd0d1`: 93 suites / 1,361 pruebas PASS (run 43616097773); Pages build/deployment PASS (run 43616505909). No se atribuyen esos resultados al HEAD actual.

### Pendiente para Beta / siguiente acción

1. En un clon sincronizado de `GPSpedia2.2.5_work`, ejecutar el runner Node.js completo y comprobar GitHub Actions sobre el HEAD vigente.
2. Desplegar `Services/admin.js` en el proyecto ADMIN de Beta y completar una auditoría Drive real para verificar persistencia de metadatos y handshake de capacidad.
3. En una copia Beta autorizada, ejecutar preview y probar una aplicación aprobada, read-back, auditoría y rollback. No se ejecutó ninguna escritura en Drive/Spreadsheet ni se modificaron permisos durante esta revisión.
4. La aplicación sobre datos productivos continúa requiriendo autorización expresa.


### Publicación documental de continuidad — 2026-11-14

- Tras la revisión del código `e8bd98343197be6ff1fd63e87a57a74b6ccf169c`, se publicaron tres commits documentales, sin cambios funcionales: checkpoint `7d039d0274ad051c133609bd1bd0e0bbfd93d514`, ChangesLogs `347818c8030ff778e2b2707cb910e5bf914be15d` y Tareas_Activas `592572e5f410afeb350c4a96225934c421736989`.
- HEAD remoto verificado antes de esta sincronización final del checkpoint: `592572e5f410afeb350c4a96225934c421736989`. El código funcional no cambió después de `e8bd983`.
- Las tres actualizaciones documentales se realizaron únicamente en `GPSpedia2.2.5_work`; la rama base sigue en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


## Verificación técnica integral iniciada — 2026-11-14

- HEAD previo confirmado: `d4b481e856fe3ec539d499f66639e09420b8b0c5`. La actualización del backlog para corregir la continuidad y activar CI generó el commit `cc301f093ed1b38d94aec7cc99233ab1ce72f3fe` en la rama autorizada.
- La etapa GP-IMG-UX-01 no está pendiente: sus criterios locales figuran completados en `Tareas_Activas.md`. Se inicia la verificación integral exigida por la sección 11 de las normas.
- Workflow previsto: `.github/workflows/service-tests.yml`, ejecuta Node.js 22, `node --check` de módulos principales y runner `JS/Tests/RunServiceTests.mjs`.
- Resultado CI todavía no confirmado al redactar esta nota. No se declarará aprobado hasta verificar el run asociado al HEAD publicado.
- No se han desplegado Apps Script ni modificado datos de Drive/Spreadsheet. Las pruebas externas permanecen diferidas a Beta.


### Resultados parciales de verificación integral — 2026-11-14

- Parsing V8 de los módulos backend `Services/Auth.js`, `admin.js`, `catalog.js`, `feedback.js`, `write.js`, `users.js`, `Utilities.js` y `Coordinator.js`: 8/8 PASS.
- Parsing V8 de `SharedMutationClient.js`, `InboxConversations.js` y los módulos frontend `main.js`, `auth.js`, `ui.js`, `offline.js`, `clientInteractionPolicy.js`, `navigation.js`, `state.js`: 9/9 PASS, retirando únicamente envoltorios estáticos ESM para la comprobación en V8.
- Parsing V8 de `service-worker.js`, `api-config.js`, `RunServiceTests.mjs`, suites de conciliación de imágenes (planner/aplicación/UI), `IdentifierMigration.mjs`, `SessionActivityCoordination.mjs`, `InboxUi.mjs`, `InboxConversations.mjs`, `PasswordHashMigration.mjs`, `PasswordKdfBenchmark.mjs`, `VehicleModalRolePolicy.mjs` y `ClientInteractionPolicy.mjs`: PASS tras retirar import/export estáticos y sustituir `import.meta.url` solo para parsing. Esto no equivale a ejecución de Node CLI ni a ejecución de las suites.
- El runner integral `JS/Tests/RunServiceTests.mjs` está presente y cubre WRITE, ADMIN, FEEDBACK, CATALOG, UTILITIES, AUTH, USERS e INTEGRATION. El workflow `.github/workflows/service-tests.yml` está configurado para push en esta rama y usa Node.js 22.
- El conector GitHub disponible no expone una consulta de runs de push/check-runs; `fetch_commit_workflow_runs` filtra a ejecuciones de pull request y el endpoint de status consultado devolvió una lista vacía. Por ello, la ejecución de Actions sobre el HEAD actual no puede confirmarse desde esta interfaz. No se declara CI PASS ni se atribuye el resultado de un HEAD anterior.
- No hay clon local/Node CLI en este entorno. La ejecución integral real del runner queda pendiente de un entorno con Node.js 22 o de consultar el run de Actions directamente en GitHub. Las validaciones externas de Beta siguen separadas.


### Preparación de validaciones Beta y sincronización documental — 2026-11-14

- Se consolidó en `Tareas_Activas.md` un protocolo Beta para P1, P2, P3, P4, GP-IMG-DATA-01 y P6. La lista comienza con comandos copiables para verificar repositorio/rama, detenerse ante cambios locales, hacer fetch + pull --ff-only y mostrar el HEAD final, según la sección 5 de las normas.
- Se registró el cambio documental en `ChangesLogs.txt`; no hubo cambios funcionales ni operaciones externas.
- Commits de esta continuación: backlog/continuidad `cc301f093ed1b38d94aec7cc99233ab1ce72f3fe`; checkpoint de inicio `f6d43077572fe3099391ebcf02c8cf0f1d72c581`; checkpoint de parsing `7d0d844bc14bb8cf74b5546cb2d6e70c1f9635b6`; protocolo Beta `5766a98886bb86b7d07f9bd27eeeeb8130cdccd5`; changelog `17bab7a7d5c342557a3b7d41e3018d3c8cb81261`.
- Pendiente de verificación integral local: ejecutar `node --check` y `node --experimental-default-type=module JS/Tests/RunServiceTests.mjs` con Node.js 22, o consultar la ejecución GitHub Actions del HEAD vigente. El conector actual no permite consultar runs de push ni check-runs; no se declara aprobación CI.
- Pendiente Beta: las 14 casillas abiertas en el backlog corresponden a pruebas con navegador/dispositivo, runtime Apps Script, hojas/Drive reales, despliegues, copias de datos o autorización expresa. No se consideran bloqueos de implementación local.


### Adenda correctiva — verificación integral CI confirmada (2026-11-14)

Esta adenda corrige las notas anteriores que indicaban que no era posible consultar GitHub Actions o que la ejecución Node CLI seguía pendiente. Se localizó el endpoint general de ejecuciones del repositorio, que sí devuelve los runs de tipo `push`.

- HEAD de código/documentación validado: `4ce76205be184fa5f8b66e1ebaec0b5b2574e3ac` en `GPSpedia2.2.5_work`; el run de pruebas se ejecutó sobre ese SHA exacto.
- GitHub Actions run `43619377905`, workflow `GPSpedia service regression tests`: **success**. Job `service-tests`: todos los pasos completados, incluidos checkout de la rama autorizada, verificación de repositorio/rama/árbol limpio, configuración de Node.js, sintaxis y runner integral.
- Runtime comprobado en los logs: Node.js `v22.23.4`.
- `node --check` ejecutado y aprobado para `JS/Frontend/main.js`, `auth.js`, `ui.js`, `offline.js`, `clientInteractionPolicy.js`, `service-worker.js` y `Services/admin.js`.
- Ejecución real de `node --experimental-default-type=module JS/Tests/RunServiceTests.mjs`: **93 suites, 1,363 pruebas aprobadas, 0 fallos de suite**. El runner cubre WRITE, ADMIN, FEEDBACK, CATALOG, UTILITIES, AUTH, USERS e INTEGRATION. Se verificó el resumen directamente en los logs de Actions.
- GitHub Pages run `43619377948`, también sobre `4ce76205...`: build, reporte de estado y deployment completados con **success**.
- El endpoint de estado combinado sigue devolviendo `statuses: []`; esto no invalida los resultados, porque se inspeccionaron directamente los runs y sus jobs/logs.
- Advertencias no bloqueantes observadas: módulo `punycode` deprecado y aviso de que `actions/checkout@v4` / `actions/setup-node@v4` usan Node 20, actualmente forzado a Node 24 por el runner. No hubo fallos por estas advertencias.
- La verificación cubre pruebas automatizadas aisladas y sintaxis en los siete módulos listados; no representa ejecución real de Apps Script, Google Sheets, Drive, OAuth, navegador/dispositivo ni validación de campo. Esas pruebas siguen diferidas a Beta. No se realizaron escrituras productivas ni cambios de ACL.
- Rama base verificada en la comparación: `GPSpedia2.2.5`, sin avance detrás ni cambios incorporados por esta tarea; la rama de trabajo permanece 2,648 commits ahead y 0 behind, con merge base `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.

La anotación previa que declaraba inaccesibles los runs de push queda superada por esta evidencia; se conserva como historial y esta adenda es el estado vigente.


## Continuidad P1 — autenticación simplificada (2026-11-14)

- Se retomó el backlog desde `Tareas_Activas.md`; P1 era el siguiente paquete ordenado. Se confirmó que el cliente mantiene sesión persistida, restaura/valida al iniciar, conserva la identidad al navegar/recargar y utiliza `requestId` idempotente para evitar solicitudes de login duplicadas ante reintentos.
- Se añadió cobertura de comportamiento aislada en `JS/Tests/SessionStartupNavigation.mjs`: fallo transitorio seguido de reintento con el mismo `requestId`, clave de usuario normalizada, finalización de la solicitud exitosa y protección para que una respuesta antigua no borre un request posterior.
- Primera ejecución de CI del cambio (run `43620023357`) falló por escapes incorrectos en el regex del harness de prueba; la nueva prueba sí llegó a ejecutarse y aprobó, pero el extractor falló después. Se corrigió el harness en un commit separado, sin alterar código de producción, y se repitió la suite completa.
- Validación final en el HEAD del cambio de prueba `881ebac152faee2a57c95bcd0a9794249ed81810`: run `43620074644` **success**, Node.js 22.23.4, 93 suites / 1,364 pruebas aprobadas / 0 fallos; `node --check` y todos los pasos del job PASS; `SessionStartupNavigation` 13/13 PASS.
- P1 se registra como **COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**. Las pruebas con múltiples pestañas, offline/reconexión y dispositivos/navegadores reales permanecen pendientes de Beta; no bloquean el cierre local según las normas.
- Commits de esta continuación: prueba inicial `3d6b1a4c17a5c04522eec0cbcdb6c332c05758cd`; corrección del harness `881ebac152faee2a57c95bcd0a9794249ed81810`; backlog P1 `8ce0b1620897bcc7d8104b09d8b468614f4b97a2`; changelog `389166ef91df7073b2b60d1b892378272ce27d0d`.
- Siguiente paquete del backlog: P2 — migración de contraseñas e identificadores. El código/motor y pruebas locales están implementados; las acciones pendientes dependen de benchmark en runtime Apps Script Beta, auditoría real de IDs/Relay y dry-run/rollback sobre copia Beta. Se revisarán dependencias para determinar si hay una prueba local adicional que pueda cerrarse sin acceso externo.


## Continuidad P3 — rediseño Inbox (2026-11-14)

- Se revisó el paquete P3 tras cerrar P1. La implementación local de Inbox está completa: bandeja, carpetas/categorías, búsqueda, lista/detalle, adaptación móvil, paginación, caché aislada por sesión, respuestas, archivado, lectura, auditoría y permisos.
- Evidencia verificada en GitHub Actions run `43620155376` sobre HEAD `a43491bc4268249a54c6146e611e56e7063abce3`: job de regresión `success`, Node.js 22.23.4, `InboxConversations` 29/29 PASS, `InboxUi` 16/16 PASS, 93 suites / 1,364 pruebas / 0 fallos y comprobaciones de sintaxis PASS.
- P3 se registra como **COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**. La prueba manual de tema claro/oscuro, teclado, lector de pantalla, navegación Atrás y dispositivos/navegadores reales queda pendiente; no se simuló.
- Commit de actualización del backlog: `e9b556c96e2b2bc9ec38b8f3bdaf68f30c726665`; changelog: `22aad0d7d4dd62e4e3c56b70700ee42c41e27c4f`.
- Siguiente paquete: P4 — política de imágenes y permisos. La revisión estática y las pruebas locales de roles/contratos figuran completadas; falta verificar ACL reales de Drive y solicitudes HTTP negativas contra deployments Beta. La integración Google Drive aparece deshabilitada por administración en el catálogo de conectores disponible, por lo que no se puede inspeccionar Drive desde esta sesión; no se intentarán cambios de ACL.


## Continuidad P4 — política de imágenes y permisos (2026-11-14)

- Se cerró P4 a nivel local como **COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**. La matriz de capacidades, control de acciones por rol, restricciones de descarga, protección de medios contra interacciones casuales y autorización backend cuentan con cobertura local.
- Evidencia CI consultada directamente en el run `43620155376`: `VehicleModalRolePolicy` 12/12 PASS; `ClientInteractionPolicy` 5/5 PASS; `ADMIN edición modal/RBAC` 9/9 PASS; 93 suites / 1,364 pruebas / 0 fallos; sintaxis Node.js PASS.
- Pendiente Beta: revisar ACL reales de carpetas/archivos Drive y clasificar recursos públicos/privados; ejecutar llamadas HTTP negativas contra deployments para confirmar rechazos efectivos. El conector Google Drive aparece `DISABLED_BY_ADMIN` y no disponible para conexión; no se cambiaron permisos ni se accedió a datos productivos.
- Commits de documentación P4: backlog `4977834526c7ae081419214f79415f0c5ee3ec6f`; changelog `6fb5e1101f4520d91196c67508fed13afa7f88c5`.
- Próxima tarea en orden: P5 ya es una evaluación concluida; revisar P6 integración/regresión para confirmar si queda alguna prueba local adicional. Las pruebas reales de campo/PWA se mantienen separadas como validación Beta.


## Estado de continuidad — paquetes locales agotados, Beta como siguiente acción (2026-11-14)

- Se revisó P6 y se confirmó que ya figura **COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**; P5 también está evaluada y concluida. No quedan tareas de implementación local abiertas en el backlog actual.
- Conteo actualizado de `Tareas_Activas.md`: 14 casillas abiertas. Todas corresponden a validaciones Beta o a la restricción explícita de no escribir en Drive/Spreadsheet productivos sin autorización: sesión multi-pestaña/offline/dispositivos; benchmark en Apps Script; dry-run/auditoría/migración/rollback en copia Beta; formato de ID Relay tras auditoría; accesibilidad/Inbox/PWA en navegadores y dispositivos; ACL Drive; solicitudes HTTP negativas a deployments.
- CI y despliegue verificados sobre el HEAD `54202bf64b2ef435c4713d494fdfde07832b01e7`: service-tests run `43620277248` **success**, Node.js 22.23.4, 93 suites / 1,364 pruebas / 0 fallos; InboxConversations 29/29, InboxUi 16/16, VehicleModalRolePolicy 12/12 y ClientInteractionPolicy 5/5 PASS; sintaxis PASS. GitHub Pages run `43620276869`: build, reporte y deployment **success**.
- Comparación de ramas: `GPSpedia2.2.5_work` ahead 2,661 / behind 0 respecto de `GPSpedia2.2.5`; merge base `d9acc68d889985c2e2f42fe3a02e502efc86ead1`. La rama base no fue modificada.
- El conector Google Drive encontrado en el catálogo figura `DISABLED_BY_ADMIN` y no disponible para instalación; tampoco hay una herramienta conectada de Apps Script ni navegador/dispositivo de campo en esta sesión. Por tanto, no es posible ejecutar honestamente las 14 validaciones restantes aquí. No se simularon datos, no se tocaron ACL y no hubo escrituras productivas.
- Próximo paso ejecutable: disponer de un deployment/entorno Apps Script Beta y una copia aislada de Drive/Spreadsheet, más acceso autorizado para revisar ACL y probar navegador/dispositivo. Hasta entonces, no hay otra tarea local independiente que pueda avanzarse sin inventar trabajo o riesgo de producción.


## Incidencias nuevas reportadas — Developer y ADMIN (2026-11-14)

**Estado: PENDIENTE DE DIAGNÓSTICO Y CORRECCIÓN.** Registro detallado añadido a `LOGS.TXT` (commit `5522ce4f3797aa15cc65e9aa0ef06fa025234f06`).

1. **Acceso al panel Developer:** al iniciar sesión como Desarrollador, no se consigue acceder al panel. Reproducir desde sesión nueva y revisar autorización de apertura, restauración de sesión, navegación y respuesta AUTH/backend.
2. **Escáner de imágenes sin uso:** falla la carga de inventario e historial con el mensaje «el recurso está ocupado por operaciones activas ADMIN/sessionActivity». Revisar locks/leases, liberación, duración, reintentos y coordinación de operaciones ADMIN con sessionActivity.
3. **Inicializar historial:** el botón informa que la acción no está habilitada en la política del coordinador. Revisar contrato/nombre de acción, allowlist del coordinador, permisos ADMIN y configuración del deployment antes de cambiar políticas.

Las incidencias 2 y 3 podrían compartir una dependencia de coordinación del flujo de inventario/historial, pero la causa común no está confirmada. La incidencia 1 se mantiene separada hasta contar con reproducción y evidencia.

**Siguiente acción:** reproducir los tres síntomas en entorno autorizado, correlacionar los mensajes con los contratos cliente/backend y revisar el coordinador compartido. Priorizar la recuperación del acceso Developer y del escáner sin relajar controles de sesión, permisos ni concurrencia. No se han realizado cambios de código ni deployments para estas incidencias.


## Revisión diagnóstica — incidencias Developer y ADMIN (2026-11-14)

**Estado: DIAGNÓSTICO ESTÁTICO PARCIAL COMPLETADO; CORRECCIONES PENDIENTES.**  
HEAD de inicio de revisión confirmado: `edac7202791223de890ed6d912cc93f7e1fbfa63`.

### Hallazgos
1. **Inicializar historial — causa confirmada:** `migrateReplacedImagesSchema` aparece en `isSharedMutationAction_` y en el dispatcher de `Services/admin.js`, pero falta en `coordinatorPolicy_()` de `Services/Coordinator.js`. El coordinador rechaza las acciones sin política. La acción migra y verifica columnas de `Imagenes_Reemplazadas`; la corrección debe declarar una política mínima para `IMAGE_INVENTORY`, sin ampliar permisos generales y conservando la sesión Desarrollador y ScriptLock.
2. **Escáner — mecanismo de contención identificado:** `auditDriveImagesInCortes` y `getReplacedImages` no están clasificadas como acciones coordinadas específicas. `doPost` las envuelve en `ADMIN/sessionActivity`, que escribe `ACTIVE_SESSIONS`. El coordinador impide leases concurrentes que escriben el mismo recurso; la validación ADMIN también actualiza `ActiveSessions.LastActivityAt`. Esto explica el mensaje de recurso ocupado cuando coinciden solicitudes, pero el orden/duración exactos deben reproducirse en Beta. No retirar la protección de sesión ni habilitar escrituras simultáneas como solución rápida.
3. **Panel Developer — causa no confirmada:** el flujo estático de botón, listener, `openDevTools` y contrato de AUTH (`ID`, `Privilegios`, `SessionToken`) es consistente. Falta reproducir en navegador y observar contexto de sesión, resultado de `ensureUiSessionRole_`, ejecución del callback y estado del modal.

### Registro y validación
- Nuevo informe técnico: `Auditoría.txt`, hallazgos AUD-2026-11-14-01 a AUD-2026-11-14-03; commit `76f4e37b8392bb057d8462d2a7384316aeea3470`.
- Adenda al registro activo `LOGS.TXT`; commit `a3bec62bf7acea483fd41ccdbff0cfe62fd4c48d`.
- Revisión estática realizada; no se ejecutaron pruebas automatizadas nuevas, navegador, Apps Script, Coordinator, Spreadsheet ni Drive.
- No se modificó código, política, endpoint, deployment ni datos productivos.

### Siguiente acción
1. Corregir la política ausente de `migrateReplacedImagesSchema` y añadir pruebas de contrato.
2. Rediseñar/probar la coordinación de las consultas ADMIN concurrentes, manteniendo la escritura protegida de actividad de sesión.
3. Reproducir el fallo de acceso Developer en navegador antes de tocar el flujo UI/AUTH.
4. Ejecutar sintaxis, pruebas de lógica, concurrencia y regresión; registrar por separado cualquier validación Beta pendiente.

La rama base `GPSpedia2.2.5` permanece fuera del alcance.

## Corrección ADMIN — política de historial y actividad cooperativa (2026-11-14)

- Se corrigió AUD-2026-11-14-01: migrateReplacedImagesSchema cuenta con política explícita de mínimo privilegio sobre IMAGE_INVENTORY. Mantiene autenticación Desarrollador, ScriptLock y rechazo deny-by-default para acciones no declaradas.
- Se corrigió el mecanismo de contención de AUD-2026-11-14-02: ADMIN/sessionActivity declara ACTIVE_SESSIONS como escritura cooperativa. Las consultas ADMIN protegidas pueden coexistir mientras actualizan actividad; las escrituras normales de AUTH/USERS/WRITE/FEEDBACK/UTILITIES y las mutaciones AUTH sobre sesiones siguen generando conflicto. No se desactivó la validación ni la actualización de LastActivityAt.
- Se incorporaron pruebas de política mínima, coexistencia de dos leases ADMIN, bloqueo de logout concurrente y liberación posterior. Se actualizó el contrato de Inbox para el nuevo campo sharedWriteResources.
- Commit funcional: 0bfb340583062891f3438dc12b8ab814520b7629. Commit posterior de sincronización de contrato Inbox: ca6bf55564308d13b68d5554f6b62d098a963855.
- GitHub Actions sobre ca6bf55564308d13b68d5554f6b62d098a963855: service regression run 43624818215 SUCCESS; Node.js 22.23.4; 93 suites, 1,366 pruebas aprobadas, 0 fallos; sintaxis PASS. GitHub Pages run 43624817783 build y deployment SUCCESS.
- AUD-2026-11-14-01 y AUD-2026-11-14-02 quedan corregidos a nivel de código y CI. La reproducción real del escáner y de la migración en Apps Script/Spreadsheet Beta sigue pendiente.
- AUD-2026-11-14-03 (apertura del panel Developer) permanece sin causa confirmada; requiere navegador real con sesión Desarrollador. No se altera el flujo de autorización a partir de inspección estática solamente.
- HEAD funcional/documental antes de esta actualización: ca6bf55564308d13b68d5554f6b62d098a963855. Rama base GPSpedia2.2.5 sin cambios (d9acc68d889985c2e2f42fe3a02e502efc86ead1).


## Corrección de apertura de paneles Developer — 2026-11-14

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**

- Causa identificada en `JS/Frontend/ui.js`: `ensureUiSessionRole_` lanzaba `validateActiveSession(false)` en segundo plano cada vez que se abría una vista privilegiada. Aunque no esperaba la respuesta para mostrar el panel, generaba una petición AUTH redundante.
- Corrección: el helper consulta ahora el contexto local de sesión y el rol ya establecidos al iniciar sesión; no solicita otra validación ni ejecuta una petición de red para abrir paneles. Se eliminaron los `await` asociados.
- Se conserva la validación de sesión al iniciar/restaurar la aplicación y la autorización backend integrada en cada operación protegida (token, identidad, vigencia, estado y rol). No se debilitan permisos de escritura ni se confía en el cliente para autorizar acciones.
- Pruebas actualizadas: `SessionUiRoleInvalidation.js` y `DevToolsModalAccessibility.mjs` verifican que el helper no invoque `validateActiveSession` ni `routeAction`.
- Evidencia CI: HEAD `2a423e67ff87e32e3c86ab71899b83cf1fe2e7b3`; run `43626278768` SUCCESS, 93 suites / 1,366 pruebas / 0 fallos; `SessionUiRoleInvalidation` 11/11, `SessionStartupNavigation` 13/13, `OverlayMenuModalHistory` 19/19, `DevToolsModalAccessibility` 19/19 y `node --check` PASS. Pages run `43626278368` SUCCESS.
- Pendiente de Beta: validar en navegador que abrir paneles no produce una llamada AUTH adicional y que una sesión revocada/rol retirado no puede ejecutar operaciones protegidas.
- Rama base `GPSpedia2.2.5` sin modificaciones.



## Corrección — aviso obligatorio por usuario/dispositivo (2026-11-14)

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**  
HEAD funcional/documental previo a este checkpoint: `5796cf04c2a9570214e661df5956c7174c162358`.  
Rama autorizada: `GPSpedia2.2.5_work`. Rama base `GPSpedia2.2.5`: sin modificaciones.

### Causa confirmada
- `Services/admin.js` envuelve las consultas ADMIN no mutables en `ADMIN/sessionActivity`, cuya lease mantiene acceso cooperativo a `ACTIVE_SESSIONS`.
- `AUTH/acceptTerms` reservaba `ACTIVE_SESSIONS` como escritura exclusiva. El preflight `touchProtectedAuthRequestSession_` actualiza `LastActivityAt`; cuando coincidía con la lease ADMIN, el coordinador rechazaba la aceptación por conflicto.
- La UI comprobaba `TermsAcceptance` ligado al token de sesión. Un login nuevo generaba otro token y hacía reaparecer el aviso incluso en el mismo navegador.

### Implementación
- `JS/Frontend/termsDeviceAcceptance.js`: identificador aleatorio persistente por origen/perfil de navegador y aceptación local por usuario, dispositivo y versión.
- `JS/Frontend/ui.js`: el aviso solo se muestra si la combinación usuario/dispositivo no ha aceptado la versión vigente. La aceptación confirmada sobrevive al logout/login.
- `Services/Auth.js`: valida sesión, identidad, vigencia, cuenta y revocación de rol; registra la aceptación en `Users.TermsAcceptance` como mapa por dispositivo. Conserva el registro anterior como antecedente y no lo aplica a dispositivos nuevos. El handler no escribe la aceptación en la fila de ActiveSessions.
- `Services/Coordinator.js`: `AUTH/acceptTerms` usa acceso cooperativo a `ACTIVE_SESSIONS` para la validación/actualización de actividad y escritura exclusiva en `USERS`. Puede coexistir con `ADMIN/sessionActivity`; login/logout y otras mutaciones exclusivas siguen protegidas.
- `service-worker.js`: caché v26 y precarga del módulo nuevo.
- `JS/Tests/Auth.js`: espejo del handler AUTH actualizado.
- Pruebas: `JS/Tests/SharedMutationCoordinator.js` y `JS/Tests/TermsModalAccessibility.mjs`.

### Validación local ejecutada
- SharedMutationCoordinator: **41/41 PASS**.
- TermsModalAccessibility: **12/12 PASS**.
- Simulación aislada de `handleAcceptTerms`: aceptación inicial, repetición en el mismo dispositivo (`alreadyAccepted:true`), aceptación independiente en un segundo dispositivo y preservación del registro histórico; sin escritura de la columna de aceptación de ActiveSessions desde el handler.
- Parsing/sintaxis de los archivos de código y pruebas modificados: PASS.
- Espejo funcional `Services/Auth.js` / `JS/Tests/Auth.js`: sincronizado.

### Pendiente para Beta
1. Desplegar las versiones actualizadas de `Services/Auth.js` y `Services/Coordinator.js` en los proyectos Apps Script de Beta; el commit de GitHub no actualiza esos deployments.
2. En el mismo navegador/perfil: aceptar, cerrar sesión, iniciar sesión de nuevo y confirmar que el aviso no reaparece.
3. En otro navegador/perfil: confirmar que el aviso aparece la primera vez; aceptarlo, cerrar/reabrir la plataforma y confirmar que no reaparece.
4. Ejecutar aceptación mientras existe `ADMIN/sessionActivity` y confirmar que no devuelve recurso ocupado.
5. Verificar que token inválido, sesión expirada y revocación pendiente continúan rechazados.

No se ejecutó GitHub Actions completo ni se probaron navegador, Apps Script, Spreadsheet o deployment Beta real. No se cambiaron endpoints, deployments ni datos productivos.

**Alcance de dispositivo:** la identificación es persistente en el almacenamiento local del origen/perfil del navegador, sin fingerprinting físico. Borrar datos del sitio o usar otro navegador/perfil se considera una identidad local nueva.


### Adenda — preflight de aceptación en solo lectura (2026-11-14)

La última revisión del flujo detectó que el preflight común de AUTH todavía ejecutaba `validateAndTouchSession_` para `acceptTerms`, actualizando `LastActivityAt`. Se corrigió con una rama específica que llama a `validateSessionReadOnly_(token, userId)`; no renueva actividad ni reconcilia sesiones. `handleAcceptTerms` vuelve a validar el token y el usuario antes de persistir la aceptación en Users. El resto de las mutaciones autenticadas conserva la actualización normal de actividad.

Validación repetida tras este ajuste:
- SharedMutationCoordinator: 41/41 PASS.
- TermsModalAccessibility: 12/12 PASS.
- Prueba aislada del preflight: acceptTerms usa lectura; logout conserva la ruta normal de actualización. PASS.
- Parsing/sintaxis de ocho archivos de código y pruebas: PASS.
- Espejo `Services/Auth.js` / `JS/Tests/Auth.js`: sincronizado.

El HEAD previo a esta adenda se verificará al publicar el checkpoint. No se ejecutó CI completo, navegador ni Apps Script Beta. La validación y el despliegue Beta siguen pendientes.

### Verificación de publicación y ramas — 2026-11-14

- HEAD de la rama de trabajo antes de esta actualización del checkpoint: `7b22709b00fa3bb095a241ffd1856a600739e2f9`.
- Rama base verificada: `GPSpedia2.2.5`, HEAD `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no se publicó ningún cambio en ella.
- Se verificaron en la rama de trabajo los archivos AUTH, Coordinator, UI, módulo de aceptación por dispositivo, Service Worker, pruebas y registros operativos.
- La validación local indicada arriba corresponde a las últimas versiones de código; GitHub Actions completo y pruebas Beta siguen sin ejecutarse.

## Nuevas incidencias registradas — 2026-11-14

**Estado:** registradas en el backlog; todavía no diagnosticadas ni corregidas.  
**Rama:** `GPSpedia2.2.5_work`. La rama base protegida `GPSpedia2.2.5` no se modificó.

Se añadieron a `Tareas_Activas.md` y al final de `LOGS.TXT` los siguientes reportes:

- **GP-UX-02:** mensaje de saludo no carga; reacción «útil» 👍🏿 devuelve «No se pudo registrar tu reacción. Reintentar»; tarjeta para agregar tutorial ausente; tarjeta para agregar problema en carrusel de relacionados con altura distinta.
- **GP-UX-03:** Inbox desordenado en móvil; rediseñar con barra/menú de acciones habituales (nuevo, borrar y las acciones soportadas), manteniendo permisos y accesibilidad.
- **GP-RBAC-02:** usuarios técnicos no pueden usar Inbox y reciben «servicio no autorizado para el coordinador compartido». Revisar acción, política del coordinador y permisos efectivos, sin ampliar privilegios generales.
- **GP-PWA-01:** la plataforma impide actualizarse y no permite recargar la página; revisar Service Worker, caché, ciclo de actualización y recarga segura.
- **GP-SEC-03 (ampliación):** el usuario reporta ausencia de medidas para mitigar capturas de pantalla en móviles. Evaluar capacidades reales de Android/iOS/web/PWA y documentar límites; no prometer bloqueo absoluto.

**Archivos actualizados:** `Tareas_Activas.md` y `LOGS.TXT`. No se modificó código, permisos, endpoints, Service Worker, deployments ni datos. No se ejecutaron pruebas porque esta intervención fue únicamente de registro.

**Siguiente paso:** continuar primero con las tareas vigentes y sus dependencias según la sección 11 de `NORMAS_DESAROLLO.md`; priorizar cualquier incidencia nueva que bloquee una función actual o comprometa continuidad/seguridad. Para cada reporte, reproducir y revisar contratos/consumidores antes de corregir. No asumir una causa a partir del mensaje visible.


## Continuidad de trabajo — diagnóstico y correcciones de incidencias reportadas (2026-11-14)

**HEAD confirmado antes de esta actualización:** `03783b2ee82da4af87c64b7be33843c3424c05c1` en `GPSpedia2.2.5_work`.  
**Rama base:** `GPSpedia2.2.5`, HEAD `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; sin modificaciones.

### Orientación y estado Git
- Se leyó íntegramente `NORMAS_DESAROLLO.md`; se consultaron `README.md`, `contexto_personal.md`, este checkpoint, `Tareas_Activas.md`, `Auditoría.txt` y `ChangesLogs.txt`.
- La rama de trabajo y la rama base se verificaron mediante GitHub API. Los commits de esta sesión se publicaron únicamente en `GPSpedia2.2.5_work`.
- Las incidencias GP-UX-02, GP-UX-03, GP-RBAC-02, GP-PWA-01 y GP-SEC-03 ya constaban en el registro activo; se agregó una adenda para el síntoma de aceptación del aviso y los hallazgos de esta revisión.

### Correcciones locales realizadas
1. **Pruebas de términos y PWA:** se alinearon las expectativas de `TermsAcceptance.js` con la firma actual de `loadInitialData(forceRefresh)` y se hizo que `PWAStartupScenarios.js` obtenga el nombre del caché desde `service-worker.js`.
2. **Prueba de sesión AUTH:** `SessionProfileRefresh.js` ahora valida que `acceptTerms` use preflight de solo lectura y que las demás mutaciones protegidas conserven la actualización de actividad.
3. **Saludo tras aceptación:** se detectó que el handler del aviso mostraba contenedores y cargaba catálogo, pero no reanudaba `showApp(user)`; por ello no se renderizaban saludo ni controles de rol tras la primera aceptación en un perfil nuevo. Ahora se reanuda el renderizado completo después de confirmar la aceptación local.
4. **Reacción útil:** `assertFeedbackSession()` actualiza `ActiveSessions.LastActivityAt`, pero la política FEEDBACK/recordLike no reservaba ese recurso. La política ahora reserva `ACTIVE_SESSIONS`, `CORTES`, `FEEDBACK` y `ACTIVITY`, con regresión de concurrencia frente a `ADMIN/sessionActivity`.
5. **Documentación de coordinador:** `Services/COORDINATOR_SETUP.md` se sincronizó con el flujo actual de aceptación por dispositivo, leases de Inbox y diagnóstico de secretos FEEDBACK.

### Validación local/CI
- GitHub Actions service-tests run `43629775820`: **SUCCESS**.
- Node.js 22: **94 suites / 1,388 pruebas aprobadas / 0 fallos**; comprobación sintáctica PASS.
- `TermsAcceptance`: 19/19 PASS.
- Coordinador compartido: 41/41 PASS.
- GitHub Pages run asociado al commit funcional más reciente `be6c9d9010227c255ae43a620979c4fe1e95c4cc` fue cancelado por ejecuciones posteriores; no se atribuye un resultado Pages PASS a ese commit. Verificar el último run asociado al HEAD documental vigente antes de cerrar esta continuidad.

### Diagnósticos y límites externos
- **Aviso obligatorio:** el código de la rama contiene `AUTH/acceptTerms` con preflight read-only y lease cooperativa sobre `ACTIVE_SESSIONS`; las pruebas locales permiten coexistir con `ADMIN/sessionActivity`. El mensaje de recurso ocupado no se reprodujo localmente. Se requiere verificar versión desplegada de Coordinator/AUTH y probar en Beta.
- **Aviso por dispositivo:** la aceptación se conserva por usuario, perfil/dispositivo y versión; logout/login en el mismo perfil no debe repetirla. Un perfil nuevo debe verla una vez. Borrar los datos del sitio genera una identidad local nueva.
- **Inbox Técnico:** el backend admite roles `tecnico` y `tecnico_exterior`. El mensaje de servicio no autorizado procede de la autenticación del servicio en Coordinator cuando falta/no coincide el secreto, no del rechazo RBAC. Verificar `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET` de FEEDBACK contra `GPSpedia_COORDINATOR_SECRET_FEEDBACK` en el mismo entorno.
- **Tutoriales:** la tarjeta de alta se renderiza únicamente para Desarrollador y el backend mantiene ese permiso. Si falta con una sesión Desarrollador válida, reproducir el renderizado en navegador antes de modificar la política.
- **Tarjeta PyS relacionada:** el código declara 120 px para tarjeta de alta; falta comparar dimensiones reales de ambas tarjetas en navegador móvil/escritorio.
- **Inbox móvil:** el modal actual tiene botones de nuevo mensaje/consulta/actualización, carpetas, búsqueda y paginación. El backend de conversaciones directas soporta crear, enviar, marcar leído y archivar; no existe eliminación de conversación directa. No añadir botón Borrar para ese tipo hasta definir y probar un contrato backend; los reportes históricos conservan su operación de eliminación con RBAC.
- **PWA:** Service Worker v26 usa `skipWaiting`, `clients.claim` y navegación network-first con fallback. No se encontró listener global que bloquee F5/Ctrl+R; el pull-to-refresh de la aplicación sincroniza catálogo y no recarga documento. Falta un control explícito de actualización/recarga que preserve operaciones pendientes.
- **Capturas:** navegador/PWA no ofrece API interoperable para bloquear capturas nativas ni acceso a Android `FLAG_SECURE`. Las restricciones existentes son disuasorias para medios y no deben presentarse como bloqueo real.

### Registros actualizados
- `Tareas_Activas.md`: adenda de diagnóstico para GP-AUTH-03 y actualización de GP-UX-02, GP-RBAC-02, GP-PWA-01 y GP-SEC-03.
- `Auditoría.txt`: AUD-2026-11-14-05 a AUD-2026-11-14-08.
- `ChangesLogs.txt`: cambios y validaciones efectivamente realizados.
- `Services/COORDINATOR_SETUP.md`: configuración y contratos actuales.

### Siguiente acción
Continuar con GP-UX-03: revisar el diseño móvil de Inbox y sus contratos de servidor, proponer una barra de acciones contextual con solo operaciones existentes y probar permisos/estados. En paralelo, preparar la validación Beta de AUTH/Coordinator y FEEDBACK. No desplegar Apps Script, modificar ScriptProperties ni tocar datos productivos desde esta sesión.


## Continuidad — Inbox móvil y recarga PWA (2026-11-14)

**HEAD confirmado antes de esta actualización:** `955c19c903bc611936feb75e96e264f6673d1877` en `GPSpedia2.2.5_work`.  
**Rama base:** `GPSpedia2.2.5`, HEAD `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; sin modificaciones.

### Implementación adicional
1. **Inbox histórico móvil:** la vista de solicitudes ahora muestra lista o detalle en una sola pantalla, con botón de regreso. Los elementos admiten teclado y foco. Se agregó una barra contextual accesible para responder, resolver y borrar.
2. **Acciones no soportadas:** se eliminó el botón genérico de borrado en aprobaciones de vídeo, ya que el backend solo permite borrar `problem_report` y `contact_form`. En conversaciones directas se mantiene archivar/restaurar; no se ofrece borrar porque no existe esa operación en el contrato.
3. **Recarga explícita PWA:** se agregó «Recargar aplicación» al menú lateral. Consulta `ServiceWorkerRegistration.update()` con límite de 3 segundos y después recarga el documento. El pull-to-refresh sigue sincronizando solo el catálogo.
4. **Service Worker:** caché actualizado a `gpsepedia-cache-v27`. Se verificaron los 33 recursos esenciales contra el árbol Git; no hay rutas faltantes.
5. **Pruebas:** `InboxUi` 19/19, `SessionStartupNavigation` 13/13 y `PWAStartupScenarios` 13/13.

### Validación CI
- GitHub Actions service-tests run `43630382765`: **SUCCESS**, 94 suites / 1,392 pruebas / 0 fallos.
- No se han realizado pruebas visuales con dispositivos reales.
- El último Pages build observado al registrar esta continuidad corresponde al commit `6dc78e318b90b5a778cc812cd73bd424d03492e7` y seguía en ejecución; comprobar el run más reciente asociado al HEAD documental antes de considerar publicada la versión web.

### Pendientes y límites
- **AUTH/Coordinator:** verificar en Beta los deployments Coordinator/AUTH y probar aceptación por usuario/dispositivo, concurrencia con `ADMIN/sessionActivity`, logout/login en el mismo perfil y un dispositivo nuevo. No se modificaron ScriptProperties ni deployments.
- **FEEDBACK/Inbox Técnico:** verificar `GPSpedia_COORDINATOR_URL` y secreto de FEEDBACK en el mismo entorno; el contrato backend admite Técnico y Técnico_exterior, pero la autenticación de servicio no se puede validar desde GitHub.
- **Tutorial:** la tarjeta «Agregar Tutorial» está reservada a Desarrollador. Reproducir su ausencia con una sesión Desarrollador válida antes de modificar visibilidad/RBAC.
- **Tarjeta PyS relacionada:** dimensiones declaradas de alta y tarjeta real no bastan para explicar la diferencia visual; falta medir en navegador.
- **Inbox móvil:** falta revisión visual Android/iOS de lista/detalle, scroll, barra de acciones y foco. Las conversaciones directas no tienen eliminación de backend.
- **Capturas:** una PWA web no puede bloquear capturas nativas de forma fiable. Android `FLAG_SECURE` requiere aplicación nativa/controlada. No se afirma protección absoluta; cualquier marca de agua requiere evaluar legibilidad y aprobación.
- **Recarga PWA:** falta validar actualización v26→v27, offline, reconexión y conservación de sesión/borradores en Android/iOS instalados.

### Siguiente tarea
Continuar con GP-UX-02: reproducir la ausencia de «Agregar Tutorial» con una sesión Desarrollador y medir la tarjeta «Agregar Problema» frente a las tarjetas reales en el modal. Después validar visualmente Inbox y recarga PWA en dispositivos. Mantener en paralelo los pendientes externos AUTH/Coordinator y FEEDBACK; no desplegar ni alterar datos productivos.


## Continuidad — corrección de tarjeta PyS relacionada (2026-11-14)

**HEAD confirmado antes de esta actualización:** `d04af4d712e5bc57b833cc5e47e71499dbe6d27f` en `GPSpedia2.2.5_work`.  
**Rama base:** `GPSpedia2.2.5`, HEAD `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; sin modificaciones.

### Corrección adicional
- Se detectó que las tarjetas reales PyS se insertaban dentro de `.pys-card-wrapper`, pero «Agregar Problema» se insertaba directamente en el carrusel. La diferencia de estructura hacía que las reglas flex y el espaciado se aplicaran a elementos distintos.
- `createPysAssociationAddCard()` ahora comparte wrapper con `createPysCard()`. La tarjeta interna usa 140×120 px; el wrapper de carrusel usa 160 px para incluir 20 px de separación. Se reutiliza la misma función tanto con un problema como con varios.
- Se corrigieron las rutas de `PysModalNavigation.js` y se registró esa suite en `RunServiceTests.mjs`; antes no se ejecutaba por el runner.
- CI run `43630661037`: **SUCCESS**, 95 suites / 1,401 pruebas / 0 fallos; `PysModalNavigation` 9/9 PASS.

### Pendientes visuales y de entorno
- Verificar en navegador real que «Agregar Problema» tenga igual alto que la tarjeta de problema, con uno y varios elementos, en móvil y escritorio.
- La tarjeta «Agregar Tutorial» permanece limitada al rol Desarrollador, tanto en UI como en backend. No se amplió RBAC; reproducir su ausencia con una sesión Desarrollador válida.
- Inbox móvil y recarga PWA tienen correcciones locales con CI PASS, pero falta prueba en dispositivos Android/iOS instalados.
- El error de aceptación de términos y el error de autorización del Inbox Técnico requieren verificación del deployment Apps Script y ScriptProperties Beta; no se alteraron datos ni deployments.
- La PWA no puede bloquear capturas nativas de forma fiable; para bloqueo efectivo se requiere contenedor nativo Android con `FLAG_SECURE`. Las restricciones web actuales son disuasorias.

### Estado de CI y publicación
- Service regression tests en el HEAD funcional `23d50d79c614dfcc3434deb9c25716ac93dc96d4`: SUCCESS, 95 suites / 1,401 pruebas.
- Pages build asociado a ese commit fue cancelado por una ejecución posterior. Verificar el último Pages run correspondiente al HEAD documental vigente antes de afirmar publicación.
- No se han ejecutado pruebas manuales en móviles ni llamadas de validación a servicios Apps Script.

### Siguiente acción
Comprobar el Pages build más reciente; después, seguir con reproducción visual de «Agregar Tutorial» para Desarrollador y de las tarjetas PyS, y validación de Inbox/recarga en Android/iOS. Mantener registrados los pendientes externos AUTH/Coordinator y FEEDBACK sin alterar producción.
