"""Public contribution form and the submitter's own view."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from enermod_api import models, schemas
from enermod_api.config import get_settings
from enermod_api.db import get_db
from enermod_api.deps import RateLimiter, optional_user
from enermod_api.services import contributions, email as email_service
from enermod_api.urls import public_base_url

router = APIRouter(prefix="/contributions", tags=["contributions"])
_limiter = RateLimiter(get_settings().contributions_per_hour, "contribution")


def contribution_out(c: models.Contribution, full: bool = False) -> dict:
    out = {"id": c.id, "kind": c.kind, "status": c.status, "source": c.source, "created_at": c.created_at,
           "reviewed_at": c.reviewed_at, "created_study_id": c.created_study_id, "target_study_id": c.target_study_id,
           "target_tool_name": c.target_tool_name, "match_study_id": c.match_study_id, "match_note": c.match_note,
           "title": (c.payload or {}).get("full_title") or (c.payload or {}).get("tool_name") or ""}
    if full:
        out.update({"payload": c.payload, "message": c.message, "submitter_name": c.submitter_name,
                    "submitter_email": c.submitter_email, "submitter_org": c.submitter_org, "review_note": c.review_note,
                    "user_id": c.user_id})
    return out


@router.post("", status_code=201)
def submit(body: schemas.ContributionIn, request: Request, db: DBSession = Depends(get_db),
           user: models.User | None = Depends(optional_user)):
    if body.website:                      # honeypot filled in: a bot
        raise HTTPException(400, "Invalid submission")
    _limiter(request)
    if body.kind == "correction" and not body.message.strip():
        raise HTTPException(400, "A correction needs a message")
    try:
        c = contributions.create(db, body.kind, body.payload, source="form", message=body.message,
                                 submitter_name=body.submitter_name or (user.name if user else ""),
                                 submitter_email=body.submitter_email or (user.email if user else ""),
                                 submitter_org=body.submitter_org or (user.organisation if user else ""),
                                 user_id=user.id if user else None, target_study_id=body.target_study_id,
                                 target_tool_name=body.target_tool_name)
    except ValueError as e:
        raise HTTPException(422, str(e))
    base = public_base_url(request)
    title = (c.payload or {}).get("full_title") or (c.payload or {}).get("tool_name") or body.kind
    email_service.notify_contribution(c.kind, f"{title}\nby {c.submitter_name or 'anonymous'} ({c.submitter_email or 'no e-mail'})",
                                      f"{base}/admin/contributions")
    email_service.thank_submitter(c.submitter_email, title, body.locale if body.locale in ("en", "fr") else "en")
    return {**contribution_out(c), "duplicate_of": c.match_study_id}


@router.get("/mine")
def mine(db: DBSession = Depends(get_db), user: models.User | None = Depends(optional_user)):
    if not user:
        raise HTTPException(401, "Not signed in")
    rows = db.scalars(select(models.Contribution).where(models.Contribution.user_id == user.id)
                      .order_by(models.Contribution.created_at.desc())).all()
    return [contribution_out(c, full=True) for c in rows]


@router.get("/recent")
def recent(db: DBSession = Depends(get_db)):
    """Recently approved community contributions (what the hub gained from its visitors)."""
    rows = db.scalars(select(models.Contribution).where(models.Contribution.status == "approved")
                      .order_by(models.Contribution.reviewed_at.desc()).limit(10)).all()
    return [contribution_out(c) for c in rows]
