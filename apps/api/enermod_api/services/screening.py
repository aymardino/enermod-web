"""Screening aid for discovery candidates.

The review screened 7,759 records by hand with two keyword lists in Rayyan (thesis Appendix
C.4): inclusion signals in green, exclusion signals in red. The search itself is deliberately
broad (recall first), so most of what OpenAlex returns is out of scope. This module turns the
two lists into a score on title and abstract, so the curation page can rank candidates and
set the weakest aside in one go. It assists; it never decides on its own.

Scores: a named instrument counts most (the eligibility criterion is a technology-explicit
modelling tool, or GIS spatial analysis, or system dynamics); modelling vocabulary counts
less; off-topic vocabulary and non-African geography count against. Acronyms that are also
plain words (TIMES, MESSAGE, LEAP, SWITCH…) match case-sensitively, which the OpenAlex search
cannot do and which is where much of its noise comes from.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from enermod_api import models

log = logging.getLogger("enermod.screening")

SCORER_VERSION = 1                 # bump when the lists change: stored scores are then recomputed
STRONG_MIN = 5                     # "likely in scope"
POSSIBLE_MIN = 2                   # worth a look; below this, "weak"

# Named instruments. Case-sensitive where the acronym is a plain word; the rest case-insensitive.
TOOLS_CASE = ["LEAP", "TIMES", "MESSAGE", "MESSAGEix", "SWITCH", "NEMO", "CERC", "SPLAT", "WASP", "WAsP", "MAED",
              "POLES", "CLEWs", "TIAM", "MARKAL", "GCAM", "HOMER", "PLEXOS", "SATIM", "TEMBA", "SAM", "ETAP", "PVGIS",
              "STELLA", "CLOVER", "H2RES", "MoCES", "M-LED", "TRNSYS", "GAMS", "Temoa", "LUT"]
TOOLS_ANY = ["OSeMOSYS", "OnSSET", "Calliope", "Balmorel", "PyPSA", "EnergyPLAN", "RETScreen", "Dispa-SET", "FlexTool",
             "clicSAND", "NECAL2050", "Vensim", "PVsyst", "DIgSILENT", "PowerFactory", "iHOGA", "GridPath", "oemof",
             "EnergyScope", "PRIMES", "Network Planner", "MATPOWER", "Pyomo", "urbs", "OpenDSS", "Antares",
             "System Advisor Model", "HOMER Pro", "HOMER Grid", "Energy System Transition Model", "GIS-MCDA", "GIS-MCDM",
             "GIS-AHP", "ArcGIS", "QGIS"]
# Modelling vocabulary that marks the kind of study the inventory holds (weight 2).
PHRASES = ["energy system model", "energy systems model", "energy system modelling", "energy system modeling",
           "energy modelling", "energy modeling", "energy model", "energy planning model", "power system model",
           "electricity system model", "capacity expansion", "generation expansion", "least-cost", "least cost",
           "cost-optimal", "techno-economic", "techno economic", "optimization model", "optimisation model",
           "optimal sizing", "optimum sizing", "system dynamics", "electrification planning", "geospatial",
           "linear programming", "mixed-integer", "mixed integer", "MILP", "LCOE", "levelized cost", "levelised cost",
           "unit commitment", "economic dispatch", "integrated assessment", "energy scenarios", "scenario analysis",
           "decarbonization pathway", "decarbonisation pathway", "net-zero", "net zero", "hybrid renewable energy system",
           "hybrid energy system", "hybrid power system", "mini-grid", "minigrid", "microgrid", "micro-grid",
           "energy planning", "power system planning", "generation planning", "long-term energy", "energy transition pathway",
           "rural electrification", "universal electrification", "electricity access", "energy access", "off-grid",
           "net present cost", "multi-criteria", "multicriteria", "analytic hierarchy", "site selection", "suitability",
           "energy mix", "generation mix", "power pool", "transmission expansion", "demand projection", "energy demand projection",
           "clean cooking", "cooking energy", "energy demand", "electricity demand", "load profile", "demand-side"]
# Weak signals (weight 1), counted up to a cap.
WORDS = ["scenario", "scenarios", "optimization", "optimisation", "optimize", "optimise", "simulation", "simulate",
         "modelling", "modeling", "model", "models", "software", "tool", "framework", "GIS", "bottom-up", "top-down",
         "mitigation", "energy transition", "electrification", "feasibility", "sizing", "dispatch", "planning", "pathways",
         "cost", "investment", "storage", "battery", "photovoltaic", "PV", "solar", "wind", "hydro", "hydropower",
         "diesel", "renewable", "grid", "emissions", "2030", "2040", "2050", "2060"]
# Exclusion signals: the review's red list, plus the look-alikes behind the broad search.
OUT = {
    -4: ["guinea pig", "guinea pigs", "papua new guinea", "new guinea", "clinical", "patients", "patient", "disease",
         "diseases", "malaria", "HIV", "vaccine", "vaccination", "tumor", "tumour", "cancer", "surgery", "mortality",
         "maternal", "infant", "grid cells", "stem cell", "stem cells", "cell line", "cell lines", "cellular", "protein",
         "gene", "genes", "genetic", "genome", "species", "animal", "animals", "biological", "biology", "bacteria", "virus",
         "sediment", "biodiversity", "fisheries", "marine", "ocean", "livestock", "nutrition", "neuron", "neurons",
         "neural network", "neural networks", "deep learning", "antenna", "wireless", "5G", "telecom", "telecommunication",
         "telecommunications", "fault detection", "fault location", "harmonics", "harmonic", "voltage stability",
         "transient stability", "power quality", "MPPT", "inverter topology", "converter topology", "partial discharge",
         "switchgear", "insulator", "lightning", "nanoparticles", "catalyst", "electrode", "electrolyte", "cathode", "anode"],
    -2: ["machine learning", "regression", "ARIMA", "econometric", "qualitative", "cross-sectional", "cohort", "prevalence",
         "children", "child", "religion", "religious", "colonial", "political", "politics", "historical", "history",
         "bibliometric", "literature review", "systematic review", "this review", "meta-analysis", "downscaling",
         "climatology", "meteorology", "groundwater", "soil", "soils", "crop", "crops", "fish", "water quality",
         "wastewater", "air conditioning", "building envelope", "thermal comfort", "cloud computing", "blockchain",
         "internet of things", "IoT", "cybersecurity", "intrusion", "transformer", "transformers", "relay",
         "protection scheme", "load forecasting", "load flow", "power flow", "power electronics",
         "electric vehicle charging", "battery chemistry"],
    -1: ["time series", "questionnaire", "survey", "surveys", "interviews", "women", "gender", "Monte Carlo",
         "irrigation", "agriculture", "agricultural", "hydrology", "hydrological", "voltage", "forecasting",
         "China", "Chinese", "India", "Indian", "Asia", "Asian", "Europe", "European", "America", "American", "USA",
         "United States", "United Kingdom", "Italy", "France", "Germany", "Spain", "Turkey", "Brazil", "Australia",
         "Japan", "Korea", "Pakistan", "Bangladesh", "Indonesia", "Vietnam", "Iran", "Iraq", "Saudi", "Mediterranean",
         "Middle East", "Atlantic", "OECD"],
}
ENERGY_CONTEXT = ["energy", "electricity", "electric", "power", "solar", "wind", "hydro", "grid", "electrif", "fuel",
                  "renewable", "generation", "photovoltaic", "photo-voltaic", "PV", "battery", "diesel", "biomass",
                  "hydrogen", "kWh", "MWh", "GWh", "kW", "MW", "GW"]

WEIGHT_TOOL, WEIGHT_PHRASE, WEIGHT_WORD, WORD_CAP, OUT_CAP, GEO_CAP = 4, 2, 1, 4, -8, -2


def _word_re(term: str, case: bool) -> re.Pattern:
    # whole words; hyphens and spaces inside a term are literal
    return re.compile(rf"(?<![A-Za-z0-9]){re.escape(term)}(?![A-Za-z0-9])", 0 if case else re.IGNORECASE)


_TOOLS = [(t, _word_re(t, True)) for t in TOOLS_CASE] + [(t, _word_re(t, False)) for t in TOOLS_ANY]
_PHRASES = [(t, _word_re(t, False)) for t in PHRASES]
_WORDS = [(t, _word_re(t, t.isupper())) for t in WORDS]
_OUT = [(w, t, _word_re(t, t.isupper() and len(t) <= 4)) for w, terms in OUT.items() for t in terms]
_ENERGY = [_word_re(t, False) if not t.endswith("if") else re.compile(re.escape(t), re.IGNORECASE) for t in ENERGY_CONTEXT]


@dataclass
class Screening:
    score: int
    signals_in: list[str]
    signals_out: list[str]

    @property
    def bucket(self) -> str:
        return "strong" if self.score >= STRONG_MIN else "possible" if self.score >= POSSIBLE_MIN else "weak"

    @property
    def signals(self) -> str:
        """One line for storage: green terms, then red ones after ' | -'."""
        out = ", ".join(self.signals_in)
        if self.signals_out:
            out += " | -" + ", -".join(self.signals_out)
        return out[:1000]


def screen(title: str | None, abstract: str | None = "") -> Screening:
    text = f"{title or ''}\n{abstract or ''}"
    score, inn, out = 0, [], []
    for name, rx in _TOOLS:
        if rx.search(text):
            score += WEIGHT_TOOL
            inn.append(name)
    for name, rx in _PHRASES:
        if rx.search(text):
            score += WEIGHT_PHRASE
            inn.append(name)
    weak = [name for name, rx in _WORDS if rx.search(text)]
    score += min(len(weak), WORD_CAP) * WEIGHT_WORD
    inn.extend(weak[:WORD_CAP])
    penalty, geo = 0, 0
    for weight, name, rx in _OUT:
        if rx.search(text):
            if weight == -1:
                geo += weight          # the mild group together counts at most GEO_CAP
            else:
                penalty += weight
            out.append(name)
    penalty += max(geo, GEO_CAP)
    if not any(rx.search(text) for rx in _ENERGY):
        penalty -= 3
        out.append("no energy context")
    score += max(penalty, OUT_CAP)
    return Screening(score=score, signals_in=inn, signals_out=out)


def bucket_of(score: int | None) -> str:
    if score is None:
        return "weak"
    return Screening(score, [], []).bucket


def apply(cand: models.Candidate) -> None:
    s = screen(cand.title, cand.abstract)
    cand.relevance, cand.signals = s.score, s.signals


def backfill(db: Session) -> int:
    """Scores the candidates that have no score, or every candidate after a change of the
    lists (SCORER_VERSION), and returns how many were (re)scored."""
    row = db.get(models.Setting, "screening_version")
    stored = int((row.value or {}).get("version", 0)) if row else 0
    q = select(models.Candidate)
    if stored == SCORER_VERSION:
        q = q.where(models.Candidate.relevance.is_(None))
    n = 0
    for cand in db.scalars(q).yield_per(500):
        apply(cand)
        n += 1
        if n % 500 == 0:
            db.commit()
    if row:
        row.value = {"version": SCORER_VERSION}
    else:
        db.add(models.Setting(key="screening_version", value={"version": SCORER_VERSION}))
    db.commit()
    if n:
        log.info("screening: %d candidates scored (lists v%d)", n, SCORER_VERSION)
    return n


def dismiss_weak(db: Session, max_score: int) -> int:
    """Sets the new candidates scored at or under `max_score` aside as irrelevant."""
    r = db.execute(update(models.Candidate)
                   .where(models.Candidate.status == "new", models.Candidate.relevance.is_not(None),
                          models.Candidate.relevance <= max_score)
                   .values(status="irrelevant", note=f"set aside: screening score {max_score} or less"))
    db.commit()
    return int(r.rowcount or 0)
