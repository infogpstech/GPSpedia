# Matriz de cancelación, sustitución y continuidad de requisitos — GPSpedia

**ID:** AUG-004 | **Plan:** AUD-PLAN-2026-001 | **Fecha:** 2026-11-09  
**Repositorio:** infogpstech/GPSpedia | **Rama:** GPSpedia2.2.5_work  
**HEAD de referencia:** 7aa7b6e3489af412fe8caa8dbcd529328ab243a8  
**Rama base:** GPSpedia2.2.5 — d9acc68d889985c2e2f42fe3a02e502efc86ead1

## 1. Criterio de clasificación

Se reconciliaron las cuatro partes inmutables de Tareas.txt, los ChangesLogs legacy, los registros AUG activos y las auditorías AUD-T. Los archivos legacy no se modifican.

Los estados [X], «completada» o «implementada» conservan su significado histórico; no certifican por sí solos el estado actual ni reemplazan la validación local vigente. Si una auditoría posterior detecta una brecha, esta permanece en su H-AUD/AUG propietario sin borrar el cierre histórico ni duplicar la tarea.

Categorías: **vigente**, **completado históricamente/continuidad confirmada**, **parcial**, **cancelado/retirado**, **sustituido/absorbido** y **pendiente de reconciliación local**.

## 2. Decisiones explícitas: filtros y botones

| Requisito | Clasificación | Evidencia histórica y estado actual | Registro canónico |
|---|---|---|---|
| Tarea 1.6 — filtros rápidos | **CANCELADO Y RETIRADO** | La decisión está expresa en Tareas_legacy_parte_001. Commit `e5b19116a107b0851fd17b265030001d2106f0da` retiró `#btn-toggle-filters` y `#catalog-filters-bar`. En HEAD, `index.html` (6dd0b869), `navigation.js` (39ec9f5e) y `style.css` (dbcef5d2) no contienen los controles/estilos. `main.js` (c15f5462), líneas 123–125, aún referencia `toggleFiltersBtn`/`filtersBar` inexistentes. | No reintroducir filtros. El residuo es una corrección de limpieza en H-AUD-015-002/AUG-099. |
| Tarea 15 — parte de filtros | **CANCELADO; DUPLICADO DE Tarea 1.6** | Repite la misma función y la misma decisión de búsqueda universal. | Absorbido por Tarea 1.6; no crear otra tarea. |
| Tarea 15 — estandarización universal de botones | **VIGENTE; PARCIAL** | Commit `ded75b6cb806799c1994e80c75febece8b34ed12` documentó estilos unificados. AUD-T-015 encontró que el contrato universal no está completo: `users.html` (45d4b872) y `add_cortes.html` (078b077a) conservan reglas locales `.btn`; `style.css` (dbcef5d2) mantiene estilos por componente. | H-AUD-015-003/AUG-100. Mantener pendiente hasta cumplir los criterios y pruebas locales. |
| Tarea 15 — verificación 14.3 | **DIVIDIDA** | Los casos de filtros son obsoletos; los de botones, estados, tema, accesibilidad y regresión siguen vigentes. | Casos de botones en AUG-100/VAL-24/VAL-25; no probar ni reactivar filtros. |

## 3. Cruce de tareas tempranas

| Registro legacy | Clasificación y continuidad | Relación canónica |
|---|---|---|
| Tareas 1.1–1.7 | **Mixto: absorbido, histórico, cancelado o parcial.** 1.1 selector Relay; 1.2 formato enriquecido; 1.3 navegación por etapas; 1.4 carga PyS; 1.5 sombras; 1.6 filtros; 1.7 toolbar Inbox. | 1.1 → AUD-T-005/AUG-063. 1.2 → Tarea 13 y rich-text.js. 1.3 → AUD-T-003. 1.4 → evolución PyS/AUD-T-010/011. 1.5 → commit `168d14a7e8a02735c6374ae89cedb82dab900914`. 1.6 → cancelada. 1.7 → commit `e5b19116`; la función `createInboxRichTextToolbar` sigue presente en `ui.js` (ca. 5603–5761, SHA ca8a0f48). |
| Tareas 2.1–2.6 | **Absorbidas en correcciones históricas y auditorías posteriores.** ChangesLogs_legacy_parte_001 registra correcciones de Inbox, impresión, modales, tarjetas, búsqueda y CSS. | No crear tareas paralelas. Solo corregir brechas respaldadas por H-AUD/AUG actuales. |
| Tarea 3.1 — acordeón «Posibles problemas» | **Absorbida en PyS y asociación vehículo–problema.** | AUD-T-010/011; no duplicar. |
| Tarea 4.1 — VIN y versión de equipamiento | **Parcial/evolucionada.** | AUD-T-004; AUG-036/AUG-050/AUG-059/AUG-060. |
| Tarea 5 — ampliación desde modal (+) | **Parcial/evolucionada.** | AUD-T-005; AUG-061–064 y autorización separada en AUG-039. |
| Tareas 6–12 | **Históricas, con continuidad por dominio.** Lightbox, navegación, deep links, reportes, PyS, asociaciones, tutoriales y multimedia. | Mantener los AUD-T/AUG propietarios; no reabrir en bloque por antigüedad. |
| Tarea 13 — texto enriquecido/sanitización | **Parcial/evolucionada.** El editor existe; la sanitización autoritativa y los sinks conservan brechas. | AUD-T-014; AUG-095/AUG-096/AUG-097. |
| Tarea 14 — búsqueda global multi-sección | **Implementada históricamente; parcial en criterios actuales.** AUD-T-015 confirmó la búsqueda, pero encontró brechas de campos, ranking, acentos, carga, autoapertura y clasificación. | AUG-049/AUG-101; el sink de consulta en AUG-098. |
| Tarea 16 — tema, contraste, footer y responsive | **Histórica; correcciones residuales separadas.** | AUD-T-016, AUG-102–105 y VAL-25. |
| Tareas 17–21 | **Históricas; continuidad en auditorías propietarias.** | Revalidaciones AUD-T-017–021 y AUG vinculadas. No cambiar retrospectivamente [X] ni duplicar tareas. |
| Tareas 8.1–8.4 de YouTube | **Evolucionadas con dependencias separadas.** | AUD-T-012/AUG-043 y tareas de autorización, sesión e idempotencia relacionadas. |
| Requisitos de impresión/PDF agregados el 2026-11-04 | **Vigentes en su alcance; refinados posteriormente.** | AUG-140–146 y validaciones relacionadas. Las pruebas locales aplicables deben aprobarse; Beta queda diferida. |

