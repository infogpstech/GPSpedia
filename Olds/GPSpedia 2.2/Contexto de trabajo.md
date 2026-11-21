# Reglas de contexto de trabajo para GPSpedia

Consultar este archivo y `Proceso de desarollo.md` al comenzar cada tarea.

## Repositorio y ramas
- Trabajar únicamente en `infogpstech/GPSpedia` y en el flujo asociado a `fix/pys-carousel-card-sizing-print-images`.
- No modificar otras ramas ni otros repositorios.
- Para cada tarea que requiera cambios de código, crear una rama nueva basada en `fix/pys-carousel-card-sizing-print-images`. No cambiar código directamente en la rama base.
- Al terminar una tarea de código, preparar un Pull Request hacia `fix/pys-carousel-card-sizing-print-images`; no hacer merge sin revisar primero el resultado con el usuario.
- Cuando corresponda, revisar el resultado desplegando la rama de trabajo en GitHub Pages antes de decidir si se hace merge.

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
