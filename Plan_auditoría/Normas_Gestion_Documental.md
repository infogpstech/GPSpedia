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
