"""Grounded assistant."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session as DBSession

from enermod_api import schemas
from enermod_api.config import get_settings
from enermod_api.db import get_db
from enermod_api.deps import RateLimiter
from enermod_api.services import chat
from enermod_api.services.data import get_corpus
from enermod_api.services.llm import LLMUnavailable, available_provider

router = APIRouter(prefix="/chat", tags=["assistant"])
_limiter = RateLimiter(get_settings().chat_per_hour, "assistant")


@router.get("/status")
def status():
    picked = available_provider()
    return {"available": picked is not None, "provider": picked[0] if picked else None}


@router.post("")
def ask(body: schemas.ChatIn, request: Request, db: DBSession = Depends(get_db)):
    _limiter(request)
    locale = body.locale if body.locale in ("en", "fr") else "en"
    try:
        return chat.answer(db, get_corpus(db), [m.model_dump() for m in body.messages], locale, body.context)
    except LLMUnavailable as e:
        raise HTTPException(503, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
