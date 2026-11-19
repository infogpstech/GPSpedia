# GPSpedia — Tareas activas
Fecha de actualización: 2026-11-18
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5 (no modificar)
Normativa: NORMAS_DESAROLLO.md

## Plan de ejecución vigente — implementación local antes de Beta (2026-11-19)

**Orden obligatorio:** terminar las implementaciones y correcciones locales; ejecutar la regresión integral; solo después preparar y realizar despliegues y validaciones Beta con autorización. No desplegar Apps Script, cambiar ScriptProperties/secretos ni ejecutar pruebas contra Drive, Spreadsheet o servicios remotos durante este bloque.

### Fase 1 — ADMIN: salud y telemetría de servicios
**P0 · EN PROGRESO · BETA-ADMIN-SERVICE-TELEMETRY-02 + BETA-ADMIN-GLOBAL-TRAFFIC-01**
- Corregir los defectos reproducibles del escáner (incluido `events is not defined`) y del contrato/respuesta del agregado global.
- Recuperar salud y tráfico de todos los servicios activos, incluido el tráfico del navegador móvil; excluir LEGACY del inventario, las consultas y la interfaz.
- El escáner debe mostrar una tarjeta por cada servicio activo. Al seleccionar una tarjeta, mostrar todas las métricas disponibles de ese servicio, su estado/versión/latencia y los datos diagnósticos seguros.
- Presentar dos gráficas separadas: (1) tráfico global agregado de los servicios y (2) tráfico local del servicio seleccionado. No confundir datos ausentes con cero ni disponibilidad del endpoint con salud integral de Sheets/Drive.
- Aislar fallos parciales: un servicio sin telemetría o con error no debe ocultar los datos de los demás. Mantener la interfaz y las consultas funcionales en navegador móvil.
- Validar contratos, autenticación, permisos, límites, normalización, renderizado, concurrencia y coste de telemetría sin añadir esperas ni viajes de red a las acciones ordinarias.

### Fase 2 — Simplificación de arquitectura y configuración de servicios
**P0 · PENDIENTE · SERVICE-ARCHITECTURE-SIMPLIFICATION-01 (requisito expreso nuevo)**
- Reducir el acoplamiento de despliegue entre los servicios Apps Script: un cambio interno del Coordinator o de SharedMutation no debe obligar automáticamente a volver a desplegar todos los servicios consumidores.
- Estabilizar y versionar el contrato de comunicación entre servicios; separar el protocolo/cliente estable de la implementación central que evoluciona. Evaluar alternativas compatibles con Apps Script antes de elegir diseño; no asumir que una librería compartida elimina por sí sola los despliegues.
- Simplificar nombres, distribución y documentación de secretos/URLs. Mantener secretos fuera del repositorio y conservar aislamiento suficiente entre servicios; no exponerlos en endpoints, logs ni frontend.
- **Capacidades que deben conservarse y probarse explícitamente:** monitoreo de salud de todos los servicios; restricciones y cambios de acceso de cuentas; revocación/cierre remoto de sesiones; limpieza remota de caché por usuario; cierre/eliminación remota de cuentas. Ninguna puede degradarse, eliminarse ni convertirse en una operación manual.
- Mantener intacta la matriz RBAC, la identidad confiable y las protecciones indispensables. La simplificación debe reducir mantenimiento y despliegues, no eliminar funciones ni ampliar privilegios.

### Fase 3 — Inbox y aislamiento de operaciones
**P1 · PENDIENTE**
- Diagnosticar y corregir «servicio no autorizado para el coordinador compartido» en Inbox, sin ampliar privilegios.
- Determinar si la auditoría de imágenes interfiere con Inbox u operaciones independientes; revisar locks, leases, timeouts y liberación ante errores.
- Corregir la vista previa del contenido HTML en la bandeja: mostrar texto/fragmento legible y no etiquetas HTML sin procesar, preservando el renderizado seguro del mensaje completo.

