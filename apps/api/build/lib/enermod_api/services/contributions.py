"""Contributions: what visitors, Krinea exports, the survey and the discovery pipeline
propose, and how a curator turns an approved study proposal into an inventory record."""
from __future__ import annotations

import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from enermod_api import models
from enermod_api.services.biblio import clean_doi, norm_title, similarity
from enermod_api.services.data import ISO2_TO_ISO3, Corpus, get_corpus, invalidate, s, tokens

STUDY_FIELDS = [c for c in models.STUDY_TEXT_FIELDS]
LIST_FIELDS = ("tools", "countries")
YESNO = {"yes", "no", "partial", ""}
ENUMS = {
    "extraction_level": {"full", "light", ""},
    "scale": {"national", "subnational", "regional", "continental", "global", ""},
    "open_source": {"open", "proprietary", "mixed", ""},
    "approach": {"bottom-up", "top-down", "hybrid", ""},
    "method": {"optimization", "simulation", "accounting", "hybrid", ""},
    "sector": {"electricity", "full_energy", "power_heat", "other", ""},
    "aisesa_theme": {"powering_livelihoods", "inclusive_industrialisation", "urban_transitions", "cross_cutting", "none", ""},
    "local_ownership": YESNO, "grey_literature": YESNO, "sdg_7": YESNO, "sdg_13": YESNO, "ndc_mention": YESNO,
    "agenda_2063": YESNO, "informal_economy": YESNO, "biomass_charcoal": YESNO, "clean_cooking": YESNO,
    "power_reliability": YESNO, "urbanization": YESNO, "financing_modelling": YESNO,
}
ISO3_TO_ISO2 = {v: k for k, v in ISO2_TO_ISO3.items()}


def resolve_countries(values, corpus: Corpus) -> tuple[list[str], list[str]]:
    """Accept ISO-2, ISO-3 or English names; return (iso2 codes, unknown values)."""
    if isinstance(values, str):
        values = tokens(values)
    names = {c["country_name"].lower(): c["iso_code"] for c in corpus.countries}
    out, unknown = [], []
    for v in values or []:
        v = s(v)
        key = v.upper()
        if key in corpus.countries_by_iso:
            out.append(key)
        elif key in ISO3_TO_ISO2 and ISO3_TO_ISO2[key] in corpus.countries_by_iso:
            out.append(ISO3_TO_ISO2[key])
        elif v.lower() in names:
            out.append(names[v.lower()])
        elif v:
            unknown.append(v)
    return sorted(set(out)), unknown


def normalize_study_payload(payload: dict, corpus: Corpus) -> tuple[dict, list[str]]:
    """Clean a study proposal: known fields only, enumerations checked, countries resolved."""
    errors = []
    clean: dict = {}
    for k, v in (payload or {}).items():
        if k in STUDY_FIELDS or k in LIST_FIELDS or k in ("year", "tool_categories", "openalex_id"):
            clean[k] = v
    if not s(clean.get("full_title")):
        errors.append("full_title is required")
    year = clean.get("year")
    if year not in (None, ""):
        try:
            y = int(str(year)[:4])
            if not 1990 <= y <= 2100:
                errors.append("year out of range")
            clean["year"] = y
        except ValueError:
            errors.append("year must be a number")
    else:
        clean["year"] = None
    for k, allowed in ENUMS.items():
        if k in clean:
            v = s(clean[k]).lower().replace(" ", "_")
            if v not in allowed:
                errors.append(f"{k}: unexpected value '{clean[k]}'")
            clean[k] = v
    link = s(clean.get("link_doi"))
    doi = clean_doi(link)
    if doi:
        clean["link_doi"] = f"https://doi.org/{doi}"
    elif link and not re.match(r"^https?://", link):
        errors.append("link_doi must be a DOI or an http(s) URL")
    clean["tools"] = tokens(clean.get("tools")) if not isinstance(clean.get("tools"), list) else [s(t) for t in clean["tools"] if s(t)]
    isos, unknown = resolve_countries(clean.get("countries"), corpus)
    clean["countries"] = isos
    if unknown:
        errors.append("unknown countries: " + ", ".join(unknown))
    for k in ("study_objective", "key_result"):
        if k in clean:
            clean[k] = s(clean[k])[:2000]
    return clean, errors


def find_duplicate(corpus: Corpus, payload: dict) -> tuple[int | None, str]:
    doi = clean_doi(payload.get("link_doi"))
    if doi:
        for d in corpus.studies:
            if d.get("doi") == doi:
                return d["study_id"], "same DOI"
    t = norm_title(payload.get("full_title"))
    if not t:
        return None, ""
    best, best_id = 0.0, None
    for d in corpus.studies:
        ct = norm_title(d["full_title"])
        if not ct or abs(len(ct) - len(t)) > 40:
            continue
        sc = similarity(t, ct)
        if sc > best:
            best, best_id = sc, d["study_id"]
    if best >= 92:
        return best_id, f"title similarity {best:.0f}%"
    return None, ""


