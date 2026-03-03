// app/api/analyze/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
const AGNO_BASE_URL = process.env.AGNO_BASE_URL ?? "http://127.0.0.1:8321";

export async function POST(req: NextRequest) {
    const body = await req.json();
    if (!body.title || !body.abstract) {
        return new Response(JSON.stringify({ error: "title and abstract required" }), { status: 400 });
    }

    const prompt = `Analyze this paper and generate both a paper analysis and startup idea.

Title: ${body.title}
Authors: ${(body.authors || []).join(", ")}
Abstract: ${(body.abstract || "").slice(0, 5000)}

Return ONLY valid JSON.`;

    const form = new URLSearchParams();
    form.set("message", prompt);
    form.set("stream", "true");

    try {
        let agnoRes = await fetch(`${AGNO_BASE_URL}/agents/forge-analyst/runs`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "text/event-stream" },
            body: form.toString(),
        });

        if (agnoRes.status === 422) {
            agnoRes = await fetch(`${AGNO_BASE_URL}/agents/forge-analyst/runs`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "text/event-stream" },
                body: new URLSearchParams({ message: prompt, stream: "true" }).toString(),
            });
        }

        if (!agnoRes.ok) {
            return new Response(JSON.stringify({ error: `Agno AgentOS failed (${agnoRes.status})` }), { status: 500 });
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
                                    let content = data.content || "";
                                    content = content.replace(/<thinking[\s\S]*?>/g, "").replace(/<\/thinking>/g, "");
                                    const parsed = JSON.parse(content);
                                    controller.enqueue(`data: ${JSON.stringify({ type: "done", analysis: parsed })}\n\n`);
                                } catch {
                                    let content = data.content || "";
                                    content = content.replace(/<thinking[\s\S]*?>/g, "").replace(/<\/thinking>/g, "");
                                    controller.enqueue(`data: ${JSON.stringify({ type: "done", text: content })}\n\n`);
                                }
                            }
                        } catch (e) {
                            // Partial JSON or other event, skip
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
