import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/InboxConversations.js", import.meta.url), "utf8");
const feedbackSource = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const coordinatorSource = readFileSync(new URL("../Services/Coordinator.js", import.meta.url), "utf8");

class FakeSheet {
    constructor(name) { this.name = name; this.rows = []; }
    getLastRow() { return this.rows.length; }
    getLastColumn() { return this.rows.reduce((max, row) => Math.max(max, row.length), 0); }
    insertColumnBefore(column) { this.rows.forEach(row => row.splice(column - 1, 0, "")); }
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
let uuid = 0, lockAcquired = 0, lockReleased = 0, sessionValidationCount = 0;
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
const inboxSchemaHeaders = {
    InboxConversations: ["conversationId","createdAt","updatedAt","subject","category","type","status","createdById","createdByName","createdByRole","participantsJson","createKey","createHash","lastMessageId","lastMessageAt","lastMessagePreview","messageCount"],
    InboxMessages: ["messageId","conversationId","createdAt","authorId","authorName","authorRole","body","idempotencyKey","payloadHash"],
    InboxConversationState: ["conversationId","userId","lastReadAt","lastReadMessageId","archived","hasSent","hasReceived","updatedAt","lastReceivedMessageId","lastSentMessageId"],
    InboxConversationAudit: ["eventId","timestamp","actorId","actorName","action","conversationId","messageId","details"],
    InboxConversationFlags: ["conversationId","userId","unreadOverride","deleted","updatedAt"]
};
Object.entries(inboxSchemaHeaders).forEach(([name,headers]) => {
    spreadsheet.insertSheet(name).getRange(1,1,1,headers.length).setValues([headers]);
});
const tokens = new Map([["token-a","U1"],["token-b","U2"],["token-c","U3"],["token-d","U6"],["token-e","U7"],["token-f","U8"]]);
function normalizeRole(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}
function assertSession(payload) {
    sessionValidationCount++;
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
    source + "\nreturn { handleGetInboxRecipients, handleNotifyDevelopersDriveCritical, handleCreateInboxConversation, handleSendInboxMessage, handleGetInboxConversations, handleGetInboxMessages, handleMarkInboxRead, handleMarkInboxUnread, handleDeleteInboxConversation, handleArchiveInboxConversation, handleCloseInboxConversation, inboxCanStartConversationWith_, ensureInboxConversationSheets_ };"
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
run("El actor ya autenticado se reutiliza sin volver a validar la sesión dentro de Inbox", () => {
    const before = sessionValidationCount;
    const trustedActor = { userId:"U1", userName:"Ana Desarrolladora", role:"Desarrollador" };
    api.handleGetInboxRecipients({ ...actor("U1","token-a"), __feedbackActor:trustedActor });
    assert.equal(sessionValidationCount,before);
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
run("Un envío a varios usuarios produce conversaciones privadas sin exponer destinatarios", () => {
    const toU3 = api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U3",subject:"Aviso general",category:"general",
        body:"Este aviso se entrega de forma individual.",idempotencyKey:"private-multi-u3-01"
    });
    const toU5 = api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U5",subject:"Aviso general",category:"general",
        body:"Este aviso se entrega de forma individual.",idempotencyKey:"private-multi-u5-01"
    });
    const rows = spreadsheet.getSheetByName("InboxConversations").rows;
    const rowU3 = rows.find(row => row[0] === toU3.conversationId);
    const rowU5 = rows.find(row => row[0] === toU5.conversationId);
    assert.ok(rowU3 && rowU5 && toU3.conversationId !== toU5.conversationId);
    assert.deepEqual(JSON.parse(rowU3[10]).map(user => user.id),["U1","U3"]);
    assert.deepEqual(JSON.parse(rowU5[10]).map(user => user.id),["U1","U5"]);
    const u3Inbox = api.handleGetInboxConversations({ ...actor("U3","token-c"),folder:"received" });
    assert.deepEqual(u3Inbox.data.map(item => item.conversationId),[toU3.conversationId]);
    assert.equal(JSON.stringify(u3Inbox.data).includes(toU5.conversationId),false);
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
    assert.equal(rows[2][5],"direct");
    assert.equal(rows[3][5],"direct");
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
    const latestMessage = api.handleGetInboxMessages({ ...actor("U2","token-b"), conversationId:first.conversationId });
    assert.equal(result.data[0].lastMessageId,latestMessage.data[latestMessage.data.length - 1].messageId);
    assert.equal(result.data[0].unreadCount,1);
    assert.equal(result.counts.unread,1);
});
run("El participante no autorizado no puede leer mensajes", () => {
    assert.throws(() => api.handleGetInboxMessages({ ...actor("U3","token-c"),conversationId:first.conversationId }),/permiso/);
});
run("Un tercero no puede responder ni alterar el marcador de lectura", () => {
    const messagesBefore = spreadsheet.getSheetByName("InboxMessages").getLastRow();
    const statesBefore = spreadsheet.getSheetByName("InboxConversationState").getLastRow();
    assert.throws(() => api.handleSendInboxMessage({
        ...actor("U3","token-c"),conversationId:first.conversationId,body:"Respuesta no autorizada.",
        idempotencyKey:"outsider-reply-0001"
    }),/permiso/);
    assert.throws(() => api.handleMarkInboxRead({
        ...actor("U3","token-c"),conversationId:first.conversationId
    }),/permiso/);
    assert.equal(spreadsheet.getSheetByName("InboxMessages").getLastRow(),messagesBefore);
    assert.equal(spreadsheet.getSheetByName("InboxConversationState").getLastRow(),statesBefore);
});
const initialMessages = api.handleGetInboxMessages({ ...actor("U2","token-b"),conversationId:first.conversationId });
const firstMessageId = initialMessages.data[0].messageId;
api.handleMarkInboxRead({ ...actor("U2","token-b"),conversationId:first.conversationId,throughMessageId:firstMessageId });
const reply = { ...actor("U1","token-a"),conversationId:first.conversationId,body:"Seguimiento del caso.",idempotencyKey:"reply-key-0001" };
const sent = api.handleSendInboxMessage(reply);
run("Solo quien inició la conversación puede agregar comentarios", () => {
    assert.throws(() => api.handleSendInboxMessage({
        ...actor("U2","token-b"),conversationId:first.conversationId,body:"Respuesta del destinatario.",
        idempotencyKey:"recipient-reply-0001"
    }),/Solo quien inició/);
    assert.equal(sent.status,"success");
    assert.equal(sent.idempotentReplay,false);
    const unread = api.handleGetInboxConversations({ ...actor("U2","token-b"),folder:"unread" });
    assert.equal(unread.data[0].unreadCount,1);
});
run("El reintento del mismo mensaje es idempotente y no duplica el contador", () => {
    const replay = api.handleSendInboxMessage(reply);
    assert.equal(replay.messageId,sent.messageId);
    assert.equal(replay.idempotentReplay,true);
    assert.equal(spreadsheet.getSheetByName("InboxMessages").getLastRow(),7);
    const unread = api.handleGetInboxConversations({ ...actor("U2","token-b"),folder:"unread" });
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
        ...actor("U2","token-b"),conversationId:first.conversationId,throughMessageId:sent.messageId
    });
    assert.equal(result.unreadCount,0);
    const unread = api.handleGetInboxConversations({ ...actor("U2","token-b"),folder:"unread" });
    assert.equal(unread.total,0);
    assert.equal(unread.data.some(item => item.conversationId === first.conversationId),false);
});
run("La auditoría distingue la lectura de cada participante", () => {
    const followup = api.handleSendInboxMessage({
        ...actor("U1","token-a"),conversationId:first.conversationId,
        body:"Comentario para comprobar lectura por participante.",idempotencyKey:"audit-reply-0001"
    });
    api.handleMarkInboxRead({ ...actor("U2","token-b"),conversationId:first.conversationId,throughMessageId:followup.messageId });
    api.handleMarkInboxRead({ ...actor("U1","token-a"),conversationId:first.conversationId,throughMessageId:followup.messageId });
    const audit = spreadsheet.getSheetByName("InboxConversationAudit").rows.slice(1)
        .filter(row => row[4] === "read" && row[6] === followup.messageId);
    assert.deepEqual(audit.map(row => row[2]).sort(),["U1","U2"]);
});
run("Las solicitudes de lectura tardías no hacen retroceder el marcador", () => {
    const newest = api.handleSendInboxMessage({
        ...actor("U1","token-a"),conversationId:first.conversationId,
        body:"Comentario más reciente para probar el orden.",idempotencyKey:"read-order-0001"
    });
    api.handleMarkInboxRead({ ...actor("U2","token-b"),conversationId:first.conversationId,throughMessageId:newest.messageId });
    const stale = api.handleMarkInboxRead({ ...actor("U2","token-b"),conversationId:first.conversationId,throughMessageId:firstMessageId });
    assert.equal(stale.unreadCount,0);
    const state = spreadsheet.getSheetByName("InboxConversationState").rows
        .find(row => row[0] === first.conversationId && row[1] === "U2");
    assert.equal(state[3],newest.messageId);
});
run("Archivo y restauración son estados privados por participante", () => {
    api.handleArchiveInboxConversation({ ...actor("U1","token-a"),conversationId:first.conversationId,archived:true });
    assert.equal(api.handleGetInboxConversations({ ...actor("U1","token-a"),folder:"archived" }).total,1);
    assert.equal(api.handleGetInboxConversations({ ...actor("U2","token-b"),folder:"received" }).total,1);
    api.handleArchiveInboxConversation({ ...actor("U1","token-a"),conversationId:first.conversationId,archived:false });
    assert.equal(api.handleGetInboxConversations({ ...actor("U1","token-a"),folder:"all" }).total,1);
});
run("Los endpoints de conversaciones y mensajes limitan las páginas a 50 elementos", () => {
    const conversations = api.handleGetInboxConversations({
        ...actor("U1","token-a"),folder:"all",pageSize:999,cursor:"0"
    });
    assert.equal(conversations.pageSize,50);
    assert.ok(conversations.data.length <= 50);
    const messages = api.handleGetInboxMessages({
        ...actor("U1","token-a"),conversationId:first.conversationId,pageSize:999,cursor:"0"
    });
    assert.equal(messages.pageSize,50);
    assert.ok(messages.data.length <= 50);
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
run("La paginación de conversaciones tolera actividad nueva y archivo del ancla", () => {
    const initial = api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U3",subject:"Ancla de paginación",category:"general",
        body:"Primera página.",idempotencyKey:"page-anchor-base-01"
    });
    const initialRow = spreadsheet.getSheetByName("InboxConversations").rows.find(row => row[0] === initial.conversationId);
    initialRow[14] = "2099-01-01T00:00:00.000Z";
    initialRow[2] = initialRow[14];
    const firstPage = api.handleGetInboxConversations({ ...actor("U1","token-a"),folder:"sent",pageSize:1,cursor:"0" });
    assert.equal(firstPage.data[0].conversationId,initial.conversationId);
    assert.ok(firstPage.nextCursor);
    api.handleArchiveInboxConversation({ ...actor("U1","token-a"),conversationId:initial.conversationId,archived:true });
    const newer = api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U3",subject:"Conversación posterior",category:"general",
        body:"Se creó después de consultar la primera página.",idempotencyKey:"page-anchor-newer-01"
    });
    const newerRow = spreadsheet.getSheetByName("InboxConversations").rows.find(row => row[0] === newer.conversationId);
    newerRow[14] = "2100-01-01T00:00:00.000Z";
    newerRow[2] = newerRow[14];
    const nextPage = api.handleGetInboxConversations({ ...actor("U1","token-a"),folder:"sent",pageSize:1,cursor:firstPage.nextCursor });
    assert.equal(nextPage.data.length,1);
    assert.notEqual(nextPage.data[0].conversationId,initial.conversationId);
    assert.notEqual(nextPage.data[0].conversationId,newer.conversationId);
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
run("La búsqueda global incluye recibidos, enviados, archivados y distintas categorías", () => {
    const conversationSheet = spreadsheet.getSheetByName("InboxConversations");
    const stateSheet = spreadsheet.getSheetByName("InboxConversationState");
    const candidates = stateSheet.rows.slice(1).filter(row => String(row[1]) === "U1").slice(0,3);
    assert.equal(candidates.length,3);
    const backups = candidates.map((state,index) => {
        const conversation = conversationSheet.rows.find(row => String(row[0]) === String(state[0]));
        assert.ok(conversation);
        const backup = { state, archived:state[4], conversation, subject:conversation[3], category:conversation[4], preview:conversation[15] };
        conversation[3] = "Caso global " + index;
        conversation[4] = index === 0 ? "general" : "acceso";
        conversation[15] = "zxq-global-inbox-2026";
        state[4] = index === 2;
        return backup;
    });
    try {
        const result = api.handleGetInboxConversations({
            ...actor("U1","token-a"),folder:"all",category:"all",query:"zxq-global-inbox-2026",pageSize:50,cursor:"0"
        });
        const ids = new Set(result.data.map(item => item.conversationId));
        assert.equal(result.total,3);
        assert.deepEqual(ids,new Set(candidates.map(row => String(row[0]))));
    } finally {
        backups.forEach(({state,archived,conversation,subject,category,preview}) => {
            state[4]=archived;conversation[3]=subject;conversation[4]=category;conversation[15]=preview;
        });
    }
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
    // Aislar la prueba del límite de frecuencia acumulado en las pruebas previas.
    for (const row of spreadsheet.getSheetByName("InboxMessages").rows.slice(1)) row[2] = "2000-01-01T00:00:00.000Z";
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
run("La paginación del historial no repite mensajes si llega uno nuevo entre páginas", () => {
    const latest = api.handleGetInboxMessages({ ...actor("U1","token-a"),conversationId:first.conversationId,pageSize:1,cursor:"0" });
    assert.equal(latest.data.length,1);
    assert.ok(latest.nextCursor);
    const appended = api.handleSendInboxMessage({
        ...actor("U1","token-a"),conversationId:first.conversationId,
        body:"Comentario agregado después de abrir la página histórica.",idempotencyKey:"page-message-race-01"
    });
    assert.ok(appended.messageId);
    const older = api.handleGetInboxMessages({
        ...actor("U1","token-a"),conversationId:first.conversationId,pageSize:1,cursor:latest.nextCursor
    });
    assert.equal(older.data.length,1);
    assert.notEqual(older.data[0].messageId,latest.data[0].messageId);
    assert.notEqual(older.data[0].messageId,appended.messageId);
});
run("Supervisor, Jefe y Desarrollador pueden cerrar casos; el cierre bloquea comentarios", () => {
    const supervisorCase = api.handleCreateInboxConversation({
        ...actor("U2","token-b"),recipientId:"U6",subject:"Reporte para Supervisor",category:"soporte",
        body:"Solicito revisión.",idempotencyKey:"close-case-supervisor-01"
    });
    assert.throws(() => api.handleCloseInboxConversation({
        ...actor("U2","token-b"),conversationId:supervisorCase.conversationId
    }),/Solo Supervisor/);
    assert.throws(() => api.handleCloseInboxConversation({
        ...actor("U3","token-c"),conversationId:supervisorCase.conversationId
    }),/permiso/);
    assert.throws(() => api.handleSendInboxMessage({
        ...actor("U6","token-d"),conversationId:supervisorCase.conversationId,body:"Respuesta del destinatario.",
        idempotencyKey:"close-case-recipient-reply-01"
    }),/Solo quien inició/);
    const closed = api.handleCloseInboxConversation({
        ...actor("U6","token-d"),conversationId:supervisorCase.conversationId
    });
    assert.equal(closed.closed,true);
    assert.equal(closed.alreadyClosed,false);
    const replay = api.handleCloseInboxConversation({
        ...actor("U6","token-d"),conversationId:supervisorCase.conversationId
    });
    assert.equal(replay.alreadyClosed,true);
    assert.throws(() => api.handleSendInboxMessage({
        ...actor("U2","token-b"),conversationId:supervisorCase.conversationId,body:"Comentario tardío.",
        idempotencyKey:"close-case-reply-01"
    }),/cerrado/);
    const supervisorRow = spreadsheet.getSheetByName("InboxConversations").rows.find(item => item[0] === supervisorCase.conversationId);
    assert.equal(supervisorRow[6],"closed");
    const jefeCase = api.handleCreateInboxConversation({
        ...actor("U6","token-d"),recipientId:"U7",subject:"Reporte para Jefe",category:"soporte",
        body:"Solicito autorización.",idempotencyKey:"close-case-jefe-01"
    });
    assert.equal(api.handleCloseInboxConversation({ ...actor("U7","token-e"),conversationId:jefeCase.conversationId }).closed,true);
    const developerCase = api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U2",subject:"Reporte para Desarrollador",category:"general",
        body:"Solicito seguimiento.",idempotencyKey:"close-case-dev-01"
    });
    assert.equal(api.handleCloseInboxConversation({ ...actor("U1","token-a"),conversationId:developerCase.conversationId }).closed,true);
    const audit = spreadsheet.getSheetByName("InboxConversationAudit").rows.slice(1)
        .filter(row => row[4] === "close" && row[5] === supervisorCase.conversationId);
    assert.equal(audit.length,1);
});
run("Las mutaciones Inbox mantienen RBAC y usan actor cacheado sin leases por acción", () => {
    const router = feedbackSource.slice(feedbackSource.indexOf("function doPost(e)"), feedbackSource.indexOf("\nconst RICH_TEXT_MODE_PROPERTY_"));
    assert.ok(router.includes("getCachedSharedSessionActor_(payload.userId, payload.sessionToken)"));
    assert.ok(!router.includes("withSharedMutationLease_"));
    for (const action of ["createInboxConversation","sendInboxMessage","markInboxRead","markInboxUnread","deleteInboxConversation","archiveInboxConversation","closeInboxConversation"]) {
        assert.ok(feedbackSource.includes(action + ":"), action + " debe permanecer declarada en FEEDBACK_ACTION_PERMISSIONS.");
    }
});
run("Los reintentos idempotentes no retroceden el último mensaje cuando hay marcas de tiempo iguales", () => {
    const created = api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U3",subject:"Orden de mensajes",category:"general",
        body:"Mensaje inicial.",idempotencyKey:"equal-time-create-01"
    });
    const second = api.handleSendInboxMessage({
        ...actor("U1","token-a"),conversationId:created.conversationId,body:"Comentario intermedio.",
        idempotencyKey:"equal-time-reply-01"
    });
    const third = api.handleSendInboxMessage({
        ...actor("U1","token-a"),conversationId:created.conversationId,body:"Respuesta más reciente.",
        idempotencyKey:"equal-time-reply-02"
    });
    const messages = spreadsheet.getSheetByName("InboxMessages").rows.filter(row => row[1] === created.conversationId);
    const sameTimestamp = "2026-11-15T12:00:00.000Z";
    messages.forEach(row => { row[2] = sameTimestamp; });
    const conversationRow = spreadsheet.getSheetByName("InboxConversations").rows.find(row => row[0] === created.conversationId);
    conversationRow[14] = sameTimestamp;
    conversationRow[13] = third.messageId;
    conversationRow[15] = "Respuesta más reciente.";
    conversationRow[16] = 3;

    api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U3",subject:"Orden de mensajes",category:"general",
        body:"Mensaje inicial.",idempotencyKey:"equal-time-create-01"
    });
    api.handleSendInboxMessage({
        ...actor("U1","token-a"),conversationId:created.conversationId,body:"Comentario intermedio.",
        idempotencyKey:"equal-time-reply-01"
    });
    assert.equal(conversationRow[13],third.messageId);
    assert.equal(conversationRow[15],"Respuesta más reciente.");
    assert.equal(conversationRow[16],3);
    assert.equal(messages.length,3);
    assert.equal(second.messageId,messages[1][0]);

    const newestPage = api.handleGetInboxMessages({
        ...actor("U1","token-a"),conversationId:created.conversationId,pageSize:1,cursor:"0"
    });
    assert.deepEqual(newestPage.data.map(message => message.messageId),[third.messageId]);
    assert.ok(newestPage.nextCursor);
    const middlePage = api.handleGetInboxMessages({
        ...actor("U1","token-a"),conversationId:created.conversationId,pageSize:1,cursor:newestPage.nextCursor
    });
    assert.deepEqual(middlePage.data.map(message => message.messageId),[second.messageId]);
    assert.ok(middlePage.nextCursor);
    const oldestPage = api.handleGetInboxMessages({
        ...actor("U1","token-a"),conversationId:created.conversationId,pageSize:1,cursor:middlePage.nextCursor
    });
    assert.deepEqual(oldestPage.data.map(message => message.messageId),[created.messageId]);
    assert.equal(oldestPage.nextCursor,null);
});

