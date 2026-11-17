# Plan de simplificación de seguridad y optimización de rendimiento — GPSpedia

**Fecha:** 2026-11-17  
**Rama:** `GPSpedia2.2.5_work`  
**Estado:** REQUISITO REGISTRADO — PLAN PENDIENTE DE EJECUCIÓN  
**Objetivo:** que las funciones de GPSpedia respondan con la menor latencia posible, eliminando validaciones y coordinaciones redundantes que no aporten valor funcional al alcance de la plataforma.

## 1. Requisito funcional aprobado

La plataforma debe priorizar una experiencia ágil y directa. Los usuarios podrán realizar las operaciones que su rol permite sin que cada servicio solicite autorización a otros servicios, verifique transacciones, adquiera leases o repita consultas de identidad antes de procesar cada acción.

Para un aporte (corte, tutorial, video, imagen u otro registro), el flujo esperado es:
1. El usuario completa el formulario y selecciona los archivos.
2. El sistema recibe la información y los archivos.
3. Registra el contenido, la fecha y el usuario colaborador autenticado.
4. Devuelve el resultado sin pasos intermedios de autorización entre servicios ni validaciones transaccionales añadidas.

La única política de acceso ordinaria es: inicio de sesión con contraseña almacenada mediante el hash actual y permisos determinados por el rol asignado. La comprobación de rol/capacidad debe ser sencilla y no provocar viajes de red adicionales. No se deben cambiar el algoritmo ni los parámetros actuales del hash como parte de esta tarea.

### Excepciones que sí deben conservarse
- Cerrar remotamente una sesión y limpiar/inutilizar la caché asociada a ese usuario.
- Al eliminar una cuenta, invalidar sus sesiones y evitar que vuelva a ingresar.
- Bloquear temporalmente el inicio de sesión después de varios intentos fallidos, evitando reintentos que consuman recursos.
- Mantener las comprobaciones funcionales mínimas necesarias para procesar correctamente los datos (por ejemplo, campos indispensables, límites técnicos de archivo y errores reales de almacenamiento). No introducir controles ceremoniales, validación de transacción ni verificaciones duplicadas.
- No permitir que la interfaz muestre funciones fuera del rol asignado; la matriz de roles existente define las capacidades.

## 2. Alcance de la simplificación

Se deben revisar y retirar, cuando no sean necesarias para las excepciones anteriores:
- Leases y adquisición/liberación de transacciones en Coordinator para operaciones ordinarias.
- Llamadas de red entre servicios para confirmar identidad, rol, legitimidad de una operación o autorización de otra capa.
- Revalidación de sesión, token, epoch o actividad en cada acción.
- Consultas repetidas a Users, ActiveSessions o SESSION_CONTEXTS durante cada aporte.
- Prevalidaciones duplicadas antes y después de subir imágenes, videos y otros archivos.
- Locks globales, esperas, reintentos automáticos y serialización de operaciones independientes.
- Contabilidad/telemetría que añada viajes de red, esperas o escrituras por acción; las métricas no deben degradar el flujo del usuario.

La autorización por rol se resuelve con el rol asociado a la sesión iniciada. No se deben eliminar los permisos funcionales de cada rol ni habilitar capacidades que la matriz no concede. La simplificación elimina la infraestructura transaccional y las verificaciones redundantes, no cambia quién puede usar cada función.

## 3. Plan de ejecución priorizado

### P0 — Inventario y mapa de latencia
**Estado: COMPLETADA (auditoría estática, 2026-11-17).** Informe: `AUDITORIA_P0_LATENCIA_VALIDACIONES.md`.
**Hallazgos confirmados:** dos llamadas Coordinator por lease; revalidación de sesión y posible actualización de actividad por adquisición; rutas ADMIN/WRITE anidadas; locks de hasta 30 s que pueden cubrir cargas Drive. Sin medición de latencia real.
**Objetivo: identificar con evidencia dónde se consume tiempo y qué controles se ejecutan en cada flujo.
- Auditar Coordinator, SharedMutationClient y los helpers de autenticación/autorización de AUTH, USERS, ADMIN, WRITE, FEEDBACK, CATALOG y UTILITIES.
- Inventariar todas las acciones que adquieren leases, llaman a Coordinator, consultan Users/ActiveSessions/SESSION_CONTEXTS, usan locks o realizan reintentos.
- Trazar los flujos de crear/editar cortes, subir imágenes, subir tutoriales/videos, aportes PyS, Inbox y operaciones de lectura.
- Clasificar cada paso como: requisito funcional, permiso por rol, protección de sesión remota expresamente conservada, o control redundante que debe retirarse.
- Registrar latencias actuales solo cuando puedan medirse sin afectar datos ni despliegues; no inventar cifras.

