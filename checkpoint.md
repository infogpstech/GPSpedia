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



---

## Continuidad MIG-012 — implementación publicada para regresión — 2026-11-23

### Estado Git de partida
- Repositorio: `infogpstech/GPSpedia`.
- Rama de trabajo: `GPSpedia2.2.5_work`.
- HEAD de partida: `3b29b97c4d5ed8c1ce216fdd68f84feaf8acd64c`.
- Rama base protegida: `GPSpedia2.2.5` en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no se modifica.

### Implementación MIG-012
- `getUsers`, `createUser` y `updateProfile` ya están integradas en `JS/Services/Auth.js`, con dispatcher AUTH y actor cacheado local.
- Las tres acciones se enrutan a AUTH desde frontend. USERS ya no es destino de endpoint ni servicio de salud.
- Se conserva el esquema de Users/ActiveSessions, roles jerárquicos, hash PBKDF2, generación secuencial de IDs, atomicidad, rollback y edición exclusiva del perfil propio.
- `createUser` usa el ScriptLock local de AUTH; no necesita lease Coordinator para competir con `deleteUser`, que usa el mismo lock local.
- Coordinator ya no tiene política/allowlist de servicio USERS ni precarga/invalidez de caché hacia ese proyecto. Los destinos restantes de caché son WRITE, FEEDBACK y ADMIN.
- Se retiraron `JS/Services/users.js` y `JS/Tests/users.js` después de trasladar los tests al grupo AUTH.
- Harness aislado: 15/15 PASS. Sintaxis del archivo AUTH: PASS.

### Validación pendiente antes del cierre
1. Revisar el diff/HEAD y el workflow de regresión Node.js 22 posterior al commit.
2. Corregir cualquier regresión detectada y repetir CI hasta obtener SUCCESS.
3. Solo entonces marcar MIG-012 COMPLETADA CON VALIDACIÓN DIFERIDA y registrar los runs.
4. Mantener pendiente Beta real: deployment AUTH, sesiones/roles efectivos, hojas/recursos aislados y deshabilitación del deployment/fila heredada USERS. No modificar esos recursos desde este commit.

### Siguiente paso exacto
Confirmar la regresión completa; si aprueba, cerrar MIG-012 y continuar MIG-013 — sesiones sin Coordinator ni secretos compartidos.


---

## Cierre MIG-012 — código y regresión aprobados; Beta diferida — 2026-11-23

### Estado Git verificado
- Repositorio: `infogpstech/GPSpedia`.
- Rama de trabajo: `GPSpedia2.2.5_work`.
- HEAD: `89a8b60b872e97ab81086fd9d685b07186ca3c66`.
- Rama base protegida: `GPSpedia2.2.5` — `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no se modificó.

### Resultado MIG-012
- Gestión de usuarios integrada en AUTH: `getUsers`, `createUser`, `updateProfile`.
- USERS retirado de los seis destinos de servicio activos, frontend, health, telemetría, Coordinator, fan-out de caché y configuración central pública.
- `CentralConfigurationReader.js` y `centralConfigurationCache.js` requieren seis servicios y omiten la fila histórica USERS durante el periodo previo al cutover Beta.
- Se conserva la hoja Users/ActiveSessions, RBAC, hash PBKDF2, secuencia de IDs, bloqueo local compartido para altas/bajas, atomicidad y rollback.
- Harness aislado de mutaciones: 15/15 PASS.

### CI y pruebas
- GitHub Actions Node.js 22: SUCCESS — run `45222509966`.
- Regresión: 305 suites, 3,554 pruebas aprobadas, 0 fallos.
- Sintaxis: 445 archivos .js/.mjs PASS.
- Referencias de módulos: 347 archivos inspeccionados, PASS.
- GitHub Pages build/deploy: SUCCESS — run `45222508791`.

### Pendiente exclusivamente de Beta
- Desplegar AUTH en entorno aislado y comprobar endpoint real.
- Verificar sesiones, roles, permisos de Spreadsheet y operaciones de altas/perfiles/bajas.
- Confirmar que no existen consumidores externos del deployment USERS.
- Solo después de esas comprobaciones, deshabilitar el deployment histórico y retirar su fila del registro central. No se modificaron deployments, propiedades, hojas, Drive ni datos externos en esta tarea.

### Estado y siguiente paso
- MIG-012: COMPLETADA EN CÓDIGO, con cutover remoto diferido a Beta.
- No iniciar MIG-013 en este cierre; queda como siguiente tarea pendiente según prioridad: sesiones sin Coordinator ni secretos compartidos.


---

## Cierre MIG-013 — implementación y cobertura de sesión local — 2026-11-23

### Estado Git
- Repositorio: `infogpstech/GPSpedia`.
- Rama de trabajo: `GPSpedia2.2.5_work`.
- Rama base protegida: `GPSpedia2.2.5`; no se modifica.
- Último commit documental previo a este checkpoint: `3ef2eebdfba57b166a735ecf0a78508f60868ba0`.

### Resultado técnico
- AUTH mantiene login, hash PBKDF2 actual, bloqueo temporal de cinco intentos fallidos durante 15 minutos y tokens opacos generados en servidor.
- Users/ActiveSessions sigue siendo la fuente autoritativa de identidad, rol, token y actividad.
- AUTH, WRITE, FEEDBACK, ADMIN y UTILITIES usan el loader común de actor con caché local del proyecto. CATALOG conserva loader y caché locales equivalentes.
- Cache miss comprueba token único, correspondencia de userId, vigencia, fechas, usuario único/activo, rol permitido y revocación pendiente. El rol procede de Users, no del navegador.
- Cache hit evita nuevas lecturas de Spreadsheet y llamadas entre servicios. La caché utiliza clave SHA-256(userId/token) y TTL máximo de 21,600 segundos.
- Ninguna ruta ordinaria de login, carga de actor, validación de sesión o comprobación de capacidad usa Coordinator ni adquiere leases SharedMutation. Las coordinaciones no relacionadas con sesión se mantienen.
- La invalidación local no requiere secreto compartido. La coordinación frontend de invalidación entre servicios, revocación y recuperación ante indisponibilidad corresponde a MIG-014.

### Pruebas añadidas/ampliadas
- `JS/Tests/MIG013SessionActorLocalLookup.mjs`: loader común y CATALOG, caché fría/caliente, TTL, clave hasheada, identidad, sesión desconocida/revocada/expirada, usuario eliminado, cambio de rol tras invalidación y ausencia de API de sesión Coordinator en servicios protegidos.
- `JS/Tests/SessionActivityCoordination.mjs`: AUTH, loaders locales, RBAC, ausencia de llamadas de sesión Coordinator y endpoints locales de invalidación.
- `JS/Tests/SessionActivityLeaseMinimization.mjs`: ausencia de leases en rutas ordinarias y conservación de leases de mantenimiento ajenas a sesión.
- `JS/Tests/CoordinatorCapabilityPreservation.mjs`: preservación de RBAC, eliminación de cuenta y operaciones de coordinación fuera del flujo ordinario.

### Archivos actualizados
- `JS/Tests/MIG013SessionActorLocalLookup.mjs`
- `TAREAS_MIGRACION_ARQUITECTURA.md`
- `INVENTARIO_LLAMADAS_SERVICIOS.md`
- `MATRIZ_MIGRACION_SERVICIOS.md`
- `ChangesLogs.txt`
- `Tareas_Beta.md`
- `checkpoint.md`

### Validación pendiente
- Confirmar el resultado de GitHub Actions Node.js 22 para el commit de esta tarea y corregir cualquier regresión.
- Probar deployments AUTH y consumidores con Spreadsheet aislada en Beta: login, expiración, revocación, cambio de rol, eliminación, cache miss/hit y permisos RBAC reales.
- No se modificaron endpoints, propiedades Apps Script, deployments, Spreadsheet, Drive ni datos externos.

### Estado y siguiente paso
- MIG-013: implementación de código completada; cierre sujeto a regresión CI.
- Siguiente tarea de código: MIG-014 — revocación y limpieza de caché desde frontend.


---

## Cierre final MIG-013 — COMPLETADA CON VALIDACIÓN DIFERIDA — 2026-11-23

### Validación local ejecutada
- `MIG013SessionActorLocalLookup.mjs`: 21/21 PASS.
- `SessionActivityCoordination.mjs`: 9/9 PASS.
- `SessionActivityLeaseMinimization.mjs`: 6/6 PASS.
- `AuthSessionReadOptimization.mjs`: 9/9 PASS.
- Total: 45/45 aserciones dirigidas aprobadas en harness V8 aislado con Spreadsheet y Cache simuladas.
- Se comprobó que el test MIG-013 y los contratos de sesión pueden ejecutarse con las fuentes actuales de la rama; no se presentaron las simulaciones como llamadas Apps Script reales.

### Criterios de aceptación
- Login mantiene hash PBKDF2, bloqueo temporal de cinco intentos durante 15 minutos y token opaco generado en servidor.
- AUTH es autoridad de Users/ActiveSessions; los servicios no confían en el rol del navegador.
- AUTH, WRITE, FEEDBACK, ADMIN y UTILITIES usan caché local del actor; CATALOG tiene loader/caché local equivalente.
- Cache miss valida identidad, token único, vigencia, usuario activo, rol y revocación pendiente; cache hit no hace lecturas de Spreadsheet por acción.
- TTL máximo seis horas y clave de caché derivada por SHA-256(userId/token).
- El flujo ordinario de sesión no llama a Coordinator ni adquiere leases SharedMutation. Se conservan leases y coordinaciones que pertenecen a otras funciones.
- La invalidación local no necesita secretos compartidos. La orquestación frontend de invalidación entre servicios queda en MIG-014.

### Cambios funcionales y límites
- No fue necesario modificar lógica backend de sesión: la implementación local ya existía y cumplía los criterios; se amplió y ejecutó su cobertura de regresión para AUTH y CATALOG.
- Se actualizaron TAREAS_MIGRACION_ARQUITECTURA.md, INVENTARIO_LLAMADAS_SERVICIOS.md, MATRIZ_MIGRACION_SERVICIOS.md, ChangesLogs.txt, Tareas_Beta.md y este checkpoint.
- No se modificaron endpoints, propiedades Apps Script, deployments, Spreadsheet, Drive ni datos externos.

### Validación Beta pendiente
- Desplegar AUTH y servicios consumidores en entorno aislado.
- Probar login, intentos fallidos, token opaco, sesión fría/caliente, expiración, revocación, cambio de rol, usuario eliminado y permisos RBAC efectivos.
- Confirmar logout y limpieza entre servicios conforme a MIG-014, incluidos errores/reintentos cuando un servicio no esté disponible.
- Las pruebas locales no sustituyen las llamadas reales a Apps Script/Spreadsheet.

### Estado final
- MIG-013: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- Próxima tarea: MIG-014 — revocación y limpieza de caché desde frontend.
- HEAD antes de este cierre documental: `306df706da975accd044cbb7f44414b5bb8d26e0`.


### Verificación final de registro MIG-013
- El backlog queda normalizado con estado **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- Los resultados locales dirigidos son 21/21 + 9/9 + 6/6 + 9/9 = **45/45 PASS**.
- HEAD de la rama de trabajo antes de este apunte: `5450f039111ffda02d441b51cff00d8617d05739`.
- La rama base protegida conserva `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- Próxima tarea pendiente: MIG-014. No se inicia dentro del cierre de MIG-013.


---

## Continuidad MIG-014 — 2026-11-23

### Verificación de rama y CI
- Rama de trabajo: GPSpedia2.2.5_work; HEAD verificado: 9a13003407cc568e0381089b27f833b85dd16cc3.
- Rama base protegida GPSpedia2.2.5: no se realizaron escrituras en ella.
- Workflow Node.js 22 del commit 9a13003407cc568e0381089b27f833b85dd16cc3: run 45231811060, resultado global FAILURE. Verificación de rama y sintaxis PASS.
- Suites dirigidas MIG-014: SessionInvalidationFlow 15/15; fan-out seis servicios/reintento/fallo parcial/TTL PASS; contrato backend/cache 10/10; SessionActorCacheInvalidation 6/6.
- Regresión global: 1,200 pruebas aprobadas y cuatro suites fallidas de ADMIN, UTILITIES, AUTH e INTEGRATION. Quedan pendientes de análisis separado; no se afirma causalidad con MIG-014.

### MIG-014 — resultado
- El frontend coordina invalidación local de caché en AUTH, WRITE, CATALOG, FEEDBACK, ADMIN y UTILITIES.
- AUTH adjunta referencias SHA-256 de claves de caché revocadas; las referencias no contienen tokens legibles. CATALOG utiliza su espacio de claves separado.
- Los receptores exponen invalidación local y no llaman a otros servicios. No se agregaron secretos compartidos, URLs de otros servicios ni propiedades operativas Apps Script.
- Fan-out concurrente, dos intentos por destino, estado parcial y aviso visible si algún servicio no confirma.
- TTL máximo de actor: 21,600 segundos (seis horas).
- MIG-014: COMPLETADA CON VALIDACIÓN DIFERIDA (código y pruebas dirigidas aprobados; CI global parcialmente fallido; Beta real pendiente).

