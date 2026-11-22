# Auditoría integral de aportes, latencia, panel de desarrollador y despliegue

**Requisito registrado:** 2026-11-22  
**Rama:** `GPSpedia2.2.5_work`  
**Alcance:** auditoría de código y pruebas locales de cada flujo solicitado. Las pruebas que requieran deployments, cuentas, Drive, Spreadsheet, navegador/dispositivo o credenciales Beta se registrarán como pendientes; nunca se simularán como aprobadas.

## Criterio rector de seguridad y rendimiento

La seguridad se limita a mantener identidad y datos aislados por usuario, aplicar la matriz de roles confiable del servidor, impedir el acceso a paneles/mensajes/acciones de otros roles, y respetar las excepciones de cierre remoto/eliminación de cuenta. El inicio de sesión establece el actor de la sesión. Las acciones ordinarias reutilizan el actor cacheado y comprueban la capacidad del rol localmente; no deben consultar Coordinator, Users o ActiveSessions, renovar identidad, adquirir leases ni hacer viajes de red por acción. La invalidación se propaga cuando se cierra una sesión remotamente, se elimina la cuenta o se revoca/cambia su rol. Las contraseñas mantienen el hash vigente; no se cambia su coste ni el flujo sin evidencia. La autorización no se elimina: se ejecuta contra el actor confiable ya establecido.

Los datos de aporte deben asociarse al actor autenticado del servidor, nunca al nombre/ID/rol declarado por el navegador. Se registra el nombre y la fecha del aporte y se conserva el historial/estadísticas que corresponden al dashboard. El registro silencioso de desarrollador usa la fecha histórica de un año anterior conforme al comportamiento solicitado, sin mostrar al usuario un mensaje de registro ordinario.

## Plan de auditoría y orden de ejecución

Cada bloque se audita por separado. Para cada uno se registran rutas y funciones inspeccionadas, llamadas de red/lecturas/escrituras, pruebas existentes, pruebas focalizadas ejecutadas, resultado, defectos, severidad, tareas correctivas y validaciones diferidas. Un contrato estático no se presenta como prueba real de interfaz o servicio.

| ID | Bloque | Cobertura y criterios de aceptación |
|---|---|---|
| A01 | Sesión, identidad, roles y datos del colaborador | Login establece actor y rol; cache hit sin viajes de red; invalidación remota solo en cierre remoto/eliminación/revocación; aislamiento por token/usuario; backend rechaza capacidades y mensajes de rol ajeno; aporte toma nombre/ID del actor confiable; historial y dashboard no mezclan usuarios. |
| A02 | Latencia y llamadas redundantes de aportes | Trazar cada ruta de escritura, comparar lecturas/llamadas repetidas, snapshots, preflight, revalidaciones, locks, retries y confirmaciones; medir qué operaciones pueden ejecutarse en paralelo; no quitar comprobaciones funcionales necesarias. |
| A03 | Imágenes desde edición in-modal | Editar/reemplazar/eliminar imagen, persistencia, vínculo Drive, ledger, rollback/recuperación, preview y refresco; una sola carga efectiva por operación y ausencia de relecturas redundantes. |
| A04 | Botón + / información suplementaria | Revisar alta de apertura, alimentación/cables, nota e imágenes; actor/fecha/opId; append-only e idempotencia; múltiples imágenes; confirmación UI y recuperación ante fallos. |
| A05 | `HTML/add_cortes.html` | Alta de vehículo y corte, imágenes de vehículo/corte, validaciones, asignación ID, fecha normal y registro silencioso; verificar que el envío no duplica llamadas ni revalida identidad; rol desarrollador para silent. |
| A06 | Videos y otros aportes | Upload resumable, recuperación, aprobación, asociación con vehículo/modelo, estados duplicados, llamadas de red y reintentos; concurrencia entre pestañas y dispositivos. |
| A07 | Atribución, fechas y dashboard de actividad | Nombre/fecha de servidor; registros normales y silenciosos con fecha de un año anterior; historial de aportes, cortes por colaborador, vehículos más buscados, votos útiles y demás indicadores; límites de privacidad/rol y consistencia entre hojas/ledger. |
| A08 | Panel de desarrollador: salud y tráfico | Vista global de todos los servicios, selección individual, health check real por servicio, métricas completas, estado parcial/error, refresco y llamadas duplicadas; no confundir eventos Coordinator con tráfico HTTP total. |
| A09 | Biblioteca y escáner de imágenes | Progreso, etapas, conteos y contenido en consola del desarrollador; no abrir modal alternativo; inventario automático de cada imagen encontrada en hoja de imágenes reemplazadas; no exigir botón de registro histórico; idempotencia y no duplicación. |
| A10 | Asociación de imágenes a modelos | Asociar por nombre de archivo y carpeta de Drive; normalización de marca/modelo, alias, variantes, ambigüedades y colisiones; no asignar automáticamente si la coincidencia no es fiable. |
| A11 | Guía paso a paso de despliegue | Confirmar que `Services/DEPLOYMENT_GUIDE.md` cubre los ocho servicios, orden/dependencias, archivos completos, URLs/propiedades, secretos sin valores, pruebas, actualización, rollback y separación Beta/producción; comprobar coherencia con fuentes actuales. |
| A12 | Regresión integral y cierre | Ejecutar suite completa, sintaxis, referencias, contratos de roles, pruebas de aislamiento y revisión del diff; dejar lista de validaciones Beta con precondiciones/evidencia. |

