# Deployment

Three containers (API, worker, web) and one PostgreSQL database. Any Docker host works; the
notes below cover the two simplest paths.

## Docker compose on one machine

```bash
cp .env.example .env            # set SECRET_KEY, ADMIN_EMAILS, an AI key if you want the assistant
docker compose up --build       # web on :3000, API on :8000, data in the pgdata volume
```

Put a reverse proxy with TLS in front of the web service only (Caddy, nginx, Traefik); the API
is reached through the web app's `/api` proxy. Set `BASE_URL=https://your.domain` and
`COOKIE_SECURE=true`.

## Render, Fly, Railway, a VPS

- Build the API image with context = repository root and `apps/api/Dockerfile`; run the same
  image a second time with the command `python -m enermod_api.worker` for the worker.
- Build the web image with `apps/web/Dockerfile`; set `API_URL` to the API's internal address
  (or its public https address) and `PROXY_KEY` to the API's `SECRET_KEY`.
- Database: Supabase (`docs/supabase.md`) or the platform's managed PostgreSQL.
- The first start seeds the database from the bundled `data/enermod.db`.

## Streamlit edition

`legacy/streamlit/` is the original single-container observatory, unchanged except for the
path of the shared seed database. `docker build -f legacy/streamlit/Dockerfile -t enermod-streamlit .`

## Checks before going live

- `cd apps/api && python -m pytest -q` (33 tests) and `cd apps/web && pnpm build`.
- Sign in with an `ADMIN_EMAILS` address, open `/admin`, run a discovery and a metrics refresh.
- Set `NEXT_PUBLIC_SITE_URL` (canonical URLs, sitemap) and `NEXT_PUBLIC_CONTACT_EMAIL`.