### Límites y tareas pendientes
- No se invocaron deployments Apps Script ni recursos Spreadsheet/Drive reales. La validación Beta debe comprobar logout, cambio/reset de contraseña, cambio de rol, reset global, eliminación, permisos y limpieza en proyectos independientes.
- Analizar y resolver las cuatro suites fallidas del run 45231811060 en sus grupos correspondientes.
- Próxima tarea: MIG-015 — carga y administración de imágenes. Antes de iniciar, releer la sección MIG-015 y sus dependencias en el backlog; trabajar una sola tarea a la vez.


---

## Continuidad MIG-015 — 2026-11-23 (implementación inicial)

### Estado Git y alcance
- Rama de trabajo: GPSpedia2.2.5_work. Rama base protegida: GPSpedia2.2.5; no modificar.
- Se continúa desde el HEAD documental MIG-014. La tarea vigente es MIG-015 — carga y administración de imágenes.
- Se inspeccionaron los flujos de ADMIN, WRITE y FEEDBACK, el router frontend, el lector central de configuración y las suites de carga, journal, recuperación, inventario y papelera.

### Cambios preparados en esta iteración
- ADMIN, WRITE y FEEDBACK pasan a usar SpreadsheetApp.getActiveSpreadsheet() y fallan cerrados si el proyecto no está vinculado a una Spreadsheet.
- Los tres servicios obtienen cortes_root_folder_id mediante getCentralConfigurationForService_ y verifican configuración fresca, tipo de recurso, nombre y padre. Se eliminan las constantes locales SPREADSHEET_ID y DRIVE_FOLDER_ID de esos tres módulos.
- ADMIN ya no conserva GPSpedia_UNUSED_IMAGES_FOLDER_ID; Imagenes_Sin_Uso se localiza bajo la raíz Cortes verificada, se detectan duplicados y su creación usa exclusión breve.
- Se añadió MIG015ImageConfigurationContract.mjs y un grupo independiente --only=MIG015 en el runner para ejecutar las pruebas de imágenes aunque una suite ajena de ADMIN falle antes.
- Se documentó el recurso requerido y las condiciones de despliegue Beta; no se tocaron deployments, propiedades ni datos externos.

### Validación
- No hay ejecución local disponible en este entorno; el clon Git local no pudo resolver github.com. Se usará GitHub Actions tras publicar el commit para ejecutar sintaxis y pruebas.
- La última regresión conocida del HEAD previo tuvo 1,200 pruebas aprobadas y cuatro fallos de suite ajenos a los contratos específicos de imagen (ADMIN candidatos, UTILITIES, AUTH e INTEGRATION). No se atribuyen a MIG-015.
- Estado MIG-015: EN PROGRESO, pendiente CI de la suite dedicada y revisión del diff.

### Beta pendiente
- Incluir CentralConfigurationReader.js en ADMIN, WRITE y FEEDBACK.
- Vincular cada proyecto a la Spreadsheet Beta y publicar cortes_root_folder_id para el Drive Beta.
- Ejecutar pruebas reales de cargas, reemplazos, adjuntos, PyS, inventario, papelera, restauración y eliminación con recursos aislados.


---

## Cierre MIG-015 — COMPLETADA CON VALIDACIÓN DIFERIDA — 2026-11-23

### Rama y commit
- Repositorio: infogpstech/GPSpedia.
- Rama de trabajo: GPSpedia2.2.5_work. Rama base protegida GPSpedia2.2.5: sin escrituras.
- HEAD registrado para validación: `7ff8315dbb42132903e4f288f4b013c463ec118d`.

### Implementación
- ADMIN, WRITE y FEEDBACK usan SpreadsheetApp.getActiveSpreadsheet() y fallan cerrados si no existe Spreadsheet vinculada.
- Los tres servicios obtienen `cortes_root_folder_id` del lector central y verifican configuración no vencida, tipo `drive_folder`, ID, nombre y padre.
- Eliminados IDs locales SPREADSHEET_ID/DRIVE_FOLDER_ID de esos tres módulos. ADMIN elimina GPSpedia_UNUSED_IMAGES_FOLDER_ID de ScriptProperties; Imagenes_Sin_Uso se resuelve bajo Cortes y se detectan duplicados.
- Se preservan límites por flujo: 10 MB ADMIN/WRITE y 3 MB FEEDBACK/PyS; validación MIME/firma, hash SHA-256, ledger/journal, idempotencia, compensación, recuperación y reconciliación.
- Se preservan variantes 300/800/1600, transparencia PNG, ObjectURL, IndexedDB/Lightbox, reemplazo, inventario, papelera, restauración y eliminación definitiva.
- No se agregaron secretos compartidos ni URLs/configuración local de otros servicios Apps Script. No se movió orquestación funcional al backend.

### Validación CI
- GitHub Actions Node.js 22, run 45236342364, commit `7ff8315dbb42132903e4f288f4b013c463ec118d`.
- Suites dedicadas MIG-015: **605/605 comprobaciones PASS**.
- Regresión global: 157 suites, 1,909 pruebas aprobadas y cuatro suites fallidas en P4 (política de roles), UTILITIES, AUTH e INTEGRATION. Estas familias de fallos ya estaban presentes antes de MIG-015; quedan registradas fuera de su alcance.
- No se ejecutaron llamadas reales a Apps Script, Spreadsheet ni Drive.

### Validación Beta pendiente
- Añadir CentralConfigurationReader.js a los proyectos desplegados ADMIN, WRITE y FEEDBACK.
- Vincular cada proyecto con su Spreadsheet aislada y publicar `cortes_root_folder_id` para la raíz Drive Cortes de Beta.
- Verificar permisos heredados, lectura/escritura y todos los ciclos de carga, reemplazo, adjuntos, PyS, inventario, papelera, restauración, reconciliación y eliminación con recursos aislados.

### Estado y continuidad
- MIG-015: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- Deuda de regresión global pendiente: suites ADMIN candidatos, UTILITIES, AUTH e INTEGRATION; no atribuidas a MIG-015.
- Próxima tarea: MIG-016 — carga reanudable y aprobación de vídeos. No iniciar otra tarea hasta que el cierre documental de MIG-015 quede registrado.


---

## Actualización final de continuidad MIG-015 — 2026-11-23

### Estado remoto verificado
- HEAD actual de GPSpedia2.2.5_work: 3a6673d9136f610d4c7c6f8e91d895974fed9f6c.
- Último commit con cambios de código/pruebas MIG-015: 7ff8315dbb42132903e4f288f4b013c463ec118d. Los commits posteriores son actualizaciones documentales de cierre.
- HEAD de GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1; comparación confirma base no modificada y rama de trabajo sin commits detrás.
- El último cambio de código corrigió el fixture de ADMIN candidatos para proporcionar CacheService/Utilities simulados; el fallo de ese test quedó resuelto.

### Evidencia final de CI
- GitHub Actions Node.js 22, run 45236342364, commit 7ff8315dbb42132903e4f288f4b013c463ec118d.
- Grupo dedicado MIG-015: 52 resúmenes, **605/605 pruebas PASS**, sin fallos en el grupo.
- Regresión global: 167 suites, 1,909 pruebas aprobadas y cuatro fallos de suite: ADMIN P4 política de roles, UTILITIES Spreadsheet simulado, AUTH purga de Logs e INTEGRATION BETA-043. No son fallos del grupo MIG-015; se mantienen como deuda de regresión general.
- Pages build run 45235833828 para commit 96cfbdae76e0df41c98ca39282b4bdede57cf72c: SUCCESS. Los builds de commits documentales/pruebas posteriores fueron cancelados por pushes siguientes; no se modificó frontend productivo después del commit 96cf.

### Cierre
- MIG-015: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- No se invocaron proyectos Apps Script, Spreadsheet ni Drive reales. La configuración central cortes_root_folder_id, vínculo de los proyectos y permisos Drive quedan pendientes de Beta aislada.
- Siguiente tarea autorizada por prioridad: **MIG-016 — carga reanudable y aprobación de vídeos**. MIG-015 queda cerrada; continuar una tarea a la vez.


---

## Cierre MIG-016 — COMPLETADA CON VALIDACIÓN DIFERIDA — 2026-11-23

### Rama y commit
- Repositorio: infogpstech/GPSpedia.
- Rama de trabajo: GPSpedia2.2.5_work. Rama base protegida GPSpedia2.2.5: sin escrituras; HEAD base verificado `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- HEAD de trabajo al cierre documental: `8859d00126708795ad7107f674d0d41e8f17056c`.

### Implementación
- Reserva idempotente de init YouTube por opVideoId + SHA-256 de la solicitud y unicidad por destino, protegida con LockService local de FEEDBACK.
- YouTubeUploadReservations almacena solo IDs, hash, estado y timestamps. CacheService conserva URL temporal por 6 h; no se guarda OAuth token ni URL temporal en Spreadsheet, ScriptProperties o logs.
- Reserva operativa de 8 días, bloqueo de duplicados entre pestañas, recuperación de URL desde CacheService y fallo cerrado si la caché se pierde para una reserva inicializada.
- Renovación exige URL oficial de sesión y reserva previa. El frontend solo intenta renovar ante HTTP 404/410; el backend rechaza URL ausente/ajena y no crea una reserva nueva como parte de una renovación.
- Transferencia directa por bloques de 8 MB con Content-Range, 308/Range, checkpoints IndexedDB y recuperación de estados new/uploading/paused/interrupted/uploaded.
- YouTube recibe privacidad unlisted, categoría 28, audiencia no infantil, embebible y estadísticas públicas desactivadas. El ID real y la URL canónica se verifican antes de crear la solicitud.
- FEEDBACK valida actor, propietario y permisos; aprobación/rechazo se registra con VideoApprovalEvents append-only y la publicación al destino solo ocurre después de aprobación. Se mantienen reproductores de PyS/tutorial y el modal protege el XHR durante cierre/pausa.

### Validación CI
- GitHub Actions Node.js 22 run `45238221817`, commit `8859d00126708795ad7107f674d0d41e8f17056c`.
- **223/223 comprobaciones específicas de vídeo PASS**: aprobación/publicación/rechazo, RBAC, init, renovación, IndexedDB, checkpoints, pausas, recuperación, overlays, XSS y reproducción.
- Regresión global: 167 suites, 1,912 pruebas aprobadas y cuatro suites fallidas en P4 (política de roles), UTILITIES, AUTH e INTEGRATION. No son fallos del conjunto de vídeo; permanecen como deuda global independiente.
- GitHub Pages build/deploy del commit funcional `8859d00126708795ad7107f674d0d41e8f17056c`: run `45238220816` — SUCCESS.
- No se ejecutaron llamadas reales a YouTube ni deployments Apps Script.

### Validación Beta pendiente
- Scopes y consentimiento OAuth reales de YouTube Data API en FEEDBACK y cuenta/canal autorizado.
- Hoja YouTubeUploadReservations, LockService y CacheService reales, incluido TTL y expiración.
- Subida de vídeo de prueba, respuesta 308/Range, pausa/cierre, recarga/reanudación y expiración/renovación HTTP 404/410.
- Aprobación/rechazo con roles reales, publicación solo después de aprobación en Corte, PyS y Tutorial, y reproducción móvil/escritorio.
- Auditoría de logs, hojas y ScriptProperties para confirmar ausencia de token OAuth y URL temporal.

### Estado y continuidad
- MIG-016: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- Próxima tarea: MIG-017 — Herramientas y operaciones de Drive. No iniciar otra tarea hasta registrar el cierre documental de MIG-016.


---

## Continuidad MIG-017 y MIG-018 — 2026-11-23

### Rama y límites
- Repositorio: `infogpstech/GPSpedia`.
- Rama de trabajo: `GPSpedia2.2.5_work`.
- Rama base protegida: `GPSpedia2.2.5`, HEAD verificado `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no se escribieron cambios en la base.
- Último commit funcional/pruebas verificado para los grupos MIG-017 y MIG-018: `6b4eb86c84adf0156246a29f7d43a2524fdf9ec1`. La documentación de cierre se registró en `a181c36a03b1849033e540e229e79fe7a344b822`, `3c99b02bac36e5e4b9eeff22fc91ff0aa47a76fc`, `6abe2ddb9a960c902f1bb67ad9791c7b06ce2537` y `1f7193e14dae0a98828d7d42ffdb51b087637ce7`.

### MIG-017 — Herramientas y operaciones de Drive
- Estado: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- CI Node.js 22, run `45249354445`, grupo `41 MIG017`: **666/666 pruebas PASS**, 57 resúmenes, sin fallos en el grupo.
- Cobertura: árbol autorizado Cortes, navegación, límites de rutas, ACL/propietario, move y rollback, backups reanudables, restauración, auditoría, métricas, alertas y controles de acciones destructivas.
- No se conectó a Drive real ni a proyectos Apps Script. Prueba Beta aislada pendiente.

