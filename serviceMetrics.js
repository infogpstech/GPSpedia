export const SERVICE_METRIC_WINDOW_MS = 15 * 60 * 1000;
export const SERVICE_METRIC_MAX_EVENTS = 600;
export const SERVICE_METRIC_BUCKET_COUNT = 15;

export function createServiceMetricsStore(options = {}) {
    const now = typeof options.now === "function" ? options.now : Date.now;
    const windowMs = Number.isFinite(options.windowMs) && options.windowMs > 0
        ? options.windowMs : SERVICE_METRIC_WINDOW_MS;
    const maxEvents = Number.isInteger(options.maxEvents) && options.maxEvents > 0
        ? options.maxEvents : SERVICE_METRIC_MAX_EVENTS;
    const sessionStartedAt = now();
    let events = [];
    let latestDroppedTimestamp = null;
    const listeners = new Set();

    function prune(capturedAt) {
        const cutoff = capturedAt - windowMs;
        events = events.filter(event => event.timestamp >= cutoff);
    }

    function snapshotAt(capturedAt) {
        prune(capturedAt);
        const cutoff = capturedAt - windowMs;
        return {
            windowMs,
            eventLimit: maxEvents,
            sessionStartedAt,
            capturedAt,
            truncated: latestDroppedTimestamp !== null && latestDroppedTimestamp >= cutoff,
            events: events.map(event => ({ ...event }))
        };
    }

    function record(input) {
        const source = input && typeof input === "object" ? input : {};
        const rawTimestamp = Number(source.timestamp);
        const timestamp = Number.isFinite(rawTimestamp) ? rawTimestamp : now();
        const event = {
            service: String(source.service || "UNKNOWN"),
            action: String(source.action || "unknown"),
            timestamp,
            durationMs: Math.max(0, Number(source.durationMs) || 0),
            outcome: String(source.outcome || "unknown"),
            httpStatus: source.httpStatus === null || source.httpStatus === undefined ? null :
                Number.isFinite(Number(source.httpStatus)) ? Number(source.httpStatus) : null
        };

        // Inserción ordenada: solicitudes concurrentes pueden terminar fuera de orden.
        let low = 0, high = events.length;
        while (low < high) {
            const middle = (low + high) >>> 1;
            if (events[middle].timestamp <= timestamp) low = middle + 1;
            else high = middle;
        }
        events.splice(low, 0, event);

        const capturedAt = now();
        prune(capturedAt);
        while (events.length > maxEvents) {
            const dropped = events.shift();
            latestDroppedTimestamp = latestDroppedTimestamp === null
                ? dropped.timestamp : Math.max(latestDroppedTimestamp, dropped.timestamp);
        }

        const current = snapshotAt(capturedAt);
        listeners.forEach(listener => {
            try { listener(current); } catch (error) { /* Un suscriptor no debe bloquear el registro. */ }
        });
        return current;
    }

    function getSnapshot() {
        return snapshotAt(now());
    }

    function subscribe(listener) {
        if (typeof listener !== "function") return () => {};
        listeners.add(listener);
        return () => listeners.delete(listener);
    }

    return { record, getSnapshot, subscribe };
}

export function bucketServiceMetrics(snapshot, serviceKeys = []) {
    const source = snapshot && typeof snapshot === "object" ? snapshot : {};
    const capturedAt = Number(source.capturedAt);
    const windowMs = Number(source.windowMs);
    const events = Array.isArray(source.events) ? source.events : [];
    const bucketCount = SERVICE_METRIC_BUCKET_COUNT;
    const validWindow = Number.isFinite(windowMs) && windowMs > 0 ? windowMs : SERVICE_METRIC_WINDOW_MS;
    const validCapturedAt = Number.isFinite(capturedAt) ? capturedAt : Date.now();
    const startAt = validCapturedAt - validWindow;
    const bucketSize = validWindow / bucketCount;
    const keys = [...new Set([
        ...(Array.isArray(serviceKeys) ? serviceKeys : []),
        ...events.map(event => String(event.service || "UNKNOWN"))
    ])];
    const series = keys.map(service => ({ service, counts: Array(bucketCount).fill(0) }));

    events.forEach(event => {
        const timestamp = Number(event && event.timestamp);
        if (!Number.isFinite(timestamp) || timestamp < startAt || timestamp > validCapturedAt) return;
        const rawIndex = Math.floor((timestamp - startAt) / bucketSize);
        const index = Math.min(bucketCount - 1, Math.max(0, rawIndex));
        const target = series.find(item => item.service === String(event.service || "UNKNOWN"));
        if (target) target.counts[index]++;
    });

    return { startAt, capturedAt: validCapturedAt, windowMs: validWindow, bucketCount, bucketSize, series };
}
