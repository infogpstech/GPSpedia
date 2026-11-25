# Inventario y verificación de URLs de servicios — MIG-URL-002

Fecha de revisión: 2026-11-24  
Repositorio: `infogpstech/GPSpedia`  
Rama revisada: `GPSpedia2.2.5_work`  
Estado: **MIG-URL-002 COMPLETADA; URLs integradas localmente en MIG-URL-003; salud diferida a MIG-URL-008**  
Tarea rectora: `MIG-URL-002`.

## Resultado ejecutivo

El usuario proporcionó directamente las seis URLs que deben quedar como configuración de frontend. Se validó su estructura: todas usan HTTPS, el dominio de Google Apps Script, la ruta `/exec` y seis identificadores de deployment distintos. La procedencia queda registrada como confirmación directa del usuario.

La integración Google Drive/Sheets sigue sin estar disponible, por lo que no se pudo contrastar el snapshot de `ConfiguracionControl.active_revision`. Esta limitación no impide inventariar los seis valores expresamente suministrados para la migración; no se atribuye falsamente su origen a la Spreadsheet. La identidad funcional de cada deployment y su respuesta de salud se verificarán en MIG-URL-008, únicamente en Beta aislada y con autorización.

## Fuentes inspeccionadas

| Fuente | Evidencia | Resultado |
|---|---|---|
| `JS/Frontend/api-config.js` | SHA `875e1f5117a8901352d62d112b583f3feccf0a2f` | Contiene las seis URLs en `API_ENDPOINTS`; el bootstrap separado fue retirado. La lectura de parámetros públicos usa la misma URL local de AUTH. |
| `JS/Services/Auth.js` | SHA `2a0a779a8f8a2cf8ba644218176fa6b9929073c1` | Conserva getPublicConfiguration para parámetros funcionales; ya no administra endpoints ni crea/lee la hoja Servicios. |
| `JS/Services/CentralConfigurationReader.js` | SHA `f8e99730ee7c5a3dec8e37d1f8bd2c1368c72fac` | Lee parámetros funcionales y recursos; no consulta la hoja histórica Servicios ni proyecta URLs. |
| `Services/DEPLOYMENT_GUIDE.md` | SHA `40d071dbf2a139d71a79072f043b0db6057a988c` | Documenta actualización manual en API_ENDPOINTS, ausencia de bootstrap/editor central y health remoto protegido para Beta. |
| `JS/Frontend/centralConfigurationCache.js` | SHA `3f6e77b79fc5a24c3d24559e55dbcae1b582d364` | Caché de parámetros públicos únicamente; no almacena endpoints. |
| `JS/Frontend/ui.js` | SHA `4db0659531b16a1f37510105e664aa68a91763ed` | Sin editor de URLs; conserva herramientas Developer y health scan local. |
| `index.html` | SHA `de6826cb5f5cc7ad936cba5278c5da14eaa56768` | Se retiró la tarjeta de administración de endpoints. |
| `JS/Tests/RemoteServiceHealth.mjs` | SHA `8e01e515d9407e28dbdbe449f975970c58a087d9` | Lee API_ENDPOINTS y exige confirmación de Beta aislada antes de GET. |
| `GPSpedia2.2.5:api-config.js` | SHA `f70f4703945caf225fd2e5952f479950e4297f36` | Contiene URLs estáticas históricas para AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES y ADMIN, pero también rutas LEGACY/USERS y un mapa de acciones antiguo. No demuestra que los seis deployments sigan vigentes. |
| Google Spreadsheet central | Requerida para leer la revisión activa | No accesible desde las herramientas disponibles en esta sesión; el conector Google Drive/Sheets está deshabilitado por administración. |

## Inventario por servicio

