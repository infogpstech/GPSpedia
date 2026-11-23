# Guía de despliegue de servicios Apps Script — GPSpedia 2.2.5

**Alcance:** despliegue ordenado de los proyectos backend y su conexión entre sí.  
**Fuente de código:** `JS/Services/`.  
**Configuración de coordinación:** `Services/COORDINATOR_SETUP.md`.  
**Rama de preparación:** `GPSpedia2.2.5_work`.

> **Advertencia de entorno:** los archivos fuente actuales contienen IDs de Spreadsheet/Drive y algunas URLs de servicios que corresponden al entorno operativo. Esta guía no autoriza publicar cambios ni probarlos contra producción. Para Beta, primero se deben sustituir los IDs y endpoints por los recursos desechables del entorno Beta. No copiar secretos reales al repositorio ni a este documento.

## 1. Inventario de proyectos y archivos

Cada servicio es un proyecto Apps Script independiente. Los nombres de los archivos en el editor pueden conservar la capitalización indicada.

| Orden | Proyecto Apps Script | Archivos que deben existir en ese proyecto |
|---:|---|---|
| 1 | COORDINATOR | `JS/Services/Coordinator.js` |
| 2 | CATALOG | `JS/Services/catalog.js` |
| 3 | AUTH | `JS/Services/Auth.js`, `JS/Services/SharedMutationClient.js` |
| 4 | USERS | `JS/Services/users.js`, `JS/Services/SharedMutationClient.js` |
| 5 | WRITE | `JS/Services/write.js`, `JS/Services/SharedMutationClient.js` |
| 6 | FEEDBACK | `JS/Services/feedback.js`, `JS/Services/InboxConversations.js`, `JS/Services/SharedMutationClient.js` |
| 7 | UTILITIES | `JS/Services/Utilities.js`, `JS/Services/SharedMutationClient.js` |
| 8 | ADMIN | `JS/Services/admin.js`, `JS/Services/SharedMutationClient.js` |

**Importante:**
- `SharedMutationClient.js` se copia íntegro en AUTH, USERS, WRITE, FEEDBACK, UTILITIES y ADMIN. Debe ser la versión de la misma revisión que los servicios.
- CATALOG no incluye SharedMutationClient: sus lecturas públicas no requieren coordinación; conserva un secreto compartido con ADMIN únicamente para autorizar metadatos internos del inventario de imágenes.
- `InboxConversations.js` es parte de FEEDBACK; no omitirlo.
- No combinar los archivos de servicios distintos en un mismo proyecto. Cada proyecto mantiene su propio `doGet`, `doPost`, propiedades y deployment.
- No desplegar archivos del frontend (`JS/Frontend/*`) como proyectos Apps Script.

## 2. Preparación antes de crear deployments

1. Confirmar repositorio, rama y commit exacto que se va a publicar.
2. Elegir un único entorno: Beta aislada o producción autorizada. No mezclar URLs, secretos, cuentas ni datos entre entornos.
3. Para Beta, crear Spreadsheet y Drive de prueba separados. Revisar en cada archivo backend los valores de `SPREADSHEET_ID`, `DRIVE_FOLDER_ID` y URLs internas antes de guardar el proyecto.
4. Los servicios AUTH, USERS, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN contienen actualmente el ID de Spreadsheet del entorno operativo. WRITE, FEEDBACK y ADMIN también contienen IDs de carpeta Drive. No publicar esos valores sin confirmar el entorno destino.
5. ADMIN contiene constantes URL para WRITE, CATALOG, AUTH, USERS y FEEDBACK. En Beta deben apuntar a los deployments Beta correspondientes; no basta con cambiar las propiedades del Coordinator.
6. Confirmar que las hojas requeridas existen y que el esquema corresponde a esta versión. Los nombres principales incluyen `Cortes`, `Users`, `ActiveSessions`, `Logs`, `Idempotencia`, `AportesVehiculo`, `Feedbacks`, `Tutorial`, `Relay` y `LogosMarca`. FEEDBACK crea sus hojas de Inbox cuando se inicializan las operaciones correspondientes.
7. Verificar permisos de la cuenta que ejecutará los scripts sobre Spreadsheet y Drive. Autorizar los servicios de Google que solicite Apps Script. No conceder permisos más amplios de los necesarios.
8. No crear ni inventar un `appsscript.json` con scopes genéricos: el repositorio no versiona manifiestos de Apps Script. Si el proyecto destino ya tiene manifiesto, revisar sus scopes contra las APIs realmente usadas antes de modificarlo.

