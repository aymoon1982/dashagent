# Card Generation Architecture — Rethink

> Goal: a user types one prompt and the dashboard renders the *most suitable*
> representation of the data (chart, table, KPI, financial, analytical, personal,
> work…) — fast, good-looking, and reliable.

This document diagnoses why the current system is slow, ugly in places, and
error-prone, evaluates **three** architectural approaches, and lands on a
**final plan**. It does not touch application code — it is the blueprint.

---

## 1. What we have today (and why it hurts)

The current design is **"agentic codegen"**: the LLM writes a complete React
component as a JSX *string* per card, and the browser transpiles + evaluates it
at runtime.

**Pipeline per prompt** (`src/App.jsx`):

| Stage | Model | Output | Cost |
|------|-------|--------|------|
| 0. Dashboard planner | fast | 1–N card prompts, palette | 1 call |
| 1. Intent analysis | fast | `needs_search?` | 1 call/card |
| 2. Web search | — | Tavily results | conditional |
| 3. Code generation | smart | full JSON **+ a whole React component** (≤8000 tok) | 1 call/card |
| 3b. Auto-repair | smart | regenerated component on compile failure | 0–1 call/card |

**Render path** (`src/transpile.js`, `src/Cards.jsx`):
`@babel/standalone` transpiles the JSX in the browser → `new Function(...)`
evaluates it with globals shadowed to `undefined` → React renders inside an
error boundary with **"Repair with AI"** buttons.

### Root causes mapped to your three complaints

- **Speed.** A single card can take **3–4 sequential LLM calls**, one of which
  emits up to ~8000 tokens of React source. A multi-card dashboard multiplies
  that. Then the browser pays again to Babel-transpile every card. The
  expensive token is the *code*, and we regenerate it from scratch every time.
- **Graphic interface.** There is **no chart library**. The model hand-rolls
  inline `<svg>` for every chart, reinventing axes, scales, ticks, tooltips and
  legends each time. Results are inconsistent and rarely as polished as a
  purpose-built component. Interactivity (hover, zoom, brush) is effectively
  out of reach.
- **Continuous errors.** Free-form generated code fails two ways: it won't
  **compile** (Babel throws) or it throws at **runtime** (null derefs, wrong
  data shape). The elaborate repair loop, error boundary, and "Repair with AI"
  UX exist *because* this happens constantly. Each repair is another slow
  smart-model round-trip.
- **Security (bonus).** `new Function` with shadowed globals is, by the code's
  own comment, "hardening, not a true sandbox." Executing model-authored code
  in the main realm is a standing risk.

### What is actually good and must be kept

- **The data layer** (`src/dataLayer.js`, `proxy/`): a declarative
  **provider registry** (crypto price/history/trending, FX rate/table/history,
  geocode, weather, air quality, …) with allowlisted hosts, caching, refresh
  intervals, and a proxy. Cards declare `dataBindings`; the host fetches. This
  is the right pattern — **reuse it unchanged.**
- The **planner** idea (one prompt → a coherent *set* of cards with a shared
  palette) is good product design. Keep the concept; make it cheaper.
- Provider/action/MCP plumbing, settings, inbox sync — all orthogonal to the
  rendering problem and can stay.

**The problem is isolated to the rendering/codegen layer.** That is what we
redesign.

---

## 2. The core decision

Every approach is a point on one axis: **how much freedom does the LLM have over
the final pixels, and where does that freedom get resolved?**

```
 Rigid / safe / fast                                   Flexible / risky / slow
 ├───────────────┬─────────────────────┬────────────────────────┤
 Predefined      JSON-UI grammar        Constrained codegen      Free codegen
 typed catalog   (server-driven UI)     (sandboxed)              (TODAY)
 (Approach A)    (Approach C)           (Approach B escape)      (status quo)
```

The insight: **for "common personal and work data," the space of *good*
representations is small and well-understood** — line/area/bar/candlestick,
pie/donut, KPI/stat, table, list/checklist, gauge, heatmap, map, image/gallery,
timeline, countdown, converter, markdown. You do not need arbitrary code to
cover 90%+ of real requests; you need a **great fixed set of components** and an
LLM that is good at **choosing and configuring** them.

So the LLM's job shifts from *"author a component"* to *"select a component type
and map data onto its props"* — a far smaller, schema-checkable, fast output.

---

## 3. Three approaches

### Approach A — Predefined typed catalog + LLM as "spec router" *(no codegen)*

