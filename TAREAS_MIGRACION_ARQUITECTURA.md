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
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Contrastar las 121 acciones de `ACTION_TO_SERVICE_MAP` con los routers reales.
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
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Recorrer HTML/JS/CSS activos y listar pantallas, modales, controles, comandos, selectores y estados.
- [x] Registrar estados de carga, vacío, éxito, error, progreso, cancelación, pausa y reanudación donde están implementados.
- [x] Cubrir catálogo, ficha/modelos/cortes, VIN, imágenes, vídeos, tutoriales, Relay, PyS, feedback, Inbox, Dashboard, administración, usuarios y Developer Tools.
- [x] Relacionar los grupos de controles con handlers cliente, acciones backend/locales, condiciones de rol y pruebas automatizadas existentes.
- [x] Distinguir pruebas directas de UI, contratos/regresiones de backend y validaciones de navegador/Beta; documentar expresamente la cobertura indirecta y las brechas sin presentarlas como aprobadas.

**Aceptación:** inventario de pantallas y controles con trazabilidad funcional y de pruebas en `INVENTARIO_PANTALLAS_CAPACIDADES.md` §§2–7. Las validaciones reales de navegador/dispositivos y servicios externos quedan para Beta; no bloquean el cierre del inventario estático.

### MIG-003 — Inventario de configuración en backend
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (2026-11-23)**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Buscar los usos de PropertiesService/ScriptProperties/UserProperties/DocumentProperties en los diez módulos backend activos.
- [x] Clasificar las 26 familias de claves persistentes: endpoints, secretos, parámetros, idempotencia/login, revocación, contadores, auditoría, estado de Drive, sesiones, feed incremental y telemetría.
- [x] Identificar IDs de Spreadsheet/Drive, siete endpoints de entrada y cinco URLs duplicadas en ADMIN.
- [x] Distinguir configuración GPSpedia, estado operativo/caché, secretos OAuth de ejecución, protocolos externos y valores técnicos del manifiesto Apps Script no versionado.
- [x] Identificar lectores/escritores, generación automática, TTL/retención y destino o criterio de retiro de cada familia.
- [x] Proponer hojas destino sin crear hojas ni alterar proyectos, y registrar dependencias de bootstrap, seguridad y paridad.

**Aceptación:** inventario estático completo en `INVENTARIO_CONFIGURACION_BACKEND.md`; ninguna clave fue eliminada ni migrada. Los valores reales de proyectos desplegados y sus scopes quedan para Beta; el acceso a Spreadsheet sin bootstrap queda para MIG-006.

### MIG-004 — Inventario de llamadas entre servicios y SharedMutation
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (2026-11-23)**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
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
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
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
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (2026-11-23)**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Inspeccionar los siete servicios que usan SPREADSHEET_ID/openById y confirmar que InboxConversations no abre la hoja directamente.
- [x] Preparar un probe Apps Script con GET read-only, UI Web App y POST de escritura limitada a una hoja reservada; sin ID, PropertiesService, UrlFetchApp ni credenciales.
- [x] Añadir harness local que cubre contexto nulo/activo, UI, lectura sin escritura, confirmación obligatoria, escritura acotada y lectura posterior.
- [x] Evaluar proyectos independientes, consolidación y alternativas de bootstrap; no seleccionar una opción sin evidencia Web App.
- [x] Documentar permisos, cuotas, concurrencia, límites, facilidad de despliegue y procedimiento Beta.
- [x] Registrar la aclaración: coordinación de flujos en frontend; comunicación directa entre servicios permitida cuando sea necesaria, sin secretos/keys manuales entre servidores.
- [ ] Ejecutar el probe en una Web App real, con Spreadsheet desechable y permisos equivalentes al deployment: pendiente de Beta.
- [ ] Repetir en varios proyectos independientes y medir cuotas, concurrencia y latencia real: pendiente de Beta.

**Evidencia:** MIG006_SPREADSHEET_ACCESS_SPIKE.md y suite MIG006SpreadsheetAccessProbe (local). La simulación no se presenta como ejecución de Apps Script real.

**Aceptación local:** probe y pruebas reproducibles preparados y aprobados. La prueba Web App real y los límites externos quedan diferidos según NORMAS §5 y §10; no se reemplaza ningún acceso actual por getActiveSpreadsheet() sin evidencia del deployment.

### MIG-007 — Diseño del esquema central de configuración
**Estado: COMPLETADA**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Definir hojas de configuración con claves estables, tipos, valores, descripción, estado y versión.
- [x] Incluir endpoints de servicio, parámetros de negocio, límites y opciones hoy duplicadas en proyectos.
- [x] Separar proyecciones pública, backend y admin; documentar límites reales de permisos de lectura de Google Sheets.
- [x] Definir valores por defecto, validación, historial append-only y rollback mediante una revisión nueva.
- [x] Excluir tokens OAuth, contraseñas en texto plano, secretos de interconexión y secreto HMAC del esquema ordinario.
- [x] Definir caché por clase, caducidad y recuperación ante indisponibilidad.
- [x] Trazar las 26 familias de ScriptProperties, los siete endpoints, IDs de recursos y URLs internas duplicadas.

**Evidencia:** [ESQUEMA_CONFIGURACION_CENTRAL.md](./ESQUEMA_CONFIGURACION_CENTRAL.md), enlazado desde INVENTARIO_CONFIGURACION_BACKEND.md §8. Contrato estático: JS/Tests/MIG007ConfigurationSchemaContract.mjs.

**Límites:** no se crearon hojas ni se migraron valores; no se leyó PropertiesService real ni se cambió ningún deployment. El acceso Web App a Spreadsheet continúa pendiente de Beta conforme a MIG-006. La lectura/validación/cache y su implementación pertenecen a MIG-008.

**Aceptación:** diseño documentado y trazabilidad de claves completados, sin valores sensibles expuestos.

### MIG-008 — Lector central y caché de configuración
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Implementar lector Apps Script con SpreadsheetApp.getActiveSpreadsheet(), sin ID/URL bootstrap, PropertiesService ni fallback openById.
- [x] Validar control, schema_version, revisión activa, siete servicios, endpoints HTTPS únicos, contratos, parámetros, recursos, defaults opcionales y consistencia de lectura.
- [x] Publicar desde AUTH únicamente la proyección pública; no exponer recursos ni valores backend/admin.
- [x] Añadir proyección backend por servicio que no devuelve registro de servicios ni URLs de otros servicios.
- [x] Crear caché servidor con revisión, TTL de 5 min y última copia válida hasta 15 min; endpoints dejan de estar disponibles al superar 5 min.
- [x] Crear caché frontend cache-first, single-flight, invalidación y actualización explícita; no persiste datos restringidos ni tokens.
- [x] Evitar lecturas en cada acción ordinaria; el cargador se ejecuta bajo demanda y la integración del router queda para MIG-009.
- [x] Manejar falta/invalidez de Spreadsheet, revisión parcial, cambio durante lectura y endpoints inválidos con fail-closed.
- [x] Añadir pruebas locales de caché fría/caliente, expiración, recuperación, proyección, seguridad y consistencia.
- [ ] Validar getActiveSpreadsheet() y CacheService en Web App AUTH real, con Spreadsheet desechable y deployment restringido; ejecutar protocolo MIG-006 en Beta.

**Aceptación local:** el lector no contiene IDs, URLs de otros servicios, PropertiesService ni credenciales; la proyección pública solo entrega endpoints/valores públicos; la proyección backend no contiene URLs de servicios; el frontend no enruta con endpoints inválidos o vencidos.

**Límite:** la prueba Web App real de MIG-006 sigue pendiente. El lector falla cerrado si no existe contexto activo; no se sustituyó por un ID bootstrap ni se modificó el acceso de datos actual. No se crearon hojas, no se migraron valores y no se desplegó el código.



## Fase 2 — Frontend como router y coordinador único

### MIG-009 — Router de acciones basado en configuración
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (2026-11-23)**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Sustituir el mapa local de siete URLs por resolución desde la proyección pública central.
- [x] Mantener el mapa acción → servicio y los contratos payload/respuesta; conservar las 121 acciones.
- [x] Mantener caché cache-first/single-flight con refresco automático al vencer TTL; fallar cerrado sin fallback local.
- [x] Enrutar solicitudes POST, feed GET incremental y health checks mediante el registro central.
- [x] Mantener errores HTTP, red, JSON y aplicación y estados de error localizados.
- [x] Añadir pruebas de mapa, servicio destino, actualización, servicios deshabilitados/inválidos, vencimiento y ausencia de fallback.
- [x] Conservar un único localizador bootstrap AUTH, limitado a consultar la primera proyección central.
- [ ] Validar en Beta el cambio de URL desde Spreadsheet y la actualización automática desde navegador real; ejecutar health remoto manualmente tras desplegar getPublicConfiguration.

**Aceptación:** las 121 acciones, health checks y feed incremental usan destinos del registro central; no existen URLs locales para servicios ni fallback a valores anteriores; ante registro inválido, vencido o no disponible, el router no utiliza destinos antiguos. AUTH bootstrap es el único localizador de arranque y no actúa como fallback.

### MIG-010 — Orquestador frontend de operaciones multi-servicio
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA**

**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.

- [x] Implementar secuencias explícitas para los flujos que hoy resuelve ADMIN mediante llamadas internas: reorganización ADMIN→WRITE→ADMIN y lecturas directas frontend→CATALOG para proyección y candidatos.
- [x] Preservar orden, precondiciones, resultados, errores y recuperación; WRITE confirma la estabilización y ADMIN vuelve a validar respaldo/manifiesto/fórmulas antes de ordenar.
- [x] Trasladar a WRITE la creación de vehículos, reserva idempotente de IDs y recuperación de altas; ADMIN rechaza las rutas heredadas sin escribir ni coordinar servicios.
- [x] Usar identificadores de operación/idempotencia donde el flujo lo necesita: el respaldo de reorganización conserva operationId antes de la solicitud y ADMIN reutiliza el respaldo completo del mismo usuario.
- [x] Mostrar progreso y estado parcial sin bloquear módulos independientes; la reorganización registra etapa, porcentaje y errores.
- [x] Reanudar o permitir recuperación tras interrupción del navegador mediante estado local por usuario, backupId y operationId persistente.
- [x] No mover secretos ni decisiones de autorización al frontend; CATALOG valida localmente la sesión y los roles autorizados para la proyección; los candidatos siguen restringidos a Desarrollador.
- [x] Retirar las llamadas backend→backend de ADMIN a WRITE/CATALOG cubiertas por esta migración; el frontend coordina las solicitudes y cada receptor valida su propia sesión.

**Validación CI — 2026-11-23**
- GitHub Actions GPSpedia service regression tests: SUCCESS, run 45209447602.
- Regresión completa Node.js 22: 306 suites, 3,558 pruebas aprobadas, 0 fallos.
- JS/Tests/MIG010FrontendServiceOrchestration.mjs: 58/58 PASS; cubre secuencia, persistencia previa del operationId, recuperación/replay de respaldo, rechazo de replay por otro usuario, sesión vencida, roles y ausencia de backend→backend.
- Pruebas adicionales de WRITE, vinculación de imágenes, proyección CATALOG y contratos de compatibilidad incluidas en la regresión completa.
- Verificación sintáctica integral aprobada dentro del workflow.
- GitHub Pages build/deploy: SUCCESS, run 45209445911.

**Validación diferida a Beta**
- Pendiente ejecutar invocaciones reales frontend→ADMIN/CATALOG/WRITE con sesiones y recursos aislados, y confirmar permisos efectivos de Apps Script/Spreadsheet/Drive.
- No se desplegaron servicios Apps Script ni se modificaron endpoints instalados, PropertiesService, Spreadsheet, Drive o datos externos.

**Aceptación:** cumplida en código y regresión CI: las operaciones multi-servicio cubiertas se coordinan desde frontend, los servicios propietarios validan autorización localmente y no se usan llamadas backend→backend para estos flujos. Se cierra MIG-010 con validación real de Beta expresamente diferida.

### MIG-011 — Eliminar dependencias backend→backend de ADMIN
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (2026-11-23)**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Migrar consulta de proyección de vehículo a llamada directa frontend→CATALOG.
- [x] Migrar consulta de candidatos de contribución/inventario a llamada directa frontend→CATALOG.
- [x] Migrar delegaciones de cortes/IDs a llamadas directas frontend→WRITE cuando corresponda.
- [x] Preservar precondiciones, validaciones, rollback y resultados.
- [x] Retirar constantes URL internas solo tras comprobar referencias.

