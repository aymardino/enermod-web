"""The screening aid: the review's keyword lists as a score, the additive migration, the
curation endpoints that use it."""
import sqlite3
import tempfile

from sqlalchemy import select

from enermod_api import models
from enermod_api.db import session_factory
from enermod_api.services.screening import POSSIBLE_MIN, STRONG_MIN, backfill, screen


def test_named_tools_and_modelling_vocabulary_score_high():
    s = screen("Least-cost electrification pathways for Kenya using OnSSET",
               "The Open Source Spatial Electrification Tool compares grid extension, mini-grids and stand-alone PV to 2030; LCOE drives the choice.")
    assert s.bucket == "strong" and "OnSSET" in s.signals_in and "least-cost" in s.signals_in
    s = screen("Long-term energy scenarios for Ghana to 2050 with LEAP", "The LEAP model projects demand and emissions under policy scenarios.")
    assert s.score >= STRONG_MIN and "LEAP" in s.signals_in


def test_acronyms_that_are_plain_words_only_count_in_capitals():
    assert "TIMES" in screen("Energy transition pathways for Morocco: a TIMES model analysis", "").signals_in
    s = screen("A study of times tables learning in Ghanaian primary schools", "Children surveyed; a regression model relates learning times to electricity access at home.")
    assert "TIMES" not in s.signals_in and s.bucket == "weak"
    assert "MESSAGE" not in screen("Message framing and brand switching in Kenya", "").signals_in


def test_off_topic_vocabulary_counts_against():
    s = screen("Grid cells in the entorhinal cortex of guinea pigs: a network model",
               "We recorded neurons in guinea pigs and simulated a network model of grid cells with a software tool.")
    assert s.bucket == "weak" and "guinea pigs" in s.signals_out
    s = screen("5G antenna design for telecom base stations in South Africa", "An antenna array is optimised with a simulation tool; power consumption is measured.")
    assert s.bucket == "weak"
    assert screen("Solar PV water pumping for irrigation in Tunisia: a PVsyst design", "PVsyst sizes the photovoltaic pumping system; cost of energy and payback.").bucket == "strong"


def test_the_corpus_itself_passes_the_screening():
    """Titles plus the extracted objective and result (shorter than an abstract) of the 1,053
    studies: nearly all land at "possible" or above, so the weak line sets little aside."""
    db = session_factory()()
    try:
        rows = db.execute(select(models.Study.full_title, models.Study.study_objective, models.Study.key_result)).all()
    finally:
        db.close()
    assert len(rows) >= 1000
    weak = sum(1 for t, o, r in rows if screen(t, f"{o or ''} {r or ''}").score < POSSIBLE_MIN)
    assert weak / len(rows) < 0.04, weak


def test_missing_columns_are_added_to_an_existing_table():
    from sqlalchemy import create_engine, inspect

    from enermod_api import db as dbmod

    path = tempfile.mkdtemp(prefix="enermod-mig-") + "/old.db"
    con = sqlite3.connect(path)
    con.execute("CREATE TABLE candidates (id INTEGER PRIMARY KEY, openalex_id VARCHAR(60) NOT NULL, title TEXT NOT NULL)")
    con.execute("INSERT INTO candidates (openalex_id, title) VALUES ('W1', 'old row')")
    con.commit()
    con.close()
    engine = create_engine(f"sqlite:///{path}")
    saved = dbmod._engine
    dbmod._engine = engine
    try:
        added = dbmod.ensure_columns()
        cols = {c["name"] for c in inspect(engine).get_columns("candidates")}
        assert added >= 2 and {"relevance", "signals", "status", "note"} <= cols
        with engine.connect() as c:
            assert c.exec_driver_sql("SELECT signals, relevance, status FROM candidates").fetchone() == ("", None, "new")
    finally:
        dbmod._engine = saved
        engine.dispose()


def test_candidates_are_ranked_filtered_and_set_aside(client, admin):
    db = session_factory()()
    try:
        db.add_all([
            models.Candidate(openalex_id="WS1", title="OSeMOSYS capacity expansion for Ghana to 2040", abstract="Least-cost scenarios, LCOE.", year=2024),
            models.Candidate(openalex_id="WS2", title="Grid cells in guinea pigs: a network model", abstract="neurons, software tool", year=2025),
            models.Candidate(openalex_id="WS3", title="Hybrid PV-diesel system sizing for a village in Mali", abstract="", year=2023),
        ])
        db.commit()
        assert backfill(db) >= 3
    finally:
        db.close()
    page = admin.get("/admin/discovery/candidates?status=new&sort=relevance&page_size=100").json()
    ids = [x["openalex_id"] for x in page["items"]]
    assert ids.index("WS1") < ids.index("WS2") and page["weak"] >= 1
    first = next(x for x in page["items"] if x["openalex_id"] == "WS1")
    assert first["bucket"] == "strong" and "OSeMOSYS" in first["signals_in"]
    weak = next(x for x in page["items"] if x["openalex_id"] == "WS2")
    assert weak["bucket"] == "weak" and "guinea pigs" in weak["signals_out"]
    shown = admin.get(f"/admin/discovery/candidates?status=new&min_relevance={POSSIBLE_MIN}&page_size=100").json()
    assert "WS2" not in [x["openalex_id"] for x in shown["items"]]
    ris = admin.get(f"/admin/discovery/export.ris?status=new&min_relevance={STRONG_MIN}").text
    assert "OSeMOSYS capacity expansion" in ris and "guinea pigs" not in ris
    r = admin.post("/admin/discovery/candidates/dismiss-weak", json={"max_relevance": POSSIBLE_MIN - 1})
    assert r.status_code == 200 and r.json()["count"] >= 1
    assert "WS2" in [x["openalex_id"] for x in admin.get("/admin/discovery/candidates?status=irrelevant&page_size=100").json()["items"]]
    assert "WS2" not in [x["openalex_id"] for x in admin.get("/admin/discovery/candidates?status=new&page_size=100&min_relevance=-99").json()["items"]]
    assert admin.post("/admin/discovery/candidates/rescore").json()["count"] >= 3
