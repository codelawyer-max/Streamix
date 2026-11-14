import axios from "axios";

// The location is looked up ON THE SERVER from the request's IP address.
// Before, the browser looked it up and sent it, so anyone could send any
// city they liked (and the free lookup often failed or was rate-limited).

const PRIVATE_IP = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|fc|fd|fe80)/i;

export const isPrivateIp = (ip) => !ip || PRIVATE_IP.test(ip);

export const normalizePlace = (value) =>
    String(value || "").trim().toLowerCase();

// Render puts the real visitor first in X-Forwarded-For
export const getClientIp = (req) => {
    const forwarded = String(req.headers["x-forwarded-for"] || "")
        .split(",")[0]
        .trim();

    const raw = forwarded || req.socket?.remoteAddress || "";

    return raw.replace(/^::ffff:/, "");
};

const cache = new Map(); // ip -> { value, expires }
const CACHE_MS = 10 * 60 * 1000;

const fromIpwho = async (target) => {
    const { data } = await axios.get(
        `https://ipwho.is/${encodeURIComponent(target)}`,
        { timeout: 3500 }
    );

    if (data && data.success) {
        return { city: data.city || "", state: data.region || "" };
    }

    return null;
};

const fromIpapi = async (target) => {
    const path = target ? `${encodeURIComponent(target)}/json/` : "json/";

    const { data } = await axios.get(`https://ipapi.co/${path}`, {
        timeout: 3500,
    });

    if (data && !data.error) {
        return { city: data.city || "", state: data.region || "" };
    }

    return null;
};

// Returns { city, state } or null when the location cannot be found.
// On localhost (private IP) the provider is asked without an IP, which
// returns the location of your own connection.
export const lookupLocation = async (ip) => {
    const target = isPrivateIp(ip) ? "" : ip;
    const key = target || "self";

    const cached = cache.get(key);

    if (cached && cached.expires > Date.now()) return cached.value;

    for (const provider of [fromIpwho, fromIpapi]) {
        try {
            const value = await provider(target);

            if (value && (value.city || value.state)) {
                cache.set(key, { value, expires: Date.now() + CACHE_MS });
                return value;
            }
        } catch {
            // try the next provider
        }
    }

    return null;
};
