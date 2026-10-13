# EnerMod Africa: the African Energy Modelling Observatory

EnerMod Africa is an open observatory of energy modelling studies applied to African countries,
the tools they use and the institutions that lead them. Its initial step was a PRISMA 2020
systematic review (searches run on 5 May 2026: 1,053 studies, 101 tools); since then the
inventory is kept up to date through community contributions, an automated literature search
and curator review. This repository holds the second edition: a bilingual web platform
(English and French) with an API and open data. The first edition (Streamlit) is kept under
`legacy/streamlit/`.

*Version française en bas de page.*

```
apps/web        Next.js 16: institutional pages, observatory (map, gaps, readiness, studies,
                tools, countries, recommender), contribution form, assistant, curation area
apps/api        FastAPI + SQLAlchemy: data, scores, recommender, auth and roles, contributions,
                OpenAlex discovery, Krinea and survey imports, tool metrics, usage events, chat
data/           enermod.db (seed), Models_Africa_v2.xlsm (master workbook), authorship_openalex.xlsx
legacy/         the original Streamlit observatory (thesis Appendix F)
docs/           decision log, Supabase, Krinea integration, deployment
supabase/       PostgreSQL schema generated from the models
```

## Run it

```bash
# terminal 1: the API (Python 3.11+; SQLite by default, seeded from data/enermod.db on first start)
cd apps/api && pip install -e ".[ai,dev]" && uvicorn enermod_api.main:app --reload --port 8000
# terminal 2: the web app (every figure comes from the API, so start it first)
cd apps/web && pnpm install && pnpm dev                                              # :3000
```

If the pages show no figures, open http://localhost:3000/api/health: the proxy must answer
`{"ok":true}`; otherwise the API is not running where `API_URL` points (`apps/web/README.md`).

Full stack with Docker: `cp .env.example .env && docker compose up --build`. Supabase as the
database: `docs/supabase.md`. Render, Docker hosts and troubleshooting: `docs/deploy.md`.

Sign in with an e-mail listed in `ADMIN_EMAILS` to reach the curation area at `/admin`.

## What the hub does

- **Observatory.** Every page of the Streamlit edition, re-built: interactive maps of studies,
  tools, gap and readiness scores per country; gap analysis (African-specific features,
  leadership, financing assumptions); readiness ranking; the full inventory with faceted filters
  and a page per study, tool and country; the tool recommender with its score breakdown; CSV,
  JSON and zip exports. Scores and figures are those of the thesis (tests check them).
- **Contributions.** Visitors propose studies, corrections and tools; curators verify, edit and
  approve; approved studies enter the inventory with their source marked.
- **Discovery.** The review's OpenAlex search strategy re-runs on demand or weekly, matches
  results against the corpus (DOI, title, fuzzy title) and queues candidates; relevant ones go
  to [Krinea](https://krinea.org) as RIS for screening and 51-field extraction, and come back as
  contributions through an import. Survey responses (CSV URL) feed the same queue.
- **Tool tracker.** Studies per year per tool, co-use, countries, and monthly GitHub metrics
  (stars, forks, issues, contributors, last commit) for open tools.
- **Assistant.** Answers only from the inventory, cites studies, tools and countries with links;
  Anthropic, Gemini or DeepSeek, whichever key is configured.
- **Usage.** Privacy-friendly events (no cookies, no IP) and a curators' dashboard.

## Tests and checks

```bash
cd apps/api && python -m pytest -q      # 33 tests: thesis figures, API, auth, contributions, discovery (mocked), imports, chat (stubbed), metrics
cd apps/web && pnpm lint && pnpm build
```

## Licence

Code GPL-3.0 (`LICENSE`). Inventory data CC BY 4.0. PRISMA 2020 flow diagram CC BY 4.0
(prisma-statement.org). An AISESA Cluster 1 activity hosted by the Centre de Mathématiques
Appliquées of MINES Paris-PSL (The Transition Institute 1.5).

---

## Version française

EnerMod Africa est un observatoire ouvert des études de modélisation énergétique appliquées aux
pays africains, des outils qu'elles utilisent et des institutions qui les mènent. Son étape
initiale a été une revue systématique PRISMA 2020 (recherches du 5 mai 2026 : 1 053 études,
101 outils) ; depuis, l'inventaire est tenu à jour grâce aux contributions de la communauté, à
une recherche bibliographique automatisée et à la vérification des curateurs. Ce dépôt contient
la seconde édition : une plateforme web bilingue (français, anglais) avec une API et des données
ouvertes. La première édition (Streamlit) est conservée dans `legacy/streamlit/`.

- **Observatoire** : cartes interactives, analyse des lacunes, préparation des pays, inventaire
  complet filtrable avec une page par étude, outil et pays, recommandeur d'outils, exports.
- **Contributions** : les visiteurs proposent des études, corrections et outils ; les curateurs
  vérifient et approuvent ; rien n'entre dans l'inventaire sans vérification.
- **Découverte** : la stratégie de recherche OpenAlex de la revue est relancée à la demande ou
  chaque semaine ; les candidats pertinents passent dans Krinea (tri, extraction en 51 champs)
  puis reviennent comme contributions. Les réponses au sondage alimentent la même file.
- **Suivi des outils** : usage dans la littérature et métriques GitHub mensuelles.
- **Assistant** : répond à partir du seul inventaire et cite ses sources.
- **Supabase** : la base PostgreSQL managée ; `docs/supabase.md`. Docker : `docker compose up`.

Journal des décisions : `docs/decisions.md`. Intégration Krinea : `docs/krinea-integration.md`.
