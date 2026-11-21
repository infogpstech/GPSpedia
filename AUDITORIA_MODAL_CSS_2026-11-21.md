# Auditoría visual de modales y cascada CSS — 2026-11-21

## Alcance y evidencia

- Rama revisada: `GPSpedia2.2.5_work`.
- Archivos principales: `style.css`, `JS/Frontend/ui.js`, `index.html`, `HTML/users.html`, `HTML/add_cortes.html`.
- Comparación histórica: rama `GPSpedia-2.1.7` frente al código actual de la rama de trabajo (README y módulo frontend identifican la línea actual como 2.2.5).
- Prueba focalizada existente: `JS/Tests/CutDetailModalLayout.mjs`.
- Método: inspección de markup dinámico, reglas CSS y orden de cascada; recuento estático de selectores repetidos. No se ejecutó navegador real ni se midieron estilos computados en viewport físico; la aceptación visual real sigue siendo Beta.

## 1. Modal de detalle de corte

### Diferencias de estructura

En 2.1.7, `mostrarDetalleModal` crea el encabezado mediante flex inline: acciones en una fila, cierre como último control y logo/modelo en un contenedor posterior. El CSS histórico fijaba el logo genérico en 48 px en escritorio y 38 px en móvil; el modal tenía 90% de ancho, máximo 800 px y padding 15 px.

En la rama actual, el encabezado se construye con nodos independientes y clases:
- `.detail-modal-toolbar`: contenedor de cuadrícula.
- `.detail-modal-title`: contenedor del logo.
- `.detail-modal-title-text` o `.detail-modal-title-input`: nombre o campo de edición.
- `.detail-modal-header-actions`: compartir, imprimir, editar/guardar/descartar y cierre.
- `.detail-modal-divider` y `.detail-modal-saving-indicator`.

La cuadrícula es una evolución funcional respecto al flex histórico, no debe revertirse sin perder la distribución explícita del título y las acciones. El código inserta el cierre dentro de `.detail-modal-header-actions`; la regla exclusiva de corte lo mantiene en flujo estático, alineado al extremo derecho.

### Hallazgo de proporción y corrección aplicada

Las reglas heredadas de la base compartida asignaban al logo hasta 120 px y la versión previa del encabezado de corte repetía esa dimensión en escritorio y 60 px en móvil. Esto hacía que el elemento visual dominante fuera mucho mayor que los botones de acción (40 px) y que el área útil del encabezado.

Se normalizó el logo del modal de corte a:
- 64 px en escritorio.
- 48 px en móvil.
- `object-fit: contain`, ancho natural, sin estirar ni recortar el logo.
- Contenedor del logo con la misma altura y alineación superior izquierda.
- Botones de acción y cierre conservan sus objetivos de 40 px; el cierre sigue dentro de la fila de acciones y no vuelve a posicionamiento absoluto.

Las reglas de encabezados de detalle (base compartida, variantes responsive y reglas scoped de corte) se movieron a un único bloque final `BLOQUE CONSOLIDADO — encabezados de detalle`. Se preservó el orden original entre reglas y media queries, de modo que el último valor de la cascada sigue prevaleciendo. La base compartida continúa aplicando a tutoriales/PyS/Relay; las reglas con `#modalDetalle[data-modal-type="corte"]` prevalecen para corte.

### Riesgo de cascada identificado

Antes del bloque específico de corte hay reglas genéricas de `.detail-modal-toolbar`, `.detail-modal-title`, `.detail-modal-title-text`, `.detail-modal-title-input`, `.detail-modal-header-actions`, `.detail-modal-divider` y `.detail-modal-saving-indicator` en varios sectores del archivo. Algunas se comparten con encabezados de tutoriales, PyS o Relay. La regla final scoped a `#modalDetalle[data-modal-type="corte"]` gana para el corte; las reglas genéricas siguen aplicando a los demás modales.

El bloque consolidado mantiene juntas las reglas base y las variantes sin cambiar su orden de cascada. La auditoría pendiente debe continuar con modales informativos, Inbox y Developer Tools; no mezclar sus contratos con el encabezado de detalle.

## 2. Consolidaciones adicionales de familias de modales

