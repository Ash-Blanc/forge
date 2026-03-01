# 📋 FORGE: Task Tracker

Development tasks for FORGE — an AI platform that distills arXiv papers into actionable SaaS opportunities.

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `bun run dev` | Frontend (localhost:3000) |
| `cd agents && uv run uvicorn server:app --port 8321 --reload` | Python Agent API |
| `bun run lint` | Lint frontend |
| `bun run build` | Production build |

---

## 🚧 In Progress

- [ ] Connect Supabase PgVector for persistent long-term memory across analysis sessions
- [ ] Implement multi-user workspace sharing for generated theses
- [ ] User onboarding flow refinements

---

## 📋 To Do

### Frontend (`full-stack-web/app/`)

**Features**
- [ ] User profiles hub
- [ ] Advanced result filtering (by NOVA score, market size)
- [ ] Workspace/Project grouping for multiple papers

### Backend (`full-stack-web/agents/`)

- [ ] Auth integration for protected agents
- [ ] Rate limiting (Amazon Bedrock quotas)
- [ ] Semantic index retrieval for "Similar Ideas" feature

### Database (`Supabase`)

- [ ] Users table
- [ ] RLS policies refinement

---

## ✅ Done

### Full-Stack Migration (Parity with Prototype)
- [x] **Streamlit Deprecation**: Safely removed `streamlit-prototype/` and consolidated logic.
- [x] **Constellation Mode**: Added synthesis of 2-10 related papers into a single thesis.
- [x] **Streaming UI**: Live thought-process display during agent generation.
- [x] **Robust JSON Parsing**: Implemented multi-strategy parsing with LLM-powered repair.
- [x] **Agent Prompts**: Migrated all refined prompts and technical scrutiny logic to FastAPI.

### Foundation
- [x] Next.js 16 setup with Tailwind CSS v4
- [x] Supabase client configuration
- [x] arXiv API + Semantic Scholar integration
- [x] Python FastAPI agent service with Agno framework

### Dashboard & Core Features
- [x] Paper distillation flow (One paper -> One credible thesis)
- [x] Multi-path commercialization (Platform vs Feature vs API/Plugin)
- [x] NOVA Feasibility Scoring logic
- [x] Competitor Research agent integration

---

## Priority Order

### High
1. Paper submission flow (arXiv → analyze → display)
2. Dashboard with paper feed
3. NOVA score display

### Medium
4. Claim & build tracking
5. User authentication
6. Build updates/comments

### Low
7. Social features (follow, share)
8. Advanced filtering
9. Export options

---

## Testing

Not yet configured. To add:

```bash
# Frontend
bun add -d vitest @testing-library/react

# Python
uv add pytest
```

---

## Notes

- Run both frontend (`bun run dev`) and agent (`uv run uvicorn server:app --port 8321`)
- Use `bun run lint` and `bun run build` before committing
- Check `.env.local` for required environment variables
