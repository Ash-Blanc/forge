# Repo Split Strategy

## Initial User Query
**User:**  
Tell me the best practices regarding splitting a full stack ai webapp project startup kinda and hackathon oriented into frontend and (agentic) backend repo(s) this is the target repo: https://github.com/Ash-Blanc/forge

## Kimi's First Response

I’ll analyze the target repository to understand its current structure and provide tailored advice on splitting it into frontend and agentic backend components. Based on your Forge project structure and your background with MathNeuro + DSPy + GEPA + LeanDojo agentic systems, here are the best practices for splitting this into dedicated frontend and backend repositories:

### Current State Analysis
Your repo currently uses a monolithic approach with Next.js 16 + FastAPI agents co-located in forge-app/. This is actually fine for hackathons, but for a startup/scale trajectory, separation makes sense.

### Recommended Architecture: Split Repo Strategy

#### Repo 1: forge-frontend (Next.js 16)
```
forge-frontend/
├── app/                    # Next.js App Router
├── components/             # React 19 + Tailwind v4 UI
├── lib/
│   ├── api-client.ts       # Typed API client to backend
│   └── streaming.ts        # SSE/WebSocket streaming handlers
├── hooks/
│   └── useAnalysis.ts      # Real-time analysis streaming
└── types/
    └── api.ts              # Shared types (or auto-generated from OpenAPI)
```

#### Repo 2: forge-agentic-backend (FastAPI + Agno)
```
forge-agentic-backend/
├── app/
│   ├── main.py             # FastAPI entry
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── base.py         # Base agent class
│   │   ├── paper_analyzer.py
│   │   └── blueprint_generator.py
│   ├── workflows/          # Multi-agent orchestration
│   │   └── research_to_saas.py
│   └── api/
│       ├── routes/
│       │   ├── analysis.py
│       │   └── sessions.py
│       └── dependencies.py
├── core/
│   ├── config.py
│   └── exceptions.py
├── models/                 # Pydantic schemas
└── tests/
```

### Critical Best Practices for Your Stack

1. **API Contract-First Development**  
   Given your DSPy + GEPA background, define agent outputs as strict Pydantic models:  
   ```python
   # forge-agentic-backend/models/analysis.py
   from pydantic import BaseModel
   from typing import Literal

   class AnalysisStep(BaseModel):
       step_type: Literal["ingestion", "math_validation", "blueprint_gen"]
       status: Literal["running", "complete", "error"]
       output: str | None
       # For your MathNeuro integration later:
       formal_proof_status: bool | None = None  
       
   class SaaSBlueprint(BaseModel):
       architecture: dict
       api_spec: OpenAPISpec  # Auto-generated
       math_validated: bool   # LeanDojo integration point
   ```  
   Generate TypeScript types automatically:  
   ```bash
   # In frontend CI/CD
   openapi-typescript http://backend:8000/openapi.json -o src/types/api.ts
   ```

2. **Streaming Architecture for Agent Chains**  
   Your Agno agents likely stream reasoning steps. Use SSE (Server-Sent Events) instead of WebSockets for simpler infra:  
   ```typescript
   // forge-frontend/lib/streaming.ts
   export async function* streamAnalysis(paperId: string) {
     const response = await fetch('/api/analyze', {
       method: 'POST',
       body: JSON.stringify({ paperId }),
       headers: { 'Accept': 'text/event-stream' }
     });
     
     const reader = response.body?.getReader();
     while (true) {
       const { done, value } = await reader!.read();
       if (done) break;
       yield parseAgentChunk(value); // Your GEPA step outputs
     }
   }
   ```

3. **MathNeuro/LeanDojo Integration Path**  
   Since you plan to integrate LeanDojo-v2 for formal verification, isolate this in the backend:  
   ```python
   # forge-agentic-backend/app/agents/math_validator.py
   from leandojo import LeanEnv
   from dspy import Module  # Your GEPA modules

   class FormalMathAgent:
       def __init__(self):
           self.lean = LeanEnv()
           self.gepa_optimizer = GEPAPromptOptimizer()
       
       async def verify_blueprint(self, blueprint: dict) -> ProofResult:
           # Convert blueprint to Lean theorems
           formal_spec = self.gepa_optimizer.generate_formal_spec(blueprint)
           return await self.lean.verify(formal_spec)
   ```

4. **Shared Package for Types (Optional but Recommended)**  
   For rapid hackathon iteration, publish a private npm/PyPI package:  
   ```
   forge-types/          # Separate repo or workspace
   ├── typescript/       # npm package
   └── python/           # PyPI package
   ```  
   Or use Git submodules for zero-latency updates during intense dev periods.

