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


## Rotación del checkpoint — 2026-11-16

- Parte archivada: `Checkpoint_Archive/checkpoint_legacy_parte_002.md`
- Contenido archivado: copia íntegra byte-a-byte del `checkpoint.md` previo a esta rotación.
- Longitud del contenido archivado: 194292 caracteres Unicode (medidos con Array.from).
- SHA Git del blob archivado: `9cda4a684fde899983390c3c4dfae24d08f0e5e1`.
- Continuidad activa: `checkpoint.md`, resumida y sincronizada con el HEAD verificado `52a05fb9aca89cabc685d9e0fba5b1b011370a89`.
- Verificación: el blob archivado se creó directamente a partir del contenido completo del checkpoint anterior; no se truncaron ni omitieron secciones. La parte archivada es inmutable.
- La parte anterior `checkpoint_legacy_parte_001.md` permanece intacta.


## Rotación del checkpoint — 2026-11-19

- Parte archivada: `Checkpoint_Archive/checkpoint_2026-11-19_parte_003.md`
- Contenido: copia íntegra del checkpoint.md previo a esta rotación.
- Caracteres Unicode: 179822.
- SHA Git del blob archivado: `e1c2b2e015a0224e1d85150aa5322bd87f3aedee`.
- Verificación: el contenido enviado al blob se comparó en memoria con el checkpoint leído; igualdad exacta, sin truncamiento.
- Continuidad activa: `checkpoint.md`, resumida con HEAD `cab6da36207b2768b77de7cc52ea5c6554424c58`.
- Las partes anteriores permanecen intactas.


## Rotación del checkpoint — 2026-11-20

- Parte archivada: `Checkpoint_Archive/checkpoint_2026-11-20_parte_004.md`.
- Contenido: copia íntegra del `checkpoint.md` previo a esta rotación.
- Caracteres Unicode: 179600.
- SHA Git del blob archivado: `f3603a6fafc2c32bcd7f26d7b66b9e737815e9ce`.
- Verificación: el contenido archivado se releyó desde GitHub y coincidió exactamente con el original en memoria.
- Continuidad activa: `checkpoint.md`, resumida con HEAD de código `e05be7562135e18178eb9eed8f57e6196af664a3`.
- Las partes anteriores permanecen intactas.


## Rotación del checkpoint — 2026-11-22

- Parte archivada: `Checkpoint_Archive/checkpoint_2026-11-22_parte_005.md`.
- Caracteres Unicode: 198,145.
- Blob SHA archivado: `01737733333430a7378a46d85fefd2b2b9117132`.
- Verificación: el archivo se releyó desde GitHub y coincidió carácter por carácter con el checkpoint previo a la rotación. No se truncó ni alteró el historial.
- Continuidad activa: `checkpoint.md`, resumida y actualizada con el plan P1 de imágenes, vídeos y archivos.
- Las partes anteriores permanecen intactas.


## Rotación del checkpoint — 2026-11-24

- Parte archivada: `Checkpoint_Archive/checkpoint_2026-11-24_parte_006.md`.
- Contenido: copia íntegra del `checkpoint.md` anterior a esta rotación.
- Caracteres Unicode: 187738.
- Blob SHA archivado: `4a25fc4d0dc3ed6a71113e60b88623aa5f9b0504`, coincidente con el SHA del checkpoint original; la lectura posterior del archivo archivado devolvió el mismo blob SHA.
- Continuidad activa: `checkpoint.md`, resumida después de archivar el historial completo.
- Las partes anteriores permanecen intactas.