def create(db: Session, kind: str, payload: dict, *, source: str = "form", message: str = "", submitter_name: str = "",
           submitter_email: str = "", submitter_org: str = "", user_id: str | None = None,
           target_study_id: int | None = None, target_tool_name: str = "") -> models.Contribution:
    corpus = get_corpus(db)
    match_id, note = (None, "")
    if kind == "study":
        payload, errors = normalize_study_payload(payload, corpus)
        if errors:
            raise ValueError("; ".join(errors))
        match_id, note = find_duplicate(corpus, payload)
    c = models.Contribution(kind=kind, payload=payload, source=source, message=message[:4000],
                            submitter_name=submitter_name[:200], submitter_email=submitter_email[:320],
                            submitter_org=submitter_org[:300], user_id=user_id, target_study_id=target_study_id,
                            target_tool_name=target_tool_name[:120], match_study_id=match_id, match_note=note)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def pools_for(countries: list[str], pools: list[dict]) -> list[str]:
    out = []
    for p in pools:
        members = {x.strip() for x in s(p.get("member_countries")).split(",") if x.strip()}
        if members & set(countries):
            out.append(p["pool_code"])
    return out


def recompute_counters(db: Session) -> None:
    """nb_studies_in_inventory (tools) and nb_models_applied (countries, pools) from the link tables."""
    db.flush()                      # the session does not autoflush: count the rows just added too
    tool_counts = dict(db.execute(select(models.StudyTool.tool_name, func.count()).group_by(models.StudyTool.tool_name)).all())
    for t in db.scalars(select(models.Tool)).all():
        t.nb_studies_in_inventory = tool_counts.get(t.tool_name, 0)
    country_counts = dict(db.execute(select(models.StudyCountry.iso_code, func.count()).group_by(models.StudyCountry.iso_code)).all())
    for c in db.scalars(select(models.Country)).all():
        c.nb_models_applied = country_counts.get(c.iso_code, 0)
    pool_counts = dict(db.execute(select(models.StudyPool.pool_code, func.count()).group_by(models.StudyPool.pool_code)).all())
    for p in db.scalars(select(models.PowerPool)).all():
        p.nb_models_applied = pool_counts.get(p.pool_code, 0)


def approve_study(db: Session, c: models.Contribution, reviewer: models.User, note: str = "") -> models.Study:
    corpus = get_corpus(db)
    payload, errors = normalize_study_payload(c.payload or {}, corpus)
    if errors:
        raise ValueError("; ".join(errors))
    next_id = (db.scalar(select(func.max(models.Study.study_id))) or 0) + 1
    study = models.Study(study_id=next_id, source=c.source if c.source in ("form", "krinea", "survey", "discovery") else "contribution")
    if study.source == "form":
        study.source = "contribution"
    for k in STUDY_FIELDS:
        if k in payload and payload[k] is not None:
            setattr(study, k, s(payload[k]) if not isinstance(payload[k], (int, float)) else str(payload[k]))
    study.year = payload.get("year")
    study.doi = clean_doi(payload.get("link_doi"))
    study.nb_countries_covered = str(len(payload["countries"]))
    db.add(study)
    db.flush()
    categories = tokens(payload.get("tool_categories"))
    for i, name in enumerate(payload["tools"]):
        ttype = categories[i] if i < len(categories) else ""
        tool = db.get(models.Tool, name)
        if tool is None:
            db.add(models.Tool(tool_name=name, type=ttype))
            db.flush()
        db.add(models.StudyTool(study_id=next_id, tool_name=name, type=ttype))
    for iso in payload["countries"]:
        ctry = corpus.countries_by_iso.get(iso, {})
        db.add(models.StudyCountry(study_id=next_id, iso_code=iso, iso3=ctry.get("iso3", ISO2_TO_ISO3.get(iso, "")),
                                   country=ctry.get("country_name", iso)))
    for code in pools_for(payload["countries"], corpus.pools):
        db.add(models.StudyPool(study_id=next_id, pool_code=code))
    c.status, c.reviewed_by, c.reviewed_at, c.review_note, c.created_study_id = "approved", reviewer.id, models.now(), note, next_id
    recompute_counters(db)
    db.commit()
    invalidate()
    return study


def approve_tool(db: Session, c: models.Contribution, reviewer: models.User, note: str = "") -> models.Tool:
    payload = c.payload or {}
    name = s(payload.get("tool_name"))
    if not name:
        raise ValueError("tool_name is required")
    tool = db.get(models.Tool, name) or models.Tool(tool_name=name)
    cols = {col.key for col in models.Tool.__table__.columns} - {"tool_name", "nb_studies_in_inventory", "updated_at"}
    for k, v in payload.items():
        if k in cols and v is not None:
            setattr(tool, k, s(v))
    db.add(tool)
    c.status, c.reviewed_by, c.reviewed_at, c.review_note = "approved", reviewer.id, models.now(), note
    db.commit()
    invalidate()
    return tool


def approve(db: Session, c: models.Contribution, reviewer: models.User, note: str = "") -> dict:
    if c.status != "pending":
        raise ValueError("This contribution was already reviewed")
    if c.kind == "study":
        study = approve_study(db, c, reviewer, note)
        return {"study_id": study.study_id}
    if c.kind == "tool":
        tool = approve_tool(db, c, reviewer, note)
        return {"tool_name": tool.tool_name}
    # Corrections are applied by the curator by hand (or through the edit endpoints); approving records the decision.
    c.status, c.reviewed_by, c.reviewed_at, c.review_note = "approved", reviewer.id, models.now(), note
    db.commit()
    return {}


def reject(db: Session, c: models.Contribution, reviewer: models.User, note: str = "") -> None:
    if c.status != "pending":
        raise ValueError("This contribution was already reviewed")
    c.status, c.reviewed_by, c.reviewed_at, c.review_note = "rejected", reviewer.id, models.now(), note
    db.commit()
