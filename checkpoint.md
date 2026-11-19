undefined

### Continuidad — GP-DEV-CUT-AUDIT-TOOLBAR-01 — 2026-11-17
- HEAD inicial de esta tarea: 4a95b7568a6c3c38da441c9750ae5c904d285567; rama de trabajo GPSpedia2.2.5_work; base GPSpedia2.2.5 sin cambios.
- Auditoría: el modal #audit-drive-modal tenía cinco acciones en un contenedor flex genérico. Los estados y handlers dependen de los IDs; se preservan sin modificar la lógica de ADMIN, Drive, permisos o confirmaciones.
- Implementación preparada: toolbar semántica con botones iconográficos, etiquetas expandibles, toggle con aria-expanded/aria-label, listener idempotente, reset compacto al abrir, CSS responsive y reduced motion.
- Test actualizado: JS/Tests/CortesImageReconciliationUI.mjs. Pendiente publicar y ejecutar CI.


### Adenda CI — GP-DEV-CUT-AUDIT-TOOLBAR-01
- CI run 44080679408: sintaxis aprobada; se detectaron dos regresiones de contratos CSS, no de lógica: overflow:hidden en el bloque de toolbar interfería con el test de barras invisibles y un nuevo bloque reduced-motion al final desplazó el bloque de Developer esperado por DeveloperPanelUX.
- Corrección: recorte de etiquetas con clip-path; reduced-motion añadido al bloque existente de Developer. Repetir suite completa.


### Adenda CI — GP-DEV-CUT-AUDIT-TOOLBAR-01 (prueba)
- CI run 44080930930: DeveloperPanelUX 7/7 e InboxUi 80/80. Único fallo restante en CortesImageReconciliationUI: dos regex del nuevo test perdieron las barras invertidas al generar el archivo; la comprobación se reescribe con includes() y lectura del último bloque reduced-motion. Código de producción sin fallo de sintaxis.


### Cierre verificado — GP-DEV-CUT-AUDIT-TOOLBAR-01 — 2026-11-17
- Commits: 5c4024f57e491c841092cb5cd2dd325df5c97c89, 699ac6d7ae4112128eb339b9f76b8050dc6ae679, fe1ee909fad6adc47bbdca3293e45dad73a5fabb.
- GitHub Actions run 44081112777 SUCCESS: 133 suites, 1,987 pruebas, 0 fallos; CortesImageReconciliationUI 14/14; DeveloperPanelUX 7/7; InboxUi 80/80; AdminReplacedImagesIntegrity 55/55. Pages run 44081111776 SUCCESS.
- Los cinco botones originales mantienen ID, handler, permisos, confirmación, estado hidden/disabled y lógica de updateControls. Toolbar semántica, iconos, expansión animada, labels accesibles, layout móvil y reduced-motion.
- Estado: COMPLETADA CON VALIDACIÓN VISUAL DIFERIDA A BETA. No se ejecutaron acciones reales de organización/conciliación.
- Rama base GPSpedia2.2.5 sigue en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Siguiente tarea P2: GP-INBOX-LIST-NAV-01 — revisar límites y simplificar navegación de listas del Inbox sin descargas ilimitadas.


### Continuidad — GP-INBOX-LIST-NAV-01 — 2026-11-17
- HEAD de inicio: 5aae2351871ca819cee1166c3cdb72837f5037d2, rama GPSpedia2.2.5_work. Rama base GPSpedia2.2.5 verificada en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Auditoría: UI ya solicitaba páginas acotadas (20 conversaciones, 40 solicitudes, 50 mensajes); el backend permitía hasta 100 en reportes/tickets y mensajes. El paginador compartido permanecía visible aunque la respuesta no tuviera página siguiente ni anterior.
- Decisión: conservar paginación por cursor para acceso al historial y limitar a 50 los endpoints backend que aún aceptaban 100; ocultar controles cuando no exista navegación efectiva. No se sustituyen cursores por offsets ni se descarga la lista completa.
- Implementación y pruebas añadidas en ui.js, index.html, style.css, feedback.js, InboxConversations.js, InboxUi.mjs e InboxConversations.mjs. CI pendiente; no marcar tarea completada hasta revisar ejecución.


### Cierre verificado — GP-INBOX-LIST-NAV-01 — 2026-11-17
- Commit de implementación: cadbcadef7ca09ad47a1b676262900398cd2cca6.
- GitHub Actions run 44083370659 SUCCESS: 133 suites, 1,989 pruebas aprobadas, 0 fallos; InboxConversations 62/62; InboxUi 81/81; comprobación sintáctica aprobada.
- GitHub Pages run 44083370222 SUCCESS para el mismo HEAD.
- Límites máximos de backend uniformados a 50 para reportes, tickets propios y mensajes; conversaciones ya tenía límite 50. Tamaños de cliente: 40 solicitudes, 20 conversaciones y 50 mensajes.
- Paginación cursor-based conservada por acceso al historial; paginador compartido oculto si no hay página anterior/siguiente y con aria-label contextual.
- Pendiente Beta: inspección visual de la navegación en navegador/PWA y dispositivos táctiles; no se consultaron hojas productivas.
- Rama base GPSpedia2.2.5 verificada sin cambios: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Siguiente tarea P2: GP-INBOX-THREAD-TOOLBAR-01 — organizar botones y elementos del hilo con controles iconográficos autodesplegables, preservando destinatarios, borradores, permisos, lectura y navegación.


### Continuidad — GP-INBOX-THREAD-TOOLBAR-01 — 2026-11-17
- HEAD de inicio: f880e9a8424f01fd7c01da9b32d459d595a8f2cd, rama GPSpedia2.2.5_work; base GPSpedia2.2.5 sin cambios.
- Auditoría: renderInboxConversationDetail_ tenía un header flex plano sin toolbar ni iconografía. Volver, archivar/restaurar y cerrar caso ya tenían handlers y permisos; el flujo de respuestas y nuevos mensajes depende de borradores e idempotencia; los mensajes anteriores usan cursor opaco.
- Implementación: toolbar semántica con iconos siempre visibles y etiquetas expandibles, aria-expanded/aria-controls/aria-label, layout móvil; iconos añadidos a mensajes anteriores, cancelar y enviar. Se conservan handlers y contratos.
- Pruebas InboxUi ampliadas. CI pendiente; no marcar tarea completada hasta validar.


### Cierre verificado — GP-INBOX-THREAD-TOOLBAR-01 — 2026-11-17
- Commit de implementación: bec864d7756b2b2c46f7449a75fbf9b79eaf8023.
- GitHub Actions run 44084350666 SUCCESS: 133 suites, 1,991 pruebas aprobadas, 0 fallos; InboxUi 83/83; comprobación sintáctica aprobada.
- GitHub Pages run 44084349391 SUCCESS para el mismo HEAD.
- Toolbar del hilo con iconos persistentes y etiquetas desplegables, botones de volver/archivar/restaurar/cerrar y controles iconográficos para mensajes anteriores, cancelar y enviar. Se conservan permisos, foco de retorno, participantes, categoría, borradores, idempotencia, cursor histórico y estado de lectura.
- Pendiente Beta: validación visual y de interacción en navegador/PWA, teclado y táctil; no se ejecutaron acciones reales de archivo/cierre.
- Rama base GPSpedia2.2.5 verificada sin cambios: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Siguiente tarea pendiente de este bloque: GP-UX-SESSION-ENDED-01 — centrar el texto de sesión terminada dentro de la burbuja de aviso, sin alterar errores de acceso ni diseño responsive.


### Continuidad — GP-UX-SESSION-ENDED-01 — 2026-11-17
- HEAD de inicio: 318785d1d3d36cb4dd8559ef467799c25e09c1c2, rama GPSpedia2.2.5_work; rama base sin cambios.
- Auditoría: el CSS de la burbuja `.login-session-ended` alineaba a la izquierda; los errores normales usan una regla separada. showLoginScreen asigna clase, role y aria-live diferenciados.
- Implementación: cambiar solo text-align del aviso a center y ampliar SessionUiRoleInvalidation para proteger alineación y accesibilidad de ambos tipos de mensaje.
- Validación CI pendiente.


### Cierre verificado — GP-UX-SESSION-ENDED-01 — 2026-11-17
- Commit de implementación: c7bd8d36a0456ffa778fc57ca08b74d7a22dba28.
- Cambio limitado a text-align:center en #login-modal #login-error.login-session-ended; los errores de acceso no se modificaron.
- GitHub Actions run 44085022792 SUCCESS: 133 suites, 1,992 pruebas aprobadas, 0 fallos; UI invalidación de sesión y rol/AUG-042 18/18.
- GitHub Pages run 44085021849 SUCCESS para el mismo commit.
- Rama base GPSpedia2.2.5 verificada sin cambios.
- Siguiente tarea pendiente del bloque: GP-AUTH-PASSWORD-RECOVERY-01 — auditar implementación de recuperación, seguridad de tokens, límites, expiración y experiencia de usuario antes de cerrar.


### Continuidad — BETA-003 — 2026-11-17
- Reconciliación de continuidad: GP-AUTH-PASSWORD-RECOVERY-01 ya consta como COMPLETADA CON VALIDACIÓN DIFERIDA A BETA en Tareas_Pendientes.md; CI run 44073987141 y Pages run 44073810188 están registrados. La referencia del checkpoint anterior que la señalaba como siguiente tarea estaba desactualizada.
- Tarea actual: BETA-003 — recursos obsoletos/Service Worker. Auditoría local detectó un escape incorrecto en la expresión regular de extensiones de isCacheableRequest_; el fallback no reconocía recursos estáticos same-origin solicitados con destination vacío ni recursos estáticos del CDN permitido.
- Corrección publicada en service-worker.js: patrón de extensión corregido y CACHE_NAME incrementado a gpsepedia-cache-v68. Prueba añadida en JS/Tests/ServiceWorkerCache.js para JSON local y fuente woff2 CDN.
- Commits de implementación: d04c87a13d6d4083f67f6be6a7a688234f9e0404 y afdf35c8414fc103a7233d4e9b792b85673590f4.
- Validación local aislada: Node.js --check de los fragmentos de política y prueba, más 4 escenarios de política PASS. No se pudo consultar la ejecución completa de GitHub Actions mediante las acciones disponibles; no se afirma CI aprobada.
- Pendiente: verificar suite completa/Actions; en Beta comparar recursos servidos, actualización/activación de v68 y comportamiento online/offline en navegador/PWA. No se modificaron deployments ni datos externos.
- Rama base GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.


### Cierre de implementación local — BETA-003 — 2026-11-17
- La corrección local del Service Worker y su prueba de regresión quedaron publicadas en d04c87a13d6d4083f67f6be6a7a688234f9e0404 y afdf35c8414fc103a7233d4e9b792b85673590f4.
- Node.js --check de los fragmentos modificados: PASS. Harness aislado de política/caché: 4/4 PASS (JSON local, fuente CDN, exclusión Apps Script y exclusión POST).
- El estado de GitHub Actions no pudo verificarse con las acciones disponibles: combined status vacío y el endpoint de workflow runs filtra ejecuciones de pull request. No se afirma suite completa ni CI aprobadas.
- Estado: IMPLEMENTACIÓN LOCAL COMPLETADA; PENDIENTE BETA. Falta comparar recursos servidos, verificar activación de gpsepedia-cache-v68, reemplazo de caché anterior y navegación online/offline en navegador/PWA. No borrar IndexedDB ni datos locales.
- La referencia del checkpoint a GP-AUTH-PASSWORD-RECOVERY-01 quedó reconciliada: el backlog y CI anteriores acreditan su cierre local con validación diferida.


### Cierre de verificación remota — GP-SERVICE-HEALTH-REMOTE-01 — 2026-11-17
- Repositorio: infogpstech/GPSpedia; rama autorizada GPSpedia2.2.5_work. HEAD antes de registrar: e73d6a51e2721f87048ac3e68a1a3617180a5ccb. Rama base GPSpedia2.2.5 protegida; no modificar.
- Corte funcional exacto: 301c7b3a5840549819b2b6126d548df44af07da2. Se excluyeron a8c4a087e10cadf9264ce92cf328ac2032d5321b y todos los cambios posteriores.
- Regresión sobre el corte: Actions 44017363224 SUCCESS, 132 suites, 1965 pruebas, 0 fallos; sintaxis aprobada y Coordinador compartido 55/55.
- Diagnóstico remoto: Actions 44090225564 SUCCESS, 7/7 endpoints con GET ?debug=true. Versiones/latencias: AUTH 2.2.5/1596 ms; CATALOG 2.4.0/1097 ms; WRITE 2.3.1/1477 ms; USERS 2.4.2/1046 ms; FEEDBACK 1.2.2/1683 ms; UTILITIES 1.5.0/1092 ms; ADMIN 2.7.1/2442 ms. ADMIN queda señalado por latencia >=2000 ms.
- Comprobaciones: inventario exacto de siete servicios; HTTP correcto; JSON objeto; identidad contractual; estado available/online; versión no vacía; ausencia de campos sensibles. Solo GET, sin sesión, POST, escritura ni cambio remoto.
- Resultado y límite: disponibilidad 7/7 confirmada; no demuestra funciones autenticadas ni dependencias Sheets/Drive. La prueba funcional completa permanece diferida a Beta.
- Documentación pendiente: Services/SERVICE_HEALTH.md registra FEEDBACK 1.2.1 y ADMIN 2.6.0; endpoints reportan 1.2.2 y 2.7.1. FEEDBACK fuente contiene COMPONENT VERSION 2.3.0; reconciliar etiquetas antes de corregir la tabla.
- Efectos automáticos de push: run 44090225648 en HEAD posterior tuvo 2 suites fallidas (AUTH recuperación de contraseña e INTEGRATION CDN woff2), fuera del corte; Pages run 44090225354 SUCCESS. No confundir con la regresión del corte. No se desplegaron Apps Script.
- Archivos añadidos previamente: JS/Tests/RemoteServiceHealth.mjs y .github/workflows/deployed-service-health.yml.
- Siguiente tarea iniciada: GP-DEV-TRAFFIC-GLOBAL-02 — auditar y ajustar el panel Developer para usar el agregado global de Coordinator como fuente principal en lugar de métricas locales del navegador. Primeros hallazgos: Coordinator ya define buckets horarios globales de 24 h y ADMIN/getServiceTraffic; api-config.js todavía registra cada solicitud en createServiceMetricsStore local (ventana 15 min, máximo 600 eventos). Debe inspeccionarse la UI y cobertura antes de implementar.


### Adenda de auditoría — GP-DEV-TRAFFIC-GLOBAL-02 — 2026-11-17
- Estado de continuidad: rama GPSpedia2.2.5_work; último HEAD tras registrar verificación y auditoría: cf76263dc2c3b35e52aa09f5ca24661a5ac0a41b.
- Auditoría inicial de frontend/backend completada. ui.js usa getServiceMetricsSnapshot() tanto para métricas por servicio como para el gráfico «Actividad de este navegador»; index.html mantiene además el panel «Tráfico global coordinado».
- api-config.js captura routeAction y getCatalogChanges en un almacén local de 15 minutos/600 eventos. Esta información es exclusiva de la sesión/navegador y no representa tráfico de otros clientes.
- Coordinator ya agrega buckets horarios de 24 horas en ScriptProperties, consulta protegida ADMIN/getServiceTraffic y excluye su propia consulta. El registro se hace al adquirir lease y para validateSessionContext, como best-effort.
- Hallazgo de cobertura: Catalog (lecturas públicas y endpoints de catálogo) no llama Coordinator; otros servicios tienen rutas no coordinadas para acciones públicas/no protegidas; ADMIN ping también se excluye. Por tanto, el global actual es un subconjunto de operaciones protegidas, no tráfico HTTP total de las siete plataformas.
- No se modificó código productivo ni se desplegó Apps Script. No se ejecutaron escrituras reales de telemetría.
- Siguiente paso inmediato: auditar todos los caminos doPost por servicio y evaluar un mecanismo de contabilización central para rutas coordinadas y no coordinadas, sin sumar un viaje de red por cada solicitud ni introducir contención en lecturas. Después, definir el alcance exacto y los contratos de prueba antes de retirar el buffer local del panel.


### Adenda — GP-DEV-TRAFFIC-GLOBAL-02 — avance de implementación — 2026-11-17
- Rama: GPSpedia2.2.5_work. Último HEAD antes de esta adenda: edc6f08a72e87c4aa551f6c5e3a8d6e1aaee9b68. La rama base GPSpedia2.2.5 permanece protegida e intacta.
- Implementación: dashboard Developer utiliza solo el agregado global de Coordinator; se retiró el panel local de navegador y las métricas locales del detalle por servicio. Los detalles muestran conteos globales de 1 h, 6 h y 24 h.
- Archivos: JS/Frontend/ui.js, JS/Frontend/api-config.js, index.html, JS/Tests/ServiceTrafficAdminContract.mjs, JS/Tests/ServiceMetricsTelemetry.mjs, JS/Tests/RouteActionErrors.mjs, JS/Tests/RunServiceTests.mjs, Services/COORDINATOR_SETUP.md. Eliminado JS/Frontend/serviceMetrics.js.
- Validaciones específicas: Actions 44093181593 — sintaxis aprobada; ServiceTrafficAdminContract 20/20; ServiceMetricsTelemetry 1/1; RouteActionErrors 12/12. DeveloperPanelCopy también pasó tras conservar la nota «No representa todas las solicitudes HTTP».
- Regresión total de ese run: 107 suites, 1592 pruebas PASS y 2 suites fallidas no introducidas por este cambio: AUTH PasswordRecovery falla por expectativa de worker cache key gpsepedia-cache-v67; INTEGRATION ServiceWorkerCache falla en política CDN woff2. Registrar para seguimiento separado, no atribuir a telemetría.
- Health workflow 44093181611 SUCCESS (solo GET diagnóstico). Pages run 44093181449 seguía pending; no declarar despliegue completado. No se tocó Apps Script ni ScriptProperties.
- Alcance pendiente: Coordinator solo cuenta operaciones protegidas con lease y algunas validaciones; CATALOG y otras rutas públicas/no coordinadas quedan fuera. La interfaz lo etiqueta claramente. La cobertura total de HTTP no está completada.
- Próximo paso: auditar las opciones de instrumentación de CATALOG/rutas no coordinadas y su coste real. Priorizar no añadir un viaje de red por cada acción ni bloquear lecturas públicas; definir una solución medible que conserve la autenticación de servicio y el carácter best-effort. Después, añadir pruebas de contrato/concurrencia y volver a validar.


### Confirmación de CI en HEAD de continuidad — 2026-11-17
- HEAD validado antes de esta adenda: bfcd39a4334d3b21b42293a2f82887e7a8b38b90; rama base GPSpedia2.2.5 sigue en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Actions 44093578203: sintaxis aprobada; ServiceTrafficAdminContract 20/20, ServiceMetricsTelemetry 1/1, RouteActionErrors 12/12 y DeveloperPanelCopy aprobada. Global: 107 suites, 1592 PASS, 2 fallos preexistentes/no relacionados (AUTH PasswordRecovery cache key gpsepedia-cache-v67 y ServiceWorkerCache CDN woff2).
- Actions 44093578170: health remoto 7/7 SUCCESS, solo GET ?debug=true. No se desplegaron Apps Script.
- Pages build/deployment 44093577511: build aún en progreso al registrar este checkpoint; no afirmar despliegue completado hasta que concluya.
- Continuidad: tarea GP-DEV-TRAFFIC-GLOBAL-02 sigue EN PROGRESO porque la métrica global cuenta operaciones protegidas con lease, no todas las solicitudes HTTP; falta resolver cobertura CATALOG/lecturas públicas sin introducir latencia o bloqueo inaceptables.


### Ajuste final del orden del backlog — 2026-11-17
- HEAD de la rama antes de esta actualización: d349f1601d2cb3161cb6917a83f603c932dad8de.
- Se reconcilió BETA-043 con el estado actual: el panel local ya no existe; el dashboard usa únicamente Coordinator. Se mantiene visible la limitación de cobertura y la tarea GP-DEV-TRAFFIC-GLOBAL-02 queda en el punto 3 del orden general de ejecución, dentro del bloque de servicios/sesión/identificadores/telemetría.
- Siguiente acción concreta: evaluar instrumentación de CATALOG y rutas públicas/no coordinadas sin añadir un viaje de red por petición ni bloquear lecturas; medir impacto y probar alternativas localmente antes de modificar el backend.


### Estado final del workflow Pages — 2026-11-17
- Pages build/deployment run 44093577511 terminó CANCELLED antes de completar el build/deploy. No se confirma publicación de GitHub Pages para el HEAD actual. No se ejecutó un deployment Apps Script.
- La verificación remota de salud 44093578170 sí terminó SUCCESS, solo GET de diagnóstico; no equivale a despliegue.


### Checkpoint — cobertura directa de tráfico y regresión completa — 2026-11-17
- Rama de trabajo: GPSpedia2.2.5_work. HEAD de código validado: 3ccd3f45a8a382d48718ec8fd52cda42648e0286. Última actualización documental de esta continuidad: d5ee53020044f1f36b92af72d0a0653f2cf4bdb5. Rama base protegida GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin cambios.
- GP-DEV-TRAFFIC-GLOBAL-02 amplió la cobertura de rutas directas sin una llamada de red por operación:
  - CATALOG: getCatalogData, getDropdownData, getSuggestion y getNavigationData.
  - AUTH: validateSession.
  - WRITE: checkVehicle, getSuggestion y checkVinDuplicate.
  - FEEDBACK: getPysData y suggestYear anónimo (userId 0). Las acciones FEEDBACK protegidas, incluido sendContactForm y suggestYear autenticado, se cuentan por Coordinator.
  - UTILITIES/migrateTimestamps, USERS y operaciones ADMIN conocidas se cuentan por Coordinator; no se instrumentan de nuevo.
- Los contadores directos usan ScriptProperties, buckets horarios 24 h y tryLock(0), sin esperar. Un fallo de lock/PropertiesService omite solo la telemetría. ADMIN consulta las cuatro fuentes directas en un fetchAll agrupado, con fallback individual; fallos parciales no borran el agregado Coordinator. Secretos requeridos solo para AUTH, CATALOG, WRITE y FEEDBACK, cada uno en su proyecto y ADMIN.
- Pruebas focalizadas en Actions 44103742508: CatalogTrafficTelemetry 8/8; ServiceTrafficAdminContract 33/33; ServiceTrafficAggregation 6/6; DirectServiceTrafficTelemetry 18/18; ServiceTrafficBatch 5/5. Regresión completa: 137 suites, 2,037 pruebas aprobadas, 0 fallos de suite.
- Health remoto Actions 44103742755 SUCCESS: 7/7 servicios; ADMIN 1,745 ms, AUTH 1,392 ms, CATALOG 935 ms, FEEDBACK 1,873 ms, USERS 985 ms, UTILITIES 3,057 ms, WRITE 1,839 ms. Solo GET ?debug=true, sin POST ni escrituras. UTILITIES debe vigilarse por latencia.
- GitHub Pages run 44103742319 SUCCESS para el HEAD 3ccd3f45a8a382d48718ec8fd52cda42648e0286.
- Se corrigió Services/COORDINATOR_SETUP.md para que describa correctamente la cobertura: UTILITIES se cuenta por Coordinator, no tiene endpoint/secret directo. No se han desplegado proyectos Apps Script ni configurado Script Properties/secretos remotos.
- Próximo paso: auditar ACTION_TO_SERVICE_MAP y el consumo frontend restante para identificar cualquier ruta directa/legacy no cubierta; comprobar que no se dupliquen acciones coordinadas ni health probes. Después, revisar si la cobertura requerida está suficientemente definida y preparar el despliegue Beta de los cuatro proyectos instrumentados, con secretos generados/configurados fuera del repositorio y mediciones p50/p95, lock contention y diferencia de conteos. No afirmar tráfico HTTP universal.
- Regla de validación mantenida: no reducir suites, no desactivar pruebas ni cambiar aserciones solo para conseguir verde. Ante fallos, inspeccionar logs, aislar causa, corregir el código real y repetir la suite completa.

