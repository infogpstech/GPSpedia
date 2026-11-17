import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const auth = readFileSync("JS/Frontend/auth.js", "utf8");

function extractFunction(source, name) {
    const marker = "function " + name + "(";
    let start = source.indexOf(marker);
    assert.ok(start >= 0, "No se encontró " + name);
    if (source.slice(start - 6, start) === "async ") start -= 6;
    const brace = source.indexOf("{", start);
    let depth = 0, quote = "", escaped = false, lineComment = false, blockComment = false;
    for (let i = brace; i < source.length; i++) {
        const char = source[i], next = source[i + 1];
        if (lineComment) { if (char === "\n") lineComment = false; continue; }
        if (blockComment) { if (char === "*" && next === "/") { blockComment = false; i++; } continue; }
        if (quote) {
            if (escaped) { escaped = false; continue; }
            if (char === "\\") { escaped = true; continue; }
            if (char === quote) quote = "";
            continue;
        }
        if (char === "/" && next === "/") { lineComment = true; i++; continue; }
        if (char === "/" && next === "*") { blockComment = true; i++; continue; }
        if (char === "'" || char === '"' || char === "`") { quote = char; continue; }
        if (char === "{") depth++;
        if (char === "}" && --depth === 0) return source.slice(start, i + 1);
    }
    throw new Error("No se pudo extraer " + name);
}

const refreshFactorySource = extractFunction(auth, "createPysRefreshTask_");
const cursorSyncSource = extractFunction(auth, "refreshPysAndSyncCursor_");

function createRefreshFactory(loadPysData) {
    return new Function("loadPysData", refreshFactorySource + "\nreturn createPysRefreshTask_;")(loadPysData);
}
function createCursorSync(getFreshness, setCursor) {
    return new Function("getPysDataFreshness", "setPysDataCursor", "console",
        cursorSyncSource + "\nreturn refreshPysAndSyncCursor_;")(
        getFreshness, setCursor, { warn() {} }
    );
}

let passed = 0;
async function test(name, callback) {
    await callback();
    passed++;
    console.log("PASS " + name);
}

await test("la lectura PyS comienza antes del cursor y del snapshot CATALOG", async () => {
    const initial = auth.indexOf("refreshPys();", auth.indexOf("let requiresFullSnapshot"));
    const head = auth.indexOf("await getCatalogFeedHead_", initial);
    const snapshot = auth.indexOf("await fetchCatalogData", initial);
    assert.ok(initial >= 0 && head > initial && snapshot > initial);
    assert.match(auth, /PyS es independiente del cursor y del snapshot del catálogo/);
});

await test("una sola carga PyS se comparte durante el arranque", async () => {
    let calls = 0, resolveLoad;
    const factory = createRefreshFactory(() => {
        calls++;
        return new Promise(resolve => { resolveLoad = resolve; });
    });
    const refresh = factory();
    const first = refresh(), second = refresh();
    assert.equal(calls, 1);
    assert.equal(first, second);
    resolveLoad([{ id_problem: "isue-001" }]);
    assert.deepEqual(await first, { ok: true, data: [{ id_problem: "isue-001" }] });
});

await test("un fallo PyS queda localizado y no rechaza la promesa de arranque", async () => {
    const error = new Error("FEEDBACK temporalmente no disponible");
    const refresh = createRefreshFactory(() => Promise.reject(error))();
    assert.deepEqual(await refresh(), { ok: false, error });
});

await test("el cursor PyS solo avanza después de una lectura fresca", async () => {
    let stored = [];
    let freshness = { hasCache: true, stale: false, error: null };
    const sync = createCursorSync(() => freshness, cursor => { stored.push(cursor); return true; });
    assert.equal(await sync(async () => ({ ok: true }), 42), true);
    assert.deepEqual(stored, [42]);
    freshness = { hasCache: true, stale: true, error: "offline" };
    assert.equal(await sync(async () => ({ ok: true }), 43), false);
    assert.deepEqual(stored, [42]);
    assert.equal(await sync(async () => ({ ok: false, error: new Error("offline") }), 44), false);
    assert.deepEqual(stored, [42]);
});

await test("el feed incremental no alinea una caché PyS marcada con error", async () => {
    assert.match(auth, /getPysDataCursor\(\) === cachedCursor && !pysFreshness\.error/);
    assert.match(auth, /getPysDataCursor\(\) !== cachedCursor \|\| pysFreshness\.error/);
    assert.match(auth, /await refreshPysAndSyncCursor_\(refreshPys, delta\.cursor\)/);
});

console.log("CatalogStartupParallelism: " + passed + "/" + passed + " PASS");
