/*
 * PREDEFINED CARD LIBRARY — 10 categories × 10 = 100 instant cards.
 *
 * Each template is a ready-to-render card SPEC (no LLM call). The instant tier
 * (router.matchTemplate) maps a prompt straight to one of these, so the most
 * common personal/work requests render in milliseconds with zero model cost.
 *
 * Template shape:
 *   { id, category, label, prompt, kw:[match keywords],
 *     spec: { type, title, cols, rows, chrome?, bleed?, accent?,
 *             dataBindings?, adapter?, source?, props? } }
 *
 * LIVE templates declare dataBindings (resolved by the existing provider layer)
 * + a named adapter. STATIC templates embed representative sample data in props
 * (clearly user-replaceable). Both render through the same SpecCard pipeline.
 */

// binding helper
const b = (key, provider, params = {}, refreshSec) => ({ key, provider, params, ...(refreshSec ? { refreshSec } : {}) });
// quick series builder for sample data
const series = (labels, vals) => labels.map((label, i) => ({ label, value: vals[i] }));

const COLORS = {
  finance: '#10b981', crypto: '#f59e0b', markets: '#6366f1', weather: '#06b6d4', news: '#ef4444',
  personal: '#a855f7', health: '#22c55e', work: '#6366f1', travel: '#f97316', utility: '#06b6d4',
};

/* Future-ish ISO date helper for countdowns. */
const futureISO = (days) => new Date(Date.now() + days * 86400000).toISOString();

