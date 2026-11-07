# Aug_Tareas — Tareas nuevas derivadas de la auditoría global

**Plan relacionado:** AUD-PLAN-2026-001  
**Sesión de inicio:** AUD-20261107-S001  
**Checkpoint inicial:** AUD-CP-0001  
**Fecha:** 2026-11-07  

## Criterio de registro

Este archivo contiene tareas derivadas de hallazgos de auditoría. No sustituye Tareas.txt ni autoriza implementaciones. Antes de crear una tarea nueva se comprobará si ya existe una equivalente en Tareas.txt, Auditoría.txt o checkpoint.md. Si ya existe, se enlazará y no se duplicará.

## Hallazgos preliminares de la fase de planificación

### AUG-001 — Configurar protección técnica de la rama base
- **Prioridad:** Alta.
- **Origen:** Confirmación de ramas en GitHub durante AUD-20261107-S001.
- **Evidencia:** GPSpedia2.2.5 y GPSpedia2.2.5_work devolvieron protected=false.
- **Impacto:** La protección de la rama base depende actualmente del procedimiento humano y no de una regla técnica configurada en GitHub.
- **Estado:** YA EXISTE TAREA EQUIVALENTE en Tareas.txt: «CONFIGURAR PROTECCIÓN TÉCNICA DE LA RAMA BASE». No duplicar; enlazar con esa tarea y auditar su estado administrativo.
- **Criterio de cierre:** La rama base tiene reglas de protección verificables y se conserva la rama de trabajo como único destino autorizado de commits.

### AUG-002 — Verificación funcional consolidada de deployments
- **Prioridad:** Crítica.
- **Origen:** Checkpoints y Tareas.txt; varias implementaciones recientes declaran pruebas estáticas/aisladas, pero no Apps Script, HTTP, navegador ni deployments reales.
- **Evidencia inicial:** H-TESTIGO-REPORT-01, H-TESTIGO-SUGGEST-02, identidad WRITE/ADMIN, inventario Drive, historial de imágenes y varias herramientas ADMIN.
- **Estado:** TAREA TRANSVERSAL YA DOCUMENTADA en los checkpoints como fase funcional consolidada. No duplicar; consolidar sus casos en la matriz final y vincular cada AUD-T.
- **Criterio de cierre:** Cada flujo crítico tiene resultado E4/E5 o una limitación explícita que impida declarar la tarea funcionalmente validada.

### AUG-003 — Auditar el contrato y el alcance real de Services/Utilities.js
- **Prioridad:** Crítica.
- **Origen:** Historial reciente y árbol actual.
- **Evidencia inicial:** 8a3646cc documenta hallazgos de coordinación; 44d127b3 añade Utilities; 336915b7 y ef2db2e5 renombran el archivo. La tarea de coordinación compartida permanece descrita como bloqueada en registros previos.
- **Estado:** NUEVA ITERACIÓN DE AUDITORÍA; no se presume que el protocolo esté completo por la mera existencia del archivo.
- **Criterio de cierre:** Se identifica cada consumidor, escritor y recurso compartido; se demuestra el protocolo de lock/orden, su alcance entre proyectos Apps Script, los fallos y la liberación del lock; se documentan los límites reales.

### AUG-004 — Matriz de cancelación, sustitución y continuidad de requisitos
- **Prioridad:** Alta.
- **Origen:** Revisión preliminar de Tareas.txt e historial.
- **Evidencia inicial:** Tarea 1.6 aparece cancelada y retirada; Tarea 15 combina la parte cancelada de filtros con estandarización universal de botones. Existen tareas que evolucionaron o se reemplazaron por versiones posteriores.
- **Estado:** Entregable de auditoría incluido en AUD-PLAN-2026-001; no requiere cambio de código por ahora.
- **Criterio de cierre:** Cada requisito histórico queda clasificado como vigente, completado, parcial, cancelado, retirado, sustituido o absorbido, con commits y código actual como evidencia.

## Registro de nuevas tareas por iteración

Las siguientes secciones se completarán únicamente cuando una auditoría individual encuentre evidencia concreta. Formato obligatorio:

- ID de tarea: AUG-NNN.
- Hallazgo origen: H-AUD-NNN.
- Tarea auditada: AUD-T-NNN.
- Sesión y checkpoint: AUD-YYYYMMDD-SNNN / AUD-CP-NNNN.
- Prioridad y riesgo.
- Evidencia: archivos, funciones, líneas, commits.
- Problema e impacto.
- Dependencias y posibles regresiones.
- Criterios de aceptación verificables.
- Estado: NUEVA / EXISTENTE / DUPLICADA / BLOQUEADA / CANCELADA / RESUELTA.

## Historial de actualizaciones

- 2026-11-07 — Creación inicial. Se registran cuatro hallazgos preliminares de planificación; tres enlazan tareas transversales ya existentes y uno queda como entregable del plan. No se ha detectado todavía una nueva tarea de corrección de código validada por auditoría técnica.


## Hallazgos derivados de AUD-T-002 — 2026-11-07

### AUG-005 — Revocar sesiones cuando se elimina una cuenta
- **Hallazgo origen:** H-AUD-001.
- **Tarea auditada:** AUD-T-002.
- **Sesión/checkpoint:** AUD-20261107-S002 / AUD-CP-0002.
- **Prioridad:** Alta.
- **Evidencia:** Services/users.js handleDeleteUser() (líneas 398–427); Services/Auth.js handleValidateSession() (líneas 377–401).
- **Problema:** la eliminación de Users no elimina ActiveSessions; AUTH puede validar un token huérfano sin comprobar la existencia del usuario.
- **Criterios de aceptación:** eliminar la cuenta debe invalidar todas sus sesiones; AUTH debe rechazar tokens asociados a usuarios inexistentes; la operación debe ser consistente e idempotente; definir tratamiento de autodeleción y probarlo explícitamente.
- **Estado:** NUEVA.

### AUG-006 — Implementar cierre de sesión con revocación backend
- **Hallazgo origen:** H-AUD-002.
- **Tarea auditada:** AUD-T-002.
- **Sesión/checkpoint:** AUD-20261107-S002 / AUD-CP-0002.
- **Prioridad:** Alta.
- **Evidencia:** auth.js logout() (líneas 237–241); Services/Auth.js doPost() (líneas 204–227); api-config.js ACTION_TO_SERVICE_MAP.
- **Problema:** logout elimina únicamente la copia local del token; el servidor conserva la sesión activa.
- **Criterios de aceptación:** acción AUTH de revocación autenticada por token; eliminar solo la sesión invocante; limpiar Users.SessionToken únicamente si corresponde al token revocado; el logout local debe terminar aunque la red no esté disponible, pero debe informar/registrar el estado de revocación pendiente sin presentar como revocada una sesión que el servidor aún conserva.
- **Estado:** NUEVA.

### AUG-007 — Definir política de expiración y revocación tras cambio de contraseña
- **Hallazgo origen:** H-AUD-003.
- **Tarea auditada:** AUD-T-002.
- **Sesión/checkpoint:** AUD-20261107-S002 / AUD-CP-0002.
- **Prioridad:** Media/Alta; requiere decisión de producto.
- **Evidencia:** ActiveSessions.date; Services/Auth.js handleValidateSession(); Services/users.js getVerifiedSession(), handleChangePassword() y handleUpdateUser().
- **Problema:** la fecha de sesión no se usa para expirar; cambios de contraseña no revocan otras sesiones.
- **Criterios de aceptación:** aprobar una política explícita (duración absoluta, inactividad y comportamiento al cambiar/resetear contraseña); validarla en AUTH y USERS de forma consistente; pruebas de expiración, renovación y revocación.
- **Estado:** NUEVA; DECISIÓN DE POLÍTICA PENDIENTE.

### AUG-008 — Corregir la coordinación de validación de sesión entre pestañas
- **Hallazgo origen:** H-AUD-004.
- **Tarea auditada:** AUD-T-002.
- **Sesión/checkpoint:** AUD-20261107-S002 / AUD-CP-0002.
- **Prioridad:** Media.
- **Evidencia:** auth.js checkSession() (líneas 125–221), claves session_validation_lock y LOCK_TIMEOUT.
- **Problema:** el bloqueo local se elimina inmediatamente y no cubre la validación asíncrona ni ofrece adquisición atómica entre pestañas.
- **Criterios de aceptación:** coordinar pestañas concurrentes sin suponer atomicidad de localStorage; liberar el estado en éxito, fallo y timeout; evitar validaciones duplicadas y no bloquear el arranque indefinidamente; probar dos o más pestañas.
- **Estado:** NUEVA.

