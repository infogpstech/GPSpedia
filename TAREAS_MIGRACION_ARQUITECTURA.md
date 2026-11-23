# Tareas de migración — Arquitectura sin configuración local

**Plan rector:** [PLAN_NUEVA_ARQUITECTURA_FRONTEND.md](./PLAN_NUEVA_ARQUITECTURA_FRONTEND.md)  
**Norma:** §17 de `NORMAS_DESAROLLO.md`  
**Rama:** `GPSpedia2.2.5_work`  
**Estado general:** EN PROGRESO  
**Regla de cierre:** ninguna tarea puede dar por terminada una migración funcional si no demuestra paridad con el comportamiento anterior.

## Convenciones

- **PENDIENTE:** no iniciada.
- **EN PROGRESO:** análisis/implementación activa.
- **COMPLETADA:** código y pruebas locales aplicables aprobados.
- **COMPLETADA CON VALIDACIÓN DIFERIDA:** pruebas locales aprobadas; integración Beta pendiente.
- **BLOQUEADA:** solo por defecto local reproducible, riesgo crítico o dependencia indispensable no resuelta.

Cada tarea debe registrar archivos, funciones/acciones afectadas, pruebas y evidencia. No se permite eliminar funciones como forma de cerrar tareas.

---

## Fase 0 — Inventario total y línea base

### MIG-001 — Inventario de todas las acciones y handlers
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (2026-11-23)**
- [x] Contrastar las 120 acciones de `ACTION_TO_SERVICE_MAP` con los routers reales.
- [x] Extraer acciones aceptadas por cada `doPost` que no estén en el mapa frontend.
- [x] Inventariar funciones internas, acciones manuales, endpoints de mantenimiento, compatibilidad histórica, rutas GET, terminal y procesos auxiliares.
- [x] Registrar para cada acción: handler, consumidores UI, payload/validadores, respuesta, errores, rol/RBAC, hojas/archivos, dependencias e inventario de pruebas.
- [x] Detectar handlers sin consumidores y consumidores sin handler, sin eliminar ninguno; clasificar las 12 acciones sin consumidor directo y conservar sus endpoints.

**Aceptación:** matriz acción → handler → consumidor → permiso → datos → pruebas completada en §§9–19 de `MATRIZ_MIGRACION_SERVICIOS.md`. La validación de deployments, triggers instalados, Spreadsheet/Drive reales y APIs externas queda diferida a Beta; no bloquea el cierre del inventario estático.

#### Evidencia de revisión estática inicial — 2026-11-23

- Se leyó el mapa completo `ACTION_TO_SERVICE_MAP`: 120 claves únicas distribuidas en AUTH (15), CATALOG (5), WRITE (9), USERS (3), FEEDBACK (41), UTILITIES (1) y ADMIN (46). La matriz coincide con el mapa efectivo.
- Se contrastaron las acciones con los dispatchers: AUTH 15; USERS 3; WRITE 9; CATALOG 5 acciones canónicas más la compatibilidad `getSuggestion`; FEEDBACK 41; ADMIN 46; UTILITIES 1 acción atendida por su router directo (fuera de un `switch`). No se identificó en esta pasada una acción canónica del mapa sin handler.
- Se ejecutó `JS/Tests/ActionDispatchContract.js` con las fuentes exactas recuperadas de esta rama y con el mismo conjunto de consumidores que usa `RunServiceTests.mjs`: **12/12 PASS**. Esto valida mapa, handlers, consumidores versionados, compatibilidades, endpoint, rutas retiradas y división RBAC de ADMIN. No equivale a ejecutar el runner Node.js completo ni pruebas remotas.
- Se identificaron rutas internas fuera del mapa público: acciones de Coordinator (leases, sesiones, cachés, feed y tráfico), `__invalidateSessionActorCache` y `__primeSessionActorCache` en USERS/WRITE/FEEDBACK/ADMIN, además de rutas de compatibilidad/rechazo en CATALOG y ADMIN. Deben incluirse en el inventario, no descartarse como acciones sin uso.
- Se inspeccionaron consumidores frontend representativos: `main.js`, `ui.js`, `auth.js`, `youtubeUpload.js`, `pys-data.js`, `HTML/add_cortes.html`, `HTML/users.html` e `index.html`. La suite de contrato consume además `api-config.js`, `add_cortes.html`, `auth.js`, `main.js`, `pys-data.js`, `ui.js`, `users.html` y `youtubeUpload.js`. Recuento estático inicial: `index.html` 113 botones/5 formularios/278 IDs; `ui.js` 42 plantillas de botón/8 formularios/138 IDs únicos; `add_cortes.html` 17 botones/3 formularios/61 IDs; `users.html` 9 botones/3 formularios/29 IDs únicos. `ui.js` concentra administración, Drive, imágenes, PyS, VIN e Inbox; el trazado control→acción→handler→RBAC→datos→prueba sigue incompleto.
- Se revisaron también políticas RBAC de AUTH, USERS, WRITE, FEEDBACK, ADMIN, UTILITIES e Inbox: roles jerárquicos de administración de usuarios, límites de edición modal, acciones exclusivas de Desarrollador, acciones públicas/anónimas y jerarquía de destinatarios Inbox. Falta asociar cada acción a su regla exacta y a sus datos.
- No se modificó código funcional ni deployments. Se ejecutó únicamente la prueba de contrato estático indicada (12/12 PASS); no se ejecutó `RunServiceTests.mjs`, Node.js CLI ni pruebas remotas.

**Resultado de la primera pasada (nota histórica):** MIG-001 permanecía EN PROGRESO en ese corte. Este estado fue sustituido por el cierre integral documentado en §19 de la matriz y en el apartado «Cierre MIG-001» de este registro (2026-11-23).


