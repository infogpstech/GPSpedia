# MIG-007 — Esquema central de configuración de GPSpedia

**Estado:** DISEÑO COMPLETADO — pendiente de implementación en MIG-008  
**Repositorio:** infogpstech/GPSpedia  
**Rama de diseño:** GPSpedia2.2.5_work  
**Fecha:** 2026-11-23  
**Dependencias:** MIG-003 (inventario de configuración), MIG-004 (grafo de llamadas), MIG-006 (acceso inicial a Spreadsheet, con prueba Web App real diferida).  
**Normativa:** NORMAS_DESAROLLO.md; en particular §§4–10, 12, 15–17.

## 1. Objetivo y límites

Definir un esquema central, versionado y trazable para registrar endpoints de entrada, parámetros funcionales y localizadores de recursos de GPSpedia. El diseño debe permitir que el frontend resuelva acción → servicio → endpoint sin mantener una segunda lista de URLs, y que los servicios obtengan únicamente la configuración de backend que necesitan.

Esta tarea es de diseño. No crea hojas, no migra valores, no cambia endpoints, no lee ni modifica PropertiesService y no altera deployments, Spreadsheet, Drive, OAuth ni datos productivos.

El esquema tampoco resuelve el mecanismo de bootstrap. MIG-006 dejó preparada la prueba, pero todavía no demuestra que SpreadsheetApp.getActiveSpreadsheet() esté disponible en una Web App real. MIG-008 no puede implementar el lector hasta que el mecanismo de acceso a la fuente central esté validado; no se permite introducir un ID, URL o secreto bootstrap local para sortearlo.

## 2. Principios de diseño

1. **Una fuente de verdad:** el registro central contiene la configuración operativa aprobada. No se mantienen listas paralelas en frontend, ADMIN, Coordinator ni propiedades Apps Script.
2. **Separación entre configuración y estado:** parámetros no son ledgers, sesiones, auditorías, leases ni datos transaccionales. Cada dato conserva su hoja/ledger funcional.
3. **Sin secretos de interconexión:** no se almacenan API keys, contraseñas, tokens manuales, secretos compartidos ni credenciales de servicio. Las llamadas técnicas directas permitidas no requieren secretos manuales y el receptor valida su propia sesión/capacidad/RBAC.
4. **OAuth permanece administrado:** tokens de ejecución de Google se obtienen en servidor cuando corresponde; nunca se guardan en este esquema ni se entregan al navegador.
5. **El frontend coordina el negocio:** el registro de servicios resuelve destinos, pero no codifica secuencias, autorizaciones ni privilegios.
6. **Fallo cerrado:** una configuración ausente, duplicada, malformada, incompatible o vencida nunca debe enviar una acción a un servicio alternativo por aproximación.
7. **Cambios auditables:** toda modificación efectiva genera una revisión nueva y una entrada de historial; no se sobrescriben revisiones anteriores para ocultar cambios.
8. **Compatibilidad:** los nombres de acciones, contratos de payload, encabezados, esquemas de datos, reglas criptográficas y matriz RBAC son contratos de código/datos, no parámetros editables.

## 3. Modelo lógico y hojas

El esquema lógico se compone de seis tablas. Los nombres son definitivos para el diseño; su creación física y la validación de encabezados quedan para MIG-008 y la migración correspondiente. Las hojas operativas que ya existen o que se creen para ledgers no se convierten en tablas de configuración.

### 3.1 Hoja Servicios

Registro público de los siete servicios de entrada actualmente inventariados: AUTH, CATALOG, WRITE, USERS, FEEDBACK, UTILITIES y ADMIN. Una fila por clave estable.

| Campo | Tipo | Requerido | Regla |
|---|---|---:|---|
| service_key | enum/string | Sí | Clave única y canónica; no depende del nombre visible. |
| endpoint_url | https_url | Sí | URL de entrada HTTPS completa; no incluir tokens, query secrets ni credenciales. |
| enabled | boolean | Sí | Solo true/false; false deshabilita el enrutamiento. |
| contract_version | string | Sí | Versión de contrato que el cliente sabe interpretar. |
| min_client_version | string | No | Límite de compatibilidad; si no se satisface, no enrutar. |
| health_action | string | No | Acción GET/read-only de salud ya existente; nunca inventar una acción de escritura. |
| updated_at | timestamp | Sí | Fecha UTC de la revisión que publicó el registro. |
| updated_by | actor_id | Sí | Identidad confiable del operador que aprobó el cambio. |
| change_reason | string | Sí | Motivo breve y trazable. |