### AUG-009 — Validar el nombre de usuario en el backend
- **Hallazgo origen:** H-AUD-005.
- **Tarea auditada:** AUD-T-002.
- **Sesión/checkpoint:** AUD-20261107-S002 / AUD-CP-0002.
- **Prioridad:** Media.
- **Evidencia:** Services/users.js handleCreateUser() (líneas 269–341); users.html handleUserFormSubmit().
- **Problema:** se comprueban duplicados, pero no se rechaza explícitamente el nombre vacío tras trim() cuando la llamada evita la validación HTML.
- **Criterios de aceptación:** rechazar nombre vacío y entradas fuera de la política acordada en backend; mantener comparación normalizada para duplicados; pruebas directas al endpoint sin interfaz.
- **Estado:** NUEVA.

### AUG-010 — Completar serialización de mutaciones del servicio USERS
- **Hallazgo origen:** H-AUD-006.
- **Tarea auditada:** AUD-T-002.
- **Sesión/checkpoint:** AUD-20261107-S002 / AUD-CP-0002.
- **Prioridad:** Alta.
- **Evidencia:** Services/users.js handleCreateUser(), handleResetUserSessions(), handleUpdateUser(), handleDeleteUser(), handleUpdateProfile() y handleChangePassword().
- **Problema:** solo algunas mutaciones usan ScriptLock; operaciones concurrentes pueden leer/escribir estados incompatibles.
- **Criterios de aceptación:** inventariar y serializar las mutaciones que comparten filas/hojas; definir orden y límites de lock; probar concurrencia y fallos; coordinar AUTH/USERS mediante el protocolo común, sin asumir que ScriptLock de proyectos distintos sea compartido.
- **Relación:** subárea vinculada a AUD-T-033 (coordinación de mutaciones entre servicios). Mantener ambos alcances diferenciados.
- **Estado:** NUEVA; DEPENDIENTE DE AUD-T-033 PARA COORDINACIÓN ENTRE PROYECTOS.



### Adenda AUD-T-023 a AUG-010 — concurrencia de operaciones de contraseña
- **Hallazgo origen:** H-AUD-023-002 y H-AUD-023-003.
- **Alcance:** serializar handleUpdateUser() cuando modifica Password, handleChangePassword() y la escritura de migración legacy de AUTH. AUTH y USERS son proyectos Apps Script distintos; sus ScriptLock locales no se comparten.
- **Criterios adicionales:** dos cambios simultáneos no deben responder éxito con resultados contradictorios; una migración atrasada no debe sobrescribir un hash reciente; verificar y escribir sobre estado confirmado; probar cambios propios, reset administrativo y login legacy concurrentes en copia aislada.
- **Relación:** mantener AUG-010 y AUD-T-033 sin duplicar coordinación interservicios.

### AUG-011 — Sustituir SHA-256 rápido por KDF resistente y completar migración versionada
- **Origen:** H-AUD-023-001, H-AUD-023-006 y H-AUD-023-007. **Prioridad:** Alta.
- **Problema:** SHA-256 de una pasada no es KDF; cuentas legacy pueden quedar en texto claro; formatos desconocidos se interpretan como legacy.
- **Criterios:** seleccionar KDF compatible con Apps Script V8 y medir rendimiento; formato versionado con parámetros y salt individual; compatibilidad temporal controlada con legacy/sha256$; rechazar formatos codificados desconocidos; definir migración de cuentas inactivas y política para contraseñas legacy cortas; probar reversión en copia aislada.
- **Restricción:** no migrar ni desplegar producción sin autorización.

### AUG-012 — Hacer consistente el contador de intentos ante autenticaciones concurrentes
- **Origen:** H-AUD-023-004. **Prioridad:** Media.
- **Problema:** resetLoginAttempts() y rollbackLoginAttempt() pueden eliminar/descontar intentos de otras solicitudes.
- **Criterios:** diseñar reservas/identificadores de intento o estrategia equivalente; preservar bloqueo temporal; probar fallos, éxito y errores de infraestructura simultáneos; documentar el límite de CacheService.

### AUG-013 — Coordinar purga de Logs con inserciones AUTH
- **Origen:** H-AUD-023-005. **Prioridad:** Media.
- **Problema:** FEEDBACK elimina índices calculados antes de que AUTH inserte nuevas filas; los ScriptLock de proyectos separados no se coordinan.
- **Criterios:** diseñar coordinación entre proyectos sin asumir lock compartido; evitar índices obsoletos; preservar logs no sensibles; verificar que los formatos históricos objetivo se detectan y no quedan credenciales; probar inserciones simultáneas en copia.

### AUG-014 — Alinear validación de contraseña en UI y corregir texto
- **Origen:** H-AUD-023-008. **Prioridad:** Baja.
- **Problema:** users.html valida longitud sin trim mientras backend aplica trim; mensaje contiene «reincie».
- **Criterios:** aplicar en cliente la misma longitud normalizada sin sustituir validación backend; corregir a «reinicie sesión»; probar espacios externos y longitudes límite.



## Adenda AUD-T-024 — verificación de tareas existentes

### AUG-005 — ampliar revocación y eliminación de cuentas
- **Hallazgos confirmados:** H-AUD-024-004 y H-AUD-024-010.
- **Adenda:** impedir o definir expresamente la autodeleción del Desarrollador; la eliminación de cualquier cuenta debe retirar sus sesiones; AUTH debe comprobar que el usuario siga existiendo antes de validar el token.
- **Estado:** EXISTENTE; no duplicar.

### AUG-006 — cierre de sesión con revocación backend
- **Hallazgo confirmado:** H-AUD-024-008.
- **Adenda:** el cierre local debe distinguir entre token retirado del navegador y token efectivamente revocado en AUTH. Conservar comportamiento seguro ante desconexión y reportar revocación pendiente sin afirmar éxito remoto.
- **Estado:** EXISTENTE; no duplicar.

### AUG-007 — política de expiración y revocación
- **Hallazgo confirmado:** H-AUD-024-009.
- **Adenda:** la fecha de ActiveSessions debe participar en la política aprobada; definir duración absoluta e inactividad y aplicar criterios compatibles en AUTH y USERS.
- **Estado:** EXISTENTE; decisión de política pendiente.

### AUG-008 — coordinación de validación de sesión entre pestañas
- **Hallazgos confirmados:** H-AUD-024-001 y H-AUD-024-002.
- **Adenda:** además de coordinar solicitudes concurrentes, una respuesta de validación solo podrá modificar/cerrar la sesión si sigue correspondiendo al mismo userId/token que se validó. Una respuesta obsoleta no debe borrar una sesión nueva. Toda pestaña debe resolver su estado visual si otra pestaña está validando; evitar retornos que dejen el splash sin transición.
- **Estado:** EXISTENTE; ampliada con evidencia AUD-T-024.

### AUG-016 — Consistencia y recuperación de mutaciones del ciclo de sesión
- **Origen:** H-AUD-024-003, H-AUD-024-005 y H-AUD-024-006. **Prioridad:** Alta.
- **Tarea auditada:** AUD-T-024.
- **Sesión/checkpoint:** AUD-20261107-S005 / AUD-CP-0005.
- **Evidencia:** Services/Auth.js handleLogin() (bloque de sesión, líneas 284–337); Services/users.js handleResetUserSessions() (líneas 217–265); Services/Test/README.md (proyectos separados).
- **Problema:** AUTH y USERS mantienen ScriptLock independientes; resetUserSessions puede competir con un login y no revocar una sesión creada después de su instantánea. Además, la creación de sesión y la eliminación de varias sesiones contienen escrituras secuenciales sin rollback/reconciliación ante fallos parciales.
- **Criterios de aceptación:** definir coordinación interproyectos compatible con AUD-T-033; probar login simultáneo a cierre remoto; impedir que una revocación confirmada deje pasar una sesión concurrente; diseñar operaciones idempotentes y recuperación/reconciliación ante fallo de setValue, appendRow o deleteRow; no afirmar atomicidad de Spreadsheet sin evidencia; validar en copia aislada.
- **Relación:** AUD-T-033 y AUG-003 (coordinación de proyectos); AUG-010 (serialización USERS); AUG-005 y AUG-006 (revocación).
- **Estado:** NUEVA; implementación y pruebas pendientes.

