/*
 * Agntdash data proxy (Task 3).
 *
 * A tiny, dependency-free Node server (Node 18+, uses global fetch). It exists to
 * defeat browser CORS and optionally inject premium API keys, exposing the data
 * the client's `viaProxy` providers need (stocks, news, images, sports).
 *
 * It is KEYLESS by default — stocks via stooq, news via Google News RSS, images
 * via Openverse, sports via TheSportsDB free tier — so it works the moment it is
 * deployed. Set the optional env keys below to upgrade individual sources.
 *
 * Run:   node proxy/server.js           (listens on PORT, default 8787)
 * Wire:  set VITE_DATA_PROXY_URL=https://your-proxy.example.com in the client.
 *
 * Optional env: ALLOWED_ORIGIN (CORS, default *), PORT,
 *   STOCK_API_KEY (finnhub), NEWS_API_KEY (newsapi.org), IMAGE_API_KEY (unsplash).
 *
 * Deploy anywhere that runs Node (Render/Railway/Fly/a VM) or adapt the handlers
 * to a serverless function (Vercel/Cloudflare) — each route is independent.
 */
import http from 'node:http';

const PORT = process.env.PORT || 8787;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const json = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=30',
  });
  res.end(JSON.stringify(body));
};

const YF_RANGES = new Set(['1mo', '3mo', '6mo', '1y', '2y', '5y']);
const yfChart = (symbol, range) => fetch(
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`,
  { headers: { 'User-Agent': 'Mozilla/5.0' } },
).then(r => r.json());

// ── Stocks (keyless via Yahoo Finance; Finnhub if STOCK_API_KEY set) ─────────
async function stockQuote(q) {
  const symbol = String(q.symbol || 'AAPL').trim().toUpperCase();
  const j = await yfChart(symbol, '5d');
  const m = j?.chart?.result?.[0]?.meta;
  if (!m || m.regularMarketPrice == null) return { __error: j?.chart?.error?.description || 'unknown symbol' };
  const price = m.regularMarketPrice, prev = m.chartPreviousClose ?? m.previousClose ?? price;
  return {
    symbol: m.symbol, currency: m.currency, exchange: m.fullExchangeName,
    price, previousClose: prev,
    change: +(price - prev).toFixed(2), changePercent: prev ? +(((price - prev) / prev) * 100).toFixed(2) : 0,
    dayHigh: m.regularMarketDayHigh, dayLow: m.regularMarketDayLow,
  };
}
async function stockHistory(q) {
  const symbol = String(q.symbol || 'AAPL').trim().toUpperCase();
  const range = YF_RANGES.has(q.range) ? q.range : '3mo';
  const j = await yfChart(symbol, range);
  const r = j?.chart?.result?.[0];
  if (!r?.timestamp) return [];
  const closes = r.indicators?.quote?.[0]?.close || [];
  return r.timestamp.map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 10), close: closes[i] }))
    .filter(p => Number.isFinite(p.close));
}

// ── News (keyless via Google News RSS) ──────────────────────────────────────
function rssItems(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g; let m;
  const tag = (s, t) => { const mm = s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`)); return mm ? mm[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : ''; };
  while ((m = re.exec(xml)) && items.length < 20) {
    const b = m[1];
    const title = tag(b, 'title');
    items.push({ title: title.replace(/ - [^-]*$/, ''), source: (title.match(/ - ([^-]*)$/) || [])[1] || tag(b, 'source'), url: tag(b, 'link'), publishedAt: tag(b, 'pubDate'), image: null });
  }
  return items;
}
async function news(q) {
  if (process.env.NEWS_API_KEY) {
    const u = new URL('https://newsapi.org/v2/top-headlines');
    if (q.query) u.searchParams.set('q', q.query);
    if (q.category) u.searchParams.set('category', q.category);
    u.searchParams.set('language', 'en'); u.searchParams.set('pageSize', '15');
    u.searchParams.set('apiKey', process.env.NEWS_API_KEY);
    const r = await fetch(u); const j = await r.json();
    return { articles: (j.articles || []).map(a => ({ title: a.title, source: a.source?.name, url: a.url, publishedAt: a.publishedAt, image: a.urlToImage })) };
  }
  const term = q.query || q.category || 'world';
  const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(term)}&hl=en-US&gl=US&ceid=US:en`);
  return { articles: rssItems(await r.text()) };
}

// ── Images (keyless via Openverse; Unsplash if key set) ─────────────────────
async function images(q) {
  if (process.env.IMAGE_API_KEY) {
    const r = await fetch(`https://api.unsplash.com/search/photos?per_page=1&query=${encodeURIComponent(q.query || '')}&client_id=${process.env.IMAGE_API_KEY}`);
    const j = await r.json(); const hit = j.results?.[0];
    return hit ? { url: hit.urls?.regular, credit: hit.user?.name, source: 'Unsplash' } : { __error: 'no image' };
  }
  const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q.query || '')}&page_size=1`);
  const j = await r.json(); const hit = j.results?.[0];
  return hit ? { url: hit.url, credit: hit.creator, source: hit.source } : { __error: 'no image' };
}

// ── Sports (TheSportsDB free tier) ──────────────────────────────────────────
async function sports(q) {
  const key = process.env.SPORTS_API_KEY || '3';
  if (q.team) {
    const r = await fetch(`https://www.thesportsdb.com/api/v1/json/${key}/searchteams.php?t=${encodeURIComponent(q.team)}`);
    const j = await r.json(); const id = j.teams?.[0]?.idTeam;
    if (!id) return { __error: 'team not found' };
    const r2 = await fetch(`https://www.thesportsdb.com/api/v1/json/${key}/eventslast.php?id=${id}`);
    return (await r2.json()).results || [];
  }
  const r = await fetch(`https://www.thesportsdb.com/api/v1/json/${key}/eventspastleague.php?id=${encodeURIComponent(q.league || '4328')}`);
  return (await r.json()).events || [];
}

const ROUTES = {
  '/stocks/quote': stockQuote,
  '/stocks/history': stockHistory,
  '/news': news,
  '/images': images,
  '/sports': sports,
};

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const u = new URL(req.url, `http://${req.headers.host}`);
  if (u.pathname === '/health') return json(res, 200, { ok: true });
  const handler = ROUTES[u.pathname];
  if (!handler) return json(res, 404, { __error: 'unknown route' });
  try {
    const params = Object.fromEntries(u.searchParams.entries());
    const data = await handler(params);
    return json(res, 200, data);
  } catch (err) {
    return json(res, 200, { __error: `proxy error: ${err.message}` });
  }
}).listen(PORT, () => console.log(`Agntdash data proxy on :${PORT}`));
