# GPSpedia_DB_v2.0 — estructura de hojas y columnas

**Archivo analizado:** `GPSpedia_DB_v2.0.xlsx`  
**Alcance:** nombres de hojas y encabezados de columnas, sin contenido de registros.

## Criterios del inventario

- Se identificó la primera fila con encabezados de cada hoja; en este archivo corresponde a la fila 1.
- Se conserva la escritura exacta de cada encabezado, incluidas mayúsculas, minúsculas, acentos y guiones bajos.
- La posición se indica mediante número de columna y letra de Excel.
- No se incluyen valores de filas de datos, identificadores, credenciales, VIN, URLs ni otra información almacenada.
- Este documento describe la estructura encontrada en la copia recibida; no modifica el archivo XLSX.

## Resumen

- **Hojas:** 13

| # | Hoja | Columnas con encabezado |
|---:|---|---:|
| 1 | `Users` | 8 |
| 2 | `Imagenes_Reemplazadas` | 11 |
| 3 | `pys` | 10 |
| 4 | `AdminState` | 6 |
| 5 | `Cortes` | 45 |
| 6 | `LogosMarca` | 4 |
| 7 | `Tutorial` | 7 |
| 8 | `Relay` | 11 |
| 9 | `ActiveSessions` | 6 |
| 10 | `Feedbacks` | 9 |
| 11 | `Contactanos` | 6 |
| 12 | `Logs` | 4 |
| 13 | `ActividadUsuario` | 7 |

## Inventario detallado

### Hoja `Users`

- **Fila de encabezados:** 1
- **Columnas con encabezado:** 8

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 1 | A | `ID` |
| 2 | B | `Nombre_Usuario` |
| 3 | C | `Password` |
| 4 | D | `Privilegios` |
| 5 | E | `Telefono` |
| 6 | F | `Correo_Electronico` |
| 7 | G | `Nombre` |
| 8 | H | `SessionToken` |

### Hoja `Imagenes_Reemplazadas`

- **Fila de encabezados:** 1
- **Columnas con encabezado:** 11

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 1 | A | `id_reemplazo` |
| 2 | B | `fecha_reemplazo` |
| 3 | C | `tipo_contenido` |
| 4 | D | `registro_id` |
| 5 | E | `campo` |
| 6 | F | `archivo_drive_id` |
| 7 | G | `nombre_archivo` |
| 8 | H | `url_anterior` |
| 9 | I | `sustituida_por_url` |
| 10 | J | `referencia_texto` |
| 11 | K | `estado` |

### Hoja `pys`

- **Fila de encabezados:** 1
- **Columnas con encabezado:** 10

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 1 | A | `id_problem` |
| 2 | B | `Problema` |
| 3 | C | `Descripción` |
| 4 | D | `Se soluciono` |
| 5 | E | `Solucion` |
| 6 | F | `Prevenir` |
| 7 | G | `Imagen` |
| 8 | H | `Video` |
| 9 | I | `Colaborador` |
| 10 | J | `modelos_asociados` |

### Hoja `AdminState`

- **Fila de encabezados:** 1
- **Columnas con encabezado:** 6

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 1 | A | `Action` |
| 2 | B | `LastIndex` |
| 3 | C | `Total` |
| 4 | D | `Percentage` |
| 5 | E | `Date` |
| 6 | F | `ProcessId` |

### Hoja `Cortes`

