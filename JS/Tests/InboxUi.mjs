import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeInboxMessagePages } from "../Frontend/inboxPageCache.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = path => readFileSync(resolve(ROOT, path), "utf8");
const ui = read("JS/Frontend/ui.js"), html = read("index.html"), css = read("style.css"), api = read("JS/Frontend/api-config.js");
const index = read("index.html"), users = read("HTML/users.html");
const cases = [];
function check(name, fn) { cases.push({ name, fn }); }

check("El módulo UI conserva sintaxis ECMAScript válida", () => {
    const result = spawnSync(process.execPath, ["--input-type=module", "--check"], { input: ui, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || "ui.js no pasó el análisis sintáctico.");
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
    assert.match(ui, /messageBody\.innerHTML\s*=\s*sanitizeHtmlContent\(String\(message\.body \|\| ""\)\)/);
    assert.match(ui, /createRichTextToolbar\(textarea\.id\)/);
    assert.match(ui, /createRichTextToolbar\(body\.id\)/);
    assert.match(ui, /form\.append\(label, toolbar, textarea, status, send\)/);
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
    assert.match(ui, /body\.maxLength = 5000/);
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
check("La barra móvil elimina filtros de lectura y distribuye cinco acciones con espacios uniformes", () => {
    assert.match(html, /data-inbox-folder="received"[^>]*>[\s\S]*<span>Recibidos<\/span>/);
    assert.doesNotMatch(html, /data-inbox-folder="read"|data-inbox-folder="unread"/);
    assert.match(html, /id="inbox-new-message"/);
    assert.match(html, /id="inbox-search-toggle"/);
    assert.match(html, /id="inbox-new-message"[^>]*>[\s\S]*<span>Nuevo<\/span>/);
    assert.match(html, /id="inbox-search-toggle"[^>]*>[\s\S]*<span>Buscar<\/span>/);
    assert.match(css, /inbox-floating-new-message[\s\S]*?position:absolute/);
    assert.match(ui, /Salir y cancelar el mensaje nuevo/);
    assert.match(css, /inbox-folder-nav button\[hidden\][\s\S]*?display:none !important/);
    assert.match(css, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,1fr\)\)/);
    assert.match(css, /inbox-folder-nav button\[aria-pressed="true"\][\s\S]*?min-width:0/);
    assert.match(css, /inbox-folder-nav \.inbox-folder-action[\s\S]*?width:100%/);
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
check("Crear y buscar comparten la barra de iconos de las carpetas", () => {
    const folderStart = html.indexOf('id="inbox-folder-nav"');
    const folderEnd = html.indexOf("</nav>", folderStart);
    const folderMarkup = html.slice(folderStart, folderEnd);
    assert.ok(folderStart >= 0 && folderEnd > folderStart);
    assert.match(folderMarkup, /id="inbox-new-message"/);
    assert.match(folderMarkup, /id="inbox-search-toggle"/);
    assert.doesNotMatch(html.slice(html.indexOf('class="inbox-header-actions"'), folderStart), /inbox-new-message|inbox-search-toggle/);
    assert.match(ui, /if \(newMessageButton\) newMessageButton\.hidden = nextView !== "conversations"/);
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
    assert.match(css, /\.inbox-new-conversation-form\s*\{[^}]*flex:\s*1 1 0/s);
    assert.match(css, /\.inbox-new-conversation-form\s*\{[^}]*overflow-y:\s*auto/s);
    assert.match(css, /\.inbox-compose-actions\s*\{[^}]*position:\s*sticky/s);
    assert.match(ui, /formActions\.append\(makeCancelButton\(\), send\)/);
});
check("Plantilla y categoría comparten una fila inmediatamente antes del editor", () => {
    assert.match(ui, /templateCategoryRow\.append\(templateField, categoryField\)/);
    assert.match(ui, /form\.append\(bodyLabel, toolbar, body\)/);
    assert.match(css, /\.inbox-template-category-row\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,1fr\)\)/s);
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

let passed = 0;
for (const item of cases) {
    try { item.fn(); passed++; console.log("PASS " + item.name); }
    catch (error) { console.error("FAIL " + item.name + ": " + (error && error.message || error)); }
}
console.log("InboxUi: " + passed + "/" + cases.length + " PASS");
if (passed !== cases.length) process.exitCode = 1;