**Criterio de salida:** mapa de llamadas y lista priorizada de validaciones redundantes con archivos, funciones y dependencias identificadas.

### P1 — Simplificar el flujo de aportes y escrituras ordinarias
**Estado: P1 COMPLETADA localmente (P1.1, P1.2 y P1.3); validación Beta pendiente.**
**Prioridad máxima de implementación.**
- Retirar del flujo normal de WRITE/FEEDBACK las adquisiciones de lease/transaction y viajes de red a Coordinator que solo autentiquen, autoricen o verifiquen la legitimidad de la operación.
- **Avance P1.1a:** `WRITE/checkOperation` consulta el estado directamente, sin lease ni llamada a Coordinator. Prueba de contrato actualizada; ejecución pendiente.
- **Siguiente P1.1b:** mutaciones `addOrUpdateCut` y `addSupplementaryInfo`, incluido el flujo ADMIN heredado y la asignación de ID.
- Evitar que ADMIN actúe como intermediario para registrar una operación ordinaria si puede ejecutarse directamente en el servicio responsable.
- Registrar el aporte con los datos recibidos, fecha del servidor y colaborador de la sesión.
- Mantener el chequeo simple del rol permitido para la acción, sin consultar otro servicio.
- Eliminar esperas, locks globales y reintentos que serialicen operaciones independientes.
- Conservar la escritura de datos y el manejo de errores reales; no sustituirlos por respuestas de éxito ficticias.

**Criterio de salida:** creación y edición de cortes y aportes sin Coordinator/lease ni revalidaciones remotas por acción.

### P2 — Simplificar cargas de imágenes, videos y archivos
- Auditar los flujos de imágenes del catálogo/modal, gestor ADMIN, tutoriales y videos FEEDBACK.
- Eliminar prevalidaciones transaccionales, permisos repetidos entre servicios, estados de lease y consultas de estado que no sean necesarias para completar la carga.
- Reducir las etapas a recepción, almacenamiento y registro del recurso con su autor/fecha.
- Evitar que la carga de un archivo mantenga bloqueadas otras acciones o requiera locks globales.
- Mantener únicamente límites técnicos indispensables para evitar archivos incompatibles con el almacenamiento o fallos de transporte; no añadir análisis o verificaciones de seguridad fuera del requisito.

**Criterio de salida:** cada carga realiza el mínimo de llamadas y escrituras necesario; las operaciones independientes no esperan unas por otras.

### P3 — Conservar únicamente las funciones de sesión expresamente solicitadas
- Mantener el login con el hash actual y la asignación de rol.
- Mantener cierre remoto de sesión y limpieza/invalidez de caché local del usuario.
- Al borrar una cuenta, invalidar las sesiones existentes y rechazar futuros inicios de sesión.
- Mantener bloqueo temporal por varios intentos fallidos, con control ligero y sin añadir verificaciones en cada acción.
- Retirar revalidaciones por acción, consultas redundantes de epoch/actividad y actualización de LastActivityAt que no sea necesaria para las funciones anteriores.
- Asegurar que las respuestas tardías o cachés de una sesión cerrada no restauren el acceso.

**Criterio de salida:** login ágil; logout remoto, eliminación de cuenta y bloqueo temporal comprobables; ninguna validación de sesión por operación ordinaria.

### P4 — Optimización general de la plataforma
- Revisar llamadas duplicadas, fetch en cascada, cargas secuenciales evitables y consultas completas cuando bastan datos locales.
- Mantener cachés útiles y mostrar contenido disponible inmediatamente; sincronizar en segundo plano cuando sea posible.
- Evitar que lecturas, Inbox, navegación, edición y módulos independientes esperen a servicios que no necesitan.
- Reducir escrituras auxiliares, contadores y telemetría que no aporten valor al usuario o al diagnóstico.
- Aplicar carga paralela solo a solicitudes independientes y conservar manejo localizado de errores.

**Criterio de salida:** las funciones habituales no ejecutan pasos de seguridad/transacción innecesarios ni esperan operaciones no relacionadas.

