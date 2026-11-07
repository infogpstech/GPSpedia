# CONTEXTO PERSONAL — GPSpedia

## Procedimiento único autorizado para realizar commits

Para cualquier tarea de desarrollo en el repositorio infogpstech/GPSpedia, el único procedimiento autorizado para generar y publicar commits es el flujo Git Database API de GitHub descrito a continuación. Esta regla complementa las instrucciones del documento Proceso de desarollo.md y no autoriza a eliminar, reemplazar ni debilitar ninguna otra regla del proyecto.

1. **Verificar antes de escribir:** confirmar repositorio, rama de trabajo autorizada, HEAD actual de esa rama y HEAD de la rama base protegida. El HEAD confirmado de la rama de trabajo será tanto el parent_sha del nuevo commit como el expected_sha de la actualización de referencia. Si el estado no coincide con el esperado, detenerse y volver a auditar.
2. **Crear los blobs:** utilizar create_blob una vez por cada archivo nuevo o modificado. Estas operaciones almacenan contenido y no deben crear commits ni mover referencias.
3. **Crear un único árbol:** utilizar create_tree una sola vez, incorporando todos los blobs de la tarea y utilizando como base_tree_sha el árbol del HEAD confirmado. Conservar todos los archivos ajenos al alcance.
4. **Crear un único commit:** utilizar create_commit una sola vez, con el árbol recién creado y parent_sha igual al HEAD confirmado. Incluir en ese commit todos los cambios de código y documentación de la tarea.
5. **Actualizar la rama autorizada:** utilizar update_ref una sola vez para mover exclusivamente la rama de trabajo al SHA del commit creado, con force:false y expected_sha igual al HEAD confirmado. No actualizar la rama base protegida ni realizar merges.
6. **Verificar:** comprobar el commit, su padre, los archivos incluidos, el nuevo HEAD de la rama de trabajo y que la rama base protegida permanezca intacta.

### Prohibiciones

- No utilizar GitHub Contents API ni operaciones que creen commits automáticamente por archivo.
- No utilizar la interfaz web de GitHub, Git local, git commit, git push ni otros mecanismos alternativos para crear o publicar commits.
- No crear commits intermedios, por archivo, por documento o para guardar checkpoints por separado.
- No utilizar force:true ni reescribir el historial.
- No actualizar ramas protegidas ni hacer merge sin autorización expresa; este procedimiento no autoriza ninguna de esas acciones.
- Mantener la regla de que checkpoint.md se actualiza como último paso documental antes del único commit.

### Condiciones de detención

Si falla la creación de un blob, del árbol o del commit, detenerse; no crear un commit parcial ni utilizar otro método. Si falla update_ref, comprobar el estado real de la rama y no crear otro commit ni cambiar expected_sha para forzar la publicación. Si el estado no puede verificarse con certeza, detenerse e informar al usuario.

Si la verificación final detecta archivos inesperados, un padre distinto, una rama incorrecta o cambios en la rama protegida, no declarar la tarea completada y detener cualquier operación adicional.

**Regla absoluta:** todas las tareas se publican mediante un solo commit creado con create_blob → create_tree → create_commit → update_ref con expected_sha. No existe otro procedimiento autorizado.


## Ramas autorizadas del flujo actual de GPSpedia

Para el repositorio `infogpstech/GPSpedia`, la referencia de trabajo vigente confirmada el 2026-11-06 es:

- **Rama de trabajo:** `GPSpedia2.2.5_work`.
- **Rama base del flujo:** `GPSpedia2.2.5`.
- Continuar las tareas de este flujo directamente sobre `GPSpedia2.2.5_work`; no crear ramas nuevas salvo instrucción expresa del usuario.
- No actualizar, modificar ni fusionar cambios directamente en `GPSpedia2.2.5`.
- La referencia anterior `fix/pys-carousel-card-sizing-print-images` está desactualizada y no debe utilizarse para este flujo.
- Para cualquier commit, confirmar nuevamente ambos HEAD y aplicar el procedimiento único Git Database API descrito arriba. El único ref que se puede actualizar en este flujo es `GPSpedia2.2.5_work`.
- GitHub API devolvió `protected:false` para ambas ramas el 2026-11-06. La base se mantiene protegida por el procedimiento interno, pero todavía no consta protección técnica de rama configurada en GitHub.

