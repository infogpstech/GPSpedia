# Reglas de contexto de trabajo para GPSpedia

Consultar este archivo y `Proceso de desarollo.md` al comenzar cada tarea.

## Repositorio y ramas
- Trabajar únicamente en el repositorio `infogpstech/GPSpedia`.
- **Rama de trabajo vigente:** `GPSpedia2.2.5_work`. Continuar las tareas de este flujo directamente sobre esta rama; no crear una rama nueva salvo instrucción expresa del usuario.
- **Rama base del flujo:** `GPSpedia2.2.5`. No realizar commits directos, actualizaciones de referencia ni merges sobre esta rama.
- No cambiar a `fix/pys-carousel-card-sizing-print-images`: esa referencia está desactualizada para el flujo actual.
- Cuando una tarea de código requiera revisión mediante Pull Request, utilizar `GPSpedia2.2.5_work` como origen y `GPSpedia2.2.5` como destino. No hacer merge sin revisar primero el resultado con el usuario.
- Cuando corresponda, revisar el resultado desplegando la rama de trabajo en GitHub Pages antes de decidir si se hace merge.
- **Nota de protección:** el procedimiento del proyecto trata `GPSpedia2.2.5` como rama base protegida y prohíbe modificarla. Sin embargo, la consulta de GitHub realizada el 2026-11-06 devolvió `protected:false` tanto para la rama base como para la rama de trabajo. La protección de GitHub debe configurarse por separado; hasta entonces la protección es procedimental, no una regla técnica aplicada por GitHub.

## Protección documental y proceso
- No eliminar, recortar ni sobrescribir registros anteriores en `Auditoría.txt`, `Tareas.txt`, `ChangesLogs.txt` ni otros documentos históricos.
- No modificar `Proceso de desarollo.md` salvo instrucción expresa.
- Antes de editar archivos, cumplir el procedimiento completo de `Proceso de desarollo.md`: auditoría, registro de hallazgos, respaldo, implementación acotada, pruebas, comparación, revisión final y documentación.
- No asumir que una función está operativa solo porque existe en el código o está marcada como completada en tareas.
- Distinguir entre revisión estática, prueba funcional y verificación de despliegue. No afirmar pruebas o despliegues que no se hayan ejecutado.
- Los hallazgos fuera del alcance deben documentarse como tareas separadas. Los cambios deben limitarse a lo solicitado.

## Tarea pendiente: historial de imágenes reemplazadas
- Investigar por qué la opción de consultar y gestionar las imágenes reemplazadas no aparece o no es accesible desde la interfaz.
- En la fase diagnóstica, no modificar código. Revisar visibilidad del acceso, rol/permisos, apertura del modal, eventos, llamadas al endpoint, respuestas del servicio y errores de carga.
- Diferenciar una opción oculta por permisos, una opción no conectada, un error de petición, una respuesta vacía y una diferencia entre código y despliegue.
- Registrar las evidencias en `Auditoría.txt` y crear o actualizar la tarea correspondiente en `Tareas.txt`.
- Tras la auditoría y cuando proceda la implementación, crear una rama nueva para el código y preparar un Pull Request hacia la rama base indicada.
