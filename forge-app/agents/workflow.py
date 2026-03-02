from agno.workflow import Workflow, Step
from core import forge_analyst, product_architect, market_strategist

class ForgeFlow(Workflow):
    def __init__(self, **kwargs):
        super().__init__(
            id="forge-flow",
            name="FORGE Paper to Product Flow",
            **kwargs
        )
        
        self.steps = [
            Step(name="Analyze Paper", agent=forge_analyst),
            Step(name="Architect Opportunities", agent=product_architect),
            Step(name="Strategize Market", agent=market_strategist)
        ]

# Simple instance for the server
forge_flow_instance = ForgeFlow()
