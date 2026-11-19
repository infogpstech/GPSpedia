/* Direct conversations are stored separately from legacy Feedback/Contactanos. */
const INBOX_CONVERSATIONS_SHEET_ = "InboxConversations";
const INBOX_MESSAGES_SHEET_ = "InboxMessages";
const INBOX_CONVERSATION_STATE_SHEET_ = "InboxConversationState";
const INBOX_CONVERSATION_FLAGS_SHEET_ = "InboxConversationFlags";
const INBOX_CONVERSATION_AUDIT_SHEET_ = "InboxConversationAudit";
const INBOX_CONVERSATION_HEADERS_ = Object.freeze(["conversationId","createdAt","updatedAt","subject","category","type","status","createdById","createdByName","createdByRole","participantsJson","createKey","createHash","lastMessageId","lastMessageAt","lastMessagePreview","messageCount"]);
const INBOX_MESSAGE_HEADERS_ = Object.freeze(["messageId","conversationId","createdAt","authorId","authorName","authorRole","body","idempotencyKey","payloadHash"]);
const INBOX_STATE_HEADERS_ = Object.freeze(["conversationId","userId","lastReadAt","lastReadMessageId","archived","hasSent","hasReceived","updatedAt","lastReceivedMessageId","lastSentMessageId"]);
const INBOX_FLAGS_HEADERS_ = Object.freeze(["conversationId","userId","unreadOverride","deleted","updatedAt"]);
const INBOX_CONVERSATION_AUDIT_HEADERS_ = Object.freeze(["eventId","timestamp","actorId","actorName","action","conversationId","messageId","details"]);
const INBOX_CATEGORIES_ = new Set(["general","soporte","acceso","contenido","instalacion","otro"]);
const INBOX_ACTIVE_ROLES_ = new Set(["desarrollador","jefe","supervisor","tecnico","tecnico_exterior"]);

function withInboxConversationLock_(callback) {
    const lock = LockService.getScriptLock();
    if (typeof lock.tryLock === "function") {
        if (!lock.tryLock(0)) throw new Error("Inbox está procesando otra escritura. Vuelve a intentar.");
    } else if (typeof lock.waitLock === "function") {
        lock.waitLock(0);
    } else {
        throw new Error("No se pudo adquirir el bloqueo breve de Inbox.");
    }
    try { return callback(); } finally { lock.releaseLock(); }
}
function findOrCreateInboxSheet_(name) {
    const spreadsheet = getSpreadsheet();
    return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}
