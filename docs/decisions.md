# Decision log

Every product or technical decision taken on this project, in order, with the reason and what
it would cost to reverse. Same format as the Krinea log: number · date · status · decision ·
why · consequences / how to undo.

---

## D-01 · 2026-10-12 · decided · A new repository, the Streamlit app kept as `legacy/`

**Decision.** The hub lives in `aymardino/enermod-web`, created by the owner. The original
Streamlit observatory (`aymardino/Enermod_Africa`) is not modified; a copy of it lives under
`legacy/streamlit/` in the new repository, unchanged except for the path of the seed database,
which moved to `data/` at the repository root.

**Why.** Owner's instruction ("duplicate or create a new repository before starting"). The
Streamlit edition is cited in the thesis (Appendix F) and in daily use; it must keep working.
The session's GitHub integration cannot create repositories (403), so the owner created it.

**Consequences.** Two front ends share one seed database (`data/enermod.db`) and one workbook
(`data/Models_Africa_v2.xlsm`). Fixes are not back-ported to `Enermod_Africa` automatically.

## D-02 · 2026-10-12 · decided · Same stack as Krinea

**Decision.** Monorepo: `apps/api` (Python 3.11+, FastAPI, SQLAlchemy 2, PostgreSQL or SQLite),
`apps/web` (Next.js 16 App Router, TypeScript, Tailwind 4, next-intl, TanStack Query), one
public origin with the web app proxying `/api/*` to the API, a database-backed job queue and a
worker process, Docker images for each service.

**Why.** Owner's instruction to build on the Krinea web app; the stack is proven there
(deployed on Render), the owner already knows it, and the two products will exchange data.

**Consequences.** Two languages in the repository; the UI primitives, the proxy route and the
i18n set-up are copied from Krinea (AGPL application code reused by the same author).

## D-03 · 2026-10-12 · decided · The data layer of the thesis carries over unchanged

**Decision.** The seven observatory tables (studies, tools, countries, power pools and the three
link tables) keep the columns of the master workbook. `seed.py` loads them from the SQLite
build or from the workbook itself (a port of `build_database.py`). The hub adds columns rather
than renaming: `doi` (normalised, for matching), `source`, `status` on studies; `repo_url`,
`website_url`, `tracker_url` on tools.

**Why.** The workbook remains the curators' editing environment ("one edit and one command",
thesis 5.5); Krinea's 51-field energy template uses the same field names, so exports map one to
one.

**Consequences.** Statistics are computed in Python over an in-memory snapshot of the corpus
(1,053 studies), exactly as the Streamlit edition did over pandas frames; the tests check the
port against the thesis figures (39 ranked countries, average readiness 5.4, South Africa 9.8,
Ghana 8.8, 35 % African-led whole energy-system studies, HOMER 512 studies).

## D-04 · 2026-10-12 · decided · Supabase as the managed PostgreSQL, not as the auth provider

**Decision.** `DATABASE_URL` points at Supabase (or any PostgreSQL); the API creates the schema
and seeds it. Accounts, sessions and roles stay in the API (argon2 passwords, magic links, roles
contributor / curator / admin; `ADMIN_EMAILS` bootstraps the first administrators).

**Why.** "Passer à Supabase" in the owner's notes meant the hosted database (the comment in
`build_database.py` says so). Keeping authentication in the API lets the whole stack run with
SQLite on a laptop, in docker compose, or on Supabase without a code change.

**Consequences.** Supabase Auth can be added later by verifying its JWTs in `deps.py`
(`docs/supabase.md`). `supabase/schema.sql` is generated from the models for people who prefer
creating tables in the SQL editor.

## D-05 · 2026-10-12 · decided · Nothing enters the inventory without a curator

**Decision.** Visitors, Krinea exports, survey responses and the discovery pipeline all produce
*contributions* (pending proposals). Approval by a curator creates the record, its links, its
power pools and recomputes counters; rejection keeps a note. Proposals are validated
(enumerations, countries resolved from names or codes, DOI normalised) and checked for
duplicates (DOI, exact or near-identical title) at submission.