Restricciones:
- La clave service_key es única, obligatoria y limitada al conjunto de servicios aprobados.
- endpoint_url debe analizarse como URL HTTPS válida, sin usuario/contraseña, fragmento ni parámetros sensibles. La validación también debe comprobar el host/patrón de deployment esperado; no basta con que empiece por https.
- Un endpoint vacío, duplicado, deshabilitado, incompatible o no validado no se sustituye por la URL de otro servicio.
- La publicación del registro debe ser coherente: no exponer una revisión parcial con servicios mezclados de dos cambios.
- La URL es información pública de enrutamiento, no un secreto. No incluir URLs de Drive, YouTube ni APIs oficiales de Google en esta tabla: son integraciones externas/protocolos, no servicios GPSpedia.

### 3.2 Hoja ConfiguracionParametros

Parámetros funcionales y operativos que tengan un consumidor identificado y que deban poder ajustarse sin editar código. Una fila por clave estable.

| Campo | Tipo | Requerido | Regla |
|---|---|---:|---|
| config_key | string | Sí | Clave única namespaced, estable y en minúsculas; ejemplo de forma: catalog.log_invalid_image_ids. |
| value_json | JSON scalar/object/array | Sí | Valor serializado según value_type; no admite secretos ni tokens. |
| value_type | enum | Sí | boolean, integer, number, string, enum, json, duration_ms, bytes o url cuando proceda. |
| scope | enum/string | Sí | global, service:<key> o feature:<key>; no es un rol de seguridad. |
| visibility | enum | Sí | public, backend o admin; describe la proyección permitida, no sustituye ACL de Google. |
| enabled | boolean | Sí | Permite desactivar un parámetro opcional sin borrar su definición. |
| default_json | JSON scalar/object/array | Sí | Valor seguro definido y revisado en código/documentación. |
| validation_rule | string | Sí | Regla declarativa: enum permitido, mínimo/máximo, patrón, estructura o referencia de esquema. |
| schema_version | integer | Sí | Versión del esquema que interpreta el valor. |
| updated_at | timestamp | Sí | Fecha UTC de modificación. |
| updated_by | actor_id | Sí | Actor confiable que autorizó el cambio. |
| change_reason | string | Sí | Motivo de la modificación. |

Reglas:
- config_key es única y no cambia de nombre para representar una modificación semántica; un cambio incompatible crea una clave nueva o incrementa explícitamente el schema_version con migración.
- value_json debe parsearse y validarse estrictamente según value_type. No se aceptan conversiones implícitas como "false" → true, cadenas numéricas ambiguas, NaN, Infinity ni valores fuera de rango.
- default_json se mantiene en código como contrato de recuperación y se documenta junto con el esquema. No es un mecanismo para duplicar la configuración operativa vigente.
- Los límites de seguridad se mantienen en backend. La hoja puede reducir un límite operativo, pero no ampliar un máximo de seguridad por encima del techo fijado en código sin una tarea y pruebas expresas.
- scope agrupa el parámetro; no concede permisos. Ningún valor enviado por el frontend cambia rol, capacidad o autorización.
- visibility=public solo permite incluir valores aprobados en la proyección pública; backend solo servidor; admin requiere autorización administrativa explícita. El lector debe filtrar en servidor antes de construir la respuesta.
- No convertir en parámetros editables algoritmos/hash, iteraciones PBKDF2, prefijos criptográficos, acciones, contratos, encabezados, nombres de hoja, índices de columna, MIME/protocolos ni políticas RBAC.

### 3.3 Hoja ConfiguracionRecursos

Localizadores no secretos de recursos externos administrados por GPSpedia, por ejemplo IDs de carpetas Drive. Una fila por clave estable.

| Campo | Tipo | Requerido | Regla |
|---|---|---:|---|
| resource_key | string | Sí | Clave única, namespaced y estable. |
| resource_type | enum | Sí | drive_folder, drive_file u otro tipo explícitamente admitido. |
| resource_id | string | Sí | ID opaco del recurso; no es credencial. |
| scope | enum/string | Sí | Servicio/función propietaria. |
| visibility | enum | Sí | backend o admin; no público por defecto. |
| enabled | boolean | Sí | Recurso habilitado. |
| expected_parent_id | string | No | Relación esperada para validar jerarquía. |
| expected_name | string | No | Nombre esperado cuando sirva para verificación. |
| updated_at / updated_by / change_reason | timestamp / actor_id / string | Sí | Trazabilidad de cambio. |

