import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { DRIVE_STORAGE_CRITICAL_THRESHOLD, getDriveStorageCriticalState, createDriveStorageAlertKey } from "../Frontend/driveStorageAlerts.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ui = readFileSync(resolve(root, "JS/Frontend/ui.js"), "utf8");
const index = readFileSync(resolve(root, "index.html"), "utf8");
const css = readFileSync(resolve(root, "style.css"), "utf8");
const inbox = readFileSync(resolve(root, "JS/Services/InboxConversations.js"), "utf8");
const feedback = readFileSync(resolve(root, "JS/Services/feedback.js"), "utf8");
let passed = 0;
function test(name, fn) { fn(); passed++; console.log("PASS " + name); }

test("umbral crítico exacto del 80 %", () => {
    assert.equal(DRIVE_STORAGE_CRITICAL_THRESHOLD, 80);
    assert.equal(getDriveStorageCriticalState({status:"success",quotaStatus:"available",usagePercent:79.99}).critical, false);
    assert.equal(getDriveStorageCriticalState({status:"success",quotaStatus:"available",usagePercent:80}).critical, true);
    assert.equal(getDriveStorageCriticalState({status:"success",quotaStatus:"available",usagePercent:95.3}).critical, true);
});
test("no alerta con cuota ilimitada, ausente o porcentaje inválido", () => {
    assert.equal(getDriveStorageCriticalState({status:"success",quotaStatus:"unlimited",usagePercent:99}).critical, false);
    assert.deepEqual(getDriveStorageCriticalState(null), {critical:false,usagePercent:null});
    assert.equal(getDriveStorageCriticalState({status:"success",quotaStatus:"available",usagePercent:"NaN"}).critical, false);
    assert.equal(getDriveStorageCriticalState({status:"error",quotaStatus:"available",usagePercent:90}).critical, false);
});
test("clave de idempotencia estable por fecha y destinatario", () => {
    assert.equal(createDriveStorageAlertKey("2026-11-15","U-001"),"drive80_20261115_U-001");
    assert.notEqual(createDriveStorageAlertKey("2026-11-15","U-001"),createDriveStorageAlertKey("2026-11-16","U-001"));
    assert.notEqual(createDriveStorageAlertKey("2026-11-15","U-001"),createDriveStorageAlertKey("2026-11-15","U-002"));
    assert.throws(()=>createDriveStorageAlertKey("bad","U-001"),/no es válida/);
});
test("la alerta Inbox requiere desarrollador y usa actor de sistema", () => {
    assert.match(ui,/role !== "desarrollador"/);
    assert.match(ui,/routeAction\(["']notifyDevelopersDriveCritical["']/);
    assert.match(feedback,/notifyDevelopersDriveCritical:\s*\["Desarrollador"\]/);
    assert.match(inbox,/function handleNotifyDevelopersDriveCritical\(payload\)/);
    assert.match(inbox,/userId: "GPSpedia-System"/);
    assert.match(inbox,/normalizeFeedbackRole\(row\[3\]\) === "desarrollador"/);
    assert.match(ui,/ALERTA CRÍTICA/);
});
test("monitor destaca el porcentaje crítico y muestra consola primero", () => {
    assert.ok(index.indexOf('class="dev-console-shared"') < index.indexOf('class="dev-tools-tabs"'));
    assert.ok(index.includes('Uso de Drive'));
    assert.match(css,/#dev-tools-modal #drive-storage-percent\.is-critical[\s\S]*?color: #e02424/);
});
console.log("DriveStorageAlerts: " + passed + "/" + passed + " PASS");
