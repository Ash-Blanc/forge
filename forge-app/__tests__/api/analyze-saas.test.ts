import { describe, it, expect, vi, beforeEach } from "vitest";

// Spy on the global fetch to simulate timeouts and 500s
const originalFetch = global.fetch;

// Mock the stream proxy to expose its behavior, or we can just mock global.fetch
// since it calls `fetch` inside `proxyStreamWithRetry`. Let's mock global.fetch.

describe("POST /api/analyze-saas", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
        vi.stubEnv("MAX_PROXY_RETRIES", "2");
        vi.stubEnv("PROXY_TIMEOUT_MS", "50"); // Fast timeout for tests
    });

    async function callRoute(body: Record<string, unknown>) {
        const { POST } = await import("@/app/api/analyze-saas/route");
        const req = new Request("http://localhost/api/analyze-saas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        return POST(req as any);
    }

    it("returns 400 when description is missing", async () => {
        const res = await callRoute({});
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toMatch(/description required/i);
    });

    it("retries on 5xx upstream errors and eventually streams", async () => {
        // Mock fetch to fail twice with 5xx, then succeed
        let fetchCallCount = 0;
        vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => {
            fetchCallCount++;
            if (fetchCallCount <= 2) {
                return new Response("Internal Server Error", { status: 500 });
            }
            
            // Third call succeeds
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ event: "RunCompleted", content: "{\"recommendation\": \"Do it.\"}" })}\n\n`));
                    controller.close();
                }
            });
            return new Response(stream, { status: 200 });
        }));

        const res = await callRoute({ description: "A great SaaS idea" });
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("text/event-stream");
        
        // It should have called fetch 3 times
        expect(fetchCallCount).toBe(3);
        
        // Drain stream to verify parsed data
        const reader = res.body?.getReader();
        let content = "";
        while (reader) {
            const { done, value } = await reader.read();
            if (done) break;
            // The transformer outputs strings directly, or if it outputs Uint8Array, we convert.
            content += typeof value === "string" ? value : new TextDecoder().decode(value);
        }
        expect(content).toContain('"type":"done"');
    });

    it("times out and falls back to error stream on AbortError", async () => {
        // Mock fetch to simulate taking too long
        let fetchCallCount = 0;
        vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => {
            fetchCallCount++;
            // We sleep longer than PROXY_TIMEOUT_MS (50ms)
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    resolve(new Response("Too slow"));
                }, 200);
                
                // If it passes an AbortSignal, we listen for it
                if (init?.signal) {
                    init.signal.addEventListener("abort", () => {
                        clearTimeout(timer);
                        const err = new Error("AbortError");
                        err.name = "AbortError";
                        reject(err);
                    });
                }
            });
        }));

        const res = await callRoute({ description: "Another idea" });
        
        // It should return 200 but the stream itself should just contain the error event
        expect(res.status).toBe(200);
        expect(fetchCallCount).toBe(3); // 1 initial + 2 retries
        
        const reader = res.body?.getReader();
        let content = "";
        while (reader) {
            const { done, value } = await reader.read();
            if (done) break;
            content += typeof value === "string" ? value : new TextDecoder().decode(value);
        }
        expect(content).toContain('"type":"error"');
        expect(content).toContain("AbortError");
    });
    
    it("returns 502 with error details immediately on 4xx without retrying", async () => {
        let fetchCallCount = 0;
        vi.stubGlobal("fetch", vi.fn(async () => {
            fetchCallCount++;
            return new Response("Bad Request", { status: 400 });
        }));

        const res = await callRoute({ description: "Fail me" });
        expect(res.status).toBe(502);
        
        // Did not retry
        expect(fetchCallCount).toBe(1);
        const json = await res.json();
        expect(json.error).toMatch(/Agent failed \(400\)/);
    });
});
