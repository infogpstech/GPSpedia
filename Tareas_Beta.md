# GPSpedia — Tareas de validación Beta

Fecha de inicio: 2026-11-22
Repositorio: `infogpstech/GPSpedia`
Rama de trabajo: `GPSpedia2.2.5_work`
Rama base: `GPSpedia2.2.5`
HEAD de referencia: `f8df2c91f8408c311d47ec7c67091cf482cf5cb4`
Alcance: pruebas Beta y registro de hallazgos. No realizar correcciones de código durante esta etapa.

## 0. Sincronización segura obligatoria

Ejecutar antes de cualquier prueba Beta. Ajustar únicamente la ruta local:

```bash
cd /ruta/local/GPSpedia || exit 1
test "$(git remote get-url origin)" = "https://github.com/infogpstech/GPSpedia.git" || exit 1
test "$(git branch --show-current)" = "GPSpedia2.2.5_work" || exit 1
test -z "$(git status --porcelain)" || { echo "Árbol con cambios locales; detener"; exit 1; }
git fetch origin GPSpedia2.2.5_work &&
git pull --ff-only origin GPSpedia2.2.5_work &&
git rev-parse --abbrev-ref HEAD &&
git rev-parse HEAD
```

No usar `reset --hard`, `clean`, force push ni comandos que descarten cambios locales.

## 1. Condiciones de ejecución
- Usar exclusivamente deployments Apps Script, Spreadsheet, Drive, cuentas y datos de prueba aislados.
- No usar recursos productivos ni registrar secretos, tokens, IDs personales, mensajes, VIN, URLs privadas o contenido de archivos.
- Registrar commit exacto, servicio, operación, rol, dispositivo/navegador, resultado y evidencia anonimizada.
- No modificar código durante esta etapa. Registrar los defectos en `Hallazgos_Beta.md`.
- No ejecutar escrituras/destructivas sin recursos desechables, cuenta autorizada, previsualización y plan de recuperación.
- Si una medición no está disponible, indicar `NO MEDIDA`; no estimarla.

## 2. Matriz de validación

### BETA-01 — AUTH / USERS y aislamiento
- Login, validación/renovación de sesión con roles distintos.
- Cambio de perfil/rol, logout, revocación y eliminación de cuenta de prueba.
- Separación de aportes/mensajes entre usuarios.
- Expiración/eviction de caché y rechazo de sesiones revocadas.

### BETA-02 — CATALOG y navegación
- Carga con caché fría/caliente, snapshot local, cursor incremental y deltas.
- Reset y recuperación por snapshot completo.
- Búsqueda, detalle, regreso y cambios concurrentes controlados.
- Requests, bytes, render, hit/miss y consistencia.

### BETA-03 — WRITE / aportes y concurrencia
- Altas/ediciones de prueba, aportes suplementarios e imágenes.
- Reintentos con el mismo operationId y recuperación tras respuesta perdida.
- Append concurrente, read-back, journals y consistencia Spreadsheet/Drive.
- No duplicación ni pérdida tras fallos parciales.

### BETA-04 — FEEDBACK / PyS / Tutoriales / Inbox
- Reportes, sugerencias, likes, tutoriales y operaciones PyS.
- Inbox: listar, enviar, marcar leído y archivar.
- Reintentos, idempotencia, publicación de deltas y recuperación.
- Aislamiento por rol y usuario.

### BETA-05 — ADMIN y mantenimiento
- Panel Developer, telemetría y health individual/global.
- Inventario de imágenes, escaneo Drive y operaciones sobre recursos de prueba.
- Separar consultas read-only de acciones mutables.
- Permisos, confirmaciones, read-back y rollback.

### BETA-06 — Imágenes, logos y cola multimedia
- Corpus sintético/autorizado; PNG alfa, JPEG, orientación, MIME y firma.
- Variantes 300/800/1600 y legibilidad de diagramas.
- Caché, CORS, primera pintura, cola visible/precargas, cancelación y errores.
- Inventario read-only de logos; no imponer límites durante el inventario.

### BETA-07 — Vídeos / YouTube
- Canal y OAuth de prueba autorizados.
- Carga resumable en bloques de 8 MiB, checkpoints, pausa, reanudación y cancelación.
- Respuesta perdida, sesión expirada, aprobación/rechazo e idempotencia.
- Confirmar estado remoto y permisos; los dobles locales no sustituyen esta prueba.

### BETA-08 — Interfaz y compatibilidad
- Android/PWA y escritorio.
- Modales, bandeja, formularios, Tutorial/Relay, navegación, modo oscuro y overflow.
- Caché fría/caliente, primera pintura e interacción.
- Registrar dispositivo, navegador, resolución y evidencia anonimizada.

## 3. Estado inicial
Todos los bloques están **PENDIENTES** de ejecución Beta real. La CI y las pruebas locales anteriores no sustituyen las pruebas remotas con Apps Script, Spreadsheet, Drive, OAuth o YouTube.


## 4. Validación Beta diferida — MIG-012 AUTH/USERS
- Desplegar AUTH en entorno aislado y confirmar que el endpoint real responde con el contrato esperado.
- Verificar login, sesiones, roles jerárquicos, altas, actualización de perfil y bajas usando hojas de prueba Users/ActiveSessions.
- Confirmar que las acciones getUsers/createUser/updateProfile funcionan desde el frontend y que no existen consumidores externos del deployment USERS.
- Revisar permisos Apps Script/Spreadsheet y ausencia de efectos sobre datos productivos.
- Solo tras aprobar lo anterior, deshabilitar el deployment heredado USERS y retirar su fila del registro central. La fila histórica se ignora actualmente por el lector central; no se debe borrar antes del cutover.


