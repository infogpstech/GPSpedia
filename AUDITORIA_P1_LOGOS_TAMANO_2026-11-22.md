# P1 — inventario de logos y límites de carga
Fecha: 2026-11-22
Rama: `GPSpedia2.2.5_work`
HEAD revisado: `c614ca074c7fb8b97661d69c29854baae83b205c`

## Evidencia versionada en el repositorio

Archivos bajo `Images/` cuyo nombre o función visual está relacionado con logos:
- `Images/Logo_TemaOscuro.png`: 1,346,111 bytes. Es el logo/identidad visual de la aplicación, no una muestra del inventario `LogosMarca` almacenado en Drive.
- `Images/tracklink_logo.png`: 2,883 bytes. Recurso de marca aislado; no representa el rango histórico de marcas de `LogosMarca`.
- Las copias históricas de ambos archivos bajo `Olds/GPSpedia 2.2/` tienen los mismos SHA de blob; no constituyen muestras adicionales.

El resto de `Images/` son iconos PWA, verificación y capturas de interfaz. No son logotipos de fabricantes y no deben utilizarse para inferir el límite de carga de `LogosMarca`.

## Validación actual del flujo

- UI: `readLogoFileBase64_` admite PNG, SVG y WEBP, verifica que el MIME de Data URL coincida con el declarado y que Base64 tenga formato válido. No aplica límite de bytes antes de leer el archivo.
- Backend: `validateLogoImagePayload_` valida MIME permitido, Base64 canónico y firma real PNG/WEBP/SVG. No aplica un máximo de bytes decodificados.
- `handleAddLogo` decodifica Base64 y crea el Blob de Drive después de validar destino, marca y extensión. No se observó un límite explícito específico para logos en este flujo.
- Las pruebas `AdminLogoFileRead.mjs`, `LogoIdIntegrity.mjs` y `AdminLogoWriteLockNonBlocking.mjs` cubren MIME, lectura, firma, integridad de ID, destino, recuperación y lock breve; no definen un tamaño máximo histórico.

## Limitación de evidencia

Los tamaños reales de las filas `LogosMarca` viven en Google Drive/Spreadsheet, no en los blobs del repositorio. En esta sesión no hay una conexión de Drive/Sheets disponible para inventariar esos archivos. No se sustituyó esa muestra por capturas, iconos PWA ni logos de la aplicación.

## Decisión

No fijar ni modificar un límite de bytes. Los dos recursos versionados no representan la población histórica de logos de fabricante. El inventario de Drive debe ejecutarse en Beta aislada, de solo lectura, midiendo cantidad, tamaño en bytes, MIME/firma, dimensiones, extensión y marcas con archivos ausentes/duplicados. No descargar ni modificar archivos productivos.

## Siguiente

Diseñar la idempotencia de inicialización resumable YouTube ante pérdida de respuesta, manteniendo la transferencia directa y los contratos de expiración/renovación. Después, completar la muestra histórica de logos en Beta aislada antes de proponer un límite.
