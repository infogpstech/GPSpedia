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



### Resultado de auditoría estática AUD-T-025 — 2026-11-07

- **Sesión/checkpoint:** AUD-20261107-S006 / AUD-CP-0006.
- **HEAD auditado:** 941dfb166ae5af4631d0711d50ab3d45cf7225c1; rama base: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- **Estado:** auditoría estática E1 completada; hallazgos abiertos y validación funcional pendiente.
- **Fuentes:** Services/admin.js, Services/feedback.js, ui.js, api-config.js, index.html, README.md y Services/Test/README.md.
- **Historial contrastado:** babf5ce4, 2678ee02, e5c49b1d, abc7102f, 8001b431 y 06c3b322.
- **Hallazgos H-AUD-025-001 a H-AUD-025-009:** restore DB sin rollback ni snapshot automático; restore Drive destructivo sin rollback; backup Drive recursivo sin manifiesto/reanudación y artefactos parciales aceptables; terminal Drive no restringida al árbol Cortes; getActivityLogs lee toda la hoja para devolver 100; timestamps inválidos no se clasifican durante la purga; logs ADMIN no persistentes; IndexedDB deleteDatabase no esperado; handlers createSheet/addColumn sin ruta canónica/consumidor.
- **Hallazgo anterior reconfirmado:** H-AUD-023-005/AUG-013 (purga Logs concurrente con inserciones AUTH); no se duplicó.
- **Controles positivos:** ADMIN exige Desarrollador para todas las acciones salvo ping; FEEDBACK protege consultas/purgas por rol; backups y restores validan identidad/tipo/nombre/ubicación; frontend mantiene confirmaciones y normalización de enlaces por tipo.
- **Tareas:** AUG-013 permanece abierta y se amplía; nuevas AUG-018 a AUG-023 documentan recuperación de restore, límite terminal Drive, escalabilidad/retención de actividad, auditoría persistente, borrado IndexedDB y acciones huérfanas.
- **Limitaciones:** evidencia E1 únicamente. No se ejecutaron pruebas Apps Script, HTTP, navegador, Drive, Spreadsheet, restauraciones, purgas ni concurrencia real. No se verificaron deployments ni datos reales.
- **No se modificó código ni se realizaron despliegues.**
- **Siguiente unidad:** AUD-T-026 — Telemetría, diagnóstico y health check de microservicios.

 
### Resultado de auditoría estática AUD-T-026 — 2026-11-07

- **Sesión/checkpoint:** AUD-20261107-S007 / AUD-CP-0007.
- **HEAD auditado:** eafb425abadc9ccda9964a5abd50d4ac020cf80a; rama base: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- **Estado:** auditoría estática E1 completada; hallazgos abiertos; validación funcional y verificación de backend/deployments pendientes.
- **Fuentes:** api-config.js, ui.js, index.html, style.css, main.js, auth.js, offline.js, youtubeUpload.js, README.md y Services/Test/README.md.
- **Historial contrastado:** e1defcb6 (recuperación del health check ADMIN) y 726727b6 (telemetría y diagnóstico).
- **Hallazgos H-AUD-026-001 a H-AUD-026-005:** ping ADMIN sin timeout puede bloquear el escaneo general; HTTP 2xx con cuerpo inválido/no reconocible puede marcarse online; no existen estados slow/unknown/stale ni presentación del código/motivo del error; la vista conserva métricas caducadas hasta el siguiente evento; la gráfica usa timestamp de finalización, puede excluir parte de la ventana y no avisa del límite de 600 eventos.
- **Controles positivos:** timeout independiente de ocho segundos por GET; aislamiento de errores; métricas locales sin payloads/credenciales; diferenciación expresa entre tráfico observado en este navegador y métricas globales/internas; tarjetas accesibles y gráfico SVG responsive.
- **Limitación crítica de evidencia:** las fuentes backend actuales y los deployments no están disponibles en el repositorio. El historial muestra respuestas debug que incluían IDs y nombres de hojas, pero no se confirma si la exposición persiste. La whitelist frontend no protege el cuerpo HTTP original.
- **Tareas:** AUG-024 para contrato seguro/estados/timeout y verificación de deployments; AUG-025 para vigencia y precisión temporal de métricas.
- **No se ejecutaron pruebas HTTP, navegador, Apps Script, Sheets o Drive. No se modificó código ni se desplegaron servicios.**
- **Siguiente unidad:** AUD-T-027 — Historial de imágenes reemplazadas y acciones de gestión.


## Normalización automática de nombres — 2026-11-07
- Rama de trabajo confirmada: GPSpedia2.2.5_work; rama base protegida: GPSpedia2.2.5.
- Se unificó la nomenclatura de imágenes en Services/admin.js y Services/write.js: modelo_versionesAplicables_tipoEncendido_anoDesde_tipoImagen.extensión.
- Los ocho campos de imagen usan sufijos estables; imagenVehiculo no agrega sufijo.
- normalizeImages corrige nombres de imágenes y segmentos de carpetas asociados a registros de Cortes cuando la coincidencia de carpeta es inequívoca.
- organizePrimaryVehicleImages también corrige el nombre de imagenVehiculo al organizar su ubicación.
- Corrección silenciosa por elemento; no hay confirmación individual. Los cambios/conflictos se registran en logs administrativos.
- Se conserva extensión, ID y URL. Las colisiones se omiten sin sobrescribir. Las referencias compartidas conservan las protecciones existentes.
- Imágenes huérfanas sin metadatos identificables y carpetas no asociables inequívocamente no se renombran por inferencia.
- Implementación estática y revisión de código completadas; pruebas reales de Apps Script/Drive/Spreadsheet y publicación pendientes.

- La instrucción del 2026-11-07 autoriza el renombrado canónico automático en normalizeImages y organizePrimaryVehicleImages y actualiza la restricción previa de no renombrar en esos flujos; no autoriza alterar la auditoría de inventario de solo lectura ni archivos huérfanos sin metadatos.


## Estado del proyecto — cierre de AUD-T-027 (2026-11-07)
- La rama de trabajo GPSpedia2.2.5_work quedó auditada desde HEAD 6932cf19d77c9c020a02e3d766b937f3175b8985; la rama base GPSpedia2.2.5 permaneció en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-027 — Historial de imágenes reemplazadas y acciones de gestión: auditoría estática E1 completada; hallazgos H-AUD-027-001 a H-AUD-027-008 abiertos o sujetos a decisión; validación funcional pendiente.
- Controles confirmados: autorización backend de ADMIN, ledger idempotente AdminImageUploads, registro histórico previo a confirmar el reemplazo, compensación, revalidación de referencias y árbol Cortes en las acciones manuales, envío a papelera descrito correctamente, vistas lista/cuadrícula y lightbox.
- Pendientes: restauración accesible de estados en papelera/revisión; transiciones y rollback del estado histórico; integridad de IDs/filas; registro persistente de actor para reemplazo/restauración (ampliar AUG-021); documentar doce columnas de inventario; separar migración de esquema de lectura.
- AUG-026 cubre integridad/recuperación del historial. AUG-027 requiere decisión sobre referencias de todas las hojas frente a Cortes y sobre separar historial e inventario.
- La organización automática posterior al inventario detectada en ui.js/Services/admin.js se transfiere a AUD-T-028 por su discrepancia con los requisitos 6.4–6.5 de Tareas.txt. La coordinación de ScriptLock entre ADMIN/WRITE continúa en AUD-T-033/AUG-003.
- No se modificó código ni datos; no se probaron Apps Script, navegador/PWA, HTTP, Drive, Spreadsheet ni deployments.
- Siguiente unidad: AUD-T-028 — Inventario de imágenes sin uso, clasificación y monitor global de Drive.


## Estado del proyecto — cierre de AUD-T-028 (2026-11-07)
- La rama GPSpedia2.2.5_work se auditó desde HEAD a1e66b81eb4ea146dfc76e9e2980f41b64a8c124; la rama base GPSpedia2.2.5 permaneció en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-028 — Inventario de imágenes sin uso, clasificación y monitor global de Drive: auditoría estática E1 completada; hallazgos H-AUD-028-001 a H-AUD-028-009 abiertos; validación funcional pendiente.
- No hay límite total de 14 archivos en la fuente actual: lotes de 25 archivos/20 subcarpetas y cursor. La causa del síntoma de 14 no está confirmada; la UI puede restaurar un snapshot local y la lista de detalle filtra categorías.
- Hallazgos principales: organización automática después del escaneo, sobrescritura del estado movida_manual, ausencia de validación backend de auditoría completa, protección incompleta de requiere_revision, snapshot de referencias único por lote, deduplicación incompleta, guardado de inventario sin resultado por archivo y diagnóstico incompleto.
- El monitor global de Drive está implementado estáticamente con DriveApp y Drive API about.storageQuota; faltan pruebas con la identidad, scopes y deployment reales. No existe appsscript.json en el árbol auditado.
- AUG-028, AUG-029 y AUG-030 añadidas. AUG-021, AUG-026 y AUG-003 ampliadas. Rendimiento de CacheService/IndexedDB transferido a AUD-T-029.
- No se modificó código, configuración ni datos; no se probaron Apps Script, navegador/PWA, HTTP, Drive, Spreadsheet, cuota real ni concurrencia.
- Siguiente unidad: AUD-T-029 — Auditoría recursiva Drive, rendimiento, snapshot, lotes y reanudación.


## Continuidad de auditoría — AUD-T-029 (2026-11-07)
- Estado: auditoría estática E1 completada; hallazgos abiertos y validación funcional pendiente.
- Sesión/checkpoint: AUD-20261107-S010 / AUD-CP-0010.
- HEAD auditado: 4061bbb67bcf1fc0c2786185fc42ed2ea804b9e9; rama de trabajo GPSpedia2.2.5_work; rama base GPSpedia2.2.5 en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Hallazgos H-AUD-029-001 a H-AUD-029-008: integridad del cursor, detección de posición repetida, persistencia IndexedDB no incremental/compartida, capacidad y TTL del snapshot, lectura amplia de Spreadsheet, lotes sin presupuesto temporal y validación repetida de ancestros.
- Se amplían AUG-028 y AUG-030; se crean AUG-031 a AUG-033.
- No se modificó código ni se ejecutaron pruebas reales de Apps Script, navegador, HTTP, Drive o Spreadsheet.
- Siguiente unidad: AUD-T-030 — Esquema Spreadsheet, IDs de cortes, opId/idOperacion y migraciones.


