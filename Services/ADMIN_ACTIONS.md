# Acciones administrativas internas de Spreadsheet

## Alcance y clasificación

`createSheet` y `addColumn` son acciones soportadas del servicio ADMIN para mantenimiento interno/manual de la estructura de Spreadsheet. No son funciones de interfaz pública: la revisión del código versionado no encontró llamadas desde `ui.js`, `index.html`, `users.html` ni `add_cortes.html`.

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
