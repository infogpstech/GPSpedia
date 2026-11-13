import { decodeSearchHash } from './search-utils.js';

/**
 * Construye el único URL compartido por Web Share y Clipboard.
 * Si no hay ID estable, conserva el formato histórico #search=.
 */
export function buildVehicleShareUrl(baseUrl, vehicleId, query) {
    const base = String(baseUrl || '').split('#')[0];
    const id = String(vehicleId ?? '').trim();
    const normalizedQuery = String(query ?? '').trim();
    const params = [];
    if (id) params.push(`vehicle=${encodeURIComponent(id)}`);
    if (normalizedQuery) params.push(`search=${encodeURIComponent(normalizedQuery)}`);
    return params.length ? `${base}#${params.join('&')}` : base;
}

/**
 * Decodifica el enlace nuevo #vehicle=...&search=... y los enlaces históricos #search=...
 * Los parámetros duplicados y contradictorios nunca se resuelven eligiendo uno al azar.
 */
export function decodeSharedVehicleHash(hash) {
    const value = String(hash || '');
    if (value.startsWith('#search=')) {
        const query = decodeSearchHash(value);
        return query ? { vehicleId: null, query, legacy: true, ambiguousVehicleId: false } : null;
    }
    if (!value.startsWith('#vehicle=')) return null;

    const params = new URLSearchParams(value.slice(1));
    const ids = [...new Set(params.getAll('vehicle').map(id => String(id || '').trim()).filter(Boolean))];
    const queries = [...new Set(params.getAll('search').map(query => String(query || '').trim()).filter(Boolean))];
    const vehicleId = ids.length === 1 ? ids[0] : null;
    const query = queries.length === 1 ? queries[0] : '';
    if (!vehicleId && !query) return null;

    return {
        vehicleId,
        query,
        legacy: false,
        ambiguousVehicleId: ids.length > 1,
        ambiguousQuery: queries.length > 1
    };
}

/**
 * Solo resuelve registros de Cortes. Un ID duplicado es ambiguo y obliga a usar la búsqueda.
 */
export function resolveSharedVehicleById(catalogData, vehicleId) {
    const id = String(vehicleId ?? '').trim();
    const cortes = Array.isArray(catalogData && catalogData.cortes) ? catalogData.cortes : [];
    if (!id) return null;
    const matches = cortes.filter(item => item && String(item.id ?? '').trim() === id);
    return matches.length === 1 ? matches[0] : null;
}

export async function copyTextToClipboard(text, clipboard) {
    try {
        const value = String(text ?? '').trim();
        if (!value) return { status: 'failed', error: new Error('El enlace está vacío.') };
        if (!clipboard || typeof clipboard.writeText !== 'function') {
            return { status: 'failed', error: new Error('La API del portapapeles no está disponible.') };
        }
        await clipboard.writeText(value);
        return { status: 'copied' };
    } catch (error) {
        return { status: 'failed', error };
    }
}

/**
 * Comparte primero con Web Share. AbortError es una cancelación explícita y no activa
 * la copia automática; otros fallos recuperables sí intentan Clipboard.
 */
export async function shareVehicleLink(shareData, navigatorRef) {
    const url = String(shareData && shareData.url || '').trim();
    if (!url) return { status: 'failed', error: new Error('El enlace está vacío.') };

    let shareError = null;
    let shareMethod = null;
    try {
        shareMethod = navigatorRef && navigatorRef.share;
    } catch (error) {
        shareError = error;
    }

    if (typeof shareMethod === 'function') {
        try {
            await shareMethod.call(navigatorRef, shareData);
            return { status: 'shared' };
        } catch (error) {
            if (error && error.name === 'AbortError') return { status: 'cancelled' };
            shareError = error;
        }
    }

    let clipboard = null;
    try {
        clipboard = navigatorRef && navigatorRef.clipboard;
    } catch (error) {
        return { status: 'failed', error: shareError || error };
    }

    const copyResult = await copyTextToClipboard(url, clipboard);
    if (copyResult.status === 'copied') {
        return { status: 'copied', fallbackFromShare: Boolean(shareError) };
    }
    return { status: 'failed', error: copyResult.error || shareError };
}
