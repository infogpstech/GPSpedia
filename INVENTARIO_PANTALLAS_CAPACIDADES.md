# Inventario de pantallas y capacidades visibles — MIG-002

**Repositorio:** infogpstech/GPSpedia  
**Rama de trabajo:** GPSpedia2.2.5_work  
**Rama base protegida:** GPSpedia2.2.5  
**Fecha de corte:** 2026-11-23  
**Estado:** COMPLETADA CON VALIDACIÓN DIFERIDA  
**Tarea:** MIG-002 — Inventario de pantallas y capacidades visibles

## 1. Alcance y método

Se inspeccionó el árbol completo de la rama (615 rutas; árbol no truncado) y se recorrieron las superficies activas del navegador, sus módulos, los controles estáticos y las plantillas DOM generadas desde JavaScript. Se contrastaron los controles con los listeners/funciones cliente, las acciones del router frontend, las acciones/handlers documentados en MATRIZ_MIGRACION_SERVICIOS.md y las suites existentes de JS/Tests.

Fuentes de interfaz incluidas:

- index.html: App Shell, navegación, autenticación, catálogo, Inbox, Dashboard, Developer Tools, biblioteca/auditoría Drive, términos y modales informativos.
- HTML/add_cortes.html: alta de vehículo/corte en tres etapas y recuperación de operaciones.
- HTML/users.html: perfil y administración de usuarios.
- JS/Frontend/ui.js: renderizado del catálogo, ficha de vehículo y modales/controles creados dinámicamente.
- JS/Frontend/main.js, auth.js, navigation.js y api-config.js: arranque, navegación, autenticación, enrutamiento y estados.
- JS/Frontend/youtubeUpload.js: carga reanudable de vídeo.
- Módulos de soporte: VinDifferentialEngine, activityDashboard, catalogRequest, catalogStatus, clientInteractionPolicy, developerConsoleConfirmation, diagnosticLogger, driveStorageAlerts, editBackupStore, imageObjectUrlCache, inboxPageCache, lightbox, likeState, modalNavigation, navigationHistory, offline, overlayHistory, pendingOperationStore, printQr, pys-data, qrcode-generator, rich-text, search-utils, serviceTelemetry, share-utils, state, termsDeviceAcceptance, thumbnailCompressionQueue, validationBannerLifecycle, validationSubmission y los demás módulos frontend versionados.
- style.css, button-system.css y contextual-help.css.

### 1.1 Recuento de superficies y declaraciones

| Fuente | Declaraciones de controles, enlaces y formularios | IDs DOM literales |
|---|---:|---:|
| index.html | 170 | 278 |
| HTML/add_cortes.html | 42 | 61 |
| HTML/users.html | 22 | 29 |
| JS/Frontend/ui.js (plantillas dinámicas) | 93 | 138 |
| JS/Frontend/youtubeUpload.js (plantilla dinámica) | 8 | 16 |
| **Total de declaraciones inspeccionadas** | **335** | — |

Los recuentos incluyen formularios, enlaces, botones, campos y selectores. No representan 335 acciones de negocio únicas: existen formularios con varios campos, botones sin ID propio, controles generados por delegación y elementos que se repiten según el registro seleccionado. Los IDs DOM incluyen también contenedores y regiones de estado, no solo controles accionables.

El repositorio contiene tres documentos HTML activos, 37 módulos JS/MJS frontend, tres hojas CSS activas y 370 archivos JS/MJS de pruebas bajo JS/Tests. Las copias bajo Olds/ son históricas y no se consideran pantallas activas.

## 2. Mapa de pantallas y superficies

| ID | Pantalla/superficie | Entrada y componentes | Capacidades visibles |
|---|---|---|---|
| UI-01 | App Shell y navegación | index.html, main.js, ui.js | menú lateral, navegación por secciones, tema, instalación PWA, sesión, footer, historial y overlays |
| UI-02 | Login y recuperación | login-modal, auth.js | inicio/cierre de sesión, recuperación por correo/código, restablecimiento de contraseña y mensajes de validación |
| UI-03 | Catálogo y búsqueda | contenido, navigation.js, search-utils.js, catalogRequest.js | categorías, marcas, modelos, tipos de encendido, versiones, años, búsqueda global y resultados vacíos |
| UI-04 | Ficha de vehículo/corte | modalDetalle, detalleCompleto, ui.js | información técnica, cortes, imágenes, VIN, versiones, validación de años, likes, vistas, compartir, reportar, sugerir cambios y navegación relacionada |
| UI-05 | Alta de vehículo/corte | HTML/add_cortes.html | verificación de vehículo, selección/creación, cortes, VIN, imágenes, segundo corte, información suplementaria y vídeo |
| UI-06 | Tutoriales | contenido-tutoriales, ui.js | listado, detalle, reproducción de vídeo, alta/edición y asociación de contenido |
| UI-07 | Configuración Relay | contenido-relay, ui.js | consulta de configuraciones Relay y navegación contextual desde fichas/formularios |
| UI-08 | Problemas y Soluciones (PyS) | contenido-pys, pys-data.js, ui.js | búsqueda, creación, detalle, edición, soluciones, prevención, vídeos y asociación bidireccional de vehículos |
| UI-09 | Inbox | inbox-modal, ui.js, inboxPageCache.js | secciones por rol, categorías, carpetas, conversaciones, mensajes, búsqueda, paginación, borradores, respuestas y solicitudes históricas |
| UI-10 | Dashboard | dashboard-modal, activityDashboard.js | resumen/indicadores, aportes y actividad reciente |
| UI-11 | Developer Tools | dev-tools-modal, ui.js | consola, comandos Drive, salud de servicios, tráfico, backups, restauración, migraciones, logs, imágenes, logos y configuración funcional |
| UI-12 | Biblioteca de imágenes reemplazadas | replaced-images-modal | búsqueda/filtro, carpetas, vista grid/list, selección múltiple, mover, restaurar, papelera y vista ampliada |
| UI-13 | Auditoría Drive/Cortes | audit-drive-modal | escaneo/reanudación, inventario, conciliación, previsualización, aplicación, rollback e historial |
| UI-14 | Perfil y usuarios | HTML/users.html | ver/editar perfil, cambio de contraseña, gestión de cuentas, roles, sesiones y eliminación |
| UI-15 | Carga de vídeo | youtubeUpload.js | selección de archivo, metadatos, carga reanudable, progreso, pausa/cierre, reanudación y descarte |
| UI-16 | Legales e información | términos, acuerdo, Sobre Nosotros, Contacto, FAQ, changelog e instalación iOS | lectura, aceptación, formulario de contacto, cierre y ayuda informativa |
| UI-17 | Visores y editores transversales | lightbox.js, rich-text.js, modalNavigation.js, overlayHistory.js | zoom/gestos, edición enriquecida, ayuda contextual, cierre por historial y restauración del foco |

