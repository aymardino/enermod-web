"""Database model.

The observatory tables mirror the master workbook (studies, tools, countries, power pools
and the three link tables) so the data layer of the thesis carries over unchanged. The
other tables are what the hub adds: accounts and roles, contributions, discovery runs and
candidates, tool repository metrics, usage events, assistant logs, jobs and settings.
"""
from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from enermod_api.db import Base


def new_id() -> str:
    return str(uuid.uuid4())


def now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)


# ── Observatory data (from the master workbook) ─────────────────────────────────
class Country(Base):
    __tablename__ = "countries"
    iso_code: Mapped[str] = mapped_column(String(2), primary_key=True)
    iso3: Mapped[str] = mapped_column(String(3), default="")
    country_name: Mapped[str] = mapped_column(String(120), default="")
    power_pool: Mapped[str] = mapped_column(String(40), default="")
    region: Mapped[str] = mapped_column(String(20), default="")
    language: Mapped[str] = mapped_column(String(20), default="")
    nb_models_applied: Mapped[int] = mapped_column(Integer, default=0)
    energy_governance: Mapped[str] = mapped_column(String(20), default="")
    rise_governance_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    data_availability: Mapped[str] = mapped_column(String(20), default="")
    data_transparency_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    electrification_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    electrification_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    has_ndc: Mapped[str] = mapped_column(String(5), default="")
    has_lts: Mapped[str] = mapped_column(String(5), default="")


class PowerPool(Base):
    __tablename__ = "power_pools"
    pool_code: Mapped[str] = mapped_column(String(20), primary_key=True)
    pool_name: Mapped[str] = mapped_column(String(120), default="")
    member_countries: Mapped[str] = mapped_column(Text, default="")
    nb_models_applied: Mapped[int] = mapped_column(Integer, default=0)


class Tool(Base):
    __tablename__ = "tools"
    tool_name: Mapped[str] = mapped_column(String(120), primary_key=True)
    full_name: Mapped[str] = mapped_column(Text, default="")
    type: Mapped[str] = mapped_column(String(60), default="")
    origin_country: Mapped[str] = mapped_column(String(60), default="")
    origin_institution: Mapped[str] = mapped_column(Text, default="")
    license: Mapped[str] = mapped_column(String(40), default="")
    cost_usd: Mapped[str] = mapped_column(String(60), default="")
    free_for_developing: Mapped[str] = mapped_column(String(20), default="")
    learning_curve: Mapped[str] = mapped_column(String(20), default="")
    doc_quality: Mapped[str] = mapped_column(String(20), default="")
    training_available: Mapped[str] = mapped_column(String(20), default="")
    community: Mapped[str] = mapped_column(String(20), default="")
    programming_required: Mapped[str] = mapped_column(String(20), default="")
    helpdesk: Mapped[str] = mapped_column(String(20), default="")
    os: Mapped[str] = mapped_column(String(60), default="")
    nb_studies_in_inventory: Mapped[int] = mapped_column(Integer, default=0)
    best_for: Mapped[str] = mapped_column(Text, default="")
    clean_cooking_capable: Mapped[str] = mapped_column(String(20), default="")
    financing_modelling: Mapped[str] = mapped_column(String(20), default="")
    time_horizon: Mapped[str] = mapped_column(String(80), default="")
    scale: Mapped[str] = mapped_column(String(120), default="")
    data_intensity: Mapped[str] = mapped_column(String(20), default="")
    proprietary_dependency: Mapped[str] = mapped_column(Text, default="")
    info_source: Mapped[str] = mapped_column(Text, default="")
    info_date: Mapped[str] = mapped_column(String(40), default="")
    strengths: Mapped[str] = mapped_column(Text, default="")
    weaknesses: Mapped[str] = mapped_column(Text, default="")
    typical_results: Mapped[str] = mapped_column(Text, default="")
    often_linked: Mapped[str] = mapped_column(Text, default="")
    # Hub additions (tool tracker)
    repo_url: Mapped[str] = mapped_column(Text, default="")
    website_url: Mapped[str] = mapped_column(Text, default="")
    tracker_url: Mapped[str] = mapped_column(Text, default="")        # optional external profile of the tool, not shown on the site
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now, onupdate=now)