### AUG-017 — Restablecer controles de navegación al cambiar de cuenta/rol
- **Origen:** H-AUD-024-007. **Prioridad:** Baja.
- **Tarea auditada:** AUD-T-024.
- **Sesión/checkpoint:** AUD-20261107-S005 / AUD-CP-0005.
- **Evidencia:** ui.js showApp(), líneas 6297–6315.
- **Problema:** inbox-btn y dashboard-btn solo se muestran para roles autorizados, pero no se ocultan expresamente cuando la siguiente cuenta tiene un rol inferior; el estado visual previo puede permanecer.
- **Criterios de aceptación:** establecer explícitamente el estado visible/oculto de cada control en cada llamada a showApp(); probar cambio de Developer/Gefe/Supervisor a Técnico y Técnico exterior en la misma instancia; mantener las validaciones backend como barrera efectiva.
- **Estado:** NUEVA; implementación y pruebas pendientes.

## Historial de AUD-T-024
- 2026-11-07 — Auditoría estática E1 completada. H-AUD-024-001 a H-AUD-024-010 registrados en Auditoría.txt. No se modificó código ni se ejecutaron pruebas funcionales.



## Adenda AUD-T-025 — herramientas ADMIN, respaldo/restauración, Logs y mantenimiento

### AUG-013 — Coordinar purga de Logs con inserciones AUTH
- **Reconfirmación:** H-AUD-023-005 sigue vigente en AUD-T-025.
- **Evidencia actual:** Services/feedback.js, handleClearSensitiveLogs(), líneas 1686–1720; AUTH y FEEDBACK son proyectos separados.
- **Adenda:** probar inserciones AUTH simultáneas con el escaneo y borrado por índices de FEEDBACK; conservar todos los logs no sensibles y definir una estrategia coordinada sin asumir ScriptLock compartido.
- **Estado:** EXISTENTE; abierta; no duplicar.

### AUG-018 — Restauraciones recuperables y verificación integral de respaldos DB/Drive
- **Origen:** H-AUD-025-001, H-AUD-025-002 y H-AUD-025-003. **Prioridad:** Crítica.
- **Tarea auditada:** AUD-T-025. **Sesión/checkpoint:** AUD-20261107-S006 / AUD-CP-0006.
- **Problema:** restoreDatabase elimina las hojas productivas antes de terminar de copiar y restoreDrive vacía Cortes antes de copiar. Ninguno dispone de rollback. BackupDrive recorre el árbol en una ejecución recursiva sin manifiesto, lotes ni reanudación; si falla puede dejar un contenedor parcial que el restore acepta por nombre/ubicación.
- **Criterios de aceptación:** generar y verificar un respaldo actual del destino antes de cualquier sustitución; diseñar staging/commit de restauración o rollback probado; comparar inventario de hojas y contenido mínimo DB; generar manifiesto de Drive con rutas, IDs/copias, MIME, tamaños y conteos verificables; marcar explícitamente respaldos incompletos; no permitir restaurar contenedores sin estado completo; soportar lotes/reanudación; simular fallos en cada etapa y demostrar recuperación en copias aisladas; coordinar escritores concurrentes mediante AUD-T-033 sin afirmar que ScriptLock de proyectos distintos es compartido.
- **Relación:** AUD-T-033/AUG-003, AUG-002, H-AUD-025-001/002/003.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

### AUG-019 — Restringir la terminal Drive al árbol Cortes
- **Origen:** H-AUD-025-004. **Prioridad:** Media.
- **Evidencia:** Services/admin.js, handleDriveCommand(), líneas 3750–3841.
- **Problema:** currentFolderId se acepta sin comprobar ascendencia; cd .. puede salir de Cortes; mkdir y move pueden operar fuera del árbol previsto y move acepta fileId/targetFolderId arbitrarios.
- **Criterios de aceptación:** comprobar ascendencia de carpeta activa, archivo y destino en cada acción; bloquear navegación al padre de la raíz Cortes; permitir únicamente mkdir/move dentro del árbol autorizado; probar payloads manipulados y carpetas/archivos externos.
- **Estado:** NUEVA; pendiente.

### AUG-020 — Escalabilidad y tratamiento de datos temporales en ActividadUsuario
- **Origen:** H-AUD-025-005 y H-AUD-025-006. **Prioridad:** Media.
- **Evidencia:** Services/feedback.js, handleGetActivityLogs() líneas 1268–1288 y handleClearActivityLogs() líneas 1641–1683.
- **Problema:** se carga y transforma todo el historial para devolver 100 filas; timestamps vacíos/no válidos no se clasifican ni notifican durante la purga de antigüedad.
- **Criterios de aceptación:** recuperar solo el rango más reciente requerido; preservar orden y máximo de 100 registros; definir tratamiento explícito de timestamp inválido (cuarentena/reporte/retención controlada, sin borrado inferido); informar cantidad de filas no clasificables; probar hojas grandes y formatos Date/string.
- **Estado:** NUEVA; pendiente.

### AUG-021 — Registro persistente de operaciones administrativas sensibles
- **Origen:** H-AUD-025-007. **Prioridad:** Media.
- **Evidencia:** Services/admin.js, doPost(), líneas 586–748; logMessage() solo agrega a logs local y la respuesta HTTP.
- **Problema:** el historial de ejecución ADMIN no queda persistido y se pierde si la respuesta no llega al navegador o falla la ejecución.
- **Criterios de aceptación:** registrar de forma durable actor autenticado, acción, recurso de origen/destino, inicio/fin, resultado, etapa y resultado parcial; excluir tokens, contraseñas y payloads sensibles; restringir lectura/modificación; asegurar que la falla al registrar auditoría no convierta silenciosamente una operación destructiva en éxito sin trazabilidad; definir retención y protección del registro.
- **Relación:** AUD-T-023/AUG-013 para logs sensibles y AUD-T-033 para coordinación de escrituras.
- **Estado:** NUEVA; pendiente.

### AUG-022 — Verificar la eliminación asíncrona de IndexedDB
- **Origen:** H-AUD-025-008. **Prioridad:** Baja.
- **Evidencia:** ui.js, handler btn-admin-clear-client-cache(), líneas 4473–4494.
- **Problema:** deleteDatabase() no espera onsuccess/onerror/onblocked y la interfaz reporta éxito inmediatamente.
- **Criterios de aceptación:** resolver la solicitud IndexedDB mediante sus eventos; diferenciar éxito, error y bloqueo; no anunciar vaciado completo ni recargar como si se hubiera eliminado cuando la operación sigue bloqueada; mantener la limpieza de localStorage y reportar su resultado por separado.
- **Estado:** NUEVA; pendiente.

### AUG-023 — Resolver acciones ADMIN sin ruta canónica ni consumidor
- **Origen:** H-AUD-025-009. **Prioridad:** Baja.
- **Evidencia:** Services/admin.js, switch doPost() y handlers handleCreateSheet()/handleAddColumn(); ACTION_TO_SERVICE_MAP; ui.js/index.html sin referencias de consumo.
- **Problema:** createSheet/addColumn existen en el router backend, pero no están mapeadas por routeAction ni tienen consumidor frontend identificado.
- **Criterios de aceptación:** decidir y documentar si son acciones soportadas, internas o heredadas; si se mantienen, definir contrato, autorización, validación y pruebas; si se retiran, hacerlo en tarea autorizada tras comprobar consumidores externos. No eliminar código durante auditoría.
- **Estado:** NUEVA; pendiente.

 
### AUG-024 — Robustecer el contrato de health check y la clasificación de estados de microservicios
- **Origen:** H-AUD-026-001, H-AUD-026-002 y H-AUD-026-003; riesgo histórico de metadatos debug pendiente de verificación. **Prioridad:** Alta.
- **Tarea auditada:** AUD-T-026. **Sesión/checkpoint:** AUD-20261107-S007 / AUD-CP-0007.
- **Problema:** el ping POST de ADMIN no tiene timeout y precede al escaneo GET; una respuesta 2xx con cuerpo vacío/no JSON/no reconocible puede marcarse online; no existen estados slow/unknown/stale y el detalle no muestra código HTTP ni motivo de error. El backend actual y los deployments no están disponibles en el repositorio para verificar el contrato. Históricamente algunos GET debug devolvían IDs de Spreadsheet/Drive y nombres de hojas; el filtrado frontend no protege el cuerpo HTTP original.
- **Criterios de aceptación:**
  1. Ejecutar el escaneo de servicios independientemente del ping ADMIN; aplicar timeout explícito al ping y conservar aislamiento de cada comprobación.
  2. Definir un contrato JSON verificable por servicio, con identidad, estado y versión cuando exista; una respuesta vacía, HTML, JSON inválido, primitivo o contrato desconocido debe quedar como unknown/error, nunca como online por el solo HTTP 2xx.
  3. Definir umbrales configurables y documentados para slow; diferenciar online, slow, unavailable/offline, error, unknown y stale sin inferir disponibilidad a partir de ausencia de datos.
  4. Mostrar código HTTP y una explicación segura del fallo; no ocultar el motivo cuando backend reporte error con HTTP 2xx.
  5. Auditar fuentes backend y deployments actuales de AUTH, CATALOG, WRITE, USERS, FEEDBACK, UTILITIES, ADMIN y LEGACY. Verificar la identidad real del servicio y la uniformidad de respuestas.
  6. Redactar en backend spreadsheetId, driveFolderId, cacheKey, nombres/estructura interna de hojas, stack traces, tokens y secretos de cualquier endpoint debug público. No depender del filtrado frontend como control de seguridad.
  7. Incorporar comprobaciones de solo lectura para Sheets/Drive únicamente cuando exista una fuente segura y verificable; separar endpoint disponible de dependencia interna comprobada.
  8. Probar éxito, HTTP 4xx/5xx, timeout, JSON inválido, HTML, cuerpo vacío, estado backend error/degraded/unknown, endpoint equivocado, dependencia no disponible y servicio lento; un fallo individual no debe bloquear los demás.
