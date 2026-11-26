# GP-ADMIN-DRIVE-UNUSED-IMAGES-02 — Auditoría e inventario visual individual de imágenes sin uso

## Requisitos confirmados por el propietario

- Auditar la carpeta raíz de cortes en Drive y detectar imágenes sin referencias activas en el catálogo.
- La auditoría excluye de la detección de referencias las hojas operativas/reacciones/eventos (incluyendo Feedback); las hojas de catálogo relevantes son Cortes, Tutoriales, Diagramas de Relay, Problemas y soluciones. Debe revisarse el alcance exacto del scanner existente antes de cambiarlo.
- Para cada imagen individual identificada como sin uso, capturar: ID de imagen persistente, nombre original, tamaño, formato/MIME, directorio/carpeta y ubicación, URL pública/visualización, estado (sin uso detectado y estado de registro), y vehículo/modelo asociado más próximo.
- Asociar con vehículos usando nombre del archivo y estructura de carpetas, priorizando el directorio estructurado marca/modelo/versión/tipo de encendido/rango de años. Mostrar la asociación y su grado/criterio de coincidencia, sin inventar asociación si no hay evidencia.
- Registrar cada imagen por separado, de forma incremental y automática en la hoja de Google Sheets que comparte el inventario de imágenes reemplazadas del editor del modal de desarrollador. No depender de almacenamiento/caché local como fuente persistente. Reintentos deben ser idempotentes y el estado visible debe corresponder a la persistencia verificada.
- En el recorrido de auditoría, mostrar miniatura por imagen, metadatos y vehículo sugerido; indicar claramente registrado, pendiente o error, con reintento por elemento. No esconder fallos detrás de una advertencia general ni marcar elementos erróneos como persistidos.
- Biblioteca unificada del modal desarrollador: imágenes históricas reemplazadas y las detectadas sin uso, vista cuadrícula/lista con miniaturas y datos. Acciones: recuperar/reincorporar al catálogo, mover a carpeta y eliminar. Las acciones requieren validaciones, confirmación y revalidación server-side, preservando permisos y registros históricos.
- La acción «Auditar cortes» no abre otro modal: transforma la sección de contenido actual en una interfaz de exploración tipo Google Drive, con miniaturas, metadatos, estado individual de persistencia y vehículo relacionado, actualizada progresivamente mientras avanza el escaneo.
- La consola del panel desarrollador debe permanecer accesible y visible durante toda la auditoría, sin overlays ni modales que la bloqueen. Todos los mensajes de progreso, alertas y resultados técnicos de la auditoría se envían a la consola. La consola ocupará aproximadamente el 50 % del ancho disponible del modal; la vista de archivos utilizará el espacio restante. La distribución debe adaptarse a escritorio y móvil sin ocultar ni bloquear ninguno de los dos paneles.
- La vista de biblioteca y los resultados de auditoría deben compartir un lenguaje visual de gestor de archivos: navegación/ubicación de carpetas, cuadrícula o lista, miniaturas y metadatos consistentes.
- El escáner de referencias debe limitarse a las hojas de catálogo definidas; excluir hojas de registros, eventos, reacciones y demás datos de actividad para que la mera presencia de URL allí no convierta la imagen en «en uso».
- No cambiar permisos/RBAC, auth, servicios ajenos ni deployment. No realizar operaciones remotas mutables ni publicar Apps Script sin autorización.

## Plan de ejecución

