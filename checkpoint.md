# GPSpedia — Checkpoint de etapa Beta

Fecha: 2026-11-22
Repositorio: `infogpstech/GPSpedia`
Rama de trabajo: `GPSpedia2.2.5_work`
Rama base: `GPSpedia2.2.5`
HEAD de referencia tras rotación documental: `60944c5b2bfd015ceb2450dbb2c1e87ebc58c1a4`
HEAD de la rama base: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`

## Objetivo vigente
Ejecutar la validación Beta de los servicios y la aplicación. Durante esta etapa no realizar correcciones de código: registrar hallazgos en `Hallazgos_Beta.md` y actualizar el avance en `Tareas_Beta.md`.

## Limpieza documental
- Los registros de tareas anteriores al despliegue y el checkpoint previo, junto con sus archivos históricos, se trasladaron a `Olds/Documentacion_Legacy/`.
- Se crearon `Tareas_Beta.md`, `Hallazgos_Beta.md` y este checkpoint nuevo.
- Se eliminaron por instrucción expresa del usuario los informes de auditoría históricos del árbol activo, incluidos sus archivos de archivo y el informe de auditoría del snapshot antiguo.
- Se eliminaron las capturas y archivos auxiliares de `Images/tests/`, que no forman parte del código.
- Se conservaron las listas Beta y sus adendas.
- Se conservaron `JS/Tests/`, sus 373 archivos de pruebas y el workflow de CI, porque sí aportan validación automatizada al código.
- Los changelogs y logs de la raíz, junto con su archivo histórico, se trasladaron a `Olds/Documentacion_Legacy/` sin eliminar su contenido.
- Se añadió a §8 de `NORMAS_DESAROLLO.md` la excepción limitada para purgas documentales expresamente autorizadas por el usuario.

## Estado Beta
- El usuario informó que actualizó las URLs de servicios en `api_config`.
- El aislamiento de endpoints y recursos se considera declarado por el usuario, pero no se verificó de forma independiente desde esta sesión.
- No se han ejecutado invocaciones reales a endpoints ni pruebas de escritura desde esta sesión.
- No está disponible el conector Google Drive/Sheets ni una acción HTTP genérica para invocar Apps Script. No declarar servicios probados ni inventar resultados.
- Reanudar con health/read-only cuando exista un canal autorizado; antes de escrituras confirmar recursos desechables, cuentas de prueba, permisos, previsualización y recuperación.

## Ramas
Deben conservarse `main`, `GPSpedia2.2.5` (base) y `GPSpedia2.2.5_work` (work). Se identificaron ramas adicionales: `GPSpedia2.2`, `GPSpedia2.2.0`, `GPSpedia2.2.5_auth-users-test`, `GPSpedia-2.1.7` y `health-probe-20261117`. La conexión GitHub disponible permite consultar ramas, pero no eliminar referencias; no se ha borrado ninguna. Su eliminación queda pendiente desde una interfaz con permisos de administración, seguida de una nueva verificación.

## Próximas acciones
1. Eliminar ramas ajenas a main/base/work y verificar el listado.
2. Verificar aislamiento de deployments, Spreadsheet y Drive Beta.
3. Ejecutar la matriz de `Tareas_Beta.md` sin modificar código.
4. Registrar resultados observados en `Hallazgos_Beta.md`.


---

## Nuevo objetivo prioritario — Migración de arquitectura sin pérdida funcional

Fecha de actualización: 2026-11-22

El usuario definió un nuevo objetivo que reemplaza el enfoque anterior de limitarse a la validación Beta para esta línea de trabajo: rediseñar la arquitectura de servicios para que no exista configuración operativa guardada dentro de proyectos Apps Script y el frontend sea el único coordinador.

### Requisitos vinculantes
- Todas las configuraciones de GPSpedia se almacenan en Spreadsheet.
- Ningún servicio guarda propiedades, URLs de otros servicios, IDs de recursos, secretos compartidos ni configuración manual.
- Ningún servicio GPSpedia llama a otro servicio GPSpedia.
- No se mantienen COORDINATOR ni SharedMutation ni se crean intermediarios equivalentes.
- El frontend enruta y coordina solicitudes directas.
- AUTH/USERS se unifican conservando las funciones de ambos.
- No se pierde ninguna función de la plataforma: cargas y administración de imágenes/vídeos, creación/edición de modelos, VIN, PyS, tutoriales, Inbox, feedback, Drive, backups/restauración, terminal, estados/latencia/tráfico de servicios, métricas de usuarios, logs, auditorías, herramientas de desarrollador y procesos internos.
- La configuración y los metadatos se guardan en Spreadsheet; los binarios mantienen un almacenamiento compatible. La migración de Drive/YouTube debe conservar identidad, permisos, propiedad y reanudación.
- La seguridad y RBAC no se delegan al frontend. No se exponen tokens OAuth ni se introducen claves compartidas de interconexión.
- Ninguna función se retira por no aparecer en el mapa de 121 acciones: se requiere inventario completo de UI, handlers y procesos manuales/internos.

### Documentos registrados en la rama de trabajo
- `NORMAS_DESAROLLO.md`: §17 establece configuración centralizada y paridad funcional.
- `PLAN_NUEVA_ARQUITECTURA_FRONTEND.md`: arquitectura objetivo, fases y criterios de aceptación.
- `TAREAS_MIGRACION_ARQUITECTURA.md`: 30 tareas con entregables y criterios.
- `MATRIZ_MIGRACION_SERVICIOS.md`: 121 acciones actuales más matriz CAP-01 a CAP-19 de capacidades a preservar.

### Estado verificado
- HEAD de `GPSpedia2.2.5_work`: `2a8c1dc449b9503963be82f1693faf5eb8d827ed`.
- HEAD de `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- La rama base no se modificó.
- En esta actualización solo se modificaron documentos normativos/de planificación; no se cambió lógica funcional, deployments, Spreadsheet ni Drive.
- La matriz de 121 acciones ya está registrada, pero el inventario total de pantallas, handlers no mapeados, comandos y procesos internos sigue pendiente.

### Próximas tareas
1. Completar MIG-001 a MIG-005: inventario real de UI, handlers, propiedades, llamadas internas y línea base.
2. Ejecutar MIG-006 como prioridad técnica: demostrar acceso a Spreadsheet desde Web Apps sin guardar ID/configuración en los servicios y sin introducir bootstrap oculto.
3. Diseñar y probar la solución de configuración y caché antes de modificar los servicios funcionales.
4. No retirar COORDINATOR, SharedMutation, USERS ni endpoints antiguos hasta que todas sus capacidades tengan sustituto probado.
5. Mantener pruebas Beta reales separadas de las pruebas locales; no afirmar que un deployment fue validado si no se invocó.


---

## Continuidad de migración — actualización 2026-11-23

