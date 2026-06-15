/*
 * Agntdash MCP server.
 *
 * Lets any MCP-capable agent (Claude Desktop, openclaw, …) author a dashboard
 * card — gather data, decide the representation, write the component — and PUBLISH
 * it to a running Agntdash dashboard. The card is validated here (its JSX must
 * compile), then forwarded to the dashboard's inbox (the data proxy), which the
 * browser polls and renders.
 *
 * Run (from repo root):  INBOX_URL=http://localhost:8787 node mcp/server.js
 * Register in an MCP client as a stdio server pointing at this file.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { PROVIDER_CATALOG } from '../src/dataLayer.js';
import { validateRenderCode } from '../src/transpile.js';

const INBOX_URL = (process.env.INBOX_URL || 'http://localhost:8787').replace(/\/$/, '');

const CONTRACT = `Author a self-contained dashboard card. The card object:
- title (string, required), group (string; e.g. Finance/Personal/Work or a new name)
- cols 1-12, rows 1-8 (size to content; the dashboard also auto-fits height)
- chrome: "full" | "minimal" | "none"; bleed: true for full-edge media (pair with chrome:"none")
- renderSpec: { color: "#hex", summary: "one line" }
- renderCode (required): a JSX component, EXACTLY: function CardRenderer({ data, renderSpec }) { return (<div style={{height:'100%',display:'flex',flexDirection:'column'}}>…</div>); }
  Rules: JSX only (transpiled for you), no imports/libraries, inline styles, build charts with inline SVG, null-check every data access, never throw.
  In scope: React (React.useState/useEffect/useRef), fetch (allowlisted+timeout), useCardState(key,initial) for state that must persist, runAction(id,payload) for confirmed write actions.
- Data: STATIC → put it in \`data\`. LIVE → add dataBindings: [{ key, provider, params, refreshSec }]; the dashboard fetches and passes results as the \`data\` prop. Read data[key]; handle { __error }.

Live data providers:
${PROVIDER_CATALOG}`;

const bindingSchema = z.object({
  key: z.string(),
  provider: z.string().optional(),
  url: z.string().optional(),
  params: z.record(z.any()).optional(),
  path: z.string().optional(),
  refreshSec: z.number().optional(),
});
const cardShape = {
  title: z.string().describe('Concise card title'),
  prompt: z.string().optional().describe('The intent this card answers'),
  group: z.string().optional().describe('Group/section name'),
  cols: z.number().int().min(1).max(12).optional(),
  rows: z.number().int().min(1).max(8).optional(),
  chrome: z.enum(['full', 'minimal', 'none']).optional(),
  bleed: z.boolean().optional(),
  dataBindings: z.array(bindingSchema).optional().describe('Live data bindings; see list_card_providers'),
  data: z.record(z.any()).optional().describe('Static/embedded data passed to the component'),
  renderSpec: z.object({ color: z.string().optional(), summary: z.string().optional() }).optional(),
  renderCode: z.string().describe('function CardRenderer({data,renderSpec}) JSX component'),
};

async function publish(cards) {
  const res = await fetch(`${INBOX_URL}/inbox/cards`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cards }),
  });
  if (!res.ok) throw new Error(`inbox HTTP ${res.status}`);
  return res.json();
}
function checkCard(card, i = 0) {
  if (!card || typeof card.renderCode !== 'string') return `card ${i}: missing renderCode`;
  const v = validateRenderCode(card.renderCode);
  return v.ok ? null : `card ${i} (${card.title || 'untitled'}): ${v.error}`;
}
const ok = (text) => ({ content: [{ type: 'text', text }] });
const err = (text) => ({ content: [{ type: 'text', text }], isError: true });

const server = new McpServer({ name: 'agntdash', version: '1.0.0' });

server.registerTool('list_card_providers',
  { title: 'List card contract & data providers', description: 'Returns the card-authoring contract and the live data providers available, so you can build a valid card.', inputSchema: {} },
  async () => ok(CONTRACT),
);

server.registerTool('publish_card',
  { title: 'Publish a card', description: 'Validate and publish ONE card to the Agntdash dashboard. Call list_card_providers first to learn the contract.', inputSchema: cardShape },
  async (card) => {
    const bad = checkCard(card);
    if (bad) return err(`Not published — ${bad}. Fix renderCode (valid CardRenderer JSX) and retry.`);
    try { const r = await publish([card]); return ok(`Published "${card.title}" to the dashboard (id ${r.ids?.[0]}).`); }
    catch (e) { return err(`Publish failed: ${e.message}. Is the dashboard proxy running at ${INBOX_URL}?`); }
  },
);

server.registerTool('publish_dashboard',
  { title: 'Publish multiple cards', description: 'Validate and publish a coordinated SET of cards at once.', inputSchema: { cards: z.array(z.object(cardShape)).min(1).max(12) } },
  async ({ cards }) => {
    for (let i = 0; i < cards.length; i++) { const bad = checkCard(cards[i], i); if (bad) return err(`Not published — ${bad}.`); }
    try { const r = await publish(cards); return ok(`Published ${r.ids?.length || cards.length} cards to the dashboard.`); }
    catch (e) { return err(`Publish failed: ${e.message}.`); }
  },
);

await server.connect(new StdioServerTransport());
console.error(`Agntdash MCP server ready (inbox: ${INBOX_URL})`);
