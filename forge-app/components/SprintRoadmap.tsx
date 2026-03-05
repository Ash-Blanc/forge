"use client";

import React from "react";
import { ForgeAnalysis } from "@/lib/types";

interface SprintRoadmapProps {
    data: Partial<ForgeAnalysis>;
}

export function SprintRoadmap({ data }: SprintRoadmapProps) {
    if (!data.first90Days || !Array.isArray(data.first90Days)) return null;

    // Split execution plan loosely into 3 blocks for 30/60/90 chunks
    const chunkSize = Math.ceil(data.first90Days.length / 3);
    const months = [
        { label: "Month 1: Foundation", items: data.first90Days.slice(0, chunkSize) },
        { label: "Month 2: Build & Iterate", items: data.first90Days.slice(chunkSize, chunkSize * 2) },
        { label: "Month 3: Launch & Learn", items: data.first90Days.slice(chunkSize * 2) }
    ];

    return (
        <div className="space-y-4 animate-in fade-in mt-6">
            <h3 className="text-sm font-mono uppercase tracking-widest text-[#b2541f] mb-4 font-bold border-b border-[#eadfc9] pb-2">
                MVP Sprint Roadmap
            </h3>
            <div className="space-y-6">
                {months.map((month, idx) => (
                    month.items.length > 0 && (
                        <div key={idx} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:bottom-0 before:w-px before:bg-[#eadfc9]">
                            <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-[#e86f2d]"></div>
                            <h4 className="text-xs font-bold text-[#8a7a5d] uppercase tracking-wide mb-2">{month.label}</h4>
                            <ul className="space-y-2">
                                {month.items.map((item, i) => (
                                    <li key={i} className="text-sm text-[#3f3525] bg-white p-3 rounded-md border border-[#f0ebe1] shadow-sm">
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}
