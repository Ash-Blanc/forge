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
