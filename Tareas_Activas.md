# GPSpedia — Tareas activas
Fecha de actualización: 2026-11-19
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5 (no modificar)
Normativa: NORMAS_DESAROLLO.md

## Estado consolidado vigente — verificado 2026-11-20
- Último HEAD de código validado: `4f5a85065816d2277341cf1f7827c29d9dc2519b`; los commits posteriores son documentales y quedan registrados en checkpoint. Rama base protegida: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no se modificó.
- Última regresión verificada sobre HEAD documental `f66108109a43acc304e4749c056ca81eb0764423`: GitHub Actions `44768516802` SUCCESS — 221 suites, 2,743 pruebas aprobadas, 0 fallos. Health `44768516938` SUCCESS; Pages `44768516088` SUCCESS.
- Fase 1 (ADMIN salud/telemetría): implementación local y regresión integral COMPLETADAS. Contratos verificados: ServiceHealth 17/17, ServiceTrafficAdmin 33/33, BrowserTraffic 9/9, Aggregator 5/5, Aggregation 6/6, DirectTelemetry 21/21, Batch 5/5 y Metrics 1/1.
- Fase 2 (arquitectura/Coordinator): implementación local base COMPLETADA; configuración de ScriptProperties, URLs, secretos y deployments reales queda para Beta autorizada.
- Fase 3 (Inbox/aislamiento): correcciones locales y regresión COMPLETADAS; InboxConversations 66/66 y CoordinatorCapabilityPreservation 6/6. Verificación con credenciales/deployments reales queda para Beta.
- Fase 4 (ADMIN controles/responsive): implementación local COMPLETADA; inspección visual real de escritorio/móvil queda para Beta.
- Fase 5 (auditoría/organizador de imágenes): constructor, inventario, referencias, endpoint preview y UI paginada de solo lectura IMPLEMENTADOS. La auditoría y preview con Drive/Spreadsheet reales siguen pendientes de Beta. **Safe Apply EN PROGRESO:** ya existen primitivas puras para congelar manifiestos aprobados, exigir confirmación, clasificar reintentos idempotentes y preparar rollback en orden inverso. Aún falta el ejecutor Drive, el registro durable de operaciones y la comprobación de permisos heredados de destinos. No ejecutar movimientos reales hasta revisar y aprobar el preview real.
- Fase 6 (documentación/rotación): COMPLETADA.
- Fase 7 (regresión/transición): regresión local COMPLETADA; transición y verificaciones de entorno Beta pendientes.
- Búsqueda agrupada `GP-UX-SEARCH-MODEL-GROUPING-01`: implementación y regresión COMPLETADAS; SearchModelGrouping 21/21. Falta prueba visual de navegador con catálogo representativo.
- Optimización ADMIN/WRITE de locks, snapshots y reserva idempotente de vehicleId: implementación/auditoría y regresión local COMPLETADAS; quedan validaciones reales de Script IDs, concurrencia y Spreadsheet aislado.
- Las casillas abiertas históricas de este archivo corresponden a validaciones Beta/entorno externo o al Safe Apply condicionado al preview real; no deben interpretarse como regresiones locales aún no ejecutadas. Hay referencias repetidas por etapas históricas: conservarlas y cerrar mediante adendas, no borrar evidencia.
- Próxima dependencia: disponer de entorno Beta autorizado y Script IDs verificados; desplegar primero Coordinator según `Services/COORDINATOR_SETUP.md`, luego los consumidores que correspondan. Para imágenes: ADMIN actualizado → auditoría Drive nueva → preview completo → revisión de rutas/nombres/extensiones/referencias/ACL/duplicados → recién entonces diseñar e implementar Safe Apply.


## Plan de ejecución vigente — implementación local antes de Beta (2026-11-19)

**Orden obligatorio:** terminar las implementaciones y correcciones locales; ejecutar la regresión integral; solo después preparar y realizar despliegues y validaciones Beta con autorización. No desplegar Apps Script, cambiar ScriptProperties/secretos ni ejecutar pruebas contra Drive, Spreadsheet o servicios remotos durante este bloque.

### Fase 1 — ADMIN: salud y telemetría de servicios
**P0 · IMPLEMENTADO LOCALMENTE; PENDIENTE REGRESIÓN INTEGRAL · BETA-ADMIN-SERVICE-TELEMETRY-02 + BETA-ADMIN-GLOBAL-TRAFFIC-01**
- Corregir los defectos reproducibles del escáner (incluido `events is not defined`) y del contrato/respuesta del agregado global.
- Recuperar salud y tráfico de todos los servicios activos, incluido el tráfico del navegador móvil; excluir LEGACY del inventario, las consultas y la interfaz.
- El escáner debe mostrar una tarjeta por cada servicio activo. Al seleccionar una tarjeta, mostrar todas las métricas disponibles de ese servicio, su estado/versión/latencia y los datos diagnósticos seguros.
- Presentar dos gráficas separadas: (1) tráfico global agregado de los servicios y (2) tráfico local del servicio seleccionado. No confundir datos ausentes con cero ni disponibilidad del endpoint con salud integral de Sheets/Drive.
- Aislar fallos parciales: un servicio sin telemetría o con error no debe ocultar los datos de los demás. Mantener la interfaz y las consultas funcionales en navegador móvil.
- Validar contratos, autenticación, permisos, límites, normalización, renderizado, concurrencia y coste de telemetría sin añadir esperas ni viajes de red a las acciones ordinarias.

**Estado de implementación local (2026-11-19):**
- Corregido el detalle de servicio que referenciaba `events` y `lastEvent` sin declararlos.
- Añadido `JS/Frontend/serviceTelemetry.js`: métricas efímeras por servicio, latencia, resultado, últimas acciones y detección móvil/tableta/escritorio; sin payloads, tokens, persistencia ni llamadas de red adicionales.
- Recuperadas dos gráficas independientes: agregado global de los siete servicios y tráfico local del servicio seleccionado en el navegador actual.
- Endurecido el contrato global: exige los siete servicios activos, los tres periodos y buckets íntegros; LEGACY se rechaza. Un fallo de una fuente directa no invalida Coordinator ni las demás fuentes.
- Añadido contador directo no bloqueante para `USERS/getUsers`; Coordinator consulta centralmente cinco fuentes directas (CATALOG, AUTH, WRITE, FEEDBACK y USERS), además de las operaciones coordinadas de los siete servicios. ADMIN consume un solo agregado global y conserva fallback temporal para Coordinators anteriores a 1.4.4.
- Añadido el módulo al App Shell PWA y aumentado la caché a v74. Pruebas nuevas registradas en `RunServiceTests.mjs`.
- Validaciones aisladas: ServiceBrowserTrafficContract 9/9; ServiceTrafficAggregatorContract PASS; ServiceTrafficAggregation 6/6; syntax check de módulos productivos PASS. Tras mover la agregación a Coordinator, ServiceTrafficAdminContract requiere repetirse en el HEAD actual. SharedMutationCoordinator 77/77 PASS; DirectServiceTrafficTelemetry 21/21; UsersDirectTrafficTelemetry 6/6; CatalogTrafficTelemetry 9/9. Se mantiene pendiente la regresión integral de todas las suites en el HEAD final. No se desplegó Apps Script ni se modificaron ScriptProperties, Drive o Spreadsheet.

### Fase 2 — Simplificación de arquitectura y configuración de servicios
**P0 · IMPLEMENTACIÓN LOCAL BASE COMPLETADA; CONFIGURACIÓN Y VALIDACIÓN REMOTA PENDIENTES · SERVICE-ARCHITECTURE-SIMPLIFICATION-01**
- Reducir el acoplamiento de despliegue: cambios internos compatibles de Coordinator se publican solo en Coordinator; una capacidad nueva del cliente solo requiere actualizar los consumidores que la utilicen.
- Coordinator conserva la autoridad sobre el ciclo de vida de sesión, revocaciones, invalidación remota y telemetría. Las leases se mantienen solo en los flujos que aún las requieren; ADMIN ya no adquiere leases por acción ordinaria.
- **Capacidades innegociables:** salud de servicios; restricciones/cambios de acceso; revocación individual y global; invalidación remota de caché en WRITE, FEEDBACK y ADMIN; cierre/eliminación remota de cuentas con recuperación/compensación. Deny-by-default, RBAC, actor confiable, idempotencia, auditoría y rollback permanecen. La sección 15 de NORMAS_DESAROLLO.md prevalece sobre cualquier lease por acción ordinaria.
- Auditoría y diseño: `Services/SERVICE_ARCHITECTURE_PLAN.md`.
- [x] Protocolo POST v1 estable e independiente de la versión interna: SharedMutationClient envía `protocolVersion: 1`; Coordinator interpreta la ausencia del campo como v1 fijo, mantiene una lista explícita de versiones admitidas y rechaza versiones desconocidas antes de ejecutar acciones. Una futura versión debe convivir con v1; los cambios internos no deben exigir actualizar consumidores.
- [x] Invalidación remota centralizada: AUTH solicita a Coordinator; Coordinator contacta WRITE, FEEDBACK y ADMIN con sus secretos individuales y URLs centralizadas. Prevalida configuración, subdivide lotes, exige confirmación exacta y admite reintentos idempotentes. Se conserva el orden invalidación→revocación; si hay fallo parcial, AUTH no avanza a revocar.
- [x] Telemetría centralizada: Coordinator consulta en paralelo CATALOG/AUTH/USERS/WRITE/FEEDBACK y agrega sus contadores a los siete servicios; ADMIN consume un solo resultado global. Las fuentes parciales no anulan el agregado y los buckets corruptos/duplicados se ignoran con cobertura parcial.
- [x] Simplificación inicial de secretos: AUTH/USERS/WRITE/FEEDBACK y CATALOG aceptan `GPSpedia_COORDINATOR_SECRET` para telemetría directa, con fallback a la propiedad antigua solo cuando el secreto nuevo no existe. ADMIN mantiene su consulta directa solo como compatibilidad temporal con Coordinator anterior a 1.4.5.
- Catálogo canónico documentado en `Services/COORDINATOR_SETUP.md`: cada consumidor usa `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET`; Coordinator mantiene valores criptográficos independientes por servicio y URLs centralizadas. CATALOG tiene secreto limitado a telemetría de solo lectura. No se comparten secretos entre servicios.
- Configuración pendiente por entorno Beta: crear/verificar `GPSpedia_SERVICE_URL_CATALOG/AUTH/USERS/WRITE/FEEDBACK` y `GPSpedia_COORDINATOR_SECRET_CATALOG` en Coordinator; configurar la misma credencial CATALOG en su proyecto local. Retirar propiedades legacy de tráfico solo después de verificar todos los deployments. No se leyeron ni modificaron ScriptProperties ni secretos.
- Pruebas aisladas: SharedMutationCoordinator 77/77 PASS; ServiceBrowserTrafficContract 9/9; ServiceTrafficAggregatorContract PASS; ServiceTrafficAggregation 6/6; ServiceTrafficAdminContract 33/33 PASS tras el cambio central; InboxConversations 66/66. No se ejecutaron llamadas remotas reales ni CI integral.
- Política de despliegue documentada en Services/SERVICE_ARCHITECTURE_PLAN.md y Services/COORDINATOR_SETUP.md: cambios internos compatibles requieren solo Coordinator; cambios aditivos afectan únicamente consumidores que invoquen la nueva operación; el cliente legacy v1 se mantiene.
- Validación del protocolo: SharedMutationCoordinator 77/77 PASS tras fijar la compatibilidad legacy en v1 y comprobar clientes explícitos v1, legacy sin campo y rechazo de versiones inválidas.
- Nueva prueba registrada en RunServiceTests.mjs: CoordinatorCapabilityPreservation 6/6 PASS. Verifica RBAC jerárquico, restricciones al último Desarrollador, orden de invalidación remota antes de cierre/revocación, desactivación segura y recuperación reintentable, con confirmación de WRITE/FEEDBACK/ADMIN.
- La matriz de impacto de despliegue y el catálogo de configuración por servicio quedaron documentados. La implementación local base de esta fase se considera completa; quedan pendientes la configuración/verificación de cada entorno y la retirada de propiedades legacy en Beta autorizada. No desplegar en esta fase.

### Fase 3 — Inbox y aislamiento de operaciones
**P1 · CORRECCIONES LOCALES IMPLEMENTADAS; REGRESIÓN Y CONFIGURACIÓN REMOTA PENDIENTES**
- Corregido el contrato de validación de sesión: SharedMutationClient ahora identifica el servicio solicitante; Coordinator permite validar el actor con el secreto propio de AUTH, USERS, WRITE, ADMIN, FEEDBACK o UTILITIES, sin ampliar las acciones de registro/revocación reservadas a AUTH.
- Actualizados los consumidores AUTH, ADMIN, FEEDBACK, USERS y WRITE para enviar su identidad de servicio explícita. Esto corrige el defecto de FEEDBACK que intentaba validarse como AUTH usando el secreto FEEDBACK, causa reproducible del rechazo del Coordinator al cargar Inbox cuando la caché local no estaba poblada.
- El contrato mantiene compatibilidad con clientes anteriores que omiten el parámetro opcional (se conserva AUTH como valor por defecto). La telemetría atribuye la validación al servicio real.
- Corregido el preview de Inbox: al crear o leer conversaciones se convierte el contenido HTML a texto legible, se retiran etiquetas y bloques script/style y se decodifican entidades. El cuerpo completo continúa renderizándose con `sanitizeHtmlContent(..., "advanced")`; no se cambió su sanitización ni su almacenamiento.
- Pruebas ejecutadas: SharedMutationCoordinator 68/68; InboxConversations 66/66. La prueba de Inbox confirma el envío de identidad FEEDBACK y el preview histórico con HTML. Sintaxis de los cinco servicios, Coordinator, SharedMutationClient e InboxConversations PASS.
- Pendiente: ejecutar la regresión integral en el HEAD final. Tras autorizar la futura etapa Beta, verificar que GPSpedia_COORDINATOR_SECRET_FEEDBACK/USERS/WRITE/ADMIN coincidan con las propiedades de Coordinator y confirmar el flujo real de Inbox. No se consultaron ni modificaron secretos ni deployments.

### Fase 4 — ADMIN: controles y retroalimentación
**P1/P2 · IMPLEMENTACIÓN LOCAL COMPLETADA CON VALIDACIÓN VISUAL DIFERIDA A BETA**
- [x] Mensajes de limpieza de Logs: distinguen eliminación efectiva, hoja sin registros, registros revisados sin coincidencias sensibles y fallos/limpieza parcial.
- [x] Selector de retención compacto: opciones breves «Últimos 7 días» y «Todos (conservar encabezados)», etiqueta reducida y layout grid con min-width:0 para evitar overflow.
- [x] Contenedor de corte recomendado: padding reducido de 12 px a 8 px, sin alterar logo, nombre, acciones ni estructura del encabezado.
- [x] Auditoría de telemetría UI: se conservan dos fuentes/alcances separados (agregado global Coordinator y observaciones locales del navegador); las métricas de servicio se seleccionan por tarjeta y LEGACY no aparece. El grid cambia a una columna en móvil y los gráficos mantienen su scroll horizontal encapsulado.
- Pruebas locales: SensitiveLogsTrustedActor 7/7; ActivityLogsClearFeedback 5/5; AdminLogsMaintenanceContract 10/10; ServiceTrafficAdminContract 33/33; ServiceBrowserTrafficContract 9/9; ServiceTrafficAggregatorContract 5/5; ServiceTrafficAggregation 6/6; ServiceTrafficBatch 5/5; DirectTrafficRoutingCoverage 6/6.
- Pendiente exclusivamente Beta: inspección visual en navegador/dispositivo real y confirmación responsive en escritorio/móvil.

### Fase 5 — Auditoría y organizador de imágenes
**P1 · IMPLEMENTACIÓN LOCAL COMPLETADA; VALIDACIÓN REAL/BETA PENDIENTE**
- Reconciliar los registros históricos con el código real: el constructor puro, endpoint `previewCortesImageOrganizer` y UI paginada ya constan implementados; no repetirlos.
- Completar auditoría de cobertura, referencias de todas las hojas, inventario persistente, relación inteligente vehículo/imagen y clasificación explicable de «Sin uso»/«Reemplazada».
- Unificar rutas y nomenclatura de altas de cortes, modelos y logos; mantener `ign1..3`, `bomba1..3`, `btn1..3`, `alim1..3`, `apert` y extensión original.
- Diseñar aplicación por lotes solo después del preview: idempotencia, verificación individual, manifiesto, compensación/rollback y confirmación explícita. No mover, renombrar, borrar ni restaurar archivos en esta fase.

### Fase 6 — Documentación y coherencia de registros
**P2 · COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**
- [x] Rotación sin pérdida de Tareas_Pendientes.md y lista_beta_parte2.txt; ambos índices apuntan a sus partes ordenadas.
- [x] Reconstrucción exacta verificada contra los SHA de blob Git originales; límites elegidos en encabezado de sección y separador entre registros.
- [x] Manifiesto documental actualizado con tamaños Unicode/UTF-8, límites, rutas y SHA de cada parte.
- [x] Services/SERVICE_HEALTH.md reconciliado con las versiones declaradas por los endpoints fuente: FEEDBACK 1.2.2 y ADMIN 2.7.1. Las versiones de deployments externos siguen sin verificarse.
- [x] Tareas_Activas.md, lista_beta.txt, Auditoría.txt, ChangesLogs.txt y checkpoint.md actualizados sin reescribir registros históricos.
### Fase 7 — Regresión integral y transición a Beta
**REGRESIÓN INTEGRAL LOCAL COMPLETADA; VALIDACIÓN BETA PENDIENTE**
- [x] Regresión integral CI run 44532907478: 152 suites, 2,224 pruebas aprobadas, 0 fallos; LogoIdIntegrity 13/13 PASS.
- [x] Health run 44532907375 SUCCESS y Pages run 44532906078 SUCCESS.
- [x] Preparación de entrada a Beta: comandos seguros de verificación de repositorio/rama/árbol limpio, fetch y pull --ff-only ubicados al inicio de lista_beta_parte1.txt.
- [ ] Beta: requiere autorización para desplegar los proyectos Apps Script del entorno aislado y ejecutar auditoría Drive/Spreadsheet de solo lectura; no aplicar movimientos ni renombrados.

- Ejecutar las pruebas locales pertinentes de cada fase y una regresión integral de contratos, sintaxis, permisos, sesiones, revocaciones, caché remota, cuentas, telemetría y flujos administrativos.
- Registrar por separado lo aprobado localmente y lo que exige deployment, credenciales, navegador/dispositivo real, Drive o Spreadsheet.
- Abrir la fase Beta únicamente después de cerrar las implementaciones locales; los comandos seguros de sincronización ya están al inicio de lista_beta_parte1.txt; ejecutarlos antes de cualquier prueba Beta.

**Criterio de avance:** cerrar cada tarea con diff revisado, pruebas locales reproducibles y commit verificado en `GPSpedia2.2.5_work`. Si aparece un hallazgo crítico de seguridad/integridad, atenderlo antes de avanzar. La rama base `GPSpedia2.2.5` permanece protegida e intacta.

---

## Completadas en esta continuidad
- [x] BETA-ADMIN-CUT-IMAGE-AUDIT-CONSOLE-01 — consola de Cortes como salida principal; confirmación conservada en terminal global del Desarrollador; resultados y resumen verificados.
- [x] BETA-ADMIN-CUT-IMAGE-ORGANIZER-AUDIT-01 — auditoría estática de normalización, movimiento, rutas, nomenclatura, referencias y alta de logos.
- [x] Mitigación de alta de logos — handleAddLogo usa findOrCreateSubFolder y no activa la fusión heredada de carpetas.
- [x] BETA-ADMIN-CUT-IMAGE-ORGANIZER-DRY-RUN-01 — constructor puro, endpoint preview y UI paginada de solo lectura implementados localmente; pendiente validar datos reales en la futura etapa Beta.
- [x] BETA-ADMIN-SERVICE-TELEMETRY-02 — inventario de siete servicios, detalle por servicio, agregado global, gráfica local de navegador y cobertura móvil implementados localmente; regresión integral pendiente.
- [x] CI: 146 suites, 2,157 pruebas aprobadas, 0 fallos; health y Pages SUCCESS en HEAD d81894f53e6036a1b3d0e0e86b317ad913ec42ee.

## Pendientes — prioridad inmediata

### P0 — SERVICE-ARCHITECTURE-SIMPLIFICATION-01 — COMPLETADA CON VALIDACIÓN DIFERIDA A BETA
- Desacoplar la implementación central de Coordinator de los clientes Apps Script; estabilizar/versionar el contrato para que cambios internos no requieran redeploy de todos los consumidores.
- Reducir la necesidad de sincronizar copias de SharedMutationClient sin introducir dependencias de bibliotecas/versiones que sigan exigiendo desplegar cada consumidor.
- Consolidar URLs y secretos con nombres/configuración uniformes, manteniendo secretos fuera del repositorio y aislamiento entre servicios.
- Conservar y probar: salud de todos los servicios; restricciones de cuentas; revocación remota de sesiones; limpieza remota de caché por usuario; cierre/eliminación remota de cuentas. No retirar permisos, RBAC, auditoría ni rollback.

### P1 — INBOX-AUTHORIZATION-AND-ISOLATION-01 — COMPLETADA CON VALIDACIÓN DIFERIDA A BETA
- Corregir «servicio no autorizado» en las consultas Inbox sin ampliar privilegios.
- Auditar interferencias de locks/leases entre auditoría de imágenes e Inbox.
- Corregir el fragmento HTML en la bandeja para mostrar texto legible y mantener renderizado seguro al abrir el mensaje.

### P1 — ADMIN-FEEDBACK-AND-RESPONSIVE-01 — COMPLETADA CON VALIDACIÓN DIFERIDA A BETA
- Corregir los mensajes de borrado de logs (borrado efectivo, sin registros y error).
- Compactar retención de logs (7 días / eliminar todos) sin overflow.
- Corregir el padding del contenedor de imagen del modal sin mover logo, nombre ni acciones ya aceptados.


### P1 — BETA-ADMIN-CUT-IMAGE-ORGANIZER-STRUCTURE-01 — IMPLEMENTACIÓN LOCAL COMPLETADA; VALIDACIÓN BETA PENDIENTE
Aplicar la estructura objetivo después de validar el dry-run:
- Vehículos: Cortes/<categoría>/<marca>/<modelo>/<versión-o-encendido>/<año-inicio-año-fin>/
- Logo: <marca>_logo.<extensión> en el primer nivel de la carpeta de marca.
- Nombres: <modelo>_<versión-o-encendido>_<año-inicio>_<año-fin>_<función>.<extensión>.
- Códigos funcionales obligatorios: ign1..ign3, bomba1..bomba3 y btn1..btn3, numerados por función real derivada de tipoCorte1/2/3; alim1..alim3 para imgCableAlimen/2/3; apert para imgApertura; imagenVehiculo para la imagen principal. Los tipos desconocidos o ambiguos bloquean el destino. La extensión original se conserva.
- Resolver colisiones sin sobrescribir y sin enviar archivos o carpetas a papelera.

