import { useState, useEffect, useRef } from 'react';
import { AppHeader, SettingsDrawer, PipelineView } from './UI.jsx';
import { DashboardView } from './Dashboard.jsx';

/* ─── CONSTANTS ─── */
const DEFAULT_MODELS_FAST = ['google/gemini-2.5-flash','meta-llama/llama-3.3-70b-instruct:free','openai/gpt-4o-mini','anthropic/claude-3-haiku'];
const DEFAULT_MODELS_SMART = ['anthropic/claude-3.5-sonnet','google/gemini-2.5-pro','openai/gpt-4o','deepseek/deepseek-chat'];
const ACCENT_COLORS = ['#6366f1','#a855f7','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4'];

const SAMPLE_PROMPTS = [
  { text:'Show me Bitcoin price this week', icon:'trending_up', group:'Finance' },
  { text:'Weather in London, Paris and Tokyo', icon:'cloud', group:'Personal' },
  { text:'Top tech news this morning', icon:'newspaper', group:'Work' },
  { text:'My daily workout checklist', icon:'checklist', group:'Personal' },
  { text:'Convert 120 miles to kilometers', icon:'sync_alt', group:'Utilities' },
  { text:'Countdown to New Year 2027', icon:'timer', group:'Utilities' },
  { text:'Portfolio: 50% BTC, 30% ETH, 20% SOL', icon:'pie_chart', group:'Finance' },
];

const DEFAULT_WORKFLOW_CONFIG = {
  enableAutocomplete: true, clearOnSubmit: true, classifierTemp: 0.1,
  classifierCacheTtl: 300, prioritizeSearch: false, allowParametricFallback: true,
  tavilyDepth: 'basic', plannerTemp: 0.3, defaultThemeAccent: '#6366f1',
  autoResizeOnOverride: true, allowRawJsonEdit: false, densePacking: true,
  defaultSortOrder: 'none', gridSnapUnit: 8,
};

