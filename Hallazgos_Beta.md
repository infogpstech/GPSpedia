# GPSpedia — Hallazgos de pruebas Beta

Fecha de apertura: 2026-11-22
Repositorio: `infogpstech/GPSpedia`
Rama: `GPSpedia2.2.5_work`
HEAD de referencia: `f8df2c91f8408c311d47ec7c67091cf482cf5cb4`

## Alcance
Registrar únicamente hallazgos observados en pruebas Beta reales. Durante esta etapa no corregir código: documentar evidencia, impacto, severidad, alcance y pasos de reproducción. No incluir secretos, tokens, IDs personales, datos productivos, mensajes, VIN, URLs privadas ni contenido de archivos.

## Estado inicial
- No hay hallazgos Beta registrados todavía.
- Esto no significa que no existan defectos: las pruebas remotas aún no se han ejecutado desde esta sesión.
- Las pruebas locales/CI anteriores no se contabilizan como pruebas Beta.
- Las mediciones sin instrumentación suficiente se registran como **NO MEDIDO**.

## Formato de hallazgo

### BETA-FXXX — Título breve
- **Fecha/hora:**
- **Servicio / módulo / flujo:**
- **Commit probado:**
- **Entorno:** deployment Beta y recursos aislados (solo etiquetas sintéticas; sin URLs/IDs privados).
- **Rol / dispositivo / navegador:**
- **Precondiciones:**
- **Pasos para reproducir:**
- **Resultado esperado:**
- **Resultado observado:**
- **Evidencia anonimizada:**
- **Frecuencia / muestras:**
- **Impacto:**
- **Severidad:** CRÍTICA / ALTA / MEDIA / BAJA / INFORMATIVA.
- **Estado:** NUEVO / CONFIRMADO / NO REPRODUCIBLE / PENDIENTE DE DATOS.
- **Tarea relacionada:**

## Registro
_Aún no hay hallazgos confirmados._


### BETA-F001 — Configuración incompleta de invalidación remota USERS
- **Fecha/hora:** 2026-11-22 (reporte del usuario; hora exacta no registrada).
- **Servicio / módulo / flujo:** AUTH → Coordinator → invalidación remota de caché de actor en USERS; flujo de inicio de sesión.
- **Commit probado:** `f3541aac4e08db8eca6c1d60b8242e475d9d7cd6` (HEAD de trabajo al registrar el hallazgo).
- **Entorno:** Beta declarado por el usuario; aislamiento de los recursos no verificado independientemente.
- **Rol / dispositivo / navegador:** NO MEDIDO.
- **Precondiciones:** El usuario informa que no puede iniciar sesión y recibe el mensaje “la configuración de invalidación remota de USERS está incompleta”.
- **Pasos para reproducir:** Intentar iniciar sesión en Beta. No se dispone de una sesión remota para reproducirlo independientemente.
- **Resultado esperado:** AUTH debe completar la invalidación remota requerida y permitir continuar con la creación/sincronización de sesión.
- **Resultado observado:** El usuario reporta que el login es rechazado con el mensaje indicado.
- **Evidencia anonimizada:** En `JS/Services/Coordinator.js`, `invalidateSessionActorCaches_` exige que `GPSpedia_SERVICE_URL_USERS` sea una URL Apps Script terminada en `/exec` y que `GPSpedia_COORDINATOR_SECRET_USERS` tenga al menos 32 caracteres. La función valida también WRITE, FEEDBACK y ADMIN antes de contactar cualquier destino. En `JS/Services/Auth.js`, la creación de sesión puede invocar invalidación remota al retirar sesiones expiradas o excedentes.
- **Frecuencia / muestras:** Un reporte del usuario; reproducción independiente NO MEDIDA.
- **Impacto:** Bloqueo del inicio de sesión cuando el flujo necesita revocar una sesión anterior/expirada y la configuración de Coordinator no supera la validación.
- **Severidad:** ALTA.
- **Estado:** NUEVO — causa probable localizada en la configuración de ScriptProperties de Coordinator; valores y coincidencia de secretos aún no verificados.
- **Tarea relacionada:** BETA-01 — AUTH / USERS y aislamiento; revisar las propiedades Beta de Coordinator para USERS, WRITE, FEEDBACK y ADMIN sin revelar sus valores.