## 3. Inventario de controles por superficie

Los IDs siguientes son identificadores del código versionado. Los controles que no tienen ID único están identificados por su etiqueta accesible o por su clase/rol compartido (por ejemplo, botones de cierre y ayuda contextual). Los botones/filas que se crean por registro se identifican además por su data-* y por el handler delegado.

### UI-01 / UI-02 — App Shell, navegación, sesión y recuperación

**Navegación y menú:** menu-cortes, menu-tutoriales, menu-relay, inbox-btn, dashboard-btn, dev-tools-btn, dark-mode-toggle, side-menu-changelog-link, side-menu-logout-button, hamburger-btn, install-button, logout-button.

**Autenticación y recuperación:** login-form, username, password, forgot-password-link, password-recovery-panel, password-recovery-request-form, password-recovery-username, password-recovery-email, password-recovery-complete-form, password-recovery-complete-username, password-recovery-complete-email, password-recovery-code, password-recovery-new-password, password-recovery-confirm-password, password-recovery-back, login-error, password-recovery-status.

**Enlaces informativos desde login/footer:** login-about-link, login-contact-link, login-faq-link, login-terms-link, footer-about-link, footer-contact-link, footer-faq-link, footer-terms-link, side-menu-changelog-link.

**Comportamiento:** main.initializeApp registra listeners globales y expone módulos de compatibilidad; auth.js mantiene login, validación de sesión, logout, recuperación y carga inicial; ui.js abre/cierra menú y secciones. La navegación por overlays respeta el orden de capas e historial. El modo oscuro y la instalación PWA son controles locales del navegador; no son acciones de backend.

**Acciones:** login, validateSession, logout, requestPasswordRecovery, completePasswordRecovery, acceptTerms; lectura de catálogo mediante getCatalogData y navegación mediante getNavigationData. El rol/identidad se obtiene de la sesión validada; los elementos ocultos en UI no sustituyen RBAC backend.

### UI-03 / UI-04 — Catálogo, búsqueda y ficha de vehículo

**Búsqueda y secciones:** searchInput, clear-search-btn, btn-cortes, btn-tutoriales, btn-relay, btn-pys, contenido, contenido-tutoriales, contenido-relay, contenido-pys, connection-status, connection-status-label, footer-sentinel.

**Ficha y navegación:** modalDetalle, detalleCompleto, validation-banner, modal-saving-indicator, modal-detalle-title, share-manual-link, posibles-problemas-wrapper y contenedores de carrusel/relaciones generados por ui.js. Los botones de carrusel y navegación entre versiones se generan según el número de elementos.

**Visor principal:** lightbox, lightboxImg, lightboxPrevBtn, lightboxNextBtn; lightbox.js gestiona apertura/cierre, navegación, gestos táctiles y zoom.

**Controles de detalle generados dinámicamente:**
- Reporte: report-cut-modal, report-cut-form, rep-error, rep-testigo-motor, rep-incorrecto, rep-img-file, botón submit «Enviar Reporte», report-success-modal, btn-close-report-success.
- Sugerencia de cambio: suggest-cut-modal, suggest-cut-form, sug-tipo, sug-relay, sug-ubicacion, sug-color, sug-check-engine, sug-img-file, sug-detalles, btn-suggest-change-action.
- Menú de ampliación: expand-menu-modal, btn-exp-cut, btn-exp-apertura, btn-exp-feed, btn-exp-video, btn-exp-vin, btn-exp-pys.
- VIN: add-vin-modal, modal-vin-trim, grp-new-trim, modal-new-trim-input, add-vin-form, modal-vin-input, modal-vin-warning, btn-save-vin.
- Edición de tutorial: btn-save-tutorial-edit, edit-tutorial-details-textarea.
- Impresión: print-layout-mode, print-resource-status, print-action, print-pages, adaptive-tech-grid.
- Compartir, like, vista, sugerencia de año y navegación contextual se renderizan dentro de la ficha según permisos y datos disponibles.

**Handlers y acciones:** mostrarCategorias, mostrarMarcas, mostrarModelosPorMarca, mostrarModelos, mostrarTiposEncendido, mostrarVersiones, mostrarVersionesEquipamiento, mostrarResultadosDeBusqueda, mostrarDetalleModal, performSilentSync, updateFullState, renderPosiblesProblemasAccordion y exportVehiclePrintSheet. Acciones relacionadas: getCatalogData, getVehicleProjection, getDropdownData, getNavigationData, recordVehicleView, recordLike, suggestYear, reportProblem, suggestCutChange, checkVinDuplicate y addVinToVehicle. Las funciones de compartir/QR/impresión y la navegación del lightbox se ejecutan localmente.

### UI-05 — Alta de vehículo y cortes (HTML/add_cortes.html)

**Etapa 1 — Verificar vehículo:** form-stage-1, marca, modelo, anoDesde, tipoEncendido, categoria, versionesAplicables, marca-suggestion, modelo-suggestion, help-ano-desde, help-versiones y botón submit «Verificar».

**Etapa 1.5 — Coincidencias:** stage-1-5, matches-container; cada coincidencia puede ofrecer navegación a la ficha, agregar corte, información adicional, corregir datos o crear vehículo nuevo. Los controles se crean según los resultados y usan el ID del vehículo como clave.

