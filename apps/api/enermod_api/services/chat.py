"""Grounded assistant: retrieves the relevant slice of the observatory (tools, countries,
studies, headline statistics) and asks the model to answer only from it, citing records.

Citations are written by the model as [study 123], [tool HOMER] or [country KE]; the API
turns them into links so every claim can be checked against the inventory.
"""
from __future__ import annotations

import re
import time

from sqlalchemy.orm import Session

from enermod_api import models
from enermod_api.services import llm
from enermod_api.services.data import Corpus, s
from enermod_api.services.scores import keywords
from enermod_api.services.stats import origin_shares, top_tools

HISTORY_TURNS = 8
MAX_QUESTION_CHARS = 1500

TOOL_FIELDS = ["tool_name", "full_name", "type", "license", "cost_usd", "free_for_developing", "proprietary_dependency",
               "programming_required", "learning_curve", "doc_quality", "training_available", "community", "helpdesk",
               "os", "time_horizon", "scale", "data_intensity", "clean_cooking_capable", "financing_modelling",
               "best_for", "n_studies", "origin_institution", "strengths", "weaknesses", "typical_results",
               "often_linked", "info_source", "repo_url", "website_url"]

SYSTEM_PROMPT = """You are the assistant of EnerMod Africa, the African Energy Modelling Observatory built by AISESA and MINES Paris-PSL. It inventories the energy modelling studies (a PRISMA systematic review) and tools applied across the 54 African countries, with country indicators and derived scores.

Rules:
- Answer only from the CONTEXT below (overview statistics, tool profiles, country indicators, studies). If the context does not contain what is asked, say so plainly instead of guessing, and suggest which page of the observatory could help (Map, Gap analysis, Readiness, Studies, Tools, Recommender, Methodology).
- Never invent tools, studies, figures, licences, prices or links. Name tools exactly as written. Only give links that appear in the context.
- Cite what you use: write [study 123] after a claim drawn from study 123, [tool HOMER] for a tool profile, [country KE] for a country record. Cite at most six items.
- The recommender score is a transparent heuristic used to shortlist candidates, not a verdict. Explain rankings with the inventory fields (licence, programming required, scale, time horizon, data intensity, track record in Africa).
- Blank fields mean "not assessed", never "no"; coverage percentages are computed over assessed studies only.
- Reply in the language of the user (English or French). Be concise: under 250 words unless more detail is requested. No em dashes.
- If asked about African energy-system features (informal economy, biomass and charcoal, unreliable supply, rapid urbanisation), remind the user that these are captured by the studies and their data more than by the tools, and that the Gap analysis page measures them at study level.
"""

_CITE_RE = re.compile(r"\[(study|tool|country)\s+([^\]]+?)\]", re.I)


def _line(d: dict, fields: list[str]) -> str:
    return " | ".join(f"{k}={s(d.get(k))}" for k in fields if s(d.get(k)))


def _match_tools(corpus: Corpus, text: str) -> list[dict]:
    low = text.lower()
    hits = []
    for t in corpus.tools:
        name = t["tool_name"].lower()
        if len(name) >= 3 and re.search(r"(?<![a-z0-9])" + re.escape(name) + r"(?![a-z0-9])", low):
            hits.append(t)
    return hits


def _match_countries(corpus: Corpus, text: str) -> list[dict]:
    low = text.lower()
    hits = []
    for c in corpus.countries:
        name = c["country_name"].lower()
        aliases = {name, name.replace("republic of the ", ""), c["iso_code"].lower(), c["iso3"].lower()}
        if any(re.search(r"(?<![a-z])" + re.escape(a) + r"(?![a-z])", low) for a in aliases if len(a) >= 3) \
                or re.search(r"\b" + re.escape(c["iso_code"]) + r"\b", text):
            hits.append(c)
    return hits[:4]


def _match_studies(corpus: Corpus, text: str, tools: list[dict], countries: list[dict], n: int = 8) -> list[dict]:
    q = keywords(text) - {"the", "and", "for", "with", "which", "what", "that", "this", "les", "des", "pour",
                          "dans", "quel", "quelle", "quels", "sont", "avec", "une", "est", "studies", "study"}
    tool_names = {t["tool_name"] for t in tools}
    isos = {c["iso_code"] for c in countries}
    scored = []
    for d in corpus.studies:
        score = 0
        if tool_names and set(d["tools"]) & tool_names:
            score += 3
        if isos and set(d["countries"]) & isos:
            score += 3
        if q:
            hay = keywords(" ".join([d["full_title"], d["model_name"], d["authors"], s(d.get("study_objective"))]))
            score += len(q & hay)
        if score > 0:
            scored.append((score, -(d["year"] or 0), d))
    scored.sort(key=lambda x: (-x[0], x[1]))
    return [d for _, _, d in scored[:n]]


