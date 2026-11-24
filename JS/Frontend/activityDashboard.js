/**
 * Renderiza el historial de actividad como texto plano.
 * Los valores almacenados se consideran datos no confiables, incluidos registros históricos.
 */
export function renderActivityLogs(container, logs, doc = container && container.ownerDocument) {
    if (!container || typeof container.replaceChildren !== "function" || !doc || typeof doc.createElement !== "function") {
        throw new TypeError("Se requiere un contenedor DOM y un documento válido.");
    }
    container.replaceChildren();
    const entries = Array.isArray(logs) ? logs : [];
    const toPlainText = value => value === null || value === undefined || !["string", "number", "boolean"].includes(typeof value) ? "" : String(value);
    entries.forEach(log => {
        const entry = log && typeof log === "object" ? log : {};
        const timestamp = new Date(entry.timestamp);
        const timestampText = Number.isNaN(timestamp.getTime()) ? "" : timestamp.toLocaleString();
        const row = doc.createElement("tr");
        const rawType = toPlainText(entry.tipoActividad);
        const labels = {like:"Valoración útil",suggest_year:"Aporte sobre años",suggest_year_range_review:"Revisión de rango de años",add_cut:"Nuevo corte agregado",update_cut:"Corte actualizado",add_tutorial:"Tutorial agregado"};
        const friendlyType = labels[rawType] || (rawType.startsWith("inbox_") ? "Actividad de Inbox" : rawType.replace(/[_-]+/g," "));
        const detailText = toPlainText(entry.detalle), relatedId = toPlainText(entry.idElementoAsociado);
        const relatedText = relatedId ? (detailText ? detailText + " · Referencia: " + relatedId : "Referencia: " + relatedId) : detailText;
        const values = [timestampText, toPlainText(entry.nombreUsuario), friendlyType, relatedText];
        values.forEach(value => { const cell = doc.createElement("td"); cell.textContent = value; row.appendChild(cell); });
        container.appendChild(row);
    });
    if (!entries.length) {
        const row = doc.createElement("tr");
        const cell = doc.createElement("td");
        cell.colSpan = 4;
        cell.textContent = "Todavía no hay actividad registrada.";
        row.appendChild(cell);
        container.appendChild(row);
    }
    return container;
}

/**
 * Convierte etiquetas/separadores de colaboradores a nombres seguros y comparables.
 * Se usa solo en presentación: el backend y los datos almacenados no se modifican.
 */
