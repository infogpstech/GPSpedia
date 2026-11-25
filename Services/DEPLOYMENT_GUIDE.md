# Guía operativa de despliegue — GPSpedia

**Vigencia:** AUG-145 (ampliación de MIG-029)
**Rama de referencia:** `GPSpedia2.2.5_work`
**Fuente normativa:** `NORMAS_DESAROLLO.md`, §§4–5, 8–12, 16–18.
**Alcance:** actualización de los seis proyectos Apps Script activos. Esta guía no autoriza despliegues productivos ni sustituye la validación Beta.

## 1. Arquitectura y proyectos activos

Los seis servicios son proyectos Apps Script independientes. El frontend resuelve acción → servicio → endpoint mediante `ACTION_TO_SERVICE_MAP` y el objeto local `API_ENDPOINTS` de `JS/Frontend/api-config.js`. Las seis URLs se mantienen manualmente en ese objeto; no se consultan, publican ni actualizan desde Spreadsheet, AUTH o el panel Developer. AUTH conserva `getPublicConfiguration` únicamente para parámetros funcionales públicos como `rich_text_mode`, y esa lectura usa la URL AUTH del propio `API_ENDPOINTS`, sin un bootstrap adicional. El resto de los servicios no llama a AUTH ni a otros proyectos Apps Script: cada uno valida localmente su contexto y sus permisos.

Flujo de enrutamiento:

1. El frontend resuelve la acción mediante `ACTION_TO_SERVICE_MAP`.
2. Obtiene el destino exclusivamente de `API_ENDPOINTS[service]` y valida el formato HTTPS local.
3. El health scan usa las mismas seis URLs locales; no consulta AUTH para descubrir endpoints.
4. Cuando una operación funcional requiere varios servicios, el frontend coordina la secuencia. No se debe introducir una llamada Apps Script→Apps Script para sustituir esa coordinación.

| Servicio | Identidad de salud esperada | Archivos fuente que deben estar en su proyecto |
|---|---|---|
| AUTH | `GPSpedia-Auth` | `JS/Services/Auth.js`, `JS/Services/SharedSessionActor.js`, `JS/Services/CentralConfigurationReader.js` |
| CATALOG | `GPSpedia-Catalog` | `JS/Services/catalog.js` |
| WRITE | `GPSpedia-Write` | `JS/Services/write.js`, `JS/Services/SharedSessionActor.js`, `JS/Services/CentralConfigurationReader.js` |
| FEEDBACK | `GPSpedia-Feedback` | `JS/Services/feedback.js`, `JS/Services/InboxConversations.js`, `JS/Services/SharedSessionActor.js`, `JS/Services/CentralConfigurationReader.js` |
| UTILITIES | `GPSpedia-Utilities` | `JS/Services/Utilities.js`, `JS/Services/SharedSessionActor.js` |
| ADMIN | `GPSpedia-Admin` | `JS/Services/admin.js`, `JS/Services/SharedSessionActor.js`, `JS/Services/CentralConfigurationReader.js` |

CATALOG usa su verificación local de actor y no incluye `SharedSessionActor.js`. FEEDBACK necesita `InboxConversations.js`. Los helpers se copian solo a los proyectos indicados; no combinar servicios en un solo proyecto.

**No son proyectos activos:** USERS y COORDINATOR. No crear, actualizar ni conectar deployments para ellos. Las instrucciones archivadas en `Olds/Documentacion_Legacy/Services/` son históricas y no deben ejecutarse.

## 2. Orden global de despliegue

Cuando una publicación aprobada requiere actualizar los seis proyectos, usar este orden:

| Orden | Servicio | Motivo del orden |
|---:|---|---|
| 1 | AUTH | Es el bootstrap de configuración del frontend. Debe estar disponible y devolver una revisión íntegra antes de validar el enrutamiento de los demás servicios. |
| 2 | CATALOG | Provee las lecturas del catálogo y es propietario del feed incremental. Se valida antes de los flujos que publican cambios desde el frontend. |
| 3 | WRITE | Atiende altas y modificaciones de vehículos, cortes y VIN; sus flujos pueden coordinar después una publicación en CATALOG desde el frontend. |
| 4 | FEEDBACK | Atiende reportes, likes, PyS, tutoriales, Inbox y aprobación de vídeos. |
| 5 | UTILITIES | Servicio especializado de mantenimiento/migración; se publica después de los flujos ordinarios y se valida con recursos desechables. |
| 6 | ADMIN | Contiene operaciones administrativas de mayor privilegio y mantenimiento de Drive/Spreadsheet; se deja al final para limitar el radio de impacto. |