## Continuidad de auditoría — AUD-T-030 (2026-11-07)
- Sesión/checkpoint: AUD-20261107-S011 / AUD-CP-0011.
- HEAD auditado: c8c971ed061f08fca212f6879b35c857d9a0192c; rama de trabajo GPSpedia2.2.5_work. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-030 — esquema Spreadsheet, IDs de Cortes, opId/idOperacion y migraciones: auditoría estática E1 completada; hallazgos H-AUD-030-001 a H-AUD-030-008 abiertos; validación funcional pendiente.
- La ausencia inicial de Idempotencia/Idempotencia_Cortes y columnas objetivo en la copia original de 13 hojas no se clasifica como defecto: el código las crea/migra bajo demanda.
- Controles positivos: migración VIN protegida por respaldo verificado y simulación/confirmación; asignación de IDs centralizada en WRITE, utilizada también por ADMIN.
- Hallazgos principales: migración ADMIN no comparte lock con escrituras WRITE; mapa de idempotencia no valida estados/duplicados; inicialización puede escribir encabezados sobre columnas con datos; runtime admite duplicados y recuperación no verifica unicidad de vehicleId; ubicación dinámica de testigo y encabezados VIN duplicados; parsers frontend/backend difieren.
- AUG-034 coordinación compartida WRITE/ADMIN; AUG-035 integridad/reconciliación Idempotencia; AUG-036 contrato VIN/testigo/parsers. Relación con AUD-T-033/AUG-003.
- No se ejecutaron pruebas E2/E3, Apps Script, HTTP, navegador, Drive, Spreadsheet real, migración ni concurrencia. No se modificó código ni datos productivos.
- Siguiente unidad: AUD-T-031 — Subidas de imágenes, reintentos, reconciliación Drive/Spreadsheet e idempotencia.


## Continuidad de auditoría — AUD-T-031 (2026-11-07)
- Sesión/checkpoint: AUD-20261107-S012 / AUD-CP-0012.
- HEAD auditado: 71058f8b1924d59924fa289f66226aeaac41b7bc; rama de trabajo GPSpedia2.2.5_work. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-031 — cargas de imágenes, reintentos, reconciliación Drive/Spreadsheet e idempotencia: auditoría estática E1 completada; H-AUD-031-001 a H-AUD-031-010 abiertos; validación funcional pendiente.
- Controles positivos: persistencia IndexedDB previa al reemplazo in-modal, opId estable, hash SHA-256 del payload, ledger AdminImageUploads, historial REP-<opId>, comprobación de URL activa y compensaciones de rollback.
- Hallazgos principales: «Descartar cambios» puede revertir URL sin compensar ledger/historial/Drive; helper general no recalcula hash del archivo recuperado; falta coordinación compartida entre ADMIN/WRITE/FEEDBACK; fallo al actualizar historial no siempre escala a requires_review; no hay reconciliador general para archivos pending; la recuperación linked puede restaurar un archivo posteriormente enviado a papelera.
- AUG-037: reconciliación durable de cargas generales y verificación de contenido. AUG-038: compensación coherente de reemplazos in-modal y descarte. AUG-034 ampliada para reemplazos; AUG-035 ampliada para unicidad de vehicleId.
- No se ejecutaron pruebas E2/E3, Apps Script, HTTP, navegador, Drive, Spreadsheet real, fallos inducidos ni concurrencia. No se modificó código ni datos productivos.
- Siguiente unidad: AUD-T-032 — Identidad autenticada del colaborador en WRITE y ADMIN.


## Continuidad de auditoría — AUD-T-032 (2026-11-07)
- Sesión/checkpoint: AUD-20261107-S013 / AUD-CP-0013.
- HEAD auditado: ad13f5340152ff42b552f06184d2a2adb17117c9; rama GPSpedia2.2.5_work. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-032 — identidad autenticada del colaborador en WRITE y ADMIN: auditoría estática E1 completada; hallazgos H-AUD-032-001 a H-AUD-032-003 abiertos; validación funcional pendiente.
- La atribución de addOrUpdateCut está protegida en WRITE mediante ActiveSessions/Users y en ADMIN mediante assertDeveloperSession/developerContext.
- Hallazgo principal: addSupplementaryInfo modifica Cortes y puede subir imágenes a Drive sin validar sesión en WRITE; los consumidores omiten userId/sessionToken y el flujo silentRegister dirigido a ADMIN no incluye las credenciales.
- También se detectó checkOperation sin validación en WRITE y con devolución de rowData completo, y allocateVehicleId sin restricción de rol Desarrollador.
- AUG-039 recoge la autorización de addSupplementaryInfo, la minimización de checkOperation y la restricción de allocateVehicleId. AUG-024 recibe adenda por IDs internos expuestos en WRITE debug. La ruta manual de enlace de vídeo se transfiere a AUD-T-035.
- La coordinación de revocación entre AUTH/USERS/WRITE/ADMIN permanece relacionada con AUD-T-024/AUG-016 y AUD-T-033/AUG-003.
- No se ejecutaron pruebas E2/E3, Apps Script, HTTP, navegador, Drive, Spreadsheet ni concurrencia. No se modificó código ni datos productivos.
- Siguiente unidad: AUD-T-033 — Coordinación de mutaciones entre servicios y Utilities.

## Continuidad de auditoría — AUD-T-033 (2026-11-07)
- Sesión/checkpoint: AUD-20261107-S014 / AUD-CP-0014.
- HEAD auditado: 32b4898e967aea45a9372aa127cb0735aed99fc5; rama GPSpedia2.2.5_work. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-033 — coordinación de mutaciones entre servicios y Utilities: auditoría estática E1 completada; el protocolo compartido no existe en el código revisado; hallazgos abiertos y validación funcional pendiente.
- La fuente está en Services/Utilities.js (U mayúscula), versión 1.3.0. Solo implementa migrateTimestamps, no migrateYearRanges; declara AUTH: NONE, no usa lock y limpia Hoja 1 antes de escribir. El deployment publicado no fue verificado.
- No existe coordinador compartido: los locks de WRITE, ADMIN y FEEDBACK son locales a cada proyecto; Utilities no implementa protocolo.
- FEEDBACK contiene rutas que escriben Cortes: assignCollaborator sin autenticación/lock; recordLike sin validación de sesión backend; suggestYear permite identificadores anónimos client-controlled que cuentan para el umbral automático; approveVideo valida rol pero no coordina las escrituras Feedbacks/Cortes.
- AUG-034 se amplía; AUG-040 cubre seguridad/integridad FEEDBACK; AUG-041 cubre autorización, contrato y recuperación UTILITIES. AUG-003 queda auditada, pero el coordinador sigue pendiente.
- No se ejecutaron pruebas E2/E3, Apps Script, HTTP, navegador, Drive, Spreadsheet ni concurrencia. No se modificó código ni datos productivos.
- Siguiente unidad: AUD-T-034 — Acceso y visibilidad del panel/historial por rol y sesión.

## Continuidad de auditoría — AUD-T-034 (2026-11-07)
- Sesión/checkpoint: AUD-20261107-S015 / AUD-CP-0015.
- HEAD auditado: 3819d0d73368982a5a463fb89515e13ec452dde3; rama GPSpedia2.2.5_work. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-034 — acceso y visibilidad del panel/historial por rol y sesión: auditoría estática E1 completada; hallazgos abiertos y validación funcional pendiente.
- ADMIN protege el panel y el historial de imágenes con assertDeveloperSession; FEEDBACK y USERS vuelven a validar rol en backend.
- logout solo elimina localStorage; no limpia currentUser/token en memoria ni cierra/limpia los modales privilegiados. El token remoto sigue activo hasta completar AUG-006; window.state/window.ui quedan expuestos.
- updateUser cambia Privilegios sin revocar/actualizar sesiones; validateSession solo devuelve valid. La UI puede mantener el rol anterior aunque backend reevalúa el rol actual.
- showApp no oculta expresamente Inbox/Dashboard para roles no permitidos; getFeedbackItems permite Jefe pero la UI no muestra Inbox a Jefe.
- renderInboxDetail usa currentUser.Rol, pero AUTH entrega Privilegios; botones de aprobación/rechazo pueden quedar ocultos.
- AUG-006/AUG-016/AUG-017 se amplían; AUG-042 cubre sincronización de rol y limpieza del estado privilegiado.
- No se ejecutaron pruebas de navegador, HTTP, Apps Script, sesiones reales ni cambios de rol; no se modificó código ni datos productivos.
- Siguiente unidad: AUD-T-035 — Contratos de acciones frontend/backend y flujos de imagen/vídeo.

## Continuidad de auditoría — AUD-T-035 (2026-11-07)
- Sesión/checkpoint: AUD-20261107-S016 / AUD-CP-0016.
- HEAD auditado: e13623beb059b33171758545404381fbbf512c16; rama GPSpedia2.2.5_work. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-035 — endpoints, separación de servicios y contratos frontend/backend: auditoría estática E1 completada; H-AUD-035-001 a H-AUD-035-006 abiertos; validación funcional y verificación de deployments pendientes.
- Hallazgos principales: consumidores FEEDBACK protegidos omiten userId/sessionToken; youtubeUpload.js usa currentUser.id aunque AUTH entrega ID y no envía SessionToken; enlace manual de vídeo usa fieldName/fieldValue que addSupplementaryInfo no procesa; PYS/Tutorial guardan URL antes de aprobar; opVideoId se confunde con videoId real y no se conserva para idempotencia; hay acciones mapeadas sin handler/handlers sin mapeo; handleAddProblem puede devolver success sin imagen Drive.
- Tareas nuevas: AUG-043 (contratos protegidos y ciclo YouTube) y AUG-044 (reconciliar mapa/dispatchers). AUG-040 recibe adenda de integridad de imagen PYS. Se mantienen AUG-039/AUG-040/AUG-041/AUG-042.
- No se modificó código, endpoints, Spreadsheet, Drive, datos productivos ni deployments. Solo inspección estática; no se ejecutaron E2/E3, navegador, HTTP, Apps Script, YouTube, Drive, Spreadsheet real ni concurrencia.
- Siguiente unidad: AUD-T-036 — Términos, consentimiento inicial y elementos legales de interfaz.

## Continuidad — AUD-T-036 (2026-11-07)
- Sesión/checkpoint AUD-20261107-S017 / AUD-CP-0017.
- HEAD bf420789e5aeafa73f2bb3ee1118f5c8bf2ff010 en GPSpedia2.2.5_work; base GPSpedia2.2.5 d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- E1 completada; H-AUD-036-001 a 005 abiertos; pruebas funcionales y revisión legal pendientes.
- Aviso y acuerdo en index.html; acuerdo actual de 16 secciones; enlaces en login, aviso y footer.
- gpsepedia_terms_accepted es booleano local por dispositivo, compartido por cuentas, sin userId/timestamp/version; showApp falla abierto si falta terms-modal; localStorage sin manejo de errores.
- Sección 13 de privacidad general; requiere aprobación legal. Logo_TemaOscuro y tracklink_logo fuera de precache; falta semántica/foco accesible.
- Tareas AUG-045 aceptación versionada/trazable; AUG-046 revisión legal; AUG-047 accesibilidad/History/offline.
- Sin cambios de código ni datos; solo E1 estática. Siguiente AUD-T-037 — Catálogo, caché, sincronización incremental y búsqueda.

