const CUT_BASE_FIELDS = [
    'marca', 'modelo', 'versionesAplicables', 'tipoEncendido', 'categoria',
    'anoDesde', 'anoHasta', 'vin', 'notaImportante', 'cableAlimen',
    'apertura', 'detalles', 'detalle', 'descripcion', 'observacion'
];
const CUT_SLOT_FIELDS = [
    'tipoCorte', 'ubicacionCorte', 'colorCableCorte', 'configRelay',
    'relayCorte', 'tipo', 'ubicacion', 'color', 'relay',
    'detalleCorte', 'detallesCorte', 'observacionCorte', 'notaCorte',
    'detalles', 'detalle', 'observacion'
];
const RELAY_FIELDS = [
    'configuracion', 'funcion', 'vehiculoDondeSeUtiliza', 'observacion',
    'nombre', 'titulo', 'tipo', 'descripcion', 'detalles', 'detalle',
    'aplicacion', 'aplicaciones', 'notas'
];
const TUTORIAL_FIELDS = [
    'Tema', 'Descripcion', 'comoIdentificarlo', 'dondeEncontrarlo',
    'Detalles', 'titulo', 'contenido', 'descripcion', 'pasos', 'materiales', 'notas'
];
const PYS_FIELDS = [
    'Problema', 'Descripcion', 'Solucion', 'Prevenir',
    'Detalles', 'titulo', 'sintomas', 'causa', 'causas', 'pasos', 'notas'
];

function decodeHtmlEntities(value) {
    return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, token) => {
        const lower = token.toLowerCase();
        if (lower === 'amp') return '&';
        if (lower === 'lt') return '<';
        if (lower === 'gt') return '>';
        if (lower === 'quot') return '"';
        if (lower === 'apos') return "'";
        if (lower === 'nbsp') return ' ';
        const codePoint = lower.startsWith('#x')
            ? parseInt(lower.slice(2), 16)
            : parseInt(lower.slice(1), 10);
        if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return ' ';
        try { return String.fromCodePoint(codePoint); } catch (error) { return ' '; }
    });
}

