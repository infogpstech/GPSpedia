# Plan de migración y reconciliación de identificadores

Fecha: 2026-11-14  
Repositorio: `infogpstech/GPSpedia`  
Rama de trabajo: `GPSpedia2.2.5_work`  
Rama base protegida: `GPSpedia2.2.5`

## 1. Objetivo y regla de seguridad

Normalizar únicamente los registros que demuestren tener un identificador ausente, malformado o ambiguo y cuya identidad pueda resolverse sin inferencias. Los IDs válidos y sus referencias se conservan: **no se renumeran IDs válidos por estética ni por cambiar el generador**.

La migración no debe comenzar en producción. La primera ejecución será un dry-run sobre una copia Beta, con snapshot, manifiesto y estrategia de reversión verificada.

## 2. Situación conocida por entidad

| Entidad | Formato/generador actual | Política para datos existentes |
|---|---|---|
| Users | `USR-####`, asignado en backend bajo bloqueo | Conservar IDs válidos. No cambiar IDs referenciados por sesiones, actividad, Inbox, sugerencias o aprobaciones. Duplicados/malformados se aíslan para reconciliación manual. |
| Cortes / vehículos | Entero positivo, contador backend y ScriptLock en WRITE | Conservar números válidos porque aparecen en enlaces, caché y relaciones. Solo completar un ID ausente si la fila y todas sus referencias se identifican sin ambigüedad. |
| Tutorial | `tut-<operationId>`, operación normalizada a minúsculas e idempotente | Conservar IDs históricos; comparación de IDs case-insensitive. No regenerar IDs de filas antiguas ni alterar referencias de vídeo/aprobación. |
| PyS | `isue-<secuencia>`, ledger `PysOperations` reanudable | Conservar IDs válidos. Resolver filas duplicadas o sin ID junto con el ledger y las asociaciones a vehículos; nunca reasignar por posición de fila. |
| Relay | Formato y escritor de filas no confirmados en el repositorio | Solo auditoría. No crear generador ni migrar hasta identificar esquema, origen de datos, consumidores y referencias reales. |
| LogosMarca | Entero positivo, asignador backend con contador y bloqueo | Conservar valores numéricos válidos. No recalcular IDs existentes; detener ante duplicados, fórmulas sin resultado o filas con datos sin ID. |

## 2.1 Inventario estático de referencias consumidoras (2026-11-14)

La revisión de `Services/feedback.js`, `Services/write.js`, `Services/admin.js`, `Services/catalog.js` y `JS/Frontend/ui.js` identifica estas relaciones. ADMIN `auditIdentifiers` las contrasta en modo de solo lectura; los datos reales siguen reservados a Beta.

### Cortes / vehículos
- `Feedbacks.ID_vehiculo` y `Feedbacks.Problema.vehicleId` en solicitudes `suggestion_cut`; se comprueba la concordancia entre ambos valores.
- `FeedbackLikes.vehicleId` y `Idempotencia.vehicleId` / `Idempotencia_Cortes.vehicleId`.
- `pys.modelos_asociados` (columna J), almacenado como lista JSON o texto delimitado; sus elementos apuntan a IDs de `Cortes`.
- `ActividadUsuario.idElementoAsociado` para `report_problem`, `suggest_year`, `suggest_year_range_review`, `suggest_year_collision`, `apply_year_suggestion` y `like`.
- `Imagenes_Reemplazadas.registro_id` cuando `tipo_contenido=vehiculo`; el escritor `recordReplacedImage` usa ese tipo y el ID del vehículo.
- Los IDs se comparan como enteros positivos canónicos; `1` y `001` colisionan.

### PyS
- `PysOperations.problemId` (columna C) apunta a `pys.id_problem`; `opId` es la clave de idempotencia, no el ID de entidad.
- `Feedbacks.Problema.referenceId` apunta a PyS para `video_approval` con `contentType=pys`.
- `ActividadUsuario.idElementoAsociado` apunta a PyS para `tipoActividad=add_problem`.
- `pys.modelos_asociados` contiene IDs de vehículos, no IDs PyS.

### LogosMarca
- El catálogo consume `LogosMarca.nombreMarca` y `urlLogo`; la interfaz relaciona `Cortes.marca` con el nombre mediante coincidencias exactas, prefijos y sinónimos.
- No se encontró un consumidor activo de `LogosMarca.ID` como clave foránea. El ID se asigna en ADMIN y se añade a la descripción del archivo Drive para recuperación; la unión funcional es por nombre.
- Coincidencias exactas ausentes/ambiguas se reportan como diagnóstico; no autorizan renombrar marcas ni reasignar IDs automáticamente.

### Relay
- `catalog.js` consume `Relay.ID` como dato de catálogo y `Relay.configuracion` para poblar `Cortes.configRelay1-3`; no se localizó un escritor de filas Relay.
- El formato y ciclo de vida de `Relay.ID` siguen sin confirmarse. No se implementa generador ni migración.

## 3. Fase A — Inventario de solo lectura

