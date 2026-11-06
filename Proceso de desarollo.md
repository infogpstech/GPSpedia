Importante:  
**PROHIBIDO AGREGAR, EDITAR O BORRAR CONTENIDO ANTES Y DESPUES DEL SIGUIENTE BLOQUE DE TEXTO.**

---

# PROCEDIMIENTO OBLIGATORIO DE TRABAJO

Este procedimiento es de **CUMPLIMIENTO OBLIGATORIO** para **todos los proyectos**, independientemente de su tamaño, complejidad o estado de desarrollo.

Ningún paso podrá omitirse, alterarse, intercambiarse de orden o ejecutarse parcialmente.

Cada fase constituye un requisito indispensable para garantizar:

- la integridad del código;
- la trazabilidad de los cambios;
- la estabilidad del proyecto;
- la prevención de regresiones;
- la correcta documentación del proceso de desarrollo.

El incumplimiento de cualquiera de los pasos descritos en este documento invalida el proceso completo.

---

## 0. CHECKPOINT OBLIGATORIO DE INICIO Y CIERRE DE TAREA

El archivo **checkpoint.md** es el registro de continuidad del desarrollo y deberá mantenerse actualizado durante cada tarea.

### Al inicio de cada tarea
Antes de iniciar la auditoría y antes de modificar cualquier archivo, se deberá crear o actualizar `checkpoint.md` para registrar el estado existente del proyecto. Como mínimo deberá incluir:

- repositorio y rama de trabajo;
- rama base protegida;
- último commit conocido;
- tarea que se va a realizar y su alcance;
- estado de la tarea y fase del procedimiento en la que se encuentra;
- archivos y funcionalidades involucrados;
- hallazgos, riesgos y dependencias conocidos;
- cambios ya implementados y verificaciones realizadas;
- pendientes, bloqueos y siguiente acción concreta.

El checkpoint inicial deberá describir el estado real observado, sin asumir que tareas o validaciones están completadas. Si existe un checkpoint previo, se deberá conservar su historial relevante y actualizarlo sin borrar información necesaria para la continuidad.

### Al finalizar cada tarea
Una vez terminadas la implementación, las verificaciones, la revisión de código y los registros obligatorios, la **actualización final de `checkpoint.md` será el último paso de documentación de la tarea, inmediatamente antes de generar su único commit**.

La actualización deberá reflejar el resultado real de la tarea e indicar:

- estado final (completada, parcial, pendiente o bloqueada);
- archivos modificados;
- resumen de cambios realizados;
- verificaciones ejecutadas y sus resultados;
- validaciones que no pudieron realizarse;
- riesgos o pendientes que continúan abiertos;
- último commit conocido antes de la tarea y referencia al commit que incorpora el checkpoint, identificable en el historial de Git;
- siguiente tarea o acción concreta para retomar el trabajo.

No se deberá marcar como completada una tarea si quedan validaciones obligatorias pendientes. Si una observación de Code Review obliga a reiniciar el procedimiento, `checkpoint.md` deberá reflejar ese reinicio y la fase actual.

El checkpoint no sustituye a `Auditoría.txt`, `ChangesLogs.txt` ni `Tareas.txt`; cada archivo deberá seguir cumpliendo su función. La creación inicial y la actualización final del checkpoint forman parte de la misma tarea y deberán incluirse en su único commit. Está prohibido generar commits adicionales únicamente para guardar el checkpoint.

---

# FLUJO PRINCIPAL DE TRABAJO

## 1. Auditoría inicial del archivo

Antes de realizar cualquier modificación se deberá efectuar una auditoría completa del o de los archivos involucrados.

La auditoría deberá realizarse:

- archivo por archivo;
- línea por línea;
- función por función.

Durante esta etapa deberá identificarse como mínimo:

- estado actual del código;
- funcionamiento existente;
- dependencias internas;
- dependencias externas;
- posibles riesgos;
- efectos colaterales;
- código duplicado;
- funciones huérfanas;
- funciones sin uso;
- condiciones de carrera;
- errores de sintaxis;
- inconsistencias lógicas;
- cualquier elemento que pueda verse afectado por la tarea.

