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
- Ninguna función se retira por no aparecer en el mapa de 120 acciones: se requiere inventario completo de UI, handlers y procesos manuales/internos.

### Documentos registrados en la rama de trabajo
- `NORMAS_DESAROLLO.md`: §17 establece configuración centralizada y paridad funcional.
- `PLAN_NUEVA_ARQUITECTURA_FRONTEND.md`: arquitectura objetivo, fases y criterios de aceptación.
- `TAREAS_MIGRACION_ARQUITECTURA.md`: 30 tareas con entregables y criterios.
- `MATRIZ_MIGRACION_SERVICIOS.md`: 120 acciones actuales más matriz CAP-01 a CAP-19 de capacidades a preservar.

### Estado verificado
- HEAD de `GPSpedia2.2.5_work`: `2a8c1dc449b9503963be82f1693faf5eb8d827ed`.
- HEAD de `GPSpedia2.2.5`: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.
- La rama base no se modificó.
- En esta actualización solo se modificaron documentos normativos/de planificación; no se cambió lógica funcional, deployments, Spreadsheet ni Drive.
- La matriz de 120 acciones ya está registrada, pero el inventario total de pantallas, handlers no mapeados, comandos y procesos internos sigue pendiente.

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
- Publicada en `MATRIZ_MIGRACION_SERVICIOS.md` una tabla de 120 acciones con servicio, handler y consumidor localizado. En la extracción no quedó ninguna acción del mapa sin dispatcher/handler.
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
