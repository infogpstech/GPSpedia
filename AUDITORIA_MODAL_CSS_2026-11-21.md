# Auditoría CSS de modales y encabezado de detalle de corte
**Fecha:** 2026-11-21  
**Rama auditada:** GPSpedia2.2.5_work  
**Referencia histórica:** GPSpedia-2.1.7 (el pie de página de ese branch identifica la aplicación como v2.1.6; no se presume equivalencia de versión sin una etiqueta confirmada).

## Alcance y archivos
- `style.css` actual: reglas generales de modales, detalle, Inbox, Developer, Relay y encabezados compartidos.
- `button-system.css`: sistema global de botones y controles; no contiene reglas `.detail-modal-*` ni `#modalDetalle`.
- `contextual-help.css`: estilos de ayuda contextual; no contiene reglas del encabezado del detalle.
- `JS/Frontend/ui.js`: estructura DOM actual del detalle de corte, tutorial y Relay.
- `style.css` y `ui.js` del branch `GPSpedia-2.1.7`: referencia histórica.

## Hallazgos del encabezado de corte

### Estructura DOM actual
El modal de corte marca `#modalDetalle[data-modal-type="corte"]`. Su cabecera usa `.detail-modal-toolbar` con:
- `.detail-modal-title` y `.brand-logo-modal` para el logo.
- `.detail-modal-title-text` o `.detail-modal-title-input` para el modelo.
- `.detail-modal-header-actions` para imprimir, editar, compartir y cerrar.
- `.detail-modal-divider` y `.detail-modal-saving-indicator`.

El botón de cierre está anidado dentro de `.detail-modal-header-actions`; por tanto, el selector directo `.detail-modal-toolbar > .info-close-btn` no gobierna el cierre del modal de corte. La regla efectiva es la variante anidada y scoped de corte. El cierre global conserva 40×40 px.

### Duplicación y cascada
El bloque llamado “BLOQUE CONSOLIDADO — encabezados de detalle” no estaba consolidado de forma efectiva:
- Había reglas scoped `#modalDetalle[data-modal-type="corte"]` antes del bloque.
- Dentro del bloque había múltiples declaraciones base para `.detail-modal-title`, `.detail-modal-title-text`, `.detail-modal-title-input`, `.detail-modal-header-actions`, `.detail-modal-divider` y `.detail-modal-saving-indicator`.
- La misma regla se redefinía después en media queries y nuevamente en el segmento scoped de corte.
- El selector directo del cierre y el cierre anidado estaban mezclados, aunque solo el segundo coincide con el DOM del modal de corte.

La auditoría encontró 128 selectores repetidos entre las reglas de modales de `style.css`; muchos son overrides responsive intencionales (Inbox/Developer, por ejemplo) y no deben eliminarse automáticamente. El trabajo de consolidación se limita primero al encabezado de detalle, preservando las reglas base compartidas por Tutorial y Relay.

### Contradicciones concretas que afectan proporciones
1. El título móvil tuvo una regla compacta `clamp(1rem, 4vw, 1.35rem)`, pero una regla base posterior lo reemplazó por `2rem`. La variante móvil volvió a fijar `2rem`; el valor compacto nunca llegaba a ser efectivo.
2. El input de edición móvil tuvo `.9rem`, pero una declaración base posterior impuso `1.5rem`.
3. En móvil, la columna del logo usa `max-content` y el logo tiene `max-width:none !important`. Un logotipo de proporción muy horizontal puede ensanchar la primera columna, reducir el espacio de acciones y ser recortado por `overflow-x:hidden`.
4. Los botones de acción se reducen a 36×36 px en móvil, mientras el cierre permanece en 40×40 px. No es una ruptura funcional, pero produce una jerarquía de tamaños desigual.
5. El título puede moverse debajo del logo con `data-model-title-layout="below-logo"`; el bloque original dejaba implícita la quinta fila del indicador de guardado. La consolidación debe declararla expresamente.

## Comparación con la referencia GPSpedia-2.1.7
| Elemento | Referencia GPSpedia-2.1.7 | Código actual GPSpedia 2.2.5 |
|---|---|---|
| Distribución | Cabecera sencilla; acciones agregadas directamente al contenedor | Grid con columna de logo, columna de acciones y título adaptable |
| Logo | 48 px escritorio / 38 px móvil | 64 px escritorio / 48 px móvil para el modal de corte |
| Modelo | H2 dentro de contenedor Flex con `flex-wrap:wrap` | Texto/input en celda Grid; se mueve debajo del logo si no cabe |
| Acciones | Compartir, imprimir, editar y cerrar como hijos del header | Botones dentro de `.detail-modal-header-actions` |
| Cierre | Estilo inline estático, tamaño derivado de fuente | Botón global 40×40 y regla scoped estática 40×40 |

**Discrepancia de referencia:** el branch se llama `GPSpedia-2.1.7`, pero `index.html` muestra `GPSpedia v2.1.6`. Se registra como referencia histórica del branch, no como versión de aplicación confirmada.

## Decisiones de consolidación
- Mantener una única sección contigua para la base compartida de encabezados y la variante scoped de corte.
- Mantener el comportamiento base de Tutorial y Relay; el selector `.detail-modal-toolbar` es compartido.
- Mantener el cierre scoped del corte dentro de `.detail-modal-header-actions`.
- Recuperar tamaños móviles compactos para título e input.
- Limitar el ancho del logo móvil y la primera columna para reservar espacio real a acciones.
- Unificar las dimensiones de los botones de acción y cierre del encabezado de corte.
- Conservar el mecanismo `below-logo`, declarando todas sus filas explícitamente.
- No alterar las reglas generales de Inbox, Developer, PyS, Relay o modales informativos en esta primera corrección.

## Validación
- Auditoría estática de selectores y cascada: completada.
- Comparación de estructura JS/CSS histórica y actual: completada.
- Prueba de contrato CSS y revisión responsive automatizada: por implementar.
- Inspección visual en navegador real/escritorio/móvil: requiere validación Beta; no se declara aprobada en esta auditoría.

 
## Consolidación posterior a la auditoría (2026-11-21)
- Se agruparon en un solo bloque contiguo las reglas base compartidas y la variante del detalle de corte.
- Se retiró el bloque scoped disperso.
- Se corrigieron cascadas móviles del título/input y el ancho máximo del logo.
- Se conserva el cierre anidado del corte (40×40) y el cierre directo de Relay.
- Se declara la quinta fila de la variante below-logo.
- Prueba CSS añadida al runner; CI y visual Beta pendientes.