- **Relación:** TAREA ADMIN 2 — Monitor del sistema y estado de servicios; H-AUD-026-001 a H-AUD-026-003.
- **Estado:** NUEVA; pendiente de acceso a fuentes backend/deployments y diseño del contrato.

### AUG-025 — Corregir vigencia y precisión temporal de la telemetría local
- **Origen:** H-AUD-026-004 y H-AUD-026-005. **Prioridad:** Media.
- **Tarea auditada:** AUD-T-026. **Sesión/checkpoint:** AUD-20261107-S007 / AUD-CP-0007.
- **Problema:** el panel no se vuelve a renderizar cuando eventos salen de la ventana de quince minutos; la suscripción actualiza DOM aunque el panel esté oculto. La marca temporal se toma al finalizar el POST aunque el gráfico describa solicitudes iniciadas. La distribución de quince buckets puede excluir parte del intervalo exacto y el límite de 600 eventos trunca muestras sin advertencia.
- **Criterios de aceptación:**
  1. Definir y etiquetar inequívocamente si la serie agrupa por inicio o finalización de solicitud; usar una marca temporal coherente con esa definición.
  2. Alinear buckets y ventana para incluir exactamente el intervalo declarado, incluyendo límites de minuto y eventos próximos al corte.
  3. Actualizar/caducar detalle y gráfica cuando transcurra el tiempo aunque no lleguen nuevas solicitudes; no dejar visible como actual una muestra que ya expiró.
  4. Indicar cuando se alcance el máximo de eventos y la muestra esté truncada; no presentar conteos parciales como si fueran el total completo de la ventana.
  5. Evitar reconstrucciones de DOM cuando el modal o la sección Diagnóstico no estén visibles; mantener captura independiente y administrar correctamente la suscripción.
  6. Probar solicitudes largas que crucen minutos, inactividad superior a quince minutos, límite superior a 600 eventos, solicitudes concurrentes, cierre/reapertura del modal y recarga de la aplicación.
- **Relación:** TAREA ADMIN 2, H-AUD-026-004 y H-AUD-026-005.
- **Estado:** NUEVA; pendiente.


================================================================================
ADENDA AUD-T-027 — HISTORIAL DE IMÁGENES REEMPLAZADAS Y ACCIONES DE GESTIÓN
Fecha: 2026-11-07
Sesión/checkpoint: AUD-20261107-S008 / AUD-CP-0008

### Adenda a AUG-021 — Registro persistente de operaciones administrativas sensibles
- **Nuevo origen:** H-AUD-027-004. **Prioridad:** Media.
- **Evidencia:** Services/admin.js doPost() (610, 649–650, 679–680); handleUploadAdminImage() (1955 en adelante); handleRecoverReplacedImage() (4304–4428); recordImageAdministrationActivity() (4434–4462).
- **Adenda:** incorporar las acciones uploadAdminImage y recoverReplacedImage al registro durable. Actualmente el router valida developerContext, pero no lo pasa a esos handlers y ninguno registra la operación en ActividadUsuario. La fila histórica conserva fecha/URL, pero no actor. El helper actual captura fallos y solo los envía a Logger.log.
- **Criterios adicionales:** guardar actor autenticado, ID de operación, vehículo/campo, archivo anterior/nuevo, ubicación cuando corresponda, inicio/fin, resultado y compensación; no guardar tokens ni contenido Base64; informar fallos del registro durable y reconciliar operaciones parciales.
- **Estado:** EXISTENTE; ampliada; implementación y pruebas pendientes. No duplicar AUG-021.

### AUG-026 — Integridad, recuperación y visibilidad de estados del historial de imágenes
- **Origen:** H-AUD-027-001, H-AUD-027-002, H-AUD-027-003, H-AUD-027-005 y H-AUD-027-006. **Prioridad:** Alta.
- **Tarea auditada:** AUD-T-027. **Sesión/checkpoint:** AUD-20261107-S008 / AUD-CP-0008.
- **Problema:** la consulta oculta estados en_papelera/requiere_revision/cancelada; el handler de restauración no valida el estado previo y su rollback no restaura el estado histórico; la consulta descarta filas inválidas sin reporte; algunas acciones no comprueban duplicidad/coincidencia de IDs; doce columnas dinámicas no están reflejadas en el inventario de esquema; abrir la consulta puede modificar la Spreadsheet sin bloqueo.
- **Criterios de aceptación:**
  1. Definir y exponer una vista segura para registros históricos recuperables, enviados a papelera o que requieren revisión; no ocultar estados que necesitan intervención.
  2. Validar transiciones de estado en backend y restaurar tanto la celda activa, el archivo Drive y el estado histórico en cada compensación.
  3. Validar unicidad de id_reemplazo y coincidencia entre archivo_drive_id, url_anterior y URL de visualización antes de cualquier acción; presentar filas inválidas en una sección de revisión, sin descartarlas silenciosamente.
  4. Documentar las doce columnas adicionales, sus estados y reglas de migración en Spreadsheet/GPSpedia_DB_columnas.md.
  5. Separar la inicialización/migración de esquema de la consulta de lectura o protegerla con una operación idempotente y coordinada.
  6. Probar historica, restablecida, en_papelera, requiere_revision y cancelada; fallos de setValue/flush; archivo en papelera; IDs duplicados/mismatched; MIME inválido; filas parciales y permisos.
- **Relación:** AUG-021 para trazabilidad; AUD-T-033/AUG-003 para coordinación interproyectos.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

### AUG-027 — Definir alcance de referencias y separación entre historial e inventario sin uso
- **Origen:** H-AUD-027-007 y H-AUD-027-008. **Prioridad:** Media; requiere decisión funcional antes de modificar código.
- **Tarea auditada:** AUD-T-027. **Sesión/checkpoint:** AUD-20261107-S008 / AUD-CP-0008.
- **Problema:** el requisito histórico AUD-IMG-03 pedía comprobar referencias en todas las hojas, mientras la especificación posterior del gestor compara los campos de imagen de Cortes. Además, el requisito 6.5 dice que el gestor muestre exclusivamente imágenes sin uso confirmado, pero la interfaz actual mezcla esos registros con el historial de reemplazos que conserva acciones de restauración.
- **Decisiones requeridas:**
  1. Confirmar si la protección de uso se limita a las columnas de imagen de Cortes o incluye referencias de otras hojas.
  2. Confirmar si el historial de reemplazos se mantiene en un modal/sección independiente del inventario sin uso o si ambos deben mostrarse juntos con filtros explícitos.
  3. Confirmar la política de restauración para registros enviados a papelera y estados que requieren revisión.
- **Criterios de aceptación:** documentar la decisión en Tareas.txt y Auditoría.txt; alinear títulos, filtros, contratos y pruebas con el alcance aprobado; no ampliar ni reducir referencias por inferencia.
- **Estado:** NUEVA; decisión pendiente. No implementar hasta resolver el alcance.

================================================================================


