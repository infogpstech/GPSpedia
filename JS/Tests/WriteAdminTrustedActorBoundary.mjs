import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const write = readFileSync(new URL("../Services/write.js", import.meta.url), "utf8");
const admin = readFileSync(new URL("../Services/admin.js", import.meta.url), "utf8");
const shared = readFileSync(new URL("../Services/SharedSessionActor.js", import.meta.url), "utf8");

function extractFunction(source, name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, "No se encontró " + name);
    const end = source.indexOf("\nfunction ", start + 10);
    assert.ok(end > start, "No se encontró el final de " + name);
    return source.slice(start, end);
}
function makeEvent(action, payload) {
    return { postData: { contents: JSON.stringify({ action, payload }) } };
}
function payloadOf(event) {
    return JSON.parse(event.postData.contents).payload;
}

const withSharedSessionActor = new Function(
    extractFunction(shared, "withSharedSessionActor_") + "\nreturn withSharedSessionActor_;"
)();
const getAuthenticatedCollaborator = new Function(
    extractFunction(write, "getAuthenticatedCollaborator") + "\nreturn getAuthenticatedCollaborator;"
)();
const getAdminSessionContext = new Function(
    extractFunction(admin, "getAdminSessionContext_") + "\nreturn getAdminSessionContext_;"
)();

const actorTech = { userId: "beta-write-tech", role: "tecnico", fullName: "Técnico WRITE", epoch: 5 };
const actorDev = { userId: "beta-admin-dev", role: "desarrollador", fullName: "Desarrollador ADMIN", epoch: 6 };
const actorSupervisor = { userId: "beta-admin-supervisor", role: "supervisor", fullName: "Supervisor ADMIN", epoch: 7 };
let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log("PASS " + name);
}
function injected(action, payload, actor) {
    return payloadOf(withSharedSessionActor(makeEvent(action, payload), actor));
}

test("WRITE usa el nombre del actor confiable y no el userName/userRole del navegador", () => {
    const payload = injected("addOrUpdateCut", {
        userId: actorTech.userId,
        userName: "Nombre falsificado",
        userRole: "Desarrollador",
        __sharedSessionActor: { userId: "attacker", role: "desarrollador", epoch: 99 },
        __feedbackActor: { userId: "attacker", userName: "Atacante", role: "Desarrollador" }
    }, actorTech);
    assert.equal(getAuthenticatedCollaborator(payload, ["tecnico"]), actorTech.fullName);
    assert.equal(payload.__sharedSessionActor.userId, actorTech.userId);
    assert.equal(Object.hasOwn(payload, "__feedbackActor"), false);
});

test("WRITE rechaza ausencia de actor confiable", () => {
    const payload = injected("addOrUpdateCut", {
        userId: actorTech.userId,
        __sharedSessionActor: actorDev
    }, null);
    assert.throws(() => getAuthenticatedCollaborator(payload, ["tecnico"]), /falta el contexto de sesión compartido/);
});

test("WRITE rechaza userId discordante aunque exista actor confiable", () => {
    const payload = injected("addOrUpdateCut", {
        userId: "beta-write-other"
    }, actorTech);
    assert.throws(() => getAuthenticatedCollaborator(payload, ["tecnico"]), /contexto compartido no es válido/);
});

test("WRITE no permite escalar privilegios usando el rol enviado por el cliente", () => {
    const payload = injected("addOrUpdateCut", {
        userId: actorTech.userId,
        userRole: "Desarrollador"
    }, actorTech);
    assert.throws(() => getAuthenticatedCollaborator(payload, ["desarrollador"]), /tu rol no puede realizar esta operación/);
});

test("ADMIN obtiene contexto de Desarrollador desde actor confiable", () => {
    const payload = injected("setRichTextMode", {
        userId: actorDev.userId,
        userName: "Nombre falso",
        userRole: "Técnico",
        __sharedSessionActor: actorTech
    }, actorDev);
    assert.deepEqual(getAdminSessionContext(payload, ["desarrollador"]), {
        userId: actorDev.userId,
        role: "Desarrollador",
        fullName: actorDev.fullName,
        userName: actorDev.fullName,
        epoch: actorDev.epoch
    });
});

test("ADMIN rechaza Técnico aunque el navegador declare Desarrollador", () => {
    const payload = injected("setRichTextMode", {
        userId: actorTech.userId,
        userRole: "Desarrollador"
    }, actorTech);
    assert.throws(() => getAdminSessionContext(payload, ["desarrollador"]), /sesión no autorizada/);
});

test("ADMIN permite Supervisor solo en el conjunto de acciones de edición modal", () => {
    const payload = injected("updateVehicleField", {
        userId: actorSupervisor.userId,
        userRole: "Desarrollador"
    }, actorSupervisor);
    assert.equal(
        getAdminSessionContext(payload, ["desarrollador", "jefe", "supervisor"]).role,
        "Supervisor"
    );
    assert.throws(() => getAdminSessionContext(payload, ["desarrollador"]), /sesión no autorizada/);
});

test("ADMIN rechaza userId discordante", () => {
    const payload = injected("setRichTextMode", {
        userId: "beta-admin-other"
    }, actorDev);
    assert.throws(() => getAdminSessionContext(payload, ["desarrollador"]), /sesión no autorizada/);
});

test("WRITE y ADMIN cargan actor con su servicio y envuelven el evento antes de procesarlo", () => {
    const writePost = extractFunction(write, "doPost");
    const adminPost = extractFunction(admin, "doPost");
    assert.match(writePost, /getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "WRITE"/);
    assert.match(writePost, /withSharedSessionActor_\(e, actor\)/);
    assert.match(adminPost, /getCachedSharedSessionActor_\(payload\.userId, payload\.sessionToken, \{ service: "ADMIN"/);
    assert.match(adminPost, /withSharedSessionActor_\(e, actor\)/);
});

test("Los routers WRITE/ADMIN no coordinan otros Apps Script ni contienen URLs de servicios", () => {
    const stripComments = value => value.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const writePost = stripComments(extractFunction(write, "doPost"));
    const adminPost = stripComments(extractFunction(admin, "doPost"));
    assert.doesNotMatch(writePost, /UrlFetchApp|Coordinator|script\.google\.com\/macros\/s\//);
    assert.doesNotMatch(adminPost, /UrlFetchApp|Coordinator|script\.google\.com\/macros\/s\//);
    assert.doesNotMatch(write, /https:\/\/script\.google\.com\/macros\/s\//);
    assert.doesNotMatch(admin, /https:\/\/script\.google\.com\/macros\/s\//);
});

console.log("WriteAdminTrustedActorBoundary: " + passed + "/10 PASS");
