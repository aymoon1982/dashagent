import * as Babel from '@babel/standalone';
import React from 'react';
import { safeFetch } from './dataLayer.js';
import { useCardState } from './cardState.js';
import { runAction } from './actions.js';

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

  // Defense-in-depth. A card MAY fetch live data in useEffect, so we hand it a
  // sanctioned `fetch` (allowlist-enforced, with a timeout) instead of the raw one.
  // Everything that could read/exfiltrate secrets is shadowed to undefined:
  // storage (where API keys live), window/document/global object, raw network, and
  // the Function constructor. So even an injected component can't reach the keys.
  // NOTE: hardening, not a true sandbox — a determined constructor-chain escape is
  // still possible; a worker/iframe realm or backend proxy is the complete fix.
  const factory = new Function('fetch', 'useCardState', 'runAction', ...SHADOWED_GLOBALS, 'React', `"use strict";\n${transformed}\nreturn CardRenderer;`);
  const Comp = factory(safeFetch, useCardState, runAction, ...SHADOWED_GLOBALS.map(() => undefined), React);
  if (typeof Comp !== 'function') {
    throw new Error('renderCode did not define a CardRenderer function');
  }
  return Comp;
}

const SHADOWED_GLOBALS = [
  'XMLHttpRequest', 'WebSocket', 'EventSource', 'navigator',
  'localStorage', 'sessionStorage', 'indexedDB', 'cookieStore',
  'Function', 'importScripts', 'Worker', 'SharedWorker',
  'window', 'self', 'globalThis', 'top', 'parent', 'frames', 'document', 'location',
];

/* Lightweight check used at generation time to catch broken code early. */
export function validateRenderCode(renderCode) {
  try {
    compileRenderCode(renderCode);
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
