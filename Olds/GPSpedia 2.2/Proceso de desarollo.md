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
