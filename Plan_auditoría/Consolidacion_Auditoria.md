# Consolidación de auditoría y matriz de validación — GPSpedia

**Plan:** AUD-PLAN-2026-001  
**Sesión:** AUD-20261108-S029  
**Checkpoint:** AUD-CP-0029  
**Fecha:** 2026-11-08  
**Repositorio:** infogpstech/GPSpedia  
**Rama de trabajo:** GPSpedia2.2.5_work  
**HEAD de referencia al inicio:** bba61f0cd16e5a35d6f709e048ebd31d8709a193  
**Rama base:** GPSpedia2.2.5  
**HEAD de la base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  

## 1. Objetivo y límites

Consolidar el estado documentado de las 38 unidades AUD-T, organizar el inventario de tareas derivadas AUG y establecer una matriz de validación para la fase posterior. Esta consolidación es documental: no corrige hallazgos, no implementa tareas AUG, no modifica código, endpoints, configuración, Spreadsheet, Drive, datos productivos ni deployments.

La matriz es una planificación de pruebas, no evidencia de que estas se hayan ejecutado. Ninguna tarea se considera funcionalmente validada por el hecho de contar con auditoría estática E1.

## 2. Estado real del catálogo AUD-T

El plan contiene 38 unidades AUD-T. Según la tabla de estado vigente:

| Estado documental | Unidades | Cantidad |
|---|---|---:|
| Auditoría estática E1 completada, con hallazgos y/o validaciones pendientes | AUD-T-003 a AUD-T-011 y AUD-T-023 a AUD-T-038 | 25 |
| Auditada parcialmente | AUD-T-002 | 1 |
| Por auditar | AUD-T-001 y AUD-T-012 a AUD-T-022 | 12 |
| **Total** | **AUD-T-001 a AUD-T-038** | **38** |

**Corrección de continuidad:** no es correcto afirmar que las 37 unidades AUD-T tienen auditoría estática completada. AUD-T-001 y AUD-T-012 a AUD-T-022 siguen marcadas POR AUDITAR; AUD-T-002 está auditada parcialmente. AUD-T-003 a AUD-T-011 y AUD-T-023 a AUD-T-038 tienen E1 completada, pero conservan hallazgos y validaciones funcionales pendientes.

AUD-T-038 — seguridad del almacenamiento local y ciclo de datos de usuario — se auditó en AUD-20261107-S020. Su E1 está completada; permanecen hallazgos y validaciones funcionales/privacidad pendientes.

## 3. Inventario consolidado de tareas AUG

El archivo Plan_auditoría/Aug_Tareas.md contiene **86 identificadores AUG únicos** dentro del rango AUG-001 a AUG-087. El identificador AUG-015 no aparece en el registro consultado. No se debe crear, inferir, renumerar ni reutilizar AUG-015 sin recuperar evidencia histórica.

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
| Catálogo, búsqueda, VIN y PWA | AUG-048 a AUG-052, AUG-059/AUG-060, AUG-074 | Snapshot y sincronización, búsqueda, motor VIN, edición/validación de colecciones VIN, presentación posicional, IndexedDB/miniaturas/privacidad local, startup/deep links/Service Worker/backend e instalación iOS/iPadOS |
| Ciclo local de operaciones y seguridad de endpoints | AUG-053/AUG-054 | Aislamiento/retención de snapshots por cuenta; autenticación y minimización de checkOperation |
| Registro, idempotencia y recuperación de add_cortes | AUG-055 a AUG-058 | Ciclo durable/vinculación de opId; disponibilidad dinámica; errores FileReader; recuperación automática serializada |
| Modal de detalle y ampliaciones contextuales | AUG-061 a AUG-064 | Cupos suplementarios; refresh del detalle; selectores desde Sheets; sanitización de apertura/alimentación |
| Visualización técnica, transparencia y gestos | AUG-065 a AUG-067 | Resolución y cachés por variante; tratamiento de PNG transparente; discriminación de gestos del carrusel |
| Navegación, History API y overlays | AUG-068 a AUG-071 | Registro de overlays dinámicos; retroceso interno sincronizado; cierre secuencial; reconciliación de entradas de historial |

| Compartir y conectividad | AUG-072/AUG-073 | Identidad estable y fallback de enlaces compartidos; semántica accesible del indicador de conectividad |
| Reportes y sugerencias de cortes | AUG-075 a AUG-081 | Sesión/identidad de actor, prevención de stored XSS, adjuntos de reporte, vínculo reportId/vehículo/corte, carga y privacidad de imágenes, concurrencia/idempotencia y validación de payloads |
| Módulo Problemas y Soluciones (PyS) | AUG-082 a AUG-087; adendas AUG-040/AUG-057 | Stored XSS, autenticación/identidad, imágenes Drive, esquema/ID/idempotencia, límites/URL, contribuciones concurrentes y caché/rendimiento |

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
6. **Experiencia, legal y catálogo:** tratar tareas legales (AUG-045 a AUG-047), catálogo/búsqueda/VIN/PWA (AUG-048 a AUG-052) y sincronización del detalle (AUG-062/AUG-063), con pruebas de regresión y offline.
7. **Seguridad y ampliaciones contextuales:** resolver sanitización (AUG-064) y disponibilidad autoritativa de apertura/alimentación (AUG-061) antes de habilitar escrituras concurrentes desde el modal (+).

