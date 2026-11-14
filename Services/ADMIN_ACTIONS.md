# Acciones administrativas internas de Spreadsheet

## Alcance y clasificación

`createSheet` y `addColumn` son acciones soportadas del servicio ADMIN para mantenimiento interno/manual de la estructura de Spreadsheet. No son funciones de interfaz pública: la revisión del código versionado no encontró llamadas desde `JS/Frontend/ui.js`, `index.html`, `HTML/users.html` ni `HTML/add_cortes.html`.

Ambas acciones ya tienen ruta canónica en `ACTION_TO_SERVICE_MAP` hacia ADMIN y casos en el dispatcher de `Services/admin.js`. No pertenecen a `SERVICE_COMPATIBILITY_ACTIONS`. No se agrega una segunda ruta ni controles de interfaz.

No es posible enumerar desde este repositorio scripts, integraciones o consumidores externos no versionados. Por compatibilidad y ausencia de evidencia suficiente, las acciones se conservan; su retirada requiere una tarea posterior con inventario de consumidores y autorización explícita.

## Autorización y coordinación

- `doPostInternal_` exige sesión activa de rol Desarrollador antes de despachar ambas acciones. El rol/actor se deriva de la sesión del servidor; no se confía en un rol suministrado por el cliente.
- Ambas acciones están en `isSharedMutationAction_`: el wrapper `doPost` solicita la lease compartida ADMIN antes de ejecutar el handler.
- Ambas acciones generan auditoría persistente ADMIN STARTED/finalizada bajo AUG-021.
- No existe un endpoint de lectura o bypass alternativo para estas operaciones.

## Contratos

### `createSheet`

Solicitud mediante `routeAction('createSheet', payload)`:

- `sheetName` (string, requerido): nombre de hoja de 1–100 caracteres; se recortan espacios exteriores y se rechazan caracteres reservados de Google Sheets y controles.
- `headers` (string[], opcional): encabezados en orden; cada elemento debe ser texto de hasta 100 caracteres sin caracteres de control.
- `idFormula` (string, opcional): fórmula iniciada por `=`, hasta 500 caracteres y sin controles. Solo se aplica en A2 cuando se suministran encabezados.
- Rechaza una hoja con el mismo nombre antes de crear otra.

Respuesta exitosa: `{ status: 'success', message: string }`. La hoja se crea en el Spreadsheet configurado por ADMIN.

### `addColumn`

Solicitud mediante `routeAction('addColumn', payload)`:

- `sheetName` (string, requerido): nombre validado con las mismas reglas de `createSheet`.
- `columnName` (string, requerido): nombre de columna de 1–100 caracteres, sin controles; se recortan espacios exteriores.
- La hoja debe existir. La columna se escribe en la primera posición posterior a `getLastColumn()`.

Respuesta exitosa: `{ status: 'success', message: string, columnIndex: number }`.

Los errores de validación se rechazan antes de invocar las escrituras de Spreadsheet. Los fallos del servicio se devuelven como error ADMIN normal; no se crea una hoja alternativa ni se elimina contenido existente.

## Consumidores y mantenimiento

La ruta canónica existe, pero no hay consumidor frontend versionado ni evidencia en este repositorio de consumidor externo concreto. Se clasifican como API administrativa interna/manual, no como acciones retiradas ni como API pública documentada para usuarios finales. Cualquier cambio incompatible debe inventariar primero consumidores externos y coordinar migración.


## Ciclo de vida del historial e inventario de imágenes (AUG-027)

Las acciones del gestor de imágenes se ejecutan únicamente desde ADMIN y requieren sesión vigente de rol Desarrollador. El rol se obtiene de la sesión validada por el servidor; los datos de rol enviados por el cliente no conceden autorización. Las mutaciones utilizan la lease compartida ADMIN y la auditoría persistente de operaciones administrativas.

### Acciones

