# Rotación del checkpoint — 2026-11-15

El checkpoint acumulativo superó el umbral normativo de 180,000 caracteres. Se conserva íntegro mediante una rotación sin pérdida.

- Parte archivada: `Checkpoint_Archive/checkpoint_legacy_parte_001.md`
- Continuidad activa: `checkpoint.md`
- Caracteres de la parte archivada: 170621
- Caracteres del checkpoint activo actual: 31433
- Caracteres del checkpoint original antes de rotar: 199802
- Límite de reconstrucción: encabezado `## Continuidad — GP-CAT: consumidor de deltas multi-colección (2026-11-14)`
- Verificación: la parte archivada concatenada con el sufijo activo original reconstruye exactamente el checkpoint anterior; la igualdad fue comprobada antes de añadir las nuevas entradas de continuidad.
- Las nuevas entradas de continuidad se conservan en el checkpoint activo y no alteran el contenido archivado.

Para reconstruir el checkpoint previo a la nueva entrada de continuidad, concatenar la parte archivada y el contenido de `checkpoint.md` hasta antes del encabezado `## Continuidad — centralización de fuentes Apps Script en JS/Services (2026-11-15)`.
