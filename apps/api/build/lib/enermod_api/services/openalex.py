"""OpenAlex client for the discovery pipeline.

The query reproduces the four blocks of the review's search strategy (thesis Appendix C):
energy vocabulary AND geography AND modelling methods AND named instruments, on titles and
abstracts. OpenAlex applies stemming, so the truncated forms of the Scopus string
(optimi*) are written out. The geography block is sent in chunks to keep URLs short.
"""
from __future__ import annotations

import datetime as dt
import logging
from collections.abc import Iterator

import httpx

from enermod_api.services.biblio import clean_doi

log = logging.getLogger("enermod.openalex")
API = "https://api.openalex.org/works"

ENERGY_TERMS = ["energy system", "electricity", "power system", "renewable energy", "grid", "energy planning",
                "energy transition", "energy access", "energy model", "energy modelling", "energy mix", "energy supply"]
GEO_TERMS = ["Africa", "Sub-Saharan", "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde",
             "Cape Verde", "Cameroon", "Central African Republic", "Chad", "Comoros", "Democratic Republic of the Congo",
             "Congo", "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Swaziland", "Ethiopia", "Gabon",
             "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Ivory Coast", "Cote d'Ivoire", "Kenya", "Lesotho", "Liberia",
             "Libya", "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia",
             "Niger", "Nigeria", "Rwanda", "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone", "Somalia",
             "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe"]
METHOD_TERMS = ["scenario", "optimization", "optimisation", "simulation", "model", "dispatch", "optimal", "network",
                "modeling", "mitigation", "emission", "bottom-up", "top-down", "MILP", "linear programming", "least-cost",
                "techno-economic", "capacity expansion", "generation mix", "LCOE"]
TOOL_TERMS = ["tool", "software", "LEAP", "OSeMOSYS", "TIMES", "MARKAL", "TIAM", "Balmorel", "Calliope", "PyPSA", "SPLAT",
              "MESSAGE", "FlexTool", "Dispa-SET", "GIS", "MCDM", "OnSSET", "system dynamics", "Vensim", "clicSAND",
              "SWITCH", "QGIS", "ArcGIS", "HOMER", "NECAL2050", "CERC", "Temoa", "EnergyPLAN", "RETScreen", "PLEXOS", "NEMO"]
SELECT = ("id,doi,title,display_name,publication_year,publication_date,authorships,primary_location,open_access,"
          "abstract_inverted_index,cited_by_count,type,language")


def _block(terms: list[str]) -> str:
    return " OR ".join(f'"{t}"' if " " in t or "-" in t or "'" in t else t for t in terms)


def build_queries(geo_chunk: int = 12) -> list[str]:
    """One boolean expression per geography chunk, all four blocks combined with AND."""
    energy, method, tool = _block(ENERGY_TERMS), _block(METHOD_TERMS), _block(TOOL_TERMS)
    out = []
    for i in range(0, len(GEO_TERMS), geo_chunk):
        geo = _block(GEO_TERMS[i:i + geo_chunk])
        out.append(f"({energy}) AND ({geo}) AND ({method}) AND ({tool})")
    return out


def reconstruct_abstract(inv: dict | None) -> str:
    if not inv:
        return ""
    positions = []
    for word, idxs in inv.items():
        for i in idxs:
            positions.append((i, word))
    positions.sort()
    return " ".join(w for _, w in positions)[:6000]


def normalize_work(w: dict) -> dict:
    authors = "; ".join(a.get("author", {}).get("display_name", "") for a in (w.get("authorships") or [])
                        if a.get("author", {}).get("display_name"))
    loc = w.get("primary_location") or {}
    source = (loc.get("source") or {}).get("display_name", "")
    oa = w.get("open_access") or {}
    return {
        "openalex_id": (w.get("id") or "").replace("https://openalex.org/", ""),
        "doi": clean_doi(w.get("doi") or ""),
        "title": (w.get("title") or w.get("display_name") or "").strip(),
        "abstract": reconstruct_abstract(w.get("abstract_inverted_index")),
        "authors": authors[:2000],
        "year": w.get("publication_year"),
        "venue": source,
        "url": loc.get("landing_page_url") or (w.get("doi") or ""),
        "oa_url": oa.get("oa_url") or "",
        "cited_by": int(w.get("cited_by_count") or 0),
        "type": w.get("type") or "",
        "language": w.get("language") or "",
    }


class OpenAlexClient:
    def __init__(self, mailto: str = "", client: httpx.Client | None = None, per_page: int = 200):
        self.mailto = mailto
        self.client = client or httpx.Client(timeout=60, headers={"User-Agent": "EnerMod-Africa-hub/0.1"})
        self.per_page = per_page

    def search(self, query: str, from_date: str | None = None, to_date: str | None = None,
               max_pages: int = 25) -> Iterator[dict]:
        filters = [f"title_and_abstract.search:{query}"]
        if from_date:
            filters.append(f"from_publication_date:{from_date}")
        if to_date:
            filters.append(f"to_publication_date:{to_date}")
        cursor = "*"
        for _ in range(max_pages):
            params = {"filter": ",".join(filters), "per-page": self.per_page, "cursor": cursor, "select": SELECT}
            if self.mailto:
                params["mailto"] = self.mailto
            r = self.client.get(API, params=params)
            r.raise_for_status()
            data = r.json()
            for w in data.get("results", []):
                yield normalize_work(w)
            cursor = (data.get("meta") or {}).get("next_cursor")
            if not cursor or not data.get("results"):
                break

    def by_doi(self, doi: str) -> dict | None:
        doi = clean_doi(doi)
        if not doi:
            return None
        params = {"select": SELECT}
        if self.mailto:
            params["mailto"] = self.mailto
        r = self.client.get(f"{API}/https://doi.org/{doi}", params=params)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return normalize_work(r.json())


def default_since(last: str | None, from_year: int) -> str:
    if last:
        return last
    return f"{from_year}-01-01"


def today() -> str:
    return dt.date.today().isoformat()
