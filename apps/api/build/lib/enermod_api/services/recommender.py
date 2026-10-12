"""Tool recommender: scores every publicly available tool against the user's context.

Faithful port of the Streamlit recommender (pages/5_Recommender.py). Answers are keys,
labels live in the web app. The score breakdown is returned so the ranking can be explained.
"""
from __future__ import annotations

from enermod_api.services.data import Corpus, s, tokens

OBJECTIVES = ["national_planning", "electrification", "prefeasibility", "regional_trade", "operation",
              "resource", "nexus", "demand", "emissions", "buildings"]
SCALES = ["facility", "subnational", "national", "regional", "continental"]
HORIZONS = ["long", "medium", "short"]
BUDGETS = ["none", "limited", "any"]
CAPACITIES = ["limited", "intermediate", "advanced"]
DATA = ["good", "moderate", "limited"]
EXTRAS = ["open_source", "clean_cooking", "financing", "non_windows", "helpdesk"]

# Scales and horizons that make sense for each objective (follows the inventory).
ALLOWED = {
    "national_planning": (["subnational", "national", "regional", "continental"], HORIZONS),
    "electrification": (SCALES, HORIZONS),
    "prefeasibility": (["facility", "subnational"], ["short"]),
    "regional_trade": (["regional", "continental"], HORIZONS),
    "operation": (["facility", "subnational", "national", "regional"], HORIZONS),
    "resource": (SCALES, ["short"]),
    "nexus": (["subnational", "national", "regional", "continental"], HORIZONS),
    "demand": (SCALES, HORIZONS),
    "emissions": (SCALES, HORIZONS),
    "buildings": (["facility", "subnational"], ["short"]),
}
# best_for tokens (primary signal, +30) and tool types (secondary, +10) per objective
BEST_FOR = {
    "national_planning": (["national_planning"], ["capacity_expansion", "accounting"]),
    "electrification": (["electrification_planning", "geospatial_analysis"], ["geospatial_electrification"]),
    "prefeasibility": (["project_prefeasibility", "minigrid_hybrid_design"], ["hybrid_optimization"]),
    "regional_trade": (["regional_trade"], ["capacity_expansion"]),
    "operation": (["power_system_operation", "grid_reliability"], ["production_cost", "reliability"]),
    "resource": (["resource_assessment"], ["simulation"]),
    "nexus": (["nexus_water_land"], ["nexus", "hydrological"]),
    "demand": (["demand_forecasting"], ["demand_forecast"]),
    "emissions": (["emissions_air_quality"], []),
    "buildings": (["buildings_thermal"], []),
}
SCALE_TOKENS = {"facility": ["facility", "community"], "subnational": ["subnational"], "national": ["national"],
                "regional": ["regional"], "continental": ["continental", "global"]}
PAID_DEPENDENCIES = ("gams", "matlab", "arcgis", "vensim", "stella", "powersim", "anylogic")
WEIGHTS_NOTE = ("objective match +30 (+10 tool type); scale fit +12; licence budget -25 to +15; capacity and "
                "support -20 to +23; time horizon +10; data fit -8 to +10; African track record +5 to +10; "
                "optional requirements -15 to +10 each; the open-source requirement filters the ranking; "
                "in-house models (licence: internal) are never ranked.")


def options() -> dict:
    return {"objectives": OBJECTIVES, "scales": SCALES, "horizons": HORIZONS, "budgets": BUDGETS,
            "capacities": CAPACITIES, "data": DATA, "extras": EXTRAS, "allowed": ALLOWED, "weights": WEIGHTS_NOTE}