**Etapa 2 — Corte principal:** form-stage-2, new-vehicle-fields, imagenVehiculo, imagenVehiculo_preview, tipoCorte1, configRelay1, ubicacionCorte1, ubicacionCorte1-rich-toolbar, testigoMotor, silentRegister, silent-container, colorCableCorte1, imgCorte1, imgCorte1_preview, vinInput, vinDuplicateWarning, btn-back-to-stage1 y botón submit «Continuar».

**Etapa 3 — Información suplementaria:** form-stage-3, supplementary-warnings, apertura-accordion, apertura, apertura-rich-toolbar, imgApertura, imgApertura_preview, alimentacion-accordion, cableAlimen, cableAlimen-rich-toolbar, imgCableAlimen, imgCableAlimen_preview, second-cut-accordion, btn-add-second-cut, video-accordion, btn-addcorte-upload-video, video-upload-status-badge, nota-accordion, notaImportante, notaImportante-rich-toolbar, btn-back-to-stage2 y botón submit «Guardar y Finalizar».

**Controles transversales:** loading-overlay, lightbox, btn-back-to-stage1, btn-back-to-stage2, botones contextuales gp-help-trigger, selectores de archivo y botones generados para sugerencias/coincidencias.

**Handlers y acciones:** handleStage1Submit → checkVehicle; handleSuggestion → getSuggestion; refreshSelectedVehicleMatch → getVehicleProjection; populateAllDropdowns → getDropdownData; checkVinDuplicateOnce_ → checkVinDuplicate; handleStage2Submit → checkOperation y addOrUpdateCut; handleStage3Submit → addSupplementaryInfo; recuperación → checkOperation y repetición idempotente con el mismo operationId. Las operaciones pendientes se guardan localmente antes del POST y se recuperan tras interrupción.

### UI-06 / UI-07 — Tutoriales y Relay

**Tutoriales:** listado en contenido-tutoriales; modal de detalle con texto enriquecido, imágenes y vídeo; alta/edición mediante add-tutorial-modal, add-tutorial-form, tut-tema, tut-como-identificarlo, tut-donde-encontrarlo, tut-desc, tut-video-url, tut-save-btn y tut-upload-video-btn. Edición utiliza btn-save-tutorial-edit y edit-tutorial-details-textarea.

**Relay:** sección contenido-relay y modal de detalle Relay renderizado por ui.js; opciones de Relay también se consumen en los formularios de corte y en los modales de edición.

**Handlers/acciones:** mostrarTutorialesGrid, mostrarDetalleTutorialModal, openAddTutorialModal, renderRelayInfoModal y mostrarDetalleRelayModal; addTutorial, updateTutorialItem, getCatalogData, getDropdownData y flujo de aprobación de vídeo cuando el contenido incorpora vídeo.

### UI-08 — Problemas y Soluciones (PyS)

**Controles:** add-pys-modal, add-pys-form, pys-alcance, pys-models-section, pys-search-vehicle, pys-vehicle-search-results, pys-selected-models-list, pys-titulo, pys-img-file, pys-detalle, pys-sin-solucion, grp-solucion, pys-solucion, pys-prevenir, pys-video-url, pys-upload-video-btn; búsqueda/asociación: pys-add-vehicle-modal, assoc-selected-models-container, assoc-search-input, assoc-search-results, btn-close-assoc, btn-save-assoc, confirm-vehicle-pys-modal, btn-cancel-pys-veh, btn-accept-pys-veh; detalle/edición: modal-pys-detail-title, btn-save-pys-edit, edit-pys-desc-textarea, edit-pys-sol-textarea, edit-pys-prev-textarea, pys-models-carousel-section; asociación de existente: assoc-existing-pys-modal, search-existing-pys-input, btn-create-new-pys-for-vehicle, existing-pys-results-container.

**Handlers/acciones:** renderPysSection, openAddProblemModal, openSearchVehicleForPysAssociationModal, openConfirmVehicleForPysModal, openPysDetailModal, openAssociateExistingProblemModal; addProblem, updatePysItem, addSolution, addPrevention, addVehicleToProblem, removeVehicleFromProblem, getPysData y submitVideoForApproval. El selector de alcance distingue problema general y problema específico; la casilla sin solución controla la disponibilidad del bloque solución.

### UI-09 — Inbox

**Controles estáticos:** inbox-modal, inbox-modal-content, inbox-sidebar-toggle, inbox-modal-title, inbox-notification-count, inbox-conversation-refresh, inbox-view-tabs, inbox-new-message, inbox-workspace, inbox-section-nav, inbox-contributions-section, inbox-conversations-view, inbox-folder-nav, inbox-search-toggle, inbox-conversation-search-form, inbox-conversation-search, inbox-conversation-list, inbox-conversation-detail, inbox-requests-view, inbox-list, inbox-detail, inbox-pagination, inbox-page-previous, inbox-page-label, inbox-page-next, inbox-conversation-status.

**Categorías y carpetas:** data-inbox-section (general, soporte, contact, reports, contributions) y data-inbox-folder (received, sent, archived). La sección de aportaciones y las solicitudes se muestran según rol. Las opciones de administración de solicitudes están sujetas a rol y a las capacidades backend.

**Controles dinámicos de conversación:** inbox-thread-toolbar-actions, inbox-conversation-messages, inbox-recipient-picker-toggle, inbox-recipient-picker-menu, inbox-recipient-option-*, inbox-welcome-template, inbox-new-category, inbox-reply-textarea, inbox-reply-btn, inbox-resolve-btn, inbox-delete-btn, inbox-approve-video-btn, inbox-reject-video-btn, inbox-toolbar-container y botones/menús de archivar, cerrar, leer/no leer y plantillas creados por renderInboxConversationDetail_ / renderInboxReplyForm_.

