# GPSpedia — Tareas activas
Fecha de actualización: 2026-11-19
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5 (no modificar)
Normativa: NORMAS_DESAROLLO.md

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
- Mantener SharedMutationClient como transporte versionado y estable. Coordinator conserva la autoridad sobre permisos, leases, sesiones, telemetría y orquestación remota.
- **Capacidades innegociables:** salud de todos los servicios; restricciones/cambios de acceso; revocación individual y global; invalidación remota de caché en WRITE y FEEDBACK; cierre/eliminación remota de cuentas con recuperación/compensación. Deny-by-default, RBAC, actor confiable, leases, idempotencia, auditoría y rollback permanecen.
- Auditoría y diseño: `Services/SERVICE_ARCHITECTURE_PLAN.md`.
- [x] Protocolo POST v1 estable e independiente de la versión interna: SharedMutationClient envía `protocolVersion: 1`; Coordinator interpreta la ausencia del campo como v1 fijo, mantiene una lista explícita de versiones admitidas y rechaza versiones desconocidas antes de ejecutar acciones. Una futura versión debe convivir con v1; los cambios internos no deben exigir actualizar consumidores.
- [x] Invalidación remota centralizada: AUTH solicita a Coordinator; Coordinator contacta WRITE/FEEDBACK con sus secretos individuales y URLs centralizadas. Prevalida configuración, subdivide lotes, exige confirmación exacta y admite reintentos idempotentes. Se conserva el orden invalidación→revocación; si hay fallo parcial, AUTH no avanza a revocar.
- [x] Telemetría centralizada: Coordinator consulta en paralelo CATALOG/AUTH/USERS/WRITE/FEEDBACK y agrega sus contadores a los siete servicios; ADMIN consume un solo resultado global. Las fuentes parciales no anulan el agregado y los buckets corruptos/duplicados se ignoran con cobertura parcial.
- [x] Simplificación inicial de secretos: AUTH/USERS/WRITE/FEEDBACK y CATALOG aceptan `GPSpedia_COORDINATOR_SECRET` para telemetría directa, con fallback a la propiedad antigua solo cuando el secreto nuevo no existe. ADMIN mantiene su consulta directa solo como compatibilidad temporal con Coordinator anterior a 1.4.5.
- Catálogo canónico documentado en `Services/COORDINATOR_SETUP.md`: cada consumidor usa `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET`; Coordinator mantiene valores criptográficos independientes por servicio y URLs centralizadas. CATALOG tiene secreto limitado a telemetría de solo lectura. No se comparten secretos entre servicios.
- Configuración pendiente por entorno Beta: crear/verificar `GPSpedia_SERVICE_URL_CATALOG/AUTH/USERS/WRITE/FEEDBACK` y `GPSpedia_COORDINATOR_SECRET_CATALOG` en Coordinator; configurar la misma credencial CATALOG en su proyecto local. Retirar propiedades legacy de tráfico solo después de verificar todos los deployments. No se leyeron ni modificaron ScriptProperties ni secretos.
- Pruebas aisladas: SharedMutationCoordinator 77/77 PASS; ServiceBrowserTrafficContract 9/9; ServiceTrafficAggregatorContract PASS; ServiceTrafficAggregation 6/6; ServiceTrafficAdminContract 33/33 PASS tras el cambio central; InboxConversations 66/66. No se ejecutaron llamadas remotas reales ni CI integral.
- Política de despliegue documentada en Services/SERVICE_ARCHITECTURE_PLAN.md y Services/COORDINATOR_SETUP.md: cambios internos compatibles requieren solo Coordinator; cambios aditivos afectan únicamente consumidores que invoquen la nueva operación; el cliente legacy v1 se mantiene.
- Validación del protocolo: SharedMutationCoordinator 77/77 PASS tras fijar la compatibilidad legacy en v1 y comprobar clientes explícitos v1, legacy sin campo y rechazo de versiones inválidas.
- Nueva prueba registrada en RunServiceTests.mjs: CoordinatorCapabilityPreservation 6/6 PASS. Verifica RBAC jerárquico, restricciones al último Desarrollador, orden de invalidación remota antes de cierre/revocación, desactivación segura y recuperación reintentable, y confirmación de WRITE/FEEDBACK.
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
- [x] BETA-ADMIN-CUT-IMAGE-ORGANIZER-DRY-RUN-01 — constructor puro, endpoint preview y UI paginada de solo lectura implementados localmente; pendiente validar datos reales en la futura etapa Beta.
- [x] BETA-ADMIN-SERVICE-TELEMETRY-02 — inventario de siete servicios, detalle por servicio, agregado global, gráfica local de navegador y cobertura móvil implementados localmente; regresión integral pendiente.
- [x] CI: 146 suites, 2,157 pruebas aprobadas, 0 fallos; health y Pages SUCCESS en HEAD d81894f53e6036a1b3d0e0e86b317ad913ec42ee.

## Pendientes — prioridad inmediata

### P0 — SERVICE-ARCHITECTURE-SIMPLIFICATION-01
- Desacoplar la implementación central de Coordinator de los clientes Apps Script; estabilizar/versionar el contrato para que cambios internos no requieran redeploy de todos los consumidores.
- Reducir la necesidad de sincronizar copias de SharedMutationClient sin introducir dependencias de bibliotecas/versiones que sigan exigiendo desplegar cada consumidor.
- Consolidar URLs y secretos con nombres/configuración uniformes, manteniendo secretos fuera del repositorio y aislamiento entre servicios.
- Conservar y probar: salud de todos los servicios; restricciones de cuentas; revocación remota de sesiones; limpieza remota de caché por usuario; cierre/eliminación remota de cuentas. No retirar permisos, RBAC, auditoría ni rollback.

### P1 — INBOX-AUTHORIZATION-AND-ISOLATION-01
- Corregir «servicio no autorizado» en las consultas Inbox sin ampliar privilegios.
- Auditar interferencias de locks/leases entre auditoría de imágenes e Inbox.
- Corregir el fragmento HTML en la bandeja para mostrar texto legible y mantener renderizado seguro al abrir el mensaje.

### P1 — ADMIN-FEEDBACK-AND-RESPONSIVE-01
- Corregir los mensajes de borrado de logs (borrado efectivo, sin registros y error).
- Compactar retención de logs (7 días / eliminar todos) sin overflow.
- Corregir el padding del contenedor de imagen del modal sin mover logo, nombre ni acciones ya aceptados.


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