def score_tool(tool: dict, objective=None, scale=None, budget=None, capacity=None, horizon=None, data=None,
               extras=()) -> tuple[int, dict]:
    b: dict[str, int] = {}
    bf = {x.lower() for x in tokens(tool.get("best_for"))}
    typ = s(tool.get("type"))
    lic = s(tool.get("license"))
    fd = s(tool.get("free_for_developing")) == "yes"
    paid_dep = any(k in s(tool.get("proprietary_dependency")).lower() for k in PAID_DEPENDENCIES)
    prog = s(tool.get("programming_required"))
    tr = s(tool.get("training_available")) == "yes"
    hd = s(tool.get("helpdesk")) == "yes"
    com = s(tool.get("community")) == "yes"
    doc = s(tool.get("doc_quality"))
    hz = {x.lower() for x in tokens(tool.get("time_horizon"))}
    sc = {x.lower() for x in tokens(tool.get("scale"))}
    di = s(tool.get("data_intensity"))
    cc = s(tool.get("clean_cooking_capable"))
    fin = s(tool.get("financing_modelling"))
    os_ = s(tool.get("os"))
    studies = int(tool.get("n_studies") or tool.get("nb_studies_in_inventory") or 0)

    if objective in BEST_FOR:
        bf_keys, type_keys = BEST_FOR[objective]
        pts = (30 if bf & set(bf_keys) else 0) + (10 if typ in type_keys else 0)
        if pts:
            b["objective"] = pts
    if scale in SCALE_TOKENS:
        if sc & set(SCALE_TOKENS[scale]):
            b["scale"] = 12
        elif "varies" in sc:
            b["scale"] = 6
    if budget == "none":
        pts = 0
        if lic in ("open_source", "free"):
            pts += 15
        elif lic == "freemium":
            pts += 12 if fd else 5
        elif lic == "proprietary":
            pts += -5 if fd else -25
        if paid_dep:
            pts -= 10
        if pts:
            b["budget"] = pts
    elif budget == "limited":
        pts = 0
        if lic in ("open_source", "free", "freemium"):
            pts += 10
        elif lic == "proprietary" and not fd:
            pts -= 10
        if paid_dep:
            pts -= 5
        if pts:
            b["budget"] = pts
    if capacity == "limited":
        pts = (15 if prog == "none" else -20 if prog == "advanced" else 0) + (5 if tr else 0) + (5 if hd else 0) + (3 if doc == "high" else 0)
        if pts:
            b["capacity"] = pts
    elif capacity == "intermediate":
        pts = (8 if prog in ("none", "basic") else 0) + (3 if tr else 0) + (3 if com else 0) + (2 if doc == "high" else 0)
        if pts:
            b["capacity"] = pts
    elif capacity == "advanced":
        pts = (10 if prog == "advanced" else 5 if prog == "basic" else 0) + (3 if com else 0) + (2 if doc == "high" else 0)
        if pts:
            b["capacity"] = pts
    if horizon == "long" and "long_term" in hz:
        b["horizon"] = 10
    elif horizon == "medium":
        if "medium_term" in hz:
            b["horizon"] = 10
        elif "long_term" in hz:
            b["horizon"] = 5
    elif horizon == "short" and "short_term" in hz:
        b["horizon"] = 10
    if data == "good" and di == "high":
        b["data"] = 5
    elif data == "moderate":
        if di == "medium":
            b["data"] = 5
        elif di == "low":
            b["data"] = 3
    elif data == "limited":
        if di == "low":
            b["data"] = 10
        elif di == "medium":
            b["data"] = 5
        elif di == "high":
            b["data"] = -8
    ex = set(extras or ())
    pts = 0
    if "clean_cooking" in ex:
        pts += {"yes": 10, "partial": 5}.get(cc, -10)
    if "financing" in ex:
        pts += {"advanced": 10, "basic": 6}.get(fin, -5)
    if "non_windows" in ex and os_ == "windows":
        pts -= 15
    if "helpdesk" in ex:
        pts += 8 if hd else -5
    if pts:
        b["requirements"] = pts
    if studies >= 10:
        b["track_record"] = 10
    elif studies >= 5:
        b["track_record"] = 5
    return sum(b.values()), b


def recommend(corpus: Corpus, answers: dict, limit: int = 8) -> dict:
    extras = set(answers.get("extras") or [])
    rankable = [t for t in corpus.tools if s(t.get("license")) != "internal"]
    n_internal = len(corpus.tools) - len(rankable)
    if "open_source" in extras:
        rankable = [t for t in rankable if s(t.get("license")) == "open_source"]
    scored = []
    for t in rankable:
        total, breakdown = score_tool(t, answers.get("objective"), answers.get("scale"), answers.get("budget"),
                                      answers.get("capacity"), answers.get("horizon"), answers.get("data"), extras)
        scored.append({**t, "score": total, "breakdown": breakdown})
    scored.sort(key=lambda r: (-r["score"], -(r.get("n_studies") or 0), r["tool_name"]))
    return {"results": scored[:limit], "n_ranked": len(rankable), "n_internal": n_internal,
            "open_only": "open_source" in extras, "weights": WEIGHTS_NOTE}