**Handlers/acciones:** openInbox, bindInboxControls_, loadInboxConversations_, renderInboxConversationList_, selectInboxConversation_, loadInboxMessages_, renderInboxConversationDetail_, renderInboxReplyForm_, openInboxNewConversationForm_, toggleInboxConversationArchive_, closeSelectedInboxConversation_ y refreshInboxConversations_. Acciones: getInboxRecipients, getInboxConversations, getInboxMessages, createInboxConversation, sendInboxMessage, markInboxRead, archiveInboxConversation, closeInboxConversation, replyToFeedback, markAsResolved, deleteFeedbackItem, approveVideo y rejectVideo. Los borradores se guardan localmente por usuario/tipo y la paginación usa inboxPageCache.

### UI-10 — Dashboard

**Controles:** dashboard-modal, dashboard-modal-title, activity-panel-insights, activity-insights, activity-panel-logs, activity-logs, activity-panel-contributions, activity-contributions y botones data-activity-tab (insights, contributions, logs).

**Handlers/acciones:** openDashboard; renderActivityInsights, renderActivityLogs y renderActivityContributions; getActivityLogs, getFeedbackItems y lecturas de actividad/aportes. El dashboard no convierte la telemetría agregada de Coordinator en conteo total de peticiones directas: conserva el indicador de disponibilidad de tráfico directo cuando aplica.

### UI-11 — Developer Tools

**Consola y diagnóstico:** dev-tools-modal, dev-tools-title, dev-help-console, btn-copy-console-log, dev-console-log, dev-terminal-input, btn-terminal-send, dev-progress-container, dev-progress-bar, dev-progress-text, dev-tab-diagnostics, dev-tab-database, dev-tab-images, dev-tab-system, dev-panel-diagnostics, services-health-grid, service-health-detail, dev-help-global-traffic, btn-check-services-health, btn-refresh-global-service-traffic, global-service-traffic-chart.

**Base de datos, backups y migraciones:** dev-panel-database, backup-management-panel, backup-resource-input, backup-resource-hint, btn-admin-backup-db, btn-admin-backup-drive, btn-admin-resume-drive-backup, btn-admin-restore-db, btn-admin-restore-drive, btn-copy-backup-resource-link, btn-open-backup-resource-link, btn-admin-preview-vin-migration, btn-admin-confirm-vin-migration, vin-migration-status, btn-admin-audit-identifiers, btn-admin-preview-id-freeze, btn-admin-confirm-id-freeze, identifier-audit-status, identifier-audit-results, btn-admin-preview-password-migration, btn-admin-confirm-password-migration, password-migration-status, recalculate-vin-signatures-checkbox, diagnose-vin-signatures-checkbox, btn-admin-run-vin-actions, vin-actions-progress, vin-recalculate-status, vin-diagnostic-status, btn-admin-reorganize-db, clear-activity-logs-checkbox, clear-logs-option-select, clear-sensitive-logs-checkbox, btn-admin-clear-selected-logs, clear-selected-logs-status, btn-admin-add-silent-cut.

**Imágenes, Drive y aportaciones:** dev-panel-images, drive-storage-monitor-status, drive-storage-used, drive-storage-account-used, drive-storage-limit, drive-storage-remaining, drive-storage-percent, btn-admin-refresh-drive-storage, btn-admin-normalize-images, btn-admin-organize-primary-images, btn-admin-restore-trash, logo-brand-name-input, logo-file-input, selected-logo-file-name, btn-admin-register-logo, vehicle-contribution-review-card, btn-admin-refresh-contribution-candidates, admin-contribution-review-status, admin-contribution-candidates, btn-admin-view-replaced-images, btn-admin-audit-drive-images.

**Sistema:** dev-panel-system, rich-text-mode-select, rich-text-mode-status, btn-admin-clear-client-cache. Ayudas contextuales: dev-help-vin-migration, dev-help-id-audit, dev-help-password-migration, dev-help-vin-signatures, dev-help-drive-quota, dev-help-image-actions, dev-help-logo, dev-help-rich-text y botones gp-help-trigger.

**Handlers/acciones:** openDevTools, initAdminPanelListeners, executeTerminalCommand, runServicesHealthScan, renderServiceCards, renderServiceDetail, renderServiceDashboard y loadGlobalServiceTraffic_. Acciones visibles incluyen ping, getServiceTraffic, driveCommand, backupDatabase, backupDrive, restoreDatabase, restoreDrive, migrateCortesOperationIds, migrateIdentifiers, rollbackIdentifiers, auditIdentifiers, freezeIdentifierFormulas, migrateVehicleContributionsSchema, migrateReplacedImagesSchema, clearActivityLogs, clearSensitiveLogs, getDriveStorage, normalizeImages, organizePrimaryVehicleImages, restoreAllTrashedImages, addLogo, getVehicleContributionCandidates, resolveVehicleContributionCandidate y setRichTextMode. ADMIN mantiene el RBAC backend; ping es la comprobación de salud pública prevista.

### UI-12 — Biblioteca de imágenes reemplazadas

**Controles:** replaced-images-modal, close-replaced-images-modal, filter-replaced-images-input, btn-refresh-replaced-images, btn-replaced-folders-toggle, btn-replaced-view-grid, btn-replaced-view-list, replaced-images-selection-toolbar, replaced-images-select-all, replaced-images-selection-count, btn-replaced-bulk-move, btn-replaced-bulk-restore, btn-replaced-bulk-trash, btn-replaced-clear-selection, replaced-images-folder-toolbar, replaced-images-target-folder, replaced-images-new-folder-name, btn-create-replaced-images-folder, replaced-images-folder-status, replaced-images-list-container, replaced-image-lightbox, replaced-image-lightbox-content, replaced-image-lightbox-close, replaced-image-lightbox-image, replaced-image-lightbox-title.

**Handlers/acciones:** openReplacedImagesModal; getCortesImageFolders, getReplacedImages, getReplacedImageDownloadUrl, moveReplacedImage, recoverReplacedImage, restoreReplacedImageFromTrash, deleteReplacedImage, permanentlyDeleteReplacedImage, markReplacedImageInUse, createCortesImageFolder y migrateReplacedImagesSchema. Las operaciones masivas dependen de selección, estado de archivo y permiso; la vista ampliada es un overlay separado.