### MIG-018 — Modelos, cortes, VIN y contribuciones
- Estado: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- CI Node.js 22, run `45249354445`, grupo `42 MIG018`: **594/594 pruebas PASS**, 51 resúmenes, sin fallos en el grupo.
- Cobertura: contratos de payload y transacciones de cortes; VIN autoritativo, privacidad, colección, firmas, rangos de años, contexto, normalización, umbrales y presentación; AUG-050 (11/11); ledger append-only de aportes, concurrencia, idempotencia, recuperación, candidatos y resolución ADMIN; proyecciones CATALOG, slots, asignación de IDs y versionado de campos.
- Se corrigieron defectos de las pruebas: rutas relativas de módulos VIN, formato de resúmenes CLI, invocación del test AT:AV y contrato de replay VIN. Se corrigió además la lectura del ledger suplementario para reutilizar `appendLedgerSheet` y evitar una referencia fuera de ámbito.
- No se invocaron Apps Script ni Spreadsheet reales. Migración/versionado de `AportesVehiculo`, despliegues y prueba Beta con datos aislados siguen pendientes.

### Regresión general y despliegue
- Confirmación posterior en el run `45249567158` (HEAD documental `6abe2ddb9a960c902f1bb67ad9791c7b06ce2537`): los grupos MIG-017/MIG-018 siguen sin fallos y la regresión global conserva 184 suites, 2,135 pruebas aprobadas y las mismas seis fallas externas.
- En el run de código `45249354445`: 184 suites, 2,135 pruebas aprobadas y 6 fallos de suites fuera de MIG-017/MIG-018:
  1. ADMIN — P4 política de roles.
  2. FEEDBACK — reset de vídeo desde navegador sin secreto compartido.
  3. CATALOG — feed incremental autenticado, cursor y recuperación.
  4. UTILITIES — fixture Spreadsheet/RBAC/staging/rollback (10/19).
  5. AUTH — purga de Logs usando actor confiable.
  6. INTEGRATION — BETA-043 telemetría local por servicio y navegador móvil.
- Estas seis fallas no pertenecen a los grupos dirigidos MIG-017/MIG-018 y deben mantenerse como deuda de regresión separada; no se declararon resueltas.
- Pages build del commit `6b4eb86c84adf0156246a29f7d43a2524fdf9ec1`, run `45249353848`: build, reporte y deploy SUCCESS.

### Continuidad
- MIG-017 y MIG-018 quedan cerradas con validación diferida.
- Siguiente tarea según prioridad: **MIG-019 — PyS, tutoriales y feedback**.
- Antes de iniciar MIG-019, consultar la última HEAD y confirmar que la rama base permanece intacta.

### MIG-019 — PyS, tutoriales y feedback
- Estado: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- CI Node.js 22, run `45251355899`, grupo `43 MIG019`: **363/363 pruebas PASS**, 38 suites únicas, sin fallos dentro del grupo.
- Cobertura: altas/ediciones PyS, soluciones y prevención; integridad y relaciones bidireccionales PyS–vehículos; navegación contextual y anti-ciclos; almacenamiento/rollback/recuperación de imágenes; caché y XSS; sugerencias y reportes con idempotencia, adjuntos y recuperación; likes append-only, replay y actividad; sugerencias de año y aplicaciones versionadas; tutoriales, títulos, edición, integridad de IDs y actualización delta-first; publicación coordinada del catálogo.
- Se actualizaron dos contratos de prueba obsoletos: la navegación de tarjetas ahora valida el helper compartido `createPysAssociationAddCard`; el contraste del acordeón valida tokens CSS semánticos vigentes. No se alteró el comportamiento de la aplicación para hacer pasar estas pruebas.
- Regresión general en el run `45251355899`: 223 suites, 2,578 pruebas aprobadas y seis fallos fuera de MIG-019: ADMIN P4, FEEDBACK reset de vídeo desde navegador, CATALOG feed incremental, UTILITIES fixture Spreadsheet/RBAC/staging/rollback, AUTH purga Logs e INTEGRATION BETA-043.
- Pages build/deploy del mismo HEAD, run `45251355846`: SUCCESS.
- No se ejecutaron Apps Script, Spreadsheet, Drive ni cuentas reales. Validación Beta aislada pendiente, especialmente AUG-128 y AUG-155; no usar datos productivos.

### Continuidad
- MIG-017, MIG-018 y MIG-019 quedan cerradas con validación diferida.
- Siguiente tarea según prioridad y dependencias: **MIG-020 — Inbox completo**.
- Rama base protegida `GPSpedia2.2.5` verificada en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no modificada.

### MIG-020 — Inbox completo
- Estado: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- CI Node.js 22, run `45253324874`, grupo `44 MIG020`: **257/257 pruebas PASS**, sin fallos dentro del grupo.
- Detalle: InboxConversations 70/70; InboxUi 89/89; caché/paginación 19/19; eventos de imágenes de reportes 7/7; auditoría 15/15; roles 22/22; XSS 30/30; mensajes Developer 5/5.
- Se añadieron a la interfaz las acciones «Marcar no leída» y «Eliminar de mi bandeja», con autorización por participante y conservación del historial compartido.
- Se reforzó el rollback de lectura, archivo y cierre cuando falla la auditoría.
- Se serializaron las mutaciones Inbox con un lock breve; las consultas no adquieren locks y las mutaciones fallan rápido si el lock está ocupado.
- Se retiró el handler FEEDBACK sin ruta de lectura del journal COORDINATOR; el frontend mantiene la consulta mediante la configuración central, conforme a §18.
- Regresión general en run `45253324874`: 231 suites, 2,835 pruebas aprobadas y seis fallos ajenos a MIG020: ADMIN P4, FEEDBACK reset vídeo, CATALOG feed, UTILITIES Spreadsheet fixture/RBAC/staging/rollback, AUTH purga Logs e INTEGRATION BETA-043.
- Pages build/deploy del mismo HEAD, run `45253324552`: SUCCESS.
- No se ejecutaron Apps Script, Spreadsheet ni cuentas reales. Validación Beta aislada pendiente: AUG-115, AUG-116, AUG-119, AUG-152, AUG-155 y GP-INBOX-04B/04C/04D.

### Continuidad
- MIG-017, MIG-018, MIG-019 y MIG-020 quedan cerradas con validación diferida.
- Siguiente tarea según prioridad y dependencias: **MIG-021 — Métricas, estados y monitoreo**.
- Rama base protegida `GPSpedia2.2.5` verificada en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no modificada.


---

## Cierre MIG-021 — métricas, estados y monitoreo — 2026-11-23

### Estado Git y alcance
- Repositorio: `infogpstech/GPSpedia`.
- Rama de trabajo: `GPSpedia2.2.5_work`; rama base protegida: `GPSpedia2.2.5`.
- HEAD de código MIG-021 verificado: `235d90ca6c0d4e48088fba4e822f4cac3b99d030`.
- Commit de cierre del panel, contrato, diseño y lista Beta: `a58e69825736a60308216862e85f86d4482fd4ab`.
- HEAD de la rama base verificado: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; no se escribieron cambios en la base.
- Commits de implementación/correcciones: `5c48c8345a6219dcff99f2cd041e144ee359a941`, `1cf3da626e7aef9e19a10151897bcc87194553f9`, `235d90ca6c0d4e48088fba4e822f4cac3b99d030`.

### Resultado técnico
- Se mantuvo el diagnóstico de los seis servicios principales y COORDINATOR opcional: identidad, versión, estado, latencia, errores, timeout y clasificación stale/unknown.
- El agregado global de Coordinator conserva las ventanas horarias 1/6/24 h y RBAC de Desarrollador. Los incrementos nuevos corresponden a adquisiciones exitosas de lease.
- Los buckets v2 se guardan en el mismo estado JSON y la misma escritura ya necesaria para confirmar una lease; no se añade una propiedad ni una escritura independiente de métricas a esa operación.
- Las validaciones de contexto y las lecturas del feed ya no escriben métricas. Los sondeos de salud permanecen fuera del tráfico de usuario.
- Los buckets históricos v1 se conservan y suman una sola vez durante su ventana restante de 24 horas; el histórico puede contener eventos de validación/feed anteriores a esta actualización. La retención v2 elimina buckets fuera de ventana.
- El panel distingue el agregado global de la telemetría local de la pestaña. La telemetría local mantiene sus límites, percentiles y exclusión de payloads, tokens e identidad.
- Se corrigió el texto de ayuda del panel para reflejar el alcance actual del agregado y la transición histórica v1/v2. No se añadieron exportaciones nuevas; se mantienen sin cambios las funciones de exportación ya existentes.
- No se añadieron secretos, URLs ni configuración interservicio local a servicios Apps Script; no se alteraron deployments ni recursos externos.

### Pruebas y CI
- Harness aislado V8 de SharedMutationCoordinator: **95/95 PASS**, incluyendo adquisición/idempotencia, estado v1/v2, retención, transición de buckets históricos, fallo best-effort y ausencia de persistencia separada en feed/validación.
- GitHub Actions Node.js 22, run `45263215575`, grupo `45 MIG021`: todas las suites del grupo PASS (**235 comprobaciones** tras la actualización final del contrato). Cobertura: salud 19/19; tráfico ADMIN 45/45; navegador 10/10; agregador 10/10; agregación 3/3; batch 3/3; telemetría directa 6/6; routing 6/6; superficie ADMIN 17/17; catálogo 3/3; contribuciones 3/3; insights 1/1; XSS 6/6; append actividad 6/6; retención 10/10; lectura acotada 7/7; limpieza logs 5/5; vistos recientes 12/12; usuarios 2/2; estado catálogo 4/4; accesibilidad conexión 8/8; alertas Drive 5/5; actividad imágenes 5/5, 6/6, 7/7 y 6/6; likes 5/5; coordinación sesión 9/9; minimización leases 6/6.
- Regresión general en ese run: **296 suites, 3,567 pruebas aprobadas y 6 fallos** ajenos al grupo MIG021: ADMIN P4; FEEDBACK reset de vídeo desde navegador; CATALOG feed incremental; UTILITIES Spreadsheet simulado/RBAC/staging/rollback; AUTH purga de Logs; INTEGRATION GP-PERF FEEDBACK/Inbox. No se atribuyen a MIG-021.
- Pages build/deploy del HEAD de código, run `45263213731`: **SUCCESS**.

### Validación Beta pendiente
- No se ejecutaron deployments Apps Script, endpoints reales, Spreadsheet ni Drive. Mantener BETA-05 en entorno aislado: siete identidades/estados, latencias y errores reales; permisos Developer; buckets globales/locales; compatibilidad histórica; cuota/almacenamiento Drive; comportamiento móvil/escritorio.
- Las pruebas CI y el harness local no se presentan como validación Beta.

### Estado y continuidad
- MIG-021: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- Siguiente tarea según prioridad: **MIG-022 — Administración de Spreadsheet y mantenimiento**.


---

## Continuidad MIG-022 — 2026-11-23

### Rama y HEAD
- Repositorio: `infogpstech/GPSpedia`.
- Rama de trabajo: `GPSpedia2.2.5_work`.
- HEAD actual tras el avance inicial: `e84587e6f050f7fbe55f59b495044a540fe46f60`.
- Rama base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; verificada sin modificaciones.
- Commits de esta actividad: `2dd13f2a66925e75459fa4e39757421f0d4924d1` (comentario de Utilities) y `e84587e6f050f7fbe55f59b495044a540fe46f60` (contrato de pruebas Utilities).

### MIG-022 — Administración de Spreadsheet y mantenimiento
- Estado: **EN PROGRESO**.
- Se inspeccionaron las acciones internas ADMIN `createSheet`/`addColumn`, handlers de respaldo/restauración, migraciones de identificadores/fórmulas, mantenimiento de Logs y el servicio UTILITIES.
- Se detectó que el contrato de `UtilitiesSecurity.js` seguía exigiendo lease remota de COORDINATOR, aunque `Utilities.migrateTimestamps` ya usa actor de sesión local y ScriptLock local. El harness también carecía de mocks de CacheService y de las primitivas SHA-256 requeridas por la caché de actor.
- Se corrigió el contrato para probar el comportamiento implementado: actor desde Users/ActiveSessions, roles, sesión duplicada/expirada/revocada, staging, rollback, concurrencia y ausencia de URL/secreto/endpoint COORDINATOR.
- Prueba aislada V8 sobre las fuentes exactas de la rama: **19/19 PASS**.
- Se actualizó el comentario de Utilities para no afirmar una lease compartida inexistente. No se modificaron datos ni deployments Apps Script.

### Validación pendiente
- GitHub Actions Node.js 22 para HEAD `e84587e6f050f7fbe55f59b495044a540fe46f60`: regresión en ejecución al actualizar este checkpoint; comprobar grupo UTILITIES y fallos globales.
- Verificar las suites ADMIN de `createSheet`, `addColumn`, backup/restore, rollback, migración de IDs/fórmulas, mantenimiento de Logs y consola.
- No se ejecutaron Spreadsheet/Drive/Apps Script reales; validación Beta aislada sigue diferida.

### Continuidad
- Continuar MIG-022; no iniciar MIG-023 hasta completar pruebas locales, revisión de diff y cierre documental.
- MIG-025 queda explícitamente obligado a retirar también cualquier `doGet`/health/ping de COORDINATOR y su inclusión como servicio independiente en el escaneo de salud. No ejecutar MIG-025 antes de resolver las dependencias MIG-022 a MIG-024.

 
---
 