### Restricción

Durante la auditoría está estrictamente prohibido:

- modificar código;
- corregir errores;
- reorganizar funciones;
- eliminar código.

La auditoría tiene únicamente carácter diagnóstico.

---

## 2. Registro de hallazgos

Todos los hallazgos encontrados durante la auditoría deberán documentarse obligatoriamente en:

```
Auditoría.txt
```

Se deberá:

- crear una nueva entrada cuando corresponda;
- o actualizar la entrada existente relacionada.

### Restricciones

Está prohibido:

- eliminar registros anteriores;
- sobrescribir auditorías previas;
- corregir problemas durante esta etapa.

Toda observación deberá quedar documentada antes de continuar con el proceso.

---

## 3. Manejo de hallazgos fuera del alcance

Si durante la auditoría se detectan problemas que no forman parte de la tarea solicitada, deberán evaluarse cuidadosamente.

### Caso A

Si la corrección es completamente segura y no modifica el alcance del trabajo actual:

- podrá resolverse dentro del mismo commit.

### Caso B

Si la corrección implica riesgos, requiere mayor análisis o pertenece a otra funcionalidad:

- no deberá implementarse durante la tarea actual.

En ese caso será obligatorio:

- registrar una nueva tarea en **Tareas.txt**;
- referenciar dicha tarea en **Auditoria.txt**.

Esto garantiza la trazabilidad del problema y evita introducir cambios no planificados.

---

## 4. Respaldo obligatorio antes de editar

Antes de modificar cualquier archivo deberá generarse una copia exacta del mismo.

El respaldo deberá conservar íntegramente:

- nombre original;
- contenido completo;
- estructura.

Este respaldo tendrá un único propósito:

comparar posteriormente el archivo modificado contra su estado original.

### Restricciones

El respaldo:

- no podrá utilizarse como archivo de trabajo;
- no deberá modificarse;
- no deberá sustituir al archivo original.

---

## 5. Ejecución de la tarea

Una vez concluida la auditoría y creado el respaldo, podrá iniciarse la implementación.

Únicamente deberán realizarse los cambios estrictamente necesarios para cumplir la tarea solicitada.

### Está prohibido

- modificar estilos no relacionados;
- alterar flujos existentes;
- reorganizar código innecesariamente;
- introducir optimizaciones no solicitadas;
- realizar refactorizaciones fuera del alcance;
- modificar funciones cuyo comportamiento no esté relacionado con la tarea.

Todo cambio deberá tener una justificación directa y demostrable respecto al requerimiento solicitado.

---

## 6. Verificación funcional

Una vez implementada la modificación deberá comprobarse que:

- la tarea cumple correctamente su objetivo;
- las funciones existentes continúan funcionando;
- no se introdujeron regresiones.

La revisión deberá abarcar tanto los flujos directamente afectados como aquellos relacionados de forma indirecta.

---

## 7. Comparación post-edición (Obligatoria)

Terminada la implementación deberá compararse el archivo modificado contra el respaldo generado previamente.

La comparación deberá identificar:

- líneas eliminadas;
- líneas modificadas;
- bloques reemplazados;
- bloques agregados;
- cambios estructurales.

Cada modificación deberá verificarse individualmente.

### Objetivo

Confirmar que absolutamente todos los cambios realizados corresponden exclusivamente a la tarea solicitada.

### Si se detectan cambios ajenos

Se deberá:

1. revertir inmediatamente dichos cambios;
2. repetir nuevamente la comparación;
3. continuar únicamente cuando el archivo contenga exclusivamente modificaciones relacionadas con la tarea.

---

### Eliminación de archivos temporales

Los archivos de respaldo deberán eliminarse únicamente después de finalizar satisfactoriamente la revisión de **Code Review**.

Asimismo:

todo archivo temporal generado para validaciones deberá eliminarse antes del commit.

