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
6. **Use Our Tools:** We use our own AI products (like FORGE itself) to build FORGE faster.

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
git clone https://github.com/Ash-Blanc/forge.git
cd forge
```

### 2. Web Application Setup (`forge-app/`)

```bash
cd forge-app

# Install dependencies
bun install

# Copy environment template
cp .env.local.example .env.local

# Edit .env.local with at least these variables:
# - AWS_REGION=us-east-1
# - AWS_BEARER_TOKEN_BEDROCK=...
# - NEXT_PUBLIC_SUPABASE_URL=... (Optional, for persistence)
# - NEXT_PUBLIC_SUPABASE_ANON_KEY=... (Optional, for persistence)
```

**Run Development Server:**
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 3. Python Agents Service (`forge-app/agents/`)

We use **uv** for ultra-fast Python package management. The Next.js API expects this server to run on port 8321.

```bash
cd forge-app/agents

# Setup virtual environment and install dependencies
uv sync

# Run the agent server
uv run uvicorn server:app --port 8321 --reload
```

### 4. MCP Server Setup (`mcp-server/`)

For local tool integration (Excalidraw, GitHub, etc.):

```bash
cd mcp-server
npm install
npm run build
npm run dev
```

---

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
cd forge-app
# Lint
bun run lint
# Build (catches type errors)
bun run build
# Python smoke test
cd agents && uv run python test_revamp.py
```

### 4. Commit & Push

We follow **Conventional Commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `style:`, `chore:`.

```bash
git add .
git commit -m "feat: description of your changes"
git push origin your-branch-name
```

### 5. Open a Pull Request

- Describe what you changed and why.
- Link any related issues or WIP references.
- Explain how to test (include command output if possible).
- Highlight elements for the next *WIP Wednesday*.

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

//  Bad - hardcoded old palettes or utility classes
<div className="bg-gray-900 text-white border-gray-700"></div>
```

---

## Project Layout

```text
forge/
├── forge-app/              # Next.js app + API routes + agents backend
│   ├── app/                # Next.js App Router (React 19)
│   ├── components/         # React components & UI
│   ├── lib/                # Utilities (Supabase, types)
│   ├── agents/             # Python FastAPI Agent Service (Agno)
│   └── supabase/           # DB migrations & schema
│
├── mcp-server/             # MCP server for tool integration
│   └── src/                # TypeScript server source
│
├── docs/                   # Quality gates and benchmarks
└── AGENTS.md               # Detailed agent orchestration guide
```

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Agno Framework](https://docs.agno.com)
- [uv Python Manager](https://docs.astral.sh/uv/)
- [Bun Runtime](https://bun.sh)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
