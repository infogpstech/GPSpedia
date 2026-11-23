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
**Estado: EN PROGRESO**
- [x] Contrastar las 120 acciones de `ACTION_TO_SERVICE_MAP` con los routers reales.
- [x] Extraer acciones aceptadas por cada `doPost` que no estén en el mapa frontend.
- [ ] Inventariar funciones internas, acciones manuales, endpoints de mantenimiento y compatibilidad histórica.
- [ ] Registrar para cada acción: handler, consumidores UI, payload, respuesta, errores, rol/RBAC, hojas/archivos, dependencias y pruebas.
- [ ] Detectar handlers sin consumidores y consumidores sin handler, sin eliminar ninguno.

**Aceptación:** matriz completa acción → handler → consumidor → permiso → datos → pruebas.

#### Evidencia de revisión estática inicial — 2026-11-23

- Se leyó el mapa completo `ACTION_TO_SERVICE_MAP`: 120 claves únicas distribuidas en AUTH (15), CATALOG (5), WRITE (9), USERS (3), FEEDBACK (41), UTILITIES (1) y ADMIN (46). La matriz coincide con el mapa efectivo.
- Se contrastaron las acciones con los dispatchers: AUTH 15; USERS 3; WRITE 9; CATALOG 5 acciones canónicas más la compatibilidad `getSuggestion`; FEEDBACK 41; ADMIN 46; UTILITIES 1 acción atendida por su router directo (fuera de un `switch`). No se identificó en esta pasada una acción canónica del mapa sin handler.
- Se ejecutó `JS/Tests/ActionDispatchContract.js` con las fuentes exactas recuperadas de esta rama y con el mismo conjunto de consumidores que usa `RunServiceTests.mjs`: **12/12 PASS**. Esto valida mapa, handlers, consumidores versionados, compatibilidades, endpoint, rutas retiradas y división RBAC de ADMIN. No equivale a ejecutar el runner Node.js completo ni pruebas remotas.
- Se identificaron rutas internas fuera del mapa público: acciones de Coordinator (leases, sesiones, cachés, feed y tráfico), `__invalidateSessionActorCache` y `__primeSessionActorCache` en USERS/WRITE/FEEDBACK/ADMIN, además de rutas de compatibilidad/rechazo en CATALOG y ADMIN. Deben incluirse en el inventario, no descartarse como acciones sin uso.
- Se inspeccionaron consumidores frontend representativos: `main.js`, `ui.js`, `auth.js`, `youtubeUpload.js`, `pys-data.js`, `HTML/add_cortes.html`, `HTML/users.html` e `index.html`. La suite de contrato consume además `api-config.js`, `add_cortes.html`, `auth.js`, `main.js`, `pys-data.js`, `ui.js`, `users.html` y `youtubeUpload.js`. Recuento estático inicial: `index.html` 113 botones/5 formularios/278 IDs; `ui.js` 42 plantillas de botón/8 formularios/138 IDs únicos; `add_cortes.html` 17 botones/3 formularios/61 IDs; `users.html` 9 botones/3 formularios/29 IDs únicos. `ui.js` concentra administración, Drive, imágenes, PyS, VIN e Inbox; el trazado control→acción→handler→RBAC→datos→prueba sigue incompleto.
- Se revisaron también políticas RBAC de AUTH, USERS, WRITE, FEEDBACK, ADMIN, UTILITIES e Inbox: roles jerárquicos de administración de usuarios, límites de edición modal, acciones exclusivas de Desarrollador, acciones públicas/anónimas y jerarquía de destinatarios Inbox. Falta asociar cada acción a su regla exacta y a sus datos.
- No se modificó código funcional ni deployments. Se ejecutó únicamente la prueba de contrato estático indicada (12/12 PASS); no se ejecutó `RunServiceTests.mjs`, Node.js CLI ni pruebas remotas.

**Resultado:** MIG-001 permanece **EN PROGRESO**. La comprobación del mapa y de los dispatchers está avanzada; falta completar consumidores/control UI, acciones manuales e internas, contratos de payload/respuesta, RBAC, hojas/archivos y cobertura de pruebas.


### MIG-002 — Inventario de pantallas y capacidades visibles
**Estado: PENDIENTE**
- [ ] Recorrer HTML/JS/CSS y listar cada pantalla, modal, botón, menú, formulario, comando, selector y estado.
- [ ] Registrar estados de carga, vacío, éxito, error, progreso, cancelación, pausa y reanudación.
- [ ] Cubrir catálogo, modelos/cortes, VIN, imágenes, vídeos, tutoriales, PyS, feedback, Inbox, administración y herramientas de desarrollador.
- [ ] Relacionar cada control con las acciones/handlers que ejecuta.

**Aceptación:** no queda control visible sin trazabilidad funcional y prueba.

### MIG-003 — Inventario de configuración en backend
**Estado: PENDIENTE**
- [ ] Buscar todos los usos de `PropertiesService`, ScriptProperties, UserProperties y DocumentProperties.
- [ ] Clasificar cada clave: URL, ID de Spreadsheet/Drive, secreto, OAuth, parámetros, feature flags, caché, estado de negocio o dato temporal.
- [ ] Buscar URLs de Apps Script, IDs de recursos y secretos incrustados en constantes o archivos.
- [ ] Distinguir configuración de GPSpedia de valores técnicos obligatorios del manifiesto de Apps Script.
- [ ] Identificar quién lee/escribe cada clave y cuándo se crea automáticamente.

**Aceptación:** inventario de todas las claves/constantes y destino Spreadsheet; ninguna clave se borra antes de migrar sus consumidores.

### MIG-004 — Inventario de llamadas entre servicios y SharedMutation
**Estado: PENDIENTE**
- [ ] Buscar `UrlFetchApp.fetch`, wrappers HTTP y llamadas indirectas a endpoints Apps Script.
- [ ] Identificar llamadas de ADMIN a WRITE/CATALOG y otras dependencias no detectadas.
- [ ] Enumerar todas las funciones de `SharedMutationClient.js` y sus consumidores por servicio.
- [ ] Mapear capacidades de COORDINATOR: sesiones, revocaciones, cachés, leases, feed incremental, telemetría y operaciones protegidas.
- [ ] Separar operaciones que el frontend puede coordinar de operaciones que deben ser una única escritura atómica en Spreadsheet.

**Aceptación:** ninguna llamada backend→backend sin propietario, reemplazo y prueba definidos.

### MIG-005 — Línea base funcional y de rendimiento
**Estado: PENDIENTE**
- [ ] Ejecutar la suite local disponible y guardar resultado inicial.
- [ ] Registrar latencia de arranque/login/catálogo/Inbox y operaciones frecuentes cuando haya entorno autorizado.
- [ ] Registrar tamaño/tiempo de snapshot y deltas del catálogo.
- [ ] Medir tiempos de carga de imagen/vídeo y operaciones de Drive.
- [ ] Registrar estado de cachés, número de llamadas y lecturas/escrituras de Spreadsheet.
- [ ] No inventar mediciones de Beta si no se ejecutan.

**Aceptación:** línea base con resultados medidos y limitaciones explícitas.

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
