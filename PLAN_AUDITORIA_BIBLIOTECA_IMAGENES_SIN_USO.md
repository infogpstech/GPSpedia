# GP-ADMIN-DRIVE-UNUSED-IMAGES-02 — Auditoría e inventario visual individual de imágenes sin uso

## Requisitos confirmados por el propietario

- Auditar la carpeta raíz de cortes en Drive y detectar imágenes sin referencias activas en el catálogo.
- La auditoría excluye de la detección de referencias las hojas operativas/reacciones/eventos (incluyendo Feedback); las hojas de catálogo relevantes son Cortes, Tutoriales, Diagramas de Relay, Problemas y soluciones. Debe revisarse el alcance exacto del scanner existente antes de cambiarlo.
- Para cada imagen individual identificada como sin uso, capturar: ID de imagen persistente, nombre original, tamaño, formato/MIME, directorio/carpeta y ubicación, URL pública/visualización, estado (sin uso detectado y estado de registro), y vehículo/modelo asociado más próximo.
- Asociar con vehículos usando nombre del archivo y estructura de carpetas, priorizando el directorio estructurado marca/modelo/versión/tipo de encendido/rango de años. Mostrar la asociación y su grado/criterio de coincidencia, sin inventar asociación si no hay evidencia.
- Registrar cada imagen por separado, de forma incremental y automática en la hoja de Google Sheets que comparte el inventario de imágenes reemplazadas del editor del modal de desarrollador. No depender de almacenamiento/caché local como fuente persistente. Reintentos deben ser idempotentes y el estado visible debe corresponder a la persistencia verificada.
- En el recorrido de auditoría, mostrar miniatura por imagen, metadatos y vehículo sugerido; indicar claramente registrado, pendiente o error, con reintento por elemento. No esconder fallos detrás de una advertencia general ni marcar elementos erróneos como persistidos.
- Biblioteca unificada del modal desarrollador: imágenes históricas reemplazadas y las detectadas sin uso, vista cuadrícula/lista con miniaturas y datos. Acciones: recuperar/reincorporar al catálogo, mover a carpeta y eliminar. Las acciones requieren validaciones, confirmación y revalidación server-side, preservando permisos y registros históricos.
- El escáner de referencias debe limitarse a las hojas de catálogo definidas; excluir hojas de registros, eventos, reacciones y demás datos de actividad para que la mera presencia de URL allí no convierta la imagen en «en uso».
- No cambiar permisos/RBAC, auth, servicios ajenos ni deployment. No realizar operaciones remotas mutables ni publicar Apps Script sin autorización.

## Plan de ejecución

1. **Auditoría de fuente y normativa**: revisar completa la normativa vigente, tarea técnica previa, código de ADMIN (scanner, auditoría, inventario, asociación, biblioteca, handlers), UI y schema de Sheets. Documentar referencias/hojas válidas, fallos y dependencias; no editar durante este paso.
2. **Contratos de referencia y asociación**: validar el conjunto de hojas de catálogo que define uso y algoritmo de relación con vehículo mediante nombres y árbol de carpetas; definir fallback/ambiguo.
3. **Registro individual incremental**: persistencia verificada por imagen con ID estable, idempotencia, revalidación de referencias y metadatos, resultado de escritura por elemento, reanudación y reconciliación segura.
4. **Presentación de auditoría**: vista en cuadrícula/lista, miniaturas, metadatos, asociación, estados de persistencia y reintento individual/por fallidos; sin caché como fuente autoritativa.
5. **Biblioteca unificada**: unificar registros de imágenes reemplazadas y sin uso; vistas grid/list; acciones de restaurar, mover y eliminar con salvaguardas.
6. **Verificación**: pruebas efímeras/simuladas de scanner, exclusión de hojas, asociación, registro por archivo, fallos parciales, retry/idempotencia, UI estados y acciones; code review de cambios y comparación contra respaldos. Eliminar respaldos y artefactos temporales tras revisión.
7. **Documentación/cierre**: registrar hallazgos y cambios en auditoría, changelog, backlog y checkpoint; marcar cada criterio con evidencia y separar simulación de validación real.

## Estado
- Requisitos recibidos y plan organizado.
- Ejecución de código pendiente de auditoría completa de fuente y normativa; no declarar completado ni validar Drive/Sheets real hasta contar con evidencia.