## Método obligatorio por cada bloque

1. Confirmar HEAD de la rama de trabajo y consultar normas vigentes.
2. Identificar handlers, consumidores UI, rutas API, helpers compartidos, hojas/columnas y servicios implicados.
3. Dibujar la secuencia de llamadas desde UI hasta persistencia y retorno; contar cada fetch, lectura de hoja, Drive call, lock, retry y relectura.
4. Revisar quién suministra identidad, nombre, fecha, rol y permisos; comprobar que valores del cliente no sustituyen al actor servidor.
5. Ejecutar los tests focalizados existentes y añadir pruebas de regresión exact-source o harness local cuando falte cobertura.
6. Si hay un defecto reproducible y la corrección pertenece al bloque, corregirlo antes de cerrar el bloque y ejecutar sus pruebas más la regresión pertinente.
7. Clasificar el resultado como VERIFICADO LOCAL, DEFECTO CONFIRMADO, PENDIENTE DE BETA o BLOQUEO TÉCNICO; adjuntar evidencia concreta.
8. Registrar cada hallazgo en este documento y cada corrección como tarea en `Tareas_Activas.md`; actualizar `checkpoint.md` con tarea realizada, evidencia y siguiente tarea.
9. Commit únicamente en `GPSpedia2.2.5_work`, confirmando el SHA esperado. No modificar `GPSpedia2.2.5`.
10. Continuar con el siguiente bloque sin esperar instrucciones adicionales. No desplegar Apps Script ni alterar recursos productivos sin autorización.

## A01 — Sesión, identidad, roles y datos del colaborador

**Estado actualizado:** contratos locales/CI aprobados; pruebas reales de cuentas/servicios Beta pendientes.

### Evidencia observada

- `JS/Services/SharedMutationClient.js`: `getCachedSharedSessionActor_()` consulta CacheService local. En cache hit devuelve el actor y renueva TTL local (máximo 21,600 s); no llama a Coordinator ni lee Users/ActiveSessions.
- El mismo archivo implementa precarga del actor por token y acciones internas de invalidación de caché. `Auth.js` sincroniza el contexto durante login y registra el resultado de precarga; esto evita depender de una validación remota en cada clic.
- Las rutas de revocación usan invalidación dirigida antes de revocar el contexto central. `Services/DEPLOYMENT_GUIDE.md` exige URL ADMIN en Coordinator para la invalidación de caché.
- `JS/Services/SessionActivityLeaseMinimization.mjs` protege que WRITE/FEEDBACK no adquieran leases ordinarias, que USERS reutilice actor cacheado para getUsers/updateProfile, que AUTH reserve la lease solo para eliminación y que ADMIN no adquiera leases.
- `JS/Services/write.js` obtiene el nombre mediante `getAuthenticatedCollaborator()` desde `__sharedSessionActor.fullName/role`, no desde `payload.colaborador`. `users.js` exige actor confiable y compara identidad solicitada con actor para perfil.
- `InboxConversations.js` deriva actor desde el contexto FEEDBACK confiable, limita destinatarios por jerarquía de roles, exige que el usuario sea participante para leer mensajes y aplica flags/ocultación por participante. Cerrar un caso está limitado a Desarrollador/Jefe/Supervisor.
- `feedback.js` declara permisos por acción: `getActivityLogs` solo Desarrollador/Jefe/Supervisor; métricas `getServiceTraffic` pasan por ADMIN/Coordinator. El test de UI comprueba guards sin otra llamada de sesión.
- Las pruebas de contribuciones/insights validan la agregación y el renderizado; la prueba de vistas recientes verifica que el evento se registra sin bloquear la apertura del detalle.

