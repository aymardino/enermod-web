"""Accounts: register, password login, magic links, password recovery, Google sign-in, profile."""
from __future__ import annotations

import logging
import re
from urllib.parse import quote, urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DBSession

from enermod_api import models, schemas
from enermod_api.config import get_settings
from enermod_api.db import get_db
from enermod_api.deps import current_user, optional_user, rate_limit
from enermod_api.security import expires_in, hash_password, new_token, token_hash, verify_password
from enermod_api.services import email as email_service
from enermod_api.services import google_oauth
from enermod_api.urls import public_base_url

log = logging.getLogger("enermod.auth")
router = APIRouter(prefix="/auth", tags=["auth"])

OAUTH_COOKIE = "enermod_oauth"        # the nonce that ties a Google round trip to this browser
DEFAULT_NEXT = "/contribute"
# one-time links are mailed, so a client may ask for a handful per hour and no more
link_limit = rate_limit(10, "sign-in link")


def role_for(email: str, current: str = "contributor") -> str:
    return "admin" if email.lower() in get_settings().admin_emails else current


def safe_next(path: str | None) -> str:
    """A path inside the site to continue to after signing in; anything else falls back.
    No scheme, no host, no protocol-relative `//`, no control characters, not the API."""
    p = (path or "").strip()
    if not p.startswith("/") or p.startswith("//") or p.startswith("/api") or re.search(r"[\s\\]", p) or ":" in p.split("?")[0]:
        return DEFAULT_NEXT
    return p[:500]


def locale_of(value: str | None) -> str:
    return value if value in ("en", "fr") else "en"


def site_path(locale: str, path: str) -> str:
    """A path of the web app in that language: English URLs carry no prefix."""
    return path if locale == "en" else f"/{locale}{path}"


def start_session(db: DBSession, user: models.User, request: Request, response: Response) -> str:
    s = get_settings()
    token = new_token()
    db.add(models.Session(user_id=user.id, token_hash=token_hash(token),
                          user_agent=request.headers.get("user-agent", "")[:300], expires_at=expires_in(days=s.session_days)))
    user.last_login_at = models.now()
    user.role = role_for(user.email, user.role)
    db.commit()
    response.set_cookie(s.cookie_name, token, max_age=s.session_days * 86400, httponly=True, samesite="lax",
                        secure=s.cookie_secure, path="/")
    return token


def user_out(user: models.User) -> schemas.UserOut:
    return schemas.UserOut(id=user.id, email=user.email, name=user.name, organisation=user.organisation, locale=user.locale,
                           role=user.role, created_at=user.created_at, email_verified=user.email_verified_at is not None)


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(body: schemas.RegisterIn, request: Request, response: Response, db: DBSession = Depends(get_db)):
    email = body.email.lower().strip()
    if db.scalar(select(models.User).where(models.User.email == email)):
        raise HTTPException(409, "An account already exists for this email")
    user = models.User(email=email, name=body.name.strip(), organisation=body.organisation.strip(),
                       password_hash=hash_password(body.password), locale=locale_of(body.locale), role=role_for(email))
    db.add(user)
    db.flush()
    start_session(db, user, request, response)
    return user_out(user)