### MIG-002 — Inventario de pantallas y capacidades visibles
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (2026-11-23)**
- [x] Recorrer HTML/JS/CSS activos y listar pantallas, modales, controles, comandos, selectores y estados.
- [x] Registrar estados de carga, vacío, éxito, error, progreso, cancelación, pausa y reanudación donde están implementados.
- [x] Cubrir catálogo, ficha/modelos/cortes, VIN, imágenes, vídeos, tutoriales, Relay, PyS, feedback, Inbox, Dashboard, administración, usuarios y Developer Tools.
- [x] Relacionar los grupos de controles con handlers cliente, acciones backend/locales, condiciones de rol y pruebas automatizadas existentes.
- [x] Distinguir pruebas directas de UI, contratos/regresiones de backend y validaciones de navegador/Beta; documentar expresamente la cobertura indirecta y las brechas sin presentarlas como aprobadas.

**Aceptación:** inventario de pantallas y controles con trazabilidad funcional y de pruebas en `INVENTARIO_PANTALLAS_CAPACIDADES.md` §§2–7. Las validaciones reales de navegador/dispositivos y servicios externos quedan para Beta; no bloquean el cierre del inventario estático.

### MIG-003 — Inventario de configuración en backend
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (2026-11-23)**
- [x] Buscar los usos de PropertiesService/ScriptProperties/UserProperties/DocumentProperties en los diez módulos backend activos.
- [x] Clasificar las 26 familias de claves persistentes: endpoints, secretos, parámetros, idempotencia/login, revocación, contadores, auditoría, estado de Drive, sesiones, feed incremental y telemetría.
- [x] Identificar IDs de Spreadsheet/Drive, siete endpoints de entrada y cinco URLs duplicadas en ADMIN.
- [x] Distinguir configuración GPSpedia, estado operativo/caché, secretos OAuth de ejecución, protocolos externos y valores técnicos del manifiesto Apps Script no versionado.
- [x] Identificar lectores/escritores, generación automática, TTL/retención y destino o criterio de retiro de cada familia.
- [x] Proponer hojas destino sin crear hojas ni alterar proyectos, y registrar dependencias de bootstrap, seguridad y paridad.

**Aceptación:** inventario estático completo en `INVENTARIO_CONFIGURACION_BACKEND.md`; ninguna clave fue eliminada ni migrada. Los valores reales de proyectos desplegados y sus scopes quedan para Beta; el acceso a Spreadsheet sin bootstrap queda para MIG-006.

### MIG-004 — Inventario de llamadas entre servicios y SharedMutation
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (2026-11-23)**
- [x] Inspeccionar UrlFetchApp.fetch, fetchAll, wrappers HTTP y destinos dinámicos en los diez módulos backend activos.
- [x] Identificar y documentar ADMIN→WRITE (asignación de ID y freeze) y ADMIN→CATALOG (proyección y candidatos), incluidos payloads, resultados y consumidores heredados.
- [x] Enumerar las 13 operaciones del protocolo Coordinator, sus callsites, wrappers sin consumidor versionado y seis usos activos de leases.
- [x] Mapear la precarga/invalidez de cachés entre Coordinator y USERS/WRITE/FEEDBACK/ADMIN, más las rutas privadas de los cuatro servicios.
- [x] Clasificar sesión/revocación, feed incremental, telemetría y operaciones protegidas; separar las llamadas a Drive/YouTube/URLs de imágenes de las dependencias entre microservicios.
- [x] Definir reemplazos directos desde frontend, límites de escritura que deben permanecer en un servicio y solapamientos de propiedad Users/Cortes/Drive.
- [x] Vincular cada arista/capacidad con pruebas existentes y agregar ServiceCallGraphContract al runner de regresión.

**Aceptación:** inventario estático en `INVENTARIO_LLAMADAS_SERVICIOS.md`; cada llamada backend→backend versionada tiene origen, destino, propietario, reemplazo y pruebas representativas. Los consumidores externos no versionados y validaciones de deployments quedan explícitamente pendientes de Beta. No se eliminó ninguna llamada ni capacidad.

**Validación CI:** run `45172002358` SUCCESS; 306 suites, 3,581 pruebas aprobadas, cero fallos; sintaxis verificada en 438 archivos JS/MJS y referencias relativas en 348 archivos. El contrato nuevo `ServiceCallGraphContract` aprobó 9/9.

### MIG-005 — Línea base funcional y de rendimiento
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (2026-11-23)**
- [x] Ejecutar la suite de regresión disponible en CI sobre el HEAD exacto de la rama y guardar el resultado inicial.
- [x] Registrar la duración observada del workflow de CI como referencia del proceso de pruebas, separada del rendimiento de la aplicación.
- [ ] Medir latencia real de arranque/login/catálogo/Inbox y operaciones frecuentes: pendiente de navegador/dispositivo y credenciales del entorno Beta.
- [ ] Medir tamaño y tiempo de snapshot/deltas del catálogo: pendiente de instrumentación/ejecución con servicios y Spreadsheet aislados.
- [ ] Medir carga real de imágenes/vídeos y operaciones Drive: pendiente de navegador, OAuth y recursos de prueba Beta.
- [ ] Medir estado de cachés, número real de llamadas y lecturas/escrituras Spreadsheet: pendiente de telemetría/invocaciones autorizadas.
- [x] Distinguir resultados observados de métricas no disponibles; no inferir ni inventar valores de Beta.

**Evidencia:** LINEA_BASE_MIGRACION_2026-11-23.md. Workflow GPSpedia service regression tests, run 45172298195, commit f20bc9934031adb63947e82e1e26b7a24ef4b0f1: 306 suites, 3,581 pruebas aprobadas, 0 fallos; sintaxis de 438 archivos JS/MJS y referencias relativas de 348 archivos aprobadas. Duración del workflow observada: aproximadamente 30 s, incluida preparación del runner; no es latencia de GPSpedia. Health read-only run 45172298206: 7/7 servicios respondieron correctamente por GET.

