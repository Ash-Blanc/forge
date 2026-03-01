import streamlit as st
import re
import json
import os
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from dotenv import load_dotenv
from utils import parse_agent_json, extract_arxiv_id, fetch_arxiv_meta, build_saas_prompt, download_arxiv_pdf
from agno.agent import Agent
from agno.tools.parallel import ParallelTools
from agents import (
    AVAILABLE_MODELS,
    DEFAULT_MODEL_KEY,
    run_analysis_agent,
    run_competitor_agent,
    run_suggestion_agent,
    run_saas_boost_agent,
    get_model,
    SYSTEM_PROMPT,
    COMPETITOR_RESEARCH_PROMPT,
    SUGGESTION_PROMPT,
)

SESSIONS_FILE = os.path.join(os.path.dirname(__file__), "sessions.json")


def load_sessions() -> dict:
    if os.path.exists(SESSIONS_FILE):
        try:
            with open(SESSIONS_FILE, "r") as f:
                return json.load(f)
        except:
            return {}
    return {}


def save_sessions(sessions: dict) -> None:
    with open(SESSIONS_FILE, "w") as f:
        json.dump(sessions, f, indent=2)


def init_session_state() -> None:
    if "sessions" not in st.session_state:
        st.session_state.sessions = load_sessions()
    if "current_session_id" not in st.session_state:
        st.session_state.current_session_id = None
    # Legacy key support
    if "current_arxiv_id" not in st.session_state:
        st.session_state.current_arxiv_id = None
    if "app_mode" not in st.session_state:
        st.session_state.app_mode = "📄 Paper → Idea"


init_session_state()

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