### Verificación GitHub
- Rama de trabajo confirmada: `GPSpedia2.2.5_work`.
- HEAD confirmado al iniciar esta actualización: `9f1697e64015625c2e1abece4f131ad1e9b7b2a4`.
- El HEAD registrado anteriormente (`2a8c1dc449b9503963be82f1693faf5eb8d827ed`) era el padre inmediato: la comparación de GitHub mostró exactamente un commit posterior, `9f1697e64015625c2e1abece4f131ad1e9b7b2a4`, que solo actualizó este checkpoint.
- Rama base `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no se modificó.
- El commit `9f1697e` dejó la rama en el mismo punto que el HEAD indicado en el resumen de la sesión anterior; no hay cambios funcionales posteriores a ese registro.

### Lectura normativa y de continuidad
- Leído `NORMAS_DESAROLLO.md` completo, incluidas las secciones 1–17. Se aplica §17 como objetivo arquitectónico y §§5–10 para validación, registros y publicación.
- Leídos `README.md`, `contexto_personal.md`, este checkpoint, `PLAN_NUEVA_ARQUITECTURA_FRONTEND.md`, `TAREAS_MIGRACION_ARQUITECTURA.md`, `MATRIZ_MIGRACION_SERVICIOS.md`, `Tareas_Beta.md` y `Hallazgos_Beta.md`.
- La validación Beta anterior queda subordinada al nuevo objetivo de migración. Se conservan BETA-F001 y BETA-F002 como antecedentes; no se ejecutaron pruebas remotas.

### Avance de inventario (MIG-001)
- Confirmadas 120 claves únicas del mapa frontend y su distribución: AUTH 15, CATALOG 5, WRITE 9, USERS 3, FEEDBACK 41, UTILITIES 1 y ADMIN 46.
- Contrastados los dispatchers y handlers principales. CATALOG conserva `getSuggestion` como ruta de compatibilidad; UTILITIES enruta `migrateTimestamps` mediante un `doPost` directo, sin switch.
- Identificadas acciones internas adicionales de Coordinator y de caché de actor, así como rutas de compatibilidad/rechazo. Se deben inventariar junto con las acciones públicas.
- Ejecutado `JS/Tests/ActionDispatchContract.js` con fuentes exactas de la rama y el conjunto de consumidores del runner: **12/12 PASS**. No se ejecutó la suite completa `RunServiceTests.mjs` ni Node.js CLI.
- Recuento estático inicial de UI: `index.html` 113 botones/5 formularios/278 IDs; `ui.js` 42 botones de plantilla/8 formularios/138 IDs únicos; `add_cortes.html` 17 botones/3 formularios/61 IDs; `users.html` 9 botones/3 formularios/29 IDs únicos.
- Revisadas políticas RBAC de AUTH, USERS, WRITE, FEEDBACK, ADMIN, UTILITIES e Inbox; el trazado individual por acción y recurso permanece pendiente.
- Revisados consumidores frontend representativos, incluidos `ui.js`, `main.js`, `auth.js`, `youtubeUpload.js`, `pys-data.js`, `add_cortes.html` y `users.html`.
- No se modificó código funcional, deployments, Spreadsheet ni Drive. Solo se ejecutó el contrato estático 12/12 PASS; no hubo invocaciones remotas.

### Estado y siguiente paso
- MIG-001: **EN PROGRESO**. Falta completar trazabilidad de todos los controles/consumidores, contratos, permisos, datos y pruebas; incluir comandos y procesos manuales/programados.
- MIG-002 a MIG-005: **PENDIENTES**, sujetas a las dependencias de inventario.
- MIG-006: prioridad técnica posterior, no iniciar el spike hasta cerrar el inventario y documentar los requisitos de acceso/bootstrap.
- Continuar con extracción de consumidores de UI, handlers internos, permisos y dependencias; después registrar la matriz trazable y ejecutar las pruebas locales disponibles.


### Trazabilidad de acciones — avance adicional 2026-11-23
- Publicada en `MATRIZ_MIGRACION_SERVICIOS.md` una tabla de 121 acciones con servicio, handler y consumidor localizado. En la extracción no quedó ninguna acción del mapa sin dispatcher/handler.
- Se identificaron 12 acciones sin consumidor frontend directo en los módulos inspeccionados; quedan para clasificación manual/interna/indirecta/histórica, sin retirarlas.
- Registradas las 13 operaciones internas de Coordinator, las rutas de caché de actor y la ruta GET incremental `catalogFeed=1` usada por el frontend.
- `ActionDispatchContract.js`: 12/12 PASS con fuentes exactas de esta rama.
- MIG-001 continúa **EN PROGRESO**: faltan payloads/respuestas, RBAC por acción, recursos de datos, Drive/APIs, operaciones manuales/programadas y cobertura de paridad.


Corrección de trazabilidad: ADMIN también consume CATALOG mediante `getVehicleProjection` y `getContributionCandidates`, además de WRITE mediante `allocateVehicleId` y `freezeCortesIds`. La matriz se actualizó y el total de acciones sin consumidor directo localizado se corrigió de 13 a 12.


### RBAC — avance 2026-11-23
- Añadida a la matriz la primera clasificación de permisos por servicio y acciones, incluida jerarquía de administración de usuarios, restricciones de Desarrollador, acciones públicas y permisos de Inbox.
- Confirmado el contrato intencional de `WRITE/checkOperation`: sin actor/lease, `opId` aleatorio de 128 bits y respuesta mínima, cubierto por `CheckOperationSecurity.js`. Debe conservarse.
- Identificado secreto interno de CATALOG para metadatos de inventario de imágenes; requiere migración segura en MIG-003.
- MIG-001 sigue **EN PROGRESO**; aún faltan contratos de payload/respuesta, datos, APIs y pruebas de paridad.


### Pruebas de preservación ejecutadas — 2026-11-23
Se ejecutaron suites existentes sobre fuentes exactas de la rama, con los argumentos de entrada del runner: `ActionDispatchContract.js` 12/12; `CheckOperationSecurity.js` 8/8; `SharedMutationCoordinator.js` 94/94; `UsersAtomicMutations.js` 16/16; `WriteAuthorizationContracts.js` 10/10; `WriteAuthorizationMinimization.js` 15/15; `AddSupplementaryInfoIntegrity.js` 61/61; `VinAuthoritativeValidation.js` 12/12; `UtilitiesSecurity.js` 19/19. Total: **247 aserciones aprobadas, 0 fallidas**. No se ejecutó el runner Node.js completo ni se invocaron Apps Script/Spreadsheet/Drive reales; no es validación Beta.


### Recursos Spreadsheet — avance 2026-11-23
- Añadido a la matriz el inventario de hojas por servicio y el esquema de las cinco hojas Inbox.
- Identificado `SPREADSHEET_ID` local en AUTH/USERS/WRITE/CATALOG/FEEDBACK/ADMIN/UTILITIES; `DRIVE_FOLDER_ID` en ADMIN/FEEDBACK. Se reserva la migración de estas referencias para MIG-003/MIG-004.
- MIG-001 sigue **EN PROGRESO**: falta mapear columnas/rangos y efectos por acción, Drive, triggers y APIs.


### Rutas internas fuera del mapa — avance 2026-11-23
- Extraídas las acciones aceptadas por los dispatchers y ramas de `doPost` frente a `ACTION_TO_SERVICE_MAP`: 120/121 acciones mapeadas tienen ruta backend; 0 faltantes.
- Documentadas las 2 acciones internas de caché de actor en USERS/WRITE/FEEDBACK/ADMIN (8 rutas) y las 13 acciones privadas de Coordinator, con sus consumidores y propósito.
- Registrados GET `catalogFeed=1`, estados `debug=true`, diagnóstico CATALOG, compatibilidad de CATALOG `getSuggestion`, rechazos ADMIN `ACTION_MOVED_TO_WRITE` y ruta directa de UTILITIES.
- Las 12 acciones sin consumidor directo siguen pendientes de clasificación. MIG-001 permanece EN PROGRESO; no se modificó código funcional ni deployments.


### Acciones sin consumidor directo — clasificación inicial 2026-11-23
- Revisados los 12 handlers sin consumidor directo localizado y documentado su propósito en §13 de la matriz.
- Diferenciadas acciones de sesión/diagnóstico/navegación/Inbox, migraciones de esquema e identificadores, reconciliación multimedia y herramientas manuales de Spreadsheet.
- Confirmado que `migrateVehicleContributionsSchema` también se invoca internamente; `deleteInboxConversation` oculta por participante y conserva el historial.
- Clasificación provisional: aún falta rastrear terminal de desarrollador, documentación histórica y jobs/triggers. MIG-001 continúa EN PROGRESO.


### Terminal y triggers — revisión parcial 2026-11-23
- Documentados comandos manuales de la terminal Drive y su restricción al árbol Cortes; no se encontró comando de borrado en el dispatcher revisado.
- Escaneo estático de módulos principales sin declaraciones de triggers; alcance limitado a los archivos listados en §13.2. No se afirma ausencia global ni en deployments.
- Pendiente inspeccionar archivos de raíz/manifiestos y configuración de proyectos Apps Script para jobs/triggers instalados.


### Contratos AUTH — avance 2026-11-23
- Documentados payloads de negocio y contexto, respuestas/errores representativos, RBAC y hojas para las 15 acciones AUTH en §14 de la matriz.
- Preservadas como invariantes la respuesta genérica de recuperación, términos por dispositivo, revocación de sesiones, protección del último Desarrollador y migración de hashes heredados con dry-run/confirmación.
- Pendiente profundizar en objetos de perfil/sesión, columnas físicas y secuencias Coordinator. MIG-001 sigue EN PROGRESO.


### Contratos USERS y WRITE — avance 2026-11-23
- Documentados payloads, respuestas y RBAC de las 3 acciones USERS y 9 WRITE en §§15–16 de la matriz.
- Registrados campos permitidos de alta/perfil, secuencia de IDs, consultas, idempotencia, cortes, aportes suplementarios, VIN y congelación de fórmulas.
- Invariantes a conservar: checkOperation sin actor/lease, actor confiable para escrituras, ledgers append-only, hashes/opId, read-back, reintentos y separación del flujo YouTube.
- Pendiente mapa de columnas/rangos, errores exhaustivos y pruebas/efectos por acción. MIG-001 sigue EN PROGRESO.


### Pruebas locales USERS/WRITE — 2026-11-23
- `UsersAtomicMutations.js`: 16/16 PASS.
- `WriteAuthorizationContracts.js`: 10/10 PASS.
- `WriteAuthorizationMinimization.js`: 15/15 PASS.
- `AddSupplementaryInfoIntegrity.js`: 61/61 PASS.
- `VinAuthoritativeValidation.js`: 12/12 PASS.
- `CheckOperationSecurity.js`: 8/8 PASS.
- `ActionDispatchContract.js`: 12/12 PASS.
- Total: **134 aserciones PASS, 0 FAIL**. Solo pruebas locales sobre fuentes exactas; no se invocaron Apps Script, Spreadsheet ni Drive reales. No es validación Beta.



### MIG-001 — Mapa físico de hojas AUTH / USERS / WRITE — 2026-11-23

- Se confirmó mediante comparación GitHub que la rama de trabajo había avanzado 34 commits respecto del HEAD anterior registrado `9f1697e64015625c2e1abece4f131ad1e9b7b2a4`. El HEAD leído antes de esta actualización documental era `2a9c34a410ef7880f955615e745a5b338f7f2954`; no se asumió el SHA del checkpoint como HEAD actual.
- Se confirmó que la rama base `GPSpedia2.2.5` permanece idéntica a `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Se amplió `MATRIZ_MIGRACION_SERVICIOS.md` con §17: mapa de Users, ActiveSessions, Logs y Cortes; esquemas auxiliares de idempotencia, reservas de IDs, aportes, eventos de carga y configuración de secuencia de usuarios.
- Se detectó una diferencia de definición entre AUTH y USERS: ambos declaran Users A:I, pero AUTH define ActiveSessions A:G y USERS solo A:F. Debe conservarse G al unificar.
- Se documentaron VIN por encabezado dinámico, columnas AQ:AS sin campo declarado y AT:AV como posiciones obligatorias de indicadores de testigo.
- Se actualizaron también los registros de MIG-001 en `TAREAS_MIGRACION_ARQUITECTURA.md`.
- Evidencia basada en lectura del código fuente de la rama. No se consultó una Spreadsheet real ni se verificaron encabezados/datos de Beta/productivo. No se modificó código funcional, hojas, deployments, Drive ni datos.
- MIG-001 permanece **EN PROGRESO**. Siguiente tramo: inventariar esquemas y efectos de FEEDBACK, CATALOG, ADMIN y UTILITIES; completar Drive/APIs, triggers/jobs y pruebas por acción.
- Commits documentales de esta iteración: `5bc82a1875bae76d888585f3a045aee1000e127d` (matriz) y `b9796dc536eb721678db3893dda14c4eaf03ec0b` (registro de tareas). La actualización del checkpoint se publica a continuación.