================================================================================
ADENDA AUD-T-028 — INVENTARIO DE IMÁGENES SIN USO, CLASIFICACIÓN Y MONITOR GLOBAL DE DRIVE
Fecha: 2026-11-07
Sesión/checkpoint: AUD-20261107-S009 / AUD-CP-0009

### Adenda a AUG-021 — Registro persistente de operaciones administrativas sensibles
- **Nuevo origen:** H-AUD-028-002/H-AUD-028-006. **Prioridad:** Media.
- **Adenda:** registrar la actualización del inventario (saveUnusedImagesInventory) con actor autenticado, auditId de escaneo, inventoryOperationId, conteos insertados/actualizados/no confirmados, resultados por archivo y resultado final. Actualmente el guardado del inventario usa logMessage, pero no registra un evento durable en ActividadUsuario.
- **Criterios adicionales:** registrar también errores y reintentos sin guardar tokens ni contenido de archivos; correlacionar cada escritura con la auditoría completa que la originó.
- **Estado:** EXISTENTE; ampliada; implementación y pruebas pendientes. No duplicar AUG-021.

### Adenda a AUG-026 — Integridad, recuperación y visibilidad de estados del historial
- **Nuevo origen:** H-AUD-028-003. **Prioridad:** Alta.
- **Adenda:** los estados requiere_revision y cualquier estado histórico no resuelto deben proteger el archivo frente a clasificación como sin uso. La auditoría, el guardado de inventario y el organizador deben compartir una política única de estados; el movimiento debe volver a consultar el historial antes de ejecutarse.
- **Criterios adicionales:** probar registros historica, restablecida, requiere_revision, en_papelera y cancelada; ningún estado de revisión debe transformarse silenciosamente en inventario sin uso ni habilitar movimiento.
- **Estado:** EXISTENTE; ampliada; implementación y pruebas pendientes.

### Adenda a AUG-003 — Coordinación de escrituras y bloqueos entre servicios
- **Nuevo origen:** H-AUD-028-004. **Prioridad:** Alta.
- **Adenda:** el organizador toma un único snapshot de referencias antes del bucle de hasta veinte movimientos. Debe volver a comprobar referencias inmediatamente antes de cada archivo y documentar qué modificaciones externas no quedan cubiertas por ScriptLock de ADMIN.
- **Criterios adicionales:** prueba concurrente de una nueva referencia añadida desde WRITE/Spreadsheet mientras un lote de organización está en curso; un archivo que adquiere referencia no debe moverse.
- **Estado:** EXISTENTE; ampliada; implementación y pruebas pendientes.

### AUG-028 — Validación de auditoría completa, consistencia del inventario y resultados por archivo
- **Origen:** H-AUD-028-002, H-AUD-028-003 y H-AUD-028-006. **Prioridad:** Alta.
- **Tarea auditada:** AUD-T-028. **Sesión/checkpoint:** AUD-20261107-S009 / AUD-CP-0009.
- **Problema:** el endpoint de guardado no valida que la lista provenga de un escaneo completo ni correlaciona el ID de exploración; puede marcar filas ausentes con una lista parcial. Estados históricos requiere_revision no están protegidos. Un único archivo inválido aborta todo el lote y no existe resultado durable por elemento.
- **Criterios de aceptación:**
  1. El backend debe exigir un marcador de auditoría completa emitido/validado por ADMIN; no actualizar filas ausentes si la exploración no está completa.
  2. Separar auditId de exploración e inventoryOperationId; registrar la correlación en Spreadsheet/log durable.
  3. Proteger los IDs de archivos de todos los estados históricos no resueltos, incluido requiere_revision.
  4. Validar por archivo y devolver estado confirmado/bloqueado/error; una fila inválida no debe impedir registrar las demás imágenes verificadas.
  5. Reconciliar escrituras parciales y reintentos sin duplicar registros ni dejar estados ambiguos.
  6. Detectar y resolver filas existentes duplicadas por Drive ID antes de actualizar o mover.
- **Relación:** AUG-026 para integridad del historial; AUG-021 para trazabilidad.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

### AUG-029 — Movimiento exclusivamente explícito y conservación de ubicaciones manuales
- **Origen:** H-AUD-028-001 y H-AUD-028-004. **Prioridad:** Alta.
- **Tarea auditada:** AUD-T-028. **Sesión/checkpoint:** AUD-20261107-S009 / AUD-CP-0009.
- **Problema:** el frontend llama automáticamente a mode=organize al terminar el escaneo y al restaurar determinados estados; el backend mueve archivos sin una acción explícita separada. El siguiente guardado del inventario sobrescribe movida_manual con pendiente.
- **Criterios de aceptación:**
  1. El escaneo y el guardado del inventario no deben mover, renombrar ni enviar archivos a papelera.
  2. El movimiento debe iniciarse solo desde una acción explícita del usuario, con confirmación y resultado verificable.
  3. Mantener movida_manual y la ubicación elegida por el usuario durante auditorías posteriores; no reubicar automáticamente una imagen ya movida.
  4. Revalidar referencias activas e historial inmediatamente antes de cada archivo; si cambia el estado, bloquear ese movimiento.
  5. Mantener rollback y registro durable para cada movimiento.
- **Relación:** requisitos posteriores Tareas.txt 6.4/6.5; coordinación AUG-003/AUD-T-033.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

### AUG-030 — Deduplicación, diagnóstico completo del escaneo, estado local y verificación de URL
- **Origen:** H-AUD-028-005, H-AUD-028-007, H-AUD-028-008 y H-AUD-028-009. **Prioridad:** Media.
- **Tarea auditada:** AUD-T-028. **Sesión/checkpoint:** AUD-20261107-S009 / AUD-CP-0009.
- **Problema:** no hay deduplicación global de archivos/carpetas en el cursor y la UI; el detalle visible filtra categorías; faltan total descubierto/errorCount y la raíz no se cuenta; el estado local no muestra fecha ni versión de servicio; la URL de miniatura no se verifica en el contexto real.
- **Criterios de aceptación:**
  1. Mantener IDs de carpetas y archivos ya procesados a través de todos los lotes y reanudaciones.
  2. Mostrar total descubierto, analizado, pendiente, errores y estado parcial/completo con definiciones consistentes; contar la raíz.
  3. Mostrar todas las categorías o distinguir explícitamente el subconjunto de imágenes administrables.
  4. Mostrar fecha/hora del último escaneo, rootFolderId y versión/build del servicio para distinguir un resultado restaurado de uno nuevo.
  5. Verificar que la URL de visualización corresponde al ID y puede cargarse en el contexto autorizado, sin cambiar permisos de forma amplia.
  6. Probar duplicados existentes en Spreadsheet y ofrecer reconciliación.
- **Relación:** AUD-T-029 para capacidad, cache TTL, snapshot y persistencia incremental.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

================================================================================


================================================================================
### Adenda a AUG-028 — Integridad del cursor y prueba verificable de auditoría completa
- **Nuevo origen:** H-AUD-029-001. **Prioridad:** Alta.
- **Adenda:** ADMIN no debe aceptar una pila de continuación vacía enviada por el cliente como evidencia de que el árbol terminó. El estado de finalización debe estar respaldado por estado de servidor o un marcador firmado/validado; el endpoint de guardado del inventario debe exigir esa evidencia.
- **Criterios adicionales:** probar cursor vacío, pila truncada, campos omitidos, contadores alterados, cursor de otra raíz y cursor/snapshot inexistente. Ningún caso parcial debe permitir marcar filas ausentes como no confirmadas.
- **Estado:** EXISTENTE; ampliada; diseño, implementación y pruebas pendientes. No duplicar AUG-028.

### Adenda a AUG-030 — Detección de posición repetida y deduplicación entre lotes
- **Nuevo origen:** H-AUD-029-002. **Prioridad:** Alta.
- **Adenda:** la firma de progreso debe representar la posición real de los iteradores/stack y excluir contadores acumulados. La acumulación frontend debe impedir que un mismo fileId se añada varias veces, incluso después de restaurar IndexedDB o reanudar.
- **Criterios adicionales:** simular token/stack repetido con totalAnalyzed creciente; repetir el mismo fileId en lotes distintos; reanudar después de persistir; verificar que no se produzcan resultados duplicados ni avance ficticio.
- **Estado:** EXISTENTE; ampliada; implementación y pruebas pendientes. No duplicar AUG-030.

