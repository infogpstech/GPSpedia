undefined

### Continuidad — GP-INBOX-CACHE-BANDS-01 — auditoría e implementación 2026-11-17
- HEAD previo: 249ef0bfbcd2fe8fb3282edd82a2ad1af002b44c; rama autorizada GPSpedia2.2.5_work; base sin cambios d9acc68d889985c2e2f42fe3a02e502efc86ead1.
- Se consultaron NORMAS_DESAROLLO.md completo, README.md (arquitectura Inbox), contexto_personal.md, checkpoint y requisito activo en Tareas_Pendientes.md.
- Hallazgos: caché de solicitudes históricas no particionaba explícitamente por sección y excluía tickets propios; listas de conversaciones consultaban red aun con caché fresca al cambiar filtros; historial de mensajes guardaba Map por conversationId y volvía a consultar al seleccionar, aunque hubiera contenido fresco. Las mutaciones de conversación no invalidaban consistentemente sus páginas.
- Implementación preparada en blobs GitHub: inboxPageCache.js amplía claves con filterKey; ui.js cachea Reportes/Aportaciones/tickets propios, páginas de conversación y páginas de mensajes con TTL 60s, LRU acotado, identidad completa y filtros/cursor; conserva contenido durante refresh y fuerza sondeo/manual/online. InboxConversations.js expone lastMessageId para validar la frescura del hilo.
- Tests preparados: InboxCachePagination.js, InboxUi.mjs e InboxConversations.mjs. Pendiente publicar el conjunto, ejecutar pruebas Node/CI, corregir regresiones y registrar el SHA final.
