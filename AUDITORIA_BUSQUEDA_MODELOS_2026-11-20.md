# Auditoría preimplementación — Búsqueda agrupada por modelo y navegación jerárquica

**ID:** GP-UX-SEARCH-MODEL-GROUPING-01  
**Fecha:** 2026-11-20  
**Repositorio:** infogpstech/GPSpedia  
**Rama:** GPSpedia2.2.5_work  
**HEAD auditado:** 38b5a02ca951270c2e93001edfa349a46a805f7a  
**Rama base protegida:** GPSpedia2.2.5 — d9acc68d889985c2e2f42fe3a02e502efc86ead1  
**Estado:** COMPLETADA CON VALIDACIÓN DIFERIDA A BETA

## 1. Requisito registrado

Los resultados de búsqueda de vehículos deben agruparse por modelo. Una búsqueda no debe mostrar simultáneamente todas las filas de un mismo modelo correspondientes a versiones de equipamiento, tipos de encendido y rangos de años.

Flujo esperado:

1. Mostrar una sola tarjeta por modelo.
2. Al seleccionar el modelo:
   - mostrar las versiones/equipamientos si existen varias opciones;
   - si solo existe una opción, omitir ese paso.
3. Después de seleccionar o resolver el equipamiento:
   - mostrar los tipos de encendido si existen varias opciones;
   - si solo existe una opción, omitir ese paso.
4. Mostrar los rangos de años disponibles.
5. Si solo existe un rango, abrir directamente el modal del registro correspondiente.
6. Si el modelo solo tiene una combinación de versión/encendido y un rango, abrir el modal directamente al seleccionar el modelo.
7. El mismo comportamiento debe aplicarse a la navegación por categorías/marcas y a la búsqueda.
8. Atrás/Adelante, restauración de historial y retorno a la búsqueda deben conservar la consulta y la ruta real recorrida.

La identidad del modelo debe considerar **categoría + marca + modelo** para no mezclar nombres iguales de categorías o marcas diferentes.

## 2. Archivos y flujo auditados

- JS/Frontend/search-utils.js: normalización, coincidencia y orden de resultados globales.
- JS/Frontend/navigation.js: búsqueda global, clasificación y sincronización del estado de búsqueda.
- JS/Frontend/ui.js: render de resultados, tarjetas, navegación de modelos, versiones, encendidos, años y apertura del modal.
- JS/Frontend/navigationHistory.js: serialización, comparación, push/replace y retorno de estados.
- JS/Frontend/main.js: restauración de vistas mediante popstate.
- JS/Frontend/VinDifferentialEngine.js: semántica de rangos de años y coincidencias VIN.
- JS/Services/feedback.js: validación de superposición cuando se amplía un rango mediante sugerencias de año.
- JS/Tests/GlobalSearch.js, NavigationBackHistory.js, SearchFilterCleanup.js, NavigationVinCollection.js, PysModalNavigation.js y RunServiceTests.mjs.

No se consultaron datos reales de Spreadsheet ni se desplegó Apps Script. La auditoría corresponde al código versionado.

## 3. Hallazgos confirmados

### H1 — La búsqueda devuelve una fila por registro de Corte

En search-utils.js, buildGlobalSearchResults agrega cada elemento de cortes al resultado individualmente (aprox. líneas 126–169). No consolida registros por categoría, marca y modelo.

En navigation.js, la búsqueda pasa esos resultados a mostrarResultadosDeBusqueda sin una fase de agrupación (aprox. líneas 175–205).

**Efecto:** varias versiones, encendidos o rangos del mismo modelo pueden aparecer como tarjetas independientes.

### H2 — El render actual presenta una tarjeta por resultado de vehículo

En ui.js, mostrarResultadosDeBusqueda recorre los resultados y crea una tarjeta por elemento mediante crearCardVehiculo (aprox. líneas 2116–2180). No existe una tarjeta agrupadora de modelo en este flujo.

**Efecto:** la interfaz de búsqueda expone las variantes antes de que el usuario seleccione el modelo.

### H3 — La búsqueda normal puede abrir el modal sin selección del modelo

El render actual autoabre el modal cuando el resultado es una única coincidencia de Corte y la búsqueda no se está restaurando (aprox. línea 2166).