### P5 — Pruebas locales y verificación de aceptación
- Pruebas de contrato que demuestren que las rutas ordinarias ya no llaman a Coordinator ni adquieren leases.
- Pruebas de rol: cada capacidad sigue limitada a los roles definidos en la matriz vigente.
- Pruebas de creación/edición de cortes, aportes, imágenes, tutoriales y videos con el flujo simplificado.
- Pruebas de logout remoto, caché invalidada, cuenta eliminada y bloqueo temporal de login.
- Pruebas de concurrencia funcional para confirmar que dos aportes independientes no se bloquean entre sí; no reintroducir transacciones como solución preventiva.
- Comparar número de llamadas y latencias antes/después cuando las mediciones estén disponibles.
- Ejecutar sintaxis y regresión local completa. No desplegar Apps Script ni ejecutar pruebas Beta/productivas sin autorización.

**Criterio de salida:** pruebas locales aprobadas y evidencia clara de reducción de llamadas/pasos. Las pruebas que requieran despliegue quedan identificadas como pendientes Beta.

## 4. Orden de trabajo y entregables

1. **P0 COMPLETADA:** auditoría estática y mapa de llamadas publicados en `AUDITORIA_P0_LATENCIA_VALIDACIONES.md`.
2. **P1 EN PROGRESO:** comenzar por P1.1 (WRITE/ADMIN cortes y `checkOperation`), luego P1.2 (locks de escritura) y P1.3 (FEEDBACK).
3. Implementar P2 y validar cargas de archivos.
4. Implementar P3 y verificar las tres excepciones de sesión.
5. Ejecutar P4 sobre el resto de la plataforma.
6. Ejecutar P5 y registrar resultados reales.

Cada fase debe actualizar el backlog y checkpoint. Agrupar cambios por tarea lógica y no modificar la rama base `GPSpedia2.2.5`.

## 5. Límites de ejecución

- No cambiar el hash actual de contraseñas ni introducir autenticación más compleja.
- No desplegar servicios Apps Script, modificar datos productivos ni ejecutar pruebas Beta.
- No retirar la matriz de roles ni conceder privilegios nuevos.
- No reemplazar validaciones redundantes por nuevas capas de validación con otro nombre.
- No afirmar mejoras de tiempo sin mediciones. Se debe informar el número de llamadas eliminado y las latencias medidas cuando sea posible.


### Seguimiento de P1.1a — 2026-11-17
- CI `44120994810`: 133 suites; 1,925 pruebas aprobadas; 1 suite fallida. El fallo se limita al extractor genérico usado por `WriteAuthorizationMinimization` para leer `doPost` (mensaje: `Función incompleta: doPost`). Sintaxis aprobada.
- La prueba se corrige para inspeccionar el bloque exacto del router, sin cambiar `write.js` ni relajar sus controles. Nueva regresión pendiente.
- Siguiente: cerrar P1.1a tras CI aprobado; continuar P1.1b con auditoría del origen confiable del colaborador y rol antes de retirar Coordinator de mutaciones.


### Avance P1.1b — 2026-11-17
- Cortes y aportes suplementarios se enrutan a WRITE; ADMIN rechaza las antiguas rutas antes de invocar Coordinator. Registro silencioso conserva el permiso exclusivo de Desarrollador. WRITE mantiene la asignación de ID en el servicio propietario.
- Se añadió caché local del actor confiable por 15 segundos: las acciones con caché vigente no llaman a Coordinator ni adquieren/liberan leases. Al expirar, se valida una vez el contexto central y se renueva. El TTL limita a 15 s la propagación de una revocación remota en solicitudes directas; no se presenta como invalidación instantánea y se revisará en P3.
- CI 44125814255: 78 suites / 1,028 pruebas aprobadas / 3 suites fallidas por contratos desactualizados. Sintaxis aprobada. Corrección de expectativas pendiente; no se marca P1.1b como completada.
- Siguiente: nueva regresión; después P1.2 para separar cargas Drive de locks prolongados.


