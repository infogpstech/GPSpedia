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
- El modal Herramientas de desarrollador → Sistema contiene seis campos de URL (AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN). Solo esas URL son editables. La UI consulta y actualiza directamente mediante el único bootstrap AUTH.
- El flujo manual de Apps Script usa prepareCentralConfigurationServiceUrlInput() para crear seis filas borrador y publishCentralConfigurationFromServiceUrlDraft() para validar y publicar. Solo se completa endpoint_url; las demás columnas se generan o conservan automáticamente. No requiere autenticación GPSpedia; sí puede requerir autorización Google normal para Spreadsheet.
- AUTH genera metadatos de servicio desde contratos/versiones reales, copia parámetros y recursos vigentes, crea el esquema inicial y rich_text_mode=strict si corresponde, verifica el snapshot, registra historial append-only y cambia active_revision/READY únicamente después de la validación. No se codifican URLs de otros servicios, secretos ni llamadas interservicio.
- Se mantuvo byte-identical JS/Services/Auth.js y JS/Tests/Auth.js. Se actualizaron inventarios y contratos para 125 acciones (AUTH 21). Los errores de UI son neutros; la consola conserva diagnósticos y la interfaz distingue una publicación confirmada de un refresco de caché pendiente.
- CI run 45457211849, job 138669790506, HEAD 9f2a52191c6b87b3a5ed768c6d4b8e59b5cced78: SUCCESS; 515 suites, 6,078 pruebas aprobadas, 0 fallos. CentralConfigurationInitializer 7/7; CentralServiceUrlPublisher 7/7; ServiceCallGraphContract 9/9; MIG029DeploymentGuideContract 16/16. GitHub Pages run 45457210341: SUCCESS. La regresión confirma que el flujo manual prepara únicamente service_key y endpoint_url y no requiere sesión GPSpedia.
- Tareas_Beta.md §19 contiene la lista de verificación para ejecutar el flujo en una Spreadsheet y deployments aislados, validar RBAC, primera publicación, cambios, idempotencia, errores y transición del bootstrap AUTH.
- No se ejecutó el script sobre la Spreadsheet real, no se modificaron datos/propiedades/permisos productivos y no se desplegó Apps Script. La URL inicial de AUTH continúa siendo el único bootstrap fijo del frontend.

## Próxima acción

Preparar Beta aislada y ejecutar Tareas_Beta.md §19 con las seis URL de deployment Beta. Primero ejecutar el flujo manual en AUTH y verificar la primera revisión; después probar el modal con rol Desarrollador y los rechazos con sesión/rol no autorizados. Mantener el bootstrap anterior disponible durante cualquier cambio de URL AUTH. No desplegar a producción ni modificar la Spreadsheet productiva sin autorización expresa.
