const VIDEO_TUTORIAL_HEADERS = ["ID", "Tema", "Imagen", "comoIdentificarlo", "dondeEncontrarlo", "Detalles", "Video", "Colaborador"];

// Pruebas aisladas de publicación, rechazo y recuperación de vídeos aprobados.
// Requiere cargar Services/feedback.js.
function runVideoApprovalPublishingTests() {
    const results=[];let passed=0,failed=0;
    const oldGetSafe=getSafeSheet,oldGetSpreadsheet=getSpreadsheet,oldUuid=Utilities.getUuid,oldFormat=Utilities.formatDate,oldTimezone=Session.getScriptTimeZone,oldFlush=SpreadsheetApp.flush;
    function assert_(v,m){if(!v)throw new Error(m||"Aserción fallida.");}
    function expect_(fn,t){let e=null;try{fn();}catch(x){e=x;}assert_(!!e,"Se esperaba rechazo.");if(t)assert_(String(e.message||e).includes(t),"Error inesperado: "+String(e.message||e));}
    function run_(n,fn){try{fn();passed++;results.push({name:n,status:"PASS"});}catch(e){failed++;results.push({name:n,status:"FAIL",message:String(e.message||e)});}}
    function makeSheet_(rows,options){
        options=options||{};const data=rows.map(r=>r.slice());
        function range_(r,c,n,m){
            return{
                getValues(){
                    const out=[];for(let i=0;i<(n||1);i++){const line=[];for(let j=0;j<(m||1);j++){const v=(data[r-1+i]||[])[c-1+j];line.push(v===undefined||v===null?"":v);}out.push(line);}return out;
                },
                getDisplayValues(){return this.getValues().map(line=>line.map(v=>String(v)));},
                getValue(){const v=(data[r-1]||[])[c-1];return v===undefined||v===null?"":v;},
                setValue(v){if(options.failSetValueAtColumn===c)throw Error("simulated setValue failure");data[r-1]=data[r-1]||[];data[r-1][c-1]=v;},
                setValues(values){
                    if(options.failNextSetValues){options.failNextSetValues=false;throw Error("simulated write failure");}
                    values.forEach((line,i)=>{data[r-1+i]=data[r-1+i]||[];line.forEach((v,j)=>data[r-1+i][c-1+j]=v);});
                }
            };
        }
        return{data,getLastRow:()=>data.length,getLastColumn:()=>Math.max(0,...data.map(r=>r.length)),getRange:range_,getDataRange:()=>range_(1,1,data.length,Math.max(1,Math.max(0,...data.map(r=>r.length))))};
    }
    const videoId="abcdefghijk",videoUrl="https://www.youtube.com/watch?v="+videoId,opVideoId="v".repeat(32);
    function approval_(type,ref){return{subType:"video_approval",opVideoId,createdByUserId:"owner-1",title:"Video",description:"",videoId,videoUrl,contentType:type,referenceId:ref,status:"pending",metadata:{}};}
    function env_(type,options){
        options=options||{};
        const feedbackRows=[["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido"]];
        const approval=approval_(type,options.referenceId||({corte:"veh-1",pys:"isue-001",tutorial:"tut-1"}[type]));
        const requestRow=["vid-1","Owner",approval.referenceId,JSON.stringify(approval),"pending",false,"","",""];
        if(!options.noRequest)feedbackRows.push(requestRow);
        if(options.duplicateRequest)feedbackRows.push(requestRow.slice());
        const feedback=makeSheet_(feedbackRows,{failNextSetValues:!!options.failFeedbackWrite});
        const cutHeaders=new Array(45).fill("");cutHeaders[0]="id";cutHeaders[9]="videoGuiaDesarmeUrl";
        const cuts=makeSheet_([cutHeaders,(()=>{const row=new Array(45).fill("");row[0]="veh-1";row[9]=options.currentUrl||"";return row;})()]);
        const pysHeaders=["id_problem","Problema","Descripción","Se soluciono","Solucion","Prevenir","Imagen","Video","Colaborador","modelos_asociados"];
        const pys=makeSheet_([pysHeaders,["isue-001","Problema","Detalle","","","","",options.currentUrl||"","Owner",""]]);
        const tutHeaders=VIDEO_TUTORIAL_HEADERS.slice();
        const tutorial=makeSheet_([tutHeaders,["tut-1","Tutorial demo",options.currentImage||"","","","",options.currentUrl||"","Owner"]],{failSetValueAtColumn:options.failTutorialImageWrite?3:null});
        const map={ [SHEET_NAMES.FEEDBACKS]:feedback,[SHEET_NAMES.CORTES]:cuts,pys:pys,"Tutorial":tutorial };
        if(options.missingTarget)delete map[type==="corte"?SHEET_NAMES.CORTES:type==="pys"?"pys" :"Tutorial"];
        if(options.duplicateTarget){
            const target=type==="corte"?cuts:type==="pys"?pys:tutorial;
            target.data.push(target.data[1].slice());
        }
        getSafeSheet=name=>map[name]||null;
        getSpreadsheet=()=>({getSheetByName:name=>map[name]||null});
        return{feedback,cuts,pys,tutorial,approval,restore:()=>{getSafeSheet=oldGetSafe;getSpreadsheet=oldGetSpreadsheet;}};
    }
    function withEnv_(type,options,fn){const e=env_(type,options);try{fn(e);}finally{e.restore();}}
    function actor_(itemId){return{itemId,userName:"Aprobador",userRole:"Desarrollador"};}
    try{
        run_("mantiene vacíos los tres destinos hasta la aprobación",()=>{
            ["corte","pys","tutorial"].forEach(type=>{
                withEnv_(type,{noRequest:true},e=>{
                    const referenceId={corte:"veh-1",pys:"isue-001",tutorial:"tut-1"}[type];
                    const result=handleSubmitVideoForApproval({
                        opVideoId:"q".repeat(32),userId:"owner-1",userName:"Owner",
                        title:"Video",description:"",contentType:type,referenceId,
                        videoId,videoUrl,metadata:{}
                    });
                    const target=type==="corte"?e.cuts.data[1][9]:type==="pys"?e.pys.data[1][7]:e.tutorial.data[1][6];
                    assert_(result.status==="success"&&target==="","El destino "+type+" se publicó antes de aprobar.");
                });
            });
        });
        run_("aprueba Corte y verifica URL en Cortes antes de cerrar solicitud",()=>withEnv_("corte",{},e=>{
            const r=handleApproveVideo(actor_("vid-1"));
            const saved=JSON.parse(e.feedback.data[1][COLS_FEEDBACKS.Problema-1]);
            assert_(r.status==="success"&&e.cuts.data[1][9]===videoUrl&&saved.status==="approved"&&e.feedback.data[1][4]==="approved");
        }));
        run_("aprueba PyS en columna Video de pys",()=>withEnv_("pys",{},e=>{
            const r=handleApproveVideo(actor_("vid-1"));
            const saved=JSON.parse(e.feedback.data[1][COLS_FEEDBACKS.Problema-1]);
            assert_(r.targetType==="pys"&&e.pys.data[1][7]===videoUrl&&saved.status==="approved");
        }));
        run_("aprueba Tutorial por ID y genera miniatura solo si está vacía",()=>withEnv_("tutorial",{},e=>{
            const r=handleApproveVideo(actor_("vid-1"));
            const saved=JSON.parse(e.feedback.data[1][COLS_FEEDBACKS.Problema-1]);
            assert_(r.targetType==="tutorial"&&e.tutorial.data[1][6]===videoUrl&&e.tutorial.data[1][2]==="https://img.youtube.com/vi/"+videoId+"/hqdefault.jpg"&&saved.status==="approved");
        }));
        run_("si falla la miniatura, no publica la URL del Tutorial",()=>withEnv_("tutorial",{failTutorialImageWrite:true},e=>{
            let error=null;try{handleApproveVideo(actor_("vid-1"));}catch(x){error=x;}
            assert_(!!error&&e.tutorial.data[1][6]===""&&JSON.parse(e.feedback.data[1][3]).status==="pending");
        }));
        run_("preserva miniatura personalizada del Tutorial",()=>withEnv_("tutorial",{currentImage:"imagen-propia"},e=>{
            handleApproveVideo(actor_("vid-1"));
            assert_(e.tutorial.data[1][2]==="imagen-propia"&&e.tutorial.data[1][6]===videoUrl);
        }));
        run_("no sobrescribe un vídeo diferente en el destino",()=>withEnv_("corte",{currentUrl:"https://www.youtube.com/watch?v=zzzzzzzzzzz"},e=>{
            expect_(()=>handleApproveVideo(actor_("vid-1")),"otro vídeo");
            assert_(e.cuts.data[1][9]==="https://www.youtube.com/watch?v=zzzzzzzzzzz"&&JSON.parse(e.feedback.data[1][3]).status==="pending");
        }));
        run_("no aprueba si el destino no existe",()=>withEnv_("pys",{missingTarget:true},e=>{
            expect_(()=>handleApproveVideo(actor_("vid-1")),"no encontrada");
            assert_(JSON.parse(e.feedback.data[1][3]).status==="pending");
        }));
        run_("no aprueba si el destino es ambiguo",()=>withEnv_("pys",{duplicateTarget:true},e=>{
            expect_(()=>handleApproveVideo(actor_("vid-1")),"IDs duplicados");
            assert_(JSON.parse(e.feedback.data[1][3]).status==="pending");
        }));
        run_("reintento completa estado tras fallo de escritura de Feedbacks",()=>withEnv_("corte",{failFeedbackWrite:true},e=>{
            expect_(()=>handleApproveVideo(actor_("vid-1")),"simulated write failure");
            assert_(e.cuts.data[1][9]===videoUrl&&JSON.parse(e.feedback.data[1][3]).status==="pending");
            const retry=handleApproveVideo(actor_("vid-1"));
            assert_(retry.status==="success"&&JSON.parse(e.feedback.data[1][3]).status==="approved");
        }));
        run_("reintento tras respuesta perdida confirma aprobación existente sin reescribir los tres destinos",()=> {
            ["corte","pys","tutorial"].forEach(type=>withEnv_(type,{},e=>{
                const first=handleApproveVideo(actor_("vid-1"));
                const target=type==="corte"?e.cuts:type==="pys"?e.pys:e.tutorial;
                const savedAfterFirst=JSON.stringify(e.feedback.data[1]);
                const targetAfterFirst=JSON.stringify(target.data[1]);
                const retry=handleApproveVideo(actor_("vid-1"));
                assert_(first.status==="success","La primera aprobación debía completarse para "+type+".");
                assert_(retry.status==="success"&&retry.alreadyApproved===true&&retry.targetType===type,"El reintento debía confirmar la aprobación previa de "+type+".");
                assert_(JSON.stringify(e.feedback.data[1])===savedAfterFirst,"El reintento no debía reescribir Feedbacks para "+type+".");
                assert_(JSON.stringify(target.data[1])===targetAfterFirst,"El reintento no debía modificar el destino de "+type+".");
            }));
        });
        run_("no confirma aprobación previa si el destino ya no contiene el mismo vídeo",()=>withEnv_("pys",{},e=>{
            handleApproveVideo(actor_("vid-1"));
            e.pys.data[1][7]="https://www.youtube.com/watch?v=zzzzzzzzzzz";
            const approvedRow=JSON.stringify(e.feedback.data[1]);
            expect_(()=>handleApproveVideo(actor_("vid-1")),"destino no conserva");
            assert_(JSON.stringify(e.feedback.data[1])===approvedRow,"No debía alterar el estado aprobado inconsistente.");
        }));
        run_("rechazo retira el enlace pendiente exacto de Corte",()=>withEnv_("corte",{currentUrl:videoUrl},e=>{
            const r=handleRejectVideo({...actor_("vid-1"),reason:"No cumple"});
            assert_(r.status==="success"&&e.cuts.data[1][9]===""&&JSON.parse(e.feedback.data[1][3]).status==="rejected");
        }));
        run_("rechazo retira enlace y miniatura pendientes de Tutorial",()=>withEnv_("tutorial",{currentImage:"https://img.youtube.com/vi/"+videoId+"/hqdefault.jpg",currentUrl:videoUrl},e=>{
            const r=handleRejectVideo({...actor_("vid-1"),reason:"No cumple"});
            assert_(r.status==="success"&&e.tutorial.data[1][6]===""&&e.tutorial.data[1][2]===""&&JSON.parse(e.feedback.data[1][3]).status==="rejected");
        }));
        run_("rechazo retira el enlace pendiente de PyS",()=>withEnv_("pys",{currentUrl:videoUrl},e=>{
            const r=handleRejectVideo({...actor_("vid-1"),reason:"No cumple"});
            assert_(r.status==="success"&&e.pys.data[1][7]===""&&JSON.parse(e.feedback.data[1][3]).status==="rejected");
        }));
        run_("rechazo conserva un vídeo anterior diferente",()=>withEnv_("pys",{currentUrl:"https://www.youtube.com/watch?v=zzzzzzzzzzz"},e=>{
            handleRejectVideo(actor_("vid-1"));
            assert_(e.pys.data[1][7]==="https://www.youtube.com/watch?v=zzzzzzzzzzz"&&JSON.parse(e.feedback.data[1][3]).status==="rejected");
        }));
        run_("rechazo reintenta después de fallo al actualizar Feedbacks",()=>withEnv_("pys",{currentUrl:videoUrl,failFeedbackWrite:true},e=>{
            expect_(()=>handleRejectVideo(actor_("vid-1")),"simulated write failure");
            assert_(e.pys.data[1][7]===""&&JSON.parse(e.feedback.data[1][3]).status==="pending");
            handleRejectVideo(actor_("vid-1"));
            assert_(JSON.parse(e.feedback.data[1][3]).status==="rejected");
        }));
        run_("rechaza un JSON parseable que no sea video_approval",()=>withEnv_("corte",{},e=>{
            const payload=JSON.parse(e.feedback.data[1][3]);payload.subType="problem_report";e.feedback.data[1][3]=JSON.stringify(payload);
            expect_(()=>handleApproveVideo(actor_("vid-1")),"no corresponde a una solicitud de aprobación de vídeo");
            assert_(e.cuts.data[1][9]==="","No debe publicar un reporte como vídeo.");
        }));
        run_("rechaza contenido JSON inválido antes de tocar el destino",()=>withEnv_("corte",{},e=>{
            e.feedback.data[1][3]="{json roto";
            expect_(()=>handleRejectVideo(actor_("vid-1")),"JSON de vídeo válido");
            assert_(e.cuts.data[1][9]==="","No debe retirar ni escribir el destino.");
        }));
        run_("rechaza estados terminales en el flujo de rechazo",()=>withEnv_("corte",{},e=>{
            const payload=JSON.parse(e.feedback.data[1][3]);payload.status="approved";payload.approvedBy="Aprobador";payload.approvalDate="2026-11-12";
            e.feedback.data[1][3]=JSON.stringify(payload);e.feedback.data[1][4]="approved";e.feedback.data[1][5]=true;e.feedback.data[1][6]="Aprobador";
            expect_(()=>handleRejectVideo(actor_("vid-1")),"ya no está pendiente");
            assert_(e.cuts.data[1][9]==="","No debe retirar un vídeo ya aprobado.");
        }));
        run_("rechaza estado JSON pendiente si la columna Respuesta ya es terminal",()=>withEnv_("corte",{},e=>{
            e.feedback.data[1][4]="rejected";e.feedback.data[1][5]=true;
            expect_(()=>handleApproveVideo(actor_("vid-1")),"estado de la fila no coincide");
            assert_(e.cuts.data[1][9]==="","No debe publicar una solicitud con estado de fila inconsistente.");
        }));
        run_("rechaza estado JSON pendiente si la fila ya está resuelta",()=>withEnv_("corte",{},e=>{
            e.feedback.data[1][5]=true;
            expect_(()=>handleRejectVideo(actor_("vid-1")),"estado de la fila no coincide");
            assert_(e.cuts.data[1][9]==="","No debe retirar el destino por un registro ya resuelto.");
        }));
        run_("rechaza una referencia cruzada entre ID_vehiculo y referenceId",()=>withEnv_("corte",{},e=>{
            e.feedback.data[1][2]="veh-otro";
            expect_(()=>handleApproveVideo(actor_("vid-1")),"no coincide con el destino declarado");
            assert_(e.cuts.data[1][9]==="","No debe publicar en un destino cruzado.");
        }));
        run_("rechaza ID de solicitud cruzado o inexistente",()=>withEnv_("corte",{},e=>{
            expect_(()=>handleApproveVideo(actor_("otro-id")),"no encontrada");
            assert_(e.cuts.data[1][9]==="");
        }));
        run_("rechaza una solicitud pendiente cuyo JSON declara estado rechazado",()=>withEnv_("corte",{},e=>{
            const payload=JSON.parse(e.feedback.data[1][3]);payload.status="rejected";e.feedback.data[1][3]=JSON.stringify(payload);
            expect_(()=>handleApproveVideo(actor_("vid-1")),"ya no está pendiente");
            assert_(e.cuts.data[1][9]==="");
        }));
        run_("rechaza solicitud duplicada antes de publicar",()=>withEnv_("corte",{duplicateRequest:true},e=>{
            expect_(()=>handleApproveVideo(actor_("vid-1")),"más de una vez");
            assert_(e.cuts.data[1][9]==="");
        }));
    }finally{
        getSafeSheet=oldGetSafe;
        getSpreadsheet=oldGetSpreadsheet;
        Utilities.getUuid=oldUuid;
        Utilities.formatDate=oldFormat;
        Session.getScriptTimeZone=oldTimezone;
        SpreadsheetApp.flush=oldFlush;
    }
    return{status:failed===0?"PASS":"FAIL",passed,failed,results};
}