## 5. Validación Beta diferida — MIG-013 sesiones locales
- Desplegar AUTH y los servicios consumidores en entorno aislado, sin alterar endpoints productivos.
- Probar login correcto/incorrecto, hash actual, bloqueo después de cinco intentos y token opaco registrado en ActiveSessions.
- Verificar desde cada servicio protegido el primer acceso con caché fría y los accesos siguientes con caché caliente.
- Probar token desconocido, revocado, duplicado y expirado; userId no coincidente; usuario eliminado/desactivado; rol cambiado y revocación pendiente.
- Confirmar permisos RBAC por servicio y que un rol/userId enviado desde el navegador no altera el actor autorizado.
- Verificar logout, cambio de rol, reset de sesiones y eliminación de cuenta con invalidación entre servicios, junto con los casos de indisponibilidad y reintento definidos en MIG-014.
- Confirmar permisos efectivos Apps Script/Spreadsheet y ausencia de efectos en datos productivos. No considerar las pruebas simuladas o CI como sustituto de esta validación.


## 6.1 Validación Beta diferida — MIG-015 imágenes y recursos Drive
- Antes de cualquier prueba, ejecutar la secuencia de sincronización segura del apartado 0.
- Preparar una Spreadsheet y un Drive Beta aislados; vincular los proyectos ADMIN, WRITE y FEEDBACK a la Spreadsheet de prueba.
- Publicar una revisión central con la definición y recurso cortes_root_folder_id según ESQUEMA_CONFIGURACION_CENTRAL.md; el ID debe corresponder a la carpeta Cortes Beta y su padre esperado a la raíz Drive Beta.
- Confirmar que las tres aplicaciones leen el recurso central y rechazan una referencia ausente, vencida, deshabilitada, de tipo incorrecto o con jerarquía discordante. No configurar IDs de Drive/Spreadsheet en el código ni ScriptProperties.
- Probar aportes nuevos con imagen de vehículo/corte, apertura y alimentación; verificar archivo, MIME, tamaño, SHA-256, ImageUploadEvents, ledger, vínculo a AportesVehiculo y proyección CATALOG.
- Probar reemplazo ADMIN con la misma opId tras respuesta perdida; comprobar read-back, compare-and-set de versión, no duplicación y reconciliación de estados pending/linked/requires_review.
- Probar adjuntos de reportes, sugerencias y PyS; confirmar permisos heredados privados, referencia en hoja, limpieza compensatoria y recuperación tras fallo parcial.
- Probar variantes 300/800/1600, PNG con transparencia, calidad de diagramas, IndexedDB, ObjectURL y Lightbox en Android/PWA y escritorio.
- Probar inventario, imagen reemplazada, marcar en uso, mover, papelera, restaurar y eliminación definitiva con recursos desechables; verificar propietario, padre, RBAC, read-back y rollback.
- Confirmar que Imagenes_Sin_Uso se localiza por nombre, que los duplicados se reportan sin mover archivos y que no se crea una segunda carpeta.
- No usar recursos productivos ni simular pruebas Beta con CI. Registrar commit, servicio, rol, dispositivo/navegador y evidencia anonimizada.


## 6.2 Validación Beta diferida — MIG-017 herramientas y operaciones Drive
- Ejecutar primero la secuencia de sincronización segura del apartado 0.
- Preparar una cuenta y unidad Drive Beta aisladas; configurar el recurso central `cortes_root_folder_id` para apuntar exclusivamente a la carpeta Cortes Beta. No usar archivos ni carpetas productivos.
- Probar `dir`, `cd`, `mkdir`, `tree` y `move`; confirmar que los listados muestran IDs y que el movimiento usa exactamente el ID de archivo y el ID de destino.
- Intentar mover un archivo dentro de Cortes Beta, hacia una carpeta externa, desde una ruta con ancestro externo y hacia una carpeta con ACL distinta/compartida. Confirmar rechazo seguro, propietario y permisos sin cambios y rollback verificable.
- Crear un respaldo con archivos y subcarpetas desechables; interrumpir un lote, reanudar usando el mismo backupId y comprobar manifiesto, cantidades, integridad y ausencia de duplicados.
- Restaurar un respaldo Beta; verificar staging, lectura posterior, comparación del manifiesto, rollback ante error y que la raíz original queda consistente.
- Ejecutar auditoría de imágenes y conciliación Drive ↔ Cortes; verificar duplicados, archivos huérfanos, referencias activas, rutas manuales y que no se mueven archivos automáticamente sin aprobación.
- Probar papelera, restauración, marcar en uso, movimiento y eliminación definitiva con archivos desechables. Confirmar que referencias activas bloquean acciones destructivas y que RBAC rechaza roles no autorizados.
- Consultar métricas de almacenamiento y probar alertas al alcanzar el umbral crítico; comprobar idempotencia de la alerta Inbox.
- Probar URLs de descarga solo para registros permitidos y sin referencias activas; confirmar que la papelera no permite descargar como imagen histórica.
- Revisar registros, hojas y ScriptProperties para descartar tokens OAuth, credenciales o URLs temporales. Registrar commit, rol, dispositivo/navegador y evidencia anonimizada.
