import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("youtubeUpload.js", "utf8");

function extractFunction(name) {
    const marker = `function ${name}(`;
    const start = source.indexOf(marker);
    assert.notEqual(start, -1, `No se encontró ${name}`);
    const open = source.indexOf("{", start);
    let depth = 0;
    for (let i = open; i < source.length; i++) {
        if (source[i] === "{") depth++;
        if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
    }
    assert.fail(`Función ${name} sin cerrar`);
}

const declarations = [
    "parseYouTubeUploadRange_",
    "parseYouTubeUploadResponse_",
    "queryYouTubeUploadOffset_",
    "sendYouTubeUploadChunk_",
    "uploadYouTubeFileResumable_"
].map(extractFunction).join("\n");

function createRuntime(outcomes) {
    const requests = [];
    class FakeXHR {
        constructor() {
            this.headers = {};
            this.upload = {};
            this.status = 0;
            this.responseText = "";
            this.aborted = false;
            requests.push(this);
        }
        open(method, url) { this.method = method; this.url = url; }
        setRequestHeader(name, value) { this.headers[name] = value; }
        getResponseHeader(name) { return name.toLowerCase() === "range" ? (this.range || null) : null; }
        send(body) {
            this.body = body;
            const outcome = outcomes.shift();
            if (!outcome || outcome.pending) return;
            this.status = outcome.status;
            this.range = outcome.range || null;
            this.responseText = outcome.responseText || "";
            if (outcome.error) this.onerror();
            else this.onload();
        }
        abort() {
            this.aborted = true;
            if (this.onabort) this.onabort();
        }
    }
    const factory = new Function("XMLHttpRequest", "YOUTUBE_UPLOAD_CHUNK_SIZE",
        declarations + "\nreturn { uploadYouTubeFileResumable_ };");
    return { ...factory(FakeXHR, 4), requests };
}

let passed = 0;
async function test(name, callback) {
    await callback();
    passed++;
    console.log("PASS", name);
}

await test("reanuda desde el offset confirmado y persiste cada checkpoint", async () => {
    const id = "AbCdEfGhI12";
    const runtime = createRuntime([
        { status: 308, range: "bytes=0-3" },
        { status: 308, range: "bytes=0-7" },
        { status: 200, responseText: JSON.stringify({ id }) }
    ]);
    const record = {
        file: { slice: (start, end) => ({ start, end }) },
        fileSize: 8, fileType: "video/mp4", uploadUrl: "https://upload.test/session",
        bytesUploaded: 4, status: "paused"
    };
    const checkpoints = [];
    const videoId = await runtime.uploadYouTubeFileResumable_(
        record, null, null, () => false, async saved => checkpoints.push({
            bytesUploaded: saved.bytesUploaded, status: saved.status
        })
    );
    assert.equal(videoId, id);
    assert.deepEqual(checkpoints, [
        { bytesUploaded: 4, status: "paused" },
        { bytesUploaded: 8, status: "uploading" }
    ]);
    assert.deepEqual(runtime.requests.map(xhr => xhr.headers["Content-Range"]), [
        "bytes */8", "bytes 4-7/8", "bytes */8"
    ]);
    assert.equal(record.bytesUploaded, 8);
});

await test("si se pausa un bloque, no avanza ni sobrescribe el último offset confirmado", async () => {
    const runtime = createRuntime([
        { status: 308, range: "bytes=0-3" },
        { pending: true }
    ]);
    const record = {
        file: { slice: (start, end) => ({ start, end }) },
        fileSize: 8, fileType: "video/mp4", uploadUrl: "https://upload.test/session",
        bytesUploaded: 4, status: "uploading"
    };
    let cancelled = false;
    const checkpoints = [];
    const operation = runtime.uploadYouTubeFileResumable_(
        record, null, xhr => { runtime.activeXhr = xhr; }, () => cancelled,
        async saved => checkpoints.push(saved.bytesUploaded)
    );
    for (let i = 0; i < 8; i++) await Promise.resolve();
    assert.equal(runtime.requests.length, 2, "Debe estar activo el segundo bloque");
    cancelled = true;
    runtime.activeXhr.abort();
    await assert.rejects(operation, /cancelado/i);
    assert.deepEqual(checkpoints, [4]);
    assert.equal(record.bytesUploaded, 4);
    assert.equal(runtime.requests.length, 2, "No debe iniciar otro bloque después de cancelar");
});

console.log("YouTubeUploadCheckpointRecovery:", passed + "/2 PASS");
