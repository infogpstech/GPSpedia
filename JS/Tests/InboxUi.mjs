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
    assert.match(html, /id="inbox-modal-content"[^>]*role="dialog"[^>]*aria-modal="true"/);
    assert.match(html, /aria-labelledby="inbox-modal-title"/);
    assert.match(html, /aria-label="Cerrar bandeja de entrada"/);
    assert.match(ui, /activateLegalModalFocus_\(modal,[\s\S]*allowEscape: true/);
});
check("Todos los roles activos pueden abrir conversaciones", () => {
    assert.match(ui, /ensureUiSessionRole_\(\['desarrollador', 'jefe', 'supervisor', 'tecnico', 'tecnico_exterior'\]\)/);
    assert.match(ui, /'tecnico', 'tecnico_exterior'\]\.includes\(userRole\)/);
});
check("Las solicitudes históricas siguen separadas y conservan sus contenedores", () => {
    assert.match(html, /id="inbox-requests-view"/);
    assert.match(html, /id="inbox-list"/);
    assert.match(html, /id="inbox-detail"/);
    assert.match(ui, /loadAndRenderInbox\(\{ context, reset:/);
});
check("Las solicitudes históricas usan navegación móvil de una sola vista y regreso accesible", () => {
    assert.match(ui, /is-request-detail-open/);
    assert.match(ui, /mobileBack = makeElement\('button', 'inbox-mobile-back', 'Volver a solicitudes'\)/);
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
check("Los mensajes y nombres se insertan como texto, no como HTML", () => {
    assert.match(ui, /inboxCreateNode_\("p", "inbox-message-body", message\.body \|\| ""\)/);
    assert.doesNotMatch(ui, /innerHTML\s*=\s*[^;]*(message\.body|body\.value)/);
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
check("La bandeja tiene carpetas, búsqueda y paginación", () => {
    for (const folder of ["received", "unread", "sent", "archived"]) assert.match(html, new RegExp('data-inbox-folder="' + folder + '"'));
    assert.match(html, /id="inbox-conversation-search-form"/);
    assert.match(ui, /getInboxConversations\(context,[\s\S]*folder: inboxConversationFolder_/);
    assert.match(ui, /inboxConversationNextCursor_/);
});
check("El filtro visual de categorías actualiza la consulta y reinicia la paginación", () => {
    assert.match(html, /id="inbox-category-filter"/);
    assert.match(ui, /categoryFilter\.addEventListener\("change"/);
    assert.match(ui, /inboxConversationCategory_ = \["all", "general", "soporte", "acceso", "contenido", "instalacion", "otro"\]/);
    assert.match(ui, /category: inboxConversationCategory_/);
    assert.match(ui, /inboxConversationPageStack_ = \[0\]/);
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
check("La lista y los mensajes existentes permanecen visibles durante la actualización", () => {
    assert.match(ui, /if \(!inboxConversationItems_\.length && !list\.childElementCount\) list\.replaceChildren/);
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
    assert.match(css, /\.inbox-thread-messages\s*\{[^}]*overflow-y:\s*auto/s);
});
check("El diseño responde a móvil, teclado y movimiento reducido", () => {
    assert.match(css, /@media\s*\(max-width:\s*760px\)/);
    assert.match(css, /:focus-visible/);
    assert.match(css, /prefers-reduced-motion/);
});
check("Los wrappers de API conservan el contrato de Inbox", () => {
    for (const name of ["getInboxRecipients","getInboxConversations","getInboxMessages","createInboxConversation","sendInboxMessage","markInboxRead","archiveInboxConversation","closeInboxConversation"]) {
        assert.match(api, new RegExp("export async function " + name + "\\("));
    }
});
check("La paginación conserva los cursores opacos de Inbox sin convertirlos a offsets", () => {
    assert.match(ui, /inboxConversationPageStack_\.push\(inboxConversationNextCursor\)/);
    assert.doesNotMatch(ui, /inboxConversationPageStack_\.push\(Number\(inboxConversationNextCursor\)\)/);
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
    assert.doesNotMatch(ui, /markInboxUnread|deleteInboxConversation|getMyProblemReports/);
    assert.doesNotMatch(html, /inbox-mark-unread|inbox-delete-conversation|inbox-my-tickets/);
});
check("Los modales principales no usan spans como controles de cierre", () => {
    assert.doesNotMatch(index, /<span\\b[^>]*class=["'][^"']*info-close-btn/);
    assert.doesNotMatch(ui, /<span\\b[^>]*class=["'][^"']*info-close-btn/);
    assert.doesNotMatch(users, /<span\\b[^>]*class=["'][^"']*close-btn/);
});
check("Los cierres estáticos tienen type button y nombre accesible", () => {
    const buttons = [...index.matchAll(/<button\\b[^>]*class=["'][^"']*info-close-btn[^"']*["'][^>]*>/g)].map(x => x[0]);
    assert.ok(buttons.length >= 6);
    for (const button of buttons) {
        assert.match(button, /type=["']button["']/);
        assert.match(button, /aria-label=["'][^"']+["']/);
    }
});
check("Los cierres dinámicos se crean como botones no submit y tienen aria-label", () => {
    assert.match(ui, /document\\.createElement\\('button'\\);\\s*closeBtn\\.type = 'button';\\s*closeBtn\\.className = 'info-close-btn';\\s*closeBtn\\.setAttribute\\('aria-label'/);
    assert.match(ui, /closeBtn\\.type = "button";\\s*closeBtn\\.setAttribute\\("aria-label", "Cerrar ventana"\\)/);
});
check("Los botones de cierre comparten dimensiones, contraste, hover y foco visible", () => {
    assert.match(css, /\\.info-close-btn\\s*\\{[\\s\\S]*?width:\\s*40px;[\\s\\S]*?height:\\s*40px;/);
    assert.match(css, /\\.info-close-btn:hover:not\\(:disabled\\)/);
    assert.match(css, /\\.info-close-btn:focus-visible/);
    assert.match(css, /#inbox-modal-content \\.inbox-close-button \\{ top: 10px; right: 12px; \\}/);
    assert.match(css, /#replaced-image-lightbox-close \\{ top: -14px; right: -14px; \\}/);
});
check("El panel de usuarios usa el mismo patrón de cierre accesible", () => {
    const buttons = [...users.matchAll(/<button\\b[^>]*class=["'][^"']*close-btn[^"']*["'][^>]*>/g)].map(x => x[0]);
    assert.equal(buttons.length, 3);
    for (const button of buttons) {
        assert.match(button, /type=["']button["']/);
        assert.match(button, /aria-label=["'][^"']+["']/);
    }
    assert.match(users, /\\.close-btn:focus-visible/);
});
check("La animación respeta preferencias de movimiento reducido", () => {
    assert.match(css, /@media \\(prefers-reduced-motion: reduce\\)\\s*\\{\\s*\\.info-close-btn \\{ transition: none; \\}/);
    assert.match(users, /@media \\(prefers-reduced-motion: reduce\\)/);
});

let passed = 0;
for (const item of cases) {
    try { item.fn(); passed++; console.log("PASS " + item.name); }
    catch (error) { console.error("FAIL " + item.name + ": " + (error && error.message || error)); }
}
console.log("InboxUi: " + passed + "/" + cases.length + " PASS");
if (passed !== cases.length) process.exitCode = 1;
