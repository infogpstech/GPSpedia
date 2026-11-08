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
| AUD-T-001 | Recuperación del App Shell, arranque, inicialización y estabilización general | 2251d499 — Implementar Tarea 1 y router doGet en admin.js; 4445f2c7 — Mejoras de UI, corrección de sesiones y optimizaciones generales | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VAL-32 PENDIENTE |
| AUD-T-002 | RBAC, AUTH, USERS, roles y autorización de operaciones de usuario (ciclo de sesiones en AUD-T-024; legal en AUD-T-036) | 97eef18c — Implementar Tarea 2: RBAC, sesión y cumplimiento legal; 414c4258 — Fix greeting name and implement History API in users profile; 6a226c18 — ADMIN 0: retirar credenciales de logs de AUTH | E1 ESTÁTICA COMPLETADA; H-AUD-001 a H-AUD-006 ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE (AUD-CP-0042) |
| AUD-T-003 | Registro de vehículos y cortes, add_cortes, idempotencia y resiliencia de red | 14bbd04f — Implementar Tarea 3: Formulario add_cortes, idempotencia y resiliencia; 77ea1d0b — registro sin cortes y recuperación de red; 2eaeb476 — make add-cut modal idempotent | AUDITORÍA ESTÁTICA E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE |
| AUD-T-004 | VIN: identificación, colecciones, almacenamiento, búsqueda y diferencial | 5bab8779 — Implementar Tarea 4: Identificación, colecciones y búsqueda por VIN; df8e5cf7 — motor diferencial VIN; 94c2d04e — migrar IDs de operación y normalizar VIN | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE |
| AUD-T-005 | Modal de detalle, ampliación dinámica y acciones contextuales | d72a1e61 — Implementar Tarea 5: Ampliación dinámica en modal de detalle; 183cff59 — recuperación del botón expand plus | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL/SEGURIDAD PENDIENTE |
| AUD-T-006 | Lightbox, imágenes técnicas, carrusel de cables, PNG transparente y zoom | 7f57e2fd — Implementar Tarea 6: Lightbox y miniaturas PNG transparentes; af9caed8 — navegación de cables de alimentación en lightbox; 5ff81bde — Lightbox zoom y navegación | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN VISUAL/MÓVIL/RENDIMIENTO PENDIENTE |
| AUD-T-007 | Navegación, History API, popstate, overlays y gesto atrás | 09c7a448 — Implementar Tarea 7: Navegación, historial y cierre de overlays; a45f394d — navegación back-gesture; 414c4258 — History API | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL/MÓVIL PENDIENTE |
| AUD-T-008 | Deep links, compartir, enlaces precisos e indicador de red | 7714b985 — Implementar Tarea 8: Deep linking, compartir e indicador de red; 76d44aff — connection indicator, sharing and deep linking; 20290cdd — precisión de enlaces compartidos | AUDITORÍA ESTÁTICA E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL/MULTIPLATAFORMA PENDIENTE |
| AUD-T-009 | PWA, offline, IndexedDB, caché, service worker y compatibilidad iOS | 825a1aea — modo offline con persistencia IndexedDB; 9f8b84a9 — estabilidad offline; d9476ab0 — instalación PWA dinámica e iOS | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL/MULTIPLATAFORMA PENDIENTE |
| AUD-T-010 | Reportes de problemas y sugerencias de cambios en cortes | 64d8d044 — Implementar Tarea 9: Reporte y sugerencia de cambios; fb7f2fcf — reporte individual; db6951ed — modal de sugerencia; db0eee87 — almacenamiento independiente de sugerencias | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL/SEGURIDAD/INTEGRACIÓN PENDIENTE |
| AUD-T-011 | Módulo Problemas y Soluciones (PyS), formularios y visualización | f93ad12f — Implementar Tarea 10: Módulo PyS; 73d1fd91 — revisión PyS IV; 0e93ec25 — correcciones de carrusel y ficha | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL/SEGURIDAD/INTEGRACIÓN PENDIENTE |
| AUD-T-012 | Vinculación bidireccional PyS–vehículos y navegación sin ciclos | Implementar Tarea 11; f6299fcf — asociación de vehículo/problema y navegación anti-ciclo; 20ff5611 — contexto de carrusel PyS | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL/INTEGRIDAD/NAVEGACIÓN PENDIENTE |
| AUD-T-013 | Tutoriales, multimedia y carga directa de vídeos YouTube con aprobación | Tarea 12; 5fa1427a — subida directa YouTube y aprobación; bd8e2fe3 — integración en vehículos, PyS y tutoriales | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL/SEGURIDAD/YOUTUBE PENDIENTE |
| AUD-T-014 | Texto enriquecido, sanitización, listas, párrafos y saltos de línea | Tarea 13; 79230c57 — unificar editores enriquecidos y soporte de listas | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL/SEGURIDAD PENDIENTE |
| AUD-T-015 | Búsqueda global, filtros rápidos y resultados jerárquicos | Tarea 14 y Tarea 15; 7fae24ac — búsqueda de modelos numéricos; 2b2c5b57 — jerarquía de resultados | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VAL-24 PENDIENTE |
| AUD-T-016 | Diseño visual global, modo oscuro, contraste, footer y responsive | Tarea 16; 4b136cd0 — consolidación de modo oscuro; 28f4ace5 — footer dinámico; a9b15e5f — mejoras UI | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VAL-25 PENDIENTE |
| AUD-T-017 | Gestión colaborativa de años y validación comunitaria | Tarea 17; dc0862d0 — collaborative year update; 45eece6c — actualización integral; aa57c4de — autorización y deduplicación suggestYear | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VAL-26 PENDIENTE |
| AUD-T-018 | Usuarios, Inbox, dashboard, actividad y flujos de FEEDBACK | Tarea 18; 27760cf7 — transmisión de sesión Inbox/Dashboard; 58f58b0e — endpoint FEEDBACK; 5bf20efe — contrato testigo sugerencias | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VAL-27 PENDIENTE |
| AUD-T-019 | Validaciones de integridad backend y pruebas automatizadas | Tarea 19; commits de pruebas aisladas AUTH/USERS y pruebas de WRITE/ADMIN/FEEDBACK | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VAL-28 PENDIENTE |
| AUD-T-020 | Saneamiento arquitectural, DRY, anti-debugging y auditorías globales | Tarea 21; 27c9311c — auditoría integral y navegación; d93b3a5e — consolidación global y DRY | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VAL-29 PENDIENTE |
| AUD-T-021 | Ficha técnica imprimible, paginación y distribución adaptativa de imágenes | 6d7fbb9c — tareas 1.2/1.3; 199ee4be — layouts configurables; cbbcb0cb — cuadrículas 2×2; 04c86ce6 — layout adaptativo | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VAL-30 PENDIENTE |
| AUD-T-022 | Panel de desarrollador, navegación por secciones y modal administrativo | da7c146c — reorganizar panel; fd534545 — refinamiento; 9b1f210c — consola global | E1 ESTÁTICA COMPLETADA; HALLAZGOS ABIERTOS; VAL-31 PENDIENTE |
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
| AUD-T-035 | Endpoints, separación de servicios y contratos frontend/backend | commits de actualización AUTH/USERS/ADMIN/FEEDBACK/WRITE; 975c5913 y f8cc191f — alta de servicios en el historial | E1 COMPLETADA; CONTRATOS INCONSISTENTES; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE |
| AUD-T-036 | Términos, consentimiento inicial y elementos legales de interfaz | e06791d0 — modal de términos en primer login; 9aa59063 — integración de términos y enlace footer | E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL Y REVISIÓN LEGAL PENDIENTES |
| AUD-T-037 | Catálogo, caché, sincronización incremental y búsqueda | f1db85fe — estrategia de caché incremental; 7fae24ac — búsqueda numérica; commits de catálogo y mejoras generales | E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL/RENDIMIENTO PENDIENTE |
| AUD-T-038 | Seguridad del almacenamiento local y ciclo de datos de usuario | Continuidad propuesta después de AUD-T-037 y consolidación S019 | E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL/PRIVACIDAD PENDIENTE |

### 4.1. Control de cancelaciones, sustituciones y cambios de alcance

- Tareas marcadas como canceladas no se reactivarán por aparecer en commits antiguos.
- Se identificó en Tareas.txt la **Tarea 1.6: botón de filtros rápidos durante búsqueda**, marcada expresamente como «CANCELADA Y RETIRADA». Se auditará su retirada y se verificará si el objetivo fue sustituido por la jerarquía de búsqueda o por otra solución. No se reintroducirá sin evidencia y autorización.
- La Tarea 15 combina una parte tachada/cancelada (barra de filtros rápidos de catálogo) con la estandarización universal de botones. Se separarán ambos alcances para no restaurar el requisito cancelado.
- Las tareas de versiones anteriores, cambios de endpoints, eliminación temporal de servicios del repositorio público y ramas auxiliares se contrastarán con la arquitectura actual y README; no se interpretarán automáticamente como regresiones.
- Si una función fue sustituida por una implementación posterior, el ID histórico se conservará y se enlazará al ID sucesor. No se auditará una versión obsoleta como si fuera la implementación vigente.

## 5. Fases de trabajo

| Fase | Alcance | IDs principales | Prioridad |
|---|---|---|---|
| F0 | Baseline, historial, clasificación inicial y trazabilidad | AUD-T-001 a AUD-T-038 (inventario) | En curso |
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

**Estado global actualizado:** 38 unidades AUD-T en el inventario; 17 con E1 completada, 1 parcial y 20 por auditar. La auditoría estática no equivale a validación funcional.

## 10. Próxima acción

La siguiente unidad pendiente en la secuencia de tareas es **AUD-T-004 — VIN: identificación, colecciones, almacenamiento, búsqueda y diferencial**. Crear el checkpoint individual antes de comenzar y mantener la auditoría estática sin migraciones ni operaciones productivas.


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

## 21. Iteración técnica — AUD-T-035

**Sesión:** AUD-20261107-S016  
**Checkpoint:** AUD-CP-0016  
**HEAD auditado:** e13623beb059b33171758545404381fbbf512c16  
**HEAD base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Estado:** AUDITORÍA ESTÁTICA E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL PENDIENTE.

### Alcance
Se contrastaron ACTION_TO_SERVICE_MAP, los dispatchers de AUTH/CATALOG/WRITE/USERS/FEEDBACK/UTILITIES/ADMIN, helpers routeAction y consumidores de ui.js, auth.js, main.js, add_cortes.html, users.html y youtubeUpload.js. Se revisaron contratos de sesión, payloads, respuestas, imágenes y aprobación de vídeos.

### Resultado
- H-AUD-035-001 a H-AUD-035-006 documentados en Auditoría.txt.
- Varias acciones FEEDBACK protegidas no reciben userId/sessionToken desde sus consumidores; youtubeUpload.js usa currentUser.id en vez de ID y no transmite SessionToken.
- El enlace manual de vídeo utiliza un payload que addSupplementaryInfo no procesa.
- PYS/Tutorial publican el enlace antes de la aprobación; la aprobación/rechazo no sincroniza esos destinos.
- opVideoId se interpreta como videoId real y no se usa para idempotencia.
- El mapa contiene addCorte/migrateYearRanges sin handler; getHeaders/assignCollaborator carecen de mapeo/callsites.
- handleAddProblem puede confirmar alta aunque falle la imagen Drive.

### Tareas derivadas
AUG-043 — contratos protegidos y ciclo de aprobación YouTube. AUG-044 — reconciliar mapa y dispatchers. AUG-040 recibe adenda por integridad de imagen en PYS. Se conservan AUG-039/AUG-040/AUG-041/AUG-042.

### Evidencia y límites
E1: inspección estática de dispatchers, callsites y contratos. No se ejecutaron pruebas de navegador, HTTP, Apps Script V8, YouTube, Drive, Spreadsheet real, aprobación/rechazo, reintentos ni concurrencia. No se verificaron deployments publicados. No se modificó código ni datos productivos.

### Siguiente iteración
AUD-T-036 — Términos, consentimiento inicial y elementos legales de interfaz.

## 22. Iteración técnica — AUD-T-036
Sesión AUD-20261107-S017 | Checkpoint AUD-CP-0017 | HEAD auditado bf420789e5aeafa73f2bb3ee1118f5c8bf2ff010 | HEAD base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL Y REVISIÓN LEGAL PENDIENTES.
Alcance: index.html, ui.js, main.js, style.css, auth.js, service-worker.js, assets e historial e06791d0/9aa59063.
Resultado: H-AUD-036-001 a 005; aceptación local sin versión/identidad, fallo abierto si falta modal, privacidad general pendiente de aprobación, logos fuera del precache y accesibilidad/foco incompletos.
Tareas: AUG-045, AUG-046, AUG-047.
Límites: E1 estática; sin pruebas de navegador, teclado/lector, PWA offline, storage, cambio de cuenta, revisión jurídica o verificación de deployments. No se modificó código ni datos.
Siguiente: AUD-T-037 — Catálogo, caché, sincronización incremental y búsqueda.

## 23. Iteración técnica — AUD-T-037
Sesión AUD-20261107-S018 | Checkpoint AUD-CP-0018 | HEAD 513c9982407db2a1c9b357a418d0949786ec4141 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 COMPLETADA; HALLAZGOS ABIERTOS; VALIDACIÓN FUNCIONAL/RENDIMIENTO PENDIENTE.
Alcance: catalog service, carga inicial, IndexedDB, sincronización silenciosa, búsqueda global, VIN engine, Service Worker e historial.
Hallazgos H-AUD-037-001 a 012: caché conserva eliminados; sync no detecta ediciones de Tutorial/Relay con igual cantidad; autoapertura de sección incorrecta; búsqueda incompleta; PyS asíncrono redundante; ambigüedad año/modelo; VIN puede seleccionar variante incorrecta; persistencia/miniaturas sin ciclo de vida; historial compartido; deep link/HTTP sin timeout; cache runtime PWA incompleto; lecturas completas de Spreadsheet sin caché efectiva.
Tareas: AUG-048 a AUG-052.
Límites: E1 estática; sin navegador, IndexedDB real, cuota, PWA offline, rendimiento, VIN dataset, sincronización concurrente, HTTP ni Apps Script/Spreadsheet real. No se modificó código/datos.
Siguiente: AUD-T-038 — revisar seguridad del almacenamiento local y ciclo de datos de usuario, sujeto a confirmación del plan.

## 24. Consolidación global y matriz de validación — AUD-PLAN-2026-001

Sesión AUD-20261107-S019 | Checkpoint AUD-CP-0019 | HEAD de inicio eb3b72e205ad8d772a4bd5cdad94fb3e26533917 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: CONSOLIDACIÓN DOCUMENTAL COMPLETADA; MATRIZ VAL-01 A VAL-15 PREPARADA; EJECUCIÓN PENDIENTE.
Se confirma el catálogo de 37 AUD-T: AUD-T-023 a AUD-T-037 tienen E1 completada (15); AUD-T-002 está parcialmente auditada (1); AUD-T-001 y AUD-T-003 a AUD-T-022 siguen por auditar (21). No se debe afirmar que las 37 unidades tienen E1 completada.
Aug_Tareas.md contiene 51 IDs AUG únicos; AUG-015 no aparece. Los encabezados repetidos corresponden a adendas/actualizaciones y no se renumeran ni duplican sin evidencia.
Se crea Plan_auditoría/Consolidacion_Auditoria.md con índice por dominio, dependencias, matriz VAL-01 a VAL-15 y reglas de ejecución.
Límites: trabajo documental; sin pruebas E2/E3, navegador, HTTP, Apps Script, Drive, Spreadsheet, concurrencia ni verificación de deployments. Sin cambios de aplicación ni datos productivos.
Siguiente: AUD-T-038 — seguridad del almacenamiento local y ciclo de datos de usuario, previa comprobación de no duplicidad con AUG-051 y AUD-T-037.