export const TEMPLATES = [
  /* ───────────────────────── 1. FINANCE ───────────────────────── */
  { id: 'fin-budget', category: 'Finance', label: 'Monthly Budget', prompt: 'Monthly budget by category', kw: ['budget', 'monthly budget', 'spending plan'],
    spec: { type: 'bar_chart', title: 'Monthly Budget', cols: 6, rows: 3, accent: COLORS.finance, props: { series: series(['Rent', 'Food', 'Transport', 'Fun', 'Savings', 'Bills'], [1500, 600, 250, 300, 700, 400]) } } },
  { id: 'fin-spend', category: 'Finance', label: 'Spending Breakdown', prompt: 'Where my money goes this month', kw: ['spending', 'expenses breakdown', 'where my money'],
    spec: { type: 'pie_chart', title: 'Spending Breakdown', cols: 5, rows: 3, accent: COLORS.finance, props: { donut: true, slices: series(['Housing', 'Food', 'Transport', 'Leisure', 'Other'], [40, 20, 12, 15, 13]) } } },
  { id: 'fin-networth', category: 'Finance', label: 'Net Worth Trend', prompt: 'My net worth over the last year', kw: ['net worth', 'networth', 'wealth trend'],
    spec: { type: 'area_chart', title: 'Net Worth', cols: 7, rows: 3, accent: COLORS.finance, props: { yLabel: 'Net worth', series: series(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], [42000, 43500, 44200, 46800, 48100, 51000]) } } },
  { id: 'fin-savings', category: 'Finance', label: 'Savings Goals', prompt: 'Track my savings goals', kw: ['savings goal', 'save for', 'savings'],
    spec: { type: 'progress', title: 'Savings Goals', cols: 5, rows: 2, accent: COLORS.finance, props: { goals: [{ label: 'Emergency Fund', value: 6500, max: 10000, unit: '$' }, { label: 'Vacation', value: 1200, max: 3000, unit: '$' }, { label: 'New Car', value: 8000, max: 25000, unit: '$' }] } } },
  { id: 'fin-income', category: 'Finance', label: 'Income vs Expense', prompt: 'Income versus expenses summary', kw: ['income vs expense', 'cash flow', 'income expense'],
    spec: { type: 'kpi_group', title: 'Cash Flow', cols: 6, rows: 2, accent: COLORS.finance, props: { stats: [{ label: 'Income', value: 5200, unit: '$' }, { label: 'Expenses', value: 3750, unit: '$' }, { label: 'Saved', value: 1450, unit: '$', delta: 12, deltaUnit: '%' }, { label: 'Savings Rate', value: 28, unit: '%' }] } } },
  { id: 'fin-bills', category: 'Finance', label: 'Bills Checklist', prompt: 'Bills to pay this month', kw: ['bills', 'pay bills', 'bills checklist'],
    spec: { type: 'list', title: 'Bills This Month', cols: 4, rows: 3, accent: COLORS.finance, props: { checklist: true, items: [{ text: 'Rent', sub: 'Due 1st · $1,500' }, { text: 'Electricity', sub: 'Due 8th · $90' }, { text: 'Internet', sub: 'Due 12th · $60' }, { text: 'Phone', sub: 'Due 15th · $45' }, { text: 'Credit Card', sub: 'Due 22nd · $320' }] } } },
  { id: 'fin-emergency', category: 'Finance', label: 'Emergency Fund', prompt: 'Emergency fund progress gauge', kw: ['emergency fund', 'rainy day fund'],
    spec: { type: 'gauge', title: 'Emergency Fund', cols: 3, rows: 3, accent: COLORS.finance, props: { value: 65, max: 100, unit: '%', label: 'of 6mo target' } } },
  { id: 'fin-debt', category: 'Finance', label: 'Debt Payoff', prompt: 'Debt payoff progress', kw: ['debt', 'loan payoff', 'pay off debt'],
    spec: { type: 'progress', title: 'Debt Payoff', cols: 5, rows: 2, accent: COLORS.finance, props: { goals: [{ label: 'Student Loan', value: 12000, max: 30000, unit: '$', color: '#ef4444' }, { label: 'Car Loan', value: 9000, max: 12000, unit: '$', color: '#f59e0b' }] } } },
  { id: 'fin-subs', category: 'Finance', label: 'Subscriptions', prompt: 'My recurring subscriptions', kw: ['subscriptions', 'recurring', 'subscription tracker'],
    spec: { type: 'table', title: 'Subscriptions', cols: 5, rows: 3, accent: COLORS.finance, props: { columns: [{ key: 'name', label: 'Service' }, { key: 'cost', label: '$/mo', align: 'right' }, { key: 'renews', label: 'Renews' }], rows: [{ name: 'Netflix', cost: 15.49, renews: '12th' }, { name: 'Spotify', cost: 10.99, renews: '3rd' }, { name: 'iCloud', cost: 2.99, renews: '1st' }, { name: 'Gym', cost: 39.0, renews: '5th' }] } } },
  { id: 'fin-fxconv', category: 'Finance', label: 'Currency Converter', prompt: 'Convert USD to EUR', kw: ['currency converter', 'usd to eur', 'convert currency'],
    spec: { type: 'converter', title: 'USD → EUR', cols: 4, rows: 2, accent: COLORS.finance, props: { factor: 0.92, fromUnit: 'USD', toUnit: 'EUR', base: 100 } } },

  /* ───────────────────────── 2. CRYPTO ───────────────────────── */
  { id: 'cry-btc-price', category: 'Crypto', label: 'Bitcoin Price', prompt: 'Bitcoin price now', kw: ['bitcoin price', 'btc price', 'bitcoin now'],
    spec: { type: 'kpi', title: 'Bitcoin', cols: 3, rows: 2, accent: COLORS.crypto, dataBindings: [b('btc', 'crypto_price', { id: 'bitcoin', vs: 'usd' })], adapter: 'crypto_price', source: 'btc', props: { label: 'BTC / USD', vs: 'usd', decimals: 0 } } },
  { id: 'cry-btc-7d', category: 'Crypto', label: 'Bitcoin 7-Day Chart', prompt: 'Bitcoin price this week as a chart', kw: ['bitcoin chart', 'btc week', 'bitcoin this week', 'bitcoin 7'],
    spec: { type: 'area_chart', title: 'Bitcoin · 7 Days', cols: 7, rows: 3, accent: COLORS.crypto, dataBindings: [b('btc', 'crypto_history', { id: 'bitcoin', vs: 'usd', days: 7 })], adapter: 'crypto_history', source: 'btc', props: { yLabel: 'BTC/USD' } } },
  { id: 'cry-eth-7d', category: 'Crypto', label: 'Ethereum 7-Day Chart', prompt: 'Ethereum price this week', kw: ['ethereum chart', 'eth week', 'ethereum this week', 'eth 7'],
    spec: { type: 'line_chart', title: 'Ethereum · 7 Days', cols: 7, rows: 3, accent: COLORS.crypto, dataBindings: [b('eth', 'crypto_history', { id: 'ethereum', vs: 'usd', days: 7 })], adapter: 'crypto_history', source: 'eth', props: { yLabel: 'ETH/USD' } } },
  { id: 'cry-alloc', category: 'Crypto', label: 'Portfolio Allocation', prompt: 'Crypto portfolio allocation', kw: ['crypto portfolio', 'portfolio allocation', 'crypto allocation'],
    spec: { type: 'pie_chart', title: 'Crypto Allocation', cols: 5, rows: 3, accent: COLORS.crypto, props: { donut: true, slices: series(['BTC', 'ETH', 'SOL', 'Other'], [50, 30, 12, 8]) } } },
  { id: 'cry-btc-30d', category: 'Crypto', label: 'Bitcoin 30-Day Chart', prompt: 'Bitcoin price last month', kw: ['bitcoin month', 'btc 30', 'bitcoin last month'],
    spec: { type: 'area_chart', title: 'Bitcoin · 30 Days', cols: 8, rows: 3, accent: COLORS.crypto, dataBindings: [b('btc', 'crypto_history', { id: 'bitcoin', vs: 'usd', days: 30 })], adapter: 'crypto_history', source: 'btc', props: { yLabel: 'BTC/USD' } } },
  { id: 'cry-eth-price', category: 'Crypto', label: 'Ethereum Price', prompt: 'Ethereum price now', kw: ['ethereum price', 'eth price', 'ethereum now'],
    spec: { type: 'kpi', title: 'Ethereum', cols: 3, rows: 2, accent: COLORS.crypto, dataBindings: [b('eth', 'crypto_price', { id: 'ethereum', vs: 'usd' })], adapter: 'crypto_price', source: 'eth', props: { label: 'ETH / USD', vs: 'usd', decimals: 0 } } },
  { id: 'cry-sol-price', category: 'Crypto', label: 'Solana Price', prompt: 'Solana price now', kw: ['solana price', 'sol price', 'solana now'],
    spec: { type: 'kpi', title: 'Solana', cols: 3, rows: 2, accent: COLORS.crypto, dataBindings: [b('sol', 'crypto_price', { id: 'solana', vs: 'usd' })], adapter: 'crypto_price', source: 'sol', props: { label: 'SOL / USD', vs: 'usd', decimals: 2 } } },
  { id: 'cry-feargreed', category: 'Crypto', label: 'Fear & Greed', prompt: 'Crypto fear and greed index', kw: ['fear and greed', 'fear greed', 'market sentiment'],
    spec: { type: 'gauge', title: 'Fear & Greed', cols: 3, rows: 3, accent: COLORS.crypto, props: { value: 62, max: 100, label: 'Greed' } } },
  { id: 'cry-sol-7d', category: 'Crypto', label: 'Solana 7-Day', prompt: 'Solana price this week', kw: ['solana chart', 'sol week', 'solana this week'],
    spec: { type: 'line_chart', title: 'Solana · 7 Days', cols: 7, rows: 3, accent: COLORS.crypto, dataBindings: [b('sol', 'crypto_history', { id: 'solana', vs: 'usd', days: 7 })], adapter: 'crypto_history', source: 'sol', props: { yLabel: 'SOL/USD' } } },
  { id: 'cry-stable', category: 'Crypto', label: 'Holdings Compare', prompt: 'Compare my crypto holdings value', kw: ['crypto holdings', 'compare coins', 'holdings'],
    spec: { type: 'bar_chart', title: 'Holdings ($)', cols: 6, rows: 3, accent: COLORS.crypto, props: { series: series(['BTC', 'ETH', 'SOL', 'ADA', 'DOT'], [12000, 7200, 2900, 800, 600]) } } },

  /* ───────────────────────── 3. STOCKS & MARKETS ───────────────────────── */
  { id: 'mkt-sp500', category: 'Markets', label: 'S&P 500 Trend', prompt: 'S&P 500 trend', kw: ['s&p 500', 'sp500', 'stock market trend', 'index trend'],
    spec: { type: 'area_chart', title: 'S&P 500 (sample)', cols: 7, rows: 3, accent: COLORS.markets, props: { yLabel: 'Index', series: series(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], [5180, 5210, 5195, 5240, 5275]) } } },
  { id: 'mkt-watchlist', category: 'Markets', label: 'Stock Watchlist', prompt: 'My stock watchlist', kw: ['watchlist', 'stocks watchlist', 'my stocks'],
    spec: { type: 'table', title: 'Watchlist (sample)', cols: 6, rows: 3, accent: COLORS.markets, props: { columns: [{ key: 'sym', label: 'Symbol' }, { key: 'price', label: 'Price', align: 'right' }, { key: 'chg', label: 'Chg %', align: 'right' }], rows: [{ sym: 'AAPL', price: 213.4, chg: 1.2 }, { sym: 'MSFT', price: 441.6, chg: -0.4 }, { sym: 'NVDA', price: 128.3, chg: 2.8 }, { sym: 'TSLA', price: 248.1, chg: -1.5 }] } } },
  { id: 'mkt-alloc', category: 'Markets', label: 'Portfolio Allocation', prompt: 'My investment portfolio allocation', kw: ['investment portfolio', 'asset allocation', 'portfolio mix'],
    spec: { type: 'pie_chart', title: 'Asset Allocation', cols: 5, rows: 3, accent: COLORS.markets, props: { donut: true, slices: series(['Stocks', 'Bonds', 'Cash', 'Real Estate', 'Crypto'], [55, 20, 10, 10, 5]) } } },
  { id: 'mkt-sector', category: 'Markets', label: 'Sector Performance', prompt: 'Sector performance today', kw: ['sector performance', 'sectors', 'market sectors'],
    spec: { type: 'bar_chart', title: 'Sector Performance (sample)', cols: 7, rows: 3, accent: COLORS.markets, props: { horizontal: true, series: series(['Tech', 'Energy', 'Health', 'Finance', 'Utilities'], [2.4, -1.1, 0.8, 1.3, -0.3]) } } },
  { id: 'mkt-gdp', category: 'Markets', label: 'US GDP Growth', prompt: 'US GDP over time', kw: ['gdp', 'us gdp', 'gross domestic product', 'economy growth'],
    spec: { type: 'line_chart', title: 'US GDP', cols: 8, rows: 3, accent: COLORS.markets, dataBindings: [b('gdp', 'world_bank', { country: 'US', indicator: 'NY.GDP.MKTP.CD' })], adapter: 'worldbank_series', source: 'gdp', props: { yLabel: 'GDP (USD)' } } },
  { id: 'mkt-movers', category: 'Markets', label: 'Market Movers', prompt: 'Top market movers today', kw: ['market movers', 'top gainers', 'movers'],
    spec: { type: 'bar_chart', title: 'Top Movers (sample)', cols: 6, rows: 3, accent: COLORS.markets, props: { series: series(['NVDA', 'AMD', 'META', 'AMZN', 'GOOG'], [4.2, 3.1, 2.0, 1.4, 0.9]) } } },
  { id: 'mkt-dividend', category: 'Markets', label: 'Dividend Tracker', prompt: 'Track my dividends', kw: ['dividend', 'dividends', 'dividend income'],
    spec: { type: 'table', title: 'Dividends (sample)', cols: 5, rows: 3, accent: COLORS.markets, props: { columns: [{ key: 'sym', label: 'Stock' }, { key: 'yield', label: 'Yield %', align: 'right' }, { key: 'pay', label: 'Annual $', align: 'right' }], rows: [{ sym: 'KO', yield: 3.1, pay: 184 }, { sym: 'JNJ', yield: 3.0, pay: 240 }, { sym: 'PG', yield: 2.4, pay: 160 }] } } },
  { id: 'mkt-pe', category: 'Markets', label: 'P/E Ratios', prompt: 'Compare P/E ratios', kw: ['p/e ratio', 'pe ratio', 'valuation'],
    spec: { type: 'bar_chart', title: 'P/E Ratios (sample)', cols: 6, rows: 3, accent: COLORS.markets, props: { series: series(['AAPL', 'MSFT', 'NVDA', 'KO', 'JPM'], [33, 36, 65, 25, 12]) } } },
  { id: 'mkt-indexes', category: 'Markets', label: 'Index Overview', prompt: 'Major indexes overview', kw: ['indexes', 'market overview', 'major indices'],
    spec: { type: 'kpi_group', title: 'Indexes (sample)', cols: 6, rows: 2, accent: COLORS.markets, props: { stats: [{ label: 'S&P 500', value: 5275, delta: 0.6, deltaUnit: '%' }, { label: 'Nasdaq', value: 16800, delta: 1.1, deltaUnit: '%' }, { label: 'Dow', value: 39100, delta: -0.2, deltaUnit: '%' }, { label: 'VIX', value: 13.2, delta: -3.0, deltaUnit: '%' }] } } },
  { id: 'mkt-earnings', category: 'Markets', label: 'Earnings Calendar', prompt: 'Upcoming earnings calendar', kw: ['earnings calendar', 'earnings', 'earnings dates'],
    spec: { type: 'timeline', title: 'Earnings (sample)', cols: 5, rows: 3, accent: COLORS.markets, props: { events: [{ time: 'Mon', title: 'AAPL', sub: 'After close' }, { time: 'Tue', title: 'MSFT', sub: 'After close' }, { time: 'Thu', title: 'AMZN', sub: 'After close' }] } } },

  /* ───────────────────────── 4. WEATHER ───────────────────────── */
  { id: 'wx-london', category: 'Weather', label: 'London Weather', prompt: 'Weather in London', kw: ['weather london', 'london weather'],
    spec: { type: 'weather', title: 'London', cols: 6, rows: 3, accent: COLORS.weather, dataBindings: [b('wx', 'weather', { latitude: 51.5072, longitude: -0.1276 })], adapter: 'weather', source: 'wx', props: { place: 'London' } } },
  { id: 'wx-nyc', category: 'Weather', label: 'New York Weather', prompt: 'Weather in New York', kw: ['weather new york', 'new york weather', 'nyc weather'],
    spec: { type: 'weather', title: 'New York', cols: 6, rows: 3, accent: COLORS.weather, dataBindings: [b('wx', 'weather', { latitude: 40.7128, longitude: -74.006 })], adapter: 'weather', source: 'wx', props: { place: 'New York' } } },
  { id: 'wx-tokyo', category: 'Weather', label: 'Tokyo Weather', prompt: 'Weather in Tokyo', kw: ['weather tokyo', 'tokyo weather'],
    spec: { type: 'weather', title: 'Tokyo', cols: 6, rows: 3, accent: COLORS.weather, dataBindings: [b('wx', 'weather', { latitude: 35.6762, longitude: 139.6503 })], adapter: 'weather', source: 'wx', props: { place: 'Tokyo' } } },
  { id: 'wx-paris', category: 'Weather', label: 'Paris Weather', prompt: 'Weather in Paris', kw: ['weather paris', 'paris weather'],
    spec: { type: 'weather', title: 'Paris', cols: 6, rows: 3, accent: COLORS.weather, dataBindings: [b('wx', 'weather', { latitude: 48.8566, longitude: 2.3522 })], adapter: 'weather', source: 'wx', props: { place: 'Paris' } } },
  { id: 'wx-aqi', category: 'Weather', label: 'Air Quality', prompt: 'Air quality index', kw: ['air quality', 'aqi', 'pollution'],
    spec: { type: 'gauge', title: 'Air Quality (sample)', cols: 3, rows: 3, accent: COLORS.weather, props: { value: 42, max: 200, label: 'US AQI · Good' } } },
  { id: 'wx-forecast', category: 'Weather', label: '7-Day Forecast', prompt: '7 day forecast', kw: ['7 day forecast', 'week forecast', 'forecast'],
    spec: { type: 'weather', title: 'Forecast', cols: 8, rows: 3, accent: COLORS.weather, dataBindings: [b('wx', 'weather', { latitude: 51.5072, longitude: -0.1276 })], adapter: 'weather', source: 'wx', props: { place: 'London' } } },
  { id: 'wx-rain', category: 'Weather', label: 'Rain Probability', prompt: 'Chance of rain this week', kw: ['rain probability', 'chance of rain', 'rain'],
    spec: { type: 'bar_chart', title: 'Rain Probability (sample)', cols: 6, rows: 2, accent: COLORS.weather, props: { series: series(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [10, 40, 80, 30, 5, 0, 20]) } } },
  { id: 'wx-temptrend', category: 'Weather', label: 'Temperature Trend', prompt: 'Temperature trend this week', kw: ['temperature trend', 'temp trend'],
    spec: { type: 'line_chart', title: 'Temperature (sample)', cols: 6, rows: 2, accent: COLORS.weather, props: { yLabel: '°C', series: series(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [18, 19, 17, 21, 23, 22, 20]) } } },
  { id: 'wx-sun', category: 'Weather', label: 'Sunrise & Sunset', prompt: 'Sunrise and sunset times', kw: ['sunrise', 'sunset', 'daylight'],
    spec: { type: 'kpi_group', title: 'Sun (sample)', cols: 4, rows: 2, accent: COLORS.weather, props: { stats: [{ label: 'Sunrise', value: 5.42 }, { label: 'Sunset', value: 20.55 }] } } },
  { id: 'wx-weekend', category: 'Weather', label: 'Weekend Weather', prompt: 'Weather this weekend', kw: ['weekend weather', 'weather weekend'],
    spec: { type: 'weather', title: 'Weekend', cols: 6, rows: 3, accent: COLORS.weather, dataBindings: [b('wx', 'weather', { latitude: 51.5072, longitude: -0.1276 })], adapter: 'weather', source: 'wx', props: { place: 'London' } } },

  /* ───────────────────────── 5. NEWS & MEDIA ───────────────────────── */
  { id: 'news-tech', category: 'News', label: 'Tech News', prompt: 'Top tech news today', kw: ['tech news', 'technology news', 'top news'],
    spec: { type: 'news', title: 'Tech News', cols: 5, rows: 4, accent: COLORS.news, dataBindings: [b('hn', 'hn_news', { query: '', hits: 15 })], adapter: 'news_list', source: 'hn', props: { limit: 12 } } },
  { id: 'news-ai', category: 'News', label: 'AI News', prompt: 'Latest AI news', kw: ['ai news', 'artificial intelligence news', 'ml news'],
    spec: { type: 'news', title: 'AI News', cols: 5, rows: 4, accent: COLORS.news, dataBindings: [b('hn', 'hn_news', { query: 'AI', hits: 15 })], adapter: 'news_list', source: 'hn', props: { limit: 12 } } },
  { id: 'news-world', category: 'News', label: 'World News', prompt: 'World news headlines', kw: ['world news', 'global news', 'headlines'],
    spec: { type: 'news', title: 'World (HN)', cols: 5, rows: 4, accent: COLORS.news, dataBindings: [b('hn', 'hn_news', { query: 'world', hits: 15 })], adapter: 'news_list', source: 'hn', props: { limit: 12 } } },
  { id: 'news-startup', category: 'News', label: 'Startup News', prompt: 'Startup and funding news', kw: ['startup news', 'funding news', 'startups'],
    spec: { type: 'news', title: 'Startup News', cols: 5, rows: 4, accent: COLORS.news, dataBindings: [b('hn', 'hn_news', { query: 'startup', hits: 15 })], adapter: 'news_list', source: 'hn', props: { limit: 12 } } },
  { id: 'news-crypto', category: 'News', label: 'Crypto News', prompt: 'Crypto news today', kw: ['crypto news', 'bitcoin news', 'blockchain news'],
    spec: { type: 'news', title: 'Crypto News', cols: 5, rows: 4, accent: COLORS.news, dataBindings: [b('hn', 'hn_news', { query: 'crypto', hits: 15 })], adapter: 'news_list', source: 'hn', props: { limit: 12 } } },
  { id: 'news-science', category: 'News', label: 'Science News', prompt: 'Science news', kw: ['science news', 'research news'],
    spec: { type: 'news', title: 'Science News', cols: 5, rows: 4, accent: COLORS.news, dataBindings: [b('hn', 'hn_news', { query: 'science', hits: 15 })], adapter: 'news_list', source: 'hn', props: { limit: 12 } } },
  { id: 'news-programming', category: 'News', label: 'Programming News', prompt: 'Programming and dev news', kw: ['programming news', 'developer news', 'coding news'],
    spec: { type: 'news', title: 'Dev News', cols: 5, rows: 4, accent: COLORS.news, dataBindings: [b('hn', 'hn_news', { query: 'programming', hits: 15 })], adapter: 'news_list', source: 'hn', props: { limit: 12 } } },
  { id: 'news-digest', category: 'News', label: 'Morning Digest', prompt: 'My morning news digest', kw: ['morning digest', 'news digest', 'daily briefing'],
    spec: { type: 'news', title: 'Morning Digest', cols: 6, rows: 4, accent: COLORS.news, dataBindings: [b('hn', 'hn_news', { query: '', hits: 20 })], adapter: 'news_list', source: 'hn', props: { limit: 15 } } },
  { id: 'news-trending', category: 'News', label: 'Trending Topics', prompt: 'Trending topics right now', kw: ['trending topics', 'trending', 'whats trending'],
    spec: { type: 'bar_chart', title: 'Trending (sample)', cols: 6, rows: 3, accent: COLORS.news, props: { horizontal: true, series: series(['AI', 'Elections', 'Climate', 'Space', 'Markets'], [92, 78, 64, 51, 47]) } } },
  { id: 'news-watch', category: 'News', label: 'Topics to Watch', prompt: 'News topics I follow', kw: ['topics i follow', 'news watchlist', 'follow topics'],
    spec: { type: 'list', title: 'Topics to Watch', cols: 4, rows: 3, accent: COLORS.news, props: { items: ['Federal Reserve decisions', 'AI regulation', 'EV market', 'Housing prices', 'Tech layoffs'] } } },

  /* ───────────────────────── 6. PERSONAL / PRODUCTIVITY ───────────────────────── */
  { id: 'per-todo', category: 'Personal', label: 'Daily To-Do', prompt: 'My to-do list for today', kw: ['to-do', 'todo', 'task list', 'to do'],
    spec: { type: 'list', title: 'Today', cols: 4, rows: 3, accent: COLORS.personal, props: { checklist: true, items: ['Reply to emails', 'Team standup 10am', 'Finish report draft', 'Gym session', 'Call mom'] } } },
  { id: 'per-habit', category: 'Personal', label: 'Habit Tracker', prompt: 'My habit tracker', kw: ['habit tracker', 'habits', 'streak'],
    spec: { type: 'heatmap', title: 'Habits (4 weeks)', cols: 6, rows: 3, accent: COLORS.personal, props: { rows: ['Read', 'Exercise', 'Meditate'], cols: ['W1', 'W2', 'W3', 'W4'], values: [[5, 6, 4, 7], [3, 4, 5, 6], [7, 6, 7, 5]] } } },
  { id: 'per-schedule', category: 'Personal', label: 'Today\'s Schedule', prompt: 'My schedule today', kw: ['schedule', 'my day', 'agenda today'],
    spec: { type: 'timeline', title: 'Today', cols: 4, rows: 4, accent: COLORS.personal, props: { events: [{ time: '09:00', title: 'Standup' }, { time: '11:00', title: 'Design review' }, { time: '13:00', title: 'Lunch w/ Sam' }, { time: '15:30', title: 'Focus block' }, { time: '18:00', title: 'Gym' }] } } },
  { id: 'per-pomo', category: 'Personal', label: 'Focus Goals', prompt: 'Track my focus time', kw: ['focus time', 'pomodoro', 'deep work'],
    spec: { type: 'progress', title: 'Focus Goals', cols: 5, rows: 2, accent: COLORS.personal, props: { goals: [{ label: 'Deep work today', value: 3, max: 5, unit: 'h' }, { label: 'Pomodoros', value: 6, max: 8 }] } } },
  { id: 'per-reading', category: 'Personal', label: 'Reading List', prompt: 'My reading list', kw: ['reading list', 'books to read', 'reading'],
    spec: { type: 'list', title: 'Reading List', cols: 4, rows: 3, accent: COLORS.personal, props: { items: [{ text: 'Thinking, Fast and Slow', sub: 'Kahneman' }, { text: 'Deep Work', sub: 'Newport' }, { text: 'Dune', sub: 'Herbert' }] } } },
  { id: 'per-note', category: 'Personal', label: 'Quick Note', prompt: 'A quick note pad', kw: ['note', 'notepad', 'sticky note', 'scratchpad'],
    spec: { type: 'note', title: 'Quick Note', cols: 4, rows: 3, accent: COLORS.personal, props: { editable: true, text: 'Type your note here…' } } },
  { id: 'per-bday', category: 'Personal', label: 'Birthday Countdown', prompt: 'Countdown to my birthday', kw: ['birthday countdown', 'countdown to birthday'],
    spec: { type: 'countdown', title: 'Birthday', cols: 5, rows: 2, accent: COLORS.personal, props: { to: futureISO(90), label: 'Until my birthday 🎂' } } },
  { id: 'per-goals', category: 'Personal', label: 'Yearly Goals', prompt: 'My goals progress this year', kw: ['yearly goals', 'goals progress', 'resolutions'],
    spec: { type: 'progress', title: '2026 Goals', cols: 5, rows: 2, accent: COLORS.personal, props: { goals: [{ label: 'Read 24 books', value: 11, max: 24 }, { label: 'Run 500km', value: 230, max: 500, unit: 'km' }, { label: 'Save $10k', value: 6500, max: 10000, unit: '$' }] } } },
  { id: 'per-mood', category: 'Personal', label: 'Mood Tracker', prompt: 'My mood this week', kw: ['mood tracker', 'mood', 'how i feel'],
    spec: { type: 'bar_chart', title: 'Mood (1-5)', cols: 6, rows: 2, accent: COLORS.personal, props: { series: series(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [3, 4, 2, 4, 5, 5, 4]) } } },
  { id: 'per-shopping', category: 'Personal', label: 'Shopping List', prompt: 'My shopping list', kw: ['shopping list', 'groceries', 'grocery list'],
    spec: { type: 'list', title: 'Shopping', cols: 4, rows: 3, accent: COLORS.personal, props: { checklist: true, items: ['Milk', 'Eggs', 'Bread', 'Coffee', 'Bananas', 'Chicken'] } } },

  /* ───────────────────────── 7. HEALTH & FITNESS ───────────────────────── */
  { id: 'hl-workout', category: 'Health', label: 'Workout Checklist', prompt: 'My daily workout checklist', kw: ['workout checklist', 'workout', 'exercise list'],
    spec: { type: 'list', title: 'Workout', cols: 4, rows: 3, accent: COLORS.health, props: { checklist: true, items: ['Warm-up 5min', 'Squats 3×10', 'Push-ups 3×15', 'Plank 3×60s', 'Stretch'] } } },
  { id: 'hl-steps', category: 'Health', label: 'Steps Trend', prompt: 'My steps this week', kw: ['steps', 'step count', 'steps trend'],
    spec: { type: 'area_chart', title: 'Steps', cols: 6, rows: 2, accent: COLORS.health, props: { yLabel: 'Steps', series: series(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [8200, 10400, 6500, 12000, 9800, 14200, 5300]) } } },
  { id: 'hl-water', category: 'Health', label: 'Water Intake', prompt: 'Track my water intake', kw: ['water intake', 'hydration', 'drink water'],
    spec: { type: 'progress', title: 'Hydration', cols: 4, rows: 2, accent: COLORS.health, props: { goals: [{ label: 'Water today', value: 5, max: 8, unit: ' cups' }] } } },
  { id: 'hl-calories', category: 'Health', label: 'Calorie Breakdown', prompt: 'My calorie breakdown', kw: ['calories', 'calorie breakdown', 'macros'],
    spec: { type: 'pie_chart', title: 'Macros', cols: 5, rows: 3, accent: COLORS.health, props: { donut: true, slices: series(['Protein', 'Carbs', 'Fat'], [30, 45, 25]) } } },
  { id: 'hl-weight', category: 'Health', label: 'Weight Trend', prompt: 'My weight over time', kw: ['weight trend', 'weight', 'body weight'],
    spec: { type: 'line_chart', title: 'Weight', cols: 6, rows: 2, accent: COLORS.health, props: { yLabel: 'kg', series: series(['W1', 'W2', 'W3', 'W4', 'W5', 'W6'], [82, 81.4, 81, 80.2, 79.8, 79.1]) } } },
  { id: 'hl-sleep', category: 'Health', label: 'Sleep Hours', prompt: 'My sleep this week', kw: ['sleep', 'sleep hours', 'sleep tracker'],
    spec: { type: 'bar_chart', title: 'Sleep (h)', cols: 6, rows: 2, accent: COLORS.health, props: { series: series(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [6.5, 7, 5.5, 8, 7.5, 9, 8]) } } },
  { id: 'hl-hr', category: 'Health', label: 'Heart Rate Zones', prompt: 'My heart rate zones', kw: ['heart rate', 'hr zones', 'cardio zones'],
    spec: { type: 'bar_chart', title: 'HR Zones (min)', cols: 6, rows: 2, accent: COLORS.health, props: { series: series(['Rest', 'Fat burn', 'Cardio', 'Peak'], [40, 25, 18, 7]) } } },
  { id: 'hl-bmi', category: 'Health', label: 'BMI Gauge', prompt: 'My BMI', kw: ['bmi', 'body mass index'],
    spec: { type: 'gauge', title: 'BMI', cols: 3, rows: 3, accent: COLORS.health, props: { value: 23, max: 40, label: 'Healthy' } } },
  { id: 'hl-activity', category: 'Health', label: 'Activity Heatmap', prompt: 'My weekly activity heatmap', kw: ['activity heatmap', 'activity', 'workout heatmap'],
    spec: { type: 'heatmap', title: 'Activity (min/day)', cols: 6, rows: 3, accent: COLORS.health, props: { rows: ['Run', 'Lift', 'Yoga'], cols: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], values: [[30, 0, 40, 0, 35, 0, 50], [0, 45, 0, 45, 0, 60, 0], [15, 0, 0, 20, 0, 0, 30]] } } },
  { id: 'hl-goals', category: 'Health', label: 'Fitness Goals', prompt: 'My fitness goals', kw: ['fitness goals', 'fitness', 'health goals'],
    spec: { type: 'progress', title: 'Fitness Goals', cols: 5, rows: 2, accent: COLORS.health, props: { goals: [{ label: 'Weekly workouts', value: 3, max: 5 }, { label: 'Active minutes', value: 180, max: 300, unit: 'm' }] } } },

  /* ───────────────────────── 8. WORK / BUSINESS ───────────────────────── */
  { id: 'wk-kpis', category: 'Work', label: 'KPI Overview', prompt: 'Business KPI overview', kw: ['kpi overview', 'business kpis', 'metrics overview', 'kpis'],
    spec: { type: 'kpi_group', title: 'KPIs (sample)', cols: 6, rows: 2, accent: COLORS.work, props: { stats: [{ label: 'MRR', value: 48200, unit: '$', delta: 8, deltaUnit: '%' }, { label: 'Customers', value: 1240, delta: 3.2, deltaUnit: '%' }, { label: 'Churn', value: 2.1, unit: '%', delta: -0.4, deltaUnit: 'pp' }, { label: 'NPS', value: 54, delta: 2 }] } } },
  { id: 'wk-revenue', category: 'Work', label: 'Revenue Trend', prompt: 'Revenue over the last months', kw: ['revenue', 'revenue trend', 'sales trend', 'mrr'],
    spec: { type: 'area_chart', title: 'Revenue (sample)', cols: 7, rows: 3, accent: COLORS.work, props: { yLabel: 'Revenue', series: series(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], [32000, 35000, 38000, 41000, 44000, 48200]) } } },
  { id: 'wk-funnel', category: 'Work', label: 'Sales Funnel', prompt: 'My sales funnel', kw: ['sales funnel', 'funnel', 'conversion funnel'],
    spec: { type: 'bar_chart', title: 'Funnel (sample)', cols: 6, rows: 3, accent: COLORS.work, props: { horizontal: true, series: series(['Visitors', 'Leads', 'Trials', 'Paid'], [12000, 3200, 900, 280]) } } },
  { id: 'wk-timeline', category: 'Work', label: 'Project Timeline', prompt: 'Project milestones timeline', kw: ['project timeline', 'milestones', 'roadmap'],
    spec: { type: 'timeline', title: 'Roadmap (sample)', cols: 5, rows: 3, accent: COLORS.work, props: { events: [{ time: 'Q1', title: 'Beta launch', sub: 'Done' }, { time: 'Q2', title: 'GA release' }, { time: 'Q3', title: 'Enterprise tier' }, { time: 'Q4', title: 'Mobile app' }] } } },
  { id: 'wk-tasks', category: 'Work', label: 'Task Board', prompt: 'My work tasks', kw: ['work tasks', 'task board', 'sprint tasks'],
    spec: { type: 'list', title: 'Sprint Tasks', cols: 4, rows: 3, accent: COLORS.work, props: { checklist: true, items: ['Spec review', 'Fix login bug', 'Deploy v2.1', 'Write changelog', 'QA pass'] } } },
  { id: 'wk-capacity', category: 'Work', label: 'Team Capacity', prompt: 'Team capacity this sprint', kw: ['team capacity', 'capacity', 'workload'],
    spec: { type: 'progress', title: 'Team Capacity', cols: 5, rows: 2, accent: COLORS.work, props: { goals: [{ label: 'Alice', value: 32, max: 40, unit: 'h' }, { label: 'Bob', value: 38, max: 40, unit: 'h' }, { label: 'Carol', value: 20, max: 40, unit: 'h' }] } } },
  { id: 'wk-churn', category: 'Work', label: 'Churn Rate', prompt: 'Our churn rate', kw: ['churn rate', 'churn'],
    spec: { type: 'kpi', title: 'Churn', cols: 3, rows: 2, accent: COLORS.work, props: { value: 2.1, unit: '%', delta: -0.4, deltaUnit: 'pp', label: 'Monthly churn' } } },
  { id: 'wk-expense', category: 'Work', label: 'Expense Breakdown', prompt: 'Company expense breakdown', kw: ['company expenses', 'expense breakdown', 'cost breakdown'],
    spec: { type: 'pie_chart', title: 'Expenses (sample)', cols: 5, rows: 3, accent: COLORS.work, props: { donut: true, slices: series(['Salaries', 'Cloud', 'Marketing', 'Office', 'Other'], [60, 15, 12, 8, 5]) } } },
  { id: 'wk-okr', category: 'Work', label: 'OKR Progress', prompt: 'Our OKR progress', kw: ['okr', 'okrs', 'objectives'],
    spec: { type: 'progress', title: 'OKRs', cols: 5, rows: 2, accent: COLORS.work, props: { goals: [{ label: 'Activation +20%', value: 14, max: 20, unit: '%' }, { label: 'Ship 5 features', value: 3, max: 5 }] } } },
  { id: 'wk-agenda', category: 'Work', label: 'Meeting Agenda', prompt: 'Today\'s meeting agenda', kw: ['meeting agenda', 'agenda', 'meetings today'],
    spec: { type: 'timeline', title: 'Meetings', cols: 4, rows: 3, accent: COLORS.work, props: { events: [{ time: '10:00', title: 'Standup', sub: '15 min' }, { time: '14:00', title: '1:1 with manager', sub: '30 min' }, { time: '16:00', title: 'Sprint planning', sub: '1 hr' }] } } },

  /* ───────────────────────── 9. TRAVEL ───────────────────────── */
  { id: 'trv-countdown', category: 'Travel', label: 'Trip Countdown', prompt: 'Countdown to my trip', kw: ['trip countdown', 'countdown to trip', 'vacation countdown'],
    spec: { type: 'countdown', title: 'Next Trip', cols: 5, rows: 2, accent: COLORS.travel, props: { to: futureISO(30), label: 'Until departure ✈️' } } },
  { id: 'trv-packing', category: 'Travel', label: 'Packing List', prompt: 'My packing list', kw: ['packing list', 'packing', 'what to pack'],
    spec: { type: 'list', title: 'Packing', cols: 4, rows: 3, accent: COLORS.travel, props: { checklist: true, items: ['Passport', 'Chargers', 'Toiletries', 'Adapter', 'Medications', 'Camera'] } } },
  { id: 'trv-weather', category: 'Travel', label: 'Destination Weather', prompt: 'Weather at my destination', kw: ['destination weather', 'weather at destination'],
    spec: { type: 'weather', title: 'Destination', cols: 6, rows: 3, accent: COLORS.travel, dataBindings: [b('wx', 'weather', { latitude: 41.9028, longitude: 12.4964 })], adapter: 'weather', source: 'wx', props: { place: 'Rome' } } },
  { id: 'trv-itinerary', category: 'Travel', label: 'Itinerary', prompt: 'My travel itinerary', kw: ['itinerary', 'travel plan', 'trip plan'],
    spec: { type: 'timeline', title: 'Itinerary', cols: 5, rows: 3, accent: COLORS.travel, props: { events: [{ time: 'Day 1', title: 'Arrive · Hotel check-in' }, { time: 'Day 2', title: 'City tour' }, { time: 'Day 3', title: 'Museums' }, { time: 'Day 4', title: 'Day trip' }, { time: 'Day 5', title: 'Departure' }] } } },
  { id: 'trv-budget', category: 'Travel', label: 'Trip Budget', prompt: 'My trip budget breakdown', kw: ['trip budget', 'travel budget', 'vacation budget'],
    spec: { type: 'pie_chart', title: 'Trip Budget', cols: 5, rows: 3, accent: COLORS.travel, props: { donut: true, slices: series(['Flights', 'Hotel', 'Food', 'Activities', 'Other'], [40, 30, 15, 10, 5]) } } },
  { id: 'trv-fx', category: 'Travel', label: 'Currency Cheat Sheet', prompt: 'Currency rates for my trip', kw: ['currency rates', 'exchange rates', 'fx rates', 'currency cheat'],
    spec: { type: 'table', title: 'USD Exchange Rates', cols: 4, rows: 3, accent: COLORS.travel, dataBindings: [b('fx', 'fx_table', { from: 'USD', to: 'EUR,GBP,JPY,AUD,CAD' })], adapter: 'fx_table', source: 'fx', props: { base: 'USD' } } },
  { id: 'trv-country', category: 'Travel', label: 'Country Facts', prompt: 'Facts about my destination country', kw: ['country facts', 'country info', 'about country'],
    spec: { type: 'kpi_group', title: 'Japan (sample)', cols: 5, rows: 2, accent: COLORS.travel, props: { stats: [{ label: 'Capital pop (M)', value: 14 }, { label: 'Currency JPY/$', value: 156 }, { label: 'Timezone', value: 9, unit: 'UTC' }] } } },
  { id: 'trv-dist', category: 'Travel', label: 'Miles → Km', prompt: 'Convert miles to kilometers', kw: ['miles to km', 'miles to kilometers', 'distance converter'],
    spec: { type: 'converter', title: 'Miles → Km', cols: 4, rows: 2, accent: COLORS.travel, props: { factor: 1.60934, fromUnit: 'mi', toUnit: 'km', base: 10 } } },
  { id: 'trv-tz', category: 'Travel', label: 'Timezone Table', prompt: 'Timezones for my trip', kw: ['timezone', 'time zones', 'world clock'],
    spec: { type: 'table', title: 'Time Zones', cols: 4, rows: 3, accent: COLORS.travel, props: { columns: [{ key: 'city', label: 'City' }, { key: 'tz', label: 'UTC', align: 'right' }], rows: [{ city: 'New York', tz: -5 }, { city: 'London', tz: 0 }, { city: 'Dubai', tz: 4 }, { city: 'Tokyo', tz: 9 }] } } },
  { id: 'trv-bucket', category: 'Travel', label: 'Bucket List', prompt: 'My travel bucket list', kw: ['bucket list', 'places to visit', 'travel bucket'],
    spec: { type: 'list', title: 'Bucket List', cols: 4, rows: 3, accent: COLORS.travel, props: { checklist: true, items: ['Japan 🇯🇵', 'Iceland 🇮🇸', 'Patagonia', 'New Zealand', 'Morocco'] } } },

  /* ───────────────────────── 10. UTILITIES / KNOWLEDGE ───────────────────────── */
  { id: 'ut-mileskm', category: 'Utilities', label: 'Miles ↔ Km', prompt: 'Convert 120 miles to kilometers', kw: ['convert miles', 'miles km', 'km converter'],
    spec: { type: 'converter', title: 'Miles → Km', cols: 4, rows: 2, accent: COLORS.utility, props: { factor: 1.60934, fromUnit: 'mi', toUnit: 'km', base: 120 } } },
  { id: 'ut-fxrates', category: 'Utilities', label: 'Live FX Rates', prompt: 'Live currency exchange rates', kw: ['live fx', 'live currency', 'exchange rate table'],
    spec: { type: 'table', title: 'USD Rates (live)', cols: 4, rows: 3, accent: COLORS.utility, dataBindings: [b('fx', 'fx_table', { from: 'USD', to: 'EUR,GBP,JPY,CHF,CNY' })], adapter: 'fx_table', source: 'fx', props: { base: 'USD' } } },
  { id: 'ut-kglb', category: 'Utilities', label: 'Kg → Lb', prompt: 'Convert kilograms to pounds', kw: ['kg to lb', 'kilograms to pounds', 'weight converter'],
    spec: { type: 'converter', title: 'Kg → Lb', cols: 4, rows: 2, accent: COLORS.utility, props: { factor: 2.20462, fromUnit: 'kg', toUnit: 'lb', base: 10 } } },
  { id: 'ut-population', category: 'Utilities', label: 'World Population', prompt: 'World population over time', kw: ['world population', 'population trend', 'global population'],
    spec: { type: 'line_chart', title: 'World Population', cols: 8, rows: 3, accent: COLORS.utility, dataBindings: [b('pop', 'world_bank', { country: 'WLD', indicator: 'SP.POP.TOTL' })], adapter: 'worldbank_series', source: 'pop', props: { yLabel: 'People' } } },
  { id: 'ut-usgdp', category: 'Utilities', label: 'US GDP', prompt: 'United States GDP history', kw: ['us gdp history', 'america gdp', 'usa gdp'],
    spec: { type: 'area_chart', title: 'US GDP', cols: 8, rows: 3, accent: COLORS.utility, dataBindings: [b('gdp', 'world_bank', { country: 'US', indicator: 'NY.GDP.MKTP.CD' })], adapter: 'worldbank_series', source: 'gdp', props: { yLabel: 'GDP (USD)' } } },
  { id: 'ut-newyear', category: 'Utilities', label: 'New Year Countdown', prompt: 'Countdown to New Year', kw: ['new year countdown', 'countdown new year', 'countdown to 2027'],
    spec: { type: 'countdown', title: 'New Year', cols: 5, rows: 2, accent: COLORS.utility, props: { to: '2027-01-01T00:00:00', label: 'Until 2027 🎉' } } },
  { id: 'ut-scratch', category: 'Utilities', label: 'Scratchpad', prompt: 'A scratchpad for calculations', kw: ['scratchpad', 'calc note', 'notes pad'],
    spec: { type: 'note', title: 'Scratchpad', cols: 4, rows: 3, accent: COLORS.utility, props: { editable: true, text: '' } } },
  { id: 'ut-eurusd', category: 'Utilities', label: 'EUR/USD Trend', prompt: 'EUR to USD trend', kw: ['eur usd', 'euro dollar', 'eurusd trend'],
    spec: { type: 'line_chart', title: 'EUR/USD', cols: 7, rows: 3, accent: COLORS.utility, dataBindings: [b('fx', 'fx_history', { from: 'EUR', to: 'USD', start: '2024-06-01' })], adapter: 'fx_history', source: 'fx', props: { to: 'USD', yLabel: 'EUR/USD' } } },
  { id: 'ut-temp', category: 'Utilities', label: 'Celsius → Fahrenheit', prompt: 'Convert celsius to fahrenheit', kw: ['celsius to fahrenheit', 'c to f', 'temperature converter'],
    spec: { type: 'converter', title: '°C → °F (×1.8, +32 approx)', cols: 4, rows: 2, accent: COLORS.utility, props: { factor: 1.8, fromUnit: '°C', toUnit: '°F-32', base: 20 } } },
  { id: 'ut-explainer', category: 'Utilities', label: 'Concept Note', prompt: 'Explain a concept in a note', kw: ['explain', 'definition', 'concept note'],
    spec: { type: 'note', title: 'Note', cols: 5, rows: 3, accent: COLORS.utility, props: { text: 'Ask the AI to fill this with an explanation, or type your own.' } } },
];

export const TEMPLATE_CATEGORIES = [...new Set(TEMPLATES.map(t => t.category))];

/* Instantiate a template into a live card object (host fills data via bindings). */
export function instantiateTemplate(tpl, id) {
  const s = tpl.spec;
  return {
    id: id || Math.random().toString(36).slice(2, 9),
    prompt: tpl.prompt,
    title: s.title,
    spec: { ...s },
    dataBindings: s.dataBindings || [],
    cols: s.cols || 6,
    rows: s.rows || 2,
    chrome: s.chrome || 'full',
    bleed: !!s.bleed,
    accent: s.accent,
    renderSpec: { color: s.accent, summary: '' },
    data: {},
    live: (s.dataBindings || []).length > 0,
    dataSource: (s.dataBindings || []).length ? 'Live API' : 'Template',
    fromTemplate: tpl.id,
  };
}