function inboxConversationSheet_(name, headers) {
    const sheet = findOrCreateInboxSheet_(name);
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers.slice()]);
        return sheet;
    }
    const width = Number(sheet.getLastColumn()) || 0;
    const actual = width ? sheet.getRange(1, 1, 1, width).getValues()[0]
        .map(value => String(value == null ? "" : value).trim()) : [];
    const seen = new Set();
    actual.forEach(value => {
        if (!value) return;
        if (seen.has(value)) throw new Error("La hoja " + name + " contiene encabezados duplicados; no se modificó.");
        seen.add(value);
    });
    headers.forEach((header, index) => {
        if (actual[index] === header) return;
        if (!actual[index]) {
            sheet.getRange(1, index + 1).setValue(header);
            actual[index] = header;
        } else {
            sheet.insertColumnBefore(index + 1);
            actual.splice(index, 0, header);
            sheet.getRange(1, index + 1).setValue(header);
        }
    });
    const verified = sheet.getRange(1, 1, 1, headers.length).getValues()[0]
        .map(value => String(value == null ? "" : value).trim());
    if (headers.some((header, index) => verified[index] !== header)) {
        throw new Error("No se pudo completar de forma segura el esquema de " + name + ".");
    }
    return sheet;
}
function ensureInboxConversationSheets_() {
    const specs = [
        ["conversations", INBOX_CONVERSATIONS_SHEET_, INBOX_CONVERSATION_HEADERS_],
        ["messages", INBOX_MESSAGES_SHEET_, INBOX_MESSAGE_HEADERS_],
        ["states", INBOX_CONVERSATION_STATE_SHEET_, INBOX_STATE_HEADERS_],
        ["audit", INBOX_CONVERSATION_AUDIT_SHEET_, INBOX_CONVERSATION_AUDIT_HEADERS_],
        ["flags", INBOX_CONVERSATION_FLAGS_SHEET_, INBOX_FLAGS_HEADERS_]
    ];
    const result = {};
    specs.forEach(([key, name, headers]) => { result[key] = inboxConversationSheet_(name, headers); });
    return result;
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
function inboxPlainTextPreview_(value, maxLength) {
    const limit = Number.isSafeInteger(maxLength) ? Math.max(1, Math.min(500, maxLength)) : 180;
    let text = String(value == null ? "" : value);
    // El resumen nunca debe mostrar contenido ejecutable ni etiquetas HTML.
    text = text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/blockquote|\/tr|\/section|\/article)\b[^>]*>/gi, " ")
        .replace(/<[^>]*>/g, " ");
    const namedEntities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" };
    text = text.replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
        .replace(/&(amp|lt|gt|quot|apos|#39);/gi, (entity, name) => namedEntities[name.toLowerCase()] || " ")
        .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (entity, code) => {
            const point = code.charAt(0).toLowerCase() === "x"
                ? parseInt(code.slice(1), 16) : parseInt(code, 10);
            if (!Number.isSafeInteger(point) || point <= 0 || point > 0x10FFFF ||
                (point >= 0xD800 && point <= 0xDFFF)) return " ";
            try { return String.fromCodePoint(point); } catch (error) { return " "; }
        });
    return text.replace(/[\s\u00A0]+/g, " ").trim().slice(0, limit);
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
    // El dispatcher ya verificó la sesión y adjunta este actor de confianza.
    // El fallback mantiene las pruebas/llamadas internas independientes.
    const verified = payload && payload.__feedbackActor
        ? payload.__feedbackActor
        : assertFeedbackSession(payload, null);
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
const INBOX_RECIPIENT_ROLE_POLICY_ = Object.freeze({
    desarrollador: new Set(["desarrollador","jefe","supervisor","tecnico","tecnico_exterior"]),
    jefe: new Set(["supervisor","tecnico","tecnico_exterior"]),
    supervisor: new Set(["jefe"]),
    tecnico: new Set(["supervisor"]),
    tecnico_exterior: new Set(["supervisor"])
});
function inboxCanStartConversationWith_(actorRole, recipientRole) {
    const allowedRoles = INBOX_RECIPIENT_ROLE_POLICY_[normalizeFeedbackRole(actorRole)];
    return Boolean(allowedRoles && allowedRoles.has(normalizeFeedbackRole(recipientRole)));
}
function inboxAssertRecipientAllowed_(actor, recipient) {
    if (!inboxCanStartConversationWith_(actor.role, recipient.role)) {
        throw new Error("El destinatario no está permitido por la jerarquía de comunicación.");
    }
}
function handleNotifyDevelopersDriveCritical(payload) {
    const requester = inboxConversationActor_(payload);
    if (requester.role !== "desarrollador") throw new Error("Solo Desarrollador puede emitir alertas críticas de Drive.");
    const usagePercent = Number(payload && payload.usagePercent);
    if (!Number.isFinite(usagePercent) || usagePercent < 80 || usagePercent > 100) {
        throw new Error("La alerta de Drive requiere una cuota válida igual o superior al 80 %.");
    }
    const alertDate = String(payload && payload.alertDate || "").replace(/[^0-9]/g, "").slice(0, 8);
    if (!/^[0-9]{8}$/.test(alertDate)) throw new Error("La fecha de alerta no es válida.");

    const usersSheet = getSpreadsheet().getSheetByName("Users");
    if (!usersSheet) throw new Error("No se encontró la hoja USERS.");
    const userRows = inboxConversationRows_(usersSheet, Math.max(8, usersSheet.getLastColumn()));
    const developerIds = new Set();
    const developers = userRows.filter(row => inboxActiveUserRow_(row) &&
        normalizeFeedbackRole(row[3]) === "desarrollador").map(row => {
            const id = String(row[0] || "").trim();
            if (!id || developerIds.has(id)) return null;
            developerIds.add(id);
            return id;
        }).filter(Boolean);
    const systemActor = { userId: "GPSpedia-System", userName: "GPSpedia", role: "desarrollador" };
    const body = "El uso de la cuota compartida de Google Drive alcanzó o superó el umbral crítico del 80 %. Revisa el Monitor de GDrive en el panel de desarrollador.";
    let notifiedCount = 0;
    developers.forEach(recipientId => {
        const safeRecipientId = recipientId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 60);
        const result = handleCreateInboxConversation({
            __feedbackActor: systemActor,
            recipientId,
            subject: "Alerta de almacenamiento Drive",
            body,
            category: "general",
            idempotencyKey: "drive80_" + alertDate + "_" + safeRecipientId
        });
        if (result && result.status === "success") notifiedCount++;
    });
    return { status: "success", notifiedCount, developerCount: developers.length, usagePercent };
}