**Efecto:** contradice el requisito de que el usuario seleccione primero la tarjeta del modelo. Se debe separar la autoapertura especial de VIN exacto de la búsqueda textual normal.

### H4 — La selección de versión de equipamiento omite el tipo de encendido

navegarADetallesDeModelo (aprox. líneas 1450–1500) analiza versiones y tipos de encendido al seleccionar un modelo. Si existe una sola versión, la omite y analiza el encendido. Sin embargo, cuando hay varias versiones, mostrarVersionesEquipamiento presenta sus tarjetas y el click actual llama directamente a mostrarVersiones (aprox. líneas 1656–1700).

**Efecto:** después de seleccionar una versión con varios tipos de encendido, se salta indebidamente la selección de encendido y se muestran los años mezclados.

### H5 — La pantalla de tipos de encendido se muestra incluso con una sola opción

mostrarTiposEncendido obtiene los tipos distintos y construye una tarjeta para cada uno (aprox. líneas 1558–1606). El código contiene un comentario que explica que se eliminó deliberadamente el salto automático de una sola opción.

**Efecto:** contradice el requisito actual de omitir pasos con una única opción. Se deberá sustituir esa decisión por un resolver común, no añadir otro salto aislado.

### H6 — La pantalla de años no agrupa rangos ni resuelve el rango único

mostrarVersiones (aprox. líneas 1613–1650) crea una tarjeta por cada fila recibida. No calcula la cantidad de rangos distintos y no abre directamente el modal cuando existe uno solo.

**Efecto:** puede mostrar duplicados de rango y obliga a un paso adicional aun cuando solo hay un rango disponible.

### H7 — El flujo heredado de tarjeta por variante tiene un filtro incompleto

En crearCardVehiculo (aprox. líneas 10820–10940), la rama resultsForVariant filtra por marca, modelo y versión, pero no incluye categoría ni tipo de encendido. Luego llama directamente a mostrarVersiones.

**Efecto:** puede combinar categorías o tipos de encendido diferentes y no satisface la jerarquía requerida. La rama debe eliminarse o reemplazarse por el resolver compartido, evitando mantener dos flujos contradictorios.

### H8 — La navegación ya conserva parte del contexto, pero requiere ampliación y pruebas

navigationHistory.js conserva level, query, categoria, marca, modelo, versionEquipamiento, tipoEncendido, origin y section. main.js reconstruye los niveles modelos, versionesEquipamiento, tiposEncendido y versiones al recibir popstate.

El estado actual permite conservar la consulta como antecesora de los pasos de navegación. La nueva lógica debe preservar esa cadena cuando se omiten niveles de una sola opción y cuando el último rango abre el modal sin renderizar una lista intermedia.

**Riesgo:** una restauración que invoque un renderer antiguo puede volver a mostrar un nivel que el flujo nuevo debe omitir o añadir entradas redundantes al historial. Se requieren pruebas de Atrás/Adelante y de restauración desde cada nivel.

### H9 — VIN y otras secciones necesitan tratamiento específico

navigation.js distingue VIN completo y ambiguo. Los VIN ambiguos se presentan como opciones explícitas; un VIN completo puede localizar un registro único.

Los resultados Relay, Tutoriales y Problemas/Soluciones también comparten la búsqueda global, pero no son variantes de Corte.

**Compatibilidad obligatoria:**
- mantener las opciones VIN ambiguas separadas;
- conservar la apertura directa para una coincidencia VIN inequívoca;
- no agrupar Relay, Tutoriales ni PyS como vehículos;
- permitir resultados mixtos sin perder su tipo ni su acción;
- no cambiar la clasificación de búsqueda por marca ni la búsqueda numérica por año.

### H10 — Los rangos abiertos tienen semántica especial

VinDifferentialEngine.js interpreta anoHasta vacío como vigente hasta el año actual. La presentación actual de algunas tarjetas muestra únicamente anoDesde cuando anoHasta está vacío.

La clave de agrupación de rangos debe distinguir un extremo final vacío de un rango cerrado y conservar esa semántica. No debe inventar un límite superior fijo.

### H11 — La unicidad de un rango no debe asumirse sin comprobar el registro

