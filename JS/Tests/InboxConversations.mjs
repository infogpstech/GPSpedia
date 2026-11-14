import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../Services/InboxConversations.js", import.meta.url), "utf8");
const feedbackSource = readFileSync(new URL("../../Services/feedback.js", import.meta.url), "utf8");
const coordinatorSource = readFileSync(new URL("../../Services/Coordinator.js", import.meta.url), "utf8");

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
users.getRange(1, 1, 9, 9).setValues([
    ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo","Nombre_Completo","SessionToken","TermsAcceptance"],
    ["U1","developer","","Desarrollador","","","Ana Desarrolladora","",""],
    ["U2","tecnico","","Técnico","","","Bruno Técnico","",""],
    ["U3","dev2","","Desarrollador","","","Carla Desarrolladora","",""],
    ["U4","__deleted__:old","","Técnico","","","Cuenta eliminada","",""],
    ["U5","tecnico2","","Técnico","","","Diego Técnico","",""],
    ["U6","supervisor","","Supervisor","","","Elena Supervisora","",""],
    ["U7","jefe","","Jefe","","","Fabio Jefe","",""],
    ["U8","tecnico_ext","","Tecnico_exterior","","","Gabriela Técnica exterior","",""]
]);
const tokens = new Map([["token-a","U1"],["token-b","U2"],["token-c","U3"],["token-d","U6"],["token-e","U7"],["token-f","U8"]]);
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
    source + "\nreturn { handleGetInboxRecipients, handleCreateInboxConversation, handleSendInboxMessage, handleGetInboxConversations, handleGetInboxMessages, handleMarkInboxRead, handleArchiveInboxConversation, inboxCanStartConversationWith_ };"
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
    assert.deepEqual(result.recipients.map(user => user.id),["U2","U3","U5","U6","U7","U8"]);
    assert.equal(result.recipients.some(user => user.id === "U4"),false);
});
run("La jerarquía limita destinatarios disponibles por rol", () => {
    assert.deepEqual(api.handleGetInboxRecipients(actor("U2","token-b")).recipients.map(user => user.id),["U6"]);
    assert.deepEqual(api.handleGetInboxRecipients(actor("U8","token-f")).recipients.map(user => user.id),["U6"]);
    assert.deepEqual(api.handleGetInboxRecipients(actor("U6","token-d")).recipients.map(user => user.id),["U7"]);
    assert.deepEqual(api.handleGetInboxRecipients(actor("U7","token-e")).recipients.map(user => user.id),["U2","U5","U6","U8"]);
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
run("Rechaza difusión y destinatarios múltiples", () => {
    assert.throws(() => api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U2",recipientIds:["U2","U3"],
        subject:"Difusión",category:"general",body:"No debe enviarse.",idempotencyKey:"create-broadcast-01"
    }),/no se permite difusión/);
});
run("Rechaza tipos de mensaje y adjuntos no soportados", () => {
    assert.throws(() => api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U2",subject:"Imagen",category:"general",body:"No es texto.",
        messageType:"image",idempotencyKey:"create-image-0001"
    }),/solo admite mensajes de texto/);
    assert.throws(() => api.handleSendInboxMessage({
        ...actor("U1","token-a"),conversationId:first.conversationId,body:"Adjunto",
        attachments:[{name:"archivo.png"}],idempotencyKey:"send-attachment-01"
    }),/adjuntos no están soportados/);
});
run("Una clave de creación no se puede reutilizar con otro contenido", () => {
    assert.throws(() => api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U2",subject:"Otro asunto",category:"general",
        body:"Contenido distinto.",idempotencyKey:"create-key-0001"
    }),/otro contenido/);
});
run("Técnico y Técnico exterior pueden iniciar mensajes solo a Supervisor", () => {
    for (const [id,token,key] of [["U2","token-b","tech-supervisor-01"],["U8","token-f","ext-supervisor-01"]]) {
        const result = api.handleCreateInboxConversation({
            ...actor(id,token),recipientId:"U6",subject:"Consulta técnica",category:"soporte",
            body:"¿Cómo identifico la línea IGN?",idempotencyKey:key
        });
        assert.ok(result.conversationId);
    }
    const rows = spreadsheet.getSheetByName("InboxConversations").rows;
    assert.equal(rows[3][5],"direct");
    assert.equal(rows[4][5],"direct");
});
run("Supervisor solo puede iniciar mensajes a Jefe y Jefe a rangos inferiores", () => {
    const supervisor = api.handleCreateInboxConversation({
        ...actor("U6","token-d"),recipientId:"U7",subject:"Seguimiento",category:"general",
        body:"Revisemos el avance.",idempotencyKey:"supervisor-jefe-01"
    });
    const jefe = api.handleCreateInboxConversation({
        ...actor("U7","token-e"),recipientId:"U5",subject:"Asignación",category:"general",
        body:"Por favor revisa el registro.",idempotencyKey:"jefe-tecnico-01"
    });
    assert.ok(supervisor.conversationId && jefe.conversationId);
});
run("Rechaza escalamiento o destinatarios fuera de la jerarquía", () => {
    for (const [id,token,recipientId,key] of [
        ["U2","token-b","U1","tech-dev-01"],
        ["U2","token-b","U5","tech-peer-01"],
        ["U6","token-d","U2","supervisor-tech-01"],
        ["U7","token-e","U1","jefe-dev-01"]
    ]) {
        assert.throws(() => api.handleCreateInboxConversation({
            ...actor(id,token),recipientId,subject:"No autorizado",category:"general",
            body:"No debe crearse.",idempotencyKey:key
        }),/jerarquía de comunicación/);
    }
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
    assert.equal(sent.idempotentReplay,false);
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
run("La auditoría distingue la lectura de cada participante", () => {
    const followup = api.handleSendInboxMessage({
        ...actor("U2","token-b"),conversationId:first.conversationId,
        body:"Mensaje para comprobar lectura por participante.",idempotencyKey:"audit-reply-0001"
    });
    api.handleMarkInboxRead({ ...actor("U1","token-a"),conversationId:first.conversationId,throughMessageId:followup.messageId });
    api.handleMarkInboxRead({ ...actor("U2","token-b"),conversationId:first.conversationId,throughMessageId:followup.messageId });
    const audit = spreadsheet.getSheetByName("InboxConversationAudit").rows.slice(1)
        .filter(row => row[4] === "read" && row[6] === followup.messageId);
    assert.deepEqual(audit.map(row => row[2]).sort(),["U1","U2"]);
});
run("Las solicitudes de lectura tardías no hacen retroceder el marcador", () => {
    const newest = api.handleSendInboxMessage({
        ...actor("U2","token-b"),conversationId:first.conversationId,
        body:"Mensaje más reciente para probar el orden.",idempotencyKey:"read-order-0001"
    });
    api.handleMarkInboxRead({ ...actor("U1","token-a"),conversationId:first.conversationId,throughMessageId:newest.messageId });
    const stale = api.handleMarkInboxRead({ ...actor("U1","token-a"),conversationId:first.conversationId,throughMessageId:firstMessageId });
    assert.equal(stale.unreadCount,0);
    const state = spreadsheet.getSheetByName("InboxConversationState").rows
        .find(row => row[0] === first.conversationId && row[1] === "U1");
    assert.equal(state[3],newest.messageId);
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
run("El filtro de categoría limita resultados antes de paginar", () => {
    api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U3",subject:"Acceso a la plataforma",category:"acceso",
        body:"Revisar permisos de acceso.",idempotencyKey:"category-filter-0001"
    });
    const filtered = api.handleGetInboxConversations({
        ...actor("U1","token-a"),folder:"sent",category:"acceso",pageSize:1,cursor:"0"
    });
    assert.equal(filtered.total,1);
    assert.equal(filtered.data.length,1);
    assert.equal(filtered.data[0].category,"acceso");
    assert.equal(filtered.hasMore,false);
    assert.throws(() => api.handleGetInboxConversations({
        ...actor("U1","token-a"),category:"invalida"
    }),/categoría/);
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
run("La paginación de mensajes entrega primero los más recientes y permite recorrer todo el historial", () => {
    const latest = api.handleGetInboxMessages({ ...actor("U1","token-a"),conversationId:first.conversationId,pageSize:1,cursor:"0" });
    assert.equal(latest.data.length,1);
    assert.equal(latest.hasMore,true);
    const ids = [latest.data[0].messageId];
    let cursor = latest.nextCursor, pages = 0;
    while (cursor !== null && pages < 20) {
        const older = api.handleGetInboxMessages({ ...actor("U1","token-a"),conversationId:first.conversationId,pageSize:1,cursor });
        assert.equal(older.data.length,1);
        ids.push(older.data[0].messageId);
        cursor = older.nextCursor;
        pages++;
    }
    assert.equal(cursor,null,"La paginación debe terminar.");
    assert.equal(new Set(ids).size,ids.length,"No debe repetir mensajes entre páginas.");
    assert.equal(ids.length,latest.total,"Debe recorrer todos los mensajes del historial.");
});
run("Las mutaciones Inbox se coordinan con cambios de identidad y otras escrituras FEEDBACK", () => {
    const match = feedbackSource.match(/function isSharedMutationAction_\(action\)\s*\{[\s\S]*?\n\}/);
    assert.ok(match,"No se encontró el filtro de mutaciones coordinadas de FEEDBACK.");
    const isSharedMutationAction = new Function(match[0] + "; return isSharedMutationAction_;")();
    const coordinatorPolicy = new Function(coordinatorSource + "\nreturn coordinatorPolicy_;");
    for (const action of ["createInboxConversation","sendInboxMessage","markInboxRead","archiveInboxConversation"]) {
        assert.equal(isSharedMutationAction(action),true,action+" debe adquirir una lease compartida.");
        assert.deepEqual(coordinatorPolicy()("FEEDBACK",action),{
            readResources:["USERS","ACTIVE_SESSIONS"],writeResources:["ACTIVE_SESSIONS","FEEDBACK"],sharedWriteResources:[],maintenance:false,nestedActions:{}
        });
    }
});
console.log("InboxConversations: " + passed + "/" + passed + " PASS");