### Aclaración VIN en MIG-001 — 2026-11-23

- La lectura completa de README.md identificó una referencia documental que no coincide con la implementación del índice: README describe VIN en AQ (43), con AR:AS libres; WRITE busca el encabezado `VIN` dinámicamente y no fija su posición en `COLS_CORTES`.
- Se añadió la diferencia a §17.8 de `MATRIZ_MIGRACION_SERVICIOS.md` y a `TAREAS_MIGRACION_ARQUITECTURA.md`. La posición real debe comprobarse contra la Spreadsheet y el flujo `renameVinColumnHeader`; no se modificaron columnas ni código.
- El README completo (202 líneas), NORMAS_DESAROLLO.md (secciones 1–17), contexto_personal.md, checkpoint.md, plan, tareas de migración, matriz y documentación Beta fueron consultados para esta continuidad.
- Commit adicional de matriz: `edf1b96fed3a5e5a9271a70c7475dde38386b48b`; commit adicional de tareas: `1fc84f1aa0edc63bdca20df6597920e421a46652`.



### MIG-001 — Inventario de esquemas y dependencias FEEDBACK / CATALOG / ADMIN / UTILITIES / Inbox — 2026-11-23

- Se amplió `MATRIZ_MIGRACION_SERVICIOS.md` con §18: tablas principales de FEEDBACK, mapas de CATALOG, PyS, tutoriales y eventos, tablas directas Inbox y diarios/hojas administrativas.
- Se registraron cinco hojas Inbox independientes y sus encabezados completos; se conserva la semántica de estado, archivado, flags por usuario y auditoría.
- Quedaron identificadas, pero aún sin esquema completo, `FeedbackLikes`, `FeedbackYearApplications`, `FeedbackYearApplicationEvents`, `AdminState` e `Imagenes_Reemplazadas`, además de hojas ADMIN creadas dinámicamente y el detalle de staging/backup de UTILITIES.
- Se constató que ADMIN conserva URLs de otros cinco servicios y wrappers `UrlFetchApp.fetch`; Coordinator mantiene propiedades para leases, sesiones/contexto, revisiones/eventos y tráfico; UTILITIES requiere el contexto confiable de Coordinator. Se documentó como inventario para MIG-003/MIG-004/MIG-011, sin modificar código ni configuración.
- La inspección fue estática sobre los archivos de la rama. No se accedió a Spreadsheet/Drive reales ni a proyectos Apps Script desplegados. No se ejecutaron pruebas remotas.
- Se actualizó `TAREAS_MIGRACION_ARQUITECTURA.md`; MIG-001 permanece **EN PROGRESO**.
- Commit de matriz: `c5230a86c3e7405b3d56457580aa4daf3472f8e3`. Commit de tareas: `79157ef09a1fbe5a9ab8ef0c0a089efbf7ab6a2e`.



### MIG-001 — Cierre de primera extracción de esquemas auxiliares — 2026-11-23

- Se completaron en §18.9 de la matriz los encabezados de `FeedbackLikes`, `FeedbackYearApplications` (A:P; M:P extensión), `FeedbackYearApplicationEvents`, `AdminState` e `Imagenes_Reemplazadas` (A:K histórico más 16 columnas añadidas por encabezado).
- Se contrastó el esquema de restauración de ADMIN con los escritores: ActiveSessions A:F frente a AUTH A:G; Cortes A:AP en el esquema de restauración frente a VIN dinámico y AT:AV de WRITE; Logs D aparece como `Data` en restauración y contiene detalles JSON desde AUTH. Son diferencias estáticas por validar con backups aislados; no se declara pérdida real ni se modifican datos.
- Se actualizó `TAREAS_MIGRACION_ARQUITECTURA.md`. MIG-001 sigue **EN PROGRESO**: aún falta relacionar hojas/rangos con acciones y pruebas concretas, revisar el flujo completo de backup/restore, inventariar todos los consumidores UI y procesos programados, y completar la revisión de APIs/Drive.
- No se invocaron Apps Script, Spreadsheet, Drive, YouTube ni OAuth reales; no se ejecutaron pruebas Beta. No se modificó código funcional ni datos.
- Commit de matriz: `f40208667cc94703d26ebeccff4e24a0458967dd`; commit de tareas: `1432cac205c48108cd7e05013ee2ac59f97a866d`.


---

## Cierre MIG-001 — inventario integral — 2026-11-23

