"use client";

import { DEMO_EXAMPLES, type DemoExample } from "@/lib/reaction-simulator/mock-data";

export function DemoExamples(p: { onPick: (ex: DemoExample) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 10.5, color: "#64748b", marginRight: 2 }}>Przykłady:</span>
      {DEMO_EXAMPLES.map((ex) => (
        <button
          key={ex.id}
          type="button"
          onClick={() => p.onPick(ex)}
          className="pdm-pill"
          style={{ padding: "4px 11px", background: "rgba(15,23,42,0.5)", border: "1px solid rgba(148,163,184,0.18)", color: "#94a3b8", fontSize: 11, fontWeight: 600 }}
        >
          {ex.label}
        </button>
      ))}
    </div>
  );
}
