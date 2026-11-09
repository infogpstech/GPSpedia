# Normas obligatorias de gestión documental — GPSpedia

**ID:** DOC-NORM-2026-001. **Límite:** 180,000 caracteres Unicode por archivo.

## 1. Historial append-only
- Está prohibido borrar, truncar, vaciar, sobrescribir, reemplazar o reordenar entradas históricas.
- Toda entrada nueva se agrega exclusivamente al final del documento activo.
- Rectificaciones, invalidaciones y cambios de estado se registran como entradas nuevas, fechadas y vinculadas a la original; nunca se modifica la entrada anterior.
- Los IDs asignados quedan reservados y no se reutilizan.

## 2. Límite y rotación
- Ningún documento activo ni parte legacy puede superar 180,000 caracteres Unicode. El conteo se realiza por puntos de código e incluye espacios y saltos de línea; no por bytes.
- Antes de agregar una entrada se calcula el tamaño resultante. Si excede 180,000, primero se rota el archivo y la entrada se escribe en el nuevo documento activo.
- El documento cerrado se conserva en `Olds/Documentacion_Legacy/` con el formato `nombre_legacy_parte_NNN.ext`; se mantiene la extensión original y se usa numeración incremental de tres dígitos, sin reutilizar números.
- Los documentos que ya excedan el límite se dividen en partes secuenciales de hasta 180,000 caracteres. Se prefieren límites de línea; si una línea excede el máximo, se divide por puntos de código.
- Concatenar las partes en orden debe reconstruir exactamente el contenido original. No se permite resumir, corregir ni normalizar el contenido legacy.

## 3. Manifiesto y continuidad
- Cada rotación registra ruta original, SHA del blob, cantidad de caracteres, cantidad de partes, ruta y longitud de cada parte.
- El nombre activo canónico se conserva como archivo nuevo o índice que apunta al archivo legacy.
- Las partes legacy son inmutables. Toda referencia debe resolverse mediante el nombre activo o el manifiesto `Olds/Documentacion_Legacy/README.md`.
- Las entradas históricas y sus IDs no se borran; las nuevas se agregan al final.

## 4. Alcance
Aplica a Auditoría, ChangesLogs, Tareas, checkpoints, contexto, LOGS, Aug_Tareas, Plan_Auditoria, Consolidacion y cualquier bitácora o documento acumulativo. Los demás documentos también deben respetar el máximo si crecen hasta él.

## 5. Integridad y auditoría
La migración mecánica conserva contenido y no constituye una auditoría. **No auditar auditorías** ni reabrir unidades AUD-T completadas. Antes de cada rotación se verifican HEAD, conteo, número siguiente, reconstrucción exacta, manifiesto y referencias. Si hay discrepancia, detenerse sin sobrescribir el original.



## 6. Separación de registros de tareas y compuerta de sintaxis
- Los pendientes se mantienen en Tareas_pendientes_parteNN.txt; los cierres demostrados en tareas_completadas_parteNN.txt; las funcionalidades pospuestas para Beta en lista_beta.txt.
- Cada parte es autocontenida e incluye sus normas internas. Máximo 180,000 caracteres Unicode; rotar secuencialmente sin pérdida ni renumeración de IDs.
- No mover una tarea al registro de completadas por aparecer como [X], «implementada», «revisada estáticamente» o «validada parcialmente» en un documento histórico.
- Para implementaciones de código, registrar revisión sintáctica exitosa de todos los archivos afectados, con analizador apropiado, herramienta/versión y resultado. Una sintaxis no ejecutada o fallida mantiene la tarea abierta.
- La sintaxis aprobada no reemplaza pruebas funcionales/de regresión, comparación con respaldo, Code Review, revisión de efectos colaterales ni verificación del commit único. Si alguna es obligatoria y está pendiente, no cerrar la tarea.
- Para tareas documentales, declarar sintaxis de código N/A y validar estructura, integridad, referencias, límite de caracteres y revisión documental.
- Las tareas Beta no se implementan antes de superar la compuerta de entrada descrita en lista_beta.txt.
- Las partes legacy permanecen inmutables; los estados antiguos son antecedentes, no cierres vigentes sin evidencia.



