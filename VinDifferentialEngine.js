/**
 * VinDifferentialEngine.js
 * Motor Automático de Análisis Diferencial de VIN y Generación de Firmas
 */

export function normalizeVin(vinRaw) {
    if (!vinRaw) return "";
    return String(vinRaw).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeModelName(modelRaw) {
    if (!modelRaw) return "";
    return String(modelRaw).trim().toUpperCase().replace(/[-_\s./\\]+/g, "");
}

function parseModelYear(value) {
    if (value === undefined || value === null || String(value).trim() === "") return null;
    const year = Number(String(value).trim());
    return Number.isInteger(year) && year > 0 && year <= 9999 ? year : null;
}

function normalizeModelYearRange(anoDesde, anoHasta, currentYear = new Date().getFullYear()) {
    const start = parseModelYear(anoDesde);
    // Un anoHasta vacío representa una generación que continúa vigente hasta el año actual.
    const end = anoHasta === undefined || anoHasta === null || String(anoHasta).trim() === ""
        ? parseModelYear(currentYear)
        : parseModelYear(anoHasta);

    // Sin año inicial no existe un intervalo verificable; no se asume solapamiento universal.
    if (start === null || end === null || start > end) return null;
    return { start, end };
}

export function doYearRangesOverlap(desdeA, hastaA, desdeB, hastaB, currentYear = new Date().getFullYear()) {
    const rangeA = normalizeModelYearRange(desdeA, hastaA, currentYear);
    const rangeB = normalizeModelYearRange(desdeB, hastaB, currentYear);
    if (!rangeA || !rangeB) return false;
    return Math.max(rangeA.start, rangeB.start) <= Math.min(rangeA.end, rangeB.end);
}

export function isYearWithinRange(yearValue, anoDesde, anoHasta, currentYear = new Date().getFullYear()) {
    const year = parseModelYear(yearValue);
    const range = normalizeModelYearRange(anoDesde, anoHasta, currentYear);
    return year !== null && range !== null && year >= range.start && year <= range.end;
}

export function fingerprintVinCatalog(records) {
 const rows=(Array.isArray(records)?records:[]).map(record=>{const r=record||{};return{id:String(r.id==null?"":r.id),marca:String(r.marca||"").trim().toUpperCase(),modelo:normalizeModelName(r.modelo),anoDesde:String(r.anoDesde==null?"":r.anoDesde).trim(),anoHasta:String(r.anoHasta==null?"":r.anoHasta).trim(),versiones:parseVersionsList(r.versionesAplicables).map(v=>v.trim().toUpperCase()),vin:(Array.isArray(r.vin)?r.vin:(r.vin==null?[]:[r.vin])).map(v=>normalizeVin(v))};});
 const source=JSON.stringify(rows.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:JSON.stringify(a)<JSON.stringify(b)?-1:JSON.stringify(a)>JSON.stringify(b)?1:0));let hash=2166136261;for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619);}return `${rows.length}:${(hash>>>0).toString(16).padStart(8,"0")}`;
}
export function parseVersionsList(versionesStr) {
    if (!versionesStr) return [];
    const parts = String(versionesStr).split(/[,/\\\\]+/);
    const seen = new Set();
    const result = [];
    for (const p of parts) {
        const clean = p.trim();
        if (clean && !seen.has(clean.toUpperCase())) {
            seen.add(clean.toUpperCase());
            result.push(clean);
        }
    }
    return result;
}

export function getClassificationKey(item, version = "", level = 5) {
    const marca = (item.marca || "").trim().toUpperCase();
    const modelo = (item.modelo || "").trim().toUpperCase();
    const gen = (item.anoDesde && item.anoHasta) ? `${item.anoDesde}-${item.anoHasta}` : "";
    const rango = `${item.anoDesde || ""}-${item.anoHasta || ""}`;
    const ver = (version || "").trim().toUpperCase();

    switch (level) {
        case 1: return marca;
        case 2: return `${marca}|${modelo}`;
        case 3: return `${marca}|${modelo}|GEN:${gen}`;
        case 4: return `${marca}|${modelo}|RANGO:${rango}`;
        case 5:
        default:
            return `${marca}|${modelo}|RANGO:${rango}|VER:${ver}`;
    }
}

