# Auditoría A07-06 — sugerencias de asociación de imágenes por modelo

Fecha: 2026-11-22  
Repositorio: infogpstech/GPSpedia  
Rama: GPSpedia2.2.5_work  
HEAD de análisis: 71ee59a744d1dc5e53ea3dc02994bd19e64afc9b

## Requisito

Presentar sugerencias de asociación de archivos de imagen con modelos de Cortes usando nombre de archivo, ruta de carpeta y alias. Las coincidencias ambiguas deben distinguirse para revisión humana. No se permite modificar referencias, asignar vehículos ni mover archivos automáticamente como consecuencia de una sugerencia.

## Hallazgos previos

1. El preview del organizador ya dispone de un inventario completo y reciente con fileId, fileName, mimeType y folderPath, y de una lectura de solo lectura de la hoja Cortes.
2. El constructor buildCortesImageOrganizerTargets_ genera destinos canónicos para archivos ya referenciados. No propone asociaciones para archivos sin referencia.
3. La auditoría de referencias activas y el historial Imagenes_Reemplazadas permiten excluir archivos ya asociados o históricos de las sugerencias nuevas.
4. No se encontró una columna, hoja ni registro vigente de alias de modelos en el esquema consultado. No es seguro inventar equivalencias como L200/Triton o nombres parecidos. La lista de alias curados comienza vacía y el motor admite alias explícitos que se incorporen con respaldo verificable.
5. La normalización anterior de nombres no constituye por sí sola una fuente de equivalencias de modelos.

## Implementación incorporada

- Se añadió buildCortesImageModelAssociationSuggestions_, generador puro que no realiza escrituras.
- Agrupa el catálogo por categoría + marca + modelo; contrasta segmentos exactos de carpeta, frases en nombre de archivo, alias explícitos y variantes conservadoras de orden de tokens.
- Añade contexto de marca/categoría y clasifica como ambiguas las coincidencias empatadas o demasiado cercanas.
- Excluye MIME no imagen, IDs ya referenciados y archivos del historial reemplazado.
- Devuelve candidatos por modelo, señales y confianza orientativa. No devuelve ID de vehículo ni campo destino.
- Limita la presentación a 300 sugerencias, conserva el total y agrega el conjunto completo al digest del preview.
- La UI presenta una sección separada de solo lectura. No añade botones de aprobación ni llamadas de escritura para estas sugerencias.
- Safe Apply conserva su alcance exclusivo de organización de archivos ya referenciados; las sugerencias no se incluyen en su lista aprobable.

## Validación preparada

- Nueva suite CortesImageModelAssociationSuggestions.mjs: 8 casos para carpeta, nombre, alias explícito, colisión entre marcas, orden alternativo de tokens, exclusión de referencias/historial, filtros y límite/digest.
- Suite integrada en RunServiceTests.mjs.
- CortesImageOrganizerUiContract.mjs ampliada para verificar digest y ausencia de asignación automática.
- Smoke tests del helper ejecutados en entorno JavaScript: 7/7 PASS.
- Parsing del archivo ADMIN completo: PASS.
- Node/CI y regresión integral pendientes tras publicar el commit.

## Límites

- La lista curada de alias permanece vacía porque el repositorio no contiene una fuente autoritativa. Se soportan alias explícitos, pero no se añadieron equivalencias supuestas.
- Las sugerencias por token/reordenamiento son orientativas y de baja confianza; requieren revisión humana.
- No se consultó ni modificó Spreadsheet/Drive reales, no se desplegó Apps Script y no se cambió ninguna referencia.

## Estado

Implementación preparada y pruebas añadidas; validación CI pendiente. No cerrar A07-06 hasta comprobar la regresión automatizada y revisar el diff completo.


## Validación final — 2026-11-22

- CortesImageModelAssociationSuggestions: 8/8 PASS.
- CortesImageOrganizerUiContract: 15/15 PASS.
- Regresión CI del commit 70b90d1313be15733d0d64b1c50b1d5984fc811c: 305 suites / 3,572 pruebas / 0 fallos.
- RepositoryJavaScriptSyntax: 437 archivos JS/MJS PASS.
- RepositoryModuleReferences: 347 archivos inspeccionados, referencias relativas resueltas.
- Health read-only: 7/7 servicios disponibles.
- GitHub Pages build/deployment: SUCCESS.
- Diff revisado en el commit de implementación. No se desplegó Apps Script, no se modificaron Drive/Spreadsheet ni referencias reales y no se ejecutó Safe Apply.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. La lista de alias verificados permanece vacía por ausencia de fuente autoritativa; la revisión del inventario real y el alta de alias confirmados quedan para Beta aislada.