STUDY_TEXT_FIELDS = [
    "authors", "model_name", "extraction_level", "study_category", "study_type", "scale",
    "nb_countries_covered", "study_objective", "key_result", "time_horizon", "time_horizon_start",
    "time_horizon_end", "approach", "method", "mathematical_approach", "hydro", "solar", "wind",
    "biomass", "nuclear", "geothermal", "fossil", "h2", "coal", "other_technologies", "sector",
    "open_source", "data_requirements", "sdg_7", "sdg_13", "ndc_mention", "agenda_2063",
    "aisesa_theme", "informal_economy", "biomass_charcoal", "clean_cooking", "power_reliability",
    "urbanization", "strengths", "weaknesses", "authors_affiliation", "author_origin",
    "local_ownership", "institutional_users", "grey_literature", "cost_of_capital", "coc_type",
    "financing_modelling", "financing_mechanism", "full_title", "link_doi", "contact",
    "other_references",
]


class Study(Base):
    __tablename__ = "studies"
    study_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    authors: Mapped[str] = mapped_column(Text, default="")
    model_name: Mapped[str] = mapped_column(Text, default="")
    extraction_level: Mapped[str] = mapped_column(String(20), default="")          # full | light
    study_category: Mapped[str] = mapped_column(Text, default="")
    year: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    study_type: Mapped[str] = mapped_column(String(60), default="")
    scale: Mapped[str] = mapped_column(String(40), default="")
    nb_countries_covered: Mapped[str] = mapped_column(String(20), default="")
    study_objective: Mapped[str] = mapped_column(Text, default="")
    key_result: Mapped[str] = mapped_column(Text, default="")
    time_horizon: Mapped[str] = mapped_column(String(60), default="")
    time_horizon_start: Mapped[str] = mapped_column(String(20), default="")
    time_horizon_end: Mapped[str] = mapped_column(String(20), default="")
    approach: Mapped[str] = mapped_column(String(40), default="")
    method: Mapped[str] = mapped_column(String(80), default="")
    mathematical_approach: Mapped[str] = mapped_column(Text, default="")
    hydro: Mapped[str] = mapped_column(String(10), default="")
    solar: Mapped[str] = mapped_column(String(10), default="")
    wind: Mapped[str] = mapped_column(String(10), default="")
    biomass: Mapped[str] = mapped_column(String(10), default="")
    nuclear: Mapped[str] = mapped_column(String(10), default="")
    geothermal: Mapped[str] = mapped_column(String(10), default="")
    fossil: Mapped[str] = mapped_column(String(10), default="")
    h2: Mapped[str] = mapped_column(String(10), default="")
    coal: Mapped[str] = mapped_column(String(10), default="")
    other_technologies: Mapped[str] = mapped_column(Text, default="")
    sector: Mapped[str] = mapped_column(String(80), default="")
    open_source: Mapped[str] = mapped_column(String(20), default="")
    data_requirements: Mapped[str] = mapped_column(Text, default="")
    sdg_7: Mapped[str] = mapped_column(String(10), default="")
    sdg_13: Mapped[str] = mapped_column(String(10), default="")
    ndc_mention: Mapped[str] = mapped_column(String(10), default="")
    agenda_2063: Mapped[str] = mapped_column(String(10), default="")
    aisesa_theme: Mapped[str] = mapped_column(Text, default="")
    informal_economy: Mapped[str] = mapped_column(String(10), default="")
    biomass_charcoal: Mapped[str] = mapped_column(String(10), default="")
    clean_cooking: Mapped[str] = mapped_column(String(10), default="")
    power_reliability: Mapped[str] = mapped_column(String(10), default="")
    urbanization: Mapped[str] = mapped_column(String(10), default="")
    strengths: Mapped[str] = mapped_column(Text, default="")
    weaknesses: Mapped[str] = mapped_column(Text, default="")
    authors_affiliation: Mapped[str] = mapped_column(Text, default="")
    author_origin: Mapped[str] = mapped_column(Text, default="")
    local_ownership: Mapped[str] = mapped_column(String(10), default="")
    institutional_users: Mapped[str] = mapped_column(Text, default="")
    grey_literature: Mapped[str] = mapped_column(String(10), default="")
    cost_of_capital: Mapped[str] = mapped_column(Text, default="")
    coc_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    coc_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    coc_type: Mapped[str] = mapped_column(String(20), default="")
    financing_modelling: Mapped[str] = mapped_column(String(10), default="")
    financing_mechanism: Mapped[str] = mapped_column(Text, default="")
    full_title: Mapped[str] = mapped_column(Text, default="")
    link_doi: Mapped[str] = mapped_column(Text, default="")
    contact: Mapped[str] = mapped_column(Text, default="")
    other_references: Mapped[str] = mapped_column(Text, default="")
    # Hub additions
    doi: Mapped[str] = mapped_column(String(300), default="", index=True)          # bare, lower-case, for matching
    source: Mapped[str] = mapped_column(String(20), default="review")               # review | contribution | krinea | survey
    status: Mapped[str] = mapped_column(String(20), default="published", index=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now, onupdate=now)