Esto incluye, entre otros:

- archivos de respaldo;
- capturas de pantalla;
- imágenes temporales;
- archivos de prueba;
- ejecutables auxiliares;
- scripts utilizados exclusivamente para verificación.

No deberán permanecer archivos temporales dentro del repositorio.

---

## 8. Verificación de integridad y efectos colaterales

Después de finalizar la implementación deberá revisarse nuevamente la integridad del sistema.

La revisión deberá confirmar:

- funcionamiento correcto de dependencias internas;
- funcionamiento correcto de dependencias externas;
- ausencia de efectos colaterales;
- ausencia de regresiones visuales;
- ausencia de regresiones funcionales.

No deberá asumirse que una modificación es segura únicamente porque compile correctamente.

---

## 9. Revisión final de código

Antes de considerar concluida la implementación deberá realizarse una nueva revisión completa.

Esta revisión deberá efectuarse nuevamente:

- línea por línea;
- función por función;
- archivo por archivo.

El objetivo será evaluar:

- claridad;
- consistencia;
- legibilidad;
- impacto;
- cumplimiento de la tarea.

---

## 10. Registro en ChangesLogs.txt

Todas las modificaciones realizadas deberán documentarse obligatoriamente en:

```
ChangesLogs.txt
```

Cada registro deberá indicar como mínimo:

- archivo modificado;
- líneas afectadas;
- descripción objetiva del cambio.

### Restricciones

Está prohibido utilizar frases que:

- asuman éxito;
- indiquen validaciones no realizadas;
- expresen conclusiones subjetivas.

El registro deberá limitarse exclusivamente a describir objetivamente las modificaciones implementadas.

---

## 11. Actualización de Tareas.txt

Una vez concluida la implementación deberá actualizarse:

```
Tareas.txt
```

La tarea ejecutada deberá trasladarse al apartado correspondiente según el flujo de trabajo definido para el proyecto.

La actualización deberá mantener el historial de tareas y conservar la trazabilidad del desarrollo.

---

# EXTENSIÓN OBLIGATORIA POR CODE REVIEW

Si durante el proceso de **Code Review** se detecta cualquiera de las siguientes situaciones:

- errores;
- fallas;
- riesgos;
- observaciones bloqueantes;
- cambios requeridos;
- regresiones;
- efectos colaterales;
- inconsistencias;

será obligatorio reiniciar nuevamente el procedimiento completo.

Esto aplica incluso cuando implique modificar archivos que ya fueron editados anteriormente.

No se permiten correcciones parciales.

Toda observación derivada del Code Review deberá seguir nuevamente el procedimiento completo.

---

# PROTOCOLO DE RESULTADO DE CODE REVIEW

## Flujo de análisis

### 1. Lectura completa del informe

El informe del Code Review deberá leerse íntegramente.

No deberán omitirse:

- observaciones;
- advertencias;
- recomendaciones;
- comentarios secundarios.

Cada punto deberá analizarse individualmente.

---

### 2. Safety & Side Effects

La sección:

```
Safety & Side Effects
```

se considera la fuente principal de verdad técnica.

Sus observaciones deberán respetarse obligatoriamente.

La única excepción será cuando el propio Code Review indique expresamente revertir cambios previamente aprobados.

---

# Tratamiento de solicitudes de reversión

## 3. Evaluación obligatoria

Toda solicitud de reversión deberá clasificarse antes de ejecutarse.

### A. Cambios "Out of Scope"

Verificar si pertenecen a:

- tareas anteriores;
- commits previamente aprobados;
- implementaciones ajenas al trabajo actual.

Si pertenecen a trabajos anteriores:

- la solicitud de reversión deberá ignorarse;
- el trabajo actual continuará normalmente.

---

### B. Cambios introducidos durante la tarea actual

Si el Code Review determina que durante la implementación actual se introdujeron modificaciones no solicitadas:

será obligatorio:

- revertir dichos cambios;
- registrar el motivo de la reversión;
- reiniciar el procedimiento desde la auditoría inicial.

