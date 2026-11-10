================================================================================
CHECKPOINT INICIAL — DOC-MIG-2026-001
Fecha: 2026-11-09
Rama: GPSpedia2.2.5_work; HEAD inicial: 63fbee17260ce850d8dcaeae363288559c49715e
Rama base: GPSpedia2.2.5; HEAD base: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea anterior: GOV-CYCLE-2026-001.
Auditoría de tarea anterior: SIN HALLAZGOS. Se revisaron el entregable real Protocolo_Ciclo_Continuo.md y su enlace en Plan_Maestro_Implementacion.md. No se auditaron informes.
Auditoría pre-implementación actual: siete registros exceden 180,000 caracteres; falta política append-only/rotación/manifiesto. H-AUD-043 registrado antes de implementar.
Alcance: diez registros/bitácoras; nuevos registros/índices; norma documental; referencias en Protocolo y Plan Maestro. Proceso de desarollo.md preservado por su instrucción explícita.
================================================================================

================================================================================
CHECKPOINT FINAL — DOC-MIG-2026-001
Fecha: 2026-11-09. Estado: COMPLETADA EN ALCANCE DOCUMENTAL; commit incluido en HEAD verificado de GPSpedia2.2.5_work.
HEAD padre: 63fbee17260ce850d8dcaeae363288559c49715e; rama base conservada: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Diez documentos históricos archivados íntegramente en partes legacy numeradas; ninguna parte excede 180,000 caracteres Unicode.
Registros activos conservados en rutas canónicas: Auditoría.txt, ChangesLogs.txt, Tareas.txt, checkpoint.md, contexto_personal.md, Plan_Auditoria.md, Aug_Tareas.md, Consolidacion_Auditoria.md, LOGS.TXT y ChangeLog_v2.0_vs_v1.5.txt.
Norma: Plan_auditoría/Normas_Gestion_Documental.md; enlazada desde Protocolo_Ciclo_Continuo.md y Plan_Maestro_Implementacion.md.
H-AUD-043 resuelto documentalmente. La reconstrucción exacta se verifica con las partes y el manifiesto.
No se ejecutaron pruebas funcionales ni operaciones productivas. No se modificó código.
El SHA final se verifica en el ref y commit de GitHub; no se autocita aquí para evitar referencia circular.
================================================================================

================================================================================
CHECKPOINT INICIAL — DOC-REG-2026-002
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD de trabajo verificado al inicio: d18e9f1a1a356782322104e5b0425c931fd77a1e
Commit padre del HEAD: 63fbee17260ce850d8dcaeae363288559c49715e
Rama base: GPSpedia2.2.5
HEAD base verificado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea: revisar y normalizar el plan de implementación, la ubicación legacy, las normas internas y la separación de tareas pendientes/completadas y funcionalidades Beta.
Alcance documental: Plan Maestro, Normas de Gestión Documental, Contexto de trabajo, índice AUG, checkpoint, Auditoría, Tareas, ChangesLogs y nuevos registros de tareas/Beta.
Hallazgos iniciales: discrepancia de HEAD y conteos en Plan Maestro; contexto de trabajo con instrucciones de rama obsoletas; README anuncia filtros rápidos cancelados y describe de forma discordante la ubicación de Services; no existen los registros independientes solicitados.
Restricciones: no modificar Proceso de desarollo.md; no editar ni mover partes legacy; no modificar código funcional, servicios, endpoints, deployments ni datos productivos; no reintroducir filtros rápidos.
Estado inicial: auditoría documental y de estructura realizada; implementación documental pendiente.
Siguiente acción: registrar hallazgos, generar registros independientes con normas internas y sincronizar referencias sin alterar el historial legacy.
================================================================================

================================================================================
CHECKPOINT FINAL — DOC-REG-2026-002
Fecha: 2026-11-09
Estado: COMPLETADA EN ALCANCE DOCUMENTAL; sin cambios de código.
HEAD de trabajo al inicio: d18e9f1a1a356782322104e5b0425c931fd77a1e
HEAD base al inicio y conservado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Archivos nuevos: Tareas_pendientes_parte1.txt, Tareas_pendientes_parte2.txt, Tareas_pendientes_parte3.txt, Tareas_pendientes_parte4.txt, tareas_completadas_parte1.txt y lista_beta.txt.
Archivos documentales actualizados: Plan_auditoría/Plan_Maestro_Implementacion.md, Plan_auditoría/Normas_Gestion_Documental.md, Plan_auditoría/Aug_Tareas.md, Contexto de trabajo.md, Auditoría.txt, Tareas.txt, ChangesLogs.txt y checkpoint.md.
Legacy: Olds/Documentacion_Legacy/ permanece intacto; manifiesto y rutas se conservan. No se movió, truncó ni reescribió ninguna parte.
Inventario: 151 IDs AUG únicos en el rango 001–152 (AUG-015 ausente en la fuente); 49 registros históricos abiertos/parciales preservados como pendientes de reconciliación, sin reutilizar IDs.
Compuerta: ninguna tarea de implementación de código se promueve como completada sin evidencia de revisión sintáctica. DOC-MIG-2026-001 y DOC-REG-2026-002 son tareas documentales; sintaxis de código N/A.
Validaciones: límites de 180,000 caracteres Unicode; rutas y referencias; conservación de requisitos y adendas AUG; identificación de registros legacy; separación de pendientes/completadas/Beta; revisión de coherencia documental.
No ejecutadas: pruebas funcionales, navegador, Apps Script, endpoints, despliegues ni seguridad runtime; no aplican porque no se modificó código.
Hallazgos: H-AUD-044 resuelto documentalmente; H-AUD-045 y H-AUD-046 permanecen abiertos y se registran como tareas pendientes.
Siguiente paso: resolver DOC-README-2026-001/002 y después continuar el Plan Maestro por Fase 1 (P0), no iniciar AUD-T-020 como implementación independiente.
El SHA exacto de este commit se identifica en el historial de GPSpedia2.2.5_work; la rama base no se modifica.
================================================================================



================================================================================
CHECKPOINT INICIAL — DOC-PLAN-2026-003
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD de trabajo confirmado: 092b8bd73a2f5add8fb1d91b7d107aaf9a06b19d
Rama base: GPSpedia2.2.5
HEAD de rama base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea: precisar el orden de ejecución del Plan Maestro y enlazar cada grupo de tareas con el archivo canónico de requisitos.
Alcance: Plan_auditoría/Plan_Maestro_Implementacion.md, checkpoint.md, Auditoría.txt, Tareas.txt, ChangesLogs.txt y tareas_completadas_parte1.txt.
Auditoría documental: las fases existentes se solapan en IDs AUG y no declaran de forma uniforme el archivo que contiene requisitos completos. La planificación mezcla referencias/dependencias con propiedad de ejecución, por lo que puede ocasionar duplicidad o saltos de prerrequisitos.
Restricciones: no modificar código, Services, deployments, endpoints, datos productivos, archivos legacy ni Proceso de desarollo.md. No reintroducir filtros rápidos.
Estado inicial: auditoría del plan y sus fuentes de requisitos realizada; corrección documental pendiente.
Siguiente acción: agregar matriz de propiedad por fase, orden interno, bloqueos y rutas canónicas; registrar y verificar el commit único.
================================================================================

================================================================================
CHECKPOINT FINAL — DOC-PLAN-2026-003
Fecha: 2026-11-09
Estado: COMPLETADA EN ALCANCE DOCUMENTAL.
HEAD previo: 092b8bd73a2f5add8fb1d91b7d107aaf9a06b19d
HEAD base: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificaciones).
Archivo principal actualizado: Plan_auditoría/Plan_Maestro_Implementacion.md, adenda 14.
Archivos de trazabilidad actualizados: checkpoint.md, Auditoría.txt, Tareas.txt, ChangesLogs.txt y tareas_completadas_parte1.txt.
Cambios: se incorporó una matriz de orden de ejecución por fase y olas, propiedad única de AUG, rutas exactas a requisitos y dependencias bloqueantes. Se aclaró que las partes 3–4 son registros históricos abiertos/parciales que requieren reconciliación y no se ejecutan directamente. Se enlazaron normas y procedimiento obligatorio.
Verificaciones: consistencia de rutas/IDs contra archivos vigentes; límites documentales; revisión de solapamientos y dependencias; confirmación de que no se modificó código ni legacy.
No ejecutadas: pruebas funcionales, sintaxis de código, navegador, servicios o deployments; no aplican porque el cambio es exclusivamente documental.
Pendientes: DOC-README-2026-001/002 continúan abiertas. La matriz organiza su ejecución, no las declara resueltas.
Siguiente acción: ejecutar DOC-README-2026-001 y DOC-README-2026-002 según Fase 0; después continuar la Fase 1 P0 respetando sus olas.
================================================================================



================================================================================
CHECKPOINT INICIAL — DOC-README-2026-001
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD de trabajo verificado: 7c21387c8122ce84321e7e2318e750902c509010
Rama base: GPSpedia2.2.5
HEAD base verificado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea: corregir README para que no anuncie como activa la barra de filtros rápidos cancelada.
Requisitos: Tareas_pendientes_parte2.txt, sección TAREAS DOCUMENTALES ABIERTAS, DOC-README-2026-001. Plan: Plan_auditoría/Plan_Maestro_Implementacion.md, adenda 14, Fase 0.
Alcance: README.md; checkpoint.md; Auditoría.txt; Tareas.txt; ChangesLogs.txt; Tareas_pendientes_parte2.txt; tareas_completadas_parte1.txt.
Ciclo A — tarea anterior DOC-PLAN-2026-003: commit 7c21387c8122ce84321e7e2318e750902c509010, parent 092b8bd73a2f5add8fb1d91b7d107aaf9a06b19d. Se revisó el diff y los documentos de producto/trazabilidad afectados; no se encontró defecto que requiera tarea correctiva. Rama base intacta. Ciclo A cerrado.
Auditoría pre-implementación: README.md contiene una única mención de filtros rápidos en la sección 5, línea 96: anuncia barra colapsable, filtros Categoría/Año y botón #btn-toggle-filters. No se encontraron otras menciones en README.
Riesgo: borrar el bloque de novedades afectaría contenido ajeno. Se sustituirá únicamente la línea obsoleta por una declaración de cancelación. No se tocarán código ni legacy.
Estado inicial: checkpoint y auditoría completados; hallazgo H-AUD-048 registrado; respaldo exacto creado antes de editar.
Siguiente acción: reemplazar la línea obsoleta; revisar diff contra respaldo; Code Review documental; actualizar registros y checkpoint final; un commit.
Respaldo exacto README: blob 4a944ac44602152a1a4ad8e985dcf12e4e33331c.
================================================================================



================================================================================
CHECKPOINT FINAL — DOC-README-2026-001
Fecha: 2026-11-09
Estado: COMPLETADA — DOCUMENTAL.
HEAD inicial: 7c21387c8122ce84321e7e2318e750902c509010.
Rama base: GPSpedia2.2.5; HEAD inicial confirmado d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Archivo de producto modificado: README.md.
Archivos de trazabilidad: checkpoint.md, Auditoría.txt, Tareas.txt, ChangesLogs.txt, Tareas_pendientes_parte2.txt y tareas_completadas_parte1.txt.
Resultado: README ya no anuncia como activa la barra de filtros rápidos. La única mención restante declara que la funcionalidad fue cancelada y no está disponible.
Ciclo A: commit anterior DOC-PLAN-2026-003 revisado; sin hallazgos correctivos bloqueantes.
Auditoría actual: H-AUD-048 registrado y resuelto documentalmente.
Respaldo exacto README: blob 4a944ac44602152a1a4ad8e985dcf12e4e33331c.
Verificaciones: ocurrencia única identificada; reemplazo único; reconstrucción desde respaldo coincide byte por byte; resto del README conservado; Code Review documental aprobado.
Sintaxis de código: N/A; no se modificó código. Pruebas funcionales/navegador: N/A para este cambio documental.
No modificados: archivos legacy, Services, endpoints, deployments, datos productivos y rama base.
Siguiente tarea: DOC-README-2026-002 — verificar política de publicación y contenido real de Services antes de modificar esa sección del README.
Este checkpoint final es el último documento actualizado antes del único commit.
================================================================================



================================================================================
CHECKPOINT FINAL — DOC-README-2026-002
Fecha: 2026-11-09
Estado: COMPLETADA — DOCUMENTAL.
HEAD inicial: 8d296358b3b805a33d2c814406d7efe54d2782bb; rama base inicial: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Archivo de producto modificado: README.md, sección 5.
Archivos de trazabilidad actualizados: checkpoint.md, Auditoría.txt, Tareas.txt, ChangesLogs.txt, Tareas_pendientes_parte2.txt y tareas_completadas_parte1.txt.
Hallazgo H-AUD-049 resuelto. El README ya no afirma que las fuentes Services fueron retiradas mientras siguen presentes en la rama de trabajo. Explica su naturaleza temporal durante implementación/corrección y su eliminación al cierre de esa fase. Separa código fuente, deployments y endpoints.
Aclaración del usuario aplicada como política autorizada. No se eliminaron ni modificaron archivos de Services/. Tampoco se alteraron endpoints, deployments, permisos, ramas o legacy.
Validaciones: árbol de rama de trabajo/base/main contrastado; sección reemplazada una única vez; contenido no relacionado del README conservado; diff revisado; Code Review documental aprobado. Sintaxis de código y pruebas funcionales: N/A, cambio documental.
Siguiente tarea del Plan Maestro: DOC-LEGACY-2026-001, revalidar cierres históricos [X] con evidencia de commits, diffs, sintaxis, pruebas y Code Review.
Este checkpoint final es el último documento actualizado antes del único commit.
================================================================================


================================================================================
RECUPERACIÓN DE TRAZABILIDAD — DOC-README-2026-002
El siguiente checkpoint inicial fue preparado antes de la edición de README.md y quedó almacenado como blob 434759c9f0a3b886ae17f427f8249b513693313c, pero no fue incorporado al commit 8b2bec3b1e16cb06d5dc9dde95c10a024f9f5fb3. Se incorpora aquí de forma tardía y explícita mediante la tarea correctiva DOC-TRACE-2026-001; no se presenta como si hubiera formado parte del commit original.

CHECKPOINT INICIAL — DOC-README-2026-002
Fecha: 2026-11-09
Rama de trabajo: GPSpedia2.2.5_work; HEAD confirmado: 8d296358b3b805a33d2c814406d7efe54d2782bb.
Rama base: GPSpedia2.2.5; HEAD confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Tarea: reconciliar la descripción de microservicios y carpeta Services en README con la fase temporal de implementación.
Requisito: Tareas_pendientes_parte2.txt, DOC-README-2026-002. La adenda 14 del Plan Maestro establece que DOC-README-2026-002 sigue a DOC-README-2026-001.
Auditoría de ciclo anterior: commit 8d296358b3b805a33d2c814406d7efe54d2782bb revisado; README de filtros rápidos quedó actualizado; rama base intacta.
Auditoría pre-implementación: repositorio GitHub público; rama de trabajo contiene siete fuentes en Services/ (Auth.js, Utilities.js, admin.js, catalog.js, feedback.js, users.js, write.js). Rama base contiene seis de ellas; Utilities.js solo está en la rama de trabajo. La rama default main no contiene Services/. README sección 5 afirma que cuatro microservicios han sido retirados del repositorio público y que la lógica está resguardada privadamente, lo cual no describe la situación temporal actual.
Aclaración autorizada por el usuario: el repositorio está en fase de implementación; los archivos de Services son temporales y se eliminan del repositorio al finalizar las implementaciones y correcciones. No deben eliminarse durante esta tarea.
Hallazgo H-AUD-049: contradicción documental entre la afirmación de retiro definitivo y la presencia temporal de fuentes backend durante la fase de implementación.
Riesgo: confundir presencia de fuente con existencia/estado de deployments o endpoints; actualizar sección separando esos conceptos. No inferir que URLs de Apps Script equivalen a credenciales. No publicar secretos, URLs ni detalles internos en README.
Respaldos exactos previos a edición (blobs): README.md=b11c8b726086fc129402a8518e6299d591951ac1; checkpoint.md=32ee797ff8b343269fc24e6cadd517b692e117fd; Auditoría.txt=f2dce5e2c41760f0796a43bc2d3ed0624b94ef0f; Tareas.txt=44af3b0c2a60510750666d265bf7779ea54e816d; ChangesLogs.txt=4fa3310370eaf8e09fe2e2ae9d397dafd4774f2e; Tareas_pendientes_parte2.txt=799902cb559a72db8ddb0d4bceccb10171cc78c2; tareas_completadas_parte1.txt=96e885d4486722c5d3bf487847c2b664350e9ed7.
Alcance: README.md y registros de trazabilidad checkpoint.md, Auditoría.txt, Tareas.txt, ChangesLogs.txt, Tareas_pendientes_parte2.txt y tareas_completadas_parte1.txt. No tocar código, Services/, legacy, endpoints ni deployments.
Estado: checkpoint inicial, auditoría y respaldo completados; implementación documental pendiente.
================================================================================
================================================================================


