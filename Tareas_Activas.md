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
| GP-SEC-03 | Evaluar mitigación de capturas de pantalla en web/PWA sin prometer bloqueo absoluto | PENDIENTE P0/P5 |
| GP-DATA-01 | Disponer de migración explícita y verificable de contraseñas heredadas a hash seguro | PENDIENTE P0/P2 |
| GP-DATA-02 | Sustituir IDs calculados por fórmulas por IDs backend para usuarios, vehículos, tutoriales y relays | PENDIENTE P0/P2 |

## Hallazgos preliminares confirmados en código

1. **Sesión:** `auth.js` tiene validación cacheada 60 s; `main.js` revalida al recuperar conexión; `api-config.js` ejecuta `touchSession` previo a acciones protegidas, limitado localmente a 5 minutos. AUTH conserva expiración absoluta de 3 meses e inactividad de 1 mes. P1 debe eliminar validaciones redundantes, pero mantener autorización backend en cada operación protegida.
2. **Contraseñas:** AUTH ya migra una contraseña en texto plano a hash al login exitoso. El hash actual es SHA-256 con salt aleatorio. No se encontró todavía un comando de migración por lotes. Nuevas cuentas en `Services/users.js` también reciben hash. El coste del algoritmo actual debe evaluarse antes de seleccionar un formato más resistente.
3. **IDs:** usuarios nuevos usan IDs secuenciales `USR-####`; vehículos ya tienen asignador backend central y acciones `allocateVehicleId` / `freezeCortesIds`; tutoriales usan `tut-` + operationId; Problemas usa `isue-` + secuencia. La cobertura de registros antiguos, fórmulas y relays requiere auditoría adicional.
4. **Interacción con imágenes:** `clientInteractionPolicy.js` ya previene contextmenu, copy, cut, selectstart y dragstart en contenido no editable. Es una barrera contra acciones casuales, no impide inspección de red, extracción de URL ni captura del sistema.
5. **Inbox:** ya existen lista/detalle, paginación, caché, toolbar y acciones. El rediseño debe preservar contratos y capacidades.
6. **Roles:** el valor canónico único es `Jefe`. `Gefe` queda únicamente como valor heredado que se normaliza temporalmente a `Jefe` para no bloquear cuentas existentes; debe migrarse en la hoja `Users` y retirarse de la validación de datos de la columna `Privilegios`.

## Paquetes de ejecución

### P0 — Auditoría y diseño técnico
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA**

- [x] Mapear el flujo de login, restauración, validación, touch, revocación, expiración y logout.
- [x] Inventariar los endpoints y contratos de sesión/rol en AUTH, FEEDBACK, WRITE, USERS y ADMIN; identificar las lecturas públicas de CATALOG.
- [x] Confirmar la semántica de roles. El usuario confirmó que **Jefe** es la escritura correcta y el único valor oficial; `Gefe` es un dato heredado que se convierte temporalmente a `Jefe`.
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
**Estado: EN PROGRESO**

**Diseño derivado de P0:** retirar `ensureSessionTouched_` del dispatcher solo después de que cada servicio protegido actualice `LastActivityAt` dentro de su propia operación, tras validar token, identidad, cuenta activa, expiración y rol vigente. La actualización debe coordinarse entre proyectos Apps Script para evitar carreras con logout, revocación o eliminación de filas. Mantener una validación de restauración al iniciar la app; no convertir fallos de red/AUTH en logout ni permitir que el estado local autorice operaciones.
- [x] Eliminar la revalidación redundante al recuperar conexión; conservar la validación de restauración al iniciar la aplicación.
- [ ] Una sola autenticación interactiva por sesión.
- [ ] Conservar token/sesión al navegar entre páginas, actualizar y abrir modales.
- [ ] Retirar llamadas separadas y periódicas redundantes de validación/touch.
- [ ] Validar identidad, vigencia y rol dentro de la petición protegida del backend, sin un viaje de red adicional.
- [ ] Mantener revocación, expiración, desactivación y cambios de privilegios efectivos en el servidor.
- [ ] Probar concurrencia, múltiples pestañas, offline, reconexión y sesión revocada.

### P2 — Migración de contraseñas e identificadores
**Estado: PENDIENTE**
- [ ] Diseñar hash versionado con salt único y coste adecuado a Apps Script; medir latencia y compatibilidad.
- [ ] Implementar migración por lotes reanudable e idempotente de credenciales legacy; no registrar ni exportar contraseñas.
- [ ] Mantener autenticación compatible durante transición y verificar conteos antes/después.
- [ ] Auditar/normalizar IDs existentes y fórmulas; backend como única fuente para nuevos IDs.
- [ ] Migrar usuarios, vehículos, tutoriales y relays sin romper enlaces, aprobaciones, logs ni referencias cruzadas.
- [ ] Detectar duplicados/ambigüedades y detener solo los registros afectados; producir reporte de reconciliación.
- [ ] Implementar modo dry-run, checkpoints y estrategia de reversión.

