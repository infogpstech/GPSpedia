# Migración de URLs de servicios al frontend — GPSpedia

Fecha de registro: 2026-11-24  
Repositorio: `infogpstech/GPSpedia`  
Rama autorizada: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5` — no modificar.  
Estado global: **EN PROGRESO**  
Alcance exclusivo: tareas MIG-URL-001 a MIG-URL-008 de este documento.

## Objetivo y decisión arquitectónica

Retirar la administración, publicación, distribución y descubrimiento remoto de URLs de los seis servicios backend desde Google Spreadsheet/AUTH. Las seis URLs operativas se mantendrán manualmente en el frontend, en el objeto `API_ENDPOINTS` de `JS/Frontend/api-config.js`, usando el mismo mecanismo que la rama protegida `GPSpedia2.2.5`.

La edición se realiza directamente sobre la entrada del servicio dentro de `API_ENDPOINTS`; `ACTION_TO_SERVICE_MAP` continúa asociando cada acción con su servicio y el enrutador utiliza `API_ENDPOINTS[service]`. El cambio se incorpora mediante la actualización/publicación habitual del frontend. No se crea un administrador alternativo, tabla paralela, bootstrap remoto ni caché de endpoints.

Servicios contemplados: AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN. Se adapta el patrón protegido a estos seis servicios y a los contratos/capacidades actuales; no se restauran servicios LEGACY o USERS retirados ni se revierte el resto del código a la versión antigua.

## Límites obligatorios

- Trabajar exclusivamente en `GPSpedia2.2.5_work`; no modificar ni fusionar en `GPSpedia2.2.5`.
- Ejecutar una sola tarea MIG-URL a la vez y respetar el orden/dependencias de este registro.
- **No iniciar, retomar ni incorporar ninguna tarea ajena a MIG-URL-001..008 mientras este plan no esté cerrado.** Los hallazgos ajenos se anotan sin ejecutar, salvo un riesgo crítico de seguridad/integridad que impida continuar.
- No modificar deployments, endpoints reales, propiedades Apps Script, permisos, Spreadsheet, Drive, OAuth ni datos externos. Las validaciones remotas quedan para Beta aislada con autorización expresa.
- No eliminar funciones, acciones, contratos, controles de salud ni capacidades Developer. Retirar exclusivamente la gestión central de endpoints tras comprobar consumidores.
- Mantener autenticación, sesión, RBAC y autorización backend. El frontend solo resuelve direcciones y coordina flujos funcionales.
- No introducir secretos compartidos/manuales, URLs de otros servicios en Apps Script ni orquestación funcional backend→backend.
- No borrar hojas, registros, proyectos ni datos hasta completar inventario de consumidores, matriz de paridad y autorización correspondiente.
- Al cerrar cada tarea: pruebas locales pertinentes, revisión de diff, actualización de `Tareas_Activas.md`, `checkpoint.md` y `ChangesLogs.txt`; registrar validaciones Beta no ejecutadas sin simularlas.

## Tareas registradas y dependencias

### MIG-URL-001 — Alinear normativa y registrar el plan
**Estado: COMPLETADA — 2026-11-24.**  
Se actualizó `NORMAS_DESAROLLO.md` §§17.1 y 18 para establecer el patrón de la rama protegida: objeto único `API_ENDPOINTS` en `JS/Frontend/api-config.js`, edición manual por servicio y enrutamiento mediante `ACTION_TO_SERVICE_MAP`. Se registró este plan, sus ocho tareas y la regla de exclusividad en `Tareas_Activas.md`, `checkpoint.md` y `ChangesLogs.txt`.  
**Criterio de cierre:** regla normativa coherente, plan y secuencia registrados; cumplido.

### MIG-URL-002 — Inventariar y verificar las seis URLs vigentes
**Estado: COMPLETADA — 2026-11-24.**  
**Dependencia:** MIG-URL-001.  
**Alcance:** localizar la revisión central activa, recuperar las seis direcciones y contrastarlas con el registro de deployments/fuentes y sus identidades de salud. Documentar servicio, URL, fuente de evidencia, estado de verificación y cualquier discrepancia. No inventar ni cambiar URLs.  
**Estado de avance:** el propietario proporcionó directamente las seis URLs vigentes el 2026-11-24. Se registraron sin alteración en `API_ENDPOINTS`; las seis usan HTTPS, siguen el formato Web App de Apps Script y tienen IDs de deployment distintos. El inventario conserva la procedencia explícita (confirmación directa del propietario). No se usaron las URLs históricas de la rama protegida como fuente. La comprobación de identidad de salud y disponibilidad remota queda diferida a MIG-URL-008, en Beta aislada autorizada.
**Criterio de cierre:** seis valores recibidos directamente del propietario, trazados y validados estructuralmente; cumplido. No se afirma que los deployments hayan sido consultados ni que su identidad remota esté verificada.

### MIG-URL-003 — Implementar configuración local y resolución de endpoints
**Estado: COMPLETADA — 2026-11-25.**  
**Dependencia:** MIG-URL-002.  
**Alcance:** establecer en `JS/Frontend/api-config.js` el objeto único `API_ENDPOINTS` con las seis URLs verificadas; adaptar la resolución de acciones conservando `ACTION_TO_SERVICE_MAP`, contratos, métodos, parámetros, manejo de errores, timeout y cancelación. Validar URLs al iniciar/resolver, con fallo explícito y controlado ante configuración ausente o inválida; no fallback remoto.  
**Implementación:** `API_ENDPOINTS` contiene únicamente AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN con los seis valores confirmados por el propietario. El router y el health scan resuelven el endpoint local; el bootstrap remoto no interviene en el enrutamiento. `ACTION_TO_SERVICE_MAP` conserva las 125 acciones.
**Evidencia:** `LocalApiEndpoints.mjs` 10/10 PASS; `ServiceHealthContract.mjs` 19/19 PASS; `MIG009FrontendActionRouter.mjs` 5/5 PASS; regresión CI run `45515563540`: 518 suites, 6,170 pruebas aprobadas, 0 fallos. Se corrigieron contratos heredados para comprobar la nueva resolución local, sin eliminar comprobaciones de handlers ni cobertura funcional. La caché/consulta de configuración central se mantiene temporalmente solo para parámetros no relacionados con URLs (por ejemplo, `rich_text_mode`); su separación y retiro de toda gestión de URLs corresponde a MIG-URL-004.
**Criterio de cierre:** cada acción mapeada resuelve el servicio local correcto; no hay fallback remoto ni consulta central para obtener URLs; las pruebas locales y regresión quedaron aprobadas.

### MIG-URL-004 — Retirar el sistema central de configuración de endpoints
**Estado: EN PROGRESO — 2026-11-25.**  
**Dependencia:** MIG-URL-003.  
**Alcance:** inventariar consumidores y retirar únicamente las rutas/funciones/lectores/escritores/cache/bootstrap de URLs centrales que hayan quedado sin uso. Revisar frontend, Apps Script y pruebas. Mantener cualquier configuración central no relacionada con URLs de servicios. No borrar acciones/archivos con consumidores vigentes.  
**Criterio de cierre:** cero consumidores activos del registro central de URLs, bootstrap, publicación o actualización; no se retira funcionalidad ajena.

### MIG-URL-005 — Adaptar panel Developer y diagnóstico de salud
**Estado: PENDIENTE.**  
**Dependencia:** MIG-URL-003; MIG-URL-004 cuando retire el contrato de publicación.  
**Alcance:** retirar interfaz, handlers y mensajes para editar/publicar URLs; conservar escaneo de salud, latencia, estado individual, errores y demás herramientas Developer. El escaneo debe consultar directamente las URLs locales.  
**Criterio de cierre:** no existe edición/publicación de endpoints desde la plataforma; diagnóstico de los seis servicios sigue disponible y probado.

### MIG-URL-006 — Desvincular estructuras de endpoints en Spreadsheet
**Estado: PENDIENTE.**  
**Dependencia:** MIG-URL-004 y MIG-URL-005.  
**Alcance:** localizar hojas, encabezados, revisiones, historial y escrituras dedicadas a URLs; confirmar que no quedan consumidores ni procesos operativos. Retirar solo código consumidor/documentación obsoleta. No eliminar físicamente hojas, registros o datos sin autorización expresa y evidencia de paridad.  
**Criterio de cierre:** la plataforma no lee ni escribe URLs en Spreadsheet; cualquier dato histórico se conserva hasta autorización de purga.

### MIG-URL-007 — Pruebas locales, contratos y regresión
**Estado: PENDIENTE.**  
**Dependencia:** MIG-URL-003..006.  
**Alcance:** pruebas de resolución de seis URLs, cobertura del mapa de acciones, ausencia de bootstrap/consultas centrales/fallback, escaneo de salud, errores de configuración, login, catálogo, operaciones multi-servicio, Developer y suites de regresión pertinentes. Inspeccionar seguridad, contratos y diff.  
**Criterio de cierre:** pruebas locales pertinentes aprobadas y cobertura de regresión sin pérdida de funciones. Las pruebas que requieran servicios desplegados quedan explícitamente diferidas a Beta.

### MIG-URL-008 — Validación Beta aislada y cierre del plan
**Estado: PENDIENTE.**  
**Dependencia:** MIG-URL-007 y autorización/recursos Beta.  
**Alcance:** preparar y ejecutar, solo con autorización expresa, pruebas de login, catálogo, operaciones de escritura, FEEDBACK/Inbox, administración, salud/latencia de los seis servicios y comportamiento ante indisponibilidad individual. Verificar ausencia de consultas centrales de endpoints.  
**Criterio de cierre:** evidencia real de Beta aislada o pasos no disponibles claramente marcados como no ejecutados/diferidos conforme a normativa; ninguna afirmación de prueba remota sin evidencia. Cierre del plan y levantamiento de la exclusividad solo al completar las tareas registradas.

## Matriz de alcance por actividad

| Área | Acción permitida dentro del plan |
|---|---|
| Normativa/documentación | Alinear requisitos y mantener este plan/registros |
| Frontend | URLs locales en `API_ENDPOINTS`, enrutamiento, Developer y diagnóstico |
| Apps Script | Retirar lectores/publicadores de URLs sin consumidores; preservar el resto |
| Spreadsheet | Desvincular lectura/escritura de URLs; preservar hojas/datos históricos |
| Seguridad | Conservar sesión, RBAC y autorización por servicio; cero secretos frontend |
| Pruebas | Locales reproducibles; Beta solo con autorización y recursos aislados |

## Estado y continuidad

MIG-URL-001, MIG-URL-002 y MIG-URL-003 están cerradas. MIG-URL-004 es la única tarea activa. La comprobación de identidad/health de deployments queda diferida a MIG-URL-008; no ejecutar llamadas remotas antes de Beta aislada autorizada. El orden obligatorio es MIG-URL-001 → MIG-URL-002 → MIG-URL-003 → MIG-URL-004 → MIG-URL-005 → MIG-URL-006 → MIG-URL-007 → MIG-URL-008, respetando dependencias explícitas. No adelantar eliminaciones que dependan de una configuración local probada. El checkpoint vigente determina el punto exacto de continuidad.
