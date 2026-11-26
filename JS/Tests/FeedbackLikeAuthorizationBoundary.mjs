import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const feedback = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const shared = readFileSync(new URL("../Services/SharedSessionActor.js", import.meta.url), "utf8");

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

const authorizeFeedbackAction = new Function([
    feedback.slice(permissionStart, permissionEnd),
    feedback.slice(publicActionsStart, publicActionsEnd),
    extractFunction(feedback, "normalizeFeedbackRole"),
    extractFunction(feedback, "assertFeedbackSession"),
    extractFunction(feedback, "authorizeFeedbackAction_"),
    "return authorizeFeedbackAction_;"
].join("\n"))();

const withSharedSessionActor_ = new Function(
    extractFunction(shared, "withSharedSessionActor_") + "\nreturn withSharedSessionActor_;"
)();

function makeEvent(payload) {
    return { postData: { contents: JSON.stringify({ action: "recordLike", payload }) } };
}
function payloadOf(event) {
    return JSON.parse(event.postData.contents).payload;
}
function inject(payload, actor) {
    return payloadOf(withSharedSessionActor_(makeEvent(payload), actor));
}

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log("PASS " + name);
}

const actorA = { userId: "beta-user-a", role: "tecnico", fullName: "Técnico Beta A", epoch: 3 };
const actorB = { userId: "beta-user-b", role: "tecnico", fullName: "Técnico Beta B", epoch: 5 };

test("el middleware elimina las identidades internas enviadas por el navegador", () => {
    const payload = inject({
        userId: actorA.userId,
        sessionToken: "synthetic-session-token-a",
        userName: "Nombre manipulado",
        userRole: "Desarrollador",
        __sharedSessionActor: { userId: "attacker", role: "desarrollador", epoch: 99 },
        __feedbackActor: { userId: "attacker", userName: "Atacante", role: "Desarrollador" }
    }, actorA);
    assert.deepEqual(payload.__sharedSessionActor, {
        userId: actorA.userId, role: actorA.role, fullName: actorA.fullName, epoch: actorA.epoch
    });
    assert.equal(Object.hasOwn(payload, "__feedbackActor"), false);
});

test("FEEDBACK atribuye el útil al actor A validado y no al nombre/rol del payload", () => {
    const payload = inject({
        userId: actorA.userId,
        sessionToken: "synthetic-session-token-a",
        userName: "Nombre manipulado",
        userRole: "Desarrollador",
        __feedbackActor: { userId: "attacker", userName: "Atacante", role: "Desarrollador" }
    }, actorA);
    const authorized = authorizeFeedbackAction("recordLike", payload);
    assert.equal(authorized.userId, actorA.userId);
    assert.equal(authorized.userName, actorA.fullName);
    assert.equal(authorized.userRole, "Tecnico");
    assert.equal(authorized.__feedbackActor.userId, actorA.userId);
    assert.equal(authorized.__feedbackActor.role, actorA.role);
});

test("dos sesiones sintéticas conservan identidades distintas", () => {
    const payloadA = inject({ userId: actorA.userId, sessionToken: "synthetic-session-token-a" }, actorA);
    const payloadB = inject({ userId: actorB.userId, sessionToken: "synthetic-session-token-b" }, actorB);
    const authorizedA = authorizeFeedbackAction("recordLike", payloadA);
    const authorizedB = authorizeFeedbackAction("recordLike", payloadB);
    assert.notEqual(authorizedA.__feedbackActor.userId, authorizedB.__feedbackActor.userId);
    assert.notEqual(authorizedA.__feedbackActor.userName, authorizedB.__feedbackActor.userName);
});

test("el cliente no puede sustituir userId aunque envíe un actor confiable falso", () => {
    const payload = inject({
        userId: "another-user",
        sessionToken: "synthetic-session-token-a",
        __sharedSessionActor: { userId: "another-user", role: "tecnico", epoch: 8 }
    }, actorA);
    assert.throws(() => authorizeFeedbackAction("recordLike", payload), /sesión no autorizada/);
});

test("un técnico no obtiene aprobación administrativa al falsificar userRole", () => {
    const payload = inject({
        userId: actorA.userId,
        sessionToken: "synthetic-session-token-a",
        userRole: "Desarrollador"
    }, actorA);
    assert.throws(() => authorizeFeedbackAction("approveVideo", payload), /sesión no autorizada/);
});

test("sin actor cargado se rechaza la acción protegida", () => {
    const payload = inject({
        userId: actorA.userId,
        sessionToken: "synthetic-session-token-a",
        __sharedSessionActor: actorA,
        __feedbackActor: actorA
    }, null);
    assert.equal(Object.hasOwn(payload, "__sharedSessionActor"), false);
    assert.equal(Object.hasOwn(payload, "__feedbackActor"), false);
    assert.throws(() => authorizeFeedbackAction("recordLike", payload), /falta el contexto de sesión compartido/);
});

test("el dispatcher obtiene el actor desde la caché local de sesión FEEDBACK", () => {
    const dispatcher = extractFunction(feedback, "doPost");
    assert.match(dispatcher, /getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken/);
    assert.match(dispatcher, /service:\s*"FEEDBACK"/);
    assert.match(dispatcher, /withSharedSessionActor_\(e, actor\)/);
    assert.doesNotMatch(dispatcher, /https?:\/\//, "FEEDBACK no debe coordinar la acción mediante URL de otro servicio.");
});

console.log("FeedbackLikeAuthorizationBoundary: " + passed + "/7 PASS");