A fixed library of high-quality React card components, each built once with a
real chart/UI library. The LLM emits only a small, strictly-validated JSON
**spec** naming a card type and mapping data to that type's props.

```jsonc
// LLM output — ~200–500 tokens, schema-constrained
{
  "type": "line_chart",
  "title": "Bitcoin — 7 day",
  "dataBindings": [{ "key": "btc", "provider": "crypto_history",
                     "params": { "id": "bitcoin", "days": 7 } }],
  "encoding": { "x": "btc.t", "series": [{ "y": "btc.price", "label": "BTC" }] },
  "accent": "#f59e0b", "cols": 8, "rows": 3
}
```

- **Catalog (v1):** `line`, `area`, `bar`, `stacked_bar`, `candlestick`,
  `pie/donut`, `kpi/stat` (with delta + sparkline), `table`, `list/checklist`,
  `gauge`, `heatmap`, `map`, `image/gallery`, `timeline`, `countdown`,
  `converter`, `markdown/text`. ~18 types covers the vast majority.
- **Validation:** one **Zod schema per type**. Invalid spec → cheap, fast
  repair against the schema (or use the provider's JSON-mode / tool-calling so
  it is valid by construction).
- **Render:** `cardType → React component`. No Babel, no `new Function`, no eval.

| | |
|---|---|
| **Speed** | One small call per card (~10× fewer tokens). No in-browser compile. Cards can stream in. |
| **Graphics** | Professional, consistent, interactive charts for free (tooltips/legends/responsive). |
| **Errors** | Near-zero: components are pre-tested; only the *data* varies, and bindings already handle `__error`. |
| **Security** | No code execution at all. |
| **Limitation** | Bounded by the catalog; truly bespoke layouts aren't expressible. |

### Approach B — Hybrid: typed catalog + sandboxed codegen escape hatch

Default to Approach A. Add a `"custom"` type that *still* uses LLM codegen for
the rare request nothing in the catalog fits — but executed **properly
sandboxed** (cross-origin iframe or Web Worker realm, or rendered server-side),
not in the main page realm. The router LLM decides: *"map to a known type, else
go custom."*

| | |
|---|---|
| **Speed** | Fast on the 90% common path; slow only on the rare custom path. |
| **Graphics** | Catalog quality for common cards; arbitrary for the long tail. |
| **Errors** | Common path near-zero; custom path retains today's failure modes (contained by the sandbox + boundary). |
| **Security** | Real sandbox for the only code that runs. |
| **Limitation** | Two rendering paths to build and maintain; codegen complexity never fully goes away. |

### Approach C — JSON-UI grammar (server-driven UI) over a component library

Define a **whitelisted JSON UI tree** the host interprets — `Stack`, `Grid`,
`Text`, `Stat`, `Chart{type,series}`, `Table`, `Badge`, `Progress`, `Image`,
`Icon`, … — each node mapping to a real **shadcn/ui** + **Recharts/Tremor**
component. The LLM emits a *tree of data*, not code; the host walks it.

```jsonc
{ "node": "Grid", "cols": 2, "children": [
  { "node": "Stat", "label": "BTC", "value": "{btc.price}", "delta": "{btc.chg24h}" },
  { "node": "Chart", "type": "area", "x": "btc.t", "series": [{ "y": "btc.price" }] }
]}
```

| | |
|---|---|
| **Speed** | Fast; small structured output, no compile, streamable. |
| **Graphics** | Library-backed and consistent; composable layouts beyond fixed cards. |
| **Errors** | Low — bounded grammar, validated tree; no eval. |
| **Security** | No code execution. |
| **Limitation** | The grammar itself becomes an API to design, validate, and version; more upfront work than A, and easy to let it sprawl toward "a programming language in JSON." |

---

## 4. Library choice (the "shadcn or others?" question)

Recommended stack — **don't make the LLM draw SVGs:**

- **Charts:** **Recharts** (declarative, React-native, great defaults) as the
  base, or **Tremor** (dashboard components — KPI cards, charts — built on
  Recharts) to get financial/analytics cards almost for free. For heavy
  financial needs (candlestick, large series), **ECharts** via
  `echarts-for-react`. *Recommendation: Recharts + a thin Tremor-style KPI set.*
- **Chrome / layout / controls:** **shadcn/ui** (`Card`, `Table`, `Tabs`,
  `Badge`, `Progress`, …) — copy-in components, themeable, no runtime lock-in.
  This is the right "predefined library" you were reaching for.