- **Fila de encabezados:** 1
- **Columnas con encabezado:** 45

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 1 | A | `id` |
| 2 | B | `categoria` |
| 3 | C | `marca` |
| 4 | D | `modelo` |
| 5 | E | `versionesAplicables` |
| 6 | F | `anoDesde` |
| 7 | G | `anoHasta` |
| 8 | H | `tipoEncendido` |
| 9 | I | `imagenVehiculo` |
| 10 | J | `videoGuiaDesarmeUrl` |
| 11 | K | `contadorBusqueda` |
| 12 | L | `tipoCorte1` |
| 13 | M | `ubicacionCorte1` |
| 14 | N | `colorCableCorte1` |
| 15 | O | `configRelay1` |
| 16 | P | `imgCorte1` |
| 17 | Q | `utilCorte1` |
| 18 | R | `colaboradorCorte1` |
| 19 | S | `tipoCorte2` |
| 20 | T | `ubicacionCorte2` |
| 21 | U | `colorCableCorte2` |
| 22 | V | `configRelay2` |
| 23 | W | `imgCorte2` |
| 24 | X | `utilCorte2` |
| 25 | Y | `colaboradorCorte2` |
| 26 | Z | `tipoCorte3` |
| 27 | AA | `ubicacionCorte3` |
| 28 | AB | `colorCableCorte3` |
| 29 | AC | `configRelay3` |
| 30 | AD | `imgCorte3` |
| 31 | AE | `utilCorte3` |
| 32 | AF | `colaboradorCorte3` |
| 33 | AG | `apertura` |
| 34 | AH | `imgApertura` |
| 35 | AI | `cableAlimen` |
| 36 | AJ | `imgCableAlimen` |
| 37 | AK | `timestamp` |
| 38 | AL | `notaImportante` |
| 39 | AM | `cableAlimen2` |
| 40 | AN | `imgCableAlimen2` |
| 41 | AO | `cableAlimen3` |
| 42 | AP | `imgCableAlimen3` |
| 43 | AQ | `idOperacion1` |
| 44 | AR | `idOperacion2` |
| 45 | AS | `idOperacion3` |

### Hoja `LogosMarca`

- **Fila de encabezados:** 1
- **Columnas con encabezado:** 4

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 1 | A | `id` |
| 2 | B | `nombreMarca` |
| 3 | C | `urlLogo` |
| 4 | D | `fabricanteNombre` |

### Hoja `Tutorial`

- **Fila de encabezados:** 1
- **Columnas con encabezado:** 7

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 1 | A | `ID` |
| 2 | B | `Tema` |
| 3 | C | `Imagen` |
| 4 | D | `comoIdentificarlo` |
| 5 | E | `dondeEncontrarlo` |
| 6 | F | `Detalles` |
| 7 | G | `Video` |

### Hoja `Relay`

- **Fila de encabezados:** 1
- **Columnas con encabezado:** 11

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 1 | A | `ID` |
| 2 | B | `configuracion` |
| 3 | C | `funcion` |
| 4 | D | `vehiculoDondeSeUtiliza` |
| 5 | E | `pin30Entrada` |
| 6 | F | `pin85BobinaPositivo` |
| 7 | G | `pin86bobinaNegativo` |
| 8 | H | `pin87aComunCerrado` |
| 9 | I | `pin87ComunmenteAbierto` |
| 10 | J | `imagen` |
| 11 | K | `observacion` |

### Hoja `ActiveSessions`

- **Fila de encabezados:** 1
- **Columnas con encabezado:** 6

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 1 | A | `ID_Usuario` |
| 2 | B | `Usuario` |
| 3 | C | `ActiveSessions` |
| 4 | D | `date` |
| 5 | E | `Logs` |
| 6 | F | `lastActivityAt` |

### Hoja `Feedbacks`

- **Fila de encabezados:** 1
- **Columnas con encabezado:** 9

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 1 | A | `ID` |
| 2 | B | `Usuario` |
| 3 | C | `ID_vehiculo` |
| 4 | D | `Problema` |
| 5 | E | `Respuesta` |
| 6 | F | `Se resolvio` |
| 7 | G | `Responde` |
| 8 | H | `Reporte de util` |
| 9 | I | `anoSugerido` |

### Hoja `Contactanos`

- **Fila de encabezados:** 1
- **Columnas con encabezado:** 6

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 1 | A | `Contacto_ID` |
| 2 | B | `User_ID` |
| 3 | C | `Asunto` |
| 4 | D | `Mensaje` |
| 5 | E | `Respuesta_mensaje` |
| 6 | F | `ID_usuario_responde` |

### Hoja `Logs`

- **Fila de encabezados:** 1
- **Columnas con encabezado:** 4

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 1 | A | `Timestamp` |
| 2 | B | `Level` |
| 3 | C | `Message` |
| 4 | D | `Data` |

### Hoja `ActividadUsuario`

- **Fila de encabezados:** 1
- **Columnas con encabezado:** 7

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 1 | A | `id` |
| 2 | B | `timestamp` |
| 3 | C | `idUsuario` |
| 4 | D | `nombreUsuario` |
| 5 | E | `tipoActividad` |
| 6 | F | `idElementoAsociado` |
| 7 | G | `detalle` |

