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
