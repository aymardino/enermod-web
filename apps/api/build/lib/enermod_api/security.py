"""Passwords, session tokens, one-time tokens, visitor hashing."""
from __future__ import annotations

import datetime as dt
import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from enermod_api.config import get_settings

_ph = PasswordHasher()


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return _ph.verify(password_hash, password)
    except VerifyMismatchError:
        return False
    except Exception:            # noqa: BLE001  (corrupt hash)
        return False


def new_token(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def expires_in(**kw) -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(tzinfo=None) + dt.timedelta(**kw)


def visitor_hash(ip: str, user_agent: str) -> str:
    """Daily rotating, salted hash: lets us count distinct visitors without storing anyone."""
    day = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")
    raw = f"{get_settings().analytics_salt}|{day}|{ip}|{user_agent[:80]}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]
