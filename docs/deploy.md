# Deployment

Three containers (API, worker, web) and one PostgreSQL database. Any Docker host works; the
notes below cover Render first, then docker compose, then a generic host.

## Render (blueprint)

`render.yaml` at the repository root describes three services: the API (Docker, health check
on `/health`), the worker (same image, `python -m enermod_api.worker`) and the web app (Docker).
The database is Supabase (`docs/supabase.md`); Render asks for its connection string. Browsers
only reach the web app; it proxies `/api/*` to the API over Render's private network, so no
domain is needed to start.

1. Push the repository to GitHub (done) and connect Render to it.
2. In the Render dashboard: **New → Blueprint**, pick `aymardino/enermod-web`, branch `main`.
   Render reads `render.yaml`, creates `enermod-api`, `enermod-worker` and `enermod-web`, and
   asks for `DATABASE_URL`: paste the Supabase connection string (Connect → URI → *Session
   pooler*, port 5432) for the API and again for the worker. The API's `SECRET_KEY` is
   generated; the web app receives `API_URL` and `PROXY_KEY` from the API service.
   **Already deployed?** Open `enermod-api` → **Environment**, edit `DATABASE_URL`, paste the
   Supabase string, **Save changes** (Render redeploys), then do the same on `enermod-worker`.
   A database created by an earlier version of the blueprint (`enermod-db`) can be deleted
   from the dashboard once the switch is done.
