import assert from "node:assert/strict";
import { createConcurrencyLimiter } from "../Frontend/thumbnailCompressionQueue.js";

function deferred() {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
}

const queue = createConcurrencyLimiter(2);
const started = [];
let active = 0;
let maximum = 0;
const gates = Array.from({ length: 5 }, () => deferred());
const tasks = gates.map((gate, index) => queue.run(async () => {
    const id = index + 1;
    started.push(id);
    active++;
    maximum = Math.max(maximum, active);
    await gate.promise;
    active--;
    return id;
}));

await Promise.resolve();
await Promise.resolve();
assert.deepEqual(started, [1, 2], "solo las dos primeras tareas deben iniciar");
assert.deepEqual(queue.getStats(), { limit: 2, active: 2, queued: 3 });

gates[1].resolve();
assert.equal(await tasks[1], 2);
await Promise.resolve();
await Promise.resolve();
assert.deepEqual(started, [1, 2, 3], "la tercera tarea debe entrar primero al liberarse un slot");

gates[0].resolve();
assert.equal(await tasks[0], 1);
await Promise.resolve();
await Promise.resolve();
assert.deepEqual(started, [1, 2, 3, 4]);

gates[2].resolve();
await tasks[2];
await Promise.resolve();
await Promise.resolve();
assert.deepEqual(started, [1, 2, 3, 4, 5]);

gates[3].resolve();
gates[4].resolve();
assert.deepEqual(await Promise.all([tasks[3], tasks[4]]), [4, 5]);
assert.equal(maximum, 2, "la concurrencia nunca debe superar el límite");
assert.deepEqual(queue.getStats(), { limit: 2, active: 0, queued: 0 });

const resilient = createConcurrencyLimiter(1);
await assert.rejects(() => resilient.run(null), TypeError);
await assert.rejects(() => resilient.run(async () => { throw new Error("fallo simulado"); }), /fallo simulado/);
assert.equal(await resilient.run(async () => "siguiente"), "siguiente",
    "un fallo no debe bloquear las tareas pendientes");
assert.deepEqual(resilient.getStats(), { limit: 1, active: 0, queued: 0 });

console.log("ThumbnailCompressionQueueContract: 10/10 PASS — FIFO, límite de concurrencia y recuperación tras error");