================================================================================
CHECKPOINT INICIAL — DOC-TRACE-2026-001
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD confirmado antes de la tarea: 8b2bec3b1e16cb06d5dc9dde95c10a024f9f5fb3
Rama base: GPSpedia2.2.5
HEAD base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea: corregir de forma transparente la trazabilidad incompleta del cierre DOC-README-2026-002.
Alcance: checkpoint.md, Auditoría.txt, Tareas.txt, Tareas_pendientes_parte2.txt, ChangesLogs.txt y tareas_completadas_parte1.txt.
Auditoría diagnóstica: el commit 8b2bec3 contiene README.md, ChangesLogs.txt, Tareas.txt, Tareas_pendientes_parte2.txt, checkpoint.md y tareas_completadas_parte1.txt; no contiene Auditoría.txt. El diff del commit confirma que checkpoint.md recibió el bloque final de DOC-README-2026-002, pero no su checkpoint inicial. El blob temporal 434759c9f0a3b886ae17f427f8249b513693313c conserva el checkpoint inicial; el blob temporal 731136558e71014801ef96b4f98f3cb6e12346aa conserva el hallazgo H-AUD-049, ninguno incluido en el commit original.
Impacto: los registros del commit original afirman una auditoría y un checkpoint inicial versionados que no constan en el árbol del commit; la secuencia documental no cumple el procedimiento.
Criterio correctivo: preservar el commit 8b2bec3 sin reescribirlo; incorporar ahora el checkpoint inicial recuperado con nota de incorporación tardía; agregar H-AUD-049 con estado real y H-AUD-050 sobre la omisión; registrar la tarea correctiva y su commit único.
Respaldos exactos previos a esta corrección: checkpoint.md=53243c59a3c40d5704d5288da55bcb38486e4f28; Auditoría.txt=f2dce5e2c41760f0796a43bc2d3ed0624b94ef0f; Tareas.txt=4f27d4ebbb2172cdedcab9acd3f2d18de600cc4f; Tareas_pendientes_parte2.txt=4c71a56abb7d2353a30c1082baf0f5a5177039d8; ChangesLogs.txt=4f658962361049c7f90b209d01a597f9e01dd0da; tareas_completadas_parte1.txt=69241ebbf6b04321b969a4b0a78ed424162ff253.
Estado inicial: HEAD y rama base confirmados; auditoría documental completada; respaldos identificados; corrección pendiente.
Siguiente acción: incorporar las adendas, revisar diff y límites, efectuar Code Review documental y añadir checkpoint final como último documento antes del único commit.
================================================================================


================================================================================
CHECKPOINT FINAL — DOC-TRACE-2026-001
Fecha: 2026-11-09
Estado: COMPLETADA — DOCUMENTAL; pendiente únicamente de la verificación Git posterior a la publicación de este commit.
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD padre confirmado: 8b2bec3b1e16cb06d5dc9dde95c10a024f9f5fb3
Rama base: GPSpedia2.2.5; HEAD confirmado y conservado: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Archivos actualizados: Auditoría.txt, checkpoint.md, Tareas.txt, Tareas_pendientes_parte2.txt, ChangesLogs.txt y tareas_completadas_parte1.txt.
Hallazgos: H-AUD-049 incorporado con estado RESUELTO DOCUMENTALMENTE; H-AUD-050 registra y resuelve la omisión de Auditoría.txt y del checkpoint inicial en el commit 8b2bec3.
Recuperación: checkpoint inicial de DOC-README-2026-002 recuperado del blob 434759c9f0a3b886ae17f427f8249b513693313c e incorporado con nota explícita de recuperación tardía. No se afirma que formara parte del commit original.
Rectificación: el commit 8b2bec3 se conserva intacto. DOC-README-2026-002 queda cerrada documentalmente tras incorporar la auditoría omitida y documentar la secuencia de checkpoints. DOC-TRACE-2026-001 queda registrada en Tareas.txt, ChangesLogs.txt, Tareas_pendientes_parte2.txt y tareas_completadas_parte1.txt.
Respaldos exactos previos: checkpoint.md=53243c59a3c40d5704d5288da55bcb38486e4f28; Auditoría.txt=f2dce5e2c41760f0796a43bc2d3ed0624b94ef0f; Tareas.txt=4f27d4ebbb2172cdedcab9acd3f2d18de600cc4f; Tareas_pendientes_parte2.txt=4c71a56abb7d2353a30c1082baf0f5a5177039d8; ChangesLogs.txt=4f658962361049c7f90b209d01a597f9e01dd0da; tareas_completadas_parte1.txt=69241ebbf6b04321b969a4b0a78ed424162ff253.
Code Review documental: revisados los seis documentos y las adendas; se conserva el historial original; H-AUD-049 y H-AUD-050 mantienen evidencia y estados coherentes; los cambios se limitan a trazabilidad; IDs no duplicados; referencias de blobs/commits verificadas; cada archivo permanece por debajo de 180,000 caracteres Unicode.
Sintaxis de código y pruebas funcionales: N/A, no se modificó código. No se modificaron README, Services, endpoints, deployments, permisos, archivos legacy ni rama base.
Último paso documental antes del único commit: este checkpoint final.
Siguiente tarea tras verificar el commit: DOC-LEGACY-2026-001, revalidación de cierres históricos [X] según el Plan Maestro.
================================================================================


================================================================================
CHECKPOINT INICIAL — DOC-LEGACY-2026-001
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD confirmado al inicio formal: 9392b1b2c2e3c1791e6f8b73b505c565bba0950b
Rama base: GPSpedia2.2.5
HEAD base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea: revalidar los cierres históricos [X] de TAREA 1–21 antes de aceptar cualquier promoción a completadas vigentes.
Alcance: Olds/Documentacion_Legacy/Tareas_legacy_parte_001.txt a parte_004.txt, índice legacy, Tareas.txt, tareas_completadas_parte1.txt, Tareas_pendientes_parte1.txt y parte2.txt, Auditoría.txt, ChangesLogs.txt, Plan Maestro, commits/diffs, archivos fuente actuales, pruebas y revisiones de GitHub.
Restricción crítica: Olds/Documentacion_Legacy/ es inmutable. No editar, mover, truncar ni reescribir ningún archivo de esa carpeta. No modificar código ni servicios; esta tarea es de auditoría y reconciliación documental.
Inventario preliminar no vinculante: se observaron 20 encabezados históricos [X] en parte_001 (TAREA 1–3 y 5–21); TAREA 4 está [~]. El registro vigente reproduce esos 20 estados históricos. No se presupone que [X] demuestre cierre actual.
Riesgo/proceso: una exploración preliminar de contexto se realizó antes de comprobar que el checkpoint inicial de esta tarea estuviera efectivamente guardado. El blob 434759c9f0a3b886ae17f427f8249b513693313c corresponde a un snapshot previo de checkpoint.md y NO contiene este checkpoint DOC-LEGACY. Para no falsear la secuencia, esta entrada se formaliza ahora con nota de retraso; la auditoría formal se reinicia desde este punto y se volverán a verificar los datos tras esta creación. El desvío se registrará en Auditoría.txt.
Estado inicial formal: HEAD y rama base verificados; alcance y restricciones fijados; auditoría formal reiniciada; sin modificaciones en archivos de producto ni legacy.
Siguiente acción: repetir inventario de cierres, contrastar commits/diffs y revisar evidencia de sintaxis, pruebas funcionales y Code Review.
================================================================================


================================================================================
CHECKPOINT FINAL — DOC-LEGACY-2026-001 (CICLO PARCIAL)
Fecha: 2026-11-09
Estado: PARCIAL — NO CERRADA; no se promueve ninguna marca histórica [X].
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD padre confirmado: 9392b1b2c2e3c1791e6f8b73b505c565bba0950b
Rama base: GPSpedia2.2.5; HEAD confirmado y conservado: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Checkpoint inicial específico: blob 6e16091fded2fe27a8db0675dedb89dec83170a2; formalizado con retraso y con nota explícita. La exploración preliminar previa se registra en H-AUD-052; la auditoría formal se reinició después de crear el checkpoint.
Inventario: 20 tareas principales históricas [X] (TAREA 1–3 y 5–21); TAREA 4 [~]. No se cambió ningún archivo de Olds/Documentacion_Legacy/.
Archivos documentales preparados para este ciclo: Auditoría.txt, Tareas.txt, Tareas_pendientes_parte2.txt, tareas_completadas_parte1.txt, ChangesLogs.txt y checkpoint.md.
Hallazgos: H-AUD-051 documenta que commits y marcas históricas no prueban por sí solos pruebas funcionales y Code Review; H-AUD-052 documenta el checkpoint inicial formalizado tarde y el reinicio del ciclo formal. Ambos permanecen abiertos.
Sintaxis del snapshot actual: PASS_SCRIPT en Services/admin.js, Services/users.js, Services/write.js, Services/feedback.js y lightbox.js; PASS_BODY_ONLY (imports/exports retirados) en ui.js, main.js, navigation.js y api-config.js; scripts inline de add_cortes.html y users.html PASS; index.html sin scripts inline; style.css balance de llaves 545/545. Herramienta: Function constructor del runtime V8 de Code Mode, versión exacta no expuesta. No se ejecutó parser ESM/HTML/CSS completo ni se verificaron todos los snapshots históricos.
Pruebas funcionales: no ejecutadas en este ciclo. Services/Test/README.md declara que los proyectos Apps Script de prueba no han sido creados ni desplegados. Los workflows consultados son solo Pages build/deployment; no se encontró workflow de pruebas.
Code Review documental: revisión de los seis documentos preparados; los cambios están limitados a los hallazgos y estado parcial; la entrada de pendientes se modificó únicamente en la línea DOC-LEGACY; las demás adendas son append-only; H-AUD-051/052 tienen evidencia y estados coherentes; IDs no duplicados; referencias de commits/blobs comprobadas; todos los archivos permanecen por debajo de 180,000 caracteres Unicode. La descripción de los registros complementarios de impresión se cotejó con las líneas 2196–2266 de la fuente legacy y se ajustó para no atribuirlos erróneamente al encabezado TAREA 21.
Code Review de implementación histórica: no se encontró revisión formal individual de las tareas históricas; PR #129 no presenta registros de revisión asociados en la consulta. Mensajes de commit con afirmaciones de prueba no se sustituyen por artefactos reproducibles.
Decisión: conservar [X] como estado histórico no promovido; mantener TAREA 4 [~]; no certificar ninguna tarea como completada vigente. Filtros rápidos continúan cancelados y retirados; no reintroducir.
Pendientes: analizador apropiado para ESM/HTML/CSS; revisión de snapshots históricos afectados; pruebas funcionales reproducibles en entornos aislados; Code Review por tarea; reevaluar cada cierre solo cuando exista evidencia.
Verificaciones documentales: H-AUD-051/052 registrados; estado parcial en Tareas.txt y Tareas_pendientes_parte2.txt; nota de no promoción en tareas_completadas_parte1.txt; diffs revisados; límites documentales verificados; legacy intacto; rama base sin cambios.
No se modificaron código, Services, endpoints, deployments, README ni datos productivos.
Último documento de este ciclo: este checkpoint final, inmediatamente antes del único commit de auditoría parcial.
Siguiente acción: completar las validaciones pendientes y reabrir la promoción de cierres solo con evidencia verificable.
================================================================================


================================================================================
CHECKPOINT INICIAL — AUG-005 (REVOCACIÓN DE SESIONES AL ELIMINAR UNA CUENTA)
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD confirmado antes de la tarea: 1cad8d604c2147b632030dc3d33df85b826eac1f
Rama base protegida: GPSpedia2.2.5
HEAD confirmado de rama base: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea: AUG-005 — Revocar sesiones cuando se elimina una cuenta.
Alcance: revisar e implementar, si el código y los contratos lo permiten, la eliminación coherente de todas las sesiones de la cuenta eliminada y el rechazo en AUTH de tokens asociados a usuarios inexistentes; definir y probar explícitamente la autodeleción. Respetar las adendas vinculadas al mismo AUG-005; no duplicar tareas.
Archivos candidatos sujetos a auditoría: Services/users.js, Services/Auth.js, users.html, auth.js, api-config.js y archivos de configuración/contrato que las llamadas demuestren necesarios. No se presume que todos deban modificarse.
Hallazgo relacionado: H-AUD-001 y H-AUD-024-004 / H-AUD-024-010, según ficha AUG-005.
Dependencias/riesgos conocidos: sesiones almacenadas en ActiveSessions; validación AUTH debe comprobar existencia de usuario; operaciones USERS/AUTH pueden pertenecer a proyectos Apps Script distintos y sus ScriptLock no son compartidos; proteger la última cuenta Desarrollador y aclarar autodeleción sin ampliar el alcance accidentalmente.
Estado inicial: checkpoint inicial formalizado; auditoría técnica completa pendiente; no se ha modificado código ni se ha creado commit de esta tarea.
Restricciones: no tocar GPSpedia2.2.5; no usar Contents API ni commits automáticos; usar Git Database API; una sola tarea/commit; respaldos exactos antes de editar; cambios mínimos; filtros rápidos siguen cancelados; no modificar Olds/Documentacion_Legacy/ ni el procedimiento.
Siguiente acción: auditar en modo solo lectura los archivos candidatos, funciones, consumidores, llamadas y contratos; registrar hallazgos antes de editar.
================================================================================


================================================================================
CHECKPOINT FINAL — AUG-005 (BLOQUEADA POR VERIFICACIÓN DE USERS.ID)
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD padre confirmado: 1cad8d604c2147b632030dc3d33df85b826eac1f
Rama base protegida: GPSpedia2.2.5
HEAD base confirmado y conservado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea: AUG-005 — Revocar sesiones cuando se elimina una cuenta.
Estado final: BLOQUEADA; no se incorporó implementación de código.
Checkpoint inicial: formalizado antes de la auditoría en el blob 1e75f653a5d55f3921172e0c0aa8c74596a1d532 e incluido en este ciclo documental.
Auditoría: H-AUD-053 documenta la eliminación de usuarios sin limpiar ActiveSessions y la validación AUTH sin consulta de Users. H-AUD-054 documenta el riesgo de reindexación de IDs debido a la fórmula que handleCreateUser copia desde la fila anterior.
Archivos auditados: Services/users.js, Services/Auth.js, users.html, auth.js, api-config.js, Services/Test/users.js, Services/Test/Auth.js, Services/Test/README.md y puntos pertinentes de Services/admin.js.
Hallazgo bloqueante: no se puede confirmar en el repositorio si Users.ID contiene valores fijos o fórmulas dependientes de fila. El acceso al conector Google Drive/Sheets está deshabilitado por el administrador. Si los IDs dependen de fila, deleteRow() puede cambiar identificadores de otras cuentas y romper o reasignar referencias de ActiveSessions.
Decisión: no incorporar los blobs preliminares de código. No se modificaron fuentes, endpoints, deployments ni datos productivos. No se realizó ninguna operación de borrado en hojas.
Verificaciones: revisión estática de funciones y consumidores; confirmación de copias de prueba separadas; lectura de Services/Test/README.md. Se prepararon pruebas con dobles locales durante la evaluación, pero no se consideran validación funcional ni se incorporaron al registro como pruebas de implementación, porque el código no fue integrado y el esquema real permanece sin verificar.
Pruebas reales: no ejecutadas. Los proyectos Apps Script aislados aún no están creados/desplegados.
Archivos documentales del ciclo: Auditoría.txt, Tareas.txt, Tareas_pendientes_parte1.txt, ChangesLogs.txt y checkpoint.md.
Siguiente acción: confirmar en una copia aislada la fórmula/tipo de Users!A2 y la estabilidad de los IDs. Si son dependientes de fila, diseñar primero una estrategia de identificadores inmutables y revisar referencias; después reiniciar AUG-005 desde checkpoint y auditoría.
Último documento de este ciclo: este checkpoint final, inmediatamente antes del único commit documental de estado bloqueado.
================================================================================



