/**
 * Limita el trabajo simultáneo de compresión de miniaturas dentro de una instancia
 * JavaScript (pestaña). Las solicitudes pendientes se ejecutan en orden FIFO.
 */
export function createConcurrencyLimiter(limit = 2) {
    const maxConcurrent = Number.isFinite(limit) && limit > 0
        ? Math.max(1, Math.floor(limit))
        : 2;
    let active = 0;
    const pending = [];

    function drain() {
        while (active < maxConcurrent && pending.length) {
            const job = pending.shift();
            active += 1;
            Promise.resolve()
                .then(job.task)
                .then(
                    value => {
                        active -= 1;
                        job.resolve(value);
                        drain();
                    },
                    error => {
                        active -= 1;
                        job.reject(error);
                        drain();
                    }
                );
        }
    }

    function run(task) {
        if (typeof task !== "function") {
            return Promise.reject(new TypeError("La tarea de compresión debe ser una función."));
        }
        return new Promise((resolve, reject) => {
            pending.push({ task, resolve, reject });
            drain();
        });
    }

    function getStats() {
        return { limit: maxConcurrent, active, queued: pending.length };
    }

    return { run, getStats };
}

export const MAX_CONCURRENT_THUMBNAIL_COMPRESSIONS = 2;
export const thumbnailCompressionQueue = createConcurrencyLimiter(MAX_CONCURRENT_THUMBNAIL_COMPRESSIONS);