### Hallazgo A01-01 — pérdida/expulsión de caché local

**Clasificación:** riesgo de continuidad UX, no defecto confirmado en operación normal.  
**Evidencia:** `getCachedSharedSessionActor_()` falla con `SESSION_ACTOR_CACHE_MISS` cuando CacheService no contiene el actor; no realiza fallback a Coordinator. CacheService puede desalojar entradas antes del TTL.  
**Impacto potencial:** una expulsión espontánea de caché puede hacer que una sesión no revocada reciba error y deba autenticarse de nuevo.  
**Decisión pendiente:** probar en Beta la precarga efectiva de cada servicio y el comportamiento ante eviction. Si se confirma impacto, diseñar recuperación solo en cache miss (no por acción) o mecanismo equivalente; no agregar validación remota a cada petición.

### Hallazgo A01-02 — alcance de la prueba de roles y privacidad

**Clasificación:** cobertura insuficiente pendiente de prueba, no defecto confirmado.  
**Evidencia:** existen contratos estáticos de actor y capacidades, pero la inspección parcial no demuestra todos los handlers, mensajes Inbox, panel de desarrollador y consultas de actividad con cuentas de roles distintos.  
**Tarea:** construir matriz de pruebas por rol (Desarrollador, Jefe, Supervisor, Técnico y Técnico exterior), con dos usuarios de prueba, verificando lectura/escritura cruzada, rutas UI y backend, historial y mensajes.

### Pruebas y límites

- El código y contratos estáticos citados fueron inspeccionados; en esta etapa no se ejecutó el runner Node local ni se llamó a Apps Script.
- Pendiente: ejecutar `SessionActivityLeaseMinimization.mjs`, `SessionActorCacheLifetime.mjs`, `SessionActorCacheInvalidation.mjs`, `SessionInvalidationFlow.mjs`, `WriteAuthorizationMinimization.js`, `ActivityDashboardContributions.mjs` y `ActivityDashboardInsights.mjs`.
- Pendiente Beta: dos cuentas/roles, cierre remoto, eliminación de cuenta, cambio de rol, eviction real de CacheService y verificación de que los cache hits no producen fetch a Coordinator.
- A01 no se cierra hasta demostrar que los usuarios no pueden leer aportes/mensajes ajenos o abrir herramientas de desarrollador y que la revocación remota funciona en todos los servicios.

### Próxima tarea

Completar A01 con pruebas locales de atribución de aportes y matriz de permisos; después continuar A02, trazado de latencia y llamadas redundantes en las rutas de escritura.


### Actualización de validación A01 — CI del commit 3ee1747 (2026-11-22)

**Resultado:** <span> </span> regresión de servicios SUCCESS: 302 suites / 3,524 pruebas / 0 fallos. Sintaxis Node 22: 433 archivos; referencias relativas: 344 archivos, 1/1 PASS.

Pruebas focalizadas verificadas en los logs de CI del SHA exacto:
- `SessionActivityLeaseMinimization`: 5/5 PASS.
- `SessionActorCacheLifetime`: 6/6 PASS; el actor se precarga al login, cache hit no revalida por acción y renueva TTL local.
- `SessionActorCacheInvalidation`: 1/1 PASS; invalidación/precarga autenticada en USERS, WRITE, FEEDBACK y ADMIN.
- `SessionInvalidationFlow`: 15/15 PASS.
- `DeveloperPrivilegeRouting`: 20/20 PASS.
- `CoordinatorCapabilityPreservation`: 6/6 PASS.
- `ActivityDashboardContributions`: 1/1 PASS.
- `ActivityDashboardInsights`: 1/1 PASS.
- `RecentlyViewedActivityTelemetry`: 12/12 PASS.
- `InboxUi`: 87/87 PASS, incluyendo reglas por rol y navegación.
- `AuthSessionReadOptimization`: 9/9 PASS.

**Conclusión A01:** la implementación local cumple el principio de no hacer viajes a Coordinator en cache hit y conserva la autorización por actor/rol. No se confirma una revalidación remota por cada acción. La revocación dirigida y los contratos de roles pasan CI. A01 queda **COMPLETADA EN CÓDIGO/CI, PENDIENTE DE BETA** para verificar dos cuentas reales, aislamiento de hojas/mensajes, cierre remoto/eliminación/cambio de rol y eviction de CacheService.

