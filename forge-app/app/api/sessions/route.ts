import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/supabase";

const MODES = new Set(["paper", "saas", "constellation"]);

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await db
        .from("analysis_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(250);

    if (error) {
        console.error("Supabase error (GET /api/sessions):", error);
        let msg = error.message;
        if (msg.includes("cache")) {
            msg = "The 'analysis_sessions' table is missing from your database. Please run the migration found in 'supabase/migrations/'.";
        }
        return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const mode = String(body.mode ?? "").trim();
    const title = String(body.title ?? "").trim();

    if (!MODES.has(mode)) {
        return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }
    if (!title) {
        return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const insertPayload = {
        user_id: userId,
        mode,
        title,
        input_text: body.inputText ?? null,
        arxiv_id: body.arxivId ?? null,
        meta: body.meta ?? null,
        output: body.output ?? null,
        output_text: body.outputText ?? null,
        error: body.error ?? null,
    };

    const { data, error } = await db
        .from("analysis_sessions")
        .insert(insertPayload)
        .select("*")
        .single();

    if (error) {
        console.error("Supabase error (POST /api/sessions):", error);
        let msg = error.message;
        if (msg.includes("cache")) {
            msg = "The 'analysis_sessions' table is missing from your database. Please run the migration found in 'supabase/migrations/'.";
        }
        return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
}