### Adenda — auditoría de rutas públicas y cierre de cobertura de código — 2026-11-17
- HEAD con código de telemetría y contratos: 070c414d135f3c79dae4392eaebb4a8ea2d6527b. HEAD documental previo a esta adenda: f511ecbf73f8d1128fc9d14159eaa43604076b83. Base GPSpedia2.2.5 intacta en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Auditoría de ACTION_TO_SERVICE_MAP, dispatchers Apps Script y llamadas en JS/Frontend, index.html y HTML/add_cortes.html. Se confirmó que el modo silentRegister enruta checkOperation/addOrUpdateCut/addSupplementaryInfo a ADMIN, donde checkOperation obtiene lease de lectura y las dos mutaciones obtienen lease de Coordinator. No requieren contador local duplicado.
- Hallazgo real adicional: FEEDBACK/getCatalogChanges está en FEEDBACK_PUBLIC_ACTIONS, por lo que no obtiene lease Coordinator (a diferencia de sendContactForm). Se incorporó al contador directo junto con getPysData. FEEDBACK/suggestYear anónimo (userId 0) también se cuenta localmente; suggestYear autenticado usa Coordinator.
- Se agregó DirectTrafficRoutingCoverage.mjs (6/6) para fijar contrato de rutas canónicas, compatibilidad add_cortes→ADMIN, fuentes públicas FEEDBACK, servicios coordinados y exclusión de ping. DirectServiceTrafficTelemetry verifica la lista FEEDBACK ampliada.
- CI Actions 44106829275 SUCCESS: 138 suites, 2,043 pruebas aprobadas, 0 fallos. Focalizadas: CatalogTrafficTelemetry 8/8; ServiceTrafficAdminContract 33/33; ServiceTrafficAggregation 6/6; DirectServiceTrafficTelemetry 18/18; ServiceTrafficBatch 5/5; DirectTrafficRoutingCoverage 6/6.
- Health remoto 44106826657 SUCCESS: 7/7. Latencias ADMIN 2,147 ms, AUTH 1,798 ms, CATALOG 1,033 ms, FEEDBACK 1,032 ms, USERS 1,038 ms, UTILITIES 1,426 ms y WRITE 1,223 ms. Solo GET ?debug=true.
- Pages run 44106826874 SUCCESS.
- Se actualizaron Tareas_Pendientes.md, Services/COORDINATOR_SETUP.md y Services/CATALOG_TRAFFIC_DESIGN.md para documentar getCatalogChanges como ruta pública directa.
- No se desplegaron Apps Script ni se configuraron secretos remotos. La cobertura del código conocido queda completa según el mapa/dispatchers auditados; la telemetría puede subcontar por tryLock(0), y no cubre clientes antiguos/externos que no usan el frontend actual ni probes.
- Próximo paso operativo: preparar despliegue Beta de AUTH, CATALOG, WRITE y FEEDBACK; crear cuatro secretos distintos fuera del repositorio y registrarlos en Script Properties de cada servicio y ADMIN; desplegar únicamente a Beta y medir p50/p95, lock contention y eventos omitidos. No marcar como terminado hasta completar validación funcional Beta.

### Cierre local — GP-DEV-TRAFFIC-GLOBAL-02 — 2026-11-17
- Estado: **COMPLETADA CON VALIDACIÓN DIFERIDA A BETA**. HEAD de la rama al cierre documental: b0e0e21b715103970804a81044f8846609032c49. Rama base GPSpedia2.2.5 intacta: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- CI final 44107762436 SUCCESS: 138 suites / 2,043 pruebas / 0 fallos. Pruebas específicas: CatalogTrafficTelemetry 8/8; ServiceTrafficAdminContract 33/33; ServiceTrafficAggregation 6/6; DirectServiceTrafficTelemetry 18/18; ServiceTrafficBatch 5/5; DirectTrafficRoutingCoverage 6/6.
- Health remoto 44107762702 SUCCESS: 7/7. ADMIN 1,961 ms; AUTH 1,765 ms; CATALOG 1,094 ms; FEEDBACK 1,448 ms; USERS 902 ms; UTILITIES 1,273 ms; WRITE 1,446 ms. Solo GET ?debug=true.
- Cobertura de rutas conocidas cerrada: CATALOG cuatro directas; AUTH validateSession; WRITE checkVehicle/getSuggestion/checkVinDuplicate; FEEDBACK getPysData/getCatalogChanges/suggestYear anónimo. El resto de operaciones identificadas pasa por Coordinator; ADMIN ping se excluye como health.
- La auditoría descubrió y corrigió la omisión de FEEDBACK/getCatalogChanges, acción pública que no obtiene lease. La prueba DirectTrafficRoutingCoverage fija el comportamiento de add_cortes en silentRegister y sus leases ADMIN.
- No se desplegaron Apps Script ni se configuraron Script Properties/secretos remotos. La validación Beta sigue pendiente y no bloquea el cierre local conforme a NORMAS_DESAROLLO.md.
- Siguiente etapa: despliegue y validación Beta de AUTH, CATALOG, WRITE, FEEDBACK y ADMIN, con cuatro secretos aleatorios distintos guardados fuera del repositorio, verificación de Coordinator compatible, prueba de siete endpoints, conteos, latencia p50/p95 y contención. Requiere acceso operativo a Google Apps Script/Script Properties; no hay una integración de Apps Script disponible en esta sesión.


## Continuidad — 2026-11-17 — BETA-050

- Repositorio: `infogpstech/GPSpedia`.
- Rama de trabajo: `GPSpedia2.2.5_work`; rama base `GPSpedia2.2.5` intacta.
- HEAD de cierre local: `368582c4ed3619862dda2f52a686edbea4434f1f`.
- Tarea: eliminar rutas de autenticación duplicada en ADMIN, FEEDBACK, WRITE, USERS y UTILITIES. Los helpers protegidos requieren ahora el actor central de Coordinator; no consultan Users/ActiveSessions como fallback.
- USERS conserva una búsqueda de fila solo para ubicar el registro de destino en updateProfile. AUTH mantiene su ruta de login/restauración. Coordinator conserva token, epoch, expiración, revocación y RBAC por operación.
- CI `44113573112`: SUCCESS — 138 suites, 2,031 pruebas aprobadas, 0 fallos.
- Estado: implementación local y regresión completadas; validación funcional Beta pendiente. No se desplegaron proyectos Apps Script ni se realizaron cambios en servicios remotos.
- Los workflows de salud remota son automáticos y de solo lectura (GET diagnóstico); no sustituyen las pruebas funcionales Beta.
- Siguiente paso local: revisar la solicitud visual reciente del Inbox de escritorio contra el código vigente, aunque las tareas GP-UX-INBOX-DESKTOP y de toolbar figuran cerradas en el backlog; reabrir únicamente los defectos que sigan reproducibles. Mantener diferidas las pruebas funcionales Beta.


## Continuidad — 2026-11-17 — GP-UX-INBOX-DESKTOP-02

- HEAD al cierre local: `bba4b430166b4783c4b613c06f6532036ba8b0a7` en `GPSpedia2.2.5_work`.
- Auditoría del Inbox: scroll del compositor y acciones Salir/Enviar ya funcionaban; lista vacía ya compacta. Se reforzó el ancho de los botones de búsqueda y se corrigió el único incumplimiento restante: Plantilla/Categoría ahora comparten dos columnas iguales; roles sin permiso de plantilla muestran Categoría a ancho completo.
- App Shell incrementado a v69 y contratos de caché actualizados.
- CI `44115093952`: SUCCESS — 138 suites, 2,031 pruebas, 0 fallos; InboxUi 83/83. Health remoto read-only `44115094092`: SUCCESS.
- GitHub Pages ejecuta su build/deploy automáticamente al recibir cambios. No se desplegaron proyectos Apps Script ni se realizaron pruebas funcionales Beta.
- Pendiente: inspección visual Beta en escritorio, Android y PWA instalada. Las pruebas funcionales de despliegue permanecen diferidas.


### Nuevo requisito prioritario — GP-PERF-SIMPLIFY-01 — 2026-11-17
- El usuario redefine el criterio de arquitectura: GPSpedia debe priorizar fluidez y velocidad; no desea validaciones transaccionales, leases, autorizaciones entre servicios ni revalidaciones de identidad por acción ordinaria.
- Acceso ordinario: login con contraseña hasheada mediante el esquema actual; el rol asignado determina las capacidades. Cada acción conserva solo la comprobación sencilla del permiso del rol, sin viajes de red ni transacciones.
- Cortes, tutoriales, videos, imágenes y demás aportes deben procesarse directamente: contenido + fecha del servidor + colaborador autenticado. No hacer que un servicio pida permiso a otro ni que Coordinator valide cada transacción.
- Únicas excepciones solicitadas: cierre remoto de sesión y limpieza/invalidez de caché; invalidación de sesión al borrar una cuenta para impedir nuevos accesos; bloqueo temporal tras varios intentos fallidos de login. No cambiar el hash actual ni la matriz de roles.
- Se añadió la sección 15 a NORMAS_DESAROLLO.md, que prevalece sobre el criterio anterior de leases/revalidación por acción de la sección 13.3 para operaciones ordinarias.
- Plan detallado registrado en PLAN_SIMPLIFICACION_SEGURIDAD_RENDIMIENTO.md y tarea GP-PERF-SIMPLIFY-01 añadida al backlog.
- Orden: P0 inventario de llamadas/latencia; P1 simplificar escrituras/aportes; P2 cargas de archivos; P3 excepciones de sesión; P4 optimización global; P5 pruebas locales y mediciones.
- Estado: requisito y plan registrados; todavía no se han modificado servicios ni se afirma mejora de rendimiento. Siguiente acción: ejecutar P0, auditar Coordinator/SharedMutationClient y rutas WRITE/FEEDBACK/ADMIN, y luego implementar P1/P2. No desplegar Apps Script ni ejecutar Beta sin autorización.
- HEAD al registrar este requisito: 4e3ef463298fd8e3d75a87c46feea8a67a9e1f25; rama autorizada GPSpedia2.2.5_work. Rama base GPSpedia2.2.5 no se modifica.


## Continuidad de ejecución — GP-PERF-SIMPLIFY-01 — 2026-11-17

- **Tarea:** GP-PERF-SIMPLIFY-01 — simplificación de seguridad operativa y optimización global.
- **Subtarea P0 — Inventario y mapa de latencia: COMPLETADA.** Se inspeccionaron Coordinator, SharedMutationClient, WRITE, ADMIN y FEEDBACK en el HEAD confirmado `632ae83b63474654a9966cd947a80f34d4619e48`.
- **Resultado P0:** se confirmó que `withLease()` hace una llamada HTTP de adquisición y otra de liberación; la adquisición llama `authorizeSession_()`, que relee el contexto, verifica token/revocación/expiración y puede escribir LastActivityAt. El cliente espera hasta 12 s y Coordinator acepta esperas de hasta 15 s. ADMIN/WRITE tiene además flujo anidado (ADMIN lease + llamada WRITE + validación de lease en Coordinator). WRITE `checkOperation` también usa Coordinator. ADMIN mantiene ScriptLock de hasta 30 s en el registro de cortes e información suplementaria; la operación suplementaria sube imágenes a Drive mientras mantiene el lock. FEEDBACK tutorial usa ScriptLock de hasta 15 s.
- **Informe:** `AUDITORIA_P0_LATENCIA_VALIDACIONES.md`.
- **Pruebas:** no ejecutadas; P0 fue auditoría estática. No se midieron latencias reales ni se desplegaron servicios Apps Script/Beta.
- **Estado de la tarea global:** EN PROGRESO. P0 COMPLETADA; P1 pendiente de completar.
- **Subtarea siguiente y activa:** P1.1 — simplificar rutas WRITE/ADMIN de creación/edición de cortes y eliminar Coordinator de `checkOperation`, conservando la asignación correcta de colaborador y los permisos de rol. Luego P1.2 — retirar locks largos durante cargas Drive; P1.3 — simplificar aportes FEEDBACK.
- **Siguiente fase después de P1:** P2 — imágenes, tutoriales y videos; después P3 — excepciones de sesión; P4 optimización general; P5 pruebas locales.
- **Commit de esta actualización documental:** registrará P0 COMPLETADA, P1 EN PROGRESO, subtarea siguiente P1.1 y pruebas pendientes.
- Rama autorizada: `GPSpedia2.2.5_work`; no modificar `GPSpedia2.2.5`.


### Avance parcial — GP-PERF-SIMPLIFY-01 / P1.1a — 2026-11-17
- **Tarea ejecutada:** P1.1a — retirar la coordinación transaccional de la consulta `WRITE/checkOperation`.
- **Cambio realizado:** `JS/Services/write.js` ya despacha `checkOperation` directamente, sin adquirir/liberar lease ni llamar a Coordinator; `handleCheckOperation` ya no exige el actor central para una consulta de estado. Se conserva la respuesta compacta sin datos completos de fila.
- **Prueba actualizada:** `JS/Tests/WriteAuthorizationMinimization.js` ahora exige ausencia de lease y revalidación en esa ruta.
- **Estado:** IMPLEMENTACIÓN PARCIAL; VALIDACIÓN PENDIENTE. No marcar P1.1a como completada hasta ejecutar la prueba.
- **Pendiente de P1:** mutaciones de cortes WRITE/ADMIN, identidad simple de colaborador/rol, locks largos y FEEDBACK.
- **Siguiente sub-tarea:** P1.1b — simplificar `addOrUpdateCut`/ADMIN y la asignación de ID. Después ejecutar pruebas locales de P1.1a y continuar P1.2/P1.3.
- No se desplegaron Apps Script ni se ejecutaron pruebas Beta/productivas.


### Corrección de regresión — GP-PERF-SIMPLIFY-01 / P1.1a — 2026-11-17
- GitHub Actions regresión `44120322612`: FAIL en tres grupos de suite por expectativas antiguas que exigían autenticación/lease para `checkOperation` (CheckOperationSecurity, SessionActivityCoordination y DirectTrafficRoutingCoverage). La comprobación de sintaxis sí pasó.
- Corrección en curso: actualizar esos contratos para el requisito nuevo: `checkOperation` es lectura de estado, no exige actor central ni Coordinator; las mutaciones restantes de WRITE conservan temporalmente el flujo anterior hasta P1.1b.
- **Estado:** P1.1a IMPLEMENTADA; VALIDACIÓN FALLIDA EN PRIMER CI, CONTRATOS ACTUALIZADOS EN ESTE COMMIT; nueva regresión pendiente.
- **Siguiente:** revisar el resultado del nuevo CI; si pasa, cerrar P1.1a y continuar P1.1b (mutaciones de cortes WRITE/ADMIN). Si falla, corregir las expectativas restantes antes de avanzar.


### Ajuste de prueba P1.1a — 2026-11-17
- CI `44120776071`: sintaxis aprobada y 132 suites/1,917 pruebas aprobadas; quedó un único fallo en la nueva prueba `CheckOperationSecurity`. La aserción excluía `getSpreadsheet()`, aunque la consulta debe leer la hoja Cortes; el requisito es eliminar la revalidación de sesión, no la lectura necesaria del registro.
- Se corrigió la aserción para permitir el acceso de lectura a Cortes y seguir prohibiendo actor central, token, Users/ActiveSessions y consultas de sesión dentro del handler.
- Estado P1.1a: implementación pendiente de regresión aprobada.
- Siguiente: ejecutar CI de este commit; si pasa, cerrar P1.1a y continuar P1.1b (mutaciones ordinarias de cortes).


### Seguimiento CI — GP-PERF-SIMPLIFY-01 / P1.1a — 2026-11-17
- Run `44120994810` terminó en FAIL: sintaxis aprobada; 133 suites, 1,925 pruebas aprobadas y 1 suite fallida. El único fallo es `WriteAuthorizationMinimization`: su extractor de funciones informa `Función incompleta: doPost` al intentar analizar la función router; la inspección directa confirma que el bloque de ruta existe y despacha `checkOperation` sin lease. No es un fallo funcional del servicio ni se marca como aprobado.
- Corrección aplicada al contrato: la prueba localiza directamente el bloque entre `if (!isSharedMutationAction_(action))` y `const nestedToken`, evitando el extractor genérico que falla con `doPost`; mantiene las aserciones sobre ausencia de lease y ruta directa.
- **Estado P1.1a:** implementación realizada; validación automatizada pendiente de nueva ejecución.
- **Siguiente:** volver a ejecutar CI; si pasa, cerrar P1.1a. Después continuar P1.1b: investigar la fuente confiable de identidad/rol y simplificar mutaciones de cortes ADMIN/WRITE sin confiar en datos manipulables del navegador.
- HEAD confirmado antes de esta corrección: `2aad7e5f6a191b13b04b2047bdd8e9f2d22f1743`; rama `GPSpedia2.2.5_work`. No se desplegaron Apps Script ni se ejecutó Beta.


### Continuidad GP-PERF-SIMPLIFY-01 — 2026-11-17 (actualización tras CI)
- **P1.1a COMPLETADA:** `checkOperation` en WRITE quedó sin lease ni revalidación por acción. CI `44123644616`: SUCCESS — 138 suites, 2,021 pruebas aprobadas, 0 fallos.
- **P1.1b IMPLEMENTACIÓN REALIZADA; VALIDACIÓN PENDIENTE:** aportes de cortes e información suplementaria usan WRITE como servicio propietario; el formulario ya no envía las operaciones de cortes a ADMIN. ADMIN rechaza las rutas heredadas `checkOperation`, `addOrUpdateCut` y `addSupplementaryInfo` antes de Coordinator. La opción de registro silencioso conserva permiso exclusivo de Desarrollador en WRITE. La asignación de ID se mantiene dentro de WRITE.
- WRITE usa actor de sesión confiable en caché local por 15 segundos. En una acción con caché vigente solo comprueba localmente el rol; Coordinator se consulta al crear/renovar esa caché, no por cada aporte. La revocación remota puede tardar como máximo el TTL de la caché (15 s) en reflejarse en una solicitud directa; la restauración/validación de sesión de la aplicación sigue siendo independiente. Este límite queda explícito para revisión en P3.
- CI `44125814255`: FAIL — sintaxis aprobada; 78 suites, 1,028 pruebas aprobadas y 3 suites fallidas. Los tres fallos corresponden a contratos de prueba desactualizados: dos aserciones sobre el flujo silencioso/extractor de función, una expectativa antigua de `sessionOptions` en WRITE y una expresión regular que asumía un orden incorrecto de las claves del mapa. Se corrigen los contratos sin cambiar el comportamiento funcional.
- **Siguiente:** volver a ejecutar CI. Si pasa, cerrar P1.1b; continuar P1.2: sacar cargas Drive de los locks de 30 s y reducir el bloqueo de escrituras independientes.
- No se desplegaron servicios Apps Script ni se ejecutó Beta. No se han medido latencias reales.


### Cierre P1.1b e inicio P1.2 — 2026-11-17
- **P1.1a COMPLETADA:** `checkOperation` en WRITE consulta estado sin lease ni revalidación central por acción. CI `44123644616`: SUCCESS, 138 suites, 2,021 pruebas, 0 fallos.
- **P1.1b COMPLETADA:** aportes de cortes e información suplementaria usan WRITE; ADMIN rechaza las antiguas rutas; registro silencioso conserva rol Desarrollador; actor confiable local cacheado 15 segundos. CI `44126830985`: SUCCESS, 138 suites, 2,024 pruebas, 0 fallos.
- La caché local evita Coordinator/lease por acción. Una revocación remota puede tardar hasta 15 segundos en reflejarse en una solicitud directa; la validación/restauración de sesión de la aplicación se mantiene. No se debe describir como invalidación instantánea.
- **P1.2 EN PROGRESO.** Siguiente sub-tarea P1.2a: mover carga de imágenes de `addSupplementaryInfo` fuera del ScriptLock de 30 s; dejar bajo lock solo lectura final, combinación y escritura de columnas suplementarias. Después P1.2b: separar cargas de imágenes de `addOrUpdateCut`, conservando asignación de ID e idempotencia sin mantener el lock durante Drive.
- CI intermedios fallidos `44125814255`, `44126144877` y `44126524619` quedaron corregidos por commits posteriores; no representan el estado final. El CI final `44126830985` pasó.
- No se ejecutaron pruebas Beta ni despliegues manuales de Apps Script. No se han medido latencias reales.


### P1.2a — implementación preparada, validación pendiente — 2026-11-17
- Se refactorizó WRITE/addSupplementaryInfo para que la autenticación local del actor y la lectura de preflight ocurran antes del bloqueo final. Si hay imágenes, la resolución de carpeta y las cargas a Drive se realizan antes de adquirir el lock de persistencia.
- El bloque final usa ScriptLock con espera máxima de 5 s, vuelve a localizar el vehículo por ID, relee la fila y recalcula el plan para respetar cambios concurrentes; solo combina y persiste las columnas suplementarias. La carga de Drive y el marcado posterior del ledger quedan fuera de ese bloqueo.
- Para conservar idempotencia del ledger al retirar el lock global, la ruta nueva reserva y finaliza cada registro del ledger en secciones críticas breves; el archivo Drive se crea/verifica fuera del lock. Una marca temporal upload_in_progress impide que dos solicitudes simultáneas con el mismo token creen archivos duplicados. La actualización de referencias/estado linked también separa lectura y Drive del guardado breve del ledger.
- La creación/recuperación de la carpeta del vehículo conserva un lock corto independiente para evitar carpetas equivalentes duplicadas; se libera antes de cargar archivos.
- Se actualizaron contratos de AddSupplementaryInfoIntegrity y WriteAuthorizationMinimization para comprobar el orden de autenticación, carga, lock final y ausencia de Drive dentro del bloque de persistencia.
- Estado P1.2a: implementación realizada; pruebas automatizadas pendientes de CI. No marcar como completada hasta revisar el resultado y corregir cualquier fallo.
- HEAD base confirmado antes de publicar: af913330419d66c8942663ff43d9398e9a1e9039, rama GPSpedia2.2.5_work. No se desplegaron servicios Apps Script ni se ejecutó Beta; no hay mediciones reales de latencia.
- Siguiente: ejecutar CI; después P1.2b, separar las cargas Drive de addOrUpdateCut del bloqueo prolongado, conservando ID e idempotencia.


### Seguimiento CI P1.2a — 2026-11-17
- CI `44130490277` sobre commit `a5d82fadc9bc3e4d120381f4ce85d8d027c42c30`: sintaxis aprobada; 131 suites, 1,868 pruebas aprobadas y 1 suite fallida. La falla está en una aserción del contrato AddSupplementaryInfoIntegrity que buscaba una cadena de log con espacios exactos; la implementación y las demás aserciones de la suite pasaron.
- Se ajusta únicamente esa aserción para comprobar la presencia del registro del actor sin depender del espaciado de la concatenación. Nueva regresión pendiente; P1.2a continúa en validación.
- Próximo paso: publicar la corrección del contrato, ejecutar CI y resolver cualquier fallo funcional real antes de continuar P1.2b.


### GP-PERF-SIMPLIFY-01 — seguimiento P1.2a / CI y corrección de contrato — 2026-11-17
- HEAD verificado al iniciar: `2efaeb68d670ec1eb42dc6a7cc47c5cb2e48e0b0`; rama `GPSpedia2.2.5_work`. Rama base: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones.
- CI `44130802404`: sintaxis aprobada; 136 suites, 2,003 pruebas aprobadas y 1 suite fallida. Único fallo: contrato WRITE/AUG-039 que todavía exigía autenticar addSupplementaryInfo dentro del lock.
- La implementación vigente autentica una sola vez al actor compartido antes de preflight/carga y antes del lock final; el bloque protegido solo relee, recalcula y persiste. La expectativa anterior contradice el diseño P1.2a y prolongaría el bloqueo innecesariamente.
- Corrección localizada del contrato: comprobar autenticación única antes de preparar imágenes y antes de `waitLock(5000)`, y ausencia de autenticación dentro de `handleAddSupplementaryInfoLocked`. No se modifica el servicio ni se relaja la autorización.
- **P1.2a: EN PROGRESO — validación pendiente de nueva CI.** Siguiente: ejecutar regresión completa; si aprueba, cerrar P1.2a y comenzar P1.2b (cargas Drive de addOrUpdateCut fuera del lock prolongado, preservando ID e idempotencia).
- No se desplegaron Apps Script, no se ejecutó Beta ni se modificaron datos/propiedades externas.