### Estado Git antes de esta actualización
- Rama de trabajo: `GPSpedia2.2.5_work`.
- HEAD confirmado antes de iniciar esta tanda: `4e46b37bb5af7e9542aa472950040d0c90bdff5d`.
- Rama base: `GPSpedia2.2.5`, HEAD `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; la comparación confirma que la rama de trabajo no está detrás de la base y no se escribió en ella.
- El primer cambio de esta tanda fue documental, sobre la matriz; no hubo cambios funcionales.

### Resultado de MIG-001
Se completó el inventario estático integral y se marcó **COMPLETADA CON VALIDACIÓN DIFERIDA** en `TAREAS_MIGRACION_ARQUITECTURA.md`.

Evidencia consolidada en §19 de `MATRIZ_MIGRACION_SERVICIOS.md`:
- Árbol Git completo consultado: 615 rutas, sin truncamiento.
- Diez archivos backend inspeccionados, 1,041 declaraciones de funciones con nombre.
- 37 módulos frontend, tres superficies HTML, 373 entradas de pruebas y tres workflows.
- 120/121 acciones canónicas del mapa reconciliadas con servicio, dispatcher y handler; la compatibilidad CATALOG `getSuggestion` está diferenciada de la ruta canónica WRITE.
- 13 operaciones privadas de Coordinator y 8 endpoints privados de caché de actor identificados.
- Las 12 acciones sin consumidor directo fueron clasificadas por función y enlazadas a pruebas representativas. No se retiró ninguna.
- Completada la trazabilidad de consumidores, CAP-01 a CAP-19, RBAC, contratos de payload/respuesta, hojas/rangos, propiedades, estados operativos, Drive, YouTube, MailApp, terminal, backups/restauración, migraciones, rutas GET y procesos manuales.
- Se inventariaron las URLs e IDs incrustados, propiedades de configuración y estado, y las llamadas backend→backend que deben migrarse en tareas posteriores.
- Se comprobó que el repositorio no contiene `appsscript.json`, `.clasp.json` ni archivos `.gs`; `manifest.json` es el manifiesto PWA. No se encontraron declaraciones de triggers en los diez archivos backend y módulos frontend principales inspeccionados. No se puede deducir desde Git si hay triggers instalados en proyectos Apps Script externos.

### Pruebas y límites
- Se revisó `RunServiceTests.mjs`: ocho grupos de servicio, 270 archivos CLI únicos referenciados y 31 ejecuciones/assertions `recordResult`. El directorio contiene 373 entradas; no se afirmó que todas sean ejecutadas automáticamente.
- Las 247 aserciones y 12/12 de ActionDispatchContract registradas previamente siguen siendo evidencia histórica. No se reejecutaron en esta tanda; la edición actual fue documental/estática.
- No se invocaron Apps Script desplegados, Spreadsheet/Drive reales, OAuth, YouTube ni MailApp. No se comprobaron triggers instalados, scopes, propietarios ni permisos reales.
- Las validaciones que requieren proyectos desplegados, credenciales o recursos aislados se difieren a Beta y MIG-027/MIG-028. No impiden el cierre del inventario estático.
- No se modificó código funcional, endpoints, propiedades, deployments ni datos.

### Commits de esta tanda
- Matriz integral §19: `7672b7f4f2452f57f7f5642f7e3c1a880ee65ad4`.
- Estado de matriz actualizado: `27b5e723c636eabae92f882fcd55e721836a4f44`.
- MIG-001 cerrada en tareas: `7384ff1f3973e0ad8b1d67ece0eb0d3b19056dc0`.
- El checkpoint se actualiza en el commit siguiente.

### Continuidad
- MIG-001: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- Próxima tarea pendiente del backlog: **MIG-002 — Inventario de pantallas y capacidades visibles**. No iniciar MIG-002 dentro de este cierre; el usuario pidió completar MIG-001 y mantener una tarea por vez.
- MIG-003 y MIG-004 ya tienen hallazgos de entrada documentados en la matriz, pero permanecen pendientes como tareas separadas.


### Ajuste de consistencia del registro MIG-001 — 2026-11-23

- Se marcó como histórica la nota inicial del registro de tareas que todavía decía «MIG-001 EN PROGRESO». El estado vigente es el cierre integral de §19 de la matriz y el apartado de cierre de `TAREAS_MIGRACION_ARQUITECTURA.md`.
- Se comprobó que `JS/Tests/UtilitiesSecurity.js` existe y que el runner lo ejecuta dentro del grupo UTILITIES mediante `recordResult`; por tanto, la prueba asociada a `migrateTimestamps` queda correctamente referenciada.
- MIG-002 sigue siendo la siguiente tarea pendiente en el backlog, pero no se inicia en este ciclo.
- Commit adicional del registro de tareas: `5db23382802043f13ccb21c29f49c07730d03af5`.


---

## Cierre MIG-002 — inventario de pantallas y capacidades visibles — 2026-11-23

### Estado Git y límites
- HEAD al iniciar esta tarea: `4697204e6311f7b7de782103174ff946e99004a1` en `GPSpedia2.2.5_work`.
- HEAD confirmado antes de actualizar este checkpoint: `a22f317883377f6ca9aed745f7575d591e68a405`.
- Rama base protegida `GPSpedia2.2.5`: HEAD `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; comparación final previa al checkpoint: rama de trabajo ahead 7165 / behind 0. No se escribió en la rama base.
- Se consultaron NORMAS_DESAROLLO.md, README.md, contexto_personal.md, checkpoint, backlog, plan rector, tareas Beta, índice/lista Beta y adenda multimedia.

### Resultado
MIG-002 se marca **COMPLETADA CON VALIDACIÓN DIFERIDA** en `TAREAS_MIGRACION_ARQUITECTURA.md`.

Se añadió `INVENTARIO_PANTALLAS_CAPACIDADES.md`:
- 17 superficies UI documentadas.
- 335 declaraciones de controles, enlaces y formularios inspeccionadas en index.html, add_cortes.html, users.html y plantillas dinámicas ui.js/youtubeUpload.js.
- 37 módulos frontend, tres hojas CSS y 370 archivos de pruebas JS/MJS identificados.
- Trazabilidad de controles y grupos a handlers cliente, acciones backend/locales, permisos/roles y pruebas relacionadas.
- Estados de carga, vacío, éxito, error, progreso, reintento, cancelación, pausa y recuperación documentados según su implementación real.
- Se documentaron brechas de cobertura visual específica: las pruebas existentes son mayormente por flujo/contrato, no una prueba de clic individual para cada botón; About/FAQ/changelog y el flujo visual completo de Contacto tienen cobertura genérica/indirecta. No se presentaron como pruebas ejecutadas.
- Superficies relacionadas con BETA-01 a BETA-08; navegador/dispositivos reales, deployments y servicios externos quedan para Beta.

### Validación CI ejecutada
Para el commit `a22f317883377f6ca9aed745f7575d591e68a405`:
- Workflow `GPSpedia service regression tests`, run `45166613464`: **SUCCESS**.
- Runner Node.js: **305 suites, 3,572 pruebas aprobadas, 0 fallos de suite**.
- `RepositoryJavaScriptSyntax`: **437 archivos .js/.mjs** verificados sintácticamente.
- `RepositoryModuleReferences`: **347 archivos** inspeccionados; referencias relativas resueltas.
- El workflow verificó repositorio, rama autorizada y árbol limpio antes de ejecutar las suites.
- Workflow `GPSpedia deployed service health (read-only)`, run `45166613396`: **SUCCESS**, siete endpoints consultados por GET. Esta prueba solo confirma salud HTTP/contrato de endpoints; no es prueba de paridad visual ni validación completa Beta.
- No se ejecutó navegador real ni pruebas de campo/dispositivo para toda la UI. El flujo FileReader browser no se disparó porque no se modificó HTML/add_cortes ni sus archivos/workflow; la validación visual completa queda en BETA-08.

### Archivos y commits de esta tarea
- `INVENTARIO_PANTALLAS_CAPACIDADES.md`: creado en `dba5e6771a6c96d8aa65c1b78d5e2ef2c44d2c1a`; referencia de prueba corregida en `7fd4b8b1b270876a90bd2612e4343bab8b482eee`.
- `TAREAS_MIGRACION_ARQUITECTURA.md`: MIG-002 cerrada en `d4bb7eb87604d7f6d766d1e72e7e87dab15b853b`.
- `ChangesLogs.txt`: registro activo creado en `a22f317883377f6ca9aed745f7575d591e68a405`.
- Este checkpoint se actualiza en el commit siguiente.

### Integridad funcional
- No se modificaron archivos de aplicación HTML/CSS/JS, acciones, handlers, RBAC, endpoints, propiedades, Spreadsheet, Drive ni deployments.
- No se retiró ni ocultó ninguna capacidad.
- Las acciones sin consumidor directo previamente clasificadas en MIG-001 siguen conservadas; no se inventaron controles para exponerlas.

### Continuidad
- MIG-001: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- MIG-002: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- Siguiente tarea pendiente: **MIG-003 — Inventario de configuración en backend**. Su primer paso será rastrear PropertiesService/ScriptProperties/UserProperties/DocumentProperties y clasificar cada clave/constante sin eliminar ni migrar nada durante el inventario.


### Adenda final MIG-002 — completitud de controles dinámicos y validación final — 2026-11-23

