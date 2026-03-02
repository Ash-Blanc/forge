"use client";
// components/PaperCard.tsx

import { Avatar, RoleBadge, StatusDot, Tag, TimeAgo } from "./ui";
import type { ForgePaper, ForgeUser } from "@/lib/types";

interface Props {
    paper: ForgePaper;
    selected: boolean;
    user: ForgeUser | null;
    onSelect: (p: ForgePaper) => void;
    onFollow: (paperId: string) => void;
    onClaim: (paperId: string) => void;
}

export default function PaperCard({ paper, selected, user, onSelect, onFollow, onClaim }: Props) {
    const following = paper.followers.some(f => f.userId === user?.id);
    const claimant = paper.claims[0];

    return (
        <article
            onClick={() => onSelect(paper)}
            className={`card animate-fade-up p-[14px_16px] cursor-pointer mb-2 transition-all duration-200 hover:scale-[1.01] hover:border-border-h ${selected ? "bg-elevated border-border-h shadow-[0_4px_24px_rgba(0,0,0,0.3)]" : "bg-surface border-border hover:shadow-[0_2px_12px_rgba(0,0,0,0.2)]"
                }`}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-[9px]">
                <div className="flex gap-2 items-center min-w-0">
                    <Avatar name={paper.submittedBy.name} role={paper.submittedBy.role} size={26} />
                    <div className="min-w-0">
                        <div className="text-text text-[0.72rem] font-mono font-semibold truncate">
                            {paper.submittedBy.name}
                        </div>
                        <TimeAgo ts={paper.createdAt} />
                    </div>
                </div>
                <StatusDot status={paper.status} />
            </div>

            {/* Title */}
            <h3 className="text-[#c8d4e6] text-[0.875rem] font-semibold leading-[1.45] mb-2 line-clamp-2">
                {paper.title}
            </h3>

            {/* Opportunity */}
            {paper.opportunity && (
                <p className="text-muted text-[0.8rem] leading-[1.55] mb-[10px] italic line-clamp-2">
                    {paper.opportunity}
                </p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-[11px]">
                {paper.tags?.slice(0, 4).map(t => <Tag key={t} text={t} />)}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center">
                <div className="flex gap-[10px] items-center">
                    {/* Follow */}
                    <button
                        onClick={e => { e.stopPropagation(); onFollow(paper.id); }}
                        className={`bg-transparent border-none cursor-pointer text-[0.7rem] font-mono flex items-center gap-1 p-0 transition-colors duration-150 hover:text-accent ${following ? "text-accent" : "text-muted"}`}
                    >
                        {following ? "★" : "☆"} {paper.followers.length}
                    </button>

                    <span className="text-faint text-[0.7rem] font-mono">
                        {paper.comments.length} comment{paper.comments.length !== 1 ? "s" : ""}
                    </span>

                    {paper.claims.length > 0 && (
                        <span className="text-teal text-[0.7rem] font-mono">
                            {paper.claims.length} builder{paper.claims.length !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                {claimant ? (
                    <div className="flex items-center gap-[5px]">
                        <Avatar name={claimant.user.name} role={claimant.user.role} size={16} />
                        <span className="text-muted text-[0.63rem] font-mono">
                            {claimant.user.name.split(" ")[0]}
                        </span>
                    </div>
                ) : paper.status === "open" && user?.role === "builder" ? (
                    <button
                        onClick={e => { e.stopPropagation(); onClaim(paper.id); }}
                        className="bg-teal-dim text-teal border-[1px] border-teal/15 rounded-sm px-2 py-[2px] text-[0.67rem] cursor-pointer font-mono hover:bg-teal/10 transition-colors pointer-events-auto"
                    >Claim</button>
                ) : null}
            </div>
        </article>
    );
}