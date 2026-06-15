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
  'api.coincap.io',             // crypto (alt)
  'api.coinbase.com',           // crypto spot/historic
  'api.open-meteo.com',         // weather (no key)
  'geocoding-api.open-meteo.com', // place -> lat/lon
  'open.er-api.com',            // FX rates (daily)
  'api.frankfurter.app',        // FX rates + history (ECB)
  'api.frankfurter.dev',        // FX (alt host)
  'api.exchangerate.host',      // FX (common, no key)
  'hn.algolia.com',             // Hacker News search (tech news, no key)
  'api.github.com',             // GitHub repos/search (CORS, keyless 60/hr)
  'air-quality-api.open-meteo.com', // air quality (no key)
  'api.worldbank.org',          // economic indicators (no key)
  'restcountries.com',          // country facts/flags
  'api.wikimedia.org',          // Wikimedia/Wikipedia content + images
  'en.wikipedia.org',           // Wikipedia REST
];

const FETCH_TIMEOUT_MS = 9000;
const cache = new Map();    // url -> { ts, value }
const inflight = new Map();  // url -> Promise

function hostAllowed(url) {
  try {
    const h = new URL(url).hostname;
    if (ALLOWED_HOSTS.some(a => h === a || h.endsWith('.' + a))) return true;
    // The configured data proxy is also allowed (it does its own allowlisting).
    if (_proxyBase) { try { return h === new URL(_proxyBase).hostname; } catch { /* ignore */ } }
    return false;
  } catch {
    return false;
  }
}

