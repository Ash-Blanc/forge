import json
import re

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