5. **Environment Strategy**

   | Environment | Frontend          | Backend              |
   |-------------|-------------------|----------------------|
   | Local      | localhost:3000   | localhost:8321      |
   | Preview (Vercel) | Auto-deploy | Render/Fly.io       |
   | Prod       | Vercel           | AWS ECS/Fargate     |

   Use ngrok or localtunnel for mobile testing during hackathons:  
   ```bash
   # In backend repo
   lt --port 8321 --subdomain forge-agents-dev
   ```

6. **Docker Compose for Local Dev**  
   Create a root docker-compose.yml that mounts both repos:  
   ```yaml
   # In a new forge-dev/ orchestration repo
   version: '3.8'
   services:
     frontend:
       build: ../forge-frontend
       ports: ["3000:3000"]
       env_file: .env.frontend
     
     backend:
       build: ../forge-agentic-backend
       ports: ["8321:8321"]
       env_file: .env.backend
       volumes:
         - ../forge-agentic-backend:/app  # Hot reload for Agno agents
   ```

### Migration Path from Current Structure

- **Immediate (Hackathon mode):** Keep monorepo, but enforce boundaries:  
  Move forge-app/agents/ to root level agents/  
  Create strict agents/ → forge-app/ import ban via ESLint

- **Short-term (Post-hackathon):**  
  ```bash
  # Filter-branch to preserve git history
  git filter-branch --subdirectory-filter forge-app/agents -- --all
  # Push to new forge-agentic-backend repo
  ```

- **Integration (MathNeuro phase):**  
  Add forge-agentic-backend/integrations/mathneuro/  
  Keep DSPy/GEPA logic isolated from FastAPI routes

### Key Decisions for Your Specific Context

| Decision       | Recommendation                          | Rationale                          |
|----------------|-----------------------------------------|------------------------------------|
| Auth           | Supabase Auth in frontend, JWT verification in backend | You already use Supabase          |
| File uploads   | Direct to S3 from frontend, signed URLs | Avoids backend bandwidth          |
| Agent state    | Redis (Upstash) for session management  | Survives backend restarts         |
| Math rendering | KaTeX in frontend, LaTeX generation in backend | Lean proofs need display          |

Given your AIMO3/MathNeuro ambitions, the separated backend will let you:  
- Scale agent workers independently (Celery + Redis)  
- Swap Agno for raw DSPy when GEPA optimization requires it  
- Run LeanDojo in isolated containers (heavy dependencies)  

Want me to elaborate on the DSPy + GEPA integration patterns or the LeanDojo-v2 containerization strategy specifically?

## User's Follow-up
**User:**  
No dspy needed nor gepa nor anything from history

## Kimi's Second Response

Got it, ignoring the historical context. Here are the clean, best practices for splitting your Forge project into frontend and agentic backend repos:

### Architecture Decision: Split Repos

#### Repo 1: forge-frontend
```
forge-frontend/
├── app/                    # Next.js 16 App Router
├── components/             # React 19 + Tailwind v4
├── lib/
│   ├── api/
│   │   ├── client.ts       # Typed fetch wrapper
│   │   └── streaming.ts    # SSE handler for agent output
│   └── utils/
├── hooks/
│   └── useAnalysis.ts      # Real-time analysis state
├── types/
│   └── api.ts              # Generated from backend OpenAPI
└── public/
```

#### Repo 2: forge-backend
```
forge-backend/
├── app/
│   ├── main.py             # FastAPI entry
│   ├── agents/             # Agno agent definitions
│   │   ├── paper_analyzer.py
│   │   └── blueprint_generator.py
│   ├── api/
│   │   ├── routes/
│   │   │   ├── analysis.py
│   │   │   └── sessions.py
│   │   └── dependencies.py
│   └── core/
│       ├── config.py
│       └── exceptions.py
├── models/                 # Pydantic schemas
├── services/               # Business logic layer
└── tests/
```

### Critical Integration Patterns

1. **API Contract First**  
   Define Pydantic models in backend, generate TypeScript types:  
   ```python
   # backend/models/analysis.py
   class AnalysisStreamChunk(BaseModel):
       step: Literal["ingestion", "analysis", "blueprint"]
       content: str
       timestamp: datetime
       done: bool = False
   ```  
   ```bash
   # frontend CI
   openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts
   ```

2. **Streaming Protocol**  
   Use SSE for agent output (simpler than WebSockets):  
   ```typescript
   // frontend/lib/api/streaming.ts
   export function streamAnalysis(paperId: string) {
     return new EventSource(`/api/analysis/${paperId}/stream`);
   }
   ```  
   ```python
   # backend/api/routes/analysis.py
   from fastapi.responses import StreamingResponse

   async def analysis_generator(paper_id: str):
       async for chunk in agent.run_stream(paper_id):
           yield f"data: {chunk.json()}\n\n"

   @router.get("/{paper_id}/stream")
   async def stream(paper_id: str):
       return StreamingResponse(
           analysis_generator(paper_id),
           media_type="text/event-stream"
       )
   ```

