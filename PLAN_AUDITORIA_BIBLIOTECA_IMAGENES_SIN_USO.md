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


## Corrección de asociación — 2026-11-27
- Implementación fuente aplicada a buildCortesImageModelAssociationSuggestions_ en ADMIN: jerarquía marca seguida de modelo como señal fuerte; filename corroborado por marca/modelo o alias como fallback; contexto de versiones, encendido y años filtrado sobre registros.
- Conflictos de contexto, IDs múltiples y candidatos próximos permanecen ambiguos. Alta confianza requiere match estructural.
- Diff revisado con backup temporal: prefix/suffix idénticos; edición localizada. La ejecución de pruebas y validación con Drive/Sheets real permanece pendiente. No hubo deployment ni mutaciones remotas.


## Verificación de integración (2026-11-27)
- Invariantes estáticos: 12 PASS; revisión de colector allowlist positiva (Cortes, Tutoriales, Relay, Problemas y Soluciones) e imágenes flotantes. Integración asociada a IDs sin uso detectado; revisión parcial de revalidación de guardado individual.
- Pruebas runtime/fixture real pendientes. No se cierra la tarea.


## Addendum — GP-ADMIN-DRIVE-UNUSED-IMAGES-03 (2026-11-27)

- Se amplía la allowlist física para incluir LogosMarca. El contrato actual de handleAddLogo() escribe la URL en la columna 3; validar encabezado ID, URL/imagen y ubicaciones. Si falta la hoja o la referencia no puede interpretarse, el escaneo no debe declarar archivos sin uso.
- El registro automático incremental se realiza por candidato emitido por ADMIN y revalidado en servidor. Errores aislados al leer otros archivos no deben bloquear candidatos íntegros; referencias no interpretables sí deben bloquearlos.
- Mantener separación de seguridad: persistencia individual permitida para candidatos íntegros, pero consolidación global, reconciliación y organización requieren auditoría completa sin errores.
- La UI debe permitir reintento individual cuando no existan referencias no interpretables, mostrar fase/código/detalle, reflejar estado parcial y permitir reiniciar con confirmación, limpiar solo el estado local del usuario y crear auditId nuevo. No borrar filas confirmadas ni archivos Drive.
- Contrato FindOrCreate existente: getOrCreateReplacedImagesSheet() y ensureReplacedImagesInventoryColumns(); no duplicar. Si el esquema base existente es incompatible, detenerse sin sobrescribir.
- Casos obligatorios para el próximo harness: (1) logo Drive ID en col. 3 => «En uso»; (2) logo por fórmula/hipervínculo/CellImage; (3) LogosMarca ausente o encabezado ID inválido => escaneo detenido sin falsos «Sin uso»; (4) error de metadatos de archivo A y candidato B íntegro => B se registra; (5) unverifiableReferenceCount > 0 => ningún registro nuevo; (6) errorCount > 0 => consolidación/organización siguen bloqueadas; (7) escritura individual duplicada/reintento => idempotencia y lectura de confirmación; (8) reinicio limpia IndexedDB y genera auditId nuevo sin borrar Imagenes_Reemplazadas.
- Estado al 2026-11-27: implementación fuente y verificación estática parcial PASS; runtime/mocks, navegador y Beta autorizada pendientes. No despliegue.


## Revisión aislada adicional — 2026-11-27 (GP-ADMIN-DRIVE-UNUSED-IMAGES-03)

| Comprobación | Resultado | Alcance |
|---|---:|---|
| LogosMarca: URL, fórmula, Rich Text, CellImage y enlace no interpretable | 5/5 PASS | Función real aislada con mocks de Range/Sheet |
| Esquema LogosMarca sin encabezado ID | 1/1 PASS | Rechazo fail-closed |
| Validador incremental | 3/3 PASS | Error aislado, referencia no interpretable e ID no emitido |
| Escritura/lectura posterior de inventario | 2/2 PASS | Función real con hoja simulada; incluye persistencia seguida de excepción |
| UI/CSS | 6/6 PASS | Inspección estática; no equivale a prueba visual |

