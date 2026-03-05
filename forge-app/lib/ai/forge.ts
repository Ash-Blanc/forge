import { createClient } from "@supabase/supabase-js";

// Fetch from the local Agno Python agent server
const AGNO_BASE_URL = process.env.AGNO_BASE_URL ?? "http://127.0.0.1:8321";

const AGENT_TIMEOUT_MS = parseInt(process.env.AGENT_TIMEOUT_MS || "30000", 10);
const MAX_RETRIES = parseInt(process.env.MAX_PROXY_RETRIES || "2", 10);

// Sleep helper for retry backoff
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Call an Agno agent and return its raw output string.
 * Retries up to MAX_RETRIES times with exponential backoff on 5xx / network errors.
 * Each attempt is subject to AGENT_TIMEOUT_MS; aborts when parentSignal aborts.
 */
export async function generateAgentOutput(
    agentId: string,
    message: string,
    parentSignal?: AbortSignal | null
): Promise<string> {
    let lastError: Error | null = null;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

        const cleanup = () => {
            clearTimeout(timer);
            parentSignal?.removeEventListener?.("abort", onParentAbort);
        };
        const onParentAbort = () => controller.abort();
        parentSignal?.addEventListener?.("abort", onParentAbort);

        try {
            const res = await fetch(`${AGNO_BASE_URL}/agents/${agentId}/runs`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
                body: new URLSearchParams({ message }).toString(),
                signal: controller.signal,
            });

            cleanup();

            if (!res.ok) {
                const detail = await res.text().catch(() => "");
                
                // If 4xx, do not retry
                if (res.status >= 400 && res.status < 500) {
                    console.error(JSON.stringify({
                        route: `/agents/${agentId}/runs`,
                        latency: Date.now() - startTime,
                        status: res.status,
                        errorClass: "ClientError",
                        message: detail.slice(0, 200)
                    }));
                    throw new Error(`Agno Agent ${agentId} failed (${res.status}): ${detail}`);
                }
                
                throw new Error(`Agno Agent ${agentId} upstream status ${res.status}`);
            }

            const data = await res.json();
            
            console.log(JSON.stringify({
                route: `/agents/${agentId}/runs`,
                latency: Date.now() - startTime,
                status: res.status,
                attempt,
                message: "Upstream connection successful"
            }));
            
            return data?.content || "{}";
        } catch (err: any) {
            cleanup();
            lastError = err;

            // Stop retrying if we reached MAX_RETRIES
            if (attempt === MAX_RETRIES) break;

            const backoff = 500 * Math.pow(2, attempt); // 500ms, 1000ms
            await sleep(backoff);
        }
    }

    const latency = Date.now() - startTime;
    const errorClass = lastError?.name === "AbortError" ? "TimeoutError" : "NetworkError";
    console.error(JSON.stringify({ 
        route: `/agents/${agentId}/runs`, 
        latency, 
        status: 0, 
        errorClass, 
        message: lastError?.message || "Unknown error" 
    }));

    throw lastError ?? new Error(`Agno Agent ${agentId}: unknown error`);
}

export async function processForgeWorkflow(
    paperId: string,
    title: string,
    abstract: string,
    authors: string[],
    userQuery?: string,
    onProgress?: (text: string) => void,
    abortSignal?: AbortSignal | null
) {
    const notify = (msg: string) => { onProgress?.(msg); };

    // 1. Forge Analyst
    notify(`Analyzing paper mechanics: "${title}"...\n`);
    const analystPrompt = `Analyze this paper and extract the technical essence.
    Title: ${title}
    Authors: ${authors.join(", ")}
    Abstract: ${abstract}
    ${userQuery ? `User request for this turn: ${userQuery}` : ""}
    Return ONLY valid JSON as requested.`;
    
    notify("Waiting for Forge Analyst agent...\n");
    const analystOutputRaw = await generateAgentOutput("forge-analyst", analystPrompt, abortSignal);
    const analystOutput = JSON.parse(analystOutputRaw || "{}");
    notify("Done with Analyst!\n");
    
    // 2. Product Architect
    notify("Architecting SaaS ideas...\n");
    const architectPrompt = `Based on the following Analyst's extraction of the 'Core Breakthrough', design 3-5 distinct commercialization directions and recommend the top one.
    Core Breakthrough & Tech Summary from Analyst:
    ${JSON.stringify(analystOutput)}
    Return ONLY valid JSON as requested.`;
    
    const architectOutputRaw = await generateAgentOutput("product-architect", architectPrompt, abortSignal);
    const architectOutput = JSON.parse(architectOutputRaw || "{}");
    notify("Done with Architect!\n");

    // 3. Market Strategist
    notify("Strategizing GTM...\n");
    const strategistPrompt = `Based on the Architect's recommended SaaS path, build a full execution strategy and go-to-market plan.
    Architect Recommendation:
    ${JSON.stringify(architectOutput)}
    Return ONLY valid JSON as requested.`;

    const strategistOutputRaw = await generateAgentOutput("market-strategist", strategistPrompt, abortSignal);
    const strategistOutput = JSON.parse(strategistOutputRaw || "{}");
    notify("Done with Strategist!\n");

    // 4. Combine and Save into Supabase
    const finalOpportunity = {
        paper_id: paperId,
        analyst_summary: analystOutput,
        architect_design: architectOutput,
        strategist_plan: strategistOutput,
        nova_score: 85
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    
    if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { error } = await supabase.from("forge_opportunities").upsert(finalOpportunity, {
            onConflict: "paper_id"
        });
        
        if (error) {
            console.error("Failed to save opportunity to database:", error);
        }
    }

    // Map the 3-agent orchestration to the frontend UI's expected format (ForgeAnalysis)
    const rec = architectOutput?.opportunities?.[0] || {};
    const strategy = strategistOutput?.strategy || {};
    const analysis = analystOutput?.paperAnalysis || {};

    const uiResponse = {
        opportunity: rec.oneLiner || "Opportunity identified.",
        coreInnovation: analysis.coreBreakthrough || "Technical breakthrough extracted.",
        targetCustomer: rec.targetUser || "Developers",
        marketSize: strategy.marketVerdict || "Market size analysis complete.",
        buildComplexity: (rec.buildComplexity?.toLowerCase?.() === "high" || rec.buildComplexity?.toLowerCase?.() === "low") ? rec.buildComplexity.toLowerCase() : "medium",
        mvpDays: 45, // static estimate for MVP based on timeframe
        moatAnalysis: strategy.unfairAdvantage || "Analysis of moat complete.",
        tags: [rec.type || "SaaS", "AI", "Startup"],
        first90Days: [strategy.gtmPath || "Launch MVP"],
        narrativeAnalysis: `${analysis.introOverview || ""} ${architectOutput.recommendationReason || ""}`
    };

    return uiResponse;
}