**Aceptación:** ADMIN no contiene URLs ni wrappers para otros servicios y sus herramientas mantienen paridad.

#### Evidencia de verificación MIG-011 — 2026-11-23
- La migración funcional de estas rutas quedó implementada durante MIG-010; MIG-011 verifica y formaliza su aceptación, sin duplicar ni rehacer los cambios.
- JS/Services/admin.js no contiene URLs de Apps Script, constantes de endpoints de AUTH/WRITE/CATALOG, wrappers de llamadas a esos servicios ni el secreto compartido ADMIN↔CATALOG.
- Las operaciones HTTP que permanecen en ADMIN corresponden a Google Drive API y recursos de imagen externos; están clasificadas en §7 de INVENTARIO_LLAMADAS_SERVICIOS.md y no son dependencias entre microservicios GPSpedia.
- JS/Frontend/api-config.js enruta getVehicleProjection y getContributionCandidates a CATALOG, y allocateVehicleId y freezeCortesIds a WRITE. Las secuencias de reorganización se coordinan en frontend.
- CATALOG mantiene autorización local: getVehicleProjection valida sesión y roles de edición permitidos; getContributionCandidates exige Desarrollador. ADMIN conserva precondiciones y validaciones propias antes de mutaciones.
- La cobertura existente está integrada en MIG010FrontendServiceOrchestration.mjs, ServiceCallGraphContract.mjs y las suites de proyección, candidatos, asignación de IDs y congelación de IDs. GitHub Actions Node.js 22 aprobó la regresión completa: 306 suites, 3,558 pruebas aprobadas y cero fallos. La suite MIG010FrontendServiceOrchestration pasó 58/58; ServiceCallGraphContract 9/9; AdminVehicleTargetedCatalogRead 3/3; AdminVehicleContributionCandidates 12/12; AdminCandidateImageInventoryCatalogSource 4/4; AdminVehicleIdAllocationIdempotency 1/1; VehicleIdAllocationEndToEnd 1/1; WriteFreezeCortesIdsBackupOutsideLock 5/5.

---

## Fase 3 — Identidad, usuarios y sesión

 
**Cierre y validación diferida:** workflow https://github.com/infogpstech/GPSpedia/actions/runs/45212028964 (**SUCCESS**, commit `3ec8936d8b498d55bbc0322fa05239f8b812d0c8`). La verificación sintáctica del workflow también aprobó. GitHub Pages build/deploy: https://github.com/infogpstech/GPSpedia/actions/runs/45212025471 (**SUCCESS**). Las invocaciones reales de Apps Script, sesiones/roles efectivos y permisos sobre Spreadsheet/Drive aislados permanecen PENDIENTES DE VALIDACIÓN BETA; no se simularon ni se desplegaron servicios.
### MIG-012 — Unificación funcional AUTH/USERS
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Integrar handlers de `getUsers`, `createUser` y `updateProfile` en AUTH.
- [x] Mantener contratos, campos, permisos, resultados, hash PBKDF2 y esquema de las hojas.
- [x] Actualizar el mapa frontend y el dispatcher para enrutar estas acciones a AUTH.
- [x] Conservar RBAC jerárquico, perfiles, generación secuencial de IDs, atomicidad, rollback y protección contra duplicados.
- [x] Sustituir la lease cruzada de `createUser` por ScriptLock local de AUTH, compartido con `deleteUser`.
- [x] Retirar USERS del mapa de servicios, health checks, telemetría, políticas Coordinator, precarga/invalidez de caché y configuración central pública.
- [x] Retirar el código versionado `JS/Services/users.js` y `JS/Tests/users.js` tras migrar las pruebas y comprobar que no quedan consumidores versionados.
- [x] Actualizar las pruebas heredadas que suponían un servicio USERS independiente.
- [x] Ejecutar regresión CI Node.js 22: 305 suites, 3,554 pruebas aprobadas y cero fallos (run `45222509966`).
- [ ] Validación Beta aislada: desplegar AUTH, comprobar sesiones/RBAC y acceso a Users/ActiveSessions; confirmar que no existen consumidores externos y solo entonces deshabilitar el deployment heredado y retirar su fila del registro central.

**Aceptación de código:** cumplida. Las funciones de gestión de usuarios permanecen disponibles en AUTH; el frontend y el registro central activo ya no requieren un endpoint USERS. La retirada del deployment remoto es un paso operativo diferido de Beta, no se simula ni se ejecuta sin validar AUTH y consumidores externos.

