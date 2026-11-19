# 黑神话八仙（heishenhua-baxian）

Minimal playable demo: chat with each of the Eight Immortals. An LLM (or offline mock) returns **dialogue + next relationship state**. Transitions are validated by a small state machine.

## Quick start

```bash
git clone https://github.com/youtishi/heishenhua-baxian.git
cd heishenhua-baxian
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`). **No API key required** — default engine is offline mock.

## Demo walkthrough

1. Pick an immortal on the left (e.g. 吕洞宾). Badge starts at **初识**.
2. Say something like「久仰仙名，请教仙法」→ mock may advance to **问道**.
3. Continue with「愿受试炼」→ **试炼**, then「愿结仙缘」→ **结缘**, then「同去降妖」→ **降妖**.
4. Reload the page: per-immortal state and chat history persist via `localStorage`.

## Story states (Chinese UI)

| State | Meaning |
| --- | --- |
| 初识 | First meeting — names and intent |
| 问道 | Asking about the Way / cultivation |
| 试炼 | Immortal tests your heart |
| 结缘 | Bond formed; guidance unlocked |
| 降妖 | Ally against a demon threat |

Order: `初识 → 问道 → 试炼 → 结缘 → 降妖`.

## How the LLM drives transitions

1. Client sends: immortal identity, **current state**, player text, short history.
2. Model (or mock heuristics) returns JSON: `{ reply, nextState, reason? }`.
3. `sanitizeTransition()` enforces legality before applying:
   - **stay** on current state
   - **forward** exactly one step
   - **mild backtrack** at most one step (documented; e.g. apology / leave cues in mock)
   - **illegal jumps** (skip ahead or jump back >1) are clamped to stay

Mock mode uses keyword heuristics (请教 / 试炼 / 结缘 / 降妖 / 告辞 …) so the demo works offline.

## Optional real LLM (OpenAI-compatible)

Copy `.env.example` → `.env.local` (never commit secrets):

```bash
VITE_OPENAI_API_KEY=sk-...
# optional:
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
VITE_OPENAI_MODEL=gpt-4o-mini
```

Restart `npm run dev`, then choose **OpenAI 兼容 API** in the UI. If the key is missing or the call fails, the app falls back to mock.

> Keys are exposed to the browser via the `VITE_` prefix — fine for a local demo only. For production, proxy through a backend.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview build |

## Scope

One-page chat + state engine + mock LLM (+ optional API). Not a full game.
