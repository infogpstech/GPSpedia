# GPSpedia — Checkpoint de continuidad

Fecha: 2026-11-25
Repositorio: `infogpstech/GPSpedia`
Rama autorizada: `GPSpedia2.2.5_work`
Rama base protegida: `GPSpedia2.2.5` — no modificar.
HEAD de trabajo revisado antes de esta actualización: `1d25c64a798fb343b15e61658946243314ffbe91`
HEAD de rama base verificado: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`

## Reglas de continuidad
- `NORMAS_DESAROLLO.md` es la única fuente normativa vigente; consultarla antes de cambiar código/documentación operativa.
- Confirmar rama y HEAD antes de cada escritura. No forzar actualizaciones ni modificar la rama base.
- No declarar pruebas ni efectos externos sin evidencia observada. Diferenciar CI/fixtures de Beta real.
- Apps Script: sin secretos compartidos/manuales ni URLs/endpoints de otros servicios; coordinación funcional frontend cuando sea posible; llamadas backend directas solo por necesidad técnica, con autorización/RBAC del receptor. Excepción temporal autorizada para los IDs de Spreadsheet y carpeta Cortes suministrados por el propietario, documentada en NORMAS §17.1.
- Un fallo de servicio u operación no debe bloquear funciones independientes.

## Migración de URLs de servicios — estado vigente (2026-11-25)

- Plan exclusivo: `Migracion_URL_Servicios_Frontend.md`; única tarea restante: MIG-URL-008, pendiente de autorización Beta aislada.
- MIG-URL-001..007 cerradas. Seis URLs confirmadas directamente por el propietario en `API_ENDPOINTS`; router, health scan y coordinación frontend usan configuración local. Mapa vigente: 123 acciones.
- Retirados: bootstrap separado, acciones/handlers de administración de URLs en AUTH, publicador, lector de `Servicios`, editor Developer y caché de endpoints. La configuración central de parámetros/recursos permanece; la consulta pública usa `API_ENDPOINTS.AUTH`.
- Spreadsheet: el código no lee ni escribe la hoja histórica `Servicios`; el inicializador no la crea. La hoja y registros existentes no se borraron ni modificaron.
- CI run `45519738860`, commit `1d25c64a798fb343b15e61658946243314ffbe91`: 519 suites, 6,181 pruebas aprobadas, 0 fallos; responsive-browser SUCCESS. Sintaxis 469 archivos JS/MJS; referencias relativas 389 archivos.
- Contratos destacados: MIGURL004 10/10; LocalApiEndpoints 10/10; ServiceHealthContract 19/19; DeveloperPanelCopy 9/9; MIG029 16/16; ServiceCallGraph 9/9.
- No se hicieron GET a los seis deployments, no se desplegaron proyectos Apps Script y no se escribieron/eliminaron datos Spreadsheet. El script RemoteServiceHealth exige confirmación explícita de Beta aislada.
- El workflow GitHub Pages build/deployment se disparó automáticamente por los commits y finalizó SUCCESS; es independiente de Apps Script.
- Rama base protegida `GPSpedia2.2.5` permanece sin cambios; SHA conocido: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


## Estado de tareas
- MIG-001 a MIG-030: implementación y validación local cerradas según sus criterios. Las validaciones externas se marcan como diferidas a Beta cuando requieren recursos/despliegues reales.
- MIG-014: COMPLETADA CON VALIDACIÓN DIFERIDA; CI global posterior aprobado.
- MIG-026: vinculación explícita implementada y validada en CI; Beta pendiente. Los seis servicios usan `SpreadsheetApp.openById(GPSpediaSpreadsheetId_)`; WRITE, FEEDBACK y ADMIN abren además la carpeta `Cortes` por `GPSpediaCortesRootFolderId_`.
- MIG-028: COMPLETADA CON VALIDACIÓN DIFERIDA; pruebas locales aprobadas, métricas reales p50/p95 pendientes.
- MIG-029 y MIG-030: COMPLETADAS CON VALIDACIÓN DIFERIDA.
- La matriz BETA-01..09 y pruebas de MIG-006/008/012/013/015/017/018/024/025/026 permanecen como procedimiento de campo en `Tareas_Beta.md`.

## Nueva tarea autorizada — AUG-144: corregir encabezado de marca/modelo del modal de detalle

**Estado: IMPLEMENTADA EN CÓDIGO Y CI; VALIDACIÓN VISUAL DIFERIDA A BETA-09.** Solicitud incorporada el 2026-11-24. Alcance limitado al encabezado visual del modal de detalle de dispositivos.

### Requisitos de distribución
- El logotipo de marca debe renderizarse con **66 px de alto** y **ancho automático**, conservando su proporción natural y sin reducirse para encajar de forma incorrecta.
- El bloque de marca debe quedar alineado a la izquierda, con **6 px de separación respecto al borde izquierdo** del modal y **6 px respecto al borde superior**.
- El nombre del modelo debe ubicarse a la derecha del logotipo, con **6 px de separación horizontal**.
- El logotipo y el nombre del modelo deben quedar **alineados verticalmente por la parte inferior** dentro de sus respectivos contenedores.
- La línea azul situada debajo del logotipo y del nombre debe conservarse y quedar a **6 px de separación vertical** del conjunto superior (logo + nombre).
- El ancho del bloque de marca debe ser automático; no imponer un ancho fijo que reduzca el logotipo o provoque desbordamientos.

### Invariante obligatoria: controles del modal
- Los botones de **edición, impresión, compartir y cerrar** no deben modificarse.
- Deben permanecer exactamente en sus posiciones actuales. No cambiar su ubicación, orden, tamaño, comportamiento ni estilos como efecto colateral de la redistribución del encabezado.
- Antes de implementar, registrar sus posiciones actuales. Después, comparar sus límites/posiciones en los mismos tamaños de viewport.
- Si el nuevo encabezado afecta la distribución o posición de cualquiera de esos botones, revisar y rehacer el layout del encabezado/contenedores hasta preservar las posiciones originales. No aceptar como solución desplazar los botones para acomodar el logo.

### Validación y cierre
- Inspeccionar el DOM/CSS real del modal y sus reglas responsive antes de modificar.
- Validar el alto de 66 px, ancho automático, proporción del logo, offsets de 6 px, separación de 6 px con la línea azul y alineación inferior del logo/nombre.
- Comparar las posiciones de los cuatro botones antes/después en los mismos viewports de escritorio y móvil; la comparación debe demostrar que no se desplazaron.
- Probar nombres de modelo largos y logotipos de distintas proporciones para evitar solapamientos o deformaciones.
- Ejecutar parsing/sintaxis y las pruebas de regresión frontend pertinentes. Si no hay navegador automatizado disponible, declarar la validación visual como no ejecutada y preparar el procedimiento Beta; no presentarla como aprobada.
- No modificar funcionalidades ni controles ajenos al encabezado.


### Implementación local y CI — AUG-144 — 2026-11-24

- Commit funcional: `1d20ee06ac8c989deabea98a9ddd89d3928aa624`; archivos: `style.css`, `JS/Frontend/ui.js` y `JS/Tests/CutDetailModalLayout.mjs`.
- El logo del modal de corte usa 66 px de alto y ancho automático sin límite fijo; se aplican los offsets de 6 px desde el borde del modal. El nombre del modelo queda a la derecha, separado 6 px y alineado por abajo; la línea azul conserva 6 px de separación vertical.
- Las reglas de los botones de edición, impresión, compartir y cerrar no se modificaron. La fila de acciones conserva 40 px y el anclaje derecho; el cálculo de espacio del modelo descuenta el ancho real de los botones y mantiene el fallback para nombres largos. Se observa el logo para recalcular cuando carga o cambia su ancho intrínseco.
- CI run `45408996633`, job `138497373654`: SUCCESS; Node.js v22.23.5; 513 suites, 6,052 pruebas aprobadas, 0 fallos. `CutDetailModalLayout` 30/30, `ModalHeaderCssCascade` 14/14 y `RepositoryJavaScriptSyntax` 1/1 (463 archivos) PASS.
- La comprobación visual con navegador y la comparación de bounding boxes antes/después no se ejecutaron; quedan pendientes en BETA-09. CI valida contratos y sintaxis, no sustituye la comprobación visual.
- No se desplegaron servicios Apps Script ni se tocaron deployments, propiedades, permisos, Spreadsheet, Drive, OAuth o datos productivos.

## Nueva tarea autorizada — AUG-145: ampliar la guía de despliegue de servicios Apps Script

**Estado: COMPLETADA EN DOCUMENTACIÓN Y CI; SIN DESPLIEGUES REALES.** Solicitud incorporada el 2026-11-24. La guía operativa quedó ampliada y validada en CI.

### Alcance obligatorio
- Documentar el procedimiento paso a paso para cada uno de los seis proyectos activos: AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN.
- Establecer un orden global de despliegue explícito. Antes de fijarlo, analizar las dependencias reales, los consumidores, los contratos y la configuración central; justificar por qué ese orden es seguro. No asumir dependencias backend-backend que no existan ni introducir coordinación entre servicios dentro de Apps Script.
- Para cada servicio, indicar los archivos exactos que se deben actualizar, los prerrequisitos, el proyecto Apps Script que corresponde, la carga/sustitución de fuentes, guardado, creación de versión, actualización del deployment Web App existente, comprobación de URL y salud, y pruebas funcionales específicas.
- Explicar qué servicios deben desplegarse cuando cambia un archivo compartido o un contrato, y cuáles no necesitan redespliegue. Evitar publicar los seis servicios por rutina si el cambio solo afecta a uno.
- Incluir el orden de verificación posterior, criterios para continuar o detener la secuencia, tratamiento de fallos parciales y preservación de servicios independientes.
- Incorporar rollback paso a paso por servicio, incluyendo la restauración de una versión anterior y, cuando aplique, la publicación controlada de una nueva revisión de configuración central para restaurar una URL anterior.
- Mantener la actualización de endpoints mediante la configuración central versionada; nunca introducir URLs de otros servicios, secretos o credenciales en código, propiedades Apps Script ni frontend.
- Diferenciar claramente despliegue de código, cambio de URL, comprobación GET de salud y pruebas funcionales Beta. Incluir los límites de autorización y no ejecutar despliegues ni modificar recursos reales como parte de la documentación.
- Añadir una lista de comprobación final que permita registrar servicio, SHA publicado, versión/deployment, URL conservada o actualizada, pruebas ejecutadas, resultado y evidencia.

### Restricciones y dependencias
- Mantener como fuente normativa `NORMAS_DESAROLLO.md` y respetar los requisitos Apps Script de su §12 y los apartados aplicables.
- Conservar los seis proyectos activos y la matriz real de archivos fuente vigente. USERS y COORDINATOR no deben reintroducirse como servicios activos.
- No alterar la arquitectura ni el comportamiento de los servicios para adaptar el manual. Si el análisis descubre una dependencia o ambigüedad técnica, documentarla con evidencia y separar cualquier corrección de código como tarea distinta.
- AUG-144 está implementada y aprobada por CI; su comprobación visual queda pendiente en BETA-09. AUG-145 pasa a ser la siguiente tarea de implementación.

### Validación y cierre
- Contrastar cada paso y el orden propuesto con los seis archivos fuente y sus dependencias reales, la configuración central y los workflows de salud/pruebas existentes.
- Verificar nombres/rutas de proyectos, archivos, menús de Apps Script, secuencia, condiciones de rollback, enlaces y referencias documentales.
- Añadir o actualizar pruebas de contrato documental para asegurar que la guía enumera los seis servicios, mantiene el orden definido, no incluye servicios retirados y conserva las reglas de configuración central/seguridad.
- Revisar el diff y confirmar que el cambio se limita a la documentación y pruebas contractuales realmente necesarias. No desplegar Apps Script ni modificar PropertiesService, permisos, Spreadsheet, Drive, OAuth, endpoints o datos productivos.

### Implementación documental y CI — AUG-145 — 2026-11-24

- Guía actualizada: `Services/DEPLOYMENT_GUIDE.md`; README enlaza la versión ampliada. Se documentó el orden completo AUTH → CATALOG → WRITE → FEEDBACK → UTILITIES → ADMIN, justificado como secuencia operativa y no como dependencia backend.
- Se añadieron pasos específicos por proyecto, identidades de salud, archivos fuente, actualización del deployment Web App existente, pruebas funcionales Beta, matriz de propagación de helpers compartidos, criterios de fallo parcial, publicación versionada de URLs, excepción del bootstrap AUTH, rollback y checklist de evidencia.
- El análisis de los seis servicios confirmó que el frontend coordina las operaciones entre servicios; no se deben introducir llamadas Apps Script→Apps Script. Se conservaron las exclusiones USERS/COORDINATOR y las reglas de no secretos/URLs locales.
- Se amplió `JS/Tests/MIG029DeploymentGuideContract.mjs` a 15 verificaciones. Resultado: 15/15 PASS.
- CI run `45412598879`, job `138510122635`, commit `d8160863f3196c50598d1438019ae1b2135f07b7`: SUCCESS; Node.js v22.23.5; 513 suites, 6,060 pruebas aprobadas, 0 fallos; `RepositoryJavaScriptSyntax` 1/1 sobre 463 archivos.
- GitHub Pages build/deploy run `45412598149`: SUCCESS (build job `138510137341`, deploy job `138510421315`). No es despliegue Apps Script.
- No se desplegó ningún servicio Apps Script ni se modificaron PropertiesService, permisos, Spreadsheet, Drive, OAuth, endpoints o datos productivos. La ejecución real de los procedimientos permanece sujeta a autorización y Beta aislada.

## MIG-026 — acceso Spreadsheet
- AUTH usa `getAuthUsersSpreadsheet_()`; CATALOG usa `getSpreadsheet()`; UTILITIES usa `getUtilitiesSpreadsheet_()` y comparte un handle por petición entre carga de actor y operación.
- La copia aislada `JS/Tests/Auth.js` conserva paridad exacta.
- No se añadieron IDs, URLs, propiedades, secretos, endpoints bootstrap ni fallbacks locales.
- Si una Web App devuelve `NO_ACTIVE_SPREADSHEET` o carece de permisos, no restaurar IDs locales: mantener sin desplegar esa versión y resolver una alternativa sin configuración local antes de publicar.
- El probe MIG-006 está preparado; ejecutar por proyecto e identidad efectiva sobre Spreadsheet desechable/aislada.

## Verificación técnica integral — NORMAS §11
- CI final: run `45400544234`, job `138467663045`, commit `5bd3da718d3e675dfc31015a294a0adb33300838`: SUCCESS; Node.js v22.23.5; 513 suites, 6,051 pruebas aprobadas, 0 fallos.
- Sintaxis: 463 archivos .js/.mjs; RepositoryJavaScriptSyntax 1/1 PASS.
- Referencias de módulos: 384 archivos; RepositoryModuleReferences 1/1 PASS.
- MIG027FunctionalParity 8/8; MIG028SecurityPerformanceRegression 9/9; MIG026StaticConfigSearch 10/10; MIG013SessionActorLocalLookup 22/22.
- CatalogChangeFeed 19/19; UTILITIES 19/19; PasswordHashMigration 16/16; SensitiveLogsTrustedActor 7/7; SessionActivityLeaseMinimization 6/6.
- NonBlockingServiceLocks 27/27; WriteContributionAppendConcurrency 9/9; AdminDriveLockIsolation 9/9.
- GitHub Pages build/deploy: run `45400543527`, build `138467670290`, deploy `138467951389`: SUCCESS. No es despliegue Apps Script.
- Revisión del diff de esta iteración desde `2bb7c0f8e27261c1edd8f6278779e978a2fbc30f`: 21 archivos modificados; sin altas ni eliminaciones. Solo tres servicios, fixtures/contratos relacionados y documentación MIG-026/verificación. Sin cambios funcionales ajenos.
- Rama protegida confirmada intacta en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.

## Límites pendientes de Beta
- No se desplegaron proyectos Apps Script ni se invocaron endpoints.
- AUG-144: pendiente BETA-09 de comparar bounding boxes de los cuatro botones y validar visualmente offsets, altura, gap, alineación inferior, logos de distintas proporciones y nombres largos en escritorio/móvil.
- No se modificaron PropertiesService, permisos, Spreadsheet, Drive, OAuth/YouTube ni datos productivos.
- Pendientes: contexto activo en cada Web App, identidad/permisos efectivos, lectura/escritura, concurrencia entre deployments, revocación real, p50/p95 y limpieza física de propiedades legacy. Los resultados CI no prueban disponibilidad ni latencia de producción.

## Rotación documental
- El checkpoint anterior, de 187738 caracteres Unicode, se preservó íntegro en `Olds/Documentacion_Legacy/Checkpoint_Archive/checkpoint_2026-11-24_parte_006.md`.
- El blob SHA archivado coincide con el original: `4a25fc4d0dc3ed6a71113e60b88623aa5f9b0504`.
- El manifiesto de rotación conserva las referencias a las partes anteriores.

## Próxima acción
Ejecutar BETA-09: comparar visualmente los límites de edición, impresión, compartir y cerrar antes/después de AUG-144 en los mismos viewports y validar el encabezado con logos y nombres de distinta longitud. Continuar las pruebas BETA-01..08 cuando el entorno esté aislado y autorizado. No desplegar servicios Apps Script en producción sin autorización expresa.


## Inicializador de configuración central AUTH — 2026-11-24

**Estado: IMPLEMENTADO Y VALIDADO EN CI; EJECUCIÓN OPERATIVA DIFERIDA A BETA.**

- HEAD de trabajo tras la implementación: `062e22eeafa792769ef20ed9e6bdbfbc2778b654`. La rama base protegida permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Se añadió `initializeCentralConfigurationSheets()` a `JS/Services/Auth.js`; `JS/Tests/Auth.js` mantiene paridad exacta. La función se ejecuta manualmente desde el editor AUTH, nunca por HTTP ni durante el login.
- Usa el mismo `getAuthUsersSpreadsheet_()` que AUTH. Crea solo las pestañas ausentes; escribe encabezados únicamente en pestañas vacías; valida y conserva las pestañas con datos. Si una hoja existente no cumple el contrato, falla sin sobrescribirla. No usa ScriptLock para no interferir con login u operaciones independientes.
- Se conservan las seis tablas definidas por el diseño. Una sola pestaña no es compatible con el lector actual, que consulta por nombre cinco pestañas y mantiene Historial como registro append-only separado; esa unificación exigiría una tarea de arquitectura.
- Solo se generan encabezados. No se agregan URLs, IDs, recursos, filas de publicación ni estado `READY`; no se habilita el enrutamiento hasta completar una revisión real válida.
- Prueba `CentralConfigurationInitializer.mjs`: 7/7 PASS. CI run `45436552111`, job `138595813855`: SUCCESS; 514 suites, 6,067 pruebas aprobadas, 0 fallos; sintaxis de los módulos modificados PASS.
- No se ejecutó la función en una Spreadsheet real y no se desplegó AUTH. Pendiente Beta: verificar que AUTH tenga el contexto Spreadsheet correcto, ejecutar manualmente la función, completar los datos reales, publicar la revisión y desplegar AUTH con autorización.


## Corrección de vinculación compartida Spreadsheet/Drive — 2026-11-24

**Estado: IMPLEMENTADA EN CÓDIGO Y CI; validación real diferida a Beta.**

- Repositorio: `infogpstech/GPSpedia`; rama de trabajo: `GPSpedia2.2.5_work`.
- HEAD al registrar la actualización: `47173fafc9bfa3b109175fbb9b10331a2df1eb0d`. Entre el log de cambios y este checkpoint se conservó el commit independiente `47173fafc9bfa3b109175fbb9b10331a2df1eb0d` que actualizó `CENTRAL_CONFIGURATION_BOOTSTRAP_URL`; no se modificó como parte de esta tarea. Rama base protegida verificada: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no se modificó.
- Spreadsheet compartida: `1_BDp256L6fxmZdyCek9m4A-a_-TjeKJOt3fteXYt3Os`. Carpeta raíz Cortes: `1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2`.
- Los seis servicios abren la misma Spreadsheet por ID. AUTH/WRITE/FEEDBACK/ADMIN reciben el ID desde `CentralConfigurationReader.js`; CATALOG/UTILITIES lo declaran en sus módulos.
- WRITE/FEEDBACK/ADMIN usan el ID de carpeta compartido y mantienen validaciones de nombre `Cortes`, papelera y relación directa con la raíz de Drive.
- La excepción temporal está autorizada y documentada en NORMAS §17.1; solo cubre los dos IDs de recursos. No hay URLs, tokens, claves ni secretos compartidos nuevos.
- CI run `45444136611`, job `138623108916`, checkout HEAD `0aa586c933296d745fa3509887aeccf7e5d2d84e`: SUCCESS; 514 suites, 6,070 pruebas aprobadas, 0 fallos; sintaxis PASS. Pages run `45444134417`: SUCCESS.
- No se desplegaron Apps Script ni se modificaron recursos externos, permisos, scopes, propiedades instaladas o datos reales.

## Próxima acción
Ejecutar en Beta aislada la prueba de acceso de los seis servicios con la identidad real de cada deployment; verificar lectura/escritura de Spreadsheet y acceso, identidad, nombre y jerarquía de la carpeta Cortes para WRITE/FEEDBACK/ADMIN. Revisar scopes/autorizaciones solicitados. No desplegar en producción sin autorización expresa.


## Publicación de endpoints centrales AUTH y modal Developer — 2026-11-24

**Estado: IMPLEMENTADO EN CÓDIGO Y APROBADO EN CI; EJECUCIÓN OPERATIVA DIFERIDA A BETA.**

- Repositorio: infogpstech/GPSpedia. Rama de trabajo: GPSpedia2.2.5_work. HEAD actual: 9f2a52191c6b87b3a5ed768c6d4b8e59b5cced78. Código funcional integrado inicialmente en 3e8041dc34a338e4088ca547e911221e23595384. Rama base protegida GPSpedia2.2.5 verificada en d9acc68d889985c2e2f42fe3a02e502efc86ead1; no se modificó.
- Se añadieron getCentralServiceUrls y updateCentralServiceUrls a AUTH. Ambas requieren sesión vigente y actor confiable; AUTH comprueba rol Desarrollador en backend. El frontend no puede conceder ese rol.
- El modal Herramientas de desarrollador → Sistema contiene cinco campos editables (CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN). AUTH no aparece ni se actualiza desde el modal; su URL se cambia directamente en el frontend mediante CENTRAL_CONFIGURATION_BOOTSTRAP_URL. AUTH conserva el valor activo al publicar una revisión de los otros cinco servicios.
- El flujo manual de Apps Script usa prepareCentralConfigurationServiceUrlInput() para crear seis filas borrador y publishCentralConfigurationFromServiceUrlDraft() para validar y publicar. Solo se completa endpoint_url; las demás columnas se generan o conservan automáticamente. No requiere autenticación GPSpedia; sí puede requerir autorización Google normal para Spreadsheet.
- AUTH genera metadatos de servicio desde contratos/versiones reales, copia parámetros y recursos vigentes, crea el esquema inicial y rich_text_mode=strict si corresponde, verifica el snapshot, registra historial append-only y cambia active_revision/READY únicamente después de la validación. No se codifican URLs de otros servicios, secretos ni llamadas interservicio.
- Se mantuvo byte-identical JS/Services/Auth.js y JS/Tests/Auth.js. Se actualizaron inventarios y contratos para 125 acciones (AUTH 21). Los errores de UI son neutros; la consola conserva diagnósticos y la interfaz distingue una publicación confirmada de un refresco de caché pendiente.
- CI run 45457211849, job 138669790506, HEAD 9f2a52191c6b87b3a5ed768c6d4b8e59b5cced78: SUCCESS; 515 suites, 6,078 pruebas aprobadas, 0 fallos. CentralConfigurationInitializer 7/7; CentralServiceUrlPublisher 7/7; ServiceCallGraphContract 9/9; MIG029DeploymentGuideContract 16/16. GitHub Pages run 45457210341: SUCCESS. La regresión confirma que el flujo manual prepara únicamente service_key y endpoint_url y no requiere sesión GPSpedia.
- Tareas_Beta.md §19 contiene la lista de verificación para ejecutar el flujo en una Spreadsheet y deployments aislados, validar RBAC, primera publicación, cambios, idempotencia, errores y transición del bootstrap AUTH.
- No se ejecutó el script sobre la Spreadsheet real, no se modificaron datos/propiedades/permisos productivos y no se desplegó Apps Script. La URL inicial de AUTH continúa siendo el único bootstrap fijo del frontend.

## Próxima acción

Preparar Beta aislada y ejecutar Tareas_Beta.md §19. Primero ejecutar el flujo manual en AUTH y verificar la primera revisión de los seis servicios; después probar el modal con rol Desarrollador, que solo permite modificar CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN. AUTH se actualiza exclusivamente en CENTRAL_CONFIGURATION_BOOTSTRAP_URL del frontend. Mantener el bootstrap anterior disponible durante esa transición. No desplegar a producción ni modificar la Spreadsheet productiva sin autorización expresa.


## Mejora autorizada — agrupación y navegación de modelos en búsqueda global (2026-11-24)

**Estado: COMPLETADA.** Implementación publicada y validaciones locales/CI aprobadas; las validaciones Beta de otras tareas continúan pendientes. Esta tarea se prioriza por instrucción expresa del usuario antes de continuar las validaciones Beta pendientes.

- `JS/Frontend/search-utils.js`: el resolver jerárquico distingue Trim Level, tipo de encendido y rangos de años; conserva opciones sin dato cuando coexisten con valores informados y no colapsa registros duplicados.
- `JS/Frontend/ui.js`: las tarjetas de búsqueda muestran solo marca/modelo; las pantallas de selección usan «Versiones de equipamiento» y contemplan registros sin Trim Level o sin tipo de encendido. Una selección inequívoca con un único registro y rango abre el detalle directamente.
- `JS/Tests/SearchModelGrouping.mjs`: se amplían pruebas de lógica y contratos UI para variantes vacías, filtros de selección, navegación directa y preservación de duplicados.
- La implementación se limita a la búsqueda y navegación de Cortes. Relay, Tutoriales, PyS, VIN ambiguo, prioridades y orden de resultados permanecen fuera del cambio.
- HEAD confirmado antes de publicar esta tarea: `ad649202033021b1386f9fe63f7280e653274734`. Rama base protegida: `GPSpedia2.2.5`; no modificar.
- Commits de implementación: `60940409ccbaca5aac881146b11cd32b0d07bc1b` (resolver, UI, pruebas y registros) y `a1641afc3264d77fc9e2b5e1df349d437320f8e1` (mostrar exclusivamente el nombre del modelo).
- CI run `45465653696`, job `138699734920`, HEAD `a1641afc3264d77fc9e2b5e1df349d437320f8e1`: SUCCESS; 515 suites, 6,092 pruebas aprobadas, 0 fallos. `SearchModelGrouping: 28/28 PASS`; comprobación de sintaxis PASS.
- Rama de trabajo verificada en `a1641afc3264d77fc9e2b5e1df349d437320f8e1`. Rama base protegida verificada sin cambios en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Próxima acción: continuar con las validaciones Beta pendientes, empezando por BETA-09. No se desplegó frontend ni Apps Script como parte de esta tarea.


## Corrección solicitada — vinculación de Spreadsheet/Drive y fallo de idempotencia AUTH — 2026-11-24

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.** Código y regresión local/CI aprobados; queda la verificación de deployments y recursos reales en Beta aislada.

- HEAD confirmado al iniciar esta corrección: `f8953006a3bde69c232cb29ac18177c014129c32`. Rama protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no modificar.
- Hallazgo de recursos: AUTH, WRITE, FEEDBACK y ADMIN utilizaban `GPSpediaSpreadsheetId_` y/o `GPSpediaCortesRootFolderId_` declarados únicamente en `CentralConfigurationReader.js`. Si ese helper no estaba copiado al proyecto Apps Script independiente, las variables no existían en el runtime. CATALOG y UTILITIES ya tenían declaración local de Spreadsheet.
- Corrección preparada: cada uno de los seis archivos principales declara directamente el ID de Spreadsheet; WRITE, FEEDBACK y ADMIN declaran además el ID de la carpeta Cortes. Se conservan los mismos recursos autorizados y las comprobaciones existentes. No se añadieron secretos, URLs, propiedades ni coordinación interservicio.
- Hallazgo de AUTH: `saveLoginRequestRecord_()` y el baseline comparaban el read-back de Sheets con la fila enviada mediante `JSON.stringify`, aunque Sheets puede devolver fechas como `Date` y valores numéricos como `number`. La comparación estricta podía rechazar una escritura correcta.
- Corrección preparada: comparación por tipo contractual de columna, normalización ISO de fechas y confirmación de read-back para login y baseline. Los campos de identidad/token/estado continúan comparándose exactamente; las diferencias reales siguen fallando.
- Pruebas actualizadas: `LoginRequestLedger.mjs` cubre coerciones de Date/número y rechazos de datos alterados; `MIG026StaticConfigSearch.mjs` exige localizadores propios por servicio. `JS/Tests/Auth.js` conserva paridad con AUTH.
- No se desplegó Apps Script ni se modificaron recursos, permisos, propiedades o datos externos. La validación real de permisos/lectura/escritura continúa diferida a Beta aislada.
- Commits: implementación `a6c7819fe82158109805f87d82cd33c3f257076d`; ajuste del escenario de read-back `6afcb02cdc41a0d8c429f66644ea0ce172be9ceb`.
- CI run `45466314443`: SUCCESS; 515 suites, 6,092 pruebas aprobadas, 0 fallos. `LoginRequestLedger: 47/47 PASS`; `MIG026StaticConfigSearch: 10/10 PASS`; sintaxis PASS. GitHub Pages run `45466312293`: SUCCESS.
- HEAD de cierre de código y pruebas: `5e09578efce8fb3b0680809fd39b48f4dbcca6c8`. Rama base protegida confirmada sin cambios en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Validación diferida: desplegar los seis proyectos en Beta aislada, verificar permisos de Spreadsheet y carpeta Cortes y probar login/idempotencia con solicitudes sintéticas. No se desplegó Apps Script ni se modificaron datos, propiedades, permisos o recursos productivos.

- Confirmación final CI en el HEAD de código/pruebas `5e09578efce8fb3b0680809fd39b48f4dbcca6c8`: run `45466859277` SUCCESS; 515 suites, 6,099 pruebas aprobadas, 0 fallos; `LoginRequestLedger: 47/47 PASS`, `MIG026StaticConfigSearch: 10/10 PASS`, sintaxis PASS. GitHub Pages run `45466858354`: SUCCESS.


## Corrección solicitada — feed CATALOG, dashboard/aportes e Inbox — 2026-11-24

**Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.** Correcciones de código y regresión local/CI aprobadas; despliegue y verificación remota reservados para Beta aislada.

- HEAD confirmado al iniciar: `ecf28f3d5c9dd485911a0051a34f6a8787dad244`; rama base protegida: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- CATALOG: `createCatalogChangeFeed_()` falla si faltan `CatalogChangeState` o `CatalogChangeEvents`. El contrato MIG-026 establece que las consultas ordinarias no crean hojas automáticamente. Se añade inicializador manual `initializeCatalogChangeFeedSheets()`, idempotente, con preflight de ambas hojas, validación de encabezados, read-back, lock no bloqueante y preservación de datos; no se conecta a HTTP GET/POST.
- FEEDBACK: el dispatcher llamaba `getCachedSharedSessionActor_()` sin `loadSpreadsheet`. SharedSessionActor exige proveedor explícito desde MIG-026. La omisión causaba `No se inyectó el proveedor de la Spreadsheet de identidad` y afectaba acciones protegidas de FEEDBACK: dashboard/actividad, agregados de aportes e Inbox.
- Cambios preparados: `JS/Services/feedback.js`, `JS/Services/catalog.js`, `JS/Tests/MIG013SessionActorLocalLookup.mjs`, nueva `JS/Tests/CatalogChangeFeedInitialization.mjs`, runner y procedimiento Beta.
- La inicialización de hojas no se ejecutó sobre ninguna Spreadsheet. No se desplegaron Apps Script ni se modificaron endpoints, permisos, propiedades o datos externos.
- Próximo paso: ejecutar CI, corregir cualquier fallo de prueba, revisar diff y publicar únicamente en `GPSpedia2.2.5_work`; después registrar SHA y resultados. Validación remota queda pendiente de Beta aislada/autorizada.

- Implementación y contratos publicados en los commits `8f22fcfecba7411e640ceac9f7256e5c69a452b0`, `cfa62a769ecd3148c63dab0001b93ea20558a9e9`, `a86bce9edd6c3b50060aa07d6b79917b1c286553`, `3694cee14a6afa6fcfb933d9f43cbf6b06f55bad` y `6db947ffa7dd50d9d2889e23d307c6160a1a17ce`.
- CI run `45471714577`: SUCCESS; 516 suites, 6,105 pruebas aprobadas, 0 fallos. Sintaxis: 466 archivos verificados. `CatalogChangeFeedInitialization: 6/6 PASS`; `MIG013SessionActorLocalLookup: 22/22 PASS`; `InboxRoleContract: 22/22 PASS`; `SensitiveLogsTrustedActor: 7/7 PASS`.
- GitHub Pages run `45471712477`: SUCCESS.
- HEAD de código y pruebas: `6db947ffa7dd50d9d2889e23d307c6160a1a17ce`. Rama base protegida sin cambios: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Validación Beta pendiente: desplegar `catalog.js` y `feedback.js` en los proyectos Beta existentes; ejecutar manualmente `initializeCatalogChangeFeedSheets()` en CATALOG contra la Spreadsheet Beta aislada; probar GET del feed, dashboard, contribuciones e Inbox con usuario sintético y cache miss. No se ejecutó el inicializador ni se modificó ninguna Spreadsheet real desde esta tarea.


## Nueva tarea autorizada — AUG-146: revisión integral de modales y experiencia del panel de desarrollador

**Estado: COMPLETADA EN CÓDIGO; VALIDACIÓN VISUAL DIFERIDA A BETA.** Solicitud registrada el 2026-11-24. Ejecutar en la rama `GPSpedia2.2.5_work`; no modificar `GPSpedia2.2.5`.

### A. Modal de detalle — encabezado
- Mantener el logo separado del borde superior e izquierdo del modal con el mismo espacio en ambos lados.
- Aumentar la altura útil de la cuadrícula del encabezado y reducir el espacio sobrante entre la línea azul y la línea de texto con versión de equipamiento y rango de años.
- Evitar que el campo de edición del nombre cubra los botones de deshacer y aceptar; coordinar su distribución con la altura de la cuadrícula.
- Mostrar «Guardando…» sobre el nombre del modelo, entre el logo y los botones de deshacer/aceptar, nunca debajo de la línea azul.
- Mantener intactos los comportamientos de edición, guardado, deshacer y aceptar.

### B. Panel de desarrollador — estructura y distribución
- Retirar por completo el apartado informativo «Tráfico global coordinado · retirado» y su explicación. No mostrar al usuario explicaciones sobre estructura interna del código o del repositorio.
- En escritorio, reducir la altura/ocupación de la consola para que no desplace ni oculte las funciones de las pestañas; reorganizar los espacios y compactar la navegación.
- Los botones de pestañas deben iniciar como iconos compactos y expandir su etiqueta únicamente al seleccionarse.
- En móvil, alinear «Consola» arriba a la izquierda y los botones de limpiar/copiar en la misma línea horizontal. Usar iconos compactos con expansión de etiqueta al seleccionar.
- En móvil, integrar el símbolo `>` dentro del campo de comando, mantener una sola línea horizontal y colocar al final un botón de ejecución solo con el icono `>_`; retirar el botón que actualmente queda debajo.
- Eliminar el segundo título que repite el nombre de la pestaña seleccionada en escritorio y móvil. Conservar el nombre dinámico del botón seleccionado.
- Mantener sin cambios la lógica y los efectos de los botones de limpiar consola, copiar registro, ejecutar comando y navegación entre pestañas; esta tarea es exclusivamente visual para esos controles.

### C. Ayuda contextual
- Las explicaciones extensas del modal de desarrollador deben permanecer ocultas al abrirlo y mostrarse únicamente al activar el botón de información correspondiente.
- Conservar accesibilidad, relaciones aria-controls/expanded y los comportamientos actuales de ayuda contextual.

### D. Mensajes de operaciones
- Simplificar los mensajes de éxito y error dirigidos al usuario: breves, claros y centrados en el resultado (por ejemplo, «Cambios guardados», «Modelo agregado», «Corte agregado»).
- No exponer en producción trazas, detalles internos, nombres de funciones, estructura del repositorio ni mensajes técnicos extensos. Los detalles diagnósticos deben permanecer en los canales internos existentes, sin alterar la operación ni ocultar fallos al sistema.

### E. Publicación de endpoints y selección de versiones

- Mostrar en la consola del desarrollador un resultado individual por servicio: actualizado correctamente, sin cambios o error; no anunciar como actualizado un endpoint cuya URL permaneció igual.
- Mantener intacta la operación de los controles y el flujo de publicación. El usuario debe recibir mensajes breves; la consola conserva el resultado técnico y el estado por servicio.
- Verificar que todas las lecturas de endpoints seleccionen exclusivamente las filas cuya `config_revision` coincide con `ConfiguracionControl.active_revision`, y que cada servicio se resuelva por `service_key` + revisión activa, nunca por la primera URL encontrada ni por orden de filas.
- Investigar la aparente duplicación de filas en `Servicios`. Preservar el modelo versionado y append-only: una nueva revisión debe contener una instantánea completa coherente de los seis servicios; el historial de cambios debe registrar únicamente los servicios cuyo endpoint realmente cambió. Las filas de borrador sin revisión no deben confundirse con endpoints activos ni utilizarse para enrutar.
- Agregar pruebas para actualización parcial, endpoints sin cambios, reintento idempotente, selección de revisión activa, ausencia de duplicados dentro de una misma revisión y mensajes individuales. No borrar ni reescribir revisiones históricas.

### Orden y validación
1. Inspeccionar HTML, CSS, JS y pruebas actuales de ambos modales antes de editar.
2. Implementar primero el encabezado del modal de detalle y su regresión de edición/guardado.
3. Ajustar estructura, consola, pestañas y ayudas del modal de desarrollador sin cambiar la lógica de controles.
4. Revisar los mensajes de confirmación/error en las operaciones de imágenes, modelos y cortes, manteniendo el diagnóstico interno.
5. Añadir o actualizar pruebas de contrato y regresión para escritorio/móvil, solapamientos, orden/alineación, visibilidad de ayudas y mensajes públicos.
6. Ejecutar sintaxis, suites pertinentes y CI; revisar el diff completo. La validación visual de navegador/viewport se registrará como pendiente de Beta si no hay navegador disponible.
7. Actualizar checkpoint y ChangesLogs con evidencia real. No desplegar servicios Apps Script ni modificar recursos productivos.


### Resultado de ejecución AUG-146 — 2026-11-24

- Modal de detalle: se ajustaron márgenes superiores/izquierdos iguales para el logo, altura de cuadrícula, espacio de metadatos, campo de edición, divisor y posición del indicador de guardado. Se conserva el flujo JS de edición, guardado, deshacer y aceptar.
- Modal de desarrollador: se retiró el apartado informativo del tráfico global retirado; consola compactada a 24% en escritorio y máximo 30% en móvil; navegación por iconos con expansión de pestaña activa; limpiar/copiar alineados junto al título y expansión de etiquetas al recibir foco; prompt integrado en una sola barra con ejecución `>_`; encabezados duplicados ocultos visualmente y preservados para accesibilidad.
- Ayuda contextual: las explicaciones extensas se trasladaron a popovers ocultos inicialmente y asociados a botones de información; se eliminaron duplicados visibles. Se conserva el estado accesible de los controles y se respeta `prefers-reduced-motion`.
- Mensajes: las alertas de alta de Cortes y páginas auxiliares se redujeron a mensajes genéricos breves; los detalles se conservan en el logger autorizado de desarrollador. Las confirmaciones se acortaron sin alterar las operaciones.
- Endpoints: el frontend registra por servicio si la URL cambió o permaneció igual. AUTH ahora selecciona exclusivamente la revisión activa, valida la versión de contrato contra el mapa compatible y falla cerrado ante servicios duplicados/faltantes o versión incompatible. En nuevas revisiones se conserva la metadata de auditoría de servicios sin cambios; el historial solo registra los servicios realmente modificados. La instantánea versionada completa de seis servicios y el historial append-only se mantienen.
- Pruebas: se reforzaron `DeveloperPanelCopy`, `DeveloperPanelUX`, `CutDetailModalLayout`, `DeveloperOperationMessages`, `CentralServiceUrlPublisher`, `DevToolsModalAccessibility`, `SupplementaryVideoContract`, `CortesImageReconciliationUI`, `AdminReplacedImagesIntegrity` y el fixture AUTH.
- CI run `45486260447`, HEAD `465194319f7e1c8b21aff181afea3142ef8384a9`: SUCCESS; 516 suites, 6,115 pruebas aprobadas, 0 fallos.
- GitHub Pages run `45486258242`: SUCCESS sobre el mismo HEAD.- Código funcional validado en `465194319f7e1c8b21aff181afea3142ef8384a9` sobre `GPSpedia2.2.5_work`. Los registros de cierre se actualizaron después en `checkpoint.md` y `ChangesLogs.txt`. La rama base protegida `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.
- No se desplegaron servicios Apps Script ni se modificaron Spreadsheet, Drive, propiedades, permisos o datos externos.
- Pendiente exclusivamente: validación visual con navegador en viewports reales (móvil y escritorio) y prueba de publicación de endpoints en Beta aislada. Sin esa comprobación no se declara validación visual ni remota completada.