class StudyTool(Base):
    __tablename__ = "study_tools"
    study_id: Mapped[int] = mapped_column(ForeignKey("studies.study_id", ondelete="CASCADE"), primary_key=True)
    tool_name: Mapped[str] = mapped_column(String(120), primary_key=True)
    type: Mapped[str] = mapped_column(String(60), default="")


class StudyCountry(Base):
    __tablename__ = "study_countries"
    study_id: Mapped[int] = mapped_column(ForeignKey("studies.study_id", ondelete="CASCADE"), primary_key=True)
    iso_code: Mapped[str] = mapped_column(String(2), primary_key=True)
    iso3: Mapped[str] = mapped_column(String(3), default="")
    country: Mapped[str] = mapped_column(String(120), default="")


class StudyPool(Base):
    __tablename__ = "study_pools"
    study_id: Mapped[int] = mapped_column(ForeignKey("studies.study_id", ondelete="CASCADE"), primary_key=True)
    pool_code: Mapped[str] = mapped_column(String(20), primary_key=True)


# ── Accounts ────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    organisation: Mapped[str] = mapped_column(String(300), default="")
    password_hash: Mapped[str | None] = mapped_column(String(300), nullable=True)
    locale: Mapped[str] = mapped_column(String(8), default="en")
    role: Mapped[str] = mapped_column(String(20), default="contributor")          # contributor | curator | admin
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    email_verified_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
    last_login_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)


class Session(Base):
    __tablename__ = "sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_agent: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
    expires_at: Mapped[dt.datetime] = mapped_column(DateTime)


class LoginToken(Base):
    """Magic-link one-time tokens."""
    __tablename__ = "login_tokens"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(320), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
    expires_at: Mapped[dt.datetime] = mapped_column(DateTime)
    used_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)


# ── Community: contributions, discovery, imports ─────────────────────────────────
class Contribution(Base):
    """Anything a person or a pipeline proposes to add or change, waiting for a curator."""
    __tablename__ = "contributions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    kind: Mapped[str] = mapped_column(String(20), index=True)                      # study | correction | tool
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)  # pending | approved | rejected
    source: Mapped[str] = mapped_column(String(20), default="form")                 # form | krinea | survey | discovery
    payload: Mapped[dict] = mapped_column(JSON, default=dict)                       # study fields, tool fields or correction
    message: Mapped[str] = mapped_column(Text, default="")
    submitter_name: Mapped[str] = mapped_column(String(200), default="")
    submitter_email: Mapped[str] = mapped_column(String(320), default="")
    submitter_org: Mapped[str] = mapped_column(String(300), default="")
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    target_study_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_tool_name: Mapped[str] = mapped_column(String(120), default="")
    match_study_id: Mapped[int | None] = mapped_column(Integer, nullable=True)       # an existing study this may duplicate
    match_note: Mapped[str] = mapped_column(String(200), default="")
    created_study_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    review_note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now, index=True)


