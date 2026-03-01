# Repository Guidelines

## Project Structure & Module Organization
FORGE is organized into two active apps and shared docs:
- `full-stack-web/`: Main Next.js 16 + React 19 product (App Router).
  - `app/` routes and API handlers (`app/api/*/route.ts`)
  - `components/` UI components
  - `lib/` typed utilities (Supabase clients, domain types)
  - `agents/` FastAPI service used by `/api/analyze`
- `streamlit-prototype/`: Experimental Python UI for rapid prompt and workflow iteration.
- `docs/`: project docs and archived planning material.

## Build, Test, and Development Commands
Primary workflow uses Bun for web and `uv` for Python.

```bash
cd full-stack-web
bun install
bun run dev      # Next.js dev server on :3000
bun run build    # production build + type checks
bun run lint     # ESLint (Next core-web-vitals + TS)
bun run seed     # POST /api/seed
```

```bash
cd full-stack-web/agents
uv venv && source .venv/bin/activate
uv add -r requirements.txt
uv run uvicorn server:app --port 8321 --reload
```

```bash
cd streamlit-prototype
uv run streamlit run app.py
```

## Coding Style & Naming Conventions
- TypeScript is strict (`tsconfig.json` has `"strict": true`); avoid `any`.
- Use 4-space indentation and semicolon-terminated TS statements to match existing files.
- Components: `PascalCase.tsx` (example: `PaperCard.tsx`); helpers/lib files: `camelCase` or domain names (example: `supabase.ts`).
- Use `@/*` import alias for app-internal imports in `full-stack-web`.
- Run `bun run lint` before opening a PR.

## Testing Guidelines
There is no centralized test suite yet. Current checks are:
- Web quality gate: `bun run lint` and `bun run build`
- Python smoke scripts: `python full-stack-web/test_bedrock.py`, `python full-stack-web/test_openai.py`, and scripts in `full-stack-web/agents/test_*.py`

When adding tests, keep names `test_<feature>.py` (Python) or `<feature>.test.ts(x)` (web), and place them near the code they validate.

## Commit & Pull Request Guidelines
Follow Conventional Commit style seen in history: `feat:`, `fix:`, `docs:`, `refactor:`, `style:`, `chore:`.
- Example: `feat: add streaming fallback for analyze route`
- Keep commits focused and scoped to one concern.

PRs should include:
- clear summary of behavior changes,
- linked issue/task (`tasks.md` item or GitHub issue),
- local verification steps run (`lint`, `build`, smoke script),
- screenshots for UI changes (dashboard/feed/Streamlit views).

## Security & Configuration Tips
- Never commit `.env*` files or API keys.
- Required local vars live in `full-stack-web/.env.local` and `streamlit-prototype/.env`.
- Treat `NEXT_PUBLIC_*` as client-visible; do not store secrets in those variables.