st.set_page_config(
    page_title="FORGE | Deep Paper Distillery",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
<style>
    .stMetric { background-color: var(--secondary-background-color) !important; padding: 15px; border-radius: 12px; }
    .saas-header { font-weight: 800; font-size: 2.2rem; background: -webkit-linear-gradient(45deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .idea-card { background-color: var(--secondary-background-color); padding: 1rem; border-radius: 12px; margin-bottom: 0.5rem; border: 1px solid var(--faded-text-10); }
    .tag-container { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
    .custom-tag { background-color: var(--secondary-background-color); padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.7rem; font-weight: 600; }
    #MainMenu {visibility: hidden;} footer {visibility: hidden;}
</style>
""",
    unsafe_allow_html=True,
)


def extract_arxiv_id(input_str: str) -> str | None:
    input_str = input_str.strip()
    if re.match(r"^\d{4}\.\d{4,5}(v\d+)?$", input_str):
        return input_str
    match = re.search(r"arxiv\.org/(?:abs|pdf)/(\d{4}\.\d{4,5}(?:v\d+)?)", input_str)
    if match:
        return match.group(1)
    match = re.search(r"(\d{4}\.\d{4,5}(?:v\d+)?)", input_str)
    if match:
        return match.group(1)
    return None


def fetch_arxiv_meta(arxiv_id: str) -> dict:
    url = f"http://export.arxiv.org/api/query?id_list={arxiv_id}"
    try:
        response = urllib.request.urlopen(url, timeout=30)
        xml_data = response.read()
        root = ET.fromstring(xml_data)
        ns = {"default": "http://www.w3.org/2005/Atom"}
        entry = root.find("default:entry", ns)
        if entry is None:
            return {}
        return {
            "title": entry.find("default:title", ns).text.strip().replace("\n", " ") if entry.find("default:title", ns) is not None else "Unknown",
            "authors": [
                a.find("default:name", ns).text
                for a in entry.findall("default:author", ns) if a.find("default:name", ns) is not None
            ],
            "published": entry.find("default:published", ns).text if entry.find("default:published", ns) is not None else "Unknown",
            "abstract": entry.find("default:summary", ns).text.strip().replace("\n", " ") if entry.find("default:summary", ns) is not None else "",
        }
    except Exception as e:
        st.error(f"Failed to fetch from arXiv: {e}")
        return {}


SYSTEM_PROMPT = """You are FORGE — a technical startup ideation expert. Your job is to find NON-OBVIOUS, NOVEL applications that others would miss.

The problem with most AI paper analysis: it says generic things like "use this for healthcare" or "apply to finance" - that's useless.

Your job:
1. Find the SPECIFIC technical capability (not the broad domain)
2. Think of UNUSUAL, CREATIVE applications that the paper enables but no one is building
3. Consider edge cases, niche markets, combinations with other tech

OUTPUT JSON ONLY:

{
  "paperAnalysis": {
    "summary": "2-3 sentence plain-English summary - what does this paper actually DO?",
    "coreBreakthrough": "The ONE specific technical thing this enables (be precise)",
    "keyInnovations": ["Specific technical insight 1", "Specific technical insight 2"],
    "applications": [
      "Niche/unusual application 1 - be specific about WHO would use it and WHY",
      "Niche/unusual application 2",
      "Niche/unusual application 3"
    ],
    "limitations": ["Real limitation 1", "Real limitation 2"]
  },
  "swot": {
    "strengths": ["Technical strength 1", "Technical strength 2"],
    "weaknesses": ["Technical weakness 1", "Technical weakness 2"],
    "opportunities": ["Specific opportunity 1", "Specific opportunity 2"],
    "threats": ["Specific threat 1", "Specific threat 2"]
  },
  "startupIdea": {
    "startupName": "Name",
    "oneLiner": "Y Combinator style (what it does, for who)",
    "theHook": "Why NOW? What's the market timing?",
    "targetUser": {
      "persona": "VERY specific role - e.g. 'Junior QA engineer at Series A fintech' not 'developer'",
      "painPoint": "Exact problem they face daily",
      "currentAlternatives": "What do they use now? What's broken about it?"
    },
    "coreTech": "The paper capability used",
    "product": {
      "coreFeature": "The ONE MVP feature",
      "differentiation": "Why better than [specific alternatives]"
    },
    "business": {
      "pricingModel": "Specific: $X/user/mo or $Y/enterprise",
      "gtm": "How to get first 10 customers"
    },
    "metrics": {
      "novelty": "High/Medium/Low",
      "competition": "Low/Medium/High",
      "confidence": 1-10,
      "mvpMonths": 1-6
    }
  }
}"""


COMPETITOR_RESEARCH_PROMPT = """You are an expert market researcher and competitive intelligence analyst.
A user has proposed a new technical startup idea. Your job is to search the live web to find EXACT AND STRONG COMPETITORS or platforms doing something very similar.

Instructions:
1. Search the web using the provided tools to find companies solving the same pain point or building the same core feature.
2. Select the top 2 to 3 most relevant competitors.
3. If no direct competitors exist, find the closest platform or substitute they are using today.

OUTPUT JSON ONLY. Structure:
{
  "competitors": [
    {
      "name": "Company Name",
      "url": "https://...",
      "description": "What they do in 1 sentence",
      "pricing": "Estimate if known, or 'Unknown'",
      "differentiation": "How the proposed idea is different/better than this competitor"
    }
  ],
  "marketVerdict": "A 2-sentence summary of how crowded or blue-ocean this space is."
}"""

SUGGESTION_PROMPT = """Given this startup idea derived from a research paper, generate 3 alternative ideas the user could explore.

Each should be a different angle but still based on the same paper.

OUTPUT JSON ONLY - array of 3:

{
  "suggestions": [
    {
      "startupName": "Name",
      "oneLiner": "What it does",
      "angle": "e.g. vertical, platform, different user"
    }
  ]
}"""


def build_prompt(meta: dict) -> str:
    return f"""Analyze this paper faithfully and produce execution-ready commercialization paths.

Title: {meta.get("title", "")}
Authors: {", ".join(meta.get("authors", []))}
Abstract: {meta.get("abstract", "")[:5000]}

Requirements:
- Start with a relatable intro overview (2-3 sentences, plain language).
- Capture essence: problem, method, novelty, evidence, limits.
- Avoid generic statements; use specific technical detail.
- If evidence is missing, write "Not explicitly stated".
- Generate exactly 3 paths: platform, feature, api_plugin.
- Recommend one path using feasibility-first logic and explain why.

Return ONLY valid JSON."""


PATH_TYPE_ORDER = ["feature", "api_plugin", "platform"]
PATH_LABELS = {
    "feature": "Niche Feature",
    "api_plugin": "API / Plugin",
    "platform": "Full Platform",
}


def _to_int(value, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _level_to_score(level: str, default: int = 5) -> int:
    if not isinstance(level, str):
        return default
    normalized = level.strip().lower()
    return {"low": 3, "medium": 6, "high": 9}.get(normalized, default)


def _feasibility_score(opportunity: dict) -> float:
    build_weeks = max(1, min(26, _to_int(opportunity.get("buildScopeWeeks"), 8)))
    confidence = max(1, min(10, _to_int(opportunity.get("confidence"), 5)))
    distribution = _level_to_score(opportunity.get("distributionEase"), default=5)
    competition = _level_to_score(opportunity.get("competition"), default=6)

    speed_score = max(1.0, 10.0 - min(10.0, float(build_weeks)))
    competition_penalty = {"low": 0.0, "medium": 0.8, "high": 1.6}.get(
        str(opportunity.get("competition", "")).strip().lower(),
        0.8,
    )
    score = (0.45 * speed_score) + (0.35 * distribution) + (0.20 * confidence) - competition_penalty
    return round(max(0.0, min(10.0, score)), 1)


def _build_intro_overview(paper: dict) -> str:
    intro = str(paper.get("introOverview", "")).strip()
    if intro:
        return intro

    problem = str(paper.get("researchProblem", "")).strip()
    method = str(paper.get("methodInPlainEnglish", "")).strip()
    takeaway = str(paper.get("practicalTakeaway", "")).strip()

    parts = []
    if problem:
        parts.append(f"This paper tackles {problem}.")
    if method:
        parts.append(f"It does this by {method[0].lower() + method[1:] if len(method) > 1 else method}.")
    if takeaway:
        parts.append(f"In practice, this means {takeaway[0].lower() + takeaway[1:] if len(takeaway) > 1 else takeaway}.")

    return " ".join(parts) or "This paper introduces a specific technical method and explores where it can be applied in practice."


def _normalize_opportunity(raw: dict, forced_type: str) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    target = raw.get("targetUser", {}) if isinstance(raw.get("targetUser"), dict) else {}
    product = raw.get("product", {}) if isinstance(raw.get("product"), dict) else {}
    business = raw.get("business", {}) if isinstance(raw.get("business"), dict) else {}
    metrics = raw.get("metrics", {}) if isinstance(raw.get("metrics"), dict) else {}
    risks = raw.get("risks", [])
    if not isinstance(risks, list):
        risks = [str(risks)]

    build_weeks = _to_int(raw.get("buildScopeWeeks"), _to_int(metrics.get("mvpMonths"), 2) * 4 or 8)
    confidence = max(1, min(10, _to_int(raw.get("confidence"), _to_int(metrics.get("confidence"), 5))))

    result = {
        "type": forced_type,
        "name": raw.get("name") or raw.get("startupName") or f"{PATH_LABELS.get(forced_type, forced_type)} Opportunity",
        "oneLiner": raw.get("oneLiner", ""),
        "targetUser": {
            "persona": target.get("persona", "TBD user"),
            "painPoint": target.get("painPoint", "TBD pain point"),
            "currentAlternatives": target.get("currentAlternatives", "TBD alternatives"),
        },
        "coreValue": raw.get("coreValue") or product.get("coreFeature", "") or "TBD value",
        "integrationSurface": raw.get("integrationSurface") or ("Standalone product" if forced_type == "platform" else "Existing workflow/API"),
        "coreTech": raw.get("coreTech", ""),
        "product": {
            "coreFeature": product.get("coreFeature", raw.get("coreValue", "")),
            "differentiation": product.get("differentiation", ""),
        },
        "business": {
            "pricingModel": business.get("pricingModel", ""),
            "gtm": business.get("gtm", ""),
        },
        "whyNow": raw.get("whyNow") or raw.get("theHook", ""),
        "buildScopeWeeks": max(1, min(26, build_weeks)),
        "distributionEase": str(raw.get("distributionEase", "Medium")).title(),
        "competition": str(raw.get("competition", metrics.get("competition", "Medium"))).title(),
        "novelty": str(raw.get("novelty", metrics.get("novelty", "Medium"))).title(),
        "confidence": confidence,
        "firstMilestone": raw.get("firstMilestone", "Ship one usable end-to-end flow."),
        "risks": [str(r).strip() for r in risks if str(r).strip()][:3] or ["Execution risk not specified."],
        "status": raw.get("status", "viable"),
    }
    result["feasibilityScore"] = _feasibility_score(result)
    return result


def _legacy_to_platform_opportunity(idea: dict) -> dict:
    return {
        "type": "platform",
        "name": idea.get("startupName", "TBD"),
        "oneLiner": idea.get("oneLiner", ""),
        "targetUser": idea.get("targetUser", {}),
        "integrationSurface": "Standalone product",
        "coreTech": idea.get("coreTech", ""),
        "product": idea.get("product", {}),
        "business": idea.get("business", {}),
        "whyNow": idea.get("theHook", ""),
        "buildScopeWeeks": _to_int(idea.get("metrics", {}).get("mvpMonths"), 2) * 4 or 8,
        "distributionEase": "Medium",
        "competition": idea.get("metrics", {}).get("competition", "Medium"),
        "novelty": idea.get("metrics", {}).get("novelty", "Medium"),
        "confidence": _to_int(idea.get("metrics", {}).get("confidence"), 5),
        "firstMilestone": idea.get("product", {}).get("coreFeature", "Ship one core feature."),
        "risks": ["Legacy entry did not include risk analysis."],
        "status": "viable",
        "coreValue": idea.get("product", {}).get("coreFeature", "") or idea.get("oneLiner", ""),
    }


def _placeholder_path(path_type: str, paper: dict) -> dict:
    return _normalize_opportunity(
        {
            "type": path_type,
            "name": f"{PATH_LABELS.get(path_type, path_type)} Fit",
            "oneLiner": "This path is possible but needs deeper validation.",
            "coreValue": paper.get("coreBreakthrough", "Potential technical edge from this paper."),
            "integrationSurface": "TBD",
            "buildScopeWeeks": 10,
            "distributionEase": "Low",
            "competition": "Medium",
            "novelty": "Medium",
            "confidence": 3,
            "firstMilestone": "Validate with 3 target users before building.",
            "risks": ["Insufficient detail from analysis output."],
            "status": "not_recommended",
        },
        path_type,
    )


def _opportunity_to_legacy_idea(opportunity: dict) -> dict:
    return {
        "startupName": opportunity.get("name", "TBD"),
        "oneLiner": opportunity.get("oneLiner", ""),
        "theHook": opportunity.get("whyNow", ""),
        "targetUser": opportunity.get("targetUser", {}),
        "coreTech": opportunity.get("coreTech", ""),
        "product": opportunity.get("product", {}),
        "business": opportunity.get("business", {}),
        "metrics": {
            "novelty": opportunity.get("novelty", "Medium"),
            "competition": opportunity.get("competition", "Medium"),
            "confidence": opportunity.get("confidence", 5),
            "mvpMonths": max(1, round(_to_int(opportunity.get("buildScopeWeeks"), 8) / 4)),
        },
    }


def normalize_analysis_data(data: dict) -> dict:
    if not isinstance(data, dict):
        return {}

    paper = data.get("paperAnalysis", {}) if isinstance(data.get("paperAnalysis"), dict) else {}
    raw_opportunities = data.get("opportunities", [])

    candidates = []
    if isinstance(raw_opportunities, list) and raw_opportunities:
        candidates = [o for o in raw_opportunities if isinstance(o, dict)]
    elif isinstance(data.get("startupIdea"), dict) and data.get("startupIdea"):
        candidates = [_legacy_to_platform_opportunity(data["startupIdea"])]
    elif isinstance(data.get("idea"), dict) and data.get("idea"):
        idea = data["idea"]
        candidates = [
            {
                "type": "feature",
                "name": idea.get("startupName", "Suggested direction"),
                "oneLiner": idea.get("oneLiner", ""),
                "coreValue": idea.get("oneLiner", ""),
                "integrationSurface": "Existing product workflow",
                "buildScopeWeeks": 4,
                "distributionEase": "Medium",
                "competition": "Medium",
                "novelty": "Medium",
                "confidence": 5,
                "firstMilestone": "Prototype this suggestion in one product flow.",
                "risks": ["Generated from suggestion-only context."],
            }
        ]

    typed = {}
    for raw in candidates:
        path_type = str(raw.get("type", "platform")).strip().lower()
        if path_type not in PATH_TYPE_ORDER:
            path_type = "platform"
        typed[path_type] = _normalize_opportunity(raw, path_type)

    for path_type in PATH_TYPE_ORDER:
        if path_type not in typed:
            typed[path_type] = _placeholder_path(path_type, paper)

    opportunities = sorted(
        typed.values(),
        key=lambda o: (-o.get("feasibilityScore", 0.0), PATH_TYPE_ORDER.index(o.get("type", "platform"))),
    )

    wedge_candidates = [o for o in opportunities if o.get("type") in {"feature", "api_plugin"}]
    recommended = max(wedge_candidates or opportunities, key=lambda o: o.get("feasibilityScore", 0.0))
    weak_all = max(o.get("feasibilityScore", 0.0) for o in opportunities) < 4.5
    recommendation_reason = (
        "All paths are weak currently; treat this paper as inspiration until better demand signals are validated."
        if weak_all
        else f"Feasibility-first choice: {PATH_LABELS.get(recommended.get('type'), recommended.get('type'))} has the best speed/distribution profile."
    )

    normalized = dict(data)
    normalized["opportunities"] = opportunities
    normalized["recommendedPathComputed"] = recommended.get("type")
    normalized["recommendationReasonComputed"] = recommendation_reason
    if not normalized.get("recommendedPath"):
        normalized["recommendedPath"] = recommended.get("type")
    if not normalized.get("recommendationReason"):
        normalized["recommendationReason"] = recommendation_reason
    normalized["startupIdea"] = _opportunity_to_legacy_idea(recommended)
    return normalized


def render_saas_boost(data: dict):
    if not data:
        return

    st.subheader("🎯 Overall R&D Strategy")
    st.info(data.get("overallStrategy", "Explore the papers below to gain a technical advantage."))

    st.subheader("📚 Research Boosts")
    papers = data.get("papers", [])
    
    if not papers:
        st.warning("No specific papers found.")
        return

    for i, p in enumerate(papers):
        with st.container():
            st.markdown(
                f"""
                <div class='idea-card'>
                    <h4 style='margin:0 0 0.5rem 0;'>{p.get('title', 'Unknown Title')}</h4>
                    <a href="https://arxiv.org/abs/{p.get('arxivId', '')}" target="_blank" style="font-size: 0.8rem;">arXiv:{p.get('arxivId', '')} • {p.get('year', '')}</a>
                    <p style='margin: 0.5rem 0;'><strong>Relevance:</strong> {p.get('relevance', '')}</p>
                    <div style="background-color: var(--background-color); padding: 10px; border-radius: 8px; margin-top: 10px;">
                        <span style="color: #8b5cf6; font-weight: 600;">💡 Boost Idea:</span> {p.get('boostIdea', '')}
                    </div>
                    <p style='font-size: 0.85rem; margin-top: 10px;'><em>{p.get('implementationHint', '')}</em></p>
                    <div class='tag-container'>
                        <span class='custom-tag'>Difficulty: {p.get('difficulty', '?')}</span>
                        <span class='custom-tag'>Impact: {p.get('impact', '?')}</span>
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            
            if st.button(f"Distill this paper →", key=f"distill_{p.get('arxivId', i)}"):
                # Switch mode and trigger distillation
                st.session_state.app_mode = "📄 Paper → Idea"
                st.session_state.current_session_id = None
                st.session_state.arxiv_input_override = p.get('arxivId', '')
                st.rerun()


def render_main_idea(data: dict, selected_model: str):
    data = normalize_analysis_data(data)
    paper = data.get("paperAnalysis", {})
    swot = data.get("swot", {})
    opportunities = data.get("opportunities", [])
    if not opportunities:
        st.warning("No viable commercialization paths were generated.")
        return

    recommended_type = data.get("recommendedPathComputed", opportunities[0].get("type"))
    recommended = next((o for o in opportunities if o.get("type") == recommended_type), opportunities[0])

    # Summary
    st.subheader("📘 Paper Overview")
    st.success(_build_intro_overview(paper))

    st.subheader("📝 Paper Essence")
    st.info(paper.get("summary", "Summary unavailable."))

    colA, colB = st.columns(2)
    with colA:
        st.markdown("**Research Problem**")
        st.write(paper.get("researchProblem", "Not explicitly stated."))
        st.markdown("**Method (Plain English)**")
        st.write(paper.get("methodInPlainEnglish", "Not explicitly stated."))
    with colB:
        st.markdown("**What Is New vs Prior Work**")
        st.write(paper.get("whatIsNewVsPrior", "Not explicitly stated."))
        st.markdown("**Practical Takeaway**")
        st.write(paper.get("practicalTakeaway", "Not explicitly stated."))

    st.markdown("**Evidence & Results**")
    evidence_rows = paper.get("evidenceAndResults", [])
    if evidence_rows:
        for row in evidence_rows[:4]:
            st.write(f"- {row}")
    else:
        st.write("- Not explicitly stated.")

    st.subheader("💡 Core Ideas")
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Core Breakthrough**")
        st.write(paper.get("coreBreakthrough", "Not explicitly stated."))
        st.markdown("**Key Innovations**")
        for inn in paper.get("keyInnovations", []):
            st.markdown(f"- {inn}")
    with col2:
        st.markdown("**Applications**")
        for app in paper.get("applications", []):
            st.markdown(f"- {app}")
        st.markdown("**Assumptions**")
        assumptions = paper.get("assumptions", [])
        if assumptions:
            for assumption in assumptions[:3]:
                st.markdown(f"- {assumption}")
        else:
            st.markdown("- Not explicitly stated.")

    colV1, colV2 = st.columns(2)
    with colV1:
        st.markdown("**Limitations**")
        limitations = paper.get("limitations", [])
        if limitations:
            for lim in limitations[:4]:
                st.markdown(f"- {lim}")
        else:
            st.markdown("- Not explicitly stated.")
    with colV2:
        st.markdown("**Commercial Viability**")
        score = paper.get("startupViabilityScore", "?")
        st.metric("Viability Score", f"{score}/100")
        st.caption(paper.get("viabilityReasoning", ""))
        fidelity = paper.get("fidelityNotes", {}) if isinstance(paper.get("fidelityNotes"), dict) else {}
        if fidelity:
            st.markdown(f"**Fidelity Confidence:** {fidelity.get('confidence', 'Unknown')}")
            for note in fidelity.get("missingInfo", [])[:2]:
                st.caption(f"Missing info: {note}")

    # SWOT
    st.subheader("⚖️ SWOT Analysis (Evidence-Linked)")
    sc1, sc2 = st.columns(2)
    with sc1:
        st.markdown("**Strengths**")
        strengths = swot.get("strengths", [])
        if strengths:
            for s in strengths[:4]:
                st.write(f"✓ {s}")
        else:
            st.write("✓ Not explicitly stated.")
        st.markdown("**Opportunities**")
        opportunities_swot = swot.get("opportunities", [])
        if opportunities_swot:
            for o in opportunities_swot[:4]:
                st.write(f"＋ {o}")
        else:
            st.write("＋ Not explicitly stated.")
    with sc2:
        st.markdown("**Weaknesses**")
        weaknesses = swot.get("weaknesses", [])
        if weaknesses:
            for w in weaknesses[:4]:
                st.write(f"✗ {w}")
        else:
            st.write("✗ Not explicitly stated.")
        st.markdown("**Threats**")
        threats = swot.get("threats", [])
        if threats:
            for t in threats[:4]:
                st.write(f"⚠ {t}")
        else:
            st.write("⚠ Not explicitly stated.")

    st.divider()

    st.subheader("🚀 Commercialization Paths")
    if max(o.get("feasibilityScore", 0.0) for o in opportunities) < 4.5:
        st.warning("This paper is currently low-feasibility across all paths. Consider it for scoped experiments only.")
    else:
        st.success("Default recommendation: build the smallest viable wedge first (feature/API path).")

    st.markdown(
        f"<div class='saas-header'>{recommended.get('name', 'Recommended Path')}</div>",
        unsafe_allow_html=True,
    )
    st.markdown(f"**{recommended.get('oneLiner', '')}**")
    st.caption(data.get("recommendationReasonComputed") or data.get("recommendationReason", ""))

    comparison_rows = []
    for opp in opportunities:
        comparison_rows.append(
            {
                "Path": PATH_LABELS.get(opp.get("type"), opp.get("type")),
                "Feasibility": f"{opp.get('feasibilityScore', 0.0)}/10",
                "Build (weeks)": opp.get("buildScopeWeeks", "?"),
                "Confidence": f"{opp.get('confidence', '?')}/10",
                "Distribution": opp.get("distributionEase", "Medium"),
                "Competition": opp.get("competition", "Medium"),
            }
        )
    st.table(comparison_rows)

    path_ids = [o.get("type", "platform") for o in opportunities]
    recommended_index = path_ids.index(recommended.get("type")) if recommended.get("type") in path_ids else 0
    selected_path_type = st.radio(
        "Inspect path",
        options=path_ids,
        horizontal=True,
        index=recommended_index,
        format_func=lambda path: PATH_LABELS.get(path, path),
        key=f"path_select_{st.session_state.current_session_id or 'current'}",
    )
    selected = next((o for o in opportunities if o.get("type") == selected_path_type), opportunities[0])
    target = selected.get("targetUser", {})

    tab1, tab2, tab3, tab4, tab_comp = st.tabs(
        ["🎯 User", "💻 Product", "💰 Business", "🔧 Tech", "🕵️ Competitors"]
    )

    with tab1:
        st.subheader("Who Pays?")
        st.markdown(f"**{target.get('persona', 'TBD')}**")
        st.error(f"Pain: {target.get('painPoint', 'N/A')}")
        st.write(f"Alternatives: {target.get('currentAlternatives', 'N/A')}")

    with tab2:
        st.subheader("Core Feature")
        st.info(selected.get("product", {}).get("coreFeature", ""))
        st.markdown(
            f"**Differentiation:** {selected.get('product', {}).get('differentiation', '')}"
        )
        st.markdown(f"**Core Value:** {selected.get('coreValue', '')}")
        st.markdown(f"**Integration Surface:** {selected.get('integrationSurface', '')}")
        st.markdown(f"**First Milestone:** {selected.get('firstMilestone', '')}")

    with tab3:
        st.subheader("Business Model")
        st.markdown(f"**Pricing:** {selected.get('business', {}).get('pricingModel', '')}")
        st.markdown(f"**GTM:** {selected.get('business', {}).get('gtm', '')}")
        st.markdown(f"**Why now:** {selected.get('whyNow', '')}")
        st.markdown("**Risks:**")
        for risk in selected.get("risks", []):
            st.write(f"- {risk}")

    with tab4:
        st.subheader("Core Technology")
        st.info(selected.get("coreTech", ""))
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Novelty", selected.get("novelty", "?"))
        with col2:
            st.metric("Competition", selected.get("competition", "?"))
        with col3:
            st.metric("Confidence", f"{selected.get('confidence', '?')}/10")
        with col4:
            st.metric("Build Scope", f"{selected.get('buildScopeWeeks', '?')} weeks")

    with tab_comp:
        st.subheader("Live Market Intelligence")

        by_path = data.get("competitorIntelligenceByPath", {})
        competitor_data = by_path.get(selected_path_type) or data.get("competitorIntelligence")

        if competitor_data:
            st.info(f"**Market Verdict:** {competitor_data.get('marketVerdict', '')}")

            comps = competitor_data.get("competitors", [])
            if not comps:
                st.success("No direct strong competitors found! Blue ocean territory.")
            else:
                for c in comps:
                    with st.container():
                        st.markdown(
                            f"""
                        <div class='idea-card'>
                            <h4 style='margin:0 0 0.5rem 0;'>{c.get("name", "Unknown")}</h4>
                            <a href="{c.get("url", "#")}" target="_blank" style="font-size: 0.8rem;">{c.get("url", "No Website")}</a>
                            <p style='margin: 0.5rem 0;'>{c.get("description", "")}</p>
                            <p style='font-size: 0.8rem; color: var(--text-color); margin-bottom: 0.5rem'><strong>Pricing:</strong> {c.get("pricing", "Unknown")}</p>
                            <div style="border-left: 3px solid #3b82f6; padding-left: 10px; margin-top: 10px;">
                                <small><strong>Why we win:</strong> {c.get("differentiation", "")}</small>
                            </div>
                        </div>
                        """,
                            unsafe_allow_html=True,
                        )
        else:
            st.write(
                f"Run a live web search for this path: {PATH_LABELS.get(selected_path_type, selected_path_type)}."
            )

            # Use columns to center/style the button
            button_col1, button_col2, button_col3 = st.columns([1, 2, 1])
            with button_col2:
                if st.button(
                    "🔍 Run Deep Competitor Research",
                    use_container_width=True,
                    key=f"comp_{st.session_state.current_session_id}_{selected_path_type}",
                ):
                    with st.spinner(
                        "Searching the web with Parallel.ai and analyzing the market..."
                    ):
                        try:
                            idea_context = (
                                f"Path Type: {selected_path_type}\n"
                                f"Idea Name: {selected.get('name')}\n"
                                f"One-liner: {selected.get('oneLiner')}\n"
                                f"Target User: {target.get('persona')}\n"
                                f"Core Feature: {selected.get('product', {}).get('coreFeature')}\n"
                                f"Integration Surface: {selected.get('integrationSurface')}\n"
                                f"Core Value: {selected.get('coreValue')}"
                            )
                            comp_raw, comp_json = run_competitor_agent(idea_context, selected_model)

                            if comp_json:
                                # Save back to the session state under the current ID
                                current_id = st.session_state.current_session_id
                                session_data = st.session_state.sessions[current_id]["data"]
                                if "competitorIntelligenceByPath" not in session_data:
                                    session_data["competitorIntelligenceByPath"] = {}
                                session_data["competitorIntelligenceByPath"][selected_path_type] = comp_json
                                session_data["competitorIntelligence"] = comp_json
                                save_sessions(st.session_state.sessions)
                                st.rerun()
                            else:
                                st.error(
                                    "Failed to parse agent findings. Please try again."
                                )
                                st.code(comp_raw)

                        except Exception as e:
                            st.error(f"Search failed: {e}")



def render_suggestions(suggestions: list, parent_session_id: str):
    st.divider()
    st.subheader("💡 Other Ideas to Explore")

    cols = st.columns(3)
    for i, suggestion in enumerate(suggestions):
        with cols[i]:
            with st.container():
                st.markdown(
                    f"""
                <div class='idea-card'>
                    <strong>{suggestion.get("startupName", "TBD")}</strong>
                    <p style='font-size:0.8rem; margin:0.5rem 0;'>{suggestion.get("oneLiner", "")}</p>
                    <span class='custom-tag'>{suggestion.get("angle", "")}</span>
                </div>
                """,
                    unsafe_allow_html=True,
                )

                if st.button(f"Explore →", key=f"suggest_{parent_session_id}_{i}"):
                    new_session_id = f"{parent_session_id}_alt{i + 1}"
                    st.session_state.sessions[new_session_id] = {
                        "timestamp": datetime.now().isoformat(),
                        "productName": suggestion.get("startupName", "TBD"),
                        "data": {"idea": suggestion},
                        "meta": st.session_state.sessions.get(parent_session_id, {}).get(
                            "meta", {}
                        ),
                        "is_suggestion": True,
                        "parent_id": parent_session_id,
                        "mode": "arxiv"
                    }
                    save_sessions(st.session_state.sessions)
                    st.session_state.current_session_id = new_session_id
                    st.rerun()


# Sidebar
with st.sidebar:
    st.markdown(
        "<h1 style='font-size: 1.5rem;'>🛠️ Research Forge</h1>", unsafe_allow_html=True
    )
    st.caption("v2.0 | Deep Tech Distillery")
    
    # Mode toggle
    modes = ["📄 Paper → Idea", "💼 SaaS → Papers"]
    st.session_state.app_mode = st.radio(
        "Mode",
        modes,
        index=modes.index(st.session_state.app_mode) if st.session_state.app_mode in modes else 0,
        label_visibility="collapsed"
    )

    st.divider()

    # Model Selection
    show_all_models = st.toggle("Show non-AWS models", value=False)
    model_options = [
        name for name in AVAILABLE_MODELS.keys()
        if show_all_models or AVAILABLE_MODELS[name].startswith("amazon:")
    ]
    if not model_options:
        model_options = list(AVAILABLE_MODELS.keys())

    default_index = 0
    if DEFAULT_MODEL_KEY in model_options:
        default_index = model_options.index(DEFAULT_MODEL_KEY)

    selected_model_name = st.selectbox(
        "Model",
        options=model_options,
        index=default_index,
        help="AWS Nova models are recommended for reliability in this project."
    )
    selected_model = AVAILABLE_MODELS[selected_model_name]
    
    st.divider()
    
    # Input Area
    arxiv_input = ""
    saas_input = ""
    analyze_btn = False
    
    if st.session_state.app_mode == "📄 Paper → Idea":
        # Handle pre-filled arXiv ID from Mode 2
        default_val = st.session_state.get("arxiv_input_override", "")
        arxiv_input = st.text_input("arXiv ID or URL", value=default_val, placeholder="2409.13449")
        analyze_btn = st.button(
            "Distill Blueprint", type="primary", use_container_width=True
        )
        # Clear override if it was used
        if default_val and st.session_state.arxiv_input_override:
            st.session_state.arxiv_input_override = ""

    elif st.session_state.app_mode == "💼 SaaS → Papers":
        saas_input = st.text_area("Describe your SaaS product...", placeholder="A B2B platform that automates API testing using AI...", height=120)
        analyze_btn = st.button(
            "Find Research Boosts", type="primary", use_container_width=True
        )

    st.divider()
    st.subheader("📚 History")
    sessions = st.session_state.sessions

    if sessions:
        for session_id, data in sorted(
            sessions.items(), key=lambda x: x[1].get("timestamp", ""), reverse=True
        ):
            col1, col2 = st.columns([4, 1])
            with col1:
                label = data.get("productName", session_id)
                mode = data.get("mode", "arxiv")
                icon = "💼 " if mode == "saas" else "📄 "
                
                if data.get("is_suggestion"):
                    label = f"↳ {label}"
                else: 
                    label = f"{icon}{label}"
                    
                if st.button(label[:25], key=f"load_{session_id}"):
                    st.session_state.current_session_id = session_id
                    # Optional: Switch mode implicitly when loading history
                    st.session_state.app_mode = "💼 SaaS → Papers" if mode == "saas" else "📄 Paper → Idea"
                    st.rerun()
            with col2:
                if st.button("🗑️", key=f"del_{session_id}"):
                    del st.session_state.sessions[session_id]
                    save_sessions(st.session_state.sessions)
                    if st.session_state.current_session_id == session_id:
                        st.session_state.current_session_id = None
                    st.rerun()
    else:
        st.caption("No analyses yet")

    if st.button("Clear All", use_container_width=True):
        st.session_state.sessions = {}
        st.session_state.current_session_id = None
        save_sessions({})
        st.rerun()


# Main - View saved session
if (
    st.session_state.current_session_id
    and st.session_state.current_session_id in st.session_state.sessions
):
    # Backward compatibility for legacy keys
    if not st.session_state.current_arxiv_id and st.session_state.current_session_id and "saas_" not in st.session_state.current_session_id:
        st.session_state.current_arxiv_id = st.session_state.current_session_id
        
    saved_data = st.session_state.sessions[st.session_state.current_session_id]

    st.info(f"📂 {st.session_state.current_session_id}")

    if st.session_state.current_session_id.endswith(("_alt1", "_alt2", "_alt3")):
        parent = saved_data.get("parent_id", "")
        if parent and st.button("← Back to main idea"):
            st.session_state.current_session_id = parent
            st.rerun()

    if st.button("← New Search"):
        st.session_state.current_session_id = None
        st.rerun()

    data = saved_data.get("data", {})
    if data:
        mode = saved_data.get("mode", "arxiv")
        if mode == "saas":
            render_saas_boost(data)
        else:
            render_main_idea(data, selected_model)

            if not saved_data.get("is_suggestion"):
                suggestions = data.get("suggestions", [])
                if suggestions:
                    render_suggestions(suggestions, st.session_state.current_session_id)

# Main - New analysis
elif analyze_btn and st.session_state.app_mode == "📄 Paper → Idea" and arxiv_input:
    session_id = extract_arxiv_id(arxiv_input)

    if not session_id:
        st.error("Invalid arXiv ID. Try: 2409.13449")
    else:
        with st.spinner("Retrieving paper..."):
            meta = fetch_arxiv_meta(session_id)

        if not meta:
            st.error("Could not find paper on arXiv.")
        else:
            with st.sidebar:
                st.caption(f"**{meta['title'][:50]}...**")
                with st.expander("Abstract"):
                    st.write(meta["abstract"][:500])

            prog = st.progress(0)
            status = st.status("Analyzing...", expanded=True)

            try:
                # 1. Download PDF for Multimodal Analysis
                prog.progress(20)
                status.update(label="Downloading full paper for Multimodal analysis...", state="running")
                pdf_path = download_arxiv_pdf(session_id)

                # 2. Run Analysis Agent (Nova Pro + PDF)
                prog.progress(40)
                status.update(label="Nova Pro is reading the full paper charts and data...", state="running")
                
                full_raw, data = run_analysis_agent(build_prompt(meta), selected_model, pdf_path=pdf_path)

                if not data:
                    st.error("Failed to generate idea.")
                    st.code(full_raw)
                else:
                    data = normalize_analysis_data(data)
                    recommended_idea = data.get("startupIdea", {})
                    st.session_state.sessions[session_id] = {
                        "timestamp": datetime.now().isoformat(),
                        "productName": recommended_idea.get("startupName", "TBD"),
                        "data": data,
                        "meta": meta,
                        "mode": "arxiv"
                    }

                    # 3. Generating alternatives
                    prog.progress(80)
                    status.update(label="Generating alternative angles...", state="running")

                    try:
                        suggestion_raw, sugg_data = run_suggestion_agent(
                            recommended_idea.get('oneLiner', ''),
                            meta.get('abstract', ''),
                            selected_model
                        )
                        if sugg_data and "suggestions" in sugg_data:
                            data["suggestions"] = sugg_data["suggestions"]
                            st.session_state.sessions[session_id]["data"] = data
                    except Exception as e:
                        st.caption(f"Could not generate suggestions: {e}")

                    save_sessions(st.session_state.sessions)
                    st.session_state.current_session_id = session_id

                    prog.progress(100)
                    status.update(label="Done", state="complete", expanded=False)
                    st.toast(f"Generated: {recommended_idea.get('startupName', 'TBD')}", icon="💡")

                    render_main_idea(data, selected_model)
                    if data.get("suggestions"):
                        render_suggestions(data["suggestions"], session_id)

            except Exception as e:
                st.error(f"Error: {str(e)}")

elif analyze_btn and st.session_state.app_mode == "💼 SaaS → Papers" and saas_input:
    session_id = f"saas_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    with st.spinner("Analyzing SaaS product..."):
        prog = st.progress(0)
        status = st.status("Scouting arXiv for relevant technical boosts...", expanded=True)

        try:
            # 1. Run SaaS Boost Agent
            prog.progress(20)
            status.update(label="Searching live web for research...", state="running")

            raw, data = run_saas_boost_agent(saas_input, selected_model)
            
            prog.progress(90)

            if not data:
                st.error("Failed to parse research suggestions.")
                st.code(raw)
            else:
                st.session_state.sessions[session_id] = {
                    "timestamp": datetime.now().isoformat(),
                    "productName": saas_input[:40] + "..." if len(saas_input) > 40 else saas_input,
                    "data": data,
                    "mode": "saas",
                    "meta": {"title": f"SaaS: {saas_input[:20]}"}
                }
                
                save_sessions(st.session_state.sessions)
                st.session_state.current_session_id = session_id
                
                prog.progress(100)
                status.update(label="Done", state="complete", expanded=False)
                st.toast("Research boosts generated!", icon="💼")
                
                render_saas_boost(data)

        except Exception as e:
            st.error(f"Error during research scout: {str(e)}")


else:
    st.markdown(
        "<div class='saas-header'>Distill Intelligence.</div>", unsafe_allow_html=True
    )
    if st.session_state.app_mode == "📄 Paper → Idea":
        st.write("Enter an arXiv paper to find the best startup idea.")
        st.divider()
        c1, c2, c3 = st.columns(3)
        c1.markdown("### 01. Ingest\nPaper from arXiv")
        c2.markdown("### 02. Analyze\nFind the best idea")
        c3.markdown("### 03. Explore\nTry alternative angles")
    else:
        st.write("Enter a SaaS idea to find the most relevant academic research to give it a technical edge.")
        st.divider()
        c1, c2, c3 = st.columns(3)
        c1.markdown("### 01. Describe\nYour SaaS idea")
        c2.markdown("### 02. Scout\nReal arXiv papers")
        c3.markdown("### 03. Boost\nImplement the tech")