### Fase 4 — ADMIN: controles y retroalimentación
**P1/P2 · PENDIENTE**
- Corregir el mensaje de borrado de logs para distinguir eliminación efectiva, ausencia de registros y error.
- Compactar el selector de retención (últimos 7 días / eliminar todos) y corregir desbordamientos.
- Corregir el padding innecesario del contenedor de imagen del modal de corte sin alterar logo, nombre, acciones ni distribución ya aceptada.
- Auditar la telemetría y las métricas visibles en escritorio y móvil para evitar datos duplicados o contradictorios.

### Fase 5 — Auditoría y organizador de imágenes
**P1 · PENDIENTE LOCAL**
- Reconciliar los registros históricos con el código real: el constructor puro, endpoint `previewCortesImageOrganizer` y UI paginada ya constan implementados; no repetirlos.
- Completar auditoría de cobertura, referencias de todas las hojas, inventario persistente, relación inteligente vehículo/imagen y clasificación explicable de «Sin uso»/«Reemplazada».
- Unificar rutas y nomenclatura de altas de cortes, modelos y logos; mantener `ign1..3`, `bomba1..3`, `btn1..3`, `alim1..3`, `apert` y extensión original.
- Diseñar aplicación por lotes solo después del preview: idempotencia, verificación individual, manifiesto, compensación/rollback y confirmación explícita. No mover, renombrar, borrar ni restaurar archivos en esta fase.

### Fase 6 — Documentación y coherencia de registros
**P2 · PENDIENTE**
- Rotar sin pérdida `Tareas_Pendientes.md` y `lista_beta_parte2.txt`, que superan el umbral documental; verificar reconstrucción exacta y manifiestos antes de añadir contenido a esos archivos.
- Reconciliar versiones y contratos documentados en `Services/SERVICE_HEALTH.md` con los endpoints fuente.
- Mantener Auditoría, ChangesLogs, tareas y checkpoint sincronizados; no reescribir evidencia histórica.

### Fase 7 — Regresión integral y transición a Beta
- Ejecutar las pruebas locales pertinentes de cada fase y una regresión integral de contratos, sintaxis, permisos, sesiones, revocaciones, caché remota, cuentas, telemetría y flujos administrativos.
- Registrar por separado lo aprobado localmente y lo que exige deployment, credenciales, navegador/dispositivo real, Drive o Spreadsheet.
- Abrir la fase Beta únicamente después de cerrar las implementaciones locales; preparar primero los comandos seguros de sincronización exigidos por NORMAS_DESAROLLO.md.

**Criterio de avance:** cerrar cada tarea con diff revisado, pruebas locales reproducibles y commit verificado en `GPSpedia2.2.5_work`. Si aparece un hallazgo crítico de seguridad/integridad, atenderlo antes de avanzar. La rama base `GPSpedia2.2.5` permanece protegida e intacta.

---

## Completadas en esta continuidad
- [x] BETA-ADMIN-CUT-IMAGE-AUDIT-CONSOLE-01 — consola de Cortes como salida principal; confirmación conservada en terminal global del Desarrollador; resultados y resumen verificados.
- [x] BETA-ADMIN-CUT-IMAGE-ORGANIZER-AUDIT-01 — auditoría estática de normalización, movimiento, rutas, nomenclatura, referencias y alta de logos.
- [x] Mitigación de alta de logos — handleAddLogo usa findOrCreateSubFolder y no activa la fusión heredada de carpetas.
- [x] CI: 146 suites, 2,157 pruebas aprobadas, 0 fallos; health y Pages SUCCESS en HEAD d81894f53e6036a1b3d0e0e86b317ad913ec42ee.

## Pendientes — prioridad inmediata