Este orden no autoriza a ejecutar varias tareas en un solo commit. Cada tarea de implementación conserva su alcance, checkpoint, auditoría, respaldo, verificaciones, Code Review y único commit conforme al procedimiento obligatorio.

## 5. Matriz consolidada de validación

Las pruebas deben ejecutarse en entornos aislados y con cuentas/datos de prueba. No usar datos productivos para provocar fallos, concurrencia, restauraciones, borrados, movimientos o migraciones. Antes de una prueba que escriba en Drive o Spreadsheet, confirmar el proyecto, deployment, identidad y destino de prueba.

| ID de matriz | Área y tareas relacionadas | Casos mínimos que deben comprobarse | Evidencia exigida |
|---|---|---|---|
| VAL-01 | Identidad, sesiones y roles — AUG-005 a AUG-009, AUG-016, AUG-017, AUG-042, AUG-054 | Login/logout, revocación, cuenta eliminada, contraseña/caducidad según política aprobada, varias pestañas, cambio de cuenta/rol, modal privilegiado y navegación | Actor/rol efectivo, resultado del backend, estado cliente antes/después, sesiones invalidadas y ausencia de acceso residual |
| VAL-02 | Seguridad y consistencia AUTH/USERS — AUG-010 a AUG-014 | Mutaciones simultáneas, intentos concurrentes, purga de Logs con inserciones, validación de usuario/contraseña, migración de credenciales | Resultado por operación, conteos antes/después, ausencia de pérdida/duplicación y evidencia de migración reversible o recuperable |
| VAL-03 | WRITE/FEEDBACK/UTILITIES y contratos — AUG-003, AUG-034, AUG-039 a AUG-044, AUG-061 | Sesión ausente/expirada, rol insuficiente, payload incompleto o manipulado, acciones sin handler y handlers sin mapeo, escritura concurrente desde servicios distintos | Matriz acción→servicio→handler→consumidor, HTTP/JSON, actor autenticado, rechazo de operaciones no autorizadas y consistencia de registros |
| VAL-04 | Backup/restore y operaciones ADMIN — AUG-018 a AUG-023 | Backup completo/incompleto, manifiesto, restore con fallo inducido por etapa, rollback, terminal fuera de Cortes, logs grandes/fechas inválidas, acciones huérfanas, borrado IndexedDB bloqueado | Identificador y manifiesto de respaldo, comparación origen/destino, recuperación demostrada, límites de ruta y estados reales de cada operación |
| VAL-05 | Health check y telemetría — AUG-024/AUG-025 | HTTP 2xx con JSON válido/inválido/vacío/HTML, 4xx/5xx, timeout, endpoint equivocado, servicio lento, muestra caducada, límite de eventos y solicitudes que cruzan intervalos | Estado clasificado, código HTTP/motivo seguro, timestamps coherentes, conteos y comportamiento aislado por servicio |
| VAL-06 | Historial de imágenes y reemplazos — AUG-021, AUG-026, AUG-027, AUG-037, AUG-038 | Reemplazo, restauración, papelera, requiere_revision, cancelada, fila parcial/duplicada, ID/URL/MIME no coincidente, fallo de escritura y compensación | Estado histórico y archivo Drive reconciliados, actor, operationId, evidencia de rollback y filas no válidas visibles para revisión |
| VAL-07 | Inventario y organización Drive — AUG-003, AUG-028 a AUG-033 | Escaneo completo/incompleto, cursor y reanudación, inventario parcial, archivo con nueva referencia durante el lote, movimiento manual, duplicados, snapshots expirados, límite temporal y cuota | auditId, inventoryOperationId, resultado por archivo, referencias revalidadas antes de mover, ubicación conservada y conteos reconciliados |
| VAL-08 | Esquema, IDs e idempotencia — AUG-034 a AUG-036, AUG-055, AUG-059 | Migración en copia, encabezados ocupados, IDs duplicados, reintentos con mismo/diferente opId, recuperación de estado parcial, edición VIN dinámica, longitud máxima, rechazo explícito de valores cortos y parsers VIN/testigo | Snapshot antes/después, unicidad, estado de idempotencia, compatibilidad de lectores y ausencia de sobrescritura de datos |
| VAL-09 | Cargas y ciclo de vídeo — AUG-037, AUG-038, AUG-043, AUG-056, AUG-057, AUG-064 | Carga interrumpida/reintentada, contenido distinto con mismo identificador, descarte de edición, aprobación/rechazo, videoId provisional y sincronización del destino | Hash/contenido, ledger, historial, estado de aprobación y destino final coherentes; operaciones repetidas idempotentes |
| VAL-10 | Términos y accesibilidad — AUG-045 a AUG-047 | Primera aceptación, nueva versión, cambio de cuenta/dispositivo, almacenamiento bloqueado, modal ausente, teclado, foco, lector de pantalla, History API y offline | Versión/identidad/fecha conforme a decisión aprobada, bloqueo seguro, foco y navegación correctos, revisión legal documentada |
| VAL-11 | Catálogo, caché y sincronización — AUG-048/AUG-052 | Alta, edición y eliminación de registros; cambios con igual cardinalidad; reinicio offline; instantánea y delta; timeouts y respuestas inválidas | Comparación de datos de origen y caché, ausencia de registros retirados, sincronización recuperable y estado terminal visible |
| VAL-12 | Búsqueda y VIN — AUG-036, AUG-049/AUG-050, AUG-060 | Acentos, mayúsculas, espacios, campos de cada sección, coincidencia exacta/parcial, años/modelos numéricos ambiguos, enlaces compartidos con números de cuatro dígitos y anoDesde distinto, VIN completo/prefijo, variantes múltiples, rangos solapados/no solapados, umbral de muestras, slots vacíos y presentación de cuatro caracteres sin doble recorte | Conjunto de resultados esperado, ranking, sección/modal correcto, ambigüedades explícitas y variante identificada sin selección arbitraria |
| VAL-13 | IndexedDB, miniaturas y privacidad local — AUG-022, AUG-031/AUG-032, AUG-051, AUG-053, AUG-065/AUG-066 | Transacción complete/abort/error, upgrade bloqueado, cuota/evicción, URLs de objeto, tamaños de miniatura, cuentas distintas, retención y limpieza | Confirmación de transacción, límites de almacenamiento, ausencia de datos cruzados entre cuentas y revocación/liberación de recursos |
| VAL-14 | PWA, deep links y rendimiento — AUG-033, AUG-049, AUG-052, AUG-055, AUG-057, AUG-058, AUG-067, AUG-074 | Instalación limpia, grafo ESM completo, primera recarga offline, recurso requerido/opcional ausente, registro/actualización del Service Worker, runtime cache, deep link sin sesión/catálogo, hash malformado, red lenta/interrumpida, catálogo grande e instalación iPhone/iPadOS | Recursos disponibles offline, estado de instalación/actualización, diagnóstico de fallos de precarga, reintentos acotados, cancelación/timeout, recuperación ante hash inválido y evidencia real de instalación en dispositivos soportados |
| VAL-15 | Regresión integral y deployments — AUG-002 y todas las tareas afectadas | Repetir flujos críticos después de cada corrección; comparar HEAD con cada deployment autorizado; probar roles y navegadores/dispositivos soportados | SHA de código, URL/identidad del deployment, fecha, ambiente, navegador, pasos, resultado, logs sanitizados y aprobación |
| VAL-16 | Modal de detalle y ampliaciones contextuales — AUG-043, AUG-050, AUG-057, AUG-061 a AUG-064 | Payloads XSS; apertura/alimentación con slots vacíos/ocupados e imágenes huérfanas; dos usuarios por último slot; payload vacío; refresh fallido tras guardar; re-render; dropdowns de Sheets; FileReader success/error/abort; vídeo existente y confirmación; contador VIN; navegación atrás | Evidencia de sanitización, respuesta backend/slot, datos antes/después, escritura separada de refresh, listas de Sheets, estado del formulario y cierre de overlays |
| VAL-17 | Navegación, History API y overlays — AUG-047, AUG-068 a AUG-071 | Back/Forward desde cada nivel; botones internos Volver; búsqueda Forward-Stack; 2–3 overlays anidados; modal dinámico sobre ficha; menú→Inbox/Dashboard/Changelog; cierre por X/backdrop/submit; términos iniciales y acuerdo; perfil users.html; carga YouTube activa en add_cortes.html; deep links y secciones | Secuencia de history.state/URL, overlay superior antes/después, vista y query restauradas, cantidad de entradas y ausencia de overlays o estados residuales |
| VAL-18 | Deep links, compartir e indicador de conectividad — AUG-049, AUG-052, AUG-072/AUG-073 | Abrir enlaces históricos y nuevos; identificadores estables y colisiones; modelo/equipamiento con números de cuatro dígitos y año inicial distinto; coincidencias multi-sección; hash malformado; carga sin sesión/catálogo, API lenta/caída y cancelación de reintentos; Web Share exitoso/cancelado/rechazado; Clipboard ausente/rechazado; indicador online/offline, backend inaccesible con navigator.onLine=true, lector de pantalla y movimiento reducido | URL/ID resuelto, resultado y modal correcto, history.state, estado terminal de carga, fallback/feedback de compartir, anuncios accesibles y distinción entre red del navegador y salud backend |

