# Repository Guidelines

## Project Structure & Module Organization
- `forge-app/`: Next.js 16 frontend (App Router, React 19, TypeScript, Tailwind v4).
- `forge-app/app/api/*/route.ts`: API proxy routes forwarding requests to the agent backend.
- `forge-app/agents/`: FastAPI + Agno orchestration (`server.py`, `workflow.py`, smoke tests).
- `mcp-server/`: MCP tooling and integration code.
- `docs/`: architecture notes, migrations, and evaluation docs.
- `ai-chats/`: research/chat artifacts. `test_obsidian/`: local MCP sandbox.

## Build, Test, and Development Commands
- Frontend setup: `cd forge-app && bun install`
- Frontend dev: `bun run dev` (serves on `http://localhost:3000`)
- Frontend checks: `bun run lint` and `bun run build`
- Seed app data: `bun run seed`
- Agent setup: `cd forge-app/agents && uv sync`
- Agent run: `uv run uvicorn server:app --port 8321 --reload`
- Smoke test: `uv run python test_revamp.py`

## Coding Style & Naming Conventions
- TypeScript is strict; prefer explicit types and small focused components.
- Use `@/` import aliases for app modules (example: `@/lib/supabase`).
- Naming: components `PascalCase.tsx`, hooks `useX`, utilities `kebab-case.ts`.
- Python: PEP 8, type hints, and Pydantic models for request/response validation.
- Styling: Tailwind utilities first; inline styles only for truly dynamic values.

## Testing Guidelines
- Frontend quality gate is `lint` + `build`; run both before opening a PR.
- Backend validation uses `forge-app/agents/test_revamp.py` smoke flows.
- Add focused tests near changed code when practical, especially for workflow and API logic.

## Commit & Pull Request Guidelines
- Follow Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- Keep commits atomic and avoid unrelated cleanup.
- PRs should include: clear summary, linked issue (if any), verification steps run, and screenshots for UI changes.

## Security & Configuration Tips
- Configure secrets in `forge-app/.env.local` (AWS Bedrock, Supabase).
- Use a Supabase service role key for server-side operations.
- Never commit secrets; verify `.env*` values locally before seeding or migrations.