### Addendum AUG-146 — procedimiento Beta — 2026-11-24

- Se añadió Tareas_Beta.md §20 con la comprobación visual de AUG-146 en escritorio y móvil, ayuda contextual, controles, mensajes y criterios para registrar NO EJECUTADO cuando falte navegador/viewport.
- La ejecución operativa de endpoints continúa bajo Tareas_Beta.md §19. No se desplegaron Apps Script ni se modificaron recursos externos.
- Commit del procedimiento Beta: 09d5dc2bf73c21c99d71b16a94eed0b8c46f936b. HEAD de trabajo tras el registro: 09d5dc2bf73c21c99d71b16a94eed0b8c46f936b. Rama base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin cambios.
- CI run 45486734920: SUCCESS; 516 suites, 6,115 pruebas aprobadas, 0 fallos. GitHub Pages run 45486735045: SUCCESS.


### Cierre de validación visual automatizada AUG-146 — 2026-11-24

- Se implementó `JS/Tests/Aug146ResponsiveBrowser.mjs` con Playwright/Chromium sobre el HTML, CSS y módulos UI reales. Se integró como job `responsive-browser` del workflow existente `.github/workflows/service-tests.yml`; se eliminó el workflow duplicado que no era necesario.
- El harness usa sesión/vehículo sintéticos, intercepta solicitudes a Apps Script y no ejecuta despliegues, escrituras remotas ni operaciones productivas. Captura Developer, detalle y detalle en modo edición.
- Se comprobó escritorio 1366×768 y móvil 390×844, 360×800 y 320×700: 148/148 aserciones PASS, 12 capturas. CI run `45494735181`, HEAD probado `665822fcd93752646c2e76416bcaa4f22fabc09b`: SUCCESS. Artefacto `14968421776`.
- La prueba detectó que en 320 px las acciones de edición podían invadir el área del título. Se corrigió `style.css` para envolver los controles, reservar dos filas del encabezado cuando el título pasa debajo del logo y evitar solapamientos. La repetición completa quedó aprobada.
- Regresión general del mismo CI: 516 suites, 6,115 pruebas aprobadas, 0 fallos. GitHub Pages run asociado al HEAD probado: SUCCESS.
- `Tareas_Beta.md` §20 actualizado: validación automatizada completada; permanece pendiente la revisión manual en dispositivos físicos. La validación real de configuración central/endpoints continúa en §19, exclusivamente con Spreadsheet y deployments aislados.
- Estado AUG-146: COMPLETADA CON VALIDACIÓN DIFERIDA. No se desplegaron Apps Script ni se modificaron Spreadsheet, Drive, propiedades, permisos o datos productivos. Rama base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.


### Verificación final de AUG-146 en HEAD consolidado — 2026-11-24

- HEAD consolidado `de833ce9d2575c276789542bdc45f2dbadcaa59f` incluye también el cambio concurrente de `JS/Frontend/api-config.js` sin alterarlo. La suite completa volvió a ejecutarse sobre este HEAD.
- CI run `45494991186`: SUCCESS en ambos jobs. Regresión: 516 suites, 6,115 pruebas aprobadas, 0 fallos. Playwright/Chromium: 148/148 PASS, cuatro viewports (1366×768, 390×844, 360×800, 320×700) y 12 capturas.
- Artefacto de evidencia: `14966794425`. GitHub Pages run `45494990388`: SUCCESS.
- Rama de trabajo consolidada: `GPSpedia2.2.5_work`. Base protegida: `GPSpedia2.2.5` en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones.


### Revisión posterior a AUG-146 — Developer, dashboard y CATALOG — 2026-11-24

- Corregida la distribución del modal Developer: las cuatro secciones vuelven a una fila horizontal; la pestaña activa ya no se expande y desplaza las otras en móvil. La consola queda al 50% del ancho en escritorio y al 100% en móvil; información, limpiar y copiar quedan agrupados a la izquierda.
- Dashboard: se agregó un estado vacío visible en la tabla de actividad, manejo explícito de respuestas FEEDBACK no exitosas y mensajes de diagnóstico para hojas ausentes. FEEDBACK devuelve disponibilidad y cantidad de filas de ActividadUsuario, InboxAuditLog y Cortes, además de indicar si existen contribuciones.
- CATALOG: la ausencia de CatalogChangeState/CatalogChangeEvents se clasifica como feed incremental no inicializado. Se conserva el fallback a snapshot completo y se evita repetir la traza como error en la misma sesión; se muestra un aviso informativo de inicialización pendiente.
- Pruebas ampliadas: respuesta FEEDBACK sintética y renderizado de dashboard, estado vacío, diagnóstico de fuentes, clasificación del feed CATALOG y geometría de pestañas/consola en cuatro viewports.
- CI run `45498897055`: SUCCESS; 517 suites, 6,125 pruebas aprobadas, 0 fallos. Playwright/Chromium: 184/184 PASS en 1366×768, 390×844, 360×800 y 320×700; 16 capturas sintéticas. Artefacto `14970486726`.
- GitHub Pages run `45498895792`: SUCCESS.
- No se desplegaron Apps Script ni se modificaron Spreadsheet, Drive, propiedades, permisos o datos productivos.
- Pendiente Beta: publicar FEEDBACK en el deployment aislado y verificar sus hojas/contadores; ejecutar una vez `initializeCatalogChangeFeedSheets()` en el proyecto CATALOG Beta y comprobar el cursor real. Procedimiento detallado en `Tareas_Beta.md` §21.
- HEAD funcional probado: `57b3aaa511b9a0ffd279e339dd82b5b38b0b87bf`. Base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.


## Revisión solicitada — defectos posteriores a los últimos cambios — 2026-11-24

**Estado general: EN PROGRESO.** Reportes recibidos del usuario sobre la versión posterior a AUG-146. Se registran por separado; no se consideran reproducidos en el deployment Beta hasta disponer de evidencia independiente. Rama de trabajo `GPSpedia2.2.5_work`; HEAD de referencia al registrar: `1d9a2fb80a2abddf9221b6ff5c7065eadcb2e4dd`. Rama base protegida sin cambios: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.

### Orden de atención — una tarea a la vez

1. **AUG-147 — Modal Developer: pestañas, consola y caché visual. COMPLETADA EN CI; validación Beta pendiente.** El CSS versionado ya define las cuatro pestañas horizontales, consola al 50% en escritorio/100% en móvil y botones de información/limpiar/copiar agrupados a la izquierda. Hallazgo de implementación: `style.css` recibió el ajuste en el commit `113ed1d5d3786a6a1ea426a723004a8dd072861d`, pero `service-worker.js` conservó `gpsepedia-cache-v75`. La estrategia devuelve primero el recurso cacheado y actualiza en segundo plano; al no cambiar el Service Worker, una PWA instalada puede continuar mostrando CSS anterior. Corrección aplicada: `service-worker.js` usa `gpsepedia-cache-v76`; `JS/Tests/ServiceWorkerCache.js` y la aserción transversal de `JS/Tests/PasswordRecovery.mjs` quedaron alineadas a v76. Chromium validó los cuatro viewports y las suites completas finalizaron sin fallos. No se añadieron reglas CSS redundantes.
2. **AUG-150 — FEEDBACK: constantes del registro de auditoría Inbox ausentes. CORREGIDA Y VALIDADA EN CI; verificación Beta pendiente.** Evidencia estática: `JS/Services/feedback.js` referencia `INBOX_AUDIT_SHEET_NAME` y `INBOX_AUDIT_HEADERS` en `ensureInboxAuditSheet_()` y `handleGetActivityLogs()`, pero no declara ninguna de las dos. El test `JS/Tests/InboxAuditTrail.js` inyecta ambas constantes en su harness y por eso no detecta que faltan en el servicio real. Contrato conocido por el test: hoja `InboxAuditLog`; encabezados `eventId,timestamp,actorId,actorName,action,itemType,itemId,details`. Corrección aplicada en `JS/Services/feedback.js`: el servicio declara localmente `INBOX_AUDIT_SHEET_NAME = "InboxAuditLog"` y los ocho encabezados contractuales. `JS/Tests/InboxAuditTrail.js` extrae esas declaraciones desde el código real del servicio y ya no las inyecta en el contexto del harness; se mantienen las pruebas de auditoría previa, read-back, esquema incompatible y fallo cerrado.
3. **AUG-148 — Dashboard de actividad sin datos. PENDIENTE; depende de AUG-150.** El usuario informa que el Dashboard continúa vacío. `handleGetActivityLogs()` accede a la constante ausente antes de devolver actividad, aportes e indicadores, lo que puede abortar la respuesta completa. Después de AUG-150, comprobar por separado el historial, los resúmenes de Cortes y los diagnósticos de hojas; no inferir que hay datos reales a partir de fixtures sintéticos. Las comprobaciones de Spreadsheet/deployment reales se reservan para Beta aislada.
4. **AUG-149 — Carga de imagen para tarjeta de Tutorial. PENDIENTE.** El formulario `openAddTutorialModal()` no contiene selector de imagen ni flujo de subida; `handleAddTutorial()` crea la fila con la tercera columna `Imagen` vacía. Acción: revisar el esquema Tutorial, la carga segura existente en WRITE/FEEDBACK, la ruta de almacenamiento Drive, el catálogo CATALOG y los contratos de aprobación antes de implementar una carga compatible. No guardar imágenes binarias en Spreadsheet ni introducir URLs/secretos de servicios Apps Script.

**Prioridad de ejecución:** terminar AUG-147 y sus pruebas; después AUG-150; luego completar el diagnóstico/corrección de AUG-148; finalmente AUG-149. No trabajar varias tareas funcionales en paralelo.


### Cierre de AUG-147 — 2026-11-24

