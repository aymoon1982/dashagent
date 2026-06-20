import React, { useState } from 'react';
import { CardStateContext } from './cardState.js';
import { SpecCard } from './cards/index.js';

// Legacy LLM-authored renderCode is the rare escape hatch now, so its heavy Babel
// transpiler is loaded on demand — it never weighs down the default bundle.
let _transpilePromise = null;
const loadTranspile = () => (_transpilePromise = _transpilePromise || import('./transpile.js'));

export function InlineCardCreator({ card, onGenerate, onCancel }) {
  const [val, setVal] = useState('');
  const suggestions = [
    'Bitcoin price this week as interactive chart',
    'Weather in London, Paris and Tokyo',
    'Top tech headlines today',
    'Daily fitness checklist',
    'Miles to km live converter',
    'Crypto portfolio allocation bars',
    'Countdown to New Year 2027',
    'Heatmap of server response times',
  ];
  const submit = e => { e.preventDefault(); if (val.trim()) onGenerate(card.id, val.trim()); };
  return (
    <div className="inline-creator">
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:6, flex:1 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'var(--primary)', display:'flex', alignItems:'center', gap:4 }}>
          <span className="material-symbols-outlined" style={{ fontSize:12 }}>bolt</span>
          Describe this card's intent:
        </div>
        <textarea
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e); } if (e.key === 'Escape') onCancel(card.id); }}
          placeholder="e.g. BTC weekly chart, weather in London, countdown timer, portfolio allocation…"
          autoFocus
        />
        <div className="inline-btns">
          <button type="submit" className="btn btn-primary btn-sm" disabled={!val.trim()} style={{ flex:1 }}>
            <span className="material-symbols-outlined">auto_awesome</span> Generate
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCancel(card.id)}>Cancel</button>
        </div>
      </form>
      <div>
        <div style={{ fontSize:9, color:'var(--fg-dim)', fontWeight:700, marginBottom:4, letterSpacing:'0.1em' }}>SUGGESTIONS</div>
        <div className="sugg-chips">
          {suggestions.map(s => <button key={s} type="button" className="sugg-chip" onClick={() => setVal(s)}>{s}</button>)}
        </div>
      </div>
    </div>
  );
}

