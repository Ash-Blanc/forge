// lib/types.ts

export type Role = "researcher" | "builder" | "investor";

export interface ForgeUser {
    id: string;
    name: string;
    role: Role;
}
