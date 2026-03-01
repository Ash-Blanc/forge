"use client";
// app/dashboard/page.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, RoleBadge, Spinner, Tag, SectionLabel } from "@/components/ui";
import type { ForgeUser } from "@/lib/types";

type AppMode = "paper" | "saas" | "constellation";
type Tab = "analysis" | "competitors";

const AVAILABLE_MODELS = [
    { id: "amazon:amazon.nova-lite-v1:0", name: "AWS Bedrock Nova 2 Lite", provider: "amazon" },
    { id: "openai:gpt-4o", name: "GPT-4o", provider: "openai" },
    { id: "anthropic:claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet", provider: "anthropic" },
];

interface Session {
    id: string;
    mode: AppMode;
    title: string;
    timestamp: string;
    arxivId?: string;
    meta?: ArxivMeta;
    data?: AnalysisData;
    isSuggestion?: boolean;
    parentId?: string;
}

interface ArxivMeta {
    title: string;
    abstract: string;
    authors: string[];
    published: string;
    arxivId?: string;
}

interface PaperAnalysis {
    introOverview?: string;
    summary?: string;
    researchProblem?: string;
    methodInPlainEnglish?: string;
    whatIsNewVsPrior?: string;
    practicalTakeaway?: string;
    evidenceAndResults?: string[];
    coreBreakthrough?: string;
    keyInnovations?: string[];
    applications?: string[];
    limitations?: string[];
    assumptions?: string[];
    startupViabilityScore?: number;
    viabilityReasoning?: string;
}

interface TargetUser {
    persona: string;
    painPoint: string;
    currentAlternatives: string;
}

interface Product {
    coreFeature: string;
    differentiation: string;
}

interface Business {
    pricingModel: string;
    gtm: string;
}

interface Metrics {
    novelty: string;
    competition: string;
    confidence: number;
    mvpMonths: number;
}

interface StartupIdea {
    startupName: string;
    oneLiner: string;
    theHook: string;
    targetUser: TargetUser;
    coreTech: string;
    product: Product;
    business: Business;
    metrics: Metrics;
}

interface OpportunityPath {
    type: "platform" | "feature" | "api_plugin";
    name: string;
    oneLiner: string;
    targetUser: TargetUser;
    coreValue: string;
    integrationSurface: string;
    coreTech: string;
    product: Product;
    business: Business;
    whyNow: string;
    buildScopeWeeks: number;
    distributionEase: string;
    competition: string;
    novelty: string;
    confidence: number;
    firstMilestone: string;
    risks: string[];
    feasibilityScore?: number;
}

interface Competitor {
    name: string;
    url: string;
    description: string;
    pricing: string;
    differentiation: string;
}

interface CompetitorIntelligence {
    competitors: Competitor[];
    marketVerdict: string;
}

interface AnalysisData {
    paperAnalysis?: PaperAnalysis;
    startupIdea?: StartupIdea;
    opportunities?: OpportunityPath[];
    recommendedPath?: "platform" | "feature" | "api_plugin";
    recommendedPathComputed?: "platform" | "feature" | "api_plugin";
    recommendationReason?: string;
    recommendationReasonComputed?: string;
    competitorIntelligence?: CompetitorIntelligence;
    competitorIntelligenceByPath?: Record<string, CompetitorIntelligence>;
    overallStrategy?: string;
    papers?: SaasPaper[];
}

interface SaasPaper {
    arxivId: string;
    title: string;
    year: string;
    relevance: string;
    boostIdea: string;
    implementationHint: string;
    difficulty: string;
    impact: string;
}

const PATH_LABELS: Record<OpportunityPath["type"], string> = {
    feature: "Niche Feature",
    api_plugin: "API / Plugin",
    platform: "Full Platform",
};

