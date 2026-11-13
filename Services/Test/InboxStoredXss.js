function runInboxStoredXssTests(sources) {
    const ui = String(sources.ui || "");
    const feedback = String(sources.feedback || "");
    const results = [];
    let passed = 0;
    let failed = 0;
    const assert = (condition, message) => { if (!condition) throw new Error(message || "Aserción fallida"); };
    const run = (name, test) => {
        try { test(); passed++; results.push({ name, status: "PASS" }); }
        catch (error) { failed++; results.push({ name, status: "FAIL", message: String(error.message || error) }); }
    };
    const extract = name => {
        const start = ui.indexOf("export function " + name + "(");
        assert(start >= 0, "No se encontró " + name);
        const candidates = ["\nexport function ", "\nfunction "]
            .map(marker => ui.indexOf(marker, start + 10)).filter(index => index >= 0);
        const end = candidates.length ? Math.min(...candidates) : ui.length;
        return ui.slice(start, end).trim();
    };
    const functions = {
        list: extract("renderInboxList"),
        detail: extract("renderInboxDetail"),
        report: extract("openReportCutModal"),
        suggest: extract("openSuggestCutModal"),
        success: (() => { const start = ui.indexOf("function showReportSuccessModal("); const end = ui.indexOf("\nfunction createSuggestionOperationId_(", start); assert(start >= 0 && end > start); return ui.slice(start, end).trim(); })()
    };
    const parseFunction = source => new Function("return (" + source.replace(/^export\s+/, "") + ");")();

    Object.entries(functions).forEach(([name, source]) => {
        run(name + " tiene sintaxis JavaScript válida", () => assert(typeof parseFunction(source) === "function"));
    });

    run("Inbox lista no usa innerHTML", () => {
        assert(!/innerHTML\s*=|insertAdjacentHTML|outerHTML\s*=/.test(functions.list));
        assert(/title\.textContent\s*=\s*String\(item\.subject/.test(functions.list));
        assert(/appendChild\(itemDiv\)/.test(functions.list));
    });
    run("Inbox lista muestra subject e ID como texto", () => {
        assert(/item\.subject\s*\|\|\s*`ID: \$\{item\.id/.test(functions.list));
        assert(/title\.textContent/.test(functions.list));
    });
    run("Inbox detalle usa sanitizador solo para contenido enriquecido", () => {
        assert(/messageBody\.textContent\s*=\s*String\(item\.content/.test(functions.detail));
        assert(/replyBody\.innerHTML\s*=\s*sanitizeHtmlContent\(String\(item\.reply/.test(functions.detail));
    });
    run("Inbox detalle no interpola campos externos en HTML", () => {
        assert(!/innerHTML\s*=\s*`[^;]*\$\{\s*(?:item|reportMetadata|suggestionData|proposedValues|vehicleLabel)/s.test(functions.detail));
        ["item.subject", "item.user", "item.vehicleId", "reportMetadata.reportId", "suggestionData.reportId",
         "proposedValues.tipo", "proposedValues.ubicacion", "item.responder", "item.contentType"].forEach(field => {
            assert(!new RegExp("innerHTML\\s*=\\s*`[^;]*\\$\\{\\s*" + field.replace(".", "\\.") + "(?![A-Za-z0-9_])", "s").test(functions.detail), field + " interpolado en HTML");
        });
    });
    run("Inbox detalle asigna datos visibles mediante textContent/nodos", () => {
        ["item.subject", "item.user", "reportMetadata.reportId", "suggestionData.reportId",
         "proposedValues.tipo", "proposedValues.ubicacion", "item.contentType"].forEach(field => {
            assert(functions.detail.includes(field), "Falta uso de " + field);
        });
        assert(/element\.textContent\s*=\s*String\(text\)/.test(functions.detail));
        assert(/document\.createTextNode/.test(functions.detail));
    });
    run("Inbox detalle limita URL de YouTube a HTTPS y hosts permitidos", () => {
        assert(/parsedVideoUrl\.protocol\s*===\s*'https:'/.test(functions.detail));
        assert(/youtube\.com.*youtu\.be/.test(functions.detail));
        assert(/videoLink\.rel\s*=\s*'noopener noreferrer'/.test(functions.detail));
    });
    run("Inbox detalle limita imagen a host Drive y fija rel seguro", () => {
        assert(/\^https:\\\/\\\/drive\\\.google\\\.com\\\//i.test(functions.detail));
        assert(/imageLink\.rel\s*=\s*'noopener noreferrer'/.test(functions.detail));
    });
    run("confirmación de reporte usa plantilla estática y reportId como texto", () => {
        assert(typeof parseFunction(functions.success) === "function");
        const start = functions.success.indexOf("content.innerHTML = `");
        const end = functions.success.indexOf("`; ", start);
        const template = functions.success.slice(start, functions.success.indexOf("`;", start) + 1);
        assert(start >= 0 && template.length > 0);
        assert(!template.includes("${"));
        assert(functions.success.includes('identity.querySelector("strong").textContent = String(reportId || "")'));
    });
    run("modal de reporte usa plantilla estática", () => {
        const template = functions.report.match(/content\.innerHTML\s*=\s*`([\s\S]*?)`;/);
        assert(template, "No se encontró plantilla del reporte");
        assert(!/\$\{/.test(template[1]), "Plantilla contiene interpolación");
        assert(/currentCutData\.tipo/.test(functions.report) && /summary\.querySelector\('strong'\)\.textContent/.test(functions.report));
        assert(/String\(corteNum\)/.test(functions.report));
    });
    run("modal de sugerencia usa plantilla estática", () => {
        const template = functions.suggest.match(/content\.innerHTML\s*=\s*`([\s\S]*?)`;/);
        assert(template, "No se encontró plantilla de sugerencia");
        assert(!/\$\{/.test(template[1]), "Plantilla contiene interpolación");
        assert(/reportStrong\.textContent\s*=\s*String\(reportRef\)/.test(functions.suggest));
        assert(/vehicleStrong\.textContent\s*=\s*String\(vehicleId\)/.test(functions.suggest));
    });
    run("dropdownOptions se crea con option.value y option.textContent", () => {
        assert(/option\.value\s*=\s*value/.test(functions.suggest));
        assert(/option\.textContent\s*=\s*value/.test(functions.suggest));
        assert(/select\.appendChild\(option\)/.test(functions.suggest));
        assert(!/\$\{(?:tipoOptionsHtml|relayOptionsHtml)/.test(functions.suggest));
    });
    run("currentCutData llena valores de formulario mediante value", () => {
        assert(/#sug-ubicacion"\)\.value\s*=\s*String\(currentCutData\.ubicacion/.test(functions.suggest));
        assert(/#sug-color"\)\.value\s*=\s*String\(currentCutData\.colorCable/.test(functions.suggest));
    });
    run("los cuatro componentes no interpolan datos externos en plantillas HTML", () => {
        const payloadFields = ["item.subject", "item.user", "item.vehicleId", "vehicleId", "reportRef",
            "reportId", "currentCutData.tipo", "currentCutData.ubicacion", "currentCutData.colorCable",
            "optionValue", "reportMetadata.reportId", "proposedValues.tipo"];
        [functions.list, functions.detail, functions.report, functions.suggest].forEach(source => {
            const assignments = [...source.matchAll(/(?:innerHTML|outerHTML)\s*=\s*`([\s\S]*?)`/g)];
            assignments.forEach(match => payloadFields.forEach(field => {
                assert(!match[1].includes("${" + field), "Interpolación peligrosa: " + field);
            }));
        });
    });

    const payloads = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)><circle /></svg>',
        '<div onclick="alert(1)" onmouseover="alert(2)">x</div>',
        '" autofocus onfocus="alert(1)',
        "'><iframe srcdoc='<script>alert(1)</script>'></iframe>",
        '<a href="javascript:alert(1)">abrir</a>'
    ];
    run("matriz de payloads almacenados no tiene sinks de interpolación", () => {
        assert(payloads.length >= 7);
        const source = Object.values(functions).join("\n");
        payloads.forEach(payload => {
            assert(!source.includes("${" + payload), "Payload interpolado directamente");
        });
        assert(/textContent/.test(functions.list) && /textContent/.test(functions.detail));
        assert(/option\.textContent/.test(functions.suggest));
    });
    run("el texto enriquecido conserva la frontera del sanitizador", () => {
        assert(functions.detail.split("innerHTML = sanitizeHtmlContent").length - 1 === 1);
    });

    const extractBackend=name=>{const start=feedback.indexOf("function "+name+"(");assert(start>=0,"No se encontró backend "+name);const c=["\nfunction ","\nconst "].map(m=>feedback.indexOf(m,start+10)).filter(x=>x>=0);return feedback.slice(start,c.length?Math.min(...c):feedback.length).trim();};
    const backendHelpers=(()=>{const source=[extractBackend("getPysYouTubeVideoId_"),extractBackend("normalizeInboxText_"),extractBackend("normalizeInboxVideoMetadata_"),extractBackend("normalizeInboxVideoUrl_"),"return {normalizeInboxText_,normalizeInboxVideoMetadata_,normalizeInboxVideoUrl_};"].join("\n");return new Function("getPysYouTubeVideoId_",source)(value=>{const m=String(value||"").match(/^https:\/\/([^/?#]+)(\/[^?#]*)?(?:\?([^#]*))?(?:#.*)?$/i);if(!m)return "";const host=m[1].toLowerCase(),path=m[2]||"/",query=m[3]||"",valid=/^[A-Za-z0-9_-]{11}$/;if(host==="youtu.be"){const x=path.match(/^\/([A-Za-z0-9_-]{11})\/?$/);return x&&valid.test(x[1])?x[1]:"";}if(!["youtube.com","www.youtube.com","m.youtube.com","youtube-nocookie.com","www.youtube-nocookie.com"].includes(host))return "";if(path==="/watch"){const ids=query.split("&").filter(Boolean).filter(p=>p.split("=")[0]==="v").map(p=>p.slice(2));return ids.length===1&&valid.test(ids[0])?ids[0]:"";}const x=path.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/);return x&&valid.test(x[1])?x[1]:"";});})();
    run("backend normaliza texto conservando payload como texto",()=>{const p="<img src=x onerror=alert(1)>";assert(backendHelpers.normalizeInboxText_(" "+p+" ","Título",160,false)===p);});
    run("backend rechaza tipos y longitudes inválidas",()=>{let a=false,b=false;try{backendHelpers.normalizeInboxText_(42,"Título",160,false);}catch(_){a=true;}try{backendHelpers.normalizeInboxText_("x".repeat(161),"Título",160,false);}catch(_){b=true;}assert(a&&b);});
    run("metadatos aplican allowlist por tipo de contenido",()=>{const p="<svg onload=alert(1)>",d=backendHelpers.normalizeInboxVideoMetadata_({tutorialId:" TUT-1 ",tema:p,onerror:"alert(2)"},"tutorial");assert(d.tutorialId==="TUT-1"&&d.tema===p&&!Object.prototype.hasOwnProperty.call(d,"onerror"));});
    run("metadatos PyS normalizan modelos asociados",()=>{const d=backendHelpers.normalizeInboxVideoMetadata_({alcance:"especifico",modelosAsociados:[" VEH-1 ",22]},"pys");assert(d.modelosAsociados.length===2&&d.modelosAsociados[0]==="VEH-1"&&d.modelosAsociados[1]==="22");});
    run("metadatos rechazan estructuras inesperadas",()=>{let rejected=false;try{backendHelpers.normalizeInboxVideoMetadata_("<svg>","tutorial");}catch(_){rejected=true;}assert(rejected);});
    run("URL YouTube canonicaliza y exige ID coincidente",()=>{assert(backendHelpers.normalizeInboxVideoUrl_("https://www.youtube.com/watch?v=abcdefghijk","abcdefghijk")==="https://www.youtube.com/watch?v=abcdefghijk");assert(backendHelpers.normalizeInboxVideoUrl_("https://www.youtube.com/watch?v=abcdefghijk","lmnopqrstuv")==="");});
    run("URL histórica rechaza HTTP y host impostor",()=>{assert(backendHelpers.normalizeInboxVideoUrl_("javascript:alert(1)","")==="");assert(backendHelpers.normalizeInboxVideoUrl_("https://youtube.com.evil.test/watch?v=abcdefghijk","")==="");assert(backendHelpers.normalizeInboxVideoUrl_("http://youtube.com/watch?v=abcdefghijk","")==="");});
    run("alta backend normaliza antes de persistir",()=>{const a=feedback.indexOf("function handleSubmitVideoForApproval("),b=feedback.indexOf("\n}\n\n/**",a),h=feedback.slice(a,b+2);assert(h.includes("normalizeInboxText_(title")&&h.includes("normalizeInboxText_(description")&&h.includes("normalizeInboxVideoMetadata_(metadata")&&h.includes("normalizeInboxVideoUrl_(videoUrl,actualVideoId)")&&h.includes("title:normalizedTitle")&&h.includes("metadata:normalizedMetadata"));});
    run("lectura histórica sanea URL y metadatos",()=>{const a=feedback.indexOf("function handleGetFeedbackItems("),b=feedback.indexOf("\nfunction handleReplyToFeedback",a),h=feedback.slice(a,b);assert(h.includes("normalizeInboxVideoUrl_(videoMeta.videoUrl,videoId)")&&h.includes("normalizeInboxVideoMetadata_(videoMeta.metadata,contentType)")&&!h.includes("videoUrl:videoMeta.videoUrl"));});
    run("mensaje usa texto y respuesta enriquecida conserva sanitizador",()=>{assert(/messageBody\.textContent\s*=/.test(functions.detail)&&/replyBody\.innerHTML\s*=\s*sanitizeHtmlContent/.test(functions.detail));});
    return { status: failed === 0 ? "PASS" : "FAIL", passed, failed, results };
}