### UI-13 — Auditoría Drive/Cortes

**Controles:** audit-drive-modal, close-audit-drive-modal, audit-drive-results-scope, audit-drive-toolbar, btn-audit-drive-toolbar-toggle, audit-drive-toolbar-actions, btn-audit-drive-start, btn-audit-drive-resume, btn-audit-drive-organize, btn-audit-drive-save-inventory, btn-audit-drive-reconcile, btn-audit-drive-organizer-preview, audit-drive-summary, audit-drive-results-container, audit-drive-reconciliation-panel, audit-drive-reconciliation-status, audit-drive-reconciliation-counts, audit-drive-reconciliation-results, btn-audit-drive-apply-reconciliation, audit-drive-organizer-panel, audit-drive-organizer-status, audit-drive-organizer-counts, audit-drive-organizer-results, audit-drive-model-association-panel, audit-drive-model-association-summary, audit-drive-model-association-results, btn-audit-drive-apply-organizer, btn-audit-drive-rollback-organizer, btn-audit-drive-organizer-history, audit-drive-organizer-history.

**Handlers/acciones:** openAuditDriveModal; auditDriveImagesInCortes, saveUnusedImagesInventory, previewCortesImageReconciliation, applyCortesImageReconciliation, previewCortesImageOrganizer, getCortesImageOrganizerOperations, applyCortesImageOrganizer, rollbackCortesImageOrganizer y backupDatabase. Los controles de aplicar/rollback requieren previsualización, selección y confirmación; el historial permite revisar operaciones anteriores.

### UI-14 — Perfil y gestión de usuarios

**Controles:** profile-section, profile-username, profile-fullname, edit-name-btn, profile-role, change-password-btn, user-management-section, create-user-btn, user-list-tbody, user-modal, user-modal-title, user-form, user-id, fullname, username-modal, role, user-password-group, user-password, name-modal, name-modal-title, name-form, new-fullname, password-modal, password-modal-title, password-form, current-password, new-password y confirm-password.

**Handlers/acciones:** displayProfile, fetchUsers, renderUserTable, openUserModal, handleUserFormSubmit, deleteUser, resetUserSessions, handleChangePasswordSubmit y handleEditNameSubmit. Acciones: getUsers, createUser, updateUser, deleteUser, updateProfile, changePassword, resetUserPassword, resetUserSessions, validateSession y logout. La disponibilidad de gestión se restringe por rol; el servidor vuelve a validar el permiso y no confía en el rol enviado desde el navegador.

### UI-15 — Carga de vídeo reanudable

**Controles:** youtube-upload-modal, yt-modal-close-btn, yt-upload-modal-title, yt-upload-form, yt-video-file, yt-file-info, yt-resume-note, yt-discard-upload-btn, yt-video-title, yt-video-desc, yt-upload-progress-container, yt-progress-status, yt-progress-percent, yt-progress-bar, yt-cancel-btn y yt-submit-btn.

**Handlers/acciones:** openYouTubeUploadModal, uploadYouTubeFileResumable_ y persistencia IndexedDB. Acciones: getVideoApprovalByOperation, initYouTubeUpload y submitVideoForApproval; posteriormente approveVideo/rejectVideo en Inbox. Cerrar durante transferencia pausa y conserva el checkpoint; cancelar interrumpe la transferencia en curso según el flujo; descartar elimina explícitamente la sesión local incompleta. La URL resumable y OAuth no se exponen fuera del flujo previsto.

### UI-16 / UI-17 — Legales, información y controles transversales

**Términos:** terms-modal, terms-modal-title, terms-modal-description, terms-link-in-modal, terms-error, btn-accept-terms, terms-agreement-modal, terms-agreement-title y terms-agreement-description.

**Información:** about-us-modal, about-us-title, contact-modal, contact-modal-title, contact-form, contact-name, contact-email, contact-message-toolbar, contact-message, faq-modal, faq-modal-title, changelog-modal, changelog-modal-title, ios-install-modal, ios-install-close, ios-install-title e ios-install-btn-ok.

**Controles transversales:** botones .info-close-btn, .close-btn, .gp-help-trigger, .rich-editor-toolbar, controles de zoom/gestos del lightbox, botones de carrusel, links compartidos y elementos de navegación generados. Los formularios enriquecidos se sincronizan con rich-text.js y sus fuentes textarea; la sanitización se aplica al contenido antes de persistir/renderizar.

**Acciones:** acceptTerms, sendContactForm y las funciones locales de modal/ayuda/editor. Sobre Nosotros, FAQ y changelog son superficies informativas; no realizan escrituras de negocio.

## 4. Estados y ciclos de vida

