# Manifiesto de rotación de Auditoría

- Rama: `GPSpedia2.2.5_work`
- Archivo fuente antes de la rotación: `Auditoría.txt`
- Blob fuente original: `307ad6db2907c36ddbd949c64ea1d624dea86164`
- Longitud Unicode original: 179631 caracteres.
- Criterio: división en un límite de registro, sin alterar, omitir ni duplicar caracteres.
- Integridad: `parte_001 + parte_002 === contenido original`; igualdad y longitud Unicode comprobadas antes de sustituir el archivo activo.
- El archivo activo `Auditoría.txt` contiene las auditorías posteriores a la rotación. Para reconstruir el registro acumulado, concatenar las partes en el orden indicado y después el archivo activo.

## Partes archivadas

1. `Auditoría_2026-11-16_parte_001.txt` — 91724 caracteres Unicode; blob `d4dee4a077a1e686dce2902eefbe02e94271277c`.
2. `Auditoría_2026-11-16_parte_002.txt` — 87907 caracteres Unicode; blob `1baec4ad83d146669e0af05e10f2ad384a8b1e64`.

Las partes archivadas son inmutables. La reconstrucción de la evidencia previa a la rotación se obtiene concatenando la parte 001 y la parte 002, sin separadores añadidos.
