# Archivo histórico — GPSpedia 2.2

Esta carpeta contiene una copia de los **52 archivos versionados** de la rama `GPSpedia2.2.5`, tomada del commit:

- Rama de origen: `GPSpedia2.2.5`
- Commit de origen: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`
- Fecha del commit de origen: 2026-11-04
- Destino: `Olds/GPSpedia 2.2/`

Se conserva la estructura y el contenido de los archivos originales, excepto por la eliminación intencional de los identificadores privados de Spreadsheet y de la carpeta de Drive en las copias de estos microservicios:

- `Services/Auth.js`
- `Services/admin.js`
- `Services/catalog.js`
- `Services/feedback.js`
- `Services/users.js`
- `Services/write.js`

En esas copias, los valores de `SPREADSHEET_ID` y `DRIVE_FOLDER_ID` se dejaron vacíos y se retiraron sus campos de diagnóstico para evitar exponer los identificadores. El código se conserva como referencia histórica y no debe desplegarse directamente sin configurar sus recursos.

Las URL de despliegue de Apps Script de `api-config.js` y las URL dinámicas de archivos de Drive no corresponden a los identificadores de Spreadsheet/carpeta solicitados y se conservaron sin cambios.

La rama base no fue modificada.