## Continuidad — AUD-T-037 (2026-11-07)
- Sesión/checkpoint AUD-20261107-S018 / AUD-CP-0018.
- HEAD 513c9982407db2a1c9b357a418d0949786ec4141 en GPSpedia2.2.5_work; base GPSpedia2.2.5 d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- E1 estática completada; H-AUD-037-001 a 012 abiertos; validación funcional, PWA y rendimiento pendientes.
- Hallazgos: saveCatalog conserva eliminados; performSilentSync compara solo longitudes de Tutorial/Relay; autoapertura puede dirigir un resultado único no-Corte al modal de Corte; búsqueda no normaliza acentos/no cubre todos los campos/no prioriza; PyS se solicita repetidamente y no reejecuta búsqueda; años numéricos ambiguos; VIN puede seleccionar primera variante y no carga firmas guardadas; IndexedDB no confirma transacciones ni controla crecimiento; searchHistory se comparte entre cuentas; deep links y fetch sin timeout; precache/runtime cache incompleto; backend lee catálogo completo sin caché efectiva.
- Tareas AUG-048 snapshot/sync, AUG-049 búsqueda, AUG-050 VIN, AUG-051 IndexedDB/miniaturas/privacidad, AUG-052 startup/PWA/backend.
- No se modificó código ni datos; solo inspección E1. Sin navegador, IndexedDB real, cuota, PWA offline, rendimiento, VIN con dataset real ni Spreadsheet/Apps Script.
- Siguiente: AUD-T-038 — seguridad del almacenamiento local y ciclo de datos de usuario, pendiente de confirmar plan.

## Continuidad — consolidación AUD-PLAN-2026-001 (2026-11-07)
- Sesión/checkpoint AUD-20261107-S019 / AUD-CP-0019.
- Rama GPSpedia2.2.5_work: HEAD inicial eb3b72e205ad8d772a4bd5cdad94fb3e26533917; rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Corrección de cobertura: 37 AUD-T en el catálogo; AUD-T-023 a AUD-T-037 con E1 completada (15), AUD-T-002 parcial (1), AUD-T-001 y AUD-T-003 a AUD-T-022 por auditar (21).
- Aug_Tareas.md contiene 51 IDs únicos; AUG-015 no aparece y no debe inferirse. Los encabezados repetidos se conservan como adendas.
- Nuevo Plan_auditoría/Consolidacion_Auditoria.md con matriz VAL-01 a VAL-15; matriz preparada, no ejecutada.
- Siguiente: AUD-T-038, previa revisión de no duplicidad con AUG-051/AUD-T-037.
- Solo documentación; sin pruebas funcionales ni cambios de aplicación/datos productivos.

## Continuidad — AUD-T-038 (2026-11-07)
- Sesión/checkpoint: AUD-20261107-S020 / AUD-CP-0020.
- HEAD auditado: bfcdf8e57d4e09c1c920cf904265301c4554b334 en GPSpedia2.2.5_work; base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- E1 estática completada; H-AUD-038-001 a 005 abiertos; validación funcional/privacidad pendiente.
- add_cortes guarda gpsepedia_pending_operation con VIN/datos/archivos Base64 sin owner y recupera con la cuenta activa; adminImageUploadPending y gpsepedia_edit_backup carecen de owner/retención; viewedItems/validationCache requieren política; vaciado local incompleto; WRITE checkOperation no valida sesión y devuelve rowData.
- AUG-053: aislamiento/retención de snapshots; AUG-054: autorización/minimización de checkOperation. AUG-051 se amplía a viewedItems/validationCache; AUG-022 a inventario/semántica de limpieza. No duplicar AUG-006/AUG-042/AUG-045 ni H-AUD-037-008/009.
- Controles: modal (+) compara operation.userId; ADMIN valida sesión/rol; API POST y Service Worker ignora POST; métricas solo memoria; VinSignatureStore no persiste el VIN introducido.
- Sin cambios de aplicación, endpoints, configuración, Drive, Spreadsheet, datos productivos o deployments. Solo E1 estática; sin pruebas E2/E3 ni operaciones reales.
- Siguiente: AUD-T-003 — Registro de vehículos y cortes, idempotencia y resiliencia de red.

## Continuidad — AUD-T-003 (2026-11-07)
- Sesión/checkpoint: AUD-20261107-S021 / AUD-CP-0021.
- HEAD auditado: 06f18e42383f5be448c378bc09ab534731cfbd6b en GPSpedia2.2.5_work; base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- E1 estática completada; H-AUD-003-001 a 004 abiertos; validación funcional y de integración pendiente.
- Hallazgos: persistencia local no obligatoria y ciclo de opId sin vinculación estricta; opciones de corte/vídeo no se ocultan según disponibilidad real; FileReader puede dejar el formulario bloqueado; recuperación online/visibilitychange/init no serializada.
- Tareas: AUG-055 a AUG-058 nuevas; adenda a AUG-043 para #videoGuiaUrl y disponibilidad de vídeo.
- No duplicar H-AUD-038-001/AUG-053, H-AUD-038-005/AUG-054, H-AUD-035-002/AUG-043, H-AUD-032-001/AUG-039 ni H-AUD-033-001/AUG-034. AUD-T-031 conserva reconciliación Drive.
- Controles positivos: backend valida sesión/rol y slot; segundo corte conserva vehicleId; «No recomendado» normaliza y omite campos; Idempotencia pending/completed y token de carga.
- Sin cambios de aplicación, endpoints, configuración, Drive, Spreadsheet, datos productivos o deployments. Solo E1 estática; sin navegador, HTTP, Apps Script, FileReader real, cuota, concurrencia ni deployments.
- Siguiente: AUD-T-004 — VIN: identificación, colecciones, almacenamiento, búsqueda y diferencial.


## Continuidad — AUD-T-004 (2026-11-07)
- Sesión/checkpoint: AUD-20261107-S022 / AUD-CP-0022.
- HEAD auditado: 24f68780e6b7ad5ad835ce76c1d6abda0a80a528 en GPSpedia2.2.5_work; árbol 3ba54bd14d53dc1a0ffd9565f1ad1b536df3fed4. Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin cambios.
- E1 estática completada; H-AUD-004-001 a 003 abiertos; H-AUD-037-007/AUG-050 ampliados; validación funcional e integración pendientes.
- Hallazgos nuevos: parseVinCollection() elimina slots vacíos y mapVersionsWithVins() vuelve a recortar cinco caracteres ya excluidos al almacenar; el editor administrativo VIN no puede persistir porque handleUpdateVehicleField() usa COLS_CORTES fijo sin vin; backend no valida longitud máxima 18 y puede descartar valores cortos sin error.
- Tareas: AUG-059 edición/validación autoritativa; AUG-060 asociación posicional/presentación; AUG-050 ampliada con query VIN completo/prefijo, competidores, umbral de muestras, rangos, extractSharedChars y cobertura por versión.
- Controles positivos: catálogo resuelve VIN dinámicamente; WRITE/ADMIN almacenan prefijos en JSON y verifican duplicados; alta específica de VIN valida sesión/lock/slot; migración exige sesión desarrollador y respaldo verificado, con simulación/confirmación.
- No duplicar H-AUD-037-007/AUG-050, H-AUD-037-009/AUG-051, H-AUD-030/AUG-036, H-AUD-033-001/AUG-034 ni H-AUD-038-001/AUG-053.
- Sin cambios de código, configuración, endpoints, Spreadsheet, Drive, datos productivos o deployments. Solo E1 estática; no se ejecutaron pruebas funcionales ni migración VIN.
- Siguiente: AUD-T-005 — Modal de detalle, ampliación dinámica y acciones contextuales.

## Continuidad — AUD-T-005 (2026-11-07)
- Sesión/checkpoint: AUD-20261107-S023 / AUD-CP-0023.
- Repositorio: infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado c56c6f7e21a668774db726e2f14139588f1bc5c0; base GPSpedia2.2.5 en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-005 — Modal de detalle, ampliación dinámica y acciones contextuales: auditoría estática E1 completada; H-AUD-005-001 a 008 abiertos. No se modificó código ni datos.
- Hallazgos: stored XSS en apertura/alimentación; falta de guardas de cupo suplementario en WRITE/ADMIN; detalle sin refresh efectivo; selectores duplicados; FileReader sin error/abort; menú de vídeo consulta propiedad eliminada; contador VIN confuso; popstate no detecta submodales dinámicos.
- Tareas nuevas: AUG-061 a AUG-064. Adendas: AUG-043, AUG-050 y AUG-057. No duplicar H-AUD-032-001/AUG-039, H-AUD-033-001/AUG-034, H-AUD-035-002/AUG-043, AUD-T-031 ni AUG-056.
- Observación de cierre de overlays transferida a AUD-T-007.
- Siguiente unidad: AUD-T-006 — Visualización técnica avanzada, lightbox con carrusel de cables y renderizado de transparencias.


## Continuidad — AUD-T-006 (2026-11-07)
- Sesión/checkpoint: AUD-20261107-S024 / AUD-CP-0024.
- Repositorio: infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado 5ab07e75513b05a51a4c62fbc731e451105eb1a8; base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin cambios.
- AUD-T-006 — Visualización técnica avanzada, lightbox, carrusel de cables y transparencias: E1 estática completada; H-AUD-006-001 a H-AUD-006-003 abiertos. Sin cambios de aplicación ni datos.
- Hallazgos: getImageUrl() ignora size y la caché de imágenes no separa variantes; mix-blend-mode: lighten afecta también imágenes opacas; el swipe del carrusel del modal no compara el eje vertical.
- H-AUD-005-001/AUG-064 se amplía: ui.js updateSlide() inserta activeCable.content en slideText.innerHTML sin sanitización. No duplicar el ID.
- Tareas nuevas: AUG-065 a AUG-067; adenda a AUG-064. Inventario: 66 IDs únicos; AUG-015 continúa ausente.
- No duplicar caché general de AUD-T-009/AUG-051 ni History API global de AUD-T-007. Siguiente: AUD-T-007 — Navegación, History API, popstate, overlays y gesto atrás.
- Límites: E1 estática; sin navegador, móviles/PWA, CDN, IndexedDB real, canvas, mediciones ni gestos reales. Sin cambios de código, assets, endpoints, configuración, Drive, Spreadsheet, datos productivos o deployments.

## Continuidad — AUD-T-007 (2026-11-08)
- Sesión/checkpoint: AUD-20261108-S025 / AUD-CP-0025.
- Repositorio: infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado 61c9898309ef2c27438eaa65a5aa00ff8a1f7b0e; base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-007 — Navegación, History API, popstate, overlays y gesto atrás: auditoría estática E1 completada; H-AUD-007-001 a 005 abiertos. No se modificó código.
- Alcance: main.js, navigation.js, ui.js, users.html, add_cortes.html, youtubeUpload.js, index.html, style.css, lightbox.js y state.js; commits ancla 09c7a448, a45f394d y 414c4258.
- Hallazgos: overlays dinámicos .info-modal.visible no detectados por popstate; botones internos Volver crean entradas nuevas; main.js/users.html cierran todos los modales a la vez; aperturas/cierres de menú y modales dejan entradas obsoletas; terms-modal bloquea el cierre del acuerdo superior.
- Tareas nuevas: AUG-068 a AUG-071. Adenda: AUG-047. H-AUD-005-008 ampliado sin duplicar.
- Límites: sin navegador, Android/iOS, PWA, gestos nativos, teclado virtual, submits reales, deep links ejecutados ni medición de historial. Sin cambios de aplicación/datos.
- Siguiente: AUD-T-008 — Deep links, compartir, enlaces precisos e indicador de red.


