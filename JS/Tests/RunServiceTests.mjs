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
 runCli('MIG-014 invalidación frontend de caché de sesión','JS/Tests/SessionInvalidationFlow.mjs');
 runCli('MIG-014 invalidación local sin Coordinator ni secretos','JS/Tests/SessionActorCacheInvalidation.mjs');
 const write=read('JS/Services/write.js'),admin=read('JS/Services/admin.js');
 recordResult('WRITE payload/límites/integridad',loadFunction('JS/Tests/CutPayloadValidation.js','runCutPayloadValidationTests')(write));
 recordResult('WRITE/ADMIN VIN',loadFunction('JS/Tests/VinAuthoritativeValidation.js','runVinAuthoritativeValidationTests')({write,admin,ui:read('JS/Frontend/ui.js'),addCuts:read('HTML/add_cortes.html')}));
 recordResult('WRITE información suplementaria/sesiones/rollback',loadFunction('JS/Tests/AddSupplementaryInfoIntegrity.js','runAddSupplementaryInfoIntegrityTests')({
  write,admin,ui:read('JS/Frontend/ui.js')
 }));
 recordResult('WRITE checkOperation autenticación/minimización',loadFunction('JS/Tests/CheckOperationSecurity.js','runCheckOperationSecurityTests')({
  write,frontend:read('HTML/add_cortes.html')
 }));
 recordResult('WRITE autorización y minimización/AUG-039',loadFunction('JS/Tests/WriteAuthorizationMinimization.js','runWriteAuthorizationMinimizationTests')({
  write,admin,ui:read('JS/Frontend/ui.js'),addCortes:read('HTML/add_cortes.html'),apiConfig:read('JS/Frontend/api-config.js')
 }));
 recordResult('WRITE autorización de información suplementaria/AUG-122',loadFunction('JS/Tests/AddSupplementaryInfoIntegrity.js','runAddSupplementaryInfoIntegrityTests')({
  write,admin,ui:read('JS/Frontend/ui.js'),
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
 runCli('ADMIN modal de auditoría Drive con consola de progreso incremental y responsive','JS/Tests/AdminDriveScanModal.mjs');
 const a=read('JS/Services/admin.js');
 runCli('ADMIN consulta candidatos append-only de aportes en modo solo lectura','JS/Tests/AdminVehicleContributionCandidates.mjs');
 runCli('ADMIN carga de imagen valida tamaño y MIME antes de Base64','JS/Tests/AdminImageUploadPreflight.mjs');
 runCli('ADMIN inventario de imágenes reutiliza ledger filtrado de CATALOG','JS/Tests/AdminCandidateImageInventoryCatalogSource.mjs');
 runCli('ADMIN consulta dirigida de proyección de vehículo/campo','JS/Tests/AdminVehicleTargetedCatalogRead.mjs');
 runCli('ADMIN lectura segura y secuenciada de logotipos','JS/Tests/AdminLogoFileRead.mjs');
 runCli('ADMIN ediciones in-modal versionadas por campo e idempotentes','JS/Tests/AdminVehicleFieldVersioning.mjs');
 runCli('ADMIN conserva ImageUploadLedger histórico en solo lectura','JS/Tests/AdminImageUploadLedgerReadOnly.mjs');
 runCli('ADMIN resolución append-only, idempotencia y concurrencia','JS/Tests/AdminVehicleContributionResolution.mjs');
 runCli('Proyección de aportes y sustituciones ADMIN append-only','JS/Tests/VehicleContributionProjection.mjs');
 recordResult('ADMIN edición modal/RBAC',loadFunction('JS/Tests/AdminModalEditIntegrity.js','runAdminModalEditIntegrityTests')(a));
 runCli('P4 política de roles para compartir, imprimir y editar ficha','JS/Tests/VehicleModalRolePolicy.mjs');
 runCli('Modal de corte: colaborador comunitario cuando falta','JS/Tests/CutDetailContributorFallback.mjs');
  runCli('WRITE cargas Drive fuera del ScriptLock y reserva de slots','JS/Tests/WriteDriveOutsideLock.mjs');
  runCli('WRITE contrato de transacción física, idempotencia y rollback','JS/Tests/WritePhysicalTransactionContract.mjs');
  runCli('WRITE prepara validación de cortes fuera del ScriptLock con lecturas acotadas','JS/Tests/WriteCutPreflightOutsideLock.mjs');
  runCli('WRITE reutiliza la fila de vehículo localizada durante el registro de cortes','JS/Tests/WriteCutExistingVehicleSnapshotReuse.mjs');
  runCli('WRITE agrupa escrituras de cortes sin alterar campos separados','JS/Tests/WriteCutSlotBatchWrites.mjs');
  runCli('WRITE registra cortes existentes mediante ledger append-only','JS/Tests/AdminCutSlotBatchWrites.mjs');
  runCli('MIG-010 recuperación idempotente de altas se ejecuta en WRITE','JS/Tests/AdminRecoveryRepairBatchWrites.mjs');
  runCli('WRITE conserva alta de vehículos y recuperación idempotente','JS/Tests/AdminNewVehicleBatchWrites.mjs');
  runCli('WRITE limpia la fila nueva antes de asignar el ID','JS/Tests/AdminNewVehicleSingleRowClear.mjs');
  runCli('WRITE revalida ID desde snapshot post-Drive','JS/Tests/AdminNewVehiclePostDriveIdSnapshotReuse.mjs');
  runCli('WRITE evita ciclos Drive/lock innecesarios y agrupa la reparación de imágenes','JS/Tests/AdminRecoveryImageRepairFastPath.mjs');
  runCli('WRITE reutiliza snapshot de fila para vincular imágenes recuperadas','JS/Tests/AdminRecoveryImageSnapshotReuse.mjs');
  runCli('WRITE recupera opId heredados sin descargar Cortes completo','JS/Tests/WriteOpIdLegacyLookup.mjs');
  runCli('WRITE localiza vehicleId leyendo solo la columna ID','JS/Tests/WriteUniqueVehicleRowBoundedRead.mjs');
  runCli('WRITE evita reinicializar ledger Idempotencia compatible','JS/Tests/IdempotenciaSheetLookupFastPath.mjs');
  runCli('ADMIN evita reinicializar ledger Idempotencia compatible','JS/Tests/AdminIdempotenciaSheetLookupFastPath.mjs');
  runCli('ADMIN delega idempotencia de altas a WRITE','JS/Tests/AdminIdempotencySnapshotReuse.mjs');
  runCli('WRITE reutiliza snapshot Idempotencia y verifica opId dirigido','JS/Tests/WriteIdempotencySnapshotReuse.mjs');
  runCli('ADMIN reserva slots de corte ocupados por operaciones pending','JS/Tests/AdminCutSlotReservation.mjs');
  runCli('WRITE asignación de IDs no espera el ScriptLock global','JS/Tests/WriteIdAllocatorNonBlocking.mjs');
  runCli('WRITE asignador de vehicleId inspecciona solo IDs y filas incompletas','JS/Tests/WriteVehicleIdAllocatorBoundedRead.mjs');
  runCli('WRITE asigna IDs de forma idempotente por opId','JS/Tests/WriteVehicleIdAllocationIdempotency.mjs');
  runCli('WRITE validación de respaldo Drive fuera del ScriptLock en freeze IDs','JS/Tests/WriteFreezeCortesIdsBackupOutsideLock.mjs');
  runCli('WRITE limita lectura de entidades existentes a marca/modelo/versiones','JS/Tests/WriteEntityLookupBoundedRead.mjs');
  runCli('WRITE consulta entidades solo cuando se aportan campos de entidad','JS/Tests/WriteEntityCatalogDemand.mjs');
  runCli('WRITE reutiliza el ledger AportesVehiculo validado durante la operación','JS/Tests/WriteContributionLedgerReuse.mjs');
  runCli('WRITE reutiliza snapshot Cortes al comprobar VIN duplicado','JS/Tests/WriteVinSnapshotReuse.mjs');
  runCli('WRITE publicación del catálogo fuera del ScriptLock global','JS/Tests/WriteCatalogPublicationIsolation.mjs');
  runCli('WRITE carpetas suplementarias sin lease ni espera','JS/Tests/WriteSupplementaryFolderNoLease.mjs');
  runCli('ADMIN libera ScriptLock durante trabajo Drive con revalidación','JS/Tests/AdminDriveLockIsolation.mjs');
  runCli('WRITE reserva ID antes del ScriptLock; ADMIN rechaza ruta legacy','JS/Tests/AdminVehicleIdOutsideLock.mjs');
   runCli('WRITE reserva IDs idempotentes con opId y huella','JS/Tests/AdminVehicleIdAllocationIdempotency.mjs');
   runCli('Frontend→WRITE recupera asignación de ID tras respuesta perdida','JS/Tests/VehicleIdAllocationEndToEnd.mjs');
  runCli('ADMIN reutiliza encabezados VIN/testigo sin lecturas repetidas','JS/Tests/AdminTestigoHeaderReadReuse.mjs');
  runCli('ADMIN sincroniza carpeta de imagen después de liberar ScriptLock','JS/Tests/AdminVehicleFolderSyncOutsideLock.mjs');
  runCli('ADMIN reemplazo de imagen ejecuta Drive fuera del ScriptLock y revalida opId','JS/Tests/AdminImageUploadDriveIsolation.mjs');
  runCli('ADMIN recupera reemplazos linked fuera del ScriptLock','JS/Tests/AdminImageUploadLinkedRecoveryIsolation.mjs');
  runCli('ADMIN compensa archivos Drive fuera del ScriptLock con reserva idempotente','JS/Tests/AdminImageUploadCompensationIsolation.mjs');
  runCli('ADMIN vincula imágenes de cortes fuera del ScriptLock','JS/Tests/AdminCutImageLinkOutsideLock.mjs');
  runCli('ADMIN registra actividad de movimiento de imágenes después del ScriptLock','JS/Tests/AdminMoveImageActivityOutsideLock.mjs');
  runCli('ADMIN valida Drive y referencias de movimiento de imagen fuera del ScriptLock','JS/Tests/AdminMoveImageDrivePreflightOutsideLock.mjs');
  runCli('ADMIN limita lectura del catálogo de entidades a sus columnas','JS/Tests/AdminEntityLookupBoundedRead.mjs');
  runCli('ADMIN limita lectura de duplicados VIN a columnas necesarias','JS/Tests/AdminVinDuplicateBoundedRead.mjs');
  runCli('ADMIN localiza vehículo leyendo solo la columna ID','JS/Tests/AdminUniqueVehicleRowBoundedRead.mjs');
  runCli('ADMIN inventario Drive no bloquea cortes ni login','JS/Tests/AdminInventoryLockIsolation.mjs');
  runCli('RBAC y sesiones ilimitadas del rol Desarrollador','JS/Tests/DeveloperPrivilegeRouting.mjs');
 runCli('P4 protección de medios sin bloquear texto ni controles','JS/Tests/ClientInteractionPolicy.mjs');
 recordResult('ADMIN compensación de reemplazos in-modal/AUG-038',loadFunction('JS/Tests/AdminImageReplacementCompensation.js','runAdminImageReplacementCompensationTests')(read('JS/Frontend/ui.js'),a));
 recordResult('ADMIN respaldo/restauración/rollback',loadFunction('JS/Tests/AdminRestoreRecovery.js','runAdminRestoreRecoveryTests')(a));
 runCli('ADMIN reanudación de respaldo Drive y sintaxis Node.js','JS/Tests/AdminBackupResumeUI.mjs');
 runCli('AUG-019 alcance de terminal Drive y protección de árbol Cortes','JS/Tests/DriveTerminalScope.mjs');
 runCli('MIG-017 terminal conecta move con IDs visibles de Drive','JS/Tests/DriveTerminalMoveClient.mjs');
 runCli('AUG-021 auditoría persistente de operaciones ADMIN','JS/Tests/AdminAuditTrail.mjs');
 runCli('P2 auditoría de identificadores sin escritura','JS/Tests/IdentifierAudit.mjs');
 runCli('P2 motor de migración de IDs, lotes, huellas y rollback','JS/Tests/IdentifierMigration.mjs');
 runCli('P2 migración integral de fórmulas ID, valores y lotes reanudables','JS/Tests/IdentifierFormulaMigration.mjs');
 runCli('UX ayudas contextuales del formulario de cortes','JS/Tests/ContextualHelpForms.mjs');
  runCli('UX proporciones del panel Developer','JS/Tests/DeveloperPanelUX.mjs');
  runCli('Drive alertas privadas por umbral de cuota y monitor GDrive','JS/Tests/DriveStorageAlerts.mjs');
 runCli('MIG-013 actor de sesión desde Users/ActiveSessions con caché local','JS/Tests/MIG013SessionActorLocalLookup.mjs');
 runCli('P1 coordinación de actividad y sesiones protegidas por servicio','JS/Tests/SessionActivityCoordination.mjs');
 runCli('P0 AUTH leases mínimos para términos y actividad huérfana','JS/Tests/SessionActivityLeaseMinimization.mjs');
 runCli('P0 AUTH elimina lecturas completas y revocaciones duplicadas','JS/Tests/AuthSessionReadOptimization.mjs');
 runCli('GP-IMG-UX-01 biblioteca de imágenes: selección, menús y vistas','JS/Tests/ReplacedImagesLibraryUX.mjs');
 runCli('GP-IMG-DATA-01 planner exacto de conciliación Drive ↔ Cortes','JS/Tests/CortesImageReconciliation.mjs');
  runCli('GP-IMG-DATA-01 aplicación aprobada, read-back y rollback','JS/Tests/CortesImageReconciliationApply.mjs');
 runCli('GP-IMG-DATA-01 UI de simulación y reporte de conciliación','JS/Tests/CortesImageReconciliationUI.mjs');
 runCli('P2 asignador backend de IDs LogosMarca','JS/Tests/LogoIdIntegrity.mjs');
 runCli('ADMIN asignación de logotipos sin bloqueo de Drive','JS/Tests/AdminLogoWriteLockNonBlocking.mjs');
});
runGroup('33','FEEDBACK',()=>{
 const feedback=read('JS/Services/feedback.js');
 runCli('FEEDBACK telemetría mínima de vistos y separación del historial local','JS/Tests/RecentlyViewedActivityTelemetry.mjs');
 runCli('AUG-087 caché PyS y aplicación incremental del feed','JS/Tests/PysDataCache.js');
 runCli('FEEDBACK verifica imagen PyS pending fuera del ScriptLock','JS/Tests/FeedbackPysPendingImageVerificationOutsideLock.mjs');
 runCli('FEEDBACK metadata y actividad PyS post-commit fuera del ScriptLock','JS/Tests/FeedbackPysPostCommitOutsideLock.mjs');
 runCli('FEEDBACK limpieza de adjuntos de reportes fuera del ScriptLock','JS/Tests/FeedbackReportImageCleanupOutsideLock.mjs');
 runCli('FEEDBACK limpieza de adjuntos de sugerencias fuera del ScriptLock','JS/Tests/FeedbackSuggestionImageCleanupOutsideLock.mjs');
 runCli('FEEDBACK compensación Drive de PyS fuera del lock con revalidación','JS/Tests/FeedbackPysRollbackOutsideLock.mjs');
 runCli('P4.1 arranque paralelo de catálogo y PyS','JS/Tests/CatalogStartupParallelism.mjs');
 runCli('P2 asignador backend para IDs de hojas Feedbacks, ActividadUsuario y Contactanos','JS/Tests/FeedbackFormulaIdAllocator.mjs');
  runCli('FEEDBACK suggestYear usa actor central y conserva ruta anónima','JS/Tests/SuggestYearCoordinatorSession.mjs');
  runCli('FEEDBACK suggestYear aplica el umbral de tres votos verificados','JS/Tests/SuggestYearVoteThreshold.mjs');
  runCli('FEEDBACK ampliaciones de año append-only, idempotencia y conflictos','JS/Tests/FeedbackYearApplicationAppendOnly.mjs');
  runCli('FEEDBACK read-back dirigido de aplicaciones de año','JS/Tests/FeedbackYearApplicationReadbackBounded.mjs');
  runCli('FEEDBACK contacto reserva ID y anexa sin lock global prolongado','JS/Tests/FeedbackContactWriteNoGlobalLock.mjs');
  runCli('FEEDBACK sincronización de carpeta por sugerencia de año fuera del ScriptLock','JS/Tests/FeedbackYearFolderSyncOutsideLock.mjs');
  runCli('FEEDBACK actividad de like fuera del ScriptLock','JS/Tests/FeedbackLikeActivityOutsideLock.mjs');
  runCli('FEEDBACK registro de actividad appendRow sin lock','JS/Tests/ActivityLogAppendAtomic.mjs');
  runCli('FEEDBACK preflight dirigido de likes fuera del ScriptLock','JS/Tests/FeedbackLikePreflightOutsideLock.mjs');
  runCli('FEEDBACK búsqueda dirigida de reportId','JS/Tests/FeedbackReportLookupBoundedRead.mjs');
  runCli('FEEDBACK localización de fila append por ID reservado bajo intercalado','JS/Tests/FeedbackAppendRowIdentity.mjs');
  runCli('FEEDBACK proyección lógica y deduplicación de Inbox','JS/Tests/FeedbackLogicalProjection.mjs');
  runCli('FEEDBACK ledger append-only de imágenes de reportes','JS/Tests/FeedbackReportImageEvents.mjs');
  runCli('FEEDBACK bandeja agrupa metadata de imágenes en una lectura','JS/Tests/FeedbackInboxImageEventBatchRead.mjs');
  runCli('FEEDBACK replay de reportes antes de Drive y lock','JS/Tests/FeedbackReportPreflightOutsideLock.mjs');
  runCli('FEEDBACK replay de tutorial antes del lock','JS/Tests/FeedbackTutorialPreflightOutsideLock.mjs');
  runCli('FEEDBACK lookup dirigido de tutoriales','JS/Tests/FeedbackTutorialLookupBoundedRead.mjs');
  runCli('FEEDBACK título dirigido en edición de tutorial','JS/Tests/FeedbackTutorialUpdateTitleLookupBoundedRead.mjs');
  runCli('FEEDBACK lookup dirigido de aprobaciones de vídeo','JS/Tests/FeedbackPendingVideoLookupBoundedRead.mjs');
  runCli('FEEDBACK lookup dirigido de opVideoId','JS/Tests/FeedbackVideoApprovalOperationLookupBoundedRead.mjs');
  runCli('FEEDBACK actualización tutorial sin cambios antes del lock','JS/Tests/FeedbackTutorialUpdateNoopPreflight.mjs');
  runCli('FEEDBACK lookup dirigido de problemas PyS','JS/Tests/FeedbackPysLookupBoundedRead.mjs');
  runCli('FEEDBACK búsqueda dirigida de sugerencias','JS/Tests/FeedbackSuggestionLookupBoundedRead.mjs');
  runCli('FEEDBACK replay de sugerencias antes de Drive y lock','JS/Tests/FeedbackSuggestionPreflightOutsideLock.mjs');
  runCli('FEEDBACK asignador formula-based ID lectura acotada','JS/Tests/FeedbackFormulaIdAllocatorBoundedRead.mjs');
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
 runCli('FEEDBACK init YouTube idempotente y reserva por destino','JS/Tests/YouTubeInitIdempotencyBoundary.mjs');
 runCli('CATALOG publicación de reset desde navegador con sesión local','JS/Tests/CatalogBrowserReset.mjs');
    runCli('FEEDBACK aprobación de vídeo refresca CATALOG desde frontend','JS/Tests/VideoApprovalCatalogRefreshFrontend.mjs');
 const initTest=read('JS/Tests/YouTubeApprovalInit.js');
 const init=new Function('ScriptApp','UrlFetchApp','Logger',feedback+'\n'+initTest+'\nreturn runYouTubeApprovalInitTests();')(
  {getOAuthToken:()=> 'oauth-token'},{fetch:()=>({getAllHeaders:()=>({}),getResponseCode:()=>500,getContentText:()=>''})},{log(){}});
 recordResult('FEEDBACK precondiciones de subida resumable',init);
 recordResult('FEEDBACK ledger Inbox',loadFunction('JS/Tests/InboxAuditTrail.js','runInboxAuditTrailTests','\n\nimport {')({feedback}));
 recordResult('FEEDBACK lectura acotada de ActividadUsuario/AUG-120',loadFunction('JS/Tests/ActivityLogsBoundedRead.js','runActivityLogsBoundedReadTests','\n\nimport {')({feedback}));
 runCli('AUG-020 purga segura y clasificación de timestamps de ActividadUsuario','JS/Tests/ActivityLogRetention.mjs');
 runCli('WRITE preflight de tamaño de imágenes antes de Base64','JS/Tests/AddCutImageSizePreflight.mjs');
 recordResult('FEEDBACK contrato canónico de rol Inbox/AUG-115',loadFunction('JS/Tests/InboxRoleContract.js','runInboxRoleContractTests','\n\nimport {')({
  ui:read('JS/Frontend/ui.js'),feedback,inbox:read('JS/Services/InboxConversations.js'),usersHtml:read('HTML/users.html'),authClient:read('JS/Frontend/auth.js'),api:read('JS/Frontend/api-config.js')
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
 runCli('CATALOG dropdowns lee solo columnas necesarias para editar cortes','JS/Tests/CatalogDropdownRead.mjs');
 runCli('CATALOG respuestas dirigidas de vehículo y candidatos','JS/Tests/CatalogTargetedResponses.mjs');
 runCli('CATALOG proyección individual lee una sola fila completa y VIN globales','JS/Tests/CatalogVehicleProjectionRead.mjs');
 runCli('CATALOG candidatos ADMIN evita lecturas de servicios no relacionados','JS/Tests/CatalogContributionReadIsolation.mjs');
 runCli('CSS encabezado de corte: cascada consolidada y proporciones responsive','JS/Tests/ModalHeaderCssCascade.mjs');
 runCli('CATALOG navegación lee solo columnas de contrato','JS/Tests/CatalogNavigationRead.mjs');
 runCli('CATALOG reutiliza una instancia Spreadsheet por lectura','JS/Tests/CatalogSpreadsheetHandleReuse.mjs');
 runCli('CATALOG feed incremental autenticado, cursor y recuperación','JS/Tests/CatalogChangeFeed.mjs');
 runCli('CATALOG inicialización manual e idempotente de hojas del feed','JS/Tests/CatalogChangeFeedInitialization.mjs');
 runCli('FEEDBACK snapshots versionados y publicación fuera del ScriptLock','JS/Tests/FeedbackCatalogPublicationIsolation.mjs');
 runCli('ADMIN snapshots de catálogo versionados y publicación fuera del ScriptLock','JS/Tests/AdminCatalogPublicationIsolation.mjs');
 runCli('ADMIN guardas temporales de inventario, auditoría y carpeta Cortes','JS/Tests/AdminLocalOperationGuard.mjs');
 runCli('ADMIN inicialización y validación fail-safe del esquema AdminOperationGuards','JS/Tests/AdminOperationGuardsSchema.mjs');
  runCli('ADMIN crea y completa esquemas de auditoría Drive con FindOrCreate seguro','JS/Tests/AdminDriveAuditSheetsFindOrCreate.mjs');
  runCli('ADMIN reconciliación del journal de imágenes','JS/Tests/AdminImageUploadEventReconciliation.mjs');
 runCli('CATALOG telemetría local no bloqueante y segura','JS/Tests/CatalogTrafficTelemetry.mjs');
 runCli('CATALOG proyección determinista del ledger de aportes por vehículo','JS/Tests/VehicleContributionProjection.mjs');
 runCli('CATALOG lectura compacta del ledger FeedbackLikes','JS/Tests/CatalogLikeProjectionReadScale.mjs');
  runCli('WRITE intercalado concurrente del ledger append-only','JS/Tests/WriteContributionAppendConcurrency.mjs');
  runCli('WRITE recuperación durable de aportes suplementarios etapa 3','JS/Tests/AddSupplementaryOperationRecovery.mjs');
  runCli('WRITE reutiliza snapshot post-append para slots y conflicto VIN','JS/Tests/WriteContributionPostAppendSnapshot.mjs');
  runCli('FEEDBACK replay de likes completados fuera del lock','JS/Tests/FeedbackLikeCompletedReplayPreflight.mjs');
  runCli('FEEDBACK likes append-only y proyección CATALOG','JS/Tests/FeedbackLikeAppendOnly.mjs');
  runCli('WRITE replay idéntico de VIN fuera del lock','JS/Tests/WriteVinNoopPreflight.mjs');
  runCli('WRITE recuperación de opId desde AportesVehiculo','JS/Tests/WriteContributionRecovery.mjs');
  runCli('WRITE diario append-only de cargas de imágenes','JS/Tests/ImageUploadEventJournal.mjs');
 runCli('CATALOG readiness','JS/Tests/CatalogReadiness.js');
 runCli('CATALOG snapshots/IndexedDB aislado','JS/Tests/CatalogSnapshotSync.js');
 runCli('CATALOG arranque cache-first y fallback incremental','JS/Tests/CatalogStartupIntegrity.mjs');
 runCli('CATALOG feed ausente: diagnóstico y fallback snapshot','JS/Tests/CatalogFeedInitializationFallback.mjs');
 runCli('CATALOG estados de presentación','JS/Tests/CatalogStatus.js');
});
runGroup('35','UTILITIES',()=>{
 recordResult('UTILITIES Spreadsheet simulado/RBAC/staging/rollback',new Function(read('JS/Services/SharedSessionActor.js')+'\n'+read('JS/Services/Utilities.js')+'\n'+read('JS/Tests/UtilitiesSecurity.js')+'\nreturn runUtilitiesSecurityTests();')());
});
runGroup('36','AUTH',()=>{
 runCli('AUTH inicializador idempotente de configuración central','JS/Tests/CentralConfigurationInitializer.mjs');
 runCli('AUTH aceptación de términos por usuario y dispositivo','JS/Tests/TermsAcceptance.js');
  runCli('AUTH aceptación local y sincronización asíncrona por sesión/dispositivo','JS/Tests/TermsAsyncSync.mjs');
 runCli('AUTH purga de Logs usando actor confiable sin revalidación por acción','JS/Tests/SensitiveLogsTrustedActor.mjs');
 runCli('FEEDBACK limpieza de ActividadUsuario: retención y resultados sin cambios','JS/Tests/ActivityLogsClearFeedback.mjs');
 runCli('ADMIN UI: selector compacto y mensajes de limpieza de Logs','JS/Tests/AdminLogsMaintenanceContract.mjs');
 runCli('AUTH restauración de sesión sin revalidación redundante','JS/Tests/SessionRestoreOnValidationFailure.mjs');

 runCli('AUTH PBKDF2 versionado, compatibilidad legacy y coste','JS/Tests/PasswordHashMigration.mjs');
 runCli('AUTH benchmark PBKDF2 protegido de solo lectura','JS/Tests/PasswordKdfBenchmark.mjs');
  runCli('AUTH recuperación por correo, código temporal, límites y revocación','JS/Tests/PasswordRecovery.mjs');
 runCli('AUTH ledger LoginRequests, baseline idempotente y locks fail-fast','JS/Tests/LoginRequestLedger.mjs');
 runCli('AUTH baseline role_revocation_pending_ y ledger compartido','JS/Tests/RoleRevocationLedger.mjs');
 runCli('Servicios backend: locks no bloqueantes','JS/Tests/NonBlockingServiceLocks.mjs');
 runCli('ADMIN auditoría de referencias de IDs de Tutorial','JS/Tests/TutorialIdReferenceAudit.mjs');
 runCli('ADMIN auditoría de referencias cruzadas de usuarios','JS/Tests/UserIdReferenceAudit.mjs');
 const auth=read('JS/Services/Auth.js'),testAuth=read('JS/Tests/Auth.js'),html=read('HTML/users.html');
 const test=loadFunction('JS/Tests/LastDeveloperProtection.js','runLastDeveloperProtectionTests','\n\nimport {');
 const a=test({auth,html}),b=test({auth:testAuth,html});
 recordResult('AUTH operativo y copia aislada',{passed:a.passed+b.passed,failed:a.failed+b.failed,total:a.passed+a.failed+b.passed+b.failed,results:[...a.results,...b.results]});
 if(normalizedCopy(auth)!==normalizedCopy(testAuth)) throw new Error('La copia AUTH difiere fuera del ID aislado.');
 recordResult('AUTH fixture/paridad',{passed:1,failed:0,total:1});
 recordResult('AUTH perfil remoto y revocación/AUG-118',loadFunction('JS/Tests/SessionProfileRefresh.js','runSessionProfileRefreshTests','\nimport {')({
  auth,testAuth,client:read('JS/Frontend/auth.js')
 }));
 recordResult('UI invalidación de sesión y rol/AUG-042',loadFunction('JS/Tests/SessionUiRoleInvalidation.js','runSessionUiRoleInvalidationTests')({
  ui:read('JS/Frontend/ui.js'),auth:read('JS/Frontend/auth.js'),users:html,authService:auth,main:read('JS/Frontend/main.js'),feedback:read('JS/Services/feedback.js'),css:read('style.css')
 }));

 // MIG-012: pruebas de gestión de usuarios ya integradas en AUTH.
 runCli('AUTH enrutamiento de getUsers/createUser/updateProfile','JS/Tests/UsersDirectTrafficTelemetry.mjs');
 runCli('Gestión de usuarios: tabla responsive y acciones móviles','JS/Tests/ResponsiveFormsUsers.js');
 runCli('AUTH generador backend de IDs de usuario','JS/Tests/UserIdGenerator.mjs');
 runCli('AUTH creación reutiliza un único snapshot para username, fila e ID','JS/Tests/UsersMutationSnapshot.mjs');
 runCli('AUTH lecturas de lista y perfil limitadas a columnas necesarias','JS/Tests/UsersReadMinimization.mjs');
 recordResult('AUTH gestión de usuarios: RBAC, atomicidad, rollback y sesión',loadFunction('JS/Tests/UsersAtomicMutations.js','runUsersAtomicMutationTests')(read('JS/Services/Auth.js'),""));
});
runGroup('38','INTEGRATION',()=>{
 runCli('GP-UX-SEARCH-MODEL-GROUPING-01 agrupación y jerarquía de vehículos','JS/Tests/SearchModelGrouping.mjs');
 runCli('AUG-022 eliminación asíncrona de caché IndexedDB ADMIN','JS/Tests/AdminClientCacheDeletion.mjs');
 runCli('MIG-008 registro central ignora servicios retirados','JS/Tests/MIG008CentralConfigurationReader.mjs');
 runCli('MIG-URL-004 retiro de administración central de URLs y preservación de parámetros','JS/Tests/MIGURL004CentralEndpointRetirement.mjs');
 runCli('MIG-URL-004 retiro de administración central de URLs y preservación de parámetros','JS/Tests/MIGURL004CentralEndpointRetirement.mjs');
 runCli('AUG-024 contrato de salud, identidad y clasificación de servicios','JS/Tests/ServiceHealthContract.mjs');
 runCli('BETA-043 contrato de telemetría global coordinada','JS/Tests/ServiceTrafficAdminContract.mjs');
 runCli('BETA-043 telemetría local por servicio y navegador móvil','JS/Tests/ServiceBrowserTrafficContract.mjs');
 runCli('BETA-043 telemetría directa AUTH WRITE FEEDBACK','JS/Tests/DirectServiceTrafficTelemetry.mjs');
 runCli('BETA-043 auditoría de rutas directas y Coordinator','JS/Tests/DirectTrafficRoutingCoverage.mjs');
 runCli('BETA-043 telemetría local del navegador y agregado Coordinator','JS/Tests/ServiceMetricsTelemetry.mjs');
 runCli('AUG-026 integridad, estados y recuperación del historial de imágenes','JS/Tests/AdminReplacedImagesIntegrity.mjs');
 runCli('AUG-031 persistencia incremental, migración y aislamiento de auditorías IndexedDB','JS/Tests/AdminDriveAuditIndexedDB.mjs');
 runCli('AUG-033 captura optimizada de referencias, presupuesto y memoización de Drive','JS/Tests/AdminReplacedImagesIntegrity.mjs');
 runCli('AUG-033 timeout y reintentos idempotentes de lotes de auditoría','JS/Tests/AdminDriveAuditClientRetry.mjs');
 runCli('A07-05 salida del escáner en consola global y conservación de resultados/reanudación','JS/Tests/AdminDriveAuditGlobalConsole.mjs');
 runCli('AUG-027 ciclo de papelera, restauración, eliminación definitiva, permisos e idempotencia','JS/Tests/AdminImageTrashLifecycle.mjs');
  runCli('ADMIN valida archivo para papelera fuera del ScriptLock','JS/Tests/AdminDeleteImageDrivePreflightOutsideLock.mjs');
  runCli('ADMIN verifica Drive de restauración desde papelera fuera del ScriptLock','JS/Tests/AdminRestoreImageDrivePreflightOutsideLock.mjs');
  runCli('ADMIN valida estado Drive de eliminación definitiva fuera del ScriptLock','JS/Tests/AdminPermanentDeleteDrivePreflightOutsideLock.mjs');
  runCli('ADMIN valida Drive y protege imagen en uso fuera del ScriptLock','JS/Tests/AdminMarkImageInUseDrivePreflightOutsideLock.mjs');
  runCli('ADMIN registra actividad de eliminación definitiva después del ScriptLock','JS/Tests/AdminPermanentDeleteActivityOutsideLock.mjs');
  runCli('ADMIN registra actividad de restauración desde papelera después del ScriptLock','JS/Tests/AdminRestoreImageActivityOutsideLock.mjs');
  runCli('ADMIN registra actividad de papelera después del ScriptLock','JS/Tests/AdminDeleteImageActivityOutsideLock.mjs');
  runCli('ADMIN verifica archivo histórico Drive fuera del ScriptLock y revalida el registro','JS/Tests/AdminRecoverImageDrivePreflightOutsideLock.mjs');
 runCli('AUG-023 contrato y validación de acciones ADMIN createSheet/addColumn','JS/Tests/AdminSheetActionsContract.mjs');
 runCli('AUG-156 coordinación de inventario, escáner y migración de historial','JS/Tests/AdminImageScanLocalGuardContract.mjs');
 runCli('ADMIN telemetría solo en panel visible y restringido a Desarrollador','JS/Tests/AdminTrafficSurfaceContract.mjs');
 runCli('ADMIN inventario de lecturas y contratos de backup/restore/upload','JS/Tests/AdminOperationReadInventory.mjs');
 runCli('Organizador Cortes: rutas, nombres, códigos y bloqueos del constructor','JS/Tests/CortesImageOrganizerTargets.mjs');
 runCli('Organizador Cortes: sugerencias conservadoras de asociación por modelo','JS/Tests/CortesImageModelAssociationSuggestions.mjs');
 runCli('Organizador Cortes: manifiesto Safe Apply, idempotencia y plan de rollback','JS/Tests/CortesImageOrganizerApplyPlan.mjs');
 runCli('Organizador Cortes: ejecutor durable, ACL y rollback ejecutable','JS/Tests/CortesImageOrganizerExecutor.mjs');
 runCli('Organizador Cortes: controles UI de aprobación explícita y rollback','JS/Tests/CortesImageOrganizerUiContract.mjs');
 runCli('Organizador Cortes: historial durable y retención de operaciones','JS/Tests/CortesImageOrganizerLedger.mjs');
 runCli('WRITE: IDs idempotentes para cargas de apertura y alimentación','JS/Tests/SupplementaryImageOperationIdContract.mjs');
 runCli('Concurrencia de mutaciones: espera breve y trabajo Drive fuera del lock','JS/Tests/MutationLockContention.mjs');
 runCli('AUG-150 errores HTTP, red, JSON y aplicación en ADMIN','JS/Tests/RouteActionErrors.mjs');
 runCli('AUG-152 conversaciones Inbox, participantes, idempotencia y auditoría','JS/Tests/InboxConversations.mjs');
 runCli('GP-PERF FEEDBACK e Inbox sem esperas prolongadas','JS/Tests/FeedbackLockFastFail.mjs');
 runCli('P2.2a FEEDBACK adjuntos Drive fuera del lock sin contadores directos','JS/Tests/P2FeedbackImageUploadLocks.mjs');
 runCli('P2.2b PyS imagen fuera del lock y recuperación','JS/Tests/P2PysImageUploadOutsideLock.mjs');
 runCli('PyS relaciones y mutaciones bajo lease compartida','JS/Tests/PysVehicleRelationIntegrity.js');
 runCli('GP-PERF ADMIN información suplementaria: cargas Drive fuera del lock','JS/Tests/AdminSupplementaryUploadOutsideLock.mjs');
 runCli('P3.1 actor de login cacheado y sin consultas por acción','JS/Tests/SessionActorCacheLifetime.mjs');
 runCli('P3.1c precarga e invalidación de cachés de actor en WRITE/FEEDBACK/ADMIN','JS/Tests/SessionActorCacheInvalidation.mjs');
 runCli('AUG-152 interfaz Inbox, accesibilidad, borradores y sincronización','JS/Tests/InboxUi.mjs');
 runCli('Dashboard y aportes de cortes por usuario','JS/Tests/ActivityDashboardContributions.mjs');
 runCli('GP-DASH Actividad reciente: contención de clics y acordeones','JS/Tests/ActivityDashboardRecentInteraction.mjs');
 runCli('GP-DASH-INSIGHTS-01 indicadores, rankings y render seguro','JS/Tests/ActivityDashboardInsights.mjs');
 runCli('Carrusel de vistos recientes optimista','JS/Tests/RecentlyViewedCarousel.mjs');
  runCli('AUG-116 caché de páginas y paginación de Inbox','JS/Tests/InboxCachePagination.js');
 runCli('OVERLAY pila de menú y modales administrativos','JS/Tests/OverlayMenuModalHistory.js');
 runCli('AUTH, navegación, catálogo silencioso y miniaturas','JS/Tests/SessionStartupNavigation.mjs');
 runCli('AUG-148 accesibilidad y foco del modal de desarrollador','JS/Tests/DevToolsModalAccessibility.mjs');
 runCli('BETA-021 sistema global de botones, campos y selectores','JS/Tests/GlobalControlSystem.mjs');
 runCli('BETA-022 política de dimensiones y ancho de botones','JS/Tests/ButtonWidthPolicy.mjs');
 runCli('BETA-023 preferencia global de formato descriptivo','JS/Tests/RichTextGlobalPreference.mjs');
 runCli('BETA-025 presentación de nombres largos','JS/Tests/LongNameLayout.mjs');
 runCli('BETA-026 organización del modal de detalle de corte','JS/Tests/CutDetailModalLayout.mjs');
  runCli('Modal Tutorial: iframe YouTube y dimensiones del vídeo guía','JS/Tests/TutorialVideoModalLayout.mjs');
 runCli('CSS modales informativos: base única, cierre y variantes de tema','JS/Tests/InfoModalStyleCascade.mjs');
 runCli('CSS encabezados Inbox y Developer Tools agrupados','JS/Tests/ModalHeaderCascade.mjs');
 runCli('Developer Console copia únicamente errores clasificados','JS/Tests/DeveloperConsoleErrors.mjs');
 runCli('BETA-032 enrutamiento central de mensajes Developer','JS/Tests/DeveloperConsoleRouting.mjs');
 runCli('BETA-033 confirmaciones normalizadas en consola Developer','JS/Tests/DeveloperConsoleConfirmation.mjs');
 runCli('BETA-034 mensajes de operaciones Developer centralizados','JS/Tests/DeveloperOperationMessages.mjs');
 runCli('BETA-035 textos compactos y ayudas del panel Developer','JS/Tests/DeveloperPanelCopy.mjs');
 runCli('CATALOG reintentos y cancelación','JS/Tests/CatalogRequestRetry.js');
  runCli('UI carruseles sin listeners resize acumulados','JS/Tests/CarouselResizeListenerLifecycle.mjs');
  runCli('UI refresca tutoriales mediante delta antes del snapshot','JS/Tests/TutorialCatalogRefreshDeltaFirst.mjs');
  runCli('ADMIN no acumula listeners al reabrir panel','JS/Tests/AdminPanelListenerLifecycle.mjs');
  runCli('UI inicialización y limpieza de listeners/observers sin duplicados','JS/Tests/UIInitializationLifecycle.mjs');
  runCli('CATALOG feed incremental con reintentos acotados','JS/Tests/CatalogFeedRetry.mjs');
  runCli('CATALOG cierre de edición consume deltas con fallback completo','JS/Tests/CatalogEditDeltaRefresh.mjs');
  runCli('IMÁGENES cola de miniaturas con prioridad y recuperación tras fallo','JS/Tests/ThumbnailCompressionQueueContract.mjs');
 runCli('IMÁGENES integración de prioridad visible frente a precarga','JS/Tests/ThumbnailPriorityIntegration.mjs');
 runCli('P1 harness local de calidad y rendimiento de miniaturas','JS/Tests/ThumbnailQualityBenchmarkContract.mjs');
  runCli('PWA cache-first, App Shell y cuerpos independientes','JS/Tests/ServiceWorkerCache.js');
 runCli('GP-PWA-BRAND-01 logos locales offline y favicon transparente','JS/Tests/OfflineBrandAssets.mjs');
 runCli('CATALOG escenarios de arranque PWA','JS/Tests/PWAStartupScenarios.js');
 runCli('AUG-IndexedDB apertura compartida, backoff y miniaturas opcionales','JS/Tests/IndexedDBTransactions.js');
 runCli('Caché de miniaturas: single-flight y limpieza LRU sin escaneo por imagen','JS/Tests/ThumbnailCacheDeduplication.mjs');
 runCli('Variantes de imagen: fuentes, tamaños, PNG y primera visualización','JS/Tests/ImageResolutionVariants.js');
 runCli('Ciclo de vida, presupuesto y revocación de ObjectURL','JS/Tests/ImageObjectUrlLifecycle.js');
  runCli('AUG cache opcional de validación sin bloquear modales','JS/Tests/OptionalValidationCache.mjs');
 runCli('CATALOG integridad del arranque y recuperación','JS/Tests/CatalogStartupIntegrity.mjs');
  runCli('AUG-047 accesibilidad, foco, navegación y offline de modales legales','JS/Tests/TermsModalAccessibility.mjs');
  runCli('AUG-144 QR local y privacidad de vídeos no listados','JS/Tests/PrintQrPrivacy.mjs');
  runCli('AUG-145 modos de distribución de ficha imprimible','JS/Tests/PrintSheetLayoutModes.mjs');
  runCli('AUG-143 paginación por altura real y orden técnico','JS/Tests/PrintSheetPaginationIntegrity.mjs');
  runCli('AUG-142 disponibilidad y decodificación de recursos de impresión','JS/Tests/PrintSheetResourceReadiness.mjs');
  runCli('AUG-141 indicador Check Engine y aviso de testigo','JS/Tests/PrintSheetWarningIndicator.mjs');
  runCli('AUG-140 contrato de márgenes y paginación Carta','JS/Tests/PrintSheetPageContract.mjs');
  runCli('PWA zoom de navegación restringido y excepción Lightbox','JS/Tests/BrowserZoomAccessibility.js');
  runCli('AUG-139 política anti-debugging, zoom y autorización backend','JS/Tests/AntiDebuggingPolicy.mjs');
 runCli('Verificación sintáctica integral de archivos JavaScript','JS/Tests/RepositoryJavaScriptSyntax.mjs');
 runCli('Verificación de referencias relativas e imports','JS/Tests/RepositoryModuleReferences.mjs');
 runCli('SEC arquitectura: RBAC, cierre de cuentas y revocación coordinada desde frontend','JS/Tests/SessionActorCapabilityPreservation.mjs');
 runCli('MIG-006 probe de acceso a Spreadsheet desde Web App','JS/Tests/MIG006SpreadsheetAccessProbe.mjs');
 runCli('MIG-007 contrato del esquema central de configuración','JS/Tests/MIG007ConfigurationSchemaContract.mjs');
 runCli('MIG-008 lector central de configuración y proyección segura','JS/Tests/MIG008CentralConfigurationReader.mjs');
 runCli('MIG-008 caché frontend de configuración central','JS/Tests/MIG008FrontendConfigurationCache.mjs');
 runCli('MIG-009 router frontend basado en configuración central','JS/Tests/MIG009FrontendActionRouter.mjs');
 runCli('MIG-010 orquestación frontend multi-servicio y recuperación idempotente','JS/Tests/MIG010FrontendServiceOrchestration.mjs');
 runCli('MIG-009 router frontend basado en configuración central','JS/Tests/MIG009FrontendActionRouter.mjs');
 runCli('MIG-004 grafo de llamadas entre servicios, reemplazos y pruebas','JS/Tests/ServiceCallGraphContract.mjs');
 runCli('AUG-138 logger seguro y recuperación offline/reintentos/cuota/respuesta perdida','JS/Tests/AddCortesDiagnostics.mjs');
 recordResult('YouTube solicitudes pending sin snapshot redundante',loadFunction('JS/Tests/YouTubePendingRefreshContract.js','runYouTubePendingRefreshContractTests')(read('JS/Frontend/ui.js')));
 runCli('WRITE alta de corte: tamaño y MIME antes de Base64','JS/Tests/AddCutImageSizePreflight.mjs');
 runCli('WRITE imágenes suplementarias: tamaño y lectura antes de Base64','JS/Tests/AddSupplementaryImagePreflight.mjs');
 recordResult('Limpieza UI y contratos públicos',loadFunction('JS/Tests/UiOrphanCleanup.js','runUiOrphanCleanupTests')({
  index:read('index.html'),ui:read('JS/Frontend/ui.js'),main:read('JS/Frontend/main.js')
 }));
 recordResult('Mapa de acciones y routers',loadFunction('JS/Tests/ActionDispatchContract.js','runActionDispatchContractTests')({
  apiConfig:read('JS/Frontend/api-config.js'),AUTH:read('JS/Services/Auth.js'),CATALOG:read('JS/Services/catalog.js'),
  centralConfigurationCache:read('JS/Frontend/centralConfigurationCache.js'),
  WRITE:read('JS/Services/write.js'),FEEDBACK:read('JS/Services/feedback.js')+'\n'+read('JS/Services/InboxConversations.js'),ADMIN:read('JS/Services/admin.js'),UTILITIES:read('JS/Services/Utilities.js'),usersHtml:read('HTML/users.html'),
  consumerSources:{apiConfig:read('JS/Frontend/api-config.js'),addCortes:read('HTML/add_cortes.html'),auth:read('JS/Frontend/auth.js'),main:read('JS/Frontend/main.js'),
   pysData:read('JS/Frontend/pys-data.js'),ui:read('JS/Frontend/ui.js'),usersHtml:read('HTML/users.html'),youtubeUpload:read('JS/Frontend/youtubeUpload.js')}
 }));
});
runGroup('39','MIG015',()=>{
 const runImageCli=(label,path)=>{try{runCli(label,path);}catch(error){totals.failed++;failures.push({id:'39',service:'MIG015',message:String(error&&error.stack||error)});console.error('FAIL [39] MIG015: '+label+': '+String(error&&error.message||error));}};
 runImageCli('MIG-015 configuración central de Spreadsheet y Drive','JS/Tests/MIG015ImageConfigurationContract.mjs');
 runImageCli('ADMIN carga de imagen valida tamaño y MIME antes de Base64','JS/Tests/AdminImageUploadPreflight.mjs');
 runImageCli('ADMIN inventario de imágenes reutiliza ledger filtrado de CATALOG','JS/Tests/AdminCandidateImageInventoryCatalogSource.mjs');
 runImageCli('ADMIN lectura segura y secuenciada de logotipos','JS/Tests/AdminLogoFileRead.mjs');
 runImageCli('ADMIN conserva ImageUploadLedger histórico en solo lectura','JS/Tests/AdminImageUploadLedgerReadOnly.mjs');
 runImageCli('ADMIN reemplazo de imagen ejecuta Drive fuera del ScriptLock','JS/Tests/AdminImageUploadDriveIsolation.mjs');
 runImageCli('ADMIN recupera reemplazos linked fuera del ScriptLock','JS/Tests/AdminImageUploadLinkedRecoveryIsolation.mjs');
 runImageCli('ADMIN compensa archivos Drive fuera del ScriptLock','JS/Tests/AdminImageUploadCompensationIsolation.mjs');
 runImageCli('ADMIN reconciliación del journal de imágenes','JS/Tests/AdminImageUploadEventReconciliation.mjs');
 runImageCli('ADMIN ciclo de papelera, restauración y eliminación de imágenes','JS/Tests/AdminImageTrashLifecycle.mjs');
 runImageCli('ADMIN integridad del historial de imágenes reemplazadas','JS/Tests/AdminReplacedImagesIntegrity.mjs');
 runImageCli('ADMIN biblioteca de imágenes y vistas','JS/Tests/ReplacedImagesLibraryUX.mjs');
 runImageCli('ADMIN conciliación Drive ↔ Cortes','JS/Tests/CortesImageReconciliation.mjs');
 runImageCli('ADMIN aplicación de conciliación, read-back y rollback','JS/Tests/CortesImageReconciliationApply.mjs');
 runImageCli('ADMIN UI de conciliación de imágenes','JS/Tests/CortesImageReconciliationUI.mjs');
 runImageCli('WRITE diario append-only de cargas de imágenes','JS/Tests/ImageUploadEventJournal.mjs');
 runImageCli('UI variantes de imagen y transparencia PNG','JS/Tests/ImageResolutionVariants.js');
 runImageCli('UI ciclo de vida de ObjectURL','JS/Tests/ImageObjectUrlLifecycle.js');
 runImageCli('WRITE alta de corte: tamaño y MIME antes de Base64','JS/Tests/AddCutImageSizePreflight.mjs');
 runImageCli('WRITE imágenes suplementarias: tamaño y lectura antes de Base64','JS/Tests/AddSupplementaryImagePreflight.mjs');
 runImageCli('FEEDBACK ledger append-only de imágenes de reportes','JS/Tests/FeedbackReportImageEvents.mjs');
 runImageCli('FEEDBACK limpieza de adjuntos de reportes','JS/Tests/FeedbackReportImageCleanupOutsideLock.mjs');
 runImageCli('FEEDBACK limpieza de adjuntos de sugerencias','JS/Tests/FeedbackSuggestionImageCleanupOutsideLock.mjs');
 runImageCli('FEEDBACK verificación de imágenes PyS fuera del lock','JS/Tests/FeedbackPysPendingImageVerificationOutsideLock.mjs');
 runImageCli('FEEDBACK metadata y actividad PyS post-commit','JS/Tests/FeedbackPysPostCommitOutsideLock.mjs');
 runImageCli('FEEDBACK rollback de imágenes PyS','JS/Tests/FeedbackPysRollbackOutsideLock.mjs');
 runImageCli('FEEDBACK carga de adjuntos fuera de locks','JS/Tests/P2FeedbackImageUploadLocks.mjs');
 runImageCli('FEEDBACK carga y recuperación de imágenes PyS','JS/Tests/P2PysImageUploadOutsideLock.mjs');
 runImageCli('ADMIN cargas suplementarias fuera del lock','JS/Tests/AdminSupplementaryUploadOutsideLock.mjs');
 runImageCli('ADMIN vinculación de imágenes de cortes fuera del lock','JS/Tests/AdminCutImageLinkOutsideLock.mjs');
 runImageCli('ADMIN preflight Drive de papelera y restauración','JS/Tests/AdminDeleteImageDrivePreflightOutsideLock.mjs');
 runImageCli('ADMIN preflight Drive de restauración desde papelera','JS/Tests/AdminRestoreImageDrivePreflightOutsideLock.mjs');
 runImageCli('ADMIN preflight Drive de protección de imagen en uso','JS/Tests/AdminMarkImageInUseDrivePreflightOutsideLock.mjs');
 runImageCli('ADMIN preflight Drive de movimiento de imágenes','JS/Tests/AdminMoveImageDrivePreflightOutsideLock.mjs');
 runImageCli('ADMIN preflight Drive de recuperación de imágenes','JS/Tests/AdminRecoverImageDrivePreflightOutsideLock.mjs');
 runImageCli('ADMIN actividad de restauración de imágenes','JS/Tests/AdminRestoreImageActivityOutsideLock.mjs');
 runImageCli('ADMIN actividad de papelera de imágenes','JS/Tests/AdminDeleteImageActivityOutsideLock.mjs');
 runImageCli('ADMIN actividad de movimiento de imágenes','JS/Tests/AdminMoveImageActivityOutsideLock.mjs');
 runImageCli('ADMIN preflight Drive de eliminación definitiva','JS/Tests/AdminPermanentDeleteDrivePreflightOutsideLock.mjs');
 runImageCli('ADMIN actividad de eliminación definitiva','JS/Tests/AdminPermanentDeleteActivityOutsideLock.mjs');
 runImageCli('ADMIN contrato del escáner de imágenes','JS/Tests/AdminImageScanLocalGuardContract.mjs');
 runImageCli('ADMIN destinos del organizador de imágenes','JS/Tests/CortesImageOrganizerTargets.mjs');
 runImageCli('ADMIN Safe Apply del organizador de imágenes','JS/Tests/CortesImageOrganizerApplyPlan.mjs');
 runImageCli('ADMIN ejecutor del organizador de imágenes y rollback','JS/Tests/CortesImageOrganizerExecutor.mjs');
 runImageCli('ADMIN ledger del organizador de imágenes','JS/Tests/CortesImageOrganizerLedger.mjs');
 runImageCli('ADMIN controles UI del organizador de imágenes','JS/Tests/CortesImageOrganizerUiContract.mjs');
 runImageCli('FEEDBACK validación de adjuntos de reportes','JS/Tests/ReportImageAttachment.js');
 runImageCli('FEEDBACK seguridad de imágenes de sugerencias','JS/Tests/SuggestionImageSecurity.js');
 runImageCli('WRITE recuperación de reparación de imágenes','JS/Tests/AdminRecoveryImageRepairFastPath.mjs');
 runImageCli('WRITE reutilización de snapshot para imágenes recuperadas','JS/Tests/AdminRecoveryImageSnapshotReuse.mjs');
});

runGroup('41','MIG017',()=>{
 const a=read('JS/Services/admin.js');
 runCli('MIG017 terminal Drive: alcance, navegación y permisos','JS/Tests/DriveTerminalScope.mjs');
 runCli('MIG017 terminal Drive: cliente move, IDs y separador whitespace','JS/Tests/DriveTerminalMoveClient.mjs');
 runCli('MIG017 respaldo Drive reanudable','JS/Tests/AdminBackupResumeUI.mjs');
 runCli('MIG017 métricas y alertas de almacenamiento Drive','JS/Tests/DriveStorageAlerts.mjs');
 recordResult('MIG017 respaldo/restauración/rollback Drive',loadFunction('JS/Tests/AdminRestoreRecovery.js','runAdminRestoreRecoveryTests')(a));
 runCli('MIG017 auditoría persistente ADMIN','JS/Tests/AdminAuditTrail.mjs');
});

runGroup('42','MIG018',()=>{
 const write=read('JS/Services/write.js'),admin=read('JS/Services/admin.js');
 recordResult('MIG018 contrato de payload y transacción de cortes',loadFunction('JS/Tests/CutPayloadValidation.js','runCutPayloadValidationTests')(write));
 recordResult('MIG018 validación autoritativa y privacidad VIN',loadFunction('JS/Tests/VinAuthoritativeValidation.js','runVinAuthoritativeValidationTests')({
  write,admin,ui:read('JS/Frontend/ui.js'),addCuts:read('HTML/add_cortes.html')
 }));
 recordResult('MIG018 integridad de información suplementaria',loadFunction('JS/Tests/AddSupplementaryInfoIntegrity.js','runAddSupplementaryInfoIntegrityTests')({
  write,admin,ui:read('JS/Frontend/ui.js')
 }));
 runCli('MIG018 ledger validado y reutilizado en aportes','JS/Tests/WriteContributionLedgerReuse.mjs');
 runCli('MIG018 flujo moderno de información suplementaria','JS/Tests/WriteSupplementaryLedgerModernFlow.mjs');
 recordResult('MIG018 contrato de rutas frontend y Coordinator',loadFunction('JS/Tests/ActionDispatchContract.js','runActionDispatchContractTests')({
  apiConfig:read('JS/Frontend/api-config.js'),AUTH:read('JS/Services/Auth.js'),CATALOG:read('JS/Services/catalog.js'),
  centralConfigurationCache:read('JS/Frontend/centralConfigurationCache.js'),
  WRITE:read('JS/Services/write.js'),FEEDBACK:read('JS/Services/feedback.js')+'\n'+read('JS/Services/InboxConversations.js'),ADMIN:read('JS/Services/admin.js'),UTILITIES:read('JS/Services/Utilities.js'),usersHtml:read('HTML/users.html'),
  consumerSources:{apiConfig:read('JS/Frontend/api-config.js'),addCortes:read('HTML/add_cortes.html'),auth:read('JS/Frontend/auth.js'),main:read('JS/Frontend/main.js'),
   pysData:read('JS/Frontend/pys-data.js'),ui:read('JS/Frontend/ui.js'),usersHtml:read('HTML/users.html'),youtubeUpload:read('JS/Frontend/youtubeUpload.js')}
 }));
 runCli('MIG018 publicación del catálogo coordinada desde frontend','JS/Tests/WriteCatalogPublicationIsolation.mjs');
 runCli('MIG018 reset WRITE autenticado desde navegador','JS/Tests/WriteCatalogPublicationFrontend.mjs');
 runCli('MIG018 append concurrente e idempotencia de aportes','JS/Tests/WriteContributionAppendConcurrency.mjs');
 runCli('MIG018 snapshot posterior y conflictos VIN','JS/Tests/WriteContributionPostAppendSnapshot.mjs');
 runCli('MIG018 recuperación durable de aportes','JS/Tests/WriteContributionRecovery.mjs');
 runCli('MIG018 recuperación UI de operaciones suplementarias','JS/Tests/AddSupplementaryOperationRecovery.mjs');
 runCli('MIG018 candidatos CATALOG de contribuciones','JS/Tests/AdminVehicleContributionCandidates.mjs');
 runCli('MIG018 resolución ADMIN append-only','JS/Tests/AdminVehicleContributionResolution.mjs');
 runCli('MIG018 publicación ADMIN coordinada desde frontend','JS/Tests/AdminCatalogPublicationIsolation.mjs');
 runCli('MIG018 proyección dirigida de campos ADMIN','JS/Tests/AdminVehicleTargetedCatalogRead.mjs');
 runCli('MIG018 inventario de imágenes de candidatos','JS/Tests/AdminCandidateImageInventoryCatalogSource.mjs');
 runCli('MIG018 superficie telemetría ADMIN','JS/Tests/AdminTrafficSurfaceContract.mjs');
 runCli('MIG018 contrato telemetría local ADMIN','JS/Tests/ServiceTrafficAdminContract.mjs');
 runCli('MIG018 proyección de aportes por vehículo','JS/Tests/VehicleContributionProjection.mjs');
 runCli('MIG018 CATALOG proyección individual y VIN globales','JS/Tests/CatalogVehicleProjectionRead.mjs');
 runCli('MIG018 CATALOG respuestas dirigidas','JS/Tests/CatalogTargetedResponses.mjs');
 runCli('MIG018 CATALOG lectura aislada de candidatos','JS/Tests/CatalogContributionReadIsolation.mjs');
 runCli('MIG018 navegación de catálogo','JS/Tests/CatalogNavigationRead.mjs');
 runCli('MIG018 dropdowns de cortes','JS/Tests/CatalogDropdownRead.mjs');
 runCli('MIG018 agrupación jerárquica de modelos','JS/Tests/SearchModelGrouping.mjs');
 runCli('MIG018 VIN AUG-050 y clasificación de versiones','JS/Tests/VinAUG050Completion.js');
 runCli('MIG018 VIN colección de navegación','JS/Tests/NavigationVinCollection.js');
 runCli('MIG018 VIN firma y persistencia','JS/Tests/VinSignaturePersistence.js');
 runCli('MIG018 VIN integridad de testigos','JS/Tests/VinTestigoIntegrityRunner.mjs');
 runCli('MIG018 VIN semántica de rangos de años','JS/Tests/VinYearRangeSemantics.js');
 runCli('MIG018 VIN resolución de contexto','JS/Tests/VinContextResolution.js');
 runCli('MIG018 VIN normalización de consultas','JS/Tests/VinQueryNormalization.js');
 runCli('MIG018 VIN umbral de muestra','JS/Tests/VinSampleThreshold.js');
 runCli('MIG018 VIN presentación de versiones','JS/Tests/VinVersionPresentation.js');
 runCli('MIG018 reservas de slots de corte','JS/Tests/AdminCutSlotReservation.mjs');
 runCli('MIG018 escritura agrupada de slots de corte','JS/Tests/WriteCutSlotBatchWrites.mjs');
 runCli('MIG018 append de cortes existentes','JS/Tests/AdminCutSlotBatchWrites.mjs');
 runCli('MIG018 preflight de corte fuera del lock','JS/Tests/WriteCutPreflightOutsideLock.mjs');
 runCli('MIG018 snapshot de vehículo en escritura de corte','JS/Tests/WriteCutExistingVehicleSnapshotReuse.mjs');
 runCli('MIG018 entidades solo bajo demanda','JS/Tests/WriteEntityCatalogDemand.mjs');
 runCli('MIG018 lookup acotado de entidades','JS/Tests/WriteEntityLookupBoundedRead.mjs');
 runCli('MIG018 asignación idempotente de IDs','JS/Tests/WriteVehicleIdAllocationIdempotency.mjs');
 runCli('MIG018 asignador de IDs con lectura acotada','JS/Tests/WriteVehicleIdAllocatorBoundedRead.mjs');
 runCli('MIG018 recuperación de asignación de ID en frontend','JS/Tests/VehicleIdAllocationEndToEnd.mjs');
 runCli('MIG018 VIN duplicados con lectura acotada','JS/Tests/AdminVinDuplicateBoundedRead.mjs');
 runCli('MIG018 snapshot de VIN reutilizado','JS/Tests/WriteVinSnapshotReuse.mjs');
 runCli('MIG018 replay idempotente de VIN','JS/Tests/WriteVinNoopPreflight.mjs');
 runCli('MIG018 edición versionada de campos de vehículo','JS/Tests/AdminVehicleFieldVersioning.mjs');
});

runGroup('43','MIG019',()=>{
 const feedback=read('JS/Services/feedback.js');
 runCli('MIG019 integridad de creación de problemas y soluciones PyS','JS/Tests/PysCreationIntegrity.js');
 runCli('MIG019 almacenamiento, compensación y recuperación de imágenes PyS','JS/Tests/PysImageStorageRecovery.js');
 runCli('MIG019 caché y sincronización incremental PyS','JS/Tests/PysDataCache.js');
 runCli('MIG019 prevención de XSS almacenado en PyS','JS/Tests/PysStoredXss.js');
 runCli('MIG019 contexto de navegación y asociación PyS','JS/Tests/PysNavigationContext.js');
 runCli('MIG019 relaciones bidireccionales vehículo-problema','JS/Tests/PysVehicleRelationIntegrity.js');
 runCli('MIG019 navegación y modal de tarjetas PyS','JS/Tests/PysModalNavigation.js');
 runCli('MIG019 título y accesibilidad del acordeón PyS','JS/Tests/PysAccordionTitleRunner.mjs');
 runCli('MIG019 lookup de problemas PyS','JS/Tests/FeedbackPysLookupBoundedRead.mjs');
 runCli('MIG019 verificación de imágenes pendientes fuera del lock','JS/Tests/FeedbackPysPendingImageVerificationOutsideLock.mjs');
 runCli('MIG019 post-commit PyS fuera del lock','JS/Tests/FeedbackPysPostCommitOutsideLock.mjs');
 runCli('MIG019 rollback de imágenes PyS','JS/Tests/FeedbackPysRollbackOutsideLock.mjs');
 runCli('MIG019 carga de imágenes PyS fuera del lock y recuperación','JS/Tests/P2PysImageUploadOutsideLock.mjs');
 runCli('MIG019 preflight y recuperación de sugerencias','JS/Tests/FeedbackSuggestionPreflightOutsideLock.mjs');
 runCli('MIG019 búsqueda dirigida de sugerencias','JS/Tests/FeedbackSuggestionLookupBoundedRead.mjs');
 runCli('MIG019 limpieza compensatoria de imágenes de sugerencias','JS/Tests/FeedbackSuggestionImageCleanupOutsideLock.mjs');
 runCli('MIG019 alta de reportes y limpieza de adjuntos','JS/Tests/FeedbackReportImageCleanupOutsideLock.mjs');
 runCli('MIG019 ledger append-only de imágenes de reportes','JS/Tests/FeedbackReportImageEvents.mjs');
 runCli('MIG019 preflight y replay de reportes','JS/Tests/FeedbackReportPreflightOutsideLock.mjs');
 runCli('MIG019 lookup acotado de reportes','JS/Tests/FeedbackReportLookupBoundedRead.mjs');
 runCli('MIG019 contacto con reserva de ID y append','JS/Tests/FeedbackContactWriteNoGlobalLock.mjs');
 runCli('MIG019 likes append-only','JS/Tests/FeedbackLikeAppendOnly.mjs');
 runCli('MIG019 idempotencia de útiles por usuario y vehículo','JS/Tests/FeedbackLikeIdempotency.mjs');
 runCli('Frontend sincroniza contador de útil con el módulo activo','JS/Tests/LikeClientCounter.js');
 runCli('Útiles alternan estado de forma idempotente en FEEDBACK','JS/Tests/FeedbackUsefulToggle.mjs');
 runCli('UI de útiles hidrata estado, contador y terminología','JS/Tests/UsefulButtonState.mjs');
 runCli('ADMIN evita lectura de ubicaciones cuando snapshot no contiene Map','JS/Tests/AdminDriveAuditReferenceLocations.mjs');
 runCli('Útiles consolidan cambios rápidos en una sola petición','JS/Tests/UsefulSyncQueue.mjs');
 runCli('MIG019 reintento silencioso de útiles concurrentes','JS/Tests/FeedbackLikeClientRetry.mjs');
  runCli('MIG019 contención del lock de útiles','JS/Tests/FeedbackLikeLockContention.mjs');
 runCli('MIG019 replay de likes completados','JS/Tests/FeedbackLikeCompletedReplayPreflight.mjs');
 runCli('MIG019 unicidad de likes bajo lock acotado','JS/Tests/FeedbackLikePreflightOutsideLock.mjs');
 runCli('MIG019 actividad de likes post-commit','JS/Tests/FeedbackLikeActivityOutsideLock.mjs');
 runCli('MIG019 append atómico de actividad','JS/Tests/ActivityLogAppendAtomic.mjs');
 runCli('MIG019 sugerencias de año y actor verificado','JS/Tests/SuggestYearCoordinatorSession.mjs');
 runCli('MIG019 umbral de votos verificados para año','JS/Tests/SuggestYearVoteThreshold.mjs');
 runCli('MIG019 aplicación append-only de año e idempotencia','JS/Tests/FeedbackYearApplicationAppendOnly.mjs');
 runCli('MIG019 read-back de aplicaciones de año','JS/Tests/FeedbackYearApplicationReadbackBounded.mjs');
 runCli('MIG019 sincronización de carpetas de año fuera del lock','JS/Tests/FeedbackYearFolderSyncOutsideLock.mjs');
 runCli('MIG019 preflight y lookup de tutoriales','JS/Tests/FeedbackTutorialPreflightOutsideLock.mjs');
 runCli('MIG019 lookup dirigido de tutoriales','JS/Tests/FeedbackTutorialLookupBoundedRead.mjs');
 runCli('MIG019 edición de tutorial por título','JS/Tests/FeedbackTutorialUpdateTitleLookupBoundedRead.mjs');
 runCli('MIG019 evita escrituras cuando tutorial no cambia','JS/Tests/FeedbackTutorialUpdateNoopPreflight.mjs');
 runCli('MIG019 integridad de tutoriales e idempotencia','JS/Tests/TutorialIntegrity.js');
 runCli('MIG019 auditoría de referencias de IDs de tutorial','JS/Tests/TutorialIdReferenceAudit.mjs');
 runCli('MIG019 actualización delta-first del catálogo tutorial','JS/Tests/TutorialCatalogRefreshDeltaFirst.mjs');
 runCli('MIG019 publicación coordinada del catálogo FEEDBACK','JS/Tests/FeedbackCatalogPublicationIsolation.mjs');
});


runGroup('44','MIG020',()=>{
 const feedback=read('JS/Services/feedback.js'),inbox=read('JS/Services/InboxConversations.js');
 runCli('MIG020 conversaciones, participantes, idempotencia y auditoría','JS/Tests/InboxConversations.mjs');
 runCli('MIG020 interfaz Inbox, accesibilidad, borradores, búsqueda y sincronización','JS/Tests/InboxUi.mjs');
 runCli('MIG020 caché por sesión y paginación de conversaciones/mensajes','JS/Tests/InboxCachePagination.js');
 runCli('MIG020 lectura agrupada de eventos de imágenes de reportes','JS/Tests/FeedbackInboxImageEventBatchRead.mjs');
 recordResult('MIG020 auditoría inmutable de acciones Inbox',loadFunction('JS/Tests/InboxAuditTrail.js','runInboxAuditTrailTests','\n\nimport {')({feedback}));
 recordResult('MIG020 roles y permisos Inbox',loadFunction('JS/Tests/InboxRoleContract.js','runInboxRoleContractTests','\n\nimport {')({
  ui:read('JS/Frontend/ui.js'),feedback,inbox,usersHtml:read('HTML/users.html'),authClient:read('JS/Frontend/auth.js'),api:read('JS/Frontend/api-config.js')
 }));
 recordResult('MIG020 prevención XSS en mensajes y contenido Inbox',loadFunction('JS/Tests/InboxStoredXss.js','runInboxStoredXssTests','\n\nimport {')({
  ui:read('JS/Frontend/ui.js'),feedback
 }));
 runCli('MIG020 mensajería centralizada de operaciones Developer','JS/Tests/DeveloperOperationMessages.mjs');
});



runGroup('45','MIG021',()=>{
 runCli('MIG021 salud, identidad y clasificación de endpoints','JS/Tests/ServiceHealthContract.mjs');
 runCli('MIG-URL-003 configuración local de seis endpoints y resolución','JS/Tests/LocalApiEndpoints.mjs');
 runCli('MIG021 telemetría local ADMIN','JS/Tests/ServiceTrafficAdminContract.mjs');
 runCli('MIG021 telemetría local de servicios y navegador','JS/Tests/ServiceBrowserTrafficContract.mjs');
 runCli('MIG021 telemetría directa de servicios','JS/Tests/DirectServiceTrafficTelemetry.mjs');
 runCli('MIG021 auditoría de enrutamiento y atribución','JS/Tests/DirectTrafficRoutingCoverage.mjs');
 runCli('MIG021 superficie ADMIN de métricas','JS/Tests/AdminTrafficSurfaceContract.mjs');
 runCli('MIG021 telemetría de catálogo','JS/Tests/CatalogTrafficTelemetry.mjs');
 runCli('MIG021 dashboard de actividad y contribuciones','JS/Tests/ActivityDashboardContributions.mjs');
 runCli('MIG021 indicadores y rankings del dashboard','JS/Tests/ActivityDashboardInsights.mjs');
 runCli('MIG021 seguridad XSS del dashboard','JS/Tests/ActivityDashboardStoredXss.js');
 runCli('MIG021 append atómico de actividad','JS/Tests/ActivityLogAppendAtomic.mjs');
 runCli('MIG021 retención de actividad','JS/Tests/ActivityLogRetention.mjs');
 runCli('MIG021 lecturas acotadas de actividad','JS/Tests/ActivityLogsBoundedRead.js');
 runCli('MIG021 limpieza de logs con feedback','JS/Tests/ActivityLogsClearFeedback.mjs');
 runCli('MIG021 telemetría de elementos vistos recientemente','JS/Tests/RecentlyViewedActivityTelemetry.mjs');
 runCli('MIG021 usuarios enruta a AUTH y no crea servicio USERS','JS/Tests/UsersDirectTrafficTelemetry.mjs');
 runCli('MIG021 estado de catálogo','JS/Tests/CatalogStatus.js');
 runCli('MIG021 accesibilidad del estado de conexión','JS/Tests/ConnectionStatusAccessibility.js');
 runCli('MIG021 alertas de cuota y almacenamiento Drive','JS/Tests/DriveStorageAlerts.mjs');
 runCli('MIG021 actividad de imágenes: append atómico','JS/Tests/AdminImageActivityAppendAtomic.mjs');
 runCli('MIG021 actividad de imágenes: delete fuera del lock','JS/Tests/AdminDeleteImageActivityOutsideLock.mjs');
 runCli('MIG021 actividad de imágenes: move fuera del lock','JS/Tests/AdminMoveImageActivityOutsideLock.mjs');
 runCli('MIG021 actividad de imágenes: delete permanente fuera del lock','JS/Tests/AdminPermanentDeleteActivityOutsideLock.mjs');
 runCli('MIG021 actividad de imágenes: restore fuera del lock','JS/Tests/AdminRestoreImageActivityOutsideLock.mjs');
 runCli('MIG021 actividad de likes fuera del lock','JS/Tests/FeedbackLikeActivityOutsideLock.mjs');
 runCli('MIG021 coordinación de actividad de sesión','JS/Tests/SessionActivityCoordination.mjs');
 runCli('MIG021 minimización de leases de actividad','JS/Tests/SessionActivityLeaseMinimization.mjs');
});


runGroup('46','MIG024',()=>{
 runCli('MIG-025 retirada de Coordinator y paridad de servicios','JS/Tests/CoordinatorRetirementContract.mjs');

});

runGroup('47','MIG026',()=>{
 runCli('MIG026 creación de carpeta Cortes desde configuración central','JS/Tests/AdminCentralCortesFolderConfiguration.mjs');
 runCli('MIG026 publicación versionada de rich_text_mode','JS/Tests/CentralConfigurationPublisherContract.mjs');
 runCli('MIG026 preferencia global, caché con TTL y RBAC','JS/Tests/RichTextGlobalPreference.mjs');
 runCli('MIG026 baseline del contador WRITE en ledger append-only','JS/Tests/WriteCortesIdLedgerBaseline.mjs');
 runCli('MIG026 ADMIN contador LogosMarca en ledger de reservas y lock no bloqueante','JS/Tests/LogoIdReservationLedger.mjs');
 runCli('MIG026 búsqueda estática de configuración local, URLs y secretos','JS/Tests/MIG026StaticConfigSearch.mjs');
 runCli('MIG026 privacidad de errores de autenticación y sesión','JS/Tests/AuthErrorPrivacy.mjs');
 runCli('MIG026 Safe Apply ADMIN: baseline Spreadsheet, ledger y no bloqueo entre operaciones','JS/Tests/CortesImageOrganizerLedger.mjs');
 runCli('MIG026 ADMIN guardas temporales: baseline, exclusión por recurso y TTL sin bloqueo durante Drive','JS/Tests/AdminLocalOperationGuard.mjs');
});


runGroup('48','MIG027',()=>{
 runCli('MIG027 paridad funcional: acciones, contratos, roles y controles','JS/Tests/MIG027FunctionalParity.mjs');
 // MIG-016: cobertura explícita del ciclo de carga reanudable y aprobación de vídeos.
 runCli('MIG016 cliente YouTube reanudable y persistencia local','JS/Tests/YouTubeUploadClientNode.mjs');
 runCli('MIG016 contratos frontend/backend de aprobación de vídeo','JS/Tests/VideoApprovalClientContract.mjs');
 runCli('MIG016 reserva idempotente y frontera de inicialización YouTube','JS/Tests/YouTubeInitIdempotencyBoundary.mjs');
 runCli('MIG016 integridad XSS de carga de vídeo','JS/Tests/YouTubeUploadXssIntegrityCli.mjs');
 runCli('MIG016 refresco de catálogo tras aprobación','JS/Tests/VideoApprovalCatalogRefreshFrontend.mjs');
 // MIG-022: acciones administrativas de Spreadsheet.
 runCli('MIG022 contratos de creación de hojas y columnas','JS/Tests/AdminSheetActionsContract.mjs');
 // MIG-023: feed, reset, arranque del catálogo y salida imprimible.
 runCli('MIG023 feed incremental y cursor del catálogo','JS/Tests/CatalogChangeFeed.mjs');
 runCli('MIG023 reset de catálogo y recuperación de caché','JS/Tests/CatalogBrowserReset.mjs');
 runCli('MIG023 integridad del arranque del catálogo','JS/Tests/CatalogStartupIntegrity.mjs');
 runCli('MIG023 contrato de paginación de ficha imprimible','JS/Tests/PrintSheetPageContract.mjs');
});



runGroup('49','MIG028',()=>{
 runCli('MIG028 seguridad, rendimiento, concurrencia y tolerancia a fallos','JS/Tests/MIG028SecurityPerformanceRegression.mjs');
});



runGroup('50','MIG029',()=>{
 runCli('MIG029 contrato de guía de despliegue Apps Script','JS/Tests/MIG029DeploymentGuideContract.mjs');
});


if(selected){
 const valid=new Set(['WRITE','ADMIN','FEEDBACK','CATALOG','UTILITIES','AUTH','INTEGRATION','MIG015','MIG017','MIG018','MIG019','MIG020','MIG021','MIG026','MIG027','MIG029','50','MIG028','49','48','39','41','42','43','44','45','47','31','32','33','34','35','36','38']);
 for(const item of selected) if(!valid.has(item)){failures.push({service:item,message:'Servicio/suite desconocido.'});totals.failed++;}
}
console.log('\nResultado de regresión de servicios: '+totals.suites+' suites; '+totals.passed+' pruebas aprobadas; '+totals.failed+' fallos de suite.');
if(failures.length){failures.forEach(x=>console.error('\n'+x.id+' '+x.service+'\n'+x.message));process.exitCode=1;}
