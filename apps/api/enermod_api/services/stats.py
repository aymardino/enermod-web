"""Aggregates served to the observatory pages (home, gaps, readiness, tools, countries)."""
from __future__ import annotations

from collections import Counter

from enermod_api.services.data import AFRICAN_ISO2, FEATURE_FIELDS, ISO2_TO_ISO3, TECH_FIELDS, Corpus, s, tokens
from enermod_api.services.scores import coverage

try:
    import pycountry
    _WORLD_ISO3 = {c.alpha_2: c.alpha_3 for c in pycountry.countries}
    _WORLD_NAMES = {c.alpha_2: getattr(c, "common_name", c.name) for c in pycountry.countries}
except Exception:        # pragma: no cover - pycountry is optional
    _WORLD_ISO3, _WORLD_NAMES = {}, {}
ISO2_TO_ISO3_WORLD = {**_WORLD_ISO3, **ISO2_TO_ISO3}


def filter_level(studies: list[dict], level: str | None) -> list[dict]:
    if not level or level == "all":
        return studies
    return [d for d in studies if d["level"] == level]


def by_year(studies: list[dict]) -> list[dict]:
    years = sorted({d["year"] for d in studies if d["year"]})
    rows = []
    for y in years:
        ds = [d for d in studies if d["year"] == y]
        rows.append({"year": y, "studies": len(ds), "full": sum(1 for d in ds if d["level"] == "full"),
                     "light": sum(1 for d in ds if d["level"] == "light")})
    return rows


def origin_map(studies: list[dict], corpus: Corpus) -> list[dict]:
    """One row per author country: studies counted once per study, grouped Africa / outside."""
    oc: Counter = Counter()
    for d in studies:
        codes = {x.strip()[:2].upper() for x in s(d.get("author_origin")).replace(",", ";").split(";") if x.strip()}
        for code in codes:
            oc[code] += 1
    rows = []
    for code, n in oc.items():
        iso3 = ISO2_TO_ISO3_WORLD.get(code)
        if not iso3:
            continue
        name = corpus.countries_by_iso.get(code, {}).get("country_name") or _WORLD_NAMES.get(code, code)
        rows.append({"iso2": code, "iso3": iso3, "n": n, "name": name,
                     "group": "africa" if code in AFRICAN_ISO2 else "outside"})
    rows.sort(key=lambda r: -r["n"])
    return rows


def origin_shares(studies: list[dict]) -> dict:
    classes = [d["origin_class"] for d in studies if d["origin_class"]]
    n = len(classes)
    c = Counter(classes)
    pct = lambda k: round(c.get(k, 0) / n * 100) if n else 0  # noqa: E731
    return {"assessed": n, "african_led": c.get("African-led", 0), "mixed": c.get("Mixed", 0),
            "non_african": c.get("Non-African", 0), "african_led_pct": pct("African-led"),
            "mixed_pct": pct("Mixed"), "non_african_pct": pct("Non-African")}


def top_tools(studies: list[dict], n: int = 12) -> list[dict]:
    c: Counter = Counter()
    for d in studies:
        for t in d["tools"]:
            c[t] += 1
    return [{"tool": t, "studies": k} for t, k in c.most_common(n)]


def overview(corpus: Corpus) -> dict:
    studies = corpus.studies
    years = [d["year"] for d in studies if d["year"]]
    covered = sum(1 for c in corpus.countries if c["n_studies"] > 0)
    full = [d for d in studies if d["level"] == "full"]
    light = [d for d in studies if d["level"] == "light"]
    shares = origin_shares(studies)
    open_cov = coverage(studies, "open_source", positive=("open", "mixed"))
    latest = sorted(studies, key=lambda d: (d.get("created_at") or "", d["study_id"]), reverse=True)[:6]
    return {
        "n_studies": len(studies), "n_full": len(full), "n_light": len(light),
        "year_min": min(years) if years else None, "year_max": max(years) if years else None,
        "n_countries": len(corpus.countries), "countries_covered": covered,
        "n_tools": len(corpus.tools), "n_tools_used": len({t for d in studies for t in d["tools"]}),
        "origin": shares,
        "african_led_full_pct": origin_shares(full)["african_led_pct"],
        "african_led_light_pct": origin_shares(light)["african_led_pct"],
        "open_pct": open_cov["pct"], "open_assessed": open_cov["assessed"],
        "grey": coverage(studies, "grey_literature")["positive"],
        "by_year": by_year(studies),
        "origin_map": origin_map(studies, corpus),
        "top_tools": top_tools(studies, 10),
        "latest": [{"study_id": d["study_id"], "title": d["full_title"] or d["model_name"], "year": d["year"],
                    "tools": d["tools"][:3], "source": d["source"]} for d in latest],
        "pools": [{"code": p["pool_code"], "name": p["pool_name"],
                   "studies": sum(1 for d in studies if p["pool_code"] in d["pools"])} for p in corpus.pools],
        "regions": sorted({c["region"] for c in corpus.countries if c["region"]}),
    }


