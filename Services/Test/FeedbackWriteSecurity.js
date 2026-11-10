// Pruebas aisladas de autorización y escrituras FEEDBACK — AUG-040.
// No utiliza deployments, Spreadsheet ni Drive reales.

function runFeedbackWriteSecurityTests() {
    const results = [];
    let passed = 0;
    let failed = 0;
    function assert_(condition, message) {
        if (!condition) throw new Error(message || "Aserción fallida.");
    }
    function expectThrow_(callback, expected) {
        let thrown = null;
        try { callback(); } catch (error) { thrown = error; }
        assert_(!!thrown, "Se esperaba que la operación fuera rechazada.");
        if (expected) assert_(String(thrown.message || thrown).includes(expected), "Error inesperado: " + String(thrown.message || thrown));
    }
    function test_(name, callback) {
        try { callback(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    }

    const oldAssert = assertFeedbackSession;
    const oldGetSpreadsheet = getSpreadsheet;
    const oldGetSafeSheet = getSafeSheet;
    const oldEnsureReportMetadataColumn = ensureReportMetadataColumn;
    const oldLog = logUserActivity;
    const oldCache = typeof CacheService === "undefined" ? null : CacheService;
    const oldLock = typeof LockService === "undefined" ? null : LockService;
    const oldSpreadsheetApp = typeof SpreadsheetApp === "undefined" ? null : SpreadsheetApp;
    const oldDriveApp = typeof DriveApp === "undefined" ? null : DriveApp;
    const oldUtilities = typeof Utilities === "undefined" ? null : Utilities;

    try {
        assertFeedbackSession = function(payload, allowedRoles) {
            if (!payload || payload.sessionToken !== "TEST_SESSION") throw new Error("Sesión inválida.");
            const actor = { userId: "USR-TEST-01", userName: "Usuario verificado", role: "Tecnico" };
            if (Array.isArray(allowedRoles) && !allowedRoles.includes(actor.role)) throw new Error("Rol no autorizado.");
            return actor;
        };

        test_("Solo getPysData y sendContactForm quedan públicos", function() {
            assert_(FEEDBACK_PUBLIC_ACTIONS.has("getPysData") && FEEDBACK_PUBLIC_ACTIONS.has("sendContactForm"));
            assert_(!FEEDBACK_PUBLIC_ACTIONS.has("recordLike") && !FEEDBACK_PUBLIC_ACTIONS.has("addProblem"));
        });
        test_("El contacto público descarta userId enviado por el cliente", function() {
            assert_(authorizeFeedbackAction_("sendContactForm", { userId: "ADMIN-FALSO" }).userId === "N/A");
        });
        test_("getPysData conserva acceso público de solo lectura", function() {
            const payload = { value: "test" };
            assert_(authorizeFeedbackAction_("getPysData", payload) === payload);
        });
        test_("Acciones no declaradas y assignCollaborator se rechazan", function() {
            expectThrow_(() => authorizeFeedbackAction_("unknownAction", {}), "no declarada");
            expectThrow_(() => authorizeFeedbackAction_("assignCollaborator", { sessionToken: "TEST_SESSION" }), "no declarada");
        });
        test_("recordLike exige sesión y sustituye identidad falsificada", function() {
            expectThrow_(() => authorizeFeedbackAction_("recordLike", { userId: "ADMIN-FALSO" }), "Sesión inválida");
            const actor = authorizeFeedbackAction_("recordLike", { sessionToken: "TEST_SESSION", userId: "ADMIN-FALSO", userName: "Falso" });
            assert_(actor.userId === "USR-TEST-01" && actor.userName === "Usuario verificado");
        });
        test_("Las escrituras PyS exigen sesión y sustituyen identidad", function() {
            ["reportProblem", "addProblem", "addSolution", "addPrevention", "suggestCutChange"].forEach(action => {
                expectThrow_(() => authorizeFeedbackAction_(action, {}), "Sesión inválida");
                const actor = authorizeFeedbackAction_(action, { sessionToken: "TEST_SESSION", userId: "FALSO", userName: "Falso" });
                assert_(actor.userId === "USR-TEST-01" && actor.userName === "Usuario verificado", action);
            });
        });
        test_("Aprobación mantiene la restricción de rol", function() {
            expectThrow_(() => authorizeFeedbackAction_("approveVideo", { sessionToken: "TEST_SESSION" }), "Rol no autorizado");
        });

        test_("El alta de tutorial usa el colaborador derivado de la sesión", function() {
            const originalAssert = assertFeedbackSession;
            const originalGetSafeSheet = getSafeSheet;
            const rows = [["Tema", "Imagen", "Video", "Descripción", "Colaborador"]];
            const sheet = {
                getLastRow: () => rows.length,
                getLastColumn: () => 5,
                getRange: (row, column, rowCount, columnCount) => ({
                    getDisplayValues: () => Array.from({ length: rowCount }, (_, r) =>
                        Array.from({ length: columnCount }, (_, c) => String((rows[row - 1 + r] || [])[column - 1 + c] || ""))),
                    getValues: () => Array.from({ length: rowCount }, (_, r) =>
                        Array.from({ length: columnCount }, (_, c) => (rows[row - 1 + r] || [])[column - 1 + c] || ""))
                }),
                appendRow: row => rows.push(row.slice())
            };
            try {
                assertFeedbackSession = function(payload, allowedRoles) {
                    if (!allowedRoles || !allowedRoles.includes("Desarrollador")) throw new Error("Rol no autorizado.");
                    return { userId: "USR-DEV", userName: "Desarrollador verificado", role: "Desarrollador" };
                };
                getSafeSheet = () => sheet;
                SpreadsheetApp = { flush: function() {} };
                const authorized = authorizeFeedbackAction_("addTutorial", {
                    sessionToken: "TEST_SESSION", userId: "ADMIN-FALSO",
                    userName: "Nombre falso", colaborador: "Colaborador falso"
                });
                handleAddTutorial({
                    ...authorized, tema: "Tutorial de prueba", descripcion: "Descripción",
                    colaborador: "Colaborador falsificado"
                });
                assert_(rows[1][4] === "Desarrollador verificado",
                    "El colaborador guardado debe proceder de la sesión, no del navegador.");
            } finally {
                assertFeedbackSession = originalAssert;
                getSafeSheet = originalGetSafeSheet;
            }
        });
        test_("suggestYear rechaza IDs de vehículo duplicados antes de acceder a Feedbacks", function() {
            const originalAssert = assertFeedbackSession;
            const originalGetSpreadsheet = getSpreadsheet;
            const originalGetSafeSheet = getSafeSheet;
            const originalLock = LockService;
            const cutsRows = [Array(42).fill("")];
            const first = Array(42).fill("");
            first[COLS_CORTES.id - 1] = "VEH-DUP-01";
            first[COLS_CORTES.anoDesde - 1] = 2018;
            first[COLS_CORTES.anoHasta - 1] = 2022;
            cutsRows.push(first, first.slice());
            const cuts = makeSheet(cutsRows);
            let feedbackAccessed = false;
            try {
                assertFeedbackSession = function(payload) {
                    if (!payload || payload.sessionToken !== "TEST_SESSION") throw new Error("Sesión inválida.");
                    return { userId: "USR-TEST-01", userName: "Usuario verificado", role: "Tecnico" };
                };
                getSpreadsheet = () => ({ getSheetByName: name => name === SHEET_NAMES.CORTES ? cuts : null });
                getSafeSheet = () => { feedbackAccessed = true; throw new Error("No debe acceder a Feedbacks."); };
                LockService = { getScriptLock: () => ({ waitLock: function() {}, releaseLock: function() {} }) };
                const authorized = authorizeFeedbackAction_("suggestYear", { sessionToken: "TEST_SESSION", userId: "USR-TEST-01" });
                expectThrow_(() => handleSuggestYear({
                    ...authorized, vehicleId: "VEH-DUP-01", newYear: 2025, response: "Sí (Funciona)"
                }), "ID duplicado");
                assert_(!feedbackAccessed, "No debe consultar ni modificar Feedbacks ante un ID ambiguo.");
                assert_(cuts.rows[1][COLS_CORTES.anoHasta - 1] === 2022);
                assert_(cuts.rows[2][COLS_CORTES.anoHasta - 1] === 2022);
            } finally {
                assertFeedbackSession = originalAssert;
                getSpreadsheet = originalGetSpreadsheet;
                getSafeSheet = originalGetSafeSheet;
                LockService = originalLock;
            }
        });

        test_("suggestYear no duplica ni cuenta dos veces el reintento del mismo aportante verificado", function() {
            const originalAssert = assertFeedbackSession, originalGetSpreadsheet = getSpreadsheet;
            const originalGetSafeSheet = getSafeSheet, originalLog = logUserActivity;
            const originalLock = LockService, originalSpreadsheetApp = SpreadsheetApp;
            function makeRuntimeSheet(rows, maxColumns) {
                return {
                    rows,
                    getLastRow: function() { return this.rows.length; },
                    getLastColumn: function() { return Math.max(maxColumns || 0, ...this.rows.map(row => row.length)); },
                    getMaxColumns: function() { return maxColumns || this.getLastColumn(); },
                    getDataRange: function() { const self=this; return { getValues:()=>self.rows.map(row=>row.slice()) }; },
                    getRange: function(row,column,rowCount,columnCount) {
                        const self=this, height=rowCount||1, width=columnCount||1;
                        return {
                            getValue:()=> (self.rows[row-1]||[])[column-1],
                            getValues:()=>Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>(self.rows[row-1+r]||[])[column-1+c])),
                            setValue: value=>{while(self.rows.length<row)self.rows.push([]);while(self.rows[row-1].length<column)self.rows[row-1].push("");self.rows[row-1][column-1]=value;},
                            setValues: values=>values.forEach((line,r)=>line.forEach((value,c)=>{while(self.rows.length<row+r)self.rows.push([]);while(self.rows[row-1+r].length<column+c)self.rows[row-1+r].push("");self.rows[row-1+r][column-1+c]=value;})),
                            copyTo: function(){}, clearContent: function(){}
                        };
                    },
                    insertColumnsAfter: function(after,count) { maxColumns=(maxColumns||this.getLastColumn())+count;this.rows.forEach(line=>{while(line.length<maxColumns)line.push("");}); }
                };
            }
            const cutHeader=Array(42).fill(""), vehicle=Array(42).fill("");
            vehicle[COLS_CORTES.id-1]="VEH-DEDUP-01";
            vehicle[COLS_CORTES.anoDesde-1]=2018; vehicle[COLS_CORTES.anoHasta-1]=2022;
            const cuts=makeRuntimeSheet([cutHeader,vehicle],42);
            const feedbackHeader=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido","suggestionActorKey"];
            const existingVote=["F-001","Usuario verificado","VEH-DEDUP-01","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.","","","",2025,"user:USR-TEST-01"];
            const feedbackSheet=makeRuntimeSheet([feedbackHeader,existingVote],10);
            try {
                assertFeedbackSession=payload=>{if(!payload||payload.sessionToken!=="TEST_SESSION")throw new Error("Sesión inválida.");return {userId:"USR-TEST-01",userName:"Usuario verificado",role:"Tecnico"};};
                getSpreadsheet=()=>({getSheetByName:name=>name===SHEET_NAMES.CORTES?cuts:null});
                getSafeSheet=name=>name===SHEET_NAMES.SUGERENCIAS_ANO?feedbackSheet:null;
                logUserActivity=function(){};
                LockService={getScriptLock:()=>({waitLock:function(){},releaseLock:function(){}})};
                SpreadsheetApp={flush:function(){}};
                const authorized=authorizeFeedbackAction_("suggestYear",{sessionToken:"TEST_SESSION",userId:"USR-TEST-01",userName:"Cliente falsificado"});
                const result=handleSuggestYear({...authorized,vehicleId:"VEH-DEDUP-01",newYear:2025,response:"Sí (Funciona)"});
                assert_(feedbackSheet.rows.length===2,"El reintento del mismo actor no debe insertar otra fila.");
                assert_(feedbackSheet.rows[1][9]==="user:USR-TEST-01","La clave persistida debe corresponder a la sesión verificada.");
                assert_(result.status==="success"&&result.message.includes("1/3"),"El mismo actor debe contar una sola vez: "+JSON.stringify(result));
                assert_(cuts.rows[1][COLS_CORTES.anoHasta-1]===2022,"Un único aportante no debe ampliar el rango.");
            } finally {
                assertFeedbackSession=originalAssert;getSpreadsheet=originalGetSpreadsheet;getSafeSheet=originalGetSafeSheet;
                logUserActivity=originalLog;LockService=originalLock;SpreadsheetApp=originalSpreadsheetApp;
            }
        });

        test_("suggestYear exige tres aportantes verificados distintos y aplica el rango al alcanzar el tercero", function() {
            const originalAssert=assertFeedbackSession, originalGetSpreadsheet=getSpreadsheet;
            const originalGetSafeSheet=getSafeSheet, originalLog=logUserActivity;
            const originalLock=LockService, originalSpreadsheetApp=SpreadsheetApp;
            const originalMove=movePrimaryVehicleImageToCanonicalFolder;
            function runtimeSheet(rows,maxColumns) {
                return {
                    rows:rows,getLastRow:function(){return this.rows.length;},
                    getLastColumn:function(){return Math.max(maxColumns||0,...this.rows.map(row=>row.length));},
                    getMaxColumns:function(){return maxColumns||this.getLastColumn();},
                    getDataRange:function(){const self=this;return {getValues:()=>self.rows.map(row=>row.slice())};},
                    getRange:function(row,column,rowCount,columnCount){
                        const self=this,height=rowCount||1,width=columnCount||1;
                        return {
                            getValue:()=>((self.rows[row-1]||[])[column-1]===undefined?"":self.rows[row-1][column-1]),
                            getValues:()=>Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>((self.rows[row-1+r]||[])[column-1+c]===undefined?"":self.rows[row-1+r][column-1+c]))),
                            setValue:value=>{while(self.rows.length<row)self.rows.push([]);while(self.rows[row-1].length<column)self.rows[row-1].push("");self.rows[row-1][column-1]=value;},
                            setValues:values=>values.forEach((line,r)=>line.forEach((value,c)=>{while(self.rows.length<row+r)self.rows.push([]);while(self.rows[row-1+r].length<column+c)self.rows[row-1+r].push("");self.rows[row-1+r][column-1+c]=value;})),
                            copyTo:target=>target.setValues(Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>((self.rows[row-1+r]||[])[column-1+c]===undefined?"":self.rows[row-1+r][column-1+c])))),
                            clearContent:function(){for(let r=0;r<height;r++)for(let c=0;c<width;c++)if(self.rows[row-1+r])self.rows[row-1+r][column-1+c]="";}
                        };
                    },
                    insertColumnsAfter:function(after,count){maxColumns=(maxColumns||this.getLastColumn())+count;this.rows.forEach(line=>{while(line.length<maxColumns)line.push("");});},
                    deleteRow:function(row){this.rows.splice(row-1,1);}
                };
            }
            const cutHeader=Array(42).fill(""),vehicle=Array(42).fill("");
            vehicle[COLS_CORTES.id-1]="VEH-THRESHOLD-3";
            vehicle[COLS_CORTES.marca-1]="Marca";vehicle[COLS_CORTES.modelo-1]="Modelo";
            vehicle[COLS_CORTES.categoria-1]="Moto";vehicle[COLS_CORTES.versionesAplicables-1]="Versión";
            vehicle[COLS_CORTES.tipoEncendido-1]="Llave";
            vehicle[COLS_CORTES.anoDesde-1]=2018;vehicle[COLS_CORTES.anoHasta-1]=2022;
            const cuts=runtimeSheet([cutHeader,vehicle],42);
            const headers=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido","suggestionActorKey"];
            const voteA=["F-001","Usuario A","VEH-THRESHOLD-3","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.","","","",2025,"user:USR-A"];
            const voteB=["F-002","Usuario B","VEH-THRESHOLD-3","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.","","","",2025,"user:USR-B"];
            const feedbackSheet=runtimeSheet([headers,voteA,voteB],10);
            let feedbackAccessCount=0,activityCount=0;
            try {
                assertFeedbackSession=payload=>{
                    const map={"SESSION-B":{userId:"USR-B",userName:"Usuario B",role:"Tecnico"},"SESSION-C":{userId:"USR-C",userName:"Usuario C",role:"Tecnico"}};
                    if(!payload||!map[payload.sessionToken])throw new Error("Sesión inválida.");
                    return map[payload.sessionToken];
                };
                const yearApplicationSheets={};
                getSpreadsheet=()=>({getSheetByName:name=>name===SHEET_NAMES.CORTES?cuts:(yearApplicationSheets[name]||null),
                    insertSheet:name=>(yearApplicationSheets[name]=makeSheet([]))});
                getSafeSheet=name=>{
                    if(name!==SHEET_NAMES.SUGERENCIAS_ANO)return null;
                    feedbackAccessCount++;
                    return feedbackAccessCount<=2?feedbackSheet:null;
                };
                logUserActivity=function(){activityCount++;};
                LockService={getScriptLock:()=>({waitLock:function(){},releaseLock:function(){}})};
                SpreadsheetApp={flush:function(){}};
                movePrimaryVehicleImageToCanonicalFolder=()=>({skipped:true});
                const actorB=authorizeFeedbackAction_("suggestYear",{sessionToken:"SESSION-B"});
                const twoVotes=handleSuggestYear({...actorB,vehicleId:"VEH-THRESHOLD-3",newYear:2025,response:"Sí (Funciona)"});
                assert_(twoVotes.message.includes("2/3"),"Dos aportantes distintos deben permanecer en 2/3: "+JSON.stringify(twoVotes));
                assert_(cuts.rows[1][COLS_CORTES.anoDesde-1]===2018&&cuts.rows[1][COLS_CORTES.anoHasta-1]===2022,"Dos aportantes no deben modificar el rango.");
                const actorC=authorizeFeedbackAction_("suggestYear",{sessionToken:"SESSION-C"});
                const threeVotes=handleSuggestYear({...actorC,vehicleId:"VEH-THRESHOLD-3",newYear:2025,response:"Sí (Funciona)"});
                assert_(threeVotes.status==="success","El tercer aportante debe permitir la actualización: "+JSON.stringify(threeVotes));
                assert_(cuts.rows[1][COLS_CORTES.anoDesde-1]===2018&&cuts.rows[1][COLS_CORTES.anoHasta-1]===2025,"El tercer aportante debe ampliar el rango hasta 2025.");
                assert_(activityCount===2,"El reintento no debe duplicar actividad; solo el tercer usuario nuevo debe registrarla.");
            } finally {
                assertFeedbackSession=originalAssert;getSpreadsheet=originalGetSpreadsheet;getSafeSheet=originalGetSafeSheet;
                logUserActivity=originalLog;LockService=originalLock;SpreadsheetApp=originalSpreadsheetApp;
                movePrimaryVehicleImageToCanonicalFolder=originalMove;
            }
        });

        test_("suggestYear excluye respuestas negativas del umbral y conserva esos registros al aplicar la ampliación", function() {
            const oldAssert=assertFeedbackSession,oldGet=getSpreadsheet,oldSafe=getSafeSheet;
            const oldLog=logUserActivity,oldLock=LockService,oldApp=SpreadsheetApp,oldMove=movePrimaryVehicleImageToCanonicalFolder;
            function runtimeSheet(rows,maxColumns) {
                return {rows,getLastRow(){return this.rows.length;},getLastColumn(){return Math.max(maxColumns||0,...this.rows.map(r=>r.length));},
                    getMaxColumns(){return maxColumns||this.getLastColumn();},getDataRange(){const self=this;return {getValues:()=>self.rows.map(r=>r.slice())};},
                    getRange(row,column,height,width){const self=this,h=height||1,w=width||1;return {
                        getValue(){return (self.rows[row-1]||[])[column-1]??"";},
                        getValues(){return Array.from({length:h},(_,r)=>Array.from({length:w},(_,c)=>(self.rows[row-1+r]||[])[column-1+c]??""));},
                        setValue(value){while(self.rows.length<row)self.rows.push([]);while(self.rows[row-1].length<column)self.rows[row-1].push("");self.rows[row-1][column-1]=value;},
                        setValues(values){values.forEach((line,r)=>line.forEach((value,c)=>{while(self.rows.length<row+r)self.rows.push([]);while(self.rows[row-1+r].length<column+c)self.rows[row-1+r].push("");self.rows[row-1+r][column-1+c]=value;}));},
                        copyTo(target){target.setValues(this.getValues());},
                        clearContent(){for(let r=0;r<h;r++)for(let c=0;c<w;c++)if(self.rows[row-1+r])self.rows[row-1+r][column-1+c]="";}
                    };},insertColumnsAfter(after,count){maxColumns=(maxColumns||this.getLastColumn())+count;this.rows.forEach(r=>{while(r.length<maxColumns)r.push("");});}};
            }
            const cutHeader=Array(42).fill(""),vehicle=Array(42).fill("");
            vehicle[COLS_CORTES.id-1]="VEH-NEGATIVE-01";vehicle[COLS_CORTES.marca-1]="Marca";vehicle[COLS_CORTES.modelo-1]="Modelo";
            vehicle[COLS_CORTES.categoria-1]="Moto";vehicle[COLS_CORTES.versionesAplicables-1]="Versión";vehicle[COLS_CORTES.tipoEncendido-1]="Llave";
            vehicle[COLS_CORTES.anoDesde-1]=2018;vehicle[COLS_CORTES.anoHasta-1]=2022;
            const cuts=runtimeSheet([cutHeader,vehicle],42),headers=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido","suggestionActorKey"];
            const voteA=["F-A","A","VEH-NEGATIVE-01","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.","","","",2025,"user:USR-A"];
            const voteB=["F-B","B","VEH-NEGATIVE-01","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.","","","",2025,"user:USR-B"];
            const feedback=runtimeSheet([headers,voteA,voteB],10),activities=[];
            try {
                assertFeedbackSession=payload=>{const users={"SESSION-C":{userId:"USR-C",userName:"Usuario C",role:"Tecnico"},"SESSION-D":{userId:"USR-D",userName:"Usuario D",role:"Tecnico"}};if(!payload||!users[payload.sessionToken])throw new Error("Sesión inválida.");return users[payload.sessionToken];};
                const yearApplicationSheets={};
                getSpreadsheet=()=>({getSheetByName:name=>name===SHEET_NAMES.CORTES?cuts:(yearApplicationSheets[name]||null),
                    insertSheet:name=>(yearApplicationSheets[name]=makeSheet([]))});getSafeSheet=name=>name===SHEET_NAMES.SUGERENCIAS_ANO?feedback:null;
                logUserActivity=(id,name,type)=>activities.push(type);LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
                SpreadsheetApp={flush(){}};movePrimaryVehicleImageToCanonicalFolder=()=>({skipped:true});
                const actorC=authorizeFeedbackAction_("suggestYear",{sessionToken:"SESSION-C"});
                const negative=handleSuggestYear({...actorC,vehicleId:"VEH-NEGATIVE-01",newYear:2025,response:"No funciona"});
                assert_(negative.status==="success","La respuesta negativa debe registrarse sin error.");
                assert_(cuts.rows[1][COLS_CORTES.anoDesde-1]===2018&&cuts.rows[1][COLS_CORTES.anoHasta-1]===2022,"Dos positivos y un negativo no deben ampliar el rango.");
                assert_(activities.filter(type=>type==="apply_year_suggestion").length===0,"Una respuesta negativa no debe disparar la aplicación.");
                const negativeRow=feedback.rows.find(row=>row[2]==="VEH-NEGATIVE-01"&&String(row[4]).includes("no funciona"));
                assert_(negativeRow&&negativeRow[9]==="user:USR-C","El voto negativo debe persistirse con su actor.");
                const actorD=authorizeFeedbackAction_("suggestYear",{sessionToken:"SESSION-D"});
                const positive=handleSuggestYear({...actorD,vehicleId:"VEH-NEGATIVE-01",newYear:2025,response:"Sí (Funciona)"});
                assert_(positive.status==="success"&&cuts.rows[1][COLS_CORTES.anoHasta-1]===2025,"El tercer positivo verificado debe completar el umbral.");
                const savedNegative=feedback.rows.find(row=>row[2]==="VEH-NEGATIVE-01"&&String(row[4]).includes("no funciona"));
                assert_(savedNegative&&savedNegative[9]==="user:USR-C","La ampliación no debe marcar como atendido el voto negativo.");
                assert_(activities.filter(type=>type==="apply_year_suggestion").length===1,"La ampliación debe registrarse una sola vez.");
            } finally {assertFeedbackSession=oldAssert;getSpreadsheet=oldGet;getSafeSheet=oldSafe;logUserActivity=oldLog;LockService=oldLock;SpreadsheetApp=oldApp;movePrimaryVehicleImageToCanonicalFolder=oldMove;}
        });

        test_("suggestYear cuenta Modelo confirmado como aporte positivo y limpia sus votos tras ampliar el rango", function() {
            const originalAssert=assertFeedbackSession,originalGetSpreadsheet=getSpreadsheet;
            const originalGetSafeSheet=getSafeSheet,originalLog=logUserActivity;
            const originalLock=LockService,originalSpreadsheetApp=SpreadsheetApp;
            const originalMove=movePrimaryVehicleImageToCanonicalFolder;
            function runtimeSheet(rows,maxColumns) {
                return {
                    rows:rows,getLastRow:function(){return this.rows.length;},
                    getLastColumn:function(){return Math.max(maxColumns||0,...this.rows.map(row=>row.length));},
                    getMaxColumns:function(){return maxColumns||this.getLastColumn();},
                    getDataRange:function(){const self=this;return {getValues:()=>self.rows.map(row=>row.slice())};},
                    getRange:function(row,column,rowCount,columnCount){
                        const self=this,height=rowCount||1,width=columnCount||1;
                        return {
                            getValue:()=>((self.rows[row-1]||[])[column-1]===undefined?"":self.rows[row-1][column-1]),
                            getValues:()=>Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>((self.rows[row-1+r]||[])[column-1+c]===undefined?"":self.rows[row-1+r][column-1+c]))),
                            setValue:value=>{while(self.rows.length<row)self.rows.push([]);while(self.rows[row-1].length<column-1)self.rows[row-1].push("");self.rows[row-1][column-1]=value;},
                            setValues:values=>values.forEach((line,r)=>line.forEach((value,c)=>{while(self.rows.length<row+r)self.rows.push([]);while(self.rows[row-1+r].length<column-1+c)self.rows[row-1+r].push("");self.rows[row-1+r][column-1+c]=value;})),
                            copyTo:target=>target.setValues(Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>((self.rows[row-1+r]||[])[column-1+c]===undefined?"":self.rows[row-1+r][column-1+c])))),
                            clearContent:function(){for(let r=0;r<height;r++)for(let c=0;c<width;c++)if(self.rows[row-1+r])self.rows[row-1+r][column-1+c]="";}
                        };
                    },
                    insertColumnsAfter:function(after,count){maxColumns=(maxColumns||this.getLastColumn())+count;this.rows.forEach(line=>{while(line.length<maxColumns)line.push("");});},
                    deleteRow:function(row){this.rows.splice(row-1,1);}
                };
            }
            const cutHeader=Array(42).fill(""),vehicle=Array(42).fill("");
            vehicle[COLS_CORTES.id-1]="VEH-MODEL-CONFIRM";
            vehicle[COLS_CORTES.marca-1]="Marca";vehicle[COLS_CORTES.modelo-1]="Modelo";
            vehicle[COLS_CORTES.categoria-1]="Moto";vehicle[COLS_CORTES.versionesAplicables-1]="Versión";
            vehicle[COLS_CORTES.tipoEncendido-1]="Llave";
            vehicle[COLS_CORTES.anoDesde-1]=2018;vehicle[COLS_CORTES.anoHasta-1]=2022;
            const cuts=runtimeSheet([cutHeader,vehicle],42);
            const headers=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido","suggestionActorKey"];
            const voteA=["F-001","Usuario A","VEH-MODEL-CONFIRM","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.","","","",2025,"user:USR-A"];
            const voteB=["F-002","Usuario B","VEH-MODEL-CONFIRM","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.","","","",2025,"user:USR-B"];
            const feedback=runtimeSheet([headers,voteA,voteB],10);
            let activityCount=0;
            try {
                assertFeedbackSession=payload=>{
                    if(!payload||payload.sessionToken!=="SESSION-C")throw new Error("Sesión inválida.");
                    return {userId:"USR-C",userName:"Usuario C",role:"Tecnico"};
                };
                const yearApplicationSheets={};
                getSpreadsheet=()=>({getSheetByName:name=>name===SHEET_NAMES.CORTES?cuts:(yearApplicationSheets[name]||null),
                    insertSheet:name=>(yearApplicationSheets[name]=makeSheet([]))});
                getSafeSheet=name=>name===SHEET_NAMES.SUGERENCIAS_ANO||name===SHEET_NAMES.FEEDBACKS?feedback:null;
                logUserActivity=()=>{activityCount++;};
                LockService={getScriptLock:()=>({waitLock:function(){},releaseLock:function(){}})};
                SpreadsheetApp={flush:function(){}};
                movePrimaryVehicleImageToCanonicalFolder=()=>({skipped:true});
                const actor=authorizeFeedbackAction_("suggestYear",{sessionToken:"SESSION-C"});
                const result=handleSuggestYear({...actor,vehicleId:"VEH-MODEL-CONFIRM",newYear:2025,response:"Modelo confirmado"});
                assert_(result.status==="success"&&result.message.includes("3 aportantes distintos"),"El tercer aporte Modelo confirmado debe alcanzar el umbral: "+JSON.stringify(result));
                assert_(cuts.rows[1][COLS_CORTES.anoDesde-1]===2018&&cuts.rows[1][COLS_CORTES.anoHasta-1]===2025,"Debe ampliar el rango hasta el año confirmado.");
                assert_(feedback.rows.length===4,"Los tres aportes atendidos deben conservarse como marcas de deduplicación.");
                const appliedActors=feedback.rows.slice(1).map(row=>row[9]);
                assert_(appliedActors.includes("applied:user:USR-A")&&appliedActors.includes("applied:user:USR-B")&&appliedActors.includes("applied:user:USR-C"),
                    "Los tres aportes aplicados deben quedar marcados sin seguir contando como votos activos.");
                const retry=handleSuggestYear({...actor,vehicleId:"VEH-MODEL-CONFIRM",newYear:2025,response:"Modelo confirmado"});
                assert_(retry.status==="info"&&retry.message.includes("ya fue atendida"),
                    "El reintento después de la ampliación debe reconocerse como ya atendido: "+JSON.stringify(retry));
                assert_(feedback.rows.length===4,"El reintento posterior no debe insertar otra fila.");
                assert_(activityCount===2,"El reintento posterior no debe generar actividad duplicada.");
            } finally {
                assertFeedbackSession=originalAssert;getSpreadsheet=originalGetSpreadsheet;getSafeSheet=originalGetSafeSheet;
                logUserActivity=originalLog;LockService=originalLock;SpreadsheetApp=originalSpreadsheetApp;
                movePrimaryVehicleImageToCanonicalFolder=originalMove;
            }
        });

        test_("suggestYear informa si una nueva respuesta del mismo año no se registró durante la recuperación pendiente", function() {
            const oldAssert=assertFeedbackSession,oldGet=getSpreadsheet,oldSafe=getSafeSheet;
            const oldLog=logUserActivity,oldLock=LockService,oldApp=SpreadsheetApp,oldMove=movePrimaryVehicleImageToCanonicalFolder;
            function sheet(rows,maxColumns) {
                return {
                    rows,
                    getLastRow(){return this.rows.length;},
                    getLastColumn(){return Math.max(maxColumns||0,...this.rows.map(r=>r.length));},
                    getMaxColumns(){return maxColumns||this.getLastColumn();},
                    getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};},
                    getRange(r,c,h=1,w=1) {
                        const self=this;
                        return {
                            getValue(){return (self.rows[r-1]||[])[c-1]??"";},
                            getValues(){return Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>(self.rows[r-1+i]||[])[c-1+j]??""));},
                            setValue(v){while(self.rows.length<r)self.rows.push([]);while(self.rows[r-1].length<c)self.rows[r-1].push("");self.rows[r-1][c-1]=v;},
                            setValues(vs){vs.forEach((line,i)=>line.forEach((v,j)=>{while(self.rows.length<r+i)self.rows.push([]);while(self.rows[r-1+i].length<c+j)self.rows[r-1+i].push("");self.rows[r-1+i][c-1+j]=v;}));},
                            copyTo(target){target.setValues(this.getValues());},
                            clearContent(){for(let i=0;i<h;i++)for(let j=0;j<w;j++)if(self.rows[r-1+i])self.rows[r-1+i][c-1+j]="";}
                        };
                    }
                };
            }
            const vehicle=Array(42).fill("");
            vehicle[COLS_CORTES.id-1]="VEH-PENDING-SAME";
            vehicle[COLS_CORTES.marca-1]="Toyota";vehicle[COLS_CORTES.modelo-1]="Hilux";
            vehicle[COLS_CORTES.categoria-1]="Pickup";vehicle[COLS_CORTES.versionesAplicables-1]="2.4 Diesel";
            vehicle[COLS_CORTES.tipoEncendido-1]="Llave";
            vehicle[COLS_CORTES.anoDesde-1]=2018;vehicle[COLS_CORTES.anoHasta-1]=2022;
            const cuts=sheet([Array(42).fill(""),vehicle],42);
            const headers=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido","suggestionActorKey"];
            const vote=(id,user,actor)=>[id,user,"VEH-PENDING-SAME","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.","","","",2025,actor];
            const feedback=sheet([headers,vote("F-A","A","user:USR-A"),vote("F-B","B","user:USR-B"),vote("F-C","C","user:USR-C")],10);
            const ledgerHeaders=["operationId","vehicleId","year","previousFrom","previousTo","targetFrom","targetTo","voteCount","status","activityAttempted","createdAt","updatedAt"];
            const ledger=sheet([ledgerHeaders,["YSA-PENDING","VEH-PENDING-SAME",2025,2018,2022,2018,2025,3,"pending",true,"2026-11-10T00:00:00.000Z","2026-11-10T00:00:00.000Z"]],12);
            try {
                assertFeedbackSession=p=>{
                    if(!p||p.sessionToken!=="SESSION-D")throw Error("Sesión inválida");
                    return {userId:"USR-D",userName:"Usuario D",role:"Tecnico"};
                };
                getSpreadsheet=()=>({getSheetByName:n=>n===SHEET_NAMES.CORTES?cuts:(n==="FeedbackYearApplications"?ledger:null)});
                getSafeSheet=n=>n===SHEET_NAMES.SUGERENCIAS_ANO||n===SHEET_NAMES.FEEDBACKS?feedback:null;
                logUserActivity=()=>{};
                LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
                SpreadsheetApp={flush(){}};
                movePrimaryVehicleImageToCanonicalFolder=()=>({skipped:true});
                const actor=authorizeFeedbackAction_("suggestYear",{sessionToken:"SESSION-D"});
                const result=handleSuggestYear({...actor,vehicleId:"VEH-PENDING-SAME",newYear:2025,response:"Sí (Funciona)"});
                assert_(ledger.rows[1][8]==="completed","La aplicación pendiente debe recuperarse.");
                assert_(cuts.rows[1][COLS_CORTES.anoHasta-1]===2025,"El rango debe quedar actualizado.");
                assert_(!feedback.rows.some(r=>r[9]==="user:USR-D"),"La respuesta nueva no debe insertarse durante la recuperación.");
                assert_(result.status==="info"&&result.recovered===true&&result.message.includes("no se registró")&&result.message.includes("vuelve a enviarla"),
                    "Debe informarse que la respuesta actual no se registró y debe reenviarse: "+JSON.stringify(result));
            } finally {
                assertFeedbackSession=oldAssert;getSpreadsheet=oldGet;getSafeSheet=oldSafe;logUserActivity=oldLog;
                LockService=oldLock;SpreadsheetApp=oldApp;movePrimaryVehicleImageToCanonicalFolder=oldMove;
            }
        });

        test_("suggestYear recupera la aplicación pendiente del vehículo antes de aceptar otro año", function() {
            const oldAssert=assertFeedbackSession,oldGet=getSpreadsheet,oldSafe=getSafeSheet;
            const oldLog=logUserActivity,oldLock=LockService,oldApp=SpreadsheetApp,oldMove=movePrimaryVehicleImageToCanonicalFolder;
            let failFirstRangeWrite=true;
            function sheet(rows,maxColumns,isCuts) {
                return {
                    rows,getLastRow(){return this.rows.length;},
                    getLastColumn(){return Math.max(maxColumns||0,...this.rows.map(r=>r.length));},
                    getMaxColumns(){return maxColumns||this.getLastColumn();},
                    getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};},
                    getRange(r,c,h=1,w=1) {
                        const self=this;
                        return {
                            getValue(){return (self.rows[r-1]||[])[c-1]??"";},
                            getValues(){return Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>(self.rows[r-1+i]||[])[c-1+j]??""));},
                            setValue(v){
                                if(isCuts&&r===2&&c===COLS_CORTES.anoHasta&&Number(v)===2025&&failFirstRangeWrite){
                                    failFirstRangeWrite=false;throw Error("fallo simulado antes de aplicar el primer rango");
                                }
                                while(self.rows.length<r)self.rows.push([]);
                                while(self.rows[r-1].length<c)self.rows[r-1].push("");
                                self.rows[r-1][c-1]=v;
                            },
                            setValues(vs){vs.forEach((line,i)=>line.forEach((v,j)=>{
                                while(self.rows.length<r+i)self.rows.push([]);
                                while(self.rows[r-1+i].length<c+j)self.rows[r-1+i].push("");
                                self.rows[r-1+i][c-1+j]=v;
                            }));},
                            copyTo(target){target.setValues(this.getValues());},
                            clearContent(){for(let i=0;i<h;i++)for(let j=0;j<w;j++)if(self.rows[r-1+i])self.rows[r-1+i][c-1+j]="";}
                        };
                    },
                    insertColumnsAfter(after,count){maxColumns=(maxColumns||this.getLastColumn())+count;this.rows.forEach(row=>{while(row.length<maxColumns)row.push("");});}
                };
            }
            const vehicle=Array(42).fill("");
            vehicle[COLS_CORTES.id-1]="VEH-MULTI-PENDING";
            vehicle[COLS_CORTES.marca-1]="Toyota";vehicle[COLS_CORTES.modelo-1]="Hilux";
            vehicle[COLS_CORTES.categoria-1]="Pickup";vehicle[COLS_CORTES.versionesAplicables-1]="2.4 Diesel";
            vehicle[COLS_CORTES.tipoEncendido-1]="Llave";
            vehicle[COLS_CORTES.anoDesde-1]=2018;vehicle[COLS_CORTES.anoHasta-1]=2022;
            const cuts=sheet([Array(42).fill(""),vehicle],42,true);
            const headers=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido","suggestionActorKey"];
            const feedback=sheet([headers,
                ["F-A","A","VEH-MULTI-PENDING","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.","","","",2025,"user:USR-A"],
                ["F-B","B","VEH-MULTI-PENDING","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.","","","",2025,"user:USR-B"],
                ["F-C","C","VEH-MULTI-PENDING","Confirmación de funcionamiento para año 2026","La información funciona para el año 2026.","","","",2026,"user:USR-E"],
                ["F-D","D","VEH-MULTI-PENDING","Confirmación de funcionamiento para año 2026","La información funciona para el año 2026.","","","",2026,"user:USR-F"]
            ],10,false);
            const ledgerSheets={},activities=[];
            try {
                assertFeedbackSession=p=>{
                    const users={"SESSION-25":{userId:"USR-C",userName:"Usuario C",role:"Tecnico"},
                        "SESSION-26":{userId:"USR-D",userName:"Usuario D",role:"Tecnico"}};
                    if(!p||!users[p.sessionToken])throw Error("Sesión inválida");
                    return users[p.sessionToken];
                };
                getSpreadsheet=()=>({getSheetByName:n=>n===SHEET_NAMES.CORTES?cuts:(ledgerSheets[n]||null),
                    insertSheet:n=>(ledgerSheets[n]=sheet([],12,false))});
                getSafeSheet=n=>n===SHEET_NAMES.SUGERENCIAS_ANO||n===SHEET_NAMES.FEEDBACKS?feedback:null;
                logUserActivity=(id,name,type)=>activities.push(type);
                LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
                SpreadsheetApp={flush(){}};
                movePrimaryVehicleImageToCanonicalFolder=()=>({skipped:true});
                const actor25=authorizeFeedbackAction_("suggestYear",{sessionToken:"SESSION-25"});
                let firstError="";
                try { handleSuggestYear({...actor25,vehicleId:"VEH-MULTI-PENDING",newYear:2025,response:"Sí (Funciona)"}); }
                catch(error) { firstError=error.message; }
                assert_(firstError.includes("fallo simulado"),"Debe quedar pendiente la primera ampliación: "+firstError);
                const ledger=ledgerSheets.FeedbackYearApplications;
                assert_(ledger&&ledger.rows.length===2&&ledger.rows[1][8]==="pending","Debe existir una operación pendiente para 2025.");
                const actor26=authorizeFeedbackAction_("suggestYear",{sessionToken:"SESSION-26"});
                const second=handleSuggestYear({...actor26,vehicleId:"VEH-MULTI-PENDING",newYear:2026,response:"Sí (Funciona)"});
                assert_(second.status==="info"&&second.recovered===true&&second.message.includes("año 2026 no se registró"),
                    "Primero debe recuperarse la aplicación anterior e informar que se reenvíe la nueva sugerencia: "+JSON.stringify(second));
                assert_(ledger.rows.length===2&&ledger.rows[1][8]==="completed","No debe crearse una segunda operación mientras se recupera la primera.");
                assert_(cuts.rows[1][COLS_CORTES.anoHasta-1]===2025,"La primera ampliación debe quedar completada antes de procesar 2026.");
                assert_(feedback.rows.slice(1).filter(row=>row[9]==="user:USR-D"&&Number(row[8])===2026).length===0,
                    "La solicitud del segundo año no debe registrarse durante la recuperación.");
                const retry=handleSuggestYear({...actor26,vehicleId:"VEH-MULTI-PENDING",newYear:2026,response:"Sí (Funciona)"});
                assert_(retry.status==="success"&&cuts.rows[1][COLS_CORTES.anoHasta-1]===2026,
                    "Al reenviar, la segunda ampliación debe procesarse secuencialmente: "+JSON.stringify(retry));
                assert_(ledger.rows.length===3&&ledger.rows[1][8]==="completed"&&ledger.rows[2][8]==="completed",
                    "Ambas operaciones secuenciales deben quedar completadas.");
            } finally {
                assertFeedbackSession=oldAssert;getSpreadsheet=oldGet;getSafeSheet=oldSafe;logUserActivity=oldLog;
                LockService=oldLock;SpreadsheetApp=oldApp;movePrimaryVehicleImageToCanonicalFolder=oldMove;
            }
        });

        test_("suggestYear recupera una ampliación cuando falla la primera marca de voto atendido", function() {
            const oldAssert=assertFeedbackSession,oldGet=getSpreadsheet,oldSafe=getSafeSheet;
            const oldLog=logUserActivity,oldLock=LockService,oldApp=SpreadsheetApp,oldMove=movePrimaryVehicleImageToCanonicalFolder;
            let failAppliedMarker=true;
            function runtimeSheet(rows,maxColumns) {
                return {
                    rows,getLastRow(){return this.rows.length;},
                    getLastColumn(){return Math.max(maxColumns||0,...this.rows.map(r=>r.length));},
                    getMaxColumns(){return maxColumns||this.getLastColumn();},
                    getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};},
                    getRange(r,c,h=1,w=1) {
                        const self=this;
                        return {
                            getValue(){return (self.rows[r-1]||[])[c-1]??"";},
                            getValues(){return Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>(self.rows[r-1+i]||[])[c-1+j]??""));},
                            setValue(v){
                                if(c===10&&String(v).startsWith("applied:")&&failAppliedMarker){
                                    failAppliedMarker=false;
                                    throw new Error("fallo simulado al marcar el primer aporte");
                                }
                                while(self.rows.length<r)self.rows.push([]);
                                while(self.rows[r-1].length<c)self.rows[r-1].push("");
                                self.rows[r-1][c-1]=v;
                            },
                            setValues(vs){vs.forEach((line,i)=>line.forEach((v,j)=>{
                                while(self.rows.length<r+i)self.rows.push([]);
                                while(self.rows[r-1+i].length<c+j)self.rows[r-1+i].push("");
                                self.rows[r-1+i][c-1+j]=v;
                            }));},
                            copyTo(target){target.setValues(this.getValues());},
                            clearContent(){for(let i=0;i<h;i++)for(let j=0;j<w;j++)if(self.rows[r-1+i])self.rows[r-1+i][c-1+j]="";}
                        };
                    },
                    insertColumnsAfter(after,count){maxColumns=(maxColumns||this.getLastColumn())+count;this.rows.forEach(row=>{while(row.length<maxColumns)row.push("");});}
                };
            }
            const vehicle=Array(42).fill("");
            vehicle[COLS_CORTES.id-1]="VEH-PARTIAL-RECOVERY";
            vehicle[COLS_CORTES.marca-1]="Toyota";vehicle[COLS_CORTES.modelo-1]="Hilux";
            vehicle[COLS_CORTES.categoria-1]="Pickup";vehicle[COLS_CORTES.versionesAplicables-1]="2.4 Diesel";
            vehicle[COLS_CORTES.tipoEncendido-1]="Llave";
            vehicle[COLS_CORTES.anoDesde-1]=2018;vehicle[COLS_CORTES.anoHasta-1]=2022;
            const cuts=runtimeSheet([Array(42).fill(""),vehicle],42);
            const headers=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido","suggestionActorKey"];
            const feedback=runtimeSheet([headers,
                ["F-A","A","VEH-PARTIAL-RECOVERY","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.","","","",2025,"user:USR-A"],
                ["F-B","B","VEH-PARTIAL-RECOVERY","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.","","","",2025,"user:USR-B"]
            ],10);
            const yearApplicationSheets={},activities=[];
            try {
                assertFeedbackSession=p=>{if(!p||p.sessionToken!=="SESSION-C")throw Error("Sesión inválida");return {userId:"USR-C",userName:"Usuario C",role:"Tecnico"};};
                getSpreadsheet=()=>({getSheetByName:n=>n===SHEET_NAMES.CORTES?cuts:(yearApplicationSheets[n]||null),
                    insertSheet:n=>(yearApplicationSheets[n]=runtimeSheet([],12))});
                getSafeSheet=n=>n===SHEET_NAMES.SUGERENCIAS_ANO||n===SHEET_NAMES.FEEDBACKS?feedback:null;
                logUserActivity=(id,name,type)=>activities.push(type);
                LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
                SpreadsheetApp={flush(){}};
                movePrimaryVehicleImageToCanonicalFolder=()=>({skipped:true});
                const actor=authorizeFeedbackAction_("suggestYear",{sessionToken:"SESSION-C"});
                let firstError="";
                try { handleSuggestYear({...actor,vehicleId:"VEH-PARTIAL-RECOVERY",newYear:2025,response:"Sí (Funciona)"}); }
                catch(error) { firstError=error.message; }
                assert_(firstError.includes("fallo simulado"),"Debe reproducirse el fallo durante la primera marca: "+firstError);
                assert_(cuts.rows[1][COLS_CORTES.anoHasta-1]===2025,"El rango puede haberse aplicado antes del fallo.");
                const ledger=yearApplicationSheets.FeedbackYearApplications;
                assert_(ledger&&ledger.rows[1][8]==="pending","El diario debe conservar la operación como pendiente.");
                assert_(feedback.rows.slice(1).every(row=>!String(row[9]).startsWith("applied:")),
                    "El fallo inicial debe ocurrir antes de marcar cualquier voto.");
                const retry=handleSuggestYear({...actor,vehicleId:"VEH-PARTIAL-RECOVERY",newYear:2025,response:"Sí (Funciona)"});
                assert_(retry.status==="success"&&retry.recovered===true,"El reintento debe recuperar la operación pendiente: "+JSON.stringify(retry));
                assert_(feedback.rows.slice(1).length===3&&feedback.rows.slice(1).every(row=>String(row[9]).startsWith("applied:")),
                    "La recuperación debe marcar los tres aportes positivos.");
                assert_(ledger.rows[1][8]==="completed","El diario solo debe cerrarse después de confirmar las marcas.");
                assert_(activities.filter(type=>type==="apply_year_suggestion").length===1,
                    "La recuperación no debe duplicar la actividad de aplicación.");
            } finally {
                assertFeedbackSession=oldAssert;getSpreadsheet=oldGet;getSafeSheet=oldSafe;logUserActivity=oldLog;
                LockService=oldLock;SpreadsheetApp=oldApp;movePrimaryVehicleImageToCanonicalFolder=oldMove;
            }
        });

        test_("suggestYear conserva el límite superior implícito al ampliar hacia atrás desde un año único y recupera una escritura parcial", function() {
            const oldAssert=assertFeedbackSession,oldGet=getSpreadsheet,oldSafe=getSafeSheet;
            const oldLog=logUserActivity,oldLock=LockService,oldApp=SpreadsheetApp,oldMove=movePrimaryVehicleImageToCanonicalFolder;
            let failLowerWrite=true;
            function runtimeSheet(rows,maxColumns,isCuts) {
                return {
                    rows,getLastRow(){return this.rows.length;},
                    getLastColumn(){return Math.max(maxColumns||0,...this.rows.map(r=>r.length));},
                    getMaxColumns(){return maxColumns||this.getLastColumn();},
                    getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};},
                    getRange(r,c,h=1,w=1) {
                        const self=this;
                        return {
                            getValue(){return (self.rows[r-1]||[])[c-1]??"";},
                            getValues(){return Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>(self.rows[r-1+i]||[])[c-1+j]??""));},
                            setValue(v){
                                if(isCuts&&r===2&&c===COLS_CORTES.anoDesde&&Number(v)===2015&&failLowerWrite){
                                    failLowerWrite=false;
                                    throw new Error("fallo simulado al ampliar anoDesde");
                                }
                                while(self.rows.length<r)self.rows.push([]);
                                while(self.rows[r-1].length<c)self.rows[r-1].push("");
                                self.rows[r-1][c-1]=v;
                            },
                            setValues(vs){vs.forEach((line,i)=>line.forEach((v,j)=>{
                                while(self.rows.length<r+i)self.rows.push([]);
                                while(self.rows[r-1+i].length<c+j)self.rows[r-1+i].push("");
                                self.rows[r-1+i][c-1+j]=v;
                            }));},
                            copyTo(target){target.setValues(this.getValues());},
                            clearContent(){for(let i=0;i<h;i++)for(let j=0;j<w;j++)if(self.rows[r-1+i])self.rows[r-1+i][c-1+j]="";}
                        };
                    },
                    insertColumnsAfter(after,count){maxColumns=(maxColumns||this.getLastColumn())+count;this.rows.forEach(row=>{while(row.length<maxColumns)row.push("");});}
                };
            }
            const vehicle=Array(42).fill("");
            vehicle[COLS_CORTES.id-1]="VEH-SINGLE-YEAR-LOWER";
            vehicle[COLS_CORTES.marca-1]="Toyota";vehicle[COLS_CORTES.modelo-1]="Hilux";
            vehicle[COLS_CORTES.categoria-1]="Pickup";vehicle[COLS_CORTES.versionesAplicables-1]="2.4 Diesel";
            vehicle[COLS_CORTES.tipoEncendido-1]="Llave";
            vehicle[COLS_CORTES.anoDesde-1]=2018;vehicle[COLS_CORTES.anoHasta-1]="";
            const cuts=runtimeSheet([Array(42).fill(""),vehicle],42,true);
            const headers=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido","suggestionActorKey"];
            const problem="Sugerencia de ampliar rango inferior al año 2015";
            const answer="El usuario indicó que corresponde a un modelo anterior.";
            const feedback=runtimeSheet([headers,
                ["F-A","A","VEH-SINGLE-YEAR-LOWER",problem,answer,"","","",2015,"user:USR-A"],
                ["F-B","B","VEH-SINGLE-YEAR-LOWER",problem,answer,"","","",2015,"user:USR-B"]
            ],10,false);
            const yearApplicationSheets={},activities=[];
            try {
                assertFeedbackSession=p=>{if(!p||p.sessionToken!=="SESSION-C")throw Error("Sesión inválida");return {userId:"USR-C",userName:"Usuario C",role:"Tecnico"};};
                getSpreadsheet=()=>({getSheetByName:n=>n===SHEET_NAMES.CORTES?cuts:(yearApplicationSheets[n]||null),
                    insertSheet:n=>(yearApplicationSheets[n]=runtimeSheet([],12,false))});
                getSafeSheet=n=>n===SHEET_NAMES.SUGERENCIAS_ANO||n===SHEET_NAMES.FEEDBACKS?feedback:null;
                logUserActivity=(id,name,type)=>activities.push(type);
                LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
                SpreadsheetApp={flush(){}};
                movePrimaryVehicleImageToCanonicalFolder=()=>({skipped:true});
                const actor=authorizeFeedbackAction_("suggestYear",{sessionToken:"SESSION-C"});
                let firstError="";
                try { handleSuggestYear({...actor,vehicleId:"VEH-SINGLE-YEAR-LOWER",newYear:2015,response:"Es más antiguo"}); }
                catch(error) { firstError=error.message; }
                assert_(firstError.includes("fallo simulado"),"Debe reproducirse el fallo después de fijar el límite superior: "+firstError);
                assert_(cuts.rows[1][COLS_CORTES.anoDesde-1]===2018&&cuts.rows[1][COLS_CORTES.anoHasta-1]===2018,
                    "El primer paso debe materializar el rango previo sin cambiar su significado.");
                const ledger=yearApplicationSheets.FeedbackYearApplications;
                assert_(ledger&&ledger.rows[1][8]==="pending","La operación debe seguir pendiente después del fallo.");
                const retry=handleSuggestYear({...actor,vehicleId:"VEH-SINGLE-YEAR-LOWER",newYear:2015,response:"Es más antiguo"});
                assert_(retry.status==="success"&&retry.recovered===true,"El reintento debe completar la ampliación: "+JSON.stringify(retry));
                assert_(cuts.rows[1][COLS_CORTES.anoDesde-1]===2015&&cuts.rows[1][COLS_CORTES.anoHasta-1]===2018,
                    "La ampliación inferior debe conservar el límite superior original.");
                assert_(feedback.rows.slice(1).length===3&&feedback.rows.slice(1).every(row=>String(row[9]).startsWith("applied:")),
                    "La recuperación debe marcar los tres votos positivos.");
                assert_(ledger.rows[1][8]==="completed","El diario debe cerrarse tras confirmar rango y votos.");
                assert_(activities.filter(type=>type==="apply_year_suggestion").length===1,
                    "La recuperación no debe duplicar la actividad de aplicación.");
            } finally {
                assertFeedbackSession=oldAssert;getSpreadsheet=oldGet;getSafeSheet=oldSafe;logUserActivity=oldLog;
                LockService=oldLock;SpreadsheetApp=oldApp;movePrimaryVehicleImageToCanonicalFolder=oldMove;
            }
        });

        test_("suggestYear amplía el límite inferior con tres aportantes «Es más antiguo» y limpia solo esos votos", function() {
            const oldAssert=assertFeedbackSession,oldGet=getSpreadsheet,oldSafe=getSafeSheet;
            const oldLog=logUserActivity,oldLock=LockService,oldApp=SpreadsheetApp,oldMove=movePrimaryVehicleImageToCanonicalFolder;
            function sheet(rows,maxColumns) {
                return {
                    rows,getLastRow(){return this.rows.length;},
                    getLastColumn(){return Math.max(maxColumns||0,...this.rows.map(r=>r.length));},
                    getMaxColumns(){return maxColumns||this.getLastColumn();},
                    getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};},
                    getRange(r,c,h=1,w=1) {const self=this;return {
                        getValue(){return (self.rows[r-1]||[])[c-1]??"";},
                        getValues(){return Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>(self.rows[r-1+i]||[])[c-1+j]??""));},
                        setValue(v){while(self.rows.length<r)self.rows.push([]);while(self.rows[r-1].length<c)self.rows[r-1].push("");self.rows[r-1][c-1]=v;},
                        setValues(vs){vs.forEach((line,i)=>line.forEach((v,j)=>{while(self.rows.length<r+i)self.rows.push([]);while(self.rows[r-1+i].length<c+j)self.rows[r-1+i].push("");self.rows[r-1+i][c-1+j]=v;}));},
                        copyTo(target){target.setValues(this.getValues());},
                        clearContent(){for(let i=0;i<h;i++)for(let j=0;j<w;j++)if(self.rows[r-1+i])self.rows[r-1+i][c-1+j]="";}
                    };},
                    deleteRow(r){this.rows.splice(r-1,1);},
                    insertColumnsAfter(after,count){maxColumns=(maxColumns||this.getLastColumn())+count;this.rows.forEach(row=>{while(row.length<maxColumns)row.push("");});}
                };
            }
            const vehicle=Array(42).fill("");
            vehicle[COLS_CORTES.id-1]="VEH-OLDER-01";
            vehicle[COLS_CORTES.marca-1]="Toyota";vehicle[COLS_CORTES.modelo-1]="Hilux";
            vehicle[COLS_CORTES.categoria-1]="Pickup";vehicle[COLS_CORTES.versionesAplicables-1]="2.4 Diesel";
            vehicle[COLS_CORTES.tipoEncendido-1]="Llave";
            vehicle[COLS_CORTES.anoDesde-1]=2018;vehicle[COLS_CORTES.anoHasta-1]=2022;
            const cuts=sheet([Array(42).fill(""),vehicle],42);
            const headers=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido","suggestionActorKey"];
            const lowerProblem="Sugerencia de ampliar rango inferior al año 2015";
            const lowerAnswer="El usuario indicó que corresponde a un modelo anterior.";
            const feedback=sheet([headers,
                ["F-OLD-A","A","VEH-OLDER-01",lowerProblem,lowerAnswer,"","","",2015,"user:USR-A"],
                ["F-OLD-B","B","VEH-OLDER-01",lowerProblem,lowerAnswer,"","","",2015,"user:USR-B"],
                ["F-OTHER-YEAR","Otro","VEH-OLDER-01","Sugerencia de ampliar rango inferior al año 2014",lowerAnswer,"","","",2014,"user:USR-X"],
                ["F-NEGATIVE","Negativo","VEH-OLDER-01","Modelo sin generaciones recientes registradas","El usuario indicó que la información no fue útil.","","","",2015,"user:USR-N"],
                ["F-OTHER-VEHICLE","Otro vehículo","VEH-OTHER","Sugerencia de ampliar rango inferior al año 2015",lowerAnswer,"","","",2015,"user:USR-Y"]
            ],10);
            let activities=[];
            try {
                assertFeedbackSession=p=>{if(!p||p.sessionToken!=="SESSION-C")throw Error("Sesión inválida");return {userId:"USR-C",userName:"Usuario C",role:"Tecnico"};};
                const yearApplicationSheets={};
                getSpreadsheet=()=>({getSheetByName:n=>n===SHEET_NAMES.CORTES?cuts:(yearApplicationSheets[n]||null),
                    insertSheet:n=>(yearApplicationSheets[n]=makeSheet([]))});
                getSafeSheet=n=>n===SHEET_NAMES.SUGERENCIAS_ANO||n===SHEET_NAMES.FEEDBACKS?feedback:null;
                logUserActivity=(...args)=>activities.push(args);
                LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
                SpreadsheetApp={flush(){}};
                movePrimaryVehicleImageToCanonicalFolder=()=>({skipped:true});
                const actor=authorizeFeedbackAction_("suggestYear",{sessionToken:"SESSION-C"});
                const result=handleSuggestYear({...actor,vehicleId:"VEH-OLDER-01",newYear:2015,response:"Es más antiguo"});
                assert_(result.status==="success"&&result.message.includes("3 aportantes distintos"),"El tercer voto «Es más antiguo» debe alcanzar el umbral: "+JSON.stringify(result));
                assert_(cuts.rows[1][COLS_CORTES.anoDesde-1]===2015&&cuts.rows[1][COLS_CORTES.anoHasta-1]===2022,"Debe ampliar únicamente el límite inferior a 2015.");
                const remainingIds=feedback.rows.slice(1).map(row=>row[0]);
                assert_(remainingIds.length===6,"Los registros originales deben conservarse con marcas de atención, además del voto nuevo: "+JSON.stringify(remainingIds));
                assert_(remainingIds.includes("F-OTHER-YEAR")&&remainingIds.includes("F-NEGATIVE")&&remainingIds.includes("F-OTHER-VEHICLE"),"La atención no debe alterar votos de otro año, respuestas negativas ni otro vehículo.");
                const appliedRows=feedback.rows.slice(1).filter(row=>String(row[9]||"").startsWith("applied:"));
                assert_(appliedRows.length===3&&appliedRows.some(row=>row[9]==="applied:user:USR-A")&&appliedRows.some(row=>row[9]==="applied:user:USR-B")&&appliedRows.some(row=>row[9]==="applied:user:USR-C"),
                    "Los tres aportes que alcanzaron el umbral deben marcarse como atendidos.");
                assert_(activities.some(a=>a[2]==="apply_year_suggestion"),"Debe registrarse la aplicación del rango.");
            } finally {
                assertFeedbackSession=oldAssert;getSpreadsheet=oldGet;getSafeSheet=oldSafe;logUserActivity=oldLog;
                LockService=oldLock;SpreadsheetApp=oldApp;movePrimaryVehicleImageToCanonicalFolder=oldMove;
            }
        });

        test_("suggestYear limpia todos los aportes positivos que participaron en una ampliación inferior", function() {
            const oldAssert=assertFeedbackSession,oldGet=getSpreadsheet,oldSafe=getSafeSheet;
            const oldLog=logUserActivity,oldLock=LockService,oldApp=SpreadsheetApp,oldMove=movePrimaryVehicleImageToCanonicalFolder;
            function sheet(rows,maxColumns) {
                return {
                    rows,getLastRow(){return this.rows.length;},
                    getLastColumn(){return Math.max(maxColumns||0,...this.rows.map(r=>r.length));},
                    getMaxColumns(){return maxColumns||this.getLastColumn();},
                    getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};},
                    getRange(r,c,h=1,w=1) {const self=this;return {
                        getValue(){return (self.rows[r-1]||[])[c-1]??"";},
                        getValues(){return Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>(self.rows[r-1+i]||[])[c-1+j]??""));},
                        setValue(v){while(self.rows.length<r)self.rows.push([]);while(self.rows[r-1].length<c)self.rows[r-1].push("");self.rows[r-1][c-1]=v;},
                        setValues(vs){vs.forEach((line,i)=>line.forEach((v,j)=>{while(self.rows.length<r+i)self.rows.push([]);while(self.rows[r-1+i].length<c+j)self.rows[r-1+i].push("");self.rows[r-1+i][c-1+j]=v;}));},
                        copyTo(target){target.setValues(this.getValues());},
                        clearContent(){for(let i=0;i<h;i++)for(let j=0;j<w;j++)if(self.rows[r-1+i])self.rows[r-1+i][c-1+j]="";}
                    };},
                    deleteRow(r){this.rows.splice(r-1,1);},
                    insertColumnsAfter(after,count){maxColumns=(maxColumns||this.getLastColumn())+count;this.rows.forEach(row=>{while(row.length<maxColumns)row.push("");});}
                };
            }
            const vehicle=Array(42).fill("");
            vehicle[COLS_CORTES.id-1]="VEH-LOWER-MIXED";
            vehicle[COLS_CORTES.marca-1]="Toyota";vehicle[COLS_CORTES.modelo-1]="Hilux";
            vehicle[COLS_CORTES.categoria-1]="Pickup";vehicle[COLS_CORTES.versionesAplicables-1]="2.4 Diesel";
            vehicle[COLS_CORTES.tipoEncendido-1]="Llave";
            vehicle[COLS_CORTES.anoDesde-1]=2018;vehicle[COLS_CORTES.anoHasta-1]=2022;
            const cuts=sheet([Array(42).fill(""),vehicle],42);
            const headers=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido","suggestionActorKey"];
            const inferior="Sugerencia de ampliar rango inferior al año 2015";
            const lowerAnswer="El usuario indicó que corresponde a un modelo anterior.";
            const feedback=sheet([headers,
                ["F-LOW-A","A","VEH-LOWER-MIXED",inferior,lowerAnswer,"","","",2015,"user:USR-A"],
                ["F-LOW-B","B","VEH-LOWER-MIXED",inferior,lowerAnswer,"","","",2015,"user:USR-B"],
                ["F-OTHER-YEAR","C","VEH-LOWER-MIXED","Sugerencia de ampliar rango al año 2015","La información funciona para el año 2015.","","","",2015,"user:USR-C"],
                ["F-NEGATIVE","Negativo","VEH-LOWER-MIXED","Reporte de información no funcional","El usuario indicó que la información no fue útil.","","","",2015,"user:USR-N"],
                ["F-DIFFERENT-YEAR","Otro año","VEH-LOWER-MIXED","Sugerencia de ampliar rango al año 2014","La información funciona para el año 2014.","","","",2014,"user:USR-X"],
                ["F-OTHER-VEHICLE","Otro vehículo","VEH-OTHER",inferior,lowerAnswer,"","","",2015,"user:USR-Y"]
            ],10);
            try {
                assertFeedbackSession=p=>{if(!p||p.sessionToken!=="SESSION-C")throw Error("Sesión inválida");return {userId:"USR-C",userName:"Usuario C",role:"Tecnico"};};
                const yearApplicationSheets={};
                getSpreadsheet=()=>({getSheetByName:n=>n===SHEET_NAMES.CORTES?cuts:(yearApplicationSheets[n]||null),
                    insertSheet:n=>(yearApplicationSheets[n]=makeSheet([]))});
                getSafeSheet=n=>n===SHEET_NAMES.SUGERENCIAS_ANO||n===SHEET_NAMES.FEEDBACKS?feedback:null;
                logUserActivity=function(){};
                LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
                SpreadsheetApp={flush(){}};
                movePrimaryVehicleImageToCanonicalFolder=()=>({skipped:true});
                const actor=authorizeFeedbackAction_("suggestYear",{sessionToken:"SESSION-C"});
                const result=handleSuggestYear({...actor,vehicleId:"VEH-LOWER-MIXED",newYear:2015,response:"Es más antiguo"});
                assert_(result.status==="success","La ampliación inferior debe aplicarse: "+JSON.stringify(result));
                assert_(cuts.rows[1][COLS_CORTES.anoDesde-1]===2015&&cuts.rows[1][COLS_CORTES.anoHasta-1]===2022,"Debe ampliar el límite inferior a 2015.");
                const remaining=feedback.rows.slice(1).map(row=>row[0]);
                assert_(remaining.length===6,"Los seis registros deben conservarse para mantener la deduplicación y el historial: "+JSON.stringify(remaining));
                assert_(remaining.includes("F-NEGATIVE")&&remaining.includes("F-DIFFERENT-YEAR")&&remaining.includes("F-OTHER-VEHICLE"),"La atención debe conservar respuestas negativas, otros años y otros vehículos.");
                const appliedRows=feedback.rows.slice(1).filter(row=>String(row[9]||"").startsWith("applied:"));
                assert_(appliedRows.length===3&&appliedRows.some(row=>row[9]==="applied:user:USR-A")&&appliedRows.some(row=>row[9]==="applied:user:USR-B")&&appliedRows.some(row=>row[9]==="applied:user:USR-C"),
                    "Debe marcar los aportes positivos mixtos que alcanzaron el umbral.");
            } finally {
                assertFeedbackSession=oldAssert;getSpreadsheet=oldGet;getSafeSheet=oldSafe;logUserActivity=oldLog;
                LockService=oldLock;SpreadsheetApp=oldApp;movePrimaryVehicleImageToCanonicalFolder=oldMove;
            }
        });

        test_("suggestYear valida la superposición del rango completo frente a otras generaciones", function() {
            const oldAssert=assertFeedbackSession, oldGet=getSpreadsheet, oldSafe=getSafeSheet;
            const oldLog=logUserActivity, oldLock=LockService, oldApp=SpreadsheetApp, oldMove=movePrimaryVehicleImageToCanonicalFolder;
            function sheet(rows) {
                return {rows,getLastRow(){return this.rows.length;},getLastColumn(){return Math.max(10,...this.rows.map(r=>r.length));},getMaxColumns(){return this.getLastColumn();},
                    getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};},
                    getRange(r,c,h=1,w=1) {const self=this;return {
                        getValue(){return (self.rows[r-1]||[])[c-1]??"";},
                        getValues(){return Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>(self.rows[r-1+i]||[])[c-1+j]??""));},
                        setValue(v){while(self.rows.length<r)self.rows.push([]);while(self.rows[r-1].length<c)self.rows[r-1].push("");self.rows[r-1][c-1]=v;},
                        setValues(vs){vs.forEach((line,i)=>line.forEach((v,j)=>{while(self.rows.length<r+i)self.rows.push([]);while(self.rows[r-1+i].length<c+j)self.rows[r-1+i].push("");self.rows[r-1+i][c-1+j]=v;}));},
                        copyTo(target){target.setValues(this.getValues());},
                        clearContent(){for(let i=0;i<h;i++)for(let j=0;j<w;j++)if(self.rows[r-1+i])self.rows[r-1+i][c-1+j]="";}
                    };},deleteRow(r){this.rows.splice(r-1,1);},insertColumnsAfter(){}};
            }
            function vehicle(id,from,to) {const r=Array(42).fill("");r[COLS_CORTES.id-1]=id;r[COLS_CORTES.marca-1]="Toyota";r[COLS_CORTES.modelo-1]="Hilux";r[COLS_CORTES.categoria-1]="Pickup";r[COLS_CORTES.versionesAplicables-1]="2.4 Diesel";r[COLS_CORTES.tipoEncendido-1]="Llave";r[COLS_CORTES.anoDesde-1]=from;r[COLS_CORTES.anoHasta-1]=to;return r;}
            function run(from,to,otherFrom,otherTo,year) {
                const cuts=sheet([Array(42).fill(""),vehicle("V-1",from,to),vehicle("V-2",otherFrom,otherTo)]);
                const headers=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido","suggestionActorKey"];
                const fb=sheet([headers,
                    ["F1","A","V-1","Confirmación de funcionamiento para año "+year,"Funciona","","","",year,"user:A"],
                    ["F2","B","V-1","Confirmación de funcionamiento para año "+year,"Funciona","","","",year,"user:B"]]);
                const activity=[];
                const yearApplicationSheets={};
                getSpreadsheet=()=>({getSheetByName:n=>n===SHEET_NAMES.CORTES?cuts:(yearApplicationSheets[n]||null),
                    insertSheet:n=>(yearApplicationSheets[n]=makeSheet([]))});
                getSafeSheet=n=>n===SHEET_NAMES.SUGERENCIAS_ANO?fb:null;
                logUserActivity=(...args)=>activity.push(args);
                const actor=authorizeFeedbackAction_("suggestYear",{sessionToken:"SESSION-C"});
                const result=handleSuggestYear({...actor,vehicleId:"V-1",newYear:year,response:"Sí (Funciona)"});
                return {cuts,fb,activity,result,actor};
            }
            try {
                assertFeedbackSession=p=>{if(!p||p.sessionToken!=="SESSION-C")throw Error("Sesión inválida");return {userId:"C",userName:"Usuario C",role:"Tecnico"};};
                LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};SpreadsheetApp={flush(){}};
                movePrimaryVehicleImageToCanonicalFolder=()=>({skipped:true});
                const collision=run(2018,2022,2023,2026,2027);
                assert_(collision.result.status==="warning","Debe detectar la superposición atravesada: "+JSON.stringify(collision.result));
                assert_(collision.cuts.rows[1][COLS_CORTES.anoHasta-1]===2022);
                assert_(collision.fb.rows.length===4,"Debe conservar los aportes para revisión.");
                assert_(collision.activity.some(a=>a[2]==="suggest_year_collision"));
                const collisionEventsBeforeRetry=collision.activity.filter(a=>a[2]==="suggest_year_collision").length;
                const retry=handleSuggestYear({...collision.actor,vehicleId:"V-1",newYear:2027,response:"Sí (Funciona)"});
                assert_(retry.status==="warning","El reintento debe conservar la advertencia de colisión.");
                assert_(collision.activity.filter(a=>a[2]==="suggest_year_collision").length===collisionEventsBeforeRetry,"El reintento idéntico no debe duplicar actividad de colisión.");
                const separate=run(2020,2024,2025,2030,2015);
                assert_(separate.result.status==="success","Rangos separados no deben bloquearse: "+JSON.stringify(separate.result));
                assert_(separate.cuts.rows[1][COLS_CORTES.anoDesde-1]===2015);
                assert_(separate.cuts.rows[2][COLS_CORTES.anoDesde-1]===2025);
                assert_(!separate.activity.some(a=>a[2]==="suggest_year_collision"));
            } finally {
                assertFeedbackSession=oldAssert;getSpreadsheet=oldGet;getSafeSheet=oldSafe;logUserActivity=oldLog;
                LockService=oldLock;SpreadsheetApp=oldApp;movePrimaryVehicleImageToCanonicalFolder=oldMove;
            }
        });

        test_("suggestYear rechaza rangos de catálogo inválidos antes de aplicar una ampliación", function() {
            const oldAssert=assertFeedbackSession,oldGet=getSpreadsheet,oldSafe=getSafeSheet;
            const oldLog=logUserActivity,oldLock=LockService,oldApp=SpreadsheetApp,oldMove=movePrimaryVehicleImageToCanonicalFolder;
            function sheet(rows) {
                return {rows,getLastRow(){return this.rows.length;},getLastColumn(){return Math.max(10,...this.rows.map(r=>r.length));},getMaxColumns(){return this.getLastColumn();},
                    getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};},
                    getRange(r,c,h=1,w=1){const self=this;return {
                        getValue(){return (self.rows[r-1]||[])[c-1]??"";},
                        getValues(){return Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>(self.rows[r-1+i]||[])[c-1+j]??""));},
                        setValue(v){while(self.rows.length<r)self.rows.push([]);while(self.rows[r-1].length<c)self.rows[r-1].push("");self.rows[r-1][c-1]=v;},
                        setValues(vs){vs.forEach((line,i)=>line.forEach((v,j)=>{while(self.rows.length<r+i)self.rows.push([]);while(self.rows[r-1+i].length<c+j)self.rows[r-1+i].push("");self.rows[r-1+i][c-1+j]=v;}));},
                        copyTo(target){target.setValues(this.getValues());},
                        clearContent(){for(let i=0;i<h;i++)for(let j=0;j<w;j++)if(self.rows[r-1+i])self.rows[r-1+i][c-1+j]="";}
                    };},deleteRow(r){this.rows.splice(r-1,1);},insertColumnsAfter(){}
                };
            }
            function vehicle(id,from,to) {
                const r=Array(42).fill("");r[COLS_CORTES.id-1]=id;r[COLS_CORTES.marca-1]="Toyota";
                r[COLS_CORTES.modelo-1]="Hilux";r[COLS_CORTES.categoria-1]="Pickup";
                r[COLS_CORTES.versionesAplicables-1]="2.4 Diesel";r[COLS_CORTES.tipoEncendido-1]="Llave";
                r[COLS_CORTES.anoDesde-1]=from;r[COLS_CORTES.anoHasta-1]=to;return r;
            }
            function feedbackFixture() {
                const h=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido","suggestionActorKey"];
                return sheet([h,
                    ["F1","A","V-INVALID","Confirmación de funcionamiento para año 2027","Funciona","","","",2027,"user:A"],
                    ["F2","B","V-INVALID","Confirmación de funcionamiento para año 2027","Funciona","","","",2027,"user:B"]]);
            }
            try {
                assertFeedbackSession=p=>{if(!p||p.sessionToken!=="SESSION-C")throw Error("Sesión inválida");return {userId:"C",userName:"Usuario C",role:"Tecnico"};};
                LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};SpreadsheetApp={flush(){}};
                movePrimaryVehicleImageToCanonicalFolder=()=>({skipped:true});
                let feedbackAccess=0,activities=[];
                const targetInvalid=sheet([Array(42).fill(""),vehicle("V-INVALID",2025,2020)]);
                const fbTarget=feedbackFixture();
                getSpreadsheet=()=>({getSheetByName:n=>n===SHEET_NAMES.CORTES?targetInvalid:null});
                getSafeSheet=n=>{if(n===SHEET_NAMES.SUGERENCIAS_ANO){feedbackAccess++;return fbTarget;}return null;};
                logUserActivity=(...args)=>activities.push(args);
                const actor=authorizeFeedbackAction_("suggestYear",{sessionToken:"SESSION-C"});
                let targetError="";
                try {handleSuggestYear({...actor,vehicleId:"V-INVALID",newYear:2027,response:"Sí (Funciona)"});}
                catch(error){targetError=error.message;}
                assert_(targetError.includes("rango de años del vehículo es inválido"),"Debe rechazar el rango objetivo invertido.");
                assert_(feedbackAccess===0,"No debe acceder a Feedbacks si el rango objetivo es inválido.");
                assert_(fbTarget.rows.length===3,"No debe registrar un voto con rango objetivo inválido.");
                assert_(targetInvalid.rows[1][COLS_CORTES.anoDesde-1]===2025&&targetInvalid.rows[1][COLS_CORTES.anoHasta-1]===2020,"No debe alterar el rango inválido.");

                const cuts=sheet([Array(42).fill(""),vehicle("V-INVALID",2018,2022),vehicle("V-PEER",2025,2020)]);
                const fb=feedbackFixture();
                getSpreadsheet=()=>({getSheetByName:n=>n===SHEET_NAMES.CORTES?cuts:null});
                getSafeSheet=n=>n===SHEET_NAMES.SUGERENCIAS_ANO?fb:null;
                activities=[];
                const result=handleSuggestYear({...actor,vehicleId:"V-INVALID",newYear:2027,response:"Sí (Funciona)"});
                assert_(result.status==="warning"&&result.message.includes("rango de años inválido"),"Una generación coincidente inválida debe derivarse a revisión manual: "+JSON.stringify(result));
                assert_(cuts.rows[1][COLS_CORTES.anoDesde-1]===2018&&cuts.rows[1][COLS_CORTES.anoHasta-1]===2022,"No debe modificar el rango objetivo.");
                assert_(cuts.rows[2][COLS_CORTES.anoDesde-1]===2025&&cuts.rows[2][COLS_CORTES.anoHasta-1]===2020,"No debe modificar el rango ajeno inválido.");
                assert_(fb.rows.length===4,"Debe conservar el tercer aporte para revisión.");
                assert_(activities.some(a=>a[2]==="suggest_year_range_review"),"Debe registrar la revisión de integridad del rango.");
                const reviewEventsBeforeRetry=activities.filter(a=>a[2]==="suggest_year_range_review").length;
                const retry=handleSuggestYear({...actor,vehicleId:"V-INVALID",newYear:2027,response:"Sí (Funciona)"});
                assert_(retry.status==="warning","El reintento debe conservar la advertencia de rango inválido.");
                assert_(activities.filter(a=>a[2]==="suggest_year_range_review").length===reviewEventsBeforeRetry,
                    "El reintento del mismo aportante no debe duplicar la actividad de revisión de rango.");
                assert_(!activities.some(a=>a[2]==="apply_year_suggestion"),"No debe registrar aplicación automática.");
            } finally {
                assertFeedbackSession=oldAssert;getSpreadsheet=oldGet;getSafeSheet=oldSafe;logUserActivity=oldLog;
                LockService=oldLock;SpreadsheetApp=oldApp;movePrimaryVehicleImageToCanonicalFolder=oldMove;
            }
        });

        test_("suggestYear registra aportes anónimos sin sumarlos al umbral de tres usuarios verificados", function() {
            const originalAssert=assertFeedbackSession, originalGetSpreadsheet=getSpreadsheet;
            const originalGetSafeSheet=getSafeSheet, originalLog=logUserActivity;
            const originalLock=LockService, originalSpreadsheetApp=SpreadsheetApp, originalCache=CacheService;
            function runtimeSheet(rows,maxColumns) {
                return {
                    rows:rows,
                    getLastRow:function(){return this.rows.length;},
                    getLastColumn:function(){return Math.max(maxColumns||0,...this.rows.map(row=>row.length));},
                    getMaxColumns:function(){return maxColumns||this.getLastColumn();},
                    getDataRange:function(){const self=this;return {getValues:()=>self.rows.map(row=>row.slice())};},
                    getRange:function(row,column,rowCount,columnCount){
                        const self=this,height=rowCount||1,width=columnCount||1;
                        return {
                            getValue:()=>((self.rows[row-1]||[])[column-1]===undefined?"":self.rows[row-1][column-1]),
                            getValues:()=>Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>((self.rows[row-1+r]||[])[column-1+c]===undefined?"":self.rows[row-1+r][column-1+c]))),
                            setValue:value=>{while(self.rows.length<row)self.rows.push([]);while(self.rows[row-1].length<column)self.rows[row-1].push("");self.rows[row-1][column-1]=value;},
                            setValues:values=>values.forEach((line,r)=>line.forEach((value,c)=>{while(self.rows.length<row+r)self.rows.push([]);while(self.rows[row-1+r].length<column+c)self.rows[row-1+r].push("");self.rows[row-1+r][column-1+c]=value;})),
                            copyTo:target=>{const source=Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>((self.rows[row-1+r]||[])[column-1+c]===undefined?"":self.rows[row-1+r][column-1+c])));target.setValues(source);},
                            clearContent:function(){for(let r=0;r<height;r++)for(let c=0;c<width;c++)if(self.rows[row-1+r])self.rows[row-1+r][column-1+c]="";}
                        };
                    },
                    insertColumnsAfter:function(after,count){maxColumns=(maxColumns||this.getLastColumn())+count;this.rows.forEach(line=>{while(line.length<maxColumns)line.push("");});}
                };
            }
            const cutHeader=Array(42).fill(""),vehicle=Array(42).fill("");
            vehicle[COLS_CORTES.id-1]="VEH-ANON-THRESHOLD";
            vehicle[COLS_CORTES.marca-1]="Marca";vehicle[COLS_CORTES.modelo-1]="Modelo";
            vehicle[COLS_CORTES.categoria-1]="Moto";vehicle[COLS_CORTES.versionesAplicables-1]="Versión";
            vehicle[COLS_CORTES.tipoEncendido-1]="Llave";
            vehicle[COLS_CORTES.anoDesde-1]=2018;vehicle[COLS_CORTES.anoHasta-1]=2022;
            const cuts=runtimeSheet([cutHeader,vehicle],42);
            const headers=["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido","suggestionActorKey"];
            const voteA=["F-001","Usuario A","VEH-ANON-THRESHOLD","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.","","","",2025,"user:USR-A"];
            const voteB=["F-002","Usuario B","VEH-ANON-THRESHOLD","Confirmación de funcionamiento para año 2025","La información funciona para el año 2025.","","","",2025,"user:USR-B"];
            const feedbackSheet=runtimeSheet([headers,voteA,voteB],10);
            let activityCount=0;
            try {
                assertFeedbackSession=function(){throw new Error("No debe requerirse sesión para el actor anónimo.");};
                getSpreadsheet=()=>({getSheetByName:name=>name===SHEET_NAMES.CORTES?cuts:null});
                getSafeSheet=name=>name===SHEET_NAMES.SUGERENCIAS_ANO?feedbackSheet:null;
                logUserActivity=function(){activityCount++;};
                LockService={getScriptLock:()=>({waitLock:function(){},releaseLock:function(){}})};
                SpreadsheetApp={flush:function(){}};
                CacheService={getScriptCache:()=>({get:()=>null,put:function(){}})};
                const actor=authorizeFeedbackAction_("suggestYear",{userId:"0",userName:"Anónimo",anonymousReporterId:"cliente-fabricado"});
                assert_(actor.suggestionActorKey==="anon:unverified","El actor anónimo debe recibir una clave no verificada.");
                const result=handleSuggestYear({...actor,vehicleId:"VEH-ANON-THRESHOLD",newYear:2025,response:"Sí (Funciona)"});
                assert_(feedbackSheet.rows.length===4,"El aporte anónimo debe quedar registrado como una fila adicional.");
                assert_(feedbackSheet.rows[3][9]==="anon:unverified","La fila anónima debe conservar la clave no verificada.");
                assert_(result.status==="info"&&result.message.includes("no cuenta para modificar automáticamente"),"Debe informar que el aporte anónimo requiere revisión manual.");
                assert_(cuts.rows[1][COLS_CORTES.anoHasta-1]===2022,"Dos usuarios verificados más un anónimo no deben alcanzar el umbral automático.");
                assert_(activityCount===1,"El aporte anónimo registrado debe generar una actividad.");
            } finally {
                assertFeedbackSession=originalAssert;getSpreadsheet=originalGetSpreadsheet;getSafeSheet=originalGetSafeSheet;
                logUserActivity=originalLog;LockService=originalLock;SpreadsheetApp=originalSpreadsheetApp;CacheService=originalCache;
            }
        });

        test_("El actor anónimo ignora el identificador fabricable del navegador", function() {
            const actor = resolveSuggestionYearActor({ userId: "0", anonymousReporterId: "fabricado" });
            assert_(actor.suggestionActorKey === "anon:unverified");
            assert_(!isVerifiedSuggestionActorKey_(actor.suggestionActorKey));
        });
        test_("El actor autenticado se deriva de la sesión validada", function() {
            const actor = resolveSuggestionYearActor({ userId: "FALSO", sessionToken: "TEST_SESSION" });
            assert_(actor.userId === "USR-TEST-01" && actor.suggestionActorKey === "user:USR-TEST-01");
            assert_(isVerifiedSuggestionActorKey_(actor.suggestionActorKey));
        });
        test_("addPrevention rechaza texto vacío y normaliza una prevención válida", function() {
            const originalGetSafeSheet = getSafeSheet;
            const originalLog = logUserActivity;
            const originalSpreadsheetApp = SpreadsheetApp;
            const rows = [
                ["id_problem", "Problema", "Descripción", "Se soluciono", "Solucion", "Prevenir"],
                ["isue-001", "Falla", "Detalle", "", "", ""]
            ];
            const sheet = makeSheet(rows);
            let activityCount = 0;
            try {
                getSafeSheet = () => sheet;
                logUserActivity = () => { activityCount++; };
                SpreadsheetApp = { flush: function() {} };
                expectThrow_(() => handleAddPrevention({
                    problemId: "isue-001", prevenir: "   \n  ", userId: "USR-TEST-01", userName: "Usuario verificado"
                }), "requeridos");
                assert_(rows[1][5] === "", "La prevención vacía no debe modificar la fila.");
                assert_(activityCount === 0, "La prevención vacía no debe generar actividad.");
                const result = handleAddPrevention({
                    problemId: "isue-001", prevenir: "  Revisar el cableado  ", userId: "USR-TEST-01", userName: "Usuario verificado"
                });
                assert_(result.status === "success");
                assert_(rows[1][5] === "Revisar el cableado", "La prevención válida debe persistirse normalizada.");
                assert_(activityCount === 1);
            } finally {
                getSafeSheet = originalGetSafeSheet;
                logUserActivity = originalLog;
                SpreadsheetApp = originalSpreadsheetApp;
            }
        });

        test_("addSolution rechaza texto vacío o solo espacios antes de modificar PyS", function() {
            const originalGetSafeSheet = getSafeSheet;
            const originalLog = logUserActivity;
            const originalSpreadsheetApp = SpreadsheetApp;
            const rows = [
                ["id_problem", "Problema", "Descripción", "Se soluciono", "Solucion"],
                ["isue-001", "Falla", "Detalle", "", ""]
            ];
            const sheet = makeSheet(rows);
            let activityCount = 0;
            try {
                getSafeSheet = () => sheet;
                logUserActivity = () => { activityCount++; };
                SpreadsheetApp = { flush: function() {} };
                expectThrow_(() => handleAddSolution({
                    problemId: "isue-001", solucion: "   \n  ", userId: "USR-TEST-01", userName: "Usuario verificado"
                }), "requeridos");
                assert_(rows[1][3] === "" && rows[1][4] === "", "La entrada vacía no debe marcar el problema como solucionado.");
                assert_(activityCount === 0, "La entrada vacía no debe generar actividad.");
                const result = handleAddSolution({
                    problemId: "isue-001", solucion: "  Solución válida  ", userId: "USR-TEST-01", userName: "Usuario verificado"
                });
                assert_(result.status === "success");
                assert_(rows[1][3] === "x" && rows[1][4] === "Solución válida",
                    "La solución válida debe persistirse sin espacios externos.");
                assert_(activityCount === 1);
            } finally {
                getSafeSheet = originalGetSafeSheet;
                logUserActivity = originalLog;
                SpreadsheetApp = originalSpreadsheetApp;
            }
        });

        test_("addProblem rechaza campos obligatorios y solución compuestos solo por espacios", function() {
            const base = {
                titulo: "Falla", descripcion: "Detalle", sinSolucion: false,
                solucion: "Solución", imgBase64: "data:image/jpeg;base64,AA==",
                userId: "USR-TEST-01", userName: "Usuario verificado"
            };
            expectThrow_(() => handleAddProblem({ ...base, titulo: "   " }), "Título y descripción");
            expectThrow_(() => handleAddProblem({ ...base, descripcion: "  \n " }), "Título y descripción");
            expectThrow_(() => handleAddProblem({ ...base, solucion: "  \n " }), "Debe proporcionar una solución");
        });

        test_("addProblem normaliza los textos antes de guardarlos en PyS", function() {
            const originalGetSafeSheet = getSafeSheet;
            const originalLog = logUserActivity;
            const originalLock = typeof LockService === "undefined" ? null : LockService;
            const originalSpreadsheetApp = SpreadsheetApp;
            const originalDriveApp = typeof DriveApp === "undefined" ? null : DriveApp;
            const originalUtilities = typeof Utilities === "undefined" ? null : Utilities;
            const sheet = makeSheet([["id_problem", "Problema", "Descripción", "Se soluciono", "Solucion", "Prevenir", "Imagen", "Video", "Colaborador", "modelos_asociados"]]);
            let activityTitle = "";
            const file = {
                setSharing: function() {},
                getUrl: () => "https://drive.google.test/file/problem-image",
                setTrashed: function() {}
            };
            try {
                getSafeSheet = () => sheet;
                logUserActivity = (userId, userName, action, id, title) => { activityTitle = title; };
                LockService = { getScriptLock: () => ({ waitLock: function() {}, releaseLock: function() {} }) };
                SpreadsheetApp = { flush: function() {} };
                DriveApp = {
                    getFoldersByName: () => ({ hasNext: () => true, next: () => ({ createFile: () => file }) }),
                    Access: { ANYONE_WITH_LINK: "anyone" },
                    Permission: { VIEW: "view" }
                };
                Utilities = { base64Decode: () => [1], newBlob: () => ({}) };
                const result = handleAddProblem({
                    titulo: "  Falla eléctrica  ", descripcion: "  Detalle del problema  ",
                    sinSolucion: false, solucion: "  Revisar conexión  ", prevenir: "  Aislar el cable  ",
                    imgBase64: "data:image/jpeg;base64,AA==", userId: "USR-TEST-01",
                    userName: "Usuario verificado"
                });
                assert_(result.status === "success");
                assert_(sheet.rows.length === 2);
                assert_(sheet.rows[1][1] === "Falla eléctrica");
                assert_(sheet.rows[1][2] === "Detalle del problema");
                assert_(sheet.rows[1][4] === "Revisar conexión");
                assert_(sheet.rows[1][5] === "Aislar el cable");
                assert_(activityTitle === "Falla eléctrica");
            } finally {
                getSafeSheet = originalGetSafeSheet;
                logUserActivity = originalLog;
                if (originalLock) LockService = originalLock; else LockService = undefined;
                SpreadsheetApp = originalSpreadsheetApp;
                if (originalDriveApp) DriveApp = originalDriveApp; else DriveApp = undefined;
                if (originalUtilities) Utilities = originalUtilities; else Utilities = undefined;
            }
        });

        test_("addProblem rechaza una imagen ausente", function() {
            expectThrow_(() => handleAddProblem({
                titulo: "Falla", descripcion: "Detalle", sinSolucion: true,
                userId: "USR-1", userName: "Usuario"
            }), "imagen del problema es obligatoria");
        });
        test_("Si falla la escritura PyS, el archivo creado se compensa", function() {
            let trashed = false;
            const sheet = {
                getLastRow: () => 1,
                getDataRange: () => ({ getValues: () => [["header"]] }),
                appendRow: () => { throw new Error("fallo controlado de appendRow"); }
            };
            getSafeSheet = () => sheet;
            LockService = { getScriptLock: () => ({ waitLock: function() {}, releaseLock: function() {} }) };
            SpreadsheetApp = { flush: function() {} };
            const file = {
                setSharing: function() {},
                getUrl: () => "https://drive.google.test/file/dummy",
                setTrashed: function(value) { trashed = value; }
            };
            const folder = { createFile: () => file };
            DriveApp = {
                getFoldersByName: () => ({ hasNext: () => true, next: () => folder }),
                Access: { ANYONE_WITH_LINK: "anyone" },
                Permission: { VIEW: "view" }
            };
            Utilities = { base64Decode: () => [1], newBlob: () => ({}) };
            expectThrow_(() => handleAddProblem({
                titulo: "Falla", descripcion: "Detalle", sinSolucion: true,
                imgBase64: "data:image/jpeg;base64,AA==", userId: "USR-1", userName: "Usuario"
            }), "fallo controlado");
            assert_(trashed === true, "El archivo no vinculado debe enviarse a papelera.");
        });
        test_("reportProblem crea un reporte una vez y reutiliza el resultado al reintentar", function() {
            const reportId = "REP-1731260000000-abc123";
            const rows = [Array(10).fill("header"), ["REP-TEMPLATE", "", "", "", "", "", "", "", "", ""]];
            const sheet = {
                rows,
                getLastRow: function() { return this.rows.length; },
                getLastColumn: function() { return 10; },
                getRange: function(row, column, numRows, numColumns) {
                    const self = this;
                    const rowCount = numRows === undefined ? 1 : numRows;
                    const columnCount = numColumns === undefined ? 1 : numColumns;
                    return {
                        getValue: function() { return self.rows[row - 1] ? self.rows[row - 1][column - 1] : undefined; },
                        getValues: function() {
                            return Array.from({ length: rowCount }, (_, r) =>
                                Array.from({ length: columnCount }, (_, c) =>
                                    self.rows[row - 1 + r] ? self.rows[row - 1 + r][column - 1 + c] : undefined
                                )
                            );
                        },
                        setValue: function(value) {
                            while (self.rows.length < row) self.rows.push(Array(10).fill(""));
                            self.rows[row - 1][column - 1] = value;
                        },
                        setValues: function(values) {
                            values.forEach((line, r) => line.forEach((value, c) => {
                                while (self.rows.length < row + r) self.rows.push(Array(10).fill(""));
                                self.rows[row - 1 + r][column - 1 + c] = value;
                            }));
                        },
                        copyTo: function(target) {
                            const values = this.getValues();
                            target.setValues(values);
                        },
                        clearContent: function() {
                            for (let r = 0; r < rowCount; r++) {
                                for (let c = 0; c < columnCount; c++) {
                                    if (self.rows[row - 1 + r]) self.rows[row - 1 + r][column - 1 + c] = "";
                                }
                            }
                        }
                    };
                }
            };
            const originalEnsure = ensureReportMetadataColumn;
            const originalLog = logUserActivity;
            let logCalls = 0;
            try {
                getSafeSheet = () => sheet;
                ensureReportMetadataColumn = () => 10;
                LockService = { getScriptLock: () => ({ waitLock: function() {}, releaseLock: function() {} }) };
                SpreadsheetApp = { flush: function() {} };
                logUserActivity = () => { logCalls++; };
                const payload = {
                    vehicleId: "VEH-1", problemText: "Falla intermitente",
                    userId: "USR-TEST-01", userName: "Usuario verificado",
                    reportId, corteIndex: 2, activaTestigoMotor: true
                };
                const first = handleReportProblem(payload);
                assert_(first.status === "success" && first.alreadyReported === false && first.reportId === reportId);
                assert_(sheet.rows.length === 3, "El primer envío debe crear una sola fila.");
                const savedMetadata = JSON.parse(sheet.rows[2][9]);
                assert_(savedMetadata.userId === "USR-TEST-01", "La metadata debe conservar la identidad validada.");
                const retry = handleReportProblem(payload);
                assert_(retry.status === "success" && retry.alreadyReported === true && retry.reportId === reportId);
                assert_(sheet.rows.length === 3, "El reintento no debe crear una segunda fila.");
                assert_(logCalls === 1, "El reintento no debe duplicar el registro de actividad.");
            } finally {
                ensureReportMetadataColumn = originalEnsure;
                logUserActivity = originalLog;
            }
        });
        test_("reportProblem rechaza reutilizar un reportId con datos distintos", function() {
            const reportId = "REP-1731260000001-def456";
            const metadata = { reportId, userId: "USR-TEST-01", vehicleId: "VEH-1", corteIndex: 2, activaTestigoMotor: true };
            const row = ["REP-ROW-2", "Usuario verificado", "VEH-1", "Falla original", "", "", "", "", "", JSON.stringify(metadata)];
            const sheet = makeSheet([Array(10).fill("header"), row]);
            const originalEnsure = ensureReportMetadataColumn;
            try {
                getSafeSheet = () => sheet;
                ensureReportMetadataColumn = () => 10;
                LockService = { getScriptLock: () => ({ waitLock: function() {}, releaseLock: function() {} }) };
                expectThrow_(() => handleReportProblem({
                    vehicleId: "VEH-1", problemText: "Texto modificado",
                    userId: "USR-TEST-01", userName: "Usuario verificado",
                    reportId, corteIndex: 2, activaTestigoMotor: true
                }), "ya pertenece a un reporte distinto");
                assert_(sheet.rows.length === 2, "El conflicto no debe crear otra fila.");
            } finally {
                ensureReportMetadataColumn = originalEnsure;
            }
        });
        test_("reportProblem bloquea reportId duplicados preexistentes", function() {
            const reportId = "REP-1731260000002-ghi789";
            const metadata = { reportId, userId: "USR-TEST-01", vehicleId: "VEH-1", corteIndex: 2, activaTestigoMotor: true };
            const row = ["REP-ROW-3", "Usuario verificado", "VEH-1", "Falla original", "", "", "", "", "", JSON.stringify(metadata)];
            const sheet = makeSheet([Array(10).fill("header"), row.slice(), row.slice()]);
            const originalEnsure = ensureReportMetadataColumn;
            try {
                getSafeSheet = () => sheet;
                ensureReportMetadataColumn = () => 10;
                LockService = { getScriptLock: () => ({ waitLock: function() {}, releaseLock: function() {} }) };
                expectThrow_(() => handleReportProblem({
                    vehicleId: "VEH-1", problemText: "Falla original",
                    userId: "USR-TEST-01", userName: "Usuario verificado",
                    reportId, corteIndex: 2, activaTestigoMotor: true
                }), "aparece duplicado");
                assert_(sheet.rows.length === 3, "El estado duplicado debe permanecer intacto para revisión.");
            } finally {
                ensureReportMetadataColumn = originalEnsure;
            }
        });

        test_("El límite de frecuencia público se aplica en el servidor", function() {
            const store = {};
            CacheService = { getScriptCache: () => ({
                get: key => store[key] || null,
                put: (key, value) => { store[key] = String(value); }
            }) };
            enforceFeedbackRateLimit_("test_scope", 1, 3600);
            expectThrow_(() => enforceFeedbackRateLimit_("test_scope", 1, 3600), "límite temporal");
        });

        function makeSheet(rows) {
            return {
                rows: rows,
                getLastRow: function() { return this.rows.length; },
                getLastColumn: function() { return this.rows.reduce((max, row) => Math.max(max, row.length), 0); },
                getDataRange: function() {
                    const self = this;
                    return { getValues: function() { return self.rows.map(row => row.slice()); } };
                },
                getRange: function(row, column, numRows, numColumns) {
                    const self = this;
                    const rowCount = numRows === undefined ? 1 : numRows;
                    const columnCount = numColumns === undefined ? 1 : numColumns;
                    return {
                        getValue: function() { return self.rows[row - 1] ? self.rows[row - 1][column - 1] : undefined; },
                        setValue: function(value) {
                            while (self.rows.length < row) self.rows.push([]);
                            while (self.rows[row - 1].length < column) self.rows[row - 1].push("");
                            self.rows[row - 1][column - 1] = value;
                        },
                        getValues: function() {
                            return Array.from({ length: rowCount }, (_, r) =>
                                Array.from({ length: columnCount }, (_, c) =>
                                    self.rows[row - 1 + r] ? self.rows[row - 1 + r][column - 1 + c] : undefined
                                )
                            );
                        },
                        setValues: function(values) {
                            values.forEach((line, r) => line.forEach((value, c) => {
                                while (self.rows.length < row + r) self.rows.push([]);
                                while (self.rows[row - 1 + r].length < column + c) self.rows[row - 1 + r].push("");
                                self.rows[row - 1 + r][column - 1 + c] = value;
                            }));
                        }
                    };
                },
                appendRow: function(row) { this.rows.push(row.slice()); }
            };
        }

        function createLikeRuntime_(vehicleId, duplicateVehicle) {
            const maxColumn = Math.max(COLS_CORTES.id, COLS_CORTES.tipoCorte1, COLS_CORTES.utilCorte1);
            const header = Array(maxColumn).fill("");
            const vehicle = Array(maxColumn).fill("");
            vehicle[COLS_CORTES.id - 1] = vehicleId;
            vehicle[COLS_CORTES.tipoCorte1 - 1] = "Relay";
            vehicle[COLS_CORTES.utilCorte1 - 1] = 0;
            const rows = duplicateVehicle ? [header, vehicle, vehicle.slice()] : [header, vehicle];
            const cuts = makeSheet(rows);
            const sheets = {};
            const spreadsheet = {
                getSheetByName: name => sheets[name] || null,
                insertSheet: name => (sheets[name] = makeSheet([]))
            };
            getSpreadsheet = () => spreadsheet;
            getSafeSheet = () => cuts;
            LockService = { getScriptLock: () => ({ waitLock: function() {}, releaseLock: function() {} }) };
            SpreadsheetApp = { flush: function() {} };
            logUserActivity = function() {};
            return { cuts, sheets };
        }

        test_("suggestCutChange devuelve el registro existente ante un reintento idéntico", function() {
            const originalGetSafeSheet = getSafeSheet;
            const originalLog = logUserActivity;
            const originalLock = LockService;
            const originalSpreadsheetApp = SpreadsheetApp;
            const rows = [Array(8).fill("header")];
            const sheet = makeSheet(rows);
            let activityCount = 0;
            try {
                getSafeSheet = () => sheet;
                logUserActivity = () => { activityCount++; };
                LockService = { getScriptLock: () => ({ waitLock: function() {}, releaseLock: function() {} }) };
                SpreadsheetApp = { flush: function() {} };
                const payload = {
                    reportId: "REP-CUT-001", vehicleId: "VEH-CUT-1", corteIndex: 2,
                    userId: "USR-TEST-01", userName: "Usuario verificado",
                    details: "Ubicación del cable", proposedValues: { tipo: "Relay", activaTestigo: true }
                };
                const first = handleSuggestCutChange(payload);
                const retry = handleSuggestCutChange(payload);
                assert_(first.status === "success" && !first.alreadySuggested);
                assert_(retry.status === "success" && retry.alreadySuggested);
                assert_(sheet.rows.length === 2, "El reintento no debe insertar otra fila.");
                assert_(activityCount === 1, "El reintento no debe duplicar la actividad.");
            } finally {
                getSafeSheet = originalGetSafeSheet;
                logUserActivity = originalLog;
                LockService = originalLock;
                SpreadsheetApp = originalSpreadsheetApp;
            }
        });
        test_("suggestCutChange rechaza reutilizar reportId con contenido distinto", function() {
            const originalGetSafeSheet = getSafeSheet;
            const originalLog = logUserActivity;
            const originalLock = LockService;
            const originalSpreadsheetApp = SpreadsheetApp;
            const sheet = makeSheet([Array(8).fill("header")]);
            let activityCount = 0;
            try {
                getSafeSheet = () => sheet;
                logUserActivity = () => { activityCount++; };
                LockService = { getScriptLock: () => ({ waitLock: function() {}, releaseLock: function() {} }) };
                SpreadsheetApp = { flush: function() {} };
                const payload = {
                    reportId: "REP-CUT-002", vehicleId: "VEH-CUT-2", corteIndex: 1,
                    userId: "USR-TEST-01", userName: "Usuario verificado",
                    details: "Detalle original", proposedValues: { tipo: "Relay" }
                };
                handleSuggestCutChange(payload);
                expectThrow_(() => handleSuggestCutChange({ ...payload, details: "Detalle alterado" }), "datos distintos");
                assert_(sheet.rows.length === 2 && activityCount === 1);
            } finally {
                getSafeSheet = originalGetSafeSheet;
                logUserActivity = originalLog;
                LockService = originalLock;
                SpreadsheetApp = originalSpreadsheetApp;
            }
        });
        test_("suggestCutChange bloquea reportId con registros duplicados preexistentes", function() {
            const originalGetSafeSheet = getSafeSheet;
            const originalLock = LockService;
            const record = {
                subType: "suggestion_cut", reportId: "REP-CUT-DUP",
                vehicleId: "VEH-CUT-3", corteIndex: 3, userId: "USR-TEST-01",
                requestFingerprint: "fingerprint"
            };
            const row = Array(8).fill("");
            row[COLS_FEEDBACKS.Problema - 1] = JSON.stringify(record);
            try {
                getSafeSheet = () => makeSheet([Array(8).fill("header"), row.slice(), row.slice()]);
                LockService = { getScriptLock: () => ({ waitLock: function() {}, releaseLock: function() {} }) };
                expectThrow_(() => handleSuggestCutChange({
                    reportId: "REP-CUT-DUP", vehicleId: "VEH-CUT-3", corteIndex: 3,
                    userId: "USR-TEST-01", userName: "Usuario verificado",
                    details: "Detalle", proposedValues: {}
                }), "aparece duplicada");
            } finally {
                getSafeSheet = originalGetSafeSheet;
                LockService = originalLock;
            }
        });

        test_("Los likes son idempotentes por actor, vehículo y corte", function() {
            const runtime = createLikeRuntime_("VEH-1", false);
            const first = handleRecordLike({ vehicleId: "VEH-1", corteIndex: 1, userId: "USR-1", userName: "Uno" });
            assert_(first.status === "success" && runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] === 1);
            const duplicate = handleRecordLike({ vehicleId: "VEH-1", corteIndex: 1, userId: "USR-1", userName: "Uno" });
            assert_(duplicate.alreadyLiked && runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] === 1);
            handleRecordLike({ vehicleId: "VEH-1", corteIndex: 1, userId: "USR-2", userName: "Dos" });
            assert_(runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] === 2);
            assert_(runtime.sheets.FeedbackLikes.rows[1][5] === "completed" && runtime.sheets.FeedbackLikes.rows[2][5] === "completed");
        });
        test_("El like recupera un incremento pendiente sin duplicarlo", function() {
            const runtime = createLikeRuntime_("VEH-2", false);
            runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] = 0;
            const ledger = makeSheet([
                ["actorKey", "vehicleId", "corteIndex", "previousCount", "targetCount", "status", "createdAt"],
                ["user:USR-1", "VEH-2", 1, 0, 1, "pending", "2026-11-10T00:00:00.000Z"]
            ]);
            runtime.sheets.FeedbackLikes = ledger;
            const result = handleRecordLike({ vehicleId: "VEH-2", corteIndex: 1, userId: "USR-1", userName: "Uno" });
            assert_(result.recovered && runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] === 1);
            assert_(ledger.rows[1][5] === "completed");
        });
        test_("Un contador inválido bloquea el like sin sobrescribirlo", function() {
            const runtime = createLikeRuntime_("VEH-3", false);
            runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] = "dato-inválido";
            expectThrow_(() => handleRecordLike({ vehicleId: "VEH-3", corteIndex: 1, userId: "USR-1", userName: "Uno" }), "contador de likes");
            assert_(runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] === "dato-inválido", "El contador inválido no debe sobrescribirse.");
        });
        test_("Un ID de vehículo duplicado bloquea el like", function() {
            const runtime = createLikeRuntime_("DUP", true);
            expectThrow_(() => handleRecordLike({ vehicleId: "DUP", corteIndex: 1, userId: "USR-1", userName: "Uno" }), "ID duplicado");
            assert_(runtime.cuts.rows[1][COLS_CORTES.utilCorte1 - 1] === 0);
        });
    } finally {
        assertFeedbackSession = oldAssert;
        getSpreadsheet = oldGetSpreadsheet;
        getSafeSheet = oldGetSafeSheet;
        ensureReportMetadataColumn = oldEnsureReportMetadataColumn;
        logUserActivity = oldLog;
        if (oldCache) CacheService = oldCache;
        if (oldLock) LockService = oldLock;
        if (oldSpreadsheetApp) SpreadsheetApp = oldSpreadsheetApp;
        if (oldDriveApp) DriveApp = oldDriveApp;
        if (oldUtilities) Utilities = oldUtilities;
    }

    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}
