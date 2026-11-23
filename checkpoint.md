# GPSpedia — Checkpoint de etapa Beta

Fecha: 2026-11-22
Repositorio: `infogpstech/GPSpedia`
Rama de trabajo: `GPSpedia2.2.5_work`
Rama base: `GPSpedia2.2.5`
HEAD verificado al crear este checkpoint: `f8df2c91f8408c311d47ec7c67091cf482cf5cb4`
HEAD de la rama base: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`

## Objetivo vigente
Ejecutar la validación Beta de los servicios y la aplicación. Durante esta etapa no realizar correcciones de código: registrar hallazgos en `Hallazgos_Beta.md` y actualizar el avance en `Tareas_Beta.md`.

## Rotación documental
- Los registros de tareas anteriores al despliegue y el checkpoint anterior se trasladan a `Olds/Documentacion_Legacy/`.
- Los registros operativos nuevos son `Tareas_Beta.md`, `Hallazgos_Beta.md` y este `checkpoint.md`.
- Se conservan la lista Beta original y sus adendas.
- Se conservan `JS/Tests/` y el workflow de CI porque aportan validación automatizada al código.
- Los informes de auditoría históricos siguen pendientes de resolución conforme a §8 de `NORMAS_DESAROLLO.md`, que ordena no borrar evidencia histórica.

## Estado Beta
- El usuario informó que actualizó las URLs de servicios en `api_config`.
- El aislamiento de endpoints y recursos se considera declarado por el usuario, pero no se verificó de forma independiente desde esta sesión.
- No se han ejecutado invocaciones reales a endpoints ni pruebas de escritura desde esta sesión.
- No está disponible el conector Google Drive/Sheets ni una acción HTTP genérica para invocar Apps Script. No declarar servicios probados ni inventar resultados.
- Reanudar con health/read-only cuando exista un canal autorizado; antes de escrituras confirmar recursos desechables, cuentas de prueba, permisos, previsualización y recuperación.

## Ramas
Deben conservarse `main`, `GPSpedia2.2.5` (base) y `GPSpedia2.2.5_work` (work). La consulta remota mostró ramas adicionales, incluidas ramas de pruebas. La conexión GitHub disponible permite consultar ramas, pero no eliminar referencias; no se ha borrado ninguna. La eliminación queda pendiente desde una interfaz con permisos de administración, seguida de una nueva verificación.

## Próximas acciones
1. Resolver la limpieza de informes de auditoría conforme a la normativa vigente.
2. Eliminar ramas ajenas a main/base/work y verificar el listado.
3. Verificar aislamiento de deployments, Spreadsheet y Drive Beta.
4. Ejecutar la matriz de `Tareas_Beta.md` sin modificar código.
5. Registrar resultados observados en `Hallazgos_Beta.md`.
