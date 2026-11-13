/* Direct conversations are stored separately from legacy Feedback/Contactanos. */
const INBOX_CONVERSATIONS_SHEET_ = "InboxConversations";
const INBOX_MESSAGES_SHEET_ = "InboxMessages";
const INBOX_CONVERSATION_STATE_SHEET_ = "InboxConversationState";
const INBOX_CONVERSATION_AUDIT_SHEET_ = "InboxConversationAudit";
const INBOX_CONVERSATION_HEADERS_ = Object.freeze(["conversationId","createdAt","updatedAt","subject","category","type","status","createdById","createdByName","createdByRole","participantsJson","createKey","createHash","lastMessageId","lastMessageAt","lastMessagePreview","messageCount"]);
const INBOX_MESSAGE_HEADERS_ = Object.freeze(["messageId","conversationId","createdAt","authorId","authorName","authorRole","body","idempotencyKey","payloadHash"]);
const INBOX_STATE_HEADERS_ = Object.freeze(["conversationId","userId","lastReadAt","lastReadMessageId","archived","hasSent","hasReceived","updatedAt","lastReceivedMessageId","lastSentMessageId"]);
const INBOX_CONVERSATION_AUDIT_HEADERS_ = Object.freeze(["eventId","timestamp","actorId","actorName","action","conversationId","messageId","details"]);
const INBOX_CATEGORIES_ = new Set(["general","soporte","acceso","contenido","instalacion","otro"]);
const INBOX_ACTIVE_ROLES_ = new Set(["desarrollador","gefe","jefe","supervisor","tecnico","tecnico_exterior"]);