Este es un **orden operativo de liberación**, no una cadena de dependencias backend. Después de AUTH, los otros cinco servicios son independientes: no deben esperar llamadas entre sí. Si solo cambia un servicio, desplegar únicamente ese servicio. No actualizar los otros cinco por rutina ni publicar los seis por costumbre.

Si una publicación cambia un contrato compartido, confirmar antes que el frontend y todos los consumidores afectados sean compatibles con el despliegue escalonado. Si una operación falla, no bloquear servicios independientes; detener únicamente el servicio o grupo que dependa del contrato incompatible.

## 3. Preparación obligatoria antes de cada despliegue

1. Confirmar repositorio `infogpstech/GPSpedia`, rama `GPSpedia2.2.5_work` y árbol Git limpio. No copiar código desde otra rama, una descarga antigua ni desde un deployment.
2. Anotar el SHA completo que se publicará. Revisar el diff y confirmar que solo contiene los cambios autorizados.
3. Ejecutar el workflow `GPSpedia service regression tests`. Sintaxis, contratos y regresión deben aprobar antes de abrir Apps Script.
4. Identificar los servicios afectados mediante la matriz de archivos de §1 y la matriz de propagación de §8. No ampliar el despliegue a proyectos no afectados.
5. Confirmar que el destino es Beta aislada o producción expresamente autorizada. Para Beta, ejecutar primero la sincronización segura y las precondiciones del apartado 0 de `Tareas_Beta.md`. Usar Spreadsheet, Drive, cuentas, endpoints y registros sintéticos desechables.
6. En el proyecto existente, confirmar identidad de ejecución, permisos ya aprobados y deployment Web App. Los seis servicios abren la Spreadsheet compartida mediante `SpreadsheetApp.openById()` usando `GPSpediaSpreadsheetId_`: AUTH, WRITE, FEEDBACK y ADMIN reciben el valor desde `CentralConfigurationReader.js`; CATALOG y UTILITIES lo declaran en su módulo propietario. Confirmar que la identidad de ejecución del deployment tiene acceso de lectura/escritura a esa Spreadsheet. No añadir propiedades, credenciales ni URLs de otros servicios.
7. Comparar los scopes/manifiesto existentes con las APIs realmente utilizadas. El repositorio no versiona `appsscript.json`: conservar el manifiesto del proyecto y no inventar scopes genéricos. Si Apps Script solicita autorización nueva, detenerse y revisar la causa antes de aprobarla.

No añadir propiedades de URL, credenciales, tokens, API keys ni secretos compartidos. No introducir URLs de otros servicios en código Apps Script. Los endpoints operativos se obtienen del registro central; la única excepción es el localizador bootstrap documentado en §9.

## 4. Procedimiento común en el editor de Apps Script

Aplicar estos pasos dentro del proyecto existente de cada servicio. Las rutas `.js` del repositorio son la fuente de verdad; en el editor de Apps Script, el archivo de script puede mostrarse con extensión `.gs`. Copiar el contenido completo del archivo del SHA aprobado al archivo de script correspondiente, sin alterar el código ni crear proyectos duplicados.

