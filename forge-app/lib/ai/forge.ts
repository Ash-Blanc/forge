import { createClient } from "@supabase/supabase-js";

// Fetch from the local Agno Python agent server
const AGNO_BASE_URL = process.env.AGNO_BASE_URL ?? "http://127.0.0.1:8321";

// Simple helper to call an Agno agent synchronously and await the final JSON output string
export async function generateAgentOutput(agentId: string, message: string): Promise<string> {
    let agnoRes = await fetch(`${AGNO_BASE_URL}/agents/${agentId}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
        body: new URLSearchParams({ message }).toString(),
    });

    if (agnoRes.status === 422) {
        agnoRes = await fetch(`${AGNO_BASE_URL}/agents/${agentId}/runs`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
            body: new URLSearchParams({ message }).toString(),
        });
    }

    if (!agnoRes.ok) {
        const detail = await agnoRes.text().catch(() => "");
        throw new Error(`Agno Agent ${agentId} failed (${agnoRes.status}): ${detail}`);
    }

    const data = await agnoRes.json();
    return data?.content || "{}";
}

export async function processForgeWorkflow(
    paperId: string, 
    title: string, 
    abstract: string, 
    authors: string[], 
    onProgress?: (text: string) => void
) {
    const notify = (msg: string) => { onProgress?.(msg); };

    // 1. Forge Analyst
    notify(`Analyzing paper mechanics: "${title}"...\n`);
    const analystPrompt = `Analyze this paper and extract the technical essence.
    Title: ${title}
    Authors: ${authors.join(", ")}
    Abstract: ${abstract}
    Return ONLY valid JSON as requested.`;
    
    notify("Waiting for Forge Analyst agent...\n");
    const analystOutputRaw = await generateAgentOutput("forge-analyst", analystPrompt);
    const analystOutput = JSON.parse(analystOutputRaw || "{}");
    notify("Done with Analyst!\n");
    
    // 2. Product Architect
    notify("Architecting SaaS ideas...\n");
    const architectPrompt = `Based on the following Analyst's extraction of the 'Core Breakthrough', design 3-5 distinct commercialization directions and recommend the top one.
    Core Breakthrough & Tech Summary from Analyst:
    ${JSON.stringify(analystOutput)}
    Return ONLY valid JSON as requested.`;
    
    const architectOutputRaw = await generateAgentOutput("product-architect", architectPrompt);
    const architectOutput = JSON.parse(architectOutputRaw || "{}");
    notify("Done with Architect!\n");

    // 3. Market Strategist
    notify("Strategizing GTM...\n");
    const strategistPrompt = `Based on the Architect's recommended SaaS path, build a full execution strategy and go-to-market plan.
    Architect Recommendation:
    ${JSON.stringify(architectOutput)}
    Return ONLY valid JSON as requested.`;

    const strategistOutputRaw = await generateAgentOutput("market-strategist", strategistPrompt);
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
