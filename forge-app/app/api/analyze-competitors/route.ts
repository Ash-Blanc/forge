// app/api/analyze-competitors/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
const AGNO_BASE_URL = process.env.AGNO_BASE_URL ?? "http://127.0.0.1:8321";

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

    const form = new URLSearchParams();
    form.set("message", prompt);
    form.set("stream", "true");

    try {
        const agnoRes = await fetch(
            `${AGNO_BASE_URL}/agents/market-strategist/runs`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Accept: "text/event-stream",
                },
                body: form.toString(),
            },
        );

        if (!agnoRes.ok) {
            const errorText = await agnoRes.text().catch(() => "");
            return new Response(
                JSON.stringify({
                    error: `Market Strategist failed (${agnoRes.status}): ${errorText.slice(0, 200)}`,
                }),
                { status: 502 },
            );
        }

        let accumulatedText = "";
        let sseBuffer = "";
        const decoder = new TextDecoder();
        const transformer = new TransformStream({
            transform(chunk, controller) {
                sseBuffer += decoder.decode(chunk, { stream: true });
                const lines = sseBuffer.split("\n");
                sseBuffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;

                    let payload: any;
                    try {
                        payload = JSON.parse(line.slice(6));
                    } catch {
                        continue;
                    }

                    const eventName = String(payload.event ?? "");
                    const contentValue = payload.content;
                    const contentText =
                        typeof contentValue === "string"
                            ? contentValue
                            : contentValue != null
                                ? JSON.stringify(contentValue)
                                : "";

                    if (
                        eventName === "RunContent" ||
                        eventName === "RunIntermediateContent" ||
                        eventName === "ReasoningContentDelta" ||
                        eventName === "run_step_delta"
                    ) {
                        if (!contentText) continue;
                        if (contentText.startsWith("<thinking")) continue;
                        const cleanText = contentText
                            .replace(/<thinking[\s\S]*?>/g, "")
                            .replace(/<\/thinking>/g, "")
                            .replace(/^>\s*/, "");
                        if (!cleanText.trim()) continue;
                        accumulatedText += cleanText;
                        controller.enqueue(
                            `data: ${JSON.stringify({ type: "delta", text: accumulatedText })}\n\n`,
                        );
                    } else if (eventName === "RunError") {
                        controller.enqueue(
                            `data: ${JSON.stringify({ type: "error", message: contentText || "Agent run failed" })}\n\n`,
                        );
                    } else if (
                        eventName === "RunCompleted" ||
                        eventName === "RunContentCompleted" ||
                        eventName === "run_output"
                    ) {
                        let finalText =
                            contentText || accumulatedText || "null";
                        finalText = finalText
                            .replace(/<thinking[\s\S]*?<\/thinking>/g, "")
                            .trim();
                        try {
                            const parsed = JSON.parse(finalText);
                            controller.enqueue(
                                `data: ${JSON.stringify({ type: "done", analysis: parsed })}\n\n`,
                            );
                        } catch {
                            controller.enqueue(
                                `data: ${JSON.stringify({ type: "done", text: finalText })}\n\n`,
                            );
                        }
                    }
                }
            },
        });

        return new Response(agnoRes.body?.pipeThrough(transformer), {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
        });
    }
}
