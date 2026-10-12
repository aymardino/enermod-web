EnerMod Africa is designed as a research hub rather than a report: the inventory, the pipeline that feeds it and the people who maintain it are meant to outlive the mission that created them.

## Publications and outputs

- **Master thesis** (2026): *Who models Africa's energy future?* A PRISMA systematic review of 1,053 energy modelling studies applied to African countries, the extraction pipeline and this observatory. MINES Paris-PSL (OSE Master) for AISESA Cluster 1.
- **Perspective working paper** (Plakoo et al., 2026) on energy modelling approaches for African contexts, co-authored within the AISESA Cluster 1 community.
- **3rd AISESA Congress**, Kampala, September 2026: presentation of the completed review and of the observatory.
- **Krinea**: the extraction tool built for this review, now an open-source systematic review workbench (import, deduplication, screening, AI-assisted extraction with verbatim quotes, PRISMA 2020 reporting).

## Data and API {#data}

All inventory data is open (CC BY 4.0):

- [Studies (CSV)](/api/export/studies.csv), [studies (JSON)](/api/export/studies.json), [tools (CSV)](/api/export/tools.csv), [countries (CSV)](/api/export/countries.csv), or [everything as a zip](/api/export/all.zip) with the link tables;
- a read-only JSON API behind every page of the observatory: `/api/stats/overview`, `/api/studies?country=KE&tool=OSeMOSYS`, `/api/tools/HOMER`, `/api/countries/NG`, `/api/stats/gaps?level=full`, `/api/stats/readiness`, `POST /api/recommend`;
- the master workbook and the SQLite build used by the first edition remain in the repository under `data/`.

## How the inventory stays alive

A review is a snapshot dated by its search. Four mechanisms keep this one moving:

1. **Contributions.** Anyone can [propose a study, a correction or a tool](/contribute). Proposals are checked for duplicates (DOI, title) and wait in a curation queue; nothing is published without a curator's verification.
2. **Discovery.** The hub re-runs the review's OpenAlex search strategy (the same four Boolean blocks) at a configurable cadence, from the last run date or from 2000 for a full sweep that catches forgotten studies. Works already in the corpus are recognised by DOI or title; the rest become candidates that curators screen. Relevant candidates are exported as RIS and run through Krinea for full-text screening and 51-field extraction, then imported back as pending contributions.
3. **Survey.** The validation survey sent to modelling teams (Cluster 1 members first) is connected through a CSV feed; each response becomes a pending contribution with its submitter's details.
4. **Tool tracker.** For open tools with a known repository, the hub records a monthly snapshot of stars, forks, open issues, contributors and last commit, next to each tool's use in the African literature, in the spirit of the openmod tracker.

A usage layer records which pages, tools, countries and studies visitors consult, how often the recommender and the assistant are used, without storing any personal data.

## Roadmap

- Integrate the policy record (NDCs, CCDRs, national strategies) as a documented stream with its own provenance protocol.
- Publish a corpus-based index of national modelling capacity (share of African-led, nationally scoped studies per country).
- Yearly or biennial re-run of the full review protocol, turning the 2026 snapshot into a living review.
- Deeper integration with community tool trackers, so that the African applied record and the global tool ecosystem inform each other.

## Governance

The observatory is meant to be anchored in the AISESA community, with the Cluster 1 coordination as its natural home. Curators are appointed by the community; the code and the data remain open.