## Observación sobre la hoja `Cortes`

La hoja `Cortes` contiene 45 columnas con encabezado. Sus tres últimas columnas, en la copia analizada, son:

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 43 | AQ | `idOperacion1` |
| 44 | AR | `idOperacion2` |
| 45 | AS | `idOperacion3` |

Este inventario registra únicamente los encabezados físicos encontrados en la copia recibida. No establece el uso funcional esperado de estas columnas ni propone cambios al esquema; esas decisiones corresponden a los requisitos vigentes y al historial de implementación del proyecto.


## Estructura objetivo de la implementación VIN

**Estado:** esquema objetivo definido por el código y los requisitos. La copia analizada aún no ha recibido la migración; esta sección no afirma que la hoja de cálculo productiva ya esté modificada.

### Hoja `Cortes` después de la migración

Las columnas 1–42 conservan exactamente los encabezados del inventario de la copia recibida. La reorganización prevista para las columnas finales es:

| Posición | Letra | Encabezado objetivo | Uso |
|---:|:---:|---|---|
| 43 | AQ | `VIN` | Colección JSON de VIN procesados por registro |
| 44 | AR | Sin encabezado | Reservada; no asignar automáticamente |
| 45 | AS | Sin encabezado | Reservada; no asignar automáticamente |
| 46 | AT | `activaTestigo1` | Indicador del primer corte |
| 47 | AU | `activaTestigo2` | Indicador del segundo corte |
| 48 | AV | `activaTestigo3` | Indicador del tercer corte |

**Contrato obligatorio AT:AV:** `activaTestigo1`, `activaTestigo2` y `activaTestigo3` se ubican siempre en las columnas 46–48, respectivamente. WRITE y ADMIN crean únicamente las columnas físicas faltantes hasta AV y escriben esos encabezados en AT:AV; no los agregan al final de la última columna usada. Las columnas existentes después de AV se conservan sin desplazamiento. Si un encabezado testigo aparece duplicado o fuera de su posición, si AT:AV contienen otros encabezados o si hay datos bajo un encabezado vacío, la operación se detiene sin reasignar ni sobrescribir datos. AR:AS permanecen reservadas.

### Nueva hoja `Idempotencia`

En el escenario estándar de la copia recibida, la migración agrega esta hoja y el total pasa de 13 a 14 hojas. Cuando no exista una hoja primaria o alternativa compatible, la implementación crea `Idempotencia` con estos encabezados:

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 1 | A | `opId` |
| 2 | B | `vehicleId` |
| 3 | C | `slotIndex` |
| 4 | D | `timestamp` |
| 5 | E | `status` |

La hoja conserva la relación entre cada identificador de operación, el ID del vehículo y el slot del corte. Si `Idempotencia` existe con estructura incompatible, se conserva y se utiliza `Idempotencia_Cortes` únicamente si esta última es compatible. Si ambas son incompatibles, la operación se detiene.

### Diferencia entre la copia recibida y el esquema objetivo

- La copia recibida contiene 13 hojas y no contiene `Idempotencia` ni `Idempotencia_Cortes`.
- En la copia, `Cortes` tiene los encabezados `idOperacion1`, `idOperacion2` e `idOperacion3` en las columnas 43–45; las tres columnas no contienen valores almacenados.
- La migración estándar creará `Idempotencia` con sus cinco encabezados, establecerá `VIN` en AQ y dejará AR/AS sin encabezado ni contenido.
- El inventario inicial conserva la estructura física observada en la copia. Esta sección documenta por separado la estructura objetivo para evitar confundir un cambio planeado con una migración ya ejecutada.


### Extensión administrada por FEEDBACK — atribución de sugerencias de año

La estructura observada original de `Feedbacks` conserva sus nueve columnas A:I. Al recibir la primera sugerencia de año después de esta implementación, FEEDBACK añade una columna de control al final de los encabezados existentes, sin desplazar ni reinterpretar las columnas históricas.

| Posición prevista en el esquema actual | Letra | Encabezado exacto | Uso |
|---:|:---:|---|---|
| 10 | J | `suggestionActorKey` | Clave seudónima para contar una sola aportación por actor, vehículo y año. Para cuentas registradas contiene el ID verificado; para aportes anónimos contiene un hash del identificador persistente del navegador. |

