from enermod_api.services import email as email_service

STUDY = {
    "full_title": "Least-cost electrification pathways for Togo with OnSSET and OSeMOSYS",
    "authors": "Doe J., Mensah K.", "year": 2026, "link_doi": "10.1234/enermod.test.0001",
    "tools": ["OnSSET", "OSeMOSYS"], "countries": ["Togo", "GH"], "scale": "national", "extraction_level": "full",
    "open_source": "open", "study_category": "rural_electrification", "local_ownership": "yes",
    "study_objective": "Compare grid and off-grid pathways.", "informal_economy": "no",
}


def test_public_submission_rejects_bots_and_validates(client):
    assert client.post("/contributions", json={"kind": "study", "payload": STUDY, "website": "http://spam"}).status_code == 400
    r = client.post("/contributions", json={"kind": "study", "payload": {"authors": "x"}})
    assert r.status_code == 422 and "full_title" in r.json()["detail"]
    r = client.post("/contributions", json={"kind": "study", "payload": {**STUDY, "countries": ["Atlantis"]}})
    assert r.status_code == 422 and "Atlantis" in r.json()["detail"]
    assert client.post("/contributions", json={"kind": "correction", "payload": {}, "target_study_id": 3}).status_code == 400


def test_submit_review_approve_creates_study(client, admin):
    email_service.OUTBOX.clear()
    r = client.post("/contributions", json={"kind": "study", "payload": STUDY, "submitter_name": "Jane",
                                             "submitter_email": "jane@example.org", "locale": "fr"})
    assert r.status_code == 201, r.text
    cid = r.json()["id"]
    assert r.json()["duplicate_of"] is None
    assert any(m["to"] == "jane@example.org" for m in email_service.OUTBOX)       # thank-you mail
    pending = admin.get("/admin/contributions?status=pending").json()
    item = next(c for c in pending if c["id"] == cid)
    assert item["payload"]["countries"] == ["GH", "TG"] and item["payload"]["link_doi"].startswith("https://doi.org/")
    detail = admin.get(f"/admin/contributions/{cid}").json()
    assert detail["errors"] == []
    before = client.get("/stats/overview").json()["n_studies"]
    r = admin.post(f"/admin/contributions/{cid}/approve", json={"note": "verified against the PDF"})
    assert r.status_code == 200, r.text
    sid = r.json()["study_id"]
    assert client.get("/stats/overview").json()["n_studies"] == before + 1
    d = client.get(f"/studies/{sid}").json()
    assert d["tools"] == ["OSeMOSYS", "OnSSET"] and d["countries"] == ["GH", "TG"] and d["pools"] == ["WAPP"]
    assert d["source"] == "contribution" and d["doi"] == "10.1234/enermod.test.0001"
    assert client.get("/tools/OnSSET").json()["nb_studies_in_inventory"] == 53
    # Reviewing twice is refused; a duplicate submission is flagged
    assert admin.post(f"/admin/contributions/{cid}/approve", json={}).status_code == 422
    r = client.post("/contributions", json={"kind": "study", "payload": STUDY})
    assert r.json()["duplicate_of"] == sid
    admin.post(f"/admin/contributions/{r.json()['id']}/reject", json={"note": "duplicate"})
    assert any(c["id"] == r.json()["id"] for c in admin.get("/admin/contributions?status=rejected").json())
    recent = client.get("/contributions/recent").json()
    assert recent and recent[0]["created_study_id"] == sid


def test_correction_and_tool_contributions(client, admin, member):
    r = member.post("/contributions", json={"kind": "correction", "payload": {"field": "year"}, "target_study_id": 3,
                                            "message": "The year should be 2024"})
    assert r.status_code == 201
    mine = member.get("/contributions/mine").json()
    assert mine and mine[0]["submitter_email"] == "member@example.org"
    r = client.post("/contributions", json={"kind": "tool", "payload": {"tool_name": "TestTool", "license": "open_source",
                                                                        "type": "capacity_expansion", "repo_url": "https://github.com/x/y"}})
    cid = r.json()["id"]
    assert admin.post(f"/admin/contributions/{cid}/approve", json={}).status_code == 200
    t = client.get("/tools/TestTool").json()
    assert t["license"] == "open_source" and t["n_studies"] == 0


def test_curator_edits(admin, client):
    r = admin.patch("/tools/CLOVER", json={"fields": {"repo_url": "https://github.com/phil-sandwell/CLOVER", "website_url": "https://clover.energy"}})
    assert r.status_code in (404, 405)      # the route is under /admin
    r = admin.patch("/admin/tools/CLOVER", json={"fields": {"website_url": "https://clover.energy", "nb_studies_in_inventory": 999}})
    assert r.status_code == 200 and r.json()["updated"] == ["website_url"]
    assert client.get("/tools/CLOVER").json()["website_url"] == "https://clover.energy"
    r = admin.patch("/admin/studies/3", json={"fields": {"key_result": "Edited result"}, "countries": ["KE", "Tanzania"]})
    assert r.status_code == 200
    d = client.get("/studies/3").json()
    assert d["key_result"] == "Edited result" and d["countries"] == ["KE", "TZ"] and d["pools"] == ["EAPP"]
