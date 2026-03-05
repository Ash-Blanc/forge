import { NextRequest } from "next/server";
import { proxyStreamWithRetry } from "@/lib/ai/stream-proxy";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const body = await req.json();

    if (!body.idea) {
        return new Response(JSON.stringify({ error: "Idea description required" }), { status: 400 });
    }

    const prompt = `Analyze the competitive moat and defensibility for the following SaaS idea:

"${body.idea.trim()}"

Your task:
1. Use your search tools to find 3-5 existing direct competitors.
2. Analyze what features or technologies they are currently missing.
3. Recommend how this new SaaS idea can establish a unique "moat" (e.g., proprietary dataset, deep tech advantage, network effects).
4. Explain how hard it would be for the existing competitors to replicate this moat.

Return your analysis in a structured markdown overview.`;

    try {
        return await proxyStreamWithRetry({
            agentId: "market-strategist",
            message: prompt,
            route: "/api/moat-analysis",
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