const SIMULATED_RESPONSES = [
  { keywords:['bitcoin','btc'], response:{ title:'BTC / USD — 7 Day', cardType:'chart', size:'lg', dataSource:'CoinGecko API', refreshInterval:300, data:[{name:'Mon',value:67200},{name:'Tue',value:67900},{name:'Wed',value:68420},{name:'Thu',value:68100},{name:'Fri',value:68900},{name:'Sat',value:69400},{name:'Sun',value:70150}], renderSpec:{ chartType:'line', xField:'name', yField:'value', color:'#10b981', summary:'Bitcoin broke past $70,000 this weekend with a 4.2% weekly increase.'} } },
  { keywords:['weather','london','tokyo','paris','temperature'], response:{ title:'Global Cities Weather', cardType:'table', size:'md', dataSource:'Open-Meteo API', refreshInterval:900, data:{ headers:['City','Temp','Condition','Wind'], rows:[{City:'London',Temp:'18°C',Condition:'Light Rain 🌧️',Wind:'14 km/h'},{City:'Paris',Temp:'22°C',Condition:'Partly Cloudy ⛅',Wind:'9 km/h'},{City:'Tokyo',Temp:'26°C',Condition:'Sunny ☀️',Wind:'12 km/h'}]}, renderSpec:{ color:'#6366f1', summary:'Rainy London, fair Paris and sunny Tokyo.'} } },
  { keywords:['news','headline','tech'], response:{ title:'Top Tech Headlines', cardType:'feed', size:'md', dataSource:'NewsAPI', refreshInterval:1800, data:[{id:1,title:'OpenRouter launches real-time model price dashboard',time:'12 min ago',url:'#'},{id:2,title:'Gemini 3.5 Flash outperforms peers in latency benchmarks',time:'1 hr ago',url:'#'},{id:3,title:'Vite 8.0 released with advanced SSR caching',time:'3 hrs ago',url:'#'},{id:4,title:'W3C adopts CSS Fluid Grids as recommended standard',time:'5 hrs ago',url:'#'}], renderSpec:{ color:'#a855f7', summary:"Developer tooling dominates today's news."} } },
  { keywords:['checklist','workout','todo','task','fitness'], response:{ title:'Daily Fitness Tracker', cardType:'interactive', size:'sm', dataSource:'Local Memory', refreshInterval:0, data:{ widgetType:'checklist', items:[{id:'t1',text:'5km Jog (Morning)',done:true},{id:'t2',text:'Core & Abs (20 mins)',done:false},{id:'t3',text:'Hydration Goal (3L)',done:true},{id:'t4',text:'Post-workout protein',done:false}]}, renderSpec:{ color:'#a5b4fc', summary:'50% of goals accomplished.'} } },
  { keywords:['convert','miles','km','kilometer'], response:{ title:'Unit Converter (Mi → Km)', cardType:'interactive', size:'xs', dataSource:'Math Engine', refreshInterval:0, data:{ widgetType:'converter', formula:'mi * 1.60934', fromUnit:'miles', toUnit:'km', initialValue:120}, renderSpec:{ color:'#f59e0b', summary:'120 miles ≈ 193.12 km.'} } },
  { keywords:['countdown','timer','new year'], response:{ title:'Countdown to New Year 2027', cardType:'interactive', size:'xs', dataSource:'Local Clock', refreshInterval:1, data:{ widgetType:'timer', targetDate:'2027-01-01T00:00:00'}, renderSpec:{ color:'#ef4444', summary:'Counting down to 2027.'} } },
  { keywords:['portfolio','allocation','eth','sol'], response:{ title:'Crypto Asset Allocation', cardType:'chart', size:'md', dataSource:'Portfolio', refreshInterval:0, data:[{name:'BTC',value:50},{name:'ETH',value:30},{name:'SOL',value:20}], renderSpec:{ chartType:'pie', xField:'name', yField:'value', color:'#6366f1', summary:'50% BTC, 30% ETH, 20% SOL allocation.'} } },
  { keywords:['map','earthquake','geo'], response:{ title:'Global Seismic Zones', cardType:'map', size:'lg', dataSource:'USGS Feed', refreshInterval:3600, data:{ center:[20,0], zoom:2, markers:[{name:'Pacific Ring of Fire',coords:[35,139],desc:'High seismic activity'},{name:'Mid-Atlantic Ridge',coords:[-15,-25],desc:'Spreading boundary'},{name:'Alpide Belt',coords:[30,75],desc:'Collision boundary'},{name:'San Andreas Fault',coords:[36,-120],desc:'Transform fault'}]}, renderSpec:{ color:'#ef4444', summary:'Active fault lines globally.'} } },
];

const DEFAULT_SIMULATED = {
  title:'AI Knowledge Digest', cardType:'article', size:'md', dataSource:'LLM Knowledge', refreshInterval:0,
  data:{ headline:'Explore AI-Native Dashboards', body:'Agntdash parses natural language into structured visualizations. Running in Demo Mode — connect API keys in Settings to enable live pipelines, real-time data, and autonomous model selection.'},
  renderSpec:{ color:'#6366f1', summary:'Connect an API key to enable real-time queries.'}
};

const DEFAULT_CARDS = [
  { id:'1', prompt:'Show me Bitcoin price this week', title:'BTC / USD — 7 Day', cardType:'chart', size:'lg', dataSource:'CoinGecko API', refreshInterval:300, group:'Finance', cols:6, rows:3, data:[], renderSpec:{ chartType:'line', xField:'name', yField:'value', color:'#10b981', summary:'Connecting to CoinGecko…'}, lastFetched:null, loading:true, error:null },
  { id:'2', prompt:'Weather in London, Paris and Tokyo', title:'Global Cities Weather', cardType:'table', size:'md', dataSource:'Open-Meteo API', refreshInterval:900, group:'Finance', cols:6, rows:2, data:null, renderSpec:{ color:'#6366f1', summary:'Connecting to Open-Meteo…'}, lastFetched:null, loading:true, error:null },
  { id:'3', prompt:'My daily workout checklist', title:'Daily Fitness Tracker', cardType:'interactive', size:'sm', dataSource:'Local Memory', refreshInterval:0, group:'Personal', cols:4, rows:2, data:{ widgetType:'checklist', items:[{id:'t1',text:'5km Jog (Morning)',done:true},{id:'t2',text:'Core & Abs (20 mins)',done:false},{id:'t3',text:'Hydration Goal (3L)',done:true},{id:'t4',text:'Post-workout protein',done:false}]}, renderSpec:{ color:'#a5b4fc', summary:'50% of goals accomplished.'}, lastFetched:new Date().toISOString(), loading:false, error:null },
  { id:'4', prompt:'Countdown to New Year 2027', title:'Countdown to 2027', cardType:'interactive', size:'xs', dataSource:'Local Clock', refreshInterval:1, group:'Personal', cols:4, rows:1, data:{ widgetType:'timer', targetDate:'2027-01-01T00:00:00'}, renderSpec:{ color:'#ef4444'}, lastFetched:new Date().toISOString(), loading:false, error:null },
];

