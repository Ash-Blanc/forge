// lib/supabase.ts
// Server-only client — uses service role key, never exposed to browser.
// Import this only in app/api/** route handlers.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY — check .env.local"
    );
}

// Single shared instance (safe: server components are stateless)
export const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Types mirroring Supabase rows ────────────────────────────
export type DBUser = {
    id: string;
    name: string;
    role: string;
    bio: string | null;
    created_at: string;
};

export type DBPaper = {
    id: string;
    arxiv_id: string;
    title: string;
    abstract: string;
    authors: string[];
    published: string;
    status: string;
    opportunity: string | null;
    core_innovation: string | null;
    target_customer: string | null;
    market_size: string | null;
    build_complexity: string | null;
    mvp_days: number | null;
    moat_analysis: string | null;
    tags: string[];
    first_90_days: string[];
    narrative_analysis: string | null;
    submitted_by_id: string;
    created_at: string;
};