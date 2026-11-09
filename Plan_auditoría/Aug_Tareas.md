# Índice activo del registro AUG — GPSpedia

El registro histórico de tareas derivadas se conserva en:
- `Olds/Documentacion_Legacy/Aug_Tareas_legacy_parte_001.md` (179701 caracteres)
- `Olds/Documentacion_Legacy/Aug_Tareas_legacy_parte_002.md` (5472 caracteres)
Los IDs AUG existentes permanecen reservados; no duplicar ni renumerar. Las tareas y adendas nuevas se agregan al final. Coordinar estados vigentes con Plan_Maestro_Implementacion.md.


**Regla:** no borrar, truncar, sobrescribir ni reordenar entradas; agregar cada entrada al final. Verificar antes que el resultado no supere 180,000 caracteres Unicode. Si excede, rotar según `Plan_auditoría/Normas_Gestion_Documental.md`.



## Índices operativos de tareas — 2026-11-09
El registro histórico permanece inmutable en Olds/Documentacion_Legacy/Aug_Tareas_legacy_parte_001.md y parte_002.md.
La lista operativa independiente con requisitos se distribuye en:
- Tareas_pendientes_parte1.txt (AUG-001 a AUG-099).
- Tareas_pendientes_parte2.txt (AUG-100 a AUG-152 y adendas).
- Tareas_pendientes_parte3.txt y parte4.txt (registros legacy abiertos/parciales pendientes de reconciliación).
Los cierres demostrados se registran en tareas_completadas_parte1.txt. Las funcionalidades diferidas se registran en lista_beta.txt.
Compuerta: no marcar implementaciones

**Rectificación de compuerta — 2026-11-09:** el cierre de una tarea de implementación depende de requisitos y validaciones locales aprobadas. La ausencia de deployments, endpoints operativos o pruebas integradas de Beta no impide marcarla COMPLETADA si la evidencia local satisface sus criterios. Esas validaciones se etiquetan **VALIDACIÓN DIFERIDA A BETA** y se ejecutan después de terminar las implementaciones. Norma canónica: `Plan_auditoría/Normas_Gestion_Documental.md`, sección 7. Esta rectificación prevalece sobre interpretaciones anteriores que condicionaban el cierre a Beta.
 como completadas sin revisión sintáctica registrada y validaciones obligatorias. AUG-015 continúa ausente; no crear ni reutilizar ese ID.


================================================================================
ADENDA DE ÍNDICE — 2026-11-09
AUG-153 se incorpora al registro operativo de Tareas_pendientes_parte2.txt. El rango operativo de la parte 2 queda extendido de AUG-100–AUG-152 a AUG-100–AUG-153. El inventario vigente comprende 152 IDs únicos entre AUG-001 y AUG-153; AUG-015 continúa ausente y no se crea ni reutiliza.
Corrección de H-AUD-057: AUG-100 conserva como tarea canónica el sistema universal de estilos y estados de botones. La centralización de ActiveSessions se registra como AUG-153; no se reescriben entradas históricas.
================================================================================


================================================================================
AUG-005 — REVOCAR SESIONES Y DESACTIVAR CUENTAS DE FORMA SEGURA
Estado: COMPLETADA EN FUENTES (2026-11-09).
H-AUD-053 resuelto; H-AUD-054 resuelto mediante eliminación lógica, sin borrar filas ni reindexar Users.ID. deleteUser y la revocación se centralizaron en AUTH bajo el lock común; AUTH valida usuario único/activo; login revalida bajo lock; IDs nuevos UUID estáticos; UI/backend impiden autodeleción.
Pruebas locales: lógica 20/20 y sintaxis PASS. Pruebas funcionales en deployments aislados quedan diferidas a Beta.
================================================================================


ADENDA DE VERIFICACIÓN — AUG-005
La revisión final amplió la protección de Users.ID: antes de cambiar nombre/rol, AUTH obtiene los valores calculados de todos los IDs existentes, rechaza filas con datos sin ID y cualquier ID duplicado, y escribe esos valores como constantes. Esto evita que fórmulas históricas dependientes de nombre, fila u otros campos cambien al desactivar la cuenta. Las cuentas nuevas ya no copian fórmulas: solo copian formato y validación de datos y escriben UUID estático. La batería final quedó en 20/20 pruebas lógicas PASS; las pruebas incluyen IDs duplicados/vacíos y preservación de valores. Sintaxis PASS en cuatro scripts Apps Script, api-config.js y script inline users.html.


ADENDA FINAL POST-REVISIÓN — AUG-005 / H-AUD-059
Se incorporó Services/feedback.js al alcance: assertFeedbackSession ahora rechaza usuarios tombstone y roles no activos incluso cuando allowedRoles es null. ADMIN ya rechazaba por rol Desarrollador y WRITE por nombre completo vacío; AUTH y USERS validan explícitamente el estado activo. Batería combinada final: 20/20 pruebas lógicas PASS (13 de eliminación/IDs/concurrencia AUTH + 3 del guard FEEDBACK). Sintaxis de Services/feedback.js PASS. No se ejecutaron deployments ni endpoints reales; pruebas funcionales aisladas/concurrentes siguen diferidas a Beta.