## Cierre MIG-022 — 2026-11-23
 
- Estado: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- HEAD de la rama de trabajo verificado antes de este cierre: 7775cced356b2da28c6b5bb8f88e6881b4f2d917.
- Rama base GPSpedia2.2.5 verificada en d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin cambios.
- Commits de implementación/contrato: 2dd13f2a66925e75459fa4e39757421f0d4924d1, e84587e6f050f7fbe55f59b495044a540fe46f60. Commits de continuidad: c12c93759851885e7a1262fbd0fe80e225534d02, bf5cd607010ac6d6fa1a58c6055df01e65bc5ea2, 7775cced356b2da28c6b5bb8f88e6881b4f2d917.
- Validaciones específicas reproducibles: **335/335 PASS**. Incluyen creación de hojas/columnas, actor local y RBAC de UTILITIES, locks/concurrencia, staging/rollback, fórmulas e IDs, backup/restauración, consola Developer, terminal Drive, auditoría, organización/reconciliación de imágenes, papelera y purgado de actividad.
- No se modificaron datos reales, Spreadsheet, Drive ni deployments Apps Script.
- La regresión global CI no está verde por cinco fallos ajenos al alcance MIG-022: VehicleModalRolePolicy 11/12; falta el archivo CoordinatorBrowserCatalogReset.mjs; contrato legacy de feed CATALOG; expectativa legacy de lease AUTH; y FeedbackLockFastFail. No se ocultan ni se atribuyen a MIG-022; deben resolverse en sus tareas/fases correspondientes.
- Pendiente Beta: validación real de Apps Script, Spreadsheet, Drive, permisos y comportamiento desplegado. No se simula ni se declara ejecutada.
- Siguiente tarea por prioridad: **MIG-023 — Catálogo, cachés y experiencia de usuario**. Después seguir MIG-024 y MIG-025; MIG-025 debe eliminar COORDINATOR por completo, sin doGet/health/ping propio ni inclusión en el escaneo de salud.

 
---
 
## Inicio MIG-023 — 2026-11-23
 
- Estado: **EN PROGRESO**.
- HEAD al iniciar: 5160fe1adac44662a9b7138718c1aa1cec94811b.
- Rama base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin modificaciones.
- Hallazgo principal: ACTION_TO_SERVICE_MAP aún dirige publishCatalogReset y getCatalogChanges a COORDINATOR; getCatalogChanges consulta su GET catalogFeed=1. FEEDBACK todavía publica cambios de catálogo por SharedMutationClient. CATALOG ya valida sesiones localmente y entrega el snapshot completo, pero no es dueño del feed.
- Objetivo de MIG-023: mover el feed/cursor/publicación de reset a CATALOG; el frontend debe publicar después de una mutación exitosa y consultar el feed directamente desde CATALOG. FEEDBACK no debe llamar a COORDINATOR ni a otro Apps Script para notificar cambios.
- Mantener snapshot completo, cursor, recuperación ante huecos/corrupción y actualización IndexedDB silenciosa. No aceptar snapshots/deltas arbitrarios del navegador sin validación del backend.
- El endpoint de salud y las operaciones restantes de COORDINATOR no se eliminan en MIG-023; su retirada completa, incluido doGet/health/ping, permanece en MIG-025 después de MIG-024.
- Siguiente paso: implementar feed CATALOG con almacenamiento local del servicio, lock local, idempotencia por requestId, retención acotada y lectura GET pública; migrar API frontend y notificaciones FEEDBACK; reemplazar contratos heredados que esperan COORDINATOR.


## Continuidad MIG-023 — actualización 2026-11-23

Repositorio: `infogpstech/GPSpedia`
Rama de trabajo: `GPSpedia2.2.5_work`
Rama base protegida: `GPSpedia2.2.5` (sin cambios).

### Estado verificado
- El feed incremental del catálogo pertenece a CATALOG. El frontend enruta `getCatalogChanges`, `publishCatalogChange` y `publishCatalogReset` a ese servicio.
- FEEDBACK devuelve metadatos de colección/registro/operación; ya no publica el feed a través de SharedMutationClient. CATALOG valida sesión local y reconstruye snapshots desde las hojas canónicas de Cortes, PyS y Tutoriales.
- El navegador no puede enviar snapshots. El feed usa lock local, revisiones monotónicas, cursor, idempotencia por requestId, retención máxima de 100 eventos y reset de recuperación.
- Las rutas públicas `catalogFeed`, `getCatalogChanges` y `publishCatalogReset` fueron retiradas de COORDINATOR. El helper interno de SharedMutation queda pendiente de MIG-024; endpoint health y agregación de tráfico de COORDINATOR quedan para MIG-025.
- Documentación actualizada: `Catalog_Read_Strategy.md`, `Services/COORDINATOR_SETUP.md`, `README.md`, `Tareas_Beta.md` y el índice `lista_beta.txt`.

### Pruebas locales ejecutadas
- `CatalogChangeFeed`: 16 casos PASS.
- `FeedbackCatalogPublicationIsolation`: 14 casos PASS.
- `CatalogBrowserReset`: 11 casos PASS.
- También se ejecutaron satisfactoriamente los contratos locales de InboxRole, ActionDispatch, ServiceBrowserTraffic, DirectTrafficRouting, FeedbackLikeAppendOnly, WriteCatalogPublicationIsolation, WriteCatalogPublicationFrontend y AdminCatalogPublicationIsolation en el estado disponible durante esta sesión.

### Pendiente al cierre de esta actualización intermedia
- La corrida completa de GitHub Actions, las pruebas cache-first/IndexedDB y la revisión de fallos ajenos a MIG-023 se completaron después; el resultado consolidado figura en «Cierre MIG-023» al final de este archivo.
- La validación Beta real permanece diferida y no se declara ejecutada.

---

## Cierre MIG-023 — catálogo, cachés y experiencia de usuario — 2026-11-23

### Rama y estado Git
- Repositorio: `infogpstech/GPSpedia`.
- Rama de trabajo: `GPSpedia2.2.5_work`.
- HEAD de código validado: `e7ce57dfde8b5141c7bcb60496c0b6e11fa8a37b`.
- Rama base protegida `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`; sin cambios.
- Los commits posteriores al HEAD de código registran exclusivamente correcciones de contratos y documentación de MIG-023.

### Resultado
- `ACTION_TO_SERVICE_MAP` enruta `getCatalogChanges`, `publishCatalogReset` y `publishCatalogChange` directamente a CATALOG.
- CATALOG mantiene el diario local con ScriptProperties/ScriptLock, revisión monotónica, cursor, idempotencia, retención de 100 eventos, paginación y recuperación por reset.
- FEEDBACK solo devuelve colección/ID/operación. El frontend publica después de la mutación confirmada; CATALOG valida la sesión local y reconstruye snapshots canónicos de Cortes, PyS y Tutoriales. El navegador no puede enviar snapshots.
- WRITE y ADMIN solicitan reset desde frontend. Los requestId usan identificadores de operación cuando existen y nonce único cuando no existen, evitando colisiones entre ediciones sucesivas del mismo registro y conservando la idempotencia de reintentos de una misma llamada.
- Se retiraron de COORDINATOR las rutas públicas `catalogFeed`, `getCatalogChanges` y `publishCatalogReset`. El helper interno del protocolo SharedMutation queda para MIG-024. La retirada de COORDINATOR, incluido `doGet`/health/ping y su inclusión en el escaneo de salud, sigue en MIG-025 después de MIG-024.
- Se conservaron las rutas de catálogo completo, caché IndexedDB, cursor, navegación, búsqueda, modal, impresión, QR, PWA y carga de imágenes.

### Validaciones locales y CI
- `CatalogChangeFeed`: 16/16 PASS.
- `CatalogBrowserReset`: 11/11 PASS (incluye unicidad de requestId entre mutaciones y estabilidad en reintentos).
- `FeedbackCatalogPublicationIsolation`: 14/14 PASS.
- `AdminCatalogPublicationIsolation`: 26/26 PASS.
- `CatalogPublicationIsolation`: 27/27 PASS.
- `CatalogPublicationFrontend`: 4/4 PASS.
- `DirectTrafficRoutingCoverage`: 6/6 PASS.
- `CatalogSnapshotSync`: 29/29 PASS; `CatalogStartupIntegrity`: 25/25 PASS.
- GitHub Actions Node.js 22: 335 suites; 4,015 pruebas aprobadas; tres fallos de suites fuera de MIG-023: ADMIN `VehicleModalRolePolicy` (11/12), AUTH `SensitiveLogsTrustedActor` (expectativa antigua de lease) e INTEGRATION `GP-PERF FEEDBACK/Inbox` (expectativa antigua sobre locks). No se atribuyen a MIG-023 ni bloquean su cierre.
- GitHub Pages workflow del mismo HEAD: build, reporte y deploy SUCCESS. No se realizó despliegue manual de Apps Script ni se modificaron hojas/datos externos.

### Validación Beta pendiente
- Despliegues Apps Script CATALOG/FEEDBACK/WRITE/ADMIN y Spreadsheet Beta aislada.
- Lectura GET y publicación POST reales; deltas Cortes/PyS/Tutoriales, resets, concurrencia, pérdida de respuesta, cursor obsoleto, huecos y recuperación.
- Navegadores Android/PWA y escritorio: arranque cache-first, navegación/búsqueda, miniaturas, estados offline y sincronización silenciosa.
- No se invocaron deployments, hojas ni datos productivos; las validaciones Beta no se presentan como realizadas.

### Estado y continuidad
- MIG-023: **COMPLETADA CON VALIDACIÓN DIFERIDA**.
- MIG-024 — Eliminar SharedMutation: **siguiente tarea**. No iniciar MIG-025 hasta completar MIG-024.
- La instrucción de retirar por completo COORDINATOR, su endpoint health y su presencia en el escaneo de salud permanece como requisito obligatorio de MIG-025.

---

## Inicio MIG-024 — Eliminar SharedMutation — 2026-11-23

### Auditoría de consumidores y límites
- `SharedMutationClient.js` mezcla dos responsabilidades: llamadas remotas del protocolo SharedMutation y helpers locales de contexto/caché de actor. Se debe extraer la segunda responsabilidad a `SharedSessionActor.js` antes de eliminar el cliente.
- Únicos consumidores activos de `withSharedMutationLease_` encontrados en servicios: ADMIN `saveUnusedImagesInventory`, `createCortesImageFolder` y `auditDriveImagesInCortes`. Reemplazar por guardas locales de alcance mínimo; no mantener locks globales durante escaneos o escrituras prolongadas.
- `JS/Frontend/sessionCacheInvalidation.js` ya coordina desde el navegador la invalidación de cachés locales de AUTH, WRITE, CATALOG, FEEDBACK, ADMIN y UTILITIES mediante `__invalidateSessionActorCache`; no necesita el endpoint de invalidación de COORDINATOR.
- El registro `USERS` está excluido de `CENTRAL_SERVICE_KEYS` y del registro central activo; no hay fuente `JS/Services/users.js` en el árbol de trabajo. La fila USERS de la guía de despliegue es histórica y debe identificarse como obsoleta.
- COORDINATOR conserva temporalmente telemetría/health y otras capacidades que pertenecen a MIG-025. No retirar el servicio entero en MIG-024.

### Secuencia de implementación
1. Extraer helpers locales de actor desde `SharedMutationClient.js` a `SharedSessionActor.js` y actualizar servicios, tests y guías.
2. Sustituir las tres leases remotas ADMIN por guardas locales por recurso, con lock corto solo para reservar/liberar marcador y expiración automática.
3. Retirar `SharedMutationClient.js`, acciones de lease/publicación y llamadas remotas obsoletas; mantener solo capacidades de COORDINATOR que correspondan a MIG-025.
4. Actualizar pruebas de contrato y ejecutar regresión completa; verificar que no quedan referencias activas al cliente ni URLs/secretos de SharedMutation.

### Estado
- MIG-024 EN PROGRESO. No se ha eliminado todavía `SharedMutationClient.js`; primero se preservarán y probarán los helpers locales de sesión.
- MIG-023 permanece cerrada como COMPLETADA CON VALIDACIÓN DIFERIDA.


================================================================================
CHECKPOINT DE CONTINUIDAD — 2026-11-23 (CIERRE MIG-024)
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5 (no modificar)
HEAD confirmado: 38e9ec5f6f32710ef9fc6f9f07b24cd7312cc997
HEAD base confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1

MIG-024 — Eliminar SharedMutation:
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.
- SharedMutationClient.js eliminado; SharedSessionActor.js conserva solo helpers locales.
- Servicios activos sin cliente remoto, leases, publicación compartida ni URLs/secretos de Coordinator.
- ADMIN usa guardas locales independientes para inventario, creación de carpeta y auditoría Drive. Reserva con tryLock(0), libera ScriptLock durante el trabajo, controla duplicados por recurso y expira marcadores abandonados.
- La invalidación de cachés se coordina desde el frontend hacia cada servicio.
- Coordinator queda únicamente para health/telemetría transitoria de MIG-025. La clave histórica GPSpedia_SHARED_MUTATION_LEASES se conserva solo como fuente histórica de telemetría en lectura; no se adquieren ni escriben leases.
- Los nombres isSharedMutationAction_ restantes solo seleccionan acciones que reciben actor local; no son clientes ni leases remotas.

