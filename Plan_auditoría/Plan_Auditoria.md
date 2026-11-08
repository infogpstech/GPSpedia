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
