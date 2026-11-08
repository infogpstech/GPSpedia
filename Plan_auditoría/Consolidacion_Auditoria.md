# Consolidación de auditoría y matriz de validación — GPSpedia

**Plan:** AUD-PLAN-2026-001  
**Sesión:** AUD-20261107-S019  
**Checkpoint:** AUD-CP-0019  
**Fecha:** 2026-11-07  
**Repositorio:** infogpstech/GPSpedia  
**Rama de trabajo:** GPSpedia2.2.5_work  
**HEAD de referencia al inicio:** eb3b72e205ad8d772a4bd5cdad94fb3e26533917  
**Rama base:** GPSpedia2.2.5  
**HEAD de la base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  

## 1. Objetivo y límites

Consolidar el estado documentado de las 38 unidades AUD-T, organizar el inventario de tareas derivadas AUG y establecer una matriz de validación para la fase posterior. Esta consolidación es documental: no corrige hallazgos, no implementa tareas AUG, no modifica código, endpoints, configuración, Spreadsheet, Drive, datos productivos ni deployments.

La matriz es una planificación de pruebas, no evidencia de que estas se hayan ejecutado. Ninguna tarea se considera funcionalmente validada por el hecho de contar con auditoría estática E1.

## 2. Estado real del catálogo AUD-T

El plan contiene 38 unidades AUD-T. Según la tabla de estado vigente:

| Estado documental | Unidades | Cantidad |
|---|---|---:|
| Auditoría estática E1 completada, con hallazgos y/o validaciones pendientes | AUD-T-003 y AUD-T-023 a AUD-T-038 | 17 |
| Auditada parcialmente | AUD-T-002 | 1 |
| Por auditar | AUD-T-001 y AUD-T-004 a AUD-T-022 | 20 |
| **Total** | **AUD-T-001 a AUD-T-038** | **38** |

**Corrección de continuidad:** no es correcto afirmar que las 37 unidades AUD-T tienen auditoría estática completada. AUD-T-001 y AUD-T-004 a AUD-T-022 siguen marcadas POR AUDITAR; AUD-T-002 está auditada parcialmente. AUD-T-003 y AUD-T-023 a AUD-T-038 tienen E1 completada, pero conservan hallazgos y validaciones funcionales pendientes.

AUD-T-038 — seguridad del almacenamiento local y ciclo de datos de usuario — se auditó en AUD-20261107-S020. Su E1 está completada; permanecen hallazgos y validaciones funcionales/privacidad pendientes.

## 3. Inventario consolidado de tareas AUG

El archivo Plan_auditoría/Aug_Tareas.md contiene **57 identificadores AUG únicos** dentro del rango AUG-001 a AUG-058. El identificador AUG-015 no aparece en el registro consultado. No se debe crear, inferir, renumerar ni reutilizar AUG-015 sin recuperar evidencia histórica.

Algunos encabezados AUG se repiten en el archivo porque las auditorías posteriores agregaron adendas a tareas existentes. Esas repeticiones no constituyen tareas nuevas. Deben conservarse las adendas y sus referencias históricas.

### 3.1 Índice por dominio