Pendiente: simulación integrada de archivo A fallido/archivo B verificable dentro del handler, ejecución IndexedDB en navegador, revisión visual escritorio/móvil y revisión final contra respaldos. No se ejecutó Apps Script, Drive/Spreadsheet real, POST ni deployment. No se reabre Beta ni se crean suites permanentes.


### Ampliación de cobertura aislada — 2026-11-27
- PASS 1/1: se ejecutó el bloque real de procesamiento por archivo de handleSaveUnusedImagesInventory con A fallido y B válido; el resultado individual de A no interrumpió la confirmación e inserción de B.
- PASS 1/1: clearDriveAuditState ejecutado con IndexedDB transaccional simulado; se eliminaron solo las claves de auditoría de la cuenta solicitante, se conservaron claves de otra cuenta y el inventario persistente, y se incrementó la generación local.
- Pendiente: prueba en navegador real y revisión visual escritorio/móvil. Las simulaciones no acreditan Apps Script/Drive/Spreadsheet productivo. No deployment ni reactivación de Beta.


### Revisión estática de diff — 2026-11-27
- Comparación GitHub desde b59bcdd123f10dd4ac82062120dd99fcfe373971 hasta c08c82236cc9543dc9cb1a990860663ea79bfc01: código funcional limitado a admin.js (+171/-32), ui.js (+45/-6) e index.html (+1).
- Parches de implementación inspeccionados. Respaldos exactos de los tres archivos verificados por SHA contra el baseline de la tarea. No se identificaron cambios funcionales ajenos al alcance.
- Revisión visual en navegador escritorio/móvil pendiente; no hay evidencia de UI real. No Apps Script/Drive/Sheets, POST ni deployment.


## GP-ADMIN-DRIVE-UNUSED-IMAGES-03 — reconciliación histórica y asociaciones (2026-11-27)

### Comportamiento implementado
- Al pulsar reiniciar, ADMIN recorre por páginas las filas de origen auditoria_drive antes de borrar el progreso local. Compara IDs con las referencias activas de Cortes, LogosMarca, Tutorial, Relay y PYS.
- Si existe referencia activa, el registro se marca en_uso con resultado_inventario=referencia_activa_catalogo y ubicaciones actuales. Si no existe referencia activa, queda no_confirmada_en_ultima_auditoria/pendiente_revalidacion hasta que el nuevo escaneo de Drive confirme el estado.
- Se conservan las filas. Los estados en_uso manuales no se sobrescriben. El marcador automático permite que una referencia que desaparezca en auditorías futuras vuelva a evaluarse.
- Las asociaciones históricas se recalculan con directorio, nombre, MIME y datos de Cortes; se actualizan estado/confianza/candidatos y se repara url_visualizacion derivada cuando falta.
- La consolidación final corre incluso si no hay candidatos nuevos sin uso. El guardado incremental automático por lote continúa activo.

### Evidencia aislada
| Caso | Resultado |
|---|---:|
| LogosMarca: ID de URL col. 3 entra al snapshot y clasifica En uso | 1/1 PASS |
| Preflight: activo, no referenciado y estado manual | 3/3 PASS |
| Asociación de modelo y reparación de URL visual faltante | 2/2 PASS |
| Idempotencia: repetir preflight no genera escrituras | 0 escrituras repetidas |
| Paginación con límite 1 sobre tres registros | 3/3 PASS |
| Referencias no interpretables / hoja Cortes ausente | 2/2 PASS fail-closed |
| Asociación por directorio sin nombre de archivo | 1/1 PASS |
| Consolidación con lista vacía: fila activa pasa a en_uso | 1/1 PASS |
| Consolidación con lista vacía: fila sin referencia pasa a no_confirmada | 1/1 PASS |
| Parse ADMIN/UI y controles de orden del reset/consolidación | 11/11 PASS |

### Pendiente / límites
- Prueba de navegador e IndexedDB real, revisión visual escritorio/móvil y ejecución autorizada de Apps Script/Drive/Sheets en Beta. Las pruebas realizadas usan mocks en memoria y no prueban persistencia remota.
- No se borran filas de Imagenes_Reemplazadas ni archivos Drive. No POST ni deployment. Beta sigue cerrada.


