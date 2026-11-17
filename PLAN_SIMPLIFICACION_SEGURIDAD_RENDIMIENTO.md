# Plan de simplificación de seguridad y optimización de rendimiento — GPSpedia

**Fecha:** 2026-11-17  
**Rama:** `GPSpedia2.2.5_work`  
**Estado:** REQUISITO REGISTRADO — PLAN PENDIENTE DE EJECUCIÓN  
**Objetivo:** que las funciones de GPSpedia respondan con la menor latencia posible, eliminando validaciones y coordinaciones redundantes que no aporten valor funcional al alcance de la plataforma.

## 1. Requisito funcional aprobado

La plataforma debe priorizar una experiencia ágil y directa. Los usuarios podrán realizar las operaciones que su rol permite sin que cada servicio solicite autorización a otros servicios, verifique transacciones, adquiera leases o repita consultas de identidad antes de procesar cada acción.

Para un aporte (corte, tutorial, video, imagen u otro registro), el flujo esperado es:
1. El usuario completa el formulario y selecciona los archivos.
2. El sistema recibe la información y los archivos.
3. Registra el contenido, la fecha y el usuario colaborador autenticado.
4. Devuelve el resultado sin pasos intermedios de autorización entre servicios ni validaciones transaccionales añadidas.

La única política de acceso ordinaria es: inicio de sesión con contraseña almacenada mediante el hash actual y permisos determinados por el rol asignado. La comprobación de rol/capacidad debe ser sencilla y no provocar viajes de red adicionales. No se deben cambiar el algoritmo ni los parámetros actuales del hash como parte de esta tarea.

### Excepciones que sí deben conservarse
- Cerrar remotamente una sesión y limpiar/inutilizar la caché asociada a ese usuario.
- Al eliminar una cuenta, invalidar sus sesiones y evitar que vuelva a ingresar.
- Bloquear temporalmente el inicio de sesión después de varios intentos fallidos, evitando reintentos que consuman recursos.
- Mantener las comprobaciones funcionales mínimas necesarias para procesar correctamente los datos (por ejemplo, campos indispensables, límites técnicos de archivo y errores reales de almacenamiento). No introducir controles ceremoniales, validación de transacción ni verificaciones duplicadas.
- No permitir que la interfaz muestre funciones fuera del rol asignado; la matriz de roles existente define las capacidades.

## 2. Alcance de la simplificación

Se deben revisar y retirar, cuando no sean necesarias para las excepciones anteriores:
- Leases y adquisición/liberación de transacciones en Coordinator para operaciones ordinarias.
- Llamadas de red entre servicios para confirmar identidad, rol, legitimidad de una operación o autorización de otra capa.
- Revalidación de sesión, token, epoch o actividad en cada acción.
- Consultas repetidas a Users, ActiveSessions o SESSION_CONTEXTS durante cada aporte.
- Prevalidaciones duplicadas antes y después de subir imágenes, videos y otros archivos.
- Locks globales, esperas, reintentos automáticos y serialización de operaciones independientes.
- Contabilidad/telemetría que añada viajes de red, esperas o escrituras por acción; las métricas no deben degradar el flujo del usuario.

La autorización por rol se resuelve con el rol asociado a la sesión iniciada. No se deben eliminar los permisos funcionales de cada rol ni habilitar capacidades que la matriz no concede. La simplificación elimina la infraestructura transaccional y las verificaciones redundantes, no cambia quién puede usar cada función.

## 3. Plan de ejecución priorizado

### P0 — Inventario y mapa de latencia
**Estado: COMPLETADA (auditoría estática, 2026-11-17).** Informe: `AUDITORIA_P0_LATENCIA_VALIDACIONES.md`.
**Hallazgos confirmados:** dos llamadas Coordinator por lease; revalidación de sesión y posible actualización de actividad por adquisición; rutas ADMIN/WRITE anidadas; locks de hasta 30 s que pueden cubrir cargas Drive. Sin medición de latencia real.
**Objetivo: identificar con evidencia dónde se consume tiempo y qué controles se ejecutan en cada flujo.
- Auditar Coordinator, SharedMutationClient y los helpers de autenticación/autorización de AUTH, USERS, ADMIN, WRITE, FEEDBACK, CATALOG y UTILITIES.
- Inventariar todas las acciones que adquieren leases, llaman a Coordinator, consultan Users/ActiveSessions/SESSION_CONTEXTS, usan locks o realizan reintentos.
- Trazar los flujos de crear/editar cortes, subir imágenes, subir tutoriales/videos, aportes PyS, Inbox y operaciones de lectura.
- Clasificar cada paso como: requisito funcional, permiso por rol, protección de sesión remota expresamente conservada, o control redundante que debe retirarse.
- Registrar latencias actuales solo cuando puedan medirse sin afectar datos ni despliegues; no inventar cifras.

**Criterio de salida:** mapa de llamadas y lista priorizada de validaciones redundantes con archivos, funciones y dependencias identificadas.

