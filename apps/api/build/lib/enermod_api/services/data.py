"""In-memory snapshot of the observatory ("the corpus").

The inventory is small (about a thousand studies, a hundred tools, 54 countries), so every
statistic is computed in Python over one snapshot built from the database, exactly as the
Streamlit edition did over pandas frames. The snapshot is rebuilt when the data version
changes (a study is added, a tool edited) or every few minutes.
"""
from __future__ import annotations

import re
import threading
import time
from dataclasses import dataclass, field

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from enermod_api import models

ISO2_TO_ISO3 = {
    "DZ": "DZA", "AO": "AGO", "BJ": "BEN", "BW": "BWA", "BF": "BFA", "BI": "BDI", "CV": "CPV", "CM": "CMR",
    "CF": "CAF", "TD": "TCD", "KM": "COM", "CD": "COD", "CG": "COG", "DJ": "DJI", "EG": "EGY", "GQ": "GNQ",
    "ER": "ERI", "SZ": "SWZ", "ET": "ETH", "GA": "GAB", "GM": "GMB", "GH": "GHA", "GN": "GIN", "GW": "GNB",
    "CI": "CIV", "KE": "KEN", "LS": "LSO", "LR": "LBR", "LY": "LBY", "MG": "MDG", "MW": "MWI", "ML": "MLI",
    "MR": "MRT", "MU": "MUS", "MA": "MAR", "MZ": "MOZ", "NA": "NAM", "NE": "NER", "NG": "NGA", "RW": "RWA",
    "ST": "STP", "SN": "SEN", "SC": "SYC", "SL": "SLE", "SO": "SOM", "ZA": "ZAF", "SS": "SSD", "SD": "SDN",
    "TZ": "TZA", "TG": "TGO", "TN": "TUN", "UG": "UGA", "ZM": "ZMB", "ZW": "ZWE", "RE": "REU",
}
AFRICAN_ISO2 = set(ISO2_TO_ISO3) - {"RE"}

TECH_FIELDS = ["solar", "wind", "hydro", "biomass", "nuclear", "geothermal", "fossil", "h2", "coal"]
FEATURE_FIELDS = ["informal_economy", "biomass_charcoal", "power_reliability", "urbanization"]
LEVELS = ["full", "light", "unspecified"]
_LEVEL_MAP = {"all": "full", "full": "full", "complete": "full", "light": "light", "partial": "light",
              "narrative": "light", "narrative_only": "light", "": "unspecified", "nan": "unspecified",
              "none": "unspecified"}
_ORIGIN_MAP = {"yes": "African-led", "partial": "Mixed", "no": "Non-African"}


def s(v) -> str:
    """Field value as a clean string; None and pandas-style NaN become ''."""
    v = "" if v is None else str(v).strip()
    return "" if v in ("nan", "NaN", "None") else v


def tokens(v) -> list[str]:
    """Split a multi-valued cell ('a, b; c') into tokens, order kept, duplicates dropped."""
    out, seen = [], set()
    for x in s(v).replace(";", ",").split(","):
        x = x.strip()
        if x and x.lower() not in seen:
            seen.add(x.lower())
            out.append(x)
    return out


def norm_level(v) -> str:
    k = s(v).lower()
    return _LEVEL_MAP.get(k, k or "unspecified")


def study_link(link_doi: str) -> str:
    link = s(link_doi)
    if re.match(r"^10\.\d{4,}", link):
        return "https://doi.org/" + link
    return link


def origin_class(local_ownership: str) -> str | None:
    return _ORIGIN_MAP.get(s(local_ownership).lower())


def to_dict(obj) -> dict:
    return {c.key: getattr(obj, c.key) for c in obj.__table__.columns}


@dataclass
class Corpus:
    studies: list[dict]
    tools: list[dict]
    countries: list[dict]
    pools: list[dict]
    by_id: dict[int, dict] = field(default_factory=dict)
    tools_by_name: dict[str, dict] = field(default_factory=dict)
    countries_by_iso: dict[str, dict] = field(default_factory=dict)
    version: tuple = ()
    built_at: float = 0.0

    def tool(self, name: str) -> dict | None:
        t = self.tools_by_name.get(name)
        if t is None:
            low = name.strip().lower()
            for k, v in self.tools_by_name.items():
                if k.lower() == low:
                    return v
        return t