| VAL-19 | Reportes y sugerencias de cortes — AUG-075 a AUG-081 | Sesión válida/ausente/revocada, actor falsificado, XSS en subject/user/datos de modal, reporte con/sin imagen, reportId inexistente/duplicado/cruzado, vehículo/corte/slot incorrecto, FileReader error/abort, MIME/tamaño, Drive sin permisos, respuesta perdida, concurrencia y payloads vacíos/alterados | Actor verificado, contenido mostrado como texto seguro, imagen recuperable con permiso previsto, relación reportId–vehicleId–corteIndex comprobada, ausencia de duplicados/colisiones y validación server-side de todos los campos |
| VAL-20 | Módulo PyS — AUG-040, AUG-043, AUG-057, AUG-082 a AUG-087 | Navegación y tarjeta +; orden de registros; formulario y límites exactos; Sin solución; sesión/actor; XSS en título/colaborador/vídeo; FileReader success/error/abort; MIME/tamaño y carpeta Drive; fallo parcial/archivo huérfano; esquema/IDs con filas eliminadas; reintento/idempotencia; solución/prevención simultáneas; edición Desarrollador; caché fresca/obsoleta y cambios repetidos de sección | Actor backend verificado; HTML seguro; imagen persistida y recuperable; esquema/IDs únicos; ausencia de duplicados/sobrescrituras; datos/cache coherentes; modal y navegación correctos; evidencia E2/E3/E4/E5 separada por entorno |

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

