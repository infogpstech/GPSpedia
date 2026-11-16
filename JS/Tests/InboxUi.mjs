import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeInboxMessagePages } from "../Frontend/inboxPageCache.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = path => readFileSync(resolve(ROOT, path), "utf8");
const ui = read("JS/Frontend/ui.js"), html = read("index.html"), css = read("style.css"), api = read("JS/Frontend/api-config.js"), rich = read("JS/Frontend/rich-text.js");
const index = read("index.html"), users = read("HTML/users.html"), addCortes = read("HTML/add_cortes.html"), main = read("JS/Frontend/main.js");
const cases = [];
function check(name, fn) { cases.push({ name, fn }); }

check("El módulo UI conserva sintaxis ECMAScript válida", () => {
    const result = spawnSync(process.execPath, ["--input-type=module", "--check"], { input: ui, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || "ui.js no pasó el análisis sintáctico.");
});
check("Los módulos del editor enriquecido y del arranque mantienen sintaxis ECMAScript válida", () => {
    for (const [name, source] of [["rich-text.js", rich], ["main.js", main]]) {
        const result = spawnSync(process.execPath, ["--input-type=module", "--check"], { input: source, encoding: "utf8" });
        assert.equal(result.status, 0, name + " no pasó el análisis sintáctico: " + (result.stderr || ""));
    }
});
check("El Inbox es un diálogo modal accesible", () => {
    for (const section of ["general", "soporte", "contact", "reports", "contributions"]) assert.ok(html.includes('data-inbox-section="' + section + '"'));
    assert.match(ui, /function setInboxSection_\(/);
    assert.match(ui, /context.role !== "desarrollador"/);
    assert.match(ui, /item.type === ['\"]video_approval['\"]/);
    assert.match(html, /id="inbox-modal-content"[^>]*role="dialog"[^>]*aria-modal="true"/);
    assert.match(html, /aria-labelledby="inbox-modal-title"/);
    assert.match(html, /aria-label="Cerrar bandeja de entrada"/);
    assert.match(ui, /activateLegalModalFocus_\(modal,[\s\S]*allowEscape: true/);
});
check("Todos los roles activos pueden abrir conversaciones", () => {
    assert.match(ui, /ensureUiSessionRole_\(\['desarrollador', 'jefe', 'supervisor', 'tecnico', 'tecnico_exterior'\]\)/);
    assert.match(ui, /'tecnico', 'tecnico_exterior'\]\.includes\(userRole\)/);
});
check("La matriz de secciones Inbox coincide con los permisos de cada rol", () => {
    assert.match(ui, /desarrollador:\["general","soporte","contact","reports","contributions"\]/);
    assert.match(ui, /jefe:\["general","contact","reports"\]/);
    assert.match(ui, /supervisor:\["general","reports"\]/);
    assert.match(ui, /tecnico:\["general","reports"\]/);
    assert.match(ui, /tecnico_exterior:\["general","reports"\]/);
    assert.match(ui, /button.hidden = !inboxRoleCanSeeSection_/);
});
check("Técnicos consultan reportes propios y no reciben acciones administrativas", () => {
    assert.match(ui, /routeAction\('getMyProblemReports'/);
    assert.ok(ui.includes("if (ownReportsOnly) return item.type === 'problem_report' || item.type === 'video_approval'"));
    assert.match(ui, /inboxCanManageRequests_\(userRole\)/);
});
check("Las solicitudes históricas siguen separadas y conservan sus contenedores", () => {
    assert.match(html, /id="inbox-requests-view"/);
    assert.match(html, /id="inbox-list"/);
    assert.match(html, /id="inbox-detail"/);
    assert.match(ui, /loadAndRenderInbox\(\{ context, reset:/);
});
check("Las solicitudes históricas usan navegación móvil de una sola vista y regreso accesible", () => {
    assert.match(ui, /is-request-detail-open/);
    assert.match(ui, /mobileBack = makeElement\('button', 'inbox-mobile-back', 'Volver a la bandeja'\)/);
    assert.match(ui, /itemDiv\.setAttribute\('role', 'button'\)/);
    assert.match(ui, /itemDiv\.addEventListener\('keydown'/);
    assert.ok(css.includes("#inbox-modal-content.is-request-detail-open .inbox-requests-view #inbox-detail"));
});
check("Las solicitudes exponen una barra contextual con responder, resolver y borrar", () => {
    assert.match(ui, /actionToolbar\.setAttribute\('role', 'toolbar'\)/);
    assert.match(ui, /actionToolbar\.appendChild\(replyButton\)/);
    assert.match(ui, /actionToolbar\.appendChild\(deleteButton\)/);
    assert.match(css, /\.inbox-action-toolbar/);
    assert.match(css, /#inbox-modal-content \.inbox-action-toolbar/);
});
check("Las aprobaciones de vídeo no ofrecen una eliminación genérica no soportada", () => {
    const start = ui.indexOf('if (isVideoItem) {', ui.indexOf('export function renderInboxDetail('));
    const end = ui.indexOf('} else {', start);
    assert.ok(start >= 0 && end > start);
    assert.doesNotMatch(ui.slice(start, end), /inbox-delete-btn/);
});
check("Los mensajes del Inbox renderizan formato únicamente después del sanitizador compartido", () => {
    assert.match(ui, /messageBody\.innerHTML\s*=\s*sanitizeHtmlContent\(String\(message\.body \|\| ""\), "advanced"\)/);
    assert.match(ui, /createInboxRichTextToolbar\(editor\.id\)/);
    assert.match(ui, /createInboxRichTextToolbar\(bodyEditor\.id\)/);
    assert.match(ui, /sanitizeHtmlContent\(String\(message\.body \|\| ""\), "advanced"\)/);
    assert.match(ui, /form\.append\(label, editorShell, status, send\)/);
});
check("Los borradores se recuperan por usuario y se limpian al cambiar de sesión", () => {
    assert.match(ui, /sessionStorage\.getItem/);
    assert.match(ui, /sessionStorage\.setItem/);
    assert.match(ui, /clearInboxDraftsForUser_\(lastShownAppContext/);
});
check("La interfaz incluye destinatario único y plantillas editables", () => {
    assert.match(ui, /getInboxRecipients\(context\)/);
    assert.match(ui, /recipientId, subject: subjectValue/);
    assert.match(ui, /welcome-general/);
    assert.match(ui, /welcome-technician/);
    assert.match(ui, /source\.id = sourceId; source\.maxLength = 5000/);
});
check("La lista de conversaciones usa caché por sesión, carpeta, categoría, búsqueda y cursor", () => {
    for (const fragment of [
        "const inboxConversationPageCache_ = createInboxPageCache",
        "const cacheCursor = JSON.stringify([inboxConversationFolder_, inboxConversationCategory_, inboxConversationQuery_, cursor])",
        "inboxConversationPageCache_.get(context, cacheCursor,",
        "pageSize: INBOX_CONVERSATION_PAGE_SIZE_, allowStale: true",
        "inboxConversationPageCache_.set(context, cacheCursor, response,",
        "await setInboxSection_('general', { preferCache: true });",
        "options.preferCache && cachedPage && !cachedPage.stale",
        "inboxConversationPageCache_.clear()"
    ]) assert.ok(ui.includes(fragment), "Falta contrato de caché Inbox: " + fragment);
});
check("La búsqueda de conversaciones abarca todas las bandejas y categorías", () => {
    assert.ok(ui.includes('folder: inboxConversationQuery_ ? "all" : inboxConversationFolder_'));
    assert.ok(ui.includes('category: inboxConversationQuery_ ? "all" : inboxConversationCategory_'));
});
check("La bandeja tiene carpetas, búsqueda y paginación", () => {
    for (const folder of ["received", "sent", "archived"]) assert.match(html, new RegExp('data-inbox-folder="' + folder + '"'));
    assert.doesNotMatch(html, /data-inbox-folder="read"|data-inbox-folder="unread"/);
    assert.match(html, /id="inbox-conversation-search-form"/);
    assert.ok(ui.includes('folder: inboxConversationQuery_ ? "all" : inboxConversationFolder_'));
    assert.match(ui, /inboxConversationNextCursor_/);
});
check("La búsqueda se cierra al usar otra acción, cambiar de pestaña o volver a pulsar la lupa", () => {
    for (const fragment of [
        "function closeInboxSearch_()",
        'inboxContent.addEventListener("click"',
        'button.id === "inbox-search-toggle"',
        "closeInboxSearch_();",
        'searchToggle.addEventListener("click"',
        "async function setInboxSection_(section, options = {}) {",
        'if (nextView !== "conversations") closeInboxSearch_()',
        "form.hidden = true",
        'setAttribute("aria-expanded", "false")'
    ]) assert.ok(ui.includes(fragment), "Falta contrato de cierre de búsqueda: " + fragment);
});

check("General y Soporte no muestran selector de categoría y conservan la búsqueda por contenido", () => {
    assert.doesNotMatch(html, /inbox-category-filter|inbox-filter-row/);
    assert.match(html, /id="inbox-search-toggle"/);
    assert.match(ui, /searchToggle\.addEventListener\("click"/);
    assert.match(ui, /inboxConversationQuery_ = String\(input && input\.value/);
    assert.match(ui, /getInboxConversations\(context,[\s\S]*query: inboxConversationQuery_/);
    assert.ok(ui.includes("category: inboxConversationQuery_ ? \"all\" : inboxConversationCategory_"));
});
check("Todas las secciones reutilizan un único paginador con flechas y numeración contextual", () => {
    assert.equal((html.match(/id="inbox-pagination"/g) || []).length, 1);
    assert.match(html, /id="inbox-page-previous"[^>]*>←</);
    assert.match(html, /id="inbox-page-next"[^>]*>→</);
    assert.match(html, /id="inbox-page-label"[^>]*>1\/1</);
    assert.match(ui, /document\.getElementById\("inbox-pagination"\)/);
    assert.match(ui, /label\.textContent = currentPage \+ "\/" \+ pageCount/);
    assert.doesNotMatch(html, /inbox-conversation-previous|inbox-conversation-next|inbox-category-filter/);
});
check("Nuevo mensaje reemplaza Solicitudes en la barra superior y desaparece el botón flotante", () => {
    assert.match(html, /id="inbox-view-tabs"[^>]*aria-label="Acciones de bandeja"/);
    assert.match(html, /id="inbox-new-message"[^>]*>[\s\S]*<span>Nuevo mensaje<\/span>/);
    assert.doesNotMatch(html, /inbox-requests-tab|inbox-floating-new-message/);
    assert.match(html, /id="inbox-search-toggle"/);
    assert.match(ui, /if \(newMessageButton\) newMessageButton\.hidden = false/);
    assert.match(ui, /Salir y cancelar el mensaje nuevo/);
    assert.match(css, /inbox-folder-nav button\[hidden\][\s\S]*?display:none !important/);
    assert.match(css, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,1fr\)\)/);
});
check("Cada conversación muestra a la izquierda un icono accesible de leído o no leído", () => {
    assert.match(ui, /const unreadCount = Math\.max\(0, Number\(item\.unreadCount\) \|\| 0\)/);
    assert.match(ui, /inbox-conversation-read-state/);
    assert.match(ui, /aria-label", unreadCount > 0 \? "Conversación sin leer" : "Conversación leída"/);
    assert.match(ui, /unreadCount > 0 \? "fa-solid fa-envelope" : "fa-solid fa-envelope-open"/);
    assert.match(css, /inbox-conversation-read-state[\s\S]*?grid-row:1\s*\/\s*span 4/);
    assert.doesNotMatch(ui, /inbox-conversation-unread/);
});
check("El estado de lectura, archivo y cierre usa las acciones del backend", () => {
    assert.match(ui, /markInboxRead\(conversationId, latest\.messageId, context\)/);
    assert.match(ui, /archiveInboxConversation\(item\.conversationId, !item\.archived, context\)/);
    assert.match(ui, /apiCloseInboxConversation\(item\.conversationId, context\)/);
    assert.match(ui, /Solo quien inició el caso puede agregar comentarios/);
    assert.match(ui, /Caso cerrado\. No se pueden agregar más comentarios/);
});
check("Las notificaciones internas reflejan el total de conversaciones no leídas", () => {
    assert.match(html, /id="inbox-notification-count"/);
    assert.match(ui, /counts && counts\.unread/);
});
check("Nuevo mensaje es un botón flotante cuadrado, separado de la rejilla y de la paginación", () => {
    assert.match(css, /button:not\(\.inbox-floating-new-message\)/);
    assert.match(css, /button\.inbox-floating-new-message\s*\{[\s\S]*?position:absolute[\s\S]*?right:14px[\s\S]*?width:46px[\s\S]*?height:46px[\s\S]*?border-radius:12px/);
    assert.match(css, /button\.inbox-floating-new-message span\s*\{\s*display:none/);
    assert.match(css, /bottom:calc\(64px \+ env\(safe-area-inset-bottom, 0px\)\)/);
    assert.match(html, /id="inbox-page-next"/);
});
check("La lista y los mensajes existentes permanecen visibles durante la actualización", () => {
    assert.ok(ui.includes("else if (!inboxConversationItems_.length && !list.childElementCount) {"));
    assert.match(ui, /if \(!options\.older && !options\.preserveScroll && !inboxConversationMessages_\.length\) renderInboxConversationDetail_/);
});
check("La actualización del historial conserva el orden de inserción aunque las fechas coincidan o retrocedan", () => {
    const previous = [
        { messageId: "message-0001", createdAt: "2026-11-15T12:00:00.000Z", body: "Primero" },
        { messageId: "message-0002", createdAt: "2026-11-15T12:01:00.000Z", body: "Segundo" }
    ];
    const incoming = [
        { messageId: "message-0002", createdAt: "2026-11-15T11:59:00.000Z", body: "Segundo actualizado" },
        { messageId: "message-0003", createdAt: "2026-11-15T11:58:00.000Z", body: "Tercero" }
    ];
    const merged = mergeInboxMessagePages(previous, incoming);
    assert.deepEqual(merged.map(message => message.messageId), ["message-0001", "message-0002", "message-0003"]);
    assert.equal(merged[1].body, "Segundo actualizado");
    assert.deepEqual(mergeInboxMessagePages(merged, incoming), merged);
    assert.match(ui, /mergeInboxMessagePages\(inboxConversationMessages_, incoming\)/);
    assert.doesNotMatch(ui, /inboxConversationMessages_ = Array\.from\(byId\.values\(\)\)\.sort/);
});
check("El historial reciente de mensajes se reutiliza por sesión y se limpia al cambiar de cuenta", () => {
    assert.match(ui, /const inboxConversationMessageCache_ = new Map\(\)/);
    assert.match(ui, /INBOX_MESSAGE_CACHE_TTL_MS_ = 60000/);
    assert.match(ui, /inboxConversationMessageCache_\.clear\(\)/);
    assert.match(ui, /inboxConversationMessageCache_\.set\(conversationId/);
    assert.match(ui, /const cacheIsFresh = Boolean\(cached && Date\.now\(\) - cached\.savedAt <= INBOX_MESSAGE_CACHE_TTL_MS_\)/);
});
check("La sincronización está acotada por intervalo y tamaño de página", () => {
    assert.match(ui, /INBOX_CONVERSATION_PAGE_SIZE_ = 20/);
    assert.match(ui, /INBOX_MESSAGE_PAGE_SIZE_ = 50/);
    assert.match(ui, /INBOX_SYNC_INTERVAL_MS_ = 60000/);
    assert.match(ui, /document\.visibilityState === "hidden"/);
    assert.match(ui, /stopInboxSync_\(\)/);
});
check("El modal bloquea el scroll de fondo y mantiene scroll interno", () => {
    assert.match(css, /body\.inbox-open\s*\{\s*overflow:\s*hidden/s);
    assert.match(css, /\.inbox-conversation-list\s*\{[^}]*overflow-y:\s*auto/s);
    assert.match(css, /\.inbox-workspace-content\s*\{[^}]*min-height:\s*0/s);
    assert.match(css, /\.inbox-conversation-sidebar\s*\{[^}]*height:\s*100%/s);
    assert.match(css, /\.inbox-thread-messages\s*\{[^}]*overflow-y:\s*auto/s);
});
check("El diseño responde a móvil, teclado y movimiento reducido", () => {
    assert.match(css, /@media\s*\(max-width:\s*760px\)/);
    assert.match(css, /:focus-visible/);
    assert.match(css, /prefers-reduced-motion/);
});
check("Reportes y solicitudes usan toda la altura disponible de la lista en PWA móvil", () => {
    assert.match(css, /\.inbox-requests-view #inbox-list\s*\{[^}]*flex:\s*1 1 0 !important/s);
    assert.match(css, /\.inbox-requests-view #inbox-list\s*\{[^}]*overflow-y:\s*auto/s);
    assert.match(css, /\.inbox-requests-view #inbox-detail\s*\{[^}]*display:\s*none/s);
    assert.match(css, /\.is-request-detail-open \.inbox-requests-view #inbox-list\s*\{\s*display:\s*none/s);
});
check("Nuevo mensaje está en la barra superior y Buscar permanece junto a las carpetas", () => {
    const folderStart = html.indexOf('id="inbox-folder-nav"');
    const folderEnd = html.indexOf("</nav>", folderStart);
    const folderMarkup = html.slice(folderStart, folderEnd);
    const actionStart = html.indexOf('id="inbox-view-tabs"');
    const actionEnd = html.indexOf("</nav>", actionStart);
    const actionMarkup = html.slice(actionStart, actionEnd);
    assert.ok(folderStart >= 0 && folderEnd > folderStart);
    assert.match(folderMarkup, /id="inbox-search-toggle"/);
    assert.doesNotMatch(folderMarkup, /inbox-new-message/);
    assert.match(actionMarkup, /id="inbox-new-message"/);
    assert.doesNotMatch(actionMarkup, /inbox-requests-tab|data-inbox-view="requests"/);
    assert.match(ui, /if \(newMessageButton\) newMessageButton\.hidden = false/);
    assert.match(ui, /if \(inboxConversationCurrentView_ !== "conversations"\) await setInboxSection_\("general"\)/);
});
check("Los wrappers de API conservan el contrato de Inbox", () => {
    for (const name of ["getInboxRecipients","getInboxConversations","getInboxMessages","createInboxConversation","sendInboxMessage","markInboxRead","archiveInboxConversation","closeInboxConversation"]) {
        assert.match(api, new RegExp("export async function " + name + "\\("));
    }
});
check("La paginación conserva los cursores opacos de Inbox sin convertirlos a offsets", () => {
    assert.match(ui, /inboxConversationPageStack_\.push\(inboxConversationNextCursor_\)/);
    assert.doesNotMatch(ui, /inboxConversationPageStack_\.push\(Number\(inboxConversationNextCursor\)\)/);
});
check("El compositor nuevo permite desplazamiento vertical y mantiene Salir/Enviar accesibles", () => {
    const composerLayout = css.slice(css.indexOf("GP-UX-INBOX-DESKTOP-02"));
    assert.match(composerLayout, /#inbox-modal-content \.inbox-new-conversation-form\s*\{[^}]*flex:\s*1 1 0;[^}]*overflow-y:\s*auto/s);
    const composeActionsLayout = css.slice(css.lastIndexOf("#inbox-modal-content .inbox-compose-actions {"));
    assert.match(composeActionsLayout, /position:\s*sticky/);
    assert.match(ui, /formActions\.append\(makeCancelButton\(\), send\)/);
});
check("Salir y Enviar mensaje permanecen juntos, con dimensiones iguales y Enviar a la derecha", () => {
    assert.match(ui, /formActions\.append\(makeCancelButton\(\), send\)/);
    assert.match(css, /\.inbox-compose-actions\s*\{[^}]*flex-wrap:\s*nowrap/s);
    assert.match(css, /\.inbox-compose-actions > \.inbox-cancel-compose,[\s\S]*?\.inbox-compose-actions > \.inbox-primary-button\s*\{[\s\S]*?width:64px;[\s\S]*?height:40px/s);
});
check("El botón de opciones queda antes de Negrita y su menú se ancla al borde izquierdo", () => {
    assert.match(ui, /composerOptions\.dataset\.richToolbarPosition = "start"/);
    assert.match(ui, /toolbar\.insertBefore\(composerOptions, toolbar\.firstChild\)/);
    assert.match(rich, /child\.dataset\.richToolbarPosition === "start"/);
    assert.match(rich, /nextToolbar\.insertBefore\(child, nextToolbar\.firstChild\)/);
    assert.match(css, /\.inbox-composer-options-menu\s*\{[^}]*left:0; right:auto/s);
    assert.match(css, /\.inbox-composer-options-menu\s*\{[^}]*max-width:calc\(100vw - 24px\)/s);
});
check("Plantilla y categoría se apilan dentro del desplegable de opciones de la barra", () => {
    assert.match(ui, /composerOptionsMenu\.append\(templateField, categoryField\)/);
    assert.match(ui, /composerOptions\.dataset\.richToolbarPersist = "true"/);
    assert.match(ui, /editorShell\.append\(toolbar, bodyEditor, body\)/);
    assert.match(ui, /form\.append\(bodyLabel, editorShell\)/);
    assert.match(css, /\.inbox-composer-options-menu\s*\{[^}]*grid-template-columns:\s*minmax\(0,1fr\)/s);
    assert.match(css, /\.inbox-composer-option\s*\{[^}]*flex-direction:\s*column/s);
});
check("La lista vacía reduce su altura y el botón de búsqueda conserva íntegro el icono", () => {
    assert.match(ui, /list\.classList\.toggle\("is-empty", isEmpty\)/);
    assert.match(css, /\.inbox-conversation-list\.is-empty\s*\{[^}]*max-height:\s*48px/s);
    assert.match(css, /#inbox-search-toggle span\s*\{\s*display:\s*none/s);
});
check("El modal mantiene los controles de lectura para tecnologías de asistencia", () => {
    assert.match(html, /id="inbox-conversation-list"[^>]*aria-live="polite"/);
    assert.match(html, /id="inbox-conversation-status"[^>]*role="status"[^>]*aria-live="polite"/);
    assert.match(ui, /setAttribute\("aria-pressed"/);
});

check("El detalle existente de reportes muestra categoría, asunto, descripción, respuesta y estado del ticket", () => {
    assert.match(ui, /ticketCategoryLabels/);
    assert.match(ui, /appendLabeledValue\(panel, 'Categoría'/);
    assert.match(ui, /appendLabeledValue\(panel, 'Estado del ticket'/);
    assert.match(ui, /item\.subject/);
    assert.match(ui, /item\.content/);
    assert.match(ui, /item\.reply/);
    assert.match(ui, /item\.isResolved/);
});
check("Las acciones y la consulta de tickets propios no añaden controles visibles antes de autorización", () => {
    assert.doesNotMatch(ui, /markInboxUnread|deleteInboxConversation/);
    assert.doesNotMatch(html, /inbox-mark-unread|inbox-delete-conversation|inbox-my-tickets/);
});
check("Los modales principales no usan spans como controles de cierre", () => {
    assert.doesNotMatch(index, /<span\b[^>]*class=["'][^"']*info-close-btn/);
    assert.doesNotMatch(ui, /<span\b[^>]*class=["'][^"']*info-close-btn/);
    assert.doesNotMatch(users, /<span\b[^>]*class=["'][^"']*close-btn/);
});
check("Los cierres estáticos tienen type button y nombre accesible", () => {
    const buttons = [...index.matchAll(/<button\b[^>]*class=["'][^"']*info-close-btn[^"']*["'][^>]*>/g)].map(x => x[0]);
    assert.ok(buttons.length >= 6);
    for (const button of buttons) {
        assert.match(button, /type=["']button["']/);
        assert.match(button, /aria-label=["'][^"']+["']/);
    }
});
check("Los cierres dinámicos se crean como botones no submit y tienen aria-label", () => {
    assert.match(ui, /document\.createElement\('button'\);\s*closeBtn\.type = 'button';\s*closeBtn\.className = 'info-close-btn';\s*closeBtn\.setAttribute\('aria-label'/);
    assert.match(ui, /closeBtn\.type = "button";\s*closeBtn\.setAttribute\("aria-label", "Cerrar ventana"\)/);
});
check("Los botones de cierre comparten dimensiones, contraste, hover y foco visible", () => {
    assert.match(css, /\.info-close-btn\s*\{[\s\S]*?width:\s*40px;[\s\S]*?height:\s*40px;/);
    assert.match(css, /\.info-close-btn:hover:not\(:disabled\)/);
    assert.match(css, /\.info-close-btn:focus-visible/);
    assert.match(css, /#inbox-modal-content \.inbox-close-button \{ top: 10px; right: 12px; \}/);
    assert.match(css, /#replaced-image-lightbox-close \{ top: -14px; right: -14px; \}/);
});
check("El panel de usuarios usa el mismo patrón de cierre accesible", () => {
    const buttons = [...users.matchAll(/<button\b[^>]*class=["'][^"']*close-btn[^"']*["'][^>]*>/g)].map(x => x[0]);
    assert.equal(buttons.length, 3);
    for (const button of buttons) {
        assert.match(button, /type=["']button["']/);
        assert.match(button, /aria-label=["'][^"']+["']/);
    }
    assert.match(users, /\.close-btn:focus-visible/);
});
check("La animación respeta preferencias de movimiento reducido", () => {
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.info-close-btn \{ transition: none; \}/);
    assert.match(users, /@media \(prefers-reduced-motion: reduce\)/);
});


check("La barra enriquecida del Inbox usa iconos uniformes y menús desplegables", () => {
    assert.ok(ui.includes('createRichTextToolbar(targetId, { forceAdvanced: true, compact: true })'));
    assert.ok(rich.includes("function createCompactRichTextToolbar_("));
    assert.ok(rich.includes('className = "rich-toolbar-icon-button"'));
    assert.ok(rich.includes('setAttribute("aria-haspopup", "menu")'));
    for (const icon of ["fa-text-height", "fa-font", "fa-list-ul"]) assert.ok(rich.includes(icon));
    assert.ok(css.includes(".inbox-rich-text-toolbar > .rich-toolbar-dropdown { flex:1 1 0"));
    const compact = rich.slice(rich.indexOf("function createCompactRichTextToolbar_"), rich.indexOf("export function createRichTextToolbar"));
    assert.ok(!compact.includes('createElement("select")'));
});
check("Los controles personalizados sobreviven al refresco del toolbar", () => {
    assert.ok(rich.includes('compact: toolbar.dataset.richTextCompact === "true"'));
    assert.ok(rich.includes('child.dataset.richToolbarPersist === "true"'));
    assert.ok(ui.includes('composerOptions.closest(".inbox-rich-text-toolbar")'));
});
check("La búsqueda expande el nombre del botón y lo contrae al cerrar", () => {
    assert.ok(ui.includes('searchToggle.classList.toggle("is-expanded", opening)'));
    assert.ok(ui.includes('toggle.classList.remove("is-expanded")'));
    assert.ok(css.includes('#inbox-search-toggle[aria-expanded="true"]'));
    assert.ok(css.includes('max-width:110px; margin-left:1px; opacity:1'));
});
check("La barra está integrada en el editor y su fondo cambia por tema", () => {
    assert.ok(ui.includes("editorShell.append(toolbar, editor, textarea)"));
    assert.ok(ui.includes("editorShell.append(toolbar, bodyEditor, body)"));
    assert.ok(css.includes("background:#f1f3f5"));
    assert.ok(css.includes("body.dark-mode #inbox-modal-content .inbox-editor-shell { background:#2b3036; }"));
    assert.ok(css.includes("background:transparent; box-shadow:none; resize:vertical"));
});


check("El Inbox usa editores visuales contenteditable y conserva un campo fuente HTML saneado", () => {
    assert.match(ui, /function createInboxRichEditor_\(/);
    assert.match(ui, /editor\.setAttribute\("contenteditable", "true"\)/);
    assert.match(ui, /editor\.setAttribute\("role", "textbox"\)/);
    assert.match(ui, /source\.value = sanitizeHtmlContent\(editor\.innerHTML, "advanced"\)/);
    assert.match(ui, /source\.hidden = true/);
    assert.match(ui, /createInboxRichEditor_\("inbox-reply-body", "inbox-reply-body-editor"/);
    assert.match(ui, /createInboxRichEditor_\("inbox-new-body", "inbox-new-body-editor"/);
    assert.match(ui, /createInboxRichTextToolbar\(editor\.id\)/);
    assert.match(ui, /createInboxRichTextToolbar\(bodyEditor\.id\)/);
});
check("La edición visual sanea el contenido pegado y mantiene el límite de 5,000 caracteres", () => {
    assert.match(ui, /editor\.addEventListener\("paste"/);
    assert.match(ui, /sanitizeHtmlContent\(html, "advanced"\)/);
    assert.match(ui, /const maxLength = Number\(source\.maxLength\) \|\| 5000/);
    assert.match(ui, /range\.setEnd\(editor, editor\.childNodes\.length\)/);
});
check("La barra aplica formato sobre la selección real del editor visual", () => {
    assert.match(rich, /function isRichContentEditable_/);
    assert.match(rich, /document\.execCommand\(command\[0\], false, command\[1\]\)/);
    assert.match(rich, /document\.execCommand\("foreColor", false, safeColor\)/);
    assert.match(rich, /\["insertUnorderedList", null\]/);
    assert.match(rich, /editor\.dispatchEvent\(new Event\("input", \{ bubbles: true \}\)\)/);
});
check("Los menús flotan sobre el editor: listas hacia la derecha y categorías hacia la izquierda", () => {
    assert.match(rich, /positionRichTextMenu\(menu, trigger, "left"\)/);
    assert.match(ui, /positionRichTextMenu\(composerOptionsMenu, composerOptionsButton, "right"\)/);
    assert.match(rich, /menu\.style\.position = "fixed"/);
    assert.match(ui, /document\.addEventListener\("pointerdown",[\s\S]*?closeInboxRichToolbarMenus_/);
    assert.match(ui, /category\.addEventListener\("change", closeComposerOptions\)/);
    assert.match(ui, /template\.addEventListener\("change", \(\) => \{\s*closeComposerOptions\(\)/);
});
check("La barra compacta reduce separación y ancho de iconos en PWA móvil", () => {
    const toolbarRule = css.slice(css.lastIndexOf("GP-UX-INBOX-RICH-EDITOR-01"));
    assert.match(toolbarRule, /\.inbox-rich-text-toolbar\s*\{\s*gap:1px; padding:2px/);
    assert.match(toolbarRule, /flex:0 0 27px; width:27px/);
    assert.match(toolbarRule, /flex-basis:25px; width:25px/);
});
check("Las fuentes nativas ampliadas están permitidas por el sanitizador y disponibles en el menú", () => {
    for (const font of ["Times New Roman","Verdana","Tahoma","Trebuchet MS","Palatino","Garamond","Impact"]) {
        assert.ok(rich.includes('["' + font + '"'));
    }
    assert.match(rich, /const SAFE_FONT_VALUES = new Set\(SAFE_FONTS\.values\(\)\)/);
});



check("Al abrir una conversación o redactar, la lista lateral se oculta y el detalle ocupa todo el ancho", () => {
    assert.match(ui, /classList\.add\("is-detail-open"\)/);
    assert.match(css, /#inbox-modal-content\.is-detail-open \.inbox-conversation-sidebar\s*\{[^}]*display:none !important/s);
    assert.match(css, /#inbox-modal-content\.is-detail-open \.inbox-conversations-view\s*\{[^}]*grid-template-columns:minmax\(0,1fr\)/s);
    assert.match(css, /#inbox-modal-content\.is-detail-open \.inbox-mobile-back\s*\{[^}]*display:inline-flex/s);
});
check("El compositor aprovecha la altura, elimina el título redundante y compacta el asunto", () => {
    assert.doesNotMatch(ui, /inbox-new-title|Nuevo mensaje\"\)/);
    assert.match(css, /\.inbox-new-conversation-form \.inbox-editor-shell\s*\{[^}]*min-height:260px/s);
    assert.match(css, /\.inbox-new-conversation-form \.inbox-editor-shell \.inbox-rich-editor\s*\{[^}]*min-height:240px/s);
    assert.match(css, /#inbox-new-subject\s*\{[^}]*height:34px;[^}]*padding:5px 9px/s);
    assert.match(css, /\.inbox-pagination\s*\{[^}]*margin-top:auto/s);
    assert.match(css, /\.inbox-search-row input\s*\{[^}]*height:32px;[^}]*padding:4px 8px/s);
});
check("Los scrollbars del Inbox usan un indicador fino, redondeado, translúcido y oculto hasta interacción", () => {
    assert.match(css, /scrollbar-width:thin;\s*scrollbar-color:transparent transparent/);
    assert.match(css, /::-webkit-scrollbar-thumb[\s\S]*?border-radius:999px/);
    assert.match(css, /:hover::-webkit-scrollbar-thumb[\s\S]*?background:color-mix/);
});
check("Los editores eliminan el texto de demostración heredado sin reemplazar el placeholder", () => {
    assert.match(rich, /export function stripRichTextDemoPlaceholder\(value\)/);
    assert.match(rich, /text\.toLocaleLowerCase\(\) === "texto en negrita" \? "" : source/);
    assert.match(rich, /sanitizeHtmlContent\(stripRichTextDemoPlaceholder\(source\.value \|\| ""\), mode\)/);
    assert.match(ui, /sanitizeHtmlContent\(stripRichTextDemoPlaceholder\(initialHtml \|\| ""\), "advanced"\)/);
    assert.doesNotMatch(rich, /selected \|\| "texto en negrita"/);
});

check("Los formularios distinguen editores básicos, editores con listas y el Inbox completo", () => {
    assert.ok(ui.includes('mode: LIST_RICH_TEXT_FIELDS_.has(String(targetId)) ? "lists" : "basic"'));
    assert.ok(rich.includes('mode === "basic" && format !== "bold"'));
    assert.ok(rich.includes('mode === "lists" && !["bold", "ul", "ol"].includes(format)'));
    assert.ok(ui.includes('createRichTextToolbar(targetId, { forceAdvanced: true, compact: true })'));
});
check("Los campos básicos muestran negrita y color sin controles de listas ni tipografía adicional", () => {
    const toolbar = rich.slice(rich.indexOf("export function createRichTextToolbar("), rich.indexOf("export function refreshRichTextToolbars("));
    assert.ok(toolbar.includes('makeButton("B", "Negrita"'));
    assert.ok(toolbar.includes('colorPicker.type = "color"'));
    assert.ok(main.includes("createRichTextToolbar('contact-message', { mode: 'basic' })"));
    assert.ok(addCortes.includes("createRichTextToolbar(targetId, { mode: 'basic' })"));
});
check("Tutoriales y problemas habilitan listas, marcadores elegibles y listas numeradas", () => {
    for (const id of ["tut-desc","pys-detalle","pys-solucion","pys-prevenir"]) assert.ok(ui.includes('data-rich-target="' + id + '"') || ui.includes('"' + id + '"'));
    assert.ok(ui.includes("edit-tutorial-details-textarea"));
    assert.ok(ui.includes("edit-pys-prev-textarea"));
    assert.ok(rich.includes('option value="arrow">→ Flecha'));
    assert.ok(rich.includes('option value="check">✓ Verificación'));
    assert.ok(rich.includes('makeButton("• Lista", "Lista no ordenada"'));
    assert.ok(rich.includes('makeButton("1. Lista", "Lista ordenada"'));
});
check("Los campos enriquecidos se editan visualmente y sincronizan HTML saneado con el textarea fuente", () => {
    assert.ok(rich.includes("export function mountRichTextEditors("));
    assert.ok(rich.includes('editor.setAttribute("contenteditable", "true")'));
    assert.ok(rich.includes("source.hidden = true"));
    assert.ok(rich.includes("source.value = sanitizeHtmlContent(editor.innerHTML, mode)"));
    assert.ok(rich.includes('editor.addEventListener("blur"'));
    assert.ok(rich.includes('editor.addEventListener("paste"'));
    assert.ok(rich.includes("truncateRichEditor_(editor, limit)"));
    assert.ok(rich.includes('source.dispatchEvent(new Event("input", { bubbles: true }))'));
    assert.ok(rich.includes('form.addEventListener("submit"'));
});
check("El sanitizador mantiene listas solo en el modo de tutoriales y problemas y limita el modo básico", () => {
    assert.ok(rich.includes('mode === "lists"'));
    assert.ok(rich.includes('new Set(["B", "STRONG", "SPAN", "BR", "P", "DIV", "OL", "UL", "LI"])'));
    assert.ok(rich.includes('new Set(["B", "STRONG", "SPAN", "BR", "P", "DIV"])'));
    assert.ok(rich.includes('property === "color"'));
});
check("Los cambios programáticos del formulario independiente sincronizan el editor visible", () => {
    assert.ok(addCortes.includes("mountRichTextEditors(document)"));
    assert.ok(addCortes.includes("syncRichTextEditorFromSource(textarea)"));
    assert.ok(css.includes(".rich-text-visual-editor:empty::before"));
});

let passed = 0;
for (const item of cases) {
    try { item.fn(); passed++; console.log("PASS " + item.name); }
    catch (error) { console.error("FAIL " + item.name + ": " + (error && error.message || error)); }
}
console.log("InboxUi: " + passed + "/" + cases.length + " PASS");
if (passed !== cases.length) process.exitCode = 1;
