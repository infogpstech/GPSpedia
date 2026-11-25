import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Frontend/api-config.js", import.meta.url), "utf8");
const start = source.indexOf("export async function recordLike(");
const end = source.indexOf("\nexport async function setCutUseful(", start);
assert.ok(start >= 0 && end > start, "No se encontró el cliente recordLike.");
const functionSource = source.slice(start, end).replace("export async function", "async function");

const delays = [];
let calls = 0;
const recordLike = new Function("routeAction", "setTimeout", functionSource + "\nreturn recordLike;")(
    async (action, payload) => {
        assert.equal(action, "recordLike");
        assert.equal(payload.vehicleId, "100");
        assert.equal(payload.corteIndex, 2);
        calls++;
        if (calls < 4) {
            const error = new Error("lock ocupado");
            error.code = "LIKE_LOCK_BUSY";
            throw error;
        }
        return { status: "success", alreadyLiked: false, corteIndex: 2, likeCount: 1 };
    },
    (callback, delay) => { delays.push(delay); callback(); return delays.length; }
);
const result = await recordLike("100", 2, { userId: "7" });
assert.deepEqual(result, { status: "success", alreadyLiked: false, corteIndex: 2, likeCount: 1 });
assert.equal(calls, 4);
assert.deepEqual(delays, [150, 300, 450]);

let failedCalls = 0;
const noRetry = new Function("routeAction", "setTimeout", functionSource + "\nreturn recordLike;")(
    async () => { failedCalls++; const error = new Error("sesión inválida"); error.code = "SESSION_INVALID"; throw error; },
    () => { throw new Error("No debe esperar ante un error no reintentable."); }
);
await assert.rejects(() => noRetry("100", 1, { userId: "7" }), /sesión inválida/);
assert.equal(failedCalls, 1);
console.log("FeedbackLikeClientRetry: 2/2 PASS — reintento acotado solo ante lock ocupado");

const usefulStart=source.indexOf("export async function setCutUseful(");
const usefulEnd=source.indexOf("\nexport async function getMyUsefulCuts(",usefulStart);
assert.ok(usefulStart>=0&&usefulEnd>usefulStart,"No se encontró setCutUseful.");
const usefulSource=source.slice(usefulStart,usefulEnd).replace("export async function","async function");
const setUseful=new Function("routeAction","setTimeout",usefulSource+"\\nreturn setCutUseful;")(
 async(action,payload)=>{assert.equal(action,"setCutUseful");assert.equal(payload.isUseful,true);const error=new Error("lock ocupado");error.code="USEFUL_LOCK_BUSY";throw error;},
 (callback,delay)=>{delays.push(delay);callback();return delays.length;}
);
await assert.rejects(()=>setUseful("100",2,true,{userId:"7"}),/lock ocupado/);
assert.equal(delays.length,11);
console.log("FeedbackLikeClientRetry: setCutUseful retries: 1/1 PASS");