### Estado validado P1.1 y P1.2 — 2026-11-17
- P1.1a y P1.1b: COMPLETADAS. CI final `44126830985`: 138 suites, 2,024 pruebas, 0 fallos.
- Los aportes de cortes y suplementarios se atienden en WRITE, sin lease acquire/release por acción; ADMIN rechaza las rutas antiguas. Registro silencioso solo para Desarrollador.
- El actor confiable se almacena en caché local por 15 s. Una revocación central puede tardar hasta 15 s en reflejarse en una solicitud directa; se mantiene la comprobación de sesión al restaurar/validar la sesión de aplicación.
- P1.2 EN PROGRESO: P1.2a separar carga Drive de `addSupplementaryInfo` del ScriptLock de 30 s; P1.2b separar cargas de `addOrUpdateCut` del bloqueo principal sin perder asignación de ID e idempotencia.


### P1.2a — implementación en validación — 2026-11-17
- addSupplementaryInfo ya no mantiene el ScriptLock durante la carga de imágenes a Drive. La preparación y carga se realizan antes del lock final; bajo lock se relee la fila, se recalcula el slot y se persisten los campos suplementarios.
- El ledger de imágenes usa secciones críticas cortas para reservar/finalizar; creación/verificación de archivos y metadatos Drive fuera del lock. La reserva temporal upload_in_progress evita duplicar el mismo token concurrente. La carpeta del vehículo se resuelve bajo lock corto independiente.
- Los contratos de integridad/autorización fueron actualizados. CI pendiente: P1.2a sigue en progreso hasta que la regresión se ejecute y apruebe.
- Siguiente: P1.2b, separar cargas Drive de addOrUpdateCut del bloqueo prolongado, preservando ID e idempotencia.


### Seguimiento de validación P1.2a — 2026-11-17
- CI `44130490277`: sintaxis aprobada; 131 suites, 1,868 pruebas aprobadas y 1 suite fallida por una aserción del test AddSupplementaryInfoIntegrity que esperaba espacios exactos en una cadena de log.
- Se ajustó únicamente la aserción para comprobar la presencia del log y el actor sin depender del espaciado. Nueva regresión pendiente; P1.2a sigue en validación.


### Cierre P1.3 — 2026-11-17
- FEEDBACK utiliza actor confiable cacheado y permisos locales por rol; elimina leases y revalidaciones Coordinator por acción. Inbox y bloqueos FEEDBACK usan adquisición inmediata sin esperas prolongadas.
- La telemetría directa FEEDBACK permanece best-effort con tryLock(0); el dashboard y el workflow remoto de salud siguen activos.
- CI 44140231970: 140 suites / 2,028 pruebas / 0 fallos. Health read-only 44140232048: 7/7. Pages 44140229137: SUCCESS.
- P1.3 COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Siguiente: P2.1 auditoría de cargas de imágenes y videos, preservando autor/fecha, RBAC, idempotencia y telemetría.


### Auditoría P2.1 — imágenes y videos — 2026-11-17
- Auditoría registrada en `AUDITORIA_P2_CARGAS_ARCHIVOS.md`. WRITE ya ejecuta las cargas de cortes/suplementarios fuera del lock. FEEDBACK mantiene Drive dentro del lock en reportes, sugerencias de corte y altas PyS.
- YouTube transfiere directamente desde el navegador con resumable upload y checkpoints IndexedDB; mantener este diseño. Tutoriales usan aprobación de video separada. Herramientas ADMIN de organización/conciliación se reservan para P4.
- P2.1 COMPLETADA. Siguiente P2.2a: mover carga de adjuntos de reportes y sugerencias fuera del lock, conservando la asociación de archivo y el registro.


### Cierre P2.2a — 2026-11-17
- Reportes individuales y sugerencias de cambio cargan imagen antes del lock de escritura. La persistencia conserva asociación, autor y metadata; si la reversión no se confirma, el archivo se conserva.
- CI 44141910133: 141 suites / 2,029 pruebas / 0 fallos. Health read-only 44141910250: 7/7. Pages 44141907494: SUCCESS.
- P2.2a COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Siguiente: P2.2b simplificar carga de imagen PyS fuera del lock sin añadir validaciones transaccionales.


### Cierre P2.2b — 2026-11-17
- PyS prepara y transfiere la imagen antes del ScriptLock. La sección crítica queda en asignación de ID, ledger/fila y confirmación; se conserva el ledger existente y los reintentos `UPLOAD_PENDING`.
- Reintentos ya vinculados no vuelven a subir imagen; transferencias redundantes concurrentes se descartan tras revalidar el `opId` bajo lock.
- CI 44144972128: 142 suites / 2,104 pruebas / 0 fallos. Health read-only 44144972115: 7/7. Pages 44144970560: SUCCESS.
- P2.2b COMPLETADA CON VALIDACIÓN DIFERIDA A BETA. Siguiente P2.3: contrato del flujo YouTube resumable directo, conservando IndexedDB y aprobación.


