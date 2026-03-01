"""Agent definitions and prompts for FORGE."""

import os

from agno.agent import Agent
from agno.media import File
from agno.tools.parallel import ParallelTools
from agno.tools.arxiv import ArxivTools

from utils import parse_agent_json
from tools import SemanticScholarTools

# ── Available Models ──────────────────────────────────────────────────────────

AVAILABLE_MODELS = {
    "AWS Bedrock — Nova Pro": "amazon:amazon.nova-pro-v1:0",
    "AWS Bedrock — Nova 2 Lite": "amazon:amazon.nova-lite-v1:0",
    "OpenAI — GPT-4o": "openai:gpt-4o",
    "OpenAI — GPT-4o Mini": "openai:gpt-4o-mini",
    "Anthropic — Claude 3.5 Sonnet": "anthropic:claude-3-5-sonnet-latest",
    "Cerebras — Llama 3.1 70B": "cerebras:llama3.1-70b",
    "Cerebras — Llama 3.1 8B (fast)": "cerebras:llama3.1-8b",
}

DEFAULT_MODEL_KEY = "AWS Bedrock — Nova Pro"

# ── Prompts ───────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are FORGE — a paper-faithful technical analyst and commercialization strategist.

Your first job is to capture the ORIGINAL paper essence accurately.
Your second job is to propose commercialization paths grounded in that essence.

Hard constraints:
1. No generic summaries. Be specific about what was built, tested, and observed.
2. Ground every claim in paper content. If evidence is missing, say "Not explicitly stated".
3. Distinguish facts from inference. Facts must come from the paper; inferences must be clearly framed.
4. Do not invent benchmarks, datasets, or results.
5. Prefer precise technical language over hype.
6. Keep writing concise, concrete, and decision-oriented.
7. Structure the response paper-first: paper understanding sections before commercialization paths.

OUTPUT JSON ONLY:

{
  "paperAnalysis": {
    "introOverview": "2-3 sentence plain-language intro: what the paper does and why it matters.",
    "summary": "3-5 sentence technical essence of the paper, faithful and concrete.",
    "researchProblem": "What concrete problem the paper is solving.",
    "methodInPlainEnglish": "How the method works, clearly and concretely.",
    "whatIsNewVsPrior": "Specific novelty vs prior approaches.",
    "evidenceAndResults": [
      "Claim + evidence from paper (dataset/experiment/result if available)."
    ],
    "practicalTakeaway": "Practical implication: what this enables and for whom.",
    "coreBreakthrough": "The ONE specific technical thing this enables (be precise)",
    "keyInnovations": ["Specific technical insight 1", "Specific technical insight 2"],
    "applications": [
      "Niche/unusual application 1 - be specific about WHO would use it and WHY",
      "Niche/unusual application 2"
    ],
    "limitations": ["Real limitation 1", "Real limitation 2"],
    "assumptions": ["Key assumption 1", "Key assumption 2"],
    "fidelityNotes": {
      "confidence": "High|Medium|Low",
      "missingInfo": ["Important missing detail 1"],
      "inferenceWarnings": ["Where inference was necessary"]
    }
  },
  "swot": {
    "strengths": ["Technical strength linked to paper evidence."],
    "weaknesses": ["Technical weakness linked to paper limits/assumptions."],
    "opportunities": ["Commercial opportunity clearly implied by the paper's capabilities."],
    "threats": ["Execution/market threat grounded in constraints or incumbents."]
  },
  "opportunities": [
    {
      "type": "platform",
      "name": "Opportunity name",
      "oneLiner": "What it does for who",
      "targetUser": {
        "persona": "Specific role",
        "painPoint": "Exact pain",
        "currentAlternatives": "What they use now"
      },
      "coreValue": "Main value delivered",
      "integrationSurface": "Where this fits: workflow/system/API, or 'Standalone product'",
      "coreTech": "Paper capability used",
      "product": {
        "coreFeature": "Primary feature for this path",
        "differentiation": "Why this path wins"
      },
      "business": {
        "pricingModel": "Specific pricing",
        "gtm": "First customer path"
      },
      "whyNow": "Timing reason for this path",
      "buildScopeWeeks": 8,
      "distributionEase": "High|Medium|Low",
      "competition": "Low|Medium|High",
      "novelty": "High|Medium|Low",
      "confidence": 5,
      "firstMilestone": "Clear first shippable milestone",
      "risks": ["Risk 1", "Risk 2"],
      "status": "recommended|viable|not_recommended",
      "evidenceLink": "One sentence linking this path to the paper evidence."
    },
    {
      "type": "feature",
      "name": "Niche feature opportunity",
      "oneLiner": "Feature wedge for existing platform",
      "targetUser": { "persona": "...", "painPoint": "...", "currentAlternatives": "..." },
      "coreValue": "Value",
      "integrationSurface": "Existing platform/workflow this fits",
      "coreTech": "Paper capability used",
      "product": { "coreFeature": "...", "differentiation": "..." },
      "business": { "pricingModel": "...", "gtm": "..." },
      "whyNow": "Timing",
      "buildScopeWeeks": 4,
      "distributionEase": "High|Medium|Low",
      "competition": "Low|Medium|High",
      "novelty": "High|Medium|Low",
      "confidence": 7,
      "firstMilestone": "Milestone",
      "risks": ["Risk 1"],
      "status": "viable",
      "evidenceLink": "One sentence linking this path to the paper evidence."
    },
    {
      "type": "api_plugin",
      "name": "Standalone API / plugin opportunity",
      "oneLiner": "Composable API/plugin value prop",
      "targetUser": { "persona": "...", "painPoint": "...", "currentAlternatives": "..." },
      "coreValue": "Value",
      "integrationSurface": "SDK/API/plugin target ecosystem",
      "coreTech": "Paper capability used",
      "product": { "coreFeature": "...", "differentiation": "..." },
      "business": { "pricingModel": "...", "gtm": "..." },
      "whyNow": "Timing",
      "buildScopeWeeks": 3,
      "distributionEase": "High|Medium|Low",
      "competition": "Low|Medium|High",
      "novelty": "High|Medium|Low",
      "confidence": 8,
      "firstMilestone": "Milestone",
      "risks": ["Risk 1"],
      "status": "viable",
      "evidenceLink": "One sentence linking this path to the paper evidence."
    }
  ],
  "recommendedPath": "feature",
  "recommendationReason": "1-2 sentences with feasibility-first reasoning and explicit tie to evidence."
}"""

COMPETITOR_RESEARCH_PROMPT = """You are a market research and competitive intelligence analyst.
Given a proposed product path, find the closest real competitors or substitutes.

