# GPSpedia — Tareas activas y plan de paquetes

Fecha de registro: 2026-11-14  
Repositorio: `infogpstech/GPSpedia`  
Rama de trabajo: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5`  
HEAD al registrar la última actualización previa: `3601098443bac3ed5ec95d9aa866c468ed50bcce`

Este documento registra los requisitos nuevos y el orden de ejecución. La fuente normativa sigue siendo `NORMAS_DESAROLLO.md`; los registros archivados en `Olds/Documentacion_Legacy/` y `Olds/GPSpedia 2.2/` no se modifican.

## Objetivo

Simplificar la autenticación sin debilitar autorización; modernizar Inbox; endurecer controles de imágenes y permisos por rol; evaluar protección de pantalla con límites reales; completar migraciones de contraseñas e identificadores a mecanismos backend.

## Registro de problemas

| ID | Problema solicitado | Estado |
|---|---|---|
| GP-SEC-01 | Evitar validaciones periódicas/separadas; iniciar sesión una vez y conservar sesión y privilegios mientras siga vigente | PENDIENTE P0/P1 |
| GP-UX-01 | Inbox organizado, elegante y similar en experiencia a Outlook/Gmail, con identidad GPSpedia | PENDIENTE P0/P3 |
| GP-SEC-02 | Bloquear descargas casuales, clic derecho, menú contextual, copia y arrastre de imágenes | PENDIENTE P0/P4 |
| GP-RBAC-01 | Compartir integrado para todos; compartir, imprimir y editar detalles solo Supervisor, Jefe y Desarrollador | PENDIENTE P0/P4 |
| GP-SEC-03 | Evaluar mitigación de capturas de pantalla en web/PWA sin prometer bloqueo absoluto; el usuario reporta que no existe estrategia aplicada en dispositivos móviles | PENDIENTE P0/P5 |
| GP-DATA-01 | Disponer de migración explícita y verificable de contraseñas heredadas a hash seguro | PENDIENTE P0/P2 |
| GP-DATA-02 | Sustituir IDs calculados por fórmulas por IDs backend para usuarios, vehículos, tutoriales y relays | PENDIENTE P0/P2 |
| GP-UX-02 | Corregir saludo, registro de reacciones 👍🏿, tarjeta de alta de tutorial y altura de la tarjeta para agregar problema | PENDIENTE |
| GP-UX-03 | Reorganizar Inbox móvil y sustituir acciones dispersas/textuales por una barra de herramientas y menú de acciones habituales | PENDIENTE |
| GP-RBAC-02 | Habilitar y validar las funciones de Inbox para usuarios técnicos; actualmente reciben «servicio no autorizado para el coordinador compartido» | PENDIENTE |
| GP-PWA-01 | Corregir el bloqueo de actualización y permitir recargar/actualizar la plataforma de forma controlada | PENDIENTE |

## Hallazgos preliminares confirmados en código

1. **Sesión:** `auth.js` tiene validación cacheada 60 s; `main.js` revalida al recuperar conexión; `api-config.js` ejecuta `touchSession` previo a acciones protegidas, limitado localmente a 5 minutos. AUTH conserva expiración absoluta de 3 meses e inactividad de 1 mes. P1 debe eliminar validaciones redundantes, pero mantener autorización backend en cada operación protegida.
2. **Contraseñas:** AUTH ya migra una contraseña en texto plano a hash al login exitoso. El hash actual es SHA-256 con salt aleatorio. No se encontró todavía un comando de migración por lotes. Nuevas cuentas en `Services/users.js` también reciben hash. El coste del algoritmo actual debe evaluarse antes de seleccionar un formato más resistente.
3. **IDs:** usuarios nuevos usan IDs secuenciales `USR-####`; vehículos ya tienen asignador backend central y acciones `allocateVehicleId` / `freezeCortesIds`; tutoriales usan `tut-` + operationId; Problemas usa `isue-` + secuencia. La cobertura de registros antiguos, fórmulas y relays requiere auditoría adicional.
4. **Interacción con imágenes:** `clientInteractionPolicy.js` ya previene contextmenu, copy, cut, selectstart y dragstart en contenido no editable. Es una barrera contra acciones casuales, no impide inspección de red, extracción de URL ni captura del sistema.
5. **Inbox:** ya existen lista/detalle, paginación, caché, toolbar y acciones. El rediseño debe preservar contratos y capacidades.
6. **Roles:** el valor canónico único es `Jefe`. La hoja `Users.Privilegios` y su lista de validación ya fueron actualizadas por el usuario; los conversores temporales `Gefe` → `Jefe` se retiraron del backend y frontend. El código ya no acepta `Gefe`.

## Paquetes de ejecución

### P0 — Auditoría y diseño técnico
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA**

- [x] Mapear el flujo de login, restauración, validación, touch, revocación, expiración y logout.
- [x] Inventariar los endpoints y contratos de sesión/rol en AUTH, FEEDBACK, WRITE, USERS y ADMIN; identificar las lecturas públicas de CATALOG.
- [x] Confirmar la semántica de roles. El usuario confirmó que **Jefe** es la escritura correcta y el único valor oficial; la Spreadsheet ya fue actualizada y `Gefe` se retiró de los valores operativos.
- [x] Revisar share, print, download y edición del modal, sus llamadores y la autorización backend.
- [x] Inventariar en código los esquemas, generadores, fórmulas y consumidores de IDs de usuarios, vehículos, tutoriales, problemas PyS y Relay.
- [x] Revisar el hash actual, la conversión oportunista de contraseñas y los servicios que crean/verifican credenciales.
- [x] Definir contratos y controles de migración: dry-run, lotes reanudables, idempotencia, detección de duplicados, conciliación, verificación posterior y recuperación.

**Evidencia de cierre P0 (revisión estática de la rama):**
1. AUTH: login idempotente por `requestId`; `validateSession` comprueba sesión sin actualizar actividad; `touchSession` actualiza `LastActivityAt`; logout/revocación invalidan la sesión. El cliente conserva el token en `localStorage`, cachea la validación durante 60 s y `routeAction` ejecuta un `touchSession` separado antes de acciones protegidas, con una ventana local de 5 minutos.
2. Backend: FEEDBACK, WRITE, USERS y ADMIN comprueban token, identidad, vigencia y estado/rol en sus propias operaciones. CATALOG mantiene lecturas de catálogo/listas sin autenticación. Eliminar el preflight del navegador exige actualizar la actividad dentro de la operación protegida, no retirar la autorización backend.
3. Roles: el valor canónico es `jefe`; el código normaliza temporalmente `gefe` a `jefe` al leer datos heredados. AUTH, USERS, ADMIN, FEEDBACK, WRITE y frontend deben usar `Jefe`/`jefe` como único valor operativo. La matriz de permisos se mantiene como tarea separada.
4. Modal: compartir está disponible para todos; imprimir se renderiza actualmente para todos; edición solo se ofrece al Desarrollador en UI. ADMIN exige `assertDeveloperSession` para operaciones administrativas generales y `assertModalEditSession` para edición. Es una discrepancia confirmada para P4.
5. IDs: USERS crea `USR-####`; WRITE tiene contador central y asignador numérico para vehículos, además de acciones de mantenimiento/congelación; tutoriales usan `tut-` + `operationId`; problemas PyS usan `isue-###` y ledger `PysOperations` para reanudación/idempotencia. Relay declara columna `ID` y se consume desde CATALOG/WRITE para configuración; no se encontró un generador/escritor de filas Relay en los servicios versionados.
6. Contraseñas: AUTH verifica el formato `sha256$<salt>$<digest>` y migra texto plano a ese hash tras un login correcto. USERS genera el mismo formato para nuevas cuentas. No existe una migración administrativa batch en el código revisado; SHA-256 con salt no incorpora un factor de trabajo y debe medirse un formato versionado más resistente antes de elegir parámetros.
7. Permisos de imágenes: las acciones ADMIN generales, incluida `getReplacedImageDownloadUrl`, requieren Desarrollador. Por tanto, la descarga de la biblioteca puede quedar como excepción **solo dentro del panel Developer y para el rol Desarrollador**; no habilita descarga general para otros roles.

**Validación diferida a Beta:** no se consultaron ni modificaron hojas Spreadsheet/Drive reales ni deployments. La existencia y contenido efectivo de fórmulas/IDs heredados, encabezados físicos, datos duplicados y referencias huérfanas deben comprobarse mediante un dry-run de solo lectura en una copia/entorno Beta autorizado. Esta limitación no bloquea el cierre del análisis estático local.

### P1 — Autenticación simplificada
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

**Validación local (2026-11-14):** GitHub Actions run `43620155376` PASS con Node.js 22.23.4; `InboxConversations` 29/29 PASS, `InboxUi` 16/16 PASS y regresión integral 93 suites / 1,364 pruebas / 0 fallos. Las comprobaciones de sintaxis configuradas también aprobaron. La validación manual de navegadores/dispositivos queda diferida a Beta.

**Diseño derivado de P0:** cada servicio protegido actualiza `LastActivityAt` dentro de su propia operación, tras validar token, identidad, cuenta activa, expiración y rol vigente. La coordinación compartida evita carreras con logout, revocación o eliminación de filas. Se conserva la validación de restauración al iniciar la app; los fallos de red/AUTH no se convierten en logout y el estado local no autoriza operaciones.
- [x] Eliminar la revalidación redundante al recuperar conexión; conservar la validación de restauración al iniciar la aplicación.
- [x] Una sola autenticación interactiva por sesión: login idempotente por `requestId`, con reintento estable tras fallo transitorio y limpieza condicionada al request completado. Validación de campo diferida a Beta.
- [x] Conservar token/sesión entre navegación, recarga y apertura de modales mediante persistencia local; restaurar y validar al iniciar sin solicitar credenciales nuevamente mientras la sesión siga vigente. Validación de campo diferida a Beta.
- [x] Retirar el preflight `ensureSessionTouched_` y las llamadas redundantes antes de operaciones protegidas.
- [x] Validar identidad, vigencia y rol dentro de la petición protegida del backend, sin un viaje de red adicional.
- [x] Mantener revocación, expiración, desactivación y cambios de privilegios efectivos en el servidor.
- [x] Probar exclusión de concurrencia, sesión revocada y autorización backend en CI.
- [ ] Validación Beta externa: múltiples pestañas, offline, reconexión y navegación/dispositivo real.

**Validación final de implementación (2026-11-14):** GitHub Actions PASS — Node.js 22.23.4; 93 suites, 1,364 pruebas aprobadas, 0 fallos; `node --check` PASS para los módulos configurados. `SessionStartupNavigation` 13/13 PASS, incluida prueba de reintento idempotente de login. La validación Beta externa de pestañas, offline, reconexión y dispositivos reales sigue pendiente; no se desplegaron Apps Script ni se modificaron datos productivos.