const toInt = (v: unknown, fallback: number) => {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const clip = (value: unknown, max = 220) => {
    const text = String(value ?? "").trim();
    return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
};

const fallbackList = (items: unknown): string[] => {
    if (!Array.isArray(items)) return [];
    return items.map((x) => String(x).trim()).filter(Boolean);
};

const normalizeOpportunity = (raw: Partial<OpportunityPath>, forcedType: OpportunityPath["type"]): OpportunityPath => {
    const confidence = Math.max(1, Math.min(10, toInt(raw.confidence, 5)));
    const buildScopeWeeks = Math.max(1, Math.min(26, toInt(raw.buildScopeWeeks, 8)));
    const speedScore = Math.max(1, 10 - Math.min(10, buildScopeWeeks));
    const distributionScore = { low: 3, medium: 6, high: 9 }[(raw.distributionEase || "medium").toLowerCase() as "low" | "medium" | "high"] ?? 6;
    const competitionPenalty = { low: 0, medium: 0.8, high: 1.6 }[(raw.competition || "medium").toLowerCase() as "low" | "medium" | "high"] ?? 0.8;
    const feasibilityScore = Math.max(0, Math.min(10, Number((0.45 * speedScore + 0.35 * distributionScore + 0.2 * confidence - competitionPenalty).toFixed(1))));

    return {
        type: forcedType,
        name: raw.name || `${PATH_LABELS[forcedType]} Opportunity`,
        oneLiner: raw.oneLiner || "Not explicitly stated.",
        targetUser: raw.targetUser || { persona: "TBD persona", painPoint: "TBD pain point", currentAlternatives: "TBD alternatives" },
        coreValue: raw.coreValue || "Not explicitly stated.",
        integrationSurface: raw.integrationSurface || (forcedType === "platform" ? "Standalone product" : "Existing workflow/API"),
        coreTech: raw.coreTech || "Not explicitly stated.",
        product: raw.product || { coreFeature: "Not explicitly stated.", differentiation: "Not explicitly stated." },
        business: raw.business || { pricingModel: "Not explicitly stated.", gtm: "Not explicitly stated." },
        whyNow: raw.whyNow || "Not explicitly stated.",
        buildScopeWeeks,
        distributionEase: raw.distributionEase || "Medium",
        competition: raw.competition || "Medium",
        novelty: raw.novelty || "Medium",
        confidence,
        firstMilestone: raw.firstMilestone || "Ship one usable end-to-end flow.",
        risks: fallbackList(raw.risks).slice(0, 3).length ? fallbackList(raw.risks).slice(0, 3) : ["Execution risks not explicitly stated."],
        feasibilityScore,
    };
};

const normalizeAnalysisData = (data: AnalysisData): AnalysisData => {
    const opportunities = Array.isArray(data.opportunities) ? data.opportunities : [];
    if (opportunities.length) {
        const byType = new Map<OpportunityPath["type"], OpportunityPath>();
        for (const raw of opportunities) {
            const t = (raw?.type || "platform") as OpportunityPath["type"];
            const safeType = t === "feature" || t === "api_plugin" || t === "platform" ? t : "platform";
            byType.set(safeType, normalizeOpportunity(raw, safeType));
        }
        for (const t of ["feature", "api_plugin", "platform"] as OpportunityPath["type"][]) {
            if (!byType.has(t)) byType.set(t, normalizeOpportunity({}, t));
        }
        const sorted = Array.from(byType.values()).sort((a, b) => (b.feasibilityScore || 0) - (a.feasibilityScore || 0));
        const recType = data.recommendedPathComputed || data.recommendedPath || sorted[0].type;
        return {
            ...data,
            opportunities: sorted,
            recommendedPathComputed: recType,
            recommendationReasonComputed: data.recommendationReasonComputed || data.recommendationReason || "Feasibility-first path selected.",
        };
    }

    if (data.startupIdea) {
        const legacyPath = normalizeOpportunity(
            {
                type: "platform",
                name: data.startupIdea.startupName,
                oneLiner: data.startupIdea.oneLiner,
                targetUser: data.startupIdea.targetUser,
                coreValue: data.startupIdea.product?.coreFeature,
                integrationSurface: "Standalone product",
                coreTech: data.startupIdea.coreTech,
                product: data.startupIdea.product,
                business: data.startupIdea.business,
                whyNow: data.startupIdea.theHook,
                buildScopeWeeks: toInt(data.startupIdea.metrics?.mvpMonths, 2) * 4,
                competition: data.startupIdea.metrics?.competition,
                novelty: data.startupIdea.metrics?.novelty,
                confidence: data.startupIdea.metrics?.confidence,
                firstMilestone: data.startupIdea.product?.coreFeature,
            },
            "platform"
        );
        return {
            ...data,
            opportunities: [
                normalizeOpportunity({}, "feature"),
                normalizeOpportunity({}, "api_plugin"),
                legacyPath,
            ],
            recommendedPathComputed: "platform",
            recommendationReasonComputed: "Legacy analysis provided one platform thesis.",
        };
    }

    return data;
};

const extractArxivId = (input: string): string | null => {
    const trimmed = input.trim();
    if (/^\d{4}\.\d{4,5}(v\d+)?$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/);
    if (match) return match[1];
    const simpleMatch = trimmed.match(/(\d{4}\.\d{4,5}(?:v\d+)?)/);
    if (simpleMatch) return simpleMatch[1];
    return null;
};

const loadSessions = (): Session[] => {
    if (typeof window === "undefined") return [];
    try {
        const stored = localStorage.getItem("forge-sessions");
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

const saveSessions = (sessions: Session[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("forge-sessions", JSON.stringify(sessions));
};

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<ForgeUser | null>(null);
    const [mode, setMode] = useState<AppMode>("paper");
    const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("");
    const [streamOutput, setStreamOutput] = useState("");
    const [error, setError] = useState("");
    const [tab, setTab] = useState<Tab>("analysis");
    const [researchingCompetitors, setResearchingCompetitors] = useState(false);
    const [numPapers, setNumPapers] = useState(5);

    const runConstellation = async (sessionId: string, meta: ArxivMeta) => {
        setAnalyzing(true);
        setProgress(5);
        setStatusText("Initializing constellation mapping...");
        setStreamOutput("");

        try {
            const payload = {
                ...meta,
                model: selectedModel,
                arxivId: meta.arxivId || extractArxivId(input) || meta.title,
                userId: user?.id || "anonymous",
                total_papers: numPapers
            };

            const res = await fetch("/api/analyze-constellation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok || !res.body) throw new Error(`Constellation failed: ${res.status}`);

            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let buf = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const ev = JSON.parse(line.slice(6));
                        if (ev.type === "status") {
                            setStatusText(ev.message);
                            setProgress(prev => Math.min(prev + 15, 80));
                        }
                        if (ev.type === "delta") {
                            setStreamOutput(ev.text);
                            setStatusText("Synthesizing papers...");
                            setProgress(85);
                        }
                        if (ev.type === "done") {
                            const rawData: AnalysisData = typeof ev.analysis === "string" ? JSON.parse(ev.analysis) : ev.analysis;
                            const data = normalizeAnalysisData(rawData);
                            setSessions(prev => {
                                const updated = prev.map(s => s.id === sessionId ? { ...s, data, meta } : s);
                                saveSessions(updated);
                                return updated;
                            });
                            setProgress(100);
                        }
                        if (ev.type === "error") throw new Error(ev.message);
                    } catch { /* partial */ }
                }
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Constellation failed");
        } finally {
            setAnalyzing(false);
            setProgress(0);
            setStatusText("");
        }
    };

    useEffect(() => {
        const stored = localStorage.getItem("forge-user");
        if (!stored) { router.replace("/"); return; }
        setUser(JSON.parse(stored));
        setSessions(loadSessions());
    }, [router]);

    const currentSession = sessions.find(s => s.id === currentSessionId);
    const currentPaperData = currentSession?.data ? normalizeAnalysisData(currentSession.data) : undefined;

    const handleNewSearch = () => {
        setCurrentSessionId(null);
        setInput("");
        setError("");
        setStreamOutput("");
    };

    const runAnalysis = async (sessionId: string, meta: ArxivMeta) => {
        setAnalyzing(true);
        setProgress(10);
        setStatusText("Reading paper...");
        setStreamOutput("");

        try {
            const payload = {
                ...meta,
                model: selectedModel,
                arxivId: meta.title,  // the id gets parsed or passed here if tracked
                userId: user?.id || "anonymous"
            };

            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok || !res.body) throw new Error(`Analysis failed: ${res.status}`);

            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let buf = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const ev = JSON.parse(line.slice(6));
                        if (ev.type === "delta") setStreamOutput(ev.text);
                        if (ev.type === "done") {
                            const rawData: AnalysisData = typeof ev.analysis === "string" ? JSON.parse(ev.analysis) : ev.analysis;
                            const data = normalizeAnalysisData(rawData);
                            setSessions(prev => {
                                const updated = prev.map(s => s.id === sessionId ? { ...s, data, meta } : s);
                                saveSessions(updated);
                                return updated;
                            });
                            setProgress(100);
                        }
                        if (ev.type === "error") throw new Error(ev.message);
                    } catch { /* partial */ }
                }
            }

        } catch (e) {
            setError(e instanceof Error ? e.message : "Analysis failed");
        } finally {
            setAnalyzing(false);
            setProgress(0);
            setStatusText("");
        }
    };

    const runSaasBoost = async (sessionId: string, description: string) => {
        setAnalyzing(true);
        setProgress(20);
        setStatusText("Scouting relevant research...");
        setStreamOutput("");

        try {
            const res = await fetch("/api/analyze-saas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description, model: selectedModel }),
            });

            if (!res.ok || !res.body) throw new Error(`SaaS Boost failed: ${res.status}`);

            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let buf = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const ev = JSON.parse(line.slice(6));
                        if (ev.type === "delta") setStreamOutput(ev.text);
                        if (ev.type === "done") {
                            const rawData: AnalysisData = typeof ev.analysis === "string" ? JSON.parse(ev.analysis) : ev.analysis;
                            const data = normalizeAnalysisData(rawData);
                            setSessions(prev => {
                                const updated = prev.map(s => s.id === sessionId ? { ...s, data } : s);
                                saveSessions(updated);
                                return updated;
                            });
                            setProgress(100);
                        }
                        if (ev.type === "error") throw new Error(ev.message);
                    } catch { /* partial */ }
                }
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "SaaS integration failed");
        } finally {
            setAnalyzing(false);
            setProgress(0);
            setStatusText("");
        }
    };

    const handleAnalyze = async (manualId?: string, manualMode?: AppMode, manualInput?: string) => {
        const targetMode = manualMode || mode;
        const targetInput = manualInput || input;

        if (!targetInput.trim()) return;
        setError("");

        const sessionId = targetMode === "saas"
            ? `saas_${Date.now()}`
            : extractArxivId(targetInput) || `manual_${Date.now()}`;

        let meta: ArxivMeta | undefined;

        if ((targetMode === "paper" || targetMode === "constellation") && extractArxivId(targetInput)) {
            setLoading(true);
            try {
                const res = await fetch(`/api/arxiv?id=${encodeURIComponent(extractArxivId(targetInput)!)}`);
                if (!res.ok) throw new Error("Failed to fetch paper");
                meta = await res.json();
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to fetch paper");
                setLoading(false);
                return;
            }
            setLoading(false);
        }

        const newSession: Session = {
            id: sessionId,
            mode: targetMode,
            title: targetMode === "paper" || targetMode === "constellation"
                ? (meta?.title?.slice(0, 40) + "...") || targetInput
                : targetInput.slice(0, 40) + "...",
            timestamp: new Date().toISOString(),
            arxivId: extractArxivId(targetInput) || undefined,
            meta,
        };

        const updated = [newSession, ...sessions];
        setSessions(updated);
        saveSessions(updated);
        setCurrentSessionId(sessionId);

        if (targetMode === "paper" && meta) {
            await runAnalysis(sessionId, meta);
        } else if (targetMode === "constellation" && meta) {
            await runConstellation(sessionId, meta);
        } else if (targetMode === "saas") {
            await runSaasBoost(sessionId, targetInput);
        }
    };

    const loadSession = (id: string) => {
        const s = sessions.find(sess => sess.id === id);
        if (s) {
            setMode(s.mode);
            setCurrentSessionId(id);
            setTab("analysis");
        }
    };

    const deleteSession = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const filtered = sessions.filter(s => s.id !== id);
        setSessions(filtered);
        saveSessions(filtered);
        if (currentSessionId === id) setCurrentSessionId(null);
    };

    const clearAllSessions = () => {
        setSessions([]);
        saveSessions([]);
        setCurrentSessionId(null);
    };

    const runCompetitorSearch = async () => {
        const normalized = currentSession?.data ? normalizeAnalysisData(currentSession.data) : undefined;
        if (!normalized?.opportunities?.length) return;
        setResearchingCompetitors(true);
        setError("");

        try {
            const recType = normalized.recommendedPathComputed || normalized.recommendedPath || normalized.opportunities[0].type;
            const selected = normalized.opportunities.find((o) => o.type === recType) || normalized.opportunities[0];
            const target = selected.targetUser;
            const ideaContext = [
                `Path Type: ${selected.type}`,
                `Idea Name: ${selected.name}`,
                `One-liner: ${selected.oneLiner}`,
                `Target User: ${target.persona}`,
                `Pain Point: ${target.painPoint}`,
                `Core Feature: ${selected.product?.coreFeature || "Unknown"}`,
                `Integration Surface: ${selected.integrationSurface || "Unknown"}`,
            ].join("\n");

            const res = await fetch("/api/analyze-competitors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ideaContext, model: selectedModel }),
            });

            if (!res.ok || !res.body) throw new Error(`Competitor search failed: ${res.status}`);

            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let buf = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const ev = JSON.parse(line.slice(6));
                        // Stream output not strictly needed for this simple UI update currently. 
                        if (ev.type === "done") {
                            const compData: CompetitorIntelligence = typeof ev.analysis === "string" ? JSON.parse(ev.analysis) : ev.analysis;
                            setSessions(prev => {
                                const updated = prev.map(s => s.id === currentSessionId ? {
                                    ...s,
                                    data: {
                                        ...s.data!,
                                        competitorIntelligence: compData,
                                        competitorIntelligenceByPath: {
                                            ...(s.data?.competitorIntelligenceByPath || {}),
                                            [selected.type]: compData,
                                        },
                                    }
                                } : s);
                                saveSessions(updated);
                                return updated;
                            });
                        }
                        if (ev.type === "error") throw new Error(ev.message);
                    } catch { /* partial */ }
                }
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Competitor search failed");
        } finally {
            setResearchingCompetitors(false);
        }
    };

    if (!user) return (
        <div className="h-[100dvh] bg-bg flex items-center justify-center">
            <Spinner size={24} />
        </div>
    );

    return (
        <div className="h-[100dvh] flex flex-col overflow-hidden bg-bg">
            {/* Ambient */}
            <div className="absolute inset-0 pointer-events-none opacity-10" style={{ background: 'radial-gradient(circle at 30% 20%, var(--accent-dim), transparent 50%)' }} />

            {/* Nav */}
            <nav className="h-[50px] border-b border-border px-4 flex items-center justify-between bg-surface/80 backdrop-blur-md shrink-0 z-10">
                <div className="flex items-center gap-[18px]">
                    <Link href="/" className="flex items-center gap-2 cursor-pointer no-underline group">
                        <span className="font-extrabold text-xl tracking-tight text-text">FORGE</span>
                        <span className="text-accent text-[1.2rem] font-mono leading-none">⬡</span>
                    </Link>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-[7px]">
                        <Avatar name={user.name} role={user.role} size={24} />
                        <div>
                            <div className="text-text text-[0.72rem] font-mono font-semibold leading-[1.2]">{user.name}</div>
                            <RoleBadge role={user.role} />
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className="w-[280px] border-r border-border bg-surface/40 backdrop-blur-sm flex flex-col shrink-0">
                    {/* Model Selector */}
                    <div className="p-3 border-b border-border">
                        <label className="text-[0.6rem] font-mono text-muted uppercase tracking-wider mb-1.5 block">AI Intelligence</label>
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="field text-[0.7rem] bg-bg cursor-pointer"
                            disabled={analyzing}
                        >
                            {AVAILABLE_MODELS.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Mode Toggle */}
                    <div className="p-3 border-b border-border">
                        <div className="flex gap-[1px] bg-bg rounded-md p-[2px]">
                            <button
                                onClick={() => { setMode("paper"); setCurrentSessionId(null); }}
                                className={`flex-1 px-2 py-1.5 text-[0.65rem] font-mono uppercase tracking-wide rounded-sm transition-all ${mode === "paper" ? "bg-elevated text-text shadow-sm" : "text-muted hover:text-text"}`}
                            >
                                📄 Paper
                            </button>
                            <button
                                onClick={() => { setMode("constellation"); setCurrentSessionId(null); }}
                                className={`flex-1 px-2 py-1.5 text-[0.65rem] font-mono uppercase tracking-wide rounded-sm transition-all ${mode === "constellation" ? "bg-elevated text-text shadow-sm" : "text-muted hover:text-text"}`}
                            >
                                ✨ Constell
                            </button>
                            <button
                                onClick={() => { setMode("saas"); setCurrentSessionId(null); }}
                                className={`flex-1 px-2 py-1.5 text-[0.65rem] font-mono uppercase tracking-wide rounded-sm transition-all ${mode === "saas" ? "bg-elevated text-text shadow-sm" : "text-muted hover:text-text"}`}
                            >
                                💼 SaaS
                            </button>
                        </div>
                    </div>

                    {/* Input */}
                    <div className="p-3 border-b border-border">
                        {mode === "paper" || mode === "constellation" ? (
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleAnalyze()}
                                placeholder={mode === "constellation" ? "Seed arXiv ID..." : "arXiv ID (e.g. 2409.13449)"}
                                className="field text-[0.75rem]"
                                disabled={analyzing}
                            />
                        ) : (
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Describe your SaaS product... (e.g. A B2B platform that automates API testing using AI)"
                                className="field text-[0.75rem]"
                                rows={3}
                                disabled={analyzing}
                            />
                        )}

                        {mode === "constellation" && !analyzing && (
                            <div className="mt-3 px-1 animate-fade-in">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[0.6rem] font-mono text-muted uppercase tracking-wider">Context Depth</label>
                                    <span className="text-[0.6rem] font-mono text-accent">{numPapers} papers</span>
                                </div>
                                <input
                                    type="range"
                                    min="2"
                                    max="10"
                                    value={numPapers}
                                    onChange={e => setNumPapers(parseInt(e.target.value))}
                                    className="w-full h-1 bg-bg rounded-lg appearance-none cursor-pointer accent-accent"
                                />
                            </div>
                        )}

                        <button
                            onClick={() => void handleAnalyze()}
                            disabled={!input.trim() || analyzing || loading}
                            className="btn-primary w-full mt-2 text-[0.7rem]"
                        >
                            {loading ? "Fetching..." : analyzing ? "Analyzing..." : mode === "constellation" ? "Synthesize Constellation" : mode === "paper" ? "Distill Blueprint" : "Find Research Boosts"}
                        </button>
                        {error && <p className="text-red-custom text-[0.65rem] mt-2 font-mono">{error}</p>}
                    </div>

                    {/* Progress */}
                    {analyzing && (
                        <div className="px-3 pb-3">
                            <div className="h-1 bg-bg rounded-full overflow-hidden mb-1">
                                <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-[0.6rem] text-muted font-mono">{statusText}</p>
                            {streamOutput && (
                                <div className="mt-2 p-2 bg-bg rounded text-[0.55rem] text-faint font-mono max-h-20 overflow-y-auto">
                                    {streamOutput.slice(-300)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* History */}
                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="flex justify-between items-center px-2 mb-2">
                            <span className="text-[0.6rem] font-mono text-muted uppercase tracking-wide">History</span>
                            {sessions.length > 0 && (
                                <button onClick={clearAllSessions} className="text-[0.6rem] text-muted hover:text-red-custom font-mono">
                                    Clear
                                </button>
                            )}
                        </div>
                        {sessions.length === 0 ? (
                            <p className="text-[0.65rem] text-muted text-center py-4">No analyses yet</p>
                        ) : (
                            sessions.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => loadSession(s.id)}
                                    className={`p-2 rounded-md cursor-pointer mb-1 transition-all ${currentSessionId === s.id ? "bg-elevated border border-border-h" : "hover:bg-surface border border-transparent"}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <span className="text-[0.55rem]">{s.mode === "paper" ? "📄" : "💼"}</span>
                                                <span className="text-[0.7rem] text-text font-mono truncate">{s.title}</span>
                                            </div>
                                            <span className="text-[0.55rem] text-faint font-mono">
                                                {new Date(s.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <button
                                            onClick={e => deleteSession(s.id, e)}
                                            className="text-[0.6rem] text-muted hover:text-red-custom px-1"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-4 relative">
                    {currentSession ? (
                        <div className="max-w-4xl mx-auto animate-fade-up">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <button onClick={handleNewSearch} className="text-accent text-[0.7rem] font-mono hover:underline mb-2">
                                        ← New Search
                                    </button>
                                    <div className="flex items-center gap-2">
                                        {currentSession.mode === "constellation" && <span className="text-2xl pt-1">✨</span>}
                                        <h1 className="text-text text-[1.1rem] font-bold leading-tight">
                                            {currentSession.mode === "saas" ? "Research Boosts" : currentSession.title}
                                        </h1>
                                    </div>
                                    {(currentSession.mode === "paper" || currentSession.mode === "constellation") && currentPaperData?.opportunities?.length && (
                                        <p className="text-muted text-[0.8rem] mt-1">
                                            {currentPaperData.opportunities.find((o) => o.type === (currentPaperData.recommendedPathComputed || currentPaperData.recommendedPath))
                                                ?.oneLiner || currentPaperData.opportunities[0].oneLiner}
                                        </p>
                                    )}
                                </div>
                                {currentSession.arxivId && (
                                    <Tag text={currentSession.arxivId} color="var(--color-muted)" />
                                )}
                            </div>

                            {currentSession.mode === "saas" ? (
                                /* SaaS Mode Results */
                                <div className="space-y-4">
                                    {currentSession.data?.overallStrategy && (
                                        <div className="card p-4">
                                            <SectionLabel>Overall R&D Strategy</SectionLabel>
                                            <p className="text-text text-[0.85rem] leading-relaxed mt-1">
                                                {currentSession.data.overallStrategy}
                                            </p>
                                        </div>
                                    )}

                                    {currentSession.data?.papers?.map((paper, i) => (
                                        <div key={i} className="card p-4 hover:border-border-h transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-text text-[0.9rem] font-semibold">{paper.title}</h3>
                                                <a href={`https://arxiv.org/abs/${paper.arxivId}`} target="_blank" className="text-accent text-[0.65rem] font-mono hover:underline">
                                                    arXiv:{paper.arxivId} · {paper.year}
                                                </a>
                                            </div>
                                            <p className="text-muted text-[0.8rem] mb-2"><span className="text-accent">Relevance:</span> {paper.relevance}</p>
                                            <div className="bg-bg p-2 rounded-md mb-2">
                                                <p className="text-[0.75rem] text-text"><span className="text-accent">💡 Boost:</span> {paper.boostIdea}</p>
                                            </div>
                                            <p className="text-faint text-[0.7rem] italic mb-2">{paper.implementationHint}</p>
                                            <div className="flex gap-2">
                                                <span className="text-[0.6rem] font-mono px-2 py-0.5 bg-surface rounded border border-border">Difficulty: {paper.difficulty}</span>
                                                <span className="text-[0.6rem] font-mono px-2 py-0.5 bg-surface rounded border border-border">Impact: {paper.impact}</span>
                                            </div>
                                            <div className="mt-4 flex justify-end">
                                                <button
                                                    onClick={() => {
                                                        setMode("paper");
                                                        setInput(paper.arxivId);
                                                        handleAnalyze(undefined, "paper", paper.arxivId);
                                                    }}
                                                    className="text-[0.65rem] font-mono text-accent hover:underline flex items-center gap-1"
                                                >
                                                    Distill this paper →
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Paper Mode Results */
                                <>
                                    {/* Tabs */}
                                    <div className="flex gap-1 mb-4 border-b border-border pb-1">
                                        {(["analysis", "competitors"] as Tab[]).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setTab(t)}
                                                className={`px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-wide rounded-t-sm transition-all ${tab === t ? "bg-surface text-text border-b-2 border-accent" : "text-muted hover:text-text"}`}
                                            >
                                                {t === "analysis" ? "📄 Paper Analysis" : "🕵️ Competitors"}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Analysis Tab */}
                                    {tab === "analysis" && (
                                        <div className="space-y-4">
                                            {currentPaperData?.paperAnalysis && (
                                                <>
                                                    <div className="card p-4">
                                                        <SectionLabel>Paper Brief</SectionLabel>
                                                        <p className="text-text text-[0.88rem] mt-1 font-semibold">{currentSession.meta?.title || currentSession.title}</p>
                                                        {currentSession.meta?.authors?.length ? (
                                                            <p className="text-muted text-[0.72rem] mt-1 font-mono">{currentSession.meta.authors.slice(0, 6).join(", ")}</p>
                                                        ) : null}
                                                        <p className="text-[#8fa3be] text-[0.85rem] leading-relaxed mt-2">
                                                            {clip(currentPaperData.paperAnalysis.introOverview || currentPaperData.paperAnalysis.summary || "Not explicitly stated.", 360)}
                                                        </p>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div className="card p-3">
                                                            <SectionLabel>Context & Problem</SectionLabel>
                                                            <p className="text-text text-[0.8rem] mt-1">{clip(currentPaperData.paperAnalysis.practicalTakeaway || "Not explicitly stated.", 260)}</p>
                                                            <p className="text-muted text-[0.78rem] mt-2"><span className="text-accent">Problem:</span> {clip(currentPaperData.paperAnalysis.researchProblem || "Not explicitly stated.", 220)}</p>
                                                        </div>
                                                        <div className="card p-3">
                                                            <SectionLabel>Method</SectionLabel>
                                                            <p className="text-text text-[0.8rem] mt-1">{clip(currentPaperData.paperAnalysis.methodInPlainEnglish || "Not explicitly stated.", 280)}</p>
                                                            <p className="text-muted text-[0.78rem] mt-2"><span className="text-accent">Novelty:</span> {clip(currentPaperData.paperAnalysis.whatIsNewVsPrior || "Not explicitly stated.", 220)}</p>
                                                        </div>
                                                    </div>

                                                    <div className="card p-3">
                                                        <SectionLabel>Evidence</SectionLabel>
                                                        <ul className="text-muted text-[0.78rem] mt-1 space-y-1">
                                                            {(fallbackList(currentPaperData.paperAnalysis.evidenceAndResults).slice(0, 4).length
                                                                ? fallbackList(currentPaperData.paperAnalysis.evidenceAndResults).slice(0, 4)
                                                                : ["Not explicitly stated."]).map((row, i) => (
                                                                    <li key={i}>• {clip(row, 220)}</li>
                                                                ))}
                                                        </ul>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div className="card p-3">
                                                            <SectionLabel>Limits & Assumptions</SectionLabel>
                                                            <ul className="text-muted text-[0.78rem] mt-1 space-y-1">
                                                                {(fallbackList(currentPaperData.paperAnalysis.limitations).slice(0, 3).length
                                                                    ? fallbackList(currentPaperData.paperAnalysis.limitations).slice(0, 3)
                                                                    : ["Not explicitly stated."]).map((row, i) => <li key={i}>• {clip(row, 200)}</li>)}
                                                            </ul>
                                                        </div>
                                                        <div className="card p-3">
                                                            <SectionLabel>Practical Implications</SectionLabel>
                                                            <ul className="text-muted text-[0.78rem] mt-1 space-y-1">
                                                                {(fallbackList(currentPaperData.paperAnalysis.applications).slice(0, 3).length
                                                                    ? fallbackList(currentPaperData.paperAnalysis.applications).slice(0, 3)
                                                                    : ["Not explicitly stated."]).map((row, i) => <li key={i}>• {clip(row, 200)}</li>)}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            <div className="border-t border-border my-2" />

                                            {currentPaperData?.opportunities?.length ? (
                                                <>
                                                    {(() => {
                                                        const recType = currentPaperData.recommendedPathComputed || currentPaperData.recommendedPath || currentPaperData.opportunities[0].type;
                                                        const recommended = currentPaperData.opportunities.find((o) => o.type === recType) || currentPaperData.opportunities[0];
                                                        const backups = currentPaperData.opportunities.filter((o) => o.type !== recommended.type).slice(0, 2);
                                                        return (
                                                            <>
                                                                <div className="card p-4 border-l-4 border-accent">
                                                                    <SectionLabel>Recommended Thesis</SectionLabel>
                                                                    <h3 className="text-text text-[0.95rem] font-semibold mt-1">{recommended.name}</h3>
                                                                    <p className="text-muted text-[0.8rem] mt-1">{recommended.oneLiner}</p>
                                                                    <p className="text-faint text-[0.72rem] mt-2">{currentPaperData.recommendationReasonComputed || currentPaperData.recommendationReason || "Feasibility-first path selected."}</p>
                                                                    <div className="grid grid-cols-4 gap-2 mt-3">
                                                                        <div className="bg-bg p-2 rounded border border-border text-center"><div className="text-[0.55rem] text-muted font-mono uppercase">Path</div><div className="text-[0.72rem] text-accent font-semibold">{PATH_LABELS[recommended.type]}</div></div>
                                                                        <div className="bg-bg p-2 rounded border border-border text-center"><div className="text-[0.55rem] text-muted font-mono uppercase">Build</div><div className="text-[0.72rem] text-text font-semibold">{recommended.buildScopeWeeks}w</div></div>
                                                                        <div className="bg-bg p-2 rounded border border-border text-center"><div className="text-[0.55rem] text-muted font-mono uppercase">Conf.</div><div className="text-[0.72rem] text-text font-semibold">{recommended.confidence}/10</div></div>
                                                                        <div className="bg-bg p-2 rounded border border-border text-center"><div className="text-[0.55rem] text-muted font-mono uppercase">Feas.</div><div className="text-[0.72rem] text-text font-semibold">{recommended.feasibilityScore ?? "?"}/10</div></div>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                    {backups.map((backup) => (
                                                                        <div key={backup.type} className="card p-3">
                                                                            <SectionLabel>Backup: {PATH_LABELS[backup.type]}</SectionLabel>
                                                                            <p className="text-text text-[0.8rem] mt-1">{backup.name}</p>
                                                                            <p className="text-muted text-[0.75rem] mt-1">{clip(backup.oneLiner, 180)}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </>
                                            ) : null}
                                        </div>
                                    )}

                                    {/* Competitors Tab */}
                                    {tab === "competitors" && (
                                        <div>
                                            {(() => {
                                                const normalized = currentPaperData;
                                                const recType = normalized?.recommendedPathComputed || normalized?.recommendedPath || normalized?.opportunities?.[0]?.type;
                                                const competitorData = (recType && normalized?.competitorIntelligenceByPath?.[recType]) || normalized?.competitorIntelligence;
                                                return competitorData ? (
                                                    <div className="space-y-3">
                                                        <div className="card p-3 bg-blue-dim border-blue/30">
                                                            <SectionLabel>Market Verdict</SectionLabel>
                                                            <p className="text-text text-[0.85rem] mt-1">{competitorData.marketVerdict}</p>
                                                        </div>

                                                        {competitorData.competitors.length === 0 ? (
                                                            <div className="card p-4 text-center">
                                                                <p className="text-sage-custom text-[0.85rem]">🎉 No direct competitors found! Blue ocean territory.</p>
                                                            </div>
                                                        ) : (
                                                            competitorData.competitors.map((comp, i) => (
                                                                <div key={i} className="card p-3">
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <h4 className="text-text text-[0.9rem] font-semibold">{comp.name}</h4>
                                                                        <a href={comp.url} target="_blank" className="text-accent text-[0.65rem] hover:underline">Visit</a>
                                                                    </div>
                                                                    <p className="text-muted text-[0.75rem]">{comp.description}</p>
                                                                    <p className="text-faint text-[0.7rem] mt-1">Pricing: {comp.pricing}</p>
                                                                    <div className="mt-2 pl-2 border-l-2 border-accent/40">
                                                                        <p className="text-[0.7rem] text-text"><span className="text-accent">Why we win:</span> {comp.differentiation}</p>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="card p-6 text-center">
                                                        <p className="text-muted text-[0.8rem] mb-4">Run a live search to find current competitors for this idea.</p>
                                                        <button
                                                            onClick={runCompetitorSearch}
                                                            disabled={researchingCompetitors}
                                                            className="btn-primary"
                                                        >
                                                            {researchingCompetitors ? "Searching..." : "🔍 Run Deep Competitor Research"}
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                </>
                            )}
                        </div>
                    ) : (
                        /* Empty State */
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="text-accent text-[3rem] mb-4 font-extrabold tracking-tight">
                                {mode === "paper" ? "Distill Intelligence." : "Boost Your SaaS."}
                            </div>
                            <p className="text-muted text-[0.9rem] max-w-md mb-6">
                                {mode === "paper"
                                    ? "Enter an arXiv paper to find the best startup idea. We'll analyze the research and generate actionable insights."
                                    : "Describe your SaaS product to find the most relevant academic research to give it a technical edge."
                                }
                            </p>
                            <div className="flex gap-4 text-[0.7rem] font-mono text-muted">
                                {mode === "paper" ? (
                                    <>
                                        <div className="text-center">
                                            <div className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center mx-auto mb-2 text-accent">01</div>
                                            Ingest Paper
                                        </div>
                                        <div className="text-center">
                                            <div className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center mx-auto mb-2 text-accent">02</div>
                                            Analyze
                                        </div>
                                        <div className="text-center">
                                            <div className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center mx-auto mb-2 text-accent">03</div>
                                            Explore Ideas
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-center">
                                            <div className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center mx-auto mb-2 text-accent">01</div>
                                            Describe
                                        </div>
                                        <div className="text-center">
                                            <div className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center mx-auto mb-2 text-accent">02</div>
                                            Scout
                                        </div>
                                        <div className="text-center">
                                            <div className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center mx-auto mb-2 text-accent">03</div>
                                            Boost
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
