import { useState, useEffect, useRef } from 'react';
import { AppHeader, SettingsDrawer, PipelineView } from './UI.jsx';
import { DashboardView } from './Dashboard.jsx';
import { resolveBindings, bindingsRefreshInterval, ALLOWED_HOSTS, PROVIDER_CATALOG, setProxyBase } from './dataLayer.js';
import { SPEC_SYSTEM_PROMPT, DASHBOARD_SYSTEM_PROMPT, parseDashboardResponse, buildSpecUserMessage, normalizeSpec, matchTemplate, instantiateTemplate, getCachedSpec, setCachedSpec } from './cards/index.js';
import { setActionDispatcher } from './actions.js';

/* ─── CONSTANTS ─── */
const DEFAULT_MODELS_FAST = ['google/gemini-2.5-flash','deepseek/deepseek-chat','meta-llama/llama-3.3-70b-instruct:free','openai/gpt-4o-mini','anthropic/claude-3-haiku'];
const DEFAULT_MODELS_SMART = ['deepseek/deepseek-chat','anthropic/claude-3.5-sonnet','google/gemini-2.5-pro','openai/gpt-4o'];
const ACCENT_COLORS = ['#6366f1','#a855f7','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4'];

const SAMPLE_PROMPTS = [
  { text:'Show me Bitcoin price this week', icon:'trending_up' },
  { text:'Weather in London, Paris and Tokyo', icon:'cloud' },
  { text:'Top tech news this morning', icon:'newspaper' },
  { text:'My daily workout checklist', icon:'checklist' },
  { text:'Convert 120 miles to kilometers', icon:'sync_alt' },
  { text:'Countdown to New Year 2027', icon:'timer' },
  { text:'Portfolio: 50% BTC, 30% ETH, 20% SOL', icon:'pie_chart' },
];

const DEFAULT_WORKFLOW_CONFIG = {
  enableAutocomplete: true, clearOnSubmit: true, plannerTemp: 0.3,
  tavilyDepth: 'basic', densePacking: true, gridSnapUnit: 8,
  userSystemPrompt: '',
  orchestrate: true, maxCards: 6, autoFitHeight: true, inboxSync: true,
};

const DEFAULT_CARDS = [];

const DEFAULT_GROUPS = [
  { name:'Finance', color:'#10b981', collapsed:false },
  { name:'Personal', color:'#6366f1', collapsed:false },
  { name:'Work', color:'#a855f7', collapsed:false },
];

/* ─── FIXED SYSTEM PROMPT ─── */
export const FIXED_SYSTEM_PROMPT = `You are an autonomous dashboard card agent for Agntdash. You decide everything about a card: what data it needs, whether that data is static or live, how big it should be, which visualization best represents it, and you write the React component that renders it. There is NO fixed card design — you invent the right one for each request.

CRITICAL OUTPUT RULE: Respond with ONLY a single raw JSON object. No markdown fences, no preamble, no explanation. Your entire response must start with { and end with }.

## Your Mission (in order)

1. UNDERSTAND — Parse the intent. Identify the exact data needed and the single best way to represent it (chart, table, list, KPI, map, gauge, image, timeline, gallery, interactive widget…). Pick the representation that fits the data, not a template.

2. DECIDE STATIC vs LIVE — If the answer changes over time (prices, weather, FX, news, scores), make it LIVE: fetch real data at render time (see Live Data). If it is stable (conversions, knowledge, checklists, countdowns computed locally), make it static and embed the data.

3. SIZE YOURSELF — Choose cols (1–12 grid columns) and rows (1–8 row units, each ~82px tall) that fit the content. A single number needs ~3×1; a rich chart needs ~8×3; a wide table or multi-series panel can be 12×4. The host also auto-fits height to content, so err slightly small rather than large.

4. CHOOSE YOUR FRAME — You control the card chrome, not just the inside. Pick "chrome" and "bleed" so the frame fits the content (see Frame).

5. DESIGN & CODE — Write a self-contained React component in JSX. Make it genuinely beautiful and information-dense.

## Output Format (JSON only)

{
  "title": "Concise card title (3-6 words)",
  "cols": 6,
  "rows": 2,
  "chrome": "full",
  "bleed": false,
  "dataSource": "Where the data comes from (API name, 'live', or 'AI knowledge')",
  "dataBindings": [],
  "data": {},
  "renderSpec": { "color": "#hex accent color", "summary": "One-sentence insight or status" },
  "renderCode": "function CardRenderer({ data, renderSpec }) { return (<div>…</div>); }"
}

- cols: integer 1–12. rows: integer 1–8. Size to the content.

## Frame (chrome + bleed)

- chrome: "full" → title bar + footer + accent (default; good for charts, tables, KPIs with a label). "minimal" → no footer, slim header, hover menu (good for dense single-purpose cards). "none" → no chrome at all, content owns the whole card (REQUIRED for full-bleed photos, maps, hero visuals).
- bleed: true → content reaches the card edges with no padding (use for photos, maps, edge-to-edge gradients/visuals). Usually pair bleed:true with chrome:"none".

## Data: static vs live (IMPORTANT — read carefully)

You have TWO ways to get live data. Prefer PROVIDER BINDINGS — they are tested, cached, and auto-refreshed.

A) PROVIDER BINDINGS (preferred): add entries to \`dataBindings\`. Each:
   { "key": "<name>", "provider": "<provider id>", "params": { ... }, "refreshSec": <optional override> }
The host calls the provider, fetches it, and sets \`data[key]\` to the result. On failure \`data[key]\` is \`{ __error: "..." }\` — always handle that.

Available providers (pick the right one and fill params):
${PROVIDER_CATALOG}

Notes: weather needs latitude/longitude — add a \`geocode\` binding for the place, then read \`data.<geocodeKey>[0].latitude/longitude\`... OR just bind \`weather\` directly with known coords for a famous city. For multiple cities/coins/pairs, add one binding per item (e.g. key "london", "paris"). Read the provider's described shape from \`data[key]\`.

B) RAW BINDING (power use): \`{ "key", "url": "<allowlisted URL>", "path": "<dotted path>", "refreshSec" }\`. Allowlisted hosts only: ${ALLOWED_HOSTS.join(', ')}. You may also call the global \`fetch(url)\` (allowlisted + auto-timeout) inside useEffect for multi-step flows.

C) STATIC data (knowledge, conversions, checklists, generators): put it directly in \`data\`, no bindings.

For data with NO provider/allowlisted source (specific equities like AAPL, paywalled/local news, sports scores): use injected web-search results or your knowledge as a CLEARLY-LABELED snapshot in \`data\`, and say so in the summary. Do not invent precise numbers.

## renderCode Rules

1. Named exactly \`CardRenderer\`, takes \`{ data, renderSpec }\`.
2. WRITE JSX (<div>, <svg>, <img>, <table>…). It is transpiled for you. Do NOT hand-write React.createElement.
3. Hooks via \`React.useState/useEffect/useRef\` (\`React\` is in scope; no imports). \`fetch\` is available (allowlisted + auto-timeout) for option B. Storage/window/document are NOT available — keep components free of those.
   - PERSISTENCE: for ANY state the user should keep across reloads (checklist ticks, notes text, counters, toggles, selected tab), use \`useCardState(key, initial)\` instead of React.useState. Same API as useState ([value, setValue]) but it is saved with the card. Use plain React.useState only for ephemeral UI (hover, transient input).
   - ACTIONS (write): if the card needs to perform an action (e.g. add a task, send something), call \`runAction(actionId, payload)\` — it returns a Promise and the host ALWAYS asks the user to confirm first. Only use it for genuine write intents; it no-ops without a configured proxy.
4. No external libraries. Build charts with inline SVG. Images via <img src=…> are fine (e.g. flags, Wikimedia/Unsplash URLs returned in data).
5. Inline styles only (\`style={{ }}\`); you may use the CSS variables below.
6. Return ONE root element filling its container: root style \`{ height: '100%', display: 'flex', flexDirection: 'column' }\` (for bleed cards, also set margin/padding 0 and let media use width/height 100% with objectFit cover).
7. NEVER crash. Null-check every data access; handle missing/\`__error\` values.

Available CSS variables (dark theme): \`var(--fg)\`, \`var(--fg-muted)\`, \`var(--fg-dim)\`, \`var(--primary)\` (#6366f1), \`var(--success)\` (#10b981), \`var(--danger)\` (#ef4444), \`var(--warning)\` (#f59e0b), \`var(--border)\`, \`var(--fn)\` (font), \`var(--mo)\` (monospace).

## Data Integrity

Prefer live bindings and injected search results over memory. Never fabricate specific prices/statistics without a source — bind them live, use provided search data, or mark the figure approximate in the summary.

## Quality Bar

Visually rich (gradients, accents, inline SVG charts), information-dense, responsive to card size, interactive where it helps, and error-safe. Match the visualization to the data — a price needs a chart, a comparison a table, a status a KPI, a place a map/photo.`;

