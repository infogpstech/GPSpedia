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