================================================================================
## 7. Norma de cierre de tareas de implementación — ADENDA VIGENTE (2026-11-09)

Esta adenda establece el criterio definitivo de cuándo una tarea puede marcarse como COMPLETADA. Prevalece sobre cualquier frase anterior que condicione el cierre local a pruebas de Beta, deployments, endpoints reales o validación integrada posterior.

### 7.1 Cierre basado en validación local
Una tarea de implementación se marca como **COMPLETADA** cuando el cambio satisface todos sus requisitos y criterios de aceptación y supera las verificaciones que corresponden en el entorno local de desarrollo. Como mínimo, según la naturaleza del cambio:
- revisión de todos los archivos afectados y del diff contra el estado previo;
- sintaxis/parsing de todos los archivos afectados, con herramienta adecuada;
- pruebas locales de lógica, unidades, contratos o integración con dobles/mocks cuando sean aplicables;
- verificación de los criterios de aceptación reproducibles localmente;
- Code Review, seguridad, efectos colaterales y compatibilidad/regresión local pertinente;
- revisión de que no se hayan alterado archivos, servicios o funcionalidades fuera del alcance;
- commit y verificación de que el cambio quedó registrado en la rama de trabajo.

No se exige que los servicios estén desplegados, que existan endpoints operativos ni que se hayan ejecutado pruebas contra deployments para declarar la tarea local COMPLETADA. Tampoco se exige esperar a Beta si los requisitos de la tarea pueden verificarse localmente y ya se cumplieron.

### 7.2 Qué significa “pendiente de Beta”
Las pruebas que necesitan deployments, endpoints reales, integración entre servicios desplegados, credenciales/infraestructura aislada o validación del sistema ya integrado se registran como **VALIDACIÓN DIFERIDA A BETA**, no como una condición que mantenga abierta la tarea local.

La anotación debe describir con precisión qué no se probó y por qué. No debe rebajar ni invalidar el estado COMPLETADA obtenido localmente.

### 7.3 Secuencia global de publicación
La secuencia del proyecto es:
1. implementar todas las tareas y correcciones;
2. cerrar cada tarea individualmente mediante validación local y evidencia;
3. completar la revisión global de implementaciones;
4. después desplegar/configurar los servicios y realizar la integración;
5. ejecutar la validación funcional de Beta sobre el sistema desplegado e integrado.

Por tanto, los despliegues y pruebas integradas de Beta se realizan después de terminar las implementaciones previstas, no como requisito previo para cerrar cada tarea local.

### 7.4 Hallazgos descubiertos en Beta
Si Beta descubre un defecto, regresión o incumplimiento no detectado localmente, se registra como un hallazgo/tarea correctiva nuevo, con su propia trazabilidad y criterio de aceptación. No se cambia retroactivamente el estado histórico de la tarea original, salvo que se demuestre que la implementación local nunca cumplió sus propios requisitos o que se falseó/incompletó su evidencia.

### 7.5 Estados normalizados
- **PENDIENTE:** implementación o verificaciones locales requeridas aún no terminadas.
- **IMPLEMENTADA_PENDIENTE_DE_VALIDACIÓN_LOCAL:** código escrito, pero faltan una o más verificaciones locales obligatorias.
- **COMPLETADA:** requisitos satisfechos y validación local aprobada; puede incluir una nota separada de validación diferida a Beta.
- **VALIDACIÓN DIFERIDA A BETA:** etiqueta complementaria para pruebas de despliegue/integración; no es un estado que invalide COMPLETADA.
- **BLOQUEADA:** existe una dependencia o impedimento concreto que impide completar la implementación o su validación local. La mera ausencia de deployment no constituye bloqueo local.

### 7.6 Aplicación a los registros existentes
Revisar los estados actuales que se hayan mantenido abiertos únicamente por falta de deployments o pruebas de Beta. Cuando la evidencia local ya satisfaga los criterios de esta norma, rectificar su estado mediante una adenda append-only y moverlos al registro de completadas, conservando la nota de validación diferida a Beta. No cambiar entradas históricas ni promover tareas cuya validación local siga incompleta.
================================================================================
