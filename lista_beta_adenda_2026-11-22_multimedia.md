# Adenda Beta — P1 multimedia: imágenes, logos y YouTube
Fecha: 2026-11-22
Normativa única: `NORMAS_DESAROLLO.md`
Entorno: exclusivamente Beta aislada; nunca producción.

## 0. Sincronización segura obligatoria

Ejecutar estos comandos antes de cualquier prueba Beta. Ajustar únicamente la ruta local del clon:

```bash
cd /ruta/local/GPSpedia || exit 1
test "$(git remote get-url origin)" = "https://github.com/infogpstech/GPSpedia.git" || exit 1
test "$(git branch --show-current)" = "GPSpedia2.2.5_work" || exit 1
test -z "$(git status --porcelain)" || { echo "Árbol con cambios locales; detener sincronización"; exit 1; }
git fetch origin GPSpedia2.2.5_work &&
git pull --ff-only origin GPSpedia2.2.5_work &&
git rev-parse --abbrev-ref HEAD &&
git rev-parse HEAD
```

No usar `reset --hard`, `clean`, force push ni comandos que descarten cambios locales. Si el árbol no está limpio, guardar el trabajo por el procedimiento autorizado y repetir desde el inicio.

## 1. Preparación del entorno aislado

- Usar deployments Apps Script de prueba, Spreadsheet desechable y carpeta Drive separada.
- Para YouTube, usar una cuenta/canal de prueba autorizado, OAuth de ese entorno y vídeos de prueba no sensibles.
- No reutilizar secretos, tokens, cuentas, canales, hojas, carpetas ni archivos productivos.
- Preparar corpus técnico sintético o autorizado; no incluir fotos de clientes, placas, VIN, datos personales ni información confidencial.
- Registrar versión del navegador, dispositivo, resolución, red y commit probado.
- Los registros deben usar IDs sintéticos o etiquetas anonimizadas; nunca tokens, URLs de sesión resumable ni datos personales.

## 2. Imágenes: calidad, MIME y variantes

Para cada imagen del corpus registrar: etiqueta anónima, SHA-256, tamaño en bytes, dimensiones originales, MIME declarado, firma detectada, orientación y si contiene transparencia.

Como preparación, puede usarse el banco local JS/Tests/ThumbnailQualityBenchmark.html. Desde la raíz del repositorio, ejecutar `python -m http.server 8000` y abrir `/JS/Tests/ThumbnailQualityBenchmark.html`. El botón **Generar corpus sintético** crea cinco PNG locales en memoria (diagrama eléctrico, panel vertical, textura oscura, alfa parcial e imagen pequeña); también pueden seleccionarse muestras sintéticas/autorizadas propias. El banco no sube archivos ni los guarda; genera previews 300/800/1600, mide cola/proceso/encode y muestra MIME/firma/hash de resultados. La detección de alfa es muestreada y la memoria es estimada. La textura es una ilustración sintética, no una fotografía, y el corpus generado no incluye EXIF real. No reemplaza las pruebas Beta de la aplicación real.

Corpus mínimo:
- Diagramas eléctricos con texto fino, números, colores de cables y símbolos.
- Fotografías con detalle fino y zonas oscuras/iluminadas.
- PNG con transparencia parcial y total.
- Imágenes pequeñas que no deben ampliarse.
- Imágenes apaisadas, verticales y con orientación EXIF cuando el navegador/corpus permita probarla.

Comprobar:
1. Las variantes 300/800/1600 conservan proporción y no amplían el original.
2. La transparencia PNG se conserva.
3. El texto, números, conectores y colores siguen siendo legibles; documentar cualquier pérdida de detalle.
4. MIME declarado y firma binaria coinciden; entradas contradictorias se rechazan.
5. La caché guarda bytes cuyo MIME/firma y SHA-256 coinciden con lo esperado.
6. Errores CORS, decodificación, cuota IndexedDB y persistencia no bloquean la imagen original ni la navegación.
7. La caché no presenta variantes de otro archivo o tamaño.

No cambiar formato, dimensiones ni límites a partir de un único archivo. Conservar originales y resultados de forma aislada; no subir el corpus al repositorio.

## 3. Cola, precarga y primera pintura

Comparar en el mismo dispositivo/corpus:
- Sin precarga de fondo.
- Precarga de catálogo con la prioridad actual (visible 10, precarga 0).
- Escenario de caché fría y caché caliente.
- Escenario de 15 vehículos × hasta 11 campos de imagen y solicitud visible simultánea.

Registrar:
- Tiempo de solicitud visible hasta inicio de compresión, y tiempo hasta imagen visible.
- Conteos encolados, iniciados, completados, fallidos, promovidos, activos y pendientes por prioridad mediante `thumbnailCompressionQueue.getMetrics()`.
- Espera acumulada/máxima y duración acumulada/máxima por prioridad.
- Cache hit/miss, solicitudes de red, bytes transferidos, fallos CORS y memoria aproximada.
- Primera pintura y cualquier bloqueo perceptible de interacción.