## Continuidad — AUD-T-008 (2026-11-08)
- Sesión/checkpoint: AUD-20261108-S026 / AUD-CP-0026.
- Repositorio: infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado f3d7558abeef482957582fea08f2041490b54f34; base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin cambios.
- AUD-T-008 — Deep links, compartir, enlaces precisos e indicador de red: auditoría estática E1 completada; H-AUD-008-001 a 004 abiertos. No se modificó código.
- Alcance: ui.js, main.js, navigation.js, index.html, style.css y auth.js; commits ancla 7714b985, 76d44aff y 20290cdd, con historia de ubicación del indicador 4ce4baae/95d248b/0d00e25.
- Hallazgos: URL compartida sin ID estable y autoapertura condicionada a unicidad; fallback incompleto Web Share/Clipboard; decodeURIComponent sin protección; indicador sin role/aria-live y navigator.onLine no prueba salud backend.
- H-AUD-037-003/AUG-049, H-AUD-037-006/AUG-049 y H-AUD-037-010/AUG-052 se confirman y reciben adendas; no duplicar sus hallazgos.
- Tareas nuevas: AUG-072 y AUG-073. AUG-049 y AUG-052 reciben adendas.
- Límites: sin navegador, Web Share, Clipboard, móvil/PWA, lector de pantalla, enlaces malformados, colisiones de catálogo, HTTP/health check, Apps Script, datos productivos ni deployments. Solo E1 estática; sin cambios de aplicación.
- Siguiente: AUD-T-009 — PWA, offline, IndexedDB, caché, service worker y compatibilidad iOS.

## Continuidad — AUD-T-009 (2026-11-08)
- Sesión/checkpoint: AUD-20261108-S027 / AUD-CP-0027.
- Repositorio: infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado c2f9cdd29dfc9efca1db8a1c3b9675f29ed809ac; árbol 9617c2c588190a50fde235bfe2d32b3ebee7b7ba; base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin cambios.
- AUD-T-009 — PWA, offline, IndexedDB, caché, Service Worker y compatibilidad iOS: E1 estática completada; H-AUD-009-001 a 003 abiertos. No se modificó código.
- Alcance: service-worker.js, manifest.json, index.html, main.js, style.css, offline.js, auth.js, ui.js, navigation.js, state.js, VinDifferentialEngine.js, youtubeUpload.js, add_cortes.html y users.html. Commits ancla 825a1aea, 9f8b84a9 y d9476ab0.
- Hallazgos: falta youtubeUpload.js en urlsToCache y se confirma la ausencia de VinDifferentialEngine.js ya registrada; cache.addAll() puede abortar toda la instalación y register() no maneja el rechazo; la detección de iOS puede omitir iPadOS con UA de escritorio y no hay metadatos Apple específicos.
- H-AUD-037-008/009/010/011, H-AUD-038-003/004 y tareas AUG-022/AUG-051/AUG-052/AUG-065 se mantienen como antecedentes; no duplicar transacciones, privacidad/retención, timeout, cache.put ni variantes de imagen.
- Nueva AUG-074; adenda a AUG-052. Inventario: 73 IDs AUG únicos dentro de AUG-001 a AUG-074; AUG-015 continúa ausente.
- Límites: sin pruebas E2/E3, navegador, instalación/actualización Service Worker, recarga offline, CacheStorage, IndexedDB real, cuota, Android/iOS/iPadOS, Add to Home Screen, red real ni deployments. Sin cambios de aplicación, assets, endpoints, configuración ni datos productivos.
- Siguiente: AUD-T-010 — Reportes de problemas y sugerencias de cambios en cortes.

## Continuidad — AUD-T-010 (2026-11-08)
- Sesión/checkpoint: AUD-20261108-S028 / AUD-CP-0028.
- Repositorio: infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado 9b1401d37ea8c7b78a7ae9117c90afc4deb68009; árbol 283e324bca6e2b055e353059a3aa00ce38f66f5d; base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-010 — reportes de problemas y sugerencias de cambios en cortes: E1 estática completada; H-AUD-010-001 a H-AUD-010-007 abiertos; validación funcional/seguridad/integración pendiente.
- Alcance: ui.js, api-config.js, Services/feedback.js, Inbox y esquema documentado Feedbacks. Contraste con commits 64d8d044, fb7f2fcf, db6951ed y db0eee87, además de revisiones H-TESTIGO-REPORT-01/H-TESTIGO-SUGGEST-02.
- Controles revalidados: reportMetadata dinámico, metadatos del testigo, compatibilidad histórica, contrato suggestion_cut versionado, estado derivado de Se resolvio y almacenamiento separado de Cortes.
- Hallazgos: acciones reportProblem/suggestCutChange sin validación backend de sesión/identidad; sinks innerHTML con datos no escapados; adjunto de reporte no se carga; vínculo reportId/vehicleId/corteIndex no se verifica; pipeline de imagen de sugerencia puede bloquear/confirmar fallos y publica por enlace; append de sugerencias carece de lock/idempotencia; validación backend de texto/proposedValues incompleta.
- Nuevas tareas AUG-075 a AUG-081. Inventario: 80 IDs AUG únicos dentro de AUG-001 a AUG-081; AUG-015 continúa ausente.
- Límites: E1 estática; sin Apps Script, HTTP, navegador, FileReader real, XSS, Drive/Spreadsheet, concurrencia ni deployments. Sin cambios de código, assets, endpoints, configuración ni datos productivos.
- Siguiente: AUD-T-011 — Módulo Problemas y Soluciones (PyS), formularios y visualización.


## Continuidad — AUD-T-011 (2026-11-08)
- Sesión/checkpoint: AUD-20261108-S029 / AUD-CP-0029.
- Repositorio: infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado bba61f0cd16e5a35d6f709e048ebd31d8709a193; árbol b44d845fdd0cb485cdefc04752ebafd1c340f355; base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-011 — Módulo Problemas y Soluciones (PyS), formularios y visualización: E1 estática completada; H-AUD-011-001 a H-AUD-011-007 abiertos; validación funcional/seguridad/integración pendiente.
- Alcance: Tarea 10 (5.1–5.5), index.html, main.js, ui.js, api-config.js, Services/feedback.js, rich-text.js, esquema pys y style.css. Contraste con commits f93ad12f, 73d1fd91 y 0e93ec25.
- Hallazgos: stored XSS en título/colaborador/vídeo; acciones PyS sin sesión/identidad backend; imagen puede fallar y confirmar éxito, carpeta en raíz/MIME fijo y FileReader sin error/abort; ID/esquema/idempotencia; límites y URL; sobrescritura de solución/prevención; consultas repetidas por navegación.
- Nuevas AUG-082 a AUG-087; adendas a AUG-040/AUG-057. Se mantienen H-AUD-035-001/003/006 y H-AUD-037-005 sin duplicar.
- Límites: solo E1 estática; sin navegador, FileReader real, HTTP, Apps Script, Drive/Spreadsheet, XSS controlado, concurrencia ni deployments. Sin cambios de aplicación ni datos productivos.
- Siguiente: AUD-T-012 — Vinculación bidireccional PyS–vehículos y navegación sin ciclos.

## Continuidad — AUD-T-012 (2026-11-08)
- Sesión/checkpoint: AUD-20261108-S030 / AUD-CP-0030.
- Repositorio: infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado 2afdde923d14e4f3dd078d347007b15e5ab09b2b; árbol 06fc72da78912df18227e2f45ce0d33349fa7cc5; base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-012 — Vinculación bidireccional PyS–vehículos y navegación sin ciclos: E1 estática completada; H-AUD-012-001 a H-AUD-012-008 abiertos o vinculados a tareas existentes; validación funcional, integridad y navegación pendiente.
- Hallazgos principales: los callbacks de asociación vuelven a renderizar el acordeón sin originModal y pueden reabrir ciclos; la pila modal se duplica o pierde contexto al editar; no se restaura la posición del carrusel; los callsites de asociación/desvinculación omiten userId/sessionToken; add/remove carecen de lock e integridad referencial del vehicleId; el título del acordeón difiere del requisito; getPysData se consulta repetidamente.
- Nuevas AUG-088 a AUG-091; adendas a AUG-043/AUG-087. La ausencia de pruebas funcionales reproducibles se vincula a AUG-002 y VAL-21.
- Fuentes principales: ui.js f00f48a42ee9bf0fd200f21959eb741f113363eb; Services/feedback.js 3db189523f6cb849d33550f29971c0ec6f386b3a; api-config.js a5c718d01b7da50b4b5e650c3bacd91456f4d670; main.js c15f5462d78fa907d14c71e15970ae29a3b3de77; navigation.js 39ec9f5ed34f8f81b506222f3b7b02494f866ad0.
- Límites: E1 estática; sin Playwright, navegador, HTTP, Apps Script, Spreadsheet real, concurrencia, permisos en deployment ni E2/E3. Sin cambios de aplicación, assets, endpoints, configuración ni datos productivos.
- Siguiente: AUD-T-013 — Tutoriales, multimedia y carga directa de vídeos YouTube con aprobación.


## Continuidad — AUD-T-013 (2026-11-08)
- Sesión/checkpoint: AUD-20261108-S031/AUD-CP-0031.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD d8a164c2974f4dc472f169442c2b7efb969bf350; árbol abce39b7f437ecd02647bebdf4252f47d4ed4ca2; base GPSpedia2.2.5 d9acc68d889985c2e2f42fe3a02e502efc86ead1 sin cambios.
- AUD-T-013 Tutoriales, multimedia y carga directa YouTube con aprobación: E1 estática completada; H-AUD-013-001 a H-AUD-013-010 documentados; validación funcional/seguridad/YouTube pendiente.
- Hallazgos: uploader omite sessionToken y usa currentUser.id; URL pending puede guardarse antes de aprobación; backend solo asocia Corte; esquema Tutorial incompatible; addTutorial sin auth/dedup; approve/reject sin guard subType/status; opVideoId como videoId provisional; sin recuperación IndexedDB/308; sink HTML; overlay sin History API; metadatos no coinciden totalmente; no hay suite YouTube reproducible.
- Nuevas AUG-092 a AUG-094; adendas AUG-043/AUG-068; AUG-040 mantiene coordinación; VAL-22 planificada.
- Fuentes: youtubeUpload.js 01559b95d4fff7b03c7833d5903496ab41dbc161; Services/feedback.js 3db189523f6cb849d33550f29971c0ec6f386b3a; Services/catalog.js 253cbe9f873481114e7abff3aa8902c45e2560af; api-config.js a5c718d01b7da50b4b5e650c3bacd91456f4d670; ui.js f00f48a42ee9bf0fd200f21959eb741f113363eb; main.js c15f5462d78fa907d14c71e15970ae29a3b3de77; Estudio_Factibilidad_YouTube.md f5b2774d0ddbfd9862f8c51cae5a31e1481825ee.
- Límites: E1 estática; sin YouTube API/OAuth/XHR/navegador/Apps Script/Spreadsheet real, concurrencia, red interrumpida, 308, XSS ejecutado ni E2/E3. Sin cambios de aplicación/configuración/datos.
- Siguiente: AUD-T-014 — Texto enriquecido, sanitización, listas, párrafos y saltos de línea.