## Auditoría global de GPSpedia — objetivo, alcance y papel obligatorio del auditor

Esta sección registra el marco de trabajo de la auditoría global **AUD-PLAN-2026-001**, que comprende las unidades AUD-T-001 a AUD-T-037 y sus tareas derivadas. Es de cumplimiento obligatorio para cada iteración de auditoría. Complementa las reglas de `Proceso de desarollo.md`; no las reemplaza, reduce, modifica ni autoriza a omitir ninguna fase.

### Objetivo general

Examinar el estado real del código vigente y la trazabilidad de los cambios históricos para detectar incumplimientos, defectos, riesgos de seguridad, problemas de integridad, fallos funcionales, regresiones y deuda técnica que pueda afectar al sistema. La auditoría no debe limitarse a comprobar los cambios del commit que originó una tarea: debe determinar si el problema sigue presente, si fue corregido completamente, si reapareció o si una modificación posterior introdujo un defecto nuevo.

### Papel y responsabilidades obligatorias del auditor

El auditor deberá realizar una revisión técnica completa:

- Archivo por archivo, línea por línea y función por función.
- Identificar el estado actual del código, su comportamiento, dependencias internas y externas, contratos entre frontend y backend, efectos colaterales y funcionalidades relacionadas.
- Contrastar el código vigente con los requerimientos, tareas, commits, diffs, checkpoints, auditorías y registros históricos pertinentes. No asumir que una tarea marcada como completada, un commit de corrección o una prueba histórica garantizan que el problema esté resuelto en el HEAD actual.
- Detectar tanto defectos nuevos como problemas anteriores que continúen sin resolverse, correcciones incompletas, regresiones, soluciones parciales y errores reintroducidos.
- Revisar seguridad, autorización, validaciones, manejo de errores, consistencia de datos, persistencia, compatibilidad, rendimiento y confiabilidad cuando estén relacionados con el alcance o puedan verse afectados por él.
- Examinar código duplicado, funciones huérfanas, funciones sin uso, rutas inalcanzables, referencias inválidas, contratos inconsistentes y diferencias entre código productivo y copias o pruebas.
- Detectar errores de sintaxis y de lógica, condiciones incorrectas, comparaciones o conversiones inseguras, valores nulos/indefinidos no contemplados, errores de tipos, nombres de variables/funciones/campos mal escritos, typos, inconsistencias de nomenclatura, cadenas o claves incorrectas y discrepancias entre comentarios/documentación y comportamiento real.
- Evaluar efectos colaterales y posibles impactos indirectos en otras funciones, servicios, datos y flujos. No considerar segura una modificación solo porque compile o pase una prueba aislada.

### Detección obligatoria de condiciones de carrera y problemas de concurrencia

La auditoría deberá buscar activamente cualquier situación que pueda producir condiciones de carrera, lecturas obsoletas, pérdida o sobrescritura de datos, duplicación de operaciones, estados inconsistentes o resultados dependientes del orden/timing de ejecución. Como mínimo deberá examinar, cuando aplique:

- Operaciones concurrentes de lectura-modificación-escritura y escrituras no atómicas.
- Alcance, adquisición, liberación, expiración y tiempo de espera de locks; rutas que no usan lock; locks que se liberan antes de terminar el trabajo protegido; y coordinación entre servicios/proyectos.
- Peticiones simultáneas, doble clic, reintentos, reentradas, solicitudes duplicadas, idempotencia y recuperación después de fallos parciales.
- Operaciones asíncronas, callbacks, promesas, eventos, temporizadores, ejecución fuera de orden y uso de resultados que ya quedaron obsoletos.
- Sincronización entre pestañas/ventanas, sesiones, cachés, estado local, estado remoto y procesos en segundo plano.
- Actualizaciones concurrentes de usuarios, sesiones, inventarios, catálogos, registros y hojas de cálculo; asignación de IDs; y consistencia entre Drive, Spreadsheet y servicios.
- Interbloqueos, bloqueos demasiado amplios, ventanas sin protección, estados compartidos mutables y secuencias que puedan dejar datos o interfaces en estados parciales.

