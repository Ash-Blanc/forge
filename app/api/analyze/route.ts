// app/api/analyze/route.ts
import { NextRequest } from "next/server";
import type { ArxivMeta } from "@/lib/arxiv";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const body: ArxivMeta = await req.json();
    if (!body.title || !body.abstract) {
        return new Response(JSON.stringify({ error: "title and abstract required" }), { status: 400 });
    }

    try {
        const agnoRes = await fetch("http://127.0.0.1:8321/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!agnoRes.ok) {
            return new Response(JSON.stringify({ error: "Agno agent failed" }), { status: 500 });
        }

        return new Response(agnoRes.body, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}