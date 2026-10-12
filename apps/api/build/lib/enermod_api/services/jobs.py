"""Database-backed job queue: discovery runs, metrics refreshes, survey syncs. Jobs run in
the worker process; in development and tests they run inline."""
from __future__ import annotations

import datetime as dt
import logging
import time
import traceback

from sqlalchemy import select
from sqlalchemy.orm import Session

from enermod_api import models
from enermod_api.config import get_settings
from enermod_api.db import session_factory

log = logging.getLogger("enermod.jobs")


def enqueue(db: Session, kind: str, payload: dict | None = None, user_id: str | None = None) -> models.Job:
    job = models.Job(kind=kind, payload=payload or {}, user_id=user_id)
    db.add(job)
    db.commit()
    db.refresh(job)
    if get_settings().inline_jobs:
        run_job(job.id)
        db.refresh(job)
    return job


def _run_discovery(db: Session, job: models.Job) -> dict:
    from enermod_api.services.discovery import run_discovery
    p = job.payload or {}
    run = run_discovery(db, mode=p.get("mode", "since"), since=p.get("since"))
    return {"run_id": run.id, "status": run.status, "fetched": run.n_fetched, "new": run.n_new, "known": run.n_known,
            "error": run.error}


def _run_metrics(db: Session, job: models.Job) -> dict:
    from enermod_api.services.metrics import refresh_all
    return refresh_all(db)


def _run_survey(db: Session, job: models.Job) -> dict:
    from enermod_api.services import contributions
    from enermod_api.services.imports import fetch_survey_csv, parse_survey
    s = get_settings()
    url = (job.payload or {}).get("url") or s.survey_csv_url
    if not url:
        raise RuntimeError("No survey URL configured (SURVEY_CSV_URL)")
    data = fetch_survey_csv(url)
    payloads, mapping = parse_survey(data, "survey.csv", s.survey_field_map)
    created = skipped = 0
    seen = {c.payload.get("link_doi") or c.payload.get("full_title") for c in
            db.scalars(select(models.Contribution).where(models.Contribution.source == "survey")).all()}
    for p in payloads:
        key = p.get("link_doi") or p.get("full_title")
        if key in seen:
            skipped += 1
            continue
        try:
            contributions.create(db, "study", p, source="survey", submitter_name=p.get("submitter_name", ""),
                                 submitter_email=p.get("submitter_email", ""), submitter_org=p.get("submitter_org", ""),
                                 message="Imported from the validation survey")
            created += 1
            seen.add(key)
        except ValueError as e:
            skipped += 1
            log.info("survey row skipped: %s", e)
    return {"rows": len(payloads), "created": created, "skipped": skipped, "mapping": mapping}


RUNNERS = {"discovery": _run_discovery, "metrics": _run_metrics, "survey_sync": _run_survey}


def run_job(job_id: str) -> None:
    db: Session = session_factory()()
    try:
        job = db.get(models.Job, job_id)
        if not job or job.status not in ("queued", "running"):
            return
        job.status, job.started_at = "running", models.now()
        db.commit()
        try:
            result = RUNNERS[job.kind](db, job)
            job.status, job.result = "done", result
        except Exception as e:                      # noqa: BLE001
            db.rollback()
            job = db.get(models.Job, job_id)
            job.status, job.error = "failed", f"{type(e).__name__}: {e}"
            log.error("job %s failed\n%s", job_id, traceback.format_exc())
        job.finished_at = models.now()
        db.commit()
    finally:
        db.close()


def _due(db: Session, kind: str, interval_days: int) -> bool:
    last = db.scalar(select(models.Job).where(models.Job.kind == kind, models.Job.status.in_(("done", "running", "queued")))
                     .order_by(models.Job.created_at.desc()).limit(1))
    return last is None or (models.now() - last.created_at) > dt.timedelta(days=interval_days)


def schedule_periodic(db: Session) -> None:
    """Enqueue the periodic jobs the deployment opted into (DISCOVERY_AUTO, METRICS_AUTO)."""
    s = get_settings()
    if s.discovery_auto and _due(db, "discovery", s.discovery_interval_days):
        db.add(models.Job(kind="discovery", payload={"mode": "since"}))
    if s.metrics_auto and _due(db, "metrics", s.metrics_interval_days):
        db.add(models.Job(kind="metrics"))
    if s.survey_csv_url and _due(db, "survey_sync", s.discovery_interval_days):
        db.add(models.Job(kind="survey_sync"))
    db.commit()


def worker_loop(poll_seconds: float = 10.0) -> None:
    """`python -m enermod_api.worker`: picks queued jobs one at a time and schedules the periodic ones."""
    log.info("worker started")
    last_schedule = 0.0
    while True:
        db: Session = session_factory()()
        try:
            if time.time() - last_schedule > 600:
                schedule_periodic(db)
                last_schedule = time.time()
            job = db.scalar(select(models.Job).where(models.Job.status == "queued").order_by(models.Job.created_at).limit(1))
            job_id = job.id if job else None
            if job:
                job.status = "running"
                db.commit()
        finally:
            db.close()
        if job_id:
            run_job(job_id)
        else:
            time.sleep(poll_seconds)
