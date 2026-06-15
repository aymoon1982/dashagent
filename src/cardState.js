import React from 'react';

/*
 * Card interaction-state persistence.
 *
 * Generated components used plain React.useState for things like checklist ticks,
 * notes text, counters and toggles — which evaporated on reload (and even on some
 * parent re-renders). `useCardState` is handed into every generated component so
 * that interactive state reads/writes the card's saved `state` via the host,
 * surviving reloads. It behaves like useState but is keyed and persisted.
 *
 *   const [done, setDone] = useCardState('done', []);   // inside CardRenderer
 */
export const CardStateContext = React.createContext(null);

export function useCardState(key, initial) {
  const ctx = React.useContext(CardStateContext);
  const [val, setVal] = React.useState(() => {
    const saved = ctx && ctx.state ? ctx.state[key] : undefined;
    return saved !== undefined ? saved : initial;
  });
  const set = React.useCallback((next) => {
    setVal(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      if (ctx && ctx.persist) ctx.persist(key, resolved);
      return resolved;
    });
  }, [key, ctx]);
  return [val, set];
}
