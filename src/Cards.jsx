import React, { useState } from 'react';

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

/* ─── UNIVERSAL LLM RENDERER ─── */
// renderCode is a JS function declaration: function CardRenderer({data, renderSpec}) { ... }
// Executed via: new Function('React', '"use strict"; return (' + renderCode + ')')(React)
// This returns a React component that can use React.useState / React.useEffect.
function LLMCardRenderer({ card }) {
  const { data, renderSpec, renderCode } = card;
  if (!renderCode) {
    return (
      <div className="card-error">
        <span className="material-symbols-outlined">code_off</span>
        <div className="err-title">No render code</div>
        <div className="err-desc">This card has no rendering code. Try regenerating it.</div>
      </div>
    );
  }
  try {
    // eslint-disable-next-line no-new-func
    const Comp = new Function('React', '"use strict"; return (' + renderCode + ')')(React);
    return React.createElement(
      'div',
      { style: { height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' } },
      React.createElement(Comp, { data, renderSpec })
    );
  } catch (err) {
    return (
      <div className="card-error">
        <span className="material-symbols-outlined">warning</span>
        <div className="err-title">Render Error</div>
        <div className="err-desc">{err.message}</div>
        <details style={{ fontSize:9, color:'var(--fg-dim)', marginTop:4 }}>
          <summary style={{ cursor:'pointer' }}>View render code</summary>
          <pre style={{ marginTop:4, whiteSpace:'pre-wrap', wordBreak:'break-all', maxHeight:100, overflow:'auto' }}>{renderCode}</pre>
        </details>
      </div>
    );
  }
}

export function CardBody({ card }) {
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
    return (
      <div className="card-error">
        <span className="material-symbols-outlined">warning</span>
        <div className="err-title">Pipeline Failed</div>
        <div className="err-desc">{card.error}</div>
      </div>
    );
  }
  return <LLMCardRenderer card={card} />;
}