La auditoría local encontró validación de superposición de rangos en feedback.js para ampliaciones mediante sugerencias de año. Esa validación no demuestra por sí sola que todas las filas históricas de un mismo modelo, equipamiento y encendido tengan rangos únicos.

**Regla de seguridad para la implementación:** no abrir arbitrariamente el primer registro si la agrupación detecta más de una ficha con la misma clave de variante y rango. Ese caso debe tratarse explícitamente como ambigüedad de datos y cubrirse con prueba; no ocultarlo ni seleccionar un ID al azar.

## 4. Matriz de comportamiento objetivo

| Opciones de equipamiento | Tipos de encendido tras filtrar | Rangos tras filtrar | Acción |
|---|---|---|---|
| Varias | Cualquiera | Cualquiera | Mostrar tarjetas de equipamiento; al elegir, continuar evaluando encendido |
| Una o ninguna | Varios | Cualquiera | Omitir equipamiento y mostrar tipos de encendido |
| Una o ninguna | Uno o ninguno | Varios | Omitir equipamiento/encendido y mostrar rangos |
| Una o ninguna | Uno o ninguno | Uno | Omitir selectores y abrir modal |
| Varias | Uno | Uno | Mostrar equipamiento; al elegir, abrir modal |
| Varias | Varios | Uno | Mostrar equipamiento; al elegir, mostrar encendido; al elegir, abrir modal |

La matriz se aplica tanto al click en el modelo de búsqueda como al click en un modelo de la navegación normal.

## 5. Diseño de implementación propuesto

1. Añadir un helper puro de agrupación en JS/Frontend/search-utils.js que agrupe únicamente resultados _sectionType === 'corte' por categoría + marca + modelo. Mantener prioridad/orden de búsqueda y conservar resultados de otras secciones.
2. Renderizar una tarjeta por modelo en la búsqueda. Su click debe invocar el mismo punto de entrada que la navegación de catálogo y consultar las variantes del catálogo completo, no solo las filas que coincidieron con el texto de búsqueda.
3. Exportar o centralizar el resolver de selección del modelo y crear el paso de selección de equipamiento que, al elegirse, vuelva a evaluar los tipos de encendido.
4. Omitir pantallas con una única opción en equipamiento y encendido. Tras aplicar ambos filtros, agrupar por rango de años.
5. Con un único rango y un único registro elegible, abrir el modal directamente. Con varios rangos, mostrar una tarjeta por rango. Manejar de forma explícita las filas duplicadas para una misma variante/rango.
6. No autoabrir una búsqueda textual normal aunque produzca una sola fila. Mantener el camino especial de VIN inequívoco y las opciones de VIN ambiguo.
7. Revisar restauración popstate, botones internos Volver y cierre del modal para que vuelvan al último nivel visible real, conservando la consulta original.
8. Evitar cambios en endpoints o esquema de Spreadsheet: la tarea parece resoluble en frontend y utilidades de búsqueda; solo ampliar backend si la auditoría de datos o las pruebas revelan una necesidad demostrable.

## 6. Cobertura de pruebas requerida

Crear una suite específica, por ejemplo JS/Tests/SearchModelGrouping.mjs, y registrarla en JS/Tests/RunServiceTests.mjs dentro de INTEGRATION.

Casos mínimos:
- varias filas del mismo modelo → una tarjeta de modelo;
- mismo nombre de modelo en otra marca o categoría → grupo separado;
- varias versiones → selector de versiones;
- una versión → salto automático;
- varios encendidos dentro de una versión → selector de encendido;
- un encendido → salto automático;
- varios rangos → selector de rangos;
- un rango y un registro → modal directo;
- combinación de una versión, un encendido y un rango → modal directo;
- filas duplicadas con la misma clave de rango → no seleccionar registro arbitrario;
- anoHasta vacío y rango abierto;
- resultados mixtos Corte/Relay/Tutorial/PyS;
- VIN inequívoco y VIN ambiguo;
- consulta por marca, modelo, año y coincidencia descriptiva;
- Atrás/Adelante desde cada nivel, retorno a búsqueda y cierre del modal;
- restauración tras recarga/popstate sin duplicar entradas;
- misma jerarquía desde navegación por categorías y desde búsqueda.