/* ─── ERROR BOUNDARY (catches runtime errors inside LLM-generated components) ─── */
class RenderErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  componentDidCatch(err, info) { console.error('[Agntdash] Card render error:', err.message, info.componentStack?.split('\n')[1]?.trim()); }
  // Reset when the underlying code changes (e.g. after a repair/regenerate).
  componentDidUpdate(prev) { if (prev.renderCode !== this.props.renderCode && this.state.error) this.setState({ error: null }); }
  render() {
    if (this.state.error) {
      return (
        <div className="card-error">
          <span className="material-symbols-outlined">bug_report</span>
          <div className="err-title">Render Error</div>
          <div className="err-desc">{this.state.error.message}</div>
          <div style={{ display:'flex', gap:6, marginTop:6 }}>
            {this.props.onRepair && (
              <button className="btn btn-primary btn-sm" onClick={() => this.props.onRepair(this.state.error.message)}>
                <span className="material-symbols-outlined">healing</span> Repair with AI
              </button>
            )}
            {this.props.onRetry && (
              <button className="btn btn-secondary btn-sm" onClick={this.props.onRetry}>
                <span className="material-symbols-outlined">refresh</span> Retry
              </button>
            )}
          </div>
          <details style={{ fontSize:9, color:'var(--fg-dim)', marginTop:6, width:'100%' }}>
            <summary style={{ cursor:'pointer' }}>View render code</summary>
            <pre style={{ marginTop:4, whiteSpace:'pre-wrap', wordBreak:'break-all', maxHeight:120, overflow:'auto' }}>{this.props.renderCode}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── UNIVERSAL LLM RENDERER ─── */
// renderCode is a function declaration string: function CardRenderer({data, renderSpec}) { ... }
// new Function creates a real React component so React.useState / React.useEffect work.
function LLMCardRenderer({ card, onRetry, onRepair, onPersistState }) {
  const { data, renderSpec, renderCode } = card;

  // Compile once per renderCode (not every render): a fresh component identity on
  // each render would remount the subtree and wipe interactive state. The Babel
  // transpiler loads lazily, so we track a loading state while it arrives.
  const [compiled, setCompiled] = React.useState({ Comp: null, error: null, loading: !!renderCode });
  React.useEffect(() => {
    if (!renderCode) return; // initial state already reflects the no-code case
    let alive = true;
    loadTranspile()
      .then(({ compileRenderCode }) => {
        if (!alive) return;
        try { setCompiled({ Comp: compileRenderCode(renderCode), error: null, loading: false }); }
        catch (err) { setCompiled({ Comp: null, error: err.message, loading: false }); }
      })
      .catch(err => { if (alive) setCompiled({ Comp: null, error: err.message, loading: false }); });
    return () => { alive = false; };
  }, [renderCode]);

  // Stable persistence bridge for useCardState (state lives on the card).
  const stateCtx = React.useMemo(() => ({
    state: card.state || {},
    persist: (key, value) => onPersistState && onPersistState(card.id, key, value),
  }), [card.state, card.id, onPersistState]);

  if (!renderCode) {
    return (
      <div className="card-error">
        <span className="material-symbols-outlined">code_off</span>
        <div className="err-title">No Render Code</div>
        <div className="err-desc">The model didn't return a renderCode function. Try regenerating this card.</div>
        {onRetry && (
          <button className="btn btn-secondary btn-sm err-retry" onClick={onRetry}>
            <span className="material-symbols-outlined">refresh</span> Retry
          </button>
        )}
      </div>
    );
  }

  if (compiled.error) {
    return (
      <div className="card-error">
        <span className="material-symbols-outlined">syntax_error</span>
        <div className="err-title">Compile Error</div>
        <div className="err-desc">{compiled.error}</div>
        <div style={{ display:'flex', gap:6, marginTop:6 }}>
          {onRepair && (
            <button className="btn btn-primary btn-sm" onClick={() => onRepair(compiled.error)}>
              <span className="material-symbols-outlined">healing</span> Repair with AI
            </button>
          )}
          {onRetry && (
            <button className="btn btn-secondary btn-sm" onClick={onRetry}>
              <span className="material-symbols-outlined">refresh</span> Retry
            </button>
          )}
        </div>
        <details style={{ fontSize:9, color:'var(--fg-dim)', marginTop:6, width:'100%' }}>
          <summary style={{ cursor:'pointer' }}>View render code</summary>
          <pre style={{ marginTop:4, whiteSpace:'pre-wrap', wordBreak:'break-all', maxHeight:120, overflow:'auto' }}>{renderCode}</pre>
        </details>
      </div>
    );
  }

  if (compiled.loading || (!compiled.Comp && !compiled.error)) {
    return (
      <div className="card-loading">
        <span className="material-symbols-outlined spinning" style={{ fontSize:22, color:'var(--primary)', opacity:0.7 }}>progress_activity</span>
      </div>
    );
  }

  const { Comp } = compiled;
  return (
    <RenderErrorBoundary renderCode={renderCode} onRetry={onRetry} onRepair={onRepair}>
      <CardStateContext.Provider value={stateCtx}>
        {React.createElement(
          'div',
          { style: { height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' } },
          React.createElement(Comp, { data, renderSpec })
        )}
      </CardStateContext.Provider>
    </RenderErrorBoundary>
  );
}

/* ─── CLASSIFY PIPELINE ERROR for friendlier titles/icons ─── */
function classifyError(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('no api key') || m.includes('open settings'))
    return { icon:'key_off', title:'No API Key', color:'var(--warning)' };
  if (m.includes('401') || m.includes('unauthorized') || m.includes('authentication') || m.includes('invalid key'))
    return { icon:'lock', title:'Authentication Failed', color:'var(--danger)' };
  if (m.includes('402') || m.includes('payment') || m.includes('billing') || m.includes('quota exceeded'))
    return { icon:'credit_card_off', title:'Billing / Quota', color:'var(--danger)' };
  if (m.includes('429') || m.includes('rate limit') || m.includes('too many request'))
    return { icon:'hourglass_empty', title:'Rate Limited', color:'var(--warning)' };
  if (m.includes('503') || m.includes('502') || m.includes('500') || m.includes('server error'))
    return { icon:'cloud_off', title:'Server Error', color:'var(--danger)' };
  if (m.includes('non-json') || m.includes('json') || m.includes('parse'))
    return { icon:'code_off', title:'Bad Model Response', color:'var(--warning)' };
  if (m.includes('empty response'))
    return { icon:'question_mark', title:'Empty Response', color:'var(--fg-dim)' };
  if (m.includes('fetch') || m.includes('network') || m.includes('failed to fetch'))
    return { icon:'wifi_off', title:'Network Error', color:'var(--danger)' };
  return { icon:'warning', title:'Generation Failed', color:'var(--warning)' };
}

export function CardBody({ card, onRetry, onRepair, onPersistState }) {
  if (card.loading) {
    return (
      <div className="card-loading">
        <span className="material-symbols-outlined spinning" style={{ fontSize:28, color:'var(--primary)', opacity:0.75 }}>psychology</span>
        <div className="sk-bars">
          <div className="sk-bar" style={{ width:'100%' }} />
          <div className="sk-bar" style={{ width:'70%' }} />
          <div className="sk-bar" style={{ width:'50%' }} />
        </div>
      </div>
    );
  }
  if (card.error) {
    const { icon, title, color } = classifyError(card.error);
    return (
      <div className="card-error">
        <span className="material-symbols-outlined" style={{ color }}>{icon}</span>
        <div className="err-title" style={{ color }}>{title}</div>
        <div className="err-desc">{card.error}</div>
        {onRetry && (
          <button className="btn btn-secondary btn-sm err-retry" onClick={onRetry}>
            <span className="material-symbols-outlined">refresh</span> Retry
          </button>
        )}
      </div>
    );
  }
  // New default path: declarative spec → typed, library-backed component (no eval).
  if (card.spec) return <SpecCard card={card} onRetry={onRetry} onPersistState={onPersistState} />;
  // Legacy escape hatch: LLM-authored renderCode (kept for the bespoke long tail).
  return <LLMCardRenderer card={card} onRetry={onRetry} onRepair={onRepair} onPersistState={onPersistState} />;
}