1. Abrir `script.google.com` e ingresar con la cuenta autorizada para el entorno destino.
2. Seleccionar el proyecto Apps Script existente del servicio y comprobar su identidad mediante el `doGet` de salud indicado en §5. No elegir un proyecto solo por un nombre parecido.
3. En el panel de archivos, abrir cada archivo de script que corresponda a la matriz del servicio. Sustituir su contenido completo por el archivo del repositorio en el SHA aprobado. Si falta un helper que la matriz exige, crearlo dentro de ese mismo proyecto; no copiar helpers a proyectos no listados. Evitar duplicar funciones globales.
4. Guardar todos los archivos. Revisar errores de sintaxis y confirmar que los archivos auxiliares requeridos están presentes. No cambiar el manifiesto, la identidad de ejecución, permisos ni propiedades del proyecto.
5. Abrir **Implementar → Gestionar implementaciones**. Editar con el icono de lápiz el deployment de tipo **Aplicación web** que ya utiliza el servicio.
6. En el selector **Versión**, elegir **Nueva versión**. Añadir una descripción trazable, por ejemplo `GPSpedia AUTH <SHA completo>`, y comprobar que se publica el código del SHA aprobado.
7. Mantener exactamente la identidad **Ejecutar como** y el nivel **Quién tiene acceso** que ya fueron aprobados para ese entorno. No ampliar el acceso por conveniencia.
8. Pulsar **Implementar** y conservar la URL `/exec` existente. No crear una implementación nueva para una actualización ordinaria. Si el editor solicita permisos que no estaban aprobados, detenerse.
9. Copiar la URL resultante solo al registro privado de despliegue/evidencia. Compararla con la URL que ya figura en `Servicios`; si no cambió, no modificar la configuración central.
10. Ejecutar el GET de salud descrito en el paso específico del servicio. Solo después de aprobarlo continuar con sus pruebas Beta funcionales.

Si el servicio todavía no tiene un deployment en el entorno Beta autorizado, crear **Implementar → Nueva implementación → Aplicación web** usando la identidad y el acceso previamente aprobados. Registrar que la URL es nueva y seguir §9 antes de enrutar tráfico hacia ella. Nunca crear una implementación pública o más permisiva para resolver un error.

## 5. Despliegue paso a paso por servicio

### 5.1 AUTH — primero

1. Abrir el proyecto existente cuya respuesta de salud identifica `GPSpedia-Auth`.
2. Actualizar exactamente `Auth.js`, `SharedSessionActor.js` y `CentralConfigurationReader.js` desde el mismo SHA. AUTH necesita el lector central para publicar la configuración pública y el helper local de actor para sus operaciones de sesión.
3. Guardar y confirmar que no hay funciones duplicadas ni archivos auxiliares omitidos.
4. Seguir §4, pasos 5–9, para crear una versión y actualizar el deployment Web App existente. Mantener la URL bootstrap actual si no hay una migración de bootstrap expresamente aprobada.
5. Consultar `GET <URL del deployment>/exec?debug=true`. La respuesta debe ser JSON con `service: GPSpedia-Auth`, `status: available` y una versión no vacía.
6. Desde la aplicación Beta, comprobar que `getPublicConfiguration` devuelve `status=success`, `routingAvailable=true` y las seis claves AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN, con la revisión central íntegra en estado READY.
7. Ejecutar BETA-01 con cuentas sintéticas: login, validación de sesión, logout y revocación. No usar usuarios ni credenciales productivos.
8. Si AUTH no supera salud y configuración pública, detener la secuencia completa: el frontend no puede resolver el registro central. Restaurar AUTH según §11 antes de continuar.

### 5.2 CATALOG — segundo

1. Abrir el proyecto existente cuya respuesta de salud identifica `GPSpedia-Catalog`.
2. Actualizar únicamente `catalog.js`. CATALOG conserva su verificación local de actor; no añadir `SharedSessionActor.js` ni `CentralConfigurationReader.js`.
3. Guardar y confirmar que el proyecto no contiene helpers de servicios retirados.
4. Seguir §4, pasos 5–9, manteniendo el deployment y la URL existentes.
5. Consultar `GET <URL del deployment>/exec?debug=true`. Verificar `service: GPSpedia-Catalog`, `status: available` y versión no vacía.
6. Ejecutar BETA-02: lectura de navegación, catálogo, proyección de vehículo, dropdowns y feed incremental. Probar reset/delta con registros sintéticos; la publicación que combine WRITE/FEEDBACK con CATALOG se coordina desde el frontend.

### 5.3 WRITE — tercero

