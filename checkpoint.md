# GPSpedia — Checkpoint de etapa Beta

Fecha: 2026-11-22
Repositorio: `infogpstech/GPSpedia`
Rama de trabajo: `GPSpedia2.2.5_work`
Rama base: `GPSpedia2.2.5`
HEAD de referencia tras rotación documental: `60944c5b2bfd015ceb2450dbb2c1e87ebc58c1a4`
HEAD de la rama base: `d9acc68d889985c2e2f42fe3a02e502efc86ead1`

## Objetivo vigente
Ejecutar la validación Beta de los servicios y la aplicación. Durante esta etapa no realizar correcciones de código: registrar hallazgos en `Hallazgos_Beta.md` y actualizar el avance en `Tareas_Beta.md`.

## Limpieza documental
- Los registros de tareas anteriores al despliegue y el checkpoint previo, junto con sus archivos históricos, se trasladaron a `Olds/Documentacion_Legacy/`.
- Se crearon `Tareas_Beta.md`, `Hallazgos_Beta.md` y este checkpoint nuevo.
- Se eliminaron por instrucción expresa del usuario los informes de auditoría históricos del árbol activo, incluidos sus archivos de archivo y el informe de auditoría del snapshot antiguo.
- Se eliminaron las capturas y archivos auxiliares de `Images/tests/`, que no forman parte del código.
- Se conservaron las listas Beta y sus adendas.
- Se conservaron `JS/Tests/`, sus 373 archivos de pruebas y el workflow de CI, porque sí aportan validación automatizada al código.
- Los changelogs y logs de la raíz, junto con su archivo histórico, se trasladaron a `Olds/Documentacion_Legacy/` sin eliminar su contenido.
- Se añadió a §8 de `NORMAS_DESAROLLO.md` la excepción limitada para purgas documentales expresamente autorizadas por el usuario.

## Estado Beta
- El usuario informó que actualizó las URLs de servicios en `api_config`.
- El aislamiento de endpoints y recursos se considera declarado por el usuario, pero no se verificó de forma independiente desde esta sesión.
- No se han ejecutado invocaciones reales a endpoints ni pruebas de escritura desde esta sesión.
- No está disponible el conector Google Drive/Sheets ni una acción HTTP genérica para invocar Apps Script. No declarar servicios probados ni inventar resultados.
- Reanudar con health/read-only cuando exista un canal autorizado; antes de escrituras confirmar recursos desechables, cuentas de prueba, permisos, previsualización y recuperación.

## Ramas
Deben conservarse `main`, `GPSpedia2.2.5` (base) y `GPSpedia2.2.5_work` (work). Se identificaron ramas adicionales: `GPSpedia2.2`, `GPSpedia2.2.0`, `GPSpedia2.2.5_auth-users-test`, `GPSpedia-2.1.7` y `health-probe-20261117`. La conexión GitHub disponible permite consultar ramas, pero no eliminar referencias; no se ha borrado ninguna. Su eliminación queda pendiente desde una interfaz con permisos de administración, seguida de una nueva verificación.

## Próximas acciones
1. Eliminar ramas ajenas a main/base/work y verificar el listado.
2. Verificar aislamiento de deployments, Spreadsheet y Drive Beta.
3. Ejecutar la matriz de `Tareas_Beta.md` sin modificar código.
4. Registrar resultados observados en `Hallazgos_Beta.md`.
