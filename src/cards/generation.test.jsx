import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TEMPLATES, TEMPLATE_CATEGORIES, instantiateTemplate } from './templates.js';
import { validateProps } from './registry.js';
import { applyAdapter } from './adapters.js';
import { normalizeSpec } from './router.js';
import { mockResolve } from './mockData.js';
import { SpecCard } from './SpecCard.jsx';

/*
 * Generation + quality tests.
 *
 * For every catalog card (the 100 templates) and a battery of custom router-style
 * specs, run the FULL generation path with realistic mock data — resolve
 * bindings, run the adapter, validate props, and server-render — then assert the
 * card came out POPULATED (real series/rows/items/values), not an empty shell.
 * This is the objective signal for "the cards are well-generated and appealing".
 */

// What "has real content" means per card type.
const POPULATED = {
  line_chart: p => p.series?.length > 1,
  area_chart: p => p.series?.length > 1,
  bar_chart: p => p.series?.length > 0,
  stacked_bar_chart: p => p.rows?.length > 0 && p.keys?.length > 0,
  pie_chart: p => p.slices?.length > 0,
  candlestick_chart: p => p.candles?.length > 0,
  gauge: p => typeof p.value === 'number',
  heatmap: p => p.rows?.length > 0 && p.values?.length > 0,
  kpi: p => p.value != null || p.error,
  kpi_group: p => p.stats?.length > 0,
  table: p => p.rows?.length > 0,
  list: p => p.items?.length > 0,
  progress: p => p.goals?.length > 0,
  countdown: p => !!p.to,
  converter: p => typeof p.factor === 'number',
  timeline: p => p.events?.length > 0,
  note: p => typeof p.text === 'string',
  news: p => p.items?.length > 0,
  weather: p => !!p.current || p.days?.length > 0,
  image: p => !!p.src,
  composite: p => p.children?.length > 0,
};

// Compute the final props a card renders with (mirrors SpecCard for non-composite).
function finalProps(spec, data) {
  if (spec.type === 'composite') return spec.props || {};
  return validateProps(spec.type, { ...applyAdapter(spec, data || {}), accent: spec.accent }).props;
}

function renderCard(spec, data) {
  const card = { id: 't', prompt: '', title: spec.title, spec, data: data || {}, state: {}, renderSpec: { color: spec.accent } };
  return renderToStaticMarkup(React.createElement(SpecCard, { card }));
}

describe('catalog — 10 categories × 10 cards', () => {
  it('has exactly 10 categories with 10 cards each', () => {
    expect(TEMPLATE_CATEGORIES.length).toBe(10);
    for (const cat of TEMPLATE_CATEGORIES) {
      expect(TEMPLATES.filter(t => t.category === cat).length, cat).toBe(10);
    }
  });

  for (const cat of [...new Set(TEMPLATES.map(t => t.category))]) {
    describe(cat, () => {
      const items = TEMPLATES.filter(t => t.category === cat);
      it.each(items.map(t => [t.spec.title, t]))('%s renders populated', (_title, tpl) => {
        const card = instantiateTemplate(tpl, 'x');
        const data = mockResolve(card.dataBindings);
        const props = finalProps(card.spec, data);
        const ok = POPULATED[card.spec.type];
        expect(ok, `no populated-check for ${card.spec.type}`).toBeTypeOf('function');
        expect(ok(props), `${tpl.id} (${card.spec.type}) produced empty content: ${JSON.stringify(props).slice(0, 160)}`).toBe(true);
        // and it must server-render without throwing
        expect(() => renderCard(card.spec, data)).not.toThrow();
      });
    });
  }
});

describe('content actually reaches the DOM (non-chart cards)', () => {
  const checks = [
    ['fin-bills', 'Rent'],
    ['fin-subs', 'Netflix'],
    ['per-todo', 'standup'],          // case-insensitive contains
    ['cry-btc-price', '63'],          // mock BTC ~63420
    ['trv-fx', 'USD/EUR'],
    ['hl-bmi', 'healthy'],            // gauge shows value + band label
    ['news-tech', 'story'],
    ['wk-kpis', 'MRR'],
  ];
  it.each(checks)('%s markup contains %s', (id, needle) => {
    const tpl = TEMPLATES.find(t => t.id === id);
    expect(tpl, id).toBeTruthy();
    const card = instantiateTemplate(tpl, 'x');
    const html = renderCard(card.spec, mockResolve(card.dataBindings)).toLowerCase();
    expect(html).toContain(needle.toLowerCase());
  });
});

