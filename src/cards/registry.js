import { z } from 'zod';
import {
  LineChartCard, AreaChartCard, BarChartCard, StackedBarChartCard, PieChartCard,
  CandlestickChartCard, GaugeCard, HeatmapCard,
} from './charts.jsx';
import {
  KpiCard, KpiGroupCard, TableCard, ListCard, ProgressCard, CountdownCard,
  ConverterCard, TimelineCard, NoteCard, NewsCard, WeatherCard, ImageCard,
} from './primitives.jsx';

/*
 * CARD TYPE REGISTRY — the single source of truth for the catalog.
 *
 * Each entry binds a `type` string to:
 *   - component:  the tested React component that renders it
 *   - props:      a Zod schema validating the spec's props before render
 *   - summary:    one line injected into the router prompt so the model knows
 *                 when to pick this type and what props/adapter to supply
 *
 * Adding a card type = adding ONE entry here. The router prompt, validation, and
 * renderer all derive from this object, so they can never drift apart.
 */

const point = z.object({ label: z.string().optional(), t: z.any().optional(), value: z.number() });
const named = z.object({ label: z.string(), value: z.number(), color: z.string().optional() });

export const CARD_TYPES = {
  line_chart: {
    component: LineChartCard,
    props: z.object({ series: z.array(point).default([]), yLabel: z.string().optional(), accent: z.string().optional() }),
    summary: 'Trend of one value over time. props: series:[{label,value}] (or use an adapter like crypto_history/fx_history/stock_history/worldbank_series with source). Best for prices/metrics over days.',
  },
  area_chart: {
    component: AreaChartCard,
    props: z.object({ series: z.array(point).default([]), yLabel: z.string().optional(), accent: z.string().optional() }),
    summary: 'Like line_chart but filled — emphasizes volume/magnitude over time. Same props/adapters as line_chart.',
  },
  bar_chart: {
    component: BarChartCard,
    props: z.object({ series: z.array(named).default([]), horizontal: z.boolean().optional(), accent: z.string().optional() }),
    summary: 'Compare discrete categories. props: series:[{label,value}], horizontal:bool. Good for rankings, category totals.',
  },
  stacked_bar_chart: {
    component: StackedBarChartCard,
    props: z.object({ rows: z.array(z.record(z.string(), z.any())).default([]), keys: z.array(z.object({ key: z.string(), label: z.string().optional() })).default([]), stacked: z.boolean().optional() }),
    summary: 'Multi-series bars per category. props: rows:[{label, k1, k2}], keys:[{key,label}], stacked:bool. Good for budget breakdowns, multi-metric comparison.',
  },
  pie_chart: {
    component: PieChartCard,
    props: z.object({ slices: z.array(named).default([]), donut: z.boolean().optional() }),
    summary: 'Part-to-whole composition. props: slices:[{label,value,color?}], donut:bool. Good for allocations, budgets, market share.',
  },
  candlestick_chart: {
    component: CandlestickChartCard,
    props: z.object({ candles: z.array(z.object({ label: z.string(), open: z.number(), high: z.number(), low: z.number(), close: z.number() })).default([]) }),
    summary: 'OHLC financial chart. props: candles:[{label,open,high,low,close}]. Use for stock/crypto trading views.',
  },
  gauge: {
    component: GaugeCard,
    props: z.object({ value: z.number().default(0), max: z.number().default(100), unit: z.string().optional(), label: z.string().optional(), accent: z.string().optional() }),
    summary: 'Single value against a max as a dial. props: value, max, unit, label. Good for usage %, scores, AQI, goals.',
  },
  heatmap: {
    component: HeatmapCard,
    props: z.object({ rows: z.array(z.string()).default([]), cols: z.array(z.string()).default([]), values: z.array(z.array(z.number())).default([]), accent: z.string().optional() }),
    summary: 'Grid of intensity values. props: rows:[str], cols:[str], values:[[num]]. Good for activity by day/hour, correlation.',
  },
  kpi: {
    component: KpiCard,
    props: z.object({ value: z.number().nullable().optional(), unit: z.string().optional(), delta: z.number().nullable().optional(), deltaUnit: z.string().optional(), label: z.string().optional(), decimals: z.number().optional(), accent: z.string().optional() }),
    summary: 'A single big number with optional delta. props: value, unit, delta, deltaUnit, label (or adapter crypto_price/stock_quote with source). Good for a price, count, score.',
  },
  kpi_group: {
    component: KpiGroupCard,
    props: z.object({ stats: z.array(z.object({ label: z.string(), value: z.number(), unit: z.string().optional(), delta: z.number().optional(), deltaUnit: z.string().optional() })).default([]) }),
    summary: 'Several small stats together. props: stats:[{label,value,unit,delta}]. Good for a metrics overview/summary row.',
  },
  table: {
    component: TableCard,
    props: z.object({ columns: z.array(z.object({ key: z.string(), label: z.string().optional(), align: z.string().optional() })).default([]), rows: z.array(z.record(z.string(), z.any())).default([]) }),
    summary: 'Rows and columns. props: columns:[{key,label,align}], rows:[{...}] (or adapter fx_table/generic_table). Good for FX tables, leaderboards, schedules.',
  },
  list: {
    component: ListCard,
    props: z.object({ items: z.array(z.union([z.string(), z.object({ text: z.string(), sub: z.string().optional(), id: z.string().optional() })])).default([]), checklist: z.boolean().optional(), accent: z.string().optional() }),
    summary: 'Bullet list or interactive checklist. props: items:[string|{text,sub}], checklist:bool (ticks persist). Good for tasks, habits, steps.',
  },
  progress: {
    component: ProgressCard,
    props: z.object({ goals: z.array(z.object({ label: z.string(), value: z.number(), max: z.number(), unit: z.string().optional(), color: z.string().optional() })).default([]) }),
    summary: 'Progress bars toward goals. props: goals:[{label,value,max,unit}]. Good for savings goals, habit streaks, quotas.',
  },
  countdown: {
    component: CountdownCard,
    props: z.object({ to: z.string(), label: z.string().optional(), accent: z.string().optional() }),
    summary: 'Live ticking countdown. props: to (ISO date), label. Good for deadlines, launches, events, holidays.',
  },
  converter: {
    component: ConverterCard,
    props: z.object({ factor: z.number(), fromUnit: z.string(), toUnit: z.string(), base: z.number().optional(), accent: z.string().optional() }),
    summary: 'Live unit converter (output = input × factor). props: factor, fromUnit, toUnit, base. Good for miles↔km, currency (static), temp.',
  },
  timeline: {
    component: TimelineCard,
    props: z.object({ events: z.array(z.object({ time: z.string(), title: z.string(), sub: z.string().optional() })).default([]), accent: z.string().optional() }),
    summary: 'Vertical sequence of events. props: events:[{time,title,sub}]. Good for agendas, schedules, project milestones.',
  },
  note: {
    component: NoteCard,
    props: z.object({ text: z.string().default(''), editable: z.boolean().optional() }),
    summary: 'Free text / note. props: text, editable:bool (persists). Good for reminders, sticky notes, summaries.',
  },
  news: {
    component: NewsCard,
    props: z.object({ items: z.array(z.object({ title: z.string(), url: z.string().nullable().optional(), source: z.string().optional(), time: z.string().nullable().optional(), image: z.string().nullable().optional() })).default([]), accent: z.string().optional() }),
    summary: 'Headline feed. props: items:[{title,url,source,time,image}] (or adapter news_list with source from hn_news/news provider). Good for news/tech digests.',
  },
  weather: {
    component: WeatherCard,
    props: z.object({ place: z.string().optional(), current: z.record(z.string(), z.any()).optional(), days: z.array(z.record(z.string(), z.any())).default([]) }),
    summary: 'Current weather + forecast. Use adapter "weather" with source bound to the weather provider (needs latitude/longitude via geocode). props.place for the label.',
  },
  image: {
    component: ImageCard,
    props: z.object({ src: z.string(), caption: z.string().optional(), alt: z.string().optional() }),
    summary: 'A single image/hero. props: src, caption. Use chrome:"none" + bleed:true. Good for photos, flags, maps snapshots.',
  },
};

/* Compact catalog text injected into the router system prompt. */
export const CARD_CATALOG = Object.entries(CARD_TYPES)
  .map(([id, t]) => `- ${id}: ${t.summary}`).join('\n');

export const CARD_TYPE_IDS = Object.keys(CARD_TYPES);

/* Validate (and coerce) a spec's props against its type schema. */
export function validateProps(type, props) {
  const def = CARD_TYPES[type];
  if (!def) return { ok: false, error: `unknown card type "${type}"`, props: {} };
  const res = def.props.safeParse(props || {});
  if (res.success) return { ok: true, error: null, props: res.data };
  return { ok: false, error: res.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '), props: props || {} };
}
