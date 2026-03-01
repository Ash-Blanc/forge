"""Utility functions for FORGE Streamlit prototype."""

import json
import os
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime

import streamlit as st

SESSIONS_FILE = os.path.join(os.path.dirname(__file__), "sessions.json")


# ── Session persistence ──────────────────────────────────────────────────────


def load_sessions() -> dict:
    """Load saved sessions from JSON file."""
    if os.path.exists(SESSIONS_FILE):
        try:
            with open(SESSIONS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_sessions(sessions: dict) -> None:
    """Persist sessions to JSON file."""
    with open(SESSIONS_FILE, "w") as f:
        json.dump(sessions, f, indent=2)


# ── arXiv helpers ─────────────────────────────────────────────────────────────


def extract_arxiv_id(input_str: str) -> str | None:
    """Extract an arXiv ID from a raw string (plain ID, abs URL, or PDF URL)."""
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


def fetch_arxiv_meta(arxiv_id: str, max_retries: int = 3) -> dict:
    """Fetch paper metadata from arXiv API with retry logic.

    Returns dict with title, authors, published, abstract or empty dict on failure.
    """
    url = f"http://export.arxiv.org/api/query?id_list={arxiv_id}"

    for attempt in range(max_retries):
        try:
            response = urllib.request.urlopen(url, timeout=30)
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            ns = {"default": "http://www.w3.org/2005/Atom"}
            entry = root.find("default:entry", ns)
            if not entry:
                st.error(
                    f"No entry found for arXiv ID `{arxiv_id}`. Check the ID is correct."
                )
                return {}

            # arXiv returns an entry even for invalid IDs but with an error id
            entry_id = entry.find("default:id", ns)
            if entry_id is not None and "api/errors" in (entry_id.text or ""):
                st.error(
                    f"arXiv ID `{arxiv_id}` not found. Please double-check the ID."
                )
                return {}

            title_el = entry.find("default:title", ns)
            abstract_el = entry.find("default:summary", ns)

            if title_el is None or title_el.text is None:
                st.error("Paper found but missing title. It may be unavailable.")
                return {}

            return {
                "title": title_el.text.strip().replace("\n", " "),
                "authors": [
                    a.find("default:name", ns).text
                    for a in entry.findall("default:author", ns)
                ],
                "published": entry.find("default:published", ns).text,
                "abstract": (
                    abstract_el.text.strip().replace("\n", " ")
                    if abstract_el is not None and abstract_el.text
                    else ""
                ),
            }
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 2 ** (attempt + 1)
                st.warning(f"Rate limited by arXiv. Retrying in {wait}s...")
                time.sleep(wait)
                continue
            st.error(f"arXiv HTTP error ({e.code}): {e.reason}")
            return {}
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
            st.error(f"Failed to fetch from arXiv after {max_retries} attempts: {e}")
            return {}

    return {}


def download_arxiv_pdf(arxiv_id: str) -> str | None:
    """Download the PDF for a given arXiv ID and return the local path."""
    pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
    tmp_dir = os.path.join(os.path.dirname(__file__), "tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    local_path = os.path.join(tmp_dir, f"{arxiv_id}.pdf")

    if os.path.exists(local_path):
        return local_path

    try:
        req = urllib.request.Request(pdf_url, headers={"User-Agent": "FORGE-Agent/1.0"})
        with urllib.request.urlopen(req, timeout=60) as response:
            with open(local_path, "wb") as f:
                f.write(response.read())
        return local_path
    except Exception as e:
        st.error(f"Failed to download PDF: {e}")
        return None


# ── JSON parsing ──────────────────────────────────────────────────────────────


def parse_agent_json(raw_text: str) -> dict | None:
    """Parse JSON from agent response with multiple fallback strategies.

    1. Strip markdown code fences
    2. Regex-extract the outermost JSON object
    3. Attempt to load it
    Returns parsed dict or None on failure.
    """
    # Strategy 1: strip markdown fences
    clean = re.sub(r"```json\s*", "", raw_text, flags=re.IGNORECASE)
    clean = re.sub(r"```\s*", "", clean).strip()

    # Strategy 2: regex extract outermost braces
    match = re.search(r"\{[\s\S]*\}", clean)
    if not match:
        return None

    json_str = match.group(0)

    # Strategy 3: try to parse
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        pass

    # Strategy 4: attempt basic repair — trailing commas before closing braces
    repaired = re.sub(r",\s*([}\]])", r"\1", json_str)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError:
        return None


# ── Prompt builder ────────────────────────────────────────────────────────────


def build_prompt(meta: dict) -> str:
    """Build the user prompt from paper metadata."""
    return f"""Analyze this paper faithfully and produce execution-ready commercialization paths.

Title: {meta.get("title", "")}
Authors: {", ".join(meta.get("authors", []))}
Abstract: {meta.get("abstract", "")[:2000]}

Requirements:
- Start with a relatable intro overview (2-3 sentences, plain language).
- Capture true paper essence (problem, method, novelty, evidence, limits).
- Avoid generic statements and hype.
- If evidence is missing, write "Not explicitly stated".
- Generate exactly 3 paths: platform, feature, api_plugin.
- Recommend one path using feasibility-first logic and explain why.

Return ONLY valid JSON."""


def build_saas_prompt(description: str) -> str:
    """Build the prompt for SaaS → Papers mode."""
    return f"""Find the most relevant recent arXiv research papers for this SaaS product:

{description.strip()}

Search arXiv and the web to find REAL papers with valid arXiv IDs. Return JSON only."""


# ── Markdown export ───────────────────────────────────────────────────────────


def generate_markdown_report(data: dict, meta: dict, mode: str = "arxiv") -> str:
    """Generate a concise, decision-focused Markdown report."""
    lines = []
    
    if mode == "saas":
        lines.append(f"# FORGE SaaS Research Boost\n")
        lines.append(f"**Target SaaS:** {meta.get('title', '').replace('SaaS: ', '')}  \n")
        lines.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
        
        lines.append("---\n## Strategy\n")
        lines.append(f"{data.get('overallStrategy', '')}\n")
        
        lines.append("---\n## Top 3 Papers\n")
        for p in data.get("papers", [])[:3]:
            lines.append(f"### {p.get('title', 'Unknown')}")
            lines.append(f"- **arXiv ID:** [{p.get('arxivId', '')}](https://arxiv.org/abs/{p.get('arxivId', '')}) ({p.get('year', '')})")
            lines.append(f"- **Boost Idea:** {p.get('boostIdea', '')}")
            lines.append(f"- **Implementation Hint:** {p.get('implementationHint', '')}\n")
            
        return "\n".join(lines)


    # Regular arXiv mode (concise)
    paper = data.get("paperAnalysis", {})
    idea = data.get("startupIdea", {})
    opportunities = data.get("opportunities", [])
    competitors = data.get("competitorIntelligence", {})

    lines.append(f"# FORGE Analysis: {meta.get('title', 'Unknown Paper')}\n")
    lines.append(
        f"**arXiv:** {meta.get('title', '')}  \n"
        f"**Authors:** {', '.join(meta.get('authors', []))}  \n"
        f"**Published:** {meta.get('published', '')}  \n"
        f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
    )

    lines.append("---\n## Overview\n")
    intro_overview = data.get("paperAnalysis", {}).get("introOverview", "")
    if intro_overview:
        lines.append(f"{intro_overview}\n")

    lines.append("## Summary\n")
    if paper.get("summary"):
        lines.append(f"{paper['summary']}\n")
    if paper.get("coreBreakthrough"):
        lines.append(f"- **Core Breakthrough:** {paper['coreBreakthrough']}")
    lines.append("")

    if opportunities:
        lines.append("---\n## Recommendation\n")
        recommended_path = data.get("recommendedPathComputed") or data.get("recommendedPath", "")
        recommendation_reason = data.get("recommendationReasonComputed") or data.get("recommendationReason", "")
        if recommended_path:
            lines.append(f"**Recommended Path:** `{recommended_path}`")
        if recommendation_reason:
            lines.append(f"**Reason:** {recommendation_reason}")
        lines.append("")

        lines.append("## Path Snapshot")
        lines.append("| Path | Build (weeks) | Confidence | Feasibility |")
        lines.append("|------|---------------|------------|-------------|")
        if recommended_path:
            sorted_ops = sorted(
                opportunities,
                key=lambda o: (
                    0 if o.get("type") == recommended_path else 1,
                    -(float(o.get("feasibilityScore", 0)) if str(o.get("feasibilityScore", "")).replace(".", "", 1).isdigit() else 0),
                ),
            )
        else:
            sorted_ops = opportunities
        for opp in sorted_ops[:3]:
            lines.append(
                f"| {opp.get('type', '')} | {opp.get('buildScopeWeeks', '?')} | "
                f"{opp.get('confidence', '?')}/10 | {opp.get('feasibilityScore', '?')}/10 |"
            )
        lines.append("")

        focus = sorted_ops[0]
        lines.append("## Immediate Next Steps")
        lines.append(f"1. Build first milestone: {focus.get('firstMilestone', 'Ship one usable flow.')}")
        lines.append(f"2. Validate with target user: {focus.get('targetUser', {}).get('persona', 'TBD persona')}")
        lines.append(f"3. Prove differentiator: {focus.get('product', {}).get('differentiation', focus.get('coreValue', 'TBD value'))}")
        lines.append("")
        lines.append("## Key Risks")
        for r in focus.get("risks", [])[:3]:
            lines.append(f"- {r}")
        lines.append("")
    elif idea:
        lines.append("---\n## Recommendation\n")
        lines.append(f"**Focus:** {idea.get('startupName', 'TBD')}")
        lines.append(f"- {idea.get('oneLiner', '')}")
        lines.append(f"- Core Feature: {idea.get('product', {}).get('coreFeature', '')}")
        lines.append(f"- GTM: {idea.get('business', {}).get('gtm', '')}\n")

    if competitors:
        lines.append("---\n## Market Signal\n")
        lines.append(f"**Market Verdict:** {competitors.get('marketVerdict', '')}\n")
        for c in competitors.get("competitors", [])[:2]:
            lines.append(f"- **{c.get('name', '?')}**: {c.get('description', '')}")

    return "\n".join(lines)
