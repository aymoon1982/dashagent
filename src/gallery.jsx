/* eslint-disable react-refresh/only-export-components -- HTML entry point, not a refreshable module */
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { TEMPLATES } from './cards/index.js';
import { instantiateTemplate } from './cards/templates.js';
import { normalizeSpec } from './cards/router.js';
import { mockResolve } from './cards/mockData.js';
import { SpecCard } from './cards/SpecCard.jsx';

/*
 * Offline visual gallery — renders every predefined card (10 categories × 10)
 * plus a set of custom use cases with realistic MOCK data (no network, no LLM).
 * Open in a browser to judge layout, charts, color and overall appeal.
 */

const ROW = 84; // px per row unit (mirrors the app's grid)

function Card({ card }) {
  const accent = card.spec?.accent || card.renderSpec?.color || 'var(--primary)';
  return (
    <div style={{ gridColumn: `span ${Math.min(card.cols || 6, 12)}`, height: (card.rows || 2) * ROW, background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {card.spec?.type !== 'image' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 3, background: accent }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{card.title}</div>
          <div style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{card.spec?.type}{card.live ? ' · live' : ''}</div>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, padding: card.bleed ? 0 : 10 }}>
        <SpecCard card={card} />
      </div>
    </div>
  );
}

function Section({ title, cards }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg-muted)', margin: '0 0 12px', borderLeft: `3px solid var(--primary)`, paddingLeft: 10 }}>{title} <span style={{ color: 'var(--fg-dim)', fontWeight: 600 }}>· {cards.length}</span></h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12, alignItems: 'start' }}>
        {cards.map((c, i) => <Card key={i} card={c} />)}
      </div>
    </section>
  );
}

const CUSTOM = [
  { type: 'pie_chart', title: 'Monthly Expense Split', cols: 4, rows: 3, accent: '#10b981', props: { donut: true, slices: [{ label: 'Rent', value: 1500 }, { label: 'Food', value: 600 }, { label: 'Transport', value: 250 }, { label: 'Fun', value: 300 }] } },
  { type: 'line_chart', title: 'Running Pace (min/km)', cols: 4, rows: 3, accent: '#22c55e', props: { yLabel: 'min/km', series: [{ label: 'R1', value: 5.4 }, { label: 'R2', value: 5.2 }, { label: 'R3', value: 5.5 }, { label: 'R4', value: 5.0 }, { label: 'R5', value: 4.9 }, { label: 'R6', value: 4.8 }] } },
  { type: 'bar_chart', title: 'Laptop Price Compare', cols: 4, rows: 3, accent: '#6366f1', props: { horizontal: true, series: [{ label: 'Air', value: 1099 }, { label: 'Pro 14', value: 1999 }, { label: 'XPS 13', value: 1499 }, { label: 'ThinkPad', value: 1299 }] } },
  { type: 'gauge', title: 'Delhi Air Quality', cols: 3, rows: 3, accent: '#06b6d4', dataBindings: [{ key: 'aq', provider: 'air_quality', params: {} }], adapter: 'air_quality', source: 'aq', props: {} },
  { type: 'table', title: 'Trending Coins', cols: 5, rows: 3, accent: '#f59e0b', dataBindings: [{ key: 'tr', provider: 'crypto_trending', params: {} }], adapter: 'crypto_trending', source: 'tr', props: {} },
  { type: 'kpi_group', title: 'facebook/react', cols: 6, rows: 2, accent: '#6366f1', dataBindings: [{ key: 'r', provider: 'github_repo', params: {} }], adapter: 'github_stats', source: 'r', props: {} },
  { type: 'note', title: 'Explain: Bitcoin', cols: 5, rows: 3, accent: '#f59e0b', dataBindings: [{ key: 'w', provider: 'wiki_summary', params: {} }], adapter: 'wiki', source: 'w', props: {} },
  { type: 'timeline', title: 'My Calendar Today', cols: 4, rows: 3, accent: '#a855f7', dataBindings: [{ key: 'cal', provider: 'my_calendar', params: {} }], adapter: 'calendar_events', source: 'cal', props: {} },
  { type: 'image', title: 'Japan', cols: 3, rows: 3, chrome: 'none', bleed: true, dataBindings: [{ key: 'c', provider: 'country', params: {} }], adapter: 'country_flag', source: 'c', props: {} },
  { type: 'composite', title: 'Bitcoin Overview', cols: 8, rows: 3, accent: '#f59e0b', dataBindings: [{ key: 'p', provider: 'crypto_price', params: { id: 'bitcoin' } }, { key: 'h', provider: 'crypto_history', params: { id: 'bitcoin', days: 30 } }], props: { layout: 'grid', children: [{ type: 'kpi', adapter: 'crypto_price', source: 'p', title: 'Price', props: { label: 'BTC/USD', vs: 'usd', decimals: 0 } }, { type: 'area_chart', adapter: 'crypto_history', source: 'h', title: '30-day trend', props: { yLabel: 'USD' } }] } },
];

function customCard(rawSpec) {
  const { spec } = normalizeSpec(rawSpec);
  const data = mockResolve(spec.dataBindings || []);
  return { id: Math.random().toString(36).slice(2), title: spec.title, spec, data, state: {}, cols: spec.cols, rows: spec.rows, bleed: spec.bleed, live: (spec.dataBindings || []).length > 0, renderSpec: { color: spec.accent } };
}

function Gallery() {
  const cats = [...new Set(TEMPLATES.map(t => t.category))];
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 80px' }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--fg)' }}>Agntdash — Card Catalog</div>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>100 predefined cards across 10 categories + custom use cases, rendered with mock data. Charts are live Recharts components.</div>
      </header>
      {cats.map(cat => (
        <Section key={cat} title={cat} cards={TEMPLATES.filter(t => t.category === cat).map(t => { const c = instantiateTemplate(t, t.id); c.data = mockResolve(c.dataBindings); return c; })} />
      ))}
      <Section title="Custom use cases (open router)" cards={CUSTOM.map(customCard)} />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><Gallery /></React.StrictMode>);