## 25. Iteración técnica — AUD-T-038
Sesión AUD-20261107-S020 | Checkpoint AUD-CP-0020 | HEAD bfcdf8e57d4e09c1c920cf904265301c4554b334 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 COMPLETADA; H-AUD-038-001 a 005 abiertos; validación funcional/privacidad pendiente.
Alcance: localStorage, IndexedDB, Cache Storage, Service Worker, sesión, snapshots pendientes, historial/vistos, respaldos locales, limpieza y recuperación entre cuentas.
Fuentes: offline.js, auth.js, state.js, ui.js (funciones de persistencia), add_cortes.html, users.html, main.js, VinDifferentialEngine.js, api-config.js, service-worker.js, Services/Auth.js, Services/users.js, Services/write.js y Services/admin.js.
Tareas: AUG-053/AUG-054 nuevas; adendas a AUG-022/AUG-051. Se mantienen AUG-006/AUG-042/AUG-045 y H-AUD-037-008/009 sin duplicación.
Límites: E1 estática; sin navegador, cambio de cuenta, IndexedDB real, cuota, HTTP, Apps Script, Drive, Spreadsheet, concurrencia ni deployments. Sin cambios de aplicación/datos.
Siguiente: AUD-T-003 — Registro de vehículos y cortes, idempotencia y resiliencia de red (fase F2 crítica).

## 26. Iteración técnica — AUD-T-003
Sesión AUD-20261107-S021 | Checkpoint AUD-CP-0021 | HEAD 06f18e42383f5be448c378bc09ab534731cfbd6b | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 COMPLETADA; H-AUD-003-001 a 004 abiertos; validación funcional y de integración pendiente.
Alcance: add_cortes.html, WRITE, ADMIN, api-config.js, segundo corte, vídeo guía, «No recomendado», disponibilidad, opId y recuperación de red. Contraste auxiliar youtubeUpload.js y hallazgos previos AUD-T-031/032/033/035/038.
Hallazgos: persistencia local no obligatoria y opId sin vinculación al payload; opciones de corte/vídeo no se ocultan por disponibilidad real; FileReader puede dejar UI bloqueada; recuperación automática no serializada.
Tareas: AUG-055 a AUG-058 nuevas; adenda a AUG-043. No duplicar AUG-039/AUG-043/AUG-053/AUG-054 ni H-AUD-033-001/H-AUD-035-002/H-AUD-038-001/005.
Límites: E1 estática; sin navegador, cuota localStorage, FileReader real, pérdida de respuesta HTTP, Apps Script, Drive/Spreadsheet real, concurrencia ni deployments. Sin cambios de aplicación/datos.
Siguiente: AUD-T-004 — VIN: identificación, colecciones, almacenamiento, búsqueda y diferencial.


## 27. Iteración técnica — AUD-T-004
Sesión AUD-20261107-S022 | Checkpoint AUD-CP-0022 | HEAD auditado 24f68780e6b7ad5ad835ce76c1d6abda0a80a528 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-004-001 a 003 abiertos; H-AUD-037-007 ampliado; validación funcional e integración pendiente.
Alcance: VinDifferentialEngine.js, navigation.js, ui.js, add_cortes.html, Services/write.js, Services/admin.js, Services/catalog.js, api-config.js y Spreadsheet/GPSpedia_DB_columnas.md. Contraste TAREA 4.1/BLOQUE 5 y commits 5bab8779, aa4da8df, df8e5cf7, 94c2d04e, 6f81b489 y 8001b431.
Hallazgos nuevos: la colección UI pierde índices y recorta el prefijo por segunda vez; el editor administrativo no puede persistir fieldName='vin'; backend no impone longitud máxima ni rechaza entradas demasiado cortas. H-AUD-037-007/AUG-050 se amplían con resolución de VIN completo/prefijo, ausencia de competidores, umbral no aplicado, rangos de años y caracteres compartidos.
Tareas: AUG-059/AUG-060 nuevas; AUG-050 ampliada. No duplicar H-AUD-030/AUG-036, H-AUD-037-009/AUG-051 ni H-AUD-038-001/AUG-053.
Límites: E1 estática; sin navegador, dataset VIN, HTTP, Apps Script, Spreadsheet/Drive real, migración, concurrencia ni deployments. Sin cambios de código o datos.
Siguiente: AUD-T-005 — Modal de detalle, ampliación dinámica y acciones contextuales.

## 28. Iteración técnica — AUD-T-005
Sesión AUD-20261107-S023 | Checkpoint AUD-CP-0023 | HEAD auditado c56c6f7e21a668774db726e2f14139588f1bc5c0 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-005-001 a 008 abiertos; validación funcional, seguridad e integración pendiente.
Alcance: TAREA 5, especificaciones 3.1–3.5; ui.js, Services/catalog.js, Services/write.js, Services/admin.js, api-config.js, rich-text.js, state.js, main.js, style.css, index.html y offline.js. Contraste con commits d72a1e61/183cff59 y auditorías AUD-T-003/004/031/032/033/035/038.
Hallazgos: stored XSS en apertura/alimentación; ausencia de guardas de cupo y respuestas success vacías en addSupplementaryInfo; detalle sin refresh efectivo; selectores estáticos; FileReader sin error/abort; menú de vídeo usa propiedad eliminada y contrato manual ya identificado como no persistente; contador VIN contradictorio; popstate no reconoce overlays dinámicos.
Tareas: AUG-061 a AUG-064 nuevas; adendas a AUG-043/AUG-050/AUG-057. No duplicar H-AUD-032-001/AUG-039, H-AUD-033-001/AUG-034, H-AUD-035-002/AUG-043, AUD-T-031 ni H-AUD-003-002/AUG-056. La observación popstate se transfiere a AUD-T-007.
Límites: E1 estática; sin navegador, XSS, FileReader real, concurrencia, HTTP, Apps Script, Drive/Spreadsheet ni deployments. Sin cambios de código/datos.
Siguiente: AUD-T-006 — Visualización técnica avanzada, lightbox con carrusel de cables y renderizado de transparencias.


## 29. Iteración técnica — AUD-T-006
Sesión AUD-20261107-S024 | Checkpoint AUD-CP-0024 | HEAD auditado 5ab07e75513b05a51a4c62fbc731e451105eb1a8 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-006-001 a H-AUD-006-003 abiertos; validación visual, móvil y rendimiento pendiente.
Alcance: TAREA 6/B32/B33; lightbox.js, ui.js, offline.js, style.css, index.html y main.js. Contraste con commits 7f57e2fd/af9caed8/5ff81bde y auditorías AUD-T-005/009/038.
Hallazgos: tamaño de imagen ignorado y cachés sin variante; mix-blend-mode generalizado a imágenes opacas; swipe del carrusel del modal sin discriminación vertical. H-AUD-005-001/AUG-064 se amplía con slideText.innerHTML en updateSlide() como sink adicional sin sanitización.
Tareas: AUG-065 a AUG-067 nuevas; AUG-064 ampliada. No duplicar caché general AUD-T-009/AUG-051 ni navegación global AUD-T-007.
Límites: E1 estática; sin navegador, móviles/PWA, CDN, IndexedDB real, pruebas visuales, medición de rendimiento ni gestos reales. Sin cambios de aplicación/datos.
Siguiente: AUD-T-007 — Navegación, History API, popstate, overlays y gesto atrás.

## 30. Iteración técnica — AUD-T-007
Sesión AUD-20261108-S025 | Checkpoint AUD-CP-0025 | HEAD auditado 61c9898309ef2c27438eaa65a5aa00ff8a1f7b0e | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-007-001 a 005 abiertos; validación funcional, móvil/PWA y de secuencias reales pendiente.
Alcance: TAREA 7/B05/B06/B07/B08/B27/B18; main.js, navigation.js, ui.js, users.html, add_cortes.html, youtubeUpload.js, index.html, style.css, lightbox.js y state.js. Contraste con commits 09c7a448, a45f394d y 414c4258; auditorías AUD-T-005/AUD-T-006/AUD-T-036/AUD-T-037.
Hallazgos: overlays dinámicos no detectados por popstate; botones internos «Volver» crean entradas nuevas; el listener cierra todos los modales visibles en vez de uno; aperturas/cierres no reconciliados dejan entradas obsoletas; el bloqueo de terms-modal impide cerrar primero terms-agreement-modal.
Tareas: AUG-068 a AUG-071 nuevas; adenda a AUG-047. H-AUD-005-008 se amplía sin duplicar su ID.
No duplicar: AUG-047/AUD-T-036 (política legal), AUG-049/AUD-T-037 (búsqueda), AUG-017/AUG-042 (limpieza de overlays privilegiados por cambio de cuenta).
Límites: E1 estática; sin navegador, Android/iOS, PWA, gesto nativo, teclado virtual, submits reales, deep links ejecutados ni medición de historial. Sin cambios de código/datos.
Siguiente: AUD-T-008 — Deep links, compartir, enlaces precisos e indicador de red.


## 31. Iteración técnica — AUD-T-008
**Sesión:** AUD-20261108-S026  
**Checkpoint:** AUD-CP-0026  
**HEAD auditado:** f3d7558abeef482957582fea08f2041490b54f34  
**HEAD base:** d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Estado:** E1 ESTÁTICA COMPLETADA; H-AUD-008-001 a 004 abiertos; validación funcional, móvil/PWA y de conectividad real pendiente.

### Alcance
TAREA 8/B09/B10/B11/B12/B23; ui.js, main.js, navigation.js, index.html, style.css y auth.js. Contraste con commits 4ce4baae93, 95d248b11e, 0d00e25d51, 76d44aff, 20290cdd y 7714b985; auditorías AUD-T-007 y AUD-T-037.

### Resultado
- H-AUD-008-001 a 004 documentados en Auditoría.txt.
- El share query incluye marca/modelo/equipamiento/encendido/año, pero no ID estable y depende de una coincidencia global única.
- Web Share no cae a Clipboard ante fallos recuperables; Clipboard no valida disponibilidad ni ofrece feedback completo.
- decodeURIComponent() no está protegido y la restauración depende de polling sin límite.
- El indicador 3px y los eventos online/offline están presentes; faltan semántica accesible y distinción entre conectividad del navegador y disponibilidad backend.
- H-AUD-037-003, H-AUD-037-006 y H-AUD-037-010 se confirman vigentes; AUG-049 y AUG-052 reciben adendas.

### Tareas derivadas
AUG-072 — identidad y fallback de enlaces compartidos. AUG-073 — accesibilidad y semántica del indicador. AUG-049 recibe adenda por números/años y autoapertura por sección; AUG-052 recibe adenda por decodificación segura y espera terminal.

### Evidencia y límites
E1: inspección estática de funciones, consumidores, HTML/CSS, contratos de historial e historial Git. No se ejecutaron Web Share, Clipboard, navegador, móvil/PWA, lector de pantalla, URLs malformadas, dataset con colisiones, HTTP/health check, Apps Script ni pruebas de red. No se verificaron deployments. No se modificó código ni datos productivos.

### Siguiente iteración
AUD-T-009 — PWA, offline, IndexedDB, caché, service worker y compatibilidad iOS.

## 32. Iteración técnica — AUD-T-009
Sesión AUD-20261108-S027 | Checkpoint AUD-CP-0027 | HEAD auditado c2f9cdd29dfc9efca1db8a1c3b9675f29ed809ac | árbol 9617c2c588190a50fde235bfe2d32b3ebee7b7ba | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-009-001 a 003 abiertos; validación funcional, PWA offline, CacheStorage, IndexedDB real e instalación iOS/iPadOS pendiente.
Alcance: service-worker.js, manifest.json, index.html, main.js, style.css, offline.js, auth.js, ui.js, navigation.js, state.js, VinDifferentialEngine.js, youtubeUpload.js, add_cortes.html y users.html. Contraste con commits 825a1aea, 9f8b84a9 y d9476ab0; auditorías AUD-T-006/AUD-T-008/AUD-T-037/AUD-T-038.
Hallazgos: grafo ESM de precache incompleto (youtubeUpload.js no está incluido; VinDifferentialEngine.js ya constaba en H-AUD-037-011); cache.addAll() puede abortar la instalación completa y register() no maneja el rechazo; la detección de iOS no reconoce de forma fiable iPadOS con UA de escritorio y faltan metadatos Apple específicos.
Tareas: nueva AUG-074; adenda a AUG-052. H-AUD-037-008/009/010/011, H-AUD-038-003/004, AUG-022/AUG-051/AUG-052/AUG-065 se mantienen como antecedentes, sin duplicar sus causas.
Límites: E1 estática; sin pruebas sintácticas, navegador, instalación/actualización Service Worker, recarga offline, CacheStorage, IndexedDB real, cuota, Android/iOS/iPadOS, Add to Home Screen, red real ni deployments. Sin cambios de aplicación/datos.
Siguiente: AUD-T-010 — Reportes de problemas y sugerencias de cambios en cortes.

## 33. Iteración técnica — AUD-T-010
Sesión AUD-20261108-S028 | Checkpoint AUD-CP-0028 | HEAD auditado 9b1401d37ea8c7b78a7ae9117c90afc4deb68009 | árbol 283e324bca6e2b055e353059a3aa00ce38f66f5d | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-010-001 a H-AUD-010-007 abiertos; validación funcional, seguridad e integración pendiente.
Alcance: TAREA 9 (2.1–2.3), ui.js, api-config.js, Services/feedback.js, Inbox y esquema Feedbacks. Contraste con commits 64d8d044, fb7f2fcf, db6951ed, db0eee87 y revisiones H-TESTIGO-REPORT-01/H-TESTIGO-SUGGEST-02.
Controles: reportMetadata dinámico, identidad de corte/testigo, compatibilidad histórica, suggestion_cut versionado, estado desde Se resolvio y persistencia independiente de Cortes revalidados.
Hallazgos: reportProblem/suggestCutChange sin sesión/identidad de servidor; stored XSS en Inbox/modales; adjunto de reporte no subido; vínculo reportId–vehículo–corte no verificado; carga de imagen de sugerencia con fallos silenciados/MIME y permisos débiles; append sin lock/idempotencia; validación backend insuficiente.
Tareas: nuevas AUG-075 a AUG-081. No duplicar H-TR-01 a 07 ni H-SUG-01 a 06, cuyas correcciones estáticas se revalidaron.
Límites: E1 estática; sin Apps Script, HTTP, navegador, FileReader real, pruebas XSS, Drive/Spreadsheet, concurrencia ni deployments. Sin cambios de código/datos.
Siguiente: AUD-T-011 — Módulo Problemas y Soluciones (PyS), formularios y visualización.


## 34. Iteración técnica — AUD-T-011
Sesión AUD-20261108-S029 | Checkpoint AUD-CP-0029 | HEAD auditado bba61f0cd16e5a35d6f709e048ebd31d8709a193 | árbol b44d845fdd0cb485cdefc04752ebafd1c340f355 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-011-001 a H-AUD-011-007 abiertos; validación funcional/seguridad/integración pendiente.
Alcance: TAREA 10 (5.1–5.5), index.html, main.js, ui.js, api-config.js, Services/feedback.js, rich-text.js, Spreadsheet/GPSpedia_DB_columnas.md y style.css. Contraste histórico f93ad12f, 73d1fd91 y 0e93ec25.
Controles: sección y navegación; tarjeta + primero; orden inverso; lectura/cache FEEDBACK; casilla Sin solución; LockService en alta; sanitización de rich text y omisión de campos vacíos.
Hallazgos: stored XSS en title/colaborador/vídeo; acciones de escritura sin sesión/identidad servidor; imagen puede fallar y confirmar éxito, carpeta fuera de raíz principal y MIME/lectura no robustos; ID/esquema/idempotencia; límites y URL sin validación estricta; solución/prevención sobrescribibles; consulta repetida al navegar.
Tareas: nuevas AUG-082 a AUG-087; adendas a AUG-040/AUG-057. H-AUD-035-001/003/006 y H-AUD-037-005 se mantienen como antecedentes, sin duplicar.
Límites: E1 estática; sin E2/E3, navegador, FileReader real, HTTP, Apps Script, Drive/Spreadsheet, XSS controlado, concurrencia ni deployments. Sin cambios de aplicación/datos.
Siguiente: AUD-T-012 — Vinculación bidireccional PyS–vehículos y navegación sin ciclos.