1. Abrir el proyecto existente cuya respuesta de salud identifica `GPSpedia-Write`.
2. Actualizar `write.js`, `SharedSessionActor.js` y `CentralConfigurationReader.js` desde el mismo SHA.
3. Guardar y comprobar que los dos helpers están presentes una sola vez en el proyecto.
4. Seguir §4, pasos 5–9, manteniendo identidad, acceso y URL.
5. Consultar `GET <URL del deployment>/exec?debug=true`. Verificar `service: GPSpedia-Write`, `status: available` y versión no vacía.
6. Ejecutar BETA-03 con vehículos, cortes y VIN sintéticos: comprobación previa, alta/edición, append/read-back, reintento idempotente y recuperación de respuesta perdida. No escribir sobre hojas productivas.

### 5.4 FEEDBACK — cuarto

1. Abrir el proyecto existente cuya respuesta de salud identifica `GPSpedia-Feedback`.
2. Actualizar `feedback.js`, `InboxConversations.js`, `SharedSessionActor.js` y `CentralConfigurationReader.js` desde el mismo SHA. `InboxConversations.js` pertenece a FEEDBACK y no se copia a otro servicio.
3. Guardar y comprobar que los cuatro archivos están presentes y que las funciones globales no están duplicadas.
4. Seguir §4, pasos 5–9, manteniendo identidad, acceso y URL.
5. Consultar `GET <URL del deployment>/exec?debug=true`. Verificar `service: GPSpedia-Feedback`, `status: available` y versión no vacía.
6. Ejecutar BETA-04: reportes, sugerencias, likes, PyS, tutoriales e Inbox. Para operaciones de YouTube, ejecutar además BETA-07 y usar solo recursos/cuentas Beta autorizados. El frontend coordina la publicación de cambios en CATALOG; FEEDBACK no debe llamar a otro servicio GPSpedia.

### 5.5 UTILITIES — quinto

1. Abrir el proyecto existente cuya respuesta de salud identifica `GPSpedia-Utilities`.
2. Actualizar `Utilities.js` y `SharedSessionActor.js`. No añadir `CentralConfigurationReader.js`: no forma parte del proyecto UTILITIES.
3. Guardar y confirmar que el proyecto conserva su acceso al Spreadsheet activo y el helper de actor local.
4. Seguir §4, pasos 5–9, manteniendo identidad, acceso y URL.
5. Consultar `GET <URL del deployment>/exec?debug=true`. UTILITIES devuelve su identidad/estado en `doGet`; verificar `service: GPSpedia-Utilities`, `status: available` y versión no vacía.
6. Ejecutar las pruebas de contexto y permisos de MIG-006/MIG-008 y MIG-026 (§6.6 de `Tareas_Beta.md`) con Spreadsheet desechable. Probar `migrateTimestamps` solo con rol Desarrollador y registros sintéticos; nunca ejecutarla sobre datos productivos.

### 5.6 ADMIN — sexto y último

1. Abrir el proyecto existente cuya respuesta de salud identifica `GPSpedia-Admin`.
2. Actualizar `admin.js`, `SharedSessionActor.js` y `CentralConfigurationReader.js` desde el mismo SHA.
3. Guardar y verificar que el lector central y el helper de actor están presentes una sola vez. No restaurar código de COORDINATOR ni SharedMutation.
4. Seguir §4, pasos 5–9, manteniendo identidad, acceso y URL.
5. Consultar `GET <URL del deployment>/exec?debug=true`. Verificar `service: GPSpedia-Admin`, `status: available` y versión no vacía.
6. Ejecutar BETA-05 y BETA-06, además de las pruebas administrativas aplicables: empezar por `ping` y lecturas no destructivas; probar backups, restauraciones, reorganización y operaciones Drive solo con recursos desechables, permisos autorizados y plan de recuperación. No probar eliminaciones permanentes ni restauraciones sobre datos reales.

## 6. Verificación y decisión para continuar

