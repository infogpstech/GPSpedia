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