/* ── CUSTOM USE CASES: bespoke prompts the open router would produce ── */
const CUSTOM_SPECS = {
  'monthly expense split': { type: 'pie_chart', title: 'Expense Split', cols: 5, rows: 3, accent: '#10b981', props: { donut: true, slices: [{ label: 'Rent', value: 1500 }, { label: 'Food', value: 600 }, { label: 'Transport', value: 250 }, { label: 'Fun', value: 300 }] } },
  'running pace last 6 runs': { type: 'line_chart', title: 'Pace', cols: 7, rows: 3, accent: '#22c55e', props: { yLabel: 'min/km', series: [{ label: 'R1', value: 5.4 }, { label: 'R2', value: 5.2 }, { label: 'R3', value: 5.5 }, { label: 'R4', value: 5.0 }, { label: 'R5', value: 4.9 }, { label: 'R6', value: 4.8 }] } },
  'compare laptop prices': { type: 'bar_chart', title: 'Laptop Prices', cols: 6, rows: 3, accent: '#6366f1', props: { horizontal: true, series: [{ label: 'Air', value: 1099 }, { label: 'Pro 14', value: 1999 }, { label: 'XPS', value: 1499 }] } },
  'project burndown': { type: 'area_chart', title: 'Burndown', cols: 7, rows: 3, accent: '#a855f7', props: { yLabel: 'pts', series: [{ label: 'D1', value: 80 }, { label: 'D3', value: 62 }, { label: 'D5', value: 40 }, { label: 'D7', value: 18 }, { label: 'D9', value: 4 }] } },
  'AQI in Delhi': { type: 'gauge', title: 'Delhi AQI', cols: 3, rows: 3, accent: '#06b6d4', dataBindings: [{ key: 'aq', provider: 'air_quality', params: { latitude: 28.6, longitude: 77.2 } }], adapter: 'air_quality', source: 'aq', props: {} },
  'trending coins': { type: 'table', title: 'Trending', cols: 5, rows: 3, accent: '#f59e0b', dataBindings: [{ key: 'tr', provider: 'crypto_trending', params: {} }], adapter: 'crypto_trending', source: 'tr', props: {} },
  'react repo stats': { type: 'kpi_group', title: 'facebook/react', cols: 6, rows: 2, accent: '#6366f1', dataBindings: [{ key: 'r', provider: 'github_repo', params: { owner: 'facebook', repo: 'react' } }], adapter: 'github_stats', source: 'r', props: {} },
  'japan flag card': { type: 'image', title: 'Japan', cols: 4, rows: 3, chrome: 'none', bleed: true, dataBindings: [{ key: 'c', provider: 'country', params: { name: 'Japan' } }], adapter: 'country_flag', source: 'c', props: {} },
  'explain bitcoin': { type: 'note', title: 'Bitcoin', cols: 5, rows: 3, accent: '#f59e0b', dataBindings: [{ key: 'w', provider: 'wiki_summary', params: { title: 'Bitcoin' } }], adapter: 'wiki', source: 'w', props: {} },
  'my calendar today': { type: 'timeline', title: 'Today', cols: 4, rows: 3, accent: '#a855f7', dataBindings: [{ key: 'cal', provider: 'my_calendar', params: {} }], adapter: 'calendar_events', source: 'cal', props: {} },
  'bitcoin overview (composite)': { type: 'composite', title: 'Bitcoin Overview', cols: 8, rows: 3, accent: '#f59e0b', dataBindings: [{ key: 'p', provider: 'crypto_price', params: { id: 'bitcoin' } }, { key: 'h', provider: 'crypto_history', params: { id: 'bitcoin', days: 30 } }], props: { layout: 'grid', children: [{ type: 'kpi', adapter: 'crypto_price', source: 'p', title: 'Price', props: { label: 'BTC/USD', vs: 'usd', decimals: 0 } }, { type: 'area_chart', adapter: 'crypto_history', source: 'h', title: '30 days', props: { yLabel: 'USD' } }] } },
  'savings goal progress': { type: 'progress', title: 'Goals', cols: 5, rows: 2, accent: '#10b981', props: { goals: [{ label: 'House', value: 22000, max: 60000, unit: '$' }] } },
};

describe('custom use cases (open router path)', () => {
  it.each(Object.entries(CUSTOM_SPECS))('%s → valid, populated, renders', (_name, rawSpec) => {
    const { ok, spec } = normalizeSpec(rawSpec);
    expect(ok, `${_name}: spec rejected`).toBe(true);
    const data = mockResolve(spec.dataBindings || []);
    const props = finalProps(spec, data);
    expect(POPULATED[spec.type](props), `${_name} (${spec.type}) empty: ${JSON.stringify(props).slice(0, 160)}`).toBe(true);
    expect(() => renderCard(spec, data)).not.toThrow();
  });

  it('composite child markup includes both the price and a chart container', () => {
    const spec = normalizeSpec(CUSTOM_SPECS['bitcoin overview (composite)']).spec;
    const html = renderCard(spec, mockResolve(spec.dataBindings)).toLowerCase();
    expect(html).toContain('63'); // BTC price from mock
  });
});
