/*
 * Spec cache (zero-LLM tier #2).
 *
 * The instant tier handles known templates; this handles everything else by
 * remembering the spec the router produced for a given prompt. A repeat (or
 * lightly reworded) request then renders with no model call — we just refetch the
 * card's live bindings. Specs are tiny JSON, so the whole cache lives in
 * localStorage and survives reloads.
 */
const KEY = 'agntdash_spec_cache_v1';
const MAX = 200;
const TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

let mem = null;
function load() {
  if (mem) return mem;
  try { mem = JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { mem = {}; }
  return mem;
}
function persist() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* quota/private mode */ } }

export function getCachedSpec(prompt) {
  const m = load();
  const e = m[norm(prompt)];
  if (!e) return null;
  if (Date.now() - (e.ts || 0) > TTL_MS) { delete m[norm(prompt)]; persist(); return null; }
  return e.spec || null;
}

export function setCachedSpec(prompt, spec) {
  if (!spec || !prompt) return;
  const m = load();
  m[norm(prompt)] = { spec, ts: Date.now() };
  const keys = Object.keys(m);
  if (keys.length > MAX) {
    keys.sort((a, b) => (m[a].ts || 0) - (m[b].ts || 0)).slice(0, keys.length - MAX).forEach(k => delete m[k]);
  }
  persist();
}

export function clearSpecCache() { mem = {}; persist(); }