1. Ejecutar `auditIdentifiers` en una copia Beta.
2. Exportar conteos y muestras de IDs ausentes, duplicados, malformados, fórmulas y referencias no resueltas.
3. Inventariar columnas consumidoras por entidad:
   - Users: ActiveSessions, registros de actividad, autoría/participantes Inbox, solicitudes y aprobaciones.
   - Cortes: enlaces compartidos, PyS/modelos asociados, sugerencias, registros de operación, imágenes y caché del catálogo.
   - Tutorial: aprobaciones/subidas de vídeo, catálogo, enlaces y referencias por tema/ID.
   - PyS: PysOperations, modelos asociados, imágenes y vínculos desde Cortes.
   - Relay y LogosMarca: columnas consumidoras y claves de marca/configuración que se confirmen en el esquema real.
4. Clasificar cada anomalía como resoluble automáticamente, requiere decisión humana o debe quedar bloqueada.
5. No producir un ID sustituto solo por orden de fila, nombre parecido o coincidencia parcial.

## 4. Fase B — Snapshot y manifiesto

Antes de cualquier escritura, crear una copia verificable de las hojas afectadas que preserve valores, fórmulas, encabezados, orden de columnas y referencias. El snapshot debe quedar identificado por un ID de ejecución y fecha.

Crear un manifiesto inmutable con una entrada por cambio propuesto:
- `migrationId`, entidad/hoja, fila observada y clave estable del registro.
- ID anterior, ID propuesto y motivo.
- Huella SHA-256 del registro y de los campos de referencia antes del cambio.
- Referencias entrantes/salientes detectadas y conteos.
- Estado: `PLANNED`, `APPLIED`, `VERIFIED`, `CONFLICT`, `ROLLED_BACK`.
- Lote, checkpoint y marcas de tiempo.

El manifiesto no debe contener contraseñas, tokens, datos sensibles innecesarios ni contenido de imágenes.

## 5. Fase C — Dry-run y criterios de aceptación

El dry-run no escribe en hojas, propiedades ni Drive. Para cada cambio propuesto debe demostrar:
- Identidad única del registro de origen.
- Ausencia de colisión con IDs existentes, normalizando según el tipo (texto case-insensitive o entero numérico).
- Referencias consumidoras completas y sin duplicados.
- Huellas antes/después esperadas y número exacto de filas afectadas.
- Que los enlaces compartidos y claves de caché puedan seguir resolviéndose.
- Que el rollback pueda restaurar los valores originales.

El dry-run se rechaza completo para una entidad si no se puede demostrar la unicidad del registro o la integridad de sus referencias. No se debe ocultar una ambigüedad detrás de un ID nuevo.

## 6. Fase D — Escritura batch reanudable

Solo después de aprobar el dry-run y contar con respaldo:
1. Exigir rol Desarrollador, `dryRun:false` y confirmación explícita vinculada al `migrationId`/huella del manifiesto.
2. Adquirir un bloqueo compartido que cubra la hoja y todas las hojas consumidoras.
3. Volver a comprobar las huellas inmediatamente antes de cada lote.
4. Aplicar lotes pequeños y deterministas; registrar cada fila como `APPLIED` solo tras leer y verificar el valor persistido.
5. Actualizar referencias dentro del mismo lote lógico y verificar sus conteos.
6. Guardar checkpoint tras cada lote. Repetir una operación debe ser idempotente y omitir filas `VERIFIED`.
7. Si cambia una huella, aparece una referencia nueva o una fila deja de ser única, detener solo esa entidad/lote y marcar `CONFLICT`.

## 7. Fase E — Verificación posterior

- Comparar conteos de filas, IDs y referencias antes/después.
- Confirmar unicidad global por entidad y ausencia de referencias huérfanas.
- Releer cada fila y cada referencia modificada.
- Probar navegación por ID, enlaces compartidos, consultas de catálogo, relaciones PyS, aprobaciones y caché.
- Mantener el snapshot y el manifiesto hasta cerrar la validación Beta y aprobar la liberación.

## 8. Reversión

La reversión solo se permite cuando las huellas actuales coinciden con el estado posterior registrado y no existen cambios legítimos posteriores. Debe:
1. Restaurar primero las referencias consumidoras y luego el ID original.
2. Verificar cada valor restaurado y el conteo de referencias.
3. Marcar `ROLLED_BACK` en el manifiesto.
4. Detenerse y requerir intervención manual si alguna fila fue modificada después del lote o el rollback no puede verificarse.

No borrar ni sobrescribir filas ambiguas para forzar una reversión.

## 9. Bloqueos conocidos y condiciones para iniciar

- Relay permanece bloqueado hasta confirmar su esquema real y localizar el proceso que crea/actualiza sus filas.
- Los IDs históricos de Users/Cortes/Tutorial/PyS/LogosMarca no se migran hasta disponer del reporte real de Beta.
- La calibración final de PBKDF2 es independiente de esta migración y debe medirse en el runtime de Apps Script.
- No se despliega ni se modifica Spreadsheet/Drive productivo como parte de este plan.