## 35. Iteración técnica — AUD-T-012
Sesión AUD-20261108-S030 | Checkpoint AUD-CP-0030 | HEAD auditado 2afdde923d14e4f3dd078d347007b15e5ab09b2b | árbol 06fc72da78912df18227e2f45ce0d33349fa7cc5 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-012-001 a H-AUD-012-008 abiertos o vinculados a tareas existentes; validación funcional, integridad, seguridad y navegación pendiente.
Alcance: Tarea 11 (12.1–12.5), relación bidireccional PyS–vehículos, formularios de asociación existente/nueva, columna modelos_asociados, filtros, carrusel, acordeón, originModal, modalNavStack, popstate y permisos FEEDBACK. Contraste con f6299fcf y 20ff5611.
Controles: filtros de vehículos ya asociados/seleccionados; formato imagen/versión o encendido/años; confirmación visual; parseo JSON y compatibilidad heredada; restricción de desvinculación al rol Desarrollador; supresión inicial de carrusel/acordeón por origen.
Hallazgos: los callbacks de asociación recrean el acordeón sin originModal y pueden reabrir ciclos; la pila se duplica o pierde al editar/re-renderizar; no se conserva scroll del carrusel; los callsites add/remove omiten credenciales requeridas (AUG-043); add/remove no serializan la colección ni validan vehicleId contra Cortes (AUG-090); el título difiere del requisito; getPysData redundante (AUG-087); pruebas Playwright históricas no están presentes en el árbol actual.
Tareas: nuevas AUG-088 a AUG-091; adendas a AUG-043 y AUG-087. H-AUD-011-007/AUG-087 se mantiene como antecedente; no duplicar.
Límites: E1 estática; sin E2/E3, Playwright, navegador, HTTP, Apps Script, Spreadsheet real, concurrencia, permisos en deployment ni pruebas de navegación real. Sin cambios de aplicación/datos.
Siguiente: AUD-T-013 — Tutoriales, multimedia y carga directa de vídeos YouTube con aprobación.


## 36. Iteración técnica — AUD-T-013
Sesión AUD-20261108-S031 | Checkpoint AUD-CP-0031 | HEAD d8a164c2974f4dc472f169442c2b7efb969bf350 | árbol abce39b7f437ecd02647bebdf4252f47d4ed4ca2 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-013-001 a H-AUD-013-010 abiertos o vinculados; validación funcional/seguridad/OAuth/YouTube pendiente.
Alcance: Tarea 12 y Bloque 8 (8.1–8.4), tutoriales, hoja Tutorial, subida directa, OAuth, Inbox, aprobación/rechazo, integración Corte/PyS/Tutorial, reproductor, overlays, sanitización y esquema.
Controles presentes: tarjeta/formulario tutorial, módulo unificado, progreso/advertencia, bloqueo de cierre, cancelación XHR, privacyStatus unlisted, audiencia no infantil, Inbox por rol y MutationObserver de cierre.
Hallazgos: credenciales faltantes; publicación pending antes de aprobación; destino solo Corte; esquema Tutorial incompatible; alta sin auth/dedup; handlers sin guard tipo/estado; ID provisional; falta reanudación; sink HTML; uploader sin History API; discrepancias de metadatos; pruebas YouTube ausentes.
Tareas: nuevas AUG-092 a AUG-094; adendas AUG-043/AUG-068; AUG-040 conserva coordinación; VAL-22 planificada.
Límites: E1 estática; sin YouTube API/OAuth/XHR/navegador/Apps Script/Spreadsheet real, concurrencia, red interrumpida, 308, XSS ejecutado ni E2/E3. Sin cambios de aplicación/datos.
Siguiente: AUD-T-014 — Texto enriquecido, sanitización, listas, párrafos y saltos de línea.


## 37. Iteración técnica — AUD-T-014
Sesión AUD-20261108-S032 | Checkpoint AUD-CP-0032 | HEAD deefa3a8ceca4aae892c61d0e99fec73c3e44837 | árbol af44c6c3d2c911f72e6891f9b935a83fdcb83a38 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-014-001 a H-AUD-014-003 abiertos; validación funcional/seguridad pendiente.
Alcance: Tarea 13 y ampliación de listas/saltos naturales; rich-text.js, ui.js, add_cortes.html, WRITE/FEEDBACK, detalle/carrusel/impresión, CSS y service worker.
Controles: editor compartido; barras en formularios; UL/OL y marcadores; Enter continuar/salir; sanitizer allow-list; normalización de LF/CRLF; estilos de listas y precache v14.
Hallazgos: backend persiste HTML sin saneamiento autoritativo; dos sinks de contenido de catálogo omiten sanitizer; modo estricto/avanzado descrito en requisito no está conectado.
Tareas: nuevas AUG-095 a AUG-097; VAL-23 planificada. Hallazgos de render/sanitización no duplican AUG-039 ni AUG-094.
Límites: E1 estática; sin navegador, DOMParser real, XSS, Playwright, HTTP, Apps Script, Spreadsheet/Drive real, service worker en dispositivo ni E2/E3. Sin cambios de aplicación/datos.
Siguiente: AUD-T-015 — Búsqueda global, filtros rápidos y resultados jerárquicos; respetar cancelación de filtros rápidos documentada.


## 38. Iteración técnica — AUD-T-015
Sesión AUD-20261108-S033 | Checkpoint AUD-CP-0033 | HEAD c4f61a1f8dc402c9fec6802032ca7d7f9c304695 | árbol adda8ff26199530c2ec30d739510128efa060cb3 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-015-001 a H-AUD-015-004 abiertos; H-AUD-037-003 a 006 revalidados; VAL-24 pendiente.
Alcance: Tarea 14 búsqueda global multi-sección, búsqueda numérica y jerarquía; Tarea 15 filtros rápidos cancelados y estandarización de botones.
Controles: búsqueda Cortes/Relay/Tutorial/PyS; _sectionType, badges y handlers específicos; agrupación de tarjetas; encodeURIComponent para deep link. Los filtros rápidos no están en HTML/CSS.
Hallazgos nuevos: query reflejada en innerHTML; referencias a filtros retirados en blur; estilos de botones no unificados; marcadores sintéticos de sección usados como marcas.
Adenda AUG-049: persisten autoapertura no-Corte, falta de acentos/ranking/campos, carga PyS redundante y ambigüedad año/modelo numérico.
Nuevas tareas: AUG-098 a AUG-101; VAL-24 planificada.
Límites: E1 estática; sin DOM/browser/XSS/Playwright, catálogo real, Apps Script/Spreadsheet, carga concurrente, lector de pantalla, pruebas móviles ni E2/E3. Sin cambios de aplicación.
Siguiente: AUD-T-016 — Diseño visual global, modo oscuro, contraste, footer y responsive.


## Continuidad — AUD-T-016 (AUD-20261108-S034)
- Sesión/checkpoint: AUD-20261108-S034 / AUD-CP-0034.
- Repositorio infogpstech/GPSpedia; rama GPSpedia2.2.5_work; HEAD auditado 2daf88c96d29999cbc734c968ef94355ee5324ca; base GPSpedia2.2.5 d9acc68d889985c2e2f42fe3a02e502efc86ead1 sin cambios.
- AUD-T-016 — Diseño visual global, modo oscuro, contraste, footer y responsive: E1 estática completada; H-AUD-016-001 a H-AUD-016-004 abiertos; VAL-25 pendiente.
- Alcance: Tarea 16/B13/B19; commits 4b136cd0, 28f4ace5 y a9b15e5f; index.html, style.css, main.js, ui.js, users.html y add_cortes.html.
- Controles positivos: persistencia darkMode en localStorage; intercambio de logos; variables CSS; flex-wrap en encabezado del modal; footer fuera del contenedor con sentinel e IntersectionObserver.
- Hallazgos: selector data-theme no alineado con body.dark-mode y --text-primary sin definición; tokens/colores fragmentados entre páginas; zoom bloqueado en add_cortes; formulario de dos columnas y página de usuarios sin breakpoints dedicados.
- Nuevas tareas AUG-102 a AUG-105; VAL-25 planificada.
- Límites: sin navegador, mediciones WCAG, zoom real, lectores de pantalla, Android/iOS, PWA, rotación ni E2/E3. Sin cambios de aplicación/configuración/datos.
- Siguiente: AUD-T-019 — Validaciones de integridad en backend y batería exhaustiva de pruebas automatizadas.

## 39. Iteración técnica — AUD-T-017
Sesión AUD-20261108-S035 | Checkpoint AUD-CP-0035 | HEAD auditado 11d617cbf6401748a017fbe69f89ab63fa08800e | árbol f2fb8eee6b69ad0542659f152aa484ada148d9dd | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-017-001 a H-AUD-017-007 abiertos; VAL-26 pendiente.
Alcance: Tarea 17/B21, ui.js, offline.js, api-config.js, Services/feedback.js y esquema Spreadsheet.
Hallazgos: condición de colisión backend no verifica límite inferior; IndexedDB se marca antes de respuesta backend; cache no distingue usuario; IDs anónimos controlados por cliente no prueban tres instaladores; banner depende de onload de imagen; esquema no documenta suggestionActorKey; AUD-T-016 falta en Auditoría.txt.
Nuevas tareas AUG-106 a AUG-112. Tarea 17 conserva estado histórico COMPLETADA; E1 no equivale a validación funcional.
Límites: sin navegador, IndexedDB, Apps Script, HTTP, Spreadsheet, Drive, concurrencia, despliegue ni pruebas E2/E3. Sin cambios de aplicación/datos.
Siguiente: AUD-T-018 — Usuarios, Inbox, dashboard, actividad y flujos de FEEDBACK.

## 40. Iteración técnica — AUD-T-018
Sesión AUD-20261108-S036 | Checkpoint AUD-CP-0036 | HEAD auditado f9c47bad48fa8050a4acac33a4a45784fe433ef7 | árbol c6d4d779c039378d351d66bdaa56104a49da4a5e | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-018-001 a H-AUD-018-009 abiertos; VAL-27 pendiente.
Alcance: Tarea 18, 8.1/B24/B25/B26; Inbox, dashboard, perfil, gestión de usuarios, RBAC y backend de feedback.
Hallazgos: XSS almacenado en dashboard e Inbox; mismatch Rol/Privilegios oculta aprobación de vídeo; caché Inbox no conectada; ausencia de protección de última cuenta Desarrollador y limpieza de sesiones; perfil local sin refresco; mutaciones Inbox sin auditoría central; lectura completa de historial; éxito falso para itemType inválido.
Nuevas tareas AUG-113 a AUG-121. Tarea 18 conserva estado histórico COMPLETADA; E1 no equivale a validación funcional.
Límites: sin navegador, XSS real, Apps Script, HTTP, Spreadsheet, YouTube, Drive, concurrencia, deployment ni E2/E3. Sin cambios de aplicación/datos.
Siguiente: AUD-T-019 — Validaciones de integridad en backend y batería exhaustiva de pruebas automatizadas.

## 41. Iteración técnica — AUD-T-019
Sesión AUD-20261108-S037 | Checkpoint AUD-CP-0037 | HEAD auditado 6f0f901179c10833cbeedcb2767a25fcdd085b0d | árbol 111dcd6270f62d5aaad6d5bfe34ebf47acafee82 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-019-001 a H-AUD-019-014 abiertos; VAL-28 pendiente.
Alcance: Tarea 19, requisitos 9.1/9.2 y pruebas 31–38; servicios WRITE, CATALOG, ADMIN, UTILITIES, AUTH, USERS y FEEDBACK, contratos API y cobertura de pruebas.
Hallazgos: dos operaciones de escritura/migración sin autenticación; alta de Tutoriales desconectada de CATALOG y edición fallback con columnas incompatibles; restauraciones no transaccionales; validación tardía y escrituras parciales en corte; payload de vídeo suplementario ignorado con success; asociaciones PyS sin validar contra Cortes; updateVehicleField permite ID; updateUser parcial/sin lock; aprobación de vídeo sin verificar destino; VIN sin formato estricto; no existe runner general ni deployments aislados; mapa de acciones desincronizado; README afirma que microservicios fueron retirados aunque el árbol contiene sus fuentes.
Nuevas tareas AUG-122 a AUG-135. VAL-28 planificada, no ejecutada. Tarea 19 conserva estado histórico COMPLETADA, pero E1 no certifica las pruebas funcionales 31–38.
Límites: sin navegador, Apps Script, HTTP, Spreadsheet, Drive, YouTube, restauraciones, migraciones, concurrencia, estrés, deployment ni E2/E3. Sin cambios de aplicación/datos.
Siguiente: AUD-T-020 — Saneamiento arquitectural, DRY, anti-debugging y auditorías globales.

## 42. Iteración técnica — AUD-T-020
Sesión AUD-20261108-S038 | Checkpoint AUD-CP-0038 | HEAD auditado 25d5d548edd79f812ab6b2bf9411d8c77fb30188 | árbol 011980eae1ae02143377faffcf5148c7067bfad7 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-020-001 a H-AUD-020-004 abiertos; H-AUD-020-005 corregido documentalmente; VAL-29 pendiente.
Alcance: Tarea 21 y requisitos 13.1/B01/B14/B15/B17/B20/B28/B29/B30; arquitectura frontend/backend, DRY, parsers VIN/versiones, helpers Drive, anti-debugging, zoom, logs y funciones huérfanas.
Hallazgos: restricciones de DevTools no constituyen seguridad y bloquean zoom; recuperación add_cortes registra pendingOp con Base64; utilidades de Drive y parsers duplicados con contratos divergentes; funciones internas y markup de depuración sin referencias.
Nuevas tareas: AUG-136 a AUG-139; adendas a AUG-036 y AUG-104. La tabla de cobertura de Consolidacion_Auditoria.md se corrigió.
Límites: sin Node/lint, navegador, Apps Script, HTTP, Spreadsheet, Drive, YouTube, concurrencia, restauraciones, migraciones, despliegues ni E2/E3. Sin cambios de aplicación/datos.
Siguiente: AUD-T-021 — Ficha técnica imprimible, paginación y distribución adaptativa de imágenes.

## 43. Iteración técnica — AUD-T-021
Sesión AUD-20261108-S039 | Checkpoint AUD-CP-0039 | HEAD auditado 3339694150823f8f8adca6ffbad6211c708a8960 | árbol ebe322745a0458df1dbf749a28517ce97e36eb08 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-021-001 a H-AUD-021-009 abiertos; VAL-30 pendiente.
Alcance: ficha imprimible exportVehiclePrintSheet(), integración modal, márgenes, paginación, layout adaptativo, imágenes, Check Engine/testigo, QR, sanitización, metadatos y assets.
Hallazgos: margen 5 mm vs 10 mm; falta imagen Check Engine y aviso antes de imagen; carga incompleta de recursos; riesgo de overflow y tarjetas sin imagen fuera de orden; QR expone URL unlisted a tercero; selector vertical no se diferencia de Automática; interpolaciones HTML sin escape; referencia histórica incorrecta en el plan.
Nuevas tareas: AUG-140 a AUG-146; adenda a AUG-096. VAL-30 planificada, no ejecutada.
Nota de trazabilidad: la referencia 6d7fbb9c de la fila AUD-T-021 corresponde a tareas del panel de desarrollador y formulario PyS, no a impresión; se conserva registrada hasta su corrección mediante AUG-146. Los commits de impresión revisados son 199ee4be, cbbcb0cb y 04c86ce6.
Límites: sin navegador, impresión, PDF, QR real, Node/lint, Apps Script, HTTP, Spreadsheet, Drive, concurrencia, migraciones, despliegues ni E2/E3. Sin cambios de aplicación.
Siguiente: AUD-T-022 — Panel de desarrollador, navegación por secciones y modal administrativo.

## 44. Iteración técnica — AUD-T-022
Sesión AUD-20261108-S040 | Checkpoint AUD-CP-0040 | HEAD auditado 8f5d6d74f8f6b156ef67f3b21b6c0eeacf59d07b | árbol e0c80e7334378847c24e9ada5020248a539cb168 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-022-001 a H-AUD-022-004 abiertos; VAL-31 pendiente.
Alcance: acceso por rol, menú, modal, cinco pestañas, consola global, terminal, listeners, acciones ADMIN, ruteo API, sesión, logout, autorización backend y accesibilidad.
Controles: rol de menú normalizado; cinco secciones y consola única; listener guard; sin IDs duplicados; acciones frontend ADMIN alineadas con mapa y switch; assertDeveloperSession protege todo excepto ping.
Hallazgos: logout no revoca token ni limpia currentUser; el modal no se cierra al mostrar login; faltan semántica y gestión de foco del diálogo; ARIA de pestañas incoherente; errores siempre muestran HTTP 500.
Nuevas tareas: AUG-147 a AUG-150. VAL-31 planificada, no ejecutada.
Límites: sin navegador, lector de pantalla, pruebas de sesión/logout, HTTP, Apps Script, Drive, Spreadsheet, Node/lint, concurrencia, estrés ni E2/E3. Sin cambios de aplicación.
Siguiente: AUD-T-001 — Recuperación del App Shell, arranque, inicialización y estabilización general.


