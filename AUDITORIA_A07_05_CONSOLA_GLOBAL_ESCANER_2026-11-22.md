# Auditoría A07-05 — consola global del escáner de Cortes

Fecha: 2026-11-22  
Repositorio: infogpstech/GPSpedia  
Rama: GPSpedia2.2.5_work  
HEAD validado: cd20182c3a4c8a55e9f14b6f02c6b4cc948e172d

## Objetivo

Mover la salida y el progreso del escáner de Drive/Cortes a la consola global del panel Desarrollador, conservando conteos detallados, resultados clasificados y capacidad de reanudación.

## Estado previo

- openAuditDriveModal construía una consola propia dentro del modal, con audit-drive-console-output y audit-drive-console-status.
- appendAuditConsole ya tenía un fallback al logger global, pero normalmente escribía en la consola local porque el nodo del modal existía.
- appendFiles también enviaba una línea por cada archivo a la consola, además de renderizar resultados clasificados en la lista del modal. Al migrar todo el flujo al logger global, ese comportamiento podía saturarlo.
- El flujo de lotes ya persistía cursor, resultados y estado en IndexedDB y habilitaba reanudación mediante runAudit(true).

## Cambios implementados

1. Se retiró el markup de la consola local y se reemplazó por un mensaje que indica que la salida/progreso se encuentra en la consola global.
2. appendAuditConsole ahora siempre envía mensajes al logger global mediante logDeveloperOperation_, con el prefijo [AUDITORÍA DRIVE] y niveles normalizados.
3. Se eliminó el log individual por archivo. Los resultados clasificados continúan renderizándose en audit-drive-results-container; la consola global recibe resúmenes por carpeta, por lote y acumulados.
4. Se conservaron los conteos de descubiertos, analizados, carpetas recorridas y pendientes, lotes, clasificaciones, errores, duplicados y referencias no interpretables.
5. Se mantuvieron sin cambios el cursor del servidor, persistState, IndexedDB, la validación de lotes, el bloqueo de ejecución y la acción de reanudación.
6. Se retiraron estilos CSS que solo servían a la consola embebida.
7. Se actualizó el contrato UI heredado para validar la consola global y la conservación de resultados/reanudación; se añadió AdminDriveAuditGlobalConsole al runner de regresión.

## Validación

- AdminDriveAuditGlobalConsole: 1/1 PASS. Comprueba que los niveles se envían al logger global, que sesiones obsoletas no escriben, que el resultado permanece visible y que se conservan progreso, conteos y cursor.
- CortesImageReconciliationUI: 15/15 PASS.
- AdminDriveAuditClientRetry: 7/7 PASS.
- AdminDriveAuditIndexedDB: 13/13 PASS.
- CI del commit cd20182c3a4c8a55e9f14b6f02c6b4cc948e172d: 304 suites, 3,562 pruebas aprobadas, 0 fallos.
- Sintaxis de módulos JavaScript: PASS.
- Health read-only: 7/7 SUCCESS.
- GitHub Pages build/deployment: SUCCESS.

## Alcance y resultado

No se modificaron servicios ADMIN/CATALOG, datos de Drive/Spreadsheet ni el algoritmo de clasificación. La lista de resultados sigue en el modal; los mensajes de progreso y resumen se conservan en la consola global. La reanudación continúa usando el cursor y el estado local previamente guardado.

A07-05 queda **COMPLETADA**.

Siguiente tarea: A07-06 — asociación sugerida por modelo basada en nombre, carpeta y alias, con revisión de ambigüedad y sin reasignación automática.
