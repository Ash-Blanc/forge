"use client";
// app/onboarding/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/types";

const ROLES: { key: Role; label: string; desc: string }[] = [
    { key: "researcher", label: "Researcher", desc: "I write and share academic papers. I want my work to find builders." },
    { key: "builder", label: "Builder", desc: "I turn research into products. I want to find opportunities worth building." },
    { key: "investor", label: "Investor", desc: "I fund and advise. I want early signal on what's technically possible." },
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
        if (trimmed.length < 2) { setErr("Name must be at least 2 characters."); return; }

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
                throw new Error(data.error ?? "Something went wrong");
            }
            const user = await res.json();
            localStorage.setItem("forge-user", JSON.stringify(user));
            router.push("/dashboard");
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
            setSaving(false);
        }
    };

    const ROLE_ACCENT: Record<Role, string> = {
        researcher: "var(--stone)",
        builder: "var(--teal)",
        investor: "var(--sage)",
    };

    return (
        <main style={{
            minHeight: "100dvh", background: "var(--bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
        }}>
            <div style={{ width: 400, maxWidth: "100%" }}>

                {/* Mark */}
                <div style={{ marginBottom: 28 }}>
                    <div style={{ fontSize: "1.8rem", color: "var(--accent)", marginBottom: 4, fontFamily: "var(--mono)", lineHeight: 1 }}>⬡</div>
                    <div style={{ fontSize: ".85rem", fontFamily: "var(--mono)", color: "var(--muted)", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
                        FORGE
                    </div>
                    <h1 style={{ color: "var(--text)", fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.25, letterSpacing: "-.02em", marginBottom: 6 }}>
                        Research → Reality
                    </h1>
                    <p style={{ color: "var(--muted)", fontSize: ".875rem", lineHeight: 1.6 }}>
                        A place for researchers to share discoveries, builders to act on them, and investors to follow what's next.
                    </p>
                </div>

                <div className="card" style={{ padding: "20px 22px" }}>
                    {/* Name */}
                    <label style={{ color: "var(--muted)", fontSize: ".6rem", fontFamily: "var(--mono)", display: "block", marginBottom: 5, letterSpacing: ".08em", textTransform: "uppercase" }}>
                        Name
                    </label>
                    <input
                        value={name}
                        onChange={e => { setName(e.target.value); setErr(""); }}
                        onKeyDown={e => e.key === "Enter" && handleJoin()}
                        placeholder="Your name"
                        className="field"
                        style={{ marginBottom: err ? 5 : 16 }}
                        autoFocus
                    />
                    {err && (
                        <p style={{ color: "var(--red)", fontSize: ".7rem", fontFamily: "var(--mono)", marginBottom: 10 }}>{err}</p>
                    )}

                    {/* Role */}
                    <label style={{ color: "var(--muted)", fontSize: ".6rem", fontFamily: "var(--mono)", display: "block", marginBottom: 8, letterSpacing: ".08em", textTransform: "uppercase" }}>
                        I am a
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                        {ROLES.map(r => {
                            const active = role === r.key;
                            const accent = ROLE_ACCENT[r.key];
                            return (
                                <button
                                    key={r.key}
                                    onClick={() => setRole(r.key)}
                                    style={{
                                        display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left",
                                        padding: "11px 13px",
                                        border: `1px solid ${active ? accent + "35" : "var(--border)"}`,
                                        borderRadius: "var(--r-md)",
                                        background: active ? `color-mix(in srgb, ${accent} 6%, var(--bg))` : "var(--bg)",
                                        cursor: "pointer", transition: "all .15s", width: "100%",
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            color: active ? accent : "var(--text)",
                                            fontSize: ".8rem", fontFamily: "var(--mono)", fontWeight: 700, marginBottom: 2,
                                        }}>{r.label}</div>
                                        <div style={{ color: "var(--muted)", fontSize: ".75rem", lineHeight: 1.5 }}>{r.desc}</div>
                                    </div>
                                    {active && (
                                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: accent, marginTop: 5, flexShrink: 0 }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={handleJoin}
                        disabled={!name.trim() || saving}
                        className="btn-primary"
                        style={{ width: "100%", padding: "11px", fontSize: ".8rem" }}
                    >
                        {saving ? "Joining…" : "Join FORGE"}
                    </button>

                    <p style={{ color: "var(--faint)", fontSize: ".67rem", fontFamily: "var(--mono)", textAlign: "center", marginTop: 10 }}>
                        No email · No password · No tracking
                    </p>
                </div>
            </div>
        </main>
    );
}