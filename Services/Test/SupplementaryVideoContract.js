function runSupplementaryVideoContractTests(sources) {
    const results = [];
    let passed = 0, failed = 0;
    function assert_(value, message) { if (!value) throw new Error(message || "Aserción fallida."); }
    const pendingRuns = [];
    function run_(name, callback) {
        try {
            const result = callback();
            if (result && typeof result.then === "function") {
                pendingRuns.push(result.then(() => {
                    passed++; results.push({ name, status: "PASS" });
                }).catch(error => {
                    failed++; results.push({ name, status: "FAIL", message: String(error && error.message || error) });
                }));
            } else {
                passed++; results.push({ name, status: "PASS" });
            }
        } catch (error) {
            failed++; results.push({ name, status: "FAIL", message: String(error && error.message || error) });
        }
    }
    function extractFunction_(source, signature, nextSignature) {
        const start = String(source || "").indexOf(signature);
        if (start < 0) throw new Error("No se encontró " + signature);
        const end = nextSignature ? String(source).indexOf(nextSignature, start + signature.length) : String(source).indexOf("\n}", start);
        if (end < 0) throw new Error("No se encontró el final de " + signature);
        return String(source).slice(start, nextSignature ? end : end + 2);
    }
    const write = String(sources.write || ""), admin = String(sources.admin || "");
    const catalog = String(sources.catalog || ""), feedback = String(sources.feedback || "");
    const ui = String(sources.ui || ""), addCortes = String(sources.addCortes || "");
    const planRuntime = source => {
        const start = source.indexOf("function createSupplementaryInfoError_");
        const end = source.indexOf("function buildSupplementaryInfoPlan_", start);
        assert_(start >= 0 && end > start, "No se encontró el helper de allowlist.");
        return new Function(source.slice(start, end) + ";return assertSupplementaryInfoPayloadKeys_;")();
    };
    [["WRITE", write], ["ADMIN", admin]].forEach(([label, source]) => {
        const assertKeys = planRuntime(source);
        run_(label + " acepta campos suplementarios y metadatos reconocidos", () => {
            assertKeys({ vehicleId: "V-1", userId: "U-1", sessionToken: "token", timestamp: "01/01/2026",
                apertura: "Texto", imgApertura: "", cableAlimen: "Cable", imgCableAlimen: "",
                cableAlimen2: "", imgCableAlimen2: "", cableAlimen3: "", imgCableAlimen3: "",
                notaImportante: "", opId: "OP-1" });
        });
        ["videoGuiaDesarmeUrl", "videoGuiaUrl", "videoUrl", "Video", "video"].forEach(field => {
            run_(label + " rechaza campo directo de vídeo " + field, () => {
                let rejected = false;
                try { assertKeys({ vehicleId: "V-1", [field]: "https://www.youtube.com/watch?v=abcdefghijk" }); }
                catch (error) { rejected = error.code === "SUPPLEMENTARY_VIDEO_APPROVAL_REQUIRED"; }
                assert_(rejected, "No se rechazó el alias de vídeo directo.");
            });
        });
        run_(label + " rechaza campo selector no reconocido", () => {
            let rejected = false;
            try { assertKeys({ vehicleId: "V-1", fieldName: "videoGuiaDesarmeUrl", value: "https://www.youtube.com/watch?v=abcdefghijk" }); }
            catch (error) { rejected = error.code === "SUPPLEMENTARY_VIDEO_APPROVAL_REQUIRED"; }
            assert_(rejected);
        });
        run_(label + " rechaza campos arbitrarios incluso junto a un campo válido", () => {
            let rejected = false;
            try { assertKeys({ vehicleId: "V-1", apertura: "Apertura", adminOverride: true }); }
            catch (error) { rejected = error.code === "SUPPLEMENTARY_INVALID_PAYLOAD"; }
            assert_(rejected);
        });
    });

    const normalizer = new Function(extractFunction_(catalog, "function normalizeYouTubeUrl(url)") + ";return normalizeYouTubeUrl;")();
    const videoId = "abcdefghijk";
    [
        "https://www.youtube.com/watch?v=" + videoId,
        "https://youtu.be/" + videoId,
        "https://www.youtube.com/embed/" + videoId,
        "https://youtube.com/shorts/" + videoId,
        "https://www.youtube-nocookie.com/live/" + videoId,
        videoId
    ].forEach((url, index) => run_("CATALOG acepta URL YouTube permitida " + (index + 1), () => {
        assert_(normalizer(url) === "https://www.youtube.com/embed/" + videoId + "?enablejsapi=1");
    }));
    [
        "http://www.youtube.com/watch?v=" + videoId,
        "https://evil.example/watch?v=" + videoId,
        "https://youtube.com.evil.example/watch?v=" + videoId,
        "https://user@www.youtube.com/watch?v=" + videoId,
        "https://www.youtube.com:443/watch?v=" + videoId,
        "https://www.youtube.com/watch?v=" + videoId + "&v=zyxwvutsrqp",
        "https://www.youtube.com/channel/" + videoId,
        "https://www.youtube.com/watch?v=bad"
    ].forEach((url, index) => run_("CATALOG rechaza URL no permitida " + (index + 1), () => {
        assert_(normalizer(url) === null, "El normalizador aceptó " + url);
    }));

    const feedbackId = extractFunction_(feedback, "function getPysYouTubeVideoId_(value)");
    const feedbackUrl = extractFunction_(feedback, "function normalizeInboxVideoUrl_(value,expectedVideoId)");
    const feedbackRuntime = new Function(feedbackId + "\n" + feedbackUrl + ";return {id:getPysYouTubeVideoId_,url:normalizeInboxVideoUrl_};")();
    run_("FEEDBACK canonicaliza el vídeo aprobado al campo URL canónico", () => {
        assert_(feedbackRuntime.url("https://youtu.be/" + videoId, videoId) === "https://www.youtube.com/watch?v=" + videoId);
    });
    run_("FEEDBACK rechaza host ajeno y protocolo HTTP", () => {
        assert_(feedbackRuntime.url("https://evil.example/watch?v=" + videoId, videoId) === "");
        assert_(feedbackRuntime.url("http://www.youtube.com/watch?v=" + videoId, videoId) === "");
    });
    run_("FEEDBACK rechaza URL cuyo ID no coincide con videoId", () => {
        assert_(feedbackRuntime.url("https://www.youtube.com/watch?v=" + videoId, "zyxwvutsrqp") === "");
    });
    run_("FEEDBACK rechaza parámetros v duplicados", () => {
        assert_(feedbackRuntime.url("https://www.youtube.com/watch?v=" + videoId + "&v=zyxwvutsrqp", videoId) === "");
    });

    const submitStart = feedback.indexOf("function handleSubmitVideoForApproval(payload)");
    const submitEnd = feedback.indexOf("\nfunction ", submitStart + 20);
    const submitBlock = feedback.slice(submitStart, submitEnd);
    run_("FEEDBACK valida tipo destino y URL antes de escribir solicitud", () => {
        assert_(submitBlock.indexOf('["corte","pys","tutorial"].includes(normalizedContentType)') >= 0);
        assert_(submitBlock.indexOf("normalizeInboxVideoUrl_(videoUrl,actualVideoId)") >= 0);
        assert_(submitBlock.indexOf("if(!/^[A-Za-z0-9_-]{11}$/.test(actualVideoId)||!canonicalUrl)") >= 0);
    });
    run_("FEEDBACK no devuelve success sin verificar la fila de aprobación", () => {
        const writeIndex = submitBlock.indexOf("setValues([newRow])");
        const verifyIndex = submitBlock.indexOf("const saved=findVideoApprovalByOperation_");
        const successIndex = submitBlock.indexOf('return{status:"success",id:newId');
        assert_(writeIndex >= 0 && verifyIndex > writeIndex && successIndex > verifyIndex);
        assert_(submitBlock.includes('if(!saved||String(saved.row[COLS_FEEDBACKS.ID-1]||"")!==newId)throw new Error'));
    });

    const targetBlock = extractFunction_(feedback, "function getVideoApprovalTarget_(videoData)");
    run_("FEEDBACK limita destino Cortes al campo físico videoGuiaDesarmeUrl", () => {
        assert_(targetBlock.includes('videoData.contentType === "corte"'));
        assert_(targetBlock.includes('headers[COLS_CORTES.videoGuiaDesarmeUrl - 1]') &&
            targetBlock.includes('"videoGuiaDesarmeUrl"') &&
            targetBlock.includes("videoColumn: COLS_CORTES.videoGuiaDesarmeUrl"));
    });
    const publishBlock = extractFunction_(feedback, "function publishApprovedVideo_(videoData)");
    run_("FEEDBACK confirma escritura del vídeo con lectura posterior", () => {
        assert_(publishBlock.includes("target.sheet.getRange(target.record.rowIndex, target.videoColumn).setValue(url)"));
        assert_(publishBlock.includes("getRange(target.record.rowIndex, target.videoColumn).getValue()"));
        assert_(publishBlock.includes('if (savedVideo !== url) throw new Error'));
    });

    const catalogStart = catalog.indexOf("function handleGetCatalogData(payload = {})");
    const catalogEnd = catalog.indexOf("\nfunction ", catalogStart + 20);
    const catalogBlock = catalog.slice(catalogStart, catalogEnd);
    run_("CATALOG lee Cortes desde Spreadsheet tras forceRefresh", () => {
        assert_(catalogBlock.includes("payload.forceRefresh === true"));
        assert_(catalogBlock.includes("getDataRange().getValues()"));
    });
    run_("CATALOG expone el campo físico como Video normalizado", () => {
        assert_(catalogBlock.includes("vehicle.Video = normalizeYouTubeUrl(vehicle.videoGuiaDesarmeUrl)"));
        assert_(catalogBlock.includes("delete vehicle.videoGuiaDesarmeUrl"));
    });

    const openVideoStart = ui.indexOf("export function openAddVideoModal(item)");
    const openVideoEnd = ui.indexOf("\n/* TAREA", openVideoStart);
    const openVideo = ui.slice(openVideoStart, openVideoEnd);
    run_("UI asocia el vídeo al ID del vehículo por flujo de aprobación", () => {
        assert_(openVideo.includes('contentType: "corte"') && openVideo.includes("referenceId: item.id"));
        assert_(openVideo.includes("openYouTubeUploadModal"));
    });
    run_("UI reconoce ambos nombres del campo ya publicado", () => {
        assert_(openVideo.includes("item.videoGuiaDesarmeUrl || item.Video"));
    });
    const expandStart = ui.indexOf("export function openExpandMenuModal(item)");
    const expandEnd = ui.indexOf("\n/* TAREA", expandStart);
    const expand = ui.slice(expandStart, expandEnd);
    run_("UI oculta la opción cuando cualquiera de los alias indica vídeo existente", () => {
        assert_(expand.includes('String(item.videoGuiaDesarmeUrl || item.Video || "").trim()'));
    });
    run_("add_cortes no ofrece URL manual y usa aprobación de YouTube", () => {
        assert_(!addCortes.includes('id="videoGuiaUrl"'));
        assert_(addCortes.includes("openYouTubeUploadModal({") && addCortes.includes("contentType: 'corte'"));
        assert_(addCortes.includes("referenceId: state.selectedVehicleId"));
    });

    const helperStart = addCortes.indexOf("async function verifySupplementaryCatalogWrite_");
    const helperEnd = addCortes.indexOf("\n        async function handleStage3Submit", helperStart);
    const helperSource = addCortes.slice(helperStart, helperEnd);
    const verify = new Function(helperSource + ";return verifySupplementaryCatalogWrite_;")();
    const payload = { vehicleId: "V-1", apertura: "Apertura", imgApertura: "data:image/png;base64,AA",
        notaImportante: "Nota", cableAlimen3: "Cable", imgCableAlimen3: "data:image/png;base64,BB" };
    const saved = { id: "V-1", apertura: "Apertura", imgApertura: "https://drive/a",
        notaImportante: "Nota", cableAlimen2: "Cable", imgCableAlimen2: "https://drive/b" };
    run_("Etapa 3 verifica vehículo, apertura, nota y slot real devuelto por WRITE", async () => {
        const result = await verify({ status: "success", vehicleId: "V-1", slotIndex: 2 }, payload,
            async () => ({ status: "success", source: "spreadsheet", data: { cortes: [saved] } }));
        assert_(result.vehicleId === "V-1" && result.item === saved);
    });
    run_("Etapa 3 rechaza respuesta WRITE no exitosa", async () => {
        let rejected = false;
        try { await verify({ status: "error", vehicleId: "V-1" }, payload, async () => ({})); }
        catch (_) { rejected = true; }
        assert_(rejected);
    });
    run_("Etapa 3 rechaza vehículo distinto", async () => {
        let rejected = false;
        try { await verify({ status: "success", vehicleId: "V-2" }, payload, async () => ({})); }
        catch (_) { rejected = true; }
        assert_(rejected);
    });
    run_("Etapa 3 rechaza catálogo sin el vehículo", async () => {
        let rejected = false;
        try { await verify({ status: "success", vehicleId: "V-1", slotIndex: 2 }, payload,
            async () => ({ status: "success", data: { cortes: [] } })); }
        catch (_) { rejected = true; }
        assert_(rejected);
    });
    run_("Etapa 3 rechaza lectura duplicada del vehículo", async () => {
        let rejected = false;
        try { await verify({ status: "success", vehicleId: "V-1", slotIndex: 2 }, payload,
            async () => ({ status: "success", data: { cortes: [saved, saved] } })); }
        catch (_) { rejected = true; }
        assert_(rejected);
    });
    run_("Etapa 3 rechaza campo que no aparece en CATALOG", async () => {
        let rejected = false;
        try { await verify({ status: "success", vehicleId: "V-1", slotIndex: 2 }, payload,
            async () => ({ status: "success", data: { cortes: [{ id: "V-1", apertura: "", imgApertura: "", notaImportante: "" }] } })); }
        catch (_) { rejected = true; }
        assert_(rejected);
    });
    run_("Etapa 3 requiere slot devuelto por WRITE si envió cable", async () => {
        let rejected = false;
        try { await verify({ status: "success", vehicleId: "V-1" }, payload,
            async () => ({ status: "success", data: { cortes: [saved] } })); }
        catch (_) { rejected = true; }
        assert_(rejected);
    });
    run_("Etapa 3 solicita lectura fresca del catálogo", () => {
        assert_(helperSource.includes('routeAction("getCatalogData", { forceRefresh: true })'));
    });
    run_("Etapa 3 no muestra éxito si WRITE no confirma", () => {
        const start = addCortes.indexOf("const writeResult = await routeAction('addSupplementaryInfo'");
        const alert = addCortes.indexOf('alert("Información guardada y verificada en el catálogo.');
        assert_(start >= 0 && addCortes.indexOf("writeResult.status !== 'success'", start) > start &&
            alert > addCortes.indexOf("verifySupplementaryCatalogWrite_(writeResult, payload)", start));
    });

    return Promise.all(pendingRuns).then(() => ({ status: failed === 0 ? "PASS" : "FAIL", passed, failed, results }));
}