function withInboxConversationLock_(callback) {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try { return callback(); } finally { lock.releaseLock(); }
}
function inboxConversationSheet_(name, headers, createIfMissing) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(name);
    if (!sheet && !createIfMissing) return null;
    if (!sheet) sheet = ss.insertSheet(name);
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers.slice()]);
        SpreadsheetApp.flush();
    }
    const actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0]
        .map(value => String(value === null || value === undefined ? "" : value).trim());
    if (headers.some((header, index) => actual[index] !== header)) {
        throw new Error("El esquema de " + name + " no coincide con el contrato; no se modificó la hoja.");
    }
    return sheet;
}
function ensureInboxConversationSheets_() {
    return {
        conversations: inboxConversationSheet_(INBOX_CONVERSATIONS_SHEET_, INBOX_CONVERSATION_HEADERS_, true),
        messages: inboxConversationSheet_(INBOX_MESSAGES_SHEET_, INBOX_MESSAGE_HEADERS_, true),
        states: inboxConversationSheet_(INBOX_CONVERSATION_STATE_SHEET_, INBOX_STATE_HEADERS_, true),
        audit: inboxConversationSheet_(INBOX_CONVERSATION_AUDIT_SHEET_, INBOX_CONVERSATION_AUDIT_HEADERS_, true)
    };
}
function inboxConversationRows_(sheet, width) {
    return !sheet || sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues();
}
function inboxConversationText_(value, maxLength, field, allowNewlines) {
    if (typeof value !== "string") throw new Error(field + " debe ser texto.");
    let normalized = value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
    if (!allowNewlines) normalized = normalized.replace(/\s+/g, " ");
    if (!normalized || normalized.length > maxLength) throw new Error(field + " está vacío o supera el límite permitido.");
    return normalized;
}
function inboxConversationKey_(value, field) {
    const key = String(value === null || value === undefined ? "" : value).trim();
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(key)) throw new Error(field + " no es válido.");
    return key;
}
function inboxConversationHash_(value) {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value), Utilities.Charset.UTF_8);
    return digest.map(byte => ((byte + 256) % 256).toString(16).padStart(2, "0")).join("");
}
function inboxConversationActor_(payload) {
    const verified = assertFeedbackSession(payload, null);
    const id = String(verified && verified.userId || "").trim();
    const name = String(verified && verified.userName || "").trim();
    const role = normalizeFeedbackRole(verified && verified.role);
    if (!id || !name || !INBOX_ACTIVE_ROLES_.has(role)) throw new Error("La sesión no contiene una identidad válida para Inbox.");
    return { id, name, role };
}
function inboxActiveUserRow_(row) {
    if (!row) return false;
    const id = String(row[0] || "").trim(), username = String(row[1] || "").trim();
    const role = normalizeFeedbackRole(row[3]);
    const pendingRevocation = String(row[7] || "").startsWith("__role_revocation_pending__:");
    return Boolean(id && username && !username.startsWith("__deleted__:") && !pendingRevocation && INBOX_ACTIVE_ROLES_.has(role));
}
function inboxFindUser_(userId) {
    const sheet = getSpreadsheet().getSheetByName("Users");
    if (!sheet) throw new Error("No se encontró la hoja USERS.");
    const rows = inboxConversationRows_(sheet, Math.max(8, sheet.getLastColumn()));
    const matches = rows.filter(row => String(row[0] || "").trim() === userId);
    if (matches.length !== 1 || !inboxActiveUserRow_(matches[0])) throw new Error("El destinatario no existe, está inactivo o su identidad es ambigua.");
    return { id: String(matches[0][0]).trim(), username: String(matches[0][1] || "").trim(),
        role: normalizeFeedbackRole(matches[0][3]), name: String(matches[0][6] || matches[0][1] || "Usuario").trim() };
}
function handleGetInboxRecipients(payload) {
    const actor = inboxConversationActor_(payload), sheet = getSpreadsheet().getSheetByName("Users");
    if (!sheet) throw new Error("No se encontró la hoja USERS.");
    const rows = inboxConversationRows_(sheet, Math.max(8, sheet.getLastColumn()));
    const recipients = rows.filter(inboxActiveUserRow_).map(row => ({
        id: String(row[0]).trim(), username: String(row[1] || "").trim(),
        role: normalizeFeedbackRole(row[3]), name: String(row[6] || row[1] || "Usuario").trim()
    })).filter(user => user.id !== actor.id && (actor.role === "desarrollador" || user.role === "desarrollador"));
    return { status: "success", recipients };
}
function inboxFindConversation_(rows, conversationId) {
    const matches = [];
    rows.forEach((row, index) => { if (String(row[0] || "").trim() === conversationId) matches.push({ row, rowNumber: index + 2 }); });
    if (matches.length !== 1) throw new Error(matches.length ? "El ID de conversación está duplicado." : "No se encontró la conversación.");
    return matches[0];
}
function inboxParticipants_(row) {
    let participants;
    try { participants = JSON.parse(String(row[10] || "[]")); } catch (_) { throw new Error("La lista de participantes está dañada."); }
    if (!Array.isArray(participants) || participants.length !== 2 || participants.some(user => !user || typeof user.id !== "string" || !user.id)) {
        throw new Error("La lista de participantes no es válida.");
    }
    return participants;
}
function inboxAssertParticipant_(row, actorId) {
    const participants = inboxParticipants_(row);
    if (!participants.some(user => user.id === actorId)) throw new Error("No tienes permiso para consultar o modificar esta conversación.");
    return participants;
}
function inboxFindState_(sheet, conversationId, userId) {
    const rows = inboxConversationRows_(sheet, INBOX_STATE_HEADERS_.length), matches = [];
    rows.forEach((row, index) => { if (String(row[0]) === conversationId && String(row[1]) === userId) matches.push({ row, rowNumber: index + 2 }); });
    if (matches.length > 1) throw new Error("El estado del participante está duplicado.");
    return matches.length ? matches[0] : null;
}
function inboxEnsureState_(sheet, conversationId, userId, now) {
    let found = inboxFindState_(sheet, conversationId, userId);
    if (found) return found;
    const row = [conversationId,userId,"","",false,false,false,now,"",""], rowNumber = sheet.getLastRow() + 1;
    sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
    SpreadsheetApp.flush();
    return { row, rowNumber };
}
function inboxWriteState_(sheet, found, row) {
    sheet.getRange(found.rowNumber, 1, 1, INBOX_STATE_HEADERS_.length).setValues([row]);
    found.row = row;
}
function inboxFindMessageByKey_(rows, conversationId, authorId, key) {
    const matches = [];
    rows.forEach((row, index) => {
        if (String(row[1] || "") === conversationId && String(row[3] || "") === authorId && String(row[7] || "") === key) matches.push({ row, rowNumber: index + 2 });
    });
    if (matches.length > 1) throw new Error("La clave idempotente de mensaje está duplicada.");
    return matches.length ? matches[0] : null;
}
function inboxAppendAudit_(sheet, actor, action, conversationId, messageId, details) {
    const rows = inboxConversationRows_(sheet, INBOX_CONVERSATION_AUDIT_HEADERS_.length);
    if (messageId && rows.some(row => String(row[4]) === action && String(row[6]) === messageId)) return;
    const event = [Utilities.getUuid(),new Date().toISOString(),actor.id,actor.name,action,conversationId,messageId || "",String(details || "").slice(0,500)];
    const rowNumber = sheet.getLastRow() + 1;
    sheet.getRange(rowNumber,1,1,event.length).setValues([event]);
    SpreadsheetApp.flush();
    const saved = sheet.getRange(rowNumber,1,1,event.length).getValues()[0];
    if (event.some((value,index) => String(saved[index]) !== String(value))) throw new Error("No se pudo confirmar el registro inmutable de Inbox.");
}
function inboxAssertRateLimit_(rows, actorId, now) {
    const cutoff = now.getTime() - 60000;
    const recent = rows.slice(-500).filter(row => String(row[3] || "") === actorId && new Date(row[2]).getTime() >= cutoff).length;
    if (recent >= 8) throw new Error("Has enviado demasiados mensajes en poco tiempo. Espera un minuto e inténtalo de nuevo.");
}
function inboxAppendMessage_(sheet, conversationId, actor, body, key, hash, now) {
    const id = Utilities.getUuid(), row = [id,conversationId,now,actor.id,actor.name,actor.role,body,key,hash];
    const rowNumber = sheet.getLastRow() + 1;
    sheet.getRange(rowNumber,1,1,row.length).setValues([row]);
    SpreadsheetApp.flush();
    const saved = sheet.getRange(rowNumber,1,1,row.length).getValues()[0];
    if (row.some((value,index) => String(saved[index]) !== String(value))) throw new Error("No se pudo confirmar el mensaje guardado.");
    return { row, rowNumber };
}
function inboxUpdateConversationForMessage_(sheet, found, message, now) {
    const row = found.row.slice();
    const currentTime = new Date(row[14] || 0).getTime();
    const messageTime = new Date(message[2]).getTime();
    const isCurrentMessage = String(row[13] || "") === String(message[0]);
    if (!isCurrentMessage && (!Number.isFinite(currentTime) || messageTime >= currentTime)) {
        row[2] = now; row[13] = message[0]; row[14] = message[2];
        row[15] = String(message[6] || "").slice(0,180); row[16] = Math.max(0,Number(row[16]) || 0) + 1;
        sheet.getRange(found.rowNumber,1,1,INBOX_CONVERSATION_HEADERS_.length).setValues([row]);
        SpreadsheetApp.flush(); found.row = row;
    }
}
function inboxUpdateParticipantStates_(sheet, conversationId, participants, actor, messageId, messageRows, now) {
    const messageIndex = messageRows.findIndex(message => String(message[0]) === messageId);
    if (messageIndex < 0) throw new Error("No se pudo localizar el mensaje para actualizar los participantes.");
    participants.forEach(participant => {
        const found = inboxEnsureState_(sheet, conversationId, participant.id, now), row = found.row.slice();
        if (participant.id === actor.id) {
            const lastSentIndex = row[9] ? messageRows.findIndex(message => String(message[0]) === String(row[9])) : -1;
            row[5] = true;
            if (messageIndex > lastSentIndex) { row[4] = false; row[9] = messageId; }
        } else {
            const lastReceivedIndex = row[8] ? messageRows.findIndex(message => String(message[0]) === String(row[8])) : -1;
            row[6] = true;
            if (messageIndex > lastReceivedIndex) { row[4] = false; row[8] = messageId; }
        }
        row[7] = now;
        inboxWriteState_(sheet, found, row);
    });
}
function handleCreateInboxConversation(payload) {
    const actor = inboxConversationActor_(payload);
    const subject = inboxConversationText_(payload.subject,150,"El asunto",false);
    const body = inboxConversationText_(payload.body,5000,"El mensaje",true);
    const category = String(payload.category || "general").trim().toLowerCase();
    if (!INBOX_CATEGORIES_.has(category)) throw new Error("La categoría no está permitida.");
    const createKey = inboxConversationKey_(payload.idempotencyKey,"La clave de creación");
    const recipientId = String(payload.recipientId || "").trim();
    if (!recipientId || recipientId === actor.id) throw new Error("Selecciona un destinatario individual válido.");
    const type = actor.role === "desarrollador" ? "direct" : "developer_consult";
    const createHash = inboxConversationHash_({subject,body,category,type,recipientId});
    return withInboxConversationLock_(() => {
        const sheets = ensureInboxConversationSheets_();
        const recipient = inboxFindUser_(recipientId);
        if (actor.role !== "desarrollador" && recipient.role !== "desarrollador") throw new Error("Las consultas de usuarios solo pueden dirigirse a un Desarrollador.");
        const conversationRows = inboxConversationRows_(sheets.conversations,INBOX_CONVERSATION_HEADERS_.length);
        const messageRows = inboxConversationRows_(sheets.messages,INBOX_MESSAGE_HEADERS_.length);
        const now = new Date().toISOString();
        const existing = conversationRows.filter(row => String(row[7]) === actor.id && String(row[11]) === createKey);
        if (existing.length > 1) throw new Error("La clave de creación aparece duplicada; requiere revisión.");
        let conversationRow, rowNumber;
        if (existing.length) {
            conversationRow = existing[0]; rowNumber = conversationRows.indexOf(conversationRow) + 2;
            if (String(conversationRow[12]) !== createHash) throw new Error("La clave de creación ya se utilizó con otro contenido.");
        } else {
            inboxAssertRateLimit_(messageRows,actor.id,new Date(now));
            const conversationId = Utilities.getUuid();
            const participants = [{id:actor.id,name:actor.name,role:actor.role},{id:recipient.id,name:recipient.name,role:recipient.role}];
            conversationRow = [conversationId,now,now,subject,category,type,"open",actor.id,actor.name,actor.role,JSON.stringify(participants),createKey,createHash,"","","",0];
            rowNumber = sheets.conversations.getLastRow() + 1;
            sheets.conversations.getRange(rowNumber,1,1,conversationRow.length).setValues([conversationRow]);
            SpreadsheetApp.flush();
            const saved = sheets.conversations.getRange(rowNumber,1,1,conversationRow.length).getValues()[0];
            if (conversationRow.some((value,index) => String(saved[index]) !== String(value))) throw new Error("No se pudo confirmar la creación de la conversación.");
        }
        const conversationId = String(conversationRow[0]), messageKey = "create_" + createKey;
        const messageHash = inboxConversationHash_({conversationId,authorId:actor.id,body,messageKey});
        let message = inboxFindMessageByKey_(messageRows,conversationId,actor.id,messageKey);
        if (message && String(message.row[8]) !== messageHash) throw new Error("La clave inicial ya existe con otro contenido.");
        const isNewMessage = !message;
        if (isNewMessage) { message = inboxAppendMessage_(sheets.messages,conversationId,actor,body,messageKey,messageHash,now); messageRows.push(message.row); }
        const found = {row:conversationRow,rowNumber};
        inboxUpdateConversationForMessage_(sheets.conversations,found,message.row,now);
        inboxUpdateParticipantStates_(sheets.states,conversationId,inboxParticipants_(found.row),actor,message.row[0],messageRows,now);
        inboxAppendAudit_(sheets.audit,actor,"conversation_created",conversationId,message.row[0],"Conversación creada para un destinatario individual.");
        return {status:"success",conversationId,messageId:message.row[0],idempotentReplay:Boolean(existing.length)};
    });
}
function handleSendInboxMessage(payload) {
    const actor = inboxConversationActor_(payload), conversationId = String(payload.conversationId || "").trim();
    if (!conversationId || conversationId.length > 100) throw new Error("La conversación no es válida.");
    const body = inboxConversationText_(payload.body,5000,"El mensaje",true), key = inboxConversationKey_(payload.idempotencyKey,"La clave idempotente");
    const hash = inboxConversationHash_({conversationId,authorId:actor.id,body});
    return withInboxConversationLock_(() => {
        const sheets = ensureInboxConversationSheets_(), conversations = inboxConversationRows_(sheets.conversations,INBOX_CONVERSATION_HEADERS_.length);
        const found = inboxFindConversation_(conversations,conversationId), participants = inboxAssertParticipant_(found.row,actor.id);
        if (String(found.row[6]) !== "open") throw new Error("La conversación está cerrada.");
        const messages = inboxConversationRows_(sheets.messages,INBOX_MESSAGE_HEADERS_.length);
        let message = inboxFindMessageByKey_(messages,conversationId,actor.id,key);
        if (message && String(message.row[8]) !== hash) throw new Error("La clave idempotente ya se utilizó con otro contenido.");
        const now = new Date().toISOString();
        const isNewMessage = !message;
        if (isNewMessage) { inboxAssertRateLimit_(messages,actor.id,new Date(now)); message = inboxAppendMessage_(sheets.messages,conversationId,actor,body,key,hash,now); messages.push(message.row); }
        inboxUpdateConversationForMessage_(sheets.conversations,found,message.row,now);
        inboxUpdateParticipantStates_(sheets.states,conversationId,participants,actor,message.row[0],messages,now);
        inboxAppendAudit_(sheets.audit,actor,"message",conversationId,message.row[0],"Mensaje agregado a la conversación.");
        return {status:"success",conversationId,messageId:message.row[0],idempotentReplay:Boolean(inboxFindMessageByKey_(messages,conversationId,actor.id,key))};
    });
}
function handleGetInboxConversations(payload) {
    const actor = inboxConversationActor_(payload), folder = String(payload.folder || "received").trim().toLowerCase();
    if (!["all","received","unread","sent","archived"].includes(folder)) throw new Error("La carpeta de Inbox no es válida.");
    const query = String(payload.query || "").trim().slice(0,80).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    const cursorRaw = String(payload.cursor === undefined || payload.cursor === null ? "0" : payload.cursor);
    if (!/^\d{1,7}$/.test(cursorRaw)) throw new Error("El cursor no es válido.");
    const offset = Number(cursorRaw), requestedSize = Number(payload.pageSize);
    const pageSize = Number.isFinite(requestedSize) ? Math.max(1,Math.min(50,Math.floor(requestedSize))) : 20;
    return withInboxConversationLock_(() => {
        const convSheet = inboxConversationSheet_(INBOX_CONVERSATIONS_SHEET_,INBOX_CONVERSATION_HEADERS_,false);
        const stateSheet = inboxConversationSheet_(INBOX_CONVERSATION_STATE_SHEET_,INBOX_STATE_HEADERS_,false);
        if (!convSheet || !stateSheet) return {status:"success",data:[],counts:{received:0,unread:0,sent:0,archived:0},total:0,nextCursor:null,hasMore:false,pageSize};
        const conversations = inboxConversationRows_(convSheet,INBOX_CONVERSATION_HEADERS_.length);
        const stateRows = inboxConversationRows_(stateSheet,INBOX_STATE_HEADERS_.length);
        const messageSheet = inboxConversationSheet_(INBOX_MESSAGES_SHEET_,INBOX_MESSAGE_HEADERS_,false);
        const messageRows = inboxConversationRows_(messageSheet,INBOX_MESSAGE_HEADERS_.length);
        const messagesByConversation = new Map();
        messageRows.forEach(message => {
            const id = String(message[1] || "");
            if (!messagesByConversation.has(id)) messagesByConversation.set(id, []);
            messagesByConversation.get(id).push(message);
        });
        const stateMap = new Map();
        stateRows.forEach(row => {
            if (String(row[1]) === actor.id) {
                const key = String(row[0]) + "|" + actor.id;
                if (stateMap.has(key)) throw new Error("El estado del participante está duplicado.");
                stateMap.set(key,row);
            }
        });
        const summaries = conversations.filter(row => {
            try { return inboxParticipants_(row).some(user => user.id === actor.id); } catch (_) { return false; }
        }).map(row => {
            const participants = inboxParticipants_(row), other = participants.filter(user => user.id !== actor.id);
            const state = stateMap.get(String(row[0]) + "|" + actor.id) || [];
            const conversationMessages = messagesByConversation.get(String(row[0])) || [];
            const lastReadMessageId = String(state[3] || "");
            const readIndex = lastReadMessageId ? conversationMessages.findIndex(message => String(message[0]) === lastReadMessageId) : -1;
            if (lastReadMessageId && readIndex < 0) throw new Error("El marcador de lectura no pertenece al historial de la conversación.");
            const unreadCount = conversationMessages.slice(readIndex + 1).filter(message => String(message[3]) !== actor.id).length;
            return {
                conversationId:String(row[0]),subject:String(row[3] || ""),category:String(row[4] || "general"),
                type:String(row[5] || "direct"),status:String(row[6] || "open"),createdAt:String(row[1] || ""),
                updatedAt:String(row[2] || ""),createdById:String(row[7] || ""),lastMessageAt:String(row[14] || ""),
                lastMessagePreview:String(row[15] || ""),messageCount:Math.max(0,Number(row[16]) || 0),
                otherParticipants:other.map(user => ({id:user.id,name:String(user.name || ""),role:String(user.role || "")})),
                unreadCount,archived:state[4] === true,hasSent:state[5] === true,hasReceived:state[6] === true
            };
        });
        const counts = summaries.reduce((result,item) => {
            if (item.archived) result.archived++;
            else { if (item.hasReceived) result.received++; if (item.unreadCount > 0) result.unread++; if (item.hasSent) result.sent++; }
            return result;
        },{received:0,unread:0,sent:0,archived:0});
        const matchesQuery = item => !query || [item.subject,item.category,item.lastMessagePreview,...item.otherParticipants.map(user => user.name)]
            .join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes(query);
        const filtered = summaries.filter(item => {
            if (folder === "archived") return item.archived;
            if (item.archived) return false;
            if (folder === "received") return item.hasReceived;
            if (folder === "unread") return item.unreadCount > 0;
            if (folder === "sent") return item.hasSent;
            return true;
        }).filter(matchesQuery).sort((a,b) => new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime());
        const data = filtered.slice(offset,offset+pageSize), nextOffset = offset + data.length, hasMore = nextOffset < filtered.length;
        return {status:"success",data,counts,total:filtered.length,nextCursor:hasMore?String(nextOffset):null,hasMore,pageSize};
    });
}
function handleGetInboxMessages(payload) {
    const actor = inboxConversationActor_(payload), conversationId = String(payload.conversationId || "").trim();
    if (!conversationId) throw new Error("Se requiere una conversación.");
    const cursorRaw = String(payload.cursor === undefined || payload.cursor === null ? "0" : payload.cursor);
    if (!/^\d{1,7}$/.test(cursorRaw)) throw new Error("El cursor no es válido.");
    const offset = Number(cursorRaw), requestedSize = Number(payload.pageSize);
    const pageSize = Number.isFinite(requestedSize) ? Math.max(1,Math.min(100,Math.floor(requestedSize))) : 50;
    return withInboxConversationLock_(() => {
        const convSheet = inboxConversationSheet_(INBOX_CONVERSATIONS_SHEET_,INBOX_CONVERSATION_HEADERS_,false);
        const messageSheet = inboxConversationSheet_(INBOX_MESSAGES_SHEET_,INBOX_MESSAGE_HEADERS_,false);
        if (!convSheet || !messageSheet) throw new Error("No se encontró la conversación.");
        const found = inboxFindConversation_(inboxConversationRows_(convSheet,INBOX_CONVERSATION_HEADERS_.length),conversationId);
        inboxAssertParticipant_(found.row,actor.id);
        const messages = inboxConversationRows_(messageSheet,INBOX_MESSAGE_HEADERS_.length).filter(row => String(row[1]) === conversationId)
            .sort((a,b) => new Date(a[2]).getTime() - new Date(b[2]).getTime());
        const data = messages.slice(offset,offset+pageSize).map(row => ({
            messageId:String(row[0]),conversationId:String(row[1]),createdAt:String(row[2]),authorId:String(row[3]),
            authorName:String(row[4]),authorRole:String(row[5]),body:String(row[6] || "")
        }));
        const nextOffset = offset + data.length, hasMore = nextOffset < messages.length;
        return {status:"success",data,total:messages.length,nextCursor:hasMore?String(nextOffset):null,hasMore,pageSize};
    });
}
function handleMarkInboxRead(payload) {
    const actor = inboxConversationActor_(payload), conversationId = String(payload.conversationId || "").trim();
    if (!conversationId) throw new Error("Se requiere una conversación.");
    return withInboxConversationLock_(() => {
        const sheets = ensureInboxConversationSheets_();
        const found = inboxFindConversation_(inboxConversationRows_(sheets.conversations,INBOX_CONVERSATION_HEADERS_.length),conversationId);
        inboxAssertParticipant_(found.row,actor.id);
        const state = inboxEnsureState_(sheets.states,conversationId,actor.id,new Date().toISOString()), row = state.row.slice();
        const messages = inboxConversationRows_(sheets.messages,INBOX_MESSAGE_HEADERS_.length).filter(item => String(item[1]) === conversationId);
        const throughId = String(payload.throughMessageId || "");
        const throughIndex = throughId ? messages.findIndex(item => String(item[0]) === throughId) : messages.length - 1;
        if (throughId && throughIndex < 0) throw new Error("El mensaje de lectura no pertenece a la conversación.");
        const previousMarker = String(row[3] || "");
        row[2] = throughIndex >= 0 ? messages[throughIndex][2] : "";
        row[3] = throughIndex >= 0 ? String(messages[throughIndex][0]) : "";
        row[7] = new Date().toISOString();
        inboxWriteState_(sheets.states,state,row);
        const unread = messages.slice(throughIndex + 1).filter(item => String(item[3]) !== actor.id).length;
        if (previousMarker !== row[3]) inboxAppendAudit_(sheets.audit,actor,"read",conversationId,row[3],"Lectura confirmada hasta el mensaje indicado.");
        return {status:"success",conversationId,unreadCount:unread};
    });
}
function handleArchiveInboxConversation(payload) {
    const actor = inboxConversationActor_(payload), conversationId = String(payload.conversationId || "").trim();
    if (!conversationId || typeof payload.archived !== "boolean") throw new Error("La conversación y el estado de archivo son obligatorios.");
    return withInboxConversationLock_(() => {
        const sheets = ensureInboxConversationSheets_();
        const found = inboxFindConversation_(inboxConversationRows_(sheets.conversations,INBOX_CONVERSATION_HEADERS_.length),conversationId);
        inboxAssertParticipant_(found.row,actor.id);
        const state = inboxEnsureState_(sheets.states,conversationId,actor.id,new Date().toISOString()), row = state.row.slice();
        const changed = row[4] !== payload.archived;
        row[4] = payload.archived; row[7] = new Date().toISOString();
        inboxWriteState_(sheets.states,state,row);
        if (changed) inboxAppendAudit_(sheets.audit,actor,payload.archived?"archive":"unarchive",conversationId,"","Estado de archivo actualizado.");
        return {status:"success",conversationId,archived:payload.archived};
    });
}
