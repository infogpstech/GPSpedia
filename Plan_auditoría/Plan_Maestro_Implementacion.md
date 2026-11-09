# Plan maestro de implementación y resolución de hallazgos — GPSpedia

**ID:** IMP-PLAN-2026-001  
**Fecha:** 2026-11-09  
**Repositorio:** infogpstech/GPSpedia  
**Rama de trabajo:** GPSpedia2.2.5_work  
**Rama base:** GPSpedia2.2.5  
**HEAD de trabajo inicial:** d747696416c6d0a67edb558e8ec21e04e1e7eadf  
**HEAD de base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Estado:** planificación documental; no se declara ninguna corrección funcional implementada.

## 1. Objetivo y reglas

Resolver los hallazgos ya registrados en E1 y las tareas AUG existentes sin repetir auditorías, auditar informes, crear IDs duplicados ni cerrar observaciones sin evidencia. Priorizar seguridad, identidad, integridad de datos y prevención de pérdida/corrupción antes de ampliar funciones. Los IDs, criterios y adendas originales permanecen en sus registros fuente.

## 2. Estado verificado

- Catálogo AUD-T-001 a AUD-T-039: 39 unidades registradas; la consolidación marca 38/38 unidades principales con E1 estática completada y AUD-T-039 como revisión de configuración de ramas.
- E1 no certifica pruebas funcionales, seguridad runtime, integración, accesibilidad ni deployments.
- Aug_Tareas.md contiene 151 IDs AUG únicos, AUG-001 a AUG-151. Hay adendas/repeticiones de encabezados; no contarlas como tareas nuevas.
- Tareas.txt contiene 185 identificadores individuales únicos con formato completo H-AUD-###-###. El conteo usa el identificador completo, no el prefijo de agrupación ni el número de ocurrencias repetidas.
- Las matrices VAL-01 a VAL-33 están registradas; su existencia no acredita ejecución.
- Auditoría.txt devolvió contenido vacío por el conector GitHub. La consolidación usa Tareas.txt, Aug_Tareas.md, Plan_Auditoria.md, Consolidacion_Auditoria.md y código legible. No se afirma lectura íntegra independiente de Auditoría.txt.
- Inbox actual: lista/detalle, lectura de feedback, respuesta ligada a item, resolución para determinados reportes, eliminación y aprobación/rechazo de vídeos. El CSS aplica overflow a columnas, pero el modal padre oculta overflow y el alto del wrapper depende del layout; requiere rediseño y pruebas responsive.
- api-config.js expone getFeedbackItems, replyToFeedback, markAsResolved y deleteFeedbackItem, pero no una acción específica para iniciar una conversación Desarrollador→usuario. replyToFeedback no es un hilo multi-mensaje.

## 3. Inventario de hallazgos por dominio

