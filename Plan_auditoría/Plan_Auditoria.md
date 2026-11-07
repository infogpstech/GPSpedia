# Plan de auditoría global de GPSpedia
**ID del plan:** AUD-PLAN-2026-001  
**Sesión de inicio:** AUD-20261107-S001  
**Checkpoint inicial:** AUD-CP-0001  
**Fecha de inicio:** 2026-11-07  
**Periodo auditado:** 2026-01-01 a 2026-11-07  
**Repositorio:** infogpstech/GPSpedia  
**Rama de trabajo:** GPSpedia2.2.5_work  
**HEAD inicial:** 5bf20efe24f82dacafa0fe33791ca94a25b7141b  
**Rama base:** GPSpedia2.2.5  
**HEAD de base inicial:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  

## 1. Propósito y alcance

Realizar una auditoría histórica y técnica de las tareas y funcionalidades incorporadas al código de GPSpedia desde el 1 de enero de 2026 hasta el HEAD inicial indicado. La auditoría debe determinar qué se solicitó, qué se implementó realmente, qué partes siguen presentes, qué cambios posteriores las modificaron, si una tarea fue cancelada, retirada, sustituida o absorbida por otra mejora, y qué nivel de calidad y validación tiene la implementación actual.

La auditoría abarca el código frontend, los servicios backend presentes en el repositorio, la configuración de rutas/endpoints, persistencia local, contratos de datos, documentación de esquema, pruebas aisladas disponibles y trazabilidad de commits. No se ejecutarán escrituras en datos productivos, cambios de Drive/Spreadsheet ni despliegues durante las iteraciones diagnósticas.

## 2. Procedimiento de auditoría obligatorio

Se aplica íntegramente **Proceso de desarollo.md**. En particular:

1. Crear checkpoint inicial antes de cada iteración.
2. Confirmar HEAD de trabajo y base antes de cualquier publicación.
3. Auditar archivo por archivo, línea por línea y función por función.
4. No editar código, corregir, refactorizar ni eliminar durante la fase diagnóstica.
5. Registrar hallazgos sin sobrescribir registros históricos.
6. Comparar la implementación actual con el requerimiento original y sus revisiones posteriores.
7. Revisar dependencias, contratos, efectos colaterales, duplicación, funciones huérfanas, concurrencia, sintaxis y compatibilidad.
8. Distinguir pruebas estáticas, simuladas, unitarias, de navegador, Apps Script, HTTP, Drive y Spreadsheet reales.
9. En Code Review, tratar Safety & Side Effects como fuente principal de verdad técnica y reiniciar el procedimiento completo si una observación requiere cambios.
10. Un único commit por tarea documental/de implementación, mediante create_blob → un create_tree → create_commit → update_ref con force:false y expected_sha igual al HEAD confirmado. Nunca actualizar la rama base.

La auditoría global no autoriza por sí misma ninguna modificación funcional.

## 3. Línea base histórica

