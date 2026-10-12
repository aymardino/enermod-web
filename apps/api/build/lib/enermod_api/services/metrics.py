"""Tool tracker: repository activity of the open tools, in the spirit of the openmod tracker
(which aggregates repository and community data for open energy modelling tools). Here the
hub stores a monthly snapshot per tool so usage in the literature (the corpus) and activity
of the code base can be read side by side."""
from __future__ import annotations

import datetime as dt
import logging
import re

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from enermod_api import models
from enermod_api.config import get_settings

log = logging.getLogger("enermod.metrics")
_GH = re.compile(r"github\.com/([^/\s]+)/([^/\s#?]+)", re.I)


def github_repo(url: str) -> tuple[str, str] | None:
    m = _GH.search(url or "")
    if not m:
        return None
    return m.group(1), m.group(2).removesuffix(".git")


def fetch_github(repo_url: str, token: str = "", client: httpx.Client | None = None) -> dict:
    parsed = github_repo(repo_url)
    if not parsed:
        return {"error": "not a GitHub repository URL"}
    owner, repo = parsed
    client = client or httpx.Client(timeout=30)
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "EnerMod-Africa-hub/0.1"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
    if r.status_code != 200:
        return {"error": f"GitHub {r.status_code}"}
    d = r.json()
    out = {
        "stars": d.get("stargazers_count"), "forks": d.get("forks_count"), "open_issues": d.get("open_issues_count"),
        "repo_license": ((d.get("license") or {}).get("spdx_id") or ""), "language": d.get("language") or "",
        "archived": bool(d.get("archived")), "last_commit_at": None, "contributors": None,
    }
    pushed = d.get("pushed_at")
    if pushed:
        out["last_commit_at"] = dt.datetime.fromisoformat(pushed.replace("Z", "+00:00")).replace(tzinfo=None)
    try:
        rc = client.get(f"https://api.github.com/repos/{owner}/{repo}/contributors",
                        params={"per_page": 1, "anonymous": "true"}, headers=headers)
        if rc.status_code == 200:
            link = rc.headers.get("link", "")
            m = re.search(r'[?&]page=(\d+)>; rel="last"', link)
            out["contributors"] = int(m.group(1)) if m else len(rc.json())
    except httpx.HTTPError:
        pass
    return out


def refresh_all(db: Session, client: httpx.Client | None = None) -> dict:
    s = get_settings()
    tools = db.scalars(select(models.Tool).where(models.Tool.repo_url != "")).all()
    ok = failed = 0
    for t in tools:
        data = fetch_github(t.repo_url, s.github_token, client)
        snap = models.ToolMetric(tool_name=t.tool_name, repo_url=t.repo_url, error=data.get("error", ""))
        for k in ("stars", "forks", "open_issues", "contributors", "last_commit_at", "repo_license", "language", "archived"):
            if k in data:
                setattr(snap, k, data[k])
        db.add(snap)
        if data.get("error"):
            failed += 1
        else:
            ok += 1
    db.commit()
    return {"tools": len(tools), "ok": ok, "failed": failed}


def latest_metrics(db: Session) -> dict[str, dict]:
    """Most recent successful snapshot per tool."""
    rows = db.scalars(select(models.ToolMetric).where(models.ToolMetric.error == "")
                      .order_by(models.ToolMetric.fetched_at.desc())).all()
    out: dict[str, dict] = {}
    for r in rows:
        if r.tool_name not in out:
            out[r.tool_name] = {"stars": r.stars, "forks": r.forks, "open_issues": r.open_issues, "contributors": r.contributors,
                                "last_commit_at": r.last_commit_at.isoformat() if r.last_commit_at else None,
                                "repo_license": r.repo_license, "language": r.language, "archived": r.archived,
                                "fetched_at": r.fetched_at.isoformat(), "repo_url": r.repo_url}
    return out


def history(db: Session, tool_name: str) -> list[dict]:
    rows = db.scalars(select(models.ToolMetric).where(models.ToolMetric.tool_name == tool_name, models.ToolMetric.error == "")
                      .order_by(models.ToolMetric.fetched_at)).all()
    return [{"fetched_at": r.fetched_at.isoformat(), "stars": r.stars, "forks": r.forks, "open_issues": r.open_issues,
             "contributors": r.contributors} for r in rows]
