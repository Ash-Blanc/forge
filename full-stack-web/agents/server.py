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
)
from utils import build_prompt, build_constellation_prompt, fetch_related_arxiv_papers, fetch_arxiv_meta, parse_agent_json

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

class ConstellationMeta(BaseModel):
    title: str
    authors: List[str]
    published: str
    abstract: str
    arxivId: str
    userId: str
    model: Optional[str] = "amazon:amazon.nova-lite-v1:0"

class SaasMeta(BaseModel):
    description: str
    model: Optional[str] = "amazon:amazon.nova-lite-v1:0"

class CompetitorMeta(BaseModel):
    ideaContext: str
    model: Optional[str] = "amazon:amazon.nova-lite-v1:0"

def get_model(model_id: str | None):
    """Instantiate the appropriate Agno model based on the provider prefix."""
    model_id = model_id or "amazon:amazon.nova-lite-v1:0"
    provider = "amazon"
    actual_id = model_id
    
    if ":" in model_id:
        provider, actual_id = model_id.split(":", 1)
    
    if provider == "cerebras":
        from agno.models.cerebras import Cerebras
        return Cerebras(id=actual_id)
    elif provider == "openai":
        from agno.models.openai import OpenAIChat
        return OpenAIChat(id=actual_id)
    elif provider == "anthropic":
        from agno.models.anthropic import Claude
        return Claude(id=actual_id)
    elif provider == "amazon":
        from agno.models.aws.bedrock import AwsBedrock
        import boto3
        boto_session = boto3.Session(region_name=os.environ.get("AWS_REGION", "us-east-1"))
        return AwsBedrock(id=actual_id, session=boto_session)
    else:
        from agno.models.aws.bedrock import AwsBedrock
        import boto3
        boto_session = boto3.Session(region_name=os.environ.get("AWS_REGION", "us-east-1"))
        return AwsBedrock(id="amazon.nova-lite-v1:0", session=boto_session)

@app.post("/analyze")
def analyze_paper(meta: ArxivMeta):
    prompt = build_prompt(meta.dict())

    def generate():
        try:
            model = get_model(meta.model)
                
            full_text = ""
            analysis = None
            
            for chunk in run_analysis_agent(model, prompt):
                if isinstance(chunk, dict) and chunk.get("__type") == "parsed":
                    analysis = chunk.get("data")
                    full_text = chunk.get("raw", full_text)
                    continue
                full_text += chunk
                yield f"data: {json.dumps({'type': 'delta', 'text': full_text})}\n\n"
            
            if not analysis:
                raise ValueError("No JSON in response")
            
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

@app.post("/analyze-constellation")
def analyze_constellation(meta: ConstellationMeta):
    def generate():
        try:
            # 1. Yield initial progress
            yield f"data: {json.dumps({'type': 'status', 'message': 'Finding related papers via Semantic Scholar...'})}\n\n"
            
            # 2. Fetch related papers
            related = fetch_related_arxiv_papers(meta.dict(), meta.arxivId, limit=4)
            if not related:
                yield f"data: {json.dumps({'type': 'status', 'message': 'Proceeding with single paper (no related found)...'})}\n\n"
                
            yield f"data: {json.dumps({'type': 'status', 'message': 'Fetching full abstracts from arXiv...'})}\n\n"
            
            enriched_related = []
            for r in related:
                r_meta = fetch_arxiv_meta(r["arxivId"])
                if r_meta:
                    r["abstract"] = r_meta.get("abstract", "")
                    enriched_related.append(r)
            
            # 3. Build Prompt
            prompt = build_constellation_prompt(meta.dict(), enriched_related)
            
            yield f"data: {json.dumps({'type': 'status', 'message': 'Analyzing constellation...'})}\n\n"
            
            model = get_model(meta.model)
            full_text = ""
            analysis = None
            
            for chunk in run_analysis_agent(model, prompt):
                if isinstance(chunk, dict) and chunk.get("__type") == "parsed":
                    analysis = chunk.get("data")
                    full_text = chunk.get("raw", full_text)
                    continue
                full_text += chunk
                yield f"data: {json.dumps({'type': 'delta', 'text': full_text})}\n\n"
            
            if not analysis:
                raise ValueError("No JSON in response")
            
            yield f"data: {json.dumps({'type': 'done', 'analysis': analysis})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/analyze-saas")
def analyze_saas(meta: SaasMeta):
    def generate():
        try:
            model = get_model(meta.model)

            full_text = ""
            analysis = None
            for chunk in run_saas_boost_agent(meta.description, model):
                if isinstance(chunk, dict) and chunk.get("__type") == "parsed":
                    analysis = chunk.get("data")
                    full_text = chunk.get("raw", full_text)
                    continue
                full_text += chunk
                yield f"data: {json.dumps({'type': 'delta', 'text': full_text})}\n\n"
            
            if not analysis:
                raise ValueError("No valid JSON generated for SaaS Boost")
            
            yield f"data: {json.dumps({'type': 'done', 'analysis': analysis})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/analyze-competitors")
def analyze_competitors(meta: CompetitorMeta):
    def generate():
        try:
            model = get_model(meta.model)

            full_text = ""
            analysis = None
            for chunk in run_competitor_agent(meta.ideaContext, model):
                if isinstance(chunk, dict) and chunk.get("__type") == "parsed":
                    analysis = chunk.get("data")
                    full_text = chunk.get("raw", full_text)
                    continue
                full_text += chunk
                yield f"data: {json.dumps({'type': 'delta', 'text': full_text})}\n\n"
            
            if not analysis:
                raise ValueError("No valid JSON generated for Competitor Intelligence")
            
            yield f"data: {json.dumps({'type': 'done', 'analysis': analysis})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


