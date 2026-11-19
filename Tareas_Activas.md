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

### P0 — GP-PERF-ADMIN-CUT-LOCK-01 — EN PROGRESO
- [x] Confirmado que `handleAddOrUpdateCut` mantiene `ScriptLock` durante la llamada ADMIN→WRITE de asignación de ID y durante operaciones de carpetas/carga Drive; la recuperación por opId también puede realizar I/O de Drive bajo el lock.
- [x] Reserva atómica de operación/vehículo/slot para el flujo con `opId`: ledger `pending` reserva el slot antes de liberar el lock. La reserva idempotente del ID central para altas nuevas sigue pendiente.
- [x] Mover las operaciones de carpetas/carga/reparación Drive fuera del lock para operaciones con `opId`; la llamada ADMIN→WRITE de asignación de ID continúa pendiente.
- [x] Re-adquirir con `tryLock(0)` y revalidar reserva, fila, slot, opId y operationHash antes de aplicar las URLs; el `finally` solo libera el lock si sigue en posesión de la ejecución.
- [ ] Preservar ledger de imágenes, recuperación de respuesta perdida, idempotencia, verificación de escritura y compensación/revisión ante fallos.
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
- [ ] Aplicar como criterio transversal el aislamiento entre operaciones independientes, no solo reducir duración de `handleAddOrUpdateCut`.
- [ ] Mapear los límites reales de proyecto/deployment: `ScriptLock` es global por proyecto Apps Script y puede bloquear otras funciones aunque estén en archivos separados.
- [ ] Inventariar para cada lock el recurso/estado exacto que protege; separar auditoría/telemetría, Inbox, health, autenticación y registro de cortes cuando no comparten recurso.
- [ ] Añadir pruebas de no interferencia entre auditoría lenta, Inbox, health, login y registro de cortes; añadir también pruebas de conflicto sobre el mismo recurso.
- [ ] No considerar aceptable una arquitectura que evita corrupción pero serializa funciones no relacionadas.

## Avance de implementación — GP-PERF-ADMIN-CUT-LOCK-01 (2026-11-19)
- [x] Primer ajuste de reserva: `findNextAvailableCutSlot_` ahora excluye los slots del mismo vehículo que ya estén registrados como `pending` en Idempotencia. Esto permite reservar el destino antes de liberar el lock para Drive.
- [ ] Ejecutar la prueba local `AdminCutSlotReservation.mjs` y CI; no marcar el subpaso como validado hasta comprobar resultados.
- [ ] Continuar con la separación del flujo en reserva breve, WRITE/Drive fuera del lock y revalidación/persistencia breve. El handler aún conserva el lock global durante el resto del proceso; esta modificación por sí sola NO cierra la tarea.
- [ ] Añadir recuperación segura y pruebas de no interferencia entre auditoría, Inbox, health, login y registro de cortes. No se ha confirmado el mapa de proyectos Apps Script desplegados; el repositorio no contiene manifiestos `.clasp.json` ni `appsscript.json` que permitan asociar cada fuente a un Script ID.

### Avance adicional — asignador central de IDs WRITE (2026-11-19)
- [x] Sustituir la espera de hasta 30 segundos en `handleAllocateVehicleId` por adquisición inmediata `tryLock(0)`. Si WRITE está ocupado, responde con `WRITE_BUSY` para permitir reintento, sin quedar esperando y reteniendo la ejecución.
- [ ] Ejecutar prueba determinista y CI antes de marcar validado.
- [ ] Reducir la sección crítica del asignador: actualmente verifica IDs existentes en la hoja completa; evaluar contador + reconciliación segura sin perder detección de duplicados o IDs manuales.
- [ ] Resolver publicación del catálogo: `publishCortesCatalogChange_` mantiene ScriptLock durante la llamada a Coordinator; separar snapshot/orden de publicación sin permitir eventos obsoletos.

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
- [ ] CI y revisión integral pendientes. La asignación de ID ADMIN→WRITE aún permanece bajo lock y será el siguiente subpaso.

- Revisión del helper ADMIN: el `finally` exterior libera el ScriptLock solo si la ejecución lo conserva. Esto evita que un fallo de `tryLock(0)` al volver de Drive sea ocultado por un `releaseLock()` sin propiedad.

### ADMIN — asignación central de ID fuera del ScriptLock (2026-11-19)
- [x] Mover la petición ADMIN→WRITE de asignación de ID antes de adquirir el ScriptLock ADMIN; WRITE conserva su propia exclusión sobre el contador.
- [x] Cambiar la adquisición ADMIN de espera de 30 s a `tryLock(0)` con error `ADMIN_BUSY` para no mantener solicitudes independientes en cola dentro del servicio.
- [x] Añadir `AdminVehicleIdOutsideLock.mjs` al runner.
- [ ] CI y revisión de compatibilidad de reintentos pendientes. La asignación puede dejar IDs sin usar si una solicitud se reintenta o falla antes de persistir; los IDs no se reutilizan, por diseño.

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
