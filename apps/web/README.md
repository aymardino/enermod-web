# EnerMod Africa web

Next.js 16 (App Router, TypeScript, Tailwind 4, next-intl for English and French, TanStack Query).
Marketing and institutional pages, the observatory (maps, gap analysis, readiness, studies, tools,
countries, recommender), the contribution form, the grounded assistant widget and the curation area.

```bash
pnpm install
pnpm dev          # http://localhost:3000, expects the API on http://localhost:8000 (API_URL)
pnpm build && pnpm start
pnpm lint
```

The browser never calls the API directly: `src/app/api/[...path]/route.ts` proxies `/api/*` to
`API_URL` and passes cookies through, so one origin is enough. Interface strings live in
`messages/<locale>.json`; reading pages (about, methodology, research, privacy, legal) in
`content/<locale>/*.md`. Enumerated codes of the inventory are translated through the `labels`
namespace (`src/lib/labels.ts`).