Pruebas en HEAD:
- SharedMutationRemovalContract: 6/6 PASS.
- AdminLocalOperationGuard: 6/6 PASS.
- AdminImageScanCoordinatorContract y AdminSheetActionsContract: sin fallos en regresión.
- CI servicios: 425 suites, 4,826 aprobadas, 1 fallo conocido fuera de MIG-024: FeedbackLockFastFail.mjs (expectativa general de ausencia de locks en FEEDBACK, ya registrada desde MIG-023).
- GitHub Pages: SUCCESS.
- Beta real pendiente; ver Tareas_Beta.md §6.4. No se desplegaron proyectos Apps Script ni se modificaron datos productivos.

Commits de esta continuación:
- 22e3ca62e8c0222fdcd432ed824b50d98ef44a6e — actualización de contratos legacy.
- 282073433145653fdeac6bc1e4fc89df7107de45 — corrección de contrato Coordinator.
- 38e9ec5f6f32710ef9fc6f9f07b24cd7312cc997 — pruebas de concurrencia/TTL de guarda local ADMIN.

Siguiente tarea prioritaria: MIG-025 — Eliminar COORDINATOR.
Antes de borrar el servicio, inventariar todos sus handlers, health, métricas, compatibilidad y tareas programadas; identificar sustitutos y consumidores; retirar el escaneo de salud/telemetría de forma que no desaparezcan capacidades. Mantener la regla de §17: ninguna función se elimina sin matriz de paridad y prueba equivalente. No desplegar ni modificar datos productivos.
================================================================================


================================================================================
CHECKPOINT — INICIO MIG-025 (2026-11-23)
Rama: GPSpedia2.2.5_work
HEAD de partida: acad94c5a44b469424dd9f8ca187c6a354f02b27
MIG-024 quedó cerrada localmente en el commit documental acad94c5. MIG-025 es la tarea activa.

Inventario inicial:
- Coordinator.js contiene contexto de sesión legado, telemetría global y endpoints health/GET/POST.
- Los servicios activos ya no consumen API remota de sesión ni leases de Coordinator.
- Frontend todavía incluye COORDINATOR en CENTRAL_SERVICE_KEYS, SERVICE_HEALTH_CONTRACTS y telemetría local; getServiceTraffic sigue mapeado a COORDINATOR.
- El panel Developer muestra métricas globales Coordinator-only y métricas locales por navegador. Las globales reflejan eventos legacy, no todas las solicitudes HTTP. No retirar ni reemplazar sin resolver paridad.
- Los seis servicios activos restantes tienen health propio y el frontend consulta sus endpoints directamente desde el registro central.
- No se han borrado fuentes, guías, filas de configuración ni propiedades externas; no se han modificado deployments ni datos reales.

Siguiente acción: inventario completo de consumidores y referencias (fuente, frontend, registro central, documentación, pruebas, workflows y Beta); diseñar la continuidad de salud y telemetría antes de retirar Coordinator.
================================================================================


================================================================================
CHECKPOINT DE CIERRE — MIG-025 — 2026-11-23
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5
HEAD de código validado: b51c1df563329889df7765f9c49e1c7570f2e725
HEAD documental previo a este checkpoint: 79af4a9a9f5a87aec663b1a6499c5c737f484058
HEAD base verificado: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin cambios)

MIG-025 — Eliminar COORDINATOR
Estado: COMPLETADA CON VALIDACIÓN DIFERIDA.

Resultado:
- Retirado JS/Services/Coordinator.js, incluidos doGet/doPost, health, telemetría y dispatcher.
- ACTION_TO_SERVICE_MAP ya no contiene getServiceTraffic ni rutas a COORDINATOR.
- CENTRAL_SERVICE_KEYS y SERVICE_HEALTH_CONTRACTS contienen solo AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN. El lector central ignora la fila histórica COORDINATOR mientras se completa su limpieza externa autorizada.
- serviceTelemetry.js mantiene métricas locales de los seis servicios. No incluye COORDINATOR.
- La consulta y el gráfico de tráfico global se retiraron. El panel Developer conserva una sección visible que explica que el agregado legacy solo medía eventos instrumentados (principalmente adquisiciones exitosas de leases), no todas las solicitudes HTTP, y que las métricas locales por navegador no lo sustituyen ni permiten inferir el total global.
- La invalidación de cachés sigue coordinada desde frontend; AUTH/servicios mantienen actores locales y no dependen del endpoint retirado.
- Guías antiguas de despliegue/Coordinator archivadas en Olds/Documentacion_Legacy/Services. README, SERVICE_HEALTH, Tareas_Beta, lista_beta, MATRIZ_MIGRACION_SERVICIOS, TAREAS_MIGRACION_ARQUITECTURA y ChangesLogs actualizados.
- No se borraron filas de Spreadsheet ni propiedades de Apps Script; no se tocaron deployments, proyectos, triggers ni datos externos.

Validaciones CI:
- GitHub Actions Node.js 22, run 45285424788, HEAD b51c1df563329889df7765f9c49e1c7570f2e725: 417 suites, 4,667 pruebas aprobadas, 1 suite fallida ajena al alcance: FeedbackLockFastFail.mjs (expectativa general sobre locks FEEDBACK, ya conocida desde MIG-023/MIG-024). Los contratos específicos MIG-025 aprobaron.
- CoordinatorRetirementContract 13/13.
- ServiceHealthContract 19/19.
- ServiceBrowserTrafficContract 10/10.
- ServiceTrafficAdminContract 10/10.
- AdminTrafficSurfaceContract 12/12.
- DirectTrafficRoutingCoverage 6/6.
- ServiceMetricsTelemetry 1/1.
- DeveloperPrivilegeRouting 20/20.
- PasswordRecovery 10/10.
- PasswordKdfBenchmark 5/5.
- El paso CI de comprobación sintáctica de módulos modificados aprobó.
- GitHub Pages run 45285423155, mismo HEAD: SUCCESS.
- No se ejecutaron pruebas de deployments Apps Script ni invocaciones reales de Spreadsheet/Drive.

Pendiente Beta — Tareas_Beta.md §6.5:
- Verificar seis endpoints health reales, identidad, versión, timeout, fallo parcial y recuperación.
- Confirmar ausencia de consumidores, endpoints y fallback a COORDINATOR en los deployments Beta.
- Inspeccionar proyectos, deployments, triggers y propiedades externas; documentar recursos huérfanos y solicitar autorización antes de cualquier limpieza.
- Comprobar el panel Developer y el alcance de telemetría local. No simular ni declarar agregado global equivalente.

Continuidad:
- MIG-025 cerrada como COMPLETADA CON VALIDACIÓN DIFERIDA.
- Siguiente tarea prioritaria: MIG-026 — Eliminar configuración local de todos los servicios.
- No iniciar MIG-027 antes de cerrar MIG-026 y sus dependencias.
================================================================================


================================================================================
CHECKPOINT DE CONTINUIDAD — MIG-026 — 2026-11-23
Repositorio: infogpstech/GPSpedia
Rama: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5 (no modificar)
HEAD de trabajo al iniciar esta actualización documental: 999fe8084860de487182f5f8238fbe9d6df83372
HEAD base verificado: d9acc68d889985c2e2f42fe3a02e502efc86ead1

Estado:
- MIG-025 permanece COMPLETADA CON VALIDACIÓN DIFERIDA.
- MIG-026 permanece EN PROGRESO; no cerrar ni iniciar MIG-027.
- Actualizada la sección MIG-026 en TAREAS_MIGRACION_ARQUITECTURA.md con auditoría estática actual, dependencias, riesgos y orden de ejecución.

Auditoría actual:
- AUTH: SPREADSHEET_ID/openById y propiedades de login idempotente, recuperación HMAC, revocación y sesión.
- CATALOG: SPREADSHEET_ID/openById y propiedades del feed incremental.
- UTILITIES: SPREADSHEET_ID/openById.
- WRITE: propiedad GPSpedia_CORTES_LAST_ID todavía participa en el cálculo y congelación del high-water mark.
- FEEDBACK: GPSpedia_RICH_TEXT_MODE_V1 sigue siendo leído/escrito por handleGetRichTextMode/handleSetRichTextMode, aunque existe lector central para otros parámetros.
- ADMIN: propiedades de auditoría, Safe Apply, guardas y estado de auditoría Drive; existe accessor central getCortesRootFolder(), pero un consumidor legacy todavía llama DriveApp.getFolderById(CORTES_IMAGES_ROOT_FOLDER_ID).
- SharedSessionActor.js mantiene fallback a SPREADSHEET_ID si no se inyecta proveedor.
- MIG-003 inventarió 26 familias en un estado previo; reconciliar contra el código vigente tras MIG-024/MIG-025 antes de usar esa lista como verdad actual.

Bloqueadores/precauciones:
- MIG-006/MIG-008: getActiveSpreadsheet() en Web Apps reales no está validado. No reemplazar openById ni declarar que un proyecto vinculado funciona sin prueba Beta.
- No introducir ID/URL/secret bootstrap ni endpoint circular.
- No tratar ledgers, idempotencia, sesiones, auditorías y estado recuperable como parámetros genéricos. Requieren migración de datos con paridad.
- El secreto HMAC de recuperación no se traslada a hoja de configuración ni se expone al frontend; requiere diseño de seguridad aprobado.
- La preferencia FEEDBACK no se migra hasta que exista una vía de actualización/publicación central autorizada que conserve el control Developer.

Cambios de código en este corte:
- Se probaron sustituciones locales de openById por getActiveSpreadsheet y adaptaciones de fixtures; CI mostró incompatibilidades de harness/consumidores. Se revirtieron los módulos y fixtures experimentales al contenido anterior.
- No queda cambio funcional experimental aprobado en el código por este corte.
- No se modificaron deployments, proyectos Apps Script, propiedades instaladas, Spreadsheet, Drive, triggers ni datos externos.

Validación:
- La regresión fallida durante el experimento correspondió a dobles de prueba que no exponían getActiveSpreadsheet y a consumidores que dependían del proveedor anterior. Se revirtió el experimento; no se declara una suite verde para el estado final tras la reversión.
- No se ejecutó prueba Beta real de Apps Script/Spreadsheet.
- HEAD base permanece sin cambios.

Siguiente paso:
1. Resolver evidencia Beta de MIG-006/MIG-008 o seleccionar alternativa arquitectónica documentada sin bootstrap.
2. Reconciliar el inventario de configuración con el código vigente.
3. Corregir el consumidor ADMIN de carpeta Cortes con pruebas.
4. Migrar configuración y estados uno por uno, manteniendo paridad.
================================================================================


================================================================================
AVANCE DE CONTINUIDAD — MIG-026 — 2026-11-23
Repositorio: infogpstech/GPSpedia
Rama de trabajo: GPSpedia2.2.5_work
Rama base protegida: GPSpedia2.2.5 (sin cambios)
HEAD confirmado antes del cambio: 379e1bb2d25b388a2add8faa865c0d762c6d2180

Actividad implementada:
- `JS/Services/admin.js`: `handleCreateCortesImageFolder` obtiene la raíz con `getCortesRootFolder()`; deja de leer `CORTES_IMAGES_ROOT_FOLDER_ID` directamente.
- Nueva suite `JS/Tests/AdminCentralCortesFolderConfiguration.mjs`: cuatro escenarios para recurso central, payload incompleto, duplicados y fallo cerrado.
- `JS/Tests/RunServiceTests.mjs`: grupo MIG026 registrado y seleccionable.
- `TAREAS_MIGRACION_ARQUITECTURA.md`: acción ADMIN marcada implementada localmente; MIG-026 sigue EN PROGRESO.
- `Tareas_Beta.md`: procedimiento de validación real añadido.

Validación:
- GitHub Actions Node.js 22, run 45290329039, commit 169a249875eabdd32db234940e0c74e9bcca8773: sintaxis de módulos modificados SUCCESS; `AdminCentralCortesFolderConfiguration` 4/4 PASS; regresión global 4,671 pruebas PASS y 1 suite fallida ajena a MIG-026 (`FeedbackLockFastFail.mjs`, expectativa preexistente sobre locks FEEDBACK). El mismo fallo aparece en el run anterior 45289392165, antes del commit MIG-026; no se atribuye a este cambio.
- No se ejecutaron Apps Script, Drive, Spreadsheet ni recursos externos. La verificación real queda pendiente de Beta aislada.

Pendiente MIG-026:
- Reconciliar inventario completo contra los servicios vigentes.
- Resolver acceso a Spreadsheet sin configuración local conforme a MIG-006/MIG-008; no sustituir `openById` sin evidencia del contexto real.
- Migrar parámetros y estados operativos uno por uno con paridad, sin mover ledgers ni secretos a configuración genérica.
- Completar revisión estática, pruebas y registros antes de iniciar MIG-027.
================================================================================


