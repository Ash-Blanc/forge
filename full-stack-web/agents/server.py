import os
import json
import re
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from agno.agent import Agent
from agno.models.cerebras import Cerebras
from dotenv import load_dotenv

# Load .env.local from the parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

app = FastAPI()

class ArxivMeta(BaseModel):
    title: str
    authors: List[str]
    published: str
    abstract: str

SYSTEM_PROMPT = """You are FORGE — an AI that distills academic papers into clear, honest SaaS opportunities.
Return ONLY valid JSON. No markdown fences, no preamble, no scores or ratings. Just the analysis."""

def build_prompt(meta: dict) -> str:
    title = meta.get("title", "")
    authors = ", ".join(meta.get("authors", []))
    published = meta.get("published", "")
    abstract = meta.get("abstract", "")[:2000]

    return f"""Analyze this paper and return a JSON object. Be concrete, honest, and specific — avoid hype.

Title: {title}
Authors: {authors}
Published: {published}
Abstract: {abstract}

Return exactly this JSON (all fields required, no numeric scores):
{{
  "opportunity": "One clear sentence: what product, for whom, and the core value",
  "coreInnovation": "What the paper actually invented — the technical breakthrough in plain language",
  "targetCustomer": "Specific role, industry, company stage. Be precise.",
  "marketSize": "Realistic TAM estimate with reasoning. Cite known data if applicable.",
  "buildComplexity": "low" | "medium" | "high",
  "mvpDays": number (21-120),
  "moatAnalysis": "What would prevent a well-funded competitor from replicating this in 6 months",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "first90Days": ["Day X: specific milestone", "Day Y: specific milestone", "Day Z: specific milestone"],
  "narrativeAnalysis": "3-4 sentences. Why this paper, why now, what the business model unlock is, what the honest risks are."
}}"""

# Load agent model
agent = Agent(
    model=Cerebras(id="llama3.3-70b"),
    description=SYSTEM_PROMPT,
    markdown=False
)

@app.post("/analyze")
def analyze_paper(meta: ArxivMeta):
    prompt = build_prompt(meta.dict())

    def generate():
        full_text = ""
        try:
            # Agno stream=True gives a generator
            response = agent.run(prompt, stream=True)
            for chunk in response:
                content = chunk.content if hasattr(chunk, 'content') else str(chunk)
                if content:
                    full_text += content
                    yield f"data: {json.dumps({'type': 'delta', 'text': full_text})}\n\n"
            
            # Clean and output final JSON
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
