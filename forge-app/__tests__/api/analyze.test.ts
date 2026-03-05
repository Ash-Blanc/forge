/**
 * Unit tests for POST /api/analyze
 * Mocks processForgeWorkflow so no real agent calls are made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockProcessForgeWorkflow = vi.fn();

vi.mock("@/lib/ai/forge", () => ({
    processForgeWorkflow: (...args: unknown[]) => mockProcessForgeWorkflow(...args),
}));

async function callRoute(body: Record<string, unknown>) {
    const { POST } = await import("@/app/api/analyze/route");
    const req = new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return POST(req as any);
}

async function drainStream(res: Response): Promise<string> {
    const reader = res.body?.getReader();
    if (!reader) return "";
    let content = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += typeof value === "string" ? value : new TextDecoder().decode(value);
    }
    return content;
}

describe("POST /api/analyze", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
        mockProcessForgeWorkflow.mockResolvedValue({
            opportunity: "Test SaaS idea",
            coreInnovation: "Core breakthrough",
            targetCustomer: "Developers",
            marketSize: "Large",
            buildComplexity: "medium",
            mvpDays: 45,
            moatAnalysis: "Strong moat",
            tags: ["AI", "SaaS"],
            first90Days: ["Launch MVP"],
            narrativeAnalysis: "Test narrative",
        });
    });

    it("returns 400 when title is missing", async () => {
        const res = await callRoute({ abstract: "some abstract" });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toMatch(/title|abstract/i);
    });

    it("returns 400 when abstract is missing", async () => {
        const res = await callRoute({ title: "Some Title" });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toMatch(/title|abstract/i);
    });

    it("returns a streaming SSE response for valid input", async () => {
        const res = await callRoute({
            title: "Attention Is All You Need",
            abstract: "We propose a new architecture called the Transformer...",
            authors: ["Vaswani et al."],
        });

        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("text/event-stream");
    });

    it("times out and streams error event when workflow exceeds ANALYZE_TIMEOUT_MS", async () => {
        vi.stubEnv("ANALYZE_TIMEOUT_MS", "50");

        mockProcessForgeWorkflow.mockImplementation(
            (_id: unknown, _title: unknown, _abstract: unknown, _authors: unknown, _query: unknown, _onProgress: unknown, abortSignal: AbortSignal | undefined) =>
                new Promise((_, reject) => {
                    if (abortSignal) {
                        abortSignal.addEventListener("abort", () =>
                            reject(new DOMException("The operation was aborted", "AbortError"))
                        );
                    } else {
                        reject(new Error("No abort signal"));
                    }
                })
        );

        const res = await callRoute({
            title: "Slow Paper",
            abstract: "Abstract...",
            authors: [],
        });

        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("text/event-stream");

        const content = await drainStream(res);
        expect(content).toContain('"type":"error"');
        expect(content).toMatch(/abort|AbortError|timeout/i);
    });
});