## 4. Cruce de las partes legacy posteriores

| Fuente | Clasificación | Registros canónicos |
|---|---|---|
| Tareas_legacy_parte_002: imágenes, historial, permisos, AUTH/USERS/WRITE, ADMIN, logs, FEEDBACK, endpoints, Inbox, Drive y DB | **Absorbidos en tareas propietarias; no constituyen una lista paralela ejecutable.** | Imágenes/Drive: AUG-026–033 y tareas relacionadas. ADMIN/backup/telemetría: AUG-018–025. AUTH/USERS/sesiones: AUG-005–017. WRITE/FEEDBACK/UTILITIES: AUG-039–044 y dependencias. |
| Protección técnica de rama | **AUG-001 completada por confirmación del propietario.** | El propietario confirmó que realizó la configuración. El agente no la ejecutó ni afirma haberla verificado independientemente. |
| Procedimiento Git Database API | **Absorbido en el Proceso de desarrollo vigente.** | La norma actual de commit único y actualización condicionada de ref es la fuente canónica. |
| Tareas de coordinación, idempotencia, testigo, rich text, normalización de imágenes y seguridad de parte 003 | **Vigentes en sus AUG canónicas.** | AUG-034–044, AUG-055–064, AUG-075–097 y adendas. No duplicar por similitud de título. |
| AUD-T-001–022, VAL-25–34 y H-AUD-040/041/042 de parte 004 | **Artefactos de auditoría, validación o corrección documental; no requisitos de producto duplicados.** | Mantener sus IDs y estados. Una VAL planificada no equivale a prueba ejecutada. H-AUD-040 conserva su invalidación histórica; H-AUD-041 contiene el método corregido; H-AUD-042 se absorbió en las normas de desarrollo. |

## 5. Evidencia actual específica

**Filtros:** commit de retirada `e5b19116a107b0851fd17b265030001d2106f0da`; los IDs/estilos están ausentes de HTML/CSS/Navigation. El residuo de `main.js` (c15f5462, líneas 123–125) queda en AUG-099.

**Botones:** commit histórico `ded75b6cb806799c1994e80c75febece8b34ed12`; las reglas locales actuales en users.html/add_cortes.html y los estilos por componente de style.css confirman que el alcance universal no está completo. AUG-100 es la tarea propietaria.

**Inbox:** commit `e5b19116`; `ui.js` (ca8a0f48) conserva `createInboxRichTextToolbar`. La presencia del editor no sustituye sanitización backend, que permanece en AUG-095–097.

## 6. Política de cierre y validación

**Implementación + todas las pruebas locales aplicables aprobadas = COMPLETADA.** La revisión sintáctica, pruebas locales, comparación contra respaldos, revisión de regresiones, Code Review y commit verificado forman parte del cierre local.

Las pruebas que requieren deployments, endpoints reales o integración de servicios se registran como **VALIDACIÓN DIFERIDA A BETA** y no bloquean el cierre local cuando los requisitos reproducibles localmente ya se aprobaron. Los defectos descubiertos en Beta generan una corrección nueva y trazable, sin alterar retroactivamente un cierre local válido.

Esta tarea es documental: se revisaron fuentes, commits, SHA, referencias y consistencia. No se ejecutaron pruebas funcionales de la aplicación ni Beta.

## 7. Resultado y límites

AUG-004 queda reconciliada como entregable documental. Los filtros rápidos están cancelados; Tarea 15 se divide entre filtros cancelados y botones vigentes/parciales; las brechas actuales se conservan en sus AUG/H-AUD propietarios; los registros de auditoría/validación no se duplican como tareas de producto.

La matriz clasifica los registros por tarea, subtarea y familia documental. No afirma que todos los requisitos estén implementados: los pendientes conservan su estado en los registros canónicos. Las partes legacy permanecen inmutables.