def gaps(corpus: Corpus, level: str = "full", regions: list[str] | None = None) -> dict:
    studies = filter_level(corpus.studies, level)
    countries = corpus.countries
    if regions:
        countries = [c for c in countries if c["region"] in regions]
        isos = {c["iso_code"] for c in countries}
        map_studies = [d for d in studies if any(i in isos for i in d["countries"])]
    else:
        map_studies = studies
    features = [{"key": f, **coverage(studies, f)} for f in FEATURE_FIELDS]
    pcts = sorted(f["pct"] for f in features)
    median = (pcts[len(pcts) // 2] if len(pcts) % 2 else (pcts[len(pcts) // 2 - 1] + pcts[len(pcts) // 2]) / 2) if pcts else 0

    # Financing: cost of capital stated, mode of the base rate, variation across scenarios.
    rates = []
    n_varied = n_not_stated = 0
    for d in studies:
        ctype = s(d.get("coc_type")).lower()
        if ctype == "not_stated":
            n_not_stated += 1
        if ctype in ("range", "multiple"):
            n_varied += 1
        if ctype in ("single", "range", "multiple") and d.get("coc_min") is not None:
            try:
                rates.append(float(d["coc_min"]))
            except (TypeError, ValueError):
                pass
    if rates and max(rates) <= 1:
        rates = [r * 100 for r in rates]
    rounded = Counter(round(r) for r in rates)
    mode_rate, mode_n = (rounded.most_common(1)[0] if rounded else (0, 0))
    mechanisms = sum(1 for d in studies if s(d.get("financing_mechanism")).lower() not in ("", "none", "no"))
    fin = coverage(studies, "financing_modelling")

    top_gap = sorted(countries, key=lambda c: -c["gap_score"])[:15]
    return {
        "level": level, "n_studies": len(studies),
        "features": features, "feature_median": median,
        "origin": origin_shares(studies),
        "origin_map": origin_map(map_studies, corpus),
        "n_map_studies": len(map_studies),
        "gap_map": [{"iso2": c["iso_code"], "iso3": c["iso3"], "name": c["country_name"], "gap_score": c["gap_score"],
                     "n_studies": c["n_studies"], "region": c["region"]} for c in countries],
        "financing": {"n_rates": len(rates), "mode_rate": mode_rate,
                      "mode_share": round(mode_n / len(rates) * 100) if rates else 0, "n_varied": n_varied,
                      "n_not_stated": n_not_stated, "financing_pct": fin["pct"], "financing_positive": fin["positive"],
                      "financing_assessed": fin["assessed"], "n_mechanisms": mechanisms,
                      "rate_distribution": [{"rate": r, "studies": n} for r, n in sorted(rounded.items())]},
        "emerging": {"agenda_2063": coverage(studies, "agenda_2063"), "grey_literature": coverage(studies, "grey_literature")},
        "top_gap": [{"iso2": c["iso_code"], "name": c["country_name"], "region": c["region"], "power_pool": c["power_pool"],
                     "n_studies": c["n_studies"], "gap_score": c["gap_score"], "data_availability": c["data_availability"],
                     "energy_governance": c["energy_governance"], "electrification_rate": c["electrification_rate"]}
                    for c in top_gap],
    }


def readiness(corpus: Corpus) -> dict:
    countries = corpus.countries
    ranked = [c for c in countries if c["readiness_score"] is not None]
    bins = [(0, 2), (2, 4), (4, 6), (6, 8), (8, 10.1)]
    dist = [{"range": f"{a}-{min(b, 10):g}", "countries": sum(1 for c in ranked if a <= c["readiness_score"] < b)} for a, b in bins]
    return {
        "n_countries": len(countries), "n_ranked": len(ranked),
        "average": round(sum(c["readiness_score"] for c in ranked) / len(ranked), 1) if ranked else 0,
        "n_below_4": sum(1 for c in ranked if c["readiness_score"] < 4),
        "n_good_data": sum(1 for c in countries if c["data_availability"] == "good"),
        "n_strong_gov": sum(1 for c in countries if c["energy_governance"] == "strong"),
        "n_lts": sum(1 for c in countries if c["has_lts"] == "yes"),
        "distribution": dist,
        "countries": [country_summary(c) for c in sorted(countries, key=lambda c: -(c["readiness_score"] or -1))],
    }


def country_summary(c: dict) -> dict:
    return {k: c.get(k) for k in ("iso_code", "iso3", "country_name", "region", "power_pool", "language",
                                  "energy_governance", "rise_governance_score", "data_availability",
                                  "data_transparency_score", "electrification_rate", "electrification_year",
                                  "has_ndc", "has_lts", "n_studies", "n_full", "n_light", "n_tools",
                                  "feature_ratio", "gap_score", "readiness_score", "african_led")}


def country_detail(corpus: Corpus, iso: str) -> dict | None:
    c = corpus.countries_by_iso.get(iso.upper())
    if not c:
        return None
    cs = [d for d in corpus.studies if iso.upper() in d["countries"]]
    tool_counts = Counter(t for d in cs for t in d["tools"])
    pool = next((p for p in corpus.pools if p["pool_code"] == c["power_pool"]), None)
    return {
        **country_summary(c),
        "by_year": by_year(cs),
        "tools": [{"tool": t, "studies": n} for t, n in tool_counts.most_common(15)],
        "scales": dict(Counter(s(d.get("scale")) or "unspecified" for d in cs)),
        "categories": dict(Counter(tok for d in cs for tok in tokens(d.get("study_category")))),
        "origin": origin_shares(cs),
        "features": [{"key": f, **coverage(cs, f)} for f in FEATURE_FIELDS],
        "national_studies": sum(1 for d in cs if s(d.get("scale")) in ("national", "subnational")),
        "pool": pool,
        "studies": [study_card(d) for d in sorted(cs, key=lambda d: -(d["year"] or 0))[:200]],
    }


def study_card(d: dict) -> dict:
    return {"study_id": d["study_id"], "title": d["full_title"] or d["model_name"], "authors": d["authors"],
            "year": d["year"], "model_name": d["model_name"], "tools": d["tools"], "countries": d["countries"],
            "scale": d["scale"], "level": d["level"], "open_source": d["open_source"],
            "local_ownership": d["local_ownership"], "study_category": d["study_category"], "link": d["link"],
            "source": d["source"], "grey_literature": d["grey_literature"]}


def tool_detail(corpus: Corpus, name: str) -> dict | None:
    t = corpus.tool(name)
    if not t:
        return None
    ts = [d for d in corpus.studies if t["tool_name"] in d["tools"]]
    country_counts = Counter(i for d in ts for i in d["countries"])
    co_used = Counter(x for d in ts for x in d["tools"] if x != t["tool_name"])
    return {
        **t,
        "by_year": by_year(ts),
        "countries": [{"iso2": i, "iso3": ISO2_TO_ISO3.get(i, ""), "name": corpus.countries_by_iso.get(i, {}).get("country_name", i),
                       "studies": n} for i, n in country_counts.most_common()],
        "scales": dict(Counter(s(d.get("scale")) or "unspecified" for d in ts)),
        "levels": dict(Counter(d["level"] for d in ts)),
        "origin": origin_shares(ts),
        "co_used": [{"tool": x, "studies": n} for x, n in co_used.most_common(8)],
        "studies": [study_card(d) for d in sorted(ts, key=lambda d: -(d["year"] or 0))[:300]],
    }


def tool_rows(corpus: Corpus) -> list[dict]:
    """Compact rows for the tools table with a per-year sparkline (last 12 years)."""
    years = [d["year"] for d in corpus.studies if d["year"]]
    y_max = max(years) if years else 2026
    span = list(range(y_max - 11, y_max + 1))
    per_tool: dict[str, Counter] = {}
    for d in corpus.studies:
        for t in d["tools"]:
            per_tool.setdefault(t, Counter())[d["year"]] += 1
    rows = []
    for t in corpus.tools:
        c = per_tool.get(t["tool_name"], Counter())
        rows.append({**{k: t.get(k) for k in ("tool_name", "full_name", "type", "license", "cost_usd", "free_for_developing",
                                               "programming_required", "learning_curve", "time_horizon", "scale",
                                               "data_intensity", "best_for", "origin_institution", "origin_country",
                                               "repo_url", "website_url", "tracker_url", "nb_studies_in_inventory")},
                     "n_studies": t["n_studies"], "sparkline": [c.get(y, 0) for y in span], "span": [span[0], span[-1]],
                     "recent": sum(c.get(y, 0) for y in span[-3:])})
    return rows


def facets(corpus: Corpus) -> dict:
    studies = corpus.studies
    def count(field, split=False):
        c: Counter = Counter()
        for d in studies:
            vals = tokens(d.get(field)) if split else [s(d.get(field))]
            for v in vals:
                if v:
                    c[v] += 1
        return [{"value": k, "n": n} for k, n in c.most_common()]
    years = [d["year"] for d in studies if d["year"]]
    return {
        "year_min": min(years) if years else 2000, "year_max": max(years) if years else 2026,
        "scale": count("scale"), "approach": count("approach"), "method": count("method", split=True),
        "open_source": count("open_source"), "level": [{"value": k, "n": n} for k, n in Counter(d["level"] for d in studies).items()],
        "study_category": count("study_category", split=True), "sector": count("sector", split=True),
        "aisesa_theme": count("aisesa_theme", split=True),
        "tools": [{"value": t["tool"], "n": t["studies"]} for t in top_tools(studies, 200)],
        "countries": [{"value": c["iso_code"], "name": c["country_name"], "n": c["n_studies"]} for c in corpus.countries],
        "pools": [{"value": p["pool_code"], "name": p["pool_name"]} for p in corpus.pools],
        "tech": TECH_FIELDS, "features": FEATURE_FIELDS,
    }
