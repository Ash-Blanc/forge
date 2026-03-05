// app/api/analyze/route.ts
import { NextRequest } from "next/server";
import { processForgeWorkflow } from "@/lib/ai/forge";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const analyzeTimeoutMs = parseInt(process.env.ANALYZE_TIMEOUT_MS || "120000", 10);
    const body = await req.json();
    const userQuery =
        typeof body.userQuery === "string" ? body.userQuery.trim() : "";
    if (!body.title || !body.abstract) {
        return new Response(JSON.stringify({ error: "title and abstract required" }), { status: 400 });
    }

    const route = "/api/analyze";
    const startTime = Date.now();

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const sendDelta = (text: string) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", text })}\n\n`));
            };

            const abortController = new AbortController();
            const timer = setTimeout(() => abortController.abort(), analyzeTimeoutMs);

            try {
                const id = "mock-id-for-now";

                const opportunity = await processForgeWorkflow(
                    id,
                    body.title,
                    body.abstract,
                    body.authors || [],
                    userQuery,
                    (delta) => sendDelta(delta),
                    abortController.signal
                );

                clearTimeout(timer);
                const latency = Date.now() - startTime;
                console.log(JSON.stringify({
                    route,
                    latency,
                    status: 200,
                    message: "Workflow completed",
                }));

                sendDelta(`\nMarket strategy complete. Finalizing output...\n`);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", analysis: opportunity })}\n\n`));
            } catch (err: unknown) {
                clearTimeout(timer);
                const latency = Date.now() - startTime;
                const message = err instanceof Error ? err.message : "Unknown error";
                const errorClass = err instanceof Error && err.name === "AbortError" ? "TimeoutError" : "WorkflowError";
                console.error(JSON.stringify({
                    route,
                    latency,
                    upstreamStatus: 0,
                    errorClass,
                    message,
                }));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`));
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
