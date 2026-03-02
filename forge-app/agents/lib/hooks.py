import os
from agno.run.agent import RunOutput
from agno.agent import Agent

from lib.parsers import parse_agent_json

def index_paper_hook(run_output: RunOutput, agent: Agent, session=None):
    """Post-hook to index the analyzed paper into PgVector."""
    try:
        # Try to get metadata from session_state
        state = agent.session_state or {}
        user_id = state.get("userId")
        if not user_id:
            return

        from knowledge import index_paper_session
        
        # Parse the JSON from the output if it's not already parsed
        # Depending on the agent's response format, content might already be it
        content = run_output.content if hasattr(run_output, "content") else str(run_output)
        analysis = parse_agent_json(content)
        if not analysis:
            return

        index_paper_session(
            user_id=user_id,
            paper_arxiv_id=state.get("arxivId", "unknown"),
            paper_title=state.get("title", "Unknown Title"),
            abstract=state.get("abstract", ""),
            agent_analysis_dict=analysis
        )
    except Exception as e:
        print(f"Failed to vector index paper in hook: {e}")