export class VinDifferentialEngine {
    constructor(options = {}) {
        const configuredThreshold = Number(options.minSamplesThreshold);
        this.minSamplesThreshold = Number.isInteger(configuredThreshold) && configuredThreshold > 0 ? configuredThreshold : 2;
        this.signatures = new Map();
        this.conflictLog = [];
        this.auditLog = [];
        this.catalogFingerprint = null;
        this.version = "1.3.0";
    }

    buildSampleMatrix(records) {
        const matrixByLength = new Map();

        // AUDITORÍA VIN: Contar versiones por familia de marca y modelo canónico transversalmente en toda la base de datos
        const modelFamilyVersions = new Map();
        (records || []).forEach(r => {
            if (!r || !r.marca || !r.modelo) return;
            const normMarca = (r.marca || "").trim().toUpperCase();
            const normModel = normalizeModelName(r.modelo);
            const famKey = `${normMarca}|${normModel}`;
            if (!modelFamilyVersions.has(famKey)) {
                modelFamilyVersions.set(famKey, new Set());
            }
            const vers = parseVersionsList(r.versionesAplicables);
            vers.forEach(v => modelFamilyVersions.get(famKey).add(v.toUpperCase()));
        });

        (records || []).forEach(record => {
            if (!record) return;

            const normMarca = (record.marca || "").trim().toUpperCase();
            const normModel = normalizeModelName(record.modelo);
            const famKey = `${normMarca}|${normModel}`;
            const familyTotalVersions = modelFamilyVersions.get(famKey) ? modelFamilyVersions.get(famKey).size : 0;

            // Permite analizar si el modelo tiene más de una versión en su fila O transversalmente entre registros de la misma familia
            const versions = parseVersionsList(record.versionesAplicables);
            if (versions.length <= 1 && familyTotalVersions <= 1) {
                // Si el modelo tiene una sola versión aplicable en todo el catálogo, no requiere diferenciación diferencial
                return;
            }

            const vinRaw = record.vin;
            if (!vinRaw) return;

            let vinList = [];
            if (Array.isArray(vinRaw)) {
                vinList = vinRaw;
            } else {
                const str = String(vinRaw).trim();
                if (str.startsWith("[") && str.endsWith("]")) {
                    try {
                        const parsed = JSON.parse(str);
                        if (Array.isArray(parsed)) vinList = parsed;
                    } catch (e) {
                        vinList = [str];
                    }
                } else {
                    vinList = str.split(/[,/\\\\]+/);
                }
            }

            vinList.forEach((rawV, idx) => {
                const cleanV = normalizeVin(rawV);
                if (!cleanV) return;

                const vLen = cleanV.length;
                if (!matrixByLength.has(vLen)) {
                    matrixByLength.set(vLen, new Map());
                }

                const assignedVersion = versions[idx] || versions[0] || "";
                const groupMap = matrixByLength.get(vLen);
                const classKey = getClassificationKey(record, assignedVersion, 5);

                if (!groupMap.has(classKey)) {
                    groupMap.set(classKey, {
                        classKey,
                        marca: (record.marca || "").trim(),
                        modelo: (record.modelo || "").trim(),
                        anoDesde: record.anoDesde,
                        anoHasta: record.anoHasta,
                        version: assignedVersion,
                        vehicleId: record.id,
                        samples: []
                    });
                }

                groupMap.get(classKey).samples.push({
                    vin: cleanV,
                    recordId: record.id,
                    version: assignedVersion
                });
            });
        });

        return matrixByLength;
    }

    analyzePositionStability(samples, length) {
        const stablePositions = new Map();
        const variablePositions = new Set();

        for (let pos = 0; pos < length; pos++) {
            const charsAtPos = new Set();
            samples.forEach(s => {
                if (s.vin && s.vin[pos]) charsAtPos.add(s.vin[pos]);
            });

            if (charsAtPos.size === 1) {
                stablePositions.set(pos, Array.from(charsAtPos)[0]);
            } else if (charsAtPos.size > 1) {
                variablePositions.add(pos);
            }
        }

        return { stablePositions, variablePositions };
    }