### Ajustes finales — 2026-11-27
- La asociación histórica queda diferenciada: sin_coincidencia si hay metadatos pero no hay candidato; no_verificada si faltan metadatos. En el segundo caso no se destruyen candidatos previos.
- La URL visual derivada se completa solo si falta; las URLs válidas se conservan.
- Los lotes incrementales capturan solo IDs de referencia; la consolidación final captura ubicaciones para actualizar las filas históricas sin aumentar memoria en cada lote.
- PASS adicional: cero candidatos con digest correcto (1/1), asociación sin coincidencia/no verificada (2/2), URL visual válida preservada (1/1).


## Revisión de continuidad y registro incremental — 2026-11-27

### Incidencias incorporadas
- La auditoría Drive debe registrar cada imagen individual sin uso en el inventario durante el recorrido, no limitarse a guardar un aviso de registro pendiente.
- Las continuaciones con cursor de versión anterior fallan por una validación de `scanVersion`; debe diseñarse una recuperación segura que preserve resultados acumulados y evite reutilizar tokens incompatibles.
- Revisar el editor rich-text: la desactivación de negrita debe retirar el formato, sin producir un estilo visual más pesado.
- Revisar el flujo `add_cortes`: mensajes de éxito duplicados y transición de etapa, verificando que se ejecuten una sola vez tras confirmar el guardado.

### Ejecución y controles
- Implementar por separado y con cambios acotados, sin desplegar producción.
- Mantener idempotencia, deduplicación global, validación de referencias activas, protección de archivos históricos y guardado reanudable.
- Registrar evidencia de validación; no afirmar pruebas ejecutadas si no se ejecutaron.
- Rama objetivo: `GPSpedia2.2.5_work`; nunca modificar `main`.


### Implementaciones iniciales (2026-11-27)
- **Cursor desfasado:** el backend inicia un recorrido nuevo al detectar versión de cursor incompatible; no reutiliza iteradores antiguos ni modifica páginas previas.
- **Rich-text:** fallback para desactivar formato inline cuando el comando del navegador no lo retira, desenvuelve la etiqueta correspondiente en el fragmento seleccionado y recupera el punto de inserción.
- **add_cortes:** helper centralizado para mensaje y transición de éxito, con protección por ID de operación para evitar repetición de la notificación/transición por la misma operación.
- **Registro individual de imágenes:** sigue pendiente. El handler actual `handleSaveUnusedImagesInventory` procesa un lote incremental, pero el recorrido Drive aún no lo invoca por archivo detectado; requiere integración segura tras persistir metadatos de lote y páginas.


## 2026-11-27 — GP-ADMIN-DRIVE-AUDIT-REVIEW-04: verificación de integración incremental

- La revisión del HEAD actual confirma que el frontend `JS/Frontend/ui.js` ya invoca `saveUnusedImagesInventory` con `incremental:true` al procesar cada página de resultados, antes de continuar con el siguiente lote del recorrido; el resultado se valida por ID y estado individual y se persiste localmente.
- El servicio ADMIN persiste resultados de página y metadatos en Cache antes de responder; también actualiza el estado del servidor con pageCount y metadatos de auditoría para que el validador incremental pueda comprobar candidatos emitidos.
- La consolidación final separada continúa siendo necesaria para reconciliar registros históricos y ubicaciones. La doble pasada incremental/final es intencional: la primera registra durante el recorrido, la segunda reconcilia el conjunto completo.
- Se corrigió el estado documental: esta integración no está pendiente en el código actual; el pendiente de esta revisión es validar el ciclo completo en navegador y runtime Apps Script autorizado, incluyendo respuesta parcial/error y reintento idempotente.
- No se ejecutaron pruebas runtime ni navegador en esta revisión; no se desplegó ni se escribió en Drive/Sheets.


