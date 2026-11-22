import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDiagnosticLogger} from '../Frontend/diagnosticLogger.js';
const addCuts=await readFile(new URL('../../HTML/add_cortes.html',import.meta.url),'utf8');
const recoverySource=await readFile(new URL('./AddCutOperationRecoveryFlow.js',import.meta.url),'utf8');

function extractFunction(source, name) {
    const marker = "async function " + name + "(";
    const start = source.indexOf(marker);
    if (start < 0) throw new Error("No se encontró " + name);
    const open = source.indexOf("{", start);
    let depth = 0, quote = "", escaped = false, line = false, block = false;
    for (let i = open; i < source.length; i++) {
        const ch = source[i], next = source[i + 1];
        if (line) { if (ch === "\n") line = false; continue; }
        if (block) { if (ch === "*" && next === "/") { block = false; i++; } continue; }
        if (quote) { if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === quote) quote = ""; continue; }
        if (ch === "/" && next === "/") { line = true; i++; continue; }
        if (ch === "/" && next === "*") { block = true; i++; continue; }
        if (ch === "'" || ch === '"' || ch === "\`") { quote = ch; continue; }
        if (ch === "{") depth++;
        else if (ch === "}" && --depth === 0) return source.slice(start, i + 1);
    }
    throw new Error("Función incompleta: " + name);
}

const captured=[],consoleRef=Object.fromEntries(['debug','info','warn','error','log'].map(level=>[level,entry=>captured.push({level,entry})]));
let passed=0;function testCase(name,fn){fn();passed++;process.stdout.write('PASS '+name+'\n');}
testCase('producción solo emite warn/error',()=>{captured.length=0;const l=createDiagnosticLogger({consoleRef});l.debug('debug.hidden');l.info('info.hidden');l.warn('operation.failed',{stage:'submit',opId:'OP-100',status:'failed',errorCode:'QuotaExceededError'});assert.equal(captured.length,1);assert.equal(captured[0].level,'warn');});
testCase('activación explícita habilita todos los niveles',()=>{captured.length=0;const l=createDiagnosticLogger({debugEnabled:true,consoleRef});l.debug('debug.enabled');l.info('info.enabled');l.warn('warn.enabled');l.error('error.enabled');assert.deepEqual(captured.map(x=>x.level),['debug','info','warn','error']);});
testCase('lista permitida excluye Base64, imágenes, tokens, payloads y respuestas',()=>{captured.length=0;const l=createDiagnosticLogger({debugEnabled:true,consoleRef});l.error('cut-operation.failed',{stage:'submit',opId:'OP-100',status:'failed',errorCode:'QuotaExceededError',image:'SECRET_IMAGE',SessionToken:'SECRET_TOKEN',pendingOp:{img:'SECRET_BASE64'},response:{body:'SECRET_RESPONSE'},message:'VIN-PRIVATE',password:'SECRET_PASSWORD'});const out=JSON.stringify(captured);for(const secret of ['SECRET_IMAGE','SECRET_TOKEN','SECRET_BASE64','SECRET_RESPONSE','VIN-PRIVATE','SECRET_PASSWORD'])assert.equal(out.includes(secret),false);assert.deepEqual(Object.keys(captured[0].entry).sort(),['errorCode','event','level','opId','source','stage','status'].sort());});
testCase('códigos de error no reconocidos se omiten',()=>{captured.length=0;const l=createDiagnosticLogger({debugEnabled:true,consoleRef});l.warn('operation.failed',{stage:'submit',errorCode:'PRIVATE_TOKEN_123'});assert.equal('errorCode' in captured[0].entry,false);});
testCase('rechaza identificadores y etapas fuera de formato',()=>{captured.length=0;const l=createDiagnosticLogger({debugEnabled:true,consoleRef});l.warn('operation.failed',{stage:'private-vin',opId:'VIN-SECRET',status:'full-response'});assert.deepEqual(Object.keys(captured[0].entry).sort(),['event','level','source'].sort());});
testCase('add_cortes no utiliza console directo ni serializa snapshots/respuestas',()=>{assert.equal(/console\.(?:log|warn|error|info|debug)/.test(addCuts),false);assert.match(addCuts,/createDiagnosticLogger\(\{ debugEnabled: new URLSearchParams\(window\.location\.search\)\.get\('gpDebug'\) === '1' \}\)/);assert.doesNotMatch(addCuts,/JSON\.stringify\(pendingOp|console\.[^(]+\([^)]*(?:pendingOp|checkRes|writeResult|payload)/);assert.doesNotMatch(addCuts,/PING-PONG/);});
const mod=addCuts.match(/<script type="module">([\s\S]*?)<\/script>/);assert.ok(mod);new Function(mod[1].replace(/^\s*import\s+.*?;\s*$/gm,''));
passed++;

const verifySource = extractFunction(mod[1], "verifySupplementaryCatalogWrite_");
const projectionCalls = [];
const verifySupplementary = new Function("routeAction", verifySource + "; return verifySupplementaryCatalogWrite_;")(
    async (action, payload) => {
        projectionCalls.push({ action, payload });
        return { status: "success", source: "spreadsheet", vehicle: {
            id: "204", apertura: "Apertura", imgApertura: "drive-image",
            notaImportante: "Nota", cableAlimen: "Alimentación", imgCableAlimen: "drive-feed"
        } };
    }
);
const verifiedSupplementary = await verifySupplementary(
    { status: "success", vehicleId: "204", slotIndex: 1 },
    { vehicleId: "204", apertura: "Apertura", imgApertura: "data:image/png;base64,AAAA",
      notaImportante: "Nota", cableAlimen: "Alimentación", imgCableAlimen: "data:image/png;base64,BBBB" }
);
if (projectionCalls.length !== 1 || projectionCalls[0].action !== "getVehicleProjection" ||
    projectionCalls[0].payload.vehicleId !== "204" || verifiedSupplementary.item.id !== "204" ||
    verifiedSupplementary.source !== "spreadsheet") {
    throw new Error("La verificación suplementaria no utilizó una sola proyección dirigida.");
}
passed++;
process.stdout.write("PASS verificación suplementaria usa getVehicleProjection para un solo vehículo\\n");
const mismatchVerify = new Function("routeAction", verifySource + "; return verifySupplementaryCatalogWrite_;")(
    async () => ({ status: "success", vehicle: { id: "205" } })
);
let mismatchRejected = false;
try { await mismatchVerify({ status: "success", vehicleId: "204" }, { vehicleId: "204" }); }
catch (_) { mismatchRejected = true; }
if (!mismatchRejected) throw new Error("La verificación aceptó una proyección de otro vehículo.");
passed++;
process.stdout.write("PASS verificación suplementaria rechaza ID de vehículo distinto\\n");

const runRecovery=new Function(recoverySource+'\nreturn runAddCutOperationRecoveryFlowTests;')();
const recovery=await runRecovery({frontend:addCuts});for(const r of recovery.results){if(r.status!=='PASS')throw Error(r.name+': '+r.message);process.stdout.write('PASS '+r.name+'\n');}if(recovery.failed)throw Error('Recovery tests failed');passed+=recovery.passed;
process.stdout.write('AddCortes diagnostics: '+passed+'/'+passed+' PASS\n');