| Flujo | Carga/progreso | Vacío/no disponible | Éxito | Error/reintento | Cancelación/pausa/recuperación |
|---|---|---|---|---|---|
| Arranque/catálogo | splash, carga de snapshot y sincronización silenciosa | catálogo vacío o búsqueda sin resultados | catálogo renderizado, delta aplicado y ficha actualizada | banner de estado del catálogo y retry; fallback local/offline | cancelación de carga/polling y rehidratación desde IndexedDB |
| Login/recuperación | submit bloqueado mientras procesa | usuario/código no válido o estado no disponible | sesión creada/contraseña actualizada | error visible sin revelar si existe la cuenta en recuperación | volver a login; invalidación/reautenticación |
| Alta de cortes | loading-overlay, botón en progreso y etapa actual | coincidencias vacías, opciones oficiales no disponibles | vehículo/corte confirmado y proyección actualizada | validación de campos, MIME/tamaño, VIN duplicado y errores de servidor | operación durable, checkOperation, mismo operationId y recuperación tras respuesta perdida |
| Edición de ficha | indicador modal-saving-indicator y backup local de edición | dropdowns no disponibles | read-back y refresh de catálogo | restauración de valor anterior y mensaje de error | descartar solo después de resolver operaciones de imagen pendientes |
| Inbox | estados de carga de lista/mensajes, contador y paginación | lista vacía, sin mensajes o sin resultados de búsqueda | conversación/mensaje confirmado y badge actualizado | estado de error, conserva borrador y permite refrescar | borrador recuperable; sincronización al volver online; archivado/cierre por participante |
| Dashboard | «Preparando indicadores…» y carga de paneles | sin actividad/aportes | paneles renderizados | error de lectura mostrado en panel correspondiente | reabrir/actualizar panel |
| Diagnóstico Developer | escaneo y actualización de métricas | sin diagnóstico: instrucción de escanear; detalle sin servicio seleccionado | tarjetas con estado, latencia y métricas disponibles | estado Con error/Desconocido y aviso de tráfico no disponible | nuevo escaneo/refresh |
| Backup/restore/migraciones | barra y texto de progreso, botones ocupados y estado por operación | sin recurso/enlace válido o sin backup disponible | backup/manifest/read-back o lote aplicado | respuesta de error y conservación del estado reanudable | continuar backup; preview antes de confirmar; rollback donde el flujo lo soporta |
| Biblioteca/auditoría Drive | carga de carpetas, archivos, auditoría y operaciones | lista vacía o sin resultados | selección, movimiento, restauración, inventario o aplicación confirmada | estado de error y reintento | escaneo reanudable; preview/apply/rollback e historial |
| YouTube | barra/porcentaje/estado por bloque | no hay archivo seleccionado | carga completada y enviada a aprobación | error de transferencia, sesión expirada o falta de confirmación final | cerrar pausa y conserva; reabrir consulta offset; cancelar aborta XHR; descartar limpia operación local |
| Usuarios | carga de lista y botones deshabilitados mientras muta | sin usuarios/tabla vacía | perfil/usuario actualizado | mensaje de error y restauración de controles | cerrar modal; logout/revocación en flujos de eliminación/cambio sensible |
| Impresión | estado de recursos y botón inicialmente deshabilitado | recursos aún no listos | ficha paginada y diálogo de impresión | recursos no listos mantienen la acción deshabilitada | cerrar modal; el navegador administra cancelar impresión |
| Términos/contacto | formulario y estado de envío | texto/modal no disponible | aceptación o contacto confirmado | mensaje de error y reintento | cerrar modal; aceptación se sincroniza por dispositivo/sesión |

No todos los flujos implementan todos los estados como una pantalla independiente. La tabla registra los estados efectivamente presentes en el código y diferencia «no aplica» de una capacidad no implementada. No se inventa un estado de pausa para operaciones que no lo ofrecen.

## 5. Relación de controles, acciones y permisos

| Superficie | Handlers cliente principales | Acciones backend / efectos locales | Control de acceso |
|---|---|---|---|
| Autenticación | auth.login, checkSession, requestPasswordRecovery, completePasswordRecovery | login, validateSession, logout, requestPasswordRecovery, completePasswordRecovery | credenciales y sesión validada; recuperación mantiene respuesta genérica |
| Catálogo | navigation.filtrarContenido, ui.mostrar* y performSilentSync | getCatalogData, getNavigationData, getDropdownData, getVehicleProjection | lecturas de catálogo; datos locales se validan antes de mostrar |
| Ficha/feedback | mostrarDetalleModal, openReportCutModal, openSuggestCutModal, openAddVinModal | recordVehicleView, recordLike, suggestYear, reportProblem, suggestCutChange, checkVinDuplicate, addVinToVehicle | actor/sesión y autorización backend; controles pueden depender de rol |
| WRITE/alta | handleStage1Submit, handleStage2Submit, handleStage3Submit | checkVehicle, checkOperation, addOrUpdateCut, addSupplementaryInfo | actor confiable y validación backend; operationId idempotente |
| Tutoriales | mostrarDetalleTutorialModal, openAddTutorialModal | addTutorial, updateTutorialItem, submitVideoForApproval | RBAC de FEEDBACK |
| PyS | openAddProblemModal, openPysDetailModal, openSearchVehicleForPysAssociationModal | addProblem, updatePysItem, addSolution, addPrevention, addVehicleToProblem, removeVehicleFromProblem | sesión y permiso de escritura/edición |
| Inbox | bindInboxControls_, loadInboxConversations_, renderInboxConversationDetail_ | getInboxRecipients, getInboxConversations, getInboxMessages, createInboxConversation, sendInboxMessage, markInboxRead, archiveInboxConversation, closeInboxConversation, replyToFeedback, markAsResolved, deleteFeedbackItem, approveVideo, rejectVideo | secciones y solicitudes filtradas por rol/participante; servidor vuelve a validar |
| Dashboard | openDashboard, renderActivity* | getActivityLogs, getFeedbackItems y lecturas de aportes/actividad | rol autorizado por la UI y RBAC backend |
| Developer | openDevTools, initAdminPanelListeners, executeTerminalCommand | acciones ADMIN de diagnóstico, backup, migración, Drive, logs, imágenes, inventario y auditoría | Desarrollador, con excepciones de edición modal documentadas en MIG-001 |
| Usuarios | displayProfile, fetchUsers, handleUserFormSubmit, deleteUser, resetUserSessions | getUsers, createUser, updateUser, deleteUser, updateProfile, changePassword, resetUserPassword, resetUserSessions | jerarquía de roles y actor confiable backend |
| Vídeos | openYouTubeUploadModal, uploadYouTubeFileResumable_ | getVideoApprovalByOperation, initYouTubeUpload, submitVideoForApproval; approveVideo/rejectVideo | OAuth permanece servidor; aprobación restringida |
| Contacto/legales | listeners de main.js y termsDeviceAcceptance.js | sendContactForm, acceptTerms | formulario público validado y aceptación vinculada al dispositivo/usuario |

La matriz individual de 120 acciones y sus handlers/RBAC/datos se conserva en MATRIZ_MIGRACION_SERVICIOS.md (§§9–19). Este documento no duplica esa matriz: añade la capa de pantallas y controles.

