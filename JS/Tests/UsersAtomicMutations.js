// MIG-012 — pruebas locales de gestión de usuarios integrada en AUTH.
function runUsersAtomicMutationTests(authSource, coordinatorSource) {
    const source = String(authSource || ""), coordinator = String(coordinatorSource || "");
    const results = []; let passed = 0, failed = 0;
    const assert = (v,m) => { if (!v) throw new Error(m || "Aserción fallida."); };
    const equal = (a,b,m) => { if (JSON.stringify(a)!==JSON.stringify(b)) throw new Error(m || ("Esperado "+JSON.stringify(b)+", recibido "+JSON.stringify(a))); };
    const run = (name, fn) => { try { fn(); passed++; results.push({name,status:"PASS"}); } catch(e) { failed++; results.push({name,status:"FAIL",message:String(e.message||e)}); } };
    const extract = name => {
        const start=source.indexOf("function "+name+"("); assert(start>=0,"No se encontró "+name);
        const candidates=[source.indexOf("\nfunction ",start+10),source.indexOf("\nconst ",start+10)].filter(x=>x>start);
        return source.slice(start,candidates.length?Math.min(...candidates):source.length);
    };
    run("AUTH expone las tres acciones y obtiene actor local cacheado",()=>{
        const start=source.indexOf("function doPost(e)"),end=source.indexOf("\nfunction handleGetPublicConfiguration_",start);
        const router=source.slice(start,end);
        assert(router.includes('"getUsers", "createUser", "updateProfile"'));
        assert(router.includes('{ service: "AUTH" }'));
        assert(!extract("isSharedMutationAction_").includes('"createUser"'));
        assert(router.includes('withSharedMutationLease_("AUTH", action'));
        for(const action of ["getUsers","createUser","updateProfile"]) assert(source.includes("case '"+action+"'"),"Falta dispatcher "+action);
        assert(source.includes("function getAuthUserActor_("));
        assert(source.includes("function requireSharedAuthActor_("));
    });
    run("No queda endpoint ni política independiente USERS",()=>{
        assert(!/withSharedMutationLease_\("USERS"/.test(source));
        assert(!/USERS:\s*\{\s*createUser/.test(coordinator));
        assert(!/const targets = \["USERS"/.test(coordinator));
        assert(/const targets = \["WRITE", "FEEDBACK", "ADMIN"\]/.test(coordinator));
    });
    const names=[
        "getAuthUsersSpreadsheet_","getAuthUserActor_","findUniqueRowsByExactValue_","isActiveUserRecord","handleGetUsers",
        "parseUserIdSequenceFormula_","readUsersMutationSnapshot_","getUserIdSequencePattern_","generateNextUserId_","findNextUserRow_",
        "normalizeUsername_","withUsersMutationLock_","normalizeNewUserInput_","normalizeUserProfileUpdates_","findUniqueUserRow_",
        "writeUserRangeAtomically_","writeUserProfileNameNonBlocking_","handleCreateUser","handleUpdateProfile"
    ];
    const constLine=source.match(/^const USERS_ALLOWED_ROLES_ = .*;$/m);
    assert(constLine,"No existe matriz de roles para alta de usuarios.");
    const code=[
        constLine[0],
        extract("normalizePassword"),
        names.map(extract).join("\n")
    ].join("\n");
    function fixture(options={}) {
        const rows=(options.rows||[["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"]]).map(r=>r.slice());
        const formulas=(options.formulas||[]).map(x=>({...x}));
        let failSet=!!options.failSetValuesOnce,failFlush=!!options.failFlushOnce;
        const cell=(r,c)=>rows[r-1]?.[c-1]??"";
        const formula=(r,c)=>formulas.find(x=>x.row===r&&x.col===c)?.formula||"";
        const sheet={
            getLastRow(){let last=1;for(let r=1;r<rows.length;r++){if((rows[r]||[]).some(v=>String(v??"")!=="")||formulas.some(f=>f.row===r+1))last=r+1;}return last;},
            getLastColumn(){return 9;},
            getRange(row,col,nr=1,nc=1){
                const values=()=>Array.from({length:nr},(_,r)=>Array.from({length:nc},(_,c)=>cell(row+r,col+c)));
                const formulasNow=()=>Array.from({length:nr},(_,r)=>Array.from({length:nc},(_,c)=>formula(row+r,col+c)));
                return {
                    getValue:()=>cell(row,col),getValues:values,getFormulas:formulasNow,
                    setValues(v){for(let r=0;r<nr;r++){if(!rows[row+r-1])rows[row+r-1]=[];for(let c=0;c<nc;c++){rows[row+r-1][col+c-1]=v[r][c];const k=formulas.findIndex(f=>f.row===row+r&&f.col===col+c);if(k>=0)formulas.splice(k,1);}}if(failSet){failSet=false;throw new Error("setValues simulado");}},
                    setFormula(v){const k=formulas.findIndex(f=>f.row===row&&f.col===col);if(k>=0)formulas.splice(k,1);formulas.push({row,col,formula:v});},
                    setValue(v){this.setValues([[v]]);if(options.onSetValue)options.onSetValue({row,col,value:v,rows});},
                    clearContent(){this.setValue("");},copyTo(){}
                };
            },_rows:rows,_formulas:formulas
        };
        const stats={tries:0,releases:0,waits:0,timeout:null};
        const lock={tryLock(t){stats.tries++;stats.timeout=t;return !options.lockTimeout;},waitLock(){stats.waits++;throw new Error("waitLock no debe usarse");},releaseLock(){stats.releases++;}};
        const actor=options.actor||{userId:"USR-0001",role:"desarrollador",epoch:1};
        const api=new Function("SPREADSHEET_ID","SHEET_NAMES","COLS_USERS","normalizeUserId","requireSharedAuthActor_","SpreadsheetApp","LockService","createPasswordHash",code+"\nreturn {"+names.join(",")+"};")(
            "ISOLATED",{USERS:"Users"},{ID:1,Nombre_Usuario:2,Password:3,Privilegios:4,Telefono:5,Correo_Electronico:6,Nombre_Completo:7,SessionToken:8,TermsAcceptance:9},
            v=>String(v??"").trim(),
            (payload,roles)=>{if(!actor||!roles.includes(actor.role))throw new Error("Acceso denegado");return actor;},
            {CopyPasteType:{PASTE_FORMAT:1,PASTE_DATA_VALIDATION:2},openById:()=>({getSheetByName:n=>n==="Users"?sheet:null}),flush(){if(failFlush){failFlush=false;throw new Error("flush simulado");}}},
            {getScriptLock:()=>lock},p=>"HASH:"+p
        );
        return {api,sheet,stats};
    }
    const validUser=()=>({Nombre_Usuario:" instalador01 ",Password:"ClaveSegura123",Privilegios:"Tecnico",Telefono:"+504 9999-0000",Correo_Electronico:"instalador@example.com",Nombre_Completo:"Técnico Uno"});
    run("Normaliza campos de creación y conserva los seis campos públicos",()=>{
        const f=fixture(),v=f.api.normalizeNewUserInput_(validUser());
        equal([v.username,v.password,v.role,v.phone,v.email,v.fullName],["instalador01","ClaveSegura123","Tecnico","+504 9999-0000","instalador@example.com","Técnico Uno"]);
    });
    run("Rechaza propiedades desconocidas, roles y datos inválidos",()=>{
        const f=fixture(),bad=[{...validUser(),isAdmin:true},{...validUser(),Privilegios:"Administrador"},{...validUser(),Telefono:123},{...validUser(),Correo_Electronico:"bad"},{...validUser(),Password:"123"}];
        for(const v of bad)assert((()=>{try{f.api.normalizeNewUserInput_(v);return false;}catch(_){return true;}})());
    });
    run("Crea usuario con ID secuencial, hash actual y una escritura contigua",()=>{
        const f=fixture(),result=f.api.handleCreateUser({userId:"USR-0001",sessionToken:"SESSION",newUser:validUser()});
        equal(result.status,"success");equal(f.sheet._rows[1].slice(0,8),["USR-0001","instalador01","HASH:ClaveSegura123","Tecnico","+504 9999-0000","instalador@example.com","Técnico Uno",""]);
        equal([f.stats.tries,f.stats.timeout,f.stats.waits,f.stats.releases],[1,0,0,1]);
    });
    run("Rechaza username duplicado sin alterar datos",()=>{
        const rows=[["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],["USR-0001","instalador01","HASH:x","Tecnico","","","","",""]];
        const f=fixture({rows}),before=JSON.stringify(f.sheet._rows),r=f.api.handleCreateUser({userId:"USR-0001",sessionToken:"SESSION",newUser:validUser()});
        equal(r.status,"error");equal(JSON.stringify(f.sheet._rows),before);
    });
    run("Rollback restaura valores y fórmulas si falla la escritura",()=>{
        const rows=[["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],["","","","","","","","",""]];
        const f=fixture({rows,formulas:[{row:2,col:1,formula:'=IF(B2="","",B2)'}],failSetValuesOnce:true});
        assert((()=>{try{f.api.handleCreateUser({userId:"USR-0001",sessionToken:"SESSION",newUser:validUser()});return false;}catch(_){return true;}})());
        equal(f.sheet._rows[1].slice(0,8),["","","","","","","",""]);
        equal(f.sheet._formulas,[{row:2,col:1,formula:'=IF(B2="","",B2)'}]);
    });
    run("Actualiza únicamente perfil propio, con búsqueda de ID dirigida y sin lock",()=>{
        const rows=[["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],["USR-0001","ana","HASH:x","Tecnico","","","Nombre anterior","",""]];
        const f=fixture({rows}),r=f.api.handleUpdateProfile({userId:"USR-0001",sessionToken:"SESSION",updates:{Nombre_Completo:"Nombre nuevo"}});
        equal(r.status,"success");equal(f.sheet._rows[1][6],"Nombre nuevo");equal(f.stats.tries,0);
    });
    run("Rechaza modificación de perfil de otra cuenta",()=>{
        const rows=[["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],["USR-0001","ana","HASH:x","Tecnico","","","Nombre anterior","",""]];
        const f=fixture({rows,actor:{userId:"USR-0002",role:"tecnico",epoch:1}});
        assert((()=>{try{f.api.handleUpdateProfile({userId:"USR-0001",sessionToken:"SESSION",updates:{Nombre_Completo:"Cambio"}});return false;}catch(_){return true;}})());
        equal(f.sheet._rows[1][6],"Nombre anterior");
    });
    run("Jefe no puede crear usuarios fuera de su jerarquía",()=>{
        const f=fixture({actor:{userId:"USR-0001",role:"jefe",epoch:1}});
        assert((()=>{try{f.api.handleCreateUser({userId:"USR-0001",sessionToken:"SESSION",newUser:{...validUser(),Privilegios:"Desarrollador"}});return false;}catch(_){return true;}})());
        equal(f.sheet._rows.length,1);
    });
    run("updateProfile rechaza cambios de privilegios y otros campos no permitidos",()=>{
        const f=fixture();
        assert((()=>{try{f.api.normalizeUserProfileUpdates_({Privilegios:"Desarrollador"});return false;}catch(_){return true;}})());
        assert((()=>{try{f.api.normalizeUserProfileUpdates_({Nombre_Completo:"Válido",Password:"NuevaClave123"});return false;}catch(_){return true;}})());
    });
    run("Rechaza IDs de perfil duplicados sin escribir",()=>{
        const rows=[["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],["USR-0001","ana","","Tecnico","","","Uno","",""],["USR-0001","beto","","Tecnico","","","Dos","",""]];
        const f=fixture({rows});
        assert((()=>{try{f.api.handleUpdateProfile({userId:"USR-0001",sessionToken:"SESSION",updates:{Nombre_Completo:"Cambio"}});return false;}catch(_){return true;}})());
        equal(f.sheet._rows[1][6],"Uno");equal(f.sheet._rows[2][6],"Dos");
    });
    run("getUsers mantiene el filtrado jerárquico por rol",()=>{
        const rows=[["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],
            ["1","dev","","Desarrollador","","","Dev","",""],["2","jefe","","Jefe","","","Jefe","",""],["3","sup","","Supervisor","","","Sup","",""],["4","tec","","Tecnico","","","Tec","",""],["5","ext","","Tecnico_exterior","","","Ext","",""]];
        const f=fixture({rows,actor:{userId:"USR-0001",role:"jefe",epoch:1}});
        const r=f.api.handleGetUsers({userId:"USR-0001",sessionToken:"SESSION"});
        equal(r.users.map(x=>x.ID),["3","4"]);
        assert(!r.users.some(x=>"Password" in x||"SessionToken" in x));
    });
    run("El actor no puede ser sustituido por un userId enviado por el navegador",()=>{
        const f=fixture({actor:{userId:"USR-0002",role:"desarrollador",epoch:1}});
        assert((()=>{try{f.api.getAuthUserActor_({userId:"USR-0001"},["desarrollador"],"test");return false;}catch(_){return true;}})());
    });
    run("La creación falla rápido si el lock local está ocupado",()=>{
        const f=fixture({lockTimeout:true});
        assert((()=>{try{f.api.handleCreateUser({userId:"USR-0001",sessionToken:"SESSION",newUser:validUser()});return false;}catch(_){return true;}})());
        equal([f.stats.tries,f.stats.timeout,f.stats.waits,f.stats.releases],[1,0,0,0]);
    });
    return {passed,failed,total:passed+failed,results};
}
