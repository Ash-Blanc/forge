"use client";

import React, { useState } from "react";
import { ForgeAnalysis } from "@/lib/types";

interface ExportBlueprintProps {
    data: Partial<ForgeAnalysis>;
}

export function ExportBlueprint({ data }: ExportBlueprintProps) {
    const [status, setStatus] = useState<string | null>(null);

    const handleExport = async (platform: "Linear" | "Notion") => {
        setStatus(`Exporting to ${platform}...`);
        
        // Mock export logic - in reality this would hit an API endpoint that handles OAuth
        setTimeout(() => {
            setStatus(`Successfully exported to ${platform}!`);
            setTimeout(() => setStatus(null), 3000);
        }, 1500);
    };

    if (!data.opportunity) return null;

    return (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#eadfc9]">
            <span className="text-[0.65rem] font-mono uppercase tracking-widest text-[#8a7a5d] font-bold">
                Export to:
            </span>
            <button
                onClick={() => handleExport("Linear")}
                className="px-3 py-1 text-xs font-medium text-[#f0f0f0] bg-[#5E6AD2] hover:bg-[#4E5AC2] rounded-md transition-colors"
            >
                Linear
            </button>
            <button
                onClick={() => handleExport("Notion")}
                className="px-3 py-1 text-xs font-medium text-black bg-white border border-[#e0e0e0] hover:bg-gray-50 rounded-md transition-colors shadow-sm"
            >
                Notion
            </button>
            {status && (
                <span className="text-xs text-[#2f8b6b] ml-2 animate-in fade-in">
                    {status}
                </span>
            )}
        </div>
    );
}