Verificar:
1. Una solicitud visible supera precargas pendientes.
2. La solicitud visible que coincide con una precarga comparte una sola promesa y promueve la entrada.
3. Las promociones anticipadas también aparecen en métricas.
4. FIFO permanece estable dentro de una prioridad y la concurrencia máxima sigue en 2.
5. Un error no detiene el resto de la cola.
6. Cambiar de vista o sesión no interrumpe una compresión compartida; la precarga solo alimenta caché global.

No inferir mejora a partir de conteos teóricos. Adjuntar resultados medidos antes/después.

## 4. Logos: inventario histórico de solo lectura

Sobre Spreadsheet y Drive aislados:
1. Leer filas de `LogosMarca` y obtener metadata de cada archivo referenciado sin descargar ni modificar el original.
2. Registrar cantidad, tamaño en bytes, MIME declarado, extensión, firma detectada y dimensiones cuando sean legibles.
3. Separar archivos ausentes, enlaces rotos, MIME/extensión contradictorios, duplicados y archivos no imagen.
4. Calcular distribución mínimo/mediana/p95/máximo y total de bytes.
5. No guardar URL privada, nombre de usuario ni contenido Base64 en el informe; usar etiquetas anonimizadas y huellas SHA-256.
6. Solo después de revisar la distribución y casos extremos, proponer un límite de bytes. No aplicar el límite durante este inventario.

## 5. YouTube: transferencia y aprobación

Usar un vídeo de prueba de tamaño suficiente para abarcar más de un bloque:
1. Inicializar sesión y confirmar que el endpoint devuelve una URL oficial de sesión resumable.
2. Verificar que el binario se transfiere directamente navegador→YouTube en bloques de 8 MiB; Apps Script no recibe el binario.
3. Interrumpir durante un bloque, confirmar que solo se conserva el offset remoto confirmado y reanudar consultando Range.
4. Cerrar el modal y confirmar pausa, abort del XHR activo y persistencia del último checkpoint.
5. Reabrir y reanudar desde IndexedDB sin volver a seleccionar el archivo.
6. Simular respuesta perdida, error de red y sesión expirada. Registrar si la inicialización crea sesiones sin uso; no repetir solicitudes en paralelo contra un canal real para forzar carreras.
7. Verificar que un vídeo completado puede reintentar aprobación sin volver a subir el archivo.
8. Confirmar que el vídeo permanece no listado y no aparece en GPSpedia antes de aprobarse.
9. Aprobar con rol autorizado y verificar URL/miniatura en destino; rechazar en otra operación y comprobar retirada exacta.
10. Repetir la misma operación con el mismo `opVideoId`; debe recuperar el resultado original y no crear una segunda solicitud lógica.
11. Confirmar que los roles no autorizados no pueden aprobar/rechazar y que los IDs/URLs contradictorios se rechazan.
12. Escenario de concurrencia controlado: abrir el mismo destino en dos pestañas/dispositivos antes de iniciar cualquiera; enviar ambas inicializaciones solo en el entorno aislado; registrar cuántas sesiones resumables devuelve YouTube y si quedan vídeos no listados huérfanos. Usar destino/canal desechable; no forzar esta carrera en producción. No marcar PASS si no se verifica el estado remoto real. La caracterización local YouTubeInitIdempotencyBoundary 7/7 solo demuestra el límite del cliente/handler con dobles; no sustituye esta prueba remota.

No forzar expiraciones reales si requieren esperar al TTL de YouTube; los estados 404/410 y reintentos se validan localmente con dobles, y la limitación se registra sin simularla como prueba real. La carrera de inicialización concurrente solo se ejecuta en Beta aislada con destino/canal desechable.

## 6. Evidencia y cierre

- Guardar capturas de pantalla, métricas agregadas, SHA-256, tamaños, timestamps y resultados por escenario en el espacio aislado.
- Separar pruebas locales ya aprobadas (HEAD 7c916e31c311cec0da1086d378e7d287a550ca15: 302 suites / 3,505 pruebas / 0 fallos; ThumbnailPriorityIntegration 15/15, ThumbnailQualityBenchmarkContract 30/30 y YouTubeInitIdempotencyBoundary 7/7 (caracterización local)) de las pruebas Beta ejecutadas en este protocolo.
- Marcar cada caso PASS solo si se verificaron respuesta, persistencia, estado real y destino aislado.
- Si aparece un defecto, conservar evidencia, reproducirlo y corregirlo en la rama de trabajo antes de repetir el escenario afectado.
- No modificar límites, formatos, endpoints, permisos, deployments ni datos productivos durante la medición.
