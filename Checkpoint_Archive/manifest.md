# Rotación del checkpoint — 2026-11-15

El checkpoint acumulativo superó el umbral normativo de 180,000 caracteres. Se conserva íntegro mediante una rotación sin pérdida.

- Parte archivada: `Checkpoint_Archive/checkpoint_legacy_parte_001.md`
- Continuidad activa: `checkpoint.md`
- Caracteres de la parte archivada: 170621
- Caracteres del checkpoint activo tras la rotación y la nueva entrada de continuidad: 30152
- Límite de reconstrucción: encabezado `## Continuidad — GP-CAT: consumidor de deltas multi-colección (2026-11-14)`
- Verificación: `parte archivada + checkpoint activo original = checkpoint original` (igualdad exacta comprobada antes de añadir la nueva entrada de continuidad).
- No se eliminaron ni reescribieron los registros archivados.

Para reconstruir el checkpoint previo a la nueva entrada de continuidad, concatenar la parte archivada y el contenido de `checkpoint.md` hasta antes del encabezado `## Continuidad — centralización de fuentes Apps Script en JS/Services (2026-11-15)`.