run("Los cursores inválidos se rechazan antes de consultar páginas", () => {
    assert.throws(() => api.handleGetInboxConversations({
        ...actor("U1","token-a"),folder:"sent",cursor:"cursor inválido"
    }),/cursor no es válido/i);
    assert.throws(() => api.handleGetInboxMessages({
        ...actor("U1","token-a"),conversationId:first.conversationId,cursor:"cursor inválido"
    }),/cursor no es válido/i);
});
run("El historial rechaza un cursor ancla cuyo mensaje ya no existe", () => {
    assert.throws(() => api.handleGetInboxMessages({
        ...actor("U1","token-a"),conversationId:first.conversationId,cursor:"message-anchor-expired-0001"
    }),/cursor del historial expiró/i);
});
run("La paginación de conversaciones mantiene el desempate estable por ID con timestamps iguales", () => {
    // Aislar este caso del límite de creación acumulado por las pruebas anteriores.
    const existingMessages = spreadsheet.getSheetByName("InboxMessages").rows;
    for (const row of existingMessages.slice(1)) row[2] = "2000-01-01T00:00:00.000Z";
    const one = api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U3",subject:"Cursor igual uno",category:"general",
        body:"Primera conversación de prueba.",idempotencyKey:"cursor-tie-create-01"
    });
    const two = api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U3",subject:"Cursor igual dos",category:"general",
        body:"Segunda conversación de prueba.",idempotencyKey:"cursor-tie-create-02"
    });
    const sheet = spreadsheet.getSheetByName("InboxConversations");
    const sameTimestamp = "2097-04-05T06:07:08.000Z";
    for (const id of [one.conversationId,two.conversationId]) {
        const row = sheet.rows.find(item => item[0] === id);
        row[2] = sameTimestamp;
        row[14] = sameTimestamp;
    }
    const firstPage = api.handleGetInboxConversations({
        ...actor("U1","token-a"),folder:"sent",query:"cursor igual",pageSize:1,cursor:"0"
    });
    assert.equal(firstPage.data.length,1);
    assert.equal(firstPage.data[0].conversationId,[one.conversationId,two.conversationId].sort().reverse()[0]);
    assert.ok(firstPage.nextCursor);
    const secondPage = api.handleGetInboxConversations({
        ...actor("U1","token-a"),folder:"sent",query:"cursor igual",pageSize:1,cursor:firstPage.nextCursor
    });
    assert.equal(secondPage.data.length,1);
    assert.equal(secondPage.data[0].conversationId,[one.conversationId,two.conversationId].sort()[0]);
    assert.notEqual(firstPage.data[0].conversationId,secondPage.data[0].conversationId);
});
run("El historial respeta el orden de inserción cuando las marcas de tiempo retroceden", () => {
    const created = api.handleCreateInboxConversation({
        ...actor("U1","token-a"),recipientId:"U3",subject:"Orden canónico del historial",category:"general",
        body:"Primer mensaje.",idempotencyKey:"history-order-create-01"
    });
    const second = api.handleSendInboxMessage({
        ...actor("U1","token-a"),conversationId:created.conversationId,body:"Segundo comentario.",
        idempotencyKey:"history-order-reply-01"
    });
    const third = api.handleSendInboxMessage({
        ...actor("U1","token-a"),conversationId:created.conversationId,body:"Tercer mensaje.",
        idempotencyKey:"history-order-reply-02"
    });
    const rows = spreadsheet.getSheetByName("InboxMessages").rows.filter(row => row[1] === created.conversationId);
    rows[0][2] = "2099-01-03T00:00:00.000Z";
    rows[1][2] = "2099-01-02T00:00:00.000Z";
    rows[2][2] = "2099-01-01T00:00:00.000Z";

    const newest = api.handleGetInboxMessages({
        ...actor("U1","token-a"),conversationId:created.conversationId,pageSize:1,cursor:"0"
    });
    assert.deepEqual(newest.data.map(message => message.messageId),[third.messageId]);
    const middle = api.handleGetInboxMessages({
        ...actor("U1","token-a"),conversationId:created.conversationId,pageSize:1,cursor:newest.nextCursor
    });
    assert.deepEqual(middle.data.map(message => message.messageId),[second.messageId]);
    const oldest = api.handleGetInboxMessages({
        ...actor("U1","token-a"),conversationId:created.conversationId,pageSize:1,cursor:middle.nextCursor
    });
    assert.deepEqual(oldest.data.map(message => message.messageId),[created.messageId]);
    assert.equal(oldest.nextCursor,null);
    const read = api.handleMarkInboxRead({
        ...actor("U1","token-a"),conversationId:created.conversationId,throughMessageId:third.messageId
    });
    assert.equal(read.unreadCount,0);
});