**Riesgo abierto A01-01:** la pérdida espontánea de una entrada CacheService produce `SESSION_ACTOR_CACHE_MISS` y rechazo de la acción sin fallback. No equivale a una validación remota por acción; debe medirse en Beta y decidir una recuperación puntual solo ante cache miss si genera reautenticaciones inesperadas.

**Límite de evidencia:** CI usa contratos y dobles locales; no ejecutó los deployments Apps Script ni probó datos reales de dos usuarios. Health read-only SUCCESS solo verifica disponibilidad de deployments existentes.



## A02 — latencia y llamadas redundantes: hallazgos iniciales

### Hallazgo A02-01 — preflight `checkOperation` en alta con opId recién generado

**Clasificación:** llamada de red redundante confirmada por flujo de código; corrección implementada, CI pendiente.  
**Evidencia:** `HTML/add_cortes.html` generaba un opId aleatorio nuevo cuando no existía snapshot local ni vínculo Inbox y, aun así, consultaba `checkOperation` antes del primer `addOrUpdateCut`. No puede existir un registro remoto previo de ese identificador recién generado. La consulta sí es necesaria cuando el ID proviene de un snapshot recuperado o es determinista (`OP-FEEDBACK-...`) para conciliar intentos anteriores.  
**Impacto:** una petición HTTP adicional antes de cada alta nueva de corte/vehículo.  
**Corrección:** se añadió `state.opIdRequiresServerCheck`; un ID aleatorio nuevo omite el preflight, mientras que snapshots recuperados e IDs deterministas de Inbox conservan la consulta. El snapshot IndexedDB se sigue verificando antes del POST y permite recuperación ante respuesta perdida. La idempotencia del servidor no se elimina.  
**Pruebas añadidas:** `AddCutOperationRecoveryFlow.js` comprueba alta nueva sin checkOperation, ID determinista con checkOperation y conserva escenarios de respuesta perdida antes/después del commit y recuperación de snapshot.  
**Estado:** IMPLEMENTADO Y VALIDADO EN CI exacto del SHA `736224a541c218b934bc0d6710a27f0f35b96aaa`: 302 suites / 3,526 pruebas / 0 fallos. `AddCortes diagnostics` 14/14 PASS, incluidos ambos escenarios nuevos y recuperación tras respuesta perdida.

### Hallazgo A02-02 — lectura completa del catálogo tras guardar información suplementaria

**Clasificación:** optimización implementada y prueba focalizada añadida; CI pendiente.  
**Evidencia:** `handleStage3Submit` envía `addSupplementaryInfo` a WRITE y después `verifySupplementaryCatalogWrite_` solicita `getCatalogData({forceRefresh:true})`. `CATALOG.handleGetCatalogData` recorre Cortes, aportes, logos, tutoriales y relay para confirmar solo un vehículo/campo. WRITE ya confirma el evento append-only mediante lectura posterior del ledger y valida el journal de imágenes; el propio flujo redirige a index.html, que volverá a cargar el catálogo.  
**Impacto potencial:** segunda petición de red y reconstrucción de catálogo completo antes de la redirección.  
**Acción:** evaluar si una proyección dirigida `getVehicleProjection` (lectura del vehículo y ledger) o la confirmación de WRITE basta, sin perder detección de errores ni coherencia. No retirar la verificación hasta cubrir el caso con test.

### Hallazgo A02-03 — VIN: preflight de blur y pre-submit, más validación autoritativa WRITE

**Clasificación:** posible duplicación; pendiente de caracterización.  
**Evidencia:** el formulario consulta `checkVinDuplicate` al perder foco y vuelve a consultar al enviar. WRITE vuelve a comprobar duplicados dentro de la mutación antes de registrar el VIN.  
**Acción:** verificar si puede reutilizarse el resultado de blur mientras el VIN/vehículo no cambien, manteniendo siempre la comprobación autoritativa en WRITE para concurrencia.

### Hallazgo A02-04 — refresco de coincidencia tras alta

**Clasificación:** pendiente de caracterización.  
**Evidencia:** después de `addOrUpdateCut`, `refreshSelectedVehicleMatch` puede consultar `checkVehicle` antes de mostrar etapa 3.  
**Acción:** determinar qué campos necesita etapa 3 y si el resultado de WRITE/snapshot previo permiten evitar esa petición sin mostrar disponibilidad desactualizada.