- **Maps:** MapLibre GL (keyless) for the `map` type.

So the answer to *"predefined cards vs custom vs LLM-with-a-library"* is
**all three, layered**: predefined typed cards *are* the library; the LLM
*configures* them; codegen survives only as a sandboxed last resort.

---

## 5. Final plan — **A-led, with C's composition and B's escape hatch**

Lead with **Approach A** (typed catalog) as the spine, borrow **Approach C's**
small layout grammar so a card can compose a couple of primitives (e.g. KPI +
sparkline), and keep **Approach B's** sandboxed codegen as a rarely-hit escape
hatch behind a feature flag. Retire in-browser Babel + `new Function` from the
default path entirely.

### 5.1 Target rendering pipeline

```
prompt
  └─ Router call (ONE fast, JSON-mode/tool-calling request)
       ├─ multi-card? → list of {type, title, intent, size, group}
       └─ per card → validated SPEC {type, title, dataBindings, encoding, layout?, accent, size}
  └─ Host resolves dataBindings via existing provider registry (unchanged)
  └─ Host renders cardType → typed React component (Recharts/shadcn)   ← no eval, no Babel
```

- **Collapse 3–4 calls into ~1.** Routing + type selection + data-mapping fold
  into a single structured call. Intent/search becomes a field the router sets,
  not a separate round-trip. Repair is cheap and schema-scoped (often
  unnecessary with JSON-mode/tool-calling).
- **A fast model suffices** because the output is small and constrained — reserve
  the smart model only for the optional `custom` escape hatch.
- **Stream cards in** as their specs arrive; the grid fills progressively
  instead of blocking on the slowest card.

### 5.2 The instant tier — "predefined cards for the most common uses"

