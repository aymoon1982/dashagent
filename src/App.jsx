import { useState, useEffect, useRef } from 'react';
import { AppHeader, SettingsDrawer, PipelineView } from './UI.jsx';
import { DashboardView } from './Dashboard.jsx';
import { validateRenderCode } from './transpile.js';
import { resolveBindings, bindingsRefreshInterval, ALLOWED_HOSTS } from './dataLayer.js';

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
  orchestrate: true, maxCards: 6, autoFitHeight: true,
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

Do NOT fetch inside renderCode. Instead declare what you need; the host fetches it (with caching, retries, and refresh) and passes the result to your component as the \`data\` prop. This makes refresh cheap and keeps your component pure.

- STATIC data (knowledge, conversions, checklists, anything that doesn't change): put it directly in \`data\` and leave \`dataBindings\` empty.
- LIVE data: add entries to \`dataBindings\`. Each: { "key": "<name>", "url": "<allowlisted URL>", "refreshSec": <seconds, e.g. 60>, "path": "<optional dotted path into the JSON response>" }. The host fetches each url, follows \`path\` if given, and sets \`data[key]\` to the result. On failure \`data[key]\` is \`{ __error: "..." }\` — handle that.

Your renderCode reads ONLY from the \`data\` prop. Render a graceful fallback when a value is missing or has \`__error\`.

Allowlisted live hosts (any other host is refused): ${ALLOWED_HOSTS.join(', ')}. Examples:
- Crypto price → url "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd", path "bitcoin.usd"
- Crypto 7d history → url "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7", path "prices"
- FX rates → url "https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY", path "rates"
- Weather → url "https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.12&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto"
- Tech news → url "https://hn.algolia.com/api/v1/search?tags=front_page", path "hits"

For sources NOT on the allowlist (specific equities, paywalled news): use the injected web-search results or your knowledge as a clearly-labeled snapshot in \`data\`, leave dataBindings empty, and say so in the summary.

## renderCode Rules

1. Named exactly \`CardRenderer\`, takes \`{ data, renderSpec }\`.
2. WRITE JSX (<div>, <svg>, <img>, <table>…). It is transpiled for you. Do NOT hand-write React.createElement.
3. Hooks via \`React.useState/useEffect/useRef\` (\`React\` is in scope; no imports).
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
  const saveSettings = ({ activeProvider: ap, openRouterKey: or, openAIKey: oai, openAIBaseUrl: oaib, openCodeKey: oc, openCodeBaseUrl: ocb, tavilyKey: tv, modelFast: mf, modelSmart: ms }) => {
    setActiveProvider(ap); setOpenRouterKey(or); setOpenAIKey(oai); setOpenAIBaseUrl(oaib);
    setOpenCodeKey(oc); setOpenCodeBaseUrl(ocb); setTavilyKey(tv); setModelFast(mf); setModelSmart(ms);
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
  const runAgentPipeline = async (promptText, existingCardId = null, forcedGroup = null, planContext = '') => {
    const { key } = getProviderConn();
    const getGroup = () => forcedGroup || (existingCardId ? (cards.find(c=>c.id===existingCardId)?.group || 'Personal') : 'Personal');
    const sizeToGrid = size => size==='xs'?{cols:3,rows:1}:size==='sm'?{cols:4,rows:2}:size==='md'?{cols:6,rows:2}:size==='lg'?{cols:6,rows:3}:{cols:12,rows:3};
    const clamp = (n, lo, hi, def) => { const v = Math.round(Number(n)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def; };
    const llm = (model, messages, temp = 0.3, maxTokens = 8000) => callLLM(model, messages, temp, maxTokens);

    if (!key) throw new Error('No API key configured. Open Settings to connect an LLM provider.');

    // Stage 1: Intent analysis — does this prompt need live web search?
    let intent = { needs_search: false, search_query: promptText };
    try {
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

    // Stage 3: Code generation (smart model) — no response_format for max model compatibility
    const userPref = workflowConfig.userSystemPrompt?.trim();
    const sysContent = FIXED_SYSTEM_PROMPT + (userPref ? `\n\n---\n## User Preferences\n${userPref}` : '');
    const userMsg = (searchContext
      ? `User request: ${promptText}\n\nLive search results (use as primary data source):\n${searchContext}`
      : `User request: ${promptText}`) + (planContext || '');

    // Helper: call Stage 3 and return parsed payload
    const callStage3 = async (messages) => {
      const res = await llm(modelSmart, messages, workflowConfig.plannerTemp || 0.3);
      if (!res.ok) {
        let detail = res.statusText;
        try {
          const errJson = await res.json();
          detail = errJson.error?.message || errJson.message || JSON.stringify(errJson).slice(0, 200);
        } catch (_) {
          detail = (await res.text().catch(() => '')).slice(0, 200) || res.statusText;
        }
        throw new Error(`[Stage 3 / ${modelSmart}] HTTP ${res.status}: ${detail}`);
      }
      const raw = await res.json();
      const content = raw.choices?.[0]?.message?.content;
      if (!content) throw new Error(`[Stage 3 / ${modelSmart}] Model returned an empty response. The model may have refused or hit its context limit. Try a different prompt or model.`);
      return extractJSON(content);
    };

    const baseMessages = [{role:'system',content:sysContent},{role:'user',content:userMsg}];
    let payload = await callStage3(baseMessages);

    // Validate the JSX renderCode by actually transpiling it. On failure, do one
    // automatic repair round-trip feeding the exact compiler error back to the model.
    let check = validateRenderCode(payload.renderCode);
    if (!check.ok) {
      console.warn('[Agntdash] renderCode failed to compile, attempting auto-repair:', check.error);
      try {
        payload = await callStage3([
          ...baseMessages,
          { role:'assistant', content: JSON.stringify(payload) },
          { role:'user', content: `Your renderCode failed to compile with this error:\n\n${check.error}\n\nFix it. Return the COMPLETE corrected JSON object. The component must be named CardRenderer, take { data, renderSpec }, be valid JSX (no imports), and handle null data safely.` }
        ]);
        check = validateRenderCode(payload.renderCode);
      } catch (repairErr) {
        console.warn('[Agntdash] auto-repair call failed:', repairErr.message);
      }
    }
    if (!check.ok) {
      payload.renderSpec = {
        ...(payload.renderSpec || {}),
        summary: `Generation error: ${check.error}. Click Retry to regenerate.`
      };
    }

    // Agentic sizing: prefer the model's direct cols/rows; fall back to size enum.
    const fallback = sizeToGrid(payload.size || 'md');
    const cols = clamp(payload.cols, 1, 12, fallback.cols);
    const rows = clamp(payload.rows, 1, 8, fallback.rows);

    // Frame: agent-controlled chrome + bleed.
    const chrome = ['full','minimal','none'].includes(payload.chrome) ? payload.chrome : 'full';
    const bleed = !!payload.bleed;

    // Data: host resolves declarative bindings (no fetching in model code). Merge any
    // statically-embedded data with the freshly fetched values.
    const dataBindings = Array.isArray(payload.dataBindings)
      ? payload.dataBindings.filter(b => b && b.key && b.url).slice(0, 8)
      : [];
    const refreshInterval = bindingsRefreshInterval(dataBindings);
    let liveData = {};
    if (dataBindings.length) {
      try { liveData = await resolveBindings(dataBindings); }
      catch (e) { console.warn('[Agntdash] binding resolve failed:', e.message); }
    }
    const data = { ...(payload.data && typeof payload.data === 'object' ? payload.data : {}), ...liveData };

    return {
      id: existingCardId || Math.random().toString(36).slice(2,9),
      prompt: promptText,
      title: payload.title || 'AI Card',
      size: payload.size || (cols >= 12 ? 'xl' : cols >= 6 ? (rows >= 3 ? 'lg' : 'md') : rows >= 2 ? 'sm' : 'xs'),
      chrome, bleed,
      dataSource: searchUsed ? `Tavily · ${payload.dataSource || 'Web Search'}` : (payload.dataSource || (dataBindings.length ? 'Live API' : 'AI Knowledge')),
      refreshInterval,
      live: dataBindings.length > 0,
      dataBindings,
      group: getGroup(),
      cols, rows,
      sizeLocked: existingCardId ? (cards.find(c=>c.id===existingCardId)?.sizeLocked || false) : false,
      data,
      renderSpec: payload.renderSpec || {},
      renderCode: check.ok ? payload.renderCode : (payload.renderCode || null),
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

  /* ─── HANDLERS ─── */
  const handleAddCard = async (promptText) => {
    if (!isApiConnected) { setIsSettingsOpen(true); return; }
    if (!promptText.trim()) { handleAddNewCardPlaceholder(groups[0]?.name || 'Personal'); return; }
    setIsConsoleSubmitting(true);
    if (workflowConfig.clearOnSubmit) setConsolePrompt('');

    try {
      // Stage 0: planner decides whether this is one card or a coordinated set,
      // and produces shared design context for the set.
      const { cards: planCards, plan } = await runDashboardPlanner(promptText);
      const fallbackGroup = groups[0]?.name || 'Personal';

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

  const handleSaveTemplate = (cardId) => {
    const card = cards.find(c => c.id===cardId);
    if (!card) return;
    const name = window.prompt('Template name:', card.title);
    if (!name?.trim()) return;
    const tpl = {
      id: Math.random().toString(36).slice(2,9), name: name.trim(),
      prompt: card.prompt, title: card.title, cols: card.cols, rows: card.rows,
      chrome: card.chrome, bleed: card.bleed, dataBindings: card.dataBindings || [],
      data: card.data, renderSpec: card.renderSpec, renderCode: card.renderCode,
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
      renderCode: tpl.renderCode, dataSource: 'Template', lastFetched: new Date().toISOString(),
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

  const handleRefreshAll = () => cards.forEach(c => handleRefreshCard(c.id));
  const handleDeleteCard = id => setCards(prev => prev.filter(c => c.id !== id));
  const handleMoveCardGroup = (cardId, group) => setCards(prev => prev.map(c => c.id===cardId ? {...c, group} : c));
  const handleStartEditingPrompt = card => { setEditingCardId(card.id); setEditPromptValue(card.prompt); };

  const handleSavePromptEdit = async (cardId) => {
    if (!editPromptValue.trim()) return;
    setEditingCardId(null);
    setCards(prev => prev.map(c => c.id===cardId ? {...c, prompt:editPromptValue, loading:true, error:null} : c));
    try {
      const updated = await runAgentPipeline(editPromptValue, cardId);
      setCards(prev => prev.map(c => c.id===cardId ? updated : c));
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
        modelFast={modelFast}
        modelSmart={modelSmart}
        modelsByProvider={modelsByProvider}
        defaultModels={{ fast: DEFAULT_MODELS_FAST[0], smart: DEFAULT_MODELS_SMART[0] }}
        envSources={ENV_SOURCES}
        onSave={saveSettings}
      />
    </div>
  );
}
