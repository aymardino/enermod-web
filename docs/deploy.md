# Deployment

Three containers (API, worker, web) and one PostgreSQL database. Any Docker host works; the
notes below cover Render first, then docker compose, then a generic host.

## Render (blueprint)

`render.yaml` at the repository root describes the four pieces: a PostgreSQL database, the API
(Docker, health check on `/health`), the worker (same image, `python -m enermod_api.worker`)
and the web app (Docker). Browsers only reach the web app; it proxies `/api/*` to the API over
Render's private network, so no domain is needed to start.

1. Push the repository to GitHub (done) and connect Render to it.
2. In the Render dashboard: **New → Blueprint**, pick `aymardino/enermod-web`, branch `main`.
   Render reads `render.yaml` and creates `enermod-db`, `enermod-api`, `enermod-worker` and
   `enermod-web`. The API's `SECRET_KEY` is generated; the web app receives `API_URL` and
   `PROXY_KEY` from the API service.
3. On `enermod-api`, set the environment variables marked `sync: false` that you need:
   `ADMIN_EMAILS` (your address, to reach `/admin`), an assistant key (`ANTHROPIC_API_KEY`,
   `GEMINI_API_KEY` or `DEEPSEEK_API_KEY`), `OPENALEX_MAILTO`, and an e-mail provider
   (`EMAIL_PROVIDER=smtp` with the `SMTP_*` variables, or `resend`). Without an e-mail provider
   the magic-link sign-in is unavailable; the password sign-in still works.
4. On the worker, set the same `OPENALEX_MAILTO` and keys; the blueprint turns on the weekly
   discovery run and the monthly metrics refresh.
5. First start: the API creates the tables and loads `data/enermod.db` (bundled in the image)
   because the database is empty; a minute later the site is live at
   `https://enermod-web.onrender.com` (the exact name is shown in the dashboard).
6. Custom domain: add it to `enermod-web` (Settings → Custom domains), then set `BASE_URL` on
   `enermod-api` to `https://your.domain`. For the canonical URLs and sitemap, rebuild the web
   image with `NEXT_PUBLIC_SITE_URL` (a Docker build argument; the default is
   `https://enermod.africa`).
7. If a service failed during the first sync (the web app needs the API's address), run
   **Manual sync** on the blueprint once every service is green.

Variants:

- **Supabase as the database**: remove the `databases` block, replace the two `DATABASE_URL`
  entries by `sync: false` and paste the Supabase connection string in the dashboard
  (`docs/supabase.md`). Prefer the session pooler URL on Render (IPv4).
- **Free tier for a test**: `plan: free` on `enermod-web` and `enermod-api`, `INLINE_JOBS=1` on
  the API, delete the worker. Free instances cannot use the private network: set `API_URL` on
  `enermod-web` by hand to the API's public `https://enermod-api.onrender.com`. Expect cold
  starts of about a minute. Render's free PostgreSQL expires after 30 days, so for a free test
  use Supabase's free tier as the database instead (previous variant).
- Other regions: change `region` (Frankfurt was chosen for Africa-to-Europe latency and EU hosting).

## Docker compose on one machine

```bash
cp .env.example .env            # set SECRET_KEY, ADMIN_EMAILS, an AI key if you want the assistant
docker compose up --build       # web on :3000, API on :8000, data in the pgdata volume
```

Put a reverse proxy with TLS in front of the web service only (Caddy, nginx, Traefik); the API
is reached through the web app's `/api` proxy. Set `BASE_URL=https://your.domain` and
`COOKIE_SECURE=true`.

## Fly, Railway, a VPS

- Build the API image with context = repository root and `apps/api/Dockerfile`; run the same
  image a second time with the command `python -m enermod_api.worker` for the worker.
- Build the web image with `apps/web/Dockerfile`; set `API_URL` to the API's internal address
  (or its public https address) and `PROXY_KEY` to the API's `SECRET_KEY`.
- Database: Supabase (`docs/supabase.md`) or the platform's managed PostgreSQL.
- The first start seeds the database from the bundled `data/enermod.db`.

## Running locally, and why figures may not load

The site is a shell; every number, map and chart is fetched from the API through the web app's
`/api` proxy. Locally that means two processes:

```bash
cd apps/api && pip install -e ".[ai,dev]" && uvicorn enermod_api.main:app --reload --port 8000
cd apps/web && pnpm install && pnpm dev
```

Checklist when the pages stay empty:

1. Open `http://localhost:3000/api/health`. `{"ok":true}` means the proxy reaches the API.
   `{"detail":"The API is not reachable","code":"ECONNREFUSED"}` means nothing listens where
   the proxy looks: start the API, or set `API_URL` in `apps/web/.env.local` to its address
   (default `http://127.0.0.1:8000`; use `127.0.0.1`, not `localhost`, because Node may resolve
   `localhost` to the IPv6 address `::1` while uvicorn listens on IPv4 only).
2. Open `http://localhost:8000/stats/overview` directly: `n_studies` should be 1053. If it is
   0, the seed did not run; check that `data/enermod.db` exists at the repository root and run
   `python -m enermod_api.seed` from `apps/api`.
3. The API needs Python 3.11 or newer; `pip install -e ".[ai,dev]"` fails on older versions.
4. The browser console shows the failing request; `apps/web` terminal shows `[api proxy]` lines
   with the error code.

## Streamlit edition

`legacy/streamlit/` is the original single-container observatory, unchanged except for the
path of the shared seed database. `docker build -f legacy/streamlit/Dockerfile -t enermod-streamlit .`

## Checks before going live

- `cd apps/api && python -m pytest -q` (33 tests) and `cd apps/web && pnpm build`.
- Sign in with an `ADMIN_EMAILS` address, open `/admin`, run a discovery and a metrics refresh.
- Set `NEXT_PUBLIC_SITE_URL` (canonical URLs, sitemap) and `NEXT_PUBLIC_CONTACT_EMAIL`.