### P2 — Migración de contraseñas e identificadores
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**
- [x] Diseñar hash versionado PBKDF2-HMAC-SHA256 con salt aleatorio único, verificación en tiempo constante y compatibilidad con SHA-256/plaintext legacy; incluir benchmark para calibrar Apps Script.
- [x] Exponer `benchmarkPasswordKdf` en AUTH, solo lectura y exclusivo de Desarrollador; valida la sesión sin actualizar actividad ni leer/escribir credenciales. La prueba automatizada cubre autorización, sesiones inválidas y ausencia de acceso a datos de usuarios.
- [x] Implementar migración por lotes reanudable e idempotente de contraseñas plaintext legacy, con dry-run predeterminado, confirmación explícita y lotes de hasta 10 (predeterminado 5); no registrar ni exportar contraseñas.
- [x] Mantener autenticación compatible: el login verifica PBKDF2, SHA-256 histórico y plaintext; SHA-256 histórico se rehashea al login porque no puede convertirse por lote sin conocer la contraseña.
- [ ] Medir `benchmarkPasswordKdf` en el runtime real de Apps Script y fijar el coste definitivo; 12,000 iteraciones sigue siendo provisional hasta esa medición. No ejecutar en producción sin autorización.
**Procedimiento de validación Beta del benchmark (pendiente de deployment actualizado):**

Antes de cualquier prueba, desde la raíz del clon autorizado:

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

Después de sincronizar, copiar el valor vigente de `API_ENDPOINTS.AUTH` desde `JS/Frontend/api-config.js` y ejecutar en la consola del navegador con una sesión activa de Desarrollador (sustituir los dos marcadores; no compartir ni registrar el token):

```javascript
const AUTH_URL = "PEGAR_AQUI_API_ENDPOINTS_AUTH";
const payload = {
  userId: "ID_DEL_DESARROLLADOR",
  sessionToken: "TOKEN_DE_LA_SESION_ACTIVA"
};
const response = await fetch(AUTH_URL, {
  method: "POST",
  headers: { "Content-Type": "text/plain" },
  body: JSON.stringify({ action: "benchmarkPasswordKdf", payload })
});
const result = await response.json();
if (result.status !== "success" || result.readOnly !== true) throw new Error(JSON.stringify(result));
console.table(result.results);
```

Registrar duración por iteración, fecha, deployment/versión y runtime. Repetir al menos tres veces en condiciones comparables y usar la mediana; no cambiar `PASSWORD_KDF_ITERATIONS` hasta revisar los resultados y el margen de tiempo de ejecución. Esta prueba no migra contraseñas ni modifica hojas.

- [ ] Ejecutar dry-run de migración en entorno Beta y verificar conteos; no ejecutar escritura productiva sin autorización y respaldo.
- [x] Implementar auditoría de solo lectura de IDs y fórmulas para Users, Cortes, Tutorial, Relay, pys y LogosMarca; incluye duplicados, ausentes, malformados y muestras Relay.
- [x] Endurecer el generador de IDs de usuarios para detectar duplicados aunque difieran en mayúsculas; sincronizar su fixture de prueba.
- [x] Canonicalizar IDs de tutorial en minúsculas y buscar IDs históricos sin distinguir mayúsculas para evitar duplicados por variación de capitalización.
- [x] Sustituir la fórmula de fila de LogosMarca por asignador numérico backend con contador y bloqueo.
- [ ] Ejecutar auditoría en Beta y definir el formato de ID de Relay para completar IDs faltantes; el repositorio declara la columna `Relay.ID`, pero no contiene un escritor ni define el formato. El motor solo congela fórmulas conservando el valor/tipo actual.
- [x] Reemplazar la fórmula de fila de LogosMarca por asignación backend numérica, con contador persistente, exclusión mutua, detección de IDs duplicados/malformados y pruebas automatizadas.
- [x] Compensar cargas de LogosMarca si falla el bloqueo/escritura; limpiar filas parciales, recuperar vínculos ya persistidos y marcar casos inciertos para recuperación manual.
- [ ] Migrar usuarios, vehículos, tutoriales y relays sin romper enlaces, aprobaciones, logs ni referencias cruzadas, después de revisar el reporte real de auditoría.
- [x] Implementar reporte de duplicados/ambigüedades por hoja sin modificar datos.
- [x] Ampliar `auditIdentifiers` con auditoría de referencias entre `Tutorial` y solicitudes de aprobación de vídeo en `Feedbacks`: coincidencias, referencias huérfanas/ambiguas, IDs ausentes, discrepancias entre la columna de referencia y el JSON, y JSON de aprobación malformado. Solo lectura; detalle limitado a 100 casos.
- [x] Completar el inventario estático de referencias consumidoras de Users, Cortes, PyS y LogosMarca; ADMIN `auditIdentifiers` comprueba las relaciones conocidas sin escribir. Relay conserva el ID actual y solo permite congelar fórmulas hasta confirmar su formato.
- [ ] Resolver los conflictos encontrados en el reporte Beta y detener solo los registros afectados.
- [x] Definir plan por entidad con snapshot, manifiesto inmutable, dry-run, lotes reanudables, verificación de referencias y reversión condicionada a huellas.
- [x] Implementar motor backend de migración con dry-run, SHA-256 de manifiesto/filas, snapshots ocultos, lotes reanudables de hasta 10, verificación read-back y rollback condicionado a huellas.
- [x] Probar localmente fill_missing, freeze_formula, colisiones, claves no únicas, reanudación por lotes, rollback, rechazo de cambios posteriores y congelación Relay sin cambiar valor/tipo (IdentifierMigration: 10/10 PASS).
- [ ] Ejecutar dry-run y prueba de rollback en una copia Beta real; no se modificaron hojas ni Drive.

### P3 — Rediseño Inbox
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**
- [x] Estructura de bandeja con conversaciones, carpetas, categorías, búsqueda, lista con remitente/asunto/fecha/estado y panel de lectura.
- [x] Jerarquía visual, densidad, estados no leído/leído, acciones y estados vacíos/carga/error.
- [x] Adaptación móvil con navegación lista-detalle, controles táctiles y botón de retorno al listado.
- [x] Preservar solicitudes históricas y sus contratos; conversaciones directas con respuestas, paginación, caché aislada por sesión, archivado, lectura, auditoría y permisos backend. Las conversaciones directas admiten texto; no se habilitaron adjuntos que el backend no soporta.
- [x] Añadir filtro de categorías conectado de extremo a extremo: selector UI, estado, reinicio de paginación, wrapper API, filtro backend y validación de categorías permitidas.
- [ ] Validación Beta manual en tema claro/oscuro, teclado, lector de pantalla, navegación Atrás y tamaños móviles/escritorio reales; CI verifica contratos, accesibilidad estructural, focus-visible y movimiento reducido, pero no sustituye la prueba de navegador/dispositivo.

### P4 — Política de imágenes y permisos
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

**Validación local (2026-11-14):** GitHub Actions run `43620155376` PASS; `VehicleModalRolePolicy` 12/12, `ClientInteractionPolicy` 5/5, `ADMIN edición modal/RBAC` 9/9 y pruebas de contratos de roles/descarga completadas dentro de 93 suites / 1,364 pruebas / 0 fallos. La sintaxis de `clientInteractionPolicy.js` también aprobó. La inspección de ACL reales y las llamadas HTTP negativas requieren deployments/Drive Beta y permanecen pendientes.

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**
- [x] Consolidar la matriz de capacidades por rol en todos los módulos y endpoints en `MATRIZ_CAPACIDADES_ROLES.md`; las excepciones ADMIN y las acciones de imágenes quedan cubiertas por pruebas de contrato.
- [x] Compartir integrado del modal permitido a todos.
- [x] Compartir integrado disponible para todos; imprimir y editar detalles solo Supervisor, Jefe y Desarrollador, con validación de rol en backend.
- [x] Unificar Jefe como valor canónico en AUTH, USERS, ADMIN, FEEDBACK, WRITE, Inbox y frontend; retirar los conversores temporales `Gefe` → `Jefe` tras la actualización de la Spreadsheet.
- [x] En la Spreadsheet, migrar Users.Privilegios de Gefe a Jefe y actualizar la validación/lista desplegable (confirmado por el usuario el 2026-11-14).
- [x] Retirar los conversores temporales Gefe → Jefe del backend y frontend; el código solo admite Jefe como valor canónico.
- [x] Ocultar el control de descarga de imágenes reemplazadas a roles distintos de Desarrollador y conservar autorización exclusiva de Desarrollador en el endpoint.
- [x] Aplicar fricción de menú contextual, copia, corte, selección y arrastre solo sobre medios (img/picture/video/canvas), conservando selección/copia de texto normal y edición en campos.
- [x] Revisar estáticamente la exposición de URLs: Cortes, Tutorial, PyS y LogosMarca almacenan referencias Drive que llegan al frontend; `ui.js` convierte IDs Drive a `lh3.googleusercontent.com` y `offline.js` puede descargarlas a IndexedDB. El ocultamiento de botones no protege esos recursos.
- [ ] Validación Beta: verificar los ACL reales de carpetas/archivos Drive y clasificar qué imágenes deben ser públicas por diseño; WRITE/ADMIN no muestran una comprobación general de ACL en todos los flujos.
- [x] Completar revisión estática de exposición de URL originales y recursos estáticos; documentar que los recursos entregados al navegador son recuperables. [ ] Validación Beta pendiente: verificar ACL reales de Drive.
- [x] Pruebas de rol para impedir edición/impresión a Técnico y roles no autorizados; autorización backend validada con sesión real simulada. [x] Ampliar pruebas de contrato para las acciones de imágenes y endpoints privilegiados; las llamadas HTTP negativas contra deployments Beta siguen pendientes.

### P5 — Mitigación de capturas
**Estado: EVALUACIÓN TÉCNICA COMPLETADA; NO EXISTE BLOQUEO FIABLE DE CAPTURAS EN WEB/PWA.**
- [x] Evaluar capacidades de navegador/PWA y distinguirlas de mecanismos disponibles en aplicaciones Android nativas.
- [x] Confirmar que `preventDefault`, `visibilitychange`, `blur` y `pagehide` no bloquean ni detectan de forma fiable capturas nativas.
- [x] Evaluar marca de agua contextual y ocultación al perder visibilidad. No se implementa marca de agua por defecto porque puede tapar diagramas técnicos y no impide capturas; ocultar al perder foco tampoco detecta la captura.
- [x] Documentar los límites de web/PWA y la alternativa para datos confidenciales: recursos privados y entrega autenticada/temporal desde backend.
- [x] Evaluación concluida: no se requiere una aplicación nativa para el alcance PWA actual. Reabrir solo si se decide desarrollar una app Android.

### P6 — Integración y regresión
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**
- [x] Pruebas automatizadas por rol y sesión: AUTH, ADMIN modal, Inbox, coordinación de mutaciones y sesiones revocadas/expiradas.
- [x] Pruebas unitarias de migración/reanudación/reconciliación: PBKDF2 batch, IDs, duplicados, fórmulas y referencias simuladas. La ejecución sobre datos reales sigue bloqueada hasta contar con copia/entorno Beta.
- [ ] Pruebas de Inbox en escritorio/móvil en navegadores y dispositivos reales; CI verifica estructura, contratos y responsive CSS.
- [x] Pruebas de contrato de modal y autorización backend con sesiones simuladas, incluyendo Técnico denegado y Supervisor/Jefe/Desarrollador permitidos. [ ] Validación Beta pendiente: llamadas HTTP negativas contra deployment.
- [ ] Pruebas de rendimiento, offline, reconexión y regresión PWA en dispositivos reales; CI cubre escenarios automatizados, no reemplaza medición de campo.