run("Marcar como no leída crea un indicador privado, idempotente y reversible al leer", () => {
    const created = api.handleCreateInboxConversation({
        ...actor("U3","token-c"),recipientId:"U2",subject:"Marcar no leída",category:"general",
        body:"Mensaje que el destinatario puede marcar como no leído.",idempotencyKey:"mark-unread-create-01"
    });
    const messages = api.handleGetInboxMessages({ ...actor("U2","token-b"),conversationId:created.conversationId });
    api.handleMarkInboxRead({ ...actor("U2","token-b"),conversationId:created.conversationId,throughMessageId:messages.data[0].messageId });
    const marked = api.handleMarkInboxUnread({ ...actor("U2","token-b"),conversationId:created.conversationId });
    assert.equal(marked.markedUnread,true); assert.equal(marked.alreadyMarkedUnread,false); assert.equal(marked.unreadCount,1);
    const list = api.handleGetInboxConversations({ ...actor("U2","token-b"),folder:"unread" });
    const item = list.data.find(row => row.conversationId === created.conversationId);
    assert.ok(item); assert.equal(item.isMarkedUnread,true); assert.equal(item.unreadCount,1);
    const replay = api.handleMarkInboxUnread({ ...actor("U2","token-b"),conversationId:created.conversationId });
    assert.equal(replay.alreadyMarkedUnread,true);
    const audit = spreadsheet.getSheetByName("InboxConversationAudit").rows.slice(1)
        .filter(row => row[4] === "mark_unread" && row[5] === created.conversationId);
    assert.equal(audit.length,1);
    const read = api.handleMarkInboxRead({ ...actor("U2","token-b"),conversationId:created.conversationId });
    assert.equal(read.unreadCount,0);
    assert.equal(api.handleGetInboxConversations({ ...actor("U2","token-b"),folder:"unread" }).data.some(row => row.conversationId === created.conversationId),false);
    assert.equal(api.handleGetInboxConversations({ ...actor("U2","token-b"),folder:"read" }).data.some(row => row.conversationId === created.conversationId),true);
});
run("Marcar como no leída desde Archivados restaura la conversación a la bandeja no leída", () => {
    const created = api.handleCreateInboxConversation({
        ...actor("U3","token-c"),recipientId:"U2",subject:"Restaurar al marcar no leído",category:"general",
        body:"La acción debe quitar el archivo privado.",idempotencyKey:"mark-unread-unarchive-01"
    });
    api.handleArchiveInboxConversation({ ...actor("U2","token-b"),conversationId:created.conversationId,archived:true });
    const marked = api.handleMarkInboxUnread({ ...actor("U2","token-b"),conversationId:created.conversationId });
    assert.equal(marked.unarchived,true);
    assert.equal(api.handleGetInboxConversations({ ...actor("U2","token-b"),folder:"archived" }).data.some(row => row.conversationId === created.conversationId),false);
    assert.equal(api.handleGetInboxConversations({ ...actor("U2","token-b"),folder:"unread" }).data.some(row => row.conversationId === created.conversationId),true);
});
run("No se puede marcar como no leída una conversación sin mensajes recibidos", () => {
    const created = api.handleCreateInboxConversation({
        ...actor("U3","token-c"),recipientId:"U2",subject:"Solo enviado",category:"general",
        body:"Este mensaje lo envié yo.",idempotencyKey:"mark-unread-no-incoming-01"
    });
    assert.throws(() => api.handleMarkInboxUnread({ ...actor("U3","token-c"),conversationId:created.conversationId }),/No hay mensajes recibidos/);
});
run("Borrar oculta solo la copia del participante y conserva mensajes e historial del otro", () => {
    const created = api.handleCreateInboxConversation({
        ...actor("U3","token-c"),recipientId:"U2",subject:"Ocultación privada",category:"general",
        body:"El historial debe permanecer para ambos.",idempotencyKey:"delete-private-create-01"
    });
    const messageSheet = spreadsheet.getSheetByName("InboxMessages");
    const messagesBefore = messageSheet.getLastRow();
    const deleted = api.handleDeleteInboxConversation({ ...actor("U2","token-b"),conversationId:created.conversationId });
    assert.equal(deleted.deleted,true); assert.equal(deleted.alreadyDeleted,false);
    assert.equal(messageSheet.getLastRow(),messagesBefore);
    assert.equal(api.handleGetInboxConversations({ ...actor("U2","token-b"),folder:"all" }).data.some(row => row.conversationId === created.conversationId),false);
    assert.throws(() => api.handleGetInboxMessages({ ...actor("U2","token-b"),conversationId:created.conversationId }),/ocultada/);
    assert.throws(() => api.handleMarkInboxRead({ ...actor("U2","token-b"),conversationId:created.conversationId }),/ocultada/);
    const senderList = api.handleGetInboxConversations({ ...actor("U3","token-c"),folder:"sent" });
    assert.equal(senderList.data.some(row => row.conversationId === created.conversationId),true);
    assert.equal(api.handleGetInboxMessages({ ...actor("U3","token-c"),conversationId:created.conversationId }).data.length,1);
    const reply = api.handleSendInboxMessage({
        ...actor("U3","token-c"),conversationId:created.conversationId,body:"El otro participante aún puede continuar.",
        idempotencyKey:"delete-private-followup-01"
    });
    assert.equal(reply.status,"success");
    assert.equal(api.handleGetInboxMessages({ ...actor("U3","token-c"),conversationId:created.conversationId }).data.length,2);
    assert.equal(api.handleGetInboxConversations({ ...actor("U2","token-b"),folder:"all" }).data.some(row => row.conversationId === created.conversationId),false);
    const replay = api.handleDeleteInboxConversation({ ...actor("U2","token-b"),conversationId:created.conversationId });
    assert.equal(replay.alreadyDeleted,true);
    const audit = spreadsheet.getSheetByName("InboxConversationAudit").rows.slice(1)
        .filter(row => row[4] === "delete" && row[5] === created.conversationId);
    assert.equal(audit.length,1);
});
run("Un tercero no puede marcar como no leída ni ocultar una conversación ajena", () => {
    const created = api.handleCreateInboxConversation({
        ...actor("U3","token-c"),recipientId:"U2",subject:"Protección de acciones",category:"general",
        body:"Solo los participantes pueden cambiar su estado.",idempotencyKey:"inbox-private-actions-01"
    });
    const flags = spreadsheet.getSheetByName("InboxConversationFlags");
    const before = flags.getLastRow();
    assert.throws(() => api.handleMarkInboxUnread({ ...actor("U1","token-a"),conversationId:created.conversationId }),/permiso/);
    assert.throws(() => api.handleDeleteInboxConversation({ ...actor("U1","token-a"),conversationId:created.conversationId }),/permiso/);
    assert.equal(flags.getLastRow(),before);
});
run("El estado privado usa una hoja adicional sin alterar el esquema de lectura existente", () => {
    const flags = spreadsheet.getSheetByName("InboxConversationFlags");
    assert.deepEqual(flags.rows[0],["conversationId","userId","unreadOverride","deleted","updatedAt"]);
    assert.deepEqual(spreadsheet.getSheetByName("InboxConversationState").rows[0],
        ["conversationId","userId","lastReadAt","lastReadMessageId","archived","hasSent","hasReceived","updatedAt","lastReceivedMessageId","lastSentMessageId"]);
});