| Dominio | Identificadores | Alcance consolidado |
|---|---|---|
| Gobierno, auditoría y continuidad | AUG-001 a AUG-004 | Protección técnica de rama, validación consolidada de deployments, contrato Utilities y trazabilidad de cancelaciones/sustituciones |
| AUTH, USERS y sesiones | AUG-005 a AUG-014; AUG-016 y AUG-017 | Revocación, expiración, sincronización entre pestañas, validación de usuario, serialización, KDF, intentos, logs y navegación al cambiar de cuenta/rol |
| ADMIN, respaldo y telemetría | AUG-018 a AUG-025 | Restore recuperable, límites de terminal Drive, actividad, auditoría durable, eliminación IndexedDB, rutas ADMIN, health check y métricas |
| Historial e inventario de imágenes / Drive | AUG-026 a AUG-033 | Integridad del historial, decisiones de alcance, auditoría del inventario, movimientos explícitos, deduplicación, persistencia, snapshots y rendimiento Drive |
| Coordinación y contratos entre servicios | AUG-034 a AUG-044 | Locks compartidos, idempotencia, contrato VIN/testigo, reconciliación de cargas, compensaciones, seguridad WRITE/FEEDBACK/UTILITIES, rol cliente, YouTube y mapa de acciones |
| Términos, privacidad y accesibilidad | AUG-045 a AUG-047 | Aceptación versionada, revisión legal y accesibilidad/navegación/offline de modales legales |
| Catálogo, búsqueda, VIN y PWA | AUG-048 a AUG-052 | Snapshot y sincronización, búsqueda, motor VIN, IndexedDB/miniaturas/privacidad local, startup/deep links/Service Worker/backend |
| Ciclo local de operaciones y seguridad de endpoints | AUG-053/AUG-054 | Aislamiento/retención de snapshots por cuenta; autenticación y minimización de checkOperation |
| Registro, idempotencia y recuperación de add_cortes | AUG-055 a AUG-058 | Ciclo durable/vinculación de opId; disponibilidad dinámica; errores FileReader; recuperación automática serializada |

El índice no reemplaza los criterios de aceptación detallados de Aug_Tareas.md. La implementación debe seguir consultando cada ficha completa, incluidas sus adendas, evidencias, decisiones y dependencias.

### 3.2 Clasificación de control

- **Entregables transversales o ya documentados:** AUG-001, AUG-002 y AUG-004 no deben duplicarse como nuevas correcciones. AUG-001 remite a una tarea equivalente de protección de rama; AUG-002 es una validación funcional consolidada que debe integrarse en la matriz; AUG-004 es un entregable de trazabilidad incluido en el plan.
- **Decisión funcional pendiente:** AUG-027 requiere resolver expresamente el alcance de referencias de imágenes y la separación entre historial de reemplazos e inventario sin uso antes de implementar cambios dependientes.
- **Dependencias de coordinación:** AUG-003/AUG-034 y las adendas relacionadas deben tratarse como fundamento de coordinación entre servicios; no asumir que ScriptLock de proyectos Apps Script distintos ofrece exclusión mutua compartida.
- **Adendas:** mantener AUG-021, AUG-026 y AUG-028, entre otras, como registros únicos con sus ampliaciones; no crear IDs nuevos por cada hallazgo relacionado.
- **Prioridad:** conservar la prioridad indicada en cada ficha AUG. Cuando una ficha no explicita prioridad, dejarla sin clasificar hasta que el registro sea actualizado con evidencia; esta consolidación no reasigna prioridades.

## 4. Dependencias y orden de trabajo propuesto

El siguiente orden es una secuencia de control y dependencias, no una modificación de las prioridades originales:

1. **Gobernanza y entorno de validación:** verificar protección de rama (AUG-001), inventariar deployments y su correspondencia con código (AUG-002), y mantener la trazabilidad de cancelaciones/sustituciones (AUG-004).
2. **Decisiones y coordinación transversal:** resolver el alcance de AUG-027 y diseñar/verificar la coordinación común entre servicios asociada a AUG-003/AUG-034 antes de ejecutar migraciones o mutaciones concurrentes.
3. **Identidad y autorización:** resolver las dependencias de sesión, rol y autorización que afectan AUTH/USERS/WRITE/ADMIN/FEEDBACK/UTILITIES (AUG-005 a AUG-017 y AUG-039 a AUG-042).
4. **Integridad de datos y operaciones recuperables:** abordar restauraciones, idempotencia, registro durable, historial de imágenes, inventario, cargas y compensaciones (AUG-018, AUG-021, AUG-026, AUG-028 a AUG-038).
5. **Contratos y observabilidad:** alinear rutas/dispatchers, YouTube y health check/telemetría (AUG-023 a AUG-025 y AUG-043/AUG-044).
6. **Experiencia, legal y catálogo:** tratar las tareas legales (AUG-045 a AUG-047) y catálogo/búsqueda/VIN/PWA (AUG-048 a AUG-052), con sus pruebas de regresión y offline.

