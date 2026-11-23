# Plan de migración a arquitectura frontend-céntrica — GPSpedia

**Repositorio:** `infogpstech/GPSpedia`  
**Rama de trabajo:** `GPSpedia2.2.5_work`  
**Rama base protegida:** `GPSpedia2.2.5`  
**Estado:** EN PROGRESO — diseño e inventario  
**Objetivo:** retirar COORDINATOR y SharedMutation sin perder funciones, seguridad, integridad ni rendimiento.

## 1. Resultado que buscamos

El navegador será el único componente que conoce las direcciones de los servicios y decide a cuál enviar cada acción. Cada proyecto Apps Script será independiente: atenderá sus propias acciones, accederá a los recursos que le corresponden y no llamará a otros servicios. AUTH y USERS se consolidarán en un único servicio de identidad.

- No habrá COORDINATOR.
- No habrá SharedMutation ni leases centralizadas.
- Ningún backend almacenará URLs de otros servicios.
- Ningún despliegue requerirá agregar/editar ScriptProperties para conectar servicios.
- Las URLs y el registro de servicios se administrarán desde una única configuración central de Spreadsheet y el frontend.
- La configuración pública contendrá únicamente nombres, URLs, versión y metadatos no sensibles; nunca secretos, tokens ni credenciales.
- Las operaciones entre servicios se coordinarán desde el frontend mediante solicitudes directas, pasos idempotentes y recuperación de operaciones parciales.
- Los permisos y la validación de sesión seguirán siendo responsabilidad de cada backend. El frontend nunca será autoridad de seguridad.

## 2. Arquitectura objetivo

```text
                    ┌───────────────────────────┐
                    │       FRONTEND PWA        │
                    │ routing, orchestration,   │
                    │ retries, cache, recovery  │
                    └─────────────┬─────────────┘
                                  │
                    configuración centralizada
                    obtenida desde Spreadsheet
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
          AUTH (identidad)     CATALOG               WRITE
             │                    │                    │
             └────────────────────┼────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                  FEEDBACK      ADMIN         UTILITIES
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                              UTILITIES

       Todos los servicios son independientes y no se llaman entre sí.
       Cada backend valida sesión, rol y permisos para sus propias acciones.
```

### Bootstrap de configuración

El frontend necesita una única dirección inicial estable para obtener el registro de endpoints. Se propone reutilizar el endpoint público de lectura de CATALOG como bootstrap, añadiéndole una acción estrictamente de lectura que obtenga la configuración permitida desde una hoja de Spreadsheet. CATALOG no almacenará ni conocerá las URLs: solo leerá y devolverá el registro. El frontend conservará una copia válida en memoria/almacenamiento local con versión y caducidad para no consultar la configuración en cada acción.

La URL de bootstrap de CATALOG será el único endpoint que podría permanecer estático en el App Shell. Si cambia, se actualizará en un solo lugar del frontend. Las URLs de los demás servicios no se guardarán en código backend ni en propiedades de Apps Script.

Antes de implementar esta decisión se comprobará el mecanismo actual de acceso público a CATALOG, el esquema de la Spreadsheet y la política de caché. No se expondrán IDs privados, secretos ni datos de usuarios en la respuesta.

## 3. Principios que no se pueden romper

1. **Paridad funcional:** conservar todas las acciones, pantallas, permisos, flujos y formatos de datos existentes.
2. **Seguridad real en backend:** cada servicio verifica la sesión y el rol con información confiable; no acepta como autoridad un rol enviado por el navegador.
3. **Revocación segura:** logout, cambio de rol, cambio/restablecimiento de contraseña, eliminación de cuenta y reset global deben impedir el uso de sesiones invalidadas según una política de consistencia explícita y comprobable.
4. **Integridad de datos:** mantener idempotencia, validaciones, journals, compensaciones, protección frente a duplicados y recuperación de fallos parciales.
5. **Propiedad de datos:** cada servicio será responsable de las hojas/recursos que escribe. Evitar que varios servicios modifiquen el mismo recurso sin un protocolo de consistencia.
6. **Rendimiento:** eliminar viajes backend→backend, fan-out de cachés, locks globales innecesarios y consultas repetidas. Medir arranque, login, lecturas y escrituras antes/después.
7. **Despliegue independiente:** publicar un servicio no exigirá actualizar propiedades ni volver a desplegar los demás. Cambiar una URL será una modificación única en el registro central.
8. **Transición reversible:** no borrar los componentes actuales hasta que sus sustitutos superen pruebas de contrato y regresión.