No bastará con mencionar que existe un lock: se deberá comprobar que protege toda la sección crítica, que cubre las operaciones concurrentes reales y que la coordinación es efectiva en el contexto de ejecución correspondiente.

### Carácter diagnóstico y registro de hallazgos

Durante la auditoría inicial está prohibido modificar o corregir código, reorganizar funciones o eliminar contenido. La auditoría es diagnóstica. Cada hallazgo deberá registrarse en `Auditoría.txt`, con evidencia, ubicación, impacto, severidad, alcance y relación con otros hallazgos/tareas cuando corresponda. Se conservarán los registros anteriores.

Los problemas fuera del alcance deberán evaluarse conforme a `Proceso de desarollo.md`: solo podrán corregirse dentro de la tarea si la solución es completamente segura y no amplía su alcance; de lo contrario, se registrarán como tarea independiente en `Tareas.txt` y se referenciarán desde `Auditoría.txt`. No se deberán duplicar tareas existentes.

### Reglas de ejecución y cierre

Cada unidad AUD-T tendrá su propio checkpoint y sesión. Antes de iniciar la auditoría de código se confirmarán nuevamente los HEAD de las ramas autorizadas y se actualizará el checkpoint. Se distinguirán los hallazgos estáticos de las pruebas ejecutadas y de las validaciones reales; nunca se declarará validación funcional si no se realizaron las pruebas requeridas.

Se deberán respetar todas las fases de `Proceso de desarollo.md`: checkpoint inicial/final, auditoría, registro de hallazgos, manejo de hallazgos fuera de alcance, respaldo exacto antes de editar, implementación estrictamente acotada cuando corresponda, pruebas funcionales/regresión, comparación post-edición, integridad/efectos colaterales, revisión final, ChangesLogs, Tareas y protocolo de Code Review. Si Code Review encuentra errores, riesgos, regresiones, efectos colaterales o cambios requeridos, se reiniciará el procedimiento completo desde la auditoría inicial. La sección Safety & Side Effects tendrá el tratamiento obligatorio establecido en ese documento.

### Iteración de auditoría vigente al registrar esta sección

**AUD-T-023 — Seguridad ADMIN 0, registro de credenciales, hashing y migración.**

- **Plan:** AUD-PLAN-2026-001.
- **Objetivo específico:** verificar el diseño y la implementación vigentes de protección de credenciales, almacenamiento y verificación de contraseñas, hashing, compatibilidad/migración de credenciales históricas, límites de intentos, autorización relacionada con ADMIN 0 y protección de logs; detectar cualquier defecto que permanezca en el código actual o que haya sido introducido posteriormente.
- **Historial inicial a recuperar y contrastar:** `ed92f3a9b383c8d92f53f0ecf0fb146a37bba868` (autorización ADMIN y protección de credenciales); `2e0bbcf78db6b7d775f59a0eef396084a690059c` (hash SHA-256 y límite de intentos); `6a226c185637b5ec8f97c00b360aeee37f511041` (retirada de credenciales de logs AUTH).
- **Archivos identificados por esos cambios:** `Services/admin.js`, `Services/feedback.js`, `Services/Auth.js`, `Services/users.js`, además de los archivos de prueba, configuración, documentación y consumidores relacionados que el análisis de dependencias determine necesarios.
- **Punto de partida registrado:** HEAD de `GPSpedia2.2.5_work` = `9becc604474cfea4da16fbf0244beffef729e9ca`; HEAD de `GPSpedia2.2.5` = `d9acc68d889985c2e2f42fe3a02e502efc86ead1`. Estos valores son una referencia histórica de inicio y deberán volver a verificarse antes de cada operación.
- **Dependencia conocida que debe reexaminarse, no darse por resuelta:** AUD-T-002 detectó duplicación de helpers de hash entre AUTH y USERS y reservó su revisión coordinada para AUD-T-023. También se deberá comprobar el estado actual, no asumir que la duplicación o sus riesgos siguen exactamente iguales.
- **Estado actualizado al 2026-11-07:** auditoría estática AUD-T-023 completada en nivel E1/E2; hallazgos abiertos H-AUD-023-001 a H-AUD-023-008. No se corrigió código ni se ejecutaron pruebas funcionales, despliegues o consultas a la Spreadsheet. Se registraron tareas derivadas AUG-011 a AUG-014 y una ampliación de AUG-010. La siguiente unidad del plan es AUD-T-024.