- Se amplió el inventario para listar expresamente los formularios dinámicos add-cut-model, apertura, alimentación y vídeo que se abren desde la ficha del vehículo.
- Se realizó una comprobación estática de los IDs literales en todos los archivos con controles activos: index.html (131 IDs interactivos), HTML/add_cortes.html (27 IDs fijos más el ID dinámico derivado de match.id), HTML/users.html (15), JS/Frontend/ui.js (69) y JS/Frontend/youtubeUpload.js (8). Todos los IDs literales quedaron incluidos en INVENTARIO_PANTALLAS_CAPACIDADES.md; el ID variable de coincidencias quedó descrito por su origen.
- Se comprobaron 142 referencias a archivos del inventario; ninguna referencia quedó sin resolver en el árbol Git.
- CI tras la última ampliación del inventario, commit `fc144f5a7a8404f205172e113c97ba69bb99c53c`:
  - `GPSpedia service regression tests`, run `45166938911`: **SUCCESS**, 305 suites, 3,572 pruebas aprobadas y 0 fallos de suite.
  - `RepositoryJavaScriptSyntax`: 437 archivos JS/MJS verificados.
  - `RepositoryModuleReferences`: 347 archivos inspeccionados y referencias relativas resueltas.
  - `GPSpedia deployed service health (read-only)`, run `45166939043`: **SUCCESS**, siete endpoints consultados por GET. No equivale a validación de UI ni a pruebas Beta de escritura.
- Se actualizó `ChangesLogs.txt` con la adenda de controles dinámicos; commit `c54892370ddee02885897c143e51ba37d106adbf`.
- HEAD de trabajo antes de esta actualización: `c54892370ddee02885897c143e51ba37d106adbf`. La rama base sigue en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; comparación: ahead 7169 / behind 0.
- MIG-002 permanece **COMPLETADA CON VALIDACIÓN DIFERIDA**. No se modificó código funcional, servicios, endpoints, permisos, datos ni deployments.


---

## Cierre MIG-003 — inventario de configuración backend — 2026-11-23