@router.post("/login", response_model=schemas.UserOut)
def login(body: schemas.LoginIn, request: Request, response: Response, db: DBSession = Depends(get_db)):
    user = db.scalar(select(models.User).where(models.User.email == body.email.lower().strip()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Wrong email or password")
    if not user.is_active:
        raise HTTPException(403, "This account is disabled")
    start_session(db, user, request, response)
    return user_out(user)


@router.post("/logout", response_model=schemas.Ok)
def logout(request: Request, response: Response, db: DBSession = Depends(get_db),
           user: models.User | None = Depends(optional_user)):
    sid = getattr(request.state, "session_id", None)
    if sid:
        db.execute(delete(models.Session).where(models.Session.id == sid))
        db.commit()
    response.delete_cookie(get_settings().cookie_name, path="/")
    return schemas.Ok()


# ── one-time links: sign in by e-mail, recover a lost password ───────────────────
def issue_link(db: DBSession, request: Request, email: str, locale: str, next_path: str | None = None) -> str:
    """Stores a one-time token and returns the web page that redeems it."""
    s = get_settings()
    token = new_token()
    db.add(models.LoginToken(email=email, token_hash=token_hash(token), expires_at=expires_in(minutes=s.magic_link_minutes)))
    db.commit()
    q = {"token": token}
    if next_path:
        q["next"] = next_path
    return f"{public_base_url(request)}{site_path(locale, '/auth/magic')}?{urlencode(q, quote_via=quote)}"


@router.post("/magic-link", dependencies=[Depends(link_limit)])
def magic_link(body: schemas.MagicLinkIn, request: Request, db: DBSession = Depends(get_db)):
    s = get_settings()
    email = body.email.lower().strip()
    url = issue_link(db, request, email, locale_of(body.locale))
    try:
        email_service.send_magic_link(email, url, locale_of(body.locale))
    except email_service.EmailError as e:
        raise HTTPException(502, str(e))
    out = {"ok": True}
    if s.debug:
        out["dev_link"] = url
    return out


@router.post("/password/forgot", dependencies=[Depends(link_limit)])
def password_forgot(body: schemas.MagicLinkIn, request: Request, db: DBSession = Depends(get_db)):
    """Mails a one-time link that signs the person in and lands on the "new password" page.
    The answer is the same whether or not an account exists, so addresses cannot be probed."""
    s = get_settings()
    email = body.email.lower().strip()
    locale = locale_of(body.locale)
    user = db.scalar(select(models.User).where(models.User.email == email))
    url = ""
    if user and user.is_active:
        url = issue_link(db, request, email, locale, next_path="/account/password")
        try:
            email_service.send_password_reset(email, url, locale)
        except email_service.EmailError as e:
            raise HTTPException(502, str(e))
    out = {"ok": True}
    if s.debug and url:
        out["dev_link"] = url
    return out


@router.post("/magic-link/verify", response_model=schemas.UserOut)
def magic_verify(body: schemas.TokenIn, request: Request, response: Response, db: DBSession = Depends(get_db)):
    lt = db.scalar(select(models.LoginToken).where(models.LoginToken.token_hash == token_hash(body.token)))
    now = models.now()
    if not lt or lt.used_at or lt.expires_at < now:
        raise HTTPException(400, "This link is invalid or has expired")
    lt.used_at = now
    user = db.scalar(select(models.User).where(models.User.email == lt.email))
    if not user:
        user = models.User(email=lt.email, name="", password_hash=None, role=role_for(lt.email))
        db.add(user)
        db.flush()
    if not user.is_active:
        raise HTTPException(403, "This account is disabled")
    if not user.email_verified_at:
        user.email_verified_at = now
    start_session(db, user, request, response)
    return user_out(user)


# ── Google ───────────────────────────────────────────────────────────────────────
def google_redirect_uri(request: Request) -> str:
    # the browser reaches the API through the web app's /api proxy, so the callback lives there
    return f"{public_base_url(request)}/api/auth/google/callback"


@router.get("/google/start")
def google_start(request: Request, next: str | None = None, locale: str | None = None):
    """Sends the browser to Google. `next` is the page to continue to afterwards."""
    if not google_oauth.configured():
        raise HTTPException(404, "Google sign-in is not configured on this server")
    s = get_settings()
    nonce = new_token(16)
    state = google_oauth.make_state(safe_next(next), nonce, locale_of(locale))
    resp = RedirectResponse(google_oauth.authorize_url(google_redirect_uri(request), state), status_code=302)
    resp.set_cookie(OAUTH_COOKIE, nonce, max_age=google_oauth.STATE_MAX_AGE, httponly=True, samesite="lax",
                    secure=s.cookie_secure, path="/")
    return resp


@router.get("/google/callback")
def google_callback(request: Request, db: DBSession = Depends(get_db), code: str = "", state: str = "", error: str = ""):
    """Back from Google: checks the state against this browser's nonce, exchanges the code,
    signs the verified e-mail in (creating the account on first visit) and redirects."""
    base = public_base_url(request)
    data = google_oauth.read_state(state) or {}
    locale = locale_of(data.get("l"))

    def failed(reason: str) -> RedirectResponse:
        log.warning("google sign-in failed: %s", reason)
        r = RedirectResponse(f"{base}{site_path(locale, '/sign-in')}?error=google", status_code=302)
        r.delete_cookie(OAUTH_COOKIE, path="/")
        return r

    if not google_oauth.configured():
        return failed("not configured")
    if not data or not data.get("c") or data.get("c") != request.cookies.get(OAUTH_COOKIE):
        return failed("state mismatch")
    if error or not code:
        return failed(error or "no code")
    try:
        tokens = google_oauth.exchange_code(code, google_redirect_uri(request))
        info = google_oauth.fetch_userinfo(str(tokens.get("access_token", "")))
    except google_oauth.OAuthError as e:
        return failed(str(e))
    email = str(info.get("email", "")).lower().strip()
    if not email or not info.get("email_verified"):
        return failed("e-mail not verified by Google")

    now = models.now()
    user = db.scalar(select(models.User).where(models.User.email == email))
    if not user:
        user = models.User(email=email, name=str(info.get("name", ""))[:200], password_hash=None, role=role_for(email),
                           locale=locale)
        db.add(user)
        db.flush()
    elif not user.name and info.get("name"):
        user.name = str(info["name"])[:200]
    if not user.is_active:
        return failed("account disabled")
    if not user.email_verified_at:
        user.email_verified_at = now
    resp = RedirectResponse(f"{base}{site_path(locale, safe_next(data.get('n')))}", status_code=302)
    resp.delete_cookie(OAUTH_COOKIE, path="/")
    start_session(db, user, request, resp)
    return resp


# ── profile ──────────────────────────────────────────────────────────────────────
@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(current_user)):
    return user_out(user)


@router.get("/session")
def session(user: models.User | None = Depends(optional_user)):
    """Who is signed in, if anyone: a 200 for visitors too, so pages can ask without an error."""
    return {"user": user_out(user) if user else None}


@router.patch("/me", response_model=schemas.UserOut)
def update_me(body: schemas.UserUpdate, request: Request, user: models.User = Depends(current_user), db: DBSession = Depends(get_db)):
    if body.name is not None:
        user.name = body.name.strip()
    if body.organisation is not None:
        user.organisation = body.organisation.strip()
    if body.locale in ("en", "fr"):
        user.locale = body.locale
    if body.password:
        user.password_hash = hash_password(body.password)
        # a new password signs every other browser out; this one keeps its session
        sid = getattr(request.state, "session_id", None)
        db.execute(delete(models.Session).where(models.Session.user_id == user.id, models.Session.id != sid))
    db.commit()
    return user_out(user)


@router.get("/providers")
def providers():
    return {"email": email_service.available(), "password": True, "google": google_oauth.configured()}
