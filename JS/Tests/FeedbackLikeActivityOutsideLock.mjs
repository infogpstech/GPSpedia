import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Services/feedback.js", import.meta.url), "utf8");
const start = source.indexOf("function handleRecordLike(payload) {");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "No se encontró handleRecordLike");
const handler = source.slice(start, end);
const release = handler.indexOf("lock.releaseLock()");
const activity = handler.indexOf('logUserActivity(userId, userName, "like"');
assert.ok(release >= 0 && activity > release,
    "logUserActivity debe ejecutarse después de liberar el lock de mutación");
assert.equal((handler.match(/logUserActivity\(userId, userName, "like"/g) || []).length, 1,
    "Debe existir una única salida de actividad, fuera de la sección crítica");
assert.equal((handler.match(/activityLogRequest = \{ details:/g) || []).length, 2,
    "Las rutas nueva y recuperada deben diferir el log hasta después del lock");
assert.match(handler, /if \(status === "completed"\) return \{ status: "success", alreadyLiked: true/,
    "El replay completed no debe generar otra actividad");
assert.match(handler, /return result;/);
console.log("FeedbackLikeActivityOutsideLock: 5/5 PASS");