### P1 — BETA-ADMIN-CUT-IMAGE-ORGANIZER-REGISTRATION-CONSISTENCY-01 — COMPLETADA CON VALIDACIÓN DIFERIDA A BETA
- Unificar handleAddLogo y altas de imágenes de Cortes con el mismo constructor de destino.
- La alta de logo debe guardar en el primer nivel de la carpeta de marca, no en Cortes/Logos.
- Mantener bloqueada la operación si la categoría de una marca no es única.

### P1 — BETA-ADMIN-CUT-IMAGE-ORGANIZER-SAFE-APPLY-01
- Separar preview y aplicación.
- Requerir confirmación explícita desde la terminal del Desarrollador.
- Aplicar por lotes idempotentes; verificar cada movimiento/renombrado y actualización de URL; registrar manifiesto y permitir rollback.
- No eliminar ni restaurar archivos automáticamente.

### P2 — DOC-ROTATION-01 — COMPLETADA
- Rotar Tareas_Pendientes.md y lista_beta_parte2.txt, ambos por encima de 180,000 caracteres Unicode.
- Dividir solo en límites de registro, conservar contenido exacto, verificar reconstrucción y actualizar los manifiestos/índices.
- No añadir más contenido a esos dos archivos hasta completar la rotación.

## Evidencia y límites
- La auditoría de código no equivale a validar los datos reales de Drive/Spreadsheet.
- No se han movido, renombrado, copiado, restaurado ni eliminado archivos productivos.
- No se han desplegado Apps Script. La validación de la nueva organización requerirá ejecutar primero el dry-run tras su despliegue y revisar sus resultados.
- Estado: constructor, endpoint y UI del preview implementados localmente. La validación de CI/contratos queda en la regresión local; el despliegue ADMIN, auditoría Drive nueva y preview real se posponen hasta cerrar todas las tareas locales. No aplicar movimientos ni renombrados.


## Actualización 2026-11-19 — subpaso completado
- [x] Constructor puro buildCortesImageOrganizerTargets_: genera rutas y nombres para ocho campos de Cortes y LogosMarca; usa columnas reales, bloquea datos ambiguos y no realiza escrituras.
- [x] Prueba dinámica con el mapa real COLS_CORTES: rutas/nombres, tipo desconocido, fórmula, año faltante, ID compartido y marca mult categoría.
- [x] El P0 DRY-RUN-01 quedó implementado localmente: endpoint de solo lectura, inspección de inventario/rutas/extensiones, referencias activas de todas las hojas, conflictos, manifiesto y digest; la UI paginada ya está conectada.
- CI del subpaso: 146 suites, 2,157 pruebas aprobadas, 0 fallos en HEAD aa967514d3602f0512a05f9ddf1fafc1c11c0c24. Apps Script aún no desplegado; no se realizaron operaciones productivas.


## Actualización 2026-11-19 — endpoint backend dry-run
- [x] Acción ADMIN previewCortesImageOrganizer, con permiso compartido de solo lectura en ADMIN, api-config y Coordinator.
- [x] Revalidación de auditoría completa/vigente, inventario y metadatos con rutas, extensión original, referencias activas de todas las hojas, historial, carpetas destino y colisiones.
- [x] Paginación por destinos (25 por defecto, máximo 50), estados y motivos por archivo, manifestDigest, writePerformed:false y canApply:false.
- [x] Persistencia de folderPath en páginas de auditoría y bloqueo de destinos duplicados.
- [x] CI: 146 suites, 2,157 pruebas aprobadas, 0 fallos; health y Pages SUCCESS en HEAD 6e43666b69ff20b7945f5ebe7b7745a7758ce8d0.
- [x] Integrar previewCortesImageOrganizer en ui.js y presentar resultados paginados en el modal/consola.
- [ ] Validar en Beta tras cerrar todas las implementaciones locales: desplegar ADMIN, generar una auditoría Drive nueva y revisar resultados reales. No aplicar cambios.
- [ ] Mantener bloqueada la aplicación de movimientos/renombrados hasta terminar la UI, revisar el manifiesto real y probar rollback.


## Actualización 2026-11-19 — UI conectada
- [x] Botón «Previsualizar organización» y panel de resultados agregados al modal de auditoría.
- [x] ui.js recorre las páginas del endpoint, valida digest estable, offset, total, finalización y banderas writePerformed:false/canApply:false; presenta conteos y detalles por archivo.
- [x] No se habilita ninguna mutación desde la UI.
- CI HEAD bb3f3a1fcf47d328f1ab51a4ab5dc3a93e2e3807: 146 suites, 2,157 pruebas aprobadas, 0 fallos; health y Pages SUCCESS.
- [ ] Validar en Beta después de cerrar todas las implementaciones locales: desplegar ADMIN y ejecutar una auditoría Drive nueva para persistir folderPath en el inventario.
- [ ] Ejecutar el preview real y revisar rutas, nombres, extensiones, referencias y conflictos. Mantener la aplicación bloqueada.
- [ ] Corregir cualquier discrepancia real antes de implementar la aplicación segura por lotes y rollback.


## Corrección de nomenclatura funcional — 2026-11-18
- [x] ADMIN: numeración explícita por función para ign1..ign3, bomba1..bomba3 y btn1..btn3, derivada de los valores reales de tipoCorte1/2/3.
- [x] ADMIN: alimentación uniforme alim1..alim3 para imgCableAlimen, imgCableAlimen2 e imgCableAlimen3; apertura permanece apert.
- [x] Pruebas dinámicas ampliadas para las tres posiciones de cada tipo de corte y los tres campos de alimentación.
- [ ] Desplegar ADMIN actualizado, generar una auditoría Drive nueva y ejecutar el preview de solo lectura para validar nombres/rutas/extensiones/referencias reales. No aplicar movimientos ni renombrados.

 
## Actualización 2026-11-19 — auditoría y corrección de nomenclatura funcional
- [x] Se auditó la numeración del organizador y del alta de imágenes ADMIN. El helper `getCorteFunctionSuffix_` recibía `imageValues` pero no lo utilizaba; los huecos de imágenes podían dejar ordinales no consecutivos.
- [x] Corregido: `ign1..ign3`, `bomba1..bomba3` y `btn1..btn3` se numeran por función de corte y por recursos realmente presentes en los slots anteriores. Un tipo anterior desconocido con imagen bloquea el nombre para evitar asignaciones ambiguas.
- [x] Alimentación: `imgCableAlimen`, `imgCableAlimen2`, `imgCableAlimen3` producen `alim1`, `alim2`, `alim3`; apertura produce `apert`; la imagen principal produce `imagenVehiculo`. Se conserva la extensión original.
- [x] El código canónico para ignición es `ign` (no `ing`), conforme al catálogo funcional vigente.
- [x] Pruebas dinámicas de slots poblados/vacíos, tipos mixtos y tipo ambiguo; el contrato existente cubre los tres ordinales de ignición, bomba y botón.
- CI HEAD `ceafea0c056c24cd593d288124ef248059d10a90`: 152 suites, 2,218 pruebas aprobadas, 0 fallos; health SUCCESS. Pages en espera al momento del registro.
- [ ] Beta: tras autorizar deployment ADMIN, ejecutar auditoría Drive nueva y preview de solo lectura con datos reales. Comprobar nombres, extensiones, referencias y conflictos; no aplicar movimientos ni renombrados.

 
## Actualización 2026-11-19 — clasificación del inventario y del historial
- [x] Corregida la clasificación compartida por el preview de conciliación: `collectReplacedImageHistoryIds_` ahora distingue `origen_registro`, `tipo_registro` y `estado`.
- [x] Los registros `auditoria_drive / sin_uso_detectado` dejan de confundirse con imágenes reemplazadas y pueden volver a ser candidatos si coinciden con un destino vacío y seguro.
- [x] Se conservan como no reutilizables los reemplazos históricos y los registros protegidos/en revisión; se excluyen los registros confirmados como `eliminada`.
- [x] Compatibilidad con inventario legado sin columnas dinámicas: `tipo_contenido=inventario_sin_uso` identifica el registro como sin uso.
- [x] Pruebas: CortesImageReconciliation 34/34; regresión integral CI 152 suites, 2,224 pruebas, 0 fallos; health SUCCESS.
- [ ] Beta: verificar la clasificación con datos reales de Drive/Spreadsheet después del deployment autorizado. No se aplicó ninguna asociación ni movimiento.

 
## Actualización 2026-11-19 — rutas de alta alineadas con el organizador
- [x] `findOrCreateVehicleFolder` utiliza la misma normalización de segmentos que el organizador: categoría, marca, modelo y versión/encendido.
- [x] `getVehicleYearFolderName` genera el formato canónico `AAAA-AAAA`, incluido `2020-2020` para un solo año; los rangos invertidos se rechazan.
- [x] La creación de carpetas no utiliza valores sustitutos cuando faltan categoría, marca, modelo, versión/encendido o rango válido; se detiene antes de crear una ruta divergente.
- [x] Prueba contractual: alta genera exactamente `Cortes/Camion_pesado/Toyota/Hilux_SRV/SRV/2020-2025`, igual al destino del organizador.
- CI HEAD `0766fda94d9171c772e0052bff26d65f26deef14`: 152 suites, 2,224 pruebas aprobadas, 0 fallos; health y Pages SUCCESS.
- [ ] Beta: validar rutas actuales y destinos propuestos con inventario real; cualquier carpeta equivalente duplicada debe continuar bloqueando la operación.

 
## Adenda 2026-11-19 — validación estricta de años en rutas canónicas
- [x] `getVehicleYearFolderName` ahora acepta únicamente `anoDesde` y `anoHasta` con cuatro dígitos exactos; no interpreta parcialmente valores como `2020abc`.
- [x] Los años faltantes, formatos inválidos y rangos invertidos no producen rutas; un año único requiere el mismo año en ambos campos y genera `AAAA-AAAA`.
- Pruebas dinámicas de rutas: 5/5 PASS. CI run 44525492921 SUCCESS: 152 suites, 2,224 pruebas, 0 fallos; health run 44525493007 SUCCESS. Pages run 44525492332 en curso al registrar.

 
## Cierre local de Fase 5 — 2026-11-19
- [x] Nomenclatura funcional para las ocho columnas de imagen: `imagenVehiculo`, `ign1..3`, `bomba1..3`, `btn1..3`, `apert`, `alim1..3`; extensión original preservada.
- [x] Numeración de cortes según recursos realmente presentes; slots vacíos no consumen ordinal y tipos previos ambiguos bloquean.
- [x] Rutas de alta y organizador alineadas; segmentos normalizados y rango estricto `AAAA-AAAA`.
- [x] Cobertura de referencias: ocho columnas de Cortes, todas las demás hojas activas, fórmulas, texto enriquecido, imágenes en celda y sobre cuadrícula; referencias no verificables bloquean la clasificación.
- [x] Inventario persistente: auditoría completa, idempotencia por operación, validación de referencias, verificación de escritura/read-back, protección de duplicados y estados inciertos.
- [x] Historial separado de inventario sin uso; migración legacy infiere `auditoria_drive / sin_uso_detectado` cuando `tipo_contenido=inventario_sin_uso`.
- [x] Conciliación exacta y aplicación controlada revisadas: CortesImageReconciliation 34/34; CortesImageReconciliationApply 15/15; AdminImageTrashLifecycle 40/40; LogoIdIntegrity 13/13; AdminImageScanCoordinatorContract 1/1.
- [x] Contratos adicionales: ImageReferenceCoverageContract, UnusedImageInventoryPersistenceContract y LegacyUnusedInventoryMigrationContract PASS.
- CI HEAD `41c844ab9578499c4f49e4e4584bd32a09a0c8e8`: 152 suites, 2,224 pruebas, 0 fallos; health y Pages SUCCESS.
- [ ] Beta pendiente: ejecutar auditoría real en Drive/Spreadsheet con sesión Desarrollador autorizada, revisar preview completo, ACL, duplicados, referencias faltantes y rutas actuales. No se aplicaron cambios reales ni se movieron archivos.


## Adenda 2026-11-19 — coherencia del registro de logotipos
- [x] `buildCanonicalLogoDestination_` es la única construcción de `targetFolderPath` y `targetBaseName` para logos; lo utilizan tanto `buildCortesImageOrganizerTargets_` como `handleAddLogo`.
- [x] La alta crea la carpeta desde los segmentos del destino canónico y conserva extensión original, categoría única y prevención de colisiones.
- [x] Los tipos sin categoría o con categorías ambiguas siguen bloqueados; no se amplían permisos ni se añaden llamadas de red.
- [x] CI run 44532907478: 152 suites, 2,224 pruebas, 0 fallos; LogoIdIntegrity 13/13.
- [ ] Beta: comprobar en Drive aislado que el archivo subido y el preview produzcan exactamente la misma ruta/nombre. No se creó ni movió ningún archivo productivo.


## Adenda 2026-11-19 — ADMIN: simplificación de sesión completada
- Hallazgo corregido: el router ADMIN adquiría leases del Coordinator para lecturas y mutaciones ordinarias, en contradicción con la sección 15 de NORMAS_DESAROLLO.md.
- Corrección aplicada: ADMIN usa el actor de sesión cacheado; las llamadas internas ADMIN→WRITE transmiten userId/sessionToken para que WRITE valide su propio actor cacheado. Se mantienen RBAC y auditoría de mutaciones.
- La tarea queda **COMPLETADA LOCALMENTE**: no hay leases ni llamadas de autorización a Coordinator en el router ADMIN; RBAC y auditoría se mantienen; ADMIN→WRITE usa credenciales de sesión y validación de actor cacheado en WRITE. La invalidación remota de caché incluye ADMIN.

- CI run 44535834471 detectó contratos históricos que aún exigían token/lease ADMIN; se alinearon las pruebas con actor cacheado y se retiraron políticas ADMIN de lease obsoletas.

- La segunda ejecución CI (run 44536463315) detectó dos errores en los contratos actualizados: escapes literales y delimitador de función incorrecto. Se corrigieron antes de reintentar.

- CI final del cambio ADMIN, run 44539942784: **SUCCESS — 152 suites, 2,224 pruebas aprobadas, 0 fallos**. Health read-only 44539942669 SUCCESS; Pages 44539942102 SUCCESS. HEAD de cierre: 71894f2e4c391e13b7935738389967f4a8ebe083.
- Siguiente tarea local: auditar los puntos restantes de adquisición de leases en AUTH/USERS/UTILITIES contra la sección 15; conservar solo las excepciones de sesión expresamente permitidas. Safe Apply del organizador sigue bloqueado hasta revisar un preview real de Drive y recibir autorización; no mover ni renombrar archivos.


## Adenda 2026-11-19 — AUTH: limpieza de Logs sin lease
- [x] `clearSensitiveLogs` dejó de pasar por `withSharedMutationLease_`; AUTH obtiene el actor desde caché y ejecuta localmente el control de rol Desarrollador. La acción no modifica sesiones y no requiere autorización de Coordinator por solicitud.
- [x] `SensitiveLogsTrustedActor` 7/7 PASS; `SessionActivityCoordination` 11/11 PASS.
- CI run 44541720461 SUCCESS: 152 suites, 2,224 pruebas, 0 fallos. Health read-only 44541720459 SUCCESS. Pages run 44541720180 pendiente al registrar.
- Siguiente revisión: clasificar los usos restantes de leases en AUTH (ciclo de sesión/recuperación), USERS (mutaciones de cuenta que hoy se serializan con delete/reset AUTH) y UTILITIES (migración manual con lock local). No retirar protecciones de concurrencia sin una alternativa equivalente.


## Adenda 2026-11-19 — revisión de leases restantes según sección 15
- [x] AUTH: `clearSensitiveLogs` pasó a actor cacheado y RBAC local, sin lease. Las leases restantes de AUTH están ligadas a login, actividad de sesión, recuperación/cambio de contraseña, revocación/eliminación de cuenta, cambios de rol y migración legacy de credenciales.
- [x] USERS: `createUser` y `updateProfile` conservan lease porque se serializan con `AUTH/deleteUser`, `resetUserSessions` y `updateUser` sobre recursos compartidos; retirarla sin trasladar la propiedad de escritura de Users abriría una carrera entre actualización de perfil/alta y eliminación o cambio de cuenta. La suite `UsersAtomicMutations` conserva esta garantía.
- [x] UTILITIES: `migrateTimestamps` es una migración manual con staging, backup, rollback y `ScriptLock` local; no tiene consumidor ordinario en la interfaz. Se conserva la lease de mantenimiento hasta rediseñar el flujo de migración.
- [x] No se encontraron leases en los routers ordinarios de WRITE, FEEDBACK o ADMIN; `AUTH/clearSensitiveLogs` tampoco adquiere lease.
- Resultado: no se retiran las coordinaciones de USERS/UTILITIES sin una alternativa de integridad equivalente. La sección 15 sigue prevaleciendo para acciones ordinarias; estas rutas se documentan como operaciones de cuenta/migración, no como autorización por cada acción de contenido.

- Estado de cierre local: ADMIN y AUTH/clearSensitiveLogs simplificados y probados; quedan solo validaciones Beta y Safe Apply condicionado a preview real. Última regresión 44542256815 SUCCESS (152 suites/2,224 pruebas/0 fallos); health 44542256611 SUCCESS; Pages 44542253541 SUCCESS. HEAD documental 6ad8d99f41bc009e193932171afbcb86a0105230; base protegida sin cambios.

## Adenda 2026-11-19 — separar implementación local y validación Beta
- [x] Revisión de BETA-INBOX-PREVIEW-HTML-01: preview de texto plano, eliminación de script/style, entidades y contenido hostil cubiertos por InboxConversations.mjs; validación visual Beta pendiente.
- [x] BETA-CUT-MODAL-HEADER-LONG-MODEL-01: ajuste dinámico debajo del logo, ResizeObserver, divisor y acciones cubiertos por CutDetailModalLayout.mjs; falta prueba visual real en escritorio y ambas orientaciones móviles.
- [x] BETA-ADMIN-HEALTH-EVENTS-01: events se declara dentro de renderServiceDetail y ServiceBrowserTrafficContract.mjs verifica su uso; repetir escaneo en Beta.
- [x] BETA-ADMIN-GLOBAL-TRAFFIC-01 / SERVICE-TELEMETRY-02: contratos de siete servicios, normalización, fuentes directas, consulta batch y fallos parciales incluidos en regresión. Configuración y datos reales quedan para Beta.
- [x] BETA-ADMIN-LOGS-CLEAR-FEEDBACK-01 / LOG-RETENTION-UI-01: resultados de cero/eliminación/error y selector responsive cubiertos por ActivityLogsClearFeedback.mjs y AdminLogsMaintenanceContract.mjs.
- [x] BETA-ADMIN-IMAGE-AUDIT-CONCURRENCY-01: pruebas de contratos de locks locales y ausencia de leases ordinarias; concurrencia real entre proyectos sigue pendiente de Beta.
- [x] Revisión del organizador: rutas, nombres, referencias, inventario y conciliación figuran implementados y probados localmente en Fase 5. Esto no autoriza Safe Apply.
- [ ] Safe Apply: esperar preview real autorizado de Drive/Spreadsheet y revisión de manifiesto, ACL, duplicados, referencias y destinos. No aplicar movimientos/renombrados/borrados productivos sin autorización explícita.
- CI del HEAD bd47210d1bb8cf30bafe4261dc4d9370613d8ee2: regresión 44542583589 SUCCESS; health read-only 44542583925 SUCCESS; Pages 44542583372 SUCCESS.


### P1 — GP-PERF-ADMIN-SUPPLEMENTARY-UPLOAD-LOCK-01 — COMPLETADA CON VALIDACIÓN DIFERIDA A BETA
- Se eliminó la espera global de hasta 30 segundos mientras ADMIN procesa imágenes de información suplementaria.
- La preparación y carga de imágenes en Drive ocurren antes de adquirir el lock; la sección crítica usa tryLock(0), vuelve a leer el registro y compara el plan para detectar cambios concurrentes antes de escribir.
- Se conservan persistencia verificada, rollback de la fila, idempotencia de carga por operationKey y confirmación del ledger. Si el registro cambia durante la carga, no se sobrescriben datos; las cargas no vinculadas permanecen sujetas a reconciliación del ledger.
- Validación local contractual registrada en AdminSupplementaryUploadOutsideLock.mjs; ejecución de CI pendiente. No se desplegó ADMIN ni se accedió a Drive/Spreadsheet productivos.


### Cierre verificado — GP-PERF-ADMIN-SUPPLEMENTARY-UPLOAD-LOCK-01 — 2026-11-19
- CI run 44549910139 SUCCESS: 153 suites, 2,225 pruebas aprobadas, 0 fallos; incluye AdminSupplementaryUploadOutsideLock.
- Comprobación sintáctica de módulos JavaScript modificados: SUCCESS.
- Health read-only run 44549910083 SUCCESS. No se desplegó Apps Script ni se modificaron datos/propiedades productivas.
- La tarea queda COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. En Beta comprobar concurrencia real y comportamiento de archivos pendientes ante un conflicto.
- HEAD de implementación: cc7cd93e670d4d7dfd4b46ead8eb60bc830101e0.


## 2026-11-19 — Auditoría de dependencias y siguiente implementación

**Auditoría estática completada:** `AUDITORIA_DEPENDENCIAS_LATENCIA_2026-11-19.md`.

### P0 — GP-PERF-ADMIN-CUT-LOCK-01 — COMPLETADA CON VALIDACIÓN DIFERIDA A BETA
- [x] Confirmado que `handleAddOrUpdateCut` mantiene `ScriptLock` durante la llamada ADMIN→WRITE de asignación de ID y durante operaciones de carpetas/carga Drive; la recuperación por opId también puede realizar I/O de Drive bajo el lock.
- [x] Reserva atómica de operación/vehículo/slot para el flujo con `opId`: ledger `pending` reserva el slot antes de liberar el lock. La reserva idempotente del ID central para altas nuevas se implementó y validó localmente; ver el apartado «WRITE/ADMIN — reserva idempotente de vehicleId» al final de este registro.
- [x] Mover las operaciones de carpetas/carga/reparación Drive fuera del lock para operaciones con `opId`; la llamada ADMIN→WRITE de asignación de ID continúa pendiente.
- [x] Re-adquirir con `tryLock(0)` y revalidar reserva, fila, slot, opId y operationHash antes de aplicar las URLs; el `finally` solo libera el lock si sigue en posesión de la ejecución.
- [x] Mover el cálculo SHA-256 y la validación del `operationHash` antes de la llamada remota a WRITE y del `ScriptLock` ADMIN; las solicitudes idempotentes inválidas ya no consumen un ID ni tiempo de sección crítica. La búsqueda/revalidación del `opId` permanece dentro del lock.
- [x] Preservar ledger de imágenes, recuperación de respuesta perdida, idempotencia, verificación de escritura y compensación/revisión ante fallos; regresiones integrales aprobadas en CI 44592625381.
- [x] Añadir prueba determinista `AdminDriveLockIsolation.mjs` (9/9), conectarla al runner y validar recuperación/error de Drive y fallo de readquisición; quedan pendientes pruebas de extremo a extremo para asignación de ID y concurrencia real Beta.
- [x] Ejecutar regresión integral: 158 suites, 2,260 pruebas aprobadas, 0 fallos; health read-only SUCCESS. Revisión funcional del helper y su `finally` completada.
- Beta: concurrencia real y comportamiento de Drive/Spreadsheet pendientes de autorización; no desplegar ni tocar datos reales en esta fase.

