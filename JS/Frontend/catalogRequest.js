function createCatalogAbortError(message = 'La solicitud del catálogo fue cancelada.') { const error = new Error(message); error.name = 'AbortError'; return error; }
function createCatalogTimeoutError(timeoutMs) { const error = new Error('La solicitud del catálogo superó el límite de ' + timeoutMs + ' ms.'); error.name = 'CatalogRequestTimeoutError'; error.retryable = true; return error; }
function isRetryableCatalogError(error) { if (!error || error.name === 'AbortError') return false; if (error.name === 'CatalogRequestTimeoutError' || error.retryable === true) return true; const status = Number(error.status); if (status === 408 || status === 429 || status >= 500) return true; if (status >= 400) return false; return error instanceof TypeError; }
function waitForCatalogRetry(delayMs, signal) { return new Promise((resolve, reject) => { if (signal && signal.aborted) { reject(createCatalogAbortError()); return; } let timer = null; const cleanup = () => { if (timer !== null) clearTimeout(timer); if (signal) signal.removeEventListener('abort', onAbort); }; const onAbort = () => { cleanup(); reject(createCatalogAbortError()); }; if (signal) signal.addEventListener('abort', onAbort, { once: true }); timer = setTimeout(() => { cleanup(); resolve(); }, delayMs); }); }
export async function runCatalogRequestWithRetry(request, options = {}) {
    if (typeof request !== 'function') throw new TypeError('La solicitud del catálogo debe ser una función.');
    if (typeof AbortController !== 'function') throw new Error('Este navegador no admite AbortController para limitar la solicitud del catálogo.');
    const timeoutValue = Number(options.timeoutMs), retryValue = Number(options.retries), delayValue = Number(options.baseDelayMs);
    const timeoutMs = Number.isFinite(timeoutValue) ? Math.max(1, Math.min(timeoutValue, 30000)) : 8000;
    const retries = Number.isFinite(retryValue) ? Math.max(0, Math.min(Math.floor(retryValue), 3)) : 2;
    const baseDelayMs = Number.isFinite(delayValue) ? Math.max(0, Math.min(delayValue, 5000)) : 400;
    const externalSignal = options.signal || null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        if (externalSignal && externalSignal.aborted) throw createCatalogAbortError();
        const controller = new AbortController(); let timer = null, timedOut = false, rejectTimeout, rejectExternalAbort, retryError = null;
        const timeoutPromise = new Promise((_, reject) => { rejectTimeout = reject; });
        const externalAbortPromise = new Promise((_, reject) => { rejectExternalAbort = reject; });
        const onExternalAbort = () => { controller.abort(); rejectExternalAbort(createCatalogAbortError()); };
        if (externalSignal) { externalSignal.addEventListener('abort', onExternalAbort, { once: true }); if (externalSignal.aborted) onExternalAbort(); }
        timer = setTimeout(() => { timedOut = true; controller.abort(); rejectTimeout(createCatalogTimeoutError(timeoutMs)); }, timeoutMs);
        try { return await Promise.race([Promise.resolve().then(() => request(controller.signal)), timeoutPromise, externalAbortPromise]); }
        catch (caughtError) { if (externalSignal && externalSignal.aborted) throw createCatalogAbortError(); retryError = timedOut ? createCatalogTimeoutError(timeoutMs) : caughtError; if (attempt >= retries || !isRetryableCatalogError(retryError)) throw retryError; }
        finally { if (timer !== null) clearTimeout(timer); if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort); }
        await waitForCatalogRetry(baseDelayMs * Math.pow(2, attempt), externalSignal);
    }
    throw new Error('La solicitud del catálogo terminó sin resultado.');
}
