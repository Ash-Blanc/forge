"use client";
// app/page.tsx

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PaperCard from "@/components/PaperCard";
import DetailPanel from "@/components/DetailPanel";
import SubmitModal from "@/components/SubmitModal";
import { Avatar, RoleBadge, Spinner, EmptyState } from "@/components/ui";
import type { ForgePaper, ForgeUser } from "@/lib/types";
import type { ForgeAnalysis } from "@/lib/claude";
import type { ArxivMeta } from "@/lib/arxiv";

const FILTERS = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "building", label: "Building" },
    { key: "shipped", label: "Shipped" },
];

export default function FeedPage() {
    const router = useRouter();
    const [user, setUser] = useState<ForgeUser | null>(null);
    const [papers, setPapers] = useState<ForgePaper[]>([]);
    const [selected, setSelected] = useState<ForgePaper | null>(null);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [showSubmit, setShowSubmit] = useState(false);

    // Auth check
    useEffect(() => {
        const stored = localStorage.getItem("forge-user");
        if (!stored) { router.replace("/"); return; }
        setUser(JSON.parse(stored));
    }, [router]);

    // Fetch papers
    const fetchPapers = useCallback(async (f = filter) => {
        const qs = f !== "all" ? `?status=${f}` : "";
        try {
            const res = await fetch(`/api/papers${qs}`);
            if (!res.ok) return;
            const data: ForgePaper[] = await res.json();
            setPapers(data);
            setSelected(prev => prev ? (data.find(p => p.id === prev.id) ?? data[0] ?? null) : data[0] ?? null);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { fetchPapers(); }, [fetchPapers]);

    const refreshPaper = async (id: string) => {
        const res = await fetch(`/api/papers/${id}`);
        if (!res.ok) return;
        const p: ForgePaper = await res.json();
        setPapers(prev => prev.map(x => x.id === id ? p : x));
        setSelected(prev => prev?.id === id ? p : prev);
    };

    // Social
    const social = async (body: object) => {
        if (!user) return;
        await fetch("/api/social", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, userId: user.id, userName: user.name, userRole: user.role }),
        });
    };

    const handleFollow = async (paperId: string) => {
        await social({ action: "follow", paperId });
        await refreshPaper(paperId);
    };

    const handleClaim = async (paperId: string) => {
        await social({ action: "claim", paperId });
        await refreshPaper(paperId);
        fetchPapers();
    };

    const handleComment = async (paperId: string, text: string) => {
        await social({ action: "comment", paperId, text });
        await refreshPaper(paperId);
    };

    const handleBuildUpdate = async (paperId: string, text: string) => {
        await social({ action: "buildUpdate", paperId, text });
        await refreshPaper(paperId);
    };

    const handlePublish = async (arxivId: string, meta: ArxivMeta, analysis: ForgeAnalysis) => {
        if (!user) return;
        await fetch("/api/papers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ arxivId, userId: user.id, userName: user.name, userRole: user.role, meta, analysis }),
        });
        await fetchPapers("all");
        setFilter("all");
    };

    const handleFilterChange = (f: string) => {
        setFilter(f);
        setLoading(true);
        fetchPapers(f);
    };

    if (!user) return (
        <div className="h-[100dvh] bg-bg flex items-center justify-center">
            <Spinner size={24} />
        </div>
    );

    return (
        <div className="h-[100dvh] flex flex-col overflow-hidden bg-bg relative">
            {/* Ambient Background Noise/Gradient */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: 'radial-gradient(circle at 50% -20%, var(--color-blue-dim), transparent 50%)' }} />

            {/* Nav */}
            <nav className="h-[50px] border-b border-border px-4 flex items-center justify-between bg-surface/80 backdrop-blur-md shrink-0 z-10">
                <div className="flex items-center gap-[18px]">
                    {/* Wordmark */}
                    <Link href="/" className="flex items-baseline gap-2 cursor-pointer no-underline">
                        <span className="font-extrabold text-[0.9375rem] tracking-tight text-text">FORGE</span>
                        <span className="text-faint text-[0.67rem] font-mono hover:text-muted transition-colors">research → reality</span>
                    </Link>

                    {/* Filters */}
                    <div className="flex gap-[1px]">
                        {FILTERS.map(f => (
                            <button key={f.key} onClick={() => handleFilterChange(f.key)} className={`px-[9px] py-[3px] border-none rounded-sm text-[0.67rem] cursor-pointer font-mono transition-all duration-150 ${filter === f.key ? "bg-elevated text-text shadow-sm" : "bg-transparent text-muted hover:text-text hover:bg-surface"
                                }`}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* User + CTA */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-[7px]">
                        <Avatar name={user.name} role={user.role} size={24} />
                        <div>
                            <div className="text-text text-[0.72rem] font-mono font-semibold leading-[1.2]">{user.name}</div>
                            <RoleBadge role={user.role} />
                        </div>
                    </div>
                    <button onClick={() => setShowSubmit(true)} className="btn-primary">
                        Submit Paper
                    </button>
                </div>
            </nav>

            {/* Main */}
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] flex-1 overflow-hidden max-w-[1400px] w-full mx-auto relative z-10">

                {/* Feed */}
                <div className="scroll-y p-[12px_14px] border-r border-border/50 bg-bg/40 backdrop-blur-sm">
                    {loading && (
                        <div className="flex justify-center pt-10">
                            <Spinner />
                        </div>
                    )}

                    {!loading && papers.length === 0 && (
                        <EmptyState icon="·" title="Nothing here yet" sub='Submit a paper to get started.' />
                    )}

                    {!loading && papers.map(p => (
                        <PaperCard
                            key={p.id}
                            paper={p}
                            selected={selected?.id === p.id}
                            user={user}
                            onSelect={setSelected}
                            onFollow={handleFollow}
                            onClaim={handleClaim}
                        />
                    ))}
                </div>

                {/* Detail */}
                <div className="scroll-y p-3 flex flex-col gap-[10px] bg-bg/20">
                    {selected ? (
                        <DetailPanel
                            key={selected.id}
                            paper={selected}
                            user={user}
                            onFollow={handleFollow}
                            onClaim={handleClaim}
                            onComment={handleComment}
                            onBuildUpdate={handleBuildUpdate}
                            onRefresh={() => refreshPaper(selected.id)}
                        />
                    ) : (
                        <div className="card p-[28px_20px] flex items-center justify-center h-full border-dashed border-border/50 bg-transparent">
                            <EmptyState icon="·" title="Select a paper" sub="Click any entry to read the full analysis." />
                        </div>
                    )}
                </div>
            </div>

            {showSubmit && (
                <SubmitModal user={user} onPublish={handlePublish} onClose={() => setShowSubmit(false)} />
            )}
        </div>
    );
}