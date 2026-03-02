import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/supabase";

const MODES = new Set(["paper", "saas", "constellation"]);

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const localSessions = Array.isArray(body?.sessions) ? body.sessions : [];
    if (!localSessions.length) {
        return NextResponse.json({ migrated: 0 });
    }

    const rows = localSessions
        .map((s: any) => {
            const mode = String(s?.mode ?? "").trim();
            const title = String(s?.title ?? "").trim();
            if (!MODES.has(mode) || !title) return null;
            return {
                user_id: userId,
                mode,
                title,
                input_text: s?.inputText ?? null,
                arxiv_id: s?.arxivId ?? null,
                meta: s?.meta ?? null,
                output: s?.data?.output ?? null,
                output_text: s?.data?.outputText ?? null,
                error: s?.error ?? null,
                created_at: s?.timestamp ?? undefined,
            };
        })
        .filter(Boolean);

    if (!rows.length) return NextResponse.json({ migrated: 0 });

    const { error } = await db.from("analysis_sessions").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ migrated: rows.length });
}
