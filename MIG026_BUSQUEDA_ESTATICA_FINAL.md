# MIG-026 — Búsqueda estática global de configuración, URLs y secretos

**Fecha:** 2026-11-24  
**Repositorio:** infogpstech/GPSpedia  
**Rama:** GPSpedia2.2.5_work  
**Corte inicial de búsqueda:** d203a1dedce1fdcc382bed3c55ad280200f66a7d  
**Estado:** auditoría local y CI completadas; validación Beta de la configuración instalada pendiente.

## Alcance

Se inspeccionaron los nueve servicios Apps Script de `JS/Services`, los 39 módulos de `JS/Frontend`, los tres documentos HTML activos (index, add_cortes y users), `manifest.json`, `service-worker.js`, los tres workflows de `.github/workflows` y los 49 documentos Markdown/TXT/YAML activos del inventario. Se excluyeron `Olds/` y los archivos de pruebas como fuentes de ejecución; las suites se revisan por separado.

La búsqueda cubrió, entre otros, `PropertiesService`, `ScriptProperties`, `UrlFetchApp.fetch`, URLs de Web Apps, `*_SERVICE_URL`, `SPREADSHEET_ID`, `FOLDER_ID`, claves API, secretos compartidos, Coordinator y SharedMutation.

## Resultados del código activo

### 1. URLs de otros servicios y secretos compartidos

- **0** URLs de deployments GPSpedia en los nueve servicios Apps Script.
- **0** constantes locales `AUTH_SERVICE_URL`, `CATALOG_SERVICE_URL`, `WRITE_SERVICE_URL`, `FEEDBACK_SERVICE_URL`, `UTILITIES_SERVICE_URL` o `ADMIN_SERVICE_URL`.
- **0** referencias operativas a `GPSpedia_COORDINATOR_URL`, `GPSpedia_COORDINATOR_SECRET` o `GPSpedia_CATALOG_TRAFFIC_SECRET`.
- No se encontraron llamadas `UrlFetchApp.fetch` dirigidas a una URL `script.google.com/macros/s` desde los servicios.
- Las llamadas `UrlFetchApp` restantes corresponden a integraciones externas (Drive API v3, YouTube Data API y descarga/validación de imágenes), no a interconexión entre servicios GPSpedia.

### 2. Único bootstrap permitido

La única URL estática de Apps Script está en `JS/Frontend/api-config.js`, en `CENTRAL_CONFIGURATION_BOOTSTRAP_URL`, y se limita a obtener `getPublicConfiguration` desde AUTH. MIG-009 documenta esta excepción: el registro central necesita un localizador inicial para encontrarse a sí mismo. No se utiliza para acciones ordinarias ni como fallback de otros servicios.

El router obtiene el resto de endpoints mediante `resolveCentralServiceEndpoint`. El registro operativo y la telemetría local contienen seis servicios: AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN. USERS y COORDINATOR están marcados como claves retiradas en `CentralConfigurationReader.js`.

### 3. IDs locales de Spreadsheet — pendiente MIG-006/Beta

La única configuración de recurso local identificada en servicios permanece en:

- `JS/Services/Auth.js`
- `JS/Services/catalog.js`
- `JS/Services/Utilities.js`

Los tres declaran `SPREADSHEET_ID` y utilizan `SpreadsheetApp.openById()`. No se sustituyó por `getActiveSpreadsheet()`: MIG-006 documenta que el contexto Web App real puede devolver null y exige una prueba Beta por deployment/identidad antes de retirar el ID. Es un localizador de recurso, no un secreto; sigue siendo una configuración local pendiente del objetivo centralizado.

### 4. PropertiesService — solo importación legacy

Se localizaron nueve puntos de consulta en código activo:

| Servicio | Función | Uso |
|---|---|---|
| AUTH | `ensureLoginRequestsSheet_` | Importación inicial a LoginRequests |
| AUTH | `migrateLegacyRoleRevocationMarkersToSharedStateUnderLock_` | Importación inicial de marcadores de revocación |
| ADMIN | `ensureAdminAuditBaseline_` | Baseline de AdminOperationAudit |
| ADMIN | `ensureCortesOrganizerLedgerBaseline_` | Baseline del ledger del organizador |
| ADMIN | `ensureLogoIdReservationBaselineUnderLock_` | Baseline de LogoIdReservations |
| ADMIN | `withAdminLocalOperationGuard_` | Proveedor lazy; solo lo consume el baseline de AdminOperationGuards si falta |
| ADMIN | `ensureDriveAuditStateBaseline_` | Baseline de DriveAuditRuns |
| ADMIN | `ensureDriveAuditLatestBaseline_` | Baseline de DriveAuditLatest |
| WRITE | `ensureCortesIdReservationBaseline_` | Baseline del ledger de IDs de Cortes |

No se encontraron llamadas `.setProperty()` ni `.deleteProperty()` en los servicios activos. Los flujos ordinarios usan los ledgers/hojas versionados y dejan de consultar PropertiesService una vez confirmado su baseline. Los valores legacy no se borran desde esta migración.

### 5. SharedMutation y Coordinator

MIG-024 retiró SharedMutation y MIG-025 retiró Coordinator, sus leases, health y agregado global. Los nombres `isSharedMutationAction_` y `withSharedSessionActor_` que aún aparecen son clasificadores/contexto de actor local, no clientes HTTP ni coordinación entre proyectos. Se retiró de WRITE el campo legacy `__sharedMutationToken`; no se utiliza ni acepta en aportes suplementarios.

