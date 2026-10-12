# EnerMod Africa API

FastAPI + SQLAlchemy 2. PostgreSQL (Supabase or any managed Postgres) in production, SQLite by
default for development and tests. The observatory tables mirror the master workbook; the hub
adds accounts and roles, contributions, discovery runs and candidates, tool repository metrics,
usage events, assistant logs and a job queue.

```bash
pip install -e ".[ai,dev]"
uvicorn enermod_api.main:app --reload        # http://localhost:8000/docs
python -m pytest -q                          # 33 tests, SQLite, no network
python -m enermod_api.seed --reset           # reload data/enermod.db (or --workbook data/Models_Africa_v2.xlsm)
python -m enermod_api.manage promote you@example.org admin
python -m enermod_api.manage discover --since 2026-05-05
python -m enermod_api.worker                 # runs queued jobs and the periodic ones
```

The data is loaded automatically from `data/enermod.db` the first time an empty database is
used (`SEED_ON_STARTUP`). Every setting is an environment variable; see `.env.example` at the
repository root.

Routers: `public` (stats, countries, studies, tools, exports), `recommend`, `chat`,
`contributions`, `events`, `auth`, `admin`. Services: `data` (corpus snapshot), `scores`,
`stats`, `recommender`, `chat` + `llm`, `openalex` + `discovery`, `imports`, `contributions`,
`metrics`, `analytics`, `email`, `jobs`.
