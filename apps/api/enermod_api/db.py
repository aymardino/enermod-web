"""SQLAlchemy engine and session. PostgreSQL (Supabase) in production, SQLite elsewhere."""
from __future__ import annotations

import logging

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from enermod_api.config import get_settings


log = logging.getLogger("enermod.db")


class Base(DeclarativeBase):
    pass


_engine = None
_SessionLocal: sessionmaker | None = None


def get_engine():
    global _engine, _SessionLocal
    if _engine is None:
        url = get_settings().database_url
        kwargs = {"pool_pre_ping": True}
        if url.startswith("sqlite"):
            kwargs["connect_args"] = {"check_same_thread": False, "timeout": 15}
        _engine = create_engine(url, **kwargs)
        if url.startswith("sqlite"):
            @event.listens_for(_engine, "connect")
            def _pragmas(dbapi_con, _):
                dbapi_con.execute("PRAGMA foreign_keys=ON")
                dbapi_con.execute("PRAGMA journal_mode=WAL")
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, expire_on_commit=False)
    return _engine


def session_factory() -> sessionmaker:
    get_engine()
    return _SessionLocal  # type: ignore[return-value]


def reset_engine() -> None:
    """Tests swap DATABASE_URL between runs."""
    global _engine, _SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine, _SessionLocal = None, None


def create_all() -> None:
    from enermod_api import models  # noqa: F401  (registers the tables)
    Base.metadata.create_all(get_engine())
    ensure_columns()


def _literal(value) -> str:
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def ensure_columns() -> int:
    """Adds the columns the models declare and an existing database lacks (create_all never
    touches a table that exists). Enough for additive changes on SQLite and PostgreSQL; a
    column with a plain default gets it, so existing rows stay valid. Returns the number added."""
    engine = get_engine()
    insp = inspect(engine)
    added = 0
    with engine.begin() as con:
        for table in Base.metadata.sorted_tables:
            if not insp.has_table(table.name):
                continue
            have = {c["name"] for c in insp.get_columns(table.name)}
            for col in table.columns:
                if col.name in have:
                    continue
                ddl = f"ALTER TABLE {table.name} ADD COLUMN {col.name} {col.type.compile(engine.dialect)}"
                default = col.default.arg if col.default is not None and not callable(col.default.arg) else None
                if default is not None:
                    ddl += f" DEFAULT {_literal(default)}"
                    if not col.nullable:
                        ddl += " NOT NULL"
                con.execute(text(ddl))
                if col.index:
                    con.execute(text(f"CREATE INDEX IF NOT EXISTS ix_{table.name}_{col.name} ON {table.name} ({col.name})"))
                log.info("added column %s.%s", table.name, col.name)
                added += 1
    return added


def get_db():
    db: Session = session_factory()()
    try:
        yield db
    finally:
        db.close()
