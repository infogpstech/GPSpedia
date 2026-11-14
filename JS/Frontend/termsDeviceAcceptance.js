const TERMS_DEVICE_ID_STORAGE_KEY = 'gpsepedia_device_id';
const TERMS_ACCEPTANCE_STORAGE_PREFIX = 'gpsepedia_terms_acceptance_v1_';

function isValidTermsDeviceId_(value) {
    return /^[a-f0-9]{32}$/i.test(String(value || ''));
}

export function getOrCreateTermsDeviceId(storage, cryptoSource) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
        throw new Error('El almacenamiento local no está disponible para identificar este dispositivo.');
    }
    let current = '';
    try { current = String(storage.getItem(TERMS_DEVICE_ID_STORAGE_KEY) || '').trim().toLowerCase(); }
    catch (error) { throw new Error('No se pudo consultar la identificación local del dispositivo.'); }
    if (isValidTermsDeviceId_(current)) return current;

    const cryptoApi = cryptoSource || null;
    let generated = '';
    try {
        if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
            generated = String(cryptoApi.randomUUID()).replace(/-/g, '').toLowerCase();
        } else if (cryptoApi && typeof cryptoApi.getRandomValues === 'function' &&
            typeof Uint8Array === 'function') {
            const bytes = new Uint8Array(16);
            cryptoApi.getRandomValues(bytes);
            generated = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
        }
    } catch (error) {
        throw new Error('No se pudo generar una identificación segura para este dispositivo.');
    }
    if (!isValidTermsDeviceId_(generated)) {
        throw new Error('Este navegador no permite generar una identificación segura para el dispositivo.');
    }
    try {
        storage.setItem(TERMS_DEVICE_ID_STORAGE_KEY, generated);
        if (String(storage.getItem(TERMS_DEVICE_ID_STORAGE_KEY) || '').toLowerCase() !== generated) {
            throw new Error('La identificación local no se pudo confirmar.');
        }
    } catch (error) {
        throw new Error('No se pudo guardar la identificación de este dispositivo.');
    }
    return generated;
}

function termsAcceptanceStorageKey_(userId, deviceId) {
    return TERMS_ACCEPTANCE_STORAGE_PREFIX + encodeURIComponent(String(userId || '').trim()) + '_' +
        String(deviceId || '').trim().toLowerCase();
}

export function getDeviceTermsAcceptance(storage, userId, deviceId, version) {
    if (!storage || typeof storage.getItem !== 'function' ||
        !String(userId || '').trim() || !isValidTermsDeviceId_(deviceId)) return null;
    let raw = '';
    try { raw = storage.getItem(termsAcceptanceStorageKey_(userId, deviceId)) || ''; }
    catch (error) { return null; }
    if (!raw) return null;
    let record;
    try { record = JSON.parse(raw); } catch (error) { return null; }
    if (!record || typeof record !== 'object' || Array.isArray(record) ||
        record.status !== 'accepted' || record.version !== String(version || '') ||
        typeof record.acceptedAt !== 'string' || !Number.isFinite(Date.parse(record.acceptedAt))) {
        return null;
    }
    return { version: record.version, acceptedAt: record.acceptedAt, status: 'accepted' };
}

export function saveDeviceTermsAcceptance(storage, userId, deviceId, acceptance) {
    if (!storage || typeof storage.setItem !== 'function' ||
        !String(userId || '').trim() || !isValidTermsDeviceId_(deviceId) ||
        !acceptance || acceptance.status !== 'accepted' ||
        typeof acceptance.version !== 'string' || !acceptance.version.trim() ||
        typeof acceptance.acceptedAt !== 'string' || !Number.isFinite(Date.parse(acceptance.acceptedAt))) {
        throw new Error('No se pudo validar el registro de aceptación de este dispositivo.');
    }
    const normalized = {
        version: acceptance.version,
        acceptedAt: acceptance.acceptedAt,
        status: 'accepted'
    };
    try {
        storage.setItem(termsAcceptanceStorageKey_(userId, deviceId), JSON.stringify(normalized));
    } catch (error) {
        throw new Error('No se pudo guardar la aceptación en este dispositivo.');
    }
    const confirmed = getDeviceTermsAcceptance(storage, userId, deviceId, normalized.version);
    if (!confirmed || confirmed.acceptedAt !== normalized.acceptedAt) {
        throw new Error('No se pudo confirmar la aceptación guardada en este dispositivo.');
    }
    return confirmed;
}
