import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const onlyArg = process.argv.find(value => value.startsWith('--only='));
const selected = onlyArg ? new Set(onlyArg.slice(7).split(',').map(value => value.trim().toUpperCase()).filter(Boolean)) : null;
const totals = { passed: 0, failed: 0, suites: 0 }, failures = [];
function read(path) { return readFileSync(resolve(ROOT, path), 'utf8'); }
function loadFunction(path, name, stopMarker) {
 let source = read(path);
 if (stopMarker) { const stop = source.indexOf(stopMarker); if (stop >= 0) source = source.slice(0, stop); }
 return new Function(source + '\nreturn ' + name + ';')();
}
function recordResult(label, result) {
 if (!result || typeof result !== 'object') throw new Error(label + ': sin resultado.');
 const passed = Number(result.passed || 0), failed = Number(result.failed || 0);
 const total = Number(result.total === undefined ? passed + failed : result.total);
 if (failed || result.status === 'FAIL' || passed !== total) {
  const detail = (result.results || []).filter(x => x.status === 'FAIL').map(x => x.name + ': ' + (x.message || 'falló')).join('; ');
  throw new Error(label + ': ' + passed + '/' + total + ' PASS' + (detail ? ' — ' + detail : ''));
 }
 totals.passed += passed; totals.suites++; console.log('PASS ' + label + ': ' + passed + '/' + total);
}
function runCli(label, path) {
 const r = spawnSync(process.execPath, ['--experimental-default-type=module', path], {cwd:ROOT,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
 if (r.stdout) process.stdout.write(r.stdout); if (r.stderr) process.stderr.write(r.stderr);
 if (r.error) throw r.error; if (r.status !== 0) throw new Error(label + ': Node CLI terminó con código ' + r.status);
 const summaries = [...String(r.stdout || '').matchAll(/(\d+)\/(\d+)\s+PASS/g)];
 if (!summaries.length) throw new Error(label + ': no publicó resumen verificable.');
 for (const m of summaries) { totals.passed += Number(m[1]); if (m[1] !== m[2]) throw new Error(label + ': resumen parcial o fallido.'); }
 totals.suites++;
}
function runGroup(id, service, fn) {
 if (selected && !selected.has(service) && !selected.has(id)) return;
 console.log('\n[' + id + '] ' + service);
 try { fn(); } catch (e) { totals.failed++; failures.push({id,service,message:String(e && e.stack || e)}); console.error('FAIL ['+id+'] '+service+': '+String(e && e.message || e)); }
}
function normalizedCopy(s) { return String(s).replace(/(const\s+SPREADSHEET_ID\s*=\s*)["'][^"']+["']/,'$1"__ISOLATED_TEST_SPREADSHEET__"'); }
runGroup('31','WRITE',()=>{
 const write=read('Services/write.js'),admin=read('Services/admin.js');
 recordResult('WRITE payload/límites/integridad',loadFunction('Services/Test/CutPayloadValidation.js','runCutPayloadValidationTests')(write));
 recordResult('WRITE/ADMIN VIN',loadFunction('Services/Test/VinAuthoritativeValidation.js','runVinAuthoritativeValidationTests')({write,admin,ui:read('ui.js'),addCuts:read('add_cortes.html')}));
});
runGroup('32','ADMIN',()=>{
 const a=read('Services/admin.js');
 recordResult('ADMIN edición modal/RBAC',loadFunction('Services/Test/AdminModalEditIntegrity.js','runAdminModalEditIntegrityTests')(a));
 recordResult('ADMIN respaldo/restauración/rollback',loadFunction('Services/Test/AdminRestoreRecovery.js','runAdminRestoreRecoveryTests')(a));
});
runGroup('33','FEEDBACK',()=>{
 const feedback=read('Services/feedback.js'),videoTest=read('Services/Test/VideoApprovalPublishing.js');
 const video=new Function('LockService','SpreadsheetApp','Utilities','Session',feedback+'\n'+videoTest+'\nreturn runVideoApprovalPublishingTests();')(
  {getScriptLock:()=>({waitLock(){},releaseLock(){}})},{flush(){}},{getUuid:()=>'test-uuid',formatDate:()=>'2026-11-12'},{getScriptTimeZone:()=>'GMT-6'});
 recordResult('FEEDBACK aprobación/rechazo/recuperación',video);
 recordResult('FEEDBACK ledger Inbox',loadFunction('Services/Test/InboxAuditTrail.js','runInboxAuditTrailTests','\n\nimport {')({feedback}));
});
runGroup('34','CATALOG',()=>{
 runCli('CATALOG readiness','Services/Test/CatalogReadiness.js');
 runCli('CATALOG snapshots/IndexedDB aislado','Services/Test/CatalogSnapshotSync.js');
 runCli('CATALOG estados de presentación','Services/Test/CatalogStatus.js');
});
runGroup('35','UTILITIES',()=>{
 recordResult('UTILITIES Spreadsheet simulado/RBAC/staging/rollback',new Function(read('Services/Utilities.js')+'\n'+read('Services/Test/UtilitiesSecurity.js')+'\nreturn runUtilitiesSecurityTests();')());
});
runGroup('36','AUTH',()=>{
 const auth=read('Services/Auth.js'),testAuth=read('Services/Test/Auth.js'),html=read('users.html');
 const test=loadFunction('Services/Test/LastDeveloperProtection.js','runLastDeveloperProtectionTests','\n\nimport {');
 const a=test({auth,html}),b=test({auth:testAuth,html});
 recordResult('AUTH operativo y copia aislada',{passed:a.passed+b.passed,failed:a.failed+b.failed,total:a.passed+a.failed+b.passed+b.failed,results:[...a.results,...b.results]});
 if(normalizedCopy(auth)!==normalizedCopy(testAuth)) throw new Error('La copia AUTH difiere fuera del ID aislado.');
 recordResult('AUTH fixture/paridad',{passed:1,failed:0,total:1});
});
runGroup('37','USERS',()=>{
 const users=read('Services/users.js'),testUsers=read('Services/Test/users.js');
 recordResult('USERS mutaciones/RBAC/rollback/coordinación',loadFunction('Services/Test/UsersAtomicMutations.js','runUsersAtomicMutationTests')(users,read('Services/Auth.js'),read('Services/Coordinator.js')));
 if(normalizedCopy(users)!==normalizedCopy(testUsers)) throw new Error('La copia USERS difiere fuera del ID aislado.');
 recordResult('USERS fixture/paridad',{passed:1,failed:0,total:1});
});
runGroup('38','INTEGRATION',()=>{
  runCli('AUG-143 paginación por altura real y orden técnico','Services/Test/PrintSheetPaginationIntegrity.mjs');
  runCli('AUG-142 disponibilidad y decodificación de recursos de impresión','Services/Test/PrintSheetResourceReadiness.mjs');
  runCli('AUG-141 indicador Check Engine y aviso de testigo','Services/Test/PrintSheetWarningIndicator.mjs');
  runCli('AUG-140 contrato de márgenes y paginación Carta','Services/Test/PrintSheetPageContract.mjs');
  runCli('AUG-139 política anti-debugging, zoom y autorización backend','Services/Test/AntiDebuggingPolicy.mjs');
 recordResult('Coordinador compartido/concurrencia/leases',new Function(read('Services/Coordinator.js')+'\n'+read('Services/SharedMutationClient.js')+'\n'+read('Services/Test/SharedMutationCoordinator.js')+'\nreturn runSharedMutationCoordinatorTests();')());
 runCli('AUG-138 logger seguro y recuperación offline/reintentos/cuota/respuesta perdida','Services/Test/AddCortesDiagnostics.mjs');
 recordResult('Limpieza UI y contratos públicos',loadFunction('Services/Test/UiOrphanCleanup.js','runUiOrphanCleanupTests')({
  index:read('index.html'),ui:read('ui.js'),main:read('main.js')
 }));
 recordResult('Mapa de acciones y routers',loadFunction('Services/Test/ActionDispatchContract.js','runActionDispatchContractTests')({
  apiConfig:read('api-config.js'),AUTH:read('Services/Auth.js'),USERS:read('Services/users.js'),CATALOG:read('Services/catalog.js'),
  WRITE:read('Services/write.js'),FEEDBACK:read('Services/feedback.js'),ADMIN:read('Services/admin.js'),UTILITIES:read('Services/Utilities.js'),usersHtml:read('users.html'),
  consumerSources:{apiConfig:read('api-config.js'),addCortes:read('add_cortes.html'),auth:read('auth.js'),main:read('main.js'),
   pysData:read('pys-data.js'),ui:read('ui.js'),usersHtml:read('users.html'),youtubeUpload:read('youtubeUpload.js')}
 }));
});
if(selected){
 const valid=new Set(['WRITE','ADMIN','FEEDBACK','CATALOG','UTILITIES','AUTH','USERS','INTEGRATION','31','32','33','34','35','36','37','38']);
 for(const item of selected) if(!valid.has(item)){failures.push({service:item,message:'Servicio/suite desconocido.'});totals.failed++;}
}
console.log('\nResultado de regresión de servicios: '+totals.suites+' suites; '+totals.passed+' pruebas aprobadas; '+totals.failed+' fallos de suite.');
if(failures.length){failures.forEach(x=>console.error('\n'+x.id+' '+x.service+'\n'+x.message));process.exitCode=1;}
