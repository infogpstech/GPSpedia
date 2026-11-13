import { qrcode } from './qrcode-generator.mjs';

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com']);

export function normalizePrintableYouTubeUrl(value) {
    if (typeof value !== 'string' || !value.trim() || value.length > 2048) return null;
    let parsed;
    try { parsed = new URL(value.trim()); } catch { return null; }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) return null;

    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let videoId = '';
    if (host === 'youtu.be') {
        videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
    } else if (YOUTUBE_HOSTS.has(host)) {
        if (parsed.pathname === '/watch') videoId = parsed.searchParams.get('v') || '';
        else {
            const match = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})(?:\/|$)/);
            videoId = match ? match[1] : '';
        }
    }
    if (!VIDEO_ID_PATTERN.test(videoId)) return null;
    return 'https://www.youtube.com/watch?v=' + videoId;
}

export function createPrintableQrDataUrl(value) {
    const canonicalUrl = normalizePrintableYouTubeUrl(value);
    if (!canonicalUrl) return null;
    const code = qrcode(0, 'M');
    code.addData(canonicalUrl, 'Byte');
    code.make();
    return code.createDataURL(4, 4);
}