### Hallazgo A02-05 — carga suplementaria y verificación Drive/ledger

**Clasificación:** pendiente; no asumir que las lecturas son duplicadas.  
**Evidencia:** la carga de imágenes usa `ImageUploadEvents`, verifica archivo y descripción en Drive, confirma el evento y marca la carga vinculada; el aporte append-only verifica el ledger.  
**Acción:** contar las lecturas por imagen y determinar cuáles garantizan idempotencia/recuperación y cuáles pueden compartir snapshot o ejecutarse en paralelo con seguridad.


### Cierre A02-01
La optimización quedó validada por CI; no se detectaron regresiones en recuperación ni idempotencia. Health read-only y Pages build/deployment también SUCCESS para el SHA exacto. No equivale a prueba manual en navegador o servicio Apps Script.


### Implementación A02-02
La verificación de add_cortes.html ahora consulta getVehicleProjection({vehicleId}) y valida el objeto vehicle retornado, en lugar de pedir getCatalogData({forceRefresh:true}) y recorrer el catálogo completo. Se conserva la verificación de ID y de cada campo suplementario esperado. El endpoint dirigido usa CATALOG y construye la proyección del vehículo desde Cortes + ledger; no consulta logos, tutoriales ni Relay. Pruebas añadidas en AddCortesDiagnostics.mjs para asegurar una sola consulta dirigida y rechazo de ID diferente. CI pendiente.


### Resultado CI inicial de A02-02 y corrección del harness

El primer CI del SHA ef13ccb1541d0c6410905bf9c4c2b363315c896a detectó dos fallos de pruebas, no de sintaxis de producción:
1. AddCortesDiagnostics.mjs invocó extractFunction sin definir el helper del test.
2. SupplementaryVideoContract.js seguía esperando la respuesta antigua data.cortes[] y el endpoint getCatalogData(forceRefresh), por lo que su contrato quedó desactualizado tras cambiar a getVehicleProjection.

Se actualizan ambos contratos para el nuevo shape {status, vehicle, source}, y se conserva la prueba de rechazo de ID/campos incorrectos. El CI debe repetirse antes de dar A02-02 por validada.


### Ajuste del contrato suplementario de vídeo

Se corrigió el último caso de prueba para que la validación de slot se ejecute con una respuesta de proyección dirigida válida, pero sin slot devuelto por WRITE. Así el test comprueba el contrato de slot y no pasa accidentalmente por falta de objeto vehicle.


### Ajuste de prueba A02-02 — slot suplementario

El segundo CI detectó que la nueva prueba focalizada enviaba campos de alimentación pero simulaba una respuesta WRITE sin slotIndex. El helper correctamente rechazó esa respuesta. Se ajusta el doble de WRITE para incluir slotIndex=1, y se conserva la validación estricta de que un cable requiere slot válido.


### Cierre A02-02

**CI exacto:** SHA 425a2db327635efe0c6794467ed421ed1d4ed322 — 302 suites / 3,528 pruebas / 0 fallos. AddCortes diagnostics 16/16 PASS; SupplementaryVideoContract 55/55 PASS; CatalogVehicleProjectionRead 1/1 PASS; CatalogTargetedResponses 3/3 PASS. Health read-only SUCCESS y Pages build/deployment SUCCESS. La lectura dirigida conserva la comprobación de campos y el slot retornado por WRITE. A02-02 queda **VALIDADA EN CÓDIGO/CI**; falta únicamente prueba manual del navegador/Apps Script Beta.

### Observación cruzada para A05 — trazabilidad de suplementos en add_cortes

**Clasificación:** DEFECTO DE TRAZABILIDAD CONFIRMADO EN CÓDIGO; corrección pendiente de A05.  
**Evidencia:** tras confirmar el corte en etapa 2, add_cortes limpia `state.opId`; etapa 3 envía `opId: state.opId` (null). En WRITE, `handleAddSupplementaryInfo` solo usa el ledger append-only cuando recibe opId; sin él entra a la ruta heredada `handleAddSupplementaryInfoLocked`. Esa ruta actualiza columnas de Cortes y escribe el nombre del actor en Logger, pero no agrega evento a AportesVehiculo ni guarda actorId/actorName/createdAt por aporte. El campo timestamp del vehículo solo se completa si estaba vacío.  
**Impacto:** apertura/alimentación/nota agregadas desde la etapa 3 pueden quedar guardadas en la ficha, pero sin una entrada durable individual en el historial de aportes ni fecha/nombre de esa contribución para el dashboard.  
**Acción:** A05 debe diseñar IDs de operación separados por cada tipo de aporte (apertura y alimentación independientes si el ledger actual lo exige), preservar los campos múltiples que hoy se pueden enviar juntos, registrar actor y fecha desde el servidor, y validar la proyección y dashboard. No reutilizar el opId de corte ya completado ni degradar a la ruta heredada.


