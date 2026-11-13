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
 recordResult('WRITE información suplementaria/sesiones/rollback',loadFunction('Services/Test/AddSupplementaryInfoIntegrity.js','runAddSupplementaryInfoIntegrityTests')({
  write,admin,coordinator:read('Services/Coordinator.js'),ui:read('ui.js')
 }));
 recordResult('WRITE checkOperation autenticación/minimización',loadFunction('Services/Test/CheckOperationSecurity.js','runCheckOperationSecurityTests')({
  write,frontend:read('add_cortes.html')
 }));
 recordResult('WRITE autorización y minimización/AUG-039',loadFunction('Services/Test/WriteAuthorizationMinimization.js','runWriteAuthorizationMinimizationTests')({
  write,admin,ui:read('ui.js'),addCortes:read('add_cortes.html'),apiConfig:read('api-config.js')
 }));
 recordResult('WRITE autorización de información suplementaria/AUG-122',loadFunction('Services/Test/AddSupplementaryInfoIntegrity.js','runAddSupplementaryInfoIntegrityTests')({
  write,admin,ui:read('ui.js'),coordinator:read('Services/Coordinator.js')
 }));
 recordResult('WRITE checkOperation autenticado/respuesta mínima/AUG-054',loadFunction('Services/Test/CheckOperationSecurity.js','runCheckOperationSecurityTests')({
  write,frontend:read('add_cortes.html')
 }));
 recordResult('WRITE autorización de asignación de IDs y consumidores/AUG-039',loadFunction('Services/Test/WriteAuthorizationContracts.js','runWriteAuthorizationContracts')({
  write,admin,ui:read('ui.js'),addCuts:read('add_cortes.html')
 }));
 recordResult('WRITE autorización/minimización integrada/AUG-039',loadFunction('Services/Test/WriteAuthorizationMinimization.js','runWriteAuthorizationMinimizationTests')({
  write,admin,ui:read('ui.js'),addCortes:read('add_cortes.html'),apiConfig:read('api-config.js')
 }));


});
runGroup('32','ADMIN',()=>{
 const a=read('Services/admin.js');
 recordResult('ADMIN edición modal/RBAC',loadFunction('Services/Test/AdminModalEditIntegrity.js','runAdminModalEditIntegrityTests')(a));
 recordResult('ADMIN compensación de reemplazos in-modal/AUG-038',loadFunction('Services/Test/AdminImageReplacementCompensation.js','runAdminImageReplacementCompensationTests')(read('ui.js'),a));
 recordResult('ADMIN respaldo/restauración/rollback',loadFunction('Services/Test/AdminRestoreRecovery.js','runAdminRestoreRecoveryTests')(a));
 runCli('ADMIN reanudación de respaldo Drive y sintaxis Node.js','Services/Test/AdminBackupResumeUI.mjs');
});
runGroup('33','FEEDBACK',()=>{
 const feedback=read('Services/feedback.js');
 const lockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
 const spreadsheet={flush(){}};
 const utilities={getUuid:()=>'test-uuid',formatDate:()=>'2026-11-12',base64Decode:()=>[1],newBlob:()=>({})};
 const session={getScriptTimeZone:()=>'GMT-6'};
 const videoTest=read('Services/Test/VideoApprovalPublishing.js');
 const video=new Function('LockService','SpreadsheetApp','Utilities','Session',feedback+'\n'+videoTest+'\nreturn runVideoApprovalPublishingTests();')(
  lockService,spreadsheet,utilities,session);
 recordResult('FEEDBACK aprobación/rechazo/publicación recuperable',video);
 const submissionTest=read('Services/Test/YouTubeApproval.js');
 const submission=new Function('LockService','SpreadsheetApp','Utilities','Session',feedback+'\n'+submissionTest+'\nreturn runYouTubeApprovalTests();')(
  lockService,spreadsheet,utilities,session);
 recordResult('FEEDBACK idempotencia y bloqueo de solicitudes YouTube',submission);
 const sessionTest=read('Services/Test/VideoApprovalSessions.js');
 recordResult('FEEDBACK sesión, revocación y rol servidor/AUG-043',
  new Function(feedback+'\n'+sessionTest+'\nreturn runVideoApprovalSessionTests();')());
 const stateTest=read('Services/Test/VideoApprovalState.js');
 recordResult('FEEDBACK estados y unicidad de aprobación',
  new Function(feedback+'\n'+stateTest+'\nreturn runVideoApprovalStateTests();')());
 const initTest=read('Services/Test/YouTubeApprovalInit.js');
 const init=new Function('ScriptApp','UrlFetchApp','Logger',feedback+'\n'+initTest+'\nreturn runYouTubeApprovalInitTests();')(
  {getOAuthToken:()=> 'oauth-token'},{fetch:()=>({getAllHeaders:()=>({}),getResponseCode:()=>500,getContentText:()=>''})},{log(){}});
 recordResult('FEEDBACK precondiciones de subida resumable',init);
 recordResult('FEEDBACK ledger Inbox',loadFunction('Services/Test/InboxAuditTrail.js','runInboxAuditTrailTests','\n\nimport {')({feedback}));
 recordResult('FEEDBACK contrato canónico de rol Inbox/AUG-115',loadFunction('Services/Test/InboxRoleContract.js','runInboxRoleContractTests','\n\nimport {')({
  ui:read('ui.js'),feedback
 }));
 runCli('AUG-043 contratos de sesión, IDs y publicación en cliente','Services/Test/VideoApprovalClientContract.mjs');
 runCli('AUG-043 persistencia IndexedDB de operaciones','Services/Test/YouTubeUploadRecordPersistence.js');
 runCli('AUG-043 recuperación de bloques resumables','Services/Test/YouTubeUploadCheckpointRecovery.js');
 runCli('AUG-043 cancelación durante transferencia','Services/Test/YouTubeUploadCloseDuringTransfer.js');
 runCli('AUG-043 recuperación de transferencia completada','Services/Test/YouTubeUploadCompletedRecordRecovery.js');
 runCli('AUG-043 recuperación de borradores','Services/Test/YouTubeUploadDraftRecovery.js');
 runCli('AUG-043 ciclo de vida del modal','Services/Test/YouTubeUploadOverlayLifecycle.js');
 runCli('AUG-043 historial de overlays de Cortes','Services/Test/AddCortesYouTubeOverlayHistory.js');
 runCli('AUG-043 integridad XSS del modal','Services/Test/YouTubeUploadXssIntegrityCli.mjs');
 runCli('AUG-043 contratos suplementarios de vídeo','Services/Test/SupplementaryVideoContract.mjs');
 runCli('AUG-043 cliente YouTube, sesión y transferencia','Services/Test/YouTubeUploadClientNode.mjs');
});
runGroup('34','CATALOG',()=>{
 runCli('CATALOG readiness','Services/Test/CatalogReadiness.js');
 runCli('CATALOG snapshots/IndexedDB aislado','Services/Test/CatalogSnapshotSync.js');
 runCli('CATALOG estados de presentación','Services/Test/CatalogStatus.js');
});
runGroup('35','UTILITIES',()=>{
 recordResult('UTILITIES Spreadsheet simulado/RBAC/staging/rollback',new Function(read('Services/SharedMutationClient.js')+'\n'+read('Services/Utilities.js')+'\n'+read('Services/Test/UtilitiesSecurity.js')+'\nreturn runUtilitiesSecurityTests();')());
});
runGroup('36','AUTH',()=>{
 const auth=read('Services/Auth.js'),testAuth=read('Services/Test/Auth.js'),html=read('users.html');
 const test=loadFunction('Services/Test/LastDeveloperProtection.js','runLastDeveloperProtectionTests','\n\nimport {');
 const a=test({auth,html}),b=test({auth:testAuth,html});
 recordResult('AUTH operativo y copia aislada',{passed:a.passed+b.passed,failed:a.failed+b.failed,total:a.passed+a.failed+b.passed+b.failed,results:[...a.results,...b.results]});
 if(normalizedCopy(auth)!==normalizedCopy(testAuth)) throw new Error('La copia AUTH difiere fuera del ID aislado.');
 recordResult('AUTH fixture/paridad',{passed:1,failed:0,total:1});
 recordResult('AUTH perfil remoto y revocación/AUG-118',loadFunction('Services/Test/SessionProfileRefresh.js','runSessionProfileRefreshTests','\nimport {')({
  auth,testAuth,client:read('auth.js')
 }));
 recordResult('UI invalidación de sesión y rol/AUG-042',loadFunction('Services/Test/SessionUiRoleInvalidation.js','runSessionUiRoleInvalidationTests')({
  ui:read('ui.js'),auth:read('auth.js'),users:html,authService:auth,main:read('main.js'),feedback:read('Services/feedback.js')
 }));
});
runGroup('37','USERS',()=>{
 const users=read('Services/users.js'),testUsers=read('Services/Test/users.js');
 recordResult('USERS mutaciones/RBAC/rollback/coordinación',loadFunction('Services/Test/UsersAtomicMutations.js','runUsersAtomicMutationTests')(users,read('Services/Auth.js'),read('Services/Coordinator.js')));
 if(normalizedCopy(users)!==normalizedCopy(testUsers)) throw new Error('La copia USERS difiere fuera del ID aislado.');
 recordResult('USERS fixture/paridad',{passed:1,failed:0,total:1});
});
runGroup('38','INTEGRATION',()=>{
  runCli('AUG-144 QR local y privacidad de vídeos no listados','Services/Test/PrintQrPrivacy.mjs');
  runCli('AUG-145 modos de distribución de ficha imprimible','Services/Test/PrintSheetLayoutModes.mjs');
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
