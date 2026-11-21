// Métricas locales de solicitudes API del navegador actual.
// No persiste datos, no transmite telemetría y nunca conserva payloads, tokens o datos personales.
const SERVICE_KEYS = Object.freeze(["AUTH", "CATALOG", "WRITE", "USERS", "FEEDBACK", "UTILITIES", "ADMIN"]);
const BUCKET_MS = 60 * 60 * 1000;
const WINDOW_MS = 24 * BUCKET_MS;
const MAX_EVENTS = 200;
const eventHistory = [];
const hourlyBuckets = new Map();

export function getBrowserDeviceType(navigatorRef = typeof navigator !== "undefined" ? navigator : null) {
    if (!navigatorRef) return "unknown";
    if (navigatorRef.userAgentData && typeof navigatorRef.userAgentData.mobile === "boolean") {
        return navigatorRef.userAgentData.mobile ? "mobile" : "desktop";
    }
    const userAgent = String(navigatorRef.userAgent || "");
    if (/iPad|Tablet|PlayBook|Silk/i.test(userAgent)) return "tablet";
    if (/Android|iPhone|iPod|Mobile|IEMobile|Opera Mini|Windows Phone/i.test(userAgent)) return "mobile";
    return "desktop";
}

function normalizeService_(service) {
    const key = String(service || "").trim().toUpperCase();
    return SERVICE_KEYS.includes(key) ? key : null;
}

function trimExpiredBuckets_(now) {
    const firstBucket = Math.floor(now / BUCKET_MS) * BUCKET_MS - WINDOW_MS + BUCKET_MS;
    for (const key of hourlyBuckets.keys()) {
        const startAt = Number(key.slice(key.indexOf(":") + 1));
        if (!Number.isSafeInteger(startAt) || startAt < firstBucket) hourlyBuckets.delete(key);
    }
}

function percentile_(values, percentile) {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return null;
    const position = (sorted.length - 1) * Math.min(1, Math.max(0, percentile));
    const lowerIndex = Math.floor(position);
    const upperIndex = Math.ceil(position);
    if (lowerIndex === upperIndex) return sorted[lowerIndex];
    const weight = position - lowerIndex;
    return sorted[lowerIndex] + (sorted[upperIndex] - sorted[lowerIndex]) * weight;
}

export function recordBrowserServiceTraffic(input = {}) {
    const source = input && typeof input === "object" ? input : {};
    const service = normalizeService_(source.service);
    if (!service) return null;
    const timestamp = Number.isFinite(source.timestamp) ? Math.max(0, source.timestamp) : Date.now();
    const durationMs = Number.isFinite(source.durationMs) ? Math.max(0, source.durationMs) : 0;
    const outcome = source.outcome === "success" ? "success" : "error";
    const action = String(source.action || "unknown").slice(0, 80);
    const deviceType = ["mobile", "tablet", "desktop"].includes(source.deviceType)
        ? source.deviceType : getBrowserDeviceType();
    const httpStatus = Number.isInteger(source.httpStatus) && source.httpStatus >= 100 && source.httpStatus <= 599
        ? source.httpStatus : null;
    const requestBytes = Number.isFinite(source.requestBytes) ? Math.max(0, source.requestBytes) : null;
    const responseBytes = Number.isFinite(source.responseBytes) ? Math.max(0, source.responseBytes) : null;
    const event = { service, action, timestamp, durationMs, outcome, httpStatus, deviceType, requestBytes, responseBytes };
    eventHistory.push(event);
    if (eventHistory.length > MAX_EVENTS) eventHistory.splice(0, eventHistory.length - MAX_EVENTS);

    const startAt = Math.floor(timestamp / BUCKET_MS) * BUCKET_MS;
    const key = service + ":" + startAt;
    const bucket = hourlyBuckets.get(key) || {
        service, startAt, count: 0, successes: 0, errors: 0, durationTotalMs: 0,
        requestBytesTotal: 0, responseBytesTotal: 0, requestBytesSamples: 0, responseBytesSamples: 0
    };
    bucket.count += 1;
    if (outcome === "success") bucket.successes += 1;
    else bucket.errors += 1;
    bucket.durationTotalMs += durationMs;
    if (requestBytes !== null) { bucket.requestBytesTotal += requestBytes; bucket.requestBytesSamples += 1; }
    if (responseBytes !== null) { bucket.responseBytesTotal += responseBytes; bucket.responseBytesSamples += 1; }
    hourlyBuckets.set(key, bucket);
    trimExpiredBuckets_(timestamp);

    return event;
}