---

# Impacto sobre el flujo de trabajo

## 4. Reinicio obligatorio del ciclo

Toda observación del Code Review que implique modificaciones reinicia automáticamente el procedimiento completo.

El reinicio deberá comenzar nuevamente desde:

**Auditoría inicial del archivo.**

Este reinicio no afecta:

- commits anteriores;
- tareas previamente aprobadas;
- cambios que se encuentren fuera del alcance del trabajo actual.

---

# Documentación obligatoria

Toda acción derivada del Code Review deberá documentarse obligatoriamente en:

- Auditoría.txt
- ChangesLogs.txt

La documentación deberá indicar:

- observación recibida;
- decisión tomada;
- acciones realizadas.

---

# Regla final absoluta

## Principio fundamental

**SI NO SE AUDITA, NO SE CAMBIA.**

**SI NO SE REGISTRA, NO EXISTE.**

Cualquier incumplimiento de este procedimiento invalida completamente el proceso de desarrollo.

---

# ZONAS SEGURAS (ACCESO RESTRINGIDO)

## Protección crítica de funcionalidades

Determinadas secciones del código podrán declararse como **ZONAS SEGURAS**.

Una Zona Segura corresponde a funcionalidades cuya modificación implica un alto riesgo para la estabilidad del sistema.

Estas zonas podrán incluir:

- lógica crítica;
- navegación;
- sincronización;
- caché;
- autenticación;
- flujos principales;
- componentes de alto impacto;
- cualquier otra funcionalidad declarada explícitamente como protegida.

Toda modificación sobre una Zona Segura requerirá:

- autorización expresa;
- auditoría rigurosa;
- análisis de dependencias;
- evaluación de riesgos.

---

## Marcado obligatorio del código

Cuando una sección sea declarada como Zona Segura deberá agregarse al inicio del bloque de código un comentario visible dirigido al desarrollador.

Este comentario deberá advertir que el bloque pertenece a una Zona Segura y que cualquier modificación requiere seguir estrictamente el procedimiento descrito en este documento.

---

# CONTROL DE COMMITS POR TAREA

Cada tarea deberá generar **un único commit**, independientemente de la cantidad de archivos que sea necesario modificar.

Cuando una tarea requiera editar varios archivos:

- todos los cambios correspondientes a esa misma tarea deberán agruparse;
- se deberá generar un solo commit que incluya todos los archivos modificados;
- está prohibido crear un commit independiente cada vez que se edite o actualice un archivo.

No se deberá dividir una misma tarea en varios commits únicamente por haber trabajado en archivos diferentes. El commit se realizará cuando estén terminadas las modificaciones de la tarea y se hayan completado las verificaciones y registros obligatorios del procedimiento.

 
---

# PROCEDIMIENTO ÚNICO AUTORIZADO PARA GENERAR Y PUBLICAR COMMITS

Esta sección desarrolla y hace obligatorio el control de commits por tarea establecido anteriormente. No reemplaza, elimina, reduce ni modifica ninguna otra regla de este documento. En caso de que una instrucción anterior establezca un único commit por tarea, ambas reglas se aplican conjuntamente: se generará exactamente un commit mediante el procedimiento descrito aquí.

## 1. Método exclusivo

El único método autorizado para generar y publicar commits en este proyecto es el flujo Git Database API de GitHub, en el siguiente orden:

