"use client";

// ── Drobne, reużywalne elementy UI war roomu ──────────────────────────

export function riskColor(v: number): string {
  if (v >= 76) return "#f87171";
  if (v >= 51) return "#fb923c";
  if (v >= 26) return "#fbbf24";
  return "#4ade80";
}

export function ScoreBadge(p: { label: string; value: number; invert?: boolean }) {
  // invert: dla score'ów, gdzie WYŻEJ = LEPIEJ (np. clarity, ownBaseGain) —
  // wtedy kolor odwrócony względem typowego "wysoka liczba = ryzyko".
  const shown = p.invert ? 100 - p.value : p.value;
  const color = riskColor(shown);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color }}>{p.value}</span>
      </div>
      <div className="pdm-risk-track">
        <div className="pdm-risk-fill" style={{ width: `${p.value}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
      </div>
    </div>
  );
}

export function RiskPill(p: { value: number; label?: string }) {
  const color = riskColor(p.value);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 800,
      padding: "2px 8px", borderRadius: 20, color, background: color + "1a", border: `1px solid ${color}55`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      {p.label ?? `${p.value}/100`}
    </span>
  );
}

export function Kicker(p: { children: React.ReactNode }) {
  return <div className="pdm-kicker">{p.children}</div>;
}

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

export function EmptyNote(p: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: "#64748b", padding: "10px 0" }}>{p.children}</div>;
}
