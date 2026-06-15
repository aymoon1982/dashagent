# Agntdash data proxy

A tiny, dependency-free Node server that unlocks the data sources a browser can't
reach directly (CORS-blocked or key-required): **stocks, news, images, sports**.

It is **keyless by default** — it works the moment you deploy it:

| Route | Source (default, keyless) | Upgrade with env key |
|---|---|---|
| `/stocks/quote`, `/stocks/history` | Yahoo Finance | `STOCK_API_KEY` (Finnhub) |
| `/news` | Google News RSS | `NEWS_API_KEY` (newsapi.org) |
| `/images` | Openverse | `IMAGE_API_KEY` (Unsplash) |
| `/sports` | TheSportsDB free tier | `SPORTS_API_KEY` |

## Run locally

```bash
node proxy/server.js          # listens on :8787 (Node 18+)
curl localhost:8787/stocks/quote?symbol=AAPL
```

Then point the app at it: in Settings → **Data Proxy**, set the base URL, or set
`VITE_DATA_PROXY_URL=http://localhost:8787` in `.env.local`.

## Deploy

Any host that runs Node works (Render, Railway, Fly.io, a VM). Set:

- `PORT` — listen port (most hosts set this for you)
- `ALLOWED_ORIGIN` — your dashboard's origin for CORS (default `*`; tighten in prod)
- optional API keys above

For Vercel/Cloudflare, each handler in `server.js` is independent and maps cleanly
to a serverless function — split the `ROUTES` map into per-route functions.

## Security notes

- The proxy holds any API keys server-side; the browser never sees them.
- It only exposes the fixed routes above (no open `?url=` forwarder), so it can't be
  used as an open proxy.
- Tighten `ALLOWED_ORIGIN` to your deployed dashboard origin in production.
