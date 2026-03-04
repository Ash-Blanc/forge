// app/api/analyze-competitors/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
import { proxyStreamWithRetry } from "@/lib/ai/stream-proxy";

export async function POST(req: NextRequest) {
    const body = await req.json();

    if (!body.ideaContext) {
        return new Response(
            JSON.stringify({ error: "ideaContext required" }),
            { status: 400 },
        );
    }

    const prompt = `Build a comprehensive competitive constellation map for this product idea or market:

"${body.ideaContext.trim()}"

Your task:
1. Use DuckDuckGo to find 5-10 REAL competitors, alternatives, and adjacent products in this space. Search with multiple query variations (e.g., "product name competitors", "alternative to X", "market category tools").
2. Use Semantic Scholar to find recent papers that could give a new entrant an unfair technical advantage.
3. Categorize competitors by type: direct competitors, partial overlaps, adjacent tools, and emerging threats.
4. Identify the whitespace — gaps in the market that no current player fills well.

Return ONLY valid JSON in this format:
{
  "marketOverview": "2-3 sentence overview of the competitive landscape",
  "competitors": [
    {
      "name": "Real Company Name",
      "url": "https://actual-url.com",
      "category": "direct|partial_overlap|adjacent|emerging",
      "description": "What they do in 1 sentence",
      "strengths": ["Strength 1"],
      "weaknesses": ["Weakness or gap 1"],
      "estimatedSize": "Bootstrapped|Seed|Series A|Growth|Enterprise"
    }
  ],
  "whitespaceOpportunities": [
    {
      "gap": "Description of the unserved need",
      "targetUser": "Who would pay for this",
      "feasibility": "Low|Medium|High"
    }
  ],
  "technicalEdges": [
    {
      "paperTitle": "Relevant paper title",
      "arxivId": "XXXX.XXXXX",
      "advantage": "How this paper could create differentiation"
    }
  ],
  "marketVerdict": "Is this a red ocean, blue ocean, or emerging category? With reasoning.",
  "entryStrategy": "Recommended approach for a new entrant based on the map"
}`;

    try {
        return await proxyStreamWithRetry({
            agentId: "market-strategist",
            message: prompt,
            route: "/api/analyze-competitors",
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
        });
    }
}