## 45. Iteración técnica — AUD-T-001
Sesión AUD-20261108-S041 | Checkpoint AUD-CP-0041 | HEAD auditado 35446ac7dd3697b4cd318895c9040e3bf239720c | árbol 0d9e88098c57b7550334e84bf74feecf6fef83ae | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA; H-AUD-001-001 y H-AUD-001-002 abiertos; VAL-32 pendiente.
Alcance: Tarea 1 (requisitos 1.1–1.8), App Shell, initializeApp(), auth/checkSession(), carga de catálogo/cache, deep links, API/ADMIN y regresiones.
Controles: DOMContentLoaded/already-ready; viewport requestAnimationFrame; caché y red; doGet/debug y ping; módulos separados. Las áreas PyS, panel ADMIN y modal de detalle se contrastaron con AUD-T-011, AUD-T-022 y AUD-T-005 para evitar duplicación.
Hallazgos: polling sin límite/cancelación para deep link cuando cortes.length permanece 0; processCatalogData absorbe errores y los llamadores marcan catalogLoaded=true sin confirmar actualización.
Revalidaciones: H-AUD-015-002/AUG-099 (filtros retirados); H-AUD-024-001/002/AUG-008 (bloqueo entre pestañas). No se crean duplicados.
Nueva tarea: AUG-151; adendas a AUG-008 y AUG-049. VAL-32 planificada, no ejecutada.
Límites: sin navegador, Node/lint, HTTP, Apps Script, Spreadsheet, Drive, concurrencia, pruebas multi-pestaña, despliegues ni E2/E3. Sin cambios funcionales ni datos.
Siguiente: AUD-T-002 — RBAC, AUTH, USERS, roles y autorización de operaciones de usuario (continuidad desde AUD-CP-0002).


## 46. Iteración técnica — AUD-T-002
Sesión AUD-20261108-S042 | Checkpoint AUD-CP-0042 | HEAD auditado 1136f20ee25778cceac857b4a3145aa2f405ba54 | árbol 5904f6ec4449fa94e7a2cbf6149ae0a885ca128f | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
Estado: E1 ESTÁTICA COMPLETADA para RBAC/AUTH/USERS; H-AUD-001 a H-AUD-006 abiertos; validación funcional pendiente.
Continuidad desde AUD-CP-0002: se revisaron las implementaciones vigentes y los commits históricos 97eef18c, 414c4258 y 6a226c18. No se reinició ni duplicó el análisis previo.
Alcance: Services/users.js, Services/Auth.js, auth.js, users.html y api-config.js; matriz de roles, autorización backend, autenticación, sesión, perfil y cambio de contraseña.
Controles confirmados: USERS obtiene identidad/rol desde la sesión validada; operaciones protegidas aplican RBAC en backend; perfil y cambio de contraseña se limitan al usuario autenticado; cambio de contraseña verifica la actual; AUTH aplica límites de intentos y sesiones por rol.
Hallazgos revalidados: eliminación de cuenta sin revocación completa y validación de usuario en AUTH (AUG-005); logout local sin revocación backend (AUG-006); expiración y revocación tras cambio de contraseña sin política definida (AUG-007); lock de validación entre pestañas no atómico (AUG-008); username vacío no rechazado en backend (AUG-009); serialización incompleta de mutaciones USERS y coordinación AUTH/USERS (AUG-010).
No se detectaron hallazgos nuevos que justifiquen otra AUG. Se conservan relaciones con AUD-T-023, AUD-T-024 y AUD-T-033; legal/consentimiento permanece en AUD-T-036.
Límites: sin navegador, Node/lint, HTTP, Apps Script V8, Spreadsheet, pruebas reales de roles/sesiones, concurrencia, multi-pestaña ni despliegues. Sin cambios funcionales ni datos.
Siguiente: AUD-T-003 — Registro de vehículos y cortes, add_cortes, idempotencia y resiliencia de red.


## 47. Continuidad verificada — AUD-T-004
Sesión AUD-20261108-S044 | Checkpoint AUD-CP-0043 | HEAD E1 24f68780e6b7ad5ad835ce76c1d6abda0a80a528 | HEAD actual 0c4c8e2f6dc816e13016932e2327b3ab60fb9945 | árbol 991bf5ffe8a386bf28825b80430443aaf0c9bf15 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 de AUD-T-004 fue completada en AUD-20261107-S022. La comparación del HEAD histórico con el actual arroja 21 commits, todos con cambios documentales. Los nueve archivos funcionales de alcance conservan exactamente sus SHA originales.
Se mantienen H-AUD-004-001 a 003, AUG-059/AUG-060 y la ampliación de H-AUD-037-007/AUG-050. No se crean hallazgos ni tareas duplicadas.
VAL-08, VAL-12 y VAL-15 siguen pendientes de ejecución funcional/integración en entorno aislado. Sin cambios de código ni datos productivos.
Siguiente unidad secuencial: AUD-T-005 (E1 histórica completada; requiere continuidad, no reinicio).


## 48. Continuidad verificada — AUD-T-005
Sesión AUD-20261108-S045 | Checkpoint AUD-CP-0044 | HEAD E1 c56c6f7e21a668774db726e2f14139588f1bc5c0 | HEAD actual 548d6b380ad11bf6bd957fd250d4320f50fa00ec | árbol actual 6b6a1a0102e419e2928f37f796b2f243e90c3e1 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 de AUD-T-005 fue completada en AUD-20261107-S023 / AUD-CP-0023. La comparación entre el HEAD histórico y el actual arroja 21 commits posteriores, con cambios exclusivamente documentales. Los once archivos funcionales revisados (ui.js, style.css, Services/write.js, Services/admin.js, Services/catalog.js, api-config.js, rich-text.js, state.js, main.js, offline.js e index.html) no presentan deriva funcional.
Se conservan H-AUD-005-001 a 008, AUG-061 a AUG-064 y las adendas a AUG-043/AUG-050/AUG-057. No se crean hallazgos ni tareas duplicadas; H-AUD-005-008 se mantiene transferido a AUD-T-007.
VAL-03, VAL-09, VAL-14 y VAL-16 siguen pendientes; VAL-17 cubre la navegación transferida. Sin pruebas funcionales ni integración real. Sin cambios de aplicación ni datos productivos.
Siguiente unidad: AUD-T-006 — Lightbox, imágenes técnicas, carrusel de cables, PNG transparente y zoom.


## 49. Continuidad verificada — AUD-T-006
Sesión AUD-20261108-S046 | Checkpoint AUD-CP-0045 | HEAD E1 5ab07e75513b05a51a4c62fbc731e451105eb1a8 | HEAD actual 864086253babd5e54ea698312bbd3e984371566a | árbol actual 2fa873bf4ec499143b8eefa9db5318bd10286dcb | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 de AUD-T-006 fue completada en AUD-20261107-S024 / AUD-CP-0024. La comparación entre el HEAD histórico y el actual arroja 21 commits posteriores, todos con cambios exclusivamente documentales. Los seis archivos funcionales del alcance conservan exactamente sus SHA históricos: lightbox.js, ui.js, offline.js, style.css, index.html y main.js.
Revalidación estática de H-AUD-006-001/AUG-065: getImageUrl(fileId, size) no utiliza size al construir la URL; setOptimizedImage() y la lectura/escritura de miniaturas mantienen claves basadas solo en el ID, sin variante de resolución. Se conserva el riesgo de servir una miniatura almacenada en un contexto que requiere más resolución.
Revalidación estática de H-AUD-006-002/AUG-066: mix-blend-mode: lighten continúa aplicado en modo oscuro a selectores generales de imágenes de tarjetas/miniaturas, sin identificar si el asset tiene transparencia; puede alterar imágenes opacas.
Revalidación estática de H-AUD-006-003/AUG-067: el swipe del carrusel dentro del acordeón solo registra screenX; no discrimina desplazamiento vertical/diagonal ni contempla touchcancel. El swipe interno del Lightbox sí compara ambos ejes y bloquea el cambio cuando detecta zoom o multitouch.
La adenda existente AUG-064 permanece vigente: updateSlide() inserta activeCable.label y activeCable.content mediante slideText.innerHTML sin sanitización en ese punto. No se crea duplicado.
Se mantienen H-AUD-006-001 a H-AUD-006-003 abiertos; AUG-065 a AUG-067 y la adenda AUG-064 siguen pendientes. No se detectaron hallazgos adicionales que justifiquen otra AUG. VAL-13, VAL-14 y la cobertura de sanitización VAL-09 permanecen pendientes de ejecución.
Límites: E1 estática; sin navegador, dispositivos móviles/PWA, CDN real, IndexedDB real, pruebas visuales, medición de rendimiento ni gestos reales. Sin cambios funcionales, assets, configuración, datos productivos, Drive, Spreadsheet o deployments.
Siguiente unidad: AUD-T-007 — Navegación, History API, popstate, overlays y gesto atrás.


## 50. Continuidad verificada — AUD-T-007
Sesión AUD-20261108-S047 | Checkpoint AUD-CP-0046 | HEAD E1 61c9898309ef2c27438eaa65a5aa00ff8a1f7b0e | HEAD actual 673114ee77c36d4bdc4ab3e67b1c31365b8f5ceb | árbol actual 662d6ba3f3f04f5693a0ef17861a32a408876ccb | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 estática de AUD-T-007 fue completada en AUD-20261108-S025 / AUD-CP-0025. La comparación entre el HEAD histórico y el actual arroja 21 commits posteriores; el diff contiene exclusivamente ocho archivos documentales. Los diez archivos funcionales del alcance conservan exactamente sus SHA históricos, sin deriva funcional.
Revalidación de H-AUD-007-001/AUG-068: el listener principal detecta side-menu, lightbox, .info-modal cuyo style.display sea exactamente 'flex' y modalDetalle; no detecta de forma uniforme overlays dinámicos cuya visibilidad depende de .info-modal.visible o clases propias. El modal dinámico de YouTube se inserta y elimina del DOM sin registrar su ciclo en History API; add_cortes.html mantiene un listener popstate local que solo atiende Lightbox.
Revalidación de H-AUD-007-002/AUG-069: los botones internos «Volver» siguen invocando renderizadores directamente (por ejemplo, mostrarVersiones crea pushState y el botón vuelve llamando mostrarModelos/mostrarTiposEncendido), en vez de consumir o reconciliar la entrada anterior.
Revalidación de H-AUD-007-003/AUG-070: main.js recorre todos los .info-modal visibles y los oculta en un solo popstate; users.html hace lo mismo con todos los .modal con display:block. No se determina ni cierra exclusivamente la capa superior.
Revalidación de H-AUD-007-004/AUG-071: menú, modalDetalle, Lightbox, vistas de sección y modales administrativos usan entradas/estados distintos. Existen cierres directos que eliminan/ocultan el overlay sin consumir la entrada asociada; abrir un modal desde el menú puede dejar sideMenuOpen residual. youtubeUpload.js elimina el modal directamente sin reconciliar historial.
Revalidación de H-AUD-007-005 / adenda AUG-047: el popstate de main.js devuelve de inmediato y vuelve a insertar el estado cuando #terms-modal está visible, antes de evaluar #terms-agreement-modal. La estructura HTML conserva ambos como capas separadas; por ello no se garantiza que Atrás cierre primero el acuerdo superior.
Se mantiene H-AUD-005-008 ampliado al conjunto de submodales dinámicos, sin duplicar su identificador. No se crean hallazgos ni tareas nuevas. Se conservan H-AUD-007-001 a H-AUD-007-005, AUG-068 a AUG-071 y la adenda AUG-047.
Validación pendiente: VAL-10 (política/flujo legal) y VAL-17 (secuencias de navegación, overlays, users.html y carga YouTube desde add_cortes.html), además de pruebas E2/E3 reales. No se ejecutaron navegador, Android/iOS, PWA, gestos nativos, teclado virtual, submits, deep links, ni medición de history.state.
Límites: E1 estática y continuidad Git. Sin cambios de código, HTML/CSS funcional, endpoints, configuración, assets, datos productivos, Drive, Spreadsheet ni deployments. Sin merge ni despliegue.
Siguiente unidad secuencial: AUD-T-008 — Deep links, compartir, enlaces precisos e indicador de red; continuar mediante revalidación de continuidad.


## 51. Continuidad verificada — AUD-T-008
Sesión AUD-20261108-S048 | Checkpoint AUD-CP-0047 | HEAD E1 f3d7558abeef482957582fea08f2041490b54f34 | HEAD actual e7ffbabed083bf12dd18092b0bea05acf70f3423 | árbol actual 23fd37b766b3fcf9e29bf52520c18c99454a2be8 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 estática de AUD-T-008 fue completada en AUD-20261108-S026 / AUD-CP-0026. La comparación entre el HEAD histórico y el actual arroja 21 commits posteriores; el diff contiene exclusivamente ocho archivos documentales. Los seis archivos funcionales del alcance conservan exactamente sus SHA históricos, sin deriva funcional: ui.js f00f48a42ee9bf0fd200f21959eb741f113363eb; main.js c15f5462d78fa907d14c71e15970ae29a3b3de77; navigation.js 39ec9f5ed34f8f81b506222f3b7b02494f866ad0; index.html 6dd0b86981e7f92b10b2f7a0a1634bb6395a479a; style.css dbcef5d28225c4ef1861fe0e0c11ad530f64ebd9; auth.js 2dc65f2e5903fc208ca14505053e82203a9dbd86.
Revalidación de H-AUD-008-001/AUG-072: el enlace compartido continúa construyéndose con texto de marca, modelo, versión, tipo de encendido y año; no incluye un identificador estable del registro y la resolución sigue dependiendo de la búsqueda global. Se conserva el riesgo de ambigüedad o de no encontrar el vehículo cuando hay duplicados o variantes.
Revalidación de H-AUD-008-002/AUG-072: cuando navigator.share existe, el rechazo de Web Share solo se registra en consola y no activa fallback; Clipboard se invoca únicamente cuando Web Share no existe, sin comprobar navigator.clipboard/writeText antes de usarlo. La confirmación/error de copia no cubre todos los fallos recuperables.
Revalidación de H-AUD-008-003/AUG-052: main.js ejecuta decodeURIComponent() sobre el hash #search= sin try/catch. La restauración comprueba cortes.length y programa otra comprobación cada 100 ms sin límite, cancelación ni estado terminal; si el catálogo no llega o queda vacío, el polling puede continuar indefinidamente. Se conserva la adenda existente de AUG-052 y su relación con la espera de catálogo de AUD-T-001/AUG-151, sin duplicar tareas.
Revalidación de H-AUD-008-004/AUG-073: #connection-status continúa siendo un div visual de 3 px cuyo title cambia con navigator.onLine. No incorpora role/status, aria-live ni texto accesible; el estado del navegador no verifica disponibilidad de los servicios backend. La animación offline tampoco contempla prefers-reduced-motion.
Se mantienen H-AUD-008-001 a H-AUD-008-004 abiertos; AUG-072 y AUG-073 continúan pendientes. AUG-049 conserva su adenda sobre años/números y autoapertura limitada a resultados Corte; AUG-052 conserva su adenda sobre hash malformado, espera terminal y cancelación. H-AUD-037-003, H-AUD-037-006 y H-AUD-037-010 permanecen como referencias cruzadas; no se crean hallazgos ni tareas duplicadas.
Validaciones pendientes: VAL-12 (enlaces compartidos, números/años y destino exacto), VAL-14 (hash malformado, sesión/catálogo ausentes y restauración), VAL-18 (Web Share, Clipboard, conectividad y accesibilidad), además de pruebas E2/E3 reales. No se ejecutaron Web Share, Clipboard, navegador, móvil/PWA, lector de pantalla, URLs malformadas, dataset real con colisiones, HTTP/health check, Apps Script ni pruebas de red.
Límites: E1 estática y continuidad Git. Sin cambios de código, HTML/CSS funcional, endpoints, configuración, assets, datos productivos, Drive, Spreadsheet ni deployments. Sin merge ni despliegue. La rama base permanece intacta.
Siguiente unidad secuencial: AUD-T-009 — PWA, offline, IndexedDB, caché, service worker y compatibilidad iOS; continuar mediante revalidación de continuidad.


