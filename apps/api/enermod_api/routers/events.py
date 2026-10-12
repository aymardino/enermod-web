"""Usage events (privacy-friendly analytics)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session as DBSession

from enermod_api import schemas
from enermod_api.db import get_db
from enermod_api.services import analytics
from enermod_api.security import visitor_hash
from enermod_api.urls import client_ip

router = APIRouter(prefix="/events", tags=["analytics"])


@router.post("", status_code=204)
def track(body: schemas.EventIn, request: Request, db: DBSession = Depends(get_db)):
    if request.headers.get("dnt") == "1" or request.headers.get("sec-gpc") == "1":
        return Response(status_code=204)
    analytics.record(db, body.kind, body.path, body.ref, body.locale,
                     visitor_hash(client_ip(request), request.headers.get("user-agent", "")))
    return Response(status_code=204)


@router.get("/popular")
def popular(kind: str = "tool_view", days: int = 30, db: DBSession = Depends(get_db)):
    if kind not in ("tool_view", "study_view", "country_view"):
        kind = "tool_view"
    return analytics.popular(db, kind, min(max(days, 1), 365), 10)
