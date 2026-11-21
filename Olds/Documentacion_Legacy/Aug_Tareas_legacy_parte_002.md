- AUG-005 conserva la adenda AUD-T-024 sobre autodeleción y revocación; AUG-006 mantiene logout remoto; AUG-007 sigue pendiente de decisión de política; AUG-008 conserva sus adendas de coordinación y respuestas obsoletas; AUG-009 requiere validación backend del nombre; AUG-010 conserva su dependencia con AUD-T-033 y la coordinación AUTH/USERS.
- Los riesgos de concurrencia y consistencia de sesiones se relacionan con AUG-016; hashing y migración de credenciales se mantienen en AUD-T-023/AUG-011 a AUG-014, sin trasladar ni duplicar su alcance.
- No se detectaron nuevos hallazgos que justifiquen una AUG adicional. Pruebas funcionales y verificación de deployments permanecen pendientes.


### Adenda AUD-T-016 a AUG-103 — contraste medible de botones y texto fijo
- **Nueva evidencia:** style.css:50/68/1298–1320 aplica texto blanco sobre --accent-color (#007bff claro; #58a6ff oscuro); users.html:11/16/22/117 aplica texto blanco sobre --primary-color; add_cortes.html:83 usa blanco sobre #007bff y :50 usa #888 sobre fondo de tarjeta blanco.
- **Contraste calculado con colores sólidos:** blanco/#007bff = 3.98:1; blanco/#58a6ff = 2.53:1; #888/#fff = 3.54:1. Son valores estáticos, no mediciones de estilos computados en navegador.
- **Ampliación:** definir combinaciones de texto/fondo que cumplan 4.5:1 para texto normal y 3:1 para texto grande/elementos gráficos aplicables; revisar estados hover, focus y disabled en index.html, users.html y add_cortes.html.
- **Pruebas:** incorporar los pares y estados a VAL-25, con medición de estilos computados en ambos temas.
- **Estado:** EXISTENTE; ampliada; diseño, implementación y validación pendientes. No crear AUG adicional.


### Adenda AUD-T-039 a AUG-001 — criterios verificables de protección y revisión
- **Nueva evidencia:** la API de GPSpedia2.2.5 devuelve protected=false, protection.enabled=false y required_status_checks off/sin contexts. GET /rulesets?includes_parents=true devuelve []. La rama de trabajo también está sin protección. La rama predeterminada es main y GPSpedia2.2.5 requiere una coincidencia explícita.
- **Ampliación:** aplicar la regla al nombre exacto GPSpedia2.2.5; exigir PR; definir aprobaciones y revisores autorizados; descartar aprobaciones obsoletas tras nuevos commits; exigir resolución de conversaciones; bloquear force-push y eliminación; definir bypass de emergencia y método de merge/historial lineal.
- **CI:** el árbol actual no contiene .github/workflows y no hay checks de estado. No exigir nombres de checks inexistentes; decidir primero si se incorpora CI y después fijar checks reales.
- **Alcance relacionado:** decidir si GPSpedia2.2.5_work también requiere protección, sin cambiar el criterio de que los commits ordinarios se realizan en la rama de trabajo autorizada.
- **Validación:** VAL-33 debe comprobar la regla activa desde una cuenta administrativa, PR de prueba, aprobaciones, conversaciones, bypass, force-push, borrado y checks disponibles.
- **Estado:** EXISTENTE; ampliada por AUD-T-039. No crear otra AUG para la misma tarea. Configuración administrativa pendiente.



### AUG-152 — Rediseñar Inbox como centro de conversaciones bidireccionales y notificaciones
- **Origen:** solicitud de producto 2026-11-09; complementa AUD-T-010/AUD-T-018. **Prioridad:** Alta.
- **Problema:** Inbox administra feedback y respuestas ligadas a un item, pero no permite iniciar un mensaje nuevo dirigido a un usuario ni mantiene conversaciones bidireccionales multi-mensaje. El modal requiere scroll interno estable en escritorio y móvil.
- **Criterios:** (1) altura máxima del viewport dinámico, encabezado estable y scroll independiente lista/detalle; móvil lista/detalle de una columna, sin scroll del fondo ni overflow horizontal; (2) preservar selección y scroll tras actualizar/enviar/volver; (3) «Nuevo mensaje» del Desarrollador con destinatario USERS, asunto, categoría, cuerpo y plantillas editables de bienvenida; individual, sin broadcast por defecto; (4) «Consultar al desarrollador» para que el usuario inicie y responda un hilo; (5) Conversation/Message con IDs estables, participantes, autor, asunto, cuerpo, categoría, fechas, lectura, archivo, estado e idempotencyKey; (6) separar mensajes directos de Feedback y preservar históricos con migración/backups/rollback; (7) Recibidos, No leídos, Enviados, Archivados, contadores, búsqueda, paginación y lectura; (8) notificaciones internas y sincronización acotada; (9) sesión/rol/participantes validados en backend; límites, idempotencia y rate limit; (10) renderizado seguro y auditoría inmutable; (11) estados loading/empty/error/offline/sending/sent y borrador recuperable; (12) accesibilidad de diálogo, foco, teclado, lector, contraste, temas y responsive; (13) compatibilidad con reportes/sugerencias/vídeos y rechazo de tipos no soportados.
- **Dependencias sin duplicación:** AUG-075–081, AUG-113–121, AUG-147–149, AUG-040/AUG-043. No sustituyen ni cierran estas tareas.
- **Archivos potenciales:** index.html, ui.js, main.js, style.css, api-config.js, auth.js/state.js, users.html, Services/feedback.js, Services/users.js, esquema y pruebas aisladas.
- **Validación:** VAL-34 — roles/participantes, bienvenida, consulta, respuesta multi-turno, lectura, archivo, búsqueda/paginación, idempotencia, timeout, XSS, sesión revocada, responsive/scroll, teclado/foco, offline y compatibilidad. Solo entornos aislados.
- **Estado:** NUEVA; análisis, diseño, implementación y pruebas pendientes.