## Continuidad — AUD-T-014 (2026-11-08)
- Sesión/checkpoint: AUD-20261108-S032/AUD-CP-0032.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD deefa3a8ceca4aae892c61d0e99fec73c3e44837; árbol af44c6c3d2c911f72e6891f9b935a83fdcb83a38; base GPSpedia2.2.5 d9acc68d889985c2e2f42fe3a02e502efc86ead1 sin cambios.
- AUD-T-014 Texto enriquecido, sanitización, listas, párrafos y saltos de línea: E1 estática completada; H-AUD-014-001 a H-AUD-014-003 documentados; validación funcional/seguridad pendiente.
- Fuentes principales: rich-text.js a7180766bb5097be510153edd851f4dfa939912c; ui.js f00f48a42ee9bf0fd200f21959eb741f113363eb; add_cortes.html 8a5e4bf51b3cd602224016a1267f478ce55ee329; Services/write.js 0c603ce8b56a871a6d9396bd5b047e364f9f580e; Services/feedback.js 3db189523f6cb849d33550f29971c0ec6f386b3a; style.css dbcef5d28225c4ef1861fe0e0c11ad530f64ebd9; service-worker.js 6779c97db87a574149eb44c7e97729ac7f18f4f5.
- Hallazgos: backend WRITE/FEEDBACK persiste HTML sin saneamiento autoritativo; ui.js tiene sinks directos en carrusel y sección sin carrusel; modo gpsepedia_rich_text_mode estricto/avanzado no está conectado.
- Nuevas AUG-095 a AUG-097; VAL-23 planificada.
- Límites: E1 estática; sin navegador, DOMParser real, XSS, Playwright, HTTP, Apps Script, Spreadsheet/Drive real, service worker en dispositivo ni E2/E3. Sin cambios de aplicación/configuración/datos.
- Siguiente: AUD-T-015 — Búsqueda global, filtros rápidos y resultados jerárquicos; respetar la cancelación documentada de filtros rápidos.


## Continuidad — AUD-T-015 (2026-11-08)
- Sesión/checkpoint: AUD-20261108-S033/AUD-CP-0033.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD c4f61a1f8dc402c9fec6802032ca7d7f9c304695; árbol adda8ff26199530c2ec30d739510128efa060cb3; base GPSpedia2.2.5 d9acc68d889985c2e2f42fe3a02e502efc86ead1 sin cambios.
- AUD-T-015 Búsqueda global, filtros rápidos y resultados jerárquicos: E1 estática completada; H-AUD-015-001 a H-AUD-015-004 abiertos; H-AUD-037-003 a 006 revalidados; VAL-24 pendiente.
- Hallazgos nuevos: query de búsqueda reflejada sin escape en innerHTML; referencias residuales a toggleFiltersBtn/filtersBar en blur; estandarización de botones no universal; marca sintética Relay/Tutorial/Problema puede disparar renderizado como logo.
- AUG-098 a AUG-101 nuevas; AUG-049 recibe adenda; VAL-24 planificada.
- La decisión de cancelar filtros rápidos se mantiene; no reintroducirlos.
- Fuentes: navigation.js 39ec9f5ed34f8f81b506222f3b7b02494f866ad0; ui.js f00f48a42ee9bf0fd200f21959eb741f113363eb; main.js c15f5462d78fa907d14c71e15970ae29a3b3de77; style.css dbcef5d28225c4ef1861fe0e0c11ad530f64ebd9; index.html 6dd0b86981e7f92b10b2f7a0a1634bb6395a479a; users.html e41f402675677a4d2783493614737021ec2eade5; add_cortes.html 8a5e4bf51b3cd602224016a1267f478ce55ee329.
- Límites: E1 estática; sin navegador/DOM/XSS/Playwright, catálogo real, Apps Script/Spreadsheet, carga concurrente, lector de pantalla, pruebas móviles ni E2/E3. Sin cambios de aplicación/configuración/datos.
- Siguiente: AUD-T-016 — Diseño visual global, modo oscuro, contraste, footer y responsive.


## Continuidad — AUD-T-016 (AUD-20261108-S034)
- Sesión/checkpoint: AUD-20261108-S034 / AUD-CP-0034.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado 2daf88c96d29999cbc734c968ef94355ee5324ca; base GPSpedia2.2.5 d9acc68d889985c2e2f42fe3a02e502efc86ead1 sin cambios.
- AUD-T-016 — Diseño visual global, modo oscuro, contraste, footer y responsive: E1 estática completada; H-AUD-016-001 a H-AUD-016-004 abiertos; VAL-25 pendiente.
- Alcance: Tarea 16/B13/B19; commits 4b136cd0, 28f4ace5 y a9b15e5f; index.html, style.css, main.js, ui.js, users.html y add_cortes.html.
- Controles positivos: persistencia darkMode en localStorage; intercambio de logos; variables CSS; flex-wrap en encabezado del modal; footer fuera del contenedor con sentinel e IntersectionObserver.
- Hallazgos: selector data-theme no alineado con body.dark-mode y --text-primary sin definición; tokens/colores fragmentados entre páginas; zoom bloqueado en add_cortes; formulario de dos columnas y página de usuarios sin breakpoints dedicados.
- Nuevas tareas AUG-102 a AUG-105; VAL-25 planificada.
- Límites: sin navegador, mediciones WCAG, zoom real, lectores de pantalla, Android/iOS, PWA, rotación ni E2/E3. Sin cambios de aplicación/configuración/datos.
- Siguiente: AUD-T-017 — Gestión colaborativa de años y validación comunitaria.

## Continuidad de auditoría — AUD-T-017
- Fecha: 2026-11-08. Sesión AUD-20261108-S035; checkpoint AUD-CP-0035.
- Repositorio: infogpstech/GPSpedia. Rama de trabajo GPSpedia2.2.5_work; HEAD auditado 11d617cbf6401748a017fbe69f89ab63fa08800e; base GPSpedia2.2.5 en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-017 — Gestión colaborativa de años y validación comunitaria: E1 estática completada; Tarea 17 conserva su estado histórico COMPLETADA; H-AUD-017-001 a H-AUD-017-007 abiertos; VAL-26 pendiente.
- Hallazgos principales: colisión backend demasiado amplia; IndexedDB se marca antes de confirmar FEEDBACK; cache sin identidad de usuario; claves anónimas regenerables; banner dependiente de onload; esquema Feedbacks incompleto; falta registro AUD-T-016 en Auditoría.txt.
- Nuevas tareas AUG-106 a AUG-112. Siguiente unidad: AUD-T-018 — Usuarios, Inbox, dashboard, actividad y flujos de FEEDBACK.
- No se modificó código de aplicación, endpoints, configuración, datos productivos, Drive, Spreadsheet ni deployments. No hubo merge ni despliegue.

## Continuidad de auditoría — AUD-T-018
- Fecha: 2026-11-08. Sesión AUD-20261108-S036; checkpoint AUD-CP-0036.
- Repositorio: infogpstech/GPSpedia. Rama de trabajo GPSpedia2.2.5_work; HEAD auditado f9c47bad48fa8050a4acac33a4a45784fe433ef7; base GPSpedia2.2.5 en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-018 — Gestión avanzada de usuarios, auditoría de Inbox y dashboard: E1 estática completada; Tarea 18 conserva su estado histórico COMPLETADA; H-AUD-018-001 a H-AUD-018-009 abiertos; VAL-27 pendiente.
- Hallazgos principales: XSS almacenado en dashboard e Inbox; mismatch currentUser.Rol/Privilegios oculta aprobación de vídeos; caché Inbox no integrada; autodegradación/autoborrado de último Desarrollador y sesiones huérfanas; perfil local no refrescado; mutaciones Inbox sin historial central; lectura completa del historial; respuesta success para itemType inválido.
- Nuevas tareas AUG-113 a AUG-121. Siguiente unidad: AUD-T-019 — Validaciones de integridad en backend y batería exhaustiva de pruebas automatizadas.
- No se modificó código de aplicación, endpoints, configuración, datos productivos, Drive, Spreadsheet ni deployments. No hubo merge ni despliegue.

## Continuidad de auditoría — AUD-T-019
- Fecha: 2026-11-08. Sesión AUD-20261108-S037; checkpoint AUD-CP-0037.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado 6f0f901179c10833cbeedcb2767a25fcdd085b0d; árbol 111dcd6270f62d5aaad6d5bfe34ebf47acafee82; base GPSpedia2.2.5 en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-019 — Validaciones de integridad backend y pruebas automatizadas: E1 estática completada; H-AUD-019-001 a H-AUD-019-014 abiertos; VAL-28 pendiente. Tarea 19 conserva estado histórico COMPLETADA, sin certificación funcional de pruebas 31–38.
- Hallazgos principales: WRITE.addSupplementaryInfo y UTILITIES.migrateTimestamps sin auth; alta de Tutoriales desconectada de CATALOG y edición fallback con columnas incompatibles; restore DB/Drive sin rollback; payload de corte validado tarde; vídeo suplementario ignorado con success; PyS acepta referencias no verificadas; ADMIN puede editar ID; USERS puede escribir parcialmente; approveVideo no verifica destino; VIN sin formato estricto; falta suite automatizada; mapa API desincronizado; README contradice fuentes presentes en el árbol.
- Nuevas tareas AUG-122 a AUG-135. Siguiente unidad AUD-T-020 — Saneamiento arquitectural, DRY, anti-debugging y auditorías globales.
- No se modificó código de aplicación, servicios, endpoints, configuración, assets, datos productivos, Drive, Spreadsheet ni deployments. Sin merge ni despliegue.

## Continuidad de auditoría — AUD-T-020
- Fecha: 2026-11-08. Sesión AUD-20261108-S038; checkpoint AUD-CP-0038.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado 25d5d548edd79f812ab6b2bf9411d8c77fb30188; árbol 011980eae1ae02143377faffcf5148c7067bfad7; base GPSpedia2.2.5 en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-020 — Saneamiento arquitectural, DRY, anti-debugging y auditorías globales: E1 estática completada; H-AUD-020-001 a H-AUD-020-004 abiertos; H-AUD-020-005 corregido documentalmente; VAL-29 pendiente.
- Hallazgos principales: bloqueos frontend no son seguridad y restringen zoom; logs add_cortes imprimen pendingOp con Base64; parsers VIN/versiones y helpers Drive duplicados con diferencias; funciones huérfanas y markup de depuración sin consumidores encontrados.
- Nuevas tareas AUG-136 a AUG-139; adendas a AUG-036 y AUG-104. La cobertura se actualizó a 34 E1, 1 parcial y 3 por auditar.
- No se modificó código, servicios, endpoints, configuración, assets, datos productivos, Drive, Spreadsheet ni deployments. No hubo ejecución funcional.
- Siguiente unidad: AUD-T-021 — Ficha técnica imprimible, paginación y distribución adaptativa de imágenes.