================================================================================
CHECKPOINT INICIAL — AUG-006 (CIERRE DE SESIÓN CON REVOCACIÓN BACKEND)
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD confirmado antes de la tarea: bbd9992acd83063f480e56652a60a8223c764a68
Rama base: GPSpedia2.2.5
HEAD confirmado de rama base: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Protección técnica observada: protected=false tanto en la rama de trabajo como en la rama base; no se modificó la configuración de ramas.
Tarea: AUG-006 — Implementar cierre de sesión con revocación backend.
Alcance: acción AUTH que revoca únicamente el token invocante; limpiar Users.SessionToken solo si coincide con el token revocado; cerrar la sesión local sin esperar a la red e informar cuando la revocación remota no se confirme.
Hallazgos de origen: H-AUD-002 y H-AUD-024-008; nuevo H-AUD-055. AUG-005 permanece BLOQUEADA por H-AUD-054 y no se alteró.
Archivos candidatos confirmados: auth.js, Services/Auth.js, api-config.js y Services/Test/Auth.js. No se requiere modificar Services/users.js.
Estado inicial: checkpoint inicial registrado antes de auditoría; no se había modificado código.
Restricciones: no tocar GPSpedia2.2.5; un solo commit mediante Git Database API; respaldos exactos por SHA; cambios mínimos; no modificar Olds/Documentacion_Legacy/ ni el procedimiento; filtros rápidos siguen cancelados.
================================================================================

================================================================================
CHECKPOINT FINAL — AUG-006 (IMPLEMENTADA; VALIDACIONES PENDIENTES)
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD padre confirmado: bbd9992acd83063f480e56652a60a8223c764a68
Rama base: GPSpedia2.2.5
HEAD base confirmado y conservado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Protección técnica observada: protected=false en ambas ramas; no se modificó.
Tarea: AUG-006 — Implementar cierre de sesión con revocación backend.
Estado final: IMPLEMENTADA_PENDIENTE_DE_SINTAXIS; no se declara completada.
Checkpoint inicial: blob e32dea3dfee3411a140750d871f197e843625658; su contenido se incorpora junto con este checkpoint final en el único commit de la tarea.
Hallazgo: H-AUD-055 registrado en Auditoría.txt.
Archivos modificados: auth.js, api-config.js, Services/Auth.js, Services/Test/Auth.js, Auditoría.txt, ChangesLogs.txt, Tareas.txt, Tareas_pendientes_parte1.txt y checkpoint.md.
Resumen: auth.logout() conserva el token en memoria, retira la sesión local y muestra login antes de iniciar la petición AUTH asíncrona. Los fallos remotos se informan como revocación pendiente. AUTH valida que el token sea string no vacío, usa ScriptLock, rechaza duplicados, elimina únicamente la fila exacta, limpia Users.SessionToken solo si coincide y responde idempotentemente cuando el token ya no existe. La copia de prueba conserva su Spreadsheet ID independiente. No se registran tokens en Logs.
Respaldos exactos (blob SHA original): auth.js 2dc65f2e5903fc208ca14505053e82203a9dbd86; api-config.js a5c718d01b7da50b4b5e650c3bacd91456f4d670; Services/Auth.js fc69357b655c023b5ab3f7dd72cdab6fbb1787ed; Services/Test/Auth.js f9e522cdc673d1028ad2f6979bc860a2eff752f7; Auditoría.txt b7315578c44bc620ec0881efb6d3971c64de569e; ChangesLogs.txt 3d34fae669f880f31229b86b8eab8cf406b3a1ed; Tareas.txt 0187c0d522ee9a01532cbf7db439bb55cbe7d9bc; Tareas_pendientes_parte1.txt e7deac1ca1a5296d355fe71a6bf788e41129ff67; checkpoint.md 9d39f5af5ae674dc7f91ee2d9bcf5da056d4f14d.
Pruebas locales con dobles: backend 7/7 PASS; frontend 4/4 PASS. Casos cubiertos: revocación individual, sesiones múltiples, preservación del token más reciente, idempotencia, duplicados, fallo de limpieza secundaria, token ausente y desconexión.
Sintaxis: Node.js v22 ejecutó los fragmentos de backend y frontend modificados dentro de los harnesses. No se ejecutó parser integral ESM de auth.js/api-config.js ni parser completo de Apps Script para ambos servicios; permanece pendiente.
Validación funcional real: NO EJECUTADA. Services/Test/README.md declara que los proyectos AUTH/USERS aislados no están creados ni desplegados. No se llamaron endpoints productivos ni se modificaron datos.
Code Review: revisión estática interna de cambios y efectos completada. Se verificó que la acción no confía en userId del cliente, no borra sesiones ajenas, no limpia un token más reciente y no persiste/loguea el token bearer. Revisión independiente formal pendiente.
Riesgos/pendientes: validar sintaxis integral con parser apropiado; completar revisión independiente formal; crear/verificar deployments AUTH de prueba y ejecutar casos en Spreadsheet aislada; solo entonces reevaluar estado. AUG-005 continúa bloqueada por verificación de Users.ID.
Filtros rápidos: continúan cancelados; no se reintrodujeron ni se tocaron.
Siguiente acción: completar parser sintáctico integral y revisión independiente; después validar logout contra deployment AUTH aislado.
Este checkpoint final es el último documento preparado antes del único commit.
================================================================================


================================================================================
CHECKPOINT INICIAL — REV-AUG-006-001
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD confirmado antes de la revisión: 2342701fa31e9a19cfc0e04ff46af4bdc3ccc825
Rama base: GPSpedia2.2.5; HEAD conservado: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Alcance: parser sintáctico de los cuatro archivos de AUG-006, comparación de copias AUTH y revisión estática de concurrencia entre AUTH y USERS.
Archivos auditados: auth.js, api-config.js, Services/Auth.js, Services/Test/Auth.js, Services/users.js y Services/Test/README.md.
Restricciones: no modificar la rama base, endpoints, deployments, datos productivos ni filtros rápidos; no desplegar el código mientras existan bloqueos.
Estado inicial: implementación AUG-006 incorporada; validaciones integrales pendientes; auditoría posterior pendiente.
================================================================================

================================================================================
CHECKPOINT FINAL — REV-AUG-006-001
Fecha: 2026-11-09
Estado: REVISIÓN REALIZADA; AUG-006 BLOQUEADA POR H-AUD-056.
HEAD padre: 2342701fa31e9a19cfc0e04ff46af4bdc3ccc825. Rama base conservada: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Sintaxis: PASS en auth.js y api-config.js al analizar el cuerpo completo tras retirar import/export para el harness; PASS en los dos scripts Apps Script completos. La comprobación no demuestra ejecución real ni reemplaza la validación funcional de Apps Script.
Copia de prueba AUTH: coincide con Services/Auth.js al normalizar el Spreadsheet ID y su comentario de configuración; se conserva el ID aislado.
Code Review: segunda revisión estática identificó H-AUD-056. Services/Auth.js y Services/users.js mutan ActiveSessions con ScriptLock de proyectos distintos. La operación deleteRow(rowIndex) puede usar un índice obsoleto si USERS elimina una fila concurrentemente, con riesgo de revocar la sesión equivocada o dejar activa la solicitada.
Corrección documental: se rectifica la conclusión previa de H-AUD-055 que consideraba suficiente el lock AUTH y descartaba coordinar USERS.
Nueva tarea: AUG-100, centralizar/coordinadar las mutaciones de ActiveSessions. AUG-100 bloquea aprobación y despliegue de AUG-006.
Pruebas locales previas: backend 7/7 y frontend 4/4 PASS; no cubrían la intercalación entre proyectos. No se ejecutaron pruebas funcionales reales: Services/Test/README.md confirma que AUTH/USERS aislados no están creados ni desplegados.
No se modificó código durante esta revisión. No se llamaron endpoints productivos, no se modificaron datos, deployments, rama base ni funcionalidades canceladas. Los filtros rápidos continúan cancelados.
Siguiente acción: diseñar y ejecutar AUG-100 con prueba de intercalado; después repetir revisión independiente y validación funcional aislada para AUG-006.
Este checkpoint final cierra la revisión documental antes del único commit.
================================================================================


================================================================================
CHECKPOINT INICIAL — AUG-153
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD confirmado: 20515351c4f7c0ca4f822473e89442722539642d
Padre del HEAD: 2342701fa31e9a19cfc0e04ff46af4bdc3ccc825
Rama base: GPSpedia2.2.5
HEAD base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea: AUG-153 — Centralizar las mutaciones de ActiveSessions en AUTH.
Hallazgos: H-AUD-056 bloquea AUG-006; H-AUD-057 identifica la colisión de AUG-100. AUG-100 canónica permanece asignada a estilos de botones.
Alcance: Services/Auth.js, Services/Test/Auth.js, Services/users.js, Services/Test/users.js, api-config.js y Services/Test/README.md; revisión de consumers en users.html y del inventario completo de módulos JS/Apps Script.
Estado inicial: checkpoint y HEAD verificados; sin modificaciones de código ni documentación en esta tarea.
Restricciones: no escribir en GPSpedia2.2.5; no usar endpoints operativos ni modificar datos; conservar IDs de Spreadsheet de prueba; no tocar filtros rápidos cancelados; un solo commit Git Database API.
================================================================================

================================================================================
CHECKPOINT FINAL — AUG-153
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD padre confirmado: 20515351c4f7c0ca4f822473e89442722539642d
Rama base: GPSpedia2.2.5
HEAD base confirmado y conservado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Estado: IMPLEMENTADA_PENDIENTE_DE_SINTAXIS; validación funcional aislada pendiente. No declarar AUG-153 ni AUG-006 completadas.
Cambios: resetUserSessions se trasladó a AUTH y usa el mismo ScriptLock que login/logout; api-config enruta la acción a AUTH; se retiró el handler de escritura de USERS y de su copia de prueba; la copia AUTH se sincronizó conservando su Spreadsheet ID independiente.
Seguridad: el actor/rol se deriva del token bearer y Users; solo Desarrollador; se impide auto-cierre; se rechazan duplicados de token e IDs antes de mutar; sesiones destino se eliminan en orden descendente; los fallos parciales de eliminación devuelven closedSessions y permiten reintento; la limpieza secundaria reporta cleanupPending. No se registra el token.
Auditoría: H-AUD-056 ampliado para incluir login como escritor AUTH y queda pendiente de cierre hasta validar intercalados reales. H-AUD-057 resuelto documentalmente: AUG-100 conserva la tarea de botones y la centralización queda como AUG-153.
Archivos modificados: Services/Auth.js, Services/Test/Auth.js, Services/users.js, Services/Test/users.js, api-config.js, Services/Test/README.md, Auditoría.txt, ChangesLogs.txt, Tareas.txt, Tareas_pendientes_parte1.txt, Tareas_pendientes_parte2.txt, Plan_auditoría/Plan_Maestro_Implementacion.md, Plan_auditoría/Aug_Tareas.md y checkpoint.md.
Respaldos exactos (blob SHA anterior):
- Services/Auth.js: e24973db0b2074c9fc7fc15c8cd0cb56de9297d8
- Services/Test/Auth.js: 08c57c509943749c312df97ba5465d88a2f6565b
- Services/users.js: 9b7ce20b40e5fdac1f1c106e769f9e539ad858b0
- Services/Test/users.js: 83e0ea30dfeccc9d62a9c51f9add002c1850dde6
- api-config.js: 7f8a80b876c3b562f8730d916c8b49b12f176874
- Services/Test/README.md: 1e8da5f26942cb7eb88a6579a1c9512f86b9d9ff
- Auditoría.txt: 44b559da476deb3b45e2d8de5930ae29d1c6ae6b
- ChangesLogs.txt: 551ce99fe5befcfd2f99f22109825bde8e4075f2
- Tareas.txt: 497d831b6c3ee9f567e8175ce3204d40b6bf5ac7
- Tareas_pendientes_parte1.txt: 6dc97d1c6c19e4bb7737f45c4d20f02c39a8d3eb
- Tareas_pendientes_parte2.txt: b91eb48d548cabb318411bb04a4ccf18d4cc50fc
- Plan_auditoría/Plan_Maestro_Implementacion.md: 93d32124274093a6fdb8cccc589e8b83fa7c6174
- Plan_auditoría/Aug_Tareas.md: 54fcc151d83cd8de5938cb9aec155c9085d702d8
- checkpoint.md: ee015651fa5d2d4951d75c036ae8bc519dc13aa4
Verificaciones:
- Inventario estático de 21 archivos JS/Apps Script: no se detectaron otros escritores de ActiveSessions fuera de AUTH login/logout y el antiguo USERS reset.
- Pruebas de lógica con dobles locales: 8/8 PASS en simulación; no sustituyen pruebas concurrentes entre deployments.
- Parser sintáctico integral de todos los archivos modificados: pendiente.
- AUTH/USERS de prueba no están creados/desplegados según Services/Test/README.md. No se ejecutaron pruebas funcionales reales ni intercalados entre proyectos.
Code Review estática: segunda revisión de seguridad/efectos colaterales completada; el lock compartido cubre los tres caminos de escritura. La modificación no resuelve los riesgos independientes de Users.ID y borrado físico (H-AUD-053/H-AUD-054/AUG-005).
No se modificaron users.html, deployments, endpoints operativos, datos productivos, rama base ni archivos legacy. Filtros rápidos continúan cancelados.
Siguiente acción: parser integral; después crear y verificar deployments aislados AUTH/USERS y probar intercalados reales de login/logout/reset, con filas objetivo al inicio/medio/final, sesiones múltiples, duplicados y fallos parciales. Solo entonces reevaluar H-AUD-056 y desbloquear AUG-006.
Este checkpoint final se incorpora como último documento antes del único commit de AUG-153.
================================================================================


================================================================================
CHECKPOINT INICIAL — AUG-005 (REANUDACIÓN CON AUTORIZACIÓN EXPLÍCITA)
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD confirmado: c3bc6df232eed42e9cc015e3b3453a77d2c9b5c0
Rama base protegida: GPSpedia2.2.5
HEAD base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea: AUG-005 — revocar sesiones al eliminar cuentas y validar la existencia del usuario.
Autorización del usuario: los registros actuales son de prueba y no hay usuarios en producción; se autoriza resolver H-AUD-054 y avanzar.
Hallazgos conocidos: H-AUD-053 (eliminación no revoca sesiones y AUTH valida solo ActiveSessions); H-AUD-054 (posible reindexación de Users.ID al eliminar físicamente una fila); dependencias de concurrencia AUTH/USERS por confirmar.
Alcance preliminar: Services/users.js, Services/Auth.js, copias Services/Test, users.html, api-config.js y documentación de esquema/pruebas. Se confirmaron consumidores de IDs como valores/cadenas; no se encontró aritmética dependiente de IDs numéricos.
Estado inicial: HEAD de ambas ramas verificado; auditoría actual aún no iniciada; no se había modificado código ni documentación de producto en esta tarea.
Restricciones: no modificar GPSpedia2.2.5; no llamar endpoints operativos ni modificar datos/deployments; preservar Spreadsheet IDs de prueba; no reintroducir filtros rápidos cancelados; respaldar archivos antes de editar; un solo commit Git Database API.
Siguiente paso: auditar línea por línea, documentar hallazgos y después implementar.
================================================================================