| Servicio | URL proporcionada | Validación estructural | Procedencia / verificación funcional |
|---|---|---|---|
| AUTH | `https://script.google.com/macros/s/AKfycby0OcUfWsUmHHXwixDmtClz5E4rBrIBSpttjqdsbqKIdRg8U19kQKm5MH7gN1o627wm8w/exec` | HTTPS + /exec; ID único | Proporcionada directamente por el usuario; identidad del deployment pendiente en Beta |
| CATALOG | `https://script.google.com/macros/s/AKfycbwskd8-pS5CioHU-vw6mkIW6XFA6tBF8CR5968PZ0qrZPf4AGWcVOJU--p8vv8lQIpz/exec` | HTTPS + /exec; ID único | Proporcionada directamente por el usuario; identidad del deployment pendiente en Beta |
| WRITE | `https://script.google.com/macros/s/AKfycbyfXLAUUe-lGlXkDwRopGaXp--QJ4V96txM_5E604oHH5kN1qfV2xJYDsqesfbUHHgJ/exec` | HTTPS + /exec; ID único | Proporcionada directamente por el usuario; identidad del deployment pendiente en Beta |
| FEEDBACK | `https://script.google.com/macros/s/AKfycbwJmb_g4-Hb5iXpLdLwxfBQ44mQ9pHb1JYQ3vAwzafpPXiDDRgSAls2bkqKZ5QhnrYEcA/exec` | HTTPS + /exec; ID único | Proporcionada directamente por el usuario; identidad del deployment pendiente en Beta |
| UTILITIES | `https://script.google.com/macros/s/AKfycbzUc402Sju0_ZU7PQST1Kma-qrgJs2v10Pi6hA62rWZZvsCefD6Mr6PCo5GEDA0dGRk/exec` | HTTPS + /exec; ID único | Proporcionada directamente por el usuario; identidad del deployment pendiente en Beta |
| ADMIN | `https://script.google.com/macros/s/AKfycby779ceEVYBaZ8eAFueon4kDdedYeb1xuApUFjh0IdZ5ZQdy5DfVN3tWXQKE55QZtyb1g/exec` | HTTPS + /exec; ID único | Proporcionada directamente por el usuario; identidad del deployment pendiente en Beta |

**Resultado de validación estructural:** 6/6 URLs válidas en formato; 6/6 IDs distintos; no se realizó ninguna petición HTTP ni se comprobó la identidad del deployment.

## Resolución actual

Las seis URLs operativas se mantienen en el único objeto `API_ENDPOINTS` de `JS/Frontend/api-config.js`. No existe bootstrap adicional: la consulta pública de parámetros funcionales a AUTH usa esa misma URL local. La caché central conserva parámetros como `rich_text_mode`, no servicios ni endpoints.

## Criterios y resultado de MIG-URL-002

1. Recuperar las seis URLs exactas: **COMPLETADO**, suministradas expresamente por el usuario y registradas arriba.
2. Verificar HTTPS, estructura `/exec` e identificadores distintos: **COMPLETADO**.
3. Contrastar la revisión activa de Spreadsheet: **NO DISPONIBLE** por falta de conector de lectura; no se declara que los valores procedan de esa hoja.
4. Confirmar identidad de salud `GPSpedia-*` y funcionamiento real: **DIFERIDO A MIG-URL-008**, sin llamadas remotas hasta disponer de Beta aislada y autorización expresa.

**Cierre de MIG-URL-002:** inventario de valores completado con procedencia trazable al mensaje del usuario. La validación funcional remota queda explícitamente diferida a MIG-URL-008 y no se considera ejecutada.

## Restricción de seguridad y no regresión

- No se modificaron endpoints, deployments, Apps Script, Spreadsheet, permisos, propiedades ni datos externos.
- No se copiaron URLs históricas de la rama protegida a la configuración activa.
- No se ejecutaron GET remotos ni workflows de salud: la guía advierte que el bootstrap no tiene selector de entorno y podría apuntar a producción.
- MIG-URL-002 se cerró con los seis valores proporcionados directamente por el propietario. MIG-URL-003 quedó completada con router y health locales; identidad/disponibilidad remota queda diferida a MIG-URL-008.



## Adenda 2026-11-24 — actualización de endpoints CATALOG y FEEDBACK

El propietario proporcionó expresamente nuevas direcciones para los servicios CATALOG y FEEDBACK. Se actualizaron únicamente esas dos entradas de `API_ENDPOINTS` en `JS/Frontend/api-config.js`; AUTH, WRITE, UTILITIES y ADMIN permanecen sin cambios.

- CATALOG: `https://script.google.com/macros/s/AKfycbzq5ax7tpZOYVcMYtT8LOYjZLaIRPN9__ePAG8SknlkGfMs823CTcPh2TCrR0E90wH1/exec`
- FEEDBACK: `https://script.google.com/macros/s/AKfycbxlVtAhtYvSGvwvjeVZ-kz0X6dtsCz_ITycUkGJ4JTKtW1fLjGpspwmGlXx6kqd2Jd7bg/exec`
- Validación estructural: HTTPS, dominio `script.google.com`, ruta `/exec` e identificadores distintos de los otros cuatro servicios y entre sí.
- La identidad, disponibilidad y funcionamiento de los deployments no se comprobaron mediante HTTP. Permanecen pendientes de MIG-URL-008, únicamente en Beta aislada y con autorización expresa.
- Las direcciones anteriores permanecen arriba como antecedente histórico de MIG-URL-002; esta adenda identifica los valores vigentes posteriores.
