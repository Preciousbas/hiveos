# HiveOS

An operating system for work.

Type a goal. HiveOS runs a coordinated workforce — CEO, Research, Marketing, Engineering, QA, and Finance — and streams results into Mission Control as each agent finishes.

Built with [Coasty](https://coasty.ai) (computer use) and OpenAI.

**Demo video:** [tweet](https://x.com/PreciousBasseyy/status/2083704648313999615?s=20)

---

## Agents

| Agent | Runtime | Responsibility |
| --- | --- | --- |
| CEO | OpenAI | Delegates briefs, then synthesizes an executive summary |
| Research | Coasty (`POST /v1/tasks`) | Live browser research with screenshots |
| Marketing | OpenAI | Launch copy grounded in Research findings only |
| Engineering | OpenAI | Stack, milestones, and a first PR description |
| QA | OpenAI | Pass/fail test plan |
| Finance | OpenAI | Pricing and unit economics |

The `/api/run` route streams NDJSON events so the UI updates stage by stage.

---

## Quick start

**Requirements:** Node 18+, OpenAI API key, Coasty API key.

```bash
cp .env.local.example .env.local
# fill in OPENAI_API_KEY and COASTY_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | CEO, Marketing, Engineering, QA, Finance |
| `COASTY_API_KEY` | Yes | Research agent |
| `BLOB_READ_WRITE_TOKEN` | Production | Vercel Blob — persists Memory across deploys |
| `COASTY_BASE_URL` | No | Default `https://coasty.ai/v1` |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini` |

**Coasty keys**

- `sk-coasty-test-…` — sandbox. API succeeds, but Research returns a stub (`test_mode`), not real browsing.
- `sk-coasty-live-…` — live computer use. Use for demos; may bill.

Auth is `X-API-Key: <raw key>` — do not prefix with `Bearer `.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Mission Control |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

---

## How it works

1. You submit a goal.
2. CEO produces five specialist briefs.
3. Research runs on Coasty; Marketing / Engineering / QA / Finance follow on OpenAI.
4. CEO synthesizes a final brief.
5. The completed mission is saved to Memory.

**Memory** stores each completed mission as a Vercel Blob (`missions/{id}.json`) when `BLOB_READ_WRITE_TOKEN` is set. Without it, local dev falls back to `data/missions.json`. Activity is live-only and is not saved. Click a Memory item to restore that session’s panels.

---

## Deploy on Vercel

1. Push the repo and import the project in [Vercel](https://vercel.com/new), or run `npx vercel`.
2. Create a **Blob** store for the project (Dashboard → Storage → Blob). This injects `BLOB_READ_WRITE_TOKEN`.
3. Set environment variables: `OPENAI_API_KEY`, `COASTY_API_KEY`, and optionally `OPENAI_MODEL` / `COASTY_BASE_URL`.
4. Deploy. For live Research, use a `sk-coasty-live-…` key.

`app/api/run` sets `maxDuration` to 300s for long Coasty runs. On Hobby plans the platform cap is lower (typically 60s) — upgrade or keep Research short if you hit timeouts.

```bash
npx vercel        # preview
npx vercel --prod # production
```

---

## Project layout

```
app/           # App Router UI + API routes
  api/run/     # Mission pipeline (NDJSON stream)
  api/memory/  # List saved missions
lib/           # Agents, Coasty/OpenAI clients, prompts, memory
data/          # Local filesystem fallback for Memory
```

---

## License

Private / hackathon project.
