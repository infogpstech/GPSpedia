function runCutAvailabilityTests(sources) {
    const frontend=String(sources.frontend||''),write=String(sources.write||''),admin=String(sources.admin||'');
    const results=[];let passed=0,failed=0;
    function assert_(v,m){if(!v)throw new Error(m||'Aserción fallida.');}
    function run_(name,fn){try{fn();passed++;results.push({name,status:'PASS'});}catch(e){failed++;results.push({name,status:'FAIL',message:String(e.message||e)});}}
    function extract_(source,name){
        let start=source.indexOf('async function '+name+'(');if(start<0)start=source.indexOf('function '+name+'(');assert_(start>=0,'No se encontró '+name);
        const open=source.indexOf('{',start);let depth=0,quote='',escaped=false,line=false,block=false;
        for(let i=open;i<source.length;i++){const ch=source[i],next=source[i+1];
            if(line){if(ch==='\\n')line=false;continue;}if(block){if(ch==='*'&&next==='/'){block=false;i++;}continue;}
            if(quote){if(escaped)escaped=false;else if(ch==='\\\\')escaped=true;else if(ch===quote)quote='';continue;}
            if(ch==='/'&&next==='/'){line=true;i++;continue;}if(ch==='/'&&next==='*'){block=true;i++;continue;}
            if(ch==="'"||ch==='"'||ch==='`'){quote=ch;continue;}if(ch==='{')depth++;if(ch==='}'&&--depth===0)return source.slice(start,i+1);
        }throw new Error('Bloque incompleto '+name);
    }
    function between_(source,start,end){const i=source.indexOf(start);assert_(i>=0,'No se encontró '+start);const j=source.indexOf(end,i+start.length);assert_(j>=0,'No se encontró '+end);return source.slice(i,j);}
    const availability=new Function(extract_(frontend,'getCutAvailability')+';return getCutAvailability;')();
    const canVideo=new Function(extract_(frontend,'canAddVideoGuide')+';return canAddVideoGuide;')();
    const writeSlot=new Function('COLS_CORTES',extract_(write,'findNextAvailableCutSlot_')+';return findNextAvailableCutSlot_;')({tipoCorte1:1,tipoCorte2:2,tipoCorte3:3});
    const adminSlot=new Function('COLS_CORTES',extract_(admin,'findNextAvailableCutSlot_')+';return findNextAvailableCutSlot_;')({tipoCorte1:1,tipoCorte2:2,tipoCorte3:3});
    run_('0 cortes: tres espacios disponibles',()=>{const x=availability({});assert_(x.occupiedCount===0&&x.availableCount===3&&x.nextSlot===1&&x.hasAvailableSlots);});
    run_('1 corte: el siguiente espacio es el segundo',()=>{const x=availability({tipoCorte1:'Ignición'});assert_(x.occupiedCount===1&&x.availableCount===2&&x.nextSlot===2);});
    run_('2 cortes: el siguiente espacio es el tercero',()=>{const x=availability({tipoCorte1:'Ignición',tipoCorte2:'Bomba'});assert_(x.occupiedCount===2&&x.availableCount===1&&x.nextSlot===3);});
    run_('3 cortes: no ofrece nuevos espacios',()=>{const x=availability({tipoCorte1:'Ignición',tipoCorte2:'Bomba',tipoCorte3:'Arranque'});assert_(x.occupiedCount===3&&x.availableCount===0&&x.nextSlot===null&&x.isFull);});
    run_('espacio intermedio vacío se detecta sin sobrescribir los demás',()=>{const x=availability({tipoCorte1:'Ignición',tipoCorte2:' ',tipoCorte3:'Arranque'});assert_(x.occupiedCount===2&&x.nextSlot===2);});
    run_('estado desconocido bloquea altas de forma conservadora',()=>{const x=availability({tipoCorte1:'Ignición',cutAvailabilityUnknown:true});assert_(x.isFull&&!x.hasAvailableSlots);});
    run_('vídeo disponible cuando no hay URL',()=>{assert_(canVideo({})&&canVideo({videoGuiaDesarmeUrl:''}));});
    run_('vídeo oculto cuando el registro ya contiene URL',()=>{assert_(!canVideo({videoGuiaDesarmeUrl:'https://youtube.example/video'}));});
    run_('vídeo oculto cuando el estado no pudo verificarse',()=>{assert_(!canVideo({cutAvailabilityUnknown:true}));});
    run_('vehículo nuevo conserva dos espacios tras el primer corte',()=>{const state={matches:[],vehicleInfo:{marca:'Toyota'}};const upsert=new Function('state',extract_(frontend,'upsertFallbackVehicleMatch')+';return upsertFallbackVehicleMatch;')(state);const m=upsert('101',{isNewVehicle:true,slotIndex:1,cutType:'Ignición'});const x=availability(m);assert_(m.id==='101'&&x.occupiedCount===1&&x.availableCount===2&&canVideo(m));});
    run_('vehículo existente sin refresco queda protegido contra sobreasignación',()=>{const state={matches:[{id:7,tipoCorte1:'Ignición'}],vehicleInfo:{}};const upsert=new Function('state',extract_(frontend,'upsertFallbackVehicleMatch')+';return upsertFallbackVehicleMatch;')(state);const m=upsert('7',{isNewVehicle:false});assert_(availability(m).isFull&&!canVideo(m));});
    run_('WRITE selecciona primer espacio libre en estados 0/1/2/3',()=>{assert_(writeSlot(['','',''])===1&&writeSlot(['A','',''])===2&&writeSlot(['A','B',''])===3&&writeSlot(['A','B','C'])===null);});
    run_('ADMIN selecciona primer espacio libre en estados 0/1/2/3',()=>{assert_(adminSlot(['','',''])===1&&adminSlot(['A','',''])===2&&adminSlot(['A','B',''])===3&&adminSlot(['A','B','C'])===null);});
    run_('tarjetas ocultan agregar corte cuando el registro está completo',()=>{const display=between_(frontend,'function displayMatches(matches)','function proceedToStage2(');assert_(display.includes('getCutAvailability(match)')&&display.includes('cutAvailability.hasAvailableSlots ?'));});
    run_('stage 3 usa el registro seleccionado para cortes y vídeo',()=>{const stage3=between_(frontend,'function proceedToStage3(vehicleId)','async function handleStage3Submit(');assert_(stage3.includes('getCutAvailability(match)')&&stage3.includes('canAddVideoGuide(match)')&&!stage3.includes('state.catalogData'));});
    run_('el registro se refresca tras guardar y recuperar operaciones',()=>{const submit=extract_(frontend,'handleStage2Submit'),recovery=extract_(frontend,'checkAndRecoverPendingOperation');assert_(submit.includes('await refreshSelectedVehicleMatch(result.vehicleId')&&submit.includes('await refreshSelectedVehicleMatch(checkRes.vehicleId')&&recovery.includes('await refreshSelectedVehicleMatch(checkRes.vehicleId'));});
    run_('WRITE mantiene ScriptLock y comprueba la fila actual',()=>{const wrapper=between_(write,'function handleAddOrUpdateCut(payload)','function findNextAvailableCutSlot_(');assert_(wrapper.includes('lock.waitLock(30000)')&&wrapper.includes('handleAddOrUpdateCutLocked')&&wrapper.includes('finally')&&wrapper.includes('lock.releaseLock'));assert_(write.includes('findNextAvailableCutSlot_(rowValues)')&&write.includes('cutSlotIndex === null'));});
    run_('ADMIN mantiene ScriptLock y comprueba la fila actual',()=>{const start=admin.indexOf('function handleAddOrUpdateCut(payload, logMessage, developerContext)');const end=admin.indexOf('function handleAddSupplementaryInfo(',start);const wrapper=admin.slice(start,end);assert_(wrapper.includes('lock.waitLock(30000)')&&wrapper.includes('finally')&&wrapper.includes('lock.releaseLock')&&wrapper.includes('findNextAvailableCutSlot_(rowValues)')&&wrapper.includes('cutSlotIndex === null'));});
    run_('WRITE y ADMIN devuelven slotIndex para altas e idempotencia',()=>{assert_(write.includes('slotIndex: savedSlotIndex')&&write.includes('slotIndex: slotIndex')&&admin.includes('slotIndex: savedSlotIndex')&&admin.includes('slotIndex: slotIndex'));});
    run_('colisión concurrente conserva snapshot y explica que no sobrescribe',()=>{const submit=extract_(frontend,'handleStage2Submit');assert_(submit.includes('saveAddCutOperationPendingOperation(pendingOp)')&&submit.includes('Otro colaborador ocupó el último espacio disponible')&&submit.includes('Tus datos y archivos permanecen conservados')&&submit.includes("pendingOp.status = serverConfirmed ? 'completed' : 'failed'"));});
    return {status:failed===0?'PASS':'FAIL',passed,failed,results};
}