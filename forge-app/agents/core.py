from agno.agent import Agent
from agno.tools.duckduckgo import DuckDuckGoTools

from models import get_model
from prompts.analyst import ANALYST_DESCRIPTION, ANALYST_INSTRUCTIONS, ANALYST_EXPECTED_OUTPUT
from prompts.architect import ARCHITECT_DESCRIPTION, ARCHITECT_INSTRUCTIONS, ARCHITECT_EXPECTED_OUTPUT
from prompts.strategist import STRATEGIST_DESCRIPTION, STRATEGIST_INSTRUCTIONS, STRATEGIST_EXPECTED_OUTPUT
from tools.scholar import SemanticScholarTools
from tools.arxiv import CustomArxivTools

# ── Forge Analyst ────────────────────────────────────────────────────────────
forge_analyst = Agent(
    id="forge-analyst",
    name="Forge Analyst",
    model=get_model(),
    description=ANALYST_DESCRIPTION,
    instructions=ANALYST_INSTRUCTIONS,
    expected_output=ANALYST_EXPECTED_OUTPUT,
    tools=[CustomArxivTools()],
    markdown=False,
)

# ── Product Architect ─────────────────────────────────────────────────────────
product_architect = Agent(
    id="product-architect",
    name="Product Architect",
    model=get_model(),
    description=ARCHITECT_DESCRIPTION,
    instructions=ARCHITECT_INSTRUCTIONS,
    expected_output=ARCHITECT_EXPECTED_OUTPUT,
    markdown=False,
)

# ── Market Strategist ─────────────────────────────────────────────────────────
market_strategist = Agent(
    id="market-strategist",
    name="Market Strategist",
    model=get_model(),
    description=STRATEGIST_DESCRIPTION,
    instructions=STRATEGIST_INSTRUCTIONS,
    expected_output=STRATEGIST_EXPECTED_OUTPUT,
    tools=[
        DuckDuckGoTools(),
        SemanticScholarTools(),
    ],
    markdown=False,
)