**Why.** The thesis's guarantee is that every record was verified by a person; the hub must not
weaken it while opening the inventory to the community.

**Consequences.** Studies carry a `source` (review, contribution, krinea, survey, discovery)
shown on every card. Corrections are recorded and applied by curators through the edit
endpoints (`PATCH /admin/studies/{id}`, `PATCH /admin/tools/{name}`).

## D-06 · 2026-10-12 · decided · Discovery re-runs the review's own search on OpenAlex

**Decision.** `services/openalex.py` rebuilds the four Boolean blocks of Appendix C (energy
vocabulary, geography, methods, named instruments) as `title_and_abstract.search` filters, the
geography block in chunks of twelve terms, with publication-date bounds; `since` mode continues
from the last run, `full` mode sweeps from 2000 to find forgotten studies. Matches against the
corpus use DOI, normalised title and a fuzzy title (rapidfuzz ≥ 92, same year ± 1). Candidates
are screened in the hub, exported as RIS to Krinea, or turned into pending contributions.

**Why.** The thesis asks for a periodic re-run of the protocol; OpenAlex is the open arm of the
original search (Scopus requires an institutional licence). Delegating full-text screening and
extraction to Krinea avoids rebuilding what it already does.

**Consequences.** Scopus is not re-queried. OpenAlex applies stemming, so the truncated Scopus
terms are written out. Tests use a mocked OpenAlex transport; the sandbox used to build this
could not reach api.openalex.org, so the live query shapes should be checked on first run
(`Curation → Discovery → Run`, or `python -m enermod_api.manage discover --since 2026-05-05`).

## D-07 · 2026-10-12 · decided · Tool tracker: literature use plus repository activity

**Decision.** For every tool the hub shows studies per year (sparkline), countries, co-used
tools and leadership; for open tools with a `repo_url` it stores a snapshot of GitHub stars,
forks, open issues, contributors and last commit (`tool_metrics`), refreshed monthly by the
worker when `METRICS_AUTO` is on. Twenty-seven repositories are pre-filled in
`enermod_api/data/tool_repos.json`; curators edit the rest. The `tracker_url` column is kept
but is not shown on the site.

**Why.** The owner asked to follow how each tool is used in the literature and how actively its
code is maintained. The hub's distinctive contribution is the applied record in Africa;
repository metrics complete it. The site does not cite other trackers (2026-10-13).

**Consequences.** GitHub only (GitLab repositories return an error and no snapshot). Site usage
(tool views, recommender runs, assistant questions) is recorded separately as events.

## D-08 · 2026-10-12 · decided · Assistant: retrieval-grounded, provider-agnostic, cited

**Decision.** The assistant builds its context from the inventory (headline statistics, matching
tool profiles, country records, studies by keyword, tool or country), instructs the model to
answer only from it and to cite `[study 123]`, `[tool HOMER]`, `[country KE]`; the API turns
citations into links. Providers: Anthropic (default `claude-opus-5-5`, effort `low`, server-side
refusal fallback enabled), Google Gemini (`gemini-2.5-flash`, the model of the Streamlit
edition), DeepSeek. `AI_PROVIDER=auto` picks the first configured key. Questions and answers are
logged for curators; a per-visitor rate limit applies.

**Why.** The Streamlit assistant only saw the tools sheet; curators asked for country and study
questions. Citations make the answers checkable, which matters more than fluency here.

**Consequences.** Model identifiers are configurable (`AI_MODEL`); the Anthropic call uses the
beta `fallbacks="default"` parameter and falls back to the plain call on older SDKs. The chat
is not streamed (answers are short by instruction).

## D-09 · 2026-10-12 · decided · Privacy-friendly usage analytics

**Decision.** The web app posts events (`page_view`, `tool_view`, `study_view`, `country_view`,
`recommend`, `chat`, `download`, `contribute`, `search`) with a daily rotating hash of network
address and user agent, no cookie, no IP stored; Do Not Track and Global Privacy Control are
honoured. Curators see aggregates; the Tools page shows the most consulted tools (30 days).