- Catálogo AUD-T: 38 unidades; 19 con E1 completada, 1 parcial y 18 por auditar.
- Catálogo AUG: 63 IDs únicos; AUG-015 ausente del registro actual y pendiente de investigación histórica.
- Repeticiones de encabezados AUG: se interpretan como adendas hasta comprobar lo contrario; no se eliminan ni renumeran.
- La matriz VAL-01 a VAL-16 organiza los casos que deben ejecutarse; no acredita pruebas ya realizadas.
- No se ejecutaron pruebas funcionales, HTTP, navegador, Apps Script, Drive, Spreadsheet, concurrencia ni deployments.
- No se modificó código, configuración, endpoints ni datos productivos.

## 8. Próxima acción

Continuar con AUD-T-006 — Visualización técnica avanzada, lightbox con carrusel de cables y renderizado de transparencias. Mantener AUG-053 a AUG-064 y las adendas AUG-022/AUG-043/AUG-050/AUG-051/AUG-057 como pendientes; no tratarlos como implementados.

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


## 11. Actualización de cobertura — AUD-T-004
Sesión AUD-20261107-S022 | Checkpoint AUD-CP-0022 | HEAD auditado 24f68780e6b7ad5ad835ce76c1d6abda0a80a528.
- AUD-T-004 tiene E1 estática completada; H-AUD-004-001 a 003 abiertos. H-AUD-037-007 se amplía sin duplicarlo.
- Catálogo AUD-T: 38 unidades; 18 con E1 completada, 1 parcial y 19 por auditar.
- Catálogo AUG: 59 IDs únicos dentro de AUG-001 a AUG-060; AUG-015 continúa ausente y no se infiere ni renumera.
- AUG-050 se amplía para prefijo completo/normalizado, ambigüedad, muestras, competidores, rangos de años y caracteres compartidos. AUG-059 cubre edición/validación backend; AUG-060 cubre asociación posicional y presentación.
- VAL-08 se amplía con edición y validación VIN (AUG-059); VAL-12 con VIN completo/prefijo, generaciones, muestras, slots vacíos y presentación (AUG-050/AUG-060).
- La migración VIN/opId no se ejecutó; la documentación de esquema continúa distinguiendo estado observado y esquema objetivo.
- No se ejecutaron pruebas E2/E3, navegador, dataset VIN, HTTP, Apps Script, Spreadsheet/Drive, concurrencia ni deployments. No se modificó código, configuración ni datos productivos.

## 12. Actualización de cobertura — AUD-T-005
Sesión AUD-20261107-S023 | Checkpoint AUD-CP-0023 | HEAD auditado c56c6f7e21a668774db726e2f14139588f1bc5c0 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-005 tiene E1 estática completada; H-AUD-005-001 a 008 abiertos; validación funcional, seguridad e integración pendiente.
- Catálogo AUD-T: 38 unidades; 19 con E1 completada, 1 parcial y 18 por auditar.
- Catálogo AUG: 63 IDs únicos dentro de AUG-001 a AUG-064; AUG-015 continúa ausente y no se infiere ni renumera.
- AUG-061 a AUG-064 nuevas: cupos suplementarios, sincronización del modal, selectores desde Sheets y sanitización de contenido enriquecido. AUG-043/AUG-050/AUG-057 reciben adendas.
- VAL-03 incluye disponibilidad/escritura suplementaria (AUG-061); VAL-09/VAL-14 incluyen adendas de vídeo/FileReader/sanitización; VAL-16 cubre modal contextual y riesgos.
- La observación popstate se transfiere a AUD-T-007 para evitar duplicar auditoría global de History API/overlays.
- No se ejecutaron pruebas E2/E3, navegador, XSS, FileReader real, concurrencia, HTTP, Apps Script, Spreadsheet/Drive ni deployments. No se modificó código, configuración, endpoints ni datos productivos.


