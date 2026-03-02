// app/api/arxiv/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchArxivMeta } from "@/lib/arxiv";

export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    try {
        const meta = await fetchArxivMeta(id);
        return NextResponse.json(meta);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to fetch arXiv paper";
        return NextResponse.json({ error: msg }, { status: 422 });
    }
}