### A02-03 — preflight VIN duplicado entre blur y submit

**Clasificación:** llamada duplicada confirmada en UI; optimización implementada, CI pendiente.  
**Evidencia:** el listener blur y el submit consultaban checkVinDuplicate para el mismo VIN/vehicleId. WRITE vuelve a comprobar la unicidad dentro de la mutación, que es el control autoritativo necesario para concurrencia.  
**Corrección:** helper checkVinDuplicateOnce_ comparte la promesa concurrente y reutiliza el resultado por VIN normalizado + vehicleId; se invalida al editar el campo o cambiar el vehículo. Si falla, no cachea el error y permite reintentar. WRITE conserva su comprobación final, por lo que no se debilita la protección ante un VIN registrado después del preflight.  
**Pruebas:** una llamada concurrente/una cache hit; invalidación por VIN/vehículo; retry tras error; blur y submit usan el helper y no consultan directamente. CI pendiente.


### Resultado CI inicial A02-03

El CI del SHA e313ff8c57239dd5f981f6b3396aa779f2bd1a4d falló solo en el doble de prueba: el mock exigía vehicleId=204 incluso después de que el caso cambiara intencionalmente a 205 para comprobar invalidación. La implementación envió el nuevo vehicleId correctamente; el assert del mock era incorrecto. Se ajusta para comparar con el estado actual y se repetirá CI.


### Cierre A02-03

**CI exacto:** SHA f68691cffc630cdb0c1aef2eb316b6732bb3024a — 302 suites / 3,531 pruebas / 0 fallos. AddCortes diagnostics 19/19 PASS, incluidos single-flight/cache hit, cambio de VIN/vehículo y retry tras fallo. Health read-only y Pages build/deployment SUCCESS. A02-03 queda **VALIDADA EN CÓDIGO/CI**; WRITE conserva la comprobación final de VIN dentro de la mutación.


### A02-04 — refresco posterior a alta de corte

**Hallazgo:** los tres caminos de confirmación/recuperación llamaban a `refreshSelectedVehicleMatch`, que volvía a ejecutar `checkVehicle` con criterios amplios y descargaba la lista de coincidencias para actualizar un único vehículo cuyo ID ya había confirmado WRITE/checkOperation.

**Corrección:** `refreshSelectedVehicleMatch` consulta ahora `getVehicleProjection({vehicleId})`; actualiza o inserta únicamente el vehículo solicitado en `state.matches`. La proyección conserva campos del vehículo, disponibilidad de cortes y URL de vídeo. Si la lectura falla o devuelve un ID distinto, mantiene el fallback conservador: no inventa disponibilidad para vehículos existentes y marca `cutAvailabilityUnknown`.

**Pruebas añadidas:** una petición dirigida exacta, reemplazo de un único vehículo, preservación de tipo de corte y vídeo, eliminación de flag unknown al recibir proyección válida y fallback ante respuesta no válida. CI pendiente.


### CI A02-04 — corrección del doble de diagnóstico

El primer CI del refresco dirigido pasó los asserts funcionales de la proyección, pero falló el escenario fallback porque el test aislado no inyectaba el logger `diagnostics` que la función usa para registrar una lectura fallida. Se corrige el harness proporcionando un logger no-op. No es un fallo de la llamada dirigida ni de la lógica de fallback de producción.


### A02-04 cerrada en CI

**CI exacto:** SHA `825b048db860a0928205a4f288f5d4b3b8fd3c13` — 302 suites / 3,533 pruebas / 0 fallos. El test de refresco dirigido cubre respuesta por ID, preservación de disponibilidad/vídeo y fallback conservador. Health read-only SUCCESS y Pages build/deployment SUCCESS. A02-04 queda validada en código/CI; no equivale a prueba manual en navegador conectado a Apps Script Beta.


### A02-05 — reutilización del handle de AportesVehiculo en WRITE

**Hallazgo confirmado:** `handleAddSupplementaryInfo` validaba/obtenía la hoja `AportesVehiculo` antes de subir imágenes y luego volvía a llamar a `getVehicleContributionLedgerSheet_` para append. La segunda llamada repetía lookup de hoja y lectura/validación de encabezados dentro de la misma petición.