const DEFAULT_GROUPS = [
  { name:'Finance', color:'#10b981', collapsed:false },
  { name:'Personal', color:'#6366f1', collapsed:false },
  { name:'Work', color:'#a855f7', collapsed:false },
];

/* ─── APP ─── */
export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const load = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } };

  const [activeProvider, setActiveProvider] = useState(() => localStorage.getItem('agntdash_active_provider') || 'openrouter');
  const [openRouterKey, setOpenRouterKey] = useState(() => localStorage.getItem('agntdash_or_key') || '');
  const [openAIKey, setOpenAIKey] = useState(() => localStorage.getItem('agntdash_openai_key') || '');
  const [openAIBaseUrl, setOpenAIBaseUrl] = useState(() => localStorage.getItem('agntdash_openai_base_url') || 'https://api.openai.com/v1');
  const [openCodeKey, setOpenCodeKey] = useState(() => localStorage.getItem('agntdash_opencode_key') || '');
  const [openCodeBaseUrl, setOpenCodeBaseUrl] = useState(() => localStorage.getItem('agntdash_opencode_base_url') || 'https://api.opencode.go/v1');
  const [tavilyKey, setTavilyKey] = useState(() => localStorage.getItem('agntdash_tavily_key') || '');
  const [modelFast, setModelFast] = useState(() => localStorage.getItem('agntdash_model_fast') || DEFAULT_MODELS_FAST[0]);
  const [modelSmart, setModelSmart] = useState(() => localStorage.getItem('agntdash_model_smart') || DEFAULT_MODELS_SMART[0]);

  const [cards, setCards] = useState(() => load('agntdash_cards_v2', DEFAULT_CARDS));
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

  useEffect(() => { localStorage.setItem('agntdash_cards_v2', JSON.stringify(cards)); }, [cards]);
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

  useEffect(() => {
    if (cards.some(c => c.id === '1' && c.loading)) fetchCard1Direct();
    if (cards.some(c => c.id === '2' && c.loading)) fetchCard2Direct();
  }, []);

  /* ─── DIRECT API FETCHERS ─── */
  const fetchCard1Direct = async () => {
    setCards(prev => prev.map(c => c.id==='1' ? {...c, loading:true} : c));
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7&interval=daily');
      if (res.ok) {
        const json = await res.json();
        const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        const chartData = json.prices.slice(-7).map((p,i) => ({ name: days[i]||'Day', value: Math.round(p[1]) }));
        setCards(prev => prev.map(c => c.id==='1' ? { ...c, data: chartData, renderSpec: {...c.renderSpec, summary:`Live from CoinGecko. Current: $${chartData[chartData.length-1].value.toLocaleString()}`}, lastFetched: new Date().toISOString(), loading:false, error:null } : c));
        return;
      }
    } catch (e) {}
    setCards(prev => prev.map(c => c.id==='1' ? { ...c, data:[{name:'Mon',value:67200},{name:'Tue',value:67900},{name:'Wed',value:68420},{name:'Thu',value:68100},{name:'Fri',value:68900},{name:'Sat',value:69400},{name:'Sun',value:70150}], renderSpec:{...c.renderSpec, summary:'CoinGecko rate-limited. Showing historical data.'}, lastFetched:new Date().toISOString(), loading:false, error:null } : c));
  };

  const fetchCard2Direct = async () => {
    setCards(prev => prev.map(c => c.id==='2' ? {...c, loading:true} : c));
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.5074,48.8566,35.6762&longitude=-0.1278,2.3522,139.6503&current_weather=true');
      if (res.ok) {
        const json = await res.json();
        const results = Array.isArray(json) ? json : [json];
        const cities = ['London','Paris','Tokyo'];
        const rows = results.map((item,i) => {
          const t = item.current_weather?.temperature;
          const w = item.current_weather?.windspeed;
          const code = item.current_weather?.weathercode || 0;
          const cond = code >= 51 ? 'Rainy 🌧️' : code >= 1 ? 'Cloudy ⛅' : 'Sunny ☀️';
          return { City: cities[i], Temp: `${t}°C`, Condition: cond, Wind: `${w} km/h` };
        });
        setCards(prev => prev.map(c => c.id==='2' ? { ...c, data:{ headers:['City','Temp','Condition','Wind'], rows }, renderSpec:{...c.renderSpec, summary:'Live from Open-Meteo API.'}, lastFetched:new Date().toISOString(), loading:false, error:null } : c));
        return;
      }
    } catch (e) {}
    setCards(prev => prev.map(c => c.id==='2' ? { ...c, data:{ headers:['City','Temp','Condition','Wind'], rows:[{City:'London',Temp:'18°C',Condition:'Light Rain 🌧️',Wind:'14 km/h'},{City:'Paris',Temp:'22°C',Condition:'Partly Cloudy ⛅',Wind:'9 km/h'},{City:'Tokyo',Temp:'26°C',Condition:'Sunny ☀️',Wind:'12 km/h'}]}, renderSpec:{...c.renderSpec, summary:'Open-Meteo unavailable. Showing typical conditions.'}, lastFetched:new Date().toISOString(), loading:false, error:null } : c));
  };

  /* ─── SAVE SETTINGS ─── */
  const saveSettings = ({ activeProvider: ap, openRouterKey: or, openAIKey: oai, openAIBaseUrl: oaib, openCodeKey: oc, openCodeBaseUrl: ocb, tavilyKey: tv, modelFast: mf, modelSmart: ms }) => {
    setActiveProvider(ap); setOpenRouterKey(or); setOpenAIKey(oai); setOpenAIBaseUrl(oaib);
    setOpenCodeKey(oc); setOpenCodeBaseUrl(ocb); setTavilyKey(tv); setModelFast(mf); setModelSmart(ms);
    localStorage.setItem('agntdash_active_provider', ap); localStorage.setItem('agntdash_or_key', or);
    localStorage.setItem('agntdash_openai_key', oai); localStorage.setItem('agntdash_openai_base_url', oaib);
    localStorage.setItem('agntdash_opencode_key', oc); localStorage.setItem('agntdash_opencode_base_url', ocb);
    localStorage.setItem('agntdash_tavily_key', tv); localStorage.setItem('agntdash_model_fast', mf); localStorage.setItem('agntdash_model_smart', ms);
    setIsSettingsOpen(false);
  };

  /* ─── AGENT PIPELINE ─── */
  const runAgentPipeline = async (promptText, existingCardId = null) => {
    const key = activeProvider==='openrouter' ? openRouterKey : activeProvider==='openai' ? openAIKey : openCodeKey;
    const base = activeProvider==='openrouter' ? 'https://openrouter.ai/api/v1' : activeProvider==='openai' ? openAIBaseUrl : openCodeBaseUrl;
    const getGroupName = () => existingCardId ? (cards.find(c=>c.id===existingCardId)?.group || 'Personal') : 'Personal';
    const sizeToGrid = size => size==='xs'?{cols:3,rows:1}:size==='sm'?{cols:4,rows:2}:size==='md'?{cols:6,rows:2}:size==='lg'?{cols:6,rows:3}:{cols:12,rows:3};

    if (!key) {
      await new Promise(r => setTimeout(r, 1200));
      const norm = promptText.toLowerCase();
      const match = SIMULATED_RESPONSES.find(r => r.keywords.some(k => norm.includes(k)));
      const payload = match ? JSON.parse(JSON.stringify(match.response)) : JSON.parse(JSON.stringify(DEFAULT_SIMULATED));
      const { cols, rows } = sizeToGrid(payload.size);
      return { id: existingCardId || Math.random().toString(36).slice(2,9), prompt: promptText, ...payload, group: getGroupName(), cols, rows, lastFetched: new Date().toISOString(), loading: false, error: null };
    }

    try {
      let classification = { cardType:'article', size:'md', dataSource:'AI Knowledge', searchRequired:false };
      try {
        const classRes = await fetch(`${base}/chat/completions`, {
          method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${key}` },
          body: JSON.stringify({ model: modelFast, messages:[{ role:'system', content:'Classify dashboard card. Return JSON only: {"cardType":"chart|stat|article|table|map|interactive|feed|media|custom","size":"xs|sm|md|lg|xl","dataSource":"string","searchRequired":true|false}. Use "custom" when the visualization needs unique rendering that none of the standard types support well — e.g. word clouds, network graphs, Gantt charts, heatmaps, radial gauges, or highly bespoke layouts.' },{ role:'user', content:`Prompt: "${promptText}"` }], temperature: workflowConfig.classifierTemp, response_format:{ type:'json_object' } })
        });
        if (classRes.ok) { const cj = await classRes.json(); const ct = cj.choices?.[0]?.message?.content?.trim(); if (ct) { const p = JSON.parse(ct.replace(/^```json\s*/i,'').replace(/```$/,'')); if (p.cardType) classification = p; } }
      } catch (e) { console.warn('Classifier failed:', e); }

      let searchContext = '';
      if (tavilyKey && (classification.searchRequired || workflowConfig.prioritizeSearch)) {
        try {
          const tr = await fetch('https://api.tavily.com/search', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ api_key: tavilyKey, query: promptText, search_depth: workflowConfig.tavilyDepth||'basic', max_results:3 }) });
          if (tr.ok) { const tj = await tr.json(); if (tj.results) searchContext = tj.results.map(r=>`Title: ${r.title}\nSource: ${r.url}\nContent: ${r.content}`).join('\n\n'); }
        } catch (e) { console.warn('Tavily failed:', e); }
      }

      const isCustom = classification.cardType === 'custom';
      const sysPrompt = isCustom
        ? `You are a dashboard card planner that writes custom React rendering code. Return ONLY valid JSON with this exact schema: {"title":"string","cardType":"custom","size":"${classification.size}","dataSource":"string","refreshInterval":0,"data":{},"renderSpec":{"color":"#hex","summary":"string"},"renderCode":"<JS function body>"}. The "renderCode" field must be the body of a JavaScript function with signature (React, data, renderSpec) that returns a React element tree using React.createElement() — no JSX. Available CSS variables: var(--fg), var(--fg-muted), var(--fg-dim), var(--primary), var(--success), var(--danger), var(--warning), var(--border), var(--bg). The "data" field should contain structured data appropriate for the visualization. Make it visually rich, informative, and appropriate to the user's request. Keep renderCode under 60 lines.`
        : `You are a dashboard card planner. Return ONLY valid JSON with this schema: {"title":"string","cardType":"${classification.cardType}","size":"${classification.size}","dataSource":"string","refreshInterval":0,"data":{},"renderSpec":{"chartType":"line|bar|area|pie","xField":"string","yField":"string","color":"#hex","summary":"string"}}. Include rich structured data arrays. Be concise.`;

      const userMsg = searchContext ? `Prompt: ${promptText}\n\nSearch context:\n${searchContext}` : `Prompt: ${promptText}`;
      const planRes = await fetch(`${base}/chat/completions`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`}, body: JSON.stringify({ model: modelSmart, messages:[{role:'system',content:sysPrompt},{role:'user',content:userMsg}], temperature: workflowConfig.plannerTemp, response_format:{type:'json_object'} }) });
      if (!planRes.ok) throw new Error(`API error: ${planRes.statusText}`);
      const raw = await planRes.json();
      const payload = JSON.parse(raw.choices[0].message.content.trim().replace(/^```json\s*/i,'').replace(/```$/,''));
      const { cols, rows } = sizeToGrid(payload.size || classification.size);
      return { id: existingCardId || Math.random().toString(36).slice(2,9), prompt: promptText, title: payload.title||'AI Card', cardType: payload.cardType||classification.cardType, size: payload.size||classification.size, dataSource: searchContext ? 'Tavily Web Search' : (payload.dataSource||'AI Knowledge'), refreshInterval: payload.refreshInterval||0, group: getGroupName(), cols, rows, data: payload.data, renderSpec: payload.renderSpec||{}, renderCode: payload.renderCode||null, lastFetched: new Date().toISOString(), loading:false, error:null };
    } catch (err) { console.error('Pipeline error:', err); throw err; }
  };

  /* ─── HANDLERS ─── */
  const handleAddCard = async (promptText) => {
    if (!promptText.trim()) { handleAddNewCardPlaceholder(groups[0]?.name || 'Personal'); return; }
    setIsConsoleSubmitting(true);
    const tempId = Math.random().toString(36).slice(2,9);
    setCards(prev => [...prev, { id:tempId, prompt:promptText, title:'Analyzing Intent…', cardType:'article', size:'md', cols:6, rows:2, group:'Personal', loading:true, error:null }]);
    if (workflowConfig.clearOnSubmit) setConsolePrompt('');
    try {
      const card = await runAgentPipeline(promptText);
      setCards(prev => prev.map(c => c.id===tempId ? {...card, id:tempId} : c));
    } catch (err) {
      setCards(prev => prev.map(c => c.id===tempId ? {...c, title:'Error', loading:false, error:err.message||'Pipeline failed. Check API keys.'} : c));
    } finally { setIsConsoleSubmitting(false); }
  };

  const handleRefreshCard = async (cardId) => {
    if (cardId==='1') { fetchCard1Direct(); return; }
    if (cardId==='2') { fetchCard2Direct(); return; }
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

  const handleOverrideCardType = (cardId, newType) => {
    setCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      if (!workflowConfig.autoResizeOnOverride) return { ...c, cardType: newType };
      const sizeMap = { stat:{cols:3,rows:1,size:'xs'}, chart:{cols:6,rows:2,size:'md'}, table:{cols:6,rows:3,size:'lg'}, article:{cols:6,rows:2,size:'md'}, map:{cols:6,rows:3,size:'lg'}, media:{cols:4,rows:2,size:'sm'}, feed:{cols:6,rows:2,size:'md'}, interactive:{cols:4,rows:2,size:'sm'}, custom:{cols:6,rows:3,size:'lg'} };
      const dim = sizeMap[newType] || {};
      return { ...c, cardType: newType, ...(dim.cols && { cols:dim.cols, rows:dim.rows, size:dim.size }) };
    }));
  };

  const handleMoveCardGroup = (cardId, group) => setCards(prev => prev.map(c => c.id===cardId ? {...c, group} : c));

  const handleChecklistToggle = (cardId, itemId) => {
    setCards(prev => prev.map(c => {
      if (c.id!==cardId || c.data?.widgetType!=='checklist') return c;
      const items = c.data.items.map(i => i.id===itemId ? {...i, done:!i.done} : i);
      const done = items.filter(i=>i.done).length;
      return { ...c, data:{...c.data, items}, renderSpec:{...c.renderSpec, summary:`${Math.round(done/items.length*100)}% of goals accomplished.`} };
    }));
  };

  const handleConverterChange = (cardId, val) => {
    setCards(prev => prev.map(c => {
      if (c.id!==cardId || c.data?.widgetType!=='converter') return c;
      const f = parseFloat(val) || 0;
      return { ...c, data:{...c.data, initialValue:f}, renderSpec:{...c.renderSpec, summary:`${f} miles ≈ ${(f*1.60934).toFixed(2)} km.`} };
    }));
  };

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
    const id = Math.random().toString(36).slice(2,9);
    setCards(prev => [...prev, { id, prompt:'', title:'New Card', cardType:'article', size:'md', cols:6, rows:2, group:groupName, isCreating:true, loading:false, error:null, data:null, renderSpec:{} }]);
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
    onOverride: handleOverrideCardType,
    onMove: handleMoveCardGroup,
    onChecklistToggle: handleChecklistToggle,
    onConverterChange: handleConverterChange,
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
        onSave={saveSettings}
      />
    </div>
  );
}