1. **Confirmar el estado de Git antes de escribir:** verificar el repositorio, la rama de trabajo autorizada, su HEAD actual y el HEAD de la rama base protegida. El HEAD de la rama de trabajo será el expected_sha y el padre del nuevo commit. Si la rama, el HEAD o el estado esperado no coinciden con lo documentado, detenerse y volver a auditar; no continuar con valores supuestos.
2. **Crear un blob por cada archivo que deba incluirse:** utilizar create_blob para almacenar el contenido completo de cada archivo modificado o nuevo. La creación de blobs no debe generar commits ni mover referencias.
3. **Crear un único árbol Git:** utilizar create_tree una sola vez para agrupar todos los blobs de la tarea, tomando como base_tree_sha el árbol del HEAD confirmado. El árbol debe conservar los archivos no involucrados y contener todos los cambios de la tarea.

   **Estructura y momento de creación del árbol:** no crear árboles intermedios ni uno por archivo. Primero deberán estar creados todos los blobs de la tarea; después se realizará una sola llamada a create_tree. Cada elemento de `tree_elements` deberá identificar la ruta del archivo (`path`), el modo Git correspondiente (`mode`, normalmente `100644` para archivos regulares), el tipo de objeto (`type: "blob"`) y el SHA del blob creado (`sha`). Para archivos modificados se conservará su ruta original y se utilizará el SHA del nuevo blob. `base_tree_sha` será el árbol del HEAD confirmado, de modo que los archivos no involucrados permanezcan intactos.
4. **Crear un único commit:** utilizar create_commit una sola vez, con el árbol recién creado y con parent_sha igual al HEAD confirmado en el paso 1. El mensaje debe describir objetivamente la tarea. No se crearán commits separados por archivo, por registro documental ni por etapa.
5. **Actualizar exclusivamente la referencia autorizada:** utilizar update_ref para mover únicamente la rama de trabajo autorizada al SHA del commit recién creado, con force:false y expected_sha igual al HEAD confirmado en el paso 1. Esta operación debe funcionar como actualización condicionada: si la rama ya no apunta al SHA esperado, la actualización debe rechazarse.
6. **Verificar el resultado:** consultar el commit creado y comparar el HEAD anterior con la rama de trabajo. Confirmar que la rama apunta al nuevo commit, que el commit tiene como único padre el HEAD anterior, que incluye todos y únicamente los archivos previstos y que la rama base protegida no cambió.

## 2. Restricciones absolutas

- El flujo anterior es el único procedimiento autorizado para crear y publicar commits. No se permite sustituirlo por otro método.
- Está prohibido utilizar operaciones de GitHub Contents API que creen commits automáticamente por archivo.
- Está prohibido utilizar la interfaz web de GitHub, Git local, comandos git commit/git push, automatizaciones externas o cualquier otro mecanismo alternativo para generar o publicar el commit de la tarea.
- Está prohibido crear más de un commit para una misma tarea, incluidos commits de checkpoint, auditoría, ChangesLogs o Tareas separados del commit principal.
- Todos los archivos de código y documentación pertenecientes a la tarea deberán quedar incluidos en el mismo árbol y en el mismo commit.
- No se utilizará force:true; no se sobrescribirá ni se reescribirá el historial.
- No se actualizará la rama base protegida, no se hará merge y no se moverán referencias distintas de la rama de trabajo expresamente autorizada.
- La actualización de checkpoint.md deberá ser el último paso documental antes de crear el único commit, de acuerdo con la regla existente.

## 3. Condiciones de detención

Si falla la creación de un blob, la creación del árbol o la creación del commit, se detendrá el procedimiento. No se deberá crear un commit parcial ni utilizar un método alternativo.

Si update_ref falla, se deberá consultar el estado real de la rama antes de cualquier otra acción. No se creará otro commit ni se cambiará el expected_sha para forzar la publicación. Si la rama no apunta al commit esperado o el estado no puede determinarse con certeza, se detendrá la tarea y se informará el bloqueo.

Si la verificación final detecta archivos inesperados, un padre distinto, una rama incorrecta o cualquier cambio en la rama protegida, la tarea no se declarará completada. Se documentará el resultado y se detendrá cualquier operación adicional hasta contar con una nueva autorización expresa.

## 4. Regla de cumplimiento

Este flujo se aplica a todas las tareas y a todos los cambios del proyecto, independientemente del número de archivos. Ningún procedimiento alternativo queda autorizado por conveniencia, limitación de herramientas o urgencia. La única salida permitida ante un bloqueo es detenerse, conservar el estado verificable e informar al usuario; no improvisar otro método de commit.
