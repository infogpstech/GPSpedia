import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../InboxConversations.js", import.meta.url), "utf8");

class FakeSheet {
    constructor(name) { this.name = name; this.rows = []; }
    getLastRow() { return this.rows.length; }
    getLastColumn() { return this.rows.reduce((max, row) => Math.max(max, row.length), 0); }
    getRange(row, column, rowCount = 1, columnCount = 1) {
        const sheet = this;
        return {
            getValues() {
                const result = [];
                for (let r = row - 1; r < row - 1 + rowCount; r++) {
                    const current = sheet.rows[r] || [];
                    result.push(Array.from({ length: columnCount }, (_, c) => current[column - 1 + c] ?? ""));
                }
                return result;
            },
            setValues(values) {
                values.forEach((valuesRow, r) => {
                    const targetIndex = row - 1 + r;
                    while (sheet.rows.length <= targetIndex) sheet.rows.push([]);
                    valuesRow.forEach((value, c) => { sheet.rows[targetIndex][column - 1 + c] = value; });
                });
            },
            getValue() { return this.getValues()[0][0]; },
            setValue(value) { this.setValues([[value]]); }
        };
    }
    getDataRange() { return this.getRange(1, 1, this.getLastRow(), Math.max(1, this.getLastColumn())); }
}
class FakeSpreadsheet {
    constructor() { this.sheets = new Map(); }
    getSheetByName(name) { return this.sheets.get(name) || null; }
    insertSheet(name) { const sheet = new FakeSheet(name); this.sheets.set(name, sheet); return sheet; }
}
let uuid = 0, lockAcquired = 0, lockReleased = 0;
const spreadsheet = new FakeSpreadsheet();
const users = spreadsheet.insertSheet("Users");
users.getRange(1, 1, 6, 9).setValues([
    ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo","Nombre_Completo","SessionToken","TermsAcceptance"],
    ["U1","developer","","Desarrollador","","","Ana Desarrolladora","",""],
    ["U2","tecnico","","Técnico","","","Bruno Técnico","",""],
    ["U3","dev2","","Desarrollador","","","Carla Desarrolladora","",""],
    ["U4","__deleted__:old","","Técnico","","","Cuenta eliminada","",""],
    ["U5","tecnico2","","Técnico","","","Diego Técnico","",""]
]);
const tokens = new Map([["token-a","U1"],["token-b","U2"],["token-c","U3"]]);
function normalizeRole(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}
function assertSession(payload) {
    const id = tokens.get(String(payload.sessionToken || ""));
    if (!id || id !== String(payload.userId || "")) throw new Error("Sesión inválida.");
    const row = users.rows.slice(1).find(item => item[0] === id);
    if (!row || String(row[1]).startsWith("__deleted__:")) throw new Error("Usuario inactivo.");
    return { userId: id, userName: row[6], role: row[3] };
}
const Utilities = {
    DigestAlgorithm: { SHA_256: "SHA_256" },
    Charset: { UTF_8: "UTF_8" },
    getUuid: () => "uuid-" + String(++uuid).padStart(8, "0"),
    computeDigest: (_algorithm, value) => Array.from(String(value)).map(char => char.charCodeAt(0) & 255)
};
const LockService = {
    getScriptLock: () => ({
        waitLock() { lockAcquired++; },
        releaseLock() { lockReleased++; }
    })
};
const SpreadsheetApp = { flush() {} };
const api = new Function(
    "getSpreadsheet","LockService","SpreadsheetApp","Utilities","assertFeedbackSession","normalizeFeedbackRole",
    source + "\nreturn { handleGetInboxRecipients, handleCreateInboxConversation, handleSendInboxMessage, handleGetInboxConversations, handleGetInboxMessages, handleMarkInboxRead, handleArchiveInboxConversation };"
)(() => spreadsheet, LockService, SpreadsheetApp, Utilities, assertSession, normalizeRole);

