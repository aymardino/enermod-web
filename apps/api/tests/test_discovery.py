
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
    assert admin.get("/admin/discovery/candidates?status=imported").json()["total"] == 1
    assert "queries" in admin.get("/admin/discovery/queries").json()
    r = admin.post("/admin/discovery/run", json={"mode": "nope"})
    assert r.status_code == 400


def _transport(handler):
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_api_key_travels_in_the_header_not_the_url():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["auth"] = request.headers.get("authorization")
        seen["url"] = str(request.url)
        return httpx.Response(200, json={"meta": {"next_cursor": None}, "results": []})

    oa = OpenAlexClient(mailto="test@example.org", api_key="k-123", client=_transport(handler), pause=0)
    assert list(oa.search("x", max_pages=1)) == []
    assert seen["auth"] == "Bearer k-123" and "k-123" not in seen["url"] and "mailto=test%40example.org" in seen["url"]


def test_refusals_become_readable_errors_without_the_url(client, admin):
    import pytest

    from enermod_api.services.openalex import OpenAlexError

    def refuse(status, body, headers=None):
        return lambda request: httpx.Response(status, json=body, headers=headers or {})

    oa = OpenAlexClient(client=_transport(refuse(401, {"error": "Invalid or missing API key", "message": "API key required"})), pause=0)
    with pytest.raises(OpenAlexError) as e:
        list(oa.search("x", max_pages=2))
    assert "OPENALEX_API_KEY" in str(e.value) and "https://api.openalex.org" not in str(e.value)

    oa = OpenAlexClient(client=_transport(refuse(429, {"error": "Rate limit exceeded", "message": "Insufficient budget"},
                                                     {"retry-after": "45437", "x-ratelimit-remaining": "0"})), pause=0)
    with pytest.raises(OpenAlexError) as e:
        list(oa.search("x", max_pages=2))
    assert "budget" in str(e.value) and "OPENALEX_API_KEY" in str(e.value) and "13 h" in str(e.value)

    # the run records the readable message
    db = session_factory()()
    try:
        run = run_discovery(db, mode="full", client=oa, max_pages=1)
    finally:
        db.close()
    assert run.status == "failed" and run.error.startswith("OpenAlex: no API key") and "http" not in run.error.split("(keys")[0]


def test_a_short_rate_limit_is_waited_out():
    calls = []
    waited = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        if len(calls) < 3:
            return httpx.Response(429, json={"error": "Rate limit exceeded"}, headers={"retry-after": "1"})
        return httpx.Response(200, json=_works())

    oa = OpenAlexClient(api_key="k", client=_transport(handler), pause=0, sleep=waited.append)
    assert len(list(oa.search("x", max_pages=1))) == 3
    assert len(calls) == 3 and waited == [1.0, 1.0]