### Estado Git al iniciar y publicar
- Rama: `GPSpedia2.2.5_work`.
- HEAD confirmado antes de la publicación: `28bdf2eca2b96fa33cde286478076274980fa5bd`.
- Rama base protegida: `GPSpedia2.2.5`, HEAD `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; comparación previa: ahead 7170 / behind 0.
- La normativa `NORMAS_DESAROLLO.md` fue revisada íntegramente; se consultaron README, contexto_personal, plan rector, matriz, backlog y continuidad.

### Resultado
MIG-003 queda **COMPLETADA CON VALIDACIÓN DIFERIDA**.

Se creó `INVENTARIO_CONFIGURACION_BACKEND.md` con:
- Diez módulos backend activos inspeccionados.
- Siete módulos con ScriptProperties; tres sin referencias.
- Cero usos identificados de UserProperties y DocumentProperties en los módulos revisados.
- 26 familias de claves persistentes, incluidas familias dinámicas.
- IDs de Spreadsheet/Drive, URLs de despliegue, parámetros, límites, secretos, OAuth, cachés y destinos propuestos en Spreadsheet.
- Clasificación separada de configuración, estado operativo, datos temporales, secretos de interconexión y contratos/protocolos que deben permanecer en código.
- Esquema de hojas propuesto y dependencias de bootstrap, seguridad y paridad.

### Límites de validación
- El repositorio no permite leer valores reales de PropertiesService en los proyectos Apps Script desplegados; no se afirma que se hayan enumerado propiedades huérfanas o valores manuales.
- No están versionados `appsscript.json`, `.clasp.json` ni archivos `.gs`. Los scopes, propietarios, identidad de ejecución y parámetros de Web App deben comprobarse en Beta.
- No se modificó código funcional, propiedades, endpoints, Spreadsheet, Drive ni deployments.
- No se crearon las hojas propuestas; su diseño/implementación depende de MIG-006 y MIG-007.
- El secreto HMAC de recuperación requiere diseño de almacenamiento protegido; no se trasladó a una hoja ordinaria.
- Las claves Coordinator/SharedMutation y secretos de interconexión se clasificaron para retiro con sus consumidores, no para copiar a Spreadsheet.

### Archivos actualizados
- `INVENTARIO_CONFIGURACION_BACKEND.md`: nuevo inventario.
- `TAREAS_MIGRACION_ARQUITECTURA.md`: MIG-003 cerrada.
- `MATRIZ_MIGRACION_SERVICIOS.md`: §20 enlaza el inventario y resume destinos.
- `ChangesLogs.txt`: registro factual de la tarea.
- Este checkpoint registra el cierre y la continuidad.

### Continuidad
- MIG-001: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- MIG-002: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- MIG-003: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- Siguiente tarea pendiente: **MIG-004 — Inventario de llamadas entre servicios y SharedMutation**. Identificar llamadas directas/indirectas, propietarios, consumidores, payloads, autenticación y reemplazo frontend; no eliminar todavía ningún endpoint ni cliente.


---

## Cierre MIG-004 — inventario de llamadas entre servicios y SharedMutation — 2026-11-23

### Estado y alcance
- HEAD verificado al cerrar la documentación: `5840e245c3bd8557e7cca6e37d63b8b80cc3eaaf` en `GPSpedia2.2.5_work`.
- Rama base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no se escribió en ella.
- Se leyeron las normas vigentes, README, contexto operativo, checkpoint, backlog, matriz de servicios, inventarios MIG-001/002/003 y documentación de despliegue/Coordinator pertinente.

### Resultado
MIG-004 queda documentada como **COMPLETADA CON VALIDACIÓN DIFERIDA** en `TAREAS_MIGRACION_ARQUITECTURA.md`.

Nuevo `INVENTARIO_LLAMADAS_SERVICIOS.md`:
- ADMIN→WRITE: asignación de ID y congelación de fórmulas.
- ADMIN→CATALOG: proyección de vehículo y candidatos de aportes.
- SharedMutationClient→Coordinator: las 13 operaciones del protocolo, consumidores, payloads y reemplazo.
- Coordinator→USERS/WRITE/FEEDBACK/ADMIN: precarga e invalidación de cachés de actor.
- Seis callsites activos de leases y un helper AUTH de mantenimiento sin consumidor versionado.
- Ocho endpoints privados de caché (dos en cada uno de los cuatro servicios).
- Feed incremental, sesiones/revocación, telemetría y operaciones protegidas.
- Clasificación separada de llamadas externas a Drive API, YouTube y URLs de imágenes.
- Reemplazos mediante frontend, límites de escritura por servicio y riesgos de colisión en Users/ActiveSessions, Cortes y Drive.
- Matriz de pruebas existentes y tareas de equivalencia para cada arista.

### Prueba de contrato agregada
- Se creó `JS/Tests/ServiceCallGraphContract.mjs`.
- Se registró en `JS/Tests/RunServiceTests.mjs`.
- La ejecución CI de esta prueba queda pendiente de consultar y documentar después de la publicación del checkpoint; no se presenta aún como aprobada.

### Archivos y commits
- `INVENTARIO_LLAMADAS_SERVICIOS.md`: `4cbce170ea3e4f8da8689c29aea1f2d92dee59f2`; corrección de conteo de leases: `394ab6e1a201d84362eef7c871935b407d828250`.
- `JS/Tests/ServiceCallGraphContract.mjs`: `fd13c1e31576ee6f9a779bfb766fdd77d9f3720c`.
- `JS/Tests/RunServiceTests.mjs`: `d096655d70708cc4acf40bd48fc1878f87e6392f`.
- `TAREAS_MIGRACION_ARQUITECTURA.md`: `06768d781e6454b094f50bf2fd384e618bcc399e`.
- `MATRIZ_MIGRACION_SERVICIOS.md`: `5ed74f05522b9d5073e3579e711da3c28090e1cc`.
- `ChangesLogs.txt`: `5840e245c3bd8557e7cca6e37d63b8b80cc3eaaf`.
- Este checkpoint se actualiza en el commit siguiente.

### Integridad
- No se retiraron llamadas, acciones, endpoints, propiedades, secretos, rutas de compatibilidad ni capacidades.
- No se modificó código funcional, RBAC, Spreadsheet, Drive ni deployments.
- Se identificaron explícitamente las colisiones de escritura que deben resolverse antes de retirar leases; no se simularon como resueltas.

### Continuidad
- MIG-001: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- MIG-002: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- MIG-003: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- MIG-004: **COMPLETADA CON VALIDACIÓN DIFERIDA**, pendiente de anexar el resultado CI del contrato agregado.
- Siguiente tarea: **MIG-005 — Línea base funcional y de rendimiento**. Ejecutar suite local y registrar mediciones reales solo donde exista entorno autorizado; no inventar métricas Beta.


### Adenda de validación MIG-004 — CI — 2026-11-23

La consulta de GitHub Actions confirmó la ejecución del runner con el nuevo contrato de grafo:

- Workflow `GPSpedia service regression tests`, run `45172002358`, commit `d096655d70708cc4acf40bd48fc1878f87e6392f`: **SUCCESS**.
- Resultado: **306 suites, 3,581 pruebas aprobadas, 0 fallos de suite**.
- Nueva prueba `ServiceCallGraphContract`: **9/9 PASS**.
- `RepositoryJavaScriptSyntax`: **438 archivos JS/MJS**, sintaxis aprobada.
- `RepositoryModuleReferences`: **348 archivos**, referencias relativas resueltas.
- Workflow `GPSpedia deployed service health (read-only)`, run `45172079545`: **SUCCESS**; los siete endpoints respondieron con estado/versión válidos mediante GET. Es una comprobación de disponibilidad, no prueba de paridad funcional ni despliegue del código fuente actual.
- No se ejecutaron pruebas de escritura sobre Spreadsheet/Drive, invalidación de cachés remota, cambios de sesión, OAuth ni YouTube en un entorno Beta aislado.

**Corrección de estado:** MIG-004 queda **COMPLETADA CON VALIDACIÓN DIFERIDA** con las pruebas locales/CI pertinentes aprobadas. Solo permanecen las validaciones externas de Beta y la equivalencia funcional de las sustituciones futuras; no se modificó ningún deployment.


---

## Cierre MIG-005 — línea base funcional y de rendimiento — 2026-11-23

### Estado Git y validación
- Rama de trabajo verificada: GPSpedia2.2.5_work.
- HEAD de referencia al iniciar la actualización: f20bc9934031adb63947e82e1e26b7a24ef4b0f1.
- Rama base protegida GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1; no se modificó.
- Workflow de regresión run 45172298195, commit f20bc9934031adb63947e82e1e26b7a24ef4b0f1: SUCCESS, 306 suites, 3,581 pruebas aprobadas y 0 fallos de suite.
- RepositoryJavaScriptSyntax: 438 archivos JS/MJS aprobados.
- RepositoryModuleReferences: 348 archivos inspeccionados; referencias relativas resueltas.
- Health read-only run 45172298206: SUCCESS, siete endpoints consultados por GET.

### Resultado MIG-005
- Se creó LINEA_BASE_MIGRACION_2026-11-23.md con resultados reproducibles, métricas de CI, contratos locales de rendimiento y matriz explícita de mediciones no disponibles.
- Se registra una duración aproximada de 30 segundos para el workflow CI completo (preparación, ejecución y limpieza). No se presenta como latencia de GPSpedia.
- Las pruebas de catálogo, miniaturas, caché, lecturas acotadas, lotes, locks y PBKDF2 aportan contratos/simulaciones; no equivalen a mediciones reales de servicios o navegador.
- Arranque/login, catálogo e Inbox de extremo a extremo, tamaño/tiempo de snapshot y deltas, carga real de imagen/vídeo, operaciones Drive, cachés, llamadas y lecturas/escrituras Spreadsheet quedan PENDIENTES DE VALIDACIÓN BETA por falta de navegador/sesión de prueba, OAuth y recursos aislados autorizados.
- No se inventaron métricas, no se modificó código funcional, endpoints, propiedades, Spreadsheet, Drive ni deployments.

**Resultado:** MIG-005 queda COMPLETADA CON VALIDACIÓN DIFERIDA. La línea base local de CI está registrada; las métricas reales de rendimiento deben obtenerse en Beta y compararse con esta referencia antes de aceptar la paridad de rendimiento.

### Continuidad
- MIG-001 a MIG-005: COMPLETADAS CON VALIDACIÓN DIFERIDA.
- Siguiente tarea pendiente: MIG-006 — Spike técnico de acceso a Spreadsheet, prioridad 1. Demostrar acceso al contenedor activo desde Web App sin ID/configuración local, mediante prueba reproducible de lectura/escritura en una hoja desechable; no modificar datos ni deployments reales sin autorización.


---

## Cierre MIG-006 — spike de acceso a Spreadsheet — 2026-11-23

### Resultado local
- HEAD de partida: 7b532a9e799b6ad72e9a02c2732b77d12158c6f2; rama de trabajo GPSpedia2.2.5_work. Rama base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin cambios.
- Se inspeccionaron los siete servicios que abren la Spreadsheet mediante SPREADSHEET_ID/openById; InboxConversations no realiza acceso directo.
- Se añadió JS/Tests/MIG006SpreadsheetAccessProbe.js: GET de solo lectura, UI Web App y POST con confirmación explícita que escribe únicamente A1:B1 de __MIG006_ACCESS_PROBE__.
- Se añadió JS/Tests/MIG006SpreadsheetAccessProbe.mjs y se integró al runner. La simulación local cubre contexto nulo/activo, UI, GET sin escritura, rechazo sin confirmación, escritura limitada y lectura posterior.
- Se documentó MIG006_SPREADSHEET_ACCESS_SPIKE.md con alternativas, límites, decisión condicional y procedimiento Beta.
- No se sustituyó openById() por getActiveSpreadsheet() en producción: el contexto activo Web App no está demostrado y puede ser null. No se almacenó un ID bootstrap, URL de otro servicio ni credencial.
- No se desplegó ni invocó Apps Script real; no se accedió ni modificó Spreadsheet, Drive, PropertiesService, endpoints ni datos productivos.

### Aclaración normativa del usuario — 2026-11-23
- La coordinación funcional de secuencias multi-servicio se hace desde frontend.
- Se permiten llamadas técnicas directas entre servicios cuando sean necesarias.
- Esas llamadas no requieren ni pueden exigir API keys, contraseñas, secretos compartidos o tokens manuales entre servidores.
- Las URLs no son secretos; no deben duplicarse como constantes/propiedades locales. El servicio receptor conserva la autorización de usuario/sesión y RBAC.
- Se actualizó NORMAS_DESAROLLO.md §17 y el plan de arquitectura. Las guías de Coordinator/despliegue antiguas quedaron marcadas como históricas y no ejecutables en lo relativo a secretos.

### Validación
- La suite MIG006SpreadsheetAccessProbe cubre cinco grupos de aserciones locales sobre el probe.
- La ejecución Web App real, la lectura/escritura con identidad equivalente al deployment, varios proyectos independientes, cuotas, concurrencia y latencia quedan pendientes de Beta.
- No se afirma que getActiveSpreadsheet() funcione en Web App ni que la consolidación resuelva el bootstrap.

**Resultado:** MIG-006 COMPLETADA CON VALIDACIÓN DIFERIDA. La decisión de arquitectura queda condicionada al resultado de la prueba Beta; no se altera el acceso actual ni se introduce bootstrap oculto.

### Continuidad
- Siguiente tarea: MIG-007 — Diseño del esquema central de configuración.
- Restricción transversal: coordinación funcional en frontend; llamadas técnicas directas permitidas sin secretos de interconexión; configuración no secreta centralizada; no exponer tokens OAuth al navegador.


---

## Cierre MIG-007 — diseño del esquema central de configuración — 2026-11-23

### Resultado
- MIG-007 queda **COMPLETADA** en alcance de diseño/documentación.
- Se creó ESQUEMA_CONFIGURACION_CENTRAL.md con seis tablas lógicas: Servicios, ConfiguracionParametros, ConfiguracionRecursos, ConfiguracionControl, ConfiguracionHistorial y ConfiguracionEsquema.
- Se definieron columnas/tipos, claves estables, scopes, visibilidad, defaults, validación estricta, versionado de esquema/valores/contrato, publicación por revisión íntegra, historial append-only y rollback como nueva revisión.
- Se documentó la limitación de Google Sheets: no hay ACL de lectura por pestaña. La Spreadsheet debe ser privada; la proyección pública se filtra en servidor. visibility no equivale a permisos de Drive.
- Se trazaron las 26 familias de ScriptProperties, los siete endpoints, las cinco URLs internas duplicadas de ADMIN, SPREADSHEET_ID y DRIVE_FOLDER_ID.
- Se excluyeron secretos de interconexión, tokens OAuth, contraseñas y secreto HMAC de recuperación del esquema ordinario. El HMAC requiere diseño protegido separado.
- Se definió caché inicial propuesta por clase, fail-closed para endpoints inválidos/vencidos y recuperación sin fallback a URLs locales.
- Se agregó JS/Tests/MIG007ConfigurationSchemaContract.mjs y se integró en RunServiceTests.mjs.
- Se actualizó INVENTARIO_CONFIGURACION_BACKEND.md §8, TAREAS_MIGRACION_ARQUITECTURA.md, MATRIZ_MIGRACION_SERVICIOS.md §21 y PLAN_NUEVA_ARQUITECTURA_FRONTEND.md.
- No se crearon hojas, no se migraron valores ni se accedió a PropertiesService real; no se modificaron endpoints, deployments, Spreadsheet, Drive ni datos.

### Validación y límites
- El contrato automatizado verifica la estructura del diseño, seis tablas, reglas de seguridad/versionado/caché y trazabilidad de 26 familias.
- La prueba Web App real de MIG-006 sigue pendiente de Beta; el lector/caché, la escritura atómica y la proyección pública se implementarán en MIG-008.
- No se afirma que la prueba externa esté realizada ni que el esquema se encuentre desplegado.

### Continuidad
- MIG-001 a MIG-006: COMPLETADAS CON VALIDACIÓN DIFERIDA.
- MIG-007: COMPLETADA (diseño).
- Siguiente tarea: **MIG-008 — Lector central y caché de configuración**, con dependencia explícita de resolver/validar acceso a Spreadsheet sin ID, URL o propiedad bootstrap local. No implementar un workaround local.


---

## Cierre MIG-008 — lector central y caché de configuración — 2026-11-23

### Resultado local
- HEAD de partida: `ad800fa71705c11b5524bb8cb4b61ed65eddff80`; rama de trabajo `GPSpedia2.2.5_work`. Rama base protegida: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Se creó `JS/Services/CentralConfigurationReader.js`: lectura exclusiva con `SpreadsheetApp.getActiveSpreadsheet()`, validación de revisión/esquema/servicios/parámetros/recursos, caché server-side y proyecciones pública/backend.
- Si el contexto activo es null, el lector falla cerrado. No existe fallback a `openById()`, ID local, URL bootstrap, PropertiesService ni HTTP entre servicios.
- AUTH incorpora la acción pública `getPublicConfiguration`. Solo expone los siete endpoints y parámetros visibility=public. No entrega IDs de Drive, parámetros backend/admin ni identidad.
- La proyección backend por servicio no devuelve el registro Servicios ni endpoint_url/URLs de otros servicios.
- Se creó `JS/Frontend/centralConfigurationCache.js`: cache-first, single-flight, TTL de 5 min, stale-if-error de parámetros públicos hasta 15 min, retirada de endpoints después de 5 min, invalidación y refresh.
- `api-config.js` agrega el action map AUTH y exporta load/refresh/invalidate; el router ordinario sigue usando el mapa actual hasta MIG-009.
- Se corrigió `ESQUEMA_CONFIGURACION_CENTRAL.md`: Servicios, ConfiguracionParametros y ConfiguracionRecursos requieren `config_revision`; sin ese campo no se podía cargar una publicación íntegra.
- Se añadió `MIG008_CONFIGURATION_READER_CACHE.md`, se actualizó el plan y el backlog, y se integraron dos suites al runner.
- No se crearon hojas, no se migraron valores, no se modificaron PropertiesService, endpoints productivos, deployments, Spreadsheet, Drive ni datos.

### Validación local
- `MIG008CentralConfigurationReader.mjs`: 8 grupos de pruebas previstos; incluye contexto ausente, proyecciones, revisión concurrente, validación de endpoints, caché y stale-if-error.
- `MIG008FrontendConfigurationCache.mjs`: 6 grupos; incluye single-flight, cache-first, expiración, stale limitado, invalidación y rechazo de endpoint no válido.
- `MIG007ConfigurationSchemaContract.mjs` amplía la comprobación de revisión por tabla.
- Las suites se integraron en `RunServiceTests.mjs`. La ejecución CI posterior al commit debe confirmar resultados.
- La prueba real de `getActiveSpreadsheet()`, CacheService, identidad de ejecución, permisos, concurrencia y latencia en Web App sigue pendiente de Beta; no se presenta como realizada.

### Restricciones conservadas
- No se añadieron secretos, API keys, contraseñas ni tokens manuales.
- No se añadió URL/ID de otro servicio, llamada UrlFetchApp entre servicios ni coordinación backend→backend.
- La coordinación funcional multi-servicio permanece en frontend; cada servicio conserva su autorización.
- El endpoint AUTH usa el mapa frontend existente como punto de entrada transitorio; no se duplicó su URL en Apps Script ni se añadió un segundo mapa. MIG-009 debe resolver la sustitución del registro completo sin bootstrap circular.
- Los servicios actuales conservan su acceso de datos existente hasta superar MIG-006 Beta.

**Resultado:** MIG-008 COMPLETADA CON VALIDACIÓN DIFERIDA.

### Continuidad
- MIG-001 a MIG-006: COMPLETADAS CON VALIDACIÓN DIFERIDA.
- MIG-007: COMPLETADA.
- MIG-008: COMPLETADA CON VALIDACIÓN DIFERIDA.
- Siguiente tarea: **MIG-009 — Router de acciones basado en configuración**, respetando el bootstrap y sin fallback a URLs locales vencidas/inválidas.


---

## Cierre MIG-009 — router frontend basado en configuración central — 2026-11-23

### Requisito técnico transversal registrado
- NORMAS_DESAROLLO.md §18 establece el requisito obligatorio para todas las tareas MIG-001 a MIG-030.
- Se añadió una referencia del requisito en cada una de las 30 tareas del backlog.
- No se permiten claves, tokens manuales ni secretos compartidos en propiedades Apps Script; los servicios backend no contienen URLs ni coordinación funcional de otros servicios; el frontend coordina cuando sea viable; las llamadas directas se reservan para necesidades técnicas y no usan secretos compartidos; cada receptor conserva su autorización/RBAC.
- Las URLs operativas se obtienen del registro central y se refrescan automáticamente; no hay fallback local ante configuración vencida/inválida/no disponible.

### Resultado local MIG-009
- Se retiró de JS/Frontend/api-config.js el mapa de siete URLs hardcodeadas.
- El router POST, los health checks y el feed incremental GET obtienen sus endpoints desde getPublicConfiguration y la proyección central de AUTH.
- El mapa acción → servicio se conserva como metadato sin URLs.
- Se mantiene un único localizador bootstrap AUTH para obtener el primer registro central; se usa solo para getPublicConfiguration y no como destino alternativo de acciones.
- La caché frontend conserva cache-first/single-flight y refresca al vencer su TTL. Si no hay snapshot enrutable, si un servicio está deshabilitado o si el endpoint no es válido, la solicitud falla cerrada y no usa URL local.
- Se adaptaron ServiceHealthContract.mjs y RemoteServiceHealth.mjs; la comprobación remota se ejecuta manualmente tras desplegar el handler de configuración central.
- Se agregó resolveCentralServiceEndpoint y la suite JS/Tests/MIG009FrontendActionRouter.mjs; se adaptó ActionDispatchContract.js y se integró MIG-009 en RunServiceTests.mjs.
- Se actualizó TAREAS_MIGRACION_ARQUITECTURA.md, PLAN_NUEVA_ARQUITECTURA_FRONTEND.md, NORMAS_DESAROLLO.md, ChangesLogs.txt y este checkpoint.

### Validación y límites
- Las pruebas nuevas cubren el mapa de 121 acciones, los siete servicios, actualización de revisión, endpoints deshabilitados/inválidos, vencimiento y ausencia de fallback local.
- CI sobre el commit funcional 1cf6f4a3011289531bd151ab1c9daa344eb73a0a: SUCCESS (run 45185426367); 312 suites, 3,626 pruebas aprobadas, 0 fallos; sintaxis 446 archivos y referencias de módulos 355 archivos.
- La prueba de navegador real que cambie un endpoint desde Spreadsheet y confirme la actualización automática, así como el acceso real de AUTH a Spreadsheet/CacheService, queda pendiente de Beta conforme a MIG-006/MIG-008. No se desplegó ni modificó ningún servicio.
- No se modificaron Apps Script, PropertiesService, deployments, endpoints instalados, Spreadsheet, Drive ni datos.

### Continuidad
- MIG-001 a MIG-008 conservan sus estados previos.
- MIG-009: COMPLETADA CON VALIDACIÓN DIFERIDA, sujeta a CI y con prueba remota de actualización pendiente de Beta.
- Siguiente tarea: MIG-010 — Orquestador frontend de operaciones multi-servicio.


### Resultado de validación final MIG-009
- Regresión: SUCCESS — https://github.com/infogpstech/GPSpedia/actions/runs/45185426367
- Suite MIG009FrontendActionRouter: 5/5 PASS; inventario verificado: 121 acciones y siete servicios.
- Sintaxis: 446 archivos .js/.mjs verificados.
- Referencias relativas: 355 archivos inspeccionados y resueltos.
- GitHub Pages build/deploy: SUCCESS — https://github.com/infogpstech/GPSpedia/actions/runs/45185424818
- Health check remoto de Apps Script: pendiente de Beta; requiere que el handler getPublicConfiguration esté desplegado y la configuración central esté publicada. No se ejecutó ni se modificó ningún deployment de Apps Script.
- Rama base protegida verificada sin cambios: d9acc68d889985c2e2f42fe3a02e502efc86ead1.

---

## Continuidad MIG-010 — 2026-11-23

### Estado Git verificado
- Repositorio: `infogpstech/GPSpedia`.
- Rama de trabajo: `GPSpedia2.2.5_work`.
- HEAD de código y registros verificado inmediatamente antes de actualizar este checkpoint: `8253b54968fdf41ee591c699e733ccc10859552b`.
- Rama base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; permanece sin modificaciones.
- Todos los cambios de esta continuación se realizaron en la rama de trabajo.

### Trabajo MIG-010 realizado
1. Se consolidó la secuencia de reorganización en frontend: ADMIN `backupDatabase` → WRITE `freezeCortesIds` → ADMIN `reorganizeDatabase`.
2. Se corrigió la recuperación de respaldo ante pérdida de respuesta: el navegador persiste operationId antes de la llamada; ADMIN lo vincula al usuario y al origen en el manifiesto privado, busca la copia previa, verifica su integridad y reutiliza el mismo backupId. Se rechaza también que la Spreadsheet de origen se presente como respaldo; el generador mantiene el formato válido incluso si la fuente aleatoria devuelve una cadena vacía. Se rechazan identificadores de otro usuario, manifiestos incompletos/ambiguos y respaldos movidos fuera de la raíz.
3. Se mantuvo el progreso por etapas, backupId y recuperación local por usuario. No se añadió un identificador de operación a las llamadas ordinarias de backupDatabase que no lo necesitan.
4. Las consultas de proyección y candidatos se realizan desde frontend hacia CATALOG. ADMIN no contiene wrappers ni destinos de coordinación hacia WRITE/CATALOG.
5. Se protegió `getVehicleProjection` con validación local de sesión para Desarrollador, Jefe y Supervisor; `getContributionCandidates` continúa limitado a Desarrollador. Las dos llamadas frontend envían el contexto de sesión y el backend aplica RBAC.
6. Se añadió `JS/Tests/MIG010FrontendServiceOrchestration.mjs` y se registró en `JS/Tests/RunServiceTests.mjs`.
7. Se actualizaron `TAREAS_MIGRACION_ARQUITECTURA.md`, `INVENTARIO_LLAMADAS_SERVICIOS.md` y `ChangesLogs.txt`.

### Validación realizada
- Suite MIG010FrontendServiceOrchestration: **58/58 PASS**.
- GitHub Actions Node.js 22: **SUCCESS**, run 45209447602; regresión completa **306 suites / 3,558 pruebas / 0 fallos**.
- GitHub Pages build/deploy: **SUCCESS**, run 45209445911.
- La verificación sintáctica integral de archivos JavaScript pasó dentro del workflow.
- La suite MIG-010 cubre secuencia, persistencia previa de operationId, creación/replay de respaldo, rechazo de replay por otro usuario, autorización por rol, expiración de sesión y ausencia de coordinación backend→backend.
- Se actualizaron contratos heredados de pruebas para reflejar la arquitectura actual frontend→servicio y la propiedad de las mutaciones en WRITE.
### Límites y pendientes
- MIG-010: **COMPLETADA CON VALIDACIÓN DIFERIDA**. GitHub Actions Node.js 22 aprobó la regresión completa: 306 suites, 3,558 pruebas, 0 fallos.
- Beta pendiente: llamadas reales frontend→ADMIN/CATALOG/WRITE, permisos y sesiones en Apps Script, acceso a Spreadsheet y recuperación con recursos aislados.
- No se desplegaron servicios Apps Script ni se modificaron endpoints instalados, PropertiesService, Spreadsheet, Drive o datos.
- MIG-011 permanece **PENDIENTE** y es la siguiente tarea; no se inició durante el cierre de MIG-010.

### Resultado final MIG-010 — 2026-11-23
- Estado: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- Workflow Node.js 22: SUCCESS — https://github.com/infogpstech/GPSpedia/actions/runs/45209447602.
- Regresión: **306 suites / 3,558 pruebas / 0 fallos**.
- Suite MIG010FrontendServiceOrchestration: **58/58 PASS**.
- GitHub Pages build/deploy: SUCCESS — https://github.com/infogpstech/GPSpedia/actions/runs/45209445911.
- Se actualizó el inventario para dejar explícito que ADMIN ya no coordina funcionalmente WRITE ni CATALOG; la secuencia y las consultas cubiertas se ejecutan desde frontend.
- Se actualizaron los contratos heredados de pruebas que aún esperaban wrappers ADMIN→WRITE/CATALOG y se trasladaron al propietario actual las pruebas de altas, VIN, encabezados testigo y vinculación de imágenes.
- WRITE reutiliza una sola lectura del encabezado para validar VIN/columnas testigo y pasa el índice VIN ya validado a las comprobaciones de duplicados.
- ADMIN devuelve el estado del journal de reemplazos de imágenes; frontend completa la proyección consultando CATALOG directamente, sin lectura de la fila materializada por ADMIN.
- Beta pendiente: invocaciones reales frontend→ADMIN/CATALOG/WRITE, sesiones/roles efectivos y permisos de Spreadsheet/Drive en recursos aislados.
- No se desplegaron Apps Script ni se modificaron deployments, endpoints instalados, PropertiesService, Spreadsheet, Drive o datos externos.
- Rama base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1; no se modificó.

## Cierre MIG-011 — 2026-11-23

### Estado Git de partida
- Repositorio: infogpstech/GPSpedia.
- Rama autorizada: GPSpedia2.2.5_work.
- HEAD confirmado antes de esta actualización: 5ec2ac01750bffa4052f248cad1bf6d4fd71ddae.
- Rama base protegida GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1; no se modificó.

### Resultado de análisis
- MIG-010 ya retiró las llamadas funcionales ADMIN→WRITE y ADMIN→CATALOG; esta tarea verifica los cinco criterios y formaliza la aceptación.
- ADMIN no contiene destinos Apps Script ni wrappers funcionales hacia AUTH, WRITE o CATALOG.
- El frontend enruta proyección/candidatos a CATALOG y asignación/congelación de IDs a WRITE; se mantienen las secuencias de backup y reorganización en frontend.
- CATALOG aplica validación local de sesión/RBAC; ADMIN y WRITE conservan las precondiciones de sus mutaciones.
- Las llamadas HTTP externas de ADMIN a Drive API y recursos de imagen se preservan.
- No se modificó código funcional, endpoints, propiedades, deployments, Spreadsheet, Drive ni datos.

### Validación local y resultados
- GitHub Actions Node.js 22: SUCCESS — run 45212028964.
- Regresión completa: 306 suites / 3,558 pruebas / 0 fallos.
- MIG010FrontendServiceOrchestration: 58/58 PASS; ServiceCallGraphContract: 9/9 PASS.
- AdminVehicleTargetedCatalogRead: 3/3; AdminVehicleContributionCandidates: 12/12; AdminCandidateImageInventoryCatalogSource: 4/4.
- AdminVehicleIdAllocationIdempotency: 1/1; VehicleIdAllocationEndToEnd: 1/1; WriteFreezeCortesIdsBackupOutsideLock: 5/5.
- Comprobación sintáctica del workflow: SUCCESS.
- GitHub Pages build/deploy: SUCCESS — run 45212025471.
- Diff del commit de verificación limitado a ChangesLogs.txt, INVENTARIO_LLAMADAS_SERVICIOS.md, TAREAS_MIGRACION_ARQUITECTURA.md y checkpoint.md; no hubo cambios funcionales.
- La validación real de endpoints Apps Script, sesiones/roles efectivos y permisos sobre Spreadsheet/Drive aislados permanece pendiente de Beta. No se desplegaron servicios ni se modificaron datos externos.

### Resultado
- MIG-011: COMPLETADA CON VALIDACIÓN DIFERIDA.
- No quedan dependencias funcionales ADMIN→WRITE ni ADMIN→CATALOG. Las integraciones externas de Drive e imágenes se conservan.

### Próximo paso exacto
1. Iniciar MIG-012 — unificación funcional AUTH/USERS, según su prioridad y dependencias.
2. Mantener las validaciones reales de Beta de MIG-010/MIG-011 como pendientes independientes; no marcarlas como ejecutadas.