**Criterio de cierre:** línea base reproducible de pruebas CI registrada. Las mediciones de rendimiento de la aplicación y contadores reales de servicios/Spreadsheet quedan expresamente diferidas a Beta; no bloquean el cierre local según NORMAS §5 y §10.

---

## Fase 1 — Acceso a Spreadsheet sin configuración local

### MIG-006 — Spike técnico de acceso a Spreadsheet
**Estado: PENDIENTE — PRIORIDAD 1**
- [ ] Probar si los proyectos Apps Script vinculados a la Spreadsheet pueden obtener el contenedor activo desde una Web App desplegada.
- [ ] Probar lectura y escritura de una hoja de prueba con identidad/permisos equivalentes al deployment actual.
- [ ] Verificar si varios proyectos independientes pueden operar con el mismo modelo sin ID almacenado en código/propiedades.
- [ ] Evaluar consolidar módulos en un único proyecto vinculado si es la única forma simple de eliminar el ID de Spreadsheet y el bootstrap.
- [ ] Comprobar límites de tamaño, cuotas, concurrencia, tiempo de ejecución, permisos y facilidad de despliegue de cada opción.
- [ ] Documentar la opción mínima que cumple cero configuración local.

**Aceptación:** prueba reproducible en contexto Web App; no basta ejecutar desde el editor.

### MIG-007 — Diseño del esquema central de configuración
**Estado: PENDIENTE**
- [ ] Definir hojas de configuración con claves estables, tipos, valores, descripción, estado y versión.
- [ ] Incluir endpoints de servicio, parámetros de negocio, límites y opciones hoy duplicadas en proyectos.
- [ ] Separar configuración pública de configuración restringida; aplicar permisos de hoja/lectura.
- [ ] Definir valores por defecto, validación, historial y mecanismo de rollback.
- [ ] Evitar guardar tokens OAuth, contraseñas en texto plano o secretos de interconexión.
- [ ] Definir qué información se cachea y por cuánto tiempo.

**Aceptación:** esquema documentado y migración de claves trazable, sin valores sensibles expuestos.

### MIG-008 — Lector central y caché de configuración
**Estado: PENDIENTE**
- [ ] Implementar lectura desde Spreadsheet por el mecanismo validado en MIG-006.
- [ ] Crear caché de configuración con versión, caducidad y última copia válida.
- [ ] Evitar lectura de configuración en cada acción ordinaria.
- [ ] Manejar configuración ausente/inválida sin enrutar acciones al servicio incorrecto.
- [ ] Implementar invalidación/actualización desde el frontend.
- [ ] Probar fallo de Spreadsheet, caché fría/caliente y recuperación.

**Aceptación:** ningún backend necesita ScriptProperties ni constantes de configuración de GPSpedia.

---

## Fase 2 — Frontend como router y coordinador único

### MIG-009 — Router de acciones basado en configuración
**Estado: PENDIENTE**
- [ ] Sustituir URLs hardcodeadas de `api-config.js` por el registro central.
- [ ] Mantener el mapa completo acción → servicio y compatibilidad de payload/respuesta.
- [ ] Mantener una caché frontend rápida y un fallback válido.
- [ ] Añadir pruebas para todos los nombres de acción, servicio destino y endpoint.
- [ ] Conservar estados de error localizados por módulo.

**Aceptación:** las 120 acciones siguen enrutándose al servicio correcto y se añaden las acciones no incluidas en el mapa.

### MIG-010 — Orquestador frontend de operaciones multi-servicio
**Estado: PENDIENTE**
- [ ] Implementar secuencias explícitas para los flujos que hoy resuelve ADMIN mediante llamadas internas.
- [ ] Preservar orden, precondiciones, resultados, errores y recuperación.
- [ ] Usar identificadores de operación/idempotencia solo donde el flujo actual los necesite.
- [ ] Mostrar progreso y estado parcial sin bloquear módulos independientes.
- [ ] Reanudar o permitir recuperación cuando se interrumpe el navegador.
- [ ] No mover secretos ni decisiones de autorización al frontend.

**Aceptación:** las operaciones cruzadas se ejecutan con llamadas directas frontend→servicio, sin backend→backend.

### MIG-011 — Eliminar dependencias backend→backend de ADMIN
**Estado: PENDIENTE**
- [ ] Migrar consulta de proyección de vehículo a llamada directa frontend→CATALOG.
- [ ] Migrar consulta de candidatos de contribución/inventario a llamada directa frontend→CATALOG.
- [ ] Migrar delegaciones de cortes/IDs a llamadas directas frontend→WRITE cuando corresponda.
- [ ] Preservar precondiciones, validaciones, rollback y resultados.
- [ ] Retirar constantes URL internas solo tras comprobar referencias.

**Aceptación:** ADMIN no contiene URLs ni wrappers para otros servicios y sus herramientas mantienen paridad.

---

## Fase 3 — Identidad, usuarios y sesión

### MIG-012 — Unificación funcional AUTH/USERS
**Estado: PENDIENTE**
- [ ] Integrar handlers de `getUsers`, `createUser` y `updateProfile` en AUTH.
- [ ] Mantener exactamente los contratos, campos, permisos y resultados.
- [ ] Actualizar el mapa frontend para enrutar estas acciones a AUTH.
- [ ] Conservar gestión de usuarios, roles, perfiles y altas.
- [ ] Retirar el proyecto USERS solo tras paridad y prueba de que no quedan consumidores.

**Aceptación:** ninguna función de USERS desaparece; no hay proyecto/endpoint independiente requerido.

