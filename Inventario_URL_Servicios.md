# Inventario y verificación de URLs de servicios — MIG-URL-002

Fecha de revisión: 2026-11-24  
Repositorio: `infogpstech/GPSpedia`  
Rama revisada: `GPSpedia2.2.5_work`  
Estado: **EN PROGRESO — valores operativos no verificables con las fuentes disponibles**  
Tarea rectora: `MIG-URL-002`.

## Resultado ejecutivo

Se identificó el mecanismo que actualmente mantiene las URLs activas: AUTH lee la revisión central de Google Spreadsheet, hoja `Servicios`, columna `endpoint_url`, filtrada por `ConfiguracionControl.active_revision` y estado `READY`. La guía de despliegue confirma que la revisión activa es la fuente que utiliza el frontend.

Sin embargo, el contenido real de esa Spreadsheet no está versionado en Git y no se pudo consultar desde esta sesión. El conector Google Drive/Sheets no está disponible para esta cuenta/sesión (la búsqueda del plugin lo devuelve como `DISABLED_BY_ADMIN` / `NOT_AVAILABLE`). Por ello, no hay evidencia suficiente para declarar ninguna de las seis direcciones como deployment vigente. No se deben copiar a la configuración nueva URLs históricas de la rama protegida sin verificar que siguen activas y corresponden a la identidad de salud correcta.

## Fuentes inspeccionadas

| Fuente | Evidencia | Resultado |
|---|---|---|
| `JS/Frontend/api-config.js` | SHA `0c521c2726ef3961d70cd111d6022d79553bdcbc` | Contiene el bootstrap AUTH y consumidores de la configuración central; no contiene las seis URLs operativas. |
| `JS/Services/Auth.js` | SHA `b6d3cc91ee772a151b8cee9a9bf8f8b3758c5a30` | Define seis claves y el esquema de publicación/lectura de endpoints en Spreadsheet; no contiene valores operativos de deployments. |
| `JS/Services/CentralConfigurationReader.js` | SHA `d7e77e60b41c6d8bde924281e9ba31780b9f9086` | Lee `ConfiguracionControl.active_revision` y `Servicios.endpoint_url`; valida seis servicios y su unicidad. |
| `Services/DEPLOYMENT_GUIDE.md` | SHA `26ad298f019ac96f3dc5cd0b9f9f551f1f5591c9` | Confirma el flujo de configuración central y el procedimiento de actualización; no registra las URLs concretas. |
| `GPSpedia2.2.5:api-config.js` | SHA `f70f4703945caf225fd2e5952f479950e4297f36` | Contiene URLs estáticas históricas para AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN, pero también rutas LEGACY/USERS y un mapa de acciones antiguo. No demuestra que los seis deployments sigan vigentes. |
| Google Spreadsheet central | Requerida para leer la revisión activa | No accesible desde las herramientas disponibles en esta sesión; el conector Google Drive/Sheets está deshabilitado por administración. |

## Inventario por servicio

| Servicio | Clave en revisión activa | URL operativa actual | Identidad de salud esperada | Estado |
|---|---|---|---|---|
| AUTH | AUTH | No recuperada | `GPSpedia-Auth` | PENDIENTE: leer revisión activa y verificar deployment |
| CATALOG | CATALOG | No recuperada | `GPSpedia-Catalog` | PENDIENTE: leer revisión activa y verificar deployment |
| WRITE | WRITE | No recuperada | `GPSpedia-Write` | PENDIENTE: leer revisión activa y verificar deployment |
| FEEDBACK | FEEDBACK | No recuperada | `GPSpedia-Feedback` | PENDIENTE: leer revisión activa y verificar deployment |
| UTILITIES | UTILITIES | No recuperada | `GPSpedia-Utilities` | PENDIENTE: leer revisión activa y verificar deployment |
| ADMIN | ADMIN | No recuperada | `GPSpedia-Admin` | PENDIENTE: leer revisión activa y verificar deployment |

## Localizador bootstrap (no confundir con la URL operativa de AUTH)

`JS/Frontend/api-config.js` contiene `CENTRAL_CONFIGURATION_BOOTSTRAP_URL`, usado para solicitar la configuración central a AUTH. Ese valor solo permite llegar al mecanismo de arranque; no sustituye ni acredita el endpoint operativo de AUTH que aparece en la revisión central. La migración posterior debe resolver esta diferencia explícitamente y evitar un ciclo de arranque.

## Criterios que faltan para cerrar MIG-URL-002

1. Obtener un snapshot de solo lectura de la revisión activa: `ConfiguracionControl.active_revision`, `publication_state`, y las seis filas de `Servicios` correspondientes a esa revisión.
2. Registrar cada URL exacta y su procedencia, sin copiar filas borrador con `config_revision` vacío ni revisiones históricas.
3. Contrastar cada URL con su deployment autorizado y la respuesta `?debug=true`, confirmando la identidad `GPSpedia-*` correspondiente. No ejecutar el workflow remoto si no se ha confirmado que el bootstrap apunta a un entorno aislado autorizado.
4. Confirmar que las seis URLs son HTTPS, deployments distintos y que no existe discrepancia entre la revisión activa y el registro privado de despliegues.

## Restricción de seguridad y no regresión

- No se modificaron endpoints, deployments, Apps Script, Spreadsheet, permisos, propiedades ni datos externos.
- No se copiaron URLs históricas de la rama protegida a la configuración activa.
- No se ejecutaron GET remotos ni workflows de salud: la guía advierte que el bootstrap no tiene selector de entorno y podría apuntar a producción.
- La tarea permanece abierta. No iniciar MIG-URL-003 ni ninguna tarea ajena al plan hasta verificar los seis valores y completar los criterios anteriores.

## Dato de entrada requerido para continuar

Se necesita acceso de solo lectura a la hoja central que contiene `ConfiguracionControl` y `Servicios`, o un export/snapshot de esas dos hojas que incluya la revisión activa y las seis filas activas. Los datos pueden compartirse como CSV/XLSX o texto; no se necesitan credenciales, tokens ni permisos de escritura.
