import { useState, useEffect, useRef } from 'react';
import { AppHeader, SettingsDrawer, PipelineView } from './UI.jsx';
import { DashboardView } from './Dashboard.jsx';

/* ─── CONSTANTS ─── */
const DEFAULT_MODELS_FAST = ['google/gemini-2.5-flash','meta-llama/llama-3.3-70b-instruct:free','openai/gpt-4o-mini','anthropic/claude-3-haiku'];
const DEFAULT_MODELS_SMART = ['anthropic/claude-3.5-sonnet','google/gemini-2.5-pro','openai/gpt-4o','deepseek/deepseek-chat'];
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
};

const DEFAULT_CARDS = [];

const DEFAULT_GROUPS = [
  { name:'Finance', color:'#10b981', collapsed:false },
  { name:'Personal', color:'#6366f1', collapsed:false },
  { name:'Work', color:'#a855f7', collapsed:false },
];

/* ─── FIXED SYSTEM PROMPT ─── */
export const FIXED_SYSTEM_PROMPT = `You are a dashboard card generator for Agntdash. CRITICAL: respond with ONLY a raw JSON object — no markdown code fences, no explanation text, no preamble. Start your response with { and end with }.

You are an AI-native fluid grid dashboard card generator.

## Your Mission (execute in this exact order)

1. UNDERSTAND — Parse the user intent and identify exactly what data is needed, what format best suits it, and what interaction model would be most useful.

2. ACQUIRE — Use provided search results as primary data when available. Supplement from your knowledge base when search results are absent or incomplete. Always prefer factual, current data over placeholders.

3. VERIFY — Confirm the data is accurate, complete, and directly answers the request. If data is uncertain, reflect that in the renderSpec summary. Never fabricate specific numbers (prices, statistics) without a data source.

4. DESIGN — Choose the visualization that best communicates this specific data type and user intent. Match complexity to the data: simple data → clean minimal card; rich data → interactive component.

5. CODE — Write a self-contained React component using only React.createElement() that renders the visualization beautifully.

## Output Format

Return ONLY valid JSON — no markdown fences, no explanation text:

{
  "title": "Concise card title (3-6 words)",
  "size": "xs|sm|md|lg|xl",
  "dataSource": "Data origin description",
  "refreshInterval": 0,
  "data": {},
  "renderSpec": {
    "color": "#hex accent color",
    "summary": "One-sentence insight or status"
  },
  "renderCode": "function CardRenderer({data, renderSpec}) { ... }"
}

## Size Guide
- xs: 3×1 — single metric, timer, toggle
- sm: 4×2 — compact list, small chart, mini table
- md: 6×2 — standard card, news feed, medium chart
- lg: 6×3 — detailed chart, multi-column table, rich content
- xl: 12×3 — full-width dashboard panel, complex visualization

## renderCode Rules

CRITICAL REQUIREMENTS:
1. The function MUST be named \`CardRenderer\`
2. Takes \`{data, renderSpec}\` as destructured props
3. Uses ONLY \`React.createElement()\` — absolutely NO JSX syntax
4. May use \`React.useState()\` and \`React.useEffect()\` for interactivity
5. Must handle null/empty/missing data gracefully with a fallback div
6. All styles must be inline; no external CSS classes except system CSS variables
7. Returns exactly ONE root React element

Available CSS variables (dark background theme):
- \`var(--fg)\` — primary text color
- \`var(--fg-muted)\` — secondary text
- \`var(--fg-dim)\` — tertiary / disabled text
- \`var(--primary)\` — brand indigo (#6366f1)
- \`var(--success)\` — green (#10b981)
- \`var(--danger)\` — red (#ef4444)
- \`var(--warning)\` — amber (#f59e0b)
- \`var(--border)\` — subtle border color
- \`var(--fn)\` — system font stack
- \`var(--mo)\` — monospace font (JetBrains Mono)

## Visualization Decision Matrix

Choose the best fit for the data:

- Time-series / price history → SVG polyline with gradient area fill, x-axis labels, current value + % change header
- Comparison table (cities, products, metrics) → HTML table with alternating row shading, colored key column
- News / article feed → Scrollable list with colored left-border accent, title + source + time metadata
- Checklist / tasks / habits → React.useState for checked state, progress bar, strikethrough on completed items
- Live converter / calculator → Controlled input with React.useState, immediate derived output display
- Countdown timer → React.useEffect with setInterval, formatted d/h/m/s, clearInterval on cleanup
- Portfolio / allocation → Horizontal bars with percentages, color-coded per asset, total validates to 100%
- Single KPI / metric → Large prominent number, delta badge, trend sparkline if data available
- Geographic / multi-location → Grid or table layout, flag emoji, metric columns, status badges
- Interactive widget → Clean controls (buttons/sliders/inputs), immediate feedback, zero external dependencies

## Quality Standards

- Visually rich: use gradients, color accents, subtle backgrounds, SVG for charts
- Information-dense: maximize relevant data shown within the card size
- Interactive where it adds value: counters, converters, toggles, expandable sections
- Responsive: percentage widths and flex layouts that adapt to card size
- Error-safe: null-check all data access, provide graceful fallback renders`;

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
  const [openCodeBaseUrl, setOpenCodeBaseUrl] = useState(() => envOrStorage(import.meta.env.VITE_OPENCODE_BASE_URL, 'agntdash_opencode_base_url', 'https://api.opencode.go/v1'));
  const [tavilyKey, setTavilyKey] = useState(() => envOrStorage(import.meta.env.VITE_TAVILY_KEY, 'agntdash_tavily_key'));
  const [modelFast, setModelFast] = useState(() => envOrStorage(import.meta.env.VITE_MODEL_FAST, 'agntdash_model_fast', DEFAULT_MODELS_FAST[0]));
  const [modelSmart, setModelSmart] = useState(() => envOrStorage(import.meta.env.VITE_MODEL_SMART, 'agntdash_model_smart', DEFAULT_MODELS_SMART[0]));

  const [cards, setCards] = useState(() => load('agntdash_cards_v4', DEFAULT_CARDS));
  const [groups, setGroups] = useState(() => load('agntdash_groups_v2', DEFAULT_GROUPS));
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
  useEffect(() => { localStorage.setItem('agntdash_workflow_config', JSON.stringify(workflowConfig)); }, [workflowConfig]);

  useEffect(() => {
    resizeMoveRef.current = (e) => {
      if (!resizeRef.current) return;
      const { cardId, startCols, startRows, startX, startY } = resizeRef.current;
      const newCols = Math.max(2, Math.min(12, startCols + Math.round((e.clientX - startX) / 100)));
      const newRows = Math.max(1, Math.min(6, startRows + Math.round((e.clientY - startY) / 140)));
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, cols: newCols, rows: newRows } : c));
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
    setIsSettingsOpen(false);
  };

  /* ─── JSON EXTRACTION (robust, model-agnostic) ─── */
  const extractJSON = (text) => {
    if (!text) throw new Error('Empty response from model');
    // 1. Try direct parse
    try { return JSON.parse(text); } catch (_) {}
    // 2. Strip all markdown code fences then retry
    const stripped = text.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/m, '').trim();
    try { return JSON.parse(stripped); } catch (_) {}
    // 3. Find the outermost {...} block
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {}
    }
    throw new Error('Model returned non-JSON response. Try a different smart model.');
  };

  /* ─── AGENT PIPELINE (3-stage) ─── */
  const runAgentPipeline = async (promptText, existingCardId = null) => {
    const key = activeProvider==='openrouter' ? openRouterKey : activeProvider==='openai' ? openAIKey : openCodeKey;
    const base = activeProvider==='openrouter' ? 'https://openrouter.ai/api/v1' : activeProvider==='openai' ? openAIBaseUrl : openCodeBaseUrl;
    const getGroup = () => existingCardId ? (cards.find(c=>c.id===existingCardId)?.group || 'Personal') : 'Personal';
    const sizeToGrid = size => size==='xs'?{cols:3,rows:1}:size==='sm'?{cols:4,rows:2}:size==='md'?{cols:6,rows:2}:size==='lg'?{cols:6,rows:3}:{cols:12,rows:3};
    const llm = (model, messages, temp = 0.3) => fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${key}` },
      body: JSON.stringify({ model, messages, temperature: temp, max_tokens: 4096 })
    });

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
    const userMsg = searchContext
      ? `User request: ${promptText}\n\nLive search results (use as primary data source):\n${searchContext}`
      : `User request: ${promptText}`;

    const res = await llm(modelSmart, [{role:'system',content:sysContent},{role:'user',content:userMsg}], workflowConfig.plannerTemp || 0.3);
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Code generator failed (${res.status}): ${errBody.slice(0,200) || res.statusText}`);
    }
    const raw = await res.json();
    const content = raw.choices?.[0]?.message?.content;
    if (!content) throw new Error('Model returned an empty response. Try again or switch models.');

    const payload = extractJSON(content);

    // Validate renderCode syntax — non-fatal, card will show a render error instead
    if (payload.renderCode) {
      try {
        // eslint-disable-next-line no-new-func
        new Function('React', 'return (' + payload.renderCode + ')');
      } catch (syntaxErr) {
        console.warn('renderCode syntax warning:', syntaxErr.message);
        payload.renderSpec = { ...(payload.renderSpec||{}), summary: `⚠ Render issue: ${syntaxErr.message}` };
      }
    }

    const { cols, rows } = sizeToGrid(payload.size || 'md');
    return {
      id: existingCardId || Math.random().toString(36).slice(2,9),
      prompt: promptText,
      title: payload.title || 'AI Card',
      size: payload.size || 'md',
      dataSource: searchUsed ? `Tavily · ${payload.dataSource || 'Web Search'}` : (payload.dataSource || 'AI Knowledge'),
      refreshInterval: payload.refreshInterval || 0,
      group: getGroup(),
      cols, rows,
      data: payload.data,
      renderSpec: payload.renderSpec || {},
      renderCode: payload.renderCode || null,
      lastFetched: new Date().toISOString(),
      loading: false, error: null,
    };
  };

  /* ─── HANDLERS ─── */
  const handleAddCard = async (promptText) => {
    if (!isApiConnected) { setIsSettingsOpen(true); return; }
    if (!promptText.trim()) { handleAddNewCardPlaceholder(groups[0]?.name || 'Personal'); return; }
    setIsConsoleSubmitting(true);
    const tempId = Math.random().toString(36).slice(2,9);
    setCards(prev => [...prev, { id:tempId, prompt:promptText, title:'Analyzing Intent…', size:'md', cols:6, rows:2, group:'Personal', loading:true, error:null }]);
    if (workflowConfig.clearOnSubmit) setConsolePrompt('');
    try {
      const card = await runAgentPipeline(promptText);
      setCards(prev => prev.map(c => c.id===tempId ? {...card, id:tempId} : c));
    } catch (err) {
      setCards(prev => prev.map(c => c.id===tempId ? {...c, title:'Error', loading:false, error:err.message||'Pipeline failed. Check API keys.'} : c));
    } finally { setIsConsoleSubmitting(false); }
  };

  const handleRefreshCard = async (cardId) => {
    setCards(prev => prev.map(c => c.id===cardId ? {...c, loading:true} : c));
    const card = cards.find(c => c.id===cardId);
    if (!card) return;
    try {
      const updated = await runAgentPipeline(card.prompt, cardId);
      setCards(prev => prev.map(c => c.id===cardId ? updated : c));
    } catch (err) {
      setCards(prev => prev.map(c => c.id===cardId ? {...c, loading:false, error:err.message} : c));
    }
  };

  const handleRefreshAll = () => cards.forEach(c => handleRefreshCard(c.id));
  const handleDeleteCard = id => setCards(prev => prev.filter(c => c.id !== id));
  const handleMoveCardGroup = (cardId, group) => setCards(prev => prev.map(c => c.id===cardId ? {...c, group} : c));
  const handleStartEditingPrompt = card => { setEditingCardId(card.id); setEditPromptValue(card.prompt); };

  const handleSavePromptEdit = async (cardId) => {
    if (!editPromptValue.trim()) return;
    setEditingCardId(null);
    setCards(prev => prev.map(c => c.id===cardId ? {...c, prompt:editPromptValue, loading:true} : c));
    try {
      const updated = await runAgentPipeline(editPromptValue, cardId);
      setCards(prev => prev.map(c => c.id===cardId ? updated : c));
    } catch (err) {
      setCards(prev => prev.map(c => c.id===cardId ? {...c, loading:false, error:err.message} : c));
    }
  };

  const handleAddNewCardPlaceholder = groupName => {
    if (!isApiConnected) { setIsSettingsOpen(true); return; }
    const id = Math.random().toString(36).slice(2,9);
    setCards(prev => [...prev, { id, prompt:'', title:'New Card', size:'md', cols:6, rows:2, group:groupName, isCreating:true, loading:false, error:null, data:null, renderSpec:{} }]);
  };

  const handleGenerateInlineCard = async (cardId, promptText) => {
    setCards(prev => prev.map(c => c.id===cardId ? {...c, prompt:promptText, title:'Analyzing…', isCreating:false, loading:true} : c));
    try { const card = await runAgentPipeline(promptText, cardId); setCards(prev => prev.map(c => c.id===cardId ? card : c)); }
    catch (err) { setCards(prev => prev.map(c => c.id===cardId ? {...c, title:'Error', loading:false, error:err.message} : c)); }
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
        envSources={ENV_SOURCES}
        onSave={saveSettings}
      />
    </div>
  );
}
