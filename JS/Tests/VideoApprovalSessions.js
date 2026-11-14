// Pruebas aisladas de autenticación y autorización FEEDBACK para operaciones de vídeo.
// Requiere cargar Services/feedback.js y ejecutar runVideoApprovalSessionTests().
function runVideoApprovalSessionTests() {
    const results=[];let passed=0,failed=0;
    const oldGetSpreadsheet=getSpreadsheet;
    function assert_(v,m){if(!v)throw new Error(m||"Aserción fallida.");}
    function expect_(fn,t){let e=null;try{fn();}catch(x){e=x;}assert_(!!e,"Se esperaba rechazo.");if(t)assert_(String(e.message||e).includes(t),"Error inesperado: "+String(e.message||e));}
    function run_(n,fn){try{fn();passed++;results.push({name:n,status:"PASS"});}catch(e){failed++;results.push({name:n,status:"FAIL",message:String(e.message||e)});}}
    function sheet_(rows){return{getDataRange:()=>({getValues:()=>rows}),getRange:(row,column)=>({setValue:value=>{rows[row-1][column-1]=value;}})};}
    function setup_(options){
        options=options||{};
        const now=new Date();
        const session=["user-1","usuario","token-1",new Date(now.getTime()-60000),"",new Date(now.getTime()-1000)];
        const user=["user-1","usuario","","Desarrollador","","","Técnico",""];
        if(options.expired)session[5]=new Date(now.getTime()-35*24*60*60*1000);
        if(options.revoked)user[7]=ROLE_REVOCATION_SHARED_PREFIX+"pending";
        if(options.role)user[3]=options.role;
        const sessions=[["ID","Usuario","SessionToken","CreatedAt","X","LastActivityAt"],session];
        const users=[["ID","Username","Password","Privilegios","X","X","Nombre","Revocation"],user];
        if(options.duplicateToken)sessions.push(session.slice());
        if(options.duplicateUser)users.push(user.slice());
        getSpreadsheet=()=>({getSheetByName:name=>name==="ActiveSessions"?sheet_(sessions):name==="Users"?sheet_(users):null});
    }
    try{
        run_("acepta sesión vigente y devuelve rol de servidor",()=>{
            setup_();const actor=assertFeedbackSession({userId:"user-1",sessionToken:"token-1"},null);
            assert_(actor.userId==="user-1"&&actor.role==="Desarrollador");
        });
        run_("actualiza LastActivityAt solo después de validar la sesión",()=>{setup_();const before=getSpreadsheet().getSheetByName("ActiveSessions").getDataRange().getValues()[1][5];assertFeedbackSession({userId:"user-1",sessionToken:"token-1"},null);const after=getSpreadsheet().getSheetByName("ActiveSessions").getDataRange().getValues()[1][5];assert_(after!==before&&Number.isFinite(new Date(after).getTime()),"La actividad debe quedar actualizada en el servidor.");});
        run_("no actualiza actividad si el rol solicitado no está permitido",()=>{setup_();const before=getSpreadsheet().getSheetByName("ActiveSessions").getDataRange().getValues()[1][5];expect_(()=>assertFeedbackSession({userId:"user-1",sessionToken:"token-1"},["Supervisor"]),"sesión no autorizada");const after=getSpreadsheet().getSheetByName("ActiveSessions").getDataRange().getValues()[1][5];assert_(after===before,"Una solicitud no autorizada no debe renovar la sesión.");});
        run_("rechaza sesión ausente",()=>{setup_();expect_(()=>assertFeedbackSession({userId:"user-1"},null),"sesión no autorizada");});
        run_("rechaza token inválido",()=>{setup_();expect_(()=>assertFeedbackSession({userId:"user-1",sessionToken:"wrong"},null),"sesión inválida");});
        run_("rechaza userId/token cruzados",()=>{setup_();expect_(()=>assertFeedbackSession({userId:"user-2",sessionToken:"token-1"},null),"sesión inválida");});
        run_("rechaza sesión revocada por cambio de rol",()=>{setup_({revoked:true});expect_(()=>assertFeedbackSession({userId:"user-1",sessionToken:"token-1"},null),"revocación de rol pendiente");});
        run_("rechaza sesión expirada",()=>{setup_({expired:true});expect_(()=>assertFeedbackSession({userId:"user-1",sessionToken:"token-1"},null),"sesión inválida");});
        run_("rechaza perfil con rol no activo",()=>{setup_({role:"Invitado"});expect_(()=>assertFeedbackSession({userId:"user-1",sessionToken:"token-1"},null),"sesión no autorizada");});
        run_("rechaza rol no permitido aunque la sesión sea válida",()=>{setup_();expect_(()=>assertFeedbackSession({userId:"user-1",sessionToken:"token-1"},["Supervisor"]),"sesión no autorizada");});
        run_("rechaza token duplicado",()=>{setup_({duplicateToken:true});expect_(()=>assertFeedbackSession({userId:"user-1",sessionToken:"token-1"},null),"sesión inválida");});
        run_("rechaza perfil duplicado",()=>{setup_({duplicateUser:true});expect_(()=>assertFeedbackSession({userId:"user-1",sessionToken:"token-1"},null),"perfil de usuario ausente o ambiguo");});
        run_("todas las acciones protegidas de AUG-043 exigen sesión vigente",()=>{
            const actions=["addVehicleToProblem","removeVehicleFromProblem","updatePysItem","updateTutorialItem","initYouTubeUpload","getVideoApprovalByOperation","submitVideoForApproval"];
            actions.forEach(action=>{
                assert_(Object.prototype.hasOwnProperty.call(FEEDBACK_ACTION_PERMISSIONS,action),"Falta política para "+action);
                setup_();
                expect_(()=>authorizeFeedbackAction_(action,{userId:"user-1"}),"sesión");
            });
        });
        run_("FEEDBACK sustituye el rol y nombre falsificados por los valores de Users",()=>{
            setup_();
            const authorized=authorizeFeedbackAction_("approveVideo",{
                userId:"user-1",sessionToken:"token-1",userRole:"Supervisor",userName:"Nombre falso"
            });
            assert_(authorized.userRole==="Desarrollador"&&authorized.userName==="Técnico"&&authorized.approverName==="Técnico");
        });
        run_("rol ordinario no puede editar PyS ni Tutorial aunque se declare Desarrollador en el payload",()=>{
            setup_({role:"Tecnico"});
            expect_(()=>authorizeFeedbackAction_("updatePysItem",{userId:"user-1",sessionToken:"token-1",userRole:"Desarrollador"}),"sesión no autorizada");
            setup_({role:"Tecnico"});
            expect_(()=>authorizeFeedbackAction_("updateTutorialItem",{userId:"user-1",sessionToken:"token-1",userRole:"Desarrollador"}),"sesión no autorizada");
        });
    }finally{getSpreadsheet=oldGetSpreadsheet;}
    return{status:failed===0?"PASS":"FAIL",passed,failed,results};
}