## 33. Continuidad verificada — AUD-T-009
Sesión AUD-20261108-S049 | Checkpoint AUD-CP-0048 | HEAD E1 c2f9cdd29dfc9efca1db8a1c3b9675f29ed809ac | HEAD actual cdbcd6c10eee686e13213176b971681538ca7ef7 | árbol actual cdbcd6c10eee686e13213176b971681538ca7ef7 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 estática de AUD-T-009 fue completada en AUD-20261108-S027 / AUD-CP-0027. La comparación entre el HEAD histórico y el actual arroja 21 commits posteriores; el diff contiene exclusivamente ocho archivos documentales. Los catorce archivos funcionales del alcance conservan exactamente sus SHA históricos, sin deriva funcional.
Revalidación de H-AUD-009-001 y adenda AUG-052: el precache de service-worker.js no incluye youtubeUpload.js, aunque ui.js importa ese módulo de forma estática; el grafo ESM precargado no cubre todos los módulos necesarios para la primera recarga offline. VinDifferentialEngine.js también está ausente del precache, pero su dependencia y riesgo ya constan en H-AUD-037-011/AUG-052; se conserva la referencia cruzada, sin duplicar hallazgo.
Revalidación de H-AUD-009-002/AUG-052: cache.addAll(urlsToCache) sigue agrupando los recursos en una operación cuya falla de un recurso puede abortar la instalación completa del Service Worker. El registro navigator.serviceWorker.register('./service-worker.js') no devuelve ni captura la promesa; un rechazo queda sin manejo explícito. La escritura cache.put() en la estrategia de fetch no se integra a event.waitUntil(), por lo que no se garantiza que termine antes de finalizar el evento. Se mantiene la adenda de AUG-052 sobre recursos obligatorios/opcionales, errores de registro, primera recarga offline y atomicidad.
Revalidación de H-AUD-009-003/AUG-074: isIOSDevice() depende de tokens iPad/iPhone/iPod en navigator.userAgent; no reconoce de forma fiable iPadOS con UA de escritorio. index.html no declara apple-touch-icon ni los metadatos apple-mobile-web-app correspondientes. manifest.json mantiene los iconos PWA estándar, pero no sustituye la declaración específica de icono/instalación Apple.
Se mantienen H-AUD-009-001 a H-AUD-009-003 abiertos; AUG-074 y adenda AUG-052 continúan pendientes. H-AUD-037-011 y antecedentes H-AUD-038-003/004, AUG-022/AUG-051/AUG-065 permanecen como referencias cruzadas donde corresponde; no se duplican causas ni tareas.
Validaciones pendientes: VAL-14 (precarga del grafo ESM, primera recarga offline, fallo de recursos requeridos/opcionales, registro/actualización del worker y ausencia de sesión/catálogo); VAL-13 (transacciones IndexedDB, cuota/evicción, object URLs, tamaños de miniatura y privacidad local); además de pruebas E2/E3 en navegadores y dispositivos reales. No se ejecutaron CacheStorage, IndexedDB real, cuota, instalación/actualización PWA, Android/iOS/iPadOS, Add to Home Screen, red real ni deployments.
Límites: E1 estática y continuidad Git. Sin cambios de código, HTML/CSS funcional, Service Worker, manifest, assets, configuración, datos productivos, Drive, Spreadsheet ni deployments. Sin merge ni despliegue. La rama base permanece intacta.
Siguiente unidad secuencial: AUD-T-010 — Reportes de problemas y sugerencias de cambios en cortes; continuar mediante revalidación de continuidad.


## 34. Continuidad verificada — AUD-T-010
Sesión AUD-20261108-S050 | Checkpoint AUD-CP-0049 | HEAD E1 9b1401d37ea8c7b78a7ae9117c90afc4deb68009 | HEAD actual a669f8a0a696a00da40f4013ae0a0d3dca604968 | árbol actual 6ae13bbfbaa66dcaf246446a31b94c8920766675 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 de AUD-T-010 fue completada en AUD-20261108-S028 / AUD-CP-0028. La comparación entre el HEAD histórico y el actual arroja 21 commits posteriores; el diff contiene exclusivamente ocho archivos documentales. Los cuatro archivos funcionales/documentales de esquema del alcance conservan exactamente sus SHA históricos: ui.js f00f48a42ee9bf0fd200f21959eb741f113363eb; api-config.js a5c718d01b7da50b4b5e650c3bacd91456f4d670; Services/feedback.js 3db189523f6cb849d33550f29971c0ec6f386b3a; Spreadsheet/GPSpedia_DB_columnas.md 21e353fd74ad97496de4ff15677d03a3cf9b5f05. No existe deriva funcional desde la E1.
Revalidación de H-AUD-010-001/AUG-075: reportProblem y suggestCutChange no aparecen en actionPermissions de Services/feedback.js y, por tanto, no pasan por assertFeedbackSession. El frontend envía userId/userName y el backend los consume como identidad. La ruta FEEDBACK en api-config.js no incorpora por sí misma autenticación.
Revalidación de H-AUD-010-002/AUG-076: renderInboxList inserta item.subject mediante innerHTML sin escape contextual; renderInboxDetail conserva plantillas dinámicas adicionales. La sanitización de algunos campos no cubre todos los sinks.
Revalidación de H-AUD-010-003/AUG-077: el formulario incluye rep-img-file, pero el submit solo concatena el nombre local del archivo al texto del reporte; no lee bytes ni persiste una referencia de imagen.
Revalidación de H-AUD-010-004/AUG-078: handleSuggestCutChange acepta reportId ausente como N/A y no recupera el reporte original para comprobar la correspondencia reportId/vehicleId/corteIndex ni la existencia del slot.
Revalidación de H-AUD-010-005/AUG-079: la lectura de imagen de sugerencia resuelve FileReader solo por load, sin error/abort; los errores de Drive se silencian, los bytes se declaran image/jpeg y se usa ANYONE_WITH_LINK.
Revalidación de H-AUD-010-006/AUG-080: handleSuggestCutChange calcula la fila desde getLastRow y escribe sin LockService ni clave idempotente; se mantiene el riesgo de colisión/duplicación concurrente.
Revalidación de H-AUD-010-007/AUG-081: normalizeSuggestionProposedValues copia propiedades no reconocidas y no aplica un esquema estricto a los campos propuestos; details tampoco tiene un límite backend específico.
Controles positivos que permanecen: handleReportProblem genera/recibe reportId antes del envío, serializa reportMetadata y protege la inserción del reporte con LockService; ensureReportMetadataColumn valida las nueve columnas históricas y agrega la extensión sin desplazar A:I; las sugerencias se guardan como registros independientes versionados en Feedbacks y no modifican Cortes; la normalización de activaTestigo conserva true/false/null y la lectura contempla formatos históricos. H-TR-01 a H-TR-07 y H-SUG-01 a H-SUG-06 continúan como correcciones estáticas históricas, sin duplicarlas.
Se mantienen H-AUD-010-001 a H-AUD-010-007 abiertos y AUG-075 a AUG-081 pendientes. No se agregan hallazgos ni tareas nuevas.
Validaciones pendientes: VAL-19 (ciclo de reportes/sugerencias y adjuntos), VAL-03 (sesión/RBAC) y VAL-09 (ciclo de cargas), además de pruebas E2/E3. No se ejecutaron navegador, XSS controlado, FileReader real, Apps Script, HTTP, Drive/Spreadsheet, concurrencia ni deployments.
Límites: E1 estática y continuidad Git. Sin cambios de código, servicios, endpoints, esquema productivo, configuración, assets, Drive, Spreadsheet, datos ni deployments. Sin merge ni despliegue. La rama base permanece intacta.
Siguiente unidad secuencial: AUD-T-011 — Módulo Problemas y Soluciones (PyS), formularios y visualización; continuar mediante revalidación de continuidad.


## 35. Continuidad verificada — AUD-T-011
Sesión AUD-20261108-S051 | Checkpoint AUD-CP-0050 | HEAD E1 bba61f0cd16e5a35d6f709e048ebd31d8709a193 | HEAD actual 2a966d3fe9f56b24125c109f257959bceb8940e0 | árbol actual 0d0a4771ef652819fdbd5425047bff90d617bbe9 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 histórica de AUD-T-011 se completó en AUD-20261108-S029/AUD-CP-0029. La comparación hasta el HEAD actual contiene 21 commits posteriores y solo ocho archivos documentales. Los ocho archivos funcionales/esquema del alcance (index.html, main.js, ui.js, api-config.js, Services/feedback.js, rich-text.js, Spreadsheet/GPSpedia_DB_columnas.md y style.css) mantienen exactamente los SHA históricos. Sin deriva funcional desde la E1.
Revalidación por identidad exacta de blobs y lectura estática focal:
- H-AUD-011-001: stored XSS permanece en overlay.innerHTML con item.Problema; colDiv.innerHTML con cleanColaboradorName(item.Colaborador), que solo elimina sufijo OP; href/iframe derivado de item.Video con validación por subcadena/fallback embed/ sin allowlist de origen.
- H-AUD-011-002: addProblem/addSolution/addPrevention siguen fuera de actionPermissions; no invocan assertFeedbackSession. El alta conserva userId/userName del cliente y no recibe sessionToken.
- H-AUD-011-003: imagen no es obligatoria en backend; fallo Drive queda capturado y la fila puede guardarse con Imagen vacía; carpeta localizada globalmente/creada en raíz, bytes forzados a image/jpeg y FileReader del alta sin error/abort.
- H-AUD-011-004: ID isue-### deriva de getLastRow; no verifica máximo/unicidad/esquema existente ni usa opId/idempotencia.
- H-AUD-011-005: formulario/backend siguen en título 30 y descripción 700 frente a requisitos históricos 15/200; botón de prevención anuncia 100 mientras backend permite 700; tipos y URL no tienen validación estricta.
- H-AUD-011-006: addSolution/addPrevention escriben directamente sin LockService ni comprobación del estado destino dentro de sección crítica.
- H-AUD-011-007: renderPysSection presenta caché y después consulta getPysData en cada navegación, sin TTL/deduplicación ni aviso de posible obsolescencia.

Se mantienen abiertos H-AUD-011-001 a H-AUD-011-007 y pendientes AUG-082 a AUG-087, junto con adendas AUG-040/AUG-057. No se crean hallazgos ni tareas nuevas. H-AUD-035-001/003/006 y H-AUD-037-005 siguen como referencias, sin duplicación.
Controles positivos estáticos conservados: tarjeta + primera, orden inverso, lectura inicial desde caché, normalización modelosAsociados, Sin solución, LockService en alta y sanitización de contenido enriquecido. No implican validación funcional.
VAL-20, VAL-03, VAL-09, VAL-13 y VAL-14 permanecen pendientes de ejecución real; no se ejecutaron navegador/Playwright, XSS controlado, FileReader, HTTP, Apps Script, Drive/Spreadsheet, concurrencia ni deployments.
Sin cambios funcionales ni operaciones sobre datos productivos. Sin merge ni despliegue; base intacta.
Siguiente unidad: AUD-T-012 — Vinculación bidireccional PyS–vehículos y navegación sin ciclos.


## 36. Continuidad verificada — AUD-T-012
Sesión AUD-20261108-S052 | Checkpoint AUD-CP-0051 | HEAD E1 2afdde923d14e4f3dd078d347007b15e5ab09b2b | árbol histórico 06fc72da78912df18227e2f45ce0d33349fa7cc5 | HEAD actual 453e9f0a8d6ded97e91e7841ea1a39c697939e0d | árbol actual 18ac8adf31b0564be76958b09ef895193bfd16bb | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 histórica de AUD-T-012 se completó en AUD-20261108-S030/AUD-CP-0030. La comparación hasta el HEAD actual contiene 21 commits posteriores; los únicos ocho archivos modificados son documentales. Los nueve archivos del alcance funcional/esquema conservan exactamente sus SHA históricos:
- ui.js: f00f48a42ee9bf0fd200f21959eb741f113363eb
- Services/feedback.js: 3db189523f6cb849d33550f29971c0ec6f386b3a
- Services/catalog.js: 253cbe9f873481114e7abff3aa8902c45e2560af
- api-config.js: a5c718d01b7da50b4b5e650c3bacd91456f4d670
- main.js: c15f5462d78fa907d14c71e15970ae29a3b3de77
- navigation.js: 39ec9f5ed34f8f81b506222f3b7b02494f866ad0
- index.html: 6dd0b86981e7f92b10b2f7a0a1634bb6395a479a
- style.css: dbcef5d28225c4ef1861fe0e0c11ad530f64ebd9
- Spreadsheet/GPSpedia_DB_columnas.md: 21e353fd74ad97496de4ff15677d03a3cf9b5f05
No existe deriva funcional desde la E1. Revalidación de hallazgos:
H-AUD-012-001: el origen anti-ciclo se pierde tras asociar/crear un problema desde un vehículo abierto desde PyS; los callbacks reconstruyen el acordeón sin reenviar navOptions/originModal. Evidencia actual en ui.js, flujo openAssociateExistingProblemModal y callback de asociación, que llama renderPosiblesProblemasAccordion(panel, vehicle) sin opciones de navegación.
H-AUD-012-002: la pila modal puede duplicar o perder contexto durante re-renderizado/edición; openPysDetailModal y mostrarDetalleModal insertan fromOriginModal, mientras que rutas de edición/reconstrucción no conservan uniformemente navOptions y el contexto.
H-AUD-012-003: la pila no guarda/restaura scrollLeft del carrusel, scrollTop del modal ni estado abierto del acordeón al regresar.
H-AUD-012-004: los callsites de addVehicleToProblem/removeVehicleFromProblem no transmiten userId/sessionToken; assertFeedbackSession los exige y actionPermissions incluye ambos handlers. La eliminación además exige rol Desarrollador.
H-AUD-012-005: handleAddVehicleToProblem y handleRemoveVehicleFromProblem leen-modifican-escriben modelos_asociados sin LockService; no comprueban que vehicleId exista exactamente una vez en Cortes. Riesgo de relaciones huérfanas y pérdida de cambios concurrentes.
H-AUD-012-006: el requisito especifica «Problemas relacionados a este vehículo», pero renderPosiblesProblemasAccordion presenta «Posibles problemas».
H-AUD-012-007: consumidores de PyS repiten getPysData aun cuando existe caché; renderPosiblesProblemsAccordion y openAssociateExistingProblemModal hacen nuevas consultas, sin deduplicación/TTL compartidos. Mantener dentro de AUG-087, sin duplicar.
H-AUD-012-008: el commit histórico f6299fcf declara pruebas Playwright, pero el árbol actual no conserva suite PyS–vehículo reproducible. Mantener dentro de AUG-002 y VAL-21; no crear tarea duplicada.
Se mantienen H-AUD-012-001 a H-AUD-012-008 abiertos o vinculados a correcciones existentes. AUG-088 a AUG-091 siguen pendientes; se conservan adendas AUG-043 (credenciales) y AUG-087 (lecturas redundantes). H-004 se atiende dentro de AUG-043; H-007/H-008 permanecen dentro de AUG-087/AUG-002 y VAL-21, sin duplicación. No se crean hallazgos ni tareas nuevas.
Controles positivos estáticos históricos que permanecen: asociación desde PyS y desde vehículo, filtros anti-duplicado, confirmación visual, persistencia en modelos_asociados, renderizado de carrusel/acordeón y supresión contextual anti-ciclo en apertura inicial. Su presencia no certifica navegación real ni integridad transaccional.
Validaciones pendientes: VAL-21 (recorridos bidireccionales, nuevas/existentes, anti-ciclos, retorno con estado/scroll, edición/popstate, sesión/rol, integridad referencial y concurrencia), VAL-03 (sesión/RBAC), VAL-09 (cargas si intervienen en el flujo) y AUG-002 (suite funcional reproducible). No se ejecutaron Playwright, navegador, HTTP, Apps Script, Spreadsheet real, concurrencia, permisos en deployment ni E2/E3.
Límites: solo E1 estática y continuidad Git. Sin cambios funcionales, endpoints, configuración, assets, datos productivos, Drive, Spreadsheet ni deployments. Sin merge ni despliegue; base intacta.
Siguiente unidad secuencial: AUD-T-013 — Tutoriales, multimedia y carga directa de vídeos YouTube con aprobación.