### MIG-013 — Sesiones sin Coordinator ni secretos compartidos
**Estado: PENDIENTE**
- [ ] Mantener autenticación con el hash actual, bloqueo temporal por intentos fallidos y tokens de sesión opacos.
- [ ] Mantener registro de sesión y actor confiable en Spreadsheet.
- [ ] Definir cómo cada servicio valida/carga actor desde sesión sin llamada a otro servicio y sin confiar en el rol del frontend.
- [ ] Implementar caché local de actor conforme a §15, sin consultas de identidad en cada acción.
- [ ] Mantener comprobación local sencilla de capacidad/rol.
- [ ] No crear claves secretas compartidas ni tokens firmados con secretos configurados manualmente.
- [ ] Probar expiración, sesión desconocida, token revocado, cambio de rol, usuario eliminado y caché fría/caliente.

**Aceptación:** autorización segura, baja latencia y ausencia de Coordinator/SharedMutation.

### MIG-014 — Revocación y limpieza de caché desde frontend
**Estado: PENDIENTE**
- [ ] Logout: invalidar sesión y llamar directamente a los servicios que deban limpiar su caché.
- [ ] Cambio/reset de contraseña, cambio de rol, reset global y eliminación: conservar invalidación efectiva.
- [ ] Definir respuesta ante servicio no disponible y vencimiento máximo de caché.
- [ ] Evitar que una sesión eliminada pueda volver a iniciar o mantener permisos.
- [ ] Probar invalidación parcial, reintento y expiración.

**Aceptación:** todas las excepciones de sesión de §15 mantienen comportamiento sin coordinación backend.

---

## Fase 4 — Imágenes, vídeos y Drive

### MIG-015 — Carga y administración de imágenes
**Estado: PENDIENTE**
- [ ] Mantener subida desde aportes y administración.
- [ ] Mantener límite de 10 MB, MIME/tamaño, ledger, SHA-256 y verificación posterior.
- [ ] Mantener variantes 300/800/1600, transparencia PNG, ObjectURL, IndexedDB y Lightbox.
- [ ] Mantener reemplazo, recuperación, eliminación, inventario y reconciliación.
- [ ] Mantener estado de carga, error, reintento y recuperación.
- [ ] Probar operación completa y fallos parciales.

**Aceptación:** carga y administración de imágenes equivalente a la versión actual.

### MIG-016 — Carga reanudable y aprobación de vídeos
**Estado: PENDIENTE**
- [ ] Mantener init de YouTube Resumable Upload y transferencia directa de bytes.
- [ ] Mantener pausa, cierre de modal, reanudación y registro IndexedDB.
- [ ] Mantener título/descripción contextual y parámetros de publicación actuales.
- [ ] Mantener Inbox de aprobación, rechazo y asociación a vehículo/tutorial.
- [ ] Mantener reproductor y vídeos de PyS/tutoriales.
- [ ] No exponer OAuth token ni URL temporal en logs o configuración.
- [ ] Verificar identidad/permisos del flujo directo desde frontend.

**Aceptación:** el usuario puede subir, pausar, reanudar, someter, aprobar/rechazar y reproducir vídeos como hoy.

### MIG-017 — Herramientas y operaciones de Drive
**Estado: PENDIENTE**
- [ ] Mantener comandos `dir`, `cd`, `mkdir`, `tree`, `move` y navegación.
- [ ] Mantener creación/organización de carpetas, mover/restaurar/eliminar archivos.
- [ ] Mantener backups/restauración de Drive y auditorías de imágenes.
- [ ] Mantener métricas de almacenamiento y URLs de descarga.
- [ ] Preservar propietario, permisos y restricciones de acciones destructivas.
- [ ] Probar con recursos Beta aislados.

**Aceptación:** todas las operaciones de Drive siguen disponibles con la misma matriz RBAC.

---

## Fase 5 — Funciones de plataforma, administración y métricas

### MIG-018 — Modelos, cortes, VIN y contribuciones
**Estado: PENDIENTE**
- [ ] Mantener creación/edición de modelos y cortes, identificadores y contribuciones.
- [ ] Mantener sugerencias, proyecciones, duplicados, VIN y sus reglas de privacidad.
- [ ] Mantener operaciones suplementarias y validaciones de esquema.
- [ ] Probar búsqueda y navegación por modelo/versión/año.

### MIG-019 — PyS, tutoriales y feedback
**Estado: PENDIENTE**
- [ ] Mantener alta/edición/eliminación de problemas, soluciones y prevención.
- [ ] Mantener asociación/desasociación bidireccional de vehículos.
- [ ] Mantener tutoriales, sugerencias, reportes, likes, vistas y formularios.
- [ ] Mantener límites de texto, vídeos, imágenes y estados.

### MIG-020 — Inbox completo
**Estado: PENDIENTE**
- [ ] Mantener conversaciones, mensajes, destinatarios y respuestas.
- [ ] Mantener categorías, plantillas, borradores, búsqueda y paginación.
- [ ] Mantener recibidos/no leídos/enviados/archivados, contador y acciones de estado.
- [ ] Mantener cierre y eliminación con permisos actuales.
- [ ] Mantener logs y notificaciones críticas.

### MIG-021 — Métricas, estados y monitoreo
**Estado: PENDIENTE**
- [ ] Mantener `ping` y escaneo de conectividad de todos los servicios.
- [ ] Mantener estado, latencia en ms y errores por servicio.
- [ ] Mantener métricas de tráfico y almacenamiento.
- [ ] Mantener métricas de usuarios, actividad, logs y auditoría.
- [ ] Mantener paneles, gráficas, estados vacíos y exportaciones existentes.
- [ ] Evitar que las métricas añadan viajes de red o escrituras síncronas a acciones normales.

### MIG-022 — Administración de Spreadsheet y mantenimiento
**Estado: PENDIENTE**
- [ ] Mantener creación de hojas y columnas.
- [ ] Mantener fórmulas, migraciones de esquemas, identificadores y rollback.
- [ ] Mantener reorganización, normalización, saneamiento y purgado autorizado.
- [ ] Mantener backup/restauración de base de datos.
- [ ] Mantener herramientas de desarrollador y consola.