### P3 — Rediseño Inbox
**Estado: PENDIENTE**
- [ ] Diseñar estructura de bandeja: navegación/categorías, búsqueda, filtros, lista con remitente/asunto/fecha/estado y panel de lectura.
- [ ] Mejorar jerarquía visual, densidad, estados no leído/leído, acciones y vacíos/carga/error.
- [ ] Adaptar móvil con navegación lista-detalle y controles táctiles.
- [ ] Preservar mensajes, respuestas, adjuntos si existen, paginación, caché, archivado, lectura y permisos.
- [ ] Probar tema claro/oscuro, teclado, accesibilidad y navegación Atrás.

### P4 — Política de imágenes y permisos
**Estado: PENDIENTE**
- [ ] Definir una matriz de capacidades por rol en backend y frontend.
- [ ] Compartir integrado del modal permitido a todos.
- [ ] Compartir integrado disponible para todos; imprimir y editar detalles solo Supervisor, Jefe y Desarrollador.
- [x] Unificar Jefe como valor canónico en AUTH, USERS, ADMIN, FEEDBACK, WRITE, Inbox y frontend; mantener conversión transitoria de registros heredados Gefe.
- [x] En la Spreadsheet, migrar Users.Privilegios de Gefe a Jefe y actualizar la validación/lista desplegable (confirmado por el usuario el 2026-11-14).
- [x] Retirar los conversores temporales Gefe → Jefe del backend y frontend; el código solo admite Jefe como valor canónico.
- [ ] Restringir botones, enlaces directos, descarga, menú contextual, copiar/arrastrar en imágenes, sin romper campos editables ni accesibilidad.
- [ ] Revisar exposición de URL originales y recursos estáticos; no confundir ocultar controles con autorización real.
- [ ] Pruebas negativas: Técnico no ejecuta acciones privilegiadas manipulando DOM o llamando endpoints directamente.

### P5 — Mitigación de capturas
**Estado: PENDIENTE**
- [ ] Investigar APIs y capacidades reales de navegadores/PWA/Android.
- [ ] No asumir que `preventDefault` bloquea capturas del sistema.
- [ ] Evaluar marca de agua contextual y ocultación de información sensible al cambiar visibilidad, solo si aporta protección sin degradar UX.
- [ ] Documentar expresamente qué ataques no pueden impedirse en web.

### P6 — Integración y regresión
**Estado: PENDIENTE**
- [ ] Pruebas por rol y sesión.
- [ ] Pruebas de migración/reanudación/reconciliación y referencias.
- [ ] Pruebas de Inbox en escritorio/móvil.
- [ ] Pruebas de modal y llamadas directas al backend.
- [ ] Pruebas de rendimiento, offline, reconexión y regresión de PWA.

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

P0 — auditoría y diseño técnico — está completada. Continuar P1 (autenticación simplificada) y P2 (migración de contraseñas e identificadores); mantener P4 pendiente hasta completar la matriz de capacidades y la actualización externa de la Spreadsheet.


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


## Nueva solicitud registrada — panel Developer, biblioteca de imágenes y ayudas contextuales (2026-11-14)

**Estado: PENDIENTE DE PRIORIZACIÓN E IMPLEMENTACIÓN.** Esta ampliación queda registrada para ejecutarse después de resolver las tareas vigentes y sus dependencias, conforme a la sección 11 de `NORMAS_DESAROLLO.md`. No altera el orden actual P0–P6.

### GP-DEV-UX-01 — Organización del panel de desarrollador
- [ ] Reorganizar el panel para que **Respaldo** y **Base de datos** estén dentro de una misma pestaña, con jerarquía y navegación coherentes.
- [ ] Redimensionar y armonizar el botón **Migrar esquema** y el selector para eliminar logs/actividad de usuarios; deben conservar proporciones, alturas y alineación consistentes con los demás controles.
- [ ] Revisar el resto de funciones del panel Developer para eliminar controles desproporcionados, agrupaciones confusas y texto explicativo excesivo.
- [ ] Mantener confirmaciones claras para operaciones destructivas y estados de progreso/resultado; simplificar la interfaz sin ocultar riesgos.

