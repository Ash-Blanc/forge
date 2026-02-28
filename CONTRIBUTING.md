# Contributing to FORGE

Welcome! This guide will help you get started with contributing to FORGE.

---

## What Can I Contribute?

- **Bug fixes** - Found an issue? Fix it!
- **New features** - Check [tasks.md](./tasks.md) for ideas
- **Documentation** - Improve guides, add examples
- **UI/UX improvements** - Make it look better
- **Tests** - Add tests for better coverage

---

## Development Setup

### 1. Fork & Clone

```bash
git clone https://github.com/your-username/forge.git
cd forge
```

### 2. Frontend Setup

```bash
cd full-stack-web

# Copy environment template
cp .env.local.example .env.local

# Edit .env.local with your credentials:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY  
# - ANTHROPIC_API_KEY
```

**Get Supabase keys:**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Settings → API → Copy URL and anon key

**Get Anthropic key:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 5. (Optional) Python Agent

```bash
cd full-stack-web/agents
pip install -r requirements.txt
uvicorn server:app --port 8321 --reload
```

---

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes

- Follow the code style in the project
- Use TypeScript (no plain JS)
- Use descriptive variable/function names
- Add comments for complex logic

### 3. Test Your Changes

```bash
# Lint
npm run lint

# Build (catches type errors)
npm run build
```

### 4. Commit & Push

```bash
git add .
git commit -m "Description of your changes"
git push origin your-branch-name
```

### 5. Open a Pull Request

- Describe what you changed
- Link any related issues
- Explain how to test

---

## Code Conventions

### TypeScript

```typescript
// ✅ Good - explicit types
function calculateNOVA(tam: number, complexity: number): number {
  return tam * (1 / complexity);
}

// ❌ Bad - any type
function calculateNOVA(tam: any, complexity: any): any {
  return tam * (1 / complexity);
}
```

### React Components

```typescript
// ✅ Good - clear naming, explicit props
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

### Tailwind CSS

```tsx
// ✅ Good - use design tokens
<div className="bg-surface text-text-primary border-border">

// ❌ Bad - hardcoded colors
<div className="bg-gray-900 text-white border-gray-700">
```

---

## Project Layout

```
full-stack-web/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── dashboard/        # Main dashboard
│   └── api/              # API routes
│
├── components/            # React components
│   ├── ui/               # Reusable UI (Button, Input, etc.)
│   ├── PaperCard.tsx
│   └── DetailPanel.tsx
│
├── lib/                   # Utilities
│   ├── supabase.ts       # Supabase client
│   ├── types.ts          # TypeScript types
│   └── arxiv.ts          # arXiv API helper
│
└── agents/                # Python FastAPI
    ├── server.py
    └── requirements.txt
```

---

## Common Tasks

### Add a New API Route

1. Create `app/api/your-route/route.ts`
2. Export GET/POST functions
3. Access Supabase via `@/lib/supabase`

### Add a New Component

1. Create in `components/`
2. Use TypeScript interfaces for props
3. Use Tailwind for styling
4. Export as named function

### Add a Database Table

1. Create migration in Supabase dashboard
2. Add TypeScript type in `lib/types.ts`
3. Add helper functions in appropriate lib file

---

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Be respectful and follow the code of conduct

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Anthropic Claude](https://docs.anthropic.com)