### MIG-023 — Catálogo, cachés y experiencia de usuario
**Estado: PENDIENTE**
- [ ] Mantener snapshot/delta, cursor, caché IndexedDB y arranque cache-first.
- [ ] Mantener navegación, búsqueda, modal de detalle, impresión y QR.
- [ ] Mantener modo oscuro, PWA, estados de carga/error y accesibilidad.
- [ ] Mantener funcionamiento parcial cuando un servicio independiente no esté disponible.
- [ ] Verificar que IndexedDB/miniaturas no bloqueen módulos independientes.

---

## Fase 6 — Retirada de arquitectura antigua

### MIG-024 — Eliminar SharedMutation
**Estado: PENDIENTE**
- [ ] Confirmar que todos los consumidores fueron migrados.
- [ ] Retirar wrappers, archivos duplicados, endpoints y propiedades relacionadas.
- [ ] Ejecutar búsqueda global y suite de regresión.
- [ ] No eliminar código que tenga otra función no cubierta.

### MIG-025 — Eliminar COORDINATOR
**Estado: PENDIENTE**
- [ ] Confirmar que sesiones, revocaciones, métricas y operaciones protegidas tienen sustituto.
- [ ] Confirmar que el frontend realiza las llamadas directas necesarias.
- [ ] Retirar endpoint, fuente, guía y referencias.
- [ ] Confirmar que ningún servicio consulta su URL o propiedades.

### MIG-026 — Eliminar configuración local de todos los servicios
**Estado: PENDIENTE**
- [ ] Retirar lecturas/escrituras de ScriptProperties/UserProperties/DocumentProperties para configuración de GPSpedia.
- [ ] Retirar URLs e IDs de otros servicios y recursos.
- [ ] Migrar valores a Spreadsheet y probar caché.
- [ ] Mantener únicamente requisitos técnicos del manifiesto que no constituyan configuración funcional y documentarlos.
- [ ] Buscar patrones residuales en todo el repositorio.

**Aceptación:** búsqueda estática global sin configuración local prohibida.

---

## Fase 7 — Verificación y despliegue

### MIG-027 — Suite de paridad de las funciones existentes
**Estado: PENDIENTE**
- [ ] Construir pruebas de contrato para todas las acciones.
- [ ] Comparar payloads, respuestas, errores, roles y efectos sobre datos.
- [ ] Cubrir cada grupo de funciones de MIG-015 a MIG-023.
- [ ] Confirmar que no desapareció ningún control visible ni acción manual.

### MIG-028 — Seguridad, rendimiento y regresión
**Estado: PENDIENTE**
- [ ] Ejecutar sintaxis, pruebas unitarias, contratos y regresión.
- [ ] Probar sesiones/revocaciones, roles y operaciones concurrentes.
- [ ] Comparar latencias contra MIG-005.
- [ ] Probar fallos de Spreadsheet, caché, endpoint y servicios parciales.
- [ ] Verificar que no se agregan revalidaciones o viajes de red a acciones ordinarias.

### MIG-029 — Guía de despliegue simplificada
**Estado: PENDIENTE**
- [ ] Reescribir la guía para que desplegar no requiera agregar/editar propiedades.
- [ ] Documentar únicamente pasos reales y necesarios por proyecto.
- [ ] Registrar cómo se publica una nueva URL en la configuración central, si el diseño mantiene varios deployments.
- [ ] Verificar que cambiar un servicio no exige redesplegar los demás.
- [ ] Añadir procedimiento de rollback.

### MIG-030 — Validación Beta integral
**Estado: PENDIENTE**
- [ ] Preparar comandos de sincronización Beta conforme a NORMAS §5.
- [ ] Probar login, catálogo, usuarios, modelos, imágenes, vídeos, Drive, PyS, tutoriales, Inbox, métricas, administración, backups y restauración.
- [ ] Probar roles autorizados/no autorizados.
- [ ] Registrar evidencia, tiempos, recursos de prueba y resultados.
- [ ] No declarar funciones probadas sin invocación real.

**Aceptación final:** las 30 tareas cerradas según sus criterios; ninguna función perdida; cero configuración local prohibida; despliegue simplificado y rendimiento no inferior a la línea base.


#### Trazabilidad de acciones completada en primera pasada — 2026-11-23

- Se generó en `MATRIZ_MIGRACION_SERVICIOS.md` una tabla de **120 acciones → servicio → handler → consumidor localizado**. Las 120 acciones tienen handler o ejecución inline identificada; no hay acciones del mapa sin dispatcher/handler en esta extracción.
- Se identificaron **12 acciones sin consumidor directo localizado** en los módulos frontend inspeccionados. Quedan para clasificación como manuales, internas, indirectas o históricas; no se autoriza retirarlas por ese motivo.
- Se inventariaron aparte las 13 operaciones internas de Coordinator y las rutas internas de caché de actor en USERS/WRITE/FEEDBACK/ADMIN. Se verificaron además las llamadas ADMIN→CATALOG (`getVehicleProjection`, `getContributionCandidates`) y ADMIN→WRITE (`allocateVehicleId`, `freezeCortesIds`).
- Se documentó la diferencia de transporte de `getCatalogChanges`: el flujo incremental frontend usa GET `catalogFeed=1` en FEEDBACK y Coordinator, aunque existe también el handler POST de FEEDBACK.
- La prueba `ActionDispatchContract.js` ejecutada sobre fuentes exactas de la rama sigue en **12/12 PASS**.

**MIG-001 sigue EN PROGRESO**: falta asociar las 120 acciones y 19 categorías CAP con payload/response, RBAC exacto, hojas/columnas, archivos/Drive, APIs externas, procesos manuales/programados y pruebas específicas de paridad.


#### RBAC y contratos de acceso — primera pasada 2026-11-23