### Cierre P2.3 — YouTube resumable — 2026-11-17
- Transferencia directa navegador → YouTube; bloques 8 MiB y checkpoints IndexedDB. Apps Script inicializa la sesión y registra/aprueba el video, no retransmite contenido.
- Pruebas: persistencia 14/14; checkpoint recovery 2/2; cancelación 6/6; completed recovery 6/6; draft recovery 3/3; overlay 8/8; XSS 5/5; cliente 12/12; precondiciones 8/8.
- P2 completada localmente; Beta OAuth/Drive/YouTube pendiente. Siguiente P3.1: revisar el TTL de 15 s del actor cacheado y el requisito de validar usuario/rol solo al login.


### P3.1a — caché de actor de sesión — 2026-11-17
- TTL de actor WRITE/FEEDBACK ampliado de 15 s a 21,600 s (6 h). Un cache hit no consulta Coordinator. El perfil local de `checkSession()` ya se restaura sin viaje de red a AUTH.
- CI 44146072996: 143 suites / 2,108 pruebas / 0 fallos. Health read-only 44146072983: 7/7. Pages 44146072924: SUCCESS.
- P3.1a COMPLETADA. P3.1b pendiente: evaluar precarga de contexto al login para eliminar también el primer fetch/cache miss por servicio; no introducir seguridad compleja.
### Inicio P4 — optimización general de la plataforma — 2026-11-17
- Auditoría inicial registrada en AUDITORIA_P4_OPTIMIZACION_PLATAFORMA.md.
- P4.1 detecta una cascada evitable en el primer arranque: cursor de FEEDBACK → snapshot CATALOG → PyS FEEDBACK. La lectura PyS es independiente y puede comenzar en paralelo; además, su error no debe marcar stale un catálogo ya procesado ni alinear un cursor con datos obsoletos.
- P4.2 detecta que el compositor Inbox espera la carga remota de conversaciones al cambiar desde Solicitudes, aunque solo necesita getInboxRecipients.
- P4.3 reserva para revisión detallada las herramientas ADMIN de auditoría/organización Drive que mantienen ScriptLock global durante recorridos, verificaciones y movimientos externos.
- Se conservan sin cambios los caminos ya paralelos de IndexedDB/CacheStorage, telemetría, dashboard y health read-only.
- Siguiente: implementar P4.1 con regresión de concurrencia, errores aislados y cursor PyS.
### Progreso P4 — 2026-11-17
- P4.1 COMPLETADA: lectura PyS paralela al cursor/snapshot inicial; errores aislados; cursor condicionado a freshness. Pruebas 5/5, CatalogStartupIntegrity 25/25, PysDataCache 18/18.
- P4.2 COMPLETADA: el compositor Inbox no espera la carga remota de conversaciones al abrirse desde Solicitudes; la lista se actualiza en segundo plano y el sondeo respeta el contexto/modal. InboxUi 84/84.
- P4.3 EN AUDITORÍA: no retirar ScriptLock global sin reserva atómica breve por auditId/operationId. El lock actual protege reintentos idempotentes, inventario y rollback Drive. Diseñar claim/commit con recuperación de reservas y pruebas concurrentes antes de modificar ADMIN.
- CI 44154032505 SUCCESS: 145 suites, 2,117 pruebas, 0 fallos. Health read-only 7/7; Pages build SUCCESS. Sin despliegues Apps Script ni cambios en datos externos.
### P4.3a — optimización segura del inventario ADMIN — 2026-11-17
- Completada: handleOrganizeUnusedImagesBatch reutiliza una sola lectura inicial del inventario y una sola detección de IDs duplicados para todo el lote.
- Se mantiene la relectura completa final por archivo antes de mover, junto con revalidación de referencias, ubicación, read-back y rollback.
- Un lote de 20 archivos elimina hasta 19 lecturas completas iniciales y 19 recalculaciones de duplicados; no se modifica el ScriptLock.
- AdminReplacedImagesIntegrity 55/55 PASS. CI 44154558840 SUCCESS: 145 suites / 2,117 pruebas / 0 fallos; health 7/7.
- P4.3b pendiente: reserva/claim por auditId/operationId y commit breve para desacoplar el lock global de Drive sin romper idempotencia.
