import io

from enermod_api.services.imports import parse_krinea_export, parse_survey

KRINEA_CSV = (
    "record_id,title,doi,year,full_title,authors,tools_used,tool_categories,extraction_level,scale,countries,open_source,study_objective\n"
    "1,Grid study,10.5555/aaa,2025,Grid expansion planning in Senegal with PLEXOS,Diop A.,PLEXOS,production_cost,full,national,SN,proprietary,Plan the grid.\n"
    "2,Custom model,10.5555/bbb,2024,A bespoke spreadsheet model,Someone,none,,light,national,ML,,Custom\n"
)
SURVEY_CSV = (
    "Timestamp;Your name;Institution;Title of the study;DOI or link;Publication year;Modelling tool(s) used;Countries covered;Email\n"
    "2026-09-01;Awa;Université de Lomé;Hybrid mini-grid sizing in northern Togo;https://doi.org/10.7777/togo;2023;HOMER, RETScreen;Togo;awa@example.org\n"
    "2026-09-02;;;;;;;;\n"
)


def test_parse_krinea_export_skips_none_tools():
    rows = parse_krinea_export(KRINEA_CSV.encode(), "export.csv")
    assert len(rows) == 1
    r = rows[0]
    assert r["full_title"].startswith("Grid expansion") and r["tools"] == ["PLEXOS"] and r["countries"] == ["SN"]
    assert r["year"] == 2025 and r["link_doi"] == "10.5555/aaa"


def test_parse_survey_guesses_mapping():
    rows, mapping = parse_survey(SURVEY_CSV.encode(), "survey.csv")
    assert mapping["full_title"] == "Title of the study" and mapping["tools"] == "Modelling tool(s) used"
    assert len(rows) == 1
    assert rows[0]["tools"] == ["HOMER", "RETScreen"] and rows[0]["year"] == 2023 and rows[0]["submitter_email"] == "awa@example.org"


def test_admin_imports_create_pending_contributions(admin):
    r = admin.post("/admin/imports/krinea", files={"file": ("export.csv", io.BytesIO(KRINEA_CSV.encode()), "text/csv")})
    assert r.status_code == 201, r.text
    assert r.json()["created"] == 1
    pending = admin.get("/admin/contributions?status=pending&source=krinea").json()
    assert any(c["title"].startswith("Grid expansion") for c in pending)
    r = admin.post("/admin/imports/survey", files={"file": ("survey.csv", io.BytesIO(SURVEY_CSV.encode()), "text/csv")})
    assert r.status_code == 201 and r.json()["created"] == 1
    pending = admin.get("/admin/contributions?status=pending&source=survey").json()
    assert pending[0]["payload"]["countries"] == ["TG"] and pending[0]["submitter_email"] == "awa@example.org"