Un ID no otorga acceso. Antes de usar un recurso, el servicio debe validar existencia, tipo, padre, propietario/permisos y coherencia con la operación. Los IDs de Spreadsheet de bootstrap no se guardan aquí: hacerlo produciría una referencia circular.

### 3.4 Hoja ConfiguracionControl

Una única fila activa para el estado de publicación global.

| Campo | Tipo | Regla |
|---|---|---|
| control_key | string | Valor fijo CONFIGURATION_ACTIVE. |
| schema_version | integer | Versión del contrato de tablas. |
| active_revision | integer | Revisión completa actualmente publicada; monotónica. |
| publication_state | enum | READY, PUBLISHING o INVALID. |
| published_at | timestamp | Momento de publicación UTC. |
| updated_by | actor_id | Actor confiable. |
| change_reason | string | Motivo de la última publicación. |

La lectura debe observar un único active_revision y cargar únicamente filas asociadas a esa revisión. La publicación se prepara primero en una revisión nueva, se valida completa y solo entonces se conmuta active_revision. Una interrupción antes de la conmutación deja activa la revisión anterior; si no hay revisión íntegra, el lector falla cerrado. No se publica mezclando filas nuevas y antiguas.

### 3.5 Hoja ConfiguracionHistorial

Historial append-only de cambios de configuración, no registro de auditoría general de la aplicación.

Campos: history_id único; config_revision; entity_type (service, parameter o resource); entity_key; operation (create, update, disable, rollback); previous_value_json; new_value_json; actor_id; changed_at UTC; change_reason; rollback_of_revision; schema_version.

- No se registran secretos porque el esquema los excluye.
- Las URLs de endpoints y los IDs de recursos pueden aparecer en el historial; su acceso se limita como mínimo al de la configuración que documentan.
- Las entradas no se editan ni borran para corregir un error: se añade una nueva revisión.
- La retención debe preservar trazabilidad de cambios y no puede eliminar la única copia de una revisión todavía referenciada por clientes o rollback.

### 3.6 Hoja ConfiguracionEsquema

Registro de claves admitidas y sus validadores, no catálogo editable de permisos. Campos: config_key, entity_type, value_type, scope_allowed, visibility_allowed, required, default_json, validation_rule, introduced_schema_version, deprecated_schema_version, replacement_key, owner_service y description.

La definición normativa del esquema se versiona en el repositorio. La hoja permite verificar datos y detectar claves desconocidas; no puede autorizar una nueva clave ni relajar un validador que el código no reconozca. Una fila desconocida o una versión superior a la soportada invalida la carga, no se ignora silenciosamente.

## 4. Versionado, publicación e integridad

Se distinguen tres versiones:

- schema_version: forma y significado de las tablas/campos.
- config_revision: revisión monotónica del conjunto de valores publicado.
- contract_version por servicio: contrato de acciones/payload/respuesta del endpoint.

No son intercambiables. Una actualización de URL no implica cambiar el contrato; un cambio de estructura sí requiere schema_version; un cambio de comportamiento/valores crea config_revision.

Flujo de publicación:
1. Un operador autorizado prepara un conjunto completo de filas para la siguiente revisión.
2. Se valida unicidad de claves, campos requeridos, tipos, rangos, enums, URLs, recursos, visibilidad y compatibilidad de todos los servicios.
3. Se escriben filas de historial y contenido de la revisión candidata sin alterar la revisión activa.
4. Se vuelve a leer la revisión candidata y se verifica que el conjunto esté completo y sus hashes/conteos coincidan con el manifiesto de publicación.
5. Se conmuta ConfiguracionControl.active_revision en una operación final controlada.
6. Se verifica read-back de control y de una muestra representativa; el cambio queda publicado solo si ambos coinciden.

La escritura de la fila activa requiere exclusión/atomicidad adecuada. No se debe asumir que LockService de proyectos distintos constituye un lock distribuido. MIG-008 y las tareas de escritura deberán definir el mecanismo real compatible con Spreadsheet y concurrencia; si no se puede garantizar publicación atómica, no se activa la revisión candidata.