### P0 — BETA-ADMIN-CUT-IMAGE-ORGANIZER-DRY-RUN-01
Implementar un preview estrictamente de solo lectura:
- Recorrer las ocho columnas de imagen de cada fila válida de Cortes y las referencias de LogosMarca.
- Comparar ID, nombre, extensión y ruta actual del archivo con el destino calculado.
- Usar referencias activas de todas las hojas, excluyendo Imagenes_Reemplazadas para determinar uso vigente.
- Mostrar por archivo: hoja/fila/campo, ID, nombre actual, ruta actual, nombre/ruta propuestos, clasificación y motivo.
- Detectar IDs compartidos, referencias no interpretables, filas duplicadas, destinos ambiguos, carpetas duplicadas y conflictos de nombre.
- No crear carpetas, mover, renombrar, copiar, restaurar de papelera, eliminar, sobrescribir ni escribir en Spreadsheet.
- No inventar valores: bloquear si faltan categoría, marca, modelo, versión/encendido o años.
- Para logos, resolver una sola categoría desde Cortes; si una marca aparece en varias categorías o no aparece, marcarla como ambigua y no elegir arbitrariamente.
- Para imgCorte1/2/3, mapear tipoCorte1/2/3 a ign, bomba o btn usando el valor real. Si no se reconoce, bloquear la propuesta.
- Preservar exactamente la extensión original.

### P1 — BETA-ADMIN-CUT-IMAGE-ORGANIZER-STRUCTURE-01
Aplicar la estructura objetivo después de validar el dry-run:
- Vehículos: Cortes/<categoría>/<marca>/<modelo>/<versión-o-encendido>/<año-inicio-año-fin>/
- Logo: <marca>_logo.<extensión> en el primer nivel de la carpeta de marca.
- Nombres: <modelo>_<versión-o-encendido>_<año-inicio>_<año-fin>_<función>.<extensión>.
- Códigos funcionales obligatorios: ign1..ign3, bomba1..bomba3 y btn1..btn3, numerados por función real derivada de tipoCorte1/2/3; alim1..alim3 para imgCableAlimen/2/3; apert para imgApertura; imagenVehiculo para la imagen principal. Los tipos desconocidos o ambiguos bloquean el destino. La extensión original se conserva.
- Resolver colisiones sin sobrescribir y sin enviar archivos o carpetas a papelera.

### P1 — BETA-ADMIN-CUT-IMAGE-ORGANIZER-REGISTRATION-CONSISTENCY-01
- Unificar handleAddLogo y altas de imágenes de Cortes con el mismo constructor de destino.
- La alta de logo debe guardar en el primer nivel de la carpeta de marca, no en Cortes/Logos.
- Mantener bloqueada la operación si la categoría de una marca no es única.

### P1 — BETA-ADMIN-CUT-IMAGE-ORGANIZER-SAFE-APPLY-01
- Separar preview y aplicación.
- Requerir confirmación explícita desde la terminal del Desarrollador.
- Aplicar por lotes idempotentes; verificar cada movimiento/renombrado y actualización de URL; registrar manifiesto y permitir rollback.
- No eliminar ni restaurar archivos automáticamente.

### P2 — DOC-ROTATION-01
- Rotar Tareas_Pendientes.md y lista_beta_parte2.txt, ambos por encima de 180,000 caracteres Unicode.
- Dividir solo en límites de registro, conservar contenido exacto, verificar reconstrucción y actualizar los manifiestos/índices.
- No añadir más contenido a esos dos archivos hasta completar la rotación.

## Evidencia y límites
- La auditoría de código no equivale a validar los datos reales de Drive/Spreadsheet.
- No se han movido, renombrado, copiado, restaurado ni eliminado archivos productivos.
- No se han desplegado Apps Script. La validación de la nueva organización requerirá ejecutar primero el dry-run tras su despliegue y revisar sus resultados.
- Siguiente paso exacto: el constructor puro, endpoint ADMIN previewCortesImageOrganizer y UI paginada del preview ya están implementados localmente. Corregida la nomenclatura funcional; verificar CI disponible, luego desplegar ADMIN en Beta, ejecutar una auditoría Drive nueva y revisar el preview real. No aplicar movimientos ni renombrados.


