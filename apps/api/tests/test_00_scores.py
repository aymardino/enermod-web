"""The ported scores reproduce the figures published in the thesis and on the Methodology page."""
from enermod_api.db import session_factory
from enermod_api.services import stats
from enermod_api.services.data import get_corpus


def test_overview_matches_thesis(client):
    ov = client.get("/stats/overview").json()
    assert ov["n_studies"] == 1053
    assert ov["n_full"] == 274 and ov["n_light"] == 779
    assert (ov["year_min"], ov["year_max"]) == (2001, 2026)
    assert ov["n_tools"] == 101
    assert ov["open_pct"] == 25
    assert ov["african_led_full_pct"] == 35
    assert ov["origin"]["african_led"] == 615


def test_readiness_matches_thesis(client):
    rd = client.get("/stats/readiness").json()
    assert rd["n_ranked"] == 39 and rd["n_countries"] == 54
    assert rd["average"] == 5.4 and rd["n_below_4"] == 13
    top = {c["country_name"]: c["readiness_score"] for c in rd["countries"][:4]}
    assert top["South Africa"] == 9.8 and top["Ghana"] == 8.8
    assert top["Kenya"] == 8.5 and top["Tunisia"] == 8.5
    unranked = [c for c in rd["countries"] if c["readiness_score"] is None]
    assert len(unranked) == 15 and all(c["energy_governance"] == "" for c in unranked)


def test_gap_score_formula(client):
    db = session_factory()()
    try:
        corpus = get_corpus(db)
    finally:
        db.close()
    c = corpus.countries_by_iso["SS"]           # South Sudan: no data, weak governance
    assert c["gap_score"] == 74
    row = {"feature_ratio": 1.0, "data_availability": "good", "energy_governance": "strong", "n_tools": 10}
    from enermod_api.services.scores import compute_gap_score, compute_readiness
    assert compute_gap_score(row) == 0
    assert compute_readiness({"energy_governance": "strong", "data_availability": "good", "has_ndc": "yes",
                              "has_lts": "yes", "electrification_rate": 100}) == 10.0
    assert compute_readiness({"energy_governance": ""}) is None


def test_feature_coverage_uses_assessed_only(client):
    g = client.get("/stats/gaps?level=full").json()
    feats = {f["key"]: f for f in g["features"]}
    assert feats["informal_economy"]["pct"] == 3 and feats["informal_economy"]["assessed"] == 273
    assert feats["power_reliability"]["pct"] == 57
    assert g["financing"]["mode_rate"] == 10 and g["financing"]["n_rates"] == 122


def test_tool_detail_cooccurrence(client):
    t = client.get("/tools/HOMER").json()
    assert t["n_studies"] == 512
    assert t["countries"][0]["iso2"] == "NG" and t["countries"][0]["studies"] == 132
    assert t["co_used"][0] == {"tool": "RETScreen", "studies": 12}
    assert "sparkline" in client.get("/tools").json()["items"][0]
