# GPSpedia — Checkpoint de continuidad

Fecha: 2026-11-24
Repositorio: `infogpstech/GPSpedia`
Rama autorizada: `GPSpedia2.2.5_work`
Rama base protegida: `GPSpedia2.2.5` — no modificar.
HEAD de trabajo antes del commit de checkpoint: `47173fafc9bfa3b109175fbb9b10331a2df1eb0d`
HEAD de rama base verificado: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`

## Reglas de continuidad
- `NORMAS_DESAROLLO.md` es la única fuente normativa vigente; consultarla antes de cambiar código/documentación operativa.
- Confirmar rama y HEAD antes de cada escritura. No forzar actualizaciones ni modificar la rama base.
- No declarar pruebas ni efectos externos sin evidencia observada. Diferenciar CI/fixtures de Beta real.
- Apps Script: sin secretos compartidos/manuales ni URLs/endpoints de otros servicios; coordinación funcional frontend cuando sea posible; llamadas backend directas solo por necesidad técnica, con autorización/RBAC del receptor. Excepción temporal autorizada para los IDs de Spreadsheet y carpeta Cortes suministrados por el propietario, documentada en NORMAS §17.1.
- Un fallo de servicio u operación no debe bloquear funciones independientes.

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
- GitHub Pages run `45486258242`: SUCCESS sobre el mismo HEAD.
- Código funcional validado en `465194319f7e1c8b21aff181afea3142ef8384a9` sobre `GPSpedia2.2.5_work`. Los registros de cierre se actualizaron después en `checkpoint.md` y `ChangesLogs.txt`. La rama base protegida `GPSpedia2.2.5` permanece en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`, sin cambios.
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
