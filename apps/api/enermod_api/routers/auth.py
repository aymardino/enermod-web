"""Accounts: register, password login, magic links, profile."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DBSession

from enermod_api import models, schemas
from enermod_api.config import get_settings
from enermod_api.db import get_db
from enermod_api.deps import current_user, optional_user
from enermod_api.security import expires_in, hash_password, new_token, token_hash, verify_password
from enermod_api.services import email as email_service
from enermod_api.urls import public_base_url

log = logging.getLogger("enermod.auth")
router = APIRouter(prefix="/auth", tags=["auth"])


def role_for(email: str, current: str = "contributor") -> str:
    return "admin" if email.lower() in get_settings().admin_emails else current


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
                       password_hash=hash_password(body.password), locale=body.locale if body.locale in ("en", "fr") else "en",
                       role=role_for(email))
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


@router.post("/magic-link")
def magic_link(body: schemas.MagicLinkIn, request: Request, db: DBSession = Depends(get_db)):
    s = get_settings()
    email = body.email.lower().strip()
    token = new_token()
    db.add(models.LoginToken(email=email, token_hash=token_hash(token), expires_at=expires_in(minutes=s.magic_link_minutes)))
    db.commit()
    url = f"{public_base_url(request)}/auth/magic?token={token}"
    try:
        email_service.send_magic_link(email, url, body.locale if body.locale in ("en", "fr") else "en")
    except email_service.EmailError as e:
        raise HTTPException(502, str(e))
    out = {"ok": True}
    if s.debug:
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
    if not user.email_verified_at:
        user.email_verified_at = now
    start_session(db, user, request, response)
    return user_out(user)


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(current_user)):
    return user_out(user)


@router.get("/session")
def session(user: models.User | None = Depends(optional_user)):
    """Who is signed in, if anyone: a 200 for visitors too, so pages can ask without an error."""
    return {"user": user_out(user) if user else None}


@router.patch("/me", response_model=schemas.UserOut)
def update_me(body: schemas.UserUpdate, user: models.User = Depends(current_user), db: DBSession = Depends(get_db)):
    if body.name is not None:
        user.name = body.name.strip()
    if body.organisation is not None:
        user.organisation = body.organisation.strip()
    if body.locale in ("en", "fr"):
        user.locale = body.locale
    if body.password:
        user.password_hash = hash_password(body.password)
    db.commit()
    return user_out(user)


@router.get("/providers")
def providers():
    return {"email": email_service.available(), "password": True}