La telemetría de navegador queda limitada a seis servicios, es efímera y no transmite eventos. El documento histórico de tráfico coordinado se reemplazó por el estado vigente. Las listas Beta antiguas que contenían instrucciones de Coordinator/secretos se marcaron como archivos históricos y se conservaron; `Tareas_Beta.md` es el checklist activo.

## Documentación corregida

- `Catalog_Read_Strategy.md`: diario CATALOG ubicado en CatalogChangeState/CatalogChangeEvents; retirada de SharedMutation/Coordinator.
- `Services/ADMIN_ACTIONS.md`: auditoría y guardas ADMIN documentadas con hojas locales; sin lease compartida.
- `Services/CATALOG_TRAFFIC_DESIGN.md`: sustituido el diseño obsoleto de Coordinator por telemetría local de seis servicios.
- `MIG006_SPREADSHEET_ACCESS_SPIKE.md`: sección de secretos legacy actualizada tras MIG-024/MIG-025.
- `PLAN_NUEVA_ARQUITECTURA_FRONTEND.md`: fases de coordinación y retirada de Coordinator/SharedMutation actualizadas.
- `lista_beta_parte1.txt`, `lista_beta_parte2_parte_001.txt` y `lista_beta_parte2_parte_002.txt`: marcadas como archivos históricos; no eliminadas.

## Pendientes explícitos

1. Ejecutar la prueba real MIG-006 en Apps Script Beta desechable para determinar si AUTH, CATALOG y UTILITIES pueden acceder al contenedor sin `SPREADSHEET_ID`.
2. Revisar en modo de solo lectura las propiedades de los deployments instalados para confirmar que no permanecen secretos/URLs legacy. No registrar valores ni eliminarlos sin autorización.
3. Ejecutar las pruebas Beta de endpoints centrales, permisos, identidad efectiva, concurrencia y paridad funcional.
4. No desplegar ni modificar hojas/propiedades productivas desde esta auditoría.

## Suite de regresión

Se añade `JS/Tests/MIG026StaticConfigSearch.mjs` para mantener como contrato la ausencia de URLs/secretos de interconexión en servicios, el único bootstrap frontend, la lista de seis servicios, los tres IDs Spreadsheet pendientes de MIG-006 y el carácter exclusivamente legacy de las lecturas PropertiesService.


## Resultado de CI

- Suite `MIG026StaticConfigSearch`: 10/10 PASS.
- CI run 45370448353: 499 suites, 5,889 pruebas aprobadas y 0 fallos; sintaxis PASS.
- GitHub Pages run 45370445917: SUCCESS.
- HEAD auditado: 5d297cca14bc00bc1238451c6bd3098cc40983b5. Rama base protegida sin cambios: d9acc68d889985c2e2f42fe3a02e502efc86ead1.


## Adenda — vinculación explícita de recursos — 2026-11-24

La búsqueda estática y el contrato se actualizan para reflejar la decisión expresa del propietario. El estado vigente de la rama contiene dos IDs de recursos autorizados temporalmente; no son credenciales ni endpoints de interconexión.

- Spreadsheet principal: `1_BDp256L6fxmZdyCek9m4A-a_-TjeKJOt3fteXYt3Os`, declarada como `GPSpediaSpreadsheetId_`.
- Carpeta raíz Drive Cortes: `1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2`, declarada como `GPSpediaCortesRootFolderId_`.
- Los seis servicios usan `SpreadsheetApp.openById(GPSpediaSpreadsheetId_)`; WRITE, FEEDBACK y ADMIN resuelven además la carpeta raíz por ID y conservan las validaciones de nombre/jerarquía.
- No se añadieron URLs de otros servicios, claves, tokens, secretos ni propiedades Apps Script. La excepción temporal queda documentada en NORMAS §17.1 y se retira cuando se eliminen los módulos Apps Script del repositorio.
- Contrato MIG026StaticConfigSearch: 10/10 PASS. CI run 45444136611: 514 suites, 6,070 pruebas, 0 fallos; sintaxis PASS.
- Las comprobaciones reales de permisos, identidad de ejecución, lectura/escritura y carpeta Drive quedan pendientes de Beta. No se desplegó ni modificó ningún recurso externo.

Esta adenda prevalece sobre las secciones históricas de este informe que indicaban retirar los IDs y usar `getActiveSpreadsheet()`.


## Adenda 2026-11-24 — localizadores propios por servicio y ledger AUTH

- La inspección posterior detectó que AUTH, WRITE, FEEDBACK y ADMIN dependían de variables de recurso declaradas en `CentralConfigurationReader.js`. Como cada deployment es un proyecto Apps Script independiente, esa dependencia podía dejar variables sin declarar si el helper no se copiaba al proyecto.
- Los seis archivos principales ahora declaran localmente `GPSpediaSpreadsheetId_` y usan `SpreadsheetApp.openById`. WRITE, FEEDBACK y ADMIN declaran también `GPSpediaCortesRootFolderId_`. Los valores se mantienen idénticos a los localizadores autorizados existentes; no son credenciales ni secretos.
- La suite `MIG026StaticConfigSearch.mjs` exige ahora declaraciones locales por servicio y la apertura explícita de Spreadsheet. Resultado CI: 10/10 PASS.
- AUTH sustituye la comparación JSON estricta del read-back de LoginRequests por una comparación tipada que normaliza fechas Date/ISO y equivalencias numéricas, sin relajar la igualdad de requestId, token, estado ni otros campos textuales. `LoginRequestLedger.mjs`: 40/40 PASS.
- Regresión CI run `45466314443`: SUCCESS; 515 suites, 6,092 pruebas aprobadas, 0 fallos; sintaxis PASS.
- Los deployments y permisos reales siguen pendientes de validación Beta aislada. No se alteraron recursos productivos ni propiedades Apps Script.
