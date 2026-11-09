# Protocolo obligatorio de continuidad y control entre tareas — GPSpedia

**Carácter:** anexo normativo obligatorio del documento `Proceso de desarollo.md` y del Plan Maestro de Implementación.  
**Aplicación:** todas las sesiones, tareas correctivas, cambios funcionales y tareas documentales del repositorio `infogpstech/GPSpedia`.  
**Rama de trabajo:** `GPSpedia2.2.5_work`.  
**Rama base:** `GPSpedia2.2.5`, nunca se modifica ni se fusiona sin autorización expresa.

Este anexo complementa el procedimiento existente; no elimina ni reduce sus requisitos. Si existe una diferencia, se aplica el control más estricto. Se conserva íntegro `Proceso de desarollo.md`; este anexo se mantiene separado para respetar su instrucción de preservación.

## 1. Regla principal: dos ciclos ordenados

Antes de auditar o implementar una tarea nueva, debe cerrarse el control de calidad de la tarea registrada en el checkpoint anterior. El orden es obligatorio:

1. Validar el último checkpoint y el estado real de Git.
2. Auditar la implementación entregada por la tarea anterior.
3. Registrar los hallazgos encontrados.
4. Corregir los hallazgos de la tarea anterior mediante una tarea correctiva independiente y su propio commit.
5. Verificar que el commit correctivo quedó publicado en la rama autorizada.
6. Solo entonces iniciar la auditoría pre-implementación de la tarea actual.
7. Registrar los hallazgos de la tarea actual.
8. Implementar la tarea actual, verificarla y publicar su propio commit.

**Nunca se audita una auditoría.** Se inspecciona el código, los archivos funcionales y los entregables reales de la tarea anterior. Los informes de auditoría, consolidaciones y registros se consultan únicamente como referencias para conocer alcance, IDs y antecedentes; no se convierten en objetivos de una nueva auditoría ni se repiten unidades AUD-T ya completadas.

## 2. Validación del último checkpoint

Antes de cualquier auditoría o edición:

- Leer el último checkpoint completo y determinar la última tarea, su estado, fase, archivos, riesgos, hallazgos abiertos y siguiente acción.
- Confirmar mediante GitHub que la rama de trabajo apunta exactamente al commit que contiene ese checkpoint.
- Verificar el padre de ese commit y el HEAD actual de la rama base.
- Confirmar que no existe una tarea anterior incompleta, bloqueada o con validaciones pendientes que deba reanudarse.
- Identificar los archivos realmente modificados por la tarea anterior mediante el commit y el checkpoint.

Un checkpoint es **válido** solo cuando su contenido está incluido en un commit verificable de la rama autorizada, el HEAD coincide con ese commit y la rama base permanece intacta. Una fecha, un mensaje de conversación o un SHA escrito en el checkpoint no bastan por sí solos.

Si el HEAD no coincide, el commit no puede verificarse, la rama base cambió inesperadamente o el checkpoint no permite reconstruir el estado, se detiene el trabajo. No se adivina el estado ni se continúa sobre una referencia incierta.

Si el checkpoint anterior declara una tarea parcial, bloqueada o con validaciones obligatorias pendientes, se reanuda esa tarea; no se inicia una tarea distinta.

## 3. Ciclo A — Auditoría de la implementación anterior

La auditoría se limita a los cambios y entregables reales de la tarea anterior:

- Revisar el diff del commit anterior para delimitar los archivos modificados.
- Examinar los archivos funcionales o documentos de producto que constituyeron el entregable; archivo por archivo, línea por línea y función por función cuando corresponda.
- Verificar criterios de aceptación, dependencias, compatibilidad, efectos colaterales, seguridad, errores y pruebas declaradas.
- Contrastar lo que el checkpoint y ChangesLogs dicen que se hizo contra el contenido real y la evidencia disponible.
- No asumir que una prueba se ejecutó solo porque aparezca planificada.
- No reauditar los informes de auditoría, sus consolidaciones ni la auditoría histórica. No repetir una AUD-T cerrada como si fuera nueva.

Para una tarea exclusivamente documental, se revisa el documento de producto que se creó o modificó y su correspondencia con el requerimiento; no se auditan los informes de auditoría usados como fuentes.

### Registro de hallazgos

Cada hallazgo nuevo debe registrarse en `Auditoría.txt` antes de corregirlo y vincularse en `Tareas.txt` cuando requiera una tarea correctiva.

Cada entrada debe incluir:
- ID único, severidad y estado;
- tarea/commit de origen;
- archivo, función, sección o ubicación;
- evidencia reproducible y comportamiento observado;
- impacto y riesgo;
- criterio verificable de corrección;
- dependencias y referencias a tareas existentes.

Antes de asignar un ID se comprueba que no exista. Se conserva el formato completo del identificador, incluidos los sufijos jerárquicos; no se cuentan prefijos truncados como hallazgos independientes. No se borran entradas históricas: las invalidaciones y rectificaciones se agregan como notas trazables.

Si no se encuentran hallazgos, se registra ese resultado en el checkpoint de la tarea actual con el alcance y los archivos efectivamente examinados. No se inventa un hallazgo para justificar un commit.

## 4. Ciclo A — Corrección obligatoria de hallazgos anteriores

Si se detecta uno o más hallazgos en la tarea anterior:

1. No iniciar todavía la auditoría de la tarea actual.
2. Agrupar únicamente hallazgos relacionados que puedan resolverse de forma coherente dentro de una misma tarea correctiva. Los hallazgos independientes conservan tareas separadas.
3. Crear/actualizar el checkpoint inicial de la tarea correctiva.
4. Auditar los archivos que se modificarán para esa corrección antes de editarlos, sin auditar informes de auditoría.
5. Registrar los hallazgos y dependencias; generar respaldos exactos.
6. Implementar exclusivamente las correcciones aprobadas.
7. Ejecutar verificaciones funcionales y de regresión aplicables; documentar expresamente lo que no pudo ejecutarse.
8. Comparar contra los respaldos, revisar efectos colaterales y realizar Code Review/Safety & Side Effects.
9. Actualizar ChangesLogs, Tareas y el checkpoint final.
10. Publicar **un único commit** para esa tarea correctiva y verificarlo.