**Conclusiones de arquitectura:** ADMIN ya usa actor cacheado en acciones ordinarias; no se encontró viaje a Coordinator por cada clic. USERS conserva coordinación por conflictos de ciclo de cuenta y UTILITIES por migración manual. La matriz de impacto de despliegue existente en `Services/SERVICE_ARCHITECTURE_PLAN.md` y `Services/COORDINATOR_SETUP.md` ya permite publicar cambios internos compatibles de Coordinator sin redeploy de consumidores.


## Principio arquitectónico obligatorio — aislamiento entre operaciones (2026-11-19)

Una operación de una función o subsistema no debe bloquear operaciones independientes de otra función o subsistema. La auditoría/telemetría no debe impedir consultas del Inbox, escáneres de salud, inicios de sesión, validaciones de sesión ni registro de cortes; tampoco al contrario.

Reglas de implementación:
1. No usar un `ScriptLock` global como mutex genérico para todo el servicio. Cada lock debe proteger exclusivamente el estado compartido que requiere atomicidad.
2. Preferir locks de recurso/registro/operación o reservas idempotentes breves. Operaciones sobre recursos distintos deben poder progresar en paralelo.
3. Lecturas, auditorías, escáneres de salud, llamadas HTTP, Drive y trabajo de cálculo no deben ejecutarse dentro de una sección crítica si no son parte indispensable de la mutación atómica.
4. Para escrituras sobre el mismo recurso, conservar exclusión/conflict detection, versionado y revalidación; el aislamiento no significa permitir corrupción por concurrencia.
5. Telemetría y auditoría deben ser best-effort, con timeout corto, límites de concurrencia y aislamiento de fallos; nunca ser una dependencia síncrona del camino de login, Inbox o registro.
6. Definir pruebas de no interferencia: mantener una operación lenta/esperando y comprobar que Inbox, health, login y registro de cortes independientes terminan dentro de su propio presupuesto; además probar conflicto cuando dos operaciones modifican el mismo recurso.
7. Documentar el ámbito real de cada lock: Apps Script `ScriptLock` es global dentro de un proyecto/script, no un lock por función. Antes de afirmar aislamiento entre servicios, verificar que cada servicio corre en proyecto independiente; si comparten proyecto, el lock puede cruzar funciones aunque estén en archivos distintos.

Criterio de aceptación: concurrencia entre operaciones independientes sin espera causada por locks compartidos, conservando consistencia para mutaciones del mismo recurso. No cerrar la tarea con pruebas unitarias solamente: incluir pruebas de no interferencia y, en Beta autorizada, concurrencia real.


### Ampliación de alcance — GP-PERF-ADMIN-CUT-LOCK-01
- [x] Aplicar como criterio transversal el aislamiento entre operaciones independientes, no solo reducir duración de `handleAddOrUpdateCut`. Regla registrada y contratos locales de no interferencia integrados; validación real de límites ScriptLock queda diferida a Beta.
- [x] Mapear los límites reales de proyecto/deployment: `ScriptLock` es global por proyecto Apps Script y puede bloquear otras funciones aunque estén en archivos separados.
- [x] Inventariar para cada lock el recurso/estado exacto que protege; separar auditoría/telemetría, Inbox, health, autenticación y registro de cortes cuando no comparten recurso.
- [x] Añadir pruebas locales de no interferencia: auditoría + Inbox (sendInboxMessage), consulta de telemetría, ping de salud (sin lease/ScriptLock), login y registro WRITE; conservar conflicto entre auditorías sobre IMAGE_AUDIT_STATE y conflictos de recursos compartidos ya cubiertos por Coordinator.
- [x] Verificar en CI que la auditoría no bloquea las operaciones independientes cubiertas por los contratos; CI 44626115506 SUCCESS: 176 suites, 2,400 pruebas aprobadas, 0 fallos. Health read-only 44626115768 SUCCESS.
- [ ] Mapear Script IDs/proyectos Apps Script desplegados. No hay .clasp.json ni appsscript.json versionados; los IDs de deployment presentes en URLs no demuestran por sí solos qué fuentes comparten proyecto. No inferir aislamiento real.
- [ ] No considerar aceptable una arquitectura que evita corrupción pero serializa funciones no relacionadas; completar prueba real de concurrencia en Beta autorizada.
- [x] Resolver solicitudes legacy sin opId: generar una clave interna OP-LEGACY única y huella del payload, reservar slot/vehículo en el ledger pending, ejecutar Drive fuera del ScriptLock y revalidar la reserva antes de escribir. La respuesta devuelve opId/operationHash; los errores de Drive incluyen credenciales de reintento.

## Avance de implementación — GP-PERF-ADMIN-CUT-LOCK-01 (2026-11-19)
- [x] Primer ajuste de reserva: `findNextAvailableCutSlot_` ahora excluye los slots del mismo vehículo que ya estén registrados como `pending` en Idempotencia. Esto permite reservar el destino antes de liberar el lock para Drive.
- [x] `AdminCutSlotReservation.mjs` y CI: 5/5 PASS en la regresión 44592625381.
- [x] Mover fuera del ScriptLock la lectura del catálogo de marcas/modelos/versiones, la normalización de esas entidades y el parseo del año para altas nuevas. El payload original se conserva sin mutación; la fila/ID y las escrituras siguen protegidas. `AdminCutEntityPreflight.mjs` 7/7 PASS; CI `44629325732` SUCCESS: 180 suites, 2,427 pruebas aprobadas, 0 fallos; sintaxis JS aprobada.
- [x] Para vehículos existentes, mover la búsqueda completa del ID (lectura de columna) antes de adquirir `ScriptLock`; dentro del lock se revalida la celda candidata antes de leer o modificar la fila. `AdminExistingVehicleLookupPreflight.mjs` 7/7 PASS; CI `44629836237` SUCCESS: 181 suites, 2,434 pruebas aprobadas, 0 fallos; health read-only `44629836299` SUCCESS.
- [x] Separar el flujo en reserva breve, WRITE/Drive fuera del lock y revalidación/persistencia breve. La ruta ADMIN y los flujos WRITE/FEEDBACK revisados conservan bajo lock únicamente lecturas/escrituras de Sheets necesarias para integridad; el bloque local queda COMPLETADO CON VALIDACIÓN DIFERIDA A BETA.
- [x] Añadir recuperación segura y pruebas de no interferencia entre auditoría, Inbox, health, login y registro de cortes. CI local aprobada; el mapa real de proyectos Apps Script desplegados sigue pendiente de Beta porque no hay `.clasp.json` ni `appsscript.json` versionados.

### Avance adicional — asignador central de IDs WRITE (2026-11-19)
- [x] Sustituir la espera de hasta 30 segundos en `handleAllocateVehicleId` por adquisición inmediata `tryLock(0)`. Si WRITE está ocupado, responde con `WRITE_BUSY` para permitir reintento, sin quedar esperando y reteniendo la ejecución.
- [x] Pruebas deterministas/CI del asignador: `WriteIdAllocatorNonBlocking` 5/5 y `AdminVehicleIdOutsideLock` 4/4 PASS en 44592625381.
- [x] Evaluar reducción segura del asignador: encabezado y valores de columna ID se combinan en una lectura. Se conserva el escaneo de IDs manuales, duplicados, fórmulas y filas incompletas hasta verificar en Beta el freeze/migración y contador central.
- [x] Publicación del catálogo aislada del ScriptLock local, con secuencia monotónica y protección contra eventos obsoletos; `WriteCatalogPublicationIsolation` 9/9 PASS en 44592625381.

- [x] Ajuste del contrato de pruebas AUG-039 para reflejar el nuevo comportamiento del asignador: adquisición inmediata `tryLock(0)`, validación de rol dentro de la sección crítica y liberación solo tras adquirirlo. El primer CI detectó esta expectativa antigua; se actualiza la prueba, no se revierte la corrección.

- Diagnóstico del segundo CI: el parser de la prueba AUG-039 no pudo extraer el handler después de introducir comentario de línea dentro del cuerpo. Se elimina ese comentario local; la lógica de adquisición inmediata permanece.

- Diagnóstico del tercer CI: el contrato AUG-039 utiliza un assert local mínimo y no dispone de `assert.equal`; se corrigen los dos fixtures para comprobar `tryLock(0)` con el assert compatible.

- El cuarto CI reveló una segunda suite de contrato (`WriteAuthorizationContracts.js`) con un mock antiguo que solo implementaba `waitLock`. Se actualiza el mock a `tryLock(0)` y se mantiene la comprobación de autorización dentro del lock.

### Aislamiento de publicación del catálogo WRITE (2026-11-19)
- [x] Se elimina el ScriptLock global de la llamada HTTP a Coordinator: el snapshot se lee y se publica sin mantener ese lock.
- [x] WRITE asigna una secuencia global monotónica dentro de la sección crítica de cada mutación de Cortes (registro de corte, información suplementaria y VIN).
- [x] Coordinator compara la secuencia bajo su propio lock; si una publicación llega atrasada, emite `reset` en vez de aplicar el snapshot obsoleto. Las publicaciones legacy sin versión también se convierten en reset.
- [x] Añadir pruebas Coordinator para publicaciones fuera de orden/legacy y prueba WRITE para secuencia monotónica/publicación sin ScriptLock. Pendiente CI.

- Corrección post-CI: las publicaciones legacy WRITE/Cortes se transforman en reset y deben devolver `resetRequired: true`, conservando el contrato del cliente incremental cuando la versión antigua no enviaba `sourceVersion`.

- Ajuste de fixture: CatalogChangeFeed prueba una publicación WRITE/Cortes versionada explícitamente (`sourceVersion: 1`) para conservar su intención de verificar cursor/lectura de un evento delete, no el fallback legacy.

- Ajuste adicional de fixtures CatalogChangeFeed: todos los eventos WRITE/Cortes usados para verificar upsert, tamaño máximo, retención y cursor público ahora declaran versiones secuenciales coherentes; los casos legacy se cubren por separado en SharedMutationCoordinator.

- Actualización de contrato CatalogChangeFeed: la prueba estática ahora valida la firma versionada de `publishCortesCatalogChange_` y exige que el publisher HTTP no contenga adquisición de ScriptLock.

- Corrección del test estático: el delimitador de extracción de `publishCortesCatalogChange_` debe buscar el salto de línea real antes del siguiente helper; se corrige el escape del fixture.

- Ajuste de contrato adicional: la expresión de CatalogChangeFeed para el despacho post-mutación ahora exige que se envíe `response.catalogVersion` al publisher.

### Carpetas Drive de información suplementaria — aislamiento de recurso (2026-11-19)
- [x] Retirar el ScriptLock global de WRITE alrededor de `findOrCreateVehicleFolder`.
- [x] Coordinar solo la operación de carpeta mediante lease Coordinator `ensureSupplementaryVehicleFolder` sobre el recurso `DRIVE_FOLDER`; no comparte recurso con mutaciones `CORTES`.
- [x] Añadir prueba de lease anidada que demuestra que la mutación de Cortes puede avanzar mientras se prepara una carpeta.
- [x] CI completado: 157 suites, 2,251 pruebas aprobadas, 0 fallos; health read-only SUCCESS. GitHub Pages sigue en ejecución.

### ADMIN — primera extracción de Drive fuera del ScriptLock (2026-11-19)
- [x] Añadir helper no bloqueante que libera el ScriptLock durante Drive y reintenta adquirirlo con `tryLock(0)`.
- [x] Aplicar el helper a reparación idempotente de imágenes, alta de corte en vehículo existente y alta de vehículo nuevo; revalidar opId, huella, vehículo, fila y slot antes de aplicar resultados.
- [x] Añadir `AdminDriveLockIsolation.mjs` y conectarlo al runner.
- [x] CI y revisión integral: Drive fuera del ScriptLock, revalidación y prueba `AdminDriveLockIsolation.mjs`; la asignación ADMIN→WRITE se ejecuta antes de adquirir el ScriptLock ADMIN. CI `44568472342` SUCCESS: 160 suites, 2,273 pruebas aprobadas, 0 fallos. Health read-only `44568472256` SUCCESS.

- Revisión del helper ADMIN: el `finally` exterior libera el ScriptLock solo si la ejecución lo conserva. Esto evita que un fallo de `tryLock(0)` al volver de Drive sea ocultado por un `releaseLock()` sin propiedad.

### ADMIN — asignación central de ID fuera del ScriptLock (2026-11-19)
- [x] Mover la petición ADMIN→WRITE de asignación de ID antes de adquirir el ScriptLock ADMIN; WRITE conserva su propia exclusión sobre el contador.
- [x] Cambiar la adquisición ADMIN de espera de 30 s a `tryLock(0)` con error `ADMIN_BUSY` para no mantener solicitudes independientes en cola dentro del servicio.
- [x] Añadir `AdminVehicleIdOutsideLock.mjs` al runner.
- [x] CI y compatibilidad de reintentos revisadas: regresión completa hasta 201 suites/2,571 pruebas/0 fallos; los IDs reservados no se reutilizan tras fallos/reintentos, por diseño.

- CI de `AdminVehicleIdOutsideLock.mjs`: SUCCESS 4/4. Regresión integral del commit `b80b443`: 159 suites, 2,264 pruebas aprobadas, 0 fallos; health read-only SUCCESS. GitHub Pages continúa ejecutándose al momento del registro.

### Aislamiento de auditoría ADMIN frente a registro de cortes (2026-11-19)
- [x] Retirar `ScriptLock` global de `handleAuditDriveImagesInCortes`; la ejecución usa una lease exclusiva `IMAGE_AUDIT_STATE`.
- [x] Reducir la política Coordinator de `auditDriveImagesInCortes` a `IMAGE_AUDIT_STATE`: no toma leases CORTES ni DRIVE y puede coexistir con `WRITE/addOrUpdateCut`.
- [x] Retirar ScriptLock de inicio/cierre del registro ADMIN; cada evento usa una propiedad única.
- [x] Convertir inicio y cierre de auditoría en best-effort: sus fallos se informan como advertencia y no impiden ni degradan el resultado de la operación principal.
- [x] Añadir contratos de aislamiento Coordinator y pruebas de auditoría best-effort. CI pendiente.

- CI inicial de aislamiento de auditoría falló por un `finally` residual del lock retirado y un contrato antiguo que prohibía cualquier lease ADMIN. Se corrigen ambos: el test permite exclusivamente `auditDriveImagesInCortes` y exige que las demás acciones ADMIN sigan sin leases.

- Segundo CI del aislamiento de auditoría: `AdminAuditTrail` pasó 15/15; fallaron dos contratos estáticos que aún prohibían toda lease ADMIN y un delimitador con escape doble. Se ajustan para permitir solo la lease `IMAGE_AUDIT_STATE`.

- Tercer CI: `AdminAuditTrail` 15/15 y `DirectTrafficRoutingCoverage` 6/6 pasaron. Fallaron dos referencias de prueba al nombre anterior del escáner (`...Locked_`) y un delimitador escapado incorrectamente; se actualizan a `...Core_`.

- Cuarto CI: `AdminAuditTrail` 15/15, `SessionActivityCoordination` 11/11, `DirectTrafficRoutingCoverage` 6/6 y `AdminReplacedImagesIntegrity` 56/56 pasaron. Falló `AdminSheetActionsContract` porque prohibía cualquier lease ADMIN; se actualiza para permitir exclusivamente la lease de auditoría.

- Quinto CI: detectó que Coordinator añade `SESSION_CONTEXTS` automáticamente a casi todas las leases ADMIN, incluso la auditoría. Se excluye `auditDriveImagesInCortes` de ese recurso para que el escáner tampoco bloquee login AUTH. La prueba de coexistencia ahora cubre auditoría + login + registro WRITE.

- Sexto CI: la nueva prueba intentaba mantener simultáneamente `WRITE/addOrUpdateCut` y `AUTH/login`, que sí comparten `SESSION_CONTEXTS` por diseño. Se separa en dos escenarios: auditoría + WRITE y auditoría + login; ambos deben coexistir. La exclusión entre WRITE y login permanece intacta.

### Validación de aislamiento de auditoría ADMIN — CI aprobado (2026-11-19)
- [x] Escáner sin ScriptLock global; lease limitada a IMAGE_AUDIT_STATE.
- [x] Coordinator no agrega SESSION_CONTEXTS, CORTES ni DRIVE a esta lease.
- [x] Inicio/cierre del registro de auditoría sin ScriptLock y best-effort.
- [x] Pruebas: AdminAuditTrail 15/15; AdminImageScanCoordinatorContract 1/1; SessionActivityCoordination 11/11; DirectTrafficRoutingCoverage 6/6; Coordinator 81/81.
- [x] Regresión: 159 suites, 2,265 pruebas aprobadas, 0 fallos. Health read-only y Pages SUCCESS.
- Pendiente dentro del mismo principio: aislar el proceso de inventario/organización de imágenes, que aún mantiene ScriptLock en ADMIN.

### Inventario/organización de imágenes ADMIN — aislamiento (2026-11-19)
- [x] Retirar ScriptLock global de `handleSaveUnusedImagesInventory` y `handleOrganizeUnusedImagesBatch`.
- [x] Ejecutar ambos modos bajo lease exclusiva `IMAGE_INVENTORY`, sin lecturas/leases de CORTES, DRIVE ni SESSION_CONTEXTS.
- [x] Separar el append de `ActividadUsuario` en lease puntual `ACTIVITY`; eliminar ScriptLock del asignador de ID usado solo por ese append.
- [x] Añadir `AdminInventoryLockIsolation.mjs` y prueba de coexistencia Coordinator con WRITE y AUTH. CI pendiente.

### Corrección de contratos tras aislamiento del inventario ADMIN (2026-11-19)
- [x] Ajustar `SessionActivityCoordination` y `DirectTrafficRoutingCoverage`: sus contratos prohibían cualquier lease ADMIN salvo auditoría y quedaron obsoletos al aislar correctamente inventario (`IMAGE_INVENTORY`) y actividad (`ACTIVITY`).
- [x] CI integral aprobado; se verifican exactamente tres leases ADMIN: `auditDriveImagesInCortes`, `saveUnusedImagesInventory` y `recordAdminImageActivity`, con recursos separados `IMAGE_AUDIT_STATE`, `IMAGE_INVENTORY` y `ACTIVITY`.

### Ajuste de regresión del inventario ADMIN (2026-11-19)
- [x] Actualizar `AdminReplacedImagesIntegrity`: el contrato exigía `ScriptLock` dentro del handler, contradiciendo el nuevo aislamiento por lease `IMAGE_INVENTORY`.
- [x] Regresión `44568472342` SUCCESS: 160 suites, 2,273 pruebas aprobadas, 0 fallos. Contratos `SessionActivityCoordination` 11/11, `DirectTrafficRoutingCoverage` 6/6, `AdminReplacedImagesIntegrity` 56/56 y `AdminSheetActionsContract` 9/9.

### ADMIN — edición de metadatos sin bloquear durante sincronización Drive (2026-11-19)
- [x] Acortar la sección crítica de `handleUpdateVehicleField`: validar/escribir/verificar el campo en Cortes y capturar la instantánea confirmada.
- [x] Ejecutar movimiento/renombrado de imagen principal después de liberar ScriptLock; fallos de Drive se devuelven como advertencia sin revertir el metadato guardado.
- [x] Cambiar la adquisición a `tryLock(0)` para evitar esperas de 30 s; añadir `AdminVehicleFolderSyncOutsideLock.mjs` al runner.
- [x] CI `44570179580` SUCCESS: 161 suites, 2,280 pruebas aprobadas, 0 fallos; `AdminVehicleFolderSyncOutsideLock` 7/7, `WRITE/ADMIN VIN` 12/12 y `ADMIN edición modal/RBAC` 9/9. Health read-only `44570179476` SUCCESS.

- CI inicial del cambio de sincronización Drive: 2 contratos antiguos no encontraron el cierre del handler por un salto de línea extra entre la función y `ADMIN_IMAGE_UPLOAD_SHEET_NAME`. Se conserva el delimitador esperado por los tests de extracción; sin cambio funcional.

### ADMIN — reemplazo de imagen fuera del ScriptLock (2026-11-19)
- [x] Cambiar adquisición a `tryLock(0)` para evitar espera de 30 s.
- [x] Mover búsqueda/creación/verificación del archivo y metadata pendiente a Drive fuera del lock con `runAdminDriveWorkOutsideScriptLock_`.
- [x] Revalidar vehículo/fila, URL activa, nombre canónico y ledger `opId` al readquirir antes de persistir la URL.
- [x] Mover confirmación final de nombre/estado Drive fuera del lock; revalidar que la URL activa siga siendo la nueva antes de completar el ledger.
- [x] Si no se puede readquirir el lock, conservar ledger/archivo en estado pendiente y solicitar reintento con el mismo `opId`; `finally` libera solo si conserva el lock.
- [x] CI `44571281616` SUCCESS: 162 suites, 2,289 pruebas aprobadas, 0 fallos; `AdminImageUploadDriveIsolation` 9/9 y `AdminVehicleFolderSyncOutsideLock` 7/7. Health read-only `44571281679` SUCCESS.
- [x] Aislar recuperación `status === linked` y compensación Drive del `catch`; ambas rutas ejecutan I/O Drive fuera del ScriptLock y revalidan el ledger al readquirir.

### ADMIN — recuperación de reemplazos ya vinculados fuera del ScriptLock (2026-11-19)
- [x] Mover lookup, comprobación de papelera e integridad de archivos de operaciones `linked` fuera del ScriptLock.
- [x] Revalidar fila/vehículo y ledger `opId` (estado, URL, campo y huella) antes de recuperar historial.
- [x] Mover actualización final de metadata Drive fuera del lock y revalidar ledger antes de confirmarla.
- [x] Añadir `AdminImageUploadLinkedRecoveryIsolation.mjs` al runner.
- [x] CI `44572041539` SUCCESS: 163 suites, 2,294 pruebas aprobadas, 0 fallos; `AdminImageUploadLinkedRecoveryIsolation` 5/5 y compensación in-modal 9/9. Health read-only `44572041605` SUCCESS.
- [x] Aislar la compensación Drive del catch: reserva opId como `requires_review`, metadata Drive fuera del ScriptLock y revalidación del ledger; orden historial→ledger preservado.
- [x] Aislar también el fallback de metadata Drive cuando falla la escritura final del ledger.
- [x] Añadir regresión AdminImageUploadCompensationIsolation.mjs al runner.
- [x] CI 44592625381 SUCCESS: 164 suites, 2,304 pruebas aprobadas, 0 fallos; regresión `AdminImageUploadCompensationIsolation` 10/10 y sintaxis JavaScript aprobada. Health read-only 44592625568 SUCCESS; GitHub Pages 44592624258 SUCCESS. Diff revisado y commits verificados.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Pendiente deployment autorizado y prueba real Drive/Spreadsheet; no se modificaron datos productivos.