| Dominio | Auditorías y hallazgos relacionados | Deuda técnica agrupada |
|---|---|---|
| Arranque, sesión y catálogo | AUD-T-001; H-AUD-001, 024, 037 | Deep links indefinidos; catálogo marcado cargado tras fallos; snapshots/caché que pueden conservar retirados; timeouts y estados terminales. |
| Identidad, autorización y cuentas | AUD-T-002, 023, 024, 032, 034, 039; H-AUD-002, 023, 024, 032, 034, 039 | Revocación/expiración; actor/rol backend; mutaciones USERS concurrentes; hashing/migración; protección de ramas. |
| Registro, VIN y escrituras | AUD-T-003, 004, 030, 031; H-AUD-003, 004, 030, 031 | Idempotencia/opId, recuperación, VIN, slots/encabezados, carga/compensación Drive y consistencia Spreadsheet. |
| Modal, imágenes y navegación | AUD-T-005 a 008; H-AUD-005 a 008 | Sanitización, ampliaciones, selectores, variantes de imagen, gestos, overlays, History API y deep links. |
| Feedback, Inbox y dashboard | AUD-T-010, 017, 018; H-AUD-010, 017, 018 y relaciones 034/035 | Sesión/actor, stored XSS, adjuntos, integridad reportes, validación, concurrencia, caché, roles, auditoría de mutaciones y tipos soportados. |
| PyS, asociaciones, Tutorial/YouTube | AUD-T-011 a 013; H-AUD-011 a 013 y 035 | XSS, identidad, imágenes, IDs, límites, relaciones huérfanas, concurrencia, esquema Tutorial y aprobación de vídeos. |
| Texto enriquecido | AUD-T-014; H-AUD-014 y adendas AUG-064/AUG-096 | Sanitización autoritativa, sinks HTML, modos de editor y compatibilidad. |
| Búsqueda, VIN y PWA | AUD-T-009, 015, 037; H-AUD-009, 015, 037 | Normalización/ranking, clasificación, filtros cancelados, caché, deep links y Service Worker. |
| Tema, responsive, accesibilidad e impresión | AUD-T-016, 021, 022, 036; H-AUD-016, 021, 022, 036 | Contraste/tokens, zoom, móvil, paginación, privacidad QR, diálogos, foco, pestañas y legal. |
| ADMIN, Drive, logs y arquitectura | AUD-T-020, 025–029, 033, 035, 038; H-AUD-020, 025–029, 033, 035, 038 | Backups/restores, permisos, locks entre proyectos, telemetría, inventarios, snapshots, logs sensibles, helpers duplicados y contratos API. |
| Gobierno y validación | AUD-T-019, 039; H-AUD-019, 039 | Suite reproducible, contrato acciones, publicación de servicios, branch protection y pruebas por deployment. |

## 4. Fases maestras de implementación

### Fase 0 — Gobierno y clasificación
**AUG:** 001–004, 112, 133; VAL-33.
Normalizar estado de AUG, responsables, dependencias y criterios; conservar IDs; resolver referencias/cancelaciones; mantener filtros rápidos del catálogo retirados; definir protección de rama y CI con autorización; preparar entornos aislados.
**Salida:** backlog trazable, sin duplicados y con estados reales.

### Fase 1 — Seguridad, identidad y sesiones (P0)
**AUG:** 005–017, 039, 042, 045–047, 075, 109, 117, 118, 122, 129, 130, 147.
Unificar validación backend de sesión/rol/actor; revocar sesiones; completar hashing/migración; serializar mutaciones; proteger último Desarrollador; evitar privilegios obsoletos al cambiar cuenta/rol; revisar consentimiento y privacidad.
**Salida:** matriz RBAC comprobada; tokens revocados rechazados; sin escalada por payload falsificado.

### Fase 2 — Integridad, concurrencia y recuperación (P0)
**AUG:** 018–038, 053–064, 077–080, 083–090, 125, 126, 128, 136, 138.
Definir coordinación entre Apps Script (locks locales no son compartidos); hacer operaciones Drive/Spreadsheet idempotentes y recuperables; compensar archivos huérfanos; validar antes de reservar IDs/filas; proteger migraciones/restore con staging, snapshot y rollback.
**Salida:** pruebas de concurrencia, timeout, reintento, fallo parcial y rollback sin duplicados/pérdida.

### Fase 3 — FEEDBACK e Inbox bidireccional (P1/P2)
**AUG:** 040, 043, 075–081, 106–112 si afectan Feedbacks, 113–121 y 152.
Orden: (1) sesión/actor, XSS y validación; (2) adjuntos, relaciones reportId/vehicleId/corteIndex, permisos e idempotencia; (3) caché, auditoría inmutable y coherencia de rol; (4) modelo Conversation/Message separado de reportes/sugerencias/vídeos; (5) implementar AUG-152; (6) ejecutar VAL-19, VAL-26, VAL-27 y VAL-34 sin duplicar casos.
**Salida:** usuario consulta/responde; Desarrollador inicia/responde; backend verifica participantes; no se pierden ni mezclan hilos y feedback.

