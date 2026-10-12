import json

import httpx

from enermod_api.db import session_factory
from enermod_api.services.discovery import run_discovery
from enermod_api.services.openalex import OpenAlexClient, build_queries, reconstruct_abstract

KNOWN_DOI = "https://doi.org/10.1016/j.esd.2025.101760"      # study 3 (Calliope Africa)


def _works():
    return {"meta": {"next_cursor": None}, "results": [
        {"id": "https://openalex.org/W1", "doi": KNOWN_DOI, "title": "Calliope Africa: Modeling the role of storage and transmission for renewable energy integration",
         "publication_year": 2025, "authorships": [{"author": {"display_name": "N. Stevanato"}}],
         "primary_location": {"source": {"display_name": "Energy for Sustainable Development"}, "landing_page_url": KNOWN_DOI},
         "open_access": {"oa_url": None}, "abstract_inverted_index": {"Storage": [0], "matters": [1]}, "cited_by_count": 3, "type": "article", "language": "en"},
        {"id": "https://openalex.org/W2", "doi": "https://doi.org/10.9999/new.work", "title": "OSeMOSYS least-cost pathways for Burundi to 2050",
         "publication_year": 2026, "authorships": [{"author": {"display_name": "A. Author"}}, {"author": {"display_name": "B. Author"}}],
         "primary_location": {"source": {"display_name": "Energy Policy"}, "landing_page_url": "https://doi.org/10.9999/new.work"},
         "open_access": {"oa_url": "https://example.org/oa.pdf"}, "abstract_inverted_index": {"We": [0], "model": [1], "Burundi": [2]},
         "cited_by_count": 0, "type": "article", "language": "en"},
        {"id": "https://openalex.org/W3", "doi": None, "title": "Heart of light: an assessment of enhanced electricity access in Africa",
         "publication_year": 2021, "authorships": [], "primary_location": None, "open_access": None,
         "abstract_inverted_index": None, "cited_by_count": 10, "type": "article", "language": "en"},
    ]}


def _client():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url)
        assert "title_and_abstract.search" in request.url.params["filter"]
        return httpx.Response(200, json=_works())
    transport = httpx.MockTransport(handler)
    return OpenAlexClient(mailto="test@example.org", client=httpx.Client(transport=transport)), calls


def test_queries_follow_the_four_blocks():
    qs = build_queries()
    assert len(qs) == 5 and all(q.count(" AND ") == 3 for q in qs)
    assert '"energy system"' in qs[0] and "OSeMOSYS" in qs[0] and "Nigeria" in " ".join(qs)
    assert reconstruct_abstract({"b": [1], "a": [0]}) == "a b"


def test_run_discovery_matches_corpus(client, admin):
    oa, calls = _client()
    db = session_factory()()
    try:
        run = run_discovery(db, mode="full", client=oa, max_pages=1)
    finally:
        db.close()
    assert run.status == "done" and len(calls) == 5
    assert run.n_fetched == 3 and run.n_new == 1 and run.n_known == 2
    new = admin.get("/admin/discovery/candidates?status=new").json()
    assert new["total"] == 1 and new["items"][0]["title"].startswith("OSeMOSYS least-cost")
    known = admin.get("/admin/discovery/candidates?status=known").json()["items"]
    reasons = {k["openalex_id"]: k["note"] for k in known}
    assert "doi" in reasons["W1"] and "title" in reasons["W3"]
    runs = admin.get("/admin/discovery/runs").json()
    assert runs[0]["n_new"] == 1
    cid = new["items"][0]["id"]
    r = admin.patch(f"/admin/discovery/candidates/{cid}", json={"status": "relevant", "note": "looks in scope"})
    assert r.json()["status"] == "relevant"
    ris = admin.get("/admin/discovery/export.ris?status=relevant").text
    assert "TY  - JOUR" in ris and "DO  - 10.9999/new.work" in ris and "AU  - A. Author" in ris
    r = admin.post(f"/admin/discovery/candidates/{cid}/to-contribution")
    assert r.status_code == 201 and r.json()["source"] == "discovery"
    assert r.json()["payload"]["link_doi"] == "https://doi.org/10.9999/new.work"
    assert admin.get(f"/admin/discovery/candidates?status=imported").json()["total"] == 1
    assert "queries" in admin.get("/admin/discovery/queries").json()
    r = admin.post("/admin/discovery/run", json={"mode": "nope"})
    assert r.status_code == 400
