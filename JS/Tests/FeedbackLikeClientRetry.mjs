import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");
const start = source.indexOf("export async function recordLike(");
const end = source.indexOf("\nexport async function reportProblem(", start);
assert.ok(start >= 0 && end > start, "No se encontró el cliente recordLike.");
const functionSource = source.slice(start, end).replace("export async function", "async function");
const delays = [];
let calls = 0;
const recordLike = new Function("routeAction", "setTimeout", functionSource + "\nreturn recordLike;")(
    async (action, payload) => {
        assert.equal(action, "recordLike");
        assert.equal(payload.vehicleId, "100");
        calls++;
        if (calls < 3) {
            const error = new Error("lock ocupado");
            error.code = "LIKE_LOCK_BUSY";
            throw error;
        }
        return { status: "success", alreadyLiked: true, likeCount: 1 };
    },
    (callback, delay) => { delays.push(delay); callback(); return delays.length; }
);
const result = await recordLike("100", 2, { userId: "7" });
assert.deepEqual(result, { status: "success", alreadyLiked: true, likeCount: 1 });
assert.equal(calls, 3);
assert.deepEqual(delays, [100, 200]);

let nonRetryCalls = 0;
const noRetry = new Function("routeAction", "setTimeout", functionSource + "\nreturn recordLike;")(
    async () => { nonRetryCalls++; const error = new Error("sesión inválida"); error.code = "SESSION_INVALID"; throw error; },
    () => { throw new Error("No debe esperar ante un error no reintentable."); }
);
await assert.rejects(() => noRetry("100", 1, { userId: "7" }), /sesión inválida/);
assert.equal(nonRetryCalls, 1);
console.log("FeedbackLikeClientRetry: 2/2 PASS — reintento silencioso solo ante contención de lock");
