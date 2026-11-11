// Pruebas locales de autorización y contrato de edición in-modal para AUG-053.
// Cargar Services/admin.js y ejecutar runAdminModalEditSecurityTests().
function runAdminModalEditSecurityTests() {
    const results=[];let passed=0,failed=0;
    function assert_(v,m){if(!v)throw new Error(m||"Aserción fallida.");}
    function expect_(fn,t){let e=null;try{fn();}catch(x){e=x;}assert_(!!e,"Se esperaba rechazo.");if(t)assert_(String(e.message||e).includes(t),"Error inesperado: "+String(e.message||e));}
    function run_(n,fn){try{fn();passed++;results.push({name:n,status:"PASS"});}catch(e){failed++;results.push({name:n,status:"FAIL",message:String(e.message||e)});}}
    function dataSheet_(rows){return{getDataRange:()=>({getValues:()=>rows})};}
    const oldGet=getSpreadsheet,oldLedger=getOrCreateAdminImageUploadsSheet,oldFind=findAdminImageUploadOperation;
    function session_(role,options){
        options=options||{};const now=new Date();
        const session=["USR-T","user","TOKEN-T",new Date(now.getTime()-60000),"",new Date(now.getTime()-1000)];
        const user=["USR-T","user","hash",role,"","","Test User",""];
        if(options.expired)session[5]=new Date(now.getTime()-32*86400000);
        if(options.revoked)user[7]=ROLE_REVOCATION_SHARED_PREFIX+"pending";
        const sessions=[["ID","User","Token","Created","","Activity"],session];
        const users=[["ID","User","Password","Role","","","Name","Revocation"],user];
        if(options.duplicateToken)sessions.push(session.slice());
        if(options.duplicateUser)users.push(user.slice());
        getSpreadsheet=()=>({getSheetByName:n=>n==="ActiveSessions"?dataSheet_(sessions):n==="Users"?dataSheet_(users):null});
    }
    try{
        run_("Desarrollador y Gefe validan sesión vigente para el modal",()=>{
            session_("Desarrollador");assert_(assertModalEditSession({userId:"USR-T",sessionToken:"TOKEN-T"}).role==="Desarrollador");
            session_("Gefe");assert_(assertModalEditSession({userId:"USR-T",sessionToken:"TOKEN-T"}).role==="Gefe");
        });
        run_("jefe y roles ajenos quedan excluidos",()=>{
            ["Jefe","Supervisor","Técnico","Invitado"].forEach(r=>{session_(r);expect_(()=>assertModalEditSession({userId:"USR-T",sessionToken:"TOKEN-T"}),"sesión no autorizada");});
        });
        run_("las demás acciones ADMIN siguen siendo exclusivas de Desarrollador",()=>{
            session_("Gefe");expect_(()=>assertDeveloperSession({userId:"USR-T",sessionToken:"TOKEN-T"}),"sesión no autorizada");
            session_("Desarrollador");assert_(assertDeveloperSession({userId:"USR-T",sessionToken:"TOKEN-T"}).role==="Desarrollador");
        });
        run_("rechaza token ausente/cruzado/duplicado/expirado y perfil duplicado",()=>{
            session_("Gefe");expect_(()=>assertModalEditSession({userId:"USR-T"}),"sesión no autorizada");
            expect_(()=>assertModalEditSession({userId:"OTHER",sessionToken:"TOKEN-T"}),"sesión inválida");
            session_("Gefe",{duplicateToken:true});expect_(()=>assertModalEditSession({userId:"USR-T",sessionToken:"TOKEN-T"}),"sesión inválida");
            session_("Gefe",{expired:true});expect_(()=>assertModalEditSession({userId:"USR-T",sessionToken:"TOKEN-T"}),"sesión inválida");
            session_("Gefe",{duplicateUser:true});expect_(()=>assertModalEditSession({userId:"USR-T",sessionToken:"TOKEN-T"}),"perfil de usuario");
        });
        run_("rechaza revocación pendiente y cuenta desactivada",()=>{
            session_("Gefe",{revoked:true});expect_(()=>assertModalEditSession({userId:"USR-T",sessionToken:"TOKEN-T"}),"revocación de rol");
            const now=new Date();getSpreadsheet=()=>({getSheetByName:n=>n==="ActiveSessions"?dataSheet_([[],["USR-T","u","TOKEN-T",now,"",now]]):n==="Users"?dataSheet_([[],["USR-T","__deleted__:u","","Gefe"]]):null});
            expect_(()=>assertModalEditSession({userId:"USR-T",sessionToken:"TOKEN-T"}),"cuenta inactiva");
        });
        run_("solo tres acciones del modal admiten Gefe",()=>{
            assert_(ADMIN_MODAL_EDIT_ACTIONS.size===3);
            ["updateVehicleField","uploadAdminImage","getAdminImageUploadStatus"].forEach(a=>assert_(ADMIN_MODAL_EDIT_ACTIONS.has(a)));
            ["backupDatabase","driveCommand","getReplacedImages","recoverReplacedImage","getDriveStorage","reconcilePendingImageUploads"].forEach(a=>assert_(!ADMIN_MODAL_EDIT_ACTIONS.has(a)));
        });
        run_("whitelist cubre campos generales, descriptivos, dinámicos e imágenes",()=>{
            ["categoria","modelo","versionesAplicables","tipoEncendido","anoDesde","anoHasta","vin","notaImportante","apertura","cableAlimen","cableAlimen2","cableAlimen3","imagenVehiculo","imgCorte1","imgCorte2","imgCorte3","imgApertura","imgCableAlimen","imgCableAlimen2","imgCableAlimen3"].forEach(f=>assert_(isAdminModalEditField_(f),f));
            ["tipoCorte","configRelay","ubicacionCorte","colorCableCorte"].forEach(prefix=>[1,2,3].forEach(i=>assert_(isAdminModalEditField_(prefix+i),prefix+i)));
        });
        run_("whitelist deniega columnas ajenas al modal",()=>{
            ["id","marca","videoGuiaDesarmeUrl","contadorBusqueda","utilCorte1","colaboradorCorte1","timestamp","activaTestigo1"].forEach(f=>assert_(!isAdminModalEditField_(f),f));
        });
        run_("consulta de estado informa not_found y URL actual",()=>{
            const rows=[Array(42).fill(""),Array(42).fill("")];rows[1][COLS_CORTES.id-1]="VEH-1";rows[1][COLS_CORTES.imgCorte1-1]="https://drive.google.com/active";
            const cuts={getLastRow:()=>2,getRange:(r,c,n,w)=>({getValues:()=>Array.from({length:n||1},(_,i)=>Array.from({length:w||1},(_,j)=>rows[r-1+i][c-1+j])),getValue:()=>rows[r-1][c-1]})};
            getSpreadsheet=()=>({getSheetByName:n=>n===SHEET_NAMES.CORTES?cuts:null});getOrCreateAdminImageUploadsSheet=()=>({});findAdminImageUploadOperation=()=>null;
            const result=handleGetAdminImageUploadStatus({vehicleId:"VEH-1",fieldName:"imgCorte1",opId:"12345678901234567890"},()=>{});
            assert_(result.status==="success"&&result.operationStatus==="not_found"&&result.currentImageUrl==="https://drive.google.com/active");
        });
        run_("consulta de estado rechaza operación asociada a otro vehículo y campos ajenos",()=>{
            const rows=[Array(42).fill(""),Array(42).fill("")];rows[1][COLS_CORTES.id-1]="VEH-1";
            const cuts={getLastRow:()=>2,getRange:(r,c,n,w)=>({getValues:()=>Array.from({length:n||1},(_,i)=>Array.from({length:w||1},(_,j)=>rows[r-1+i][c-1+j])),getValue:()=>rows[r-1][c-1]})};
            getSpreadsheet=()=>({getSheetByName:n=>n===SHEET_NAMES.CORTES?cuts:null});getOrCreateAdminImageUploadsSheet=()=>({});
            findAdminImageUploadOperation=()=>({values:["op","VEH-OTHER","imgCorte1"]});
            expect_(()=>handleGetAdminImageUploadStatus({vehicleId:"VEH-1",fieldName:"imgCorte1",opId:"12345678901234567890"},()=>{}),"no corresponde");
            expect_(()=>handleGetAdminImageUploadStatus({vehicleId:"VEH-1",fieldName:"videoGuiaDesarmeUrl",opId:"12345678901234567890"},()=>{}),"Parámetros inválidos");
        });
    }finally{getSpreadsheet=oldGet;getOrCreateAdminImageUploadsSheet=oldLedger;findAdminImageUploadOperation=oldFind;}
    return{status:failed===0?"PASS":"FAIL",passed,failed,results};
}