### Cierre local GP-PERF-SIMPLIFY-01 / P1.2a — 2026-11-17
- Commit de corrección contractual: `f6729973f07fda50e39e4e25a06d764e63c069f5`.
- CI `44131693251`: **SUCCESS** — sintaxis aprobada; 138 suites, 2,026 pruebas aprobadas, 0 fallos. La regresión AUG-039 confirma que addSupplementaryInfo autentica una vez al actor compartido antes del preflight/carga y del lock final, sin reautenticar dentro del bloque protegido.
- **P1.2a: COMPLETADA CON VALIDACIÓN DIFERIDA.** Carga y preparación de imágenes Drive fuera del lock final; reserva/finalización del ledger con secciones críticas breves; lock final de 5 s limitado a releer, recalcular y persistir. La prueba local de concurrencia/contrato pasó en CI.
- Validación Beta pendiente: comportamiento real de Drive, permisos OAuth, simultaneidad de solicitudes y visualización final en el deployment. No se desplegaron Apps Script ni se modificaron recursos externos.
- **Siguiente: P1.2b** — separar las cargas Drive de `addOrUpdateCut` del ScriptLock prolongado, preservando asignación de ID, referencias de imágenes, idempotencia y recuperación ante fallos.


### Inicio de análisis GP-PERF-SIMPLIFY-01 / P1.2b — 2026-11-17
- P1.2a cerrada con CI `44131693251`: 138 suites / 2,026 pruebas / 0 fallos. Commit de cierre documental: `a795e8e2a11a5073549537dcec3b1527557fc404`.
- Auditoría focalizada de `JS/Services/write.js`: `handleAddOrUpdateCut` mantiene actualmente un ScriptLock de hasta 30 s alrededor de `handleAddOrUpdateCutLocked`. Dentro de `handleAddOrUpdateCutLockedUnsafe_` se identifican cinco llamadas de carga Drive: reparación de imagen del vehículo, reparación de imagen del corte, imagen de corte para vehículo existente, imagen del vehículo nuevo e imagen del primer corte nuevo.
- Dependencias que deben preservarse al separar Drive del lock: asignación del ID numérico del vehículo nuevo, selección del slot de corte para vehículos existentes, reserva/recuperación de `opId` en la hoja Idempotencia, huella de contenido, rollback de la fila/contador y confirmación del estado `completed`. La carga no puede mover el ID/slot a una fase sin reserva porque dos aportes simultáneos podrían colisionar.
- WRITE ya dispone de `uploadImageToDrive(..., { shortLedgerLock: true })`, introducido en P1.2a, que separa Drive de las secciones críticas del ledger. Debe reutilizarse tras confirmar cómo se reserva el ID/slot sin mantener el lock durante la transferencia.
- **P1.2b: EN PROGRESO — auditoría de dependencias completada; implementación pendiente.** No se modificó código de producción en esta fase. Siguiente: diseñar e implementar la separación en fases de preparación, reserva breve y persistencia final, con pruebas de concurrencia, reintento/idempotencia, rollback y recuperación. No agregar nuevas capas de autorización ni validación transaccional; mantener solo la coordinación de datos indispensable para no duplicar ID/slot ni perder aportes.
- CI de sintaxis/regresión ya disponible; validación Drive/OAuth real permanece reservada a Beta. No se desplegaron Apps Script ni se modificaron recursos externos.


### Requisito de preservación transversal — monitoreo y dashboard del desarrollador — 2026-11-17
- Instrucción expresa del usuario: mantener el monitoreo de servicios para el desarrollador y la recolección de información que alimenta el dashboard de actividad durante todas las tareas de simplificación/rendimiento.
- Componentes que deben conservarse: `.github/workflows/deployed-service-health.yml`, `Services/SERVICE_HEALTH.md`, `JS/Frontend/activityDashboard.js`, `Services/CATALOG_TRAFFIC_DESIGN.md` y los flujos de telemetría/actividad de Coordinator, AUTH, WRITE y FEEDBACK.
- Regresiones relacionadas existentes que deben seguir en la suite: `RemoteServiceHealth.mjs`, `ServiceHealthContract.mjs`, `DirectServiceTrafficTelemetry.mjs`, `DirectTrafficRoutingCoverage.mjs`, `ServiceTrafficBatch.mjs`, `ServiceTrafficAggregation.mjs`, `CatalogTrafficTelemetry.mjs`, `ServiceMetricsTelemetry.mjs`, `ActivityDashboardContributions.mjs`, `ActivityDashboardInsights.mjs`, `ActivityLogsBoundedRead.js` y `ActivityLogRetention.mjs`.
- Criterio: no retirar ni romper el monitoreo de salud, el conteo de actividad/operaciones ni las fuentes de datos del dashboard. Mantener la captura best-effort y de bajo costo: sin llamadas de red adicionales en cada acción, sin esperas ni locks globales para telemetría y sin escrituras que bloqueen operaciones ordinarias. Los fallos de telemetría no deben impedir aportes, registros o cargas.
- En cada tarea que toque servicios, despacho, sesión, escrituras o dashboard, ejecutar las pruebas de telemetría/actividad pertinentes y revisar que la instrumentación permanezca conectada. No se deben simular ni afirmar mediciones reales de deployment; el workflow de salud remota sigue siendo de solo lectura.


### Cierre P1.2b — cargas Drive de addOrUpdateCut fuera del lock — 2026-11-17
- Commit de implementación y regresión: `a12950e698104ba97edb5940b98b9c4a122cf092`; corrección de contratos/CLI: `f9ac60c231018947caa71734fa2fc99389889ba0`, `45f744a831963ae4f5e4f93016d72b3e83b29b26`, `157b87cbdeabafb75e98b578b5fe70002bbf1977`, `54e8ccab8d4f6438fa36a717748f4311b2e69da0`, `82159d8c36ad08c5fa3217790993069c538ac419`, `8b907699db6edf4fd1c940a16b5e74ec0a869ac7`.
- WRITE autentica una sola vez el colaborador/rol (incluido el requisito de Desarrollador para registros silenciosos). La adquisición inicial del ScriptLock ahora es fail-fast (`tryLock(0)`), sin espera de 30 s.
- Las cinco rutas de trabajo Drive de `addOrUpdateCut` (reparación de imágenes y cargas de vehículo/corte nuevo o existente) ejecutan creación/resolución de carpeta, transferencia y vínculo del ledger fuera del ScriptLock de WRITE. Reutilizan el ledger con lock breve.
- Para evitar colisiones al liberar el lock, los slots de cortes pendientes en Idempotencia se consideran reservados al elegir el siguiente slot. El ID numérico de un vehículo nuevo y su `opId` se reservan antes de Drive. Si no se puede readquirir el lock inmediatamente o falla una fase posterior, se conserva la operación pendiente para recuperación con el mismo `opId`; no se restaura una fotografía de fila/contador que pudiera sobrescribir escrituras concurrentes. La ruta heredada sin `opId` conserva su comportamiento serializado para compatibilidad.
- Se agregó `JS/Tests/WriteDriveOutsideLock.mjs` y se actualizó el runner y los contratos de WRITE. Prueba focalizada: 1/1 PASS; cubre liberación/readquisición fail-fast, fallback legado, reservas de slot y autenticación única.
- CI `44135220800`: **SUCCESS — 139 suites, 2,027 pruebas aprobadas, 0 fallos**. Incluye pruebas de telemetría de AUTH/WRITE/FEEDBACK, salud de servicios y dashboard de actividad. Health remoto de solo lectura `44135220571`: SUCCESS. GitHub Pages `44135219018`: SUCCESS.
- **P1.2b: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.** Beta debe comprobar Drive/OAuth y concurrencia real de aportes simultáneos/reintentos. No se desplegaron proyectos Apps Script ni se modificaron datos externos; no se midieron latencias reales.
- Monitoreo de servicios y recolección del dashboard del desarrollador quedan preservados como requisito transversal. No se retiraron workflows, endpoints ni fuentes de telemetría.
- **Siguiente: P1.3 — simplificar FEEDBACK y sus aportes/rutas de escritura**, manteniendo monitoreo y dashboard sin llamadas ni esperas adicionales en las acciones ordinarias.


### Cierre P1.3 — simplificación de FEEDBACK e Inbox — 2026-11-17
- **Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**
- FEEDBACK ya no adquiere leases ni realiza viajes a Coordinator por acción. El dispatcher usa el actor confiable de la caché local para las acciones protegidas; las rutas públicas/anónimas siguen sin exigir sesión. Se conserva la matriz de permisos FEEDBACK.
- Inbox y los locks de escritura de FEEDBACK ya no usan esperas prolongadas. Los locks locales imprescindibles intentan adquisición inmediata (tryLock(0)); ante contención se devuelve error recuperable o se invalida el feed incremental para que el cliente recargue, sin bloquear solicitudes independientes.
- Se conserva el registro directo de tráfico FEEDBACK con contador best-effort y tryLock(0). Los fallos de PropertiesService/contención no impiden ejecutar el handler. No se retiraron el workflow de salud, los endpoints de monitoreo ni los contadores del dashboard.
- Pruebas: GitHub Actions 44140231970 SUCCESS — sintaxis aprobada, **140 suites / 2,028 pruebas / 0 fallos**. DirectServiceTrafficTelemetry 18/18; DirectTrafficRoutingCoverage 6/6; ServiceTrafficAdminContract 33/33; ActivityDashboardContributions 1/1.
- Salud remota 44140232048 SUCCESS — **7/7 servicios disponibles**, solo GET de diagnóstico. Versiones/latencias: ADMIN 2.7.1 (1,972 ms), AUTH 2.2.5 (1,400 ms), CATALOG 2.4.0 (1,234 ms), FEEDBACK 1.2.2 (1,325 ms), USERS 2.4.2 (1,149 ms), UTILITIES 1.5.0 (1,203 ms), WRITE 2.3.1 (2,463 ms). WRITE superó el umbral de 2,000 ms; se registra como observación, no como indisponibilidad.
- GitHub Pages 44140229137 SUCCESS.
- Commits de implementación/pruebas: 8f25c60f028b8472265f347e16f04318826b0618, 6d6649f49cd73149015f00a9f8e1eca9a71fd07e, 6507d42e270be07605fab058f23169c4594f46cf, 698868a9d1fae0ea0e104a37140249e3c3baa590, 25fbadfead33d4b530073647bf01a923d8452bfd.
- La base GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1; no se modificó.
- Pendiente Beta: concurrencia real en Inbox/FEEDBACK, comportamiento de actualización de catálogo bajo contención y comprobación de permisos con sesiones reales. No se desplegaron Apps Script ni se modificaron hojas/Drive.
- **Siguiente: P2.1 — auditar cargas de imágenes y videos (Cortes, PyS, Tutoriales, Inbox/adjuntos y aprobación YouTube), identificar llamadas/validaciones duplicadas y separar Drive de cualquier lock restante. Mantener permisos por rol, ID/autor/fecha y telemetría de salud/dashboard.**


### Inicio P2.1 — auditoría de imágenes y videos — 2026-11-17
- Auditoría estática registrada en `AUDITORIA_P2_CARGAS_ARCHIVOS.md`; no se modificó código productivo en esta sub-tarea.
- WRITE: transferencias de imágenes de cortes y aportes suplementarios ya están fuera del lock desde P1.2. FEEDBACK: `handleReportProblem`, `handleSuggestCutChange` y `handleAddProblem` aún mantienen bloqueos durante operaciones Drive.
- YouTube: transferencia resumable directa del navegador en bloques de 8 MiB con checkpoints IndexedDB; no mantiene ScriptLock durante la transferencia. Se conserva.
- ADMIN: herramientas de auditoría/conciliación/organización de imágenes son mantenimiento de desarrollador y quedan fuera del aporte ordinario; revisar separadamente en P4.
- **P2.1 AUDITORÍA COMPLETADA. P2.2a siguiente:** separar adjuntos de reportes y sugerencias de sus locks; después P2.2b simplificar el lock de PyS sin añadir nuevas capas transaccionales. Mantener monitoreo y dashboard.


### Cierre P2.2a — adjuntos de reportes y sugerencias fuera del lock — 2026-11-17
- `handleReportProblem` y `handleSuggestCutChange` preparan/cargan sus imágenes a Drive antes de adquirir el ScriptLock de la hoja. El lock queda limitado a revisar duplicados, asignar ID y persistir el registro/metadata.
- Se conserva la asociación por reportId/suggestionOperationId, la metadata de imagen y la limpieza de archivos. En reportes, si la reversión de la referencia no puede confirmarse, la imagen se conserva para evitar borrar un archivo posiblemente vinculado.
- Nueva prueba `P2FeedbackImageUploadLocks.mjs`: 1/1 PASS; verifica el orden de carga/lock, limpieza prudente, telemetría best-effort y presencia del workflow de salud/dashboard.
- CI `44141910133` SUCCESS: **141 suites / 2,029 pruebas / 0 fallos**. Health remoto `44141910250` SUCCESS: 7/7 servicios disponibles, solo GET. Pages `44141907494` SUCCESS.
- Telemetría FEEDBACK y fuentes del dashboard permanecen intactas; no se desplegaron Apps Script ni se modificaron hojas/Drive productivos. Validación real Drive/OAuth y concurrencia queda diferida a Beta.
- **P2.2a COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Siguiente P2.2b:** separar la creación de imagen PyS de su lock y simplificar el flujo; evitar ampliar el ledger transaccional, conservando solo la asociación básica de imagen/registro y el comportamiento de reintento ya requerido por el cliente.


### Cierre P2.2b — PyS carga imagen fuera del lock — 2026-11-17
- `handleAddProblem` valida hojas y operación antes de transferir. La creación del archivo Drive, descripción inicial y comprobación de permisos ocurren antes de adquirir el ScriptLock. Bajo el lock quedan la relectura de la operación, asignación del ID, escritura de fila/ledger y confirmación.
- Los reintentos ya vinculados no vuelven a subir la imagen. Los reintentos `UPLOAD_PENDING` reutilizan el archivo existente; los envíos simultáneos con el mismo `opId` revalidan bajo lock y descartan el archivo redundante si otro envío ganó la carrera.
- Se conserva el ledger existente, sin añadir estados/capas transaccionales. El archivo se conserva si no se puede confirmar la referencia/rollback. La transferencia YouTube resumable no se modificó.
- Pruebas PyS: `PysCreationIntegrity` 53/53; `PysImageStorageRecovery` 22/22; contrato `P2PysImageUploadOutsideLock` PASS.
- CI `44144972128` SUCCESS: **142 suites / 2,104 pruebas / 0 fallos**. Health remoto `44144972115` SUCCESS: **7/7 servicios disponibles**, solo GET. Pages `44144970560` SUCCESS.
- El monitoreo y la telemetría del dashboard permanecen activos. No se desplegaron Apps Script ni se modificaron hojas/Drive productivos. Validación Drive/OAuth real y concurrencia multiusuario diferida a Beta.
- **P2.2b COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Siguiente P2.3:** cerrar contrato del flujo de video resumable directo (bloques, checkpoints IndexedDB, cancelación/reanudación y aprobación), sin trasladar la transferencia a Apps Script.


### Cierre P2.3 — contrato de video YouTube resumable — 2026-11-17
- Auditoría confirmó que la transferencia continúa directa desde el navegador hacia YouTube mediante sesiones resumables, bloques de 8 MiB y checkpoints IndexedDB. Apps Script solo inicializa la sesión y registra/gestiona la aprobación posterior; no recibe ni retransmite los bloques de video.
- Pruebas focalizadas aprobadas: YouTubeUploadRecordPersistence 14/14; YouTubeUploadCheckpointRecovery 2/2; YouTubeUploadCloseDuringTransfer 6/6; YouTubeUploadCompletedRecordRecovery 6/6; YouTubeUploadDraftRecovery 3/3; YouTubeUploadOverlayLifecycle 8/8; YouTubeUploadXssIntegrity 5/5; YouTubeUploadClient 12/12; precondiciones server-side 8/8.
- No se modificó el flujo de video. Se mantiene la aprobación interna antes de publicar o vincular videos a Tutoriales/PyS.
- P2.3 COMPLETADA. **P2 (imágenes/videos) completada localmente**, pendiente solo validación Beta real de OAuth/Drive/YouTube.
- **Siguiente P3.1 — auditoría de sesión y rol al iniciar sesión:** el actor cacheado FEEDBACK tiene TTL de 15 s y vuelve a consultar Coordinator al vencer. Esto no coincide completamente con el requisito de verificar usuario/rol solo al iniciar sesión. Auditar cómo propagar un contexto confiable de login a los servicios sin revalidar cada acción ni introducir complejidad innecesaria.


### P3.1a — contexto de sesión cacheado — 2026-11-17
- `checkSession()` restaura la identidad/rol local verificados en login sin consultar AUTH otra vez. WRITE/FEEDBACK consumen el actor compartido desde caché; antes el TTL era 15 s.
- TTL ampliado a 21,600 s (6 h, máximo de CacheService) para evitar viajes a Coordinator por acción y reducir revalidaciones periódicas. En cache hit no hay red.
- Prueba SessionActorCacheLifetime 4/4 PASS. CI 44146072996: 143 suites / 2,108 pruebas / 0 fallos. Health read-only 44146072983: 7/7. Pages 44146072924: SUCCESS.
- Observación de salud: USERS alcanzó 8,489 ms en esta muestra; disponible, pero debe vigilarse.
- Límite: la caché es por proyecto Apps Script; un primer acceso/cache miss o vencimiento aún consulta Coordinator. No se afirma que la validación sea estrictamente solo en login.
- **P3.1a COMPLETADA. P3.1b pendiente:** evaluar precarga del actor desde login en los servicios o aceptar el contexto cacheado 6 h, sin añadir complejidad de seguridad innecesaria. Mantener monitoreo y dashboard.


### Continuidad — P3.1b evaluada; P3.1c pendiente — 2026-11-17
- HEAD de inicio de esta continuación: bd002d42cbe8cf84f5482185a39848154a0668e8 (rama `GPSpedia2.2.5_work`). Base `GPSpedia2.2.5` verificada en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- P3.1b: se descarta precarga AUTH→todos los servicios porque CacheService es aislado por proyecto y exigiría llamadas/contratos adicionales durante login. Se conserva TTL 6 h para cache hits sin red; cache miss/expiración todavía consulta Coordinator.
- Hallazgo ALTO: logout remoto, eliminación de cuenta y cambio de rol revocan el contexto de Coordinator, pero no invalidan entradas de actor ya almacenadas en CacheService de WRITE/FEEDBACK. Riesgo de autorización obsoleta hasta 6 h. Detalle y evidencia en `AUDITORIA_P3_SESION_ACTOR.md`.
- P3.1b COMPLETADA (evaluación/decisión), pero P3.1 global NO está cerrada. **Siguiente tarea P3.1c:** implementar invalidación dirigida de cachés de actor en WRITE/FEEDBACK para las tres excepciones, sin revalidar cada acción. Añadir pruebas locales de propagación, fallos parciales y aislamiento por token.
- En esta continuación solo se actualizaron registros; no se modificó código de servicios, no se ejecutó Node.js/CLI y no se desplegó Apps Script. Las pruebas CI históricas 143 suites/2,108 PASS pertenecen a P3.1a, no validan esta adenda.


### Cierre P3.1c — invalidación dirigida de caché de actor — 2026-11-17
- **Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.**
- AUTH invalida primero las claves exactas de sesión en WRITE y FEEDBACK mediante una acción interna servidor-a-servidor. El actor cacheado conserva el mismo formato de clave y TTL de 21,600 s para operaciones ordinarias.
- Logout invalida el token individual. Las revocaciones de usuario (cambio de rol, reset remoto, eliminación y cambios/restablecimientos de contraseña) enumeran los tokens activos de ActiveSessions y limpian ambos servicios antes de revocar el contexto en Coordinator.
- WRITE y FEEDBACK aceptan la acción interna solo con GPSpedia_SESSION_CACHE_INVALIDATION_SECRET; no se expuso en api-config.js ni se agregó una ruta de navegador. Si uno de los dos servicios no confirma la limpieza, AUTH no continúa con la revocación central; la operación queda reintentable.
- Configuración requerida para Beta, sin secretos en Git: AUTH debe tener GPSpedia_SESSION_CACHE_INVALIDATION_SECRET, GPSpedia_WRITE_URL y GPSpedia_FEEDBACK_URL; WRITE y FEEDBACK deben tener el mismo GPSpedia_SESSION_CACHE_INVALIDATION_SECRET de AUTH. Las URL deben ser los endpoints /exec vigentes.
- Pruebas focalizadas: SessionActorCacheInvalidation 23/23 PASS; SessionActorCacheLifetime 4/4 PASS. CI 44149804570: SUCCESS — 144 suites / 2,131 pruebas / 0 fallos. Health read-only 44149804587: SUCCESS; no valida el nuevo código de Apps Script porque no se desplegó.
- No se desplegaron proyectos Apps Script ni se modificaron ScriptProperties, hojas, Drive o datos externos. Pendiente Beta: configurar propiedades, desplegar AUTH/WRITE/FEEDBACK y probar logout, revocación de todas las sesiones, eliminación/cambio de rol, recuperación ante fallo parcial y reintento.
- La rama base GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
### Continuidad — corrección adicional P3.1c — 2026-11-17
- En la revisión del cierre se detectó que Desarrollador tiene sesiones ilimitadas (SESSION_LIMITS.desarrollador = Infinity) y que la primera implementación rechazaba más de cinco tokens.
- Corrección publicada: AUTH procesa los tokens en lotes de cinco y solo revoca en Coordinator después de recibir confirmación de ambos servicios para todos los lotes. Fallos parciales detienen la revocación central; los reintentos son idempotentes.
- Se reutiliza GPSpedia_COORDINATOR_SECRET, ya compartido por AUTH/WRITE/FEEDBACK; se elimina la necesidad de crear GPSpedia_SESSION_CACHE_INVALIDATION_SECRET. AUTH requiere GPSpedia_WRITE_URL y GPSpedia_FEEDBACK_URL con los endpoints /exec vigentes.
- Prueba ampliada a 13 sesiones Developer. El primer CI posterior a la ampliación detectó que el runner exige resumen numérico; se corrigió el formato del test. CI del HEAD más reciente pendiente de confirmar.
- No se desplegaron Apps Script ni se modificaron propiedades o datos externos. Rama base sigue en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
### Cierre validado — P3.1c y corrección de sesiones ilimitadas — 2026-11-17
- CI del HEAD de código 718e0100bc040609d790ce94b0f2de0cbf2c0ef5: run 44151856103 SUCCESS; sintaxis aprobada, 144 suites, 2,109 pruebas y 0 fallos. SessionActorCacheLifetime 4/4 y SessionActorCacheInvalidation 1/1.
- Health read-only 44151856097 SUCCESS: 7/7 servicios disponibles. No se desplegó Apps Script y el health check no valida la nueva acción interna.
- Se corrigió el caso de cuentas Developer con sesiones ilimitadas: invalidación en lotes de cinco, confirmación de WRITE/FEEDBACK para cada lote y revocación central única al final. Se reutiliza GPSpedia_COORDINATOR_SECRET.
- La rama base GPSpedia2.2.5 sigue en d9acc68d889985c2e2f42fe3a02e502efc86ead1. Siguiente fase local: verificación técnica integral del conjunto de mejoras; las validaciones que requieren deployment, ScriptProperties o datos reales permanecen en Beta.
### Continuidad — inicio P4 de GP-PERF-SIMPLIFY-01 — 2026-11-17
- P3.1c quedó cerrada localmente y validada por CI; despliegues Apps Script y pruebas de campo siguen diferidos a Beta.
- Siguiente fase del plan: P4, optimización general de plataforma. Auditoría inicial en AUDITORIA_P4_OPTIMIZACION_PLATAFORMA.md.
- P4.1 activa: lectura de PyS en paralelo con el snapshot/cursor inicial de catálogo; aislar fallos PyS y no alinear su cursor si los datos no quedaron frescos.
- P4.2: compositor Inbox desde Solicitudes no debe esperar la lectura de conversaciones para cargar destinatarios.
- P4.3: auditar locks globales en herramientas ADMIN de auditoría/organización Drive. Preservar verificaciones de referencias y rollback.
- Mantener telemetría, dashboard y health read-only. Sin deployments ni modificaciones de Spreadsheet/Drive productivos.
### Continuidad P4 — P4.1 y P4.2 cerradas; P4.3 siguiente — 2026-11-17
- P4.1: completada y validada. PyS se inicia en paralelo al cursor/snapshot inicial; los fallos no contaminan el estado del catálogo y el cursor no avanza con datos stale.
- P4.2: completada y validada. El compositor Inbox desde Solicitudes carga destinatarios sin esperar la lectura remota de conversaciones; lista y sondeo continúan en segundo plano con guardas de contexto.
- P4.3: siguiente. Auditar y diseñar reserva atómica breve para ADMIN Drive. El ScriptLock actual protege cursores idempotentes, inventoryOperationId, movimientos y rollback; no retirarlo ni sustituirlo por tryLock/UserLock sin pruebas concurrentes.
- CI 44154032505 SUCCESS: 145 suites, 2,117 pruebas, 0 fallos. Health read-only 7/7. Pages build SUCCESS. No Apps Script desplegado ni datos productivos modificados.
### P4.3a cerrada; P4.3b siguiente — 2026-11-17
- handleOrganizeUnusedImagesBatch ahora reutiliza currentRows y duplicateIds una vez por lote; conserva la lectura latestRowsBeforeMove por archivo y todas las comprobaciones finales antes de mover.
- En lote máximo de 20: hasta 19 lecturas completas iniciales y 19 scans de duplicados menos. AdminReplacedImagesIntegrity 55/55 PASS.
- CI 44154558840 SUCCESS: 145 suites, 2,117 pruebas y 0 fallos. Health read-only 7/7.
- P4.3b: diseñar claim/commit atómico breve por auditId/operationId para liberar el ScriptLock global durante Drive sin perder reintentos idempotentes, unicidad de inventario ni rollback. El lock actual permanece.
### P4 cerrada en el alcance seguro — 2026-11-17
- P4.1: arranque PyS paralelo; error aislado y cursor condicionado a freshness.
- P4.2: compositor Inbox carga destinatarios sin esperar la lista de conversaciones; la lista y su sondeo continúan en segundo plano.
- P4.3a: currentRows y duplicateIds una vez por lote; se conserva revalidación final por archivo.
- P4.3b: CacheService.getAll/putAll por grupos de 100; 205 páginas verificadas con 9 llamadas.
- P4.3c: publicación CATALOG de ADMIN por lotes de 50; requestId idempotente y reset de recuperación si el lote quedó parcial.
- P4.3d: ScriptLock se conserva deliberadamente. Coordinator ya coordina recursos compartidos; no hay evidencia de que el lock local bloquee módulos independientes. Reabrir con medición, no por suposición.
- CI 44156469990 SUCCESS: 145 suites, 2,123 pruebas, 0 fallos. Health 7/7; Pages build SUCCESS.