## Continuidad de auditoría — AUD-T-021
- Fecha: 2026-11-08. Sesión AUD-20261108-S039; checkpoint AUD-CP-0039.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado 3339694150823f8f8adca6ffbad6211c708a8960; árbol ebe322745a0458df1dbf749a28517ce97e36eb08; base GPSpedia2.2.5 en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-021 — Ficha técnica imprimible, paginación y distribución adaptativa de imágenes: E1 estática completada; H-AUD-021-001 a H-AUD-021-009 abiertos; VAL-30 pendiente.
- Hallazgos principales: margen 5 mm vs 10 mm; falta imagen Check Engine y aviso antes de imagen; recursos no esperados antes de imprimir; riesgo de overflow y tarjetas sin imagen fuera de orden; QR expone URL unlisted a tercero; selector Vertical duplicado; datos de catálogo interpolados sin escape; referencia 6d7fbb9c ajena a impresión en Plan_Auditoria.
- Nuevas tareas AUG-140 a AUG-146; adenda AUG-096. Cobertura consolidada: 35 E1, 1 parcial y 2 por auditar.
- No se modificó código, CSS, assets, servicios, endpoints, contratos, configuración, datos productivos, Drive, Spreadsheet ni deployments. No hubo navegador, impresión, PDF ni QR real.
- Siguiente unidad: AUD-T-022 — Panel de desarrollador, navegación por secciones y modal administrativo.

## Continuidad de auditoría — AUD-T-022
- Fecha: 2026-11-08. Sesión AUD-20261108-S040; checkpoint AUD-CP-0040.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado 8f5d6d74f8f6b156ef67f3b21b6c0eeacf59d07b; árbol e0c80e7334378847c24e9ada5020248a539cb168; base GPSpedia2.2.5 en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-022 — Panel de desarrollador, navegación por secciones y modal administrativo: E1 estática completada; H-AUD-022-001 a H-AUD-022-004 abiertos; VAL-31 pendiente.
- Hallazgos: logout no revoca ActiveSessions ni limpia currentUser; modal permanece al mostrar login; faltan semántica y gestión de foco de diálogo; ARIA de pestañas incoherente; errores de consola siempre se muestran como HTTP 500.
- Controles: backend ADMIN valida sesión activa y rol desde servidor para todas las acciones excepto ping; acciones del panel alineadas con mapa y dispatch; cinco secciones; consola única; listeners protegidos; sin IDs HTML duplicados.
- Nuevas tareas AUG-147 a AUG-150. Cobertura: 36 E1, 1 parcial y 1 pendiente (AUD-T-001). Inventario AUG: 149 IDs; AUG-015 sigue ausente.
- No se modificó código, HTML, CSS, servicios, endpoints, permisos, contratos, configuración, assets, datos productivos, Drive, Spreadsheet ni deployments. Sin navegador, lector de pantalla, pruebas de logout, HTTP ni Apps Script.
- Siguiente unidad: AUD-T-001 — Recuperación del App Shell, arranque, inicialización y estabilización general.


## Continuidad de auditoría — AUD-T-001
- Fecha: 2026-11-08. Sesión AUD-20261108-S041; checkpoint AUD-CP-0041.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado 35446ac7dd3697b4cd318895c9040e3bf239720c; árbol 0d9e88098c57b7550334e84bf74feecf6fef83ae; base GPSpedia2.2.5 en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-001 — Recuperación del App Shell, arranque, inicialización y estabilización general: E1 estática completada; H-AUD-001-001 y H-AUD-001-002 abiertos; VAL-32 pendiente.
- Hallazgos: polling indefinido de deep link cuando catalogData.cortes permanece vacío/no listo; processCatalogData absorbe excepciones y los llamadores marcan catalogLoaded=true sin confirmar actualización.
- Revalidaciones: H-AUD-015-002/AUG-099 para filtros retirados; H-AUD-024-001/002/AUG-008 para bloqueo entre pestañas. No duplicar.
- Nueva tarea AUG-151; adendas a AUG-008 y AUG-049. La Tarea 1 mantiene su estado histórico COMPLETADA; E1 no certifica pruebas funcionales.
- No se modificó código, HTML, CSS, servicios, endpoints, contratos, configuración, assets, permisos, datos productivos, Drive, Spreadsheet ni deployments. No hubo ejecución funcional.
- Siguiente unidad: AUD-T-002 — RBAC, AUTH, USERS, roles y autorización de operaciones de usuario (continuidad desde AUD-CP-0002).


## Continuidad de auditoría — AUD-T-002
- Fecha: 2026-11-08. Sesión AUD-20261108-S042; checkpoint AUD-CP-0042.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado 1136f20ee25778cceac857b4a3145aa2f405ba54; árbol 5904f6ec4449fa94e7a2cbf6149ae0a885ca128f; base GPSpedia2.2.5 en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-002 — RBAC, AUTH, USERS, roles y autorización de operaciones de usuario: E1 estática completada; H-AUD-001 a H-AUD-006 abiertos; AUG-005 a AUG-010 existentes y revalidados.
- Archivos: Services/users.js (9b7ce20b40e5fdac1f1c106e769f9e539ad858b0), Services/Auth.js (fc69357b655c023b5ab3f7dd72cdab6fbb1787ed), auth.js (2dc65f2e5903fc208ca14505053e82203a9dbd86), users.html (e41f402675677a4d2783493614737021ec2eade5), api-config.js (a5c718d01b7da50b4b5e650c3bacd91456f4d670).
- No se crearon hallazgos ni tareas nuevas. Se mantienen vínculos con AUD-T-023 (hashing/credenciales), AUD-T-024 (ciclo avanzado de sesiones y controles), AUD-T-033 (coordinación interservicios) y AUD-T-036 (legal/consentimiento).
- E1 no incluye pruebas de navegador, Apps Script, HTTP, Spreadsheet, roles, sesiones, concurrencia, múltiples pestañas ni deployments. No se modificó código, configuración ni datos productivos.
- Siguiente unidad: AUD-T-003 — Registro de vehículos y cortes, add_cortes, idempotencia y resiliencia de red.


## Continuidad de auditoría — AUD-T-011
- Fecha: 2026-11-08. Sesión AUD-20261108-S051; checkpoint AUD-CP-0050.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD previo 2a966d3fe9f56b24125c109f257959bceb8940e0; árbol 0d0a4771ef652819fdbd5425047bff90d617bbe9; base GPSpedia2.2.5 d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- E1 histórica AUD-20261108-S029/AUD-CP-0029 en bba61f0cd16e5a35d6f709e048ebd31d8709a193. Comparación: 21 commits posteriores, exclusivamente ocho archivos documentales; los ocho archivos funcionales/esquema de PyS conservan los mismos SHA.
- AUD-T-011 permanece E1 estática completada; H-AUD-011-001 a 007 abiertos; AUG-082 a 087 pendientes; adendas AUG-040/AUG-057. No hay nuevos hallazgos/tareas.
- VAL-20, VAL-03, VAL-09, VAL-13 y VAL-14 continúan pendientes. No se ejecutaron pruebas E2/E3 ni servicios, Drive, Spreadsheet, navegador, XSS, FileReader, concurrencia o deployments.
- No se modificó código ni datos productivos. Siguiente unidad: AUD-T-012 — Vinculación bidireccional PyS–vehículos y navegación sin ciclos.


## Continuidad — AUD-T-012 (revalidación, 2026-11-08)
- Sesión/checkpoint: AUD-20261108-S052 / AUD-CP-0051.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD histórico 2afdde923d14e4f3dd078d347007b15e5ab09b2b, árbol 06fc72da78912df18227e2f45ce0d33349fa7cc5; HEAD previo actual 453e9f0a8d6ded97e91e7841ea1a39c697939e0d, árbol 18ac8adf31b0564be76958b09ef895193bfd16bb; base GPSpedia2.2.5 d9acc68d889985c2e2f42fe3a02e502efc86ead1 sin cambios.
- Comparación: 21 commits posteriores al E1, solo ocho archivos documentales; nueve archivos del alcance PyS–vehículos conservan exactamente sus SHA históricos.
- AUD-T-012 permanece E1 estática completada y vigente; H-AUD-012-001 a H-AUD-012-008 siguen abiertos o vinculados a correcciones existentes.
- AUG-088 a AUG-091 pendientes; adendas AUG-043 y AUG-087; suite reproducible continúa dentro de AUG-002/VAL-21. Sin hallazgos ni tareas duplicadas.
- Hallazgos revalidados: pérdida de contexto anti-ciclo tras asociación; pila modal duplicable/incompleta; retorno sin scroll/carrusel/acordeón; credenciales omitidas en add/remove; relaciones sin integridad referencial ni lock; texto del acordeón discrepante; consultas getPysData repetidas; suite de pruebas PyS–vehículo no reproducible.
- VAL-21 y pruebas transversales VAL-03/VAL-09 pendientes. No se ejecutaron E2/E3, Playwright, navegador, HTTP, Apps Script, Spreadsheet real, concurrencia, permisos en deployment ni deployments.
- Sin cambios funcionales ni operaciones sobre datos productivos. Siguiente: AUD-T-013 — Tutoriales, multimedia y carga directa de vídeos YouTube con aprobación.


## Continuidad — AUD-T-013 (revalidación, 2026-11-08)
- Sesión/checkpoint: AUD-20261108-S053 / AUD-CP-0052.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD E1 d8a164c2974f4dc472f169442c2b7efb969bf350, árbol abce39b7f437ecd02647bebdf4252f47d4ed4ca2; HEAD previo actual f90be001f1c1bf23e67f144bc5a57d36d4cad58a, árbol 81227c2a3ffbbfc97930a302f96b2c27d62c37bc; base GPSpedia2.2.5 d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 21 commits posteriores, únicamente ocho archivos documentales; diez archivos de aplicación/estudio conservan sus SHA históricos.
- AUD-T-013 mantiene E1 estática completada; H-AUD-013-001 a H-AUD-013-010 permanecen abiertos o vinculados.
- Hallazgos revalidados: uploader omite sessionToken; URL pending puede persistirse antes de aprobación; approveVideo solo asocia Corte; esquema Tutorial 5/7 columnas; addTutorial sin auth/dedup; approve/reject sin guard de tipo/estado; ID/URL provisional; sin recuperación IndexedDB/308; sink HTML en Inbox; uploader sin History API y contrato/metadatos inconsistentes.
- AUG-092 a AUG-094 pendientes; adendas AUG-043/AUG-068; coordinación AUG-040; VAL-22 planificada. No se crean tareas duplicadas.
- Tarea 12 permanece históricamente COMPLETADA. No se ejecutaron YouTube API/OAuth/XHR, navegador/Playwright, Apps Script, Spreadsheet/Drive real, concurrencia, red/308, XSS, deployments ni E2/E3.
- Sin cambios de aplicación, scopes OAuth, Google Cloud, endpoints, configuración, assets o datos productivos. Siguiente: AUD-T-014 — Texto enriquecido, sanitización, listas, párrafos y saltos de línea.