3. **Environment Management**

   | Frontend                  | Backend                  |
   |---------------------------|--------------------------|
   | Local: bun dev → localhost:3000 | uv run uvicorn → localhost:8000 |
   | Staging: Vercel Preview   | Render/Fly.io            |
   | Prod: Vercel              | AWS ECS/GCP Cloud Run    |

   Use CORS properly:  
   ```python
   # backend/main.py
   app.add_middleware(
       CORSMiddleware,
       allow_origins=[os.getenv("FRONTEND_URL")],  # Not "*"
       allow_credentials=True,
   )
   ```

4. **Shared Development Workflow**  
   Create a third repo for local orchestration:  
   ```
   forge-dev/
   ├── docker-compose.yml      # Mounts both repos
   ├── .env.frontend
   └── .env.backend
   ```  
   ```yaml
   # docker-compose.yml
   services:
     frontend:
       build: ../forge-frontend
       ports: ["3000:3000"]
       env_file: .env.frontend
     
     backend:
       build: ../forge-backend
       ports: ["8000:8000"]
       volumes: ["../forge-backend:/app"]  # Hot reload
       env_file: .env.backend
   ```

### Migration Steps from Current Mono-Repo
Preserve git history when splitting:  
```bash
# Extract backend
git clone forge/ forge-backend
cd forge-backend
git filter-branch --subdirectory-filter forge-app/agents -- --all

# Extract frontend  
git clone forge/ forge-frontend
cd forge-frontend
git filter-branch --subdirectory-filter forge-app -- --all
rm -rf agents/
```

Update imports in frontend to use absolute API URL:  
```typescript
// Before (mono-repo)
const res = await fetch('/api/agents/...')  # Next.js API route

// After (split)
const res = await fetch(`${process.env.BACKEND_URL}/agents/...`)
```

### Key Technical Decisions

| Concern      | Decision                          | Reason                  |
|--------------|-----------------------------------|-------------------------|
| Auth         | Supabase JWT in frontend, verify in backend | You already use Supabase |
| File uploads | Direct S3 from frontend           | Bypasses backend bandwidth |
| Agent state  | Redis (Upstash)                   | Persist sessions across deploys |
| Deployment   | Vercel (frontend) + Fly.io (backend) | Fastest for hackathons |

### Anti-Patterns to Avoid
- ❌ Don’t share a database directly—use API boundaries  
- ❌ Don’t put business logic in frontend API routes  
- ❌ Don’t use WebSockets unless you need bidirectional (SSE is simpler)  
- ❌ Don’t commit .env files—use 1Password or Doppler  

Want specific details on deployment configs or Agno agent patterns?

## User's Second Follow-up
**User:**  
So three things in backend, clerk supabase and inngest and agno?

## Kimi's Third Response

Yes, that stack works well. Here’s how to structure Clerk + Supabase + Inngest + Agno in your backend:

### Architecture Overview
```
forge-backend/
├── app/
│   ├── main.py
│   ├── agents/              # Agno agents
│   ├── api/
│   │   ├── deps.py          # Clerk auth, Supabase client injection
│   │   └── routes/
│   ├── inngest/
│   │   ├── client.py        # Inngest client setup
│   │   └── functions/       # Background jobs
│   └── core/
│       └── config.py
├── lib/
│   ├── clerk.py             # Clerk JWT verification
│   ├── supabase.py          # Supabase client
│   └── inngest_client.py    # Shared Inngest instance
└── models/
```

### 1. Clerk (Auth)
```python
# lib/clerk.py
from clerk_backend_api import Clerk
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()
clerk = Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY"))

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        # Verify JWT
        session = clerk.sessions.get(session_id=credentials.credentials)
        return session.user_id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# Usage in routes
@app.get("/analysis")
async def list_analysis(user_id: str = Depends(get_current_user)):
    ...
```

### 2. Supabase (Data)
```python
# lib/supabase.py
from supabase import create_client, Client

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")  # Service role for backend
)

async def get_user_sessions(user_id: str):
    return supabase.table("analysis_sessions")\
        .select("*")\
        .eq("user_id", user_id)\
        .execute()
```