/* ─── APP ─── */
const ENV_SOURCES = {
  activeProvider: !!import.meta.env.VITE_ACTIVE_PROVIDER,
  openRouterKey:  !!import.meta.env.VITE_OPENROUTER_KEY,
  openAIKey:      !!import.meta.env.VITE_OPENAI_KEY,
  openAIBaseUrl:  !!import.meta.env.VITE_OPENAI_BASE_URL,
  openCodeKey:    !!import.meta.env.VITE_OPENCODE_KEY,
  openCodeBaseUrl:!!import.meta.env.VITE_OPENCODE_BASE_URL,
  tavilyKey:      !!import.meta.env.VITE_TAVILY_KEY,
  dataProxyUrl:   !!import.meta.env.VITE_DATA_PROXY_URL,
  modelFast:      !!import.meta.env.VITE_MODEL_FAST,
  modelSmart:     !!import.meta.env.VITE_MODEL_SMART,
};

const envOrStorage = (envVal, lsKey, def = '') =>
  envVal || localStorage.getItem(lsKey) || def;

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const load = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } };

  const [activeProvider, setActiveProvider] = useState(() => envOrStorage(import.meta.env.VITE_ACTIVE_PROVIDER, 'agntdash_active_provider', 'openrouter'));
  const [openRouterKey, setOpenRouterKey] = useState(() => envOrStorage(import.meta.env.VITE_OPENROUTER_KEY, 'agntdash_or_key'));
  const [openAIKey, setOpenAIKey] = useState(() => envOrStorage(import.meta.env.VITE_OPENAI_KEY, 'agntdash_openai_key'));
  const [openAIBaseUrl, setOpenAIBaseUrl] = useState(() => envOrStorage(import.meta.env.VITE_OPENAI_BASE_URL, 'agntdash_openai_base_url', 'https://api.openai.com/v1'));
  const [openCodeKey, setOpenCodeKey] = useState(() => envOrStorage(import.meta.env.VITE_OPENCODE_KEY, 'agntdash_opencode_key'));
  const [openCodeBaseUrl, setOpenCodeBaseUrl] = useState(() => envOrStorage(import.meta.env.VITE_OPENCODE_BASE_URL, 'agntdash_opencode_base_url', ''));
  const [tavilyKey, setTavilyKey] = useState(() => envOrStorage(import.meta.env.VITE_TAVILY_KEY, 'agntdash_tavily_key'));
  const [dataProxyUrl, setDataProxyUrl] = useState(() => envOrStorage(import.meta.env.VITE_DATA_PROXY_URL, 'agntdash_data_proxy_url'));

  // Per-provider model memory: each provider remembers its own fast/smart model so
  // switching providers doesn't leave a model id that doesn't exist on the new one.
  const [modelsByProvider, setModelsByProvider] = useState(() => load('agntdash_models_by_provider', {}));
  const initProv = envOrStorage(import.meta.env.VITE_ACTIVE_PROVIDER, 'agntdash_active_provider', 'openrouter');
  const initModels = (load('agntdash_models_by_provider', {})[initProv]) || {};
  const [modelFast, setModelFast] = useState(() => envOrStorage(import.meta.env.VITE_MODEL_FAST, 'agntdash_model_fast', initModels.fast || DEFAULT_MODELS_FAST[0]));
  const [modelSmart, setModelSmart] = useState(() => envOrStorage(import.meta.env.VITE_MODEL_SMART, 'agntdash_model_smart', initModels.smart || DEFAULT_MODELS_SMART[0]));

  const [cards, setCards] = useState(() => load('agntdash_cards_v4', DEFAULT_CARDS));
  const [groups, setGroups] = useState(() => load('agntdash_groups_v2', DEFAULT_GROUPS));
  const [templates, setTemplates] = useState(() => load('agntdash_templates_v1', []));
  const [workflowConfig, setWorkflowConfig] = useState(() => ({ ...DEFAULT_WORKFLOW_CONFIG, ...load('agntdash_workflow_config', {}) }));

  const [consolePrompt, setConsolePrompt] = useState('');
  const [isConsoleSubmitting, setIsConsoleSubmitting] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [editPromptValue, setEditPromptValue] = useState('');
  const [draggingCardId, setDraggingCardId] = useState(null);

  const resizeRef = useRef(null);
  const resizeMoveRef = useRef(null);
  const resizeUpRef = useRef(null);

  const isApiConnected = !!(
    (activeProvider === 'openrouter' && openRouterKey) ||
    (activeProvider === 'openai' && openAIKey) ||
    (activeProvider === 'opencode' && openCodeKey)
  );

  useEffect(() => { localStorage.setItem('agntdash_cards_v4', JSON.stringify(cards)); }, [cards]);
  useEffect(() => { localStorage.setItem('agntdash_groups_v2', JSON.stringify(groups)); }, [groups]);
  useEffect(() => { localStorage.setItem('agntdash_templates_v1', JSON.stringify(templates)); }, [templates]);
  useEffect(() => { localStorage.setItem('agntdash_models_by_provider', JSON.stringify(modelsByProvider)); }, [modelsByProvider]);
  useEffect(() => { setProxyBase(dataProxyUrl); }, [dataProxyUrl]);

  // Action tools: a generated card's runAction() routes here, always confirmed by
  // the user before the host POSTs it to the proxy's /actions endpoint.
  const [actionRequest, setActionRequest] = useState(null); // { id, payload, resolve, reject }
  useEffect(() => {
    setActionDispatcher((id, payload) => new Promise((resolve, reject) => setActionRequest({ id, payload, resolve, reject })));
    return () => setActionDispatcher(null);
  }, []);
  const confirmAction = async () => {
    const req = actionRequest; setActionRequest(null);
    if (!req) return;
    if (!dataProxyUrl) { req.reject(new Error('No data proxy configured.')); return; }
    try {
      const res = await fetch(`${dataProxyUrl.replace(/\/$/, '')}/actions/${encodeURIComponent(req.id)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.payload || {}),
      });
      req.resolve(await res.json());
    } catch (err) { req.reject(err); }
  };
  const cancelAction = () => { if (actionRequest) { actionRequest.reject(new Error('cancelled')); setActionRequest(null); } };
  useEffect(() => { localStorage.setItem('agntdash_workflow_config', JSON.stringify(workflowConfig)); }, [workflowConfig]);

  useEffect(() => {
    resizeMoveRef.current = (e) => {
      if (!resizeRef.current) return;
      const { cardId, startCols, startRows, startX, startY } = resizeRef.current;
      const newCols = Math.max(2, Math.min(12, startCols + Math.round((e.clientX - startX) / 100)));
      const newRows = Math.max(1, Math.min(8, startRows + Math.round((e.clientY - startY) / 140)));
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, cols: newCols, rows: newRows, sizeLocked: true } : c));
    };
    resizeUpRef.current = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', resizeMoveRef.current);
      document.removeEventListener('mouseup', resizeUpRef.current);
    };
  }, []);

  /* ─── SAVE SETTINGS ─── */
  const saveSettings = ({ activeProvider: ap, openRouterKey: or, openAIKey: oai, openAIBaseUrl: oaib, openCodeKey: oc, openCodeBaseUrl: ocb, tavilyKey: tv, dataProxyUrl: dp, modelFast: mf, modelSmart: ms }) => {
    setActiveProvider(ap); setOpenRouterKey(or); setOpenAIKey(oai); setOpenAIBaseUrl(oaib);
    setOpenCodeKey(oc); setOpenCodeBaseUrl(ocb); setTavilyKey(tv); setModelFast(mf); setModelSmart(ms);
    if (dp !== undefined) { setDataProxyUrl(dp); if (!ENV_SOURCES.dataProxyUrl) localStorage.setItem('agntdash_data_proxy_url', dp); }
    if (!ENV_SOURCES.activeProvider)  localStorage.setItem('agntdash_active_provider', ap);
    if (!ENV_SOURCES.openRouterKey)   localStorage.setItem('agntdash_or_key', or);
    if (!ENV_SOURCES.openAIKey)       localStorage.setItem('agntdash_openai_key', oai);
    if (!ENV_SOURCES.openAIBaseUrl)   localStorage.setItem('agntdash_openai_base_url', oaib);
    if (!ENV_SOURCES.openCodeKey)     localStorage.setItem('agntdash_opencode_key', oc);
    if (!ENV_SOURCES.openCodeBaseUrl) localStorage.setItem('agntdash_opencode_base_url', ocb);
    if (!ENV_SOURCES.tavilyKey)       localStorage.setItem('agntdash_tavily_key', tv);
    if (!ENV_SOURCES.modelFast)       localStorage.setItem('agntdash_model_fast', mf);
    if (!ENV_SOURCES.modelSmart)      localStorage.setItem('agntdash_model_smart', ms);
    setModelsByProvider(prev => ({ ...prev, [ap]: { fast: mf, smart: ms } }));
    setIsSettingsOpen(false);
  };

  /* ─── JSON EXTRACTION (robust, model-agnostic) ─── */
  const extractJSON = (text) => {
    if (!text) throw new Error('Empty response from model — the API returned no content. Try again or switch models.');
    // 1. Direct parse
    try { return JSON.parse(text); } catch (_) {}
    // 2. Strip markdown fences then retry
    const stripped = text.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/m, '').trim();
    try { return JSON.parse(stripped); } catch (_) {}
    // 3. Find outermost {...} block
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {}
    }
    const preview = text.slice(0, 120).replace(/\n/g, ' ');
    throw new Error(`Model returned non-JSON. Got: "${preview}…" — Try a different smart model or lower temperature.`);
  };

  /* ─── PROVIDER HELPERS ─── */
  const getProviderConn = () => {
    const key = activeProvider==='openrouter' ? openRouterKey : activeProvider==='openai' ? openAIKey : openCodeKey;
    const base = activeProvider==='openrouter' ? 'https://openrouter.ai/api/v1' : activeProvider==='openai' ? openAIBaseUrl : openCodeBaseUrl;
    return { key, base };
  };

  const callLLM = (model, messages, temp = 0.3, maxTokens = 8000) => {
    const { key, base } = getProviderConn();
    const headers = { 'Content-Type':'application/json', 'Authorization':`Bearer ${key}` };
    if (activeProvider === 'openrouter') {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'Agntdash';
    }
    return fetch(`${base}/chat/completions`, {
      method: 'POST', headers,
      body: JSON.stringify({ model, messages, temperature: temp, max_tokens: maxTokens })
    });
  };

  /* ─── STAGE 0: DASHBOARD PLANNER (one prompt → a coordinated set of cards) ─── */
  // Returns { cards:[{prompt,group,title,size}], plan:{theme,palette,note} }. The
  // plan is shared design context passed into every card so the set is coherent
  // (shared palette, complementary sizes) instead of N unrelated boxes.
  const runDashboardPlanner = async (promptText) => {
    const single = { cards: [{ prompt: promptText, group: null, title: null, size: null }], plan: null };
    if (!workflowConfig.orchestrate) return single;
    const max = Math.max(1, Math.min(12, workflowConfig.maxCards || 6));
    try {
      const res = await callLLM(modelFast, [
        { role:'system', content:`You are a dashboard architect. Given a user request, design a COHERENT set of cards that together answer it. A focused request ("Bitcoin price this week") is ONE card. A broad request ("set up my finance dashboard", "everything about Tokyo", "my morning briefing") becomes SEVERAL complementary cards that share a visual language and don't overlap. Respond with ONLY JSON (no markdown):
{"theme":"one phrase describing the dashboard","palette":["#hex","#hex","#hex"],"cards":[{"prompt":"self-contained prompt for one card, including the representation you intend (e.g. 'as a line chart')","group":"Finance|Personal|Work or a short new group name","title":"3-5 word label","size":"hint like '4x2' or '12x3'"}]}
Rules: 1–${max} cards. Prefer 1 unless the request clearly spans distinct data/visuals. Give complementary sizes (mix big focal cards with small stat cards) so they tile well. No duplicate cards. The palette is a shared accent set every card should draw from.` },
        { role:'user', content: promptText }
      ], 0.2, 1800);
      if (!res.ok) return single;
      const j = await res.json();
      const parsed = extractJSON(j.choices?.[0]?.message?.content || '');
      const list = Array.isArray(parsed.cards) ? parsed.cards : [];
      const cleaned = list
        .filter(c => c && typeof c.prompt === 'string' && c.prompt.trim())
        .slice(0, max)
        .map(c => ({ prompt: c.prompt.trim(), group: (c.group || '').trim() || null, title: (c.title || '').trim() || null, size: (c.size || '').trim() || null }));
      if (!cleaned.length) return single;
      const palette = Array.isArray(parsed.palette) ? parsed.palette.filter(p => typeof p === 'string').slice(0, 5) : [];
      const plan = { theme: (parsed.theme || '').toString().slice(0, 120), palette, cards: cleaned };
      return { cards: cleaned, plan: cleaned.length > 1 ? plan : null };
    } catch (e) {
      console.warn('Planner failed, falling back to single card:', e.message);
      return single;
    }
  };

  // Build a short shared-context block injected into each card's generation so the
  // set coheres (shared palette + awareness of sibling cards).
  const buildPlanContext = (plan, selfPrompt) => {
    if (!plan) return '';
    const siblings = (plan.cards || []).filter(c => c.prompt !== selfPrompt).map(c => `• ${c.title || c.prompt}`).join('\n');
    const palette = plan.palette?.length ? `Shared accent palette (use these): ${plan.palette.join(', ')}.` : '';
    return `\n\nDASHBOARD CONTEXT — this card is part of a coordinated dashboard${plan.theme ? ` ("${plan.theme}")` : ''}. ${palette}\nOther cards in this dashboard (do NOT duplicate them):\n${siblings || '• (none)'}\nKeep a consistent visual language with them.`;
  };

  /* ─── AGENT PIPELINE (per-card) ─── */
  // refine: optional { instruction, prior } — when set, this is a stateful EDIT of
  // an existing card (the model sees the prior card JSON and tweaks it) rather than
  // a cold regeneration, so "make it bigger" / "add ETH" work incrementally.
  const runAgentPipeline = async (promptText, existingCardId = null, forcedGroup = null, planContext = '', refine = null) => {
    const { key } = getProviderConn();
    const getGroup = () => forcedGroup || (existingCardId ? (cards.find(c=>c.id===existingCardId)?.group || 'Personal') : 'Personal');
    const llm = (model, messages, temp = 0.3, maxTokens = 8000) => callLLM(model, messages, temp, maxTokens);

    // Instant tier (zero LLM): a recognized common request maps straight to a
    // predefined card from the library. We still resolve its live bindings here.
    if (!refine) {
      const tpl = matchTemplate(promptText);
      if (tpl) {
        const card = instantiateTemplate(tpl, existingCardId || undefined);
        const prev = existingCardId ? cards.find(c=>c.id===existingCardId) : null;
        let liveData = {};
        if (card.dataBindings.length) {
          try { liveData = await resolveBindings(card.dataBindings); }
          catch (e) { console.warn('[Agntdash] template binding resolve failed:', e.message); }
        }
        return {
          ...card,
          group: getGroup(),
          refreshInterval: bindingsRefreshInterval(card.dataBindings),
          sizeLocked: prev?.sizeLocked || false,
          state: prev?.state || {},
          data: { ...(card.data || {}), ...liveData },
          lastFetched: new Date().toISOString(),
          loading: false, error: null,
        };
      }
    }

    // Spec cache (zero LLM): a previously generated prompt reuses its spec; only
    // its live bindings are refetched so the card is fresh without a model call.
    if (!refine) {
      const cached = getCachedSpec(promptText);
      if (cached && cached.type) {
        const prev = existingCardId ? cards.find(c=>c.id===existingCardId) : null;
        const dataBindings = cached.dataBindings || [];
        let liveData = {};
        if (dataBindings.length) {
          try { liveData = await resolveBindings(dataBindings); }
          catch (e) { console.warn('[Agntdash] cached binding resolve failed:', e.message); }
        }
        return {
          id: existingCardId || Math.random().toString(36).slice(2,9),
          prompt: promptText, title: cached.title || 'AI Card', spec: cached,
          chrome: cached.chrome || 'full', bleed: !!cached.bleed,
          dataSource: dataBindings.length ? 'Live API' : 'Cached',
          refreshInterval: bindingsRefreshInterval(dataBindings),
          live: dataBindings.length > 0, dataBindings, group: getGroup(),
          cols: cached.cols || 6, rows: cached.rows || 2,
          sizeLocked: prev?.sizeLocked || false, state: prev?.state || {},
          data: { ...(cached.props?.data && typeof cached.props.data === 'object' ? cached.props.data : {}), ...liveData },
          renderSpec: { color: cached.accent, summary: '' }, renderCode: null,
          lastFetched: new Date().toISOString(), loading: false, error: null,
        };
      }
    }

    if (!key) throw new Error('No API key configured. Open Settings to connect an LLM provider.');

    // Stage 1: Intent analysis — does this prompt need live web search? (skipped on refine)
    let intent = { needs_search: false, search_query: promptText };
    if (!refine) try {
      const ir = await llm(modelFast, [
        { role:'system', content:'You analyze dashboard prompts. Respond with ONLY a JSON object (no markdown): {"needs_search":true/false,"search_query":"concise search query"}. needs_search=true for: live prices, today\'s news, current weather, sports scores, recent exchange rates, any real-time data. needs_search=false for: math, conversions, countdowns, static checklists, general knowledge charts.' },
        { role:'user', content: promptText }
      ], 0.1);
      if (ir.ok) {
        const ij = await ir.json();
        const content = ij.choices?.[0]?.message?.content || '';
        const parsed = extractJSON(content);
        intent = { needs_search: !!parsed.needs_search, search_query: parsed.search_query || promptText };
      } else {
        throw new Error(`Stage 1 API error: ${ir.status}`);
      }
    } catch (e) {
      console.warn('Intent analysis failed, using keyword fallback:', e.message);
      const lc = promptText.toLowerCase();
      intent.needs_search = /\b(news|today|current|latest|live|price|rate|exchange|weather|score|stock|forecast|breaking|update|now|recent|this week|this month|chart|history|historical)\b/.test(lc);
    }

    // Stage 2: Conditional Tavily web search
    let searchContext = '';
    let searchUsed = false;
    if (intent.needs_search && tavilyKey) {
      try {
        const tr = await fetch('https://api.tavily.com/search', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ api_key: tavilyKey, query: intent.search_query, search_depth: workflowConfig.tavilyDepth||'basic', max_results:5 })
        });
        if (tr.ok) {
          const tj = await tr.json();
          if (tj.results?.length) {
            searchContext = tj.results.map(r=>`Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`).join('\n\n');
            searchUsed = true;
          }
        }
      } catch (e) { console.warn('Tavily search failed:', e); }
    }

    // Stage 3: SPEC generation (smart model). The model picks ONE catalog card
    // type and fills props (or names a provider binding + adapter for live data).
    // It writes NO code — the host renders a pre-built, tested component. Output is
    // small and schema-validated, so this path is fast and rarely fails. There is
    // no in-browser transpilation or eval anymore.
    const userPref = workflowConfig.userSystemPrompt?.trim();
    const sysContent = SPEC_SYSTEM_PROMPT + (userPref ? `\n\n---\n## User Preferences\n${userPref}` : '');
    const userMsg = buildSpecUserMessage(promptText, { searchContext, planContext });

    const callSpec = async (messages) => {
      const res = await llm(modelSmart, messages, workflowConfig.plannerTemp || 0.3, 1500);
      if (!res.ok) {
        let detail = res.statusText;
        try {
          const errJson = await res.json();
          detail = errJson.error?.message || errJson.message || JSON.stringify(errJson).slice(0, 200);
        } catch (_) {
          detail = (await res.text().catch(() => '')).slice(0, 200) || res.statusText;
        }
        throw new Error(`[Router / ${modelSmart}] HTTP ${res.status}: ${detail}`);
      }
      const raw = await res.json();
      const content = raw.choices?.[0]?.message?.content;
      if (!content) throw new Error(`[Router / ${modelSmart}] Model returned an empty response. Try a different prompt or model.`);
      return extractJSON(content);
    };

    const baseMessages = refine
      ? [
          { role:'system', content: sysContent },
          { role:'user', content: `Existing card spec for the request: ${promptText}` },
          { role:'assistant', content: JSON.stringify(refine.prior?.spec || refine.prior || {}) },
          { role:'user', content: `Modify this card spec per the instruction and return the COMPLETE updated JSON spec (same schema). Keep everything that still applies; change only what the instruction asks.\n\nInstruction: ${refine.instruction}` },
        ]
      : [{ role:'system', content: sysContent }, { role:'user', content: userMsg }];

    let norm = normalizeSpec(await callSpec(baseMessages));
    // One cheap repair round-trip only if the type itself was invalid/missing.
    if (!norm.spec) {
      try {
        norm = normalizeSpec(await callSpec([
          ...baseMessages,
          { role:'user', content: `That was not a valid spec (${norm.error}). Return ONE JSON spec whose "type" is exactly one of the catalog card types, with valid props.` },
        ]));
      } catch (e) { console.warn('[Agntdash] spec repair failed:', e.message); }
    }
    if (!norm.spec) throw new Error(`Router returned no valid card spec: ${norm.error}`);
    const spec = norm.spec;
    // Remember it so a repeat prompt skips the LLM next time (data still refetched).
    if (!refine && !searchUsed) setCachedSpec(promptText, spec);

    // Data: host resolves the spec's declarative bindings; adapters shape the
    // result into component props at render time (see SpecCard).
    const dataBindings = spec.dataBindings || [];
    const refreshInterval = bindingsRefreshInterval(dataBindings);
    let liveData = {};
    if (dataBindings.length) {
      try { liveData = await resolveBindings(dataBindings); }
      catch (e) { console.warn('[Agntdash] binding resolve failed:', e.message); }
    }

    const prevCard = existingCardId ? cards.find(c=>c.id===existingCardId) : null;
    return {
      id: existingCardId || Math.random().toString(36).slice(2,9),
      prompt: promptText,
      title: spec.title || 'AI Card',
      spec,
      chrome: spec.chrome, bleed: spec.bleed,
      dataSource: searchUsed ? 'Tavily · Web Search' : (dataBindings.length ? 'Live API' : 'AI'),
      refreshInterval,
      live: dataBindings.length > 0,
      dataBindings,
      group: getGroup(),
      cols: spec.cols, rows: spec.rows,
      sizeLocked: prevCard?.sizeLocked || false,
      state: prevCard?.state || {},
      data: { ...(spec.props?.data && typeof spec.props.data === 'object' ? spec.props.data : {}), ...liveData },
      renderSpec: { color: spec.accent, summary: '' },
      renderCode: null,
      lastFetched: new Date().toISOString(),
      loading: false, error: null,
    };
  };

  /* ─── ensure a group exists, creating it on demand (dashboard self-arranges) ─── */
  const ensureGroup = (name) => {
    if (!name) return;
    setGroups(prev => prev.some(g => g.name.toLowerCase() === name.toLowerCase())
      ? prev
      : [...prev, { name, color: ACCENT_COLORS[prev.length % ACCENT_COLORS.length], collapsed: false }]);
  };

  /* Turn one spec into a live card (resolving its bindings). Used by the one-shot
   * dashboard path; the per-card pipeline builds its own card object. */
  const cardFromSpec = async (spec, group, promptText = '', palette = []) => {
    const dataBindings = spec.dataBindings || [];
    let liveData = {};
    if (dataBindings.length) {
      try { liveData = await resolveBindings(dataBindings); }
      catch (e) { console.warn('[Agntdash] binding resolve failed:', e.message); }
    }
    const accent = spec.accent || palette[0];
    return {
      id: Math.random().toString(36).slice(2,9),
      prompt: promptText, title: spec.title || 'AI Card', spec: { ...spec, accent },
      chrome: spec.chrome || 'full', bleed: !!spec.bleed,
      dataSource: dataBindings.length ? 'Live API' : 'AI',
      refreshInterval: bindingsRefreshInterval(dataBindings),
      live: dataBindings.length > 0, dataBindings, group,
      cols: spec.cols || 6, rows: spec.rows || 2, sizeLocked: false, state: {},
      data: { ...(spec.props?.data && typeof spec.props.data === 'object' ? spec.props.data : {}), ...liveData },
      renderSpec: { color: accent, summary: '' }, renderCode: null,
      lastFetched: new Date().toISOString(), loading: false, error: null,
    };
  };

  /* One-shot dashboard: a SINGLE structured call returns the whole coherent set
   * of card specs (replacing planner + N per-card calls for broad prompts). */
  const runDashboardSpecs = async (promptText) => {
    const { key } = getProviderConn();
    if (!key) throw new Error('No API key configured. Open Settings to connect an LLM provider.');
    const userPref = workflowConfig.userSystemPrompt?.trim();
    const sys = DASHBOARD_SYSTEM_PROMPT + (userPref ? `\n\n---\n## User Preferences\n${userPref}` : '');
    const res = await callLLM(modelSmart, [
      { role:'system', content: sys },
      { role:'user', content: `User request: ${promptText}` },
    ], workflowConfig.plannerTemp || 0.3, 3500);
    if (!res.ok) throw new Error(`[Dashboard router] HTTP ${res.status}`);
    const raw = await res.json();
    const content = raw.choices?.[0]?.message?.content;
    if (!content) throw new Error('[Dashboard router] empty response');
    return parseDashboardResponse(extractJSON(content), Math.max(1, Math.min(8, workflowConfig.maxCards || 6)));
  };

  /* ─── HANDLERS ─── */
  const handleAddCard = async (promptText) => {
    if (!isApiConnected) { setIsSettingsOpen(true); return; }
    if (!promptText.trim()) { handleAddNewCardPlaceholder(groups[0]?.name || 'Personal'); return; }
    setIsConsoleSubmitting(true);
    if (workflowConfig.clearOnSubmit) setConsolePrompt('');

    try {
      const matched = matchTemplate(promptText);
      const cached = !matched ? getCachedSpec(promptText) : null;
      const fallbackGroup = groups[0]?.name || 'Personal';

      // FAST PATH: one-shot dashboard. A broad, uncached, unmatched prompt gets its
      // entire coherent card set from ONE structured call. Any failure falls through
      // to the planner path below, so reliability never regresses.
      if (!matched && !cached && workflowConfig.orchestrate) {
        try {
          const { specs, palette } = await runDashboardSpecs(promptText);
          if (specs.length) {
            ensureGroup(fallbackGroup);
            const items = specs.map(s => ({ s, tempId: Math.random().toString(36).slice(2,9) }));
            setCards(prev => [
              ...prev,
              ...items.map(({ s, tempId }) => ({ id: tempId, prompt: promptText, title: s.title || 'Analyzing…', cols: s.cols || 6, rows: s.rows || 2, group: fallbackGroup, loading: true, error: null })),
            ]);
            await Promise.all(items.map(async ({ s, tempId }) => {
              try {
                const card = await cardFromSpec(s, fallbackGroup, promptText, palette);
                setCards(prev => prev.map(c => c.id===tempId ? { ...card, id: tempId } : c));
              } catch (e) {
                setCards(prev => prev.map(c => c.id===tempId ? { ...c, title:'Error', loading:false, error:e.message } : c));
              }
            }));
            if (specs.length === 1) setCachedSpec(promptText, specs[0]);
            return;
          }
        } catch (e) {
          console.warn('[Agntdash] one-shot dashboard failed, falling back to planner:', e.message);
        }
      }

      // FALLBACK PATH: planner (+ per-card pipeline). Also the path for a matched
      // template or cached spec, which resolve to a single instant card.
      const { cards: planCards, plan } = (matched || cached)
        ? { cards: [{ prompt: promptText, group: null, title: (matched?.spec || cached)?.title, size: null }], plan: null }
        : await runDashboardPlanner(promptText);

      // Create a placeholder per planned card so they fill in live and in parallel.
      const planned = planCards.map(p => ({
        ...p,
        group: p.group || fallbackGroup,
        tempId: Math.random().toString(36).slice(2,9),
      }));
      planned.forEach(p => ensureGroup(p.group));
      setCards(prev => [
        ...prev,
        ...planned.map(p => ({ id:p.tempId, prompt:p.prompt, title:p.title || 'Analyzing…', size:'md', cols:6, rows:2, group:p.group, loading:true, error:null })),
      ]);

      await Promise.all(planned.map(async (p) => {
        try {
          const card = await runAgentPipeline(p.prompt, null, p.group, buildPlanContext(plan, p.prompt));
          setCards(prev => prev.map(c => c.id===p.tempId ? {...card, id:p.tempId} : c));
        } catch (err) {
          setCards(prev => prev.map(c => c.id===p.tempId ? {...c, title:'Error', loading:false, error:err.message||'Pipeline failed. Check API keys.'} : c));
        }
      }));
    } catch (err) {
      console.warn('[Agntdash] add card failed:', err.message);
    } finally { setIsConsoleSubmitting(false); }
  };

  /* ─── DATA REFRESH: refetch a card's bindings only (no LLM, no code change) ─── */
  const handleRefreshData = async (cardId) => {
    const card = cards.find(c => c.id===cardId);
    if (!card || card.isCreating || !card.dataBindings?.length) return;
    try {
      const liveData = await resolveBindings(card.dataBindings);
      setCards(prev => prev.map(c => c.id===cardId
        ? { ...c, data: { ...(c.data || {}), ...liveData }, lastFetched: new Date().toISOString() }
        : c));
    } catch (err) {
      console.warn('[Agntdash] data refresh failed:', err.message);
    }
  };

  /* ─── REGENERATE: re-run the full pipeline (new code + data) ─── */
  const handleRegenerateCard = async (cardId) => {
    const card = cards.find(c => c.id===cardId);
    if (!card || card.isCreating) return;
    setCards(prev => prev.map(c => c.id===cardId ? {...c, loading:true, error:null} : c));
    try {
      const updated = await runAgentPipeline(card.prompt, cardId);
      setCards(prev => prev.map(c => c.id===cardId ? updated : c));
    } catch (err) {
      setCards(prev => prev.map(c => c.id===cardId ? {...c, loading:false, error:err.message || 'Unknown error'} : c));
    }
  };

  /* Manual "Refresh" = data refetch when the card has bindings, else regenerate. */
  const handleRefreshCard = (cardId) => {
    const card = cards.find(c => c.id===cardId);
    if (card?.dataBindings?.length) return handleRefreshData(cardId);
    return handleRegenerateCard(cardId);
  };

  const handleDuplicateCard = (cardId) => {
    const card = cards.find(c => c.id===cardId);
    if (!card) return;
    const copy = { ...card, id: Math.random().toString(36).slice(2,9), title: `${card.title} (copy)`, lastFetched: new Date().toISOString() };
    setCards(prev => { const i = prev.findIndex(c => c.id===cardId); const next=[...prev]; next.splice(i+1, 0, copy); return next; });
  };

  const handleToggleSizeLock = (cardId) =>
    setCards(prev => prev.map(c => c.id===cardId ? {...c, sizeLocked: !c.sizeLocked} : c));

  // Persist a generated component's interactive state (checklist ticks, notes…)
  // into the card so it survives reloads, via the useCardState hook.
  const handlePersistState = (cardId, key, value) =>
    setCards(prev => prev.map(c => c.id===cardId ? { ...c, state: { ...(c.state || {}), [key]: value } } : c));

  const handleSaveTemplate = (cardId) => {
    const card = cards.find(c => c.id===cardId);
    if (!card) return;
    const name = window.prompt('Template name:', card.title);
    if (!name?.trim()) return;
    const tpl = {
      id: Math.random().toString(36).slice(2,9), name: name.trim(),
      prompt: card.prompt, title: card.title, cols: card.cols, rows: card.rows,
      chrome: card.chrome, bleed: card.bleed, dataBindings: card.dataBindings || [],
      data: card.data, renderSpec: card.renderSpec, renderCode: card.renderCode, spec: card.spec,
    };
    setTemplates(prev => [...prev, tpl]);
  };

  const handleUseTemplate = (tplId, groupName) => {
    const tpl = templates.find(t => t.id===tplId);
    if (!tpl) return;
    const group = groupName || groups[0]?.name || 'Personal';
    const card = {
      id: Math.random().toString(36).slice(2,9), prompt: tpl.prompt, title: tpl.title,
      cols: tpl.cols, rows: tpl.rows, chrome: tpl.chrome, bleed: tpl.bleed,
      dataBindings: tpl.dataBindings || [], refreshInterval: bindingsRefreshInterval(tpl.dataBindings || []),
      live: (tpl.dataBindings || []).length > 0, group, data: tpl.data, renderSpec: tpl.renderSpec,
      renderCode: tpl.renderCode, spec: tpl.spec, dataSource: 'Template', lastFetched: new Date().toISOString(),
      loading: false, error: null, sizeLocked: false,
    };
    setCards(prev => [...prev, card]);
    if ((tpl.dataBindings || []).length) setTimeout(() => handleRefreshData(card.id), 50);
  };

  const handleDeleteTemplate = (tplId) => setTemplates(prev => prev.filter(t => t.id !== tplId));

  /* ─── EXPORT / IMPORT: dashboards are portable JSON (no lock-in, no data loss) ─── */
  const handleExportDashboard = () => {
    const payload = { app: 'agntdash', version: 1, exportedAt: new Date().toISOString(), cards, groups, templates, workflowConfig };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `agntdash-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImportDashboard = async (file) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.app !== 'agntdash' || !Array.isArray(parsed.cards)) throw new Error('Not an Agntdash export');
      const mode = window.confirm('Import: OK = replace current dashboard, Cancel = merge into it.');
      if (mode) { // replace
        setCards(parsed.cards); setGroups(parsed.groups || groups);
        if (Array.isArray(parsed.templates)) setTemplates(parsed.templates);
      } else { // merge (re-id imported cards to avoid collisions)
        const reid = parsed.cards.map(c => ({ ...c, id: Math.random().toString(36).slice(2,9) }));
        setGroups(prev => { const names = new Set(prev.map(g=>g.name.toLowerCase())); const add=(parsed.groups||[]).filter(g=>!names.has(g.name.toLowerCase())); return [...prev, ...add]; });
        setCards(prev => [...prev, ...reid]);
        if (Array.isArray(parsed.templates)) setTemplates(prev => [...prev, ...parsed.templates.map(t => ({ ...t, id: Math.random().toString(36).slice(2,9) }))]);
      }
    } catch (err) {
      window.alert(`Import failed: ${err.message}`);
    }
  };

  /* ─── AI REPAIR: fix a crashing component using its runtime error ─── */
  const handleRepairCard = async (cardId, errorMessage) => {
    const card = cards.find(c => c.id===cardId);
    if (!card) return;
    if (!card.renderCode) return handleRefreshCard(cardId);
    setCards(prev => prev.map(c => c.id===cardId ? {...c, loading:true, error:null} : c));
    try {
      // Legacy codegen repair: load the Babel-based validator on demand so the
      // heavy transpiler stays out of the default bundle.
      const { validateRenderCode } = await import('./transpile.js');
      const res = await callLLM(modelSmart, [
        { role:'system', content: FIXED_SYSTEM_PROMPT },
        { role:'user', content: `This CardRenderer crashed with the following error:\n\n${errorMessage || 'unknown runtime error'}\n\nCurrent renderCode:\n\n${card.renderCode}\n\nReturn ONLY a JSON object {"renderCode":"<corrected CardRenderer JSX>"}. Keep the same visual intent but add null-checks and guards so it never throws.` }
      ], 0.2);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      const parsed = extractJSON(j.choices?.[0]?.message?.content || '');
      const check = validateRenderCode(parsed.renderCode);
      if (!check.ok) throw new Error(check.error);
      setCards(prev => prev.map(c => c.id===cardId ? {...c, renderCode: parsed.renderCode, loading:false, error:null, lastFetched:new Date().toISOString()} : c));
    } catch (err) {
      setCards(prev => prev.map(c => c.id===cardId ? {...c, loading:false, error:`Repair failed: ${err.message}. Click Retry to regenerate.`} : c));
    }
  };

  /* ─── AUTO-REFRESH: refetch live cards' DATA on their refreshInterval ─── */
  // Critically, this refetches data only — it never re-runs the LLM or rewrites the
  // component, so a live card stays visually stable and costs ~nothing per tick.
  const refreshDataRef = useRef(handleRefreshData);
  refreshDataRef.current = handleRefreshData;
  const liveSignature = cards.map(c => `${c.id}:${c.refreshInterval||0}:${(c.dataBindings?.length||0)}:${c.isCreating?1:0}`).join('|');
  useEffect(() => {
    const live = cards.filter(c => c.refreshInterval > 0 && c.dataBindings?.length && !c.isCreating);
    if (!live.length) return;
    const timers = live.map(c => setInterval(() => refreshDataRef.current(c.id), c.refreshInterval * 1000));
    return () => timers.forEach(clearInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveSignature]);

  /* ─── MCP INBOX: ingest cards published by external agents via the proxy ─── */
  const shapePushedCard = (pub) => {
    const c = pub.card || {};
    const ci = (n, lo, hi, def) => { const v = Math.round(Number(n)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def; };
    const dataBindings = Array.isArray(c.dataBindings) ? c.dataBindings.filter(b => b && b.key && (b.url || b.provider)).slice(0, 8) : [];
    return {
      id: 'inbox-' + pub.id,
      prompt: c.prompt || c.title || 'Pushed card',
      title: c.title || 'Pushed Card',
      cols: ci(c.cols, 1, 12, 6), rows: ci(c.rows, 1, 8, 2),
      chrome: ['full','minimal','none'].includes(c.chrome) ? c.chrome : 'full',
      bleed: !!c.bleed,
      group: c.group || 'Inbox',
      dataBindings, refreshInterval: bindingsRefreshInterval(dataBindings), live: dataBindings.length > 0,
      data: (c.data && typeof c.data === 'object') ? c.data : {},
      renderSpec: c.renderSpec || {}, renderCode: c.renderCode || null,
      dataSource: c.dataSource || 'Pushed via MCP', lastFetched: new Date().toISOString(),
      state: {}, sizeLocked: false, loading: false, error: null,
    };
  };

  const inboxCursorRef = useRef(parseInt(localStorage.getItem('agntdash_inbox_cursor') || '0', 10) || 0);
  useEffect(() => {
    if (!dataProxyUrl || workflowConfig.inboxSync === false) return;
    let stop = false;
    const base = dataProxyUrl.replace(/\/$/, '');
    const poll = async () => {
      try {
        const r = await fetch(`${base}/inbox/cards?since=${inboxCursorRef.current}`);
        if (!r.ok) return;
        const j = await r.json();
        if (Array.isArray(j.cards) && j.cards.length) {
          const shaped = await Promise.all(j.cards.map(async (pub) => {
            const card = shapePushedCard(pub);
            if (card.dataBindings.length) { try { const d = await resolveBindings(card.dataBindings); card.data = { ...card.data, ...d }; } catch (_) { /* leave fallback */ } }
            return card;
          }));
          shaped.forEach(c => ensureGroup(c.group));
          setCards(prev => { const have = new Set(prev.map(c => c.id)); return [...prev, ...shaped.filter(c => !have.has(c.id))]; });
        }
        if (typeof j.cursor === 'number') { inboxCursorRef.current = j.cursor; localStorage.setItem('agntdash_inbox_cursor', String(j.cursor)); }
      } catch (_) { /* offline; retry next tick */ }
    };
    poll();
    const t = setInterval(() => { if (!stop) poll(); }, 6000);
    return () => { stop = true; clearInterval(t); };
  }, [dataProxyUrl, workflowConfig.inboxSync]);

  const handleRefreshAll = () => cards.forEach(c => handleRefreshCard(c.id));
  const handleDeleteCard = id => setCards(prev => prev.filter(c => c.id !== id));
  const handleMoveCardGroup = (cardId, group) => setCards(prev => prev.map(c => c.id===cardId ? {...c, group} : c));
  const handleStartEditingPrompt = card => { setEditingCardId(card.id); setEditPromptValue(card.prompt); };

  // Stateful edit: refine the existing card from the instruction instead of cold
  // regeneration. Keeps the card's data/bindings; the model tweaks code + spec.
  const handleSavePromptEdit = async (cardId) => {
    if (!editPromptValue.trim()) return;
    const instruction = editPromptValue.trim();
    const card = cards.find(c => c.id===cardId);
    setEditingCardId(null);
    setCards(prev => prev.map(c => c.id===cardId ? {...c, loading:true, error:null} : c));
    try {
      const prior = card ? {
        title: card.title, cols: card.cols, rows: card.rows, chrome: card.chrome,
        bleed: card.bleed, dataBindings: card.dataBindings, renderSpec: card.renderSpec,
        renderCode: card.renderCode,
      } : null;
      const updated = await runAgentPipeline(card?.prompt || instruction, cardId, null, '',
        prior ? { instruction, prior } : null);
      // Preserve the card's existing fetched data; refine changes code, not live values.
      setCards(prev => prev.map(c => c.id===cardId
        ? { ...updated, prompt: `${card?.prompt || instruction} — ${instruction}`, data: { ...(card?.data || {}), ...(updated.data || {}) } }
        : c));
    } catch (err) {
      setCards(prev => prev.map(c => c.id===cardId ? {...c, loading:false, error:err.message || 'Unknown error'} : c));
    }
  };

  const handleAddNewCardPlaceholder = groupName => {
    if (!isApiConnected) { setIsSettingsOpen(true); return; }
    const id = Math.random().toString(36).slice(2,9);
    setCards(prev => [...prev, { id, prompt:'', title:'New Card', size:'md', cols:6, rows:2, group:groupName, isCreating:true, loading:false, error:null, data:null, renderSpec:{} }]);
  };

  const handleGenerateInlineCard = async (cardId, promptText) => {
    setCards(prev => prev.map(c => c.id===cardId ? {...c, prompt:promptText, title:'Analyzing…', isCreating:false, loading:true, error:null} : c));
    try { const card = await runAgentPipeline(promptText, cardId); setCards(prev => prev.map(c => c.id===cardId ? card : c)); }
    catch (err) { setCards(prev => prev.map(c => c.id===cardId ? {...c, title:'Generation Error', loading:false, error:err.message || 'Unknown error'} : c)); }
  };

  const handleCancelInlineCard = id => setCards(prev => prev.filter(c => c.id !== id));

  const handleCardDragStart = (e, cardId) => { setDraggingCardId(cardId); e.dataTransfer.setData('text/plain', cardId); e.dataTransfer.effectAllowed = 'move'; };

  const handleCardDragOver = (e, targetCardId) => {
    e.preventDefault();
    if (draggingCardId === targetCardId) return;
    const dragIdx = cards.findIndex(c => c.id===draggingCardId);
    const tgtIdx = cards.findIndex(c => c.id===targetCardId);
    if (dragIdx===-1 || tgtIdx===-1) return;
    const updated = [...cards];
    const [dragged] = updated.splice(dragIdx, 1);
    if (dragged.group !== updated[tgtIdx]?.group) dragged.group = updated[Math.min(tgtIdx, updated.length-1)]?.group || dragged.group;
    updated.splice(tgtIdx, 0, dragged);
    setCards(updated);
  };

  const handleCardDragEnd = () => setDraggingCardId(null);
  const toggleGroupCollapse = name => setGroups(prev => prev.map(g => g.name===name ? {...g, collapsed:!g.collapsed} : g));

  const handleAddGroup = () => {
    const name = window.prompt('Enter new group name:');
    if (!name?.trim()) return;
    if (groups.some(g => g.name.toLowerCase()===name.toLowerCase())) { window.alert('Group already exists!'); return; }
    setGroups(prev => [...prev, { name: name.trim(), color: ACCENT_COLORS[prev.length % ACCENT_COLORS.length], collapsed: false }]);
  };

  const handleSaveGroupName = (oldName, newName) => {
    if (groups.some(g => g.name.toLowerCase()===newName.toLowerCase() && g.name!==oldName)) { window.alert('Name already taken!'); return; }
    setGroups(prev => prev.map(g => g.name===oldName ? {...g, name:newName} : g));
    setCards(prev => prev.map(c => c.group===oldName ? {...c, group:newName} : c));
  };

  const handleResizeMouseDown = (e, cardId) => {
    e.preventDefault(); e.stopPropagation();
    const card = cards.find(c => c.id===cardId);
    if (!card) return;
    resizeRef.current = { cardId, startCols:card.cols, startRows:card.rows, startX:e.clientX, startY:e.clientY };
    document.addEventListener('mousemove', resizeMoveRef.current);
    document.addEventListener('mouseup', resizeUpRef.current);
  };

  const handlers = {
    onRefresh: handleRefreshCard,
    onRegenerate: handleRegenerateCard,
    onDuplicate: handleDuplicateCard,
    onSaveTemplate: handleSaveTemplate,
    onToggleSizeLock: handleToggleSizeLock,
    onPersistState: handlePersistState,
    onRepair: handleRepairCard,
    onDelete: handleDeleteCard,
    onMove: handleMoveCardGroup,
    onStartEdit: handleStartEditingPrompt,
    onSaveEdit: handleSavePromptEdit,
    onCancelEdit: () => setEditingCardId(null),
    onAddPlaceholder: handleAddNewCardPlaceholder,
    onGenerate: handleGenerateInlineCard,
    onCancel: handleCancelInlineCard,
    onDragStart: handleCardDragStart,
    onDragOver: handleCardDragOver,
    onDragEnd: handleCardDragEnd,
    onToggleGroup: toggleGroupCollapse,
    onSaveGroupName: handleSaveGroupName,
    onAddGroup: handleAddGroup,
    onResizeMouseDown: handleResizeMouseDown,
    onOpenSettings: () => setIsSettingsOpen(true),
  };

  return (
    <div>
      <AppHeader
        activeView={activeView}
        setActiveView={setActiveView}
        isApiConnected={isApiConnected}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefreshAll={handleRefreshAll}
      />

      {activeView === 'dashboard' && (
        <DashboardView
          cards={cards}
          groups={groups}
          setGroups={setGroups}
          isApiConnected={isApiConnected}
          workflowConfig={workflowConfig}
          consolePrompt={consolePrompt}
          setConsolePrompt={setConsolePrompt}
          isConsoleSubmitting={isConsoleSubmitting}
          onAddCard={handleAddCard}
          editingCardId={editingCardId}
          editPromptValue={editPromptValue}
          setEditPromptValue={setEditPromptValue}
          draggingCardId={draggingCardId}
          handlers={handlers}
          samplePrompts={SAMPLE_PROMPTS}
          templates={templates}
          onUseTemplate={handleUseTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onExport={handleExportDashboard}
          onImport={handleImportDashboard}
        />
      )}

      {activeView === 'pipeline' && (
        <PipelineView
          workflowConfig={workflowConfig}
          setWorkflowConfig={setWorkflowConfig}
          modelFast={modelFast}
          modelSmart={modelSmart}
          activeProvider={activeProvider}
          isApiConnected={isApiConnected}
          hasTavily={!!tavilyKey}
          fixedSystemPrompt={FIXED_SYSTEM_PROMPT}
        />
      )}

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeProvider={activeProvider}
        openRouterKey={openRouterKey}
        openAIKey={openAIKey}
        openAIBaseUrl={openAIBaseUrl}
        openCodeKey={openCodeKey}
        openCodeBaseUrl={openCodeBaseUrl}
        tavilyKey={tavilyKey}
        dataProxyUrl={dataProxyUrl}
        modelFast={modelFast}
        modelSmart={modelSmart}
        modelsByProvider={modelsByProvider}
        defaultModels={{ fast: DEFAULT_MODELS_FAST[0], smart: DEFAULT_MODELS_SMART[0] }}
        envSources={ENV_SOURCES}
        onSave={saveSettings}
      />

      {actionRequest && (
        <div>
          <div className="settings-overlay" onClick={cancelAction} />
          <div className="action-confirm">
            <div className="action-confirm-hd">
              <span className="material-symbols-outlined" style={{ color:'var(--warning)' }}>bolt</span>
              <div>
                <div className="card-title">Confirm action</div>
                <div className="card-sub">A card wants to run "{actionRequest.id}"</div>
              </div>
            </div>
            <pre className="action-confirm-payload">{JSON.stringify(actionRequest.payload, null, 2)}</pre>
            <div className="action-confirm-ft">
              <button className="btn btn-secondary btn-sm" onClick={cancelAction}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={confirmAction}>
                <span className="material-symbols-outlined">check</span> Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
