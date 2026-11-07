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