### P1 — Simplificar el flujo de aportes y escrituras ordinarias
**Estado: EN PROGRESO — P1.1a implementada; validación pendiente. P1.1b pendiente.**
**Prioridad máxima de implementación.**
- Retirar del flujo normal de WRITE/FEEDBACK las adquisiciones de lease/transaction y viajes de red a Coordinator que solo autentiquen, autoricen o verifiquen la legitimidad de la operación.
- **Avance P1.1a:** `WRITE/checkOperation` consulta el estado directamente, sin lease ni llamada a Coordinator. Prueba de contrato actualizada; ejecución pendiente.
- **Siguiente P1.1b:** mutaciones `addOrUpdateCut` y `addSupplementaryInfo`, incluido el flujo ADMIN heredado y la asignación de ID.
- Evitar que ADMIN actúe como intermediario para registrar una operación ordinaria si puede ejecutarse directamente en el servicio responsable.
- Registrar el aporte con los datos recibidos, fecha del servidor y colaborador de la sesión.
- Mantener el chequeo simple del rol permitido para la acción, sin consultar otro servicio.
- Eliminar esperas, locks globales y reintentos que serialicen operaciones independientes.
- Conservar la escritura de datos y el manejo de errores reales; no sustituirlos por respuestas de éxito ficticias.

**Criterio de salida:** creación y edición de cortes y aportes sin Coordinator/lease ni revalidaciones remotas por acción.

### P2 — Simplificar cargas de imágenes, videos y archivos
- Auditar los flujos de imágenes del catálogo/modal, gestor ADMIN, tutoriales y videos FEEDBACK.
- Eliminar prevalidaciones transaccionales, permisos repetidos entre servicios, estados de lease y consultas de estado que no sean necesarias para completar la carga.
- Reducir las etapas a recepción, almacenamiento y registro del recurso con su autor/fecha.
- Evitar que la carga de un archivo mantenga bloqueadas otras acciones o requiera locks globales.
- Mantener únicamente límites técnicos indispensables para evitar archivos incompatibles con el almacenamiento o fallos de transporte; no añadir análisis o verificaciones de seguridad fuera del requisito.

**Criterio de salida:** cada carga realiza el mínimo de llamadas y escrituras necesario; las operaciones independientes no esperan unas por otras.

### P3 — Conservar únicamente las funciones de sesión expresamente solicitadas
- Mantener el login con el hash actual y la asignación de rol.
- Mantener cierre remoto de sesión y limpieza/invalidez de caché local del usuario.
- Al borrar una cuenta, invalidar las sesiones existentes y rechazar futuros inicios de sesión.
- Mantener bloqueo temporal por varios intentos fallidos, con control ligero y sin añadir verificaciones en cada acción.
- Retirar revalidaciones por acción, consultas redundantes de epoch/actividad y actualización de LastActivityAt que no sea necesaria para las funciones anteriores.
- Asegurar que las respuestas tardías o cachés de una sesión cerrada no restauren el acceso.

**Criterio de salida:** login ágil; logout remoto, eliminación de cuenta y bloqueo temporal comprobables; ninguna validación de sesión por operación ordinaria.

### P4 — Optimización general de la plataforma
- Revisar llamadas duplicadas, fetch en cascada, cargas secuenciales evitables y consultas completas cuando bastan datos locales.
- Mantener cachés útiles y mostrar contenido disponible inmediatamente; sincronizar en segundo plano cuando sea posible.
- Evitar que lecturas, Inbox, navegación, edición y módulos independientes esperen a servicios que no necesitan.
- Reducir escrituras auxiliares, contadores y telemetría que no aporten valor al usuario o al diagnóstico.
- Aplicar carga paralela solo a solicitudes independientes y conservar manejo localizado de errores.

**Criterio de salida:** las funciones habituales no ejecutan pasos de seguridad/transacción innecesarios ni esperan operaciones no relacionadas.

### P5 — Pruebas locales y verificación de aceptación
- Pruebas de contrato que demuestren que las rutas ordinarias ya no llaman a Coordinator ni adquieren leases.
- Pruebas de rol: cada capacidad sigue limitada a los roles definidos en la matriz vigente.
- Pruebas de creación/edición de cortes, aportes, imágenes, tutoriales y videos con el flujo simplificado.
- Pruebas de logout remoto, caché invalidada, cuenta eliminada y bloqueo temporal de login.
- Pruebas de concurrencia funcional para confirmar que dos aportes independientes no se bloquean entre sí; no reintroducir transacciones como solución preventiva.
- Comparar número de llamadas y latencias antes/después cuando las mediciones estén disponibles.
- Ejecutar sintaxis y regresión local completa. No desplegar Apps Script ni ejecutar pruebas Beta/productivas sin autorización.

**Criterio de salida:** pruebas locales aprobadas y evidencia clara de reducción de llamadas/pasos. Las pruebas que requieran despliegue quedan identificadas como pendientes Beta.

## 4. Orden de trabajo y entregables

1. **P0 COMPLETADA:** auditoría estática y mapa de llamadas publicados en `AUDITORIA_P0_LATENCIA_VALIDACIONES.md`.
2. **P1 EN PROGRESO:** comenzar por P1.1 (WRITE/ADMIN cortes y `checkOperation`), luego P1.2 (locks de escritura) y P1.3 (FEEDBACK).
3. Implementar P2 y validar cargas de archivos.
4. Implementar P3 y verificar las tres excepciones de sesión.
5. Ejecutar P4 sobre el resto de la plataforma.
6. Ejecutar P5 y registrar resultados reales.

Cada fase debe actualizar el backlog y checkpoint. Agrupar cambios por tarea lógica y no modificar la rama base `GPSpedia2.2.5`.

## 5. Límites de ejecución

- No cambiar el hash actual de contraseñas ni introducir autenticación más compleja.
- No desplegar servicios Apps Script, modificar datos productivos ni ejecutar pruebas Beta.
- No retirar la matriz de roles ni conceder privilegios nuevos.
- No reemplazar validaciones redundantes por nuevas capas de validación con otro nombre.
- No afirmar mejoras de tiempo sin mediciones. Se debe informar el número de llamadas eliminado y las latencias medidas cuando sea posible.
