"""Pydantic request models (responses are plain dicts built by the services)."""
from __future__ import annotations

import datetime as dt
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator


class Ok(BaseModel):
    ok: bool = True


# ── Auth ────────────────────────────────────────────────────────────────────────
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    name: str = Field(default="", max_length=200)
    organisation: str = Field(default="", max_length=300)
    locale: str = "en"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class MagicLinkIn(BaseModel):
    email: EmailStr
    locale: str = "en"


class TokenIn(BaseModel):
    token: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    organisation: str
    locale: str
    role: str
    created_at: dt.datetime
    email_verified: bool = False


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    organisation: str | None = Field(default=None, max_length=300)
    locale: str | None = None
    password: str | None = Field(default=None, min_length=8, max_length=200)


class RoleIn(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def _role(cls, v):
        if v not in ("contributor", "curator", "admin"):
            raise ValueError("role must be contributor, curator or admin")
        return v


# ── Public ──────────────────────────────────────────────────────────────────────
class RecommendIn(BaseModel):
    objective: str | None = None
    scale: str | None = None
    budget: str | None = None
    capacity: str | None = None
    horizon: str | None = None
    data: str | None = None
    extras: list[str] = []
    limit: int = Field(default=8, ge=1, le=30)


class ChatMessage(BaseModel):
    role: str
    content: str = Field(max_length=4000)


class ChatIn(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)
    locale: str = "en"
    context: str = Field(default="", max_length=4000)


class ContributionIn(BaseModel):
    kind: str = "study"                                   # study | correction | tool
    payload: dict[str, Any] = {}
    message: str = Field(default="", max_length=4000)
    submitter_name: str = Field(default="", max_length=200)
    submitter_email: str = Field(default="", max_length=320)
    submitter_org: str = Field(default="", max_length=300)
    target_study_id: int | None = None
    target_tool_name: str = Field(default="", max_length=120)
    locale: str = "en"
    website: str = ""                                     # honeypot: must stay empty

    @field_validator("kind")
    @classmethod
    def _kind(cls, v):
        if v not in ("study", "correction", "tool"):
            raise ValueError("kind must be study, correction or tool")
        return v


class EventIn(BaseModel):
    kind: str = Field(max_length=30)
    path: str = Field(default="", max_length=300)
    ref: str = Field(default="", max_length=200)
    locale: str = Field(default="", max_length=8)


# ── Admin ───────────────────────────────────────────────────────────────────────
class ReviewIn(BaseModel):
    note: str = Field(default="", max_length=2000)


class ContributionEdit(BaseModel):
    payload: dict[str, Any] | None = None
    message: str | None = None


class CandidateUpdate(BaseModel):
    status: str | None = None                             # new | relevant | irrelevant | imported | known
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("status")
    @classmethod
    def _status(cls, v):
        if v is not None and v not in ("new", "relevant", "irrelevant", "imported", "known"):
            raise ValueError("unexpected status")
        return v


class DiscoveryRunIn(BaseModel):
    mode: str = "since"                                   # since | full
    since: str | None = None                              # YYYY-MM-DD


class ToolEdit(BaseModel):
    fields: dict[str, Any]


class StudyEdit(BaseModel):
    fields: dict[str, Any]
    tools: list[str] | None = None
    countries: list[str] | None = None
