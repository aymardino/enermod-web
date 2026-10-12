# Running on Supabase

The hub needs one PostgreSQL database. Supabase provides it (plus backups and a SQL editor);
the API keeps its own authentication and does not depend on Supabase Auth or PostgREST, so the
same code runs on any PostgreSQL or on SQLite.

## 1. Create the project

In the Supabase dashboard create a project (region close to your users, e.g. Frankfurt or
Cape Town). Open **Project settings → Database → Connection string** and copy the URI. Two
forms exist:

- **Direct** (`db.<ref>.supabase.co:5432`): fine for a single API process;
- **Session pooler** (`aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<ref>`):
  use it when the API runs on a platform that only has IPv4 (Render, most PaaS) or when several
  processes connect (API + worker). Prefer the *session* pooler over the *transaction* pooler:
  SQLAlchemy's connection pool expects session semantics.

## 2. Point the API at it

```
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

`postgres://` and `postgresql://` are rewritten to `postgresql+psycopg://` automatically.
Start the API: it creates the tables (`Base.metadata.create_all`) and, because the `studies`
table is empty, loads `data/enermod.db` (1,053 studies, 101 tools, 54 countries) in a few
seconds. `supabase/schema.sql` holds the same schema if you prefer to create the tables from
the SQL editor first.

With docker compose: set `DATABASE_URL` in `.env`, remove the `db` service and the
`depends_on: db` lines from `docker-compose.yml`.

## 3. Keep the data

- **Reload from the workbook** after curating `data/Models_Africa_v2.xlsm`:
  `python -m enermod_api.seed --workbook data/Models_Africa_v2.xlsm --reset` wipes and reloads
  the seven observatory tables (studies added through the hub are lost unless they were
  carried into the workbook: export them first with `/export/studies.csv?source=…`).
- **Backups**: Supabase takes daily backups on paid plans; `pg_dump` works as usual.
- **Row Level Security**: the API connects with the `postgres` role and bypasses RLS. If you
  enable PostgREST access for the open data, add the `SELECT` policies suggested at the end of
  `supabase/schema.sql`.

## 4. Later: Supabase Auth

Accounts are handled by the API (argon2 passwords, magic links, roles). Switching to Supabase
Auth would mean verifying Supabase JWTs in `enermod_api/deps.py` and mapping `app_metadata.role`
to the curator/admin roles; the rest of the API is unchanged. It is not needed to go live.
