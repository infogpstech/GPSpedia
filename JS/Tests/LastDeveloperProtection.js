// AUG-117 — protección de última cuenta Desarrollador y limpieza de sesiones.
function runLastDeveloperProtectionTests(sources) {
    const auth=String(sources.auth||''),html=String(sources.html||'');
    const results=[];let passed=0,failed=0;
    const assert=(v,m)=>{if(!v)throw new Error(m||'Aserción fallida');};
    const equal=(a,b,m)=>{if(a!==b)throw new Error(m||'Esperado '+b+', recibido '+a);};
    const run=(name,fn)=>{try{fn();passed++;results.push({name,status:'PASS'});}catch(e){failed++;results.push({name,status:'FAIL',message:String(e.message||e)});}};
    const extract=(src,name,endMarker)=>{const s=src.indexOf('function '+name+'(');assert(s>=0,'No se encontró '+name);const e=endMarker?src.indexOf(endMarker,s):src.indexOf('\nfunction ',s+10);assert(!endMarker||e>s,'No se encontró fin de '+name);return src.slice(s,e>s?e:src.length).trim();};
    const normalize=v=>{const role=String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();return role==='gefe'?'jefe':role;};
    const active=row=>Boolean(row&&String(row[1]||'').trim()&&!String(row[1]).startsWith('__deleted__:')&&['desarrollador','jefe','supervisor','tecnico','tecnico_exterior'].includes(normalize(row[3])));
    const userCols={ID:1,Nombre_Usuario:2,Password:3,Privilegios:4,Telefono:5,Correo_Electronico:6,Nombre_Completo:7,SessionToken:8,TermsAcceptance:9};
    const sessionCols={ID_Usuario:1,Usuario:2,ActiveSessions:3,date:4,Logs:5,LastActivityAt:6};
    const helper=extract(auth,'countActiveDevelopers_');
    const count=new Function('COLS_USERS','isActiveAuthUserRecord','normalizeRoleName',helper+'\nreturn countActiveDevelopers_;')(userCols,active,normalize);
    const makeHarness=(userRows,sessionRows,failOnce=false,failNameWriteOnce=false)=>{
        let failNameWrite=Boolean(failNameWriteOnce);
        const users=[['ID','Usuario','Password','Privilegios','Telefono','Correo','Nombre','SessionToken','Terms'],...userRows.map(r=>r.slice())];
        const sessions=[['ID','Usuario','Token','Date','Logs','LastActivity'],...sessionRows.map(r=>r.slice())];let fail=failOnce;
        const makeSheet=(rows,isSessions)=>({
            getDataRange:()=>({getValues:()=>rows.map(r=>r.slice())}),
            getLastRow:()=>rows.length,
            getRange:(row,col)=>({
                setValues:values=>values.forEach((r,i)=>r.forEach((v,j)=>rows[row-1+i][col-1+j]=v)),
                setValue:value=>{rows[row-1][col-1]=value;},
                getValue:()=>rows[row-1][col-1],
                clearContent:()=>{rows[row-1][col-1]='';}
            }),
            deleteRow:row=>{if(isSessions&&fail){fail=false;throw new Error('Fallo simulado al eliminar fila');}rows.splice(row-1,1);},
            _rows:rows
        });
        const usersSheet=makeSheet(users,false),sessionsSheet=makeSheet(sessions,true),logs=[];
        const context={
            SPREADSHEET_ID:'TEST',SHEET_NAMES:{USERS:'Users',ACTIVE_SESSIONS:'ActiveSessions'},
            ROLE_REVOCATION_SHARED_PREFIX:'__role_revocation_pending__:',
            COLS_USERS:userCols,COLS_ACTIVE_SESSIONS:sessionCols,
            normalizeUserId:v=>String(v===null||v===undefined?'':v).trim(),
            normalizeRoleName:normalize,isActiveAuthUserRecord:active,countActiveDevelopers_:count,
            getSessionExpirationStatus_:()=>({expired:false}),assertRequesterRoleRevocationClear_:()=>{},
            hasPendingRoleRevocation_:()=>false,revokePendingLoginRequestsForUserUnderLock_:()=>({pending:false}),
            roleRevocationPropertyKey_:id=>'role:'+id,
            parseSharedRoleRevocationMarker_:value=>{const raw=String(value||'');if(!raw.startsWith('__role_revocation_pending__:'))return null;try{return JSON.parse(raw.slice('__role_revocation_pending__:'.length));}catch(_){return{invalid:true};}},
            parseRoleRevocationMarker_:raw=>{try{return JSON.parse(raw);}catch(_){return{invalid:true};}},
            sameRoleRevocationMarker_:(a,b)=>a.userId===b.userId&&a.oldRole===b.oldRole&&a.newRole===b.newRole&&a.markedAt===b.markedAt&&a.newFullName===b.newFullName,
            reconcileRoleRevocationUnderLock_:(us,ss,id)=>{
                const row=us._rows.find(r=>String(r[0])===String(id));
                const marker=String(row[7]||''),data=JSON.parse(marker.slice(marker.indexOf('{')));
                row[3]=data.newRole;
                if(Object.prototype.hasOwnProperty.call(data,'newFullName')){
                    if(failNameWrite){failNameWrite=false;return{revokedSessions:0,pending:true,cleanupPending:true,error:'Fallo simulado al escribir Nombre_Completo'};}
                    row[6]=data.newFullName;
                }
                row[7]='';
                return {revokedSessions:0,pending:false,cleanupPending:false};
            },
            LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},
            SpreadsheetApp:{openById:()=>({getSheetByName:n=>n==='Users'?usersSheet:n==='ActiveSessions'?sessionsSheet:null}),flush:()=>{}},
            PropertiesService:{getScriptProperties:()=>({getProperty:()=>null,setProperty:()=>{},deleteProperty:()=>{}})},
            Utilities:{getUuid:()=>'uuid-test'},logToSheet:(...args)=>logs.push(args),console:{error:()=>{}}
        };
        const update=new Function(...Object.keys(context),extract(auth,'handleUpdateUser','\n\nconst SESSION_ABSOLUTE_MONTHS')+'\nreturn handleUpdateUser;')(...Object.values(context));
        const remove=new Function(...Object.keys(context),extract(auth,'handleDeleteUser')+'\nreturn handleDeleteUser;')(...Object.values(context));
        return {update,remove,users,sessions,logs};
    };
    run('Reconciliación real conserva el marcador y recupera nombre tras fallo de escritura',()=>{
        const helperNames=['parseRoleRevocationMarker_','parseSharedRoleRevocationMarker_','sameRoleRevocationMarker_','revokeAllUserSessionsUnderLock_','deleteRevokedSessionRowsUnderLock_','reconcileRoleRevocationUnderLock_'];
        const helperCode=helperNames.map(name=>extract(auth,name)).join('\n')+'\nreturn reconcileRoleRevocationUnderLock_;';
        const prefix='__role_revocation_pending__:';
        const markerData={userId:'T1',markedAt:123,oldRole:'Tecnico',newRole:'Supervisor',newFullName:'Nombre nuevo'};
        const markerValue=prefix+JSON.stringify(markerData);
        const users=[['ID','Usuario','Password','Privilegios','Telefono','Correo','Nombre','SessionToken','Terms'],['T1','tech','pw','Tecnico','','','Nombre anterior',markerValue,'']];
        const sessions=[['ID','Usuario','Token','Date','Logs','LastActivity'],['T1','tech','token-target',new Date(),'','']];
        const properties=new Map([['role:T1',JSON.stringify(markerData)]]);
        let failName=true,failCommitFlush=false,flushCalls=0;
        const usersSheet={
            getDataRange:()=>({getValues:()=>users.map(row=>row.slice())}),
            getRange:(row,col)=>({
                getValue:()=>users[row-1][col-1],
                setValue:value=>{if(col===7&&failName){failName=false;throw new Error('fallo nombre simulado');}users[row-1][col-1]=value;},
                clearContent:()=>{users[row-1][col-1]='';}
            })
        };
        const sessionsSheet={
            getLastRow:()=>sessions.length,getLastColumn:()=>6,
            getRange:(row,col,numRows=1,numCols=1)=>({
                getValues:()=>Array.from({length:numRows},(_,ri)=>Array.from({length:numCols},(_,ci)=>sessions[row+ri-1][col+ci-1])),
                setValues:values=>values.forEach((line,ri)=>line.forEach((value,ci)=>{sessions[row+ri-1][col+ci-1]=value;})),
                getValue:()=>sessions[row-1][col-1]
            }),
            deleteRow:row=>sessions.splice(row-1,1)
        };
        const normalizeRole=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
        const code=helperCode;
        const reconcile=new Function(
            'COLS_USERS','COLS_ACTIVE_SESSIONS','ROLE_REVOCATION_SHARED_PREFIX','PropertiesService',
            'normalizeUserId','normalizeRoleName','isActiveAuthUserRecord','roleRevocationPropertyKey_',
            'revokePendingLoginRequestsForUserUnderLock_','SpreadsheetApp',code
        )(
            userCols,sessionCols,prefix,
            {getScriptProperties:()=>({
                getProperty:key=>properties.has(key)?properties.get(key):null,
                setProperty:(key,value)=>properties.set(key,value),
                deleteProperty:key=>properties.delete(key)
            })},
            value=>String(value||'').trim(),normalizeRole,
            row=>active(row),id=>'role:'+id,
            ()=>({pending:false}),{flush:()=>{flushCalls++;if(failCommitFlush){failCommitFlush=false;throw new Error('flush final simulado');}}}
        );
        const first=reconcile(usersSheet,sessionsSheet,'T1');
        assert(first.pending,'El fallo de la segunda escritura debe dejar recuperación pendiente.');
        equal(users[1][3],'Supervisor','El rol no se aplicó; reconcile devolvió: '+JSON.stringify(first));equal(users[1][6],'Nombre anterior');
        assert(String(users[1][7]).startsWith(prefix),'El marcador compartido debe permanecer.');
        equal(sessions[1][2],'','El token debe seguir invalidado aunque falle el perfil.');
        failCommitFlush=true;
        const second=reconcile(usersSheet,sessionsSheet,'T1');
        assert(second.pending,'Un fallo de flush debe conservar el marcador incluso si el valor parece escrito: '+JSON.stringify(second)+' flushCalls='+flushCalls+' fail='+failCommitFlush);
        equal(users[1][6],'Nombre nuevo');assert(String(users[1][7]).startsWith(prefix));
        const third=reconcile(usersSheet,sessionsSheet,'T1');
        assert(!third.pending,'El segundo reintento debe completar la operación.');
        equal(users[1][6],'Nombre nuevo');equal(users[1][7],'');
        equal(sessions.length,1,'La fila de sesión revocada debe eliminarse tras recuperar.');
        assert(!properties.has('role:T1'),'El marcador local se elimina solo al confirmar el perfil y flush.');
    });
    run('Marcadores compartido y local rechazan metadatos de perfil divergentes',()=>{
        const parse=new Function('normalizeUserId','normalizeRoleName',extract(auth,'parseRoleRevocationMarker_')+'\n'+extract(auth,'sameRoleRevocationMarker_')+'\nreturn {parseRoleRevocationMarker_,sameRoleRevocationMarker_};')(
            value=>String(value||'').trim(),normalize
        );
        const base={userId:'T1',markedAt:123,oldRole:'Tecnico',newRole:'Supervisor',newFullName:'Nombre nuevo'};
        const local=Object.assign({},base,{newFullName:'Otro nombre'});
        assert(!parse.sameRoleRevocationMarker_(base,local),'No debe reconciliar dos intenciones de perfil distintas.');
        assert(parse.parseRoleRevocationMarker_(JSON.stringify(Object.assign({},base,{newFullName:123}))).invalid,'Debe rechazar metadatos de perfil inválidos.');
    });
    run('Cuenta solo Desarrolladores activos',()=>{
        equal(count([['D1','dev1','','Desarrollador'],['D2','dev2','','desarrollador'],['D3','__deleted__:x','','Desarrollador'],['T1','tech','','Tecnico']]),2);
    });
    run('Bloquea la degradación del último Desarrollador antes de escribir',()=>{
        const h=makeHarness([['D1','dev','pw','Desarrollador','','','','tok1']],[['D1','dev','tok1',new Date(),'','']]);
        let error;try{h.update({userId:'D1',updates:{Privilegios:'Jefe',Nombre_Completo:'No escribir'},sessionToken:'tok1'});}catch(e){error=e;}
        assert(error&&/última cuenta activa/.test(error.message),'No se rechazó la degradación del último Desarrollador');
        equal(h.users[1][3],'Desarrollador');equal(h.users[1][6],'','Hubo una escritura antes del rechazo');
    });
    run('Permite degradar si queda otro Desarrollador activo',()=>{
        const h=makeHarness([['D1','dev','pw','Desarrollador','','','','tok1'],['D2','dev2','pw','Desarrollador']],[['D1','dev','tok1',new Date(),'','']]);
        const result=h.update({userId:'D2',updates:{Privilegios:'Jefe'},sessionToken:'tok1'});
        equal(result.status,'success');equal(h.users[2][3],'Jefe');equal(count(h.users.slice(1)),1);
    });
    run('Recupera nombre y rol tras fallo de la segunda escritura y reintento idempotente',()=>{
        const h=makeHarness(
            [['D1','dev','pw','Desarrollador','','','','tok1'],['T1','tech','pw','Tecnico','','','Nombre anterior','', '']],
            [['D1','dev','tok1',new Date(),'',''],['T1','tech','tok2',new Date(),'','']],
            false,true
        );
        let firstError=null;
        try{h.update({userId:'T1',updates:{Privilegios:'Supervisor',Nombre_Completo:'Nombre nuevo'},sessionToken:'tok1'});}
        catch(error){firstError=error;}
        assert(firstError&&/pendiente/.test(firstError.message),'El primer intento debe reportar la recuperación pendiente.');
        equal(h.users[2][3],'Supervisor','El rol debe quedar confirmado antes de aplicar el perfil.');
        equal(h.users[2][6],'Nombre anterior','El nombre anterior debe conservarse si falla la segunda escritura.');
        assert(String(h.users[2][7]).startsWith('__role_revocation_pending__:'),'El marcador debe conservar la intención para reintentar.');
        const retry=h.update({userId:'T1',updates:{Privilegios:'Supervisor',Nombre_Completo:'Nombre nuevo'},sessionToken:'tok1'});
        equal(retry.status,'success');equal(h.users[2][3],'Supervisor');equal(h.users[2][6],'Nombre nuevo');
        equal(h.users[2][7],'','El marcador solo se limpia después de verificar ambas escrituras.');
    });
    run('Un marcador pendiente no acepta sobrescribir el perfil solicitado originalmente',()=>{
        const h=makeHarness(
            [['D1','dev','pw','Desarrollador','','','','tok1'],['T1','tech','pw','Tecnico','','','Nombre anterior','', '']],
            [['D1','dev','tok1',new Date(),'',''],['T1','tech','tok2',new Date(),'','']],
            false,true
        );
        try{h.update({userId:'T1',updates:{Privilegios:'Supervisor',Nombre_Completo:'Nombre nuevo'},sessionToken:'tok1'});}catch(_){}
        let rejected=false;
        try{h.update({userId:'T1',updates:{Privilegios:'Supervisor',Nombre_Completo:'Otro nombre'},sessionToken:'tok1'});}catch(error){rejected=/no coincide/.test(error.message);}
        assert(rejected,'No debe cambiarse el nombre asociado a una operación pendiente.');
        equal(h.users[2][6],'Nombre anterior');
    });
    run('Eliminar usuario limpia todas sus sesiones y registra auditoría',()=>{
        const h=makeHarness([['D1','dev','pw','Desarrollador','','','','tok1'],['T1','tech','pw','Tecnico','','','','tok2']],[['D1','dev','tok1',new Date(),'',''],['T1','tech','tok2',new Date(),'',''],['T1','tech','tok3',new Date(),'','']]);
        const result=h.remove({userId:'T1',sessionToken:'tok1'});
        equal(result.status,'success');equal(result.closedSessions,2);equal(h.sessions.length,2);
        assert(h.sessions.slice(1).every(row=>row[0]!=='T1'));assert(h.logs.some(row=>row[1]==='Account logically deleted in AUTH.'));
    });
    run('Permite eliminar un Desarrollador cuando otro permanece activo',()=>{
        const h=makeHarness([['D1','dev1','pw','Desarrollador','','','','tok1'],['D2','dev2','pw','Desarrollador','','','','tok2']],[['D1','dev1','tok1',new Date(),'',''],['D2','dev2','tok2',new Date(),'','']]);
        const result=h.remove({userId:'D2',sessionToken:'tok1'});
        equal(result.status,'success');equal(count(h.users.slice(1)),1);equal(h.sessions.length,2);
    });
    run('No permite eliminar la cuenta solicitante',()=>{
        const h=makeHarness([['D1','dev','pw','Desarrollador','','','','tok1']],[['D1','dev','tok1',new Date(),'','']]);
        let error;try{h.remove({userId:'D1',sessionToken:'tok1'});}catch(e){error=e;}
        assert(error&&/No puedes eliminar tu propia cuenta/.test(error.message));equal(h.sessions.length,2);equal(h.users[1][1],'dev');
    });
    run('La limpieza parcial queda desactivada y se completa al reintentar',()=>{
        const h=makeHarness([['D1','dev','pw','Desarrollador','','','','tok1'],['T1','tech','pw','Tecnico','','','','tok2']],[['D1','dev','tok1',new Date(),'',''],['T1','tech','tok2',new Date(),'','']],true);
        const first=h.remove({userId:'T1',sessionToken:'tok1'});equal(first.status,'error');equal(first.disabled,true);
        assert(String(h.users[2][1]).startsWith('__deleted__:'));
        const second=h.remove({userId:'T1',sessionToken:'tok1'});equal(second.status,'success');equal(h.sessions.length,2);
    });
    run('La UI confirma actor y objetivo al eliminar y degradar',()=>{
        assert(html.includes('Confirmar eliminación de cuenta. Actor:')&&html.includes('Confirmar cambio de privilegios. Actor:')&&html.includes('Cuenta objetivo:'));
        assert(html.includes('deleteUser(user.ID, user.Nombre_Usuario, e.currentTarget)'));
    });
    run('Ambas mutaciones usan lock y validan actor y objetivo únicos',()=>{
        const u=extract(auth,'handleUpdateUser','\n\nconst SESSION_ABSOLUTE_MONTHS'),d=extract(auth,'handleDeleteUser');
        assert(u.includes('LockService.getScriptLock()')&&d.includes('LockService.getScriptLock()'));
        assert(u.includes('requesterRows.length !== 1')&&u.includes('targetRows.length !== 1'));
        assert(d.includes('requesterRows.length !== 1')&&d.includes('targetRows.length !== 1'));
    });
    run('La protección de degradación ocurre antes de cualquier escritura de perfil',()=>{
        const u=extract(auth,'handleUpdateUser','\n\nconst SESSION_ABSOLUTE_MONTHS'),d=extract(auth,'handleDeleteUser');
        assert(u.indexOf('No se puede degradar la última cuenta')<u.indexOf('const hasFullNameUpdate'),'La validación del último Desarrollador debe preceder a toda escritura de perfil.');
        assert(d.includes("targetRole === 'desarrollador'")&&d.includes('countActiveDevelopers_(usersData.slice(1)) <= 1'));
    });
    run('AUTH verifica ausencia de sesiones residuales después de eliminar',()=>{
        const d=extract(auth,'handleDeleteUser');
        assert(d.includes('remainingSessions.length')&&d.includes('Quedaron filas de sesión asociadas'));
        assert(d.indexOf('remainingSessions.length')>d.indexOf('sessionsSheet.deleteRow'));
    });
    run('Handlers AUTH y confirmaciones UI tienen sintaxis válida',()=>{
        const update=extract(auth,'handleUpdateUser','\n\nconst SESSION_ABSOLUTE_MONTHS');
        const remove=extract(auth,'handleDeleteUser');
        const helper=extract(auth,'countActiveDevelopers_');
        const uiStart=html.indexOf('async function deleteUser(');
        const uiEnd=html.indexOf('\nasync function resetUserSessions',uiStart);
        assert(uiStart>=0&&uiEnd>uiStart,'No se encontró handler UI deleteUser');
        [update,remove,helper,html.slice(uiStart,uiEnd)].forEach((source,index)=>{try{new Function('return ('+source+');');}catch(e){throw new Error('Sintaxis '+index+': '+e.message);}});
    });
    return {status:failed===0?'PASS':'FAIL',passed,failed,results};
}

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const html=readFileSync(resolve(root,'users.html'),'utf8');
const suites=[
    ['AUTH operativo',readFileSync(resolve(root,'Services/Auth.js'),'utf8')],
    ['AUTH aislado de pruebas',readFileSync(resolve(root,'Services/Test/Auth.js'),'utf8')]
];
let totalPassed=0,totalFailed=0;
for(const [label,auth] of suites){
    const result=runLastDeveloperProtectionTests({auth,html});
    totalPassed+=result.passed;totalFailed+=result.failed;
    result.results.forEach(item=>console.log(item.status+' ['+label+'] '+item.name+(item.message?' — '+item.message:'')));
}
console.log('AUG-117: '+totalPassed+'/'+(totalPassed+totalFailed)+' pruebas aprobadas en ambos proyectos AUTH.');
if(totalFailed)process.exitCode=1;