================================================================================
CHECKPOINT FINAL — AUG-005
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD padre confirmado: c3bc6df232eed42e9cc015e3b3453a77d2c9b5c0
Rama base: GPSpedia2.2.5
HEAD base confirmado y conservado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Estado: COMPLETADA EN FUENTES; validación funcional aislada diferida a Beta.
Resumen: deleteUser se centralizó en AUTH bajo el mismo ScriptLock que login/logout/resetUserSessions. La cuenta se desactiva lógicamente sin eliminar ni desplazar la fila Users; se conserva su ID y se limpian credenciales/perfil. Se revocan todas las sesiones en orden descendente; el fallo parcial mantiene la cuenta desactivada y permite reintento. AUTH valida token único y usuario único/activo; login revalida dentro del lock antes de crear sesión. USERS filtra cuentas desactivadas y asigna UUID estático a cuentas nuevas. UI y backend bloquean autodeleción.
Archivos modificados: Services/Auth.js, Services/Test/Auth.js, Services/users.js, Services/Test/users.js, users.html, api-config.js, Services/Test/README.md, Spreadsheet/GPSpedia_DB_columnas.md, Auditoría.txt, ChangesLogs.txt, Tareas.txt, Tareas_pendientes_parte1.txt, tareas_completadas_parte1.txt, Plan_auditoría/Aug_Tareas.md, Plan_auditoría/Plan_Maestro_Implementacion.md, lista_beta.txt y checkpoint.md.
Respaldos exactos (blob SHA anterior):
- Services/Auth.js: 726de51c4291e284745947bbc228ed521ae53afc
- Services/Test/Auth.js: 6d1c369889ea03d590c3359a2a7d9618db475db4
- Services/users.js: 50279e9141395661941036b0ca9dcf9a070d1937
- Services/Test/users.js: 930c089d6ee12b3ba6e94b40b3c5515ef4faa512
- users.html: e41f402675677a4d2783493614737021ec2eade5
- api-config.js: ca7e5860c7a1ff13e2fec166e4fc7b0272056c2d
- Services/Test/README.md: aefabb12367462ab58d458e03973218e82b36e9a
- Spreadsheet/GPSpedia_DB_columnas.md: 21e353fd74ad97496de4ff15677d03a3cf9b5f05
- Auditoría.txt: 148200c55bc0d68ebaf39110191c2bceac189338
- ChangesLogs.txt: 4f32218ad8d15cb6a87d97fa79d9fd87aa319f2a
- Tareas.txt: 12c1f48ab96cc082ce3d0ad6cc39ac76d1e6ba6e
- Tareas_pendientes_parte1.txt: a97cdc8af076a80b60acf1df5d23999d7a8404fd
- tareas_completadas_parte1.txt: bc19116bfe46f886a03b4c9240e75a1039b7546c
- Plan_auditoría/Aug_Tareas.md: 11bcb0873f6c540e9a81ff45eb961c915b294d58
- Plan_auditoría/Plan_Maestro_Implementacion.md: fc33d55d358e48951269d6446635b448dbab7a1c
- lista_beta.txt: 6e4a0d1732d948acbcccc1a92633027706b872f9
- checkpoint.md: b94392be1b8db6cea0cd7fe8cbf715ce717e14f5
Verificaciones: se congelan los IDs históricos antes de la desactivación y se rechazan IDs vacíos/duplicados; parser PASS en cuatro scripts Apps Script; api-config.js PASS tras retirar exportaciones ESM para el harness; script inline users.html PASS; copias de prueba coinciden al normalizar Spreadsheet IDs; lógica con dobles locales 13/13 PASS. Code Review revisó RBAC, tokens duplicados, unicidad de IDs, tombstone, orden de borrado, lock común, login concurrente, reintentos y preservación de filas/IDs.
Limitaciones: no se crearon deployments; no se ejecutaron pruebas funcionales reales ni endpoints operativos. Las validaciones aisladas/concurrentes se agregaron a lista_beta.txt. No se modificaron rama base, datos productivos, deployments, legacy ni filtros rápidos cancelados.
Siguiente tarea: continuar con AUG-001 según el orden maestro, sin iniciar otra tarea hasta verificar el commit y el estado de la rama.
Este checkpoint final se incorpora como último documento antes del único commit de AUG-005.
================================================================================


ADENDA DE VERIFICACIÓN — AUG-005
La revisión final amplió la protección de Users.ID: antes de cambiar nombre/rol, AUTH obtiene los valores calculados de todos los IDs existentes, rechaza filas con datos sin ID y cualquier ID duplicado, y escribe esos valores como constantes. Esto evita que fórmulas históricas dependientes de nombre, fila u otros campos cambien al desactivar la cuenta. Las cuentas nuevas ya no copian fórmulas: solo copian formato y validación de datos y escriben UUID estático. La batería final quedó en 13/13 pruebas lógicas PASS; las pruebas incluyen IDs duplicados/vacíos y preservación de valores. Sintaxis PASS en cuatro scripts Apps Script, api-config.js y script inline users.html.


================================================================================
REINICIO DEL CICLO POR CODE REVIEW — AUG-005
Fecha: 2026-11-09. HEAD de trabajo sin cambios: c3bc6df232eed42e9cc015e3b3453a77d2c9b5c0. Rama base conservada: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Observación: la revisión detectó que ADMIN, FEEDBACK y WRITE validan sesiones consultando ActiveSessions; algunos consumidores no comprueban el estado tombstone de Users. Si AUTH desactivara primero una cuenta y una revocación posterior fallara parcialmente, esos servicios podrían aceptar tokens residuales.
Acción: reiniciar auditoría del flujo de eliminación y de los consumidores de ActiveSessions; ajustar el orden para retirar/inutilizar los tokens antes de desactivar la cuenta; documentar el hallazgo antes de modificar fuentes. Los respaldos exactos de AUTH son los blobs 08bbe08f416a4703fbef94a05939c3773f4b3f93 y 345dd76efea09447d9663cee5914870e6e6c8532.
Estado: ciclo anterior no se publica; no se ha movido la rama. Ningún endpoint ni dato fue modificado.
================================================================================



================================================================================
CHECKPOINT FINAL — AUG-005 (CIERRE TRAS CODE REVIEW)
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD padre confirmado: c3bc6df232eed42e9cc015e3b3453a77d2c9b5c0
Rama base: GPSpedia2.2.5
HEAD base confirmado y conservado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Estado: COMPLETADA EN FUENTES; validación funcional real diferida a Beta.
Resumen: deleteUser se centralizó en AUTH bajo el mismo ScriptLock que login/logout/resetUserSessions. La cuenta se desactiva lógicamente sin eliminar ni desplazar la fila Users; antes de limpiar el perfil, AUTH congela como valores estáticos los IDs calculados de todas las filas y aborta ante IDs vacíos/duplicados. Las cuentas nuevas reciben UUID estático y solo copian formato/validaciones, nunca fórmulas de ID. AUTH valida token único y usuario único/activo; login revalida dentro del lock antes de crear sesión. USERS filtra cuentas desactivadas. UI y backend bloquean autodeleción.
Code Review: H-AUD-058 resuelto con revalidación de login dentro del lock. H-AUD-059 resuelto al verificar que AUTH, USERS, ADMIN, FEEDBACK y WRITE rechazan cuentas tombstone; FEEDBACK se reforzó porque permitía allowedRoles=null sin validar estado. ADMIN ya rechaza por rol Desarrollador y WRITE por Nombre_Completo vacío.
Archivos modificados: Services/Auth.js, Services/Test/Auth.js, Services/users.js, Services/Test/users.js, Services/feedback.js, users.html, api-config.js, Services/Test/README.md, Spreadsheet/GPSpedia_DB_columnas.md, Auditoría.txt, ChangesLogs.txt, Tareas.txt, Tareas_pendientes_parte1.txt, tareas_completadas_parte1.txt, Plan_auditoría/Aug_Tareas.md, Plan_auditoría/Plan_Maestro_Implementacion.md, lista_beta.txt y checkpoint.md. Services/admin.js y Services/write.js se auditaron/probaron, pero no se modificaron.
Respaldos exactos (blob SHA anterior):
- Services/Auth.js: 726de51c4291e284745947bbc228ed521ae53afc
- Services/Test/Auth.js: 6d1c369889ea03d590c3359a2a7d9618db475db4
- Services/users.js: 50279e9141395661941036b0ca9dcf9a070d1937
- Services/Test/users.js: 930c089d6ee12b3ba6e94b40b3c5515ef4faa512
- Services/feedback.js: 3db189523f6cb849d33550f29971c0ec6f386b3a
- users.html: e41f402675677a4d2783493614737021ec2eade5
- api-config.js: ca7e5860c7a1ff13e2fec166e4fc7b0272056c2d
- Services/Test/README.md: aefabb12367462ab58d458e03973218e82b36e9a
- Spreadsheet/GPSpedia_DB_columnas.md: 21e353fd74ad97496de4ff15677d03a3cf9b5f05
- Auditoría.txt: 148200c55bc0d68ebaf39110191c2bceac189338
- ChangesLogs.txt: 4f32218ad8d15cb6a87d97fa79d9fd87aa319f2a
- Tareas.txt: 12c1f48ab96cc082ce3d0ad6cc39ac76d1e6ba6e
- Tareas_pendientes_parte1.txt: a97cdc8af076a80b60acf1df5d23999d7a8404fd
- tareas_completadas_parte1.txt: bc19116bfe46f886a03b4c9240e75a1039b7546c
- Plan_auditoría/Aug_Tareas.md: 11bcb0873f6c540e9a81ff45eb961c915b294d58
- Plan_auditoría/Plan_Maestro_Implementacion.md: fc33d55d358e48951269d6446635b448dbab7a1c
- lista_beta.txt: 6e4a0d1732d948acbcccc1a92633027706b872f9
- checkpoint.md: b94392be1b8db6cea0cd7fe8cbf715ce717e14f5
Verificación: 20/20 pruebas lógicas PASS (13 AUTH/USERS, 3 FEEDBACK, 2 ADMIN, 2 WRITE); sintaxis PASS en cuatro scripts AUTH/USERS, Services/feedback.js, Services/admin.js, Services/write.js, api-config.js (harness ESM) y script inline users.html. Copias de prueba AUTH/USERS coinciden al normalizar únicamente Spreadsheet ID/comentario; IDs aislados preservados. Aug_Tareas.md permanece bajo 180,000 caracteres.
Limitaciones: no existen deployments aislados según Services/Test/README.md. No se ejecutaron pruebas funcionales reales ni endpoints operativos. Las pruebas funcionales y concurrentes aisladas se agregaron a lista_beta.txt. No se modificaron rama base, datos productivos, deployments, legacy ni filtros rápidos cancelados.
Siguiente tarea: continuar con AUG-001 según el orden maestro, después de verificar el commit y la rama.
Este checkpoint final es la última actualización documental antes del único commit de AUG-005.
================================================================================

================================================================================
CHECKPOINT INICIAL — AUG-007 — 2026-11-09
Repositorio: infogpstech/GPSpedia.
Rama de trabajo: GPSpedia2.2.5_work; HEAD inicial: d3e419bd65abefdfc9df89a1078c3c0ee831a917.
Rama base: GPSpedia2.2.5; HEAD base verificado: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Tarea: AUG-007 — política de expiración y revocación tras cambio de contraseña.
Decisión aprobada: 3 meses calendario absolutos; 1 mes calendario de inactividad; cambio propio revoca todas las sesiones; restablecimiento administrativo de contraseña y cierre remoto de sesiones requieren Desarrollador.
Alcance: Services/Auth.js, Services/Test/Auth.js, Services/users.js, Services/Test/users.js, Services/admin.js, Services/feedback.js, Services/write.js, auth.js, api-config.js, users.html, Services/Test/README.md, Spreadsheet/GPSpedia_DB_columnas.md y registros de auditoría/seguimiento.
Respaldo exacto de fuentes previo a edición (SHA de blobs):
- Services/Auth.js: 6258f50ca077cb9aace13402d500f8b4eeb86956
- Services/Test/Auth.js: 4912d9bf3038dd1deb11d247f17c9dd51af721c9
- Services/users.js: 898ebf13a4bf67f8901c196fe005741d7b477ca3
- Services/Test/users.js: efe18843dc49b303d1d64ec49634655ea7cd746c
- Services/admin.js: ffb120badeb9e8cbe931226a0ce90c0476363012
- Services/feedback.js: 62c5287b4b862f5ca420529cea895df98f73ab33
- Services/write.js: 0c603ce8b56a871a6d9396bd5b047e364f9f580e
- auth.js: 67da2eb1da4f497481aecf416716c1493877be76
- api-config.js: 4a673b1c06398b7ec6faadc2a92efb63132b7b70
- users.html: 7fe48910bf9b99b4e6825cd33a772bfc5b58b4b2
- Services/Test/README.md: e08827a48c47397c00bc3ccd8b124a6aaa24a262
- Spreadsheet/GPSpedia_DB_columnas.md: 1720d06b19a678096133f6176499c5e3b7327b2b
- Auditoría.txt: 8b2296c9d829361d99bbb35f8ef045d383bf762e
- Tareas.txt: 5a77f30c194a3bfad792ccffc6aa5758132699cd
- Tareas_pendientes_parte1.txt: ee67cdb8b1911ed83ff99f76da592e33261cd9e6
- tareas_completadas_parte1.txt: dfdfb543050481bffa7adf8210813acc1e17bbd3
- lista_beta.txt: f5513263bd2677c3be2298d013042561c523424f
- ChangesLogs.txt: a3eacd86e84267f5700a0567deb497d307706b74
- checkpoint.md: 9dfa998b842042cadfc7f8b88316a5ed24b6a7a0
- Plan_auditoría/Aug_Tareas.md: 6be982e2a48c298bad0db822809353c8c82494e7
- Plan_auditoría/Plan_Maestro_Implementacion.md: 1bccccbf26d11dc1ef193566f5da99c82261130c
Estado inicial: sin cambios de código escritos en la rama. La exploración preliminar de la tarea había comenzado en la conversación anterior antes de registrar este checkpoint de recuperación; se documenta la desviación de secuencia sin ocultarla. No se modificaron deployments, endpoints, datos productivos ni rama base.
Hallazgos: H-AUD-060 (ausencia de expiración uniforme/lastActivityAt) y H-AUD-061 (cambio/restablecimiento de contraseña sin revocación integral).
Próximo paso: implementar la corrección mínima, probar límites calendario, revocación y todos los guards, comparar con respaldos y ejecutar Code Review.
================================================================================

================================================================================
CHECKPOINT FINAL — AUG-007 — 2026-11-09
Rama de trabajo: GPSpedia2.2.5_work; HEAD de partida: d3e419bd65abefdfc9df89a1078c3c0ee831a917.
Rama base: GPSpedia2.2.5; HEAD conservado: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Política aplicada: tres meses calendario absolutos desde ActiveSessions.date y un mes calendario desde lastActivityAt. La fecha de creación permanece inmutable. AUTH crea la columna F de forma idempotente, valida/toca bajo el ScriptLock común y revoca tokens al cambiar/restablecer contraseñas. USERS, ADMIN, FEEDBACK y WRITE aplican los mismos límites. routeAction renueva actividad autenticada como máximo cada cinco minutos por token/pestaña. Las sesiones históricas sin lastActivityAt usan date como referencia inicial; timestamps inválidos fallan cerrados.
Cambios de código: Services/Auth.js, Services/Test/Auth.js, Services/users.js, Services/Test/users.js, Services/admin.js, Services/feedback.js, Services/write.js, auth.js, api-config.js y users.html.
Documentación/esquema: Services/Test/README.md y Spreadsheet/GPSpedia_DB_columnas.md.
Registros actualizados: Auditoría.txt (H-AUD-060/061), Tareas.txt, Tareas_pendientes_parte1.txt, tareas_completadas_parte1.txt, lista_beta.txt, ChangesLogs.txt, Plan_auditoría/Aug_Tareas.md y Plan_Maestro_Implementacion.md.
Verificación local: sintaxis PASS en 12 archivos; política calendario 8/8 PASS; simulación de revocación selectiva PASS; copias AUTH/USERS de prueba sincronizadas conservando IDs aislados. Code Review: guards de AUTH/USERS/ADMIN/FEEDBACK/WRITE cubren vencimiento; las escrituras de ActiveSessions permanecen centralizadas en AUTH.
Limitaciones: no existen deployments aislados verificados; no se ejecutaron Apps Script real, endpoints operativos ni hojas productivas. Migración de columna F, concurrencia real, fallos parciales y UX offline quedan en lista_beta.txt. H-AUD-060 y H-AUD-061: RESUELTOS EN FUENTES.
Siguiente tarea: AUG-008 — coordinación de validación y sincronización entre pestañas.
Este checkpoint final es el último documento actualizado antes del único commit de AUG-007.
================================================================================