### ADMIN — vinculación post-commit de imágenes fuera del ScriptLock (2026-11-19)
- [x] Recuperación idempotente, alta en vehículo existente y alta de vehículo nuevo persisten primero el estado completed.
- [x] Mover markImageUploadLinked (Drive + ImageUploadLedger) fuera del ScriptLock mediante runAdminDriveWorkOutsideScriptLock_.
- [x] Revalidar opId, vehículo, slot, estado y huella al readquirir; solicitudes legacy usan clave estable derivada de fileId.
- [x] Añadir AdminCutImageLinkOutsideLock.mjs al runner.
- [x] CI 44593963972 (intento 2, checkout HEAD 8a3d70d) SUCCESS: 165 suites, 2,316 pruebas aprobadas, 0 fallos; `AdminCutImageLinkOutsideLock` 12/12 y sintaxis JS aprobada. Health read-only 44593963988 SUCCESS; GitHub Pages 44594081770 SUCCESS. Diff revisado.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó ADMIN ni se modificaron datos externos.

### ADMIN — lectura acotada del catálogo de entidades (2026-11-19)
- [x] Reducir getExistingEntities a las columnas marca/modelo/versiones; evita cargar todas las columnas de Cortes durante el alta.
- [x] Conservar deduplicación y compatibilidad con columnas no contiguas.
- [x] Añadir AdminEntityLookupBoundedRead.mjs al runner.
- [x] CI 44594845526 SUCCESS: 166 suites, 2,323 pruebas aprobadas, 0 fallos; `AdminEntityLookupBoundedRead` 7/7 y sintaxis JavaScript aprobada. Health read-only 44594846847 SUCCESS; GitHub Pages 44594844590 SUCCESS. Diff revisado.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó ADMIN ni se modificaron datos externos.

### ADMIN — lectura acotada para detección de duplicados VIN (2026-11-19)
- [x] Sustituir lectura de toda la fila por rangos de ID/marca/modelo, años y VIN.
- [x] Conservar exclusión del vehículo actual, normalización de VIN y formato del nombre del duplicado.
- [x] Añadir AdminVinDuplicateBoundedRead.mjs al runner.
- [x] CI 44595220751 SUCCESS: 167 suites, 2,331 pruebas aprobadas, 0 fallos; `AdminVinDuplicateBoundedRead` 8/8 y `AdminEntityLookupBoundedRead` 7/7. Sintaxis JavaScript aprobada. Health read-only 44595220797 SUCCESS; GitHub Pages 44595218915 SUCCESS. Diff revisado.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó ADMIN ni se modificaron datos externos.

### ADMIN — reutilización del índice de columna VIN (2026-11-19)
- [x] Reutilizar el índice VIN ya resuelto por el handler y los editores; evitar lecturas repetidas de encabezados.
- [x] Mantener fallback compatible cuando no se proporciona un índice.
- [x] Ampliar AdminVinDuplicateBoundedRead.mjs para cubrir override y fallback.
- [x] CI 44596161669 SUCCESS: 167 suites, 2,334 pruebas aprobadas, 0 fallos; `AdminVinDuplicateBoundedRead` 11/11 y sintaxis JavaScript aprobada. Health read-only 44596161551 SUCCESS; GitHub Pages 44596160331 SUCCESS. Diff revisado.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Se conserva fallback para llamadas legacy sin índice.

### ADMIN — localización de vehículo por columna ID (2026-11-19)
- [x] Sustituir getDataRange completo por lectura de la columna ID; leer la fila completa solo después de confirmar una coincidencia única.
- [x] Mantener detección de IDs duplicados y validación de todos los IDs no vacíos.
- [x] Añadir AdminUniqueVehicleRowBoundedRead.mjs al runner.
- [x] Eliminar las dos declaraciones globales duplicadas que sobrescribían la implementación optimizada; queda una sola función efectiva.
- [x] Fortalecer AdminUniqueVehicleRowBoundedRead para exigir una única declaración y verificar lectura acotada, coincidencia única, duplicados, IDs inválidos y ausencia de coincidencias.
- [x] CI 44614041417 SUCCESS: 168 suites, 2,347 pruebas aprobadas, 0 fallos; AdminUniqueVehicleRowBoundedRead 13/13 y sintaxis JavaScript aprobada.
- [x] Health read-only 44614041045 SUCCESS. GitHub Pages 44613910857 SUCCESS sobre el commit funcional anterior (b9bc06d).
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó ADMIN ni se modificaron datos externos.

### WRITE — preflight de registro de cortes fuera del ScriptLock (2026-11-19)
- [x] Confirmar que la ruta canónica addOrUpdateCut pertenece a WRITE; el handler homónimo de ADMIN rechaza la acción heredada y no es el flujo ejecutado.
- [x] Mover autenticación contextual, lectura de listas oficiales y validación del payload antes de adquirir el ScriptLock global de WRITE.
- [x] Reducir la lectura de listas de Cortes a columnas 2–26 y la de Relay a su columna de configuración.
- [x] Añadir prueba determinista para orden preflight→lock, validación y rangos leídos.
- [x] CI 44615757832 SUCCESS: 169 suites, 2,348 pruebas aprobadas, 0 fallos; `WriteCutPreflightOutsideLock` 1/1, `CutPayloadValidation` 35/35 y autorización/minimización WRITE 13/13.
- [x] Health read-only 44615757812 SUCCESS; GitHub Pages 44615756805 SUCCESS.
- [x] Diff revisado: la preparación queda fuera del ScriptLock; las lecturas de validación se acotan a columnas necesarias.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó WRITE ni se modificaron Sheets/Drive productivos.

### WRITE — escrituras por lote dentro del registro de cortes (2026-11-19)
- [x] Agrupar los cinco campos consecutivos del corte existente en una sola llamada setValues; mantener separados testigo y colaborador.
- [x] Agrupar las columnas 2–16 del vehículo nuevo en una sola llamada setValues, preservando columnas de video/contador vacías tras la limpieza.
- [x] Mantener la reserva de VIN y opId antes de liberar el ScriptLock para las cargas Drive.
- [x] Añadir WriteCutSlotBatchWrites para comprobar columnas contiguas, contenido del lote y orden de reservas.
- [x] CI 44616477533 SUCCESS: 170 suites, 2,349 pruebas aprobadas, 0 fallos; WriteCutSlotBatchWrites 1/1 y sintaxis JavaScript aprobada.
- [x] Health read-only 44616477539 SUCCESS; GitHub Pages 44616474879 SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó WRITE ni se modificaron Sheets/Drive productivos.

### WRITE — búsqueda heredada de opId sin lectura completa de Cortes (2026-11-19)
- [x] Sustituir getDataRange().getValues() por TextFinder en el rango de datos; leer encabezados por separado.
- [x] Conservar coincidencias directas en columnas idOperacion/id_operacion y VIN legacy con formato OP.
- [x] Conservar búsqueda de etiquetas [opId], detección de duplicados/ambigüedad y validación de vehicleId/fila.
- [x] Mantener la ruta Idempotencia prioritaria sin ejecutar TextFinder cuando existe entrada.
- [x] Añadir WriteOpIdLegacyLookup: 9/9 PASS.
- [x] CI 44617280202 SUCCESS: 171 suites, 2,358 pruebas aprobadas, 0 fallos; sintaxis JavaScript aprobada.
- [x] Health read-only 44617280343 SUCCESS; GitHub Pages 44617279984 SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó WRITE ni se modificaron Sheets/Drive productivos.

### WRITE — localizador único de vehículo por columna ID (2026-11-19)
- [x] Eliminar las tres declaraciones duplicadas de findUniqueCortesVehicleRow_ que se sobrescribían entre sí.
- [x] Mantener una sola implementación que lee primero la columna ID y solo después la fila completa coincidente.
- [x] Conservar validación de IDs no vacíos, detección de IDs inválidos/duplicados y error si no existe una coincidencia única.
- [x] Añadir WriteUniqueVehicleRowBoundedRead: 6/6 PASS y comprobación de una sola declaración.
- [x] CI 44617773715 SUCCESS: 172 suites, 2,364 pruebas aprobadas, 0 fallos.
- [x] Health read-only 44617773600 SUCCESS; GitHub Pages 44617772427 SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó WRITE ni se modificaron Sheets/Drive productivos.

### WRITE — acceso rápido a hoja Idempotencia compatible (2026-11-19)
- [x] Evitar initializeIdempotenciaSheet cuando la hoja primaria ya tiene A:F completos y compatibles.
- [x] Aplicar el mismo fast path a la hoja fallback compatible.
- [x] Mantener inicialización/reparación para hojas nuevas o encabezados faltantes.
- [x] Verificar que los tres callsites actuales de getIdempotenciaSheet ejecutan readIdempotenciaEntries_ y conservan validación integral del ledger.
- [x] Añadir IdempotenciaSheetLookupFastPath: 6/6 PASS.
- [x] CI 44618414190 SUCCESS: 173 suites, 2,370 pruebas aprobadas, 0 fallos.
- [x] Health read-only 44618414220 SUCCESS; GitHub Pages 44618411994 SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó WRITE ni se modificaron Sheets/Drive productivos.

### WRITE — reutilización del snapshot Idempotencia por operación (2026-11-19)
- [x] Leer y validar el ledger completo una sola vez al entrar en la sección crítica de addOrUpdateCut.
- [x] Compartir el snapshot con findRowByOpId y recordOpId; evitar nuevas lecturas integrales en esas fases.
- [x] Verificar el opId afectado mediante TextFinder en la columna A y lectura de su fila; detectar duplicados incluso con espacios.
- [x] Actualizar el snapshot tras append/update y mantener pending/completed monotónico.
- [x] Mantener rollback sobre la hoja efectiva primaria/fallback y snapshot previo de la fila.
- [x] Añadir WriteIdempotencySnapshotReuse: 9/9 PASS.
- [x] CI 44619301598 SUCCESS: 174 suites, 2,379 pruebas aprobadas, 0 fallos.
- [x] Health read-only 44619301575 SUCCESS; GitHub Pages 44619301580 SUCCESS.
- Nota: el primer intento CI detectó una aserción de prueba desactualizada tras ampliar la firma de recordOpId; se corrigió el contrato de prueba y la ejecución final pasó.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó WRITE ni se modificaron Sheets/Drive productivos.

### WRITE — asignador de vehicleId con lecturas acotadas (2026-11-19)
- [x] Sustituir lectura de todas las columnas por lectura de la columna ID y fórmulas.
- [x] Inspeccionar otras columnas únicamente en filas con ID vacío o fórmula.
- [x] Agrupar filas candidatas contiguas en bloques para reducir llamadas.
- [x] Preservar filas con fórmula sin datos, filas incompletas, IDs inválidos/duplicados y contador monotónico.
- [x] Añadir WriteVehicleIdAllocatorBoundedRead: 11/11 PASS.
- [x] CI 44620038256 SUCCESS: 175 suites, 2,390 pruebas aprobadas, 0 fallos.
- [x] Health read-only 44620038295 SUCCESS; GitHub Pages 44620037793 SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó WRITE ni se modificaron Sheets/Drive productivos.

### WRITE — lectura acotada de entidades existentes (2026-11-19)
- [x] Leer únicamente las columnas contiguas marca/modelo/versiones aplicables en lugar de todas las columnas de Cortes.
- [x] Mantener la normalización exacta por String(... || "").trim(), el orden de primera aparición y la deduplicación sensible a mayúsculas.
- [x] Sustituir búsquedas repetidas indexOf por Set, conservando los arreglos ordenados que consume resolveAndNormalizeEntity.
- [x] Añadir WriteEntityLookupBoundedRead.mjs al runner con cobertura de rango, orden, duplicados, offsets y hoja vacía.
- [x] CI 44625164726 SUCCESS: 176 suites, 2,398 pruebas aprobadas, 0 fallos; `WriteEntityLookupBoundedRead` 8/8 y sintaxis JavaScript aprobada.
- [x] Health read-only 44625164725 SUCCESS; diff revisado: únicamente lectura acotada, deduplicación y pruebas/registros de esta tarea.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó WRITE ni se modificaron Sheets/Drive productivos.


### WRITE — reutilización de fila localizada en registro de cortes (2026-11-19)
- [x] Reutilizar la fila y el índice únicos ya obtenidos por `handleAddOrUpdateCutLocked`; eliminar la segunda lectura de la columna ID y la segunda lectura de la fila completa en la ruta de vehículo existente.
- [x] Añadir fallback de lectura dirigida de una sola fila si el ancho del esquema cambia antes de consumir la instantánea; comprobar que el ID siga correspondiendo al vehículo solicitado.
- [x] Añadir `WriteCutExistingVehicleSnapshotReuse.mjs` (4/4 PASS) y actualizar el contrato `WriteIdempotencySnapshotReuse.mjs`.
- [x] CI `44626945883` SUCCESS: 177 suites, 2,404 pruebas aprobadas, 0 fallos; sintaxis JavaScript aprobada.
- [x] Health read-only `44626945680` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó WRITE ni se modificaron Sheets/Drive productivos.
- Commits de implementación/pruebas: `a227e098`, `b7f83510`, `28aaecd6`, `0f739479`, `5a612e06`, `a7717124`.


### GP-PERF-ADMIN-CUT-LOCK-01 — preflight idempotente (2026-11-19)
- [x] Validar el `operationHash` y calcular la huella SHA-256 antes de solicitar un `vehicleId` a WRITE y antes de adquirir el `ScriptLock` ADMIN.
- [x] Conservar la extracción compatible del `opId` legacy y la búsqueda/revalidación dentro de la sección crítica.
- [x] Añadir `AdminCutPreflightBeforeAllocation.mjs` al runner: 7/7 PASS; cubre hash, asignación fuera del lock, extracción VIN y timestamp precomputados, y revalidación idempotente.
- [x] CI `44627981794` SUCCESS: 178 suites, 2,411 pruebas aprobadas, 0 fallos; sintaxis JS aprobada. Health read-only `44627981620` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA como subactividad; GP-PERF-ADMIN-CUT-LOCK-01 continúa EN PROGRESO.


### ADMIN — reserva idempotente para solicitudes legacy sin opId (2026-11-19)
- [x] Generar `OP-LEGACY-<UUID>` interno para solicitudes antiguas que no envían `opId`; calcular huella de payload y registrar reserva `pending` antes de Drive.
- [x] Aplicar la misma ruta de `runAdminDriveWorkOutsideScriptLock_`: liberar ScriptLock durante Drive, readquirir con `tryLock(0)` y revalidar `opId`, vehicleId, slot y operationHash antes de persistir.
- [x] Devolver `opId` y `operationHash` en respuesta exitosa; adjuntar ambos al error de reacquisición y entregar indicación de reintento si Drive falla, evitando reservas sin referencia recuperable.
- [x] Añadir `AdminLegacyCutReservation.mjs`: 9/9 PASS. CI `44628738510` SUCCESS: 179 suites, 2,420 pruebas aprobadas, 0 fallos; sintaxis JS aprobada. Health read-only `44628738518` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. La separación completa del handler ADMIN sigue pendiente: operaciones de Sheets permanecen dentro de la sección crítica; no se afirma aislamiento global entre todos los servicios.

### ADMIN — acceso rápido al ledger Idempotencia compatible (2026-11-19)
- [x] Evitar initializeIdempotenciaSheet cuando la hoja primaria o fallback tiene los encabezados A:F completos y compatibles.
- [x] Mantener inicialización y reparación cuando falten encabezados; conservar el rechazo de estados inseguros.
- [x] Mantener readIdempotenciaEntries_ en los callsites para validar integralmente el ledger antes de recuperar o registrar operaciones.
- [x] Añadir AdminIdempotenciaSheetLookupFastPath.mjs al runner: 6/6 PASS.
- [x] CI 44631635536 SUCCESS: 182 suites, 2,440 pruebas aprobadas, 0 fallos; sintaxis JavaScript aprobada.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó ADMIN ni se modificaron Sheets/Drive productivos. GP-PERF-ADMIN-CUT-LOCK-01 continúa EN PROGRESO.


### ADMIN — reutilización del snapshot idempotente por operación (2026-11-19)
- [x] Crear una sola lectura integral validada del ledger Idempotencia al inicio de la sección crítica de `handleAddOrUpdateCut`.
- [x] Compartir el snapshot con `findRowByOpId`, `recordOpId` y las revalidaciones posteriores a Drive; verificar el `opId` dirigido contra la hoja antes de confiar en la entrada cacheada.
- [x] Rechazar cambios en presencia/ausencia, fila, vehicleId, slot, operationHash o retroceso de estado completed; actualizar el snapshot tras cada escritura verificada.
- [x] Mantener detección integral de opIds duplicados al construir el snapshot y transición monotónica pending → completed.
- [x] Prueba `AdminIdempotencySnapshotReuse.mjs`: 10/10 PASS; contrato legacy actualizado. Regresión CI `44632610105` SUCCESS: 183 suites, 2,450 pruebas aprobadas, 0 fallos; sintaxis JS aprobada.
- [x] Health read-only `44632610206` SUCCESS. No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.
- Commits de implementación y refinamiento: `748d9f5c868571607d90a3fe805283112f74e276`, `4c3d24824ad38c96f38488b54cd390dba4089536`, `f96d988a4c3b42a1064c6ea4ecadfc4caa47e1d6`; pruebas/contratos: `70d676d5e0d5720e32eae004c825934bc466bc89` y commits posteriores hasta `e2af8eeeacce492749b9c9e0ace43d2ec3d3205f`.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. `GP-PERF-ADMIN-CUT-LOCK-01` continúa EN PROGRESO.


### ADMIN — reutilización de encabezados VIN y testigo (2026-11-19)
- [x] Eliminar la lectura duplicada de encabezados: `ensureTestigoColumns` valida VIN y columnas testigo desde una sola lectura de encabezados.
- [x] Reutilizar el mismo snapshot para AT:AV, evitando una segunda consulta del rango de encabezados.
- [x] Devolver `vinColumnIndex` al handler para eliminar la segunda llamada a `getVinColumnIndex` dentro del lock.
- [x] Conservar rechazo de VIN/testigo duplicados, validación de datos sin encabezado y reparación de columnas AT:AV bajo el lock.
- [x] Prueba `AdminTestigoHeaderReadReuse.mjs`: 7/7 PASS. CI `44633000972` SUCCESS: 184 suites, 2,457 pruebas aprobadas, 0 fallos; sintaxis JS aprobada.
- [x] Health read-only `44633000978` SUCCESS. No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. `GP-PERF-ADMIN-CUT-LOCK-01` continúa EN PROGRESO.


### ADMIN — reutilización del snapshot de encabezados en recuperación (2026-11-19)
- [x] Devolver el snapshot de encabezados ya validado por `ensureTestigoColumns`, incluyendo las columnas AT:AV reparadas en memoria.
- [x] Usar ese snapshot para identificar la columna de operación durante la recuperación idempotente, evitando otra lectura completa de encabezados.
- [x] Mantener la revalidación del ledger y la lectura de fila después de las operaciones Drive; el snapshot de encabezados solo se reutiliza mientras el lock sigue en posesión de la ejecución.
- [x] Prueba `AdminTestigoHeaderReadReuse.mjs`: 7/7 PASS. CI `44633178723` SUCCESS: 184 suites, 2,457 pruebas aprobadas, 0 fallos; sintaxis JS aprobada.
- [x] Health read-only `44633178689` SUCCESS. No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. `GP-PERF-ADMIN-CUT-LOCK-01` continúa EN PROGRESO.


### ADMIN — escrituras por lote en cortes de vehículos existentes (2026-11-19)
- [x] Agrupar los cinco campos contiguos del slot (tipo, ubicación, color, relay e imagen) en una llamada `setValues()` para los tres slots posibles.
- [x] Mantener testigo y colaborador en sus columnas independientes; preservar VIN, timestamp, flush y reservas/transiciones idempotentes.
- [x] Añadir `AdminCutSlotBatchWrites.mjs` al runner; comprobar continuidad de columnas y ausencia de escrituras individuales para los cinco campos.
- [x] CI `44633759321` SUCCESS: sintaxis JavaScript y suite completa aprobadas.
- [x] Health read-only `44633759352` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó ADMIN ni se modificaron Sheets/Drive productivos.
- Commits: implementación/prueba/runner `31fe4a4577d9212ec39ee25a665995e836a7a0fb`; ajuste de aserción `e11056bca8759256871d7e7748a083b5d2b3af2e`.

Siguiente paso: continuar GP-PERF-ADMIN-CUT-LOCK-01 inspeccionando las escrituras y lecturas restantes bajo el ScriptLock en `handleAddOrUpdateCut`; priorizar reducción de llamadas remotas sin trasladar fuera del lock las reservas, validaciones de conflicto ni escrituras que deban ser atómicas.


### ADMIN — escrituras por lote al recuperar registros parcialmente completados (2026-11-19)
- [x] Agrupar categoría, marca, modelo, versiones, años y tipo de encendido en una escritura contigua (columnas 2–8), solo cuando existan campos vacíos.
- [x] Agrupar tipo, ubicación, color y configuración de relay del slot recuperado en una escritura contigua; conservar testigo y colaborador en columnas independientes.
- [x] Preservar valores existentes, normalización de rango de años, VIN, timestamp, flush y finalización idempotente.
- [x] Añadir `AdminRecoveryRepairBatchWrites.mjs` al runner con simulación de los lotes, preservación de datos y omisión de escrituras cuando no hay cambios.
- [x] CI `44634550285` SUCCESS: sintaxis de módulos modificados y suite completa de regresión aprobadas.
- [x] Health read-only `44634550314` SUCCESS sobre el mismo HEAD.
- [x] Diff revisado: seis archivos, solo el handler ADMIN, prueba/runner y registros de esta tarea.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.
- Commit: `65a4aa5f873e7f88c7230c837206c56743bb40b8`.


### ADMIN — fast path de recuperación sin reparación de imágenes (2026-11-19)
- [x] Detectar bajo el lock si falta la imagen del vehículo o la imagen del slot recuperado antes de iniciar trabajo Drive.
- [x] Omitir la liberación/reacquisición del ScriptLock y la reconsulta de revalidación cuando ambas imágenes ya están completas.
- [x] Mantener la ruta Drive existente, con revalidación de opId/vehículo/slot/huella, cuando al menos una imagen requiere reparación.
- [x] Añadir `AdminRecoveryImageRepairFastPath.mjs` al runner para cubrir imágenes completas, faltantes individualmente, ambas faltantes y corte no recomendado.
- CI inicial: sintaxis y health read-only SUCCESS; la suite detectó una aserción demasiado amplia en la prueba nueva (contaba otra ruta Drive del handler). Se acotó la prueba a la recuperación idempotente y se corrigió la indentación del bloque.
- [x] CI final 44635382990 SUCCESS: 187 suites, 2476 pruebas aprobadas, 0 fallos; AdminRecoveryImageRepairFastPath 6/6 PASS y sintaxis aprobada.
- [x] Health read-only 44635382893 SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.