### Cierre P5 — verificación técnica integral — 2026-11-17
- HEAD de código verificado: f6375b86e6908e9e9152e9c63b216b3d274ce1fe; rama GPSpedia2.2.5_work. Base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin cambios.
- P0–P5 de GP-PERF-SIMPLIFY-01 completadas localmente. CI run 44166031280: 145 suites, 2,123 pruebas aprobadas, 0 fallos.
- Health read-only run 44166031201: 7/7 servicios disponibles. Pages build run 44166030514: SUCCESS.
- P5 corrigió fixtures aislados AUTH/USERS y contratos obsoletos de benchmark AUTH y consultas de tráfico ADMIN. Se retiró la política Coordinator no consumida de AUTH/benchmarkPasswordKdf; se conserva la lectura interna SERVICE_TRAFFIC del Coordinator sin lease adicional desde ADMIN.
- Cobertura de la regresión: RBAC, escrituras/aportes, cargas, sesiones/revocación, cuenta eliminada, bloqueo temporal, concurrencia/idempotencia y UI. No se modificó el hash ni sus parámetros.
- No se midieron latencias reales; se reportan solo las reducciones de llamadas calculadas y probadas en P4.
- Pendiente Beta: despliegues Apps Script, ScriptProperties, OAuth/Drive/YouTube/Spreadsheet, pruebas de sesión/revocación y concurrencia multiusuario, navegador/PWA y mediciones reales. Procedimiento seguro de sincronización y checklist registrados en Tareas_Pendientes.md.
- No se desplegaron Apps Script ni se modificaron datos/propiedades productivas.


### Reconciliación de continuidad — 2026-11-17 (sesión posterior)
- Rama verificada: `GPSpedia2.2.5_work`; HEAD previo a esta actualización: `f7567b088559ca1484b72a3aaada61fa55a34827` (commit `GPSpedia backlog: reconcile local completion and Beta-only next phase`). Rama base `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios en esta sesión.
- Se leyó íntegramente `NORMAS_DESAROLLO.md`; README, contexto operativo, checkpoint y backlog consolidado fueron consultados. `Tareas_Activas.md` no existe en esta rama; `Tareas_Pendientes.md` declara que sustituye los registros operativos anteriores.
- El último commit actualiza el backlog para reflejar el cierre local de las tareas registradas y el paso a validaciones Beta. No se identificó una tarea local de implementación pendiente que pueda iniciarse sin abrir un alcance nuevo.
- Verificación del HEAD previo: GitHub Actions service regression `44166858145` SUCCESS (Node.js syntax check y 145 suites / 2,123 pruebas / 0 fallos); health read-only `44166858224` SUCCESS (7/7 servicios disponibles; no valida código Apps Script no desplegado); GitHub Pages `44166857432` SUCCESS.
- La validación combinada de estado del commit no reportó checks de status asociados (0 statuses); los tres workflows anteriores sí finalizaron correctamente en el mismo HEAD.
- Siguiente etapa autorizable: validaciones Beta descritas al final de `Tareas_Pendientes.md`: despliegues Apps Script en entorno Beta, propiedades de configuración, OAuth/Drive/YouTube/Spreadsheet, sesiones/revocación, concurrencia multiusuario y navegador/PWA. No se ejecutan aquí porque requieren despliegues/credenciales/entorno Beta y autorización expresa; no se alteró producción ni se simularon esas pruebas.
- No se modificó código de aplicación en esta sesión. Esta entrada sincroniza el checkpoint con el HEAD y la evidencia real de GitHub.


### Auditoría de encabezados de modales — 2026-11-17
- Rama verificada: GPSpedia2.2.5_work; HEAD al iniciar auditoría: 5d261217a10e2c2bb3aa8c19af2e7e1a9d61f9e2. Rama base GPSpedia2.2.5 verificada en d9acc68d889985c2e2f42fe3a02e502efc86ead1; no se modifica.
- Se inspeccionaron los modales de index.html, HTML/users.html, los modales dinámicos de JS/Frontend/ui.js y JS/Frontend/youtubeUpload.js, además de las reglas compartidas de style.css.
- Hallazgos: no hay estructura común de encabezado; la mayoría usa cierre absoluto sin reserva general para títulos largos; roles/nombres accesibles faltan en varios diálogos estáticos y dinámicos; el cierre YouTube es un span no operable nativamente por teclado; hay jerarquías h1/h2/h3 inconsistentes. El detalle de cortes tiene una cabecera especializada con pruebas de layout que deben preservarse.
- La auditoría fue estática. No se ejecutó navegador, no se confirmó una superposición visual real y no se realizaron pruebas Beta.
- Evidencia detallada agregada a Auditoría.txt y Tareas_Pendientes.md. Estado: auditoría completada; corrección local de encabezados pendiente.
- Siguiente paso: implementar contrato de encabezado accesible por familias, mantener excepciones justificadas, corregir cierre YouTube y añadir pruebas de contrato para todos los diálogos.
- Se mantiene la instrucción del usuario: completar todas las tareas de implementación antes de iniciar Beta. No se desplegaron servicios ni se modificaron datos externos.


## Continuidad — GP-UX-MODAL-HEADERS-02 (2026-11-17)
Se implementó el ajuste de encabezados solicitado. Archivos de código: `JS/Frontend/ui.js`, `JS/Frontend/main.js`, `style.css`, `index.html`, `JS/Frontend/youtubeUpload.js`, `HTML/users.html`. Pruebas de contrato actualizadas en `JS/Tests/CutDetailModalLayout.mjs` y `JS/Tests/YouTubeUploadOverlayLifecycle.js`.
- Detalle de corte: logo conservado (120 px escritorio / 104 px móvil), modelo elevado ligeramente y divisor azul acercado; acciones en orden Imprimir, Editar, Compartir; cierre a la derecha.
- Atrás/gesto en detalle de corte: cierra la ficha y limpia la pila en lugar de restaurar una ficha previa; conserva el comportamiento de retroceso de otros tipos de detalle.
- Tutoriales mantienen su encabezado como estándar de título izquierdo/cierre derecho. Se reforzó la reserva horizontal de títulos en modales informativos.
- YouTube usa un botón de cierre real y etiqueta accesible. Se añadieron roles/nombres ARIA a los diálogos tocados.
- Estado de validación: pendiente de CI; no se ha realizado prueba visual de navegador ni Beta. No se desplegó ningún servicio.


### Revisión de CI — primer intento de GP-UX-MODAL-HEADERS-02
La comprobación sintáctica aprobó. Dos contratos heredados fallaron por expectativas estáticas que requerían la inserción temprana del botón Compartir y una llamada literal a restoreModalNavigationContext. Se ajustó la implementación para registrar Compartir inicialmente y moverlo al final tras crear Imprimir/Editar (conservando el orden visual), y se mantuvo explícita la restauración para tipos de detalle distintos de corte. No se identificó fallo de ejecución de la interfaz; las suites afectadas se vuelven a ejecutar en el siguiente CI.


### Cierre y reconciliación de continuidad — 2026-11-17
- HEAD confirmado en `GPSpedia2.2.5_work`: `f5d2391aa7e271d487d0d730284f56f0fb3064e7`; commit padre `2dcee7a9569aa31672a7e0f007ceafe84681b275`. Rama base `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.
- GP-UX-MODAL-HEADERS-02: implementación publicada y regresión integral aprobada. Se conserva el orden Imprimir/Editar/Compartir, logo/dimensiones/sombras, divisor y título ajustados, cierre del detalle de corte mediante Atrás, y semántica accesible de los diálogos afectados.
- GitHub Actions run `44170476002`, job `134347901920`: SUCCESS; 145 suites, 2,127 pruebas aprobadas, 0 fallos. El log confirma el resumen completo de la regresión y la comprobación sintáctica.
- GitHub Pages run `44170474862`: SUCCESS para el HEAD actual. Health read-only run `44170475959`: SUCCESS; solo GET de diagnóstico, no valida funciones Apps Script no desplegadas.
- Se reconcilió la nomenclatura P4.3: P4.3a inventario por lote; P4.3b CacheService por lotes; P4.3c publicación CATALOG por lotes; P4.3d decisión de conservar ScriptLock. El diseño alternativo claim/commit queda diferido hasta que mediciones reales justifiquen reabrirlo. No se modificó el lock ni la lógica de ADMIN.
- Las menciones antiguas de P1.2 EN PROGRESO quedan supersedidas por los cierres posteriores P1.2a/P1.2b y P1.3. BETA-003 y los encabezados de modales cuentan con regresión local aprobada; sus validaciones de navegador/servicios reales siguen en Beta.
- No quedan tareas de implementación local abiertas en el plan consolidado. Continúan pendientes las validaciones Beta y cualquier deployment Apps Script requiere autorización y entorno Beta. No se desplegaron servicios ni se modificaron ScriptProperties, hojas, Drive o datos externos.


### GP-UX-INBOX-PRIVATE-MULTI-RECIPIENT-01 / GP-UX-MODAL-HEADER-TIGHTEN-03 — 2026-11-17
- Inbox: selector de varios destinatarios; cada destinatario recibe un hilo privado independiente con el remitente, sin exponer los demás receptores. La entrega es secuencial, con idempotencia individual y avance persistido para recuperarse de fallos parciales.
- Barras enriquecidas: listener global de pointerdown cierra menús de listas y opciones al pulsar fuera, incluidos modos básicos y completos.
- Detalle de corte: botones en una sola fila al extremo derecho y junto al cierre; contenedor del logo sin padding interno; alto del contenedor reducido 138→129 px escritorio y 118→111 px móvil, conservando imágenes de logo 120/104 px; margen del divisor y separación con metadatos reducidos a aproximadamente la mitad; nombre del modelo elevado de forma independiente, sin cambiar tamaño ni sombra.
- PyS: encabezado de título azul normalizado y botón de cierre accesible.
- Pendiente: confirmar CI y GitHub Pages del commit de estos cambios; no hay despliegue Apps Script ni cambios de datos externos.


### Ajuste de regresión Inbox — 2026-11-17
- La suite reportó 1 fallo de aserción por contaminación del fixture (la prueba nueva añadió 2 mensajes antes de una verificación histórica que esperaba 7). La prueba de privacidad se movió al final y ahora comprueba inclusión/exclusión y lectura no autorizada sin asumir el total de la bandeja.
- Reejecutar CI del nuevo HEAD. Pages build del commit anterior SUCCESS; health read-only del commit anterior SUCCESS.


### Segundo ajuste de regresión Inbox — 2026-11-17
- La prueba nueva fue movida al final, pero la consulta global de bandeja de U3 encontró un contador inconsistente en un registro de fixture heredada (uuid-00000029). Se eliminó la dependencia de esa consulta global y se añadieron denegaciones cruzadas de U3/U5 sobre conversaciones privadas ajenas.
- La lógica de servicio no se modificó. Pendiente reejecutar CI del HEAD nuevo.


### Ajuste de fixture de sesión de privacidad Inbox — 2026-11-17
La segunda ejecución del CI encontró que U5 carece de token simulado; el rechazo ocurrió antes del control de participante. Los intentos cruzados ahora utilizan U2/token-b y U3/token-c, ambos válidos y no participantes. Pendiente nuevo CI.


### Reconciliación de regresión CSS — 2026-11-17
La prueba de scrollbars heredada incluía reglas de dropdown fuera de los modales por un selector de texto demasiado amplio. Se acotó al bloque global de scrollbars sin modificar estilos de runtime.


### Cierre verificado UX Inbox y encabezados — 2026-11-17
- HEAD validado: `33700c6b15f0b77feebc706e8ac4e298bb62155f`; rama base `GPSpedia2.2.5` continúa en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- CI 44196032087 SUCCESS: 145 suites; 2,131 pruebas aprobadas; 0 fallos. InboxConversations 63/63 y InboxUi 86/86 PASS.
- Health read-only 44196031955 SUCCESS. Pages 44196029692 SUCCESS: commit publicado en GitHub Pages.
- Inbox permite selección múltiple y envía conversaciones independientes; cada participante ve únicamente su propio hilo con el remitente. Se agregó prueba de acceso cruzado.
- Las barras completas/básicas cierran menús al pulsar fuera. PyS adopta título azul y cierre accesible. Detalle de corte agrupa acciones con X a la derecha, quita padding del contenedor del logo y reduce separación vertical del divisor/metadatos; el modelo sube sin cambiar tipografía/sombras.
- El resultado de las primeras ejecuciones identificó y corrigió fixtures de prueba y el alcance excesivo de un test CSS; no fue necesario modificar el backend ni la política de permisos.
- No se desplegó Apps Script, no se cambiaron ScriptProperties, hojas, Drive ni datos externos. Validación visual real queda en Beta.


### Inicio — GP-AUTH-ROLE-SESSION-LIMITS-01 — 2026-11-17
- Requisito: Desarrollador ilimitado; Jefe 5; Supervisor 3; Técnico 1; Técnico externo 1. El exceso no rechaza el login: registra la nueva sesión y revoca la más antigua por timestamp de creación.
- HEAD de inicio: e27ebd0dede46db8847ac2c595cdcf688c302060 en GPSpedia2.2.5_work; base protegida GPSpedia2.2.5 no se modifica.
- Auditoría encontró límites incorrectos para Jefe/Técnico, un tope fijo de cinco en la sincronización AUTH de sesiones compartidas y selección de sesión antigua por índice de fila.
- Implementación local iniciada en AUTH, espejo de pruebas y contrato SessionActivityCoordination. No se despliega Apps Script ni se modifican datos externos.


### Hallazgo ampliado — GP-AUTH-ROLE-SESSION-LIMITS-01 — 2026-11-17
- Coordinator mantenía tres topes fijos de cinco sesiones en lectura, registro individual y sincronización masiva. Además, guardaba el array completo en una sola propiedad de ScriptProperties, limitada a 8,000 caracteres por la aplicación.
- Se amplía el diseño para guardar sesiones en bloques versionados y mantener en la propiedad principal solo metadatos/índice. La escritura de bloques precede al cambio de índice; generaciones anteriores se limpian después de publicar el nuevo contexto.
- Se agrega regresión aislada para 100 sesiones y lectura de una sesión ubicada en el último bloque. No se modifican servicios desplegados ni propiedades reales.


### Continuidad — expulsión automática y revocación de cachés
- La implementación ahora invalida las cachés de cada token excedente y revoca su contexto central antes de limpiar ActiveSessions. Se mantiene idempotencia: un reintento puede completar tokens parcialmente revocados.
- La limpieza de sesiones antiguas no se realiza si falla la invalidación de WRITE/FEEDBACK o la revocación de Coordinator.

- Los bloques del contexto se dimensionan en bytes UTF-8 (7,000 por bloque), no en caracteres, para respetar el límite por propiedad también con nombres Unicode.


### Cierre local — GP-AUTH-ROLE-SESSION-LIMITS-01 — 2026-11-18
- Límites por rol aplicados y sesión más antigua seleccionada por timestamp; se invalida primero su caché en WRITE/FEEDBACK y su token central antes de retirar el registro local.
- Coordinator ahora persiste sesiones en bloques versionados UTF-8, mantiene compatibilidad de lectura con el formato anterior y no impone un máximo funcional de cinco.
- SessionActivityCoordination: 11/11 PASS; escenario Coordinator de 100 sesiones incluido en la regresión sin fallos reportados. Sintaxis y health GET-only: PASS.
- La regresión general tiene un único fallo ajeno al alcance: BETA-026 (aserción de CSS del modal de detalle, relacionada con el encabezado móvil de 60px). No se desplegó Apps Script ni se tocaron datos externos. Validación multi-dispositivo real queda en Beta.

## GP-UX-CUT-MODAL-HEADER-POSITION-01 — continuidad (2026-11-17)
- Rama: GPSpedia2.2.5_work. HEAD confirmado antes de esta tarea: 1bd7562b31427e2ef48a15b34ec8cdd0ff370d7e. Rama base protegida: GPSpedia2.2.5; no modificar.
- Solicitud: quitar espacio vacío sobre el logo y debajo de la línea azul sin cambiar tamaño/propiedades del logo, tipografía, orden ni posición de botones; modelo debajo de las acciones y alineado a la izquierda; conservar distancia divisor/contenido.
- Diagnóstico: el encabezado tenía una fila flexible vacía entre acciones y divisor. El contenedor del logo abarcaba dos filas y medía 129 px escritorio / 111 px móvil; la imagen mide 120 px / 60 px y se alineaba centrada o al borde inferior. La regla móvil dejaba hasta 51 px por encima de la imagen. #detalleCompleto también tiene padding exterior y gap de 12 px compartidos; se conservan para no desplazar las acciones ni alterar la distancia con el contenido.
- Cambio preparado: hacer que logo, acciones y modelo compartan la fila superior; logo arriba, modelo abajo, divisor en la siguiente fila; quitar solo la fila flexible vacía. Mantener los márgenes existentes de divisor, toolbar y metadatos.
- Archivos: style.css, JS/Tests/CutDetailModalLayout.mjs, Tareas_Pendientes.md, Auditoría.txt, ChangesLogs.txt y este checkpoint.
- Validaciones pendientes de ejecutar después de publicar: CutDetailModalLayout, regresión global y CI; inspección visual real en Beta móvil/escritorio. No se desplegarán servicios Apps Script ni se tocarán datos externos.

- CI inicial del commit abbd405b7f17ae2d0e15b2a7185a884f6a312e50: sintaxis aprobada; la regresión se detuvo en BETA-026 por una aserción CSS antigua que agrupaba en una misma regla la altura del contenedor y las propiedades de la imagen móvil. Las propiedades reales del logo no cambiaron; se separa la comprobación del contenedor (60 px) de la imagen (60 px con sus !important/object-fit actuales) y se repite CI.
- Segundo CI (44225033094): sintaxis aprobada; BETA-026 volvió a detenerse por selector incompleto en la aserción del logo móvil: la regla real incluye el prefijo #modalDetalle. Se corrige únicamente el selector de prueba; no se modifica CSS de producción ni propiedades de la imagen.- Tercer CI (44225144814): sintaxis aprobada; BETA-026 detectó que la prueba del logo móvil exigía un orden distinto al real de las declaraciones CSS (width antes de height) y esperaba align-items:flex-end del bloque genérico, ya reemplazado por la regla específica de cortes. Se actualiza el contrato para comprobar el orden real y la alineación efectiva del modal de cortes, sin cambiar las propiedades de la imagen.- Cuarto CI (44225248503): sintaxis aprobada; BETA-026 avanzó hasta una aserción que aún esperaba la regla compacta de transform del modelo. Se actualiza para reflejar el bloque multilineal con grid-row:1 y conservar el mismo translateY(-6px) de escritorio.
## GP-UX-CUT-MODAL-HEADER-GRID-02 — continuidad (2026-11-18)
- HEAD confirmado antes de esta corrección: 4658ac5336f6c2d92c8c699691e97b00bab48a43; rama base GPSpedia2.2.5 intacta en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Requisito: cuadrícula 2x2; logo en columna 1 abarcando filas 1-2 y conservando altura; acciones arriba a la derecha en columna 2; modelo debajo, alineado a la izquierda; columna 1 max-content para que la imagen width:auto determine el ancho. El modal móvil no debe tener desplazamiento horizontal.
- Diagnóstico: coexistían reglas móviles con columna 36vw y max-content; los logos anchos podían aumentar el ancho intrínseco de la cuadrícula. #modalDetalle y #detalleCompleto no limitaban overflow-x, aunque ambos participaban en el scroll. El ancho móvil de #detalleCompleto ya usa box-sizing:border-box global y no explica por sí solo el desplazamiento.
- Implementación: consolidar la cuadrícula de cortes, establecer filas/columnas explícitas y overflow-x:hidden en el modal y el contenedor de detalle. Se preservan alturas de logo (120 px escritorio / 60 px móvil), propiedades object-fit, dimensiones y orden de botones, márgenes de divisor/metadatos.
- Validaciones pendientes: suite BETA-026 tras actualizar contrato CSS; regresión completa CI; inspección visual en Beta móvil/escritorio. No desplegar Apps Script ni tocar datos externos.

### Cierre local — GP-UX-CUT-MODAL-HEADER-GRID-02 — 2026-11-18
- Commit de implementación: 3a1450c6296af715d76fa9ef039d404af36a49d3. Rama GPSpedia2.2.5_work verificada; GPSpedia2.2.5 permanece intacta en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Cabecera 2x2 implementada: logo columna 1, filas 1-2; acciones columna 2, fila 1; modelo columna 2, fila 2; divisor fila 3. Primera columna max-content e imagen width:auto. Altura del logo conservada: 120 px escritorio / 60 px móvil. Orden y tamaños de acciones intactos.
- Causa del scroll horizontal: desbordamiento intrínseco de la columna max-content del logo ancho con acciones nowrap, sin límites overflow-x en los dos contenedores desplazables. Se limita overflow-x en el modal de corte y #detalleCompleto.
- CutDetailModalLayout: 26/26 PASS. Regresión global CI: 145 suites, 2,142 pruebas aprobadas, 0 fallos. Verificación sintáctica PASS. GitHub Pages build/deploy SUCCESS; health remoto GET-only SUCCESS.
- Validación visual en navegador móvil/escritorio real queda diferida a Beta. No se desplegaron servicios Apps Script ni se modificaron datos externos.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.


