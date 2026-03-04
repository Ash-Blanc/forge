// app/api/analyze-saas/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
import { proxyStreamWithRetry } from "@/lib/ai/stream-proxy";

export async function POST(req: NextRequest) {
    const body = await req.json();

    if (!body.description) {
        return new Response(
            JSON.stringify({ error: "description required" }),
            { status: 400 },
        );
    }

    const prompt = `I have the following SaaS product idea or concept:

"${body.description.trim()}"

Your task:
1. Use your Semantic Scholar tool to find 3-5 recent (2023-2026) real research papers that could provide a technical advantage for this product. Try multiple search queries if the first doesn't return good results.
2. Use DuckDuckGo to find existing competitors or similar products in this space.
3. For each paper found, explain HOW its breakthrough could be applied to strengthen this SaaS product.
4. Identify the most promising research-driven competitive moat.

Return ONLY valid JSON in this format:
{
  "productContext": "Brief restatement of the product idea",
  "relevantPapers": [
    {
      "title": "Real paper title",
      "arxivId": "XXXX.XXXXX",
      "year": 2024,
      "relevance": "How this paper's technique strengthens the product",
      "applicationIdea": "Specific feature or capability this enables"
    }
  ],
  "existingCompetitors": [
    {
      "name": "Competitor name",
      "url": "https://...",
      "gap": "What they lack that paper-backed tech could fill"
    }
  ],
  "researchMoat": "The strongest technical moat from combining these papers with the product",
  "recommendation": "1-2 sentences on the most actionable next step"
}`;

    try {
        return await proxyStreamWithRetry({
            agentId: "market-strategist",
            message: prompt,
            route: "/api/analyze-saas",
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
        });
    }
}
