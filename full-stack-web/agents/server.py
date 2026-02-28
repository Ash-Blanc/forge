import os
import json
import re
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

from agents import (
    SYSTEM_PROMPT,
    COMPETITOR_RESEARCH_PROMPT,
    SAAS_TO_PAPERS_PROMPT,
    run_analysis_agent,
    run_competitor_agent,
    run_saas_boost_agent,
    run_suggestion_agent
)

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', 'streamlit-prototype', '.env'))

# CRITICAL: Prevent Boto3 from hanging on IMDS metadata timeouts if these are explicitly empty
os.environ.pop("AWS_ACCESS_KEY_ID", None)
os.environ.pop("AWS_SECRET_ACCESS_KEY", None)

app = FastAPI()

class ArxivMeta(BaseModel):
    title: str
    authors: List[str]
    published: str
    abstract: str
    arxivId: Optional[str] = "unknown"
    userId: str
    model: Optional[str] = "amazon:amazon.nova-lite-v1:0"

class SaasMeta(BaseModel):
    description: str
    model: Optional[str] = "cerebras:llama3.1-8b"

class CompetitorMeta(BaseModel):
    ideaContext: str
    model: Optional[str] = "cerebras:llama3.1-8b"

def build_prompt(meta: dict) -> str:
    return f"""Analyze this paper and generate both a paper analysis and startup idea.

Title: {meta.get("title", "")}
Authors: {", ".join(meta.get("authors", []))}
Abstract: {meta.get("abstract", "")[:5000]}

Return ONLY valid JSON."""

@app.post("/analyze")
def analyze_paper(meta: ArxivMeta):
    prompt = build_prompt(meta.dict())

    def generate():
        try:
            from agno.agent import Agent

            # Determine the provider from the model_id string (e.g., "amazon:...")
            model_id = meta.model or "amazon:amazon.nova-lite-v1:0"
            provider = "amazon"
            actual_id = model_id
            
            if ":" in model_id:
                provider, actual_id = model_id.split(":", 1)
            
            if provider == "cerebras":
                from agno.models.cerebras import Cerebras
                model = Cerebras(id=actual_id)
            elif provider == "openai":
                from agno.models.openai import OpenAIChat
                model = OpenAIChat(id=actual_id)
            elif provider == "anthropic":
                from agno.models.anthropic import Claude
                model = Claude(id=actual_id)
            elif provider == "amazon":
                from agno.models.aws.bedrock import AwsBedrock
                import boto3
                boto_session = boto3.Session(region_name=os.environ.get("AWS_REGION", "us-east-1"))
                model = AwsBedrock(id=actual_id, session=boto_session)
            else:
                from agno.models.aws.bedrock import AwsBedrock
                import boto3
                boto_session = boto3.Session(region_name=os.environ.get("AWS_REGION", "us-east-1"))
                model = AwsBedrock(id="amazon.nova-lite-v1:0", session=boto_session)
                
            agent = Agent(
                model=model,
                description=SYSTEM_PROMPT,
                markdown=False,
            )

            full_text = ""
            for chunk in agent.run(prompt, stream=True):
                content = chunk.content if hasattr(chunk, 'content') else str(chunk)
                if content:
                    full_text += content
                    yield f"data: {json.dumps({'type': 'delta', 'text': full_text})}\n\n"
            
            clean = re.sub(r'```json\s*', '', full_text, flags=re.IGNORECASE)
            clean = re.sub(r'```\s*', '', clean).strip()
            match = re.search(r'\{[\s\S]*\}', clean)
            if not match:
                raise ValueError("No JSON in response")
            
            analysis = json.loads(match.group(0))
            
            # --- Indexing to PgVector ---
            try:
                if getattr(meta, 'userId', None):
                    from knowledge import index_paper_session
                    index_paper_session(
                        user_id=meta.userId,
                        paper_arxiv_id=getattr(meta, 'arxivId', 'unknown'),
                        paper_title=meta.title,
                        abstract=meta.abstract,
                        agent_analysis_dict=analysis
                    )
            except Exception as e:
                print(f"Failed to vector index paper for user {getattr(meta, 'userId', 'unknown')}: {e}")

            yield f"data: {json.dumps({'type': 'done', 'analysis': analysis})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/analyze-saas")