## Continuidad — AUD-T-014 (revalidación, 2026-11-08)
- Sesión/checkpoint: AUD-20261108-S054 / AUD-CP-0053.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD histórico E1 deefa3a8ceca4aae892c61d0e99fec73c3e44837, árbol af44c6c3d2c911f72e6891f9b935a83fdcb83a38; HEAD previo actual 8b09d684c6bd43e2dc43a0cd04feebedd0f40b11, árbol 76cff9eb079795c0e6b5ccf0022bced3232a012c; base GPSpedia2.2.5 d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 21 commits posteriores, ocho archivos documentales; los siete archivos funcionales de texto enriquecido conservan exactamente sus SHA históricos.
- AUD-T-014 mantiene E1 estática completada; H-AUD-014-001 a 003 continúan abiertos: saneamiento backend no autoritativo, dos sinks HTML sin sanitización y modo estricto/avanzado no conectado.
- AUG-095 a AUG-097 pendientes; VAL-23 planificada. Sin nuevos hallazgos/tareas ni duplicación. Tarea 13 conserva su estado histórico COMPLETADA.
- No se ejecutaron navegador, DOMParser real, XSS, Playwright, HTTP, Apps Script, Spreadsheet/Drive real, concurrencia, service worker en dispositivo ni E2/E3. Sin cambios funcionales ni operaciones productivas.
- Siguiente unidad: AUD-T-015 — Búsqueda global, filtros rápidos y resultados jerárquicos; respetar la cancelación documentada de filtros rápidos.


## Continuidad AUD-T-015 — 2026-11-08
- Revalidación E1 en AUD-20261108-S055/AUD-CP-0054; HEAD histórico c4f61a1f8dc402c9fec6802032ca7d7f9c304695; HEAD actual 503ed0678a718b4c9179b3c28d2373263cb8cc86; rama GPSpedia2.2.5_work; base d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 21 commits posteriores, exclusivamente documentales. Los nueve archivos funcionales de búsqueda, jerarquía, filtros cancelados y botones conservan exactamente sus SHA de la E1.
- H-AUD-015-001 a 004 siguen abiertos; H-AUD-037-003 a 006 continúan vinculados a AUG-049. AUG-098 a AUG-101 y VAL-24 pendientes. Sin hallazgos/tareas duplicados.
- La cancelación de filtros rápidos se mantiene como restricción. No ejecutar cambios de código durante E1.
- Sin navegador, XSS, Playwright, catálogo real, Apps Script/Spreadsheet, concurrencia, pruebas móviles ni E2/E3. Siguiente unidad: AUD-T-016, revalidación de continuidad.


## Continuidad AUD-T-016 — 2026-11-08
- Revalidación E1 en AUD-20261108-S056/AUD-CP-0055; HEAD histórico 2daf88c96d29999cbc734c968ef94355ee5324ca; HEAD actual 39d35bbe4bb0e6497ab444ced3afae62b679724c; rama GPSpedia2.2.5_work; base d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 21 commits posteriores, solo documentales. Los seis archivos funcionales del alcance visual/tema/responsive conservan exactamente sus SHA de E1.
- H-AUD-016-001 a 004 siguen abiertos; AUG-102 a AUG-105 pendientes; VAL-25 planificada. Sin hallazgos/tareas duplicados.
- Los hallazgos de botones siguen vinculados a AUG-100. Sin navegador, mediciones WCAG, zoom real, lectores de pantalla, Android/iOS, PWA ni E2/E3.
- Siguiente unidad: AUD-T-017, revalidación de continuidad E1.


## Continuidad AUD-T-017 — 2026-11-08
- Revalidación E1 en AUD-20261108-S057/AUD-CP-0056; HEAD histórico 11d617cbf6401748a017fbe69f89ab63fa08800e; HEAD actual 75ba652774610832dd4de1db86e40d75c4ef9484; rama GPSpedia2.2.5_work; base d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 21 commits posteriores, únicamente documentales. ui.js, offline.js, api-config.js, Services/feedback.js y artefactos Spreadsheet mantienen exactamente sus SHA históricos.
- H-AUD-017-001 a 007 continúan abiertos; AUG-106 a AUG-112 pendientes; VAL-26 pendiente. Sin hallazgos/tareas duplicados.
- La omisión de AUD-T-016 en Auditoría.txt sigue abierta como H-AUD-017-007; no se altera durante E1.
- No se ejecutaron navegador, IndexedDB, Apps Script, HTTP, Spreadsheet/Drive real, concurrencia ni E2/E3. Siguiente: AUD-T-018, continuidad E1.


## Continuidad de auditoría — AUD-T-018 (revalidación)
- Fecha: 2026-11-08. Sesión AUD-20261108-S058; checkpoint AUD-CP-0057.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD E1 f9c47bad48fa8050a4acac33a4a45784fe433ef7; HEAD revalidado df6a78e1fe29c6f29e864d5542cade12f8c6e7df; base GPSpedia2.2.5 d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 21 commits posteriores, solo ocho documentos modificados. Los 13 archivos funcionales del alcance conservan exactamente sus SHA históricos.
- H-AUD-018-001 a 009 continúan abiertos; AUG-113 a AUG-121 pendientes; VAL-27 pendiente. Sin hallazgos ni tareas duplicados.
- La Tarea 18 conserva su estado histórico COMPLETADA; E1 no certifica pruebas funcionales ni seguridad dinámica.
- Sin navegador, XSS real, Apps Script, HTTP, Spreadsheet/Drive real, YouTube, concurrencia, despliegue ni E2/E3. Sin cambios funcionales ni operaciones productivas.
- Siguiente unidad: AUD-T-019 — Validaciones de integridad en backend y batería exhaustiva de pruebas automatizadas.


## Continuidad de auditoría — AUD-T-019 (revalidación)
- Fecha: 2026-11-08. Sesión AUD-20261108-S059; checkpoint AUD-CP-0058.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD E1 6f0f901179c10833cbeedcb2767a25fcdd085b0d; HEAD revalidado 7fc728ab34e55674f1826713a3f868d72b9f8830; base GPSpedia2.2.5 d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 21 commits posteriores, solo ocho documentos modificados. Los 15 archivos funcionales/técnicos del alcance conservan exactamente sus SHA históricos.
- H-AUD-019-001 a 014 continúan abiertos; AUG-122 a AUG-135 pendientes; VAL-28 pendiente. Sin hallazgos ni tareas duplicados.
- Tarea 19 conserva su estado histórico COMPLETADA; E1 estática no certifica ejecución funcional de pruebas 31–38.
- Sin Apps Script, HTTP, Spreadsheet/Drive, YouTube, restauraciones, migraciones, concurrencia, estrés, runner automatizado ni E2/E3. Sin cambios funcionales ni operaciones productivas.
- Siguiente unidad: AUD-T-020 — Saneamiento arquitectural, DRY, anti-debugging y auditorías globales.


## Continuidad AUD-T-020 — 2026-11-08
- Revalidación E1 en AUD-20261108-S060/AUD-CP-0059; HEAD histórico 25d5d548edd79f812ab6b2bf9411d8c77fb30188, árbol 011980eae1ae02143377faffcf5148c7067bfad7; HEAD revalidado 8eb216b79dbfcc1d765342d69ff10fe9fa19b7e1; rama GPSpedia2.2.5_work; base GPSpedia2.2.5 d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 21 commits posteriores, exclusivamente ocho documentos. Los 27 archivos funcionales/técnicos del alcance conservan exactamente sus SHA históricos.
- H-AUD-020-001 a 004 siguen abiertos; H-AUD-020-005 corregido documentalmente. AUG-136 a AUG-139 pendientes; adendas AUG-036/AUG-104; VAL-29 pendiente. Sin hallazgos ni tareas duplicados.
- La Tarea 21 conserva estado histórico COMPLETADA; E1 no certifica pruebas funcionales ni ejecución de Drive, navegador o servicios.
- Sin Node/lint, navegador, Apps Script, HTTP, Spreadsheet/Drive, YouTube, concurrencia, restauraciones, migraciones, deployments ni E2/E3. Sin cambios funcionales ni operaciones productivas.
- Siguiente unidad: AUD-T-021 — Ficha técnica imprimible, paginación y distribución adaptativa de imágenes.


## Continuidad AUD-T-021 — 2026-11-08
- Sesión AUD-20261108-S061 | Checkpoint AUD-CP-0060 | E1 histórica 3339694150823f8f8adca6ffbad6211c708a8960 | árbol E1 ebe322745a0458df1dbf749a28517ce97e36eb08 | HEAD previo b10057cbdb0d6e8fa638571034e95d210e0c947a | árbol previo 435cb6f3507bae8cdcd3ab519d15d16cceb7dd91 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- La comparación E1→HEAD actual reporta 22 commits posteriores y únicamente ocho archivos modificados, todos documentales: Auditoría.txt, ChangesLogs.txt, Plan_auditoría/Aug_Tareas.md, Plan_auditoría/Consolidacion_Auditoria.md, Plan_auditoría/Plan_Auditoria.md, Tareas.txt, checkpoint.md y contexto_personal.md. No hay cambios en archivos funcionales, CSS, HTML de aplicación ni assets desde el árbol E1; por ello, los SHA de los artefactos de implementación revisados, incluidos ui.js, rich-text.js y style.css, siguen siendo idénticos.
- H-AUD-021-001 a H-AUD-021-009 permanecen registrados. Se conservan los nueve puntos: márgenes 5 mm frente a requisito 10 mm y contrato de paginación contradictorio; imagen/aviso Check Engine; espera incompleta de recursos; paginación sin medición real de altura; tarjetas sin imagen al final y pérdida de prioridad/orden; envío de URL de vídeo unlisted a api.qrserver.com; modo Vertical sin diferencia efectiva; interpolación HTML de datos de catálogo sin escape uniforme; y referencia histórica ajena a impresión en la fila del plan maestro. AUG-140 a AUG-145 siguen pendientes; AUG-146 continúa pendiente porque la fila maestra aún atribuye 6d7fbb9c a la ficha; AUG-096 permanece ampliada con sinks concretos de impresión. VAL-30 está planificada y no ejecutada. No se crean hallazgos ni tareas duplicados. La tarea histórica Bloque 7 conserva su estado COMPLETADA; la E1 estática no certifica impresión/PDF funcional.
- La ficha imprimible no fue ejecutada ni probada en navegador/PDF; VAL-30 sigue pendiente.
- No se ejecutaron navegador, impresión, PDF, QR/escaneo, Node/lint, pruebas móviles, red externa, Apps Script, Drive, Spreadsheet ni E2/E3. Sin cambios funcionales, CSS, HTML de aplicación, assets, servicios, endpoints, contratos, configuración, datos productivos, Drive, Spreadsheet o deployments. Sin merge ni despliegue.
- Siguiente unidad: AUD-T-022 — Panel de desarrollador, navegación por secciones y modal administrativo.


