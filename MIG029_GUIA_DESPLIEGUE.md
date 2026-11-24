# MIG-029 — Guía de despliegue simplificada

**Estado:** COMPLETADA CON VALIDACIÓN DIFERIDA (despliegue y rollback Beta)  
**Rama:** `GPSpedia2.2.5_work`  
**Guía operativa:** [Services/DEPLOYMENT_GUIDE.md](Services/DEPLOYMENT_GUIDE.md)

## Resultado

La guía nueva sustituye el procedimiento archivado y describe los seis proyectos Apps Script activos:

| Servicio | Fuentes del proyecto |
|---|---|
| AUTH | Auth.js, SharedSessionActor.js, CentralConfigurationReader.js |
| CATALOG | catalog.js |
| WRITE | write.js, SharedSessionActor.js, CentralConfigurationReader.js |
| FEEDBACK | feedback.js, InboxConversations.js, SharedSessionActor.js, CentralConfigurationReader.js |
| UTILITIES | Utilities.js, SharedSessionActor.js |
| ADMIN | admin.js, SharedSessionActor.js, CentralConfigurationReader.js |

USERS y COORDINATOR no son deployments activos. Las guías heredadas en `Olds/Documentacion_Legacy/Services/` permanecen intactas, marcadas como históricas y no ejecutables.

## Procedimiento documentado

1. Confirmar rama, SHA, árbol limpio, pruebas y entorno autorizado.
2. Actualizar solo los archivos modificados del proyecto Apps Script afectado.
3. Crear versión nueva y editar el deployment Web App existente para conservar su URL y permisos aprobados.
4. Crear deployment nuevo solo cuando sea realmente necesario.
5. Si la URL cambia, publicar una revisión completa en la hoja central `Servicios`, registrar el cambio en `ConfiguracionHistorial`, validar el candidato y conmutar `ConfiguracionControl.active_revision` de forma controlada.
6. Ejecutar health GET de solo lectura y las pruebas Beta aplicables.
7. Rollback por versión anterior del mismo deployment o por una nueva revisión central que restaure la URL anterior.

Se deja explícito que el repositorio no contiene una interfaz administrativa genérica para cambiar endpoints; la publicación de URL requiere un operador autorizado de la configuración central. No se inventa una acción ni un flujo automatizado inexistente.

## Independencia de servicios

Cada backend es un proyecto Apps Script separado. Actualizar código en el deployment existente de un servicio no requiere redesplegar los demás. Si solo cambia la URL, la actualización se publica en el registro central y los clientes la consumen al refrescar la caché; no hace falta redesplegar el frontend.

## Cumplimiento de NORMAS_DESAROLLO.md §18

La guía no pide agregar propiedades de proyecto, URLs de otros servicios en Apps Script, claves, tokens o secretos compartidos/manuales. Mantiene el frontend como router y la configuración central como fuente operativa; no introduce fallback local. El registro central se publica por revisión íntegra, con historial y rollback no destructivo.

## Validación y límites

Se añadió `JS/Tests/MIG029DeploymentGuideContract.mjs` (7 verificaciones) y se conectó al runner general. La validación CI final se registra al cierre.

No se desplegaron proyectos Apps Script, no se cambiaron permisos ni propiedades, y no se modificaron Spreadsheet, Drive o datos productivos. La ejecución real del procedimiento, la publicación de URL, la lectura central desde Web App y el rollback quedan pendientes de Beta aislada; no bloquean el cierre documental local.