3. On `enermod-api`, set the environment variables marked `sync: false` that you need:
   `ADMIN_EMAILS` (your address, to reach `/admin`), an assistant key (`ANTHROPIC_API_KEY`,
   `GEMINI_API_KEY` or `DEEPSEEK_API_KEY`), `OPENALEX_MAILTO`, and an e-mail provider
   (`EMAIL_PROVIDER=smtp` with the `SMTP_*` variables, or `resend`; see "E-mail and sign-in
   providers" below). Without an e-mail provider the sign-in link and the password recovery
   are unavailable; the password sign-in still works. `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET` turn on "Continue with Google".
4. On the worker, set the same `OPENALEX_MAILTO` and keys; the blueprint turns on the weekly
   discovery run and the monthly metrics refresh.
5. First start: the API creates the tables and loads `data/enermod.db` (bundled in the image
   at `/app/data`, see `SEED_SQLITE` in `apps/api/Dockerfile`) because the database is empty;
   the API log shows `seeded from /app/data/enermod.db`. A minute later the site is live at
   `https://enermod-web.onrender.com` (the exact name is shown in the dashboard).
6. Custom domain (`enermod.africa`): add it to `enermod-web` (Settings → Custom domains; Render
   adds `www.` and redirects it) and create the DNS records it shows at the registrar (an
   ALIAS/ANAME, or the A record Render gives, for the root; a CNAME to
   `enermod-web.onrender.com` for `www`; no AAAA record). Once Render shows the certificate,
   set `BASE_URL=https://enermod.africa` on `enermod-api` (the links in e-mails and the Google
   redirect) and `CANONICAL_HOST=enermod.africa` on `enermod-web` (the onrender.com address
   then redirects to the domain). The canonical URLs and sitemap already use
   `https://enermod.africa` (`NEXT_PUBLIC_SITE_URL`, a Docker build argument).
7. If a service failed during the first sync (the web app needs the API's address), run
   **Manual sync** on the blueprint once every service is green.

Variants:

- **Render PostgreSQL instead of Supabase**: add a `databases` block (`enermod-db`,
  `basic-256mb`) and replace the two `DATABASE_URL` entries by
  `fromDatabase: { name: enermod-db, property: connectionString }`; the comment at the top
  of `render.yaml` has the exact lines.
- **Free tier for a test**: `plan: free` on `enermod-web` and `enermod-api`, `INLINE_JOBS=1` on
  the API, delete the worker. Free instances cannot use the private network: set `API_URL` on
  `enermod-web` by hand to the API's public `https://enermod-api.onrender.com`. Expect cold
  starts of about a minute. The database stays on Supabase's free tier.
- Other regions: change `region` (Frankfurt was chosen for Africa-to-Europe latency and EU hosting).

## E-mail and sign-in providers

Accounts work with a password alone. Two features need an **e-mail provider** on `enermod-api`:
the sign-in link ("E-mail me a link") and **password recovery** ("Forgot your password?",
which mails a one-time link to the new-password page). Set the variables in the Render
dashboard (`enermod-api` → Environment); the API restarts by itself.

| Provider | When | Variables on `enermod-api` |
| --- | --- | --- |
| Gmail (an app password) | quickest, no domain needed, a few hundred messages a day | `EMAIL_PROVIDER=smtp`, `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`, `SMTP_PASSWORD=<16-character app password>`, `EMAIL_FROM=EnerMod Africa <you@gmail.com>` |
| Brevo (free plan, SMTP relay) | a sender address without owning a domain, 300 messages a day | `EMAIL_PROVIDER=smtp`, `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_USER=<the login shown in Brevo → SMTP & API>`, `SMTP_PASSWORD=<SMTP key>`, `EMAIL_FROM=EnerMod Africa <a sender validated in Brevo>` |
| Resend | once the site has its own domain (DNS records to add) | `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=re_…`, `EMAIL_FROM=EnerMod Africa <no-reply@your.domain>` |

Gmail: the account needs 2-step verification, then https://myaccount.google.com/apppasswords
(Google Account → Security → *App passwords*) gives the 16-character password; `EMAIL_FROM`
must be that Gmail address (Gmail rewrites any other sender). The links in the messages use the
address the site was opened on (the web proxy passes the `Host` it was reached on); set
`BASE_URL` on `enermod-api` to pin them to one address, which is required once the site has a
custom domain (step 6). Test it from `/sign-in`: the section "Or get a sign-in link by e-mail"
appears only once the provider is complete (`/api/auth/providers` answers `"email": true`); if
it is missing, `EMAIL_PROVIDER` is not `smtp` or `resend`, or one of `SMTP_HOST`, `SMTP_USER`,
`SMTP_PASSWORD` (or `RESEND_API_KEY`) is empty. Once it shows, a failed send answers "The
e-mail could not be sent (…)" and the API log has the provider's error.

**Sign in with Google.** In Google Cloud console (any project): *APIs & Services → OAuth
consent screen* (External, the app name and your contact e-mail; publish it, or add testers
while it is in testing), then *Credentials → Create credentials → OAuth client ID → Web
application* with the authorised redirect URI, character for character,
`https://enermod-web.onrender.com/api/auth/google/callback` (no trailing slash; the scopes step
needs nothing beyond the default e-mail and profile). While the consent screen is "in
testing", only the test users listed there can sign in; publishing lifts that. Put the client
id and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on `enermod-api`. The "Continue
with Google" button appears on `/sign-in` and `/sign-up` as soon as both are set. A Google
account whose e-mail matches an existing account signs in to that account; a new e-mail
creates a contributor account (an `ADMIN_EMAILS` address becomes admin). The redirect URI must
be the address the API builds: the one the site was opened on, or `BASE_URL` once it is set,
so with a custom domain register `https://your.domain/api/auth/google/callback`, set
`BASE_URL`, and redirect the onrender.com address to the domain (a sign-in started on one host
and finished on the other fails with `?error=google`).

**Who becomes an administrator.** An `ADMIN_EMAILS` address gets the admin role at its first
*verified* sign-in: a one-time e-mail link, Google, or the `set-password` command below. A
password registration alone does not prove the address, so it stays a contributor until
then, and a password set before that first proof is dropped when the address is claimed.

**Lost password, no e-mail provider yet.** From the Render dashboard open `enermod-api` →
*Shell* and run `python -m enermod_api.manage set-password you@example.org`; it asks for the
new password, signs the other browsers out and grants the admin role to an `ADMIN_EMAILS`
address. The same command creates the account when it does not exist. No Shell tab (free
instances have none)? Run it from your machine against the database:
`cd apps/api && pip install -e . && DATABASE_URL='<the Supabase session-pooler string>'
python -m enermod_api.manage set-password you@example.org` (`--password <value>` skips the
prompt for scripts, and then sits in the shell history).

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

- `cd apps/api && python -m pytest -q` (the full suite) and `cd apps/web && pnpm build`. Before a
  release, run the suite once against PostgreSQL too: `TEST_DATABASE_URL=postgresql://... python -m pytest -q`
  on a throwaway database (`docs/supabase.md`, section 6).
- Sign in with an `ADMIN_EMAILS` address, open `/admin`, run a discovery and a metrics refresh.
- Set `NEXT_PUBLIC_SITE_URL` (canonical URLs, sitemap) and `NEXT_PUBLIC_CONTACT_EMAIL`.
