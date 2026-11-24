# GPSpedia — Checkpoint de continuidad

Fecha: 2026-11-24
Repositorio: `infogpstech/GPSpedia`
Rama autorizada: `GPSpedia2.2.5_work`
Rama base protegida: `GPSpedia2.2.5` — no modificar.
HEAD de trabajo antes de este checkpoint: `9bddefae8483bbeecb3257a7107ffff99074d733`
HEAD de rama base verificado: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`

## Reglas de continuidad
- `NORMAS_DESAROLLO.md` es la única fuente normativa vigente; consultarla antes de cambiar código/documentación operativa.
- Confirmar rama y HEAD antes de cada escritura. No forzar actualizaciones ni modificar la rama base.
- No declarar pruebas ni efectos externos sin evidencia observada. Diferenciar CI/fixtures de Beta real.
- Apps Script: sin secretos compartidos/manuales ni URLs/IDs locales de otros servicios; coordinación funcional frontend cuando sea posible; llamadas backend directas solo por necesidad técnica, con autorización/RBAC del receptor; endpoints operativos desde registro central autoactualizable, sin fallback local.
- Un fallo de servicio u operación no debe bloquear funciones independientes.

## Estado de tareas
- MIG-001 a MIG-030: implementación y validación local cerradas según sus criterios. Las validaciones externas se marcan como diferidas a Beta cuando requieren recursos/despliegues reales.
- MIG-014: COMPLETADA CON VALIDACIÓN DIFERIDA; CI global posterior aprobado.
- MIG-026: COMPLETADA CON VALIDACIÓN DIFERIDA. AUTH, CATALOG y UTILITIES no contienen `SPREADSHEET_ID` ni `openById(SPREADSHEET_ID)`; usan `SpreadsheetApp.getActiveSpreadsheet()` y fallan cerrado si falta contexto.
- MIG-028: COMPLETADA CON VALIDACIÓN DIFERIDA; pruebas locales aprobadas, métricas reales p50/p95 pendientes.
- MIG-029 y MIG-030: COMPLETADAS CON VALIDACIÓN DIFERIDA.
- La matriz BETA-01..08 y pruebas de MIG-006/008/012/013/015/017/018/024/025/026 permanecen como procedimiento de campo en `Tareas_Beta.md`.

## Nueva tarea autorizada — AUG-144: corregir encabezado de marca/modelo del modal de detalle

**Estado: PENDIENTE.** Solicitud incorporada el 2026-11-24. Alcance limitado al encabezado visual del modal de detalle de dispositivos.

### Requisitos de distribución
- El logotipo de marca debe renderizarse con **66 px de alto** y **ancho automático**, conservando su proporción natural y sin reducirse para encajar de forma incorrecta.
- El bloque de marca debe quedar alineado a la izquierda, con **6 px de separación respecto al borde izquierdo** del modal y **6 px respecto al borde superior**.
- El nombre del modelo debe ubicarse a la derecha del logotipo, con **6 px de separación horizontal**.
- El logotipo y el nombre del modelo deben quedar **alineados verticalmente por la parte inferior** dentro de sus respectivos contenedores.
- La línea azul situada debajo del logotipo y del nombre debe conservarse y quedar a **6 px de separación vertical** del conjunto superior (logo + nombre).
- El ancho del bloque de marca debe ser automático; no imponer un ancho fijo que reduzca el logotipo o provoque desbordamientos.

### Invariante obligatoria: controles del modal
- Los botones de **edición, impresión, compartir y cerrar** no deben modificarse.
- Deben permanecer exactamente en sus posiciones actuales. No cambiar su ubicación, orden, tamaño, comportamiento ni estilos como efecto colateral de la redistribución del encabezado.
- Antes de implementar, registrar sus posiciones actuales. Después, comparar sus límites/posiciones en los mismos tamaños de viewport.
- Si el nuevo encabezado afecta la distribución o posición de cualquiera de esos botones, revisar y rehacer el layout del encabezado/contenedores hasta preservar las posiciones originales. No aceptar como solución desplazar los botones para acomodar el logo.

### Validación y cierre
- Inspeccionar el DOM/CSS real del modal y sus reglas responsive antes de modificar.
- Validar el alto de 66 px, ancho automático, proporción del logo, offsets de 6 px, separación de 6 px con la línea azul y alineación inferior del logo/nombre.
- Comparar las posiciones de los cuatro botones antes/después en los mismos viewports de escritorio y móvil; la comparación debe demostrar que no se desplazaron.
- Probar nombres de modelo largos y logotipos de distintas proporciones para evitar solapamientos o deformaciones.
- Ejecutar parsing/sintaxis y las pruebas de regresión frontend pertinentes. Si no hay navegador automatizado disponible, declarar la validación visual como no ejecutada y preparar el procedimiento Beta; no presentarla como aprobada.
- No modificar funcionalidades ni controles ajenos al encabezado.

## MIG-026 — acceso Spreadsheet
- AUTH usa `getAuthUsersSpreadsheet_()`; CATALOG usa `getSpreadsheet()`; UTILITIES usa `getUtilitiesSpreadsheet_()` y comparte un handle por petición entre carga de actor y operación.
- La copia aislada `JS/Tests/Auth.js` conserva paridad exacta.
- No se añadieron IDs, URLs, propiedades, secretos, endpoints bootstrap ni fallbacks locales.
- Si una Web App devuelve `NO_ACTIVE_SPREADSHEET` o carece de permisos, no restaurar IDs locales: mantener sin desplegar esa versión y resolver una alternativa sin configuración local antes de publicar.
- El probe MIG-006 está preparado; ejecutar por proyecto e identidad efectiva sobre Spreadsheet desechable/aislada.

## Verificación técnica integral — NORMAS §11
- CI final: run `45400544234`, job `138467663045`, commit `5bd3da718d3e675dfc31015a294a0adb33300838`: SUCCESS; Node.js v22.23.5; 513 suites, 6,051 pruebas aprobadas, 0 fallos.
- Sintaxis: 463 archivos .js/.mjs; RepositoryJavaScriptSyntax 1/1 PASS.
- Referencias de módulos: 384 archivos; RepositoryModuleReferences 1/1 PASS.
- MIG027FunctionalParity 8/8; MIG028SecurityPerformanceRegression 9/9; MIG026StaticConfigSearch 10/10; MIG013SessionActorLocalLookup 22/22.
- CatalogChangeFeed 19/19; UTILITIES 19/19; PasswordHashMigration 16/16; SensitiveLogsTrustedActor 7/7; SessionActivityLeaseMinimization 6/6.
- NonBlockingServiceLocks 27/27; WriteContributionAppendConcurrency 9/9; AdminDriveLockIsolation 9/9.
- GitHub Pages build/deploy: run `45400543527`, build `138467670290`, deploy `138467951389`: SUCCESS. No es despliegue Apps Script.
- Revisión del diff de esta iteración desde `2bb7c0f8e27261c1edd8f6278779e978a2fbc30f`: 21 archivos modificados; sin altas ni eliminaciones. Solo tres servicios, fixtures/contratos relacionados y documentación MIG-026/verificación. Sin cambios funcionales ajenos.
- Rama protegida confirmada intacta en `d9acc68d889985c2e2f42fe3a02e502efc86ead1`.

## Límites pendientes de Beta
- No se desplegaron proyectos Apps Script ni se invocaron endpoints.
- No se modificaron PropertiesService, permisos, Spreadsheet, Drive, OAuth/YouTube ni datos productivos.
- Pendientes: contexto activo en cada Web App, identidad/permisos efectivos, lectura/escritura, concurrencia entre deployments, revocación real, p50/p95 y limpieza física de propiedades legacy. Los resultados CI no prueban disponibilidad ni latencia de producción.

## Rotación documental
- El checkpoint anterior, de 187738 caracteres Unicode, se preservó íntegro en `Olds/Documentacion_Legacy/Checkpoint_Archive/checkpoint_2026-11-24_parte_006.md`.
- El blob SHA archivado coincide con el original: `4a25fc4d0dc3ed6a71113e60b88623aa5f9b0504`.
- El manifiesto de rotación conserva las referencias a las partes anteriores.

## Próxima acción
Atender AUG-144: inspeccionar el encabezado real del modal de detalle, medir primero las posiciones de edición/impresión/compartir/cerrar y ajustar exclusivamente el bloque de marca/modelo. La posición de esos cuatro botones es un invariante. Validar escritorio y móvil, comparar límites antes/después y ejecutar regresión frontend. Mantener las pruebas de campo Apps Script pendientes en `Tareas_Beta.md`; no mezclar ese alcance con AUG-144.
