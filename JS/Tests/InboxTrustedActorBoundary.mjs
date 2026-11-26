import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const feedback = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const shared = readFileSync(new URL("../Services/SharedSessionActor.js", import.meta.url), "utf8");
const inbox = readFileSync(new URL("../Services/InboxConversations.js", import.meta.url), "utf8");

function extractFunction(source, name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = source.indexOf("\nfunction ", start + 10);
    assert.ok(end > start, "No se encontró el final de " + name);
    return source.slice(start, end);
}

const permissionStart = feedback.indexOf("const FEEDBACK_ACTION_PERMISSIONS = Object.freeze(");
const permissionEnd = feedback.indexOf("\nconst FEEDBACK_PUBLIC_ACTIONS", permissionStart);
assert.ok(permissionStart >= 0 && permissionEnd > permissionStart, "No se encontró la matriz de permisos FEEDBACK.");
const publicActionsStart = permissionEnd + 1;
const publicActionsEnd = feedback.indexOf("\nfunction authorizeFeedbackAction_", publicActionsStart);
assert.ok(publicActionsEnd > publicActionsStart, "No se encontró la lista de acciones públicas.");

const normalizeFeedbackRole = new Function(
    extractFunction(feedback, "normalizeFeedbackRole") + "\nreturn normalizeFeedbackRole;"
)();
const authorizeFeedbackAction = new Function([
    feedback.slice(permissionStart, permissionEnd),
    feedback.slice(publicActionsStart, publicActionsEnd),
    extractFunction(feedback, "normalizeFeedbackRole"),
    extractFunction(feedback, "assertFeedbackSession"),
    extractFunction(feedback, "authorizeFeedbackAction_"),
    "return authorizeFeedbackAction_;"
].join("\n"))();

const withSharedSessionActor = new Function(
    extractFunction(shared, "withSharedSessionActor_") + "\nreturn withSharedSessionActor_;"
)();

const rolesStart = inbox.indexOf("const INBOX_ACTIVE_ROLES_ = new Set(");
const rolesEnd = inbox.indexOf(");", rolesStart) + 2;
assert.ok(rolesStart >= 0 && rolesEnd > rolesStart, "No se encontró la lista de roles Inbox.");
const inboxRoles = new Function(inbox.slice(rolesStart, rolesEnd) + "\nreturn INBOX_ACTIVE_ROLES_;")();
const inboxConversationActor = new Function(
    "normalizeFeedbackRole", "INBOX_ACTIVE_ROLES_",
    extractFunction(inbox, "inboxConversationActor_") + "\nreturn inboxConversationActor_;"
)(normalizeFeedbackRole, inboxRoles);

function makeEvent(payload) {
    return { postData: { contents: JSON.stringify({ action: "inbox", payload }) } };
}
function payloadOf(event) {
    return JSON.parse(event.postData.contents).payload;
}
function inject(payload, actor) {
    return payloadOf(withSharedSessionActor(makeEvent(payload), actor));
}

const actorA = { userId: "beta-inbox-a", role: "tecnico", fullName: "Técnico Beta A", epoch: 3 };
const actorB = { userId: "beta-inbox-b", role: "desarrollador", fullName: "Desarrollador Beta B", epoch: 4 };
const tokenA = "synthetic-inbox-session-a";
const tokenB = "synthetic-inbox-session-b";
let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log("PASS " + name);
}

test("Inbox recibe el actor autenticado y descarta claims falsificados del navegador", () => {
    const payload = inject({
        userId: actorA.userId,
        sessionToken: tokenA,
        userName: "Nombre manipulado",
        userRole: "Desarrollador",
        __sharedSessionActor: { userId: "attacker", role: "desarrollador", epoch: 99 },
        __feedbackActor: { userId: "attacker", userName: "Atacante", role: "Desarrollador" }
    }, actorA);
    const authorized = authorizeFeedbackAction("getInboxConversations", payload);
    assert.deepEqual(inboxConversationActor(authorized), {
        id: actorA.userId, name: actorA.fullName, role: "tecnico"
    });
});

test("Inbox send conserva identidad independiente para una segunda sesión", () => {
    const payload = inject({
        userId: actorB.userId,
        sessionToken: tokenB,
        userName: "Nombre falso",
        userRole: "Técnico",
        __feedbackActor: { userId: actorA.userId, userName: actorA.fullName, role: actorA.role }
    }, actorB);
    const authorized = authorizeFeedbackAction("sendInboxMessage", payload);
    assert.deepEqual(inboxConversationActor(authorized), {
        id: actorB.userId, name: actorB.fullName, role: "desarrollador"
    });
});

test("El rol enviado por el cliente no permite a Técnico cerrar conversaciones", () => {
    const payload = inject({
        userId: actorA.userId, sessionToken: tokenA, userRole: "Desarrollador"
    }, actorA);
    assert.throws(() => authorizeFeedbackAction("closeInboxConversation", payload), /sesión no autorizada/);
});

test("Desarrollador autenticado conserva permiso de cierre aunque el cliente declare otro rol", () => {
    const payload = inject({
        userId: actorB.userId, sessionToken: tokenB, userRole: "Técnico"
    }, actorB);
    const authorized = authorizeFeedbackAction("closeInboxConversation", payload);
    assert.equal(inboxConversationActor(authorized).id, actorB.userId);
});

test("Inbox falla cerrado si el dispatcher no adjunta actor validado", () => {
    const payload = inject({
        userId: actorA.userId,
        sessionToken: tokenA,
        __feedbackActor: actorB,
        __sharedSessionActor: actorB
    }, null);
    assert.equal(Object.hasOwn(payload, "__feedbackActor"), false);
    assert.equal(Object.hasOwn(payload, "__sharedSessionActor"), false);
    assert.throws(() => authorizeFeedbackAction("getInboxConversations", payload), /falta el contexto de sesión compartido/);
    assert.throws(() => inboxConversationActor(payload), /no contiene una identidad válida/);
});

test("Inbox rechaza un rol que no pertenece a los roles activos", () => {
    const invalidActor = { userId: "beta-inbox-invalid", role: "viewer", fullName: "Viewer Beta", epoch: 9 };
    const payload = inject({
        userId: invalidActor.userId, sessionToken: "synthetic-viewer-session"
    }, invalidActor);
    assert.throws(() => authorizeFeedbackAction("getInboxConversations", payload), /sesión no autorizada/);
    assert.throws(() => inboxConversationActor({
        __feedbackActor: { userId: invalidActor.userId, userName: invalidActor.fullName, role: invalidActor.role }
    }), /no contiene una identidad válida/);
});

test("Inbox no acepta userId discordante aunque el token corresponda a una sesión válida", () => {
    const payload = inject({
        userId: "another-inbox-user", sessionToken: tokenA
    }, actorA);
    assert.throws(() => authorizeFeedbackAction("getInboxConversations", payload), /sesión no autorizada/);
});

console.log("InboxTrustedActorBoundary: " + passed + "/7 PASS");
