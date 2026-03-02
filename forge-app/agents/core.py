from agno.agent import Agent
from agno.tools.duckduckgo import DuckDuckGoTools

from models import get_model
from prompts.analyst import ANALYST_PROMPT
from prompts.architect import ARCHITECT_PROMPT
from prompts.strategist import STRATEGIST_PROMPT
from tools.scholar import SemanticScholarTools
from tools.arxiv import CustomArxivTools
from lib.hooks import index_paper_hook

# ── Forge Analyst ────────────────────────────────────────────────────────────
forge_analyst = Agent(
    id="forge-analyst",
    name="Forge Analyst",
    model=get_model(),
    description=ANALYST_PROMPT,
    tools=[CustomArxivTools()], # Added to fetch paper content from IDs
    post_hooks=[index_paper_hook],
    markdown=False,
)

# ── Product Architect ─────────────────────────────────────────────────────────
product_architect = Agent(
    id="product-architect",
    name="Product Architect",
    model=get_model(),
    description=ARCHITECT_PROMPT,
    markdown=False,
)

# ── Market Strategist ─────────────────────────────────────────────────────────
market_strategist = Agent(
    id="market-strategist",
    name="Market Strategist",
    model=get_model(),
    description=STRATEGIST_PROMPT,
    tools=[
        DuckDuckGoTools(), # Replaced ParallelTools due to missing API key
        SemanticScholarTools()
    ],
    markdown=False,
)