## 5. Separación pública, restringida y límites reales de Google Sheets

Las categorías de visibilidad son una política de exposición de la aplicación:

- public: endpoints y parámetros no sensibles que el frontend necesita para operar.
- backend: parámetros operativos que solo deben recibir servicios de confianza.
- admin: parámetros de diagnóstico/operación visibles únicamente a un actor con permiso administrativo.

**Importante:** Google Sheets no ofrece ACL de lectura por pestaña. Ocultar una hoja o proteger un rango no impide que un editor del archivo lea sus celdas; la protección de rangos controla principalmente escritura. Por tanto:
- La Spreadsheet central debe mantenerse privada y compartida solo con las identidades que realmente necesiten acceso.
- El frontend no recibe acceso directo de edición ni credenciales de Google para leer la hoja.
- La proyección pública se filtra en un lector servidor y contiene exclusivamente filas publicadas con visibility=public.
- Las filas backend/admin no se incluyen en la respuesta pública, en logs del navegador ni en cachés compartidas con usuarios.
- Los endpoints administrativos vuelven a validar sesión, actor y RBAC; conocer una URL o una clave config_key no concede acceso.
- Si en el futuro se necesita un ACL de lectura de Google distinto para un subconjunto de datos, se requerirá un archivo de configuración separado con permisos de Drive propios y una tarea de arquitectura explícita. No se simula aislamiento de lectura usando pestañas ocultas.
- El esquema no contiene secretos. El secreto HMAC de recuperación de contraseña requiere diseño de almacenamiento protegido separado y no se migra a ConfiguracionParametros ni a una hoja de acceso general.

## 6. Catálogo de configuración y trazabilidad del inventario MIG-003

### 6.1 Endpoints y localizadores

| Elemento inventariado | Destino/decisión | Tratamiento |
|---|---|---|
| Siete endpoints de AUTH, CATALOG, WRITE, USERS, FEEDBACK, UTILITIES y ADMIN en api-config.js | Servicios | Una fila por service_key en Servicios. Migrar únicamente cuando MIG-008/MIG-009 puedan leer el registro sin bootstrap circular. |
| Cinco constantes URL de ADMIN hacia otros servicios | No se trasladan | Retirar con MIG-011 después de reemplazar los callsites por orquestación frontend y probar paridad. |
| SPREADSHEET_ID repetido en siete servicios | Fuera de este esquema | No guardar en ConfiguracionRecursos ni en la misma Spreadsheet; depende de solución de bootstrap MIG-006. |
| DRIVE_FOLDER_ID / carpeta raíz Cortes | ConfiguracionRecursos | Clave resource_key estable; validar padre, tipo, nombre y permisos antes de operar. |

### 6.2 Las 26 familias de ScriptProperties

| # MIG-003 | Familia/uso | Destino aprobado por diseño |
|---:|---|---|
| 1–5 | URL/secretos de Coordinator, secretos por servicio, URLs backend y secreto de tráfico CATALOG | Retirar junto con MIG-011/MIG-013/MIG-024/MIG-025; ningún valor se copia a hojas. |
| 6 | Secreto HMAC de recuperación AUTH | Fuera del esquema; diseño de almacenamiento protegido pendiente. |
| 7 | login_request_<requestId> | Estado operativo en LoginRequests, no configuración. Preservar idempotencia/recuperación. |
| 8 | role_revocation_pending_<userId> | Estado canónico en Users.SessionToken según inventario; retirar duplicado solo tras prueba. |
| 9 | GPSpedia_CORTES_LAST_ID | Reconciliar con CortesIdReservations; no crear contador duplicado. |
| 10 | GPSpedia_RICH_TEXT_MODE_V1 | ConfiguracionParametros, clave rich_text_mode, enum estricto. |
| 11 | LOGOS_MARCA_ID_COUNTER | Ledger LogosMarcaIdReservations o asignador atómico; no parámetro. |
| 12 | Auditoría de operaciones ADMIN | AdminOperationAudit; no configuración. |
| 13 | Operaciones Safe Apply de Cortes | CortesOrganizerOperations; no configuración. |
| 14 | ID carpeta Imagenes_Sin_Uso | ConfiguracionRecursos; verificar jerarquía Drive. |
| 15–16 | Estado y puntero de auditoría Drive | DriveAuditRuns; no configuración. |
| 17–20 | Leases, contexto, bloques e índice de sesión Coordinator | Retirar; no replicar en hojas de configuración. La autoridad de sesión permanece en AUTH/ActiveSessions según tareas posteriores. |
| 21–25 | Revisión, versiones de origen y eventos del feed incremental | CatalogChangeState y CatalogChangeEvents; estado funcional, no configuración. |
| 26 | Tráfico por hora | ServiceTraffic; telemetría agregada, no configuración. |