## 6. Cobertura de pruebas existentes por superficie

La asociación siguiente indica pruebas existentes pertinentes para los contratos y comportamientos de cada grupo. «Directa» significa que la suite nombra explícitamente la UI/flujo; «contrato/regresión» significa que prueba el handler, datos, permisos o integración que usa el control. No se afirma que cada botón tenga una prueba de clic individual si el test no la ejecuta.

| Superficie | Pruebas existentes relevantes |
|---|---|
| App Shell, menú, overlays y controles globales | OverlayMenuModalHistory.js, NavigationBackHistory.js, GlobalControlSystem.mjs, ButtonSystemIntegrity.js, ButtonSystemStyles.js, ButtonWidthPolicy.mjs, InfoModalStyleCascade.mjs, ModalHeaderCascade.mjs, ModalHeaderCssCascade.mjs |
| Login, sesión, recuperación, roles y términos | Auth.js, PasswordRecovery.mjs, SessionInvalidationFlow.mjs, SessionUiRoleInvalidation.js, SessionProfileRefresh.js, SessionRestoreOnValidationFailure.mjs, TermsAcceptance.js, TermsAsyncSync.mjs, TermsModalAccessibility.mjs, LastDeveloperProtection.js |
| Catálogo, búsqueda, detalle y navegación | GlobalSearch.js, SearchModelGrouping.mjs, SearchQueryXssIntegrity.js, CatalogNavigationRead.mjs, CatalogDropdownRead.mjs, CatalogSnapshotSync.js, CatalogChangeFeed.mjs, CatalogStartupIntegrity.mjs, CatalogRequestRetry.js, NavigationVinCollection.js, CutDetailModalLayout.mjs, VehicleModalRolePolicy.mjs |
| Alta de cortes, VIN, sugerencias y operaciones pendientes | CutPayloadValidation.js, AddCutOperationIntegrity.js, AddCutOperationRecoveryFlow.js, AddCutOperationRecoveryConcurrency.js, AddSupplementaryInfoIntegrity.js, SupplementaryImageOperationIdContract.mjs, VinAuthoritativeValidation.js, VinContextResolution.js, VinTestigoIntegrity.js, CutSuggestionReportLink.js, ReportSuggestionSchemaValidation.js, ValidationBannerLifecycle.js |
| Imágenes, miniaturas, lightbox y carga | ImageObjectUrlLifecycle.js, ImageResolutionVariants.js, ThumbnailCompressionQueueContract.mjs, ThumbnailPriorityIntegration.mjs, ImageUploadLedger.js, ImageUploadEventJournal.mjs, AdminImageUploadIsolation.js, ReportImageAttachment.js, ReplacedImagesLightboxHistory.js, BrowserZoomAccessibility.js |
| Tutoriales | TutorialIntegrity.js, TutorialCatalogRefreshDeltaFirst.mjs, TutorialIdReferenceAudit.mjs, FeedbackTutorialLookupBoundedRead.mjs |
| Relay y dropdowns | CutDropdownAuthority.js, CatalogDropdownRead.mjs, CatalogStartupIntegrity.mjs |
| PyS | PysCreationIntegrity.js, PysVehicleRelationIntegrity.js, PysModalNavigation.js, PysNavigationContext.js, PysDataCache.js, PysStoredXss.js, PysImageStorageRecovery.js |
| Inbox y solicitudes | InboxUi.mjs, InboxConversations.mjs, InboxRoleContract.js, InboxCachePagination.js, InboxAuditTrail.js, InboxStoredXss.js, VideoApprovalContracts.js, VideoApprovalPublishing.js |
| Dashboard y telemetría | ActivityDashboardContributions.mjs, ActivityDashboardInsights.mjs, ActivityDashboardStoredXss.js, AdminTrafficSurfaceContract.mjs, ServiceTrafficAggregatorContract.mjs, ServiceTrafficAggregation.mjs, ServiceHealthContract.mjs |
| Developer Tools, terminal, backups y administración | DevToolsModalAccessibility.mjs, DeveloperConsoleRouting.mjs, DeveloperConsoleConfirmation.mjs, DeveloperOperationMessages.mjs, DeveloperPanelUX.mjs, DeveloperPrivilegeRouting.mjs, DriveTerminalScope.mjs, AdminBackupResumeUI.mjs, AdminRestoreRecovery.js, AdminLogsMaintenanceContract.mjs, AdminSheetActionsContract.mjs |
| Biblioteca y auditoría Drive | ReplacedImagesLibraryUX.mjs, ReplacedImagesLightboxHistory.js, AdminReplacedImagesIntegrity.mjs, AdminDriveAuditIndexedDB.mjs, AdminDriveAuditClientRetry.mjs, AdminImageTrashLifecycle.mjs, CortesImageReconciliationUI.mjs, CortesImageOrganizerUiContract.mjs, CortesImageOrganizerExecutor.mjs |
| Usuarios y perfil | ResponsiveFormsUsers.js, UsersAtomicMutations.js, UsersReadMinimization.mjs, UsersMutationSnapshot.mjs, SessionUiRoleInvalidation.js, LastDeveloperProtection.js |
| YouTube | YouTubeUploadClient.js, YouTubeUploadClientNode.mjs, YouTubeUploadCheckpointRecovery.js, YouTubeUploadCloseDuringTransfer.js, YouTubeUploadCompletedRecordRecovery.js, YouTubeUploadDraftRecovery.js, YouTubeUploadOverlayLifecycle.js, YouTubeUploadRecordPersistence.js, VideoApprovalClientContract.mjs |
| Impresión y QR | PrintQrPrivacy.mjs, PrintSheetLayoutModes.mjs, PrintSheetPageContract.mjs, PrintSheetPaginationIntegrity.mjs, PrintSheetResourceReadiness.mjs, PrintSheetWarningIndicator.mjs |
| Rich text, ayuda y modales | RichTextContentSecurity.js, RichTextBackendSanitization.js, RichTextGlobalPreference.mjs, TermsModalAccessibility.mjs, InfoModalStyleCascade.mjs, ModalHeaderCascade.mjs, OverlayMenuModalHistory.js |
| Contacto | FeedbackContactWriteNoGlobalLock.mjs (contrato de escritura backend y bloqueo); no es una prueba completa de interacción visual del formulario |