- `deleteReplacedImage`: envía a la papelera un registro histórico o de inventario válido sin referencias activas. También permite resolver manualmente un registro `requiere_revision` si su ID, archivo, MIME, ubicación y ausencia de referencias se pueden verificar. Guarda `estado_previo_papelera` antes de cambiar el estado a `en_papelera`.
- `restoreReplacedImageFromTrash`: restaura el archivo desde la papelera de Drive a su ubicación conservada. Admite `en_papelera` y `requiere_revision` cuando Drive confirma que el archivo está en papelera. Recupera el estado guardado en `estado_previo_papelera`. No vuelve a escribir una URL en Cortes ni en otra hoja; la restauración del archivo y la restauración de una referencia histórica son operaciones distintas.
- `permanentlyDeleteReplacedImage`: acepta `en_papelera`, `eliminacion_pendiente` o `requiere_revision`; para este último, Drive debe confirmar que el archivo está realmente en papelera. Comprueba referencias globales y referencias no interpretables, MIME, estado de papelera y pertenencia al árbol Cortes. Ejecuta DELETE mediante Drive API v3 y verifica con GET posterior que Drive devuelva 404 antes de marcar `eliminada`.

### Estados y recuperación

- `estado_previo_papelera` conserva el estado anterior a enviar el archivo a papelera; se añade como encabezado dinámico migrable, sin alterar el orden de las columnas base.
- `eliminacion_pendiente` es un estado de dos fases: se registra antes de la eliminación definitiva. Si la respuesta de Drive se pierde o la verificación no puede completarse, un reintento consulta Drive y puede reconciliar el registro sin repetir una eliminación ya confirmada.
- `eliminada` se registra solo después de comprobar que el archivo ya no existe. Repetir una operación completada devuelve un resultado sin cambios.
- Si falla una actualización de historial después de una operación de Drive, se intenta compensar. Si la compensación tampoco se puede confirmar, el registro queda en `requiere_revision` cuando la escritura de estado está disponible; no se informa éxito.
- Las filas estructuralmente inválidas, con identidad ambigua, ID duplicado o archivo fuera del árbol autorizado siguen sin acciones. No se debe adivinar la identidad del archivo.

### Referencias y límites

- Las operaciones destructivas usan `collectActiveDriveReferences()`, que inspecciona valores, fórmulas, RichText, objetos `CellImage` y objetos de imagen sobre cuadrícula de las hojas funcionales del Spreadsheet. Cuando una imagen incrustada no expone un ID verificable, se contabiliza como referencia no interpretable y se bloquean las operaciones destructivas.
- La restauración desde papelera solo restaura el archivo; no modifica celdas ni reasigna referencias.
- La eliminación definitiva usa `UrlFetchApp` con el token OAuth del proyecto y Drive API v3. El proyecto Apps Script debe contar con autorización efectiva para eliminar archivos. Los permisos, scopes y comportamiento real de Drive/Spreadsheet se verificarán en un deployment Beta aislado; no se debe probar contra datos productivos.


## Auditoría completa e inventario por operación (AUG-028)

- `auditDriveImagesInCortes` emite un `auditId` y mantiene en ScriptProperties el propietario autenticado, estado, posición esperada y huella del cursor. La continuación exige el cursor emitido por ADMIN, una pila no vacía, contadores coherentes y carpetas dentro del árbol Cortes.
- Los lotes conservan sus IDs de imágenes sin uso en CacheService. ADMIN emite el estado `complete` solo después de comprobar todas las páginas y calcular el resumen exacto de IDs únicos. El guardado exige ese estado y que la lista recibida coincida con el resumen; una lista parcial o alterada no puede marcar registros ausentes.
- `saveUnusedImagesInventory` genera un `inventoryOperationId` independiente. Las filas confirmadas conservan `ultima_auditoria_id`, `ultima_operacion_inventario_id`, `resultado_inventario` y `detalle_resultado_inventario`. Los bloqueos y errores por archivo se registran en ActividadUsuario con ambos identificadores.
- La validación es individual: referencias nuevas, referencias no interpretables, estados históricos no resueltos, IDs ambiguos y duplicados por Drive ID bloquean el archivo afectado sin cancelar el resto del lote. El inventario no sobrescribe `en_uso`, `requiere_revision`, `en_papelera` ni `eliminacion_pendiente`.
- Las escrituras por fila se verifican por lectura posterior y se reintentan una vez. Si una escritura parcial no puede reconciliarse y la identidad sigue verificable, el registro queda en `requiere_revision`; el organizador exige coincidencia de auditId, inventoryOperationId y resultado `confirmado`.
- Los estados de auditoría expiran a las seis horas; los cursores vencidos requieren un nuevo escaneo. No se ejecutan operaciones sobre Spreadsheet/Drive productivos. La integración real de CacheService, PropertiesService, permisos y concurrencia permanece diferida a Beta aislada.