## 37. Continuidad verificada — AUD-T-013
Sesión AUD-20261108-S053 | Checkpoint AUD-CP-0052 | HEAD E1 d8a164c2974f4dc472f169442c2b7efb969bf350 | árbol histórico abce39b7f437ecd02647bebdf4252f47d4ed4ca2 | HEAD actual f90be001f1c1bf23e67f144bc5a57d36d4cad58a | árbol actual 81227c2a3ffbbfc97930a302f96b2c27d62c37bc | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 histórica AUD-T-013 se completó en AUD-20261108-S031/AUD-CP-0031. La comparación histórica hasta el HEAD actual registra 21 commits posteriores y solo ocho archivos documentales modificados; los diez archivos de aplicación/estudio dentro del alcance conservan sus SHA históricos:
- youtubeUpload.js: 01559b95d4fff7b03c7833d5903496ab41dbc161
- Services/feedback.js: 3db189523f6cb849d33550f29971c0ec6f386b3a
- Services/catalog.js: 253cbe9f873481114e7abff3aa8902c45e2560af
- api-config.js: a5c718d01b7da50b4b5e650c3bacd91456f4d670
- ui.js: f00f48a42ee9bf0fd200f21959eb741f113363eb
- main.js: c15f5462d78fa907d14c71e15970ae29a3b3de77
- navigation.js: 39ec9f5ed34f8f81b506222f3b7b02494f866ad0
- index.html: 6dd0b86981e7f92b10b2f7a0a1634bb6395a479a
- style.css: dbcef5d28225c4ef1861fe0e0c11ad530f64ebd9
- Estudio_Factibilidad_YouTube.md: f5b2774d0ddbfd9862f8c51cae5a31e1481825ee
No existe deriva funcional desde la E1. Revalidación:
H-AUD-013-001 a H-AUD-013-010 se mantienen abiertos o vinculados a tareas existentes. La revalidación estática confirma, entre otros:
- youtubeUpload.js construye initYouTubeUpload y submitVideoForApproval con userId/userName pero no sessionToken; el backend aplica assertFeedbackSession a ambas acciones (actionPermissions con allowedRoles null no omite la exigencia de sesión).
- handleSubmitVideoForApproval persiste metadatos status=pending y videoUrl; la interfaz entrega esa URL a los formularios de Tutorial/PyS antes de aprobación, por lo que el enlace puede terminar persistido como contenido normal.
- handleApproveVideo solo asocia la URL cuando contentType === 'corte'; no integra destino Tutorial ni PyS.
- handleAddTutorial escribe en hoja Tutoriales con cinco columnas, valida por substring youtube.com/youtu.be y carece de autenticación/deduplicación; el esquema documentado de Tutorial conserva siete columnas.
- approve/reject validan un rol enviado al handler, pero no verifican que el registro sea subType=video_approval ni que su estado actual sea pending antes de mutarlo.
- handleInitYouTubeUpload devuelve opVideoId como videoId provisional si no obtiene el ID real; el cliente genera además yt_timestamp y URL pending_timestamp si no recibe un ID real.
- XHR implementa transferencia simple, progreso y abort; no hay persistencia local de sesión, recuperación IndexedDB ni reanudación HTTP 308.
- La lista Inbox interpola title/tipo en innerHTML; el uploader no gestiona su modal mediante History API/popstate.
- Los metadatos de la solicitud, columnas y campos que esperan los consumidores no mantienen contrato uniforme.
- No existe suite YouTube/OAuth/Inbox reproducible en el árbol actual; VAL-22 sigue planificada.

Se conservan H-AUD-013-001 a H-AUD-013-010 sin duplicarlos. AUG-092 a AUG-094 siguen pendientes; se mantienen las adendas a AUG-043 (sesión/identidad y bypass de aprobación) y AUG-068 (History API), y AUG-040 conserva coordinación de approveVideo. VAL-22 permanece PLANIFICADA. La Tarea 12 conserva su estado histórico COMPLETADA; los hallazgos E1 no modifican ese estado ni certifican el funcionamiento.
Controles positivos estáticos: módulo unificado youtubeUpload.js; formulario tutorial y entradas de vídeo desde Corte/PyS/Tutorial; bloqueo de cierre durante transferencia; cancelación mediante abort XHR; privacyStatus unlisted y selfDeclaredMadeForKids=false; registro estructurado video_approval; bandeja Inbox por rol; limpieza de iframe al cerrar detalle. Presencia estática no equivale a flujo operativo seguro.
No se ejecutaron YouTube Data API, OAuth real, XHR contra YouTube, navegador/Playwright, Apps Script, Spreadsheet/Drive real, concurrencia, cancelación/red interrumpida, HTTP 308, XSS ni deployments. E2/E3 permanecen pendientes.
Límites: continuidad E1 estática y comparación Git únicamente. Sin cambios de aplicación, OAuth scopes, Google Cloud, endpoints, configuración, assets, Drive, Spreadsheet, datos productivos ni deployments. Sin merge ni despliegue; base intacta.
Siguiente unidad: AUD-T-014 — Texto enriquecido, sanitización, listas, párrafos y saltos de línea.


## 38. Continuidad verificada — AUD-T-014
Sesión AUD-20261108-S054 | Checkpoint AUD-CP-0053 | HEAD E1 deefa3a8ceca4aae892c61d0e99fec73c3e44837 | árbol histórico af44c6c3d2c911f72e6891f9b935a83fdcb83a38 | HEAD actual 8b09d684c6bd43e2dc43a0cd04feebedd0f40b11 | árbol actual 76cff9eb079795c0e6b5ccf0022bced3232a012c | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 histórica de AUD-T-014 se completó en AUD-20261108-S032/AUD-CP-0032. La comparación hasta el HEAD actual registra 21 commits posteriores; los únicos ocho archivos modificados son documentales. Los siete archivos de aplicación del alcance conservan exactamente sus SHA históricos:
- rich-text.js: a7180766bb5097be510153edd851f4dfa939912c
- ui.js: f00f48a42ee9bf0fd200f21959eb741f113363eb
- add_cortes.html: 8a5e4bf51b3cd602224016a1267f478ce55ee329
- Services/write.js: 0c603ce8b56a871a6d9396bd5b047e364f9f580e
- Services/feedback.js: 3db189523f6cb849d33550f29971c0ec6f386b3a
- style.css: dbcef5d28225c4ef1861fe0e0c11ad530f64ebd9
- service-worker.js: 6779c97db87a574149eb44c7e97729ac7f18f4f5
No existe deriva funcional desde la E1. Revalidación estática:
- H-AUD-014-001 sigue vigente: los handlers de WRITE/FEEDBACK almacenan contenido enriquecido recibido sin aplicar saneamiento HTML autoritativo antes de persistir. Evidencia en Services/write.js, handleAddSupplementaryInfoLocked (campos apertura, cableAlimen/cableAlimen2/cableAlimen3 y notaImportante), y Services/feedback.js, handleAddProblem, handleAddSolution, handleAddPrevention y handleUpdatePysItem.
- H-AUD-014-002 sigue vigente: ui.js conserva dos sinks descriptivos sin sanitizeHtmlContent: updateSlide() inserta activeCable.content en slideText.innerHTML (línea 5905 aprox.) y la vista sin carrusel inserta activeContent en contentP.innerHTML (líneas 5998–6004 aprox.). Otros consumidores sí llaman al sanitizador, por lo que existe una aplicación desigual.
- H-AUD-014-003 sigue vigente: no se conecta el ajuste gpsepedia_rich_text_mode estricto/avanzado descrito en el requisito. rich-text.js mantiene una allow-list fija ampliada y createRichTextToolbar expone controles ampliados sin leer ese modo.
Se conservan los controles positivos presentes: editor compartido, toolbar de formato, listas UL/OL y marcadores, comportamiento de Enter para listas, sanitizador DOMParser con allow-list, filtrado de atributos/URLs/estilos, normalización LF/CRLF y precache del módulo en service worker. Su presencia estática no certifica la seguridad ni el comportamiento del navegador.
H-AUD-014-001 a H-AUD-014-003 permanecen abiertos. AUG-095 a AUG-097 siguen pendientes y VAL-23 permanece planificada. La Tarea 13 conserva su estado histórico COMPLETADA; no se crean hallazgos ni tareas duplicadas.
No se ejecutaron navegador, DOMParser real, XSS controlado, Playwright, HTTP, Apps Script, Spreadsheet/Drive real, pruebas de persistencia/concurrencia, service worker en dispositivo ni E2/E3. Sin cambios de aplicación, servicios, contratos, endpoints, configuración, assets, datos productivos, Drive, Spreadsheet ni deployments. Sin merge ni despliegue; base intacta.
Siguiente unidad: AUD-T-015 — Búsqueda global, filtros rápidos y resultados jerárquicos; respetar la cancelación documentada de filtros rápidos.


## 39. Continuidad verificada — AUD-T-015
Sesión AUD-20261108-S055 | Checkpoint AUD-CP-0054 | HEAD E1 c4f61a1f8dc402c9fec6802032ca7d7f9c304695 | árbol E1 adda8ff26199530c2ec30d739510128efa060cb3 | HEAD actual 503ed0678a718b4c9179b3c28d2373263cb8cc86 | árbol actual efba6192e1d1cf2eed28ce80486b904bb1f11e5c | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 histórica de AUD-T-015 ya estaba completada. La comparación Git confirma 21 commits posteriores y exclusivamente ocho archivos documentales modificados. Los nueve archivos funcionales del alcance conservan exactamente sus SHA históricos; no existe deriva funcional desde la E1.
Revalidación: H-AUD-015-001 a H-AUD-015-004 continúan vigentes sin evidencia de corrección funcional. H-AUD-037-003 a H-AUD-037-006 permanecen vinculados a la adenda AUG-049. No se crean hallazgos ni tareas duplicadas.
Se mantienen pendientes AUG-098 a AUG-101 y VAL-24. Se conserva expresamente la cancelación de filtros rápidos; no se propone restaurarlos. No se modifican Tareas.txt ni Plan_auditoría/Aug_Tareas.md porque el estado histórico y las tareas derivadas ya están documentados.
Archivos funcionales con identidad SHA comprobada:
- navigation.js: 39ec9f5ed34f8f81b506222f3b7b02494f866ad0
- ui.js: f00f48a42ee9bf0fd200f21959eb741f113363eb
- main.js: c15f5462d78fa907d14c71e15970ae29a3b3de77
- style.css: dbcef5d28225c4ef1861fe0e0c11ad530f64ebd9
- index.html: 6dd0b86981e7f92b10b2f7a0a1634bb6395a479a
- users.html: e41f402675677a4d2783493614737021ec2eade5
- add_cortes.html: 8a5e4bf51b3cd602224016a1267f478ce55ee329
- Services/catalog.js: 253cbe9f873481114e7abff3aa8902c45e2560af
- VinDifferentialEngine.js: 7a018e3a2c66e10f6ac2bf2fdcedf0875fc240e4
No se ejecutaron navegador, DOM, XSS, Playwright, catálogo real, Apps Script/Spreadsheet, concurrencia, lector de pantalla, pruebas móviles ni E2/E3. Sin cambios de aplicación, configuración, datos productivos, Drive, Spreadsheet, deployments, merge ni despliegue.
Siguiente unidad secuencial: AUD-T-016 — Diseño visual global, modo oscuro, contraste, footer y responsive; realizar revalidación de continuidad E1 sin duplicar hallazgos.


## 40. Continuidad verificada — AUD-T-016
Sesión AUD-20261108-S056 | Checkpoint AUD-CP-0055 | HEAD E1 2daf88c96d29999cbc734c968ef94355ee5324ca | árbol E1 f2fb8eee6b69ad0542659f152aa484ada148d9dd | HEAD actual 39d35bbe4bb0e6497ab444ced3afae62b679724c | árbol actual d8fe0aa7199ce25147c03c9a6e25cd04fb9e519f | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 histórica de AUD-T-016 se mantiene completada. La comparación Git registra 21 commits posteriores y exclusivamente ocho archivos documentales modificados. Los seis archivos funcionales del alcance conservan exactamente sus SHA históricos; no existe deriva funcional desde la E1.
Se revalidan H-AUD-016-001 a H-AUD-016-004, sin evidencia de corrección: selector/token del banner de validación; fragmentación de tokens de tema entre páginas; restricción de zoom en add_cortes.html; adaptación responsive incompleta de formulario y vista de usuarios.
AUG-102 a AUG-105 continúan pendientes; VAL-25 sigue planificada. No se crean hallazgos ni tareas duplicadas. Los hallazgos de botones permanecen en AUG-100 y no se duplican en esta unidad.
Archivos funcionales con identidad SHA comprobada:
- index.html: 6dd0b86981e7f92b10b2f7a0a1634bb6395a479a
- style.css: dbcef5d28225c4ef1861fe0e0c11ad530f64ebd9
- main.js: c15f5462d78fa907d14c71e15970ae29a3b3de77
- ui.js: f00f48a42ee9bf0fd200f21959eb741f113363eb
- users.html: e41f402675677a4d2783493614737021ec2eade5
- add_cortes.html: 8a5e4bf51b3cd602224016a1267f478ce55ee329
No se ejecutaron navegador, mediciones WCAG, zoom real, lectores de pantalla, Android/iOS, PWA standalone, rotación ni E2/E3. Sin cambios funcionales, configuración, datos productivos, Drive, Spreadsheet, deployments, merge ni despliegue.
Siguiente unidad secuencial: AUD-T-017 — Gestión colaborativa de años y validación comunitaria; revalidar continuidad E1.


## 41. Continuidad verificada — AUD-T-017
Sesión AUD-20261108-S057 | Checkpoint AUD-CP-0056 | HEAD E1 11d617cbf6401748a017fbe69f89ab63fa08800e | árbol E1 f2fb8eee6b69ad0542659f152aa484ada148d9dd | HEAD actual 75ba652774610832dd4de1db86e40d75c4ef9484 | árbol actual 8bea66b3d9e49d203410566111a87615b1796f9b | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 histórica de AUD-T-017 ya estaba completada. La comparación Git confirma 21 commits posteriores, con cambios exclusivamente en ocho documentos. Los cuatro archivos de aplicación y los tres artefactos de esquema Spreadsheet del alcance conservan exactamente sus SHA históricos; no hay deriva funcional/documental dentro del alcance de esta unidad.
Se revalidan H-AUD-017-001 a H-AUD-017-007 sin evidencia de corrección en los artefactos auditados. Se mantienen los riesgos previamente descritos: límite inferior ausente en colisión backend; marcado prematuro y caché no individualizada en IndexedDB; identidad anónima regenerable/controlada por cliente; banner acoplado a onload; esquema auxiliar no documentado; y omisión histórica de AUD-T-016 en Auditoría.txt. Esta revalidación no inspecciona ni modifica datos vivos de Spreadsheet/Drive.
AUG-106 a AUG-112 continúan pendientes; VAL-26 pendiente. No se crean hallazgos ni tareas duplicadas. La Tarea 17 conserva su estado histórico COMPLETADA; E1 estática no certifica validación funcional.
Archivos/artefactos con identidad SHA comprobada:
- ui.js: f00f48a42ee9bf0fd200f21959eb741f113363eb
- offline.js: c68e8698c74ef45a1c9bb534c6b2be77df817c34
- api-config.js: a5c718d01b7da50b4b5e650c3bacd91456f4d670
- Services/feedback.js: 3db189523f6cb849d33550f29971c0ec6f386b3a
- Spreadsheet (tree): 527317d85bbdbfb3ceaf555c6ddef83aea3d8812
- Spreadsheet/GPSpedia_DB_columnas.md: 21e353fd74ad97496de4ff15677d03a3cf9b5f05
- Spreadsheet/Text.txt: 8b137891791fe96927ad78e64b0aad7bded08bdc
No se ejecutaron navegador, IndexedDB, Apps Script, HTTP, Spreadsheet/Drive real, concurrencia, despliegue ni E2/E3. Sin cambios de aplicación, servicios, contratos, endpoints, configuración, assets, datos productivos, Drive, Spreadsheet ni deployments. Sin merge ni despliegue.
Siguiente unidad secuencial: AUD-T-018 — Usuarios, Inbox, dashboard, actividad y flujos de FEEDBACK; revalidar continuidad E1.


