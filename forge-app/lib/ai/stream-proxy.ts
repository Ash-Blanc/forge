import { NextRequest } from "next/server";

export interface StreamProxyOptions {
    agentId: string;
    message: string;
    route: string;
}

const AGNO_BASE_URL = process.env.AGNO_BASE_URL ?? "http://127.0.0.1:8321";
const MAX_RETRIES = parseInt(process.env.MAX_PROXY_RETRIES || "2", 10);
const DEFAULT_TIMEOUT_MS = parseInt(process.env.PROXY_TIMEOUT_MS || "30000", 10);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function proxyStreamWithRetry(options: StreamProxyOptions): Promise<Response> {
    const { agentId, message, route } = options;
    const form = new URLSearchParams();
    form.set("message", message);
    form.set("stream", "true");

    let lastError: any = null;
    let attempt = 0;
    const startTime = Date.now();

    for (; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

        try {
            const agnoRes = await fetch(`${AGNO_BASE_URL}/agents/${agentId}/runs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Accept: "text/event-stream",
                },
                body: form.toString(),
                signal: controller.signal,
            });

            clearTimeout(timer);

            if (!agnoRes.ok) {
                // If 4xx, do not retry
                if (agnoRes.status >= 400 && agnoRes.status < 500) {
                    const errorText = await agnoRes.text().catch(() => "");
                    console.error(JSON.stringify({ 
                        route, 
                        latency: Date.now() - startTime, 
                        status: agnoRes.status, 
                        errorClass: "ClientError", 
                        message: errorText.slice(0, 200) 
                    }));
                    return new Response(
                        JSON.stringify({ error: `Agent failed (${agnoRes.status}): ${errorText.slice(0, 200)}` }),
                        { status: 502 }
                    );
                }
                
                // Keep for retry
                throw new Error(`Upstream status ${agnoRes.status}`);
            }

            // Success, return transformed stream
            console.log(JSON.stringify({
                route,
                latency: Date.now() - startTime,
                status: agnoRes.status,
                attempt,
                message: "Upstream connection successful"
            }));

            const transformer = createSseTransformer();
            return new Response(agnoRes.body?.pipeThrough(transformer), {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            });

        } catch (err: any) {
            clearTimeout(timer);
            lastError = err;

            // Stop retrying if we reached MAX_RETRIES
            if (attempt === MAX_RETRIES) break;

            const backoff = 500 * Math.pow(2, attempt); // 500ms, 1000ms
            await sleep(backoff);
        }
    }

    const latency = Date.now() - startTime;
    const errorClass = lastError?.name === "AbortError" ? "TimeoutError" : "NetworkError";
    console.error(JSON.stringify({ route, latency, status: 0, errorClass, message: lastError?.message || "Unknown error" }));

    // Send fallback SSE error directly if we failed completely
    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: `Stream proxy failed: ${lastError?.message}` })}\n\n`));
            controller.close();
        }
    });

    return new Response(stream, {
        status: 200, 
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}

function createSseTransformer() {
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
