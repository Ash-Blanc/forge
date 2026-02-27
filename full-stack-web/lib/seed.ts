// lib/seed.ts
import { db } from "./supabase";

export async function seedIfEmpty() {
    const { count } = await db
        .from("papers")
        .select("*", { count: "exact", head: true });

    if ((count ?? 0) > 0) return;

    await db.from("users").upsert(
        [
            { id: "seed-aisha", name: "Dr. Aisha Patel", role: "researcher" },
            { id: "seed-lena", name: "Lena Kovacs", role: "builder" },
            { id: "seed-raj", name: "Raj Mehta", role: "investor" },
            { id: "seed-yuki", name: "Yuki Tanaka", role: "researcher" },
            { id: "seed-marcus", name: "Marcus Chen", role: "builder" },
        ],
        { onConflict: "id", ignoreDuplicates: true }
    );

    const { data: p1 } = await db
        .from("papers")
        .insert({
            arxiv_id: "2412.01565",
            title: "Scaling LLM Test-Time Compute with Adaptive Inference Policies",
            abstract: "We propose adaptive inference policies that dynamically allocate test-time compute based on query complexity, achieving state-of-the-art performance while reducing average compute by 42%.",
            authors: ["Jin Park", "Aisha Patel", "Marco Rossi"],
            published: "2024-12-02",
            status: "building",
            opportunity: "Inference cost middleware that cuts enterprise LLM API bills by 40% with zero integration work",
            core_innovation: "A lightweight complexity classifier that routes queries to appropriately-sized reasoning chains at runtime — no model retraining required",
            target_customer: "ML engineering leads at Series B+ companies spending $30K+/month on LLM API costs",
            market_size: "$8B inference optimization market, growing 65% YoY as API pricing continues rising",
            build_complexity: "medium",
            mvp_days: 42,
            moat_analysis: "Per-customer routing models that improve over time create meaningful switching costs. Hyperscalers won't cannibalize their own inference revenue to compete.",
            tags: ["LLM", "inference", "cost-optimization", "enterprise"],
            first_90_days: [
                "Day 42: Proxy middleware MVP with 3 design partners showing 35%+ savings",
                "Day 65: Private beta, first paid contract, case study published",
                "Day 90: Public launch, seed fundraising",
            ],
            narrative_analysis: "Every company that standardized on GPT-4 or Claude is watching their monthly bills double year over year. The proxy middleware approach is the key insight: customers get savings on day one with no code changes, no migration risk. This becomes more defensible the longer a customer runs it — routing models learn their specific usage patterns. And the business model strengthens as API prices rise, not weakens.",
            submitted_by_id: "seed-aisha",
        })
        .select("id")
        .single();

    if (p1) {
        const { data: claim1 } = await db
            .from("claims")
            .insert({ paper_id: p1.id, user_id: "seed-lena", status: "building" })
            .select("id")
            .single();

        if (claim1) {
            await db.from("build_updates").insert([
                { claim_id: claim1.id, user_id: "seed-lena", text: "Repo initialized. Hired ML infra co-founder from Google Brain. Starting with OpenAI proxy." },
                { claim_id: claim1.id, user_id: "seed-lena", text: "First benchmarks in: 38% cost reduction on GPT-4-turbo, beating the paper's claimed 42% on our test workloads." },
            ]);
        }

        await db.from("following").insert([
            { user_id: "seed-raj", paper_id: p1.id },
            { user_id: "seed-marcus", paper_id: p1.id },
        ]);
        await db.from("comments").insert([
            { paper_id: p1.id, user_id: "seed-raj", text: "Met three startups last week alone drowning in LLM costs. The timing here is right." },
            { paper_id: p1.id, user_id: "seed-marcus", text: "Lena — I have relationships at four YC companies who'd be interested in early access. Worth a conversation?" },
        ]);
    }

    const { data: p2 } = await db
        .from("papers")
        .insert({
            arxiv_id: "2501.04519",
            title: "XCROSS: Zero-Shot Cross-Lingual Transfer for Code Documentation",
            abstract: "We present XCROSS, enabling zero-shot transfer of code documentation generation across 47 programming language / natural language pairs without any target-language training data.",
            authors: ["Yuki Tanaka", "Priya Kumar", "Ahmed Hassan"],
            published: "2025-01-09",
            status: "open",
            opportunity: "Developer tool that auto-generates localized documentation for non-English engineering teams — no translation budget needed",
            core_innovation: "Cross-lingual alignment pretraining that achieves near-fine-tuned performance across 47 language pairs without any target-language training data",
            target_customer: "Engineering managers at global tech companies whose developer teams work primarily in a non-English language",
            market_size: "50 million developers outside the English-speaking world. $3.2B developer tooling, $800M localization tools",
            build_complexity: "low",
            mvp_days: 28,
            moat_analysis: "Shared translation memory across customers creates a compounding accuracy advantage. First-mover in code-specific localization before hyperscalers notice the gap.",
            tags: ["NLP", "developer-tools", "localization", "documentation"],
            first_90_days: [
                "Day 28: VS Code extension, HN launch, target 500 signups",
                "Day 60: GitHub Actions integration, first paid teams",
                "Day 90: $10K MRR, apply YC W26",
            ],
            narrative_analysis: "Fifty million developers write code in English while thinking in another language. XCROSS eliminates the need for per-language fine-tuning — one model serves all 47 pairs with margins that improve at scale. The VS Code extension is the right wedge: zero procurement, individual engineers adopt it, then push it upward.",
            submitted_by_id: "seed-yuki",
        })
        .select("id")
        .single();

    if (p2) {
        await db.from("following").insert([{ user_id: "seed-raj", paper_id: p2.id }]);
        await db.from("comments").insert([
            { paper_id: p2.id, user_id: "seed-raj", text: "No one has done code localization properly. This is the paper that makes it technically viable." },
        ]);
    }

    const { data: p3 } = await db
        .from("papers")
        .insert({
            arxiv_id: "2408.08412",
            title: "Generative Agents in Multi-modal Simulated Workspaces",
            abstract: "This paper introduces a framework for autonomous generative AI agents to operate non-deterministically across multi-modal interfaces—such as simulated web browsers and terminals—to achieve long-horizon complex tasks autonomously.",
            authors: ["Emily Chen", "David O. Garcia"],
            published: "2024-08-15",
            status: "open",
            opportunity: "A reliable QA testing platform where AI agents autonomously explore new web features, generate tests, and report visual bugs.",
            core_innovation: "A lightweight vision-language control protocol mapping bounding boxes to explicit DOM elements without hallucinating paths.",
            target_customer: "QA Teams and CTOs at mid-market B2B SaaS companies",
            market_size: "$4.5B automated QA market, heavily disrupted by AI reliability",
            build_complexity: "high",
            mvp_days: 60,
            moat_analysis: "Building a headless, agentic browsing infrastructure is notoriously unstable. Nailing the orchestration and sandboxing creates immense friction for competitors.",
            tags: ["Agents", "Automation", "QA", "Computer-Vision"],
            first_90_days: [
                "Day 30: Basic Playwright wrapper controlled by Anthropic Claude 3.5 Sonnet",
                "Day 45: Early alpha targeting a single workflow (e.g. checkout testing)",
                "Day 90: Closed beta with 5 paying B2B customers"
            ],
            narrative_analysis: "Every software team hates writing Cypress/Playwright tests by hand. If a computer vision agent can just 'use the website' like a human and flag visual/functional regressions, it becomes a no-brainer $1k/mo product. The challenge is infrastructure cost and reliability — which this paper partially solves.",
            submitted_by_id: "seed-aisha",
        })
        .select("id")
        .single();

    if (p3) {
        await db.from("comments").insert([
            { paper_id: p3.id, user_id: "seed-lena", text: "The Playwright routing in the paper is super flaky. I might actually try a different approach if I build this." },
            { paper_id: p3.id, user_id: "seed-marcus", text: "Agreed. I think electron might be a better sandbox environment for these multimodal models." }
        ]);
        await db.from("following").insert([
            { user_id: "seed-marcus", paper_id: p3.id },
            { user_id: "seed-lena", paper_id: p3.id }
        ]);
    }

    console.log("✓ FORGE seed complete");
}