### 3. Inngest (Background Jobs)
```python
# lib/inngest_client.py
import inngest

inngest_client = inngest.Inngest(
    app_id="forge-backend",
    event_key=os.getenv("INNGEST_EVENT_KEY"),
)

# app/inngest/functions/analyze_paper.py
from lib.inngest_client import inngest_client

@inngest_client.create_function(
    fn_id="analyze-paper",
    trigger=inngest.TriggerEvent(event="paper.submitted"),
)
async def analyze_paper(ctx: inngest.Context, step: inngest.Step):
    paper_id = ctx.event.data["paper_id"]
    user_id = ctx.event.data["user_id"]
    
    # Long-running Agno agent work
    result = await step.run("run-agent", lambda: run_agno_agent(paper_id))
    
    # Save to Supabase
    await step.run("save-result", lambda: save_to_supabase(user_id, result))
    
    return {"done": True}
```  
```python
# app/main.py
from inngest.fast_io import serve
from lib.inngest_client import inngest_client
from app.inngest.functions import analyze_paper  # Register functions

app = FastAPI()
serve(app, inngest_client, [analyze_paper])
```

### 4. Agno (Agents)
```python
# app/agents/paper_analyzer.py
from agno.agent import Agent
from agno.models.aws import AwsBedrock

agent = Agent(
    model=AwsBedrock(id="anthropic.claude-3-5-sonnet-20241022-v2:0"),
    description="Analyze research papers and generate SaaS blueprints",
    markdown=True,
)

async def analyze(paper_text: str) -> str:
    return await agent.arun(f"Analyze this paper: {paper_text}")
```

### Wiring It All Together
```python
# app/api/routes/analysis.py
from fastapi import APIRouter, Depends
from lib.clerk import get_current_user
from lib.supabase import supabase
from lib.inngest_client import inngest_client
from app.agents.paper_analyzer import analyze

router = APIRouter()

@router.post("/analyze")
async def start_analysis(
    paper_url: str,
    user_id: str = Depends(get_current_user)
):
    # 1. Save session to Supabase
    session = supabase.table("analysis_sessions").insert({
        "user_id": user_id,
        "paper_url": paper_url,
        "status": "queued"
    }).execute()
    
    # 2. Trigger background job via Inngest
    await inngest_client.send(
        inngest.Event(
            name="paper.submitted",
            data={"paper_url": paper_url, "user_id": user_id, "session_id": session.data[0]["id"]}
        )
    )
    
    return {"session_id": session.data[0]["id"], "status": "queued"}

@router.get("/analysis/{session_id}")
async def get_status(session_id: str, user_id: str = Depends(get_current_user)):
    # Verify ownership via Clerk user_id
    result = supabase.table("analysis_sessions")\
        .select("*")\
        .eq("id", session_id)\
        .eq("user_id", user_id)\
        .single()\
        .execute()
    return result.data
```

### Environment Variables
- **Clerk**  
  `CLERK_SECRET_KEY=sk_test_...`  
  `CLERK_PUBLISHABLE_KEY=pk_test_...`

- **Supabase**  
  `SUPABASE_URL=https://...`  
  `SUPABASE_SERVICE_KEY=eyJ...`  # Service role, not anon

- **Inngest**  
  `INNGEST_EVENT_KEY=...`  
  `INNGEST_SIGNING_KEY=...`

- **AWS Bedrock (for Agno)**  
  `AWS_ACCESS_KEY_ID=...`  
  `AWS_SECRET_ACCESS_KEY=...`  
  `AWS_REGION=us-east-1`

### Data Flow
```
User → Clerk JWT → FastAPI → Inngest (queue) → Agno Agent → Supabase
              ↓
        Immediate response: {session_id, status: "queued"}
              
User polls/waits for SSE → Supabase ← Inngest (updates status + result)
```

### Frontend Integration
```typescript
// Start analysis
const start = await fetch('/api/analyze', {
  headers: { Authorization: `Bearer ${await clerk.session.getToken()}` },
  method: 'POST',
  body: JSON.stringify({ paperUrl })
});

// Poll for results (or use Inngest's realtime)
const poll = setInterval(async () => {
  const status = await fetch(`/api/analysis/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (status.done) clearInterval(poll);
}, 2000);
```

### Key Decisions

| Component | Role                              | Why                                      |
|-----------|-----------------------------------|------------------------------------------|
| Clerk     | Auth layer                        | Handles JWT, sessions, user management   |
| Supabase  | Persistence                       | Postgres + realtime subscriptions        |
| Inngest   | Job queue                         | Retries, concurrency, scheduling         |
| Agno      | Agent runtime                     | Bedrock integration, streaming           |

This keeps concerns separated: Clerk never touches your data, Supabase doesn’t handle auth logic, Inngest manages complexity of long-running agents.  

Need the Docker setup or deployment configs for this stack?