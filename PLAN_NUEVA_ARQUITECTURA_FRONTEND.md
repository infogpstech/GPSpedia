# Plan maestro — Nueva arquitectura de GPSpedia

**Repositorio:** `infogpstech/GPSpedia`  
**Rama de trabajo:** `GPSpedia2.2.5_work`  
**Rama base protegida:** `GPSpedia2.2.5`  
**Fecha de actualización:** 2026-11-22  
**Estado:** PLAN APROBADO COMO OBJETIVO; inventario y diseño técnico en progreso.

## 1. Objetivo no negociable

Simplificar de forma radical la arquitectura y los despliegues de GPSpedia sin perder, deshabilitar, degradar ni ocultar ninguna función que ofrece actualmente la plataforma.

**Todas las configuraciones de GPSpedia deben residir en la Spreadsheet. Ningún proyecto Apps Script debe guardar configuración propia de la plataforma, propiedades de conexión, URLs de otros servicios, IDs de recursos, claves compartidas ni secretos manuales.**

El frontend coordina las secuencias funcionales que involucran varios servicios. Se permite comunicación directa entre servicios cuando sea técnicamente necesaria, pero no una orquestación paralela de flujos de negocio. Esa comunicación no requiere ni puede exigir claves, API keys, contraseñas, secretos compartidos ni tokens manuales entre servidores. Cada servicio mantiene su autorización de usuario/sesión y RBAC.

No se conservarán COORDINATOR ni SharedMutation ni se crearán sustitutos equivalentes.

## 2. Arquitectura objetivo

```text
                     ┌──────────────────────────┐
                     │       FRONTEND PWA       │
                     │                          │
                     │ - Configuración/caché    │
                     │ - Router de acciones     │
                     │ - Orquestación           │
                     │ - Progreso/recuperación  │
                     └────────────┬─────────────┘
                                  │
                    solicitudes directas / respuesta
                                  │
       ┌─────────────┬────────────┼────────────┬─────────────┐
       │             │            │            │             │
     AUTH          CATALOG       WRITE      FEEDBACK       ADMIN
       │             │            │            │             │
       └─────────────┴────────────┼────────────┴─────────────┘
                                  │
                              UTILITIES
                                  │
                         ┌────────▼────────┐
                         │   SPREADSHEET   │
                         │ Configuración   │
                         │ Datos y estados │
                         │ Sesiones        │
                         │ Métricas/logs   │
                         └─────────────────┘

   USERS se consolida dentro de AUTH conservando todas sus acciones.
   La coordinación funcional multi-servicio se ejecuta en frontend; llamadas técnicas directas entre servicios se permiten sin secretos compartidos.
   El frontend inicia y coordina las llamadas de los flujos funcionales; los servicios pueden realizar llamadas técnicas directas justificadas.
```

### 2.1 Responsabilidades

**Frontend**
- Lee y mantiene en caché la configuración central.
- Resuelve acción → servicio → endpoint.
- Coordina secuencias de llamadas a varios servicios.
- Administra progreso, reintentos seguros, estado parcial y recuperación de operaciones.
- Conserva todas las pantallas, controles, formularios y herramientas existentes.

**Servicios Apps Script**
- No contienen URLs, IDs de Spreadsheet/Drive, propiedades de configuración, secretos compartidos ni referencias a otros servicios.
- No orquestan flujos funcionales que corresponden al frontend.
- Pueden realizar llamadas técnicas directas a otro servicio cuando sea necesario, sin secretos de interconexión; el receptor valida sesión/capacidad y permisos.
- Atienden solicitudes del frontend y, cuando sea necesario, llamadas técnicas directas; validan sesión/capacidad, leen o escriben en Spreadsheet y devuelven el resultado.
- No almacenan configuración propia de la plataforma.
- No se mantienen ocupados coordinando operaciones que el frontend puede ejecutar directamente.

**Spreadsheet**
- Fuente central de configuración funcional y de endpoints.
- Fuente de datos, registros, estados, sesiones y metadatos que actualmente se administran en hojas.
- Mantiene esquemas identificables y versionados.
- No se utiliza para guardar el contenido binario de imágenes o vídeos.

