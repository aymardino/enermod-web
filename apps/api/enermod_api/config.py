"""Settings, all from environment variables (a .env file is read if present)."""
from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parents[3]


def _bool(v: str | None, default: bool = False) -> bool:
    return default if v is None else v.strip().lower() in ("1", "true", "yes", "on")


def _normalise_db_url(url: str) -> str:
    """Managed PostgreSQL providers (Supabase, Render, Heroku…) hand out postgres:// or
    postgresql:// URLs; SQLAlchemy needs the psycopg 3 driver spelled out."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


class Settings:
    def __init__(self) -> None:
        self.env = os.environ.get("ENERMOD_ENV", "development")          # development | test | production
        self.debug = self.env != "production"
        self.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")
        self.database_url = _normalise_db_url(os.environ.get("DATABASE_URL", "sqlite:///./enermod_hub.db"))
        # Seed data: the SQLite database built from the master workbook (data/enermod.db at the
        # repository root) and the workbook itself. Loaded automatically when the studies table is empty.
        self.seed_sqlite = Path(os.environ.get("SEED_SQLITE", str(REPO_ROOT / "data" / "enermod.db")))
        self.seed_workbook = Path(os.environ.get("SEED_WORKBOOK", str(REPO_ROOT / "data" / "Models_Africa_v2.xlsm")))
        self.seed_on_startup = _bool(os.environ.get("SEED_ON_STARTUP"), True)
        # Public URLs. Browsers reach the API through the web app's /api proxy.
        self.base_url = os.environ.get("BASE_URL", "http://localhost:3000").rstrip("/")
        self.base_url_explicit = bool(os.environ.get("BASE_URL"))
        self.cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", self.base_url).split(",") if o.strip()]
        self.cookie_name = "enermod_session"
        self.cookie_secure = _bool(os.environ.get("COOKIE_SECURE"), self.env == "production")
        self.session_days = int(os.environ.get("SESSION_DAYS", "30"))
        self.magic_link_minutes = int(os.environ.get("MAGIC_LINK_MINUTES", "20"))
        # People allowed to curate: comma-separated e-mails become admins when they sign in.
        self.admin_emails = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}
        # E-mail (magic links, contribution notifications)
        self.email_provider = os.environ.get("EMAIL_PROVIDER", "console")          # console | resend | smtp
        self.email_from = os.environ.get("EMAIL_FROM", "EnerMod Africa <no-reply@enermod.africa>")
        self.notify_email = os.environ.get("NOTIFY_EMAIL", "")                     # curators' inbox for new contributions
        self.resend_api_key = os.environ.get("RESEND_API_KEY", "")
        self.smtp_host = os.environ.get("SMTP_HOST", "")
        self.smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        self.smtp_user = os.environ.get("SMTP_USER", "")
        self.smtp_password = os.environ.get("SMTP_PASSWORD", "")
        self.smtp_starttls = _bool(os.environ.get("SMTP_STARTTLS"), True)
        self.smtp_tls = os.environ.get("SMTP_TLS", "").strip().lower()
        # Assistant
        self.ai_provider = os.environ.get("AI_PROVIDER", "auto")                     # auto | claude | gemini | deepseek | none
        self.ai_model = os.environ.get("AI_MODEL", "")                               # empty = provider default
        self.ai_effort = os.environ.get("AI_EFFORT", "low")                           # Claude: low | medium | high
        self.ai_keys = {
            "claude": os.environ.get("ANTHROPIC_API_KEY", ""),
            "gemini": os.environ.get("GEMINI_API_KEY", ""),
            "deepseek": os.environ.get("DEEPSEEK_API_KEY", ""),
        }
        self.chat_per_hour = int(os.environ.get("CHAT_PER_HOUR", "40"))              # per visitor
        self.chat_max_output_tokens = int(os.environ.get("CHAT_MAX_OUTPUT_TOKENS", "4000"))
        # Discovery (OpenAlex)
        self.openalex_mailto = os.environ.get("OPENALEX_MAILTO", "")
        self.discovery_from_year = int(os.environ.get("DISCOVERY_FROM_YEAR", "2000"))
        self.discovery_interval_days = int(os.environ.get("DISCOVERY_INTERVAL_DAYS", "7"))
        self.discovery_auto = _bool(os.environ.get("DISCOVERY_AUTO"), False)
        self.discovery_max_pages = int(os.environ.get("DISCOVERY_MAX_PAGES", "25"))     # per query chunk, 200 works each
        # Tool repository metrics (GitHub)
        self.github_token = os.environ.get("GITHUB_TOKEN", "")
        self.metrics_interval_days = int(os.environ.get("METRICS_INTERVAL_DAYS", "30"))
        self.metrics_auto = _bool(os.environ.get("METRICS_AUTO"), False)
        # Survey connector: a published Google Sheet (CSV) or any CSV URL, with a column mapping
        self.survey_csv_url = os.environ.get("SURVEY_CSV_URL", "")
        try:
            self.survey_field_map = json.loads(os.environ.get("SURVEY_FIELD_MAP", "") or "{}")
        except json.JSONDecodeError:
            self.survey_field_map = {}
        self.inline_jobs = _bool(os.environ.get("INLINE_JOBS"), self.env != "production")
        self.contributions_per_hour = int(os.environ.get("CONTRIBUTIONS_PER_HOUR", "10"))
        self.analytics_salt = os.environ.get("ANALYTICS_SALT", self.secret_key)

    @property
    def is_test(self) -> bool:
        return self.env == "test"


@lru_cache
def get_settings() -> Settings:
    return Settings()