### BETA-F002 — Configuración de servicios de Coordinator excede el límite de ScriptProperties
- **Fecha/hora:** 2026-11-22 (reporte del usuario; hora exacta no registrada).
- **Servicio / módulo / flujo:** Coordinator → invalidación y preparación remota de cachés de sesión.
- **Commit probado:** Rama `GPSpedia2.2.5_work`; SHA exacto del despliegue Beta NO VERIFICADO desde esta sesión.
- **Entorno:** Coordinator Beta declarado por el usuario.
- **Precondiciones:** El proyecto Coordinator ya alcanzó el máximo de 50 propiedades de ScriptProperties. El usuario confirma que no existe `GPSpedia_SERVICE_URL_USERS` y que no puede agregarla por el límite.
- **Pasos para reproducir:** Intentar agregar la propiedad faltante en las propiedades del proyecto Coordinator cuando ya contiene 50 propiedades.
- **Resultado esperado:** Coordinator debe poder obtener las URLs y secretos requeridos para comunicarse con USERS, WRITE, FEEDBACK y ADMIN desde la fuente de configuración prevista para el entorno.
- **Resultado observado:** No es posible agregar la propiedad requerida; el login reporta configuración de invalidación remota USERS incompleta.
- **Evidencia anonimizada:** `JS/Services/Coordinator.js` crea el servicio con `PropertiesService.getScriptProperties()`. Tanto `invalidateSessionActorCaches_` como `primeSessionActorCaches_` leen individualmente `GPSpedia_SERVICE_URL_<SERVICIO>` y `GPSpedia_COORDINATOR_SECRET_<SERVICIO>` para USERS, WRITE, FEEDBACK y ADMIN. La primera función valida los cuatro pares antes de enviar solicitudes. La lectura actual no consulta directamente la hoja `api_config`. El comentario de cabecera del archivo indica que Coordinator no accede a Spreadsheet.
- **Frecuencia / muestras:** Una confirmación del usuario sobre el límite y la propiedad ausente; reproducción independiente NO MEDIDA.
- **Impacto:** Coordinator no puede completar los flujos de invalidación/preparación de caché de sesión cuando faltan propiedades y no hay capacidad para agregarlas; puede bloquear el login y otros flujos de sesión.
- **Severidad:** ALTA.
- **Estado:** NUEVO — limitación de arquitectura/configuración confirmada por inspección de código y reporte del usuario. No se modificó código.
- **Tarea relacionada:** BETA-01 — AUTH / USERS y aislamiento. Para una etapa posterior a Beta, evaluar una única fuente central de configuración (por ejemplo, `api_config`) y eliminar la dependencia de una propiedad individual por URL/secreto. Requiere revisar acceso, permisos, caché, disponibilidad y manejo seguro de secretos antes de diseñar el cambio.


## Hallazgo — fallos FEEDBACK de dashboard/aportes/Inbox y feed CATALOG — 2026-11-24

- **Evidencia reportada:** el cliente muestra `No se inyectó el proveedor de la Spreadsheet de identidad` al abrir Inbox; dashboard de actividad no carga indicadores y el panel de aportes falla. CATALOG registra `Falta la hoja requerida del feed CATALOG: CatalogChangeState` al establecer el cursor inicial.
- **Causa FEEDBACK confirmada por inspección:** `JS/Services/feedback.js` llamaba a `getCachedSharedSessionActor_()` sin el argumento obligatorio `loadSpreadsheet`, aunque el helper `SharedSessionActor.js` ya no permite fallback global. Las acciones protegidas de dashboard, aportes e Inbox comparten este dispatcher.
- **Causa CATALOG confirmada por inspección:** las hojas `CatalogChangeState` y `CatalogChangeEvents` son parte del esquema MIG-026, pero no existen en la Spreadsheet consultada. El runtime falla cerrado y no las crea automáticamente por diseño.
- **Corrección preparada en rama:** inyección de `loadSpreadsheet: getSpreadsheet` en FEEDBACK; inicializador manual e idempotente `initializeCatalogChangeFeedSheets()` para CATALOG, con validación previa y sin sobrescribir datos.
- **Estado:** pendiente de CI/publicación. No se invocaron deployments ni se consultó/modificó la Spreadsheet remota desde esta tarea.
- **Validación Beta requerida:** en Spreadsheet Beta aislada, ejecutar el inicializador manual CATALOG, comprobar encabezados/read-back y consulta GET del feed; desplegar FEEDBACK con proveedor explícito y probar dashboard, aportes e Inbox con usuario sintético. No ejecutar contra producción sin autorización.