### Fase 4 — Catálogo, cortes, VIN y búsqueda
**AUG:** 036, 048–050, 055–064, 098, 101, 106–112, 126, 132, 151.
Corregir snapshots, deep links y estados de catálogo; validar VIN, slots, IDs, formularios y escrituras; completar búsqueda/ranking/ambigüedad. AUG-099 limpia remanentes de filtros cancelados; nunca reintroducir los filtros.
**Salida:** navegación y datos coherentes online/offline, sin polling infinito ni selección arbitraria.

### Fase 5 — PyS, Tutoriales y YouTube
**AUG:** 082–097, 124, 127, 128, 131.
Corregir XSS/identidad/esquema/IDs/adjuntos/caché/concurrencia; alinear Tutoriales FEEDBACK/CATALOG; validar estado/destino/videoId y aprobación; sanitizar contenido enriquecido.
**Salida:** relaciones consistentes, aprobaciones recuperables y sin registros huérfanos.

### Fase 6 — PWA, navegación y UX accesible
**AUG:** 022, 031, 032, 047, 051, 052, 065–074, 098–105, 139, 148, 149.
Corregir IndexedDB/cache/service worker/offline; History API/overlays; tema, contraste, zoom, responsive, foco y teclado.
**Salida:** flujos estables en escritorio/móvil, accesibles y recuperables offline.

### Fase 7 — ADMIN, Drive, telemetría y arquitectura
**AUG:** 018–027, 033–041, 122–135, 136–139, 150.
Completar permisos y contratos ADMIN/UTILITIES; operaciones Drive/backups/inventarios seguras; health checks y errores veraces; revisar call graph antes de consolidar helpers o retirar exports.
**Salida:** operaciones autorizadas, observables y recuperables.

### Fase 8 — Impresión y presentación
**AUG:** 095, 096, 100–105, 140–146.
Resolver márgenes, paginación real, recursos, Check Engine, privacidad QR, selector y sinks HTML.
**Salida:** impresión reproducible y presentación segura.

### Fase 9 — Validación integral y cierre
**AUG:** 002, 028–033, 133; VAL-01 a VAL-34.
Construir suite reproducible; crear/verificar deployments aislados para servicios requeridos; ejecutar E2/E3/E4/E5 separadas; usar snapshots, logs sanitizados y rollback; asociar aprobación al SHA exacto. Cerrar hallazgos solo con evidencia.
**Salida:** cada cierre validado en el entorno que corresponda.

## 5. Prioridad de ejecución
- **P0:** sesiones, autorización, XSS, exposición de datos, backup/restore, concurrencia e idempotencia.
- **P1:** contratos FEEDBACK/WRITE/USERS, VIN, reportes, adjuntos, PyS, Tutoriales y vídeos.
- **P2:** Inbox y comunicación, una vez seguras sus dependencias.
- **P3:** catálogo, búsqueda, navegación, PWA, accesibilidad, responsive e impresión.
- **P4:** DRY, telemetría, funciones huérfanas y mantenimiento.
La prioridad de negocio no permite saltar dependencias críticas de seguridad.

## 6. Requisitos ampliados de AUG-152 — Inbox

### Arquitectura
Separar Feedback (reporte/sugerencia/aprobación) de Conversation/Message (mensajería directa), enlazables pero no intercambiables. Un hilo conserva varios mensajes, participantes, autor, fecha, asunto, categoría y estado. Usuario abre consulta; Desarrollador inicia mensajes individuales y responde. Bienvenida por plantilla; automatización en alta requiere decisión separada. Sin broadcast, correo, SMS o push externo por defecto.

### Layout/scroll
Modal con encabezado estable y alto limitado al viewport dinámico. Escritorio: lista y detalle con scroll independiente. Móvil: lista o detalle, con botón de regreso. Bloquear scroll del fondo y restaurar selección/posición al refrescar o responder.

### Bandeja completa
Recibidos, No leídos, Enviados, Archivados; búsqueda, paginación, orden por actividad, vista previa del último mensaje, contador, leído/no leído, archivo/restauración y estados loading/empty/error/offline/sending/sent. Sin polling agresivo.