**Corrección:** se conserva la validación temprana (antes de efectos externos en Drive) y se reutiliza el handle ya validado para el append. No se elimina ninguna comprobación de permisos, esquema, idempotencia, hash o lectura posterior del evento.

**Prueba:** AddSupplementaryInfoIntegrity comprueba que el handler obtiene el handle una sola vez, antes de la carga, y lo reutiliza para el append. CI pendiente.


### A02-06 — evitar relectura completa tras reservar una imagen

**Hallazgo:** al crear el evento `reserved`, `appendImageUploadEventRequired_` ya ejecuta append + flush + TextFinder de confirmación y devuelve la fila confirmada. El flujo volvía a leer todas las filas de `ImageUploadEvents` para recuperar ese mismo evento por token.

**Corrección:** se usa el evento devuelto por el append para construir la proyección local. Se conserva la lectura posterior a la operación Drive y la lectura final de confirmación, que detectan conflictos y archivos concurrentes. La reserva sigue ocurriendo antes de `folder.createFile`; no se elimina recuperación ni validación de unicidad.

**Prueba:** el contrato verifica que el evento reservado se reutiliza y que no hay lectura completa inmediata entre append y búsqueda/creación del archivo. CI pendiente.


### A02-05 y A02-06 validadas en CI

**CI exacto:** SHA `0e8110a753b8cb5b00beca0e6d66208b0ec68daf` — 302 suites / 3,537 pruebas / 0 fallos. Se validó la reutilización del handle de AportesVehiculo y el fast path de reserva de imagen. Health read-only SUCCESS. A02-05/A02-06 validadas en código/CI, no en entorno Beta con Drive real.

### A02-07 — lecturas repetidas al vincular imágenes

En `markImageUploadLinkedWithShortLedgerLock_`, el camino de recuperación sin evento pending vuelve a leer todas las filas por token inmediatamente después de `appendImageUploadEventRequired_`, aunque el append ya devuelve la fila confirmada. Revisar si se puede reutilizar el evento devuelto y conservar la lectura final tras append linked para detectar concurrencia/conflictos. No retirar `getImageUploadReferences_`: verifica que el archivo quedó realmente referenciado antes de marcarlo linked.


### A02-07 — vinculación de imagen sin relectura inmediata tras pending

**Hallazgo:** durante recuperación, si no existe evento pending para el fileId, el helper hace append confirmado y vuelve a leer todas las filas por token para reconstruir la proyección. El append ya devuelve la fila confirmada.

**Corrección:** incorpora el evento devuelto al snapshot local y calcula la proyección sin relectura inmediata. Se conserva la lectura final tras append linked para detectar conflictos y escrituras concurrentes. También se conserva la lectura completa de referencias en Cortes/AportesVehiculo antes de vincular, porque evita marcar como linked una imagen que no está realmente referenciada.

**Prueba:** el contrato comprueba reutilización del evento pending y permanencia de la lectura final. CI pendiente.


### A02-07 validada en CI

**CI exacto:** SHA `46e9a1a1f95d1f6b1aed55d5cf16cdc80e3d0c68` — 302 suites / 3,539 pruebas / 0 fallos. Se validó la reutilización del evento pending retornado por append y la permanencia de la lectura final linked. Health read-only SUCCESS. La búsqueda de referencias de imagen y el read-back final permanecen por integridad.

### A02-08 — revisión de búsquedas de Drive y conversión de imagen

Los modales + de apertura/alimentación convierten la imagen una vez en el navegador, generan opId al abrir el modal y envían una llamada WRITE. El servidor decodifica, calcula hash, valida MIME/tamaño, reserva journal antes de crear archivo y verifica el archivo/metadata. No se identificó una conversión FileReader duplicada en estos dos callsites. La búsqueda por nombre + enumeración de carpeta en `findExistingImageUpload` se mantiene provisionalmente para recuperación de archivos renombrados/duplicados; requiere caracterizar alternativa sin perder recuperación antes de modificar.


### A02-09 — lectura FileReader duplicada en add_cortes

**Hallazgo confirmado:** `setupImagePreview` leía cada archivo con un FileReader para mostrar la previsualización y `handleStage3Submit` volvía a leer el mismo objeto File con `fileToBase64` antes del POST. Esto duplicaba la conversión Base64 en el cliente (no dos subidas Drive, pero sí CPU/memoria y tiempo de espera).