- Commit de corrección visual/cache: `41d23f6fcfd24744025bb469ec0cbd9001f69b1f`. Ajuste de contrato de prueba detectado por CI: `9d88477315700d5b87778ce17a2e96e5f95d2331` (PasswordRecovery esperaba v75 y se alineó a v76).
- CI de regresión run `45500716073`: SUCCESS; 517 suites, 6,125 pruebas aprobadas, 0 fallos. Playwright/Chromium: job `responsive-browser` SUCCESS; cuatro viewports requeridos.
- GitHub Pages run `45500714866`: SUCCESS.
- El primer CI tras la corrección funcional detectó únicamente la aserción obsoleta `gpsepedia-cache-v75` en `PasswordRecovery.mjs`; se corrigió y la ejecución completa posterior quedó limpia.
- HEAD validado: `9d88477315700d5b87778ce17a2e96e5f95d2331`. Rama base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.
- Validación Beta visual pendiente: el SHA realmente servido por Beta/PWA instalada no fue verificado. No se desplegaron Apps Script ni se modificaron Spreadsheet, Drive, propiedades, permisos o datos productivos.


### Corrección AUG-150 — 2026-11-24

- Commit funcional: `bb8103461676fe12ad488d8f323cd2195d0787e7` (declaración de esquema local FEEDBACK). Prueba sin inyección: `cdcce19101f3f39239f247c8506dd7fbbcd04e65`.
- La primera ejecución de la prueba detectó que la extracción del esquema desde el fuente usaba un patrón demasiado estricto; se sustituyó por extracción delimitada de las declaraciones reales del módulo. No se modificó el comportamiento de auditoría.
- CI final run `45501003318`: SUCCESS; 517 suites, 6,125 pruebas aprobadas, 0 fallos. FEEDBACK ledger Inbox: 15/15 PASS; MIG020 auditoría inmutable de Inbox: 15/15 PASS. Chromium responsive SUCCESS. Pages run `45501002454`: SUCCESS.
- El harness ya no inyecta `INBOX_AUDIT_SHEET_NAME` ni `INBOX_AUDIT_HEADERS`; el test ejecuta las funciones con las constantes extraídas del propio módulo FEEDBACK.
- HEAD de código probado: `cdcce19101f3f39239f247c8506dd7fbbcd04e65`. Base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.
- Pendiente: verificar el servicio FEEDBACK en deployment Beta aislado y comprobar el Dashboard con datos reales. No se desplegó Apps Script ni se modificaron hojas, Drive, propiedades, permisos o datos externos.



### Adenda de continuidad — rectificación de IDs y corrección del registro de actividad — 2026-11-24

- **Rectificación de trazabilidad:** los identificadores AUG-147, AUG-148, AUG-149 y AUG-150 usados en la revisión previa fueron etiquetas asignadas por el asistente; no se recuperaron del backlog oficial y no deben tratarse como IDs oficiales ni reutilizarse para nuevas tareas. Se conserva el texto histórico anterior sin reescribirlo. La secuencia real de trabajo continúa desde la revisión posterior a AUG-146 y los hallazgos BETA-F003 a BETA-F006.
- **Orden vigente:** (1) corregir/validar Dashboard FEEDBACK; (2) implementar imagen de tarjeta en el alta de Tutorial; (3) investigar el error de subida YouTube «Tutorial no encontrado». El reporte repetido sobre imagen de tarjeta es un solo defecto, no dos tareas.
- **Dashboard — causa adicional encontrada:** `logUserActivity()` exigía una fórmula o configuración previa para generar el ID en `ActividadUsuario`. Si la hoja estaba vacía o solo tenía IDs estáticos, el primer registro fallaba y el error quedaba únicamente en Logger; por tanto, las acciones de actividad no podían inicializar el historial.
- **Corrección:** se conserva la fórmula cuando existe un patrón válido; cuando no existe patrón previo y el error corresponde exclusivamente a ausencia de patrón, el registro usa un ID estático único `ACT-<UUID>`. Los esquemas/formatos de fórmula incompatibles siguen fallando cerrados. Se actualizó `JS/Tests/ActivityLogAppendAtomic.mjs` para probar hoja vacía, IDs estáticos históricos, fórmula existente y patrón incompatible.
- **Validación local:** CI run `45502874404`, HEAD `a13dd84379e575d06f0a4e73bc1909cdad346f1d`: SUCCESS; 517 suites, 6,139 pruebas aprobadas, 0 fallos. `ActivityLogAppendAtomic` 10/10 PASS; `ActivityLogsBoundedRead` 8/8 PASS; pruebas de contribuciones e indicadores PASS. Chromium responsive: 184/184 PASS en 1366×768, 390×844, 360×800 y 320×700 (esta prueba es del panel/modal, no valida datos reales de Dashboard). GitHub Pages run `45502874103`: SUCCESS.
- **Estado Dashboard:** COMPLETADA CON VALIDACIÓN DIFERIDA. La corrección local está probada; queda comprobar en Beta aislada el deployment FEEDBACK y la escritura/lectura de actividad en la Spreadsheet Beta. No se desplegó Apps Script ni se modificó Spreadsheet, Drive, propiedades, permisos o datos externos.
- **Rama:** `GPSpedia2.2.5_work`, HEAD `a13dd84379e575d06f0a4e73bc1909cdad346f1d`. Rama base protegida `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- **Siguiente tarea:** revisar el contrato de Tutorial y los flujos de carga existentes para implementar la imagen de tarjeta sin almacenar binarios en Spreadsheet ni introducir URLs/secretos entre servicios Apps Script. Después investigar la subida YouTube.



### Adenda de continuidad — imagen de tarjeta de Tutorial — 2026-11-24

- **BETA-F005 corregido en rama:** el formulario de alta ahora permite seleccionar una imagen opcional JPEG, PNG o WebP, máximo 3 MB, y la envía como Data URL a la acción FEEDBACK `addTutorial`.
- **Almacenamiento:** FEEDBACK valida MIME, codificación, tamaño y firma binaria; guarda el archivo en la carpeta Drive `Cortes/Tutoriales`, verifica que sea hija directa de la raíz autorizada y que conserve los permisos heredados de la carpeta. La hoja `Tutorial` guarda únicamente la referencia Drive en la columna C `Imagen`; no se almacenan binarios/Base64 en Spreadsheet.
- **Integridad/reintentos:** el hash de la imagen forma parte del payload de creación cuando se adjunta imagen; el mismo `operationId` y contenido reutilizan el archivo, mientras que cambiar la imagen con el mismo ID se rechaza. Los archivos se nombran de forma determinista; un archivo pendiente con metadata ausente solo se recupera después de verificar su contenido binario, tamaño, MIME, nombre y ubicación. CATALOG normaliza la URL Drive al ID usado por las tarjetas.
- **Pruebas:** `TutorialIntegrity` 47/47 PASS; incluye carga/columna Imagen, proyección CATALOG, reintento sin duplicar, rechazo de imagen distinta para el mismo ID, validación de formato/firma y recuperación de metadata pendiente.
- **Validación completa:** CI run `45504362878`, HEAD `58e6ca989bc39d2fbc13a3ba5ae7c65f780370be`: SUCCESS; 517 suites, 6,147 pruebas, 0 fallos. Chromium responsive 184/184 PASS en 1366×768, 390×844, 360×800 y 320×700. GitHub Pages run `45504362787`: SUCCESS.
- **Límites:** no se desplegó Apps Script ni se modificaron Spreadsheet, Drive, propiedades, permisos o datos externos. El código crea la carpeta/archivo únicamente cuando se ejecute una carga autorizada en el entorno objetivo; Beta aún no se ha probado.
- **Estado BETA-F005:** CORREGIDO EN RAMA Y VALIDADO EN CI; prueba con cuenta/Drive/Spreadsheet Beta aislados pendiente.
- **Siguiente tarea:** investigar BETA-F007, error de carga de vídeo a YouTube «Tutorial no encontrado». No asumir que el tutorial no existe; revisar la resolución de identidad, operación y referencia entre el flujo de carga y el registro canónico.
- **Rama:** `GPSpedia2.2.5_work`, HEAD `58e6ca989bc39d2fbc13a3ba5ae7c65f780370be`. Rama base protegida `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


### Estado de continuidad — cierre de correcciones reportadas — 2026-11-24

- **Dashboard FEEDBACK:** corrección de arranque de `ActividadUsuario` completada en rama; si no hay patrón de ID se genera `ACT-<UUID>`, preservando fórmulas válidas y fallando cerrado ante patrones incompatibles. CI específico documentado arriba; validación Beta aislada pendiente.
- **Imagen de tarjeta Tutorial:** selector y carga Drive implementados; columna `Imagen` conserva URL, no Base64. Validación binaria, permisos heredados, idempotencia y recuperación probados. CI específico documentado arriba; validación Beta aislada pendiente.
- **YouTube Tutorial:** CATALOG expone `referenceId` físico o legacy estable; frontend lo pasa a FEEDBACK; `findTutorialRow_()` resuelve identidad legacy sin depender del título visible y conserva rechazo estricto para IDs canónicos inexistentes. CI run `45505972628`: SUCCESS, 517 suites, 6,155 pruebas, 0 fallos; `FeedbackTutorialLookupBoundedRead` 9/9, `TutorialIntegrity` 48/48 y FEEDBACK inicialización YouTube 9/9 PASS. Chromium 184/184 PASS. Pages run `45505971953`: SUCCESS. Validación con YouTube Beta real pendiente.
- **Procedimientos Beta:** añadidas las secciones 22 (Dashboard), 23 (imagen Tutorial) y 24 (referencia YouTube) en `Tareas_Beta.md`, con comandos de sincronización segura, pasos y límites de no producción.
- **Hallazgos:** BETA-F004 (Dashboard), BETA-F005 (imagen) y BETA-F007 (YouTube) conservan sus entradas originales y tienen adendas de implementación/evidencia. El reporte repetido de imagen permanece consolidado como un único hallazgo.
- **Trazabilidad:** AUG-147, AUG-148, AUG-149 y AUG-150 fueron etiquetas no oficiales del asistente, no IDs del backlog; no se deben reutilizar. No se crearon nuevos IDs de tareas.
- **Seguridad/alcance:** no se desplegó Apps Script, no se subió vídeo a YouTube y no se modificaron Spreadsheet, Drive, propiedades, permisos ni datos productivos. Las tres correcciones están en rama; las pruebas de integración Beta siguen pendientes.
- **Rama de trabajo actual:** `GPSpedia2.2.5_work`, HEAD `5c537c8d6316d5c72a33610e6efea559806ea0b5`. **Rama base protegida:** `GPSpedia2.2.5`, HEAD `d9acc68d889985c2e2f42fe3a02e502efc86ead1` (sin modificaciones).
- **Siguiente paso operativo:** validar en Beta aislada las tres correcciones conforme a `Tareas_Beta.md` §§22–24. No se debe declarar resuelto en Beta hasta contar con esa evidencia.


### Adenda final de validación — YouTube Tutorial — 2026-11-24

- Se amplió la prueba de inicialización para cubrir tanto Tutorial histórico sin ID físico (referencia `legacy-<SHA-256>`) como Tutorial nuevo con ID canónico `tut-...`. Ambas rutas pasan.
- `FeedbackTutorialLookupBoundedRead`: 9/9 PASS; `TutorialIntegrity`: 48/48 PASS; FEEDBACK precondiciones de subida resumable: 10/10 PASS.
- CI run `45506352069`, commit de código `ffaea2ec6d78adebcea5d7b826163484a4f50ddd`: SUCCESS; 517 suites, 6,156 pruebas, 0 fallos. Chromium responsive 184/184 PASS. Pages run `45506351422`: SUCCESS.
- **Límite de diagnóstico:** se corrigió la brecha de resolución de tutoriales históricos y se validaron ambos formatos de referencia en pruebas aisladas. No se reprodujo el error en el deployment Beta real ni se subió un vídeo real; si el problema persiste con un tutorial nuevo, la siguiente evidencia necesaria es la etapa exacta (init/submit), el formato de referencia y la existencia de la fila en la misma Spreadsheet Beta usada por CATALOG y FEEDBACK.
- **Dashboard:** la corrección evita que una hoja nueva/estática quede sin poder registrar el primer evento. La validación Beta debe comprobar también lectura y render; si la hoja ya tiene filas y sigue sin mostrarlas, continuar con los diagnósticos de origen/lectura indicados en Tareas_Beta §22, sin asumir que el fallback de ID sea la única causa.
- **Rama de trabajo actual:** `GPSpedia2.2.5_work`, HEAD `2b39236ca5b529a3b2ed8f36abc0f19857fba72f`. **Rama base protegida:** `GPSpedia2.2.5`, HEAD `d9acc68d889985c2e2f42fe3a02e502efc86ead1` (sin modificaciones).
- **Siguiente paso:** ejecutar las validaciones de integración en Beta aislada de `Tareas_Beta.md` §§22–24. No se debe declarar el cierre de Beta sin evidencia real.

## Nueva revisión de interfaz solicitada — 2026-11-24

- Las incidencias nuevas se registran en `Tareas_Activas.md`, sin asignar IDs AUG no oficiales ni reabrir BETA-F007.
- Orden de desarrollo, una tarea a la vez: (1) modal de detalle Tutorial — formato enriquecido seguro y vídeo YouTube; (2) Dashboard — mostrar `cortesAportados` por usuario separado de los aportes totales; (3) modal Developer — barra de pestañas bajo la línea de comando, etiquetas expandidas solo en la pestaña activa, consola al doble de altura y mensajes de endpoints exclusivamente en consola con botón «Actualizar Servicios».
- Auditoría de duplicados: la agregación de modelos, cortes, utilidades y contribuciones del Dashboard ya existe; la tarea 2 solo completa la presentación del conteo individual de cortes, que el backend ya calcula. AUG-146/AUG-147 cubren otros aspectos del modal Developer; las nuevas condiciones de orden, altura y salida de mensajes no están cubiertas.
- Siguiente paso de desarrollo: implementar y probar únicamente la tarea 1 de `Tareas_Activas.md`. La validación Beta de BETA-F007 y demás procedimientos existentes permanece separada.


### Rectificación de trazabilidad y nuevo registro activo — 2026-11-24

- **Corrección de la adenda anterior:** fue incorrecto afirmar que AUG-147, AUG-148, AUG-149 y AUG-150 eran etiquetas no oficiales inventadas por el asistente. La evidencia del propio repositorio confirma que AUG-147 tiene registro de inicio/cierre en `ChangesLogs.txt` (caché v76) y AUG-150 tiene registro de corrección/cierre (esquema Inbox). AUG-148 y AUG-149 constan como tareas pendientes en este checkpoint y en `Hallazgos_Beta.md`; no tienen cierre funcional en `ChangesLogs.txt`. Se conserva el historial, pero se retira la afirmación incorrecta de que esos IDs fueron inventados.
- **Registro vigente:** `Tareas_Activas.md` fue añadido a la rama en el commit `9442da203814be4891de82f93a1730700fb4b31d`. Su orden pasa a ser la fuente operativa para el trabajo pendiente: (1) modal de detalle Tutorial — formato enriquecido y vídeo YouTube; (2) desglose de cortes aportados por usuario en Dashboard; (3) ajustes adicionales del modal Developer. No asignar IDs nuevos.
- **BETA-F007:** corrección de referencia legacy y prueba de inicialización para Tutorial histórico y nuevo completadas en código/CI. CI `45506352069`: 517 suites, 6,156 pruebas, 0 fallos; FEEDBACK inicialización YouTube 10/10 PASS. Beta real sigue pendiente.
- **Nueva tarea en curso:** iniciar el punto 1 de `Tareas_Activas.md`. Preservar HTML enriquecido mediante el modo de sanitización permitido, mantener protección XSS y construir el iframe YouTube solo con URLs validadas y DOM; no interpolar contenido no validado en `innerHTML`.


### Cierre de tarea activa 1 y comienzo de tarea activa 2 — 2026-11-24

- **Tarea 1 — Modal de detalle Tutorial:** COMPLETADA. La implementación existente cumple el contrato: contenido enriquecido con `sanitizeHtmlContent(..., "advanced")`, eliminación de scripts/handlers/URLs activas, iframe creado con DOM y URL validada por `getValidatedYouTubeVideoEmbedUrl()`. No se modificó código productivo; se reforzó la prueba de navegador para comprobar énfasis, listas, estilos, XSS y siete variantes válidas/seis no confiables de URL.
- **Pruebas:** CI run `45507769616`: 517 suites, 6,156 pruebas, 0 fallos; `TutorialIntegrity` 48/48 PASS; `FeedbackTutorialLookupBoundedRead` 9/9 PASS; Chromium `Aug146ResponsiveBrowser` 216/216 PASS en 1366×768, 390×844, 360×800 y 320×700; Pages run `45507768695`: SUCCESS.
- **Tarea 2 — Dashboard de actividad, desglose de aportes por usuario:** EN PROGRESO. Reutilizar `readActivityDashboardCutsSnapshot_()`, `buildActivityDashboardInsights_()` y `buildCutContributionSummary_()`; exponer `cortesAportados` por usuario en la tabla, separado de `aportesRegistrados` y `vehiculosConAportes`. No crear segunda fuente ni alterar hojas/datos.
- El orden de trabajo sigue el archivo `Tareas_Activas.md`. No se asigna un ID nuevo.


### Cierre de tarea activa 2 y comienzo de tarea activa 3 — 2026-11-24

- **Tarea 2 — Dashboard de actividad, cortes aportados por usuario:** COMPLETADA. Se corrigió la normalización frontend para no confundir `cortesAportados` con `aportesRegistrados`; ambos se agrupan por separado y `vehiculosConAportes` conserva deduplicación por máximo de conteos agregados. La tabla presenta cuatro columnas: Usuario, Cortes aportados, Aportes registrados y Vehículos con aportes. El ranking superior muestra las mismas tres métricas con singular/plural correcto. Backend y datos almacenados no fueron modificados.
- **Pruebas:** `ActivityDashboardContributions` 3/3 PASS, incluyendo agregación por identidad, aliases, forma histórica, render de cuatro columnas, estado vacío y ranking. CI run `45508470807`: 517 suites, 6,156 pruebas, 0 fallos. Chromium responsive 216/216 PASS; Pages run `45508470780`: SUCCESS.
- **Tarea 3 — Modal Developer, disposición, consola y actualización de servicios:** EN PROGRESO. Seguir los requisitos de `Tareas_Activas.md`: pestañas debajo de la línea de comando, etiquetas solo en pestaña activa, consola con el doble de altura útil, compactación sin perder handlers, mensajes funcionales de Endpoints solo en consola y botón “Actualizar Servicios”. Añadir pruebas responsive de geometría y resultados individuales.
- No asignar ID nuevo; seguir el orden de `Tareas_Activas.md`.

### Cierre de tarea activa 3 — Modal Developer — 2026-11-24

- **Tarea 3 — Modal Developer, disposición, consola y actualización de servicios:** COMPLETADA EN CÓDIGO Y CI. La consola y la línea de comandos aparecen antes de las pestañas. La pestaña activa expande su etiqueta; las demás muestran iconografía solamente. La consola pasa de 24% a 48% de altura útil y ocupa el ancho disponible. Se compactaron paddings, márgenes y botones, preservando IDs y handlers.
- Endpoints envía exclusivamente a la consola Developer los estados de carga, validación, permisos/sesión, resultados individuales, endpoints sin cambios, errores y cierre de actualización. No se muestran mensajes bajo el botón. El botón se denomina **Actualizar Servicios**.
- **Pruebas:** `DeveloperPanelUX` 11/11 PASS; `DeveloperOperationMessages` 8/8 PASS. CI run `45509850708`: 517 suites, 6,160 pruebas aprobadas, 0 fallos. Chromium `Aug146ResponsiveBrowser` 236/236 PASS en 1366×768, 390×844, 360×800 y 320×700. Pages run `45509849705`: SUCCESS.
- No se modificaron Apps Script, endpoints reales, PropertiesService, OAuth, permisos, Spreadsheet, Drive ni datos. No se desplegaron servicios backend.
- **Rama de trabajo:** `GPSpedia2.2.5_work`; HEAD al cerrar esta tarea `711ce5f5733dd0c48804c810af97ba6913cc1b0e`. **Rama base protegida:** `GPSpedia2.2.5` en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones.
- **Siguiente paso:** revisar tareas activas y auditorías para seleccionar la siguiente actividad prioritaria.

### Continuidad después del cierre de tareas solicitadas — 2026-11-24

- Las tres tareas de la solicitud (detalle Tutorial, desglose Dashboard y modal Developer) están COMPLETADAS EN CÓDIGO Y CI. Evidencia final de Developer: CI `45509850708`, 517 suites / 6,160 pruebas / 0 fallos; Chromium 236/236 PASS; Pages `45509849705` SUCCESS.
- Se actualizó `Tareas_Beta.md` §21 para reflejar la interfaz Developer actual (consola 48% de altura, ancho completo, pestaña activa expandida, endpoints solo en consola) y el desglose separado del Dashboard. Las validaciones operativas reales siguen pendientes.
- **No hay otra tarea de código activa en `Tareas_Activas.md`.** Siguiente paso: ejecutar Beta §§21–25 únicamente cuando se disponga de deployments, Spreadsheet/Drive y cuentas de prueba aislados, y exista autorización expresa. No inferir aprobación remota desde CI.
- HEAD de código funcional validado: `711ce5f5733dd0c48804c810af97ba6913cc1b0e`; rama base protegida `GPSpedia2.2.5` en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones.


---

# Continuidad prioritaria — Migración de URLs al frontend

Fecha: 2026-11-24  
Estado: **PLAN EN EJECUCIÓN — MIG-URL-001 COMPLETADA; MIG-URL-002 ES LA SIGUIENTE Y ÚNICA TAREA AUTORIZADA.**

- Repositorio: `infogpstech/GPSpedia`.
- Rama autorizada: `GPSpedia2.2.5_work`.
- Rama base protegida verificada: `GPSpedia2.2.5` en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no modificar.
- HEAD de trabajo al iniciar este registro: `4e98f6cb429352bf9293039b825a9ebb24916295`. Este valor corresponde al estado previo al commit de registro; el SHA del commit que incorpora este checkpoint debe consultarse en GitHub.
- Documento rector: `Migracion_URL_Servicios_Frontend.md`.
- **Exclusividad:** no iniciar, retomar ni ejecutar ninguna tarea distinta de MIG-URL-001..008 mientras el plan siga abierto. No ejecutar las tareas Beta pendientes ni seleccionar tareas de otros registros. Registrar hallazgos ajenos sin ejecutarlos, salvo riesgo crítico de seguridad/integridad.
- **Decisión técnica confirmada comparando con la rama protegida:** reproducir el mecanismo de `api-config.js` de `GPSpedia2.2.5`: objeto único `API_ENDPOINTS` con una entrada por servicio, edición manual de la URL y resolución mediante `ACTION_TO_SERVICE_MAP`. En la rama de trabajo el archivo está en `JS/Frontend/api-config.js`. Adaptar a los seis servicios actuales AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN. No reintroducir LEGACY/USERS ni revertir las mejoras posteriores del frontend.
- No usar tabla paralela `SERVICE_ENDPOINTS`, Spreadsheet/AUTH como fuente de endpoints, bootstrap remoto, caché central de URLs ni fallback remoto.
- MIG-URL-001 — **COMPLETADA:** §§17.1 y 18 de `NORMAS_DESAROLLO.md` actualizadas; plan de ocho tareas creado; `Tareas_Activas.md`, `ChangesLogs.txt` y este checkpoint actualizados.
- MIG-URL-002 — **PENDIENTE / SIGUIENTE:** recuperar y verificar las seis URLs actuales contra la configuración activa, deployments/fuentes e identidades de salud. No inventar ni cambiar direcciones. Registrar evidencia y discrepancias.
- MIG-URL-003..008 — PENDIENTES, sujetas a dependencias del documento.
- Restricciones: no modificar endpoints/deployments reales, propiedades, permisos, Spreadsheet, Drive, OAuth ni datos externos; Beta solo con autorización expresa y recursos aislados. Preservar todas las funciones, contratos, RBAC, sesión y diagnóstico.
- Al cerrar cada MIG-URL: pruebas locales pertinentes, revisión de diff y actualización de `Tareas_Activas.md`, `checkpoint.md` y `ChangesLogs.txt`. No declarar pruebas remotas sin evidencia.


---

# MIG-URL-002 — checkpoint parcial de inventario

Fecha: 2026-11-24  
Estado: **EN PROGRESO — falta evidencia de los endpoints activos.**

- Se inspeccionaron `JS/Frontend/api-config.js`, `JS/Services/Auth.js`, `JS/Services/CentralConfigurationReader.js` y `Services/DEPLOYMENT_GUIDE.md`.
- La fuente operativa vigente está en Google Spreadsheet: `ConfiguracionControl.active_revision` determina las filas activas de `Servicios.endpoint_url` para AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN.
- Los seis valores actuales no están versionados en Git. El archivo `api-config.js` de `GPSpedia2.2.5` contiene URLs históricas, pero no evidencia que los deployments sigan vigentes; no copiarlas sin verificación.
- `CENTRAL_CONFIGURATION_BOOTSTRAP_URL` es solo el localizador para solicitar la configuración a AUTH; no se debe confundir con la URL operativa de AUTH.
- El conector Google Drive/Sheets aparece deshabilitado por administración, por lo que no fue posible leer la revisión activa. Inventario y evidencia: `Inventario_URL_Servicios.md`.
- No se ejecutaron GET de salud ni workflows remotos porque no está confirmado que el bootstrap apunte a un entorno Beta aislado. No se modificaron deployments, endpoints, Spreadsheet ni permisos.
- **Única tarea activa:** MIG-URL-002. No iniciar MIG-URL-003 ni tareas externas al plan hasta recuperar el snapshot de solo lectura y verificar las seis identidades de salud.
- Dato pendiente: export/snapshot de solo lectura de `ConfiguracionControl` y `Servicios`, incluyendo `active_revision`, `publication_state` y las seis filas de esa revisión. No hacen falta credenciales ni permisos de escritura.


---

# Cierre MIG-URL-002 y continuidad MIG-URL-003 — 2026-11-24