## 13. Actualización de cobertura — AUD-T-006
Sesión AUD-20261107-S024 | Checkpoint AUD-CP-0024 | HEAD auditado 5ab07e75513b05a51a4c62fbc731e451105eb1a8 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-006 tiene E1 estática completada; H-AUD-006-001 a H-AUD-006-003 abiertos; validación visual, móvil y de rendimiento pendiente.
- Catálogo AUD-T: 38 unidades; 20 con E1 completada, 1 parcial y 17 por auditar.
- Catálogo AUG: 66 IDs únicos dentro de AUG-001 a AUG-067; AUG-015 continúa ausente y no se infiere ni renumera.
- AUG-065 a AUG-067 nuevas: variantes/caché por tamaño, tratamiento de transparencia y discriminación de gestos. AUG-064 se amplía con el sink slideText.innerHTML de updateSlide().
- VAL-13 incorpora variantes y caché de imágenes (AUG-065/AUG-066); VAL-14 incorpora gestos del carrusel (AUG-067); VAL-09 mantiene la cobertura de sanitización mediante AUG-064.
- No se ejecutaron pruebas E2/E3, navegador, dispositivos móviles, PWA, CDN, IndexedDB real, canvas, mediciones de rendimiento ni gestos reales. No se modificó código, assets, configuración ni datos productivos.

## 14. Actualización de cobertura — AUD-T-007
Sesión AUD-20261108-S025 | Checkpoint AUD-CP-0025 | HEAD auditado 61c9898309ef2c27438eaa65a5aa00ff8a1f7b0e | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-007 tiene E1 estática completada; H-AUD-007-001 a 005 abiertos; validación funcional, móvil/PWA y de secuencias reales pendiente.
- Catálogo AUD-T: 38 unidades; 21 con E1 completada, 1 parcial y 16 por auditar.
- Catálogo AUG: 70 IDs únicos dentro de AUG-001 a AUG-071; AUG-015 continúa ausente y no se infiere ni renumera.
- AUG-068 a AUG-071 nuevas: overlays dinámicos, navegación interna atrás, cierre secuencial y reconciliación de entradas History API. AUG-047 recibe adenda para terms-modal/terms-agreement-modal.
- H-AUD-005-008 se amplía al conjunto de submodales dinámicos; no se crea una tarea duplicada.
- VAL-10 conserva la política legal y AUG-047; VAL-17 agrega secuencias de navegación, overlays, users.html y carga YouTube desde add_cortes.html.
- No se ejecutaron pruebas E2/E3, navegador, Android/iOS, PWA, gestos nativos, teclado virtual, submits reales, deep links ejecutados ni medición de history.state. No se modificó código, endpoints, configuración ni datos productivos.


## 15. Actualización de cobertura — AUD-T-008
Sesión AUD-20261108-S026 | Checkpoint AUD-CP-0026 | HEAD auditado f3d7558abeef482957582fea08f2041490b54f34 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-008 tiene E1 estática completada; H-AUD-008-001 a 004 abiertos; validación funcional, multiplataforma y de conectividad real pendiente.
- Catálogo AUD-T: 38 unidades; 22 con E1 completada, 1 parcial y 15 por auditar.
- Catálogo AUG: 72 IDs únicos dentro de AUG-001 a AUG-073; AUG-015 continúa ausente y no se infiere ni renumera.
- AUG-072/AUG-073 nuevas: identidad/fallback de enlaces compartidos y accesibilidad/semántica del indicador.
- AUG-049 recibe adenda sobre números de cuatro dígitos en shareQuery y autoapertura limitada a Corte; AUG-052 recibe adenda sobre hash malformado, espera terminal y cancelación.
- VAL-12 se amplía con números de año/código dentro de enlaces compartidos; VAL-14 se amplía con hash malformado y ausencia de sesión/catálogo; VAL-18 incorpora compartir, conectividad y accesibilidad.
- No se ejecutaron E2/E3, Web Share, Clipboard, navegador, móvil/PWA, lector de pantalla, HTTP, health check, Apps Script, dataset real ni pruebas de red. No se modificó código, endpoints, configuración ni datos productivos.

## 16. Actualización de cobertura — AUD-T-009
Sesión AUD-20261108-S027 | Checkpoint AUD-CP-0027 | HEAD auditado c2f9cdd29dfc9efca1db8a1c3b9675f29ed809ac | árbol 9617c2c588190a50fde235bfe2d32b3ebee7b7ba | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-009 tiene E1 estática completada; H-AUD-009-001 a 003 abiertos; validación funcional, PWA offline, CacheStorage, IndexedDB real e instalación iOS/iPadOS pendiente.
- Catálogo AUD-T: 38 unidades; 23 con E1 completada, 1 parcial y 14 por auditar.
- Catálogo AUG: 73 IDs únicos dentro de AUG-001 a AUG-074; AUG-015 continúa ausente y no se infiere ni renumera.
- AUG-074 nueva: detección iPadOS con UA de escritorio y compatibilidad de instalación/icono Apple. AUG-052 recibe adenda para youtubeUpload.js, grafo ESM completo, atomicidad de cache.addAll(), errores de registro y primera recarga offline.
- VAL-14 incorpora prueba de precarga de todo el grafo ESM, primera recarga offline antes de una navegación controlada posterior, fallo de recurso requerido/opcional, actualización/registro del Service Worker y compatibilidad de instalación iPhone/iPadOS.
- VAL-13 mantiene los casos de transacción, cuota/evicción, object URLs, tamaños de miniatura y privacidad local ya asociados a AUG-051/AUG-065.
- No se ejecutaron pruebas E2/E3, navegador, CacheStorage, IndexedDB real, cuota, instalación/actualización PWA, Android/iOS/iPadOS, Add to Home Screen, red real ni deployments. No se modificó código, assets, configuración ni datos productivos.