================================================================================
RESULTADO DE CI — MIG-026 — 2026-11-23
Commit: 169a249875eabdd32db234940e0c74e9bcca8773
GitHub Actions run: 45290329039
- Verificación de rama/repositorio: PASS.
- Sintaxis de módulos JavaScript modificados: PASS.
- Suite AdminCentralCortesFolderConfiguration: 4/4 PASS.
- Regresión global: 418 suites iniciadas; 4,671 pruebas aprobadas; 1 suite fallida.
- Fallo: `JS/Tests/FeedbackLockFastFail.mjs`, comprobación histórica que espera ausencia de `LockService` en FEEDBACK. El log muestra el fallo en el run anterior 45289392165, antes del commit MIG-026 (417 suites, 4,667 pruebas, misma suite fallida). Se considera fallo preexistente y fuera del cambio MIG-026; no se modifica FEEDBACK como parte de esta tarea sin análisis propio.
- No se ejecutó Beta real ni se accedió a recursos de Apps Script, Drive o Spreadsheet.
Estado MIG-026: EN PROGRESO. No iniciar MIG-027.
================================================================================


================================================================================
RECONCILIACIÓN ESTÁTICA — MIG-026 — 2026-11-23
Rama: GPSpedia2.2.5_work
HEAD de partida: 4a3c93b007902db3cb90c21c9bdf9d732b0830c8
Rama base protegida: GPSpedia2.2.5 (sin cambios)

Actividad:
- Reconciliado INVENTARIO_CONFIGURACION_BACKEND.md con los módulos vigentes después de MIG-024/MIG-025.
- AUTH, CATALOG y UTILITIES conservan SPREADSHEET_ID/openById; WRITE, FEEDBACK, ADMIN y CentralConfigurationReader usan Spreadsheet activa.
- SharedSessionActor conserva fallback a SPREADSHEET_ID/openById cuando no se inyecta proveedor.
- Clasificadas las propiedades activas de AUTH (login, revocación, secreto HMAC), CATALOG (feed), WRITE (contador IDs), FEEDBACK (rich_text_mode) y ADMIN (auditoría, Safe Apply, contador, guardas y estado de auditoría Drive).
- CentralConfigurationReader es lector/proyector; no se encontró un publicador central versionado. No se retiró GPSpedia_RICH_TEXT_MODE_V1 ni se alteró su flujo.
- MIG006SpreadsheetAccessProbe: el contrato local simula el contenedor activo; no prueba un deployment Web App real.
- La lista Beta histórica contiene expectativas de rich_text_mode basadas en localStorage y aislamiento por dispositivo; deberán actualizarse al completar la migración central, conservando los casos de RBAC y sanitización.

Resultado:
- Inventario y matriz MIG-026 actualizados con clasificación, evidencia y dependencias.
- Sin cambios funcionales ni modificaciones a proyectos Apps Script, deployments, PropertiesService instaladas, Spreadsheet, Drive o datos externos.
- MIG-026 continúa EN PROGRESO. No iniciar MIG-027.

Siguiente acción:
1. Diseñar la publicación central versionada de parámetros con autorización Developer, read-back, historial, caché e invalidación; probarla localmente sin despliegue.
2. Mantener pendiente de Beta la comprobación real de getActiveSpreadsheet() para AUTH/CATALOG/UTILITIES y los consumidores SharedSessionActor.
3. Migrar estados operativos únicamente en sus tareas específicas, con ledger, idempotencia y recuperación.
================================================================================


================================================================================
CIERRE DE SUBTRAMO — MIG-026 / rich_text_mode — 2026-11-24
Rama: GPSpedia2.2.5_work
HEAD verificado al iniciar el registro: 1d99f0ef16ba6746b82474677ca91f8e758d73ad

Implementación:
- ADMIN publica rich_text_mode en configuración central con RBAC Developer, lock, idempotencia, revisión, historial y read-back.
- FEEDBACK lee la configuración central y expone invalidación; el frontend coordina las acciones por el registro central de rutas.
- La caché local exige modo/revisión/metadatos y tiene TTL de 5 minutos; el fallback ante caché inválida/vencida es estricto.
- Se actualizó la prueba Beta AUG-097: preferencia global, caché no autoritativa y sincronización segura antes de ejecutar pruebas.
- Se registró la prueba RichTextGlobalPreference.mjs en el grupo MIG026 del runner de regresión.

Validación comprobada en GitHub Actions:
- Sintaxis de módulos JavaScript modificados: PASS.
- CentralConfigurationPublisherContract: 6/6 PASS.
- RichTextGlobalPreference: 10/10 PASS.
- Regresión general: 4,687 pruebas PASS; 1 suite falla en GP-PERF FEEDBACK/Inbox porque una aserción prohíbe el uso de LockService en FEEDBACK. El fallo exacto también aparece en run 45291268637 (23-11-2026), anterior a esta implementación; no es una regresión de MIG-026. Se conserva como hallazgo previo, sin modificar código fuera de alcance.
- Run de la rama para HEAD 1d99f0ef16ba6746b82474677ca91f8e758d73ad: service-tests FAILED únicamente por esa suite; revisar logs del run 45293812557.

Límites:
- No se desplegó Apps Script ni se modificaron proyectos, propiedades instaladas, hojas, Drive ni datos externos.
- La limpieza de la propiedad física antigua, si existe en proyectos desplegados, y las pruebas con deployments reales quedan pendientes de Beta autorizada.
- No se modificó la rama base GPSpedia2.2.5.

Estado:
- Subtramo de código rich_text_mode: COMPLETADO CON VALIDACIÓN DIFERIDA.
- MIG-026 global: EN PROGRESO. Permanecen pendientes el acceso central de AUTH/CATALOG/UTILITIES, las migraciones específicas de estado/ledgers, la búsqueda estática final y la validación Beta.
- No iniciar MIG-027.

Siguiente paso:
1. Continuar MIG-026 con la siguiente dependencia local segura, sin asumir que los proyectos Web App obtienen Spreadsheet activa hasta contar con evidencia.
2. Mantener las verificaciones de deployments/PropertiesService para Beta.
================================================================================


================================================================================
RECONCILIACIÓN ESTÁTICA MIG-003 — MIG-026 — 2026-11-24
Rama: GPSpedia2.2.5_work
HEAD de partida: b943119269a7b9f7cd90eff6546cd279ec39ec76

- Enumerados los archivos activos de JS/Services: 9 módulos; users.js, Coordinator.js y SharedMutationClient.js no están presentes como módulos independientes.
- Confirmado acceso a ScriptProperties en 4 módulos: AUTH, WRITE, CATALOG y ADMIN. Se clasificaron 12 familias vigentes; las familias Coordinator/SharedMutation y rich_text_mode local no aparecen ya en el código activo.
- AUTH/CATALOG/Utilities conservan SPREADSHEET_ID para su Spreadsheet operativa; WRITE/ADMIN/FEEDBACK/CentralConfigurationReader usan Spreadsheet activa. openById en WRITE/ADMIN se limita a backups/copias/rollback. SharedSessionActor conserva fallback condicional.
- No se asumió que getActiveSpreadsheet funcione en Web Apps de AUTH/CATALOG/Utilities. MIG-006/MIG-008 requieren evidencia Beta real antes de cambiar esos accesos.
- No se accedió a Apps Script desplegado, PropertiesService instalado, Spreadsheet ni Drive; tampoco se borraron valores externos.

Resultado: reconciliación estática MIG-003 COMPLETADA; validación de valores huérfanos y contexto de ejecución diferida a Beta. MIG-026 sigue EN PROGRESO; no iniciar MIG-027.

Siguiente paso: continuar con las dependencias locales de MIG-026 que no requieran asumir comportamiento de Web Apps ni migrar ledgers fuera de sus tareas específicas.
================================================================================


================================================================================
SUBTRAMO MIG-026 — PROVEEDOR EXPLÍCITO SharedSessionActor — 2026-11-24
Rama: GPSpedia2.2.5_work
HEAD de partida: 68630e978159d0344f55cd98d7a24486ef755340

Implementación:
- SharedSessionActor ya no lee SPREADSHEET_ID global ni contiene fallback a SpreadsheetApp.openById.
- loadSharedSessionActorFromSpreadsheet_ exige deps.loadSpreadsheet y valida el contenedor recibido; si falta, falla cerrado.
- AUTH inyecta getAuthUsersSpreadsheet_ en cuatro rutas; ADMIN y WRITE inyectan getSpreadsheet; UTILITIES inyecta su proveedor basado en SPREADSHEET_ID local.
- Se actualizaron los contratos de WRITE, ADMIN, AUTH, UTILITIES, actividad de sesión, tráfico directo, KDF y fixtures de paridad AUTH.

Validación:
- Sintaxis de todos los módulos JavaScript modificados: PASS.
- MIG013SessionActorLocalLookup: 22/22 PASS.
- PasswordKdfBenchmark: 5/5 PASS.
- Regresión CI: 4,688 pruebas aprobadas; 1 suite falla en FeedbackLockFastFail por una aserción estática que prohíbe LockService en FEEDBACK. El fallo exacto ya estaba presente en runs previos (45291268637 y 45289392165); no es causado por este cambio.
- Run de evidencia del HEAD 0f53fe3f941715b75c8198314efbbb9c54f434ae: 45298456129. Sintaxis PASS; MIG013SessionActorLocalLookup 22/22 PASS; regresión 4,688 pruebas PASS y una única suite fallida, FeedbackLockFastFail. La misma aserción estática aparece en runs previos a MIG-026 (45291268637 y 45289392165); no se atribuye a este cambio.
- No se desplegó Apps Script ni se modificaron PropertiesService, Spreadsheet, Drive o datos externos.

Estado:
- Retiro del fallback implícito de SharedSessionActor: COMPLETADO CON VALIDACIÓN DIFERIDA.
- MIG-026 global: EN PROGRESO.
- AUTH/CATALOG/Utilities conservan IDs operativos; su sustitución sigue sujeta a MIG-006/MIG-008 y prueba Beta real.
- No iniciar MIG-027.

Siguiente paso:
1. Verificar el CI del HEAD actual y cerrar este subtramo documentalmente.
2. Continuar MIG-026 únicamente con cambios locales que no requieran asumir el contexto de ejecución de Web Apps ni migrar ledgers fuera de sus tareas específicas.
================================================================================


================================================================================
REVISIÓN PRELIMINAR DE INTERCONEXIÓN BACKEND — MIG-026 — 2026-11-24
- Se inspeccionaron los 9 módulos activos buscando UrlFetchApp, URLs de Web Apps, *_SERVICE_URL, GPSpedia_COORDINATOR_*, secretos compartidos y referencias Coordinator/SharedMutation.
- No se encontraron endpoints script.google.com/macros/s ni llamadas backend→backend entre servicios GPSpedia en los módulos revisados.
- Las referencias UrlFetchApp restantes se asocian a imágenes/URLs, YouTube o APIs Google/Drive.
- AUTH conserva GPSpedia_PASSWORD_RECOVERY_SECRET_V1 como secreto HMAC propio de recuperación; no se clasifica como secreto compartido y su almacenamiento futuro requiere diseño de seguridad específico.
- Esta es una revisión preliminar de JS/Services, no la búsqueda estática global final. MIG-026 continúa EN PROGRESO.
================================================================================


- Se añadió Tareas_Beta.md §6.6 para las pruebas diferidas de MIG-026: acceso real a Spreadsheet, proveedor explícito de SharedSessionActor, publicación/lectura global de rich_text_mode, TTL/invalidation, sanitización y revisión de propiedad legacy. Incluye comandos seguros de sincronización al inicio; no se ejecutó ninguna prueba Beta ni se tocó un deployment.


================================================================================
SUBTRAMO MIG-026 — LEDGER DEL FEED CATALOG — 2026-11-24
HEAD validado: c44728e851839540ba8d2489caa78bbff0dc80a6

- Migrado el almacenamiento de revisión/eventos del feed CATALOG desde ScriptProperties a las hojas privadas CatalogChangeState y CatalogChangeEvents.
- El esquema es obligatorio y versionado; no se crean hojas automáticamente. Esquema inválido/ausente produce fallo cerrado.
- CatalogChangeState A:D: schemaVersion, revision, minRevision, updatedAt.
- CatalogChangeEvents A:J: revision, collection, recordId, operation, snapshotJson, createdAt, sourceService, sourceOperation, sourceRequestId, resetRequired.
- Se mantienen lock, idempotencia, revisión monotónica, retención activa 100, cursor, reset y lectura de confirmación. Los eventos no persisten identidad ni token.
- CatalogChangeFeed.mjs 18/18 PASS; regresión 4,690 PASS con una única suite fallida preexistente FeedbackLockFastFail. Sintaxis modificada PASS.
- CATALOG ya no contiene PropertiesService ni las claves GPSpedia_CATALOG_CHANGE_*.
- No se crearon hojas reales, no se ejecutó deployment y no se borraron propiedades instaladas antiguas.

Estado de MIG-026:
- CATALOG feed ledger: COMPLETADO EN CÓDIGO; VALIDACIÓN DE HOJAS/DEPLOYMENT DIFERIDA A BETA.
- Permanecen AUTH, WRITE y ADMIN con estado en ScriptProperties; además AUTH conserva secreto HMAC propio.
- MIG-006/MIG-008 y acceso de AUTH/CATALOG/UTILITIES a Spreadsheet siguen sujetos a Beta.
- No iniciar MIG-027.