## 42. Continuidad verificada — AUD-T-018
Sesión AUD-20261108-S058 | Checkpoint AUD-CP-0057 | HEAD E1 f9c47bad48fa8050a4acac33a4a45784fe433ef7 | árbol E1 c6d4d779c039378d351d66bdaa56104a49da4a5e | HEAD actual df6a78e1fe29c6f29e864d5542cade12f8c6e7df | árbol actual 58df063f947b9b357ad7f2c7d04443685b2cb06e | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 histórica de AUD-T-018 ya estaba completada. La comparación Git confirma 21 commits posteriores, con cambios exclusivamente en ocho documentos. Los 13 archivos funcionales del alcance (frontend, autenticación, usuarios, Inbox/FEEDBACK y pruebas aisladas) conservan exactamente sus SHA históricos; no hay deriva funcional dentro del alcance de esta unidad.
Se revalidan H-AUD-018-001 a H-AUD-018-009 sin evidencia de corrección en los artefactos auditados: XSS almacenado en dashboard e Inbox; discrepancia Rol/Privilegios que oculta acciones de aprobación; caché Inbox no integrada; riesgo sobre la última cuenta Desarrollador y sesiones huérfanas; perfil local desactualizado; mutaciones Inbox sin auditoría central; lectura completa del historial; y respuesta de éxito para itemType no soportado.
AUG-113 a AUG-121 continúan pendientes; VAL-27 pendiente. No se crean hallazgos ni tareas duplicadas. La Tarea 18 conserva su estado histórico COMPLETADA; E1 estática no certifica validación funcional.
Archivos funcionales con identidad SHA comprobada: index.html, ui.js, main.js, state.js, navigation.js, auth.js, users.html, api-config.js, Services/Auth.js, Services/users.js, Services/feedback.js, Services/Test/Auth.js y Services/Test/users.js. Todos mantienen los SHA listados en AUD-CP-0057.
No se ejecutaron navegador, XSS real, Apps Script, HTTP, Spreadsheet/Drive real, YouTube, concurrencia, despliegue ni E2/E3. Sin cambios de aplicación, servicios, contratos, endpoints, configuración, assets, datos productivos, Drive, Spreadsheet ni deployments. Sin merge ni despliegue.
Siguiente unidad secuencial: AUD-T-019 — Validaciones de integridad en backend y batería exhaustiva de pruebas automatizadas.


## 43. Continuidad verificada — AUD-T-019
Sesión AUD-20261108-S059 | Checkpoint AUD-CP-0058 | HEAD E1 6f0f901179c10833cbeedcb2767a25fcdd085b0d | árbol E1 111dcd6270f62d5aaad6d5bfe34ebf47acafee82 | HEAD actual 7fc728ab34e55674f1826713a3f868d72b9f8830 | árbol actual 8f5e2bb234fe03d87d224ab27e147ae01fb1ad3c | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 histórica de AUD-T-019 ya estaba completada. La comparación Git confirma 21 commits posteriores, con cambios exclusivamente en ocho documentos. Los 15 archivos de código y documentación técnica del alcance (siete servicios, tres archivos Services/Test y cinco archivos de integración/frontend/README) conservan exactamente sus SHA históricos; no hay deriva funcional dentro del alcance de esta unidad.
Se revalidan H-AUD-019-001 a H-AUD-019-014 sin evidencia de corrección en los artefactos auditados: addSupplementaryInfo sin sesión; migración UTILITIES sin autenticación/lock; esquema Tutoriales incompatible con CATALOG; restauraciones Spreadsheet/Drive no transaccionales; validación tardía y escrituras parciales en addOrUpdateCut; éxito falso en vídeo suplementario; asociaciones PyS sin validar y sin lock; edición administrativa de ID/campos sin allowlist; updateUser parcial y sin lock; aprobación de vídeo sin validar destino/estado; validación VIN permisiva; ausencia de suite automatizada reproducible; mapa API desincronizado; y README contradictorio sobre fuentes de microservicios.
AUG-122 a AUG-135 continúan pendientes; VAL-28 pendiente. No se crean hallazgos ni tareas duplicadas. La Tarea 19 conserva su estado histórico COMPLETADA; E1 estática no certifica la ejecución funcional de pruebas 31–38.
Archivos con identidad SHA comprobada: Services/write.js, Services/catalog.js, Services/admin.js, Services/Utilities.js, Services/Auth.js, Services/users.js, Services/feedback.js, Services/Test/Auth.js, Services/Test/users.js, Services/Test/README.md, api-config.js, main.js, ui.js, index.html y README.md. Todos mantienen los SHA listados en AUD-CP-0058.
No se ejecutaron Apps Script, HTTP, Spreadsheet/Drive, YouTube, restauraciones, migraciones, concurrencia, estrés, runner de pruebas ni E2/E3. No se verificaron ACL/deployments ni datos productivos. Sin cambios de aplicación, servicios, contratos, endpoints, configuración, assets, pruebas ni README. Sin merge ni despliegue.
Siguiente unidad secuencial: AUD-T-020 — Saneamiento arquitectural, DRY, anti-debugging y auditorías globales.


## 44. Continuidad verificada — AUD-T-020
Sesión AUD-20261108-S060 | Checkpoint AUD-CP-0059 | HEAD E1 25d5d548edd79f812ab6b2bf9411d8c77fb30188 | árbol E1 011980eae1ae02143377faffcf5148c7067bfad7 | HEAD previo 8eb216b79dbfcc1d765342d69ff10fe9fa19b7e1 | árbol previo 2b576931a644b89006bbc12460b1458a28b641b7 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 histórica de AUD-T-020 ya estaba completada. La comparación Git confirma 21 commits posteriores y únicamente ocho archivos documentales modificados. Los 27 archivos funcionales/técnicos del alcance conservan exactamente sus SHA históricos; no existe deriva funcional desde la E1.
Se revalidan H-AUD-020-001 a H-AUD-020-004 sin evidencia de corrección en los artefactos: bloqueos anti-inspección eludibles que restringen zoom; logs de recuperación que exponen pendingOp y Base64; parsers VIN/versiones y helpers Drive duplicados con contratos divergentes; funciones internas y markup de depuración sin referencias internas confirmadas. H-AUD-020-005 permanece corregido documentalmente en la tabla de cobertura.
AUG-136 a AUG-139 continúan pendientes; AUG-036 y AUG-104 conservan sus adendas; VAL-29 sigue planificada y no ejecutada. No se crean hallazgos ni tareas duplicados. La Tarea 21 conserva su estado histórico COMPLETADA; E1 estática no certifica comportamiento funcional.
Archivos del alcance con identidad SHA comprobada (todos idénticos a E1):
- index.html 6dd0b86981e7f92b10b2f7a0a1634bb6395a479a
- main.js c15f5462d78fa907d14c71e15970ae29a3b3de77
- ui.js f00f48a42ee9bf0fd200f21959eb741f113363eb
- navigation.js 39ec9f5ed34f8f81b506222f3b7b02494f866ad0
- add_cortes.html 8a5e4bf51b3cd602224016a1267f478ce55ee329
- api-config.js a5c718d01b7da50b4b5e650c3bacd91456f4d670
- auth.js 2dc65f2e5903fc208ca14505053e82203a9dbd86
- state.js f2f18b66bdf72a999d6b83a7d2af4756eb07ba7f
- lightbox.js 841f44a54fe12b867c0c58cc560ce4474cde3e03
- offline.js c68e8698c74ef45a1c9bb534c6b2be77df817c34
- VinDifferentialEngine.js 7a018e3a2c66e10f6ac2bf2fdcedf0875fc240e4
- rich-text.js a7180766bb5097be510153edd851f4dfa939912c
- youtubeUpload.js 01559b95d4fff7b03c7833d5903496ab41dbc161
- service-worker.js 6779c97db87a574149eb44c7e97729ac7f18f4f5
- users.html e41f402675677a4d2783493614737021ec2eade5
- style.css dbcef5d28225c4ef1861fe0e0c11ad530f64ebd9
- Services/Auth.js fc69357b655c023b5ab3f7dd72cdab6fbb1787ed
- Services/catalog.js 253cbe9f873481114e7abff3aa8902c45e2560af
- Services/feedback.js 3db189523f6cb849d33550f29971c0ec6f386b3a
- Services/write.js 0c603ce8b56a871a6d9396bd5b047e364f9f580e
- Services/users.js 9b7ce20b40e5fdac1f1c106e769f9e539ad858b0
- Services/admin.js ffb120badeb9e8cbe931226a0ce90c0476363012
- Services/Utilities.js 1d99373e58c4f0c7ffec06e1db9b53a30d282e33
- Services/Test/Auth.js f9e522cdc673d1028ad2f6979bc860a2eff752f7
- Services/Test/users.js 83e0ea30dfeccc9d62a9c51f9add002c1850dde6
- Services/Test/README.md 1e8da5f26942cb7eb88a6579a1c9512f86b9d9ff
- README.md 4a944ac44602152a1a4ad8e985dcf12e4e33331c
No se ejecutaron Node/lint, navegador, Apps Script, HTTP, Spreadsheet/Drive, YouTube, concurrencia, restauraciones, migraciones, ACL/deployments ni E2/E3. Sin cambios de aplicación, servicios, contratos, endpoints, configuración, assets, datos productivos, Drive, Spreadsheet ni deployments. Sin merge ni despliegue.
Siguiente unidad secuencial: AUD-T-021 — Ficha técnica imprimible, paginación y distribución adaptativa de imágenes.


## 45. Continuidad verificada — AUD-T-021
Sesión AUD-20261108-S061 | Checkpoint AUD-CP-0060 | E1 histórica 3339694150823f8f8adca6ffbad6211c708a8960 | árbol E1 ebe322745a0458df1dbf749a28517ce97e36eb08 | HEAD previo b10057cbdb0d6e8fa638571034e95d210e0c947a | árbol previo 435cb6f3507bae8cdcd3ab519d15d16cceb7dd91 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 histórica de AUD-T-021 ya estaba completada. La comparación E1→HEAD actual reporta 22 commits posteriores y únicamente ocho archivos modificados, todos documentales: Auditoría.txt, ChangesLogs.txt, Plan_auditoría/Aug_Tareas.md, Plan_auditoría/Consolidacion_Auditoria.md, Plan_auditoría/Plan_Auditoria.md, Tareas.txt, checkpoint.md y contexto_personal.md. No hay cambios en archivos funcionales, CSS, HTML de aplicación ni assets desde el árbol E1; por ello, los SHA de los artefactos de implementación revisados, incluidos ui.js, rich-text.js y style.css, siguen siendo idénticos.
H-AUD-021-001 a H-AUD-021-009 permanecen registrados. Se conservan los nueve puntos: márgenes 5 mm frente a requisito 10 mm y contrato de paginación contradictorio; imagen/aviso Check Engine; espera incompleta de recursos; paginación sin medición real de altura; tarjetas sin imagen al final y pérdida de prioridad/orden; envío de URL de vídeo unlisted a api.qrserver.com; modo Vertical sin diferencia efectiva; interpolación HTML de datos de catálogo sin escape uniforme; y referencia histórica ajena a impresión en la fila del plan maestro. AUG-140 a AUG-145 siguen pendientes; AUG-146 continúa pendiente porque la fila maestra aún atribuye 6d7fbb9c a la ficha; AUG-096 permanece ampliada con sinks concretos de impresión. VAL-30 está planificada y no ejecutada. No se crean hallazgos ni tareas duplicados. La tarea histórica Bloque 7 conserva su estado COMPLETADA; la E1 estática no certifica impresión/PDF funcional.
No se ejecutaron navegador, impresión, PDF, QR/escaneo, Node/lint, pruebas móviles, red externa, Apps Script, Drive, Spreadsheet ni E2/E3. Sin cambios funcionales, CSS, HTML de aplicación, assets, servicios, endpoints, contratos, configuración, datos productivos, Drive, Spreadsheet o deployments. Sin merge ni despliegue.
Siguiente unidad secuencial: AUD-T-022 — Panel de desarrollador, navegación por secciones y modal administrativo.


## 46. Continuidad verificada — AUD-T-022
Sesión AUD-20261108-S062 | Checkpoint AUD-CP-0061 | E1 histórica 8f5d6d74f8f6b156ef67f3b21b6c0eeacf59d07b | árbol E1 e0c80e7334378847c24e9ada5020248a539cb168 | HEAD previo e6e59bafd7d66b7e8d7654d7079ed276ec7cdce0 | árbol previo a8759daf9e718625f76a73a9ddebb088faaa54bd | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
E1 histórica de AUD-T-022 (panel de desarrollador, navegación por secciones y modal administrativo) completada en 8f5d6d74f8f6b156ef67f3b21b6c0eeacf59d07b, árbol e0c80e7334378847c24e9ada5020248a539cb168. La revalidación desde E1 hasta HEAD e6e59bafd7d66b7e8d7654d7079ed276ec7cdce0 informa 22 commits posteriores; compare_commits enumera exclusivamente ocho documentos modificados (Auditoría.txt, ChangesLogs.txt, Plan_auditoría/Aug_Tareas.md, Plan_auditoría/Consolidacion_Auditoria.md, Plan_auditoría/Plan_Auditoria.md, Tareas.txt, checkpoint.md y contexto_personal.md). Ningún archivo funcional del alcance cambió; los nueve artefactos listados abajo conservan sus SHA históricos. No existe deriva funcional en el alcance de E1.
H-AUD-022-001 a H-AUD-022-004 continúan abiertos; AUG-147 a AUG-150 permanecen pendientes; VAL-31 continúa planificada/no ejecutada. No se agregan hallazgos ni tareas duplicados. Los cuatro hallazgos históricos permanecen: logout sin revocación/limpieza completa de estado; modal que no se cierra al mostrar login; semántica/gestión de foco incompleta del diálogo; ARIA incoherente en pestañas y respuesta de errores ADMIN que normaliza a HTTP 500.
La E1 estática no acredita comportamiento real de sesión, logout, teclado, lector de pantalla ni respuestas HTTP. No se ejecutaron navegador, teclado/lector de pantalla, logout/revocación, HTTP, Apps Script, Drive, Spreadsheet, Node/lint, concurrencia, estrés, despliegues ni E2/E3. Sin cambios funcionales ni operaciones productivas, merge o despliegue.
Archivos funcionales comprobados:
Alcance funcional histórico (SHA idénticos a E1):
- ui.js: f00f48a42ee9bf0fd200f21959eb741f113363eb
- main.js: c15f5462d78fa907d14c71e15970ae29a3b3de77
- auth.js: 2dc65f2e5903fc208ca14505053e82203a9dbd86
- state.js: f2f18b66bdf72a999d6b83a7d2af4756eb07ba7f
- index.html: 6dd0b86981e7f92b10b2f7a0a1634bb6395a479a
- style.css: dbcef5d28225c4ef1861fe0e0c11ad530f64ebd9
- api-config.js: a5c718d01b7da50b4b5e650c3bacd91456f4d670
- Services/admin.js: ffb120badeb9e8cbe931226a0ce90c0476363012
- Services/Auth.js: fc69357b655c023b5ab3f7dd72cdab6fbb1787ed
No se modifican Auditoría.txt, Tareas.txt ni Plan_auditoría/Aug_Tareas.md: H-AUD-022-001 a 004, AUG-147 a AUG-150 y VAL-31 ya están registrados; no hay novedades ni duplicados.
Siguiente unidad secuencial: AUD-T-001 — Recuperación del App Shell, arranque, inicialización y estabilización general.


