// lib/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import type { ArxivMeta } from "./arxiv";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ForgeAnalysis {
    opportunity: string;
    coreInnovation: string;
    targetCustomer: string;
    marketSize: string;
    buildComplexity: "low" | "medium" | "high";
    mvpDays: number;
    moatAnalysis: string;
    tags: string[];
    first90Days: string[];
    narrativeAnalysis: string;
}

const SYSTEM = `You are FORGE — an AI that distills academic papers into clear, honest SaaS opportunities.
Return ONLY valid JSON. No markdown fences, no preamble, no scores or ratings. Just the analysis.`;

export function buildPrompt(meta: ArxivMeta): string {
    return `Analyze this paper and return a JSON object. Be concrete, honest, and specific — avoid hype.

Title: ${meta.title}
Authors: ${meta.authors.join(", ")}
Published: ${meta.published}
Abstract: ${meta.abstract.slice(0, 2000)}

Return exactly this JSON (all fields required, no numeric scores):
{
  "opportunity": "One clear sentence: what product, for whom, and the core value",
  "coreInnovation": "What the paper actually invented — the technical breakthrough in plain language",
  "targetCustomer": "Specific role, industry, company stage. Be precise.",
  "marketSize": "Realistic TAM estimate with reasoning. Cite known data if applicable.",
  "buildComplexity": "low" | "medium" | "high",
  "mvpDays": number (21–120),
  "moatAnalysis": "What would prevent a well-funded competitor from replicating this in 6 months",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "first90Days": ["Day X: specific milestone", "Day Y: specific milestone", "Day Z: specific milestone"],
  "narrativeAnalysis": "3–4 sentences. Why this paper, why now, what the business model unlock is, what the honest risks are."
}`;
}

export function streamAnalysis(meta: ArxivMeta): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    if (process.env.ANTHROPIC_API_KEY === "dummy" || !process.env.ANTHROPIC_API_KEY) {
        return new ReadableStream({
            async start(controller) {
                try {
                    const mockAnalysis: ForgeAnalysis = {
                        opportunity: `A mock opportunity for ${meta.title} targeting simulation environments`,
                        coreInnovation: "Simulated AI backend to allow full local UX testing without paid API keys.",
                        targetCustomer: "Developers, QA testers, and local reviewers.",
                        marketSize: "$1B Local Testing Market",
                        buildComplexity: "medium",
                        mvpDays: 30,
                        moatAnalysis: "This is entirely mocked data. No API calls were made to Anthropic.",
                        tags: ["Mock", "Simulation"],
                        first90Days: ["Day 1: Trigger mock stream", "Day 30: Evaluate UI speed", "Day 90: Switch to production keys"],
                        narrativeAnalysis: "This is a simulated analysis generated because the ANTHROPIC_API_KEY is set to 'dummy'. The UI behaves identically to the real API."
                    };

                    const mockJSON = JSON.stringify(mockAnalysis, null, 2);
                    let current = "";

                    for (let i = 0; i < mockJSON.length; i += 15) {
                        current += mockJSON.substring(i, i + 15);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", text: current })}\n\n`));
                        await new Promise(r => setTimeout(r, 10)); // simulate typing speed
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", analysis: mockAnalysis })}\n\n`));
                } catch (err: any) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`));
                } finally {
                    controller.close();
                }
            }
        });
    }

    return new ReadableStream({
        async start(controller) {
            let full = "";

            try {
                const stream = anthropic.messages.stream({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1024,
                    system: SYSTEM,
                    messages: [{ role: "user", content: buildPrompt(meta) }],
                });

                for await (const chunk of stream) {
                    if (
                        chunk.type === "content_block_delta" &&
                        chunk.delta.type === "text_delta"
                    ) {
                        full += chunk.delta.text;
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ type: "delta", text: full })}\n\n`)
                        );
                    }
                }

                const clean = full.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
                const match = clean.match(/\{[\s\S]*\}/);
                if (!match) throw new Error("No JSON in response");

                const analysis: ForgeAnalysis = JSON.parse(match[0]);
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "done", analysis })}\n\n`)
                );
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Analysis failed";
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`)
                );
            } finally {
                controller.close();
            }
        },
    });
}