### 2.2 Configuración sin bootstrap oculto

La lectura de configuración no puede depender de una URL, ID o propiedad secreta escondida dentro de un servicio. Antes de implementar el cargador se debe resolver cómo cada servicio accede a la Spreadsheet sin almacenar su ID localmente.

Se evaluarán como primera opción los proyectos vinculados a la Spreadsheet y el acceso por contexto activo. Se probará expresamente su funcionamiento en ejecuciones Web App desplegadas, no solo desde el editor. También se evaluará si conviene consolidar módulos en un solo proyecto vinculado para eliminar el problema de bootstrap y simplificar el despliegue. No se elegirá una opción que obligue a introducir un ID/URL/propiedad local para arrancar.

El frontend necesita una dirección de entrada para recibir la aplicación, pero no se creará una segunda configuración de endpoints en el código. El diseño final debe demostrar cómo obtiene el registro central sin circularidad.

### 2.3 Archivos binarios e integraciones externas

La Spreadsheet guarda configuración, metadatos, IDs, estados y registros, no los bytes de los archivos.

- Imágenes: conservar carga, ledger, SHA-256, límites, validación de MIME/tamaño, Drive, reemplazo, reconciliación y recuperación.
- Vídeos: conservar carga reanudable directa a YouTube, OAuth administrado, estado pendiente, aprobación/rechazo y asociación al modelo/tutorial.
- Drive: conservar administración de carpetas, movimientos, restauración, auditoría, backups y comandos de terminal.
- Se probará primero la transferencia directa desde frontend a Drive/YouTube, manteniendo la misma identidad, propiedad, permisos y capacidad de reanudar. Si no es técnicamente equivalente, no se elimina la función: se documenta la limitación antes de decidir una excepción mínima. Nunca se expondrán tokens OAuth ni credenciales en el navegador.

### 2.4 Sesiones sin secretos de interconexión

- AUTH conserva la autenticación y la fuente de identidad; USERS se integra en AUTH según la norma vigente.
- Se mantienen tokens de sesión opacos, almacenados/registrados en Spreadsheet y asociados al usuario/rol confiable.
- Cada servicio obtiene el actor desde el contexto de sesión, con caché local de corta duración donde corresponda; nunca acepta un rol editable enviado por el frontend.
- No se usarán claves secretas compartidas entre proyectos ni credenciales manuales entre servidores. La coordinación funcional se hace desde frontend; las llamadas directas técnicas permitidas no sustituyen la validación independiente del receptor.
- Logout, cambio de rol/contraseña, eliminación de cuenta y limpieza de cachés se orquestan desde frontend con llamadas directas a los servicios afectados, respetando §§12–15 de las normas.
- La solución concreta de acceso a Spreadsheet se someterá a prueba Web App real (MIG-006 Beta). MIG-008 implementó el lector basado exclusivamente en getActiveSpreadsheet(), la proyección pública de AUTH y cachés server/frontend con fail-closed; la lectura no funcionará en despliegue si el contexto activo devuelve null. La prueba Web App real de contexto, permisos, CacheService, latencia y concurrencia sigue pendiente de Beta. No sustituir openById() en los servicios de datos hasta superar esa prueba.

## 3. Requisitos de paridad funcional

El inventario no se limita a las 121 acciones del mapa frontend. Debe incluir también handlers internos, comandos de desarrollador, herramientas administrativas, trabajos manuales, compatibilidad, tareas programadas, integraciones externas y controles visibles.

Como mínimo, se deben preservar:

