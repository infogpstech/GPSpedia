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