### 6.1 Límites de cobertura que quedan explícitos

1. Las suites cubren principalmente grupos funcionales, contratos y regresiones; no existe una prueba de clic individual para cada botón/anchor estático.
2. Sobre Nosotros, FAQ y changelog son contenido informativo: sus aperturas/cierres quedan dentro de los contratos generales de modal/overlay; no se localizó una prueba dedicada que valide todo el texto de cada sección.
3. El formulario Contacto tiene prueba de contrato backend; no se localizó una suite específica que automatice el flujo completo de interacción del formulario en navegador.
4. La navegación principal de Lightbox tiene cobertura de recursos/zoom y accesibilidad; ReplacedImagesLightboxHistory cubre explícitamente el lightbox administrativo, no todos los gestos del visor principal en todos los dispositivos.
5. La disponibilidad real de controles por rol, los flujos de datos externos y los estados visuales en Android/PWA/escritorio deben confirmarse en Beta real. Las pruebas locales no demuestran que los deployments estén actualizados.
6. Las acciones manuales sin consumidor directo identificadas en MIG-001 se conservan como herramientas/endpoints y no se convierten en controles UI ficticios.

Estos límites no ocultan funciones: diferencian cobertura de contrato, cobertura visual indirecta y validación de navegador/servicios externos pendiente. Los puntos 2–4 quedan identificados para pruebas UI específicas si se requieren antes de aprobar la paridad visual final.

## 7. Trazabilidad con la matriz Beta

| Bloque Beta | Pantallas relacionadas | Validación de campo |
|---|---|---|
| BETA-01 AUTH/USERS | UI-01, UI-02, UI-14 | login, perfil/rol, logout, revocación, eliminación y aislamiento |
| BETA-02 CATALOG | UI-03, UI-04, UI-06, UI-07, UI-08 | caché, snapshot/deltas, búsqueda, detalle, navegación y concurrencia |
| BETA-03 WRITE | UI-04, UI-05 | altas, edición, VIN, aportes, idempotencia y recuperación |
| BETA-04 FEEDBACK/PyS/Tutoriales/Inbox | UI-06, UI-08, UI-09, UI-16 | reportes, sugerencias, likes, tutoriales, PyS, mensajes y permisos |
| BETA-05 ADMIN | UI-10, UI-11, UI-12, UI-13 | salud, métricas, Drive, backups, migraciones, read-back y rollback |
| BETA-06 Imágenes | UI-04, UI-05, UI-11, UI-12, UI-13 | corpus, variantes, MIME, caché, cola, logos, inventario |
| BETA-07 YouTube | UI-05, UI-06, UI-08, UI-09, UI-15 | resumable, pausa, reanudación, cancelación, aprobación/rechazo |
| BETA-08 Interfaz | UI-01 a UI-17 | Android/PWA, escritorio, modales, formularios, navegación, tema y overflow |

La lista Beta mantiene su secuencia de sincronización segura obligatoria al principio. No se cambió el orden ni se ejecutaron pruebas remotas desde este inventario.

## 8. Hallazgos y acciones posteriores

- La UI tiene superficies informativas y controles locales que no se traducen a acciones backend (tema, impresión, QR, Lightbox, navegación, PWA, rich text y cachés). La migración debe preservar sus contratos de navegador además de los endpoints.
- El modal de detalle concentra varias capacidades que no aparecen como pantallas independientes: VIN, reportes, sugerencias, apertura/alimentación, vídeos, PyS, compartir e impresión.
- La página add_cortes es una aplicación independiente: inicializa su propia navegación de overlays y no carga main.js; no se debe asumir que los listeners globales de index cubren sus formularios.
- Inbox y Developer generan parte de sus controles en runtime; revisar solo index.html dejaría fuera composer, respuestas, selección de destinatario, menús contextuales, confirmaciones y controles de operaciones.
- Los estados de progreso/reanudación son parte de la función, no elementos cosméticos: se deben preservar los checkpoints locales, operationId, borradores, paginación y ledger de auditoría.
- No se detectó motivo para retirar ningún control. No se modificó código funcional, acciones, RBAC, datos, Spreadsheet, Drive ni deployments.

## 9. Resultado y criterio de cierre MIG-002

- [x] Recorrer HTML/JS/CSS activos y listar las pantallas y superficies de usuario.
- [x] Inventariar controles estáticos y generados dinámicamente: formularios, botones, enlaces, menús, pestañas, selectores, comandos, editores y acciones contextuales.
- [x] Relacionar cada grupo de controles con handlers cliente y acciones backend/locales.
- [x] Documentar roles y condiciones de visibilidad, sin confundir ocultamiento UI con autorización.
- [x] Registrar estados de carga, vacío, éxito, error, progreso, cancelación, pausa y recuperación donde están implementados.
- [x] Vincular las superficies con pruebas automatizadas existentes y separar pruebas de contrato de pruebas visuales/Beta.
- [x] Identificar explícitamente cobertura UI indirecta y brechas de pruebas específicas; no afirmar que cada control tenga prueba de clic individual.
- [x] Relacionar las pantallas con BETA-01 a BETA-08.

**Resultado:** MIG-002 queda **COMPLETADA CON VALIDACIÓN DIFERIDA**. El inventario de pantallas y controles, la trazabilidad de funciones y la matriz de pruebas existentes están documentados. Las validaciones de navegador real, despliegues, dispositivos, Apps Script, Spreadsheet/Drive, OAuth y YouTube se mantienen para Beta. Las brechas de pruebas visuales específicas descritas en §6.1 quedan registradas y no se presentan como aprobadas.

**Archivos funcionales no modificados:** HTML, CSS, JS frontend, JS de servicios, endpoints, RBAC, datos y deployments.
