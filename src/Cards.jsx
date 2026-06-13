import { useState, useEffect } from 'react';

export function getCompatibleFormats(card) {
  const { data } = card;
  if (!data) return ['article'];
  const fmts = new Set(['article', 'table']);
  const list = Array.isArray(data) ? data : (data.items || data.rows || data.results || null);
  if (Array.isArray(data) || list) {
    fmts.add('feed');
    const arr = list || data;
    if (Array.isArray(arr) && arr.length > 0) {
      const hasNum = Object.values(arr[0]).some(v => typeof v === 'number' || (!isNaN(v) && String(v).trim() !== ''));
      if (hasNum) { fmts.add('chart'); fmts.add('stat'); }
    }
  }
  if (data && (data.markers || (Array.isArray(data) && data.some(d => d.coords)))) fmts.add('map');
  if (data && (data.widgetType || data.initialValue !== undefined)) fmts.add('interactive');
  if (data && (data.url || data.imageUrl)) fmts.add('media');
  if (data && (data.value !== undefined || data.metric !== undefined)) fmts.add('stat');
  if (card.cardType) fmts.add(card.cardType);
  return Array.from(fmts);
}

export function SVGChart({ card }) {
  const { data, renderSpec, id } = card;
  const chartType = renderSpec?.chartType || 'line';
  const color = renderSpec?.color || '#6366f1';
  let xField = renderSpec?.xField || 'name';
  let yField = renderSpec?.yField || 'value';
  let chartData = data;
  if (data && data.rows && Array.isArray(data.rows)) {
    chartData = data.rows.map(row => {
      const keys = Object.keys(row);
      const xk = keys.find(k => typeof row[k] === 'string') || keys[0];
      const yk = keys.find(k => !isNaN(parseFloat(row[k]))) || keys[1];
      return { name: row[xk], value: parseFloat(row[yk]) || 0 };
    });
    xField = 'name'; yField = 'value';
  }
  if (!Array.isArray(chartData) || chartData.length === 0)
    return <div style={{ color:'var(--fg-dim)', fontSize:11, textAlign:'center', padding:'20px 0' }}>No chart data</div>;

  const vals = chartData.map(d => Number(d[yField]) || 0);
  const maxV = Math.max(...vals, 1) * 1.12;
  const minV = Math.min(...vals, 0);
  const pad = { t:14, r:10, b:22, l:38 };
  const W = 320, H = 118;
  const gx = i => pad.l + (i / (Math.max(chartData.length - 1, 1))) * (W - pad.l - pad.r);
  const gy = v => H - pad.b - ((v - minV) / (maxV - minV || 1)) * (H - pad.t - pad.b);

  if (chartType === 'line' || chartType === 'area') {
    const pts = chartData.map((d, i) => `${gx(i)},${gy(d[yField])}`).join(' ');
    const areaPts = `${gx(0)},${H - pad.b} ${pts} ${gx(chartData.length-1)},${H - pad.b}`;
    return (
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
          <defs>
            <linearGradient id={`cg-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.38" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[minV, (minV+maxV)/2, maxV].map((v,i) => <line key={i} x1={pad.l} y1={gy(v)} x2={W-pad.r} y2={gy(v)} stroke="rgba(255,255,255,0.04)" />)}
          {chartType === 'area' && <polygon points={areaPts} fill={`url(#cg-${id})`} />}
          <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          {chartData.map((d, i) => <circle key={i} cx={gx(i)} cy={gy(d[yField])} r="3" fill="#0b0b14" stroke={color} strokeWidth="1.5" />)}
          <text x={pad.l-4} y={gy(maxV)+3} fill="rgba(255,255,255,0.28)" fontSize="8" textAnchor="end">{maxV > 1000 ? `${(maxV/1000).toFixed(1)}k` : Math.round(maxV)}</text>
          {chartData.map((d,i) => i % 2 === 0 && <text key={i} x={gx(i)} y={H-4} fill="rgba(255,255,255,0.28)" fontSize="8" textAnchor="middle">{String(d[xField]).slice(0,4)}</text>)}
        </svg>
      </div>
    );
  }
  if (chartType === 'bar') {
    const bw = Math.max(5, (W - pad.l - pad.r) / (chartData.length * 1.6));
    const sp = bw * 0.5;
    return (
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
          {chartData.map((d, i) => {
            const x = pad.l + i * (bw + sp);
            const y = gy(d[yField]);
            const bh = H - pad.b - y;
            return (<g key={i}>
              <rect x={x} y={y} width={bw} height={Math.max(1, bh)} fill={color} rx="2" opacity="0.88" />
              <text x={x+bw/2} y={H-4} fill="rgba(255,255,255,0.28)" fontSize="8" textAnchor="middle">{String(d[xField]).slice(0,3)}</text>
            </g>);
          })}
          <text x={pad.l-4} y={gy(maxV)+3} fill="rgba(255,255,255,0.28)" fontSize="8" textAnchor="end">{Math.round(maxV)}</text>
        </svg>
      </div>
    );
  }
  if (chartType === 'pie') {
    const total = vals.reduce((s, v) => s + v, 0);
    let cum = 0;
    const cx = W/2 - 25, cy = H/2, r = 34;
    return (
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
          {chartData.map((d, i) => {
            const val = Number(d[yField]) || 0;
            const angle = (val / total) * 360;
            const x1 = cx + r * Math.cos((cum - 90) * Math.PI / 180);
            const y1 = cy + r * Math.sin((cum - 90) * Math.PI / 180);
            cum += angle;
            const x2 = cx + r * Math.cos((cum - 90) * Math.PI / 180);
            const y2 = cy + r * Math.sin((cum - 90) * Math.PI / 180);
            const large = angle > 180 ? 1 : 0;
            return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`} fill={color} opacity={1 - i * 0.18} stroke="#0b0b14" strokeWidth="1.5" />;
          })}
          {chartData.slice(0,4).map((d,i) => (
            <g key={i} transform={`translate(${cx+r+14},${cy-16+i*14})`}>
              <rect width="6" height="6" fill={color} opacity={1-i*0.18} rx="1" />
              <text x="10" y="6" fill="rgba(255,255,255,0.6)" fontSize="9">{d[xField]}: {d[yField]}%</text>
            </g>
          ))}
        </svg>
      </div>
    );
  }
  return <div style={{ color:'var(--fg-dim)', fontSize:11, textAlign:'center' }}>Unsupported chart type</div>;
}

export function CountdownTimer({ targetDate, color }) {
  const [timeLeft, setTimeLeft] = useState('—');
  useEffect(() => {
    const target = new Date(targetDate || '2027-01-01T00:00:00');
    const tick = () => {
      const diff = target - new Date();
      if (diff <= 0) { setTimeLeft('Completed! 🎉'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  return (
    <div className="countdown-body">
      <div className="countdown-val" style={{ color: color || 'var(--primary)' }}>{timeLeft}</div>
    </div>
  );
}

export function InlineCardCreator({ card, onGenerate, onCancel }) {
  const [val, setVal] = useState('');
  const suggestions = ['Bitcoin price weekly chart', 'London current temperature', 'Top tech news feed', 'Interactive todo checklist', 'Miles to km converter', 'Portfolio crypto allocation'];
  const submit = e => { e.preventDefault(); if (val.trim()) onGenerate(card.id, val.trim()); };
  return (
    <div className="inline-creator">
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:6, flex:1 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'var(--primary)', display:'flex', alignItems:'center', gap:4 }}>
          <span className="material-symbols-outlined" style={{ fontSize:12 }}>bolt</span>
          Describe this card's intent:
        </div>
        <textarea
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e); } if (e.key === 'Escape') onCancel(card.id); }}
          placeholder="e.g. BTC weekly chart, weather in London, countdown timer..."
          autoFocus
        />
        <div className="inline-btns">
          <button type="submit" className="btn btn-primary btn-sm" disabled={!val.trim()} style={{ flex:1 }}>
            <span className="material-symbols-outlined">auto_awesome</span> Generate
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCancel(card.id)}>Cancel</button>
        </div>
      </form>
      <div>
        <div style={{ fontSize:9, color:'var(--fg-dim)', fontWeight:700, marginBottom:4, letterSpacing:'0.1em' }}>SUGGESTIONS</div>
        <div className="sugg-chips">
          {suggestions.map(s => <button key={s} type="button" className="sugg-chip" onClick={() => setVal(s)}>{s}</button>)}
        </div>
      </div>
    </div>
  );
}

export function CardBody({ card, handlers }) {
  if (card.loading) {
    return (
      <div className="card-loading">
        <span className="material-symbols-outlined spinning" style={{ fontSize:28, color:'var(--primary)', opacity:0.75 }}>psychology</span>
        <div className="sk-bars">
          <div className="sk-bar" style={{ width:'100%' }} />
          <div className="sk-bar" style={{ width:'70%' }} />
          <div className="sk-bar" style={{ width:'50%' }} />
        </div>
      </div>
    );
  }
  if (card.error) {
    return (
      <div className="card-error">
        <span className="material-symbols-outlined">warning</span>
        <div className="err-title">Pipeline Failed</div>
        <div className="err-desc">{card.error}</div>
        <button className="btn btn-secondary btn-sm" onClick={() => handlers.onRefresh(card.id)}>
          <span className="material-symbols-outlined">refresh</span> Retry
        </button>
      </div>
    );
  }
  const { cardType, data, renderSpec } = card;
  switch (cardType) {
    case 'chart':
      return (
        <div style={{ display:'flex', flexDirection:'column', height:'100%', gap:0 }}>
          <SVGChart card={card} />
          {renderSpec?.summary && <p className="chart-summary">💡 {renderSpec.summary}</p>}
        </div>
      );
    case 'stat': {
      let statVal = data?.value, statTrend = data?.trend;
      const list = Array.isArray(data) ? data : (data?.rows || data?.items || []);
      if (Array.isArray(list) && list.length > 0) {
        const last = list[list.length-1], prev = list[list.length-2];
        const keys = Object.keys(last);
        const yk = renderSpec?.yField || keys.find(k => typeof last[k]==='number') || keys[0];
        if (last[yk] !== undefined) {
          const raw = parseFloat(last[yk]) || 0;
          statVal = typeof last[yk]==='number' ? (raw>1000 ? `$${raw.toLocaleString()}` : raw.toFixed(2)) : last[yk];
          if (prev?.[yk]) { const rp = parseFloat(prev[yk])||0; if (rp>0) { const pct=((raw-rp)/rp*100).toFixed(1); statTrend = raw>=rp ? `+${pct}%` : `${pct}%`; } }
        }
      }
      const dir = statTrend?.startsWith('+') ? 'up' : statTrend?.startsWith('-') ? 'down' : 'neutral';
      const ico = dir==='up' ? 'trending_up' : dir==='down' ? 'trending_down' : 'trending_flat';
      return (
        <div className="stat-body">
          <div className="stat-val" style={{ color: renderSpec?.color || 'var(--fg)' }}>{statVal || '—'}</div>
          <div className={`stat-trend ${dir}`}><span className="material-symbols-outlined">{ico}</span>{statTrend || '—'}</div>
          <div className="stat-spark"><svg viewBox="0 0 100 20" width="100%" height="100%"><polyline fill="none" stroke={renderSpec?.color||'var(--success)'} strokeWidth="1.5" points="0,16 15,12 30,14 45,8 60,11 75,5 90,7 100,3" /></svg></div>
        </div>
      );
    }
    case 'article': {
      const headline = data?.headline || card.title;
      let body = data?.body || renderSpec?.summary || '';
      if (!body) { if (Array.isArray(data)) body=`Dataset: ${data.length} entries.`; else if (data?.rows) body=`Table: ${data.rows.length} rows.`; else body='No summary available.'; }
      return <div className="article-body"><div className="article-headline">{headline}</div><div className="article-content">{body}</div></div>;
    }
    case 'table': {
      let headers = data?.headers, rows = data?.rows;
      if (Array.isArray(data)) { headers = Object.keys(data[0]||{}); rows = data; }
      else if (data?.markers) { headers=['Name','Coords','Info']; rows=data.markers.map(m=>({Name:m.name,Coords:m.coords.join(', '),Info:m.desc||''})); }
      else if (data?.items) { headers=['Task','Status']; rows=data.items.map(i=>({Task:i.text,Status:i.done?'Done ✓':'Pending'})); }
      if (!headers || !rows) return <div className="card-error"><div className="err-title">No table data</div></div>;
      return (
        <div style={{ overflow:'auto', width:'100%', height:'100%' }}>
          <table className="tbl">
            <thead><tr>{headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((row,i)=><tr key={i}>{headers.map((h,j)=><td key={j}>{row[h]}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    }
    case 'map': {
      if (!data?.markers) return <div className="card-error"><div className="err-title">No map data</div></div>;
      return (
        <div className="map-body">
          <svg viewBox="0 0 300 150" width="100%" height="100%" style={{ opacity:0.1, position:'absolute' }}>
            <path d="M20,40 Q80,20 140,45 T230,35 T290,30 L290,115 Q240,128 190,108 T110,110 T40,105 Z" fill="none" stroke="#fff" strokeWidth="1.5" />
          </svg>
          {data.markers.map((m,i) => {
            const x = 150 + (m.coords[1] / 180) * 130;
            const y = 75 - (m.coords[0] / 90) * 58;
            return (
              <div key={i} title={m.desc} style={{ position:'absolute', left:`${x}px`, top:`${y}px`, transform:'translate(-50%,-50%)', display:'flex', flexDirection:'column', alignItems:'center' }}>
                <span className="material-symbols-outlined ms-fill" style={{ fontSize:14, color:renderSpec?.color||'#ef4444' }}>location_on</span>
                <div style={{ background:'rgba(0,0,0,0.85)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:3, padding:'1px 5px', fontSize:7, color:'#fff', whiteSpace:'nowrap', marginTop:1 }}>{m.name}</div>
              </div>
            );
          })}
        </div>
      );
    }
    case 'media':
      return (
        <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:6 }}>
          <img src={data?.url||'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=600&auto=format&fit=crop'} alt={data?.caption||''} style={{ width:'100%', flex:1, minHeight:0, objectFit:'cover', borderRadius:8 }} />
          {data?.caption && <div style={{ fontSize:10, color:'var(--fg-muted)' }}>{data.caption}</div>}
        </div>
      );
    case 'feed': {
      const list = Array.isArray(data) ? data : (data?.rows || data?.items || []);
      if (!list.length) return <div className="card-error"><div className="err-title">No feed data</div></div>;
      return (
        <div className="feed-list">
          {list.map((item,i) => {
            const title = item.title || item.headline || item.text || item.name || `Item ${i+1}`;
            const sub = item.time || item.date || (item.done!==undefined ? (item.done?'Done':'Pending') : '');
            return (
              <div key={i} className="feed-item">
                <span className="material-symbols-outlined">{item.done!==undefined?'check_circle':'rss_feed'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <a href={item.url||'#'} className="feed-title">{title}</a>
                  {sub && <div className="feed-time">{sub}</div>}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    case 'interactive': {
      if (!data) return <div className="card-error"><div className="err-title">Widget not initialized</div></div>;
      if (data.widgetType === 'checklist') {
        const done = data.items?.filter(i=>i.done).length || 0;
        const total = data.items?.length || 1;
        const pct = Math.round((done/total)*100);
        return (
          <div className="inter-body">
            <div className="progress-bar"><div className="progress-fill" style={{ width:`${pct}%`, background:renderSpec?.color||'var(--primary)' }} /></div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:1, overflowY:'auto' }}>
              {data.items?.map(item => (
                <label key={item.id} className="check-item">
                  <input type="checkbox" checked={item.done} onChange={() => handlers.onChecklistToggle(card.id, item.id)} style={{ accentColor:renderSpec?.color||'var(--primary)' }} />
                  <span className={`check-text ${item.done?'done':''}`}>{item.text}</span>
                </label>
              ))}
            </div>
            {renderSpec?.summary && <div style={{ fontSize:10, color:'var(--fg-dim)', borderTop:'1px solid var(--border)', paddingTop:5 }}>📊 {renderSpec.summary}</div>}
          </div>
        );
      }
      if (data.widgetType === 'converter') {
        const val = data.initialValue || 0;
        return (
          <div className="conv-body">
            <input type="number" className="conv-input" value={val} onChange={e => handlers.onConverterChange(card.id, e.target.value)} />
            <span className="conv-lbl">{data.fromUnit||'mi'}</span>
            <span className="material-symbols-outlined" style={{ fontSize:16, color:'var(--fg-dim)' }}>sync_alt</span>
            <div className="conv-result" style={{ color:renderSpec?.color||'var(--fg)' }}>{(val*1.60934).toFixed(2)}</div>
            <span className="conv-lbl">{data.toUnit||'km'}</span>
          </div>
        );
      }
      if (data.widgetType === 'timer') return <CountdownTimer targetDate={data.targetDate} color={renderSpec?.color} />;
      return <div className="card-error"><div className="err-title">Unknown widget type</div></div>;
    }
    default:
      return <div className="card-error"><div className="err-title">Unsupported card type: {cardType}</div></div>;
  }
}