Siguiente paso: elegir la siguiente familia de estado de AUTH/WRITE/ADMIN y migrarla como subtramo independiente, con su contrato de recuperación e idempotencia. No borrar valores instalados sin autorización Beta.
================================================================================


- Endurecimiento del feed CATALOG: un ledger vacío devuelve resetRequired para impedir que clientes con snapshot local antiguo interpreten la ausencia de eventos como feed vigente. Beta debe publicar el reset inicial como Desarrollador (revisión 1) antes de habilitar clientes.
- CI del HEAD 96f17733e26c5c96b2235d7c2da35bcccdd6c8a3, run 45299704239: sintaxis PASS; CatalogChangeFeed 19/19 PASS; regresión 4,691 PASS y una suite fallida preexistente FeedbackLockFastFail.


================================================================================
ANÁLISIS DE SIGUIENTE SUBTRAMO — WRITE CORTES ID HIGH-WATER — 2026-11-24
- WRITE ya mantiene el ledger append-only CortesIdReservations (opId, operationHash, vehicleId, createdAt) para las reservas modernas.
- La propiedad GPSpedia_CORTES_LAST_ID aún se consulta en getCortesVehicleIdHighWaterMark_ y se actualiza durante freezeCortesIds.
- No retirar directamente: el valor puede conservar IDs históricos que ya no aparecen en Cortes ni en el ledger. El próximo cambio debe sembrar un baseline idempotente por encima del máximo entre propiedad, hoja y ledger, verificar lectura y concurrencia, y solo después eliminar la dependencia normal de ScriptProperties.
- Pruebas relacionadas existentes: WriteVehicleIdReservationOutsidePhysicalLock.mjs, WriteFreezeCortesIdsBackupOutsideLock.mjs, AdminLegacyCutReservation.mjs y AdminCutSlotReservation.mjs.
- No se modificó código WRITE en este subtramo ni se accedió a datos reales. La migración WRITE queda como siguiente tarea local dentro de MIG-026.
================================================================================


================================================================================
VERIFICACIÓN FINAL DEL CORTE — 2026-11-24
- Rama de trabajo HEAD: b2a919af6342927e9e7155cfeb3e29f3fc0cb860.
- Rama base protegida GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificaciones).
- CI service regression run 45300194745: 420 suites, 4,691 pruebas aprobadas, 1 suite fallida: FeedbackLockFastFail. El fallo es el contrato estático que prohíbe LockService en FEEDBACK, reproducido antes de MIG-026.
- GitHub Pages build/deploy automático run 45300194094: SUCCESS. No se desplegó Apps Script.
- Último código probado: commit 96f17733e26c5c96b2235d7c2da35bcccdd6c8a3; HEAD posterior solo contiene documentación de continuidad.
- MIG-026 sigue EN PROGRESO. Próximo subtramo: migración baseline del contador WRITE GPSpedia_CORTES_LAST_ID al ledger CortesIdReservations; después AUTH y ADMIN. Las validaciones de Spreadsheet Web App y limpieza de propiedades instaladas permanecen en Beta.
================================================================================


================================================================================
SUBTRAMO MIG-026 — BASELINE DEL CONTADOR WRITE — 2026-11-24
Rama: GPSpedia2.2.5_work
HEAD anterior confirmado: ec16ec95f0643c36934355b1650c1da38ec1696b

Implementación:
- WRITE migra GPSpedia_CORTES_LAST_ID al ledger append-only CortesIdReservations mediante el marcador determinista OP-BASELINE-CORTES-LAST-ID-V1.
- El baseline captura el máximo entre IDs físicos válidos de Cortes, reservas existentes y contador heredado; acepta cero sin consumir un ID de vehículo.
- La inicialización es idempotente, usa un lock fail-fast solo durante la primera siembra, confirma append + flush + read-back y falla cerrado ante marcador duplicado/corrupto.
- Las reservas normales verifican/aseguran el baseline y calculan el siguiente ID desde Cortes + ledger; getCortesVehicleIdHighWaterMark_ deja de consultar ScriptProperties.
- freezeCortesIds deja de escribir GPSpedia_CORTES_LAST_ID; conserva su dry-run, respaldo y conversión de fórmulas.
- Se añadió JS/Tests/WriteCortesIdLedgerBaseline.mjs y se registró en el grupo MIG026 del runner.

Validación:
- CI service regression run 45304345999 sobre este commit: sintaxis PASS; 337 suites procesadas; 3,882 pruebas aprobadas y 3 suites fallidas fuera del subtramo WRITE: WriteCatalogPublicationIsolation (registrada en dos grupos del runner) y FeedbackLockFastFail. No se atribuyen estos fallos a la migración del contador; el contrato de FeedbackLockFastFail ya constaba en ejecuciones anteriores.
- Suites específicas: WriteCortesIdLedgerBaseline 13/13; WriteVehicleIdAllocationIdempotency 12/12; WriteVehicleIdAllocatorBoundedRead 11/11; WriteFreezeCortesIdsBackupOutsideLock 5/5; WriteAuthorizationMinimization 15/15; WriteIdAllocatorNonBlocking 7/7.
- GitHub Pages build/deploy automático run 45304344734: SUCCESS. No se desplegó ningún proyecto Apps Script.
- No se ejecutaron Apps Script, Spreadsheet, Drive ni pruebas Beta reales; la paridad del ledger y la limpieza de propiedades instaladas quedan diferidas a Beta.

Estado:
- Subtramo WRITE high-water: COMPLETADO EN CÓDIGO Y CI ESPECÍFICA.
- MIG-026 global: EN PROGRESO. Pendientes: migraciones de estado AUTH/ADMIN, acceso Spreadsheet de AUTH/CATALOG/UTILITIES, búsqueda estática global y validación Beta.
================================================================================


================================================================================
CIERRE DEL SUBTRAMO WRITE — MIG-026 — 2026-11-24
HEAD de trabajo: 60223d2943ec6d7f2ed4e3dd4b24830e32fcb08c
Rama base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificaciones).

Commits del subtramo:
- 0a7e9acedd — implementación inicial del baseline WRITE.
- 674aea392b / dd4db06843 / f6153d044a / 19ad6f2188 — correcciones de inicialización y lock, y contratos.
- ff8ae0af42 / 50435ada11 / 95fa37a2bd / 3518ebf512 / 60223d2943 — actualización de regresiones, pruebas runtime del baseline y validación de integridad.

Resultado:
- El marcador OP-BASELINE-CORTES-LAST-ID-V1 es determinista, único y no consume un ID de vehículo.
- La propiedad heredada solo se lee durante la siembra inicial; las asignaciones posteriores dependen de Cortes + CortesIdReservations.
- freezeCortesIds conserva backup, dry-run y confirmación; no vuelve a escribir GPSpedia_CORTES_LAST_ID.
- El código no ha sido desplegado en Apps Script. No borrar la propiedad instalada ni ejecutar la migración sobre datos productivos.

Siguiente subtramo pendiente por orden del backlog: estado de AUTH, con análisis específico del secreto HMAC y mecanismos de sesión/revocación antes de elegir almacenamiento. No iniciar ADMIN en paralelo.
================================================================================


================================================================================
MIG-026 — AUTH — RETIRADA DEL SECRETO HMAC DE RECUPERACIÓN — 2026-11-24
Commit de código: 1cf831e2165793b19180de1c3474231b752ac061
Commit de corrección del contrato: 233ba43f660b85a181528fe365cc511a2e4881a2

Cambios:
- getPasswordRecoveryManager_ ya no lee ni crea GPSpedia_PASSWORD_RECOVERY_SECRET_V1.
- El código de recuperación pasa de 12 a 24 caracteres hexadecimales (96 bits aleatorios).
- CacheService conserva digests SHA-256 y estados temporales; se mantienen expiración de 10 minutos, consumo único, cinco intentos y límite de tres solicitudes por hora.
- Se actualizaron Auth.js, fixture JS/Tests/Auth.js, PasswordRecovery.mjs, index.html y Service Worker v75.

Validación:
- PasswordRecovery: 10/10 PASS; fixture/paridad AUTH PASS; sintaxis PASS.
- CI run 45305099851: 337 suites, 3,882 pruebas aprobadas; tres fallos fuera de alcance: WriteCatalogPublicationIsolation (dos grupos) y GP-PERF FEEDBACK/Inbox.
- GitHub Pages run 45305099649: SUCCESS.
- No se desplegó Apps Script ni se accedió a PropertiesService instalado. La clave legacy no tiene consumidores en el código nuevo, pero su eliminación física queda para Beta.

Siguiente tarea AUTH: migrar idempotencia de login (prefijo login_request_) a estado persistente recuperable sin ScriptProperties. Mantener después, como tarea separada, los marcadores de revocación de rol.
================================================================================


================================================================================
MIG-026 — AUTH — MIGRACIÓN DE IDEMPOTENCIA DE LOGIN — 2026-11-24
Código y pruebas: commit 7c4b342d66623d078101f3f50cb3879e374f40c3.
Commits de implementación: 011d386462b5da6daa3fd90956b9593065aba0da; ajuste de locks fail-fast cf5af534f1c33d996d9f11ca45d5a6569cc85c62.
Rama base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificaciones).

Cambios:
- Estado login_request_ migrado a hoja operativa LoginRequests, esquema de 10 columnas y baseline idempotente/reanudable.
- El baseline importa legacy una sola vez, verifica read-back y no escribe ni elimina propiedades. El flujo normal de login no consulta ScriptProperties.
- Recuperación del mismo token entre reintentos; append ambiguo reconciliado; revocación por usuario/token; TTL 24 h y limpieza rotatoria de 25 filas por ejecución.
- Eliminadas todas las llamadas waitLock en AUTH. Las operaciones protegidas usan tryLock(0) y no esperan por otra ejecución; los conflictos se devuelven inmediatamente para reintento.
- Fixture AUTH y mocks de pruebas sincronizados con LockService/SpreadsheetApp reales.

Validación CI run 45308365799:
- Sintaxis PASS; 338 suites procesadas; 3,921 pruebas aprobadas.
- LoginRequestLedger 39/39; PasswordRecovery 10/10; AUTH operativo/copia 32/32; fixture/paridad 1/1; perfil/revocación 23/23; UI invalidación 18/18.
- Tres fallos ajenos a esta tarea: WriteCatalogPublicationIsolation (dos grupos) y GP-PERF FEEDBACK/Inbox.
- GitHub Pages run 45308365427: SUCCESS.
- No se desplegó Apps Script ni se accedió a PropertiesService instalado.

Pendiente Beta: baseline sobre Spreadsheet real, concurrencia entre ejecuciones, respuesta perdida, expiración/limpieza y autorización para retirar propiedades legacy. Consultar Tareas_Beta.md §9.

Siguiente tarea MIG-026, por orden: migrar los marcadores role_revocation_pending_ de AUTH. No iniciar ADMIN en paralelo.
================================================================================


================================================================================
MIG-026 — AUTH — MIGRACIÓN DE MARCADORES DE REVOCACIÓN — 2026-11-24
Commit de implementación: e09779ae200c3304b00a31b60e317192de986425.
Commit de ajuste de harness protegido: 8ed3a0d6f50fd0cd30eb79bfc1c3c5e5e9330071.
Commit de validación/fixture: fae502c3daa7365fa550f4ddd512242ae887e5ef.
Commit de harness benchmark: d96129b4548cebe417b6759498e1817ffbca52eb.
Rama base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificaciones).

Cambios:
- role_revocation_pending_ se migra al marcador compartido en Users.SessionToken.
- Baseline reanudable guardado en LoginRequests, fila 2 columna H. Lee legacy una sola vez, valida identidad/rol/duplicados/divergencias, verifica read-back y marca versión al completar.
- hasPendingRoleRevocation_ y reconcileRoleRevocationUnderLock_ ya no consultan PropertiesService. Se retiraron las escrituras/eliminaciones legacy.
- doPost ejecuta baseline antes de resolver actor protegido; login, validación de sesión, logout y recuperación lo aseguran bajo el lock ya adquirido.
- Todas las adquisiciones AUTH ScriptLock usan tryLock(0); no hay waitLock ni tryLock temporizado.

Validación CI run 45310018557:
- Sintaxis PASS; 339 suites; 3,961 pruebas aprobadas.
- RoleRevocationLedger 39/39; LoginRequestLedger 40/40; PasswordRecovery 10/10; AUTH operativo/copia 32/32; fixture/paridad 1/1; perfil/revocación 23/23; PasswordKdfBenchmark 5/5.
- Tres fallos externos: WriteCatalogPublicationIsolation (dos grupos) y GP-PERF FEEDBACK/Inbox.
- GitHub Pages run 45310017580: SUCCESS.
- No se desplegó Apps Script ni se modificaron propiedades instaladas.

Pendiente Beta: probar baseline con Spreadsheet real, interrupciones, concurrencia, cambio de rol y revocación completa; no borrar propiedades legacy sin autorización. Consultar Tareas_Beta.md §10.