- Se documentó en la matriz la política por servicio y grupos de acciones: AUTH, USERS, CATALOG, WRITE, FEEDBACK, ADMIN, UTILITIES y Coordinator.
- Se confirmó que `checkOperation` no exige actor ni lease por diseño: usa `opId` aleatorio de 128 bits y devuelve metadatos mínimos; `CheckOperationSecurity.js` lo prueba expresamente. No se modificará ese contrato durante la migración.
- Se documentó la jerarquía de destinatarios Inbox y los controles de participante.
- Hallazgo de configuración: `getContributionCandidates` puede devolver metadatos internos de inventario de imágenes solo con un secreto de CATALOG almacenado en ScriptProperties; migrar el secreto sin exponerlo al frontend.

**MIG-001 permanece EN PROGRESO**: falta completar payloads/respuestas, errores, hojas/columnas, recursos Drive/APIs, triggers/procesos manuales y pruebas de paridad.


#### Pruebas de contrato y preservación ejecutadas — 2026-11-23

Se ejecutaron suites existentes con el código fuente exacto recuperado de `GPSpedia2.2.5_work`, usando los mismos argumentos de entrada definidos por `RunServiceTests.mjs`:

| Suite | Aprobadas | Fallidas |
|---|---:|---:|
| `ActionDispatchContract.js` | 12 | 0 |
| `CheckOperationSecurity.js` | 8 | 0 |
| `SharedMutationCoordinator.js` | 94 | 0 |
| `UsersAtomicMutations.js` | 16 | 0 |
| `WriteAuthorizationContracts.js` | 10 | 0 |
| `WriteAuthorizationMinimization.js` | 15 | 0 |
| `AddSupplementaryInfoIntegrity.js` | 61 | 0 |
| `VinAuthoritativeValidation.js` | 12 | 0 |
| `UtilitiesSecurity.js` | 19 | 0 |
| **Total de aserciones ejecutadas** | **247** | **0** |

Estas pruebas cubren contratos de acciones, RBAC, actor/sesión, leases, coordinación, usuarios, WRITE, aportes suplementarios, VIN y UTILITIES. El total representa aserciones reportadas por las suites (no necesariamente 247 casos funcionales independientes). No se ejecutó el runner Node.js completo `RunServiceTests.mjs`, no se ejecutaron todas las pruebas del repositorio y no se invocaron deployments reales, Spreadsheet ni Drive. No interpretar este resultado como validación Beta.


#### Acciones fuera del mapa y rutas internas — 2026-11-23

- Completada la extracción de acciones de los dispatchers y ramas previas a cada `doPost` frente a las 120 claves de `ACTION_TO_SERVICE_MAP`.
- No se encontró acción del mapa sin ruta backend. Se documentaron 2 acciones internas de caché de actor en cada uno de USERS/WRITE/FEEDBACK/ADMIN (8 rutas de servicio) y las 13 acciones privadas de Coordinator.
- Se documentaron GET `catalogFeed=1`, respuestas `debug=true`, diagnóstico CATALOG, compatibilidad CATALOG `getSuggestion`, rechazos ADMIN `ACTION_MOVED_TO_WRITE` y ruta directa de UTILITIES.
- La extracción estática confirma 120 acciones únicas y 0 acciones mapeadas sin router/handler. Las 12 acciones sin consumidor directo localizado siguen pendientes de clasificación y no se retiran.

**MIG-001 continúa EN PROGRESO**: quedan inventario manual/histórico, contratos completos por acción, RBAC individual, datos/columnas, Drive/APIs, triggers y pruebas específicas de paridad.


#### Clasificación inicial de las 12 acciones sin consumidor directo — 2026-11-23

Se revisó el propósito de los 12 handlers sin llamada directa localizada: actividad de sesión (`touchSession`), diagnóstico PBKDF2 (`benchmarkPasswordKdf`), datos de navegación (`getNavigationData`), estados/ocultación por participante de Inbox (`markInboxUnread`, `deleteInboxConversation`), mantenimiento de timestamps, esquema AportesVehiculo, migración/rollback de identificadores, reconciliación de cargas y creación de hojas/columnas. El detalle y las precauciones están en §13 de la matriz.

Se confirmó que `migrateVehicleContributionsSchema` también se invoca internamente cuando el flujo de candidatos necesita crear/verificar el ledger; no es solo una acción manual. `deleteInboxConversation` oculta por participante y conserva el historial, no borra mensajes físicamente. Las migraciones mantienen dry-run/confirmación, snapshots, digest y rollback según el caso.

La clasificación es provisional. Aún falta buscar comandos de terminal, documentación histórica y jobs/triggers antes de cerrar el inventario manual. MIG-001 sigue EN PROGRESO.


#### Terminal de desarrollador y triggers — revisión parcial 2026-11-23

- Inventariados los comandos de `driveCommand`: `dir/ls`, `cd`, `cd ..`, retorno a raíz, `mkdir`, `move` y `tree`. Se documentaron las restricciones al árbol Cortes y la ausencia de comando de borrado en el dispatcher revisado.
- Búsqueda estática de triggers en los módulos backend/frontend principales indicados en §13.2: no se encontraron declaraciones `newTrigger`, `timeBased`, `onOpen` ni `onEdit` en ese conjunto. No se extiende la conclusión al repositorio completo ni a deployments.
- Pendiente: revisar archivos de raíz/manifiestos y configuración de proyectos Apps Script para descubrir triggers instalados, jobs y tareas manuales fuera de esos módulos.


#### Contratos AUTH — primera pasada 2026-11-23

- Extraídos campos de payload de las 15 acciones AUTH y documentadas respuestas, errores representativos, roles y hojas en §14 de la matriz.
- Diferenciado contexto de sesión (`userId/sessionToken`) de los campos de negocio. Registradas recuperación genérica anti-enumeración, aceptación de términos por dispositivo, revocación de sesiones y migración de hashes heredados con dry-run/confirmación.
- Pendiente completar estructura exacta de perfiles/respuestas, columnas físicas por acción y secuencias Coordinator. Este trabajo inicia la matriz contractual servicio por servicio; no cierra MIG-001.