### AUG-031 — Persistencia incremental e aislamiento de auditorías concurrentes en IndexedDB
- **Origen:** H-AUD-029-003 y H-AUD-029-008. **Prioridad:** Alta.
- **Problema:** cada lote reescribe todos los resultados acumulados bajo una sola clave local compartida entre pestañas. No hay aislamiento por auditId ni coordinación de dos ejecuciones concurrentes.
- **Criterios de aceptación:** almacenar metadatos/cursor separados de resultados; persistir páginas o archivos incrementalmente con clave estable; evitar duplicados; mantener recuperación coherente ante fallo entre lote y metadatos; aislar auditorías por ID; impedir que dos pestañas sobrescriban progreso sin aviso; migrar de DB_VERSION 4 sin perder el estado existente.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

### AUG-032 — Capacidad e integridad del snapshot temporal y política de expiración
- **Origen:** H-AUD-029-004. **Prioridad:** Media.
- **Problema:** el snapshot JSON tiene límite fijo de 750,000 caracteres y TTL de seis horas que no se renueva al continuar. La reanudación local puede sobrevivir al estado temporal de servidor.
- **Criterios de aceptación:** definir capacidad soportada y comportamiento ante exceso; evaluar compresión con MIME explícito o almacenamiento por bloques/páginas; verificar tamaño por bloque; incorporar integridad del manifiesto/contenido; definir renovación/expiración y limpieza; nunca continuar con snapshot parcial; probar pausa y reanudación cerca y después del TTL.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

### AUG-033 — Rendimiento del recorrido Drive y captura de referencias
- **Origen:** H-AUD-029-005, H-AUD-029-006 y H-AUD-029-007. **Prioridad:** Media.
- **Problema:** la captura de referencias materializa matrices de todas las columnas de Cortes; los lotes son fijos y no consideran presupuesto temporal; cada continuación repite recorridos de ancestros para la pila.
- **Criterios de aceptación:** medir tiempo por etapa y tamaño de datos en entorno de prueba; optimizar lectura de los ocho campos sin perder fórmulas/rich text; definir presupuesto temporal y tamaño de lote seguro; aplicar timeout/reintento cliente sin perder cursor; memoizar validaciones de ancestros dentro de cada petición y conservar validación de pertenencia a Cortes.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.
================================================================================


### AUG-034 — Coordinación compartida de mutaciones y ventana segura de migración WRITE/ADMIN
- **Origen:** H-AUD-030-001. **Prioridad:** Alta.
- **Problema:** los ScriptLock de WRITE y ADMIN pertenecen a proyectos Apps Script distintos. La migración VIN se ejecuta en ADMIN mientras las mutaciones de Cortes/opId se ejecutan en WRITE; no existe exclusión mutua compartida.
- **Criterios de aceptación:** diseñar un protocolo compartido de mantenimiento que impida iniciar nuevas mutaciones y permita identificar/drenar operaciones en curso; aplicarlo de forma consistente en WRITE y ADMIN; evitar que la migración lea y modifique el mapa de idempotencia mientras cambia; definir recuperación si el proceso se interrumpe; probar alta WRITE, alta ADMIN y migración concurrentes en copias aisladas; no declarar atomicidad entre proyectos sin evidencia.
- **Relación:** AUD-T-033/AUG-003; no duplicar la tarea general de coordinación interservicios.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

### AUG-035 — Integridad estricta y reconciliación de la hoja Idempotencia
- **Origen:** H-AUD-030-002, H-AUD-030-003, H-AUD-030-004 y H-AUD-030-005. **Prioridad:** Alta.
- **Problema:** la lectura del mapa de migración no valida status ni unicidad de opId; la inicialización puede completar encabezados vacíos sobre columnas con datos; el registro/runtime acepta duplicados con la misma asociación; la recuperación devuelve la primera fila de Cortes para un vehicleId sin exigir unicidad.
- **Criterios de aceptación:** validar encabezados y contenido antes de reparar; detenerse si una columna sin encabezado contiene datos; validar opId, vehicleId, slotIndex, timestamp y status con reglas documentadas; detectar duplicados incluso cuando la asociación coincide; no limpiar columnas heredadas hasta verificar todas las filas destino y sus estados; definir reconciliación no destructiva de duplicados; exigir exactamente una fila Cortes por vehicleId al recuperar; probar corrupción, duplicados, pending, status desconocido, asociaciones incompatibles, fallo parcial y reintentos en Spreadsheet aislada.
- **Relación:** AUD-T-030, AUD-T-031 para idempotencia de archivos, AUD-T-033 para coordinación.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

### AUG-036 — Contrato unívoco de columnas VIN/testigo y parsers compatibles
- **Origen:** H-AUD-030-006, H-AUD-030-007 y H-AUD-030-008. **Prioridad:** Media.
- **Problema:** la documentación fija testigo en AT:AV pero el código agrega campos después de la última columna usada; la resolución runtime de VIN acepta el primer encabezado aunque haya duplicados; frontend/backend difieren en delimitadores heredados de VIN.
- **Criterios de aceptación:** definir y documentar si AT:AV es posición obligatoria o si los campos se ubican dinámicamente; detectar encabezados duplicados de VIN/testigo y detener escrituras ambiguas; unificar parser y serialización frontend/backend; mantener el JSON como formato canónico y especificar compatibilidad heredada; probar hojas con columnas adicionales, encabezados duplicados, VIN JSON, delimitadores heredados y datos inválidos.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.


### Adenda AUD-T-031 — ampliación de coordinación interservicios
- **Origen:** H-AUD-031-003. **Relación:** AUG-034/AUD-T-033.
- **Alcance adicional:** incluir handleUploadAdminImage(), reemplazos in-modal, updateVehicleField() y cualquier operación que pueda modificar el mismo campo de imagen durante la validación de referencias. El protocolo debe cubrir la ventana lectura→Drive→escritura→confirmación y no depender solo de comparar la URL antes/después.

### AUG-037 — Reconciliación durable de cargas generales Drive/Spreadsheet
- **Origen:** H-AUD-031-002, H-AUD-031-005 y H-AUD-031-006. **Prioridad:** Alta.
- **Problema:** las cargas generales reutilizan archivos por token/nombre, MIME y tamaño sin volver a verificar los bytes; markImageUploadLinked() puede fallar sin bloquear el éxito; no se encontró un proceso que reconcilie archivos pending con referencias de Spreadsheet o detecte huérfanos recuperables.
- **Criterios de aceptación:** recalcular hash del archivo recuperado y compararlo con el payload/token esperado; verificar operación, carpeta, MIME, tamaño y contenido; confirmar por lectura posterior el registro durable y el estado de Drive; definir un ledger o mecanismo durable para relacionar operación↔archivo↔referencia; reconciliar pending en los casos referencia presente, referencia ausente, archivo faltante, archivo alterado y respuesta perdida; evitar borrar archivos sin evidencia; definir límites de tamaño y comportamiento cuando la persistencia local del intento no esté disponible; probar WRITE y ADMIN en copias aisladas.
- **Relación:** AUD-T-031, AUD-T-033/AUG-034 y tareas de recuperación de add_cortes.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

### AUG-038 — Compensación coherente de reemplazos in-modal y descarte de edición
- **Origen:** H-AUD-031-001, H-AUD-031-004, H-AUD-031-007 y H-AUD-031-008. **Prioridad:** Alta.
- **Problema:** el reemplazo se confirma inmediatamente, pero exitModalEditMode(false) puede restaurar la URL anterior sin actualizar AdminImageUploads, historial REP-<opId> ni archivo Drive; los fallos al actualizar historial no siempre escalan a requires_review; la restauración de campos no se verifica.
- **Criterios de aceptación:** definir si un reemplazo confirmado es irreversible desde «Descartar cambios» o si debe existir compensación transaccional explícita; mantener coherentes URL activa, ledger, historial y estado del archivo; no declarar cancelled si una fase de rollback no se confirmó; marcar requires_review y conservar evidencia cuando falle cualquier compensación; verificar por lectura posterior cada campo restaurado; definir política de reactivación de archivos en papelera después de una operación linked; probar descarte después de reemplazo exitoso, fallos parciales, respuesta perdida, cambios concurrentes y archivo eliminado posteriormente.
- **Relación:** AUD-T-031, AUD-T-033/AUG-034 y AUG-037.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

### Adenda AUD-T-031 — unicidad de vehicleId en reemplazos
- **Origen:** H-AUD-031-010. **Relación:** AUG-035.
- **Criterio adicional:** handleUploadAdminImage() debe exigir exactamente una fila Cortes para vehicleId; cero o más de una coincidencia debe detener la operación sin tocar Drive ni Spreadsheet.


