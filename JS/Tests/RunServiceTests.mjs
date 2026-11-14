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
 recordResult('WRITE payload/límites/integridad',loadFunction('JS/Tests/CutPayloadValidation.js','runCutPayloadValidationTests')(write));
 recordResult('WRITE/ADMIN VIN',loadFunction('JS/Tests/VinAuthoritativeValidation.js','runVinAuthoritativeValidationTests')({write,admin,ui:read('JS/Frontend/ui.js'),addCuts:read('HTML/add_cortes.html')}));
 recordResult('WRITE información suplementaria/sesiones/rollback',loadFunction('JS/Tests/AddSupplementaryInfoIntegrity.js','runAddSupplementaryInfoIntegrityTests')({
  write,admin,coordinator:read('Services/Coordinator.js'),ui:read('JS/Frontend/ui.js')
 }));
 recordResult('WRITE checkOperation autenticación/minimización',loadFunction('JS/Tests/CheckOperationSecurity.js','runCheckOperationSecurityTests')({
  write,frontend:read('HTML/add_cortes.html')
 }));
 recordResult('WRITE autorización y minimización/AUG-039',loadFunction('JS/Tests/WriteAuthorizationMinimization.js','runWriteAuthorizationMinimizationTests')({
  write,admin,ui:read('JS/Frontend/ui.js'),addCortes:read('HTML/add_cortes.html'),apiConfig:read('JS/Frontend/api-config.js')
 }));
 recordResult('WRITE autorización de información suplementaria/AUG-122',loadFunction('JS/Tests/AddSupplementaryInfoIntegrity.js','runAddSupplementaryInfoIntegrityTests')({
  write,admin,ui:read('JS/Frontend/ui.js'),coordinator:read('Services/Coordinator.js')
 }));
 recordResult('WRITE checkOperation autenticado/respuesta mínima/AUG-054',loadFunction('JS/Tests/CheckOperationSecurity.js','runCheckOperationSecurityTests')({
  write,frontend:read('HTML/add_cortes.html')
 }));
 recordResult('WRITE autorización de asignación de IDs y consumidores/AUG-039',loadFunction('JS/Tests/WriteAuthorizationContracts.js','runWriteAuthorizationContracts')({
  write,admin,ui:read('JS/Frontend/ui.js'),addCuts:read('HTML/add_cortes.html')
 }));
 recordResult('WRITE autorización/minimización integrada/AUG-039',loadFunction('JS/Tests/WriteAuthorizationMinimization.js','runWriteAuthorizationMinimizationTests')({
  write,admin,ui:read('JS/Frontend/ui.js'),addCortes:read('HTML/add_cortes.html'),apiConfig:read('JS/Frontend/api-config.js')
 }));


});
runGroup('32','ADMIN',()=>{
 const a=read('Services/admin.js');
 recordResult('ADMIN edición modal/RBAC',loadFunction('JS/Tests/AdminModalEditIntegrity.js','runAdminModalEditIntegrityTests')(a));
 runCli('P4 política de roles para compartir, imprimir y editar ficha','JS/Tests/VehicleModalRolePolicy.mjs');
 runCli('P4 protección de medios sin bloquear texto ni controles','JS/Tests/ClientInteractionPolicy.mjs');
 recordResult('ADMIN compensación de reemplazos in-modal/AUG-038',loadFunction('JS/Tests/AdminImageReplacementCompensation.js','runAdminImageReplacementCompensationTests')(read('JS/Frontend/ui.js'),a));
 recordResult('ADMIN respaldo/restauración/rollback',loadFunction('JS/Tests/AdminRestoreRecovery.js','runAdminRestoreRecoveryTests')(a));
 runCli('ADMIN reanudación de respaldo Drive y sintaxis Node.js','JS/Tests/AdminBackupResumeUI.mjs');
 runCli('AUG-019 alcance de terminal Drive y protección de árbol Cortes','JS/Tests/DriveTerminalScope.mjs');
 runCli('AUG-021 auditoría persistente de operaciones ADMIN','JS/Tests/AdminAuditTrail.mjs');
 runCli('P2 auditoría de identificadores sin escritura','JS/Tests/IdentifierAudit.mjs');
 runCli('P2 motor de migración de IDs, lotes, huellas y rollback','JS/Tests/IdentifierMigration.mjs');
 runCli('UX ayudas contextuales del formulario de cortes','JS/Tests/ContextualHelpForms.mjs');
  runCli('UX proporciones del panel Developer','JS/Tests/DeveloperPanelUX.mjs');
 runCli('P1 coordinación de actividad y sesiones protegidas por servicio','JS/Tests/SessionActivityCoordination.mjs');
 runCli('GP-IMG-UX-01 biblioteca de imágenes: selección, menús y vistas','JS/Tests/ReplacedImagesLibraryUX.mjs');
 runCli('GP-IMG-DATA-01 planner exacto de conciliación Drive ↔ Cortes','JS/Tests/CortesImageReconciliation.mjs');
  runCli('GP-IMG-DATA-01 aplicación aprobada, read-back y rollback','JS/Tests/CortesImageReconciliationApply.mjs');
 runCli('GP-IMG-DATA-01 UI de simulación y reporte de conciliación','JS/Tests/CortesImageReconciliationUI.mjs');
 runCli('P2 asignador backend de IDs LogosMarca','JS/Tests/LogoIdIntegrity.mjs');
});
runGroup('33','FEEDBACK',()=>{
 const feedback=read('Services/feedback.js');
 runCli('P2 IDs canónicos e idempotencia de Tutorial','JS/Tests/TutorialIntegrity.js');
 runCli('PYS tarjetas relacionadas y navegación del modal','JS/Tests/PysModalNavigation.js');
 const lockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
 const spreadsheet={flush(){}};
 const utilities={getUuid:()=>'test-uuid',formatDate:()=>'2026-11-12',base64Decode:()=>[1],newBlob:()=>({})};
 const session={getScriptTimeZone:()=>'GMT-6'};
 const videoTest=read('JS/Tests/VideoApprovalPublishing.js');
 const video=new Function('LockService','SpreadsheetApp','Utilities','Session',feedback+'\n'+videoTest+'\nreturn runVideoApprovalPublishingTests();')(
  lockService,spreadsheet,utilities,session);
 recordResult('FEEDBACK aprobación/rechazo/publicación recuperable',video);
 const submissionTest=read('JS/Tests/YouTubeApproval.js');
 const submission=new Function('LockService','SpreadsheetApp','Utilities','Session',feedback+'\n'+submissionTest+'\nreturn runYouTubeApprovalTests();')(
  lockService,spreadsheet,utilities,session);
 recordResult('FEEDBACK idempotencia y bloqueo de solicitudes YouTube',submission);
 const sessionTest=read('JS/Tests/VideoApprovalSessions.js');
 recordResult('FEEDBACK sesión, revocación y rol servidor/AUG-043',
  new Function(feedback+'\n'+sessionTest+'\nreturn runVideoApprovalSessionTests();')());
 const stateTest=read('JS/Tests/VideoApprovalState.js');
 recordResult('FEEDBACK estados y unicidad de aprobación',
  new Function(feedback+'\n'+stateTest+'\nreturn runVideoApprovalStateTests();')());
 const initTest=read('JS/Tests/YouTubeApprovalInit.js');
 const init=new Function('ScriptApp','UrlFetchApp','Logger',feedback+'\n'+initTest+'\nreturn runYouTubeApprovalInitTests();')(
  {getOAuthToken:()=> 'oauth-token'},{fetch:()=>({getAllHeaders:()=>({}),getResponseCode:()=>500,getContentText:()=>''})},{log(){}});
 recordResult('FEEDBACK precondiciones de subida resumable',init);
 recordResult('FEEDBACK ledger Inbox',loadFunction('JS/Tests/InboxAuditTrail.js','runInboxAuditTrailTests','\n\nimport {')({feedback}));
 recordResult('FEEDBACK lectura acotada de ActividadUsuario/AUG-120',loadFunction('JS/Tests/ActivityLogsBoundedRead.js','runActivityLogsBoundedReadTests','\n\nimport {')({feedback}));
 runCli('AUG-020 purga segura y clasificación de timestamps de ActividadUsuario','JS/Tests/ActivityLogRetention.mjs');
 recordResult('FEEDBACK contrato canónico de rol Inbox/AUG-115',loadFunction('JS/Tests/InboxRoleContract.js','runInboxRoleContractTests','\n\nimport {')({
  ui:read('JS/Frontend/ui.js'),feedback,inbox:read('Services/InboxConversations.js'),usersHtml:read('HTML/users.html'),authClient:read('JS/Frontend/auth.js')
 }));
 runCli('AUG-043 contratos de sesión, IDs y publicación en cliente','JS/Tests/VideoApprovalClientContract.mjs');
 runCli('AUG-043 persistencia IndexedDB de operaciones','JS/Tests/YouTubeUploadRecordPersistence.js');
 runCli('AUG-043 recuperación de bloques resumables','JS/Tests/YouTubeUploadCheckpointRecovery.js');
 runCli('AUG-043 cancelación durante transferencia','JS/Tests/YouTubeUploadCloseDuringTransfer.js');
 runCli('AUG-043 recuperación de transferencia completada','JS/Tests/YouTubeUploadCompletedRecordRecovery.js');
 runCli('AUG-043 recuperación de borradores','JS/Tests/YouTubeUploadDraftRecovery.js');
 runCli('AUG-043 ciclo de vida del modal','JS/Tests/YouTubeUploadOverlayLifecycle.js');
 runCli('AUG-043 historial de overlays de Cortes','JS/Tests/AddCortesYouTubeOverlayHistory.js');
 runCli('AUG-043 integridad XSS del modal','JS/Tests/YouTubeUploadXssIntegrityCli.mjs');
 runCli('AUG-043 contratos suplementarios de vídeo','JS/Tests/SupplementaryVideoContract.mjs');
 runCli('AUG-043 cliente YouTube, sesión y transferencia','JS/Tests/YouTubeUploadClientNode.mjs');
});
runGroup('34','CATALOG',()=>{
 runCli('CATALOG readiness','JS/Tests/CatalogReadiness.js');
 runCli('CATALOG snapshots/IndexedDB aislado','JS/Tests/CatalogSnapshotSync.js');
 runCli('CATALOG estados de presentación','JS/Tests/CatalogStatus.js');
});
runGroup('35','UTILITIES',()=>{
 recordResult('UTILITIES Spreadsheet simulado/RBAC/staging/rollback',new Function(read('Services/SharedMutationClient.js')+'\n'+read('Services/Utilities.js')+'\n'+read('JS/Tests/UtilitiesSecurity.js')+'\nreturn runUtilitiesSecurityTests();')());
});
runGroup('36','AUTH',()=>{
 runCli('AUTH aceptación de términos por usuario y dispositivo','JS/Tests/TermsAcceptance.js');
 runCli('AUTH PBKDF2 versionado, compatibilidad legacy y coste','JS/Tests/PasswordHashMigration.mjs');
 runCli('AUTH benchmark PBKDF2 protegido de solo lectura','JS/Tests/PasswordKdfBenchmark.mjs');
 runCli('ADMIN auditoría de referencias de IDs de Tutorial','JS/Tests/TutorialIdReferenceAudit.mjs');
 runCli('ADMIN auditoría de referencias cruzadas de usuarios','JS/Tests/UserIdReferenceAudit.mjs');
 const auth=read('Services/Auth.js'),testAuth=read('JS/Tests/Auth.js'),html=read('HTML/users.html');
 const test=loadFunction('JS/Tests/LastDeveloperProtection.js','runLastDeveloperProtectionTests','\n\nimport {');
 const a=test({auth,html}),b=test({auth:testAuth,html});
 recordResult('AUTH operativo y copia aislada',{passed:a.passed+b.passed,failed:a.failed+b.failed,total:a.passed+a.failed+b.passed+b.failed,results:[...a.results,...b.results]});
 if(normalizedCopy(auth)!==normalizedCopy(testAuth)) throw new Error('La copia AUTH difiere fuera del ID aislado.');
 recordResult('AUTH fixture/paridad',{passed:1,failed:0,total:1});
 recordResult('AUTH perfil remoto y revocación/AUG-118',loadFunction('JS/Tests/SessionProfileRefresh.js','runSessionProfileRefreshTests','\nimport {')({
  auth,testAuth,client:read('JS/Frontend/auth.js')
 }));
 recordResult('UI invalidación de sesión y rol/AUG-042',loadFunction('JS/Tests/SessionUiRoleInvalidation.js','runSessionUiRoleInvalidationTests')({
  ui:read('JS/Frontend/ui.js'),auth:read('JS/Frontend/auth.js'),users:html,authService:auth,main:read('JS/Frontend/main.js'),feedback:read('Services/feedback.js')
 }));
});
runGroup('37','USERS',()=>{
 const users=read('Services/users.js'),testUsers=read('JS/Tests/users.js');
 runCli('P2 generador backend de IDs de usuario','JS/Tests/UserIdGenerator.mjs');
 recordResult('USERS mutaciones/RBAC/rollback/coordinación',loadFunction('JS/Tests/UsersAtomicMutations.js','runUsersAtomicMutationTests')(users,read('Services/Auth.js'),read('Services/Coordinator.js')));
 if(normalizedCopy(users)!==normalizedCopy(testUsers)) throw new Error('La copia USERS difiere fuera del ID aislado.');
 recordResult('USERS fixture/paridad',{passed:1,failed:0,total:1});
});
runGroup('38','INTEGRATION',()=>{
 runCli('AUG-022 eliminación asíncrona de caché IndexedDB ADMIN','JS/Tests/AdminClientCacheDeletion.mjs');
 runCli('AUG-024 contrato de salud, identidad y clasificación de servicios','JS/Tests/ServiceHealthContract.mjs');
 runCli('AUG-025 telemetría temporal, buckets y truncamiento','JS/Tests/ServiceMetricsTelemetry.mjs');
 runCli('AUG-026 integridad, estados y recuperación del historial de imágenes','JS/Tests/AdminReplacedImagesIntegrity.mjs');
 runCli('AUG-031 persistencia incremental, migración y aislamiento de auditorías IndexedDB','JS/Tests/AdminDriveAuditIndexedDB.mjs');
 runCli('AUG-033 captura optimizada de referencias, presupuesto y memoización de Drive','JS/Tests/AdminReplacedImagesIntegrity.mjs');
 runCli('AUG-033 timeout y reintentos idempotentes de lotes de auditoría','JS/Tests/AdminDriveAuditClientRetry.mjs');
 runCli('AUG-027 ciclo de papelera, restauración, eliminación definitiva, permisos e idempotencia','JS/Tests/AdminImageTrashLifecycle.mjs');
 runCli('AUG-023 contrato y validación de acciones ADMIN createSheet/addColumn','JS/Tests/AdminSheetActionsContract.mjs');
 runCli('AUG-150 errores HTTP, red, JSON y aplicación en ADMIN','JS/Tests/RouteActionErrors.mjs');
 runCli('AUG-152 conversaciones Inbox, participantes, idempotencia y auditoría','JS/Tests/InboxConversations.mjs');
 runCli('AUG-152 interfaz Inbox, accesibilidad, borradores y sincronización','JS/Tests/InboxUi.mjs');
 runCli('OVERLAY pila de menú y modales administrativos','JS/Tests/OverlayMenuModalHistory.js');
 runCli('AUTH, navegación, catálogo silencioso y miniaturas','JS/Tests/SessionStartupNavigation.mjs');
 runCli('AUG-148 accesibilidad y foco del modal de desarrollador','JS/Tests/DevToolsModalAccessibility.mjs');
 runCli('CATALOG reintentos y cancelación','JS/Tests/CatalogRequestRetry.js');
 runCli('CATALOG escenarios de arranque PWA','JS/Tests/PWAStartupScenarios.js');
 runCli('CATALOG integridad del arranque y recuperación','JS/Tests/CatalogStartupIntegrity.mjs');
  runCli('AUG-047 accesibilidad, foco, navegación y offline de modales legales','JS/Tests/TermsModalAccessibility.mjs');
  runCli('AUG-144 QR local y privacidad de vídeos no listados','JS/Tests/PrintQrPrivacy.mjs');
  runCli('AUG-145 modos de distribución de ficha imprimible','JS/Tests/PrintSheetLayoutModes.mjs');
  runCli('AUG-143 paginación por altura real y orden técnico','JS/Tests/PrintSheetPaginationIntegrity.mjs');
  runCli('AUG-142 disponibilidad y decodificación de recursos de impresión','JS/Tests/PrintSheetResourceReadiness.mjs');
  runCli('AUG-141 indicador Check Engine y aviso de testigo','JS/Tests/PrintSheetWarningIndicator.mjs');
  runCli('AUG-140 contrato de márgenes y paginación Carta','JS/Tests/PrintSheetPageContract.mjs');
  runCli('AUG-139 política anti-debugging, zoom y autorización backend','JS/Tests/AntiDebuggingPolicy.mjs');
 recordResult('Coordinador compartido/concurrencia/leases',new Function(read('Services/Coordinator.js')+'\n'+read('Services/SharedMutationClient.js')+'\n'+read('JS/Tests/SharedMutationCoordinator.js')+'\nreturn runSharedMutationCoordinatorTests();')());
 runCli('AUG-138 logger seguro y recuperación offline/reintentos/cuota/respuesta perdida','JS/Tests/AddCortesDiagnostics.mjs');
 recordResult('Limpieza UI y contratos públicos',loadFunction('JS/Tests/UiOrphanCleanup.js','runUiOrphanCleanupTests')({
  index:read('index.html'),ui:read('JS/Frontend/ui.js'),main:read('JS/Frontend/main.js')
 }));
 recordResult('Mapa de acciones y routers',loadFunction('JS/Tests/ActionDispatchContract.js','runActionDispatchContractTests')({
  apiConfig:read('JS/Frontend/api-config.js'),AUTH:read('Services/Auth.js'),USERS:read('Services/users.js'),CATALOG:read('Services/catalog.js'),
  WRITE:read('Services/write.js'),FEEDBACK:read('Services/feedback.js')+'\\n'+read('Services/InboxConversations.js'),ADMIN:read('Services/admin.js'),UTILITIES:read('Services/Utilities.js'),usersHtml:read('HTML/users.html'),
  consumerSources:{apiConfig:read('JS/Frontend/api-config.js'),addCortes:read('HTML/add_cortes.html'),auth:read('JS/Frontend/auth.js'),main:read('JS/Frontend/main.js'),
   pysData:read('JS/Frontend/pys-data.js'),ui:read('JS/Frontend/ui.js'),usersHtml:read('HTML/users.html'),youtubeUpload:read('JS/Frontend/youtubeUpload.js')}
 }));
});
if(selected){
 const valid=new Set(['WRITE','ADMIN','FEEDBACK','CATALOG','UTILITIES','AUTH','USERS','INTEGRATION','31','32','33','34','35','36','37','38']);
 for(const item of selected) if(!valid.has(item)){failures.push({service:item,message:'Servicio/suite desconocido.'});totals.failed++;}
}
console.log('\nResultado de regresión de servicios: '+totals.suites+' suites; '+totals.passed+' pruebas aprobadas; '+totals.failed+' fallos de suite.');
if(failures.length){failures.forEach(x=>console.error('\n'+x.id+' '+x.service+'\n'+x.message));process.exitCode=1;}
