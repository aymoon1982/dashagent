import * as Babel from '@babel/standalone';
import React from 'react';

/*
 * Compiles an LLM-authored CardRenderer into a live React component.
 *
 * The model now writes natural JSX (its strongest output mode) instead of
 * hand-written React.createElement() calls. We transpile that JSX in the
 * browser with Babel's classic runtime, injecting React into scope so the
 * generated React.createElement() references resolve.
 *
 * Accepts either:
 *   function CardRenderer({ data, renderSpec }) { return (<div/>); }
 *   const CardRenderer = ({ data }) => (<div/>);
 *
 * Throws on transpile/eval failure so callers can show an error or repair.
 */
export function compileRenderCode(renderCode) {
  if (!renderCode || typeof renderCode !== 'string') {
    throw new Error('No renderCode provided');
  }

  let transformed;
  try {
    transformed = Babel.transform(renderCode, {
      presets: [['react', { runtime: 'classic' }]],
      sourceType: 'script',
    }).code;
  } catch (err) {
    throw new Error(`JSX transpile failed: ${err.message}`, { cause: err });
  }

  const factory = new Function('React', `${transformed}\nreturn CardRenderer;`);
  const Comp = factory(React);
  if (typeof Comp !== 'function') {
    throw new Error('renderCode did not define a CardRenderer function');
  }
  return Comp;
}

/* Lightweight check used at generation time to catch broken code early. */
export function validateRenderCode(renderCode) {
  try {
    compileRenderCode(renderCode);
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