- Cada servicio se valida por separado con su identidad de salud, versión y estado. Un `GET ?debug=true` correcto demuestra que el Web App responde; no demuestra login, RBAC, escritura, concurrencia ni acceso a Drive/YouTube.
- Validar cada servicio en el orden de §2 usando su URL local en `API_ENDPOINTS`. Registrar servicio, SHA, versión, deployment, entorno, rol de prueba, resultado y evidencia anonimizada.
- Si falla AUTH, detener las pruebas que dependan de AUTH; los servicios independientes pueden continuar conforme a sus contratos. No existe una revisión central de endpoints que restaurar.
- Si falla CATALOG, WRITE, FEEDBACK, UTILITIES o ADMIN, mantener ese servicio en su versión/URL anterior o ejecutar su rollback individual. Los otros servicios independientes pueden continuar si no dependen del contrato que falló.
- Si el cambio de contrato exige una combinación específica de versiones, detener únicamente ese grupo coordinado y no publicar la revisión central nueva hasta que todos sus consumidores sean compatibles.
- La comprobación remota `JS/Tests/RemoteServiceHealth.mjs` lee las seis direcciones desde `API_ENDPOINTS` del commit indicado y consulta únicamente GET `?debug=true`. Exige `GPSPEDIA_HEALTH_ENV=BETA_ISOLATED` y `GPSPEDIA_CONFIRM_BETA_ENDPOINTS=I_HAVE_VERIFIED_THE_SIX_ENDPOINTS_ARE_BETA`. No ejecutarla con URLs productivas ni sin autorización expresa.
- El éxito del health check no sustituye las pruebas funcionales Beta.

## 7. Actualización manual de URLs en el frontend

Las URLs operativas se mantienen exclusivamente en `API_ENDPOINTS`, dentro de `JS/Frontend/api-config.js`. No existe editor de endpoints en Developer ni API de AUTH para consultar/publicar URLs.

### 7.1 Actualizar una URL

1. Confirmar el deployment Web App correcto del servicio y obtener su URL `/exec` por el procedimiento autorizado.
2. En la rama de trabajo autorizada, modificar únicamente la entrada del servicio correspondiente dentro de `API_ENDPOINTS`.
3. Mantener las seis claves AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN. Cada valor debe usar HTTPS, host `script.google.com`, ruta `/macros/s/{deploymentId}/exec` e ID distinto.
4. No añadir endpoints en Apps Script, PropertiesService, Spreadsheet, HTML ni otra tabla/configuración paralela. No cambiar `ACTION_TO_SERVICE_MAP` si el servicio propietario no cambió.
5. Ejecutar las pruebas de configuración local, mapa de acciones, health contracts y regresión. Revisar el diff y publicar el frontend mediante el proceso autorizado.
6. La URL AUTH también se modifica en `API_ENDPOINTS.AUTH`; la consulta pública de parámetros utiliza esa misma entrada. No existe un bootstrap alternativo.

### 7.2 Spreadsheet y datos históricos

La hoja histórica `Servicios` y sus filas se conservan sin uso operativo. El código vigente no la lee ni la escribe para resolver URLs. No ejecutar funciones antiguas de preparación/publicación ni editar/borrar sus filas durante esta migración. La configuración central vigente se limita a parámetros funcionales y recursos con consumidores documentados.

### 7.3 Validación y rollback

- El frontend valida estructura HTTPS e IDs de deployment únicos antes de resolver un servicio. Un valor ausente o inválido produce un error controlado; no hay fallback central ni bootstrap.
- Para revertir una URL, restaurar el valor anterior en la clave correspondiente de `API_ENDPOINTS`, ejecutar pruebas y publicar el frontend autorizado. No crear revisiones en Spreadsheet para un rollback de endpoints.
- Cambiar una URL no exige redesplegar Apps Script si el código del servicio no cambió. Si el código sí cambió, seguir el procedimiento de versión/deployment de §4 y el orden de §2.
- Las identidades de salud y la disponibilidad real se verifican únicamente en Beta aislada con autorización; la validación estructural local no acredita un deployment remoto.

## 8. Matriz de propagación de archivos compartidos