export function normalizeContributionRows(contributions) {
    const entries = Array.isArray(contributions) ? contributions : [];
    const grouped = new Map();
    const toCount = value => {
        const count = Number(value);
        return Number.isFinite(count) && count > 0 ? count : 0;
    };
    const parseNames = value => {
        let source = value == null ? "" : String(value);
        source = source
            .replace(/&nbsp;|&#0*160;|&#x0*a0;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&quot;/gi, '"')
            .replace(/&#39;|&apos;/gi, "'")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, " ")
            .replace(/<br\s*\/?\s*>/gi, "\n")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s*\[OP-[A-Za-z0-9_-]+\]/gi, " ")
            .replace(/\s*\([^)]*\)/g, " ");
        return source.split(/[\r\n,]+/).map(name => name
            .replace(/[\u0000-\u001f\u007f]/g, " ")
            .replace(/\s+/g, " ")
            .replace(/^[\s.,;:!?]+|[\s.,;:!?]+$/g, "")
            .trim()).filter(Boolean);
    };
    const normalizeKey = value => value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("es")
        .replace(/[\p{P}\p{S}]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
    const isCommunityName = key => /^comunidad(?: internacional)? de tecnicos?$/.test(key);
    const canonicalName = name => isCommunityName(normalizeKey(name)) ? "Comunidad de técnicos" : displayName(name);
    const displayName = value => value.toLocaleLowerCase("es")
        .replace(/(^|[\s'-])(\p{L})/gu, (_match, prefix, letter) => prefix + letter.toLocaleUpperCase("es"));
    entries.forEach(entry => {
        if (!entry || typeof entry !== "object") return;
        const namesByKey = new Map();
        parseNames(entry.nombreUsuario).forEach(name => {
            const key = normalizeKey(name);
            if (!key) return;
            const canonicalKey = String(entry.userId || "").trim() ? "user:" + String(entry.userId).trim() : (isCommunityName(key) ? "comunidad de tecnicos" : key);
            if (!namesByKey.has(canonicalKey)) namesByKey.set(canonicalKey, { key: canonicalKey, name: canonicalName(name) });
        });
        const names = Array.from(namesByKey.values());
        const cuts = toCount(entry.aportesRegistrados === undefined ? entry.cortesAportados : entry.aportesRegistrados);
        const vehicles = toCount(entry.vehiculosConAportes);
        names.forEach(({ key, name }) => {
            const current = grouped.get(key);
            if (current) {
                current.cortesAportados += cuts;
                // El servicio entrega conteos agregados, no IDs de vehículos; usar el
                // máximo evita sumar dos veces vehículos posiblemente repetidos entre alias.
                current.vehiculosConAportes = Math.max(current.vehiculosConAportes, vehicles);
            } else {
                grouped.set(key, { nombreUsuario: name, cortesAportados: cuts, vehiculosConAportes: vehicles });
            }
        });
    });
    return Array.from(grouped.values()).sort((a, b) =>
        b.cortesAportados - a.cortesAportados || a.nombreUsuario.localeCompare(b.nombreUsuario, "es"));
}

/** Renderiza el resumen de cortes aportados por usuario como texto plano. */
export function renderActivityContributions(container, contributions, doc = container && container.ownerDocument) {
    if (!container || typeof container.replaceChildren !== "function" || !doc || typeof doc.createElement !== "function") {
        throw new TypeError("Se requiere un contenedor DOM y un documento válido.");
    }
    container.replaceChildren();
    const entries = normalizeContributionRows(contributions);
    entries.forEach(entry => {
        const row = doc.createElement("tr");
        [entry.nombreUsuario, entry.cortesAportados, entry.vehiculosConAportes].forEach(value => {
            const cell = doc.createElement("td");
            cell.textContent = value == null ? "" : String(value);
            row.appendChild(cell);
        });
        container.appendChild(row);
    });
    if (!entries.length) {
        const row = doc.createElement("tr"), cell = doc.createElement("td");
        cell.colSpan = 3; cell.textContent = "Todavía no hay aportes atribuidos a usuarios.";
        row.appendChild(cell); container.appendChild(row);
    }
    return container;
}


function dashboardText(value) {
 return value===null||value===undefined||!["string","number","boolean"].includes(typeof value)?"":String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g," ").trim();
}
function dashboardNode(parent,tag,value,className,doc) {
 const node=doc.createElement(tag);if(className)node.className=className;node.textContent=dashboardText(value);parent.appendChild(node);return node;
}
export function renderActivityInsights(container,insights,contributions,doc=container&&container.ownerDocument) {
 if(!container||typeof container.replaceChildren!=="function"||!doc||typeof doc.createElement!=="function")throw new TypeError("Se requiere un contenedor DOM y un documento válido.");
 container.replaceChildren();const data=insights&&typeof insights==="object"?insights:{},summary=data.summary||{};
 const grid=doc.createElement("div");grid.className="activity-insight-metrics";
 [["Vehículos",summary.vehicles],["Cortes registrados",summary.cuts],["Valoraciones útiles",summary.usefulVotes],["No útil",summary.notUseful],["No funciona",summary.notWorking]].forEach(([label,value])=>{
  const card=doc.createElement("article");card.className="activity-insight-metric";
  dashboardNode(card,"span",label,"activity-insight-label",doc);
  dashboardNode(card,"strong",Number(value)||0,"activity-insight-value",doc);grid.appendChild(card);
 });container.appendChild(grid);
 const rankingGrid=doc.createElement("div");rankingGrid.className="activity-insight-rankings";
 [{title:"Cortes con más valoraciones útiles",rows:data.topUseful||[],key:"usefulVotes",empty:"Todavía no hay valoraciones útiles."},
  {title:"Casos no útiles o no funcionales",rows:data.topNegative||[],key:"reports",empty:"No hay respuestas negativas en la ventana consultada."}].forEach(ranking=>{
  const section=doc.createElement("section");section.className="activity-insight-card";dashboardNode(section,"h3",ranking.title,"activity-insight-heading",doc);
  const rows=Array.isArray(ranking.rows)?ranking.rows:[],max=Math.max(1,...rows.map(row=>Number(row&&row[ranking.key])||0));
  if(!rows.length)dashboardNode(section,"p",ranking.empty,"activity-insight-empty",doc);
  rows.slice(0,5).forEach((row,index)=>{
   const item=doc.createElement("div");item.className="activity-insight-bar-row";
   dashboardNode(item,"span",(index+1)+". "+[row.brand,row.model,row.cutType].filter(Boolean).join(" · "),"activity-insight-bar-label",doc);
   const track=doc.createElement("div");track.className="activity-insight-bar-track";const bar=doc.createElement("span");bar.className="activity-insight-bar";
   bar.style.width=Math.max(0,Math.min(100,(Number(row[ranking.key])||0)/max*100))+"%";track.appendChild(bar);item.appendChild(track);
   dashboardNode(item,"strong",Number(row[ranking.key])||0,"activity-insight-bar-value",doc);section.appendChild(item);
  });rankingGrid.appendChild(section);
 });container.appendChild(rankingGrid);
 const years=data.years||{},yearCard=doc.createElement("section");yearCard.className="activity-insight-card";
 dashboardNode(yearCard,"h3","Validación de años y rangos","activity-insight-heading",doc);
 const yearGrid=doc.createElement("div");yearGrid.className="activity-insight-year-grid";
 [["Confirmaciones",years.confirmations],["Sugerencias de rango",years.suggestions],["Aplicaciones completadas",years.applied],["Aportes verificados",years.verified],["Aportes anónimos",years.anonymous]].forEach(([label,value])=>{
  const item=doc.createElement("div");item.className="activity-insight-year-item";dashboardNode(item,"span",label,"",doc);dashboardNode(item,"strong",Number(value)||0,"",doc);yearGrid.appendChild(item);
 });yearCard.appendChild(yearGrid);
 if(data.windowLimited)dashboardNode(yearCard,"p","Indicadores de Feedbacks calculados sobre los últimos "+(Number(data.feedbackWindow)||500)+" registros.","activity-insight-note",doc);
 dashboardNode(yearCard,"p","Las consultas por modelo no se muestran porque no existe un registro histórico fiable de aperturas.","activity-insight-note",doc);container.appendChild(yearCard);
 const contributorCard=doc.createElement("section");contributorCard.className="activity-insight-card";dashboardNode(contributorCard,"h3","Principales colaboradores","activity-insight-heading",doc);
 const rows=normalizeContributionRows(contributions).slice(0,5);if(!rows.length)dashboardNode(contributorCard,"p","Todavía no hay aportaciones atribuidas.","activity-insight-empty",doc);
 rows.forEach((entry,index)=>{const row=doc.createElement("p");row.className="activity-insight-contributor";dashboardNode(row,"span",(index+1)+". "+entry.nombreUsuario,"",doc);dashboardNode(row,"strong",entry.cortesAportados+" aportes · "+entry.vehiculosConAportes+" vehículos","",doc);contributorCard.appendChild(row);});
 container.appendChild(contributorCard);return container;
}
