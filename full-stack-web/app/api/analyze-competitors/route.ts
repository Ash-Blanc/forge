// app/api/analyze-competitors/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const body = await req.json();

    if (!body.ideaContext) {
        return new Response(JSON.stringify({ error: "ideaContext required" }), { status: 400 });
    }

    try {
        const agnoRes = await fetch("http://127.0.0.1:8321/analyze-competitors", {
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
