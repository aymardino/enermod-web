# EnerMod Africa web

Next.js 16 (App Router, TypeScript, Tailwind 4, next-intl for English and French, TanStack Query).
Marketing and institutional pages, the observatory (maps, gap analysis, readiness, studies, tools,
countries, recommender), the contribution form, the grounded assistant widget and the curation area.

## Run it locally

Every figure on the site comes from the API, so start the API first:

```bash
# terminal 1: the API (seeds data/enermod.db on first start)
cd apps/api && pip install -e ".[ai,dev]" && uvicorn enermod_api.main:app --reload --port 8000
# terminal 2: the web app
cd apps/web && pnpm install && pnpm dev            # http://localhost:3000
```

The browser never calls the API directly: `src/app/api/[...path]/route.ts` proxies `/api/*` to
`API_URL` (default `http://127.0.0.1:8000`) and passes cookies through, so one origin is enough.
If the API runs elsewhere, create `apps/web/.env.local` with `API_URL=http://host:port`.

**Figures do not load?** Open http://localhost:3000/api/health. `{"ok":true}` means the proxy
reaches the API; `{"detail":"The API is not reachable"}` means the API is not running on the
address the proxy uses (check terminal 1, the port, and `API_URL`). The API needs Python 3.11+.

```bash
pnpm build && pnpm start      # production build
pnpm lint
```

Interface strings live in `messages/<locale>.json`; reading pages (about, methodology, research,
privacy, legal) in `content/<locale>/*.md`. Enumerated codes of the inventory are translated
through the `labels` namespace (`src/lib/labels.ts`).