// Real fetch with an abort timeout so a slow/hanging host can never block forever.
async function timedFetch(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/*
 * Allowlist-enforced fetch handed to model-written components (so a card that
 * fetches live data in useEffect works) — but it can only reach the read-only
 * public allowlist, and key storage stays shadowed, so it can't be used to
 * exfiltrate secrets. Returns the real Response so `.json()` etc. work.
 */
export async function safeFetch(url, opts = {}) {
  if (typeof url !== 'string' || !hostAllowed(url)) {
    let host = url;
    try { host = new URL(url).hostname; } catch { /* keep raw */ }
    throw new Error(`fetch blocked: ${host} is not in the Agntdash data allowlist`);
  }
  return timedFetch(url, opts);
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
      const res = await timedFetch(url, { headers: { Accept: 'application/json' } });
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

/*
 * PROVIDER REGISTRY
 *
 * Named data providers the agent selects (instead of guessing URLs). Each one
 * builds a URL from typed params and declares a default JSON path + refresh. The
 * agent binds with { key, provider, params, refreshSec }; the host resolves it.
 * Raw { key, url, path } bindings still work for power cases. `viaProxy` providers
 * (stocks/news/images) only resolve when a proxy base is configured (Task 3).
 */
const enc = encodeURIComponent;
const first = (csv) => String(csv || '').split(',')[0].trim();

export const PROVIDERS = {
  crypto_price: {
    desc: 'Current crypto price. params: id (coingecko id, e.g. bitcoin), vs (usd)',
    refreshSec: 60,
    build: p => `https://api.coingecko.com/api/v3/simple/price?ids=${enc(p.id||'bitcoin')}&vs_currencies=${enc(p.vs||'usd')}&include_24hr_change=true`,
    path: p => `${(p.id||'bitcoin')}`,
  },
  crypto_history: {
    desc: 'Crypto price history for a chart. params: id, vs (usd), days (e.g. 7, 30, 365). Returns { prices:[[ms,price]] } under your key',
    refreshSec: 300,
    build: p => `https://api.coingecko.com/api/v3/coins/${enc(p.id||'bitcoin')}/market_chart?vs_currency=${enc(p.vs||'usd')}&days=${enc(p.days||7)}`,
    path: null,
  },
  crypto_trending: {
    desc: 'Trending coins right now. no params. Returns array of { item:{name,symbol,...} }',
    refreshSec: 600,
    build: () => 'https://api.coingecko.com/api/v3/search/trending',
    path: 'coins',
  },
  fx_rate: {
    desc: 'Single FX pair as a number. params: from (USD), to (EUR)',
    refreshSec: 3600,
    build: p => `https://api.frankfurter.app/latest?from=${enc(p.from||'USD')}&to=${enc(first(p.to)||'EUR')}`,
    path: p => `rates.${first(p.to)||'EUR'}`,
  },
  fx_table: {
    desc: 'Many FX rates. params: from (USD), to (csv e.g. EUR,GBP,JPY). Returns { CUR: rate } under your key',
    refreshSec: 3600,
    build: p => `https://api.frankfurter.app/latest?from=${enc(p.from||'USD')}&to=${enc(p.to||'EUR,GBP,JPY')}`,
    path: 'rates',
  },
  fx_history: {
    desc: 'FX history for a line chart. params: from, to (single), start (YYYY-MM-DD). Returns { date: {CUR:rate} }',
    refreshSec: 86400,
    build: p => `https://api.frankfurter.app/${enc(p.start||'2024-01-01')}..?from=${enc(p.from||'USD')}&to=${enc(first(p.to)||'EUR')}`,
    path: 'rates',
  },
  geocode: {
    desc: 'Resolve a place name to coordinates. params: name. Returns array; use results[0].latitude/longitude',
    refreshSec: 0,
    build: p => `https://geocoding-api.open-meteo.com/v1/search?name=${enc(p.name||'London')}&count=1`,
    path: 'results',
  },
  weather: {
    desc: 'Current + 7-day weather. params: latitude, longitude (get from geocode). Rich current + daily fields',
    refreshSec: 1800,
    build: p => `https://api.open-meteo.com/v1/forecast?latitude=${enc(p.latitude||51.5)}&longitude=${enc(p.longitude||-0.12)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`,
    path: null,
  },
  air_quality: {
    desc: 'Air quality. params: latitude, longitude. Current us_aqi, pm2_5, pm10',
    refreshSec: 3600,
    build: p => `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${enc(p.latitude||51.5)}&longitude=${enc(p.longitude||-0.12)}&current=us_aqi,pm2_5,pm10&timezone=auto`,
    path: 'current',
  },
  hn_news: {
    desc: 'Tech/world news from Hacker News. params: query (topic), hits (count). Returns array of { title,url,points,author,created_at }',
    refreshSec: 600,
    build: p => `https://hn.algolia.com/api/v1/search_by_date?tags=story&query=${enc(p.query||'')}&hitsPerPage=${enc(p.hits||15)}`,
    path: 'hits',
  },
  github_trending: {
    desc: 'Trending GitHub repos. params: q (e.g. "stars:>10000 language:python"), per (count). Returns array of repos',
    refreshSec: 3600,
    build: p => `https://api.github.com/search/repositories?q=${enc(p.q||'stars:>20000')}&sort=stars&order=desc&per_page=${enc(p.per||12)}`,
    path: 'items',
  },
  github_repo: {
    desc: 'A GitHub repo\'s live stats. params: owner, repo. Returns { stargazers_count, forks_count, open_issues_count, ... }',
    refreshSec: 1800,
    build: p => `https://api.github.com/repos/${enc(p.owner||'facebook')}/${enc(p.repo||'react')}`,
    path: null,
  },
  world_bank: {
    desc: 'World Bank indicator (GDP, population, etc). params: country (ISO2/3, e.g. US), indicator (e.g. NY.GDP.MKTP.CD, SP.POP.TOTL). Returns time series array',
    refreshSec: 86400,
    build: p => `https://api.worldbank.org/v2/country/${enc(p.country||'US')}/indicator/${enc(p.indicator||'NY.GDP.MKTP.CD')}?format=json&per_page=60`,
    path: '1',
  },
  country: {
    desc: 'Country facts + flag. params: name. Returns object (use [0])',
    refreshSec: 0,
    build: p => `https://restcountries.com/v3.1/name/${enc(p.name||'Japan')}?fields=name,flags,population,capital,region,currencies,languages`,
    path: '0',
  },
  wiki_summary: {
    desc: 'Wikipedia summary + thumbnail image. params: title. Returns { extract, thumbnail:{source}, ... }',
    refreshSec: 0,
    build: p => `https://en.wikipedia.org/api/rest_v1/page/summary/${enc(p.title||'Bitcoin')}`,
    path: null,
  },
};

// A compact, always-in-sync catalog injected into the agent prompt.
export const PROVIDER_CATALOG = Object.entries(PROVIDERS)
  .map(([id, p]) => `- ${id}: ${p.desc}`).join('\n');

// Resolve a binding (provider or raw url) into { url, path, refreshSec }.
function resolveBindingSpec(b) {
  if (b.url) return { url: b.url, path: b.path, refreshSec: b.refreshSec };
  const p = PROVIDERS[b.provider];
  if (!p) return { error: `unknown provider "${b.provider}"` };
  if (p.viaProxy && !getProxyBase()) return { error: `provider "${b.provider}" needs a data proxy (not configured)` };
  let url;
  try { url = p.build(b.params || {}); } catch (e) { return { error: `bad params for ${b.provider}: ${e.message}` }; }
  if (p.viaProxy) url = `${getProxyBase().replace(/\/$/, '')}/fetch?url=${enc(url)}`;
  const path = b.path != null ? b.path : (typeof p.path === 'function' ? p.path(b.params || {}) : p.path);
  return { url, path, refreshSec: b.refreshSec != null ? b.refreshSec : p.refreshSec };
}

// Optional data-proxy base (Task 3). Set via setProxyBase(); used for viaProxy providers.
let _proxyBase = '';
export function setProxyBase(url) { _proxyBase = url || ''; }
export function getProxyBase() { return _proxyBase; }

// Resolve all bindings into a plain { key: value } object. Per-binding failures are
// captured as { __error } so one bad source never breaks the whole card.
export async function resolveBindings(bindings = []) {
  const data = {};
  if (!Array.isArray(bindings) || !bindings.length) return data;
  await Promise.all(bindings.map(async (b) => {
    if (!b || !b.key) return;
    const spec = resolveBindingSpec(b);
    if (spec.error) { data[b.key] = { __error: spec.error }; return; }
    const ttl = Math.max(5000, ((spec.refreshSec || 60) * 1000) / 2);
    try {
      const json = await fetchURL(spec.url, ttl);
      data[b.key] = getPath(json, spec.path);
    } catch (err) {
      data[b.key] = { __error: err.message };
    }
  }));
  return data;
}

// Smallest positive refreshSec across bindings (provider defaults included).
export function bindingsRefreshInterval(bindings = []) {
  const secs = (bindings || []).map(b => {
    if (b?.refreshSec != null) return b.refreshSec;
    const p = b?.provider && PROVIDERS[b.provider];
    return p ? p.refreshSec : 0;
  }).filter(s => Number.isFinite(s) && s > 0);
  return secs.length ? Math.max(15, Math.min(...secs)) : 0;
}
