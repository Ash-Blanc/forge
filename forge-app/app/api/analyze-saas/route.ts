// app/api/analyze-saas/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
const AGNO_BASE_URL = process.env.AGNO_BASE_URL ?? "http://127.0.0.1:8321";

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
