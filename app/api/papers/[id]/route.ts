// app/api/papers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { hydratePaper } from "@/lib/hydrate";

const PAPER_SELECT = `
  *,
  submitted_by:users!submitted_by_id ( id, name, role ),
  followers:following ( user_id, user:users!user_id ( name, role ) ),
  claims (
    id, user_id, status, created_at,
    user:users!user_id ( name, role ),
    updates:build_updates ( id, text, created_at )
  ),
  comments (
    id, text, created_at,
    user:users!user_id ( id, name, role )
  )
` as const;

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const { data, error } = await db
        .from("papers")
        .select(PAPER_SELECT)
        .eq("id", id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(hydratePaper(data));
}