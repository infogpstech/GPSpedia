function runAdminRestoreRecoveryTests(adminSource) {
    const admin = String(adminSource || ""), results = [];
    let passed = 0, failed = 0;
    const assert = (value, message) => { if (!value) throw new Error(message || "Aserción fallida."); };
    const run = (name, fn) => {
        try { fn(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };
    const section = (start, end) => {
        const a = admin.indexOf(start);
        assert(a >= 0, "No se encontró " + start);
        const b = end ? admin.indexOf(end, a + start.length) : admin.length;
        assert(!end || b > a, "No se encontró el límite " + end);
        return admin.slice(a, b);
    };
    const functionSource = name => section("function " + name + "(", "\nfunction ").trim();
    run("El respaldo DB verifica copia completa antes de registrarla", () => {
        const body = section("function handleBackupDatabase(", "\n/**\n * 2. Respaldo de Drive");
        assert(/adminRestoreValidateDatabaseSchema_\(ss\)/.test(body), "No valida el esquema del origen.");
        assert(/adminRestoreValidateDatabaseSchema_\(verifiedSpreadsheet\)/.test(body), "No valida el esquema de la copia.");
        assert(/adminRestoreValidateDatabaseSchema_\(verifiedSpreadsheet\)/.test(body), "No verifica el esquema e inventario copiados.");
        assert(/fingerprint\s*!==\s*sourceManifest\.fingerprint/.test(body), "No compara huellas completas.");
        assert(/setTrashed\(true\)/.test(body), "No retira una copia fallida.");
        assert(/setDescription\(JSON\.stringify/.test(body), "No persiste el manifiesto de integridad.");
    });
    run("El respaldo Drive compara recursos y limpia copias parciales", () => {
        const body = section("function handleBackupDrive(", "\nfunction copyFolderRecursively");
        assert(/adminRestoreDriveManifest_\(rootFolder\)/.test(body) && /adminRestoreDriveManifest_\(createdBackupFolder\)/.test(body), "No compara inventarios.");
        assert(/adminRestoreManifestsEqual_/.test(body), "No verifica conteos y huella.");
        assert(/setTrashed\(true\)/.test(body), "No limpia la carpeta parcial.");
    });
    run("El manifiesto DB incluye valores, fórmulas y todas las hojas", () => {
        const body = section("function adminRestoreSpreadsheetManifest_(", "\nfunction adminRestoreDriveManifest_");
        assert(/getSheets\(\)/.test(body) && /fingerprint/.test(body) && /formulaCount/.test(body) && /cellCount/.test(body), "El inventario no cubre hojas, fórmulas y celdas.");
        assert(/adminRestoreSheetManifest_/.test(body), "No inspecciona cada hoja.");
    });
    run("El esquema obligatorio incluye Tutorial A:H y Colaborador", () => {
        const body = section("const ADMIN_RESTORE_REQUIRED_SCHEMA_", "\nconst ADMIN_RESTORE_DRIVE_MANIFEST_DESCRIPTION_");
        assert(/"Tutorial":\s*\[[^\]]*"Colaborador"/.test(body), "Tutorial no valida la columna Colaborador.");
        ["Cortes","Users","ActiveSessions","Feedbacks","Contactanos","LogosMarca","Relay"].forEach(name =>
            assert(body.includes('"' + name + '"'), "Falta esquema de " + name));
        const validator = section("function adminRestoreValidateDatabaseSchema_(", "\nfunction adminRestoreCreateDatabaseRollback_");
        assert(/expectedHeaders/.test(validator) && /sheet\.getLastColumn\(\) === 7/.test(validator) && /expected\.slice\(0, 7\)/.test(validator),
            "No conserva compatibilidad con Tutorial histórico A:G.");
        assert(/expectedHeaders\.forEach/.test(validator), "No compara encabezados.");
    });
    run("El rollback DB se copia y verifica antes de preparar el intercambio", () => {
        const body = section("function handleRestoreDatabase(", "\nfunction handleRestoreDrive");
        assert(body.indexOf("adminRestoreCreateDatabaseRollback_") < body.indexOf("sourceSheet.copyTo(targetSS)"), "El staging inicia antes del respaldo recuperable.");
        assert(/adminRestoreValidateDatabaseSchema_/.test(body), "No valida el esquema antes de restaurar.");
        assert(/storedManifest\.fingerprint\s*!==\s*backupManifest\.fingerprint/.test(body), "No valida manifiesto guardado.");
    });
    run("La restauración DB promueve hojas completas y no borra el destino anticipadamente", () => {
        const body = section("function handleRestoreDatabase(", "\nfunction handleRestoreDrive");
        assert(/sourceSheet\.copyTo\(targetSS\)/.test(body), "No prepara hojas staging.");
        assert(/adminRestoreSwapDatabaseSheets_/.test(body), "No utiliza intercambio controlado.");
        assert(!/targetSS\.deleteSheet\(.*original/i.test(body), "La ruta principal elimina originales antes de validar.");
        assert(!/targetSheet\.clear\(/.test(body), "La restauración no debe reconstruir hojas in situ.");
    });
    run("El fallo de rollback DB conserva artefactos para recuperación manual", () => {
        const body = section("function handleRestoreDatabase(", "\nfunction handleRestoreDrive");
        assert(/reversión no pudo verificarse/.test(body) && /No elimines hojas __GP_RESTORE_\*/.test(body), "No preserva snapshots cuando falla la reversión.");
        assert(/rollbackBackup\.id/.test(body), "No informa el ID del respaldo recuperable.");
    });
    run("Drive prepara y verifica staging antes de mover el destino original", () => {
        const body = section("function handleRestoreDrive(", "\nfunction clearFolderContents");
        assert(body.indexOf("adminRestoreCopyFolderRecursively_") < body.indexOf("adminRestoreMoveFolderContents_(targetFolder, rollbackFolder)"), "Mueve el origen antes de validar staging.");
        assert(/adminRestoreManifestsEqual_\(backupManifest,\s*adminRestoreDriveManifest_\(stagingFolder\)\)/.test(body), "No compara staging con respaldo.");
        assert(/adminRestoreManifestsEqual_\(originalManifest,\s*adminRestoreDriveManifest_\(rollbackFolder\)\)/.test(body), "No verifica el contenido previo recuperable.");
        assert(!/clearFolderContents\(targetFolder\)/.test(body), "La restauración todavía limpia destructivamente el destino.");
    });
    run("Drive conserva el rollback si la reversión no puede verificarse", () => {
        const body = section("function handleRestoreDrive(", "\nfunction clearFolderContents");
        assert(/rollbackErrors\.length/.test(body) && /no pudo verificarse/.test(body), "No reporta fallo de rollback.");
        assert(/stagingId=/.test(body) && /rollbackId=/.test(body), "No informa los IDs de recuperación.");
        assert(/adminRestoreManifestsEqual_\(originalManifest,\s*adminRestoreDriveManifest_\(targetFolder\)\)/.test(body), "No verifica el estado final tras rollback.");
    });
    run("Los manifiestos Drive comparan ruta, MIME, tamaño y conteos", () => {
        const body = section("function adminRestoreDriveManifest_(", "\nfunction adminRestoreManifestsEqual_");
        assert(/getMimeType\(\)/.test(body) && /getSize\(\)/.test(body) && /entries\.sort\(\)/.test(body), "El inventario no compara metadatos/rutas.");
        assert(/folderCount/.test(body) && /fileCount/.test(body) && /totalBytes/.test(body), "No cuenta todos los recursos.");
    });
    run("Los respaldos validan ubicación, tipo MIME e identidad del recurso", () => {
        assert(/isDirectChildOfDriveRoot\(backupFile\)/.test(section("function handleRestoreDatabase(", "\nfunction handleRestoreDrive")), "DB acepta ubicaciones no autorizadas.");
        assert(/isDirectChildOfDriveRoot\(backupFolder\)/.test(section("function handleRestoreDrive(", "\nfunction clearFolderContents")), "Drive acepta ubicaciones no autorizadas.");
        assert(/application\/vnd\.google-apps\.spreadsheet/.test(admin), "No valida MIME Spreadsheet.");
    });
    run("El intercambio de hojas revierte nombres ante fallo de promoción o verificación", () => {
        const helper = functionSource("adminRestoreSwapDatabaseSheets_");
        assert(/catch \(error\)/.test(helper) && /promotedEntries/.test(helper) && /originalEntries/.test(helper), "No tiene compensación.");
        assert(/setName\(entry\.name\)/.test(helper) && /SpreadsheetApp\.flush\(\)/.test(helper), "No recupera y verifica nombres.");
        assert(/reversión de nombres no pudo verificarse/.test(helper), "No diferencia rollback fallido.");
    });
    run("Los backups históricos sin manifiesto se advierten sin omitir esquema", () => {
        const db = section("function handleRestoreDatabase(", "\nfunction handleRestoreDrive");
        const drive = section("function handleRestoreDrive(", "\nfunction clearFolderContents");
        assert(/Respaldo histórico sin manifiesto/.test(db) && /Respaldo histórico sin manifiesto/.test(drive), "No advierte falta de manifiesto.");
        assert(db.indexOf("adminRestoreValidateDatabaseSchema_") < db.indexOf("Respaldo histórico sin manifiesto"), "El backup histórico evita validar esquema.");
    });

    run("El intercambio DB real conserva hojas extra y elimina snapshots solo tras verificar", () => {
        const helper = functionSource("adminRestoreSwapDatabaseSheets_");
        const FakeSpreadsheetApp = { flush() {} };
        const manifest = sheet => ({ fingerprint: sheet.fingerprint });
        const factory = new Function("SpreadsheetApp", "adminRestoreSheetManifest_", helper + "\nreturn adminRestoreSwapDatabaseSheets_;");
        const swap = factory(FakeSpreadsheetApp, manifest);
        function makeSpreadsheet(opts) {
            const map = new Map();
            class Sheet {
                constructor(name, fingerprint, config) { this.name=name; this.fingerprint=fingerprint; this.config=config||{}; map.set(name,this); }
                getName(){return this.name;}
                setName(name){
                    if(this.config.failName===name) throw Error("rename failure");
                    if(map.has(name)&&map.get(name)!==this) throw Error("duplicate name");
                    map.delete(this.name); this.name=name; map.set(name,this);
                }
            }
            const ss={
                getSheets:()=>Array.from(map.values()),
                getSheetByName:name=>map.get(name)||null,
                deleteSheet:sheet=>{if(sheet.config.failDelete)throw Error("delete failure");map.delete(sheet.name);}
            };
            const old=new Sheet("Cortes","old"), extra=new Sheet("Auxiliar","extra");
            const stage=new Sheet("__GP_RESTORE_STAGE_run_0","new",opts&&opts.stageConfig);
            return {ss,old,extra,stage};
        }
        const h=makeSpreadsheet();
        const result=swap(h.ss,[h.old,h.extra],[{name:"Cortes",stage:h.stage,fingerprint:"new"}],"run");
        assert(h.ss.getSheetByName("Cortes")===h.stage,"No promovió la hoja nueva.");
        assert(h.ss.getSheetByName("Auxiliar")===h.extra,"No conservó hoja adicional.");
        assert(!h.ss.getSheetByName("__GP_RESTORE_OLD_run_0"),"No limpió snapshot tras verificar.");
        assert(result.preservedExtraSheets.includes("Auxiliar"),"No informó hojas adicionales.");
    });
    run("El intercambio DB revierte nombres si falla la promoción", () => {
        const helper = functionSource("adminRestoreSwapDatabaseSheets_");
        const factory = new Function("SpreadsheetApp","adminRestoreSheetManifest_",helper+"\nreturn adminRestoreSwapDatabaseSheets_;");
        const swap = factory({flush(){}}, sheet=>({fingerprint:sheet.fingerprint}));
        const map=new Map();
        const old={name:"Cortes",fingerprint:"old",getName(){return this.name;},setName(n){if(map.has(n)&&map.get(n)!==this)throw Error("duplicate");map.delete(this.name);this.name=n;map.set(n,this);}};
        const stage={name:"__GP_RESTORE_STAGE_run_0",fingerprint:"new",getName(){return this.name;},setName(n){if(n==="Cortes")throw Error("promotion failure");if(map.has(n)&&map.get(n)!==this)throw Error("duplicate");map.delete(this.name);this.name=n;map.set(n,this);}};
        map.set("Cortes",old);map.set(stage.name,stage);
        const ss={getSheets:()=>Array.from(map.values()),getSheetByName:n=>map.get(n)||null,deleteSheet:s=>map.delete(s.name)};
        let threw=false;try{swap(ss,[old],[{name:"Cortes",stage,fingerprint:"new"}],"run");}catch(e){threw=true;}
        assert(threw,"El fallo de promoción no se propagó.");
        assert(ss.getSheetByName("Cortes")===old,"No restauró la hoja original.");
        assert(ss.getSheetByName("__GP_RESTORE_STAGE_run_0")===stage,"No conservó staging para limpieza.");
    });
    run("El intercambio DB conserva snapshots si la reversión de nombres falla", () => {
        const helper = functionSource("adminRestoreSwapDatabaseSheets_");
        const factory = new Function("SpreadsheetApp","adminRestoreSheetManifest_",helper+"\nreturn adminRestoreSwapDatabaseSheets_;");
        const swap = factory({flush(){}}, sheet=>({fingerprint:sheet.fingerprint}));
        const map=new Map(); let renameBack=true;
        const old={name:"Cortes",fingerprint:"old",getName(){return this.name;},setName(n){if(n==="Cortes"&&renameBack){renameBack=false;throw Error("rollback failure");}if(map.has(n)&&map.get(n)!==this)throw Error("duplicate");map.delete(this.name);this.name=n;map.set(n,this);}};
        const stage={name:"__GP_RESTORE_STAGE_run_0",fingerprint:"different",getName(){return this.name;},setName(n){if(map.has(n)&&map.get(n)!==this)throw Error("duplicate");map.delete(this.name);this.name=n;map.set(n,this);}};
        map.set("Cortes",old);map.set(stage.name,stage);
        const ss={getSheets:()=>Array.from(map.values()),getSheetByName:n=>map.get(n)||null,deleteSheet:s=>map.delete(s.name)};
        let message="";try{swap(ss,[old],[{name:"Cortes",stage,fingerprint:"expected"}],"run");}catch(e){message=String(e.message||e);}
        assert(message.includes("reversión de nombres no pudo verificarse"),"No identificó el rollback fallido.");
        assert(ss.getSheetByName("__GP_RESTORE_OLD_run_0")===old,"No conservó el snapshot original.");
    });
    run("El traslado de recursos Drive preserva IDs y puede revertirse", () => {
        const parentHelper = functionSource("adminRestoreHasParent_");
        const moveHelper = functionSource("adminRestoreMoveFolderContents_");
        const factory = new Function("adminRestoreHasParent_", parentHelper + "\n" + moveHelper + "\nreturn adminRestoreMoveFolderContents_;");
        const move = factory(new Function("return (" + parentHelper + ")")());
        const makeIterator = values => { let i=0; return {hasNext:()=>i<values.length,next:()=>values[i++]}; };
        const parents = new Map([["file-1",new Set(["source"])],["folder-1",new Set(["source"])]]);
        const resource = id => ({getId:()=>id,getParents:()=>makeIterator(Array.from(parents.get(id),pid=>({getId:()=>pid})))});
        const file=Object.assign(resource("file-1"),{getName:()=>"image.jpg"});
        const child=Object.assign(resource("folder-1"),{getName:()=>"brand"});
        const makeFolder=(id,children)=>({
            getId:()=>id,
            getFiles:()=>makeIterator(children.filter(x=>x.getName&&parents.get(x.getId()).has(id)&&x.getId().startsWith("file"))),
            getFolders:()=>makeIterator(children.filter(x=>x.getName&&parents.get(x.getId()).has(id)&&x.getId().startsWith("folder"))),
            addFile:x=>parents.get(x.getId()).add(id), removeFile:x=>parents.get(x.getId()).delete(id),
            addFolder:x=>parents.get(x.getId()).add(id), removeFolder:x=>parents.get(x.getId()).delete(id)
        });
        const source=makeFolder("source",[file,child]), rollback=makeFolder("rollback",[file,child]);
        move(source,rollback);
        assert(parents.get("file-1").has("rollback")&&!parents.get("file-1").has("source"),"No movió archivo a rollback.");
        assert(parents.get("folder-1").has("rollback")&&!parents.get("folder-1").has("source"),"No movió subcarpeta a rollback.");
        move(rollback,source);
        assert(parents.get("file-1").has("source")&&!parents.get("file-1").has("rollback"),"No recuperó el archivo original.");
        assert(parents.get("folder-1").has("source")&&!parents.get("folder-1").has("rollback"),"No recuperó la subcarpeta original.");
    });
    run("El traslado Drive recupera una operación parcial que falla al retirar el padre original", () => {
        const parentHelper = functionSource("adminRestoreHasParent_");
        const moveHelper = functionSource("adminRestoreMoveFolderContents_");
        const factory = new Function("adminRestoreHasParent_", parentHelper + "\n" + moveHelper + "\nreturn adminRestoreMoveFolderContents_;");
        const move = factory(new Function("return (" + parentHelper + ")")());
        const parents=new Set(["source"]);let failOnce=true;
        const file={getId:()=>"file-1",getName:()=>"image.jpg",getParents:()=>({hasNext:(()=>{let done=false;return()=>!done;})(),next:()=>({getId:()=>"source"})})};
        const iterator=values=>{let i=0;return{hasNext:()=>i<values.length,next:()=>values[i++]};};
        file.getParents=()=>iterator(Array.from(parents,p=>({getId:()=>p})));
        const source={getId:()=>"source",getFiles:()=>iterator(parents.has("source")?[file]:[]),getFolders:()=>iterator([]),addFile:()=>parents.add("source"),removeFile:()=>{if(failOnce){failOnce=false;throw Error("partial move");}parents.delete("source");}};
        const staging={getId:()=>"staging",getFiles:()=>iterator(parents.has("staging")?[file]:[]),getFolders:()=>iterator([]),addFile:()=>parents.add("staging"),removeFile:()=>parents.delete("staging")};
        let failedMove=false;try{move(source,staging);}catch(e){failedMove=true;}
        assert(failedMove&&parents.has("source")&&parents.has("staging"),"No reprodujo el estado parcial esperado.");
        move(staging,source);
        assert(parents.has("source")&&!parents.has("staging"),"No revirtió el padre parcial.");
    });
    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}
