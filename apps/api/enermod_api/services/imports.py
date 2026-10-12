"""Bulk sources of study proposals: Krinea extraction exports and survey responses.

Both produce study payloads (the 51 fields of the extraction schema, plus tools and
countries) that become pending contributions, so a curator always has the last word.
"""
from __future__ import annotations

import io
import re

import httpx

from enermod_api import models
from enermod_api.services.data import s, tokens

STUDY_FIELDS = set(models.STUDY_TEXT_FIELDS) | {"year", "tools_used", "tool_categories", "countries"}
# Krinea exports keep the bibliographic record next to the extracted values
RECORD_ALIASES = {"title": "full_title", "doi": "link_doi", "url": "link_doi", "publication_year": "year",
                  "tools_used": "tools", "tools": "tools"}
SURVEY_GUESSES = {
    "full_title": ["title", "titre", "study", "étude", "etude", "publication"],
    "link_doi": ["doi", "link", "url", "lien"],
    "year": ["year", "année", "annee", "date"],
    "authors": ["author", "auteur"],
    "tools": ["tool", "outil", "model", "modèle", "modele", "logiciel", "software"],
    "countries": ["countr", "pays"],
    "study_objective": ["objective", "objectif", "summary", "résumé", "resume", "description", "abstract"],
    "submitter_email": ["email", "e-mail", "courriel", "mail"],
    "submitter_name": ["name", "nom", "respondent"],
    "submitter_org": ["institution", "organisation", "organization", "affiliation"],
    "authors_affiliation": ["affiliation"],
}


def _read_table(data: bytes, filename: str, sheet_hint: str | None = None) -> list[dict]:
    import pandas as pd
    name = (filename or "").lower()
    if name.endswith((".xlsx", ".xlsm", ".xls")):
        xls = pd.ExcelFile(io.BytesIO(data))
        sheet = next((sh for sh in xls.sheet_names if sheet_hint and sh.lower() == sheet_hint), xls.sheet_names[0])
        df = xls.parse(sheet, dtype=str).fillna("")
    else:
        text = data.decode("utf-8-sig", errors="replace")
        sep = ";" if text.count(";") > text.count(",") and text.count(";") > text.count("\t") else ("\t" if text.count("\t") > text.count(",") else ",")
        df = pd.read_csv(io.StringIO(text), dtype=str, sep=sep, keep_default_na=False)
    df.columns = [str(c).strip() for c in df.columns]
    return [{k: (v.strip() if isinstance(v, str) else v) for k, v in rec.items()} for rec in df.to_dict(orient="records")]


def _norm_col(c: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(c).strip().lower()).strip("_")


def parse_krinea_export(data: bytes, filename: str) -> list[dict]:
    """Rows of a Krinea extraction export (values sheet) as study payloads."""
    rows = _read_table(data, filename, sheet_hint="values")
    payloads = []
    for row in rows:
        p: dict = {}
        # Extracted fields first; the bibliographic record columns (title, doi…) only fill the gaps.
        for pass_aliases in (False, True):
            for col, val in row.items():
                key = _norm_col(col)
                if pass_aliases:
                    if key not in RECORD_ALIASES:
                        continue
                    key = RECORD_ALIASES[key]
                elif key not in STUDY_FIELDS and key not in ("tools", "countries"):
                    continue
                if key == "year":
                    try:
                        val = int(str(val)[:4])
                    except (TypeError, ValueError):
                        val = None
                existing = p.get(key)
                if existing is not None and (isinstance(existing, int) or s(existing)):
                    continue
                p[key] = val
        if "tools_used" in p and "tools" not in p:
            p["tools"] = p.pop("tools_used")
        tools = tokens(p.get("tools"))
        if any(t.lower() == "none" for t in tools):
            continue                          # Krinea flags studies without an ESM tool with 'none'
        p["tools"] = tools
        p["countries"] = tokens(p.get("countries"))
        if s(p.get("full_title")):
            payloads.append(p)
    return payloads


def guess_mapping(columns: list[str]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for field, hints in SURVEY_GUESSES.items():
        for col in columns:
            low = col.lower()
            if any(h in low for h in hints) and col not in mapping.values():
                mapping[field] = col
                break
    return mapping


def parse_survey(data: bytes, filename: str, mapping: dict | None = None) -> tuple[list[dict], dict]:
    """Survey responses (CSV or Excel) as study payloads plus submitter details.
    `mapping` maps payload fields to column headers; missing entries are guessed."""
    rows = _read_table(data, filename)
    if not rows:
        return [], {}
    columns = list(rows[0].keys())
    mapping = {**guess_mapping(columns), **{k: v for k, v in (mapping or {}).items() if v in columns}}
    payloads = []
    for row in rows:
        p = {field: row.get(col, "") for field, col in mapping.items()}
        if not s(p.get("full_title")) and not s(p.get("link_doi")):
            continue
        if s(p.get("year")):
            m = re.search(r"(19|20)\d{2}", str(p["year"]))
            p["year"] = int(m.group(0)) if m else None
        p["tools"] = tokens(p.get("tools"))
        p["countries"] = tokens(p.get("countries"))
        payloads.append(p)
    return payloads, mapping


def fetch_survey_csv(url: str, client: httpx.Client | None = None) -> bytes:
    client = client or httpx.Client(timeout=60, follow_redirects=True)
    r = client.get(url)
    r.raise_for_status()
    return r.content
