"""Discovery pipeline: look for studies the review may have missed or that appeared since.

For every work OpenAlex returns, the pipeline checks whether the corpus already holds it
(same DOI, identical normalised title, or a near-identical title with the same year) and
stores the rest as candidates for a curator to screen. Relevant candidates are exported as
RIS for a Krinea review, or turned directly into a pending contribution.
"""
from __future__ import annotations

import logging
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from enermod_api import models
from enermod_api.config import get_settings
from enermod_api.services.biblio import norm_title, similarity, write_ris
from enermod_api.services.data import Corpus, get_corpus
from enermod_api.services.openalex import OpenAlexClient, OpenAlexError, build_queries, default_since, today

log = logging.getLogger("enermod.discovery")
FUZZY_THRESHOLD = 92.0
SETTING_LAST_RUN = "discovery_last_run"


class CorpusIndex:
    """Lookup structures over the published studies for fast matching."""

    def __init__(self, corpus: Corpus):
        self.by_doi = {d["doi"]: d["study_id"] for d in corpus.studies if d.get("doi")}
        self.by_title = {}
        self.titles = []
        for d in corpus.studies:
            t = norm_title(d["full_title"])
            if t:
                self.by_title.setdefault(t, d["study_id"])
                self.titles.append((t, d["study_id"], d["year"]))

    def match(self, work: dict) -> tuple[int | None, float, str]:
        """(study_id, score, reason) when the work is already in the corpus."""
        if work.get("doi") and work["doi"] in self.by_doi:
            return self.by_doi[work["doi"]], 100.0, "doi"
        t = norm_title(work.get("title"))
        if not t:
            return None, 0.0, ""
        if t in self.by_title:
            return self.by_title[t], 100.0, "title"
        best, best_id = 0.0, None
        for ct, sid, year in self.titles:
            if abs(len(ct) - len(t)) > 40:
                continue
            if work.get("year") and year and abs(int(work["year"]) - int(year)) > 1:
                continue
            sc = similarity(t, ct)
            if sc > best:
                best, best_id = sc, sid
        if best >= FUZZY_THRESHOLD:
            return best_id, best, "fuzzy"
        return None, best, ""


def get_setting(db: Session, key: str) -> dict:
    row = db.get(models.Setting, key)
    return dict(row.value) if row and row.value else {}


def set_setting(db: Session, key: str, value: dict) -> None:
    row = db.get(models.Setting, key)
    if row:
        row.value = value
    else:
        db.add(models.Setting(key=key, value=value))
    db.commit()


def run_discovery(db: Session, mode: str = "since", since: str | None = None,
                  client: OpenAlexClient | None = None, max_pages: int | None = None) -> models.DiscoveryRun:
    s = get_settings()
    client = client or OpenAlexClient(mailto=s.openalex_mailto, api_key=s.openalex_api_key)
    max_pages = max_pages or s.discovery_max_pages
    if mode == "full":
        from_date = f"{s.discovery_from_year}-01-01"
    else:
        from_date = since or default_since(get_setting(db, SETTING_LAST_RUN).get("date"), s.discovery_from_year)
    run = models.DiscoveryRun(mode=mode, since_date=from_date, status="running")
    db.add(run)
    db.commit()
    index = CorpusIndex(get_corpus(db))
    existing = {c.openalex_id: c for c in db.scalars(select(models.Candidate)).all()}
    seen: set[str] = set()
    n_fetched = n_new = n_known = 0
    try:
        queries = build_queries()
        run.n_queries = len(queries)
        for q in queries:
            for work in client.search(q, from_date=from_date, to_date=today(), max_pages=max_pages):
                if not work["openalex_id"] or work["openalex_id"] in seen:
                    continue
                seen.add(work["openalex_id"])
                n_fetched += 1
                sid, score, reason = index.match(work)
                cand = existing.get(work["openalex_id"])
                if cand is None:
                    cand = models.Candidate(openalex_id=work["openalex_id"], run_id=run.id, status="new")
                    db.add(cand)
                    existing[work["openalex_id"]] = cand
                    if sid:
                        n_known += 1
                    else:
                        n_new += 1
                for k in ("doi", "title", "abstract", "authors", "year", "venue", "url", "oa_url", "cited_by", "language"):
                    setattr(cand, k, work.get(k) if work.get(k) is not None else getattr(cand, k))
                cand.work_type = work.get("type") or cand.work_type
                if sid and cand.status in ("new", "known"):
                    cand.status, cand.match_study_id, cand.match_score = "known", sid, score
                    cand.note = f"already in the corpus ({reason})"
                elif cand.match_score is None:
                    cand.match_score = score
                if n_fetched % 200 == 0:
                    db.commit()
        run.status = "done"
        set_setting(db, SETTING_LAST_RUN, {"date": today(), "run_id": run.id})
    except OpenAlexError as exc:
        log.error("discovery stopped: %s", exc)
        run.status, run.error = "failed", str(exc)[:1000]
    except Exception as exc:                      # noqa: BLE001
        log.exception("discovery failed")
        # the message, never the request URL (an httpx error quotes the whole query)
        run.status, run.error = "failed", re.sub(r"\s*for url '[^']*'", "", f"{type(exc).__name__}: {exc}")[:1000]
    run.n_fetched, run.n_new, run.n_known = n_fetched, n_new, n_known
    run.finished_at = models.now()
    db.commit()
    return run


def candidates_ris(db: Session, status: str = "relevant") -> str:
    rows = db.scalars(select(models.Candidate).where(models.Candidate.status == status)
                      .order_by(models.Candidate.year.desc())).all()
    return write_ris([{"title": c.title, "authors": c.authors, "year": c.year, "doi": c.doi, "url": c.url or c.oa_url,
                       "abstract": c.abstract, "venue": c.venue, "type": c.work_type, "openalex_id": c.openalex_id}
                      for c in rows])


def candidate_to_payload(c: models.Candidate) -> dict:
    """Pre-filled study payload for a contribution created from a candidate."""
    return {"full_title": c.title, "authors": c.authors.replace(";", ","), "year": c.year,
            "link_doi": f"https://doi.org/{c.doi}" if c.doi else (c.url or c.oa_url),
            "study_objective": c.abstract[:600], "grey_literature": "yes" if c.work_type in ("dissertation", "report") else "",
            "openalex_id": c.openalex_id}
