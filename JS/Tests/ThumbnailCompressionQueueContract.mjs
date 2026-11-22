import assert from "node:assert/strict";
import { createConcurrencyLimiter } from "../Frontend/thumbnailCompressionQueue.js";
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
const queue = createConcurrencyLimiter(2);
const started = []; let active = 0, maximum = 0;
const gates = Array.from({ length: 5 }, () => deferred());
const tasks = gates.map((gate, index) => queue.run(async () => {
 const id = index + 1; started.push(id); active++; maximum = Math.max(maximum, active);
 await gate.promise; active--; return id;
}));
await Promise.resolve(); await Promise.resolve();
assert.deepEqual(started, [1, 2]);
assert.deepEqual(queue.getStats(), { limit: 2, active: 2, queued: 3 });
gates[1].resolve(); assert.equal(await tasks[1], 2); await Promise.resolve(); await Promise.resolve();
assert.deepEqual(started, [1, 2, 3]);
gates[0].resolve(); assert.equal(await tasks[0], 1); await Promise.resolve(); await Promise.resolve();
assert.deepEqual(started, [1, 2, 3, 4]);
gates[2].resolve(); await tasks[2]; await Promise.resolve(); await Promise.resolve();
assert.deepEqual(started, [1, 2, 3, 4, 5]);
gates[3].resolve(); gates[4].resolve();
assert.deepEqual(await Promise.all([tasks[3], tasks[4]]), [4, 5]);
assert.equal(maximum, 2);
assert.deepEqual(queue.getStats(), { limit: 2, active: 0, queued: 0 });
const resilient = createConcurrencyLimiter(1);
await assert.rejects(() => resilient.run(null), TypeError);
await assert.rejects(() => resilient.run(async () => { throw new Error("fallo simulado"); }), /fallo simulado/);
assert.equal(await resilient.run(async () => "siguiente"), "siguiente");
assert.deepEqual(resilient.getStats(), { limit: 1, active: 0, queued: 0 });
const tick = () => Promise.resolve().then(() => Promise.resolve());

const prioritized = createConcurrencyLimiter(1), gate = deferred(), order = [];
const first = prioritized.run(async () => { order.push("active"); await gate.promise; });
const lowA = prioritized.run(async () => { order.push("low-a"); }, { key: "low-a", priority: 0 });
const lowB = prioritized.run(async () => { order.push("low-b"); }, { key: "low-b", priority: 0 });
const visible = prioritized.run(async () => { order.push("visible"); }, { key: "visible", priority: 10 });
await tick(); assert.deepEqual(order, ["active"]);
gate.resolve(); await Promise.all([first, lowA, lowB, visible]);
assert.deepEqual(order, ["active", "visible", "low-a", "low-b"]);

const promoted = createConcurrencyLimiter(1), promotedGate = deferred(), promotedOrder = [];
const activeJob = promoted.run(async () => { promotedOrder.push("active"); await promotedGate.promise; });
const sameKeyPrefetch = promoted.run(async () => { promotedOrder.push("same-key-prefetch"); }, { key: "same-key", priority: 0 });
const otherPrefetch = promoted.run(async () => { promotedOrder.push("other-prefetch"); }, { key: "other", priority: 0 });
assert.equal(promoted.promote("same-key", 10), true);
await tick(); promotedGate.resolve();
await Promise.all([activeJob, sameKeyPrefetch, otherPrefetch]);
assert.deepEqual(promotedOrder, ["active", "same-key-prefetch", "other-prefetch"]);

const early = createConcurrencyLimiter(1), earlyGate = deferred(), earlyOrder = [];
const earlyActive = early.run(async () => { earlyOrder.push("active"); await earlyGate.promise; });
assert.equal(early.promote("late-enqueue", 10), true);
const late = early.run(async () => { earlyOrder.push("late-visible"); }, { key: "late-enqueue", priority: 0 });
const ordinary = early.run(async () => { earlyOrder.push("ordinary"); }, { key: "ordinary", priority: 0 });
earlyGate.resolve(); await Promise.all([earlyActive, late, ordinary]);
assert.deepEqual(earlyOrder, ["active", "late-visible", "ordinary"]);

const noPreempt = createConcurrencyLimiter(1), activeGate = deferred();
const activePriority = noPreempt.run(async () => { await activeGate.promise; }, { key: "active", priority: 0 });
await tick(); assert.equal(noPreempt.promote("active", 99), false);
activeGate.resolve(); await activePriority;



const cleanup = createConcurrencyLimiter(1);
const cleanupGate = deferred();
const cleanupActive = cleanup.run(async () => { await cleanupGate.promise; });
assert.equal(cleanup.promote("never-enqueued", 10), true);
assert.equal(cleanup.clearPromotion("never-enqueued"), true,
    "las promociones anticipadas se limpian cuando la operación no llega a la cola");
assert.equal(cleanup.getPriorityStats().queued, 0);
cleanupGate.resolve();
await cleanupActive;


// Métricas deterministas: espera, duración, promociones y errores por prioridad.
let fakeNow = 0;
const measured = createConcurrencyLimiter(1, { now: () => fakeNow });
const measuredGate = deferred();
const measuredFirst = measured.run(async () => { await measuredGate.promise; return "ok"; }, { key: "m1", priority: 0 });
fakeNow = 2;
const measuredSecond = measured.run(async () => "visible", { key: "m2", priority: 10 });
fakeNow = 5;
await tick();
let measuredSnapshot = measured.getMetrics();
assert.equal(measuredSnapshot.priorities["0"].started, 1);
assert.equal(measuredSnapshot.priorities["0"].maxWaitMs, 0);
assert.equal(measuredSnapshot.priorities["10"].queued, 1);
assert.equal(measured.promote("m2", 20), true);
fakeNow = 15;
measuredGate.resolve();
assert.equal(await measuredFirst, "ok");
fakeNow = 16;
assert.equal(await measuredSecond, "visible");
measuredSnapshot = measured.getMetrics();
assert.equal(measuredSnapshot.priorities["0"].completed, 1);
assert.equal(measuredSnapshot.priorities["0"].maxRunMs, 10);
assert.equal(measuredSnapshot.priorities["20"].promoted, 1);
assert.equal(measuredSnapshot.priorities["20"].started, 1);
assert.equal(measuredSnapshot.priorities["20"].maxWaitMs, 13);
const measuredFailure = createConcurrencyLimiter(1, { now: () => fakeNow });
await assert.rejects(() => measuredFailure.run(async () => { throw new Error("metric-fail"); }, { priority: 3 }), /metric-fail/);
assert.equal(measuredFailure.getMetrics().priorities["3"].failed, 1);
assert.deepEqual(measuredFailure.getStats(), { limit: 1, active: 0, queued: 0 });
console.log("24/24 PASS — FIFO, prioridad visible, promoción single-flight, no-preemption, limpieza, métricas y recuperación");