VERIFICACIÓN FINAL AMPLIADA — 2026-11-09
Batería lógica consolidada: 20/20 PASS (13 casos AUTH/USERS de eliminación, IDs y login concurrente; 3 casos FEEDBACK; 2 casos ADMIN; 2 casos WRITE). Se comprobaron cuentas activas aceptadas y tombstones rechazados por todos los consumidores de sesión. Sintaxis completa PASS también en Services/admin.js y Services/write.js (sin cambios en esos archivos). Los deployments reales siguen pendientes para Beta.


================================================================================
CIERRE LOCAL — AUG-006 Y AUG-153 — 2026-11-09
AUG-006: COMPLETADA. Sintaxis PASS en backend AUTH y cliente auth.js; logout mocked 2/2 PASS y limpieza de estado en memoria PASS. El backend invalida el token invocante y el cliente diferencia cierre local de revocación remota pendiente.
AUG-153: COMPLETADA. AUTH es único escritor de ActiveSessions; USERS solo consulta; resetUserSessions se enruta a AUTH y valida ambos usuarios antes de eliminar sesiones bajo el mismo ScriptLock. Sintaxis PASS en cuatro copias AUTH/USERS; validación de ruteo y dispatch PASS; harness de revocación remota 5/5 PASS.
La concurrencia real de Google Apps Script, la integración con deployments y la comprobación de fallos físicos quedan como validación diferida a Beta, no como impedimento para el cierre local.
================================================================================

CORRECCIÓN DEL FORMATO DE Users.ID — 2026-11-09
Se reemplaza la generación UUID para nuevas cuentas mencionada en las adendas anteriores de AUG-005. El formato vigente es secuencial y permanente: `USR-0001`, `USR-0002`, etc. USERS calcula el siguiente número bajo su ScriptLock, detecta IDs duplicados o filas con datos sin ID y escribe el resultado como valor fijo. La fila nueva recibe formato y validaciones, nunca la fórmula de ID. Los IDs de cuentas desactivadas se conservan y no se reutilizan.
Pruebas locales del generador: 6/6 PASS (inicio sin cuentas, incremento, máximo existente, cuenta desactivada, duplicado y fila con datos sin ID).
================================================================================


ADENDA DE VERIFICACIÓN — IDs USR Y FILAS CON FÓRMULA — 2026-11-09
La validación del generador de IDs se amplió a 9/9 PASS: secuencia vacía/inicial, incremento, máximo existente, cuenta desactivada, duplicados, fila con datos sin ID y reutilización de filas vacías que contienen fórmula en Users.ID. Se verificó que la primera cuenta usa USR-0001 incluso si la fila de plantilla ya contiene fórmula; la siguiente recibe USR-0002. La fila nueva se escribe con ID estático y la fórmula queda sustituida en esa fila.
La copia de prueba de USERS coincide con la fuente de producción, excepto por el Spreadsheet ID aislado. Sintaxis PASS en ambas.


================================================================================
ADENDA DE ESTADO — AUG-007 — 2026-11-09
Política aprobada e implementada en fuentes: tres meses calendario absolutos y un mes calendario de inactividad. AUTH centraliza el registro de actividad, validación y revocación por cambio/restablecimiento de contraseña; USERS, ADMIN, FEEDBACK y WRITE aplican los límites. Restablecimiento administrativo de contraseña y cierre remoto de sesiones reservados a Desarrollador. Sintaxis y pruebas locales PASS; validación funcional aislada diferida a Beta.
Siguiente tarea de la ola: AUG-008 — coordinación de validación y sincronización entre pestañas.
================================================================================


================================================================================
ADENDA DE ESTADO — AUG-008 — 2026-11-09
Estado: COMPLETADA EN FUENTES; validación funcional multi-pestaña diferida a Beta.
Alcance implementado: coordinación Web Locks; cancelación temporizada de validateSession; marca SessionValidatedAt en la sesión local, válida diez segundos para el mismo userId/token; respuestas token-aware; sincronización de cambios de sesión en index.html, users.html y add_cortes.html.
Archivos: auth.js, api-config.js, users.html y add_cortes.html.
Verificación local: sintaxis 4/4 PASS; simulación de dos contextos con una sola validación PASS; respuesta obsoleta A no cierra B PASS; logout obsoleto no altera B PASS; propagación de cierre PASS.
H-AUD-062 y H-AUD-063: RESUELTOS EN FUENTES. No se ejecutaron pruebas en navegador real, Apps Script ni deployments aislados. La prueba funcional multi-pestaña se registra en lista_beta.txt.
Siguiente tarea de la ola: AUG-009 — validar el nombre de usuario en el backend.
================================================================================