### Continuidad — GP-UX-CUT-MODAL-HEADER-GRID-02 — 2026-11-18
- Rama: GPSpedia2.2.5_work. Rama base GPSpedia2.2.5 verificada sin cambios en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Los commits de implementación de esta adenda son c75a3700294eb6160f0616c30f111c1d2923c1fa (style.css) y 7e4490bac58163a3cffe2092fe7f7563a3f2441e (JS/Tests/CutDetailModalLayout.mjs).
- Hallazgos corregidos: falta de separación vertical entre acciones y modelo; padding horizontal algo excesivo en los botones; divisor azul con width calc superior al contenedor y margen asimétrico.
- El logo conserva width:auto, contenedor sin padding vertical y alturas 120 px escritorio / 60 px móvil. Se mantiene cuadrícula 2x2, primera columna max-content, overflow-x limitado al modal de corte y orden de botones.
- Registros actualizados: Tareas_Pendientes.md, Auditoría.txt y ChangesLogs.txt.
- Pendiente: ejecutar CutDetailModalLayout.mjs y la regresión aplicable en CI; revisar el diff final. Validación visual real en móvil/escritorio queda diferida a Beta. No se afirma que la prueba automatizada haya sido ejecutada ni aprobada.


### Cierre local — GP-UX-CUT-MODAL-HEADER-GRID-02 — 2026-11-18
- Corrección de test: una aserción móvil heredada seguía exigiendo align-items:flex-end y align-self:flex-end. Se actualizó para comprobar align-items:flex-start, align-self:flex-start y margen superior de 6 px.
- Commit de corrección de contrato: d331c39cd12c7de59e6554a4c4e7caa77ceb794e.
- GitHub Actions 44229400787 SUCCESS: 145 suites, 2,143 pruebas aprobadas, 0 fallos; CutDetailModalLayout 27/27 PASS; sintaxis de módulos modificados PASS.
- GitHub Actions 44229400782 SUCCESS: health de servicios desplegados, solo lectura.
- Estado local: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Pendiente inspección visual real del modal en móvil y escritorio; no se afirma que dicha inspección haya sido realizada.
- Rama base GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.


### GP-PWA-RECENT-VIEWS-02 — corrección de carga intermitente (2026-11-18)
- Rama autorizada: GPSpedia2.2.5_work. HEAD al preparar el cierre documental: consultar ref remoto; rama base protegida GPSpedia2.2.5 sin modificaciones.
- Diagnóstico confirmado: la consulta del historial hacía getAll() sobre todo el objectStore viewedItems (todas las cuentas y registros históricos); la escritura no limitaba el tamaño persistido. Además, getViewedItems transformaba errores de performOp en [] y loadUserLocalActivity no reintentaba, de modo que un fallo temporal se confundía con historial vacío durante el resto de la sesión.
- Implementación: offline.js eleva DB_VERSION a 5 y agrega índice ownerId; lectura por propietario; retención de 20 vistos por cuenta; nueva API getViewedItemsResult distingue disponibilidad de lista vacía. auth.js reintenta de forma progresiva y no bloqueante (1.5 s, 5 s, 15 s), conserva el estado en memoria y valida la sesión/propietario antes de aplicar una respuesta tardía. El render y la carga del catálogo no esperan por IndexedDB.
- Aislamiento: al cambiar directamente de propietario se limpia la actividad local anterior. No se modifica el catálogo ni la lógica de permisos.
- PWA: CACHE_NAME actualizado a gpsepedia-cache-v70 para invalidar los módulos cache-first.
- Pruebas en SHA 0c3e6fc191d86801793150eb5aac46217ba4845d: RecentlyViewedCarousel 13/13 PASS; IndexedDB transaction tests 51/51 PASS; 145 suites / 2,153 pruebas / 0 fallos; node --check PASS. Se actualizó la expectativa de esquema en AdminDriveAuditIndexedDB para DB_VERSION 5, conservando el escenario de lectura de datos heredados de v4.
- Estado local: COMPLETADA CON VALIDACIÓN DIFERIDA. Falta comprobar actualización del Service Worker y recuperación multi-pestaña/dispositivo en Beta; no se desplegaron servicios Apps Script ni se modificaron hojas, Drive o datos externos.


### Cierre y verificación final — GP-PWA-RECENT-VIEWS-02 — 2026-11-18
- Código funcional validado en SHA f9b054e1a7a63986d0d63b3be3953ad868d31db6; la rama de trabajo incluye después solo actualizaciones documentales en Tareas_Pendientes.md, Auditoría.txt, ChangesLogs.txt y este checkpoint.
- GitHub Actions 44240071252 SUCCESS: 145 suites, 2,153 pruebas aprobadas, 0 fallos; RecentlyViewedCarousel 13/13 PASS; IndexedDB transaction tests 51/51 PASS; sintaxis de módulos modificados PASS.
- Health de servicios (solo lectura) 44240071231 SUCCESS. No se desplegó Apps Script ni se modificaron hojas, ScriptProperties, Drive o datos externos.
- Service Worker CACHE_NAME v70 y sus expectativas automatizadas quedaron alineados. El workflow de GitHub Pages del SHA de código fue cancelado por commits documentales posteriores; comprobar el workflow más reciente de la rama antes de afirmar publicación.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. Pendiente Beta: actualización efectiva de PWA instalada, historial real con 20 elementos, bloqueo/liberación de IndexedDB y varias pestañas/dispositivos. No se debe interpretar un fallo de IndexedDB como historial vacío ni bloquear el catálogo.


### Continuidad — GP-PWA-RECENT-VIEWS-03 — 2026-11-18
- Rama: GPSpedia2.2.5_work; HEAD de partida confirmado 878e205837863828567b57d192b3979a2e32d60a. La rama base protegida no se modifica.
- Requisito: carrusel exclusivamente local (IndexedDB/miniaturas); servidor recibe solo eventos estadísticos de visualización, sin servir historial ni imágenes. Telemetría silenciosa, no bloqueante y autenticada.
- Se detectó que la limpieza genérica de IndexedDB incluía viewedItems y ejecutaba clear(), eliminando registros locales de otras cuentas del mismo navegador.
- Cambios preparados: limpieza selectiva por ownerId; nueva acción FEEDBACK recordVehicleView que registra solo ID de vehículo, tipo de evento y actor/fecha verificados; carrusel sin consulta remota; caché PWA v71.
- CI final: Actions 44296180571 SUCCESS en SHA 9a3e139f0a0763894f804a44447f0d21f07c832c; 146 suites, 2,174 pruebas, 0 fallos; RecentlyViewedCarousel 21/21, RecentlyViewedActivityTelemetry 12/12, AdminClientCacheDeletion 9/9 y sintaxis PASS.
- Pages build/deploy 44296179354 SUCCESS en el mismo SHA; health 44296180705 SUCCESS, solo lectura. La acción FEEDBACK nueva no se invocó contra Apps Script ni hojas reales; validación remota pendiente de Beta. La rama base permanece intacta.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.


### Adenda de continuidad — GP-PWA-RECENT-VIEWS-03 (2026-11-18)
- La telemetría de visualización incluye ID del vehículo y valores numéricos válidos de `utilCorte1`, `utilCorte2`, `utilCorte3`; FEEDBACK valida sesión y valores y guarda el detalle mínimo en ACTIVITY.
- El carrusel sigue siendo exclusivamente local: IndexedDB usa claves compuestas usuario/vehículo y consulta solo el índice del propietario activo.
- La limpieza local vacía `viewedItems` junto con los almacenes reconstruibles. No llama a la API de actividad ni elimina el historial estadístico del servidor.
- Caché PWA v72. Pruebas locales pendientes de ejecución; servicio FEEDBACK desplegado y dashboard pendientes de Beta. No se desplegó Apps Script ni se modificaron hojas/datos externos.


### Corrección adicional de aislamiento entre sesiones (2026-11-18)
- `auth.js` ya no fusiona los vistos recuperados del propietario actual con el estado anterior en memoria. Limpia el carrusel al comenzar la carga y lo reemplaza exclusivamente con los registros locales filtrados por `ownerId`.
- La persistencia local mantiene clave compuesta usuario/vehículo; no se usa la actividad remota para reconstruir vistos.
- La limpieza de caché local vacía el almacén `viewedItems` y no modifica registros ACTIVITY del servidor.


### Continuidad — GP-PWA-RECENT-VIEWS-03 — reconciliación de pruebas (2026-11-18)
- Se resolvió la consulta del HEAD usando `fetch_commit` con la referencia de rama `GPSpedia2.2.5_work`; HEAD anterior: `6f9df2a3da7cf3b4649e94a3ed827c5fcafde0fb`. El último commit previo era documental (`checkpoint.md` solamente).
- Se revisó la cadena reciente: `b0040aee` corrige contaminación de `viewedItems` en memoria al cambiar de cuenta; la hidratación ahora limpia el estado anterior y lo reemplaza por el resultado IndexedDB filtrado por `ownerId`.
- Se detectó que `RecentlyViewedCarousel.mjs` conservaba aserciones incompatibles con el requisito definitivo de limpieza total local. Corregido para verificar que `viewedItems` sí se limpia junto con los almacenes reconstruibles, sin llamadas a FEEDBACK/ACTIVITY.
- Commit de la prueba: `dae20bf50f8a40a669ce02ed7668ac8e0e19a086`.
- Nueve verificaciones estáticas de contrato pasaron. La suite Node completa y CI posterior al cambio siguen pendientes de evidencia; no se marca como regresión integral aprobada.
- Se mantiene pendiente la validación Beta del servicio FEEDBACK y de la PWA instalada. No se desplegaron servicios Apps Script ni se modificaron datos externos.

### Cierre — GP-PWA-RECENT-VIEWS-03 y GP-UX-CUT-BRAND-LOGO-BOTTOM-01 — 2026-11-18
- Rama de trabajo: `GPSpedia2.2.5_work`. HEAD de código validado: `37d3cfb9f1681ab69623959fa5897a9dd89ae498`; rama base protegida `GPSpedia2.2.5` verificada sin cambios en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- GP-PWA-RECENT-VIEWS-03: corregido el test heredado que esperaba una firma obsoleta de telemetría y se agregó resumen numérico para el runner. Se conserva el comportamiento de producción; no se cambió el envío remoto ni la política de limpieza/aislamiento.
- Tarea adicional GP-UX-CUT-BRAND-LOGO-BOTTOM-01: `style.css` fija `object-position:left bottom` en el logo del modal de corte. Se conservan width:auto, max-content, grid, 120 px escritorio / 60 px móvil, acciones y límites horizontales. `CutDetailModalLayout.mjs` cubre la propiedad en escritorio y móvil.
- CI `44310667618` SUCCESS: 146 suites, 2,154 pruebas aprobadas, 0 fallos; RecentlyViewedActivityTelemetry 12/12, AdminClientCacheDeletion 9/9, CutDetailModalLayout 27/27; sintaxis PASS. Pages `44310666058` SUCCESS. Health `44310667649` SUCCESS, solo GET de diagnóstico.
- Estados: ambas tareas COMPLETADAS CON VALIDACIÓN DIFERIDA. Pendiente Beta: inspección visual en móvil/escritorio, comportamiento PWA/IndexedDB real y validación de FEEDBACK desplegado. No se desplegó Apps Script ni se modificaron datos externos.
### Corrección efectiva del encabezado del modal de corte — 2026-11-18
- Se rectifica el diagnóstico anterior de GP-UX-CUT-BRAND-LOGO-BOTTOM-01: `object-position:left bottom` ya estaba aplicado, y el contenedor específico del logo ya tenía `align-items:flex-start`; el desplazamiento visible provenía del título del modelo anclado al inicio de la segunda fila.
- `style.css`: el título y el campo de edición usan ahora `align-self:end` en escritorio y móvil, para alinear la base del modelo con la base visual del logo sin cambiar dimensiones ni distribución horizontal.
- `JS/Tests/CutDetailModalLayout.mjs`: contrato actualizado para exigir alineación inferior del modelo en ambas variantes.
- CI `44328013474` SUCCESS: 146 suites, 2,154 pruebas aprobadas, 0 fallos; CutDetailModalLayout 27/27; sintaxis PASS.
- Pendiente únicamente aceptación visual en navegador y dispositivos reales durante Beta. No se desplegaron servicios ni se modificaron datos externos.

### Rectificación de posición del logo y nombre del modelo — 2026-11-18
- Se revierte únicamente la alineación inferior introducida en la corrección anterior: .detail-modal-title-text y .detail-modal-title-input vuelven a align-self:flex-start en escritorio y móvil, recuperando la posición anterior al commit de alineación inferior.
- style.css: el contenedor del logo deja de abarcar las filas 1 y 2 y pasa a la fila 2, junto al nombre del modelo. Ambos comienzan con margen superior de 6 px; el logo usa object-position:left top. Se conservan width:auto, columna max-content, alturas 120 px/60 px, gap, acciones, divisor y límites horizontales.
- JS/Tests/CutDetailModalLayout.mjs: expectativas actualizadas para la ubicación conjunta del logo y el modelo en escritorio y móvil.
- CI 44329759542 SUCCESS: 146 suites, 2,154 pruebas aprobadas, 0 fallos; comprobación sintáctica PASS. Validación visual real en navegador/dispositivos queda pendiente de Beta.
- Commits de implementación: CSS 43dd523e16fbab68865a98ed6688cd0a89cc8dad; pruebas 7793b9561ceb1d89e4c4aa77a58ccdf3d8dd7b79. No se modificaron servicios desplegados ni datos externos.

### Rectificación final: contenedor del logo en dos filas — 2026-11-18
- Se corrige la interpretación de la instrucción: `.detail-modal-title` conserva `grid-column:1` y `grid-row:1 / span 2`, pero el propio contenedor se desplaza al fondo del espacio combinado mediante `align-self:end`. La imagen permanece alineada arriba dentro del contenedor (`align-items:flex-start`, `object-position:left top`).
- El nombre del modelo y el campo de edición permanecen en la segunda fila de la segunda columna (`grid-row:2`, `align-self:flex-start`), con margen superior de 6 px. No se altera su posición anterior.
- Aplicado en escritorio y móvil; se conservan width:auto, max-content, 120 px/60 px, gap, acciones, divisor y límites horizontales.
- `JS/Tests/CutDetailModalLayout.mjs`: contratos separados para el contenedor de dos filas, su alineación inferior, la imagen interna y el título en segunda fila.
- CI `44331015148` SUCCESS: 146 suites, 2,154 pruebas aprobadas, 0 fallos; `CutDetailModalLayout` 27/27; sintaxis PASS. Inspección visual real en navegador/dispositivos sigue pendiente de Beta.
- HEAD de implementación y pruebas: `547ba48b56873805c7b2169c774b134224e4a36a`. Rama base sin modificar.

### Corrección de filas del logo y carga paralela de Vistos Recientemente — 2026-11-18
- HEAD verificado: `ff0394073a3e5a4fa14cc513cfae8c1c33de3e24`; rama `GPSpedia2.2.5_work`. Base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.
- Modal de corte: se retiró `minmax(30px, auto)` / `minmax(26px, auto)` de la segunda fila. La causa era que esa fila formaba parte del área de dos filas del contenedor del logo, alineado al final; al crecer la fila, el logo subía. Ahora solo el título se coloca en la fila 3 y empuja hacia abajo el divisor (fila 4) y el indicador (fila 5), sin alterar la altura de las filas del logo.
- Vistos Recientemente: la lectura de IndexedDB ya era asíncrona y concurrente con el inicio cache-first del catálogo. La demora visible adicional provenía de que el suscriptor reconstruía todas las categorías con `mostrarCategorias()` cuando llegaba `viewedItems`. Se agregó un ancla estable y una función que actualiza exclusivamente el carrusel; el catálogo no se vuelve a vaciar ni renderizar por ese cambio.
- Se conserva el historial local aislado por `ownerId`; el carrusel no consulta el servidor y la telemetría sigue siendo independiente y no bloqueante. No se modifica ACTIVITY ni se despliegan Apps Script.
- Archivos de producción: `style.css`, `JS/Frontend/ui.js`, `service-worker.js` (CACHE_NAME v73). Contratos: `CutDetailModalLayout.mjs`, `RecentlyViewedCarousel.mjs`, `ServiceWorkerCache.js`, `OfflineBrandAssets.mjs`, `PasswordRecovery.mjs`.
- Validación: Actions `44394961438` SUCCESS, 146 suites / 2,155 pruebas / 0 fallos; CutDetailModalLayout 28/28; RecentlyViewedCarousel 1/1; ServiceWorkerCache 12/12; OfflineBrandAssets 4/4; sintaxis PASS. Pages `44394961041` SUCCESS; health GET-only `44394961427` SUCCESS.
- Pendiente Beta: comprobar visualmente en móvil/escritorio que el logo no se mueve y el título empuja los elementos inferiores; medir carga en frío/caliente y PWA instalada con catálogo cacheado, historial local y IndexedDB lento/bloqueado. No se afirma validación visual real.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA A BETA.


### Continuidad — validación inicial de deployments y hallazgo Inbox — 2026-11-18
- Rama autorizada: `GPSpedia2.2.5_work`; HEAD de partida `6c82a9f6ee255f86f9cdfc7986c0545644bea411`. Rama base `GPSpedia2.2.5` verificada en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones.
- El usuario informó que desplegó los servicios y actualizó `JS/Frontend/api-config.js` y las URL de CATALOG/AUTH/WRITE/FEEDBACK en `JS/Services/admin.js`.
- Se ejecutó CI en el HEAD de partida: Actions `44418444614` SUCCESS, 146 suites, 2,155 pruebas aprobadas y 0 fallos.
- La primera ejecución de salud `44418444553` dio 7/7, pero se detectó que el workflow fijaba un SHA histórico `301c7b3a...`; por ello no se consideró evidencia válida de las URL recién configuradas.
- Se corrigió `.github/workflows/deployed-service-health.yml` para tomar `${{ github.sha }}` y comprobar las URL del commit que dispara la ejecución.
- En el nuevo HEAD `d01019af19e026aabd1ac69ec63cc2fd29c5aa1c`, health Actions `44418836521` SUCCESS: 7/7 servicios disponibles mediante GET `?debug=true`, sin POST ni escrituras: ADMIN v2.7.1 (1862 ms), AUTH v2.2.5 (1589 ms), CATALOG v2.4.0 (995 ms), FEEDBACK v1.2.2 (1414 ms), USERS v2.4.2 (873 ms), UTILITIES v1.5.0 (1022 ms), WRITE v2.3.1 (1131 ms).
- Regresión Actions `44418836654` SUCCESS: 146 suites, 2,155 pruebas aprobadas, 0 fallos. No equivale a pruebas funcionales con sesión ni a mutaciones de negocio.
- Se agregó a `lista_beta_parte2.txt` el hallazgo `BETA-INBOX-PREVIEW-HTML-01`: el usuario reporta que la vista previa del Inbox muestra etiquetas HTML literales, mientras el detalle renderiza correctamente colores y formatos. Queda pendiente reproducción, corrección y regresión Beta; no se modificó el código del Inbox.
- También se registró `BETA-SERVICES-HEALTH-01` con el resultado read-only y sus límites.
- Pendiente: ejecutar pruebas funcionales de AUTH/USERS/WRITE/FEEDBACK/Inbox y operaciones protegidas en el entorno Beta aislado, con cuentas y datos de prueba autorizados; comprobar permisos/secretos y escrituras controladas. No ejecutar operaciones de negocio sobre datos productivos.
- Estado de esta etapa: disponibilidad remota comprobada; regresión local aprobada; validación funcional Beta parcialmente pendiente.


### Nuevo hallazgo de validación Beta — BETA-CUT-MODAL-HEADER-LONG-MODEL-01 (2026-11-18)
- El usuario reporta que el salto de línea correcto de un nombre de modelo largo en la cabecera del modal de detalle de corte hace que el logo suba en vez de empujar hacia abajo el divisor azul y los elementos inferiores.
- El desplazamiento puede dejar los botones de edición e impresión ocultos o parcialmente cubiertos por el logo. En móvil horizontal, el logo puede quedar por encima del nombre del modelo.
- Registrado en `lista_beta_parte2.txt` con reproducción, resultado esperado y pruebas pendientes para escritorio, móvil vertical/horizontal, títulos cortos/largos, visibilidad de acciones y ausencia de scroll horizontal.
- Estado: REPORTADO POR EL USUARIO · PENDIENTE DE REPRODUCCIÓN, DIAGNÓSTICO Y VALIDACIÓN VISUAL BETA. No se modificó código de producción.


### Continuidad Beta — Hallazgos adicionales del panel ADMIN (2026-11-18)
- Se registraron en `lista_beta_parte2.txt` los identificadores: BETA-ADMIN-HEALTH-EVENTS-01, BETA-ADMIN-GLOBAL-TRAFFIC-01, BETA-ADMIN-SERVICE-TELEMETRY-02, BETA-ADMIN-LOGS-CLEAR-FEEDBACK-01, BETA-ADMIN-LOG-RETENTION-UI-01, BETA-AUDIT-CUT-UNUSED-IMAGES-PASS-01.
- Escaneo de salud: la consola reporta `events is not defined` de forma repetida; pendiente rastrear referencia/ámbito e inicialización de `events`.
- Tráfico global: el panel informa `No fue posible recuperar el agregado global; Respuesta de telemetría no válida`; pendiente contrastar contrato, payload, autenticación y normalización.
- Panel de servicios: el usuario solo visualiza salud de CATALOG; faltan datos de salud/tráfico de los otros servicios, y tráfico en navegador móvil y agregado global. Pendiente separar fallos de endpoint/telemetría de fallos de renderizado.
- Limpieza: el mensaje de éxito al borrar logs/actividad no distingue claramente el caso sin registros que eliminar. Selector de retención (últimos 7 días / eliminar todos) sin estilo, demasiado grande y desbordado del viewport.
- PASS reportado por el usuario: auditoría de carpeta de cortes para detectar imágenes sin uso funciona. No se atribuyen pruebas adicionales.
- Estado: hallazgos reportados, aún no reproducidos ni corregidos. No se modificó código de producción en esta actualización documental.


### Continuidad Beta — nuevos reportes de modal, Inbox y auditoría de imágenes (2026-11-18)
- IDs registrados: BETA-CUT-MODAL-IMAGE-CONTAINER-PADDING-01, BETA-INBOX-SHARED-COORDINATOR-AUTH-01, BETA-ADMIN-IMAGE-AUDIT-CONCURRENCY-01, BETA-ADMIN-CUT-IMAGE-AUDIT-COVERAGE-01, BETA-ADMIN-CUT-IMAGE-LIBRARY-INVENTORY-01, BETA-ADMIN-CUT-IMAGE-VEHICLE-MATCH-01 y BETA-ADMIN-CUT-IMAGE-REPLACEMENT-LINK-01.
- Modal de corte: reducir/eliminar padding horizontal y vertical del contenedor de imagen, preservando composición y comportamiento responsive.
- Inbox: usuario reporta «Servicio no autorizado para el coordinador compartido». Diagnóstico pendiente sobre autorización, identidad, token/contexto de sesión y contrato Inbox-Coordinator. No relajar controles de acceso.
- Auditoría concurrente: comprobar si interfiere con Inbox u operaciones que utilizan Coordinator; revisar locks, leases, contención y liberación. No hay causalidad demostrada.
- Cobertura: verificar recorrido completo de carpeta de cortes y subcarpetas y comparación con referencias de todas las hojas Spreadsheet, excluyendo únicamente la hoja de imágenes reemplazadas al determinar uso vigente.
- Biblioteca: cada imagen sin referencia debe registrar nombre, fecha de creación si está disponible, tamaño, ruta completa, URL visualizable, modelo relacionado, imagen vigente relacionada y estado/procedencia. Ejemplo de ruta: Cortes/SUV/Toyota/Prado/LTX/2024-2027/toyota_prado_ltx_boton_imagenVehiculo.png.
- Relación vehículo-imagen: coincidencia normalizada por marca/modelo/año/encendido/tipo de corte; usar ruta como criterio complementario. Registrar método/confianza y dejar ambigüedades para revisión.
- Clasificación: «Reemplazada» solo con evidencia de sustitución vigente; si no se demuestra, «Sin uso» o revisión pendiente. No borrar ni mover archivos automáticamente.
- El PASS anterior reportado por el usuario acredita únicamente que la detección se ejecutó; no demuestra cobertura completa, clasificación, persistencia ni biblioteca.
- Estado: reportes/requisitos registrados; no se inspeccionó ni modificó código. Causa del error Inbox y posible interferencia siguen sin verificar.