La tabla conserva la correspondencia completa con el inventario de 26 familias. No afirma que las propiedades reales de deployments hayan sido leídas ni que se hayan migrado valores.

### 6.3 Parámetros candidatos del código

Los parámetros propuestos en INVENTARIO_CONFIGURACION_BACKEND.md §5 se incorporarán solo después de confirmar consumidor vigente y paridad. Candidatos: catalog.log_invalid_image_ids; rich_text_mode; terms.current_version; límites de cargas/textos; políticas de retención y capacidad de auditorías; tamaño de lote de restauración Drive. Las políticas exclusivas de Coordinator/SharedMutation se retiran con esos componentes y no se trasladan.

No se convierten en valores editables los algoritmos/parámetros criptográficos, matriz RBAC, nombres de acciones, contratos, encabezados, índices de columnas, MIME/protocolos ni límites máximos de seguridad. Los valores que deban coincidir entre frontend y backend tienen una única definición validada y se distribuyen como parte de la misma revisión.

## 7. Validación, defaults y recuperación

### 7.1 Validación

El lector debe validar la revisión completa antes de exponerla:
- schema_version soportada;
- active_revision íntegra y en estado READY;
- claves únicas y pertenecientes al catálogo de esquema;
- tipos JSON estrictos, required/default, enums, rangos, patrones y scopes;
- endpoint HTTPS y host/patrón permitido;
- service_key conocido, enabled booleano y contract_version compatible;
- recurso externo existente/esperado cuando la operación vaya a utilizarlo;
- visibility reconocida y proyección autorizada;
- no presencia de campos/valores prohibidos como token OAuth, password, API key o secreto manual.

Un dato inválido no se sustituye silenciosamente por un valor de otro servicio. Los parámetros opcionales pueden usar su default documentado; un endpoint inválido o un parámetro requerido no tiene fallback de enrutamiento.

### 7.2 Defaults

- Defaults funcionales viven versionados en código y documentados en ConfiguracionEsquema.
- Un parámetro opcional ausente puede usar su default solo si el consumidor declara expresamente que el default es compatible.
- Parámetros de seguridad, sesión, RBAC, recuperación y límites máximos no pueden relajarse por ausencia de fila.
- Endpoint ausente, deshabilitado, duplicado o inválido: servicio no disponible para esa acción; no usar otro endpoint ni una URL codificada localmente como fallback.
- Recurso ausente/inválido: la operación dependiente se rechaza antes de escribir o alterar Drive.

### 7.3 Historial y rollback

Rollback no borra ni reescribe el historial. Se publica una revisión nueva que restaura valores de una revisión previa, conserva actor/motivo y referencia rollback_of_revision. Antes de activar:
- validar la revisión anterior contra el schema actual o aplicar migración explícita;
- comprobar que endpoints siguen vigentes y que el contrato del cliente los soporta;
- comprobar recursos y permisos actuales;
- revisar efectos que no se revierten automáticamente (sesiones, operaciones ya ejecutadas, IDs consumidos, cargas externas);
- requerir aprobación administrativa y read-back de la revisión activada.

No existe rollback automático de operaciones de negocio por restaurar una configuración. El rollback de datos/Drive sigue los procedimientos propios de cada operación.

## 8. Caché y comportamiento ante indisponibilidad

Política inicial propuesta para validar en MIG-008, no una medición ni un valor productivo ya aplicado:

