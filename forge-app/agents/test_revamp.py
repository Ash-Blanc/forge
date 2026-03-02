import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', 'streamlit-prototype', '.env'))

from workflow import forge_flow_instance

def test_flow():
    # Test with a known Arxiv ID (Attention is All You Need)
    arxiv_id = "1706.03762"
    prompt = f"Analyze paper: {arxiv_id}"
    
    print(f"Running ForgeFlow for Arxiv ID: {arxiv_id}...")
    
    # Run the workflow
    # ForgeFlow steps: Analyst -> Architect -> Strategist
    # Note: The first step might need the paper content or metadata
    # For now, let's see if it runs the first step at least
    
    try:
        response = forge_flow_instance.run(prompt)
        print("Workflow Response:")
        print(response.content if hasattr(response, "content") else response)
    except Exception as e:
        print(f"Error running workflow: {e}")

if __name__ == "__main__":
    test_flow()