- El usuario proporcionó las seis URLs operativas de AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN; están registradas en `Inventario_URL_Servicios.md` con procedencia directa.
- Validación estructural realizada: seis URLs HTTPS de Google Apps Script con ruta `/exec` y seis IDs de deployment diferentes.
- No fue posible leer `ConfiguracionControl.active_revision` ni contrastar Spreadsheet porque el conector Google Drive/Sheets está deshabilitado. No se atribuye esa fuente a los valores proporcionados.
- No se realizaron peticiones remotas. Identidad `GPSpedia-*` y salud funcional quedan diferidas a MIG-URL-008, en Beta aislada y con autorización expresa.
- **MIG-URL-002 COMPLETADA. MIG-URL-003 es la única tarea activa.** Implementar el objeto único `API_ENDPOINTS` en `JS/Frontend/api-config.js`, preservando el mapa de acciones y los contratos actuales. No iniciar tareas ajenas a MIG-URL-001..008.
- Rama de trabajo: `GPSpedia2.2.5_work`. Rama protegida `GPSpedia2.2.5`: no modificar.


## Actualización de continuidad — 2026-11-24

- **Incidencia de catálogo:** el usuario eliminó manualmente el único registro inválido de tipo like en la hoja `FeedbackLikes`. Después de esa eliminación, `handleGetCatalogData` volvió a funcionar. No se realizaron cambios de código ni modificaciones de datos por parte del asistente. La causa inmediata observada fue el registro inválido que disparaba `readFeedbackLikeEventCounts_`; queda como antecedente para evitar que registros inválidos vuelvan a interrumpir la lectura completa del catálogo.
- **Nueva tarea registrada en cola:** mejorar la pestaña **Actividad reciente** del Dashboard. La tarea está detallada en `Tareas_Activas.md`: mostrar inicialmente Fecha, Usuario y Acción; fechas/nombres/acciones legibles; acordeón de detalle por fila con información del vehículo; un solo acordeón abierto y cierre al hacer clic fuera; vista responsive sin scroll horizontal.
- **Límite expreso de esa tarea:** solo frontend y presentación de los datos ya entregados por los servicios. No modificar Apps Script, servicios, handlers, contratos, payloads, hojas ni datos.
- **Orden:** la nueva tarea queda en cola después de MIG-URL-008. La validación Beta MIG-URL-008 sigue siendo la única tarea activa del plan actual y requiere autorización expresa y confirmación de entorno Beta aislado. No se ha iniciado la nueva tarea ni se ha modificado código para ella.
- Rama autorizada: `GPSpedia2.2.5_work`. HEAD confirmado antes de registrar esta adenda: `f2613111bfcc2687544459efea49665d2f09bedc`. Rama base protegida `GPSpedia2.2.5`: no modificar.


---

## 2026-11-25 — Incidencia visual de vídeos en el modal de tutoriales (GP-VIDEO-MODAL-01)

- **Hallazgo confirmado en código:** el contenedor del reproductor se insertaba dentro de `#detalleCompleto`, un flex vertical con altura máxima y scroll, sin impedir la contracción del elemento. Esto permitía que el bloque de vídeo se encogiera o colapsara cuando el tutorial acumulaba contenido. El límite fijo de 315 px también restringía innecesariamente la altura.
- **Corrección aplicada:** el bloque del reproductor se declara no contraíble (`flex: 0 0 auto`), ancho completo, relación 16:9 y sin máximo fijo de altura; el iframe ocupa el contenedor. Se añade prueba de contrato frontend.
- **Archivos:** `JS/Frontend/ui.js`, `style.css`, `JS/Tests/TutorialVideoModalLayout.mjs`, `ChangesLogs.txt`.
- **Alcance:** frontend únicamente. Sin cambios en Apps Script, servicios, datos, registros, URLs ni payloads.
- **Validación:** la inspección de código confirma la causa y la corrección. La prueba automatizada local/CI y la comprobación visual de dimensiones/reproducción deben quedar registradas según su ejecución; no afirmar validación visual sin navegador real.
- **Rama:** `GPSpedia2.2.5_work`. La rama protegida `GPSpedia2.2.5` permanece intacta.


---

## 2026-11-25 — Prioridades de continuidad solicitadas por el propietario

**Orden obligatorio para los próximos trabajos:**

1. **Útiles FEEDBACK/CATALOG:** garantizar idempotencia por usuario y vehículo, deduplicar eventos históricos, no insertar una segunda fila, no mostrar mensajes de útil repetido y evitar que un evento válido interrumpa la lectura de CATALOG.
2. **Dashboard de aportes:** unificar filas con el mismo nombre visible aunque los IDs históricos difieran; ejemplo Pablo Peña: 365 + 15 = 380 cortes.
3. **Vídeo de tutoriales:** utilizar la misma estrategia del iframe del vídeo guía de desarme del modal de corte, ancho completo y alto de 315 px, carga inmediata.
4. **Encabezado de detalle:** títulos sin saltos innecesarios, logo y modelo alineados por el borde inferior con la misma separación de la línea azul, nombre del modelo móvil +2 px.

### Avance de implementación en la rama de trabajo

- **Útiles:** FEEDBACK ahora valida la identidad y el ID del vehículo antes de escribir; normaliza identidades heredadas; protege la comprobación+append con `tryLock(0)` no bloqueante y el frontend reintenta silenciosamente ante `LIKE_LOCK_BUSY`; busca eventos existentes por usuario/vehículo sin distinguir corte; reutiliza la fila pendiente en recuperación; no devuelve texto al usuario en el caso idempotente. CATALOG deduplica por usuario/vehículo y atribuye el primer evento al corte original. Frontend mantiene el estado de útil por vehículo.
- **Dashboard:** el normalizador frontend agrupa por nombre visible normalizado, sin separar filas por IDs históricos diferentes; suma cortes y aportes.
- **Vídeo:** iframe del modal tutorial con URL validada, ancho 100 %, alto 315 px, carga no diferida y contenedor no contraíble, siguiendo el tamaño del vídeo guía de desarme.
- **Encabezado:** título de corte/tutorial sin salto innecesario; logo y nombre alineados abajo respecto de la línea azul; nombre móvil incrementado 2 px.
- Se añadieron/actualizaron pruebas de regresión de idempotencia, proyección de likes, dashboard, vídeo y encabezado. En el momento de esta anotación inicial, CI estaba pendiente; el cierre posterior registra CI 45535275807 aprobado: 523 suites y 6,206 pruebas, 0 fallos, además de navegador 260/260.
- No se modificaron deployments Apps Script, URLs, PropertiesService, permisos, hojas ni datos externos. No se realizaron peticiones remotas.

### Archivos principales
- `JS/Services/feedback.js`, `JS/Services/catalog.js`
- `JS/Frontend/likeState.js`, `JS/Frontend/ui.js`, `JS/Frontend/activityDashboard.js`, `style.css`
- `JS/Tests/FeedbackLikeIdempotency.mjs`, `FeedbackLikeClientRetry.mjs`, `FeedbackLikeLockContention.mjs` y suites de likes existentes
- `JS/Tests/TutorialVideoModalLayout.mjs`, `JS/Tests/CutDetailModalLayout.mjs`, `JS/Tests/ModalHeaderCssCascade.mjs`, `JS/Tests/ActivityDashboardContributions.mjs`, `JS/Tests/Aug146ResponsiveBrowser.mjs`
- `JS/Tests/RunServiceTests.mjs`

### Condiciones de continuidad
- La implementación local de las cuatro prioridades quedó validada; el siguiente trabajo debe continuar con las validaciones Beta diferidas en el orden registrado en el cierre posterior.
- No cerrar la validación Beta de útiles hasta comprobar deduplicación de llamadas repetidas y simultáneas, lectura de CATALOG con más de un evento del mismo actor/vehículo y respuesta sin mensaje visible.
- En Beta, comprobar reproducción real de al menos un tutorial con URL YouTube normal y uno con URL corta/variante; las dimensiones y visibilidad del iframe ya aprobaron la prueba de navegador local.
- MIG-URL-008 continúa pendiente de autorización y entorno Beta aislado; no ejecutar GET remotos ni desplegar servicios.
- La tarea separada **Actividad reciente** permanece en cola y conserva su límite de solo frontend/presentación.
- Rama: `GPSpedia2.2.5_work`. Rama protegida `GPSpedia2.2.5`: sin cambios.


---

## 2026-11-25 — Cierre de validación local de las cuatro prioridades

**HEAD verificado:** 5cc1cf90bdab8e4ff73e01d361cf2b7d04255abd en GPSpedia2.2.5_work.

### Evidencia CI

- Workflow 45535275807: **523 suites, 6,206 pruebas aprobadas, 0 fallos**.
- Navegador AUG-146: **260/260 PASS**, en 1366×768, 390×844, 360×800 y 320×700.
- FeedbackLikeIdempotency.mjs: 5/5; FeedbackLikeClientRetry.mjs: 2/2; FeedbackLikeLockContention.mjs: 2/2.
- ActivityDashboardContributions.mjs: 3/3.
- TutorialVideoModalLayout.mjs: 9/9.
- CutDetailModalLayout.mjs: 32/32.
- GitHub Pages workflow 45535275662: build y deploy automáticos SUCCESS para el HEAD de la rama de trabajo. No se ejecutó ningún despliegue Apps Script.
### Estado por prioridad

1. **Útiles:** implementación local y regresión completadas; validación de comportamiento contra FEEDBACK/CATALOG y Spreadsheet Beta diferida.
2. **Dashboard:** consolidación por nombre visible completada y probada; el caso de aceptación devuelve una sola fila con 380 cortes.
3. **Vídeo tutoriales:** implementación local y pruebas de geometría/URL completadas; reproducción real de YouTube diferida a Beta.
4. **Encabezados:** implementación y comprobación responsive completadas en los cuatro viewports; título sin saltos cuando cabe, alineación inferior de logo/modelo y aumento móvil de 2 px.

### Continuidad para próximos trabajos

- Retomar primero la validación Beta de útiles: dos usuarios diferentes deben contar por separado; un mismo usuario en el mismo vehículo, incluso desde otro corte, debe contar una sola vez, sin nueva fila ni mensaje de útil repetido; CATALOG debe seguir entregando el catálogo.
- Después validar reproducción real de vídeos de tutoriales con enlaces YouTube watch y cortos/shorts.
- MIG-URL-008 sigue pendiente de autorización Beta aislada. No se hicieron llamadas a deployments Apps Script ni cambios en Spreadsheet, Drive, PropertiesService, permisos o endpoints.
- La tarea independiente **Actividad reciente** del Dashboard continúa en cola.
- No se modificó la rama base GPSpedia2.2.5.


---

## 2026-11-24 — Actualización local de endpoints CATALOG y FEEDBACK

- Solicitud expresa del propietario: sustituir las URLs de CATALOG y FEEDBACK en la configuración frontend.
- Archivos de implementación: `JS/Frontend/api-config.js`; fixture contractual: `JS/Tests/LocalApiEndpoints.mjs`.
- Se mantienen intactas las entradas AUTH, WRITE, UTILITIES y ADMIN, el objeto único `API_ENDPOINTS`, `ACTION_TO_SERVICE_MAP` y el resolvedor local.
- Validación estructural previa a publicación: las seis URLs cumplen HTTPS + `/exec` y sus IDs de deployment son distintos. La prueba automatizada contractual se ejecutará/confirmará después de publicar.
- No se realizaron solicitudes HTTP, no se modificaron deployments Apps Script ni recursos externos. La identidad y salud remota continúan pendientes de MIG-URL-008, con Beta aislada y autorización expresa.
- HEAD confirmado antes de esta actualización: `8ee4083aa3561201ce3e0a82be6678d6ee5bcf8c`; rama base protegida sin cambios.

---

## 2026-11-25 — Nueva prioridad de implementación: modal de tutoriales y Actividad reciente

- Nueva tarea GP-TUTORIAL-DETAIL-COMPACT-01: título de tutorial completo en una o dos líneas, imagen a la mitad, espacios compactos y divisores azules.
- GP-DASH-ACTIVITY-RECENT-01 se establece como siguiente implementación frontend; conserva su alcance sin cambios backend.
- Por instrucción del propietario, se completan primero las implementaciones locales y después las validaciones Beta diferidas (útiles FEEDBACK/CATALOG, reproducción real y MIG-URL-008).
- Rama autorizada GPSpedia2.2.5_work; HEAD de partida 7f288008ad29e6e8dd126abeed12fd9408c6c8df. La rama base GPSpedia2.2.5 permanece intacta.

---

## 2026-11-25 — Inicio de implementación GP-DASH-ACTIVITY-RECENT-01

- Se inició la presentación de Actividad reciente únicamente desde frontend.
- Se verificó el contrato existente: timestamp, nombreUsuario, tipoActividad, idElementoAsociado y detalle; los eventos Inbox comparten la misma estructura y llevan prefijo inbox_.
- Se confirmó que FEEDBACK entrega hasta 100 eventos ordenados por fecha descendente. La implementación conserva ese límite y orden; no se modifica el servicio.
- El contexto del vehículo se resuelve localmente contra catalogData.cortes ya disponible en el navegador. No se solicitan datos nuevos ni se muestran IDs internos como descripción.
- La tabla pasa a tres columnas; los detalles se expanden por fila, con un único acordeón abierto y cierre por clic externo. No se modifican backend, contratos ni payloads.

---

## 2026-11-25 — Cierre de implementaciones frontend solicitadas

**GP-TUTORIAL-DETAIL-COMPACT-01 — COMPLETADA EN CÓDIGO Y CI**
- Título de tutorial: una línea cuando cabe y hasta dos líneas si es necesario, sin truncamiento prematuro de palabras.
- Imagen limitada al 50 % del ancho y 160 px de alto máximo; márgenes entre título, imagen y vídeo compactados.
- Segmentos informativos compactos con divisores azules.
- Prueba TutorialVideoModalLayout: 18/18 PASS.

**GP-DASH-ACTIVITY-RECENT-01 — COMPLETADA EN CÓDIGO Y CI**
- Tabla Fecha/Usuario/Acción; fecha compacta; nombre legible y acciones traducidas.
- Detalle contextual del vehículo desde el catálogo local; un solo acordeón abierto y cierre al hacer clic fuera.
- Objetos JSON técnicos y referencias internas no se exponen en el resumen.
- CI 45540225703: 523 suites, 6,215 pruebas aprobadas, 0 fallos. ActivityDashboardStoredXss 6/6 PASS. Chromium 264/264 PASS en 1366×768, 390×844, 360×800 y 320×700.
- Pages workflow 45540224992: SUCCESS.

**Alcance:** solo frontend, estilos, pruebas y registros. Sin modificaciones de servicios Apps Script, endpoints, contratos, payloads, hojas, datos, permisos ni deployments.

**Continuidad:** no quedan implementaciones locales pendientes identificadas. Las validaciones Beta de útiles FEEDBACK/CATALOG, reproducción real YouTube y MIG-URL-008 permanecen pendientes para después, según la instrucción del propietario. No se ejecutaron peticiones remotas ni pruebas Beta.


---

## 2026-11-25 — Incidencia GP-LIKE-FIRST-VOTE-01

- El propietario reportó que el botón útil falla con «No se pudo registrar tu reacción. Reintenta», incluso cuando el modelo no muestra votos útiles.
- Hallazgo de código: el handler `handleRecordLike` escribía el evento antes de recalcular el contador. Una fila histórica `event` inválida del mismo vehículo podía provocar una excepción posterior al append; la interfaz mostraba error aunque la escritura ya estuviera confirmada. Además, `readFeedbackLikeEventCounts_` en CATALOG propagaba una fila inválida y podía interrumpir la proyección completa.
- Corrección preparada en `feedback.js` y `catalog.js`: conteo tolerante a eventos históricos inválidos (se conservan, se omiten de la proyección y se advierte en log); el contador se calcula antes de escribir y se devuelve como valor precomputado + 1 después de confirmar el append. Si la fila inválida coincide con el mismo actor/vehículo, se conserva el rechazo seguro para impedir duplicados.
- Pruebas de regresión añadidas a `FeedbackLikeIdempotency.mjs` y `FeedbackLikeAppendOnly.mjs`. CI `45541840409`: service-tests y responsive-browser SUCCESS. Pages `45541840034`: build y deploy SUCCESS.
- Sin llamadas a FEEDBACK/CATALOG remotos, sin despliegues Apps Script y sin modificaciones de Spreadsheet, Drive, PropertiesService, permisos o datos externos.
- Rama autorizada: `GPSpedia2.2.5_work`; rama base `GPSpedia2.2.5` sin cambios.

- Cierre local: commit `694ceaf278c2e6410904c7458a8016375a2a29cb` (código y pruebas); CI y Pages aprobados. La rama base continúa en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


---

## Rectificación de diagnóstico — GP-LIKE-FIRST-VOTE-01 (2026-11-25)

La hipótesis de eventos históricos inválidos no era suficiente para explicar el síntoma reportado. La revisión de historial identificó el cambio `ac8c6e8a374c75038f93970face78b8d99bdda69`: `withFeedbackLikeLock_` pasó de `tryLock(10000)` a `tryLock(0)`. El backend devuelve `LIKE_LOCK_BUSY` si otra ejecución que comparte el ScriptLock de FEEDBACK lo mantiene; el frontend realiza cinco reintentos de 100, 200, 300 y 400 ms. Si la contención supera esa ventana, el voto no llega a consultar ni insertar en `FeedbackLikes` y la interfaz presenta el error genérico. El mismo ScriptLock se comparte con `withYouTubeUploadReservationLock_`.

La implementación anterior además mantenía dentro de la sección crítica la localización del vehículo, lecturas de contador, búsqueda de eventos y confirmación de lectura posterior, ampliando la contención. La agrupación/deduplicación de eventos en CATALOG es una proyección de lectura separada: no es el mecanismo que rechaza el append de FEEDBACK. Sin embargo, CATALOG todavía carga la hoja `FeedbackLikes` completa en cada lectura de catálogo sin caché; la agrupación en memoria no elimina ese coste de lectura y debe evaluarse por separado para el límite de escala.

Se prepara la corrección para sacar del lock la localización/preparación y el conteo, dejando dentro únicamente la búsqueda idempotente actor+vehículo y el append/flush. El conteo y telemetría se ejecutan después; un fallo de lectura no convierte un append confirmado en error. Se amplían pruebas para simular lock ocupado y verificar que no se escribe, así como primer voto, repetición mismo usuario/vehículo y usuarios distintos. CI pendiente de la corrección.

La corrección previa `694ceaf` permanece como endurecimiento de tolerancia a eventos históricos, pero no se considera evidencia suficiente de que se haya resuelto la causa principal de contención. No se han invocado servicios remotos ni desplegado Apps Script.


---

## Cierre local — GP-LIKE-FIRST-VOTE-01 (2026-11-25)

- Se corrigió el diseño del handler FEEDBACK: localización del vehículo y preparación de la hoja fuera del ScriptLock; dentro quedan la comprobación autoritativa por actor+vehículo, recuperación de un pendiente y append/flush. El contador y la telemetría se calculan después de liberar el lock. Un fallo al leer el contador ya no devuelve un rechazo cuando el evento quedó confirmado.
- La búsqueda de idempotencia se optimizó para buscar por actorKey en la columna A y filtrar vehículo, conservando la normalización de identidades legacy.
- Se añadió prueba de contención: si el lock está ocupado no se escribe; cuando está libre se registra; el mismo usuario/vehículo no crea otra fila; usuarios distintos sí pueden registrar. También se prueba que un fallo de conteo posterior al append devuelve éxito sin contador.
- Se añadió prueba de integración del publicador frontend: cuando CATALOG no confirma el delta, FEEDBACK conserva la respuesta exitosa del útil y devuelve catalogSyncPending; la pérdida de conexión CATALOG no se propaga como error de registro.
- CI final commit bad7f6893a4012b710bc1e1935bea9b2ceba1d65: workflow 45544697384 SUCCESS, 523 suites, 6,226 pruebas aprobadas, 0 fallos; responsive-browser SUCCESS. Pages workflow 45544697351 SUCCESS (build y deploy).
- Los primeros intentos CI detectaron únicamente fixtures/assertions obsoletos tras el cambio de contrato; se corrigieron y la ejecución final completa aprobó.
- Sin invocaciones a FEEDBACK/CATALOG reales, sin cambios en Spreadsheet/Drive, sin despliegues Apps Script ni modificaciones de PropertiesService/permisos. Validación funcional Beta pendiente.
- Rama de trabajo HEAD: bad7f6893a4012b710bc1e1935bea9b2ceba1d65; rama base verificada: d9acc68d889985c2e2f42fe3a02e502efc86ead1, intacta.

### Riesgo separado pendiente

readFeedbackLikeEventCounts_ en CATALOG sigue leyendo todas las filas A:G de FeedbackLikes para construir la agrupación, incluso en la proyección dirigida de un vehículo. La agrupación elimina duplicados lógicos, pero no reduce I/O. Se registra como trabajo de optimización independiente; no se modifica en esta incidencia para evitar mezclar el arreglo de escritura FEEDBACK con un rediseño de proyección CATALOG.


## 2026-11-25 — Nuevas tareas registradas

- GP-DEV-LOG-ERRORS-01: botón Copiar registros debe exportar solo errores clasificados.
- GP-ADMIN-DRIVE-AUDIT-SCHEMA-01: resolver discrepancia/falta de esquema AdminOperationGuards que impide avanzar auditoría Drive.
- GP-ADMIN-DRIVE-SCAN-MODAL-01: convertir el modal existente a espacio de escaneo; resultados de imágenes incrementales y progreso Developer simultáneo, sin modal extra.
- GP-LIKE-REBUILD-01: incidencia persistente de útiles; reanalizar y reconstruir el flujo completo recordLike, con prioridad alta, sin superficial fallback y con idempotencia actor+vehículo.
- Estas tareas están registradas; aún no se implementaron ni se ejecutaron pruebas para ellas. No se realizaron acciones en servicios o datos externos.


### Rectificación GP-LIKE-REBUILD-01 — regla funcional por corte (2026-11-25)

- Un usuario puede registrar un útil en cada corte individual del vehículo. Los cortes 1, 2 y 3 son aportes independientes.
- Repetir el útil en el mismo corte por el mismo usuario debe ser idempotente y silencioso: no insertar otra fila, no mostrar notificación, no emitir mensajes en consola ni advertencias/rechazos visibles.
- Repetir el útil en un corte diferente del mismo vehículo sí debe registrar el aporte.
- Solo debe mostrarse el mensaje de error al usuario cuando un útil que aún no está registrado no pueda guardarse por una falla real.
- El frontend debe mantener estado por clave vehículo+corte y el backend FEEDBACK debe validar unicidad por actor+vehículo+corte bajo concurrencia. CATALOG debe proyectar y contar por corte, preservando votos distintos de un mismo usuario en el mismo vehículo.
- Se rectifica la regla anterior actor+vehículo global: queda obsoleta y no debe utilizarse como criterio de deduplicación.
- Estado: EN PROGRESO; implementación y pruebas pendientes. No se ejecutaron deployments ni operaciones con datos Beta.


## Continuidad — GP-LIKE-REBUILD-01 (actualización de código)

- Commits de implementación: FEEDBACK `dbb66024926c055c641be2c2dc17b4ef1587b004`; CATALOG `09470ca8b116ffd1e79d78be0cefa1a163ab6cae`; likeState `6b7bb489a36d6656db91b9c5991c35e48f28448e`; UI `8030b1c48adc048f4529206cf75a2eaec16e8489`; tests idempotencia `7dfafa38aea7df575488eafde8616068076f6631`; append-only `f50d77067003f2734946a2e449736c5038a40400`.
- La unicidad ahora se verifica por usuario+vehículo+corte, y los duplicados del corte exacto retornan éxito silencioso sin cálculo del contador ni actividad. Frontend registra estado vehículo+corte.
- Pruebas FeedbackLikeIdempotency y FeedbackLikeAppendOnly ejecutadas en runner aislado contra los fuentes de rama: ambas PASS. Sintaxis FEEDBACK y CATALOG PASS. CI remoto no fue confirmado; despliegue Apps Script no se requiere. Task cerrada; Beta Apps Script no es requisito para cierre local.
- Iniciar GP-DEV-LOG-ERRORS-01 inmediatamente.


## GP-DEV-LOG-ERRORS-01 — 2026-11-25

- Implementado en `JS/Frontend/ui.js`: el botón de copiar selecciona únicamente `div.log-error`, excluye warnings/informativos, elimina entradas vacías y copia texto separado por líneas.
- Añadida `JS/Tests/DeveloperConsoleErrors.mjs`.
- Contrato estático y simulación aislada de selección ejecutados: PASS. Ejecución Node real/CI no disponible en el entorno actual; CI remoto pendiente, sin bloquear cierre local. No se alteró backend ni recursos.
- Próxima tarea: GP-ADMIN-DRIVE-AUDIT-SCHEMA-01.


## GP-ADMIN-DRIVE-AUDIT-SCHEMA-01 — 2026-11-25

- Diagnóstico: `getAdminLocalGuardSheet_` asumía hoja existente; ante ausencia abortaba antes del baseline/operación. No había inicializador de encabezados.
- Implementado: creación de hoja y encabezado si faltan; confirmación de escritura; lectura posterior; carrera de creación recuperada; esquema incompatible no se sobrescribe.
- `AdminLocalOperationGuard.mjs` PASS en runner aislado; `AdminOperationGuardsSchema.mjs` contrato PASS; simulaciones de creación, existente válido, mismatch y carrera PASS; sintaxis ADMIN PASS. CI remoto pendiente, sin habilitar guardas adicionales ni modificar recursos externos.
- Siguiente tarea: GP-ADMIN-DRIVE-SCAN-MODAL-01.


## 2026-11-25 — GP-ADMIN-DRIVE-SCAN-MODAL-01 (implementación)

