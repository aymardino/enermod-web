"""Load the observatory data into the hub database.

Two sources, same result:
  * the SQLite database built by the legacy `build_database.py` (data/enermod.db), the default;
  * the master workbook itself (data/Models_Africa_v2.xlsm), ported from build_database.py.

    python -m enermod_api.seed                       # from data/enermod.db, only if the tables are empty
    python -m enermod_api.seed --reset               # wipe the observatory tables first
    python -m enermod_api.seed --workbook path.xlsm  # from the workbook
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import sqlite3
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from enermod_api import models
from enermod_api.config import get_settings
from enermod_api.db import create_all, session_factory
from enermod_api.services.biblio import clean_doi
from enermod_api.services.data import ISO2_TO_ISO3, invalidate

log = logging.getLogger("enermod.seed")

OBSERVATORY_TABLES = [models.StudyTool, models.StudyCountry, models.StudyPool, models.Study, models.Tool,
                      models.PowerPool, models.Country]


def _num(v, cast=float):
    if v is None:
        return None
    t = str(v).strip().replace("?", "").replace(",", "")
    if t in ("", "nan", "None", "NA") and cast is not int:
        return None
    try:
        return cast(float(t))
    except (TypeError, ValueError):
        return None


def _txt(v) -> str:
    if v is None:
        return ""
    t = str(v).strip()
    return "" if t in ("nan", "None") else t


def _cols(model):
    return {c.key for c in model.__table__.columns}


def _row(model, data: dict) -> dict:
    cols = _cols(model)
    out = {}
    for k, v in data.items():
        if k not in cols:
            continue
        col = model.__table__.columns[k]
        py = col.type.python_type if hasattr(col.type, "python_type") else str
        try:
            if py is int:
                out[k] = _num(v, int)
            elif py is float:
                out[k] = _num(v, float)
            elif py is bool:
                out[k] = bool(v)
            else:
                out[k] = _txt(v)
        except NotImplementedError:
            out[k] = v
    return out


def is_empty(db: Session) -> bool:
    return (db.scalar(select(func.count(models.Study.study_id))) or 0) == 0


def reset(db: Session) -> None:
    for m in OBSERVATORY_TABLES:
        db.execute(delete(m))
    db.commit()


def insert_tables(db: Session, data: dict[str, list[dict]]) -> dict[str, int]:
    """data keys: countries, power_pools, tools, studies, study_tools, study_countries, study_pools."""
    counts = {}
    order = [("countries", models.Country), ("power_pools", models.PowerPool), ("tools", models.Tool),
             ("studies", models.Study), ("study_tools", models.StudyTool), ("study_countries", models.StudyCountry),
             ("study_pools", models.StudyPool)]
    known_tools = {r["tool_name"] for r in data.get("tools", [])}
    for key, model in order:
        rows = []
        seen = set()
        for raw in data.get(key, []):
            r = _row(model, raw)
            if key == "countries":
                r["iso3"] = r.get("iso3") or ISO2_TO_ISO3.get(r["iso_code"], "")
                r["nb_models_applied"] = r.get("nb_models_applied") or 0
            if key == "studies":
                r["doi"] = clean_doi(r.get("link_doi", ""))
                r.setdefault("source", "review")
                r.setdefault("status", "published")
                if r.get("study_id") is None:
                    continue
            if key == "study_tools":
                # Tools missing from the master sheet get a minimal profile so the link holds.
                if r["tool_name"] and r["tool_name"] not in known_tools:
                    db.add(models.Tool(tool_name=r["tool_name"], type=r.get("type", "")))
                    known_tools.add(r["tool_name"])
            pk = tuple(r.get(c.key) for c in model.__table__.primary_key.columns)
            if any(p in (None, "") for p in pk) or pk in seen:
                continue
            seen.add(pk)
            rows.append(r)
        db.flush()
        if rows:
            db.bulk_insert_mappings(model, rows)
        counts[key] = len(rows)
    db.commit()
    return counts


# ── Source 1: the SQLite database ────────────────────────────────────────────────
def read_sqlite(path: Path) -> dict[str, list[dict]]:
    con = sqlite3.connect(str(path))
    con.row_factory = sqlite3.Row
    out = {}
    for t in ("countries", "power_pools", "tools", "studies", "study_tools", "study_countries", "study_pools"):
        out[t] = [dict(r) for r in con.execute(f"SELECT * FROM {t}")]
    con.close()
    return out


# ── Source 2: the master workbook (port of legacy/streamlit/build_database.py) ───
SHEETS = {"studies.csv": "studies", "study_tools": "study_tools", "study_countries": "study_countries",
          "study_pools": "study_pools", "countries.csv": "countries", "power_pools.csv": "power_pools",
          "tools.csv": "tools"}
FIX = {"strenghts": "strengths", "grey_litterature": "grey_literature", "type of study": "study_type",
       "financing mechanism": "financing_mechanism", "authors affiliation": "authors_affiliation",
       "mathematical approach": "mathematical_approach", "key result": "key_result"}


def _clean_col(c) -> str:
    c = str(c).strip().lower()
    c = FIX.get(c, c)
    return re.sub(r"[^\w]+", "_", c).strip("_")


def read_workbook(path: Path) -> dict[str, list[dict]]:
    import pandas as pd
    xls = pd.read_excel(path, sheet_name=list(SHEETS), dtype=str, engine="openpyxl", keep_default_na=False, na_values=[])
    out = {}
    for sheet, df in xls.items():
        df.columns = [_clean_col(c) for c in df.columns]
        df = df.loc[:, [c for c in df.columns if c and not c.startswith("unnamed")]]
        rows = []
        for rec in df.to_dict(orient="records"):
            rec = {k: (v.strip() if isinstance(v, str) else v) for k, v in rec.items()}
            if all(str(v).strip() == "" for v in rec.values()):
                continue
            rows.append(rec)
        out[SHEETS[sheet]] = rows
    for key, pk in (("countries", "iso_code"), ("tools", "tool_name"), ("power_pools", "pool_code")):
        out[key] = [r for r in out[key] if str(r.get(pk, "")).strip()]
    return out


def apply_tool_repos(db: Session, path: Path | None = None) -> int:
    """Curated repository URLs for open-source tools (the tool tracker needs them)."""
    path = path or Path(__file__).parent / "data" / "tool_repos.json"
    if not path.exists():
        return 0
    mapping = json.loads(path.read_text(encoding="utf-8"))
    n = 0
    for name, info in mapping.items():
        t = db.get(models.Tool, name)
        if not t:
            continue
        if isinstance(info, str):
            info = {"repo_url": info}
        for k in ("repo_url", "website_url", "tracker_url"):
            if info.get(k) and not getattr(t, k):
                setattr(t, k, info[k])
                n += 1
    db.commit()
    return n


def seed(db: Session, source: str = "sqlite", path: Path | None = None, force: bool = False) -> dict:
    s = get_settings()
    if not force and not is_empty(db):
        return {"skipped": True}
    if force:
        reset(db)
    if source == "workbook":
        path = path or s.seed_workbook
        data = read_workbook(path)
    else:
        path = path or s.seed_sqlite
        data = read_sqlite(path)
    counts = insert_tables(db, data)
    counts["tool_repos"] = apply_tool_repos(db)
    invalidate()
    log.info("seeded from %s: %s", path, counts)
    return counts


def seed_if_empty() -> None:
    """Called at API start-up: load the bundled data the first time the database is used."""
    s = get_settings()
    if not s.seed_on_startup:
        return
    db = session_factory()()
    try:
        if is_empty(db):
            if s.seed_sqlite.exists():
                seed(db, "sqlite", s.seed_sqlite)
            elif s.seed_workbook.exists():
                seed(db, "workbook", s.seed_workbook)
            else:
                log.warning("no seed data found (SEED_SQLITE=%s)", s.seed_sqlite)
    finally:
        db.close()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--workbook", help="load from the master workbook instead of the SQLite database")
    ap.add_argument("--sqlite", help="path of the SQLite database (default: data/enermod.db)")
    ap.add_argument("--reset", action="store_true", help="wipe the observatory tables first")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO)
    create_all()
    db = session_factory()()
    try:
        if args.workbook:
            counts = seed(db, "workbook", Path(args.workbook), force=args.reset)
        else:
            counts = seed(db, "sqlite", Path(args.sqlite) if args.sqlite else None, force=args.reset)
        print(json.dumps(counts, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
