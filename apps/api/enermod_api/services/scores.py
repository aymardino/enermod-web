"""Coverage, gap and readiness scores. The formulas are those documented on the
Methodology page and in the thesis (Section 5.4); the tests check them against the
published figures (South Africa 9.8, Ghana 8.8, 39 ranked countries, average 5.4)."""
from __future__ import annotations

import re

from enermod_api.services.data import FEATURE_FIELDS, s


def coverage(studies: list[dict], col: str, positive=("yes",)) -> dict:
    """Share of 'yes' among the studies where the field was assessed (blank = not assessed)."""
    assessed = [s(d.get(col)).lower() for d in studies]
    assessed = [v for v in assessed if v and v not in ("unknown", "not_stated")]
    pos = sum(1 for v in assessed if v in {p.lower() for p in positive})
    n = len(assessed)
    return {"positive": pos, "assessed": n, "total": len(studies), "pct": round(pos / n * 100) if n else 0}


def studies_for_country(studies: list[dict], iso: str) -> list[dict]:
    return [d for d in studies if iso in d["countries"]]


def compute_gap_score(row: dict) -> float:
    """0-100, higher = bigger modelling gap. Components: feature coverage 35, data 30,
    governance 20 (neutral mid-value when not assessed), distinct tools capped at 10: 15."""
    feat = row.get("feature_ratio", 0) or 0
    dat = {"good": 2, "limited": 1, "none": 0}.get(s(row.get("data_availability")), 1)
    gov = {"strong": 2, "moderate": 1, "weak": 0}.get(s(row.get("energy_governance")), 1)
    n = min(row.get("n_tools", 0) or 0, 10)
    return round((1 - feat) * 35 + (1 - dat / 2) * 30 + (1 - gov / 2) * 20 + (1 - n / 10) * 15)


def compute_readiness(row: dict) -> float | None:
    """0-10. None when energy governance is not assessed (countries RISE does not cover)."""
    gov_raw = s(row.get("energy_governance"))
    if not gov_raw:
        return None
    gov_pts = {"strong": 3, "moderate": 1.5, "weak": 0}.get(gov_raw, 0)
    dat_pts = {"good": 3, "limited": 1.5, "none": 0}.get(s(row.get("data_availability")), 0)
    ndc_pt = 1 if s(row.get("has_ndc")) == "yes" else 0
    lts_pt = 1 if s(row.get("has_lts")) == "yes" else 0
    try:
        elec = float(row.get("electrification_rate") or 0)
    except (TypeError, ValueError):
        elec = 0
    return round(gov_pts + dat_pts + ndc_pt + lts_pt + min(elec / 100 * 2, 2), 1)


def feature_ratio(cs: list[dict]) -> float:
    """Mean over the four African-specific dimensions of the share of assessed studies covering it."""
    if not cs:
        return 0.0
    ratios = []
    for f in FEATURE_FIELDS:
        vals = [s(d.get(f)).lower() for d in cs]
        assessed = [v for v in vals if v]
        ratios.append(sum(1 for v in assessed if v == "yes") / len(assessed) if assessed else 0)
    return sum(ratios) / len(FEATURE_FIELDS)


def enrich_countries(countries: list[dict], studies: list[dict]) -> list[dict]:
    out = []
    for c in countries:
        cs = studies_for_country(studies, c["iso_code"])
        tools = set()
        for d in cs:
            tools.update(d["tools"])
        row = dict(c)
        row["n_studies"] = len(cs)
        row["n_full"] = sum(1 for d in cs if d["level"] == "full")
        row["n_light"] = sum(1 for d in cs if d["level"] == "light")
        row["n_tools"] = len(tools)
        row["feature_ratio"] = feature_ratio(cs)
        row["gap_score"] = compute_gap_score(row)
        row["readiness_score"] = compute_readiness(row)
        row["african_led"] = sum(1 for d in cs if d["origin_class"] == "African-led")
        out.append(row)
    return out


_WORD = re.compile(r"\w+")


def keywords(text: str) -> set[str]:
    return {w.lower() for w in _WORD.findall(text or "") if len(w) > 2}
