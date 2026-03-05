import { NextRequest } from "next/server";
import { proxyStreamWithRetry } from "@/lib/ai/stream-proxy";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const body = await req.json();

    if (!body.idea) {
        return new Response(JSON.stringify({ error: "Idea is required" }), { status: 400 });
    }

    const prompt = `I have the following concept or idea for a SaaS product:

"${body.idea.trim()}"

Your task:
1. Use DuckDuckGo or your search tools to perform a fast web search to see if this product or idea already exists. Check common places like ProductHunt, GitHub, or general company databases.
2. Determine if the product already exists based on your search results.
3. List any highly similar products or direct competitors you find.
4. Give a confidence score (0.0 to 1.0) on how strongly you feel this idea is already taken.

Return ONLY valid JSON in this exact format:
{
  "exists": true/false, // True if a very similar product exists, false otherwise
  "similarProducts": [
    {
      "name": "Product name",
      "url": "Website URL if found",
      "gap": "Brief description of what they do vs the proposed idea"
    }
  ],
  "confidence": 0.85, // 0 to 1 scale
  "summary": "A 1-2 sentence high-level summary of your findings"
}`;

    try {
        return await proxyStreamWithRetry({
            agentId: "market-strategist",
            message: prompt,
            route: "/api/precheck",
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
        });
    }
}
