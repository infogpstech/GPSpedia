import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../Frontend/ui.js", import.meta.url), "utf8");
assert.equal(source.split("termInput.addEventListener").length - 1, 0,
    "El terminal no debe acumular keydown listeners.");
assert.match(source, /termInput\.onkeydown\s*=/);
assert.equal(source.split("backupResourceInput.addEventListener").length - 1, 0,
    "El campo de respaldo no debe acumular listeners input.");
assert.equal([...source.matchAll(/backupResourceInput\.oninput\s*=/g)].length, 1,
    "El campo de respaldo debe tener un único handler reemplazable.");
assert.match(source, /resumeDriveBackupButton\.disabled\s*=\s*!normalizeDriveBackupId/);
assert.match(source, /contributionRefreshBtn\.onclick\s*=/);
assert.equal(source.split("contributionRefreshBtn.addEventListener").length - 1, 0,
    "El botón de candidatos no debe acumular click listeners.");
assert.match(source, /function openDevToolsModal_[\s\S]{0,5000}initAdminPanelListeners\(\)/,
    "El panel debe volver a enlazar handlers al abrirse; las propiedades on* reemplazan los anteriores.");
console.log("AdminPanelListenerLifecycle: 8/8 PASS — handlers estáticos se reemplazan al reabrir el panel");
