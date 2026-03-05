"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ForgeLogo } from "@/components/ForgeLogo";


export default function LandingPage() {
    const router = useRouter();
    const { isSignedIn } = useAuth();
    const [scrollY, setScrollY] = useState(0);

    const [waitlistEmail, setWaitlistEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isWaitlistSuccess, setIsWaitlistSuccess] = useState(false);
    const [waitlistCount, setWaitlistCount] = useState(0);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener("scroll", handleScroll);

        // Fetch initial waitlist count
        fetch('/api/waitlist')
            .then(res => res.json())
            .then(data => {
                if (data.count) setWaitlistCount(data.count);
            })
            .catch(console.error);

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const trackCta = (ctaId: string, destination: string) => {
        if (typeof window === "undefined") return;

        const detail = {
            ctaId,
            destination,
            pagePath: window.location.pathname,
            ts: Date.now(),
        };

        window.dispatchEvent(new CustomEvent("forge:cta_click", { detail }));

        const gtag = (window as Window & {
            gtag?: (command: string, eventName: string, params: Record<string, string>) => void;
        }).gtag;

        if (gtag) {
            gtag("event", "forge_cta_click", {
                cta_id: ctaId,
                destination,
                page_path: window.location.pathname,
            });
        }
    };

    const navigateWithTracking = (ctaId: string, destination: string) => {
        trackCta(ctaId, destination);
        router.push(destination);
    };

    const goToMainCta = (ctaId: string) => {
        const destination = isSignedIn ? "/dashboard" : "/sign-in";
        navigateWithTracking(ctaId, destination);
    };

    const handleWaitlistSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!waitlistEmail) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: waitlistEmail })
            });
            const data = await res.json();
            if (data.count) setWaitlistCount(data.count);
        } catch (error) {
            console.error("Failed to join waitlist:", error);
        }
        setIsSubmitting(false);
        setIsWaitlistSuccess(true);
        trackCta("hero-waitlist-join", "#waitlist");
    };

    return (
        <div className="lp-shell flex flex-col min-h-screen text-[#ffffff]">
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 16 ? "bg-[#181819]/90 backdrop-blur-xl border-b border-[#4a4a4d]/80" : "bg-transparent"
                    }`}
            >
                <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
                    <button onClick={() => router.push("/")} className="flex items-center gap-2 group">
                        <span className="font-['Instrument_Serif'] italic tracking-wide text-2xl group-hover:text-[#e6e6e6] transition-colors">Forge</span>
                        <ForgeLogo className="w-5 h-5 animate-pulse-glow" />
                    </button>
                    <div className="flex items-center gap-6">
                        {/* {!isSignedIn ? (
                            <button
                                data-cta-id="nav-sign-in"
                                onClick={() => navigateWithTracking("nav-sign-in", "/sign-in")}
                                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                            >
                                Sign in
                            </button>
                        ) : null}
                        <button
                            data-cta-id="nav-main-cta"
                            onClick={() => goToMainCta("nav-main-cta")}
                            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full px-5 py-2.5 text-sm font-medium backdrop-blur-md transition-all shadow-lg hover:shadow-white/5"
                        >
                            {isSignedIn ? "Open Dashboard" : "Get Started"}
                        </button> */}
                    </div>
                </div>
            </nav>

            <main className="flex-1 flex flex-col justify-center relative z-10 px-6 pt-32 pb-20 overflow-hidden">
                <section className="max-w-4xl mx-auto text-center w-full relative">
                    {/* Decorative atmospheric glows for the hero section */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#4a4a4d]/30 rounded-full blur-[120px] -z-10 pointer-events-none" />
                    <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-[#313133]/30 rounded-full blur-[100px] -z-10 pointer-events-none animate-pulse" />
                    <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-[#636367]/20 rounded-full blur-[90px] -z-10 pointer-events-none" />

                    <div className="lp-reveal inline-flex items-center gap-2 rounded-full border border-[#4a4a4d] bg-[#313133]/70 backdrop-blur-md px-4 py-1.5 text-[0.65rem] font-medium tracking-[0.2em] text-[#e6e6e6] mb-8 uppercase shadow-xl relative z-10">
                        <span className="inline-block w-1 h-1 rounded-full bg-[#636367] animate-pulse" />
                        Beyond the Horizon
                    </div>

                    <h1 className="lp-reveal font-['Instrument_Serif'] text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] tracking-tight text-[#ffffff] drop-shadow-2xl">
                        Turn research into <span className="italic text-[#e6e6e6]">stellar</span> businesses.
                    </h1>

                    <p className="lp-reveal delay-100 mx-auto mt-6 text-[clamp(1rem,1.5vw,1.15rem)] leading-relaxed max-w-xl text-[#e6e6e6] font-light">
                        Turn complex academic research into clear, actionable plans you can actually build. Go from paper to product in minutes.
                    </p>

                    <div className="lp-reveal delay-200 mt-10 max-w-md mx-auto">
                        {!isWaitlistSuccess ? (
                            <form onSubmit={handleWaitlistSubmit} className="relative group flex items-center">
                                <input
                                    type="email"
                                    required
                                    placeholder="Enter your email to join the waitlist..."
                                    value={waitlistEmail}
                                    onChange={(e) => setWaitlistEmail(e.target.value)}
                                    className="w-full bg-[#313133]/75 border border-[#4a4a4d] rounded-full px-6 py-4 text-sm font-light text-[#ffffff] placeholder-[#e6e6e6]/60 focus:outline-none focus:border-[#636367] backdrop-blur-md transition-all pr-36 shadow-lg group-hover:bg-[#313133]"
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="submit"
                                    className="absolute right-1.5 top-1.5 bottom-1.5 bg-[#ffffff] text-[#181819] hover:bg-[#e6e6e6] rounded-full px-6 text-sm font-semibold transition-all shadow-[0_0_20px_rgba(230,230,230,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Joining..." : "Join Waitlist"}
                                </button>
                            </form>
                        ) : (
                            <div className="bg-[#313133]/75 border border-[#636367] rounded-full px-6 py-4 text-[#e6e6e6] text-sm font-medium backdrop-blur-md shadow-lg flex items-center justify-center gap-3 animate-in">
                                <span className="text-lg">✨</span> You&apos;re on the list! We will notify you when early access drops.
                            </div>
                        )}
                        <p className="mt-4 text-xs text-[#e6e6e6]/70 font-light tracking-wide uppercase">
                            {waitlistCount > 0 ? `Join ${waitlistCount} other pioneers. ` : ''}
                        </p>
                    </div>
                </section>

                <section id="how-it-works" className="max-w-4xl mx-auto mt-32">
                    <div className="text-center">
                        <h2 className="font-['Instrument_Serif'] text-[clamp(2.2rem,4.5vw,4rem)] leading-none text-[#ffffff] drop-shadow-lg">
                            An elegant workflow.
                        </h2>
                        <p className="mt-4 text-[#e6e6e6] font-light text-[0.95rem] max-w-lg mx-auto">
                            The space between an idea and a shipped product doesn&apos;t have to be a void.
                        </p>
                    </div>

                    <div className="mt-12 grid md:grid-cols-3 gap-6 relative">
                        {/* Decorative connecting line */}
                        <div className="hidden md:block absolute top-[36px] left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#636367]/60 to-transparent -z-10" />

                        {[
                            { step: "01", title: "Upload", desc: "Share an arXiv link or PDF. We parse the celestial mechanics of the research." },
                            { step: "02", title: "Analyze", desc: "Discover market orbits, identifying gaps where a new star can form." },
                            { step: "03", title: "Launch", desc: "Receive a structured playbook. Build and deploy with cosmic velocity." }
                        ].map((item) => (
                            <div key={item.step} className="lp-card p-6 bg-[#313133]/75 border border-[#4a4a4d] backdrop-blur-md rounded-2xl relative overflow-hidden group hover:bg-[#4a4a4d]/70 transition-colors">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-[#4a4a4d]/40 rounded-bl-[80px] -z-10 transition-transform group-hover:scale-110" />
                                <p className="font-mono text-[0.65rem] tracking-widest text-[#e6e6e6]/70 mb-3">{item.step}</p>
                                <h3 className="font-['Instrument_Serif'] text-2xl mb-2 text-[#ffffff]">{item.title}</h3>
                                <p className="text-[0.85rem] text-[#e6e6e6] font-light leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="max-w-4xl mx-auto mt-32 text-center">
                    <div className="rounded-3xl border border-[#4a4a4d] bg-[#313133]/75 backdrop-blur-lg p-10 md:p-16 relative overflow-hidden">
                        <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#636367]/25 rounded-full blur-[80px]" />
                        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[#4a4a4d]/25 rounded-full blur-[80px]" />

                        <h2 className="relative font-['Instrument_Serif'] text-[clamp(2.5rem,5vw,5rem)] leading-none text-[#ffffff] drop-shadow-xl">
                            Ready to explore?
                        </h2>
                        <p className="relative mt-4 max-w-lg mx-auto text-[#e6e6e6] font-light text-[0.95rem]">
                            Join the pioneers turning academic frontiers into the next generation of software.
                        </p>
                        <div className="relative mt-10 max-w-md mx-auto">
                            {!isWaitlistSuccess ? (
                                <form onSubmit={handleWaitlistSubmit} className="relative group flex items-center">
                                    <input
                                        type="email"
                                        required
                                        placeholder="Enter your email to join..."
                                        value={waitlistEmail}
                                        onChange={(e) => setWaitlistEmail(e.target.value)}
                                        className="w-full bg-[#313133]/75 border border-[#4a4a4d] rounded-full px-6 py-4 text-sm font-light text-[#ffffff] placeholder-[#e6e6e6]/60 focus:outline-none focus:border-[#636367] backdrop-blur-md transition-all pr-36 shadow-lg group-hover:bg-[#313133]"
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        type="submit"
                                        className="absolute right-1.5 top-1.5 bottom-1.5 bg-[#ffffff] text-[#181819] hover:bg-[#e6e6e6] rounded-full px-6 text-sm font-semibold transition-all shadow-[0_0_20px_rgba(230,230,230,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? "Joining..." : "Join Waitlist"}
                                    </button>
                                </form>
                            ) : (
                                <div className="bg-[#313133]/75 border border-[#636367] rounded-full px-6 py-4 text-[#e6e6e6] text-sm font-medium backdrop-blur-md shadow-lg flex items-center justify-center gap-3 animate-in">
                                    <span className="text-lg">✨</span> You&apos;re on the list! We will notify you when early access drops.
                                </div>
                            )}
                            <p className="mt-4 text-xs text-[#e6e6e6]/70 font-light tracking-wide uppercase">
                                {waitlistCount > 0 ? `Join ${waitlistCount} other pioneers. ` : ''}Limited access releasing soon
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-[#4a4a4d]/80 py-12 px-6 relative z-10 bg-[#181819]/90 backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => router.push("/")}>
                        <span className="font-['Instrument_Serif'] italic text-xl text-[#e6e6e6] group-hover:text-[#ffffff] transition-colors">Forge</span>
                        <ForgeLogo className="w-4 h-4" />
                    </div>
                    <p className="text-sm text-[#e6e6e6]/70 font-light"> {new Date().getFullYear()} Agentra Labs.</p>
                    <div className="flex items-center gap-8 text-sm text-[#e6e6e6]/80 font-light">
                        {/* <button
                            data-cta-id="footer-get-started"
                            onClick={() => navigateWithTracking("footer-get-started", "/sign-in")}
                            className="hover:text-white transition-colors"
                        >
                            Get started
                        </button>
                        <button
                            data-cta-id="footer-product"
                            onClick={() => navigateWithTracking("footer-product", "/dashboard")}
                            className="hover:text-white transition-colors"
                        >
                            Dashboard
                        </button> */}
                    </div>
                </div>
            </footer>
        </div>
    );
}