### Seguridad/privacidad
RBAC y ownership backend; mensajes solo a participantes; texto plano por defecto; allowlist para formato enriquecido; límites de frecuencia/tamaño; validación; idempotencia; historial inmutable; no loggear tokens; archivo lógico, no borrado irreversible.

### Aceptación
VAL-34 cubre acceso cruzado, bienvenida, consulta, respuestas múltiples, lectura, archivo, búsqueda, paginación, reintentos, XSS, sesión revocada, fallos de red, scroll responsive, teclado/foco, offline y compatibilidad histórica.

## 7. Dependencias y secuenciación
No implementar envío nuevo antes de resolver autorización/actor FEEDBACK y modelo de participantes. No ampliar rich text antes de sanitización/XSS. No cambiar Spreadsheet sin respaldo, migración compatible y rollback. No hacer pruebas con datos productivos. No retirar exports sin call graph. Las AUG existentes conservan sus IDs.

## 8. Referencias técnicas de diseño
Los criterios complementarios se alinean conceptualmente con WCAG 2.2 AA, el patrón de diálogo modal de WAI-ARIA Authoring Practices y las guías OWASP de prevención de XSS y control de acceso. La conformidad requiere pruebas reales. No se realizó consulta web en esta sesión y no se afirma verificación en línea de las versiones vigentes.

## 9. Definition of Done
Checkpoint inicial; confirmar refs; revisar archivos funcionales (no informes); registrar solo hallazgos nuevos; respaldos exactos; cambio mínimo; pruebas unitarias/contrato/integración/browser según aplique; comparación post-edición; Code Review/Safety & Side Effects; checkpoint final; un commit mediante Git Database API; verificar archivos y rama base intacta.

## 10. Siguiente paso
Iniciar Fase 1 con identidad/sesiones y XSS. Después diseñar el modelo y contrato de AUG-152 sobre FEEDBACK seguro. Este documento y la tarea nueva son planificación; no implementan funcionalidad.


## 11. Compuerta obligatoria entre tareas
Se incorpora como norma de cumplimiento obligatorio el anexo `Plan_auditoría/Protocolo_Ciclo_Continuo.md`, complementario a `Proceso de desarollo.md`.

Secuencia exigida:
1. Validar el último checkpoint y HEAD.
2. Auditar la implementación real de la tarea anterior, sin auditar informes ni repetir AUD-T cerradas.
3. Registrar hallazgos anteriores y resolverlos mediante tarea correctiva separada, con un único commit permitido.
4. Verificar el commit correctivo y su checkpoint.
5. Solo entonces auditar la tarea actual antes de implementar.
6. Registrar hallazgos actuales, implementar, probar, revisar y publicar un commit independiente de la tarea actual.

Una sesión puede contener dos commits solo cuando corresponden a dos tareas distintas: corrección anterior y tarea actual. Cada tarea conserva un único commit Git Database API. No se continúa ante checkpoint/HEAD no verificable ni hallazgos bloqueantes anteriores sin resolver. La instrucción de no auditar auditorías es absoluta.


## 12. Gobierno documental y rotación

Es obligatoria la norma `Plan_auditoría/Normas_Gestion_Documental.md`. Los registros son append-only: las entradas anteriores no se borran, editan, sustituyen ni reordenan; cada entrada nueva se agrega al final. El máximo es 180,000 caracteres Unicode por archivo. Antes de excederlo, rotar a `Olds/Documentacion_Legacy/` con sufijo `_legacy_parte_NNN`, crear el documento activo canónico y mantener un manifiesto verificable. Los documentos que ya excedan el límite se dividen en partes secuenciales sin pérdida. Las partes legacy son inmutables y no se reauditan.



## 13. Adenda de sincronización documental — DOC-REG-2026-002
**Fecha:** 2026-11-09. Esta adenda corrige el estado operativo sin borrar el registro histórico de las secciones anteriores.