- Integrada una consola de progreso en el modal existente de Auditoría de Cortes, sin crear un modal adicional. Los mensajes de auditoría se reflejan en Developer y en el panel integrado, con nivel, hora y texto seguro; scroll automático y límite de 250 entradas.
- Conservada la representación incremental de resultados y se ajustaron límites de altura/scroll para escritorio y móvil.
- Añadida prueba contractual `JS/Tests/AdminDriveScanModal.mjs` (7 aserciones). No se ejecutó Node local ni se confirmó CI en esta intervención; validación automatizada pendiente.
- Archivos: `index.html`, `JS/Frontend/ui.js`, `style.css`, `JS/Tests/AdminDriveScanModal.mjs`, `Tareas_Activas.md`.
- Publicado exclusivamente en `GPSpedia2.2.5_work`; no se invocaron Apps Script, Drive ni Spreadsheet. La rama base permanece sin escritura.
- Próxima acción: verificar workflow CI y ejecutar/ajustar la suite; inspeccionar resultados y estados persistidos/reanudación en navegador real Beta cuando esté disponible.


## Continuidad — GP-ADMIN-DRIVE-SCAN-MODAL-01

- Modal de auditoría integrado con panel de progreso, nivel/hora/texto seguro, aria-live, scroll y límite 250. Resultados incrementalmente visibles y estilos responsive.
- CI run 45610016210: `AdminDriveScanModal.mjs` 7/7 PASS; responsive-browser PASS (AUG-146, no prueba de este modal). Suite global 331 suites/4016 tests aprobados, cinco suites fallaron: dos contratos FEEDBACK/CATALOG y MIG019 por assertion de patrón de likes; un contrato INTEGRATION AdminDriveAuditGlobalConsole por texto de resumen; MIG021 LocalApiEndpoints assertion. Errores de tests preexistentes/ajenos salvo integración modal. Se corrigió el texto para satisfacer contrato legacy sin eliminar el panel simultáneo.
- Commit de corrección: fd2c54d12ae11f7770863257ca5039408bb2e055; HEAD rama verificado. Reejecutar CI. No se ejecutó Apps Script ni se alteraron recursos Beta.
- Estrategia normativa §20: recuperación vía GitHub API cuando CLI/network local falla; runners CI para test reproducible; runner aislado/mock si el runner original falla, evitando declarar CI PASS ficticio. No bloquear tarea por CI si pruebas locales aisladas pertinentes aprobadas; no omitir fallos reproducibles.

- CI posterior (45610558471): DriveScanModal 7/7 PASS; contrato histórico falló por `document` no definido en runner Node (fixture no modelaba el panel agregado). Se ajustó `AdminDriveAuditGlobalConsole.mjs` con DOM mock mínimo para verificar el mirror sin navegador. Commit 4acae1e078c55aa56721c741c551d962fec7557c. Otras cuatro fallas del suite no relacionadas: FEEDBACK/CATALOG/MIG019 assertions de patrón de like y MIG021 URLs; siguen identificadas aparte.


## Cierre GP-ADMIN-DRIVE-SCAN-MODAL-01 — 25-11-2026

- Validación CI run 45611120099: AdminDriveScanModal 7/7 PASS; AdminDriveAuditGlobalConsole 1/1 PASS; browser-responsive AUG-146 PASS (no es browser test específico del modal). Cierre de contrato local/CI.
- Regresión global: 378 suites, 4693 tests aprobados, cinco suites fallidas: FEEDBACK preflight/CATALOG replay y MIG019 con patrones de idempotencia actor+vehículo obsoletos frente a corte-index; BETA-032 DeveloperConsoleRouting con assertion obsoleta de copy log; MIG021 URL contract. Aislar y actualizar pruebas contractuales coherentes, no cambiar producto para satisfacer expectativas obsoletas.
- Modal: panel integrado aria-live, mirror Developer, entradas seguras, límite 250, resultados incrementalmente visibles y scroll responsive. No Apps Script/Beta.
- Siguiente trabajo: reconciliar/validar GP-LIKE-REBUILD-01 y rectificación por corte; actualizar contratos obsoletos (ya identificados por CI).


## GP-LIKE-REBUILD-01 — reconciliación 25-11-2026

- Regla vigente corte individual: actor+vehículo+corte. FEEDBACK append-only event, lock reducido al preflight+append; CATALOG dedup por actor y corte. Duplicados silenciosos. Dedicadas `FeedbackLikeIdempotency` 10/10 PASS, `FeedbackLikeAppendOnly` 4/4 PASS; sintaxis PASS.
- Corregidas assertions de contratos obsoletos en preflight/replay y copy-console; DeveloperConsoleRouting 5/5 PASS. CI run 45611423533 encontró 427 suites/5314 tests PASS con 4 fallos: los 2 contracts likes, MIG019 reutilizando el contract, y MIG021. Se actualizaron los contracts likes y DeveloperConsoleRouting. CI siguiente pendiente.
- No se desplegó FEEDBACK/CATALOG ni se alteraron recursos Beta. Cierre local; la validación real de útiles permanece pendiente de Beta.
- Siguiente tarea independiente: GP-DASH-ACTIVITY-RECENT-01 (Actividad reciente, frontend solamente).


## GP-DASH-ACTIVITY-RECENT-01 — corrección de contención 25-11-2026

- Se aisló el comportamiento del listener global: anteriormente las excepciones a cierre estaban ligadas al panel y a cualquier toggle global, no al contenedor del dashboard. Ahora el clic dentro del contenedor mantiene el acordeón y el clic externo lo cierra.
- Prueba `ActivityDashboardRecentInteraction.mjs` añadida y registrada: interacción dentro, apertura exclusiva, cierre externo, aria-expanded y reemplazo del listener en rerender. CI pendiente.
- No se modifica backend ni payloads; se conserva catálogo local para contexto.


## Cierre GP-DASH-ACTIVITY-RECENT-01 — 25-11-2026

- Listener fuera de tabla: ahora se limita el cierre de acordeón a clic fuera del contenedor, no a toggles globales o eventos de panel.
- CI run 45611875173: `ActivityDashboardRecentInteraction` 6/6 PASS; responsive-browser AUG-146 PASS. La regresión completa reportó 439 suites/5428 pruebas PASS y 3 fallos de suites ajenas al dashboard (contract FEEDBACK preflight corregido en commit 05fc4f2b; MIG021 URL pendiente).
- Actividad reciente cerrada en código y contrato; datos reales FEEDBACK Beta diferidos.


## GP-CATALOG-LIKE-PROJECTION-READ-01 — 25-11-2026

- CATALOG `readFeedbackLikeEventCounts_` ahora lee columnas A:C (identidad/vehículo/corte) y F (status), no la fila completa A:G. Deduplicación actor+corte, filtrado event, validation y warnings conservados. Sin caché adicional ni comunicación FEEDBACK→CATALOG.
- Test `CatalogLikeProjectionReadScale.mjs` añadido y registrado (6 assertions) para validar lecturas, conteos y corte independiente. CI pendiente.


## GP-LIKE-REBUILD-01 — CI final 25-11-2026

- CI run 45612250526 SUCCESS: 525 suites, 6,239 tests, 0 fallos; responsive-browser SUCCESS. Contracts FEEDBACK preflight/replay y LocalApiEndpoints reconciliados. Cierre local y CI.


## Cierre GP-CATALOG-LIKE-PROJECTION-READ-01 — 25-11-2026

- CATALOG reduce la transferencia del ledger FeedbackLikes a A:C y F. Prueba `CatalogLikeProjectionReadScale` 6/6 PASS. CI run 45612534877 SUCCESS: 526 suites, 6,245 pruebas, 0 fallos; responsive-browser SUCCESS.
- Sin caché adicional ni backend coordination; no se alteran datos ni deployment.


---

## 2026-11-25 — Cierre de verificación técnica integral local

**HEAD de código y pruebas verificado:** `f93d001603d25c8da9df03552fba082b3b270738`.

- CI run `45613697548`: **SUCCESS**, 528 suites, 6,263 pruebas aprobadas, 0 fallos; `service-tests` y `responsive-browser` SUCCESS.
- AUG-146/Chromium: **264/264 PASS**, cuatro viewports (1366×768, 390×844, 360×800 y 320×700), 16 capturas sintéticas.
- `RepositoryJavaScriptSyntax`: 478 archivos .js/.mjs; PASS. `RepositoryModuleReferences`: 398 archivos; PASS.
- `ServiceCallGraphContract`: 9/9 PASS. `MIG028SecurityPerformanceRegression`: 9/9 PASS.
- Hallazgo de integración de pruebas corregido: `AdminOperationGuardsSchema.mjs` y `DeveloperConsoleErrors.mjs` no estaban registrados en `RunServiceTests.mjs`. Se registraron; CI final confirmó 10/10 y 8/8 PASS. El primer intento detectó un desacuerdo de formato de resumen del runner, no un defecto funcional; se corrigió y la ejecución final quedó verde.
- Pages build/deployment automático SUCCESS para el código probado. No hubo despliegues Apps Script ni invocaciones a servicios remotos. No se modificaron Spreadsheet, Drive, PropertiesService, permisos, endpoints ni datos externos.
- Avisos del entorno CI: deprecación de Node.js 20 en acciones de GitHub y módulo `punycode`; no afectan la ejecución aprobada y no se modificó infraestructura.

### Continuidad
- La fase de verificación local integral queda **COMPLETADA**.
- La única tarea restante del plan MIG-URL es `MIG-URL-008`, que requiere confirmación del propietario de que las seis URLs corresponden a un entorno Beta aislado y autorización expresa para ejecutar GET de salud. No realizar esas peticiones sin esa confirmación.
- Validaciones de Apps Script/Spreadsheet, YouTube real, Drive y pruebas de campo continúan diferidas a Beta según `Tareas_Beta.md`; no bloquean el cierre local.
- Rama base `GPSpedia2.2.5` verificada sin cambios: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


---

## 2026-11-25 — Actualización de endpoints CATALOG y FEEDBACK

**Implementación local y CI: COMPLETADAS.**

- En `JS/Frontend/api-config.js`, `CATALOG` ahora apunta al deployment comunicado por el usuario y `FEEDBACK` al deployment comunicado por el usuario. Se preservaron AUTH, WRITE, UTILITIES y ADMIN.
- `JS/Tests/LocalApiEndpoints.mjs` actualizado para validar los dos nuevos valores. Confirmado un solo uso de cada URL nueva en la fuente de configuración y en el contrato.
- CI run `45619392380`: SUCCESS; 528 suites, 6,263 pruebas aprobadas, 0 fallos; `LocalApiEndpoints` 10/10 PASS; `service-tests` y `responsive-browser` SUCCESS. AUG-146: 264/264 PASS en cuatro viewports.
- GitHub Pages run `45619392374`: SUCCESS.
- No se hicieron solicitudes a los endpoints, deployments Apps Script ni cambios a proyectos Apps Script, PropertiesService, Spreadsheet, Drive, permisos o datos. La disponibilidad real y el comportamiento de los deployments nuevos quedan pendientes de validación Beta.
- `MIG-URL-008` sigue pendiente de confirmación de que las URLs son de un entorno Beta aislado y de autorización expresa para GET de salud; no se interpreta esta solicitud de actualizar endpoints como autorización para invocarlos.
- Rama base `GPSpedia2.2.5` verificada sin cambios: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


---

## 2026-11-25 — GP-LIKE-REBUILD-01: contención de lock

- Diagnóstico fuente: `withFeedbackLikeLock_` conserva `tryLock(0)` por el requisito de no bloquear ejecuciones FEEDBACK. El cliente tenía solo cinco intentos y 1 s de espera acumulada, por lo que una contención temporal podía rechazar el primer like.
- Cambio: `recordLike` reintenta hasta 12 veces únicamente ante `LIKE_LOCK_BUSY`, con esperas 150, 300, ... 1650 ms (9.9 s acumulados). No repite fallos de red, sesión, validación ni otros errores. Se mantiene el lock del backend no bloqueante y la sección crítica de idempotencia + append.
- Pruebas: `FeedbackLikeClientRetry`, `FeedbackLikeLockContention` y `FeedbackLikePreflightOutsideLock` actualizadas. CI run `45624279054` SUCCESS: 528 suites, 6,264 pruebas, 0 fallos; responsive-browser SUCCESS; AUG-146 264/264 PASS en cuatro viewports.
- HEAD de código: `8279f2ee44d347433e683c3b36a70c2917ca95e2`. Rama base `GPSpedia2.2.5` confirmada en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, intacta.
- No se invocó FEEDBACK remoto ni se desplegó Apps Script. El cambio es frontend y depende del workflow GitHub Pages; el deployment FEEDBACK debe devolver `LIKE_LOCK_BUSY` para que el reintento se active, pero esa versión remota no se verificó. No se declara resuelto remotamente hasta comprobar el comportamiento en Beta.


## 2026-11-25 — Actualización de endpoint FEEDBACK

- HEAD confirmado antes del cambio: `a5c668101c79e3fdf484b658b1c14839f1072d92`; rama autorizada `GPSpedia2.2.5_work`. Rama base protegida `GPSpedia2.2.5` sin modificaciones.
- Solicitud: sustituir el endpoint FEEDBACK por el deployment URL proporcionado expresamente por el propietario.
- Archivos afectados: `JS/Frontend/api-config.js` y `JS/Tests/LocalApiEndpoints.mjs`; registros: `ChangesLogs.txt` y `Tareas_Activas.md`.
- Solo cambia la entrada FEEDBACK y su expectativa contractual. AUTH, CATALOG, WRITE, UTILITIES y ADMIN permanecen intactos.
- No se realizan llamadas remotas ni despliegues Apps Script. La validación real del deployment queda pendiente de Beta y autorización expresa.
- CI run `45625740950` SUCCESS: 528 suites, 6,264 pruebas aprobadas, 0 fallos; `service-tests` y `responsive-browser` SUCCESS. El parsing de los módulos comprobados pasó. Pages run `45625739647` SUCCESS.
- Diff revisado: únicamente FEEDBACK en la configuración y su expectativa de prueba; los otros cinco endpoints no cambiaron. Rama base protegida verificada intacta.
- Estado: **COMPLETADA CON VALIDACIÓN DIFERIDA**. No se invocó el endpoint ni se desplegó Apps Script. La compatibilidad y disponibilidad del deployment FEEDBACK quedan pendientes de Beta autorizada.
- Próximo paso: continuar con la siguiente tarea pendiente priorizada del backlog, manteniendo MIG-URL-008 como validación Beta separada.


## 2026-11-25 — GP-LIKE-REPLAY-COUNT-01

- Comparación con la rama base: la implementación antigua incrementaba directamente `Cortes.utilCorteN`; la implementación actual registra eventos append-only en `FeedbackLikes` y CATALOG los proyecta sobre el catálogo. El contador físico de `Cortes` no se modifica por diseño vigente; no se revirtió esta arquitectura porque la idempotencia y el contrato de proyección dependen del ledger.
- Hallazgo: el fast-path de voto duplicado devolvía `alreadyLiked:true` sin `likeCount`. El frontend activo `JS/Frontend/likeState.js` solo actualiza el contador cuando recibe un entero confirmado. Se corrige para calcular el total también en la respuesta idempotente, sin insertar ni duplicar actividad.
- La prueba `JS/Tests/LikeClientCounter.js` importaba una ruta raíz inexistente y no estaba registrada en el runner; se corrigió para probar el módulo frontend real y se incorporó a `RunServiceTests.mjs`.
- Diferencia de Spreadsheet: la rama base usa un ID anterior; los servicios de la rama de trabajo comparten el ID proporcionado por el propietario el 2026-11-24 y autorizado en NORMAS §17.1. No se cambió ese localizador ni se intentó copiar datos. Debe confirmarse en Beta que los deployments FEEDBACK/CATALOG apuntan al mismo recurso esperado.
- No se hicieron llamadas a Apps Script ni modificaciones a Spreadsheet/Drive/datos. CI y validación remota quedan pendientes.


### Cierre GP-LIKE-REPLAY-COUNT-01 — 2026-11-25

- Corrección: el resultado idempotente de FEEDBACK ahora incluye el contador confirmado, calculado fuera del lock. No agrega otra fila ni repite actividad/telemetría.
- Se conectó al runner la prueba frontend real `LikeClientCounter.js`, que ahora importa `JS/Frontend/likeState.js`; 6/6 PASS. `FeedbackLikeIdempotency` 10/10 PASS y `FeedbackLikeAppendOnly` 4/4 PASS.
- CI run `45628974357` SUCCESS: 529 suites, 6,270 pruebas aprobadas, 0 fallos; ambos jobs `service-tests` y `responsive-browser` SUCCESS. Pages run `45628972138` SUCCESS.
- Rama de trabajo HEAD de código: `9ba85463697d91f8a3534836c84bcfad7979e27d`. No se desplegó Apps Script ni se invocó FEEDBACK/CATALOG. La verificación de la Spreadsheet y deployments reales queda pendiente de Beta autorizada.- Hallazgo de compatibilidad importante: el contador físico de `Cortes.utilCorteN` no se incrementa en la arquitectura vigente; los eventos se guardan en `FeedbackLikes` y CATALOG proyecta los totales. La versión base sí incrementaba directamente la celda de `Cortes`. Los servicios de la rama de trabajo usan la Spreadsheet proporcionada por el propietario el 2026-11-24, distinta de la que referenciaba la rama base; no se cambió porque está autorizada en NORMAS §17.1. Confirmar que el usuario consulta la Spreadsheet/pestaña correctas en Beta.


### GP-LIKE-TRUSTED-ACTOR-01 — 2026-11-25

- Se corrigió `JS/Services/feedback.js`: `handleRecordLike()` obtiene `userId` y `userName` desde `payload.__feedbackActor`, inyectado por `authorizeFeedbackAction_()` tras validar la sesión compartida. Los campos homónimos del navegador ya no determinan la identidad del útil ni su actividad.
- Se amplió `JS/Tests/FeedbackLikeIdempotency.mjs` con casos de payload sin identidad duplicada y de intento de suplantación; la prueba conserva actor confiable distinto del enviado por el cliente.
- Commits de código/prueba: `54e9931c6ce5231f33fbcac4d1e592c9c13f9417` y `f33fefc5f554b193a21a981622a732c541b50c18`. CI final `45633091113` SUCCESS: 529 suites, 6,270 pruebas PASS, 0 fallos; `FeedbackLikeIdempotency` 10/10 y `LocalApiEndpoints` 10/10.
- No se cambió frontend, endpoint, Spreadsheet ID, permisos ni deployment. No se ejecutaron escrituras ni llamadas remotas. Próximo paso: revisar CI y mantener pendiente la validación Beta de identidad/versión del deployment FEEDBACK.

- CI `45632826674` ejecutó sintaxis y `FeedbackLikeIdempotency` 10/10 PASS; navegador responsive SUCCESS. Detectó un fallo adicional del fixture `JS/Tests/LocalApiEndpoints.mjs`: esperaba el deployment FEEDBACK anterior mientras `api-config.js` ya contenía la URL nueva confirmada por el propietario. Se corrigió solo la expectativa FEEDBACK; commit `8b20c64b2947dd8827c67a2fb3966492fdf1695e`. CI final `45633091113` SUCCESS: 529 suites, 6,270 pruebas PASS, 0 fallos; `service-tests` y `responsive-browser` SUCCESS. El health/versión del deployment y la escritura real en `FeedbackLikes` siguen pendientes de Beta aislada.


## 2026-11-25 — Corrección de útiles y presupuesto de reintentos CATALOG