def analyze_saas(meta: SaasMeta):
    def generate():
        try:
            from agno.agent import Agent
            from tools import SemanticScholarTools

            model_id = meta.model or "amazon:amazon.nova-lite-v1:0"
            provider = "amazon"
            actual_id = model_id
            
            if ":" in model_id:
                provider, actual_id = model_id.split(":", 1)
            
            if provider == "cerebras":
                from agno.models.cerebras import Cerebras
                model = Cerebras(id=actual_id)
            elif provider == "openai":
                from agno.models.openai import OpenAIChat
                model = OpenAIChat(id=actual_id)
            elif provider == "anthropic":
                from agno.models.anthropic import Claude
                model = Claude(id=actual_id)
            elif provider == "amazon":
                from agno.models.aws.bedrock import AwsBedrock
                import boto3
                boto_session = boto3.Session(region_name=os.environ.get("AWS_REGION", "us-east-1"))
                model = AwsBedrock(id=actual_id, session=boto_session)
            else:
                from agno.models.aws.bedrock import AwsBedrock
                import boto3
                boto_session = boto3.Session(region_name=os.environ.get("AWS_REGION", "us-east-1"))
                model = AwsBedrock(id="amazon.nova-lite-v1:0", session=boto_session)

            tools = [SemanticScholarTools()]
            agent = Agent(
                model=model,
                description=SAAS_TO_PAPERS_PROMPT,
                tools=tools,
                markdown=False
            )
            
            prompt = f"""Find the most relevant recent arXiv research papers for this SaaS product:

{meta.description}

Use the Semantic Scholar tool or Arxiv Search tool to find REAL papers. 
If Semantic Scholar hits a rate limit, use Arxiv Tools to search.
Prioritize papers that have an verifiable arXiv ID. Return JSON only."""

            full_text = ""
            for chunk in agent.run(prompt, stream=True):
                content = chunk.content if hasattr(chunk, 'content') else str(chunk)
                if content:
                    full_text += content
                    yield f"data: {json.dumps({'type': 'delta', 'text': full_text})}\n\n"
            
            clean = re.sub(r'```json\s*', '', full_text, flags=re.IGNORECASE)
            clean = re.sub(r'```\s*', '', clean).strip()
            match = re.search(r'\{[\s\S]*\}', clean)
            if not match:
                raise ValueError("No JSON in response")
            
            analysis = json.loads(match.group(0))
            yield f"data: {json.dumps({'type': 'done', 'analysis': analysis})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/analyze-competitors")
def analyze_competitors(meta: CompetitorMeta):
    def generate():
        try:
            from agno.agent import Agent
            from agno.tools.parallel import ParallelTools

            model_id = meta.model or "amazon:amazon.nova-lite-v1:0"
            provider = "amazon"
            actual_id = model_id
            
            if ":" in model_id:
                provider, actual_id = model_id.split(":", 1)
            
            if provider == "cerebras":
                from agno.models.cerebras import Cerebras
                model = Cerebras(id=actual_id)
            elif provider == "openai":
                from agno.models.openai import OpenAIChat
                model = OpenAIChat(id=actual_id)
            elif provider == "anthropic":
                from agno.models.anthropic import Claude
                model = Claude(id=actual_id)
            elif provider == "amazon":
                from agno.models.aws.bedrock import AwsBedrock
                import boto3
                boto_session = boto3.Session(region_name=os.environ.get("AWS_REGION", "us-east-1"))
                model = AwsBedrock(id=actual_id, session=boto_session)
            else:
                from agno.models.aws.bedrock import AwsBedrock
                import boto3
                boto_session = boto3.Session(region_name=os.environ.get("AWS_REGION", "us-east-1"))
                model = AwsBedrock(id="amazon.nova-lite-v1:0", session=boto_session)

            agent = Agent(
                model=model,
                description=COMPETITOR_RESEARCH_PROMPT,
                tools=[ParallelTools(enable_search=True, enable_extract=True, max_results=5)],
                markdown=False,
            )

            full_text = ""
            for chunk in agent.run(meta.ideaContext, stream=True):
                content = chunk.content if hasattr(chunk, 'content') else str(chunk)
                if content:
                    full_text += content
                    yield f"data: {json.dumps({'type': 'delta', 'text': full_text})}\n\n"
            
            clean = re.sub(r'```json\s*', '', full_text, flags=re.IGNORECASE)
            clean = re.sub(r'```\s*', '', clean).strip()
            match = re.search(r'\{[\s\S]*\}', clean)
            if not match:
                raise ValueError("No JSON in response")
            
            analysis = json.loads(match.group(0))
            yield f"data: {json.dumps({'type': 'done', 'analysis': analysis})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