_lock = threading.Lock()
_cache: dict[str, Corpus | None] = {"corpus": None}
TTL_SECONDS = 180


def _version(db: Session) -> tuple:
    n_studies, max_s = db.execute(select(func.count(models.Study.study_id), func.max(models.Study.updated_at))).one()
    n_tools, max_t = db.execute(select(func.count(models.Tool.tool_name), func.max(models.Tool.updated_at))).one()
    return (n_studies, str(max_s), n_tools, str(max_t))


def invalidate() -> None:
    with _lock:
        _cache["corpus"] = None


def build_corpus(db: Session) -> Corpus:
    studies_rows = db.scalars(select(models.Study).where(models.Study.status == "published")
                              .order_by(models.Study.study_id)).all()
    country_rows = db.scalars(select(models.Country).order_by(models.Country.country_name)).all()
    tool_rows = db.scalars(select(models.Tool).order_by(models.Tool.tool_name)).all()
    pool_rows = db.scalars(select(models.PowerPool)).all()
    sc = db.execute(select(models.StudyCountry.study_id, models.StudyCountry.iso_code)).all()
    st = db.execute(select(models.StudyTool.study_id, models.StudyTool.tool_name)).all()
    sp = db.execute(select(models.StudyPool.study_id, models.StudyPool.pool_code)).all()

    c_map: dict[int, list[str]] = {}
    for sid, iso in sc:
        c_map.setdefault(sid, []).append(iso)
    t_map: dict[int, list[str]] = {}
    for sid, name in st:
        t_map.setdefault(sid, []).append(name)
    p_map: dict[int, list[str]] = {}
    for sid, code in sp:
        p_map.setdefault(sid, []).append(code)

    countries = [to_dict(c) for c in country_rows]
    for c in countries:
        c["iso3"] = s(c.get("iso3")) or ISO2_TO_ISO3.get(c["iso_code"], "")
        c["electrification_rate"] = float(c["electrification_rate"] or 0.0)
    names = {c["iso_code"]: c["country_name"] for c in countries}

    studies = []
    for row in studies_rows:
        d = to_dict(row)
        sid = d["study_id"]
        d["countries"] = sorted(set(c_map.get(sid, [])))
        d["country_names"] = [names.get(i, i) for i in d["countries"]]
        d["tools"] = sorted(set(t_map.get(sid, [])))
        d["pools"] = sorted(set(p_map.get(sid, [])))
        d["link"] = study_link(d.get("link_doi"))
        d["level"] = norm_level(d.get("extraction_level"))
        d["origin_class"] = origin_class(d.get("local_ownership"))
        d["year"] = int(d["year"]) if d.get("year") is not None else None
        d["created_at"] = d["created_at"].isoformat() if d.get("created_at") else None
        d["updated_at"] = d["updated_at"].isoformat() if d.get("updated_at") else None
        studies.append(d)

    tools = []
    usage = {}
    for d in studies:
        for t in d["tools"]:
            usage[t] = usage.get(t, 0) + 1
    for row in tool_rows:
        d = to_dict(row)
        d["n_studies"] = usage.get(d["tool_name"], 0)
        d["updated_at"] = d["updated_at"].isoformat() if d.get("updated_at") else None
        tools.append(d)

    corpus = Corpus(studies=studies, tools=tools, countries=countries, pools=[to_dict(p) for p in pool_rows])
    corpus.by_id = {d["study_id"]: d for d in studies}
    corpus.tools_by_name = {t["tool_name"]: t for t in tools}
    corpus.countries_by_iso = {c["iso_code"]: c for c in countries}
    corpus.built_at = time.time()
    return corpus


def get_corpus(db: Session) -> Corpus:
    with _lock:
        c = _cache["corpus"]
        if c is not None and time.time() - c.built_at < TTL_SECONDS:
            return c
    version = _version(db)
    with _lock:
        c = _cache["corpus"]
        if c is not None and c.version == version:
            c.built_at = time.time()
            return c
    corpus = build_corpus(db)
    corpus.version = version
    # Derived country scores are attached once per snapshot.
    from enermod_api.services import scores
    corpus.countries = scores.enrich_countries(corpus.countries, corpus.studies)
    corpus.countries_by_iso = {c["iso_code"]: c for c in corpus.countries}
    with _lock:
        _cache["corpus"] = corpus
    return corpus
