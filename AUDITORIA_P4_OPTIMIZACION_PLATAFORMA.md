# Auditoría P4 — optimización transversal de la plataforma

**Fecha:** 2026-11-17  
**Rama:** GPSpedia2.2.5_work  
**Alcance:** llamadas duplicadas/en cascada, cargas secuenciales independientes, locks y consultas repetidas que puedan retrasar módulos no relacionados.  
**Estado:** auditoría inicial completada; P4.1 en preparación.

## Criterios de preservación

- Mantener RBAC, identidad/autor, fecha del servidor, idempotencia y consistencia de datos.
- No añadir verificaciones de sesión por acción ni nuevas llamadas de Coordinator a operaciones ordinarias.
- Mantener monitoreo de salud, telemetría best-effort y dashboard de actividad.
- No retirar cachés válidas ni sustituir cursores incrementales por descargas completas.
- No desplegar Apps Script, modificar ScriptProperties ni alterar hojas/Drive productivos.

## Hallazgos

### P4.1 — Arranque: catálogo y PyS se solicitan en cascada

Evidencia en JS/Frontend/auth.js:

- loadInitialData obtiene primero el cursor inicial mediante getCatalogFeedHead_ (GET a FEEDBACK).
- Después solicita la instantánea completa mediante fetchCatalogData (POST a CATALOG).
- Tras procesar el catálogo, solicita PyS mediante loadPysData({refresh:true}) (POST a FEEDBACK).
- En un primer arranque sin caché, las tres lecturas son independientes en cuanto a servicio/datos, pero el código actual las encadena. PyS mantiene su propia caché, estado, cursor y listeners en JS/Frontend/pys-data.js; no necesita esperar a que la instantánea del catálogo esté procesada.
- El fallo de PyS sin caché puede propagarse al catch general de loadInitialData y marcar como stale un catálogo que ya fue descargado y procesado correctamente. Además, setPysDataCursor se ejecuta después de la carga incluso cuando loadPysData puede devolver una caché obsoleta tras un error de red; se debe comprobar freshness antes de alinear el cursor.

**Corrección propuesta:** iniciar la lectura de PyS en paralelo con el cursor y la instantánea cuando se requiere un snapshot completo; aislar su error en el estado propio de PyS; solo alinear su cursor si la carga terminó con datos frescos. Conservar la ruta incremental y la aplicación de eventos PyS.

### P4.2 — Inbox: el compositor espera una lista que no necesita

Evidencia en JS/Frontend/ui.js:

- openInboxNewConversationForm_ cambia a la sección General cuando el usuario viene de la vista de solicitudes mediante await setInboxSection_("general").
- setInboxSection_ llama a setInboxView_, que espera loadInboxConversations_ y su solicitud remota cuando la caché no está fresca.
- Solo después de esa lectura se solicita getInboxRecipients, que es el único dato remoto indispensable para construir el formulario de nuevo mensaje.
- La lista de conversaciones y los destinatarios son independientes. El compositor no debe esperar la lectura de conversaciones.

**Corrección propuesta:** permitir cambiar el estado visual a General/Conversaciones y renderizar una página cacheada sin esperar una lectura remota; cargar destinatarios de inmediato y dejar la actualización de la lista en segundo plano. Mantener filtros, cursores, permisos y borradores.

### P4.3 — ADMIN: auditoría y organización Drive mantienen locks globales durante operaciones externas

Evidencia en JS/Services/admin.js:

- handleAuditDriveImagesInCortes espera hasta 30 s por ScriptLock y mantiene el lock durante la captura/lectura de referencias, navegación Drive y persistencia de resultados. Cada lote tiene presupuesto de recorrido de 18 s, además del trabajo previo/posterior.
- handleOrganizeUnusedImagesBatch espera hasta 30 s y mantiene el ScriptLock durante el procesamiento de hasta 20 archivos, lecturas/verificaciones Spreadsheet, comprobaciones de referencias, movimientos Drive, verificación de ubicación y posibles reversiones.
- handleSaveUnusedImagesInventory también adquiere el lock global para validar y persistir el inventario; se debe revisar el tramo exacto antes de modificarlo.
- Estas herramientas son operaciones de mantenimiento del Desarrollador y quedaron expresamente fuera de P2. No se deben mezclar con los aportes ordinarios ya optimizados.

**Corrección propuesta:** analizar una reserva breve/claim por lote y secciones críticas pequeñas para estado/ledger, sin mantener el lock global durante Drive. Preservar verificación final de referencias activas, confirmación de movimiento y rollback; no debilitar barreras de integridad para ganar velocidad.

### Rutas que ya conservan el comportamiento eficiente

- loadInitialData lee IndexedDB y CacheStorage en paralelo y muestra primero una instantánea local completa.
- Las escrituras de caché IndexedDB y CacheStorage ya se ejecutan en paralelo y tienen errores localizados.
- El dashboard obtiene logs, aportes e indicadores desde una sola respuesta getActivityLogs.
- El diagnóstico de salud consulta los siete servicios en paralelo; el monitoreo permanece de solo lectura.
- El escaneo de servicios y el ping de Coordinator del panel Developer ya se esperan con Promise.allSettled.
- El feed incremental mantiene cursores, páginas acotadas y reintentos limitados. No reemplazarlo por snapshot completo sin reset/inconsistencia.

## Orden de trabajo P4

1. P4.1: paralelizar la lectura independiente de PyS durante el snapshot inicial y aislar fallos de PyS; probar orden, deduplicación de solicitudes, freshness/cursor y preservación del catálogo.
2. P4.2: evitar que el compositor de Inbox espere la lista de conversaciones al abrirse desde Solicitudes; probar caché, destinatarios, borradores y permisos.
3. P4.3: auditoría detallada de locks/consultas Drive en ADMIN y diseño de lotes con secciones críticas breves; implementar solo después de demostrar idempotencia y seguridad frente a cambios concurrentes.
4. Ejecutar regresión integral y pruebas de telemetría/actividad tras cada cambio relevante.

## Límites

- Auditoría estática de fuentes y contratos. No se ejecutaron servicios Apps Script, Spreadsheet ni Drive.
- No se midieron latencias reales ni se atribuyen ahorros numéricos.
- Las validaciones de OAuth, concurrencia multiusuario y deployments quedan para Beta.
