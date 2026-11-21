
// Pruebas de configuración y precondiciones de la sesión resumable de YouTube.
// Requiere cargar Services/feedback.js.
function runYouTubeApprovalInitTests() {
    const results=[];let passed=0,failed=0;
    const oldGetSafe=getSafeSheet,oldToken=ScriptApp.getOAuthToken,oldFetch=UrlFetchApp.fetch,oldLog=Logger.log;
    function assert_(v,m){if(!v)throw new Error(m||"Aserción fallida.");}
    function expect_(fn,t){let e=null;try{fn();}catch(x){e=x;}assert_(!!e,"Se esperaba rechazo.");if(t)assert_(String(e.message||e).includes(t),"Error inesperado: "+String(e.message||e));}
    function run_(n,fn){try{fn();passed++;results.push({name:n,status:"PASS"});}catch(e){failed++;results.push({name:n,status:"FAIL",message:String(e.message||e)});}}
    function sheet_(rows){
        const data=rows.map(row=>row.slice());
        function range_(r,c,n,m){return{
            getValues(){const out=[];for(let i=0;i<(n||1);i++){const line=[];for(let j=0;j<(m||1);j++){const v=(data[r-1+i]||[])[c-1+j];line.push(v===undefined||v===null?"":v);}out.push(line);}return out;},
            getDisplayValues(){return this.getValues().map(line=>line.map(String));},
            getValue(){const v=(data[r-1]||[])[c-1];return v===undefined||v===null?"":v;}
        };}
        return{data,getLastRow:()=>data.length,getLastColumn:()=>Math.max(0,...data.map(row=>row.length)),getRange:range_,getDataRange:()=>range_(1,1,data.length,Math.max(1,Math.max(0,...data.map(row=>row.length))))};
    }
    const op="o".repeat(32),payload={title:"Vídeo técnico",description:"Detalle",contentType:"corte",referenceId:"veh-1",fileName:"video.mp4",fileSize:2048,fileType:"video/mp4",opVideoId:op};
    let map={},requestOptions=null,location="https://www.googleapis.com/upload/youtube/v3/videos?upload_id=test",responseCode=201;
    function reset_(currentUrl){
        responseCode=201;
        requestOptions=null;
        location="https://www.googleapis.com/upload/youtube/v3/videos?upload_id=test";
        const headers=new Array(45).fill("");headers[0]="id";headers[9]="videoGuiaDesarmeUrl";
        const row=new Array(45).fill("");row[0]="veh-1";row[9]=currentUrl||"";
        map={Cortes:sheet_([headers,row]),Feedbacks:sheet_([["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido"]])};
        getSafeSheet=name=>map[name]||null;
        ScriptApp.getOAuthToken=()=>"oauth-token";
        UrlFetchApp.fetch=(url,options)=>{requestOptions={url,options};return{getAllHeaders:()=>location?{Location:location}:{},getResponseCode:()=>responseCode,getContentText:()=>""};};
        Logger.log=()=>{};
    }
    try{
        run_("envía categoryId 28 y privacidad unlisted con audiencia no infantil",()=>{
            reset_();const result=handleInitYouTubeUpload(payload);
            const body=JSON.parse(requestOptions.options.payload);
            assert_(result.status==="success"&&result.opVideoId===op&&result.uploadUrl===location);
            assert_(body.snippet.categoryId==="28"&&body.status.privacyStatus==="unlisted"&&body.status.selfDeclaredMadeForKids===false);
            assert_(body.status.embeddable===true&&body.status.publicStatsViewable===false);
            assert_(!Object.prototype.hasOwnProperty.call(result,"videoId"));
        });
        run_("no simula sesión si YouTube no devuelve Location",()=>{
            reset_();location=null;const result=handleInitYouTubeUpload(payload);
            assert_(result.status==="error"&&result.uploadUrl===null&&result.opVideoId===op);
        });
        run_("rechaza referencia vacía antes de llamar YouTube",()=>{
            reset_();requestOptions=null;
            expect_(()=>handleInitYouTubeUpload({...payload,referenceId:""}),"guardar primero");
            assert_(requestOptions===null);
        });
        run_("rechaza destino que ya tiene vídeo asociado",()=>{
            reset_("https://www.youtube.com/watch?v=zzzzzzzzzzz");
            expect_(()=>handleInitYouTubeUpload(payload),"ya tiene un vídeo asociado");
            assert_(requestOptions===null);
        });
        run_("rechaza si ya existe una solicitud pendiente para el destino",()=>{
            reset_();
            const approval={subType:"video_approval",status:"pending",contentType:"corte",referenceId:"veh-1",opVideoId:"p".repeat(32)};
            map.Feedbacks=sheet_([["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido"],["vid-1","User","veh-1",JSON.stringify(approval),"pending",false]]);
            expect_(()=>handleInitYouTubeUpload(payload),"solicitud de vídeo pendiente");
            assert_(requestOptions===null);
        });
        run_("rechaza URL de sesión fuera del endpoint oficial",()=>{
            reset_();location="https://evil.example/upload/session";
            const result=handleInitYouTubeUpload(payload);
            assert_(result.status==="error"&&result.uploadUrl===null);
        });
        run_("rechaza respuesta HTTP fallida aunque incluya Location",()=>{
            reset_();responseCode=500;
            const result=handleInitYouTubeUpload(payload);
            assert_(result.status==="error"&&result.uploadUrl===null);
        });
        run_("rechaza opVideoId inválido",()=>{
            reset_();expect_(()=>handleInitYouTubeUpload({...payload,opVideoId:"x"}),"Identificador de operación");
            assert_(requestOptions===null);
        });
    }finally{
        getSafeSheet=oldGetSafe;ScriptApp.getOAuthToken=oldToken;UrlFetchApp.fetch=oldFetch;Logger.log=oldLog;
    }
    return{status:failed===0?"PASS":"FAIL",passed,failed,results};
}