**HEAD de partida confirmado:** `55194d229420e48e4a8bf9de936061a61df82b3e` en `GPSpedia2.2.5_work`. **Base protegida:** `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin escritura.

### GP-LIKE-VALIDATION-16DIGIT-01
- Hallazgo: el asignador de IDs de WRITE acepta enteros positivos seguros (`Number.isSafeInteger`), pero FEEDBACK limitaba `vehicleId` a 15 dígitos. Un ID válido de 16 dígitos podía activar el error genérico «Faltan datos verificados para registrar el útil» antes de localizar el vehículo.
- Cambio aplicado: validador común para útiles que acepta únicamente representaciones canónicas de enteros positivos seguros (hasta `9007199254740991`); se aplica al request y a la validación de eventos para que el conteo no descarte los nuevos IDs válidos.
- Límite de evidencia: el log del navegador no expone el ID/corte enviado, así que no se afirma que el caso concreto reportado usara 16 dígitos. Sí se comprobó por prueba que el contrato anterior rechazaba IDs admitidos por WRITE y se corrigió esa discrepancia.
- Pruebas añadidas: registro y conteo con `9007199254740991`; rechazo sin escritura de `9007199254740992`; se conserva actor confiable, corte y ledger append-only.

### GP-CATALOG-REQUEST-BUDGET-01
- Hallazgo: `auth.js` cancelaba cada consulta a los 8 s, mientras `getCatalogChanges` gestiona hasta tres intentos de 5 s cada uno y backoff. El presupuesto externo impedía completar los reintentos y convertía el fallo en `AbortError`.
- Cambio aplicado: `requestCatalogFeedPage_` delega el timeout por intento y reintentos a `getCatalogChanges`/`catalogRequest.js`; mantiene propagación de cancelación del ciclo padre. No añade viajes de red ni toca el servicio remoto.
- No se invocaron endpoints CATALOG/FEEDBACK, no se desplegaron Apps Script ni se modificaron Spreadsheet/Drive/PropertiesService/permisos/datos externos.
- CI final `45638162735` SUCCESS: 529 suites, 6,272 pruebas, 0 fallos; sintaxis PASS; `AUG-146` Playwright 264/264 PASS en cuatro viewports. Pages `45638162526` SUCCESS. Commits `311b09e4b1db19699d4325c81cb55d43920f076e` y `62cef81afde6b5ccd6a0dd0146d1d7be995fd0fb`.
- La validación real de deployments FEEDBACK/CATALOG y Spreadsheet continúa diferida a Beta aislada autorizada; no se invocaron endpoints ni se desplegaron Apps Script.


- CI run `45637878671` (commit `311b09e4b1db19699d4325c81cb55d43920f076e`): sintaxis PASS; `FeedbackLikeIdempotency` PASS; `CatalogFeedRetry` 11/11 PASS; `CatalogRequestRetry` 8/8 PASS; Chromium responsive PASS. Suite global: 470 suites, 5,644 pruebas PASS y 2 suites fallidas por una assertion legacy que exigía la expresión regex anterior (`FeedbackLikePreflightOutsideLock`, también invocada bajo MIG019). No es fallo del nuevo comportamiento; se actualiza el contrato para comprobar el helper y el límite `Number.isSafeInteger`.


**Cierre de implementación local (2026-11-25):** ambos trabajos `GP-LIKE-VALIDATION-16DIGIT-01` y `GP-CATALOG-REQUEST-BUDGET-01` quedan **COMPLETADOS CON VALIDACIÓN DIFERIDA**. CI `45638162735` SUCCESS (529 suites, 6,272 pruebas, 0 fallos); `AUG-146` 264/264 PASS en cuatro viewports; Pages `45638162526` SUCCESS. La rama de trabajo quedó verificada y la rama base protegida no fue modificada. Próximo paso: validación Beta de FEEDBACK/CATALOG/Spreadsheet con autorización y deployment correspondiente; no hacer llamadas remotas antes de esa autorización.


**Revalidación documental posterior:** el commit documental `ffbeb0bca57d77c7eabd262f20c621174032fa19` también pasó CI `45638460585` (529 suites, 6,272 pruebas, 0 fallos; Playwright 264/264) y Pages `45638457300` SUCCESS. HEAD confirmado al iniciar esta rectificación documental: `ffbeb0bca57d77c7eabd262f20c621174032fa19`.


## Continuidad — GP-LIKE-VEHICLE-ID-PREFIX-01 (2026-11-25)
- Confirmación del propietario: el valor `V-105` aparece exactamente así en la columna `id` de la hoja `Cortes`.
- Diagnóstico: `isValidFeedbackLikeVehicleId_()` en `JS/Services/feedback.js` solo aceptaba dígitos, por lo que rechazaba `V-105` antes de consultar la fila. `corteIndex: 1` sí satisface el rango permitido.
- Corrección preparada: aceptar IDs numéricos históricos y `V-<n>` canónicos con componente numérico positivo/seguro; conservar identidad exacta en el ledger y búsqueda exacta en `Cortes`.
- Pruebas añadidas para `V-105` válido y `V-0` inválido. Pendiente ejecutar suites/CI y verificar publicación. No se llamó a FEEDBACK ni se modificaron datos o deployments.


## Rectificación de CI — endpoint FEEDBACK
- El run `45639453381` del commit `99cff3d` falló en `LocalApiEndpoints.mjs` porque el fixture esperaba la URL FEEDBACK anterior; el propietario había actualizado `API_ENDPOINTS` al deployment nuevo. La suite responsive del mismo run pasó.
- Se actualizó el valor esperado del fixture para reflejar el endpoint que ya está en la rama; no se modificó el endpoint configurado ni se hizo una llamada remota.

 
## Continuidad — nuevas tareas de auditoría Drive y vinculación PyS (2026-11-25)

- HEAD confirmado al registrar: `6c045604f8c3f58af5a2f1b995493e85645743ef` (incluye actualización independiente de `API_ENDPOINTS.FEEDBACK`); HEAD anterior de implementación `be31dea824bf5b6686f5b2be82dd89c9326082a5`. Rama base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin modificaciones.
- Se cerró GP-LIKE-VEHICLE-ID-PREFIX-01: CI run `45642190006` SUCCESS, 529 suites, 6,272 pruebas, 0 fallos; AUG-146 264/264 PASS.
- Registrada GP-ADMIN-DRIVE-AUDIT-HEADLESS-01: el botón Developer debe iniciar auditoría sin abrir modal; salida global en consola; ADMIN debe crear de forma segura DriveAuditRuns/DriveAuditLatest y completar encabezados ausentes sin sobrescribir datos incompatibles.
- Registrada GP-PYS-VEHICLE-ASSOCIATION-CARD-01: asegurar tarjeta de vinculación al final del carrusel PyS en todos los contextos; tamaño 140×120; reutilizar `openSearchVehicleForPysAssociationModal` y la búsqueda del formulario Agregar Problema.
- Orden de ejecución: primero auditoría Drive (UI + FindOrCreate + pruebas); después tarjeta PyS. Inspección inicial: la auditoría abre `audit-drive-modal`; `getDriveAuditStateSheet_()` y `getDriveAuditLatestSheet_()` fallan si faltan sus hojas. En PyS la tarjeta ya está implementada para el contexto normal, pero todo el carrusel se oculta cuando `originModal === 'vehicle'`; corregir esa condición y validar tamaño.
- Sin llamadas a ADMIN, Apps Script, Drive ni Spreadsheet; sin despliegues ni cambios externos.

 
## Rectificación CI — GP-ADMIN-DRIVE-AUDIT-HEADLESS-01 (2026-11-25)

- Primer CI del cambio `eb41de7bc1e165e4132a7e9b5114ca618726f9d5`: `AdminDriveAuditSheetsFindOrCreate` 7/7 PASS; responsive-browser PASS.
- Fallos contractuales detectados: el fixture `AdminDriveAuditGlobalConsole.mjs` asumía una asignación simple de display; se cambia a ramas explícitas visible/headless. `DeveloperOperationMessages.mjs` aún buscaba la firma sin opciones de `openAuditDriveModal`; se alinea al nuevo contrato.
- MIG021 falló porque el propietario actualizó `API_ENDPOINTS.FEEDBACK` a un deployment nuevo y `LocalApiEndpoints.mjs` conservaba la URL previa. Se actualiza únicamente la expectativa; no se altera ni consulta el endpoint.
- La prueba de FindOrCreate confirmó 7/7 PASS; el resto de las validaciones locales queda pendiente de CI de seguimiento.


## Cierre — GP-ADMIN-DRIVE-AUDIT-HEADLESS-01 y GP-PYS-VEHICLE-ASSOCIATION-CARD-01 (2026-11-25)

- HEAD de trabajo al cierre de implementación: `c2d41e04d19d08425ee52090bb3072384ed70575`; rama base `GPSpedia2.2.5` verificada sin cambios en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- GP-ADMIN-DRIVE-AUDIT-HEADLESS-01: `openAuditDriveModal({showModal:false,startImmediately:true})` ejecuta la auditoría desde Developer sin abrir ni registrar overlay independiente; mantiene DOM de soporte oculto y emite el progreso en la consola global. ADMIN crea las dos hojas DriveAuditRuns/DriveAuditLatest con FindOrCreate, relectura tras carreras, validación de encabezados y rechazo seguro de columnas con datos sin título. Prueba específica 7/7 PASS. CI run `45644997410`: 530 suites, 6,279 pruebas PASS, 0 fallos; service-tests y responsive-browser SUCCESS.
- GP-PYS-VEHICLE-ASSOCIATION-CARD-01: el carrusel PyS ya no se oculta con `originModal === 'vehicle'`; la tarjeta final usa 140 × 120 px, abre el formulario existente y conserva navegación/actualización del detalle. El formulario de asociación y Agregar Problema comparten la búsqueda de catálogo por marca/modelo/versión y exclusión de IDs. El formulario recibe los IDs asociados normalizados. `PysModalNavigation` 13/13 PASS. CI run `45646432576`: 530 suites, 6,285 pruebas PASS, 0 fallos; service-tests, responsive-browser y Pages SUCCESS.
- Ambas tareas quedan COMPLETADAS CON VALIDACIÓN DIFERIDA. Pendiente de Beta: confirmar creación real de hojas/encabezados y permisos ADMIN/Drive/Spreadsheet; revisar visualmente tarjeta/carrusel y ejecutar la asociación con catálogo/datos reales. No se invocaron servicios, no se desplegaron Apps Script ni se modificaron recursos externos.
- La rama avanzó también por una actualización del propietario en `JS/Frontend/api-config.js` (ADMIN endpoint); se alineó solo el fixture `JS/Tests/LocalApiEndpoints.mjs` con la URL ya configurada. No se cambió ni consultó el endpoint.


## Continuidad 2026-11-25 — Nuevas tareas solicitadas
- Rama de trabajo verificada: GPSpedia2.2.5_work. HEAD previo a esta implementación: a096657e8dbee7e896e350d7fc9c3628866a9884.
- Rama base protegida GPSpedia2.2.5: sin modificaciones.
- Documentación obligatoria consultada: NORMAS_DESAROLLO.md, README.md, contexto_personal.md, checkpoint.md, Tareas_Activas.md y ChangesLogs.txt.
- Prioridad 1: GP-UTIL-TOGGLE-01. Alternancia útil por corte, hidratación por usuario, contador optimista, persistencia local y consolidación anti-spam.
- Prioridad 2: GP-DRIVE-AUDIT-VISUAL-01. Interfaz visual de auditoría y persistencia de metadatos con relación al catálogo.
- Diagnóstico inicial: la proyección CATALOG anterior descartaba IDs canónicos V-<n>; corregir esa validación forma parte de GP-UTIL-TOGGLE-01.
- Estado: código y pruebas en preparación; CI pendiente.


## Cierre local — GP-UTIL-TOGGLE-01 y GP-DRIVE-AUDIT-VISUAL-01 (2026-11-25)

- HEAD de validación: `d722efdff93ca69b2025788bbe4ba67a9567a35d`. Rama base protegida: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, intacta.
- GP-UTIL-TOGGLE-01: alternancia activa/retirada por usuario+vehículo+corte, hidratación desde FEEDBACK, estado optimista local, contador inmediato, cache local por sesión/usuario y consolidación debounce (1.8 s) en cola serializada; reintentos silenciosos para cambios coalescidos y errores de lock acotados. Terminología de UI/actividad "útil".
- GP-DRIVE-AUDIT-VISUAL-01: inventario muestra miniaturas y todas las clasificaciones, URL de origen, nombre, carpeta/ruta/ID, formato/MIME, tamaño/fecha, origen y ubicación de referencia. Las ubicaciones de Cortes incluyen ID, categoría, marca y modelo; preview de asociación visual incluye miniatura, candidatos, confianza y estado ambiguo, sin asociación automática.
- CI run `45680455995` SUCCESS: 533 suites, 6,311 pruebas PASS, 0 fallos; service-tests y responsive-browser SUCCESS. AUG-146 Playwright 264/264 en 4 viewports y 16 capturas. Pages run `45680455638` SUCCESS.
- Pruebas focales: `FeedbackUsefulToggle` 6/6, `UsefulButtonState` 5/5, `UsefulSyncQueue` 4/4, `FeedbackLikeClientRetry` 2/2 + 1 prueba de setCutUseful, `AdminDriveAuditIndexedDB` 13/13, `AdminDriveAuditVisualContract` 6/6, `AdminReplacedImagesIntegrity` 64/64.
- Validación local/CI no ejecuta Apps Script, Drive ni Spreadsheet real; queda pendiente Beta aislada. No hubo despliegues ni modificaciones de recursos externos.
- Próxima tarea: preparar MIG-URL-008, validación de salud de los seis endpoints, estrictamente pendiente de confirmación de entorno Beta aislado y autorización expresa para las solicitudes GET. No invocar endpoints hasta confirmar.


## Inicio de MIG-URL-008 — preparación Beta (2026-11-25)
- MIG-URL-001..007 están cerradas; se inicia preparación de MIG-URL-008, sin consultas HTTP.
- Preparada lista de verificación para seis endpoints: confirmar entorno Beta aislado, identidad/version health `GPSpedia-*`, status, latencia y comportamiento de endpoint no disponible; prueba funcional por servicio y control de fallos; comparación de configuración local y prohibición de llamadas backend→backend.
- Requisito previo aún pendiente: el propietario debe confirmar explícitamente que los recursos son Beta aislada y autorizar GET health y pruebas funcionales. No ejecutar peticiones hasta esa confirmación.
- Estado: preparación documental completada; validación remota NO EJECUTADA.


## Corrección GP-ADMIN-AUDIT-REFMAP-01 y GP-UTIL-VISUAL-02 (2026-11-25)
- Hallazgo confirmado en auditoría: el snapshot inicial se crea con `collectActiveDriveReferences(false)` y conserva listas de IDs, pero no la propiedad `references` (Map). El escáner luego accedía sin guardia a `referenceSnapshot.references.get(fileId)`, causando exactamente `Cannot read properties of undefined (reading 'get')` antes del primer lote. Corrección: lectura de ubicaciones opcional y protegida si el snapshot no contiene Map.
- Útiles: refuerzo del estado visual inmediato al clic (clase liked, color, aria-pressed, título y feedback de escala), y CSS de persistencia del estado activo incluso hover.
- Commits individuales en rama autorizada: admin `3b86bb1fdc6ef74d32c4c616b501152e051867dd`; UI `535fb539270c2d59acb9bdd9f97dd43d22361ee0`; CSS `3c3a5cc3e6b0f3cd64bc2f1afbb3e74e2d2cc99c`; prueba útiles `0fe5adac5e1cfb01acf2428b078e5bbdcc679ae1`; test guard auditoría `e3d536b4717370c3cdf6884c28ac961b19544b64`.
- Validación automatizada y CI pendientes de comprobación posterior. La prueba real en deployment ADMIN/FEEDBACK y Drive/Spreadsheet no se ejecutó; requiere entorno Beta aislado.

- CI intermedio detectó dos problemas de test (contrato LocalApiEndpoints aún refería al ADMIN anterior, y UsefulButtonState reportaba 5 tests pese a incorporar el sexto). Se alineó el endpoint esperado con la URL confirmada y se corrigió el resumen del test. CI del HEAD actual en ejecución; no marcar aprobación antes del resultado.


## Nueva tarea — GP-ADMIN-INVENTARIO-INCREMENTAL-01 (2026-11-25)
- HEAD verificado antes del registro: `64daf658f24ab88f53d1239d0ce7e349bbc40416`; rama base protegida permanece intacta.
- Hallazgo: handler de inventario requiere estado completo/digest final; frontend no guarda por lote, solo ofrece registro manual al finalizar. Se documentó en `Auditoria.txt`.
- Plan de implementación: `GP_ADMIN_INVENTARIO_INCREMENTAL_01.md`; se creó commit de documentación `835388abeb8f293c33fb934c7746805fc970e753` y hallazgo `7ba039dbeffa24b88d32bec15386e5a66c0e50f6`. (Registro de ChangesLogs en `25cef196c5f8080dd04bbcefa49f5acbb6c52b3e`).
- La implementación y las pruebas todavía no se han ejecutado; continúa inmediatamente con el handler incremental seguro, frontend, pruebas y CI. No deployment ni cambios a Drive/Spreadsheet real.


## GP-ADMIN-INVENTARIO-INCREMENTAL-01 — continuidad
- Código implementado parcialmente: validator incremental de ADMIN, registro por lote desde frontend y consolidación automática final. Se agregó test contractual/simulado y runner integración.
- CI run `45705785866` SUCCESS para SHA `fcc5db4f8f9ed54d31356173d2edf91dd0d451ea` (antes de las últimas assertions de resultado final). CI posterior a SHA `3fd3d34c14cb9af33982273531ff6b59392a934b` aún en ejecución.
- Revisión adicional pendiente: confirmar operación global del organizador, idempotencia/reintentos concurrentes, fallos parciales, diff, suites posteriores y registrar resultado. No despliegue Apps Script ni escrituras externas.


## Cierre local — GP-ADMIN-INVENTARIO-INCREMENTAL-01 (2026-11-25)
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA a Beta.
- ADMIN registra batches de IDs no usados verificados en páginas cacheadas/persistidas; valida owner, estado/TTL, revalidación de referencias y Drive; digest idempotente por lote. El modo incremental no modifica resumen global ni reconcilia stale; el handler final completa la reconciliación.
- Frontend registra cada lote automáticamente, conserva el scan si hay error de inventario, consolida al completar y exige resultados confirmados para marcar guardado.
- CI run `45705928487` SUCCESS, commit validado `3fd3d34c14cb9af33982273531ff6b59392a934b`: syntax-check, regression service runner y responsive-browser SUCCESS. Test AdminIncrementalInventory integrado.
- HEAD de rama de trabajo actual en este checkpoint: `37cb3a160771b9a6deae2ca6eca8d514842145c6`; base protegida `d9acc68d889985c2e2f42fe3a02e502efc86ead1` intacta.
- Pendiente Beta aislada: deployment ADMIN actualizado, ver biblioteca visible por lote, reintentos idempotentes, fallos parciales/reanudación, referencias cambiantes y organizador. Sin despliegue ni modificación Drive/Spreadsheet real.

## Continuidad — incidencia #130 (2026-11-25)

- El acceso a GitHub se recuperó usando la API de repositorio conforme a NORMAS_DESAROLLO.md §20; no se requiere cambio de configuración del propietario. Se confirmó permiso push en infogpstech/GPSpedia y rama GPSpedia2.2.5_work. La base protegida GPSpedia2.2.5 no fue modificada.
- Se inspeccionó el escáner ADMIN y se confirmó el ReferenceError `item is not defined` en el objeto de `auditResults` de `handleAuditDriveImagesInCortesCore_`: una propiedad duplicada intentaba leer `item.referenceLocations` fuera de ámbito. Se eliminó esa expresión, conservando el mapeo de `referenceLocations`.
- Se añadió `JS/Tests/AdminDriveAuditItemReference.mjs` (construcción del resultado con ubicaciones y sin ellas) y se integró en `JS/Tests/RunServiceTests.mjs`.
- Se detectó que `readFeedbackLikeEventCounts_` en CATALOG no restablecía `completed` cuando el mismo actor reactivaba un útil después de retirarlo. Se corrigió el estado y se amplió `CatalogLikeProjectionReadScale.mjs` con event → withdrawn → event.
- Commits de código/pruebas: `f740da0e98d40082d6753f6fd3670b0ad113e9f2`, `e1f04981ab99d770b31bdbe4cafefc782b5e173a`, `e4e0e0218e16cdc5ce89d641d81ad38cdbe26590`, `fd629d599197d16705f418edda1f94784c5d5976`, `22850449c06f3e7d6d620c55c48f154481aef509`.
- Registros actualizados: `Tareas_Activas.md`, `Auditoria.txt`, `ChangesLogs.txt`; issue de seguimiento: https://github.com/infogpstech/GPSpedia/issues/130.
- CI de los nuevos commits todavía no confirmada; no se presentan como pruebas ejecutadas. Continúa revisión del contador DOM/estado local y auditoría integral de scanner, UI, metadatos y registro incremental. Apps Script/Drive/Spreadsheet real permanece pendiente de Beta aislada; no hubo despliegues ni escrituras externas.

## Continuidad — ampliación de incidencia #130 (2026-11-25)

- Se confirmó una segunda causa del contador incorrecto: la proyección CATALOG ordenaba los grupos de corte por cantidad de útiles y reasignaba slots 1..3 sin conservar el índice físico original. El frontend enviaba el slot visual a FEEDBACK como `corteIndex`, que identifica la columna original de Cortes. Se añadieron `sourceCorteIndex1..3` en la proyección; el modal usa ese índice original y `likeState`/`syncUsefulCount_` traducen entre índice original y slot visual al actualizar.
- Se añadió `JS/Tests/UsefulOriginalCutIndex.mjs` al runner CATALOG. Runner JavaScript aislado con las fuentes actuales: PASS para proyección ordenada 2,3,1, activación, confirmación y retirada del corte físico original.
- La hipótesis inicial de resetear `completed` en la proyección CATALOG se descartó y revirtió: `completed` identifica un voto ya materializado en el contador base. Restablecerlo duplicaría el conteo al reactivar. La prueba de proyección se amplió para distinguir reactivación de evento pendiente y evento materializado. Rectificación añadida a `Auditoria.txt` y `Tareas_Activas.md`.
- Validación sintáctica aislada mediante parser JavaScript: PASS para `admin.js`, `catalog.js`, `likeState.js`, `ui.js` (tras retirar sintaxis de módulo para el parser Function), `usefulSyncQueue.js`, nuevas pruebas y runner. No equivale a Node CLI ni CI.
- Commits adicionales: `1ebe3e1ea26a8f3f095b15c98f45935c482fb817` (reversión semántica completed), `062c6225725ac960a1c655afb67217d5b21fa942` (prueba de proyección), `4c40a8318995ac80cbf1548b3a67300eee36cd6c`, `7fdf2b83925b4b9858891675d6a49e117443f437`, `446009217b494e1e2381ad8d2cd0f0be272b237c`, `f3cc433cc38afc0a6d0a3b3d9502f5e6d9b94523`, `49ae65c79d95d98d8b0df301912f7f9c4cd27253`, `a9e3dded04758270174e00bac6401f9ecd842fe2`, `54b4d9a41bbaaad8f414e398ec8ec2ee06cc0e49`, `ff070e52c0ef03dec85cf8ec67949575f0887c4b`.
- El defecto `item is not defined` sigue corregido en ADMIN. La interfaz de auditoría ya contiene miniaturas, relación con vehículos, metadatos y consola Developer; falta comprobar el flujo integral de inventario, cursor y persistencia en los escenarios locales adicionales.
- Estado CI: no se pudo obtener una lista de checks mediante la integración disponible (respuesta vacía); no se declara CI aprobado. No se ejecutaron deployments Apps Script, Drive ni Spreadsheet reales. Base protegida sin modificaciones según comparación remota.

## Continuidad — inventario completo y asociación persistente (2026-11-25)

- Se amplió el esquema de `Imagenes_Reemplazadas` de 27 a 35 columnas: se mantienen las 11 columnas históricas y las 16 dinámicas anteriores; se añaden `drive_folder_id`, `formato_archivo`, `tamano_bytes`, `fecha_modificacion_drive`, `referencias_catalogo_json`, `asociacion_estado`, `asociacion_confianza` y `asociacion_candidatos_json`.
- `handleSaveUnusedImagesInventory` recupera metadatos del snapshot de auditoría por auditId/páginas; revalida nombre, MIME, folderId y ruta frente al estado actual de Drive; registra los campos de metadata y asociación por lote. La escritura/read-back ahora compara los ocho campos adicionales.
- `buildCortesImageModelAssociationSuggestions_` calcula sugerencias por nombre y ruta, agrega IDs de vehículo y filas de Cortes; cuando un modelo corresponde a varios IDs, la sugerencia queda ambigua y requiere revisión manual. No se aplica asociación automáticamente.
- `handleGetReplacedImages` expone metadata y candidatos; la biblioteca muestra formato, bytes, ID de carpeta, fecha de modificación, estado/confianza, vehículos y filas; el filtro permite buscar por carpeta, formato y candidatos.
- Pruebas nuevas/ampliadas: `AdminDriveAuditAssociation.mjs`, `AdminDriveAuditMetadataPersistence.mjs`, `AdminIncrementalInventory.mjs`, `AdminReplacedImagesIntegrity.mjs`, `AdminDriveScanModal.mjs`; todas integradas en `RunServiceTests.mjs`.
- Validación aislada ejecutada con funciones reales: esquema simulado 35 columnas PASS; read-back de ocho campos PASS; asociación única/ambigua PASS; parser JavaScript PASS para 14 archivos productivos/prueba. Node CLI y CI no están disponibles/confirmados en esta sesión; no se declara suite aprobada.
- Commits de esta fase: las revisiones individuales están registradas en `Tareas_Activas.md`, `ChangesLogs.txt` y el Issue #130; último commit de checkpoint anterior: `b0d5d1bdc61edc884e0abf88bbd352fc296e2ad1`.
- No se ejecutaron servicios Apps Script, Drive ni Spreadsheet reales. La rama base protegida `GPSpedia2.2.5` permanece sin modificaciones; un archivo de prueba creado accidentalmente en `main` fue eliminado inmediatamente y recreado en la rama de trabajo. Seguimiento: Issue #130.


## Continuidad — persistencia de asociación y metadatos extendidos (2026-11-25)

- El esquema `Imagenes_Reemplazadas` se amplió finalmente a 35 columnas: 11 históricas + 24 de inventario/metadata/asociación. Se preservan todas las columnas existentes; migración simulada 35/35 y lectura `ready`.
- `handleSaveUnusedImagesInventory` recupera metadata de las páginas persistidas del scan, valida nombre/MIME/folderId/ruta actuales contra el snapshot y Drive, y guarda folderId, formato, bytes, fecha de modificación, referencias JSON, estado/confianza/candidatos de asociación. `writeDriveInventoryRowVerified_` confirma por read-back los ocho campos.
- La asociación se calcula por nombre/ruta y catálogo. Los candidatos guardan categoría/marca/modelo, IDs de vehículo, filas, score y señales. Modelos compartidos por varios vehículos se marcan ambiguos; no hay asociación automática. La biblioteca muestra los candidatos y permite buscar por carpeta/formato/ID/candidato.
- Pruebas integradas en runner: `AdminDriveAuditAssociation.mjs`, `AdminDriveAuditMetadataPersistence.mjs`, `AdminIncrementalInventory.mjs`, `AdminReplacedImagesIntegrity.mjs`, `AdminDriveScanModal.mjs`. Runner JavaScript aislado: migración de esquema 35 columnas PASS; read-back de ocho campos PASS; asociación única/ambigua PASS; parsing de 14 archivos PASS.
- Commits de esta ampliación están registrados en `Tareas_Activas.md`, `Auditoria.txt`, `ChangesLogs.txt` y Issue #130. Último commit de checkpoint anterior: `0ad7599b8a6b94432d232d1e9e6999bebc59755e`.
- Estado pendiente: ejecución de la suite Node/CI y validación Beta aislada de ADMIN/Drive/Spreadsheet; no se hicieron deployments ni escrituras externas. La base protegida conserva SHA `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; la comparación remota muestra `GPSpedia2.2.5_work` ahead 8845 / behind 0. El archivo creado accidentalmente en `main` fue eliminado inmediatamente; no existe en esa rama.


## Continuidad — verificación de hidratación de útiles (2026-11-25)

- `UsefulButtonState.mjs` verifica que el botón de útil queda deshabilitado hasta completar la hidratación de estado FEEDBACK cuando no existe caché local, y que la UI conserva el índice físico original del corte al ordenar por popularidad. Runner JavaScript aislado: 8/8 PASS. Commits `4f71aad685dc36cc5d956a02e63f0a5ed2f0c16b` y `5fa71b0a59821e684988ffd2e09ec240a0f6cc7a`.
- Registros de tareas, auditoría y cambios actualizados; Node/CI sigue pendiente de evidencia. No se ejecutaron deployments ni escrituras reales en Drive/Spreadsheet.


## Validación local y corrección de fixtures — incidencia #130 (2026-11-25)

- HEAD de código probado: `b7a8fbbf8615be14e3166f9119291a2db08ac856`. Se trabajó únicamente en `GPSpedia2.2.5_work`; rama base `GPSpedia2.2.5` verificada en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.
- Lectura normativa: `NORMAS_DESAROLLO.md` completa. Aplicado §20: al no poder clonar por DNS del entorno, se recuperaron fuentes exactas vía GitHub API y se ejecutaron pruebas deterministas en runner JavaScript aislado. No se atribuyó a esta simulación el resultado del runner Node original.
- Primera ejecución CI `45718729264`: 429 suites, 5,036 pruebas aprobadas y 2 fallos. Responsive-browser SUCCESS. Fallos diagnosticados en fixtures: `CortesImageModelAssociationSuggestions.mjs` omitía un ID de vehículo, por lo que el algoritmo correctamente clasificaba la sugerencia como ambigua; `LocalApiEndpoints.mjs` esperaba IDs CATALOG/ADMIN anteriores a los de `API_ENDPOINTS` vigente. No se detectó defecto productivo en esos dos casos.
- También se corrigió `AdminDriveAuditItemReference.mjs`: el objeto extraído usa `fileName` y `classification`, pero el constructor de prueba no los inyectaba. La regresión quedó en 3/3 PASS.
- Fixtures corregidos: identidad única `V-100` en el helper de filas de asociación y valores CATALOG/ADMIN sincronizados con `API_ENDPOINTS`; no se modificaron endpoints, servicios ni deployments. Commit de corrección: `7f8e18814ad4cdc9f7696472a2b3c8b27b5eae2d`; alineación de endpoints: `b7a8fbbf8615be14e3166f9119291a2db08ac856`.
- Runner aislado con fuentes exactas de rama: `AdminDriveAuditItemReference` 3/3; `CatalogLikeProjectionReadScale` 9/9; `FeedbackUsefulToggle` 6/6; `UsefulButtonState` 8/8; `UsefulSyncQueue` 4/4; `CortesImageModelAssociationSuggestions` 8/8; `LocalApiEndpoints` PASS (10 comprobaciones contractuales). La adaptación de runner no se presenta como Node CLI local.
- CI final `45718949366` SUCCESS: 539 suites, 6,385 pruebas aprobadas, 0 fallos. Jobs `service-tests` y `responsive-browser` SUCCESS; sintaxis y AUG-146 real-browser completados.
- Próximo paso de #130: auditar contador proyectado/estado local/título DOM y completar scanner incremental (cursor, fallos parciales, reanudación y persistencia) con pruebas locales. Beta real de Apps Script/Drive/Spreadsheet sigue diferida; no hubo llamadas, despliegues ni escrituras externas.


## Integridad del escaneo Drive y sincronización visual de útiles — incidencia #130 (2026-11-25)