ADENDA FINAL DE CODE REVIEW — AUG-007
La revocación remota de sesiones por Desarrollador también invalida los tokens antes de borrar filas. Un fallo posterior de eliminación deja filas sin token, reporta cleanupPending e invalidatedSessions y no conserva sesiones utilizables.


================================================================================
CHECKPOINT INICIAL — AUG-008
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD de trabajo confirmado: a91c94f5b1b4eddbeb42a3153551dfa9d88d9e8d
Rama base: GPSpedia2.2.5
HEAD de rama base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea: AUG-008 — coordinación de validación de sesión entre pestañas.
Requisitos canónicos: Tareas_pendientes_parte1.txt, sección AUG-008 y adenda AUD-T-024; Plan_auditoría/Aug_Tareas.md confirma que es la siguiente tarea de la ola tras AUG-007.
Alcance previsto para auditoría: auth.js, api-config.js, main.js, index.html, users.html y los módulos/servicios auxiliares que participen directamente en la validación, cierre o propagación de sesión. El alcance final de implementación se limitará a los archivos necesarios.
Criterios: coordinar pestañas concurrentes sin asumir atomicidad de localStorage; cubrir toda la validación asíncrona; liberar estado en éxito, fallo y timeout; evitar validaciones duplicadas y bloqueos indefinidos; hacer que cada pestaña resuelva su estado visual aunque otra valide; una respuesta solo puede modificar/cerrar la sesión si sigue correspondiendo al mismo userId/token; respuestas obsoletas no deben borrar sesiones nuevas; probar dos o más pestañas.
Restricciones: mantener validación autoritativa en servidor; señales entre pestañas solo coordinan UX y nunca sustituyen autorización backend. No tocar deployments, endpoints operativos ni hojas/datos productivos. Una sola confirmación de commit mediante Git Database API; únicamente GPSpedia2.2.5_work; no Contents API ni Git local.
Riesgos iniciales a comprobar: lock localStorage no atómico; finally libera antes de terminar promesa de validación; retorno temprano puede dejar splash sin transición; logout no recibe token esperado y puede borrar sesión posterior; falta de propagación explícita de cierre/revocación a otras pestañas.
Estado inicial: ramas verificadas; requisitos leídos; checkpoint inicial registrado antes de completar auditoría. No se ha modificado código.
Siguiente acción: completar auditoría íntegra de los consumidores y productores de estado de sesión; registrar hallazgos en Auditoría.txt antes de implementar.
================================================================================


================================================================================
CHECKPOINT FINAL — AUG-008
Fecha: 2026-11-09
Estado: COMPLETADA EN FUENTES; validación funcional multi-pestaña diferida a Beta.
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD padre confirmado antes del commit: a91c94f5b1b4eddbeb42a3153551dfa9d88d9e8d
Rama base: GPSpedia2.2.5
HEAD base confirmado antes del commit: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificaciones).
Tarea: AUG-008 — coordinación de validación y sincronización entre pestañas.
Hallazgos: H-AUD-062 y H-AUD-063 resueltos en fuentes.
Archivos funcionales modificados: auth.js, api-config.js, users.html y add_cortes.html.
Documentación/trazabilidad modificada: Auditoría.txt, Tareas.txt, ChangesLogs.txt, Tareas_pendientes_parte1.txt, tareas_completadas_parte1.txt, lista_beta.txt, Plan_auditoría/Aug_Tareas.md y Plan_auditoría/Plan_Maestro_Implementacion.md.
Implementación: Web Locks API con exclusión por origen cuando está disponible; espera máxima del lock de cinco segundos; validación con timeout de ocho segundos y AbortSignal; fallback temporizado sin asumir atomicidad de localStorage; marca SessionValidatedAt en la sesión local durante diez segundos para el mismo userId/token; respuestas obsoletas ignoradas; logout protegido por identidad/token esperado; eventos storage para reconciliar index.html y abandonar users.html/add_cortes.html cuando la sesión compartida se elimina o cambia.
Respaldo exacto previo a edición (blob SHA): auth.js=858e44b01cb8847e8c73db67630f7ff3716b4378; api-config.js=acebb3ff7dac2467c16cb45f233cc0a29e688fe9; users.html=5c9598119e7b349189682e18fd1e6d481845af92; add_cortes.html=8a5e4bf51b3cd602224016a1267f478ce55ee329; Auditoría.txt=30912df69b29c8025a195a4cb5d32538848bd43c; Tareas.txt=37a4903942f2aa9c1ff74413b3d734437451f72f; ChangesLogs.txt=8f98d203b2c081f43cb32c8a0e99bdc9bb512239; Tareas_pendientes_parte1.txt=fef649495c2b1068dcbacc283e4a697b4a53a6bb; tareas_completadas_parte1.txt=b4886d0e45979acea9fd50e2e154d74ed6267bf1; lista_beta.txt=6120d7c1c46c29dd8f6a350b478229e48e363e88; Plan_auditoría/Aug_Tareas.md=196012b7292f6164f8454bc112c965a6980fe097; Plan_auditoría/Plan_Maestro_Implementacion.md=253a51588b3e8003772121b0028e358961db6531; checkpoint.md=654312c8fc71a51ee4f9f2096ade0b1bf5409f75.
Checkpoint inicial preparado antes de la auditoría: blob 0d3867e25baaa372ce8aa8d3d1e044d55b47d3c9. Auditoría registrada antes de implementación en H-AUD-062/H-AUD-063.
Verificación sintáctica: PASS en los cuatro archivos funcionales.
Pruebas lógicas locales: dos contextos Web Locks comparten una sola validación y el segundo reutiliza SessionValidatedAt; respuesta inválida tardía A no elimina ni revoca B; logout obsoleto A no elimina B; evento storage de cierre limpia currentUser y muestra login; fallback sin AbortController retorna timeout. Todos PASS.
Code Review: PASS; diff comparado contra los respaldos exactos; cambios limitados al alcance; las llamadas existentes a routeAction mantienen compatibilidad con los tres argumentos originales.
Limitaciones: no se ejecutaron navegador real, Apps Script real, deployments aislados, endpoints operativos ni hojas/datos productivos. En navegadores sin Web Locks pueden existir validaciones redundantes; el backend conserva la autoridad de autorización. Pruebas multi-pestaña reales, revocación entre dispositivos y fallos de red se encuentran en lista_beta.txt.
No modificados: rama base, Services/, deployments, endpoints operativos, datos productivos, main.js e index.html.
Siguiente tarea: AUG-009 — validar el nombre de usuario en el backend, según la secuencia vigente.
Este checkpoint final es la última actualización documental inmediatamente anterior al único commit de AUG-008.
================================================================================


================================================================================
CHECKPOINT INICIAL — AUG-009
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD de trabajo confirmado: 9867bd10b1bfccd5e02bdf95d2696988abd2c22a
Rama base: GPSpedia2.2.5
HEAD de rama base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea: AUG-009 — validar el nombre de usuario en el backend.
Requisitos canónicos: Tareas_pendientes_parte1.txt, ficha AUG-009; H-AUD-005; AUD-T-002; evidencia histórica Services/users.js handleCreateUser() y users.html handleUserFormSubmit().
Criterios: el backend debe rechazar nombres vacíos después de trim(), rechazar entradas fuera de la política de nombre acordada, mantener comparación normalizada para detectar duplicados y comprobarlo mediante llamadas directas al endpoint sin depender de validación HTML.
Alcance previsto para auditoría: Services/users.js y sus copias de prueba; users.html (flujo de creación/edición y restricciones de nombre); contratos/ruteo relacionados solo si son necesarios para verificar la llamada. El alcance de implementación se limitará a los archivos funcionales imprescindibles y sus pruebas/documentación vinculadas.
Ciclo A previo — AUG-008: commit 9867bd10b1bfccd5e02bdf95d2696988abd2c22a verificado como HEAD de la rama de trabajo; padre a91c94f5b1b4eddbeb42a3153551dfa9d88d9e8d; rama base intacta. Se revisaron los cuatro archivos funcionales modificados (auth.js, api-config.js, users.html, add_cortes.html), su diff y contratos de propagación. No se identificaron defectos nuevos que requieran tarea correctiva; limitaciones de navegador/deployment permanecen explícitamente diferidas a Beta.
Riesgos a comprobar: política de caracteres/longitud no definida o discordante entre cliente y backend; nombres vacíos o compuestos por espacios; Unicode/acentos; duplicados con diferencias de mayúsculas, espacios o normalización; modificación de nombre de usuario en edición; llamadas directas que omitan HTML; compatibilidad de usuarios existentes y de copias de prueba.
Restricciones: no asumir ni inventar una política de caracteres no aprobada; no modificar hojas/datos productivos ni deployments/endpoints operativos; no modificar rama base; usar Git Database API y un único commit en GPSpedia2.2.5_work; backups exactos antes de editar.
Estado inicial: checkpoint registrado antes de la auditoría pre-implementación. No se ha modificado código funcional de AUG-009.
Siguiente acción: completar auditoría íntegra de backend, UI, pruebas y política existente; registrar hallazgos antes de implementar.
================================================================================


AUDITORÍA PRE-IMPLEMENTACIÓN — AUG-009 — 2026-11-09
Auditoría de ciclo A (AUG-008): se revisaron auth.js, api-config.js, users.html y add_cortes.html contra el diff real del commit 9867bd10b1bfccd5e02bdf95d2696988abd2c22a y su padre. Sin hallazgos nuevos que requieran tarea correctiva; los límites de navegador/deployments ya están diferidos a Beta.
Auditoría AUG-009 completada antes de editar: Services/users.js (ba04370b81a939649adc1e0ffdc90b1e536ee5f8), Services/Test/users.js (e5e9192673d4738c2e1cbafa04721b935a40c89d), users.html (42e6afd633af634ae4a8d6c3622dd78f5f161bea), api-config.js (26c4575a7d3b355e18e5b559d659de4bda5a2746), Services/Test/README.md (87424b4a5ef64506a6d19d983cf9ecb10d17fd0d), Tareas_pendientes_parte1.txt (ab63881f6d21e7dad062168599fc96012b6eaaac) y referencias de login Services/Auth.js/Services/Test/Auth.js.
Hallazgo pre-implementación registrado primero en Auditoría.txt: H-AUD-064. La fuente ya rechaza vacío después de trim() y prefijo reservado; el defecto reproducible es coerción de tipos no textuales. Política explícita identificada: string, trim, no vacío, no prefijo __deleted__:, duplicado por trim()+toLowerCase(). No se encontró límite de longitud ni lista blanca aprobada de caracteres; no inventar.
Respaldo exacto previo a edición (no sobrescribir): Services/users.js=ba04370b81a939649adc1e0ffdc90b1e536ee5f8; Services/Test/users.js=e5e9192673d4738c2e1cbafa04721b935a40c89d. No se modificarán users.html ni api-config.js porque sus controles/contrato existentes son suficientes para el alcance.
Alcance final: únicamente validación de tipo en el backend de creación y sincronización idéntica de esa lógica en la copia aislada; pruebas directas de doPost mediante dobles locales; sin cambiar login, usernames históricos, reglas de longitud/caracteres, roles, serialización de otras mutaciones, endpoints ni hojas/datos.
Estado: auditoría terminada; implementación aún no iniciada.
================================================================================


================================================================================
CHECKPOINT FINAL — AUG-009
Fecha: 2026-11-09
Estado: COMPLETADA EN FUENTES; validación real del endpoint USERS aislado diferida a Beta.
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD padre confirmado antes del commit: 9867bd10b1bfccd5e02bdf95d2696988abd2c22a
Rama base: GPSpedia2.2.5
HEAD base confirmado antes del commit: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificaciones).
Tarea: AUG-009 — validar el nombre de usuario en el backend.
Hallazgo: H-AUD-064 resuelto en fuentes. La observación histórica H-AUD-005 sobre cadenas vacías ya estaba parcialmente corregida en el código existente y se conservó.
Archivos funcionales modificados: Services/users.js y Services/Test/users.js.
Archivos documentales/trazabilidad modificados: Auditoría.txt, Tareas.txt, Tareas_pendientes_parte1.txt, Plan_auditoría/Aug_Tareas.md, ChangesLogs.txt, tareas_completadas_parte1.txt, lista_beta.txt y Services/Test/README.md.
Implementación: normalizeUsername_() exige que Nombre_Usuario sea de tipo string antes de normalizar; aplica trim(); rechaza cadenas vacías y el prefijo reservado __deleted__:. La comparación de duplicados conserva trim()+toLowerCase(), compatible con la búsqueda de login. No se añadieron límites de longitud ni lista blanca de caracteres porque no existe una política aprobada en las fuentes. users.html mantiene required como ayuda de interfaz; la validación de backend no depende del HTML.
Respaldos exactos previos a edición: Services/users.js=ba04370b81a939649adc1e0ffdc90b1e536ee5f8; Services/Test/users.js=e5e9192673d4738c2e1cbafa04721b935a40c89d. Los diffs finales contienen únicamente la nueva función de validación y su llamada en cada copia. Se conservaron los Spreadsheet IDs separados: producción 1M6zAVch_EGKGGRXIo74Nbn_ihH1APZ7cdr2kNdWfiDs; prueba 1TyfehJHUeyUMGM4AW12_Rkq-Y8G_6MvF-Wd9rrB87_k.
Checkpoint inicial registrado antes de la auditoría: blob 0d f83e89749ed11a9deb26de55e62f3497202b0f. Auditoría y respaldo pre-implementación registrados antes de editar en el checkpoint intermedio f6de75cac6ddddf492a25a60ee0dec5c655612ba y en Auditoría.txt.
Verificación sintáctica: PASS en Services/users.js y Services/Test/users.js.
Pruebas directas de doPost/createUser con dobles locales, sin interfaz: 11/11 casos PASS en fuente de producción y 11/11 en copia aislada (22/22 funcionales). Casos: Nombre_Usuario ausente, null, número, objeto, cadena vacía, solo espacios, prefijo reservado, duplicado con espacios, duplicado por mayúsculas, string válido recortado y string Unicode válido. Total con sintaxis (2) = 24/24 comprobaciones PASS.
Integridad: los bloques normalizeUsername_() y handleCreateUser() son idénticos entre producción y copia de prueba; solo se conserva el Spreadsheet ID distinto. Documentos activos bajo el límite de 180,000 caracteres Unicode.
Code Review / Safety & Side Effects: PASS. La validación ocurre antes del hash y de las escrituras de usuario; los datos no textuales no se convierten silenciosamente; no se alteraron reglas de login, cuentas existentes, roles, IDs, otras mutaciones, frontend, endpoints ni hojas. Los duplicados continúan comprobándose dentro del lock existente.
Limitaciones: las pruebas directas se ejecutaron con dobles locales de Apps Script y no equivalen a una ejecución real de Apps Script/HTTP. No se crearon deployments ni se llamaron endpoints operativos; no se accedió ni modificó ninguna Spreadsheet real. La prueba real en deployment USERS aislado queda en lista_beta.txt.
Ciclo A anterior (AUG-008): commit previo revisado; no se encontraron defectos nuevos que requieran tarea correctiva.
Siguiente tarea: AUG-010 — serialización de mutaciones USERS, con dependencia explícita de AUD-T-033 para coordinación interproyectos.
Este checkpoint final es la última actualización documental inmediatamente anterior al único commit de AUG-009.
================================================================================