### Continuidad Beta — consola de auditoría y organización automática de imágenes (2026-11-18)
- Nuevos IDs: BETA-ADMIN-CUT-IMAGE-AUDIT-CONSOLE-01, BETA-ADMIN-CUT-IMAGE-ORGANIZER-AUDIT-01, BETA-ADMIN-CUT-IMAGE-ORGANIZER-STRUCTURE-01, BETA-ADMIN-CUT-IMAGE-ORGANIZER-REGISTRATION-CONSISTENCY-01, BETA-ADMIN-CUT-IMAGE-ORGANIZER-NAMING-01 y BETA-ADMIN-CUT-IMAGE-FUNCTION-CODES-01.
- Consola: revisar la confirmación del registro de imágenes detectadas, actualmente solicitada desde consola del desarrollador. El modal de auditoría debe presentar la consola de cortes como salida centralizada para lotes, conteos, carpetas, resultados, coincidencias y errores, en sustitución de indicadores independientes.
- Organización automática: auditar lectura fila por fila de las hojas Cortes y Logos y verificar ubicación por categoría/marca/modelo/versión o encendido/rango de años. El logo se almacena en el primer nivel de la carpeta de marca.
- Estructura ejemplo: Cortes/Autobus/Hyundai/County/llave/2020-2026/archivos de imagen; hyundai_logo.png en el directorio Hyundai.
- Coherencia de altas: revisar que registrar un corte, un nuevo modelo y un nuevo logo genere rutas compatibles con la estructura canónica.
- Nomenclatura: Modelo_versión-o-encendido_año-o-rango_función.extensión; conservar extensión original y evitar colisiones. Ejemplos Hilux_srv_2020_2025_imagenVehiculo.png, Hilux_srv_2020_2025_ign1.jpg, Hilux_srv_2020_2025_bomba1.jpg, Hilux_srv_2020_2025_btn.jpg y Hilux_srv_2020_2025_ign2.jpg.
- Códigos: ign (ignición), bomba (bomba de combustible), btn (señal al botón), apert (apertura), alim (alimentación), alim2 (alimentación 2), shock (señal al ahogador). Numeración para recursos múltiples de la misma función.
- Estado: requisitos registrados; auditoría de código y pruebas de ejecución pendientes. No se modificaron archivos de Drive ni datos de Spreadsheet.


### Continuidad — auditoría estática de consola y organizador de imágenes (2026-11-18)
- Repositorio: infogpstech/GPSpedia. Rama de trabajo: GPSpedia2.2.5_work. HEAD confirmado al iniciar: bed9f15814badc314f664bfc9e627cd9f875ed2f. Rama base protegida GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin cambios.
- Se leyó NORMAS_DESAROLLO.md, README.md, contexto_personal.md y este checkpoint; Tareas_Pendientes.md se consultó como backlog consolidado y lista_beta_parte2.txt para los requisitos nuevos. No existe Tareas_Activas.md en el árbol.
- Workflows del HEAD de partida: service regression 44434875091 SUCCESS; health remoto read-only 44434875116 SUCCESS; Pages build/deploy 44434874438 SUCCESS. Los tres apuntan al SHA bed9f15814badc314f664bfc9e627cd9f875ed2f. La revisión de workflows no sustituye las pruebas funcionales Beta.
- Auditoría estática completada y registrada en Auditoría.txt. Hallazgos principales: (1) el modal fragmenta salida en resumen/contadores/lista y la confirmación se pide en la terminal global; (2) el organizador procesa solo imagenVehiculo de Cortes, no Logos ni los otros siete campos; (3) la comprobación de referencias para mover usa solo campos de Cortes, aunque el snapshot general sí inspecciona las demás hojas; (4) handleAddLogo guarda en Cortes/Logos en lugar de la carpeta de marca; (5) nomenclatura usa anoDesde y sufijos heredados, sin rango completo/catálogo de funciones solicitado; (6) la ruta heredada getOrCreateSubFolder/mergeFolders puede enviar carpetas origen a papelera aunque una transferencia interna haya fallado.
- Severidad: alta para referencias fuera de Cortes no protegidas y fusión parcial de carpetas; media para cobertura, consola, rutas de logos y nomenclatura.
- No se modificó código ni se ejecutaron operaciones sobre Drive/Spreadsheet. No se movió, renombró, sobrescribió ni eliminó ningún archivo.
- Siguiente paso inmediato: implementar BETA-ADMIN-CUT-IMAGE-AUDIT-CONSOLE-01 (consola única dentro del modal y confirmación explícita con resultados por archivo coherentes), preservando el backend de inventario y los permisos. Después construir un dry-run del organizador para Cortes/Logos y los ocho campos, comprobar referencias en todas las hojas y corregir rutas/nomenclatura/altas. No habilitar movimientos masivos hasta que el diagnóstico y rollback estén probados.
- Estado: auditoría estática completada; implementación pendiente. Mantener intacta la rama base.


### Implementación — consola de auditoría de Cortes (2026-11-18)
- Se conserva el requisito de confirmar «sí/no» desde la terminal global del Desarrollador; no se sustituye por window.confirm. El modal incorpora una consola de salida principal y registra en ella la solicitud y el resultado de la confirmación.
- Cambios preparados: consola cronológica dentro del modal; detalle por archivo con clasificación, ruta, nombre, ID, tamaño y fecha; resumen por lote y carpeta; rutas realmente visitadas devueltas por ADMIN; conteos acumulados y errores visibles.
- Se corrigió la conciliación de resultados de inventario: se admite el estado backend no_confirmada; se rechazan resultados vacíos, IDs no solicitados y duplicados; savedCount, blockedCount, errorCount y noLongerConfirmedCount deben coincidir con los estados individuales antes de habilitar movimientos.
- Pruebas de contrato ampliadas: CortesImageReconciliationUI y AdminImageScanCoordinatorContract. CI pendiente de confirmar en el nuevo HEAD.
- No se ejecutaron acciones reales sobre Drive/Spreadsheet. La organización automática de imágenes continúa pendiente de la auditoría/implementación separada; no mover ni renombrar archivos hasta completar dry-run y protección de referencias.


### Cierre y continuidad — consola de auditoría / inicio de organizador (2026-11-18)
- Repositorio: infogpstech/GPSpedia. Rama de trabajo: GPSpedia2.2.5_work. HEAD verificado: d81894f53e6036a1b3d0e0e86b317ad913ec42ee. Rama base protegida GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin cambios.
- Consola de auditoría de Cortes: IMPLEMENTADA. El modal presenta la consola cronológica como salida principal, conserva las miniaturas históricas/sin uso como vista complementaria, informa carpetas y archivos por lote, y muestra metadatos y resumen. La confirmación sigue en la terminal global del Desarrollador. Se corrige la conciliación de no_confirmada y los conteos de ADMIN.
- Mitigación de integridad de logos: handleAddLogo ahora utiliza findOrCreateSubFolder en vez de getOrCreateSubFolder, evitando que el alta de logo active la fusión heredada de carpetas. El destino sigue siendo Cortes/Logos; la ubicación final por categoría/marca requiere el nuevo organizador.
- Auditoría estática integral del organizador completada y registrada en Auditoría.txt. Hallazgos: normalizeImages restaura archivos de papelera automáticamente, no mueve imágenes a la ruta final, verifica solo el padre inmediato, y su mapa de referencias cubre solo Cortes; organizePrimaryVehicleImages mueve solo imagenVehiculo y también verifica solo Cortes; hay placeholders de metadatos, año con separador incorrecto, sufijos heredados y extensión inferida por MIME. LogosMarca se guarda actualmente en Cortes/Logos.
- CI en HEAD d81894f53e6036a1b3d0e0e86b317ad913ec42ee: workflow 44438717680 SUCCESS — 146 suites, 2,157 pruebas aprobadas, 0 fallos; health read-only 44438717765 SUCCESS; Pages build/deployment 44438717266 SUCCESS.
- No se ejecutaron acciones reales sobre Drive/Spreadsheet ni se desplegaron cambios de Apps Script.
- Próxima tarea P0: implementar un dry-run de solo lectura que recorra los ocho campos de Cortes y LogosMarca, calcule ruta/nombre de destino, contraste todas las referencias activas de todas las hojas y bloquee filas/archivos ambiguos. No habilitar movimientos hasta validar el manifiesto completo.
- P1 posterior: unificar altas de logos y cortes con la estructura destino; corregir nomenclatura, año completo, sufijos funcionales y extensión; implementar aplicación explícita por lotes con confirmación en consola, idempotencia y rollback.
- Mantenimiento documental pendiente: Tareas_Pendientes.md (182,953 caracteres Unicode) y lista_beta_parte2.txt (184,840 caracteres Unicode) ya superan el umbral de 180,000. No seguir añadiendo contenido a esos archivos; rotarlos sin pérdida, verificar reconstrucción exacta y actualizar manifiestos. Hasta entonces, el seguimiento activo se concentra en Tareas_Activas.md.


### Continuidad del organizador — constructor puro (2026-11-19)
- HEAD de código verificado: aa967514d3602f0512a05f9ddf1fafc1c11c0c24. Rama base protegida sin cambios.
- Completado: buildCortesImageOrganizerTargets_ calcula propuestas de ruta y nombre para las ocho columnas de Cortes y LogosMarca, sin acceder a servicios ni ejecutar escrituras.
- El constructor usa el mapa real COLS_CORTES; aplica los códigos funcionales a partir de tipoCorte1/2/3 y bloquea tipos desconocidos, datos incompletos, rangos inválidos, fórmulas, IDs compartidos y logos con categoría no única.
- La extensión original queda pendiente de adjuntarse durante la inspección real del archivo. No se usa MIME para inventar extensiones.
- CI en HEAD aa967514: workflow 44440031631 SUCCESS — 146 suites, 2,157 pruebas aprobadas, 0 fallos; health 44440031388 SUCCESS; Pages 44440029769 SUCCESS.
- No se desplegó Apps Script ni se modificó Drive/Spreadsheet. El helper es código fuente y su validación fue estática/dinámica con fixtures.
- Siguiente paso exacto: conectar un endpoint previewCortesImageOrganizer de solo lectura, validar auditoría Drive completa vigente, inspeccionar metadatos/rutas/extensiones, contrastar referencias activas de todas las hojas, detectar conflictos y generar un manifestDigest. Sin crear carpetas, mover, renombrar, copiar, restaurar ni escribir.


### Continuidad — endpoint backend del dry-run del organizador (2026-11-19)
- HEAD de código verificado: 6e43666b69ff20b7945f5ebe7b7745a7758ce8d0 en GPSpedia2.2.5_work. La rama base protegida GPSpedia2.2.5 no se modificó.
- Implementado ADMIN previewCortesImageOrganizer y declarado como lectura compartida en isSharedReadAction_, api-config y política de Coordinator.
- El endpoint exige auditoría Drive completa, vigente (≤6 h), del usuario actual y coincidente con la última auditoría. Revisa el inventario completo y sus rutas; contrasta referencias activas de todas las hojas; valida historial, archivo, MIME, nombre, ruta y extensión original; inspecciona rutas destino sin crearlas.
- Bloquea referencias compartidas/adicionales, archivos históricos, referencias no verificables, archivos cambiados desde la auditoría, carpetas destino duplicadas, colisiones de nombre y destinos calculados duplicados.
- Devuelve páginas de destinos (25 por defecto, máximo 50), estado ready/already_correct/blocked, motivos, rutas y nombres propuestos, resumen, manifestDigest, writePerformed:false y canApply:false.
- Se corrigió storeDriveAuditSeenPage_ para persistir folderPath, necesario para comparar ubicación actual con la capturada en la auditoría. Por tanto, después del despliegue se debe generar una auditoría nueva; las auditorías antiguas sin folderPath no son compatibles con este preview.
- CI en HEAD 6e43666b69ff20b7945f5ebe7b7745a7758ce8d0: workflow 44443122888 SUCCESS — 146 suites, 2,157 pruebas aprobadas, 0 fallos; health read-only 44443122921 SUCCESS; Pages 44443122280 SUCCESS.
- No se desplegó Apps Script. No se movió, renombró, creó, restauró ni eliminó ningún archivo; no se escribieron datos en Spreadsheet.
- Pendiente: ui.js no está conectado a previewCortesImageOrganizer. Integrar la vista paginada dentro del modal/consola, presentar los resultados por archivo y permitir revisar el digest sin habilitar aún la aplicación. Luego desplegar ADMIN, ejecutar una auditoría Drive nueva y validar el preview real. La aplicación segura por lotes continúa deshabilitada (canApply:false).


### Continuidad — UI conectada al preview del organizador (2026-11-19)
- HEAD de código: bb3f3a1fcf47d328f1ab51a4ab5dc3a93e2e3807. Rama de trabajo GPSpedia2.2.5_work. Rama base protegida GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- index.html incorpora botón «Previsualizar organización» y panel separado dentro del modal de auditoría.
- ui.js recorre previewCortesImageOrganizer por páginas de 25 destinos, comprueba que el digest no cambie, valida offset/total/finalización, muestra resumen y detalle por destino (hasta 500 filas visibles; recorre todos los resultados). Exige writePerformed:false y canApply:false.
- El control solo se habilita tras una auditoría completa. No existe botón de aplicación del organizador y no se realizan mutaciones.
- CI HEAD bb3f3a1fcf47d328f1ab51a4ab5dc3a93e2e3807: workflow 44443503640 SUCCESS — 146 suites, 2,157 pruebas aprobadas, 0 fallos; health read-only 44443503694 SUCCESS; Pages 44443503156 SUCCESS.
- No se desplegó Apps Script ni se ejecutó el preview sobre Drive productivo. El nuevo endpoint exige metadatos folderPath; tras desplegar ADMIN debe ejecutarse una auditoría Drive nueva para poblar esas rutas en caché.
- Siguiente paso exacto: desplegar el servicio ADMIN actualizado, abrir la auditoría Drive, iniciar una auditoría nueva y luego ejecutar «Previsualizar organización». Revisar resultados y bloqueos con datos reales; no aplicar movimientos ni renombrados. Después corregir hallazgos del preview antes de diseñar la aplicación segura y rollback.


### Adenda de continuidad — códigos funcionales del organizador (2026-11-18)
- HEAD de partida confirmado para esta corrección: 7e03b0bb95bbdab627c512aa629522399c0bf08f, rama GPSpedia2.2.5_work; base protegida GPSpedia2.2.5 con merge-base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Auditoría del helper buildCortesImageOrganizerTargets_: el mapeo de tipoCorte1/2/3 ya reconocía ignición, bomba y botón, pero la salida dejaba el primer btn sin sufijo numérico. Los campos de alimentación se etiquetaban alim, alim2 y shock, no como serie uniforme.
- Corrección aplicada: los tres slots se numeran según su función real (ign1..ign3, bomba1..bomba3, btn1..btn3); imgCableAlimen/2/3 producen alim1/alim2/alim3. imgApertura mantiene apert e imagenVehiculo mantiene imagenVehiculo. Tipos no reconocidos o ambiguos siguen bloqueados.
- Pruebas añadidas en AdminImageScanCoordinatorContract.mjs: escenarios de tres slots para cada función (ignición, bomba de combustible y señal a botón), más nombres de las tres alimentaciones y apertura.
- Registros actualizados: Tareas_Activas.md, ChangesLogs.txt y Auditoría.txt. No se añadió contenido a Tareas_Pendientes.md ni lista_beta_parte2.txt por la rotación documental pendiente.
- Commits de esta corrección: admin.js 0dd00118ce71711a4e0dc8bf9189a45dd313d63a; prueba 395e3bacdba867e48e31932d76499a716379c0ae; Tareas_Activas 49c4b8837b85328129230ab74d09321d4120dc14; ChangesLogs 5f72e162e1e6fbb6a71580062bc980e35af27413; Auditoría 29f92657afaa5754bddebb0205b73a451c9b016d.
- Validación: cambios aún sin CI confirmada al momento de esta adenda. No se desplegó Apps Script ni se modificaron Spreadsheet/Drive.
- Siguiente paso: verificar CI/sintaxis en el HEAD resultante; después, conforme al checkpoint del organizador, desplegar ADMIN solo con autorización/entorno Beta, ejecutar una auditoría Drive nueva y revisar el preview real. Mantener canApply:false y no habilitar movimientos/renombrados.


### Validación local de la corrección de códigos — 2026-11-18
- HEAD de la rama antes de esta actualización documental: c463d5c3322d665c1addec6b3b98b4adaa2807cb. Rama base confirmada sin cambios: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Sintaxis: compilación estática de JS/Services/admin.js PASS; compilación sintáctica del módulo JS/Tests/AdminImageScanCoordinatorContract.mjs PASS.
- Ejecución del contrato AdminImageScanCoordinatorContract.mjs con las fuentes actuales recuperadas de la rama y un adaptador local en memoria para sus lecturas de archivos: PASS. Se ejecutaron todas las aserciones del archivo, incluidas las nuevas series ign1..3, bomba1..3, btn1..3, alim1..3 y apert.
- Prueba aislada adicional del constructor puro: PASS para las cinco familias/campos y sus nombres completos. No se invocaron servicios Apps Script, Drive ni Spreadsheet.
- El endpoint de estado combinado de GitHub no devolvió checks para este SHA; la herramienta disponible para workflow runs filtra ejecuciones disparadas por pull request. Por ello CI/Actions no queda acreditada en esta sesión y no se afirma como aprobada.
- Estado local: corrección y contrato completados; validación local reproducible aprobada. Validación CI pendiente de evidencia. Validación Beta pendiente de despliegue ADMIN, auditoría Drive nueva y preview real. Aplicación de movimientos/renombrados permanece deshabilitada.
- Próximo paso: obtener evidencia CI del HEAD publicado y, cuando corresponda al entorno Beta autorizado, desplegar ADMIN, ejecutar auditoría completa nueva y revisar cada destino. No ejecutar operaciones mutadoras.

### Continuidad — plan de ejecución, telemetría y correcciones Inbox — 2026-11-19
- Rama de trabajo: GPSpedia2.2.5_work. HEAD antes de registrar este checkpoint: cdeab69cb241caad1096a7b192ce28fc09b38dc6. Rama base protegida GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1; no modificar.
- El plan de siete fases quedó registrado al inicio de Tareas_Activas.md. Orden obligatorio: completar implementación local y regresión integral antes de cualquier deployment/Beta. No se tocaron Apps Script deployments, ScriptProperties, secretos, Drive, Spreadsheet ni datos productivos.
- BETA-ADMIN-SERVICE-TELEMETRY-02: detalle de servicios, telemetría local efímera y detección de móvil/tableta/escritorio; dos gráficas independientes (global y navegador actual); inventario de siete servicios, LEGACY excluido; módulo en App Shell PWA, caché v74.
- Validaciones locales: ServiceBrowserTrafficContract 9/9; ServiceTrafficAggregatorContract PASS; ServiceTrafficAggregation 6/6; ServiceTrafficAdminContract PASS; sintaxis de módulos productivos PASS. La regresión integral del HEAD final sigue pendiente.
- SERVICE-ARCHITECTURE-SIMPLIFICATION-01: auditoría estática y diseño guardados en Services/SERVICE_ARCHITECTURE_PLAN.md. Se identificó que SharedMutationClient combina transporte con fan-out de invalidación remota a WRITE/FEEDBACK. No cambiar el orden de invalidación/revocación hasta diseñar idempotencia y recuperación de fallos parciales. Próximo subpaso: contrato versionado y pruebas de compatibilidad.
- Corrección de autorización: Coordinator 1.4.1 permite validar contexto de sesión con la identidad/clave de cada servicio activo. AUTH mantiene exclusividad de registro, sincronización y revocación. SharedMutationClient conserva AUTH como default compatible; AUTH, ADMIN, FEEDBACK, USERS y WRITE indican su servicio explícitamente.
- Pruebas de coordinación: SharedMutationCoordinator 68/68 PASS; cada servicio valida con su propio secreto y CATALOG es rechazado.
- Inbox: preview en texto plano, bloques script/style eliminados, entidades decodificadas y resumen limitado a 180 caracteres. El cuerpo completo sigue pasando por sanitizeHtmlContent(..., "advanced"). InboxConversations 66/66 PASS.
- La causa de código del error «servicio no autorizado» en Inbox era que FEEDBACK se identificaba como AUTH usando su secreto propio; se corrigió en fuentes. La coincidencia real de secretos/deployments no se verificó y queda para la etapa Beta autorizada, después de terminar todas las implementaciones locales.
- Commits representativos: Coordinator validateSessionContext befd942e3b3bc3ab679b3a6403001a2ccd7ac03a; Coordinator v1.4.1 aef3b18b6946289efbd251114c9f437df3180001; SharedMutationClient 342121068a63655890b153e00c99e7b5b4f85093; servicios AUTH/ADMIN/FEEDBACK/USERS/WRITE actualizados en fcd2a0a357e02a660a216f4e8129925e80bd2b06, d92eaef75c1b28d047bde52e4019dab1d40eb96d, f2283df2d614a005299921b3ab76380f796b0116, 88f7b0ec9bc5b9324d0797804eab79527a0efda5 y 3a0509ff30673b03f144f0b73f9574f70acef4b7.
- Preview Inbox: helper 127343103bd6d799d50244e6ba2532b8cc99070b; pruebas Inbox actualizadas, último commit 2cc6c7af70057e1c01198d26b18c66dd9d8ef1cb.
- No se afirma CI ni validación Beta. El último HEAD anotado corresponde al commit de Auditoría.txt; este checkpoint y los siguientes registros avanzarán el HEAD.
- Siguiente ejecución: completar pruebas de contratos versionados/compatibilidad de Coordinator y SharedMutationClient; después revisar configuración de secretos con fallback legacy sin consultar valores remotos. Continuar con controles ADMIN, Inbox restante y auditoría/organizador de imágenes. No desplegar hasta cerrar todas las implementaciones y regresión integral.

### Continuidad — contrato versionado e invalidación remota central — 2026-11-19
- HEAD antes de registrar este checkpoint: 892706fed8049447ef059e9808d9b2ba949a335f. Rama GPSpedia2.2.5_work; rama base protegida GPSpedia2.2.5 = d9acc68d889985c2e2f42fe3a02e502efc86ead1 (compare: ahead, behind 0). No modificar base.
- Coordinator 1.4.2/1.4.3 y SharedMutationClient incorporan protocolo POST v1. El cliente envía protocolVersion:1; Coordinator acepta clientes antiguos sin campo como v1 y rechaza versiones no soportadas.
- La invalidación remota de caché se centralizó: AUTH → Coordinator → WRITE/FEEDBACK. Coordinator usa GPSpedia_COORDINATOR_SECRET_WRITE/FEEDBACK y las URLs GPSpedia_SERVICE_URL_WRITE/FEEDBACK; valida ambas configuraciones antes de enviar, subdivide lotes y exige confirmación exacta.
- SharedMutationClient dejó de almacenar/conocer URLs y secretos de WRITE/FEEDBACK para la invalidación. El orden se mantiene: confirmar borrado remoto antes de revocar el contexto central. Los errores parciales fallan cerrados y se pueden reintentar de forma idempotente.
- Las acciones de registro, sincronización y revocación siguen exclusivas de AUTH. La validación de sesión sigue permitida a cada servicio activo con su propio secreto.
- Pruebas aisladas: SharedMutationCoordinator 74/74 PASS. Se cubren protocolo legacy/v1, versión desconocida, identidad por servicio, invalidación remota en lotes, fallo parcial, reintento, revocación individual y global.
- Configuración pendiente por entorno para la futura Beta: crear GPSpedia_SERVICE_URL_WRITE y GPSpedia_SERVICE_URL_FEEDBACK en ScriptProperties del Coordinator, apuntando a los endpoints del mismo entorno. No se leyeron ni modificaron valores remotos.
- No se desplegó Apps Script ni se alteraron secrets, ScriptProperties, Drive o Spreadsheet. CI integral y Beta siguen pendientes.
- Siguiente tarea de implementación: catálogo canónico de URLs/secretos con fallback legacy y matriz de despliegue mínimo. Después continuar controles ADMIN, Inbox y auditoría/organizador de imágenes. La etapa Beta permanece bloqueada hasta cerrar toda implementación y regresión integral.


