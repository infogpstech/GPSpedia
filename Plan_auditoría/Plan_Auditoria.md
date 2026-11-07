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
| AUD-T-002 | RBAC, AUTH, USERS, sesiones, roles, identidad y cumplimiento legal | 97eef18c — Implementar Tarea 2: RBAC, sesión y cumplimiento legal; 414c4258 — Fix greeting name and implement History API in users profile; 6a226c18 — ADMIN 0: retirar credenciales de logs de AUTH | POR AUDITAR |
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
| AUD-T-023 | Seguridad ADMIN 0, registro de credenciales, hashing y migración | ed92f3a9 — reforzar autorización y proteger credenciales; 2e0bbcf7 — SHA-256 y límite de intentos; 6a226c18 — retirar credenciales de logs | POR AUDITAR |
| AUD-T-024 | Administración de usuarios, privilegios, sesiones y controles de acceso | 2678ee02 — purga Logs y control de sesiones; 0666c1d1 — límites de sesión; 4bc9ac19 — serialización concurrente | POR AUDITAR |
| AUD-T-025 | Herramientas ADMIN: base de datos, backup, restore, logs y mantenimiento | babf5ce4 — autorización y purga selectiva; e5c49b1d — enlaces completos en restore; abc7102f — backup/restore compartidos | POR AUDITAR |
| AUD-T-026 | Telemetría, diagnóstico y health check de microservicios | e1defcb6 — restaurar comunicación/health check; 726727b6 — telemetría de servicios | POR AUDITAR |
| AUD-T-027 | Historial de imágenes reemplazadas y acciones de gestión | 8f97d253 — gestión de imágenes reemplazadas; 9e9918c7 — seguridad y consistencia; 91f75de3 — gestor de imágenes sin uso | POR AUDITAR |
| AUD-T-028 | Inventario de imágenes sin uso, clasificación y monitor global de Drive | 7983febe — persistir inventario en Spreadsheet; 91f75de3 — gestor y monitor global; 693f4825 — organización de imágenes sin uso | POR AUDITAR |
| AUD-T-029 | Auditoría recursiva Drive, rendimiento, snapshot, lotes y reanudación | 7a4539f1 — optimizar lotes; d305b1ab — MIME gzip; f3f7102d — persistir progreso; 06c3b322 — robustecer snapshot | POR AUDITAR |
| AUD-T-030 | Esquema Spreadsheet, IDs de cortes, opId/idOperacion y migraciones | 6cb4a3cb — contrato de cortes e idempotencia; 94c2d04e — migración IDs/VIN; 7dcd1225 — asignación centralizada de IDs | POR AUDITAR |
| AUD-T-031 | Subidas de imágenes, reintentos, reconciliación Drive/Spreadsheet e idempotencia | 2e41428e — cargas Drive retry-safe; d99ab2d4 — idempotencia de reemplazos in-modal; 2212b4f5 — find-or-create | POR AUDITAR |
| AUD-T-032 | Identidad autenticada del colaborador en WRITE y ADMIN | 36196020 — validar identidad autenticada; cierre de tarea documentado en checkpoint | POR AUDITAR |
| AUD-T-033 | Coordinación de mutaciones entre servicios y Utilities | 8a3646cc — documentar hallazgos de coordinación; 44d127b3 — Utilities safe order processing; 336915b7/ef2db2e5 — renombramientos de Utilities | POR AUDITAR; no asumir protocolo terminado |
| AUD-T-034 | Acceso y visibilidad del panel/historial por rol y sesión | e4900b37 — normalización rol desarrollador; 0d4c0d01 — diagnóstico acceso historial; 187839c2 — asegurar acceso a gestión de imágenes | POR AUDITAR |
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

Iniciar la primera iteración técnica de la Fase F1: **AUD-T-002 — RBAC, AUTH, USERS, sesiones, roles, identidad y cumplimiento legal**, con lectura completa de los commits/diffs y revisión de Services/Auth.js, Services/users.js, auth.js, users.html, api-config.js y consumidores reales identificados por referencias. Crear un checkpoint individual antes de comenzar esa auditoría.
