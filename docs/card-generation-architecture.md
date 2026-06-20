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
