import os
from agno.run.response import RunResponse
from agno.agent import Agent

from lib.parsers import parse_agent_json


def index_paper_hook(run_response: RunResponse, agent: Agent, **kwargs):
    """Post-hook to index the analyzed paper into PgVector.
    
    This hook fires after the Forge Analyst completes a run.
    It attempts to extract paper metadata from the agent's session_state
    and index both the abstract and the analysis into the vector database.
    
    NOTE: This hook is optional and will silently skip if:
    - No userId is found in session_state (not logged in)
    - SUPABASE_DB_URL is not configured
    - The output cannot be parsed as JSON
    """
    try:
        state = agent.session_state or {}
        user_id = state.get("userId")
        if not user_id:
            return

        from knowledge import index_paper_session

        # Extract the text content from the run response
        content = ""
        if hasattr(run_response, "content") and run_response.content:
            content = str(run_response.content)
        elif hasattr(run_response, "messages") and run_response.messages:
            # Fall back to last assistant message
            for msg in reversed(run_response.messages):
                if hasattr(msg, "role") and msg.role == "assistant":
                    content = str(msg.content) if hasattr(msg, "content") else ""
                    break

        if not content:
            return

        analysis = parse_agent_json(content)
        if not analysis:
            return

        index_paper_session(
            user_id=user_id,
            paper_arxiv_id=state.get("arxivId", "unknown"),
            paper_title=state.get("title", "Unknown Title"),
            abstract=state.get("abstract", ""),
            agent_analysis_dict=analysis,
        )
    except Exception as e:
        print(f"Failed to vector index paper in hook: {e}")
