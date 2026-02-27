"use client";
// components/ui/index.tsx

import type { Role } from "@/lib/types";

export const ROLE_META: Record<Role, { color: string; bg: string; label: string }> = {
    researcher: { color: "var(--stone)", bg: "var(--stone-dim)", label: "Researcher" },
    builder: { color: "var(--teal)", bg: "var(--teal-dim)", label: "Builder" },
    investor: { color: "var(--sage)", bg: "var(--sage-dim)", label: "Investor" },
};

const STATUS_META = {
    open: { color: "var(--muted)", label: "Open" },
    building: { color: "var(--teal)", label: "Building" },
    shipped: { color: "var(--sage)", label: "Shipped" },
};

export function Avatar({ name, role, size = 32 }: { name: string; role: Role; size?: number }) {
    const r = ROLE_META[role] ?? ROLE_META.researcher;
    const ini = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    return (
        <div
            className="shrink-0 rounded-full flex items-center justify-center font-mono font-bold"
            style={{
                width: size, height: size,
                background: r.bg, color: r.color,
                border: `1px solid color-mix(in srgb, ${r.color} 20%, transparent)`,
                fontSize: size * 0.33,
            }}
        >
            {ini}
        </div>
    );
}

export function RoleBadge({ role }: { role: Role }) {
    const r = ROLE_META[role] ?? ROLE_META.researcher;
    return (
        <span
            className="rounded-sm px-1.5 text-[0.63rem] font-mono leading-relaxed"
            style={{
                background: r.bg, color: r.color,
                border: `1px solid color-mix(in srgb, ${r.color} 18%, transparent)`,
            }}
        >
            {r.label}
        </span>
    );
}

export function StatusDot({ status }: { status: string }) {
    const s = STATUS_META[status as keyof typeof STATUS_META] ?? STATUS_META.open;
    return (
        <span className="inline-flex items-center gap-[5px]">
            <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[0.67rem] font-mono" style={{ color: s.color }}>{s.label}</span>
        </span>
    );
}

export function Tag({ text, color = "var(--color-blue)" }: { text: string; color?: string }) {
    return (
        <span
            className="rounded-sm px-1.5 text-[0.63rem] font-mono"
            style={{
                background: `color-mix(in srgb, ${color} 8%, transparent)`, color,
                border: `1px solid color-mix(in srgb, ${color} 18%, transparent)`,
            }}
        >
            {text}
        </span>
    );
}

export function MetaChip({ label, value }: { label: string; value: string }) {
    return (
        <span className="inline-flex gap-[5px] items-baseline">
            <span className="text-muted text-[0.63rem] font-mono">{label}</span>
            <span className="text-text text-[0.69rem] font-mono">{value}</span>
        </span>
    );
}

export function TimeAgo({ ts }: { ts: string | number }) {
    const d = Date.now() - new Date(ts).getTime();
    const s = d < 60e3 ? "just now"
        : d < 3.6e6 ? `${Math.floor(d / 60e3)}m ago`
            : d < 86.4e6 ? `${Math.floor(d / 3.6e6)}h ago`
                : `${Math.floor(d / 86.4e6)}d ago`;
    return <span className="text-faint text-[0.63rem] font-mono">{s}</span>;
}

export function Spinner({ size = 18, color = "var(--color-accent)" }: { size?: number; color?: string }) {
    return (
        <div
            className="animate-spin shrink-0 rounded-full"
            style={{
                width: size, height: size,
                border: `1.5px solid color-mix(in srgb, ${color} 20%, transparent)`,
                borderTopColor: color,
            }}
        />
    );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-faint text-[0.6rem] font-mono tracking-widest uppercase mb-2">
            {children}
        </div>
    );
}

export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
    return (
        <div className="text-center py-9 px-5 text-muted">
            <div className="text-2xl mb-2.5 opacity-50">{icon}</div>
            <div className="text-text text-sm font-semibold mb-1">{title}</div>
            {sub && <div className="text-[0.8rem] leading-relaxed">{sub}</div>}
        </div>
    );
}