Siguiente tarea MIG-026: primera familia de estado ADMIN, una familia por tarea, siguiendo el inventario y sus dependencias. No ejecutar migraciones ADMIN en paralelo.
================================================================================


================================================================================
MIG-026 — ADMIN — MIGRACIÓN DE AUDITORÍA PERSISTENTE — 2026-11-24
HEAD de código funcional: 8082c467ca705c9c0757619898288a819d4b68ee.
HEAD de trabajo/documentación y contratos: fe8669567101d53639ecf4e1e5c467429796980b.
Commits principales:
- 7ae0207d14 — ledger AdminOperationAudit y baseline legacy.
- ea05f4530a — baseline por lote y limpieza por lotes; harness de regresión.
- 8475e4402a — rechazo de filas huérfanas durante baseline.
- 8082c467ca — sanitización de legacy/filas y resumen parcial allowlist.
- 41520882b4 — registros de inventario, tarea y Beta.
- 91cd783e21 / fe86695671 — alineación final del contrato de inventario y prueba CI.
Rama base protegida: d9acc68d889985c2e2f42fe3a02e502efc86ead1 (sin modificaciones).

Cambios:
- La auditoría ADMIN deja de usar GPSpedia_ADMIN_AUDIT_V1_<eventId> como estado ordinario y pasa a AdminOperationAudit (A:P, 16 columnas). La fila 2 queda reservada para META/BASELINE; los eventos comienzan en fila 3.
- Baseline único, idempotente y reanudable: lectura legacy, validación de identidad/esquema, importación por lote, read-back, detección de duplicados/filas huérfanas y rechazo de datos corruptos. Las propiedades legacy no se escriben ni eliminan.
- Los campos importados se normalizan; partialResult conserva únicamente contadores/booleanos permitidos. No se copian mensajes, payloads ni credenciales.
- El flujo normal de inicio/cierre/prune opera sobre la hoja. Los locks usan tryLock(0), sin waitLock ni esperas temporizadas. La auditoría es best-effort: contención/esquema ausente no bloquea la operación funcional; se devuelve advertencia.
- Retención 180 días, 300 finalizados, 20 pendientes; eventos STARTED no se purgan; limpieza de filas por lotes.

Validación:
- AdminAuditTrail 27/27 PASS.
- CI run 45317266195: 495 suites, 5,799 pruebas aprobadas, 0 fallos; sintaxis 457 archivos y referencias 377 archivos PASS.
- GitHub Pages run 45317265579: SUCCESS.
- No se desplegó Apps Script, ni se creó/modificó Spreadsheet real, ni se modificaron propiedades instaladas.

Pendiente Beta: crear AdminOperationAudit con encabezados exactos (fila 1; fila 2 vacía), probar baseline real, interrupciones, append/read-back, lock contention, operaciones concurrentes, retención y ausencia de secretos; no borrar GPSpedia_ADMIN_AUDIT_V1_ durante la prueba. Consultar Tareas_Beta.md §11.

Estado de familias: AUTH 0, WRITE 1, ADMIN 5; total 6. Siguiente subtramo por orden del inventario: GPSpedia_CORTES_ORGANIZER_OP_V1_<sha256(operationId)> (Safe Apply). No iniciar otra familia ADMIN en paralelo.
================================================================================

================================================================================
MIG-026 — ADMIN — SAFE APPLY DEL ORGANIZADOR CORTES — 2026-11-23
HEAD anterior confirmado: b6efb93073ce3785f3ef9ba7bb10e72a0b940cc3

- Migrado el ledger `GPSpedia_CORTES_ORGANIZER_OP_V1_<sha256(operationId)>` desde ScriptProperties a `CortesOrganizerOperations` (20 columnas). La fila 2 queda reservada para META/BASELINE y los registros comienzan en fila 3.
- Baseline idempotente y reanudable: lee propiedades legacy, valida digest/operationId/identidad/estado, importa filas faltantes, verifica read-back y marca `cortes_organizer_ledger_v1`. No escribe ni elimina propiedades legacy; el flujo normal deja de consultarlas después del baseline.
- Lectura por operationId, reserva/upsert bajo lock fail-fast breve, historial paginado por propietario, read-back y retención de 180 días (200 terminales/250 totales). Estados no terminales se conservan.
- La adquisición usa `tryLock(0)`; el ScriptLock solo protege el ledger y se libera antes de Drive. La ejecución y rollback no mantienen locks durante operaciones Drive. La contención devuelve retry sin iniciar un movimiento.
- Se añadió reconciliación de estados `processing`/`rollback_processing` cuando Drive ya refleja el destino/origen, para recuperar una respuesta perdida sin repetir el movimiento.
- Pruebas actualizadas: baseline, reanudación, no escritura de propiedades, historial, retención y lock fail-fast; prueba de dos operaciones sobre archivos distintos durante trabajo Drive.
- No se desplegó Apps Script ni se creó/modificó Spreadsheet o Drive real. Las propiedades legacy instaladas no se tocaron.

Estado provisional: pendiente ejecutar CI sobre el commit publicado y revisar sus resultados antes de marcar el subtramo como completado. Beta diferida en Tareas_Beta.md §12.
================================================================================

================================================================================
CI Y CIERRE LOCAL — MIG-026 ADMIN SAFE APPLY — 2026-11-23
HEAD de implementación y pruebas: dc00d522282de6b25a6596401f784c7b8353cc49
Commit de implementación: 80faf4157e77974a5dbddb4c21963e3fb478ab19
Commit de ajuste de contratos: dc00d522282de6b25a6596401f784c7b8353cc49

- Primera ejecución CI del commit de implementación: detectó discrepancias en el contrato UI del historial y en el reloj de la prueba de retención. Se corrigieron las pruebas, sin cambiar la política de retención ni el comportamiento funcional.
- CI final run 45324879054: sintaxis PASS; 496 suites, 5,820 pruebas aprobadas, 0 fallos.
- Suites específicas: CortesImageOrganizerExecutor 20/20; CortesImageOrganizerLedger 9/9; CortesImageOrganizerUiContract 15/15.
- La prueba de concurrencia ejecuta una segunda operación sobre otro archivo durante el trabajo Drive de la primera y confirma que el lock del ledger ya está liberado.
- GitHub Pages build/deploy run 45324878517: SUCCESS.
- Rama base GPSpedia2.2.5: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin modificaciones.
- No se desplegó Apps Script ni se creó/modificó Spreadsheet/Drive real. Las propiedades legacy instaladas permanecen intactas.

Resultado del subtramo Safe Apply: COMPLETADO EN CÓDIGO Y CI; VALIDACIÓN DIFERIDA A BETA. MIG-026 global continúa EN PROGRESO. Siguiente familia por orden del inventario: GPSpedia_UNUSED_IMAGES_FOLDER_ID / recurso unused_images_folder_id o la siguiente familia ADMIN definida por el inventario actualizado; antes de elegirla, reconciliar el orden exacto y no ejecutar dos familias en paralelo.
================================================================================

================================================================================
MIG-026 ADMIN-02 — CIERRE DE GUARDAS TEMPORALES — 2026-11-23
HEAD de implementación y pruebas: b55e48ae3708c8fe6b72278d5d8cd11aee6f7159
Commit de migración: a0f31bc3dede78054da9323897318a060bf7f3fc
Commit de acceso lazy a ScriptProperties: b55e48ae3708c8fe6b72278d5d8cd11aee6f7159

- Migrada la familia GPSpedia_ADMIN_LOCAL_OPERATION_GUARD_V1_<sha256(scope)> a AdminOperationGuards, con cinco columnas y fila META/BASELINE.
- El baseline importa únicamente reservas vigentes; valida hash, requestId y expiresAt; admite reanudación; confirma read-back; no escribe ni elimina propiedades legacy.
- El flujo ordinario no obtiene el servicio ScriptProperties después de confirmar baseline. La prueba lazy verifica que getScriptProperties se invoca una sola vez durante baseline y cero veces en operaciones posteriores.
- Las reservas por scope usan TTL 30–420 s, purga de expiradas y límite de 500 activas. Same-scope concurrente se rechaza; scopes diferentes pueden ejecutarse anidados/solapados.
- ScriptLock usa tryLock(0) y se mantiene únicamente en baseline/reserva/cleanup. El callback Drive se ejecuta fuera del lock. Si cleanup no obtiene lock, la reserva expira; el callback de negocio conserva su resultado.
- AdminLocalOperationGuard 12/12 PASS.
- CI run 45325854986: 496 suites, 5,832 pruebas aprobadas, 0 fallos. Sintaxis PASS.
- GitHub Pages run 45325854063: SUCCESS.
- No se desplegó Apps Script ni se creó/modificó Spreadsheet/Drive real; propiedades legacy intactas.

Resultado: guardas temporales ADMIN migradas en código y CI; validación Beta pendiente. Estado de familias operativas: AUTH 0, WRITE 1, ADMIN 3 (4 total). Siguiente familia según inventario: GPSpedia_DRIVE_AUDIT_STATE_<auditId>. Después: puntero latest por actor y contador LOGOS_MARCA_ID_COUNTER. La limpieza estática global se realiza tras completar esas familias.
================================================================================

================================================================================
MIG-026 ADMIN-03 — CIERRE LOCAL DEL ESTADO REANUDABLE DRIVE — 2026-11-23
HEAD de implementación y pruebas: 7ccc136973babed24f7c007fd89812faccd09844
Commit de migración: 612d82ecdb705adf497e7c8f2025154f4605b2aa
Commit de ajuste del harness de pruebas: 7ccc136973babed24f7c007fd89812faccd09844

- GPSpedia_DRIVE_AUDIT_STATE_<auditId> migrado a DriveAuditRuns (8 columnas). El estado completo queda en stateJson; páginas, respuestas y snapshots grandes continúan en CacheService.
- Baseline valida UUID/auditId/owner/status/updatedAt, importa solo estados vigentes, es reanudable e idempotente, verifica read-back y marca drive_audit_state_baseline_v1. Las propiedades legacy se conservan sin setProperty/deleteProperty.
- save actualiza/upsert con read-back; load valida identidad y TTL de 6 horas; cleanup retira filas vencidas en lotes y limpia caches/latest pointer fuera del lock. Máximo 500 estados y stateJson máximo 8,000 caracteres.
- ScriptLock fail-fast tryLock(0), únicamente en baseline/save/cleanup; load no retiene lock. No se mantiene lock durante Drive. La contención devuelve DRIVE_AUDIT_STATE_BUSY y permite reintento.
- AdminReplacedImagesIntegrity: baseline vigente/vencido, read-back, no eliminación legacy, lock fail-fast, owner, TTL y contratos de snapshots aprobados.
- CI run 45327051980: sintaxis PASS; 496 suites, 5,841 pruebas aprobadas, 0 fallos.
- GitHub Pages run 45327050709: SUCCESS.
- No se desplegó Apps Script ni se creó/modificó Spreadsheet/Drive real. Beta pendiente.

Resultado: subtramo DriveAuditRuns COMPLETADO EN CÓDIGO Y CI; VALIDACIÓN BETA PENDIENTE. Siguiente familia según inventario: GPSpedia_DRIVE_AUDIT_LATEST_<hash(actor)>. Después: LOGOS_MARCA_ID_COUNTER; luego búsqueda estática global.
================================================================================

================================================================================
MIG-026 ADMIN-04 — CIERRE LOCAL DEL PUNTERO LATEST DRIVE — 2026-11-23
HEAD de implementación y pruebas: a7f8489861f1387027069b95b5fe73cfd60b6732
Commit de migración: da38a4e5b5dbe041e4fed5e4d3c9b8e275bd8527
Commit de ajuste de contrato legacy: a7f8489861f1387027069b95b5fe73cfd60b6732

- GPSpedia_DRIVE_AUDIT_LATEST_<hash(actor)> migrado a DriveAuditLatest (5 columnas). La fila de estado se resuelve por ownerHash y latestAuditId.
- Baseline usa DriveAuditRuns para resolver hash truncado a owner único y verificar que el puntero refiere a estado completo del mismo owner. Es idempotente/reanudable y confirma read-back.
- Los punteros huérfanos se omiten sin borrar propiedades legacy. El cleanup solo elimina punteros de Spreadsheet tras baseline latest completo; antes preserva ScriptProperties.
- getLatest valida owner y estado complete. save/upsert y cleanup usan tryLock(0) breve; no se retiene lock durante Drive. La contención devuelve DRIVE_AUDIT_LATEST_BUSY.
- AdminReplacedImagesIntegrity 64/64 PASS; baseline, punteros huérfanos, owner isolation, estado running, cleanup y fail-fast.
- CI run 45327887713: 496 suites, 5,856 pruebas aprobadas, 0 fallos. GitHub Pages run 45327886488 SUCCESS.
- No se desplegó Apps Script ni se creó/modificó Spreadsheet/Drive real. Propiedades legacy intactas.

Resultado: subtramo DriveAuditLatest COMPLETADO EN CÓDIGO Y CI; VALIDACIÓN BETA PENDIENTE. Estado de familias operativas: AUTH 0, WRITE 1, ADMIN 1 (2 total). Siguiente familia: LOGOS_MARCA_ID_COUNTER; luego búsqueda estática global.
================================================================================