**Corrección:** previsualización y envío usan ahora `fileToBase64` compartido con caché WeakMap por objeto File. Las llamadas concurrentes reutilizan la misma promesa; si la lectura falla, la entrada se elimina y se permite reintentar. Las validaciones de tamaño/MIME siguen ejecutándose antes de leer y el servidor conserva sus verificaciones.

**Pruebas:** una lectura para preview+submit, reutilización de promesa y reintento tras fallo. CI pendiente.


### CI inicial A02-09 — corrección de fixtures

El primer CI del cambio de caché FileReader falló en dos pruebas del harness, no en la sintaxis del frontend: el mock mantenía el resultado PNG del caso anterior y no implementaba el modo de error que el test de reintento activaba. Se actualiza el mock para resetear MIME por escenario y simular onerror; la prueba comprueba que el fallo elimina la promesa cacheada y permite una segunda lectura.


### A02-09 validada en CI

**CI exacto:** SHA `f65a955a9646adf64408f05365a7305fd40bb03d` — 302 suites / 3,543 pruebas / 0 fallos. Health read-only y Pages SUCCESS. El primer intento tuvo dos fallos de fixtures (MIME heredado y mock sin onerror), corregidos antes de esta ejecución.

### A05-01 — atribución de aportes y dashboard

**Hallazgo confirmado en etapa 3 de add_cortes:** el flujo limpia `state.opId` al completar el corte; la etapa 3 envía `opId: null`. WRITE entra entonces en compatibilidad legacy y no agrega evento `AportesVehiculo` para apertura/alimentación. En esa ruta el nombre aparece en Logger, no como registro durable con `actorId`, `actorName` y `createdAt`. La UI además lee `silentRegister` en etapa 3, pero no envía ese valor; la opción silenciosa sí se envía en etapa 2 al crear el corte.

**Hallazgo confirmado en dashboard:** `buildCutContributionSummary_` lee los colaboradores de las tres columnas de corte en `Cortes`; no consume los eventos `opening/feed` del ledger `AportesVehiculo`. Por tanto, el resumen por usuario no contabiliza esos aportes suplementarios. El historial de logs es otra vista y no sustituye el historial append-only.

**Diseño requerido:** operación suplementaria con IDs idempotentes independientes por tipo; persistencia/reintento ante respuesta perdida; registro servidor de actor y fecha; soporte para aportes simultáneos apertura/alimentación y nota sin colisión de opId; extensión del dashboard para contar y mostrar los tipos de aporte desde el ledger sin duplicar los cortes históricos. No vincular actor a credenciales o contraseñas; usar el actor confiable ya cacheado por sesión.


### A06-01 — guía de despliegue y panel de salud/tráfico

**Guía de despliegue:** `Services/DEPLOYMENT_GUIDE.md` existe y está estructurada por los ocho proyectos (COORDINATOR, CATALOG, AUTH, USERS, WRITE, FEEDBACK, UTILITIES, ADMIN), orden, archivos, ScriptProperties/secretos, dependencias, pruebas de humo, actualización del frontend, redeploy selectivo y rollback. Incluye advertencia explícita de no usar IDs/URLs operativos para Beta. Se considera **documentalmente completa para preparar Beta aislada**; no acredita que se hayan desplegado o probado los servicios ni sustituye el checklist de la lista Beta.

**Panel de desarrollador:** el botón de escaneo consulta los siete servicios en paralelo y valida identidad JSON/estado/versión con timeout 8 s; muestra estado, HTTP, última comprobación/respuesta válida, latencia, versión y detalle del servicio seleccionado. El gráfico global muestra contadores de eventos registrados por Coordinator (última hora/6 h/24 h) para los siete servicios; el detalle incluye además métricas locales del navegador actual.

**Limitación funcional confirmada:** seleccionar una tarjeta solo cambia `selectedServiceKey` y renderiza el resultado del último escaneo; no ejecuta una comprobación fresca del servicio seleccionado. El tráfico global tampoco representa todas las solicitudes HTTP: Coordinator registra adquisiciones nuevas de lease, validaciones de contexto y feed; excluye rutas directas no coordinadas, sondeos de salud y solicitudes no instrumentadas. El propio panel/documento lo advierte, pero no debe llamarse contador global completo.

**Salud de dependencias:** el endpoint solo confirma identidad/versión/estado del endpoint; no comprueba Sheets ni Drive. La guía y `SERVICE_HEALTH.md` declaran esta limitación.
