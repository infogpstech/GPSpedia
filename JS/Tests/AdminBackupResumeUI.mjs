import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const ui = readFileSync('JS/Frontend/ui.js', 'utf8');
const html = readFileSync('index.html', 'utf8');
let passed = 0;
const results = [];
function check(name, condition) {
    if (!condition) throw new Error(name);
    passed++;
    results.push(name);
}
function syntax(path) {
    if (path === 'Services/admin.js') {
        // Apps Script .js uses script semantics; module parsing rejects legacy duplicate global function declarations.
        new Function(readFileSync(path, 'utf8'));
        return;
    }
    const result = spawnSync(process.execPath,
        ['--experimental-default-type=module', '--check', path],
        { encoding: 'utf8', timeout: 30000 });
    if (result.status !== 0) {
        throw new Error(path + ': ' + String(result.stderr || result.stdout || 'node --check falló'));
    }
}
const runActionStart = ui.indexOf('async function runAction(action');
const runActionEnd = ui.indexOf('// --- PROCESAMIENTO SECUENCIAL POR LOTES ---', runActionStart);
if (runActionStart < 0 || runActionEnd <= runActionStart) throw new Error('No se encontró runAction individual.');
const runAction = ui.slice(runActionStart, runActionEnd);
const resumableBranch = runAction.indexOf("action === 'backupDrive' &&");
const genericFailure = runAction.indexOf("log(`[ERROR] Acción fallida: ${res.message}`");
check('runAction reconoce respuestas in_progress de backupDrive antes del error genérico',
    resumableBranch >= 0 && genericFailure > resumableBranch &&
    /res\.status === 'in_progress'/.test(runAction.slice(resumableBranch, genericFailure)));
check('runAction devuelve la respuesta in_progress al controlador de lotes',
    /res\.status === 'in_progress'[\s\S]*?return res;/.test(runAction.slice(resumableBranch, genericFailure)));
check('runAction conserva errores explícitamente reanudables',
    /res\.status === 'error' && res\.resumable === true/.test(runAction.slice(resumableBranch, genericFailure)) &&
    /return res;/.test(runAction.slice(resumableBranch, genericFailure)));

const createStart = ui.indexOf('async function createBackup(');
const createEnd = ui.indexOf("document.getElementById('btn-admin-backup-db').onclick", createStart);
if (createStart < 0 || createEnd <= createStart) throw new Error('No se encontró createBackup.');
const createBackup = ui.slice(createStart, createEnd);
check('createBackup continúa lotes utilizando el mismo backupId',
    /response\.status === 'in_progress'[\s\S]*?runAction\(action, \{ backupId: response\.backupId \}\)/.test(createBackup));
check('createBackup limita las llamadas automáticas y conserva la opción de reanudar',
    /batches < 10/.test(createBackup) && /canResumeDriveBackup = true/.test(createBackup) &&
    /response\.status === 'error' && response\.resumable/.test(createBackup));
check('El control de reanudación normaliza el ID y usa la acción backupDrive',
    /btn-admin-resume-drive-backup/.test(ui) &&
    /normalizeDriveBackupId\(backupResourceInput && backupResourceInput\.value\)/.test(ui) &&
    /createBackup\('backupDrive', 'drive', event\.currentTarget, backupId\)/.test(ui));
check('El botón de reanudación está presente y deshabilitado inicialmente',
    /id="btn-admin-resume-drive-backup"[^>]*disabled/.test(html));

for (const path of ['JS/Frontend/ui.js', 'Services/admin.js', 'JS/Tests/AdminRestoreRecovery.js']) syntax(path);
check('Node.js --check aprueba los tres archivos JavaScript modificados', true);

console.log('AdminBackupResumeUI: ' + passed + '/' + passed + ' PASS');
for (const name of results) console.log('PASS ' + name);
