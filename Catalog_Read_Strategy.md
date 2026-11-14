# Estrategia de lectura del catálogo y endpoints

**Ámbito:** GPSpedia v2.2.5 — AUG-052, criterio 4  
**Evaluación:** 2026-11-11  
**Alcance:** análisis del frontend y del código fuente del servicio CATALOG versionado en este repositorio. No implica despliegue ni verificación del Apps Script productivo.

## Conclusión ejecutiva

Por ahora, **se conserva `getCatalogData` como fuente de la instantánea completa del catálogo**. El frontend necesita las cuatro colecciones completas para búsqueda global, navegación, comparación de cambios y persistencia offline. Cambiar directamente a páginas parciales o sustituirlo por `getNavigationData` dejaría incompleto ese contrato.

`getNavigationData` entrega una respuesta mucho menor, pero su implementación actual todavía lee `getDataRange().getValues()` de la hoja `Cortes` y de `LogosMarca`. Reduce el volumen de respuesta y el trabajo de transformación/transferencia, pero **no evita actualmente el recorrido de todas las filas de Cortes ni demuestra una reducción equivalente de lecturas a Spreadsheet**. Además, no se encontró un consumidor frontend activo para esta acción.

La mejora de menor riesgo es separar claramente los usos de los endpoints y, en una tarea posterior, optimizar los rangos leídos para resúmenes y listas desplegables. La paginación del catálogo completo requiere un cambio coordinado de contrato y persistencia; no se recomienda introducirla en esta iteración.

## Comparación de endpoints

| Acción | Respuesta / propósito | Uso encontrado en el cliente | Recomendación |
|---|---|---|---|
| `getCatalogData` | Instantánea completa: `cortes`, `tutoriales`, `relay`, `logos`, además de metadatos de categorías. | Es la acción llamada por `fetchCatalogData()` desde el flujo de carga del catálogo. | Mantener como endpoint canónico para la carga completa, búsqueda global, detalle y sincronización offline. |
| `getNavigationData` | Resumen: conteos por categoría, categorías ordenadas, marcas y logos. No entrega las fichas completas de Cortes, tutoriales ni relay. | Está registrado en `ACTION_TO_SERVICE_MAP` y en el router Apps Script, pero no se encontraron llamadas en `JS/Frontend/main.js`, `HTML/add_cortes.html` ni `HTML/users.html`. | Reservar para una futura fase de arranque/menú que solo necesite esos metadatos. No usarlo como sustituto del catálogo completo. |
| `getDropdownData` | Valores para listas desplegables: categorías, marcas, tipos de corte, tipos de encendido y configuración de relay. | `HTML/add_cortes.html` lo usa al inicializar el formulario de registro. | Mantenerlo limitado a formularios. No usarlo para alimentar el catálogo ni la búsqueda general. |

## Situación real de caché

### Servidor (Apps Script)

- `handleGetCatalogData()` consulta la clave `catalog_data_v2` de `CacheService` y la utiliza si encuentra un JSON válido.
- La escritura `cache.put(...)` de la instantánea completa está comentada en el código. El propio comentario explica que el objeto supera el límite de 100 KB por entrada de CacheService.
- Por tanto, no debe asumirse que existe una caché activa y caliente del catálogo completo. Una entrada antigua podría existir temporalmente, pero el código actual no la repone.
- `getNavigationData` y `getDropdownData` no implementan una caché propia en sus handlers actuales.

### Cliente (IndexedDB)

- `JS/Frontend/offline.js` guarda una instantánea completa bajo la clave `current` y valida que contenga las cuatro colecciones (`cortes`, `tutoriales`, `relay`, `logos`), además de IDs estables y no duplicados para Cortes.
- El flujo de carga primero intenta mostrar esa instantánea local y después solicita la actualización remota mediante `fetchCatalogData()`.
- Esto mejora el tiempo de presentación en dispositivos con caché local y permite consultar datos previamente guardados sin conexión; **no elimina la solicitud completa de red que realiza la reconciliación en segundo plano**. En consecuencia, no debe contabilizarse como una reducción garantizada de lecturas de Spreadsheet en cada arranque.

## Paginación: evaluación

La paginación no está implementada en el contrato actual de `getCatalogData`. No se recomienda incorporarla como cambio aislado porque:

1. La búsqueda y los filtros actuales operan sobre el catálogo disponible en memoria, no sobre páginas remotas.
2. El modo offline depende de una instantánea completa.
3. `isCompleteCatalogSnapshot()` rechaza respuestas que no incluyan las cuatro colecciones.
4. La sincronización compara snapshots completos por ID y detecta altas, modificaciones y eliminaciones. Guardar páginas parciales como si fueran un snapshot completo podría borrar registros locales válidos o dejar eliminaciones sin detectar.

Si el tamaño futuro del catálogo exige paginación, el diseño deberá incluir orden estable, cursor (preferiblemente por clave/ID y no por desplazamiento), identificador de versión de snapshot, tratamiento explícito de eliminaciones y ensamblado de todas las páginas antes de confirmar una nueva instantánea offline. El cambio debe cubrir backend y frontend, y conservar una ruta de consulta offline.

## Recomendación operativa

1. **Catálogo principal y búsqueda:** continuar con `getCatalogData` y la instantánea completa de IndexedDB.
2. **Arranque ligero futuro:** usar `getNavigationData` solo si la interfaz puede iniciar con conteos, marcas y logos mientras difiere la carga de fichas. Antes, modificar el handler para leer únicamente las columnas necesarias (categoría y marca) en `Cortes`, en lugar de todo `getDataRange()`; revisar también el rango de logos y una caché pequeña de metadatos.
3. **Formulario de alta:** conservar `getDropdownData` como endpoint específico, pero evaluar leer solo las columnas requeridas en vez de toda la fila de datos.
4. **Caché de servidor:** cachear resúmenes o colecciones segmentadas que respeten el límite por entrada y tengan una política explícita de invalidación/TTL. No intentar guardar la instantánea completa actual en una sola entrada.
5. **Paginación:** diferirla a una tarea arquitectónica separada si las mediciones con catálogos representativos muestran que el snapshot completo ya no es viable.

## Límites de esta evaluación

La conclusión se basa en el código versionado: handlers de `JS/Services/catalog.js`, mapa de acciones de `JS/Frontend/api-config.js`, consumidor de `getDropdownData` en `HTML/add_cortes.html`, flujo de catálogo en `JS/Frontend/auth.js` y contrato de persistencia de `JS/Frontend/offline.js`. No se ejecutaron lecturas contra Spreadsheet productivo ni mediciones de Apps Script; esas validaciones requieren el entorno Beta y no se presentan como realizadas.

**Resultado del criterio 4:** evaluación y guía de uso documentadas. No se modificaron endpoints, contratos de respuesta ni despliegues.
