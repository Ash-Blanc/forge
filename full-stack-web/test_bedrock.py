import os
from dotenv import load_dotenv
import boto3

load_dotenv(os.path.join(os.path.dirname(__file__), '.env.local'))

def test_bedrock():
    token = os.environ.get("AWS_BEARER_TOKEN_BEDROCK")
    region = os.environ.get("AWS_REGION", "us-east-1")
    
    print(f"Using Region: {region}")
    if token:
        print("Bearer Token found (length):", len(token))
    else:
        print("Bearer Token MISSING from environment")
        return

    # Clear any confusing dummy or empty keys from the environment to force Bearer token
    os.environ.pop("AWS_ACCESS_KEY_ID", None)
    os.environ.pop("AWS_SECRET_ACCESS_KEY", None)
    os.environ.pop("AWS_SESSION_TOKEN", None)
    
    try:
        session = boto3.Session(region_name=region)
        client = session.client("bedrock")
        response = client.list_foundation_models()
        print("Success! Found", len(response.get("modelSummaries", [])), "models.")
        
        # Test runtime as well just to be safe
        runtime = session.client("bedrock-runtime")
        print("Bedrock Runtime client instantiated successfully!")
        
        # Test an actual model invocation
        import json
        body = json.dumps({
            "messages": [{"role": "user", "content": [{"text": "Hello, AWS Nova!"}]}],
            "schemaVersion": "messages-v1",
        })
        try:
            print("Invoking model amazon.nova-lite-v1:0 ...")
            chat_response = runtime.invoke_model(
                modelId="amazon.nova-lite-v1:0",
                body=body
            )
            print("Model generated successfully!")
        except Exception as ex:
            print("Invoke model failed:", ex)
    except Exception as e:
        print("Error with bedrock API:", e)

if __name__ == "__main__":
    test_bedrock()