## 3. Orden de despliegue

### Paso 1 — COORDINATOR (primero)

**Archivo:** `JS/Services/Coordinator.js` únicamente.

1. Crear un proyecto Apps Script independiente llamado, por ejemplo, `GPSpedia-COORDINATOR-BETA` o `GPSpedia-COORDINATOR`.
2. Copiar el contenido íntegro de `JS/Services/Coordinator.js` en un archivo `Coordinator.gs` (o el nombre equivalente del editor).
3. Guardar y revisar que no haya errores de sintaxis.
4. Crear un deployment nuevo: **Implementar → Nueva implementación → Aplicación web**.
5. Ejecutar como la cuenta propietaria/operadora que debe administrar las propiedades del proyecto.
6. Configurar el acceso HTTP según el modelo ya autorizado para ese entorno y el consumo desde navegador/servicios. No ampliar el acceso de un deployment existente por conveniencia.
7. Implementar y copiar la URL terminada en `/exec`. Registrar esa URL en la hoja de control del entorno, no en el repositorio.
8. Abrir la URL en navegador. Debe responder el JSON de disponibilidad/versión del Coordinator, no una página de error.
9. En **Configuración del proyecto → Propiedades del script**, crear los secretos indicados en la sección 4. No se configura una URL del Coordinator dentro del propio Coordinator.
10. Las URLs de los servicios consumidores se completarán después de desplegar cada uno.

**Dependencia:** todos los consumidores que utilizan coordinación deben apuntar a esta URL del mismo entorno. No continuar conectando servicios a un Coordinator de otro entorno.

### Paso 2 — CATALOG

**Archivo:** `JS/Services/catalog.js` únicamente.

1. Crear/abrir el proyecto Apps Script independiente CATALOG.
2. Reemplazar el archivo del proyecto con la versión exacta de `JS/Services/catalog.js`.
3. Confirmar `SPREADSHEET_ID` del entorno destino.
4. Guardar y crear una nueva versión de Aplicación web.
5. Registrar su URL `/exec`.
6. Probar el GET de disponibilidad/feed y comprobar que la lectura utiliza el Spreadsheet aislado.
7. En ScriptProperties crear `GPSpedia_CATALOG_TRAFFIC_SECRET` con el mismo secreto aleatorio configurado en ADMIN. Se utiliza exclusivamente para autorizar la consulta interna de metadatos del inventario de imágenes; no autentica tráfico ni conecta CATALOG con Coordinator.

### Paso 3 — AUTH

**Archivos:** `JS/Services/Auth.js` y `JS/Services/SharedMutationClient.js`.

1. Copiar ambos archivos completos al proyecto AUTH. No sustituir el archivo Auth por el de otro proyecto.
2. Revisar `SPREADSHEET_ID` y las hojas `Users`, `ActiveSessions` y `Logs`.
3. En ScriptProperties crear:
   - `GPSpedia_COORDINATOR_URL` = URL `/exec` del Coordinator del mismo entorno.
   - `GPSpedia_COORDINATOR_SECRET` = secreto exclusivo AUTH, igual a `GPSpedia_COORDINATOR_SECRET_AUTH` en Coordinator.
   - `GPSpedia_PASSWORD_RECOVERY_SECRET_V1` solo si el proyecto no lo genera automáticamente; el código inicializa esta propiedad de forma segura cuando falta. No sobrescribirla en una actualización.