#### Evidencia de implementación y validación MIG-012 — 2026-11-23
- `getUsers`, `createUser` y `updateProfile` residen en `JS/Services/Auth.js`, usan el actor cacheado AUTH y se despachan desde el endpoint AUTH.
- Se conserva el hash PBKDF2 y el esquema de las hojas `Users` y `ActiveSessions`; se mantiene `__IdentifierSequenceConfig__`, validación de username/rol, escritura atómica y rollback.
- `createUser` usa ScriptLock local fail-fast. `deleteUser` usa el mismo lock, serializando altas y bajas sin lease entre proyectos.
- `updateProfile` solo permite `Nombre_Completo`, exige identidad propia y una fila ID única.
- El registro central activo y la caché pública contienen seis servicios: AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN. El lector backend y la caché frontend ignoran la fila heredada USERS mientras no se complete el cutover Beta.
- Se retiraron `JS/Services/users.js` y `JS/Tests/users.js`; se actualizaron pruebas de telemetría, términos, hash, sesiones, router y autorización que aún referenciaban el endpoint anterior.
- Harness aislado de mutaciones de usuario: 15/15 PASS.
- GitHub Actions Node.js 22: SUCCESS — run `45222509966`; 305 suites, 3,554 pruebas aprobadas, 0 fallos. `RepositoryJavaScriptSyntax`: 445 archivos PASS; `RepositoryModuleReferences`: 347 archivos PASS.
- GitHub Pages build/deploy: SUCCESS — run `45222508791`.
- HEAD de cierre: `89a8b60b872e97ab81086fd9d685b07186ca3c66`. La rama base protegida `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- No se ejecutaron deployments ni se modificaron propiedades Apps Script, hojas, Drive, endpoints ni datos externos. El deployment y la fila histórica USERS se mantienen intactos hasta la verificación Beta.

### MIG-013 — Sesiones sin Coordinator ni secretos compartidos
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §§15 y 18: autenticación ordinaria local y de baja latencia; no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas técnicas directas solo por necesidad concreta, sin secretos compartidos y con autorización/RBAC del receptor.

- [x] Mantener el hash PBKDF2 actual y el bloqueo temporal de login después de cinco intentos fallidos (15 minutos); no se modificó el coste del hash.
- [x] Mantener tokens de sesión opacos generados por AUTH en servidor con `Utilities.getUuid()`, registrados en `ActiveSessions`; no se firman con secretos manuales ni se exponen secretos al navegador.
- [x] Mantener `Users` y `ActiveSessions` como fuente autoritativa de identidad, rol, actividad y sesión.
- [x] Cada servicio protegido resuelve el actor desde la Spreadsheet de identidad en cache miss; no acepta el rol enviado por el navegador.
- [x] Implementar caché local por proyecto y token, con clave SHA-256 y TTL máximo de 21,600 segundos. Los accesos calientes no vuelven a leer Users/ActiveSessions.
- [x] CATALOG mantiene su implementación local equivalente, sin llamada a otro servicio.
- [x] Conservar expiración por antigüedad (tres meses) e inactividad (un mes), sesión única por token, identidad única, usuario activo y rol permitido al cargar desde fuente autoritativa.
- [x] Mantener comprobaciones locales sencillas de capacidad/RBAC en AUTH, WRITE, CATALOG, FEEDBACK, ADMIN y UTILITIES.
- [x] Retirar del flujo ordinario de sesión las llamadas a Coordinator, validación remota, registro/sincronización de sesión y leases SharedMutation.
- [x] Mantener endpoints locales de invalidación de caché sin secreto compartido. La coordinación de invalidación entre servicios desde frontend y los casos de revocación se completan en MIG-014.
- [x] Ampliar pruebas de caché fría/caliente, TTL, token opaco, identidad, sesión desconocida/revocada/expirada, usuario eliminado, cambio de rol e invalidación para los seis servicios.
- [ ] Validar login, sesiones y permisos mediante deployments Apps Script y Spreadsheet aislados en Beta.

**Aceptación de código:** cumplida. Las acciones ordinarias validan capacidad usando actor local cacheado, sin viaje de red, Coordinator ni lease SharedMutation. El rol se obtiene de Users/ActiveSessions y cada servicio aplica su RBAC; no se confía en datos de autorización editables por el navegador.

**Alcance de SharedMutation:** el cliente Coordinator/SharedMutation permanece para operaciones ajenas al ciclo ordinario de sesión que todavía lo requieren (por ejemplo, exclusión de ciertas operaciones de mantenimiento y publicación/telemetría). Ninguna ruta de lectura/carga de actor, login, validación de sesión o comprobación ordinaria de capacidad adquiere esas leases ni llama a la API de sesión de Coordinator. No se retiró funcionalidad no relacionada.

#### Evidencia de implementación y pruebas MIG-013 — 2026-11-23
- AUTH conserva `createPasswordHash`/`verifyStoredPassword`, el control de intentos fallidos y la creación/recuperación idempotente de sesión. El token opaco queda registrado en `ActiveSessions`.
- AUTH, WRITE, FEEDBACK, ADMIN y UTILITIES usan `getCachedSharedSessionActor_` para resolver el actor localmente; CATALOG usa `getCatalogSessionActor_` y `loadCatalogSessionActor_`. Ambos caminos cargan Users/ActiveSessions solo ante cache miss o después de invalidación.
- Los loaders comprueban correspondencia userId/token, unicidad del token y usuario, cuenta activa, rol permitido, marca de revocación pendiente y fechas de expiración. El rol no procede del payload del navegador.
- Las cachés son propias de cada proyecto Apps Script, se indexan mediante SHA-256 del userId/token y tienen TTL máximo de seis horas. La ruta caliente no consulta la Spreadsheet.
- Las acciones ordinarias no invocan `registerSession`, `syncUserSessions`, `validateSessionContext`, `revokeSession` ni `revokeUserSessions` de Coordinator, ni adquieren leases SharedMutation para validar actor o rol.
- `JS/Tests/MIG013SessionActorLocalLookup.mjs`: 21/21 PASS en harness V8 aislado, incluyendo loader común y CATALOG, caché fría/caliente, TTL, clave hasheada, cambio de rol tras invalidación, usuario eliminado, token revocado, expiración e identidad.
- `SessionActivityCoordination.mjs`: 9/9 PASS; `SessionActivityLeaseMinimization.mjs`: 6/6 PASS; `AuthSessionReadOptimization.mjs`: 9/9 PASS. Total dirigido: 45/45 aserciones aprobadas.
- Las pruebas se ejecutaron sobre las fuentes recuperadas de la rama y dependencias Spreadsheet/Cache aisladas; no equivalen a validación de deployments Apps Script reales.
- No se modificaron hashes, RBAC, contratos de login, esquema de Users/ActiveSessions, endpoints, propiedades Apps Script, deployments ni datos externos.

**Validación Beta diferida:** probar login/logout, expiración, revocación, cambio de rol, eliminación de usuario y accesos autorizados/no autorizados sobre deployments y hojas aisladas. La coordinación de invalidación remota desde frontend y la respuesta ante servicios no disponibles pertenecen a MIG-014.

### MIG-014 — Revocación y limpieza de caché desde frontend
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (código y pruebas dirigidas aprobados; CI global con fallos ajenos pendientes; Beta real pendiente)**

**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.

- [x] Logout y revocaciones: AUTH devuelve únicamente referencias SHA-256 de las claves de caché afectadas; el frontend coordina la invalidación directa de los seis proyectos de servicio.
- [x] Cambio/reset de contraseña, cambio de rol, reset global y eliminación: los caminos backend existentes que revocan sesiones pasan por la invalidación local común y quedan cubiertos por la captura de claves para la respuesta AUTH.
- [x] Respuesta ante servicio no disponible: fan-out concurrente, hasta dos intentos por destino, resultado parcial explícito y aviso al usuario con los servicios que no confirmaron limpieza.
- [x] Vencimiento máximo: 21,600 segundos (seis horas), coincidente con el TTL máximo de actor local.
- [x] La caché de cada receptor se limpia mediante su endpoint local __invalidateSessionActorCache; el frontend envía hashes de claves, nunca tokens de sesión ni secretos compartidos.
- [x] Pruebas de fan-out exitoso, reintento, fallo parcial, separación de claves CATALOG/otros servicios, TTL y contrato de los seis receptores.

**Implementación registrada**
- JS/Frontend/sessionCacheInvalidation.js: orquestador frontend para AUTH, WRITE, CATALOG, FEEDBACK, ADMIN y UTILITIES.
- JS/Frontend/api-config.js: procesa metadatos de revocación tanto en respuestas satisfactorias como en errores de AUTH y dispara la limpieza entre servicios.
- JS/Frontend/auth.js: informa cuando alguna limpieza remota queda pendiente.
- JS/Services/Auth.js, SharedMutationClient.js y catalog.js: captura y acepta referencias de caché locales; los receptores ya exponen invalidación local en sus respectivos proyectos.
- JS/Tests/SessionInvalidationFlow.mjs y SessionActorCacheInvalidation.mjs: pruebas dirigidas; ambas suites pasan en CI.

**Evidencia CI — GitHub Actions Node.js 22**
- Run 45231811060 (https://github.com/infogpstech/GPSpedia/actions/runs/45231811060), commit 9a13003407cc568e0381089b27f833b85dd16cc3.
- Sintaxis de módulos: PASS.
- SessionInvalidationFlow: 15/15 PASS; fan-out MIG-014: seis servicios, reintento, fallo parcial y TTL 21,600 s PASS; contrato backend/cache MIG-014: 10/10 PASS; SessionActorCacheInvalidation: 6/6 PASS.
- La regresión completa reportó 1,200 pruebas aprobadas y cuatro suites fallidas en grupos ADMIN, UTILITIES, AUTH e INTEGRATION. No corresponden a las suites dirigidas MIG-014; se dejan registradas como deuda de regresión general y no se atribuye causalidad sin análisis independiente.

**Validación Beta diferida**
- Aún deben ejecutarse logout, cambio/reset de contraseña, cambio de rol, reset global y eliminación contra deployments Apps Script y Spreadsheet aislados, con todos los servicios desplegados y sus permisos reales.
- Verificar limpieza efectiva en cachés de proyectos independientes y comprobar que los tokens revocados no conservan acceso. No se invocaron deployments, Spreadsheet ni Drive reales en esta tarea.

**Aceptación de código:** cumplida para la coordinación frontend, invalidación local, reintentos, fallo parcial y expiración máxima. No se declara validación Beta ni aprobación completa de la regresión global.

---

## Fase 4 — Imágenes, vídeos y Drive

### MIG-015 — Carga y administración de imágenes
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Mantener subida desde aportes y administración.
- [x] Mantener límites vigentes por flujo: 10 MB en ADMIN y WRITE; 3 MB en adjuntos FEEDBACK/PyS; validar MIME, tamaño y contenido antes de decodificar Base64.
- [x] Mantener ledger, SHA-256, verificación posterior, journal append-only, idempotencia y reconciliación.
- [x] Mantener variantes 300/800/1600, transparencia PNG, ObjectURL, IndexedDB y Lightbox.
- [x] Mantener reemplazo, recuperación, eliminación, inventario, papelera, restauración y reconciliación.
- [x] Mantener estados de carga, error, compensación, reintento y recuperación.
- [x] Probar los flujos y fallos parciales en suites dedicadas.

**Resultado de CI — GitHub Actions Node.js 22**
- Run 45236342364, commit `7ff8315dbb42132903e4f288f4b013c463ec118d`.
- Suites MIG-015: **605/605 comprobaciones PASS**.
- Incluye configuración central, preflight, ledger, journal, compensación, recuperación, variantes/ObjectURL, PyS, feedback, reemplazo, inventario, papelera, restauración, eliminación y organizador de imágenes.
- La regresión global registró 167 suites, 1,909 pruebas aprobadas y cuatro suites fallidas en P4 (política de roles), UTILITIES, AUTH e INTEGRATION. Los mismos grupos ya presentaban fallos antes de MIG-015; se mantienen como deuda separada y no se atribuyen a esta tarea.
- El build de Pages para el commit 96cfbdae está pendiente de confirmación; no se declara despliegue exitoso.

**Cambios y cumplimiento §18**
- ADMIN, WRITE y FEEDBACK utilizan SpreadsheetApp.getActiveSpreadsheet() y fallan cerrados si el proyecto no está vinculado a una Spreadsheet.
- Los tres servicios resuelven `cortes_root_folder_id` mediante CentralConfigurationReader.js y ConfiguracionRecursos; se valida configuración vigente, tipo, nombre e identidad del padre. No se mantiene fallback local.
- Se eliminaron los IDs locales SPREADSHEET_ID/DRIVE_FOLDER_ID de esos módulos y la propiedad local GPSpedia_UNUSED_IMAGES_FOLDER_ID. Imagenes_Sin_Uso se localiza bajo Cortes y se detectan duplicados.
- No se añadieron secretos compartidos, URLs de otros servicios ni orquestación entre servicios Apps Script. La coordinación sigue en frontend cuando corresponde.

**Validación Beta diferida**
- Incluir CentralConfigurationReader.js en los proyectos ADMIN, WRITE y FEEDBACK desplegados.
- Vincular cada proyecto a su Spreadsheet Beta y registrar el recurso Drive Cortes correcto en ConfiguracionRecursos.
- Ejecutar con recursos aislados pruebas reales de carga, reemplazo, adjuntos, PyS, inventario, permisos heredados, papelera, restauración, reconciliación y eliminación definitiva.
- No se invocaron deployments Apps Script ni recursos reales Spreadsheet/Drive durante esta tarea.

**Aceptación:** equivalencia funcional automatizada aprobada. MIG-015 queda **COMPLETADA CON VALIDACIÓN DIFERIDA**; el despliegue y la verificación real de permisos/recursos quedan pendientes de Beta.

### MIG-016 — Carga reanudable y aprobación de vídeos
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Mantener init de YouTube Resumable Upload y transferencia directa de bytes.
- [x] Mantener pausa, cierre del modal, reanudación y checkpoint IndexedDB.
- [x] Mantener título/descripción contextual y parámetros fijos de publicación.
- [x] Mantener Inbox de aprobación, rechazo y asociación a corte/PyS/tutorial.
- [x] Mantener reproductor y vídeos de PyS/tutoriales.
- [x] No persistir OAuth token ni URL temporal en Spreadsheet, ScriptProperties o logs.
- [x] Verificar identidad/permisos del flujo directo desde frontend y autoridad derivada en FEEDBACK.
- [x] Hacer idempotente la inicialización por opVideoId y bloquear reservas duplicadas por destino.
- [x] Validar renovación únicamente con URL de sesión oficial confirmada como expirada.

**Implementación**
- FEEDBACK crea/valida la hoja `YouTubeUploadReservations` con opVideoId, userId, contentType, referenceId, requestHash, status y marcas temporales; no almacena URL de sesión ni OAuth token.
- LockService local protege la reserva de operación/destino. La URL de sesión se conserva temporalmente en CacheService (TTL 6 h) y en IndexedDB del navegador para recuperación; la reserva expira operativamente a los 8 días.
- El mismo opVideoId y huella de solicitud recuperan la misma URL; un opVideoId con metadatos distintos se rechaza; otra pestaña no puede abrir una segunda reserva para el mismo destino. Si CacheService pierde la URL de una reserva inicializada, el backend falla cerrado y no crea una sesión duplicada.
- La renovación exige una URL con formato oficial de sesión YouTube y una reserva previa; solo se renueva la sesión que el cliente identificó como expirada tras HTTP 404/410.
- Transferencia directa en bloques de 8 MB, Content-Range, confirmación 308/Range, checkpoints IndexedDB y recuperación de estado final. Se validan ID final real de 11 caracteres y URL canónica.
- YouTube recibe categoría 28, privacidad unlisted, audiencia no infantil, vídeo embebible y estadísticas públicas desactivadas. La URL no se publica en GPSpedia antes de aprobación.
- FEEDBACK valida sesión/propietario, registra la solicitud pendiente y usa VideoApprovalEvents append-only para decisiones y publicación recuperable. Aprobar/rechazar deriva identidad y rol del actor validado; el navegador no es autoridad de rol. La publicación se limita a los destinos corte, PyS y tutorial.
- El cliente conserva estados new/uploading/paused/interrupted/uploaded, bloquea cambios de metadatos al recuperar, permite reintentar aprobación sin volver a transferir y protege el XHR al cerrar el modal.

**Validación CI — GitHub Actions Node.js 22**
- Run 45238221817, commit `8859d00126708795ad7107f674d0d41e8f17056c`.
- **223/223 comprobaciones específicas de vídeo aprobadas**, incluyendo publicación/aprobación/rechazo, permisos, idempotencia, renovación, IndexedDB, checkpoints, pausa/cierre, recuperación, overlays, XSS y reproducción suplementaria.
- Regresión global: 167 suites, 1,912 pruebas aprobadas y cuatro suites fallidas en P4 (política de roles), UTILITIES, AUTH e INTEGRATION. Los fallos están fuera del conjunto de vídeo y ya aparecían en regresiones anteriores; se mantienen como deuda separada.
- GitHub Pages build/deploy del commit funcional `8859d00126708795ad7107f674d0d41e8f17056c`: run 45238220816 — SUCCESS.
- No se hicieron llamadas reales a YouTube ni despliegues Apps Script durante CI.

**Validación Beta diferida**
- Desplegar/actualizar FEEDBACK con scopes OAuth de YouTube Data API y verificar consentimiento de la cuenta/canal autorizado.
- Verificar creación de YouTubeUploadReservations en la Spreadsheet Beta, LockService y CacheService con TTL real.
- Subir un vídeo de prueba no listado; comprobar respuesta 308/Range, pausa, cierre del modal, recarga, reanudación y renovación real tras 404/410.
- Probar solicitud pendiente, aprobación y rechazo con la matriz RBAC real; verificar publicación solo después de aprobar en Corte, PyS y Tutorial.
- Verificar reproductores en navegador móvil/escritorio y que ningún token/URL temporal aparezca en logs, hojas o ScriptProperties.

**Aceptación:** flujo automatizado conservado y validado. MIG-016 queda **COMPLETADA CON VALIDACIÓN DIFERIDA**; pruebas reales de OAuth, YouTube, CacheService, Spreadsheet, permisos y reproducción quedan pendientes de Beta aislada.

### MIG-017 — Herramientas y operaciones de Drive
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Mantener comandos `dir`, `cd`, `mkdir`, `tree`, `move` y navegación.
- [x] Mantener creación/organización de carpetas, mover/restaurar/eliminar archivos.
- [x] Mantener backups/restauración de Drive y auditorías de imágenes.
- [x] Mantener métricas de almacenamiento y URLs de descarga.
- [x] Preservar propietario, permisos y restricciones de acciones destructivas.
- [ ] Probar con recursos Beta aislados.

**Aceptación CI:** 666/666 pruebas dirigidas PASS (57 resúmenes, grupo 41 MIG017, run 45249354445). La matriz de permisos y la seguridad de rutas quedaron cubiertas por pruebas aisladas.
**Validación diferida:** no se conectaron Drive ni Apps Script reales. La aceptación Beta con carpetas y archivos desechables sigue pendiente.

---

## Fase 5 — Funciones de plataforma, administración y métricas

### MIG-018 — Modelos, cortes, VIN y contribuciones
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Mantener creación/edición de modelos y cortes, identificadores y contribuciones.
- [x] Mantener sugerencias, proyecciones, duplicados, VIN y sus reglas de privacidad.
- [x] Mantener operaciones suplementarias y validaciones de esquema.
- [x] Probar búsqueda y navegación por modelo/versión/año.

**Validación CI:** 594/594 pruebas dirigidas PASS (51 resúmenes, grupo 42 MIG018, run 45249354445). Incluye AUG-050 (11/11), VIN, proyecciones, contribuciones, recuperación, slots de cortes, asignación idempotente de IDs y contratos frontend/servicios.
**Validación diferida:** no se ejecutaron operaciones reales contra Apps Script o Spreadsheet. La migración/versionado de `AportesVehiculo`, la configuración central y la prueba Beta con datos aislados quedan pendientes.

### MIG-019 — PyS, tutoriales y feedback
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA**
**Requisito técnico transversal:** cumplido conforme a NORMAS_DESAROLLO.md §18: no se añadieron secretos compartidos/manuales ni URLs/configuración interservicio local en Apps Script; la coordinación funcional permanece en frontend cuando es viable; las llamadas técnicas existentes conservan autorización/RBAC y obtención de endpoints desde el registro central.
- [x] Mantener alta/edición/eliminación de problemas, soluciones y prevención.
- [x] Mantener asociación/desasociación bidireccional de vehículos.
- [x] Mantener tutoriales, sugerencias, reportes, likes, vistas y formularios.
- [x] Mantener límites de texto, vídeos, imágenes y estados.
- [x] Validar contratos de integridad PyS, recuperación de imágenes, caché, navegación contextual, relaciones bidireccionales, sugerencias/reportes, likes, vistas, tutoriales y publicación incremental de catálogo.
- [x] Actualizar pruebas de navegación PyS para reflejar el helper compartido de tarjetas y pruebas de accesibilidad/contraste para los tokens semánticos vigentes del CSS.
**Validación CI:** GitHub Actions Node.js 22, run `45251355899`, grupo `43 MIG019`: **363/363 pruebas PASS**, 38 suites únicas, sin fallos en MIG019.
**Regresión general:** 223 suites, 2,578 pruebas aprobadas y 6 fallos en suites ajenas a MIG019 (ADMIN P4, FEEDBACK reset de vídeo desde navegador, CATALOG feed incremental, UTILITIES fixture Spreadsheet, AUTH purga Logs e INTEGRATION BETA-043). No se declaran resueltas por esta tarea.
**Validación diferida:** no se ejecutaron Apps Script, Spreadsheet ni Drive reales. Mantener pruebas Beta aisladas para PyS, relaciones, tutoriales, reportes, likes y vistas, incluyendo AUG-128 y AUG-155; no usar datos productivos.

### MIG-020 — Inbox completo
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA**
**Requisito técnico transversal:** cumplido conforme a NORMAS_DESAROLLO.md §18. El feed de COORDINATOR se consulta desde frontend usando la configuración central; se retiró el handler FEEDBACK sin ruta que leía el journal compartido. No se añadieron URLs, tokens ni secretos interservicio a propiedades Apps Script.
- [x] Mantener conversaciones, mensajes, destinatarios individuales, respuestas y jerarquía RBAC.
- [x] Mantener categorías, plantillas, borradores recuperables por usuario, búsqueda y paginación con cursores estables.
- [x] Mantener recibidos/no leídos/enviados/archivados, contador y estados privados por participante.
- [x] Exponer en UI «Marcar no leída» y «Eliminar de mi bandeja» solo en el contexto de una conversación autenticada; el backend limita ambas acciones a participantes. La eliminación oculta la copia personal y conserva el historial compartido.
- [x] Mantener cierre restringido a Desarrollador, Jefe y Supervisor, y bloquear respuestas posteriores al cierre.
- [x] Mantener auditoría, alertas críticas idempotentes y mensajes centralizados de operaciones.
- [x] Revertir lectura, archivo y cierre si no se puede confirmar el evento de auditoría; agregar pruebas de fallo y rollback.
- [x] Serializar las mutaciones de Inbox con lock breve y rechazar concurrencia cuando el lock está ocupado; las consultas permanecen sin lock.
- [x] Validar contratos de roles, XSS, paginación/caché, notificaciones, borradores y acciones de estado.
**Validación CI:** GitHub Actions Node.js 22, run `45253324874`, grupo `44 MIG020`: **257/257 pruebas PASS**, sin fallos dentro del grupo. Detalle: InboxConversations 70/70; InboxUi 89/89; caché/paginación 19/19; eventos de imágenes 7/7; auditoría 15/15; roles 22/22; XSS 30/30; mensajes Developer 5/5.
**Regresión general:** 231 suites, 2,835 pruebas aprobadas y 6 fallos fuera de MIG020: ADMIN P4, FEEDBACK reset de vídeo desde navegador, CATALOG feed incremental, UTILITIES Spreadsheet fixture/RBAC/staging/rollback, AUTH purga Logs e INTEGRATION BETA-043. No se declaran resueltas por MIG020.
**Despliegue:** Pages build y deploy del mismo HEAD, run `45253324552`: SUCCESS.
**Validación diferida:** no se ejecutaron Apps Script, Spreadsheet, cuentas ni datos productivos. Mantener las pruebas Beta de roles, estados privados, borradores, móvil, notificaciones y rollback (AUG-115, AUG-116, AUG-119, AUG-152, AUG-155 y GP-INBOX-04B/04C/04D).
### MIG-021 — Métricas, estados y monitoreo
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Mantener `ping` y escaneo de conectividad de los seis servicios principales y COORDINATOR opcional.
- [x] Mantener estado, latencia en ms y errores por servicio, incluidos timeout, slow, stale y contratos inválidos.
- [x] Mantener métricas de tráfico y almacenamiento, separando el agregado global de la telemetría local del navegador.
- [x] Mantener métricas de usuarios, actividad, logs y auditoría.
- [x] Mantener paneles, gráficas y estados vacíos; no se añadió una exportación de métricas inexistente ni se alteraron las exportaciones existentes de fichas técnicas.
- [x] Evitar escrituras síncronas adicionales: los buckets v2 se incluyen en el guardado de lease ya requerido; validaciones de sesión y lecturas del feed no escriben métricas.
**Implementación:** Coordinator almacena buckets horarios v2 en el mismo estado JSON de leases. Los buckets v1 previos se leen y suman una sola vez durante su ventana restante de retención; el histórico puede contener validaciones/feed anteriores a esta actualización. El panel distingue el agregado global de la telemetría local de la pestaña y no presenta el agregado como total HTTP.
**Validación CI:** GitHub Actions Node.js 22, run `45263215575`, grupo `45 MIG021`: todas las suites del grupo PASS. Contratos y suites: ServiceHealth 19/19; tráfico ADMIN 45/45; tráfico navegador 10/10; agregador 10/10; agregación 3/3; batch 3/3; telemetría directa 6/6; routing 6/6; superficie ADMIN 17/17; catálogo 3/3; contribuciones 3/3; insights 1/1; XSS 6/6; append actividad 6/6; retención 10/10; lectura acotada 7/7; limpieza logs 5/5; vistos recientes 12/12; usuarios 2/2; estado catálogo 4/4; accesibilidad conexión 8/8; alertas Drive 5/5; actividad imágenes 5/5 + 6/6 + 7/7 + 6/6; likes 5/5; coordinación sesión 9/9; minimización leases 6/6.
**Prueba aislada adicional:** SharedMutationCoordinator 95/95 PASS; incluye compatibilidad v1/v2, idempotencia, retención, fallo best-effort y ausencia de escrituras de métricas separadas en feed/validación.
**Regresión general:** 296 suites, 3,567 pruebas aprobadas y 6 suites fallidas ajenas al grupo MIG021: ADMIN P4, FEEDBACK reset de vídeo desde navegador, CATALOG feed incremental, UTILITIES fixture Spreadsheet/RBAC/staging/rollback, AUTH purga de Logs e INTEGRATION GP-PERF FEEDBACK/Inbox. No se atribuyen a MIG021.
**Despliegue:** GitHub Pages build/deploy del mismo HEAD, run `45263213731`: SUCCESS.
**Validación diferida:** no se invocaron deployments Apps Script, Spreadsheet, Drive ni endpoints reales. Mantener la validación de siete endpoints, roles Developer, métricas globales/locales y recursos aislados en Beta según BETA-05.


### MIG-022 — Administración de Spreadsheet y mantenimiento
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (2026-11-23)**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Mantener creación de hojas y columnas.
- [x] Mantener fórmulas, migraciones de esquemas, identificadores y rollback.
- [x] Mantener reorganización, normalización, saneamiento y purgado autorizado.
- [x] Mantener backup/restauración de base de datos.
- [x] Mantener herramientas de desarrollador y consola.

**Avance inicial — 2026-11-23**
- Se verificó que `Utilities.migrateTimestamps` usa actor local desde Users/ActiveSessions y serialización mediante ScriptLock; no invoca lease remota ni UrlFetchApp. Se corrigió el comentario de servicio que afirmaba lo contrario.
- Se alineó `UtilitiesSecurity.js` con el comportamiento real: mock de CacheService/SHA-256, pruebas de lock local, concurrencia, rollback y ausencia de URL/secreto/endpoint COORDINATOR. Ejecución aislada V8: **19/19 PASS**.
- La suite CI confirma UtilitiesSecurity 19/19, AdminSheetActionsContract 9/9, AdminImageTrashLifecycle 41/41, AdminOperationReadInventory 8/8, organizador de imágenes 8/8 + 14/14 + 17/17 + 15/15 + 6/6, reconciliación de imágenes 34/34 + 18/18 + 15/15, terminal Drive 22/22 + 3/3, backup reanudable 8/8, auditoría ADMIN 16/16, alertas Drive 5/5 y retención de actividad 10/10. Pruebas aisladas adicionales: AdminRestoreRecovery 18/18, IdentifierAudit 10/10, IdentifierMigration 10/10, IdentifierFormulaMigration 7/7, AdminLogsMaintenanceContract 10/10 y DeveloperPanelUX 7/7.
- Total de validaciones específicas de MIG-022: **335/335 PASS**. La regresión global CI sigue reportando fallos de otros ámbitos (P4 VehicleModalRolePolicy 11/12; falta CoordinatorBrowserCatalogReset.mjs; contrato legacy de feed CATALOG; expectativa legacy de lease AUTH; contrato FeedbackLockFastFail). Se registran para sus fases/tareas correspondientes y no son defectos reproducibles de MIG-022.
- Validación Beta real con Apps Script/Spreadsheet/Drive y permisos de producción no ejecutada; queda diferida según NORMAS §5.

### MIG-023 — Catálogo, cachés y experiencia de usuario
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (2026-11-23)**

**Punto de partida actualizado (2026-11-23):** el feed incremental ya pertenece a CATALOG. `getCatalogChanges`, `publishCatalogChange` y `publishCatalogReset` se enrutan a CATALOG; FEEDBACK devuelve metadatos y el frontend coordina la publicación después de una mutación confirmada. CATALOG reconstruye los snapshots canónicos desde Spreadsheet y PyS, sin aceptar snapshots del navegador. Las rutas públicas `catalogFeed`, `getCatalogChanges` y `publishCatalogReset` fueron retiradas de COORDINATOR en MIG-023. Permanece pendiente retirar el helper interno `publishCatalogChange_` dentro de SharedMutation (MIG-024) y el endpoint health/agregación de tráfico de COORDINATOR (MIG-025).
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Mantener snapshot/delta, cursor, caché IndexedDB y arranque cache-first.
- [x] Mantener navegación, búsqueda, modal de detalle, impresión y QR.
- [x] Mantener modo oscuro, PWA, estados de carga/error y accesibilidad.
- [x] Mantener funcionamiento parcial cuando un servicio independiente no esté disponible.
- [x] Verificar que IndexedDB/miniaturas no bloqueen módulos independientes.

**Avance de implementación (2026-11-23):**
- [x] Trasladar el feed de cambios a CATALOG: diario local con ScriptProperties/ScriptLock, revisiones monotónicas, cursor, idempotencia por requestId, retención acotada y recuperación por reset.
- [x] Enrutar desde frontend `getCatalogChanges`, `publishCatalogChange` y `publishCatalogReset` hacia CATALOG; FEEDBACK deja de llamar a SharedMutationClient para notificar cambios.
- [x] Reconstruir deltas canónicos para Cortes, PyS y Tutoriales en CATALOG; el navegador solo envía colección/ID/operación y nunca el snapshot.
- [x] Retirar las rutas públicas de feed de COORDINATOR y actualizar contratos/pruebas para reflejar la nueva propiedad.
**Validación local y cierre (2026-11-23):**
- `CatalogChangeFeed`: 16/16 PASS; `CatalogBrowserReset`: 11/11 PASS; `FeedbackCatalogPublicationIsolation`: 14/14 PASS; `AdminCatalogPublicationIsolation`: 26/26 PASS; `CatalogPublicationIsolation`: 27/27 PASS; `CatalogPublicationFrontend`: 4/4 PASS; `DirectTrafficRoutingCoverage`: 6/6 PASS.
- Cache-first/IndexedDB: `CatalogSnapshotSync`: 29/29 PASS; `CatalogStartupIntegrity`: 25/25 PASS. Incluyen fallback por fallo/lentitud de IndexedDB, delta incremental, cursor, reset, recuperación, aislamiento de fallos PyS y reconciliación silenciosa.
- Regresión CI Node.js 22 del HEAD `e7ce57dfde8b5141c7bcb60496c0b6e11fa8a37b`: 335 suites y 4,015 pruebas aprobadas. Tres suites fallaron fuera de MIG-023: ADMIN `VehicleModalRolePolicy` (11/12), AUTH `SensitiveLogsTrustedActor` (contrato legacy de lease) e INTEGRATION `GP-PERF FEEDBACK/Inbox` (expectativa legacy sobre locks). No bloquean ni pertenecen al alcance MIG-023; quedan registradas para su tarea correspondiente.
- GitHub Pages workflow del mismo HEAD: build, reporte y deploy SUCCESS. No se realizó despliegue manual de Apps Script ni se modificaron hojas/datos externos.
- Pendiente de Beta: deployments CATALOG/FEEDBACK/WRITE/ADMIN, Spreadsheet aislada, lectura GET y publicación POST reales, concurrencia y recuperación de cursor, Android/PWA y escritorio. No se presentan como ejecutadas.

**Resultado:** MIG-023 **COMPLETADA CON VALIDACIÓN DIFERIDA**. Siguiente tarea: MIG-024 — Eliminar SharedMutation.

- [x] Completar regresión local de cache-first/IndexedDB, navegación, búsqueda, impresión/QR, PWA, accesibilidad y operación parcial.
- [ ] Validar despliegues y comportamiento real en Beta (validación diferida; no bloquea el cierre local).


---

## Fase 6 — Retirada de arquitectura antigua

### MIG-024 — Eliminar SharedMutation
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (2026-11-23)**

**Auditoría final de consumidores y sustitutos:**
- `SharedMutationClient.js` fue retirado; los helpers de caché/actor local permanecen en `SharedSessionActor.js`.
- Los servicios activos AUTH, WRITE, FEEDBACK, CATALOG, ADMIN y UTILITIES no conservan clientes remotos, leases, publicación compartida ni URLs/secretos de Coordinator. InboxConversations también fue revisado y no conserva referencias a SharedMutation ni a Coordinator.
- Las tres operaciones ADMIN que antes adquirían leases remotas (`saveUnusedImagesInventory`, `createCortesImageFolder` y `auditDriveImagesInCortes`) usan guardas locales independientes por recurso. La guarda reserva mediante `tryLock(0)`, libera el ScriptLock antes del trabajo prolongado, evita duplicados por alcance y expira marcadores abandonados mediante TTL.
- La invalidación de cachés se coordina desde `JS/Frontend/sessionCacheInvalidation.js` hacia cada servicio; no se delega en Coordinator.
- Coordinator conserva únicamente health y telemetría transitoria para MIG-025. Su protocolo de leases, publicación del feed y fan-out de sesión fue retirado. La clave histórica `GPSpedia_SHARED_MUTATION_LEASES` se conserva solo como fuente histórica de telemetría mientras exista el lector transitorio; no se usa para adquirir ni escribir leases y se retirará junto con Coordinator en MIG-025.
- Los nombres `isSharedMutationAction_` que aún aparecen en routers solo clasifican acciones que necesitan adjuntar el actor local confiable; no ejecutan comunicación remota, leases ni coordinación entre servicios.

**Requisito técnico transversal:** cumplido según NORMAS_DESAROLLO.md §§15–18. No se añadieron secretos compartidos, URLs de otros servicios ni configuración interservicio local en Apps Script. La coordinación funcional e invalidación se mantiene en frontend.

**Pruebas locales y CI (HEAD `38e9ec5f6f32710ef9fc6f9f07b24cd7312cc997`):**
- `SharedMutationRemovalContract`: 6/6 PASS.
- `AdminLocalOperationGuard`: 6/6 PASS (reserva breve, aislamiento por recurso, duplicado concurrente, cleanup, expiración TTL y fallo rápido).
- `AdminImageScanCoordinatorContract` y `AdminSheetActionsContract` ejecutadas dentro de la regresión sin fallos.
- Regresión de servicios: 425 suites; 4,826 pruebas aprobadas; 1 suite fallida (`FeedbackLockFastFail.mjs`). Esta expectativa amplia sobre locks de FEEDBACK ya estaba registrada como pendiente fuera de MIG-024 desde MIG-023; no corresponde al cambio SharedMutation. No se oculta ni se declara verde la regresión global.
- GitHub Pages: SUCCESS. No se desplegaron proyectos Apps Script ni se modificaron Spreadsheet/Drive reales.

**Pendiente de Beta (no bloquea el cierre local):** validar en proyectos Apps Script, Spreadsheet y Drive desechables que las tres guardas ADMIN aíslan recursos, que la invalidación frontend alcanza cada deployment y que no quedan consumidores remotos en los despliegues. Ver `Tareas_Beta.md` §6.4. No usar producción.

**Resultado:** MIG-024 COMPLETADA CON VALIDACIÓN DIFERIDA. Siguiente tarea: MIG-025 — Eliminar COORDINATOR.

### MIG-025 — Eliminar COORDINATOR
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (2026-11-23)**

**Inventario inicial de capacidades y consumidores (estado previo a la implementación):**
- `JS/Services/Coordinator.js` v1.4.9 concentra contexto de sesión legado (`registerSession_`, `revokeSession_`, `revokeUserSessions_`, `syncUserSessions_` y `validateSessionContext_`), telemetría global (`readServiceTraffic_` / `getServiceTrafficFromBrowser_`) y `doGet` / `doPost`.
- Tras MIG-024, los servicios activos ya no usan clientes remotos, leases, URL/secretos ni la API de sesión de Coordinator. Los contratos `SessionActivityCoordination` y `SessionActivityLeaseMinimization` verifican que las acciones activas se coordinan desde el frontend y consumen actor local.
- Consumidor frontend residual: `getServiceTraffic` se enruta a COORDINATOR desde `ACTION_TO_SERVICE_MAP`. La telemetría global se muestra en el panel Developer junto a la telemetría local del navegador.
- La comprobación de salud incluye todavía COORDINATOR en `CENTRAL_SERVICE_KEYS` y `SERVICE_HEALTH_CONTRACTS`. Los otros seis servicios ya exponen health propio y el frontend los consulta directamente desde el registro central.
- `serviceTelemetry.js` todavía incluye COORDINATOR en el inventario local de métricas del navegador. `RemoteServiceHealth.mjs` y `ServiceHealthContract.mjs` esperan siete servicios.
- La configuración central y documentación de salud/setup aún contienen la fila/identidad de COORDINATOR y referencias históricas. No borrar ni modificar datos de Spreadsheet/PropertiesService hasta identificar la política de retiro y su validación Beta.
- La guía `Services/COORDINATOR_SETUP.md` y la fuente `JS/Services/Coordinator.js` deben retirarse o archivarse de forma que no queden enlaces activos ni instrucciones ejecutables; README y registros deben actualizarse.

**Paridad obligatoria antes de retirar:**
- Health: conservar el escaneo directo de AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN; quitar solo la tarjeta/contrato del servicio que se retira.
- Métricas: el agregado global actual es Coordinator-only y refleja eventos legacy (leases/validaciones/feed), no todas las solicitudes HTTP. No eliminar el panel ni declararlo sustituido por métricas locales sin resolver y documentar la diferencia. La telemetría local por navegador debe permanecer disponible y correctamente etiquetada.
- Sesión/revocación: verificar con tests y búsqueda global que no queda ningún consumidor real de las API legacy antes de retirar `registerSession`, `revokeSession`, `syncUserSessions` o `validateSessionContext`.
- Inventariar tareas programadas, endpoints manuales, diagnósticos, guías, pruebas, registros y filas de configuración. No borrar proyectos ni propiedades externas sin autorización; documentar la limpieza Beta/operativa separada.

**Resultado y paridad implementada:**
- Se retiró `JS/Services/Coordinator.js`, sus handlers `doGet`/`doPost`, el routing `getServiceTraffic`, el registro de salud del servicio y su inclusión en telemetría local. No quedan consumidores activos del servicio.
- Health conserva el escaneo directo y aislado de AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN; los seis contratos de identidad/versionado siguen disponibles. La fila histórica COORDINATOR se ignora en el lector central mientras la limpieza externa espera Beta.
- El agregado global legacy no se reemplazó por telemetría local: medía solo eventos instrumentados de Coordinator, principalmente adquisiciones de leases, y no todas las solicitudes HTTP. Se retiraron la consulta y el gráfico de datos globales, pero se conserva una sección visible en Developer que explica su retirada, límites históricos y ausencia de equivalente global actual. Las métricas locales permanecen identificadas como datos temporales de este navegador y no transmitidos.
- Las API de sesión/revocación y SharedMutation ya habían sido retiradas en MIG-013/MIG-024; se actualizaron pruebas heredadas que aún abrían Coordinator.js.
- La guía antigua de despliegue/Coordinator se archivó en `Olds/Documentacion_Legacy/Services/`; README y documentación de health/Beta se actualizaron. La matriz conserva sus inventarios históricos y añade una adenda de retirada.
- No se borraron filas de Spreadsheet, propiedades de Apps Script, deployments, proyectos ni triggers externos.

**Validación local/CI:**
- `CoordinatorRetirementContract`: 13/13 PASS; valida ausencia de la fuente, seis servicios activos, retiro del routing y explicación visible de la telemetría legacy.
- `ServiceHealthContract`: 19/19 PASS; contratos de identidad/estado, seis endpoints, timeout, latencia, errores y aislamiento de fallos.
- `ServiceBrowserTrafficContract`: 10/10 PASS; seis servicios, rechaza USERS/COORDINATOR y conserva telemetría local diferenciada.
- `ServiceTrafficAdminContract`: 10/10 PASS; `AdminTrafficSurfaceContract`: 12/12 PASS; `ServiceMetricsTelemetry`: 1/1 PASS; `DirectTrafficRoutingCoverage`: 6/6 PASS.
- `DeveloperPrivilegeRouting`: 20/20 PASS; `PasswordRecovery`: 10/10 PASS; `PasswordKdfBenchmark`: 5/5 PASS. Los contratos heredados se actualizaron para no abrir ni enrutar a Coordinator.
- GitHub Actions Node.js 22, run `45285424788`, HEAD `b51c1df563329889df7765f9c49e1c7570f2e725`: 417 suites, 4,667 pruebas aprobadas y un fallo de suite ajeno al alcance: `FeedbackLockFastFail.mjs` (expectativa general sobre locks FEEDBACK, ya conocida desde MIG-023/MIG-024). No hubo fallos en los contratos MIG-025.
- GitHub Pages, run `45285423155`, mismo HEAD: SUCCESS. El paso de sintaxis de módulos modificados también pasó en el workflow.

**Validación Beta diferida:** comprobar endpoints desplegados de los seis servicios, fallos parciales y recuperación; revisar proyectos/deployments/triggers/propiedades externos huérfanos en entorno aislado; no borrar recursos sin autorización. Ver `Tareas_Beta.md` §6.5.

**Resultado:** MIG-025 COMPLETADA CON VALIDACIÓN DIFERIDA. Siguiente tarea: MIG-026 — eliminar configuración local de todos los servicios.
### MIG-026 — Eliminar configuración local de todos los servicios
**Estado: EN PROGRESO — BLOQUEADA PARCIALMENTE POR DEPENDENCIAS MIG-006/MIG-008 Y MIGRACIONES DE ESTADO.**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.

#### Verificación de alcance en la rama (2026-11-23)
- Revisión estática de los módulos actuales de `JS/Services/` y contraste con `INVENTARIO_CONFIGURACION_BACKEND.md`.
- Persisten IDs de Spreadsheet en AUTH y UTILITIES (`SPREADSHEET_ID` + llamadas `openById`); CATALOG también conserva ID local y apertura por ID.
- Persisten familias de estado/configuración en ScriptProperties: AUTH (login idempotente, recuperación HMAC, revocación/estado de sesión), CATALOG (feed incremental), WRITE (contador histórico de IDs Cortes), FEEDBACK (preferencia `rich_text_mode`) y ADMIN (auditoría, operaciones Safe Apply, auditoría Drive y guardas locales).
- FEEDBACK ya consulta el lector central para otros parámetros, pero sus handlers `handleGetRichTextMode`/`handleSetRichTextMode` siguen leyendo/escribiendo `GPSpedia_RICH_TEXT_MODE_V1` en ScriptProperties.
- WRITE obtiene `cortes_root_folder_id` desde configuración central. ADMIN contiene `getCortesRootFolder()` centralizado, pero un consumidor legacy en `admin.js` todavía usa `DriveApp.getFolderById(CORTES_IMAGES_ROOT_FOLDER_ID)`; debe migrarse al accessor central y verificar la declaración/resolución del símbolo.
- `SharedSessionActor.js` conserva un fallback legacy que consulta `SPREADSHEET_ID` si no recibe un proveedor explícito. No debe confundirse con el ID operativo AUTH ni retirarse sin adaptar los consumidores y contratos de sesión.
- Los patrones `GPSpedia_...` que son nombres de claves o prefijos no se deben eliminar por búsqueda ciega: hay que clasificar configuración frente a datos operativos, ledgers recuperables y claves de caché.
- El inventario MIG-003 describía 26 familias; el estado actual tras MIG-024/MIG-025 requiere una reconciliación contra código vigente antes de declarar cerrada la lista. Los datos reales de propiedades instaladas no son accesibles desde GitHub y quedan para Beta.

#### Reconciliación estática inicial — 2026-11-23 (histórica; actualizada por adendas 2026-11-24)

La reconciliación contra las fuentes de la rama confirma:
- AUTH, CATALOG y UTILITIES conservan `SPREADSHEET_ID/openById`; WRITE, FEEDBACK, ADMIN y CentralConfigurationReader usan Spreadsheet activa.
- SharedSessionActor conserva un fallback a `SPREADSHEET_ID/openById` si no recibe proveedor explícito.
- AUTH mantiene login idempotente, marcadores de revocación y secreto HMAC; CATALOG mantiene el diario de feed; WRITE conserva el contador heredado de IDs; FEEDBACK mantiene `GPSpedia_RICH_TEXT_MODE_V1`; ADMIN mantiene auditoría, Safe Apply, contador, guardas locales y estado reanudable de auditoría Drive.
- Estos elementos se clasifican como estado operativo/secretos y no como parámetros genéricos. Su migración requiere paridad y recuperación específicas.
- CentralConfigurationReader solo lee/proyecta y cachea la configuración; no se localizó un publicador central versionado. Por ello, no se retira todavía la propiedad rich_text_mode.
- El probe MIG006 5/5 es simulado/local; no sustituye la prueba de Web App real.

Detalle y evidencia: `INVENTARIO_CONFIGURACION_BACKEND.md`, adenda MIG-026 del 2026-11-23. No se modificaron deployments, propiedades instaladas ni datos externos.

#### Compatibilidad de la lista Beta existente

La lista histórica `lista_beta_parte1.txt` contiene pruebas de rich text que esperan persistencia local en `localStorage` y aislamiento entre navegadores/dispositivos. Al migrar `rich_text_mode` a la configuración central, esas expectativas deberán revisarse: el valor publicado pasará a ser central y la caché local solo podrá acelerar la lectura, no convertirse en fuente de verdad ni permitir preferencias divergentes por dispositivo. Conservar los casos de seguridad de sanitización, RBAC Developer, actualización de barras abiertas y fallback estricto. La adenda de Beta se actualizará junto con la implementación y comenzará con los comandos de sincronización segura exigidos por NORMAS §5.

#### Dependencias y decisiones que impiden una sustitución segura inmediata
1. MIG-006 dejó preparado el probe y su procedimiento, pero la prueba real de `SpreadsheetApp.getActiveSpreadsheet()` en Web Apps sigue pendiente. MIG-008 tiene la misma validación diferida. El lector central usa `getActiveSpreadsheet()` y falla cerrado; no está autorizado reemplazar `openById()` por una suposición no probada.
2. No introducir un ID/URL bootstrap ni un endpoint auxiliar que vuelva circular el acceso. Resolver la arquitectura de acceso a Spreadsheet mediante la evidencia Beta de MIG-006 y documentar el mecanismo aprobado.
3. Los datos de AUTH, CATALOG, WRITE y ADMIN que actualmente viven en propiedades no son todos parámetros. Requieren migraciones específicas a hojas/ledgers con idempotencia, concurrencia, expiración, aislamiento por actor, recuperación y paridad. No moverlos a `ConfiguracionParametros` como valores genéricos.
4. Resuelto en código el secreto HMAC de recuperación: ya no se necesita una clave persistente. El código temporal pasa a 96 bits aleatorios y se conserva únicamente su digest SHA-256 en CacheService; no se copia a una hoja ni se expone al navegador. La propiedad legacy GPSpedia_PASSWORD_RECOVERY_SECRET_V1 queda sin consumidores y su eliminación física se difiere a Beta tras desplegar/verificar la nueva versión.
5. La configuración central física y el mecanismo de escritura/publicación deben estar listos para que FEEDBACK pueda retirar su propiedad de preferencia sin perder la operación de cambio desde el panel Developer.

#### Próximas acciones ordenadas
- [ ] Completar/obtener evidencia Beta de MIG-006 para cada tipo de proyecto Web App y su identidad/permisos efectivos; si el contexto activo no funciona, resolver alternativa arquitectónica sin bootstrap local.
- [x] Reconciliar MIG-003 contra el código vigente tras MIG-024/MIG-025. La primera adenda del 2026-11-24 registró la línea base de 9 módulos, 4 módulos con ScriptProperties y 12 familias antes de migrar CATALOG. Estado actual tras los ledgers CATALOG/WRITE y las migraciones AUTH de recuperación/login: 9 módulos activos, 3 módulos con ScriptProperties (AUTH, WRITE y ADMIN) y 6 familias de estado operativo aún vigentes (AUTH 0, WRITE 1, ADMIN 5). AUTH conserva únicamente lectores de baseline legacy para login_request_ y role_revocation_pending_; después de confirmar sus marcadores de baseline no vuelve a consultar esas propiedades. GPSpedia_PASSWORD_RECOVERY_SECRET_V1 ya no tiene consumidores. La limpieza física de las propiedades legacy queda para Beta. Coordinator, SharedMutationClient y users.js no existen como módulos independientes; SharedSessionActor ya no conserva fallback global.
- [x] Retirar el fallback global de SharedSessionActor: AUTH, ADMIN, WRITE y UTILITIES inyectan el proveedor de Spreadsheet correspondiente; el helper exige proveedor explícito y falla cerrado si falta. MIG013SessionActorLocalLookup 22/22 PASS y regresión de consumidores actualizada.
- [x] Corregir el consumidor legacy de carpeta en ADMIN para usar `getCortesRootFolder()`; contrato automatizado añadido en `AdminCentralCortesFolderConfiguration.mjs` y registrado en el runner MIG026. El cambio no altera el recurso real.
- [x] Migrar el flujo de `rich_text_mode` a configuración central versionada: publicación ADMIN con RBAC Developer, read-back e historial; lectura FEEDBACK; coordinación frontend; caché local con revisión y TTL de 5 minutos; invalidación; fallback estricto; contratos y pruebas de RBAC. Validación local completada (RichTextGlobalPreference 10/10 y CentralConfigurationPublisherContract 6/6). La eliminación física de la propiedad instalada, si aún existe en proyectos desplegados, queda pendiente de la validación/limpieza Beta autorizada; no se accedió a PropertiesService real.
- [ ] Resolver el acceso central de AUTH, CATALOG y UTILITIES; retirar sus IDs locales únicamente después de probar el contexto de ejecución real.
- [x] Migrar el ledger del feed incremental de CATALOG desde ScriptProperties a las hojas privadas CatalogChangeState/CatalogChangeEvents. Esquema versionado, lock, idempotencia por requestId, retención de 100 eventos, cursor/reset, read-back y rechazo de esquema ausente/inválido; CatalogChangeFeed 19/19 PASS; el feed vacío solicita reset hasta que se publique el reset inicial. La inspección/limpieza de propiedades instaladas antiguas queda en Beta.
- [x] Migrar el high-water mark de WRITE (GPSpedia_CORTES_LAST_ID) al ledger append-only CortesIdReservations mediante un baseline determinista e idempotente; conserva el máximo entre Cortes, reservas y propiedad heredada, admite cero sin consumir un ID, valida append/flush/read-back, rechaza baseline ausente/corrupto/duplicado y usa lock fail-fast solo durante la primera siembra. Las reservas normales ya no leen ScriptProperties y freezeCortesIds deja de escribir la propiedad legacy. Validación CI: WriteCortesIdLedgerBaseline 13/13; WriteVehicleIdAllocationIdempotency 12/12; WriteVehicleIdAllocatorBoundedRead 11/11; WriteFreezeCortesIdsBackupOutsideLock 5/5; WriteAuthorizationMinimization 15/15; sintaxis PASS. La prueba real de Spreadsheet/Apps Script, concurrencia entre ejecuciones y limpieza de la propiedad instalada quedan para Beta; no se ejecutaron deployments ni datos externos.
- [x] Retirar el secreto HMAC persistente de recuperación de contraseña en AUTH: getPasswordRecoveryManager_ ya no lee ni crea GPSpedia_PASSWORD_RECOVERY_SECRET_V1; usa SHA-256 sobre código aleatorio de 96 bits y mantiene únicamente digests/estado temporal en CacheService. Se actualizaron validación backend, fixture AUTH, formulario de recuperación y caché Service Worker v75. PasswordRecovery 10/10 PASS, fixture/paridad PASS y sintaxis PASS. La propiedad antigua no se ha borrado de proyectos instalados; limpieza física diferida a Beta tras despliegue/verificación.
- [x] Migrar la idempotencia de login AUTH desde login_request_ a la hoja operativa LoginRequests. Baseline idempotente importa registros legacy y verifica read-back; flujo normal no consulta ScriptProperties; TTL 24 h con limpieza acotada de 25 filas por ejecución; revocación por usuario/token usa el ledger. Se eliminó waitLock de AUTH y todas las adquisiciones ScriptLock usan tryLock(0): ninguna función espera por otra ejecución; las contenciones fallan rápido y se pueden reintentar. LoginRequestLedger 40/40 PASS; PasswordRecovery 10/10; AUTH operativo/copia 32/32; fixture/paridad 1/1; perfil/revocación 23/23; sintaxis PASS. La propiedad legacy no se borra de proyectos instalados; limpieza y concurrencia real quedan para Beta.
- [x] Migrar los marcadores role_revocation_pending_ de AUTH al marcador compartido de Users.SessionToken, con baseline idempotente/reanudable almacenado en LoginRequests (fila 2, columna H). La siembra lee las propiedades legacy una sola vez, valida identidad/rol, rechaza duplicados y divergencias, verifica read-back y nunca escribe/elimina propiedades. hasPendingRoleRevocation_ y reconcileRoleRevocationUnderLock_ ya no consultan ScriptProperties; doPost, login, validación de sesión, logout y recuperación aseguran el baseline antes de usar el estado. RoleRevocationLedger 39/39 PASS; LoginRequestLedger 40/40; PasswordRecovery 10/10; AUTH operativo/copia 32/32; fixture/paridad 1/1; perfil/revocación 23/23; PasswordKdfBenchmark 5/5. CI run 45310018557: 339 suites, 3,961 pruebas aprobadas y 3 fallos externos (WriteCatalogPublicationIsolation en dos grupos y GP-PERF FEEDBACK/Inbox). Pages run 45310017580 SUCCESS. No se desplegó Apps Script; la limpieza de propiedades instaladas queda pendiente de Beta.
- [x] Migrar la primera familia de estado ADMIN: `GPSpedia_ADMIN_AUDIT_V1_<eventId>` a la hoja privada `AdminOperationAudit` (16 columnas), con baseline idempotente/reanudable en fila 2, importación legacy por lote, validación de identidad/esquema, rechazo de filas huérfanas, sanitización de campos, read-back y cero escrituras/eliminaciones de propiedades. Inicio/cierre y limpieza usan `tryLock(0)`; no hay `waitLock`; auditoría best-effort: lock ocupado o esquema ausente no detiene la operación funcional. Retención 180 días, 300 finalizados, 20 pendientes; limpieza por lotes. AdminAuditTrail 27/27 PASS; CI run 45317266195: 495 suites, 5,799 pruebas, 0 fallos; sintaxis 457 archivos y referencias 377 archivos PASS; Pages 45317265579 SUCCESS. No se desplegó Apps Script ni se modificaron propiedades/hojas instaladas; Beta pendiente en Tareas_Beta.md §11.
- [x] Migrar la siguiente familia ADMIN: `GPSpedia_CORTES_ORGANIZER_OP_V1_<sha256(operationId)>` (Safe Apply) a la hoja `CortesOrganizerOperations`, con baseline legacy idempotente/reanudable, identidad y duplicados validados, read-back, historial paginado, retención y recuperación. Las propiedades legacy se leen solo durante baseline; no se escriben ni eliminan. Las reservas usan `tryLock(0)` únicamente durante la transición breve del ledger; el lock se libera antes de Drive. Las operaciones sobre archivos distintos pueden avanzar sin mantener un lock global durante el trabajo externo. Validación CI run 45324879054: 496 suites, 5,820 pruebas aprobadas y 0 fallos; suites dirigidas Executor 20/20, Ledger 9/9 y UI 15/15. Pages run 45324878517 SUCCESS. Beta sigue diferida.
- [x] Migrar las guardas temporales ADMIN `GPSpedia_ADMIN_LOCAL_OPERATION_GUARD_V1_<sha256(scope)>` a la hoja `AdminOperationGuards`, con baseline idempotente/reanudable de reservas vigentes, read-back, TTL máximo de 420 segundos, exclusión por scope y limpieza recuperable. ScriptLock usa `tryLock(0)` solo durante baseline/reserva/liberación; callbacks Drive fuera del lock. ScriptProperties se obtiene únicamente si falta baseline y no se vuelve a consultar en el flujo normal. CI run 45325854986: 496 suites, 5,832 pruebas, 0 fallos; AdminLocalOperationGuard 12/12. Pages run 45325854063 SUCCESS. Beta diferida.
- [x] Migrar el estado reanudable de auditoría Drive ADMIN (`GPSpedia_DRIVE_AUDIT_STATE_<auditId>`) a la hoja `DriveAuditRuns`: baseline idempotente/reanudable, validación de auditId/owner/status/updatedAt, read-back, TTL 6 h, cleanup de filas expiradas y máximo 500 estados. Las páginas, respuestas y snapshots grandes siguen en CacheService, no en celdas. Propiedades legacy solo lectura durante baseline, sin set/delete; el flujo normal no vuelve a obtener ScriptProperties para esta familia. Lock `tryLock(0)` breve y fail-fast, fuera de Drive. CI run 45327051980: 496 suites, 5,841 pruebas, 0 fallos; Pages run 45327050709 SUCCESS. Beta diferida.
- [x] Migrar el puntero por actor de la última auditoría Drive (`GPSpedia_DRIVE_AUDIT_LATEST_<hash(actor)>`) a la hoja `DriveAuditLatest`, con baseline que resuelve el hash truncado mediante propietarios de DriveAuditRuns, validación de auditId/owner/status, read-back, upsert por ownerHash y limpieza al expirar el estado. Punteros huérfanos se omiten y las propiedades legacy se conservan. ScriptProperties solo lectura durante baseline; flujo normal sin acceso. Lock `tryLock(0)` fail-fast y breve, fuera de Drive. CI run 45327887713: 496 suites, 5,856 pruebas, 0 fallos; AdminReplacedImagesIntegrity 64/64; Pages run 45327886488 SUCCESS. Beta diferida.
- [x] MIG-026 ADMIN-05 — Migrar `LOGOS_MARCA_ID_COUNTER` a `LogoIdReservations`, con baseline reanudable del máximo entre propiedad legacy y hoja LogosMarca, reservas monotónicas con read-back y `tryLock(0)`. El escaneo de IDs se realiza fuera del lock; el flujo normal lee solo la última reserva; Drive, compensaciones y telemetría quedan fuera de la sección crítica. `LogoIdIntegrity` 18/18, `AdminLogoWriteLockNonBlocking` 6/6 y `LogoIdReservationLedger` 10/10 PASS. CI run 45366702261: 499 suites, 5,886 pruebas aprobadas, 0 fallos; sintaxis PASS. Pages run 45366700363 SUCCESS. Validación Beta pendiente en `Tareas_Beta.md` §16; no se desplegó Apps Script ni se modificaron propiedades/hojas instaladas.
- [x] Ejecutar búsqueda estática global final en backend, frontend, manifiestos y documentación; clasificar cada coincidencia en `MIG026_BUSQUEDA_ESTATICA_FINAL.md`. Resultado: cero URLs/secretos de interconexión en servicios; una única URL bootstrap pública permitida en frontend; nueve lecturas PropertiesService exclusivamente en baselines; quedan tres `SPREADSHEET_ID` en AUTH/CATALOG/UTILITIES como excepción conocida y bloqueada por MIG-006/Beta. No se declara cero configuración local hasta completar la prueba Web App real.
- [x] Validar sintaxis, contratos y regresión local de la auditoría estática. CI run 45370448353: 499 suites, 5,889 pruebas, 0 fallos; suite MIG026StaticConfigSearch 10/10; Pages run 45370445917 SUCCESS.
- [ ] Completar validación Beta de MIG-006 y revisión read-only de propiedades instaladas; retirar los tres SPREADSHEET_ID locales únicamente tras demostrar acceso Web App real.

**Resultado de este corte:** no se conserva ningún cambio funcional experimental que sustituya `openById()` por `getActiveSpreadsheet()` sin evidencia de Web App. Se restauraron los módulos y fixtures afectados a su contenido previo; la rama mantiene el comportamiento funcional conocido. No se modificaron deployments, proyectos Apps Script, propiedades instaladas, Spreadsheet, Drive ni datos externos.

**Aceptación:** búsqueda estática global sin configuración local prohibida; migraciones de estado con paridad demostrada; ningún secreto de recuperación/interconexión en configuración ordinaria; lectura/escritura central probada en el contexto real de ejecución; cero pérdida de funciones y regresión aprobada.

## Fase 7 — Verificación y despliegue

### MIG-027 — Suite de paridad de las funciones existentes
**Estado: COMPLETADA — validación estática/CI aprobada; pruebas con recursos reales diferidas a Beta**
**Requisito técnico transversal:** cumplido conforme a NORMAS_DESAROLLO.md §§17–19. No se agregaron secretos, tokens compartidos, URLs operativas locales ni coordinación backend entre servicios.

- [x] Construir pruebas de contrato para todas las acciones: `ACTION_TO_SERVICE_MAP` contiene 123 acciones únicas en seis servicios; se verificó el enlace mapa → endpoint → dispatcher → handler → consumidor mediante `ActionDispatchContract`.
- [x] Comparar payloads, respuestas, errores, roles y efectos sobre datos mediante contratos y fixtures aislados existentes de las operaciones MIG-015 a MIG-023; se reforzaron los contratos de vídeo, creación de hojas/columnas, feed de catálogo, reset y arranque.
- [x] Integrar cobertura ejecutable para MIG-015 a MIG-023: MIG-016 (YouTube reanudable/aprobación), MIG-022 (acciones Spreadsheet) y MIG-023 (feed/reset/arranque/impresión) quedaron conectadas explícitamente al runner de regresión.
- [x] Confirmar continuidad de controles visibles y acciones manuales: se compararon los IDs de `index.html` de la rama base y de trabajo; los 18 IDs heredados que ya no aparecen en la pantalla actual tienen sustitución localizada en las superficies activas. Se contrastó además el inventario de 335 declaraciones de controles y las superficies UI-01 a UI-17.
- [x] Crear `JS/Tests/MIG027FunctionalParity.mjs` (8/8 PASS) y añadir el grupo 48 MIG027 a `JS/Tests/RunServiceTests.mjs`.
- [x] Ejecutar regresión integral CI en Node.js 22: run **45388156117**, commit `ba5a987650f243219a31bc075e4730f5cdf15d86`, **511 suites, 6,035 pruebas aprobadas y 0 fallos**; sintaxis PASS.

**Distribución verificada del mapa actual:** AUTH 19, CATALOG 9, WRITE 9, FEEDBACK 40, UTILITIES 1 y ADMIN 45 (123 en total). La matriz de migración contiene trazabilidad documental para las 123 acciones.

**Límite de validación:** las pruebas de esta tarea son contratos estáticos y fixtures aislados. No se invocaron deployments Apps Script, YouTube, Spreadsheet ni Drive productivos. La ejecución con recursos Beta desechables, permisos reales y verificación de efectos externos corresponde a MIG-030 y no se declara como realizada.

### MIG-028 — Seguridad, rendimiento y regresión
**Estado: COMPLETADA EN VALIDACIÓN LOCAL — métricas de latencia de aplicación diferidas a Beta según la línea base MIG-005**
**Requisito técnico transversal:** cumplido conforme a NORMAS_DESAROLLO.md §18. No se añadieron secretos compartidos/manuales, URLs operativas locales en Apps Script ni coordinación funcional backend entre servicios.

- [x] Ejecutar sintaxis, pruebas unitarias, contratos y regresión. Se creó `JS/Tests/MIG028SecurityPerformanceRegression.mjs` con 9 verificaciones; CI final: **512 suites, 6,044 pruebas aprobadas, 0 fallos** y sintaxis PASS.
- [x] Probar sesiones/revocaciones, roles y operaciones concurrentes. Se integraron/confirmaron los contratos existentes de revocación, invalidación de cachés, actor confiable, cinco roles RBAC, locks fail-fast, idempotencia y append concurrente.
- [x] Comparar la evidencia disponible con MIG-005: línea base 306 suites/3,581 pruebas y CI de ~30 s; corte actual 512 suites/6,044 pruebas y workflow de ~41 s. El tiempo CI mide el runner y su mayor volumen de pruebas, no la latencia de GPSpedia.
- [x] Probar fallos de lectura Spreadsheet en validación AUTH, configuración/caché central, IndexedDB, endpoints HTTP, red, JSON y disponibilidad parcial de servicios mediante fixtures y contratos locales.
- [x] Verificar que las acciones ordinarias no agregan validación interactiva, reautenticación ni viaje de red previo por clic; el router usa configuración central y la autorización backend conserva actor confiable/RBAC.

**Validación diferida a Beta (no bloquea el cierre local):** p50/p95 de arranque, login, catálogo, Inbox y operaciones; bytes/tiempos de snapshot y deltas; llamadas reales y lecturas/escrituras Spreadsheet; latencia real de Drive/YouTube; y revocación con deployments/roles reales. La línea base MIG-005 ya declara estas mediciones como pendientes por falta de navegador, credenciales y recursos desechables. No se inventan ni se sustituyen por el tiempo de CI.

**Evidencia:** workflow `GPSpedia service regression tests`, run 45390513381, commit `8ccc2a761ebec3f03b2ddcb8ddc0390cac25d2ac`, SUCCESS. `MIG028SecurityPerformanceRegression`: 9/9 PASS. No se desplegaron proyectos Apps Script ni se modificaron datos productivos.


### MIG-029 — Guía de despliegue simplificada
**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA (despliegue real y rollback Beta)**
**Requisito técnico transversal:** cumplido conforme a NORMAS_DESAROLLO.md §18. La guía no incorpora secretos, propiedades de interconexión, URLs locales backend ni coordinación Apps Script→Apps Script.

- [x] Reescribir la guía para que desplegar no requiera agregar/editar propiedades de proyecto.
- [x] Documentar únicamente seis proyectos activos y sus fuentes reales: AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN; excluir USERS y COORDINATOR retirados.
- [x] Documentar la publicación de URL nueva en la hoja central Servicios mediante revisión completa, historial append-only, validación y conmutación controlada de active_revision. Se aclara que no existe una pantalla/acción genérica para editar endpoints.
- [x] Documentar que actualizar el código de un servicio en su deployment existente conserva su URL y no exige redesplegar los otros servicios ni el frontend por un cambio exclusivo de URL.
- [x] Añadir rollback para versiones del mismo deployment y para cambios de URL mediante una nueva revisión central.
- [x] Actualizar README y añadir MIG029DeploymentGuideContract.mjs (7 verificaciones) al runner general.

**Validación local:** COMPLETADA. El contrato `MIG029DeploymentGuideContract.mjs` se ejecutó en Node.js 22 dentro del workflow `GPSpedia service regression tests`, run **45392164256** (commit `c1a5fbd025dc296353d8ae23ea1f102677418e4b`): **7/7 PASS**. El runner general terminó con **513 suites, 6,051 pruebas aprobadas y 0 fallos**; la verificación de sintaxis también aprobó. Se confirmó nuevamente en el run **45393390865** (HEAD `48c8318a09edcb48ee1739acf85ac0b6327c29f3`), con los mismos resultados. Los logs muestran explícitamente `[50] MIG029` y `MIG029DeploymentGuideContract: 7/7 PASS`. **Pendiente Beta:** ejecutar el procedimiento en proyectos Apps Script y Spreadsheet central aislados, verificar identidad/permisos, publicación real de revisión/URL, salud GET, continuidad entre servicios y rollback. No se ejecutaron deployments ni se modificaron propiedades, permisos o datos productivos.

**Documentación:** `Services/DEPLOYMENT_GUIDE.md`. Las guías anteriores en `Olds/Documentacion_Legacy/Services/` permanecen archivadas y expresamente no ejecutables.

### MIG-030 — Validación Beta integral
**Estado: EN PROGRESO — preparación local aprobada; aceptación integral pendiente de resolver MIG-026.**
**Requisito técnico transversal:** cumplir NORMAS_DESAROLLO.md §18: no claves, tokens ni secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación frontend siempre que sea posible; llamadas directas solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor; URLs operativas desde registro central autoactualizable, sin fallback local.
- [x] Preparar comandos de sincronización Beta conforme a NORMAS §5; contrato estático 8/8 PASS y fixture Git aislado 3/3 PASS.
- [x] Ejecutar validación local de contratos, salud, aislamiento funcional y regresión general en CI.
- [x] Mantener una matriz de pruebas Beta BETA-01 a BETA-08 y validaciones diferidas MIG-012/013/015/017/018/024/025/026 con condiciones de seguridad, recursos aislados y evidencia requerida.
- [x] No declarar funciones probadas sin invocación real.
- [ ] Ejecutar login, catálogo, usuarios, modelos, imágenes, vídeos, Drive, PyS, tutoriales, Inbox, métricas, administración, backups y restauración en los recursos Beta aislados.
- [ ] Probar roles autorizados/no autorizados y registrar evidencia, tiempos, recursos de prueba y resultados reales.

**Validación local — 2026-11-24:** el preflight de `Tareas_Beta.md` conserva como primera sección la sincronización segura: remoto/rama exactos, árbol limpio, `fetch` + `pull --ff-only`, HEAD final y ausencia de comandos destructivos. Contrato estático 8/8 PASS. La secuencia se ejecutó además en un repositorio Git fixture temporal: fast-forward v1→v2, detección de árbol sucio y detección de rama incorrecta, 3/3 PASS; no se sincronizó el clon real ni se hizo fetch/pull contra GitHub.

El workflow `GPSpedia service regression tests` confirmó el checkout exacto de `GPSpedia2.2.5_work`, Node.js v22.23.5, sintaxis PASS y ejecución del runner general. Run **45396084519**, job **138452115396**, commit **142b9057f57909c364a9726fd448f43d6e048cad**: **513 suites, 6,051 pruebas aprobadas, 0 fallos**. `ServiceHealthContract.mjs` aprobó 19/19 en las ejecuciones registradas del run anterior **45395676090**. Los contratos de MIG-028 y MIG-014 verifican fallos parciales, aislamiento y coordinación frontend sin detener servicios independientes. Estos resultados son pruebas automatizadas locales/CI; no acreditan disponibilidad ni comportamiento de deployments reales.

**Validación Beta diferida:** no se ejecutó la sonda remota. Se confirmó que `.github/workflows/deployed-service-health.yml` no existe en `main` (404), y `RemoteServiceHealth.mjs` usa un bootstrap fijo sin selector de entorno; no se verificó independientemente que sus destinos sean exclusivamente Beta. No se enviaron solicitudes a endpoints ni se modificaron deployments, propiedades Apps Script, permisos, Spreadsheet, Drive, OAuth/YouTube ni datos productivos. La matriz Beta mantiene esas pruebas pendientes hasta contar con acceso autorizado y recursos sintéticos aislados.

**Estado de cierre:** la preparación Beta, los contratos y la regresión local de MIG-030 están aprobados. Sin embargo, no se satisface todavía la aceptación integral indicada abajo: MIG-026 sigue EN PROGRESO y conserva tres referencias locales `SPREADSHEET_ID/openById` en AUTH, CATALOG y UTILITIES. La retirada depende de demostrar el acceso a Spreadsheet desde el contexto real de cada Web App; no se sustituirá por una suposición ni por un fixture. Por tanto, MIG-030 permanece **EN PROGRESO** hasta resolver esa dependencia de implementación y validar el cierre de las 30 tareas. La ejecución de campo continúa pendiente en `Tareas_Beta.md`; ninguna función real se declara probada.

**Aceptación final:** las 30 tareas cerradas según sus criterios; ninguna función perdida; cero configuración local prohibida; despliegue simplificado y rendimiento no inferior a la línea base.

#### Trazabilidad de acciones completada en primera pasada — 2026-11-23

- Se generó en `MATRIZ_MIGRACION_SERVICIOS.md` una tabla de **121 acciones → servicio → handler → consumidor localizado**. Las 121 acciones tienen handler o ejecución inline identificada; no hay acciones del mapa sin dispatcher/handler en esta extracción.
- Se identificaron **12 acciones sin consumidor directo localizado** en los módulos frontend inspeccionados. Quedan para clasificación como manuales, internas, indirectas o históricas; no se autoriza retirarlas por ese motivo.
- Se inventariaron aparte las 13 operaciones internas de Coordinator y las rutas internas de caché de actor en USERS/WRITE/FEEDBACK/ADMIN. Se verificaron además las llamadas ADMIN→CATALOG (`getVehicleProjection`, `getContributionCandidates`) y ADMIN→WRITE (`allocateVehicleId`, `freezeCortesIds`).
- Se documentó la diferencia de transporte de `getCatalogChanges`: el flujo incremental frontend usa GET `catalogFeed=1` en FEEDBACK y Coordinator, aunque existe también el handler POST de FEEDBACK.
- La prueba `ActionDispatchContract.js` ejecutada sobre fuentes exactas de la rama sigue en **12/12 PASS**.

**MIG-001 sigue EN PROGRESO**: falta asociar las 121 acciones y 19 categorías CAP con payload/response, RBAC exacto, hojas/columnas, archivos/Drive, APIs externas, procesos manuales/programados y pruebas específicas de paridad.


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
- La extracción estática confirma 121 acciones únicas y 0 acciones mapeadas sin router/handler. Las 12 acciones sin consumidor directo localizado siguen pendientes de clasificación y no se retiran.

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
- 120/121 acciones del mapa con ruta backend/handler; CATALOG conserva una ruta adicional de compatibilidad `getSuggestion`.
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

#### Adenda de estado AUTH — 2026-11-24
- La recuperación de contraseña dejó de depender de un secreto HMAC persistente. El código temporal tiene 96 bits aleatorios; SHA-256 genera los digests de código, correo e identificadores de caché. Se mantienen TTL de 10 minutos, consumo único, cinco intentos y límite de tres solicitudes por hora.
- El formulario de recuperación ahora acepta exactamente 24 caracteres hexadecimales; Service Worker actualizado a gpsepedia-cache-v75.
- El secreto anterior GPSpedia_PASSWORD_RECOVERY_SECRET_V1 ya no se consulta ni se crea. No se pudo ni se intentó borrar de PropertiesService instaladas; la limpieza requiere despliegue y verificación Beta.
- CI 233ba43f: PasswordRecovery 10/10 PASS; sintaxis PASS; 337 suites, 3,882 pruebas aprobadas y 3 fallos ajenos a esta modificación (WriteCatalogPublicationIsolation en dos grupos y GP-PERF FEEDBACK/Inbox).


#### Cierre del subtramo AUTH — idempotencia de login — 2026-11-24
- Implementación en JS/Services/Auth.js; fixture de pruebas sincronizado en JS/Tests/Auth.js.
- Hoja privada/operativa LoginRequests, esquema de 10 columnas, marcador LOGIN_REQUEST_BASELINE_MARKER_ y baseline reanudable. El baseline importa las propiedades login_request_ una sola vez, verifica append/read-back y no escribe ni elimina propiedades. Una vez confirmado baseline_v1, el flujo ordinario ya no consulta ScriptProperties.
- El registro mantiene requestId, userId, token, createdAt, createdAtMs, estado pending/committed/revoked, pointerSet y fechas de confirmación/revocación.
- Limpieza TTL 24 h con cursor rotatorio y máximo 25 filas por ejecución; invalida tokens de solicitudes pending vencidas antes de retirar su registro. La reconciliación de append ambiguo conserva el mismo token.
- Las funciones AUTH que usan ScriptLock no llaman waitLock: usan tryLock(0) y devuelven contención inmediata, sin espera de hasta 10 s. Las secciones críticas necesarias para mantener la unicidad de sesiones permanecen protegidas; una contención puede requerir reintento.
- CI run 45308365799 sobre commit 7c4b342d66623d078101f3f50cb3879e374f40c3: sintaxis PASS; 338 suites, 3,922 pruebas aprobadas; 3 fallos fuera de este subtramo: WriteCatalogPublicationIsolation (dos grupos) y GP-PERF FEEDBACK/Inbox. Pages run 45308365427 SUCCESS.
- No se desplegó Apps Script ni se accedió a hojas/propiedades instaladas. La limpieza física de propiedades login_request_ queda pendiente de Beta, después de verificar el baseline en un proyecto aislado.


### Requisito crítico adicional — privacidad de errores AUTH/sesión — 2026-11-24
- La interfaz nunca debe mostrar mensajes técnicos, excepciones, trazas, nombres de funciones, códigos internos ni detalles que revelen el estado de una cuenta o sesión.
- Para errores de inicio de sesión, la UI queda limitada a: `Error en el inicio de sesión, intente otra vez` y, únicamente cuando AUTH clasifique explícitamente credenciales incorrectas, `Contraseña o usuario incorrecto`.
- Los detalles diagnósticos se registran en la consola del navegador mediante `console.error`/`console.warn`; los motivos de cierre de sesión se sanitizan antes de llamar a `showLoginScreen`.
- Implementación añadida en `JS/Frontend/auth.js`, clasificación `INVALID_CREDENTIALS` en `JS/Services/Auth.js` y fixture `JS/Tests/Auth.js`. Se añadió `JS/Tests/AuthErrorPrivacy.mjs` al runner MIG026.
- Estado: implementado en código; pendiente CI del commit y revisión de resultados. No se ha desplegado AUTH ni se ha realizado validación Beta.

- Cierre de validación 2026-11-24: tras ajustar el contrato de cierre de sesión y la aserción de consola, CI run 45383504489 terminó SUCCESS: 500 suites, 5,896 pruebas aprobadas, 0 fallos; sintaxis PASS. AuthErrorPrivacy 7/7 PASS y regresión SessionUiRoleInvalidation quedó aprobada. Commit funcional final: 334c5b51a1ae7fd3b4a952b5038ffd874ff9431a. Estado del requisito: COMPLETADO EN CÓDIGO Y CI; validación visual de navegador real diferida a Beta. No se desplegó AUTH.


#### Adenda — privacidad AUTH/sesión, cierre de brechas de presentación — 2026-11-24

- La revisión posterior al cierre de CI detectó rutas adicionales de exposición: sesión local inválida, rol local inválido, cierre desde otra pestaña y fallo de limpieza de caché.
- Se amplía el saneamiento en frontend y se aplica una lista permitida directamente en `showLoginScreen`, conservando el aviso neutral de cierre voluntario.
- El mensaje de credenciales se normaliza exactamente a `contraseña o usuario incorrecto`; los diagnósticos específicos permanecen en consola.
- La corrección se mantiene dentro del requisito de privacidad AUTH/sesión; no modifica contratos backend, permisos, servicios desplegados ni datos reales.
