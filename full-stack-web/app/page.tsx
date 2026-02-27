"use client";
// app/landing/page.tsx

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const FEATURES = [
    {
        icon: "🧠",
        title: "AI-Powered Analysis",
        desc: "Our Agno-powered agent distills dense arXiv papers into actionable startup briefs — opportunity, market size, MVP timeline, and competitive moat.",
        accent: "var(--stone)",
    },
    {
        icon: "⚡",
        title: "Claim & Build",
        desc: "See a viable SaaS idea? Claim it. Post build updates, track your progress from Open → Building → Shipped.",
        accent: "var(--teal)",
    },
    {
        icon: "📡",
        title: "Real-Time Feed",
        desc: "Browse and filter a live feed of AI-analyzed research. Filter by status, follow builders, and never miss the next big thing.",
        accent: "var(--blue)",
    },
    {
        icon: "💬",
        title: "Community Intelligence",
        desc: "Researchers share discoveries, builders act on them, and investors follow what's technically possible — all in one place.",
        accent: "var(--sage)",
    },
];

const STATS = [
    { value: "42%", label: "Avg. inference cost reduction" },
    { value: "<60s", label: "Paper → SaaS brief" },
    { value: "3", label: "User roles supported" },
    { value: "∞", label: "Papers to explore" },
];

const STEPS = [
    { num: "01", title: "Submit a Paper", desc: "Paste an arXiv URL or ID. The AI agent handles the rest." },
    { num: "02", title: "Review the Analysis", desc: "Get a full brief: opportunity, target customer, TAM, MVP days, moat analysis." },
    { num: "03", title: "Claim & Ship", desc: "Claim a promising idea, post build updates, and go from research to reality." },
];