- HEAD de trabajo verificado al iniciar esta tarea: d18e9f1a1a356782322104e5b0425c931fd77a1e; su padre es 63fbee17260ce850d8dcaeae363288559c49715e. HEAD de la rama base verificado: d9acc68d889985c2e2f42fe3a02e502efc86ead1. El valor d747696... de la cabecera original corresponde a una referencia anterior y no debe usarse como HEAD vigente.
- El registro AUG contiene 151 IDs únicos en el rango AUG-001 a AUG-152; AUG-015 no aparece en la fuente y no se inventa ni renumera. AUG-152 está registrado y requiere VAL-34.
- Los 185 identificadores H-AUD históricos se conservan en las partes legacy de Tareas; Tareas.txt activo funciona como registro reciente/índice y no contiene actualmente los 185 registros completos.
- Auditoría.txt activo sí contiene H-AUD-043; su historial anterior se conserva en Olds/Documentacion_Legacy/Auditoría_legacy_parte_001.txt. La nota anterior sobre una lectura vacía del conector no describe el estado del archivo activo.
- VAL-34 queda vinculado a AUG-152; las matrices VAL no se consideran ejecutadas por el mero hecho de estar documentadas.
- Registros independientes: Tareas_pendientes_parte1.txt a parte4.txt; tareas_completadas_parte1.txt; lista_beta.txt. Cada archivo contiene sus normas internas y respeta el máximo de 180,000 caracteres Unicode.
- Las tareas históricas marcadas [X] no se promueven automáticamente: requieren evidencia de revisión sintáctica y demás validaciones obligatorias.
- H-AUD-044 se resuelve documentalmente. H-AUD-045 y H-AUD-046 quedan abiertos como tareas documentales independientes.
- Los filtros rápidos permanecen cancelados y excluidos de la hoja de ruta Beta.


## 14. Adenda operativa — orden único de ejecución y ubicación de requisitos
**Fecha:** 2026-11-09. **Tarea documental:** DOC-PLAN-2026-003. Esta adenda vuelve ejecutable la secuencia de las fases 0–9 y prevalece cuando los rangos repetidos de las secciones 3–7 parezcan asignar una misma AUG a varias fases. No elimina ni reescribe el historial de planificación.

### 14.1. Fuentes canónicas de requisitos
Cada ejecución debe abrir la ficha completa y sus adendas en el archivo indicado antes de auditar código. Los resúmenes del Plan Maestro no sustituyen los requisitos.

| Identificador / tipo | Archivo canónico de requisitos | Uso |
|---|---|---|
| AUG-001 a AUG-099 | `Tareas_pendientes_parte1.txt` | Fichas operativas y adendas de la primera serie AUG. |
| AUG-100 a AUG-152 | `Tareas_pendientes_parte2.txt` | Fichas operativas y adendas de la segunda serie AUG. |
| Requisitos históricos abiertos o parciales sin reconciliar | `Tareas_pendientes_parte3.txt` y `Tareas_pendientes_parte4.txt` | Solo investigación y reconciliación; no ejecutar directamente ni duplicar una AUG. La fuente original es `Olds/Documentacion_Legacy/Tareas_legacy_parte_001.txt` a `parte_004.txt`. |
| H-AUD-### y hallazgos | `Auditoría.txt` y, para antecedentes históricos, `Olds/Documentacion_Legacy/Auditoría_legacy_parte_001.txt` | Describe evidencia del problema; no sustituye los criterios de aceptación de la tarea AUG. |
| DOC-README-2026-001/002 | `Tareas_pendientes_parte2.txt`, sección «TAREAS DOCUMENTALES ABIERTAS» | Correcciones de README y política de publicación. |
| Funcionalidades pospuestas a Beta | `lista_beta.txt` | No ejecutar antes de superar la compuerta Beta; cada elemento debe convertirse en una tarea formal con requisitos y pruebas. |
| Normas de documentación y estados | `Plan_auditoría/Normas_Gestion_Documental.md` | Estados, append-only, rotación y límite documental. |
| Procedimiento obligatorio de cada tarea | `Proceso de desarollo.md` | Orden de auditoría, implementación, verificaciones, Code Review y commit único. |
| Compuerta entre tareas | `Plan_auditoría/Protocolo_Ciclo_Continuo.md` | Validación de checkpoint/HEAD y resolución de bloqueos previos. |
| Procedimiento Git autorizado | `Contexto de trabajo.md` | Git Database API, un árbol, un commit y update_ref con expected SHA. |

