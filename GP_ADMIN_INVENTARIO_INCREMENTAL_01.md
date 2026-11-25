# GP-ADMIN-INVENTARIO-INCREMENTAL-01 — registro automático por lotes

## Hallazgos de auditoría
- El escáner ADMIN persiste los IDs sin uso por página/lote en ScriptCache, mantiene el estado de la ejecución en DriveAuditRuns y devuelve clasificación por lote.
- El handler `handleSaveUnusedImagesInventory` llama a `validateCompletedDriveAudit_`, que rechaza estado `running` y exige digest de auditoría completa.
- El frontend no registra los resultados en Spreadsheet al recibirlos: guarda lote y progreso local, y al terminar ofrece registro manual.
- El handler actual revalida referencias, historial, papelera/MIME/ubicación y escrituras verificadas; una solución debe preservar estas barreras. Reconciliación de registros obsoletos solo tiene sentido al completar una auditoría, no por lote.

## Plan técnico
1. Implementar contrato ADMIN incremental con verificación de propietario, auditId activo, estado `running|complete`, candidato exclusivo de los IDs sin uso emitidos y persistidos en páginas de esa auditoría, TTL y revalidación independiente de referencias.
2. Idempotencia determinista por auditId + lote/lista, sin reutilizar/contaminar el identificador de operación global que habilita organizar. Reintentos no duplican filas; el estado final de organización sigue condicionado a auditoría completa.
3. Adaptar handler de inventario para aceptar lotes, conservar protecciones (histórico, manual, duplicado/ambiguo, trashed, MIME, carpeta Cortes, referencias no verificables), persistencia/read-back y no mover archivos. Evitar reconciliación de stale durante batches parciales.
4. Frontend: tras validar respuesta y persistir resultados localmente, llamar a ADMIN para registrar los candidatos sin uso del lote. Reintentos acotados, progreso/estado por lote, mostrar error recuperable; no detener la auditoría por fallos de inventario. Retomar pendientes idempotentemente al reanudar y consolidar al final.
5. Biblioteca: el registro por lote debe ser inmediatamente visible, sin botón de guardado manual como requisito. Mantener compatibilidad con registro final/reanudación y permitir revisar fallos.
6. Pruebas: autorización/propietario, audit running vs complete, cache/page allowlist, ID arbitrario rechazado, referencias activas, bloqueo por historial y Drive, duplicate retry, batch overlap, lote vacío, fallo parcial, stale reconciliation solo final, frontend orchestration, persistencia/resume y regresiones de organización.
7. CI, revisión diff y actualización de registros/checkpoint. Validación Beta real Drive/Spreadsheet/Apps Script diferida; no deployment ni escritura externa durante esta iteración.

## Estado
EN PROGRESO — hallazgos documentados y código inicial implementado; CI y revisión de seguridad aún pendientes.

## Implementación inicial (sin cierre)
- ADMIN admite modo incremental: valida ownership, estado running/complete, TTL y allowlist de IDs de páginas persistidas; operación identificada por auditId + digest del lote. Reconciliación de registros obsoletos y summary de inventario final solo en modo no incremental.
- Frontend intenta registro por lote inmediatamente tras recibir/persistir cada lote y consolida automáticamente al finalizar. Errores del guardado por lote se informan sin abortar el recorrido; se conserva fallback manual.
- Test `AdminIncrementalInventory.mjs` integrado al runner, cubre contratos y simulación del validator (ownership, allowlist, estado running/complete, TTL). CI en curso; no afirmar aprobación hasta verificar resultado.
- Riesgo pendiente de revisión: verificar concurrencia/reintentos de escritura de filas, compatibilidad de resultados/operación global con el organizador, comportamiento de inventario parcial y assertions ejecutadas.