### ADMIN — reutilización del snapshot para vincular imágenes recuperadas (2026-11-19)
- [x] Actualizar en memoria `verified.rowValues` cuando la revalidación escribe una URL de imagen faltante.
- [x] Reutilizar `rowValues` para obtener las URL de vehículo y corte al invocar `markAdminCutImagesLinkedOutsideLock_`, eliminando dos llamadas individuales `getValue()`.
- [x] Mantener valores ya válidos, sincronización del ledger y flujo Drive fuera del ScriptLock.
- [x] Añadir `AdminRecoveryImageSnapshotReuse.mjs` al runner con comprobación de ausencia de lecturas y simulación de preservación/escritura.
- [x] CI final `44636292022` SUCCESS: 188 suites, 2,483 pruebas aprobadas, 0 fallos; `AdminRecoveryImageSnapshotReuse` 7/7 PASS, sintaxis aprobada.
- [x] Health read-only `44636291825` SUCCESS.
- Las dos primeras ejecuciones de regresión fallaron por delimitaciones/mocks de la prueba nueva; se corrigieron y la repetición final aprobó.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.


### ADMIN — revalidación de vehículo existente desde el snapshot de fila (2026-11-19)
- [x] Eliminar la lectura individual `getValue()` del ID dentro del ScriptLock.
- [x] Reutilizar la lectura completa de fila para validar `COLS_CORTES.id` antes de mapear o escribir.
- [x] Mantener la búsqueda de fila candidata fuera del lock y confirmar bajo lock que la fila aún contiene el ID esperado.
- [x] Actualizar `AdminExistingVehicleLookupPreflight.mjs` y añadir `AdminExistingVehicleSnapshotRevalidation.mjs` al runner.
- CI inicial `44636808060`: la prueba detectó que su conteo incluía una segunda lectura legítima posterior a Drive (necesaria para preparar VIN). La aserción se limitó al tramo previo a Drive; la lógica funcional conserva la relectura posterior.
- [x] CI final `44636938042` SUCCESS: 189 suites, 2,491 pruebas aprobadas, 0 fallos; `AdminExistingVehicleSnapshotRevalidation` 7/7 PASS y sintaxis aprobada.
- [x] Health read-only `44636938094` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.


### ADMIN — escrituras por lote al dar de alta vehículos nuevos (2026-11-19)
- [x] Agrupar categoría, marca, modelo, versiones, años, encendido e imagen del vehículo en una escritura contigua (columnas 2–9).
- [x] Agrupar tipo, ubicación, color, configuración del relay e imagen del primer corte en otra escritura contigua (columnas 12–16).
- [x] Mantener timestamp, testigo y colaborador en sus columnas independientes.
- [x] Conservar la asignación y lectura de confirmación del ID centralizado, la reserva idempotente pending/completed, la carga Drive fuera del lock y el flush final.
- [x] Añadir `AdminNewVehicleBatchWrites.mjs` al runner con simulación de rangos, valores y número de escrituras.
- [x] CI `44637971280` SUCCESS: 190 suites, 2,504 pruebas aprobadas, 0 fallos; `AdminNewVehicleBatchWrites` 13/13 PASS y sintaxis JavaScript aprobada.
- [x] Health read-only `44637971232` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron datos productivos.


### ADMIN — reutilizar fila verificada después de Drive al agregar corte a vehículo existente (2026-11-19)
- [x] Reutilizar `verified.rowValues` devuelto por `findRowByOpId` después de la carga Drive.
- [x] Eliminar la segunda lectura integral de la misma fila usada para preparar VIN.
- [x] Mantener la comprobación de unicidad del vehicleId, rowIndex, slotIndex, operationHash y disponibilidad del slot después de Drive.
- [x] Mantener lectura de fallback si no existe opId.
- [x] Añadir `AdminExistingVehiclePostDriveSnapshotReuse.mjs` al runner.
- CI inicial `44638854344`: la implementación pasó sintaxis, pero falló una aserción de prueba que prohibía incluso la lectura fallback para ausencia de opId. Se ajustó el contrato del test para exigir que esa lectura exista solo detrás de `verifiedRowValues ||`.
- CI iniciales `44638854344` y `44639065649`: fallaron solo por aserciones del test (primero el fallback válido, después el escape regex); implementación funcional sin cambios.
- [x] CI final `44639307547` SUCCESS: 191 suites, 2,513 pruebas aprobadas, 0 fallos; `AdminExistingVehiclePostDriveSnapshotReuse` 9/9 PASS.
- [x] Health read-only `44639307367` SUCCESS.
- [x] Pages `44639306388` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron datos productivos.


### ADMIN — revalidar ID del vehículo nuevo desde snapshot post-Drive (2026-11-19)
- [x] Sustituir la lectura individual de `COLS_CORTES.id` por el ID de `verified.rowValues` devuelto por `findRowByOpId`.
- [x] Mantener las verificaciones de rowIndex, vehicleId, slotIndex y operationHash.
- [x] Mantener la lectura completa y comprobación de unicidad de vehicleId dentro de `findRowByOpId`.
- [x] Añadir `AdminNewVehiclePostDriveIdSnapshotReuse.mjs` al runner.
- Estado: IMPLEMENTACIÓN PUBLICADA; CI regresión `44639776262` SUCCESS: 192 suites, 2,520 pruebas aprobadas, 0 fallos; ambas pruebas de snapshot ADMIN PASS. Health read-only `44639776244` SUCCESS. Pages `44639775855` SUCCESS. No se desplegó Apps Script ni se modificaron datos productivos.


### ADMIN — limpieza de fila única al crear vehículo nuevo (2026-11-19)
- [x] Sustituir las dos llamadas iniciales `clearContent()` (columnas 2–final e ID) por una sola limpieza contigua de la fila completa.
- [x] Mantener copia de formato/validación antes de limpiar contenidos.
- [x] Mantener flush, asignación del ID preasignado, confirmación de escritura y reserva idempotente pending antes de Drive.
- [x] Añadir `AdminNewVehicleSingleRowClear.mjs` al runner.
- Estado: IMPLEMENTACIÓN PUBLICADA; CI pendiente. No se desplegó Apps Script ni se modificaron datos productivos.

- [x] CI regresión `44640068663` SUCCESS sobre HEAD `4f99a114e00d178181e30a093dd40f4c50453a07`; verificación de rama, sintaxis y suites aisladas completadas.
- [x] Health read-only `44640068448` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. No se desplegó Apps Script ni se modificaron Sheets/Drive productivos; integración/concurrencia real pendiente de Beta autorizada.

Siguiente tarea de `GP-PERF-ADMIN-CUT-LOCK-01`: analizar las lecturas restantes de Sheets en `handleAddOrUpdateCut` y reducir únicamente consultas redundantes demostrables, preservando atomicidad e idempotencia.


### ADMIN — combinar lecturas acotadas en búsqueda de VIN (2026-11-19)
- [x] Combinar ID, marca, modelo y años en una sola lectura contigua derivada de `COLS_CORTES`.
- [x] Mantener la lectura VIN independiente y dirigida; no usar `getLastColumn()` ni leer toda la fila.
- [x] Preservar exclusión del vehículo actual, detección de duplicados y descripción de marca/modelo/años.
- [x] Actualizar `AdminVinDuplicateBoundedRead.mjs`: 11/11 PASS; contrato WRITE/ADMIN VIN: 12/12 PASS.
- [x] CI final `44640492213` SUCCESS: 193 suites, 2,527 pruebas aprobadas, 0 fallos; sintaxis aprobada.
- [x] Health read-only `44640492202` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.

Siguiente tarea: continuar `GP-PERF-ADMIN-CUT-LOCK-01` con el análisis de lecturas restantes de `handleAddOrUpdateCut`, sin trasladar reservas, revalidaciones ni escrituras atómicas fuera del ScriptLock.


### ADMIN — agrupar validación de columnas testigo AT:AV (2026-11-19)
- [x] Reunir las columnas de testigo sin encabezado en el rango contiguo mínimo.
- [x] Sustituir hasta tres lecturas individuales por una sola lectura compartida bajo ScriptLock.
- [x] Conservar las validaciones de datos preexistentes, encabezados incompatibles, VIN duplicado y ampliación de columnas.
- [x] Actualizar `AdminTestigoHeaderReadReuse.mjs`; permanece integrado en `RunServiceTests.mjs`.
- [x] Validación estática directa: siete condiciones PASS.
- [x] Ejecutar CI Node completa sobre HEAD de trabajo: último código validado `44647298901` SUCCESS (201 suites, 2,571 pruebas, 0 fallos); las actualizaciones posteriores son solo registros Markdown y requieren CI de HEAD documental actual.
- Estado: IMPLEMENTACIÓN Y PRUEBA ACTUALIZADA; CI PENDIENTE. Sin despliegue Apps Script ni cambios en hojas productivas.


### Cierre y corrección de estado — validación testigo + snapshot ADMIN (2026-11-19)
- [x] CI de `ensureTestigoColumns` y prueba `AdminTestigoHeaderReadReuse` ejecutada dentro de la regresión final: 193 suites, 2,528 pruebas aprobadas, 0 fallos (run `44642229762`). Se rectifica el estado pendiente registrado en la nota anterior.
- [x] Acotar la lectura de la fila del vehículo existente al esquema ADMIN (48 columnas) y ampliar solo hasta VIN si está más a la derecha; pruebas `AdminExistingVehicleLookupPreflight` 8/8 y `AdminExistingVehicleSnapshotRevalidation` 7/7.
- [x] Eliminar el fallback de lectura integral post-Drive; exigir el snapshot devuelto por la revalidación idempotente `findRowByOpId`. Prueba `AdminExistingVehiclePostDriveSnapshotReuse` 9/9.
- [x] CI `44642135034` SUCCESS y CI final `44642229762` SUCCESS: 193 suites, 2,528 pruebas, 0 fallos; health read-only de HEAD anterior y nuevo ejecutado sin escritura productiva.
- Sin despliegue Apps Script ni cambios en Sheets/Drive productivos. Concurrencia real diferida a Beta autorizada.
- Estado de estas optimizaciones: COMPLETADAS CON VALIDACIÓN DIFERIDA A BETA. `GP-PERF-ADMIN-CUT-LOCK-01` continúa EN PROGRESO.


### ADMIN — escritura por lote de encabezados testigo AT:AV (2026-11-20)
- [x] Sustituir hasta tres escrituras individuales de encabezado por un único `setValues()` sobre AT:AV cuando exista alguna cabecera faltante o no canónica.
- [x] Mantener validación de duplicados, posiciones, encabezados incompatibles y datos existentes antes de escribir; no escribir si las tres cabeceras ya están correctas.
- [x] `AdminTestigoHeaderReadReuse`: 8/8 PASS.
- [x] CI `44642434395` SUCCESS: 193 suites, 2,528 pruebas aprobadas, 0 fallos; health read-only `44642434153` SUCCESS.
- Sin despliegue Apps Script ni escrituras productivas. Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.



### WRITE — combinar lectura de encabezado y columna ID del asignador (2026-11-20)
- [x] Combinar encabezado `id` y valores de la columna ID en una sola lectura desde fila 1.
- [x] Mantener lectura de fórmulas separada y lectura de datos ajenos al ID solo para filas candidatas; consultar ancho de hoja únicamente si hay filas de datos.
- [x] Preservar detección de duplicados, fórmulas, IDs inválidos, filas incompletas y contador monotónico bajo ScriptLock.
- [x] `WriteVehicleIdAllocatorBoundedRead`: 11/11 PASS; CI `44642666700` SUCCESS: 193 suites, 2,528 pruebas, 0 fallos.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó ni se modificaron datos productivos.


### Decisión — sección crítica del asignador WRITE (2026-11-20)
- [x] Evaluar la reducción adicional del escaneo de IDs sin perder reconciliación de IDs manuales, fórmulas, duplicados ni filas con datos sin ID.
- [x] Combinar encabezado y valores de ID en una lectura; pruebas y CI final registrados en la sección WRITE anterior.
- El escaneo de la columna ID y la inspección de filas candidatas se conservan bajo ScriptLock: el plan `PLAN_MIGRACION_IDS.md` exige preservar IDs manuales/históricos y detectar anomalías; no existe evidencia Beta de que la migración/freeze y el contador central estén completos en todos los entornos. Sustituir el escaneo por solo ScriptProperties podría omitir IDs manuales o anomalías.
- Reabrir una reducción adicional únicamente después de validar en Beta el inventario/freeze de IDs y el estado del contador, sin alterar IDs históricos.


### Cierre local P0 — GP-PERF-ADMIN-CUT-LOCK-01 (2026-11-20)
- La ruta ADMIN de alta/actualización de cortes mantiene reservas pending antes de liberar el lock, ID central de WRITE fuera del lock ADMIN, Drive fuera del lock, readquisición inmediata y revalidación de opId/hash/vehículo/slot antes de persistir.
- Se redujeron lecturas/escrituras remotas redundantes en ADMIN: preflight de entidades, lecturas de VIN agrupadas, búsqueda de ID fuera del lock, snapshots reutilizados, escrituras por lote, fast path de recuperación, cabeceras AT:AV compartidas y escritura de encabezados por lote. Los tests específicos y regresión final 193 suites/2,528 pruebas/0 fallos están registrados arriba.
- WRITE asigna IDs con `tryLock(0)`; encabezado+columna ID se leen en una sola llamada. Se mantiene el escaneo completo necesario para preservar IDs manuales/históricos, detectar duplicados/fórmulas/filas incompletas y reconciliar el contador hasta validar migración/freeze en Beta.
- Pruebas locales de no interferencia entre auditoría, Inbox, health, login y registro de cortes ya están integradas y aprobadas en CI; las garantías de mismo recurso mantienen conflicto/reserva.
- Pendiente exclusivamente para Beta autorizada: confirmar Script IDs/proyectos reales, verificar qué funciones comparten cada ScriptLock y ejecutar concurrencia real entre proyectos/servicios. No se consultaron ni modificaron deployments, ScriptProperties, secretos, Sheets o Drive productivos.
- Estado local: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. El siguiente bloque priorizado es la auditoría P1 de I/O bajo locks en WRITE y FEEDBACK, sin iniciar cambios hasta delimitar cada recurso/contrato.


### P1 — telemetría directa AUTH/WRITE/FEEDBACK sin ScriptLock (2026-11-20)
- [x] Retirar el ScriptLock global de los contadores directos best-effort para que las consultas instrumentadas no compitan con escrituras independientes.
- [x] Mantener explícito `mayUndercount: true` y `best_effort_nonblocking`; la exactitud absoluta no justifica bloquear mutaciones.
- [x] Actualizar la copia de prueba AUTH y los contratos de telemetría/no interferencia. `DirectServiceTrafficTelemetry` 21/21; `P2FeedbackImageUploadLocks` 1/1.
- [x] CI `44643946013` SUCCESS: 193 suites, 2,528 pruebas, 0 fallos; health read-only `44643945928` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se alteraron datos productivos.

### P1 — publicaciones de catálogo FEEDBACK bajo ScriptLock (siguiente tarea)
- [x] Sacar UrlFetch FEEDBACK al Coordinator fuera del ScriptLock con versión monotónica y reset para eventos atrasados.
- [x] Versión monotónica FEEDBACK y compatibilidad legacy implementadas; eventos sin versión se convierten en reset.
- [x] Publicaciones fuera de orden, fallos de snapshot/lock y reset de recuperación cubiertos por pruebas; fallos de red se propagan para reintento/reset del router.


### P1 — FEEDBACK publicaciones de catálogo fuera del ScriptLock (2026-11-20)
- [x] Reservar snapshot y versión monotónica bajo lock; publicar a Coordinator después de liberar el lock para Cortes, PyS y Tutorial.
- [x] Coordinator acepta versiones FEEDBACK por colección, convierte versiones atrasadas en reset y trata publicadores legacy sin versión como reset.
- [x] Fallos de lock/snapshot producen reset fuera del lock; no se publica snapshot no verificado.
- [x] `CatalogChangeFeed` 33/33; `FeedbackCatalogPublicationIsolation` 5/5.
- [x] CI `44644542379` SUCCESS: 194 suites, 2,536 pruebas, 0 fallos; health read-only `44644541751` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Orden de publicación Beta: Coordinator primero, FEEDBACK después. No hubo despliegues Apps Script ni cambios productivos.

### P1 — siguiente revisión de locks WRITE/FEEDBACK
- [x] `handleFreezeCortesIds`: validación de backup Drive fuera del ScriptLock; plan/commit de Cortes protegido.
- [x] Mutaciones PyS: verificación Drive previa, revalidación de reserva, metadata post-commit y rollback Drive fuera del lock con estado intermedio/revalidación.
- [x] Limpieza Drive de adjuntos duplicados/rollback en reportes y sugerencias fuera del lock; solo se eliminan tras confirmar rollback, de lo contrario se conserva el archivo.


### P1 — WRITE freezeCortesIds: respaldo Drive fuera del lock (2026-11-20)
- [x] Mover autorización y verificación de respaldo Drive antes de adquirir ScriptLock.
- [x] Cambiar adquisición a `tryLock(0)`; responder `WRITE_BUSY` si existe otra escritura.
- [x] Mantener bajo lock la lectura/plan de Cortes, dry-run, escritura de valores estáticos y verificación posterior.
- [x] `WriteFreezeCortesIdsBackupOutsideLock` 5/5; `WriteAuthorizationMinimization` 13/13.
- [x] CI `44645165057` SUCCESS: 195 suites, 2,541 pruebas, 0 fallos; health read-only `44645165055` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Sin despliegue Apps Script ni cambios productivos.


### P1 — FEEDBACK PyS: verificación de imagen pending fuera del lock (2026-11-20)
- [x] Verificar archivo Drive antes de adquirir ScriptLock para reservas `UPLOAD_PENDING`.
- [x] Bajo lock, revalidar la reserva completa y reutilizar el archivo prevalidado solo si coinciden opId/hash/problemId/fileId/URL/status.
- [x] Si cambió la reserva, fallar con reintento; si falla la verificación y la reserva sigue igual, marcar `RECOVERY_REQUIRED`.
- [x] Preservar MIME, tamaño, URL, descripción, carpeta y permisos; `FeedbackPysPendingImageVerificationOutsideLock` 5/5; `P2PysImageUploadOutsideLock` PASS.
- [x] CI `44645449059` SUCCESS: 196 suites, 2,546 pruebas, 0 fallos; health read-only `44645449007` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Cleanup Drive/metadata LINKED se mantiene como siguiente revisión separada.


### P1 — FEEDBACK PyS: metadata y actividad post-commit fuera del lock (2026-11-20)
- [x] Liberar ScriptLock tras confirmar fila/ledger LINKED y antes de actualizar descripción Drive o escribir ActividadUsuario.
- [x] En rutas de recuperación, persistir estado LINKED/RECOVERY_REQUIRED bajo lock y realizar metadata Drive después de liberar.
- [x] `FeedbackPysPostCommitOutsideLock` 4/4; `FeedbackPysPendingImageVerificationOutsideLock` 5/5; `P2PysImageUploadOutsideLock` PASS.
- [x] CI `44645868436` SUCCESS: 197 suites, 2,550 pruebas, 0 fallos; health read-only `44645868341` SUCCESS.
- Pendiente separado: sacar del lock la papelera de archivos no referenciados y su compensación, usando estado intermedio/revalidación para no borrar imágenes que otra operación haya vinculado.


### P1 — FEEDBACK PyS: rollback Drive fuera del lock (2026-11-20)
- [x] Al confirmar ausencia de referencias, reservar `RECOVERY_REQUIRED` bajo lock y liberar antes de enviar a papelera.
- [x] Tras confirmar `isTrashed()`, readquirir lock y revalidar opId/problemId/fileId/URL/status antes de restablecer `PENDING`.
- [x] Si falla Drive o la revalidación, conservar `RECOVERY_REQUIRED` y marcar metadata fuera del lock; no borrar archivos con referencias.
- [x] `FeedbackPysRollbackOutsideLock` 6/6; `PysImageStorageRecovery` 22/22; `P2PysImageUploadOutsideLock` PASS.
- [x] CI `44646143035` SUCCESS: 198 suites, 2,556 pruebas, 0 fallos; health read-only `44646143256` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.


### P1 — FEEDBACK reportes: limpieza de adjuntos fuera del lock (2026-11-20)
- [x] Liberar ScriptLock antes de enviar a papelera una imagen duplicada de un reporte idempotente.
- [x] En rollback, verificar primero que fila/metadata quedaron revertidas; solo entonces liberar y eliminar el adjunto. Si la reversión no se confirma, conservar la imagen.
- [x] `FeedbackReportImageCleanupOutsideLock` 5/5; CI `44646463925` SUCCESS: 199 suites, 2,561 pruebas, 0 fallos; health read-only `44646464055` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.


### P1 — FEEDBACK sugerencias: limpieza de adjuntos fuera del lock (2026-11-20)
- [x] Liberar ScriptLock antes de enviar a papelera imágenes duplicadas de operaciones/reportes idempotentes.
- [x] En rollback, eliminar adjunto solo cuando la fila se limpió y verificó; conservarlo si la reversión no se confirma.
- [x] `FeedbackSuggestionImageCleanupOutsideLock` 5/5; CI `44646768057` SUCCESS: 200 suites, 2,566 pruebas, 0 fallos; health read-only `44646767980` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.


### P1 — FEEDBACK sugerencias: limpieza de adjuntos fuera del lock (2026-11-20)
- [x] Liberar ScriptLock antes de enviar a papelera imágenes duplicadas de operaciones/reportes idempotentes.
- [x] En rollback, eliminar adjunto solo cuando la fila se limpió y verificó; conservarlo si la reversión no se confirma.
- [x] `FeedbackSuggestionImageCleanupOutsideLock` 5/5; CI `44646768057` SUCCESS: 200 suites, 2,566 pruebas, 0 fallos; health read-only `44646767980` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.


### P1 — FEEDBACK sugerencia de año: Drive y actividad fuera del lock (2026-11-20)
- [x] Dejar `completeFeedbackYearApplication_` limitado a Sheets/ledger y devolver solicitudes internas para actividad y sincronización Drive.
- [x] Liberar ScriptLock antes de logUserActivity y mover imagen a carpeta canónica.
- [x] Revalidar ID del vehículo y URL de imagen con lectura fresca antes de mover; si cambia, omitir movimiento y devolver advertencia.
- [x] `FeedbackYearFolderSyncOutsideLock` 5/5; `SuggestYearVoteThreshold` 6/6; CI `44647298901` SUCCESS: 201 suites, 2,571 pruebas, 0 fallos.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Health read-only `44647298819` SUCCESS.


### P1 — FEEDBACK likes: actividad fuera del lock (2026-11-20)
- [x] Mantener contador y ledger pending/completed bajo lock; ejecutar `logUserActivity` después de liberar.
- [x] Evitar actividad duplicada en replay completed. `FeedbackLikeActivityOutsideLock` 5/5.
- [x] CI `44647675553` SUCCESS: 202 suites, 2,576 pruebas, 0 fallos; health read-only `44647675689` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.


### P1 — FEEDBACK asignador formula-based ID con lectura acotada (2026-11-20)
- [x] Leer primero solo columna ID; inspeccionar filas completas únicamente para grupos contiguos con ID vacío.
- [x] Conservar detección de datos sin ID, prefijo/sufijo inválido, duplicados, contador backend y lock ya adquirido.
- [x] `FeedbackFormulaIdAllocatorBoundedRead` 6/6; CI `44647995645` SUCCESS: 203 suites, 2,582 pruebas, 0 fallos; health read-only `44647995469` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.