## 17. Actualización de cobertura — AUD-T-010
Sesión AUD-20261108-S028 | Checkpoint AUD-CP-0028 | HEAD auditado 9b1401d37ea8c7b78a7ae9117c90afc4deb68009 | árbol 283e324bca6e2b055e353059a3aa00ce38f66f5d | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-010 tiene E1 estática completada; H-AUD-010-001 a H-AUD-010-007 abiertos; validación funcional, seguridad e integración pendiente.
- Catálogo AUD-T: 38 unidades; 24 con E1 completada, 1 parcial y 13 por auditar.
- Catálogo AUG: 80 IDs únicos dentro de AUG-001 a AUG-081; AUG-015 continúa ausente y no se infiere ni renumera.
- AUG-075 a AUG-081 nuevas: sesión/identidad, stored XSS, adjuntos de reporte, integridad del vínculo reportId/vehículo/corte, pipeline y privacidad de imágenes, concurrencia/idempotencia y validación de payload.
- VAL-19 agrega pruebas específicas de reportes y sugerencias; VAL-03 mantiene cobertura transversal de sesión/RBAC y VAL-09 conserva el ciclo de cargas.
- Los cierres estáticos históricos H-TR-01 a H-TR-07 y H-SUG-01 a H-SUG-06 se revalidaron; los siete hallazgos nuevos no duplican sus causas.
- No se ejecutaron E2/E3, Apps Script, HTTP, navegador, FileReader real, pruebas XSS, Drive/Spreadsheet, concurrencia ni deployments. No se modificó código, assets, configuración, endpoints ni datos productivos.


## 18. Actualización de cobertura — AUD-T-011
Sesión AUD-20261108-S029 | Checkpoint AUD-CP-0029 | HEAD auditado bba61f0cd16e5a35d6f709e048ebd31d8709a193 | árbol b44d845fdd0cb485cdefc04752ebafd1c340f355 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-011 tiene E1 estática completada; H-AUD-011-001 a H-AUD-011-007 abiertos; validación funcional, seguridad e integración pendiente.
- Catálogo AUD-T: 38 unidades; 25 con E1 completada, 1 parcial y 12 por auditar.
- Catálogo AUG: 86 IDs únicos dentro de AUG-001 a AUG-087; AUG-015 continúa ausente y no se infiere ni renumera.
- Nuevas AUG-082 a AUG-087: stored XSS PyS; almacenamiento/recuperación de imágenes; esquema/ID/idempotencia; validación de campos/URL; protección de solución/prevención contra sobrescritura; frescura/deduplicación de caché PyS. AUG-040 y AUG-057 reciben adendas.
- VAL-20 incorpora alta, lectura, renderizado seguro, identidad, imagen, esquema/ID, solución/prevención, edición y rendimiento del módulo PyS. VAL-03, VAL-09, VAL-13 y VAL-14 conservan las pruebas transversales de sesión, cargas, caché y rendimiento.
- H-AUD-035-001/003/006 y H-AUD-037-005 se mantienen como antecedentes y no se duplican.
- No se ejecutaron E2/E3, navegador, FileReader real, HTTP, Apps Script, Drive/Spreadsheet, XSS controlado, concurrencia ni deployments. No se modificó código, assets, endpoints, configuración ni datos productivos.

## 19. Actualización de cobertura — AUD-T-012
Sesión AUD-20261108-S030 | Checkpoint AUD-CP-0030 | HEAD auditado 2afdde923d14e4f3dd078d347007b15e5ab09b2b | árbol 06fc72da78912df18227e2f45ce0d33349fa7cc5 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-012 tiene E1 estática completada; H-AUD-012-001 a H-AUD-012-008 abiertos o vinculados a tareas existentes; validación funcional, integridad y navegación pendiente.
- Catálogo AUD-T: 38 unidades; 26 con E1 completada, 1 parcial y 11 por auditar.
- Catálogo AUG: 90 IDs únicos dentro de AUG-001 a AUG-091; AUG-015 continúa ausente y no se infiere ni renumera.
- Nuevas AUG-088 a AUG-091: mantener el origen anti-ciclo después de asociar, preservar pila modal y posición de carrusel, validar integridad/atomicidad de relaciones, y alinear el título exacto del acordeón.
- AUG-043 recibe adenda: los callsites de add/remove siguen omitiendo userId/sessionToken, pese a que assertFeedbackSession los exige. AUG-087 recibe adenda: renderPosiblesProblemsAccordion y openAssociateExistingProblemModal hacen consultas getPysData redundantes.
- VAL-21 agrega recorridos bidireccionales, asociaciones nueva/existente, supresión anti-ciclos tras mutación, retorno con scroll/estado, edición y popstate, sesión/rol, integridad referencial y concurrencia. VAL-03 y AUG-043 mantienen las pruebas transversales de sesión/RBAC; AUG-002 mantiene la validación funcional consolidada.
- El commit f6299fcf declara pruebas Playwright para esta funcionalidad, pero el árbol actual solo contiene pruebas aisladas de AUTH/USERS; no hay suite PyS–vehículo reproducible.
- No se ejecutaron E2/E3, Playwright, navegador, HTTP, Apps Script, Spreadsheet real, concurrencia, permisos en deployment ni deployments. No se modificó código, assets, endpoints, configuración ni datos productivos.


