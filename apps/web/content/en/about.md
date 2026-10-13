## Background

EnerMod Africa is the public face of a mission carried out within the **African Institute for Sustainable Energy and Systems Analysis (AISESA)**, an initiative designed to build, within Africa, the knowledge and analytical capacity needed for evidence-based energy decisions. AISESA organises its research agenda in thematic clusters; the first cluster is devoted to clean energy pathways for sustainable development, and its opening activity (Activity 1) consists of mapping the energy modelling tools and analytical capacities that already exist across the continent. This observatory delivers that activity.

The work was hosted at the **Centre de Mathématiques Appliquées (CMA) of MINES Paris-PSL** in Sophia Antipolis, within **The Transition Institute 1.5 (TTI.5)**, under the supervision of Prof. Nadia Maïzi, as the company mission of the Post-Graduate Master in Energy Systems Optimization (OSE). Coordination with the wider AISESA community ran throughout, in particular with the Cluster 1 coordination at Makerere University, and the results were presented at the 3rd AISESA Congress in Kampala in September 2026.

## One guiding question

*Who models Africa's energy future, with which tools, for which countries, and with what blind spots?*

Answering it took three deliverables:

1. a **PRISMA 2020 systematic review** of the published record, the initial step, with searches in OpenAlex and Scopus on 5 May 2026: 7,759 unique records screened, 1,452 full texts assessed, and an initial corpus of 1,053 studies (2001 to 2026) using 101 distinct tools;
2. an **AI-assisted extraction tool** that converts each document into a structured record of 51 fields, with every record verified by hand against the source text. That tool has since grown into [Krinea](https://krinea.org), an open-source systematic review workbench;
3. **this observatory**, through which planners, researchers and funders explore geographic coverage, thematic gaps, institutional readiness and the tools best suited to their context.

## What the hub adds

The first version of the observatory was a Streamlit application fed by a master workbook. This version turns it into a research hub that stays alive after the mission:

- every figure is served by an API from a relational database (PostgreSQL on Supabase, or SQLite), so the site, the data exports and the assistant read the same source of truth;
- **anyone can contribute**: propose a missing study, a correction or a tool profile. A curator verifies each proposal before it enters the inventory;
- a **discovery pipeline** re-runs the review's search strategy on OpenAlex to find new or missed studies, matches them against the corpus and hands the candidates to curators (and to Krinea for screening and extraction);
- a **tool tracker** shows each open tool's repository activity next to its use in the literature;
- a **grounded assistant** answers questions from the inventory only and cites the records it used;
- the whole site is available in **English and French**.

## Who is behind it

The mission was carried out by Kodjovi Aymard Plakoo (MINES Paris-PSL, OSE Master) for AISESA Cluster 1. The observatory is designed for handover to the AISESA community: keeping it current requires curation skills, not software engineering.

## How to cite

> Plakoo, K. A. (2026). *Who models Africa's energy future? A systematic review of energy modelling studies and tools applied to African countries, and the EnerMod Africa Observatory.* Master thesis, MINES Paris-PSL, for AISESA Cluster 1.

Data exports carry a CC BY 4.0 licence; the code is GPL-3.0 (observatory) and available on [GitHub](https://github.com/aymardino/enermod-web). The original Streamlit edition remains in the [Enermod_Africa](https://github.com/aymardino/Enermod_Africa) repository.