- GitHub devolvió 700 registros de commits para la consulta de historial de GPSpedia2.2.5_work con since=2026-01-01T00:00:00Z, en siete páginas de 100.
- El registro más antiguo devuelto es 2026-01-09 (merge de PR #26); no aparecieron commits entre el 1 y el 8 de enero en esa consulta.
- El filtrado preliminar de mensajes identificó 386 commits candidatos a contener cambios funcionales o técnicos. No son 386 tareas: el historial contiene commits de implementación, iteraciones, revisiones, merges, respaldos, limpieza temporal, documentación y actualizaciones de endpoints.
- El árbol actual contiene los módulos principales: index.html, ui.js, main.js, state.js, navigation.js, auth.js, users.html, add_cortes.html, offline.js, rich-text.js, lightbox.js, youtubeUpload.js, api-config.js, service-worker.js, style.css y los servicios Services/Auth.js, Services/users.js, Services/catalog.js, Services/write.js, Services/feedback.js, Services/admin.js y Services/Utilities.js, además de documentación y archivos históricos.
- El HEAD inicial de trabajo es 5bf20efe24f82dacafa0fe33791ca94a25b7141b; el HEAD inicial de base es d9acc68d889985c2e2f42fe3a02e502efc86ead1. Ambas ramas informaron protected=false en la consulta de GitHub. No se cambiará esa configuración desde esta auditoría.

**Limitación de esta línea base:** la consulta de mensajes y la lectura de los registros documentales no equivalen todavía a una revisión del diff y del código de cada tarea. Cada tarea del catálogo debe pasar por su propia iteración.

## 4. Catálogo histórico de tareas y cambios — IDs estables

Los IDs siguientes identifican unidades de auditoría, no commits individuales. Los commits listados son anclas iniciales del historial; durante cada iteración se recuperarán los commits relacionados, sus diffs completos, los archivos modificados y las revisiones posteriores. El estado inicial es **POR AUDITAR**, salvo que se indique una cancelación documentada que deberá confirmarse en el código y en el historial.

| ID de auditoría | Tarea / funcionalidad histórica | Commits ancla conocidos (SHA corto y mensaje) | Estado inicial |
|---|---|---|---|
| AUD-T-001 | Recuperación del App Shell, arranque, inicialización y estabilización general | 2251d499 — Implementar Tarea 1 y router doGet en admin.js; 4445f2c7 — Mejoras de UI, corrección de sesiones y optimizaciones generales | POR AUDITAR |
| AUD-T-002 | RBAC, AUTH, USERS, roles y autorización de operaciones de usuario (ciclo de sesiones en AUD-T-024; legal en AUD-T-036) | 97eef18c — Implementar Tarea 2: RBAC, sesión y cumplimiento legal; 414c4258 — Fix greeting name and implement History API in users profile; 6a226c18 — ADMIN 0: retirar credenciales de logs de AUTH | AUDITADO PARCIALMENTE; HALLAZGOS ABIERTOS (AUD-CP-0002) |
| AUD-T-003 | Registro de vehículos y cortes, add_cortes, idempotencia y resiliencia de red | 14bbd04f — Implementar Tarea 3: Formulario add_cortes, idempotencia y resiliencia; 77ea1d0b — registro sin cortes y recuperación de red; 2eaeb476 — make add-cut modal idempotent | POR AUDITAR |
| AUD-T-004 | VIN: identificación, colecciones, almacenamiento, búsqueda y diferencial | 5bab8779 — Implementar Tarea 4: Identificación, colecciones y búsqueda por VIN; df8e5cf7 — motor diferencial VIN; 94c2d04e — migrar IDs de operación y normalizar VIN | POR AUDITAR |
| AUD-T-005 | Modal de detalle, ampliación dinámica y acciones contextuales | d72a1e61 — Implementar Tarea 5: Ampliación dinámica en modal de detalle; 183cff59 — recuperación del botón expand plus | POR AUDITAR |
| AUD-T-006 | Lightbox, imágenes técnicas, carrusel de cables, PNG transparente y zoom | 7f57e2fd — Implementar Tarea 6: Lightbox y miniaturas PNG transparentes; af9caed8 — navegación de cables de alimentación en lightbox; 5ff81bde — Lightbox zoom y navegación | POR AUDITAR |
| AUD-T-007 | Navegación, History API, popstate, overlays y gesto atrás | 09c7a448 — Implementar Tarea 7: Navegación, historial y cierre de overlays; a45f394d — navegación back-gesture; 414c4258 — History API | POR AUDITAR |
| AUD-T-008 | Deep links, compartir, enlaces precisos e indicador de red | 7714b985 — Implementar Tarea 8: Deep linking, compartir e indicador de red; 76d44aff — connection indicator, sharing and deep linking; 20290cdd — precisión de enlaces compartidos | POR AUDITAR |
| AUD-T-009 | PWA, offline, IndexedDB, caché, service worker y compatibilidad iOS | 825a1aea — modo offline con persistencia IndexedDB; 9f8b84a9 — estabilidad offline; d9476ab0 — instalación PWA dinámica e iOS | POR AUDITAR |
| AUD-T-010 | Reportes de problemas y sugerencias de cambios en cortes | 64d8d044 — Implementar Tarea 9: Reporte y sugerencia de cambios; fb7f2fcf — reporte individual; db6951ed — modal de sugerencia; db0eee87 — almacenamiento independiente de sugerencias | POR AUDITAR |
| AUD-T-011 | Módulo Problemas y Soluciones (PyS), formularios y visualización | f93ad12f — Implementar Tarea 10: Módulo PyS; 73d1fd91 — revisión PyS IV; 0e93ec25 — correcciones de carrusel y ficha | POR AUDITAR |
| AUD-T-012 | Vinculación bidireccional PyS–vehículos y navegación sin ciclos | Implementar Tarea 11; f6299fcf — asociación de vehículo/problema y navegación anti-ciclo; 20ff5611 — contexto de carrusel PyS | POR AUDITAR |
| AUD-T-013 | Tutoriales, multimedia y carga directa de vídeos YouTube con aprobación | Tarea 12; 5fa1427a — subida directa YouTube y aprobación; bd8e2fe3 — integración en vehículos, PyS y tutoriales | POR AUDITAR |
| AUD-T-014 | Texto enriquecido, sanitización, listas, párrafos y saltos de línea | Tarea 13; 79230c57 — unificar editores enriquecidos y soporte de listas | POR AUDITAR |
| AUD-T-015 | Búsqueda global, filtros rápidos y resultados jerárquicos | Tarea 14 y Tarea 15; 7fae24ac — búsqueda de modelos numéricos; 2b2c5b57 — jerarquía de resultados | POR AUDITAR; incluye cancelación |
| AUD-T-016 | Diseño visual global, modo oscuro, contraste, footer y responsive | Tarea 16; 4b136cd0 — consolidación de modo oscuro; 28f4ace5 — footer dinámico; a9b15e5f — mejoras UI | POR AUDITAR |
| AUD-T-017 | Gestión colaborativa de años y validación comunitaria | Tarea 17; dc0862d0 — collaborative year update; 45eece6c — actualización integral; aa57c4de — autorización y deduplicación suggestYear | POR AUDITAR |
| AUD-T-018 | Usuarios, Inbox, dashboard, actividad y flujos de FEEDBACK | Tarea 18; 27760cf7 — transmisión de sesión Inbox/Dashboard; 58f58b0e — endpoint FEEDBACK; 5bf20efe — contrato testigo sugerencias | POR AUDITAR |
| AUD-T-019 | Validaciones de integridad backend y pruebas automatizadas | Tarea 19; commits de pruebas aisladas AUTH/USERS y pruebas de WRITE/ADMIN/FEEDBACK | POR AUDITAR |
| AUD-T-020 | Saneamiento arquitectural, DRY, anti-debugging y auditorías globales | Tarea 21; 27c9311c — auditoría integral y navegación; d93b3a5e — consolidación global y DRY | POR AUDITAR |
| AUD-T-021 | Ficha técnica imprimible, paginación y distribución adaptativa de imágenes | 6d7fbb9c — tareas 1.2/1.3; 199ee4be — layouts configurables; cbbcb0cb — cuadrículas 2×2; 04c86ce6 — layout adaptativo | POR AUDITAR |
| AUD-T-022 | Panel de desarrollador, navegación por secciones y modal administrativo | da7c146c — reorganizar panel; fd534545 — refinamiento; 9b1f210c — consola global | POR AUDITAR |
| AUD-T-023 | Seguridad ADMIN 0, registro de credenciales, hashing y migración | ed92f3a9 — reforzar autorización y proteger credenciales; 2e0bbcf7 — SHA-256 y límite de intentos; 6a226c18 — retirar credenciales de logs | AUDITORÍA ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE |
| AUD-T-024 | Administración de usuarios, privilegios, sesiones y controles de acceso | 2678ee02 — purga Logs y control de sesiones; 0666c1d1 — límites de sesión; 4bc9ac19 — serialización concurrente | AUDITORÍA ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE |
| AUD-T-025 | Herramientas ADMIN: base de datos, backup, restore, logs y mantenimiento | babf5ce4 — autorización y purga selectiva; e5c49b1d — enlaces completos en restore; abc7102f — backup/restore compartidos | AUDITORÍA ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE |
| AUD-T-026 | Telemetría, diagnóstico y health check de microservicios | e1defcb6 — restaurar comunicación/health check; 726727b6 — telemetría de servicios | AUDITORÍA ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE |
| AUD-T-027 | Historial de imágenes reemplazadas y acciones de gestión | 8f97d253 — base; 9e9918c7 — seguridad/consistencia; 91f75de3 — gestor; d99ab2d4 — idempotencia; 693f4825 — organización (observación AUD-T-028) | AUDITORÍA ESTÁTICA E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE |
| AUD-T-028 | Inventario de imágenes sin uso, clasificación y monitor global de Drive | 7983febe — persistencia; 91f75de3 — gestor/monitor y requisitos 6.1–6.9; 693f4825 — organización automática posterior | AUDITORÍA ESTÁTICA E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE |
| AUD-T-029 | Auditoría recursiva Drive, rendimiento, snapshot, lotes y reanudación | 7a4539f1 — optimizar lotes; d305b1ab — MIME gzip; f3f7102d — persistir progreso; 06c3b322 — robustecer snapshot | AUDITORÍA ESTÁTICA E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE |
| AUD-T-030 | Esquema Spreadsheet, IDs de cortes, opId/idOperacion y migraciones | 6cb4a3cb — contrato de cortes e idempotencia; 94c2d04e — migración IDs/VIN; 7dcd1225 — asignación centralizada de IDs | E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE |
| AUD-T-031 | Subidas de imágenes, reintentos, reconciliación Drive/Spreadsheet e idempotencia | 2e41428e — cargas Drive retry-safe; d99ab2d4 — idempotencia de reemplazos in-modal; 2212b4f5 — find-or-create | E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE |
| AUD-T-032 | Identidad autenticada del colaborador en WRITE y ADMIN | 36196020 — validar identidad autenticada; cierre de tarea documentado en checkpoint | E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE |
| AUD-T-033 | Coordinación de mutaciones entre servicios y Utilities | 8a3646cc — documentar hallazgos de coordinación; 44d127b3 — Utilities safe order processing; 336915b7/ef2db2e5 — renombramientos de Utilities | E1 COMPLETADA; PROTOCOLO COMPARTIDO AUSENTE; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE |
| AUD-T-034 | Acceso y visibilidad del panel/historial por rol y sesión | e4900b37 — normalización rol desarrollador; 0d4c0d01 — diagnóstico acceso historial; 187839c2 — asegurar acceso a gestión de imágenes | E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE |
| AUD-T-035 | Endpoints, separación de servicios y contratos frontend/backend | commits de actualización AUTH/USERS/ADMIN/FEEDBACK/WRITE; 975c5913 y f8cc191f — alta de servicios en el historial | POR AUDITAR |
| AUD-T-036 | Términos, consentimiento inicial y elementos legales de interfaz | e06791d0 — modal de términos en primer login; 9aa59063 — integración de términos y enlace footer | POR AUDITAR |
| AUD-T-037 | Catálogo, caché, sincronización incremental y búsqueda | f1db85fe — estrategia de caché incremental; 7fae24ac — búsqueda numérica; commits de catálogo y mejoras generales | POR AUDITAR |

### 4.1. Control de cancelaciones, sustituciones y cambios de alcance

- Tareas marcadas como canceladas no se reactivarán por aparecer en commits antiguos.
- Se identificó en Tareas.txt la **Tarea 1.6: botón de filtros rápidos durante búsqueda**, marcada expresamente como «CANCELADA Y RETIRADA». Se auditará su retirada y se verificará si el objetivo fue sustituido por la jerarquía de búsqueda o por otra solución. No se reintroducirá sin evidencia y autorización.
- La Tarea 15 combina una parte tachada/cancelada (barra de filtros rápidos de catálogo) con la estandarización universal de botones. Se separarán ambos alcances para no restaurar el requisito cancelado.
- Las tareas de versiones anteriores, cambios de endpoints, eliminación temporal de servicios del repositorio público y ramas auxiliares se contrastarán con la arquitectura actual y README; no se interpretarán automáticamente como regresiones.
- Si una función fue sustituida por una implementación posterior, el ID histórico se conservará y se enlazará al ID sucesor. No se auditará una versión obsoleta como si fuera la implementación vigente.

## 5. Fases de trabajo

| Fase | Alcance | IDs principales | Prioridad |
|---|---|---|---|
| F0 | Baseline, historial, clasificación inicial y trazabilidad | AUD-T-001 a AUD-T-037 (inventario) | En curso |
| F1 | Seguridad, AUTH, USERS, RBAC, sesiones, legal y contratos de servicios | 002, 023, 024, 034, 035, 018 | Crítica |
| F2 | Escrituras, registro de cortes, VIN, opId, esquema e identidad | 003, 004, 030, 031, 032 | Crítica |
| F3 | Drive, historial/reemplazo, inventario sin uso, snapshot y coordinación | 027, 028, 029, 031, 033 | Crítica |
| F4 | Catálogo, búsqueda, caché, modal, Lightbox e imágenes técnicas | 001, 005, 006, 015, 037 | Alta |
| F5 | Feedback, años, reportes, sugerencias y testigo | 010, 017, 018 | Alta |
| F6 | PyS, asociaciones, tutoriales y YouTube | 011, 012, 013 | Alta |
| F7 | Offline, PWA, navegación, historial y deep links | 007, 008, 009 | Alta |
| F8 | Centro de administración, herramientas, telemetría y mantenimiento | 022, 025, 026, 034 | Alta |
| F9 | Impresión, texto enriquecido, estilos y accesibilidad | 014, 016, 021, 036 | Media |
| F10 | Integridad transversal, DRY, pruebas, concurrencia y regresiones | 019, 020, 033 y todos los hallazgos | Crítica |
| F11 | Matriz funcional consolidada y cierre de auditoría | Todos los IDs | Bloqueante para declarar validación integral |

### 5.1. Orden de iteraciones

Cada ID de tarea se auditará individualmente, con su propio checkpoint y sesión. Dentro de cada fase se priorizará:
1. seguridad y pérdida/corrupción de datos;
2. concurrencia e idempotencia;
3. contratos y persistencia;
4. dependencias y regresiones;
5. UX, visualización y calidad de código.

Una tarea con dependencia bloqueada podrá pasar a estado BLOQUEADA, pero su ID y evidencia permanecerán en el plan.

## 6. Protocolo de cada iteración

Para cada AUD-T-NNN se generará:

- **ID de sesión:** AUD-YYYYMMDD-SNNN.
- **ID de checkpoint:** AUD-CP-NNNN.
- **Tarea auditada:** nombre exacto y alcance.
- **Commit principal:** mensaje completo y SHA del commit que implementó la tarea.
- **Commits relacionados:** correcciones, revisiones, sustituciones y reversiones.
- **Archivos y funciones auditados:** rutas y nombres reales obtenidos del código.
- **Cumplimiento:** completo, parcial, incumplido, sustituido, cancelado o no verificable.
- **Calidad:** diseño, legibilidad, complejidad, duplicación, manejo de errores, seguridad, concurrencia, compatibilidad y mantenibilidad.
- **Pruebas:** tipo, resultado y limitaciones.
- **Regresión/cancelación/sustitución:** evidencia del historial y del código actual.
- **Hallazgos:** IDs H-AUD-NNN con severidad, evidencia, impacto y recomendación.
- **Nuevas tareas:** IDs AUG-NNN en Aug_Tareas.md, vinculadas al hallazgo y sin duplicar tareas existentes.
- **Conclusión:** estado y siguiente iteración.

Al concluir cada iteración, se informará en el chat: nombre de la tarea auditada, ID de tarea, ID de sesión, ID de checkpoint, mensaje del commit principal y SHA. Si hay varios commits principales, se indicarán todos los relevantes.

## 7. Criterios de evaluación

### Cumplimiento de implementación
- Cada requisito original tiene evidencia en el código actual.
- El contrato frontend/backend coincide.
- Se preserva la compatibilidad histórica declarada.
- Las tareas canceladas o sustituidas no reaparecen inadvertidamente.
- La implementación coincide con el alcance aprobado.

### Calidad técnica
- Funciones con responsabilidades claras y dependencias explícitas.
- Ausencia de duplicación evitable, funciones muertas o rutas huérfanas.
- Validación robusta de entradas y errores.
- Seguridad de sesión, permisos, datos y HTML.
- Idempotencia, concurrencia y consistencia transaccional cuando corresponda.
- Rendimiento, paginación, caché y límites apropiados.
- Accesibilidad, responsive y coherencia de interfaz cuando corresponda.
- Compatibilidad con PWA, offline y navegadores soportados.

### Niveles de evidencia
- E0: solo descripción o commit.
- E1: revisión estática del código.
- E2: pruebas sintácticas/estáticas y comparación de cambios.
- E3: pruebas unitarias o aisladas simuladas.
- E4: navegador/HTTP/Apps Script de prueba.
- E5: validación funcional en deployment y datos reales controlados.

No se asignará E4/E5 a una tarea basándose únicamente en documentación. No se ejecutarán escrituras productivas como parte de la auditoría estática.

## 8. Registro de hallazgos y tareas nuevas

- Auditoría.txt conserva el registro técnico histórico y recibirá referencias de cada iteración.
- Plan_auditoría/Plan_Auditoria.md mantiene el catálogo, las fases, el avance y las referencias de cada checkpoint.
- Plan_auditoría/Aug_Tareas.md registra nuevas tareas derivadas de hallazgos, con ID, prioridad, evidencia, dependencia, criterio de aceptación y estado.
- No se duplicarán tareas que ya existan en Tareas.txt; se enlazarán por nombre y sección.
- No se eliminará ni reescribirá la trazabilidad previa.

## 9. Registro inicial de avance

| Registro | Estado |
|---|---|
| Revisión de Proceso de desarollo.md | COMPLETADA |
| Revisión de contexto_personal.md | COMPLETADA |
| Confirmación de ramas y HEAD | COMPLETADA |
| Recuperación del historial desde 2026-01-01 | COMPLETADA a nivel de metadatos de commits |
| Inventario de módulos actuales | COMPLETADO a nivel de árbol Git |
| Correlación exhaustiva de cada commit con su diff y tarea | PENDIENTE |
| Auditoría de código por tarea | PENDIENTE |
| Evaluación de calidad por tarea | PENDIENTE |
| Verificación de cancelaciones/sustituciones por código e historial | PENDIENTE |
| Matriz funcional consolidada | PENDIENTE |

**Estado global:** PLANIFICACIÓN INICIAL REGISTRADA. LA AUDITORÍA TÉCNICA DE LAS 37 UNIDADES TODAVÍA NO SE DECLARA COMPLETADA.

## 10. Próxima acción

Continuar la Fase F3 con **AUD-T-029 — Auditoría recursiva Drive, rendimiento, snapshot, lotes y reanudación**. Crear el checkpoint individual antes de comenzar; mantener la auditoría estática y no mover, renombrar, borrar ni compartir archivos reales.


## 11. Iteración técnica — AUD-T-002

**Sesión:** AUD-20261107-S002  
**Checkpoint:** AUD-CP-0002  
**Estado:** AUDITADA PARCIALMENTE; HALLAZGOS ABIERTOS.  
**Commit de auditoría:** `audit(auth): revisar RBAC y ciclo de identidad` (SHA se identifica en el historial).

### Alcance preciso
Se auditó RBAC, AUTH, USERS, identidad y operaciones de administración de usuarios. La aceptación legal B02/B03 se separa para AUD-T-036. La calidad del algoritmo de hash y la migración de credenciales se profundizará en AUD-T-023. La política completa de ciclo de sesión se profundizará en AUD-T-024.

### Historial recuperado y atribución
- `975c59135bf243eb299585691b25a3d22b8d2e8f` — Add files via upload: incorpora el frontend modular inicial, auth.js, users.html y api-config.js.
- `9e74e6452368229e8eaa6d611853530cd5b79dea` — Add files via upload: incorpora Services/Auth.js y Services/users.js junto con los demás microservicios.
- `97eef18cd5c07eabc1c9a1f68f6b5710f3a3b4bf` — Implementar Tarea 2: RBAC, sesión y cumplimiento legal. Este commit cambia el estado documental a COMPLETADA y agrega comentarios identificativos; no es el commit que introduce los servicios completos.
- `2678ee0242a4b78be61d6c799f6a53d6ce8d0715` — Separar purga de Logs y agregar control de sesiones.
- `b441a5be9a04770b2d535490eb73bc9478375e9b` — fix: prevent duplicate user accounts.
- `0666c1d189136dbad66c5c6523f8419b8d447002` — fix(auth): apply confirmed session limits and evict one oldest session.
- `4bc9ac19b81dd0a9cc38a21e2806973ba3bc5fb3` — fix(auth): serialize concurrent session management.

### Archivos y funciones revisados
- `Services/Auth.js` blob `fc69357b655c023b5ab3f7dd72cdab6fbb1787ed`: SESSION_LIMITS; normalizePassword(); createPasswordHash(); verifyStoredPassword(); getLoginAttemptCacheKey(); beginLoginAttempt(); resetLoginAttempts(); rollbackLoginAttempt(); logToSheet(); doGet(); doPost(); handleLogin(); handleValidateSession().
- `Services/users.js` blob `9b7ce20b40e5fdac1f1c106e769f9e539ad858b0`: getSpreadsheet(); hash/verificación; doGet(); doPost(); getVerifiedSession(); handleGetUsers(); handleResetUserSessions(); handleCreateUser(); handleUpdateUser(); handleDeleteUser(); handleUpdateProfile(); handleChangePassword().
- `auth.js` blob `2dc65f2e5903fc208ca14505053e82203a9dbd86`: handleLoginSuccess(); loadInitialData(); processCatalogData(); checkSession(); login(); logout().
- `users.html` blob `e41f402675677a4d2783493614737021ec2eade5`: remoteLog(); inicialización DOMContentLoaded; displayProfile(); postToAction(); fetchUsers(); renderUserTable(); setupEventListeners(); openUserModal(); handleUserFormSubmit(); deleteUser(); resetUserSessions(); handleChangePasswordSubmit(); handleEditNameSubmit().
- `api-config.js` blob `a5c718d01b7da50b4b5e650c3bacd91456f4d670`: ACTION_TO_SERVICE_MAP; routeAction(); login(); validateSession().
- `Services/Test/Auth.js` y `Services/Test/users.js`: comparadas con los originales. Tras normalizar SPREADSHEET_ID, las diferencias se limitan al comentario de ID de copia de prueba y dos líneas vacías finales en users.js. Services/Test/README.md indica que deben instalarse en proyectos Apps Script separados y que el repositorio no contiene sus URLs de deployment.

### Cumplimiento de implementación
- **RBAC backend:** PARCIALMENTE CUMPLIDO. USERS obtiene el rol de la fila Users vinculada al token; getUsers, createUser, updateUser y deleteUser aplican matrices de rol en servidor. updateProfile y changePassword verifican que el userId corresponda al usuario asociado a la sesión. resetUserSessions exige Desarrollador.
- **Interfaz de usuarios:** CUMPLIMIENTO ESTÁTICO PARCIAL. users.html limita la visibilidad por rol y transmite sessionToken. Esa visibilidad no se considera una barrera de seguridad; la autorización efectiva está en backend.
- **Identidad:** la autorización de USERS no depende de un rol enviado por el navegador. El nombre de perfil se obtiene desde Users en backend.
- **Duplicados:** b441a5be incorpora comparación de nombres normalizados por trim y minúsculas, bajo ScriptLock en handleCreateUser().
- **Límites de sesión:** la discrepancia histórica de Gefe está resuelta en el código actual: `gefe: 10`, `jefe: 3`, Supervisor 3, Técnico 2, Técnico exterior 1 y Desarrollador sin límite. Tareas.txt registra el cierre de la decisión.
- **Serialización AUTH:** login, contador de intentos y logging utilizan ScriptLock dentro del proyecto AUTH; la iteración 4bc9ac19 corrigió la gestión concurrente de sesiones.
- **No se considera cerrado el ciclo de identidad** por los hallazgos H-AUD-001 a H-AUD-006.

### Hallazgos
- **H-AUD-001 — ALTO:** handleDeleteUser() elimina la fila de Users pero no elimina los registros ActiveSessions. handleValidateSession() en AUTH solo busca userId + token en ActiveSessions y no confirma que el usuario siga existiendo en Users. Por tanto, el endpoint de validación puede responder valid:true para una cuenta eliminada mientras permanezca su registro de sesión. La sesión queda huérfana; otros servicios pueden rechazarla si verifican Users, pero el frontend recibe una validación positiva de AUTH.
- **H-AUD-002 — ALTO:** auth.js logout() solo elimina gpsepedia_session del localStorage y muestra el login. AUTH doPost() no ofrece acción logout/revoke y api-config.js no mapea ninguna acción de revocación. El token permanece en ActiveSessions y puede seguir validándose hasta que otra operación lo elimine o la política de límites lo desplace.
- **H-AUD-003 — MEDIO / DECISIÓN DE POLÍTICA:** ActiveSessions.date se escribe durante login, pero handleValidateSession() y getVerifiedSession() no verifican edad, expiración ni inactividad. Tampoco se revocan automáticamente las demás sesiones al cambiar una contraseña o resetearla administrativamente. No se presume una duración requerida: definir primero política de expiración y revocación.
- **H-AUD-004 — MEDIO:** checkSession() en auth.js declara LOCK_TIMEOUT=5000 y usa localStorage session_validation_lock, pero elimina la clave en finally inmediatamente después de programar apiValidateSession(). La validación HTTP no se espera dentro del bloqueo; las pestañas pueden competir por el mismo estado y no existe adquisición atómica compare-and-set. El bloqueo no garantiza exclusión entre pestañas.
- **H-AUD-005 — MEDIO:** handleCreateUser() normaliza Nombre_Usuario con trim() y verifica duplicados, pero no rechaza explícitamente una cadena vacía después de normalizar. El atributo required de users.html no sustituye la validación backend; una llamada directa puede crear una cuenta sin nombre utilizable para login.
- **H-AUD-006 — MEDIO:** no todas las mutaciones USERS están serializadas. handleCreateUser() y handleResetUserSessions() usan ScriptLock; handleUpdateUser(), handleDeleteUser(), handleUpdateProfile() y handleChangePassword() no lo hacen. Además, ScriptLock pertenece al proyecto Apps Script, por lo que el lock de AUTH no coordina con USERS. La coordinación inter-servicios se enlaza con AUD-T-033; no se duplica su tarea existente.

### Calidad y mantenibilidad
**Fortalezas**
- Autorización de operaciones sensibles en backend, no solo por visibilidad de botones.
- Comparación de hashes en tiempo constante y salt individual.
- Contador de intentos con bloqueo y serialización local a AUTH.
- Gestión de límites de sesiones explícita y corregida para Gefe.
- Duplicados de usuario controlados bajo lock en creación.
- Copias de prueba separadas para AUTH y USERS; el README advierte que son proyectos Apps Script distintos.
- No se encontró registro directo de contraseña ni token en los callsites actuales de logToSheet(); doPost registra la acción y los errores/stack, no request.payload.

**Debilidades**
- Ciclo de vida de sesión incompleto: sin revocación al logout ni limpieza al eliminar usuario.
- El validador AUTH no comprueba existencia actual del usuario.
- Política de expiración no definida ni aplicada.
- Bloqueo frontend entre pestañas no efectivo.
- Mutaciones de USERS con cobertura de lock desigual.
- Validación de nombre de usuario incompleta en backend.
- Las funciones de hash están duplicadas entre AUTH y USERS; su compatibilidad se conserva ahora, pero exige revisión coordinada en AUD-T-023.
- El uso de SHA-256 rápido y la migración de contraseñas se reservan a AUD-T-023; no se declara aquí como KDF robusta.

### Cancelaciones, sustituciones y prevención de regresiones
- La incidencia histórica de SESSION_LIMITS para Gefe (clave `jefe` frente a rol normalizado `gefe`) está resuelta por el cambio que incorporó `gefe:10` y `jefe:3`, documentado en Tareas.txt y en commits 0666c1d1/4bc9ac19. No reabrir ni revertir.
- El commit 97eef18 marca Tarea 2 como COMPLETADA, pero su cambio funcional de código se limita a comentarios identificativos y documentación. La fuente real de servicios se había incorporado en 9e74e645 y el frontend modular en 975c591. La auditoría conserva esa atribución para no adjudicar al commit de cierre cambios que no contiene.
- B02/B03 (términos y aviso legal) se separan a AUD-T-036; no se reescriben ni se eliminan por esta iteración.
- La revisión de contraseñas/hashing/logs queda separada en AUD-T-023.
- El diseño de expiración, revocación y límites de sesiones se profundiza en AUD-T-024.
- La coordinación entre AUTH y USERS se vincula con AUD-T-033.

### Evidencia y límites
- Nivel alcanzado en esta iteración: E1/E2 (inspección estática de fuentes, trazabilidad de commits y comparación de copias de prueba).
- Los registros históricos documentan pruebas aisladas/mock previas, pero no se reprodujeron en esta sesión.
- No se ejecutó navegador, Apps Script, HTTP ni deployments.
- No se accedió ni escribió en la Spreadsheet productiva o de prueba.
- No se verificó la validez de sesiones reales ni el estado de los deployments.
- No se modificó código.

### Estado final de AUD-T-002
**PARCIALMENTE CUMPLIDA; REQUIERE TAREAS AUG-005 A AUG-010 Y VALIDACIÓN FUNCIONAL POSTERIOR.** La autorización RBAC básica existe en backend, pero el ciclo de identidad y sesión presenta brechas de revocación, consistencia y validación.

### Próxima iteración
AUD-T-023 — Seguridad de contraseñas, hashing, logs y migración. Después AUD-T-024 — ciclo de vida, límites y concurrencia de sesiones. La parte legal se auditará en AUD-T-036.


### Resultado de AUD-T-023 — 2026-11-07

- Sesión/checkpoint: AUD-20261107-S004 / AUD-CP-0004.
- HEAD auditado: 87d75c38d72e76ed60132d2507661f4e1017a0e8; HEAD base: d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Fuentes revisadas: AUTH, USERS, ADMIN, FEEDBACK, api-config, auth.js, users.html y copias de prueba; diffs históricos y documentación.
- Hallazgos H-AUD-023-001 a H-AUD-023-008: KDF débil; carrera entre migración legacy y cambio de contraseña; mutaciones de contraseña no serializadas; contador de intentos vulnerable a concurrencia; carrera entre purga e inserción de Logs; migración legacy incompleta para cuentas inactivas; fallback de formatos desconocidos a legacy; discrepancia de validación UI y typo.
- AUG-011 a AUG-014 se incorporan a Aug_Tareas.md y Tareas.txt. AUG-010 recibe adenda para escrituras de contraseña y coordinación interservicios.
- Fortalezas: AUTH ya no registra payload/contraseñas en los callsites actuales examinados; las rutas de escritura de USERS generan hash; clearSensitiveLogs está restringida a Desarrollador.
- Limitaciones: no se inspeccionó Logs real, no se verificaron deployments y no se ejecutaron pruebas Apps Script/HTTP/navegador/Spreadsheet/Drive. Las copias Test no son suite automatizada.
- No se modificó código ni datos. Evidencia E1/E2. Siguiente unidad: AUD-T-024.


## 12. Iteración técnica — AUD-T-024

**Sesión:** AUD-20261107-S005  
**Checkpoint:** AUD-CP-0005  
**HEAD auditado:** 3e458bbf67fce2a95847f4f5a0bf5d72170d4eec  
**HEAD base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Estado:** AUDITORÍA ESTÁTICA COMPLETADA (E1); HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE.

### Alcance y archivos revisados
Services/Auth.js, Services/users.js, Services/Test/Auth.js, Services/Test/users.js, auth.js, users.html, api-config.js, main.js, ui.js, state.js, index.html y Services/Test/README.md. Se recuperaron y contrastaron los diffs de 2678ee02, 0666c1d1, 4bc9ac19 y b441a5be.

### Resultado
- Se confirmó que los límites de sesión por rol están corregidos y que AUTH serializa su propia sección crítica de login.
- Se confirmó que USERS deriva el rol desde el token y protege resetUserSessions en backend para Desarrollador.
- Continúan abiertos los problemas de revocación al logout, expiración, sesiones huérfanas tras eliminación y validación AUTH sin consulta a Users.
- Se detectó carrera entre login AUTH y resetUserSessions USERS por tratarse de proyectos separados con ScriptLock independientes.
- Se detectaron riesgos de escritura parcial en la creación de sesión y en el cierre remoto de varias sesiones.
- checkSession conserva la coordinación defectuosa entre pestañas y una respuesta asíncrona obsoleta puede borrar una sesión nueva.
- showApp puede mantener visibles Inbox/Dashboard después de cambiar a una cuenta con menor privilegio; backend continúa siendo la barrera efectiva.

### Hallazgos
H-AUD-024-001 a H-AUD-024-010. Evidencia, impacto, severidad y relaciones se encuentran en Auditoría.txt.

### Tareas relacionadas
- Ampliar AUG-005, AUG-006, AUG-007 y AUG-008 con la evidencia confirmada.
- Relacionar AUG-010 y AUD-T-033 con la coordinación entre AUTH y USERS.
- Crear AUG-016 para consistencia y recuperación de mutaciones de sesión.
- Crear AUG-017 para restablecer visibilidad de navegación según el rol de cada sesión.

### Validaciones y límites
- Evidencia E1: revisión estática de fuentes, historial y diffs.
- No se ejecutaron pruebas sintácticas E2, Apps Script, HTTP, navegador, Spreadsheet, Drive ni pruebas concurrentes reales.
- No se modificó código ni se desplegaron servicios.
- La matriz funcional consolidada continúa pendiente.

### Siguiente iteración
AUD-T-025 — herramientas ADMIN: base de datos, backup, restore, logs y mantenimiento.




## 13. Iteración técnica — AUD-T-025

**Sesión:** AUD-20261107-S006  
**Checkpoint:** AUD-CP-0006  
**HEAD auditado:** 941dfb166ae5af4631d0711d50ab3d45cf7225c1  
**HEAD base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Estado:** AUDITORÍA ESTÁTICA COMPLETADA (E1); HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE.

### Alcance y archivos revisados
Services/admin.js, Services/feedback.js, ui.js, api-config.js, index.html, README.md y Services/Test/README.md. Se contrastaron los cambios históricos babf5ce4, 2678ee02, e5c49b1d, abc7102f, 8001b431 y 06c3b322.

### Resultado
- Se confirmó la protección general de ADMIN por sesión Desarrollador para todas las acciones salvo ping.
- Se verificó la validación de identidad/tipo/ubicación de los recursos de respaldo y el campo compartido de enlaces.
- Se detectó que restoreDatabase elimina las hojas actuales antes de copiar y no dispone de rollback ni respaldo automático inmediato del destino.
- Se confirmó que restoreDrive limpia Cortes antes de copiar y no dispone de rollback.
- La copia recursiva de Drive no genera manifiesto ni mecanismo de reanudación; un contenedor parcial puede conservar un nombre aceptado por restoreDrive.
- La terminal Drive no verifica que currentFolderId, fileId y targetFolderId permanezcan dentro del árbol Cortes.
- getActivityLogs carga toda la hoja para devolver solo 100 filas; la purga por antigüedad deja silenciosamente timestamps inválidos.
- doPost de ADMIN mantiene logs únicamente en el arreglo de respuesta, sin registro persistente.
- El vaciado de IndexedDB no espera el resultado asíncrono de deleteDatabase.
- createSheet/addColumn no tienen ruta canónica en ACTION_TO_SERVICE_MAP ni consumidor frontend identificado.
- H-AUD-023-005/AUG-013 se mantiene vigente para la carrera de purga Logs frente a inserciones AUTH; no se duplica su ID.

### Hallazgos
H-AUD-025-001 a H-AUD-025-009. Evidencia, líneas, impacto y referencias cruzadas en Auditoría.txt.

### Tareas derivadas
- AUG-013 se mantiene abierta y se reconfirma por la coordinación de purga Logs/AUTH.
- AUG-018 — restauraciones recuperables e integridad de respaldos DB/Drive.
- AUG-019 — limitar la terminal Drive al árbol Cortes.
- AUG-020 — escalabilidad y tratamiento de timestamps inválidos en ActividadUsuario.
- AUG-021 — registro persistente de operaciones administrativas sensibles.
- AUG-022 — esperar y verificar la eliminación asíncrona de IndexedDB.
- AUG-023 — resolver el estado de acciones ADMIN sin ruta/consumidor.

### Validaciones y límites
- Evidencia E1 solamente.
- No se ejecutaron pruebas Apps Script, HTTP, navegador, Drive, Spreadsheet ni restauraciones/purgas reales.
- No se modificó código ni se desplegaron servicios.
- La matriz funcional consolidada continúa pendiente.

### Siguiente iteración
AUD-T-026 — Telemetría, diagnóstico y health check de microservicios.
 
## 14. Iteración técnica — AUD-T-026

**Sesión:** AUD-20261107-S007  
**Checkpoint:** AUD-CP-0007  
**HEAD auditado:** eafb425abadc9ccda9964a5abd50d4ac020cf80a  
**HEAD base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Estado:** AUDITORÍA ESTÁTICA COMPLETADA (E1); HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL Y VERIFICACIÓN DE BACKEND/DEPLOYMENTS PENDIENTES.

### Alcance y archivos revisados
api-config.js, ui.js, index.html, style.css, main.js, auth.js, offline.js, youtubeUpload.js, README.md y Services/Test/README.md. Se revisaron los contratos de routeAction()/checkAllServicesHealth(), las tarjetas, el detalle, el gráfico, el inicio del ping, los puntos de llamada y los cambios históricos e1defcb6 y 726727b6.

### Resultado
- Se confirmó que el monitoreo GET usa timeout individual de ocho segundos y aísla errores por servicio.
- Se detectó que el ping POST de ADMIN no tiene timeout y precede al escaneo; una solicitud pendiente puede impedir que comience el diagnóstico de todos los servicios.
- Se detectó que una respuesta HTTP 2xx con cuerpo inválido/no reconocible puede clasificarse como online.
- No se implementan estados slow, unknown ni stale; tampoco se muestra en el detalle el código HTTP ni el motivo de error que ya devuelve el helper.
- La vista de métricas no se refresca por el paso del tiempo y puede conservar datos caducados si no llegan nuevas solicitudes.
- La gráfica usa la hora de finalización de cada solicitud aunque la etiqueta habla de solicitudes iniciadas; la ventana de quince buckets no cubre íntegramente todos los eventos que pueden seguir dentro de la ventana temporal. El límite de 600 eventos no muestra advertencia de truncamiento.
- Se confirmó que la telemetría es local, temporal y sin payloads/credenciales; no representa tráfico global ni ejecuciones internas.
- El backend está fuera del repositorio; no se pudieron verificar contratos GET ni deployments. El riesgo histórico de exposición de IDs en respuestas debug queda condicionado a una verificación actual.

### Hallazgos
H-AUD-026-001 a H-AUD-026-005. Evidencia, ubicación, impacto y controles positivos en Auditoría.txt.

### Tareas derivadas
- AUG-024 — robustecer el contrato de salud, clasificación de estados, timeout del ping, visibilidad de errores y verificación segura de endpoints/deployments.
- AUG-025 — corregir vigencia, semántica temporal, ventana y truncamiento de telemetría local.

### Validaciones y límites
- Evidencia E1 solamente.
- No se ejecutaron pruebas HTTP, navegador, Apps Script, Sheets, Drive ni pruebas de latencia/concurrencia reales.
- No se verificaron los deployments ni las fuentes backend privadas.
- No se modificó código ni se desplegaron servicios.

### Siguiente iteración
AUD-T-027 — Historial de imágenes reemplazadas y acciones de gestión.


## 15. Iteración técnica — AUD-T-027

**Sesión:** AUD-20261107-S008  
**Checkpoint:** AUD-CP-0008  
**HEAD auditado:** 6932cf19d77c9c020a02e3d766b937f3175b8985  
**Árbol auditado:** eaaf93248d171c283ca59976579691e777361077  
**HEAD base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Estado:** AUDITORÍA ESTÁTICA E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE.

### Alcance
Historial de reemplazos, editor in-modal, ledger idempotente, consulta, restauración, papelera, descarga, movimiento, carpetas, autorización backend, contratos, esquema y UI.

### Historial principal
- 8f97d253cae071ba633026cd207af675f570ad9c — implementación base.
- 9e9918c7e9858fcb6a8be3fc423fb533555cb17a — seguridad/consistencia/restauración.
- 91f75de3ca1e8d7b64801f00fa0c98adea2809e9 — gestor y monitor.
- d99ab2d42c6e0d428ea7fd272e605b8a6d3c0dbe — idempotencia in-modal.
- 693f4825216996e3682c69985c666c0d8b21357c — organización automática; observación transferida a AUD-T-028.

### Resultado
- Hallazgos H-AUD-027-001 a H-AUD-027-006 y decisiones H-AUD-027-007/008 documentados en Auditoría.txt.
- AUG-026 y AUG-027 añadidas; AUG-021 ampliada; AUG-003/AUD-T-033 referenciada sin duplicar.
- AUD-IMG-01, 02, 04, 05, 06 y 07 revisados; AUD-IMG-03 requiere confirmar el alcance vigente.
- No se modificó código, datos, endpoints, configuración ni deployments.
- Evidencia E1. No se ejecutaron pruebas HTTP, navegador/PWA, Apps Script, Drive, Spreadsheet o concurrencia.
- Siguiente unidad: AUD-T-028 — Inventario de imágenes sin uso, clasificación y monitor global de Drive.


## 16. Iteración técnica — AUD-T-028

**Sesión:** AUD-20261107-S009  
**Checkpoint:** AUD-CP-0009  
**HEAD auditado:** a1e66b81eb4ea146dfc76e9e2980f41b64a8c124  
**Árbol auditado:** 4adb052da52733e812fc9a4f0d0e5d848c879de3  
**HEAD base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Estado:** AUDITORÍA ESTÁTICA E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE.

### Alcance
Inventario de imágenes sin uso, clasificación, escaneo recursivo, persistencia local y en Spreadsheet, organización, movimientos manuales, monitor global de almacenamiento y síntoma de 14 archivos.

### Historial contrastado
- 7983febe — persistencia del inventario en Spreadsheet.
- 91f75de3 — gestor/monitor global y requisitos posteriores 6.1–6.9.
- 693f4825 — organización automática posterior al inventario, en conflicto con la aclaración posterior de acciones explícitas.

### Resultado
- Hallazgos H-AUD-028-001 a H-AUD-028-009 documentados en Auditoría.txt.
- AUG-028/AUG-029/AUG-030 creadas; AUG-021/AUG-026/AUG-003 ampliadas.
- No hay límite total de 14 en el código; el síntoma permanece sin causa confirmada por falta de acceso a Drive/deployment.
- El monitor global está implementado estáticamente; OAuth/deployment y cuota real pendientes.
- No se modificó código, datos, endpoints, configuración ni deployments.
- Evidencia E1; no se ejecutaron pruebas HTTP, navegador/PWA, Apps Script, Drive, Spreadsheet, cuota real ni concurrencia.
- Siguiente unidad: AUD-T-029 — Auditoría recursiva Drive, rendimiento, snapshot, lotes y reanudación.


## 15. Iteración técnica — AUD-T-029

**Sesión:** AUD-20261107-S010  
**Checkpoint:** AUD-CP-0010  
**HEAD auditado:** 4061bbb67bcf1fc0c2786185fc42ed2ea804b9e9  
**HEAD base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Estado:** AUDITORÍA ESTÁTICA E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE.

### Archivos y alcance
Services/admin.js, ui.js, offline.js, api-config.js e index.html. Se revisaron funciones de snapshot, iteradores Drive, pila de continuación, límites de lote, persistencia IndexedDB y contrato frontend/backend; además se contrastaron los commits 7a4539f1, d305b1ab, f3f7102d, 06c3b322 y la reestructuración 91f75de3.

### Resultado
- H-AUD-029-001 a H-AUD-029-008 documentados en Auditoría.txt.
- Se confirmó el recorrido DFS por lotes y snapshot reutilizado entre continuaciones; el snapshot vigente es JSON directo, con máximo 750,000 caracteres y TTL 21,600 segundos.
- Se detectó que una pila de cursor vacía puede ser interpretada por ADMIN como finalización; la firma de repetición frontend incluye contadores y no representa únicamente la posición del iterador.
- IndexedDB persiste el arreglo completo por lote bajo una sola clave compartida entre pestañas.
- Se identificaron costes por lectura amplia de Cortes, lotes fijos y validación repetida de ancestros.

### Tareas derivadas
- Ampliar AUG-028 y AUG-030.
- Crear AUG-031, AUG-032 y AUG-033.

### Evidencia y límites
E1: inspección estática e historial Git. No se ejecutaron pruebas E2–E5, navegador, Apps Script, HTTP, Drive, Spreadsheet ni concurrencia. No se modificó código ni datos productivos.

### Siguiente iteración
AUD-T-030 — Esquema Spreadsheet, IDs de cortes, opId/idOperacion y migraciones.


## 16. Iteración técnica — AUD-T-030

**Sesión:** AUD-20261107-S011  
**Checkpoint:** AUD-CP-0011  
**HEAD auditado:** c8c971ed061f08fca212f6879b35c857d9a0192c  
**HEAD base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Estado:** AUDITORÍA ESTÁTICA E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE.

### Archivos y alcance
Spreadsheet/GPSpedia_DB_columnas.md; Services/write.js; Services/admin.js; ui.js; add_cortes.html; api-config.js. Se revisaron los helpers de esquema e idempotencia, asignación de IDs, migración VIN, validación de respaldo, recuperación de operaciones y contratos frontend/backend. Historial contrastado: 6cb4a3cb, 94c2d04e, 7dcd1225 y 36196020.

### Resultado
- La ausencia de la hoja Idempotencia y de columnas objetivo en la copia original no constituye por sí misma un defecto: el código las crea/migra bajo demanda.
- La asignación de IDs está centralizada en WRITE y ADMIN delega en ese servicio.
- H-AUD-030-001 a H-AUD-030-008 documentados en Auditoría.txt.
- Los riesgos prioritarios son la falta de coordinación de la migración con mutaciones WRITE y la aceptación de registros de idempotencia con estados/duplicados no validados.

### Tareas derivadas
AUG-034, AUG-035 y AUG-036; H-AUD-030-005 se incorpora a la matriz de recuperación de AUG-035. Relación con AUD-T-033/AUG-003.

### Evidencia y límites
E1: inspección estática e historial Git. No se ejecutaron pruebas E2/E3, Apps Script, HTTP, navegador/PWA, Drive, Spreadsheet real, migración ni concurrencia. No se modificó código ni datos productivos.

### Siguiente iteración
AUD-T-031 — Subidas de imágenes, reintentos, reconciliación Drive/Spreadsheet e idempotencia.


## 17. Iteración técnica — AUD-T-031

**Sesión:** AUD-20261107-S012  
**Checkpoint:** AUD-CP-0012  
**HEAD auditado:** 71058f8b1924d59924fa289f66226aeaac41b7bc  
**HEAD base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Estado:** AUDITORÍA ESTÁTICA E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE.

### Archivos y alcance
Services/write.js, Services/admin.js, ui.js, offline.js, add_cortes.html y Spreadsheet/GPSpedia_DB_columnas.md. Se revisaron cargas generales, recuperación por token, ledger AdminImageUploads, historial REP-<opId>, compensaciones, IndexedDB y descarte del modal. Historial contrastado: 2e41428e, d99ab2d4 y 2212b4f5.

### Resultado
- H-AUD-031-001 a H-AUD-031-010 documentados en Auditoría.txt.
- El flujo in-modal tiene persistencia local previa, hash SHA-256 y ledger, pero el descarte de cambios puede revertir la URL sin compensar ledger/historial/Drive.
- El helper general de Drive no verifica de nuevo el contenido de un archivo recuperado; MIME/tamaño no sustituyen una comparación de hash.
- No se encontró un reconciliador general de archivos pending.

### Tareas derivadas
Ampliar AUG-034 y AUG-035; crear AUG-037 y AUG-038.

### Evidencia y límites
E1: inspección estática e historial Git. No se ejecutaron pruebas E2/E3, Apps Script, HTTP, navegador/PWA, Drive, Spreadsheet real, fallos inducidos ni concurrencia.

### Siguiente iteración
AUD-T-032 — Identidad autenticada del colaborador en WRITE y ADMIN.


## 18. Iteración técnica — AUD-T-032

**Sesión:** AUD-20261107-S013  
**Checkpoint:** AUD-CP-0013  
**HEAD auditado:** ad13f5340152ff42b552f06184d2a2adb17117c9  
**HEAD base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Estado:** AUDITORÍA ESTÁTICA E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE.

### Archivos y alcance
Services/write.js, Services/admin.js, Services/Auth.js, Services/users.js, api-config.js, add_cortes.html, ui.js y Services/Test. Se revisaron validación de sesiones, atribución en addOrUpdateCut, mutaciones suplementarias, checkOperation, asignación de IDs y consumidores frontend. Historial contrastado: commit 36196020.

### Resultado
- H-AUD-032-001 a H-AUD-032-003 documentados en Auditoría.txt.
- La atribución de addOrUpdateCut se mantiene protegida en WRITE y ADMIN.
- Se detectó una mutación WRITE sin autenticación en addSupplementaryInfo; checkOperation no valida sesión y devuelve rowData completo; allocateVehicleId no restringe el rol.
- Services/Test solo contiene copias aisladas AUTH/USERS; faltan entornos equivalentes WRITE/ADMIN.

### Tareas derivadas
AUG-039 — completar autorización y minimización de datos en WRITE. AUG-024 recibe adenda por los identificadores expuestos en doGet(debug=true). La discrepancia del enlace manual de vídeo se transfiere a AUD-T-035. La coordinación de revocación permanece en AUD-T-024/AUG-016 y AUD-T-033/AUG-003.

### Evidencia y límites
E1: inspección estática e historial Git. No se ejecutaron pruebas E2/E3, Apps Script, HTTP, navegador/PWA, Drive, Spreadsheet real, sesiones revocadas ni concurrencia. No se modificó código ni datos productivos.

### Siguiente iteración
AUD-T-033 — Coordinación de mutaciones entre servicios y Utilities.

## 19. Iteración técnica — AUD-T-033

**Sesión:** AUD-20261107-S014  
**Checkpoint:** AUD-CP-0014  
**HEAD auditado:** 32b4898e967aea45a9372aa127cb0735aed99fc5  
**HEAD base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Estado:** AUDITORÍA ESTÁTICA E1 COMPLETADA; PROTOCOLO COMPARTIDO AUSENTE; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE.

### Utilities
La fuente se localizó en Services/Utilities.js (U mayúscula), versión 1.3.0. Solo implementa migrateTimestamps; no implementa migrateYearRanges aunque api-config.js mapea ambas acciones. No se encontraron callsites frontend actuales. El servicio declara AUTH: NONE, no usa lock y limpia Hoja 1 antes de reconstruirla. No es un coordinador de mutaciones. El deployment publicado no fue verificado.

### Coordinación interservicios
No existe autoridad común, lease ni lock compartido en WRITE, ADMIN, FEEDBACK y UTILITIES. Los ScriptLock/ScriptProperties/ScriptCache revisados son locales al proyecto. Se reafirman los riesgos de restauración/reorganización, movimientos de imágenes, migración VIN/opId y snapshots que pueden competir con escritores de otro deployment. ADMIN reorganiza Cortes después de que WRITE libera el lock. FEEDBACK también escribe Cortes mediante suggestYear, recordLike, assignCollaborator y approveVideo.

### Hallazgos
- H-AUD-033-001 a H-AUD-033-007 documentados en Auditoría.txt.
- AUG-003 queda auditada: fuente identificada, contrato parcial y ausencia de coordinador demostrada.
- AUG-034 se amplía para cubrir todos los escritores y operaciones de mantenimiento identificados.
- AUG-040 cubre seguridad/integridad de FEEDBACK; AUG-041 cubre autorización, contrato y recuperación de UTILITIES.

### Evidencia y límites
E1: inspección estática de funciones, rutas y callsites. No se ejecutaron Apps Script, HTTP, navegador, Drive, Spreadsheet real ni concurrencia. No se verificó el deployment publicado de UTILITIES. No se modificó código ni datos productivos.

### Siguiente iteración
AUD-T-034 — Acceso y visibilidad del panel/historial por rol y sesión.

## 20. Iteración técnica — AUD-T-034

**Sesión:** AUD-20261107-S015  
**Checkpoint:** AUD-CP-0015  
**HEAD auditado:** 3819d0d73368982a5a463fb89515e13ec452dde3  
**HEAD base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Estado:** AUDITORÍA ESTÁTICA E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE.

### Controles de backend
ADMIN exige Desarrollador para todas las acciones POST salvo ping; getReplacedImages/historial está protegido. FEEDBACK y USERS vuelven a validar sesión y rol desde servidor. El botón de desarrollador se muestra solo para Privilegios=Desarrollador. El historial se encuentra dentro de la pestaña Imágenes y Drive.

### Hallazgos
- H-AUD-034-001 a H-AUD-034-004 documentados en Auditoría.txt.
- logout no limpia estado privilegiado en memoria ni modales; el token remoto sigue activo hasta completar AUG-006.
- cambio de Privilegios no actualiza ni invalida la sesión del objetivo; la interfaz puede quedar obsoleta aunque el backend vuelva a comprobar el rol.
- showApp no oculta expresamente Inbox/Dashboard en todos los casos; Jefe está permitido por getFeedbackItems pero no ve el botón.
- renderInboxDetail consulta currentUser.Rol, mientras AUTH devuelve Privilegios; los botones de aprobación pueden no aparecer.

### Tareas derivadas
AUG-006, AUG-016 y AUG-017 reciben adendas. Se crea AUG-042 para sincronizar rol y limpiar el estado privilegiado en el cliente. No se duplica la revocación backend ya registrada en AUG-006 ni la coordinación de sesiones de AUG-016.

### Evidencia y límites
E1: inspección estática de AUTH, USERS, ADMIN, FEEDBACK, UI, HTML y llamadas. No se ejecutaron pruebas de navegador, HTTP, Apps Script, sesión real, cambio de rol ni cuenta compartida. No se verificó el deployment publicado. No se modificó código ni datos productivos.

### Siguiente iteración
AUD-T-035 — Contratos de acciones frontend/backend y flujos de imagen/vídeo.