class DiscoveryRun(Base):
    __tablename__ = "discovery_runs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    mode: Mapped[str] = mapped_column(String(20), default="since")                  # since | full
    since_date: Mapped[str] = mapped_column(String(10), default="")
    status: Mapped[str] = mapped_column(String(20), default="running")              # running | done | failed
    n_fetched: Mapped[int] = mapped_column(Integer, default=0)
    n_new: Mapped[int] = mapped_column(Integer, default=0)
    n_known: Mapped[int] = mapped_column(Integer, default=0)
    n_queries: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str] = mapped_column(Text, default="")
    started_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
    finished_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)


class Candidate(Base):
    """A work found by the discovery pipeline that is not (yet) in the corpus."""
    __tablename__ = "candidates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str | None] = mapped_column(ForeignKey("discovery_runs.id", ondelete="SET NULL"), nullable=True)
    openalex_id: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    doi: Mapped[str] = mapped_column(String(300), default="", index=True)
    title: Mapped[str] = mapped_column(Text, default="")
    abstract: Mapped[str] = mapped_column(Text, default="")
    authors: Mapped[str] = mapped_column(Text, default="")
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    venue: Mapped[str] = mapped_column(Text, default="")
    url: Mapped[str] = mapped_column(Text, default="")
    oa_url: Mapped[str] = mapped_column(Text, default="")
    cited_by: Mapped[int] = mapped_column(Integer, default=0)
    work_type: Mapped[str] = mapped_column(String(40), default="")
    language: Mapped[str] = mapped_column(String(10), default="")
    status: Mapped[str] = mapped_column(String(20), default="new", index=True)       # new | relevant | irrelevant | imported | known
    match_study_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    match_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    # screening aid (services/screening.py): score on title and abstract, and the words behind it
    relevance: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    signals: Mapped[str] = mapped_column(Text, default="")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now, onupdate=now)


class ToolMetric(Base):
    """Snapshot of a tool's public repository activity."""
    __tablename__ = "tool_metrics"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tool_name: Mapped[str] = mapped_column(String(120), index=True)
    repo_url: Mapped[str] = mapped_column(Text, default="")
    stars: Mapped[int | None] = mapped_column(Integer, nullable=True)
    forks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    open_issues: Mapped[int | None] = mapped_column(Integer, nullable=True)
    contributors: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_commit_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    repo_license: Mapped[str] = mapped_column(String(80), default="")
    language: Mapped[str] = mapped_column(String(60), default="")
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    fetched_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now, index=True)
    error: Mapped[str] = mapped_column(Text, default="")


# ── Usage, assistant, jobs ──────────────────────────────────────────────────────
class Event(Base):
    """Privacy-friendly usage event: no IP, no cookie, a daily rotating visitor hash."""
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kind: Mapped[str] = mapped_column(String(30), index=True)      # page_view | tool_view | study_view | country_view | recommend | chat | download | contribute
    path: Mapped[str] = mapped_column(String(300), default="")
    ref: Mapped[str] = mapped_column(String(200), default="")      # tool name, study id, country code…
    locale: Mapped[str] = mapped_column(String(8), default="")
    visitor: Mapped[str] = mapped_column(String(32), default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now, index=True)
    __table_args__ = (Index("ix_events_kind_created", "kind", "created_at"),)


class ChatLog(Base):
    __tablename__ = "chat_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question: Mapped[str] = mapped_column(Text, default="")
    answer: Mapped[str] = mapped_column(Text, default="")
    provider: Mapped[str] = mapped_column(String(20), default="")
    model: Mapped[str] = mapped_column(String(80), default="")
    locale: Mapped[str] = mapped_column(String(8), default="")
    citations: Mapped[list] = mapped_column(JSON, default=list)
    ok: Mapped[bool] = mapped_column(Boolean, default=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now, index=True)


class Job(Base):
    """Database-backed job queue: discovery runs, metrics refreshes, survey syncs."""
    __tablename__ = "jobs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    kind: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default="queued", index=True)   # queued | running | done | failed
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    result: Mapped[dict] = mapped_column(JSON, default=dict)
    error: Mapped[str] = mapped_column(Text, default="")
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
    started_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)


class Setting(Base):
    """Small key/value store for operational state (last discovery date, survey mapping…)."""
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now, onupdate=now)
    __table_args__ = (UniqueConstraint("key"),)