Si la hoja productiva contiene columnas adicionales no reflejadas en este inventario, el servicio añade el campo después de la última columna utilizada. No sobrescribe encabezados existentes. Los registros históricos sin clave de aportante se conservan, pero no se consideran votos verificables para el umbral de tres aportantes distintos.


## Hoja técnica adicional creada bajo demanda — `AdminImageUploads`

**Estado:** estructura definida por la implementación de ADMIN. Esta hoja no forma parte de la copia original de 13 hojas descrita en el inventario anterior. ADMIN la crea cuando recibe el primer reemplazo de imagen in-modal después de desplegar esta versión. No se ha creado ni modificado ninguna hoja productiva durante la implementación en GitHub.

**Finalidad:** conservar un registro durable por `opId` para recuperar una carga de imagen ante una respuesta HTTP perdida, incluso cuando el campo de `Cortes` no tenía una URL anterior. No sustituye a `Imagenes_Reemplazadas`; esta última sigue registrando únicamente imágenes anteriores reales.

- **Fila de encabezados:** 1
- **Columnas con encabezado:** 12
- **Una fila por intento:** el valor `opId` debe ser único. Si aparece duplicado, ADMIN detiene la operación por integridad.

| Posición | Letra | Encabezado exacto | Uso |
|---:|:---:|---|---|
| 1 | A | `opId` | Identificador estable del intento generado por el navegador |
| 2 | B | `vehicleId` | Identificador del vehículo en `Cortes` |
| 3 | C | `fieldName` | Campo de imagen que se reemplaza |
| 4 | D | `urlAnterior` | URL activa al iniciar el intento |
| 5 | E | `urlNueva` | URL del archivo Drive asociado al intento |
| 6 | F | `archivoDriveId` | ID del archivo Drive creado o recuperado |
| 7 | G | `contentHash` | Huella SHA-256 del contenido recibido |
| 8 | H | `tipoMime` | Tipo MIME de la imagen |
| 9 | I | `nombreArchivo` | Nombre recibido desde el navegador |
| 10 | J | `estado` | Estado técnico del intento |
| 11 | K | `fechaCreacion` | Fecha de creación del registro |
| 12 | L | `fechaActualizacion` | Última actualización del estado |

**Estados utilizados por ADMIN:**
- `pending`: intento registrado y todavía no confirmado como vinculado.
- `linked`: archivo y referencia de `Cortes` confirmados.
- `cancelled`: se ejecutó la compensación y se conservó/restauró la referencia anterior.
- `requires_review`: ocurrió un fallo de compensación o conflicto que requiere revisión.

**Protecciones de esquema:** si ya existe una hoja llamada `AdminImageUploads` con encabezados incompatibles, ADMIN detiene la operación y no reescribe sus encabezados. La hoja se añade como una nueva hoja independiente; no se agregan columnas a `Cortes`, no se desplazan las once columnas históricas de `Imagenes_Reemplazadas` y no se altera el esquema de `AdminState`.

**Relación con el historial:** para reemplazos que sí tienen imagen anterior, `id_reemplazo` utiliza el formato determinista `REP-<opId>`. La fila histórica se busca y reutiliza por ese ID. Si el campo no tenía imagen anterior, el intento queda registrado únicamente en `AdminImageUploads`, sin crear una fila ficticia en `Imagenes_Reemplazadas`.


## Extensión administrada por FEEDBACK — metadatos estructurados de reportes individuales

**Estado:** definida por H-TESTIGO-REPORT-01. La columna se crea bajo demanda al recibir un reporte individual que incluya el contexto estructurado. No se modifica la hoja productiva durante la implementación en GitHub.

- **Hoja:** Feedbacks.
- **Encabezado exacto:** `reportMetadata`.
- **Ubicación:** se agrega después del último encabezado utilizado en la hoja. No se fija una letra porque la extensión existente `suggestionActorKey` y otras extensiones pueden haber sido creadas en distinto orden.
- **Compatibilidad:** las nueve columnas históricas A:I conservan sus posiciones. La función valida sus encabezados antes de agregar la nueva columna, reutiliza una única columna `reportMetadata` existente y se detiene si encuentra duplicados o una ubicación incompatible.
- **Formato:** objeto JSON por fila, separado del texto libre de Problema.

