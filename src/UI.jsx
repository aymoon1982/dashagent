import { useState, useEffect } from 'react';

const DEFAULT_MODELS_FAST = ['google/gemini-2.5-flash','meta-llama/llama-3.3-70b-instruct:free','openai/gpt-4o-mini','anthropic/claude-3-haiku'];
const DEFAULT_MODELS_SMART = ['anthropic/claude-3.5-sonnet','google/gemini-2.5-pro','openai/gpt-4o','deepseek/deepseek-chat'];

/* ─── APP HEADER ─── */
export function AppHeader({ activeView, setActiveView, isApiConnected, onOpenSettings, onRefreshAll }) {
  return (
    <header className="header">
      <div className="logo">
        <div className="logo-icon"><span className="material-symbols-outlined">grid_view</span></div>
        <div className="logo-wordmark">
          <span className="logo-name">Agntdash</span>
          <span className="logo-sub">v2 · Personal Lab</span>
        </div>
      </div>

      <div className="view-tabs">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
          { id: 'pipeline', label: 'Pipeline', icon: 'account_tree' }
        ].map(tab => (
          <button key={tab.id} className={`view-tab ${activeView === tab.id ? 'active' : ''}`} onClick={() => setActiveView(tab.id)}>
            <span className="material-symbols-outlined">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="header-right">
        <div className={`status-pill ${isApiConnected ? 'live' : 'demo'}`}>
          <div className={`s-dot ${isApiConnected ? 'pulse' : ''}`}></div>
          {isApiConnected ? 'Connected' : 'Demo Mode'}
        </div>
        <button className="icon-btn" onClick={onRefreshAll} title="Refresh all cards">
          <span className="material-symbols-outlined">refresh</span>
        </button>
        <button className="icon-btn" onClick={onOpenSettings} title="Settings & API keys">
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>
    </header>
  );
}

/* ─── SETTINGS DRAWER ─── */
export function SettingsDrawer({ isOpen, onClose, activeProvider, openRouterKey, openAIKey, openAIBaseUrl, openCodeKey, openCodeBaseUrl, tavilyKey, modelFast, modelSmart, envSources = {}, onSave }) {
  const [localProvider, setLocalProvider] = useState(activeProvider);
  const [localORKey, setLocalORKey] = useState(openRouterKey);
  const [localOAIKey, setLocalOAIKey] = useState(openAIKey);
  const [localOAIBase, setLocalOAIBase] = useState(openAIBaseUrl);
  const [localOCKey, setLocalOCKey] = useState(openCodeKey);
  const [localOCBase, setLocalOCBase] = useState(openCodeBaseUrl);
  const [localTavily, setLocalTavily] = useState(tavilyKey);
  const [localFast, setLocalFast] = useState(modelFast);
  const [localSmart, setLocalSmart] = useState(modelSmart);
  const [fetchedModels, setFetchedModels] = useState([]);
  const [fetchStatus, setFetchStatus] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalProvider(activeProvider); setLocalORKey(openRouterKey);
      setLocalOAIKey(openAIKey); setLocalOAIBase(openAIBaseUrl);
      setLocalOCKey(openCodeKey); setLocalOCBase(openCodeBaseUrl);
      setLocalTavily(tavilyKey); setLocalFast(modelFast); setLocalSmart(modelSmart);
    }
  }, [isOpen]);

  // Derive whether the active provider's key is missing
  const activeKeyMissing = (() => {
    if (localProvider === 'openrouter') return !localORKey;
    if (localProvider === 'openai')     return !localOAIKey;
    if (localProvider === 'opencode')   return !localOCKey;
    return false;
  })();

  const ENV_VAR_NAMES = {
    openRouterKey: 'VITE_OPENROUTER_KEY',
    openAIKey: 'VITE_OPENAI_KEY',
    openAIBaseUrl: 'VITE_OPENAI_BASE_URL',
    openCodeKey: 'VITE_OPENCODE_KEY',
    openCodeBaseUrl: 'VITE_OPENCODE_BASE_URL',
    tavilyKey: 'VITE_TAVILY_KEY',
    modelFast: 'VITE_MODEL_FAST',
    modelSmart: 'VITE_MODEL_SMART',
  };

  // Render an input that is read-only when backed by an env var
  const EnvInput = ({ type = 'text', envKey, value, onChange, placeholder }) => {
    const locked = !!envSources[envKey];
    return (
      <div className="env-input-wrap">
        <input
          type={locked ? 'text' : type}
          className={`form-in${locked ? ' env-locked' : ''}`}
          value={locked ? '••••••••••••  (from env)' : value}
          onChange={locked ? undefined : onChange}
          placeholder={placeholder}
          readOnly={locked}
        />
        {locked && (
          <span className="env-badge" title={`Set via ${ENV_VAR_NAMES[envKey]} environment variable`}>
            <span className="material-symbols-outlined" style={{ fontSize:10 }}>lock</span>ENV
          </span>
        )}
      </div>
    );
  };

  const fetchModels = async () => {
    const key = localProvider==='openrouter' ? localORKey : localProvider==='openai' ? localOAIKey : localOCKey;
    const base = localProvider==='openrouter' ? 'https://openrouter.ai/api/v1' : localProvider==='openai' ? localOAIBase : localOCBase;
    if (!key) { setFetchStatus('⚠ Enter an API key first'); return; }
    setIsFetching(true); setFetchStatus('Fetching models...');
    try {
      const res = await fetch(`${base}/models`, { headers: { 'Authorization': `Bearer ${key}` } });
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      const models = (json.data || json.models || []).map(m => m.id || m.name).filter(Boolean).slice(0, 80);
      setFetchedModels(models);
      setFetchStatus(`✓ ${models.length} models loaded`);
    } catch (e) {
      setFetchStatus(`✗ ${e.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = () => {
    onSave({ activeProvider: localProvider, openRouterKey: localORKey, openAIKey: localOAIKey, openAIBaseUrl: localOAIBase, openCodeKey: localOCKey, openCodeBaseUrl: localOCBase, tavilyKey: localTavily, modelFast: localFast, modelSmart: localSmart });
  };

  const allFastModels = fetchedModels.length > 0 ? fetchedModels : DEFAULT_MODELS_FAST;
  const allSmartModels = fetchedModels.length > 0 ? fetchedModels : DEFAULT_MODELS_SMART;

  if (!isOpen) return null;
  return (
    <div>
      <div className="settings-overlay" onClick={onClose} />
      <div className="settings-drawer">
        <div className="settings-hd">
          <div>
            <h3>Settings</h3>
            <div style={{ fontSize:11, color:'var(--fg-dim)', marginTop:2 }}>API connections &amp; model configuration</div>
          </div>
          <button className="icon-btn" onClick={onClose}><span className="material-symbols-outlined">close</span></button>
        </div>

        <div className="settings-bd">
          {/* Missing key banner — shown when no LLM key is configured for active provider */}
          {activeKeyMissing && (
            <div className="settings-missing-key">
              <span className="material-symbols-outlined" style={{ fontSize:18, flexShrink:0 }}>key_off</span>
              <div>
                <div className="smk-title">No API key configured</div>
                <div className="smk-desc">
                  Add{' '}
                  <code>{localProvider === 'openrouter' ? 'VITE_OPENROUTER_KEY' : localProvider === 'openai' ? 'VITE_OPENAI_KEY' : 'VITE_OPENCODE_KEY'}</code>
                  {' '}to your <code>.env.local</code> file, or enter the key below to use live AI generation. Without a key, the dashboard runs in Demo Mode with simulated responses.
                </div>
              </div>
            </div>
          )}

          <div className="settings-sec">
            <h4>LLM Provider</h4>
            <div className="prov-tabs">
              {[{id:'openrouter',label:'OpenRouter'},{id:'openai',label:'OpenAI / Custom'},{id:'opencode',label:'OpenCode Go'}].map(p => (
                <button key={p.id} className={`prov-tab ${localProvider===p.id?'active':''}`} onClick={() => !envSources.activeProvider && setLocalProvider(p.id)} style={{ opacity: envSources.activeProvider && localProvider !== p.id ? 0.45 : 1 }}>{p.label}</button>
              ))}
            </div>
            {envSources.activeProvider && (
              <div className="env-notice"><span className="material-symbols-outlined" style={{fontSize:11}}>lock</span> Provider locked by <code>VITE_ACTIVE_PROVIDER</code></div>
            )}
            {localProvider === 'openrouter' && (
              <div className="form-g">
                <label className="form-lbl">OpenRouter API Key</label>
                <EnvInput type="password" envKey="openRouterKey" value={localORKey} onChange={e => setLocalORKey(e.target.value)} placeholder="sk-or-..." />
                {!envSources.openRouterKey && <div className="form-help">Get at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">openrouter.ai/keys</a> · or set <code>VITE_OPENROUTER_KEY</code> in <code>.env.local</code></div>}
              </div>
            )}
            {localProvider === 'openai' && (
              <>
                <div className="form-g">
                  <label className="form-lbl">API Key</label>
                  <EnvInput type="password" envKey="openAIKey" value={localOAIKey} onChange={e => setLocalOAIKey(e.target.value)} placeholder="sk-..." />
                  {!envSources.openAIKey && <div className="form-help">Set <code>VITE_OPENAI_KEY</code> in <code>.env.local</code></div>}
                </div>
                <div className="form-g">
                  <label className="form-lbl">Base URL</label>
                  <EnvInput envKey="openAIBaseUrl" value={localOAIBase} onChange={e => setLocalOAIBase(e.target.value)} />
                </div>
              </>
            )}
            {localProvider === 'opencode' && (
              <>
                <div className="form-g">
                  <label className="form-lbl">API Key</label>
                  <EnvInput type="password" envKey="openCodeKey" value={localOCKey} onChange={e => setLocalOCKey(e.target.value)} placeholder="Key for OpenCode Go..." />
                  {!envSources.openCodeKey && <div className="form-help">Set <code>VITE_OPENCODE_KEY</code> in <code>.env.local</code></div>}
                </div>
                <div className="form-g">
                  <label className="form-lbl">Base URL</label>
                  <EnvInput envKey="openCodeBaseUrl" value={localOCBase} onChange={e => setLocalOCBase(e.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="settings-sec">
            <h4>Models</h4>
            <div className="fetch-row">
              <span className={`fetch-status ${fetchStatus.startsWith('✓')?'fetch-ok':fetchStatus.startsWith('✗')?'fetch-err':'fetch-info'}`}>
                {fetchStatus || 'Click to load available models'}
              </span>
              <button className="btn btn-secondary btn-sm" onClick={fetchModels} disabled={isFetching}>
                <span className="material-symbols-outlined" style={{ animation: isFetching ? 'spin 1.5s linear infinite' : 'none' }}>refresh</span>
                {isFetching ? 'Loading...' : 'Fetch Models'}
              </button>
            </div>
            <div className="models-grid">
              <div className="form-g">
                <label className="form-lbl">Classifier (Fast)</label>
                {envSources.modelFast
                  ? <div className="env-input-wrap"><input className="form-in env-locked" value={localFast} readOnly /><span className="env-badge"><span className="material-symbols-outlined" style={{fontSize:10}}>lock</span>ENV</span></div>
                  : <select className="form-sel" value={localFast} onChange={e => setLocalFast(e.target.value)}>
                      {allFastModels.map(m => <option key={m} value={m}>{m}</option>)}
                      {!allFastModels.includes(localFast) && <option value={localFast}>{localFast}</option>}
                    </select>}
              </div>
              <div className="form-g">
                <label className="form-lbl">Planner (Smart)</label>
                {envSources.modelSmart
                  ? <div className="env-input-wrap"><input className="form-in env-locked" value={localSmart} readOnly /><span className="env-badge"><span className="material-symbols-outlined" style={{fontSize:10}}>lock</span>ENV</span></div>
                  : <select className="form-sel" value={localSmart} onChange={e => setLocalSmart(e.target.value)}>
                      {allSmartModels.map(m => <option key={m} value={m}>{m}</option>)}
                      {!allSmartModels.includes(localSmart) && <option value={localSmart}>{localSmart}</option>}
                    </select>}
              </div>
            </div>
          </div>

          <div className="settings-sec">
            <h4>Web Search</h4>
            <div className="form-g">
              <label className="form-lbl">Tavily API Key</label>
              <EnvInput type="password" envKey="tavilyKey" value={localTavily} onChange={e => setLocalTavily(e.target.value)} placeholder="tvly-..." />
              {!envSources.tavilyKey && <div className="form-help">Enables real-time web search. Get at <a href="https://tavily.com" target="_blank" rel="noreferrer">tavily.com</a> · or set <code>VITE_TAVILY_KEY</code></div>}
            </div>
          </div>
        </div>

        <div className="settings-ft">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            <span className="material-symbols-outlined">save</span> Save Connection
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── PIPELINE VIEW ─── */
const STAGES = [
  { id:0, icon:'edit_note', label:'Prompt Input', sub:'Natural language intent', color:'#6366f1' },
  { id:1, icon:'psychology', label:'Intent Classifier', sub:'Fast model routing', color:'#a855f7' },
  { id:2, icon:'travel_explore', label:'Data Router', sub:'APIs · Search · LLM', color:'#10b981' },
  { id:3, icon:'palette', label:'Render Planner', sub:'Smart model output', color:'#f59e0b' },
  { id:4, icon:'tune', label:'User Override', sub:'Format switching', color:'#ec4899' },
  { id:5, icon:'grid_view', label:'CSS Grid', sub:'Dense auto-placement', color:'#6366f1' }
];

export function PipelineView({ workflowConfig, setWorkflowConfig, modelFast, modelSmart, activeProvider, isApiConnected, hasTavily }) {
  const [sel, setSel] = useState(0);
  const cfg = workflowConfig;
  const set = (k, v) => setWorkflowConfig(prev => ({ ...prev, [k]: v }));
  const stage = STAGES[sel];

  const stageActive = id => {
    if (id === 0 || id === 4 || id === 5) return true;
    if (id === 1 || id === 3) return isApiConnected;
    if (id === 2) return isApiConnected || hasTavily;
    return false;
  };

  const renderConfig = () => {
    switch (sel) {
      case 0: return (
        <>
          <div className="cfg-row">
            <span className="cfg-lbl">Clear input after submit</span>
            <button className={`toggle ${cfg.clearOnSubmit?'on':'off'}`} onClick={() => set('clearOnSubmit', !cfg.clearOnSubmit)}>{cfg.clearOnSubmit?'✓ Enabled':'Disabled'}</button>
          </div>
          <div className="cfg-row">
            <span className="cfg-lbl">Show preset suggestion chips</span>
            <button className={`toggle ${cfg.enableAutocomplete?'on':'off'}`} onClick={() => set('enableAutocomplete', !cfg.enableAutocomplete)}>{cfg.enableAutocomplete?'✓ Enabled':'Disabled'}</button>
          </div>
          <div className="cfg-io"><strong>Output:</strong> Raw text string → Stage 2 Intent Classifier</div>
        </>
      );
      case 1: return (
        <>
          <div className="cfg-row">
            <span className="cfg-lbl">Classifier model</span>
            <span className="model-tag" title={modelFast}>{modelFast}</span>
          </div>
          <div className="cfg-row">
            <span className="cfg-lbl">Temperature <strong style={{ color:'var(--fg)' }}>{cfg.classifierTemp.toFixed(2)}</strong></span>
            <input type="range" className="range" min="0" max="1" step="0.05" value={cfg.classifierTemp} onChange={e => set('classifierTemp', parseFloat(e.target.value))} />
          </div>
          <div className="cfg-row">
            <span className="cfg-lbl">Cache TTL <strong style={{ color:'var(--fg)' }}>{cfg.classifierCacheTtl}s</strong></span>
            <input type="range" className="range" min="0" max="3600" step="60" value={cfg.classifierCacheTtl} onChange={e => set('classifierCacheTtl', parseInt(e.target.value))} />
          </div>
          <div className="cfg-io"><strong>Output:</strong> cardType · size · dataSource · searchRequired → Stage 3</div>
        </>
      );
      case 2: return (
        <>
          <div className="cfg-row">
            <span className="cfg-lbl">Force web search on all prompts</span>
            <button className={`toggle ${cfg.prioritizeSearch?'on':'off'}`} onClick={() => set('prioritizeSearch', !cfg.prioritizeSearch)}>{cfg.prioritizeSearch?'✓ Enabled':'Disabled'}</button>
          </div>
          <div className="cfg-row">
            <span className="cfg-lbl">Tavily search depth</span>
            <select className="cfg-select" value={cfg.tavilyDepth} onChange={e => set('tavilyDepth', e.target.value)}>
              <option value="basic">Basic</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="cfg-row">
            <span className="cfg-lbl">Allow parametric (LLM knowledge) fallback</span>
            <button className={`toggle ${cfg.allowParametricFallback?'on':'off'}`} onClick={() => set('allowParametricFallback', !cfg.allowParametricFallback)}>{cfg.allowParametricFallback?'✓ Enabled':'Disabled'}</button>
          </div>
          <div className="cfg-io"><strong>Status:</strong> Tavily key {hasTavily ? '✓ Connected' : '✗ Not configured'} · {isApiConnected ? `${activeProvider} LLM active` : 'Simulation mode'}</div>
        </>
      );
      case 3: return (
        <>
          <div className="cfg-row">
            <span className="cfg-lbl">Planner model</span>
            <span className="model-tag" title={modelSmart}>{modelSmart}</span>
          </div>
          <div className="cfg-row">
            <span className="cfg-lbl">Planner temperature <strong style={{ color:'var(--fg)' }}>{cfg.plannerTemp.toFixed(2)}</strong></span>
            <input type="range" className="range" min="0" max="1" step="0.05" value={cfg.plannerTemp} onChange={e => set('plannerTemp', parseFloat(e.target.value))} />
          </div>
          <div className="cfg-io"><strong>Output:</strong> JSON with title · cardType · size · data · renderSpec → Stage 4</div>
        </>
      );
      case 4: return (
        <>
          <div className="cfg-row">
            <span className="cfg-lbl">Auto-resize card when format changes</span>
            <button className={`toggle ${cfg.autoResizeOnOverride?'on':'off'}`} onClick={() => set('autoResizeOnOverride', !cfg.autoResizeOnOverride)}>{cfg.autoResizeOnOverride?'✓ Enabled':'Disabled'}</button>
          </div>
          <div className="cfg-row">
            <span className="cfg-lbl">Allow raw JSON edit mode</span>
            <button className={`toggle ${cfg.allowRawJsonEdit?'on':'off'}`} onClick={() => set('allowRawJsonEdit', !cfg.allowRawJsonEdit)}>{cfg.allowRawJsonEdit?'✓ Enabled':'Disabled'}</button>
          </div>
          <div className="cfg-io"><strong>Formats:</strong> chart · stat · article · table · map · interactive · feed · media — user can switch any card to any compatible format instantly</div>
        </>
      );
      case 5: return (
        <>
          <div className="cfg-row">
            <span className="cfg-lbl">Dense grid packing</span>
            <button className={`toggle ${cfg.densePacking?'on':'off'}`} onClick={() => set('densePacking', !cfg.densePacking)}>{cfg.densePacking?'✓ Enabled':'Disabled'}</button>
          </div>
          <div className="cfg-row">
            <span className="cfg-lbl">Default sort order</span>
            <select className="cfg-select" value={cfg.defaultSortOrder} onChange={e => set('defaultSortOrder', e.target.value)}>
              <option value="none">None (manual)</option>
              <option value="size-desc">Largest first</option>
              <option value="size-asc">Smallest first</option>
            </select>
          </div>
          <div className="cfg-row">
            <span className="cfg-lbl">Grid snap unit <strong style={{ color:'var(--fg)' }}>{cfg.gridSnapUnit}px</strong></span>
            <input type="range" className="range" min="4" max="32" step="4" value={cfg.gridSnapUnit} onChange={e => set('gridSnapUnit', parseInt(e.target.value))} />
          </div>
          <div className="cfg-io"><strong>Layout:</strong> 12-column CSS grid, <code>grid-auto-flow: dense</code> fills gaps automatically when cards vary in size</div>
        </>
      );
      default: return null;
    }
  };

  return (
    <div className="main-content fade-in">
      <div className="pipeline-hd">
        <h2>
          <span className="material-symbols-outlined" style={{ fontSize:22 }}>account_tree</span>
          Agent Pipeline Workflow
        </h2>
        <p>Each card runs its own isolated multi-agent pipeline. Click a stage to configure it. Changes take effect on the next card generation.</p>
      </div>

      <div className="pipeline-diagram-scroll">
        <div className="pipeline-diagram">
          {STAGES.map((s, i) => {
            const active = stageActive(s.id);
            const selected = sel === s.id;
            return (
              <div key={s.id} style={{ display:'flex', alignItems:'center' }}>
                <div className="pipe-node" onClick={() => setSel(s.id)}>
                  <div className={`pipe-card${selected?' on':''}`} style={{ borderColor: selected ? s.color : `${s.color}33`, boxShadow: selected ? `0 0 20px ${s.color}30` : 'none' }}>
                    <span className={`pipe-ico material-symbols-outlined`} style={{ color: active ? s.color : 'var(--fg-dim)' }}>{s.icon}</span>
                    <div className="pipe-label">{s.label}</div>
                    <div className="pipe-sub">{s.sub}</div>
                    <div className="pipe-sdot" style={{ background: active ? s.color : 'var(--fg-dim)', boxShadow: active ? `0 0 6px ${s.color}` : 'none' }} />
                  </div>
                  <div style={{ fontSize:9, color: selected ? s.color : 'var(--fg-dim)', marginTop:5, fontWeight:700 }}>Stage {s.id+1}</div>
                </div>
                {i < STAGES.length - 1 && (
                  <div className="pipe-conn">
                    <svg><line x1="0" y1="7" x2="22" y2="7" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="3,2" /><polygon points="22,4 28,7 22,10" fill="rgba(255,255,255,0.2)" /></svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pipe-config">
        <div className="pipe-config-hd">
          <div style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:`${stage.color}20`, border:`1px solid ${stage.color}44` }}>
            <span className="material-symbols-outlined" style={{ fontSize:20, color:stage.color }}>{stage.icon}</span>
          </div>
          <div>
            <h3>Stage {stage.id+1} · {stage.label}</h3>
            <p>{stage.sub}</p>
          </div>
          <div style={{ marginLeft:'auto' }}>
            <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:999, border:'1px solid', color: stageActive(stage.id) ? 'var(--success)' : 'var(--fg-dim)', borderColor: stageActive(stage.id) ? 'rgba(16,185,129,0.35)' : 'var(--border)', background: stageActive(stage.id) ? 'rgba(16,185,129,0.1)' : 'transparent' }}>
              {stageActive(stage.id) ? '● Active' : '○ Inactive'}
            </span>
          </div>
        </div>
        <div className="pipe-config-bd">{renderConfig()}</div>
      </div>
    </div>
  );
}
