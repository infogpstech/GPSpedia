// Pruebas aisladas de autenticación FEEDBACK: el Coordinator entrega el actor confiable.
function runVideoApprovalSessionTests() {
    const results=[];let passed=0,failed=0;
    function assert_(v,m){if(!v)throw new Error(m||"Aserción fallida.");}
    function expect_(fn,text){let error=null;try{fn();}catch(e){error=e;}assert_(!!error,"Se esperaba rechazo.");if(text)assert_(String(error.message||error).includes(text),"Error inesperado: "+String(error.message||error));}
    function run_(name,fn){try{fn();passed++;results.push({name,status:"PASS"});}catch(e){failed++;results.push({name,status:"FAIL",message:String(e.message||e)});}}
    const actorPayload=(role="Desarrollador",userId="user-1",epoch=1)=>({
        userId,sessionToken:"token-1",userRole:"Desarrollador",userName:"Nombre falsificado",
        __sharedSessionActor:{userId,role:String(role).toLowerCase(),fullName:"Nombre Servidor",epoch}
    });
    run_("acepta actor central vigente y devuelve su identidad/rol",()=>{
        const actor=assertFeedbackSession(actorPayload("Desarrollador"),null);
        assert_(actor.userId==="user-1"&&actor.role==="Desarrollador"&&actor.userName==="Nombre Servidor"&&actor.epoch===1);
    });
    run_("rechaza sesión sin actor central aunque el cliente envíe token",()=>{
        expect_(()=>assertFeedbackSession({userId:"user-1",sessionToken:"token-1"},null),"contexto de sesión compartido");
    });
    run_("rechaza identidad solicitada distinta al actor",()=>{
        const payload=actorPayload("Desarrollador");payload.userId="user-2";
        expect_(()=>assertFeedbackSession(payload,null),"sesión no autorizada");
    });
    run_("rechaza actor con epoch inválido",()=>{
        expect_(()=>assertFeedbackSession(actorPayload("Desarrollador","user-1",0),null),"contexto de sesión compartido");
    });
    run_("rechaza rol desconocido o heredado",()=>{
        expect_(()=>assertFeedbackSession(actorPayload("Gefe"),null),"sesión no autorizada");
        expect_(()=>assertFeedbackSession(actorPayload("Invitado"),null),"sesión no autorizada");
    });
    run_("rechaza rol válido que no está autorizado para la acción",()=>{
        expect_(()=>assertFeedbackSession(actorPayload("Tecnico"),["Desarrollador"]),"sesión no autorizada");
    });
    run_("acepta los cinco roles activos del contexto central",()=>{
        const expected={Desarrollador:"Desarrollador",Jefe:"Jefe",Supervisor:"Supervisor",Tecnico:"Tecnico",Tecnico_exterior:"Tecnico_exterior"};
        for(const [role,display] of Object.entries(expected))assert_(assertFeedbackSession(actorPayload(role),null).role===display);
    });
    run_("todas las acciones protegidas rechazan payload sin actor central",()=>{
        for(const action of Object.keys(FEEDBACK_ACTION_PERMISSIONS)){
            expect_(()=>authorizeFeedbackAction_(action,{userId:"user-1",sessionToken:"token-1"}),"contexto de sesión compartido");
        }
    });
    run_("FEEDBACK sustituye rol y nombre falsificados por los del actor central",()=>{
        const authorized=authorizeFeedbackAction_("approveVideo",actorPayload("Desarrollador"));
        assert_(authorized.userRole==="Desarrollador"&&authorized.userName==="Nombre Servidor"&&authorized.approverName==="Nombre Servidor");
    });
    run_("rol ordinario no puede editar PyS ni Tutorial aunque el payload se declare Desarrollador",()=>{
        expect_(()=>authorizeFeedbackAction_("updatePysItem",actorPayload("Tecnico")),"sesión no autorizada");
        expect_(()=>authorizeFeedbackAction_("updateTutorialItem",actorPayload("Tecnico")),"sesión no autorizada");
    });
    run_("el helper de FEEDBACK no consulta Users ni ActiveSessions",()=>{
        const helper=String(assertFeedbackSession);
        assert_(!/getSpreadsheet|ActiveSessions|Users|findUniqueRowsByExactValue_/.test(helper));
    });
    return{status:failed===0?"PASS":"FAIL",passed,failed,results};
}
