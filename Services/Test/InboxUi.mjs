import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = path => readFileSync(resolve(ROOT, path), "utf8");
const ui = read("ui.js"), html = read("index.html"), css = read("style.css"), api = read("api-config.js");
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
    assert.match(ui, /ensureUiSessionRole_\(\['desarrollador', 'gefe', 'jefe', 'supervisor', 'tecnico', 'tecnico_exterior'\]\)/);
    assert.match(ui, /'tecnico', 'tecnico_exterior'\]\.includes\(userRole\)/);
});
check("Las solicitudes históricas siguen separadas y conservan sus contenedores", () => {
    assert.match(html, /id="inbox-requests-view"/);
    assert.match(html, /id="inbox-list"/);
    assert.match(html, /id="inbox-detail"/);
    assert.match(ui, /loadAndRenderInbox\(\{ context, reset:/);
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
check("El estado de lectura y archivo usa las acciones del backend", () => {
    assert.match(ui, /markInboxRead\(conversationId, latest\.messageId, context\)/);
    assert.match(ui, /archiveInboxConversation\(item\.conversationId, !item\.archived, context\)/);
});
check("Las notificaciones internas reflejan el total de conversaciones no leídas", () => {
    assert.match(html, /id="inbox-notification-count"/);
    assert.match(ui, /counts && counts\.unread/);
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
    for (const name of ["getInboxRecipients","getInboxConversations","getInboxMessages","createInboxConversation","sendInboxMessage","markInboxRead","archiveInboxConversation"]) {
        assert.match(api, new RegExp("export async function " + name + "\\("));
    }
});
check("El modal mantiene los controles de lectura para tecnologías de asistencia", () => {
    assert.match(html, /id="inbox-conversation-list"[^>]*aria-live="polite"/);
    assert.match(html, /id="inbox-conversation-status"[^>]*role="status"[^>]*aria-live="polite"/);
    assert.match(ui, /setAttribute\("aria-pressed"/);
});

let passed = 0;
for (const item of cases) {
    try { item.fn(); passed++; console.log("PASS " + item.name); }
    catch (error) { console.error("FAIL " + item.name + ": " + (error && error.message || error)); }
}
console.log("InboxUi: " + passed + "/" + cases.length + " PASS");
if (passed !== cases.length) process.exitCode = 1;