### 14.2. Regla de asignación única
1. Cada ID AUG tiene una sola fase propietaria para su ejecución. Si aparece citado en otra fase, la segunda aparición significa dependencia o referencia cruzada, nunca una segunda implementación.
2. Los rangos de fases anteriores que se solapan se interpretan según la matriz de propiedad de 14.3. Si una AUG está cerrada con evidencia, no se reabre salvo regresión o nueva adenda explícita.
3. No ejecutar tareas legacy de partes 3–4 hasta reconciliarlas contra las fichas AUG de partes 1–2. Conservar su texto y registrar la correspondencia; si no hay equivalencia, crear una tarea nueva con ID disponible conforme a las normas.
4. Antes de cada tarea, consultar estado y dependencias; una prioridad superior no permite saltar requisitos previos.
5. Las correcciones documentales DOC-README-2026-001/002 preceden a cualquier tarea que dependa de la política o del inventario de Services. No borrar ni modificar Services por inferencia.
6. Los filtros rápidos están cancelados: AUG-099 solo elimina/verifica remanentes según su ficha; no reconstruir filtros ni sus controles.

### 14.3. Orden maestro y propiedad de ejecución
Las fases se ejecutan en este orden. Dentro de cada fase, respetar las olas y dependencias descritas. Los IDs se conservan tal como fueron creados.

