// app/api/social/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { action, paperId, userId, userName, userRole } = body;

    if (!action || !paperId || !userId) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Ensure user exists
    if (userName) {
        await db.from("users").upsert(
            { id: userId, name: userName, role: userRole ?? "researcher" },
            { onConflict: "id", ignoreDuplicates: true }
        );
    }

    // ── FOLLOW TOGGLE ─────────────────────────────────────────
    if (action === "follow") {
        const { data: existing } = await db
            .from("following")
            .select("id")
            .eq("user_id", userId)
            .eq("paper_id", paperId)
            .maybeSingle();

        if (existing) {
            await db.from("following").delete()
                .eq("user_id", userId).eq("paper_id", paperId);
            return NextResponse.json({ following: false });
        } else {
            await db.from("following").insert({ user_id: userId, paper_id: paperId });
            return NextResponse.json({ following: true });
        }
    }

    // ── CLAIM ─────────────────────────────────────────────────
    if (action === "claim") {
        const { data: paper } = await db
            .from("papers")
            .select("status")
            .eq("id", paperId)
            .single();

        if (!paper) return NextResponse.json({ error: "Paper not found" }, { status: 404 });
        if (paper.status !== "open") return NextResponse.json({ error: "Already claimed" }, { status: 409 });

        const { data: claim, error } = await db
            .from("claims")
            .insert({ paper_id: paperId, user_id: userId, status: "building" })
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await db.from("papers").update({ status: "building" }).eq("id", paperId);
        return NextResponse.json({ claim });
    }

    // ── COMMENT ───────────────────────────────────────────────
    if (action === "comment") {
        const { text } = body;
        if (!text?.trim()) return NextResponse.json({ error: "Empty comment" }, { status: 400 });

        const { data: comment, error } = await db
            .from("comments")
            .insert({ paper_id: paperId, user_id: userId, text: text.trim() })
            .select("id, text, created_at, user:users!user_id ( id, name, role )")
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ comment });
    }

    // ── BUILD UPDATE ──────────────────────────────────────────
    if (action === "buildUpdate") {
        const { text } = body;
        if (!text?.trim()) return NextResponse.json({ error: "Empty update" }, { status: 400 });

        const { data: claim } = await db
            .from("claims")
            .select("id")
            .eq("paper_id", paperId)
            .eq("user_id", userId)
            .maybeSingle();

        if (!claim) return NextResponse.json({ error: "You haven't claimed this paper" }, { status: 403 });

        const { data: update, error } = await db
            .from("build_updates")
            .insert({ claim_id: claim.id, user_id: userId, text: text.trim() })
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ update });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}