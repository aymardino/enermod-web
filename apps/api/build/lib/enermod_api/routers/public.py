"""Read-only endpoints of the observatory."""
from __future__ import annotations

import io
import json
import zipfile

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DBSession

from enermod_api.db import get_db
from enermod_api.services import analytics, metrics, stats
from enermod_api.services.biblio import write_csv
from enermod_api.services.data import FEATURE_FIELDS, TECH_FIELDS, get_corpus, s
from enermod_api.services.recommender import options as recommender_options

router = APIRouter(tags=["observatory"])

STUDY_PUBLIC_FIELDS = ["study_id", "full_title", "authors", "year", "model_name", "extraction_level", "level", "study_category",
                       "scale", "countries", "country_names", "pools", "tools", "study_objective", "key_result",
                       "time_horizon_start", "time_horizon_end", "approach", "method", "mathematical_approach",
                       *TECH_FIELDS, "other_technologies", "sector", "open_source", "data_requirements", "sdg_7", "sdg_13",
                       "ndc_mention", "agenda_2063", "aisesa_theme", *FEATURE_FIELDS, "clean_cooking", "strengths",
                       "weaknesses", "authors_affiliation", "author_origin", "local_ownership", "origin_class",
                       "institutional_users", "grey_literature", "cost_of_capital", "coc_min", "coc_max", "coc_type",
                       "financing_modelling", "financing_mechanism", "link", "link_doi", "doi", "source", "created_at"]


def _public_study(d: dict) -> dict:
    return {k: d.get(k) for k in STUDY_PUBLIC_FIELDS}


@router.get("/stats/overview")
def overview(db: DBSession = Depends(get_db)):
    return stats.overview(get_corpus(db))


@router.get("/stats/gaps")
def gaps(level: str = "full", region: list[str] = Query(default=[]), db: DBSession = Depends(get_db)):
    if level not in ("full", "light", "all"):
        raise HTTPException(400, "level must be full, light or all")
    return stats.gaps(get_corpus(db), level, region or None)


@router.get("/stats/readiness")
def readiness(db: DBSession = Depends(get_db)):
    return stats.readiness(get_corpus(db))


@router.get("/countries")
def countries(db: DBSession = Depends(get_db)):
    return [stats.country_summary(c) for c in get_corpus(db).countries]


@router.get("/countries/{iso}")
def country(iso: str, db: DBSession = Depends(get_db)):
    d = stats.country_detail(get_corpus(db), iso)
    if not d:
        raise HTTPException(404, "Country not found")
    return d


@router.get("/studies/facets")
def facets(db: DBSession = Depends(get_db)):
    return stats.facets(get_corpus(db))