| Orden | Fase / prioridad | Tareas propietarias y orden interno | Requisitos completos |
|---:|---|---|---|
| 0 | Gobierno y saneamiento documental | Primero DOC-README-2026-001 (cancelación de filtros rápidos en README); después DOC-README-2026-002 (verificar inventario/política de Services y corregir documentación solo con evidencia). Luego AUG-001 (protección de rama), AUG-004 (cancelación/continuidad), AUG-003 (contrato de Services/Utilities). AUG-002 se reserva para validación de deployments en Fase 9; AUG-112 es trazabilidad documental y se resuelve con su hallazgo vinculado, sin repetir auditorías. | DOC: `Tareas_pendientes_parte2.txt`; AUG: `Tareas_pendientes_parte1.txt`; AUG-112: `Tareas_pendientes_parte2.txt`. |
| 1 | Seguridad, identidad, sesiones y XSS — P0 | Ola 1: AUG-005–008, 014, 016–017 y 147 (revocación, cierre, expiración, sincronización entre pestañas y limpieza de estado). Ola 2: AUG-009–013 (validación de identidad, serialización USERS, KDF/migración, contador y coordinación de logs). Ola 3: AUG-039, 042, 075, 109, 115, 117–118, 122, 129–130 (autorización backend, actor/rol, confianza, última cuenta y mutaciones privilegiadas). Ola 4: AUG-076, 082, 113–114 y la parte de seguridad de AUG-064 (XSS, URLs y sanitización autoritativa). No iniciar mensajería ni ampliar contenido enriquecido hasta cerrar las olas aplicables. | `Tareas_pendientes_parte1.txt` para AUG-005–014, 016–017, 039, 042, 064, 075–082; `Tareas_pendientes_parte2.txt` para AUG-109, 113–118, 122, 129–130, 147. |
| 2 | Integridad de datos, concurrencia y recuperación — P0 | Ola 1: AUG-018 y 125 (backup, restore, snapshot y rollback antes de migraciones sensibles). Ola 2: AUG-034–038, 053–058, 123, 126 y 136–138 (coordinación entre servicios, idempotencia, snapshots, operaciones Drive/Spreadsheet y recuperación). Ola 3: AUG-019–033 y 041 (ADMIN/Drive/Logs/Utilities restantes), sin repetir las tareas de respaldo, historial de imágenes o coordinación ya ejecutadas en esta fase. Ola 4: AUG-055–063 y 077–080, 083–090, 128 (ciclos durables, adjuntos, VIN, asociaciones y relaciones), siempre después de sus controles de autorización. | `Tareas_pendientes_parte1.txt` para AUG-018–041, 053–090; `Tareas_pendientes_parte2.txt` para AUG-123, 125–126, 128, 136–138. |
| 3 | Feedback e Inbox — P1/P2 | Primero completar las dependencias de seguridad de Fase 1 y de integridad de Fase 2. Después AUG-040, 043, 077–081, 111, 119–121 y 152; integrar 113–118 solo como dependencias ya resueltas, no como segunda ejecución. Ejecutar VAL-19, VAL-26, VAL-27 y VAL-34 después de implementar sus contratos y sin duplicar casos. | `Tareas_pendientes_parte1.txt` para AUG-040, 043, 077–081; `Tareas_pendientes_parte2.txt` para AUG-111, 113–121, 152. VAL-34 y aceptación detallada de AUG-152 se consultan también en `Tareas_pendientes_parte2.txt`. |
| 4 | Catálogo, cortes, VIN y búsqueda — P1/P3 | Tras asegurar escrituras y recuperación: AUG-048–052, 055–063, 065–074, 098–099, 101, 106–112 y 151; ejecutar solo la parte de cada AUG no cerrada en Fases 1–2. AUG-036 y 126 son dependencias de esquema/escritura propietarias de Fase 2: no repetirlas aquí. AUG-099 se limita a retirar remanentes de filtros cancelados. | `Tareas_pendientes_parte1.txt` para AUG-048–099; `Tareas_pendientes_parte2.txt` para AUG-101, 106–112, 151. |
| 5 | PyS, Tutoriales y YouTube — P1/P2 | Con autorización, XSS, escritura y adjuntos seguros: AUG-082–097, 124, 127, 128, 131. AUG-082 es propiedad de Fase 1 por XSS; AUG-083–090 y 128 son propiedad de Fase 2 por almacenamiento/integridad; aquí solo se completan las partes de integración y experiencia que sigan pendientes, sin repetir la implementación propietaria. | `Tareas_pendientes_parte1.txt` para AUG-082–097; `Tareas_pendientes_parte2.txt` para AUG-124, 127–128, 131. |
| 6 | PWA, navegación, responsive y accesibilidad — P3 | Después de estabilizar contratos/datos: AUG-047, 065–074, 098–105, 148–149. Las tareas 065–071 que sean dependencias de imágenes/History API se ejecutan una sola vez aquí, salvo que una corrección de seguridad obligue a adelantarlas. | `Tareas_pendientes_parte1.txt` para AUG-047, 065–074, 098; `Tareas_pendientes_parte2.txt` para AUG-100–105, 148–149. |
| 7 | ADMIN, Drive, telemetría y arquitectura residual — P2/P4 | Completar únicamente deuda no resuelta de AUG-019–027, 033, 041, 122–139 y 150. Las AUG de respaldo, coordinación, autorización o integridad que ya sean propietarias de Fases 1–2 no se repiten. Consolidar helpers solo después de revisar call graph y contratos. | `Tareas_pendientes_parte1.txt` para AUG-019–027, 033, 041; `Tareas_pendientes_parte2.txt` para AUG-122–139, 150. |
| 8 | Impresión y presentación — P3 | Después de sanitización y estabilidad de datos: AUG-095–097 y 140–146. No ampliar sinks HTML antes de la ola XSS de Fase 1. | `Tareas_pendientes_parte1.txt` para AUG-095–097; `Tareas_pendientes_parte2.txt` para AUG-140–146. |
| 9 | Validación integral, deployments y cierre | Ejecutar AUG-002 y AUG-133; completar matrices VAL-01 a VAL-34 según sus casos; separar E2/E3/E4/E5; probar deployments aislados y registrar SHA exacto. No declarar cierre por existencia de matrices ni por E1 estática. | `Tareas_pendientes_parte1.txt` para AUG-002; `Tareas_pendientes_parte2.txt` para AUG-133 y VAL-34; `Plan_auditoría/Plan_Maestro_Implementacion.md` (esta matriz) y las fichas VAL vinculadas a las tareas. |