Este orden no autoriza a ejecutar varias tareas en un solo commit. Cada tarea de implementación conserva su alcance, checkpoint, auditoría, respaldo, verificaciones, Code Review y único commit conforme al procedimiento obligatorio.

## 5. Matriz consolidada de validación

Las pruebas deben ejecutarse en entornos aislados y con cuentas/datos de prueba. No usar datos productivos para provocar fallos, concurrencia, restauraciones, borrados, movimientos o migraciones. Antes de una prueba que escriba en Drive o Spreadsheet, confirmar el proyecto, deployment, identidad y destino de prueba.

| ID de matriz | Área y tareas relacionadas | Casos mínimos que deben comprobarse | Evidencia exigida |
|---|---|---|---|
| VAL-01 | Identidad, sesiones y roles — AUG-005 a AUG-009, AUG-016, AUG-017, AUG-042, AUG-054 | Login/logout, revocación, cuenta eliminada, contraseña/caducidad según política aprobada, varias pestañas, cambio de cuenta/rol, modal privilegiado y navegación | Actor/rol efectivo, resultado del backend, estado cliente antes/después, sesiones invalidadas y ausencia de acceso residual |
| VAL-02 | Seguridad y consistencia AUTH/USERS — AUG-010 a AUG-014 | Mutaciones simultáneas, intentos concurrentes, purga de Logs con inserciones, validación de usuario/contraseña, migración de credenciales | Resultado por operación, conteos antes/después, ausencia de pérdida/duplicación y evidencia de migración reversible o recuperable |
| VAL-03 | WRITE/FEEDBACK/UTILITIES y contratos — AUG-003, AUG-034, AUG-039 a AUG-044 | Sesión ausente/expirada, rol insuficiente, payload incompleto o manipulado, acciones sin handler y handlers sin mapeo, escritura concurrente desde servicios distintos | Matriz acción→servicio→handler→consumidor, HTTP/JSON, actor autenticado, rechazo de operaciones no autorizadas y consistencia de registros |
| VAL-04 | Backup/restore y operaciones ADMIN — AUG-018 a AUG-023 | Backup completo/incompleto, manifiesto, restore con fallo inducido por etapa, rollback, terminal fuera de Cortes, logs grandes/fechas inválidas, acciones huérfanas, borrado IndexedDB bloqueado | Identificador y manifiesto de respaldo, comparación origen/destino, recuperación demostrada, límites de ruta y estados reales de cada operación |
| VAL-05 | Health check y telemetría — AUG-024/AUG-025 | HTTP 2xx con JSON válido/inválido/vacío/HTML, 4xx/5xx, timeout, endpoint equivocado, servicio lento, muestra caducada, límite de eventos y solicitudes que cruzan intervalos | Estado clasificado, código HTTP/motivo seguro, timestamps coherentes, conteos y comportamiento aislado por servicio |
| VAL-06 | Historial de imágenes y reemplazos — AUG-021, AUG-026, AUG-027, AUG-037, AUG-038 | Reemplazo, restauración, papelera, requiere_revision, cancelada, fila parcial/duplicada, ID/URL/MIME no coincidente, fallo de escritura y compensación | Estado histórico y archivo Drive reconciliados, actor, operationId, evidencia de rollback y filas no válidas visibles para revisión |
| VAL-07 | Inventario y organización Drive — AUG-003, AUG-028 a AUG-033 | Escaneo completo/incompleto, cursor y reanudación, inventario parcial, archivo con nueva referencia durante el lote, movimiento manual, duplicados, snapshots expirados, límite temporal y cuota | auditId, inventoryOperationId, resultado por archivo, referencias revalidadas antes de mover, ubicación conservada y conteos reconciliados |
| VAL-08 | Esquema, IDs e idempotencia — AUG-034 a AUG-036, AUG-055 | Migración en copia, encabezados ocupados, IDs duplicados, reintentos con mismo/diferente opId, recuperación de estado parcial, parsers VIN/testigo | Snapshot antes/después, unicidad, estado de idempotencia, compatibilidad de lectores y ausencia de sobrescritura de datos |
| VAL-09 | Cargas y ciclo de vídeo — AUG-037, AUG-038, AUG-043, AUG-056 | Carga interrumpida/reintentada, contenido distinto con mismo identificador, descarte de edición, aprobación/rechazo, videoId provisional y sincronización del destino | Hash/contenido, ledger, historial, estado de aprobación y destino final coherentes; operaciones repetidas idempotentes |
| VAL-10 | Términos y accesibilidad — AUG-045 a AUG-047 | Primera aceptación, nueva versión, cambio de cuenta/dispositivo, almacenamiento bloqueado, modal ausente, teclado, foco, lector de pantalla, History API y offline | Versión/identidad/fecha conforme a decisión aprobada, bloqueo seguro, foco y navegación correctos, revisión legal documentada |
| VAL-11 | Catálogo, caché y sincronización — AUG-048/AUG-052 | Alta, edición y eliminación de registros; cambios con igual cardinalidad; reinicio offline; instantánea y delta; timeouts y respuestas inválidas | Comparación de datos de origen y caché, ausencia de registros retirados, sincronización recuperable y estado terminal visible |
| VAL-12 | Búsqueda y VIN — AUG-036, AUG-049/AUG-050 | Acentos, mayúsculas, espacios, campos de cada sección, coincidencia exacta/parcial, años/modelos numéricos ambiguos, VIN exacto/prefijo y variantes múltiples | Conjunto de resultados esperado, ranking, sección/modal correcto, ambigüedades explícitas y variante identificada sin selección arbitraria |
| VAL-13 | IndexedDB, miniaturas y privacidad local — AUG-022, AUG-031/AUG-032, AUG-051, AUG-053 | Transacción complete/abort/error, upgrade bloqueado, cuota/evicción, URLs de objeto, tamaños de miniatura, cuentas distintas, retención y limpieza | Confirmación de transacción, límites de almacenamiento, ausencia de datos cruzados entre cuentas y revocación/liberación de recursos |
| VAL-14 | PWA, deep links y rendimiento — AUG-033, AUG-049, AUG-052, AUG-055, AUG-057, AUG-058 | Instalación limpia, precache del grafo requerido, runtime cache, offline, deep link sin catálogo, red lenta/interrumpida, catálogo grande | Recursos disponibles offline, reintentos acotados, cancelación/timeout, tiempos medidos y comportamiento sin espera infinita |
| VAL-15 | Regresión integral y deployments — AUG-002 y todas las tareas afectadas | Repetir flujos críticos después de cada corrección; comparar HEAD con cada deployment autorizado; probar roles y navegadores/dispositivos soportados | SHA de código, URL/identidad del deployment, fecha, ambiente, navegador, pasos, resultado, logs sanitizados y aprobación |

