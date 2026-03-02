"use client";
// components/DetailPanel.tsx

import { useState, useEffect, useRef } from "react";
import { Avatar, RoleBadge, Tag, MetaChip, SectionLabel, StatusDot, TimeAgo, EmptyState } from "./ui";
import type { ForgePaper, ForgeUser } from "@/lib/types";

interface Props {
    paper: ForgePaper;
    user: ForgeUser | null;
    onFollow: (paperId: string) => void;
    onClaim: (paperId: string) => void;
    onComment: (paperId: string, text: string) => Promise<void>;
    onBuildUpdate: (paperId: string, text: string) => Promise<void>;
    onRefresh: () => void;
}

type Tab = "analysis" | "discussion" | "build";

export default function DetailPanel({ paper, user, onFollow, onClaim, onComment, onBuildUpdate, onRefresh }: Props) {
    const [tab, setTab] = useState<Tab>("analysis");
    const [typed, setTyped] = useState("");
    const [typing, setTyping] = useState(false);
    const [comment, setComment] = useState("");
    const [update, setUpdate] = useState("");
    const [posting, setPosting] = useState(false);
    const timRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const following = paper.followers.some(f => f.userId === user?.id);
    const myClaim = paper.claims.find(c => c.userId === user?.id);
    const claimant = paper.claims[0];

    // Typewriter narrative
    useEffect(() => {
        if (timRef.current) clearInterval(timRef.current);
        const text = paper.narrativeAnalysis ?? "";
        if (!text) { setTyped(""); return; }
        setTyped(""); setTyping(true);
        let i = 0;
        timRef.current = setInterval(() => {
            i += 3;
            if (i >= text.length) { setTyped(text); setTyping(false); clearInterval(timRef.current!); }
            else setTyped(text.slice(0, i));
        }, 16);
        return () => clearInterval(timRef.current!);
    }, [paper.id]);

    const postComment = async () => {
        if (!comment.trim() || posting) return;
        setPosting(true);
        await onComment(paper.id, comment.trim());
        setComment(""); setPosting(false);
    };

    const postUpdate = async () => {
        if (!update.trim() || posting) return;
        setPosting(true);
        await onBuildUpdate(paper.id, update.trim());
        setUpdate(""); setPosting(false); onRefresh();
    };

    const TAB_CLASS = (active: boolean) =>
        `px-3 py-2 border-b-2 text-[0.67rem] font-mono uppercase tracking-[0.06em] transition-all duration-150 cursor-pointer ${active ? "text-text border-accent" : "text-muted border-transparent hover:text-text"
        }`;

    return (
        <div className="card flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-[14px_16px_12px] border-b border-border shrink-0 bg-surface">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-wrap gap-1">
                        <Tag text={paper.arxivId} color="var(--color-muted)" />
                        {paper.tags?.slice(0, 3).map(t => <Tag key={t} text={t} />)}
                    </div>
                    <StatusDot status={paper.status} />
                </div>
                <h2 className="text-text text-[0.9375rem] font-bold leading-[1.4] mb-[5px]">
                    {paper.title}
                </h2>
                <p className="text-muted text-[0.69rem] font-mono">
                    {paper.authors?.slice(0, 3).join(", ")}
                    {paper.authors?.length > 3 ? ` +${paper.authors.length - 3}` : ""}
                    {paper.published ? ` · ${paper.published}` : ""}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex bg-surface border-b border-border shrink-0 px-2 sticky top-0 z-10">
                {(["analysis", "discussion", "build"] as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)} className={TAB_CLASS(tab === t)}>{t}</button>
                ))}
            </div>

            {/* Body */}
            <div className="scroll-y flex-1 p-[14px_16px]">

                {/* ── ANALYSIS ─────────────────────────────────────── */}
                {tab === "analysis" && (
                    <div className="animate-fade-up">
                        {/* Narrative — the main read */}
                        <div className="mb-[18px]">
                            <SectionLabel>Analysis</SectionLabel>
                            <p className="text-[#4e432e] text-[0.84rem] leading-[1.7]">
                                {typed}
                                {typing && <span className="animate-blink text-accent ml-[1px]">▌</span>}
                            </p>
                        </div>

                        {/* Opportunity */}
                        {paper.opportunity && (
                            <div className="border-l-2 border-accent/40 pl-3 mb-4 bg-accent/5 p-3 rounded-r-md">
                                <SectionLabel>Opportunity</SectionLabel>
                                <p className="text-[#2f281b] text-[0.84rem] leading-[1.6]">{paper.opportunity}</p>
                            </div>
                        )}

                        {/* 2-col details */}
                        <div className="grid grid-cols-2 gap-[10px] mb-4">
                            {[
                                { label: "Core Innovation", val: paper.coreInnovation },
                                { label: "Target Customer", val: paper.targetCustomer },
                                { label: "Market Size", val: paper.marketSize },
                                { label: "Competitive Moat", val: paper.moatAnalysis },
                            ].filter(x => x.val).map(({ label, val }) => (
                                <div key={label} className="bg-surface/50 rounded-md p-[9px_11px] border border-border/50 backdrop-blur-sm">
                                    <SectionLabel>{label}</SectionLabel>
                                    <p className="text-muted text-[0.78rem] leading-[1.55] m-0">{val}</p>
                                </div>
                            ))}
                        </div>

                        {/* Build meta */}
                        {(paper.buildComplexity || paper.mvpDays) && (
                            <div className="flex gap-4 mb-4 flex-wrap">
                                {paper.buildComplexity && <MetaChip label="Complexity" value={paper.buildComplexity} />}
                                {paper.mvpDays && <MetaChip label="MVP estimate" value={`~${paper.mvpDays} days`} />}
                            </div>
                        )}

                        {/* 90-day path */}
                        {paper.first90Days && paper.first90Days.length > 0 && (
                            <div className="mb-[18px]">
                                <SectionLabel>90-Day Path</SectionLabel>
                                {paper.first90Days.map((m, i) => (
                                    <div key={i} className="flex gap-[9px] mb-[7px] items-start">
                                        <span className="text-faint text-[0.69rem] font-mono mt-[3px] shrink-0">→</span>
                                        <p className="text-muted text-[0.8rem] leading-[1.5] m-0">{m}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Action row */}
                        <div className="flex gap-2 pt-1 border-t border-border/30 mt-4">
                            <button onClick={() => onFollow(paper.id)} className={`flex-1 rounded-md p-2 text-[0.72rem] cursor-pointer font-mono transition-all duration-150 ${following ? "bg-accent-dim text-accent border border-accent/30" : "bg-elevated text-muted border border-border hover:bg-surface hover:text-text"
                                }`}>
                                {following ? "★ Following" : "☆ Follow"} · {paper.followers.length}
                            </button>

                            {!myClaim && paper.status === "open" && user?.role === "builder" && (
                                <button onClick={() => onClaim(paper.id)} className="flex-1 bg-teal-dim text-teal border border-teal/20 rounded-md p-2 text-[0.72rem] cursor-pointer font-mono hover:bg-teal/10 transition-colors">
                                    Claim & Build
                                </button>
                            )}

                            {!myClaim && paper.status === "open" && user?.role !== "builder" && (
                                <div className="flex-1 bg-bg border border-border rounded-md p-2 text-center text-faint text-[0.69rem] font-mono flex items-center justify-center">
                                    Builders can claim
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── DISCUSSION ───────────────────────────────────── */}
                {tab === "discussion" && (
                    <div className="animate-fade-up">
                        {paper.comments.length === 0 && (
                            <EmptyState icon="·" title="No comments yet" sub="Be the first to add context or ask a question." />
                        )}

                        {paper.comments.map(c => (
                            <div key={c.id} className="flex gap-[10px] mb-4">
                                <Avatar name={c.user.name} role={c.user.role} size={26} />
                                <div className="flex-1">
                                    <div className="flex flex-wrap gap-[6px] items-center mb-1">
                                        <span className="text-text text-[0.75rem] font-mono font-semibold">{c.user.name}</span>
                                        <RoleBadge role={c.user.role} />
                                        <TimeAgo ts={c.createdAt} />
                                    </div>
                                    <p className="text-[#4e432e] text-[0.82rem] leading-[1.6] m-0">{c.text}</p>
                                </div>
                            </div>
                        ))}

                        {user && (
                            <div className="flex gap-[10px] mt-2 pt-3 border-t border-border mb-2">
                                <Avatar name={user.name} role={user.role} size={26} />
                                <div className="flex-1">
                                    <textarea
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment(); }}
                                        placeholder="Add context, a question, or a connection you see… (⌘↵ to post)"
                                        className="field"
                                        rows={2}
                                    />
                                    <button onClick={postComment} disabled={!comment.trim() || posting} className="btn-primary mt-[6px]">
                                        {posting ? "Posting…" : "Post"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── BUILD ────────────────────────────────────────── */}
                {tab === "build" && (
                    <div className="animate-fade-up">
                        {claimant ? (
                            <>
                                <div className="flex gap-[10px] items-center bg-teal-dim border border-teal/15 rounded-md p-[10px_12px] mb-4">
                                    <Avatar name={claimant.user.name} role={claimant.user.role} size={28} />
                                    <div>
                                        <div className="text-teal text-[0.75rem] font-mono font-bold">
                                            {claimant.user.name} is building this
                                        </div>
                                        <div className="text-muted text-[0.67rem] font-mono">
                                            Claimed <TimeAgo ts={claimant.createdAt} />
                                            {paper.buildComplexity ? ` · ${paper.buildComplexity} complexity` : ""}
                                        </div>
                                    </div>
                                </div>

                                {claimant.updates.length > 0 && (
                                    <div className="mb-4">
                                        <SectionLabel>Build Log</SectionLabel>
                                        {claimant.updates.map(u => (
                                            <div key={u.id} className="mb-3 pl-3 border-l-2 border-border/50">
                                                <p className="text-[#4e432e] text-[0.82rem] leading-[1.55] m-0 mb-[3px]">{u.text}</p>
                                                <TimeAgo ts={u.createdAt} />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {myClaim && (
                                    <div className="pt-[10px] border-t border-border">
                                        <SectionLabel>Post Update</SectionLabel>
                                        <textarea
                                            value={update}
                                            onChange={e => setUpdate(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postUpdate(); }}
                                            placeholder="What happened this week? New milestone, blocker, or insight…"
                                            className="field"
                                            rows={2}
                                        />
                                        <button onClick={postUpdate} disabled={!update.trim() || posting} className="btn-primary mt-[6px]">
                                            {posting ? "Posting…" : "Post Update"}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <EmptyState
                                icon="·"
                                title="Not yet claimed"
                                sub={user?.role === "builder" ? "Claim this to start building and post public milestones." : "A builder can claim this and post their progress here."}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
