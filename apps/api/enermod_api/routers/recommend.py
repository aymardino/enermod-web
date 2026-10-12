"""Tool recommender."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from enermod_api import schemas
from enermod_api.db import get_db
from enermod_api.services.data import get_corpus
from enermod_api.services import recommender

router = APIRouter(prefix="/recommend", tags=["recommender"])


@router.post("")
def recommend(body: schemas.RecommendIn, db: DBSession = Depends(get_db)):
    for field, allowed in (("objective", recommender.OBJECTIVES), ("scale", recommender.SCALES),
                           ("budget", recommender.BUDGETS), ("capacity", recommender.CAPACITIES),
                           ("horizon", recommender.HORIZONS), ("data", recommender.DATA)):
        v = getattr(body, field)
        if v is not None and v not in allowed:
            raise HTTPException(400, f"{field}: unexpected value '{v}'")
    extras = [e for e in body.extras if e in recommender.EXTRAS]
    return recommender.recommend(get_corpus(db), {**body.model_dump(), "extras": extras}, limit=body.limit)