### GP-IMG-UX-01 — Biblioteca de imágenes reemplazadas
- [ ] Sustituir la interfaz desproporcionada actual por un modal tipo explorador de archivos/Drive, con espacio de trabajo limpio y fondo despejado.
- [ ] Implementar vistas de cuadrícula y lista conmutables mediante iconos compactos situados en una esquina del contenedor, sin botones con textos que repitan la función.
- [ ] En cuadrícula, usar miniaturas de tamaño medio y una altura visual coherente con la imagen del modelo de vehículo cuando la cuadrícula está seleccionada.
- [ ] En lista, usar miniaturas más pequeñas, como en una carpeta de Drive, con metadatos alineados y densidad visual adecuada.
- [ ] Permitir selección individual y múltiple, con selección visible y acciones aplicables al conjunto seleccionado.
- [ ] Incorporar menú contextual de tres puntos por elemento (y acciones de selección múltiple cuando corresponda): borrar, mover, restaurar y descargar.
- [ ] Diseñar estados vacíos, carga, error, selección, confirmación y resultados de operaciones; adaptar el modal a móvil y escritorio.
- [ ] **Resolver antes de implementar la contradicción de política:** el requisito anterior GP-SEC-02 prohíbe la descarga de imágenes para usuarios en general y permite el compartir integrado; esta solicitud pide una acción Descargar dentro del administrador de imágenes reemplazadas. Determinar si será una excepción exclusiva del panel Developer y qué roles podrán usarla. No habilitar descarga general por inferencia.
- [ ] Validar que borrar/mover/restaurar opere sobre los elementos correctos, con confirmación, permisos backend, protección contra acciones masivas accidentales y registro de auditoría.

### GP-IMG-DATA-01 — Conciliación Drive de cortes ↔ Spreadsheet
- [ ] Incorporar una función que recorra la carpeta Drive de cortes y compare cada imagen con los registros de la Spreadsheet.
- [ ] Identificar y mostrar en una lista diferenciada las imágenes de Drive que no tienen correspondencia/URL registrada en la Spreadsheet.
- [ ] Para coincidencias inequívocas, preparar la migración de la URL pública de la imagen al campo y fila correspondientes de la hoja; después, utilizar ese mismo campo para visualizar la imagen en el catálogo/formulario.
- [ ] Antes de escribir, implementar modo de simulación (dry-run), reporte de coincidencias, duplicados, imágenes huérfanas y filas ambiguas. No asignar una imagen por similitud débil ni sobrescribir una URL existente sin una regla explícita.
- [ ] Hacer el proceso reanudable e idempotente, con conteos antes/después, trazabilidad y estrategia de recuperación.
- [ ] La escritura real en Drive/Spreadsheet productivos y la ejecución de migraciones requieren autorización expresa; no forman parte del registro documental actual.

### GP-UX-INFO-01 — Textos concisos y ayuda contextual
- [ ] Revisar textos de Developer y formularios para retirar explicaciones redundantes o demasiado extensas; conservar etiquetas breves, claras y orientadas a la acción.
- [ ] Cuando una explicación sea útil pero no deba permanecer visible, utilizar un icono ⓘ discreto que abra una burbuja contextual al pulsarlo.
- [ ] Evitar que los botones expliquen su propia función con frases largas; usar iconografía reconocible y ayudas contextuales cuando sea necesario.
- [ ] Aplicar el patrón en las funciones del panel Developer y en los campos pertinentes de `HTML/add_cortes.html`: versión/Trim Level, tipo de corte, configuración del relay y rango de años.
- [ ] Incorporar ayudas ⓘ en los formularios de tutoriales PYS para explicar el cambio o dato solicitado.
- [ ] **Excluir expresamente el modal de detalles de vehículos:** no colocar allí el icono ⓘ ni burbujas de ayuda.
- [ ] Mantener accesibilidad: controles con nombre accesible, foco visible, apertura/cierre por teclado y texto contextual legible en móvil.

### Criterios de aceptación
- Developer presenta Respaldo y Base de datos en la misma pestaña; controles de migración y limpieza tienen tamaños proporcionados y consistentes.
- La biblioteca de imágenes ofrece cuadrícula/lista, miniaturas dimensionadas según la vista, selección múltiple y menú contextual de tres puntos con acciones coherentes y autorizadas.
- La conciliación Drive–Spreadsheet distingue coincidencias exactas, faltantes, duplicados y ambiguos; no escribe datos productivos sin autorización.
- Las URLs migradas se guardan en el campo correcto y son la fuente de visualización de la imagen, una vez aprobada y ejecutada la migración.
- Los textos de interfaz son breves; las explicaciones secundarias se consultan mediante ⓘ donde se solicitó.
- No aparece ⓘ en el modal de detalles; sí aparece en campos pertinentes de add_cortes y formularios PYS.
- La descarga en el administrador de imágenes queda limitada al panel Developer y al rol Desarrollador; no modifica la prohibición general de descarga.
- Pruebas locales cubren diseño responsive, selección simple/múltiple, acciones contextuales, permisos, conciliación idempotente y ayudas contextuales. Las pruebas con Drive/Spreadsheet reales se documentan como validación Beta.