================================================================================
CHECKPOINT INICIAL — AUG-010
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD confirmado al iniciar: 1b76256c660e13ea5f3db5328da50df24f18afb1
Rama base: GPSpedia2.2.5
HEAD base confirmado al iniciar: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea: AUG-010 — completar serialización de mutaciones del servicio USERS.
Origen registrado: H-AUD-006 / AUD-T-002; prioridad Alta.
Dependencia declarada: AUD-T-033 para coordinación de mutaciones entre proyectos. La tarea y su protocolo deben verificarse antes de definir alcance; no asumir que ScriptLock de proyectos Apps Script distintos sea compartido.
Alcance provisional: auditar íntegramente Services/users.js, su copia Services/Test/users.js, consumidores y servicios relacionados AUTH, rutas frontend, protocolo AUD-T-033, documentación y pruebas; inventariar cada mutación que comparte Users/ActiveSessions y distinguir locks locales de coordinación interproyectos. Incluir las adendas AUD-T-023 sobre operaciones de contraseña y migración legacy si forman parte del alcance operativo de AUG-010.
Riesgos: carreras de lectura-modificación-escritura; lock no compartido entre proyectos; cambios de contraseña/roles/perfiles concurrentes; creación/actualización/eliminación y revocación de sesiones; efectos parciales y falsa afirmación de atomicidad; desincronización de copia aislada.
Archivos candidatos para auditoría (no exhaustivos): Services/users.js, Services/Test/users.js, Services/Auth.js, Services/Test/Auth.js, api-config.js, users.html, Services/Test/README.md, documentación de AUD-T-033 y tareas relacionadas. Se ampliará o reducirá el alcance solo con evidencia del registro.
Regla: no editar código durante la auditoría. Registrar todos los hallazgos en Auditoría.txt antes de implementar; los hallazgos fuera de alcance se registran en Tareas.txt. Crear respaldo exacto antes de cada edición.
Pruebas previstas: sintaxis, harness directo por handler, intercalados concurrentes y fallos parciales/reintentos en dobles aislados; no llamar endpoints operativos ni tocar hojas productivas. La concurrencia real de Apps Script y despliegues aislados solo se afirmará si se ejecuta realmente.
Siguiente paso: localizar y leer la definición completa de AUD-T-033 y las adendas de AUG-010; luego auditar íntegramente todos los archivos afectados sin modificaciones.
Estado: INICIADA; AUD-T-033 pendiente de verificación; auditoría sin comenzar.
================================================================================


================================================================================
CHECKPOINT INTERMEDIO — AUG-010 — AUDITORÍA COMPLETADA
HEAD auditado: 1b76256c660e13ea5f3db5328da50df24f18afb1. HEAD base: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (intacto).
Auditoría registrada antes de implementar en Auditoría.txt, blob 9d8305096cb3883f1a39af0cf9ef42a722e91898. H-AUD-006 revalidado; H-AUD-065 nuevo; H-AUD-023-002 revalidado dentro de la adenda AUD-T-023.
Conclusión de alcance: USERS expone createUser/updateUser/updateProfile como mutaciones. createUser ya usa ScriptLock 30 s y finally; updateUser/updateProfile carecen de lock. resetUserSessions/deleteUser/changePassword/resetUserPassword están en AUTH y sus rutas ya están centralizadas allí. AUTH password handlers usan lock local; la migración legacy de handleLogin ocurre antes del lock y debe trasladarse a la sección crítica con revalidación del hash vigente.
Dependencia AUD-T-033: no existe lock compartido entre proyectos. AUG-034 mantiene pendiente el coordinador interproyectos. AUG-010 no implementará ni simulará ese coordinador; el alcance local de USERS y el lock de contraseña interno de AUTH se mantienen diferenciados. Riesgo residual de carreras AUTH↔USERS queda documentado y se difiere a AUG-034/AUG-016 según dominio.
Code no modificado durante la auditoría.
Respaldos exactos previos a editar (blobs inmutables del HEAD auditado): Services/users.js=26c764d1f1aa08f8c848db87d8d1a58366397484; Services/Test/users.js=27f26d55ff29b3d5125e1d5962a21df3ae446428; Services/Auth.js=94f1057e88e09e22f8a36dcc186c17f6a2aa067f; Services/Test/Auth.js=039fe1ce8590f6c866dfae0d6fd99f6dbf135912. Los archivos de prueba conservan Spreadsheet ID independiente. Archivos de frontend/ruteo/documentación auditados y no previstos para edición funcional: users.html=42e6afd633af634ae4a8d6c3622dd78f5f161bea; api-config.js=26c4575a7d3b355e18e5b559d659de4bda5a2746; Services/Test/README.md=7f523e56c91dcdac5701c6128c4240b5621ed5d4.
Plan de implementación: (1) incorporar helper de lock local USERS con espera de 30 s y finally en updateUser/updateProfile; (2) validar rol nuevo antes de cualquier escritura; (3) en AUTH, mover la migración legacy dentro del lock ya usado para crear sesión, revalidar el hash almacenado vigente y no sobrescribir un hash nuevo; (4) sincronizar copias de prueba; (5) probar éxito, rechazo, timeout, liberación tras error, conflicto updateUser/updateProfile, carrera legacy-login/changePassword/resetUserPassword simulada y regresiones createUser; (6) actualizar README y Beta con límites de validación real.
Siguiente paso: implementar únicamente después de este checkpoint y el registro de auditoría; respaldos exactos ya fijados arriba.
================================================================================


================================================================================
CHECKPOINT FINAL — AUG-010
Fecha: 2026-11-09
Estado: COMPLETADA EN EL ALCANCE LOCAL DE USERS/AUTH. La coordinación interproyectos sigue pendiente en AUG-034; la validación real en deployments aislados queda en Beta.
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD padre confirmado: 1b76256c660e13ea5f3db5328da50df24f18afb1
Rama base: GPSpedia2.2.5
HEAD base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificaciones).
Tarea: AUG-010 — completar serialización de mutaciones del servicio USERS; adenda AUD-T-023 de concurrencia de operaciones de contraseña.
Dependencia AUD-T-033 revalidada: ScriptLock es local a cada proyecto Apps Script y no se comparte entre AUTH/USERS/otros servicios. AUG-034 conserva el coordinador interproyectos. Este commit no implementa ni simula ese coordinador.

Archivos funcionales modificados:
- Services/users.js — blob a3bdd603cd958a6975a4053208d635cf76965676.
- Services/Test/users.js — blob 71d84a33994340a34025fb390d4346997320833d.
- Services/Auth.js — blob 47672d8a0306bd736fa34d8d3c98f42d8f07eb76.
- Services/Test/Auth.js — blob 23381af766bfc4c0aa8f194a26d5c593916a23df.

Documentación/trazabilidad modificada:
- Auditoría.txt — blob 7eb680990d98c01587cc162119cdd48331192ea8.
- Tareas.txt — blob a12b04f050008e75e4d9e7a223be860eb2e6048f.
- Tareas_pendientes_parte1.txt — blob aef48ae328d3fff9d2f840dc4ada6d6c918111cb.
- Tareas_pendientes_parte2.txt — blob 1f3aa074e71b3875c2bfb5b8f125c27791612779 (incluye AUG-154 y rango 100–154).
- Plan_auditoría/Aug_Tareas.md — blob 87b692c7b7a8a5863d57fcc41e84b9f715194a24.
- ChangesLogs.txt — blob bb54b6abb35feae55529ff1e413cab2fb6b16783.
- Services/Test/README.md — blob 8dbdc2fb6fe880a8d5de4d9f19891e493677da00.
- lista_beta.txt — blob 447d3bae59a66df5c6a92ea2ea54733e7d86cafc.
- checkpoint.md — este documento final.

Respaldos exactos previos a editar (blobs inmutables del HEAD padre): Services/users.js=26c764d1f1aa08f8c848db87d8d1a58366397484; Services/Test/users.js=27f26d55ff29b3d5125e1d5962a21df3ae446428; Services/Auth.js=94f1057e88e09e22f8a36dcc186c17f6a2aa067f; Services/Test/Auth.js=039fe1ce8590f6c866dfae0d6fd99f6dbf135912. Los IDs de Spreadsheet de producción y prueba permanecen distintos.

Implementación final:
1. USERS: createUser conserva su ScriptLock de 30 s. Se añadió withUsersMutationLock_() con waitLock(30000)/finally y se aplica a updateUser/updateProfile. El lock cubre validación de sesión/rol, lectura de Users y escrituras. No se modificaron acciones de lectura.
2. USERS: updateUser valida permisos del rol destino antes de escribir Nombre_Completo o Privilegios. Password sigue rechazado en USERS; el frontend ya enruta cambios/restablecimientos de contraseña a AUTH.
3. AUTH: login vuelve a leer la cuenta y revalida la contraseña dentro del mismo ScriptLock que protege el cambio propio y reset administrativo. La migración legacy se escribe solo si la contraseña almacenada vigente todavía coincide con la presentada; un hash nuevo nunca se sobrescribe con una migración atrasada.
4. AUTH: el límite de sesiones se calcula con el rol revalidado dentro de la sección crítica, no con la lectura previa al lock.
5. Copias aisladas sincronizadas; al normalizar el Spreadsheet ID y comentarios de prueba, la lógica funcional coincide con producción. No se modificaron users.html ni api-config.js porque el ruteo ya es correcto.

Hallazgos y estado:
- H-AUD-006: resuelto en el alcance local de USERS. La coordinación AUTH↔USERS no se considera resuelta; permanece en AUG-034.
- H-AUD-023-002 (adenda AUD-T-023): resuelto para las mutaciones de contraseña dentro de AUTH; handleUpdateUser ya no escribe Password.
- H-AUD-065: resuelto; la validación RBAC ocurre antes de cualquier escritura.
- H-AUD-067: resuelto; límite de sesión calculado desde el rol revalidado bajo lock.
- H-AUD-066: permanece abierto y se registra como AUG-154. Si la primera escritura de Nombre_Completo tiene éxito y falla la segunda escritura de Privilegios, updateUser puede responder error con la primera modificación aplicada. El lock se libera; no se afirma atomicidad ni rollback.

Pruebas locales con dobles de Apps Script:
- Sintaxis: 4/4 PASS (USERS/Auth de producción y copia aislada).
- USERS: 14/14 PASS (updateUser válido, rechazo RBAC sin escrituras, updateProfile, contención de lock, liberación tras error, regresión createUser y rechazo de Password en USERS; ejecutado en ambas fuentes).
- createUser fallo/reintento: 2/2 PASS; fila con ID estático y sin datos se reutiliza y conserva el identificador esperado.
- AUTH: 8/8 PASS; migración legacy normal bajo lock, cambio propio intercalado, reset administrativo intercalado y límite de sesiones con rol actualizado antes de adquirir lock; producción y copia aislada.
- Total funcional local: 24/24 PASS. La falla parcial de updateUser se reprodujo y se registró como H-AUD-066/AUG-154, no se contó como PASS ni se ocultó.

Code Review / Safety & Side Effects: PASS para el alcance implementado. Revisión de los cuatro archivos completos y de los diffs contra respaldos; cambios limitados a los locks locales, validación RBAC previa, revalidación/migración de contraseña y cálculo de límite de sesiones. Copias de prueba conservan sus Spreadsheet IDs separados. No se cambiaron rutas frontend, URLs, esquemas, roles, KDF, endpoints ni datos productivos. El ScriptLock no protege frente a proyectos distintos.

Limitaciones: pruebas realizadas con dobles locales, no son concurrencia real de Apps Script ni prueba HTTP. No se crearon/verificaron deployments, no se llamaron endpoints live, no se accedió ni modificó ninguna Spreadsheet real. Las pruebas reales de USERS/AUTH aislados están en lista_beta.txt. Los conflictos interproyectos quedan bloqueados hasta AUG-034. La compensación de escrituras parciales queda en AUG-154.

Siguiente tarea secuencial registrada: AUG-011 — sustituir SHA-256 rápido por KDF resistente y completar migración versionada. AUG-154 permanece como tarea nueva de recuperación de escrituras parciales.
Este checkpoint final es la última actualización documental inmediatamente anterior al único commit de AUG-010.
================================================================================


================================================================================
CHECKPOINT INICIAL — ADENDA DOCUMENTAL AUG-011
Fecha: 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo autorizada: GPSpedia2.2.5_work
HEAD de trabajo confirmado: f1108069f6f4a2da6ad727053a7771855d3024ab
Rama base: GPSpedia2.2.5
HEAD base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificaciones previstas).
Tarea: registrar en la ficha AUG-011 la decisión expresa del usuario de omitirla.
Alcance exclusivo: documentación de la ficha AUG-011, registro ChangesLogs.txt y checkpoint.md. No auditar ni modificar código AUTH/USERS, algoritmos de contraseña, credenciales, datos, hojas ni deployments.
Estado inicial: AUG-011 figura como tarea pendiente para sustituir SHA-256 por KDF. El usuario indicó expresamente mantener SHA-256 y no ejecutar esa tarea.
Decisión que debe quedar inequívoca: AUG-011 OMITIDA POR DECISIÓN DEL USUARIO; conservar el esquema SHA-256 actual; no seleccionar KDF, no cambiar formato sha256$, no migrar credenciales, no cambiar compatibilidad ni desplegar cambios de hashing. No reactivar ni ejecutar en sesiones futuras salvo nueva autorización explícita del usuario.
Archivos previstos: Tareas_pendientes_parte1.txt, ChangesLogs.txt y checkpoint.md.
Riesgos/dependencias: el Plan Maestro menciona AUG-011 dentro de la ola de seguridad; la ficha específica debe prevalecer como instrucción de no ejecución. No se amplía el alcance a reordenar el Plan Maestro.
Verificaciones previas: rama de trabajo y rama base consultadas; HEADs confirmados. No se realizarán pruebas de código porque no hay cambios funcionales.
Siguiente acción: insertar la observación en la ficha AUG-011, registrar el cambio documental y cerrar con checkpoint final antes del único commit.
================================================================================


================================================================================
CHECKPOINT FINAL — ADENDA DOCUMENTAL AUG-011
Fecha: 2026-11-09
Estado: COMPLETADA — decisión registrada; tarea funcional AUG-011 OMITIDA y NO EJECUTABLE sin nueva autorización explícita.
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
HEAD padre confirmado: f1108069f6f4a2da6ad727053a7771855d3024ab
Rama base: GPSpedia2.2.5
HEAD base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios).
Archivos modificados:
- Tareas_pendientes_parte1.txt — anotación expresa dentro de AUG-011.
- ChangesLogs.txt — registro de la adenda documental.
- checkpoint.md — continuidad y cierre de esta tarea.
Resultado: SHA-256 y el formato sha256$ actual permanecen sin cambios. Se prohíbe inferir autorización para seleccionar KDF, modificar hashing, migrar credenciales o desplegar esa modificación. La tarea no debe reactivarse en otra sesión sin nueva autorización expresa del usuario.
Verificación: cambio documental limitado a la nota de AUG-011, la entrada de ChangesLogs y este checkpoint. No aplica prueba funcional/sintáctica: no hubo cambios de código. No se modificaron Services/Auth.js, Services/Test/Auth.js, hojas, credenciales, endpoints ni deployments.
Limitaciones: el Plan Maestro conserva su mención histórica de AUG-011; la ficha específica de la tarea contiene la decisión operativa y debe respetarse. No se alteró el Plan Maestro para mantener el alcance solicitado.
Siguiente acción: continuar con la siguiente tarea elegible, excluyendo AUG-011. AUG-012 puede auditarse por separado conforme al procedimiento.
Este checkpoint final es la última actualización documental inmediatamente anterior al único commit de esta adenda.
================================================================================


