# Checkpoint activo — GPSpedia

Normativa única: [NORMAS_DESAROLLO.md](NORMAS_DESAROLLO.md). Leerla antes de modificar el proyecto o registrar cambios. Este archivo es el índice de continuidad vigente; el historial anterior se conserva íntegro en las partes legacy.

Historial checkpoint rotado:
- [Parte 001](Olds/Documentacion_Legacy/checkpoint_legacy_parte_001.md)
- [Parte 002](Olds/Documentacion_Legacy/checkpoint_legacy_parte_002.md)
- [Parte 003](Olds/Documentacion_Legacy/checkpoint_legacy_parte_003.md)
- [Parte 004](Olds/Documentacion_Legacy/checkpoint_legacy_parte_004.md)
- [Parte 005](Olds/Documentacion_Legacy/checkpoint_legacy_parte_005.md)
- [Parte 006](Olds/Documentacion_Legacy/checkpoint_legacy_parte_006.md), SHA fuente `3a37b6a08040a67b2f466c04aec05849f15f1384`, 179935 caracteres; copia exacta.

================================================================================
CHECKPOINT VIGENTE — AUG-050 — NORMALIZACIÓN DE VIN COMPLETO Y PREFIJOS — 2026-11-11
Repositorio: infogpstech/GPSpedia.
Rama autorizada: GPSpedia2.2.5_work.
HEAD padre antes de esta iteración: 8c44d7b49638b983ddacb8687bae44e8ba0c4b89.
Rama base: GPSpedia2.2.5; HEAD confirmado: d9acc68d889985c2e2f42fe3a02e502efc86ead1, sin modificaciones.
Subproblema resuelto: criterio 6 de AUG-050. Para consultas de 17 caracteres, queryVehicle prioriza coincidencia exacta con firmas de 17; si no existe, consulta exactamente los primeros 12 caracteres contra firmas de prefijo. Los prefijos ingresados directamente no se recortan. No se mezclan longitudes ni se usan subcadenas arbitrarias en la ruta de VIN completo.
Versión de algoritmo: 1.4.0 para invalidar cachés anteriores.
Suite: Services/Test/VinQueryNormalization.js, nueve escenarios sintéticos. Validación en harness V8 aislado; regresiones de persistencia, identidad, umbral y rangos: 32/32 PASS. No se ejecutó Node CLI ni se consultó catálogo productivo.
Archivos funcionales/documentales: VinDifferentialEngine.js, Services/Test/VinQueryNormalization.js, Services/Test/README.md, Tareas_pendientes_parte1.txt, Tareas.txt, ChangesLogs.txt y checkpoint.md; se rota el checkpoint previo a la parte 006 preservándolo íntegro.
AUG-050 permanece EN PROGRESO. Pendientes: extractSharedChars y presentación/integración de resultados ambiguos/versiones en UI/navegación; revisión de coste combinatorio y medición con catálogo real (esta última diferida según normas).
Siguiente iteración: continuar AUG-050 con un único subproblema; no iniciar AUG-051.
================================================================================
