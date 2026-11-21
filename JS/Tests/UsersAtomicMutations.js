// AUG-130 — pruebas locales de atomicidad y concurrencia lógica de USERS.
function runUsersAtomicMutationTests(usersSource, authSource, coordinatorSource) {
    const source = String(usersSource || "");
    const auth = String(authSource || "");
    const results = [];
    let passed = 0, failed = 0;
    const assert = (condition, message) => { if (!condition) throw new Error(message || "Aserción fallida."); };
    const equal = (actual, expected, message) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(message || "Esperado " + JSON.stringify(expected) + ", recibido " + JSON.stringify(actual));
        }
    };
    const run = (name, callback) => {
        try { callback(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };
    const extract = (text, name) => {
        const start = text.indexOf("function " + name + "(");
        assert(start >= 0, "No se encontró " + name);
        const nextFunction = text.indexOf("\nfunction ", start + 10);
        const nextConstant = text.indexOf("\nconst ", start + 10);
        const candidates = [nextFunction, nextConstant].filter(index => index > start);
        const end = candidates.length ? Math.min.apply(null, candidates) : text.length;
        return text.slice(start, end);
    };
    run("USERS consume el actor central y solo localiza la fila destino al actualizar perfil", function() {
        const verifier = extract(source, "getVerifiedSession");
        const profileHandler = extract(source, "handleUpdateProfile");
        const dispatcher = extract(source, "doPost");
        assert(verifier.includes("__sharedSessionActor"), "getVerifiedSession debe exigir el actor central.");
        assert(!verifier.includes("touchSessionActivityIfDue_") && !verifier.includes("getSessionExpirationStatus_"),
            "getVerifiedSession no debe revalidar expiración ni escribir actividad en ActiveSessions.");
        assert(!verifier.includes("sessionsSheet") && !verifier.includes("COLS_ACTIVE_SESSIONS"),
            "getVerifiedSession no debe consultar ActiveSessions.");
        assert(verifier.includes("if (requireUserRow === true)") && verifier.includes("findUniqueRowsByExactValue_"),
            "La búsqueda de Users solo se permite para localizar el registro destino de updateProfile.");
        assert(profileHandler.includes("userRowIndex") && !profileHandler.includes("findUniqueUserRow_"),
            "La actualización de perfil debe reutilizar la fila destino ya localizada.");
        assert(!profileHandler.includes("withUsersMutationLock_") && profileHandler.includes("writeUserProfileNameNonBlocking_"),
            "La actualización de una sola celda no debe adquirir el ScriptLock global ni restaurar snapshots antiguos.");
        const userLock = extract(source, "withUsersMutationLock_");
        assert(userLock.includes("tryLock(0)") && !userLock.includes("waitLock("),
            "La creación de cuentas conserva exclusión fail-fast para username e ID únicos, sin espera global.");
        assert(dispatcher.includes('getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "USERS" })'),
            "getUsers debe reutilizar el actor cacheado.");
        assert(!dispatcher.includes('withSharedMutationLease_("USERS", "sessionActivity"'),
            "getUsers no debe adquirir una lease ni registrar actividad por cada lectura.");
        const usersPolicyStart = String(coordinatorSource || "").indexOf("USERS:");
        const usersPolicyEnd = String(coordinatorSource || "").indexOf("UTILITIES:", usersPolicyStart);
        const usersPolicy = String(coordinatorSource || "").slice(usersPolicyStart, usersPolicyEnd);
        assert(usersPolicyStart >= 0 && !usersPolicy.includes("sessionActivity"),
            "Coordinator no debe exponer una lease USERS de actividad para lecturas ordinarias.");
    });


    const names = [
        "normalizePassword", "normalizeUsername_", "parseUserIdSequenceFormula_", "readUsersMutationSnapshot_", "getUserIdSequencePattern_", "generateNextUserId_", "findNextUserRow_",
        "withUsersMutationLock_", "normalizeNewUserInput_", "normalizeUserProfileUpdates_",
        "findUniqueUserRow_", "writeUserRangeAtomically_", "writeUserProfileNameNonBlocking_", "handleCreateUser", "handleUpdateProfile"
    ];
    const code = "const COLS_USERS={ID:1,Nombre_Usuario:2,Password:3,Privilegios:4,Telefono:5,Correo_Electronico:6,Nombre_Completo:7,SessionToken:8,TermsAcceptance:9};\n" +
        "const SHEET_NAMES={USERS:'Users'};\n" +
        "const USERS_ALLOWED_ROLES_=Object.freeze(['Desarrollador','Jefe','Supervisor','Tecnico','Tecnico_exterior']);\n" +
        names.map(name => extract(source, name)).join("\n") +
        "\nreturn {normalizeNewUserInput_,normalizeUserProfileUpdates_,findUniqueUserRow_,findNextUserRow_,writeUserRangeAtomically_,writeUserProfileNameNonBlocking_,handleCreateUser,handleUpdateProfile,withUsersMutationLock_};";
    function fixture(options) {
        options = options || {};
        const rows = (options.rows || [
            ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"]
        ]).map(row => row.slice());
        const formulas = (options.formulas || []).map(item => ({ row:item.row, col:item.col, formula:item.formula }));
        let failSetValues = Boolean(options.failSetValuesOnce);
        let failFlush = Boolean(options.failFlushOnce);
        const sheet = {
            getLastRow() {
                let last = 1;
                for (let r=1;r<rows.length;r++) {
                    const hasValue = (rows[r] || []).some(v => v !== null && v !== undefined && String(v) !== "");
                    const hasFormula = formulas.some(f => f.row === r+1);
                    if (hasValue || hasFormula) last = r+1;
                }
                return last;
            },
            getLastColumn() { return 9; },
            getDataRange() { return this.getRange(1,1,this.getLastRow(),9); },
            getRange(row,col,numRows,numCols) {
                numRows = numRows || 1; numCols = numCols || 1;
                const getCell = (r,c) => rows[r-1] && rows[r-1][c-1] !== undefined ? rows[r-1][c-1] : "";
                const getFormula = (r,c) => {
                    const found=formulas.find(f=>f.row===r&&f.col===c);
                    return found ? found.formula : "";
                };
                return {
                    getValue() { return getCell(row,col); },
                    getValues() { return Array.from({length:numRows},(_,ri)=>Array.from({length:numCols},(_,ci)=>getCell(row+ri,col+ci))); },
                    getFormulas() { return Array.from({length:numRows},(_,ri)=>Array.from({length:numCols},(_,ci)=>getFormula(row+ri,col+ci))); },
                    setValues(values) {
                        for(let ri=0;ri<numRows;ri++) {
                            if(!rows[row+ri-1]) rows[row+ri-1]=[];
                            for(let ci=0;ci<numCols;ci++) {
                                rows[row+ri-1][col+ci-1]=values[ri][ci];
                                const index=formulas.findIndex(f=>f.row===row+ri&&f.col===col+ci);
                                if(index>=0) formulas.splice(index,1);
                            }
                        }
                        if(failSetValues) { failSetValues=false; throw new Error("setValues simulado"); }
                    },
                    setFormula(formula) {
                        const index=formulas.findIndex(f=>f.row===row&&f.col===col);
                        if(index>=0) formulas.splice(index,1);
                        formulas.push({row,col,formula});
                    },
                    getValue() { return getCell(row,col); },
                    setValue(value) {
                        this.setValues([[value]]);
                        if(options.onSetValue) options.onSetValue({row,col,value,rows});
                    },
                    copyTo() {},
                };
            },
            _rows:rows,
            _formulas:formulas
        };
        const stats = { tries:0,waits:0,releases:0,timeout:null };
        const lock = {
            tryLock(timeout) { stats.tries++; stats.timeout=timeout; return !options.lockTimeout; },
            waitLock() { stats.waits++; throw new Error("waitLock no debe usarse en USERS."); },
            releaseLock() { stats.releases++; }
        };
        const api = new Function(
            "LockService","SpreadsheetApp","getVerifiedSession","getSpreadsheet","createPasswordHash",
            code
        )(
            {getScriptLock:()=>lock},
            {CopyPasteType:{PASTE_FORMAT:"FORMAT",PASTE_DATA_VALIDATION:"VALIDATION"},flush(){if(failFlush){failFlush=false;throw new Error("flush simulado");}}},
            options.getVerifiedSession || (()=>({userId:"USR-0001",role:"Desarrollador",userRowIndex:2})),
            ()=>({getSheetByName:name=>name==="Users"?sheet:null}),
            password=>"HASH:"+password
        );
        return {api,sheet,stats};
    }
    const validUser = () => ({
        Nombre_Usuario:" instalador01 ",Password:"ClaveSegura123",Privilegios:"Tecnico",
        Telefono:"+504 9999-0000",Correo_Electronico:"instalador@example.com",Nombre_Completo:"Técnico Uno"
    });
    run("Valida y normaliza todos los campos de creación",()=>{
        const f=fixture(), normalized=f.api.normalizeNewUserInput_(validUser());
        equal([normalized.username,normalized.password,normalized.role,normalized.phone,normalized.email,normalized.fullName],
            ["instalador01","ClaveSegura123","Tecnico","+504 9999-0000","instalador@example.com","Técnico Uno"]);
    });
    run("Rechaza propiedades desconocidas, roles, tipos y formatos inválidos antes de escribir",()=>{
        const f=fixture();
        const invalid=[
            Object.assign(validUser(),{isAdmin:true}),
            Object.assign(validUser(),{Privilegios:"Administrador"}),
            Object.assign(validUser(),{Telefono:5049999}),
            Object.assign(validUser(),{Correo_Electronico:"correo-invalido"}),
            Object.assign(validUser(),{Password:"123"})
        ];
        invalid.forEach(value=>{let rejected=false;try{f.api.normalizeNewUserInput_(value);}catch(_){rejected=true;}assert(rejected);});
    });
    run("Crea la cuenta con una sola escritura contigua ID:H y confirma persistencia",()=>{
        const f=fixture();
        const result=f.api.handleCreateUser({newUser:validUser(),sessionToken:"SESSION"});
        equal(result.status,"success");
        equal(f.sheet._rows[1].slice(0,8),["USR-0001","instalador01","HASH:ClaveSegura123","Tecnico","+504 9999-0000","instalador@example.com","Técnico Uno",""]);
        equal(f.stats.tries,1);equal(f.stats.timeout,0);equal(f.stats.waits,0);equal(f.stats.releases,1);
    });
    run("Rechaza nombre de usuario duplicado sin modificar la hoja",()=>{
        const rows=[
            ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],
            ["USR-0001","instalador01","HASH:x","Tecnico","","","","",""]
        ];
        const f=fixture({rows});
        const before=JSON.stringify(f.sheet._rows);
        const result=f.api.handleCreateUser({newUser:validUser(),sessionToken:"SESSION"});
        equal(result.status,"error");equal(JSON.stringify(f.sheet._rows),before);
    });
    run("Bloquea la creación cuando existen IDs históricos duplicados",()=>{
        const rows=[
            ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],
            ["USR-0001","usuario1","HASH:x","Tecnico","","","Uno","",""],
            ["USR-0001","usuario2","HASH:y","Tecnico","","","Dos","",""]
        ];
        const f=fixture({rows});
        const before=JSON.stringify(f.sheet._rows);
        let rejected=false;try{f.api.handleCreateUser({newUser:validUser(),sessionToken:"SESSION"});}catch(_){rejected=true;}
        assert(rejected);equal(JSON.stringify(f.sheet._rows),before);equal(f.stats.releases,1);
    });
    run("Restaura valores y fórmulas de plantilla si falla la escritura de creación",()=>{
        const rows=[
            ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],
            ["","","","","","","","",""]
        ];
        const f=fixture({rows,formulas:[{row:2,col:1,formula:'=IF(B2="","",B2)'}],failSetValuesOnce:true});
        let rejected=false;try{f.api.handleCreateUser({newUser:validUser(),sessionToken:"SESSION"});}catch(_){rejected=true;}
        assert(rejected);equal(f.sheet._rows[1].slice(0,8),["","","","","","","",""]);
        equal(f.sheet._formulas,[{row:2,col:1,formula:'=IF(B2="","",B2)'}]);
        equal(f.stats.releases,1);
    });
    run("Actualiza solo Nombre_Completo tras validar sesión e ID único",()=>{
        const rows=[
            ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],
            ["USR-0001","usuario","HASH:x","Tecnico","","","Nombre anterior","",""]
        ];
        const f=fixture({rows});
        const result=f.api.handleUpdateProfile({userId:"USR-0001",updates:{Nombre_Completo:"Nombre nuevo"},sessionToken:"SESSION"});
        equal(result.status,"success");equal(f.sheet._rows[1][6],"Nombre nuevo");
        equal(f.stats.tries,0);equal(f.stats.waits,0);equal(f.stats.releases,0);
    });
    run("Una edición concurrente posterior no es sobrescrita por rollback de perfil",()=>{
        const rows=[
            ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],
            ["USR-0001","usuario","","Tecnico","","","Nombre anterior","",""]
        ];
        const f=fixture({rows,onSetValue:({row,col,rows})=>{if(row===2&&col===7)rows[1][6]="Edición concurrente";}});
        let rejected=false;
        try{f.api.handleUpdateProfile({userId:"USR-0001",updates:{Nombre_Completo:"Cambio"},sessionToken:"SESSION"});}catch(_){rejected=true;}
        assert(rejected);equal(f.sheet._rows[1][6],"Edición concurrente");
        equal(f.stats.tries,0);equal(f.stats.releases,0);
    });
    run("Rechaza campos adicionales, vacíos y tipos incorrectos en perfil",()=>{
        const f=fixture();
        const invalid=[{Password:"NuevaClave123"},{Nombre_Completo:123},{Nombre_Completo:" "},{Nombre_Completo:"x".repeat(121)},{}];
        invalid.forEach(updates=>{let rejected=false;try{f.api.normalizeUserProfileUpdates_(updates);}catch(_){rejected=true;}assert(rejected);});
    });
    run("Rechaza IDs inexistentes o duplicados sin escribir",()=>{
        const rows=[
            ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],
            ["USR-0001","usuario1","","Tecnico","","","Uno","",""],
            ["USR-0001","usuario2","","Tecnico","","","Dos","",""]
        ];
        const f=fixture({rows,getVerifiedSession:()=>{
            const matches=rows.map((row,index)=>({row,index:index+1})).filter(item=>item.row[0]==="USR-0001");
            if(matches.length!==1)throw new Error("ID de usuario ausente o duplicado.");
            return {userId:"USR-0001",role:"Tecnico",userRowIndex:matches[0].index};
        }});
        let rejected=false;try{f.api.handleUpdateProfile({userId:"USR-0001",updates:{Nombre_Completo:"Cambio"},sessionToken:"SESSION"});}catch(_){rejected=true;}
        assert(rejected);equal(f.sheet._rows[1][6],"Uno");equal(f.sheet._rows[2][6],"Dos");
    });
    run("Confirma por read-back un perfil escrito aunque flush reporte error",()=>{
        const rows=[
            ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],
            ["USR-0001","usuario","","Tecnico","","","Nombre anterior","",""]
        ];
        const f=fixture({rows,failFlushOnce:true});
        const result=f.api.handleUpdateProfile({userId:"USR-0001",updates:{Nombre_Completo:"Cambio"},sessionToken:"SESSION"});
        equal(result.status,"success");equal(f.sheet._rows[1][6],"Cambio");
        equal(f.stats.tries,0);equal(f.stats.releases,0);
    });
    run("Rechaza sesión ajena antes de escribir y sin adquirir lock",()=>{
        const rows=[
            ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],
            ["USR-0001","usuario","","Tecnico","","","Nombre anterior","",""]
        ];
        const f=fixture({rows,getVerifiedSession:()=>({userId:"USR-0002",role:"Tecnico"})});
        let rejected=false;try{f.api.handleUpdateProfile({userId:"USR-0001",updates:{Nombre_Completo:"Cambio"},sessionToken:"SESSION"});}catch(_){rejected=true;}
        assert(rejected);equal(f.sheet._rows[1][6],"Nombre anterior");
        equal(f.stats.tries,0);equal(f.stats.releases,0);
    });
    run("No reutiliza una fila que contiene fórmulas prellenadas",()=>{
        const rows=[
            ["ID","Nombre_Usuario","Password","Privilegios","Telefono","Correo_Electronico","Nombre_Completo","SessionToken","TermsAcceptance"],
            ["","","","","","","","",""]
        ];
        const f=fixture({rows,formulas:[{row:2,col:2,formula:'=IF(A2="","",A2)'}]});
        equal(f.api.findNextUserRow_(f.sheet),3);
    });
    run("La creación de cuenta falla rápido si el lock de unicidad está ocupado",()=>{
        const f=fixture({lockTimeout:true});
        let rejected=false;try{f.api.handleCreateUser({newUser:validUser(),sessionToken:"SESSION"});}catch(_){rejected=true;}
        assert(rejected);equal(f.sheet._rows.length,1);equal(f.stats.tries,1);equal(f.stats.timeout,0);
        equal(f.stats.waits,0);equal(f.stats.releases,0);
    });
    run("Solo createUser y deleteUser conservan exclusión mutua entre proyectos; demás acciones AUTH usan actor cacheado",()=>{
        const usersWrapper=extract(source,"isSharedMutationAction_");
        const authWrapper=extract(auth,"isSharedMutationAction_");
        const usersActions=new Function(usersWrapper+";return [isSharedMutationAction_('createUser'),isSharedMutationAction_('updateProfile')];")();
        const authActions=new Function(authWrapper+";return [isSharedMutationAction_('deleteUser'),isSharedMutationAction_('resetUserSessions'),isSharedMutationAction_('updateUser')];")();
        equal(usersActions,[true,false]);equal(authActions,[true,false,false]);
        assert(/withSharedMutationLease_\("USERS", action/.test(source),"createUser debe conservar la coordinación de username con AUTH/deleteUser.");
        assert(!/withSharedMutationLease_\("USERS",\s*["']updateProfile/.test(source),"updateProfile no debe adquirir lease Coordinator.");
        assert(source.includes('getCachedSharedSessionActor_(payload.userId, payload.sessionToken, { service: "USERS" })'),
            "updateProfile debe usar el actor de sesión cacheado, sin lease por acción.");
        assert(/withSharedMutationLease_\("AUTH"/.test(auth),"AUTH conserva lease únicamente para eliminación de cuenta.");
        const policySource=String(coordinatorSource||"");
        const policy=extract(policySource,"coordinatorPolicy_");
        const getPolicy=operation=>{try{return new Function(policy+";return coordinatorPolicy_('AUTH',"+JSON.stringify(operation)+");")();}catch(_){return null;}};
        const policies=new Function(policy+";return {create:coordinatorPolicy_('USERS','createUser'),remove:coordinatorPolicy_('AUTH','deleteUser'),profileDisabled:()=>{try{coordinatorPolicy_('USERS','updateProfile');return false;}catch(error){return /no está habilitada/.test(error.message);}}};")();
        const conflicts=(left,right)=>left.maintenance||right.maintenance||
            left.writeResources.some(resource=>right.readResources.includes(resource)||right.writeResources.includes(resource))||
            left.readResources.some(resource=>right.writeResources.includes(resource));
        assert(conflicts(policies.create,policies.remove),"createUser debe serializarse únicamente con deleteUser para evitar reutilizar un username mientras se desactiva la cuenta.");
        assert(getPolicy("resetUserSessions") === null,"resetUserSessions no debe reservar recursos mediante lease.");
        assert(getPolicy("updateUser") === null,"updateUser debe usar actor cacheado y su lock local.");
        assert(policies.profileDisabled(),"updateProfile no debe tener política de lease en Coordinator.");
    });
    return {passed,failed,total:passed+failed,results};
}