## Reglas de seguridad y aceptación

- La sesión persistente no debe requerir que el usuario escriba credenciales nuevamente al navegar normalmente.
- El cliente no es autoridad: el backend debe comprobar el token y el rol vigente en la operación sensible que procesa.
- La validación de rol no debe provocar una llamada de red adicional antes de cada operación; debe formar parte de la propia solicitud backend.
- Una sesión no es eterna: logout, expiración, revocación o desactivación deben impedir operaciones futuras.
- Nunca guardar contraseñas en texto plano ni incluirlas en logs, reportes o archivos temporales.
- Ninguna migración masiva se ejecuta sin dry-run, conteos, detección de duplicados, idempotencia y plan de recuperación.
- No desplegar Apps Script ni modificar Spreadsheet/Drive productivos sin autorización expresa.
- Ningún control web/PWA se describirá como prevención absoluta de capturas, extracción de recursos o fotografía externa.

## Continuidad inmediata

P0–P6 tienen implementaciones y verificaciones locales completadas; los estados se cierran como COMPLETADA CON VALIDACIÓN DIFERIDA cuando dependen de Apps Script, Spreadsheet/Drive o dispositivos reales. P2 conserva pendiente Beta para calibrar PBKDF2 y reconciliar datos; Relay solo admite congelar fórmulas hasta confirmar el formato de IDs faltantes. La verificación integral CI/Pages está aprobada. Siguiente tarea de la nueva etapa: GP-IMG-UX-01.


## Evidencia adicional de P0 — revisión de permisos y contratos (2026-11-14)

- El usuario confirmó `Jefe` como único valor oficial. Los servicios AUTH, USERS, ADMIN, FEEDBACK y WRITE, así como el frontend, ya usan `jefe` como valor operativo; solo conservan una conversión temporal para leer registros heredados `Gefe`. La actualización de los datos y de la lista desplegable de Spreadsheet queda pendiente de acceso a la hoja.
- `Services/feedback.js` valida token/usuario para acciones Inbox; las acciones de bandeja están registradas con lista de roles permitidos `null`, lo que permite a cualquier rol activo con sesión acceder a Inbox. Las acciones administrativas de feedback/video sí tienen listas explícitas.
- `JS/Frontend/ui.js`: el botón de compartir del modal se crea para todos; el botón de imprimir también se crea para todos; el modo de edición del modal actualmente se habilita solo cuando el rol es `desarrollador`. La UI no coincide con el permiso solicitado para imprimir/editar de Supervisor, Jefe y Desarrollador.
- `Services/write.js`: el registro de cortes ya obtiene opciones desde la hoja Relay y asigna IDs numéricos de vehículo en backend. Las acciones de mantenimiento de IDs de vehículo están restringidas a Desarrollador.
- `Services/feedback.js`: tutoriales reciben IDs `tut-` vinculados a operationId y Problemas reciben IDs secuenciales `isue-`; la revisión de las hojas/fórmulas de Relay y de registros históricos aún está pendiente.
- El flujo de login ya realiza conversión oportunista de texto plano a hash tras verificar correctamente la contraseña. Por tanto, la función ausente que reporta el usuario parece ser la migración administrativa explícita/batch y el cierre verificable del proceso, no la conversión al login.

### Criterios de diseño que quedan fijados para paquetes posteriores
- Una solicitud de negocio protegida debe autenticar token y rol dentro de su propio backend; eliminar la llamada previa separada `touchSession` no significa confiar en el navegador ni permitir acciones sin autorización.
- La validación de token debe actualizar la actividad dentro de la misma operación cuando corresponda, respetando las ventanas de expiración y evitando un viaje adicional.
- En el modal, compartir permanece permitido a todos; Supervisor, Jefe y Desarrollador tendrán además imprimir y editar detalles. La matriz definitiva debe aplicarse también en backend.


## Aclaración de permisos confirmada por el usuario — 2026-11-14

La acción del **botón integrado de compartir** en el modal es pública para todos los roles, incluidos `Tecnico` y `tecnico_exterior`. No debe confundirse con las acciones administrativas del modal.

- Todos los roles autenticados: pueden utilizar el botón integrado de compartir.
- Roles superiores a Técnico y Técnico Exterior: pueden además imprimir y editar detalles desde el modal.
- Roles privilegiados expresamente contemplados: Supervisor, Jefe y Desarrollador.
- `Tecnico` y `tecnico_exterior` no pueden imprimir ni editar detalles desde el modal.
- La matriz debe aplicarse tanto en la interfaz como en el backend cuando una acción tenga endpoint; ocultar botones no es control de seguridad.


## Nueva etapa de UX — panel Developer, biblioteca de imágenes y ayudas contextuales (2026-11-14)

**Estado: EN PROGRESO.** Las implementaciones locales P0–P6 están completadas; sus validaciones de campo, Apps Script y Drive permanecen diferidas a Beta conforme a `NORMAS_DESAROLLO.md` y la verificación integral quedó aprobada.

### GP-DEV-UX-01 — Organización del panel de desarrollador
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A REVISIÓN VISUAL EN BETA.**
- [x] Unificar Respaldos y Base de datos en una sola pestaña; retirar la pestaña secundaria redundante.
- [x] Armonizar el botón **Migrar esquema** y el selector de retención de logs a 38 px, con alineación y adaptación móvil.
- [x] Simplificar textos, botones y agrupaciones del panel sin retirar advertencias de alcance.
- [x] Mantener confirmaciones destructivas y estados de progreso/resultado.

### GP-IMG-UX-01 — Biblioteca de imágenes reemplazadas
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A REVISIÓN VISUAL EN BETA.**
- [x] Sustituir la interfaz desproporcionada por un modal tipo biblioteca/Drive, con superficie despejada y tarjetas compactas.
- [x] Implementar vistas de cuadrícula y lista conmutables mediante iconos compactos con etiquetas accesibles.
- [x] En cuadrícula, usar miniaturas medianas 4:3 con altura limitada y uniforme.
- [x] En lista, usar miniaturas de 60 px (52 px en móvil) y metadatos alineados.
- [x] Permitir selección individual, selección de elementos visibles y acciones por lote con resultados parciales.
- [x] Incorporar menú contextual de tres puntos con acciones según estado; mover/restaurar/papelera por lote. Descarga limitada a Desarrollador.
- [x] Cubrir estados de carga, error, vacío, selección, confirmación y resultado; estilos responsive para móvil/escritorio.
- [x] Resolver la excepción: Descargar solo está disponible en la biblioteca del panel Desarrollador, con rol Desarrollador y referencias verificadas; no habilita descarga general.
- [x] Verificar selección y acciones por ID, confirmaciones, revalidación backend de referencias y ausencia de eliminación definitiva masiva.

### GP-IMG-DATA-01 — Conciliación Drive de cortes ↔ Spreadsheet
- [x] Implementar planner puro de conciliación por nombre canónico exacto, con destinos derivados de IDs de vehículo únicos y las ocho columnas de imagen de Cortes. La planificación no escribe datos.
- [x] Cubrir coincidencias, ya vinculadas, archivos huérfanos, referencias externas, nombres duplicados, destinos ambiguos/ocupados, MIME/IDs inválidos y deduplicación (CortesImageReconciliation: 15/15 PASS; CortesImageReconciliationUI: 9/9 PASS; CI: 91 suites / 1,336 pruebas / 0 fallos.).
- [x] Incorporar endpoint/flujo de preview conectado a la auditoría recursiva reanudable de Drive; mostrar resultados en una lista diferenciada.
- [x] Identificar y mostrar las imágenes sin correspondencia con destinos canónicos de Cortes, separadas de las referencias externas y del historial.
- [x] Generar URL pública propuesta para cada coincidencia exacta con acceso público ya verificado; el reporte identifica ID, vehículo, fila y campo destino.
- [x] Aplicar únicamente propuestas aprobadas por fila en las celdas correspondientes; ADMIN vuelve a generar el preview, valida digest/destino/ID de vehículo/celda vacía, escribe y verifica por read-back, registra cada asignación, compara conteos y ejecuta rollback condicionado a la URL actual ante fallo. La UI requiere selección individual y confirmación explícita. Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA; no se ejecutó contra Spreadsheet/Drive productivos.
- [x] Implementar modo dry-run y reporte diferenciado de coincidencias, duplicados, imágenes sin correspondencia y filas ambiguas; nunca asignar por similitud débil ni sobrescribir una URL existente.
- [x] Persistir el manifiesto/digest y el progreso del preview para reanudar desde el último lote confirmado tras una interrupción; estado aislado por cuenta/auditoría, firma de ID/nombre/MIME y revisión CAS. El reporte se restaura al reabrir; el reporte completo se revalida al actualizar y los lotes parciales se reanudan sin duplicarlos. Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. CI final del paquete: 92 suites / 1,346 pruebas / 0 fallos; Pages PASS (2026-11-14).
- [x] Persistir metadatos completos (ID, nombre y MIME) junto con cada página del inventario Drive; al aplicar, cotejar el inventario con los IDs procesados y rechazar metadatos faltantes, archivos modificados o nombres canónicos duplicados en el árbol auditado.
- [x] Habilitar la aplicación solo mediante capability handshake de ADMIN para auditoría completa, reciente, de la sesión y versión actuales; los reportes restaurados desde IndexedDB no conservan autorización de escritura.
- [x] Pruebas dirigidas revisadas en harness V8: planner 19/19, aplicación 8/8, UI 13/13 y metadatos 5/5 PASS. La ejecución Node CLI completa y CI del HEAD posterior requieren verificación adicional; no se atribuyen los resultados CI del HEAD anterior a estos commits.
- [ ] La escritura real en Drive/Spreadsheet productivos y la ejecución de migraciones requieren autorización expresa; no forman parte del registro documental actual.

### GP-UX-INFO-01 — Textos concisos y ayuda contextual
- [x] Revisar textos de Developer y formularios; se retiraron explicaciones redundantes y se conservaron etiquetas breves, claras y orientadas a la acción.
- [x] Cuando una explicación sea útil pero no deba permanecer visible, utilizar un icono ⓘ discreto que abra una burbuja contextual al pulsarlo.
- [x] Evitar que los botones expliquen su propia función con frases largas; se acortaron las etiquetas y se conservaron nombres accesibles completos donde aplica.
- [x] Aplicar ayudas ⓘ accesibles en `HTML/add_cortes.html` para año/rango, versión de equipamiento, tipo de corte y configuración del relay.
- [x] Añadir ayudas contextuales en los formularios dinámicos de sugerencia de cambio y alta de tutorial; apertura por pulsación, cierre fuera/Escape y foco restaurado.
- [x] Incorporar ayudas ⓘ en los formularios de alta de tutoriales y PYS para explicar el dato solicitado.
- [x] **Excluir expresamente el modal de detalles de vehículos:** no se añadieron iconos ni burbujas en `mostrarDetalleModal`; prueba de exclusión incluida.
- [x] Mantener accesibilidad: nombres accesibles, foco visible, apertura por pulsación, cierre fuera/Escape, `aria-describedby` y texto legible en móvil.