## Continuidad AUD-T-022 — 2026-11-08
- Revalidación E1 en AUD-20261108-S062/AUD-CP-0061; E1 histórica 8f5d6d74f8f6b156ef67f3b21b6c0eeacf59d07b (árbol e0c80e7334378847c24e9ada5020248a539cb168); HEAD revalidado e6e59bafd7d66b7e8d7654d7079ed276ec7cdce0 (árbol a8759daf9e718625f76a73a9ddebb088faaa54bd); rama GPSpedia2.2.5_work; base d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 22 commits posteriores, únicamente ocho documentos modificados. Los nueve archivos funcionales del alcance conservan sus SHA de E1; sin deriva funcional.
- H-AUD-022-001 a 004 siguen abiertos; AUG-147 a AUG-150 pendientes; VAL-31 pendiente/no ejecutada. Sin hallazgos ni tareas duplicados.
- La E1 estática no certifica logout/revocación, foco/ARIA real, lector de pantalla ni respuestas HTTP. Sin navegador, HTTP, Apps Script, Drive, Spreadsheet, Node/lint, concurrencia, estrés, deployments ni E2/E3.
- Sin cambios funcionales ni operaciones productivas. Siguiente unidad: AUD-T-001 — Recuperación del App Shell, arranque, inicialización y estabilización general.


## Continuidad AUD-T-001 — 2026-11-08
- Revalidación E1 en AUD-20261108-S063/AUD-CP-0062; E1 35446ac7dd3697b4cd318895c9040e3bf239720c (árbol 0d9e88098c57b7550334e84bf74feecf6fef83ae); HEAD previo 787df40810778acf35cca65ee52f84d2dcf2a991 (árbol c253c8e0672f4f97e9637b66e36592ff8cecc095); rama GPSpedia2.2.5_work; base d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 22 commits posteriores, únicamente ocho documentos modificados; los nueve archivos funcionales del alcance conservan SHA de E1. Sin deriva funcional.
- H-AUD-001-001/002 abiertos; AUG-151 pendiente; adendas AUG-008/AUG-049 y revalidación AUG-099 conservadas; VAL-32 pendiente/no ejecutada. No se duplican hallazgos ni tareas.
- La E1 estática no certifica arranque, sesión, catálogo, deep links ni ADMIN en ejecución. Sin navegador, Node/lint, HTTP, Apps Script, Drive, Spreadsheet, multi-pestaña, concurrencia, accesibilidad, despliegues ni E2/E3.
- Se detecta resumen agregado obsoleto en Tareas.txt que marca AUD-T-001 por auditar pese al registro individual E1 completada/CP-0041; queda anotado, sin alterar el registro maestro.
- Siguiente: AUD-T-002 — RBAC, AUTH, USERS, roles y autorización de operaciones de usuario.


## Continuidad AUD-T-002 — 2026-11-08
- Revalidación E1 en AUD-20261108-S064/AUD-CP-0063; E1 1136f20ee25778cceac857b4a3145aa2f405ba54 (árbol 5904f6ec4449fa94e7a2cbf6149ae0a885ca128f); HEAD previo 139c03443c6ab83173c357fbb421decf6a0294cb (árbol 256455de848d87adb8f724c5aecce1f5324d51d0); rama GPSpedia2.2.5_work; base d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 22 commits posteriores, únicamente siete documentos modificados; los cinco archivos funcionales del alcance conservan SHA de E1. Sin deriva funcional.
- H-AUD-001 a H-AUD-006 abiertos; AUG-005 a AUG-010 siguen vigentes. No se crean hallazgos ni tareas duplicados. Se conservan los vínculos con AUD-T-023, AUD-T-024, AUD-T-033 y AUD-T-036.
- La E1 estática no certifica roles, sesiones, revocación, expiración, cambios de contraseña, concurrencia ni multi-pestaña. Validación funcional/deployments pendiente.
- Sin navegador, Node/lint, HTTP, Apps Script V8, Spreadsheet, pruebas reales, concurrencia, accesibilidad, deployments ni E2/E3. Sin cambios funcionales ni operaciones productivas.
- Siguiente unidad: AUD-T-003 — Registro de vehículos y cortes, add_cortes, idempotencia y resiliencia de red.


## Continuidad AUD-T-003 — 2026-11-08
- Revalidación E1 en AUD-20261108-S065/AUD-CP-0064; E1 06f18e42383f5be448c378bc09ab534731cfbd6b (árbol df13476222de951f65c7d31559598d5fe12914a5); HEAD previo 3e6ee89273e209bfdfea7e7e9517a14efa5a9096 (árbol e68f1ee24bcad2faf275f5dd53c9e95d409ad627); rama GPSpedia2.2.5_work; base d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 44 commits posteriores; ocho archivos modificados, todos documentales. Los archivos funcionales/auxiliares del alcance mantienen SHA idénticos a E1. Sin deriva funcional.
- H-AUD-003-001 a 004 abiertos; AUG-055 a AUG-058 pendientes; AUG-043 mantiene su adenda. No se crean hallazgos ni tareas duplicados. Se conservan relaciones con AUD-T-031/032/033/035/038 y AUG-039/AUG-043/AUG-053/AUG-054.
- Hallazgos conservados: persistencia local/opId no estrictamente vinculados, disponibilidad de opciones de corte/vídeo, manejo de errores FileReader y serialización de recuperación online/visibilitychange/init.
- E1 estática no certifica cuota localStorage, FileReader real, respuesta HTTP perdida, persistencia, recuperación concurrente ni integración/deployments. Validación funcional pendiente.
- Sin navegador, Node/lint, HTTP, Apps Script V8, Drive/Spreadsheet, concurrencia, deployments ni E2/E3. Sin cambios funcionales ni operaciones productivas.
- Siguiente unidad: AUD-T-004 — VIN: identificación, colecciones, almacenamiento, búsqueda y diferencial.


## Continuidad AUD-T-004 — 2026-11-08
- Revalidación E1 en AUD-20261108-S066/AUD-CP-0065; E1 histórica 24f68780e6b7ad5ad835ce76c1d6abda0a80a528; HEAD previo b8eeeccc0571cb7bb8065cbbb6f7921fbea453bd; rama GPSpedia2.2.5_work; base d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 44 commits posteriores; ocho archivos cambiados, todos documentales. Los nueve archivos funcionales/auxiliares del alcance mantienen SHA idénticos a E1. Sin deriva funcional.
- H-AUD-004-001 a 003 abiertos; AUG-059/AUG-060 pendientes; AUG-050 conserva su ampliación y H-AUD-037-007 su relación. Sin nuevos hallazgos/tareas.
- VAL-12 y validación funcional/integración pendientes; la E1 estática no certifica ejecución real, persistencia, migración, Spreadsheet ni concurrencia.
- Sin navegador, Node/lint, HTTP, Apps Script V8, Spreadsheet/Drive, concurrencia, migración, deployments ni E2/E3. Sin cambios funcionales ni operaciones productivas.
- Siguiente unidad: AUD-T-005 — Modal de detalle, ampliación dinámica y acciones contextuales.


## Continuidad AUD-T-005 — 2026-11-08
- Revalidación E1 en AUD-20261108-S067/AUD-CP-0066; E1 histórica c56c6f7e21a668774db726e2f14139588f1bc5c0; HEAD previo c7ad01b89f7228622f9732c5d38850cd987a207a; rama GPSpedia2.2.5_work; base d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 44 commits posteriores; ocho archivos cambiados, todos documentales. Los 11 archivos funcionales del alcance mantienen SHA idénticos a E1. Sin deriva funcional.
- H-AUD-005-001 a 008 abiertos; AUG-061 a AUG-064 pendientes; AUG-043/AUG-050/AUG-057 conservan adendas. H-AUD-005-008 queda coordinado con AUD-T-007.
- Se confirman por continuidad de código los riesgos de sanitización, cupos/respuestas suplementarias, sincronización de detalle, selectores, FileReader, enlace de vídeo y contador VIN. No se duplican registros.
- Validación funcional, seguridad dinámica e integración pendientes. Sin navegador, XSS dinámico, FileReader real, concurrencia, Apps Script V8, HTTP, Spreadsheet/Drive, YouTube, móvil/PWA, deployments ni E2/E3.
- Sin cambios funcionales ni operaciones productivas. Siguiente: AUD-T-006 — Lightbox, imágenes técnicas, carrusel de cables, PNG transparente y zoom.


## Continuidad AUD-T-023 — 2026-11-08
- Revalidación en AUD-20261108-S068/AUD-CP-0067; E1 histórica 87d75c38d72e76ed60132d2507661f4e1017a0e8; HEAD 843818e9199e0952ca575196e79efa09f5bffb87; rama GPSpedia2.2.5_work; base d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 65 commits posteriores; nueve de diez archivos del alcance conservan SHA. Services/admin.js cambió, pero guardia assertDeveloperSession/doPost idéntica; Services/write.js cambió fuera del alcance.
- H-AUD-023-001 a 008 abiertos; AUG-010 a AUG-014 siguen pendientes, sin duplicación.
- Se confirman los riesgos de KDF, migración legacy, serialización de contraseñas, contador de intentos, purga de Logs, legacy inactivo, formato de hash desconocido y validación UI. ADMIN 0 conserva gate de sesión/rol para acciones distintas de ping.
- No se ejecutaron Apps Script V8, HTTP, login real, acceso a Sheets/Logs, KDF benchmark, migración, concurrencia, CacheService, deployments, navegador ni E2/E3. Sin cambios funcionales ni operaciones productivas.
- Siguiente: AUD-T-024 — Administración de usuarios, privilegios, sesiones y controles de acceso.


## Continuidad AUD-T-024 — 2026-11-08
- Revalidación AUD-20261108-S069/AUD-CP-0068; E1 histórica 3e458bbf67fce2a95847f4f5a0bf5d72170d4eec; HEAD 2f627a9f11a2e0c6282903d515b8ef893cd15b96; rama GPSpedia2.2.5_work; base d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación: 65 commits posteriores; los 12 archivos funcionales/auxiliares de alcance mantienen SHA E1. Los dos archivos de código del diff global (Services/admin.js y Services/write.js) están fuera del alcance.
- H-AUD-024-001 a 010 permanecen abiertos. Se conservan AUG-005 a AUG-008, AUG-010/AUD-T-033/AUG-003, AUG-016 y AUG-017, sin duplicación.
- Controles positivos: USERS valida token, usuario y rol en getVerifiedSession y protege resetUserSessions para Desarrollador. Persisten riesgos de coordinación AUTH/USERS, respuestas obsoletas, fallos parciales, logout local y expiración no definida.
- No se ejecutaron pruebas reales de navegador, multi-pestaña, HTTP, Apps Script, revocación, expiración, concurrencia, roles ni deployments. Sin cambios funcionales ni datos productivos.
- Siguiente: AUD-T-025 — Herramientas ADMIN: base de datos, backup, restore, logs y mantenimiento.
