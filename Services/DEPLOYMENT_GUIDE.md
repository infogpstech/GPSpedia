# Guía operativa de despliegue — GPSpedia

**Vigencia:** MIG-029  
**Rama de referencia:** `GPSpedia2.2.5_work`  
**Fuente normativa:** `NORMAS_DESAROLLO.md`, especialmente §§4–10 y 18.  
**Alcance:** publicación de los seis proyectos Apps Script activos. No autoriza cambios en producción ni sustituye las pruebas Beta.

## 1. Arquitectura y proyectos activos

Cada servicio es un proyecto Apps Script independiente y conserva su propio `doGet`, `doPost` y deployment. El frontend resuelve acción → servicio → endpoint usando la configuración central. No se configuran URLs de otros servicios dentro de Apps Script.

| Servicio | Archivos fuente que deben estar en su proyecto |
|---|---|
| AUTH | `JS/Services/Auth.js`, `JS/Services/SharedSessionActor.js`, `JS/Services/CentralConfigurationReader.js` |
| CATALOG | `JS/Services/catalog.js` |
| WRITE | `JS/Services/write.js`, `JS/Services/SharedSessionActor.js`, `JS/Services/CentralConfigurationReader.js` |
| FEEDBACK | `JS/Services/feedback.js`, `JS/Services/InboxConversations.js`, `JS/Services/SharedSessionActor.js`, `JS/Services/CentralConfigurationReader.js` |
| UTILITIES | `JS/Services/Utilities.js`, `JS/Services/SharedSessionActor.js` |
| ADMIN | `JS/Services/admin.js`, `JS/Services/SharedSessionActor.js`, `JS/Services/CentralConfigurationReader.js` |

CATALOG conserva su verificación local de actor y no incluye `SharedSessionActor.js`. FEEDBACK necesita `InboxConversations.js`. Los helpers compartidos se copian únicamente a los proyectos indicados; no se combinan servicios distintos en un mismo proyecto.

**No son deployments activos:** USERS y COORDINATOR. No crear, actualizar ni conectar proyectos para ellos como parte de esta guía. Las instrucciones archivadas en `Olds/Documentacion_Legacy/Services/` son evidencia histórica y no deben ejecutarse.

## 2. Antes de publicar

1. Confirmar que el repositorio es `infogpstech/GPSpedia`, la rama es `GPSpedia2.2.5_work` y el árbol de trabajo está limpio.
2. Anotar el SHA exacto que se pretende publicar. No copiar archivos desde otra rama, una descarga antigua o un deployment como fuente de verdad.
3. Revisar el diff y ejecutar el workflow de regresión de servicios. La sintaxis y las pruebas locales deben aprobar antes de abrir Apps Script.
4. Identificar el único servicio afectado y sus archivos de la tabla anterior. No actualizar los otros cinco por rutina.
5. Confirmar que se trabaja en el entorno autorizado (Beta aislada o producción expresamente autorizada). Para Beta, seguir primero la sincronización segura y las precondiciones de `Tareas_Beta.md`; usar recursos desechables y no reutilizar Spreadsheet, Drive, cuentas ni endpoints productivos.
6. Abrir el proyecto Apps Script existente del servicio. Confirmar identidad de ejecución, permisos sobre los recursos del entorno y configuración de acceso ya aprobada. No ampliar permisos ni cambiar el propietario para resolver un error de despliegue.
7. Comparar el manifiesto y los permisos OAuth existentes con las APIs usadas. El repositorio no versiona manifiestos Apps Script: no inventar un `appsscript.json` ni añadir scopes genéricos.

No se requieren propiedades de proyecto para registrar URLs de servicios ni secretos compartidos/manuales para conectar proyectos. No añadir propiedades de URL, tokens, credenciales o coordinación entre servicios. Los valores de recursos que todavía están definidos en el código deben corresponder al entorno de destino y se validan según la tarea Beta aplicable; esta guía no autoriza cambiarlos.

## 3. Actualizar un servicio existente

1. En el proyecto Apps Script correspondiente, reemplazar únicamente los archivos de la tabla que hayan cambiado en el commit aprobado. Mantener los demás archivos auxiliares y el manifiesto existente.
2. Guardar y revisar errores de sintaxis/compilación en el editor.
3. Crear una versión nueva del proyecto.
4. Abrir **Implementar → Gestionar implementaciones**, editar el deployment Web App ya utilizado por ese servicio y seleccionar la nueva versión. Mantener la identidad de ejecución y el nivel de acceso que ya fueron aprobados para ese entorno.
5. Implementar y comprobar que el deployment conserva su URL `/exec`.
6. Ejecutar la comprobación de salud de solo lectura y las pruebas Beta aplicables antes de considerar estable la versión.

Al editar el deployment existente se conserva su URL. Si la URL no cambia, no hay que modificar la configuración central. No crear un deployment nuevo solo para publicar una versión de código.

Si el servicio todavía no tiene un deployment en el entorno autorizado, crear **Implementar → Nueva implementación → Aplicación web** con la identidad y el acceso previamente aprobados para ese entorno. No elegir un acceso más amplio por conveniencia. Verificar la URL `/exec` y su respuesta de salud antes de registrarla.

## 4. Publicar una URL nueva en la configuración central

Este paso solo aplica si se creó un deployment nuevo y su URL es distinta. La URL operativa no se guarda en código frontend, código Apps Script, propiedades de proyecto ni documentos del repositorio.

