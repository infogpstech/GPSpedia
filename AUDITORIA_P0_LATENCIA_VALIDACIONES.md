# Auditoría P0 — mapa de latencia y validaciones por acción

**Tarea:** GP-PERF-SIMPLIFY-01 / P0  
**Fecha:** 2026-11-17  
**Repositorio:** infogpstech/GPSpedia  
**Rama inspeccionada:** GPSpedia2.2.5_work  
**HEAD inspeccionado:** 632ae83b63474654a9966cd947a80f34d4619e48  
**Resultado:** P0 COMPLETADA (auditoría estática de código). Implementación P1 pendiente.  
**Alcance:** Coordinator, SharedMutationClient, WRITE, ADMIN y FEEDBACK, con foco en aportes y archivos.

## 1. Hallazgos principales

### 1.1 La lease ejecuta llamadas de red antes y después de la operación

En `JS/Services/SharedMutationClient.js`:
- `withLease()` solicita `acquire` a Coordinator (líneas 71–78).
- Ejecuta el handler local (línea 85).
- Solicita `release` en `finally` (líneas 86–91).
- La adquisición configura `waitMs: 12000`; Coordinator permite esperar hasta 15 segundos (`JS/Services/Coordinator.js`, líneas 731–742 y 853–877).

Por tanto, una acción protegida ordinaria añade dos viajes HTTP servidor-a-servidor a Coordinator, además del trabajo real. Si hay contención, puede esperar varios segundos antes de empezar. La liberación también depende de otra llamada de red.

### 1.2 Coordinator vuelve a validar la sesión en cada adquisición

En `JS/Services/Coordinator.js`:
- `acquire_()` obtiene el userId/token y ejecuta `authorizeSession_()` cuando recibe sesión (líneas 744–755).
- `authorizeSession_()` vuelve a leer el contexto central, busca el token, comprueba revocación y expiración y, cuando corresponde, actualiza `lastActivityAt` (líneas 692–728).
- Cada petición al Coordinator utiliza `withCoordinatorLock_()`, que obtiene un ScriptLock y manipula ScriptProperties.

Esto confirma que la sesión y la actividad se consultan fuera del login/restauración, en el camino de cada operación protegida. Es exactamente el trabajo repetido que el requisito nuevo pide retirar de las acciones ordinarias.

### 1.3 ADMIN añade una capa y puede encadenar una segunda operación

En `JS/Services/admin.js`:
- `doPost()` coordina todas las acciones no públicas: usa la acción concreta para mutaciones o `sessionActivity` para otras acciones (líneas 875–899).
- Las mutaciones obtienen una lease ADMIN y pasan el actor a `doPostInternal_()` (líneas 901–909).
- `doPostInternal_()` vuelve a ejecutar `assertModalEditSession()` o `assertDeveloperSession()` y abre auditoría persistente para mutaciones ADMIN (líneas 1202–1211).
- El registro de corte puede invocar WRITE para asignar un ID: `callWriteServiceAction()` exige token de lease y hace un `UrlFetchApp.fetch` a WRITE (líneas 24–45; llamada desde el flujo de corte).
- WRITE recibe ese token anidado y llama a Coordinator para validarlo (`SharedMutationClient.withLease()`, líneas 63–69).

En consecuencia, el flujo ADMIN de corte puede sumar la adquisición y liberación ADMIN, la llamada ADMIN→WRITE y la validación anidada de token en Coordinator. No es una única comprobación local.

### 1.4 WRITE repite el patrón para mutaciones directas

En `JS/Services/write.js`:
- `doPost()` envuelve `addOrUpdateCut`, `addSupplementaryInfo`, `addVinToVehicle`, `allocateVehicleId` y `freezeCortesIds` con `withSharedMutationLease_()` (líneas 264–308).
- `checkOperation`, que se usa para comprobar el estado del aporte, también adquiere `sessionActivity` (líneas 284–295).
- El actor que finalmente utiliza `getAuthenticatedCollaborator()` procede del contexto inyectado por Coordinator (líneas 128–134).

Así, incluso una consulta de estado previa al envío se dirige al Coordinator aunque no escriba el registro.

### 1.5 FEEDBACK aplica el mismo esquema a aportes y contenido

En `JS/Services/feedback.js`:
- La lista `isSharedMutationAction_()` incluye likes, reportes, soluciones, tutoriales, sugerencias, solicitudes de video, Inbox y otras acciones (líneas 663–665).
- Para esas mutaciones `doPost()` obtiene una lease FEEDBACK y pasa el actor al handler (líneas 667–715).
- Las acciones protegidas que no están en la lista de mutaciones usan también `sessionActivity` (líneas 689–702).
- Algunas rutas públicas/anónimas quedan fuera, lo que confirma que el coste no es uniforme para todas las acciones.

### 1.6 Los locks locales prolongados se suman a las leases

- ADMIN `handleAddOrUpdateCut()` toma ScriptLock con espera de hasta 30 segundos y lo mantiene durante el procesamiento del registro (desde línea 6096). El flujo puede subir imágenes a Drive dentro de esa operación.
- ADMIN `handleAddSupplementaryInfo()` también espera hasta 30 segundos y mantiene el ScriptLock mientras ejecuta `uploadImageToDrive()` para las imágenes (líneas 6468–6494).
- FEEDBACK `handleAddTutorial()` usa ScriptLock con espera de hasta 15 segundos para registrar el tutorial (líneas 3222–3265).
- La aprobación/rechazo de videos también pasa por un lock de mutación local (`withVideoApprovalMutationLock_()`, líneas 3958–3969).

