import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("JS/Frontend/ui.js", "utf8");
function extractFunction(source, name) {
    const marker = "async function " + name + "(";
    const start = source.indexOf(marker);
    assert.notEqual(start, -1, "No se encontró " + name);
    const open = source.indexOf("{", start);
    let depth = 0;
    for (let i = open; i < source.length; i++) {
        if (source[i] === "{") depth++;
        else if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
    }
    throw new Error("Función sin cerrar: " + name);
}
const fn = extractFunction(source, "executeTerminalCommand");
assert.match(fn, /split\(\/\\s\+\/\)/, "move debe separar argumentos con espacios reales, no con una barra invertida literal");
const calls = [];
const logs = [];
const commandHistory = [];
const execute = new Function(
    "routeAction", "getDeveloperSessionPayload", "isAdminPanelCurrent_", "log",
    "commandHistory", "commandHistoryIndex", "currentTerminalFolderId",
    fn + "\nreturn executeTerminalCommand;"
)(
    async (action, payload) => {
        calls.push({ action, payload });
        if (payload.command === "dir") return {
            status: "success",
            folders: [{ id: "folder-id-012345678901234567890", name: "Modelos" }],
            files: [{ id: "file-id-012345678901234567890", name: "foto.jpg", size: 1024 }]
        };
        return { status: "success", message: "Operación completada." };
    },
    () => ({ userId: "developer-1", sessionToken: "session-1" }),
    () => true,
    (message, _persist, isError) => logs.push({ message, isError: Boolean(isError) }),
    commandHistory, 0, "current-folder-id-01234567890"
);

await execute("move file-id-012345678901234567890 folder-id-012345678901234567890");
assert.equal(calls[0].action, "driveCommand");
assert.equal(calls[0].payload.command, "move");
assert.equal(calls[0].payload.fileId, "file-id-012345678901234567890");
assert.equal(calls[0].payload.targetFolderId, "folder-id-012345678901234567890");
assert.equal(calls[0].payload.currentFolderId, "current-folder-id-01234567890");
assert.equal(calls[0].payload.userId, "developer-1");
assert.equal(calls[0].payload.sessionToken, "session-1");
assert.equal(Object.hasOwn(calls[0].payload, "args"), false);

await execute("move solo-un-id");
assert.equal(calls.length, 1);
assert.ok(logs.some(entry => entry.message.includes("move <ID_ARCHIVO> <ID_CARPETA_DESTINO>")));

await execute("dir");
assert.equal(calls[1].payload.command, "dir");
assert.ok(logs.some(entry => entry.message.includes("ID: folder-id-012345678901234567890")));
assert.ok(logs.some(entry => entry.message.includes("ID: file-id-012345678901234567890")));

console.log("DriveTerminalMoveClient: 3/3 PASS — move usa IDs visibles y valida sintaxis.");
