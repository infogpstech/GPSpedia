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
| 9 | `ActiveSessions` | 5 |
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
- **Columnas con encabezado:** 5

| Posición | Letra | Encabezado exacto |
|---:|:---:|---|
| 1 | A | `ID_Usuario` |
| 2 | B | `Usuario` |
| 3 | C | `ActiveSessions` |
| 4 | D | `date` |
| 5 | E | `Logs` |

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

**Nota sobre las columnas 46–48:** WRITE y ADMIN las administran mediante `ensureTestigoColumns`. En la copia recibida, que termina en la columna 45, se agregarán después de las dos columnas reservadas cuando se ejecute por primera vez una operación que requiera esos campos. La acción de migración VIN no las crea por sí sola.

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
