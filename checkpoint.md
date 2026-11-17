undefined

### Cierre verificado — GP-INBOX-CACHE-BANDS-01 — 2026-11-17
- Commits: b3749410b0cf2876bcc1cbd7450f77dfc637835c y 1c50922170308843581f9ba55c72bdee7a6e73a9.
- GitHub Actions run 44079875552 SUCCESS: 133 suites, 1,986 pruebas, 0 fallos; InboxUi 80/80; InboxConversations 61/61; caché 5/5; paginación 4/4; contratos UI 10/10. Pages run 44079874261 SUCCESS.
- Caché aislada por userId/rol/token, filtros, cursor y pageSize; TTL 60 s, límites LRU; cache-first para datos frescos; refresh en segundo plano y forzado; invalidación de mutaciones y limpieza al cambiar sesión.
- Estado: COMPLETADA CON VALIDACIÓN DIFERIDA. Pendiente deployment FEEDBACK Beta y pruebas reales de rol, filtros, vencimiento, mutaciones, mensajes nuevos, cambio de cuenta y offline. Los comandos de sincronización segura y el plan de prueba quedaron registrados al inicio del bloque Beta en Tareas_Pendientes.md.
- Rama base GPSpedia2.2.5 continúa en d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Siguiente tarea P2: GP-DEV-CUT-AUDIT-TOOLBAR-01 — reorganizar las acciones del panel de auditoría de Cortes del modal Developer.
