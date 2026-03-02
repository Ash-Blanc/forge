import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing session id" }, { status: 400 });

    const body = await req.json();
    const patch: Record<string, unknown> = {};

    if (typeof body.title === "string") patch.title = body.title.trim();
    if (body.inputText !== undefined) patch.input_text = body.inputText;
    if (body.arxivId !== undefined) patch.arxiv_id = body.arxivId;
    if (body.meta !== undefined) patch.meta = body.meta;
    if (body.output !== undefined) patch.output = body.output;
    if (body.outputText !== undefined) patch.output_text = body.outputText;
    if (body.error !== undefined) patch.error = body.error;

    if (!Object.keys(patch).length) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await db
        .from("analysis_sessions")
        .update(patch)
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing session id" }, { status: 400 });

    const { error } = await db
        .from("analysis_sessions")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return new NextResponse(null, { status: 204 });
}
