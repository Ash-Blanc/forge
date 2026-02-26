// lib/types.ts

export type Role = "researcher" | "builder" | "investor";
export type PaperStatus = "open" | "building" | "shipped";

export interface ForgePaper {
    id: string;
    arxivId: string;
    title: string;
    abstract: string;
    authors: string[];
    published: string;
    status: PaperStatus;

    opportunity?: string;
    coreInnovation?: string;
    targetCustomer?: string;
    marketSize?: string;
    buildComplexity?: string;
    mvpDays?: number;
    moatAnalysis?: string;
    tags?: string[];
    first90Days?: string[];
    narrativeAnalysis?: string;

    submittedBy: { id: string; name: string; role: Role };
    createdAt: string;

    followers: { userId: string; user: { name: string; role: Role } }[];
    claims: {
        id: string;
        userId: string;
        status: string;
        createdAt: string;
        user: { name: string; role: Role };
        updates: { id: string; text: string; createdAt: string }[];
    }[];
    comments: {
        id: string;
        text: string;
        createdAt: string;
        user: { id: string; name: string; role: Role };
    }[];
}

export interface ForgeUser {
    id: string;
    name: string;
    role: Role;
}