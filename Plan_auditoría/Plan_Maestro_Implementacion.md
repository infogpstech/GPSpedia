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
