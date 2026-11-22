# Auditoría A07-04 — registro idempotente en Imagenes_Reemplazadas

Fecha: 2026-11-22  
Repositorio: infogpstech/GPSpedia  
Rama: GPSpedia2.2.5_work  
HEAD de implementación: 66c35468cff047e3f9d8caa89fccad8ed731bcc7

## Objetivo

Automatizar el registro de imágenes candidatas y reemplazos en Imagenes_Reemplazadas sin duplicar filas, reescribir historial, sustituir estados manuales ni alterar referencias activas.

## Hallazgos

1. La lectura ADMIN de imágenes ya solicita a CATALOG candidatos e información del ledger AportesVehiculo. La sincronización asigna un ID determinista CAND-{eventId}, por lo que el replay puede identificar la misma fila.
2. La búsqueda previa por id_reemplazo conservaba silenciosamente la primera fila cuando existían IDs duplicados. Además, una fila existente con el mismo ID pero identidad distinta podía recibir una transición de estado sin comprobar que correspondiera al mismo evento, archivo y vehículo.
3. La sincronización solo actualizaba automáticamente el estado requiere_revision, pero no informaba los conflictos de identidad omitidos al consumidor.
4. El reemplazo de imágenes desde la carga ADMIN ya usa el operationId de la operación. En la restauración histórica, la imagen activa desplazada se registraba sin operationId; un reintento después de una compensación podía crear otra fila.
5. recordReplacedImage permitía cambiar sustituida_por_url en una fila cancelada o cuando el destino anterior ya no estaba disponible, aunque el operationId ya identificara una sustitución previa. Eso podía reescribir el historial.

## Cambios implementados

### Sincronización automática CATALOG → ADMIN

- Se detectan todos los id_reemplazo duplicados. Si un ID está repetido, no se elige una fila arbitraria ni se modifica ninguna coincidencia.
- Para reutilizar una fila existente se comprueba la identidad completa: tipo de contenido, vehicleId, campo, Drive ID, URL original, origen_registro, tipo_registro, ultima_auditoria_id y ultima_operacion_inventario_id.
- Si la identidad no coincide, se omite la fila, se conserva su contenido y se añade un error a la respuesta de sincronización.
- El handler getReplacedImages presenta una advertencia cuando la sincronización omite registros por conflictos.
- Un replay con la misma identidad no anexa otra fila ni vuelve a escribir los mismos datos.
- La resolución automática solo cambia la columna estado cuando el estado actual sigue siendo requiere_revision. No reescribe URL, referencia_texto, metadatos, ubicación ni estados manuales.
- La sincronización trabaja sobre Imagenes_Reemplazadas; no escribe en Cortes ni cambia las referencias activas.

### Historial de reemplazos y restauraciones

- Se genera un operationId determinista para la imagen activa desplazada durante una restauración, usando SHA-256 sobre el registro histórico, vehículo, campo e imagen activa.
- El reintento con la misma identidad reutiliza la fila creada anteriormente, en vez de generar otro REP-UUID.
- Si un operationId ya existe con otra URL de sustitución, se rechaza la operación. Ya no se actualiza sustituida_por_url ni referencia_texto para reutilizar una fila histórica cancelada.
- El replay del mismo destino puede recuperar una fila cancelada y cambiar únicamente su estado a historica mediante el helper con lectura posterior verificada.

## Validación ejecutada

- AdminCandidateImageInventoryCatalogSource: 7/7 PASS. Incluye origen CATALOG, compatibilidad legacy, creación, replay sin duplicado, transición automática, preservación de estado manual, IDs duplicados, identidad incompatible y ausencia de escrituras a Cortes.
- AdminImageReplacementCompensation: 11/11 PASS. Incluye operationId determinista de restauración, rechazo de cambio de destino para el mismo operationId y recuperación del mismo destino cancelado.
- AdminReplacedImagesIntegrity: 56/56 PASS.
- Parsing/sintaxis de JS/Services/admin.js: PASS.
- CI del commit 66c35468cff047e3f9d8caa89fccad8ed731bcc7: 303 suites, 3,561 pruebas aprobadas, 0 fallos.
- Health read-only: 7/7 SUCCESS.
- GitHub Pages build/deployment: SUCCESS.

## Validación diferida a Beta

No se desplegaron proyectos Apps Script ni se escribieron datos reales de Drive o Spreadsheet. Quedan pendientes en un entorno Beta aislado:

1. Ejecutar getReplacedImages contra CATALOG/Spreadsheet de prueba y repetir la lectura para verificar que no se creen filas duplicadas.
2. Probar eventos de resolución, retractación y replays con el mismo eventId/opId.
3. Confirmar que IDs duplicados e identidades incompatibles producen advertencias y no modifican filas.
4. Verificar que estados manuales, ubicaciones y referencias activas permanecen intactos.
5. Simular una restauración fallida, reintentar con la misma imagen activa y comprobar que se reutiliza la fila; intentar un destino distinto con el mismo operationId y comprobar el rechazo.

## Conclusión

A07-04 queda **COMPLETADA CON VALIDACIÓN DIFERIDA**: las pruebas locales/CI pertinentes aprobaron y las protecciones de idempotencia e integridad están implementadas. La integración real con CATALOG, Drive y Spreadsheet permanece pendiente de Beta aislada; no bloquea el cierre local.

Siguiente tarea: A07-05 — salida y progreso del escáner en la consola global del panel Desarrollador.