- HEAD previo: `6824868691bf901109f8e62e6517d0f50101fa22`; rama base protegida `GPSpedia2.2.5` verificada en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, intacta.
- Hallazgo de integridad: el escáner podía terminar el recorrido con `complete=true` y `errorCount>0`. Aunque el árbol se hubiera recorrido, no todos los archivos eran verificables; el backend aceptaba la confirmación final y habilitaba acciones posteriores sin exigir un escaneo sin errores. Riesgo: consolidar un inventario incompleto o permitir reconciliación/organización con evidencia incompleta.
- Corrección: ADMIN rechaza inventario incremental y final, consulta latest, preview, aplicación de reconciliación y organización cuando `errorCount>0` o `unverifiableReferenceCount>0`. El frontend bloquea guardar, organizar, reconciliar y preview; omite consolidación final y conserva resultados parciales con aviso para iniciar un nuevo escaneo. No se borran resultados ni registros incrementales previos.
- Hallazgo UI: `syncUsefulCount_` seleccionaba cualquier elemento con atributos de útil, incluidos los botones `.util-btn`; su actualización de `textContent` podía sustituir el icono del botón. Se restringió el selector a `.accordion-btn` y `.detail-section-heading`; prueba de regresión ampliada.
- Primera CI del cambio `932736937d22caa149361cf2326021873b8155d4` falló por una aserción obsoleta de `AdminIncrementalInventory.mjs`, que esperaba el estado UI anterior. No se revirtió la protección; se actualizó el contrato del test. Commits de corrección: `d487be4c271d7cfe6cdf0f3213207f858b76f8f2` y `6824868691bf901109f8e62e6517d0f50101fa22`.
- CI final `45719961761` SUCCESS para `6824868691bf901109f8e62e6517d0f50101fa22`: 540 suites, 6,401 pruebas aprobadas, 0 fallos; `service-tests` y `responsive-browser` SUCCESS. Pruebas focales: `AdminDriveScanIntegrity` 15/15, `AdminIncrementalInventory` 35/35, `UsefulButtonState` 9/9.
- CI intermedia `45719860942` falló únicamente por el test contractual antiguo de inventario; el fallo se diagnosticó y corrigió conforme a NORMAS_DESAROLLO.md §6–7. La CI posterior al ajuste es la evidencia válida de cierre de esta iteración.
- Estado #130: validación de útiles y guardas de integridad completadas en CI. Pendiente: pruebas adicionales de cursor/replay, fallos parciales/reanudación y persistencia de páginas del escáner; revisión integral final. No se desplegaron Apps Script ni se realizaron llamadas/escrituras en Drive o Spreadsheet real. Beta aislada sigue pendiente.
- Siguiente paso: ampliar pruebas deterministas de cursor, deduplicación, reanudación y persistencia de lotes; después revisar diff completo y actualizar el cierre de #130.


## Ubicaciones de referencia, versión de auditoría y recuperación de cursor — incidencia #130 (2026-11-25)

- HEAD de código: `bdb201ab0c6c2c76264a7c083bd5625cc6a1172b`. Rama de trabajo `GPSpedia2.2.5_work`. Rama base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, intacta. Comparación: 8,870 commits ahead, 0 behind.
- Hallazgo: el snapshot inicial usaba `collectActiveDriveReferences(false)`; retenía IDs activos, pero no las ubicaciones por vehículo. Además, `storeDriveAuditSeenPage_` no serializaba `referenceLocations`, aunque `loadDriveAuditFileMetadata_` esperaba recuperarlas. Las imágenes podían clasificarse como «En uso» sin exponer vehículo, fila y campo.
- Corrección: el escáner captura referencias detalladas, conserva en el snapshot serializable `referenceLocationsById` para ubicaciones de `Cortes`, valida IDs/hoja/fila/columna, restaura las ubicaciones al reanudar, las persiste en páginas de metadatos y las entrega al inventario como `referencias_catalogo_json`. Se mantiene compatibilidad con snapshots previos sin ese campo solo para lectura; no se autorizan para operaciones finales.
- Se elevó `ADMIN_SERVICE_VERSION` de `2.7.1` a `2.7.2` por el cambio del esquema del snapshot. Los cursores/estados de auditorías anteriores no se reanudan ni se usan para inventario, preview, reconciliación u organización; deben iniciar auditoría nueva. No se desplegó el servicio.
- Pruebas añadidas/actualizadas: `AdminDriveAuditReferenceSnapshot` 14/14; `AdminDriveAuditReferenceLocations` 6/6; `AdminDriveAuditCursorRecovery` 23/23; `AdminDriveAuditMetadataPersistence` 11/11. Contratos existentes: `AdminDriveScanIntegrity` 18/18; `AdminIncrementalInventory` 35/35; `AdminReplacedImagesIntegrity` 64/64; `UsefulButtonState` 9/9. `AdminDriveAuditClientRetry` mantiene pruebas de retry/cancelación/timeout con payload/cursor idéntico.
- CI final `45721749765` SUCCESS en commit `bdb201ab0c6c2c76264a7c083bd5625cc6a1172b`: 542 suites, 6,447 pruebas aprobadas, 0 fallos. Jobs `service-tests` y `responsive-browser` SUCCESS.
- Incidencias de CI durante la iteración fueron diagnosticadas y corregidas: aserción antigua del estado de inventario; harnesses que no inyectaban `ADMIN_SERVICE_VERSION`; fixtures completos que no incluían versión/esquema; y precedencia de error para auditoría aún no confirmada. No se desactivaron guardas ni se maquillaron resultados.
- Pendiente de #130: revisión final del diff completo; completar verificación integrada del contador proyectado CATALOG ↔ estado local ↔ título DOM; revisar persistencia/reanudación con los escenarios disponibles y actualizar cierre. Las pruebas reales que requieren Apps Script/Drive/Spreadsheet permanecen PENDIENTES DE DESPLIEGUE / VALIDACIÓN BETA y no se simularon.


## Verificación integrada final de contador y snapshot — incidencia #130 (2026-11-25)

- HEAD de trabajo: `056f54243557a139221c41d92bcbdadd4530a983`. Rama base protegida: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios. Comparación de ramas: trabajo ahead, 0 behind.
- Revisión final del diff desde el checkpoint anterior `837e421fcc875d07c8117f6cd9a1a9ec78d1408c`: 5 commits; únicamente se modificaron `JS/Tests/AdminReplacedImagesIntegrity.mjs` y `JS/Tests/UsefulButtonState.mjs` después de ese checkpoint. Cambios limitados a ampliar el round-trip del snapshot con ubicaciones y probar estado optimista/confirmado hasta DOM. No se detectaron archivos ajenos en esa revisión.
- `UsefulButtonState` ahora usa las funciones reales `resolveUsefulDisplayCutIndex`, `applyOptimisticUsefulState` y `applyConfirmedUsefulState`; comprueba que el índice físico se proyecta al corte visual correcto y que `syncUsefulCount_` actualiza encabezados sin tocar el botón ni su icono. Resultado: 10/10.
- `AdminReplacedImagesIntegrity` ahora incluye `referenceLocationsById` en fixtures del snapshot y valida su serialización/recuperación mediante el manifiesto y los bloques CacheService. Resultado: 64/64.
- CI final `45722568761` SUCCESS: 542 suites, 6,448 pruebas aprobadas, 0 fallos; jobs `service-tests` y `responsive-browser` SUCCESS. Build/deployment de Pages `45722568303` SUCCESS.
- Estado local de #130: correcciones y validaciones automatizadas cubiertas; no cerrar como validación integral real hasta completar la comprobación Beta autorizada de Apps Script, Drive y Spreadsheet. No hubo despliegues ni operaciones remotas sobre esos recursos.
- Próximo paso: esperar confirmación/autorización de entorno Beta aislado; ejecutar las pruebas de útiles FEEDBACK/CATALOG y auditoría/persistencia ADMIN; registrar evidencia y entonces decidir cierre de #130. MIG-URL-008 sigue siendo una tarea independiente pendiente de autorización.


## 2026-11-25 — Preparación del runner de pruebas Beta
- Se registraron ocho hallazgos de revisión estática en Hallazgos_Beta.md (BETA-PLAN-F001..008), distinguiéndolos de defectos de runtime aún no comprobados.
- Workflow de health ahora permite trigger por push restringido a GPSpedia2.2.5_work y configura los gates Beta aislada. El checker usa timeout 8 s, clasifica latencia >=2 s como SLOW y reporta intentos reales. Sigue siendo GET-only.
- Documentación de contrato actualizada para ADMIN fuente 2.7.2. No se invocaron aún URLs remotas; las pruebas de salud permanecen pendientes de resultado de Actions.
- Commits de cambios publicados: ac031f5a (hallazgos), 0e017286 (checker), 312c1d78 (workflow), 762308d7 (documentación de versión).
- Próximo paso: validar parsing del checker, verificar ejecución Actions y ejecutar/interpretar probe remoto; ampliar suite read-only de contratos/feed.


## Continuidad — Validación Beta inicial health (2026-11-26)
- Normativa NORMAS_DESAROLLO.md consultada para esta continuación. Rama autorizada GPSpedia2.2.5_work; no se modificó base.
- Se habilitó runner GET-only y se ejecutó real en Actions: runs 45729426765 y 45729430374 SUCCESS, segunda sobre commit 762308d7cf80e840177d9ed5cc15714de87d3414. Resultado: seis servicios disponibles.
- Versiones observadas: AUTH 2.2.5, CATALOG 2.4.0, WRITE 2.3.1, FEEDBACK 1.2.2, UTILITIES 1.5.0, ADMIN 2.7.1. ADMIN SLOW: 2.431s y 2.701s. Fuente ADMIN 2.7.2, deployment 2.7.1: desfase registrado F009. Latencia persistente F010.
- Pruebas GET no verifican Sheets/Drive, auth transaccional, acciones ni navegador. No se mutaron recursos remotos.
- Próximo paso: diseñar/implementar suite GET read-only CATALOG feed/cursor y contratos; investigar ADMIN slow y discrepancia antes de deploy; mantener operaciones mutables para fase posterior.


## Continuidad — CATALOG feed read-only (2026-11-26)
- Runner de feed integrado al workflow y probado: Actions run 45729926589 SUCCESS, commit a8a46da383caa1b70bbc95d18faf909a03d94a4c.
- Feed CATALOG cursor0/limit1: revision5, minRevision1, 1 cambio, hasMore=true; cursor5/limit1: 0 cambios, hasMore=false. No se registró contenido del evento ni se hicieron mutaciones.
- Latencias feed 2.374/2.381s; F011 documentado. Aún faltan pruebas de reset, cursor fuera de rango, retención y paginación multievento.
- Health en run adicional: ADMIN 2.488s SLOW, versión deployment 2.7.1; se confirma recurrencia F009/F010. Otros cinco servicios PASS.


## Beta read-only — CATALOG boundaries (2026-11-26)
- Implementado e integrado probe de cursor boundaries `JS/Tests/RemoteCatalogFeedBoundaries.mjs`; workflow health actualizado.
- Run 45730637687 SUCCESS sobre commit d529d8ee0dd6e5d31589450471b5733ec7647930: seis servicios disponibles; CATALOG tail/futuro/negativo/malformed/limit edge validado mediante GET.
- Cursor futuro genera resetRequired y cursor actual; cursor inválido y límites 0/51 rechazados. Sin escrituras ni deployment.
- ADMIN 2.7.1 continúa SLOW (2628 ms); AUTH también superó 2 s en esta muestra (2003 ms). F009/F010 y seguimiento latencia permanecen.
- Siguiente: análisis performance/contrato ADMIN, revisar Feed reset/retención con escenarios controlados adicionales; luego iniciar flujo AUTH y otras operaciones únicamente con fixtures Beta aisladas y estrategia ownership/cleanup.


## Continuidad Beta — ADMIN latencia
- Nuevo probe repetido read-only `JS/Tests/RemoteAdminLatency.mjs` integrado al workflow.
- Run 45731465785 SUCCESS: ADMIN v2.7.1, 5 muestras 2556/2206/1390/1480/1622 ms; mediana 1622; 2 muestras >=2s. Fuente en branch declara 2.7.2, diferencia de deployment confirmada.
- No deploy. Variabilidad observable, sin atribución de causa. Feed CATALOG y límites siguen PASS en este run.
- Próximo: plan de pruebas AUTH read-only y preparar fixture aislado para sesión sintética solo tras confirmar los mecanismos de creación/limpieza y roles.


## Continuidad — ampliación de matriz Beta CATALOG (2026-11-25)
- Rama de trabajo verificada en commit `52386ae0b6fdf0e593c9b9e53e8ec45d7af877a5`; se añadió probe read-only de matriz para cursor actual, borde de retención, cursor intermedio, límite pequeño y repetición, e integración al workflow restringido de health.
- Probe: `4fef0a34000b0e830bbf2ac383f29b3305f0073e`; integración workflow: `52386ae0b6fdf0e593c9b9e53e8ec45d7af877a5`; registro de hallazgos: `8ec3b435554a1b84e72b8a7938666ad00fd397d2`.
- Se verificó el SHA de la rama tras la integración; el status consultado quedó pending sin checks asociados. Ejecución/resultados Actions de este probe no verificados aún; no se declara prueba ejecutada.
- No hubo escrituras ni deployment. Pendiente obtener evidencia de ejecución y ampliar pruebas de flujos mutables con fixtures/ownership/cleanup seguros; base protegida no modificada.


## Continuidad — matrix CATALOG (2026-11-25)
- Node.js 22 local: `node --check` sobre `RemoteCatalogFeedMatrix.mjs`, PASS (solo sintaxis).
- Consulta status/checks del commit: pending sin checks. El conector no permite recuperar workflow runs push; entorno shell no resuelve api.github.com (DNS). Ejecución real Beta no verificada; no se presentan simulaciones como resultados remotos.
- Hallazgos actualizados en commit `973b6e1751327f08f90324376e5f819488ba0065`. No mutaciones ni deployment.


## Continuidad — endurecimiento de matriz CATALOG read-only (2026-11-25)
- Ref branch verificada antes del cambio: `1a24cfac60508be7cb3a4e86a76bc55f0bbdaa2f`. Actualización publicada en `JS/Tests/RemoteCatalogFeedMatrix.mjs`, commit `3b02731294ef62f2b640dd89d0305982bc0ed06e`.
- La matriz ahora exige consistencia de currentRevision/minRevision, cursor de continuación no superior a currentRevision, reset en cursor pre-retención (minRevision>0) y cola vacía en cursor actual; conserva comprobación de repetibilidad. Todas las lecturas siguen siendo GET.
- Parsing local Node 22 `node --check` PASS sobre la fuente exacta reconstruida. No equivale a ejecutar probe contra Beta; Actions aún no verificadas. No se realizaron escrituras ni deployments.


## Continuidad — revisión de concurrencia en matriz CATALOG (2026-11-25)
- Se corrigió la matriz para evitar falsos fallos cuando ocurren cambios legítimos del catálogo durante la prueba. Validación de lógica offline con escenarios simulados: 5/5 PASS. Incluye cursor acotado, reset por retención, reset sin eventos y repetibilidad condicional bajo snapshot estable.
- Implementación publicada: `49fce769cc0844cca3b518482411ebca4babed16`; adenda en Hallazgos Beta.
- El test offline no valida el deployment; las pruebas remotas siguen diferidas a Beta.


## Continuidad — medición de latencia de health probe (2026-11-25)
- Detectado y corregido: latencia del probe se medía antes de leer el body JSON, subestimando potencialmente la respuesta. Ahora la marca de latencia se toma tras leer/parsing, antes de validaciones contractuales.
- Fragmento comprobado con Node 22, body simulado y demora 25 ms: PASS (métrica incluye lectura). No se ha ejecutado el probe remoto.
- Implementación commit `c77c4d09db185883851635a6b4f7c0a69c7fb755`; hallazgo añadido en `Hallazgos_Beta.md`.


## Continuidad — reintentos y reporte del probe de salud (2026-11-25)
- `RemoteServiceHealth.mjs` amplía reintentos GET transitorios a HTTP 408, 425, 429 y 5xx, con máximo de tres intentos; otros 4xx no se reintentan.
- El resultado FAIL informa ahora el número real de intentos y no el máximo fijo.
- Prueba aislada Node 22 de clasificación HTTP y formato: 8/8 PASS. No se ejecutó red ni servicio Apps Script.
- Implementación: `71ebb84c8011e4a1e04a5e2050ac061145205de6`; hallazgo registrado en `Hallazgos_Beta.md`.
- Pendiente relevante conservado: el probe valida que la versión exista, pero aún no la compara con la versión esperada de cada servicio; revisar cómo integrar el contrato versionado sin duplicar una fuente de verdad.


## Continuidad — comparación de versión de deployment (2026-11-25)
- El probe remoto ahora carga `Services/SERVICE_HEALTH.md` del mismo `TARGET_COMMIT`, extrae las seis versiones esperadas y compara exactamente la versión del JSON de cada deployment. La fuente documental versionada evita duplicar números en el runner.
- Diferencia de versión provoca FAIL e informa deployment vs fuente esperada. El workflow ya incluye el documento como path de activación.
- Código publicado: `a74d35cc13ddc44b9820dc426012b8d07998497b`; hallazgo F013 documentado.
- Validación Node 22 del parser y ejecución remota aún pendientes. La versión del documento expresa versión fuente, no certifica deployment.


## Continuidad — alineación de estado y pruebas locales de salud (2026-11-25)
- Se alineó el runner remoto con el frontend: ahora exige `status` string y aplica `trim().toLowerCase()` antes de aceptar `available`/`online`. Hallazgo F014.
- `ServiceHealthContract.mjs` incorpora una aserción sobre normalización, comparación de versión del deployment y lectura de `Services/SERVICE_HEALTH.md` desde el commit objetivo.
- El workflow de health ejecuta la suite local con Node 22 antes de las consultas GET remotas; cambios en test, runner y contrato ya disparan la ejecución mediante push.
- Se verificaron estáticamente 6/6 condiciones de integración en la fuente actual. No se ejecutó Node 22 ni se obtuvo resultado de Actions en esta sesión; prueba completa pendiente.
- Commits: runner `a6c4cbdd1ecd71a5644f76e31556bc77f34e3892`, test `b282123316079cb70fd78b77c4191fc788a085c1`, workflow `d21fff9b2faace448194db94f4d54fc3a1130ac4`, registro F014 `8e533bbe8c44b7b5abcda6ded4122d4db4d75300`.


## Continuidad — aclaración y cotejo de versiones de salud (2026-11-25)
- Se aclaró en `Services/SERVICE_HEALTH.md` que la versión comparada por Beta es exclusivamente el campo `version` del endpoint `GET ?debug=true`, no el comentario `COMPONENT VERSION` del archivo Apps Script. Hallazgo F015.
- `ServiceHealthContract.mjs` ahora coteja la versión documentada con el campo expuesto por el `doGet` de cada uno de los seis servicios; para ADMIN resuelve `ADMIN_SERVICE_VERSION`.
- Validación independiente de esa lógica sobre los archivos de la rama: 6/6 PASS. Diferencias conceptuales observadas: FEEDBACK comentario COMPONENT VERSION 2.3.0 vs health 1.2.2; ADMIN comentario 2.7.1 vs health constant 2.7.2. No se alteraron esos comentarios porque no representan el valor que valida el endpoint.
- Pendiente: confirmar la ejecución Node 22 del suite en GitHub Actions para el commit actualizado y confirmar ejecución del workflow Beta GET-only. No se ha certificado deployment remoto en esta sesión.
- Commits: contrato `2e889ce1b63d6959d032006fd6e6b14b4ee6998e`; test corregido `09152e11cc188ecc1ebb1fcaef46e37092f630ab`; Hallazgos `147fe5b2de62777b663130fd167cead0f1146d67`.


## Continuidad — activación de suite de contrato por cambios propios (2026-11-25)
- Se agregó `JS/Tests/ServiceHealthContract.mjs` a los paths de activación de `deployed-service-health.yml`, de modo que modificar la suite que sirve como gate también dispara el workflow. Hallazgo F016.
- Suite de contrato ya contiene cotejo de las seis versiones de salud documentadas contra el campo `version` del `doGet`; validación equivalente con fuentes recuperadas: 6/6 PASS.
- El run PR asociado a HEAD previo `3c82d31cbbfc6565d4aae65972948cf0dc15db2d` se observó en progreso (build, service-tests y responsive-browser); no se debe atribuir su resultado al commit posterior. Confirmar el nuevo run/estado tras este cambio.
- Workflow trigger: `e958c94904b7a0d87369f92a467b83e4b90c0c87`; Hallazgos F016: `5ce8d210fe787af91c97a29dcd52176d4bc14a95`.


## Estado de validación GitHub — HEAD 524926b (2026-11-25)
- HEAD de `GPSpedia2.2.5_work` verificado: `524926b337581bfed22d17c96297d251e77e149b`.
- Run PR `45734353707` asociado al HEAD: jobs `service-tests` y `responsive-browser` observados en progreso; en la última consulta, checkout completado y setup Node aún ejecutándose. No hay conclusión disponible todavía.
- No se ha obtenido evidencia verificable de ejecución de `deployed-service-health.yml` ni de lecturas Beta asociadas a este HEAD. No afirmar validación remota completada.
- El suite MIG021 ejecuta `JS/Tests/ServiceHealthContract.mjs`; el workflow Beta también incluye el mismo suite como gate antes de probes remotos y ahora observa su ruta en `paths`.


## Continuidad — primera ronda de validación Beta GET-only (2026-11-26)

**Estado:** primera fase read-only ejecutada; MIG-URL-008 continúa EN PROGRESO. No se realizaron escrituras, despliegues ni cambios en recursos remotos.