## 47. Continuidad verificada — AUD-T-001
Sesión AUD-20261108-S063 | Checkpoint AUD-CP-0062 | E1 histórica 35446ac7dd3697b4cd318895c9040e3bf239720c | árbol E1 0d9e88098c57b7550334e84bf74feecf6fef83ae | HEAD previo 787df40810778acf35cca65ee52f84d2dcf2a991 | árbol previo c253c8e0672f4f97e9637b66e36592ff8cecc095 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 de AUD-T-001 se completó en AUD-20261108-S041/AUD-CP-0041. La comparación E1→HEAD comprende 22 commits posteriores y enumera únicamente ocho documentos modificados: Auditoría.txt, ChangesLogs.txt, Plan_auditoría/Aug_Tareas.md, Plan_auditoría/Consolidacion_Auditoria.md, Plan_auditoría/Plan_Auditoria.md, Tareas.txt, checkpoint.md y contexto_personal.md. Ningún archivo funcional del alcance aparece en el diff; los nueve archivos listados conservan sus SHA históricos. No hay deriva funcional desde E1.
Se conservan sin duplicación H-AUD-001-001 y H-AUD-001-002: (1) espera/polling del deep link sin límite ni cancelación cuando el catálogo permanece vacío/no disponible; (2) processCatalogData absorbe errores y los llamadores pueden establecer catalogLoaded=true sin confirmar que el catálogo se actualizó. Se mantienen AUG-151 como tarea nueva, las adendas existentes AUG-008/AUG-049 y la revalidación de H-AUD-015-002/AUG-099. VAL-32 continúa planificada y no ejecutada.
La E1 es estática: no certifica arranque real, transiciones de sesión, recuperación de catálogo, deep links, comportamiento multi-pestaña ni endpoint ADMIN. No se ejecutaron navegador, Node/lint, HTTP, Apps Script, Drive, Spreadsheet, concurrencia, pruebas multi-pestaña, accesibilidad, despliegues ni E2/E3. Sin cambios funcionales, permisos, contratos, configuración, assets, datos productivos ni deployments; sin merge ni despliegue.
Archivos funcionales del alcance, SHA idénticos a E1:
- main.js: c15f5462d78fa907d14c71e15970ae29a3b3de77
- auth.js: 2dc65f2e5903fc208ca14505053e82203a9dbd86
- ui.js: f00f48a42ee9bf0fd200f21959eb741f113363eb
- state.js: f2f18b66bdf72a999d6b83a7d2af4756eb07ba7f
- index.html: 6dd0b86981e7f92b10b2f7a0a1634bb6395a479a
- style.css: dbcef5d28225c4ef1861fe0e0c11ad530f64ebd9
- api-config.js: a5c718d01b7da50b4b5e650c3bacd91456f4d670
- Services/admin.js: ffb120badeb9e8cbe931226a0ce90c0476363012
- Services/Auth.js: fc69357b655c023b5ab3f7dd72cdab6fbb1787ed
No se crean hallazgos ni tareas duplicados. Auditoría.txt, Tareas.txt y Plan_auditoría/Aug_Tareas.md permanecen sin cambios porque H-AUD-001-001/002, AUG-151, las adendas AUG-008/AUG-049, la revalidación AUG-099 y VAL-32 ya constan en el registro histórico.
Observación documental: un resumen agregado antiguo dentro de Tareas.txt aún clasifica AUD-T-001 como «por auditar», aunque el registro individual y CP-0041 documentan E1 completada. No se altera el registro maestro en esta continuidad; queda anotada la discrepancia para conciliación documental.
Siguiente unidad: AUD-T-002 — RBAC, AUTH, USERS, roles y autorización de operaciones de usuario (continuidad desde AUD-CP-0002).


## 48. Continuidad verificada — AUD-T-002
Sesión AUD-20261108-S064 | Checkpoint AUD-CP-0063 | E1 histórica 1136f20ee25778cceac857b4a3145aa2f405ba54 | árbol E1 5904f6ec4449fa94e7a2cbf6149ae0a885ca128f | HEAD previo 139c03443c6ab83173c357fbb421decf6a0294cb | árbol previo 256455de848d87adb8f724c5aecce1f5324d51d0 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 estática de AUD-T-002 se completó en AUD-20261108-S042/AUD-CP-0042, continuando desde AUD-CP-0002. La comparación E1→HEAD actual registra 22 commits posteriores y únicamente siete archivos documentales modificados: Auditoría.txt, ChangesLogs.txt, Plan_auditoría/Aug_Tareas.md, Plan_auditoría/Consolidacion_Auditoria.md, Plan_auditoría/Plan_Auditoria.md, checkpoint.md y contexto_personal.md. No aparece ningún archivo funcional del alcance en el diff.
Los cinco archivos funcionales del alcance mantienen exactamente sus SHA históricos de E1:
- Services/users.js: 9b7ce20b40e5fdac1f1c106e769f9e539ad858b0
- Services/Auth.js: fc69357b655c023b5ab3f7dd72cdab6fbb1787ed
- auth.js: 2dc65f2e5903fc208ca14505053e82203a9dbd86
- users.html: e41f402675677a4d2783493614737021ec2eade5
- api-config.js: a5c718d01b7da50b4b5e650c3bacd91456f4d670
Se confirma continuidad sin deriva funcional en los artefactos auditados. H-AUD-001 a H-AUD-006 permanecen abiertos; AUG-005 a AUG-010 continúan existentes y revalidadas. No se crean hallazgos, tareas ni adendas duplicadas. Se conservan los vínculos con AUD-T-023 (hashing/credenciales), AUD-T-024 (ciclo avanzado de sesiones y controles), AUD-T-033 (coordinación interservicios) y AUD-T-036 (legal/consentimiento). VAL funcional de roles, sesiones, revocación, expiración, concurrencia y deployments permanece pendiente.
La E1 es estática y la presente revalidación es documental/Git: no certifica ejecución real de roles, sesiones, logout/revocación, expiración, cambios de contraseña, concurrencia ni coordinación multi-pestaña. No se ejecutaron navegador, Node/lint, HTTP, Apps Script V8, Spreadsheet, pruebas de roles/sesiones, concurrencia, multi-pestaña, accesibilidad, deployments ni E2/E3. Sin cambios funcionales, endpoints, contratos, configuración, permisos, credenciales, assets, datos productivos, Drive o Spreadsheet; sin merge ni despliegue.
No se modifican Auditoría.txt, Tareas.txt ni Plan_auditoría/Aug_Tareas.md: hallazgos y tareas ya están registrados, sin novedades que justifiquen duplicación. La comparación histórica lista siete documentos; este commit actualiza únicamente los cinco documentos de continuidad establecidos.
Siguiente unidad: AUD-T-003 — Registro de vehículos y cortes, add_cortes, idempotencia y resiliencia de red.


## 49. Continuidad verificada — AUD-T-003
Sesión AUD-20261108-S065 | Checkpoint AUD-CP-0064 | E1 histórica 06f18e42383f5be448c378bc09ab534731cfbd6b | árbol E1 df13476222de951f65c7d31559598d5fe12914a5 | HEAD previo 3e6ee89273e209bfdfea7e7e9517a14efa5a9096 | árbol previo e68f1ee24bcad2faf275f5dd53c9e95d409ad627 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
La E1 estática de AUD-T-003 fue completada en AUD-20261107-S021/AUD-CP-0021. La comparación E1→HEAD actual registra 44 commits posteriores y ocho archivos modificados, todos documentales: Auditoría.txt, ChangesLogs.txt, Plan_auditoría/Aug_Tareas.md, Plan_auditoría/Consolidacion_Auditoria.md, Plan_auditoría/Plan_Auditoria.md, Tareas.txt, checkpoint.md y contexto_personal.md. Ningún archivo funcional del alcance aparece en el diff.
Los archivos funcionales/auxiliares consultados mantienen exactamente sus SHA históricos:
- add_cortes.html: 8a5e4bf51b3cd602224016a1267f478ce55ee329
- Services/write.js: 0c603ce8b56a871a6d9396bd5b047e364f9f580e
- Services/admin.js: ffb120badeb9e8cbe931226a0ce90c0476363012
- api-config.js: a5c718d01b7da50b4b5e650c3bacd91456f4d670
- youtubeUpload.js (contraste auxiliar): 01559b95d4fff7b03c7833d5903496ab41dbc161
Se confirma continuidad sin deriva funcional en el alcance auditado. H-AUD-003-001 a H-AUD-003-004 permanecen abiertos; AUG-055 a AUG-058 continúan pendientes y AUG-043 conserva su adenda relativa a videoGuiaUrl/disponibilidad. No se crean hallazgos, tareas ni adendas duplicadas. Se mantienen las relaciones con AUD-T-031/032/033/035/038 y las tareas existentes AUG-039/AUG-043/AUG-053/AUG-054.
Resumen de hallazgos conservados: persistencia local no obligatoria y opId no vinculado de forma estricta al payload; disponibilidad real de opciones de corte/vídeo no reflejada de forma consistente en la UI; posibles estados bloqueados ante errores de FileReader; recuperación automática de operaciones no serializada. Los controles positivos documentados (validación backend de sesión/rol y slot, preservación de vehicleId en segundo corte, normalización/omisión de campos «No recomendado», estados pending/completed y token de carga) se mantienen como evidencia E1, no como certificación de ejecución.
La E1 es estática y esta revalidación es documental/Git: no certifica cuota real de localStorage, FileReader, pérdida/ambigüedad de respuesta HTTP, recuperación concurrente, persistencia real, integración Apps Script/Drive/Spreadsheet ni deployments. No se ejecutaron navegador, Node/lint, pruebas de cuota, FileReader real, HTTP, Apps Script V8, Drive/Spreadsheet, concurrencia, deployments ni E2/E3. Sin cambios funcionales, endpoints, contratos, configuración, credenciales, assets o datos productivos; sin merge ni despliegue.
No se modifican Auditoría.txt, Tareas.txt ni Plan_auditoría/Aug_Tareas.md: los hallazgos y tareas están registrados y no hay novedades que justifiquen duplicación.
Siguiente unidad: AUD-T-004 — VIN: identificación, colecciones, almacenamiento, búsqueda y diferencial (continuidad E1 ya completada).


## 50. Continuidad AUD-T-004 — verificación E1
- Sesión AUD-20261108-S066; checkpoint AUD-CP-0065; E1 histórica 24f68780e6b7ad5ad835ce76c1d6abda0a80a528; HEAD previo b8eeeccc0571cb7bb8065cbbb6f7921fbea453bd; árbol inicial f3d2c8efb7d1b475c6788b7819763368bf475f81; base d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación E1→HEAD: 44 commits posteriores; ocho archivos cambiados, todos documentales. Los nueve archivos funcionales/auxiliares del alcance mantienen exactamente sus SHA de E1; sin deriva funcional.
- H-AUD-004-001 a 003 permanecen abiertos; AUG-059/AUG-060 pendientes; H-AUD-037-007 y AUG-050 conservan su relación/ampliación. No se crean hallazgos ni tareas duplicados.
- Se confirma que el editor administrativo de VIN, la validación backend de longitud y la asociación/presentación por slots continúan sin cambios respecto a la E1 original; los riesgos históricos siguen vigentes.
- VAL-12 y validación funcional/integración continúan pendientes. Esta revalidación Git no certifica ejecución de VIN, persistencia, migración, Spreadsheet/Apps Script ni concurrencia.
- Sin navegador, Node/lint, ejecución del motor VIN, HTTP, Apps Script V8, Spreadsheet/Drive, concurrencia, migración, deployments ni E2/E3. Sin cambios funcionales, datos productivos, merge ni despliegue.
- No se modifican Auditoría.txt, Tareas.txt ni Plan_auditoría/Aug_Tareas.md: no hay hallazgos/tareas nuevos.
- Siguiente: AUD-T-005.


## 51. Continuidad AUD-T-005 — verificación E1
- Sesión AUD-20261108-S067; checkpoint AUD-CP-0066; E1 histórica c56c6f7e21a668774db726e2f14139588f1bc5c0; HEAD previo c7ad01b89f7228622f9732c5d38850cd987a207a; árbol f0b42401982a0f6ac35a93be3230a4d31af37b3e; base d9acc68d889985c2e2f42fe3a02e502efc86ead1 intacta.
- Comparación E1→HEAD: 44 commits posteriores; ocho archivos cambiados, todos documentales. Los 11 archivos funcionales del alcance mantienen exactamente sus SHA de E1; sin deriva funcional.
- H-AUD-005-001 a 008 permanecen abiertos. AUG-061 a AUG-064 continúan pendientes; AUG-043/AUG-050/AUG-057 conservan adendas. H-AUD-005-008 se coordina con AUD-T-007.
- Se revalidan estáticamente los sinks innerHTML de apertura/alimentación, handler addSupplementaryInfo en WRITE/ADMIN, dropdowns de corte/relay y formularios contextuales. Los riesgos documentados permanecen; no se crean hallazgos ni tareas duplicados.
- Validación funcional, seguridad dinámica e integración permanecen pendientes. No se ejecutaron navegador, XSS dinámico, FileReader real, concurrencia, HTTP, Apps Script V8, Spreadsheet/Drive, YouTube, móvil/PWA, deployments ni E2/E3.
- Sin cambios funcionales, endpoints, contratos, configuración, assets, credenciales, datos productivos, merge ni despliegue. No se modifican Auditoría.txt, Tareas.txt ni Plan_auditoría/Aug_Tareas.md.
- Siguiente: AUD-T-006.


## 52. Continuidad verificada — AUD-T-023
Sesión AUD-20261108-S068 | Checkpoint AUD-CP-0067 | E1 histórica 87d75c38d72e76ed60132d2507661f4e1017a0e8 | HEAD auditado 843818e9199e0952ca575196e79efa09f5bffb87 | árbol 39ca9cfe52d1aa2d5bf0695f28d874b8c0411a02 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Comparación E1→HEAD: 65 commits posteriores; Services/admin.js y Services/write.js son los dos archivos de código modificados en el diff global. Services/write.js está fuera de alcance; nueve de diez archivos auditados conservan SHA E1. En admin.js, assertDeveloperSession(), guardia inicial de doPost() y autorización antes del switch permanecen idénticas byte por byte.
- H-AUD-023-001 a 008 permanecen abiertos: SHA-256 sin KDF, migración legacy sin coordinación, escrituras de contraseña USERS sin serialización, contador concurrente, purga Logs por índices, cuentas legacy inactivas, formatos desconocidos interpretados como legacy y validación UI sin trim/typo.
- ADMIN 0 mantiene validación backend de sesión activa/rol Desarrollador para toda acción distinta de ping. Las líneas nuevas de log de admin.js no incorporan campos de contraseña/token.
- AUG-010 a AUG-014 siguen siendo las tareas correctivas; conservar relación AUD-T-033/AUG-003 y separación AUD-T-024. Sin hallazgos/tareas duplicados.
- Sin Apps Script V8, HTTP, login real, acceso a Sheets/Logs, benchmark KDF, migración, concurrencia real, CacheService, locks entre proyectos, deployments, navegador ni E2/E3. Validación funcional pendiente; no se afirma purga/migración productiva.
- Sin cambios de código, endpoints, contratos, configuración, credenciales ni datos productivos. No se modifican Auditoría.txt, Tareas.txt ni Aug_Tareas.md. Siguiente: AUD-T-024.


## 53. Continuidad verificada — AUD-T-024
Sesión AUD-20261108-S069 | Checkpoint AUD-CP-0068 | E1 histórica 3e458bbf67fce2a95847f4f5a0bf5d72170d4eec | HEAD auditado 2f627a9f11a2e0c6282903d515b8ef893cd15b96 | árbol 948c7398f5afa6421f79ea917ca3a2f8efdf1ed4 | base d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Comparación E1→HEAD: 65 commits posteriores; 10 archivos en diff global. Services/admin.js y Services/write.js son los únicos archivos funcionales cambiados y ambos están fuera del alcance. Los 12 archivos funcionales/auxiliares de AUD-T-024 conservan SHA idénticos a E1.
- H-AUD-024-001 a 010 permanecen abiertos: respuesta asíncrona obsoleta; lock local no atómico entre pestañas; carrera login/resetUserSessions; autodeleción y sesiones huérfanas; creación parcial de sesión; reset múltiple parcial; navegación residual tras cambio de rol; logout solo local; falta de política de expiración; AUTH no comprueba existencia del usuario.
- Controles positivos: USERS valida token/usuario/rol en getVerifiedSession y restringe resetUserSessions a Desarrollador; no se asume que los ScriptLock de AUTH y USERS sean compartidos.
- Se conservan AUG-005 a 008 y sus adendas; AUG-010/AUD-T-033/AUG-003; AUG-016 y AUG-017. Sin tareas duplicadas.
- Sin navegador, multi-pestaña, HTTP, Apps Script V8, login/revocación/expiración reales, concurrencia, fallos inyectados, pruebas de roles, deployments ni E2/E3. E1 no certifica comportamiento funcional.
- Sin cambios de código, endpoints, contratos, configuración, credenciales ni datos productivos. No se modifican Auditoría.txt, Tareas.txt ni Aug_Tareas.md. Siguiente: AUD-T-025.
