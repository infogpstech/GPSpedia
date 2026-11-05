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


# BLOQUEO OPERATIVO OBLIGATORIO — CHECKPOINTS Y COMMITS

Estas reglas son controles de ejecución, no recomendaciones. Prevalecen sobre cualquier flujo de trabajo, herramienta o conveniencia técnica que pudiera generar commits por archivo.

## A. Un único commit por tarea (regla inviolable)

1. Una tarea completa debe producir **exactamente un commit**, aunque incluya uno o decenas de archivos.
2. Está **PROHIBIDO** crear, actualizar o eliminar archivos mediante operaciones individuales que generen un commit automático por archivo (por ejemplo, una llamada de Contents API por archivo).
3. Todos los cambios de código, configuración y documentación pertenecientes a la tarea se prepararán primero como un conjunto. Después de verificar el conjunto completo, se incorporarán mediante **un solo commit** que incluya todos los archivos modificados.
4. No se permite crear commits intermedios, commits de respaldo, commits de auditoría, commits de logs ni commits exclusivos para guardar checkpoints.
5. Si una herramienta disponible solo permite generar un commit por archivo, **NO se utilizará**. Se deberá utilizar un flujo que permita preparar los blobs y un único árbol Git, crear un solo commit y actualizar la rama una sola vez.
6. Antes de publicar, verificar que el commit tenga como padre el HEAD confirmado al inicio de la tarea y que incluya todos los cambios previstos. Después, verificar el HEAD de la rama y la lista de archivos del commit.
7. Si se detecta que se generó más de un commit para una misma tarea, la tarea no se considerará conforme con este procedimiento. No se ocultará ni se corregirá mediante reescritura de historial sin autorización expresa.

## B. Checkpoint obligatorio como puerta de entrada y de salida

1. **ANTES DE AUDITAR O MODIFICAR** cualquier archivo, leer el checkpoint existente y actualizar checkpoint.md con un checkpoint inicial que refleje el estado real: repositorio, rama, HEAD, alcance, archivos afectados, riesgos, fase y siguiente acción.
2. No se iniciará la auditoría ni se editará código mientras el checkpoint inicial no esté preparado y revisado.
3. Durante la tarea, mantener el checkpoint coherente con la fase real. Si cambia el alcance, aparece un bloqueo o se reinicia la auditoría por Code Review, actualizarlo antes de continuar.
4. Al terminar implementación, pruebas, comparación, revisión y registros, actualizar checkpoint.md con el resultado real, archivos, verificaciones, limitaciones, pendientes y siguiente acción.
5. La actualización final del checkpoint será **el último cambio documental antes del único commit**. No se permitirá editar otros archivos después de cerrar el checkpoint, salvo que se reabra el ciclo y se actualice de nuevo.
6. El checkpoint inicial, las actualizaciones intermedias necesarias y el checkpoint final se incorporarán en el mismo commit de la tarea. Nunca se generará un commit separado para el checkpoint.
7. Si no se puede completar o verificar el checkpoint, detener el cierre de la tarea: no declararla completada ni generar el commit.

## C. Verificación obligatoria antes del commit

Antes de crear el único commit, comprobar en conjunto:
- que todos los archivos de la tarea están incluidos;
- que no hay archivos temporales ni cambios ajenos;
- que Auditoría.txt, ChangesLogs.txt y Tareas.txt están actualizados cuando corresponda;
- que checkpoint.md contiene el cierre final;
- que se está trabajando en la rama autorizada y sobre el HEAD esperado.

**REGLA DE BLOQUEO:** si cualquiera de estos puntos falla, no se crea ningún commit.

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

# CONTROL DE COMMITS POR TAREA — REGLA INVIOLABLE

**EXACTAMENTE UN COMMIT POR TAREA. NO UN COMMIT POR ARCHIVO.**

Cada tarea deberá generar **un único commit**, independientemente de la cantidad de archivos que sea necesario modificar.

Cuando una tarea requiera editar varios archivos:
- reunir todos los cambios de código y documentación de esa tarea;
- preparar y revisar el conjunto completo antes de publicarlo;
- generar un solo árbol Git y un solo commit con todos los archivos modificados;
- actualizar la referencia de la rama una sola vez;
- comprobar que el commit contiene todos los archivos esperados.

Está **PROHIBIDO** utilizar operaciones individuales de creación/actualización de archivos que generen un commit automático por cada archivo. También están prohibidos los commits intermedios, de respaldo, de logs o exclusivos para checkpoints.

Si la herramienta disponible no permite agrupar los archivos en un solo commit, se deberá detener la publicación y utilizar otro método compatible. **Nunca dividir una tarea para adaptarse a una limitación de la herramienta.**

El commit se realizará únicamente después de completar la implementación, las verificaciones, la revisión de código, los registros y el checkpoint final. Si se necesita corregir algo después de preparar el checkpoint final, se reabre el procedimiento, se actualiza el checkpoint y se vuelve a preparar el mismo commit único.