"use client";

import { useState, type ReactNode } from "react";

// ── Prymitywy UI — Konsylium ────────────────────────────────────────────
// Własna, nieudostępniana między modułami kopia (tak jak reaction-lab i
// image-lab mają swoje osobne primitives.tsx) — zgodnie z ustaloną
// konwencją projektu, żeby moduły pozostały niezależne od siebie.

export function SectionHeading(p: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: "0.03em", color: "#e2e8f0", display: "flex", alignItems: "center", gap: 7 }}>
        {p.icon && <span>{p.icon}</span>}{p.title}
      </h2>
      {p.subtitle && <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "#64748b" }}>{p.subtitle}</p>}
    </div>
  );
}

export function EmptyNote(p: { children: ReactNode }) {
  return <div style={{ fontSize: 12, color: "#64748b", padding: "10px 0" }}>{p.children}</div>;
}

export function CopyButton(p: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  if (!p.text.trim()) return null;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(p.text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }}
      className="pdm-btn-square"
      style={{
        padding: "3px 9px", borderRadius: 7, fontSize: 10.5, fontWeight: 700, cursor: "pointer",
        background: copied ? "rgba(74,222,128,0.14)" : "rgba(56,189,248,0.1)",
        border: copied ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(56,189,248,0.25)",
        color: copied ? "#86efac" : "#7dd3fc", whiteSpace: "nowrap",
      }}
    >
      {copied ? "skopiowano ✓" : (p.label ?? "kopiuj")}
    </button>
  );
}

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "niski priorytet", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  medium: { label: "średni priorytet", color: "#7dd3fc", bg: "rgba(56,189,248,0.12)" },
  high: { label: "wysoki priorytet", color: "#fbbf24", bg: "rgba(251,191,36,0.14)" },
  urgent: { label: "PILNE", color: "#fca5a5", bg: "rgba(248,113,113,0.16)" },
};

export function PriorityBadge(p: { priority: string }) {
  const meta = PRIORITY_META[p.priority] ?? PRIORITY_META.medium;
  return (
    <span style={{ display: "inline-block", padding: "3px 11px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: meta.color, background: meta.bg, border: `1px solid ${meta.color}44` }}>
      {meta.label}
    </span>
  );
}

const CONFIDENCE_META: Record<string, { label: string; color: string }> = {
  low: { label: "niska pewność", color: "#fca5a5" },
  medium: { label: "średnia pewność", color: "#fbbf24" },
  high: { label: "wysoka pewność", color: "#86efac" },
};

export function ConfidenceBadge(p: { confidence: string }) {
  const meta = CONFIDENCE_META[p.confidence] ?? CONFIDENCE_META.medium;
  return <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{meta.label}</span>;
}

export function Panel(p: { children: ReactNode; padding?: string }) {
  return (
    <div className="pdm-panel" style={{ padding: p.padding ?? "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>{p.children}</div>
    </div>
  );
}

export function BulletList(p: { items: string[]; color?: string }) {
  if (p.items.length === 0) return null;
  return (
    <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 5 }}>
      {p.items.map((it, i) => (
        <li key={i} style={{ fontSize: 12.5, color: p.color ?? "#cbd5e1", lineHeight: 1.5 }}>{it}</li>
      ))}
    </ul>
  );
}