const actor = (id, token) => ({ userId: id, sessionToken: token });
const run = (name, callback) => { callback(); passed++; console.log("PASS " + name); };
let passed = 0;
const first = api.handleCreateInboxConversation({
    ...actor("U1","token-a"), recipientId:"U2", subject:"Bienvenida", category:"general",
    body:"Hola Bruno, bienvenido a GPSpedia.", idempotencyKey:"create-key-0001"
});
run("Crea conversación directa individual desde Desarrollador", () => {
    assert.equal(first.status,"success");
    assert.ok(first.conversationId);
    assert.equal(spreadsheet.getSheetByName("InboxConversations").getLastRow(),2);
    assert.equal(spreadsheet.getSheetByName("InboxMessages").getLastRow(),2);
    assert.equal(spreadsheet.getSheetByName("Feedbacks"),null);
    assert.equal(spreadsheet.getSheetByName("Contactanos"),null);
});
run("Destinatarios de Desarrollador provienen de USERS y excluyen cuentas inactivas", () => {
    const result = api.handleGetInboxRecipients(actor("U1","token-a"));
    assert.deepEqual(result.recipients.map(user => user.id),["U2","U3","U5"]);
    assert.equal(result.recipients.some(user => user.id === "U4"),false);
});
run("La consulta de usuario solo ofrece destinatarios Desarrollador", () => {
    const result = api.handleGetInboxRecipients(actor("U2","token-b"));
    assert.deepEqual(result.recipients.map(user => user.id),["U1","U3"]);
});
run("La creación idempotente devuelve el mismo hilo sin duplicar mensaje", () => {
    const replay = api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U2",subject:"Bienvenida",category:"general",
        body:"Hola Bruno, bienvenido a GPSpedia.",idempotencyKey:"create-key-0001"
    });
    assert.equal(replay.conversationId,first.conversationId);
    assert.equal(replay.idempotentReplay,true);
    assert.equal(spreadsheet.getSheetByName("InboxMessages").getLastRow(),2);
});
run("Una clave de creación no se puede reutilizar con otro contenido", () => {
    assert.throws(() => api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U2",subject:"Otro asunto",category:"general",
        body:"Contenido distinto.",idempotencyKey:"create-key-0001"
    }),/otro contenido/);
});
run("Un usuario puede iniciar una consulta dirigida solo a Desarrollador", () => {
    const result = api.handleCreateInboxConversation({
        ...actor("U2","token-b"),recipientId:"U1",subject:"Consulta técnica",category:"soporte",
        body:"¿Cómo identifico la línea IGN?",idempotencyKey:"consult-key-001"
    });
    assert.ok(result.conversationId);
    const rows = spreadsheet.getSheetByName("InboxConversations").rows;
    assert.equal(rows[2][5],"developer_consult");
});
run("Rechaza destinatarios no Desarrollador para consultas de usuarios", () => {
    assert.throws(() => api.handleCreateInboxConversation({
        ...actor("U2","token-b"),recipientId:"U5",subject:"Consulta",category:"general",
        body:"No corresponde.",idempotencyKey:"consult-key-002"
    }),/solo pueden dirigirse/);
});
run("Rechaza destinatario inactivo o inexistente", () => {
    assert.throws(() => api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U4",subject:"Mensaje",category:"general",
        body:"No enviar.",idempotencyKey:"create-key-0002"
    }),/inactivo/);
});
run("Rechaza identidad falsificada con token de otra cuenta", () => {
    assert.throws(() => api.handleGetInboxConversations(actor("U1","token-b")),/Sesión inválida/);
});
run("El destinatario solo ve sus conversaciones y el contador unread inicial", () => {
    const result = api.handleGetInboxConversations({ ...actor("U2","token-b"),folder:"received" });
    assert.equal(result.data.length,1);
    assert.equal(result.data[0].conversationId,first.conversationId);
    assert.equal(result.data[0].unreadCount,1);
    assert.equal(result.counts.unread,1);
});
run("El participante no autorizado no puede leer mensajes", () => {
    assert.throws(() => api.handleGetInboxMessages({ ...actor("U3","token-c"),conversationId:first.conversationId }),/permiso/);
});
const initialMessages = api.handleGetInboxMessages({ ...actor("U2","token-b"),conversationId:first.conversationId });
const firstMessageId = initialMessages.data[0].messageId;
const reply = { ...actor("U2","token-b"),conversationId:first.conversationId,body:"Gracias por la bienvenida.",idempotencyKey:"reply-key-0001" };
const sent = api.handleSendInboxMessage(reply);
run("Permite respuesta bidireccional y actualiza no leídos del otro participante", () => {
    assert.equal(sent.status,"success");
    const unread = api.handleGetInboxConversations({ ...actor("U1","token-a"),folder:"unread" });
    assert.equal(unread.data[0].unreadCount,1);
});
run("El reintento del mismo mensaje es idempotente y no duplica el contador", () => {
    const replay = api.handleSendInboxMessage(reply);
    assert.equal(replay.messageId,sent.messageId);
    assert.equal(replay.idempotentReplay,true);
    assert.equal(spreadsheet.getSheetByName("InboxMessages").getLastRow(),4);
    const unread = api.handleGetInboxConversations({ ...actor("U1","token-a"),folder:"unread" });
    assert.equal(unread.data[0].unreadCount,1);
});
run("Una clave de mensaje no se puede reutilizar con otro cuerpo", () => {
    assert.throws(() => api.handleSendInboxMessage({ ...reply,body:"Cuerpo diferente." }),/otro contenido/);
});
run("El autor no puede consultar una conversación ajena aunque conozca su ID", () => {
    assert.throws(() => api.handleArchiveInboxConversation({
        ...actor("U3","token-c"),conversationId:first.conversationId,archived:true
    }),/permiso/);
});
run("Marca como leído hasta el mensaje indicado sin borrar mensajes posteriores", () => {
    const result = api.handleMarkInboxRead({
        ...actor("U1","token-a"),conversationId:first.conversationId,throughMessageId:sent.messageId
    });
    assert.equal(result.unreadCount,0);
    const unread = api.handleGetInboxConversations({ ...actor("U1","token-a"),folder:"unread" });
    assert.equal(unread.total,1);
    assert.equal(unread.data.some(item => item.conversationId === first.conversationId),false);
});
run("Archivo y restauración son estados privados por participante", () => {
    api.handleArchiveInboxConversation({ ...actor("U1","token-a"),conversationId:first.conversationId,archived:true });
    assert.equal(api.handleGetInboxConversations({ ...actor("U1","token-a"),folder:"archived" }).total,1);
    assert.equal(api.handleGetInboxConversations({ ...actor("U2","token-b"),folder:"received" }).total,1);
    api.handleArchiveInboxConversation({ ...actor("U1","token-a"),conversationId:first.conversationId,archived:false });
    assert.equal(api.handleGetInboxConversations({ ...actor("U1","token-a"),folder:"all" }).total,2);
});
run("Búsqueda y paginación respetan carpeta y cursor", () => {
    api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U3",subject:"Consulta de relay",category:"soporte",
        body:"Revisar configuración.",idempotencyKey:"create-key-0003"
    });
    const page = api.handleGetInboxConversations({ ...actor("U1","token-a"),folder:"sent",query:"relay",pageSize:1,cursor:"0" });
    assert.equal(page.data.length,1);
    assert.equal(page.data[0].subject,"Consulta de relay");
    assert.equal(page.hasMore,false);
});
run("El registro de auditoría no almacena el cuerpo del mensaje", () => {
    const audit = spreadsheet.getSheetByName("InboxConversationAudit");
    assert.ok(audit.getLastRow() >= 4);
    assert.equal(audit.rows.slice(1).some(row => String(row[7]).includes("bienvenida")),false);
});
run("Las mutaciones liberan el lock incluso cuando una validación falla", () => {
    const before = lockReleased;
    assert.throws(() => api.handleArchiveInboxConversation({
        ...actor("U1","token-a"),conversationId:"inexistente",archived:true
    }),/No se encontró/);
    assert.ok(lockReleased > before);
});
run("El mensaje se conserva como texto literal y no se ejecuta ni interpreta HTML", () => {
    const result = api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U2",subject:"Texto literal",category:"general",
        body:"<img src=x onerror=alert(1)>",idempotencyKey:"create-key-0004"
    });
    const messages = api.handleGetInboxMessages({ ...actor("U2","token-b"),conversationId:result.conversationId });
    assert.equal(messages.data[0].body,"<img src=x onerror=alert(1)>");
});
run("La lectura no crea ni modifica Feedbacks/Contactanos históricos", () => {
    assert.equal(spreadsheet.getSheetByName("Feedbacks"),null);
    assert.equal(spreadsheet.getSheetByName("Contactanos"),null);
});
run("La paginación de mensajes entrega primero los más recientes y permite cargar anteriores", () => {
    const latest = api.handleGetInboxMessages({ ...actor("U1","token-a"),conversationId:first.conversationId,pageSize:1,cursor:"0" });
    assert.equal(latest.data.length,1);
    assert.equal(latest.hasMore,true);
    const older = api.handleGetInboxMessages({ ...actor("U1","token-a"),conversationId:first.conversationId,pageSize:1,cursor:latest.nextCursor });
    assert.equal(older.data.length,1);
    assert.equal(older.hasMore,false);
    assert.notEqual(latest.data[0].messageId,older.data[0].messageId);
});
console.log("InboxConversations: " + passed + "/" + passed + " PASS");