    findMinimalCombination(targetGroup, competitorGroups, length) {
        const targetSamples = targetGroup.samples;
        if (!targetSamples || targetSamples.length === 0) return null;

        const { stablePositions } = this.analyzePositionStability(targetSamples, length);
        if (stablePositions.size === 0) return null;

        const availablePositions = Array.from(stablePositions.keys());

        // TAREA 4.1: Priorizar posiciones que NO pertenezcan a la posible sección serial (últimos 5 o 6 caracteres si la longitud > 6)
        const serialCutoff = length > 6 ? (length - 6) : length;

        availablePositions.sort((a, b) => {
            const isSerialA = a >= serialCutoff;
            const isSerialB = b >= serialCutoff;
            if (isSerialA && !isSerialB) return 1;
            if (!isSerialA && isSerialB) return -1;
            return a - b;
        });

        const maxK = Math.min(availablePositions.length, 6);

        // Primero buscar combinaciones sin incluir caracteres seriales (si hay suficientes posiciones no seriales)
        const nonSerialPositions = availablePositions.filter(p => p < serialCutoff);
        if (nonSerialPositions.length > 0) {
            const nonSerialMaxK = Math.min(nonSerialPositions.length, 6);
            for (let k = 1; k <= nonSerialMaxK; k++) {
                const combinations = this.getCombinations(nonSerialPositions, k);
                for (const combo of combinations) {
                    if (this.comboDifferentiatesAll(combo, targetGroup, competitorGroups)) {
                        const positions = combo.sort((a, b) => a - b);
                        const values = positions.map(p => stablePositions.get(p));
                        const displayFragment = values.slice(0, 4).join("");
                        return {
                            positions,
                            humanPositions: positions.map(p => p + 1),
                            values,
                            displayFragment,
                            signatureString: values.join("-"),
                            readableFormat: positions.map((p, i) => `Pos ${p + 1}: ${values[i]}`).join(" | ")
                        };
                    }
                }
            }
        }

        // Si no fue posible sin seriales, buscar en todas las posiciones pero limitando fragmento visible a máx 4
        for (let k = 1; k <= maxK; k++) {
            const combinations = this.getCombinations(availablePositions, k);

            for (const combo of combinations) {
                if (this.comboDifferentiatesAll(combo, targetGroup, competitorGroups)) {
                    const positions = combo.sort((a, b) => a - b);
                    const values = positions.map(p => stablePositions.get(p));
                    const displayFragment = values.slice(0, 4).join("");
                    return {
                        positions,
                        humanPositions: positions.map(p => p + 1),
                        values,
                        displayFragment,
                        signatureString: values.join("-"),
                        readableFormat: positions.map((p, i) => `Pos ${p + 1}: ${values[i]}`).join(" | ")
                    };
                }
            }
        }

        return null;
    }

    getCombinations(arr, k) {
        if (k === 1) return arr.map(el => [el]);
        const result = [];
        for (let i = 0; i <= arr.length - k; i++) {
            const head = arr[i];
            const tailCombos = this.getCombinations(arr.slice(i + 1), k - 1);
            tailCombos.forEach(tc => result.push([head, ...tc]));
        }
        return result;
    }

    comboDifferentiatesAll(combo, targetGroup, competitorGroups) {
        const targetSig = combo.map(p => targetGroup.samples[0].vin[p]).join("");

        for (const comp of competitorGroups) {
            for (const compSample of comp.samples) {
                const compSig = combo.map(p => compSample.vin[p]).join("");
                if (compSig === targetSig) {
                    return false;
                }
            }
        }
        return true;
    }