## 4. Fases de ejecución

### Fase 0 — Inventario y mapa de dependencias
**Estado: EN PROGRESO**

- Enumerar los servicios reales: AUTH, CATALOG, WRITE, FEEDBACK, UTILITIES, ADMIN y COORDINATOR.
- Inventariar todas las acciones de `ACTION_TO_SERVICE_MAP`, incluidas acciones operativas/manuales y compatibilidad histórica.
- Encontrar llamadas backend→backend, URLs constantes, propiedades, secretos, endpoints internos y copias de SharedMutationClient.
- Identificar qué acciones usan leases y qué recurso protegen.
- Documentar todos los flujos de autenticación, revocación, eliminación de usuario, cachés de actor, inventario de imágenes, administración, YouTube, Inbox y migraciones.
- Relacionar cada dependencia con pruebas existentes en `JS/Tests/`.

**Entregable:** matriz acción → servicio propietario → recursos → autorización → dependencias → pruebas. No se elimina código en esta fase.

### Fase 1 — Registro central de servicios
- Definir una hoja de configuración con esquema versionado: servicio, URL /exec, activo, versión de contrato y fecha de actualización.
- Validar formato y lista permitida de servicios; rechazar URLs arbitrarias, duplicadas o de dominios no autorizados.
- Añadir la lectura pública mínima de configuración al bootstrap CATALOG.
- Crear en frontend un cargador con caché en memoria y persistencia local, TTL, versión, validación y fallback a última configuración válida.
- Mantener una única URL bootstrap estática. No incluir secretos en la hoja ni en el frontend.
- Añadir pruebas de configuración incompleta, URL inválida, caché vencida, actualización y fallback.

### Fase 2 — Enrutamiento y orquestación en frontend
- Mantener el mapa acción → servicio en frontend como fuente de enrutamiento.
- Cambiar las funciones de ADMIN que llaman a WRITE/CATALOG/AUTH/USERS/FEEDBACK para que el frontend ejecute la secuencia directa correspondiente.
- Conservar los contratos de respuesta actuales de la interfaz o adaptar consumidores de forma controlada.
- Añadir orquestadores reutilizables para operaciones multi-servicio: pasos ordenados, requestId, idempotencia, progreso, reintento seguro y recuperación tras recarga.
- El frontend no recibirá secretos ni ejecutará acciones privilegiadas sin autorización del backend.
- No mover a frontend operaciones que deban ser atómicas dentro de un mismo recurso.

### Fase 3 — Autenticación y autorización independientes
- Eliminar la dependencia de cada servicio respecto a `GPSpedia_COORDINATOR_URL`, secretos de Coordinator, `validateSessionContext` remoto y cachés precargadas por fan-out.
- Definir un contrato local común para validar sesión y rol contra los datos confiables compartidos, manteniendo las funciones de AUTH como autoridad de identidad.
- Evaluar y medir dos opciones antes de elegir: lectura directa acotada de `Users/ActiveSessions` por servicio o validación con caché local de duración limitada y política de revocación explícita.
- El mecanismo elegido no puede confiar en userId/role enviados por frontend ni permitir que un token revocado recupere vigencia.
- Mantener hashes de contraseña, recuperación, términos por dispositivo, límites de sesión, revocaciones y protección contra enumeración.
- Añadir pruebas de sesión expirada, token inexistente, token revocado, cambio de rol, cambio de contraseña, usuario eliminado, caché fría/caliente y concurrencia.

### Fase 4 — Retirada de SharedMutation y simplificación de escrituras
- Aplicar el requisito vigente de rendimiento: retirar leases, validaciones de Coordinator, locks globales y transacciones interservicio de las acciones ordinarias.
- Resolver la concurrencia de identidad al unificar AUTH/USERS y concentrar allí las escrituras de cuenta/sesión.
- Las operaciones que realmente necesiten dos servicios se dividirán en llamadas directas desde el frontend. Solo conservarán requestId, idempotencia o compensación cuando la operación ya lo requiera para evitar duplicados o recuperar un fallo parcial.
- No crear journals, leases ni capas genéricas para operaciones simples.
- Preservar las protecciones funcionales que ya evitan duplicados, pérdida de imágenes, corrupción de hojas o escrituras parciales en operaciones de Drive/Spreadsheet.
- Retirar las leases y el cliente compartido cuando la prueba de regresión correspondiente confirme que la acción mantiene el resultado funcional sin coordinación central.