- Validación CI: `ContextualHelpForms` 12/12 PASS; `DeveloperPanelUX` 3/3 PASS; 93 suites / 1,361 pruebas / 0 fallos. GitHub Pages build/deployment PASS (2026-11-14).
### Auditoría de escrituras y arquitectura detectada (2026-11-14)

**Lecturas actuales**
- `Services/catalog.js:getCatalogData` entrega un snapshot completo de Cortes/modelos, categorías, logos, tutoriales y Relay. La escritura a CacheService está deshabilitada por el límite de tamaño; el endpoint vuelve a recorrer las hojas y construir el snapshot.
- `Services/feedback.js:getPysData` entrega PyS por separado como colección completa.
- Los modelos no son una colección/hoja independiente: se representan mediante registros de Cortes y sus relaciones.
- En cliente, `auth.js` renderiza IndexedDB primero, pero la sincronización de red sigue siendo `fetchCatalogData()` completo; `offline.saveCatalog()` reemplaza el snapshot.
- `pys-data.js` usa localStorage con TTL de cinco minutos y descarga la colección completa. No se encontraron temporizadores, listeners de visibilidad/conexión, BroadcastChannel ni endpoint de delta para sesiones abiertas.

**Escrituras que afectan colecciones visibles**
- **WRITE / Cortes-modelos:** `addOrUpdateCut`, `addSupplementaryInfo`, `addVinToVehicle` y `freezeCortesIds` (este último puede cambiar IDs estables). `allocateVehicleId` reserva un ID, pero por sí solo no publica un registro.
- **FEEDBACK / Cortes-modelos:** `recordLike` actualiza contadores de utilidad; `suggestYear` puede cambiar el rango de años de Cortes cuando la sugerencia se aplica.
- **FEEDBACK / PyS:** `addProblem`, `addSolution`, `addPrevention`, `addVehicleToProblem`, `removeVehicleFromProblem` y `updatePysItem`.
- **FEEDBACK / Tutoriales:** `addTutorial`, `updateTutorialItem` y las acciones de aprobación/rechazo de vídeo cuando el destino es un tutorial.
- **FEEDBACK / Cortes, PyS o Tutoriales:** la publicación/retiro de vídeo aprobado o rechazado puede modificar la fila de destino según el tipo de contenido.
- **ADMIN / Logos:** `addLogo`.
- **ADMIN / Cortes-imágenes y metadatos:** `updateVehicleField`, `uploadAdminImage`, `normalizeImages`, `organizePrimaryVehicleImages`, `applyCortesImageReconciliation`, `recoverReplacedImage`, y operaciones de reemplazo/movimiento que cambian referencias o metadatos vinculados a Cortes.
- **ADMIN / mantenimiento masivo:** restauración de base de datos, migración/reversión de identificadores, reconciliación de cargas pendientes y reorganización pueden afectar muchas filas; deben publicar un evento de reinicio/reconciliación de colección, no miles de eventos individuales.
- Relay no tiene una ruta de escritura de catálogo identificada en los servicios actuales; Logos sí tiene una ruta explícita. Las operaciones de reportes, sugerencias no aplicadas, mensajes de contacto y borrado de reportes modifican Feedback, no el catálogo. No se encontró una ruta normal para borrar un registro PyS/tutorial/Corte; el feed debe admitir tombstones para futuras bajas y restauraciones.

**Diseño de feed propuesto**
- Hoja interna oculta `CatalogChanges` en el Spreadsheet compartido, con eventos versionados: revisión monotónica, colección, ID estable, operación (`upsert`, `delete`, `reset`), snapshot JSON validado y fecha.
- Añadir el recurso compartido `CATALOG_CHANGES` a las leases de Coordinador de todos los escritores que afecten el catálogo; así las revisiones se asignan sin colisiones entre WRITE, FEEDBACK y ADMIN.
- Publicar el evento solo después de verificar la persistencia del registro. Para operaciones masivas/restauraciones se emite `reset` y el cliente solicita un snapshot completo controlado.
- Endpoint incremental autenticado mediante sesión FEEDBACK, paginado por cursor y con detección de cursor vencido/futuro; retención acotada. PyS y catálogo compartirían la revisión, aunque el cliente los aplique a sus almacenes respectivos.
- Bootstrap sin pérdida: obtener cursor base antes de leer snapshots completos y después aplicar el delta desde ese cursor; las duplicaciones son idempotentes y las escrituras concurrentes no se pierden.
- Todo el proceso permanece interno y silencioso; no se añade interfaz de novedades, botón, panel ni indicador visible.

### Criterios de aceptación
- Developer presenta Respaldo y Base de datos en la misma pestaña; controles de migración y limpieza tienen tamaños proporcionados y consistentes.
- [x] La biblioteca de imágenes ofrece cuadrícula/lista, miniaturas dimensionadas según la vista, selección múltiple y menú contextual de tres puntos con acciones coherentes y autorizadas.
- La conciliación Drive–Spreadsheet distingue coincidencias exactas, faltantes, duplicados y ambiguos; no escribe datos productivos sin autorización.
- Las URLs migradas se guardan en el campo correcto y son la fuente de visualización de la imagen, una vez aprobada y ejecutada la migración.
- Los textos de interfaz son breves; las explicaciones secundarias se consultan mediante ⓘ donde se solicitó.
- No aparece ⓘ en el modal de detalles; sí aparece en campos pertinentes de add_cortes y formularios PYS.
- [x] La descarga en el administrador de imágenes queda limitada al panel Developer y al rol Desarrollador; no modifica la prohibición general de descarga.
- [x] Pruebas locales cubren diseño responsive, selección simple/múltiple, acciones contextuales, permisos, conciliación idempotente y ayudas contextuales. Las pruebas con Drive/Spreadsheet reales se documentan como validación Beta.

- [x] P1 fase 2 parcial: actualizar `LastActivityAt` dentro de operaciones FEEDBACK autenticadas, incluidas lecturas, con lease compartida frente a logout/revocación. Validación CI: 75 suites, 1,159 pruebas, 0 fallos (2026-11-14).
- [x] Extender touch integrado y coordinación a WRITE, USERS y ADMIN; todas las acciones protegidas actualizan actividad dentro de su operación y usan leases compartidas. Las rutas públicas de catálogo/formulario permanecen explícitamente públicas.
- [x] Verificar leases anidadas ADMIN→WRITE: `addOrUpdateCut`→`allocateVehicleId` y `reorganizeDatabase`→`freezeCortesIds`; las políticas del coordinador restringen cada acción anidada.
- [x] Añadir regresión `SessionActivityCoordination.mjs` (6/6 PASS) y pruebas de mantenimiento exclusivo para `migrateIdentifiers`/`rollbackIdentifiers`.


- [x] Liberar el bloqueo global al cerrar la vista durante auditoría u organización; conservar persistencia/UI solo cuando la sesión siga vigente.


## Continuidad y verificación integral — 2026-11-14

