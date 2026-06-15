/*
 * Host-owned data layer.
 *
 * Cards no longer fetch their own live data inside model-written code. Instead the
 * model declares DECLARATIVE data bindings, and the host fetches them here. This:
 *   - separates data from code, so "refresh" refetches data instead of regenerating
 *     the whole component (cheaper, deterministic — the card stops mutating itself),
 *   - enables a real cache + in-flight dedup + retry/backoff (N identical crypto
 *     cards make 1 request, not N), and
 *   - keeps network access out of model code, shrinking the prompt-injection blast
 *     radius (the host only ever calls an explicit host allowlist).
 *
 * A binding looks like:
 *   { key: "price", url: "https://api.coingecko.com/...", refreshSec: 60, path: "bitcoin.usd" }
 */

// Hostnames the host is willing to fetch. Anything else is refused (no SSRF /
// no key-bearing endpoints / no arbitrary exfiltration target).
export const ALLOWED_HOSTS = [
  'api.coingecko.com',          // crypto price + history
  'api.open-meteo.com',         // weather (no key)
  'geocoding-api.open-meteo.com', // place -> lat/lon
  'open.er-api.com',            // FX rates (daily)
  'api.frankfurter.app',        // FX rates + history (ECB)
  'hn.algolia.com',             // Hacker News search (tech news, no key)
  'restcountries.com',          // country facts/flags
  'api.wikimedia.org',          // Wikimedia/Wikipedia content + images
  'en.wikipedia.org',           // Wikipedia REST
];

const cache = new Map();    // url -> { ts, value }
const inflight = new Map();  // url -> Promise

function hostAllowed(url) {
  try {
    const h = new URL(url).hostname;
    return ALLOWED_HOSTS.some(a => h === a || h.endsWith('.' + a));
  } catch {
    return false;
  }
}

// Resolve a dotted/bracketed path like "a.b[0].c" against a JSON object.
function getPath(obj, path) {
  if (!path) return obj;
  const parts = String(path).replace(/\[(\w+)\]/g, '.$1').split('.').filter(Boolean);
  return parts.reduce((o, k) => (o == null ? o : o[k]), obj);
}

async function fetchJSONWithBackoff(url, { retries = 2 } = {}) {
  let attempt = 0, delay = 600;
  for (;;) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.status === 429 || res.status >= 500) throw new Error(`retryable HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt++ >= retries) throw err;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

// Fetch one URL through the cache + in-flight dedup. ttlMs controls how long a
// cached value is reused before a refetch.
export async function fetchURL(url, ttlMs = 30000) {
  if (!hostAllowed(url)) {
    throw new Error(`Blocked: ${(() => { try { return new URL(url).hostname; } catch { return url; } })()} is not in the data allowlist`);
  }
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.value;
  if (inflight.has(url)) return inflight.get(url);
  const p = fetchJSONWithBackoff(url)
    .then(value => { cache.set(url, { ts: Date.now(), value }); inflight.delete(url); return value; })
    .catch(err => { inflight.delete(url); throw err; });
  inflight.set(url, p);
  return p;
}

// Resolve all bindings into a plain { key: value } object. Per-binding failures are
// captured as { __error } so one bad source never breaks the whole card.
export async function resolveBindings(bindings = []) {
  const data = {};
  if (!Array.isArray(bindings) || !bindings.length) return data;
  await Promise.all(bindings.map(async (b) => {
    if (!b || !b.key || !b.url) return;
    const ttl = Math.max(5000, ((b.refreshSec || 60) * 1000) / 2);
    try {
      const json = await fetchURL(b.url, ttl);
      data[b.key] = getPath(json, b.path);
    } catch (err) {
      data[b.key] = { __error: err.message };
    }
  }));
  return data;
}

// Smallest positive refreshSec across bindings (0 if none want refreshing).
export function bindingsRefreshInterval(bindings = []) {
  const secs = (bindings || []).map(b => b?.refreshSec).filter(s => Number.isFinite(s) && s > 0);
  return secs.length ? Math.max(15, Math.min(...secs)) : 0;
}
