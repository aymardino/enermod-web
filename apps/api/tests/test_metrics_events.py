import httpx

from enermod_api.db import session_factory
from enermod_api.services.metrics import fetch_github, github_repo, refresh_all


def test_github_repo_parsing():
    assert github_repo("https://github.com/OSeMOSYS/OSeMOSYS") == ("OSeMOSYS", "OSeMOSYS")
    assert github_repo("https://github.com/PyPSA/PyPSA.git") == ("PyPSA", "PyPSA")
    assert github_repo("https://gitlab.com/x/y") is None


def _transport():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/contributors"):
            return httpx.Response(200, json=[{}], headers={"link": '<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=57>; rel="last"'})
        if "missing" in request.url.path:
            return httpx.Response(404, json={})
        return httpx.Response(200, json={"stargazers_count": 120, "forks_count": 40, "open_issues_count": 7,
                                         "license": {"spdx_id": "Apache-2.0"}, "language": "Python",
                                         "archived": False, "pushed_at": "2026-09-30T10:00:00Z"})
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_fetch_and_refresh(client, admin):
    data = fetch_github("https://github.com/OSeMOSYS/OSeMOSYS", client=_transport())
    assert data["stars"] == 120 and data["contributors"] == 57 and data["repo_license"] == "Apache-2.0"
    assert fetch_github("https://github.com/x/missing", client=_transport())["error"] == "GitHub 404"
    db = session_factory()()
    try:
        res = refresh_all(db, client=_transport())
    finally:
        db.close()
    assert res["ok"] >= 20 and res["failed"] == 0
    t = client.get("/tools/OSeMOSYS").json()
    assert t["metrics"]["stars"] == 120 and len(t["metrics_history"]) == 1
    assert admin.get("/admin/metrics").json()["PyPSA"]["forks"] == 40


def test_events_and_popular(client, admin):
    for ref in ("HOMER", "HOMER", "LEAP"):
        r = client.post("/events", json={"kind": "tool_view", "path": f"/observatory/tools/{ref}", "ref": ref, "locale": "en"})
        assert r.status_code == 204
    client.post("/events", json={"kind": "page_view", "path": "/observatory", "locale": "fr"})
    assert client.post("/events", json={"kind": "bogus", "path": "/"}).status_code == 204
    pop = client.get("/events/popular?kind=tool_view").json()
    assert pop[0] == {"ref": "HOMER", "n": 2}
    # Do-Not-Track is honoured
    client.post("/events", json={"kind": "tool_view", "ref": "LEAP"}, headers={"DNT": "1"})
    assert client.get("/events/popular?kind=tool_view").json()[1] == {"ref": "LEAP", "n": 1}
    a = admin.get("/admin/analytics?days=7").json()
    assert a["by_kind"]["tool_view"] == 3 and a["tools"][0]["ref"] == "HOMER" and a["locales"].get("fr") == 1
    assert client.get("/tools").json()["items"]
    homer = next(t for t in client.get("/tools").json()["items"] if t["tool_name"] == "HOMER")
    assert homer["views_30d"] == 2