export default function LandingPage() {
    const router = useRouter();
    const [scrollY, setScrollY] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("forge-user");
        if (stored) {
            setIsLoggedIn(true);
        }

        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-bg text-text overflow-x-hidden flex flex-col">

            {/* ─── FLOATING NAV ─── */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-xl"
                style={{ background: scrollY > 40 ? "rgba(6,8,15,0.85)" : "transparent", borderBottom: scrollY > 40 ? "1px solid var(--border)" : "1px solid transparent", transition: "all .3s ease" }}>
                <div className="flex items-center gap-2">
                    <span className="font-extrabold text-2xl tracking-tight text-text">FORGE</span>
                    <span className="text-accent text-[1.4rem] font-mono leading-none">⬡</span>
                </div>
                <div className="flex items-center gap-3">
                    {isLoggedIn ? (
                        <button onClick={() => router.push("/dashboard")}
                            className="btn-primary text-[0.75rem]">
                            Dashboard
                        </button>
                    ) : (
                        <>
                            <button onClick={() => router.push("/onboarding")}
                                className="btn-ghost text-[0.75rem]">
                                Log In
                            </button>
                            <button onClick={() => router.push("/onboarding")}
                                className="btn-primary text-[0.75rem]">
                                Get Started
                            </button>
                        </>
                    )}
                </div>
            </nav>

            {/* ─── HERO ─── */}
            <section className="relative flex flex-col items-center justify-center text-center pt-36 pb-28 px-5">
                {/* Ambient glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none opacity-30"
                    style={{ background: "radial-gradient(ellipse at center, var(--accent-dim), transparent 70%)" }} />
                <div className="absolute top-20 left-1/4 w-[400px] h-[400px] pointer-events-none opacity-15"
                    style={{ background: "radial-gradient(circle, rgba(77,168,154,0.3), transparent 60%)" }} />
                <div className="absolute top-20 right-1/4 w-[400px] h-[400px] pointer-events-none opacity-15"
                    style={{ background: "radial-gradient(circle, rgba(91,155,213,0.2), transparent 60%)" }} />

                {/* Badge */}
                <div className="relative z-10 mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-surface/60 backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[0.65rem] font-mono text-muted tracking-wide uppercase">Powered by Agno AI Agents</span>
                </div>

                <h1 className="relative z-10 text-[clamp(2.2rem,6vw,4rem)] font-extrabold leading-[1.08] tracking-[-0.035em] max-w-3xl animate-fade-up">
                    Research{" "}
                    <span className="relative inline-block">
                        <span className="bg-gradient-to-r from-accent via-accent to-stone-custom bg-clip-text text-transparent">→</span>
                    </span>
                    {" "}Reality
                </h1>

                <p className="relative z-10 text-muted text-[clamp(0.9rem,2vw,1.1rem)] max-w-lg mt-5 leading-relaxed animate-fade-up" style={{ animationDelay: "0.05s" }}>
                    FORGE distills complex academic papers into actionable SaaS opportunities.
                    For <span className="text-stone-custom">researchers</span>, <span className="text-teal-custom">builders</span>, and <span className="text-sage-custom">investors</span>.
                </p>

                <div className="relative z-10 flex gap-3 mt-8 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                    {isLoggedIn ? (
                        <button onClick={() => router.push("/dashboard")}
                            className="btn-primary text-[0.85rem]" style={{ padding: "12px 28px" }}>
                            Go to Dashboard →
                        </button>
                    ) : (
                        <button onClick={() => router.push("/onboarding")}
                            className="btn-primary text-[0.85rem]" style={{ padding: "12px 28px" }}>
                            Start Building →
                        </button>
                    )}
                    <button onClick={() => {
                        document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                    }}
                        className="btn-ghost text-[0.85rem]" style={{ padding: "12px 28px" }}>
                        How it Works
                    </button>
                </div>

                {/* Decorative grid lines */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </section>

            {/* ─── STATS STRIP ─── */}
            <section className="border-y border-border/50 bg-surface/40 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-border/30">
                    {STATS.map((s, i) => (
                        <div key={i} className="flex flex-col items-center py-8 gap-1">
                            <span className="text-accent font-extrabold text-2xl md:text-3xl tracking-tight">{s.value}</span>
                            <span className="text-muted text-[0.75rem] font-mono text-center">{s.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── FEATURES ─── */}
            <section className="max-w-5xl mx-auto px-5 py-24">
                <div className="text-center mb-16">
                    <span className="text-[0.7rem] font-mono text-muted uppercase tracking-[0.15em] block mb-3">Capabilities</span>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                        Everything you need to go from
                        <span className="text-accent"> paper to product</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {FEATURES.map((f, i) => (
                        <div key={i}
                            className="group relative p-6 rounded-xl border border-border/60 bg-surface/50 backdrop-blur-sm hover:border-border-hover transition-all duration-300 hover:translate-y-[-2px]"
                            style={{ animationDelay: `${i * 0.06}s` }}>
                            {/* Glow on hover */}
                            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                style={{ background: `radial-gradient(circle at 30% 30%, color-mix(in srgb, ${f.accent} 8%, transparent), transparent 60%)` }} />

                            <div className="relative z-10">
                                <div className="text-2xl mb-3">{f.icon}</div>
                                <h3 className="font-bold text-[1rem] mb-2 tracking-tight" style={{ color: f.accent }}>{f.title}</h3>
                                <p className="text-muted text-[0.82rem] leading-relaxed">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── HOW IT WORKS ─── */}
            <section id="how-it-works" className="border-t border-border/40 bg-elevated/40 py-24 px-5">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="text-[0.7rem] font-mono text-muted uppercase tracking-[0.15em] block mb-3">How it Works</span>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                            Three steps to your next
                            <span className="text-teal-custom"> SaaS idea</span>
                        </h2>
                    </div>

                    <div className="flex flex-col gap-6">
                        {STEPS.map((s, i) => (
                            <div key={i} className="flex gap-5 items-start group">
                                <div className="shrink-0 w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center font-mono text-accent text-[0.72rem] font-bold group-hover:bg-accent/10 group-hover:border-accent/30 transition-all duration-200">
                                    {s.num}
                                </div>
                                <div className="pt-1">
                                    <h3 className="font-bold text-[0.95rem] mb-1 tracking-tight">{s.title}</h3>
                                    <p className="text-muted text-[0.82rem] leading-relaxed">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── FINAL CTA ─── */}
            <section className="relative py-28 px-5 text-center overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute inset-0 pointer-events-none opacity-20"
                    style={{ background: "radial-gradient(ellipse at 50% 80%, var(--accent-dim), transparent 50%)" }} />

                <div className="relative z-10 max-w-lg mx-auto">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                        Ready to forge something?
                    </h2>
                    <p className="text-muted text-[0.9rem] mb-8 leading-relaxed">
                        Join researchers, builders, and investors turning cutting-edge research into real products. No email required.
                    </p>
                    {isLoggedIn ? (
                        <button onClick={() => router.push("/dashboard")}
                            className="btn-primary text-[0.9rem]" style={{ padding: "14px 36px" }}>
                            Go to Dashboard →
                        </button>
                    ) : (
                        <button onClick={() => router.push("/onboarding")}
                            className="btn-primary text-[0.9rem]" style={{ padding: "14px 36px" }}>
                            Join FORGE →
                        </button>
                    )}
                </div>
            </section>

            {/* ─── FOOTER ─── */}
            <footer className="border-t border-border/40 py-8 px-5">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted">
                        <span className="font-extrabold text-[1rem] tracking-tight">FORGE</span>
                        <span className="text-accent text-[1.2rem] font-mono leading-none">⬡</span>
                        <span className="text-faint text-[0.7rem] font-mono ml-1">research → reality</span>
                    </div>
                    <span className="text-faint text-[0.7rem] font-mono">© {new Date().getFullYear()}</span>
                </div>
            </footer>
        </div>
    );
}
