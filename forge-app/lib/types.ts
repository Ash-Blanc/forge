// lib/types.ts

export type Role = "researcher" | "builder" | "investor";

export interface ForgeUser {
    id: string;
    name: string;
    role: Role;
}

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
    confidenceScore?: number;
}

export interface ForgePaper {
    id: string;
    title: string;
    arxivId?: string;
    status: string;
    tags?: string[];
    opportunity?: string;
    coreInnovation?: string;
    targetCustomer?: string;
    marketSize?: string;
    moatAnalysis?: string;
    first90Days?: string[];
    followers: any[];
    comments: any[];
}