function handleGetInboxRecipients(payload) {
    const actor = inboxConversationActor_(payload), sheet = getSpreadsheet().getSheetByName("Users");
    if (!sheet) throw new Error("No se encontró la hoja USERS.");
    const rows = inboxConversationRows_(sheet, Math.max(8, sheet.getLastColumn()));
    const recipients = rows.filter(inboxActiveUserRow_).map(row => ({
        id: String(row[0]).trim(), username: String(row[1] || "").trim(),
        role: normalizeFeedbackRole(row[3]), name: String(row[6] || row[1] || "Usuario").trim()
    })).filter(user => user.id !== actor.id && inboxCanStartConversationWith_(actor.role, user.role));
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
function inboxFlagIsTrue_(value) {
    return value === true || String(value || "").trim().toLowerCase() === "true";
}
function inboxFindFlag_(sheet, conversationId, userId) {
    if (!sheet) return null;
    const rows = inboxConversationRows_(sheet,INBOX_FLAGS_HEADERS_.length), matches = [];
    rows.forEach((row,index) => {
        if (String(row[0]) === conversationId && String(row[1]) === userId) matches.push({row,rowNumber:index+2});
    });
    if (matches.length > 1) throw new Error("Las preferencias del participante están duplicadas.");
    return matches.length ? matches[0] : null;
}
function inboxEnsureFlag_(sheet, conversationId, userId, now) {
    const found = inboxFindFlag_(sheet,conversationId,userId);
    if (found) return found;
    const row = [conversationId,userId,false,false,now], rowNumber = sheet.getLastRow() + 1;
    const range = sheet.getRange(rowNumber,1,1,row.length);
    range.setValues([row]); SpreadsheetApp.flush();
    const saved = range.getValues()[0];
    if (row.some((value,index) => String(saved[index]) !== String(value))) throw new Error("No se pudo confirmar el estado privado de Inbox.");
    return {row,rowNumber};
}
function inboxWriteFlag_(sheet, found, row) {
    const range = sheet.getRange(found.rowNumber,1,1,INBOX_FLAGS_HEADERS_.length);
    range.setValues([row]); SpreadsheetApp.flush();
    const saved = range.getValues()[0];
    if (row.some((value,index) => String(saved[index]) !== String(value))) throw new Error("No se pudo confirmar el cambio de estado privado de Inbox.");
    found.row = row;
}
function inboxAssertVisible_(sheet, conversationId, userId) {
    const flag = inboxFindFlag_(sheet,conversationId,userId);
    if (flag && inboxFlagIsTrue_(flag.row[3])) {
        throw new Error("La conversación fue ocultada de tu bandeja y ya no está disponible.");
    }
    return flag;
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
    if (messageId && rows.some(row => String(row[2]) === actor.id && String(row[4]) === action && String(row[6]) === messageId)) return;
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
function inboxUpdateConversationForMessage_(sheet, found, message, messageRows, now) {
    const row = found.row.slice();
    const conversationMessages = messageRows.filter(item => String(item[1]) === String(message[1]));
    const messageIndex = conversationMessages.findIndex(item => String(item[0]) === String(message[0]));
    if (messageIndex < 0) throw new Error("No se pudo localizar el mensaje para actualizar la conversación.");
    const storedLastMessageIndex = row[13]
        ? conversationMessages.findIndex(item => String(item[0]) === String(row[13]))
        : -1;
    // La hoja conserva el orden de inserción bajo ScriptLock. El índice evita
    // que dos mensajes con la misma marca de tiempo hagan retroceder el resumen
    // cuando se reintenta una solicitud idempotente anterior.
    const effectiveLastMessageIndex = storedLastMessageIndex >= 0
        ? storedLastMessageIndex
        : conversationMessages.length - 1;
    if (storedLastMessageIndex < 0 || messageIndex > effectiveLastMessageIndex) {
        const latestMessage = conversationMessages[storedLastMessageIndex < 0 ? conversationMessages.length - 1 : messageIndex];
        row[2] = now; row[13] = latestMessage[0]; row[14] = latestMessage[2];
        row[15] = inboxPlainTextPreview_(latestMessage[6], 180);
        row[16] = conversationMessages.length;
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
function inboxAssertTextOnlyPayload_(payload) {
    const messageType = payload.messageType === undefined ? "text" : String(payload.messageType).trim().toLowerCase();
    if (messageType !== "text") throw new Error("Inbox solo admite mensajes de texto.");
    if (payload.attachments !== undefined && (!Array.isArray(payload.attachments) || payload.attachments.length > 0)) {
        throw new Error("Los adjuntos no están soportados en Inbox.");
    }
    if (payload.attachment !== undefined && payload.attachment !== null) {
        throw new Error("Los adjuntos no están soportados en Inbox.");
    }
}
function inboxAssertSingleRecipient_(payload) {
    if (payload.broadcast === true ||
        (Array.isArray(payload.recipientIds) && payload.recipientIds.length > 0) ||
        (Array.isArray(payload.recipients) && payload.recipients.length > 0)) {
        throw new Error("Inbox requiere exactamente un destinatario; no se permite difusión.");
    }
}
function handleCreateInboxConversation(payload) {
    const actor = inboxConversationActor_(payload);
    inboxAssertTextOnlyPayload_(payload);
    inboxAssertSingleRecipient_(payload);
    const subject = inboxConversationText_(payload.subject,150,"El asunto",false);
    const body = inboxConversationText_(payload.body,5000,"El mensaje",true);
    const category = String(payload.category || "general").trim().toLowerCase();
    if (!INBOX_CATEGORIES_.has(category)) throw new Error("La categoría no está permitida.");
    const createKey = inboxConversationKey_(payload.idempotencyKey,"La clave de creación");
    const recipientId = String(payload.recipientId || "").trim();
    if (!recipientId || recipientId === actor.id) throw new Error("Selecciona un destinatario individual válido.");
    const type = "direct";
    const createHash = inboxConversationHash_({subject,body,category,type,recipientId});
    return withInboxConversationLock_(() => {
        const sheets = ensureInboxConversationSheets_();
        const recipient = inboxFindUser_(recipientId);
        inboxAssertRecipientAllowed_(actor, recipient);
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
        inboxUpdateConversationForMessage_(sheets.conversations,found,message.row,messageRows,now);
        inboxUpdateParticipantStates_(sheets.states,conversationId,inboxParticipants_(found.row),actor,message.row[0],messageRows,now);
        inboxAppendAudit_(sheets.audit,actor,"conversation_created",conversationId,message.row[0],"Conversación creada para un destinatario individual.");
        return {status:"success",conversationId,messageId:message.row[0],idempotentReplay:Boolean(existing.length)};
    });
}
function handleSendInboxMessage(payload) {
    const actor = inboxConversationActor_(payload);
    inboxAssertTextOnlyPayload_(payload);
    const conversationId = String(payload.conversationId || "").trim();
    if (!conversationId || conversationId.length > 100) throw new Error("La conversación no es válida.");
    const body = inboxConversationText_(payload.body,5000,"El mensaje",true), key = inboxConversationKey_(payload.idempotencyKey,"La clave idempotente");
    const hash = inboxConversationHash_({conversationId,authorId:actor.id,body});
    return withInboxConversationLock_(() => {
        const sheets = ensureInboxConversationSheets_(), conversations = inboxConversationRows_(sheets.conversations,INBOX_CONVERSATION_HEADERS_.length);
        const found = inboxFindConversation_(conversations,conversationId), participants = inboxAssertParticipant_(found.row,actor.id);
        inboxAssertVisible_(sheets.flags,conversationId,actor.id);
        if (String(found.row[7] || "").trim() !== actor.id) throw new Error("Solo quien inició el caso puede agregar comentarios.");
        if (String(found.row[6]) !== "open") throw new Error("El caso está cerrado y no admite más comentarios.");
        const messages = inboxConversationRows_(sheets.messages,INBOX_MESSAGE_HEADERS_.length);
        let message = inboxFindMessageByKey_(messages,conversationId,actor.id,key);
        if (message && String(message.row[8]) !== hash) throw new Error("La clave idempotente ya se utilizó con otro contenido.");
        const now = new Date().toISOString();
        const isNewMessage = !message;
        if (isNewMessage) { inboxAssertRateLimit_(messages,actor.id,new Date(now)); message = inboxAppendMessage_(sheets.messages,conversationId,actor,body,key,hash,now); messages.push(message.row); }
        inboxUpdateConversationForMessage_(sheets.conversations,found,message.row,messages,now);
        inboxUpdateParticipantStates_(sheets.states,conversationId,participants,actor,message.row[0],messages,now);
        inboxAppendAudit_(sheets.audit,actor,"message",conversationId,message.row[0],"Mensaje agregado a la conversación.");
        return {status:"success",conversationId,messageId:message.row[0],idempotentReplay:!isNewMessage};
    });
}
function handleGetInboxConversations(payload) {
    const actor = inboxConversationActor_(payload), folder = String(payload.folder || "received").trim().toLowerCase();
    if (!["all","received","read","unread","sent","archived"].includes(folder)) throw new Error("La carpeta de Inbox no es válida.");
    const category = String(payload.category || "all").trim().toLowerCase();
    if (category !== "all" && !INBOX_CATEGORIES_.has(category)) throw new Error("La categoría de Inbox no es válida.");
    const query = String(payload.query || "").trim().slice(0,80).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    const cursorRaw = String(payload.cursor === undefined || payload.cursor === null ? "0" : payload.cursor);
    let anchorTimestamp = null, anchorConversationId = "";
    if (cursorRaw !== "0") {
        const separator = cursorRaw.lastIndexOf("|");
        const timestamp = separator > 0 ? Date.parse(cursorRaw.slice(0,separator)) : NaN;
        anchorConversationId = separator > 0 ? cursorRaw.slice(separator+1) : "";
        if (!Number.isFinite(timestamp) || !/^[A-Za-z0-9_-]{8,100}$/.test(anchorConversationId)) {
            throw new Error("El cursor no es válido.");
        }
        anchorTimestamp = timestamp;
    }
    const requestedSize = Number(payload.pageSize);
    const pageSize = Number.isFinite(requestedSize) ? Math.max(1,Math.min(50,Math.floor(requestedSize))) : 20;
    return withInboxConversationLock_(() => {
        const sheets = ensureInboxConversationSheets_();
        const conversations = inboxConversationRows_(sheets.conversations,INBOX_CONVERSATION_HEADERS_.length);
        const stateRows = inboxConversationRows_(sheets.states,INBOX_STATE_HEADERS_.length);
        const flagRows = inboxConversationRows_(sheets.flags,INBOX_FLAGS_HEADERS_.length);
        const messageRows = inboxConversationRows_(sheets.messages,INBOX_MESSAGE_HEADERS_.length);
        const conversationIds = new Set();
        conversations.forEach(row => {
            const id = String(row[0] || "");
            if (!id || conversationIds.has(id)) throw new Error("El identificador de una conversación está vacío o duplicado.");
            conversationIds.add(id);
        });
        const messageIds = new Set();
        const messagesByConversation = new Map();
        messageRows.forEach(message => {
            const id = String(message[1] || ""), messageId = String(message[0] || "");
            if (!id || !conversationIds.has(id)) throw new Error("El historial contiene un mensaje sin conversación válida.");
            if (!messageId || messageIds.has(messageId)) throw new Error("El historial contiene un identificador de mensaje vacío o duplicado.");
            messageIds.add(messageId);
            if (!messagesByConversation.has(id)) messagesByConversation.set(id, []);
            messagesByConversation.get(id).push(message);
        });
        const stateMap = new Map();
        stateRows.forEach(row => {
            const key = String(row[0]) + "|" + String(row[1]);
            if (stateMap.has(key)) throw new Error("El estado de un participante está duplicado.");
            stateMap.set(key,row);
        });
        const flagsMap = new Map();
        flagRows.forEach(row => {
            const key = String(row[0]) + "|" + String(row[1]);
            if (flagsMap.has(key)) throw new Error("Las preferencias de un participante están duplicadas.");
            flagsMap.set(key,row);
        });
        const summaries = conversations.map(row => {
            const participants = inboxParticipants_(row);
            if (!participants.some(user => user.id === actor.id)) return null;
            const conversationId = String(row[0]);
            participants.forEach(user => {
                if (!stateMap.has(conversationId + "|" + user.id)) {
                    throw new Error("El estado de los participantes está incompleto para la conversación " + conversationId + ".");
                }
            });
            const other = participants.filter(user => user.id !== actor.id);
            const state = stateMap.get(conversationId + "|" + actor.id);
            const flag = flagsMap.get(conversationId + "|" + actor.id) || [];
            if (inboxFlagIsTrue_(flag[3])) return null;
            const conversationMessages = messagesByConversation.get(conversationId) || [];
            const expectedMessageCount = Number(row[16]);
            if (!Number.isInteger(expectedMessageCount) || expectedMessageCount < 0 ||
                conversationMessages.length !== expectedMessageCount) {
                throw new Error("El contador de mensajes no coincide con el historial de la conversación " + conversationId + ".");
            }
            const lastMessage = conversationMessages[conversationMessages.length - 1] || null;
            if ((expectedMessageCount > 0 && String(row[13] || "") !== String(lastMessage[0])) ||
                (expectedMessageCount === 0 && String(row[13] || ""))) {
                throw new Error("La referencia al último mensaje no coincide con el historial de la conversación " + conversationId + ".");
            }
            const lastReadMessageId = String(state[3] || "");
            const readIndex = lastReadMessageId ? conversationMessages.findIndex(message => String(message[0]) === lastReadMessageId) : -1;
            if (lastReadMessageId && readIndex < 0) throw new Error("El marcador de lectura no pertenece al historial de la conversación.");
            const incomingUnreadCount = conversationMessages.slice(readIndex + 1).filter(message => String(message[3]) !== actor.id).length;
            const isMarkedUnread = inboxFlagIsTrue_(flag[2]);
            const unreadCount = Math.max(incomingUnreadCount,isMarkedUnread ? 1 : 0);
            return {
                conversationId,subject:String(row[3] || ""),category:String(row[4] || "general"),
                type:String(row[5] || "direct"),status:String(row[6] || "open"),createdAt:String(row[1] || ""),
                updatedAt:String(row[2] || ""),createdById:String(row[7] || ""),lastMessageAt:String(row[14] || ""),
                lastMessageId:String(row[13] || ""),lastMessagePreview:inboxPlainTextPreview_(row[15] || (lastMessage ? lastMessage[6] : ""),180),messageCount:expectedMessageCount,
                lastMessageAuthorName:String(lastMessage ? lastMessage[4] || "" : ""),
                lastMessageAuthorId:String(lastMessage ? lastMessage[3] || "" : ""),
                otherParticipants:other.map(user => ({id:user.id,name:String(user.name || ""),role:String(user.role || "")})),
                unreadCount,isMarkedUnread,archived:inboxFlagIsTrue_(state[4]),
                hasSent:inboxFlagIsTrue_(state[5]),hasReceived:inboxFlagIsTrue_(state[6])
            };
        }).filter(Boolean);
        const counts = summaries.reduce((result,item) => {
            if (item.archived) result.archived++;
            else { if (item.hasReceived) result.received++; if (item.unreadCount > 0) result.unread++; if (item.hasSent) result.sent++; }
            return result;
        },{received:0,unread:0,sent:0,archived:0});
        const matchesQuery = item => !query || [
            item.subject,item.category,item.lastMessagePreview,item.lastMessageAuthorName,
            ...item.otherParticipants.map(user => user.name),
            ...(messagesByConversation.get(item.conversationId) || []).map(message => String(message[6] || ""))
        ].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes(query);
        const filtered = summaries.filter(item => {
            if (folder === "all" && query) return true;
            if (folder === "archived") return item.archived;
            if (item.archived) return false;
            if (folder === "received") return item.hasReceived;
            if (folder === "read") return item.hasReceived && item.unreadCount === 0;
            if (folder === "unread") return item.unreadCount > 0;
            if (folder === "sent") return item.hasSent;
            return true;
        }).filter(item => category === "all" || item.category === category)
            .filter(matchesQuery)
             .sort((a,b) => {
                const timeA = Date.parse(a.lastMessageAt || a.updatedAt) || 0;
                const timeB = Date.parse(b.lastMessageAt || b.updatedAt) || 0;
                return timeB - timeA || String(b.conversationId).localeCompare(String(a.conversationId));
            });
        // El cursor conserva la clave de orden, no el offset ni la fila: si el
        // elemento ancla se archiva o recibe actividad nueva, las páginas siguen.
        const startIndex = anchorTimestamp === null ? 0 : filtered.findIndex(item => {
            const itemTimestamp = Date.parse(item.lastMessageAt || item.updatedAt) || 0;
            return itemTimestamp < anchorTimestamp ||
                (itemTimestamp === anchorTimestamp && String(item.conversationId).localeCompare(anchorConversationId) < 0);
        });
        const safeStartIndex = startIndex < 0 ? filtered.length : startIndex;
        const data = filtered.slice(safeStartIndex,safeStartIndex+pageSize);
        const hasMore = safeStartIndex + data.length < filtered.length;
        const lastItem = data[data.length - 1];
        const lastItemTimestamp = lastItem ? (Date.parse(lastItem.lastMessageAt || lastItem.updatedAt) || 0) : 0;
        const nextCursor = hasMore && lastItem
            ? new Date(lastItemTimestamp).toISOString() + "|" + lastItem.conversationId
            : null;
        return {status:"success",data,counts,total:filtered.length,nextCursor,hasMore,pageSize};
    });
}
function handleGetInboxMessages(payload) {
    const actor = inboxConversationActor_(payload), conversationId = String(payload.conversationId || "").trim();
    if (!conversationId) throw new Error("Se requiere una conversación.");
    const cursorRaw = String(payload.cursor === undefined || payload.cursor === null ? "0" : payload.cursor);
    if (cursorRaw !== "0" && !/^[A-Za-z0-9_-]{8,100}$/.test(cursorRaw)) throw new Error("El cursor no es válido.");
    const anchorMessageId = cursorRaw === "0" ? "" : cursorRaw;
    const requestedSize = Number(payload.pageSize);
    const pageSize = Number.isFinite(requestedSize) ? Math.max(1,Math.min(50,Math.floor(requestedSize))) : 50;
    return withInboxConversationLock_(() => {
        const sheets = ensureInboxConversationSheets_();
        const found = inboxFindConversation_(inboxConversationRows_(sheets.conversations,INBOX_CONVERSATION_HEADERS_.length),conversationId);
        inboxAssertParticipant_(found.row,actor.id);
        inboxAssertVisible_(sheets.flags,conversationId,actor.id);
        const messages = inboxConversationRows_(sheets.messages,INBOX_MESSAGE_HEADERS_.length)
            .filter(row => String(row[1]) === conversationId);
        const expectedMessageCount = Number(found.row[16]);
        if (!Number.isInteger(expectedMessageCount) || expectedMessageCount < 0 || messages.length !== expectedMessageCount) {
            throw new Error("El contador de mensajes no coincide con el historial de la conversación.");
        }
        const seenMessageIds = new Set();
        messages.forEach(message => {
            const messageId = String(message[0] || "");
            if (!messageId || seenMessageIds.has(messageId)) throw new Error("El historial contiene un identificador de mensaje vacío o duplicado.");
            seenMessageIds.add(messageId);
        });
        const lastMessage = messages[messages.length - 1] || null;
        if ((expectedMessageCount > 0 && String(found.row[13] || "") !== String(lastMessage[0])) ||
            (expectedMessageCount === 0 && String(found.row[13] || ""))) {
            throw new Error("La referencia al último mensaje no coincide con el historial de la conversación.");
        }
        // ScriptLock serializa las escrituras y la hoja conserva el orden de inserción.
        // Ese orden es la secuencia canónica: no depende de timestamps que pueden
        // coincidir o retroceder si el reloj del entorno se ajusta.
        // Cursor anclado al mensaje más antiguo de la página entregada. Los
        // mensajes nuevos quedan fuera de las páginas históricas ya iniciadas.
        const anchorIndex = anchorMessageId
            ? messages.findIndex(message => String(message[0]) === anchorMessageId)
            : messages.length;
        if (anchorMessageId && anchorIndex < 0) throw new Error("El cursor del historial expiró; vuelve a cargar la conversación.");
        const endIndex = anchorIndex;
        const startIndex = Math.max(0,endIndex-pageSize);
        const data = messages.slice(startIndex,endIndex).map(row => ({
            messageId:String(row[0]),conversationId:String(row[1]),createdAt:String(row[2]),authorId:String(row[3]),
            authorName:String(row[4]),authorRole:String(row[5]),body:String(row[6] || "")
        }));
        const hasMore = startIndex > 0;
        const nextCursor = hasMore && data.length ? data[0].messageId : null;
        return {status:"success",data,total:messages.length,nextCursor,hasMore,pageSize};
    });
}
function handleMarkInboxRead(payload) {
    const actor = inboxConversationActor_(payload), conversationId = String(payload.conversationId || "").trim();
    if (!conversationId) throw new Error("Se requiere una conversación.");
    return withInboxConversationLock_(() => {
        const sheets = ensureInboxConversationSheets_();
        const found = inboxFindConversation_(inboxConversationRows_(sheets.conversations,INBOX_CONVERSATION_HEADERS_.length),conversationId);
        inboxAssertParticipant_(found.row,actor.id);
        const flagsSheet = sheets.flags;
        inboxAssertVisible_(flagsSheet,conversationId,actor.id);
        const now = new Date().toISOString();
        const state = inboxEnsureState_(sheets.states,conversationId,actor.id,now), row = state.row.slice();
        const flag = inboxFindFlag_(flagsSheet,conversationId,actor.id);
        const wasMarkedUnread = Boolean(flag && inboxFlagIsTrue_(flag.row[2]));
        const messages = inboxConversationRows_(sheets.messages,INBOX_MESSAGE_HEADERS_.length).filter(item => String(item[1]) === conversationId);
        const throughId = String(payload.throughMessageId || "");
        const requestedIndex = throughId ? messages.findIndex(item => String(item[0]) === throughId) : messages.length - 1;
        if (throughId && requestedIndex < 0) throw new Error("El mensaje de lectura no pertenece a la conversación.");
        const previousMarker = String(row[3] || "");
        const previousIndex = previousMarker ? messages.findIndex(item => String(item[0]) === previousMarker) : -1;
        if (previousMarker && previousIndex < 0) throw new Error("El marcador de lectura no pertenece al historial de la conversación.");
        const effectiveIndex = Math.max(previousIndex,requestedIndex);
        row[2] = effectiveIndex >= 0 ? messages[effectiveIndex][2] : "";
        row[3] = effectiveIndex >= 0 ? String(messages[effectiveIndex][0]) : "";
        row[7] = now;
        inboxWriteState_(sheets.states,state,row);
        if (wasMarkedUnread) {
            const flagRow = flag.row.slice(); flagRow[2] = false; flagRow[4] = now;
            inboxWriteFlag_(flagsSheet,flag,flagRow);
        }
        const unread = messages.slice(effectiveIndex + 1).filter(item => String(item[3]) !== actor.id).length;
        if (previousMarker !== row[3] || wasMarkedUnread) inboxAppendAudit_(sheets.audit,actor,"read",conversationId,row[3],"Lectura confirmada hasta el mensaje indicado.");
        return {status:"success",conversationId,unreadCount:unread};
    });
}
function handleMarkInboxUnread(payload) {
    const actor = inboxConversationActor_(payload), conversationId = String(payload.conversationId || "").trim();
    if (!conversationId || conversationId.length > 100) throw new Error("La conversación no es válida.");
    return withInboxConversationLock_(() => {
        const sheets = ensureInboxConversationSheets_();
        const found = inboxFindConversation_(inboxConversationRows_(sheets.conversations,INBOX_CONVERSATION_HEADERS_.length),conversationId);
        inboxAssertParticipant_(found.row,actor.id);
        const existingFlagsSheet = sheets.flags;
        if (!existingFlagsSheet) throw new Error("El esquema Inbox está incompleto: falta la hoja de preferencias (InboxConversationFlags) para marcar conversaciones como no leídas. No se creará automáticamente.");
        const existingFlag = inboxFindFlag_(existingFlagsSheet,conversationId,actor.id);
        if (existingFlag && inboxFlagIsTrue_(existingFlag.row[3])) throw new Error("La conversación fue ocultada de tu bandeja y ya no está disponible.");
        const messages = inboxConversationRows_(sheets.messages,INBOX_MESSAGE_HEADERS_.length).filter(item => String(item[1]) === conversationId);
        if (!messages.some(item => String(item[3]) !== actor.id)) {
            throw new Error("No hay mensajes recibidos que se puedan marcar como no leídos.");
        }
        const state = inboxFindState_(sheets.states,conversationId,actor.id);
        const lastReadMessageId = String(state && state.row[3] || "");
        const readIndex = lastReadMessageId ? messages.findIndex(item => String(item[0]) === lastReadMessageId) : -1;
        if (lastReadMessageId && readIndex < 0) throw new Error("El marcador de lectura no pertenece al historial de la conversación.");
        const unreadCount = Math.max(1,messages.slice(readIndex + 1).filter(item => String(item[3]) !== actor.id).length);
        const flagsSheet = existingFlagsSheet;
        const flag = existingFlag || inboxEnsureFlag_(flagsSheet,conversationId,actor.id,new Date().toISOString());
        const unreadChanged = !inboxFlagIsTrue_(flag.row[2]);
        const stateWasArchived = Boolean(state && inboxFlagIsTrue_(state.row[4]));
        const changed = unreadChanged || stateWasArchived;
        if (changed) {
            const now = new Date().toISOString();
            const previousFlag = flag.row.slice(), previousState = stateWasArchived ? state.row.slice() : null;
            const nextFlag = flag.row.slice();
            nextFlag[2] = true; nextFlag[4] = now;
            const nextState = stateWasArchived ? state.row.slice() : null;
            if (nextState) { nextState[4] = false; nextState[7] = now; }
            try {
                if (nextState) inboxWriteState_(sheets.states,state,nextState);
                if (unreadChanged) inboxWriteFlag_(flagsSheet,flag,nextFlag);
                inboxAppendAudit_(sheets.audit,actor,"mark_unread",conversationId,"",
                    stateWasArchived ? "Conversación marcada como no leída y retirada de Archivados para este participante." :
                        "Conversación marcada como no leída para este participante.");
            } catch (error) {
                if (unreadChanged) {
                    try { inboxWriteFlag_(flagsSheet,flag,previousFlag); }
                    catch (rollbackError) { console.error("No se pudo revertir el marcador no leído tras fallar la auditoría:",rollbackError); }
                }
                if (previousState) {
                    try { inboxWriteState_(sheets.states,state,previousState); }
                    catch (rollbackError) { console.error("No se pudo revertir el archivo tras fallar la auditoría:",rollbackError); }
                }
                throw error;
            }
        }
        return {status:"success",conversationId,markedUnread:true,alreadyMarkedUnread:!unreadChanged,unarchived:stateWasArchived,unreadCount};
    });
}
function handleDeleteInboxConversation(payload) {
    const actor = inboxConversationActor_(payload), conversationId = String(payload.conversationId || "").trim();
    if (!conversationId || conversationId.length > 100) throw new Error("La conversación no es válida.");
    return withInboxConversationLock_(() => {
        const sheets = ensureInboxConversationSheets_();
        const found = inboxFindConversation_(inboxConversationRows_(sheets.conversations,INBOX_CONVERSATION_HEADERS_.length),conversationId);
        inboxAssertParticipant_(found.row,actor.id);
        const flagsSheet = sheets.flags;
        if (!flagsSheet) throw new Error("El esquema Inbox está incompleto: falta la hoja de preferencias (InboxConversationFlags) para ocultar conversaciones. No se creará automáticamente.");
        const flag = inboxEnsureFlag_(flagsSheet,conversationId,actor.id,new Date().toISOString());
        if (inboxFlagIsTrue_(flag.row[3])) return {status:"success",conversationId,deleted:true,alreadyDeleted:true};
        const previous = flag.row.slice(), row = flag.row.slice(), now = new Date().toISOString();
        row[2] = false; row[3] = true; row[4] = now;
        inboxWriteFlag_(flagsSheet,flag,row);
        try {
            inboxAppendAudit_(sheets.audit,actor,"delete",conversationId,"","Conversación ocultada solo para este participante; se conserva el historial.");
        } catch (error) {
            try { inboxWriteFlag_(flagsSheet,flag,previous); }
            catch (rollbackError) { console.error("No se pudo revertir la ocultación tras fallar la auditoría:",rollbackError); }
            throw error;
        }
        return {status:"success",conversationId,deleted:true,alreadyDeleted:false};
    });
}
function handleArchiveInboxConversation(payload) {
    const actor = inboxConversationActor_(payload), conversationId = String(payload.conversationId || "").trim();
    if (!conversationId || typeof payload.archived !== "boolean") throw new Error("La conversación y el estado de archivo son obligatorios.");
    return withInboxConversationLock_(() => {
        const sheets = ensureInboxConversationSheets_();
        const found = inboxFindConversation_(inboxConversationRows_(sheets.conversations,INBOX_CONVERSATION_HEADERS_.length),conversationId);
        inboxAssertParticipant_(found.row,actor.id);
        inboxAssertVisible_(sheets.flags,conversationId,actor.id);
        const state = inboxEnsureState_(sheets.states,conversationId,actor.id,new Date().toISOString()), row = state.row.slice();
        const changed = row[4] !== payload.archived;
        row[4] = payload.archived; row[7] = new Date().toISOString();
        inboxWriteState_(sheets.states,state,row);
        if (changed) inboxAppendAudit_(sheets.audit,actor,payload.archived?"archive":"unarchive",conversationId,"","Estado de archivo actualizado.");
        return {status:"success",conversationId,archived:payload.archived};
    });
}
function handleCloseInboxConversation(payload) {
    const actor = inboxConversationActor_(payload), conversationId = String(payload.conversationId || "").trim();
    if (!conversationId || conversationId.length > 100) throw new Error("La conversación no es válida.");
    if (!["desarrollador","jefe","supervisor"].includes(actor.role)) {
        throw new Error("Solo Supervisor, Jefe o Desarrollador pueden cerrar un caso.");
    }
    return withInboxConversationLock_(() => {
        const sheets = ensureInboxConversationSheets_();
        const found = inboxFindConversation_(inboxConversationRows_(sheets.conversations,INBOX_CONVERSATION_HEADERS_.length),conversationId);
        inboxAssertParticipant_(found.row,actor.id);
        inboxAssertVisible_(sheets.flags,conversationId,actor.id);
        if (String(found.row[6]) === "closed") return {status:"success",conversationId,closed:true,alreadyClosed:true};
        if (String(found.row[6]) !== "open") throw new Error("El estado del caso no permite cerrarlo.");
        const now = new Date().toISOString(), row = found.row.slice();
        row[2] = now;
        row[6] = "closed";
        sheets.conversations.getRange(found.rowNumber,1,1,INBOX_CONVERSATION_HEADERS_.length).setValues([row]);
        SpreadsheetApp.flush();
        const saved = sheets.conversations.getRange(found.rowNumber,1,1,INBOX_CONVERSATION_HEADERS_.length).getValues()[0];
        if (String(saved[6]) !== "closed" || String(saved[2]) !== now) throw new Error("No se pudo confirmar el cierre del caso.");
        inboxAppendAudit_(sheets.audit,actor,"close",conversationId,"","Caso cerrado; no admite más comentarios.");
        return {status:"success",conversationId,closed:true,alreadyClosed:false};
    });
}
