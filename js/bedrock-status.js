/*
 * Shared Minecraft Bedrock status client for the homepage and dashboard (v8).
 * Uses the same explicit public address/port that players see on the website.
 * API contract docs: https://minecraftstatus.com/docs/bedrock
 */
(function () {
    "use strict";

    // IMPORTANT: use the public join port shown on the website, not Bedrock's default.
    const SERVER_ADDRESS = "alvelionssmp.my.id:25812";
    const SERVER_HOST = SERVER_ADDRESS.slice(0, SERVER_ADDRESS.lastIndexOf(":"));
    const SERVER_PORT = SERVER_ADDRESS.slice(SERVER_ADDRESS.lastIndexOf(":") + 1);
    const JAKARTA_CHECKER_URL = String(window.ALVELIONS_JAKARTA_CHECKER_URL || "").trim();
    // Keep the host:port separator literal in the primary request. Some API gateways
    // incorrectly reject an encoded %3A even though it is equivalent after URL decoding.
    const API_URL = "https://minecraftstatus.com/api/v1/status/bedrock?address=" +
        encodeURIComponent(SERVER_HOST) + ":" + encodeURIComponent(SERVER_PORT);
    // Compatibility fallback for deployments where the versioned validator rejects a
    // valid host:port target. This endpoint returns the unversioned observation shape.
    const COMPAT_API_URL = "https://minecraftstatus.com/api/status/bedrock/" +
        encodeURIComponent(SERVER_HOST) + ":" + encodeURIComponent(SERVER_PORT);
    const REQUEST_TIMEOUT_MS = 15000;
    const POLL_INTERVAL_MS = 1200;
    const MAX_POLL_ATTEMPTS = 12;

    let inFlightRequest = null;
    let cachedObservation = null;
    let lastError = null;

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    async function fetchJson(url) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(url, {
                method: "GET",
                headers: { Accept: "application/json" },
                cache: "no-store",
                mode: "cors",
                credentials: "omit",
                signal: controller.signal
            });

            const raw = await response.text();
            let body = {};
            if (raw) {
                try { body = JSON.parse(raw); }
                catch { body = { message: raw.slice(0, 500) }; }
            }
            return { response, body };
        } catch (error) {
            if (error && error.name === "AbortError") {
                throw new Error("Waktu pengecekan status habis (timeout API).");
            }
            if (error instanceof TypeError) {
                throw new Error("Tidak dapat mengakses layanan pengecekan. Periksa koneksi, DNS, HTTPS, atau akses CORS.");
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    function observationFrom(body) {
        if (!body || typeof body !== "object") return null;

        // Job receipts can also contain `status: "pending"`, `"running"`, or
        // `"succeeded"`. Those are job states, not server verdicts. Only accept
        // the canonical verdicts (or the legacy equivalent) as observations.
        const validVerdicts = new Set(["online", "offline", "unknown"]);
        const isObservation = item => {
            if (!item || typeof item !== "object") return false;
            const verdict = String(item.verdict || "").toLowerCase();
            const legacyStatus = String(item.status || "").toLowerCase();
            return validVerdicts.has(verdict) || validVerdicts.has(legacyStatus);
        };

        const candidates = [
            body.observation,
            body.result?.observation,
            body.data?.observation,
            body.job?.observation,
            body.output?.observation,
            body.result?.data?.observation,
            body.result,
            body.data,
            body.output,
            body.payload,
            body
        ];
        for (const item of candidates) {
            if (isObservation(item)) return item;
        }
        return null;
    }

    function apiError(response, body) {
        const raw = body?.error?.message || body?.message || body?.error || "API tidak memberi rincian kesalahan";
        if (response.status === 429) {
            return new Error("API status sedang membatasi permintaan (429). Coba lagi sebentar lagi.");
        }
        if (response.status === 503) {
            return new Error("Layanan pengecekan MinecraftStatus sedang tidak tersedia (503).");
        }
        return new Error(`API status HTTP ${response.status}: ${String(raw).slice(0, 220)}`);
    }

    function pollUrlFrom(response, body) {
        const raw = body?.pollUrl || body?.poll_url || body?.links?.poll?.href ||
            body?._links?.poll?.href || response.headers.get("Location");
        if (!raw || typeof raw !== "string") return null;
        try { return new URL(raw, API_URL).href; }
        catch { return null; }
    }

    function futureObservationReason(observation) {
        if (!observation || typeof observation !== "object") return "";
        const fields = [
            observation.evidenceCode,
            observation.freshnessReason,
            observation.freshness,
            observation.unknownReason,
            observation.reason,
            observation.message
        ];
        return fields.map(value => String(value || "").toLowerCase())
            .find(value => /future[-_ ]observation/.test(value)) || "";
    }

    function observedAtIsInFuture(observation) {
        if (!observation || typeof observation !== "object") return false;
        const raw = observation.observedAt || observation.checkedAt || observation.observed_at || "";
        const timestamp = Date.parse(raw);
        // Allow small clock skew, but never trust an observation timestamp clearly in the future.
        return Number.isFinite(timestamp) && timestamp > Date.now() + 120000;
    }

    function needsFutureRecovery(observation) {
        return Boolean(futureObservationReason(observation)) || observedAtIsInFuture(observation);
    }

    async function fetchCompatibilityObservation() {
        const result = await fetchJson(COMPAT_API_URL);
        if (result.response.status === 429 || result.response.status === 503) {
            throw apiError(result.response, result.body);
        }
        if (!result.response.ok) throw apiError(result.response, result.body);
        const observation = observationFrom(result.body);
        if (!observation) {
            throw new Error("Endpoint Bedrock alternatif membalas tanpa verdict server yang dikenali.");
        }
        return observation;
    }

    async function recoverFutureObservation(observation, allowFallback = true) {
        if (!needsFutureRecovery(observation)) return observation;
        if (!allowFallback) {
            throw new Error("MinecraftStatus mengembalikan future-observation pada endpoint alternatif juga. Hasil memiliki penanda/waktu observasi masa depan, jadi tidak aman menyebut server Online atau Offline.");
        }

        try {
            const alternate = await fetchCompatibilityObservation();
            if (!needsFutureRecovery(alternate) && isCurrent(alternate)) return alternate;
            throw new Error("endpoint alternatif juga mengembalikan observasi tidak valid atau bertanggal masa depan");
        } catch (error) {
            const detail = error?.message || "endpoint alternatif gagal";
            throw new Error(`API utama mengembalikan future-observation (hasil observasi tidak valid). Percobaan ulang melalui endpoint Bedrock alternatif gagal: ${detail}. Ini belum membuktikan server offline; coba lagi nanti atau periksa layanan MinecraftStatus.`);
        }
    }

    async function fetchObservation() {
        // If a Jakarta probe is configured, use only its result so the displayed latency
        // has a known source. Do not quietly substitute a remote checker on failure.
        if (JAKARTA_CHECKER_URL) {
            const result = await fetchJson(JAKARTA_CHECKER_URL);
            if (!result.response.ok) {
                const detail = result.body?.message || result.body?.error || "tidak ada rincian";
                throw new Error(`Checker Jakarta HTTP ${result.response.status}: ${String(detail).slice(0, 220)}`);
            }
            const observation = observationFrom(result.body);
            if (!observation) throw new Error("Checker Jakarta membalas dengan format data yang tidak dikenali.");
            return observation;
        }

        const first = await fetchJson(API_URL);

        // For a specific invalid-target response, try the documented unversioned Bedrock endpoint.
        const firstMessage = String(first.body?.error?.message || first.body?.message || first.body?.error || "");
        const invalidTarget400 = first.response.status === 400 &&
            /not a valid (?:java or bedrock|bedrock or java) target/i.test(firstMessage);
        if (invalidTarget400) {
            try {
                const alternate = await fetchCompatibilityObservation();
                return await recoverFutureObservation(alternate, false);
            } catch (error) {
                if (/future-observation/.test(error?.message || "")) throw error;
                throw new Error(`API v1 menolak alamat ${SERVER_ADDRESS} (HTTP 400), dan endpoint Bedrock alternatif gagal: ${error?.message || "kesalahan tidak diketahui"}.`);
            }
        }

        if (first.response.status === 429 || first.response.status === 503) {
            throw apiError(first.response, first.body);
        }

        if (first.response.status !== 202) {
            if (!first.response.ok) throw apiError(first.response, first.body);
            const direct = observationFrom(first.body);
            if (!direct) throw new Error("API membalas, tetapi format data status tidak dikenali.");
            return recoverFutureObservation(direct, true);
        }

        const pollUrl = pollUrlFrom(first.response, first.body);
        if (!pollUrl) {
            throw new Error("API mengantrekan pengecekan, tetapi tidak mengirim alamat polling job.");
        }

        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
            const retryHeader = Number(first.response.headers.get("Retry-After"));
            await sleep(Number.isFinite(retryHeader) && retryHeader > 0
                ? Math.min(retryHeader * 1000, 5000)
                : POLL_INTERVAL_MS);

            const result = await fetchJson(pollUrl);
            const body = result.body || {};
            if (result.response.status === 429 || result.response.status === 503) {
                throw apiError(result.response, body);
            }
            if (!result.response.ok && result.response.status !== 202) {
                throw apiError(result.response, body);
            }

            const state = String(body.state || body.job?.state || body.status || body.job?.status || "").toLowerCase();
            if (["failed", "error", "expired", "cancelled", "canceled"].includes(state)) {
                const errorText = body.error?.message || (typeof body.error === "string" ? body.error : state);
                throw new Error(`Pengecekan job gagal: ${errorText}.`);
            }

            const observation = observationFrom(body);
            if (observation) return recoverFutureObservation(observation, true);

            if (result.response.status === 202 ||
                ["pending", "queued", "running", "processing", "accepted", "succeeded", "success", "completed", "done"].includes(state)) {
                continue;
            }
            throw new Error("API menyelesaikan job tanpa observasi server. Respons job tidak berisi verdict online/offline/unknown.");
        }

        throw new Error("Pengecekan masih diproses API. Silakan coba lagi sebentar.");
    }

    function isCurrent(observation) {
        if (!observation || typeof observation !== "object") return false;
        const freshness = String(observation.freshness || "").toLowerCase();
        if (freshness && !["fresh", "current"].includes(freshness)) return false;
        if (needsFutureRecovery(observation)) return false;
        const validUntilRaw = observation.validUntil || observation.valid_until || "";
        if (validUntilRaw) {
            const validUntil = Date.parse(validUntilRaw);
            if (!Number.isFinite(validUntil) || Date.now() >= validUntil) return false;
        }
        // Legacy endpoint may omit freshness, but cannot be trusted past validUntil.
        return true;
    }

    async function check(forceRefresh = false) {
        if (!forceRefresh && cachedObservation && isCurrent(cachedObservation)) return cachedObservation;
        if (inFlightRequest) return inFlightRequest;

        lastError = null;
        inFlightRequest = fetchObservation()
            .then(observation => {
                cachedObservation = observation;
                return observation;
            })
            .catch(error => {
                lastError = error;
                throw error;
            })
            .finally(() => { inFlightRequest = null; });

        return inFlightRequest;
    }

    window.AlvelionsBedrockStatus = {
        address: SERVER_ADDRESS,
        apiUrl: JAKARTA_CHECKER_URL || API_URL,
        checkerUrl: JAKARTA_CHECKER_URL,
        checkerSource: JAKARTA_CHECKER_URL ? "jakarta-raknet-probe" : "minecraftstatus-remote",
        check,
        isCurrent,
        getLastError: () => lastError ? lastError.message : ""
    };
})();