#### Contratos USERS y WRITE — primera pasada 2026-11-23

- Extraídos los 3 contratos USERS: campos permitidos de alta, perfil propio, filtrado jerárquico, secuencia de IDs y hojas/configuración relacionadas.
- Extraídos los 9 contratos WRITE: payloads de consultas, operaciones idempotentes, alta/edición de cortes, aportes suplementarios, VIN, reserva de ID y congelación de fórmulas.
- Documentadas las invariantes críticas: checkOperation sin sesión/lease y respuesta mínima; actor confiable en escrituras; ledgers append-only, hashes, reintentos, VIN por versión, Drive/imágenes y separación del flujo de vídeo.
- Detalle en §§15–16 de la matriz. Pendiente completar columnas/rangos, errores exhaustivos, pruebas por acción y efectos de Drive/ledger.


#### Pruebas locales de contratos USERS/WRITE — 2026-11-23

Ejecutadas sobre las fuentes exactas de `GPSpedia2.2.5_work`:

| Suite | PASS | FAIL |
|---|---:|---:|
| `UsersAtomicMutations.js` | 16 | 0 |
| `WriteAuthorizationContracts.js` | 10 | 0 |
| `WriteAuthorizationMinimization.js` | 15 | 0 |
| `AddSupplementaryInfoIntegrity.js` | 61 | 0 |
| `VinAuthoritativeValidation.js` | 12 | 0 |
| `CheckOperationSecurity.js` | 8 | 0 |
| `ActionDispatchContract.js` | 12 | 0 |
| **Total** | **134** | **0** |

Las 134 aserciones reportadas por estas suites pasaron; no equivalen necesariamente a 134 escenarios funcionales independientes. Se probaron mutaciones/lecturas de USERS, RBAC y minimización de autenticación WRITE, integridad de aportes, VIN, contrato de checkOperation y mapa de acciones. No se invocaron deployments, Spreadsheet, Drive ni datos reales; no es validación Beta.



#### Mapa físico de datos AUTH / USERS / WRITE — avance 2026-11-23

- Se documentaron en §17 de `MATRIZ_MIGRACION_SERVICIOS.md` los mapas de columnas de Users (A:I), ActiveSessions (A:G), Logs (A:D) y Cortes (A:AV), además de los esquemas explícitos de Idempotencia, CortesIdReservations, AportesVehiculo, ImageUploadEvents y __IdentifierSequenceConfig__.
- Se registró que AUTH define ActiveSessions hasta G (`SessionTermsAcceptance`) mientras USERS solo declara A:F; la unificación debe preservar G y consolidar un único esquema.
- Se documentaron las columnas AQ:AS sin campo declarado, AT:AV para los indicadores de testigo y la resolución dinámica de VIN por encabezado, sin inferir posiciones ni mover datos.
- Los mapas proceden de constantes y operaciones del código fuente de la rama. No se inspeccionó una Spreadsheet real; por tanto, la coincidencia de encabezados/datos Beta sigue sin verificar.
- No se modificó código, estructura de hojas, deployments ni datos. MIG-001 permanece **EN PROGRESO**.

**Siguiente tramo de MIG-001:** continuar el mismo inventario para FEEDBACK, CATALOG, ADMIN y UTILITIES; completar los contratos de datos/columnas y dependencias Drive/APIs; revisar manifiestos y posibles triggers/jobs fuera de los módulos ya inspeccionados; después asociar pruebas de paridad por acción.



**Aclaración de esquema VIN:** al revisar el README completo se encontró que documenta VIN en AQ (43), con AR:AS disponibles, mientras WRITE resuelve la columna dinámicamente por encabezado. Se añadió la discrepancia a §17.8 de la matriz; su resolución requiere verificar la hoja real y `renameVinColumnHeader`, sin mover columnas por inferencia.



#### Esquemas FEEDBACK / CATALOG / ADMIN / UTILITIES / Inbox — avance 2026-11-23

- Se amplió §18 de la matriz con los mapas de LogosMarca, Tutorial, Relay, Feedbacks, Contactanos, ActividadUsuario, PyS, operaciones PyS, eventos de tutorial/vídeo, imágenes de reportes y las cinco tablas Inbox.
- Se registraron los diarios administrativos AdminImageUploads, ImageUploadLedger, ImageUploadEvents, AportesVehiculo, manifiestos de migración y hojas de idempotencia.
- Se identificaron hojas adicionales cuyos encabezados siguen pendientes: FeedbackLikes, FeedbackYearApplications, FeedbackYearApplicationEvents, AdminState e Imagenes_Reemplazadas; también faltan las hojas dinámicas creadas por acciones ADMIN.
- Se confirmó por inspección que ADMIN conserva URLs constantes de AUTH, USERS, WRITE, CATALOG y FEEDBACK y wrappers con UrlFetchApp.fetch. Coordinator mantiene propiedades para leases, contexto/sesiones, revisiones/eventos de catálogo y tráfico. UTILITIES conserva dependencia del actor/contexto de Coordinator.
- Estos puntos se registran como dependencias para MIG-003/MIG-004/MIG-011; no se modificaron servicios, endpoints, propiedades ni datos.
- No se inspeccionaron hojas reales ni se ejecutaron Apps Script. Los encabezados son contratos extraídos del código.
- MIG-001 permanece **EN PROGRESO**.

**Siguiente tramo:** extraer los esquemas pendientes de FEEDBACK/ADMIN y UTILITIES, detallar las hojas staging/backup y operaciones por acción; después completar inventario de UI/consumidores, integraciones externas y triggers/manifiestos antes de cerrar MIG-001.