| Archivo modificado | Proyectos que deben recibir la actualización | Proyectos que no se actualizan por ese archivo |
|---|---|---|
| `SharedSessionActor.js` | AUTH, WRITE, FEEDBACK, UTILITIES, ADMIN | CATALOG |
| `CentralConfigurationReader.js` | AUTH, WRITE, FEEDBACK, ADMIN | CATALOG, UTILITIES |
| `InboxConversations.js` | FEEDBACK | AUTH, CATALOG, WRITE, UTILITIES, ADMIN |
| `Auth.js` | AUTH | Los otros cinco, salvo cambio de contrato que los afecte |
| `catalog.js` | CATALOG | Los otros cinco, salvo cambio de contrato que los afecte |
| `write.js` | WRITE | Los otros cinco, salvo cambio de contrato que los afecte |
| `feedback.js` | FEEDBACK | Los otros cinco, salvo cambio de contrato que los afecte |
| `Utilities.js` | UTILITIES | Los otros cinco, salvo cambio de contrato que los afecte |
| `admin.js` | ADMIN | Los otros cinco, salvo cambio de contrato que los afecte |

Un archivo compartido debe copiarse desde el mismo SHA a todos los proyectos que lo incluyen. No desplegar proyectos que no contienen ese archivo. Si cambia el contrato de una acción, actualizar y validar solo el servicio propietario y los consumidores frontend realmente afectados; la matriz de acciones vigente está en `JS/Frontend/api-config.js`.

## 9. Rollback

**Si se actualizó código y se conservó la URL:**

1. Abrir **Implementar → Gestionar implementaciones** del servicio afectado.
2. Editar el deployment y seleccionar la versión anterior conocida como estable.
3. Implementar conservando la misma identidad de ejecución, acceso y URL `/exec`.
4. Repetir GET de salud y pruebas Beta del flujo afectado.
5. No revertir ni redesplegar servicios no relacionados.

**Si se cambió una URL local:**

1. Mantener disponible el deployment anterior.
2. Restaurar la URL anterior en la entrada correspondiente de `API_ENDPOINTS`.
3. Ejecutar pruebas de configuración, mapa y resolución.
4. Publicar el frontend autorizado y confirmar la versión servida.
5. Ejecutar salud y pruebas funcionales únicamente en Beta aislada autorizada.

No existe rollback de endpoints mediante `Servicios`, `ConfiguracionHistorial` ni bootstrap AUTH.

## 10. Lista de comprobación y evidencia

Registrar una fila por servicio desplegado:

| Campo | Valor que debe registrarse |
|---|---|
| Entorno | Beta aislada o producción autorizada |
| Servicio / identidad | AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES o ADMIN y su identidad GET |
| SHA fuente | SHA completo del commit publicado |
| Archivos | Lista exacta de archivos actualizados en ese proyecto |
| Versión Apps Script | Número/etiqueta de versión seleccionada |
| Deployment | Identificador interno o etiqueta; no publicar la URL privada |
| URL | `CONSERVADA` o `NUEVA`; si es nueva, revisión central publicada |
| Salud | Resultado GET, identidad, versión y hora |
| Pruebas funcionales | IDs de casos Beta ejecutados y rol utilizado |
| Resultado | PASS, FAIL o NO EJECUTADO |
| Rollback | Versión anterior disponible y decisión |
| Evidencia | Referencia anonimizada en `Hallazgos_Beta.md` |

Antes de cerrar: confirmar que los otros servicios independientes siguen disponibles, que el registro central no mezcla revisiones y que no se añadieron URLs locales, propiedades, secretos ni scopes no aprobados.

## 11. Límites y pendientes Beta

- En cada Web App Beta, comprobar `SpreadsheetApp.openById(GPSpediaSpreadsheetId_)`, la identidad devuelta y los permisos efectivos de lectura/escritura. WRITE, FEEDBACK y ADMIN también deben abrir `GPSpediaCortesRootFolderId_` desde `CentralConfigurationReader.js`; confirmar que corresponde a la carpeta `Cortes`, no está en papelera y es hija directa de la raíz de Drive. Los IDs son localizadores de recursos, no credenciales; no añadir propiedades, tokens ni secretos manuales.
- Las pruebas GET de salud no demuestran login, RBAC, escrituras, concurrencia, revocación ni acceso real a Drive/YouTube. Ejecutar los casos correspondientes de `Tareas_Beta.md` con recursos desechables.
- La guía no autoriza despliegues productivos, cambios de permisos, limpieza de propiedades legacy, eliminación de deployments anteriores ni operaciones destructivas.
- La rama base protegida `GPSpedia2.2.5` no se modifica mediante este procedimiento.