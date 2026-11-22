import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");
const start = source.indexOf("function initAdminPanelListeners()");
assert.ok(start >= 0, "No se encontró initAdminPanelListeners");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(end > start, "No se encontró el final de initAdminPanelListeners");
const block = source.slice(start, end);

assert.doesNotMatch(block, /termInput\.addEventListener/);
assert.match(block, /termInput\.onkeydown\s*=/);
assert.doesNotMatch(block, /backupResourceInput\.addEventListener/);
assert.equal([...block.matchAll(/backupResourceInput\.oninput\s*=/g)].length, 1);
assert.match(block, /resumeDriveBackupButton\.disabled\s*=\s*!normalizeDriveBackupId/);
assert.match(block, /contributionRefreshBtn\.onclick\s*=/);
assert.doesNotMatch(block, /contributionRefreshBtn\.addEventListener/);

const openStart = source.indexOf("function openDevToolsModal_()");
const openEnd = source.indexOf("\nfunction ", openStart + 10);
assert.ok(openStart >= 0 && openEnd > openStart);
assert.match(source.slice(openStart, openEnd), /initAdminPanelListeners\(\)/);
console.log("AdminPanelListenerLifecycle: 8/8 PASS — handlers estáticos se reemplazan al reabrir el panel");