### Fase 5 — Retirada de componentes y configuración antigua
- Eliminar llamadas internas y endpoints exclusivos del Coordinator.
- Eliminar `SharedMutationClient.js` de cada proyecto y sus dependencias.
- Eliminar `Coordinator.js`, el proyecto COORDINATOR de la guía y la documentación obsoleta.
- Retirar propiedades antiguas solo después de confirmar que ningún deployment las consulta; la migración no requerirá editarlas.
- Actualizar guía de despliegue para que cada servicio se copie/despliegue de forma independiente sin configuración manual de URLs o secretos.
- Eliminar código de compatibilidad solo después de cerrar la ventana de transición y pasar las pruebas.

### Fase 6 — Verificación integral y preparación de despliegue
- Ejecutar toda la suite existente y las pruebas nuevas de contratos, seguridad, concurrencia, rendimiento y regresión.
- Comparar el inventario inicial con el final para demostrar que ninguna acción desapareció.
- Medir solicitudes, latencia de login, tiempo de arranque, lecturas de Spreadsheet, llamadas remotas y tiempo de operaciones administrativas.
- Validar cada servicio en entorno aislado Beta; no confundir pruebas locales con deployments reales.
- Preparar orden de despliegue, criterios de aceptación y rollback por servicio.
- No modificar deployments ni datos productivos sin autorización expresa.

## 5. Inventario inicial confirmado

| Elemento | Estado actual observado | Destino |
|---|---|---|
| `JS/Frontend/api-config.js` | Contiene URLs de siete servicios y mapa de acciones | Cargador de configuración + router frontend |
| `JS/Services/Coordinator.js` | Sesiones compartidas, leases, validación, revocación, fan-out de cachés y telemetría | Retirar tras sustituir cada capacidad |
| `JS/Services/SharedMutationClient.js` | Llama al Coordinator y gestiona leases | Retirar tras migrar operaciones protegidas |
| `JS/Services/admin.js` | Contiene URLs directas de WRITE/CATALOG/AUTH/USERS/FEEDBACK | Convertir operaciones cruzadas en orquestación frontend |
| `JS/Services/Auth.js` | Usa propiedades y endpoints internos de Coordinator; registra/revoca sesiones | Validación y gestión de identidad sin Coordinator |
| `JS/Services/users.js` | Contiene lectura, alta y perfil de usuarios | Fusionar sus handlers en AUTH y retirar el proyecto USERS tras validar paridad |
| `JS/Services/write.js` | Usa actor compartido y coordinación en operaciones protegidas | Autorización local + propiedad de WRITE |
| `JS/Services/feedback.js` + `InboxConversations.js` | Usa actor compartido y coordinación en ciertas escrituras | Autorización local + propiedad de FEEDBACK |
| `JS/Services/Utilities.js` | Migración con lease compartida | Migración idempotente con journal y recuperación |
| `JS/Services/catalog.js` | Lecturas públicas y secreto interno para metadatos de inventario | Bootstrap público mínimo y lecturas propias |
| `Services/DEPLOYMENT_GUIDE.md` | Exige orden de despliegue, URLs, secretos y propiedades | Guía de despliegue independiente y simple |
| `Services/COORDINATOR_SETUP.md` | Describe contratos y dependencias centrales | Archivar/eliminar al completar la migración |

Este inventario es inicial, no exhaustivo. La Fase 0 debe verificar cada referencia y acción directamente en código y pruebas.

## 6. Criterios de aceptación

La migración no se considera terminada hasta cumplir todos:

