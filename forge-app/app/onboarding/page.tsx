"use client";
// app/onboarding/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/types";

const ROLES: { key: Role; label: string; desc: string }[] = [
    { key: "researcher", label: "Researcher", desc: "Synthesize breakthrough papers for builder acquisition." },
    { key: "builder", label: "Builder", desc: "Forge research-backed SaaS with verified technical moats." },
    { key: "investor", label: "Investor", desc: "Acquire early signal on emerging deep-tech market gaps." },
];

function uid() {
    return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function OnboardingPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [role, setRole] = useState<Role>("researcher");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");

    const handleJoin = async () => {
        const trimmed = name.trim();
        if (trimmed.length < 2) { setErr("Identity must be at least 2 characters."); return; }

        setSaving(true); setErr("");
        try {
            const id = uid();
            const res = await fetch("/api/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, name: trimmed, role }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "Access protocol failure.");
            }
            const user = await res.json();
            localStorage.setItem("forge-user", JSON.stringify(user));
            router.push("/dashboard");
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Handshake failed. Retry.");
            setSaving(false);
        }
    };

    const ROLE_ACCENT: Record<Role, string> = {
        researcher: "var(--accent)",
        builder: "var(--teal)",
        investor: "var(--sage)",
    };

    return (
        <main className="min-h-[100dvh] bg-bg flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-grid-blueprint opacity-[0.02] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10 space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <div className="text-accent text-3xl font-mono leading-none mb-4 animate-pulse-glow">⬡</div>
                    <div className="text-[0.65rem] font-mono text-muted uppercase tracking-[0.3em] font-bold">
                        Forge Protocol
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tighter text-text">
                        Initialize Session
                    </h1>
                    <p className="text-muted text-sm leading-relaxed max-w-xs">
                        Configure your foundry profile to begin distilling research into reality.
                    </p>
                </div>

                <div className="glass-card p-8 space-y-6">
                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-[0.6rem] font-mono text-muted uppercase tracking-widest block">
                            Operator Name
                        </label>
                        <input
                            value={name}
                            onChange={e => { setName(e.target.value); setErr(""); }}
                            onKeyDown={e => e.key === "Enter" && handleJoin()}
                            placeholder="e.g. Satoshi"
                            className="field py-3 px-4 bg-bg/50 border-border focus:border-accent transition-all outline-none text-sm"
                            autoFocus
                        />
                        {err && (
                            <p className="text-[#c43f3f] text-[0.65rem] font-mono animate-fade-up">{err}</p>
                        )}
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-3">
                        <label className="text-[0.6rem] font-mono text-muted uppercase tracking-widest block">
                            Specialization
                        </label>
                        <div className="space-y-2.5">
                            {ROLES.map(r => {
                                const active = role === r.key;
                                const accent = ROLE_ACCENT[r.key];
                                return (
                                    <button
                                        key={r.key}
                                        onClick={() => setRole(r.key)}
                                        className={`w-full flex items-start gap-4 p-4 text-left rounded-lg border transition-all duration-300 relative group ${
                                            active 
                                            ? "bg-surface border-accent/30 shadow-[0_0_15px_-5px_rgba(226,200,122,0.1)]" 
                                            : "bg-surface/30 border-border hover:border-border-h"
                                        }`}
                                    >
                                        <div className="flex-1 space-y-1">
                                            <div className={`text-[0.75rem] font-mono font-bold uppercase tracking-wider ${active ? "text-accent" : "text-text"}`}>
                                                {r.label}
                                            </div>
                                            <div className="text-muted text-[0.72rem] leading-relaxed pr-4">
                                                {r.desc}
                                            </div>
                                        </div>
                                        {active && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1 animate-pulse" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={handleJoin}
                            disabled={!name.trim() || saving}
                            className="btn-primary w-full py-4 text-[0.8rem]"
                        >
                            {saving ? "Establishing Link..." : "Initialize Session"}
                        </button>
                    </div>

                    <div className="pt-2 flex items-center justify-center gap-4 text-[0.55rem] font-mono text-faint uppercase tracking-widest">
                        <span>No Auth</span>
                        <span className="w-1 h-1 rounded-full bg-faint" />
                        <span>Direct Access</span>
                        <span className="w-1 h-1 rounded-full bg-faint" />
                        <span>Local State</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
