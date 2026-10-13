def test_health(client):
    assert client.get("/health").json()["ok"] is True


def test_studies_filters_and_pagination(client):
    r = client.get("/studies", params={"q": "kenya", "tool": "OSeMOSYS", "page_size": 5})
    body = r.json()
    assert r.status_code == 200 and body["total"] == 14 and len(body["items"]) == 5
    assert all("OSeMOSYS" in i["tools"] for i in body["items"])
    r = client.get("/studies", params={"country": "ke", "level": "full", "year_min": 2020, "page_size": 200})
    assert r.status_code == 200 and all("KE" in i["countries"] and i["year"] >= 2020 for i in r.json()["items"])
    r = client.get("/studies", params={"feature": "informal_economy", "level": "full"})
    assert r.json()["total"] == 8
    r = client.get("/studies", params={"open_source": "open", "tech": "solar", "sort": "year_asc"})
    years = [i["year"] for i in r.json()["items"]]
    assert years == sorted(years)


def test_study_detail_and_404(client):
    r = client.get("/studies/3")
    assert r.status_code == 200
    d = r.json()
    assert d["full_title"].startswith("Calliope Africa") and d["tools"] == ["Calliope"]
    assert d["link"].startswith("https://doi.org/")
    assert client.get("/studies/999999").status_code == 404


def test_country_detail(client):
    d = client.get("/countries/KE").json()
    assert d["country_name"] == "Kenya" and d["readiness_score"] == 8.5
    assert d["tools"][0]["tool"] == "OSeMOSYS"
    assert client.get("/countries/XX").status_code == 404
    assert len(client.get("/countries").json()) == 54


def test_facets_and_exports(client):
    f = client.get("/studies/facets").json()
    assert f["scale"][0] == {"value": "subnational", "n": 649}
    assert f["year_min"] == 2001
    csv = client.get("/export/studies.csv")
    assert csv.status_code == 200 and csv.text.splitlines()[0].startswith("study_id,full_title")
    assert csv.text.count("\n") >= 1053
    z = client.get("/export/all.zip")
    assert z.status_code == 200 and z.headers["content-type"] == "application/zip"
    assert client.get("/export/tools.csv").status_code == 200
    assert client.get("/export/countries.csv").status_code == 200


def test_meta(client):
    m = client.get("/meta").json()
    assert m["n_studies"] == 1053 and m["assistant"] is False


def test_origin_map_includes_institutions_outside_africa(client):
    """The authorship world map needs the non-African countries too (ISO codes from pycountry)."""
    rows = client.get("/stats/overview").json()["origin_map"]
    groups = {r["group"] for r in rows}
    assert groups == {"africa", "outside"}
    codes = {r["iso3"] for r in rows if r["group"] == "outside"}
    assert {"GBR", "USA", "DEU"} <= codes