Instructions:
1. Find products solving the same pain point or core feature.
2. IMPORTANT: For tools like `parallel_search`, `search_queries` must be a JSON array of strings, not a stringified list.
3. Return the top 2-3 most relevant competitors.
4. If no direct competitors exist, return closest substitutes used today.
5. Keep findings specific, current, and non-generic.

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
  "marketVerdict": "2-sentence verdict on market density and whitespace."
}"""

SUGGESTION_PROMPT = """Given the recommended opportunity from a research paper, generate 3 alternative directions.

Requirements:
- Each direction must stay grounded in the same paper capability.
- Each must be materially different (user segment, distribution, integration surface, or pricing model).
- Keep each item concise and concrete.

OUTPUT JSON ONLY - array of 3:

{
  "suggestions": [
    {
      "startupName": "Name",
      "oneLiner": "What it does and for whom",
      "angle": "How this differs from the main recommendation"
    }
  ]
}"""

SAAS_TO_PAPERS_PROMPT = """You are FORGE's Research Scout — an expert at finding cutting-edge academic research that can give a SaaS product a genuine technical edge.

The user will describe their SaaS product or idea. Your job is to:
1. Identify the core technical problems their product must solve
2. Search the web for REAL, PUBLISHED arXiv papers directly applicable to those problems
3. For each paper, explain CONCRETELY how the technique can be used to build a specific feature or improvement

Rules:
- Only return papers that actually exist on arXiv (real arXiv IDs)
- Prioritize papers from the last 3 years (2023–2025)
- Focus on ACTIONABLE techniques, not just vaguely related theory
- Think like a CTO: what research would give this product an unfair technical advantage?
- Keep output concise and implementation-oriented.

CRITICAL: You MUST output ONLY raw JSON. Do not include ANY conversational text like 'Here are the papers...'. Your entire response must be a valid JSON object matching this exact schema:

{
  "overallStrategy": "2-sentence summary of the recommended R&D direction for this SaaS",
  "papers": [
    {
      "arxivId": "2401.12345",
      "title": "Exact paper title",
      "year": "2024",
      "relevance": "One sentence: why this paper directly applies to the product",
      "boostIdea": "Specific feature or improvement this technique enables — be concrete",
      "implementationHint": "Brief: what would a dev actually do to use this technique?",
      "difficulty": "Medium",
      "impact": "High"
    }
  ]
}"""

# ── Validators ─────────────────────────────────────────────────────────────

def _is_nonempty_string(value) -> bool:
    return isinstance(value, str) and bool(value.strip())

def _has_valid_opportunity_types(opportunities) -> bool:
    if not isinstance(opportunities, list):
        return False
    types = {item.get("type") for item in opportunities if isinstance(item, dict)}
    return {"platform", "feature", "api_plugin"}.issubset(types)

def is_valid_analysis_output(data: dict | None) -> bool:
    if not isinstance(data, dict):
        return False

    paper = data.get("paperAnalysis")
    if not isinstance(paper, dict):
        return False
    if not _is_nonempty_string(paper.get("summary")):
        return False
    if not _is_nonempty_string(paper.get("researchProblem")):
        return False
    if not _is_nonempty_string(paper.get("methodInPlainEnglish")):
        return False
    if not _is_nonempty_string(paper.get("coreBreakthrough")):
        return False

    if not _has_valid_opportunity_types(data.get("opportunities")):
        return False

    rec = data.get("recommendedPath")
    if rec not in {"platform", "feature", "api_plugin"}:
        return False

    return True

REPAIR_SUFFIX = """

Your previous output did not fully satisfy the required JSON contract.
Return JSON only and strictly include:
- paperAnalysis.summary, paperAnalysis.researchProblem, paperAnalysis.methodInPlainEnglish, paperAnalysis.coreBreakthrough
- opportunities with all 3 path types: platform, feature, api_plugin
- recommendedPath set to one of those 3 types
- recommendationReason
"""

# ── Agent runners ─────────────────────────────────────────────────────────────

def run_analysis_agent(model_obj, prompt: str, pdf_path: str = None):
    """Run the main analysis agent with optional PDF for multimodal context.
    Yields string chunks during streaming.
    Returns (raw_text, parsed_dict_or_none) at the end, but since this is called from a generator, it should be adapted in server.py.
    """
    agent = Agent(
        model=model_obj,
        description=SYSTEM_PROMPT,
        markdown=False,
    )

    run_kwargs = {"stream": True}
    if pdf_path and os.path.exists(pdf_path):
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        safe_name = os.path.basename(pdf_path).replace(".", "-").replace("_", "-")
        run_kwargs["files"] = [File(content=pdf_bytes, format="pdf", name=safe_name)]

    raw = ""
    for chunk in agent.run(prompt, **run_kwargs):
        content = chunk.content if hasattr(chunk, "content") else str(chunk)
        if content:
            raw += content
            yield content
    
    parsed = parse_agent_json(raw)
    if is_valid_analysis_output(parsed):
        yield {"__type": "parsed", "raw": raw, "data": parsed}
        return

    # Repair step
    repaired_raw = ""
    for chunk in agent.run(f"{prompt}\n{REPAIR_SUFFIX}", **run_kwargs):
        content = chunk.content if hasattr(chunk, "content") else str(chunk)
        if content:
            repaired_raw += content
            yield content

    repaired = parse_agent_json(repaired_raw)
    yield {"__type": "parsed", "raw": repaired_raw or raw, "data": repaired or parsed}


def run_competitor_agent(idea_context: str, model_obj):
    """Run the competitor research agent with Parallel.ai search tools."""
    agent = Agent(
        model=model_obj,
        description=COMPETITOR_RESEARCH_PROMPT,
        tools=[ParallelTools(enable_search=True, enable_extract=True, max_results=3)],
        markdown=False,
    )

    raw = ""
    for chunk in agent.run(idea_context, stream=True):
        content = chunk.content if hasattr(chunk, "content") else str(chunk)
        if content:
            raw += content
            yield content

    parsed = parse_agent_json(raw)
    yield {"__type": "parsed", "raw": raw, "data": parsed}


def run_saas_boost_agent(saas_description: str, model_obj):
    """Run the SaaS → Papers agent. Uses both Semantic Scholar API and Arxiv Tools to find papers."""
    agent = Agent(
        model=model_obj,
        description=SAAS_TO_PAPERS_PROMPT,
        tools=[SemanticScholarTools()],
        markdown=False,
    )

    prompt = f"Find the most relevant recent arXiv research papers for this SaaS product:\n\n{saas_description}\n\nUse the Semantic Scholar tool to find REAL papers.\nPrioritize papers that have an verifiable arXiv ID.\n\nCRITICAL: You must output ONLY raw JSON. Do not include introductory text like 'Here are the papers...'. Start your response with {{ and end with }}."

    raw = ""
    for chunk in agent.run(prompt, stream=True):
        content = chunk.content if hasattr(chunk, "content") else str(chunk)
        if content:
            raw += content
            yield content

    parsed = parse_agent_json(raw)
    yield {"__type": "parsed", "raw": raw, "data": parsed}