================================================================================
2026-11-19 — CONTINUIDAD: ARQUITECTURA Y PROTOCOLO COMPATIBLE
- HEAD de inicio confirmado: 97754cabf9ca86d53b12aafca7c92aa2cc53d7e7 en GPSpedia2.2.5_work; rama base GPSpedia2.2.5 sin modificaciones.
- Coordinator 1.4.5 separa versión interna y protocolo. Los clientes sin protocolVersion se fijan a v1; versiones admitidas explícitas; versiones desconocidas rechazadas. SharedMutationClient se conserva sin cambios y continúa usando v1.
- Se documentó matriz de despliegue en Services/SERVICE_ARCHITECTURE_PLAN.md y Services/COORDINATOR_SETUP.md: cambios internos compatibles requieren solo Coordinator; cambios aditivos actualizan solo consumidores que utilicen la nueva acción; cambios locales del cliente afectan solo consumidores que contengan la copia afectada.
- Pruebas ejecutadas localmente en memoria: SharedMutationCoordinator 77/77; CoordinatorCapabilityPreservation 6/6; ServiceTrafficAdminContract 33/33; ServiceTrafficAggregation 6/6; ServiceTrafficBatch 5/5; DirectTrafficRoutingCoverage 6/6; ServiceBrowserTrafficContract 9/9; ServiceTrafficAggregatorContract 5/5. Sintaxis de Coordinator, SharedMutationClient, serviceTelemetry y Service Worker PASS. No equivale a ejecución del runner Node completo ni CI.
- Se añadió CoordinatorCapabilityPreservation.mjs al runner. Cubre RBAC jerárquico, autoeliminación/último Desarrollador, cierre lógico, revocación de sesiones, invalidación de caché WRITE/FEEDBACK y recuperación ante fallos parciales.
- No se desplegó ni modificó ScriptProperties/secretos; no se consultaron endpoints, Drive ni Spreadsheet.
- Próxima tarea: terminar Fase 2 con revisión de configuración y matriz por entorno, y después Fase 4 ADMIN (mensajes de borrado de logs, retención y padding de modal). Mantener Fase 5 auditoría/organizador de imágenes y Fase 6 documentación/rotación. La regresión integral sigue al final; Beta/deploy solo después y con autorización.
================================================================================


================================================================================
2026-11-19 — CONTINUIDAD: FASE 4 ADMIN
- Se corrigieron los mensajes de limpieza AUTH/Logs y FEEDBACK/ActividadUsuario para distinguir eliminación, ausencia de registros y revisión sin coincidencias. Los fallos parciales continúan devolviendo error y conservan el estado reintentable.
- Selector de retención compactado con opciones «Últimos 7 días» y «Todos (conservar encabezados)», layout grid responsive y ancho mínimo cero.
- Padding de .detail-recommended-cut reducido de 12 px a 8 px; no se alteraron encabezado, logo, nombre ni acciones.
- Pruebas locales ejecutadas: SensitiveLogsTrustedActor 7/7; ActivityLogsClearFeedback 5/5; AdminLogsMaintenanceContract 10/10. Se registraron en RunServiceTests.mjs.
- Fase 4 permanece en progreso por auditoría de métricas/telemetría visibles y validación visual responsive; estas últimas requieren navegador real y se difieren a Beta.
- Siguiente: completar auditoría de telemetría UI (sin modificar la captura local/global ya cerrada), después continuar Fase 5 auditoría y organizador de imágenes. No desplegar ni modificar datos externos.
================================================================================


================================================================================
2026-11-19 — CIERRE LOCAL FASE 4 ADMIN
- Fase 4 queda implementada localmente con validación visual diferida a Beta: mensajes precisos de limpieza AUTH/FEEDBACK, selector de retención compacto, padding del contenedor de corte recomendado reducido y auditoría de telemetría UI.
- Se verificó por contrato que la vista distingue el agregado global Coordinator de las observaciones locales del navegador, selecciona métricas por servicio, excluye LEGACY y adapta el grid a una columna en pantallas pequeñas; las gráficas encapsulan el desplazamiento horizontal.
- Pruebas locales: SensitiveLogsTrustedActor 7/7; ActivityLogsClearFeedback 5/5; AdminLogsMaintenanceContract 10/10; ServiceTrafficAdminContract 33/33; ServiceBrowserTrafficContract 9/9; ServiceTrafficAggregatorContract 5/5; ServiceTrafficAggregation 6/6; ServiceTrafficBatch 5/5; DirectTrafficRoutingCoverage 6/6.
- La inspección visual en navegador real y dispositivo móvil queda reservada a Beta. No se realizó deployment ni se modificaron datos externos.
- Siguiente: iniciar Fase 5, auditoría integral de imágenes y coherencia del organizador, empezando por verificar código actual y cobertura de referencias antes de modificar.
================================================================================

 
================================================================================
2026-11-19 — CONTINUIDAD: AUDITORÍA DE NOMENCLATURA FUNCIONAL DE IMÁGENES
- HEAD de inicio de esta revisión: 95cd706400d6f9cf70d24fde441d4fb2aa66d020. HEAD de implementación: ceafea0c056c24cd593d288124ef248059d10a90. Rama autorizada GPSpedia2.2.5_work; base GPSpedia2.2.5 verificada en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Auditoría de cambios previos: el helper getCorteFunctionSuffix_ aceptaba imageValues, pero no los utilizaba. Se detectó riesgo de ordinales no consecutivos cuando había huecos en los slots de imágenes.
- Corrección publicada: la numeración cuenta solo imágenes anteriores realmente pobladas de la misma función; el slot actual representa el recurso que se está nombrando. Un tipo anterior no reconocido con imagen bloquea el destino.
- Mapeo verificado: ign1..ign3, bomba1..bomba3, btn1..btn3; alim1..alim3; apert; imagenVehiculo. El código oficial para ignición es ign, según el catálogo funcional existente.
- Pruebas aisladas dinámicas: 5/5 PASS para ordinal de recursos presentes, salto de slot vacío, tipo ambiguo y funciones mixtas.
- GitHub Actions run 44522387683 SUCCESS: 152 suites, 2,218 pruebas, 0 fallos; AdminImageScanCoordinatorContract 1/1; LogoIdIntegrity 13/13. Health run 44522387652 SUCCESS. Pages run 44522386244 estaba en espera al registrar.
- No se desplegó Apps Script ni se consultaron/modificaron Drive, Spreadsheet, ScriptProperties o secretos. No se movieron, renombraron, borraron ni restauraron archivos productivos.
- Siguiente: continuar Fase 5 auditando cobertura del inventario, referencias cruzadas e historial de imágenes; mantener la aplicación masiva bloqueada hasta validar preview real y rollback en Beta autorizada.
================================================================================

 
================================================================================
2026-11-19 — CONTINUIDAD: SEPARACIÓN DE INVENTARIO SIN USO E HISTORIAL DE REEMPLAZOS
- HEAD de inicio: 1928a019393d845eca0421126adbb3da15257dd7; HEAD de código validado: 3268f913090065d806c7ede426fb7bce3ba8c7fe.
- Hallazgo: collectReplacedImageHistoryIds_ incorporaba indiscriminadamente IDs de Imagenes_Reemplazadas, incluyendo registros de inventario creados por auditoría Drive con tipo_registro=sin_uso_detectado. Eso los clasificaba como historical y bloqueaba su posible asociación con un destino canónico vacío.
- Corrección: la función interpreta origen_registro, tipo_registro y estado; excluye registros normales sin_uso_detectado y eliminada; conserva reemplazadas y estados protegidos/en revisión. Añadido fallback para filas antiguas sin columnas dinámicas mediante tipo_contenido=inventario_sin_uso.
- Pruebas de regresión: CortesImageReconciliation 34/34; clasificación dinámica 7/7 y prueba integrada que permite que una imagen de inventario sin uso coincida con un destino; CI run 44523981556 SUCCESS: 152 suites, 2,224 pruebas, 0 fallos. Health run 44523981464 SUCCESS. Pages run 44523980626 pendiente al registrar.
- No se desplegó Apps Script ni se modificaron Drive, Spreadsheet, secretos o ScriptProperties. No se aplicaron movimientos ni cambios de URL.
- Siguiente: continuar la auditoría de consistencia del inventario persistente y de las referencias cruzadas; luego revisar clasificación de archivos sin uso/reemplazados en el preview paginado. Beta solo tras cerrar implementación local y con autorización.
================================================================================

 
================================================================================
2026-11-19 — CONTINUIDAD: UNIFICACIÓN DE RUTAS DE ALTA Y ORGANIZADOR
- HEAD de inicio: 9e8c694960ec50a3295081643d98dbcdf2e7e6a1; HEAD validado: 0766fda94d9171c772e0052bff26d65f26deef14.
- Hallazgo: findOrCreateVehicleFolder utilizaba sanitizeForFolderDisplay y getVehicleYearFolderName generaba años con guion bajo; el organizador construía segmentos normalizados con guion medio. Las altas podían crear una ruta distinta de la ruta objetivo del preview.
- Corrección: findOrCreateVehicleFolder ahora normaliza categoría, marca, modelo y versión/encendido con normalizeOrganizerSegment_; el rango se genera como AAAA-AAAA y se rechazan rangos invertidos o segmentos obligatorios ausentes. No se crean carpetas con valores de reemplazo que contradigan el destino canónico.
- Prueba contractual añadida: alta de Hilux genera exactamente Cortes/Camion_pesado/Toyota/Hilux_SRV/SRV/2020-2025; coincide con el formato del organizador. Se comprueba rechazo de rango invertido.
- CI run 44524858005 SUCCESS: 152 suites, 2,224 pruebas aprobadas, 0 fallos; CortesImageReconciliation 34/34; LogoIdIntegrity 13/13; AdminImageScanCoordinatorContract 1/1. Health run 44524858035 SUCCESS. Pages run 44524856139 SUCCESS.
- No se desplegó Apps Script ni se modificaron datos Drive/Spreadsheet. No se movieron, renombraron ni eliminaron archivos.
- Siguiente: completar auditoría local de consistencia del inventario y del registro de altas; después ejecutar verificación integral y preparar Beta con comandos de sincronización seguros. Aplicación masiva sigue deshabilitada.
================================================================================

 
================================================================================
2026-11-19 — ADENDA: VALIDACIÓN ESTRICTA DEL RANGO DE AÑOS
- HEAD de implementación: 147077eb487f2555a7480eb4706b432836f4f330.
- Se endureció getVehicleYearFolderName para aceptar únicamente cuatro dígitos exactos en anoDesde y anoHasta; se rechazan valores parciales, campos vacíos y rangos invertidos. Los años iguales se representan como AAAA-AAAA.
- Prueba dinámica de ruta completa, año único, año inválido, año faltante y rango invertido: 5/5 PASS.
- CI run 44525492921 SUCCESS: 152 suites, 2,224 pruebas, 0 fallos. Health run 44525493007 SUCCESS. Pages run 44525492332 en curso al registrar.
- La ejecución previa 44525337604 falló por una expresión regular generada con escape duplicado; se corrigió y la ejecución posterior aprobó. No quedó fallo reproducible en el HEAD actual.
================================================================================

 
================================================================================
2026-11-19 — CIERRE LOCAL DE FASE 5 / CONTINUIDAD HACIA FASE 6
- HEAD de código y pruebas: 41c844ab9578499c4f49e4e4584bd32a09a0c8e8. Rama de trabajo GPSpedia2.2.5_work. Rama base GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Fase 5 cerrada a nivel de implementación local. La nomenclatura funcional cubre las ocho columnas de imagen: imagenVehiculo; ign1..3; bomba1..3; btn1..3; apert; alim1..3. La numeración de corte cuenta solo imágenes anteriores presentes y bloquea tipos ambiguos.
- Rutas de altas alineadas con el organizador: segmentos normalizados; rango AAAA-AAAA exacto; datos faltantes, parciales o invertidos rechazados.
- Cobertura de referencias verificada por contrato: ocho columnas de Cortes; todas las hojas activas; fórmulas, display values, rich text, imágenes en celda y over-grid; referencias no verificables bloquean.
- Inventario persistente verificado por contrato: auditoría completa, referencias activas, estados protegidos, duplicados, idempotencia, write/read-back, reintento y estado requiere_revision si no se puede reconciliar.
- Clasificación del historial: sin_uso_detectado no se confunde con reemplazada; estados protegidos/revisión se conservan; eliminada se excluye; compatibilidad legacy infiere origen y tipo a partir de tipo_contenido=inventario_sin_uso.
- CI run 44527866474 SUCCESS: 152 suites, 2,224 pruebas, 0 fallos. CortesImageReconciliation 34/34; CortesImageReconciliationApply 15/15; AdminImageTrashLifecycle 40/40; LogoIdIntegrity 13/13; AdminImageScanCoordinatorContract 1/1. Health run 44527866483 SUCCESS. Pages run 44527865547 SUCCESS.
- No deployment Apps Script, no lectura/escritura real de Drive/Spreadsheet, no modificación de ScriptProperties/secretos; no movimientos, renombrados, eliminaciones ni restauraciones.
- Fase 5 solo queda pendiente de Beta real: auditoría completa, revisión visual/funcional del preview, ACL y reconciliación en entorno autorizado. No activar aplicación masiva.
- Siguiente prioridad: Fase 6 documental. Rotar sin pérdida Tareas_Pendientes.md y lista_beta_parte2.txt (superan el umbral); reconciliar Services/SERVICE_HEALTH.md con endpoints fuente. No editar archivos sobredimensionados antes de rotarlos y verificar manifiestos.
================================================================================

 
================================================================================
2026-11-19 — CIERRE FASE 6 DOCUMENTAL / CONTINUIDAD A FASE 7
- HEAD confirmado al iniciar: eadbf468b35022290955a4ee7cceaad820cbb611; rama GPSpedia2.2.5_work. La rama base GPSpedia2.2.5 fue consultada y no se modificó.
- Rotado Tareas_Pendientes.md (182,953 caracteres Unicode; 185,938 bytes UTF-8) en Tareas_Pendientes_parte_001.md y _002.md, con corte en el encabezado «Solicitudes post revisión — 2026-11-16».
- Rotado lista_beta_parte2.txt (184,838 caracteres Unicode; 186,955 bytes UTF-8) en lista_beta_parte2_parte_001.txt y _002.txt, con corte en el separador anterior a AUG-042.
- En ambos casos, la concatenación exacta de las partes reproduce el SHA de blob Git original. Índices y ROTACION_DOCUMENTAL_MANIFIESTO_2026-11-19.md actualizados.
- Services/SERVICE_HEALTH.md reconciliado con versiones fuente: FEEDBACK 1.2.2 y ADMIN 2.7.1. Deployments externos no verificados.
- Tareas_Activas.md actualizado: Fase 6 completada localmente; Fase 7 (regresión integral) es el siguiente paso.
- No se modificó código de servicios, no se desplegó Apps Script y no se consultaron/modificaron secretos, ScriptProperties, Drive ni Spreadsheet.
================================================================================

 
================================================================================
2026-11-19 — CIERRE P1 REGISTRATION CONSISTENCY / REGRESIÓN INTEGRAL
- HEAD inicial de esta corrección: 71ff293d4ceef074b9cbf18235483eb3643acfaf. HEAD final de código/pruebas: c21a196dee2f946194c7c99b489a4af323cd245e.
- handleAddLogo y el preview LogosMarca comparten buildCanonicalLogoDestination_: misma ruta Cortes/categoría/marca y mismo nombre base marca_logo. Categorías inexistentes o ambiguas siguen bloqueadas.
- Primera CI 44532398823 detectó un contrato legado que aún exigía resolveLogoCategoryFromCortesRows_ directamente en handleAddLogo; se actualizó LogoIdIntegrity.mjs al nuevo constructor, sin cambiar la política funcional.
- CI final 44532907478 SUCCESS: 152 suites, 2,224 pruebas, 0 fallos; LogoIdIntegrity 13/13. Health 44532907375 SUCCESS; Pages 44532906078 SUCCESS.
- Fase 5 queda cerrada localmente, incluida coherencia de alta de logos. Fase 7: regresión integral local aprobada; siguiente paso es Beta de solo lectura con autorización. No se desplegó Apps Script ni se modificaron Drive, Spreadsheet, ScriptProperties o secretos.
================================================================================


================================================================================
2026-11-19 — PREPARACIÓN DE SINCRONIZACIÓN SEGURA PARA BETA
- HEAD de inicio verificado: 3e93acc87d9c0465abd443d46a73d52ccbc2cb2f en GPSpedia2.2.5_work; rama base GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- lista_beta_parte1.txt comienza ahora con comandos copiables que comprueban remoto/repositorio, rama autorizada y árbol limpio; luego ejecutan git fetch y git pull --ff-only y muestran el HEAD final.
- La secuencia se detiene si hay cambios locales o si el fast-forward no es posible; no descarta cambios ni utiliza reset --hard, clean o force. lista_beta.txt apunta explícitamente a esta preparación.
- Preparación documental completada. La ejecución de sincronización, deployments Apps Script y pruebas contra servicios/Drive/Spreadsheet quedan pendientes de autorización del entorno Beta.
================================================================================


================================================================================
2026-11-19 — CONTINUIDAD: SIMPLIFICACIÓN DE SESIÓN ADMIN
- HEAD confirmado antes del cambio: 4d26dbe4661b4fe0ceba3289b222ee204f009a65 en GPSpedia2.2.5_work; GPSpedia2.2.5 en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Hallazgo: doPost ADMIN adquiría leases para lecturas y mutaciones ordinarias. La sección 15 prohíbe leases y viajes a Coordinator por acción ordinaria.
- Cambio preparado: ADMIN obtiene actor cacheado y conserva RBAC/auditoría; llamadas ADMIN→WRITE dejan de requerir token de lease y WRITE valida su actor cacheado con userId/sessionToken.
- Resultado: corrección y contratos publicados en GPSpedia2.2.5_work; CI final SUCCESS (152 suites, 2,224 pruebas, 0 fallos). No se realizó deployment Apps Script ni acceso a Drive/Spreadsheet/ScriptProperties.
================================================================================

- CI run 44535834471: sintaxis aprobada; regresión falló por tres contratos de arquitectura anterior. Corrección de contratos y política Coordinator en curso; no se ignoraron los fallos.

- CI run 44536463315: sintaxis de servicios aprobada; fallaron dos contratos por escapes literales introducidos al actualizarlos. Corrección puntual aplicada.


================================================================================
2026-11-19 — CIERRE: SIMPLIFICACIÓN DE SESIÓN ADMIN
- HEAD final de esta tarea: 71894f2e4c391e13b7935738389967f4a8ebe083 en GPSpedia2.2.5_work. Rama base GPSpedia2.2.5 conservada en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- ADMIN ya no adquiere leases ni consulta Coordinator para autorizar acciones ordinarias. El router usa getCachedSharedSessionActor_; doPostInternal_ mantiene la matriz RBAC, assertDeveloperSession/assertModalEditSession y auditoría de mutaciones.
- ADMIN→WRITE transmite userId/sessionToken; WRITE valida su propio actor cacheado. No se propaga __sharedMutationToken ni se depende de nestedActions.
- Se amplió la invalidación remota de caché: AUTH→Coordinator→WRITE/FEEDBACK/ADMIN. ADMIN expone __invalidateSessionActorCache con verificación de secreto, preservando logout y eliminación de cuenta.
- Las operaciones del inventario/organizador conservan sus ScriptLock locales y verificaciones por archivo; no se elimina protección de integridad ni se ejecuta Safe Apply.
- CI run 44539942784 SUCCESS: 152 suites, 2,224 pruebas aprobadas, 0 fallos. Health read-only 44539942669 SUCCESS; Pages 44539942102 SUCCESS.
- No se desplegó Apps Script ni se modificaron ScriptProperties, secretos, Drive o Spreadsheet.
- Próxima tarea: revisar los usos restantes de leases en AUTH/USERS/UTILITIES contra la sección 15. Safe Apply permanece condicionado a preview real y autorización.
================================================================================


================================================================================
2026-11-19 — AUTH: LIMPIEZA DE LOGS SIN LEASE
- `clearSensitiveLogs` se excluyó de `isSharedMutationAction_` y ahora obtiene el actor de sesión cacheado con service AUTH; `doPostInternal_` conserva el control local de Desarrollador y la auditoría funcional.
- Se actualizó la copia aislada `JS/Tests/Auth.js` para conservar paridad de fuente.
- `SensitiveLogsTrustedActor` 7/7 PASS; `SessionActivityCoordination` 11/11 PASS.
- CI run 44541720461 SUCCESS: 152 suites, 2,224 pruebas, 0 fallos. Health read-only 44541720459 SUCCESS. Pages run 44541720180 en curso.
- No se desplegó Apps Script ni se modificaron ScriptProperties, secretos, Drive o Spreadsheet.
- Pendiente: auditoría de los flujos AUTH restantes, USERS y UTILITIES. USERS conserva coordinación de mutaciones de cuenta con delete/reset AUTH; UTILITIES conserva lease de migración manual. Revisar necesidad exacta contra sección 15 antes de cambiar.
================================================================================


================================================================================
2026-11-19 — REVISIÓN DE LEASES RESTANTES SEGÚN SECCIÓN 15
- AUTH: clearSensitiveLogs ya usa actor cacheado sin lease. Las demás leases del dispatcher AUTH corresponden a login/touchSession, aceptación de términos, recuperación/cambio de contraseña, revocación/logout, cambios de rol/cuenta y migración legacy.
- USERS: createUser/updateProfile conservan lease por conflicto real con AUTH/deleteUser, resetUserSessions y updateUser. UsersAtomicMutations prueba la serialización por recursos compartidos. Retirar esa lease sin trasladar las escrituras de Users a un único servicio dejaría una carrera interproyecto.
- UTILITIES: migrateTimestamps es migración manual con staging/backup/rollback y ScriptLock; no tiene consumidor ordinario en la interfaz. Se conserva su lease de mantenimiento.
- WRITE, FEEDBACK y ADMIN no adquieren leases en sus acciones ordinarias. ADMIN/clearSensitiveLogs tampoco.
- No se hizo una eliminación indiscriminada de leases que debilitara la integridad de cuentas o migraciones. La siguiente tarea local de código queda condicionada a un rediseño de propiedad de escrituras de Users si se decide eliminar esa coordinación; Safe Apply sigue bloqueado hasta preview real autorizado.
================================================================================


================================================================================
ESTADO ACTUAL DEL REPOSITORIO — 2026-11-19
- Rama de trabajo: GPSpedia2.2.5_work
- HEAD al registrar este checkpoint: 6ad8d99f41bc009e193932171afbcb86a0105230
- Rama base protegida GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios).
- Regresión final tras AUTH/clearSensitiveLogs: run 44541720461 SUCCESS; 152 suites, 2,224 pruebas, 0 fallos.
- Tras actualización documental de clasificación de leases: run 44542256815 SUCCESS; 152 suites, 2,224 pruebas, 0 fallos. Health read-only 44542256611 SUCCESS; Pages 44542253541 SUCCESS.
- No se desplegaron proyectos Apps Script ni se modificaron ScriptProperties, secretos, Drive o Spreadsheet.
- Pendiente local condicionado: Safe Apply del organizador requiere auditoría/preview real de Drive y revisión del manifiesto antes de implementarse; no aplicar movimientos ni renombrados.
================================================================================