### 5.1. Reglas de ejecución de la matriz

1. Primero revisar estáticamente el cambio y sus callsites; después ejecutar pruebas aisladas y finalmente las integraciones reales autorizadas.
2. Preparar datos de prueba reproducibles y capturar snapshots antes de cada operación destructiva o migración.
3. Para pruebas de concurrencia, lanzar operaciones desde servicios/proyectos distintos; no dar por compartido un lock local.
4. Para cada prueba registrar precondiciones, pasos, resultado esperado, resultado observado, evidencia, entorno, versión/commit y responsable.
5. Repetir el caso con éxito, fallo, timeout, reintento y ejecución duplicada cuando aplique.
6. Una respuesta HTTP 2xx no demuestra por sí sola éxito funcional ni integridad del dato.
7. No declarar una tarea completada mientras queden criterios de aceptación o validaciones obligatorias sin ejecutar.
8. La validación de deployment debe comprobar la correspondencia entre el SHA auditado y el código efectivamente publicado; no inferirla de que la URL responde.

## 6. Hallazgos transversales que bloquean o condicionan la validación

- La coordinación de mutaciones entre servicios no puede darse por resuelta por locks locales a cada proyecto Apps Script.
- Las operaciones destructivas de restore, papelera, movimiento y migración requieren pruebas sobre copias aisladas, rollback y reconciliación.
- Los registros históricos y el inventario de imágenes comparten estados y referencias; la decisión AUG-027 es previa a implementar la separación o ampliación del alcance.
- La autenticación frontend no sustituye la validación de sesión/rol en backend.
- Las pruebas de health check y telemetría requieren acceso a fuentes backend y deployments actuales; el repositorio frontend por sí solo no acredita el contrato desplegado.
- Las pruebas offline deben cubrir el grafo real de dependencias y no solo la instalación exitosa del Service Worker.
- La revisión legal de los términos y privacidad requiere aprobación competente; una prueba técnica no equivale a dictamen legal.

