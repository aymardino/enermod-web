def test_options(client):
    o = client.get("/recommend/options").json()
    assert "prefeasibility" in o["objectives"] and o["allowed"]["prefeasibility"][0] == ["facility", "subnational"]


def test_open_source_filter_and_internal_excluded(client):
    r = client.post("/recommend", json={"objective": "national_planning", "scale": "national", "budget": "none",
                                        "capacity": "intermediate", "horizon": "long", "data": "moderate",
                                        "extras": ["open_source"]})
    body = r.json()
    assert r.status_code == 200 and body["open_only"] is True
    assert all(t["license"] == "open_source" for t in body["results"])
    assert body["results"][0]["tool_name"] == "OSeMOSYS"
    assert body["results"][0]["breakdown"]["objective"] == 40
    assert body["n_internal"] > 0


def test_prefeasibility_ranks_sizing_tools(client):
    r = client.post("/recommend", json={"objective": "prefeasibility", "scale": "facility", "budget": "any",
                                        "capacity": "limited", "horizon": "short", "data": "limited"})
    names = [t["tool_name"] for t in r.json()["results"]]
    assert "HOMER" in names[:5] and "RETScreen" in names[:5]


def test_validation(client):
    assert client.post("/recommend", json={"objective": "nonsense"}).status_code == 400
    assert client.post("/recommend", json={}).status_code == 200
