# Manifiesto de rotación documental — 2026-11-19

Repositorio: infogpstech/GPSpedia  
Rama: GPSpedia2.2.5_work  
HEAD confirmado antes de la rotación: eadbf468b35022290955a4ee7cceaad820cbb611  
Rama base consultada: GPSpedia2.2.5 (d9acc68d889985c2e2f42fe3a02e502efc86ead1); no se modificó.

## 1. Tareas_Pendientes.md

- Blob Git original: `a81142fc448614f6f283cab11d77d0e3fc5e4ee8`
- Caracteres Unicode: 182,953
- Bytes UTF-8: 185,938
- Límite exacto: offset 97,891; encabezado `## Solicitudes post revisión — 2026-11-16`.
- Parte 001: `Tareas_Pendientes_parte_001.md`; 97,891 caracteres Unicode; 99,560 bytes UTF-8; blob `3cd34456046511d8963decf5767dce43ed069bb2`.
- Parte 002: `Tareas_Pendientes_parte_002.md`; 85,062 caracteres Unicode; 86,378 bytes UTF-8; blob `099dd83efcbccf292c49080e50e62ef40bb7724b`.
- Reconstrucción: parte 001 + parte 002, sin separadores añadidos. Igualdad exacta comprobada en memoria y SHA Git de la reconstrucción coincidente con el blob original.

## 2. lista_beta_parte2.txt

- Blob Git original: `e89c8fa154a8482be6067751f14ed31071ed00a2`
- Caracteres Unicode: 184,838
- Bytes UTF-8: 186,955
- Límite exacto: offset 94,728; separador inmediatamente anterior al registro `AUG-042`.
- Parte 001: `lista_beta_parte2_parte_001.txt`; 94,728 caracteres Unicode; 95,627 bytes UTF-8; blob `25263b117acd6e8f03c4d089b1e49dbe091ae9bb`.
- Parte 002: `lista_beta_parte2_parte_002.txt`; 90,110 caracteres Unicode; 91,328 bytes UTF-8; blob `687300cbdcb6e7a69a35a5d2c3e8f3379b357702`.
- Reconstrucción: parte 001 + parte 002, sin separadores añadidos. Igualdad exacta comprobada en memoria y SHA Git de la reconstrucción coincidente con el blob original.

## 3. Índices y documentación reconciliada

- `Tareas_Pendientes.md` y `lista_beta_parte2.txt` quedan como índices ligeros hacia sus segmentos.
- `lista_beta.txt` conserva el orden global de lectura y apunta al índice de la parte 2.
- `Services/SERVICE_HEALTH.md`: FEEDBACK actualizado a 1.2.2 y ADMIN a 2.7.1, cotejados con los endpoints fuente. No se verificaron deployments remotos.
- `Tareas_Activas.md`, `Auditoría.txt`, `ChangesLogs.txt` y `checkpoint.md` reciben adendas de continuidad; no se reescriben registros históricos.

## 4. Criterio de integridad

La verificación de reconstrucción utiliza el SHA de blob Git de cada original. Los SHA indicados identifican el contenido exacto de los segmentos y permiten detectar alteraciones posteriores. Ninguna prueba Beta ni operación sobre Apps Script, Drive o Spreadsheet se ejecutó durante esta rotación.
