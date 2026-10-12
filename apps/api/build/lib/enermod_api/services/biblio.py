"""Bibliographic helpers: DOI and title normalisation, RIS and CSV writers.

Small, dependency-free versions of what krinea_core.biblio and krinea_core.dedup provide
(MIT), so the hub can hand candidates to Krinea (RIS) and recognise studies it already has.
"""
from __future__ import annotations

import csv
import io
import re
import unicodedata

_DOI_RE = re.compile(r"10\.\d{4,9}/[^\s\"'<>]+", re.I)


def clean_doi(value) -> str:
    """Bare, lower-case DOI from any string (URL, 'doi:' prefix, free text); '' when none."""
    m = _DOI_RE.search(str(value or ""))
    if not m:
        return ""
    doi = m.group(0).rstrip(".,;:")
    while doi.endswith(")") and doi.count("(") < doi.count(")"):
        doi = doi[:-1]
    return doi.lower()


def strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", str(text or "")) if not unicodedata.combining(c))


def norm_title(title) -> str:
    t = strip_accents(str(title or "")).lower()
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return " ".join(t.split())


def first_author_key(authors) -> str:
    first = re.split(r";|,|\band\b", str(authors or ""), maxsplit=1)[0].strip()
    parts = first.split()
    if not parts:
        return ""
    if len(parts) > 1 and re.fullmatch(r"(?:[A-Z]\.?)+", parts[-1]):
        return norm_title(parts[0])
    return norm_title(parts[-1])


def similarity(a: str, b: str) -> float:
    try:
        from rapidfuzz import fuzz
        return float(fuzz.ratio(a, b))
    except ImportError:          # pragma: no cover
        import difflib
        return difflib.SequenceMatcher(None, a, b).ratio() * 100.0


_RIS_TYPES = {"article": "JOUR", "journal-article": "JOUR", "book-chapter": "CHAP", "book": "BOOK",
              "dissertation": "THES", "report": "RPRT", "proceedings-article": "CONF", "preprint": "UNPB"}


def write_ris(records: list[dict]) -> str:
    """RIS text for a list of records (title, authors, year, doi, url, abstract, venue, type)."""
    out = []
    for r in records:
        out.append(f"TY  - {_RIS_TYPES.get(str(r.get('type') or '').lower(), 'JOUR')}")
        if r.get("title"):
            out.append(f"TI  - {r['title']}")
        for a in [x.strip() for x in str(r.get("authors") or "").split(";") if x.strip()]:
            out.append(f"AU  - {a}")
        if r.get("year"):
            out.append(f"PY  - {r['year']}")
        if r.get("venue"):
            out.append(f"JO  - {r['venue']}")
        if r.get("abstract"):
            out.append(f"AB  - {r['abstract']}")
        if r.get("doi"):
            out.append(f"DO  - {r['doi']}")
        if r.get("url"):
            out.append(f"UR  - {r['url']}")
        if r.get("openalex_id"):
            out.append(f"ID  - {r['openalex_id']}")
        out.append("DB  - EnerMod Africa discovery (OpenAlex)")
        out.append("ER  - ")
        out.append("")
    return "\n".join(out)


def write_csv(rows: list[dict], columns: list[str] | None = None) -> str:
    if not rows:
        return ",".join(columns or []) + "\n"
    columns = columns or list(rows[0].keys())
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=columns, extrasaction="ignore")
    w.writeheader()
    for r in rows:
        w.writerow({k: ("; ".join(map(str, v)) if isinstance(v, (list, tuple)) else ("" if v is None else v))
                    for k, v in r.items() if k in columns})
    return buf.getvalue()