### Adenda AUD-T-032 — endpoint debug público de WRITE
- **Origen:** inspección complementaria durante AUD-T-032. **Relación:** AUG-024.
- **Evidencia:** Services/write.js, doGet(), rama debug=true.
- **Hallazgo:** la respuesta contiene spreadsheetId, driveFolderId y sheetsAccessed; esos identificadores y detalles internos no son necesarios para el health check público.
- **Criterio adicional:** verificar el deployment actual y devolver únicamente identidad del servicio, versión y estado seguro; no exponer IDs internos, nombres/estructura de hojas, cache keys, stack traces ni credenciales.

### AUG-039 — Completar autorización y minimización de datos en WRITE
- **Origen:** H-AUD-032-001, H-AUD-032-002 y H-AUD-032-003. **Prioridad:** Alta.
- **Problema:** addSupplementaryInfo muta Cortes/Drive sin validar sesión; checkOperation devuelve rowData completo sin comprobar sesión; allocateVehicleId permite a cualquier colaborador autenticado incrementar el contador aunque su consumidor previsto sea ADMIN.
- **Criterios de aceptación:**
  1. Validar userId/sessionToken contra ActiveSessions y resolver la identidad en Users antes de ejecutar addSupplementaryInfo; ninguna escritura en Cortes/Drive debe ocurrir si la sesión falta, no coincide o fue revocada antes de iniciar la operación.
  2. Actualizar todos los callsites de ui.js para apertura/alimentación y add_cortes.html handleStage3Submit() para transmitir el contexto de sesión. El flujo silentRegister debe seguir enviando credenciales al router ADMIN y superar assertDeveloperSession().
  3. Exigir sesión válida en checkOperation y limitar su respuesta a exists, pending/operationStatus cuando aplique, vehicleId, timestamp, slotIndex y filesStatus si son necesarios. No devolver rowData completo. Definir si además se requiere vincular el opId al actor que lo creó.
  4. Restringir allocateVehicleId al rol Desarrollador o a una autorización de servicio equivalente verificable en servidor; no permitir reservas arbitrarias por usuarios ordinarios.
  5. Probar en una copia aislada sesiones válidas, ausentes, inválidas, userId/token no coincidentes y sesiones revocadas; comprobar ausencia de mutaciones ante rechazo; probar roles ordinarios y Desarrollador, contador de IDs, respuesta mínima de checkOperation y todos los consumidores frontend.
  6. Mantener sin regresiones los controles existentes de addOrUpdateCut, addVinToVehicle y freezeCortesIds; no confiar en nombres o roles enviados por el cliente.
- **Relación:** AUD-T-032; AUD-T-024/AUG-016 para ciclo de sesión; AUD-T-033/AUG-003 para coordinación entre proyectos; AUD-T-035 para contratos frontend/backend.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

### Resultado AUD-T-033 — cierre de auditoría AUG-003
- La fuente se localizó en **Services/Utilities.js** (U mayúscula). La ruta en minúsculas de registros anteriores no coincide por capitalización.
- La versión 1.3.0 solo implementa migrateTimestamps; no implementa migrateYearRanges. api-config.js mantiene ambas acciones mapeadas. No se encontraron callsites frontend actuales.
- El servicio declara AUTH: NONE, no usa LockService ni contiene mecanismo de adquisición/propietario/expiración/liberación. migrateTimestamps limpia Hoja 1 antes de escribir el resultado.
- **Estado:** auditoría del contrato y alcance completada; se confirma que Utilities no es el coordinador compartido. El deployment publicado no fue verificado. La protección y alineación del servicio se trasladan a AUG-041; la coordinación interproyectos permanece en AUG-034.

### Adenda AUD-T-033 — ampliar AUG-034: coordinación compartida de mutaciones
- **Evidencia:** revisión actual de Services/write.js, Services/admin.js, Services/feedback.js y Services/Utilities.js.
- **Escritores FEEDBACK de Cortes:** suggestYear (lock local), recordLike (lock local), assignCollaborator (sin lock) y approveVideo (sin lock). Los locks locales no excluyen WRITE/ADMIN.
- **Rutas ADMIN sin lock local revalidado:** backupDatabase/backupDrive, restoreDatabase/restoreDrive, reorganizeDatabase, normalizeImages, organizePrimaryVehicleImages, validateAndRestoreAllTrashedImagesInSpreadsheet, updateVehicleField y driveCommand. Las rutas con lock local también deben participar en el coordinador común.
- **Rutas con lock local, no compartido:** addOrUpdateCut y addSupplementaryInfo en WRITE/ADMIN; VIN/IDs en WRITE; migración opId, uploadAdminImage, recuperación/borrado/movimiento de imágenes e inventario en ADMIN; suggestYear y recordLike en FEEDBACK.
- **Riesgos de snapshot:** organizePrimaryVehicleImages reutiliza referenceData en el lote; organizeUnusedImagesBatch reutiliza un referenceSnapshot para todos los archivos del lote. Un escritor de otro proyecto puede añadir una referencia después del snapshot.
- **Mantenimiento:** restoreDatabase reemplaza hojas; restoreDrive limpia y copia el árbol; reorganizeDatabase solicita freeze a WRITE pero ordena después de liberarse el lock WRITE. Deben usar ventana exclusiva y drenaje de operaciones.
- **Diseño:** contemplar lease/propietario/expiración/recuperación, liberación ante error, exclusión de mantenimiento y llamadas anidadas ADMIN→WRITE sin deadlock. No aceptar lock tokens del navegador ni afirmar atomicidad sin pruebas.

### AUG-040 — Asegurar las escrituras de FEEDBACK sobre Cortes
- **Origen:** H-AUD-033-002 a H-AUD-033-005. **Prioridad:** Alta.
- **Problema:** assignCollaborator escribe Cortes sin sesión/rol ni lock; recordLike confía en userId/userName del cliente; suggestYear permite identificadores anónimos fabricables que cuentan para el umbral automático; approveVideo valida rol, pero no coordina ni garantiza la actualización conjunta Feedbacks/Cortes.
- **Criterios de aceptación:**
  1. Declarar explícitamente acciones públicas y protegidas; las acciones no declaradas deben rechazarse.
  2. Retirar assignCollaborator si no tiene consumidor vigente; si se conserva, validar sesión/rol, derivar Nombre_Completo desde Users y validar slot.
  3. Validar sesión para recordLike y deduplicar likes en backend por actor/vehículo/corte; si se permiten likes anónimos, establecer límites server-side.
  4. No contar IDs de localStorage como prueba de aportantes distintos para modificar Cortes automáticamente; requerir actor verificable o revisión para votos anónimos.
  5. Aprobar vídeos con lock/coordinación, confirmar que el vehículo existe y que videoGuiaDesarmeUrl quedó escrito; implementar idempotencia/reconciliación si falla una de las dos hojas.
  6. Probar peticiones directas, identidad falsificada, roles, votos duplicados/anónimos, destino ausente y concurrencia interservicios.
- **Relación:** AUD-T-033/AUG-034; AUD-T-035 para contratos de acciones.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

### AUG-041 — Asegurar y alinear el servicio UTILITIES
- **Origen:** H-AUD-033-006 y H-AUD-033-007; adenda a AUG-003. **Prioridad:** Alta.
- **Problema:** Services/Utilities.js v1.3.0 declara AUTH: NONE; migrateTimestamps limpia Hoja 1 antes de escribir y no usa lock. migrateYearRanges está mapeada, pero el handler no existe. El deployment no fue verificado.
- **Criterios de aceptación:**
  1. Verificar el código exacto del deployment UTILITIES y compararlo con el archivo del repositorio.
  2. Implementar migrateYearRanges o retirar su mapeo si ya no es un requisito vigente.
  3. Proteger migrateTimestamps con autorización backend o retirarlo si está obsoleto.
  4. Generar y verificar el resultado en staging antes de sustituir Hoja 1; soportar rollback/recuperación y serializar ejecuciones.
  5. Probar llamadas no autorizadas, dos ejecuciones simultáneas, timeout/fallo después de staging, origen vacío y destino incompatible.
  6. No tratar este servicio como coordinador hasta que exista un protocolo interproyectos demostrado.
- **Relación:** AUG-003 (auditoría completada), AUG-034/AUD-T-033 (coordinación).
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

### Adenda AUD-T-034 — ampliación de AUG-006, AUG-016 y AUG-017

