// Pruebas de contratos para creación de Tutoriales/PyS sin publicar vídeos directamente.
// Requiere cargar Services/feedback.js y ejecutar runVideoApprovalCreationContractTests().
function runVideoApprovalCreationContractTests() {
    const results=[];let passed=0,failed=0;
    const oldGetSafe=getSafeSheet,oldFlush=SpreadsheetApp.flush,oldLock=LockService.getScriptLock;
    function assert_(v,m){if(!v)throw new Error(m||"Aserción fallida.");}
    function expect_(fn,t){let e=null;try{fn();}catch(x){e=x;}assert_(!!e,"Se esperaba rechazo.");if(t)assert_(String(e.message||e).includes(t),"Error inesperado: "+String(e.message||e));}
    function run_(n,fn){try{fn();passed++;results.push({name:n,status:"PASS"});}catch(e){failed++;results.push({name:n,status:"FAIL",message:String(e.message||e)});}}
    function sheet_(rows){
        const data=(rows||[]).map(row=>row.slice());
        function range_(r,c,n,m){return{
            getValues(){return Array.from({length:n||1},(_,i)=>Array.from({length:m||1},(_,j)=>(data[r-1+i]||[])[c-1+j]??""));},
            getDisplayValues(){return this.getValues().map(row=>row.map(String));},
            getValue(){return (data[r-1]||[])[c-1]??"";},
            setValue(v){data[r-1]=data[r-1]||[];data[r-1][c-1]=v;},
            setValues(values){values.forEach((row,i)=>{data[r-1+i]=data[r-1+i]||[];row.forEach((v,j)=>data[r-1+i][c-1+j]=v);});}
        };}
        return{data,getLastRow:()=>data.length,getLastColumn:()=>Math.max(0,...data.map(row=>row.length)),getRange:range_,appendRow(row){data.push(row.slice());}};
    }
    try{
        LockService.getScriptLock=()=>({waitLock:()=>{},releaseLock:()=>{}});
        SpreadsheetApp.flush=()=>{};
        run_("crea tutorial sin publicar enlace",()=>{
            const sheet=sheet_([["Tema","Imagen","Video","Descripción","Colaborador"]]);
            getSafeSheet=name=>name==="Tutoriales"?sheet:null;
            const result=handleAddTutorial({tema:"Desarme de consola",videoUrl:"",descripcion:"Detalle",colaborador:"Técnico"});
            assert_(result.status==="success"&&result.referenceId==="Desarme de consola");
            assert_(sheet.data.length===2&&sheet.data[1][2]==="");
        });
        run_("rechaza enlace directo en alta de Tutorial",()=>{
            const sheet=sheet_([["Tema","Imagen","Video","Descripción","Colaborador"]]);
            getSafeSheet=name=>name==="Tutoriales"?sheet:null;
            expect_(()=>handleAddTutorial({tema:"Tema",videoUrl:"https://www.youtube.com/watch?v=abcdefghijk"}),"flujo de aprobación");
            assert_(sheet.data.length===1);
        });
        run_("rechaza título duplicado en Tutorial",()=>{
            const sheet=sheet_([["Tema","Imagen","Video","Descripción","Colaborador"],["Tema existente","","","",""]]);
            getSafeSheet=name=>name==="Tutoriales"?sheet:null;
            expect_(()=>handleAddTutorial({tema:"Tema existente",videoUrl:""}),"Ya existe");
            assert_(sheet.data.length===2);
        });
        run_("crea PyS con ID estable y vídeo vacío",()=>{
            const sheet=sheet_([["id_problem","Problema","Descripción","Se soluciono","Solucion","Prevenir","Imagen","Video","Colaborador","modelos_asociados"]]);
            getSafeSheet=name=>name==="pys"?sheet:null;
            const result=handleAddProblem({titulo:"Falla técnica",descripcion:"Detalle",sinSolucion:true,solucion:"",prevenir:"",videoUrl:"",alcance:"general",modelosAsociados:[]});
            assert_(result.status==="success"&&result.problemId&&sheet.data[1][0]===result.problemId&&sheet.data[1][7]==="");
        });
        run_("bloquea cambio directo del vídeo de PyS",()=>{
            const sheet=sheet_([["id_problem","Problema","Descripción","Se soluciono","Solucion","Prevenir","Imagen","Video","Colaborador","modelos_asociados"],["isue-001","Falla","Detalle","","","","","https://www.youtube.com/watch?v=abcdefghijk","Técnico",""]]);
            getSafeSheet=name=>name==="pys"?sheet:null;
            expect_(()=>handleUpdatePysItem({problemId:"isue-001",titulo:"Título alterado",videoUrl:"https://www.youtube.com/watch?v=lmnopqrstuv",userRole:"Desarrollador"}),"solo puede cambiarse mediante una solicitud");
            assert_(sheet.data[1][1]==="Falla"&&sheet.data[1][7]==="https://www.youtube.com/watch?v=abcdefghijk");
        });
        run_("bloquea cambio directo del vídeo de Tutorial",()=>{
            const sheet=sheet_([["Tema","Imagen","Video","Descripción","Colaborador"],["Tema","","https://www.youtube.com/watch?v=abcdefghijk","Detalle","Técnico"]]);
            getSafeSheet=name=>name==="Tutoriales"?sheet:null;
            expect_(()=>handleUpdateTutorialItem({originalTema:"Tema",tema:"Tema",videoUrl:"https://www.youtube.com/watch?v=lmnopqrstuv",userRole:"Desarrollador"}),"solo puede cambiarse mediante una solicitud");
            assert_(sheet.data[1][2]==="https://www.youtube.com/watch?v=abcdefghijk");
        });
        run_("impide renombrar Tutorial con solicitud de vídeo pendiente",()=>{
            const tutorial=sheet_([["Tema","Imagen","Video","Descripción","Colaborador"],["Tema","","","Detalle","Técnico"]]);
            const approval={subType:"video_approval",status:"pending",contentType:"tutorial",referenceId:"Tema",videoId:"abcdefghijk",videoUrl:"https://www.youtube.com/watch?v=abcdefghijk"};
            const feedback=sheet_([["ID","Usuario","ID_vehiculo","Problema","Respuesta","Se resolvio","Responde","Reporte de util","anoSugerido"],["vid-1","Owner","Tema",JSON.stringify(approval),"pending",false]]);
            getSafeSheet=name=>name==="Tutoriales"?tutorial:name===SHEET_NAMES.FEEDBACKS?feedback:null;
            expect_(()=>handleUpdateTutorialItem({originalTema:"Tema",tema:"Tema nuevo",videoUrl:"",userRole:"Desarrollador"}),"solicitud de vídeo pendiente");
            assert_(tutorial.data[1][0]==="Tema");
        });
        run_("rechaza enlace directo en alta de PyS",()=>{
            const sheet=sheet_([["id_problem","Problema","Descripción","Se soluciono","Solucion","Prevenir","Imagen","Video","Colaborador","modelos_asociados"]]);
            getSafeSheet=name=>name==="pys"?sheet:null;
            expect_(()=>handleAddProblem({titulo:"Falla",descripcion:"Detalle",sinSolucion:true,videoUrl:"https://youtu.be/abcdefghijk"}),"flujo de aprobación");
            assert_(sheet.data.length===1);
        });
    }finally{
        getSafeSheet=oldGetSafe;SpreadsheetApp.flush=oldFlush;LockService.getScriptLock=oldLock;
    }
    return{status:failed===0?"PASS":"FAIL",passed,failed,results};
}