### P1 — ADMIN catálogo Cortes: publicación fuera del lock con sourceVersion (2026-11-20)
- [x] Construir snapshots y reservar versión monotónica bajo ScriptLock; ejecutar UrlFetch al Coordinator después de liberar.
- [x] Para batches, reservar rango de versiones en una escritura y publicar en chunks de 50 fuera del lock.
- [x] Coordinator admite ADMIN/Cortes, convierte eventos legacy sin versión y snapshots atrasados en reset; lock/snapshot/red fallidos fuerzan reset.
- [x] `AdminCatalogPublicationIsolation` 6/6; `CatalogChangeFeed` y `SharedMutationCoordinator` cubren orden/reintentos.
- [x] CI `44649098649` SUCCESS; health read-only `44649098541` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Sin despliegues ni cambios productivos.


### P1 — ADMIN movimiento de imagen: actividad y logging fuera del lock (2026-11-20)
- [x] Mantener el movimiento Drive y la confirmación/rollback de metadata dentro de la sección crítica actual.
- [x] Diferir el registro de actividad (Coordinator/hoja ActividadUsuario) y el mensaje de logging hasta después de liberar ScriptLock.
- [x] Preservar respuesta para carpeta idéntica y el contrato best-effort del helper de actividad. `AdminMoveImageActivityOutsideLock` 7/7.
- [x] CI `44652254166` SUCCESS: 206 suites, 2,603 pruebas, 0 fallos; health read-only `44652254131` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. El movimiento/rollback Drive sigue bajo lock por seguridad de referencias; separar requiere reserva y revalidación coordinada.


### GP-PERF-ADMIN-CUT-LOCK-01 — mapa local de ámbitos ScriptLock (2026-11-20)
- [x] AUTH: intentos de login en CacheService; sesiones y actividad en ActiveSessions/Users; cambios de usuario/roles/contraseñas y revocación de sesiones; migración de marcadores de rol en ScriptProperties; mantenimiento de Logs. Son recursos distintos que actualmente comparten el ScriptLock del proyecto AUTH.
- [x] ADMIN: filas/columnas de Cortes (IDs, VIN, testigos, campos e imágenes); reservas/idempotencia de cortes; inventario e historial de imágenes reemplazadas; esquema e inventario Drive; publicación de catálogo/versiones. Varios recursos comparten el ScriptLock del proyecto ADMIN.
- [x] WRITE: slots y filas de Cortes, asignador de IDs, testigos AT:AV, información suplementaria, VIN e ImageUploadLedger. Recursos distintos comparten el ScriptLock del proyecto WRITE.
- [x] FEEDBACK: asignación de IDs y mutaciones Cortes/PyS/Tutorial, likes, reportes, sugerencias y sus ledgers; publicaciones de catálogo. Los handlers mutadores comparten el ScriptLock del proyecto FEEDBACK.
- [x] USERS: mutaciones de Users y operaciones relacionadas; Coordinator: leases/estado de mutaciones y feed compartido; InboxConversations: estado de conversaciones/mensajes. Cada lock es global dentro de su proyecto respectivo.
- [x] Telemetría directa de CATALOG y USERS usa tryLock(0) best-effort y no espera si encuentra contención; esto evita que la lectura espere, aunque el breve tramo que sí adquiere ScriptLock sigue compartiendo ámbito con mutaciones de ese proyecto.
- [ ] Confirmar Script IDs/deployments reales y agrupar qué fuentes comparten cada proyecto. README/contexto confirman que fuentes y deployments son independientes y que no hay IDs de proyecto versionados suficientes; no inferir aislamiento desde nombres de archivos ni endpoints. Requiere inventario autorizado en Beta.
- [ ] Prueba real de no interferencia entre deployments y conflicto de dos mutaciones sobre el mismo recurso en Beta autorizada.
- Nota: este mapa es una clasificación estática de los locks encontrados en fuentes, no una afirmación de topología desplegada. No se consultaron proyectos Apps Script ni se accedió a datos productivos.


### P1 — ADMIN restauración de imagen histórica: Drive fuera del lock (2026-11-20)
- [x] Ejecutar getFileById, MIME, papelera y validación de carpeta Cortes fuera del ScriptLock.
- [x] Readquirir con tryLock(0) y revalidar en inventario tipo/estado/Drive ID/URL/vehículo/campo antes de continuar.
- [x] Mantener bajo lock referencias activas, conflicto, escritura Cortes e historial/rollback; liberar solo si el lock está adquirido.
- [x] AdminRecoverImageDrivePreflightOutsideLock 11/11; AdminReplacedImagesIntegrity 56/56.
- [x] CI 44652896571 SUCCESS: 207 suites, 2,614 pruebas, 0 fallos; health read-only 44652896675 SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Sin despliegue ni cambios productivos.


### P1 — ADMIN envío de imagen a papelera: actividad fuera del lock (2026-11-20)
- [x] Mantener la actualización/verificación de Drive e historial y rollback dentro de la sección crítica existente.
- [x] Diferir la actividad Coordinator y el mensaje de logging hasta después de liberar ScriptLock; preservar el replay idempotente `en_papelera`.
- [x] `AdminDeleteImageActivityOutsideLock` 6/6; `AdminImageTrashLifecycle` 40/40.
- [x] CI `44653097187` SUCCESS: 208 suites, 2,620 pruebas, 0 fallos; health read-only `44653097327` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. La operación Drive de papelera requiere una tarea posterior de reserva/compensación para salir del lock.


### P1 — ADMIN restauración desde papelera: actividad fuera del lock (2026-11-20)
- [x] Diferir actividad Coordinator y logging después de liberar ScriptLock; conservar restauración Drive, verificación y rollback de historial actuales.
- [x] Preservar respuesta idempotente cuando el archivo ya está restaurado. AdminRestoreImageActivityOutsideLock 6/6; AdminImageTrashLifecycle 40/40.
- [x] CI 44653303076 SUCCESS: 209 suites, 2,626 pruebas, 0 fallos; health read-only 44653303269 SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Sin despliegue ni cambios productivos.


### P1 — ADMIN eliminación definitiva: actividad fuera del lock (2026-11-20)
- [x] Liberar ScriptLock después de confirmar `eliminada` en el historial, antes de registrar actividad Coordinator y logging, tanto en reconciliación HTTP 404 como en eliminación confirmada.
- [x] Evitar doble liberación con helper local. AdminPermanentDeleteActivityOutsideLock 6/6; AdminImageTrashLifecycle 40/40.
- [x] CI 44653582395 SUCCESS: 210 suites, 2,632 pruebas, 0 fallos; health read-only 44653582292 SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. La eliminación Drive sigue bajo lock hasta implementar lease exclusivo de operación y revalidación.


### P1 — ADMIN marcar imagen en uso: Drive y actividad fuera del lock (2026-11-20)
- [x] Verificar Drive/MIME/papelera/carpeta fuera del ScriptLock y readquirir con tryLock(0).
- [x] Revalidar tipo/estado/Drive ID antes de escribir `en_uso`; si cambió el registro no se modifica.
- [x] Diferir actividad Coordinator y logging hasta después del lock. AdminMarkImageInUseDrivePreflightOutsideLock 10/10; AdminReplacedImagesIntegrity 56/56.
- [x] CI 44653864364 SUCCESS: 211 suites, 2,642 pruebas, 0 fallos; health read-only 44653864334 SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Sin despliegue ni cambios productivos.


### P1 — ADMIN eliminación definitiva: preflight Drive fuera del lock (2026-11-20)
- [x] Mover GET inicial Drive API, MIME, estado papelera y validación de carpeta Cortes fuera del ScriptLock.
- [x] Readquirir con tryLock(0), revalidar tipo/estado/Drive ID y volver a comprobar referencias antes de continuar.
- [x] Mantener reserva `eliminacion_pendiente`, DELETE y GET final bajo lock; reconciliar 404 y actividad post-lock.
- [x] AdminPermanentDeleteDrivePreflightOutsideLock 9/9; AdminPermanentDeleteActivityOutsideLock 6/6; AdminImageTrashLifecycle 40/40.
- [x] CI 44654436417 SUCCESS: 212 suites, 2,651 pruebas, 0 fallos; health read-only 44654436415 SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Sin despliegue ni cambios productivos.


### P1 — ADMIN restauración desde papelera: preflight Drive fuera del lock (2026-11-20)
- [x] Mover lectura Drive (papelera/MIME/carpeta/ruta) fuera del ScriptLock.
- [x] Readquirir con tryLock(0) y revalidar tipo/estado/estado previo/Drive ID; reutilizar objeto verificado.
- [x] Mantener setTrashed(false), read-back y rollback bajo lock; conservar idempotencia y actividad post-lock.
- [x] AdminRestoreImageDrivePreflightOutsideLock 10/10; AdminRestoreImageActivityOutsideLock 6/6; AdminImageTrashLifecycle 40/40.
- [x] CI 44654753039 SUCCESS: 213 suites, 2,661 pruebas, 0 fallos; health read-only 44654752914 SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Sin despliegue ni cambios productivos.


### P1 — ADMIN envío de imagen a papelera: preflight Drive fuera del lock (2026-11-20)
- [x] Mover lectura DriveApp, MIME, papelera y ruta de carpeta fuera del ScriptLock.
- [x] Readquirir con tryLock(0) y revalidar tipo/estado/Drive ID antes de volver a comprobar referencias y mutar.
- [x] Mantener setTrashed(true), read-back y rollback bajo lock; actividad post-lock e idempotencia `en_papelera`.
- [x] AdminDeleteImageDrivePreflightOutsideLock 10/10; AdminImageTrashLifecycle 40/40; AdminReplacedImagesIntegrity 56/56.
- [x] CI 44655257521 SUCCESS: 214 suites, 2,671 pruebas, 0 fallos; health read-only 44655257749 SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Sin despliegue ni cambios productivos.


### P1 — ADMIN movimiento de imagen: preflight Drive fuera del lock (2026-11-20)
- [x] Mover lecturas Drive/MIME/papelera/carpetas/rutas/clasificación de destino fuera del ScriptLock.
- [x] Readquirir con tryLock(0), revalidar tipo/estado/Drive ID y metadata de ubicación/organización; volver a comprobar referencias.
- [x] Mantener moveTo, read-back, metadata y rollback bajo lock; diferir actividad/logging y conservar el caso de carpeta idéntica.
- [x] AdminMoveImageDrivePreflightOutsideLock 11/11; AdminMoveImageActivityOutsideLock 7/7.
- [x] CI 44655643108 SUCCESS: 215 suites, 2,682 pruebas, 0 fallos; health read-only 44655643102 SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Sin despliegue ni cambios productivos.


### P1 — ADMIN ciclo de papelera: lock inicial no bloqueante (2026-11-20)
- [x] Envío a papelera: reemplazar espera de 30 s por `tryLock(0)` y devolver `ADMIN_BUSY` si ADMIN está ocupado.
- [x] Restauración desde papelera: aplicar el mismo contrato no bloqueante.
- [x] Liberar solo si `lockAcquired` confirma que se obtuvo el lock; no tocar Drive ni historial en contención inicial.
- [x] `AdminImageTrashLifecycle` 41/41; `AdminDeleteImageActivityOutsideLock` 6/6; `AdminRestoreImageActivityOutsideLock` 6/6.
- [x] CI `44661420739` SUCCESS: 215 suites, 2,684 pruebas, 0 fallos; health read-only `44661420823` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Sin despliegue Apps Script ni cambios productivos.
- [x] Evaluación completada: no implementar la propuesta de lease/reserva para sacar `setTrashed` y su compensación del ScriptLock en esta fase local. La propuesta ya estaba diferida a medición Beta en la adenda del backlog del 2026-11-17; la sección 15 de NORMAS_DESAROLLO.md prioriza simplificación y no autoriza añadir leases ordinarias. No hay medición Beta que demuestre contención perjudicial en este flujo.
- Estado de la evaluación: COMPLETADA. La propuesta de implementación queda DIFERIDA A MEDICIÓN BETA; se conservan sin cambios la mutación Drive, el rollback y la protección actuales. No se debilita el flujo destructivo.


### P1 — ADMIN conciliación de imágenes Cortes: verificación del respaldo fuera del lock (2026-11-20)
- [x] Separar la validación de Drive del archivo de respaldo (existencia, papelera, MIME, ACL privada, manifiesto y contenido de la copia) del ScriptLock global.
- [x] Tras readquirir con `tryLock(0)`, verificar bajo lock el fingerprint y las dimensiones de la Spreadsheet operativa contra el respaldo antes de leer la auditoría o escribir.
- [x] Si no se readquiere el lock o la base cambió, abortar antes del preview/escrituras; conservar las validaciones originales y el camino de verificación directa del helper para otros consumidores.
- [x] `CortesImageReconciliationApply` 18/18 PASS; `CortesImageReconciliation` 34/34 PASS; parsing de `admin.js` PASS en runtime V8 aislado.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. CI `44708443965` SUCCESS; health read-only `44708443686` SUCCESS; Pages `44708443338` SUCCESS. No se desplegó Apps Script ni se modificaron datos productivos.
- Nota: el preview completo (snapshot de destinos/referencias, auditoría Drive y ACL) permanece bajo lock; separarlo exige revalidar esos recursos y no se hará por suposición ni sin evidencia de contención. Medir en Beta autorizada antes de ampliar el cambio.


### Resolución técnica — propuesta de lease para papelera ADMIN (2026-11-20)
- Se contrastó la propuesta activa con la sección 15 de `NORMAS_DESAROLLO.md` y con la adenda de continuidad del backlog del 2026-11-17, que ya había diferido el diseño claim/reserva/commit hasta contar con mediciones Beta de contención.
- No hay evidencia de medición que justifique el cambio, y mover `setTrashed`/restauración y compensación fuera de la sección crítica sin una reserva aprobada alteraría las garantías de concurrencia, idempotencia y rollback. No se introduce lease ni se retira protección existente.
- La tarea de evaluación queda COMPLETADA; la implementación se mantiene DIFERIDA A MEDICIÓN BETA. Reabrir solo con evidencia de contención y una nueva revisión de diseño compatible con la normativa vigente.
- `AdminImageTrashLifecycle.mjs`: 41/41 PASS en ejecución aislada local contra las fuentes actuales.
- Regresión global CI `44708443965` SUCCESS: 215 suites, 2,686 pruebas aprobadas, 0 fallos. Health read-only `44708443686` SUCCESS; Pages `44708443338` SUCCESS.
- Las demás casillas abiertas de `Tareas_Activas.md` requieren despliegue/entorno Beta, Script IDs, datos Drive/Spreadsheet o concurrencia real. No se despliega ni se accede a datos productivos sin autorización expresa.


### P1 — AUTH recuperación de contraseña: logging después de liberar ScriptLock (2026-11-20)
- [x] Mover el registro de éxito de `handleCompletePasswordRecovery` fuera del `ScriptLock` que protege Users/ActiveSessions; conservar bajo lock la verificación del código, consumo, actualización de hash, revocación y limpieza de sesiones.
- [x] Mantener el logging best-effort y comprobar explícitamente el orden `wait → release → log` en `PasswordRecovery.mjs`.
- [x] Mantener sincronizada la copia aislada `JS/Tests/Auth.js` con el handler productivo.
- `PasswordRecovery.mjs` 10/10 PASS; prueba aislada V8 del handler PASS en éxito, código inválido y fallo best-effort de logging; parsing de `Auth.js` y fixture PASS; paridad del handler productivo/fixture PASS.
- CI `44726478008` SUCCESS: 215 suites, 2,686 pruebas aprobadas, 0 fallos; health read-only `44726478247` SUCCESS; Pages `44726477077` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Sin despliegue Apps Script ni cambios de datos productivos.


### Cierre de inventario estático de ScriptLock (2026-11-20)
- [x] Documentado que ScriptLock es global por proyecto Apps Script y no por archivo/función.
- [x] Inventariados los recursos protegidos por AUTH, ADMIN, WRITE, FEEDBACK, USERS, Coordinator e InboxConversations en GP-PERF-ADMIN-CUT-LOCK-01.
- La agrupación real por Script ID/deployment y la concurrencia entre deployments permanecen pendientes de Beta autorizada; no se infiere el aislamiento real desde nombres de archivos o URLs.


### Continuidad documental — reconciliar checkpoint con HEAD real (2026-11-20)
- [x] Contrastar HEAD de la rama de trabajo con la API de ramas y el commit asociado.
- [x] Corregir el SHA del checkpoint y actualizar los identificadores de CI, health y Pages asociados al HEAD verificado.
- [x] Confirmar que la rama base protegida no cambió y mantener las tareas de Beta abiertas.
- Estado: COMPLETADA. La publicación de este checkpoint dispara una nueva regresión documental; no equivale a validación de despliegue Apps Script.


### Comprobación de ruta de ejecución para Beta (2026-11-20)
- [x] Verificar runtime disponible: Node v22.16.0 y npm 10.9.2.
- [x] Intentar checkout limpio por Git; documentar que DNS/salida de red impide clonar GitHub en este entorno y que no hay checkout local.
- [x] Verificar herramientas de despliegue: clasp ausente; Google Drive connector deshabilitado por administración; no existe acción Apps Script ni workflow de despliegue en el repo; health workflow es GET-only.
- [x] Confirmar CI de GitHub sobre HEAD anterior: 215 suites, 2,686 pruebas, 0 fallos; health y Pages SUCCESS.
- Estado: DIAGNÓSTICO DE HERRAMIENTAS COMPLETADO. No marcar Beta como validada ni ejecutar despliegues con una ruta no autorizada. Siguiente paso operativo: habilitar un mecanismo de acceso a Apps Script de Beta y proporcionar/autorizar los Script IDs correspondientes.


### P1 — Búsqueda agrupada por modelo y navegación jerárquica — GP-UX-SEARCH-MODEL-GROUPING-01 (2026-11-20)
**Requisito:** los resultados de Cortes se agrupan por modelo, sin listar de entrada cada versión, tipo de encendido o rango. Al seleccionar el modelo, mostrar tarjetas de versión/equipamiento si hay varias; dentro de la selección mostrar tipos de encendido si hay varias; después mostrar los rangos de años. Si una dimensión tiene una sola opción, omitirla. Si solo queda un rango con un registro inequívoco, abrir directamente el modal. La navegación interna y el historial del navegador deben reproducir y restaurar la misma jerarquía.
- [x] Registrar el requisito y auditar búsqueda global, render de resultados, navegación de catálogo, selección de versión/encendido, rangos, modal y History API.
- [x] Identificar compatibilidades que deben preservarse: búsquedas por VIN exactas/ambiguas, resultados Relay/Tutorial/PyS, búsqueda por marca/año, navegación desde categorías y retorno a la consulta original.
- [x] Implementar agrupación de resultados de Cortes por categoría + marca + modelo, preservando la relevancia del mejor registro del grupo y los resultados de otras secciones.
- [x] Unificar el resolver Modelo → versión/equipamiento opcional → tipo de encendido opcional → rangos → modal; omitir dimensiones de una sola opción y no elegir arbitrariamente entre registros duplicados.
- [x] Mantener VIN ambiguos como opciones individuales y reservar la autoapertura para VIN inequívoco; una búsqueda textual normal requiere seleccionar el modelo.
- [x] Conservar consulta, versión y encendido en el estado de navegación; el flujo popstate reconstruye búsqueda, equipamiento, encendido y rangos.
- [x] Añadir SearchModelGrouping.mjs y registrarlo en RunServiceTests.mjs. Cobertura: agrupación/identidad, prioridad, resultados mixtos, VIN ambiguo, 0/1/múltiples opciones, rangos abiertos, duplicados, autoapertura y ruta History API.
- [x] Ejecución aislada local de SearchModelGrouping: 21/21 PASS (Node v22.16.0). Se ejecutaron los helpers de búsqueda/navegación y la prueba de History API; las comprobaciones de ui/navigation/main son estáticas sobre los fragmentos de integración.
- [x] Ejecutar RunServiceTests.mjs completo en CI `44764022976`: 220 suites, 2,735 pruebas, 0 fallos; `SearchModelGrouping` 21/21 PASS. La prueba visual en navegador con catálogo representativo queda pendiente de un entorno browser autorizado.
- Auditoría: AUDITORIA_BUSQUEDA_MODELOS_2026-11-20.md.
- Estado: IMPLEMENTACIÓN Y REGRESIÓN INTEGRAL COMPLETADAS; VALIDACIÓN VISUAL EN NAVEGADOR PENDIENTE. Sin despliegue Apps Script ni cambios en datos productivos.


### WRITE/ADMIN — reserva idempotente de vehicleId ADMIN→WRITE (2026-11-20)
- [x] ADMIN transmite el `opId` y `operationHash` previamente calculado a WRITE para altas idempotentes; las solicitudes legacy conservan el contrato sin esos campos.
- [x] WRITE persiste la relación `opId + operationHash + vehicleId` en el ledger `CortesIdReservations` bajo su `ScriptLock` no bloqueante.
- [x] Un reintento con la misma clave y huella recupera el mismo ID; reutilizar el `opId` con otra huella se rechaza sin consumir otro ID.
- [x] Verificar la reserva después de escribirla y mantener la secuencia monotónica también frente a reservas previas y asignaciones legacy.
- [x] Cubrir respuesta perdida/reintento ADMIN→WRITE, fallo al persistir el contador después de guardar el ledger, encabezados incompatibles, huella inválida y respuesta `WRITE_BUSY`.
- [x] Pruebas específicas: `WriteVehicleIdAllocationIdempotency` 9/9; `AdminVehicleIdAllocationIdempotency` 3/3; `VehicleIdAllocationEndToEnd` 4/4; `AdminCutPreflightBeforeAllocation` 7/7 PASS.
- [x] Regresión GitHub Actions `44746455621` SUCCESS: 219 suites, 2,723 pruebas aprobadas, 0 fallos. Health read-only `44746455562` SUCCESS; Pages `44746451810` SUCCESS.
- Sin despliegue Apps Script ni cambios en hojas/Drive productivos. La comprobación del nuevo ledger y el comportamiento real de Spreadsheet quedan para Beta autorizada.
- Estado de esta subactividad: COMPLETADA LOCALMENTE CON VALIDACIÓN DIFERIDA A BETA. `GP-PERF-ADMIN-CUT-LOCK-01` continúa en progreso.
- Siguiente paso local: continuar la revisión de lecturas restantes de Sheets dentro de `handleAddOrUpdateCut`; eliminar solo consultas redundantes demostrables, preservando reservas, detección de conflictos, revalidación y escrituras atómicas.


