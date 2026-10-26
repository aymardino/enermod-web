"""Curation area: contributions, discovery, imports, metrics, analytics, users, edits."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session as DBSession

from enermod_api import models, schemas
from enermod_api.config import get_settings
from enermod_api.db import get_db
from enermod_api.deps import RequireRole
from enermod_api.routers.contributions import contribution_out
from enermod_api.services import analytics, contributions, discovery, imports, jobs, metrics, screening
from enermod_api.services.biblio import clean_doi
from enermod_api.services.data import get_corpus, invalidate, s

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(RequireRole("curator"))])
curator = RequireRole("curator")
admin_only = RequireRole("admin")


def _job_out(j: models.Job) -> dict:
    return {"id": j.id, "kind": j.kind, "status": j.status, "payload": j.payload, "result": j.result, "error": j.error,
            "created_at": j.created_at, "started_at": j.started_at, "finished_at": j.finished_at}


@router.get("/overview")
def overview(db: DBSession = Depends(get_db)):
    pending = db.scalar(select(func.count()).select_from(models.Contribution).where(models.Contribution.status == "pending")) or 0
    new_candidates = db.scalar(select(func.count()).select_from(models.Candidate).where(models.Candidate.status == "new")) or 0
    relevant = db.scalar(select(func.count()).select_from(models.Candidate).where(models.Candidate.status == "relevant")) or 0
    last_run = db.scalar(select(models.DiscoveryRun).order_by(models.DiscoveryRun.started_at.desc()).limit(1))
    last_metrics = db.scalar(select(func.max(models.ToolMetric.fetched_at)))
    recent_jobs = db.scalars(select(models.Job).order_by(models.Job.created_at.desc()).limit(8)).all()
    users = db.scalar(select(func.count()).select_from(models.User)) or 0
    return {"pending_contributions": pending, "new_candidates": new_candidates, "relevant_candidates": relevant,
            "last_discovery": {"id": last_run.id, "status": last_run.status, "started_at": last_run.started_at,
                               "n_new": last_run.n_new, "n_fetched": last_run.n_fetched, "since": last_run.since_date} if last_run else None,
            "last_metrics_at": last_metrics, "users": users, "jobs": [_job_out(j) for j in recent_jobs],
            "usage": analytics.summary(db, 30)}


# ── Contributions ────────────────────────────────────────────────────────────────
@router.get("/contributions")
def list_contributions(status: str = "pending", kind: str = "", source: str = "", db: DBSession = Depends(get_db)):
    q = select(models.Contribution)
    if status and status != "all":
        q = q.where(models.Contribution.status == status)
    if kind:
        q = q.where(models.Contribution.kind == kind)
    if source:
        q = q.where(models.Contribution.source == source)
    rows = db.scalars(q.order_by(models.Contribution.created_at.desc()).limit(500)).all()
    return [contribution_out(c, full=True) for c in rows]


@router.get("/contributions/{cid}")
def get_contribution(cid: str, db: DBSession = Depends(get_db)):
    c = db.get(models.Contribution, cid)
    if not c:
        raise HTTPException(404, "Not found")
    out = contribution_out(c, full=True)
    if c.kind == "study":
        _, errors = contributions.normalize_study_payload(c.payload or {}, get_corpus(db))
        out["errors"] = errors
    return out


@router.patch("/contributions/{cid}")
def edit_contribution(cid: str, body: schemas.ContributionEdit, db: DBSession = Depends(get_db)):
    c = db.get(models.Contribution, cid)
    if not c or c.status != "pending":
        raise HTTPException(404, "Not found or already reviewed")
    if body.payload is not None:
        c.payload = {**(c.payload or {}), **body.payload}
    if body.message is not None:
        c.message = body.message
    db.commit()
    return contribution_out(c, full=True)


@router.post("/contributions/{cid}/approve")
def approve(cid: str, body: schemas.ReviewIn, db: DBSession = Depends(get_db), user: models.User = Depends(curator)):
    c = db.get(models.Contribution, cid)
    if not c:
        raise HTTPException(404, "Not found")
    try:
        result = contributions.approve(db, c, user, body.note)
    except ValueError as e:
        raise HTTPException(422, str(e))
    return {**contribution_out(c, full=True), **result}


@router.post("/contributions/{cid}/reject")
def reject(cid: str, body: schemas.ReviewIn, db: DBSession = Depends(get_db), user: models.User = Depends(curator)):
    c = db.get(models.Contribution, cid)
    if not c:
        raise HTTPException(404, "Not found")
    try:
        contributions.reject(db, c, user, body.note)
    except ValueError as e:
        raise HTTPException(422, str(e))
    return contribution_out(c, full=True)


# ── Discovery ────────────────────────────────────────────────────────────────────
@router.post("/discovery/run")
def run_discovery(body: schemas.DiscoveryRunIn, db: DBSession = Depends(get_db), user: models.User = Depends(curator)):
    if body.mode not in ("since", "full"):
        raise HTTPException(400, "mode must be since or full")
    job = jobs.enqueue(db, "discovery", {"mode": body.mode, "since": body.since}, user.id)
    return _job_out(job)


@router.get("/discovery/runs")
def discovery_runs(db: DBSession = Depends(get_db)):
    rows = db.scalars(select(models.DiscoveryRun).order_by(models.DiscoveryRun.started_at.desc()).limit(30)).all()
    return [{"id": r.id, "mode": r.mode, "since_date": r.since_date, "status": r.status, "n_fetched": r.n_fetched,
             "n_new": r.n_new, "n_known": r.n_known, "n_queries": r.n_queries, "error": r.error,
             "started_at": r.started_at, "finished_at": r.finished_at} for r in rows]


@router.get("/discovery/queries")
def discovery_queries():
    from enermod_api.services.openalex import build_queries
    return {"queries": build_queries(), "api_key": bool(get_settings().openalex_api_key)}


def _candidate_out(c: models.Candidate) -> dict:
    signals_in, _, signals_out = (c.signals or "").partition(" | -")
    return {"id": c.id, "openalex_id": c.openalex_id, "doi": c.doi, "title": c.title, "abstract": c.abstract[:1200],
            "authors": c.authors, "year": c.year, "venue": c.venue, "url": c.url, "oa_url": c.oa_url, "cited_by": c.cited_by,
            "work_type": c.work_type, "language": c.language, "status": c.status, "match_study_id": c.match_study_id,
            "match_score": c.match_score, "note": c.note, "created_at": c.created_at,
            "relevance": c.relevance, "bucket": screening.bucket_of(c.relevance),
            "signals_in": [s for s in signals_in.split(", ") if s], "signals_out": [s for s in signals_out.split(", -") if s]}


@router.get("/discovery/candidates")
def candidates(status: str = "new", q: str = "", page: int = 1, page_size: int = 50, sort: str = "relevance",
               min_relevance: int | None = None, db: DBSession = Depends(get_db)):
    """`sort` is relevance (screening score, then year) or recent; `min_relevance` hides the
    candidates scored under it. `weak` counts the new candidates at or under the "weak" line."""
    query = select(models.Candidate)
    if status and status != "all":
        query = query.where(models.Candidate.status == status)
    if q:
        query = query.where(models.Candidate.title.ilike(f"%{q}%"))
    base = query
    if min_relevance is not None:
        query = query.where(models.Candidate.relevance >= min_relevance)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    weak = db.scalar(select(func.count()).select_from(
        base.where(models.Candidate.status == "new", models.Candidate.relevance < screening.POSSIBLE_MIN).subquery())) or 0
    order = ((models.Candidate.relevance.desc().nulls_last(), models.Candidate.year.desc(), models.Candidate.cited_by.desc())
             if sort != "recent" else (models.Candidate.year.desc(), models.Candidate.cited_by.desc()))
    rows = db.scalars(query.order_by(*order).offset((max(page, 1) - 1) * page_size).limit(min(page_size, 200))).all()
    return {"items": [_candidate_out(c) for c in rows], "total": total, "page": page, "weak": weak,
            "thresholds": {"possible": screening.POSSIBLE_MIN, "strong": screening.STRONG_MIN}}


@router.post("/discovery/candidates/dismiss-weak")
def dismiss_weak(body: schemas.DismissWeakIn, db: DBSession = Depends(get_db), user: models.User = Depends(curator)):
    """Sets the new candidates scored at or under `max_relevance` aside as irrelevant, in one go."""
    return {"count": screening.dismiss_weak(db, body.max_relevance)}


@router.post("/discovery/candidates/rescore")
def rescore(db: DBSession = Depends(get_db), user: models.User = Depends(curator)):
    db.execute(update(models.Candidate).values(relevance=None))
    db.commit()
    return {"count": screening.backfill(db)}


@router.patch("/discovery/candidates/{cid}")
def update_candidate(cid: int, body: schemas.CandidateUpdate, db: DBSession = Depends(get_db)):
    c = db.get(models.Candidate, cid)
    if not c:
        raise HTTPException(404, "Not found")
    if body.status:
        c.status = body.status
    if body.note is not None:
        c.note = body.note
    db.commit()
    return _candidate_out(c)


@router.post("/discovery/candidates/{cid}/to-contribution", status_code=201)
def candidate_to_contribution(cid: int, db: DBSession = Depends(get_db), user: models.User = Depends(curator)):
    c = db.get(models.Candidate, cid)
    if not c:
        raise HTTPException(404, "Not found")
    try:
        contrib = contributions.create(db, "study", discovery.candidate_to_payload(c), source="discovery",
                                       message=f"From discovery candidate {c.openalex_id}", user_id=user.id)
    except ValueError as e:
        raise HTTPException(422, str(e))
    c.status = "imported"
    db.commit()
    return contribution_out(contrib, full=True)


@router.get("/discovery/export.ris")
def export_ris(status: str = "relevant", min_relevance: int | None = None, db: DBSession = Depends(get_db)):
    text = discovery.candidates_ris(db, status, min_relevance)
    return Response(text, media_type="application/x-research-info-systems",
                    headers={"Content-Disposition": f'attachment; filename="enermod_candidates_{status}.ris"'})


# ── Imports (Krinea exports, survey responses) ──────────────────────────────────
@router.post("/imports/krinea", status_code=201)
async def import_krinea(file: UploadFile = File(...), db: DBSession = Depends(get_db), user: models.User = Depends(curator)):
    data = await file.read()
    try:
        payloads = imports.parse_krinea_export(data, file.filename or "export.csv")
    except Exception as e:                      # noqa: BLE001
        raise HTTPException(422, f"Could not read the export: {type(e).__name__}: {e}")
    created, errors = [], []
    for p in payloads:
        try:
            c = contributions.create(db, "study", p, source="krinea", user_id=user.id,
                                     message=f"Imported from Krinea export {file.filename}")
            created.append(c.id)
        except ValueError as e:
            errors.append({"title": s(p.get("full_title"))[:120], "error": str(e)})
    return {"rows": len(payloads), "created": len(created), "errors": errors[:50]}


@router.post("/imports/survey", status_code=201)
async def import_survey(file: UploadFile | None = File(default=None), mapping: str = Form(default=""),
                        db: DBSession = Depends(get_db), user: models.User = Depends(curator)):
    import json
    st = get_settings()
    if file is None:
        if not st.survey_csv_url:
            raise HTTPException(400, "Upload a file or configure SURVEY_CSV_URL")
        job = jobs.enqueue(db, "survey_sync", {}, user.id)
        return _job_out(job)
    data = await file.read()
    try:
        m = json.loads(mapping) if mapping else st.survey_field_map
        payloads, used = imports.parse_survey(data, file.filename or "survey.csv", m)
    except Exception as e:                      # noqa: BLE001
        raise HTTPException(422, f"Could not read the file: {type(e).__name__}: {e}")
    created, errors = 0, []
    for p in payloads:
        try:
            contributions.create(db, "study", p, source="survey", user_id=user.id,
                                 submitter_name=p.get("submitter_name", ""), submitter_email=p.get("submitter_email", ""),
                                 submitter_org=p.get("submitter_org", ""), message="Imported from the validation survey")
            created += 1
        except ValueError as e:
            errors.append({"title": s(p.get("full_title"))[:120], "error": str(e)})
    return {"rows": len(payloads), "created": created, "errors": errors[:50], "mapping": used}


# ── Tool tracker ────────────────────────────────────────────────────────────────
@router.post("/metrics/refresh")
def refresh_metrics(db: DBSession = Depends(get_db), user: models.User = Depends(curator)):
    return _job_out(jobs.enqueue(db, "metrics", {}, user.id))


@router.get("/metrics")
def list_metrics(db: DBSession = Depends(get_db)):
    return metrics.latest_metrics(db)


# ── Jobs, analytics, users ──────────────────────────────────────────────────────
@router.get("/jobs")
def list_jobs(db: DBSession = Depends(get_db)):
    return [_job_out(j) for j in db.scalars(select(models.Job).order_by(models.Job.created_at.desc()).limit(50)).all()]


@router.get("/jobs/{jid}")
def get_job(jid: str, db: DBSession = Depends(get_db)):
    j = db.get(models.Job, jid)
    if not j:
        raise HTTPException(404, "Not found")
    return _job_out(j)


@router.get("/analytics")
def analytics_summary(days: int = 30, db: DBSession = Depends(get_db)):
    return analytics.summary(db, min(max(days, 1), 365))


@router.get("/users")
def users(db: DBSession = Depends(get_db), _: models.User = Depends(admin_only)):
    rows = db.scalars(select(models.User).order_by(models.User.created_at.desc()).limit(500)).all()
    return [{"id": u.id, "email": u.email, "name": u.name, "organisation": u.organisation, "role": u.role,
             "created_at": u.created_at, "last_login_at": u.last_login_at, "is_active": u.is_active} for u in rows]


@router.patch("/users/{uid}/role")
def set_role(uid: str, body: schemas.RoleIn, db: DBSession = Depends(get_db), me: models.User = Depends(admin_only)):
    u = db.get(models.User, uid)
    if not u:
        raise HTTPException(404, "Not found")
    if u.id == me.id and body.role != "admin":
        raise HTTPException(400, "You cannot remove your own admin role")
    u.role = body.role
    db.commit()
    return {"id": u.id, "role": u.role}


# ── Direct edits by curators ────────────────────────────────────────────────────
TOOL_EDITABLE = {c.key for c in models.Tool.__table__.columns} - {"tool_name", "nb_studies_in_inventory", "updated_at"}
STUDY_EDITABLE = set(models.STUDY_TEXT_FIELDS) | {"year", "status"}


@router.patch("/tools/{name}")
def edit_tool(name: str, body: schemas.ToolEdit, db: DBSession = Depends(get_db)):
    t = db.get(models.Tool, name)
    if not t:
        raise HTTPException(404, "Tool not found")
    for k, v in body.fields.items():
        if k in TOOL_EDITABLE:
            setattr(t, k, s(v))
    t.updated_at = models.now()
    db.commit()
    invalidate()
    return {"tool_name": t.tool_name, "updated": sorted(k for k in body.fields if k in TOOL_EDITABLE)}


@router.patch("/studies/{study_id}")
def edit_study(study_id: int, body: schemas.StudyEdit, db: DBSession = Depends(get_db)):
    st = db.get(models.Study, study_id)
    if not st:
        raise HTTPException(404, "Study not found")
    corpus = get_corpus(db)
    for k, v in body.fields.items():
        if k == "year":
            st.year = int(v) if v not in (None, "") else None
        elif k in STUDY_EDITABLE:
            setattr(st, k, s(v))
    if "link_doi" in body.fields:
        st.doi = clean_doi(st.link_doi)
    if body.tools is not None:
        for row in db.scalars(select(models.StudyTool).where(models.StudyTool.study_id == study_id)).all():
            db.delete(row)
        for name in body.tools:
            name = s(name)
            if name:
                if not db.get(models.Tool, name):
                    db.add(models.Tool(tool_name=name))
                db.add(models.StudyTool(study_id=study_id, tool_name=name))
    if body.countries is not None:
        isos, unknown = contributions.resolve_countries(body.countries, corpus)
        if unknown:
            raise HTTPException(422, "unknown countries: " + ", ".join(unknown))
        for row in db.scalars(select(models.StudyCountry).where(models.StudyCountry.study_id == study_id)).all():
            db.delete(row)
        for row in db.scalars(select(models.StudyPool).where(models.StudyPool.study_id == study_id)).all():
            db.delete(row)
        for iso in isos:
            c = corpus.countries_by_iso[iso]
            db.add(models.StudyCountry(study_id=study_id, iso_code=iso, iso3=c["iso3"], country=c["country_name"]))
        for code in contributions.pools_for(isos, corpus.pools):
            db.add(models.StudyPool(study_id=study_id, pool_code=code))
        st.nb_countries_covered = str(len(isos))
    st.updated_at = models.now()
    contributions.recompute_counters(db)
    db.commit()
    invalidate()
    return {"study_id": study_id, "ok": True}