export function getBrowserServiceTrafficSnapshot(serviceValue, options = {}) {
    const service = normalizeService_(serviceValue);
    if (!service) return null;
    const settings = options && typeof options === "object" ? options : {};
    const capturedAt = Number.isFinite(settings.now) ? settings.now : Date.now();
    const currentBucket = Math.floor(capturedAt / BUCKET_MS) * BUCKET_MS;
    const firstBucket = currentBucket - WINDOW_MS + BUCKET_MS;
    const buckets = [];
    const totals = { lastHour: 0, last6Hours: 0, last24Hours: 0 };
    const matchingBuckets = [];
    for (let startAt = firstBucket; startAt <= currentBucket; startAt += BUCKET_MS) {
        const bucket = hourlyBuckets.get(service + ":" + startAt);
        const count = bucket ? bucket.count : 0;
        const row = {
            startAt,
            count,
            successes: bucket ? bucket.successes : 0,
            errors: bucket ? bucket.errors : 0
        };
        buckets.push(row);
        if (startAt + BUCKET_MS > capturedAt - 60 * 60 * 1000) totals.lastHour += count;
        if (startAt + BUCKET_MS > capturedAt - 6 * 60 * 60 * 1000) totals.last6Hours += count;
        totals.last24Hours += count;
        if (bucket) matchingBuckets.push(bucket);
    }
    // Los percentiles usan el historial efímero acotado (máximo 200 eventos por pestaña),
    // no se presentan como percentiles poblacionales de 24 h.
    const events = eventHistory.filter(event =>
        event.service === service && event.timestamp >= firstBucket && event.timestamp <= capturedAt
    );
    const durations = events.map(event => event.durationMs);
    const requestSizes = events.map(event => event.requestBytes).filter(Number.isFinite);
    const responseSizes = events.map(event => event.responseBytes).filter(Number.isFinite);
    const requestCount = matchingBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
    const successCount = matchingBuckets.reduce((sum, bucket) => sum + bucket.successes, 0);
    const errorCount = matchingBuckets.reduce((sum, bucket) => sum + bucket.errors, 0);
    const durationTotalMs = matchingBuckets.reduce((sum, bucket) => sum + bucket.durationTotalMs, 0);
    const requestBytesTotal = matchingBuckets.reduce((sum, bucket) => sum + bucket.requestBytesTotal, 0);
    const responseBytesTotal = matchingBuckets.reduce((sum, bucket) => sum + bucket.responseBytesTotal, 0);
    const requestBytesSamples = matchingBuckets.reduce((sum, bucket) => sum + bucket.requestBytesSamples, 0);
    const responseBytesSamples = matchingBuckets.reduce((sum, bucket) => sum + bucket.responseBytesSamples, 0);
    const lastEvent = events.length ? events[events.length - 1] : null;
    return {
        status: "success",
        scope: "browser_local_service_traffic",
        service,
        source: "current_browser_session",
        clientType: settings.deviceType || getBrowserDeviceType(),
        capturedAt,
        bucketMs: BUCKET_MS,
        windowMs: WINDOW_MS,
        buckets,
        totals,
        metrics: {
            requests: requestCount,
            successes: successCount,
            errors: errorCount,
            averageDurationMs: requestCount ? durationTotalMs / requestCount : null,
            percentileSampleCount: durations.length,
            durationP50Ms: percentile_(durations, 0.50),
            durationP95Ms: percentile_(durations, 0.95),
            requestBytesP50: percentile_(requestSizes, 0.50),
            requestBytesP95: percentile_(requestSizes, 0.95),
            responseBytesP50: percentile_(responseSizes, 0.50),
            responseBytesP95: percentile_(responseSizes, 0.95),
            requestBytesTotal,
            responseBytesTotal,
            averageRequestBytes: requestBytesSamples ? requestBytesTotal / requestBytesSamples : null,
            averageResponseBytes: responseBytesSamples ? responseBytesTotal / responseBytesSamples : null
        },
        events: events.slice(-MAX_EVENTS),
        lastEvent
    };
}

export const BROWSER_SERVICE_TRAFFIC_SERVICES = SERVICE_KEYS;
