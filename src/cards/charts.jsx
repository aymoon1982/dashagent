import React from 'react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, ComposedChart, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { PALETTE } from './theme.js';

/*
 * Typed chart catalog (Recharts).
 *
 * These replace the per-card hand-drawn SVG of the old codegen approach. They are
 * written ONCE, tested, themed to the app's CSS variables, and consistently
 * interactive (tooltips, legends, responsive). A card spec only chooses one and
 * passes data — it never authors chart code.
 *
 * Every component is defensive: missing/empty data renders an <Empty/> state, so
 * a chart can never crash the dashboard.
 */

const AXIS = { fontSize: 10, fill: '#9ca3af' };
const GRID = 'rgba(255,255,255,.07)';

function Empty({ msg = 'No data' }) {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-dim)', fontSize: 12, gap: 6 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bar_chart_off</span>{msg}
    </div>
  );
}
const has = s => Array.isArray(s) && s.length > 0;

// Compact axis labels so big magnitudes (GDP, revenue, market cap) stay readable
// — exact values still show in the tooltip on hover.
const compact = v => {
  const n = Number(v); if (!Number.isFinite(n)) return '';
  const a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (a >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (a >= 1e4) return (n / 1e3).toFixed(0) + 'K';
  if (a >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n * 100) / 100);
};

const tip = {
  contentStyle: { background: '#0b0b14', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, fontSize: 11, color: '#f3f4f6' },
  labelStyle: { color: '#9ca3af', fontSize: 10 },
  cursor: { stroke: 'rgba(255,255,255,.15)' },
};

const Box = ({ children }) => <div style={{ width: '100%', height: '100%', minHeight: 80 }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;

/* ── LINE ── series:[{label,value}]  or multi via seriesList ── */
export function LineChartCard({ series, accent = PALETTE[0], yLabel }) {
  if (!has(series)) return <Empty />;
  return (
    <Box>
      <LineChart data={series} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
        <Tooltip {...tip} formatter={v => [v, yLabel || 'Value']} />
        <Line type="monotone" dataKey="value" stroke={accent} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </Box>
  );
}

/* ── AREA ── */
export function AreaChartCard({ series, accent = PALETTE[0], yLabel }) {
  if (!has(series)) return <Empty />;
  const id = `g${Math.abs(accent.split('').reduce((a, c) => a + c.charCodeAt(0), 0))}`;
  return (
    <Box>
      <AreaChart data={series} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={accent} stopOpacity={0.4} /><stop offset="100%" stopColor={accent} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
        <Tooltip {...tip} formatter={v => [v, yLabel || 'Value']} />
        <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={2} fill={`url(#${id})`} />
      </AreaChart>
    </Box>
  );
}

/* ── BAR ── series:[{label,value}] ── */
export function BarChartCard({ series, horizontal = false }) {
  if (!has(series)) return <Empty />;
  return (
    <Box>
      <BarChart data={series} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 12, bottom: 4, left: horizontal ? 8 : -8 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        {horizontal
          ? (<><XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} /><YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={80} /></>)
          : (<><XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={8} /><YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} tickFormatter={compact} /></>)}
        <Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.05)' }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>{series.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Bar>
      </BarChart>
    </Box>
  );
}

/* ── STACKED / GROUPED BAR ── rows:[{label, a, b}], keys:[{key,label}] ── */
export function StackedBarChartCard({ rows, keys = [], stacked = true }) {
  if (!has(rows) || !has(keys)) return <Empty />;
  return (
    <Box>
      <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={8} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
        <Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.05)' }} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        {keys.map((k, i) => <Bar key={k.key} dataKey={k.key} name={k.label || k.key} stackId={stacked ? 's' : undefined} fill={PALETTE[i % PALETTE.length]} radius={stacked ? 0 : [3, 3, 0, 0]} />)}
      </BarChart>
    </Box>
  );
}

/* ── PIE / DONUT ── slices:[{label,value}] ── */
export function PieChartCard({ slices, donut = true }) {
  if (!has(slices)) return <Empty />;
  return (
    <Box>
      <PieChart>
        <Pie data={slices} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={donut ? '55%' : 0} outerRadius="80%" paddingAngle={donut ? 2 : 0} stroke="none">
          {slices.map((s, i) => <Cell key={i} fill={s.color || PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
      </PieChart>
    </Box>
  );
}

/* ── CANDLESTICK ── candles:[{label,open,high,low,close}] (via floating bars) ── */
export function CandlestickChartCard({ candles }) {
  if (!has(candles)) return <Empty />;
  const data = candles.map(c => ({
    label: c.label, lowHigh: [c.low, c.high], openClose: [Math.min(c.open, c.close), Math.max(c.open, c.close)],
    up: c.close >= c.open,
  }));
  return (
    <Box>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis domain={['dataMin', 'dataMax']} tick={AXIS} tickLine={false} axisLine={false} width={48} />
        <Tooltip {...tip} />
        <Bar dataKey="lowHigh" barSize={1} >{data.map((d, i) => <Cell key={i} fill={d.up ? '#10b981' : '#ef4444'} />)}</Bar>
        <Bar dataKey="openClose" barSize={7} >{data.map((d, i) => <Cell key={i} fill={d.up ? '#10b981' : '#ef4444'} />)}</Bar>
      </ComposedChart>
    </Box>
  );
}

/* ── RADIAL GAUGE ── value 0..max ── */
export function GaugeCard({ value = 0, max = 100, accent = PALETTE[0], unit = '', label }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const data = [{ name: 'v', value: pct * 100, fill: accent }];
  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="68%" outerRadius="100%" data={data} startAngle={220} endAngle={-40}>
          <RadialBar background={{ fill: 'rgba(255,255,255,.07)' }} dataKey="value" cornerRadius={8} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--fg)' }}>{value}{unit}</div>
        {label && <div style={{ fontSize: 10, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>}
      </div>
    </div>
  );
}

/* ── HEATMAP ── matrix:{rows:[..],cols:[..],values:[[..]]}  (custom SVG-free grid) ── */
export function HeatmapCard({ rows = [], cols = [], values = [], accent = PALETTE[0] }) {
  if (!has(rows) || !has(values)) return <Empty />;
  const flat = values.flat().filter(v => Number.isFinite(v));
  const max = flat.length ? Math.max(...flat) : 1, min = flat.length ? Math.min(...flat) : 0;
  const shade = v => { const t = max === min ? 0.5 : (v - min) / (max - min); return `${accent}${Math.round(20 + t * 80).toString(16).padStart(2, '0')}`; };
  return (
    <div style={{ height: '100%', overflow: 'auto', fontSize: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `auto repeat(${cols.length}, 1fr)`, gap: 2 }}>
        <div />
        {cols.map((c, i) => <div key={i} style={{ color: 'var(--fg-dim)', textAlign: 'center', fontSize: 9 }}>{c}</div>)}
        {rows.map((r, ri) => (
          <React.Fragment key={ri}>
            <div style={{ color: 'var(--fg-muted)', paddingRight: 4, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>{r}</div>
            {cols.map((_, ci) => { const v = values[ri]?.[ci]; return <div key={ci} title={String(v ?? '')} style={{ background: Number.isFinite(v) ? shade(v) : 'transparent', borderRadius: 3, minHeight: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)', fontWeight: 600 }}>{Number.isFinite(v) ? v : ''}</div>; })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
