# Agntdash MCP server

Lets any MCP-capable agent (Claude Desktop, openclaw, …) **author and publish a
card** to a running Agntdash dashboard: the agent gathers data, decides the
representation, writes the component, and publishes it. The card is validated
(its JSX must compile) and forwarded to the dashboard inbox; the browser polls the
inbox and renders it.

```
agent → [MCP] publish_card → proxy /inbox/cards → browser polls → card on dashboard
```

## Tools

- **`list_card_providers`** — the card contract + the live data providers available. Call this first.
- **`publish_card`** — validate and publish one card.
- **`publish_dashboard`** — validate and publish a coordinated set of cards.

A card: `{ title, group?, cols?, rows?, chrome?, bleed?, renderSpec?, dataBindings?, data?, renderCode }`.
`renderCode` is a `function CardRenderer({ data, renderSpec })` JSX component (same contract the dashboard uses).

## Run

1. Start the data proxy (it hosts the inbox): `node proxy/server.js` (listens on :8787).
2. In the dashboard, set **Settings → Data Proxy** to the proxy URL (the browser polls its inbox; "Receive pushed cards" is on by default).
3. Start the MCP server from the repo root:

```bash
INBOX_URL=http://localhost:8787 node mcp/server.js
```

## Register in an MCP client

Stdio server. Example Claude Desktop config:

```json
{
  "mcpServers": {
    "agntdash": {
      "command": "node",
      "args": ["/absolute/path/to/dashagent/mcp/server.js"],
      "env": { "INBOX_URL": "http://localhost:8787" }
    }
  }
}
```

Then ask the agent to "publish a Bitcoin price card to my dashboard" — it will call
`list_card_providers`, build a valid card (binding `crypto_price`), and `publish_card`.

## Notes

- Validation reuses the dashboard's own JSX compile check, so broken cards are
  rejected with a fix-it message instead of reaching the dashboard.
- The inbox is in-memory in the proxy (last 200 cards). Swap for a store if you
  need durability across proxy restarts.