### GP-PERF-ADMIN-CUT-LOCK-01 — optimización de recuperación legacy por snapshot (2026-11-20)
- [x] Identificar la doble lectura de «Cortes» en la ruta legacy de `findRowByOpId`: tras descargar `getDataRange()`, se volvía a leer la columna ID y la fila completa mediante `findUniqueCortesVehicleRow_`.
- [x] Añadir `findUniqueCortesVehicleRowFromSnapshot_` para validar IDs vacíos/inválidos, unicidad y coincidencia de fila usando el snapshot ya obtenido.
- [x] Sustituir la consulta previa `getLastRow()` por la comprobación de `data.length` después de la única lectura integral de la ruta legacy.
- [x] Añadir `AdminLegacyOpIdSnapshotReuse.mjs` y registrarlo en `RunServiceTests.mjs`; cubre reutilización de fila, ID ausente/duplicado/malformado y ausencia de lecturas repetidas.
- [x] Ejecutar prueba focalizada y `RunServiceTests.mjs` completo: `AdminLegacyOpIdSnapshotReuse` 10/10; CI `44763121682` SUCCESS: 220 suites, 2,733 pruebas, 0 fallos; sintaxis PASS. La corrección posterior de snapshot/ID se validó en CI `44764022976`: 220 suites, 2,735 pruebas, 0 fallos.
- Se conservan dentro del ScriptLock las comprobaciones de ledger, conflicto, unicidad y revalidación. No se movieron lecturas críticas ni escrituras fuera del lock.
- Sin despliegue Apps Script ni acceso/modificación de hojas o Drive productivos.
- Estado: SUBACTIVIDAD COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron Sheets/Drive productivos.
- Siguiente: continuar auditoría de lecturas dentro de `handleAddOrUpdateCut`; no retirar validaciones pre/post escritura ni revalidaciones tras liberar ScriptLock/Drive.


## Continuidad — validación focalizada de recuperación legacy ADMIN (2026-11-20)
- HEAD de trabajo verificado antes de esta actualización documental: `239a2919fceebf5dbc269627d3569fb11af228e1`; rama base verificada: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Se confirmó que `AdminLegacyOpIdSnapshotReuse.mjs` está registrado en `RunServiceTests.mjs` y que el código de `findRowByOpId` reutiliza `data` para validar unicidad y recuperar la fila, sin la llamada previa a `getLastRow()` ni una segunda lectura del ID/fila en la ruta legacy.
- Prueba focalizada aislada: 10/10 PASS en Node v22.16.0, usando el helper y el handler extraídos de la fuente vigente. `node --check` PASS sobre el harness aislado y el archivo de prueba.
- Limitación de entorno: no hay checkout local completo; por tanto, `RunServiceTests.mjs` integral no se pudo ejecutar localmente. El harness aislado no se presenta como ejecución del runner oficial.
- GitHub Actions no reporta todavía checks ni ejecuciones asociados al HEAD verificado. La regresión integral se solicitará mediante el commit documental de esta actualización; mantener abierta la tarea hasta comprobar el resultado real.
- [x] `AdminLegacyOpIdSnapshotReuse.mjs`: 10/10 PASS en el runner oficial.
- [x] CI `44763121682` SUCCESS: 220 suites, 2,733 pruebas aprobadas, 0 fallos; comprobación de sintaxis PASS.
- [x] Health read-only `44763121560` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron hojas/Drive productivos.


### GP-PERF-ADMIN-CUT-LOCK-01 — cierre de reutilización legacy por snapshot (2026-11-20)
- [x] `AdminLegacyOpIdSnapshotReuse.mjs`: 10/10 PASS en el runner oficial.
- [x] CI `44763121682` SUCCESS: 220 suites, 2,733 pruebas aprobadas, 0 fallos; comprobación de sintaxis PASS.
- [x] Health read-only `44763121560` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. No se desplegó Apps Script ni se modificaron hojas/Drive productivos.
- Siguiente subactividad: inspeccionar las lecturas restantes dentro de `handleAddOrUpdateCut`; modificar únicamente redundancias demostrables y conservar integridad/idempotencia.


### GP-PERF-ADMIN-CUT-LOCK-01 — rango exacto en búsqueda previa de vehicleId (2026-11-20)
- [x] Cambiar el número de filas solicitado de `lastRowForLookup` a `lastRowForLookup - 1` al leer desde la fila 2.
- [x] Mantener revalidación bajo ScriptLock mediante snapshot de fila y comparación del ID.
- [x] `AdminExistingVehicleLookupPreflight.mjs` 10/10 PASS; CI `44763460378` SUCCESS: 220 suites, 2,735 pruebas, 0 fallos; health read-only `44763460429` SUCCESS.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Sin despliegue Apps Script ni cambios productivos.
- Siguiente: continuar la auditoría de lecturas remotas dentro de `handleAddOrUpdateCut`.


### GP-PERF-ADMIN-CUT-LOCK-01 — snapshot inicial de Idempotencia sin relectura (2026-11-20)
- [x] Usar el snapshot integral leído bajo ScriptLock en la primera búsqueda de `opId`, sin ejecutar otra lectura dirigida inmediata.
- [x] Mantener revalidación dirigida por defecto para callbacks post-Drive, operaciones que readquieren lock y reconciliación de errores.
- [x] `AdminIdempotencySnapshotReuse` 10/10 y `AdminLegacyOpIdSnapshotReuse` 10/10 PASS; CI `44764022976` SUCCESS: 220 suites, 2,735 pruebas, 0 fallos; health read-only `44764023135` SUCCESS.
- [x] Corregir el extractor de test que aún esperaba la firma anterior; CI inicial `44763915168` falló solo por ese contrato estático y la repetición aprobó.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Sin despliegue Apps Script ni cambios productivos.
- Siguiente: auditar lecturas de `recordOpId` y `markAdminCutImagesLinkedOutsideLock_`.


### GP-PERF-ADMIN-CUT-LOCK-01 — cierre de auditoría de lecturas restantes (2026-11-20)
- [x] Revisar lecturas de `recordOpId`: conservar revalidación dirigida previa a escritura para detectar cambios de asociación/estado y lectura posterior como read-back de persistencia.
- [x] Revisar `markAdminCutImagesLinkedOutsideLock_`: conservar revalidación de opId/vehicleId/slotIndex/hash después de liberar y readquirir ScriptLock para trabajo Drive.
- [x] Confirmar que las escrituras normales del ledger `Idempotencia` se ejecutan bajo ScriptLock; migración también toma el lock. `handleCheckOperation` es de solo lectura.
- [x] No se identificaron más lecturas redundantes que puedan eliminarse sin reducir la protección frente a cambios externos, fallos parciales o carreras post-Drive. No se modificó código en esta revisión.
- Estado: AUDITORÍA LOCAL COMPLETADA. El bloque local `GP-PERF-ADMIN-CUT-LOCK-01` queda COMPLETADO CON VALIDACIÓN DIFERIDA A BETA; quedan pendientes únicamente Script IDs reales y pruebas de concurrencia/Drive/Spreadsheet en Beta autorizada.


### 2026-11-20 — cobertura local del constructor del organizador de imágenes
- [x] Añadida `JS/Tests/CortesImageOrganizerTargets.mjs` y registrada en `RunServiceTests.mjs`.
- [x] Ocho escenarios: destinos de los ocho campos de Cortes + logo; ruta/nombre/código funcional; versiones y años ambiguos; fórmulas; IDs de vehículo duplicados; archivo compartido; tipo de corte no reconocido; marca mult categoría y duplicidad de logo.
- [x] CI `44768089834` SUCCESS: 221 suites, 2,743 pruebas aprobadas, 0 fallos. `CortesImageOrganizerTargets` 8/8 PASS; health read-only `44768090013` SUCCESS.
- La primera ejecución falló por un caso de prueba cuyo valor de tipo de corte no produjo un código funcional según el clasificador actual; se ajustó únicamente el dato de prueba al valor canónico y la repetición aprobó. No se modificó código productivo ni se relajó la clasificación.
- Estado: COBERTURA LOCAL COMPLETADA. El preview real de Drive/Spreadsheet sigue pendiente de Beta; Safe Apply continúa sin implementar y condicionado a la revisión del preview real.


### 2026-11-20 — Safe Apply: primitivas de manifiesto, idempotencia y rollback
- [x] Añadir `buildCortesImageOrganizerApplyManifest_`: digest exacto del preview, confirmación explícita, auditoría válida, referencias verificadas, selección limitada a la página revisada, IDs únicos, destinos no duplicados y nombres sin separadores de ruta.
- [x] Añadir `classifyCortesImageOrganizerOperationState_` para distinguir estado original listo, operación ya aplicada y deriva/conflicto; bloquea papelera, MIME no imagen e identidad alterada.
- [x] Añadir `buildCortesImageOrganizerRollbackPlan_`, que invierte el orden de aplicación y solo prepara reversión cuando el archivo sigue exactamente en el destino confirmado.
- [x] Añadir `JS/Tests/CortesImageOrganizerApplyPlan.mjs` y registrarla en `JS/Tests/RunServiceTests.mjs` (14 escenarios).
- [x] Parsing del archivo ADMIN completo y ejecución aislada V8 de las 14 comprobaciones focalizadas: PASS.
- No hay checkout Node local ni se obtuvo evidencia de ejecución CI asociada al commit de esta iteración; la suite oficial queda pendiente de ejecución por GitHub Actions. No afirmar regresión integral.
- El ejecutor que modifica Drive, el registro durable de operaciones, la comprobación ACL de carpetas destino y la recuperación real siguen pendientes. No se habilitó ni ejecutó ninguna operación Drive/Spreadsheet.
- Estado: SUBACTIVIDAD DE PREPARACIÓN COMPLETADA; Safe Apply EN PROGRESO. La ejecución real continúa condicionada a revisar el preview real y a confirmar permisos/efectos de herencia del destino.

### 2026-11-20 — Safe Apply: ejecutor Drive, ledger durable y rollback ejecutable
- [x] Añadir applyCortesImageOrganizer: vuelve a generar el preview desde la auditoría vigente, compara el digest aprobado y limita la selección a IDs de la página revisada; exige sesión Desarrollador y confirmación explícita.
- [x] Implementar ejecutor por lotes de hasta 10 imágenes: valida estado de origen, crea/resuelve carpetas sin aceptar rutas ambiguas, comprueba colisiones, mueve/renombra y verifica por lectura posterior el nombre y la ubicación exactos.
- [x] Añadir ledger durable por operación en ScriptProperties, con identidad de propietario, digest/auditoría, estados processing/complete/rolled_back/needs_review, lectura/escritura verificada y transición protegida por ScriptLock no bloqueante.
- [x] Los reintentos reconocen operaciones confirmadas sin repetir movimientos; un archivo que ya aparece en destino sin evidencia durable se bloquea. Las operaciones con estado incierto requieren revisión manual.
- [x] Verificar el nivel de acceso compartido y consultar editores/lectores en cada carpeta de la cadena de destino; se rechazan carpetas con acceso general distinto de PRIVATE o ACL no legible.
- [x] Añadir rollbackCortesImageOrganizer: revierte únicamente operaciones completas cuyo archivo conserve exactamente nombre y ubicación destino; verifica ACL del origen, evita colisiones y confirma la ubicación original. Reintentos de rollback son idempotentes.
- [x] Añadir JS/Tests/CortesImageOrganizerExecutor.mjs (9/9) y registrarlo en RunServiceTests.mjs; conservar CortesImageOrganizerApplyPlan.mjs (14/14).
- [x] Corregir dos incidencias detectadas por CI: mapa público de acciones ADMIN incompleto y harness aislado que no inyectaba el clasificador puro; además se bloqueó la aceptación de destinos sin ledger durable.
- [x] CI 44784511516 SUCCESS: 223 suites, 2,766 pruebas aprobadas, 0 fallos. CortesImageOrganizerApplyPlan 14/14; CortesImageOrganizerExecutor 9/9; mapa de acciones 12/12. Health read-only 44784509991 SUCCESS; Pages 44784509701 SUCCESS.
- No se desplegó Apps Script ni se ejecutó Safe Apply real; no se movieron/renombraron archivos ni se modificaron Drive/Spreadsheet. Las pruebas del ejecutor usan adaptadores simulados.
- Estado: IMPLEMENTACIÓN LOCAL DEL EJECUTOR Y ROLLBACK COMPLETADA CON VALIDACIÓN DIFERIDA. Pendiente Beta: auditar Drive real, revisar el preview completo, comprobar el comportamiento efectivo de ACL heredadas y probar aplicación/rollback en entorno aislado autorizado. No ejecutar en Drive productivo.
- Siguiente paso local: revisar integración de UI/confirmación explícita y gestión/retención del ledger; mantener operaciones reales deshabilitadas hasta la aprobación del preview real.

### 2026-11-20 — Safe Apply: controles de aprobación y rollback en ADMIN UI
- [x] Añadir controles explícitos en index.html para aplicar la selección aprobada y revertir el último lote.
- [x] En JS/Frontend/ui.js, mostrar casillas únicamente para destinos ready; limitar selección a 1–10 archivos de una misma página del preview.
- [x] Solicitar confirmación interactiva del Desarrollador antes de enviar applyCortesImageOrganizer; el payload incluye auditId, offset, digest, IDs aprobados y confirm:true.
- [x] Integrar rollbackCortesImageOrganizer con confirmación independiente y solo los operationId devueltos por el último lote de la sesión UI.
- [x] Después de aplicar un lote, invalidar la aprobación local y exigir nueva auditoría/preview para preparar otro lote.
- [x] Añadir CortesImageOrganizerUiContract.mjs (10/10) e integrarlo en RunServiceTests.mjs.
- [x] CI 44785453638 SUCCESS: 224 suites, 2,776 pruebas aprobadas, 0 fallos; ApplyPlan 14/14, Executor 9/9 y UI 10/10. Health read-only 44785453971 SUCCESS.
- Dos ejecuciones intermedias fallaron únicamente por aserciones del nuevo test UI (patrón de confirmación y escape de regex); se corrigió el test y la repetición final aprobó.
- No se desplegó Apps Script ni se ejecutó una operación real de Drive/Spreadsheet. La UI y el backend están versionados, pero el uso real sigue condicionado a auditoría y preview Beta aprobados.
- Estado: IMPLEMENTACIÓN LOCAL DE CONTROLES UI COMPLETADA CON VALIDACIÓN DIFERIDA. Pendiente Beta: inspección visual, comprobar ACL heredadas efectivas y probar aplicación/rollback en Drive aislado autorizado.
- Pendiente local separado: definir consulta/retención de registros durables y recuperar lotes previos a la sesión UI; el botón actual revierte el último lote conservado en memoria de la sesión.

### 2026-11-20 — Safe Apply: consulta de historial y retención del ledger
- [x] Añadir getCortesImageOrganizerOperations, endpoint de solo lectura que filtra operaciones por el propietario de la sesión Desarrollador y devuelve páginas de hasta 50 registros sin exponer campos de sesión/credenciales.
- [x] Incorporar en la UI la consulta de operaciones anteriores; muestra estados, origen/destino y fecha. Solo las operaciones complete pueden seleccionarse para rollback; máximo 10 por lote.
- [x] El botón de rollback permite seleccionar operaciones del historial durable, no solo el último lote conservado en memoria.
- [x] Acotar el ledger: conserva hasta 200 operaciones terminales recientes, elimina terminales con más de 180 días y mantiene intactos processing/needs_review. El máximo total es 250; si no puede liberar capacidad sin eliminar operaciones no terminales, rechaza nuevas operaciones de forma segura.
- [x] Añadir CortesImageOrganizerLedger.mjs (6/6) para vencimiento, límite, saturación, aislamiento por owner, orden y paginación; UI contract actualizado a 13/13.
- [x] CI 44786209320 SUCCESS: 225 suites, 2,785 pruebas aprobadas, 0 fallos. ApplyPlan 14/14; Executor 9/9; UI 13/13; Ledger 6/6. Health read-only 44786209315 SUCCESS.
- Pages run 44786207568 seguía en ejecución al registrar esta adenda.
- Sin despliegue Apps Script ni operaciones reales Drive/Spreadsheet. El historial y la retención se probaron con propiedades simuladas; no se borraron registros de un proyecto Apps Script real.
- Estado: implementación local de historial/retención COMPLETADA CON VALIDACIÓN DIFERIDA. Pendiente Beta: comprobar cuota y rendimiento reales de ScriptProperties, ACL heredadas y aplicación/rollback en Drive aislado; inspección visual responsive de los nuevos controles.


## Requisitos nuevos del usuario — concurrencia de aportes y carrusel de vistos (2026-11-20)

### GP-CONCURRENCY-CUT-MULTI-ENTRY-01 — escrituras concurrentes y conflictos por vehículo/tipo
**Prioridad: P0 · EN PROGRESO · implementación local antes de Beta.**
- Permitir operaciones simultáneas e independientes sobre vehículos/modelos diferentes, aunque provengan de usuarios distintos y de distintos puntos de entrada. La idempotencia deduplica únicamente el mismo intento lógico (opId + huella); nunca debe serializar ni descartar aportes legítimos diferentes.
- Mantener interoperabilidad entre: botón «+» del modal de detalle para agregar corte/apertura/alimentación; edición in-modal de desarrollador para agregar/reemplazar imagen o actualizar datos; formulario HTML/add_cortes.html para registrar corte y vehículo; y Feedback/reporte de error para sugerir o aportar información.
- Para el mismo vehículo y mismo tipo/slot, permitir que ambas solicitudes lleguen a procesamiento. Detectar una colisión real al reservar/confirmar el mismo recurso, reportar qué registro cambió y preservar el aporte entrante; no sobrescribir silenciosamente ni rechazar todo el trabajo del vehículo.
- Si los tres slots de corte están ocupados y una colisión impide asociar el nuevo corte, conservar la imagen en la biblioteca «Imágenes reemplazadas» como candidata a corte adicional, con estado/relación de revisión y vehículo/categoría identificables. Aplicar criterio equivalente a apertura y alimentación. No eliminar ni dejar huérfano el archivo; no marcarlo como corte confirmado hasta revisión.
- Mantener los límites actuales de slots y el modelo de datos compatible. Separar la idempotencia de transporte del control de concurrencia de negocio; evitar locks globales prolongados, llamadas redundantes, cargas dobles y reintentos que dupliquen archivos o filas.
- Cubrir en pruebas aisladas: dos usuarios/dos vehículos simultáneos; mismo vehículo/slots diferentes; mismo vehículo/mismo slot; capacidad llena con preservación de candidato; reintento del mismo opId; mismo archivo/opId desde distintos puntos de entrada; y errores parciales Drive/Spreadsheet. Verificar también que formularios, reportes, reacciones, reacciones a feedback y otras escrituras no se degraden ni fallen silenciosamente.
- Revisar contratos y consumidores de ADMIN, WRITE y FEEDBACK antes de modificar. No cambiar RBAC ni requerir nuevas confirmaciones/autenticaciones por acción. No desplegar ni modificar datos productivos durante esta fase local.

### GP-UX-RECENT-VIEWED-CACHE-PARALLEL-01 — render temprano del carrusel Vistos Recientemente
**Prioridad: P1 · PENDIENTE DE IMPLEMENTACIÓN.**
- Diagnosticar por qué el carrusel de vistos aparece después de los demás aunque los datos estén en caché local.
- Hidratar viewedItems directamente desde IndexedDB/caché local en paralelo al resto de la hidratación local y al render de carruseles; no esperar historial de búsqueda, catálogo remoto ni otros carruseles.
- Evitar lecturas duplicadas de IndexedDB y re-renderizados completos; conservar aislamiento por usuario/sesión, estado previo ante fallos opcionales y actualización incremental del carrusel.
- Añadir pruebas de orden/tiempos de hidratación, sesión cambiada, IndexedDB lento/no disponible y no duplicación de lecturas.

### Hallazgos iniciales de auditoría (2026-11-20)
- JS/Services/admin.js::handleAddOrUpdateCut adquiere LockService.getScriptLock() con tryLock(0): cualquier otra escritura que mantenga ese lock puede hacer que una operación legítima de otro vehículo falle inmediatamente con ADMIN_BUSY. El trabajo Drive se libera parcialmente mediante runAdminDriveWorkOutsideScriptLock_, pero la reserva, la escritura de Sheets y otras fases siguen bajo el lock global.
- En vehículo existente, findNextAvailableCutSlot_ considera slots pendientes y devuelve null cuando los tres están ocupados; el handler lanza «No hay espacios disponibles para más cortes» y no se encontró en este flujo una conservación automática del aporte como candidato en Imágenes reemplazadas.
- loadUserLocalActivity inicia por separado la lectura de historial de búsqueda y vistos; el test RecentlyViewedCarousel.mjs confirma que no usa Promise.all. mostrarCategorias invoca renderRecentlyViewedCarousel al principio, pero si viewedItems aún no está hidratado, el carrusel no se crea hasta la actualización posterior del estado. Hay que revisar el ciclo de apertura IndexedDB y sus consumidores antes de cambiarlo.
- Los hallazgos son diagnóstico inicial; no implican que los otros puntos de entrada tengan el mismo defecto. Deben mapearse y probarse sus contratos antes de unificar comportamiento.


### Requisitos nuevos del usuario — concurrencia de aportes y carrusel Vistos recientemente (2026-11-20)
- [ ] **Concurrencia de aportes por vehículo y punto de entrada.** Permitir operaciones simultáneas e independientes para distintos vehículos, aunque provengan de usuarios o puntos de carga diferentes. Deben mantenerse funcionales: botón + del modal de detalle para añadir corte/apertura/alimentación a un modelo existente; edición in-modal por Desarrollador para agregar/reemplazar imagen, modelo, apertura o alimentación; formulario HTML/add_cortes.html para registrar corte o vehículo nuevo; y envío desde FEEDBACK/reporte de error.
- [ ] **Conflictos limitados al mismo modelo.** La idempotencia debe evitar duplicar el mismo intento/reintento, no serializar ni bloquear aportes de vehículos distintos. Cuando dos usuarios modifiquen el mismo modelo, detectar/reportar el conflicto de forma localizada sin rechazar automáticamente toda la operación. Si se alcanza el límite de cortes durante la disputa, conservar la imagen no incorporada en Imágenes reemplazadas y clasificarla como candidata a corte adicional; aplicar el mismo criterio a apertura y alimentación. No perder silenciosamente cargas ni cambiar permisos/validaciones de formularios.
- [ ] **Anti-regresión de aportes.** Probar operaciones paralelas de diferentes vehículos desde cada punto de entrada, mismo vehículo con cambios distintos, reintentos del mismo payload, reemplazos y límites; preservar reportes, reacciones, formularios, atribución de colaborador/fecha y limpieza/compensación de archivos. Evitar llamadas de red, escrituras o lecturas duplicadas.
- [ ] **Carrusel Vistos recientemente.** Investigar por qué se renderiza después de los demás carruseles. Cargarlo en paralelo desde la caché local disponible (IndexedDB/cache), sin esperar lecturas remotas ni bloquear carruseles independientes; conservar aislamiento por usuario, orden y estados vacíos/offline, sin consultas duplicadas.
- Estado: **PENDIENTE**. Registrado por solicitud expresa; no implementado ni validado en esta iteración. Respetar NORMAS_DESAROLLO.md §15: simplicidad y baja latencia; no introducir locks globales, leases ni validaciones de red por acción.