**Why.** Knowing which tools and countries people look up is part of the observatory's own
evidence (the owner asked to follow usage); third-party analytics would contradict the privacy
page.

## D-10 · 2026-10-12 · decided · English code and documentation, bilingual site

**Decision.** Code, comments, commits and docs in English. Every interface string lives in
`messages/en.json` and `messages/fr.json` (908 keys each, compared by a script); reading pages
in `content/<locale>/*.md`; enumerated codes of the inventory are translated through a `labels`
namespace; the assistant answers in the user's language.

**Why.** Owner's instruction ("faire une version française du site aussi"); AISESA works in both
languages.

**Consequences.** Adding a language = one JSON file, five Markdown files and an entry in
`src/i18n/routing.ts`. A missing key throws in development, so both files must stay in sync.

## D-11 · 2026-10-12 · decided · Licences

**Decision.** Code GPL-3.0 (the licence of `Enermod_Africa`, kept); inventory data CC BY 4.0;
PRISMA diagram CC BY 4.0.

**Why.** Continuity with the original repository; CC BY for data is what the thesis implies for
a public observatory.

## D-12 · 2026-10-12 · decided · One code path for SQLite and PostgreSQL

**Decision.** The API must behave identically on SQLite (development, tests) and PostgreSQL
(Supabase, Render, docker compose). Portable SQL only (`func.date` rather than `substr` on a
timestamp), explicit tie-breakers in every ranking, and after a seed on PostgreSQL the id
sequences are aligned with the seeded ids (`seed.sync_sequences`). The test suite runs on
PostgreSQL when `TEST_DATABASE_URL` is set.

**Why.** The first run of the suite on PostgreSQL 16 failed on the analytics query and showed
that seeded ids left the `studies` sequence at 1. Checked afterwards: 33 tests pass on both
engines and the public endpoints return the same figures (`docs/supabase.md`, section 6).

**Consequences.** Any new query must be written with both engines in mind; running the suite
once against PostgreSQL before a release is part of the checks in `docs/deploy.md`.

## D-13 · 2026-10-13 · decided · AISESA runs the observatory

**Decision.** The site presents EnerMod Africa as an AISESA Cluster 1 activity, in the present
tense (header, footer, About, legal notice, structured data, assistant). MINES Paris-PSL (CMA,
The Transition Institute 1.5) is credited, in the past tense, for the initial review and the
first version of the platform; its logo stays next to AISESA's.

**Why.** The owner hands the observatory over to AISESA; "hosted at MINES Paris-PSL" described
the mission, not who runs the site.

## D-14 · 2026-10-20 · decided · Password recovery through the one-time link; Google sign-in

**Decision.** "Forgot your password?" mails the same one-time link as the e-mail sign-in,
with a reset wording and a `next` that lands on `/account/password`, where the signed-in
person chooses a new password (the other sessions are closed). The answer is identical
whether or not the address has an account. "Continue with Google" is a server-side OpenID
Connect flow in the API (`/auth/google/start`, `/auth/google/callback` behind the web proxy):
a signed, time-limited `state` plus a nonce cookie, only verified Google e-mails, the same
`users` row as the password account with that e-mail. A `manage.py set-password` command
covers the owner without an e-mail provider.

**Why.** The lost-password case came up before any e-mail provider was configured. Reusing
`login_tokens` avoids a schema change on the live Supabase database; Google covers people who
never set a password and is the sign-in most AISESA members already have. Supabase Auth and
ORCID (P-02) stay proposed: they would move sessions out of the API for little gain today.

## Proposed (waiting for the owner)

- **P-01** Scopus re-query through an institutional API key, as a second discovery arm.
- **P-02** ORCID sign-in (and Supabase Auth, if sessions ever leave the API) once the community
  of curators is set up; Google sign-in is done (D-14).
- **P-03** Scheduled e-mail digest to curators (pending contributions, new candidates).
- **P-04** A corpus-based national modelling capacity index (share of African-led, nationally
  scoped studies) published as a score next to readiness, per the thesis perspectives.
- **P-05** Streaming assistant answers and a per-page "ask about this country/tool" entry point.
