# Matriz de capacidades por rol — GPSpedia

**Estado:** política estática consolidada para `GPSpedia2.2.5_work`  
**Fuente normativa:** `NORMAS_DESAROLLO.md`  
**Revisión:** 2026-11-14

La autorización backend prevalece sobre la visibilidad de controles. Los nombres canónicos son `Desarrollador`, `Jefe`, `Supervisor`, `Tecnico` y `Tecnico_exterior`; `Gefe` no es válido.

## Matriz resumida

| Capacidad | Desarrollador | Jefe | Supervisor | Técnico | Técnico exterior |
|---|---:|---:|---:|---:|---:|
| Consultar catálogo público | Sí | Sí | Sí | Sí | Sí |
| Compartir ficha con compartir integrado | Sí | Sí | Sí | Sí | Sí |
| Imprimir ficha técnica | Sí | Sí | Sí | No | No |
| Editar detalles del modal de vehículo | Sí | Sí | Sí | No | No |
| Cargar/reemplazar imágenes desde el modal | Sí | Sí | Sí | No | No |
| Consultar estado de carga del modal | Sí | Sí | Sí | No | No |
| Herramientas ADMIN y gestor de imágenes | Sí | No | No | No | No |
| Descargar imagen del historial ADMIN | Sí | No | No | No | No |
| Mantenimiento de IDs de Cortes | Sí | No | No | No | No |
| Operaciones normales WRITE sobre Cortes | Sí | Sí | Sí | Sí | Sí |
| Agregar información suplementaria WRITE | Sí | Sí | Sí | Sí | Sí |
| Aportar problemas, soluciones, prevención y sugerencias | Sí | Sí | Sí | Sí | Sí |
| Moderar Feedback, resolver y aprobar/rechazar vídeos | Sí | Sí | Sí | No | No |
| Editar/eliminar PyS o tutoriales; borrar logs de actividad | Sí | No | No | No | No |
| Acceder a Inbox | Sí | Sí | Sí | Sí | Sí |
| Iniciar conversación directa con cualquier usuario activo | Sí | No | No | No | No |
| Enviar consulta dirigida a Desarrollador | Sí | Sí | Sí | Sí | Sí |
| Administrar cuentas de usuarios | Sí | Sí (Supervisor/Técnico) | Sí (Técnico) | No | No |

## Contratos por servicio

### AUTH y USERS
- La lectura/administración de usuarios está limitada a Desarrollador, Jefe y Supervisor; los resultados se filtran por jerarquía.
- Desarrollador administra todos los roles; Jefe administra Supervisor y Técnico; Supervisor administra Técnico.
- Solo Desarrollador puede completar la limpieza de una cuenta ya desactivada. No se puede degradar ni eliminar la última cuenta activa Desarrollador.
- El backend deriva identidad y rol de la sesión verificada; no confía en el rol enviado por el cliente.

### WRITE
- Las operaciones ordinarias validan sesión y aceptan los cinco roles activos.
- La información suplementaria declara explícitamente los cinco roles permitidos.
- El mantenimiento de IDs de Cortes requiere Desarrollador, además de sesión válida.

### FEEDBACK y PyS
- Aportaciones ordinarias (likes, reportes, problemas, soluciones, prevención, asociaciones de vehículos y sugerencias) aceptan cualquier rol activo.
- Consulta/moderación de Feedback, respuesta, resolución, eliminación de elementos y aprobación/rechazo de vídeo se limita a Desarrollador, Jefe y Supervisor.
- Alta/edición de tutoriales, edición PyS, retirada de asociaciones PyS y limpieza de logs se limita a Desarrollador.
- `getPysData` y `sendContactForm` son rutas públicas declaradas; no deben confundirse con mutaciones autenticadas.

### ADMIN e imágenes
- Todas las acciones ADMIN requieren sesión vigente de Desarrollador, excepto exactamente `updateVehicleField`, `uploadAdminImage` y `getAdminImageUploadStatus`, permitidas también a Jefe y Supervisor.
- Consulta del historial, recuperación, movimiento, restauración, papelera, eliminación definitiva, marcar en uso, inventario/auditoría Drive y descarga permanecen exclusivas de Desarrollador.
- Las imágenes de catálogo entregadas al navegador siguen siendo recuperables por quienes pueden visualizarlas. La fricción de menú contextual/copia/arrastre no es un control de acceso.
- El ping ADMIN es comprobación de salud y no concede capacidades de datos.

### Inbox
- Los cinco roles activos pueden consultar y usar Inbox.
- Desarrollador puede iniciar conversaciones directas con cualquier otro usuario activo.
- Técnico y Técnico exterior solo pueden iniciar mensajes ordinarios a un Supervisor.
- Supervisor solo puede iniciar mensajes ordinarios a un Jefe.
- Jefe puede iniciar mensajes ordinarios a Supervisor, Técnico y Técnico exterior.
- Ningún rol no Desarrollador puede iniciar una conversación ordinaria con Desarrollador; los reportes/tickets de problema son el canal para contactarlo.
- El backend aplica la misma matriz al listar destinatarios y al crear conversaciones; la visibilidad de la interfaz no sustituye esta validación.
- Las conversaciones son de texto; no se habilitan adjuntos no soportados por el servicio.

### Interfaz y límites
- La interfaz muestra compartir a todos; imprime/edita ficha solo para Desarrollador, Jefe y Supervisor.
- Las herramientas Developer se ocultan a otros roles, pero esa visibilidad no sustituye las comprobaciones backend.
- El benchmark PBKDF2 está restringido a Desarrollador y es de solo lectura.
- La matriz no declara privadas las URLs públicas/recuperables de Drive. ACL reales y llamadas HTTP contra deployments se verifican en Beta.

## Pruebas automatizadas relacionadas

`JS/Tests/VehicleModalRolePolicy.mjs` verifica la matriz del modal, las excepciones ADMIN, las acciones de imágenes Developer-only, jerarquía AUTH/USERS, permisos FEEDBACK/WRITE/Inbox y benchmark KDF. Son pruebas de contrato/código local; no sustituyen llamadas HTTP contra un deployment Beta.

## Referencias de implementación

- `Services/admin.js`: `getAdminSessionContext_`, `assertDeveloperSession`, `assertModalEditSession`, `ADMIN_MODAL_EDIT_ACTIONS`, `doPostInternal_`.
- `Services/Auth.js`: políticas de modificación/eliminación de usuarios y protección de la última cuenta Desarrollador.
- `Services/users.js`: `handleGetUsers`, `handleCreateUser` y jerarquía de administración.
- `Services/write.js`: `getAuthenticatedCollaborator`, `SUPPLEMENTARY_INFO_ALLOWED_ROLES_`, `assertDeveloperForIdMaintenance`.
- `Services/feedback.js`: `FEEDBACK_ACTION_PERMISSIONS` y `authorizeFeedbackAction_`.
- `Services/InboxConversations.js`: `INBOX_ACTIVE_ROLES_`, `handleGetInboxRecipients`, `handleCreateInboxConversation`.
- `JS/Frontend/ui.js` y `JS/Frontend/api-config.js`: visibilidad y controles del cliente.