- `.info-modal-content`: se fusionaron las dos reglas base dispersas en una única regla; conserva `max-width:650px`, `width:90%`, `padding:25px`, `border-radius:12px`, `box-sizing`, scroll vertical y límite de altura. Se mantienen las variantes de tema oscuro, Acerca de, Términos y Dashboard por su especificidad.
- `.info-close-btn`: se confirmó una única regla base global con área de 40 px, posicionamiento absoluto para modales informativos, estado hover, foco visible y disabled. El cierre del detalle de corte conserva su override scoped en flujo; Relay mantiene su variante propia.
- Inbox: se agruparon en un bloque las reglas del encabezado, heading, acciones y paginación, incluidas sus media queries. El padding derecho reserva espacio para el cierre; las reglas de búsqueda y controles internos permanecen en sus grupos funcionales.
- Developer Tools: las declaraciones base de `.dev-tools-title` se fusionaron en una única regla. Las variantes de ancho móvil y `prefers-reduced-motion` permanecen en sus media queries para conservar el comportamiento accesible.
- No se movieron indiscriminadamente las reglas internas de navegación, paneles y acciones de Inbox/Developer Tools: sus diferencias corresponden a estados, subcomponentes y breakpoints. Las pruebas de regresión protegen esos contratos.

## 3. Inventario estático de selectores repetidos

El escaneo de `style.css` encontró, entre otros, los siguientes selectores exactos repetidos en múltiples reglas:

| Selector | Apariciones |
|---|---:|
| `.detail-modal-header-actions` | 6 |
| `.detail-modal-title-text` | 5 |
| `.detail-modal-title-input` | 5 |
| `.detail-modal-toolbar` | 4 |
| `.detail-modal-title` | 4 |
| `.detail-modal-title .brand-logo-modal` | 4 |
| `.detail-modal-header-actions .share-modal-btn` | 4 |
| `.detail-modal-toolbar > .info-close-btn` | 4 |
| `.detail-modal-divider` | 4 |
| `.info-modal-content` | 4 |
| `#modalDetalle` | 3 |
| `#inbox-modal-content .inbox-modal-header` | 4 |
| `#dev-tools-modal .dev-tools-title` | 7 |

El recuento incluye reglas base y media queries. No significa que cada repetición sea un conflicto: una regla móvil o una variante scoped puede ser intencional. Sí identifica áreas donde hay que documentar y ordenar la cascada para evitar sobrescrituras accidentales.

## 4. Criterios de consolidación

1. Un único bloque de estilos base por componente/modal.
2. Un bloque de variantes responsive contiguo al componente correspondiente.
3. Variantes por tipo de modal con selector explícito y sin afectar a los demás.
4. Cuando haya dos declaraciones del mismo selector, conservar el valor que realmente gana hoy en la cascada, salvo que la auditoría demuestre que ese valor es el defecto.
5. Revisar `!important`, estilos inline y especificidad antes de mover reglas.
6. Mantener dimensiones accesibles de controles, orden de tabulación, etiquetas ARIA, foco y comportamiento de cierre.
7. No modificar RBAC, handlers ni comportamiento de negocio como solución a un defecto visual.
8. Actualizar contratos CSS/DOM y ejecutar la regresión integral después de cada bloque consolidado.

## 5. Estado de pruebas

- `CutDetailModalLayout.mjs`: 29/29 PASS, incluyendo la comprobación del bloque CSS consolidado.
- `InfoModalStyleCascade.mjs`: 3/3 PASS.
- `ModalHeaderCascade.mjs`: 2/2 PASS.
- Regresión GitHub Actions: 261 suites, 3,143 pruebas aprobadas, 0 fallos. Sintaxis de módulos modificados: PASS.
- Health check remoto de solo lectura: SUCCESS. No sustituye la aceptación visual Beta.
- La aceptación visual en escritorio/Android sigue pendiente de Beta. No se declara aprobación visual por una inspección de CSS.

## 6. Pendientes derivados y prioridad

1. Mantener la aceptación visual en escritorio, Android/PWA y viewport estrecho como validación Beta.
2. Reabrir la auditoría solo si Beta descubre discrepancias de estilos computados, contraste o proporciones no detectables en el análisis estático.

## 7. Límite de la auditoría

Este documento registra el resultado estático de la primera pasada y la corrección acotada del encabezado de corte. No declara terminada la auditoría visual integral de toda la plataforma. No se desplegaron proyectos Apps Script ni se modificaron datos de Spreadsheet/Drive.