Add a **template gallery** keyed by recognized intent (BTC/ETH chart, weather
for a city, FX pair, portfolio allocation, countdown, converter, news list, …).
A lightweight matcher (embeddings or keyword + the router's own classification)
maps a prompt straight to a parameterized template and renders it with **zero
LLM calls** — instant. The LLM path is the fallback for everything unmatched.
This directly delivers the "fast for common things" goal.

### 5.3 Caching & reuse

- Cache specs by normalized prompt → identical/similar requests skip the LLM.
- Specs are tiny JSON, so they are cheap to persist, diff, and **edit
  incrementally** ("make it bigger", "add ETH") by patching fields rather than
  regenerating a component.

### 5.4 Reliability

- Per-type Zod schemas reject malformed specs before render.
- Components are written defensively once (null/`__error`-safe) and tested, so
  the runtime error class largely disappears. The error boundary stays only as a
  backstop for the optional custom tier.

### 5.5 What changes vs. what stays

| Layer | Action |
|------|--------|
| Provider registry / proxy / bindings | **Keep as-is** |
| Planner (1 prompt → set of cards) | **Keep concept**, fold into the single router call, cheaper model |
| `transpile.js` (Babel + `new Function`) | **Remove from default path**; survives only inside the sandboxed `custom` tier (B) |
| `Cards.jsx` LLM codegen renderer | **Replace** with `type → component` registry |
| Chart rendering | **Replace** hand-drawn SVG with Recharts/shadcn components |
| System prompt | **Replace** "write a React component" with "choose a type + map fields"; expose the catalog + per-type schemas |
| Error/repair UX | **Shrink** to schema-validation; deep repair only in custom tier |

### 5.6 Suggested build order

1. Stand up the **typed component catalog** (charts via Recharts, chrome via
   shadcn) and the **card-type registry** — pure UI, no LLM, demoable with
   hand-written specs.
2. Define **per-type Zod schemas** + the single **router prompt** (JSON-mode /
   tool-calling). Wire prompt → spec → existing bindings → render.
3. Add the **instant template gallery** for the top ~10 common prompts (zero-LLM
   path) and **spec caching**.
4. Add **streaming** + incremental **spec-patch editing**.
5. *(Optional, later)* Re-introduce codegen as a **sandboxed `custom` tier**
   (iframe/worker) behind a flag, for the genuine long tail.

### 5.7 Trade-offs to accept

- The catalog is a **ceiling**: anything outside ~18 types needs a new component
  (cheap, one-time) or the custom tier. In exchange you get speed, consistency,
  and near-zero runtime errors — the three things you asked for.
- Some upfront work building the catalog and schemas, versus the current
  "the LLM does everything" convenience. This is the right trade: build the hard
  part **once**, not on every prompt.

---

## 6. One-line summary

Stop asking the LLM to *write the card*; give it a **library of great cards** and
ask it only to *pick and fill one*. Predefined typed cards are the library, the
LLM is the router, the existing data layer feeds them, and free-form codegen is
demoted to a sandboxed last resort.

---

# IMPLEMENTATION (built)

The architecture above is now implemented. Summary of what shipped on this branch.

## Engine (`src/cards/`)

| Module | Role |
|--------|------|
| `theme.js` | Shared palette token. |
| `charts.jsx` | **Recharts**-backed chart catalog: line, area, bar, stacked bar, pie/donut, candlestick, radial gauge, heatmap. Written once, themed, interactive, defensive. |
| `primitives.jsx` | Non-chart typed cards: KPI, KPI group, table, list/checklist, progress, countdown, converter, timeline, note, news feed, weather, image. State persists via the existing `useCardState`. |
| `registry.js` | The catalog source of truth: binds each `type` → component + a **Zod** props schema + a one-line summary used to build the router prompt. Adding a card type = one entry. |
| `adapters.js` | Named, JSON-serializable data transforms (`crypto_history`, `crypto_price`, `fx_table`, `fx_history`, `weather`, `news_list`, `worldbank_series`, `stock_*`, `generic_*`) that turn provider output into component props. Never throw. |
| `SpecCard.jsx` | The new **default renderer**: spec + resolved data → typed component. No Babel, no `eval`, own error boundary + state bridge. |
| `templates.js` | **100 predefined cards** (10 categories × 10) as ready-to-render specs — the instant tier. |
| `router.js` | The single structured-call system prompt (built from the catalog), spec normalization/validation, and the zero-LLM `matchTemplate` instant matcher. |
| `index.js` | Public surface. |

## How a prompt flows now

1. `matchTemplate(prompt)` — if it hits one of the 100 templates, the card is built and rendered with **zero LLM calls** (planner and pipeline both skipped); only its live bindings are fetched.
2. Otherwise the **single router call** returns a small validated spec (replacing the old plan→intent→codegen→repair chain). One cheap repair round-trip only if the `type` is invalid.
3. The existing provider layer resolves `dataBindings`; an adapter shapes the result into props at render time.

## Results against the three complaints

- **Speed.** Default initial bundle dropped **3,785 KB → 818 KB** (gzip 238 KB): `@babel/standalone` (~2.97 MB) is now a lazy `transpile` chunk loaded only if a legacy `renderCode` card renders. Common prompts cost **0 LLM calls**; everything else is one small structured call instead of 3–5.
- **Graphics.** All charts are Recharts components — consistent axes, tooltips, legends, responsiveness — instead of per-card hand-drawn SVG.
- **Errors.** No in-browser transpile/`eval` on the default path; specs are Zod-validated and components are pre-tested and null-safe, so the compile/runtime error class is largely gone. The old codegen survives only as a sandboxed-style escape hatch (`card.spec` absent → legacy renderer).

## Library decision

- **Recharts 3.x** for charts (added). **shadcn/ui** was *not* adopted: it requires a Tailwind migration this CSS-variable-themed app doesn't use; instead the primitives are built against the existing design tokens for visual consistency with zero migration risk. Recommend revisiting shadcn only if the app moves to Tailwind.

## Predefined card library — 100 cards (10 categories × 10)

### Finance
1. **Monthly Budget** — `bar_chart` (static)
2. **Spending Breakdown** — `pie_chart` (static)
3. **Net Worth** — `area_chart` (static)
4. **Savings Goals** — `progress` (static)
5. **Cash Flow** — `kpi_group` (static)
6. **Bills This Month** — `list` (static)
7. **Emergency Fund** — `gauge` (static)
8. **Debt Payoff** — `progress` (static)
9. **Subscriptions** — `table` (static)
10. **USD → EUR** — `converter` (static)

### Crypto
1. **Bitcoin** — `kpi` (live · crypto_price)
2. **Bitcoin · 7 Days** — `area_chart` (live · crypto_history)
3. **Ethereum · 7 Days** — `line_chart` (live · crypto_history)
4. **Crypto Allocation** — `pie_chart` (static)
5. **Bitcoin · 30 Days** — `area_chart` (live · crypto_history)
6. **Ethereum** — `kpi` (live · crypto_price)
7. **Solana** — `kpi` (live · crypto_price)
8. **Fear & Greed** — `gauge` (static)
9. **Solana · 7 Days** — `line_chart` (live · crypto_history)
10. **Holdings ($)** — `bar_chart` (static)

### Markets
1. **S&P 500 (sample)** — `area_chart` (static)
2. **Watchlist (sample)** — `table` (static)
3. **Asset Allocation** — `pie_chart` (static)
4. **Sector Performance (sample)** — `bar_chart` (static)
5. **US GDP** — `line_chart` (live · worldbank_series)
6. **Top Movers (sample)** — `bar_chart` (static)
7. **Dividends (sample)** — `table` (static)
8. **P/E Ratios (sample)** — `bar_chart` (static)
9. **Indexes (sample)** — `kpi_group` (static)
10. **Earnings (sample)** — `timeline` (static)

### Weather
1. **London** — `weather` (live · weather)
2. **New York** — `weather` (live · weather)
3. **Tokyo** — `weather` (live · weather)
4. **Paris** — `weather` (live · weather)
5. **Air Quality (sample)** — `gauge` (static)
6. **Forecast** — `weather` (live · weather)
7. **Rain Probability (sample)** — `bar_chart` (static)
8. **Temperature (sample)** — `line_chart` (static)
9. **Sun (sample)** — `kpi_group` (static)
10. **Weekend** — `weather` (live · weather)

### News
1. **Tech News** — `news` (live · news_list)
2. **AI News** — `news` (live · news_list)
3. **World (HN)** — `news` (live · news_list)
4. **Startup News** — `news` (live · news_list)
5. **Crypto News** — `news` (live · news_list)
6. **Science News** — `news` (live · news_list)
7. **Dev News** — `news` (live · news_list)
8. **Morning Digest** — `news` (live · news_list)
9. **Trending (sample)** — `bar_chart` (static)
10. **Topics to Watch** — `list` (static)

### Personal
1. **Today** — `list` (static)
2. **Habits (4 weeks)** — `heatmap` (static)
3. **Today** — `timeline` (static)
4. **Focus Goals** — `progress` (static)
5. **Reading List** — `list` (static)
6. **Quick Note** — `note` (static)
7. **Birthday** — `countdown` (static)
8. **2026 Goals** — `progress` (static)
9. **Mood (1-5)** — `bar_chart` (static)
10. **Shopping** — `list` (static)

### Health
1. **Workout** — `list` (static)
2. **Steps** — `area_chart` (static)
3. **Hydration** — `progress` (static)
4. **Macros** — `pie_chart` (static)
5. **Weight** — `line_chart` (static)
6. **Sleep (h)** — `bar_chart` (static)
7. **HR Zones (min)** — `bar_chart` (static)
8. **BMI** — `gauge` (static)
9. **Activity (min/day)** — `heatmap` (static)
10. **Fitness Goals** — `progress` (static)

### Work
1. **KPIs (sample)** — `kpi_group` (static)
2. **Revenue (sample)** — `area_chart` (static)
3. **Funnel (sample)** — `bar_chart` (static)
4. **Roadmap (sample)** — `timeline` (static)
5. **Sprint Tasks** — `list` (static)
6. **Team Capacity** — `progress` (static)
7. **Churn** — `kpi` (static)
8. **Expenses (sample)** — `pie_chart` (static)
9. **OKRs** — `progress` (static)
10. **Meetings** — `timeline` (static)

### Travel
1. **Next Trip** — `countdown` (static)
2. **Packing** — `list` (static)
3. **Destination** — `weather` (live · weather)
4. **Itinerary** — `timeline` (static)
5. **Trip Budget** — `pie_chart` (static)
6. **USD Exchange Rates** — `table` (live · fx_table)
7. **Japan (sample)** — `kpi_group` (static)
8. **Miles → Km** — `converter` (static)
9. **Time Zones** — `table` (static)
10. **Bucket List** — `list` (static)

### Utilities
1. **Miles → Km** — `converter` (static)
2. **USD Rates (live)** — `table` (live · fx_table)
3. **Kg → Lb** — `converter` (static)
4. **World Population** — `line_chart` (live · worldbank_series)
5. **US GDP** — `area_chart` (live · worldbank_series)
6. **New Year** — `countdown` (static)
7. **Scratchpad** — `note` (static)
8. **EUR/USD** — `line_chart` (live · fx_history)
9. **°C → °F (×1.8, +32 approx)** — `converter` (static)
10. **Note** — `note` (static)