La incorporación de estas reglas no sustituye el procedimiento único de commits ya establecido en este archivo. Cualquier publicación seguirá requiriendo un único commit mediante Git Database API en la rama de trabajo autorizada, con verificación de ambos HEAD, `force:false` y `expected_sha` igual al HEAD confirmado. La rama base no se modificará.



### Resultado de auditoría estática AUD-T-023 — 2026-11-07

- Sesión/checkpoint: AUD-20261107-S004 / AUD-CP-0004.
- HEAD auditado: 87d75c38d72e76ed60132d2507661f4e1017a0e8; rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Estado: auditoría estática E1/E2 completada; hallazgos abiertos y validación funcional pendiente.
- Hallazgos principales: SHA-256 de una sola pasada no es KDF especializada; la migración legacy puede sobrescribir un cambio de contraseña concurrente; las escrituras de contraseña en USERS no están serializadas; el contador de intentos puede perder fallos concurrentes; la purga de Logs puede competir con inserciones de AUTH; formatos de hash desconocidos se interpretan como legacy; discrepancia de validación de longitud en UI y typo.
- AUG-010 se amplía para incluir escrituras de contraseña y migración AUTH/USERS; AUG-011 a AUG-014 registran los trabajos nuevos. La coordinación entre proyectos se vincula con AUD-T-033.
- Los callsites actuales de AUTH examinados ya no registran payload de login ni contraseñas; clearSensitiveLogs está restringida a Desarrollador. No se pudo inspeccionar la hoja Logs real ni confirmar que la purga se haya ejecutado en producción.
- Las copias Services/Test/Auth.js y Services/Test/users.js coinciden con las fuentes vigentes salvo ID de Spreadsheet y diferencias menores de formato. No constituyen una suite automatizada.
- No se ejecutaron pruebas Apps Script, HTTP, navegador, Sheets o Drive.
- Siguiente acción: iniciar AUD-T-024 con checkpoint propio.



### Resultado de auditoría estática AUD-T-024 — 2026-11-07

- **Sesión/checkpoint:** AUD-20261107-S005 / AUD-CP-0005.
- **HEAD auditado:** 3e458bbf67fce2a95847f4f5a0bf5d72170d4eec; rama base: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- **Estado:** auditoría estática E1 completada; hallazgos abiertos y validación funcional pendiente.
- **Fuentes:** Services/Auth.js, Services/users.js, copias Test, auth.js, users.html, api-config.js, main.js, ui.js, state.js, index.html y README de pruebas.
- **Historial:** 2678ee02, 0666c1d1, 4bc9ac19 y b441a5be contrastados con las fuentes vigentes.
- **Hallazgos H-AUD-024-001 a H-AUD-024-010:** carrera de validación asíncrona entre pestañas; lock local no atómico y liberado antes de terminar HTTP; carrera de resetUserSessions con login entre proyectos; autodeleción y sesiones huérfanas; fallos parciales al crear/cerrar sesiones; visibilidad residual de Inbox/Dashboard; logout sin revocación backend; ausencia de expiración; AUTH no comprueba existencia del usuario.
- **Controles positivos:** límites de sesión por rol corregidos; AUTH serializa el bloque de login dentro de su proyecto; USERS deriva rol del token; resetUserSessions exige Desarrollador en backend; las copias Test están alineadas tras normalizar SPREADSHEET_ID.
- **Tareas:** AUG-005 a AUG-008 permanecen abiertas y se amplían; AUG-016 registra consistencia y recuperación de mutaciones; AUG-017 registra la visibilidad de navegación por rol; AUG-010 y AUD-T-033 mantienen la coordinación interproyectos.
- **Limitaciones:** evidencia E1 únicamente. No se ejecutaron pruebas de sintaxis/runtime, Apps Script, HTTP, navegador, Spreadsheet, Drive ni concurrencia real. No se verificaron deployments ni datos reales.
- **No se modificó código ni se realizaron despliegues.**
- **Siguiente unidad:** AUD-T-025 — herramientas ADMIN: base de datos, backup, restore, logs y mantenimiento.