================================================================================
ACTUALIZACIÓN DE CONTINUIDAD — 2026-11-19
- HEAD verificado antes de esta actualización: bd47210d1bb8cf30bafe4261dc4d9370613d8ee2; rama base protegida GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Se separaron los hallazgos Beta cuyo código y contratos locales ya están implementados de las pruebas visuales/funcionales reales que siguen pendientes.
- Preview Inbox, encabezado largo de corte, health/events, telemetría global, mantenimiento de Logs y coordinación de auditoría cuentan con contratos automatizados incluidos en la regresión.
- Organizador de imágenes: fases locales de estructura, nomenclatura, referencias, inventario y conciliación registradas como completadas; Safe Apply no está autorizado ni listo hasta disponer de preview real de Drive/Spreadsheet revisado.
- No se realizó deployment Apps Script ni se modificaron ScriptProperties, secretos, Drive o Spreadsheet.
- CI del HEAD bd47210d1bb8cf30bafe4261dc4d9370613d8ee2: 44542583589 / 44542583925 / 44542583372 SUCCESS.
================================================================================


================================================================================
2026-11-19 — GP-PERF-ADMIN-SUPPLEMENTARY-UPLOAD-LOCK-01
- HEAD de inicio verificado: 41ada27411b324b356a62dbf07a2dd85cea36a61; rama GPSpedia2.2.5_work. Rama base GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Hallazgo: handleAddSupplementaryInfo mantenía ScriptLock durante búsqueda, carga de imágenes Drive, escritura y verificación, con espera de hasta 30 segundos.
- Cambio local preparado: transferencias Drive fuera del lock; sección crítica con tryLock(0), relectura de la fila, comparación del plan para detectar conflictos concurrentes y persistencia con verificación/rollback.
- Se conserva el ledger de cargas; ante conflicto posterior a la carga no se elimina el archivo automáticamente.
- Prueba contractual añadida a RunServiceTests.mjs. CI pendiente de ejecución.
- No se desplegó Apps Script ni se modificaron ScriptProperties, secretos, Drive o Spreadsheet.
================================================================================


================================================================================
2026-11-19 — CIERRE GP-PERF-ADMIN-SUPPLEMENTARY-UPLOAD-LOCK-01
- HEAD de implementación verificado: cc7cd93e670d4d7dfd4b46ead8eb60bc830101e0 en GPSpedia2.2.5_work; padre 41ada27411b324b356a62dbf07a2dd85cea36a61. Rama base GPSpedia2.2.5 continúa en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- GitHub Actions run 44549910139 SUCCESS: sintaxis y regresión integral aprobadas; 153 suites, 2,225 pruebas, 0 fallos. La prueba AdminSupplementaryUploadOutsideLock quedó incluida.
- Health read-only run 44549910083 SUCCESS.
- Cambio local completado: carga Drive fuera del lock; tryLock(0), relectura y comparación del plan antes de persistir; se mantienen verificación, rollback y ledger.
- Validación Beta pendiente: concurrencia real entre solicitudes Apps Script y revisión de recuperación de cargas que queden sin vínculo tras un conflicto. No se ejecutaron deployments ni operaciones reales en Drive/Spreadsheet.
- Siguiente prioridad de rendimiento: revisar handleAddOrUpdateCut, que todavía mantiene un ScriptLock global mientras realiza llamadas a WRITE y carga imágenes a Drive. Auditar el flujo completo y separar la sección crítica sin debilitar idempotencia ni recuperación.
================================================================================


================================================================================
2026-11-19 — AUDITORÍA DE DEPENDENCIAS Y LATENCIA / CONTINUIDAD
- HEAD remoto verificado: 7c4c576c0463f9bc8891b1720d6d5c058114cd6d en GPSpedia2.2.5_work; padre cc7cd93e670d4d7dfd4b46ead8eb60bc830101e0. La rama base GPSpedia2.2.5 permanece en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- El último commit 7c4c576 es documental (26 líneas en ChangesLogs.txt, Tareas_Activas.md y checkpoint.md); no contiene cambios de código. La tarea GP-PERF-ADMIN-SUPPLEMENTARY-UPLOAD-LOCK-01 quedó cerrada en cc7cd93; CI 44549910139 SUCCESS, 153 suites/2,225 pruebas/0 fallos.
- Auditoría estática registrada en AUDITORIA_DEPENDENCIAS_LATENCIA_2026-11-19.md. Hallazgo P0: handleAddOrUpdateCut mantiene ScriptLock durante UrlFetch a WRITE y operaciones de carpetas/carga Drive, incluyendo recuperación por opId.
- ADMIN usa actor cacheado en acciones ordinarias; no se encontró consulta a Coordinator por cada acción. La telemetría global se solicita desde el panel. La llamada WRITE para ID nuevo es necesaria, pero debe salir del lock.
- USERS conserva coordinación por conflictos de ciclo de cuenta; UTILITIES por migración manual. No retirar leases indiscriminadamente.
- La matriz de despliegue existente separa cambios internos compatibles de Coordinator (solo Coordinator), lógica propia (solo servicio afectado), configuración central (ScriptProperties Coordinator) y cambios de SharedMutationClient (consumidores afectados).
- Siguiente tarea: GP-PERF-ADMIN-CUT-LOCK-01, EN PROGRESO. Diseñar reserva atómica de opId/ID/slot, ejecutar WRITE/Drive fuera del lock y revalidar antes de persistir. Preservar idempotencia, ledger, recuperación, verificación y rollback.
- Solo se realizó inspección estática y actualización documental. No se modificó código, deployments, ScriptProperties, secretos, Drive ni Spreadsheet; no se ejecutaron pruebas ni mediciones remotas.
================================================================================


================================================================================
2026-11-19 — PRINCIPIO ARQUITECTÓNICO: AISLAMIENTO ENTRE OPERACIONES
- Requisito explícito: auditoría no debe bloquear Inbox, escáner de salud, login/validación de sesión ni registro de cortes; ninguna operación independiente debe bloquear a otra.
- La corrección de GP-PERF-ADMIN-CUT-LOCK-01 amplía su criterio: no basta sacar WRITE/Drive del lock; hay que proteger solo el recurso compartido y probar no interferencia entre operaciones distintas.
- Importante: Apps Script ScriptLock es global dentro de un proyecto/script, no por función ni archivo. Debe verificarse el mapa de proyectos/deployments antes de afirmar aislamiento entre servicios; si comparten proyecto, el lock cruza funciones.
- Pruebas requeridas: operación de auditoría lenta concurrente con Inbox, health, login y registro de cortes; cada una debe terminar dentro de su presupuesto. Mantener pruebas de exclusión/conflicto para mutaciones del mismo recurso.
- Evitar locks genéricos; auditoría/telemetría best-effort y fuera de rutas síncronas críticas. No eliminar garantías de integridad.
================================================================================

================================================================================
2026-11-19 — GP-PERF-ADMIN-CUT-LOCK-01: PRIMER PASO DE RESERVA DE SLOTS
- Rama: GPSpedia2.2.5_work. HEAD base verificado antes del cambio: da2afc850ab4251528e74f02a66cf3ba33daabf0. Rama base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- `findNextAvailableCutSlot_` ahora consulta el ledger Idempotencia y excluye slots pending del mismo vehículo; se añadió prueba determinista y se conectó al runner integral.
- Este cambio es preparatorio: el handler ADMIN todavía mantiene el ScriptLock durante WRITE/Drive y la recuperación. No se declara completada la tarea ni validada la prueba hasta ejecutar CI.
- No se desplegó Apps Script ni se tocaron ScriptProperties, secretos, Drive o Spreadsheet.
================================================================================

================================================================================
2026-11-19 — WRITE: ASIGNADOR CENTRAL DE IDs NO BLOQUEANTE
- En `handleAllocateVehicleId`, reemplazado `waitLock(30000)` por `tryLock(0)`; si el lock global WRITE está ocupado, devuelve `WRITE_BUSY` y permite reintento. El finally libera solo si adquirió el lock.
- Prueba añadida: `JS/Tests/WriteIdAllocatorNonBlocking.mjs`, integrada en RunServiceTests.
- Pendiente ejecutar CI. El escaneo de IDs de Cortes aún ocurre dentro de la sección crítica.
- Hallazgo siguiente: `publishCortesCatalogChange_` mantiene ScriptLock durante publicación remota a Coordinator; requiere separar sin reordenar snapshots.
================================================================================

- Incidencia CI 44555115677: 150 suites / 2,138 pruebas, con un fallo en tres aserciones de AUG-039 que exigían `waitLock`. El handler conserva autenticación/rol dentro del lock; el contrato se actualizó para validar `tryLock(0)` y el caso ocupado. Se espera nueva ejecución para confirmar.

- Segundo CI 44555450856: 150 suites, 2,138 pruebas y fallo de extracción de `handleAllocateVehicleId` en el parser estático de AUG-039. Se elimina comentario interno del handler para mantener compatibilidad con el extractor; no cambia el comportamiento.

- Tercer CI 44555711003: 150 suites, 2,138 pruebas; el handler ya fue extraído y las aserciones estáticas pasaron, pero dos fixtures usaban `assert.equal` no disponible en el assert local. Se sustituye por aserción booleana.

- Cuarto CI 44555916947: 153 suites, 2,212 pruebas; `WriteAuthorizationMinimization` ya pasó. Falló `WriteAuthorizationContracts` porque su mock de LockService solo ofrecía waitLock; se actualiza el contrato y mock para tryLock(0).

================================================================================
2026-11-19 — WRITE: PUBLICACIÓN DEL CATÁLOGO SIN BLOQUEAR EL SCRIPTLOCK LOCAL
- `publishCortesCatalogChange_` ya no mantiene el ScriptLock durante la petición HTTP al Coordinator.
- WRITE reserva una versión global monotónica mientras conserva el lock de mutación; se incluye en el evento del catálogo.
- Coordinator acepta versiones nuevas y convierte versiones atrasadas en evento reset, evitando que una respuesta lenta sobrescriba snapshots más recientes. Publicaciones legacy sin versión se convierten en reset.
- La versión se adjunta a addOrUpdateCut, addSupplementaryInfo y addVinToVehicle. Pruebas deterministas agregadas a SharedMutationCoordinator y WriteCatalogPublicationIsolation.mjs. CI pendiente.
- No se ha desplegado WRITE ni Coordinator; la compatibilidad de despliegues se validará en CI estático y seguirá pendiente de despliegue autorizado.
================================================================================

- CI 44557059621: 150 suites / 2,143 pruebas; las pruebas de versión y aislamiento pasaron. Falló CatalogChangeFeed porque la conversión legacy a reset no marcaba `resetRequired`; se ajusta el indicador para que los clientes hagan reconciliación completa.

- CI 44557268309: la compatibilidad `resetRequired` ya pasó. Segundo fallo de CatalogChangeFeed: el caso de lectura pública usaba publicación WRITE/Cortes sin versión y ahora correctamente se convierte en reset. El fixture se marca como versionado para mantener la prueba de paginación de delete.

- Quinto CI 44557552513: el contrato de reset legacy ya pasó; el siguiente fixture de lectura pública todavía usaba evento WRITE sin versión. Se actualizan todos los eventos de la suite CatalogChangeFeed con sourceVersion monotónica (1–109) para que las pruebas midan paginación/retención y no el fallback legacy.

- Sexto CI 44557801354: 150 suites / 2,143 pruebas; cursor, retención, versiones y reset legacy pasaron. Falló la aserción estática antigua que exigía lock de 15 s en `publishCortesCatalogChange_`; se sustituye por contrato de publicación versionada sin lock.

- Séptimo CI 44558022613: 150 suites / 2,143 pruebas; falló solo la extracción del publisher en CatalogChangeFeed por un escape doble del salto de línea. Se corrige el delimitador de la prueba.

- Octavo CI 44558202901: 150 suites / 2,143 pruebas; falló la última aserción estática que aún esperaba la llamada antigua `publishCortesCatalogChange_(action, vehicleId)`. Se actualiza para exigir el tercer argumento `response.catalogVersion`.

================================================================================
2026-11-19 — WRITE: CARPETAS SUPLEMENTARIAS SIN SCRIPTLOCK GLOBAL
- `findOrCreateSupplementaryVehicleFolder_` deja de adquirir ScriptLock de WRITE durante operaciones Drive.
- Se añadió lease Coordinator `ensureSupplementaryVehicleFolder` con recurso exclusivo `DRIVE_FOLDER`; la operación no comparte el recurso `CORTES`.
- Se añadió prueba de coexistencia: dentro de la lease de carpeta puede adquirirse la lease de addOrUpdateCut.
- CI pendiente. Sin despliegue ni acceso a Drive real.
================================================================================

CI del commit `82a35b6216f50e584423b8c2f2dfd0a954def565`:
- Regresión de servicios: SUCCESS — 157 suites, 2,251 pruebas, 0 fallos.
- Health de servicios (solo lectura): SUCCESS.
- Pruebas específicas: AdminCutSlotReservation 5/5; WriteIdAllocatorNonBlocking 5/5; WriteCatalogPublicationIsolation 9/9; WriteSupplementaryFolderLease 4/4; Coordinator 80/80.
- GitHub Pages estaba en ejecución al momento de actualizar este checkpoint.
- No se desplegó WRITE ni Coordinator y no se modificaron datos/propiedades de producción.

2026-11-19 — ADMIN: se añadió runAdminDriveWorkOutsideScriptLock_ y se movieron las cargas/creación de carpetas Drive del flujo idempotente, vehículo existente y vehículo nuevo fuera del ScriptLock, con revalidación tras tryLock(0). Prueba AdminDriveLockIsolation.mjs agregada al runner. CI 44561701553 SUCCESS: 158 suites, 2,260 pruebas aprobadas, 0 fallos; health read-only 44561701543 SUCCESS. La llamada ADMIN→WRITE para asignación de ID aún sigue dentro del lock y es el siguiente subpaso. No se desplegaron servicios ni se tocaron datos reales.

- Corrección de seguridad del helper ADMIN: el bloque `finally` verifica `lock.hasLock()` antes de liberar; si la readquisición no fue posible, se conserva el error `ADMIN_LOCK_REACQUIRE_PENDING` sin provocar una segunda excepción.

2026-11-19 — ADMIN: la asignación central de ID se realiza ahora antes de adquirir ScriptLock ADMIN; la sección crítica usa `tryLock(0)` y responde `ADMIN_BUSY` inmediatamente. Nueva prueba AdminVehicleIdOutsideLock.mjs. CI pendiente. Los fallos/reintentos pueden dejar huecos en la secuencia, pero no duplican IDs; no se reutilizan IDs.

CI `44562328607`: SUCCESS — 159 suites, 2,264 pruebas aprobadas, 0 fallos. `AdminDriveLockIsolation` 9/9 y `AdminVehicleIdOutsideLock` 4/4. Health read-only `44562328694`: SUCCESS. Pages `44562328327` seguía en ejecución. La asignación de ID central está fuera del ScriptLock ADMIN y la entrada al lock es inmediata (`tryLock(0)`).

2026-11-19 — Aislamiento de auditoría ADMIN: `handleAuditDriveImagesInCortes` deja de mantener ScriptLock durante el escaneo; usa lease Coordinator solo para `IMAGE_AUDIT_STATE`, sin bloquear CORTES/DRIVE. `beginAdminAuditEvent_` y `finalizeAdminAuditEvent_` ya no usan ScriptLock. Los fallos de auditoría se devuelven como `auditWarning` y no detienen ni convierten en error una mutación confirmada. Pruebas actualizadas; CI pendiente. Requiere despliegue coordinado de ADMIN + Coordinator cuando se autorice.

- Primer CI del aislamiento de auditoría detectó: referencia residual a `locked` en el cierre del evento y una prueba de telemetría que prohibía todas las leases ADMIN. Se elimina el finally residual y se ajusta el contrato para permitir únicamente la lease de estado del escáner.

- Segundo CI: `AdminAuditTrail` 15/15; el contrato de rutas directas y coordinación de sesión aún prohibía cualquier lease ADMIN, aunque ahora el escáner usa una lease de recurso independiente. Se actualizan ambos contratos y el delimitador de extracción.

- Tercer CI del aislamiento de auditoría: `AdminAuditTrail` 15/15, `DirectTrafficRoutingCoverage` 6/6. Ajustar contratos restantes al nuevo nombre `handleAuditDriveImagesInCortesCore_` y eliminar el escape doble en `SessionActivityCoordination`.

- Cuarto CI del aislamiento de auditoría: los contratos de auditoría, sesión, rutas y gestor de imágenes pasaron. `AdminSheetActionsContract` conservaba una aserción global de ausencia de leases; se limita ahora a verificar que solo el escáner adquiere la lease IMAGE_AUDIT_STATE.

- Quinto CI del aislamiento: la política automática añadía SESSION_CONTEXTS a la lease de auditoría, bloqueando login AUTH aunque CORTES/DRIVE estuvieran excluidos. Se elimina también esa dependencia implícita y se amplía la prueba de concurrencia para AUTH/login.

- Sexto CI: 154 suites / 2,148 pruebas; falló únicamente la prueba de concurrencia porque intentaba exigir coexistencia entre WRITE/addOrUpdateCut y AUTH/login, que legítimamente comparten SESSION_CONTEXTS. La prueba se divide en dos pares independientes con la auditoría.

CI `44565411437`: SUCCESS — 159 suites, 2,265 pruebas aprobadas, 0 fallos. `AdminAuditTrail` 15/15, `AdminImageScanCoordinatorContract` 1/1, `SessionActivityCoordination` 11/11, `DirectTrafficRoutingCoverage` 6/6, `SharedMutationCoordinator` 81/81. Health read-only `44565411315` SUCCESS; Pages `44565410469` SUCCESS. La auditoría de Drive ya no usa ScriptLock; lease solo IMAGE_AUDIT_STATE, sin SESSION_CONTEXTS/CORTES/DRIVE. Registro de auditoría best-effort. Siguiente subpaso: aislar `saveUnusedImagesInventory` y revisar su registro de actividad.

2026-11-19 — Inventario ADMIN: handlers de escaneo/organización ya no usan ScriptLock global; el router coordina solo IMAGE_INVENTORY. Registro de actividad se coordina con lease ACTIVITY breve, y su asignador de ID no usa ScriptLock. Se añadieron pruebas estáticas y de coexistencia; CI pendiente. No se desplegó ADMIN/Coordinator.

2026-11-19 — CI de inventario ADMIN encontró dos contratos de pruebas obsoletos: prohibían leases ADMIN adicionales a auditoría. Se actualizan para permitir exactamente las tres operaciones de recurso independiente: auditDriveImagesInCortes, saveUnusedImagesInventory e recordAdminImageActivity. Sin cambios funcionales ni despliegues en esta corrección.

2026-11-19 — Segundo hallazgo de CI tras el aislamiento de inventario: `AdminReplacedImagesIntegrity` aún exigía ScriptLock dentro del handler de inventario. Se actualiza el contrato para exigir ausencia de ScriptLock y coordinación explícita mediante la lease IMAGE_INVENTORY. No cambia el código funcional.

CI `44568472342` SUCCESS — 160 suites, 2,273 pruebas aprobadas, 0 fallos. `SessionActivityCoordination` 11/11, `DirectTrafficRoutingCoverage` 6/6, `AdminReplacedImagesIntegrity` 56/56 y `AdminSheetActionsContract` 9/9. Health read-only `44568472256` SUCCESS. Aislamiento ADMIN confirmado: auditoría (`IMAGE_AUDIT_STATE`), inventario (`IMAGE_INVENTORY`) y actividad (`ACTIVITY`) son las únicas tres leases ADMIN. En `handleAddOrUpdateCut`, llamada a WRITE para preasignación de ID y Drive quedan fuera del ScriptLock ADMIN; las mutaciones de Cortes mantienen su sección crítica de hoja. No se desplegaron servicios ni se modificaron datos reales. Siguiente: auditar todos los ScriptLock restantes de ADMIN/Coordinator y reducirlos a recursos compartidos concretos, preservando exclusión para operaciones que modifican el mismo recurso.

2026-11-19 — ADMIN: `handleUpdateVehicleField` ahora libera ScriptLock tras guardar/verificar el metadato y ejecuta sincronización de carpeta/imagen Drive después; fallos se notifican como advertencia, sin revertir el campo confirmado. Adquisición `tryLock(0)`. Nueva prueba AdminVehicleFolderSyncOutsideLock.mjs; CI pendiente.

CI `44569152764` detectó únicamente dos fallos de extracción estática: el parser de pruebas esperaba `}\nconst ADMIN_IMAGE_UPLOAD_SHEET_NAME` sin línea vacía. Se ajusta el separador para mantener compatibilidad con los tests de función; la lógica de sincronización fuera del lock no cambia.

CI `44570179580` SUCCESS — 161 suites, 2,280 pruebas aprobadas, 0 fallos. `AdminVehicleFolderSyncOutsideLock` 7/7; `WRITE/ADMIN VIN` 12/12; `ADMIN edición modal/RBAC` 9/9. Health read-only `44570179476` SUCCESS. El ajuste de extracción de la prueba VIN se limitó a usar el delimitador real del handler. La sincronización de carpeta de imagen principal ahora ocurre después de liberar ScriptLock; la edición de metadatos se guarda y verifica primero, y cualquier fallo Drive queda como advertencia. Siguiente objetivo de auditoría: `handleUploadAdminImage`, que aún mantiene ScriptLock durante operaciones de Drive, ledger e historial; requiere dividir por etapas y revalidar la celda/operación antes de aplicar.

2026-11-19 — ADMIN: primera extracción de Drive en `handleUploadAdminImage`: lock tryLock(0), creación/recuperación/verificación del archivo y metadata pending fuera del ScriptLock; al readquirir se revalidan fila/vehículo, URL activa, nombre canónico y ledger opId. La confirmación final de nombre/metadata también se hace fuera del lock y vuelve a comprobar la URL activa. Si falla readquisición, se deja el ledger pendiente y se pide reintentar con el mismo opId; finally libera solo si conserva lock. Prueba AdminImageUploadDriveIsolation.mjs agregada; CI pendiente.

CI `44571281616` SUCCESS — 162 suites, 2,289 pruebas aprobadas, 0 fallos. `AdminImageUploadDriveIsolation` 9/9 y `AdminVehicleFolderSyncOutsideLock` 7/7; health read-only `44571281679` SUCCESS. `handleUploadAdminImage` ya mueve la creación/recuperación del archivo y su metadata pending, más la confirmación final de nombre/estado, fuera del ScriptLock; al readquirir revalida URL, fila, nombre canónico y ledger opId. El estado pendiente permite reintentar el mismo opId si no se recupera el lock. Pendiente: la rama de recuperación de operaciones ya `linked` y la compensación del catch aún realizan algunas operaciones Drive mientras el ScriptLock está retenido.

2026-11-19 — ADMIN reemplazo de imágenes: rama de recuperación `status=linked` ya mueve lookup/verificación Drive y metadata final fuera del ScriptLock; revalida vehículo/fila y ledger opId/estado/URL antes de recuperar historial. Nueva prueba AdminImageUploadLinkedRecoveryIsolation.mjs; CI pendiente. Las rutas de error/compensación continúan en revisión.

CI `44572041539` SUCCESS — 163 suites, 2,294 pruebas aprobadas, 0 fallos. `AdminImageUploadLinkedRecoveryIsolation` 5/5 y `ADMIN compensación de reemplazos in-modal` 9/9; health read-only `44572041605` SUCCESS. La rama `status=linked` ahora verifica existencia, papelera e integridad del archivo fuera del ScriptLock y revalida el ledger/URL; metadata final también se confirma fuera del lock. Pendiente de esta tarea: las operaciones Drive ejecutadas por compensación en el `catch` siguen dentro del ScriptLock.