| Clase | Caché propuesta | Al vencer / no poder refrescar |
|---|---|---|
| Registro público Servicios | 5 min por revisión; cachear como snapshot completo, no por fila | Si no puede revalidarse y expira, bloquear nuevas acciones dependientes del enrutamiento. Nunca usar endpoint alternativo ni fallback local antiguo. |
| Parámetros public no críticos | 5 min; permitir stale-if-error máximo 15 min si la última revisión fue íntegra | Después del máximo stale, usar default explícito o deshabilitar la función opcional. |
| Parámetros backend/admin | Caché aislada por servicio/actor cuando corresponda; TTL inicial 5 min | No compartir con navegador ni con otros actores; valores de autorización/sesión no se cachean aquí. |
| ConfiguracionRecursos | Caché por clave/revisión; TTL inicial 5 min | Antes de escritura, validar el recurso y su permiso; la caché no sustituye la comprobación externa. |
| ConfiguracionControl / esquema | Cargar junto con snapshot; comparar schema_version y active_revision | Incompatibilidad o publicación incompleta invalida el snapshot. |

Reglas transversales:
- Una caché contiene revisión y fecha de validación; no mezcla revisiones.
- El frontend puede almacenar la proyección pública en memoria/IndexedDB según el ciclo de vida de la PWA, pero nunca guarda datos backend/admin ni tokens OAuth.
- La caché no concede permisos y no prolonga sesiones.
- No se realiza una lectura de Spreadsheet en cada acción ordinaria; se refresca por caducidad/invalidez y en una operación explícita de actualización.
- Una configuración nueva solo sustituye la anterior tras validar la revisión completa. Si la descarga falla, se conserva la última copia íntegra únicamente dentro de las ventanas permitidas por clase.
- El servicio que no tenga configuración válida falla de forma localizada; los módulos independientes pueden seguir operando si su configuración sigue siendo válida.
- Los TTL anteriores son valores iniciales de diseño sujetos a pruebas de latencia, concurrencia y consistencia; no autorizan a ampliar expiración de sesión ni caché de actor.

## 9. Dependencias y decisiones diferidas

| Tema | Decisión en MIG-007 | Tarea responsable |
|---|---|---|
| Bootstrap / acceso a Spreadsheet | No resuelto por el esquema; no añadir ID/URL local. Debe pasar prueba Web App real o alternativa arquitectónica documentada. | MIG-006 Beta / MIG-008 |
| Lector de configuración y proyección pública | No implementado. Debe filtrar por visibility y validar la revisión completa. | MIG-008 |
| Router frontend que consume Servicios | No implementado; mantener api-config.js vigente hasta equivalencia. | MIG-009 |
| Retirada de URL/secretos ADMIN | No trasladar; sustituir primero los callsites. | MIG-011 |
| Sesiones y secreto HMAC | No incluir en configuración; preservar autoridad de AUTH y diseñar almacenamiento protegido por separado. | MIG-013 / tarea específica de seguridad |
| Ledgers y estado operativo | Mantener destinos dedicados e idempotencia; no migrarlos a parámetros. | MIG-012 y tareas funcionales correspondientes |
| Escritura atómica / concurrencia | Requiere mecanismo probado; no asumir locks distribuidos entre proyectos. | MIG-008 y tareas de implementación |

## 10. Criterios de aceptación MIG-007

- [x] Definidas las tablas Servicios, ConfiguracionParametros, ConfiguracionRecursos, ConfiguracionControl, ConfiguracionHistorial y ConfiguracionEsquema.
- [x] Definidas claves estables, tipos, valores, descripción/propietario, estado, defaults, validación y versiones.
- [x] Incluidos endpoints, parámetros de negocio y recursos hoy duplicados, con su destino trazable.
- [x] Separadas proyecciones public/backend/admin y documentado que Sheets no ofrece ACL de lectura por pestaña.
- [x] Excluidos OAuth tokens, contraseñas en texto plano, secretos de interconexión y secreto HMAC del esquema ordinario.
- [x] Definidos publicación por revisión, historial append-only, rollback como nueva revisión y comportamiento fail-closed.
- [x] Definida política inicial de caché por clase y recuperación ante indisponibilidad.
- [x] Mapeadas las 26 familias de propiedades y los siete endpoints de MIG-003.
- [x] Documentadas dependencias no resueltas de MIG-006 y tareas siguientes; no se adelantó la implementación.
- [x] Añadida comprobación automatizada de integridad del documento de diseño.

**Resultado:** MIG-007 COMPLETADA. El diseño está especificado y trazable; no se ha creado ninguna hoja ni migrado configuración real. La implementación y prueba del lector/caché pertenecen a MIG-008 y dependen de resolver el acceso inicial a Spreadsheet sin bootstrap local.