    calculateSignatures(records) {
        this.catalogFingerprint=fingerprintVinCatalog(records);
        const matrixByLength = this.buildSampleMatrix(records);
        this.signatures.clear();
        this.conflictLog = [];

        let totalVinsAnalyzed = 0;
        let totalClassesAnalyzed = 0;
        let validatedCount = 0;
        let pendingCount = 0;
        let insufficientCount = 0;

        for (const [vLen, groupsMap] of matrixByLength.entries()) {
            const allGroups = Array.from(groupsMap.values());
            totalClassesAnalyzed += allGroups.length;

            allGroups.forEach(group => {
                totalVinsAnalyzed += group.samples.length;
                const sampleCount = group.samples.length;

                // AUDITORÍA VIN: Seleccionar competidores que compartan marca, modelo canónico normalizado y superposición de años
                const normGroupMarca = (group.marca || "").trim().toUpperCase();
                const normGroupModel = normalizeModelName(group.modelo);

                const competitors = allGroups.filter(g => {
                    if (g.classKey === group.classKey) return false;
                    const normGMarca = (g.marca || "").trim().toUpperCase();
                    const normGModel = normalizeModelName(g.modelo);
                    if (normGMarca !== normGroupMarca || normGModel !== normGroupModel) return false;

                    // Validar coincidencia o superposición de años de aplicación
                    return doYearRangesOverlap(group.anoDesde, group.anoHasta, g.anoDesde, g.anoHasta);
                });

                const extendedCompetitors = competitors;

                const insufficientReason = sampleCount < this.minSamplesThreshold
                    ? `Se requieren al menos ${this.minSamplesThreshold} muestras para calcular una firma diferencial.`
                    : competitors.length === 0
                        ? "No existen configuraciones competidoras aplicables dentro del rango de años."
                        : "";

                if (insufficientReason) {
                    insufficientCount++;
                    this.signatures.set(group.classKey, {
                        id: `SIG-${group.classKey}`,
                        classKey: group.classKey,
                        marca: group.marca,
                        modelo: group.modelo,
                        anoDesde: group.anoDesde,
                        anoHasta: group.anoHasta,
                        version: group.version,
                        vinLength: vLen,
                        status: "insuficiente",
                        confidence: 0,
                        reason: insufficientReason,
                        samplesCount: sampleCount,
                        algorithmVersion: this.version,
                        calculatedAt: new Date().toISOString()
                    });
                    return;
                }

                const minCombo = this.findMinimalCombination(group, extendedCompetitors, vLen);

                if (!minCombo) {
                    this.conflictLog.push({
                        classKey: group.classKey,
                        reason: "No fue posible encontrar una combinación de caracteres que diferencie esta configuración.",
                        competitorsCount: extendedCompetitors.length
                    });
                    pendingCount++;

                    this.signatures.set(group.classKey, {
                        id: `SIG-${group.classKey}`,
                        classKey: group.classKey,
                        marca: group.marca,
                        modelo: group.modelo,
                        anoDesde: group.anoDesde,
                        anoHasta: group.anoHasta,
                        version: group.version,
                        vinLength: vLen,
                        status: "pendiente_revision",
                        confidence: 40,
                        reason: "Firma ambigua o idéntica con registros de otra configuración.",
                        samplesCount: sampleCount,
                        calculatedAt: new Date().toISOString()
                    });
                } else {
                    const confidence = sampleCount >= 2 ? 100 : 75;
                    const status = confidence === 100 ? "validada" : "calculada";
                    if (status === "validada") validatedCount++; else pendingCount++;

                    this.signatures.set(group.classKey, {
                        id: `SIG-${group.classKey}`,
                        classKey: group.classKey,
                        marca: group.marca,
                        modelo: group.modelo,
                        generacion: `${group.anoDesde || ""}-${group.anoHasta || ""}`,
                        rangoAnos: `${group.anoDesde || ""}-${group.anoHasta || ""}`,
                        version: group.version,
                        vinLength: vLen,
                        positions: minCombo.positions,
                        humanPositions: minCombo.humanPositions,
                        values: minCombo.values,
                        displayFragment: minCombo.displayFragment || minCombo.values.slice(0, 4).join(""),
                        signatureString: minCombo.signatureString,
                        readableFormat: minCombo.readableFormat,
                        charactersNeeded: minCombo.positions.length,
                        samplesCount: sampleCount,
                        sampleVins: group.samples.map(s => s.vin),
                        status: status,
                        confidence: confidence,
                        algorithmVersion: this.version,
                        calculatedAt: new Date().toISOString()
                    });
                }
            });
        }

        return {
            totalVinsAnalyzed,
            totalClassesAnalyzed,
            signaturesGenerated: this.signatures.size,
            validatedCount,
            pendingCount,
            insufficientCount,
            conflictsCount: this.conflictLog.length,
            conflictLog: this.conflictLog
        };
    }

