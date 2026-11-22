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

**Estado inicial:** auditoría estática parcial; pruebas de integración remota y de aislamiento entre cuentas pendientes.

### Evidencia observada

- `JS/Services/SharedMutationClient.js`: `getCachedSharedSessionActor_()` consulta CacheService local. En cache hit devuelve el actor y renueva TTL local (máximo 21,600 s); no llama a Coordinator ni lee Users/ActiveSessions.
- El mismo archivo implementa precarga del actor por token y acciones internas de invalidación de caché. `Auth.js` sincroniza el contexto durante login y registra el resultado de precarga; esto evita depender de una validación remota en cada clic.
- Las rutas de revocación usan invalidación dirigida antes de revocar el contexto central. `Services/DEPLOYMENT_GUIDE.md` exige URL ADMIN en Coordinator para la invalidación de caché.
- `JS/Services/SessionActivityLeaseMinimization.mjs` protege que WRITE/FEEDBACK no adquieran leases ordinarias, que USERS reutilice actor cacheado para getUsers/updateProfile, que AUTH reserve la lease solo para eliminación y que ADMIN no adquiera leases.
- `JS/Services/write.js` obtiene el nombre mediante `getAuthenticatedCollaborator()` desde `__sharedSessionActor.fullName/role`, no desde `payload.colaborador`. `users.js` exige actor confiable y compara identidad solicitada con actor para perfil.
- El panel de actividad tiene pruebas focalizadas `ActivityDashboardContributions.mjs` y `ActivityDashboardInsights.mjs`, pero todavía no se ha demostrado aquí el aislamiento end-to-end entre cuentas ni que todos los tipos de aporte lleguen al dashboard.

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