## 7. Resultado de esta consolidación

**Estado:** CONSOLIDACIÓN DOCUMENTAL COMPLETADA; MATRIZ DE VALIDACIÓN PREPARADA; EJECUCIÓN DE PRUEBAS PENDIENTE.

- Catálogo AUD-T: 38 unidades; 17 con E1 completada, 1 parcial y 20 por auditar.
- Catálogo AUG: 57 IDs únicos; AUG-015 ausente del registro actual y pendiente de investigación histórica.
- Repeticiones de encabezados AUG: se interpretan como adendas hasta comprobar lo contrario; no se eliminan ni renumeran.
- La matriz VAL-01 a VAL-15 organiza los casos que deben ejecutarse; no acredita pruebas ya realizadas.
- No se ejecutaron pruebas funcionales, HTTP, navegador, Apps Script, Drive, Spreadsheet, concurrencia ni deployments.
- No se modificó código, configuración, endpoints ni datos productivos.

## 8. Próxima acción

Continuar con AUD-T-004 — VIN: identificación, colecciones, almacenamiento, búsqueda y diferencial. Mantener AUG-053 a AUG-058 y las adendas AUG-022/AUG-043/AUG-051 como pendientes; no tratarlos como implementados.

## 9. Actualización de cobertura — AUD-T-038
Sesión AUD-20261107-S020 | Checkpoint AUD-CP-0020 | HEAD auditado bfcdf8e57d4e09c1c920cf904265301c4554b334.
- AUD-T-038 tiene E1 estática completada; H-AUD-038-001 a 005 abiertos y validación funcional/privacidad pendiente.
- AUG pasa de 51 a 53 IDs únicos: se agregan AUG-053/AUG-054. AUG-015 continúa ausente; no se infiere ni renumera.
- AUG-051 se amplía para viewedItems y clasificación de validationCache; AUG-022 se amplía para inventario y semántica de limpieza.
- VAL-01 incluye AUG-054; VAL-13 incluye AUG-053.
- Sin pruebas E2/E3, navegador, IndexedDB real, cambio de cuenta, HTTP, Apps Script, Drive, Spreadsheet, concurrencia ni deployments.

## 10. Actualización de cobertura — AUD-T-003
Sesión AUD-20261107-S021 | Checkpoint AUD-CP-0021 | HEAD auditado 06f18e42383f5be448c378bc09ab534731cfbd6b.
- AUD-T-003 tiene E1 estática completada; H-AUD-003-001 a 004 abiertos; validación funcional y de integración pendiente.
- Catálogo AUD-T: 38 unidades; 17 con E1 completada, 1 parcial y 20 por auditar.
- Catálogo AUG: 57 IDs únicos dentro de AUG-001 a AUG-058; AUG-015 continúa ausente y no se infiere ni renumera.
- AUG-055 a AUG-058 se agregan para ciclo durable de opId, disponibilidad dinámica, errores FileReader y recuperación serializada.
- AUG-043 se amplía para el enlace manual #videoGuiaUrl y la comprobación real de videoGuiaDesarmeUrl en add_cortes.html.
- VAL-08 se amplía con AUG-055; VAL-09 con AUG-056; VAL-14 con AUG-055/AUG-057/AUG-058.
- No se ejecutaron pruebas E2/E3, navegador, FileReader real, cuota localStorage, HTTP, Apps Script, Drive/Spreadsheet, concurrencia ni deployments.
- No se modificó código, configuración, endpoints ni datos productivos.
