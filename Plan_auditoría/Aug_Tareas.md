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

