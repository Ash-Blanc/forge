"""Agent definitions and prompts for FORGE Streamlit prototype."""

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
    "OpenAI — GPT-4o Mini": "openai:gpt-4o-mini",
    "Anthropic — Claude Sonnet": "anthropic:claude-sonnet-4-20250514",
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
      "Niche/unusual application 2",
      "Niche/unusual application 3"
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
      "distributionEase": "High/Medium/Low",
      "competition": "Low/Medium/High",
      "novelty": "High/Medium/Low",
      "confidence": 1-10,
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
      "distributionEase": "High/Medium/Low",
      "competition": "Low/Medium/High",
      "novelty": "High/Medium/Low",
      "confidence": 1-10,
      "firstMilestone": "Milestone",
      "risks": ["Risk 1"],
      "status": "recommended|viable|not_recommended",
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
      "distributionEase": "High/Medium/Low",
      "competition": "Low/Medium/High",
      "novelty": "High/Medium/Low",
      "confidence": 1-10,
      "firstMilestone": "Milestone",
      "risks": ["Risk 1"],
      "status": "recommended|viable|not_recommended",
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


# ── Agent runners ─────────────────────────────────────────────────────────────


def get_model(model_id_or_obj):
    if not isinstance(model_id_or_obj, str):
        return model_id_or_obj

    model_ref = model_id_or_obj.strip()
    provider = "amazon"
    actual_id = model_ref
    if ":" in model_ref:
        candidate_provider, remainder = model_ref.split(":", 1)
        if candidate_provider in {"amazon", "openai", "anthropic", "cerebras"}:
            provider, actual_id = candidate_provider, remainder
    
    if provider == "cerebras":
        from agno.models.cerebras import Cerebras
        return Cerebras(id=actual_id)
    elif provider == "openai":
        from agno.models.openai import OpenAIChat
        return OpenAIChat(id=actual_id)
    elif provider == "anthropic":
        from agno.models.anthropic import Claude
        return Claude(id=actual_id)
    elif provider == "amazon":
        from agno.models.aws.bedrock import AwsBedrock
        return AwsBedrock(id=actual_id)
    else:
        from agno.models.aws.bedrock import AwsBedrock
        return AwsBedrock(id=actual_id)

def run_analysis_agent(prompt: str, model: str, pdf_path: str = None) -> tuple[str, dict | None]:
    """Run the main analysis agent with optional PDF for multimodal context.
    
    Returns (raw_text, parsed_dict_or_none).
    """
    agent = Agent(
        model=get_model(model),
        description=SYSTEM_PROMPT,
        markdown=False,
    )

    raw = ""
    run_kwargs = {"stream": True}
    if pdf_path and os.path.exists(pdf_path):
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        safe_name = os.path.basename(pdf_path).replace(".", "-").replace("_", "-")
        run_kwargs["files"] = [File(content=pdf_bytes, format="pdf", name=safe_name)]

    for chunk in agent.run(prompt, **run_kwargs):
        content = chunk.content if hasattr(chunk, "content") else str(chunk)
        if content:
            raw += content

    return raw, parse_agent_json(raw)


def run_competitor_agent(idea_context: str, model: str) -> tuple[str, dict | None]:
    """Run the competitor research agent with Parallel.ai search tools."""
    agent = Agent(
        model=get_model(model),
        description=COMPETITOR_RESEARCH_PROMPT,
        tools=[ParallelTools(enable_search=True, enable_extract=True, max_results=3)],
        markdown=False,
    )

    raw = ""
    for chunk in agent.run(idea_context, stream=True):
        content = chunk.content if hasattr(chunk, "content") else str(chunk)
        if content:
            raw += content

    return raw, parse_agent_json(raw)


def run_suggestion_agent(
    idea_oneliner: str, abstract: str, model: str
) -> tuple[str, dict | None]:
    """Run the suggestion agent for alternative ideas."""
    agent = Agent(
        model=get_model(model),
        description=SUGGESTION_PROMPT,
        markdown=False,
    )

    prompt = f"Main idea: {idea_oneliner}\n\nPaper: {abstract[:2000]}"
    raw = ""
    for chunk in agent.run(prompt, stream=True):
        content = chunk.content if hasattr(chunk, "content") else str(chunk)
        if content:
            raw += content

    return raw, parse_agent_json(raw)


def run_saas_boost_agent(saas_description: str, model: str) -> tuple[str, dict | None]:
    """Run the SaaS → Papers agent. Uses both Semantic Scholar API and Arxiv Tools to find papers."""
    agent = Agent(
        model=get_model(model),
        description=SAAS_TO_PAPERS_PROMPT,
        tools=[SemanticScholarTools()],
        markdown=False,
    )

    prompt = f"""Find the most relevant recent arXiv research papers for this SaaS product:

{saas_description}

Use the Semantic Scholar tool to find REAL papers.
Prioritize papers that have an verifiable arXiv ID.

CRITICAL: You must output ONLY raw JSON. Do not include introductory text like 'Here are the papers...'. Start your response with {{ and end with }}."""

    raw = ""
    for chunk in agent.run(prompt, stream=True):
        content = chunk.content if hasattr(chunk, "content") else str(chunk)
        if content:
            raw += content

    return raw, parse_agent_json(raw)
