/*
 * Named data adapters.
 *
 * The new architecture never asks the model to write code. A card spec may name
 * ONE adapter (a pure, host-owned transform) that turns resolved binding data
 * into the props its typed component expects. Because adapters are referenced by
 * NAME (a string), specs stay fully JSON-serializable — the model just writes
 * `"adapter": "crypto_history"` and the host runs the tested function.
 *
 * Each adapter: (data, spec) -> partial props  (merged over spec.props).
 *   - `data`   is the resolved { key: value } object (static spec.data merged
 *              with the live values from resolveBindings).
 *   - `spec`   is the full card spec (adapters read spec.source / spec.props).
 * Adapters must NEVER throw — bad/missing data yields an empty/skeleton shape so
 * the component renders an empty state instead of crashing.
 */

const num = (v, d = null) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const isErr = v => v && typeof v === 'object' && '__error' in v;
const arr = v => (Array.isArray(v) ? v : []);
const fmtDay = ms => { try { return new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric' }); } catch { return ''; } };

export const ADAPTERS = {
  /* CoinGecko market_chart { prices:[[ms,price]] } -> time series */
  crypto_history: (data, spec) => {
    const raw = data[spec.source];
    const prices = arr(raw?.prices);
    const series = prices.map(([t, value]) => ({ t, label: fmtDay(t), value: num(value, 0) }));
    return { series, yLabel: spec.props?.yLabel || 'Price' };
  },

  /* CoinGecko simple/price (path=<id>) { usd, usd_24h_change } -> KPI */
  crypto_price: (data, spec) => {
    const raw = data[spec.source] || {};
    if (isErr(raw)) return { value: null, error: raw.__error };
    const vs = (spec.props?.vs || 'usd').toLowerCase();
    return { value: num(raw[vs]), delta: num(raw[`${vs}_24h_change`]), unit: vs.toUpperCase(), deltaUnit: '%' };
  },

  /* Frankfurter latest (path=rates) { EUR:.., GBP:.. } -> rows */
  fx_table: (data, spec) => {
    const raw = data[spec.source] || {};
    if (isErr(raw)) return { rows: [], error: raw.__error };
    const base = spec.props?.base || 'USD';
    const rows = Object.entries(raw).map(([cur, rate]) => ({ pair: `${base}/${cur}`, rate: num(rate) }));
    return { columns: [{ key: 'pair', label: 'Pair' }, { key: 'rate', label: 'Rate', align: 'right' }], rows };
  },

  /* Frankfurter range (path=rates) { date:{CUR:rate} } -> time series */
  fx_history: (data, spec) => {
    const raw = data[spec.source] || {};
    if (isErr(raw)) return { series: [] };
    const to = spec.props?.to;
    const series = Object.entries(raw)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, m]) => ({ t: date, label: date.slice(5), value: num(to ? m?.[to] : Object.values(m || {})[0], 0) }));
    return { series, yLabel: spec.props?.yLabel || 'Rate' };
  },

  /* Open-Meteo forecast -> { current, daily[] } */
  weather: (data, spec) => {
    const raw = data[spec.source] || {};
    if (isErr(raw)) return { error: raw.__error };
    const c = raw.current || {};
    const d = raw.daily || {};
    const days = arr(d.time).map((date, i) => ({
      date, label: (() => { try { return new Date(date).toLocaleDateString([], { weekday: 'short' }); } catch { return date; } })(),
      max: num(d.temperature_2m_max?.[i]), min: num(d.temperature_2m_min?.[i]),
      code: num(d.weather_code?.[i]), precip: num(d.precipitation_probability_max?.[i]),
    }));
    return {
      place: spec.props?.place || 'Weather',
      current: { temp: num(c.temperature_2m), feels: num(c.apparent_temperature), humidity: num(c.relative_humidity_2m), wind: num(c.wind_speed_10m), code: num(c.weather_code) },
      days,
    };
  },

  /* HN / proxy news arrays -> article items */
  news_list: (data, spec) => {
    const raw = data[spec.source];
    if (isErr(raw)) return { items: [], error: raw.__error };
    const items = arr(raw).slice(0, spec.props?.limit || 12).map(a => ({
      title: a.title || a.headline || 'Untitled',
      url: a.url || a.link || (a.objectID ? `https://news.ycombinator.com/item?id=${a.objectID}` : null),
      source: a.source?.name || a.source || a.author || (a.points != null ? `${a.points} pts` : ''),
      time: a.created_at || a.publishedAt || null,
      image: a.image || a.urlToImage || null,
    }));
    return { items };
  },

  /* Proxy stock history [{date,close}] -> series */
  stock_history: (data, spec) => {
    const raw = arr(data[spec.source]);
    const series = raw.map(r => ({ t: r.date, label: String(r.date).slice(5), value: num(r.close ?? r.price, 0) }));
    return { series, yLabel: spec.props?.symbol || 'Close' };
  },

  /* Proxy stock quote -> KPI */
  stock_quote: (data, spec) => {
    const raw = data[spec.source] || {};
    if (isErr(raw)) return { value: null, error: raw.__error };
    return { value: num(raw.price), delta: num(raw.changePercent ?? raw.change), unit: '$', deltaUnit: '%' };
  },

  /* World Bank (path='1') [{date,value}] -> series (oldest->newest) */
  worldbank_series: (data, spec) => {
    const raw = arr(data[spec.source]).filter(r => r && r.value != null);
    const series = raw.slice().reverse().map(r => ({ t: r.date, label: r.date, value: num(r.value, 0) }));
    return { series, yLabel: spec.props?.yLabel || 'Value' };
  },

  /* Generic: read an array at spec.source, map x/y keys into a series */
  generic_series: (data, spec) => {
    const raw = arr(data[spec.source]);
    const { x = 'x', y = 'y' } = spec.props || {};
    return { series: raw.map(r => ({ t: r[x], label: String(r[x]), value: num(r[y], 0) })) };
  },

  /* Generic: read an array at spec.source straight into table rows */
  generic_table: (data, spec) => {
    const raw = arr(data[spec.source]);
    return { rows: raw };
  },

  /* Open-Meteo air quality (path=current) -> gauge */
  air_quality: (data, spec) => {
    const raw = data[spec.source] || {};
    if (isErr(raw)) return { value: 0, error: raw.__error };
    const aqi = num(raw.us_aqi, 0);
    const band = aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy (sensitive)' : 'Unhealthy';
    return { value: aqi, max: 200, label: spec.props?.label || `US AQI · ${band}` };
  },

  /* CoinGecko trending (path=coins) -> table rows */
  crypto_trending: (data, spec) => {
    const coins = arr(data[spec.source]).map((c, i) => {
      const it = c.item || c;
      return { rank: i + 1, name: it.name || '—', symbol: (it.symbol || '').toUpperCase() };
    });
    return { columns: [{ key: 'rank', label: '#' }, { key: 'name', label: 'Coin' }, { key: 'symbol', label: 'Symbol' }], rows: coins };
  },

  /* GitHub repo search (path=items) -> news-style feed */
  github_list: (data, spec) => {
    const items = arr(data[spec.source]).slice(0, spec.props?.limit || 12).map(r => ({
      title: r.full_name || r.name || 'repo',
      url: r.html_url || null,
      source: r.stargazers_count != null ? `★ ${Number(r.stargazers_count).toLocaleString()}` : (r.language || ''),
      time: null, image: null,
    }));
    return { items };
  },

  /* GitHub single repo (path=null) -> kpi group */
  github_stats: (data, spec) => {
    const r = data[spec.source] || {};
    if (isErr(r)) return { stats: [], error: r.__error };
    return { stats: [
      { label: 'Stars', value: num(r.stargazers_count, 0) },
      { label: 'Forks', value: num(r.forks_count, 0) },
      { label: 'Open issues', value: num(r.open_issues_count, 0) },
    ] };
  },

  /* RestCountries (path='0') -> flag image */
  country_flag: (data, spec) => {
    const c = data[spec.source] || {};
    if (isErr(c)) return { src: '', error: c.__error };
    return { src: c.flags?.png || c.flags?.svg || '', caption: c.name?.common || spec.props?.caption || '' };
  },

  /* Wikipedia summary (path=null) -> note text */
  wiki: (data, spec) => {
    const w = data[spec.source] || {};
    if (isErr(w)) return { text: w.__error };
    return { text: w.extract || 'No summary available.' };
  },

  /* Google Calendar (path=null) -> timeline events */
  calendar_events: (data, spec) => {
    const items = arr((data[spec.source] || {}).items).slice(0, spec.props?.limit || 10);
    const events = items.map(e => {
      const when = e.start?.dateTime || e.start?.date || '';
      let time = when;
      try { time = when ? new Date(when).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : ''; } catch { /* keep raw */ }
      return { time, title: e.summary || '(busy)', sub: e.location || '' };
    });
    return { events };
  },

  /* Google Tasks (path=null) -> checklist */
  tasks_list: (data, spec) => {
    const items = arr((data[spec.source] || {}).items)
      .filter(t => t && t.title)
      .slice(0, spec.props?.limit || 15)
      .map(t => ({ text: t.title, sub: t.due ? `Due ${String(t.due).slice(0, 10)}` : '', id: t.id }));
    return { items, checklist: true };
  },
};

/* Apply a spec's named adapter (if any) to resolved data, returning final props. */
export function applyAdapter(spec, data) {
  const base = spec.props && typeof spec.props === 'object' ? spec.props : {};
  if (!spec.adapter || !ADAPTERS[spec.adapter]) return base;
  let derived;
  try { derived = ADAPTERS[spec.adapter](data || {}, spec) || {}; }
  catch (err) { derived = { error: `adapter ${spec.adapter} failed: ${err.message}` }; }
  return { ...base, ...derived };
}
