import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fallbackAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const key = serviceRoleKey || fallbackAnonKey;

if (!url || !key) {
    throw new Error(
        "Missing Supabase credentials. Expected NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon fallback)."
    );
}

// Check for common misconfigurations
if (key.startsWith("sb_publishable_")) {
    console.warn("⚠️ SUPABASE_KEY starts with 'sb_publishable_'. This looks like a Stripe key, not a Supabase key. Expected a JWT (ey...).");
} else if (!key.startsWith("ey")) {
    console.warn("⚠️ SUPABASE_KEY does not start with 'ey'. Supabase keys are typically JWTs.");
}

export const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Types mirroring Supabase rows ────────────────────────────
export type DBUser = {
    id: string; // legacy app user id; for Clerk use clerk_user_id when available
    clerk_user_id: string | null;
    name: string;
    role: string | null;
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

export type DBAnalysisSession = {
    id: string;
    user_id: string;
    mode: "paper" | "saas" | "constellation";
    title: string;
    input_text: string | null;
    arxiv_id: string | null;
    meta: Record<string, unknown> | null;
    output: Record<string, unknown> | string | null;
    output_text: string | null;
    error: string | null;
    created_at: string;
    updated_at: string;
};
