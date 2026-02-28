// app/api/papers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { hydratePaper } from "@/lib/hydrate";
import { seedIfEmpty } from "@/lib/seed";

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

export async function GET(req: NextRequest) {
    await seedIfEmpty();

    const status = req.nextUrl.searchParams.get("status");

    let query = db
        .from("papers")
        .select(PAPER_SELECT)
        .order("created_at", { ascending: false });

    if (status && status !== "all") {
        query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data ?? []).map(hydratePaper));
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { arxivId, userId, userName, userRole, meta, analysis } = body;

    if (!userId || !meta || !analysis) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upsert user
    await db.from("users").upsert(
        { id: userId, name: userName ?? "Anonymous", role: userRole ?? "researcher" },
        { onConflict: "id", ignoreDuplicates: true }
    );

    const { data: paper, error } = await db
        .from("papers")
        .insert({
            arxiv_id: arxivId ?? "manual",
            title: meta.title,
            abstract: meta.abstract,
            authors: meta.authors ?? [],
            published: meta.published ?? "",
            submitted_by_id: userId,
            opportunity: analysis.startupIdea?.oneLiner ?? null,
            core_innovation: analysis.paperAnalysis?.coreBreakthrough ?? null,
            target_customer: analysis.startupIdea?.targetUser?.persona ?? null,
            market_size: "Unknown", // Temporarily mapped out or can be replaced later
            build_complexity: analysis.startupIdea?.metrics?.competition ?? null,
            mvp_days: analysis.startupIdea?.metrics?.mvpMonths ? analysis.startupIdea.metrics.mvpMonths * 30 : null,
            moat_analysis: analysis.startupIdea?.product?.differentiation ?? null,
            tags: analysis.paperAnalysis?.applications ?? [],
            first_90_days: [], // Dropped in new schema
            narrative_analysis: analysis.paperAnalysis?.summary ?? null,
        })
        .select(PAPER_SELECT)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(hydratePaper(paper), { status: 201 });
}