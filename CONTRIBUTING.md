# Contributing to FORGE

Welcome! This guide will help you get started with contributing to FORGE. We follow a **Prototype-First** approach, prioritizing rapid iteration, internal dogfooding, and tight feedback loops over traditional, lengthy planning cycles.

---

##  Our Philosophy: Prototype-First

We build fast and iterate. Based on our Core Approach:

1. **Skip the PRD:** Move directly from a high-level idea to a working prototype.
2. **WIP Wednesdays:** Demo work-in-progress weekly for immediate, cross-functional feedback.
3. **Internal Dogfooding:** We ship internally and start using our own features immediately.
4. **Swarm Teams:** Small, cross-functional groups tackle major features quickly.
5. **Iterate on Real Usage:** Refine based on actual usage, not just ideas.
6. **Use Our Tools:** We use our own AI products to build FORGE faster.

---

## What Can I Contribute?

- **Bug fixes** - Found an issue? Fix it!
- **New features** - Check [tasks.md](./tasks.md) for ideas
- **Documentation** - Improve guides, add examples
- **UI/UX improvements** - Make it look better
- **Tests** - Add tests for better coverage

---

## Development Setup

Our stack is built for speed: **Bun** for frontend/web, and **uv** for Python agents.

### 1. Fork & Clone

```bash
git clone https://github.com/your-username/forge.git
cd forge
```

### 2. Frontend Setup (Next.js)

```bash
cd full-stack-web

# Copy environment template
cp .env.local.example .env.local

# Edit .env.local with your credentials:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - ANTHROPIC_API_KEY
# - AWS_REGION=us-east-1
```

**Get Supabase keys:**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project with PostgreSQL & pgvector
3. Settings → API → Copy URL and anon key

**Get API keys:**
1. Anthropic: [console.anthropic.com](https://console.anthropic.com)
2. AWS Bedrock setup for Nova-lite models

### 3. Install Dependencies & Run

We use **Bun** instead of npm.

```bash
bun install
bun run seed  # Seed sample data
bun run dev   # Starts Next.js dev server with Turbopack
```
Open http://localhost:3000

### 4. Setup Python Agents Service

We use **uv** for ultra-fast Python package management. The Next.js API expects this server to run on port 8321.

```bash
cd full-stack-web/agents

# Create virtual environment and activate
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
uv add -r requirements.txt

# Run the agent server
uv run uvicorn server:app --port 8321 --reload
```

### 5. Streamlit Prototype (Active Workspace)

For rapid feature development before migration to full-stack:
```bash
cd streamlit-prototype
uv run streamlit run app.py
```

---

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Follow Development Conventions

**Frontend (Next.js/TypeScript):**
- **Strict TypeScript:** No `any`. Always use explicit types.
- **KISS:** Keep it simple, avoid over-engineering.
- **Components:** PascalCase (e.g., `PaperCard.tsx`). Functional components with hooks.
- **Styling:** Tailwind CSS v4 utility classes.

**Backend (Python/FastAPI):**
- **PEP 8 Style**
- **Type Hints:** Required for function signatures. Use Pydantic models for validation.
- **Agents:** Built on the **Agno framework**.

### 3. Test Your Changes

```bash
cd full-stack-web
# Lint
bun run lint
# Build (catches type errors)
bun run build
```

### 4. Commit & Push

```bash
git add .
git commit -m "Description of your changes"
git push origin your-branch-name
```

### 5. Open a Pull Request

- Describe what you changed and why
- Link any related issues or WIP references
- Explain how to test
- Highlight elements for the next *WIP Wednesday*

---

## Code Conventions

### TypeScript

```typescript
//  Good - explicit types
function calculateNOVA(tam: number, complexity: number): number {
  return tam * (1 / complexity);
}

//  Bad - any type
function calculateNOVA(tam: any, complexity: any): any {
  return tam * (1 / complexity);
}
```

### React Components

```tsx
//  Good - clear naming, explicit props
interface PaperCardProps {
  title: string;
  authors: string[];
  novaScore: number;
  onClaim: () => void;
}

export function PaperCard({ title, authors, novaScore, onClaim }: PaperCardProps) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{authors.join(", ")}</p>
      <span>NOVA: {novaScore}</span>
      <button onClick={onClaim}>Claim</button>
    </div>
  );
}
```

### Tailwind CSS v4

```tsx
//  Good - modern utility tokens
<div className="bg-surface text-text-primary border-border"></div>

//  Bad - hardcoded old palettes
<div className="bg-gray-900 text-white border-gray-700"></div>
```

---

## Project Layout

```text
forge/
├── full-stack-web/        # Main Next.js application
│   ├── app/               # Next.js App Router (React 19)
│   ├── components/        # React components & UI
│   ├── lib/               # Utilities (Supabase, types)
│   ├── supabase/          # DB schema & migrations
│   └── agents/            # Python FastAPI Agent Service (Agno)
│
├── streamlit-prototype/   # Fast-iteration playground
│   ├── app.py             # Streamlit entry point
│   └── agents.py          # Agno agent configurations
│
└── docs/                  # Docs and WIP logs
```

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Agno Framework](https://docs.agno.com)
- [uv Python Manager](https://docs.astral.sh/uv/)
- [Bun](https://bun.sh)
- [Anthropic Claude](https://docs.anthropic.com)