4. Guardar, autorizar los servicios solicitados y crear nueva versión de Aplicación web.
5. Registrar la URL `/exec` de AUTH.
6. Configurar en Coordinator `GPSpedia_SERVICE_URL_AUTH` con esa URL.

### Paso 4 — USERS

**Archivos:** `JS/Services/users.js` y `JS/Services/SharedMutationClient.js`.

1. Copiar ambos archivos completos.
2. Confirmar `SPREADSHEET_ID` y las hojas `Users` y `ActiveSessions`.
3. Configurar `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET` con la URL del Coordinator y el secreto USERS correspondiente a `GPSpedia_COORDINATOR_SECRET_USERS`.
4. Crear una nueva versión de Aplicación web y registrar la URL `/exec`.
5. Configurar en Coordinator `GPSpedia_SERVICE_URL_USERS`.
6. AUTH y USERS deben operar sobre el mismo Spreadsheet del entorno, ya que comparten el esquema de identidad. No conectar uno a Beta y el otro a producción.

### Paso 5 — WRITE

**Archivos:** `JS/Services/write.js` y `JS/Services/SharedMutationClient.js`.

1. Copiar ambos archivos completos.
2. Revisar `SPREADSHEET_ID`, `DRIVE_FOLDER_ID`, hojas `Cortes`, `Idempotencia` (y compatibilidad `Idempotencia_Cortes`) y recursos de Drive.
3. Configurar `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET` con el Coordinator y el secreto WRITE (`GPSpedia_COORDINATOR_SECRET_WRITE`).
4. Guardar y crear una nueva versión de Aplicación web.
5. Registrar la URL `/exec` y configurar en Coordinator `GPSpedia_SERVICE_URL_WRITE`.

### Paso 6 — FEEDBACK

**Archivos:** `JS/Services/feedback.js`, `JS/Services/InboxConversations.js` y `JS/Services/SharedMutationClient.js`.

1. Copiar los tres archivos completos al mismo proyecto FEEDBACK.
2. Confirmar que `InboxConversations.js` no se omitió y que sus funciones están en el mismo proyecto que `feedback.js`.
3. Revisar `SPREADSHEET_ID` y `DRIVE_FOLDER_ID`; deben ser los del entorno elegido.
4. Configurar `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET` con el Coordinator y el secreto FEEDBACK (`GPSpedia_COORDINATOR_SECRET_FEEDBACK`).
5. Guardar y crear nueva versión de Aplicación web.
6. Registrar la URL `/exec` y configurar en Coordinator `GPSpedia_SERVICE_URL_FEEDBACK`.

### Paso 7 — UTILITIES

**Archivos:** `JS/Services/Utilities.js` y `JS/Services/SharedMutationClient.js`.

1. Copiar ambos archivos completos.
2. Revisar `SPREADSHEET_ID` y confirmar que la hoja de origen `Cortes` y el destino `Hoja 1` corresponden al entorno aislado.
3. Configurar `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET` con el Coordinator y el secreto UTILITIES (`GPSpedia_COORDINATOR_SECRET_UTILITIES`).
4. Guardar y crear nueva versión de Aplicación web.
5. Registrar su URL `/exec`. La versión actual de Coordinator no necesita una propiedad `GPSpedia_SERVICE_URL_UTILITIES` para el flujo documentado de migración; no crearla por analogía.

### Paso 8 — ADMIN (después de sus dependencias)

**Archivos:** `JS/Services/admin.js` y `JS/Services/SharedMutationClient.js`.