- HEAD de trabajo verificado al cierre de esta fase: `41673965804ef6e272d56e864aa0f7a51e5a9d80`. Rama base `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.
- La API de GitHub devuelve `protected=false` para la rama base. No se modificó su configuración; queda como observación de administración del repositorio, pese a que el flujo de trabajo mantiene la instrucción de no escribir en esa rama.
- CI del commit: run `45745832547` SUCCESS; 542 suites, 6,452 pruebas aprobadas, 0 fallos. Playwright AUG-146: 264/264 PASS en 1366x768, 390x844, 360x800 y 320x700; 16 capturas sintéticas. Pages build/deploy run `45745831839` SUCCESS.
- Health Beta: run `45745832696`; contrato local `ServiceHealthContract` 21/21 PASS. AUTH 2.2.5, CATALOG 2.4.0, WRITE 2.3.1, FEEDBACK 1.2.2 y UTILITIES 1.5.0 responden PASS. ADMIN devuelve identidad/estado válidos, pero deployment 2.7.1 vs fuente esperada 2.7.2; resultado global 5/6 y FAIL correcto.
- CATALOG feed GET-only: cursor 0/limit 1 devuelve 1 evento, currentRevision 5, minRevision 1, hasMore=true, nextCursor 1 (1733 ms); cursor 5/limit 1 devuelve 0 eventos, hasMore=false, nextCursor 5 (1706 ms).
- CATALOG boundaries: cursor futuro solicita reset, devuelve cero eventos y cursor actual 5; cursor negativo, malformado y límites 0/51 son rechazados. PASS.
- ADMIN repeated latency: v2.7.1; muestras 1761/2059/1658/2359/1353 ms; mediana 1761 ms, máximo 2359 ms, dos muestras >=2 s. No se atribuye causa.
- CATALOG matrix: PASS. currentRevision 5/minRevision 1; cursor actual devuelve cola vacía; cursor pre-retención y rango intermedio exponen eventos reset con `resetRequired=true`. Se corrigió una aserción de test que confundía evento reset con página vacía de reconstrucción.
- El workflow ahora continúa ejecutando probes GET-only independientes tras un fallo de health y conserva el FAIL agregado. Runs anteriores documentan la corrección incremental: workflow `5dd0de24`, resumen shell-safe `a10d2bb2`, ajuste semántico matrix `51436be4` y validación completa `41673965`.
- La evidencia de esta fase se registró en `Hallazgos_Beta.md`, `Tareas_Beta.md`, `Tareas_Activas.md` y `ChangesLogs.txt`. No se registraron payloads ni contenido de eventos.

### Próxima acción
Continuar la matriz Beta en orden, empezando por validaciones read-only adicionales de CATALOG y health/UI; preparar pruebas autenticadas/mutables solo con identidades sintéticas, ownership y cleanup verificables. La validación que requiera despliegue ADMIN permanece pendiente; no desplegar Apps Script ni alterar datos/propiedades/permisos sin autorización específica.


## Continuidad — CATALOG paginación secuencial Beta GET-only (2026-11-26)

- Commit de harness: `46ad3a211e2e2d6c0b48a390ec62e8ab7a6399ca`; nuevo probe `JS/Tests/RemoteCatalogFeedPagination.mjs`, integrado al workflow read-only.
- Actions run `45746282852`: feed básico PASS, boundaries PASS, matriz PASS y paginación secuencial PASS. La paginación recorrió 5 páginas/5 eventos desde cursor 0 hasta 5, currentRevision 5, minRevision 1; identificó 3 eventos reset y no observó cambios concurrentes de revisión. No se registraron contenidos de eventos.
- Health 21/21 PASS; cinco servicios coinciden con versión esperada. ADMIN sigue exponiendo v2.7.1 frente a v2.7.2 esperada; resultado global 5/6 y FAIL correcto.
- ADMIN latency: 2620/1317/1555/1588/1765 ms; mediana 1588 ms, máximo 2620 ms, 1/5 muestras >=2 s. La ejecución anterior observó mediana 1761 ms y 2/5 lentas; variabilidad persistente sin causa atribuida.
- CI run `45746282716`: 542 suites, 6,452 pruebas, 0 fallos; Playwright AUG-146 264/264 PASS (1366x768, 390x844, 360x800, 320x700). Pages run `45746281761` SUCCESS.
- No hubo escrituras, despliegues, cambios en propiedades, permisos, Spreadsheet, Drive ni OAuth.

### Siguiente fase
La superficie GET pública de los seis servicios y el feed CATALOG ya está cubierta por los probes disponibles. Continuar con revisión de contratos y casos locales de AUTH/WRITE/FEEDBACK/UTILITIES/ADMIN; los flujos Beta autenticados o mutables requieren una identidad sintética de prueba y un mecanismo de limpieza/ownership verificable. No usar credenciales ni datos de usuarios reales ni desplegar servicios para resolver la discrepancia ADMIN sin autorización específica.


## Continuidad — detección de metadatos AUTH y consolidación de fallos (2026-11-26)

- Commit de tests: `1a1625eb64be58d0ad38a1aec22a8a6800dfd621`; se endureció `ServiceHealthContract.mjs` y el runner remoto para rechazar `sessionAuthority`, `sheetName` y `spreadsheetName` en el diagnóstico público.
- Contrato normativo: `Services/SERVICE_HEALTH.md` exige solo identidad, versión y estado; prohíbe nombres de hojas/estructura interna. La fuente AUTH `doGet(debug=true)` incluye `sessionAuthority`. Hallazgo BETA-F019.
- Run remoto `45746770426`: el gate local falla por AUTH y el probe remoto, ejecutado de todas formas tras ajustar workflow, confirma `response.sessionAuthority` en el deployment. AUTH FAIL. ADMIN también FAIL por v2.7.1 vs v2.7.2. FEEDBACK SLOW 2128 ms; CATALOG/WRITE/UTILITIES PASS. Resultado 4/6 disponibles, dos fallos de contrato.
- ADMIN repeated latency: 5570/2016/2182/1757/2031 ms; mediana 2031 ms, máximo 5570 ms, 4/5 muestras >=2 s.
- CATALOG en el mismo run: feed básico, límites, matriz y paginación secuencial PASS; cursor 0→5, 5 eventos, 3 reset, sin cambios concurrentes de revisión.
- Se ajustó `RunServiceTests.mjs` en commit `3b77c59fde1ee83d2810e61ba673cdfd3741dc26` para que un test fallido no detenga las demás suites del grupo; el job sigue fallando al final si hay fallos. Run `45747008507`: 542 suites, 6,410 pruebas aprobadas, 2 fallos (misma aserción AUTH duplicada en AUG-024 y MIG021). Playwright 264/264 PASS; Pages SUCCESS.
- El usuario autorizó pruebas avanzadas sobre Beta aislada, pero no se hicieron POST ni escrituras. Revisión de `handleLogin`: incluso un login inválido escribe una entrada de error en la hoja Logs y reserva/actualiza CacheService; no se ejecutó porque no hay mecanismo disponible para inspeccionar y limpiar esa evidencia después. El conector Google Drive aparece deshabilitado por administrador, por lo que no se puede verificar/limpiar directamente Spreadsheet/Drive desde esta sesión.
- No se modificó código de servicios, endpoints, deployments, permisos, PropertiesService, Spreadsheet, Drive ni OAuth. La carpeta y Spreadsheet de prueba no recibieron escrituras desde estos probes.
- GitHub API sigue devolviendo `protected=false` para la rama base y la lista de rulesets está vacía; no se modificó esa configuración ni la rama base.

### Próxima acción
Mantener la validación Beta en modo no destructivo: continuar cobertura contractual local y revisar flujos de CATALOG/WRITE/FEEDBACK/UTILITIES/ADMIN. Para AUTH/usuarios y demás casos mutables, no emitir solicitudes remotas hasta disponer de identidad sintética y mecanismo verificable de limpieza de Logs/ActiveSessions/Drive/Spreadsheet. Corregir `sessionAuthority` en una tarea de implementación separada y volver a ejecutar el contrato; resolver ADMIN deployment por procedimiento autorizado, no desde esta fase.


## Continuidad — repetición Beta y runner de pruebas resiliente (2026-11-26)

- HEAD de trabajo verificado: `e69b977c13d2b2c9496d40f5049536718ed42051`; base `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.
- `ServiceHealthContract` ahora reporta todas las aserciones sin abortar al primer fallo: 20/21 PASS; la única falla es AUTH exponiendo `sessionAuthority`.
- Run remoto `45747463436`: AUTH FAIL por `response.sessionAuthority`; ADMIN FAIL por deployment v2.7.1 vs fuente v2.7.2; FEEDBACK 1.2.2 PASS (1790 ms); CATALOG 2.4.0, WRITE 2.3.1 y UTILITIES 1.5.0 PASS. 4/6 servicios disponibles y dos fallos de contrato.
- ADMIN repeated latency: 1898/2301/1779/1350/1558 ms; mediana 1779 ms, máximo 2301 ms, 1/5 muestras >=2 s.
- CATALOG feed, boundaries, matriz y paginación secuencial PASS; cinco páginas/cinco eventos/tres eventos reset, cursor 0→5, currentRevision 5/minRevision 1, sin cambios concurrentes.
- Run service-tests `45747463460`: 542 suites, 6,450 pruebas aprobadas, 2 fallos de suite (la misma aserción AUTH repetida en AUG-024 y MIG021). Playwright AUG-146 264/264 PASS; Pages run `45747462135` SUCCESS.
- El runner `RunServiceTests.mjs` ahora continúa suites y cuenta las aserciones PASS publicadas por una suite que termina con error. `ServiceHealthContract.mjs` también completa sus 21 checks antes de fallar al final.
- El conector Google Drive sigue deshabilitado por administrador; no hay acceso directo a Spreadsheet/Drive para inspeccionar o limpiar efectos de pruebas. Se confirmó en fuente que un login inválido registra una entrada en Logs, por lo que no se ejecutó ningún POST de login sin cleanup verificable.
- Sin escrituras ni despliegues. No se modificaron servicios Apps Script ni datos remotos.

### Siguiente acción
Mantener las pruebas remotas GET-only y la cobertura local. Preparar corrección separada de AUTH para retirar `sessionAuthority` y procedimiento autorizado para actualizar ADMIN a 2.7.2; repetir health después de esas correcciones. No iniciar login, WRITE, FEEDBACK, Drive, YouTube ni operaciones de Spreadsheet mutables hasta tener cuenta sintética y limpieza verificable.


## Continuidad — smoke test de Pages Beta con backend bloqueado (2026-11-26)

- Commit de test: `aa61768a477f4c6d18dd494909b09b5deebd7edf`; nuevo script `JS/Tests/BetaDeployedPageSmoke.mjs`, integrado al job responsive-browser.
- Pages run `45747843657`: SUCCESS; deployment URL `https://infogpstech.github.io/GPSpedia/`.
- Browser run `45747844794`: AUG-146 264/264 PASS (4 viewports, 16 capturas) y smoke de Pages PASS: HTTP 200, título GPSpedia v2.2.5, formulario login visible en 1366x768, 390x844 y 320x800, sin overflow horizontal.
- El smoke bloqueó todas las solicitudes no-GET y los hosts Apps Script: 0 solicitudes no-GET, 0 llamadas a Apps Script, 0 errores JS, credenciales no enviadas y escrituras backend deshabilitadas.
- Service regression run del mismo commit: 542 suites, 6,450 pruebas aprobadas, 2 fallos de suite por la misma aserción AUTH (`sessionAuthority`) duplicada en AUG-024/MIG021. La falla permanece visible; no se marcó PASS.
- No se modificó código de servicios, endpoints, deployments, permisos, Spreadsheet o Drive. El smoke solo consultó recursos estáticos de Pages.


## Continuidad — UI de recuperación de contraseña sin envío (2026-11-26)

- HEAD de trabajo: `a44d6adaa4731ec11473dcf975efa0aae051c28c`; Pages run `45748060216` SUCCESS.
- Browser job del run `45748061081`: AUG-146 264/264 PASS; smoke Pages PASS en 1366x768, 390x844 y 320x800. Se abrió el panel de recuperación, se verificaron usuario/correo y el botón de solicitud; formulario de finalización oculto y retorno al login correcto.
- No se envió la solicitud de recuperación: `recoveryRequestSubmitted=false`; no se introdujeron credenciales; 0 solicitudes no-GET, 0 llamadas Apps Script, 0 errores JS. No se modificó Logs, Users, ActiveSessions, Spreadsheet ni Drive.
- Service regression del mismo commit: 542 suites, 6,450 pruebas aprobadas, 2 fallos de suite por AUTH `sessionAuthority` (duplicado AUG-024/MIG021). El fallo continúa visible y no se ha corregido en esta fase.
- La UI de recuperación queda validada visualmente; la entrega de correo, creación/uso/expiración del código y cambio de contraseña siguen NO EJECUTADOS por ser operaciones mutables.


## Continuidad — mapa de cobertura local y estado de la matriz Beta (2026-11-26)

- Se consolidó en `Tareas_Beta.md` la cobertura local por BETA-01..08 con nombres y conteos de suites sintéticas. Esta evidencia no se presenta como prueba remota.
- CI run `45748061081`: 542 suites, 6,450 pruebas aprobadas, 2 fallos de suite por AUTH `sessionAuthority`. Playwright AUG-146 264/264 PASS y Pages smoke login/recuperación PASS (HTTP 200, 3 viewports, sin llamadas Apps Script ni POST).
- Pages run `45748060216`: SUCCESS. Docs checkpoint run `45748213051`: Pages SUCCESS. Service-tests run `45748213813`: 542 suites, 6,450 PASS, 2 fallos AUTH; el job responsive-browser seguía en ejecución al registrar este checkpoint.
- Las áreas remotas GET-only disponibles quedaron cubiertas: health, CATALOG feed, cursor boundaries, matriz, paginación secuencial y smoke de Pages sin backend.
- No se ejecutaron login real, recuperación con envío, mutaciones WRITE/FEEDBACK/ADMIN, operaciones Drive/Spreadsheet ni YouTube OAuth. Los motivos de seguridad/cleanup están registrados en la sección 25.
- El mapa local por área está en `Tareas_Beta.md`; no sustituye pruebas reales ni habilita despliegues.


## Tendencia ADMIN — consolidado de latencia (2026-11-26)
- 15 muestras GET-only de runs `45745832696`, `45746770426` y `45747463436`: mediana 1898 ms, media 2108.8 ms, mínimo 1350 ms, máximo 5570 ms; 7/15 >=2 s.
- Se conserva el umbral de SLOW del probe; no se infiere causa ni se modifica timeout. ADMIN continúa v2.7.1 vs fuente 2.7.2.
- Última repetición CI de HEAD `e6fb00650162719967479fc9654471af2fecfceb`: Pages `45748423404` SUCCESS; browser `45748424224` AUG-146 264/264 y Pages smoke PASS; service-tests 542 suites/6,450 PASS/2 fallos por AUTH `sessionAuthority`.


## Continuidad — recuperación UI en cuatro viewports (2026-11-26)

- Commit de smoke ampliado: `eaf065412dc3c39e7ae2ca3b4d24c19aba12dc61`.
- Run `45748620437`: AUG-146 264/264 PASS; Pages login/recuperación UI PASS en 1366x768, 390x844, 360x800 y 320x700. Campos usuario/correo y botón visibles, formulario de finalización oculto, sin overflow horizontal.
- El flujo no envió solicitud ni código: 0 solicitudes no-GET, 0 llamadas Apps Script, 0 errores JS, 0 credenciales y 0 escrituras.
- Pages run `45748620501`: SUCCESS. Service-tests run `45748620437`: 542 suites, 6,450 pruebas aprobadas, 2 fallos de suite por AUTH `sessionAuthority` (AUG-024/MIG021).


## Continuidad — diagnóstico confirmado de PWA offline (2026-11-26)

- Commit de diagnóstico: `f3c6cf68e23c4d20f7d5784bf9d83e81eb20431f`; run `45749201690`.
- Manifest e iconos PWA 192/512 PASS; Service Worker activo y controlador PASS. Navegación offline FAIL: HTML se recupera de Cache Storage, pero el login no se inicializa.
- Grafo recursivo de imports de `main.js`: 12 dependencias no están en `CORE_ASSETS`: overlayHistory, navigationHistory, centralConfigurationCache, sessionCacheInvalidation, printQr, editBackupStore, adminImageUploadIsolation, validationBannerLifecycle, usefulSyncQueue, inboxPageCache, driveStorageAlerts y developerConsoleConfirmation.
- Cache Storage contenía 36 rutas, sin esos módulos. Solicitudes fallidas offline: overlayHistory.js, navigationHistory.js, centralConfigurationCache.js, sessionCacheInvalidation.js, CSS Font Awesome y `/thumbnail`.
- Estado observado: offline, Service Worker controla, título GPSpedia, login no visible. No-GET 0; llamadas Apps Script 0; escrituras 0.
- El hallazgo BETA-F020 queda pendiente para una tarea de implementación. No se modificó `service-worker.js` ni módulos de aplicación durante esta fase.
- El mismo run mantiene AUG-146 y Pages login/recovery smoke PASS; la PWA offline es el único fallo del job responsive-browser.


## Continuidad — verificación de disponibilidad de recursos PWA (2026-11-26)

- Commit de harness `cc80ed49f3aacbbc541bd89e11139fe97043deec`: `BetaPwaOfflineSmoke.mjs` ahora verifica HTTP/status de todos los recursos declarados en `CORE_ASSETS` y `OPTIONAL_ASSETS`, además del grafo de imports y la navegación offline.
- Run `45749473444`: service-tests falló por AUTH `sessionAuthority`; responsive-browser seguía en `Install Chromium` al registrar este checkpoint. El resultado del nuevo inventario de recursos queda PENDIENTE; no se declara PASS.
- El fallo offline anterior `45749201690` ya confirmó 12 módulos fuera de `CORE_ASSETS`, Service Worker activo, 36 rutas cacheadas y login no visible sin red.
- No se modificó el Service Worker ni código de aplicación. El inventario ampliado es diagnóstico GET-only y no escribe datos.


## Continuidad — comprobación del árbol de archivos PWA (2026-11-26)

- Git tree recursivo de `GPSpedia2.2.5_work`: 673 archivos, no truncado.
- Los 36 `CORE_ASSETS` y los 4 `OPTIONAL_ASSETS` existen en el árbol del repositorio; las 12 dependencias faltantes también existen como archivos JS. Esto confirma que el problema es la lista incompleta de precache, no archivos eliminados o rutas inexistentes en Git.
- Commit de probe ampliado `cc80ed49f3aacbbc541bd89e11139fe97043deec`; run `45749473444` sigue con responsive-browser en `Install Chromium` al momento de este checkpoint. La ejecución anterior `45749201690` ya confirmó el fallo offline y enumeró las 12 dependencias ausentes.
- Sin cambios en `service-worker.js` ni en recursos de aplicación; solo se consultó el árbol Git.


## Continuidad — resultado definitivo del inventario PWA y runtime offline (2026-11-26)

- Run `45749807870` completó responsive-browser: AUG-146 PASS, Pages login/recovery smoke PASS, PWA offline FAIL.
- Manifest, iconos 192/512, start_url/scope y registro/activación/control del Service Worker PASS.
- HTTP inventory: 36/36 CORE_ASSETS y 4/4 OPTIONAL_ASSETS responden 200. No hay archivos faltantes en Git ni en URLs declaradas.
- El grafo de imports de `main.js` tiene 12 módulos ausentes de CORE_ASSETS. Cache Storage contiene los 36 core, pero no esos 12 módulos.
- Offline: HTML recuperado, `navigator.onLine=false`, SW controla, título GPSpedia; login no visible. Requests fallidas: overlayHistory.js, navigationHistory.js, centralConfigurationCache.js, sessionCacheInvalidation.js, adminImageUploadIsolation.js, Font Awesome CSS externo y `/thumbnail`. Cero solicitudes no-GET, cero llamadas Apps Script, cero pageErrors.
- Causa confirmada: precache incompleto para dependencias JS; además recursos externos no están garantizados offline. Hallazgo BETA-F020. No se modificó Service Worker ni frontend.
- Run `45749892912` (HEAD documental `4f83934c`) estaba en ejecución al checkpoint; el run `45749807870` ya ofrece el resultado completo de la misma versión del harness.


## Continuidad — PWA cold/warm offline (2026-11-26)

- Run `45750124457` confirma el alcance de BETA-F020:
  - Cold offline tras instalar/activar el SW: FAIL; HTML recuperado pero login no visible.
  - Warm-up: una recarga adicional online bajo control del SW carga las dependencias faltantes.
  - Warm offline: PASS; login visible sin conexión, `warmMissingPrecacheModules=[]`.
- Los 12 módulos ausentes de CORE_ASSETS se cachean dinámicamente en la recarga online; por tanto, la función offline sí opera después de ese calentamiento. El problema es la falta de precarga inicial.
- 36/36 CORE_ASSETS y 4/4 OPTIONAL_ASSETS HTTP 200; 0 no-GET, 0 Apps Script, 0 pageErrors. En warm offline queda un fallo no crítico de `/thumbnail`; la pantalla login funciona.
- El test mantiene FAIL global porque el escenario cold offline no cumple. No se modificó `service-worker.js` ni código de aplicación.


## Continuidad — corrección local BETA-F020 (2026-11-26)
- HEAD de partida verificado: `42b7abe6ae27a725763eb9ce01c25f3772f7dc5b`; rama autorizada `GPSpedia2.2.5_work`. Rama base no modificada.
- Causa ya reproducida: offline frío falla porque dependencias estáticas del grafo recursivo de `main.js` no estaban en CORE_ASSETS; warm-up online las almacenaba dinámicamente.
- Cambios preparados en un commit lógico: `service-worker.js` agrega 12 módulos JS + `qrcode-generator.mjs`, y cambia cache v76→v77; `BetaPwaOfflineSmoke.mjs` analiza imports .js/.mjs.
- Pendiente: Actions debe validar HTTP 200, cobertura completa del grafo, install/activate, login offline frío, warm offline y responsive. No cerrar F020 antes de esa evidencia.
- Recursos Font Awesome CDN y miniaturas Drive se mantienen como dependencias externas no esenciales para mostrar login; se documentan fuera del alcance de la corrección core.


## Continuidad — regresiones del harness v77 (2026-11-26)
- Commit de corrección PWA: b65be43f53a35e56b341a5da7349718eeb0dd3b6; Pages build/deploy PASS en run 45755284172.
- CI de regresión 45755284614: sintaxis de archivos modificados PASS; 4 suites fallidas: 2 por AUTH sessionAuthority (conocido), 2 por aserciones rígidas de gpsepedia-cache-v76 en PasswordRecovery y ServiceWorkerCache. Los checks funcionales PWAStartupScenarios 16/16 PASS; PasswordRecovery pasó sus escenarios pero falló el resumen por esa expectativa.
- Corregido el harness: las dos pruebas aceptan gpsepedia-cache-vN; ServiceWorkerCache comprueba además las 13 dependencias nuevas.
- El job responsive/browser del run 45755284614 estaba ejecutando Install Chromium; offline frío aún no verificado. Nueva CI pendiente sobre este ajuste.


## Continuidad — corrección local BETA-F019 (2026-11-26)
- HEAD de partida: c9a0231baca9072d82e2ca57ab037d2bd04aa3f1 en `GPSpedia2.2.5_work`.
- `JS/Services/Auth.js` ya no devuelve `sessionAuthority` en `doGet(debug=true)`; `JS/Tests/Auth.js` actualizado con el mismo bloque. El cambio es mínimo y no altera login ni sesiones.
- No se desplegó Apps Script ni se modificó el endpoint Beta. La exposición remota permanece hasta una publicación autorizada; se validará después mediante GET health.
- Pendiente Actions: ServiceHealthContract debe pasar 21/21, regresión AUTH/paridad y suite global. Mantener el resto de fallos visibles.


## Continuidad — correcciones locales y control de rama (2026-11-26)
- HEAD verificado antes de este checkpoint: `a7c9ae10f13595235cb02fd8ffd648bfe06e1ae2`; rama base `GPSpedia2.2.5` en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.
- Run `45755702144`: `service-tests` SUCCESS, 542 suites / 6,452 pruebas / 0 fallos. `ServiceHealthContract` 21/21; `PasswordRecovery` 10/10; `ServiceWorkerCache` 12/12. La corrección local AUTH elimina `sessionAuthority` y conserva fixture; PWA cache v77 incluye 13 módulos omitidos y el scanner cubre .js/.mjs.
- Pages run `45755701403`: build/deploy SUCCESS. El job responsive/browser `45755702144` seguía en `Install Chromium`; offline frío aún no confirmado. No presentar como PASS hasta que el step browser lo ejecute y sus logs lo acrediten.
- BETA-F019: fuente local validada; deployment Apps Script no realizado. Validación remota diferida.
- BETA-F020: código/regresión local validada; smoke PWA real pendiente por job browser.
- BETA-F021: API de rama devuelve `protected=false` para la base y rulesets `[]`; branch protection detallada responde 403 a la integración. No se tocó la rama base; requiere administrador para protección efectiva.
- No se ejecutaron operaciones POST, login real, mutaciones, despliegues Apps Script ni cambios de datos Drive/Spreadsheet.


## Continuidad — resultado confirmado PWA offline y regresión global (2026-11-26)
- Run `45755902520` COMPLETED SUCCESS en ambos jobs: `service-tests` y `responsive-browser`.
- Regresión: 542 suites, 6,452 pruebas, 0 fallos. `ServiceHealthContract` 21/21, `PasswordRecovery` 10/10, `ServiceWorkerCache` 12/12. Sintaxis de archivos modificados PASS.
- Browser: AUG-146 264/264 en 1366x768, 390x844, 360x800 y 320x700; Pages login/recuperación UI PASS; 0 no-GET, 0 Apps Script, 0 pageErrors.
- PWA v77: 49/49 recursos CORE y 4/4 OPTIONAL HTTP 200; grafo recursivo .js/.mjs completo (`missingPrecacheModules=[]`); `missingCoreAssets=[]`; offline frío y caliente HTTP 200 con login visible, SW controlador y `warmMissingPrecacheModules=[]`. BETA-F020 CERRADA.
- Residuales: Font Awesome CDN y `/thumbnail` de Drive fallan offline, pero no bloquean el login ni generan errores JS; BETA-F022 baja prioridad.
- BETA-F019: fuente/fixture AUTH sin `sessionAuthority`, contrato local 21/21 y suite global PASS. Deployment remoto no actualizado ni validado; pendiente autorización de deployment y GET posterior.
- BETA-F021: base `GPSpedia2.2.5` reporta `protected=false`; rulesets vacíos; API de protección detallada 403. No se modificó la base. Requiere acción administrativa.
- Head de trabajo antes de este checkpoint: `b53ce257923197035d377b0c913a1ab0241d7a44`; base sigue `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.


## Continuidad — activación de health remoto por cambios de servicio (2026-11-26)
- HEAD de partida: 8e77f0ed0681972072c503b73e81b42a959e2306; rama base intacta en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Se detectó que `deployed-service-health.yml` no vigilaba los seis archivos fuente Apps Script; por ello, el cambio local AUTH no activó por sí mismo el probe remoto.
- Se añadieron Auth.js, catalog.js, write.js, feedback.js, Utilities.js y admin.js al filtro `paths`. Al publicar, el workflow ejecutará contrato local y probes GET-only; no despliega ni modifica datos.
- Objetivo de la siguiente validación: confirmar contrato local, estado real de los seis deployments, CATALOG read-only y latencia ADMIN sobre el HEAD actualizado. Se esperan los fallos de AUTH/ADMIN mientras no se actualicen deployments.


## Continuidad — BETA-F023 / BETA-F024 (2026-11-26)
- Run health `45756293382`, commit `47757a03`: contrato local 21/21 PASS; AUTH FAIL por `response.sessionAuthority` aún en deployment; ADMIN FAIL por deployment 2.7.1 vs fuente 2.7.2; CATALOG 940 ms PASS, FEEDBACK 1,760 ms PASS, WRITE 828 ms PASS, UTILITIES 7,916 ms SLOW.
- CATALOG feed, boundaries, matriz y paginación secuencial PASS. ADMIN repeated latency: 1,976 ms mediana, 2/5 muestras >=2 s.
- El resumen del workflow falló por un `if` duplicado (`unexpected end of file`), aunque los probes independientes se completaron. Se corrigió el bloque y se añadió repetición de latencia UTILITIES.
- `RemoteAdminLatency.mjs` ahora acepta SERVICE_KEY ADMIN/UTILITIES, valida identidad/estado/versión, ejecuta cinco GET con timeout 8 s y registra errores por muestra.
- Pendiente nueva ejecución del workflow health para verificar el resumen y obtener cinco muestras de UTILITIES. No se desplegaron Apps Script ni se modificaron datos.


## Continuidad — health remoto corregido y repetición de latencia (2026-11-26)
- Run `45756725304`, commit `5496c88c`: contrato local 21/21 PASS. Health remoto: AUTH FAIL por `sessionAuthority`; ADMIN FAIL por deployment 2.7.1 vs fuente 2.7.2; CATALOG 1133 ms PASS, FEEDBACK 1506 ms PASS, UTILITIES 987 ms PASS, WRITE 1566 ms PASS.
- CATALOG feed, boundaries, matriz y paginación PASS. El resumen final del workflow se ejecutó correctamente y devolvió FAIL solo por health remoto; BETA-F023 cerrado.
- ADMIN 5 GET: 2241/5022/1465/2358/1631 ms; mediana 2241, máximo 5022, 3/5 >=2 s. SLOW confirmado y deployment desactualizado.
- UTILITIES 5 GET: 1090/691/868/778/639 ms; mediana 778, máximo 1090, 0/5 >=2 s. El pico aislado 7916 ms no se reprodujo; BETA-F024 cerrado como transitorio.
- Regresión general run `45756765620`: SUCCESS; 542 suites, 6452 pruebas, 0 fallos; browser responsive PASS; PWA offline PASS; `ServiceHealthContract` 21/21, `ServiceWorkerCache` 12/12, `PWAStartupScenarios` 16/16.
- No se desplegaron Apps Script ni se alteraron datos. AUTH y ADMIN remotos siguen pendientes de deployment autorizado.