run("la alerta de cuota crea mensajes del sistema solo para desarrolladores y es idempotente por día", () => {
    const firstAlert = api.handleNotifyDevelopersDriveCritical({
        ...actor("U1","token-a"), usagePercent: 82.5, alertDate: "20261115"
    });
    assert.equal(firstAlert.status,"success");
    assert.equal(firstAlert.notifiedCount,2);
    assert.equal(firstAlert.developerCount,2);
    const conversations = spreadsheet.getSheetByName("InboxConversations");
    const alertRows = conversations.rows.slice(1).filter(row =>
        String(row[7]) === "GPSpedia-System" && String(row[11]).startsWith("drive80_20261115_")
    );
    assert.equal(alertRows.length,2);
    const recipients = alertRows.map(row => JSON.parse(row[10]).find(user => user.id !== "GPSpedia-System").id).sort();
    assert.deepEqual(recipients,["U1","U3"]);
    const afterCount = conversations.getLastRow();
    const repeated = api.handleNotifyDevelopersDriveCritical({
        ...actor("U1","token-a"), usagePercent: 91, alertDate: "20261115"
    });
    assert.equal(repeated.status,"success");
    assert.equal(conversations.getLastRow(),afterCount);
    assert.throws(() => api.handleNotifyDevelopersDriveCritical({
        ...actor("U2","token-b"), usagePercent: 90, alertDate: "20261115"
    }),/Solo Desarrollador/);
    assert.throws(() => api.handleNotifyDevelopersDriveCritical({
        ...actor("U1","token-a"), usagePercent: 79.9, alertDate: "20261115"
    }),/80/);
});
run("Una hoja de estado faltante se crea y conserva el error de estados aún no migrados", () => {
    const original=spreadsheet.getSheetByName("InboxConversationState");
    spreadsheet.sheets.delete("InboxConversationState");
    try {
        assert.throws(() => api.handleGetInboxConversations({ ...actor("U1","token-a"), folder:"received" }),/estado de los participantes está incompleto/);
        assert.deepEqual(spreadsheet.getSheetByName("InboxConversationState").rows[0],inboxSchemaHeaders.InboxConversationState);
    } finally { spreadsheet.sheets.set("InboxConversationState",original); }
});
run("Una hoja de mensajes faltante se crea y no se oculta la inconsistencia de datos", () => {
    const original=spreadsheet.getSheetByName("InboxMessages");
    spreadsheet.sheets.delete("InboxMessages");
    try {
        assert.throws(() => api.handleGetInboxConversations({ ...actor("U1","token-a"), folder:"received" }),/contador de mensajes no coincide/);
        assert.deepEqual(spreadsheet.getSheetByName("InboxMessages").rows[0],inboxSchemaHeaders.InboxMessages);
    } finally { spreadsheet.sheets.set("InboxMessages",original); }
});

