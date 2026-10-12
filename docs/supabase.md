# Switching to Supabase

The hub needs one PostgreSQL database. Supabase provides it (plus backups, a SQL editor and a
dashboard); the API keeps its own authentication and does not depend on Supabase Auth or
PostgREST, so the same code runs on Supabase, on any other PostgreSQL, or on SQLite for
development. The switch is one environment variable. The whole path (table creation, seed,
the 33 API tests, identical figures) was checked against PostgreSQL 16, see section 6.

## 1. Create the project

In the Supabase dashboard: **New project**, pick an organisation, a name (`enermod`), a strong
database password (keep it, it goes into the connection string) and a region close to your
users and to the API host, e.g. *Central EU (Frankfurt)* when the API runs on Render Frankfurt.
The free tier is enough to start; it pauses the project after a week without connections
(restore it from the dashboard) and the paid tiers add daily backups.

## 2. Copy the connection string

Click **Connect** at the top of the dashboard (or *Project settings → Database*), tab **URI**.
Three forms are offered:

- **Session pooler**, port 5432, user `postgres.<ref>`: the one to use. It is reachable over
  IPv4 (Render and most PaaS have no IPv6) and serves the API and the worker at the same time.
  `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`
- **Direct connection**, `db.<ref>.supabase.co:5432`: IPv6 only unless you buy the IPv4 add-on;
  fine from a machine with IPv6.
- **Transaction pooler**, port 6543: do not use it; SQLAlchemy's connection pool expects
  session semantics.

Two details: URL-encode special characters in the password (`@` → `%40`, `#` → `%23`,
`/` → `%2F`, `:` → `%3A`), and append `?sslmode=require` if you want a TLS failure to be
explicit (psycopg uses TLS whenever the server offers it, which Supabase does).

## 3. Point the API at it

`DATABASE_URL` is the only setting. `postgres://` and `postgresql://` prefixes are rewritten to
`postgresql+psycopg://` automatically.

```bash
# locally
export DATABASE_URL='postgresql://postgres.<ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'
cd apps/api && uvicorn enermod_api.main:app --port 8000
```

- **docker compose**: put `DATABASE_URL=...` in `.env`; the bundled `db` service and the
  `depends_on: db` lines in `docker-compose.yml` can then be removed.
- **Render**: `render.yaml` already expects Supabase and asks for `DATABASE_URL` when the
  Blueprint is created. On a deployment that already exists: `enermod-api` → **Environment** →
  `DATABASE_URL` → Edit → paste → **Save changes**; Render redeploys the service. Repeat on
  `enermod-worker`. Nothing is stored in the repository (`docs/deploy.md`).
- The worker takes the same `DATABASE_URL` and `SECRET_KEY` as the API.

**First start.** The API creates the 18 tables (`Base.metadata.create_all`) and, because the
`studies` table is empty, loads `data/enermod.db`: 1,053 studies, 101 tools, 54 countries and
their links, in a few seconds (longer over a slow link). It then aligns PostgreSQL's id
sequences with the seeded ids so that studies approved later get fresh ids. Check with
`GET /stats/overview` (`n_studies: 1053`) or in the Supabase *Table editor*.

Prefer creating the tables yourself? Run `supabase/schema.sql` in the SQL editor first (same
18 tables, generated from the models); the API then only seeds. `SEED_ON_STARTUP=false` turns
the automatic seed off (set on the worker in `render.yaml`, which never seeds).

## 4. What moves and what does not

- The observatory data (studies, tools, countries, power pools) comes from `data/enermod.db`,
  so a Supabase database starts with the complete inventory.
- Accounts, pending contributions, discovery candidates and usage events of a *local SQLite*
  hub are not copied: Supabase starts clean. Do the switch before inviting users, or re-create
  the few approved studies through the form or the Krinea import.

## 5. Keep the data

- **Reload from the workbook** after curating `data/Models_Africa_v2.xlsm`:
  `python -m enermod_api.seed --workbook data/Models_Africa_v2.xlsm --reset` wipes and reloads
  the seven observatory tables (studies added through the hub are lost unless they were carried
  into the workbook: export them first with `/export/studies.csv?source=…`).
  `python -m enermod_api.seed --reset` reloads from `data/enermod.db`. Both were checked on
  PostgreSQL.
- **Backups**: Supabase takes daily backups on paid plans; `pg_dump` works as usual with the
  session pooler URL.
- **Connections**: each API or worker process keeps at most 5 pooled connections plus 10 on
  demand (SQLAlchemy defaults), well within the session pooler's allowance.
- **Row Level Security**: the API connects with the `postgres` role and bypasses RLS. If you
  enable PostgREST access for the open data, add the `SELECT` policies suggested at the end of
  `supabase/schema.sql`.

## 6. Testing against PostgreSQL

The test suite runs on SQLite by default. Point it at an empty PostgreSQL database to run the
same 33 tests there (the database is seeded like production, use a throwaway one):

```bash
TEST_DATABASE_URL='postgresql://user:password@host:5432/enermod_test' python -m pytest -q
```

Checked with PostgreSQL 16: all tests pass, `python -m enermod_api.seed --reset` works, and
the public endpoints (overview, gaps, readiness, countries, studies, tools, exports) return the
same figures as the SQLite instance; only timestamps differ.

## 7. Later: Supabase Auth

Accounts are handled by the API (argon2 passwords, magic links, roles). Switching to Supabase
Auth would mean verifying Supabase JWTs in `enermod_api/deps.py` and mapping `app_metadata.role`
to the curator/admin roles; the rest of the API is unchanged. It is not needed to go live.