1. **Catálogo y modelos:** navegación, búsqueda, filtros existentes, fichas, modelos, versiones, rangos de años, cortes, datos técnicos, proyecciones, VIN, duplicados, contribuciones y navegación relacionada.
2. **Imágenes:** carga desde formularios y administración, vista previa, transformación/variantes, resolución, lightbox, reemplazo, recuperación, organización, auditoría, inventario, reconciliación y borrado autorizado.
3. **Vídeos:** carga reanudable YouTube, pausado/reanudación, metadatos, propuestas automáticas, pendientes, aprobación, rechazo, asociación a modelos/tutoriales y reproducción.
4. **PyS:** problemas, soluciones, prevención, asociaciones bidireccionales de vehículos, edición, eliminación, búsqueda, relaciones y reproducción de vídeos.
5. **Tutoriales:** alta, edición, consulta, imágenes, vídeos, aprobación y asociación.
6. **Feedback:** reportes, sugerencias, formularios de contacto, likes, vistas, comentarios y estados de resolución.
7. **Inbox:** destinatarios, conversaciones, mensajes, respuestas, plantillas, categorías, recibidos/no leídos/enviados/archivados, búsqueda, paginación, borradores, contadores, lectura/no lectura, cierre y eliminación.
8. **Usuarios y seguridad:** login, logout, recuperación, cambio/reset de contraseña, términos, perfiles, altas, actualización, eliminación, roles, bloqueo temporal, sesiones y limpieza de caché.
9. **Administración de datos:** migraciones, identificadores, VIN, fórmulas, hojas, columnas, backups/restauración de Spreadsheet y Drive, reorganización y saneamiento.
10. **Drive:** comandos de terminal, navegación, carpetas, movimientos, archivos, restauración, auditoría, inventarios, almacenamiento y URLs de descarga.
11. **Métricas y monitoreo:** ping/estado de cada servicio, conectividad, latencia en ms, tráfico, almacenamiento, métricas de usuarios, actividad, logs, auditoría y diagnósticos.
12. **Herramientas de desarrollador:** comandos, consola, gestión de caché local, purgado autorizado, inspección de estructuras y utilidades existentes.
13. **Experiencia y persistencia:** caché del catálogo, IndexedDB, actualizaciones incrementales, modo oscuro, PWA, impresión, QR, accesibilidad, navegación, estados vacíos y manejo de errores.
14. **Procesos no visibles:** funciones auxiliares invocadas internamente, acciones manuales, tareas programadas, migraciones históricas y compatibilidad de datos.

Cada elemento debe tener referencia al código, consumidor, permiso, datos que utiliza, servicio destino y prueba de regresión.

## 4. Fases y tareas

El detalle accionable se encuentra en [TAREAS_MIGRACION_ARQUITECTURA.md](./TAREAS_MIGRACION_ARQUITECTURA.md). Las fases son:

| Fase | Objetivo | Estado |
|---|---|---|
| 0 | Inventario total de funciones, configuración y dependencias | EN PROGRESO |
| 1 | Demostrar acceso a Spreadsheet sin configuración local ni bootstrap circular | PRUEBA LOCAL PREPARADA; WEB APP BETA PENDIENTE |
| 2 | Diseñar e implementar esquema central y caché frontend | MIG-007 y MIG-008 COMPLETADAS CON VALIDACIÓN DIFERIDA |
| 3 | Implementar router/orquestador frontend sin cambiar contratos | MIG-009 ROUTER COMPLETADO CON VALIDACIÓN BETA PENDIENTE; MIG-010 PENDIENTE |
| 4 | Mover coordinación funcional de ADMIN y otros servicios al frontend; conservar solo llamadas técnicas directas justificadas y sin secretos | PENDIENTE |
| 5 | Unificar AUTH/USERS y simplificar sesión sin claves compartidas | PENDIENTE |
| 6 | Migrar cargas de imágenes, vídeos y operaciones Drive sin pérdida | PENDIENTE |
| 7 | Migrar métricas, monitoreo, administración, Inbox, PyS y utilidades | PENDIENTE |
| 8 | Retirar COORDINATOR, SharedMutation y configuración antigua | PENDIENTE |
| 9 | Pruebas de paridad funcional, seguridad, rendimiento y regresión | PENDIENTE |
| 10 | Preparar despliegue simple y validación Beta | PENDIENTE |

## 5. Criterios de aceptación obligatorios

La migración no se acepta hasta cumplir simultáneamente:

- [ ] Ningún proyecto Apps Script tiene propiedades de configuración de GPSpedia.
- [ ] Ningún servicio contiene URLs de otros servicios, IDs de recursos ni secretos compartidos.
- [ ] Ninguna propiedad Apps Script almacena claves, tokens manuales o secretos compartidos de interconexión.
- [ ] El frontend obtiene y actualiza automáticamente endpoints desde el registro central; sin fallback local vencido o inválido.
- [ ] Llamadas directas servicio-a-servicio solo por necesidad técnica, sin secretos compartidos y con autorización/RBAC del receptor.
- [ ] Ningún servicio realiza llamadas HTTP a otro servicio GPSpedia.
- [ ] No existen dependencias funcionales de COORDINATOR ni SharedMutation.
- [ ] La configuración operativa está centralizada en Spreadsheet.
- [ ] El frontend coordina todas las solicitudes y secuencias entre servicios.
- [ ] AUTH/USERS conserva login, usuarios, perfiles, roles, recuperación y sesiones.
- [ ] Se mantienen las 121 acciones del mapa actual y todas las acciones adicionales encontradas.
- [ ] Se mantienen cargas y administración de imágenes, vídeos, Drive y YouTube.
- [ ] Se mantienen creación/edición de modelos, VIN, PyS, tutoriales, Inbox, feedback y formularios.
- [ ] Se mantienen métricas de servicios, latencia, tráfico, usuarios, actividad, logs y auditoría.
- [ ] Se mantienen backups, restauración, migraciones, terminal y herramientas de desarrollador.
- [ ] La matriz RBAC y las restricciones destructivas no cambian.
- [ ] El rendimiento no empeora en arranque, login, catálogo, Inbox ni operaciones frecuentes.
- [ ] Desplegar un servicio no requiere editar propiedades ni desplegar otros.
- [ ] Las pruebas locales pasan y las pruebas Beta se ejecutan con evidencia real.
- [ ] No se elimina ningún archivo, endpoint, hoja ni proyecto hasta comprobar que no tiene funciones o consumidores pendientes.

## 6. Reglas de migración

- Trabajar únicamente en `GPSpedia2.2.5_work`; la rama base no se modifica.
- No desplegar ni alterar recursos productivos.
- No realizar una sustitución global de URLs ni eliminar código antes de contar con pruebas de equivalencia.
- Cada grupo de tareas debe conservar una referencia al comportamiento anterior y añadir pruebas de paridad.
- Si una capacidad no puede migrarse literalmente, se conserva el flujo actual hasta resolver una alternativa equivalente.
- Las validaciones que requieren despliegues, OAuth, Drive, YouTube o Spreadsheet Beta se registran para Beta; no se presentan como ejecutadas.
- Registrar el avance en checkpoint y tareas, no en documentos paralelos redundantes.

## 7. Estado inicial

- Rama verificada: `GPSpedia2.2.5_work`.
- Rama base verificada: `GPSpedia2.2.5`.
- El mapa frontend existente contiene 121 acciones distribuidas entre AUTH, CATALOG, WRITE, USERS, FEEDBACK, UTILITIES y ADMIN.
- Existe un inventario inicial de llamadas internas, propiedades, secretos y dependencias en [MATRIZ_MIGRACION_SERVICIOS.md](./MATRIZ_MIGRACION_SERVICIOS.md).
- Todavía no se ha modificado lógica funcional ni deployments para esta migración.
- La siguiente actividad es completar el inventario de funciones y ejecutar el spike de acceso a Spreadsheet sin configuración local.


## Anexo — Requisito técnico transversal para todas las tareas MIG

Todas las tareas MIG-001 a MIG-030 deben respetar NORMAS_DESAROLLO.md §18: no secretos compartidos/manuales en propiedades Apps Script; no URLs ni coordinación funcional de otros servicios en Apps Script; coordinación desde frontend siempre que sea viable; llamadas directas solo por necesidad técnica y sin secretos compartidos; autorización/RBAC independiente en el receptor; URLs operativas desde configuración central autoactualizable y sin fallback local. El bootstrap AUTH, cuando sea inevitable, es un único localizador explícito y limitado a consultar la configuración central.