## 20. Actualización de cobertura — AUD-T-013
Sesión AUD-20261108-S031 | Checkpoint AUD-CP-0031 | HEAD d8a164c2974f4dc472f169442c2b7efb969bf350 | árbol abce39b7f437ecd02647bebdf4252f47d4ed4ca2 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-013 E1 estática completada; H-AUD-013-001 a H-AUD-013-010 documentados; validación funcional/seguridad/YouTube pendiente.
- Catálogo AUD-T: 38 unidades; 27 con E1 completada, 1 parcial y 10 por auditar.
- Catálogo AUG: 93 IDs únicos dentro de AUG-001 a AUG-094; AUG-015 continúa ausente.
- Nuevas AUG-092 a AUG-094: esquema/seguridad de Tutorial; guard de tipo/estado de solicitudes de vídeo; eliminación de inyección HTML en uploader.
- AUG-043 recibe evidencia actualizada de sesión, bypass de aprobación, ID provisional, recuperación y metadatos. AUG-068 recibe evidencia del uploader sin History API. AUG-040 mantiene coordinación de approveVideo.
- VAL-22 agrega casos de Tutorial CRUD/esquema/atribución, sesión, YouTube, resiliencia, Inbox, aprobación/rechazo, no publicación pending, tipos/estados, overlays, sanitización y compatibilidad manual.
- Esquema versionado: hoja Tutorial con siete columnas; no se inspeccionó ni modificó Spreadsheet productivo.
- B04 de cierre del iframe sigue presente estáticamente; no equivale a validación en navegador.
- No se ejecutaron E2/E3, YouTube API, OAuth real, XHR, navegador, Apps Script, Spreadsheet/Drive real, concurrencia, cancelación, reanudación, XSS ni deployments.

### VAL-22 — Matriz pendiente de validación Tutorial/YouTube
1. Lectura de registros históricos y siete columnas de Tutorial.
2. Alta/edición/ID/colaborador/campos descriptivos/URL/refresco catálogo.
3. addTutorial con sesión ausente, inválida, rol no autorizado y válida.
4. Doble clic, reintento y altas concurrentes.
5. initYouTubeUpload con sessionToken válido/ausente/incorrecto/revocado.
6. OAuth, uploadUrl ausente, error API, respuesta JSON inválida y videoId real.
7. Cancelación, pérdida de red, suspensión/reapertura, HTTP 308 y limpieza.
8. Inbox pending, autor, doble submit e idempotencia.
9. Aprobación Corte/Tutorial/PyS; asociación solo tras aprobar.
10. Rechazo sin enlace visible ni referencias huérfanas.
11. IDs de otros tipos y estados terminales no deben mutarse como video_approval.
12. Atrás/gesto/X/Cancelar/overlay padre/carga activa.
13. Payloads HTML en title/description sin ejecución ni alteración DOM.
14. Enlaces manuales conservan comportamiento y se distinguen de pending.
15. Cierre del detalle detiene/remueve iframe por todos los métodos.
- Estado VAL-22: PLANIFICADA; no ejecutada.


## 21. Actualización de cobertura — AUD-T-014
Sesión AUD-20261108-S032 | Checkpoint AUD-CP-0032 | HEAD deefa3a8ceca4aae892c61d0e99fec73c3e44837 | árbol af44c6c3d2c911f72e6891f9b935a83fdcb83a38 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-014 E1 estática completada; H-AUD-014-001 a H-AUD-014-003 documentados; validación funcional/seguridad pendiente.
- Catálogo AUD-T: 38 unidades; 28 con E1 completada, 1 parcial y 9 por auditar.
- Catálogo AUG: 96 IDs únicos dentro de AUG-001 a AUG-097; AUG-015 continúa ausente.
- Nuevas AUG-095 a AUG-097: saneamiento backend, renderizado de contenido enriquecido en todos los sinks y conexión del modo estricto/avanzado.
- VAL-23 planificada para editores, listas, saltos, sanitización, persistencia, sinks, modos y service worker.
- Se revalidan correcciones históricas H-RTE-07 a H-RTE-11 de 79230c57 solo por presencia estática; no equivalen a pruebas funcionales.
- El backend WRITE/FEEDBACK persiste HTML sin saneamiento autoritativo; ui.js conserva dos sinks directos de contenido descriptivo; no se ejecutó XSS.
- service-worker.js precachea rich-text.js en v14; falta validar actualización/uso offline en dispositivo.
- No se ejecutaron DOMParser real, Playwright, navegador, HTTP, Apps Script, Spreadsheet/Drive real, XSS, persistencia, service worker en dispositivo ni E2/E3.

