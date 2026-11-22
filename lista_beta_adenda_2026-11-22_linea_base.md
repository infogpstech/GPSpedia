# Adenda Beta — línea base de rendimiento por flujo
Fecha: 2026-11-22
Normativa: `NORMAS_DESAROLLO.md`
Alcance: medir el comportamiento real de Beta; no cambiar producción.

## 0. Sincronización segura obligatoria

Ejecutar antes de cualquier prueba y ajustar únicamente la ruta local:

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

No usar reset --hard, clean, force push ni comandos que descarten cambios locales.

## 1. Entorno y controles

- Deployment Apps Script, Spreadsheet y Drive aislados, con cuentas de prueba y datos sintéticos/autorizados.
- No usar cuentas, sesiones, hojas, carpetas, vehículos, mensajes ni archivos productivos.
- Dispositivos mínimos: Android/PWA y escritorio; registrar navegador/versión, memoria disponible, resolución, red y commit.
- Ejecutar con caché fría y caliente; red normal y throttling reproducible.
- Repetir cada escenario al menos 30 veces por dispositivo cuando el flujo sea estable. Para operaciones de escritura, usar IDs nuevos de prueba y una repetición idempotente controlada.
- No registrar payloads, tokens, IDs personales, mensajes, VIN, URLs privadas ni contenido de archivos.

## 2. Telemetría disponible y límites

La telemetría del navegador `serviceTelemetry.js`:
- Es local a la pestaña/sesión actual; no persiste ni transmite eventos.
- Conserva como máximo 200 eventos recientes por pestaña y buckets horarios por servicio.
- Expone requests, éxitos/errores, duración media, p50/p95 de duración y bytes de request/response.
- Los percentiles se calculan sobre el historial efímero disponible; no representan población ni un percentil de 24 horas.

Capturar snapshots para AUTH, CATALOG, WRITE, USERS, FEEDBACK, UTILITIES y ADMIN usando `getBrowserServiceTrafficSnapshot(service)`. Registrar el tamaño de muestra y no comparar p50/p95 si hay menos de 30 muestras.

La telemetría del navegador no mide directamente lecturas/escrituras Spreadsheet, llamadas Drive, esperas de locks/leases ni operaciones internas de Apps Script. Para esas cifras se requiere instrumentación diagnóstica temporal en el deployment Beta, agregada y sin payloads; no inferirlas a partir de la latencia total del navegador.

## 3. Escenarios por flujo

### AUTH / USERS
1. Login con sesión nueva, caché fría y caliente.
2. Validación de sesión y reanudación de pestaña.
3. Cambio de perfil, cierre de sesión y revocación.
4. Creación de usuario de prueba y repetición del mismo operationId.
Registrar requests, bytes, p50/p95, errores, lecturas de Users/ActiveSessions y esperas de coordinación.

### CATALOG / navegación
1. Primera carga sin snapshot local.
2. Primera carga con snapshot IndexedDB/CacheStorage válido.
3. Navegación con cursor incremental sin cambios.
4. Navegación después de 1, 10 y 50 cambios de catálogo.
5. Cursor inválido, hueco/reset y recuperación por snapshot completo.
6. Buscar por texto, abrir detalle y volver a listado.
Registrar llamadas completas frente a deltas, bytes, tiempo de render, p50/p95, hit/miss de caché y lecturas de hojas/propiedades.

### WRITE / aportes
1. Abrir formulario y obtener datos auxiliares.
2. Crear aporte sin imagen.
3. Crear aporte con imagen pequeña y grande de prueba.
4. Repetir operationId tras respuesta perdida simulada.
5. Provocar fallo parcial después del append y antes del read-back; verificar recuperación.
Registrar requests, bytes, append/read-back, publicación CATALOG, Drive writes y locks/leases.

### FEEDBACK / PyS / Tutoriales
1. Abrir listas y detalle con caché fría/caliente.
2. Crear reporte/sugerencia y repetir la operación.
3. Agregar/quitar like y repetir el mismo request.
4. Agregar Tutorial y verificar que el cliente aplica delta antes de snapshot completo.
5. Crear/editar entrada PyS y recuperar respuesta perdida.
6. Abrir Inbox, listar mensajes, marcar leído, enviar y archivar.
Registrar llamadas por acción, bytes, lecturas Spreadsheet, eventos append-only, publicaciones CATALOG y p50/p95.

### ADMIN
1. Abrir/cerrar/reabrir panel Developer varias veces.
2. Refrescar telemetría y candidatos de aportes.
3. Consultar inventario de imágenes reemplazadas.
4. Ejecutar escaneo Drive de prueba con corpus aislado.
5. Crear carpeta de prueba y repetir la misma operación.
Registrar llamadas Coordinator de leases, espera, duración, lecturas Drive/Spreadsheet, escrituras, número de handlers UI y errores. Las operaciones de mantenimiento se prueban por separado de navegación ordinaria.

### Multimedia
Usar los pasos detallados en `lista_beta_adenda_2026-11-22_multimedia.md`: corpus de imágenes, cola, primera pintura, tamaños de logos históricos y YouTube resumable/aprobación.

## 4. Métricas y comparación

Por servicio/acción/dispositivo registrar:
- número de requests, éxitos, errores, reintentos y cancelaciones;
- requestBytes y responseBytes: media, p50 y p95 cuando n≥30;
- duración: media, p50 y p95 cuando n≥30;
- número de lecturas/escrituras Spreadsheet, operaciones Drive, llamadas Coordinator, leases y espera real;
- tiempo hasta primera pintura, tiempo hasta interacción y memoria aproximada;
- hit/miss IndexedDB/CacheStorage y llamadas completas/deltas.

Comparar antes/después en el mismo dataset y dispositivo. Separar resultados de caché fría/caliente. No sumar p50/p95 de diferentes servicios ni interpretar el historial acotado como telemetría poblacional.

## 5. Criterios de aceptación

- No duplicar aportes, mensajes, likes, aprobaciones ni archivos ante reintentos controlados.
- Ninguna acción ordinaria espera por un lock/lease global no indispensable.
- La primera vista puede usar una caché local válida sin esperar una consulta completa de red.
- Los deltas reducen snapshots completos en navegación normal; reset/cursor inválido recuperan un snapshot completo.
- Fallos parciales recuperan por operationId/read-back sin repetir efectos confirmados.
- Las métricas se reportan por acción/dispositivo y con tamaño de muestra visible.
- No se acepta una mejora de latencia si rompe integridad, recuperación, permisos, legibilidad o calidad de imágenes.

## 6. Entrega de resultados

- Crear un informe Beta nuevo con commit probado, entorno, muestras, resultados y anomalías.
- Mantener datos de prueba fuera del repositorio; incluir solo métricas agregadas y etiquetas sintéticas.
- No desplegar ni modificar producción desde este protocolo.
- Si no hay instrumentación interna para una lectura/escritura, reportarla como no medida; no estimar ni inventar valores.
