import json
import re


def parse_agent_json(raw_text: str) -> dict | None:
    """Parse JSON from agent response with multiple fallback strategies.

    1. Strip markdown code fences
    2. Regex-extract the outermost JSON object
    3. Attempt to load it
    Returns parsed dict or None on failure.
    """
    if not raw_text or not raw_text.strip():
        return None

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
        pass

    # Strategy 5: try removing control characters
    sanitized = re.sub(r"[\x00-\x1f\x7f]", " ", repaired)
    try:
        return json.loads(sanitized)
    except json.JSONDecodeError:
        return None


def _is_nonempty_string(value) -> bool:
    return isinstance(value, str) and bool(value.strip())


def is_valid_analyst_output(data: dict | None) -> bool:
    """Validate output from the Forge Analyst agent."""
    if not isinstance(data, dict):
        return False

    paper = data.get("paperAnalysis")
    if not isinstance(paper, dict):
        return False
    if not _is_nonempty_string(paper.get("summary")):
        return False
    if not _is_nonempty_string(paper.get("researchProblem")):
        return False
    if not _is_nonempty_string(paper.get("coreBreakthrough")):
        return False

    return True


def is_valid_architect_output(data: dict | None) -> bool:
    """Validate output from the Product Architect agent."""
    if not isinstance(data, dict):
        return False

    opportunities = data.get("opportunities")
    if not isinstance(opportunities, list) or len(opportunities) == 0:
        return False

    # Check that at least the first opportunity has required fields
    first = opportunities[0]
    if not isinstance(first, dict):
        return False
    if not _is_nonempty_string(first.get("name")):
        return False
    if not _is_nonempty_string(first.get("oneLiner")):
        return False

    if not _is_nonempty_string(data.get("recommendedPath")):
        return False

    return True


def is_valid_strategist_output(data: dict | None) -> bool:
    """Validate output from the Market Strategist agent."""
    if not isinstance(data, dict):
        return False

    strategy = data.get("strategy")
    if not isinstance(strategy, dict):
        return False
    if not _is_nonempty_string(strategy.get("mvpScope")):
        return False
    if not _is_nonempty_string(strategy.get("unfairAdvantage")):
        return False

    return True
