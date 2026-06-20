import React from 'react';
import { useCardState } from '../cardState.js';
import { PALETTE } from './theme.js';

/*
 * Typed non-chart card components: KPIs, tables, lists/checklists, weather,
 * news, countdowns, converters, progress, timelines, notes, images.
 *
 * Like the charts, these are written once, themed to the app's CSS variables,
 * and defensive against missing data. Interactive state (checklist ticks, note
 * text, converter input) persists through `useCardState`.
 */

const C = { fg: 'var(--fg)', muted: 'var(--fg-muted)', dim: 'var(--fg-dim)', border: 'var(--border)' };
const fill = { height: '100%', display: 'flex', flexDirection: 'column' };
const fmtNum = (n, opts) => { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString(undefined, opts) : '—'; };

function ErrLine({ error }) {
  return <div style={{ color: 'var(--warning)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>{error}</div>;
}

/* ── KPI / STAT ── value + optional delta + sparkline ── */
export function KpiCard({ value, unit = '', delta, deltaUnit = '', label, error, decimals = 2 }) {
  if (error) return <div style={fill}><ErrLine error={error} /></div>;
  const up = Number(delta) >= 0;
  return (
    <div style={{ ...fill, justifyContent: 'center', gap: 4 }}>
      {label && <div style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>}
      <div style={{ fontSize: 30, fontWeight: 800, color: C.fg, lineHeight: 1 }}>
        {unit === '$' ? '$' : ''}{fmtNum(value, { maximumFractionDigits: decimals })}{unit && unit !== '$' ? <span style={{ fontSize: 14, color: C.muted, marginLeft: 4 }}>{unit}</span> : ''}
      </div>
      {delta != null && Number.isFinite(Number(delta)) && (
        <div style={{ fontSize: 12, fontWeight: 700, color: up ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{up ? 'trending_up' : 'trending_down'}</span>
          {up ? '+' : ''}{fmtNum(delta, { maximumFractionDigits: 2 })}{deltaUnit}
        </div>
      )}
    </div>
  );
}

/* ── KPI GROUP ── stats:[{label,value,unit,delta}] ── */
export function KpiGroupCard({ stats = [] }) {
  if (!stats.length) return <div style={fill} />;
  return (
    <div style={{ ...fill, display: 'grid', gridTemplateColumns: `repeat(${Math.min(stats.length, 2)}, 1fr)`, gap: 10 }}>
      {stats.map((s, i) => {
        const up = Number(s.delta) >= 0;
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 8, background: 'rgba(255,255,255,.03)', borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.fg }}>{s.unit === '$' ? '$' : ''}{fmtNum(s.value, { maximumFractionDigits: 2 })}{s.unit && s.unit !== '$' ? ` ${s.unit}` : ''}</div>
            {s.delta != null && <div style={{ fontSize: 10, fontWeight: 700, color: up ? 'var(--success)' : 'var(--danger)' }}>{up ? '+' : ''}{fmtNum(s.delta, { maximumFractionDigits: 1 })}{s.deltaUnit || ''}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ── TABLE ── columns:[{key,label,align}], rows:[{...}] ── */
export function TableCard({ columns = [], rows = [], error }) {
  if (error) return <div style={fill}><ErrLine error={error} /></div>;
  const cols = columns.length ? columns : (rows[0] ? Object.keys(rows[0]).map(k => ({ key: k, label: k })) : []);
  if (!rows.length) return <div style={{ ...fill, color: C.dim, fontSize: 12, alignItems: 'center', justifyContent: 'center' }}>No rows</div>;
  return (
    <div style={{ ...fill, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr>{cols.map(c => <th key={c.key} style={{ textAlign: c.align || 'left', padding: '6px 8px', color: C.dim, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: 'var(--bg1)' }}>{c.label}</th>)}</tr></thead>
        <tbody>{rows.map((r, ri) => <tr key={ri}>{cols.map(c => <td key={c.key} style={{ textAlign: c.align || 'left', padding: '6px 8px', color: C.fg, borderBottom: '1px solid rgba(255,255,255,.04)', fontVariantNumeric: 'tabular-nums' }}>{typeof r[c.key] === 'number' ? fmtNum(r[c.key], { maximumFractionDigits: 4 }) : (r[c.key] ?? '—')}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/* ── LIST / CHECKLIST ── items:[string|{text}], checklist:bool ── */
export function ListCard({ items = [], checklist = false, accent = PALETTE[0] }) {
  const [done, setDone] = useCardState('checked', {});
  const norm = items.map((it, i) => ({ id: it.id || String(i), text: typeof it === 'string' ? it : it.text, sub: it.sub }));
  if (!norm.length) return <div style={{ ...fill, color: C.dim, fontSize: 12, alignItems: 'center', justifyContent: 'center' }}>Empty list</div>;
  return (
    <div style={{ ...fill, overflow: 'auto', gap: 2 }}>
      {norm.map(it => (
        <div key={it.id} onClick={checklist ? () => setDone(d => ({ ...d, [it.id]: !d[it.id] })) : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: checklist ? 'pointer' : 'default', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
          {checklist && <span className="material-symbols-outlined" style={{ fontSize: 18, color: done[it.id] ? accent : C.dim }}>{done[it.id] ? 'check_box' : 'check_box_outline_blank'}</span>}
          {!checklist && <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: C.fg, textDecoration: checklist && done[it.id] ? 'line-through' : 'none', opacity: checklist && done[it.id] ? 0.5 : 1 }}>{it.text}</div>
            {it.sub && <div style={{ fontSize: 10, color: C.dim }}>{it.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── PROGRESS / GOALS ── goals:[{label,value,max,unit}] ── */
export function ProgressCard({ goals = [] }) {
  if (!goals.length) return <div style={fill} />;
  return (
    <div style={{ ...fill, justifyContent: 'center', gap: 14 }}>
      {goals.map((g, i) => {
        const pct = Math.max(0, Math.min(100, (g.value / (g.max || 100)) * 100));
        const col = g.color || PALETTE[i % PALETTE.length];
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: C.muted }}>{g.label}</span>
              <span style={{ color: C.fg, fontWeight: 700 }}>{fmtNum(g.value)}{g.unit || ''} / {fmtNum(g.max)}{g.unit || ''}</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 99 }}><div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 99, transition: 'width .4s' }} /></div>
          </div>
        );
      })}
    </div>
  );
}

/* ── COUNTDOWN ── to: ISO date, label ── */
function CountdownUnit({ v, l }) {
  return <div style={{ textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 800, color: C.fg, fontVariantNumeric: 'tabular-nums' }}>{String(v).padStart(2, '0')}</div><div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase' }}>{l}</div></div>;
}
export function CountdownCard({ to, label, accent = PALETTE[0] }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const target = new Date(to).getTime();
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000), h = Math.floor(diff / 3600000) % 24, m = Math.floor(diff / 60000) % 60, s = Math.floor(diff / 1000) % 60;
  return (
    <div style={{ ...fill, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
      {label && <div style={{ fontSize: 12, color: accent, fontWeight: 700 }}>{label}</div>}
      {Number.isFinite(target) ? <div style={{ display: 'flex', gap: 14 }}><CountdownUnit v={d} l="days" /><CountdownUnit v={h} l="hrs" /><CountdownUnit v={m} l="min" /><CountdownUnit v={s} l="sec" /></div> : <ErrLine error="Invalid date" />}
    </div>
  );
}

/* ── CONVERTER ── factor, fromUnit, toUnit, base ── value*factor ── */
export function ConverterCard({ factor = 1, fromUnit = '', toUnit = '', base = 1, accent = PALETTE[0] }) {
  const [val, setVal] = useCardState('input', base);
  const out = Number(val) * factor;
  return (
    <div style={{ ...fill, justifyContent: 'center', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="number" value={val} onChange={e => setVal(e.target.value)} style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,.05)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', color: C.fg, fontSize: 16, fontWeight: 700 }} />
        <span style={{ color: C.dim, fontSize: 12 }}>{fromUnit}</span>
      </div>
      <div style={{ textAlign: 'center', color: accent }}><span className="material-symbols-outlined">south</span></div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: C.fg }}>{fmtNum(out, { maximumFractionDigits: 4 })}</span>
        <span style={{ color: C.muted, fontSize: 13 }}>{toUnit}</span>
      </div>
    </div>
  );
}

/* ── TIMELINE ── events:[{time,title,sub}] ── */
export function TimelineCard({ events = [], accent = PALETTE[0] }) {
  if (!events.length) return <div style={{ ...fill, color: C.dim, fontSize: 12, alignItems: 'center', justifyContent: 'center' }}>No events</div>;
  return (
    <div style={{ ...fill, overflow: 'auto' }}>
      {events.map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: accent, marginTop: 3 }} />
            {i < events.length - 1 && <div style={{ flex: 1, width: 2, background: 'rgba(255,255,255,.1)' }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: accent, fontWeight: 700 }}>{e.time}</div>
            <div style={{ fontSize: 13, color: C.fg, fontWeight: 600 }}>{e.title}</div>
            {e.sub && <div style={{ fontSize: 11, color: C.dim }}>{e.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── NOTE / MARKDOWN-LITE ── text, editable ── */
export function NoteCard({ text = '', editable = false }) {
  const [val, setVal] = useCardState('note', text);
  if (editable) return <textarea value={val} onChange={e => setVal(e.target.value)} style={{ ...fill, background: 'transparent', border: 'none', resize: 'none', color: C.fg, fontSize: 13, lineHeight: 1.6, outline: 'none' }} />;
  return <div style={{ ...fill, overflow: 'auto', fontSize: 13, lineHeight: 1.6, color: C.fg, whiteSpace: 'pre-wrap' }}>{text}</div>;
}

/* ── NEWS FEED ── items:[{title,url,source,time,image}] ── */
export function NewsCard({ items = [], error }) {
  if (error) return <div style={fill}><ErrLine error={error} /></div>;
  if (!items.length) return <div style={{ ...fill, color: C.dim, fontSize: 12, alignItems: 'center', justifyContent: 'center' }}>No headlines</div>;
  return (
    <div style={{ ...fill, overflow: 'auto', gap: 2 }}>
      {items.map((it, i) => (
        <a key={i} href={it.url || '#'} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: 10, padding: '8px 4px', borderBottom: '1px solid rgba(255,255,255,.05)', textDecoration: 'none' }}>
          {it.image && <img src={it.image} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: C.fg, fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.title}</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{it.source}{it.time ? ` · ${new Date(it.time).toLocaleDateString()}` : ''}</div>
          </div>
        </a>
      ))}
    </div>
  );
}

const WMO = { 0: ['☀️', 'Clear'], 1: ['🌤️', 'Mainly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'], 45: ['🌫️', 'Fog'], 48: ['🌫️', 'Rime fog'], 51: ['🌦️', 'Drizzle'], 61: ['🌧️', 'Rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'], 71: ['🌨️', 'Snow'], 80: ['🌦️', 'Showers'], 95: ['⛈️', 'Storm'] };
const wico = c => (WMO[c] || ['🌡️', '—']);

/* ── WEATHER ── current:{temp,...}, days:[{label,max,min,code,precip}], place ── */
export function WeatherCard({ place, current = {}, days = [], error }) {
  if (error) return <div style={fill}><ErrLine error={error} /></div>;
  const [icon, desc] = wico(current.code);
  return (
    <div style={{ ...fill, gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 40 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, color: C.fg, lineHeight: 1 }}>{fmtNum(current.temp, { maximumFractionDigits: 0 })}°</div>
          <div style={{ fontSize: 11, color: C.muted }}>{place} · {desc}</div>
          <div style={{ fontSize: 10, color: C.dim }}>Feels {fmtNum(current.feels, { maximumFractionDigits: 0 })}° · 💧{fmtNum(current.humidity, { maximumFractionDigits: 0 })}% · 💨{fmtNum(current.wind, { maximumFractionDigits: 0 })}</div>
        </div>
      </div>
      {days.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflow: 'auto', marginTop: 'auto' }}>
          {days.slice(0, 7).map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,.03)', borderRadius: 8, padding: '6px 2px', minWidth: 40 }}>
              <div style={{ fontSize: 9, color: C.dim }}>{d.label}</div>
              <div style={{ fontSize: 16 }}>{wico(d.code)[0]}</div>
              <div style={{ fontSize: 10, color: C.fg, fontWeight: 700 }}>{fmtNum(d.max, { maximumFractionDigits: 0 })}°</div>
              <div style={{ fontSize: 9, color: C.dim }}>{fmtNum(d.min, { maximumFractionDigits: 0 })}°</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── IMAGE / HERO ── src, caption ── */
export function ImageCard({ src, caption, alt = '' }) {
  if (!src) return <div style={{ ...fill, color: C.dim, fontSize: 12, alignItems: 'center', justifyContent: 'center' }}>No image</div>;
  return (
    <div style={{ ...fill, position: 'relative' }}>
      <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.opacity = 0.2; }} />
      {caption && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 8, fontSize: 11, color: '#fff', background: 'linear-gradient(transparent, rgba(0,0,0,.7))' }}>{caption}</div>}
    </div>
  );
}