No se permite comenzar la auditoría pre-implementación de la tarea actual hasta que el commit correctivo esté publicado, su SHA esté verificado, el checkpoint refleje el resultado y no queden hallazgos bloqueantes de la tarea anterior.

Si un hallazgo anterior no puede resolverse por falta de acceso, entorno, autorización o dependencia, se documenta como bloqueante y se detiene el avance. No se marca como resuelto ni se oculta en una tarea posterior. Una postergación requiere decisión expresa del usuario, motivo, riesgo y tarea vinculada; los hallazgos críticos de seguridad/integridad no se difieren.

### Commit correctivo separado

El commit correctivo pertenece exclusivamente a la tarea de corrección de la implementación anterior. No debe mezclarse con la tarea nueva. Si se necesitan varias tareas correctivas independientes, cada una tendrá su propio ciclo y un único commit.

## 5. Ciclo B — Auditoría pre-implementación de la tarea actual

Solo después de cerrar y verificar el Ciclo A:

1. Capturar el checkpoint inicial de la tarea actual, con HEAD y rama base confirmados.
2. Definir el alcance exacto y los archivos/funcionalidades que podrían cambiar.
3. Auditar esos archivos antes de editar: estructura, funciones, dependencias, contratos, estados, errores, concurrencia, seguridad, compatibilidad y efectos colaterales.
4. Registrar los hallazgos en Auditoría.txt antes de comenzar la implementación.
5. Resolver dentro de la tarea actual únicamente los hallazgos directamente relacionados y seguros para su alcance.
6. Los hallazgos ajenos al alcance se registran como tareas separadas en Tareas.txt y se referencian en Auditoría.txt. Si son dependencias bloqueantes, se detiene la implementación hasta resolverlas o recibir una autorización expresa para una excepción no crítica.

La auditoría pre-implementación es diagnóstica: no se corrige código durante esa fase. Primero se termina y registra la auditoría; después comienza la implementación.

## 6. Implementación y cierre de la tarea actual

Después de la auditoría pre-implementación se aplica íntegramente el procedimiento existente:

- respaldos exactos antes de editar;
- cambios mínimos y justificados;
- pruebas unitarias, de contrato, integración, navegador, seguridad y regresión que correspondan;
- comparación post-edición;
- revisión de integridad y efectos colaterales;
- Code Review y tratamiento de Safety & Side Effects;
- ChangesLogs y actualización de Tareas;
- eliminación de temporales según el procedimiento;
- checkpoint final como último paso documental.

No se declara una tarea completada si quedan pruebas obligatorias pendientes. Se registran las limitaciones y el estado real (completada, parcial o bloqueada).

Si Code Review exige cambios, se reinicia el procedimiento desde la auditoría inicial del archivo afectado. No se hacen correcciones fuera del proceso.

## 7. Commits: uno por tarea, nunca uno por sesión

Una sesión puede requerir más de un commit únicamente porque contiene **tareas distintas**:

- tarea correctiva de la implementación anterior: un commit;
- tarea actual: otro commit.

Cada tarea genera exactamente un commit que incluye todos sus cambios de código y documentación, checkpoint incluido. Está prohibido crear commits intermedios o separar checkpoint, Auditoría, ChangesLogs o Tareas.

El único método autorizado es GitHub Git Database API, en este orden:

1. Verificar repositorio, rama de trabajo, HEAD de trabajo y HEAD base.
2. Crear todos los blobs necesarios.
3. Crear un único árbol con base en el árbol del HEAD confirmado.
4. Crear un único commit con parent_sha igual al HEAD confirmado.
5. Actualizar exclusivamente `GPSpedia2.2.5_work` mediante update_ref, force:false y expected_sha igual al HEAD confirmado.
6. Verificar SHA, padre, archivos incluidos, nuevo HEAD y que `GPSpedia2.2.5` no cambió.

No utilizar Contents API, interfaz web, Git local, git commit/push, force push, merges ni métodos alternativos. Si falla cualquier etapa, detenerse; no improvisar otro commit ni cambiar expected_sha para forzar la publicación.

## 8. Bloqueos y registros inaccesibles

Si `Auditoría.txt`, `Tareas.txt`, el checkpoint o los archivos funcionales necesarios no pueden leerse/escribirse de forma verificable, no se declara cumplido el procedimiento. Se registra el bloqueo en el checkpoint y se informa al usuario. No se sustituye silenciosamente un registro obligatorio por un resumen conversacional.

No se realizan pruebas contra datos, servicios o deployments productivos cuando el plan exige un entorno aislado. No se afirman resultados de herramientas no ejecutadas.

## 9. Reglas permanentes

- **No auditar auditorías.** Revisar la implementación, no volver a auditar los informes.
- **No saltar la tarea anterior.** Sus hallazgos se resuelven y su commit se verifica antes de auditar la tarea actual.
- **No mezclar tareas.** Un commit por cada tarea, aunque una sesión contenga dos o más.
- **No cambiar sin auditar.** La auditoría pre-implementación y su registro preceden a la modificación.
- **No cerrar sin evidencia.** Estado, pruebas y limitaciones deben ser verificables.
- **No alterar la rama base.** Todo el trabajo ordinario permanece en `GPSpedia2.2.5_work`.
- **No reintroducir los filtros rápidos cancelados** del catálogo.
