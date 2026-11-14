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
