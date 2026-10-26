"""OpenAlex client for the discovery pipeline.

The query reproduces the four blocks of the review's search strategy (thesis Appendix C):
energy vocabulary AND geography AND modelling methods AND named instruments, on titles and
abstracts. OpenAlex applies stemming, so the truncated forms of the Scopus string
(optimi*) are written out. The geography block is sent in chunks to keep URLs short.

OpenAlex meters requests in daily credits. Without an API key the budget is tiny and shared
by every site behind the same outgoing IP address (on a cloud host it is spent before the
first page), and cursor paging is refused outright. A key is free
(https://openalex.org/settings/api-key) and comes with its own budget; it travels in the
Authorization header, never in a URL or a log line.
"""
from __future__ import annotations

import datetime as dt
import logging
import time
from collections.abc import Iterator

import httpx

from enermod_api.services.biblio import clean_doi

log = logging.getLogger("enermod.openalex")
API = "https://api.openalex.org/works"
KEY_PAGE = "https://openalex.org/settings/api-key"
RETRY_BURST_SECONDS = 10         # a Retry-After this short is the per-second limit: wait and try again
RETRIES = 3

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


class OpenAlexError(Exception):
    """A refusal by OpenAlex, worded for the curation page (status, cause, what to do; no URL)."""


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


def _api_message(r: httpx.Response) -> str:
    try:
        body = r.json()
        return str(body.get("message") or body.get("error") or "")[:300]
    except ValueError:
        return ""


def _hours_until_reset(r: httpx.Response) -> str:
    raw = r.headers.get("x-ratelimit-reset") or r.headers.get("retry-after") or ""
    try:
        seconds = int(float(raw))
    except ValueError:
        return ""
    return f" (resets in about {max(1, round(seconds / 3600))} h)" if seconds > RETRY_BURST_SECONDS else ""


class OpenAlexClient:
    def __init__(self, mailto: str = "", client: httpx.Client | None = None, per_page: int = 200,
                 api_key: str = "", pause: float = 0.15, sleep=time.sleep):
        self.mailto = mailto
        self.api_key = api_key
        self.pause = pause          # between pages, well under the per-second limit
        self.sleep = sleep
        headers = {"User-Agent": "EnerMod-Africa-hub/0.1" + (f" (mailto:{mailto})" if mailto else "")}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        self.client = client or httpx.Client(timeout=60, headers=headers)
        if client is not None:
            client.headers.update(headers)
        self.per_page = per_page

    def _get(self, url: str, params: dict) -> httpx.Response:
        """One request, with OpenAlex's refusals turned into readable errors."""
        if self.mailto:
            params = {**params, "mailto": self.mailto}
        for attempt in range(RETRIES + 1):
            r = self.client.get(url, params=params)
            if r.status_code == 429:
                raw = r.headers.get("retry-after", "")
                wait = float(raw) if raw.replace(".", "", 1).isdigit() else RETRY_BURST_SECONDS + 1
                if wait <= RETRY_BURST_SECONDS and attempt < RETRIES:
                    self.sleep(wait or 1)
                    continue
                if self.api_key:
                    raise OpenAlexError("OpenAlex: the daily budget of the API key is used up" + _hours_until_reset(r)
                                        + ". Run again tomorrow, or raise the budget on the OpenAlex account.")
                raise OpenAlexError("OpenAlex: no API key is configured, and the small free budget shared by every site "
                                    "behind this server's address is used up" + _hours_until_reset(r)
                                    + f". Set OPENALEX_API_KEY (keys are free: {KEY_PAGE}).")
            if r.status_code in (401, 403):
                what = "refused the API key" if self.api_key else "now requires an API key"
                raise OpenAlexError(f"OpenAlex {what}. Set OPENALEX_API_KEY on the API and the worker "
                                    f"(keys are free: {KEY_PAGE}). {_api_message(r)}".strip())
            if r.status_code >= 400:
                raise OpenAlexError(f"OpenAlex answered {r.status_code}. {_api_message(r)}".strip())
            return r
        raise OpenAlexError("OpenAlex kept answering 429 (too many requests); try again in a few minutes.")

    def search(self, query: str, from_date: str | None = None, to_date: str | None = None,
               max_pages: int = 25) -> Iterator[dict]:
        filters = [f"title_and_abstract.search:{query}"]
        if from_date:
            filters.append(f"from_publication_date:{from_date}")
        if to_date:
            filters.append(f"to_publication_date:{to_date}")
        cursor = "*"
        for page in range(max_pages):
            if page and self.pause:
                self.sleep(self.pause)
            params = {"filter": ",".join(filters), "per-page": self.per_page, "cursor": cursor, "select": SELECT}
            data = self._get(API, params).json()
            for w in data.get("results", []):
                yield normalize_work(w)
            cursor = (data.get("meta") or {}).get("next_cursor")
            if not cursor or not data.get("results"):
                break

    def by_doi(self, doi: str) -> dict | None:
        doi = clean_doi(doi)
        if not doi:
            return None
        r = self.client.get(f"{API}/https://doi.org/{doi}", params={"select": SELECT, **({"mailto": self.mailto} if self.mailto else {})})
        if r.status_code == 404:
            return None
        if r.status_code >= 400:
            raise OpenAlexError(f"OpenAlex answered {r.status_code}. {_api_message(r)}".strip())
        return normalize_work(r.json())


def default_since(last: str | None, from_year: int) -> str:
    if last:
        return last
    return f"{from_year}-01-01"


def today() -> str:
    return dt.date.today().isoformat()
