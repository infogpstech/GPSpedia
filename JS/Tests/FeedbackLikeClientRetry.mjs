import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");
const start = source.indexOf("export async function recordLike(");
const end = source.indexOf("\nexport async function reportProblem(", start);
assert.ok(start >= 0 && end > start, "No se encontró el cliente recordLike.");
const functionSource = source.slice(start, end).replace("export async function", "async function");

let calls = 0;
const recordLike = new Function("routeAction", functionSource + "\nreturn recordLike;")(
    async (action, payload) => {
        assert.equal(action, "recordLike");
        assert.equal(payload.vehicleId, "100");
        assert.equal(payload.corteIndex, 2);
        calls++;
        return { status: "success", alreadyLiked: false, corteIndex: 2, likeCount: 1 };
    }
);
const result = await recordLike("100", 2, { userId: "7" });
assert.deepEqual(result, { status: "success", alreadyLiked: false, corteIndex: 2, likeCount: 1 });
assert.equal(calls, 1, "El cliente envía una sola mutación; la espera de lock ocurre en FEEDBACK.");

let failedCalls = 0;
const failedRecordLike = new Function("routeAction", functionSource + "\nreturn recordLike;")(
    async () => {
        failedCalls++;
        const error = new Error("No fue posible obtener el bloqueo.");
        error.code = "LIKE_LOCK_BUSY";
        throw error;
    }
);
await assert.rejects(() => failedRecordLike("100", 1, { userId: "7" }), error => error.code === "LIKE_LOCK_BUSY");
assert.equal(failedCalls, 1, "Un timeout del backend no debe repetir una escritura de resultado incierto.");
console.log("FeedbackLikeClientRetry: 2/2 PASS — una sola mutación y sin reenvío ambiguo");