### 14.4. Dependencias que bloquean el avance
- No iniciar una tarea que escriba datos antes de tener autorización backend, validación de payload, idempotencia, coordinación de concurrencia y recuperación aplicables.
- No iniciar Inbox/mensajería (AUG-152) antes de cerrar sesión/actor/rol, XSS, permisos de participantes, integridad de mensajes y controles de abuso.
- No implementar rich text ni renderizado HTML nuevo antes de cerrar sanitización autoritativa y sinks relacionados.
- No migrar Spreadsheet/Drive sin respaldo verificable, staging, rollback y prueba de fallo parcial.
- No ejecutar Beta hasta superar íntegramente la compuerta de `lista_beta.txt`.
- No empezar la siguiente tarea si el checkpoint, HEAD, Code Review o hallazgos bloqueantes de la tarea anterior no cumplen `Plan_auditoría/Protocolo_Ciclo_Continuo.md`.

### 14.5. Procedimiento obligatorio dentro de cada tarea
El orden de trabajo no se sustituye por esta matriz. Para cada tarea individual se debe seguir, sin saltos, `Proceso de desarollo.md`: checkpoint inicial; auditoría diagnóstica archivo/función/línea sin editar; registro en Auditoría.txt; creación de respaldo exacto; implementación mínima; pruebas funcionales; comparación contra respaldo; eliminación de temporales después de Code Review y antes del commit; revisión de integridad/efectos colaterales; revisión final línea/función/archivo; ChangesLogs.txt; actualización de Tareas.txt y del registro independiente correspondiente; checkpoint final como último documento antes del único commit; un commit Git Database API; verificación de commit, parent, HEAD de trabajo y rama base intacta. Toda observación de Code Review que requiera cambios reinicia el ciclo completo.

### 14.6. Control de estado y ubicación de cierres
- Pendientes y requisitos: `Tareas_pendientes_parte1.txt` a `Tareas_pendientes_parte4.txt`.
- Cierres demostrados: `tareas_completadas_parte1.txt` (rotar secuencialmente cuando corresponda).
- Funcionalidades diferidas: `lista_beta.txt`.
- Índice de las tareas AUG: `Plan_auditoría/Aug_Tareas.md`.
- Historial inmutable: `Olds/Documentacion_Legacy/`.
Una tarea solo pasa a completada cuando su ficha, evidencia, revisión sintáctica de todos los archivos de código afectados, pruebas funcionales aplicables, Code Review y commit verificable cumplen la compuerta. Las tareas documentales declaran sintaxis de código N/A y pasan revisión documental.


================================================================================
ADENDA DE GOBIERNO — AUG-153 Y H-AUD-057
Fecha: 2026-11-09.
El registro operativo contiene ahora 152 IDs AUG únicos en el rango AUG-001 a AUG-153; AUG-015 continúa ausente. La parte 2 se extiende a AUG-100–AUG-153. El conteo previo de 151 IDs se mantiene como antecedente del corte anterior.
AUG-100 conserva su asignación canónica a «Consolidar un sistema universal de estilos y estados de botones», conforme a Tareas_pendientes_parte2.txt y la matriz 14.2. La entrada de centralización de ActiveSessions que se había agregado con AUG-100 en Tareas_pendientes_parte1.txt/Tareas.txt queda invalidada para ejecución y se reasigna a AUG-153 sin reescribir el historial.
AUG-153 — Centralizar las mutaciones de ActiveSessions en AUTH — se incorpora como corrección crítica de continuidad para resolver H-AUD-056 antes de aprobar o desplegar AUG-006. Debe ejecutarse antes de dar por cerrada la ola de sesiones de Fase 1; no duplica AUG-100 ni modifica las fases propietarias de otras tareas.
HEAD verificado al iniciar AUG-153: 20515351c4f7c0ca4f822473e89442722539642d. HEAD de rama base conservado: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: implementación de fuentes incorporada; sintaxis integral y pruebas en deployments aislados pendientes. H-AUD-056 permanece abierto hasta superar esas validaciones.
================================================================================
