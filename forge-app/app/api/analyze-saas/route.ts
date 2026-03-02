// app/api/analyze-saas/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const body = await req.json();
    
    if (!body.description) {
        return new Response(JSON.stringify({ error: "description required" }), { status: 400 });
    }

    const prompt = `Find the most relevant recent arXiv research papers for this SaaS product:

${body.description.trim()}

Use the Semantic Scholar tool to find REAL papers.
Prioritize papers that have an verifiable arXiv ID.

CRITICAL: You must output ONLY raw JSON. Do not include introductory text like 'Here are the papers...'. Start your response with { and end with }.`;

    try {
        const agnoRes = await fetch("http://127.0.0.1:8321/agents/saas-boost-agent/runs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: prompt,
                stream: true,
                session_state: body
            })
        });

        if (!agnoRes.ok) {
            return new Response(JSON.stringify({ error: "Agno AgentOS failed" }), { status: 500 });
        }

        let accumulatedText = "";
        const transformer = new TransformStream({
            transform(chunk, controller) {
                const text = new TextDecoder().decode(chunk);
                const lines = text.split("\n");
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.event === "run_step_delta" && data.content) {
                                accumulatedText += data.content;
                                controller.enqueue(`data: ${JSON.stringify({ type: "delta", text: accumulatedText })}\n\n`);
                            } else if (data.event === "run_output") {
                                try {
                                    const parsed = JSON.parse(data.content);
                                    controller.enqueue(`data: ${JSON.stringify({ type: "done", analysis: parsed })}\n\n`);
                                } catch {
                                    controller.enqueue(`data: ${JSON.stringify({ type: "done", text: data.content })}\n\n`);
                                }
                            }
                        } catch (e) {
                            // skip partial JSON
                        }
                    }
                }
            }
        });

        return new Response(agnoRes.body?.pipeThrough(transformer), {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