La fuente vigente es la hoja `Servicios` de la Spreadsheet central privada. El registro activo contiene seis servicios: AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN. El código actual no ofrece una pantalla/acción administrativa genérica para editar endpoints; la publicación de una URL debe realizarla un operador autorizado de la configuración central, siguiendo el versionado de `ESQUEMA_CONFIGURACION_CENTRAL.md`. La acción de ADMIN para `rich_text_mode` no es un editor de endpoints.

1. Leer `active_revision` y `schema_version` desde la única fila `CONFIGURATION_ACTIVE` de `ConfiguracionControl`. Confirmar `publication_state=READY`.
2. Preparar la siguiente `config_revision` completa sin tocar la revisión activa. Copiar a la revisión candidata las seis filas de `Servicios` y todas las filas vigentes de `ConfiguracionParametros` y `ConfiguracionRecursos`; conservar el esquema admitido. No publicar un conjunto parcial.
3. Cambiar únicamente la fila del servicio afectado: `endpoint_url`, `updated_at`, `updated_by` y `change_reason`. Conservar `service_key`, `enabled`, `contract_version`, `min_client_version` y `health_action`, salvo que un cambio de contrato aprobado requiera modificarlos.
4. Validar la URL HTTPS completa, el host/patrón de deployment esperado, la ausencia de credenciales/query secrets, la unicidad de las seis claves y la compatibilidad de contrato. No copiar la URL a logs o registros públicos.
5. Añadir a `ConfiguracionHistorial` una entrada append-only para el cambio del servicio, con revisión, clave, operación, valor anterior/nuevo, actor, fecha y motivo. No editar ni borrar historial.
6. Volver a leer la revisión candidata y verificar que todas sus filas, encabezados, tipos y conteos estén completos. Si no puede garantizarse la publicación coherente mediante una conmutación final controlada, no activar la revisión.
7. Como último paso, cambiar `ConfiguracionControl.active_revision` a la revisión candidata en una única operación controlada. Mantener `publication_state=READY`; no dejar activa una revisión parcial ni mezclar filas de revisiones.
8. Leer nuevamente el control y una muestra de la revisión publicada. Confirmar que el frontend puede resolver el endpoint nuevo y que la comprobación de salud de solo lectura lo identifica como disponible.

La configuración pública se mantiene en caché por un TTL corto. Los clientes la actualizan al vencer ese TTL; para una comprobación inmediata, recargar la aplicación después de confirmar la revisión. No es necesario redesplegar el frontend ni los otros cinco servicios únicamente por cambiar una URL. Si cambia el contrato de acciones/payload, actualizar y validar solo los consumidores realmente afectados.

Si la publicación central no puede completarse con integridad verificable, mantener la revisión anterior activa y continuar usando el deployment anterior. No forzar el cambio ni añadir un endpoint local de respaldo.

## 5. Comprobación posterior

- Confirmar la versión desplegada y la respuesta GET de salud del servicio afectado.
- Ejecutar el workflow **GPSpedia deployed service health (read-only)** mediante `workflow_dispatch` cuando se tenga autorización para consultar los deployments del entorno. Es una consulta GET de los seis servicios; no realiza escrituras.
- Ejecutar las pruebas Beta funcionales del servicio y de sus consumidores. Registrar el SHA probado, etiqueta del deployment, servicio, rol y evidencia anonimizada en `Hallazgos_Beta.md`.
- Confirmar que los otros servicios independientes siguen disponibles. Una falla de salud de un servicio no debe ocultar el estado de los demás.
- No considerar CI, pruebas estáticas ni una respuesta simulada como prueba de integración real con Apps Script, Spreadsheet, Drive, OAuth o YouTube.

## 6. Rollback

**Si se actualizó el código conservando la misma URL:**
1. En **Implementar → Gestionar implementaciones**, editar el deployment afectado.
2. Seleccionar la versión anterior conocida como estable y volver a implementar.
3. Confirmar la misma URL `/exec`, ejecutar la comprobación GET y repetir las pruebas Beta del flujo afectado.
4. No revertir ni redesplegar servicios no relacionados.

**Si se publicó una URL nueva en la configuración central:**
1. Mantener disponible el deployment anterior.
2. Crear una nueva revisión completa de configuración, copiando la revisión activa y restaurando en `Servicios.endpoint_url` la URL anterior del servicio.
3. Añadir una nueva entrada append-only en `ConfiguracionHistorial` que documente el rollback y la revisión revertida.
4. Validar la revisión candidata y cambiar `active_revision` mediante la misma conmutación controlada. Nunca editar una revisión ya publicada.
5. Confirmar read-back, salud y flujo funcional. Solo después de la validación y autorización correspondientes se puede retirar el deployment nuevo.

No usar cambios directos de la URL en el frontend, endpoints alternativos, propiedades locales, rollback destructivo de la Spreadsheet ni modificaciones de la rama base.

## 7. Límites y pendientes Beta

- La lectura real de configuración central mediante el contexto de Spreadsheet del Web App y los permisos efectivos debe verificarse por deployment en Beta, según MIG-006 y `Tareas_Beta.md`.
- La comprobación GET de salud no prueba login, RBAC, escrituras, concurrencia ni acceso a Drive.
- No se autoriza con esta guía un despliegue productivo, cambios de permisos, limpieza de propiedades legacy ni eliminación de deployments anteriores.
- La rama base protegida `GPSpedia2.2.5` no se modifica desde este procedimiento.