================================================================================
CHECKPOINT INICIAL — AUG-012 — 2026-11-09
Repositorio: infogpstech/GPSpedia
Rama de trabajo autorizada: GPSpedia2.2.5_work
HEAD de trabajo confirmado: 1d5ca10f8a738c707bfd2f171cbed090933d3268
Rama base protegida: GPSpedia2.2.5
HEAD base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificaciones previstas).
Tarea: AUG-012 — hacer consistente el contador de intentos ante autenticaciones concurrentes.
Fase: checkpoint inicial registrado antes de completar auditoría; sin cambios de código.
Alcance: Services/Auth.js y Services/Test/Auth.js, además de Auditoría.txt, Tareas_pendientes_parte1.txt, ChangesLogs.txt y este checkpoint. Solo el contador de intentos y su integración directa en handleLogin.
Estado observado: LOGIN_MAX_ATTEMPTS=5; LOGIN_LOCKOUT_SECONDS=900. beginLoginAttempt incrementa un contador compartido bajo ScriptLock; resetLoginAttempts elimina la clave completa; rollbackLoginAttempt decrementa el contador compartido. handleLogin reserva antes de leer credenciales, deja el incremento en credenciales inválidas, elimina la clave en credenciales válidas y revierte un incremento en errores de infraestructura.
Riesgo conocido: solicitudes concurrentes no tienen identidad individual; reset/rollback pueden afectar contadores correspondientes a otras solicitudes. CacheService puede desalojar datos antes de TTL, por lo que el bloqueo no es durable.
Dependencias: LockService.getScriptLock también se usa en logToSheet y operaciones de sesión/contraseña AUTH; evitar reentrada del mismo lock. Services/Test/Auth.js conserva Spreadsheet ID de prueba distinto; debe preservarse. AUG-011 está expresamente omitida y no forma parte del alcance; mantener SHA-256 sin cambios.
Archivos previstos: Services/Auth.js, Services/Test/Auth.js, Auditoría.txt, Tareas_pendientes_parte1.txt y ChangesLogs.txt; checkpoint.md al cierre.
Verificaciones previas conocidas: AUG-010 tuvo pruebas locales 24/24 y sintaxis 4/4, sin concurrencia real Apps Script ni endpoints. Para AUG-012 se requieren pruebas deterministas de intercalado, regresión y sintaxis.
Siguiente acción: terminar auditoría completa de ambos Auth.js y consumidores; registrar hallazgos antes de implementar; respaldar blobs originales; diseñar reservas por ID de solicitud y finalización diferenciada éxito/fallo/error.
================================================================================


================================================================================
CHECKPOINT FINAL — AUG-012 — 2026-11-09
Estado: COMPLETADA EN FUENTES; validación real de concurrencia diferida a Beta.
Repositorio: infogpstech/GPSpedia
Rama de trabajo autorizada: GPSpedia2.2.5_work
HEAD padre confirmado antes de esta tarea: 1d5ca10f8a738c707bfd2f171cbed090933d3268
Rama base protegida: GPSpedia2.2.5
HEAD base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificaciones).
Commit de esta tarea: único commit con mensaje "fix(auth): serialize concurrent login attempt accounting"; su SHA se identifica en el historial de GPSpedia2.2.5_work después de publicar el commit (no puede auto-incluirse en el blob que forma parte de ese mismo commit).
Archivos funcionales modificados:
- Services/Auth.js — reservas por UUID, estado de fallos y reservas pendientes, compatibilidad de estado anterior, limpieza por antigüedad y finalización diferenciada.
- Services/Test/Auth.js — misma lógica; Spreadsheet ID de prueba preservado.
Archivos documentales modificados:
- Auditoría.txt — H-AUD-068 y resolución AUG-012.
- Tareas_pendientes_parte1.txt — diseño y cierre local AUG-012.
- Tareas.txt — actualización de estado.
- tareas_completadas_parte1.txt — registro de cierre.
- lista_beta.txt — concurrencia real en deployment aislado pendiente.
- ChangesLogs.txt — registro objetivo de archivos y cambios.
- checkpoint.md — este cierre.
Respaldos exactos previos a la edición (blobs originales inmutables): Services/Auth.js 47672d8a0306bd736fa34d8d3c98f42d8f07eb76; Services/Test/Auth.js 23381af766bfc4c0aa8f194a26d5c593916a23df. Los demás documentos se leyeron desde los blobs verificados antes de su edición.
Implementación: cada intento tiene ID propio. El estado separa failedAttempts y pendingAttempts. El login válido retira solo su reserva y reinicia fallos previos; credenciales inválidas retiran su reserva y suman un fallo; errores de infraestructura retiran únicamente su reserva sin decrementar fallos ajenos. El estado antiguo { attempts, lockedUntil } se interpreta temporalmente y las reservas con más de 900 segundos se depuran.
Revisión de código: reconstrucción inversa contra los originales confirmó que los únicos cambios en ambos Auth.js son los helpers del contador y los callsites directos en handleLogin. El bloque SHA-256 y el formato sha256$ permanecen idénticos. Producción y prueba son equivalentes salvo sus Spreadsheet IDs. No se modificaron sesiones, roles, rutas, endpoints ni configuración.
Verificaciones: sintaxis 2/2 PASS; pruebas deterministas de helpers 18/18 PASS (9 por fuente); pruebas de handleLogin para credenciales inválidas y error de infraestructura 4/4 PASS (ambas fuentes); total funcional local 22/22 PASS. Se verificó liberación del ScriptLock en todos los escenarios simulados.
Limitaciones: CacheService puede desalojar entradas antes del TTL; el bloqueo de 15 minutos es de mejor esfuerzo, no durable. No se ejecutó concurrencia real de Apps Script, deployment aislado, HTTP ni acceso a hojas reales. Esas pruebas están registradas en lista_beta.txt.
Siguiente acción: continuar con AUG-013 — coordinación de purga de Logs con inserciones AUTH, respetando su dependencia de coordinación interproyectos.
Este checkpoint final es la última actualización documental antes del único commit de AUG-012.
================================================================================


ADENDA DE CIERRE DEL CHECKPOINT — AUG-012
La versión final de Auditoría.txt contiene tanto el hallazgo H-AUD-068 registrado antes de la implementación como su resolución posterior. La ficha AUG-012, Tareas.txt, tareas_completadas_parte1.txt, lista_beta.txt y ChangesLogs.txt están actualizados. No se realizarán más cambios documentales antes del único commit de esta tarea.


================================================================================
CHECKPOINT INICIAL — AUG-013 — 2026-11-09
Estado: INICIADA; auditoría diagnóstica pendiente. No se ha modificado código.
Repositorio: infogpstech/GPSpedia
Rama autorizada de trabajo: GPSpedia2.2.5_work
HEAD al inicio: 78ea93bec15f7a7a622abf9e5dc9bb854f151b5f
Rama base protegida: GPSpedia2.2.5
HEAD base observado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea: AUG-013 — Coordinar purga de Logs con inserciones AUTH (H-AUD-023-005 / AUD-T-025).
Alcance: analizar Services/feedback.js, handleClearSensitiveLogs(), inserciones de Services/Auth.js y dependencias entre FEEDBACK/AUTH; revisar formatos históricos de Logs y pruebas aisladas. No asumir ScriptLock compartido.
Criterios: evitar índices obsoletos; preservar logs no sensibles; detectar formatos históricos sin dejar credenciales; definir coordinación entre proyectos y probar inserciones simultáneas en copia.
Hallazgo previo: FEEDBACK calcula índices a borrar y AUTH inserta nuevas filas en la misma hoja; los ScriptLock pertenecen a proyectos separados. Estrategia aún no determinada.
Archivos candidatos: Services/feedback.js, Services/Auth.js, Services/Test/Auth.js, Services/Test/README.md, api-config.js, tareas y registros de auditoría.
Cambios previos vigentes: AUG-012 commit 78ea93bec15f7a7a622abf9e5dc9bb854f151b5f; SHA-256 permanece por decisión expresa del usuario; AUG-011 no se reactiva.
Riesgos/dependencias: no se dispone de deployment IDs ni URLs de proyectos de prueba. El cambio de filas puede invalidar índices capturados. La coordinación general de mantenimiento/restore sigue relacionada con AUG-034.
Siguiente acción: completar auditoría de archivos afectados y registrar hallazgos en Auditoría.txt antes de editar código.
================================================================================


REVISIÓN DE LA TAREA ANTERIOR — CICLO A — AUG-012 — 2026-11-09
Commit revisado: 78ea93bec15f7a7a622abf9e5dc9bb854f151b5f.
Archivos revisados: Services/Auth.js y Services/Test/Auth.js; diff real, helpers del contador, integración handleLogin, locks y callsites.
Resultado: no se identificaron defectos bloqueantes nuevos. Se confirmó reserva individual por UUID, finalización diferenciada de éxito/fallo/error, liberación de locks y equivalencia lógica de ambas fuentes salvo Spreadsheet ID. CacheService permanece temporal y la concurrencia real está correctamente diferida a Beta.
Observación menor no bloqueante: removeLoginAttemptReservation_ conserva una variable local previousLength no utilizada; no afecta comportamiento y no se refactorizó fuera de alcance.
Ciclo A cerrado sin hallazgos bloqueantes; se habilita auditoría pre-implementación AUG-013.


AUDITORÍA PRE-IMPLEMENTACIÓN — AUG-013 — 2026-11-09
Se auditaron Services/feedback.js (router, permisos y handleClearSensitiveLogs), Services/Auth.js (doPost, logToSheet, ScriptLock y callsites), Services/Test/Auth.js, Services/Test/README.md, api-config.js, ui.js y referencias de tareas/plan.
H-AUD-069 quedó registrado en Auditoría.txt antes de la implementación. Diagnóstico: FEEDBACK toma una instantánea y guarda índices absolutos; AUTH inserta en fila 2 bajo un ScriptLock local a su proyecto. Una inserción concurrente desplaza índices y puede borrar un log seguro dejando un sensible.
Diseño: centralizar clearSensitiveLogs en AUTH; validar allí sesión/identidad/expiración/rol Desarrollador bajo el mismo ScriptLock de logToSheet; enrutar api-config.js a AUTH y retirar la purga física de FEEDBACK. Preservar los patrones históricos. La coordinación general de mantenimiento/restore entre servicios permanece en AUG-034.
Estado de auditoría: COMPLETADA. No se modificó código durante la auditoría.


================================================================================
CHECKPOINT FINAL — AUG-013 — 2026-11-09
Estado: COMPLETADA EN FUENTES; validación real de concurrencia en Apps Script diferida a Beta.
Repositorio: infogpstech/GPSpedia
Rama autorizada: GPSpedia2.2.5_work
HEAD padre confirmado antes de AUG-013: 78ea93bec15f7a7a622abf9e5dc9bb854f151b5f
Rama base protegida: GPSpedia2.2.5
HEAD base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificaciones).
Commit único: "fix(auth): coordinate sensitive log purge with auth writes"; SHA verificable en historial de la rama después de publicar.

Implementación:
- AUTH es la autoridad única para insertar y purgar Logs. clearSensitiveLogs valida userId, token único, identidad coincidente, expiración, cuenta activa y rol Desarrollador dentro del mismo ScriptLock que usa logToSheet.
- FEEDBACK dejó de ejecutar la purga física; api-config.js dirige clearSensitiveLogs a AUTH. ui.js/getDeveloperSessionPayload no requirió cambios.
- Se preservaron los formatos históricos: claves password, sheetPassword, currentPassword, newPassword, fromSheet, fromClient; username en handleLogin started.; y Password comparison. El borrado es descendente y reporta fallos parciales con deletedCount/cleanupPending después de liberar el lock.

Archivos funcionales modificados: Services/Auth.js, Services/Test/Auth.js, Services/feedback.js, api-config.js y Services/Test/README.md.
Registros modificados: Auditoría.txt, Tareas_pendientes_parte1.txt, Tareas.txt, tareas_completadas_parte1.txt, lista_beta.txt, ChangesLogs.txt y checkpoint.md.

Respaldos exactos previos:
- Services/Auth.js f45cb0f33bd5f16021acd3fd15453b0d5f5fd8b2
- Services/Test/Auth.js 4bb1cd29d18550fa1deb36cd4afa9b192efb2228
- Services/feedback.js 0c6e5659f242b69ecd0637e669ed35cd6109f4d6
- api-config.js 26c4575a7d3b355e18e5b559d659de4bda5a2746
- Services/Test/README.md 8dbdc2fb6fe880a8d5de4d9f19891e493677da00
- Auditoría.txt 5cc2162d8496932336ac338e4115d7cce7f95fa7
- Tareas_pendientes_parte1.txt 77dece872d55faf7712ad7bc4b616db3b881d745
- Tareas.txt a53f04b4b56d25cd9bf7a08df2da80134005666e
- tareas_completadas_parte1.txt 88fc98af046721a74d073d182382643d20e7b637
- lista_beta.txt 450e3a96b0517c0e7d6c24d982d94f3e452d9419
- ChangesLogs.txt d89b24ecf60ece69e1b7b8dbe81029fbd7243156
- checkpoint.md 30cbf690ad65fd4ffe0f545e25a5221abc470bac

Revisión y comparación: reconstrucción inversa PASS para Services/Auth.js, Services/Test/Auth.js, Services/feedback.js y api-config.js; README mantiene intacto el contenido anterior y añade solo la sección AUG-013. Ambas fuentes AUTH son equivalentes salvo Spreadsheet ID. No se modificaron SHA-256, formatos de contraseña, credenciales, sesiones existentes, roles ni otras rutas.

Verificaciones:
- Sintaxis 4/4 PASS: AUTH producción, AUTH prueba, FEEDBACK y cuerpo de api-config después de retirar import/export ESM para comprobación limitada.
- Funcional local 24/24 PASS: fixtures históricos, preservación de registros seguros, autorización de seis escenarios, despacho doPost, inserción intercalada bloqueada, reporte de fallo parcial, reintento, timeout de lock sin borrar y rechazo de autorización por doPost, en ambas fuentes.
- En el harness, ningún registro sensible quedó después de la purga válida; los logs seguros se conservaron; la escritura de resultado ocurrió tras liberar el lock.

Limitaciones: no se ejecutaron Apps Script real, deployment aislado, HTTP ni Spreadsheet real. La concurrencia real, configuración de copia y duración/timeout de purga quedan en Beta. logToSheet espera 10 segundos; una purga prolongada podría causar timeout y omisión de un log concurrente, por medir en Beta. La coordinación general de mantenimiento/restore entre servicios permanece en AUG-034/AUD-T-033.

AUG-011 permanece omitida por decisión del usuario; SHA-256 se conserva.
Siguiente tarea secuencial: AUG-014 — alinear validación de contraseña en UI y corregir «reincie» por «reinicie».
Este checkpoint final es la última actualización documental inmediatamente anterior al único commit de AUG-013.
================================================================================


ADENDA FINAL DE TRAZABILIDAD — AUG-013 — 2026-11-09
Se verificó que los blobs documentales finales incluidos en el commit contienen: hallazgo H-AUD-069 y su resolución en Auditoría.txt; cierre AUG-013 en Tareas_pendientes_parte1.txt y Tareas.txt; registro en tareas_completadas_parte1.txt; pruebas reales pendientes en lista_beta.txt; y cambios objetivos en ChangesLogs.txt. La batería final queda en 24/24 pruebas funcionales locales PASS y 4/4 sintaxis PASS. Esta adenda es la última actualización documental antes del único commit de AUG-013.

================================================================================
CHECKPOINT INICIAL — AUG-014 — 2026-11-09
Estado: INICIADA; auditoría pendiente. No se ha modificado código.
Repositorio: infogpstech/GPSpedia
Rama autorizada de trabajo: GPSpedia2.2.5_work
HEAD inicial confirmado: 057852fc12582da55c1ffb03331c2b83dd9ea81e
Árbol inicial: 0960be9696a9b33de3b4bc368fc02ff8b9b8c3b1
Rama base protegida: GPSpedia2.2.5
HEAD base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea: AUG-014 — Alinear validación de contraseña en UI y corregir el texto «reincie» por «reinicie».
Alcance definido en Tareas_pendientes_parte1.txt: users.html valida longitud sin trim mientras backend aplica trim; mensaje contiene «reincie». Criterios: aplicar en cliente la misma longitud normalizada sin sustituir validación backend; corregir a «reinicie sesión»; probar espacios externos y longitudes límite.
Archivos candidatos: users.html y los módulos/servicios que participen directamente en la actualización de contraseña, además de Auditoría.txt, ChangesLogs.txt, Tareas.txt, registro de tareas y checkpoint.md.
Restricciones: mantener intacta la validación backend y el formato de contraseña; no reactivar AUG-011 ni cambiar SHA-256. No tocar otras funcionalidades ni estilos ajenos.
Commit previo: AUG-013 057852fc12582da55c1ffb03331c2b83dd9ea81e; AUG-012 anterior 78ea93bec15f7a7a622abf9e5dc9bb854f151b5f.
Riesgos/dependencias: flujo de cambio de contraseña y cualquier normalización backend/cliente deben coincidir exactamente; confirmar límites reales y si hay varias validaciones de contraseña en users.html.
Pendiente: localizar todas las referencias del formulario y el texto; auditar línea por línea antes de editar; registrar hallazgos en Auditoría.txt.
Siguiente acción concreta: completar inventario de archivos y auditoría diagnóstica AUG-014 sin cambios de código.
================================================================================

