import os
from dotenv import load_dotenv
import requests

load_dotenv(os.path.join(os.path.dirname(__file__), '.env.local'))
token = os.environ.get("AWS_BEARER_TOKEN_BEDROCK")

def test_endpoint(model_id):
    url = "https://bedrock-runtime.us-east-1.amazonaws.com/openai/v1/chat/completions"
    print(f"\n--- Testing POST {url} with {model_id} ---")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model_id,
        "messages": [{"role": "user", "content": [{"type": "text", "text": "hello"}]}]
    }
    try:
        res = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text[:500]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    models = [
        "us.amazon.nova-lite-v1:0",
        "us.meta.llama3-2-11b-instruct-v1:0"
    ]
    for m in models:
        test_endpoint(m)