1. **Auditoría de fuente y normativa**: revisar completa la normativa vigente, tarea técnica previa, código de ADMIN (scanner, auditoría, inventario, asociación, biblioteca, handlers), UI y schema de Sheets. Documentar referencias/hojas válidas, fallos y dependencias; no editar durante este paso.
2. **Contratos de referencia y asociación**: validar el conjunto de hojas de catálogo que define uso y algoritmo de relación con vehículo mediante nombres y árbol de carpetas; definir fallback/ambiguo.
3. **Registro individual incremental**: persistencia verificada por imagen con ID estable, idempotencia, revalidación de referencias y metadatos, resultado de escritura por elemento, reanudación y reconciliación segura.
4. **Presentación de auditoría**: vista en cuadrícula/lista, miniaturas, metadatos, asociación, estados de persistencia y reintento individual/por fallidos; sin caché como fuente autoritativa.
5. **Biblioteca unificada**: unificar registros de imágenes reemplazadas y sin uso; vistas grid/list; acciones de restaurar, mover y eliminar con salvaguardas.
6. **Verificación**: pruebas efímeras/simuladas de scanner, exclusión de hojas, asociación, registro por archivo, fallos parciales, retry/idempotencia, UI estados y acciones; code review de cambios y comparación contra respaldos. Eliminar respaldos y artefactos temporales tras revisión.
7. **Interfaz y botones internos (tarea adicional GP-ADMIN-TAB-ACTIONS-UX-01)**: reorganizar exclusivamente los botones de acción dentro del contenido de cada pestaña del panel desarrollador (no los botones de la barra de pestañas). Aplicar iconografía coherente, jerarquía visual elegante y comportamiento responsive. Los botones se presentan inicialmente en formato compacto con icono; al seleccionarse se expanden para mostrar su etiqueta. Validar escritorio y móvil, accesibilidad, estados activo/deshabilitado y que las acciones existentes conserven sus handlers.
8. **Documentación/cierre**: registrar hallazgos y cambios en auditoría, changelog, backlog y checkpoint; marcar cada criterio con evidencia y separar simulación de validación real.

## Tareas relacionadas
- **GP-ADMIN-DRIVE-UNUSED-IMAGES-02** — auditoría incremental, inventario persistente y biblioteca unificada.
- **GP-ADMIN-TAB-ACTIONS-UX-01** — reorganización responsive e iconográfica de los botones internos de las pestañas del panel desarrollador.

## Estado
- Requisitos funcionales y de UX registrados.
- Ejecución de código pendiente de auditoría completa de fuente y normativa; no declarar completado ni validar Drive/Sheets real hasta contar con evidencia.


## Estado de ejecución actualizado — 2026-11-26

| Paso | Estado local | Evidencia / pendiente real |
|---|---|---|
| 1. Auditoría de fuente y normativa | Completado para el alcance actual | Normativa y fuentes revisadas; continuar actualizando la auditoría si aparecen nuevas rutas. |
| 2. Contratos de referencia y asociación | Implementado y probado con fixtures | Allowlist física actual: Cortes, Tutorial (col. 3, Imagen), Relay (col. 10, imagen), pys (col. 7, Imagen); ocho columnas de imagen en Cortes. La asociación ya usa versión, encendido y años y se calcula durante cada lote. La equivalencia de nombres físicos con las etiquetas funcionales del requisito debe confirmarse con la hoja real en Beta. |
| 3. Registro individual incremental | Implementado; pruebas aisladas PASS | Lotes de 20, confirmación individual, reintentos idempotentes, consolidación solo tras confirmación total y guarda compartida para mutaciones de biblioteca. Falta concurrencia real en Apps Script. |
| 4. Presentación de auditoría | Implementación local completada; revisión visual pendiente | Explorador en la misma sección, resultados progresivos, miniaturas, metadatos, asociación/confianza/criterios, estados y reintento individual; consola y explorador comparten workspace de dos columnas. Sin prueba de navegador real. |
| 5. Biblioteca unificada | Base implementada y salvaguardas revisadas | Grid/list, historial y sin uso, selección/acciones masivas; restauración mixta habilitada; rutas backend protegidas por guarda común. Pruebas de integración remota pendientes. |
| 6. Verificación | Parcial, con harnesses aislados | PASS de allowlist, asociación, lotes, parcialidad, reintento, capacidades y operaciones. No se ejecutó suite completa ni navegador/Drive/Spreadsheet real. |
| 7. Botones internos | Implementación local completada | `GP-ADMIN-TAB-ACTIONS-UX-01` cerrada en implementación; revisión visual de escritorio/móvil para Beta. |
| 8. Documentación/cierre | En curso | Tareas, auditoría, changelog y checkpoint se actualizan en cada avance. La tarea principal permanece abierta hasta completar la revisión local restante. |

### Próxima secuencia de implementación
1. Terminar pruebas aisladas de persistencia por ID, idempotencia y recuperación de estado después de recarga; comprobar que el estado de cada tarjeta nunca se derive de IndexedDB como fuente autoritativa.
2. Revisar contratos y errores de la biblioteca unificada, incluyendo fallos parciales de operaciones masivas y sincronización de candidatos.
3. Revisar el flujo de reconciliación/organización y rollback con fixtures, sin mutar Drive real.
4. Hacer revisión estática final de cambios, comparación contra rama base y registros. Las publicaciones de Apps Script y pruebas Beta se excluyen de los pendientes de implementación y se reservan para esa fase.