## Actualización 2026-11-19 — subpaso completado
- [x] Constructor puro buildCortesImageOrganizerTargets_: genera rutas y nombres para ocho campos de Cortes y LogosMarca; usa columnas reales, bloquea datos ambiguos y no realiza escrituras.
- [x] Prueba dinámica con el mapa real COLS_CORTES: rutas/nombres, tipo desconocido, fórmula, año faltante, ID compartido y marca mult categoría.
- [ ] El P0 DRY-RUN-01 continúa abierto: falta conectar el endpoint de solo lectura que inspecciona cada archivo del inventario, obtiene su ruta y extensión originales, compara referencias activas de todas las hojas, detecta conflictos y emite manifiesto completo con digest.
- CI del subpaso: 146 suites, 2,157 pruebas aprobadas, 0 fallos en HEAD aa967514d3602f0512a05f9ddf1fafc1c11c0c24. Apps Script aún no desplegado; no se realizaron operaciones productivas.


## Actualización 2026-11-19 — endpoint backend dry-run
- [x] Acción ADMIN previewCortesImageOrganizer, con permiso compartido de solo lectura en ADMIN, api-config y Coordinator.
- [x] Revalidación de auditoría completa/vigente, inventario y metadatos con rutas, extensión original, referencias activas de todas las hojas, historial, carpetas destino y colisiones.
- [x] Paginación por destinos (25 por defecto, máximo 50), estados y motivos por archivo, manifestDigest, writePerformed:false y canApply:false.
- [x] Persistencia de folderPath en páginas de auditoría y bloqueo de destinos duplicados.
- [x] CI: 146 suites, 2,157 pruebas aprobadas, 0 fallos; health y Pages SUCCESS en HEAD 6e43666b69ff20b7945f5ebe7b7745a7758ce8d0.
- [ ] Integrar previewCortesImageOrganizer en ui.js y presentar resultados paginados en el modal/consola. El frontend aún no invoca esta acción.
- [ ] Desplegar ADMIN actualizado, generar una auditoría Drive nueva (las auditorías antiguas no tienen folderPath en caché) y validar resultados reales. No aplicar cambios.
- [ ] Mantener bloqueada la aplicación de movimientos/renombrados hasta terminar la UI, revisar el manifiesto real y probar rollback.


## Actualización 2026-11-19 — UI conectada
- [x] Botón «Previsualizar organización» y panel de resultados agregados al modal de auditoría.
- [x] ui.js recorre las páginas del endpoint, valida digest estable, offset, total, finalización y banderas writePerformed:false/canApply:false; presenta conteos y detalles por archivo.
- [x] No se habilita ninguna mutación desde la UI.
- CI HEAD bb3f3a1fcf47d328f1ab51a4ab5dc3a93e2e3807: 146 suites, 2,157 pruebas aprobadas, 0 fallos; health y Pages SUCCESS.
- [ ] Desplegar ADMIN actualizado y ejecutar una auditoría Drive nueva para persistir folderPath en el inventario.
- [ ] Ejecutar el preview real y revisar rutas, nombres, extensiones, referencias y conflictos. Mantener la aplicación bloqueada.
- [ ] Corregir cualquier discrepancia real antes de implementar la aplicación segura por lotes y rollback.


## Corrección de nomenclatura funcional — 2026-11-18
- [x] ADMIN: numeración explícita por función para ign1..ign3, bomba1..bomba3 y btn1..btn3, derivada de los valores reales de tipoCorte1/2/3.
- [x] ADMIN: alimentación uniforme alim1..alim3 para imgCableAlimen, imgCableAlimen2 e imgCableAlimen3; apertura permanece apert.
- [x] Pruebas dinámicas ampliadas para las tres posiciones de cada tipo de corte y los tres campos de alimentación.
- [ ] Desplegar ADMIN actualizado, generar una auditoría Drive nueva y ejecutar el preview de solo lectura para validar nombres/rutas/extensiones/referencias reales. No aplicar movimientos ni renombrados.
