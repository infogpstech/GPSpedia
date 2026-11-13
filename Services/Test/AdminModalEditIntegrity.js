// AUG-129 — allowlist, validación de campos ADMIN y protección del ID de vehículo.
function runAdminModalEditIntegrityTests(adminSource) {
    const source = String(adminSource || ""), results = [];
    let passed = 0, failed = 0;
    const assert = (value, message) => { if (!value) throw new Error(message || "Aserción fallida."); };
    const equal = (actual, expected, message) => { if (actual !== expected) throw new Error(message || "Esperado " + expected + ", recibido " + actual); };
    const run = (name, fn) => {
        try { fn(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };
    const extract = name => {
        const start = source.indexOf("function " + name + "(");
        assert(start >= 0, "No se encontró " + name);
        const end = source.indexOf("\nfunction ", start + 10);
        return source.slice(start, end > start ? end : source.length);
    };
    const allowlistStart = source.indexOf("const ADMIN_MODAL_EDIT_FIELDS = new Set(");
    assert(allowlistStart >= 0, "No se encontró la allowlist del backend.");
    const allowlistEnd = source.indexOf("]);", allowlistStart);
    assert(allowlistEnd > allowlistStart, "La allowlist del backend está incompleta.");
    const allowlistSource = source.slice(allowlistStart, allowlistEnd + 3);
    const support = [
        allowlistSource,
        extract("isAdminModalEditField_"),
        extract("getAdminModalDomainValues_"),
        extract("validateAdminModalFieldValue_"),
        extract("findUniqueAdminVehicleRow_")
    ].join("\n");
    const COLS_CORTES = {
        id:1,categoria:2,modelo:4,versionesAplicables:5,anoDesde:6,anoHasta:7,tipoEncendido:8,
        tipoCorte1:12,tipoCorte2:19,tipoCorte3:26,configRelay1:15,configRelay2:22,configRelay3:29
    };
    const SHEET_NAMES = { RELAY:"Relay" };
    const relayValues = [["NC"],["NO"],["SPDT"]];
    const relaySheet = {getLastRow:()=>4,getLastColumn:()=>2,getRange:()=>({getValues:()=>relayValues})};
    const getSpreadsheet = () => ({getSheetByName:()=>relaySheet});
    const sanitizeSupplementaryRichText_ = value => "SANITIZED:" + value;
    const extractDriveFileIds = value => {
        const text = String(value || "").trim();
        if (/^[A-Za-z0-9_-]{20,}$/.test(text)) return [text];
        const matches = [...text.matchAll(/[?&]id=([A-Za-z0-9_-]{20,})/g)];
        return [...new Set(matches.map(match=>match[1]))];
    };
    const helpers = new Function("COLS_CORTES","SHEET_NAMES","getSpreadsheet","sanitizeSupplementaryRichText_","extractDriveFileIds",
        support + "; return {isAdminModalEditField_,getAdminModalDomainValues_,validateAdminModalFieldValue_,findUniqueAdminVehicleRow_};"
    )(COLS_CORTES,SHEET_NAMES,getSpreadsheet,sanitizeSupplementaryRichText_,extractDriveFileIds);
    const data = {
        2:["Automóvil","Motocicleta"],8:["Llave","Botón"],12:["Bomba","Ignición"],19:["Bomba"],26:["Ignición"]
    };
    const cortesSheet = {
        getLastRow:()=>3,
        getRange:(row,col,count)=>({getValues:()=>Array.from({length:count},(_,i)=>[data[col] ? data[col][i] || "" : ""])})
    };
    const rowValues = Array(48).fill("");
    rowValues[5]=2020; rowValues[6]=2025;
    run("La allowlist permite campos previstos y excluye ID/calculados/vídeo",()=>{
        assert(helpers.isAdminModalEditField_("modelo"));
        assert(helpers.isAdminModalEditField_("tipoCorte3"));
        assert(!helpers.isAdminModalEditField_("id"));
        assert(!helpers.isAdminModalEditField_("timestamp"));
        assert(!helpers.isAdminModalEditField_("contadorBusqueda"));
        assert(!helpers.isAdminModalEditField_("videoGuiaDesarmeUrl"));
        assert(!helpers.isAdminModalEditField_("campoArbitrario"));
    });
    run("Rechaza tipos no textuales y cadenas fuera de longitud",()=>{
        let rejected=false;try{helpers.validateAdminModalFieldValue_(cortesSheet,"modelo",42,rowValues);}catch(_){rejected=true;}assert(rejected);
        rejected=false;try{helpers.validateAdminModalFieldValue_(cortesSheet,"modelo","x".repeat(121),rowValues);}catch(_){rejected=true;}assert(rejected);
    });
    run("Valida dominios de categoría, encendido y tipo de corte",()=>{
        equal(helpers.validateAdminModalFieldValue_(cortesSheet,"categoria","automóvil",rowValues),"automóvil");
        let rejected=false;try{helpers.validateAdminModalFieldValue_(cortesSheet,"categoria","Aeronave",rowValues);}catch(_){rejected=true;}assert(rejected);
        equal(helpers.validateAdminModalFieldValue_(cortesSheet,"tipoEncendido","Llave",rowValues),"Llave");
        rejected=false;try{helpers.validateAdminModalFieldValue_(cortesSheet,"tipoCorte1","Turbo",rowValues);}catch(_){rejected=true;}assert(rejected);
        equal(helpers.validateAdminModalFieldValue_(cortesSheet,"tipoCorte1","Bomba",rowValues),"Bomba");
    });
    run("Valida dominio de configuración Relay",()=>{
        equal(helpers.validateAdminModalFieldValue_(cortesSheet,"configRelay1","NC",rowValues),"NC");
        let rejected=false;try{helpers.validateAdminModalFieldValue_(cortesSheet,"configRelay1","XYZ",rowValues);}catch(_){rejected=true;}assert(rejected);
    });
    run("Valida años enteros, límites y coherencia del rango",()=>{
        equal(helpers.validateAdminModalFieldValue_(cortesSheet,"anoDesde","2020",rowValues),2020);
        let rejected=false;try{helpers.validateAdminModalFieldValue_(cortesSheet,"anoDesde","2026",rowValues);}catch(_){rejected=true;}assert(rejected);
        rejected=false;try{helpers.validateAdminModalFieldValue_(cortesSheet,"anoHasta",2101,rowValues);}catch(_){rejected=true;}assert(rejected);
        rejected=false;try{helpers.validateAdminModalFieldValue_(cortesSheet,"anoHasta",2019,rowValues);}catch(_){rejected=true;}assert(rejected);
    });
    run("Sanitiza texto enriquecido y rechaza referencias de imagen inválidas",()=>{
        equal(helpers.validateAdminModalFieldValue_(cortesSheet,"notaImportante"," aviso ",rowValues),"SANITIZED:aviso");
        let rejected=false;try{helpers.validateAdminModalFieldValue_(cortesSheet,"imgCorte1","https://example.com/image.jpg",rowValues);}catch(_){rejected=true;}assert(rejected);
        equal(helpers.validateAdminModalFieldValue_(cortesSheet,"imgCorte1","1Abcdefghijklmnopqrstuv",rowValues),"1Abcdefghijklmnopqrstuv");
    });
    run("Busca una sola fila por ID y rechaza IDs inexistentes o duplicados",()=>{
        const unique={getLastRow:()=>3,getRange:()=>({getValues:()=>[["V-1"],["V-2"]]})};
        equal(helpers.findUniqueAdminVehicleRow_(unique,"V-2"),3);
        let rejected=false;try{helpers.findUniqueAdminVehicleRow_(unique,"V-9");}catch(_){rejected=true;}assert(rejected);
        const duplicate={getLastRow:()=>3,getRange:()=>({getValues:()=>[["V-1"],["V-1"]]})};
        rejected=false;try{helpers.findUniqueAdminVehicleRow_(duplicate,"V-1");}catch(_){rejected=true;}assert(rejected);
    });
    run("Los helpers y handlers modificados compilan como JavaScript V8",()=>{
        const handlerStart = source.indexOf("function handleUpdateVehicleField(");\n        const handlerEnd = source.indexOf("\\n}\\n\\nconst ADMIN_IMAGE_UPLOAD_SHEET_NAME", handlerStart);\n        assert(handlerStart >= 0 && handlerEnd > handlerStart, "No se encontró el cierre de handleUpdateVehicleField.");\n        new Function(source.slice(handlerStart, handlerEnd + 2));
        new Function(extract("handleUpdateVehicleVinCollection_"));
    });
    run("La escritura de campos toma lock, excluye la columna ID y verifica reversión",()=>{
        const body=extract("handleUpdateVehicleField");
        assert(/LockService\.getScriptLock\(\)/.test(body));
        assert(/findUniqueAdminVehicleRow_/.test(body));
        assert(/COLS_CORTES\.id/.test(extract("findUniqueAdminVehicleRow_")));
        assert(/target\.setValue\(previousValue\)/.test(body));
        assert(/SpreadsheetApp\.flush\(\)/.test(body));
    });
    return {passed,failed,total:passed+failed,results};
}
