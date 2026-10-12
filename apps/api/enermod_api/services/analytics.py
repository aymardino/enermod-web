"""Usage of the observatory itself: which pages, tools, studies and countries people look
at, how often the recommender and the assistant are used. No personal data is stored."""
from __future__ import annotations

import datetime as dt

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from enermod_api import models

KINDS = {"page_view", "tool_view", "study_view", "country_view", "recommend", "chat", "download", "contribute", "search"}


def record(db: Session, kind: str, path: str, ref: str, locale: str, visitor: str) -> None:
    if kind not in KINDS:
        return
    db.add(models.Event(kind=kind, path=path[:300], ref=str(ref or "")[:200], locale=locale[:8], visitor=visitor))
    db.commit()


def _since(days: int) -> dt.datetime:
    return models.now() - dt.timedelta(days=days)


def popular(db: Session, kind: str, days: int = 30, limit: int = 10) -> list[dict]:
    rows = db.execute(select(models.Event.ref, func.count()).where(models.Event.kind == kind, models.Event.ref != "",
                                                                  models.Event.created_at >= _since(days))
                      .group_by(models.Event.ref).order_by(func.count().desc()).limit(limit)).all()
    return [{"ref": r, "n": n} for r, n in rows]


def summary(db: Session, days: int = 30) -> dict:
    since = _since(days)
    total = db.scalar(select(func.count()).select_from(models.Event).where(models.Event.created_at >= since)) or 0
    visitors = db.scalar(select(func.count(func.distinct(models.Event.visitor))).where(models.Event.created_at >= since,
                                                                                        models.Event.visitor != "")) or 0
    by_kind = dict(db.execute(select(models.Event.kind, func.count()).where(models.Event.created_at >= since)
                              .group_by(models.Event.kind)).all())
    pages = db.execute(select(models.Event.path, func.count()).where(models.Event.kind == "page_view", models.Event.created_at >= since)
                       .group_by(models.Event.path).order_by(func.count().desc()).limit(30)).all()
    # func.date works on SQLite (text) and PostgreSQL (date); substr on a timestamp does not.
    day = func.date(models.Event.created_at)
    daily = db.execute(select(day, func.count()).where(models.Event.created_at >= since).group_by(day).order_by(day)).all()
    locales = dict(db.execute(select(models.Event.locale, func.count()).where(models.Event.created_at >= since)
                              .group_by(models.Event.locale)).all())
    chats = db.scalars(select(models.ChatLog).where(models.ChatLog.created_at >= since)
                       .order_by(models.ChatLog.created_at.desc()).limit(40)).all()
    return {
        "days": days, "events": total, "visitors": visitors, "by_kind": by_kind, "locales": locales,
        "pages": [{"path": p, "n": n} for p, n in pages],
        "daily": [{"day": str(d), "n": n} for d, n in daily],
        "tools": popular(db, "tool_view", days, 15), "studies": popular(db, "study_view", days, 15),
        "countries": popular(db, "country_view", days, 15), "downloads": popular(db, "download", days, 10),
        "chat": {"n": len(chats), "failed": sum(1 for c in chats if not c.ok),
                 "recent": [{"question": c.question[:200], "ok": c.ok, "provider": c.provider, "locale": c.locale,
                             "at": c.created_at.isoformat(), "n_citations": len(c.citations or [])} for c in chats[:20]]},
    }
