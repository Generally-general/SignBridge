const API = "https://rtc.live.cloudflare.com/v1/turn/keys";
const TTL_SECONDS = 24 * 60 * 60;
const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 4000;

const STUN_ONLY = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

// Browsers restrict TURN on port 53, so those URLs are dropped.
function usable(iceServers) {
  return iceServers
    .map((s) => {
      const urls = (Array.isArray(s.urls) ? s.urls : [s.urls]).filter(
        (u) => typeof u === "string" && !/:53(\?|$)/.test(u),
      );
      return { ...s, urls };
    })
    .filter((s) => s.urls.length > 0);
}

export function createIceServerProvider({
  keyId,
  apiToken,
  fetchImpl = globalThis.fetch,
  now = Date.now,
} = {}) {
  let cached = null;
  let cachedAt = 0;
  let inflight = null;
  let warned = false;

  async function mint() {
    const res = await fetchImpl(
      `${API}/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: TTL_SECONDS }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    if (!res.ok) throw new Error(`Cloudflare TURN credentials request failed (${res.status})`);
    const json = await res.json();
    const list = Array.isArray(json?.iceServers) ? usable(json.iceServers) : [];
    if (list.length === 0) throw new Error("Cloudflare TURN returned no ICE servers");
    return list;
  }

  return async function getIceServers() {
    if (!keyId || !apiToken) {
      if (!warned) {
        warned = true;
        console.warn(
          "TURN is not configured (CF_TURN_KEY_ID / CF_TURN_API_TOKEN): calls use STUN only, " +
            "so some networks cannot connect.",
        );
      }
      return STUN_ONLY;
    }
    if (cached && now() - cachedAt < REFRESH_AFTER_MS) return cached;

    inflight ||= mint()
      .then((list) => {
        cached = list;
        cachedAt = now();
        return list;
      })
      .finally(() => {
        inflight = null;
      });
    try {
      return await inflight;
    } catch (err) {
      console.error("ICE servers:", err.message);
      return cached || STUN_ONLY;
    }
  };
}