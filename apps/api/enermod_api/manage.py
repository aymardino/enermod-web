"""Operational commands.

    python -m enermod_api.manage promote someone@example.org [admin|curator]
    python -m enermod_api.manage discover [--full] [--since YYYY-MM-DD]
    python -m enermod_api.manage metrics
    python -m enermod_api.manage survey
"""
from __future__ import annotations

import argparse
import json
import logging

from sqlalchemy import select

from enermod_api import models
from enermod_api.db import create_all, session_factory


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("promote"); p.add_argument("email"); p.add_argument("role", nargs="?", default="admin")
    d = sub.add_parser("discover"); d.add_argument("--full", action="store_true"); d.add_argument("--since")
    sub.add_parser("metrics")
    sub.add_parser("survey")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO)
    create_all()
    db = session_factory()()
    try:
        if args.cmd == "promote":
            u = db.scalar(select(models.User).where(models.User.email == args.email.lower()))
            if not u:
                u = models.User(email=args.email.lower(), role=args.role)
                db.add(u)
            u.role = args.role
            db.commit()
            print(f"{u.email} is now {u.role}")
        elif args.cmd == "discover":
            from enermod_api.services.discovery import run_discovery
            run = run_discovery(db, mode="full" if args.full else "since", since=args.since)
            print(json.dumps({"status": run.status, "fetched": run.n_fetched, "new": run.n_new, "known": run.n_known,
                              "error": run.error}, indent=2))
        elif args.cmd == "metrics":
            from enermod_api.services.metrics import refresh_all
            print(json.dumps(refresh_all(db), indent=2))
        elif args.cmd == "survey":
            from enermod_api.services.jobs import _run_survey
            print(json.dumps(_run_survey(db, models.Job(kind="survey_sync", payload={})), indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