    filterMatchesByContext(matches, context = {}) {
        if (!context || typeof context !== "object") return matches;
        let filtered = matches;
        const has = key => context[key] !== undefined && context[key] !== null && String(context[key]).trim() !== "";
        if (has("classKey")) filtered = filtered.filter(s => s.classKey === String(context.classKey).trim());
        if (has("marca")) filtered = filtered.filter(s => String(s.marca || "").trim().toUpperCase() === String(context.marca).trim().toUpperCase());
        if (has("modelo")) filtered = filtered.filter(s => normalizeModelName(s.modelo) === normalizeModelName(context.modelo));
        if (has("version")) filtered = filtered.filter(s => String(s.version || "").trim().toUpperCase() === String(context.version).trim().toUpperCase());
        const yearValue = has("ano") ? context.ano : has("year") ? context.year : context.anoModelo;
        if (yearValue !== undefined && yearValue !== null && String(yearValue).trim() !== "") {
            filtered = filtered.filter(s => {
                const parts = String(s.rangoAnos || s.generacion || "").split("-");
                const from = s.anoDesde ?? parts[0];
                const to = s.anoHasta ?? parts[1] ?? "";
                return isYearWithinRange(yearValue, from, to);
            });
        }
        if (has("anoDesde") && has("anoHasta")) {
            const from = Number.parseInt(context.anoDesde, 10), to = Number.parseInt(context.anoHasta, 10);
            if (Number.isFinite(from) && Number.isFinite(to)) filtered = filtered.filter(s => {
                const parts = String(s.rangoAnos || s.generacion || "").split("-");
                return Number.parseInt(parts[0], 10) === from && Number.parseInt(parts[1] || parts[0], 10) === to;
            });
        }
        return filtered;
    }

    queryVehicle(query = {}) {
        const { vin, partialChars, context } = query;

        if (vin) {
            const cleanVin = normalizeVin(vin);
            const matches = [];

            for (const sig of this.signatures.values()) {
                if (sig.status === "insuficiente") continue;
                if (sig.vinLength && sig.vinLength !== cleanVin.length) continue;

                let allMatch = true;
                if (sig.positions && sig.values) {
                    for (let i = 0; i < sig.positions.length; i++) {
                        const pos = sig.positions[i];
                        const expectedVal = sig.values[i];
                        if (cleanVin[pos] !== expectedVal) {
                            allMatch = false;
                            break;
                        }
                    }
                } else {
                    allMatch = false;
                }

                if (allMatch) matches.push(sig);
            }

            const filteredMatches = this.filterMatchesByContext(matches, context);
            if (filteredMatches.length === 1) {
                return {
                    identificationType: "completa",
                    match: filteredMatches[0],
                    certainty: filteredMatches[0].confidence,
                    message: !context ? "Identificación vehicular exitosa y unívoca." : "Identificación desambiguada mediante identidad vehicular."
                };
            }
            if (filteredMatches.length > 1) {
                return {
                    identificationType: "ambigua",
                    matches: filteredMatches,
                    sharedCharacters: this.extractSharedChars(filteredMatches),
                    certainty: 50,
                    message: "Múltiples configuraciones compatibles con la firma del VIN."
                };
            }
            return {
                identificationType: "sin_coincidencias",
                matches: [],
                certainty: 0,
                message: matches.length
                    ? "El VIN coincide, pero el contexto vehicular proporcionado no corresponde a esas configuraciones."
                    : "No se encontraron firmas compatibles para el VIN proporcionado."
            };
        }

        if (partialChars) {
            const cleanPartial = normalizeVin(partialChars);
            const candidateMatches = [];

            for (const sig of this.signatures.values()) {
                if (!sig.values || sig.status === "insuficiente") continue;

                const sigStr = sig.values.join("");
                if (sigStr.includes(cleanPartial) || cleanPartial.includes(sigStr)) {
                    candidateMatches.push(sig);
                }
            }

            if (candidateMatches.length === 1) {
                return {
                    identificationType: "completa",
                    match: candidateMatches[0],
                    certainty: 80,
                    message: "Coincidencia exacta encontrada para el fragmento."
                };
            } else if (candidateMatches.length > 1) {
                return {
                    identificationType: "parcial",
                    matches: candidateMatches,
                    certainty: 40,
                    message: "Fragmento compatible con múltiples firmas. Se requiere contexto o más posiciones para desambiguar."
                };
            } else {
                return {
                    identificationType: "sin_coincidencias",
                    matches: [],
                    certainty: 0,
                    message: "Sin coincidencias para los caracteres diferenciales suministrados."
                };
            }
        }

        return {
            identificationType: "sin_coincidencias",
            matches: [],
            certainty: 0,
            message: "Parámetros de consulta insuficientes."
        };
    }