La suite de regresión actual registra PysModalNavigation.js, pero no incluye explícitamente GlobalSearch.js, NavigationBackHistory.js, SearchFilterCleanup.js ni NavigationVinCollection.js en RunServiceTests.mjs. Además, algunas de esas suites antiguas usan rutas de módulos raíz que no corresponden a la estructura actual. La nueva suite debe usar rutas actuales y quedar integrada en el runner para que CI realmente la ejecute.

## 7. Límites y estado de esta auditoría

- Confirmación estática basada en fuentes de la rama de trabajo.
- No se ejecutó navegador real ni se inspeccionó un catálogo de producción.
- No se consultaron Spreadsheet/Drive ni deployments Apps Script.
- No se modificaron archivos de código, APIs, datos ni deployments.
- La rama base protegida no se modificó.

**Conclusión:** el problema se concentra en el frontend. No basta con agrupar tarjetas: es necesario unificar el resolver de variantes y rangos, corregir la omisión de tipo de encendido después de seleccionar equipamiento, y alinear History API con los saltos automáticos. La implementación debe comenzar con helpers puros y pruebas de cardinalidad, luego conectar el render y la navegación.

## 8. Implementación en GPSpedia2.2.5_work

La implementación se incorporó en la rama de trabajo:

- `JS/Frontend/search-utils.js`: agrupación por categoría + marca + modelo, ordenada por la mejor prioridad/posición de sus registros; resolución común de equipamiento, encendido y rangos.
- `JS/Frontend/ui.js`: una tarjeta por modelo en la búsqueda; selección de equipamiento vuelve a evaluar encendido; la pantalla de años resuelve rangos únicos y evita abrir automáticamente registros duplicados.
- `JS/Frontend/navigation.js`: la búsqueda textual no autoabre un registro; la apertura automática se limita a VIN inequívoco.
- `JS/Tests/SearchModelGrouping.mjs`: pruebas de lógica y comprobaciones de integración; integrada en `JS/Tests/RunServiceTests.mjs`.

Se preservan registros de Relay, Tutoriales y PyS sin agrupar. Los VIN ambiguos permanecen como opciones separadas. Las claves de rango distinguen rangos abiertos de rangos cerrados.

### Ajustes durante la validación

- Se detectó que la prioridad mínima del grupo se calculaba pero no se utilizaba al ordenar el arreglo final. Se corrigió la ordenación para utilizar la mejor coincidencia del grupo y se añadió una prueba específica.
- Se corrigió una aserción del test que inspeccionaba los casos `popstate` en `ui.js` cuando realmente pertenecen a `main.js`.
- Se actualizaron comentarios obsoletos sobre la selección de encendido para reflejar que el selector solo debe mostrarse cuando hay varias opciones.

### Validación disponible

- Node v22.16.0: `SearchModelGrouping.mjs` ejecutado de forma aislada, 21/21 PASS. Los helpers de `search-utils.js` y `navigationHistory.js` se ejecutaron; las comprobaciones sobre los puntos de integración UI/navigation/main fueron estáticas.
- Se comprobó que el runner incluye `SearchModelGrouping.mjs` en la suite INTEGRATION.
- No se ejecutó la regresión integral del repositorio ni una prueba de navegador real. El entorno no dispone de checkout local y las herramientas GitHub disponibles no devolvieron estados de CI para los commits recientes.
- No se desplegó Apps Script ni se consultaron/modificaron datos productivos.

**Estado actualizado:** implementación y regresión integral local completadas; aceptación visual real diferida a Beta.

## Adenda — cierre de regresión integral local (2026-11-21)

- La suite SearchModelGrouping se encuentra registrada en el grupo INTEGRATION de RunServiceTests.mjs y ejecutó 21/21 PASS.
- CI 44907910014 SUCCESS: 259 suites, 3,129 pruebas aprobadas, 0 fallos. La comprobación sintáctica ampliada de módulos backend también aprobó en el mismo workflow.
- La jerarquía de búsqueda, agrupación y compatibilidad de navegación queda cerrada localmente. Se mantiene como validación Beta la comprobación visual en escritorio, Android/PWA y con catálogo real aislado.
- No se desplegó Apps Script ni se modificaron datos productivos.