### 2026-11-20 — Safe Apply: reserva atómica de operaciones y rollback
- [x] Añadir decisión de reserva por operación con comprobación de identidad, propietario y estado permitido; la lectura y escritura de la reserva se ejecutan dentro de una única sección crítica breve del ledger.
- [x] Aplicación: solo una solicitud puede pasar de ausencia de registro a `processing`; solicitudes competidoras reciben `in_progress`/conflicto y no mueven el archivo.
- [x] Rollback: solo una solicitud puede reservar la transición desde `complete` a `rollback_processing`; las solicitudes competidoras no ejecutan un segundo movimiento.
- [x] La lectura de un registro individual ya no adquiere ScriptLock. El lock del ledger se limita a las transiciones de propiedades, con espera máxima de 250 ms; ninguna operación Drive se ejecuta dentro de ese lock.
- [x] La contención antes de reservar devuelve un resultado retryable sin escribir un estado falso `rolled_back`. Si la contención ocurre al persistir el estado final después de un movimiento Drive, se inspecciona Drive y se reconcilia el ledger sin repetir el movimiento.
- [x] Executor focalizado: 17/17 PASS; ApplyPlan 14/14; UI contract 13/13; Ledger 6/6.
- [ ] Regresión integral: CI 44791334640 falló en dos contratos ajenos al organizador Safe Apply y relacionados con la nueva tarea de concurrencia de aportes: `AdminVehicleIdOutsideLock` (el test exige tryLock(0), el handler actual usa waitLock(2000)) y `AdminSupplementaryUploadOutsideLock` (el test exige ausencia de espera, pero el handler actual usa waitLock(2000)). No se alteraron esos flujos para ocultar el hallazgo; quedan incluidos en la tarea de concurrencia registrada arriba.
- Health read-only 44791334834 SUCCESS. Pages 44791334550 pendiente al último chequeo.
- Estado de esta subactividad: **IMPLEMENTACIÓN LOCAL COMPLETADA CON VALIDACIÓN DIFERIDA**; pendiente estabilizar la regresión integral y ejecutar verificación Beta de Drive/ACL/ScriptProperties. No se ejecutaron operaciones reales ni se desplegó Apps Script.


### 2026-11-20 — Concurrencia de aportes y carrusel: primera corrección
- [x] **Vistos recientemente:** `handleLoginSuccess` inicia `loadUserLocalActivity(user)` antes de `showApp(user)`. Las lecturas locales de historial de búsqueda y vistos comienzan sin `await`, por lo que se ejecutan en paralelo con la carga/renderizado del catálogo. No se añadió ninguna llamada de red.
- [x] Prueba `RecentlyViewedCarousel` 1/1 PASS; el contrato comprueba que la hidratación local empieza antes de `showApp`.
- [x] **Apertura/alimentación desde el modal de detalle:** cada modal crea un `opId` estable durante su vida y lo transmite en `addSupplementaryInfo`; los reintentos del mismo modal reutilizan el identificador.
- [x] **Formulario add_cortes.html:** el envío de información suplementaria reutiliza `state.opId`, evitando que la imagen de apertura/alimentación use la clave heredada `legacy`.
- [x] Contrato `SupplementaryImageOperationIdContract`: 8/8 PASS.
- [x] Regresión integral CI 44793849152 SUCCESS: 227 suites, 2,802 pruebas aprobadas, 0 fallos. Health read-only 44793849459 SUCCESS. Pages 44793848811 en ejecución al registrar.
- Auditoría de concurrencia:
  - Las reservas de slots de corte filtran las operaciones `pending` por `vehicleId`; las claves de imagen incorporan `opId + vehicleId + field`. La idempotencia no es un bloqueo global entre vehículos.
  - `getWriteContributionLock_` usa UserLock para vehículos existentes; UserLock es por usuario, no por vehículo. No protege a dos usuarios distintos que reserven simultáneamente el mismo modelo. La escritura del ledger Idempotencia debe revalidarse/protegerse para esa colisión.
  - En vehículo nuevo, la asignación central de ID usa ScriptLock inmediato y reserva idempotente por `opId`; la contención devuelve WRITE_BUSY. Debe conservarse el reintento del mismo `opId` sin duplicar el alta.
  - Si los tres slots de corte están ocupados, `handleAddOrUpdateCutLockedUnsafe_` todavía lanza «No hay espacios disponibles»; no guarda la imagen como candidata.
  - `buildSupplementaryInfoPlan_` rechaza apertura ocupada o tres alimentaciones ocupadas; no conserva la imagen en conflicto como candidata.
  - FEEDBACK conserva reportes y sugerencias por separado; el flujo de sugerencia actual modifica cortes existentes y aún falta diseñar/validar la vía explícita para convertir un reporte en un nuevo corte o vehículo.
- [ ] Pendiente principal de esta tarea: reserva/revalidación segura del mismo vehículo entre usuarios; candidatos de corte/apertura/alimentación en «Imagenes_Reemplazadas» con estado de revisión; alta concurrente de modelos duplicados; integración de alta desde Feedback; pruebas paralelas y anti-regresión de formularios/reportes/reacciones.
- Estado: carrusel local y claves de operación suplementaria **IMPLEMENTADOS**; concurrencia por vehículo y conservación de candidatos **PENDIENTES**.


### 2026-11-20 — Continuidad de GP-CONCURRENCY-CUT-MULTI-ENTRY-01 tras regresión

- [x] Confirmar CI del HEAD `0448f80f0d515be3517dffdb7f25b070591fba8e`: run `44794586367` SUCCESS; 227 suites, 2,802 pruebas aprobadas, 0 fallos; sintaxis PASS.
- [x] Confirmar en router ADMIN que `addOrUpdateCut`, `addSupplementaryInfo` y `checkOperation` se trasladaron a WRITE y no deben corregirse duplicadamente en ADMIN.
- [x] Revisar rutas reales WRITE para cortes y datos suplementarios.
- [ ] Corregir la carrera entre usuarios distintos sobre el mismo vehículo: UserLock es por usuario y no ofrece exclusión por vehículo; la reserva pending actual no es atómica entre identidades.
- [ ] Corregir persistencia suplementaria: evitar escribir/revertir el rango completo 33–42; preservar aportes simultáneos en campos diferentes y registrar los conflictos sobre el mismo campo sin sobrescritura silenciosa.
- [ ] Conservar como candidatos revisables los archivos de corte/apertura/alimentación que no puedan asociarse por colisión o capacidad llena; enlazarlos al vehículo y al estado de revisión en «Imágenes reemplazadas».
- [ ] Resolver la idempotencia concurrente del mismo opId entre puntos de entrada y probar errores parciales Drive/Spreadsheet.
- **Hallazgo técnico:** `handleAddSupplementaryInfo` prepara y sube imágenes antes de adquirir UserLock; luego recalcula el plan. Una colisión puede dejar el archivo subido sin vínculo ni registro de candidato. `persistSupplementaryInfoValues_` hace `setValues` de diez columnas y su rollback puede restaurar una instantánea obsoleta sobre cambios de otro usuario.
- **Restricción de diseño:** respetar §15 de `NORMAS_DESAROLLO.md`; no reintroducir ScriptLock global ni esperas para serializar acciones ordinarias. Diseñar primero una reserva append-only durable con asignación determinista, pruebas de intercalado y preservación de candidatos.
- Estado de P0: **EN PROGRESO**. La regresión actual no demuestra concurrencia real entre dos usuarios y no cubre las colisiones/capacidad llena. No desplegar ni modificar datos productivos.


### 2026-11-20 — Diseño de persistencia concurrente

- [x] Crear `CONCURRENCIA_APORTES_DISENO.md` con dirección de arquitectura, restricciones, fases y matriz mínima de aceptación. Commit: `32db0be9996a20cf8b86f81ecf789fd9d9baed24`.
- [ ] Implementar y probar registro append-only versionado y proyección de aportes. El documento es diseño, no implementación; P0 continúa abierta.
- **Aclaración tras inspección del flujo completo:** aunque Coordinator declara políticas con recurso `CORTES` para las acciones WRITE, los handlers efectivos `addOrUpdateCut` y `addSupplementaryInfo` no llaman `withSharedMutationLease_` para toda la mutación. En WRITE solo se localizó una lease separada `ensureSupplementaryVehicleFolder` para preparar la carpeta Drive. No considerar la política declarativa como un lock global actualmente adquirido por estos handlers.
- El registro append-only debe ser la fuente de verdad para aportes nuevos y la proyección de lectura debe preservar el contrato de catálogo. Antes de implementarlo, verificar append concurrente, duplicados físicos de un mismo `opId`, deduplicación lógica y recuperación de cargas Drive sin marcar archivos huérfanos como vinculados.


- [x] Auditar el contrato real de apertura/alimentación en UI y WRITE: ambos envían `opId`, pero WRITE no calcula hash ni registra esas operaciones en un ledger. Un timeout después de persistir no puede recuperarse idempotentemente y el reintento puede recibir un conflicto falso. Documentado en `CONCURRENCIA_APORTES_DISENO.md`, commit `34b17b80e8a3660d659231ff88fa67d70e810cf6`.
- [ ] Incluir en el ledger append-only idempotencia unificada para cortes, apertura y alimentación; mismo `opId` + mismo hash recupera el resultado y mismo `opId` + hash distinto se rechaza.


- [x] Mapear compatibilidad de la proyección con CATALOG/modal: la ficha consume los tres slots fijos y la sincronización post-escritura fuerza `getCatalogData({forceRefresh:true})`.
- [x] Identificar contrato de edición in-modal ADMIN: `updateVehicleField` escribe texto/modelo en Cortes con valor esperado; `uploadAdminImage` usa ledger compensatorio propio. Si el valor proviene de un evento nuevo, la edición debe referenciar eventId/versión y generar sustitución auditable. Documentado en `CONCURRENCIA_APORTES_DISENO.md`, commit `20b78390c9a056299319e0a29866d2ec12abd143`.
- [ ] Implementar metadatos de origen por campo en la proyección y adaptar edición in-modal para sustituir eventos sin duplicarlos.


### 2026-11-20 — Persistencia suplementaria por campo

- [x] En WRITE, reemplazar la escritura/reversión del rango completo de diez columnas por escrituras verificadas únicamente en las celdas modificadas. Evita que un rollback con datos antiguos borre campos escritos por otra solicitud.
- [x] Añadir prueba de intercalado de dos operaciones en columnas diferentes; ambos valores deben conservarse.
- [x] Añadir prueba de fallo parcial sin rollback amplio.
- [ ] Confirmar Actions del commit `3e10e9bbd742e3bc5a815f113f464b799f5034e4`.
- [ ] Resolver colisiones concurrentes en el mismo campo/slot y registrar aportes no materializados como candidatos recuperables.
- [ ] Completar idempotencia durable de `addSupplementaryInfo` con `opId` (reintento idéntico devuelve resultado previo; contenido distinto con mismo ID se rechaza).
- [ ] Corregir asignación de slots de cortes para que dos opId distintos no seleccionen ni sobrescriban el mismo slot; conservar el contenido entrante si la capacidad está llena.
- **Aclaración normativa:** no añadir leases ni locks de Coordinator para las operaciones ordinarias WRITE. §15 prohíbe leases, locks globales, esperas y serialización de acciones independientes. La política WRITE de Coordinator existe en el mapa, pero el `doPost` actual no la invoca para estas acciones.
- Estado de `GP-CONCURRENCY-CUT-MULTI-ENTRY-01`: EN PROGRESO / P0.


### 2026-11-20 — Retirada del UserLock suplementario y regresión

- [x] Retirar `UserLock` de `handleAddSupplementaryInfo`; §15 no permite locks/leases ordinarios y ese lock por usuario no coordinaba identidades diferentes.
- [x] Mantener las cargas Drive antes de la persistencia y sin lock retenido.
- [x] Actualizar contratos de pruebas que exigían el lock anterior.
- [x] CI HEAD `65abc19939d2f55b00edc8b9fb4735f62f6a65ab`: 228 suites, 2,817 pruebas, 0 fallos; health read-only SUCCESS.
- [ ] Resolver mismo slot/campo con registro durable append-only y recuperación/candidato; la escritura por celda solo protege aportes que afectan celdas diferentes.
- [ ] Resolver idempotencia completa de aportes suplementarios por `opId` y vincular archivos Drive que no se puedan materializar a un candidato revisable.
- [ ] Revisar y rediseñar el bloqueo `UserLock` restante de cortes existentes y la reserva global de IDs de vehículos conforme a §15, sin perder unicidad ni permitir sobrescrituras.
- Estado P0: EN PROGRESO.


### 2026-11-20 — Verificación de entradas de UI y edición

- [x] Confirmar `openAddCutForModelModal` para agregar corte a vehículo existente.
- [x] Confirmar `openAddAperturaModal` y `openAddFeedModal`; ambos generan opId en el cliente y envían `vehicleId` al servicio WRITE.
- [x] Confirmar rutas de edición del Desarrollador mediante `updateVehicleField` y `uploadAdminImage`.
- [ ] Probar en integración la edición/reemplazo de imágenes de corte, vehículo y alimentación, y apertura desde la edición in-modal; la inspección estática no sustituye prueba funcional.
- [ ] Resolver los conflictos y la idempotencia descritos en la sección anterior antes de cerrar P0.


### 2026-11-20 — Integración de corte existente en AportesVehiculo

- [x] Confirmar que CATALOG proyecta los eventos append-only de corte/apertura/alimentación sobre la ficha de tres cortes, apertura y alimentaciones; los aportes que no caben quedan como candidatos visibles.
- [x] Conectar el alta de corte de vehículo existente con `opId` (sin VIN ni `vehicleData`) a `handleAppendExistingVehicleCut_` antes de adquirir cualquier lock de compatibilidad.
- [x] Derivar en WRITE la huella SHA-256 cuando el modal de detalle envía `opId` sin `operationHash`; mantener verificación estricta cuando el cliente sí proporciona huella.
- [x] Exigir igualdad de payload JSON para reintentos del mismo `opId`, además de vehículo/tipo/hash.
- [x] Devolver slot proyectado, timestamp y estado de candidato; el evento excedente permanece en el ledger y CATALOG lo expone para revisión.
- [x] Corregir validación regex de `vehicleId` y cubrir IDs válidos/no válidos.
- [x] Retirar la lease Coordinator obsoleta `ensureSupplementaryVehicleFolder` y ajustar runner/pruebas para la política sin lease.
- [x] CI HEAD `2783379c114fdb6ef658ea4e4d7c1cbeb890ab28`: 228 suites, 2,830 pruebas, 0 fallos; health read-only SUCCESS.
- [ ] Extender ruta append-only de cortes existentes a casos con VIN y a aportes que completen metadatos `vehicleData`, sin permitir duplicidad global de VIN ni pérdida de campos.
- [ ] Crear harness de intercalado de `appendRow`: dos vehículos diferentes, mismo vehículo/slots diferentes, mismo `opId`/mismo hash y mismo `opId`/payload distinto; verificar deduplicación lógica y candidatos.
- [ ] Reemplazar la sección de estado mutable de `ImageUploadLedger` por un registro append-only/reconciliable sin `ScriptLock` global ni esperas; conservar reintento estable y archivos no asociados como candidatos.
- [ ] Eliminar gradualmente el `UserLock` del handler legacy de cortes existentes y mantener el `ScriptLock` solo para asignación de ID de vehículo nuevo, si la operación realmente requiere secuencia única.
- [ ] Implementar metadatos de origen/versionado por campo para que la edición in-modal de Desarrollador pueda sustituir un aporte del ledger sin duplicarlo ni resucitar su valor anterior.
- Estado P0: EN PROGRESO. No declarar cierre hasta pasar intercalados y recuperación de imágenes.


### 2026-11-20 — Intercalado del ledger append-only

- [x] Añadir harness aislado que intercale dos ejecuciones en `appendRow` sin locks.
- [x] Verificar aportes a vehículos distintos: ambos se conservan y se proyectan en su ficha.
- [x] Verificar dos cortes del mismo vehículo con `opId` distintos: el orden append asigna slots distintos de forma determinista.
- [x] Verificar mismo `opId`/mismo payload: se conserva el duplicado físico, pero ambas solicitudes resuelven al evento canónico y CATALOG proyecta una sola vez.
- [x] Verificar mismo `opId`/payload distinto: se rechaza la confirmación conflictiva; ambos eventos se conservan y la proyección no aplica ninguno.
- [x] Comparar payload JSON en la deduplicación y en la proyección, incluso si una solicitud reutiliza incorrectamente el mismo hash.
- [x] CI HEAD `523bbb0a28e1e9b9dc48db483b29019bfb0b0232`: 229 suites, 2,834 pruebas, 0 fallos; health read-only SUCCESS.
- [ ] Migrar ImageUploadLedger a eventos append-only/reconciliables y eliminar `ScriptLock.waitLock(5000)` sin perder integridad, deduplicación ni recuperación.
- [ ] Ampliar la ruta de corte append-only a VIN y casos `vehicleData`; garantizar validación/duplicidad VIN global sin lock global.
- [ ] Integrar recuperación inmediata de aportes del ledger en `checkOperation`, para que una respuesta perdida no fuerce una carga Drive redundante.
- [ ] Revisar el estado de la primera respuesta cuando un `opId` conflictivo se anexa después: conservar ambos candidatos y dar señal UI de reconciliación, sin exclusión mutua global.
- Estado P0: EN PROGRESO.


### 2026-11-20 — Recuperación por opId y señalización de candidatos

- [x] Extender checkOperation para consultar AportesVehiculo cuando no existe fila en Idempotencia.
- [x] Verificar que las filas repetidas del mismo opId coincidan en vehículo, tipo, huella y payload; devolver evento canónico o conflicto explícito.
- [x] Recuperar el estado de corte, apertura y alimentación con su huella/vehicleId; calcular candidato según slots heredados y eventos anteriores.
- [x] Mostrar en UI mensajes distintos para aporte aplicado y aporte conservado como candidato, tanto en envío normal como recuperación.
- [x] Añadir pruebas WriteContributionRecovery (7/7) y ampliar intercalado/capacidad (6/6).
- [x] CI HEAD `4f54e1ca71a21857a3e23e5d7d1a98ff3a77fe51`: 230 suites, 2,843 pruebas, 0 fallos; health read-only SUCCESS.
- [x] Actualizar CONCURRENCIA_APORTES_DISENO.md con implementación parcial y límites.
- [ ] Verificar garantías reales de appendRow bajo dos ejecuciones Apps Script simultáneas; el harness actual simula append indivisible.
- [ ] Migrar ImageUploadLedger mutable y retirar ScriptLock.waitLock(5000), incluyendo compatibilidad con el reconciliador ADMIN y conservación de archivos sin referencia.
- [ ] Ampliar append-only de cortes existentes a VIN/vehicleData y migrar fallback legacy sin pérdida de unicidad VIN.
- [ ] Reconciliar en UI la primera respuesta si un mismo opId entra en conflicto después de que esa respuesta ya fue enviada.
- [ ] Migrar edición in-modal del Desarrollador a eventos de sustitución/versionado por campo.
- Estado P0: EN PROGRESO.


### 2026-11-20 — Diario append-only para cargas de imágenes (infraestructura inicial)

- [x] Auditar duplicación de `ImageUploadLedger` entre WRITE y ADMIN y localizar `ScriptLock.waitLock(5000)` en el flujo WRITE.
- [x] Crear esquema aislado `ImageUploadEvents` para transiciones append-only, con `eventId`, token, operación, huella, archivo, estado y referencias.
- [x] Añadir append con confirmación por lectura y proyección determinista por token.
- [x] Detectar metadatos incompatibles o más de un `fileId` para el mismo token y proyectar `requires_review`, sin seleccionar arbitrariamente.
- [x] Añadir seis pruebas de contrato/intercalado y registrarlas en el runner.
- [x] CI HEAD `bbf35e4f7a752519c94b924c4a211642661c39eb`: 231 suites, 2,849 pruebas, 0 fallos; health read-only SUCCESS.
- [ ] Integrar diario append-only en el flujo de carga WRITE y usarlo como fuente de verdad de reservas/estados.
- [ ] Resolver la carrera de dos cargas simultáneas con el mismo token: aceptar duplicados físicos como candidatos/revisión, no asumir que appendRow es una restricción única ni que Drive.createFile es idempotente.
- [ ] Adaptar `markImageUploadLinked` y `handleReconcilePendingImageUploads` para leer/proyectar eventos y reconstruir estados sin mutar el journal.
- [ ] Mantener compatibilidad de lectura con las filas históricas de `ImageUploadLedger`; no migrar ni borrar datos históricos automáticamente.
- [ ] Retirar `ScriptLock.waitLock(5000)` únicamente cuando WRITE, ADMIN y recuperación de archivos huérfanos utilicen el diario y pasen pruebas de intercalado.
- Estado P0: EN PROGRESO. El journal nuevo todavía no está conectado al flujo productivo de carga.

### 2026-11-20 — Conexión inicial de ImageUploadEvents al flujo WRITE

- [x] Añadir adaptador de transición para anexar eventos reserved, pending y linked al diario ImageUploadEvents durante cargas WRITE.
- [x] Mantener ImageUploadLedger como fuente compatible actual para ADMIN; el journal nuevo es secundario en esta fase y sus fallos no revierten cargas válidas.
- [x] Ampliar ImageUploadEventJournal.mjs para probar el adaptador y la proyección de las transiciones.
- [x] CI HEAD cb496602f788c3fe4665cb0a193213a6803d52ab: 231 suites, 2,850 pruebas aprobadas, 0 fallos.
- [x] Health read-only del mismo HEAD: SUCCESS.
- [ ] Migrar la reconciliación ADMIN a lectura/proyección del journal, preservando compatibilidad con filas históricas de ImageUploadLedger.
- [ ] Hacer que WRITE y ADMIN utilicen el journal como fuente de verdad; conservar cargas huérfanas como candidatas revisables.
- [ ] Probar dos cargas simultáneas con mismo token y mismo/diferente fileId, errores parciales Drive/Sheets y recuperación después de respuesta perdida.
- [ ] Retirar ScriptLock.waitLock(5000) solo después de completar la migración dual y aprobar regresión.
- Estado: P0 EN PROGRESO. No se retiró ningún lock ni se desplegó Apps Script. La integración actual es una transición incremental, no el cierre de la migración.
### 2026-11-20 — Reconciliación ADMIN de ImageUploadEvents

- [x] ADMIN valida el esquema y lee el journal append-only sin crear ni modificar la hoja durante la lectura.
- [x] Proyecta por token los eventos, detecta metadatos incompatibles y varios fileId sin elegir un ganador.
- [x] El reconciliador incluye tokens presentes solo en ImageUploadEvents; conserva compatibilidad con ImageUploadLedger y evita duplicar en el informe los tokens ya cubiertos por el ledger, salvo conflictos.
- [x] En confirmación, registra las transiciones de reconciliación mediante append; no muta ni elimina filas del journal.
- [x] ADMIN markImageUploadLinked también anexa linked cuando la hoja de eventos ya existe.
- [x] Prueba AdminImageUploadEventReconciliation: 4/4 PASS.
- [x] CI HEAD 998f267f50cc29442a609ff8be2a88b3fce0c1d7: 232 suites, 2,854 pruebas aprobadas, 0 fallos.
- [x] Health read-only del mismo HEAD: SUCCESS.
- [ ] Migrar WRITE para que el journal sea la fuente primaria de reserva/estado y mantener ImageUploadLedger solo como compatibilidad histórica/lectura.
- [ ] Validar recuperación y cargas duplicadas con errores parciales Drive/Sheets; retirar waitLock(5000) solo después de pasar esa cobertura.
- Estado P0: EN PROGRESO. No se ha desplegado Apps Script ni se han modificado datos productivos.