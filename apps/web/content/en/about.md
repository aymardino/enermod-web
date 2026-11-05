## Background

The **African Institute for Sustainable Energy and Systems Analysis (AISESA)** is an initiative that builds, within Africa, the knowledge and analytical capacity needed for evidence-based energy decisions. AISESA organises its research agenda in thematic clusters; the first cluster is devoted to clean energy pathways for sustainable development, and its opening activity (Activity 1) consists of mapping the energy modelling tools and analytical capacities that already exist across the continent. EnerMod Africa carries out this mapping and keeps it up to date.

The work was hosted at the **Centre de Mathématiques Appliquées (CMA) of MINES Paris-PSL** in Sophia Antipolis, within **The Transition Institute 1.5 (TTI.5)**, under the supervision of Prof. Nadia Maïzi, as the company mission of the Post-Graduate Master in Energy Systems Optimization (OSE). Coordination with the wider AISESA community ran throughout, in particular with the Cluster 1 coordination at Makerere University, and the results were presented at the 3rd AISESA Congress in Kampala in September 2026.

## The initial mission

The mission set out to establish who models the energy systems of African countries, with which tools, and what the models leave out. It produced three outputs:

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

To cite the observatory, its data or its code:

> Plakoo, K. A., & Maïzi, N. (2026). *EnerMod Africa: the African Energy Modelling Observatory* [Software and data]. Zenodo. [https://doi.org/10.5281/zenodo.23749375](https://doi.org/10.5281/zenodo.23749375)

This DOI covers every archived version and always leads to the latest one. Release 1.0.0 of 29 October 2026 also has its own DOI, [10.5281/zenodo.23749376](https://doi.org/10.5281/zenodo.23749376), for citing that exact state.

To cite the systematic review behind it:

> Plakoo, K. A. (2026). *Mapping energy modeling tools and analytical capacities across African countries: A systematic review and digital platform* [Professional thesis, Post-Graduate Master in Energy Systems Optimization (OSE)]. MINES Paris-PSL.

Data exports carry a CC BY 4.0 licence; the code is GPL-3.0 and available on [GitHub](https://github.com/aymardino/enermod-web). The platform's first edition, a Streamlit application published on this domain in 2026, is kept in a separate repository.
