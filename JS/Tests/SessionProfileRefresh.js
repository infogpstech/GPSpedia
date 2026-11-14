function runSessionProfileRefreshTests(sources) {
 const services=[['AUTH operativo',sources.auth],['AUTH de pruebas',sources.testAuth]],client=String(sources.client||'');
 const results=[];let passed=0,failed=0;
 const assert=(v,m)=>{if(!v)throw Error(m||'Aserción fallida');},equal=(a,b,m)=>{if(a!==b)throw Error(m||'Esperado '+b+', recibido '+a);};
 const run=(name,fn)=>{try{fn();passed++;results.push({name,status:'PASS'});}catch(e){failed++;results.push({name,status:'FAIL',message:String(e.message||e)});}};
 const extract=(s,n,end)=>{const i=s.indexOf('function '+n+'(');assert(i>=0,'No se encontró '+n);const j=end?s.indexOf(end,i+10):s.indexOf('\nfunction ',i+10);assert(!end||j>i,'No se encontró cierre '+n);return s.slice(i,j>i?j:s.length).trim();};
 const uc={ID:1,Nombre_Usuario:2,Password:3,Privilegios:4,Telefono:5,Correo_Electronico:6,Nombre_Completo:7,SessionToken:8,TermsAcceptance:9},sc={ID_Usuario:1,Usuario:2,ActiveSessions:3,date:4,Logs:5,LastActivityAt:6,SessionTermsAcceptance:7};
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const active=r=>Boolean(r&&String(r[1]||'').trim()&&!String(r[1]||'').startsWith('__deleted__:')&&['desarrollador','gefe','jefe','supervisor','tecnico','tecnico_exterior'].includes(norm(r[3])));
 function server(source,o={}) {
  const users=[['ID','Usuario','Password','Privilegios','Telefono','Correo','Nombre','Token','Terms'],...(o.users||[['U1','user1','HASH','Tecnico','1111','old@test','Old name','token-1','{"version":"2026-07","acceptedAt":"2026-11-01","status":"accepted"}']]).map(r=>r.slice())];
  const sessions=[['ID','Usuario','Token','Date','Logs','LastActivity','SessionTermsAcceptance'],...(o.sessions||[['U1','user1','token-1',new Date('2026-11-01T10:00:00Z'),'','2026-11-01T10:00:00Z','{"version":"2026-07","acceptedAt":"2026-11-01","status":"accepted"}']]).map(r=>r.slice())];
  const sheet=rows=>({getDataRange:()=>({getValues:()=>rows.map(r=>r.slice())}),getRange:(r,c)=>({getValue:()=>rows[r-1][c-1],setValue:v=>{rows[r-1][c-1]=v;}})});
  const us=sheet(users),ss=sheet(sessions),deps={
   LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},
   SpreadsheetApp:{openById:()=>({getSheetByName:n=>n==='Users'?us:n==='ActiveSessions'?ss:null}),flush:()=>{}},
   SPREADSHEET_ID:'ISOLATED_TEST_ONLY',SHEET_NAMES:{USERS:'Users',ACTIVE_SESSIONS:'ActiveSessions'},COLS_USERS:uc,COLS_ACTIVE_SESSIONS:sc,
   normalizeUserId:v=>String(v??'').trim(),isActiveAuthUserRecord:active,hasPendingRoleRevocation_:()=>o.pending===true,reconcileRoleRevocationUnderLock_:()=>({pending:false}),
   getSessionExpirationStatus_:r=>({expired:false,createdAt:new Date(r[3])}),ensureActiveSessionsActivityColumn_:()=>{},ensureSessionTermsAcceptanceColumn_:()=>{},ensureTermsAcceptanceColumn_:()=>{},
   parseTermsAcceptance_:v=>JSON.parse(String(v)),revokeLoginRequestForTokenUnderLock_:()=>({pending:false})
  };
  const fn=new Function(...Object.keys(deps),extract(source,'validateAndTouchSession_')+'\nreturn validateAndTouchSession_;')(...Object.values(deps));
  return (token,id)=>fn(token,id);
 }
 services.forEach(([label,source])=>{
  run(label+': devuelve perfil actual de Users',()=>{const r=server(source,{users:[['U1','user1','HASH','Supervisor','2222','new@test','Updated name','token-1','{"version":"2026-07","acceptedAt":"2026-11-01","status":"accepted"}']]})('token-1','U1');equal(r.valid,true);equal(r.profile.ID,'U1');equal(r.profile.Nombre_Completo,'Updated name');equal(r.profile.Privilegios,'Supervisor');equal(r.profile.Telefono,'2222');equal(r.profile.Correo_Electronico,'new@test');});
  run(label+': usa la aceptación de la sesión y no la aceptación global del usuario',()=>{const r=server(source,{users:[['U1','user1','HASH','Tecnico','','','Name','token-1','{"version":"2026-07","acceptedAt":"2026-11-01","status":"accepted"}']],sessions:[['U1','user1','token-1',new Date('2026-11-01T10:00:00Z'),'','2026-11-01T10:00:00Z',''] ]})('token-1','U1');equal(r.valid,true);equal(r.termsAcceptance.status,'pending');});
  run(label+': no expone contraseña ni token',()=>{const r=server(source)('token-1','U1');equal(r.valid,true);assert(!('Password'in r.profile)&&!('SessionToken'in r.profile)&&!('sessionToken'in r));});
  run(label+': rechaza ID solicitado distinto al token',()=>{const r=server(source)('token-1','U2');equal(r.valid,false);assert(!r.profile);});
  run(label+': rechaza ID de usuario duplicado',()=>{const r=server(source,{users:[['U1','one','HASH','Tecnico','','','One','token-1','{}'],['U1','two','HASH','Supervisor','','','Two','token-1','{}']]})('token-1','U1');equal(r.valid,false);assert(!r.profile);});
  run(label+': no devuelve perfil con revocación pendiente',()=>{const r=server(source,{pending:true})('token-1','U1');equal(r.valid,false);assert(!r.profile);});
 });
 const values=new Map(),storage={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
 let state={currentUser:null};const helpers=[extract(client,'readStoredSession'),extract(client,'sameSession'),extract(client,'isCurrentSession'),extract(client,'isSessionProfileForUser_'),extract(client,'persistSessionValidation','\nasync function validateSessionCoordinated')].join('\n');
 const api=new Function('localStorage','SESSION_KEY','setState','getState','console',helpers+'\nreturn {persistSessionValidation};')(storage,'gpsepedia_session',p=>{state={...state,...p};},()=>state,{warn:()=>{}});
 const user={ID:'U1',Nombre_Usuario:'user1',Nombre_Completo:'Old name',Privilegios:'Tecnico',Telefono:'1111',Correo_Electronico:'old@test',SessionToken:'token-1',SessionCreatedAt:'2026-10-01',SessionLastActivityAt:'2026-11-01'};
 run('Actualiza perfil persistido y estado en memoria',()=>{storage.setItem('gpsepedia_session',JSON.stringify(user));state={currentUser:{...user}};const u=api.persistSessionValidation(user,{valid:true,createdAt:'2026-10-01',lastActivityAt:'2026-11-12',termsAcceptance:{status:'accepted'},profile:{ID:'U1',Nombre_Completo:'Remote name',Privilegios:'Supervisor',Telefono:'2222',Correo_Electronico:'new@test'}});equal(u.Nombre_Completo,'Remote name');equal(u.Privilegios,'Supervisor');equal(state.currentUser.Privilegios,'Supervisor');equal(JSON.parse(storage.getItem('gpsepedia_session')).Correo_Electronico,'new@test');});
 run('No acepta perfil con identidad de otra cuenta',()=>{storage.setItem('gpsepedia_session',JSON.stringify(user));state={currentUser:{...user}};const before=storage.getItem('gpsepedia_session');equal(api.persistSessionValidation(user,{valid:true,profile:{ID:'U2',Nombre_Completo:'Intruder'}}),undefined);equal(storage.getItem('gpsepedia_session'),before);});
 run('Ignora respuesta tardía tras cambio de cuenta/token',()=>{const other={...user,ID:'U2',SessionToken:'token-2'};storage.setItem('gpsepedia_session',JSON.stringify(other));state={currentUser:other};const before=storage.getItem('gpsepedia_session');equal(api.persistSessionValidation(user,{valid:true,profile:{ID:'U1',Nombre_Completo:'Stale'}}),undefined);equal(storage.getItem('gpsepedia_session'),before);});
 run('Copia solo campos permitidos y conserva token local',()=>{storage.setItem('gpsepedia_session',JSON.stringify(user));state={currentUser:{...user}};const u=api.persistSessionValidation(user,{valid:true,profile:{ID:'U1',Nombre_Completo:'New',Privilegios:'Gefe',SessionToken:'fake',Password:'secret'}});equal(u.SessionToken,'token-1');assert(!('Password'in u));equal(u.Privilegios,'Gefe');});
 run('Rechaza perfil sin ID y validación inválida',()=>{storage.setItem('gpsepedia_session',JSON.stringify(user));state={currentUser:{...user}};const before=storage.getItem('gpsepedia_session');equal(api.persistSessionValidation(user,{valid:true,profile:{Nombre_Completo:'No ID'}}),undefined);equal(storage.getItem('gpsepedia_session'),before);equal(api.persistSessionValidation(user,{valid:false,profile:{ID:'U1',Nombre_Completo:'Untrusted'}}),undefined);});
 run('Revocación de rol conserva logout y reautenticación',()=>{const f=extract(client,'validateActiveSession','\nexport async function checkSession');assert(f.includes('result.valid === false')&&f.includes("logout('Tu sesión ya no está vigente. Inicia sesión nuevamente.', user)"));assert(services[0][1].includes('hasPendingRoleRevocation_(userId)')&&services[0][1].includes("reason: 'role_changed_reauthentication_required'"));});
 run('TTL de validación limitado a diez segundos y ligado a sesión',()=>{assert(client.includes('const VALIDATION_CACHE_TTL_MS = 10000'));const f=extract(client,'getRecentValidation');assert(f.includes('sameSession(latest,user)')&&f.includes('Date.now()-validatedAt<VALIDATION_CACHE_TTL_MS'));});

 run('Valida que el perfil pertenezca al ID de la sesión',()=>{const f=extract(client,'isSessionProfileForUser_');const check=new Function(f+'\nreturn isSessionProfileForUser_;')();equal(check(user,{ID:'U1',Privilegios:'Tecnico'}),true);equal(check(user,{ID:'U2',Privilegios:'Desarrollador'}),false);equal(check(user,null),false);});
 run('Rechaza respuesta válida cuyo perfil pertenece a otra cuenta',()=>{const i=client.indexOf('async function validateSessionCoordinated('),j=client.indexOf('\nfunction loadUserLocalActivity',i);assert(i>=0&&j>i);const f=client.slice(i,j);assert(f.includes("Object.prototype.hasOwnProperty.call(result,'profile')"));assert(f.includes("reason:'profile_identity_mismatch'"));assert(f.indexOf("reason:'profile_identity_mismatch'")<f.indexOf('persistSessionValidation(user,result)'));});
 return {status:failed?'FAIL':'PASS',passed,failed,results};
}
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const result=runSessionProfileRefreshTests({auth:readFileSync(resolve(root,'Services/Auth.js'),'utf8'),testAuth:readFileSync(resolve(root,'Services/Test/Auth.js'),'utf8'),client:readFileSync(resolve(root,'auth.js'),'utf8')});
result.results.forEach(r=>console.log(r.status+' '+r.name+(r.message?' — '+r.message:'')));
console.log('AUG-118: '+result.passed+'/'+(result.passed+result.failed)+' pruebas aprobadas.');
if(result.failed)process.exitCode=1;
