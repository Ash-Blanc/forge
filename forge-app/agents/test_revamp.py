"""
FORGE Agent Smoke Tests
=======================
Quick checks that the agents and workflow can import, initialize, and run
without crashing. Run with: uv run python test_revamp.py
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

def test_imports():
    """Verify all modules import without errors."""
    print("1. Testing imports...")
    from core import forge_analyst, product_architect, market_strategist
    from workflow import forge_flow_instance
    from lib.parsers import parse_agent_json, is_valid_analyst_output, is_valid_architect_output, is_valid_strategist_output
    from tools.scholar import SemanticScholarTools
    from tools.arxiv import CustomArxivTools
    print("   ✓ All imports successful")

def test_agent_config():
    """Verify agent configurations are properly set."""
    print("2. Testing agent configurations...")
    from core import forge_analyst, product_architect, market_strategist

    assert forge_analyst.id == "forge-analyst", f"Expected 'forge-analyst', got '{forge_analyst.id}'"
    assert product_architect.id == "product-architect", f"Expected 'product-architect', got '{product_architect.id}'"
    assert market_strategist.id == "market-strategist", f"Expected 'market-strategist', got '{market_strategist.id}'"
    
    # Check that descriptions are set
    assert forge_analyst.description, "Analyst missing description"
    assert product_architect.description, "Architect missing description"
    assert market_strategist.description, "Strategist missing description"
    
    # Check that instructions are set
    assert forge_analyst.instructions, "Analyst missing instructions"
    assert product_architect.instructions, "Architect missing instructions"
    assert market_strategist.instructions, "Strategist missing instructions"
    
    print("   ✓ All agent configurations valid")

def test_workflow_config():
    """Verify workflow is properly configured with steps."""
    print("3. Testing workflow configuration...")
    from workflow import forge_flow_instance

    assert forge_flow_instance.name == "FORGE Paper to Product Flow"
    assert forge_flow_instance.steps is not None
    assert len(forge_flow_instance.steps) == 3
    print(f"   ✓ Workflow has {len(forge_flow_instance.steps)} steps")

def test_json_parser():
    """Verify JSON parser handles various input formats."""
    print("4. Testing JSON parser...")
    from lib.parsers import parse_agent_json

    # Clean JSON
    result = parse_agent_json('{"paperAnalysis": {"summary": "test"}}')
    assert result is not None and "paperAnalysis" in result

    # Markdown-fenced JSON
    result = parse_agent_json('```json\n{"key": "value"}\n```')
    assert result is not None and result["key"] == "value"

    # JSON with preamble text
    result = parse_agent_json('Here is my analysis:\n\n{"result": true}')
    assert result is not None and result["result"] is True

    # Trailing comma repair
    result = parse_agent_json('{"items": ["a", "b",]}')
    assert result is not None

    # Empty / None guards
    assert parse_agent_json("") is None
    assert parse_agent_json("   ") is None

    print("   ✓ All parser tests passed")

def test_validators():
    """Verify per-agent validators work correctly."""
    print("5. Testing output validators...")
    from lib.parsers import is_valid_analyst_output, is_valid_architect_output, is_valid_strategist_output

    # Valid analyst output
    assert is_valid_analyst_output({
        "paperAnalysis": {
            "summary": "A summary",
            "researchProblem": "A problem",
            "coreBreakthrough": "A breakthrough"
        }
    })

    # Invalid analyst output (missing coreBreakthrough)
    assert not is_valid_analyst_output({
        "paperAnalysis": {
            "summary": "A summary",
            "researchProblem": "A problem"
        }
    })

    # Valid architect output
    assert is_valid_architect_output({
        "opportunities": [{"name": "Opp1", "oneLiner": "Does X for Y"}],
        "recommendedPath": "Opp1"
    })

    # Valid strategist output
    assert is_valid_strategist_output({
        "strategy": {
            "mvpScope": "Feature list",
            "unfairAdvantage": "Tech moat"
        }
    })

    print("   ✓ All validator tests passed")

def test_server_init():
    """Verify AgentOS can initialize without errors."""
    print("6. Testing AgentOS initialization...")
    from server import agent_os
    assert agent_os is not None
    print("   ✓ AgentOS initialized successfully")


if __name__ == "__main__":
    tests = [
        test_imports,
        test_agent_config,
        test_workflow_config,
        test_json_parser,
        test_validators,
        test_server_init,
    ]

    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"   ✗ FAILED: {e}")
            failed += 1

    print(f"\n{'='*40}")
    print(f"Results: {passed} passed, {failed} failed out of {len(tests)}")
    if failed > 0:
        sys.exit(1)
    print("All smoke tests passed! ✓")