Estos locks no son llamadas al Coordinator, pero sí pueden serializar operaciones del mismo proyecto. En particular, mantener un lock durante la transferencia de imágenes es una fuente evitable de espera para otras acciones.

## 2. Mapa resumido por flujo

| Flujo | Coordinación/validación observada | Esperas/operaciones adicionales |
|---|---|---|
| Consulta previa `checkOperation` | WRITE → Coordinator (`sessionActivity`) | adquisición y liberación |
| Crear/editar corte por ADMIN | ADMIN → Coordinator; actor/rol en handler; posible ADMIN → WRITE → Coordinator (validación anidada) | lock ADMIN de hasta 30 s; Drive; auditoría |
| Crear/editar corte por WRITE directo | WRITE → Coordinator | adquisición y liberación; lock de escritura local según handler |
| Información suplementaria con imágenes | ADMIN → Coordinator | lock ADMIN durante carga Drive y escritura |
| Tutorial | FEEDBACK → Coordinator | lock FEEDBACK local; escritura de hoja |
| Video | FEEDBACK → Coordinator | lock local de aprobación/publicación según acción |
| Otras mutaciones FEEDBACK | FEEDBACK → Coordinator | adquisición y liberación |
| Lecturas protegidas ADMIN/FEEDBACK | Coordinator mediante `sessionActivity` | dos viajes de red en la ruta protegida |

## 3. Clasificación para la simplificación

**Retirar de operaciones ordinarias (P1/P2):**
- Adquisición/liberación de lease para cada aporte.
- Revalidación de token, epoch, revocación y actividad en cada handler ordinario.
- Viajes a Coordinator para `checkOperation` si el estado puede consultarse directamente en el servicio responsable.
- Validación de lease anidada ADMIN→WRITE para acciones ordinarias.
- Esperas de lease de 12 segundos y la serialización global entre servicios.
- Locks globales que abarcan la carga de imágenes, reduciendo su alcance al tramo mínimo de escritura solo si la operación lo necesita.

**Conservar o revisar en P3 (no retirar sin sustitución funcional):**
- Inicio de sesión y obtención del rol.
- Cierre remoto de sesión, invalidación de sesiones al borrar usuarios y bloqueo temporal de login.
- La asignación del colaborador y fecha de servidor en cada registro.
- Locks locales estrictamente necesarios para evitar que dos escrituras simultáneas corrompan la misma hoja o asignen el mismo ID. Deben ser cortos y no cubrir transferencias de archivos.
- Validaciones de datos requeridos y errores reales de Drive/Spreadsheet.

## 4. Orden de implementación derivado

1. **P1.1 — WRITE/ADMIN cortes:** retirar la coordinación transaccional de las rutas de aporte ordinarias y resolver el actor/rol desde el contexto de sesión ya establecido, sin aceptar campos privilegiados arbitrarios como identidad. Simplificar también `checkOperation` para que no contacte Coordinator.
2. **P1.2 — Escrituras locales:** acortar los locks de ADMIN que actualmente cubren carga Drive; mantener solo exclusión local breve alrededor de la escritura de hoja/ID cuando haga falta.
3. **P1.3 — FEEDBACK:** retirar leases de tutoriales, PyS y aportes ordinarios, conservando el control simple de rol y autor.
4. **P2 — Archivos:** revisar en detalle los flujos de imagen/video y separar transferencia Drive de la sección crítica de escritura.
5. **P3 — Sesión:** preservar solo las tres excepciones de sesión expresamente requeridas.

## 5. Límites y validación

- Auditoría realizada mediante lectura estática de fuentes; no se ejecutaron Apps Script, hojas ni Drive.
- No se midieron latencias reales en esta fase; los tiempos de espera configurados no equivalen a la latencia real.
- No se desplegaron servicios ni se ejecutaron pruebas Beta/productivas.
- Antes de retirar cada ruta, se deben actualizar las pruebas de contrato que actualmente esperan leases, y agregar pruebas que demuestren que las acciones ordinarias no llaman Coordinator y que los roles siguen aplicándose.

**Conclusión P0:** la causa arquitectónica está identificada. Las rutas ordinarias añaden llamadas de red a Coordinator, revalidan la sesión por operación y, en algunos flujos, mantienen locks durante la carga de archivos. P0 queda COMPLETADA; P1 queda EN PROGRESO/PENDIENTE DE IMPLEMENTACIÓN.


## Adenda de cierre — estado actual de implementación (2026-11-21)

- La secuencia P0/P1 derivada de esta auditoría se completó localmente: migraciones WRITE/ADMIN, FEEDBACK, likes, sugerencias de año, reportes, PyS, tutoriales y aprobaciones de vídeo cuentan con pruebas de contrato/regresión integradas.
- El registro operativo vigente Tareas_Activas.md marca GP-CONCURRENCY-CUT-MULTI-ENTRY-01 y GP-UX-RECENT-VIEWED-CACHE-PARALLEL-01 como COMPLETADAS CON VALIDACIÓN DIFERIDA A BETA. GP-UX-SEARCH-MODEL-GROUPING-01 también cerró localmente.
- CI 44908747376 SUCCESS: 259 suites, 3,129 pruebas aprobadas, 0 fallos; sintaxis de módulos backend PASS. Health read-only 44908747421 y Pages 44908747537 SUCCESS.
- La concurrencia real Apps Script/Spreadsheet/Drive, Coordinator entre proyectos, OAuth, IndexedDB real y aceptación visual permanecen exclusivamente en Beta aislada. No se desplegó Apps Script ni se modificaron datos productivos.