**Ampliación del inventario de esquemas — 2026-11-23**
- Se completaron los encabezados de FeedbackLikes (A:G), FeedbackYearApplications (A:P, con extensión M:P), FeedbackYearApplicationEvents (A:E), AdminState (A:F) e Imagenes_Reemplazadas (A:K más 16 columnas añadidas por encabezado).
- La revisión de `ADMIN_RESTORE_REQUIRED_SCHEMA_` encontró diferencias frente a los mapas de escritura: ActiveSessions restaura/valida A:F mientras AUTH usa G; Cortes enumera A:AP y no incluye VIN ni AT:AV; Logs nombra la columna D `Data` mientras AUTH la utiliza para detalles JSON.
- Se registraron en §18.9 de la matriz como discrepancias que requieren pruebas de backup/restore aisladas; no se modificaron datos ni esquemas.
- MIG-001 continúa **EN PROGRESO**: falta trazabilidad por acción, rangos completos de restauración, UI/consumidores y procesos programados.



#### Cierre MIG-001 — inventario integral y validación diferida — 2026-11-23

Se completó la reconciliación estática de todas las acciones, handlers, rutas internas, consumidores, capacidades, datos e integraciones. Evidencia consolidada en §19 de `MATRIZ_MIGRACION_SERVICIOS.md`:

- Árbol Git de 615 rutas, sin truncamiento; 10 archivos backend con 1,041 funciones nombradas; 37 módulos frontend y las tres superficies HTML.
- 120/120 acciones del mapa con ruta backend/handler; CATALOG conserva una ruta adicional de compatibilidad `getSuggestion`.
- 13 operaciones internas de Coordinator y 8 rutas privadas de caché de actor documentadas.
- 12 acciones sin consumidor directo clasificadas como compatibilidad, diagnóstico, mantenimiento o brecha UI; todas conservadas y vinculadas a pruebas representativas.
- Trazabilidad de CAP-01 a CAP-19, RBAC, contratos de entrada/salida, hojas/rangos, recursos Drive, APIs externas, propiedades de configuración y estado operativo.
- Revisión de terminal de desarrollador, comandos, backups/restauración, migraciones, reconciliación, rutas GET, workflows y manifiestos.
- `JS/Tests/` contiene 373 entradas; el runner registra 270 archivos CLI únicos y 31 ejecuciones/assertions `recordResult` en ocho grupos. Se documentaron workflows y pruebas representativas por capacidad.
- No hay manifiestos de Apps Script ni archivos `.gs`/clasp versionados; no se detectaron declaraciones de triggers en los diez archivos backend revisados. Los triggers instalados y las configuraciones externas solo se pueden confirmar en los proyectos desplegados.

**Resultado:** MIG-001 se marca **COMPLETADA CON VALIDACIÓN DIFERIDA**. No se modificó código funcional, endpoints, propiedades, deployments ni datos. Las verificaciones de proyectos Apps Script, triggers instalados, Spreadsheet/Drive aislados, OAuth, YouTube y despliegues quedan para Beta/MIG-027/MIG-028. No se presentan como ejecutadas.


#### Cierre MIG-002 — 2026-11-23

- Inventario completo en `INVENTARIO_PANTALLAS_CAPACIDADES.md`: 17 superficies de UI; 335 declaraciones de controles/enlaces/formularios en HTML activo y plantillas dinámicas; 37 módulos frontend y tres hojas CSS.
- Se trazaron controles de App Shell/login/recuperación, catálogo/ficha, alta de cortes, tutoriales, Relay, PyS, Inbox, Dashboard, Developer Tools, biblioteca y auditoría Drive, usuarios, YouTube, legales, contacto, impresión, Lightbox y editores.
- Se relacionaron handlers cliente, acciones backend/locales, restricciones por rol y pruebas existentes por superficie.
- Se documentaron estados de carga, vacío, éxito, error, progreso, reintento, pausa, cancelación y recuperación realmente implementados.
- Se registraron las limitaciones de cobertura: las pruebas son mayoritariamente por flujo/contrato, no una prueba de clic por cada botón; About/FAQ/changelog y la interacción visual de Contacto tienen cobertura genérica/indirecta, no una suite visual dedicada. No se afirma cobertura que no existe.
- Se relacionó el inventario con BETA-01 a BETA-08. Las validaciones de navegador/dispositivo real, despliegues, Apps Script, Spreadsheet/Drive, OAuth y YouTube se reservan para Beta.
- No se modificó código funcional, endpoints, RBAC, datos, Spreadsheet, Drive ni deployments.

**Resultado:** MIG-002 COMPLETADA CON VALIDACIÓN DIFERIDA.

#### Cierre MIG-003 — 2026-11-23

- Diez módulos backend activos inspeccionados; siete usan ScriptProperties y tres no presentan uso.
- Se identificaron 26 familias de claves de ScriptProperties. No se encontraron usos de UserProperties ni DocumentProperties en los módulos revisados.
- Se clasificaron claves y prefijos dinámicos por configuración, secreto, sesión, idempotencia, contador, auditoría, estado operativo, feed y métricas.
- Se localizaron siete endpoints frontend, cinco URLs internas duplicadas en ADMIN, un ID de Spreadsheet repetido en siete servicios y un ID de carpeta Cortes repetido en tres.
- Se clasificaron parámetros operativos y límites relevantes, valores de protocolo/seguridad que no deben hacerse editables, cachés separadas y OAuth de ejecución.
- Se definieron destinos de Spreadsheet y criterios de retiro sin crear hojas ni modificar consumidores.
- No se accedió a los valores reales de propiedades instaladas ni a manifiestos/scopes de Apps Script desplegados; quedan para Beta.
- No se modificó código funcional, propiedades, endpoints, Spreadsheet, Drive ni deployments.

**Resultado:** MIG-003 COMPLETADA CON VALIDACIÓN DIFERIDA.