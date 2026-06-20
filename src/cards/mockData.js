/*
 * Mock provider data for tests and the offline gallery.
 *
 * Returns values in the SAME shape `resolveBindings` produces (i.e. already
 * path-extracted into data[key]), so cards render with realistic content without
 * any network. Keyed by provider id.
 */

const now = Date.UTC(2026, 5, 20);
const day = 86400000;

function walk(n, start, vol) {
  const out = []; let v = start;
  for (let i = 0; i < n; i++) { v = Math.max(1, v * (1 + (Math.sin(i / 3) * vol) / 100 + (i % 5 === 0 ? vol / 200 : -vol / 300))); out.push(v); }
  return out;
}

const PROVIDER_MOCKS = {
  crypto_price: (p) => {
    const base = { bitcoin: 63420, ethereum: 3410, solana: 148 }[p.id] || 100;
    return { usd: base, usd_24h_change: 2.4 - (p.id === 'solana' ? 3.8 : 0) };
  },
  crypto_history: (p) => {
    const n = Number(p.days) || 7;
    const start = { bitcoin: 60000, ethereum: 3200, solana: 140 }[p.id] || 100;
    const prices = walk(Math.min(n, 60), start, 6).map((v, i) => [now - (n - i) * day, Math.round(v)]);
    return { prices };
  },
  crypto_trending: () => ({ /* path 'coins' */ }),
  fx_table: () => ({ EUR: 0.921, GBP: 0.788, JPY: 156.3, CHF: 0.896, CNY: 7.24, AUD: 1.503, CAD: 1.366 }),
  fx_history: () => {
    const o = {}; const vals = walk(40, 1.07, 1.2);
    vals.forEach((v, i) => { const d = new Date(now - (40 - i) * day).toISOString().slice(0, 10); o[d] = { USD: Number(v.toFixed(4)) }; });
    return o;
  },
  weather: () => {
    const days = 7;
    const time = Array.from({ length: days }, (_, i) => new Date(now + i * day).toISOString().slice(0, 10));
    return {
      current: { temperature_2m: 19.4, apparent_temperature: 18.1, relative_humidity_2m: 64, wind_speed_10m: 12, weather_code: 2 },
      daily: {
        time,
        weather_code: [0, 1, 2, 3, 61, 80, 1],
        temperature_2m_max: [22, 23, 21, 19, 18, 20, 24],
        temperature_2m_min: [13, 14, 13, 12, 11, 12, 15],
        precipitation_probability_max: [5, 10, 30, 60, 80, 40, 10],
      },
    };
  },
  air_quality: () => ({ us_aqi: 42, pm2_5: 9.1, pm10: 16.2 }),
  hn_news: (p) => Array.from({ length: 12 }, (_, i) => ({
    title: `${(p.query || 'Tech').replace(/^\w/, c => c.toUpperCase())} story ${i + 1}: a notable development in the field`,
    url: `https://news.ycombinator.com/item?id=${1000 + i}`, points: 320 - i * 17, author: `user${i}`, created_at: new Date(now - i * 3600000).toISOString(),
  })),
  github_trending: () => Array.from({ length: 10 }, (_, i) => ({
    full_name: `org${i}/awesome-project-${i}`, stargazers_count: 90000 - i * 7000, html_url: `https://github.com/org${i}/p`, language: ['TypeScript', 'Python', 'Rust', 'Go'][i % 4],
  })),
  github_repo: () => ({ stargazers_count: 228000, forks_count: 46500, open_issues_count: 740 }),
  world_bank: (p) => Array.from({ length: 12 }, (_, i) => ({ date: String(2023 - i), value: (p.indicator?.includes('POP') ? 8.0e9 : 2.6e13) * (1 - i * 0.018) })),
  country: () => ({ name: { common: 'Japan' }, flags: { png: 'https://flagcdn.com/w320/jp.png' }, population: 125800000, capital: ['Tokyo'] }),
  wiki_summary: () => ({ extract: 'Bitcoin is a decentralized digital currency, without a central bank or single administrator, that can be sent from user to user on the peer-to-peer bitcoin network.', thumbnail: { source: '' }, title: 'Bitcoin' }),
  stock_quote: () => ({ price: 213.4, change: 2.6, changePercent: 1.23 }),
  stock_history: () => walk(40, 180, 3).map((v, i) => ({ date: new Date(now - (40 - i) * day).toISOString().slice(0, 10), close: Number(v.toFixed(2)) })),
  my_calendar: () => ({ items: [{ summary: 'Standup', start: { dateTime: new Date(now + 3600000).toISOString() } }, { summary: 'Design review', start: { dateTime: new Date(now + 9000000).toISOString() } }] }),
  my_tasks: () => ({ items: [{ id: 't1', title: 'Ship release', status: 'needsAction', due: new Date(now + day).toISOString() }, { id: 't2', title: 'Write changelog', status: 'needsAction' }] }),
};

// crypto_trending uses path 'coins' → array; provide that separately.
PROVIDER_MOCKS.crypto_trending = () => Array.from({ length: 8 }, (_, i) => ({ item: { name: ['Bitcoin', 'Ethereum', 'Solana', 'Toncoin', 'Dogecoin', 'Cardano', 'Avalanche', 'Chainlink'][i], symbol: ['btc', 'eth', 'sol', 'ton', 'doge', 'ada', 'avax', 'link'][i] } }));

/* Resolve a card's bindings to a mock data object (mirrors resolveBindings). */
export function mockResolve(dataBindings = []) {
  const data = {};
  for (const b of dataBindings) {
    if (!b || !b.key) continue;
    const fn = PROVIDER_MOCKS[b.provider];
    data[b.key] = fn ? fn(b.params || {}) : { __error: `no mock for ${b.provider}` };
  }
  return data;
}

export { PROVIDER_MOCKS };