### GP-ADMIN-DRIVE-AUDIT-REVIEW-05 — Revisión estática de cambios previos
- Rich-text: la ruta fallback extrae el fragmento seleccionado y desenvuelve etiquetas matching en descendientes, conserva etiquetas de otros formatos y recoloca selección al final del fragmento. Riesgo que requiere prueba de navegador: selección mixta (parcialmente formateada o que cruza varios wrappers) cuando execCommand falla; la detección active depende del ancestro del punto inicial de selección.
- add_cortes: la transición central evita repetir mensaje y paso para un mismo opId dentro de la página; la guarda isSubmittingStage2 y recuperación pendiente siguen siendo controles adicionales. Requiere navegador para validar reintentos y retorno tras errores.
- No se hicieron cambios funcionales en esta revisión ni pruebas runtime; la cobertura de selección mixta y recovery real queda pendiente.


### GP-ADMIN-ADD-CORTES-ETAPA3-01 — corrección enfocada en avance de etapa (2026-11-27)
- El fallo reportado es que tras WRITE exitoso se mostraba «Corte agregado con éxito», pero el formulario permanecía en Etapa 2 en vez de mostrar Etapa 3 (información suplementaria: alimentación, apertura, nota y video).
- En `HTML/add_cortes.html`, `proceedToStage3()` ahora activa `showPhase(3)` al inicio, antes de actualizar controles y advertencias; los controles y contenedor de advertencias faltantes se manejan con guardas null.
- `finishConfirmedCutTransition_()` intenta completar la transición antes de mostrar el alert y no marca el opId como transicionado si la rutina falla. La alerta de éxito queda posterior al avance, evitando que un fallo de configuración auxiliar deje la Etapa 2 como destino.
- Se conserva el opId y el guardado/idempotencia de WRITE. Se registran errores de transición.
- Revisión estática del bloque: PASS (transición prioritaria y referencias opcionales protegidas). Prueba real de navegador/formulario pendiente; no se ejecutó Apps Script ni deployment.


## GP-ADMIN-DRIVE-REGISTRO-ERROR-02 — lectura posterior del inventario (2026-11-27)

### Implementación local
- Se identificó que writeDriveInventoryRowVerified_ comparaba todos los metadatos por String() y no informaba qué columna fallaba.
- Se añadió normalización específica de fecha_modificacion_drive cuando el valor leído es Date, formateándolo en GMT-6 como yyyy-MM-dd HH:mm:ss, igual al contrato usado por el escaneo Drive.
- La comparación ahora produce nombres de columnas discrepantes para identidad, auditoría, operación, resultado, estado, organización, ubicación y metadatos. Los valores no se incluyen en el mensaje.
- Se conservan la lectura posterior, el reintento, el estado requiere_revision y el bloqueo de organización cuando hay una discrepancia real.

### Evidencia
- Fecha Date equivalente al texto de auditoría: 1/1 PASS.
- Fecha distinta por un minuto: 1/1 PASS, rechazada y diagnosticada como fecha_modificacion_drive.
- tamano_bytes distinto: 1/1 PASS, rechazado y diagnosticado como tamano_bytes.
- Parse sintáctico admin.js completo: PASS. Diff contra backup: cambios confinados a writeDriveInventoryRowVerified_.

### Pendiente
- La hipótesis de coerción de fecha debe confirmarse en Apps Script/Google Sheets real; no se dispone de ejecución remota autorizada y Beta permanece cerrada. No se ha declarado corregida la persistencia real ni se ha desplegado.


### Code Review final — GP-ADMIN-DRIVE-REGISTRO-ERROR-02 (2026-11-27)
- PASS: diff limitado a writeDriveInventoryRowVerified_ en JS/Services/admin.js.
- PASS: normalización solo para Date en fecha_modificacion_drive; identidad, operación, estado y demás metadatos permanecen estrictos.
- PASS: reintento, reconciliación posterior y bloqueo de organización se conservan.
- PASS: backup exacto verificado y eliminado tras revisión.
- Pendiente: confirmar comportamiento en la hoja real. La corrección no está desplegada y no se ha realizado una escritura remota de prueba.
