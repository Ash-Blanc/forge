import os
import boto3
from agno.models.aws.bedrock import AwsBedrock
from agno.models.openai import OpenAIChat
from agno.models.anthropic import Claude
from agno.models.cerebras import Cerebras

AVAILABLE_MODELS = {
    "AWS Bedrock — Nova Pro": "amazon:amazon.nova-pro-v1:0",
    "AWS Bedrock — Nova 2 Lite": "amazon:amazon.nova-lite-v1:0",
    "OpenAI — GPT-4o": "openai:gpt-4o",
    "OpenAI — GPT-4o Mini": "openai:gpt-4o-mini",
    "Anthropic — Claude 3.5 Sonnet": "anthropic:claude-3-5-sonnet-latest",
    "Cerebras — Llama 3.1 70B": "cerebras:llama3.1-70b",
    "Cerebras — Llama 3.1 8B (fast)": "cerebras:llama3.1-8b",
}

DEFAULT_MODEL_KEY = "AWS Bedrock — Nova Pro"

def get_model(model_id: str | None = None):
    """Instantiate the appropriate Agno model based on the provider prefix."""
    model_id = model_id or AVAILABLE_MODELS[DEFAULT_MODEL_KEY]
    provider = "amazon"
    actual_id = model_id
    
    if ":" in model_id:
        provider, actual_id = model_id.split(":", 1)
    
    if provider == "cerebras":
        return Cerebras(id=actual_id)
    elif provider == "openai":
        return OpenAIChat(id=actual_id)
    elif provider == "anthropic":
        return Claude(id=actual_id)
    elif provider == "amazon":
        boto_session = boto3.Session(region_name=os.environ.get("AWS_REGION", "us-east-1"))
        return AwsBedrock(id=actual_id, session=boto_session)
    else:
        # Fallback to Nova Lite
        boto_session = boto3.Session(region_name=os.environ.get("AWS_REGION", "us-east-1"))
        return AwsBedrock(id="amazon.nova-lite-v1:0", session=boto_session)
