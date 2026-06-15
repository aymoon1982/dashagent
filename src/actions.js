/*
 * Action tools (Task 5) — write capability for generated cards.
 *
 * Components call `runAction(actionId, payload)` (injected into their scope). It
 * returns a Promise and ALWAYS routes through a user confirmation in the host
 * before anything executes; on confirm the host POSTs to the data proxy's
 * /actions/:id (which echoes by default and performs real side effects only when
 * connectors are wired + reviewed). If no dispatcher is registered (no proxy),
 * it rejects.
 */
let _dispatch = null;

export function setActionDispatcher(fn) { _dispatch = fn; }

export function runAction(actionId, payload = {}) {
  if (typeof _dispatch !== 'function') {
    return Promise.reject(new Error('Actions are unavailable (configure a data proxy).'));
  }
  return _dispatch(String(actionId || ''), payload);
}
