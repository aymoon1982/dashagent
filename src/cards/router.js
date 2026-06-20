import { CARD_CATALOG, CARD_TYPE_IDS, CARD_TYPES, validateProps } from './registry.js';
import { ADAPTERS } from './adapters.js';
import { TEMPLATES } from './templates.js';
import { PROVIDER_CATALOG, ALLOWED_HOSTS } from '../dataLayer.js';

/*
 * Router — turns a prompt into a declarative card SPEC in ONE structured call,
 * replacing the old multi-stage codegen pipeline. The model never writes code;
 * it selects a catalog type, supplies/maps props, and (for live data) names a
 * provider binding + adapter. The output is small and schema-checked, which is
 * what makes the new path fast and reliable.
 */

const ADAPTER_IDS = Object.keys(ADAPTERS);

export const SPEC_SYSTEM_PROMPT = `You are a dashboard card designer. Given a user request, choose the SINGLE best card type from the catalog and return a spec that renders it. You do NOT write code — you fill a JSON spec; the host renders a pre-built, beautiful component.

CRITICAL: Respond with ONLY one raw JSON object. Start with { and end with }. No markdown, no prose.

## Output schema
{
  "type": "<one of the catalog types>",
  "title": "Concise title (3-6 words)",
  "cols": 1-12, "rows": 1-8,
  "chrome": "full" | "minimal" | "none",
  "bleed": false,
  "accent": "#hex",
  "dataBindings": [ { "key": "x", "provider": "<provider id>", "params": { } } ],
  "adapter": "<adapter id or omit>",
  "source": "<the dataBindings key the adapter reads, if using one>",
  "props": { /* type-specific, see catalog; for STATIC cards put the data here */ }
}

## Card catalog (pick exactly one "type")
${CARD_CATALOG}

## Data
- LIVE data: add dataBindings using a provider below, then set "adapter" + "source" so the host shapes it into props. Available adapters: ${ADAPTER_IDS.join(', ')}.
- STATIC data (knowledge, conversions, checklists, sample/illustrative): put it directly in "props", no bindings.
- Providers:
${PROVIDER_CATALOG}
- Allowlisted hosts for raw bindings: ${ALLOWED_HOSTS.join(', ')}.

## Rules
1. "type" MUST be one of: ${CARD_TYPE_IDS.join(', ')}.
2. Prefer LIVE (provider + adapter) for prices, weather, FX, news, indicators. Use STATIC props for personal/work data, conversions, countdowns, checklists.
3. Match adapter to provider: crypto_price↔crypto_price provider, crypto_history↔crypto_history, fx_table↔fx_table, fx_history↔fx_history, weather↔weather, news_list↔hn_news/news, worldbank_series↔world_bank, stock_history/stock_quote↔stock_* (need proxy).
4. Size to content: a single number ~3x2, a chart ~7x3, a wide table/feed ~6x4.
5. For images use type "image" with chrome:"none", bleed:true.
6. Never invent precise live numbers in props — use a provider, or clearly-labeled "(sample)" data.
7. Keep props minimal and valid for the chosen type.
8. Use "composite" only when one type truly isn't enough (e.g. a headline number AND its trend). Prefer a single type otherwise.

## Examples
Request: "bitcoin price this week as a chart"
{"type":"area_chart","title":"Bitcoin · 7 Days","cols":7,"rows":3,"accent":"#f59e0b","dataBindings":[{"key":"btc","provider":"crypto_history","params":{"id":"bitcoin","vs":"usd","days":7}}],"adapter":"crypto_history","source":"btc","props":{"yLabel":"BTC/USD"}}

Request: "convert 50 miles to km"
{"type":"converter","title":"Miles → Km","cols":4,"rows":2,"accent":"#06b6d4","props":{"factor":1.60934,"fromUnit":"mi","toUnit":"km","base":50}}

Request: "my crypto portfolio: 50% btc 30% eth 20% sol"
{"type":"pie_chart","title":"Crypto Allocation","cols":5,"rows":3,"accent":"#a855f7","props":{"donut":true,"slices":[{"label":"BTC","value":50},{"label":"ETH","value":30},{"label":"SOL","value":20}]}}

Request: "bitcoin overview" (number + trend → composite)
{"type":"composite","title":"Bitcoin Overview","cols":7,"rows":3,"accent":"#f59e0b","dataBindings":[{"key":"p","provider":"crypto_price","params":{"id":"bitcoin","vs":"usd"}},{"key":"h","provider":"crypto_history","params":{"id":"bitcoin","vs":"usd","days":30}}],"props":{"layout":"grid","children":[{"type":"kpi","adapter":"crypto_price","source":"p","title":"Price","props":{"label":"BTC/USD","vs":"usd","decimals":0}},{"type":"area_chart","adapter":"crypto_history","source":"h","title":"30 days","props":{"yLabel":"USD"}}]}}`;

/*
 * Dashboard mode: one structured call returns a COHERENT SET of card specs,
 * replacing the old planner(+N router calls) chain for broad prompts.
 */
