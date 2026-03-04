from agno.workflow import Step, Workflow

from core import forge_analyst, product_architect, market_strategist

# ── Named Steps ──────────────────────────────────────────────────────────────
analyze_step = Step(
    name="Analyze Paper",
    agent=forge_analyst,
    description="Extract the technical essence and core breakthrough from the provided paper.",
)

architect_step = Step(
    name="Architect Opportunities",
    agent=product_architect,
    description="Brainstorm 3-5 distinct commercialization directions from the paper's breakthrough.",
)

strategize_step = Step(
    name="Strategize Market",
    agent=market_strategist,
    description="Build a full execution strategy with competitors, MVP scope, and GTM plan.",
)

# ── Workflow ─────────────────────────────────────────────────────────────────
forge_flow_instance = Workflow(
    id="forge-flow",
    name="FORGE Paper to Product Flow",
    description="Three-step pipeline: Paper Analysis → Product Architecture → Market Strategy",
    steps=[
        analyze_step,
        architect_step,
        strategize_step,
    ],
)