def build_context(corpus: Corpus, question: str, extra: str = "") -> tuple[str, dict]:
    tools = _match_tools(corpus, question)
    countries = _match_countries(corpus, question)
    studies = _match_studies(corpus, question, tools, countries)
    if not tools:
        # No tool named: offer the most used ones so comparisons stay grounded
        q = keywords(question)
        ranked = sorted(corpus.tools, key=lambda t: -(len(q & keywords(" ".join([t["best_for"], t["type"], t["full_name"]]))) * 10 + t["n_studies"]))
        tools = ranked[:6]
    origin = origin_shares(corpus.studies)
    years = [d["year"] for d in corpus.studies if d["year"]]
    parts = [
        "OVERVIEW: "
        f"{len(corpus.studies)} studies ({sum(1 for d in corpus.studies if d['level']=='full')} whole energy-system, "
        f"{sum(1 for d in corpus.studies if d['level']=='light')} focused), published {min(years)}-{max(years)}, "
        f"{len(corpus.tools)} tools, 54 countries. African-led {origin['african_led_pct']}%, mixed {origin['mixed_pct']}%, "
        f"non-African {origin['non_african_pct']}%. Most used tools: "
        + ", ".join(f"{t['tool']} ({t['studies']})" for t in top_tools(corpus.studies, 10)) + ".",
        "TOOLS (one per line, field=value):",
        *[_line(t, TOOL_FIELDS) for t in tools[:8]],
    ]
    if countries:
        parts.append("COUNTRIES:")
        for c in countries:
            cs = [d for d in corpus.studies if c["iso_code"] in d["countries"]]
            tl = top_tools(cs, 6)
            parts.append(
                f"country={c['iso_code']} | name={c['country_name']} | region={c['region']} | power_pool={c['power_pool']} | "
                f"studies={c['n_studies']} (whole-system {c['n_full']}, focused {c['n_light']}) | distinct_tools={c['n_tools']} | "
                f"top_tools={', '.join(f'{t['tool']} ({t['studies']})' for t in tl)} | energy_governance={c['energy_governance']} "
                f"(RISE {c['rise_governance_score']}) | data_availability={c['data_availability']} | "
                f"electrification_rate={c['electrification_rate']} | has_ndc={c['has_ndc']} | has_lts={c['has_lts']} | "
                f"gap_score={c['gap_score']} | readiness_score={c['readiness_score']} | african_led_studies={c['african_led']}")
    if studies:
        parts.append("STUDIES:")
        for d in studies:
            parts.append(
                f"study={d['study_id']} | year={d['year']} | title={d['full_title'][:160]} | authors={d['authors'][:80]} | "
                f"tools={', '.join(d['tools'])} | countries={', '.join(d['countries'][:12])} | scale={d['scale']} | "
                f"scope={d['level']} | licence={d['open_source']} | local_ownership={d['local_ownership']} | "
                f"objective={s(d.get('study_objective'))[:220]} | link={d['link']}")
    if extra:
        parts.append("PAGE CONTEXT (current session):\n" + extra[:3000])
    meta = {"tools": [t["tool_name"] for t in tools], "countries": [c["iso_code"] for c in countries],
            "studies": [d["study_id"] for d in studies]}
    return "\n".join(parts), meta


def extract_citations(text: str, corpus: Corpus) -> list[dict]:
    out, seen = [], set()
    for kind, ref in _CITE_RE.findall(text):
        kind, ref = kind.lower(), ref.strip()
        key = (kind, ref.lower())
        if key in seen:
            continue
        seen.add(key)
        if kind == "study" and ref.isdigit() and int(ref) in corpus.by_id:
            d = corpus.by_id[int(ref)]
            out.append({"type": "study", "id": ref, "label": (d["full_title"] or d["model_name"])[:90],
                        "href": f"/observatory/studies/{ref}"})
        elif kind == "tool" and corpus.tool(ref):
            t = corpus.tool(ref)
            out.append({"type": "tool", "id": t["tool_name"], "label": t["tool_name"],
                        "href": f"/observatory/tools/{t['tool_name']}"})
        elif kind == "country" and ref.upper() in corpus.countries_by_iso:
            c = corpus.countries_by_iso[ref.upper()]
            out.append({"type": "country", "id": c["iso_code"], "label": c["country_name"],
                        "href": f"/observatory/countries/{c['iso_code']}"})
    return out


def answer(db: Session, corpus: Corpus, messages: list[dict], locale: str = "en", extra: str = "") -> dict:
    history = [{"role": "user" if m["role"] == "user" else "assistant", "content": str(m["content"])[:MAX_QUESTION_CHARS]}
               for m in messages if m.get("content")][-2 * HISTORY_TURNS:]
    if not history or history[-1]["role"] != "user":
        raise ValueError("The last message must come from the user")
    question = history[-1]["content"]
    context, meta = build_context(corpus, question, extra)
    system = SYSTEM_PROMPT + "\nCONTEXT:\n" + context
    t0 = time.time()
    log = models.ChatLog(question=question[:2000], locale=locale)
    try:
        res = llm.complete(system, history)
        text = res.text.strip() or ("Je n'ai pas pu produire de réponse, reformulez la question." if locale == "fr"
                                     else "I could not produce an answer. Please rephrase the question.")
        if res.refused:
            text = ("Je ne peux pas répondre à cette demande." if locale == "fr" else "I cannot help with that request.")
        citations = extract_citations(text, corpus)
        log.answer, log.provider, log.model, log.citations = text[:4000], res.provider, res.model, citations
        log.input_tokens, log.output_tokens = res.input_tokens, res.output_tokens
        ok = True
    except llm.LLMUnavailable:
        raise
    except Exception as exc:                 # noqa: BLE001  quota, network, bad key: keep the page alive
        text = ("L'assistant n'a pas pu répondre cette fois (" + type(exc).__name__ + "). Réessayez plus tard."
                if locale == "fr" else f"The assistant could not answer this time ({type(exc).__name__}). Please try again later.")
        citations, ok = [], False
        log.answer, log.ok = text, False
        res = None
    log.duration_ms = int((time.time() - t0) * 1000)
    db.add(log)
    db.commit()
    return {"answer": text, "citations": citations, "ok": ok, "provider": getattr(res, "provider", ""),
            "model": getattr(res, "model", ""), "grounding": meta}