- La etapa GP-DEV-UX-01, GP-IMG-UX-01, GP-IMG-DATA-01 y GP-UX-INFO-01 ya cuenta con implementación local y pruebas dirigidas. La referencia anterior que señalaba GP-IMG-UX-01 como siguiente tarea quedó superada.
- Conforme a la sección 11 de `NORMAS_DESAROLLO.md`, la siguiente actividad local es la verificación técnica integral del conjunto; no se incorporan nuevas funcionalidades mientras esta verificación no concluya.
- HEAD confirmado antes de esta actualización: `d4b481e856fe3ec539d499f66639e09420b8b0c5` en `GPSpedia2.2.5_work`. La rama base `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- El workflow `.github/workflows/service-tests.yml` ejecuta Node.js 22, comprobación de sintaxis de módulos principales y `JS/Tests/RunServiceTests.mjs` (servicios WRITE, ADMIN, FEEDBACK, CATALOG, UTILITIES, AUTH, USERS e integración).
- Esta actualización documental se utiliza para activar la verificación automatizada en la rama autorizada. El resultado de CI se registrará solo después de consultarlo en GitHub Actions.
- Las validaciones con navegador/dispositivo real, Apps Script, OAuth, Drive y Spreadsheet continúan siendo validaciones Beta y no bloquean el cierre local.


## Protocolo consolidado de validación Beta — 2026-11-14

Antes de ejecutar **cualquier** prueba Beta, desde la raíz del clon local:

```bash
set -euo pipefail
test "$(basename "$(git rev-parse --show-toplevel)")" = "GPSpedia"
test "$(git branch --show-current)" = "GPSpedia2.2.5_work"
test -z "$(git status --porcelain)" || { echo "Hay cambios locales; detener sin descartarlos."; exit 1; }
git remote get-url origin | grep -Eq 'infogpstech/GPSpedia(\.git)?$'
git fetch origin GPSpedia2.2.5_work
git pull --ff-only origin GPSpedia2.2.5_work
test "$(git branch --show-current)" = "GPSpedia2.2.5_work"
git rev-parse HEAD
```

Si cualquier comprobación falla, no continuar ni descartar cambios locales. Confirmar que el HEAD obtenido coincide con el commit que se desea validar.

### P1 — Sesión y autenticación
- Iniciar sesión una vez y recorrer catálogo, fichas, modales y páginas secundarias; verificar que la navegación normal no solicita credenciales nuevamente.
- Recargar, abrir/cerrar modales y navegar atrás/adelante; comprobar restauración de sesión y rol.
- Abrir dos pestañas; cerrar sesión o revocar en una y verificar que la otra no pueda ejecutar operaciones protegidas después de actualizar su estado.
- Probar pérdida de red, modo offline y reconexión; un fallo de red no debe provocar logout falso y ninguna caché local debe autorizar acciones protegidas.

### P2 — Contraseñas e identificadores
- En deployment AUTH de Beta, ejecutar el benchmark `benchmarkPasswordKdf` con sesión Desarrollador, registrar tres mediciones y usar la mediana. No cambiar el coste hasta revisar margen de ejecución.
- En copia Beta aislada, ejecutar primero `auditIdentifiers` y dry-run de migración; comparar conteos, duplicados, fórmulas, referencias y manifiesto. No ejecutar migración productiva.
- Confirmar con el responsable de datos el formato de ID Relay antes de proponer o completar IDs ausentes.
- Solo en copia Beta y con autorización específica, ejecutar lotes de prueba, interrumpir/reanudar y verificar read-back, idempotencia y rollback condicionado a huellas. Comparar referencias de usuarios, vehículos, tutoriales, relays y aprobaciones antes/después.

### P3 — Inbox y accesibilidad
- En navegadores de escritorio y móvil, revisar tema claro/oscuro, teclado, foco visible, lector de pantalla, navegación Atrás, lista/detalle, búsqueda, filtros, paginación y estados de carga/error.
- Verificar que lectura, respuesta, archivado y categorías conservan permisos y estado tras recarga y cambio de dispositivo.

### P4 — ACL de imágenes y permisos
- En Drive Beta, inspeccionar ACL de carpetas y archivos de Cortes, Tutorial, PyS y LogosMarca; clasificar cuáles deben ser públicos por diseño y cuáles privados.
- Comparar permisos reales con los contratos de lectura/descarga. No cambiar ACL durante la auditoría; cualquier corrección debe tener alcance y aprobación propios.
- Verificar con solicitudes HTTP de roles permitidos/no permitidos que el backend rechaza las operaciones privilegiadas de forma efectiva.

### GP-IMG-DATA-01 — Conciliación y aplicación controlada
- En una copia Beta de Drive y Spreadsheet, completar auditoría recursiva, confirmar metadatos y capability handshake, generar preview y revisar coincidencias, huérfanos, duplicados y destinos ambiguos.
- Aprobar una o pocas asignaciones de prueba; verificar precondiciones, conteos, read-back y auditoría. Provocar un fallo controlado solo si existe una copia desechable y verificar que el rollback no sobrescribe cambios externos.
- No mover, eliminar ni modificar archivos/hojas productivos. La escritura productiva requiere autorización expresa e independiente.

### P6 — Regresión de campo y PWA
- Ejecutar pruebas de Inbox en escritorio/móvil y verificar rendimiento de carga, caché, thumbnails, instalación PWA, offline, reconexión y recuperación después de suspensión.
- Revisar navegación, historial, modales, actualización del service worker y consistencia entre pestañas/dispositivos.
- Registrar dispositivo, sistema operativo, navegador, versión de deployment, fecha, pasos, resultado y evidencia reproducible.

**Criterio de registro:** documentar cada prueba como PASS, FAIL o NO EJECUTADA; adjuntar evidencia mínima y separar fallos locales de limitaciones de entorno. Ninguna validación Beta autoriza por sí sola operaciones productivas.

## Incidencias ADMIN/Developer — estado tras corrección local (2026-11-14)

- [x] AUD-2026-11-14-01: registrar política explícita de migrateReplacedImagesSchema limitada a IMAGE_INVENTORY; mantener autenticación Desarrollador, ScriptLock y deny-by-default.
- [x] AUD-2026-11-14-02: permitir leases ADMIN concurrentes con actualización cooperativa de ACTIVE_SESSIONS; conservar conflicto con escrituras de identidad/sesión y mutaciones AUTH.
- [x] Añadir regresiones de política mínima, coexistencia de consultas ADMIN, bloqueo de logout mientras ADMIN mantiene lease y liberación posterior.
- [x] Actualizar el contrato de InboxConversations.mjs por el nuevo campo sharedWriteResources.
- Evidencia CI del HEAD ca6bf55564308d13b68d5554f6b62d098a963855: run 43624818215 SUCCESS, 93 suites / 1,366 pruebas / 0 fallos; sintaxis PASS. Pages run 43624817783 build/deployment SUCCESS.
- [x] AUD-2026-11-14-03 — corrección local: retirar revalidación AUTH redundante al abrir paneles; usar el rol ya autenticado en el contexto de sesión. Regresión añadida para impedir validateActiveSession/routeAction desde el helper de apertura.
- Evidencia CI HEAD `2a423e67ff87e32e3c86ab71899b83cf1fe2e7b3`: run `43626278768` SUCCESS, 93 suites / 1,366 pruebas / 0 fallos; sintaxis PASS. Pages run `43626278368` SUCCESS.
- [ ] Validación Beta: comprobar apertura de paneles Developer desde sesión recién iniciada y restaurada, sin petición AUTH adicional; verificar que acciones protegidas siguen autorizándose en backend.
- [ ] Validar escáner e inicialización de historial en deployment ADMIN Beta conectado a copia aislada de Spreadsheet/Drive; no ejecutar sobre datos productivos.

## Aviso obligatorio y aceptación por dispositivo — 2026-11-14

- [x] Corregir el conflicto entre `AUTH/acceptTerms` y `ADMIN/sessionActivity` sin eliminar la actualización protegida de actividad ni permitir que login/logout se solapen con escrituras de sesión.
- [x] Recordar la aceptación por usuario, dispositivo/perfil de navegador y versión del aviso; conservarla después de cerrar sesión y volver a iniciar sesión.
- [x] Mantener una aceptación independiente cuando el usuario accede desde otro dispositivo/perfil.
- [x] Preservar el registro histórico anterior de `Users.TermsAcceptance` sin aplicarlo automáticamente a dispositivos nuevos.
- [x] Añadir regresiones de concurrencia, persistencia local y accesibilidad del aviso.
- [x] Validación local: SharedMutationCoordinator 41/41; TermsModalAccessibility 12/12; simulación aislada del handler AUTH y parsing/sintaxis PASS.
- [ ] Validación Beta: aceptar, cerrar sesión y volver a entrar en el mismo navegador sin volver a mostrar el aviso.
- [ ] Validación Beta: iniciar sesión desde un navegador/perfil nuevo y confirmar que el aviso aparece una vez; volver a abrir la plataforma y confirmar que no reaparece.
- [ ] Desplegar `Services/Auth.js` y `Services/Coordinator.js` únicamente en el entorno Beta autorizado y verificar la aceptación con `ADMIN/sessionActivity` concurrente.
- [ ] Confirmar que sesión inválida, expirada o con revocación pendiente continúa sin poder aceptar ni acceder al catálogo.

**Nota de alcance:** el identificador se conserva en el almacenamiento local del origen y perfil de navegador. Borrar los datos del sitio o utilizar otro navegador/perfil genera una identidad local nueva; no se realiza identificación física ni fingerprinting del dispositivo.


### Refinamiento adicional — validación de sesión al aceptar el aviso

- [x] Confirmar que el preflight de acceptTerms usa validación de solo lectura y no renueva LastActivityAt.
- [x] Conservar validateAndTouchSession_ para las demás mutaciones autenticadas.
- [x] Probar que acceptTerms usa el preflight read-only y logout mantiene la ruta normal; PASS.
- [x] Repetir SharedMutationCoordinator 41/41 y TermsModalAccessibility 12/12; PASS.


## Incidencias nuevas reportadas por el usuario — 2026-11-14

**Estado general: PENDIENTE DE REVISIÓN Y REPRODUCCIÓN.** Los puntos siguientes son síntomas reportados por el usuario; todavía no se ha confirmado su causa técnica ni se ha modificado código para corregirlos.

### GP-UX-02 — Saludo, reacciones y tarjetas de contenido
- [ ] **Mensaje de saludo:** no carga correctamente al abrir la plataforma. Revisar su ciclo de carga, datos requeridos, estado de sesión y manejo de errores.
- [ ] **Reacción útil 👍🏿:** al pulsar el botón aparece «No se pudo registrar tu reacción. Reintentar». Revisar contrato del endpoint, permisos del rol, payload, coordinador compartido, persistencia e idempotencia para evitar reacciones duplicadas.
- [ ] **Tarjeta de agregar tutorial:** no aparece en la sección Tutorial. Revisar condiciones de renderizado, permisos, estado vacío, filtros y rol que debe verla.
- [ ] **Tarjeta de agregar problema:** en el carrusel de problemas relacionados del modal de detalle tiene una altura distinta a las tarjetas de problemas. Igualar estructura, altura y comportamiento responsive sin alterar el contenido de las tarjetas existentes.

### GP-UX-03 — Inbox, principalmente en móvil
- [ ] Reorganizar la interfaz móvil: distribución, jerarquía visual, lista/detalle, navegación y controles táctiles.
- [ ] Sustituir las acciones presentadas como textos o controles dispersos por una barra de herramientas/menú de acciones coherente con una bandeja de entrada.
- [ ] Incluir y ordenar las acciones esperadas: nuevo mensaje/conversación, borrar y demás acciones disponibles según tipo de elemento y permisos (por ejemplo, leer/no leer, archivar y responder cuando correspondan).
- [ ] Mantener consistencia entre escritorio y móvil, accesibilidad, confirmaciones para acciones destructivas y actualización correcta del estado de la bandeja.
- [ ] No inventar operaciones que el backend no soporte; revisar primero los contratos y capacidades reales.

### GP-RBAC-02 — Inbox para usuarios técnicos
- [ ] **Síntoma:** al entrar o utilizar Inbox con un usuario técnico aparece «servicio no autorizado para el coordinador compartido» y no se dispone de funciones.
- [ ] Revisar política del coordinador, acciones compartidas, matriz de permisos, rol efectivo y autorización backend de cada operación.
- [ ] Definir las funciones que corresponden al usuario técnico y permitir únicamente esas acciones. No resolverlo ampliando permisos generales ni debilitando la autorización de servidor.
- [ ] Añadir pruebas de contrato y regresión para usuarios técnicos y para roles que no deben acceder a funciones privilegiadas.

### GP-PWA-01 — Actualización y recarga de la plataforma
- [ ] **Síntoma:** la plataforma impide la actualización y no permite recargar la página.
- [ ] Revisar el ciclo de vida del Service Worker, caché, detección de nueva versión, clientes controlados, mensajes de actualización y cualquier bloqueo/intercepción de navegación o recarga.
- [ ] Permitir que el usuario recargue la plataforma y completar actualizaciones de forma predecible, sin dejar la aplicación atrapada en una versión ni perder datos locales pendientes.
- [ ] Probar actualización con una y varias pestañas, instalación PWA, recarga manual, offline/reconexión y recuperación ante una actualización interrumpida.

### GP-SEC-03 — Mitigación de capturas de pantalla en móviles
- [ ] Revisar qué medidas reales pueden aplicarse en navegadores móviles y PWA para dificultar capturas de pantalla o grabación.
- [ ] Distinguir capacidades de Android/iOS y navegadores; documentar las limitaciones de una aplicación web y no prometer bloqueo absoluto cuando la plataforma no lo permita.
- [ ] Evaluar medidas complementarias proporcionales (por ejemplo, ocultar o proteger contenido sensible en cambios de visibilidad si resulta viable), sin degradar la lectura normal ni presentar como bloqueo una simple barrera visual.
- [ ] Validar en dispositivos móviles reales durante Beta; no afirmar protección efectiva basándose únicamente en inspección estática.

**Criterio de trabajo:** registrar primero reproducción, archivos/contratos implicados, rol afectado y evidencia. Resolver por paquetes pequeños con pruebas de regresión; preservar las funciones existentes y la autorización backend. Estas incidencias nuevas no se consideran corregidas ni probadas por el mero hecho de registrarlas.


## Adenda de diagnóstico e implementación — incidencias del 2026-11-14

### GP-AUTH-03 — Aceptación del aviso obligatorio bloqueada
**Estado: PENDIENTE DE VALIDACIÓN BETA.**

- Síntoma reportado: al aceptar el aviso, la aplicación no continúa y muestra que el recurso está ocupado por operaciones activas `ADMIN/sessionActivity`.
- Revisión de la rama: `Services/Coordinator.js` versión 1.1.3 declara `AUTH/acceptTerms` con lectura de `ACTIVE_SESSIONS`, escritura de `USERS` y escritura cooperativa de `ACTIVE_SESSIONS`; `Services/Auth.js` usa preflight de solo lectura para aceptar términos y vuelve a validar token/identidad antes de persistir.
- El frontend mantiene aceptación por usuario, perfil/dispositivo y versión. Cerrar sesión y volver a entrar en el mismo perfil conserva la aceptación; un navegador/perfil distinto genera un identificador independiente. Borrar los datos del sitio equivale a crear una identidad local nueva.
- No se pudo consultar el deployment Apps Script desde esta sesión. El mensaje de recurso ocupado no se reprodujo en las pruebas aisladas; debe verificarse que el coordinador desplegado y AUTH contienen la política y el cliente de la rama actual. No se da por corregido el deployment.
- Validación Beta requerida: mismo perfil acepta/cierra sesión/vuelve a entrar sin repetir aviso; perfil nuevo ve el aviso una vez; probar aceptación concurrente con `ADMIN/sessionActivity`; comprobar sesión inválida/revocada.

### GP-UX-02 — Adenda de saludo y reacción útil
- **Saludo — corrección local:** se confirmó que `showApp()` terminaba antes de renderizar saludo y controles de rol cuando el aviso estaba pendiente. El handler de aceptación cerraba el modal y cargaba el catálogo, pero no reanudaba el renderizado completo. Ahora vuelve a ejecutar `showApp(user)` después de persistir la aceptación y antes de cargar el catálogo. Validación CI: 94 suites / 1,388 pruebas / 0 fallos (run 43629775820).
- **Reacción útil — corrección local:** `assertFeedbackSession()` actualiza `ActiveSessions.LastActivityAt`, pero la política `FEEDBACK/recordLike` no reservaba `ACTIVE_SESSIONS`. La política ahora reserva `ACTIVE_SESSIONS`, `CORTES`, `FEEDBACK` y `ACTIVITY`; la prueba confirma el conflicto controlado con `ADMIN/sessionActivity`. Validación CI: 94 suites / 1,388 pruebas / 0 fallos (run 43629775820).
- **Tarjeta Agregar Tutorial:** la interfaz la muestra únicamente al rol Desarrollador y el backend también reserva `addTutorial` a ese rol. No se ampliarán permisos para hacerla visible a técnicos. Si sigue ausente en una sesión Desarrollador, reproducir y revisar contexto de sesión/renderizado.
- **Tarjeta Agregar Problema:** el código asigna 120 px a la tarjeta de alta y el CSS fija 120 px a `.card-create-pys-assoc`; falta comparar el tamaño renderizado frente a las tarjetas reales en navegador móvil/escritorio. No se marca corregido solo por la igualdad de valores declarados.

### GP-RBAC-02 — Inbox para usuarios técnicos
**Estado: PENDIENTE DE VALIDACIÓN DE CONFIGURACIÓN BETA.**

- El contrato backend incluye `tecnico` y `tecnico_exterior` entre los roles activos de Inbox; las acciones de conversaciones no exigen un rol privilegiado adicional.
- El texto «Servicio no autorizado para el coordinador compartido» se genera al autenticar el servicio FEEDBACK cuando el servicio no está permitido o su secreto está ausente/no coincide. No es el mensaje de rechazo de RBAC del usuario.
- Revisar en FEEDBACK `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET`; el secreto debe coincidir con `GPSpedia_COORDINATOR_SECRET_FEEDBACK` del coordinador del mismo entorno. Confirmar también que el deployment contiene `SharedMutationClient.js` y las políticas vigentes. No ampliar roles ni debilitar autorización para ocultar un error de configuración.
- Prueba Beta requerida: lectura y conversación directa con Técnico/Técnico_exterior, y rechazo de acciones privilegiadas para roles no autorizados.

### GP-PWA-01 — Recarga y actualización
**Estado: EN PROGRESO — diagnóstico estático parcial.**

- El Service Worker versionado actual es `gpsepedia-cache-v26`; su instalación usa `skipWaiting()`, activación usa `clients.claim()` y navegación intenta red antes de fallback de caché.
- No se encontró un listener global que cancele F5/Ctrl+R ni una intercepción de `beforeunload`. El gesto pull-to-refresh de `main.js` actualiza el catálogo sin recargar el documento; por ello no constituye una recarga completa de la PWA.
- Falta implementar y probar un mecanismo explícito y seguro de recarga/actualización para usuarios de PWA, preservando borradores y operaciones locales pendientes. Probar múltiples pestañas, actualización de Service Worker, offline/reconexión y recarga manual.

### GP-SEC-03 — Capturas de pantalla en móviles
**Estado: EVALUACIÓN TÉCNICA LOCAL PARCIAL; PRUEBAS BETA PENDIENTES.**

- `clientInteractionPolicy.js` aplica restricciones disuasorias sobre menú contextual, copia/selección y arrastre de medios protegidos.
- La documentación del proyecto ya establece que navegador/PWA no dispone de una API web interoperable para bloquear capturas nativas ni aplicar Android `FLAG_SECURE`; no se prometerá bloqueo absoluto.
- Evaluar únicamente mitigaciones que aporten protección real y no oculten contenido durante la lectura normal. Validar comportamiento en Android/iOS reales y registrar expresamente qué medidas son disuasorias y cuáles no están disponibles.


## Adenda de implementación — Inbox móvil y recarga PWA (2026-11-14)

### GP-UX-03 — Bandeja de entrada móvil y acciones
**Estado: CORRECCIÓN LOCAL IMPLEMENTADA; VALIDACIÓN VISUAL BETA PENDIENTE.**

- La vista de solicitudes históricas ahora cambia a una sola vista en móvil: lista o detalle, con botón «Volver a solicitudes» para regresar sin apilar ambos paneles.
- Los elementos de la lista admiten foco de teclado y apertura mediante Enter/Espacio.
- El detalle incorpora una barra contextual de acciones accesible: enviar respuesta, marcar como resuelto y borrar, según el tipo de registro y los permisos existentes.
- Las aprobaciones de vídeo ya no muestran «Borrar mensaje» genérico, porque el backend `deleteFeedbackItem` no admite `video_approval`; se conservan Aprobar/Rechazar cuando corresponde.
- Las conversaciones directas conservan las acciones soportadas por backend: nuevo mensaje, enviar, marcar leído y archivar/restaurar. No se ofrece eliminación de conversación directa porque no existe una operación de borrado en el contrato actual.
- Pruebas: `InboxUi` 19/19 PASS; CI run `43630382765`: 94 suites / 1,392 pruebas / 0 fallos. Falta comprobar distribución, scroll, foco, tamaños y acciones en Android/iOS reales.

### GP-PWA-01 — Recarga y actualización explícita
**Estado: CORRECCIÓN LOCAL IMPLEMENTADA; VALIDACIÓN EN DISPOSITIVOS PENDIENTE.**

- Se agregó «Recargar aplicación» al menú lateral. Al activarlo, cierra el menú, consulta `ServiceWorkerRegistration.update()` con espera máxima de 3 segundos y recarga el documento.
- El gesto pull-to-refresh conserva su comportamiento de sincronizar únicamente el catálogo; no se convierte en una recarga que interrumpa operaciones involuntariamente.
- Se incrementó el caché del Service Worker a `gpsepedia-cache-v27`. Se comprobó que los 33 recursos esenciales declarados existen en la rama.
- Pruebas: `SessionStartupNavigation` 13/13 PASS; `PWAStartupScenarios` 13/13 PASS; CI run `43630382765`: 94 suites / 1,392 pruebas / 0 fallos.
- Falta validar en PWA Android/iOS la instalación de v27, actualización desde v26, recarga manual, modo offline y conservación de sesión/borradores.

### GP-SEC-03 — Capturas de pantalla
**Estado: LIMITACIÓN TÉCNICA CONFIRMADA; NO SE PROMETE BLOQUEO WEB.**

- Una PWA en navegador no puede impedir de forma fiable la captura nativa del sistema operativo. `FLAG_SECURE` solo está disponible en una aplicación Android nativa/controlada por el contenedor.
- Las restricciones de menú contextual/copia/arrastre siguen siendo disuasorias para medios, no protección contra screenshots. Cualquier marca de agua u otra disuasión visual requiere evaluación de legibilidad y aprobación antes de incorporarse.


## Adenda de corrección visual PyS — 2026-11-14

### GP-UX-02 — Igualar tarjeta «Agregar Problema» con tarjetas relacionadas
**Estado: CORRECCIÓN LOCAL IMPLEMENTADA; VALIDACIÓN VISUAL BETA PENDIENTE.**

- Causa detectada en la estructura: las tarjetas reales de problema se insertaban dentro de un wrapper `.pys-card-wrapper`, mientras la tarjeta de alta se insertaba directamente en el carrusel. Las reglas flex y el dimensionamiento se aplicaban a elementos distintos.
- Se creó `createPysAssociationAddCard()` y se normalizó el wrapper para ambas tarjetas. En vista individual comparten 140×120 px; en carrusel comparten wrapper de 160 px (140 px de tarjeta + 20 px de separación).
- Se registró `PysModalNavigation.js` en `RunServiceTests.mjs` y se corrigieron sus rutas de importación para que realmente se ejecute en CI.
- Prueba `PysModalNavigation`: 9/9 PASS.
- GitHub Actions run `43630661037`: 95 suites / 1,401 pruebas / 0 fallos.
- Falta comprobar visualmente en el modal real, en viewport móvil y escritorio, que ambas tarjetas tengan la misma altura y que el ancho/espaciado del carrusel no se desplace.

## Adenda — compatibilidad de sesión y tarjeta Agregar Tutorial (2026-11-14)

### GP-UX-02 — Tarjeta «Agregar Tutorial»
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- Causa identificada: AUTH acepta sesiones restauradas con `ID` o `id`, pero `getUiSessionContext_()` solo reconocía `ID`. Una sesión heredada con `id` en minúscula era válida para AUTH, pero no generaba contexto de rol en UI; la condición de la tarjeta quedaba falsa.
- Corrección: `getUiSessionContext_()` usa `user.ID || user.id`. Se conserva la exigencia de `SessionToken` y la normalización de `Privilegios`.
- Seguridad: la tarjeta continúa visible únicamente para Desarrollador; `openAddTutorialModal()` y el backend mantienen sus comprobaciones de rol. No se ampliaron permisos.
- Pruebas AUG-042: `SessionUiRoleInvalidation` 14/14 PASS.
- GitHub Actions run `43630870843`: **SUCCESS**, 95 suites / 1,404 pruebas / 0 fallos.
- Pendiente Beta: abrir Tutoriales con una sesión Desarrollador restaurada y comprobar la tarjeta; verificar que Técnico y demás roles no privilegiados no la ven y que el backend rechaza `addTutorial` para ellos.

### GP-UX-02 — Tarjeta «Agregar Problema»
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**

- La estructura de tarjeta relacionada y tarjeta de alta fue normalizada con wrapper/dimensiones compartidos.
- `PysModalNavigation`: 9/9 PASS; CI run `43630661037`: 95 suites / 1,401 pruebas / 0 fallos.
- Pendiente Beta: comprobar dimensiones reales y espaciado en el modal en móvil y escritorio.

### GP-UX-03 / GP-PWA-01
- Se conserva la implementación móvil de Inbox y recarga PWA registrada en la adenda anterior. La validación visual/dispositivos reales y la actualización de la PWA instalada siguen reservadas a Beta.
## Adenda — diagnóstico de Inbox Técnico y coordinador FEEDBACK (2026-11-14)

### GP-RBAC-02 — Inbox para usuarios técnicos
**Estado: IMPLEMENTACIÓN LOCAL DE DIAGNÓSTICO COMPLETADA; VALIDACIÓN DE CONFIGURACIÓN BETA PENDIENTE.**

- Verificado en código: `openInbox()` admite `tecnico` y `tecnico_exterior`; el backend de conversaciones incluye ambos roles en `INBOX_ACTIVE_ROLES_`. La pestaña de solicitudes históricas queda oculta para técnicos; la consulta al Desarrollador es la acción de inicio que se les presenta.
- Verificado en contratos: los destinatarios de un técnico se limitan a usuarios Desarrollador. Las operaciones de conversación mantienen autenticación de usuario, participación y leases del coordinador; no se amplió RBAC.
- El mensaje «Servicio no autorizado para el coordinador compartido» se origina en la autenticación de servicio de Coordinator, antes de evaluar permisos del usuario.
- Se añadió `coordinatorConfigured` al diagnóstico `GET ?debug=true` de FEEDBACK. Solo indica presencia/formato local de URL y secreto y disponibilidad del cliente; no verifica coincidencia con el secreto remoto. El panel Developer conserva esta señal y advierte si falta configuración.
- Pruebas AUG-115: 16/16 PASS. GitHub Actions run `43631181979`: SUCCESS, 95 suites / 1,407 pruebas / 0 fallos.
- Pendiente Beta: comprobar `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET` del proyecto FEEDBACK contra `GPSpedia_COORDINATOR_SECRET_FEEDBACK` del coordinador del mismo entorno; verificar que FEEDBACK tenga `SharedMutationClient.js` vigente y deployment actualizado. Después probar Técnico/Técnico exterior y rechazo de acciones privilegiadas.

**Importante:** no se puede corregir la coincidencia real del secreto desde el repositorio. No se modificaron ScriptProperties, deployments ni datos productivos.
### Preparación de pruebas Beta — AUG-155
- Se añadió `AUG-155` al final de `lista_beta_parte2.txt` para verificar aviso por dispositivo, saludo, reacción útil, permisos y tarjeta Tutorial, dimensiones PyS, Inbox Técnico/Coordinator, Inbox móvil, actualización PWA y límites de captura de pantalla.
- El bloque comienza con comandos seguros de verificación de repositorio/rama, rechazo de árbol sucio, `fetch` y `pull --ff-only`, y muestra el HEAD final, conforme a `NORMAS_DESAROLLO.md`.
- No se ejecutó ninguna prueba Beta ni se modificaron propiedades, deployments o datos externos.


## Adenda — incidencias de acceso Developer y coordinación del historial (2026-11-14)

**Estado general: CORRECCIÓN LOCAL IMPLEMENTADA; VALIDACIÓN COMPLETA Y BETA PENDIENTES.**

### GP-DEV-01 — Acceso al panel Developer
- [x] Unificar la condición de visibilidad del botón con el contexto autenticado requerido para abrir el panel: ID/id, SessionToken y rol desarrollador.
- [x] Mostrar un mensaje explicativo si se intenta abrir el panel sin contexto válido; no ampliar permisos ni realizar una validación AUTH adicional.
- [ ] Reproducir en navegador con login nuevo y sesión restaurada; confirmar apertura del modal y disponibilidad de sus controles.
- [ ] Confirmar que Técnico, Técnico exterior, Supervisor y Jefe no pueden abrir el panel ni invocar acciones ADMIN.

### GP-ADMIN-01 — Escáner e inventario de imágenes
- [x] Separar getReplacedImages, getDriveStorage y getCortesImageFolders de la lease genérica ADMIN/sessionActivity.
- [x] Asignar a auditDriveImagesInCortes una lease propia que conserva actividad de sesión cooperativa y serializa el estado reanudable del escáner.
- [x] Añadir pruebas de concurrencia para lecturas simultáneas, doble escáner y bloqueo de escrituras incompatibles.
- [ ] Validar en Beta con Coordinator y ADMIN actualizados que inventario e historial cargan mientras se ejecuta el escáner, sin error de recurso ocupado.
- [ ] Verificar que el escáner conserva cursor, reintentos idempotentes y recuperación de lotes.

### GP-ADMIN-02 — Inicialización del historial
- [x] Ajustar la política de migrateReplacedImagesSchema: lectura de USERS, escritura cooperativa de ACTIVE_SESSIONS y escritura exclusiva de IMAGE_INVENTORY.
- [x] Conservar la validación de sesión Desarrollador, ScriptLock y verificación de encabezados.
- [ ] Actualizar únicamente los deployments Beta de Coordinator y ADMIN con las versiones compatibles de la rama.
- [ ] Ejecutar «Inicializar historial» en una Spreadsheet Beta desechable y confirmar idempotencia; no ejecutar contra producción.

### Validación local ejecutada de forma aislada
- SharedMutationCoordinator: 42/42 PASS.
- AdminImageScanCoordinatorContract: PASS.
- SessionUiRoleInvalidation: 15/15 PASS.
- No se ejecutó el runner Node.js completo ni GitHub Actions desde esta sesión. No se consultaron ni modificaron Apps Script, ScriptProperties, Spreadsheet, Drive o deployments externos.
- Se añadió AUG-156 a lista_beta_parte2.txt, con preparación segura de repositorio/rama y casos específicos para estos tres problemas.


**Ampliación de pruebas GP-ADMIN-01/02 (2026-11-14):** AdminImageScanCoordinatorContract ahora prueba también el despacho dinámico de doPost con un coordinador simulado: consultas con leases propias, propagación del token del escáner/migración, fallback de acciones heredadas y bypass de lease para ping. Resultado aislado: PASS.


## Adenda — requisitos corregidos de actualización PWA e Inbox (2026-11-14)

**Estado: REQUISITOS REGISTRADOS; IMPLEMENTACIÓN PENDIENTE.** Esta adenda precisa y reemplaza cualquier interpretación anterior que propusiera una recarga manual como solución al gesto nativo.

### GP-PWA-02 — Restaurar actualización nativa del navegador/PWA
**Prioridad: alta.**
**Estado actual: EN PROGRESO.** Se retiraron del código de trabajo el gesto táctil que desviaba el pull-to-refresh, el enlace visible de recarga y su listener. El documento vuelve a usar el scroll raíz; las pruebas de contrato se ajustaron para impedir que reaparezcan estos controles o interceptores. Pendiente ejecutar las suites locales/CI y validar el gesto en navegadores reales durante Beta.
- No debe existir un botón, enlace ni acción de menú «Recargar aplicación» o equivalente. Retirar el control añadido para ese propósito y su listener asociado.
- La plataforma debe poder actualizarse mediante el mecanismo nativo del navegador, incluido el gesto pull-to-refresh cuando el navegador lo ofrece. No interceptar ni sustituir el gesto por una sincronización parcial del catálogo.
- Investigar y corregir la causa raíz en el scroll principal, eventos táctiles, CSS de overscroll/touch-action, navegación y ciclo de vida del Service Worker. La solución debe permitir que la navegación vuelva a solicitar el documento y que el Service Worker detecte/active versiones nuevas sin depender de un botón propio.
- Revisar las políticas de caché de HTML, módulos JS y App Shell para evitar que una actualización nativa muestre una mezcla de versiones. Preservar sesión, borradores y datos locales legítimos; no borrar almacenamiento de usuario para forzar la actualización.
- Añadir pruebas de contrato que aseguren que la aplicación no registra un manejador que consuma el gesto nativo ni ofrece recarga manual, y pruebas del ciclo de actualización del Service Worker. La verificación final del gesto queda reservada a Beta en Android/iOS/escritorio compatibles.

**Evidencia inicial:** JS/Frontend/main.js mantiene un listener touchstart/touchend sobre .container que, al superar 150 px, llama auth.loadInitialData(true) en lugar de dejar actuar al navegador. style.css define .container como contenedor independiente con overflow-y:auto (línea aproximada 89), por lo que el contenido no usa necesariamente el scroll raíz que activa el pull-to-refresh nativo. index.html contiene #side-menu-refresh-link («Recargar aplicación») y main.js ejecuta registration.update() seguido de window.location.reload(). El Service Worker usa networkResponse para navegaciones, pero la interacción entre el contenedor desplazable, el gesto personalizado y la actualización instalada debe validarse antes de atribuir toda la causa a un único factor.

### GP-INBOX-04 — Bandeja de entrada con barra de herramientas y jerarquía de comunicación
**Prioridad: alta.**
**Estado actual: EN PROGRESO.** **GP-INBOX-04A: COMPLETADA CON VALIDACIÓN DIFERIDA.** La matriz se aplica en backend al listar destinatarios y crear conversaciones; la UI reutiliza «Nuevo mensaje» y retira «Consultar al desarrollador». Pruebas aisladas ejecutadas: InboxConversations 30/30 y contrato de roles 17/17 PASS. No se ha confirmado todavía la ejecución del runner Node/CI ni la validación en navegador Beta. GP-INBOX-04B..04D permanecen pendientes. Rediseñar la bandeja como una bandeja de mensajes recibidos, no como un conjunto de botones dispersos. La primera vista será la lista de mensajes recibidos; el detalle se abrirá al seleccionar un mensaje/conversación.

**Barra superior de herramientas:**
- Seleccionar mensajes (selección individual y seleccionar todos los visibles).
- Marcar como no leídos los mensajes/conversaciones seleccionados.
- Borrar los elementos seleccionados, con confirmación y validación de permisos en backend.
- Responder al mensaje/conversación seleccionada.
- Crear un mensaje nuevo cuando el rango lo permita.
- Elegir destinatario mediante selector únicamente para los rangos autorizados; no presentar opciones de destinatarios superiores a quien no tenga permiso.
- Las acciones deben habilitarse/deshabilitarse según selección, estado, carpeta y rol. La selección múltiple no debe provocar que «Responder» se aplique ambiguamente a varios destinatarios.

**Navegación de bandeja:**
- Recibidos como vista inicial.
- No leídos, Enviados y Archivados como vistas/carpetas accesibles desde la barra de navegación de la bandeja.
- Búsqueda y filtros deben permanecer disponibles sin desplazar ni ocultar las acciones principales.
- En móvil, la barra debe ser compacta, accesible y persistente; la lista y el detalle deben conservar navegación lista/detalle sin desorden ni desbordamiento horizontal.

**Jerarquía obligatoria de destinatarios:**
- Técnico y Técnico exterior: solo pueden iniciar mensajes ordinarios dirigidos a un Supervisor autorizado.
- Supervisor: solo puede iniciar mensajes ordinarios dirigidos a un Jefe.
- Jefe: puede seleccionar usuarios de rango inferior conforme a la política que se implemente y valide; no puede usar el mensaje ordinario para eludir el canal de incidencias del Desarrollador.
- Contactar al Desarrollador debe realizarse mediante un ticket/reporte de problema, con categoría, asunto, descripción y seguimiento; no mediante una conversación directa ordinaria.
- El selector de usuario debe mostrar exclusivamente destinatarios permitidos para el actor. La misma matriz debe imponerse en Services/InboxConversations.js y/o el servicio backend correspondiente, no solo ocultarse en la interfaz.
- Validar tanto la creación de conversaciones como respuestas, lectura, archivado y borrado; impedir suplantación, escalamiento de destinatario y acceso a conversaciones ajenas.

**Operaciones y datos:**
- «Marcar como no leídos» debe persistir el estado por destinatario y actualizar contadores/listas.
- «Borrar» debe tener semántica definida y segura (borrado/ocultación para el usuario, sin destruir el historial de otros participantes ni los registros de auditoría).
- «Responder» debe conservar el hilo y dirigirse solo a los participantes autorizados.
- Crear mensaje nuevo debe validar destinatario, rango, categoría, asunto, contenido e idempotencia.
- Mantener borradores, paginación, sincronización, accesibilidad y diseño responsive.
- Incorporar pruebas UI, contrato, backend y anti-regresión para toda la matriz de rangos y operaciones masivas.

**Hallazgos iniciales:** index.html ya presenta Recibidos/No leídos/Enviados/Archivados, pero los botones de acciones globales son limitados y no existe selección múltiple de conversaciones. JS/Frontend/ui.js muestra «Consultar al desarrollador» a cualquier rol no desarrollador y el formulario crea una consulta directa. Services/InboxConversations.js actualmente permite que cualquier rol no desarrollador envíe únicamente a Desarrollador (handleGetInboxRecipients y handleCreateInboxConversation), lo que contradice la jerarquía ahora solicitada. El backend tampoco expone todavía las operaciones masivas de marcar no leído y borrar conversación descritas aquí.

### Orden de ejecución
1. GP-PWA-02: retirar el desvío del gesto y el botón de recarga; corregir scroll raíz/Service Worker y cubrirlo con pruebas.
2. GP-INBOX-04A: definir e implementar la matriz de destinatarios en backend y reflejarla en el selector/UI.
3. GP-INBOX-04B: implementar lista recibidos como pantalla inicial y barra de herramientas con selección, no leído, borrar y responder.
4. GP-INBOX-04C: completar creación de mensajes, canal de ticket al Desarrollador y vistas de bandeja.
5. GP-INBOX-04D: pruebas de permisos por rol, operaciones masivas, móvil, accesibilidad y regresión.

**Restricción posterior de interfaz (2026-11-14):** No añadir botones, paneles, secciones, pestañas ni acciones manuales visibles sin autorización expresa. Las acciones masivas de GP-INBOX-04B que requieran controles nuevos quedan diferidas; continuar solo con correcciones internas y capacidades que puedan integrarse en controles ya existentes.

No marcar como completadas estas tareas hasta ejecutar las pruebas locales pertinentes y registrar por separado las verificaciones Beta. No se autoriza modificar deployments ni datos productivos.


## GP-CAT-01 — Catálogo cache-first con actualización incremental y animada en vivo
**Prioridad: alta. Estado: AUDITORÍA DE ESCRITURAS COMPLETADA; contrato/feed y cliente pendientes.**

### Objetivo de experiencia
- Al abrir la plataforma, mostrar primero y sin demora la última instantánea válida del catálogo guardada localmente (IndexedDB), tanto con conexión como sin ella. La interfaz no debe esperar a descargar todo el catálogo para empezar a ser utilizable.
- En segundo plano, comprobar si hay novedades y obtener únicamente registros nuevos o modificados desde la última versión/cursor conocido. No volver a descargar ni reconstruir todas las colecciones en cada apertura cuando no haya cambios.
- Los cambios publicados por cualquier usuario deben aparecer automáticamente en las sesiones abiertas de los demás usuarios, sin recargar el documento, cerrar la PWA ni salir y volver a entrar.
- Integrar los cambios de forma silenciosa y fluida: los nuevos Cortes, problemas, tutoriales y modelos deben incorporarse al catálogo y a las vistas pertinentes con una animación elegante, breve y no intrusiva. Los cambios de registros existentes deben actualizarse en contexto; las bajas deben retirarse de forma coherente.
- La sincronización debe ser silenciosa y automática. No añadir botones, paneles, secciones de novedades ni indicadores visibles de actualización; no exigir pulsaciones, recargas ni acciones manuales. La animación de entrada de nuevos registros puede ser breve y no intrusiva, sin crear controles nuevos.

### Requisitos funcionales y técnicos
1. **Arranque cache-first:** inicializar IndexedDB, leer el snapshot completo local y renderizarlo inmediatamente. La lectura local no debe esperar a red ni bloquear el hilo principal. Si no hay caché válida, mostrar el estado de carga inicial y solicitar la instantánea completa.
2. **Sincronización incremental:** diseñar un contrato backend de cambios desde un cursor/revisión monotónico (por ejemplo catalogRevision/updatedAt) que devuelva solo altas, modificaciones y bajas de Cortes, problemas, tutoriales y modelos. Debe incluir paginación/continuación si el delta excede el límite de respuesta. La descarga completa queda como bootstrap, recuperación ante cursor vencido/inconsistente y reconciliación controlada, no como rutina de cada apertura.
3. **Publicación de cambios:** toda escritura confirmada que afecte al catálogo debe actualizar una revisión/feed confiable. La actualización solo se anuncia después de confirmar la persistencia del cambio; no mostrar altas optimistas como si fueran definitivas.
4. **Detección mientras la app está abierta:** implementar un mecanismo ligero y autenticado de consulta de novedades (polling adaptativo, por ejemplo al iniciar, al recuperar foco/conexión y con intervalo moderado mientras esté visible) o mecanismo equivalente compatible con el backend. Evitar solicitudes completas repetidas, ráfagas, sondeo cuando la app está oculta y concurrencia innecesaria. Coordinar pestañas para reducir consultas duplicadas y propagar cambios entre ellas.
5. **Aplicación atómica del delta:** validar cursor, esquema, IDs estables y pertenencia de cada colección; aplicar los cambios en una transacción local coherente, persistir el nuevo cursor solo después de confirmar el delta y actualizar el estado de la interfaz sin reemplazos parciales inconsistentes. Si falla, conservar la última instantánea válida y reintentar de forma acotada.
6. **Sincronización entre vistas:** actualizar contadores, categorías, búsquedas, listas, carruseles y datos de detalle abiertos. No cerrar modales, reiniciar scroll, borrar filtros ni perder navegación por la llegada de novedades. Si un usuario está editando un registro, evitar sobrescribir su formulario; reconciliar al terminar.
7. **Integridad de operaciones locales:** no sobrescribir ni descartar operaciones pendientes, borradores, datos offline ni cambios locales no confirmados. Separar los datos del catálogo confirmado de las colas de escritura pendientes.
8. **Animación y accesibilidad:** animar la entrada de tarjetas/registros nuevos con transición breve y suave, sin saltos de layout; respetar prefers-reduced-motion, accesibilidad y rendimiento en móviles modestos. No animar indiscriminadamente todos los elementos en cada sincronización.
9. **Cobertura de entidades:** Cortes, Problemas y Soluciones (PyS), Tutoriales y modelos/catálogos auxiliares que se muestran al usuario. Documentar cuáles comparten el feed y cuáles necesitan revisión/cursor propio.
10. **Seguridad:** autenticar cada consulta; aplicar permisos y visibilidad por rol en servidor; no revelar datos privados ni confiar en el cursor enviado por el cliente para autorizar acceso.
11. **Observabilidad:** registrar última sincronización confirmada, cursor/revisión, duración, tamaño del delta y fallos sin exponer contenido sensible. La UI debe distinguir caché disponible, sincronizando, actualizado y sin conexión.
12. **Pruebas:** arranque con caché y red lenta; caché sin cambios; alta/modificación/baja de cada entidad desde otra sesión; dos o más pestañas; reconexión; cursor expirado; delta paginado; respuesta duplicada/fuera de orden; escritura fallida; edición abierta; operación offline pendiente; permisos; animación reducida; rendimiento móvil. Probar que un registro creado por usuario A aparece en usuario B sin recargar, cerrar ni reabrir.

### Evidencia técnica actual
- JS/Frontend/auth.js ya intenta leer offline.getCatalog() antes de la red y renderiza un snapshot completo válido; sin embargo, salvo una ventana local de 60 segundos (gpsepedia_catalog_last_sync), realiza fetchCatalogData() y valida una instantánea completa al abrir. Si ya hay caché, ejecuta performSilentSync(catalogData), pero la respuesta de red sigue siendo el catálogo completo.
- JS/Frontend/offline.js implementa saveCatalog() como reemplazo del snapshot completo; el comentario del contrato indica que getCatalogData entrega una instantánea completa, no un delta. También existe compareCatalogSnapshots() que detecta altas, modificaciones y bajas de Cortes, y cambios en tutoriales/relay/logos, pero no constituye por sí solo un feed incremental desde backend.
- Por tanto, ya existe una base de cache-first y reconciliación visual silenciosa, pero falta resolver la descarga completa repetida y la detección de novedades de otros usuarios mientras la app permanece abierta. El requisito no debe registrarse como una función inexistente ni darse por completado por el solo hecho de leer IndexedDB primero.

### Criterios de aceptación
- En una apertura con caché válida, el catálogo se ve inmediatamente desde IndexedDB, sin esperar la red.
- Con cero novedades, la comprobación de fondo transfiere solo metadatos/cursor mínimo y no descarga las colecciones completas.
- Una alta confirmada por otro usuario aparece en una sesión ya abierta dentro del intervalo de sincronización acordado, sin recarga ni reingreso.
- Altas, modificaciones y bajas se reflejan en todas las colecciones objetivo, manteniendo filtros, scroll, modal y operaciones pendientes.
- No se pierde ni duplica información ante fallos, reconexiones, pestañas simultáneas o respuestas repetidas.
- La animación es discreta, fluida, accesible y no afecta el rendimiento móvil.

### Dependencias y orden
- GP-CAT-01A: auditar contratos de escritura y definir revisión/feed común para todas las entidades.
- GP-CAT-01B: endpoint incremental autenticado y paginado; snapshot completo solo para bootstrap/reparación.
- GP-CAT-01C: cliente cache-first con cursor y aplicación transaccional del delta.
- GP-CAT-01D: detección adaptativa en sesiones activas y coordinación entre pestañas.
- GP-CAT-01E: reconciliación de vistas y animaciones accesibles.
- GP-CAT-01F: pruebas automatizadas, rendimiento y Beta multiusuario/dispositivo.

Este requerimiento complementa GP-PWA-02: sincronizar el catálogo en vivo no debe interceptar el gesto nativo ni recargar el documento. Son dos mecanismos distintos: la PWA actualiza sus recursos de aplicación mediante el ciclo normal del Service Worker/navegador; los datos del catálogo se sincronizan incrementalmente dentro de la sesión.
