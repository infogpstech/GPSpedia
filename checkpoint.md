# Checkpoint — Inbox y Developer

Fecha: 2026-11-13  
Repositorio: `infogpstech/GPSpedia`  
Rama de trabajo: `GPSpedia2.2.5_work`  
Rama base: `GPSpedia2.2.5`  
HEAD verificado antes de este checkpoint: `cf2a3d47de066b89dcc926001d264dc9e70be555`

## Estado

**COMPLETADA CON VALIDACIÓN DIFERIDA**

## Resultado implementado

- `JS/Frontend/ui.js`: la autorización de apertura de vistas privilegiadas reutiliza la validación reciente de sesión y comparte solicitudes concurrentes de la misma sesión. Solo abre la vista cuando AUTH confirma `true`; `null` o error mantienen el acceso protegido cerrado sin ejecutar logout.
- `JS/Frontend/ui.js`: `setupModal` utiliza el callback de cierre específico cuando no existe una entrada administrada. Inbox limpia sincronización, clase del documento y foco al cerrarse por navegación Atrás; Developer actualiza `aria-hidden` y restaura el foco.
- `style.css`: navegación de Developer móvil con etiquetas visibles y distribución adaptable; Inbox con encabezado, acciones, pestañas, carpetas y búsqueda mejor organizados. Se conserva el sistema visual de GPSpedia.
- `JS/Tests/OverlayMenuModalHistory.js`: cobertura adicional de validación de sesión, cierre de overlays y etiquetas móviles.
- `ChangesLogs.txt`: registro de cambios y validaciones.

## Validación local realizada

- Compilación sintáctica V8 de los bloques modificados: PASS.
- Escenarios aislados de pila de overlays: 4/4 PASS.
- Validación concurrente compartida de sesión: 1/1 PASS.
- Contratos estáticos de apertura, cierre y estilos responsive: 10/10 PASS.

## Validación diferida a Beta

- Ejecución del runner completo mediante Node CLI.
- Apertura real desde el menú en navegador Android y escritorio.
- Cierre mediante botón Atrás, botón X y backdrop en dispositivos reales.
- Revisión visual en distintos anchos y alturas de pantalla, en temas claro y oscuro.
- Comportamiento con conexión lenta/intermitente y sesión revocada confirmada.

La corrección de recuperación de sesión modificó `JS/Frontend/auth.js`, `JS/Frontend/api-config.js` y `Services/Auth.js`. No se alteró la política de expiración/revocación ni se debilitó la autorización backend. La rama base no se modificó.

## Continuidad

La siguiente acción es validar en Beta la interacción real de Inbox y Developer, especialmente el primer clic desde el menú lateral y la navegación móvil. Si aparece un defecto reproducible, corregir únicamente el bloque afectado y repetir sus pruebas.

 
## Corrección adicional — restauración de sesión al actualizar

**Estado: IMPLEMENTADA EN RAMA DE TRABAJO; DESPLIEGUE AUTH Y BETA PENDIENTES**

### Causa identificada
- `checkSession()` forzaba una consulta remota en cada recarga y, ante timeout/respuesta no concluyente, mostraba el login aunque el token siguiera almacenado.
- El handler de AUTH convertía excepciones internas en `valid:false`, confundiendo fallas de infraestructura con revocaciones reales.
- `touchSession` aplicaba la misma clasificación destructiva a errores temporales.

### Cambios
- `JS/Frontend/auth.js`: reutiliza una validación reciente; ante timeout, desconexión o resultado no concluyente restaura la sesión local y mantiene el bloqueo de términos mediante `showApp`. Solo cierra sesión por expiración local o revocación remota confirmada.
- `JS/Frontend/auth.js`: compatibilidad con respuestas antiguas `valid:false` que incluyen error de infraestructura y motivos `missing_sheet` / `role_revocation_pending`.
- `JS/Frontend/api-config.js`: `touchSession` diferencia sesión revocada de AUTH temporalmente no disponible. Las operaciones protegidas siguen bloqueadas hasta confirmar sesión.
- `Services/Auth.js`: errores internos, hojas faltantes y errores al procesar una revocación pendiente devuelven `valid:null` / `unavailable`; token ausente, sesión inexistente, expirada o revocada mantiene `valid:false`.
- `JS/Tests/SessionRestoreOnValidationFailure.mjs`: 14 pruebas de regresión.

### Validación
- Escenarios aislados ejecutados en V8: 17/17 PASS.
- Sintaxis de bloques frontend y handlers AUTH: PASS.
- Sintaxis del nuevo archivo de pruebas: PASS.
- Node CLI no ejecutado en este entorno; el archivo .mjs debe ejecutarse en el runner del repositorio.
- No se modificó `service-worker.js`: no se encontró una eliminación de `gpsepedia_session` desde el Service Worker.

### Pendientes de despliegue y verificación
1. Desplegar `Services/Auth.js` en el proyecto de Google Apps Script que corresponde al endpoint AUTH configurado en `JS/Frontend/api-config.js`. El commit de GitHub no publica automáticamente el servicio.
2. Ejecutar `JS/Tests/SessionRestoreOnValidationFailure.mjs` con Node CLI.
3. Probar actualización normal y pull-to-refresh en Android y escritorio, con conexión rápida, lenta y temporalmente interrumpida.
4. Confirmar que una sesión realmente revocada o expirada sigue enviando al login y que la aceptación de términos de una versión nueva continúa bloqueando el catálogo.

La rama base `GPSpedia2.2.5` permanece intacta.
