import React from 'react';
import { CardStateContext } from '../cardState.js';
import { CARD_TYPES, validateProps } from './registry.js';
import { applyAdapter } from './adapters.js';

/*
 * SpecCard — the new default renderer.
 *
 * It takes a declarative card spec + the host-resolved data and renders the
 * matching typed component. There is NO code transpilation and NO eval: the spec
 * only names a registered type and supplies (or adapts) props. This is what makes
 * the new path fast (no Babel), safe (no `new Function`), and reliable (the
 * components are pre-tested; only data varies).
 */

class SpecErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(prev) { if (prev.signature !== this.props.signature && this.state.error) this.setState({ error: null }); }
  render() {
    if (this.state.error) {
      return (
        <div className="card-error">
          <span className="material-symbols-outlined">bug_report</span>
          <div className="err-title">Render Error</div>
          <div className="err-desc">{this.state.error.message}</div>
          {this.props.onRetry && <button className="btn btn-secondary btn-sm err-retry" onClick={this.props.onRetry}><span className="material-symbols-outlined">refresh</span> Retry</button>}
        </div>
      );
    }
    return this.props.children;
  }
}

export function SpecCard({ card, onRetry, onPersistState }) {
  const { spec, data } = card;

  const stateCtx = React.useMemo(() => ({
    state: card.state || {},
    persist: (key, value) => onPersistState && onPersistState(card.id, key, value),
  }), [card.state, card.id, onPersistState]);

  if (!spec || !spec.type) {
    return (
      <div className="card-error">
        <span className="material-symbols-outlined">code_off</span>
        <div className="err-title">No Card Spec</div>
        <div className="err-desc">The model didn't return a valid card spec. Try regenerating.</div>
        {onRetry && <button className="btn btn-secondary btn-sm err-retry" onClick={onRetry}><span className="material-symbols-outlined">refresh</span> Retry</button>}
      </div>
    );
  }

  const def = CARD_TYPES[spec.type];
  if (!def) {
    return (
      <div className="card-error">
        <span className="material-symbols-outlined">category</span>
        <div className="err-title">Unknown Card Type</div>
        <div className="err-desc">"{spec.type}" is not in the catalog.</div>
        {onRetry && <button className="btn btn-secondary btn-sm err-retry" onClick={onRetry}><span className="material-symbols-outlined">refresh</span> Retry</button>}
      </div>
    );
  }

  // Adapter turns resolved data into props; coerce/validate against the type schema.
  const rawProps = applyAdapter(spec, data || {});
  const accent = spec.accent || card.renderSpec?.color || rawProps.accent;
  const { props } = validateProps(spec.type, { ...rawProps, accent });
  const Comp = def.component;
  const signature = `${spec.type}|${card.lastFetched || ''}`;

  return (
    <SpecErrorBoundary signature={signature} onRetry={onRetry}>
      <CardStateContext.Provider value={stateCtx}>
        <div style={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Comp {...props} accent={accent} />
        </div>
      </CardStateContext.Provider>
    </SpecErrorBoundary>
  );
}
