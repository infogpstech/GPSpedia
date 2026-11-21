# Optimización de lectura de navegación CATALOG — 2026-11-21

## Hallazgo
handleGetNavigationData solo necesita el ID, la categoría y la marca de cada fila de Cortes, además de las tres columnas de LogosMarca. La implementación anterior utilizaba getDataRange() en ambas hojas y transfería todas las columnas aunque no participaran en la respuesta.

## Cambio
- Cortes: lectura acotada desde la columna ID hasta Marca, desde fila 2 hasta getLastRow().
- LogosMarca: lectura limitada a las columnas declaradas en COLS_LOGOS_MARCA.
- Las hojas sin registros no generan rangos de cero filas.
- Se conserva el contrato de respuesta, el conteo por categoría, marcas únicas ordenadas, orden de categorías y normalización de logos.
- No se agrega caché ni se cambia ningún endpoint. getNavigationData no tiene consumidores frontend activos confirmados; por ello el cambio reduce el coste cuando se invoca, pero no se atribuye una mejora de arranque actual.

## Validación
- CatalogNavigationRead.mjs: 2/2 PASS en harness aislado de la función exacta, con lecturas de rango verificadas y hojas vacías.
- CI 9ebeecd99869cab11bd8d9501cfd0dc4b31ab89c: SUCCESS, 271 suites / 3,189 pruebas / 0 fallos; health read-only SUCCESS.
- No se realizaron lecturas en Spreadsheet productivo ni se desplegó Apps Script.

## Próximo paso
Optimizar la proyección CATALOG dirigida por vehículo/campo sin perder el control global de VIN, los candidatos ni las fuentes de contribución. El proyector actual considera conflictos entre vehículos, por lo que no es seguro filtrar el ledger por vehículo sin conservar un índice global equivalente.

 
## Adenda 2026-11-21 — handlers dirigidos CATALOG
- getContributionCandidates evita cargar hojas no relacionadas y usa la misma normalización de filas + proyector global.
- getVehicleProjection usa lectura ID/VIN global + una fila completa; no reduce el universo de conflictos.
- CI b8d425748e483fcd6535fdc83c7c982d603b6161: SUCCESS, 273 suites / 3,191 pruebas / 0 fallos.
