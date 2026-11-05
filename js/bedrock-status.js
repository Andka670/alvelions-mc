/*
 * ALVELIONS MC - NetherNet status checker via iceFetch JSON API.
 * Uses GET /api/info only (no SDP offer / ICE candidate allocation).
 * API documentation: https://icefetch.tools.kt04.com/api-docs
 */
(function () {
    "use strict";

    const SERVER_HOST = "alvelionssmp.my.id";
    const SERVER_PORT = 26714;
    const API_BASE = "https://icefetch.tools.kt04.com/api/info";
    const API_URL = API_BASE + "?" + new URLSearchParams({
        host: SERVER_HOST,
        port: String(SERVER_PORT),
        tls: "false" // Server's tested /v1/join endpoint responds over plain HTTP.
    }).toString();

    // iceFetch caches each target for 120 seconds. Keep a local cache to avoid
    // duplicate calls from homepage/dashboard and respect its anonymous quota.
    const CACHE_TTL_MS = 4 * 60 * 1000;
    const REQUEST_TIMEOUT_MS = 12000;
    const STORAGE_KEY = "alvelions_icefetch_status_v1";

    let cachedObservation = null;
    let cachedAt = 0;
    let inFlightRequest = null;
    let lastError = "";

    function readStoredCache() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.data || !Number.isFinite(parsed.savedAt)) return null;
            if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
            return parsed;
        } catch (_) {
            return null;
        }
    }

    function writeStoredCache(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
        } catch (_) {
            // Private browsing or disabled storage must not prevent a live status check.
        }
    }

    function errorMessage(body, httpStatus) {
        const raw = body && (body.error?.message || body.error || body.message);
        const text = typeof raw === "string" ? raw : raw ? JSON.stringify(raw) : "";
        if (httpStatus === 429) {
            return "Kuota iceFetch sedang mencapai batas (HTTP 429). Coba lagi nanti; API gratis memiliki batas pemakaian.";
        }
        if (httpStatus === 404) {
            return "Endpoint iceFetch tidak ditemukan (HTTP 404). Periksa alamat API iceFetch.";
        }
        if (httpStatus >= 500) {
            return `Layanan iceFetch sedang bermasalah (HTTP ${httpStatus})${text ? `: ${text}` : "."}`;
        }
        return `iceFetch menolak pemeriksaan (HTTP ${httpStatus})${text ? `: ${text}` : "."}`;
    }

    function normalize(body, elapsedMs) {
        if (!body || typeof body !== "object") {
            throw new Error("Respons iceFetch bukan JSON yang valid.");
        }
        if (body.ok !== true) {
            const detail = body.error?.message || body.error || body.message || "Server tidak memberikan metadata NetherNet.";
            throw new Error(`iceFetch tidak berhasil membaca server: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
        }

        const upstreamStatus = Number(body.status);
        if (!Number.isFinite(upstreamStatus) || upstreamStatus < 200 || upstreamStatus >= 300) {
            throw new Error(`Endpoint NetherNet tidak memberikan respons sukses (HTTP ${Number.isFinite(upstreamStatus) ? upstreamStatus : "tidak diketahui"}).`);
        }

        const info = body.info;
        if (!info || typeof info !== "object") {
            throw new Error("iceFetch merespons, tetapi metadata /v1/join kosong atau tidak lengkap.");
        }

        const onlinePlayers = Number(info.players);
        const maxPlayers = Number(info.maxPlayers);
        const checkedAt = Date.now();

        return {
            verdict: "online",
            status: "online",
            players: {
                online: Number.isFinite(onlinePlayers) && onlinePlayers >= 0 ? onlinePlayers : null,
                max: Number.isFinite(maxPlayers) && maxPlayers >= 0 ? maxPlayers : null
            },
            latencyMs: Math.max(0, Math.round(elapsedMs)),
            version: info.version || "Tidak diketahui",
            name: info.name || "ALVELIONS SMP",
            level: info.level || "",
            protocol: Number.isFinite(Number(info.protocol)) ? Number(info.protocol) : null,
            gameType: Number.isFinite(Number(info.gameType)) ? Number(info.gameType) : null,
            method: "NetherNet HTTP /v1/join via iceFetch",
            source: "iceFetch",
            freshness: "current",
            checkedAt,
            observedAt: new Date(checkedAt).toISOString(),
            tls: body.tls === true
        };
    }

    async function fetchObservation() {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        const startedAt = performance.now();
        try {
            const response = await fetch(API_URL, {
                method: "GET",
                headers: { Accept: "application/json" },
                mode: "cors",
                credentials: "omit",
                cache: "no-store",
                signal: controller.signal
            });

            const raw = await response.text();
            let body = null;
            try { body = raw ? JSON.parse(raw) : null; }
            catch (_) { throw new Error(`iceFetch mengirim respons bukan JSON (HTTP ${response.status}).`); }

            if (!response.ok) {
                throw new Error(errorMessage(body, response.status));
            }
            return normalize(body, performance.now() - startedAt);
        } catch (error) {
            if (error && error.name === "AbortError") {
                throw new Error("Permintaan ke iceFetch melewati batas waktu 12 detik. Ini belum membuktikan server offline.");
            }
            if (error instanceof TypeError) {
                throw new Error("Browser tidak dapat membaca API iceFetch. Kemungkinan koneksi internet atau CORS dari iceFetch. Tes melalui halaman tes-icefetch.html; ini belum berarti server Minecraft offline.");
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    function isCurrent(data) {
        if (!data || data.verdict !== "online") return false;
        const checkedAt = Number(data.checkedAt);
        return Number.isFinite(checkedAt) && Date.now() - checkedAt <= CACHE_TTL_MS;
    }

    async function check(forceRefresh = false) {
        if (!forceRefresh && cachedObservation && isCurrent(cachedObservation)) return cachedObservation;

        if (!forceRefresh && !cachedObservation) {
            const stored = readStoredCache();
            if (stored && stored.data && isCurrent(stored.data)) {
                cachedObservation = stored.data;
                cachedAt = stored.savedAt;
                return cachedObservation;
            }
        }

        if (inFlightRequest) return inFlightRequest;
        lastError = "";
        inFlightRequest = fetchObservation()
            .then(data => {
                cachedObservation = data;
                cachedAt = Date.now();
                writeStoredCache(data);
                return data;
            })
            .catch(error => {
                lastError = error?.message || String(error);
                throw error;
            })
            .finally(() => { inFlightRequest = null; });
        return inFlightRequest;
    }

    window.AlvelionsBedrockStatus = {
        address: `${SERVER_HOST}:${SERVER_PORT}`,
        apiUrl: API_URL,
        checkerUrl: "https://icefetch.tools.kt04.com/",
        checkerSource: "icefetch-nethernet",
        check,
        isCurrent,
        getLastError: () => lastError,
        clearCache: () => {
            cachedObservation = null;
            cachedAt = 0;
            try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        }
    };
})();
