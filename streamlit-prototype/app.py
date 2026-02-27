import streamlit as st
import urllib.request
import xml.etree.ElementTree as ET
import re
import json
import os
from agno.agent import Agent
from agno.models.cerebras import Cerebras
from dotenv import load_dotenv

# Load .env.local from the parent full-stack-web directory or current if available
env_path = os.path.join(os.path.dirname(__file__), '..', 'full-stack-web', '.env.local')
load_dotenv(env_path)

st.set_page_config(page_title="FORGE Streamlit Prototype", layout="wide")

def fetch_arxiv_meta(arxiv_id: str) -> dict:
    url = f"http://export.arxiv.org/api/query?id_list={arxiv_id}"
    try:
        response = urllib.request.urlopen(url)
        xml_data = response.read()
        root = ET.fromstring(xml_data)
        
        # Namespaces
        ns = {'default': 'http://www.w3.org/2005/Atom'}
        entry = root.find('default:entry', ns)
        
        if not entry:
            return {}
            
        title = entry.find('default:title', ns).text
        abstract = entry.find('default:summary', ns).text
        published = entry.find('default:published', ns).text
        authors = [author.find('default:name', ns).text for author in entry.findall('default:author', ns)]
        
        return {
            "title": title.strip().replace('\n', ' '),
            "authors": authors,
            "published": published,
            "abstract": abstract.strip().replace('\n', ' ')
        }
    except Exception as e:
        st.error(f"Failed to fetch from arXiv: {e}")
        return {}

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

st.title("FORGE - Paper Distillery Prototype")
st.markdown("A lightweight Streamlit replacement for the Next.js full-stack app, demonstrating the Agno + Cerebras pipeline.")

arxiv_url = st.text_input("Enter ArXiv URL or ID (e.g., 1706.03762)", value="")

if st.button("Analyze Idea"):
    if not arxiv_url:
        st.warning("Please enter an ArXiv ID or URL")
    else:
        st.info("Fetching paper metadata...")
        # Simple ID extraction
        arxiv_id = arxiv_url.split('/')[-1].replace('.pdf', '')
        # Handle cases like arxiv.org/abs/1706.03762
        match = re.search(r'(\d{4}\.\d{4,5}(v\d+)?)', arxiv_id)
        if match:
            arxiv_id = match.group(1)
            
        try:
            meta = fetch_arxiv_meta(arxiv_id)
            if not meta:
                st.error("Could not parse metadata for this paper. Did you use a valid arXiv ID?")
            else:
                st.write(f"**Title:** {meta['title']}")
                st.write(f"**Authors:** {', '.join(meta['authors'])}")
                st.write(f"**Published:** {meta['published']}")
                with st.expander("Show Abstract"):
                    st.write(meta['abstract'])
                
                st.info("Analyzing SaaS Opportunity via Cerebras & Agno...")
                
                try:
                    agent = Agent(
                        model=Cerebras(id="llama3.3-70b"),
                        description=SYSTEM_PROMPT,
                        markdown=False
                    )
                    
                    prompt = build_prompt(meta)
                    # Stream the response natively in Streamlit
                    response_placeholder = st.empty()
                    full_text = ""
                    
                    response_stream = agent.run(prompt, stream=True)
                    for chunk in response_stream:
                        content = chunk.content if hasattr(chunk, 'content') else str(chunk)
                        if content:
                            full_text += content
                            response_placeholder.code(full_text, language="json")
                    
                    # Cleanup output
                    clean = re.sub(r'```json\s*', '', full_text, flags=re.IGNORECASE)
                    clean = re.sub(r'```\s*', '', clean).strip()
                    json_match = re.search(r'\{[\s\S]*\}', clean)
                    
                    if json_match:
                        st.success("Analysis Complete!")
                        response_placeholder.empty() # clear raw json
                        
                        analysis = json.loads(json_match.group(0))
                        
                        st.subheader(analysis.get("opportunity", "Opportunity"))
                        
                        c1, c2, c3 = st.columns(3)
                        c1.metric("Build Complexity", analysis.get("buildComplexity", "N/A").title())
                        c2.metric("MVP Days", analysis.get("mvpDays", "N/A"))
                        c3.metric("Market Size", analysis.get("marketSize", "N/A"))
                        
                        st.markdown(f"**Target Customer:** {analysis.get('targetCustomer', '')}")
                        st.markdown(f"**Core Innovation:** {analysis.get('coreInnovation', '')}")
                        st.markdown(f"**Moat Analysis:** {analysis.get('moatAnalysis', '')}")
                        
                        st.markdown("### The First 90 Days")
                        for milestone in analysis.get('first90Days', []):
                            st.markdown(f"- {milestone}")
                            
                        st.markdown("### Narrative Analysis")
                        st.markdown(analysis.get('narrativeAnalysis', ''))
                        
                        st.markdown("### Tags")
                        tags = analysis.get('tags', [])
                        if tags:
                            st.markdown(" ".join([f"`{t}`" for t in tags]))
                            
                    else:
                        st.error("Failed to parse JSON out of the response.")
                        st.code(full_text)
                        
                except Exception as e:
                    st.error(f"Agent error: {str(e)}")
                    st.info("Check if CEREBRAS_API_KEY is properly loaded from full-stack-web/.env.local!")
                    
        except Exception as e:
            st.error(f"Error: {str(e)}")