    extractSharedChars(matches) {
        if (!matches || matches.length === 0) return [];
        const first = matches[0];
        const shared = [];
        if (first.positions) {
            first.positions.forEach((pos, idx) => {
                const charVal = first.values[idx];
                const allShare = matches.every(m => m.positions && m.positions.includes(pos));
                if (allShare) {
                    shared.push({ position: pos + 1, char: charVal });
                }
            });
        }
        return shared;
    }
}

export class VinSignatureStore {
 constructor(){this.storageKey="gpspedia_vin_signatures";this.metaKey="gpspedia_vin_signatures_meta";}
 saveSignatures(engine){if(!engine||!engine.signatures||!engine.catalogFingerprint)return false;try{const list=[...engine.signatures.values()],meta={version:engine.version,catalogFingerprint:engine.catalogFingerprint,updatedAt:new Date().toISOString(),count:list.length,conflicts:engine.conflictLog||[]};localStorage.setItem(this.storageKey,JSON.stringify(list));localStorage.setItem(this.metaKey,JSON.stringify(meta));return true;}catch(error){console.error("Error persistiendo firmas diferenciales de VIN:",error);return false;}}
 loadSignatures(engine,records){if(!engine||!Array.isArray(records))return false;try{const raw=localStorage.getItem(this.storageKey),rawMeta=localStorage.getItem(this.metaKey);if(!raw||!rawMeta)return false;const list=JSON.parse(raw),meta=JSON.parse(rawMeta),fp=fingerprintVinCatalog(records),statuses=new Set(["validada","calculada","pendiente_revision","insuficiente"]);const valid=Array.isArray(list)&&meta&&meta.version===engine.version&&meta.catalogFingerprint===fp&&meta.count===list.length&&list.every(s=>s&&typeof s.classKey==="string"&&s.classKey.length>0&&statuses.has(s.status)&&s.id===`SIG-${s.classKey}`&&(s.algorithmVersion===undefined||s.algorithmVersion===engine.version));if(!valid)return false;const restored=new Map();for(const s of list){if(restored.has(s.classKey))return false;restored.set(s.classKey,s);}engine.signatures.clear();restored.forEach((s,k)=>engine.signatures.set(k,s));engine.conflictLog=Array.isArray(meta.conflicts)?meta.conflicts:[];engine.catalogFingerprint=fp;return true;}catch(error){console.error("Error cargando firmas diferenciales de VIN:",error);return false;}}
 getMetadata(){try{const raw=localStorage.getItem(this.metaKey);return raw?JSON.parse(raw):null;}catch(error){return null;}}
}
export function ensureVinSignatures(records,engine=vinDifferentialEngine,store=vinSignatureStore){if(!Array.isArray(records)||!engine||!store)return null;const fp=fingerprintVinCatalog(records);if(engine.catalogFingerprint===fp)return engine.signatures;if(store.loadSignatures(engine,records))return engine.signatures;engine.calculateSignatures(records);store.saveSignatures(engine);return engine.signatures;}

export const vinDifferentialEngine = new VinDifferentialEngine();
export const vinSignatureStore = new VinSignatureStore();
