# Manifiesto de rotación de ChangesLogs

- Rama: `GPSpedia2.2.5_work`
- Archivo fuente antes de la rotación actual: `ChangesLogs.txt`
- Blob fuente antes de la rotación actual: `5953514773784e9a7ac004b2b71a13bc1d54a033`
- Longitud Unicode original de esta rotación: 190312 caracteres
- Criterio: división en límite de separador de registro, sin modificar el contenido.
- Integridad verificada: `parte_003 + parte_004 === contenido fuente anterior` (95253 + 95059 caracteres).
- Reconstrucción histórica completa: partes 001 y 002 existentes, seguidas de 003 y 004, seguidas del `ChangesLogs.txt` activo.

## Partes

1. `ChangesLogs_2026-11-11_parte_001.txt` — 90394 caracteres; blob `7914dda0327e64208b2c64d413157666e83031b8`.
2. `ChangesLogs_2026-11-11_parte_002.txt` — 90148 caracteres; blob `c085042bc018184bc6209e690d2c387d5ff5a386`.
3. `ChangesLogs_2026-11-14_parte_003.txt` — 95253 caracteres; blob pendiente de publicación.
4. `ChangesLogs_2026-11-14_parte_004.txt` — 95059 caracteres; blob pendiente de publicación.

Las partes archivadas son inmutables. Para reconstruir el registro completo, concatenar las partes en el orden indicado y finalmente el archivo activo.


## Rotación adicional — 2026-11-20

- Archivo fuente activo previo: `ChangesLogs.txt`.
- Longitud Unicode: 178437 caracteres.
- División en separador de registro: parte 005 = 92420 caracteres; parte 006 = 86017 caracteres.
- `ChangesLogs_2026-11-20_parte_005.txt` — blob `dc72b178e30d126aac8018569c8fb28ad8d75da3`.
- `ChangesLogs_2026-11-20_parte_006.txt` — blob `b56abb39f8a5f55cf33dea250a35084dfac78284`.
- Integridad verificada: `parte_005 + parte_006 === ChangesLogs.txt` previo a la rotación, carácter por carácter.
- Orden de reconstrucción: partes 001, 002, 003, 004, 005, 006 y después `ChangesLogs.txt` activo.
- Las partes anteriores permanecen inmutables.