**AUG-006 — cierre de sesión con revocación backend**
- Además de revocar ActiveSessions en servidor, el cierre local debe borrar currentUser y SessionToken del estado en memoria, cerrar/resetear modales privilegiados y limpiar sus datos DOM. La eliminación de localStorage por sí sola no invalida la sesión remota ni elimina el token que sigue en window.state.
- Si falla la revocación por desconexión, informar estado pendiente sin dejar disponibles acciones privilegiadas desde la instancia.

**AUG-016 — consistencia del ciclo de sesión**
- Incluir cambios de Privilegios: handleUpdateUser modifica el rol sin revocar sesiones y handleValidateSession solo devuelve valid, no el perfil/rol vigente.
- Definir si un cambio de rol invalida las sesiones objetivo o si el cliente recibe un perfil actualizado; una sesión no debe conservar permisos visuales obsoletos.

**AUG-017 — restablecer controles de navegación**
- showApp debe asignar explícitamente display para Inbox y Dashboard tanto en roles permitidos como no permitidos.
- Resolver la diferencia: getFeedbackItems permite Jefe, pero showApp no muestra Inbox a Jefe. Mantener Dashboard/getActivityLogs fuera de Jefe si esa es la política aprobada.
- renderInboxDetail usa currentUser.Rol, pero AUTH entrega Privilegios; corregir el contrato para que los botones de aprobación coincidan con FEEDBACK actionPermissions.
- Cerrar/resetear modales y contenidos al cambiar de cuenta/rol; no dejar que el contenedor oculto conserve vistas privilegiadas que reaparecen al mostrarlo.

### AUG-042 — Sincronizar el rol y limpiar el estado privilegiado en el cliente
- **Origen:** H-AUD-034-001 a H-AUD-034-004. **Prioridad:** Alta.
- **Problema:** logout conserva currentUser/token en memoria y no cierra/limpia modales; el cambio de rol no refresca la sesión; la navegación no oculta siempre controles y hay un contrato de rol inconsistente en Inbox.
- **Criterios de aceptación:**
  1. Limpiar currentUser/SessionToken en memoria y cerrar/resetear dev-tools-modal, replaced-images-modal, inbox-modal y dashboard-modal ante logout, invalidación o cambio de cuenta; vaciar listas, consola, detalles y caches sensibles.
  2. Integrar con AUG-006 para revocar la sesión invocante en ActiveSessions. No permitir que window.state/window.ui reutilicen el token anterior después del cierre local.
  3. Actualizar el rol desde el servidor o invalidar sesiones al cambiar Privilegios; definir explícitamente el comportamiento de auto-cambio de rol y de sesiones abiertas en otros dispositivos.
  4. Guardas frontend para abrir panel, historial, Inbox y Dashboard según rol vigente, manteniendo la autorización backend.
  5. Unificar el campo de rol usado por AUTH, UI y renderInboxDetail; probar botones approve/reject para Desarrollador, Gefe y Supervisor.
  6. Matriz de pruebas: logout con modal abierto; Developer→Técnico y Supervisor→Jefe en la misma instancia; ascenso de rol; sesión remota revocada; login consecutivo de dos cuentas; llamada directa a funciones globales; Jefe/Inbox según política aprobada.
- **Relación:** AUG-006, AUG-016, AUG-017; AUD-T-024 y AUD-T-034.
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

### AUG-043 — Alinear contratos de acciones protegidas y ciclo de aprobación de YouTube
- **Origen:** H-AUD-035-001 a H-AUD-035-004. **Prioridad:** Alta.
- **Problema:** varios consumidores FEEDBACK omiten userId/sessionToken requeridos; youtubeUpload.js utiliza currentUser.id en vez de currentUser.ID; el enlace manual de vídeo envía campos no reconocidos; el flujo de aprobación PYS/Tutorial publica antes de aprobar; opVideoId se confunde con videoId y no se conserva para idempotencia.
- **Criterios de aceptación:**
  1. Corregir los callsites de addVehicleToProblem, removeVehicleFromProblem, updatePysItem, updateTutorialItem, initYouTubeUpload y submitVideoForApproval para enviar ID canónico y SessionToken de la sesión vigente. No confiar en userRole del navegador; mantener la matriz de roles en backend.
  2. En youtubeUpload.js, comprobar que existe una sesión válida antes de iniciar; utilizar currentUser.ID y currentUser.SessionToken; no degradar a usuario genérico ni enviar credenciales incompletas.
  3. Separar opVideoId de videoId real. Persistir y transmitir opVideoId durante todo el flujo; hacer idempotente submitVideoForApproval para que un reintento de la misma operación no cree una segunda solicitud.
  4. Confirmar que la subida terminó y que YouTube devolvió un ID real antes de crear la solicitud. No construir enlaces watch?v= con IDs provisionales, timestamps o valores ficticios; ante respuesta incompleta, detener y dejar la operación en estado recuperable.
  5. Definir y aplicar la política de aprobación para contentType corte, pys y tutorial. Ninguna URL pendiente debe quedar publicada en Cortes/pys/Tutorial antes de aprobar; la aprobación debe vincular el vídeo al destino correcto y el rechazo no debe dejar un enlace visible.
  6. Resolver el enlace manual de openAddVideoModal: implementar una acción backend explícita con sesión/validación que actualice videoGuiaDesarmeUrl, o retirar la opción manual. No enviar fieldName/fieldValue a addSupplementaryInfo si el handler no los procesa.
  7. Probar cada acción protegida con sesión válida, ausente, inválida, revocada, userId/token no coincidentes y rol no permitido; verificar los callsites desde UI.
  8. Probar subida completa, error de YouTube, respuesta sin ID, cancelación, pérdida de respuesta, reintento, doble envío, aprobación y rechazo para cada contentType; comprobar que no hay publicaciones ni solicitudes duplicadas.
- **Relación:** AUD-T-035; AUG-006/AUG-016/AUG-042 (sesión/rol cliente); AUG-040 (seguridad y consistencia FEEDBACK); AUG-039 (acciones suplementarias WRITE/ADMIN).
- **Estado:** NUEVA; diseño, implementación y pruebas pendientes.

### AUG-044 — Reconciliar mapa central de acciones y dispatchers de servicios
- **Origen:** H-AUD-035-005. **Prioridad:** Media.
- **Problema:** ACTION_TO_SERVICE_MAP contiene rutas sin handler (addCorte, migrateYearRanges); WRITE/FEEDBACK conservan handlers sin mapeo (getHeaders, assignCollaborator); la acción LEGACY logFrontend depende de una fuente/deployment externo no presente en el repositorio.
- **Criterios de aceptación:**
  1. Definir una fuente de verdad de acciones cliente: cada acción mapeada debe existir en el dispatcher del servicio indicado; cada handler expuesto al cliente debe tener mapeo explícito o documentarse/retirarse como interno/obsoleto.
  2. Implementar addCorte y migrateYearRanges solo si siguen siendo requisitos vigentes; si están sustituidas, retirar el mapeo y conservar trazabilidad de la sustitución.
  3. Para getHeaders y assignCollaborator, decidir si siguen soportadas; si no, retirar handlers obsoletos de forma controlada; si sí, añadir el mapeo y validar contrato/seguridad, especialmente assignCollaborator bajo AUG-040.
  4. Verificar el destino y contrato LEGACY/logFrontend; documentar la fuente del servicio o mantenerlo explícitamente como dependencia externa.
  5. Agregar pruebas estáticas/automatizadas que comparen ACTION_TO_SERVICE_MAP con los dispatchers y detecten rutas sin handler, handlers sin mapa y destinos incorrectos.
- **Relación:** AUD-T-035; AUG-040 (assignCollaborator); AUG-041 (Utilities/migrateYearRanges); AUD-T-026/AUG-024 (health check y endpoints).
- **Estado:** NUEVA; decisión de alcance, implementación y pruebas pendientes.

### Adenda AUD-T-035 — AUG-040: integridad de imagen en alta PYS
- **Evidencia:** Services/feedback.js, handleAddProblem(). El formulario UI marca imagen required, pero el backend no exige imgBase64; el catch de Drive permite continuar y guardar imageUrl vacío con status success.
- **Criterio adicional:** definir la imagen como obligatoria también en servidor si ese es el contrato vigente; si la carga Drive falla, no confirmar el alta como completa ni dejar un registro parcial sin estado. Diseñar compensación si se crea el archivo y falla la escritura de la fila; probar fallo de Drive, payload sin imagen y error al guardar la hoja.