run("Inbox crea todas las hojas requeridas faltantes y la inicialización es idempotente", () => {
    const names=["InboxConversations","InboxMessages","InboxConversationState","InboxConversationFlags","InboxConversationAudit"];
    const saved=new Map(names.map(name=>[name,spreadsheet.getSheetByName(name)]));
    names.forEach(name=>spreadsheet.sheets.delete(name));
    try {
        assert.equal(api.handleGetInboxConversations({ ...actor("U1","token-a"),folder:"received" }).status,"success");
        names.forEach(name=>assert.deepEqual(spreadsheet.getSheetByName(name).rows[0],inboxSchemaHeaders[name]));
        assert.equal(api.handleGetInboxConversations({ ...actor("U1","token-a"),folder:"received" }).status,"success");
    } finally {
        names.forEach(name=>spreadsheet.sheets.delete(name));
        saved.forEach((sheet,name)=>{if(sheet)spreadsheet.sheets.set(name,sheet);});
    }
});
run("Las hojas principales ausentes se crean sin renombrar ni borrar datos dependientes", () => {
    const conversations=spreadsheet.getSheetByName("InboxConversations"),states=spreadsheet.getSheetByName("InboxConversationState");
    spreadsheet.sheets.delete("InboxConversations");spreadsheet.sheets.delete("InboxConversationState");
    try {
        assert.throws(() => api.handleGetInboxConversations({ ...actor("U1","token-a"),folder:"received" }),/historial contiene un mensaje sin conversación válida/);
        assert.deepEqual(spreadsheet.getSheetByName("InboxConversations").rows[0],inboxSchemaHeaders.InboxConversations);
        assert.deepEqual(spreadsheet.getSheetByName("InboxConversationState").rows[0],inboxSchemaHeaders.InboxConversationState);
    } finally { spreadsheet.sheets.set("InboxConversations",conversations);spreadsheet.sheets.set("InboxConversationState",states); }
});
run("Inbox crea la hoja de preferencias faltante", () => {
    spreadsheet.sheets.delete("InboxConversationFlags");
    api.handleGetInboxConversations({ ...actor("U1","token-a"),folder:"received" });
    assert.deepEqual(spreadsheet.getSheetByName("InboxConversationFlags").rows[0],inboxSchemaHeaders.InboxConversationFlags);
});
run("Las acciones de preferencias inicializan la hoja faltante", () => {
    const flags=spreadsheet.getSheetByName("InboxConversationFlags");
    spreadsheet.sheets.delete("InboxConversationFlags");
    try {
        assert.throws(() => api.handleMarkInboxUnread({ ...actor("U1","token-a"),conversationId:first.conversationId }),/No hay mensajes recibidos/);
        assert.deepEqual(spreadsheet.getSheetByName("InboxConversationFlags").rows[0],inboxSchemaHeaders.InboxConversationFlags);
    } finally { spreadsheet.sheets.set("InboxConversationFlags",flags); }
});
run("La lectura detecta un contador de mensajes inconsistente", () => {
    const conversations = spreadsheet.getSheetByName("InboxConversations");
    const row = conversations.rows.find(item => String(item[0]) === first.conversationId);
    const previous = row[16];
    row[16] = Number(previous) + 1;
    try {
        assert.throws(() => api.handleGetInboxConversations({ ...actor("U1","token-a"), folder:"received" }),
            /contador de mensajes no coincide/);
    } finally {
        row[16] = previous;
    }
});
run("La lectura detecta estados ausentes para participantes", () => {
    const states = spreadsheet.getSheetByName("InboxConversationState");
    const index = states.rows.findIndex(row => String(row[0]) === first.conversationId && String(row[1]) === "U2");
    assert.ok(index > 0);
    const removed = states.rows.splice(index,1)[0];
    try {
        assert.throws(() => api.handleGetInboxConversations({ ...actor("U1","token-a"), folder:"received" }),
            /estado de los participantes está incompleto/);
    } finally {
        states.rows.splice(index,0,removed);
    }
});
run("Una hoja Inbox vacía se inicializa con sus encabezados", () => {
    const original=spreadsheet.getSheetByName("InboxConversationState"),empty=new FakeSheet("InboxConversationState");
    spreadsheet.sheets.set("InboxConversationState",empty);
    try {
        assert.throws(() => api.handleGetInboxConversations({ ...actor("U1","token-a"),folder:"received" }),/estado de los participantes está incompleto/);
        assert.deepEqual(empty.rows[0],inboxSchemaHeaders.InboxConversationState);
    } finally { spreadsheet.sheets.set("InboxConversationState",original); }
});
run("Un esquema parcial se completa antes de crear una conversación", () => {
    const original=spreadsheet.getSheetByName("InboxMessages");
    spreadsheet.sheets.delete("InboxMessages");
    try {
        const result=api.handleCreateInboxConversation({
            ...actor("U1","token-a"),recipientId:"U2",subject:"Esquema parcial",category:"general",
            body:"Se crea la hoja faltante.",idempotencyKey:"partial-schema-0001"
        });
        assert.equal(result.status,"success");
        assert.deepEqual(spreadsheet.getSheetByName("InboxMessages").rows[0],inboxSchemaHeaders.InboxMessages);
    } finally { if(original)spreadsheet.sheets.set("InboxMessages",original); }
});
run("Una columna faltante se inserta sin perder datos existentes", () => {
    const sheet=spreadsheet.getSheetByName("InboxMessages"),headers=inboxSchemaHeaders.InboxMessages;
    sheet.getRange(2,1,1,headers.length).setValues([["M-keep","C-keep","2026-11-16","U1","Ana","Desarrollador","mensaje","key-keep","hash-keep"]]);
    sheet.rows[0].splice(7,1);sheet.rows[1].splice(7,1);
    try {
        api.ensureInboxConversationSheets_();
        assert.deepEqual(sheet.getRange(1,1,1,headers.length).getValues()[0],headers);
        const row=sheet.getRange(2,1,1,headers.length).getValues()[0];
        assert.equal(row[6],"mensaje");assert.equal(row[7],"");assert.equal(row[8],"hash-keep");
    } finally { sheet.rows.splice(1);sheet.rows[0]=headers.slice(); }
});
run("Los participantes dañados se informan y no se ocultan como una bandeja vacía", () => {
    const conversations = spreadsheet.getSheetByName("InboxConversations");
    const row = conversations.rows.find(item => String(item[0]) === first.conversationId);
    assert.ok(row);
    const previous = row[10];
    row[10] = "{";
    try {
        assert.throws(() => api.handleGetInboxConversations({ ...actor("U1","token-a"), folder:"received" }),
            /lista de participantes está dañada/);
    } finally {
        row[10] = previous;
    }
});
const postMatch = feedbackSource.match(/^function doPost\(e\) \{[\s\S]*?^\}/m);
assert.ok(postMatch, "No se pudo extraer el dispatcher FEEDBACK.");
const dispatchCalls = [];
const trustedInboxActor = { userId:"U1", role:"tecnico", epoch:1, fullName:"Ana" };
const dispatch = new Function(
    "FEEDBACK_ACTION_PERMISSIONS", "FEEDBACK_PUBLIC_ACTIONS", "getCachedSharedSessionActor_",
    "withSharedSessionActor_", "doPostInternal_", "ContentService",
    "DIRECT_SERVICE_TRAFFIC_CONFIG_", "readDirectServiceTraffic_", "recordDirectServiceTraffic_",
    postMatch[0] + String.fromCharCode(10) + "return doPost;"
)(
    { getInboxRecipients:null, getInboxConversations:null, getInboxMessages:null, createInboxConversation:null },
    new Set(),
    (userId, sessionToken) => { dispatchCalls.push({userId,sessionToken}); return trustedInboxActor; },
    (event, actor) => {
        const request = JSON.parse(event.postData.contents);
        request.payload.__sharedSessionActor = actor;
        event.postData.contents = JSON.stringify(request);
        return event;
    },
    event => JSON.parse(event.postData.contents).payload,
    { createTextOutput: value => ({ value, setMimeType() { return this; } }), MimeType:{TEXT:"text/plain"} },
    { actions: new Set() },
    () => ({ status: "unavailable" }),
    () => false
);
for (const action of ["getInboxRecipients","getInboxConversations","getInboxMessages","createInboxConversation"]) {
    dispatchCalls.length = 0;
    const event = { postData:{contents:JSON.stringify({action,payload:{userId:"U1",sessionToken:"token-a"}})} };
    const payload = dispatch(event);
    assert.deepEqual(dispatchCalls,[{userId:"U1",sessionToken:"token-a"}]);
    assert.equal(payload.__sharedSessionActor.userId,"U1");
    assert.equal(payload.__sharedSessionActor.epoch,1);
}
run("El dispatcher FEEDBACK entrega actor cacheado a lecturas y escrituras Inbox sin lease", () => {
    assert.ok(true);
});
console.log("InboxConversations: " + passed + "/" + passed + " PASS");