1. Copiar ambos archivos completos.
2. Revisar `SPREADSHEET_ID` y `DRIVE_FOLDER_ID`.
3. Antes de guardar, sustituir las constantes URL `WRITE_SERVICE_URL`, `CATALOG_SERVICE_URL`, `AUTH_SERVICE_URL`, `USERS_SERVICE_URL` y `FEEDBACK_SERVICE_URL` por las URLs de los servicios del mismo entorno. ADMIN hace llamadas directas a estos endpoints; las propiedades de Coordinator no reemplazan estas constantes.
4. Configurar `GPSpedia_COORDINATOR_URL` y `GPSpedia_COORDINATOR_SECRET` con el Coordinator y el secreto ADMIN (`GPSpedia_COORDINATOR_SECRET_ADMIN`).
5. Guardar y crear nueva versión de Aplicación web.
6. Registrar su URL `/exec` y configurar en Coordinator `GPSpedia_SERVICE_URL_ADMIN`. Esta URL se requiere para la invalidación remota de caché de actor en operaciones AUTH; no omitirla.

### Paso 9 — completar URLs en Coordinator

Una vez que existan los deployments, abrir las ScriptProperties del proyecto COORDINATOR y configurar las URLs `/exec` del mismo entorno:

| Propiedad en Coordinator | URL que se debe pegar |
|---|---|
| `GPSpedia_SERVICE_URL_AUTH` | deployment AUTH |
| `GPSpedia_SERVICE_URL_USERS` | deployment USERS |
| `GPSpedia_SERVICE_URL_WRITE` | deployment WRITE |
| `GPSpedia_SERVICE_URL_FEEDBACK` | deployment FEEDBACK |
| `GPSpedia_SERVICE_URL_ADMIN` | deployment ADMIN |

No crear una propiedad de URL para UTILITIES por analogía. No pegar URLs de producción en Coordinator Beta. Guardar las propiedades; no se necesita crear un nuevo deployment solo por cambiar ScriptProperties.

## 4. Matriz completa de secretos

Generar valores aleatorios independientes de al menos 32 caracteres. El mismo secreto de cada servicio se copia únicamente en los dos lugares indicados. Nunca reutilizar el secreto de AUTH para los demás servicios.

| Servicio | Propiedad en Coordinator | Propiedad local del servicio |
|---|---|---|
| AUTH | `GPSpedia_COORDINATOR_SECRET_AUTH` | `GPSpedia_COORDINATOR_SECRET` en AUTH |
| USERS | `GPSpedia_COORDINATOR_SECRET_USERS` | `GPSpedia_COORDINATOR_SECRET` en USERS |
| WRITE | `GPSpedia_COORDINATOR_SECRET_WRITE` | `GPSpedia_COORDINATOR_SECRET` en WRITE |
| ADMIN | `GPSpedia_COORDINATOR_SECRET_ADMIN` | `GPSpedia_COORDINATOR_SECRET` en ADMIN |
| FEEDBACK | `GPSpedia_COORDINATOR_SECRET_FEEDBACK` | `GPSpedia_COORDINATOR_SECRET` en FEEDBACK |
| UTILITIES | `GPSpedia_COORDINATOR_SECRET_UTILITIES` | `GPSpedia_COORDINATOR_SECRET` en UTILITIES |

El secreto de inventario `GPSpedia_CATALOG_TRAFFIC_SECRET` debe tener el mismo valor en CATALOG y ADMIN, pero no se registra en Coordinator. Las antiguas propiedades de contadores `GPSpedia_<SERVICIO>_TRAFFIC_SECRET` y `GPSpedia_USERS_TRAFFIC_SECRET` pueden permanecer sin uso durante la ventana de rollback; no borrarlas hasta completar Beta. `GPSpedia_CATALOG_TRAFFIC_SECRET` sigue activo para el inventario de imágenes. No documentar valores secretos.

## 5. Pruebas de humo después del despliegue

Ejecutar únicamente en el entorno aislado aprobado:

1. Abrir cada URL `/exec` y confirmar que responde el servicio esperado. Registrar servicio, URL identificada (sin parámetros secretos), versión y fecha.
2. Comprobar los diagnósticos `?debug=true` donde estén implementados. Deben mostrar estado booleano/configurado, nunca valores secretos.
3. Confirmar desde cada consumidor que `GPSpedia_COORDINATOR_URL` apunta al Coordinator del mismo entorno y que su secreto local coincide con la propiedad del servicio en Coordinator.
4. Desde ADMIN, comprobar que el agregado global informa el alcance Coordinator-only y marca las rutas directas como no recopiladas; un cero de eventos Coordinator no significa cero solicitudes HTTP.
5. Comprobar el flujo de sesión AUTH → Coordinator → cachés de servicios solo con cuentas de prueba.
6. Comprobar CATALOG con lectura del catálogo Beta y que ADMIN puede consultar metadatos internos del inventario de imágenes con `GPSpedia_CATALOG_TRAFFIC_SECRET`; no existe contador directo de tráfico CATALOG.
7. Comprobar ADMIN → WRITE y ADMIN → CATALOG con IDs de prueba, sin ejecutar altas destructivas ni migraciones de datos reales.
8. Probar FEEDBACK/Inbox con cuentas de prueba y hojas aisladas.
9. Ejecutar las pruebas de concurrencia, recuperación de archivos, journals y Spreadsheet/Drive únicamente según la lista Beta vigente y sus recursos desechables.

No considerar aprobado un servicio por el solo hecho de que su URL responda. Registrar pruebas funcionales, permisos, integridad de datos y fallos parciales por separado.

## 6. Actualizar el frontend (solo cuando se autorice)

El frontend obtiene sus endpoints desde `JS/Frontend/api-config.js`, objeto `API_ENDPOINTS`. Después de validar todos los servicios del entorno:

1. Actualizar AUTH, CATALOG, WRITE, USERS, FEEDBACK, UTILITIES y ADMIN con las URLs `/exec` correspondientes al entorno que se publicará.
2. Revisar que no quede ninguna URL cruzada entre Beta y producción.
3. Ejecutar las pruebas de contratos/ruteo y regresión del frontend.
4. Publicar el App Shell/Pages solo mediante el proceso autorizado. Los pushes a la rama de trabajo pueden activar el workflow de Pages; no confundir ese despliegue frontend con deployments Apps Script.
5. La actualización de `api-config.js` no actualiza los proyectos Apps Script; cada backend requiere su propio deployment.

## 7. Actualizaciones posteriores: qué se vuelve a desplegar

| Cambio de código | Acción |
|---|---|
| Solo `Coordinator.js`, manteniendo contratos compatibles | Nueva versión y deployment de COORDINATOR. No redeploy automático de los consumidores. |
| Solo ScriptProperties del Coordinator (URLs/secretos) | Guardar propiedades. No requiere nuevo deployment. |
| Solo `catalog.js` | Nueva versión CATALOG. |
| Solo `Auth.js` | Nueva versión AUTH. |
| Solo `users.js` | Nueva versión USERS. |
| Solo `write.js` | Nueva versión WRITE. |
| `feedback.js` o `InboxConversations.js` | Nueva versión FEEDBACK. |
| `Utilities.js` | Nueva versión UTILITIES. |
| `admin.js` | Nueva versión ADMIN. |
| `SharedMutationClient.js` | Actualizar el archivo en cada consumidor afectado (AUTH, USERS, WRITE, FEEDBACK, UTILITIES y/o ADMIN) y desplegar cada proyecto actualizado. |
| `JS/Frontend/api-config.js` | Pruebas y despliegue del frontend; no redeploy de Apps Script por ese cambio aislado. |

Una actualización compatible de Coordinator no exige publicar todos los consumidores. Si cambia el contrato de un consumidor, publicar Coordinator primero cuando el nuevo contrato lo requiera, después los consumidores afectados y por último los clientes/frontend que dependan del cambio. Mantener deployments anteriores disponibles para rollback.

## 8. Registro obligatorio de cada despliegue

Por cada servicio guardar fuera del repositorio o en un registro operativo sin secretos:

- Entorno (Beta/producción autorizada).
- Nombre del proyecto Apps Script.
- Archivos y commit exactos publicados.
- Número/identificador de versión del deployment.
- URL `/exec` y servicio al que corresponde.
- Cuenta ejecutora y política de acceso configurada.
- IDs de Spreadsheet/Drive usados (identificadores de recursos Beta; no datos de acceso).
- Nombres de ScriptProperties creadas, nunca sus valores.
- Pruebas de humo realizadas, resultado y evidencia.
- Servicios consumidores cuya URL fue actualizada.
- Deployment anterior que permite rollback.

**No publicar secretos, tokens, contenido de hojas, datos personales ni credenciales en el registro.**


## 9. Rollback controlado

El rollback restaura una versión de código/deployment; no revierte automáticamente escrituras, cambios de Spreadsheet, archivos Drive ni operaciones externas ya confirmadas. La recuperación de datos requiere el procedimiento específico de la operación y sus registros de idempotencia/auditoría.

### 9.1 Antes de revertir

1. Identificar el servicio afectado, el commit publicado, la versión Apps Script activa y la última versión estable conocida. Usar el registro operativo del despliegue; no inferir versiones ni endpoints.
2. Confirmar qué servicios consumidores dependen del contrato cambiado y si el Coordinator/frontend también fueron actualizados.
3. Conservar logs, IDs de operación y evidencia del fallo. No borrar deployments anteriores ni propiedades antiguas durante el diagnóstico.
4. No ejecutar rollback contra producción sin autorización expresa. En Beta, usar únicamente los proyectos y recursos aislados.

### 9.2 Restaurar un servicio Apps Script

1. Abrir el proyecto Apps Script del servicio afectado y entrar en **Implementar → Gestionar implementaciones**.
2. Editar el deployment correspondiente y seleccionar la versión estable registrada anteriormente. Si esa versión no está disponible para el deployment, crear una nueva implementación desde el código de la revisión estable y registrar la nueva URL `/exec`.
3. Mantener el mismo deployment/URL cuando Apps Script permita actualizar su versión; si cambia la URL, actualizar únicamente los consumidores del mismo entorno que la utilizan.
4. No cambiar ScriptProperties por analogía. Restaurar una propiedad solo si el registro operativo confirma su valor anterior; los valores secretos no se recuperan desde Git ni se copian a este documento.
5. Ejecutar las pruebas de humo de la sección 5 para el servicio y sus consumidores directos. Registrar versión restaurada, URL, commit, fecha y resultado.

### 9.3 Orden cuando hay cambios incompatibles

- Si solo falla un consumidor y el Coordinator conserva compatibilidad hacia atrás, restaurar únicamente ese consumidor.
- Si se publicó un Coordinator nuevo que requiere consumidores nuevos y estos deben volver a una versión anterior, restaurar primero los consumidores a versiones compatibles y después el Coordinator.
- Si el Coordinator anterior ya no admite consumidores nuevos, restaurar primero el Coordinator/contrato compatible solo después de comprobar que los consumidores activos pueden operar con él; cuando no exista compatibilidad segura, detener la secuencia y preparar un rollback coordinado de los proyectos afectados en Beta.
- Si cambió `api-config.js`, revertir el frontend por separado mediante un commit de reversión en la rama autorizada y comprobar que sus endpoints corresponden a las versiones backend restauradas. No reescribir historial ni usar force push.

### 9.4 Cierre del rollback

1. Verificar disponibilidad de los endpoints y ejecutar las pruebas funcionales no destructivas aplicables.
2. Confirmar que Coordinator, servicios y frontend pertenecen al mismo entorno y que las propiedades necesarias siguen configuradas.
3. Comparar el estado de datos antes/después. No repetir una operación confirmada ni intentar deshacerla mediante redeploy.
4. Documentar causa, servicios afectados, versiones anteriores/nuevas, cambios de URL/propiedad y evidencia de verificación. Mantener disponible la versión fallida para análisis hasta cerrar el incidente.
