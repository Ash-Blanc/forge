// app/api/analyze/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
const AGNO_BASE_URL = process.env.AGNO_BASE_URL ?? "http://127.0.0.1:8321";

export async function POST(req: NextRequest) {
    const body = await req.json();
    if (!body.title || !body.abstract) {
        return new Response(
            JSON.stringify({ error: "title and abstract required" }),
            { status: 400 },
        );
    }

    const prompt = `Analyze the following research paper. Extract the technical essence, core breakthrough, key innovations, evidence, and limitations. Return structured JSON only.

Title: ${body.title}
Authors: ${(body.authors || []).join(", ")}
Published: ${body.published || "Unknown"}
ArXiv ID: ${body.arxivId || "Unknown"}
Abstract:
${(body.abstract || "").slice(0, 5000)}

Focus on what this paper ACTUALLY contributes — do not embellish or speculate beyond the abstract. Be precise about the core breakthrough.`;

    const form = new URLSearchParams();
    form.set("message", prompt);
    form.set("stream", "true");

    try {
        const agnoRes = await fetch(
            `${AGNO_BASE_URL}/agents/forge-analyst/runs`,
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
                    error: `Forge Analyst failed (${agnoRes.status}): ${errorText.slice(0, 200)}`,
                }),
                { status: 502 },
            );
        }

        return new Response(
            agnoRes.body?.pipeThrough(createAgnoSSETransformer()),
            {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            },
        );
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
        });
    }
}

/**
 * Shared SSE transformer that converts Agno AgentOS SSE events
 * into the frontend's expected { type: "delta"|"done"|"error" } format.
 */
function createAgnoSSETransformer(): TransformStream<Uint8Array, string> {
    let accumulatedText = "";
    let sseBuffer = "";
    const decoder = new TextDecoder();

    return new TransformStream({
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

                // Stream content deltas
                if (
                    eventName === "RunContent" ||
                    eventName === "RunIntermediateContent" ||
                    eventName === "ReasoningContentDelta" ||
                    eventName === "run_step_delta"
                ) {
                    if (!contentText) continue;
                    // Skip thinking blocks
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
                }

                // Error events
                else if (eventName === "RunError") {
                    controller.enqueue(
                        `data: ${JSON.stringify({ type: "error", message: contentText || "Agent run failed" })}\n\n`,
                    );
                }

                // Completion events
                else if (
                    eventName === "RunCompleted" ||
                    eventName === "RunContentCompleted" ||
                    eventName === "run_output"
                ) {
                    let finalText = contentText || accumulatedText || "null";
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
}
