"""FastAPI dependencies: database session, current user, roles, rate limiting."""
from __future__ import annotations

import datetime as dt
import threading
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from enermod_api import models
from enermod_api.config import get_settings
from enermod_api.db import get_db
from enermod_api.security import token_hash
from enermod_api.urls import client_ip

ROLE_RANK = {"contributor": 0, "curator": 1, "admin": 2}


def _token_from_request(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return request.cookies.get(get_settings().cookie_name)


def optional_user(request: Request, db: DBSession = Depends(get_db)) -> models.User | None:
    token = _token_from_request(request)
    if not token:
        return None
    sess = db.scalar(select(models.Session).where(models.Session.token_hash == token_hash(token)))
    if not sess or sess.expires_at < dt.datetime.now(dt.timezone.utc).replace(tzinfo=None):
        return None
    user = db.get(models.User, sess.user_id)
    if not user or not user.is_active:
        return None
    request.state.session_id = sess.id
    return user


def current_user(user: models.User | None = Depends(optional_user)) -> models.User:
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    return user


class RequireRole:
    """`Depends(RequireRole("curator"))`: the caller must hold at least this role."""

    def __init__(self, min_role: str):
        self.min_role = min_role

    def __call__(self, user: models.User = Depends(current_user)) -> models.User:
        if ROLE_RANK.get(user.role, 0) < ROLE_RANK[self.min_role]:
            raise HTTPException(403, f"This action needs the {self.min_role} role")
        return user


class RateLimiter:
    """In-memory sliding window per client, enough for one API process behind the web proxy."""

    def __init__(self, per_hour: int, name: str):
        self.per_hour, self.name = per_hour, name
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def __call__(self, request: Request) -> None:
        if get_settings().is_test and request.headers.get("x-test-ratelimit") != "on":
            return
        key = client_ip(request)
        now = time.time()
        with self._lock:
            q = self._hits[key]
            while q and q[0] < now - 3600:
                q.popleft()
            if len(q) >= self.per_hour:
                raise HTTPException(429, f"Too many {self.name} requests, try again later")
            q.append(now)


def rate_limit(per_hour: int, name: str):
    return RateLimiter(per_hour, name)