================================================================================
CHECKPOINT FINAL — AUG-014 — 2026-11-09
Estado: COMPLETADA EN FUENTES; validación integrada en navegador no ejecutada.
Repositorio: infogpstech/GPSpedia
Rama autorizada: GPSpedia2.2.5_work
HEAD padre confirmado antes de AUG-014: 057852fc12582da55c1ffb03331c2b83dd9ea81e
Árbol padre: 0960be9696a9b33de3b4bc368fc02ff8b9b8c3b1
Rama base protegida: GPSpedia2.2.5
HEAD base confirmado antes de commit: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios).
Commit previsto: único commit con mensaje "fix(users): align password length validation"; el SHA se verificará en el historial de GPSpedia2.2.5_work.

Auditoría y hallazgo:
- Se auditó users.html completo (738 líneas), el handler handleChangePasswordSubmit(), postToAction(), el modal y su cableado de submit.
- Se inspeccionaron normalizePassword(), createPasswordHash(), verifyStoredPassword(), handleChangePassword() y su despacho doPost en Services/Auth.js y Services/Test/Auth.js; también el mapeo changePassword→AUTH en api-config.js.
- H-AUD-070 quedó registrado en Auditoría.txt antes de implementar. La UI medía newPassword.length; AUTH normaliza con String(...).trim() y aplica el mínimo de 8 caracteres sobre la cadena normalizada.
- La copia AUTH de prueba coincide con producción en la lógica de normalización y cambio de contraseña; únicamente difiere en Spreadsheet ID.

Cambio funcional:
- Único archivo de código modificado: users.html.
- Línea 642: newPassword.length < 8 cambió a newPassword.trim().length < 8.
- Línea 653: «reincie sesión» cambió a «reinicie sesión».
- Se mantiene el valor original newPassword en el payload a changePassword; AUTH vuelve a normalizar y valida en backend. No se cambió la comparación de confirmación ni el flujo de sesión.

Respaldo exacto previo:
- users.html: blob 42e6afd633af634ae4a8d6c3622dd78f5f161bea.
- La reconstrucción inversa del archivo modificado 315ac91bcef0d767b60cbed69276081c65a5903e reproduce exactamente el original. Diferencia: dos líneas, ambas dentro del alcance.

Archivos documentales modificados:
- Auditoría.txt: H-AUD-070 y resolución.
- Tareas_pendientes_parte1.txt: estado de AUG-014.
- Tareas.txt: registro de finalización.
- tareas_completadas_parte1.txt: registro de tarea completada.
- ChangesLogs.txt: cambios objetivos en líneas 642 y 653.
- checkpoint.md: checkpoint inicial y este cierre.

Verificaciones:
- Sintaxis del módulo JavaScript inline de users.html: 1/1 PASS.
- Pruebas funcionales del handler real extraído de users.html: 8/8 PASS, cubriendo longitudes de 7 y 8 caracteres, espacios y tabulaciones externos, valor original enviado, confirmación distinta y mensaje corregido.
- Pruebas de normalizePassword()/createPasswordHash() en AUTH producción y copia de prueba: 2/2 PASS; 7 caracteres tras trim se rechazan y 8 se aceptan.
- Total de escenarios funcionales locales: 10/10 PASS.
- changePassword continúa enrutado a AUTH; no se modificó api-config.js.
- Code Review final: sin hallazgos; diff exacto de dos líneas y sin cambios colaterales.
- Límites: no se ejecutaron navegador real, deployment, HTTP ni Spreadsheet real. No se afirma validación visual integrada.

Restricciones preservadas:
- Services/Auth.js y Services/Test/Auth.js permanecen intactos.
- No se modificaron hashing SHA-256, prefijo sha256$, credenciales, sesiones, roles, otras rutas ni endpoints.
- AUG-011 continúa omitida por decisión expresa del usuario.

Siguiente tarea identificada en Tareas_pendientes_parte1.txt: AUG-016 — Consistencia y recuperación de mutaciones del ciclo de sesión. AUG-015 no aparece en el tramo activo consultado; no se debe inferir ni crear esa tarea.
Este checkpoint final es la última actualización documental inmediatamente anterior al único commit de AUG-014.
================================================================================


================================================================================
CHECKPOINT INICIAL — AUG-016 — 2026-11-09
Estado: INICIADA; auditoría formal pendiente. No se ha modificado código.
Repositorio: infogpstech/GPSpedia
Rama autorizada de trabajo: GPSpedia2.2.5_work
HEAD inicial confirmado: 5be28707b2a8ab91dfbe8850713089bbe841bcc2
Árbol inicial: 74c4805025560d9745cb4b770a60c17bf4a0c490
Rama base protegida: GPSpedia2.2.5
HEAD base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1
Tarea: AUG-016 — Consistencia y recuperación de mutaciones del ciclo de sesión.
Alcance registrado: coordinación de login con cierre remoto; consistencia de creación/revocación de sesiones; operaciones idempotentes y recuperación/reconciliación ante fallos de setValue, appendRow y deleteRow; revisión de los cambios de Privilegios y de la información de rol que AUTH entrega al cliente. No asumir atomicidad de Spreadsheet ni locks compartidos entre proyectos.
Antecedentes: AUG-153 trasladó resetUserSessions a AUTH para centralizar las escrituras de ActiveSessions; AUG-006 implementó logout con revocación backend. Ambos mantienen validación real en deployments aislados pendiente. AUG-034 conserva la coordinación general interproyectos; no presumir que está resuelta.
Archivos candidatos a auditoría: Services/Auth.js, Services/Test/Auth.js, Services/users.js, Services/Test/users.js, auth.js, api-config.js, Services/Test/README.md y los registros de tareas/auditoría. El alcance definitivo dependerá de la auditoría diagnóstica.
Restricciones: no modificar endpoints operativos, deployments ni hojas productivas; preservar los Spreadsheet IDs independientes de prueba; no alterar hashing SHA-256 ni reactivar AUG-011; no implementar AUG-017/AUG-042 fuera de los puntos expresamente vinculados a AUG-016.
Riesgos/dependencias conocidos antes de la auditoría: los proyectos AUTH y USERS son Apps Script separados; AUG-034/AUD-T-033 define la coordinación interproyectos aún pendiente; las pruebas aisladas requieren deployments nuevos y no constan como creados en Services/Test/README.md.
Commit previo: AUG-014 5be28707b2a8ab91dfbe8850713089bbe841bcc2. Rama base sin cambios al inicio.
Verificaciones previas relevantes: AUG-014 10/10 escenarios funcionales y 1/1 sintaxis local PASS; AUG-013 24/24 escenarios funcionales y 4/4 sintaxis local PASS. No equivalen a validación real de Apps Script.
Siguiente acción concreta: auditar íntegramente las funciones de mutación/validación de sesión y sus consumidores/copies, sin editar código; registrar todos los hallazgos antes de decidir implementación.
================================================================================


================================================================================
CHECKPOINT FINAL — AUG-016 — 2026-11-09
Estado: BLOQUEADA; auditoría pre-implementación completada. No se implementaron cambios de código.
Repositorio: infogpstech/GPSpedia
Rama autorizada: GPSpedia2.2.5_work
HEAD padre confirmado antes de AUG-016: 5be28707b2a8ab91dfbe8850713089bbe841bcc2
Árbol padre: 74c4805025560d9745cb4b770a60c17bf4a0c490
Rama base protegida: GPSpedia2.2.5
HEAD base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios).
Commit de AUG-016: único commit documental; SHA se verificará en el historial de GPSpedia2.2.5_work. No se creó commit intermedio.
Auditoría:
- Se revisaron los flujos directamente relacionados en Services/Auth.js, Services/Test/Auth.js, Services/users.js, Services/Test/users.js, auth.js, api-config.js y Services/Test/README.md.
- H-AUD-071: login elimina la sesión antigua antes de confirmar setValue/appendRow; no hay clave de idempotencia para reintentos y las filas con token vacío cuentan en SESSION_LIMITS.
- H-AUD-072: resetUserSessions invalida tokens en escrituras secuenciales sin capturar fallos intermedios; el borrado parcial de filas sí informa cleanupPending y puede reintentarse.
- H-AUD-073: changePassword/resetUserPassword pueden dejar revocación y escritura de contraseña parcialmente aplicadas.
- H-AUD-074: USERS cambia Privilegios sin invalidar sesiones; AUTH no devuelve el rol actualizado; el cliente conserva validaciones recientes y touchSession solo actualiza actividad.
Avance reconocido: AUG-153 centralizó los escritores de ActiveSessions en AUTH y usa el mismo ScriptLock local para login/logout/resetUserSessions/deleteUser. Esto resuelve en fuentes la antigua carrera entre dos proyectos escritores, no la atomicidad de Sheets ni la coordinación de cambios de rol desde USERS.
Bloqueo: AUG-034/AUD-T-033 sigue pendiente. Debe definirse la coordinación interproyectos o una autoridad única para la mutación de Privilegios y aprobarse si un cambio de rol invalida todas las sesiones o actualiza el perfil. También debe diseñarse recuperación/idempotencia para H-AUD-071–073 sin asumir atomicidad.
Archivos documentales modificados: Auditoría.txt, Tareas_pendientes_parte1.txt, Tareas.txt, ChangesLogs.txt, lista_beta.txt y checkpoint.md. No se modificó código ni api-config.js.
Verificaciones: comparación append-only contra respaldos exactos PASS para los cinco registros; límite documental de Tareas_pendientes_parte1.txt respetado (165,967 caracteres, máximo 180,000); IDs H-AUD-071–074 registrados; AUG-016 queda BLOQUEADA en ambos registros activos. Revisión documental final PASS.
Validaciones no realizadas: no se ejecutaron pruebas funcionales, parser de código, navegador, Apps Script real, deployments aislados, HTTP, Spreadsheet real ni concurrencia. No se accedió ni modificó datos productivos.
Riesgos pendientes: creación de sesión parcialmente confirmada; recuperación de invalidaciones y cambio de contraseña; sincronización de rol; validación real en copia aislada después de implementar.
Siguiente acción concreta: resolver AUG-034/AUD-T-033 y la política de cambio de rol; después reanudar AUG-016 desde auditoría/diseño de recuperación, con checkpoint propio y pruebas aisladas.
Este checkpoint final es la última actualización documental inmediatamente anterior al único commit de AUG-016.
================================================================================


================================================================================
CHECKPOINT FINAL — AUG-016 — 2026-11-09
Estado: IMPLEMENTADA LOCALMENTE; auditoría y Code Review completados. Validación Beta pendiente.
Repositorio: infogpstech/GPSpedia
Rama autorizada: GPSpedia2.2.5_work
HEAD padre confirmado: e2a6b41abb4bc4e4f355ad98593a01f29cd7897b
Árbol padre confirmado: 1780bad79f12d3d8ae4279e6080535ca04715a24
Rama base protegida: GPSpedia2.2.5
HEAD base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios).
Política aprobada: cualquier cambio de Privilegios revoca todas las sesiones del usuario afectado; requiere nuevo inicio de sesión.

Implementación:
- AUTH centraliza updateUser; USERS ya no publica esa mutación.
- El rol nuevo solo se aplica después de confirmar invalidación de tokens y requestId anteriores. Marcador durable oldRole/newRole permite reintento; fallos parciales mantienen el rol anterior.
- Login usa requestId idempotente en ScriptProperties con retención 24 h; sessionStorage lo conserva por pestaña hasta persistir la sesión. Reintentos recuperan el mismo token; solicitudes revocadas no pueden recrear sesiones.
- Logout, resetUserSessions, cambio/restablecimiento de contraseña, cambio de rol y deleteUser tombstonean requestId relacionados.
- Revocación consolidada de tokens con lectura posterior; no se borran filas con token no confirmado vacío. Filas residuales sin token no autorizan y se pueden limpiar después.
- SESSION_LIMITS ignora tokens vacíos y sesiones expiradas; login reconcilia solicitudes pendientes vencidas.
- Cambio de contraseña valida/genera hash antes de revocar; verifica hash después de setValue. SHA-256 y formato sha256$ permanecen sin cambios.
- Auto-cambio de rol limpia la sesión local y redirige a index.html.

Archivos incluidos en el único commit AUG-016 (15):
1. Services/Auth.js
2. Services/Test/Auth.js
3. Services/users.js
4. Services/Test/users.js
5. api-config.js
6. auth.js
7. users.html
8. Services/Test/README.md
9. Auditoría.txt
10. Tareas_pendientes_parte1.txt
11. Tareas.txt
12. tareas_completadas_parte1.txt
13. ChangesLogs.txt
14. lista_beta.txt
15. checkpoint.md

Verificación local:
- Sintaxis/parser: 7/7 PASS (AUTH prod/test, USERS prod/test, api-config.js, auth.js, script users.html).
- Harness funcional AUTH: 15/15 PASS.
- Integraciones adicionales: 4/4 PASS (handleLogin idempotente; api-config requestId/sessionStorage; reconciliación de requestId pendiente vencido; tombstone de sesión expirada).
- AUTH producción/prueba idénticos salvo Spreadsheet ID: PASS.
- USERS producción/prueba idénticos salvo Spreadsheet ID: PASS.
- Revisión de alcance: solo funciones de sesión/rol/login/contraseña, routing de updateUser, manejo de requestId y documentación relacionada.
- Tareas_pendientes_parte1.txt: 167,672 caracteres, dentro del máximo de 180,000.
- No se modificaron endpoints operativos, deployments, Spreadsheet IDs productivos ni datos reales.

Validación no realizada:
- No se ejecutaron Apps Script real, deployments aislados, navegador real, HTTP, Sheets reales ni pruebas de concurrencia reales. La matriz Beta está registrada en lista_beta.txt y debe ejecutarse antes de declarar el ciclo operativo verificado.
- AUG-034/AUD-T-033 sigue pendiente como coordinación global independiente. AUG-011 sigue expresamente omitida.

Riesgos pendientes:
- SpreadsheetApp no es transaccional; los marcadores, tombstones, lecturas de verificación e idempotencia permiten recuperar fallos, pero operaciones de infraestructura pueden quedar pendientes hasta un reintento.
- La revocación visual en otros dispositivos depende de la siguiente validación/acción; el backend rechaza los tokens revocados.

Documentación finalizada. Este checkpoint es la última acción documental antes del único commit de AUG-016.
================================================================================


================================================================================
CHECKPOINT DE CIERRE NORMALIZADO — AUG-016 — 2026-11-09
Repositorio: infogpstech/GPSpedia. Rama: GPSpedia2.2.5_work. Rama base: GPSpedia2.2.5.
Commit revisado: 9bb6d87e50b69177220be58a1399db5b0d113d63. Padre: e2a6b41abb4bc4e4f355ad98593a01f29cd7897b. HEAD de base verificado: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios).
Ciclo A: revisión de la implementación de AUTH/USERS, ruteo, requestId, expiración, revocación, cambio de rol y consumidores de sesión. Sin hallazgos nuevos bloqueantes dentro del alcance. H-AUD-066/AUG-154 permanece como deuda independiente.
Validación local reejecutada: sintaxis/parsing 7/7 PASS; equivalencia AUTH prod/test y USERS prod/test 2/2 PASS; contratos de ruteo, handler único AUTH, política de expiración 8/8 PASS; pruebas locales con dobles para límites de expiración y revocación 6/6 PASS. Se conserva además la evidencia del commit de harness funcional AUTH 15/15 PASS e integraciones 4/4 PASS.
Estado final: AUG-016 COMPLETADA por validación local aprobada. Las pruebas con deployments, navegador real, HTTP, Sheets reales y concurrencia de Apps Script quedan DIFERIDAS A BETA; no condicionan el cierre local.
No se modificaron endpoints, deployments, datos productivos ni rama base. No se ejecutó ninguna operación contra servicios operativos.
Siguiente tarea: AUG-017 — restablecer controles de navegación al cambiar de cuenta/rol. Su auditoría e implementación se iniciarán después de verificar este commit.
Este checkpoint es la última actualización documental del commit de normalización de estado AUG-016.
================================================================================