- [ ] Todas las acciones anteriores siguen disponibles y conservan sus resultados/errores esperados.
- [ ] Ningún servicio contiene URL de otro servicio ni realiza llamadas HTTP a otro backend de GPSpedia.
- [ ] Ningún servicio requiere ScriptProperties para localizar o autenticar a otro servicio.
- [ ] El frontend es el único que conoce las URLs de los servicios y coordina operaciones multi-servicio.
- [ ] No queda dependencia funcional de COORDINATOR ni SharedMutation.
- [ ] Sesiones, permisos, revocaciones, recuperación y cambios de rol conservan su seguridad.
- [ ] No se pierden idempotencia, integridad, recuperación, journals ni controles de concurrencia.
- [ ] Los cambios de URL se realizan en un solo registro central, sin editar servicios.
- [ ] Un despliegue individual no obliga a modificar propiedades ni redesplegar otros servicios.
- [ ] Las pruebas locales y la suite de regresión pasan; las pruebas Beta remotas quedan identificadas por separado.
- [ ] El rendimiento medido no empeora en login, arranque y operaciones frecuentes.

## 7. Reglas de ejecución

- Trabajar solo en `GPSpedia2.2.5_work`; no modificar `GPSpedia2.2.5`.
- No desplegar Apps Script ni cambiar Spreadsheet/Drive productivos desde esta migración.
- No borrar servicios, funciones, endpoints o pruebas por anticipado.
- Hacer cambios pequeños por fase, con pruebas que fallen antes de corregir y pasen después.
- Mantener compatibilidad durante la transición; no cambiar simultáneamente contratos de todos los servicios.
- Registrar los cambios reales y sus validaciones. Una prueba remota no ejecutada se marca pendiente de Beta.
- Si una alternativa requiere más propiedades, pasos manuales o viajes de red que el sistema actual, descartarla salvo que sea indispensable para preservar seguridad/integridad y no exista una alternativa más simple.


## 8. Avance registrado — inventario inicial

Se creó [MATRIZ_MIGRACION_SERVICIOS.md](./MATRIZ_MIGRACION_SERVICIOS.md), que registra las 120 acciones del mapa frontend, las dependencias conocidas de Coordinator/SharedMutation, las llamadas backend→backend detectadas y las operaciones que requieren preservar consistencia.

Hallazgos confirmados:
- ADMIN contiene llamadas backend→backend a WRITE y CATALOG. También declara URLs de AUTH, USERS y FEEDBACK que deben verificarse por referencia antes de retirarlas.
- Coordinator realiza fan-out a USERS, WRITE, FEEDBACK y ADMIN para invalidar/precalentar cachés de actores.
- AUTH, USERS, WRITE, FEEDBACK, ADMIN y UTILITIES contienen rutas relacionadas con SharedMutation o con el contexto de sesión compartido.
- CATALOG y ADMIN comparten un secreto de propiedades para una consulta interna de metadatos de inventario de imágenes.
- El mapa frontend contiene 120 acciones: AUTH 15, CATALOG 5, WRITE 9, USERS 3, FEEDBACK 41, UTILITIES 1 y ADMIN 46.

**Estado:** inventario estático inicial completado; la Fase 0 sigue EN PROGRESO hasta contrastar routers, consumidores, recursos protegidos y pruebas. No se ha modificado lógica funcional ni se han cambiado deployments.


## 9. Alineación con los requisitos vigentes de rendimiento

La solución debe respetar especialmente `NORMAS_DESAROLLO.md` §15:

- No reconstruir la validación central de Coordinator bajo otro nombre.
- No consultar Spreadsheet/ActiveSessions ni hacer llamadas entre servicios en cada acción ordinaria.
- El login establece la sesión; cada servicio verifica localmente el contexto firmado y realiza una comprobación sencilla de rol/capacidad.
- Solo las excepciones expresamente conservadas (logout, revocaciones, cambios de rol/contraseña, reset y eliminación de cuenta) requieren invalidación remota, ahora orquestada directamente por el frontend.
- No añadir leases, journals ni reintentos genéricos donde no sean necesarios para la integridad de una operación.
- AUTH y USERS se consolidan para evitar carreras entre proyectos distintos que modifican el mismo recurso de identidad.

La propuesta de firma local es un diseño a validar con pruebas de compatibilidad de Apps Script y seguridad antes de implementarlo. Si no se puede verificar localmente una firma confiable sin llamadas de red ni secretos en el navegador, no se sustituirá por confiar en el rol del frontend: se deberá ajustar el diseño manteniendo §15 y la seguridad.