### VAL-23 — Matriz pendiente de validación texto enriquecido
1. Barras de Inbox, contacto, add_cortes, cortes, apertura, alimentación, Tutorial, PyS, solución y prevención.
2. Negrita/color/saltos y controles existentes de cursiva/subrayado/tachado/fuente/tamaño.
3. UL por cada marcador; independencia entre listas del mismo campo.
4. OL, numeración y conservación tras guardar/editar/recargar.
5. Conversión de selección y líneas LF/CRLF sin duplicación/pérdida.
6. Enter en LI normal, con selección, vacío intermedio y último LI; cursor, salida y anidamiento.
7. Texto plano e histórico con BR/P/DIV/UL/OL y marcadores.
8. Sanitizador: script, onerror, SVG, iframe, srcdoc, javascript:, data:, URL, CSS y HTML malformado.
9. Llamadas directas backend en Cortes/PyS/solución/prevención/edición.
10. Detalle, carrusel, sección sin carrusel, impresión, exportación, Inbox y offline.
11. Modo estricto por defecto, avanzado, persistencia y permisos.
12. Service worker v14: instalación, actualización, caché y recuperación offline.
- Estado VAL-23: PLANIFICADA; no ejecutada.


## 22. Actualización de cobertura — AUD-T-015
Sesión AUD-20261108-S033 | Checkpoint AUD-CP-0033 | HEAD c4f61a1f8dc402c9fec6802032ca7d7f9c304695 | árbol adda8ff26199530c2ec30d739510128efa060cb3 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-015 E1 estática completada; H-AUD-015-001 a H-AUD-015-004 abiertos; H-AUD-037-003 a 006 revalidados; VAL-24 planificada.
- Catálogo AUD-T: 38 unidades; 29 con E1 completada, 1 parcial y 8 por auditar.
- Catálogo AUG: 100 IDs únicos dentro de AUG-001 a AUG-101; AUG-015 continúa ausente.
- Nuevas AUG-098 a AUG-101: consulta de búsqueda segura; limpieza de referencias a filtros cancelados; sistema universal de botones; clasificación de secciones sintéticas.
- AUG-049 recibe adenda de evidencia actual: defectos de búsqueda y autoapertura siguen presentes; no duplicar hallazgos H-AUD-037-003 a 006.
- Filtros rápidos: cancelación confirmada en DOM/CSS; se detectan referencias residuales en main.js que pueden lanzar ReferenceError.
- La búsqueda mantiene rutas multi-sección y badges, pero un único resultado no-Corte puede abrir modal Corte; la inferencia de marca puede clasificar una sección sintética como logo.
- No se ejecutaron DOM/browser, XSS, Playwright, catálogo real, Apps Script/Spreadsheet, concurrencia, lectores de pantalla, móviles ni E2/E3.

### VAL-24 — Matriz pendiente búsqueda global y botones
1. Búsqueda de Cortes/Relay/Tutorial/PyS y mezcla de secciones.
2. Coincidencia exacta/parcial/descriptiva, ranking y normalización de acentos/espacios.
3. Modelos numéricos dentro/fuera de 1900–2100 frente a años.
4. Slots 1/2/3 y campos textuales de todas las secciones.
5. Una coincidencia única por sección; destino modal correcto.
6. Consultas Relay/Tutorial/Problema sin renderizado de logo sintético.
7. Carga PyS lenta/error, múltiples pulsaciones, deduplicación y actualización de consulta activa.
8. XSS en encabezado/estado vacío mediante input y deep link; todo como texto.
9. Filtros rápidos ausentes y blur sin ReferenceError.
10. Botones de index/users/add_cortes y dinámicos; jerarquía y estilos.
11. Focus-visible, disabled, loading, hover/active, contraste y modo claro/oscuro.
12. Responsive móvil/escritorio; no alterar inputs/selects.
- Estado VAL-24: PLANIFICADA; no ejecutada.

================================================================================
ACTUALIZACIÓN DE COBERTURA — AUD-T-016
Sesión AUD-20261108-S034 | Checkpoint AUD-CP-0034 | HEAD 2daf88c96d29999cbc734c968ef94355ee5324ca | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- AUD-T-016 E1 estática completada; H-AUD-016-001 a H-AUD-016-004 abiertos; VAL-25 planificada.
- Controles: persistencia de tema, intercambio de logos, variables CSS, flex-wrap del encabezado y footer con sentinel/IntersectionObserver.
- Hallazgos: regla oscura del banner no coincide con body.dark-mode; --text-primary no está definido; tokens separados entre páginas y colores fijos; zoom bloqueado; layout móvil incompleto en add_cortes/users.
- Nuevas AUG-102 a AUG-105.
- Cobertura: 38 unidades; 30 con E1 completada, 1 parcial y 7 por auditar. AUG: 104 IDs únicos dentro de AUG-001 a AUG-105; AUG-015 continúa ausente.
- VAL-25: temas/contraste, zoom, formularios, tabla/modal, footer, PWA y accesibilidad responsive; planificada, no ejecutada.
- Sin pruebas de navegador, contraste medido, zoom real, lectores de pantalla, dispositivos móviles ni E2/E3. Sin cambios de aplicación.
================================================================================
