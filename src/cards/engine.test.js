import { describe, it, expect } from 'vitest';
import { TEMPLATES, TEMPLATE_CATEGORIES, instantiateTemplate } from './templates.js';
import { CARD_TYPES, CARD_TYPE_IDS, validateProps } from './registry.js';
import { ADAPTERS, applyAdapter } from './adapters.js';
import { matchTemplate, normalizeSpec, parseDashboardResponse } from './router.js';
import { getCachedSpec, setCachedSpec, clearSpecCache } from './cache.js';

/*
 * Engine smoke tests — guard the contract the whole architecture relies on:
 * every template is renderable, the router only emits valid specs, adapters
 * never throw, and the instant tiers behave. These are the invariants that keep
 * the "prompt → reliable card" promise true as the catalog grows.
 */

describe('template library', () => {
  it('has 100 cards across 10 categories (10 each)', () => {
    expect(TEMPLATES.length).toBe(100);
    expect(TEMPLATE_CATEGORIES.length).toBe(10);
    for (const cat of TEMPLATE_CATEGORIES) {
      expect(TEMPLATES.filter(t => t.category === cat).length).toBe(10);
    }
  });

  it('every template uses a registered type and (if set) a real adapter', () => {
    for (const t of TEMPLATES) {
      expect(CARD_TYPE_IDS, `${t.id} type`).toContain(t.spec.type);
      if (t.spec.adapter) expect(ADAPTERS[t.spec.adapter], `${t.id} adapter`).toBeTypeOf('function');
      if (t.spec.adapter) expect(t.spec.source, `${t.id} needs source`).toBeTruthy();
    }
  });

  it('has unique ids and non-empty keywords', () => {
    const ids = TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TEMPLATES) expect(t.kw.length, `${t.id} kw`).toBeGreaterThan(0);
  });

  it('instantiates into a renderable card object', () => {
    const card = instantiateTemplate(TEMPLATES[0], 'x1');
    expect(card.id).toBe('x1');
    expect(card.spec.type).toBe(TEMPLATES[0].spec.type);
    expect(Array.isArray(card.dataBindings)).toBe(true);
  });
});

describe('instant template matcher', () => {
  const cases = [
    ['weather in london', 'wx-london'],
    ['weather in tokyo', 'wx-tokyo'],
    ['top tech news today', 'news-tech'],
    ['my daily workout checklist', 'hl-workout'],
    ['countdown to new year', 'ut-newyear'],
    ['my to-do list for today', 'per-todo'],
    ['my monthly budget', 'fin-budget'],
    ['us gdp over time', 'mkt-gdp'],
  ];
  it.each(cases)('matches %s', (prompt, id) => {
    expect(matchTemplate(prompt)?.id).toBe(id);
  });

  it('returns null for broad or nonsense prompts (→ LLM router)', () => {
    expect(matchTemplate('set up my finance dashboard')).toBeNull();
    expect(matchTemplate('asdf qwerty zxcv')).toBeNull();
    expect(matchTemplate('')).toBeNull();
  });
});

describe('router normalizeSpec', () => {
  it('accepts a valid spec and clamps geometry', () => {
    const { spec, ok } = normalizeSpec({ type: 'kpi', title: 'X', cols: 99, rows: -3, props: { value: 5 } });
    expect(ok).toBe(true);
    expect(spec.cols).toBe(12);
    expect(spec.rows).toBe(1);
  });
  it('rejects an unknown type', () => {
    expect(normalizeSpec({ type: 'hologram' }).spec).toBeNull();
    expect(normalizeSpec(null).spec).toBeNull();
  });
  it('drops malformed bindings but keeps the spec', () => {
    const { spec } = normalizeSpec({ type: 'line_chart', dataBindings: [{ key: 'a', provider: 'crypto_history' }, { junk: 1 }] });
    expect(spec.dataBindings.length).toBe(1);
  });
  it('only keeps a known adapter', () => {
    expect(normalizeSpec({ type: 'kpi', adapter: 'nope', props: {} }).spec.adapter).toBeUndefined();
    expect(normalizeSpec({ type: 'kpi', adapter: 'crypto_price', source: 'b', props: {} }).spec.adapter).toBe('crypto_price');
  });
});

describe('dashboard (one-shot) parser', () => {
  it('keeps valid specs, drops invalid, caps to max, extracts palette', () => {
    const { specs, palette, theme } = parseDashboardResponse({
      theme: 'Finance', palette: ['#10b981', '#6366f1'],
      cards: [
        { type: 'kpi', title: 'A', props: { value: 1 } },
        { type: 'bogus', title: 'B' },
        { type: 'line_chart', title: 'C', dataBindings: [{ key: 'x', provider: 'crypto_history' }] },
      ],
    }, 6);
    expect(specs.map(s => s.type)).toEqual(['kpi', 'line_chart']);
    expect(palette).toEqual(['#10b981', '#6366f1']);
    expect(theme).toBe('Finance');
  });

  it('accepts a single bare spec (no cards array) as a 1-card dashboard', () => {
    const { specs } = parseDashboardResponse({ type: 'kpi', title: 'Solo', props: { value: 1 } });
    expect(specs).toHaveLength(1);
  });

  it('returns no specs for junk', () => {
    expect(parseDashboardResponse({}).specs).toHaveLength(0);
    expect(parseDashboardResponse(null).specs).toHaveLength(0);
  });
});

describe('adapters never throw on bad data', () => {
  it.each(Object.keys(ADAPTERS))('adapter %s tolerates empty/error data', (name) => {
    const spec = { adapter: name, source: 's', props: {} };
    expect(() => applyAdapter(spec, {})).not.toThrow();
    expect(() => applyAdapter(spec, { s: { __error: 'boom' } })).not.toThrow();
    expect(() => applyAdapter(spec, { s: null })).not.toThrow();
  });

  it('crypto_history maps coingecko prices to a series', () => {
    const out = applyAdapter({ adapter: 'crypto_history', source: 'btc', props: {} }, { btc: { prices: [[1700000000000, 42], [1700086400000, 43]] } });
    expect(out.series).toHaveLength(2);
    expect(out.series[0].value).toBe(42);
  });

  it('fx_table maps rates to rows', () => {
    const out = applyAdapter({ adapter: 'fx_table', source: 'fx', props: { base: 'USD' } }, { fx: { EUR: 0.92, GBP: 0.79 } });
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0].pair).toBe('USD/EUR');
  });
});

describe('props validation', () => {
  it('every template\'s static props validate (or are adapter-filled)', () => {
    for (const t of TEMPLATES) {
      if (t.spec.adapter) continue; // adapter fills props from live data at runtime
      const res = validateProps(t.spec.type, t.spec.props || {});
      expect(res.ok, `${t.id}: ${res.error}`).toBe(true);
    }
  });

  it('composite is registered and validates a children array', () => {
    expect(CARD_TYPES.composite).toBeTruthy();
    const res = validateProps('composite', { layout: 'grid', children: [{ type: 'kpi', props: { value: 1 } }] });
    expect(res.ok).toBe(true);
  });
});

describe('spec cache', () => {
  it('round-trips a spec by normalized prompt', () => {
    clearSpecCache();
    expect(getCachedSpec('Bitcoin Price')).toBeNull();
    setCachedSpec('Bitcoin   Price', { type: 'kpi', title: 'BTC' });
    expect(getCachedSpec('bitcoin price')?.type).toBe('kpi'); // case + whitespace insensitive
    clearSpecCache();
    expect(getCachedSpec('bitcoin price')).toBeNull();
  });
});