export const DASHBOARD_SYSTEM_PROMPT = `${SPEC_SYSTEM_PROMPT}

## Dashboard mode (multiple cards in ONE response)
For a broad request ("set up my finance dashboard", "everything about Tokyo", "my morning briefing"), design a coherent SET of cards. Respond with ONLY:
{"theme":"short phrase","palette":["#hex","#hex","#hex"],"cards":[ <card spec>, ... ]}
Each entry of "cards" is a COMPLETE card spec exactly as defined above (type, title, cols, rows, accent, dataBindings, adapter, source, props). Rules:
- 1 to 6 cards. Prefer the FEWEST that fully answer the request; a focused request is exactly ONE card.
- No duplicate or overlapping cards. Give complementary sizes (mix one big focal card with smaller stat/list cards) so they tile well on a 12-col grid.
- Every card's "accent" comes from the shared "palette".`;

/* Parse a dashboard-mode response into normalized specs + shared palette/theme. */
export function parseDashboardResponse(raw, max = 6) {
  const list = Array.isArray(raw?.cards) ? raw.cards : (raw && raw.type ? [raw] : []);
  const specs = list
    .map(s => normalizeSpec(s))
    .filter(n => n.spec)
    .map(n => n.spec)
    .slice(0, Math.max(1, Math.min(8, max)));
  const palette = Array.isArray(raw?.palette) ? raw.palette.filter(p => typeof p === 'string').slice(0, 6) : [];
  return { specs, palette, theme: (raw?.theme || '').toString().slice(0, 120) };
}

/* Build the per-card user message, optionally with web-search context + plan. */
export function buildSpecUserMessage(promptText, { searchContext = '', planContext = '' } = {}) {
  let msg = `User request: ${promptText}`;
  if (searchContext) msg += `\n\nLive search results (use as data where relevant):\n${searchContext}`;
  if (planContext) msg += planContext;
  return msg;
}

/* Normalize + lightly validate a raw spec object from the model. */
export function normalizeSpec(raw) {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'no spec object', spec: null };
  const type = raw.type;
  if (!CARD_TYPES[type]) return { ok: false, error: `unknown or missing type "${type}"`, spec: null };

  const clampInt = (n, lo, hi, d) => { const v = Math.round(Number(n)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
  const bindings = Array.isArray(raw.dataBindings)
    ? raw.dataBindings.filter(b => b && b.key && (b.provider || b.url)).slice(0, 6)
    : [];

  const spec = {
    type,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Card',
    cols: clampInt(raw.cols, 1, 12, 6),
    rows: clampInt(raw.rows, 1, 8, 2),
    chrome: ['full', 'minimal', 'none'].includes(raw.chrome) ? raw.chrome : 'full',
    bleed: !!raw.bleed,
    accent: typeof raw.accent === 'string' ? raw.accent : undefined,
    dataBindings: bindings,
    adapter: ADAPTERS[raw.adapter] ? raw.adapter : undefined,
    source: typeof raw.source === 'string' ? raw.source : (bindings[0]?.key),
    props: raw.props && typeof raw.props === 'object' ? raw.props : {},
  };

  // Best-effort props validation (non-fatal: components are defensive, and an
  // adapter may fill props from live data the model didn't inline).
  const v = validateProps(type, spec.props);
  return { ok: true, error: v.ok ? null : v.error, spec };
}

/*
 * Instant template matcher (zero-LLM tier). Tokenizes the prompt and scores each
 * template by keyword overlap, tolerant of filler words ("weather IN london") and
 * punctuation ("to-do"). Returns the best match above a confidence floor, else
 * null (which sends the prompt to the LLM router).
 */
const STOPWORDS = new Set(['the', 'a', 'an', 'my', 'our', 'this', 'that', 'of', 'for', 'in', 'on', 'to', 'me', 'show', 'please', 'now', 'get', 'see', 'is', 'are', 'and', 'with', 'as']);
const MATCH_THRESHOLD = 2.5;

// Lowercase, drop hyphens (to-do → todo), turn other punctuation into spaces.
function tokenize(s) {
  return String(s || '').toLowerCase().replace(/['-]/g, '').replace(/[^a-z0-9%]+/g, ' ').split(' ').filter(Boolean);
}

export function matchTemplate(promptText) {
  const toks = tokenize(promptText);
  if (!toks.length) return null;
  const tokSet = new Set(toks);
  const phrase = ` ${toks.join(' ')} `;

  let best = null, bestScore = 0;
  for (const tpl of TEMPLATES) {
    let score = 0;
    for (const kw of tpl.kw) {
      const kws = tokenize(kw);
      if (!kws.length) continue;
      if (kws.length > 1) {
        if (phrase.includes(` ${kws.join(' ')} `)) { score += 4; continue; } // exact phrase
        const hit = kws.filter(w => tokSet.has(w)).length;
        const hasSignal = kws.some(w => !STOPWORDS.has(w) && w.length >= 3);
        if (hit === kws.length && hasSignal) score += 3;            // all words present, in any order
        else if (hit >= 2 && hasSignal) score += (1.2 * hit) / kws.length; // partial
      } else if (tokSet.has(kws[0]) && !STOPWORDS.has(kws[0])) {
        score += 2.5; // a single distinctive keyword
      }
    }
    if (tokSet.has(tpl.category.toLowerCase())) score += 0.5;
    if (score > bestScore) { bestScore = score; best = tpl; }
  }
  return bestScore >= MATCH_THRESHOLD ? best : null;
}