@router.get("/studies")
def studies(request: Request, db: DBSession = Depends(get_db),
            q: str = "", year_min: int | None = None, year_max: int | None = None,
            scale: list[str] = Query(default=[]), approach: list[str] = Query(default=[]),
            method: list[str] = Query(default=[]), open_source: list[str] = Query(default=[]),
            level: list[str] = Query(default=[]), category: list[str] = Query(default=[]),
            country: list[str] = Query(default=[]), tool: list[str] = Query(default=[]),
            pool: list[str] = Query(default=[]), feature: list[str] = Query(default=[]),
            tech: list[str] = Query(default=[]), sdg7: bool = False, sdg13: bool = False, ndc: bool = False,
            local: bool = False, grey: bool | None = None, source: str = "",
            sort: str = "year_desc", page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=200)):
    corpus = get_corpus(db)
    rows = corpus.studies
    ql = q.strip().lower()
    if ql:
        rows = [d for d in rows if ql in " ".join([d["full_title"], d["model_name"], d["authors"], " ".join(d["tools"]),
                                                  " ".join(d["country_names"]), s(d.get("study_objective"))]).lower()]
    if year_min is not None:
        rows = [d for d in rows if d["year"] and d["year"] >= year_min]
    if year_max is not None:
        rows = [d for d in rows if d["year"] and d["year"] <= year_max]
    if scale:
        rows = [d for d in rows if s(d.get("scale")) in scale]
    if approach:
        rows = [d for d in rows if s(d.get("approach")) in approach]
    if method:
        rows = [d for d in rows if any(m in s(d.get("method")) for m in method)]
    if open_source:
        rows = [d for d in rows if s(d.get("open_source")) in open_source]
    if level:
        rows = [d for d in rows if d["level"] in level]
    if category:
        rows = [d for d in rows if any(c in s(d.get("study_category")) for c in category)]
    if country:
        wanted = {c.upper() for c in country}
        rows = [d for d in rows if set(d["countries"]) & wanted]
    if tool:
        wanted_t = {t.lower() for t in tool}
        rows = [d for d in rows if {x.lower() for x in d["tools"]} & wanted_t]
    if pool:
        rows = [d for d in rows if set(d["pools"]) & set(pool)]
    for f in feature:
        if f in FEATURE_FIELDS or f == "clean_cooking":
            rows = [d for d in rows if s(d.get(f)).lower() == "yes"]
    for t in tech:
        if t in TECH_FIELDS:
            rows = [d for d in rows if s(d.get(t)).lower() == "yes"]
    if sdg7:
        rows = [d for d in rows if s(d.get("sdg_7")).lower() == "yes"]
    if sdg13:
        rows = [d for d in rows if s(d.get("sdg_13")).lower() == "yes"]
    if ndc:
        rows = [d for d in rows if s(d.get("ndc_mention")).lower() == "yes"]
    if local:
        rows = [d for d in rows if s(d.get("local_ownership")).lower() == "yes"]
    if grey is not None:
        rows = [d for d in rows if (s(d.get("grey_literature")).lower() == "yes") == grey]
    if source:
        rows = [d for d in rows if d["source"] == source]
    key = {"year_desc": (lambda d: -(d["year"] or 0), True), "year_asc": (lambda d: d["year"] or 0, False),
           "id": (lambda d: d["study_id"], False), "title": (lambda d: (d["full_title"] or "").lower(), False),
           "recent": (lambda d: d.get("created_at") or "", True)}.get(sort, (lambda d: -(d["year"] or 0), True))
    rows = sorted(rows, key=key[0]) if not key[1] or sort != "recent" else sorted(rows, key=key[0], reverse=True)
    total = len(rows)
    start = (page - 1) * page_size
    return {"items": [stats.study_card(d) for d in rows[start:start + page_size]], "total": total, "page": page,
            "page_size": page_size, "pages": (total + page_size - 1) // page_size}


@router.get("/studies/{study_id}")
def study(study_id: int, db: DBSession = Depends(get_db)):
    corpus = get_corpus(db)
    d = corpus.by_id.get(study_id)
    if not d:
        raise HTTPException(404, "Study not found")
    out = _public_study(d)
    out["tool_profiles"] = [{"tool_name": t["tool_name"], "license": t["license"], "type": t["type"]}
                            for t in (corpus.tool(n) for n in d["tools"]) if t]
    return out


@router.get("/tools")
def tools(db: DBSession = Depends(get_db)):
    corpus = get_corpus(db)
    rows = stats.tool_rows(corpus)
    latest = metrics.latest_metrics(db)
    popular = {p["ref"]: p["n"] for p in analytics.popular(db, "tool_view", 30, 50)}
    for r in rows:
        r["metrics"] = latest.get(r["tool_name"])
        r["views_30d"] = popular.get(r["tool_name"], 0)
    return {"items": rows, "n_tools": len(rows), "n_used": sum(1 for r in rows if r["n_studies"] > 0)}


@router.get("/tools/{name}")
def tool(name: str, db: DBSession = Depends(get_db)):
    corpus = get_corpus(db)
    d = stats.tool_detail(corpus, name)
    if not d:
        raise HTTPException(404, "Tool not found")
    d["metrics"] = metrics.latest_metrics(db).get(d["tool_name"])
    d["metrics_history"] = metrics.history(db, d["tool_name"]) if d["metrics"] else []
    return d


@router.get("/recommend/options")
def recommend_options():
    return recommender_options()


@router.get("/meta")
def meta(db: DBSession = Depends(get_db)):
    from enermod_api import __version__
    from enermod_api.services.llm import available_provider
    corpus = get_corpus(db)
    return {"version": __version__, "n_studies": len(corpus.studies), "n_tools": len(corpus.tools),
            "assistant": available_provider() is not None, "built_at": corpus.built_at}


# ── Exports ─────────────────────────────────────────────────────────────────────
def _csv_response(text: str, filename: str) -> Response:
    return Response(text, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/export/studies.csv")
def export_studies_csv(db: DBSession = Depends(get_db)):
    corpus = get_corpus(db)
    rows = [{**_public_study(d), "countries": ";".join(d["countries"]), "tools": ";".join(d["tools"]),
             "pools": ";".join(d["pools"])} for d in corpus.studies]
    cols = [c for c in STUDY_PUBLIC_FIELDS if c not in ("country_names",)]
    return _csv_response(write_csv(rows, cols), "enermod_studies.csv")


@router.get("/export/studies.json")
def export_studies_json(db: DBSession = Depends(get_db)):
    corpus = get_corpus(db)
    return Response(json.dumps([_public_study(d) for d in corpus.studies], ensure_ascii=False), media_type="application/json",
                    headers={"Content-Disposition": 'attachment; filename="enermod_studies.json"'})


@router.get("/export/tools.csv")
def export_tools_csv(db: DBSession = Depends(get_db)):
    corpus = get_corpus(db)
    cols = [c for c in corpus.tools[0].keys()] if corpus.tools else []
    return _csv_response(write_csv(corpus.tools, cols), "enermod_tools.csv")


@router.get("/export/countries.csv")
def export_countries_csv(db: DBSession = Depends(get_db)):
    corpus = get_corpus(db)
    rows = [stats.country_summary(c) for c in corpus.countries]
    return _csv_response(write_csv(rows, list(rows[0].keys()) if rows else []), "enermod_countries.csv")


@router.get("/export/all.zip")
def export_all(db: DBSession = Depends(get_db)):
    corpus = get_corpus(db)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        rows = [{**_public_study(d), "countries": ";".join(d["countries"]), "tools": ";".join(d["tools"]),
                 "pools": ";".join(d["pools"])} for d in corpus.studies]
        z.writestr("studies.csv", write_csv(rows, [c for c in STUDY_PUBLIC_FIELDS if c != "country_names"]))
        z.writestr("tools.csv", write_csv(corpus.tools, list(corpus.tools[0].keys()) if corpus.tools else []))
        crow = [stats.country_summary(c) for c in corpus.countries]
        z.writestr("countries.csv", write_csv(crow, list(crow[0].keys()) if crow else []))
        z.writestr("study_countries.csv", write_csv([{"study_id": d["study_id"], "iso_code": i} for d in corpus.studies for i in d["countries"]], ["study_id", "iso_code"]))
        z.writestr("study_tools.csv", write_csv([{"study_id": d["study_id"], "tool_name": t} for d in corpus.studies for t in d["tools"]], ["study_id", "tool_name"]))
        z.writestr("README.txt", "EnerMod Africa Observatory data export. Licence: CC BY 4.0. Cite the observatory and the thesis (see /about).\n")
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/zip", headers={"Content-Disposition": 'attachment; filename="enermod_africa_data.zip"'})