Propiedades almacenadas:
- `reportId`: identificador estable generado por el frontend antes del envío.
- `vehicleId`: identificador del vehículo, coincidente con la columna C `ID_vehiculo`.
- `corteIndex`: número de corte individual (1, 2 o 3).
- `activaTestigoMotor`: booleano enviado explícitamente por el checkbox. `true` representa la confirmación positiva del técnico; `false` representa que no marcó la confirmación y nunca una orden para desactivar el testigo.

Los reportes históricos sin metadatos permanecen válidos y se devuelven desde Inbox con `reportMetadata=null`. El lector valida el JSON y su asociación con el vehículo antes de exponerlo. La columna no sustituye ni modifica `Cortes.activaTestigo1..3`.


## Política de identidad y eliminación de cuentas (AUG-005)

La columna `Users.ID` es una clave de identidad y no debe depender de la posición de la fila. Las cuentas creadas por la implementación actual reciben un UUID estático. Para compatibilidad con filas históricas cuyo ID pudiera ser fórmula, la eliminación es lógica: la fila no se elimina ni se desplaza. AUTH marca el registro con el prefijo reservado `__deleted__:` y limpia sus credenciales/datos de perfil; las consultas y la autenticación excluyen esos registros. La hoja conserva el ID histórico para mantener referencias existentes en `ActiveSessions` y registros relacionados.


### Conservación de identificadores históricos
Antes de desactivar una cuenta, AUTH convierte en valores estáticos los IDs calculados de las filas existentes y aborta ante IDs vacíos/duplicados. Esto preserva las referencias históricas aunque las fórmulas originales dependieran de la fila u otros campos. Las cuentas nuevas utilizan UUID estáticos; las filas de cuenta no se eliminan físicamente.


## Hoja técnica adicional — ImageUploadLedger

Se crea bajo demanda por WRITE/ADMIN antes de crear un archivo general en Drive. Encabezados exactos: token, operationKey, folderId, mimeType, sizeBytes, contentHash, fileId, fileUrl, state, referenceSheet, referenceRow, referenceColumns, referencesJson, fileName, createdAt, updatedAt, lastError. El token debe ser único. El ledger enlaza operación, archivo y referencia de Cortes; contentHash es SHA-256 completo. Estados de reconciliación: pending, linked, pending_unreferenced, orphan_candidate, file_missing y requires_review. Los archivos nunca se eliminan automáticamente por quedar sin referencia o presentar integridad dudosa. Límite de carga general: 10 MB por imagen.


## Hoja técnica adicional — FeedbackLikes (AUG-040)

Se crea bajo demanda por FEEDBACK al registrar el primer like autenticado. Conserva una fila por combinación única de actor, vehículo y corte para impedir incrementos duplicados y recuperar una escritura interrumpida.

Encabezados exactos: `actorKey`, `vehicleId`, `corteIndex`, `previousCount`, `targetCount`, `status`, `createdAt`.

- `actorKey`: identidad derivada en backend con formato `user:<Users.ID>`; no se acepta una identidad enviada como prueba por el navegador.
- `previousCount` y `targetCount`: permiten reanudar el incremento sin repetirlo después de una respuesta perdida.
- `status`: `pending` antes de confirmar el contador de Cortes; `completed` después de verificarlo por lectura.
- Una hoja existente con encabezados incompatibles o filas duplicadas bloquea la operación; no se reescribe ni se corrige automáticamente.

La hoja se añade de forma independiente y no altera las columnas históricas de Cortes o Feedbacks.


## Estructura objetivo de Users — AUG-045

**Estado:** esquema definido por el código; esta sección no afirma que la hoja productiva o la copia inventariada ya hayan sido modificadas.

| Posición | Letra | Encabezado objetivo | Uso |
|---:|:---:|---|---|
| 9 | I | `TermsAcceptance` | JSON de aceptación individual: versión, fecha/hora ISO y estado |

AUTH crea el encabezado únicamente si I1 está vacío y no existen datos en I2:I. Si encuentra otro encabezado o datos bajo encabezado vacío, detiene la operación sin sobrescribirlos. El valor no se expone en listados ni puede modificarse mediante actualización de perfil.
