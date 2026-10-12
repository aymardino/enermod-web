# Keeping the review alive with Krinea

[Krinea](https://krinea.org) is the open-source systematic review workbench that grew out of
the extraction tool built for the EnerMod review (import, deduplication, screening, AI-assisted
extraction with a verbatim quote per field, PRISMA 2020). The hub and Krinea split the work:

```
OpenAlex ──discovery──▶ hub candidates ──RIS──▶ Krinea review ──extraction export──▶ hub contributions ──approve──▶ inventory
                              ▲                                                            ▲
                       survey responses                                        contribution form (visitors)
```

## 1. Find candidates

**Curation → Discovery → Run.** The hub re-runs the review's OpenAlex search strategy (the four
Boolean blocks of the thesis, Appendix C, on titles and abstracts): either since the last run
(new publications) or as a full sweep from 2000 (publications the original search may have
missed). Works already in the corpus are recognised by DOI, exact title or a near-identical
title with the same year (rapidfuzz ratio ≥ 92) and parked under *Already in corpus*. The rest
wait under *To screen*. Set `OPENALEX_MAILTO` so the requests join OpenAlex's polite pool, and
`DISCOVERY_AUTO=true` for the worker to run it every `DISCOVERY_INTERVAL_DAYS`.

## 2. Screen in the hub, extract in Krinea

Mark each candidate *Relevant* or *Irrelevant* on title and abstract (the eligibility criteria
are on the Methodology page). Then **Export relevant as RIS** and import the file into a Krinea
review whose extraction form is the 51-field energy template (shipped with Krinea as
`energy_template.json`; the field names are exactly the columns of the hub's `studies` table).
Run full-text screening and extraction there, verify each record against the PDF.

Small batches, or a single study, can skip Krinea: **To contributions** turns a candidate into a
pending contribution pre-filled with the bibliographic record, to be completed by hand.

## 3. Bring the records back

Export Krinea's verified extractions (CSV or Excel, the *values* sheet) and upload the file at
**Curation → Imports → Krinea extraction export**. Each row becomes a *pending* contribution
with `source = krinea`; rows whose `tools_used` is `none` (Krinea's flag for studies without an
energy-system-modelling tool) are skipped. Column names are matched case-insensitively; the
record columns of the export (`title`, `doi`, `year`) only fill the gaps left by the extracted
fields.

## 4. Approve

**Curation → Contributions.** The hub validates enumerations, resolves country names or ISO
codes, flags possible duplicates and lists what is missing. Approving creates the study, its
tool and country links, derives the power pools from the countries, creates minimal tool
profiles for tools not yet in the inventory, and recomputes the counters. The study appears
immediately with its source marked *Krinea extraction*; the corpus snapshot and every statistic
refresh.

## Survey responses

`SURVEY_CSV_URL` (a published Google Sheet CSV works) with `SURVEY_FIELD_MAP` (payload field →
column header; unknown columns are guessed from their names) feeds responses of the validation
survey into the same contribution queue, with the respondent's name, e-mail and institution.
Run it from **Imports → Sync** or let the worker do it.

## Keeping the workbook as a source of truth

Curators who prefer editing the master workbook can keep doing so: `python -m enermod_api.seed
--workbook data/Models_Africa_v2.xlsm --reset` reloads the observatory tables from it. Export the
hub-born studies first (`/export/studies.csv`) if they have not been carried into the workbook.
