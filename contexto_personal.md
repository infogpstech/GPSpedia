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