/** Normaliza consulta y contenido: elimina etiquetas HTML, entidades, diacríticos y espacios repetidos. */
export function normalizeSearchText(value) {
    const decoded = decodeHtmlEntities(value);
    return decoded
        .replace(/<\/?[a-z][^>]*>/gi, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('es')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function collectFields(item, fields) {
    if (!item || typeof item !== 'object') return '';
    return fields.map(field => {
        const value = item[field];
        return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    }).join(' ');
}

function getCutFields(item) {
    const values = [collectFields(item, CUT_BASE_FIELDS)];
    for (let slot = 1; slot <= 3; slot += 1) {
        values.push(collectFields(item, CUT_SLOT_FIELDS.map(field => `${field}${slot}`)));
    }
    return values.join(' ');
}

function getRecordPriority(query, title, searchableText, yearRangeTerm = null) {
    const normalizedTitle = normalizeSearchText(title);
    const normalizedText = normalizeSearchText(searchableText);
    const terms = normalizeSearchText(query).split(' ').filter(Boolean);
    if (!terms.length) return null;
    if (normalizedTitle === normalizeSearchText(query)) return 0;
    if (normalizedTitle && terms.every(term => normalizedTitle.includes(term))) return 1;
    if (terms.every(term => normalizedText.includes(term) || term === yearRangeTerm)) return 2;
    return null;
}

function cutMatchesQuery(item, query) {
    const title = `${item.marca || ''} ${item.modelo || ''}`;
    const fullFields = getCutFields(item);
    const fullText = normalizeSearchText(fullFields);
    const terms = normalizeSearchText(query).split(' ').filter(Boolean);
    const yearTerm = terms.find(term => /^\d{4}$/.test(term) && Number(term) >= 1900 && Number(term) <= 2100);
    let yearRangeMatch = false;

    if (yearTerm) {
        const literalFields = normalizeSearchText([
            item.marca, item.modelo, item.versionesAplicables, item.tipoEncendido,
            item.categoria, item.vin,
            ...Array.from({ length: 3 }, (_, index) => {
                const slot = index + 1;
                return [
                    item[`tipoCorte${slot}`], item[`ubicacionCorte${slot}`],
                    item[`colorCableCorte${slot}`], item[`configRelay${slot}`],
                    item[`relayCorte${slot}`], item[`detalleCorte${slot}`],
                    item[`detallesCorte${slot}`], item[`observacionCorte${slot}`]
                ].join(' ');
            })
        ].join(' ')).split(' ');
        const literalYearMatch = literalFields.includes(yearTerm);
        const from = Number.parseInt(item.anoDesde, 10);
        const to = Number.parseInt(item.anoHasta || item.anoDesde, 10);
        yearRangeMatch = Number.isFinite(from) && Number.isFinite(to) &&
            Number(yearTerm) >= from && Number(yearTerm) <= to;
        if (!literalYearMatch && !yearRangeMatch) return null;
    }

    const searchableText = `${title} ${fullFields}`;
    const normalizedText = normalizeSearchText(searchableText);
    const allTermsMatch = terms.every(term => normalizedText.includes(term) ||
        (term === yearTerm && yearRangeMatch));
    if (!allTermsMatch) return null;

    return getRecordPriority(query, title, searchableText, yearRangeMatch ? yearTerm : null);
}

/**
 * Devuelve coincidencias globales ordenadas: título exacto, título parcial y campos descriptivos.
 * Los registros de cada sección conservan su tipo y sus datos originales.
 */
export function buildGlobalSearchResults({ query, cortes = [], relay = [], tutoriales = [], pys = [] }) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return [];

    const results = [];
    const add = (items, section, titleField, fields, decorate = item => item) => {
        items.forEach((item, index) => {
            if (!item || typeof item !== 'object') return;
            const title = (typeof titleField === 'function' ? titleField(item) : item[titleField]) || '';
            const description = collectFields(item, fields);
            const priority = section === 'corte'
                ? cutMatchesQuery(item, normalizedQuery)
                : getRecordPriority(normalizedQuery, title, `${title} ${description}`);
            if (priority === null) return;
            const decorated = decorate(item, index);
            results.push({
                ...decorated,
                _sectionType: section,
                _searchPriority: priority,
                _searchOrder: results.length
            });
        });
    };

    add(cortes, 'corte', 'modelo', CUT_BASE_FIELDS, item => ({ ...item }));
    add(relay, 'relay', item => item.configuracion || item.nombre || item.funcion, RELAY_FIELDS, (item, index) => ({
        ...item,
        modelo: item.configuracion || item.nombre || item.funcion || `Configuración ${item.ID || index + 1}`
    }));
    add(tutoriales, 'tutorial', item => item.Tema || item.Titulo || item.titulo, TUTORIAL_FIELDS, (item, index) => ({
        ...item,
        modelo: item.Tema || item.Titulo || item.titulo || `Tutorial ${item.ID || index + 1}`
    }));
    add(pys, 'pys', item => item.Problema || item.Titulo || item.titulo, PYS_FIELDS, (item, index) => ({
        ...item,
        modelo: item.Problema || item.Titulo || item.titulo || `Problema ${item.id || index + 1}`
    }));

    return results.sort((left, right) =>
        left._searchPriority - right._searchPriority ||
        left._searchOrder - right._searchOrder
    );
}

/** Solo los resultados exclusivamente de Cortes pueden convertirse en una vista de marcas. */
export function classifySearchResults(results, query) {
    if (!Array.isArray(results) || results.length === 0) return 'modelo';
    if (!results.every(item => item && item._sectionType === 'corte')) return 'modelo';
    const brands = [...new Set(results.map(item => String(item.marca || '')))];
    const exactModelMatch = results.some(item =>
        normalizeSearchText(item.modelo) === normalizeSearchText(query)
    );
    if (!exactModelMatch && brands.length === 1 &&
        normalizeSearchText(brands[0]).includes(normalizeSearchText(query))) return 'marca';
    return 'modelo';
}

/** La autoapertura del detalle se reserva para una única coincidencia de Corte. */
export function shouldAutoOpenVehicleDetail(results) {
    if (!Array.isArray(results) || results.length !== 1 || results[0]?._sectionType !== 'corte') return false;
    const item = results[0];
    return Boolean(item.id || item.marca || item.modelo);
}

/** Decodifica deep links sin dejar que una secuencia porcentual inválida interrumpa la inicialización. */
export function decodeSearchHash(hash) {
    const value = String(hash || '');
    if (!value.startsWith('#search=')) return null;
    const encoded = value.slice(8);
    try { return decodeURIComponent(encoded); }
    catch (error) { return encoded; }
}

/** Crea una única promesa compartida mientras el loader está en curso; permite reintentar si falla. */
export function createSharedPromise(loader) {
    let inFlight = null;
    return (...args) => {
        if (inFlight) return inFlight;
        inFlight = Promise.resolve()
            .then(() => loader(...args))
            .finally(() => { inFlight = null; });
        return inFlight;
    };
}


/** Agrupa solo Cortes por categoría+marca+modelo; VIN ambiguos y otras secciones siguen individuales. */
export function groupVehicleSearchResults(results) {
    if (!Array.isArray(results)) return [];
    const output = [], groups = new Map();
    results.forEach((item, index) => {
        const order = Number.isFinite(item && item._searchOrder) ? item._searchOrder : index;
        const priority = Number(item && item._searchPriority) || 0;
        if (!item || item._sectionType !== 'corte' || item._vinAmbiguousChoice) {
            output.push({ item, order, priority }); return;
        }
        const key = JSON.stringify([String(item.categoria || ''), String(item.marca || ''), String(item.modelo || '')]);
        let group = groups.get(key);
        if (!group) {
            group = { _searchGroupType: 'vehicleModel', categoria: item.categoria || '', marca: item.marca || '',
                modelo: item.modelo || '', records: [], _searchPriority: priority, _searchOrder: order };
            groups.set(key, group); output.push({ item: group, order, priority });
        }
        group.records.push(item);
        group._searchPriority = Math.min(group._searchPriority, priority);
        group._searchOrder = Math.min(group._searchOrder, order);
    });
    return output.sort((a, b) => {
        const priorityA = a.item && a.item._searchGroupType === 'vehicleModel' ? a.item._searchPriority : a.priority;
        const priorityB = b.item && b.item._searchGroupType === 'vehicleModel' ? b.item._searchPriority : b.priority;
        const orderA = a.item && a.item._searchGroupType === 'vehicleModel' ? a.item._searchOrder : a.order;
        const orderB = b.item && b.item._searchGroupType === 'vehicleModel' ? b.item._searchOrder : b.order;
        return priorityA - priorityB || orderA - orderB;
    }).map(entry => entry.item);
}

/** Resuelve el próximo paso visible sin omitir variantes ni escoger duplicados arbitrariamente. */
export function resolveVehicleNavigation(records, selectedVersion = null) {
    const source = Array.isArray(records) ? records.filter(Boolean) : [];
    let rows = source;
    if (selectedVersion !== null && selectedVersion !== undefined && selectedVersion !== '') {
        rows = rows.filter(row => String(row.versionesAplicables || '') === String(selectedVersion));
    }
    const versions = [...new Set(rows.map(row => String(row.versionesAplicables || '')).filter(Boolean))];
    if (!selectedVersion && versions.length > 1) return { step: 'equipment', options: versions, records: rows };
    if (!selectedVersion && versions.length === 1) rows = rows.filter(row => String(row.versionesAplicables || '') === versions[0]);
    const ignitions = [...new Set(rows.map(row => String(row.tipoEncendido || '')).filter(Boolean))];
    if (ignitions.length > 1) return { step: 'ignition', options: ignitions, records: rows,
        version: selectedVersion || (versions.length === 1 ? versions[0] : null) };
    if (ignitions.length === 1) rows = rows.filter(row => String(row.tipoEncendido || '') === ignitions[0]);
    const ranges = new Map();
    rows.forEach(row => {
        const key = JSON.stringify([String(row.anoDesde || ''), String(row.anoHasta || '')]);
        if (!ranges.has(key)) ranges.set(key, []);
        ranges.get(key).push(row);
    });
    if (ranges.size === 1 && [...ranges.values()][0].length === 1) return { step: 'detail', records: [...ranges.values()][0] };
    return { step: 'ranges', records: rows, ranges: [...ranges.entries()].map(([key, items]) => ({ key, records: items })) };
}
